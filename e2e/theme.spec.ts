import { expect, test } from '@playwright/test';

/**
 * Theme wiring now runs against the unauthenticated `/login` page — the only
 * chrome-free admin surface that doesn't require a session. Full styleguide
 * theme coverage returns with the post-PR-B auth fixture.
 */

test.describe('theme system', () => {
  test('body has the dark canvas gradient by default on /login', async ({ page }) => {
    await page.goto('/login');
    const bg = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundImage,
    );
    expect(bg).toMatch(/linear-gradient/);
    // #0f2027 → dark gradient anchor, normalized by Chromium to rgb().
    expect(bg.toLowerCase()).toContain('rgb(15, 32, 39)');
  });
});
