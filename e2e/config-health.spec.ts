import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('config page + topbar health indicator', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('/config renders grouped snapshot values from the backend', async ({
    page,
  }) => {
    await page.goto('/config');

    await expect(page.getByTestId('config-group-backend')).toBeVisible();
    await expect(page.getByTestId('config-group-limits')).toBeVisible();
    await expect(page.getByTestId('config-group-observability')).toBeVisible();
    await expect(page.getByTestId('config-group-build')).toBeVisible();

    await expect(page.getByTestId('config-value-ollama_url')).toHaveText(
      'http://ollama.local:11434',
    );
    await expect(
      page.getByTestId('config-value-max_request_body_bytes'),
    ).toHaveText('50 MiB');
    await expect(
      page.getByTestId('config-value-admin_session_duration_hours'),
    ).toHaveText('6 h');
  });

  test('sidenav has a Config entry that routes to /config', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sidenav-link-config').click();
    await page.waitForURL((url) => url.pathname === '/config');
    await expect(page.getByTestId('config-page')).toBeVisible();
  });

  test('topbar health dot renders and exposes the check rows', async ({
    page,
  }) => {
    await page.goto('/');
    const dot = page.getByTestId('topbar-health');
    await expect(dot).toBeVisible();
    await expect(dot).toHaveAttribute('data-health-tone', 'ok');

    await dot.click();

    await expect(page.getByTestId('topbar-health-check-db')).toBeVisible();
    await expect(page.getByTestId('topbar-health-check-ollama')).toBeVisible();
    await expect(
      page.getByTestId('topbar-health-check-usage_writer'),
    ).toBeVisible();
  });
});

test.describe('mockBackend config + health (wire shapes)', () => {
  const MOCK = 'http://localhost:9999';

  test('/api/admin/config returns a bare whitelisted snapshot (no envelope)', async ({
    request,
  }) => {
    const res = await request.get(`${MOCK}/api/admin/config`, {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Bare object — no `data` wrapper, no secrets.
    expect(body).toMatchObject({ version: 'abc1234', port: '8080' });
    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('admin_key');
    expect(body).not.toHaveProperty('database_url');
  });

  test('/api/admin/health is bare + 200 when ok, 503 + degraded when flagged', async ({
    request,
  }) => {
    const ok = await request.get(`${MOCK}/api/admin/health`, {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(ok.status()).toBe(200);
    const okBody = await ok.json();
    expect(okBody.status).toBe('ok');
    expect(okBody.checks?.db?.status).toBe('ok');

    const degraded = await request.get(
      `${MOCK}/api/admin/health?degraded=1`,
      { headers: { Authorization: 'Bearer test-token' } },
    );
    expect(degraded.status()).toBe(503);
    const degradedBody = await degraded.json();
    expect(degradedBody.status).toBe('degraded');
    expect(degradedBody.checks?.ollama?.status).toBe('error');
  });
});
