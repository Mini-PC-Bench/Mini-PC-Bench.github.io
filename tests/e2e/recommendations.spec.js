const { test, expect } = require('playwright/test');

test('shows yearly recommendation lists beside Compare with direct YouTube links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.view-tabs [data-view="compare"] + [data-view="recommendations"]')).toHaveText('Recommendations');
  await page.getByRole('button', { name: 'Recommendations', exact: true }).click();

  const model = await (await page.request.get('/recommendations.json')).json();
  const view = page.locator('#recommendations-view');
  await expect(view).toBeVisible();
  const years = [...new Set(model.videos.map(video => video.year))].sort((a, b) => b - a);
  await expect(view.locator('.recommendations-year h3')).toHaveText(years.map(String));
  const videos = view.locator('.recommendations-list a');
  await expect(videos).toHaveCount(model.videos.length);
  await expect(view).not.toContainText(/reasons.*buy/i);
  await expect(view.getByRole('link', { name: 'View the playlist' })).toHaveAttribute('href', `https://www.youtube.com/playlist?list=${model.playlistId}`);
  await expect(view).not.toContainText('↗');

  for (const video of model.videos) {
    const link = view.locator(`.recommendations-list a[href*="v=${video.id}"]`);
    await expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${video.id}${video.startSeconds ? `&t=${video.startSeconds}s` : ''}`);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

test('renders model changes safely and groups unsorted records by year and publication date', async ({ page }) => {
  const videos = [
    { id: 'fNmqfQFBFrg', title: 'Older list', year: 2025, publishedAt: '2025-07-10' },
    { id: '8-H2Fd9TSZk', title: '<img src=x onerror=alert(1)>', year: 2026, publishedAt: '2025-11-28' },
    { id: 'AymVXWyJ34A', title: 'Latest list', year: 2026, publishedAt: '2026-05-19' }
  ];
  await page.route('**/recommendations.json', route => route.fulfill({ json: { playlistId: 'PLtest', videos } }));
  await page.goto('/');
  await page.locator('[data-view="recommendations"]').click();
  await expect(page.locator('.recommendation-copy h4')).toHaveText(['Latest list', '<img src=x onerror=alert(1)>', 'Older list']);
  await expect(page.locator('.recommendation-copy img')).toHaveCount(0);
  await expect(page.locator('#recommendations-playlist')).toHaveAttribute('href', 'https://www.youtube.com/playlist?list=PLtest');
});

test('keeps benchmarks usable when the model fails and retries on reopening the tab', async ({ page }) => {
  const model = await (await page.request.get('/recommendations.json')).json();
  let requests = 0;
  await page.route('**/recommendations.json', route => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: model });
  });
  await page.goto('/');
  await page.locator('[data-view="recommendations"]').click();
  await expect(page.locator('#recommendations-box [role="alert"]')).toBeVisible();
  await page.locator('[data-view="table"]').click();
  await expect(page.locator('#benchmark-table tbody tr').first()).toBeVisible();
  await page.locator('[data-view="recommendations"]').click();
  await expect(page.locator('.recommendation-card')).toHaveCount(model.videos.length);
  await expect(page.locator('#recommendations-box [role="alert"]')).toHaveCount(0);
});

test('rejects malformed video IDs instead of constructing unsafe links', async ({ page }) => {
  await page.route('**/recommendations.json', route => route.fulfill({ json: {
    playlistId: 'PLtest', videos: [{ id: 'bad" onclick="alert(1)', title: 'Bad record', year: 2026, publishedAt: '2026-05-19' }]
  } }));
  await page.goto('/');
  await page.locator('[data-view="recommendations"]').click();
  await expect(page.locator('#recommendations-box [role="alert"]')).toBeVisible();
  await expect(page.locator('.recommendation-card')).toHaveCount(0);
});

test('hides benchmark controls and preserves filters and comparison selection across tabs', async ({ page }) => {
  await page.goto('/');
  await page.locator('.compare-checkbox').first().check();
  await page.locator('.compare-checkbox').nth(1).check();
  await page.locator('#filter-toggle').click();
  await page.locator('#search').fill('beelink');
  await expect(page.locator('#count')).toContainText('Showing');

  await page.getByRole('button', { name: 'Recommendations', exact: true }).click();
  for (const id of ['table-view', 'charts-view', 'compare-view', 'table-summary', 'filter-toolbar', 'filter-sidebar']) {
    await expect(page.locator(`#${id}`)).toBeHidden();
  }
  await expect(page.locator('.compare-chip')).toHaveCount(2);

  await page.locator('[data-view="compare"]').click();
  await expect(page.locator('#compare-view')).toBeVisible();
  await expect(page.locator('.compare-head-name')).toHaveCount(2);
  await page.locator('[data-view="charts"]').click();
  await expect(page.locator('#charts-view')).toBeVisible();
  await expect(page.locator('#filter-sidebar')).toBeVisible();
  await page.locator('[data-view="table"]').click();
  await expect(page.locator('#table-view')).toBeVisible();
  await expect(page.locator('#search')).toHaveValue('beelink');
  await expect(page.locator('#filter-sidebar')).toBeVisible();
  await expect(page.locator('#table-summary')).toBeVisible();
});

test('keeps recommendations usable on a narrow screen in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Recommendations', exact: true }).click();
  await expect(page.locator('#recommendations-view')).toBeVisible();
  await expect(page.locator('[data-view="recommendations"]')).toBeInViewport();

  for (const theme of ['light', 'dark']) {
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.recommendations-list a').first()).toBeVisible();
    if (theme === 'light') await page.locator('#theme-toggle').click();
  }
});

test('aligns the grid with the wide dashboard and adapts its columns to viewport width', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-view="recommendations"]').click();
  await expect(page.locator('.recommendation-card').first()).toBeVisible();
  for (const [width, columns] of [[1920, 3], [900, 2], [390, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    const grid = await page.locator('.recommendations-list').first().evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      left: element.getBoundingClientRect().left
    }));
    expect(grid.columns).toBe(columns);
    const headerLeft = await page.locator('.header-inner').evaluate(element => element.getBoundingClientRect().left);
    expect(Math.abs(grid.left - headerLeft)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
