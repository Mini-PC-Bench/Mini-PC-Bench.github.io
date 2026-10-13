// Deterministic UI states captured on both builds and compared 1:1.
// Every scenario must end in a stable state (no animations or pending requests).
//
// Add a scenario here whenever you add a view, control, or interaction you want
// protected against accidental regressions during refactoring.

const scenarios = [
  {
    id: 'home-default',
    path: '/',
    description: 'Table view with default sort and default columns'
  },
  {
    id: 'home-sorted-multicore',
    path: '/',
    description: 'Table sorted by Cinebench R23 multi core (toggled twice)',
    async setup(page) {
      const header = page.locator('th[data-col="cb23m"]').first();
      await header.click();
      await header.click();
    }
  },
  {
    id: 'home-filtered',
    path: '/',
    description: 'Table filtered by the letter "a"',
    async setup(page) {
      await page.locator('#search').fill('a');
    }
  },
  {
    id: 'home-all-columns',
    path: '/',
    description: 'Table with every optional column enabled',
    async setup(page) {
      await page.locator('#column-toggle').click();
      const boxes = page.locator('#column-options input[type="checkbox"]');
      const count = await boxes.count();
      for (let i = 0; i < count; i += 1) {
        const box = boxes.nth(i);
        if (await box.isEnabled()) await box.check();
      }
      await page.locator('#column-toggle').click();
    }
  },
  {
    id: 'device-detail',
    path: '/',
    description: 'Device detail overlay for the top ranked device',
    async setup(page) {
      await page.locator('#benchmark-table tbody .device-name-trigger').first().click();
      await page.locator('#device-detail-overlay .device-detail-dialog').waitFor({ state: 'visible' });
    }
  },
  {
    id: 'charts-default',
    path: '/',
    description: 'Charts view with the default chart selected',
    async setup(page) {
      await page.locator('.tab-btn[data-view="charts"]').click();
      await page.locator('#chart-box').waitFor({ state: 'visible' });
    }
  },
  {
    id: 'charts-noise-multi',
    path: '/',
    description: 'Charts view with the multi series noise chart selected',
    async setup(page) {
      await page.locator('.tab-btn[data-view="charts"]').click();
      await page.locator('.chart-tab[data-chart="noise"]').click();
    }
  },
  {
    id: 'charts-single',
    path: '/?view=charts',
    description: 'Single-series volume chart',
    async setup(page) {
      await page.locator('.chart-tab[data-chart="volume"]').click();
    }
  },
  {
    id: 'charts-noise-grouped',
    path: '/?view=charts',
    description: 'Grouped noise chart with idle hidden and load sorting',
    async setup(page) {
      await page.locator('.chart-tab[data-chart="noise"]').click();
      await page.locator('.chart-mode-btn[data-mode="grouped"]').click();
      await page.locator('.legend-item[data-series="noise_idle"]').click();
      await page.locator('.chart-sort-pill[data-sort="noise_load"]').click();
    }
  },
  {
    id: 'numeric-filters',
    path: '/?watts_max=65&cb23m_min=5000&unknown=1',
    description: 'Numeric ranges from URL including unknown measurements',
    async setup(page) {
      await page.locator('#filter-toggle').click();
    }
  },
  {
    id: 'comparison',
    path: '/',
    description: 'Two-device comparison with differences highlighted',
    async setup(page) {
      const boxes = page.locator('#benchmark-table tbody .compare-checkbox');
      await boxes.nth(0).check();
      await boxes.nth(1).check();
      await page.locator('.tab-btn[data-view="compare"]').click();
      await page.locator('#compare-diff-only').check();
    }
  },
  {
    id: 'dark-table',
    path: '/',
    description: 'Default table in dark theme',
    async setup(page) {
      await page.locator('#theme-toggle').click();
    }
  },
  {
    id: 'mobile-details',
    path: '/',
    description: 'Device details at a narrow viewport',
    async setup(page) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#benchmark-table tbody .device-name-trigger').first().click();
      await page.locator('#device-detail-overlay .device-detail-dialog').waitFor({ state: 'visible' });
    }
  },
  {
    id: 'license',
    path: '/license.html',
    description: 'License page'
  },
  {
    id: 'changelog',
    path: '/changelog.html',
    description: 'Changelog page'
  },
  {
    id: 'not-found',
    path: '/404.html',
    description: '404 page'
  }
];

module.exports = { scenarios };
