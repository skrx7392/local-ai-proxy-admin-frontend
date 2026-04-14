import { expect, test } from '@playwright/test';

test.describe('auth middleware', () => {
  test('unauthenticated request to /(admin) root redirects to /login with callbackUrl', async ({
    page,
  }) => {
    const response = await page.goto('/');
    // NextAuth middleware issues a 307 redirect; Playwright follows it
    // automatically, so assert by final URL.
    expect(page.url()).toContain('/login');
    expect(new URL(page.url()).searchParams.get('callbackUrl')).toBe('/');
    expect(response?.ok()).toBeTruthy();
  });

  test('unauthenticated request to /styleguide redirects to /login', async ({ page }) => {
    await page.goto('/styleguide');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/styleguide');
  });

  test('/api/health is reachable without auth (k8s probe path)', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-card')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('login form shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});
