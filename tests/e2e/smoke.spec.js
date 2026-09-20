const { test, expect } = require('playwright/test');

test('the benchmark dashboard loads without local errors', async ({ page, baseURL }) => {
  const localConsoleErrors = [];
  const localRequestFailures = [];

  page.on('console', message => {
    if (message.type() === 'error') localConsoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith(baseURL)) localRequestFailures.push(request.url());
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Mini PC Benchmark Comparison');
  await expect(page.locator('.site-logo')).toHaveAttribute('src', './assets/mini-bench-logo.webp');
  await expect(page.locator('.site-logo-link')).toHaveAttribute('href', './');
  await expect(page.locator('.site-title')).toHaveText('MINIBENCH');
  await expect(page.locator('.site-tagline')).toHaveText('MINI PC BENCHMARKS. REAL RESULTS.');
  await expect(page.locator('#site-meta')).toContainText(/\d+ devices/);
  await expect(page.locator('#benchmark-table tbody .device-name-trigger').first()).toBeVisible();
  await expect(page.locator('#changelog-link')).toHaveAttribute('href', './changelog.html');
  expect(localConsoleErrors).toEqual([]);
  expect(localRequestFailures).toEqual([]);
});

test('does not leak header markup while benchmark data loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#benchmark-table thead')).not.toContainText('<SPAN CLASS="SR-ONLY">');
});

test('the logo links home on every site page', async ({ page }) => {
  for (const path of ['/', '/changelog.html', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('.site-logo-link')).toHaveAttribute('href', './');
  }
});
