import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. See apps/mobile/.env.example.',
  );
}

// iOS Keychain caps each item at ~2048 bytes. Supabase session JSON (access
// token + refresh token + user) routinely exceeds that, so a naive adapter
// silently fails to persist and the user re-logs in on every cold start.
// Chunk the value across `${key}__N` items with a `${key}__meta` count.
//
// Chunk size is measured in JS string code units. Each unit can encode to up
// to 4 UTF-8 bytes (astral chars / emoji); 400 keeps every chunk under
// ~1600 bytes, safely below the 2048 cap regardless of user-metadata content.
const CHUNK_UNITS = 400;
const META_SUFFIX = '__meta';
const CHUNK_PREFIX = '__';
const PENDING_MARKER = 'pending';

async function deleteChunks(key: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(`${key}${CHUNK_PREFIX}${i}`);
  }
}

export const LargeSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const meta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
    if (meta === null) {
      // Legacy unchunked write — used when an earlier value fit in one item.
      return SecureStore.getItemAsync(key);
    }
    // A write was interrupted between marking it pending and committing the
    // final count. Returning null is safer than reading torn data.
    if (meta === PENDING_MARKER) return null;
    const count = Number.parseInt(meta, 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}${CHUNK_PREFIX}${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Crash-safe write order:
    //   1. Read prior count so we can clean up old chunks.
    //   2. Mark meta as `pending` — a crash here leaves the next getItem
    //      returning null instead of stitching together torn data.
    //   3. Delete legacy bare key + old chunks.
    //   4. Write new chunks.
    //   5. Commit by replacing `pending` with the real chunk count.
    const oldMeta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
    const oldCount =
      oldMeta && oldMeta !== PENDING_MARKER ? Number.parseInt(oldMeta, 10) : 0;

    await SecureStore.setItemAsync(`${key}${META_SUFFIX}`, PENDING_MARKER);
    await SecureStore.deleteItemAsync(key);
    if (Number.isFinite(oldCount) && oldCount > 0) {
      await deleteChunks(key, oldCount);
    }

    const count = Math.max(1, Math.ceil(value.length / CHUNK_UNITS));
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(
        `${key}${CHUNK_PREFIX}${i}`,
        value.slice(i * CHUNK_UNITS, (i + 1) * CHUNK_UNITS),
      );
    }
    await SecureStore.setItemAsync(`${key}${META_SUFFIX}`, String(count));
  },
  removeItem: async (key: string): Promise<void> => {
    const meta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
    if (meta && meta !== PENDING_MARKER) {
      const count = Number.parseInt(meta, 10);
      if (Number.isFinite(count)) await deleteChunks(key, count);
    }
    await SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`);
    // Also clear any legacy bare-key value from before the adapter chunked.
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // expo-secure-store is not available on web; Expo Web is not a Phase 1 target.
    // Falling back to `undefined` here lets supabase-js use localStorage when run on web.
    // If Expo Web becomes a target, replace with a Web Crypto-backed adapter.
    storage: Platform.OS === 'web' ? undefined : LargeSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
