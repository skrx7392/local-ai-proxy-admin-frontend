import fs from 'node:fs/promises';
import path from 'node:path';

import { test, type Page } from '@playwright/test';

const ENABLED = process.env.SCREENSHOTS === '1';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

async function setTheme(page: Page, theme: 'dark' | 'light') {
  // next-themes persists to localStorage under the key `theme` (default).
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('theme', t);
    } catch {
      // localStorage may be unavailable before navigation; fine.
    }
  }, theme);
}

async function shot(page: Page, route: string, filename: string, theme: 'dark' | 'light') {
  await page.goto(route);
  // Nudge <html> class directly in case next-themes hasn't hydrated yet.
  await page.evaluate((t) => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);
  }, theme);
  if (route === '/login') {
    await page.getByTestId('login-card').waitFor();
  } else {
    await page.getByTestId('topbar').waitFor();
  }
  await page.waitForTimeout(250);
  const outPath = path.join('docs', 'screenshots', theme, filename);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
}

test.describe('docs screenshots (gated by SCREENSHOTS=1)', () => {
  test.skip(!ENABLED, 'set SCREENSHOTS=1 to generate docs/screenshots');

  for (const theme of ['dark', 'light'] as const) {
    test(`capture ${theme} theme`, async ({ page }) => {
      await setTheme(page, theme);

      await shot(page, '/login', 'login.png', theme);

      await login(page);

      await shot(page, '/', 'dashboard.png', theme);
      await shot(page, '/keys', 'keys.png', theme);
      await shot(page, '/usage', 'usage.png', theme);
      await shot(page, '/styleguide', 'styleguide.png', theme);
    });
  }
});
