import { defineConfig, devices } from '@playwright/test';

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
  // TODO(A3): swap in the mockBackend.mjs webServer array per PLAN.md
  // "Testing Layers" section — a real Node HTTP server on :9999 that
  // impersonates the backend for Playwright runs. For A1, the placeholder
  // is the real Next build + start, with no backend behind it.
  webServer: {
    // `output: 'standalone'` means we can't use `next start`; run the
    // standalone server bundle directly (mirrors what the k8s image will do).
    // Static assets + public files aren't copied by default, so the
    // command copies them before booting.
    command:
      'npm run build && cp -R .next/static .next/standalone/.next/static && node .next/standalone/server.js',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
