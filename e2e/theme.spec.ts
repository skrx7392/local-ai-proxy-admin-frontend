import { expect, test } from '@playwright/test';

test.describe('theme system', () => {
  test('body has the dark canvas gradient by default', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundImage;
    });
    // Chrome normalizes the gradient hex values to rgb() tuples.
    expect(bg).toMatch(/linear-gradient/);
    expect(bg.toLowerCase()).toContain('rgb(15, 32, 39)'); // #0f2027 → dark gradient anchor
  });

  test('theme toggle swaps to the light gradient', async ({ page }) => {
    await page.goto('/');
    // Ping button toggles next-themes between dark/light.
    await page.getByTestId('ping-button').click();

    // next-themes sets class on <html>; verify it became `light`.
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.classList.contains('light')),
    ).toBe(true);

    const bg = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundImage,
    );
    expect(bg.toLowerCase()).toContain('rgb(219, 234, 254)'); // #dbeafe → light gradient anchor
  });
});
