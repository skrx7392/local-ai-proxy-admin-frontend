import { expect, test, type Page } from '@playwright/test';

// The Playwright webServer runs the production standalone build, so these
// tests exercise the real prod CSP (no dev-only 'unsafe-eval').

function scriptSrcOf(csp: string): string {
  const found = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('script-src'));
  return found ?? '';
}

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Content Security Policy')) {
      violations.push(msg.text());
    }
  });
  return violations;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('content security policy', () => {
  test('login page ships a nonce-based script-src without unsafe-inline', async ({
    page,
  }) => {
    const violations = collectCspViolations(page);

    const response = await page.goto('/login');
    const csp = response?.headers()['content-security-policy'] ?? '';
    const scriptSrc = scriptSrcOf(csp);

    expect(scriptSrc).toContain("'nonce-");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");

    // The page must actually work under the policy: a rendered, interactive
    // form proves Next's inline hydration scripts executed with the nonce.
    await expect(page.getByTestId('login-card')).toBeVisible();
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Enter a valid email')).toBeVisible();

    expect(violations).toEqual([]);
  });

  test('nonce differs per request', async ({ page }) => {
    const first = await page.goto('/login');
    const second = await page.goto('/login');

    const nonceOf = (csp: string) =>
      /'nonce-([^']+)'/.exec(csp)?.[1] ?? '';
    const a = nonceOf(first?.headers()['content-security-policy'] ?? '');
    const b = nonceOf(second?.headers()['content-security-policy'] ?? '');

    expect(a).not.toBe('');
    expect(b).not.toBe('');
    expect(a).not.toBe(b);
  });

  test('authenticated dashboard renders with zero CSP violations', async ({
    page,
  }) => {
    const violations = collectCspViolations(page);

    await login(page);
    // Charts and StatCards on the dashboard are the heaviest client-side
    // surface; if anything needed unsafe-inline scripts it would fail here.
    await expect(page.getByTestId('dashboard-stat-requests')).toBeVisible();
    await expect(page.getByTestId('dashboard-timeseries')).toBeVisible();

    expect(violations).toEqual([]);
  });

  test('all other security headers are preserved', async ({ page }) => {
    const response = await page.goto('/login');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['strict-transport-security']).toContain('max-age=');
  });
});
