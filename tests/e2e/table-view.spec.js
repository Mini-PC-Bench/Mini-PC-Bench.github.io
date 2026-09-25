const { test, expect } = require('playwright/test');

test('filters devices by name', async ({ page }) => {
  await page.goto('/');
  const device = page.locator('.device-name-trigger').first();
  const deviceName = await device.locator('span').first().textContent();

  await page.locator('#search').fill(deviceName);

  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(1);
  await expect(page.locator('#count')).toHaveText(/Showing 1 of \d+ devices/);
});

test('sorts the table when a benchmark header is selected', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('th[data-col="cb23s"]').first();

  await header.click();
  await expect(header).toHaveClass(/active/);
  const firstIndicator = await header.locator('.sort-ind').textContent();

  await header.click();
  const secondIndicator = await header.locator('.sort-ind').textContent();
  expect(secondIndicator).not.toBe(firstIndicator);
});

test('persists selected columns across reloads', async ({ page }) => {
  await page.goto('/');
  await page.locator('#column-toggle').click();
  const option = page.locator('#column-options input[value="gbai_cpu_single"]');
  await option.check();
  await expect(page.locator('th[data-col="gbai_cpu_single"]').first()).toBeVisible();

  await page.reload();
  await expect(page.locator('th[data-col="gbai_cpu_single"]').first()).toBeVisible();
});

test('keeps default metrics and exposes Performance metrics separately', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('th[data-col="cb23s"]').first()).toBeVisible();
  await expect(page.locator('th[data-col="cb23s_perf"]').first()).toHaveCount(0);

  await page.locator('#column-toggle').click();
  const option = page.locator('#column-options input[value="cb23s_perf"]');
  await expect(option).toBeVisible();
  await expect(option.locator('..')).toContainText('Perf: CB R23 Single');
  await option.check();

  const performanceHeader = page.locator('th[data-col="cb23s_perf"]').first();
  await expect(performanceHeader).toBeVisible();
  await expect(performanceHeader).toContainText('Perf');
});
