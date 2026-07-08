import { expect, test, type Page } from '@playwright/test';

// UX P2 (2026-07-08): unknown routes used to render the default unstyled
// Next.js 404 — white page, no branding, no way back.

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('custom 404 page', () => {
  test('unknown route renders the branded 404 with a working way back', async ({
    page,
  }) => {
    await login(page);

    const response = await page.goto('/nonexistent-page');
    expect(response?.status()).toBe(404);

    const card = page.getByTestId('not-found');
    await expect(card).toBeVisible();
    await expect(card).toContainText('local-ai admin');
    await expect(card).toContainText('Page not found');

    // The 404 boundary carries no admin chrome (root-level, outside the
    // (admin) route group).
    await expect(page.getByTestId('topbar')).toHaveCount(0);
    await expect(page.getByTestId('sidenav')).toHaveCount(0);

    // The way back works and lands on the dashboard shell.
    await page.getByTestId('not-found-home').click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.getByTestId('topbar')).toBeVisible();
  });

  test('unauthenticated visitor to an unknown route is redirected to login (no chrome leak)', async ({
    page,
  }) => {
    await page.goto('/nonexistent-page');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/nonexistent-page');
    // Never logged in — must NOT claim the session expired.
    expect(url.searchParams.get('expired')).toBeNull();
    await expect(page.getByTestId('login-card')).toBeVisible();
  });
});
