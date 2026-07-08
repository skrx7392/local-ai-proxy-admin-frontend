import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

// Notion 3974e303: /users rows hover-highlighted (implying clickability) but
// only the email text was a link. Whole rows now navigate to the detail page.
test.describe('/users — row navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/users');
    await page.getByTestId('user-email-2').waitFor({ state: 'visible' });
  });

  test('clicking a non-link cell in a user row opens the detail page', async ({
    page,
  }) => {
    // The role badge is plain text — exactly the dead area from the bug
    // report. Clicking it must navigate like the email link does.
    await page.getByTestId('user-role-2').click();
    await page.waitForURL('**/users/2');
    await expect(page.getByTestId('user-detail-id')).toHaveText('2');
  });

  test('rows are keyboard-accessible: focus + Enter navigates', async ({
    page,
  }) => {
    const row = page.locator('[data-testid="data-table-row"][data-href="/users/2"]');
    await expect(row).toHaveAttribute('tabindex', '0');
    await row.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/users/2');
    await expect(page.getByTestId('user-detail-id')).toHaveText('2');
  });

  test('the row Deactivate action opens its dialog without navigating', async ({
    page,
  }) => {
    await page.getByTestId('user-deactivate-2').click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/users');

    // Dismiss; still on the list.
    await page.getByTestId('confirm-dialog-cancel').click();
    await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    expect(new URL(page.url()).pathname).toBe('/users');
  });

  test('non-clickable tables get no row hover/click affordance', async ({
    page,
  }) => {
    // Nodes have no detail page — rows must not look or act clickable.
    await page.goto('/nodes');
    const row = page.getByTestId('data-table-row').first();
    await row.waitFor({ state: 'visible' });
    await expect(row).not.toHaveAttribute('data-interactive');
    await expect(row).toHaveCSS('cursor', 'auto');
  });
});
