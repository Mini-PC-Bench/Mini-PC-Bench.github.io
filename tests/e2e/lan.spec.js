const { test, expect } = require('playwright/test');

async function pilotFixture(page) {
  const devices = await (await page.request.get('/devices.json')).json();
  const ids = devices.slice(0, 6).map(device => device.id);
  const ports = [[2500, 2500], [2500], null, [], [1000, 10000], [5000]];
  const specs = Object.fromEntries(ids.map((id, index) => [id, {
    ethernet_ports_mbps: ports[index]
  }]));
  await page.route('**/device-specs.json', route => route.fulfill({ json: specs }));
  return { devices, ids };
}

const rows = page => page.locator('#benchmark-table tbody .device-name-trigger');
const shownIds = page => rows(page).evaluateAll(buttons => buttons.map(button => button.dataset.deviceId).sort());

test('LAN thresholds use individual ports, combine with count, and preserve scores and chart counts', async ({ page }) => {
  const { ids } = await pilotFixture(page);
  await page.goto('/?lan_min=2500');
  await expect(rows(page)).toHaveCount(4);
  expect(await shownIds(page)).toEqual([ids[0], ids[1], ids[4], ids[5]].sort());
  const before = await page.locator(`.device-name-trigger[data-device-id="${ids[0]}"]`).locator("xpath=ancestor::tr").locator("td.score").first().innerText();
  await page.locator('#filter-toggle').click();
  await expect(page.locator('#lan-rule')).toContainText('at least one port', { ignoreCase: true });
  await page.locator('#filter-lan-ports').check();
  await expect(rows(page)).toHaveCount(2);
  await expect.poll(() => new URL(page.url()).searchParams.get('lan_ports_min')).toBe('2');
  await page.locator('#filter-lan-speed').selectOption('5000');
  await expect(rows(page)).toHaveCount(1);
  expect(await shownIds(page)).toEqual([ids[4]]);
  await page.locator('.tab-btn[data-view="charts"]').click();
  await expect(page.locator('#chart-box .chart-row')).toHaveCount(1);
  await page.locator('#filter-clear').click();
  await expect(page.locator('#filter-lan-speed')).toHaveValue('');
  await expect(page.locator('#filter-lan-ports')).not.toBeChecked();
  await expect.poll(() => new URL(page.url()).searchParams.has('lan_min')).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.has('lan_ports_min')).toBe(false);
  await page.locator('.tab-btn[data-view="table"]').click();
  expect(await page.locator(`.device-name-trigger[data-device-id="${ids[0]}"]`).locator("xpath=ancestor::tr").locator("td.score").first().innerText()).toBe(before);
});

test('unknown LAN data respects the missing-data policy while confirmed no-port devices stay excluded', async ({ page }) => {
  const { devices, ids } = await pilotFixture(page);
  await page.goto('/?lan_min=2500&lan_ports_min=2&unknown=1');
  await expect(rows(page)).toHaveCount(devices.length - 3);
  const matching = await shownIds(page);
  expect(matching).toContain(ids[2]);
  expect(matching).not.toContain(ids[3]);
  await page.locator('#filter-toggle').click();
  await page.locator('#filter-include-unknown').uncheck();
  await expect(rows(page)).toHaveCount(2);
  await expect.poll(() => new URL(page.url()).searchParams.has('unknown')).toBe(false);
  await page.reload();
  await expect(page.locator('#filter-lan-speed')).toHaveValue('2500');
  await expect(page.locator('#filter-lan-ports')).toBeChecked();
  await page.locator('.filter-chip-remove[data-filter="lanPorts"]').click();
  await expect(rows(page)).toHaveCount(4);
  await page.locator('.filter-chip-remove[data-filter="lanSpeed"]').click();
  await expect(rows(page)).toHaveCount(devices.length);
});

test('details and shared comparison display per-port facts without adding throughput or winners', async ({ page }) => {
  const { ids } = await pilotFixture(page);
  await page.goto(`/?device=${ids[0]}&compare=${ids.slice(0, 4).join(',')}`);
  await expect(page.locator('#device-detail-overlay')).toContainText('2 × 2.5 GbE');
  await page.locator('#device-detail-close').click();
  await page.locator('.tab-btn[data-view="compare"]').click();
  const ethernet = page.locator('#compare-view tr').filter({ has: page.locator('th.compare-metric', { hasText: 'Ethernet ports' }) });
  await expect(ethernet.locator('td')).toHaveText(['2 × 2.5 GbE', '1 × 2.5 GbE', 'Unknown', 'No wired Ethernet']);
  await expect(ethernet.locator('.compare-best-badge')).toHaveCount(0);
});

test('malformed LAN query values are ignored', async ({ page }) => {
  const { devices } = await pilotFixture(page);
  await page.goto('/?lan_min=500&lan_ports_min=-1');
  await expect(rows(page)).toHaveCount(devices.length);
  await expect(page.locator('#filter-lan-speed')).toHaveValue('');
  await expect(page.locator('#filter-lan-ports')).not.toBeChecked();
});

test('reviewed pilot data joins the catalog and displays processor identity', async ({ page }) => {
  await page.goto('/?q=Minisforum%20AI%20X1%20Pro%20HX%20470&lan_min=2500&lan_ports_min=2');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toHaveAttribute('data-device-id', 'minisforum-ai-x1-pro-hx-470');
  await rows(page).click();
  await expect(page.locator('#device-detail-overlay')).toContainText('AMD Ryzen AI 9 HX 470');
  await expect(page.locator('#device-detail-overlay')).toContainText('2 × 2.5 GbE');
});

for (const failure of ['http', 'network', 'unknown-id', 'evidence', 'bad-speed', 'malformed-json']) {
  test(`spec loading reports ${failure} instead of treating data as unknown`, async ({ page }) => {
    const devices = await (await page.request.get('/devices.json')).json();
    await page.route('**/device-specs.json', route => {
      if (failure === 'network') return route.abort('failed');
      if (failure === 'http') return route.fulfill({ status: 503, body: 'unavailable' });
      if (failure === 'malformed-json') return route.fulfill({ contentType: 'application/json', body: '{invalid' });
      const id = failure === 'unknown-id' ? 'unknown-device' : devices[0].id;
      // A valid record next to the bad one must not be applied either: specs are all-or-nothing.
      return route.fulfill({ json: {
        [devices[1].id]: { cpu_model: 'Intel Core i3-N305', cpu_brand: 'Intel', cpu_family: 'Core i3', ethernet_ports_mbps: [2500] },
        [id]: { ethernet_ports_mbps: [failure === 'bad-speed' ? 500 : 2500], ...(failure === 'evidence' ? { evidence: {} } : {}) }
      } });
    });
    // Spec filters in a shared link are ignored rather than hiding every device.
    await page.goto('/?lan_min=2500&cpu=intel');
    const warning = page.locator('#specs-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('device-specs.json');
    await expect(rows(page)).toHaveCount(devices.length);
    await expect(page.locator('#count')).not.toHaveText('Load failed');
    await expect(page.locator('.filter-chip')).toHaveCount(0);
    await page.locator('#filter-toggle').click();
    await expect(page.locator('.filter-section[data-filter-group="cpu"]')).toHaveCount(0);
    await expect(page.locator('.filter-section[data-filter-group="lan"]')).toHaveCount(0);
    await page.locator(`.device-name-trigger[data-device-id="${devices[1].id}"]`).click();
    const detail = page.locator('#device-detail-overlay');
    await expect(detail).toBeVisible();
    await expect(detail).not.toContainText('Processor model');
    await expect(detail).not.toContainText('Ethernet ports');
    await expect(detail).not.toContainText('Unknown');
  });
}
