const { test, expect } = require('playwright/test');

const rows = page => page.locator('#benchmark-table tbody .device-name-trigger');

test('mobile filter opening focuses a visible control with collapsed CPU brands', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?cpu=intel');
  const intel = page.locator('input[data-cpu="intel"]');
  await expect(intel).toBeChecked();
  const toggle = page.locator('#filter-toggle');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(intel).toBeVisible();
  await expect(intel).toBeFocused();

  await page.locator('.cpu-brand[data-cpu-brand="intel"] summary').click();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(page.locator('#filter-cb23s-range')).toBeFocused();
});

test('processor families combine as alternatives and persist in shared URLs', async ({ page }) => {
  const specs = await (await page.request.get('/device-specs.json')).json();
  const ryzen7 = Object.values(specs).filter(spec => spec.cpu_brand === 'AMD' && spec.cpu_family === 'Ryzen 7').length;
  const intelN = Object.values(specs).filter(spec => spec.cpu_brand === 'Intel' && spec.cpu_family === 'Processor N').length;
  await page.goto('/');
  await page.locator('#filter-toggle').click();
  await page.locator('.filter-section[data-filter-group="cpu"] summary').first().click();
  await page.locator('.cpu-brand[data-cpu-brand="amd"] summary').click();
  await page.locator('input[data-cpu="amd-ryzen-7"]').check();
  await expect(rows(page)).toHaveCount(ryzen7);
  await page.locator('.cpu-brand[data-cpu-brand="intel"] summary').click();
  await page.locator('input[data-cpu="intel-processor-n"]').check();
  await expect(rows(page)).toHaveCount(ryzen7 + intelN);
  await expect.poll(() => new URL(page.url()).searchParams.get('cpu')).toBe('amd-ryzen-7,intel-processor-n');
  await page.reload();
  await expect(page.locator('input[data-cpu="amd-ryzen-7"]')).toBeChecked();
  await expect(page.locator('input[data-cpu="intel-processor-n"]')).toBeChecked();
  await page.locator('input[data-cpu="amd"]').check();
  await expect(page.locator('input[data-cpu="amd-ryzen-7"]')).toBeDisabled();
  await expect(page.locator('input[data-cpu="amd-ryzen-7"]')).not.toBeChecked();
  await page.locator('#filter-clear').click();
  await expect(rows(page)).toHaveCount(Object.keys(specs).length);
  await expect.poll(() => new URL(page.url()).searchParams.has('cpu')).toBe(false);
});

test('search includes full processor model and unknown CPU data follows the missing-data choice', async ({ page }) => {
  const devices = await (await page.request.get('/devices.json')).json();
  const ids = devices.slice(0, 3).map(device => device.id);
  await page.route('**/device-specs.json', route => route.fulfill({ json: {
    [ids[0]]: { cpu_model: 'AMD Ryzen AI Max+ 395', cpu_brand: 'AMD', cpu_family: 'Ryzen AI Max' },
    [ids[1]]: { cpu_model: 'Intel Core i3-N305', cpu_brand: 'Intel', cpu_family: 'Core i3' },
    [ids[2]]: { cpu_model: null, cpu_brand: null, cpu_family: null }
  } }));
  await page.goto('/?q=ryzen%20ai%20max');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toHaveAttribute('data-device-id', ids[0]);
  await page.locator('#search').fill('');
  await page.locator('#filter-toggle').click();
  await page.locator('.filter-section[data-filter-group="cpu"] summary').first().click();
  await page.locator('.cpu-brand[data-cpu-brand="intel"] summary').click();
  await page.locator('input[data-cpu="intel"]').check();
  await expect(rows(page)).toHaveCount(1);
  await page.locator('#filter-include-unknown').check();
  await expect(rows(page)).toHaveCount(devices.length - 1);
});
