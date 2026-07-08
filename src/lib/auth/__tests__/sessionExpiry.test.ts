import { describe, expect, it } from 'vitest';

import {
  isSessionCookieName,
  SESSION_EXPIRY_WARNING_SECONDS,
  sessionExpiredLoginUrl,
} from '../sessionExpiry';

describe('sessionExpiredLoginUrl', () => {
  it('flags expiry and preserves the current location', () => {
    expect(sessionExpiredLoginUrl('/users/3?tab=roles')).toBe(
      '/login?expired=1&callbackUrl=%2Fusers%2F3%3Ftab%3Droles',
    );
  });

  it('omits the callback when already on the login page or when absent', () => {
    expect(sessionExpiredLoginUrl('/login?callbackUrl=%2F')).toBe('/login?expired=1');
    expect(sessionExpiredLoginUrl()).toBe('/login?expired=1');
  });
});

describe('isSessionCookieName', () => {
  it('matches dev, prod, and chunked next-auth session cookie names', () => {
    expect(isSessionCookieName('authjs.session-token')).toBe(true);
    expect(isSessionCookieName('__Secure-authjs.session-token')).toBe(true);
    expect(isSessionCookieName('authjs.session-token.0')).toBe(true);
    expect(isSessionCookieName('__Secure-authjs.session-token.1')).toBe(true);
  });

  it('ignores unrelated cookies', () => {
    expect(isSessionCookieName('authjs.csrf-token')).toBe(false);
    expect(isSessionCookieName('theme')).toBe(false);
    expect(isSessionCookieName('authjs.session-token-other')).toBe(false);
  });
});

describe('SESSION_EXPIRY_WARNING_SECONDS', () => {
  it('is five minutes', () => {
    expect(SESSION_EXPIRY_WARNING_SECONDS).toBe(300);
  });
});
