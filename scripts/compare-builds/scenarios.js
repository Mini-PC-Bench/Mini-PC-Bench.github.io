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
