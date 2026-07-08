import { expect, test, type Locator, type Page } from '@playwright/test';

// Regression suite for the chart first-paint race: recharts 3 draws series
// through JS-driven enter animations that latch onto the geometry present at
// mount, so a chart mounting mid-navigation used to paint axes-only (line) or
// bars flat at y=0 until an unrelated re-render restarted the animation.
// ChartFrame gates the mount on a settled non-zero container measurement;
// these tests assert the drawn SVG geometry — not just element presence —
// with NO user interaction after the navigation itself.

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

/**
 * The portion of the line path that is actually drawn, in px. Recharts'
 * enter animation reveals the path via stroke-dasharray, so a path element
 * can exist with a full `d` while showing nothing — the exact broken state
 * this suite guards against.
 */
function visibleLineLength(line: Locator): Promise<number> {
  return line.evaluate((el) => {
    const path = el as SVGPathElement;
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return 0;
    const dash = getComputedStyle(path).strokeDasharray;
    if (!dash || dash === 'none') return total;
    const first = parseFloat(dash);
    if (!Number.isFinite(first)) return total;
    return Math.min(first, total);
  });
}

/** Vertical spread of the line's y-coordinates, in px (0 = flat line). */
function lineYSpread(line: Locator): Promise<number> {
  return line.evaluate((el) => {
    const d = el.getAttribute('d') ?? '';
    const ys = (d.match(/,\s*(-?\d+(?:\.\d+)?)/g) ?? []).map((m) =>
      parseFloat(m.replace(/^,\s*/, '')),
    );
    if (ys.length < 2) return 0;
    return Math.max(...ys) - Math.min(...ys);
  });
}

async function expectLineDrawn(page: Page, scope: Locator) {
  const line = scope.locator('path.recharts-line-curve').first();
  await expect(line).toBeAttached();
  // The enter animation runs ~1.5s; poll until the full path is revealed.
  await expect
    .poll(() => visibleLineLength(line), { timeout: 10_000 })
    .toBeGreaterThan(100);
  // Mock data varies per bucket, so a correctly-joined line is never flat.
  expect(await lineYSpread(line)).toBeGreaterThan(10);
}

test.describe('chart first paint after client-side navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard chart draws with data on first paint after navigating away and back', async ({
    page,
  }) => {
    const dashboardChart = page.getByTestId('timeseries-chart');
    await expectLineDrawn(page, dashboardChart);

    // Two full client-side round-trips — the bug reproduced on ANY
    // client-side re-entry, so one pass is not enough signal.
    for (const target of ['users', 'keys'] as const) {
      await page.getByTestId(`sidenav-link-${target}`).click();
      await page.waitForURL((url) => url.pathname === `/${target}`);
      await expect(page.getByTestId('timeseries-chart')).toHaveCount(0);

      await page.getByTestId('sidenav-link-dashboard').click();
      await page.waitForURL((url) => url.pathname === '/');

      // No clicks, focus changes, or hovers past this point: the chart must
      // draw on its own.
      await expectLineDrawn(page, page.getByTestId('timeseries-chart'));
    }
  });

  test('usage → by-model draws non-zero bars on direct tab entry', async ({
    page,
  }) => {
    // Client-side into /usage, then activate the lazy-mounted tab.
    await page.getByTestId('sidenav-link-usage').click();
    await page.waitForURL((url) => url.pathname === '/usage');
    await page.getByTestId('usage-tab-by-model').click();

    const chart = page.getByTestId('model-breakdown-chart');
    const bars = chart.locator('.recharts-bar-rectangle path');
    await expect(bars).toHaveCount(2); // two models in the mock fixture

    // Bars animate up from the baseline; poll until every bar has real
    // height. A flat-at-y=0 first paint keeps heights at ~0.
    await expect
      .poll(
        () =>
          bars.evaluateAll((els) =>
            Math.min(
              ...els.map((el) => (el as SVGGraphicsElement).getBBox().height),
            ),
          ),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(5);
  });
});
