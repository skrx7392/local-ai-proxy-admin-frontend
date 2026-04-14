import { test, expect } from '@playwright/test';

test('root redirects unauthenticated users to the login page', async ({ page }) => {
  await page.goto('/');
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.getByTestId('login-card')).toBeVisible();
});
