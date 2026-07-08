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

  test('wrong credentials show an inline error and stay on /login', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('admin@kinvee.in');
    await page.getByTestId('login-password').fill('definitely-wrong');
    await page.getByTestId('login-submit').click();

    // The mock backend rejects the credentials (401); the form must surface a
    // human-readable inline error rather than silently reloading.
    const error = page.getByTestId('login-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).toContainText('Invalid email or password.');

    // Still on the login page — no redirect, no session established.
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('password show/hide toggle reveals and re-masks the field', async ({
    page,
  }) => {
    await page.goto('/login');
    const password = page.getByTestId('login-password');
    const toggle = page.getByTestId('login-password-toggle');

    await password.fill('super-secret');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAttribute('aria-label', 'Show password');

    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-label', 'Hide password');
    await expect(password).toHaveValue('super-secret');

    await toggle.click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('login tab title is consistent with the "local-ai admin" brand', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('Sign in · local-ai admin');
    await expect(page.getByTestId('login-brand')).toContainText('local-ai admin');
  });
});
