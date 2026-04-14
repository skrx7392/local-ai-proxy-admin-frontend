import { defineConfig, devices } from '@playwright/test';

const MOCK_BACKEND_URL = 'http://localhost:9999';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Two web servers: a mock backend on :9999 that impersonates the real
  // backend, and the Next standalone server on :3000 pointed at it via
  // BACKEND_URL. MSW can't intercept the BFF's server-side fetch() inside
  // Next's runtime, so E2E needs a genuine HTTP listener.
  //
  // Playwright starts both concurrently and waits for each `url` probe
  // before running tests.
  webServer: [
    {
      command: 'node e2e/mockBackend.mjs',
      url: `${MOCK_BACKEND_URL}/health`,
      timeout: 10_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      // `output: 'standalone'` means we can't use `next start`; run the
      // standalone server bundle directly (mirrors what the k8s image does).
      // Static assets + public files aren't copied by default, so the
      // command copies them before booting.
      command:
        'npm run build && cp -R .next/static .next/standalone/.next/static && node .next/standalone/server.js',
      url: 'http://localhost:3000',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        BACKEND_URL: MOCK_BACKEND_URL,
      },
    },
  ],
});
