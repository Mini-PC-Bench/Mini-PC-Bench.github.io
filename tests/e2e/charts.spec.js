const { test, expect } = require('playwright/test');

test('switches from the table view to a benchmark chart', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tab-btn[data-view="charts"]').click();

  await expect(page.locator('#charts-view')).toHaveClass(/active/);
  await expect(page.locator('#chart-box .chart-title')).toBeVisible();

  await page.locator('.chart-tab[data-chart="cb23m"]').click();
  await expect(page.locator('.chart-tab[data-chart="cb23m"]')).toHaveClass(/active/);
  await expect(page.locator('#chart-box')).not.toContainText('No chart data available.');
});

test('toggles metrics in a multi-series chart', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await page.locator('.chart-tab[data-chart="noise"]').click();

  const idle = page.locator('.legend-item[data-series="noise_idle"]');
  const load = page.locator('.legend-item[data-series="noise_load"]');
  const performance = page.locator('.legend-item[data-series="noise_perf"]');

  await expect(idle).toHaveAttribute('aria-pressed', 'true');
  await expect(load).toHaveAttribute('aria-pressed', 'true');
  await expect(performance).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.chart-sort-pill')).toHaveCount(3);
  await expect(page.locator('.chart-num-multi').first()).toHaveAttribute('title', /Performance/);

  await performance.click();
  await expect(performance).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.chart-sort-pill')).toHaveCount(2);
  await expect(page.locator('.chart-num-multi').first()).not.toHaveAttribute('title', /Performance/);

  await performance.click();
  await idle.click();
  await load.click();
  await expect(performance).toBeDisabled();
});
