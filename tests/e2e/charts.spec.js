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

  const intelRow = page.locator('.chart-row').filter({ hasText: 'Intel NUC 12 E i7-12700H' });
  await expect(intelRow).toHaveCount(1);
  await expect(intelRow.locator('.chart-segment')).toHaveCount(3);
  const intelSegmentLabels = await intelRow.locator('.chart-segment').evaluateAll(elements => elements.map(element => element.title.split(':')[0]));
  expect(intelSegmentLabels).toEqual(['Half', 'Single', 'Quantised']);

  for (const deviceName of ['ASUS ROG GR70 9955HX3D', 'ASUS ROG NUC 15 Ultra 9 275HX']) {
    const row = page.locator('.chart-row').filter({ hasText: deviceName });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.chart-track-stacked')).toHaveCSS('overflow', 'hidden');
    await expect(row.locator('.chart-stack-clip')).toHaveCSS('overflow', 'hidden');
    await expect(row.locator('.chart-stack-clip')).toHaveCSS('border-top-right-radius', '3px');
    await expect(row.locator('.chart-stack-content')).toHaveCSS('transition-property', 'transform');
    await expect(row.locator('.chart-segment').first()).toHaveCSS('transition-property', 'all');
    await expect(row.locator('.chart-separator')).toHaveCount(2);
    await expect(row.locator('.chart-separator').first()).toHaveCSS('width', '1px');
    await expect.poll(() => row.locator('.chart-stack-content').evaluate(element => getComputedStyle(element).transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
    await expect.poll(() => row.locator('.chart-segment').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().width > 0))).toBe(true);

    const layout = await row.evaluate(element => {
      const track = element.querySelector('.chart-track-stacked').getBoundingClientRect();
      return {
        track: { left: track.left, right: track.right },
        segments: [...element.querySelectorAll('.chart-segment')].map(segment => {
          const rect = segment.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        })
      };
    });
    for (const segment of layout.segments) {
      expect(segment.left).toBeGreaterThanOrEqual(layout.track.left - 0.5);
      expect(segment.right).toBeLessThanOrEqual(layout.track.right + 0.5);
    }
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

  await page.locator('.chart-tab[data-chart="noise"]').click();
  await expect(page.locator('.chart-sort-pill')).toHaveCount(3);
  await expect(page.locator('.chart-sort-pill.active')).toHaveText('Load');
  await expect(page.locator('.chart-mode-btn[data-mode="stacked"]')).toHaveClass(/active/);

  await page.locator('.chart-tab[data-chart="cb23m"]').click();
  await expect(page.locator('.chart-sort-pill')).toHaveCount(2);
  await expect(page.locator('.chart-sort-pill.active')).toHaveText('Default');
  await expect(page.locator('.chart-mode-btn[data-mode="stacked"]')).toHaveClass(/active/);
});
