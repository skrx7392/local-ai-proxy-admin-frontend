import { expect, test } from '@playwright/test';

// Expired-session redirect at the middleware layer (UX P2 2026-07-08).
//
// A session cookie that no longer validates — here simulated with an
// undecryptable value, which is exactly what an expired/rotated JWT looks
// like to the middleware — must land on /login with an explanatory
// "session expired" message, not a bare login form or a silent API failure.
//
// The standalone production server uses the __Secure- prefixed cookie name;
// the dev-mode name is added too so the spec also passes against `next dev`.
const SESSION_COOKIE_NAMES = [
  '__Secure-authjs.session-token',
  'authjs.session-token',
];

test('a stale session cookie redirects to /login with a session-expired explanation', async ({
  page,
  context,
}) => {
  await context.addCookies(
    SESSION_COOKIE_NAMES.map((name) => ({
      name,
      value: 'no-longer-valid',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: name.startsWith('__Secure-'),
      sameSite: 'Strict' as const,
    })),
  );

  await page.goto('/keys');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/login');
  expect(url.searchParams.get('expired')).toBe('1');
  expect(url.searchParams.get('callbackUrl')).toBe('/keys');

  const banner = page.getByTestId('login-expired');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Your session has expired');
});
