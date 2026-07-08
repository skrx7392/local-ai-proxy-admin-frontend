// Shared session-expiry UX constants + helpers (UX P2 2026-07-08).
//
// Expiry can surface at three layers, and all of them must land the user on
// the same explanatory login screen instead of a silent failure:
//   1. TopBar countdown reaching zero (client clock)      → signOut redirect
//   2. apiFetch observing a backend 401                    → signOut redirect
//   3. middleware seeing a session cookie that no longer
//      validates (jwt callback returned null / bad cookie) → redirect
//
// This module is import-safe from all three (no next-auth, no React, no DOM).

/** Show the "session expiring soon" warning when this little time remains. */
export const SESSION_EXPIRY_WARNING_SECONDS = 5 * 60;

/**
 * Login URL that tells the login page the user was signed out because their
 * session expired (`expired=1`), preserving where they were so a re-login
 * returns them there.
 */
export function sessionExpiredLoginUrl(currentPath?: string): string {
  const suffix =
    currentPath && !currentPath.startsWith('/login')
      ? `&callbackUrl=${encodeURIComponent(currentPath)}`
      : '';
  return `/login?expired=1${suffix}`;
}

/**
 * True when a cookie name is (or is a chunk of) the next-auth session cookie.
 * Matches both the dev (`authjs.session-token`) and prod
 * (`__Secure-authjs.session-token`) names, plus next-auth's `.0`/`.1` chunk
 * suffixes for oversized JWTs. Used by the middleware to distinguish "had a
 * session that no longer validates" (expired) from "never logged in".
 */
export function isSessionCookieName(name: string): boolean {
  const bases = ['authjs.session-token', '__Secure-authjs.session-token'];
  return bases.some((base) => name === base || name.startsWith(`${base}.`));
}
