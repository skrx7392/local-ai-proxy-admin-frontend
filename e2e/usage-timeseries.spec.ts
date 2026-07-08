import { expect, test, type Locator, type Page } from '@playwright/test';

// Regression suite for the Usage → Timeseries tab rendering empty despite
// data: axes + legend drawn, y-domain computed from real data, but both
// series invisible (recharts' frozen enter animation left complete paths at
// `stroke-dasharray: 0px, <total>px`). The tab must draw the same shape as
// the Dashboard chart, which consumes the same mock fixture for the same
// default 24h window.

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

/** Visible (dasharray-adjusted) length of a line path, in px. */
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

function segmentCount(line: Locator): Promise<number> {
  return line.evaluate(
    (el) => (el.getAttribute('d')?.match(/[LC]/g) ?? []).length,
  );
}

test.describe('usage timeseries tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('draws Requests + Errors with the same shape as the dashboard chart', async ({
    page,
  }) => {
    // Reference: the dashboard chart for the same default 24h window.
    const dashboardLine = page
      .getByTestId('timeseries-chart')
      .locator('path.recharts-line-curve')
      .first();
    await expect(dashboardLine).toBeAttached();
    const dashboardSegments = await segmentCount(dashboardLine);
    expect(dashboardSegments).toBeGreaterThan(10);

    // Client-side into the tab (lazy-mounted).
    await page.getByTestId('sidenav-link-usage').click();
    await page.waitForURL((url) => url.pathname === '/usage');
    await page.getByTestId('usage-tab-timeseries').click();

    const chart = page.getByTestId('timeseries-chart');
    const lines = chart.locator('path.recharts-line-curve');
    // Both series render: Requests + Errors.
    await expect(lines).toHaveCount(2);

    for (const line of [lines.nth(0), lines.nth(1)]) {
      // Drawn, not merely present (the frozen-dasharray state reported 0).
      await expect
        .poll(() => visibleLineLength(line), { timeout: 10_000 })
        .toBeGreaterThan(100);
      // Same bucket resolution as the dashboard's requests-per-hour line.
      expect(await segmentCount(line)).toBe(dashboardSegments);
    }

    // Axis ticks are formatted labels, never raw ISO bucket keys. Recharts
    // renders tick text in a second pass (after measuring labels), so poll;
    // read textContent via evaluateAll because innerText is not defined for
    // SVG <text> elements.
    const readSvgTexts = () =>
      chart
        .locator('svg.recharts-surface text')
        .evaluateAll((els) =>
          els.map((el) => el.textContent ?? '').filter(Boolean),
        );
    await expect
      .poll(
        async () =>
          (await readSvgTexts()).filter((t) => /\d{1,2}:\d{2}/.test(t)).length,
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);
    const svgTexts = await readSvgTexts();
    expect(svgTexts.some((t) => /\d{4}-\d{2}-\d{2}T/.test(t))).toBe(false);
  });

  test('renders on direct URL entry to /usage?tab=timeseries', async ({
    page,
  }) => {
    await page.goto('/usage?tab=timeseries');

    const chart = page.getByTestId('timeseries-chart');
    const lines = chart.locator('path.recharts-line-curve');
    await expect(lines).toHaveCount(2);
    await expect
      .poll(() => visibleLineLength(lines.first()), { timeout: 10_000 })
      .toBeGreaterThan(100);
  });
});
