import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// expo-secure-store has native deps; mock it before importing the adapter.
const store = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  store.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LargeSecureStoreAdapter', () => {
  it('round-trips a value larger than the chunk size', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    const big = 'a'.repeat(1500); // > CHUNK_UNITS (400)
    await LargeSecureStoreAdapter.setItem('sb-auth-token', big);
    expect(store.get('sb-auth-token__meta')).toBe('4');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe(big);
  });

  it('round-trips a small value as a single chunk', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    await LargeSecureStoreAdapter.setItem('sb-auth-token', 'tiny');
    expect(store.get('sb-auth-token__meta')).toBe('1');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe('tiny');
  });

  it('round-trips multibyte UTF-8 characters without corruption', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    const value = '👋'.repeat(500) + 'Ωmega'.repeat(200);
    await LargeSecureStoreAdapter.setItem('sb-auth-token', value);
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe(value);
  });

  it('falls back to a legacy unchunked value when no meta exists', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token', 'legacy-value'); // simulate prior naive adapter
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe('legacy-value');
  });

  it('returns null when meta exists but a chunk is missing', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token__meta', '3');
    store.set('sb-auth-token__0', 'a');
    // chunk 1 and 2 missing
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBeNull();
  });

  it('overwrites a longer value with a shorter one without leaving stale chunks', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    await LargeSecureStoreAdapter.setItem('sb-auth-token', 'a'.repeat(1500));
    await LargeSecureStoreAdapter.setItem('sb-auth-token', 'short');
    expect(store.get('sb-auth-token__meta')).toBe('1');
    expect(store.has('sb-auth-token__1')).toBe(false);
    expect(store.has('sb-auth-token__2')).toBe(false);
    expect(store.has('sb-auth-token__3')).toBe(false);
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe('short');
  });

  it('removeItem clears all chunks and meta', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    await LargeSecureStoreAdapter.setItem('sb-auth-token', 'x'.repeat(1500));
    await LargeSecureStoreAdapter.removeItem('sb-auth-token');
    expect(store.size).toBe(0);
  });

  it('getItem returns null for an empty store', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBeNull();
  });

  it('getItem returns null when meta is the in-progress sentinel', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    // Simulate a setItem that was killed after writing 'pending' but before commit.
    store.set('sb-auth-token__meta', 'pending');
    store.set('sb-auth-token__0', 'partial');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBeNull();
  });

  it('getItem returns null for non-positive meta counts', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token__meta', '0');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBeNull();
    store.set('sb-auth-token__meta', '-1');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBeNull();
  });

  it('round-trips an empty string', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    await LargeSecureStoreAdapter.setItem('sb-auth-token', '');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe('');
  });

  it('overwrites a legacy unchunked value with a chunked write', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token', 'legacy'); // simulate prior naive adapter
    const big = 'b'.repeat(900);
    await LargeSecureStoreAdapter.setItem('sb-auth-token', big);
    expect(store.has('sb-auth-token')).toBe(false); // bare key cleared
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe(big);
  });

  it('removeItem clears a legacy unchunked value', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token', 'legacy-value');
    await LargeSecureStoreAdapter.removeItem('sb-auth-token');
    expect(store.size).toBe(0);
  });

  it('a second setItem recovers cleanly from a prior pending state', async () => {
    const { LargeSecureStoreAdapter } = await import('./supabase');
    store.set('sb-auth-token__meta', 'pending');
    store.set('sb-auth-token__0', 'stale-partial');
    await LargeSecureStoreAdapter.setItem('sb-auth-token', 'fresh-value');
    expect(await LargeSecureStoreAdapter.getItem('sb-auth-token')).toBe('fresh-value');
  });
});
