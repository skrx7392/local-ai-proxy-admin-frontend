import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Topbar "Go to…" combobox (UX P3 2026-07-08): `/` focuses the box and a
// suggestions popover lists every destination; typing filters fuzzily;
// ArrowUp/ArrowDown + Enter (or click) navigates; Escape dismisses. The
// pre-popover contract (`/` focus, exact name + Enter) must keep working.
//
// The box is hidden below the `md` breakpoint; the default Desktop Chrome
// viewport (1280px) shows it.

const NAV_DESTINATION_COUNT = 10;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

function suggestions(page: Page) {
  return page.getByRole('listbox', { name: 'Go to page suggestions' });
}

test.describe('topbar "Go to…" suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('happy path: `/` opens all destinations, arrow + Enter navigates', async ({
    page,
  }) => {
    await page.keyboard.press('/');
    const input = page.getByTestId('nav-search');
    await expect(input).toBeFocused();

    // Focus alone lists every destination.
    const listbox = suggestions(page);
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(
      NAV_DESTINATION_COUNT,
    );
    await expect(input).toHaveAttribute('aria-expanded', 'true');

    // Dashboard is highlighted first; ArrowDown moves to Usage.
    await page.keyboard.press('ArrowDown');
    await expect(
      listbox.getByRole('option', { name: 'Usage' }),
    ).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/usage');
    await expect(listbox).toBeHidden();
    await expect(input).toHaveValue('');
  });

  test('typing filters fuzzily and click selects', async ({ page }) => {
    await page.keyboard.press('/');
    const listbox = suggestions(page);
    await expect(listbox).toBeVisible();

    // "usg" is a non-contiguous subsequence of Usage only.
    await page.keyboard.type('usg');
    await expect(listbox.getByRole('option')).toHaveCount(1);
    await expect(
      listbox.getByRole('option', { name: 'Usage' }),
    ).toBeVisible();

    await listbox.getByRole('option', { name: 'Usage' }).click();
    await page.waitForURL((url) => url.pathname === '/usage');
  });

  test('Escape closes the popover and keeps focus; legacy exact-name Enter still works', async ({
    page,
  }) => {
    await page.keyboard.press('/');
    const input = page.getByTestId('nav-search');
    const listbox = suggestions(page);
    await expect(listbox).toBeVisible();

    await page.keyboard.type('keys');
    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('keys');

    // Popover dismissed — Enter still navigates by name (pre-popover
    // behavior, kept as the fallback).
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/keys');

    // A second Escape (popover closed) clears and leaves the box.
    await page.keyboard.press('/');
    await expect(listbox).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(input).not.toBeFocused();
    await expect(input).toHaveValue('');
  });

  test('unknown text shows a no-matches state and Enter stays put', async ({
    page,
  }) => {
    await page.keyboard.press('/');
    await page.keyboard.type('zzzz');
    await expect(page.getByTestId('nav-search-empty')).toBeVisible();
    await page.keyboard.press('Enter');
    // No navigation, popover still showing the no-matches state.
    await expect(page.getByTestId('nav-search-empty')).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/');
  });

  test('open popover has no axe violations (combobox pattern)', async ({
    page,
  }) => {
    await page.keyboard.press('/');
    await expect(suggestions(page)).toBeVisible();

    // Same ruleset as e2e/a11y.spec.ts (color-contrast excluded pending the
    // design-system contrast pass).
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(
      results.violations,
      results.violations
        .map((v) => `- [${v.impact ?? '?'}] ${v.id}: ${v.help}`)
        .join('\n'),
    ).toEqual([]);
  });
});
