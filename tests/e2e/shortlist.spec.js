const { test, expect } = require('playwright/test');

const STORAGE_KEY = 'minipc-benchmarks.favorites';
const devices = Array.from({ length: 6 }, (_, index) => ({
  id: `shortlist-${index}`,
  name: `Shortlist Device ${index}`,
  cb23s: 1000 + index * 100,
  cb23s_perf: 1100 + index * 100,
  watts: 20 + index * 10,
  power_idle_watts: index === 0 ? null : 10 + index,
  h264: index === 0 ? null : 100 + index
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/devices.json', route => route.fulfill({ json: devices }));
  await page.goto('/');
  await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(devices.length);
});

function tableStar(page, index) {
  return page.locator(`#benchmark-table .favorite-toggle[data-device-id="shortlist-${index}"]`);
}

test('favorites have no comparison limit and persist while the toggle resets', async ({ page }) => {
  for (let index = 0; index < devices.length; index++) await tableStar(page, index).click();
  await expect(page.locator('#shortlist-count')).toHaveText('6');
  await expect(page.locator('#compare-tab-count')).toBeHidden();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#shortlist-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#shortlist-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#benchmark-table .favorite-toggle[aria-pressed="true"]')).toHaveCount(6);
  await expect(page.locator('#shortlist-count')).toHaveText('6');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toHaveLength(6);
});

test('shortlist combines with search and numeric filters in table and charts', async ({ page }) => {
  await tableStar(page, 0).click();
  await tableStar(page, 2).click();
  await tableStar(page, 5).click();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#benchmark-table .device-name-trigger')).toHaveCount(3);
  await page.locator('#filter-toggle').click();
  await page.locator('#filter-watts-value').fill('40');
  await expect(page.locator('#benchmark-table .device-name-trigger')).toHaveCount(2);
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .chart-label')).toHaveText([devices[2].name, devices[0].name]);
  await page.locator('#search').fill(devices[2].name);
  await expect(page.locator('#chart-box .chart-label')).toHaveText([devices[2].name]);
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(page.locator('#benchmark-table .device-name-trigger > span:first-child')).toHaveText([devices[2].name]);
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#search')).toHaveValue(devices[2].name);
  await expect(page.locator('#filter-watts-value')).toHaveValue('40');
});

test('stars synchronize across details, stacked, grouped and single-series charts', async ({ page }) => {
  await tableStar(page, 1).focus();
  await tableStar(page, 1).press('Space');
  await page.locator('.tab-btn[data-view="charts"]').click();
  const chartStar = page.locator('#chart-box .favorite-toggle[data-device-id="shortlist-1"]');
  await expect(chartStar).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.chart-mode-btn[data-mode="grouped"]').click();
  await expect(chartStar).toHaveAttribute('aria-pressed', 'true');
  await chartStar.click();
  await expect(chartStar).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.chart-tab[data-chart="power_idle_watts"]').click();
  await chartStar.click();
  await page.locator('.chart-label[data-device-id="shortlist-1"]').click();
  const detailStar = page.locator('#device-detail-body .favorite-toggle');
  await expect(detailStar).toContainText('Remove from shortlist');
  await detailStar.click();
  await expect(detailStar).toContainText('Add to shortlist');
  await expect(chartStar).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#device-detail-close').click();
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(tableStar(page, 1)).toHaveAttribute('aria-pressed', 'false');
});

test('removing the last favorite updates shortlist and gives a useful empty state', async ({ page }) => {
  await tableStar(page, 1).click();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(1);
  await tableStar(page, 1).click();
  await expect(page.locator('#benchmark-table tbody')).toContainText('No favorites yet.');
  await expect(page.locator('#count')).toHaveText('Showing 0 of 0 shortlisted devices');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box')).toContainText('No favorites yet.');
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(6);
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(6);
});

test('distinguishes filtered-out favorites from favorites without metric data', async ({ page }) => {
  await tableStar(page, 0).click();
  await page.locator('#shortlist-toggle').click();
  await page.locator('#search').fill('no such device');
  await expect(page.locator('#benchmark-table tbody')).toHaveText('No matching devices.');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box')).toContainText('No matching devices.');
  await page.locator('#search').fill('');
  await page.locator('.chart-tab[data-chart="h264"]').click();
  await expect(page.locator('#chart-box')).toContainText('No Default or Performance data available for this metric yet.');
  await page.locator('.chart-tab[data-chart="power_idle_watts"]').click();
  await expect(page.locator('#chart-box')).toContainText('No data available for this metric yet.');
  await expect(page.locator('#shortlist-count')).toHaveText('1');
});

test('shortlist and comparison can be changed independently', async ({ page }) => {
  await tableStar(page, 1).click();
  await page.locator('tr[data-row-id="shortlist-2"] .compare-checkbox').check();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#benchmark-table .device-name-trigger')).toHaveCount(1);
  await expect(page.locator('.compare-chip')).toHaveCount(1);
  await page.locator('tr[data-row-id="shortlist-1"] .compare-checkbox').check();
  await tableStar(page, 1).click();
  await expect(page.locator('.compare-chip')).toHaveCount(2);
  await page.locator('#compare-tray-clear').click();
  await expect(page.locator('#shortlist-count')).toHaveText('0');
  await page.locator('#shortlist-toggle').click();
  await tableStar(page, 3).click();
  await page.locator('tr[data-row-id="shortlist-3"] .compare-checkbox').check();
  await page.locator('#compare-tray-clear').click();
  await expect(tableStar(page, 3)).toHaveAttribute('aria-pressed', 'true');
});

test('ignores malformed, duplicate and obsolete saved favorites', async ({ page }) => {
  for (const saved of ['{broken', '{}', JSON.stringify(['shortlist-1', 'shortlist-1', 'deleted', null, 42])]) {
    await page.evaluate(({ key, saved }) => localStorage.setItem(key, saved), { key: STORAGE_KEY, saved });
    await page.reload();
    await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(6);
    await expect(page.locator('#shortlist-count')).toHaveText(saved.startsWith('[') ? '1' : '0');
  }
});

test('favorites remain usable when browser storage fails', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.reload();
  await expect(tableStar(page, 1)).toBeVisible();
  await tableStar(page, 1).click();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(1);
  await expect(tableStar(page, 1)).toHaveAttribute('aria-pressed', 'true');
});

test('shortlist controls work on mobile in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#theme-toggle').click();
  await tableStar(page, 1).click();
  await page.locator('#shortlist-toggle').click();
  await expect(page.locator('#benchmark-table .favorite-toggle')).toHaveCount(1);
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .favorite-toggle')).toBeVisible();
  await expect(page.locator('#chart-box .chart-label')).toHaveText([devices[1].name]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#chart-box .favorite-toggle').click();
  await expect(page.locator('#chart-box')).toContainText('No favorites yet.');
});
