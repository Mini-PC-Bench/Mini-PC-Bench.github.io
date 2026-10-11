const { test, expect } = require('playwright/test');

test('groups releases by month and supports keyboard expansion', async ({ page }) => {
  await page.goto('/changelog.html');
  const months = page.locator('.changelog-month');
  await expect(months.first()).toHaveAttribute('open', '');
  await expect(months.nth(1)).toHaveAttribute('open', '');
  const archive = months.nth(2);
  await expect(archive).not.toHaveAttribute('open', '');
  await archive.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(archive).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(archive).not.toHaveAttribute('open', '');
  for (const month of await months.all()) {
    const count = await month.locator('.changelog-release').count();
    await expect(month.locator('.changelog-month-count')).toHaveText(`${count} ${count === 1 ? 'update' : 'updates'}`);
  }
});

test('reveals archived dates from shared links and hash changes', async ({ page }) => {
  await page.goto('/changelog.html#2026-04-12');
  const target = page.locator('[id="2026-04-12"]');
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport();
  await page.evaluate(() => { location.hash = '2026-08-14-to-2026-08-20'; });
  const range = page.locator('[id="2026-08-14-to-2026-08-20"]');
  await expect(range).toBeVisible();
  await expect(range).toBeInViewport();
});

test('keeps monthly releases readable on mobile in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/changelog.html');
  const navigation = page.locator('.view-tabs');
  await expect(navigation.locator('[data-return-view="table"]')).toHaveText('Table View');
  await expect(navigation.locator('[data-return-view="charts"]')).toHaveText('Charts');
  await expect(navigation.locator('[data-return-view="compare"]')).toHaveText('Compare');
  await expect(navigation.locator('.page-link-current')).toHaveText('Changelog');
  for (const theme of ['light', 'dark']) {
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.changelog-release').first()).toHaveCSS('grid-template-columns', /^\d+(\.\d+)?px$/);
    if (theme === 'light') await page.locator('#theme-toggle').click();
  }
});
