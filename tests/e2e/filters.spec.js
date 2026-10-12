const { test, expect } = require('playwright/test');

const WATTS_THRESHOLD = 60;

async function openFilters(page) {
  await page.locator('#filter-toggle').click();
}

// Compute expected filter results from the actual devices.json served in this run, instead of
// hardcoding dataset-specific counts that drift whenever devices.json changes.
async function loadWattsFixture(page) {
  const response = await page.request.get('/devices.json');
  const devices = await response.json();
  const total = devices.length;
  const withWatts = devices.filter(d => d.watts != null);
  const underThreshold = withWatts.filter(d => d.watts <= WATTS_THRESHOLD).length;
  const missingWatts = total - withWatts.length;

  return { devices, total, underThreshold, missingWatts };
}

test('max-watts filter reduces row count and updates the count label', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const { total, underThreshold } = await loadWattsFixture(page);

  await page.locator('#filter-watts-value').fill(String(WATTS_THRESHOLD));

  await expect(page.locator('#count')).toHaveText(`Showing ${underThreshold} of ${total} devices`);
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(underThreshold);
});

test('Cinebench minimum scores combine with power ceilings in shared links and both views', async ({ page }) => {
  await page.goto('/?cb23s_min=1500&cb23m_min=7000&watts_max=60');
  const response = await page.request.get('/devices.json');
  const devices = await response.json();
  const expected = devices.filter(device => device.cb23s >= 1500 && device.cb23m >= 7000 && device.watts != null && device.watts <= 60);
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.locator('#count')).toHaveText(`Showing ${expected.length} of ${devices.length} devices`);
  await expect(page.locator('#filter-chips')).toContainText('≥ 1,500pts');
  await expect(page.locator('#filter-chips')).toContainText('≥ 7,000pts');
  await expect(page.locator('#filter-cb23s-value')).toHaveValue('1500');
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(expected.length);
  const ids = await page.locator('#benchmark-table tbody .device-name-trigger').evaluateAll(buttons => buttons.map(button => button.dataset.deviceId).sort());
  expect(ids).toEqual(expected.map(device => device.id).sort());

  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(expected.length);
  await page.locator('.filter-chip-remove[data-filter="cb23s"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.has('cb23s_min')).toBe(false);
  expect(new URL(page.url()).searchParams.get('cb23m_min')).toBe('7000');
  await page.reload();
  await expect(page.locator('#filter-cb23m-value')).toHaveValue('7000');
});

test('inactive minimum-score sliders start at the dataset minimum', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const range = page.locator('#filter-cb23s-range');
  const min = Number(await range.getAttribute('min'));
  await expect(range).toHaveValue(String(min));
  await range.press('ArrowRight');
  await expect(page.locator('#filter-cb23s-value')).toHaveValue(String(min + 50));
  await expect(page.locator('.filter-chip[data-filter="cb23s"]')).toContainText('≥');
});

test('number filters preserve draft values while typing and apply completed limits', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const { total, underThreshold } = await loadWattsFixture(page);
  const input = page.locator('#filter-watts-value');

  await input.fill('');
  await expect(input).toHaveValue('');
  await expect(page.locator('#count')).toHaveText(`${total} devices`);
  await input.pressSequentially('6');
  await expect(input).toHaveValue('6');
  await input.pressSequentially('0');
  await expect(input).toHaveValue('60');
  await expect(page.locator('#count')).toHaveText(`Showing ${underThreshold} of ${total} devices`);
  await input.press('Enter');
  await expect(input).toHaveValue('60');
});

test('number filters clamp out-of-bounds drafts only when leaving the input', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const input = page.locator('#filter-watts-value');
  const max = await input.getAttribute('max');

  await input.fill('99999');
  await expect(input).toHaveValue('99999');
  await page.locator('#filter-include-unknown').focus();
  await expect(input).toHaveValue(max);
  await input.fill('');
  await page.locator('#filter-include-unknown').focus();
  await expect(input).toHaveValue('');
  await expect(page.locator('.filter-chip[data-filter="watts"]')).toHaveCount(0);
});

test('inactive controls show Any and clearing a numeric input removes its limit', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const inputs = page.locator('#filter-panel input[type="number"]');
  for (const input of await inputs.all()) {
    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('placeholder', 'Any');
  }
  const input = page.locator('#filter-cb23s-value');
  await input.fill('1500');
  await expect(page.locator('[data-filter-row="cb23s"]')).toHaveAttribute('data-active', 'true');
  await input.fill('');
  await input.press('Enter');
  await expect(page.locator('[data-filter-row="cb23s"]')).toHaveAttribute('data-active', 'false');
  await expect(page.locator('#filter-cb23s-range')).toHaveValue(await input.getAttribute('min'));
  await expect(page.locator('#filter-chips')).toBeHidden();
  await expect.poll(() => new URL(page.url()).searchParams.has('cb23s_min')).toBe(false);
});

test('sliders represent exact numeric limits and step from the current value', async ({ page }) => {
  await page.goto('/?watts_max=60&volume_max=8.17');
  await openFilters(page);
  const wattsInput = page.locator('#filter-watts-value');
  const wattsRange = page.locator('#filter-watts-range');
  const volumeInput = page.locator('#filter-volume-value');

  await expect(wattsInput).toHaveValue('60');
  await expect(wattsRange).toHaveValue('60');
  expect(await wattsInput.evaluate(input => input.validity.valid)).toBe(true);
  await expect(page.locator('#filter-volume-range')).toHaveValue(await volumeInput.inputValue());
  expect(await volumeInput.evaluate(input => input.validity.valid)).toBe(true);

  await wattsInput.fill('60.5');
  await expect(wattsRange).toHaveValue('60.5');
  expect(await wattsInput.evaluate(input => input.validity.valid)).toBe(true);
  await wattsRange.press('ArrowRight');
  await expect(wattsInput).toHaveValue('65.5');
  await expect(wattsRange).toHaveValue('65.5');
  await wattsRange.press('Home');
  await expect(wattsRange).toHaveValue(await wattsInput.getAttribute('min'));
  await expect(wattsInput).toHaveValue(await wattsRange.inputValue());
});

test('max-watts filter also reduces the row count in the active chart tab', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const { total } = await loadWattsFixture(page);

  await page.locator('.tab-btn[data-view="charts"]').click();
  const initialCount = await page.locator('#chart-box .chart-row').count();

  await page.locator('.tab-btn[data-view="table"]').click();
  await page.locator('#filter-watts-value').fill(String(WATTS_THRESHOLD));
  await page.locator('.tab-btn[data-view="charts"]').click();

  const filteredCount = await page.locator('#chart-box .chart-row').count();
  expect(filteredCount).toBeLessThan(initialCount);
  await expect(page.locator('#chart-box .chart-desc')).toContainText(`of ${total} devices`);
});

test('unfiltered chart counts reflect available data and enabled series', async ({ page }) => {
  await page.goto('/');
  const response = await page.request.get('/devices.json');
  const devices = await response.json();
  await page.locator('.tab-btn[data-view="charts"]').click();

  for (const metric of ['storage', 'gb6s']) {
    await page.locator(`.chart-tab[data-chart="${metric}"]`).click();
    const present = devices.filter(device => device[metric] != null).length;
    await expect(page.locator('#chart-box .chart-row')).toHaveCount(present);
    await expect(page.locator('#chart-box .chart-desc')).toContainText(`· ${present} devices`);
  }

  await page.locator('.chart-tab[data-chart="noise"]').click();
  await page.locator('.legend-item[data-series="noise_idle"]').click();
  await page.locator('.legend-item[data-series="noise_load"]').click();
  const performance = devices.filter(device => (device.noise_perf ?? device.noise?.load_performance) != null).length;
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(performance);
  await expect(page.locator('#chart-box .chart-desc')).toContainText(`· ${performance} devices`);
});

test('table and charts share visible, editable filters while comparison stays independent', async ({ page }) => {
  await page.goto('/?watts_max=60');
  await openFilters(page);
  const { total, underThreshold } = await loadWattsFixture(page);
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#filter-panel')).toBeVisible();
  await expect(page.locator('#filter-chips')).toContainText('60W');
  await expect(page.locator('#column-toggle')).toBeHidden();
  await expect(page.locator('#table-summary')).toBeHidden();

  await page.locator('#filter-watts-value').fill('50');
  await expect(page.locator('#filter-chips')).toContainText('50W');
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(page.locator('#filter-watts-value')).toHaveValue('50');
  await expect(page.locator('#column-toggle')).toBeVisible();
  await page.locator('.tab-btn[data-view="charts"]').click();
  await page.locator('.filter-chip-remove[data-filter="watts"]').click();
  await expect(page.locator('#count')).toHaveText(`${total} devices`);

  await page.locator('#search').fill('beelink');
  const filteredChartRows = await page.locator('#chart-box .chart-row').count();
  expect(filteredChartRows).toBeGreaterThan(0);
  expect(filteredChartRows).toBeLessThan(underThreshold);
  await page.locator('.tab-btn[data-view="compare"]').click();
  await expect(page.locator('#filter-toolbar')).toBeHidden();
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#search')).toHaveValue('beelink');
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(filteredChartRows);
});

test('filters use a grouped left sidebar on desktop and a left drawer on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await openFilters(page);
  await expect(page.locator('#filter-panel')).toBeVisible();
  await expect(page.locator('#filter-toggle')).toBeVisible();
  await expect(page.locator('.view-tabs #filter-toggle')).toHaveCount(0);
  const toggle = await page.locator('#filter-toggle').boundingBox();
  const highlights = await page.locator('#table-summary').boundingBox();
  const sidebar = await page.locator('#filter-sidebar').boundingBox();
  const results = await page.locator('.results-content').boundingBox();
  expect(highlights.y + highlights.height).toBeLessThanOrEqual(toggle.y);
  expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(results.x);
  expect(toggle.x).toBeGreaterThanOrEqual(results.x);
  expect(toggle.x + toggle.width).toBeLessThanOrEqual(results.x + results.width);
  for (const group of ['Benchmarks', 'Power', 'Physical', 'Noise']) {
    await expect(page.locator('.filter-section summary', { hasText: group })).toBeVisible();
  }
  await page.locator('.filter-section summary', { hasText: 'Benchmarks' }).click();
  await expect(page.locator('#filter-cb23s-value')).toBeHidden();
  await page.locator('.filter-section summary', { hasText: 'Benchmarks' }).click();
  await page.locator('#filter-watts-value').fill('60');
  await page.locator('#search').click();
  await expect(page.locator('#filter-panel')).toBeVisible();
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#filter-watts-value')).toBeVisible();
  await expect(page.locator('#filter-watts-value')).toHaveValue('60');
  await page.locator('.tab-btn[data-view="compare"]').click();
  await expect(page.locator('#filter-sidebar')).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(page.locator('#filter-panel')).toBeVisible();
  await expect(page.locator('#filter-sidebar')).toBeVisible();
  const mobileSidebar = await page.locator('#filter-sidebar').boundingBox();
  const header = await page.locator('header').boundingBox();
  expect(mobileSidebar.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(mobileSidebar.x + mobileSidebar.width).toBeLessThanOrEqual(390);
  await expect(page.locator('#filter-panel')).toBeVisible();
  await expect(page.locator('#filter-watts-value')).toHaveValue('60');
  expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
});

test('clear-all restores the full device list', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const { total } = await loadWattsFixture(page);

  await page.locator('#filter-watts-value').fill(String(WATTS_THRESHOLD));
  await expect(page.locator('#count')).toContainText('Showing');

  await page.locator('#filter-clear').click();

  await expect(page.locator('#count')).toHaveText(`${total} devices`);
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(total);
});

test('clear-all resets search, numeric limits, missing-data policy, and their URL params', async ({ page }) => {
  await page.goto('/?q=beelink&watts_max=60&unknown=1');
  await openFilters(page);
  const { total } = await loadWattsFixture(page);
  await page.locator('#filter-clear').click();

  await expect(page.locator('#search')).toHaveValue('');
  await expect(page.locator('#filter-include-unknown')).not.toBeChecked();
  await expect(page.locator('#filter-chips')).toBeHidden();
  await expect(page.locator('#filter-clear')).toBeHidden();
  await expect(page.locator('#count')).toHaveText(`${total} devices`);
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(total);
  await expect.poll(() => new URL(page.url()).search).toBe('');

  await page.locator('#search').fill('beelink');
  await expect(page.locator('#filter-clear')).toBeVisible();
  await page.locator('#filter-clear').click();
  await expect(page.locator('#count')).toHaveText(`${total} devices`);
  await expect(page.locator('#search')).toHaveValue('');
});

test('filter controls have names and units, with keyboard focus restored on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#filter-watts-range').waitFor({ state: 'attached' });
  const toggle = page.locator('#filter-toggle');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('slider', { name: 'Min Cinebench R23 single-core (pts)', exact: true })).toBeFocused();

  for (const name of ['Max power draw (W)', 'Max idle power (W)', 'Max volume (L)', 'Max idle noise (dB)', 'Max load noise (dB)']) {
    await expect(page.getByRole('slider', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name, exact: true })).toBeVisible();
  }

  await page.getByRole('spinbutton', { name: 'Max volume (L)', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#filter-panel')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(page.getByRole('slider', { name: 'Min Cinebench R23 single-core (pts)', exact: true })).toBeFocused();
});

test('deep link with watts_max renders filtered results on first paint', async ({ page }) => {
  await page.goto('/');
  const { total, underThreshold } = await loadWattsFixture(page);

  await page.goto(`/?watts_max=${WATTS_THRESHOLD}`);

  await expect(page.locator('#count')).toHaveText(`Showing ${underThreshold} of ${total} devices`);
  await expect(page.locator('#filter-watts-value')).toHaveValue(String(WATTS_THRESHOLD));

  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .chart-desc')).toContainText(`of ${total} devices`);
});

test('filter params and a device deep link coexist', async ({ page }) => {
  await page.goto('/');
  const deviceId = await page.locator('.device-name-trigger').first().getAttribute('data-device-id');

  await page.goto(`/?watts_max=200&device=${deviceId}`);

  await expect(page.locator('#device-detail-overlay')).not.toHaveAttribute('hidden', '');
  const url = new URL(page.url());
  expect(url.searchParams.get('watts_max')).toBe('200');
  expect(url.searchParams.get('device')).toBe(deviceId);
});

test('include-unknown checkbox restores devices missing the filtered field', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  const { missingWatts } = await loadWattsFixture(page);
  test.skip(missingWatts === 0, 'dataset currently has no watts-less devices to restore');

  await page.locator('#filter-watts-value').fill(String(WATTS_THRESHOLD));

  const withoutUnknown = await page.locator('#benchmark-table tbody .device-name-trigger').count();

  await page.locator('#filter-include-unknown').check();

  const withUnknown = await page.locator('#benchmark-table tbody .device-name-trigger').count();
  expect(withUnknown).toBe(withoutUnknown + missingWatts);
});

test('filter coverage and the missing-data chip explain and control unknown values', async ({ page }) => {
  await page.goto('/?watts_max=60&unknown=1');
  const { devices, total, missingWatts, underThreshold } = await loadWattsFixture(page);
  const present = total - missingWatts;
  const cb23sPresent = devices.filter(device => device.cb23s != null).length;
  await expect(page.locator('#filter-watts-coverage')).toHaveText(`Data for ${present} of ${total} devices (${Math.round(present / total * 100)}%)`);
  await expect(page.locator('#filter-cb23s-coverage')).toHaveText(`Data for ${cb23sPresent} of ${total} devices (${Math.round(cb23sPresent / total * 100)}%)`);
  await expect(page.locator('.filter-chip[data-filter="unknown"]')).toContainText('Including missing data');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('.filter-chip[data-filter="unknown"]')).toBeVisible();
  await page.getByRole('button', { name: 'Exclude devices with missing data' }).click();
  await expect(page.locator('#count')).toHaveText(`Showing ${underThreshold} of ${total} devices`);
  await expect(page.locator('#filter-include-unknown')).not.toBeChecked();
  await expect(page.locator('.filter-chip[data-filter="unknown"]')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has('unknown')).toBe(false);
  expect(new URL(page.url()).searchParams.get('watts_max')).toBe('60');
});

test('composite score stays dataset-relative when a filter is active', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  await page.locator('#column-toggle').click();
  await page.locator('#column-options input[value="composite"]').check();
  await page.locator('#column-options input[value="composite_perf"]').check();
  await page.locator('#filter-watts-value').fill(String(WATTS_THRESHOLD));

  const scoreColumnIndex = await page.locator('#benchmark-table thead th').evaluateAll(headers =>
    headers.findIndex(header => header.dataset.col === 'composite'));
  expect(scoreColumnIndex).toBeGreaterThanOrEqual(0);
  const filteredRow = page.locator('#benchmark-table tbody tr').first();
  const deviceId = await filteredRow.locator('.device-name-trigger').getAttribute('data-device-id');
  const scoreWithFilter = await filteredRow.locator('td').nth(scoreColumnIndex).textContent();

  await page.locator('#filter-clear').click();

  const unfilteredRow = page.locator(`.device-name-trigger[data-device-id="${deviceId}"]`).locator('xpath=ancestor::tr');
  const scoreWithoutFilter = await unfilteredRow.locator('td').nth(scoreColumnIndex).textContent();

  expect(scoreWithoutFilter).toBe(scoreWithFilter);
});

test('filter updates retain matching rows, ranks, and device interactions', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  await page.waitForFunction(() => linksLoaded);
  const response = await page.request.get('/devices.json');
  const devices = await response.json();
  const retained = devices.reduce((best, device) => device.cb23s > best.cb23s ? device : best);
  const button = page.locator(`#benchmark-table .device-name-trigger[data-device-id="${retained.id}"]`);
  await button.evaluate(element => { window.retainedRow = element.closest('tr'); });
  await page.locator('#benchmark-table thead').evaluate(element => { window.retainedHeader = element; });
  const originalWidths = await page.locator('#benchmark-table thead th').evaluateAll(headers => headers.map(header => header.getBoundingClientRect().width));

  await page.locator('#filter-cb23s-value').fill('1700');
  const expected = devices.filter(device => device.cb23s >= 1700);
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(expected.length);
  expect(await button.evaluate(element => element.closest('tr') === window.retainedRow)).toBe(true);
  expect(await page.locator('#benchmark-table thead').evaluate(element => element === window.retainedHeader)).toBe(true);
  const filteredWidths = await page.locator('#benchmark-table thead th').evaluateAll(headers => headers.map(header => header.getBoundingClientRect().width));
  filteredWidths.forEach((width, index) => expect(Math.abs(width - originalWidths[index])).toBeLessThan(1));
  const ranks = await page.locator('#benchmark-table tbody tr').evaluateAll(rows => rows.map(row => Number(row.cells[0].textContent)));
  expect(ranks).toEqual(expected.map((_, index) => index + 1));

  await page.locator('#benchmark-table th[data-col="cb23s"]').click();
  await page.locator('#benchmark-table th[data-col="cb23s"]').click();
  const sortedIds = await page.locator('#benchmark-table .device-name-trigger').evaluateAll(buttons => buttons.map(button => button.dataset.deviceId));
  expect(sortedIds).toEqual([...expected].sort((a, b) => a.cb23s - b.cb23s).map(device => device.id));

  await button.locator('xpath=ancestor::tr').locator('.compare-checkbox').check();
  await expect(page.locator('#compare-tab-count')).toHaveText('1');
  await button.click();
  await expect(page.locator('#device-detail-overlay')).toBeVisible();
  await page.locator('#device-detail-close').click();
  await page.locator('#filter-clear').click();
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(devices.length);
  const restored = devices.find(device => device.cb23s < 1700);
  const restoredButton = page.locator(`#benchmark-table .device-name-trigger[data-device-id="${restored.id}"]`);
  await restoredButton.locator('xpath=ancestor::tr').locator('.compare-checkbox').check();
  await expect(page.locator('#compare-tab-count')).toHaveText('2');
  await restoredButton.click();
  await expect(page.locator('#device-detail-overlay')).toBeVisible();
});

test('rapid filter updates refresh the active view and switching restores current results', async ({ page }) => {
  await page.goto('/');
  await openFilters(page);
  await page.waitForFunction(() => linksLoaded);
  const response = await page.request.get('/devices.json');
  const devices = await response.json();
  const expectedCount = limit => devices.filter(device => device.watts != null && device.watts <= limit).length;
  const expectedChartCount = limit => devices.filter(device => device.watts != null && device.watts <= limit && device.cb23s != null).length;
  await page.locator('#chart-box .chart-row').first().evaluate(element => { window.hiddenChartRow = element; });
  await page.locator('#filter-watts-value').fill('60');
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(expectedCount(60));
  expect(await page.locator('#chart-box .chart-row').first().evaluate(element => element === window.hiddenChartRow)).toBe(true);

  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(expectedChartCount(60));
  await page.locator('#benchmark-table tbody tr').first().evaluate(element => { window.hiddenTableRow = element; });
  await page.locator('#filter-watts-range').evaluate(slider => {
    for (const value of [100, 80, 70, 65, 55]) {
      slider.value = value;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await expect(page.locator('#filter-watts-value')).toHaveValue('55');
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(expectedChartCount(55));
  expect(await page.locator('#benchmark-table tbody tr').first().evaluate(element => element === window.hiddenTableRow)).toBe(true);
  await page.locator('.tab-btn[data-view="table"]').click();
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(expectedCount(55));
  await expect.poll(() => new URL(page.url()).searchParams.get('watts_max')).toBe('55');
});

test('filtering recovers from no matches and sizes columns for newly restored devices', async ({ page }) => {
  await page.goto('/?cb23s_min=2200');
  await openFilters(page);
  await page.waitForFunction(() => linksLoaded);
  const { total } = await loadWattsFixture(page);
  await page.locator('#search').fill('no-device-matches-this-query');
  await expect(page.locator('#benchmark-table tbody')).toHaveText('No matching devices.');
  await page.locator('#filter-clear').click();
  await expect(page.locator('#benchmark-table tbody .device-name-trigger')).toHaveCount(total);
  await expect(page.locator('#benchmark-table')).toHaveCSS('table-layout', 'auto');
  await page.locator('#filter-watts-value').fill('60');
  await expect(page.locator('#benchmark-table')).toHaveCSS('table-layout', 'fixed');
  await page.locator('#column-toggle').click();
  await page.locator('#column-options input[value="cb23s_perf"]').check();
  await expect(page.locator('#benchmark-table th[data-col="cb23s_perf"]')).toBeVisible();
  await expect(page.locator('#benchmark-table')).toHaveCSS('table-layout', 'auto');
});

test('hiding the desktop sidebar restores full results width and preserves active filters', async ({ page }) => {
  await page.goto('/?watts_max=60');
  await openFilters(page);
  const { total, underThreshold } = await loadWattsFixture(page);
  const results = page.locator('.results-content');
  const narrow = await results.boundingBox();
  await page.locator('#filter-toggle').click();
  await expect(page.locator('#filter-sidebar')).toBeHidden();
  await expect(page.locator('#filter-toggle')).toHaveAttribute('aria-expanded', 'false');
  const wide = await results.boundingBox();
  expect(wide.width).toBeGreaterThan(narrow.width + 250);
  const workspace = await page.locator('.benchmark-workspace').boundingBox();
  expect(wide.x).toBe(workspace.x);
  expect(wide.width).toBe(workspace.width);
  await expect(page.locator('#filter-toggle')).toHaveAccessibleName('Show filters');
  await expect(page.locator('#count')).toHaveText(`Showing ${underThreshold} of ${total} devices`);
  await expect(page.locator('.filter-chip[data-filter="watts"]')).toContainText('60W');
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#filter-sidebar')).toBeHidden();
  await page.locator('#filter-toggle').click();
  await expect(page.locator('#filter-watts-value')).toHaveValue('60');
  await expect(page.locator('#filter-sidebar')).toBeVisible();
  await expect(page.locator('#filter-toggle')).toHaveAccessibleName('Hide filters');
  await page.locator('#filter-sidebar-close').click();
  await expect(page.locator('#filter-sidebar')).toBeHidden();
  await expect(page.locator('#filter-toggle')).toBeFocused();
});

test('filter panel visibility persists across reloads', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#filter-toggle');
  const sidebar = page.locator('#filter-sidebar');

  await expect(sidebar).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName('Show filters');
  await toggle.click();
  await expect(sidebar).toBeVisible();
  await page.reload();
  await expect(sidebar).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await toggle.click();
  await expect(sidebar).toBeHidden();
  await page.reload();
  await expect(sidebar).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('compact highlights occupy a separate full-width row above filters and results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await openFilters(page);
  await expect(page.locator('#info-grid .info-card')).toHaveCount(6);
  await expect(page.locator('#layout-select')).toHaveCount(0);
  const overview = await page.locator('#table-summary').boundingBox();
  const sidebar = await page.locator('#filter-sidebar').boundingBox();
  const results = await page.locator('.results-content').boundingBox();
  expect(overview.y + overview.height).toBeLessThanOrEqual(sidebar.y);
  expect(overview.width).toBeGreaterThan(results.width);
  const cardRows = await page.locator('#info-grid .info-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().top));
  expect(new Set(cardRows).size).toBe(1);
});

for (const width of [1440, 390]) {
  for (const view of ['table', 'charts']) {
    test(`filters remain accessible without scrolling the ${view} view at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?cb23s_min=1000');
      await openFilters(page);
      if (view === 'charts') await page.locator('.tab-btn[data-view="charts"]').click();
      await page.evaluate(() => window.scrollTo(0, 1500));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
      await page.locator('#filter-sidebar-close').click();
      await expect(page.locator('#filter-sidebar')).toBeHidden();
      await expect(page.locator('#filter-toggle')).toBeFocused();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
      await expect(page.locator('#filter-toggle')).toBeInViewport();
      await page.locator('#filter-toggle').click();
      await expect(page.locator('#filter-cb23s-value')).toHaveValue('1000');
      await expect(page.locator('#filter-cb23s-value')).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
      await page.keyboard.press('Escape');
      await expect(page.locator('#filter-sidebar')).toBeHidden();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
      if (view === 'table') {
        await expect(page.locator('.floating-table-header')).toBeVisible();
        const floating = await page.locator('.floating-table-header').boundingBox();
        const table = await page.locator('.table-wrap').boundingBox();
        const toolbar = await page.locator('#filter-toolbar').boundingBox();
        expect(floating.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height - 1);
        expect(Math.abs(floating.x - table.x)).toBeLessThan(1);
        expect(Math.abs(floating.width - table.width)).toBeLessThan(1);
      }
    });
  }
}


test('header and content keep the wide layout when filters are hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const main = page.locator('main.benchmark-layout');
  const header = await page.locator('header .container').boundingBox();
  expect(header.width).toBe(1680);
  expect((await main.boundingBox()).width).toBe(header.width);
  const wideTable = await page.locator('.table-wrap').boundingBox();
  await page.locator('#filter-toggle').click();
  expect((await main.boundingBox()).width).toBe(header.width);
  expect((await page.locator('.table-wrap').boundingBox()).width).toBeLessThan(wideTable.width);
  await page.locator('#filter-toggle').click();
  for (const view of ['table', 'charts', 'compare']) {
    await page.locator(`.tab-btn[data-view="${view}"]`).click();
    const collapsed = await main.boundingBox();
    expect(collapsed.width).toBe(header.width);
    expect(collapsed.x).toBe(header.x);
    if (view !== 'compare') {
      const results = await page.locator('.results-content').boundingBox();
      const toolbar = await page.locator('#filter-toolbar').boundingBox();
      expect(results.width).toBe(1632);
      expect(toolbar.x).toBe(results.x);
      expect(toolbar.width).toBe(results.width);
    }
  }
  await page.locator('.tab-btn[data-view="table"]').click();
  await page.locator('#filter-toggle').click();
  expect((await main.boundingBox()).width).toBe(header.width);
});
