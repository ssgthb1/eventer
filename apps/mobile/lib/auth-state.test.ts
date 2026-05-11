import { describe, it, expect } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  deriveAuthState,
  shouldRedirectToHome,
  shouldRedirectToLogin,
} from './auth-state';

const fakeSession = { user: { id: 'u1' }, access_token: 't' } as unknown as Session;

describe('deriveAuthState', () => {
  it('is loading until session has loaded', () => {
    expect(deriveAuthState(false, null)).toEqual({ status: 'loading' });
    expect(deriveAuthState(false, fakeSession)).toEqual({ status: 'loading' });
  });

  it('is signedOut when loaded with no session', () => {
    expect(deriveAuthState(true, null)).toEqual({ status: 'signedOut' });
  });

  it('is signedIn when loaded with a session', () => {
    expect(deriveAuthState(true, fakeSession)).toEqual({
      status: 'signedIn',
      session: fakeSession,
    });
  });
});

describe('redirect helpers', () => {
  it('redirects to login only when signedOut', () => {
    expect(shouldRedirectToLogin({ status: 'loading' })).toBe(false);
    expect(shouldRedirectToLogin({ status: 'signedOut' })).toBe(true);
    expect(
      shouldRedirectToLogin({ status: 'signedIn', session: fakeSession }),
    ).toBe(false);
  });

  it('redirects to home only when signedIn', () => {
    expect(shouldRedirectToHome({ status: 'loading' })).toBe(false);
    expect(shouldRedirectToHome({ status: 'signedOut' })).toBe(false);
    expect(
      shouldRedirectToHome({ status: 'signedIn', session: fakeSession }),
    ).toBe(true);
  });
});
