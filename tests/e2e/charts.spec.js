const { test, expect } = require('playwright/test');

test('switches from the table view to a benchmark chart', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tab-btn[data-view="charts"]').click();

  await expect(page.locator('#charts-view')).toHaveClass(/active/);
  await expect(page.locator('.chart-tab[data-chart="gb7s"]')).toHaveCount(0);
  await expect(page.locator('.chart-tab[data-chart="gb7m"]')).toHaveCount(0);
  await expect(page.locator('.chart-tab[data-chart="noise_load"]')).toHaveCount(0);
  await expect(page.locator('.chart-tab[data-chart="noise_perf"]')).toHaveCount(0);
  await expect(page.locator('.chart-tab[data-chart="noise_idle"]')).toHaveCount(0);
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

test('renders explicit Geekbench AI variants in stacked mode by default', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await page.locator('.chart-tab[data-chart="gbai_cpu"]').click();

  await expect(page.locator('.chart-title')).toHaveText('Geekbench AI · CPU');
  await expect(page.locator('.chart-mode-btn[data-mode="stacked"]')).toHaveClass(/active/);
  await expect(page.locator('.legend-item[data-series="gbai_cpu_half"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.legend-item[data-series="gbai_cpu_single"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.legend-item[data-series="gbai_cpu_quantised"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('.chart-mode-btn[data-mode="grouped"]').click();
  await expect(page.locator('.chart-mode-btn[data-mode="grouped"]')).toHaveClass(/active/);
});

test('isolates multi-series state and keeps decreasing GPU deltas visible', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await page.locator('.chart-tab[data-chart="gbai_gpu"]').click();

  const firstRowSegments = page.locator('.chart-row').first().locator('.chart-segment');
  await expect(firstRowSegments).toHaveCount(3);
  await expect.poll(async () => firstRowSegments.evaluateAll(elements => elements.map(element => Number(element.dataset.w)))).toEqual(expect.arrayContaining([expect.any(Number)]));
  const widths = await firstRowSegments.evaluateAll(elements => elements.map(element => Number(element.dataset.w)));
  expect(widths[1]).toBeGreaterThan(0);
  expect(widths[2]).toBeGreaterThan(0);

  await page.locator('.chart-tab[data-chart="noise"]').click();
  await expect(page.locator('.chart-sort-pill')).toHaveCount(3);
  await expect(page.locator('.chart-sort-pill.active')).toHaveText('Load');
  await expect(page.locator('.chart-mode-btn[data-mode="stacked"]')).toHaveClass(/active/);

  await page.locator('.chart-tab[data-chart="cb23m"]').click();
  await expect(page.locator('.chart-sort-pill')).toHaveCount(2);
  await expect(page.locator('.chart-sort-pill.active')).toHaveText('Default');
  await expect(page.locator('.chart-mode-btn[data-mode="stacked"]')).toHaveClass(/active/);
});
