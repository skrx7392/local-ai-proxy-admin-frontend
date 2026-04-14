import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('local-ai admin')).toBeVisible();
  await expect(page.getByTestId('styleguide-link')).toHaveAttribute('href', '/styleguide');
});
