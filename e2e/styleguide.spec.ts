import { expect, test } from '@playwright/test';

/**
 * PR B auth-gated /styleguide. The A3 visual regression (`styleguide.dark.png`,
 * `styleguide.light.png`) and the `noindex` header assertion required
 * unauthenticated access. Both are parked until a mock-backend + auth
 * fixture lands (planned alongside PR C per PLAN §Testing Layers); the
 * baselines under `styleguide.spec.ts-snapshots/` are kept on disk so
 * re-enabling the tests doesn't regenerate every pixel.
 */

test.describe('styleguide · auth gating', () => {
  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/styleguide');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/styleguide');
  });
});

test.describe('styleguide · visual regression (parked, needs auth fixture)', () => {
  test.skip('dark mode full-page screenshot');
  test.skip('light mode full-page screenshot');
});
