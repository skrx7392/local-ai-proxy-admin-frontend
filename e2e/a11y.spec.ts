import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

type Route = {
  path: string;
  /** Wait for this testid (or selector) before Axe runs. */
  readiness: string;
};

const AUTHED_ROUTES: Route[] = [
  { path: '/', readiness: '[data-testid="topbar"]' },
  { path: '/users', readiness: 'table, [data-testid="empty-state"]' },
  { path: '/keys', readiness: 'table, [data-testid="empty-state"]' },
  { path: '/accounts', readiness: 'table, [data-testid="empty-state"]' },
  { path: '/pricing', readiness: 'table, [data-testid="empty-state"]' },
  { path: '/registrations', readiness: 'table, [data-testid="empty-state"]' },
  {
    path: '/registration-tokens',
    readiness: 'table, [data-testid="empty-state"]',
  },
  { path: '/usage', readiness: '[data-testid="topbar"]' },
  { path: '/config', readiness: '[data-testid="config-page"]' },
  { path: '/styleguide', readiness: '[data-testid="focused-button"]' },
];

// color-contrast on glass tiers is a known design-system open question
// (PLAN.md §6). Excluded here so this audit flags semantic/structure issues
// that are cheap to fix; contrast rework is tracked as a follow-up.
const AXE_WCAG_TAGS = ['wcag2a', 'wcag2aa'];
const AXE_DISABLED_RULES = ['color-contrast'];

function buildAxe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(AXE_WCAG_TAGS)
    .disableRules(AXE_DISABLED_RULES);
}

test.describe('accessibility (axe)', () => {
  test('login page has no a11y violations (unauthenticated)', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-card')).toBeVisible();
    const results = await buildAxe(page).analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual(
      [],
    );
  });

  test.describe('authenticated routes', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    for (const route of AUTHED_ROUTES) {
      test(`${route.path} has no a11y violations`, async ({ page }) => {
        await page.goto(route.path);
        await expect(page.getByTestId('topbar')).toBeVisible();
        await page.locator(route.readiness).first().waitFor({ state: 'visible' });
        const results = await buildAxe(page).analyze();
        expect(
          results.violations,
          formatViolations(results.violations),
        ).toEqual([]);
      });
    }
  });
});

function formatViolations(
  violations: Array<{
    id: string;
    impact?: string | null;
    help: string;
    nodes: Array<{ target: unknown }>;
  }>,
): string {
  if (violations.length === 0) return 'no violations';
  return violations
    .map(
      (v) =>
        `- [${v.impact ?? '?'}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`,
    )
    .join('\n');
}
