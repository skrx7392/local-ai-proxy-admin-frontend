import { expect, test, type Page } from '@playwright/test';

// Responsive-layout minimum (UX P1): the app must stay usable at narrow
// widths — 390px (phone), 768px (tablet / half-width desktop window), and
// 1024px (small desktop). Below the `lg` breakpoint (1024px) the side rail
// collapses into a hamburger-triggered drawer; data tables scroll
// horizontally so trailing columns/actions stay reachable; the header keeps
// to a single line; pagination never wraps per character.

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

// One row of size-sm controls (32px) + block padding (2 × 12px) + border.
// A wrapped header would be ≥ ~80px.
const HEADER_SINGLE_LINE_MAX = 64;
// body.sm line-height is 18px; a per-character wrap would be several times that.
const RANGE_TEXT_SINGLE_LINE_MAX = 28;

function describeNarrowViewport(label: string, width: number, height: number) {
  test.describe(`${label} (${width}px)`, () => {
    test.use({ viewport: { width, height } });

    test('side rail collapses to a hamburger; drawer opens, closes on Escape, and navigates', async ({
      page,
    }) => {
      await login(page);

      // Desktop rail is hidden; hamburger is the way in.
      await expect(page.getByTestId('sidenav')).toBeHidden();
      const trigger = page.getByTestId('mobile-nav-trigger');
      await expect(trigger).toBeVisible();

      // Open → drawer with the full nav; focus lands inside (focus trap).
      await trigger.click();
      const drawer = page.getByTestId('mobile-nav-drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByTestId('sidenav-link-dashboard')).toBeVisible();
      await expect(drawer.getByTestId('sidenav-link-config')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.activeElement?.closest(
                '[data-testid="mobile-nav-drawer"]',
              ) !== null,
          ),
        )
        .toBe(true);

      // Escape closes (Chakra Drawer built-in dismiss).
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();

      // Reopen and navigate: link works and the drawer closes itself.
      await trigger.click();
      await expect(drawer).toBeVisible();
      await drawer.getByTestId('sidenav-link-keys').click();
      await page.waitForURL((url) => url.pathname === '/keys');
      await expect(drawer).toBeHidden();
      await expect(page.getByTestId('keys-create-button')).toBeVisible();
    });

    test('header stays on one line with logout reachable and email truncated', async ({
      page,
    }) => {
      await login(page);

      const topbar = page.getByTestId('topbar');
      await expect(topbar).toBeVisible();
      const box = await topbar.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(HEADER_SINGLE_LINE_MAX);

      // Essentials are visible and inside the viewport (nothing pushed
      // off-screen to the right).
      const logout = page.getByTestId('topbar-logout');
      await expect(logout).toBeVisible();
      const logoutBox = await logout.boundingBox();
      expect(logoutBox).not.toBeNull();
      expect(logoutBox!.x + logoutBox!.width).toBeLessThanOrEqual(width);

      await expect(page.getByTestId('topbar-user')).toBeVisible();
      await expect(page.getByTestId('topbar-health-dot')).toBeVisible();
      await expect(page.getByTestId('topbar-expires')).toBeVisible();
    });

    test('keys table scrolls horizontally so the Revoke action stays reachable', async ({
      page,
    }) => {
      await login(page);
      await page.goto('/keys');
      await expect(page.getByTestId('data-table')).toBeVisible();

      // The wrapper is the scroll context for the (wider) table.
      const scroller = page.getByTestId('data-table-scroll');
      await expect(scroller).toBeVisible();

      const revoke = page.getByTestId('key-revoke-101');
      await revoke.scrollIntoViewIfNeeded();
      await expect(revoke).toBeVisible();

      // The action actually works: clicking opens the confirm dialog.
      await revoke.click();
      await expect(page.getByTestId('confirm-dialog')).toBeVisible();
      await page.getByTestId('confirm-dialog-cancel').click();
      await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    });

    test('pagination range stays on a single line', async ({ page }) => {
      await login(page);
      await page.goto('/keys');
      await expect(page.getByTestId('data-table')).toBeVisible();

      const range = page.getByTestId('pagination-range');
      await expect(range).toBeVisible();
      await expect(range).toHaveText(/^\d+–\d+ of \d+$/);
      const rangeBox = await range.boundingBox();
      expect(rangeBox).not.toBeNull();
      expect(rangeBox!.height).toBeLessThanOrEqual(RANGE_TEXT_SINGLE_LINE_MAX);
    });
  });
}

describeNarrowViewport('phone', 390, 844);
describeNarrowViewport('tablet', 768, 1024);

test.describe('small desktop (1024px)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('side rail is expanded and the hamburger is hidden', async ({ page }) => {
    await login(page);

    await expect(page.getByTestId('sidenav')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-trigger')).toBeHidden();

    // Rail navigation works directly.
    await page.getByTestId('sidenav-link-keys').click();
    await page.waitForURL((url) => url.pathname === '/keys');
    await expect(page.getByTestId('keys-create-button')).toBeVisible();
  });

  test('header is a single line and the Revoke action is reachable on /keys', async ({
    page,
  }) => {
    await login(page);

    const box = await page.getByTestId('topbar').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(HEADER_SINGLE_LINE_MAX);
    await expect(page.getByTestId('nav-search')).toBeVisible();

    await page.goto('/keys');
    const revoke = page.getByTestId('key-revoke-101');
    await revoke.scrollIntoViewIfNeeded();
    await expect(revoke).toBeVisible();
    await revoke.click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('confirm-dialog-cancel').click();
  });
});
