import { expect, test } from '@playwright/test';

/**
 * Styleguide coverage: noindex sanity + full-page visual regression in
 * both color modes.
 *
 * The `?motion=off` query parameter on the styleguide page pins every
 * animation to its final frame via a `data-motion="off"` attribute on
 * <html> (see `src/theme/globalCss.ts`). This avoids flaky shimmer /
 * count-up captures without relying on the Playwright media emulation
 * flag (which only stops CSS transitions keyed off
 * `prefers-reduced-motion: reduce`).
 *
 * Baselines live under `e2e/__screenshots__/styleguide.spec.ts/` by default.
 * Threshold `maxDiffPixelRatio: 0.01` absorbs sub-pixel text-rendering noise
 * across runner machines.
 */

const VISUAL = {
  fullPage: true,
  maxDiffPixelRatio: 0.01,
  animations: 'disabled',
  caret: 'hide',
} as const;

test.describe('styleguide · visual regression', () => {
  test('dark mode full-page screenshot', async ({ page }) => {
    await page.goto('/styleguide?motion=off');

    // Wait for fonts + initial layout to settle. next/font preloads with
    // `display: swap` — give it a beat to flip in.
    await page.evaluate(async () => {
      if ('fonts' in document) await document.fonts.ready;
    });
    await page.waitForSelector('[data-section-id="copy"]');

    // Pin to dark; the styleguide ships with dark as default but users may
    // have flipped it in a previous session and the next-themes cookie
    // persists. Force via the visible toggle when needed.
    const mode = await page.evaluate(() =>
      document.documentElement.classList.contains('light') ? 'light' : 'dark',
    );
    if (mode === 'light') {
      await page.getByTestId('theme-toggle').click();
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.classList.contains('dark')),
        )
        .toBe(true);
    }

    await expect(page).toHaveScreenshot('styleguide.dark.png', VISUAL);
  });

  test('light mode full-page screenshot', async ({ page }) => {
    await page.goto('/styleguide?motion=off');
    await page.evaluate(async () => {
      if ('fonts' in document) await document.fonts.ready;
    });
    await page.waitForSelector('[data-section-id="copy"]');

    const mode = await page.evaluate(() =>
      document.documentElement.classList.contains('light') ? 'light' : 'dark',
    );
    if (mode === 'dark') {
      await page.getByTestId('theme-toggle').click();
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.classList.contains('light')),
        )
        .toBe(true);
    }

    await expect(page).toHaveScreenshot('styleguide.light.png', VISUAL);
  });
});

test.describe('styleguide · noindex', () => {
  test('response includes X-Robots-Tag noindex', async ({ request }) => {
    const response = await request.get('/styleguide');
    expect(response.ok()).toBeTruthy();

    const robots = response.headers()['x-robots-tag'] ?? '';
    expect(robots.toLowerCase()).toContain('noindex');
    expect(robots.toLowerCase()).toContain('nofollow');

    const html = await response.text();
    // Metadata-emitted robots meta tag.
    expect(html).toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
  });
});
