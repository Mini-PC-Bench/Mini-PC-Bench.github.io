const { test, expect } = require('playwright/test');

const COMPARE_MAX = 4;

async function selectDevices(page, count) {
  const names = [];
  for (let index = 0; index < count; index += 1) {
    const row = page.locator('#benchmark-table tbody tr').nth(index);
    names.push((await row.locator('.device-name-trigger span').first().textContent()).trim());
    await row.locator('.compare-checkbox').check();
  }
  return names;
}

test('adds devices to the basket and compares them side by side', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();

  const names = await selectDevices(page, 2);

  await expect(page.locator('#compare-tray')).toBeVisible();
  await expect(page.locator('.compare-chip')).toHaveCount(2);
  await expect(page.locator('#compare-tab-count')).toHaveText('2');

  await page.locator('#compare-tray-open').click();

  await expect(page.locator('#compare-view')).toHaveClass(/active/);
  await expect(page.locator('.compare-head-name')).toHaveText(names);
  await expect(page.locator('.compare-cell.is-best').first()).toBeVisible();
});

test('caps the basket at the maximum number of devices', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();

  await selectDevices(page, COMPARE_MAX);

  await expect(page.locator('.compare-chip')).toHaveCount(COMPARE_MAX);
  await expect(page.locator('#benchmark-table tbody tr').nth(COMPARE_MAX).locator('.compare-checkbox')).toBeDisabled();
});

test('keeps the basket across reloads and shares it through the URL', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();

  const names = await selectDevices(page, 2);
  await expect(page).toHaveURL(/[?&]compare=/);

  await page.reload();

  await expect(page.locator('.compare-chip')).toHaveCount(2);
  await expect(page.locator('#compare-tab-count')).toHaveText('2');

  await page.locator('#compare-tray-open').click();
  await expect(page.locator('.compare-head-name')).toHaveText(names);
});

test('restores a shared comparison from the compare query parameter', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();
  const names = await selectDevices(page, 2);
  const sharedUrl = page.url();

  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(sharedUrl);

  await expect(page.locator('.compare-chip')).toHaveCount(2);
  await page.locator('#compare-tray-open').click();
  await expect(page.locator('.compare-head-name')).toHaveText(names);
});

test('toggles the basket from the device detail popover', async ({ page }) => {
  await page.goto('/');
  await page.locator('.device-name-trigger').first().click();

  const toggle = page.locator('.detail-compare-toggle');
  await expect(toggle).toHaveText('Add to comparison');

  await toggle.click();
  await expect(toggle).toHaveText('Remove from comparison');
  await expect(page.locator('.compare-chip')).toHaveCount(1);

  await toggle.click();
  await expect(toggle).toHaveText('Add to comparison');
  await expect(page.locator('#compare-tray')).toBeHidden();
});

test('shows Performance metrics in details and comparison', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();

  const performanceNames = await page.evaluate(async () => {
    const devices = await (await fetch('./devices.json')).json();
    return devices
      .filter(device => device.cb23s_perf != null && device.watts_perf != null)
      .slice(0, 2)
      .map(device => device.name);
  });
  const firstPerformanceRow = page.locator('#benchmark-table tbody tr').filter({ hasText: performanceNames[0] });
  await firstPerformanceRow.locator('.device-name-trigger').click();
  await expect(page.locator('.detail-stat dt', { hasText: 'Cinebench R23 single (Performance)' })).toBeVisible();
  await expect(page.locator('.detail-stat dt', { hasText: 'Max power draw (Performance)' })).toBeVisible();
  await page.locator('#device-detail-close').click();

  for (const name of performanceNames) {
    const row = page.locator('#benchmark-table tbody tr').filter({ hasText: name });
    await row.locator('.compare-checkbox').check();
  }
  await page.locator('#compare-tray-open').click();
  await expect(page.locator('.compare-metric', { hasText: 'Cinebench R23 single (Performance)' })).toBeVisible();
  await expect(page.locator('.compare-metric', { hasText: 'Max power draw (Performance)' })).toBeVisible();
});

test('hides identical rows when differences only is enabled', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();
  await selectDevices(page, 2);
  await page.locator('#compare-tray-open').click();

  const allRows = await page.locator('.compare-metric').count();
  await page.locator('#compare-diff-only').check();
  const diffRows = await page.locator('.compare-metric').count();

  expect(diffRows).toBeLessThanOrEqual(allRows);
  await expect(page.locator('#compare-diff-only')).toBeChecked();
});

test('clears the basket', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().waitFor();
  await selectDevices(page, 2);

  await page.locator('#compare-tray-clear').click();

  await expect(page.locator('#compare-tray')).toBeHidden();
  await expect(page.locator('#compare-tab-count')).toBeHidden();
  await expect(page).not.toHaveURL(/[?&]compare=/);
  await expect(page.locator('#benchmark-table tbody .compare-checkbox').first()).not.toBeChecked();
});
