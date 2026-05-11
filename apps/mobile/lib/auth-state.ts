import type { Session } from '@supabase/supabase-js';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session };

export function deriveAuthState(loaded: boolean, session: Session | null): AuthState {
  if (!loaded) return { status: 'loading' };
  if (session) return { status: 'signedIn', session };
  return { status: 'signedOut' };
}

export function shouldRedirectToLogin(state: AuthState): boolean {
  return state.status === 'signedOut';
}

export function shouldRedirectToHome(state: AuthState): boolean {
  return state.status === 'signedIn';
}
