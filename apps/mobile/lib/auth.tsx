import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { deriveAuthState, type AuthState } from './auth-state';

// Runs the PKCE exchange when the OAuth callback URL arrives via a deep link.
// On a standalone build, `WebBrowser.openAuthSessionAsync` captures the
// `eventer://` callback synchronously and `signInWithGoogle` exchanges the
// code directly. On any path where the system delivers the callback as a
// deep link instead (warm app, cold start from URL), we recover the code
// here — the `code_verifier` is already in SecureStore from before the
// browser was opened, so the exchange still succeeds.
async function exchangeIfCallback(url: string | null): Promise<void> {
  if (!url) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  // OAuth error responses include `?error=...` (and optionally `?code=`);
  // skip the exchange so we don't burn the code and mask the real failure.
  if (parsed.searchParams.has('error')) return;
  const code = parsed.searchParams.get('code');
  if (!code) return;
  await supabase.auth.exchangeCodeForSession(code);
}

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  state: AuthState;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    // onAuthStateChange fires INITIAL_SESSION after loading the persisted session
    // from SecureStore. We treat that first event as "loaded", so a network failure
    // in getSession() can never strand the app on a spinner.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setLoaded(true);
    });

    // Cold-start: app was launched by an OAuth callback URL.
    Linking.getInitialURL().then((url) => {
      if (!active) return;
      void exchangeIfCallback(url);
    });
    // Warm: app receives an OAuth callback URL while already running.
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (!active) return;
      void exchangeIfCallback(url);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    const redirectTo = makeRedirectUri({ scheme: 'eventer', path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { error: error?.message ?? 'No auth URL returned' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { error: 'cancelled' };

    let url: URL;
    try {
      url = new URL(result.url);
    } catch {
      return { error: 'Malformed callback URL' };
    }
    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      return { error: url.searchParams.get('error_description') ?? oauthError };
    }
    const code = url.searchParams.get('code');
    if (!code) return { error: 'No auth code in callback' };

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      // PKCE code is single-use; a "code already used" error here means the
      // Linking listener already ran the exchange. Treat as success.
      if (/already.*used|invalid.*grant/i.test(exchangeError.message)) return {};
      return { error: exchangeError.message };
    }
    return {};
  };

  const signOut = async (): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signOut();
    return error ? { error: error.message } : {};
  };

  const state = deriveAuthState(loaded, session);

  return (
    <AuthContext.Provider value={{ state, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
