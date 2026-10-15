import { FILTER_GROUPS, FILTER_DEFS, deviceMatchesFilters } from './frontend/filters.js';
import { TABLE_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './frontend/table-columns.js';
import { BENCH_HIGHER, BENCH_LOWER, normalizeDevices, normalizeDeviceLinks } from './frontend/data.js';
import { fmt, fmtD, escapeHtml, clamp } from './frontend/format.js';
import { getUrlParam, writeUrlState } from './frontend/url.js';
import { DETAIL_METRIC_GROUPS, DETAIL_METRICS, formatDetailMetricValue, renderDetailMetrics, renderDetailLinks, renderDetailPhoto, renderDeviceSummary } from './frontend/details.js';
import { createCharts } from './frontend/charts.js';

const DATA_URL = './devices.json';
const LINKS_URL = './device-links.json';
const RECOMMENDATIONS_URL = './recommendations.json';
const DEVICE_QUERY_PARAM = 'device';
const COMPARE_QUERY_PARAM = 'compare';
const QUERY_TEXT_PARAM = 'q';
const INCLUDE_UNKNOWN_PARAM = 'unknown';
const FILTER_PANEL_STORAGE_KEY = 'minipc-benchmarks.filters-open';
const COLUMN_STORAGE_KEY = 'minipc-benchmarks.visible-columns';
const COMPARE_STORAGE_KEY = 'minipc-benchmarks.compare-selection';
const COMPARE_DIFF_STORAGE_KEY = 'minipc-benchmarks.compare-diff-only';
const COMPARE_MAX = 4;
const FAVORITES_STORAGE_KEY = 'minipc-benchmarks.favorites';
const META_SUFFIX = 'Cinebench R23 &nbsp;·&nbsp; Geekbench 6 &nbsp;·&nbsp; 3DMark &nbsp;·&nbsp; H264 &nbsp;·&nbsp; Power draw &nbsp;·&nbsp; Efficiency score';

let DEVICES = [];
let MAX_H = {};
let MIN_L = {};
let FILTER_BOUNDS = {};
let visibleColumns = new Set();
let sortCol = 'composite';
let sortDir = -1;
let filterState = {
  q: '',
  ranges: {},
  includeUnknown: false
};
let filterUrlDebounceTimer = null;
let filterRenderFrame = null;
let tableLayoutDeviceIds = new Set();
let activeChart = 'cb23s';
let activeDeviceId = null;
let linksLoaded = false;
let recommendationsRequested = false;
let compareSelection = [];
let compareDiffOnly = false;
let activeView = 'table';
let favorites = new Set();
let shortlistOnly = false;

const benchmarkTable = document.getElementById('benchmark-table');
const infoGrid = document.getElementById('info-grid');
const countEl = document.getElementById('count');
const siteMetaEl = document.getElementById('site-meta');
const chartBox = document.getElementById('chart-box');
const infoGridCaptionEl = document.getElementById('info-grid-caption');
const searchInputEl = document.getElementById('search');
const shortlistToggle = document.getElementById('shortlist-toggle');
const filterToolbarEl = document.getElementById('filter-toolbar');
const filterToggleBtn = document.getElementById('filter-toggle');
const filterSidebarEl = document.getElementById('filter-sidebar');
const benchmarkLayoutEl = document.querySelector('main.benchmark-layout');
const filterPanelEl = document.getElementById('filter-panel');
let filterPanelPreference = loadFilterPanelPreference();
const filterChipsEl = document.getElementById('filter-chips');
const columnToggleBtn = document.getElementById('column-toggle');
const columnMenuEl = document.getElementById('column-menu');
const columnOptionsEl = document.getElementById('column-options');
const deviceDetailOverlay = document.getElementById('device-detail-overlay');
const deviceDetailCloseBtn = document.getElementById('device-detail-close');
const deviceDetailTitle = document.getElementById('device-detail-title');
const deviceDetailSummary = document.getElementById('device-detail-summary');
const deviceDetailBody = document.getElementById('device-detail-body');
const compareBox = document.getElementById('compare-box');
const recommendationsBox = document.getElementById('recommendations-box');
const compareSubtitleEl = document.getElementById('compare-subtitle');
const compareTabCountEl = document.getElementById('compare-tab-count');
const compareTrayEl = document.getElementById('compare-tray');
const compareTrayItemsEl = document.getElementById('compare-tray-items');
const compareDiffOnlyEl = document.getElementById('compare-diff-only');
const siteHeader = document.querySelector('header');
const tableWrap = document.querySelector('.table-wrap');
let floatingTableHeader = null;

const { renderChart, renderChartMessage, renderLoadingChart } = createCharts({
  chartBox,
  getDevices: () => DEVICES,
  getFiltered,
  getActiveChart: () => activeChart,
  formatDeviceCountLabel,
  getEmptyResultsMessage,
  renderFavoriteButton,
  openDeviceDetail
});

function syncFloatingTableHeader() {
  if (!floatingTableHeader) return;
  const tableRect = benchmarkTable.getBoundingClientRect();
  const wrapRect = tableWrap.getBoundingClientRect();
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  const toolbarBottom = filterToolbarEl.hidden ? headerHeight : filterToolbarEl.getBoundingClientRect().bottom;
  const stickyTop = Math.max(headerHeight, toolbarBottom);
  const sourceHeaders = benchmarkTable.querySelectorAll('thead th');
  const floatingHeaders = floatingTableHeader.querySelectorAll('thead th');
  const shouldShow = tableRect.top < stickyTop && tableRect.bottom > stickyTop;

  floatingTableHeader.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) return;

  floatingTableHeader.firstElementChild.style.width = `${tableRect.width}px`;
  sourceHeaders.forEach((header, index) => {
    const floatingHeader = floatingHeaders[index];
    if (floatingHeader) {
      floatingHeader.style.width = `${header.getBoundingClientRect().width}px`;
    }
  });
  floatingTableHeader.style.left = `${wrapRect.left}px`;
  floatingTableHeader.style.top = `${stickyTop}px`;
  floatingTableHeader.style.width = `${wrapRect.width}px`;
  floatingTableHeader.firstElementChild.style.transform = `translateX(-${tableWrap.scrollLeft}px)`;
}

function renderFloatingTableHeader() {
  floatingTableHeader?.remove();
  floatingTableHeader = document.createElement('div');
  floatingTableHeader.className = 'floating-table-header';
  floatingTableHeader.setAttribute('aria-hidden', 'true');
  const table = benchmarkTable.cloneNode(false);
  table.removeAttribute('id');
  table.append(benchmarkTable.querySelector('thead').cloneNode(true));
  floatingTableHeader.append(table);
  document.body.append(floatingTableHeader);
  floatingTableHeader.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      benchmarkTable.querySelector(`th[data-col="${CSS.escape(th.dataset.col)}"]`)?.click();
    });
  });
  syncFloatingTableHeader();
}

function findDeviceById(id) {
  return DEVICES.find(device => device.id === id) ?? null;
}

function getDeviceIdFromUrl() {
  return getUrlParam(DEVICE_QUERY_PARAM);
}

function setDeviceIdInUrl(deviceId, { replace = false } = {}) {
  writeUrlState({ [DEVICE_QUERY_PARAM]: deviceId }, { replace });
}

function urlParamNameForFilter(def) {
  return `${def.id}_${def.mode}`;
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ranges = {};

  FILTER_DEFS.forEach(def => {
    const raw = params.get(urlParamNameForFilter(def));
    if (raw == null) return;
    const bounds = FILTER_BOUNDS[def.id];
    const num = Number(raw);
    if (!bounds || !Number.isFinite(num)) return;
    ranges[def.id] = clamp(num, bounds.min, bounds.max);
  });

  return {
    q: getUrlParam(QUERY_TEXT_PARAM) ?? '',
    ranges,
    includeUnknown: params.get(INCLUDE_UNKNOWN_PARAM) === '1'
  };
}

function writeFilterStateToUrl({ replace = true } = {}) {
  const updates = { [QUERY_TEXT_PARAM]: filterState.q.trim() || null };

  FILTER_DEFS.forEach(def => {
    const value = filterState.ranges[def.id];
    updates[urlParamNameForFilter(def)] = value == null ? null : String(value);
  });

  updates[INCLUDE_UNKNOWN_PARAM] = filterState.includeUnknown ? '1' : null;
  writeUrlState(updates, { replace });
}

function scheduleFilterUrlWrite() {
  clearTimeout(filterUrlDebounceTimer);
  filterUrlDebounceTimer = setTimeout(() => writeFilterStateToUrl({ replace: true }), 250);
}

// Applies filter state from the current URL to filterState and the filter UI; used on
// initial load and on popstate (browser back/forward).
function applyFiltersFromUrl() {
  const parsed = readFiltersFromUrl();
  filterState.q = parsed.q;
  filterState.ranges = parsed.ranges;
  filterState.includeUnknown = parsed.includeUnknown;

  searchInputEl.value = filterState.q;
  renderFilterPanel();
  renderFilterChips();
}

function renderDeviceDetail(device) {
  deviceDetailTitle.textContent = device.name;
  deviceDetailSummary.textContent = renderDeviceSummary(device);
  const photo = renderDetailPhoto(device);
  const links = renderDetailLinks(device, linksLoaded);
  const metrics = DETAIL_METRIC_GROUPS.filter(group => group.type !== 'links').map(group => {
    return renderDetailMetrics(group, device);
  }).filter(Boolean).join('');
  const compareAction = `<div class="detail-actions">
    ${renderFavoriteButton(device, true)}
    <button type="button" class="detail-compare-toggle" data-device-id="${escapeHtml(device.id)}" aria-pressed="false">Add to comparison</button>
  </div>`;
  deviceDetailBody.innerHTML = `${compareAction}<div class="detail-feature-grid">${photo}${links}</div>${metrics}`;
  initDetailPhotoLoading();

  deviceDetailBody.querySelector('.detail-compare-toggle')?.addEventListener('click', event => {
    toggleCompare(event.currentTarget.dataset.deviceId);
  });
  syncCompareDetailButton();
}

function initDetailPhotoLoading() {
  deviceDetailBody.querySelectorAll('.detail-photo-frame').forEach(frame => {
    const image = frame.querySelector('.detail-photo-image');
    if (!image) return;
    const settle = state => {
      frame.classList.remove('is-loading');
      frame.classList.add(state);
    };
    if (image.complete && image.naturalWidth > 0) {
      settle('is-loaded');
      return;
    }
    image.addEventListener('load', () => settle('is-loaded'), { once: true });
    image.addEventListener('error', () => settle('is-failed'), { once: true });
  });
}

function openDeviceDetail(deviceId, { syncUrl = true, replaceHistory = false } = {}) {
  const device = findDeviceById(deviceId);
  if (!device) return;

  activeDeviceId = device.id;
  renderDeviceDetail(device);
  deviceDetailOverlay.hidden = false;
  document.body.classList.add('detail-open');

  if (syncUrl) {
    const currentInUrl = getDeviceIdFromUrl();
    if (currentInUrl !== device.id) {
      setDeviceIdInUrl(device.id, { replace: replaceHistory });
    }
  }

  deviceDetailCloseBtn.focus();
}

function closeDeviceDetail({ syncUrl = true, replaceHistory = false } = {}) {
  activeDeviceId = null;
  deviceDetailOverlay.hidden = true;
  document.body.classList.remove('detail-open');

  if (syncUrl && getDeviceIdFromUrl() != null) {
    setDeviceIdInUrl(null, { replace: replaceHistory });
  }
}

function syncDeviceDetailFromUrl() {
  const targetId = getDeviceIdFromUrl();

  if (!targetId) {
    if (!deviceDetailOverlay.hidden) {
      closeDeviceDetail({ syncUrl: false });
    }
    return;
  }

  const targetDevice = findDeviceById(targetId);
  if (!targetDevice) {
    setDeviceIdInUrl(null, { replace: true });
    if (!deviceDetailOverlay.hidden) {
      closeDeviceDetail({ syncUrl: false });
    }
    return;
  }

  if (activeDeviceId === targetId && !deviceDetailOverlay.hidden) {
    return;
  }

  openDeviceDetail(targetId, { syncUrl: false });
}

// ── Comparison basket ───────────────────────────────────────────────────────

function sanitizeCompareIds(ids) {
  const seen = new Set();
  const result = [];

  (Array.isArray(ids) ? ids : []).forEach(rawId => {
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!id || seen.has(id)) return;
    if (DEVICES.length && !findDeviceById(id)) return;
    seen.add(id);
    if (result.length < COMPARE_MAX) result.push(id);
  });

  return result;
}

function getCompareIdsFromUrl() {
  const raw = new URLSearchParams(window.location.search).get(COMPARE_QUERY_PARAM);
  return raw ? raw.split(',') : null;
}

function setCompareIdsInUrl(ids, { replace = true } = {}) {
  const url = new URL(window.location.href);
  const current = url.searchParams.get(COMPARE_QUERY_PARAM);
  const next = ids.length ? ids.join(',') : null;
  if (current === next) return;

  if (next) {
    url.searchParams.set(COMPARE_QUERY_PARAM, next);
  } else {
    url.searchParams.delete(COMPARE_QUERY_PARAM);
  }

  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function loadCompareSelection() {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    return raw ? sanitizeCompareIds(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveCompareSelection() {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareSelection));
  } catch {
    // Ignore storage failures.
  }
}

function loadCompareDiffOnly() {
  try {
    return localStorage.getItem(COMPARE_DIFF_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveCompareDiffOnly() {
  try {
    localStorage.setItem(COMPARE_DIFF_STORAGE_KEY, String(compareDiffOnly));
  } catch {
    // Ignore storage failures.
  }
}

function isInCompare(deviceId) {
  return compareSelection.includes(deviceId);
}

function getCompareDevices() {
  return compareSelection.map(findDeviceById).filter(Boolean);
}

function setCompareSelection(ids, { syncUrl = true } = {}) {
  compareSelection = sanitizeCompareIds(ids);
  saveCompareSelection();
  if (syncUrl) setCompareIdsInUrl(compareSelection);
  renderCompareUi();
}

function toggleCompare(deviceId) {
  if (!findDeviceById(deviceId)) return;

  if (isInCompare(deviceId)) {
    setCompareSelection(compareSelection.filter(id => id !== deviceId));
    return;
  }

  if (compareSelection.length >= COMPARE_MAX) {
    syncCompareControls();
    return;
  }
  setCompareSelection([...compareSelection, deviceId]);
}

function syncCompareFromUrl() {
  const fromUrl = getCompareIdsFromUrl();
  if (!fromUrl) {
    renderCompareUi();
    return;
  }

  compareSelection = sanitizeCompareIds(fromUrl);
  saveCompareSelection();
  setCompareIdsInUrl(compareSelection);
  renderCompareUi();
}

function isMetricLowerBetter(metricId) {
  if (BENCH_LOWER.includes(metricId)) return true;
  // `watts` is scored via the table column config rather than BENCH_LOWER.
  return getColumnById(metricId)?.lowerBetter === true;
}

function compareMetricRow(metricId, devices) {
  const values = devices.map(device => device[metricId] ?? null);
  const present = values.filter(value => typeof value === 'number' && Number.isFinite(value));
  if (!present.length) return null;

  const lowerBetter = isMetricLowerBetter(metricId);
  const best = lowerBetter ? Math.min(...present) : Math.max(...present);
  const bestLabel = formatDetailMetricValue(metricId, best);
  const labels = values.map(value => formatDetailMetricValue(metricId, value));
  // Values that render identically must not be flagged as a winner over each other.
  const identical = labels.every(label => label === labels[0]);

  return { metricId, values, labels, bestLabel, identical };
}

function renderCompareGroup(group, devices) {
  const rows = group.items
    .map(metricId => compareMetricRow(metricId, devices))
    .filter(Boolean)
    .filter(row => !compareDiffOnly || !row.identical);

  if (!rows.length) return '';

  const label = metricId => DETAIL_METRICS[metricId]?.label ?? metricId;
  const bodyHtml = rows.map(row => {
    const cells = row.labels.map(formatted => {
      if (formatted == null) return '<td class="compare-cell na">—</td>';
      const isBest = !row.identical && formatted === row.bestLabel;
      const classAttr = isBest ? ' class="compare-cell is-best"' : ' class="compare-cell"';
      const badge = isBest ? '<span class="compare-best-badge" title="Best of the selected devices">best</span>' : '';
      return `<td${classAttr}>${escapeHtml(formatted)}${badge}</td>`;
    }).join('');
    const arrow = isMetricLowerBetter(row.metricId) ? ' <span class="compare-metric-hint">↓</span>' : '';
    return `<tr><th scope="row" class="compare-metric">${escapeHtml(label(row.metricId))}${arrow}</th>${cells}</tr>`;
  }).join('');

  return `<tbody class="compare-group">
    <tr class="compare-group-head"><th scope="colgroup" colspan="${devices.length + 1}">${escapeHtml(group.title)}</th></tr>
    ${bodyHtml}
  </tbody>`;
}

function renderCompareDeviceHead(device) {
  const photo = device.photo
    ? `<img class="compare-head-photo" src="${escapeHtml(device.photo)}" alt="" loading="lazy" decoding="async">`
    : '<span class="compare-head-photo is-empty" aria-hidden="true"></span>';

  return `<th scope="col" class="compare-head-cell">
    <div class="compare-head-card">
      ${photo}
      <button type="button" class="compare-head-name" data-compare-detail="${escapeHtml(device.id)}">${escapeHtml(device.name)}</button>
      <button type="button" class="compare-head-remove" data-compare-remove="${escapeHtml(device.id)}" aria-label="Remove ${escapeHtml(device.name)} from comparison">Remove</button>
    </div>
  </th>`;
}

function renderCompareMessage(title, message) {
  compareBox.innerHTML = `<div class="compare-empty">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  </div>`;
}

function renderCompareView() {
  const devices = getCompareDevices();

  if (!devices.length) {
    renderCompareMessage('Nothing to compare yet', `Pick up to ${COMPARE_MAX} mini PCs with the ⇄ checkbox in the Table view, then come back here.`);
    return;
  }

  if (devices.length === 1) {
    renderCompareMessage('Add one more mini PC', `“${devices[0].name}” is in your basket. Select at least one more device to see a side-by-side comparison.`);
    return;
  }

  const groups = DETAIL_METRIC_GROUPS
    .filter(group => group.type !== 'links' && Array.isArray(group.items))
    .map(group => renderCompareGroup(group, devices))
    .filter(Boolean)
    .join('');

  if (!groups) {
    renderCompareMessage('No differences to show', 'The selected mini PCs have identical values for every recorded metric. Turn off “Differences only” to see the full comparison.');
    return;
  }

  compareBox.innerHTML = `<div class="compare-table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th scope="col" class="compare-corner">Metric</th>
          ${devices.map(renderCompareDeviceHead).join('')}
        </tr>
      </thead>
      ${groups}
    </table>
  </div>`;

  compareBox.querySelectorAll('[data-compare-remove]').forEach(button => {
    button.addEventListener('click', () => toggleCompare(button.dataset.compareRemove));
  });

  compareBox.querySelectorAll('[data-compare-detail]').forEach(button => {
    button.addEventListener('click', () => openDeviceDetail(button.dataset.compareDetail));
  });
}

function renderCompareTray() {
  const devices = getCompareDevices();
  compareTrayEl.hidden = devices.length === 0;
  document.body.classList.toggle('has-compare-tray', devices.length > 0);

  compareTrayItemsEl.innerHTML = devices.map(device => `
    <span class="compare-chip">
      <span class="compare-chip-name">${escapeHtml(device.name)}</span>
      <button type="button" class="compare-chip-remove" data-compare-remove="${escapeHtml(device.id)}" aria-label="Remove ${escapeHtml(device.name)} from comparison">×</button>
    </span>`).join('');

  compareTrayItemsEl.querySelectorAll('[data-compare-remove]').forEach(button => {
    button.addEventListener('click', () => toggleCompare(button.dataset.compareRemove));
  });
}

function syncCompareControls() {
  const count = getCompareDevices().length;

  compareTabCountEl.hidden = count === 0;
  compareTabCountEl.textContent = String(count);

  compareSubtitleEl.textContent = count
    ? `${count} of ${COMPARE_MAX} selected · best value in each row is highlighted`
    : `Select up to ${COMPARE_MAX} mini PCs to compare them side by side.`;

  document.querySelectorAll('.compare-checkbox').forEach(input => {
    const selected = isInCompare(input.dataset.deviceId);
    input.checked = selected;
    input.disabled = !selected && count >= COMPARE_MAX;
  });

  syncCompareDetailButton();
}

function syncCompareDetailButton() {
  const button = deviceDetailBody.querySelector('.detail-compare-toggle');
  if (!button || !activeDeviceId) return;

  const selected = isInCompare(activeDeviceId);
  const full = !selected && compareSelection.length >= COMPARE_MAX;
  button.classList.toggle('is-active', selected);
  button.disabled = full;
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = selected
    ? 'Remove from comparison'
    : full
      ? `Comparison full (${COMPARE_MAX})`
      : 'Add to comparison';
}

function renderCompareUi() {
  renderCompareTray();
  syncCompareControls();
  renderCompareView();
}

function showView(viewName) {
  activeView = viewName;
  cancelAnimationFrame(filterRenderFrame);
  filterRenderFrame = null;
  document.querySelectorAll('.tab-btn[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${viewName}-view`);
  });
  document.getElementById('table-summary').hidden = viewName !== 'table';
  const hideFilters = viewName === 'compare' || viewName === 'recommendations';
  filterToolbarEl.hidden = hideFilters;
  filterSidebarEl.hidden = hideFilters || filterPanelEl.hidden;
  filterToggleBtn.hidden = hideFilters;
  benchmarkLayoutEl.classList.toggle('comparison-layout', hideFilters);
  columnToggleBtn.hidden = viewName !== 'table';
  setColumnMenuOpen(false);
  if (viewName === 'table') renderTable();
  if (viewName === 'charts') renderChart();
  if (viewName === 'compare') renderCompareView();
  if (viewName === 'recommendations' && !recommendationsRequested) loadRecommendations();
}

async function loadRecommendations() {
  recommendationsRequested = true;
  recommendationsBox.innerHTML = '<p role="status">Loading recommendations…</p>';
  try {
    const response = await fetch(RECOMMENDATIONS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!/^PL[\w-]+$/.test(data.playlistId) || !Array.isArray(data.videos) || !data.videos.every(video =>
      typeof video.id === 'string' && /^[\w-]{11}$/.test(video.id) && typeof video.title === 'string' && video.title.trim() &&
      Number.isInteger(video.year) && video.year >= 2000 && video.year <= 9999 &&
      /^\d{4}-\d{2}-\d{2}$/.test(video.publishedAt) && !Number.isNaN(Date.parse(video.publishedAt)) &&
      (video.startSeconds == null || (Number.isSafeInteger(video.startSeconds) && video.startSeconds >= 0))
    ) || new Set(data.videos.map(video => video.id)).size !== data.videos.length) {
      throw new Error('Invalid recommendations data');
    }
    document.getElementById('recommendations-playlist').href = `https://www.youtube.com/playlist?list=${data.playlistId}`;
    const externalIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>';
    const years = [...new Set(data.videos.map(video => video.year))].sort((a, b) => b - a);
    recommendationsBox.innerHTML = years.map(year => {
      const videos = data.videos.filter(video => video.year === year).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      return `<section class="recommendations-year" aria-labelledby="recommendations-${year}">
        <div class="recommendations-year-head"><h3 id="recommendations-${year}">${year}</h3><span>${videos.length} ${videos.length === 1 ? 'video' : 'videos'}</span></div>
        <ul class="recommendations-list">${videos.map(video => `
          <li><a class="recommendation-card" href="https://www.youtube.com/watch?v=${video.id}${video.startSeconds ? `&amp;t=${video.startSeconds}s` : ''}" target="_blank" rel="noopener noreferrer">
            <div class="recommendation-thumbnail">
              <img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
              <span class="recommendation-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 11 7-11 7z"/></svg></span>
            </div>
            <div class="recommendation-copy"><p class="recommendation-source">ROBTECH</p><h4>${escapeHtml(video.title)}</h4><span class="recommendation-watch">Watch on YouTube ${externalIcon}</span></div>
          </a></li>`).join('')}</ul>
      </section>`;
    }).join('') || '<p>No recommendation videos available yet.</p>';
  } catch (error) {
    console.error(error);
    recommendationsRequested = false;
    recommendationsBox.innerHTML = '<p role="alert">Unable to load recommendations. Reopen this tab to try again.</p>';
  }
}

function getColumnById(id) {
  return TABLE_COLUMNS.find(column => column.id === id);
}


function getOptionalColumns() {
  return TABLE_COLUMNS.filter(column => !column.alwaysVisible);
}

function getVisibleColumns() {
  return TABLE_COLUMNS.filter(column => column.alwaysVisible || visibleColumns.has(column.id));
}

function defaultVisibleColumnSet() {
  const allowedIds = new Set(getOptionalColumns().map(column => column.id));
  return new Set(DEFAULT_VISIBLE_COLUMNS.filter(id => allowedIds.has(id)));
}

function loadVisibleColumns() {
  const fallback = defaultVisibleColumnSet();
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const allowedIds = new Set(getOptionalColumns().map(column => column.id));
    const sanitized = parsed.filter(id => allowedIds.has(id));
    return sanitized.length ? new Set(sanitized) : fallback;
  } catch {
    return fallback;
  }
}

function saveVisibleColumns() {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify([...visibleColumns]));
  } catch {
    // Ignore storage failures.
  }
}

function setColumnMenuOpen(isOpen) {
  columnMenuEl.hidden = !isOpen;
  columnToggleBtn.setAttribute('aria-expanded', String(isOpen));
}

function updateSiteMeta() {
  siteMetaEl.innerHTML = `${DEVICES.length} devices &nbsp;·&nbsp; ${META_SUFFIX}`;
}

function renderTableMessage(message) {
  benchmarkTable.innerHTML = `<tbody><tr><td class="table-message">${escapeHtml(message)}</td></tr></tbody>`;
}

function renderLoadingInfoCards() {
  const cards = ['blue', 'green', 'amber', 'green', 'green', 'blue'];
  infoGridCaptionEl.innerHTML = '<span class="loading-skeleton loading-skeleton-caption" aria-hidden="true"></span>';
  infoGridCaptionEl.hidden = false;
  infoGrid.setAttribute('aria-busy', 'true');
  infoGrid.setAttribute('aria-label', 'Loading top benchmark values');
  infoGrid.innerHTML = cards.map(cls => `
    <div class="info-card ${cls} loading-info-card">
      <span class="loading-skeleton loading-skeleton-label"></span>
      <span class="loading-skeleton loading-skeleton-info-value"></span>
      <span class="loading-skeleton loading-skeleton-device"></span>
    </div>`).join('');
}

function renderLoadingTable() {
  const visible = getVisibleColumns();
  const cells = visible.map(column => `<td><span class="loading-skeleton loading-skeleton-${column.id === 'name' ? 'name' : 'value'}"></span></td>`).join('');
  const rows = Array.from({ length: 8 }, (_, index) => `
    <tr>
      <td><span class="loading-skeleton loading-skeleton-rank"></span></td>
      ${cells}
    </tr>`).join('');

  benchmarkTable.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        ${visible.map(column => `<th>${escapeHtml(column.pickerLabel)}</th>`).join('')}
      </tr>
    </thead>
    <tbody aria-busy="true" aria-label="Loading benchmark data">
      ${rows}
    </tbody>`;
}

function applyDeviceLinks(linksByDeviceId) {
  const lookup = linksByDeviceId && typeof linksByDeviceId === 'object' ? linksByDeviceId : {};

  DEVICES = DEVICES.map(device => ({
    ...device,
    links: normalizeDeviceLinks(lookup[device.id])
  }));

  linksLoaded = true;

  if (!deviceDetailOverlay.hidden && activeDeviceId) {
    const activeDevice = findDeviceById(activeDeviceId);
    if (activeDevice) {
      renderDeviceDetail(activeDevice);
    }
  }

  renderTable();
}

function renderInfoCards() {
  infoGrid.removeAttribute('aria-busy');
  infoGrid.removeAttribute('aria-label');

  if (!DEVICES.length) {
    infoGrid.innerHTML = '';
    return;
  }

  const sortHigher = (key) => [...DEVICES].filter(device => device[key] != null).sort((a, b) => b[key] - a[key]);
  const sortLower = (key) => [...DEVICES].filter(device => device[key] != null).sort((a, b) => a[key] - b[key]);

  const byScore = sortHigher('composite');
  const byEff = sortHigher('efficiency');
  const byGpu = sortHigher('firestrike');
  const byQuiet = sortLower('noise_load');
  const byIdle = sortLower('power_idle_watts');
  const byWatts = sortLower('watts');

  const hasCoreMetrics = byScore.length && byEff.length && byGpu.length;
  const hasPowerMetrics = byQuiet.length && byIdle.length && byWatts.length;
  if (!hasCoreMetrics || !hasPowerMetrics) {
    infoGridCaptionEl.hidden = true;
    infoGrid.innerHTML = '';
    return;
  }

  const cards = [
    { label: 'Best Overall Score', value: fmtD(byScore[0].composite), device: byScore[0].name, cls: 'blue' },
    { label: 'Best Efficiency (Score/W)', value: fmtD(byEff[0].efficiency), device: byEff[0].name, cls: 'green' },
    { label: 'Best GPU (FireStrike)', value: fmt(byGpu[0].firestrike), device: byGpu[0].name, cls: 'amber' },
    { label: 'Quietest under Load', value: `${fmt(byQuiet[0].noise_load)} dB`, device: byQuiet[0].name, cls: 'green' },
    { label: 'Lowest Idle Power', value: `${fmt(byIdle[0].power_idle_watts)}W`, device: byIdle[0].name, cls: 'green' },
    { label: 'Lowest Max Power Draw', value: `${fmt(byWatts[0].watts)}W`, device: byWatts[0].name, cls: 'blue' }
  ];

  infoGridCaptionEl.textContent = `Best across all ${DEVICES.length} devices`;
  infoGridCaptionEl.hidden = false;
  infoGrid.innerHTML = cards.map(card => `
    <div class="info-card ${card.cls}">
      <div class="info-label">${card.label}</div>
      <div class="info-value ${card.cls}">${card.value}</div>
      <div class="info-device" title="${escapeHtml(card.device)}">${escapeHtml(card.device)}</div>
    </div>`).join('');
}

function loadFavorites() {
  try {
    const ids = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && findDeviceById(id)) : []);
  } catch {
    return new Set();
  }
}

function renderFavoriteButton(device, withLabel = false) {
  const selected = favorites.has(device.id);
  const action = selected ? 'Remove from shortlist' : 'Add to shortlist';
  return `<button type="button" class="favorite-toggle${withLabel ? ' favorite-toggle-detail' : ''}" data-device-id="${escapeHtml(device.id)}" aria-pressed="${selected}" aria-label="${action}: ${escapeHtml(device.name)}" title="${action}"${withLabel ? ' data-with-label="true"' : ''}><span aria-hidden="true">${selected ? '★' : '☆'}</span>${withLabel ? `<span class="favorite-action">${action}</span>` : ''}</button>`;
}

function syncFavoriteControls() {
  shortlistToggle.setAttribute('aria-pressed', String(shortlistOnly));
  document.getElementById('shortlist-count').textContent = String(favorites.size);
  document.querySelectorAll('.favorite-toggle').forEach(button => {
    const selected = favorites.has(button.dataset.deviceId);
    const action = selected ? 'Remove from shortlist' : 'Add to shortlist';
    const device = findDeviceById(button.dataset.deviceId);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${action}: ${device.name}`);
    button.title = action;
    button.firstElementChild.textContent = selected ? '★' : '☆';
    if (button.dataset.withLabel) button.querySelector('.favorite-action').textContent = action;
  });
}

function toggleFavorite(deviceId) {
  if (!findDeviceById(deviceId)) return;
  if (favorites.has(deviceId)) favorites.delete(deviceId);
  else favorites.add(deviceId);
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // Keep favorites usable for this visit when browser storage is unavailable.
  }
  syncFavoriteControls();
  if (shortlistOnly) scheduleFilterResults();
}

function getEmptyResultsMessage() {
  if (shortlistOnly && !favorites.size) return 'No favorites yet. Turn off My Shortlist and star devices to save them here.';
  return 'No matching devices.';
}

function getFiltered() {
  return DEVICES.filter(device => (!shortlistOnly || favorites.has(device.id)) && deviceMatchesFilters(device, filterState));
}

function isAnyFilterActive() {
  return filterState.q.trim().length > 0 || Object.keys(filterState.ranges).length > 0;
}

function formatDeviceCountLabel(shownCount) {
  if (shortlistOnly) return `Showing ${shownCount} of ${favorites.size} shortlisted devices`;
  return isAnyFilterActive()
    ? `Showing ${shownCount} of ${DEVICES.length} devices`
    : `${shownCount} devices`;
}

function loadFilterPanelPreference() {
  try {
    const saved = localStorage.getItem(FILTER_PANEL_STORAGE_KEY);
    return saved === 'true' ? true : saved === 'false' ? false : null;
  } catch {
    return null;
  }
}

function saveFilterPanelPreference(isOpen) {
  filterPanelPreference = isOpen;
  try {
    localStorage.setItem(FILTER_PANEL_STORAGE_KEY, String(isOpen));
  } catch {
    // Ignore storage failures.
  }
}

function setFilterPanelOpen(isOpen, { restoreFocus = false, focus = true, save = false } = {}) {
  const wasOpen = !filterPanelEl.hidden;
  filterPanelEl.hidden = !isOpen;
  filterSidebarEl.hidden = !isOpen || benchmarkLayoutEl.classList.contains('comparison-layout');
  benchmarkLayoutEl.classList.toggle('filters-collapsed', !isOpen);
  filterToggleBtn.setAttribute('aria-expanded', String(isOpen));
  document.getElementById('filter-toggle-label').textContent = isOpen ? 'Hide filters' : 'Show filters';
  if (isOpen && focus) filterPanelEl.querySelector('details[open] input')?.focus({ preventScroll: true });
  else if (restoreFocus && wasOpen) filterToggleBtn.focus({ preventScroll: true });
  if (save) saveFilterPanelPreference(isOpen);
  requestAnimationFrame(syncFloatingTableHeader);
}

function onFilterStateChanged() {
  renderFilterChips();
  scheduleFilterResults();
  scheduleFilterUrlWrite();
}

function scheduleFilterResults() {
  if (filterRenderFrame != null) return;
  filterRenderFrame = requestAnimationFrame(() => {
    filterRenderFrame = null;
    countEl.textContent = formatDeviceCountLabel(getFiltered().length);
    if (document.getElementById('table-view').classList.contains('active')) {
      renderTable({ reuseRows: true });
    } else if (document.getElementById('charts-view').classList.contains('active')) {
      renderChart();
    }
  });
}

function syncFilterControlValue(fieldId, { syncNumber = true } = {}) {
  const def = FILTER_DEFS.find(item => item.id === fieldId);
  const bounds = FILTER_BOUNDS[fieldId];
  const active = filterState.ranges[fieldId];
  const value = active ?? (def.mode === 'min' ? bounds?.min : bounds?.max) ?? 0;
  const range = document.getElementById(`filter-${fieldId}-range`);
  const number = document.getElementById(`filter-${fieldId}-value`);
  if (range) range.value = value;
  if (number && syncNumber) number.value = active ?? '';
  const row = filterPanelEl.querySelector(`[data-filter-row="${fieldId}"]`);
  if (row) row.dataset.active = String(active != null);

  const clearBtn = filterPanelEl.querySelector(`.filter-row-clear[data-filter="${fieldId}"]`);
  if (clearBtn) clearBtn.hidden = active == null;
}

function setFilterRange(fieldId, value, options) {
  const changed = filterState.ranges[fieldId] !== value;
  filterState.ranges[fieldId] = value;
  syncFilterControlValue(fieldId, options);
  if (changed) onFilterStateChanged();
}

function clearFilterRange(fieldId) {
  const changed = filterState.ranges[fieldId] != null;
  delete filterState.ranges[fieldId];
  syncFilterControlValue(fieldId);
  if (changed) onFilterStateChanged();
}

function clearAllFilters() {
  filterState.q = '';
  searchInputEl.value = '';
  filterState.ranges = {};
  filterState.includeUnknown = false;
  FILTER_DEFS.forEach(def => syncFilterControlValue(def.id));
  const unknownCheckbox = document.getElementById('filter-include-unknown');
  if (unknownCheckbox) unknownCheckbox.checked = false;
  updateFilterClearVisibility();
  onFilterStateChanged();
}

function updateFilterClearVisibility() {
  const clearBtn = document.getElementById('filter-clear');
  if (!clearBtn) return;
  clearBtn.hidden = !isAnyFilterActive() && !filterState.includeUnknown;
}

function renderFilterChips() {
  const active = FILTER_DEFS.filter(def => filterState.ranges[def.id] != null);
  updateFilterClearVisibility();

  if (!active.length && !filterState.includeUnknown) {
    filterChipsEl.innerHTML = '';
    filterChipsEl.hidden = true;
    return;
  }

  filterChipsEl.hidden = false;
  filterChipsEl.innerHTML = active.map(def => {
    const value = filterState.ranges[def.id];
    const symbol = def.mode === 'max' ? '\u2264' : '\u2265';
    return `<span class="filter-chip" data-filter="${def.id}">
      ${escapeHtml(def.label)}: ${symbol} ${fmt(value)}${def.unit}
      <button type="button" class="filter-chip-remove" data-filter="${def.id}" aria-label="Remove ${escapeHtml(def.label)} filter">&times;</button>
    </span>`;
  }).join('') + (filterState.includeUnknown ? `
    <span class="filter-chip" data-filter="unknown">
      Including missing data
      <button type="button" class="filter-chip-remove" data-filter="unknown" aria-label="Exclude devices with missing data">&times;</button>
    </span>` : '');

  filterChipsEl.querySelectorAll('.filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.filter !== 'unknown') {
        clearFilterRange(btn.dataset.filter);
        return;
      }
      filterState.includeUnknown = false;
      document.getElementById('filter-include-unknown').checked = false;
      onFilterStateChanged();
    });
  });
}

function renderFilterPanel() {
  const openGroups = new Set(Array.from(filterPanelEl.querySelectorAll('details[open]'), section => section.dataset.filterGroup));
  const firstRender = !filterPanelEl.childElementCount;
  const rows = new Map(FILTER_DEFS.map(def => {
    const bounds = FILTER_BOUNDS[def.id] ?? { min: 0, max: 0, present: 0 };
    const active = filterState.ranges[def.id];
    const value = active ?? (def.mode === 'min' ? bounds.min : bounds.max);
    return [def.id, `
      <div class="filter-row" data-filter-row="${def.id}" data-active="${active != null}">
        <label class="filter-label" for="filter-${def.id}-value">${escapeHtml(def.label)}</label>
        <p id="filter-${def.id}-coverage" class="filter-coverage">Data for ${bounds.present} of ${DEVICES.length} devices (${DEVICES.length ? Math.round(bounds.present / DEVICES.length * 100) : 0}%)</p>
        <div class="filter-controls">
          <input type="range" id="filter-${def.id}-range" aria-label="${escapeHtml(def.label)} (${escapeHtml(def.unit)})" aria-describedby="filter-${def.id}-coverage" min="${bounds.min}" max="${bounds.max}" step="any" value="${value}">
          <input type="number" id="filter-${def.id}-value" aria-label="${escapeHtml(def.label)} (${escapeHtml(def.unit)})" aria-describedby="filter-${def.id}-coverage" min="${bounds.min}" max="${bounds.max}" step="any" placeholder="Any" value="${active ?? ''}">
          <span class="filter-unit">${escapeHtml(def.unit)}</span>
          <button type="button" class="filter-row-clear" data-filter="${def.id}" aria-label="Clear ${escapeHtml(def.label)} filter" ${active == null ? 'hidden' : ''}>&times;</button>
        </div>
      </div>`];
  }));

  filterPanelEl.innerHTML = `
    ${FILTER_GROUPS.map(group => `
      <details class="filter-section" data-filter-group="${group.id}" ${firstRender || openGroups.has(group.id) || FILTER_DEFS.some(def => def.group === group.id && filterState.ranges[def.id] != null) ? 'open' : ''}>
        <summary>${escapeHtml(group.label)}</summary>
        <div class="filter-section-body">${FILTER_DEFS.filter(def => def.group === group.id).map(def => rows.get(def.id)).join('')}</div>
      </details>`).join('')}
    <div class="filter-row filter-row-unknown">
      <label class="filter-checkbox-label">
        <input type="checkbox" id="filter-include-unknown" ${filterState.includeUnknown ? 'checked' : ''}>
        <span>Include devices with missing data</span>
      </label>
    </div>
    <div class="filter-actions">
      <button type="button" id="filter-clear" class="filter-clear" hidden>Clear all filters</button>
    </div>`;

  FILTER_DEFS.forEach(def => {
    const range = document.getElementById(`filter-${def.id}-range`);
    const number = document.getElementById(`filter-${def.id}-value`);
    const clearBtn = filterPanelEl.querySelector(`.filter-row-clear[data-filter="${def.id}"]`);

    const applyValue = raw => {
      const fieldBounds = FILTER_BOUNDS[def.id];
      if (!fieldBounds) return;
      const num = clamp(Number(raw), fieldBounds.min, fieldBounds.max);
      if (!Number.isFinite(num)) return;
      setFilterRange(def.id, num);
    };

    // Let the slider represent exact typed limits; snap pointer input to useful
    // increments from zero rather than increments from the dataset minimum.
    range?.addEventListener('input', event => {
      const stepped = Math.round(Number(event.target.value) / def.step) * def.step;
      applyValue(Number(stepped.toFixed(10)));
    });
    range?.addEventListener('keydown', event => {
      const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
      if (!direction) return;
      event.preventDefault();
      applyValue(Number((Number(range.value) + direction * def.step).toFixed(10)));
    });
    number?.addEventListener('input', event => {
      const raw = event.target.value;
      const num = Number(raw);
      const bounds = FILTER_BOUNDS[def.id];
      if (!raw || !Number.isFinite(num) || num < bounds.min || num > bounds.max) return;
      setFilterRange(def.id, num, { syncNumber: false });
    });
    number?.addEventListener('blur', event => {
      if (event.target.value) applyValue(event.target.value);
      else clearFilterRange(def.id);
    });
    number?.addEventListener('keydown', event => {
      if (event.key === 'Enter') event.target.blur();
    });
    clearBtn?.addEventListener('click', () => clearFilterRange(def.id));
  });

  document.getElementById('filter-include-unknown')?.addEventListener('change', event => {
    filterState.includeUnknown = event.target.checked;
    updateFilterClearVisibility();
    onFilterStateChanged();
  });

  document.getElementById('filter-clear')?.addEventListener('click', () => {
    clearAllFilters();
  });

  updateFilterClearVisibility();
}

function ensureValidSortColumn() {
  const available = getVisibleColumns().filter(column => !column.notSortable);
  if (available.some(column => column.id === sortCol)) return;
  const fallback = available.find(column => column.id !== 'name') || available[0];
  sortCol = fallback?.id ?? 'name';
  sortDir = fallback?.sortDefaultDir ?? 1;
}

function getSorted(devices) {
  return [...devices].sort((a, b) => {
    if (sortCol === 'name') return sortDir * a.name.localeCompare(b.name);
    const av = a[sortCol];
    const bv = b[sortCol];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir * (av - bv);
  });
}

function sortIndicatorFor(column) {
  if (column.id !== sortCol) return '';
  if (sortDir === -1) return column.lowerBetter ? '↑ worst' : '↓';
  return column.lowerBetter ? '↓ best' : '↑';
}

function cellBar(pct, cls = '') {
  return `<div class="cell-bar${cls}" style="width:${Math.min(pct, 100).toFixed(1)}%"></div>`;
}

function renderBenchCell(column, value) {
  if (value == null) return '<td class="na">—</td>';
  const isLower = BENCH_LOWER.includes(column.id);
  const pct = isLower
    ? (MIN_L[column.id] / value) * 100
    : MAX_H[column.id] ? (value / MAX_H[column.id]) * 100 : 0;
  const suffix = column.id === 'h264'
    ? 's'
    : column.id === 'av1' || column.id === 'av1_hw'
      ? 's'
    : column.id === 'power_idle_watts'
      ? 'W'
      : column.id === 'cpu_temp' || column.id === 'ssd_temp'
        ? 'C'
        : column.id === 'volume'
          ? 'L'
      : column.id.startsWith('noise_')
        ? 'dB'
        : '';
  const classAttr = column.cellClass ? ` class="${column.cellClass}"` : '';
  return `<td${classAttr}>${cellBar(pct, isLower ? ' amber' : '')}${fmt(value)}${suffix}</td>`;
}

function renderTableCell(column, device, metrics) {
  if (column.id === 'compare') {
    const selected = isInCompare(device.id);
    const disabled = !selected && compareSelection.length >= COMPARE_MAX ? ' disabled' : '';
    return `<td class="col-compare"><input type="checkbox" class="compare-checkbox" data-device-id="${escapeHtml(device.id)}" aria-label="Compare ${escapeHtml(device.name)}"${selected ? ' checked' : ''}${disabled}></td>`;
  }

  if (BENCH_HIGHER.includes(column.id) || BENCH_LOWER.includes(column.id)) {
    return renderBenchCell(column, device[column.id]);
  }

  if (column.id === 'name') {
    const linkCount = device.links.length
      ? `<span class="device-name-meta">${device.links.length} link${device.links.length === 1 ? '' : 's'}</span>`
      : '<span class="device-name-meta">details</span>';
    return `<td class="col-name"><div class="device-name-actions">${renderFavoriteButton(device)}<button type="button" class="device-name-trigger" data-device-id="${escapeHtml(device.id)}"><span>${escapeHtml(device.name)}</span>${linkCount}</button></div></td>`;
  }

  if (column.id === 'watts') {
    return `<td class="watts-cell">${fmt(device.watts)}W</td>`;
  }

  if (column.id === 'composite') {
    const pct = metrics.maxComposite ? (device.composite / metrics.maxComposite) * 100 : 0;
    return `<td class="score">${cellBar(pct)}${fmtD(device.composite)}</td>`;
  }

  if (column.id === 'efficiency') {
    const pct = metrics.maxEfficiency ? (device.efficiency / metrics.maxEfficiency) * 100 : 0;
    return `<td class="eff">${cellBar(pct, ' g')}${fmtD(device.efficiency)}</td>`;
  }

  if (column.id === 'composite_perf') {
    const pct = metrics.maxCompositePerf ? (device.composite_perf / metrics.maxCompositePerf) * 100 : 0;
    return `<td class="score">${cellBar(pct)}${fmtD(device.composite_perf)}</td>`;
  }

  if (column.id === 'efficiency_perf') {
    const pct = metrics.maxEfficiencyPerf ? (device.efficiency_perf / metrics.maxEfficiencyPerf) * 100 : 0;
    return `<td class="eff">${cellBar(pct, ' g')}${fmtD(device.efficiency_perf)}</td>`;
  }

  const classAttr = column.cellClass ? ` class="${column.cellClass}"` : '';
  return `<td${classAttr}>${fmt(device[column.id])}</td>`;
}

function renderTable({ reuseRows = false } = {}) {
  if (!DEVICES.length) {
    countEl.textContent = '';
    renderTableMessage('No devices available.');
    return;
  }

  ensureValidSortColumn();
  const filtered = getFiltered();
  const devices = getSorted(filtered);
  const visible = getVisibleColumns();
  const metrics = {
    maxComposite: Math.max(...DEVICES.map(device => device.composite), 0),
    maxEfficiency: Math.max(...DEVICES.map(device => device.efficiency), 0),
    maxCompositePerf: Math.max(...DEVICES.map(device => device.composite_perf), 0),
    maxEfficiencyPerf: Math.max(...DEVICES.map(device => device.efficiency_perf), 0)
  };

  countEl.textContent = formatDeviceCountLabel(filtered.length);

  const headerHtml = visible.map(column => {
    const active = column.id === sortCol;
    const classes = [column.headerClass, active ? 'active' : ''].filter(Boolean).join(' ');
    const classAttr = classes ? ` class="${classes}"` : '';
    if (column.notSortable) {
      return `<th${classAttr} title="${escapeHtml(column.title)}">${column.label}</th>`;
    }
    return `<th data-col="${column.id}"${classAttr} title="${escapeHtml(column.title)}">${column.label} <span class="sort-ind">${sortIndicatorFor(column)}</span></th>`;
  }).join('');

  const rankHtml = rank => rank <= 3
    ? `<span class="rank-badge rank-${rank}">${rank}</span>`
    : `<span style="color:var(--muted);font-size:0.72rem">${rank}</span>`;
  const renderRow = (device, index) => {
    const rank = index + 1;
    const cells = visible.map(column => renderTableCell(column, device, metrics)).join('');
    return `<tr data-row-id="${escapeHtml(device.id)}" data-rank="${rank}"><td>${rankHtml(rank)}</td>${cells}</tr>`;
  };

  // Filtering changes membership and ranks, while the retained devices' cells
  // and column headers stay the same. Preserve those nodes and their layout.
  const tbody = benchmarkTable.tBodies[0];
  if (reuseRows && tbody && benchmarkTable.tHead && devices.every(device => tableLayoutDeviceIds.has(device.id))) {
    // Keep established column widths while filtering so removing a row does
    // not require measuring every remaining cell for automatic table layout.
    if (!benchmarkTable.querySelector('colgroup')) {
      const columns = document.createElement('colgroup');
      const width = benchmarkTable.getBoundingClientRect().width;
      benchmarkTable.querySelectorAll('thead th').forEach(header => {
        const column = document.createElement('col');
        column.style.width = `${header.getBoundingClientRect().width}px`;
        columns.append(column);
      });
      benchmarkTable.prepend(columns);
      benchmarkTable.style.minWidth = `${width}px`;
      benchmarkTable.style.tableLayout = 'fixed';
    }
    const rows = new Map(Array.from(tbody.rows, row => [row.dataset.rowId, row]));
    const ids = new Set(devices.map(device => device.id));
    rows.forEach((row, id) => { if (!ids.has(id)) row.remove(); });
    let cursor = tbody.firstElementChild;
    devices.forEach((device, index) => {
      let row = rows.get(device.id);
      if (!row) {
        tbody.insertAdjacentHTML('beforeend', renderRow(device, index));
        row = tbody.lastElementChild;
      }
      const rank = String(index + 1);
      if (row.dataset.rank !== rank) {
        row.cells[0].innerHTML = rankHtml(index + 1);
        row.dataset.rank = rank;
      }
      if (row !== cursor) tbody.insertBefore(row, cursor);
      cursor = row.nextElementSibling;
    });
    if (!devices.length) tbody.innerHTML = `<tr><td class="table-message" colspan="${visible.length + 1}">${escapeHtml(getEmptyResultsMessage())}</td></tr>`;
    requestAnimationFrame(syncFloatingTableHeader);
    return;
  }

  const bodyHtml = devices.map(renderRow).join('');

  benchmarkTable.style.minWidth = '';
  benchmarkTable.style.tableLayout = '';
  tableLayoutDeviceIds = new Set(devices.map(device => device.id));
  benchmarkTable.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        ${headerHtml}
      </tr>
    </thead>
    <tbody>
      ${bodyHtml || `<tr><td class="table-message" colspan="${visible.length + 1}">${escapeHtml(getEmptyResultsMessage())}</td></tr>`}
    </tbody>`;

  renderFloatingTableHeader();
}

function renderColumnPicker() {
  const options = getOptionalColumns();
  columnOptionsEl.innerHTML = options.map(column => `
    <label class="column-option">
      <input type="checkbox" value="${column.id}" ${visibleColumns.has(column.id) ? 'checked' : ''}>
      <span>${escapeHtml(column.pickerLabel)}</span>
    </label>`).join('');

  columnOptionsEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', event => {
      const { value, checked } = event.target;
      if (checked) {
        visibleColumns.add(value);
      } else {
        visibleColumns.delete(value);
      }
      saveVisibleColumns();
      ensureValidSortColumn();
      renderTable();
    });
  });
}

function setLoadingState() {
  siteMetaEl.textContent = 'Loading benchmark data…';
  countEl.textContent = 'Loading data…';
  renderLoadingInfoCards();
  renderLoadingTable();
  renderLoadingChart();
}

function setErrorState(message) {
  siteMetaEl.textContent = 'Unable to load benchmark data';
  countEl.textContent = 'Load failed';
  infoGridCaptionEl.hidden = true;
  infoGrid.innerHTML = '';
  renderTableMessage(message);
  renderChartMessage(message);
}

async function loadData() {
  setLoadingState();
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    ({ DEVICES, MAX_H, MIN_L, FILTER_BOUNDS } = normalizeDevices(data));
    favorites = loadFavorites();
    syncFavoriteControls();
    compareSelection = loadCompareSelection();
    applyFiltersFromUrl();
    updateSiteMeta();
    renderInfoCards();
    renderTable();
    renderChart();
    syncDeviceDetailFromUrl();
    syncCompareFromUrl();
    const requestedView = new URLSearchParams(window.location.search).get('view');
    if (['table', 'charts', 'compare'].includes(requestedView)) showView(requestedView);
    loadLinks();
  } catch (error) {
    console.error(error);
    setErrorState('Could not load devices.json. Serve this folder over HTTP or open the GitHub Pages site instead of using file://.');
  }
}

async function loadLinks() {
  try {
    const response = await fetch(LINKS_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    applyDeviceLinks(data);
  } catch (error) {
    console.error(error);
    linksLoaded = true;

    if (!deviceDetailOverlay.hidden && activeDeviceId) {
      const activeDevice = findDeviceById(activeDeviceId);
      if (activeDevice) {
        renderDeviceDetail(activeDevice);
      }
    }

    renderTable();
  }
}

document.querySelectorAll('.tab-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    showView(btn.dataset.view);
  });
});

document.getElementById('changelog-link').addEventListener('click', event => {
  event.preventDefault();
  window.location.href = `./changelog.html?from=${encodeURIComponent(activeView)}`;
});

document.addEventListener('click', event => {
  const button = event.target.closest('.favorite-toggle');
  if (button) toggleFavorite(button.dataset.deviceId);
});

shortlistToggle.addEventListener('click', () => {
  shortlistOnly = !shortlistOnly;
  syncFavoriteControls();
  scheduleFilterResults();
});

searchInputEl.addEventListener('input', event => {
  filterState.q = event.target.value;
  updateFilterClearVisibility();
  scheduleFilterResults();
  scheduleFilterUrlWrite();
});

benchmarkTable.addEventListener('click', event => {
  const button = event.target.closest('.device-name-trigger');
  if (button) {
    openDeviceDetail(button.dataset.deviceId);
    return;
  }
  const header = event.target.closest('thead th[data-col]');
  if (!header) return;
  const column = getColumnById(header.dataset.col);
  if (!column) return;
  if (column.id === sortCol) sortDir *= -1;
  else {
    sortCol = column.id;
    sortDir = column.sortDefaultDir ?? -1;
  }
  renderTable();
});

benchmarkTable.addEventListener('change', event => {
  if (event.target.matches('.compare-checkbox')) toggleCompare(event.target.dataset.deviceId);
});

document.querySelectorAll('.chart-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    activeChart = btn.dataset.chart;
    document.querySelectorAll('.chart-tab').forEach(item => item.classList.toggle('active', item === btn));
    renderChart();
  });
});

columnToggleBtn.addEventListener('click', () => {
  setColumnMenuOpen(columnMenuEl.hidden);
});

setFilterPanelOpen(filterPanelPreference ?? false, { focus: false });

filterToggleBtn.addEventListener('click', () => {
  setFilterPanelOpen(filterPanelEl.hidden, { save: true });
});
document.getElementById('filter-sidebar-close').addEventListener('click', () => {
  setFilterPanelOpen(false, { restoreFocus: true, save: true });
});

document.getElementById('column-reset').addEventListener('click', () => {
  visibleColumns = defaultVisibleColumnSet();
  saveVisibleColumns();
  renderColumnPicker();
  ensureValidSortColumn();
  renderTable();
});

document.addEventListener('click', event => {
  if (columnMenuEl.hidden) return;
  const withinPicker = columnMenuEl.contains(event.target) || columnToggleBtn.contains(event.target);
  if (!withinPicker) setColumnMenuOpen(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setColumnMenuOpen(false);
    if (filterSidebarEl.contains(document.activeElement) || document.activeElement === filterToggleBtn) {
      setFilterPanelOpen(false, { restoreFocus: true, save: true });
    }
    if (!deviceDetailOverlay.hidden) closeDeviceDetail();
  }
});

deviceDetailCloseBtn.addEventListener('click', () => {
  closeDeviceDetail();
});

deviceDetailOverlay.addEventListener('click', event => {
  if (event.target === deviceDetailOverlay) closeDeviceDetail();
});

new ResizeObserver(() => requestAnimationFrame(syncFloatingTableHeader)).observe(filterToolbarEl);
window.addEventListener('scroll', syncFloatingTableHeader, { passive: true });
window.addEventListener('resize', syncFloatingTableHeader);
tableWrap.addEventListener('scroll', syncFloatingTableHeader, { passive: true });

window.addEventListener('popstate', () => {
  if (!DEVICES.length) return;
  applyFiltersFromUrl();
  ensureValidSortColumn();
  renderTable();
  renderChart();
  syncDeviceDetailFromUrl();
  syncCompareFromUrl();
});

document.getElementById('compare-tray-open').addEventListener('click', () => {
  showView('compare');
  document.getElementById('compare-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('compare-tray-clear').addEventListener('click', () => {
  setCompareSelection([]);
});

document.getElementById('compare-clear').addEventListener('click', () => {
  setCompareSelection([]);
});

compareDiffOnlyEl.addEventListener('change', event => {
  compareDiffOnly = event.target.checked;
  saveCompareDiffOnly();
  renderCompareView();
});

visibleColumns = loadVisibleColumns();
compareDiffOnly = loadCompareDiffOnly();
compareDiffOnlyEl.checked = compareDiffOnly;
renderColumnPicker();
loadData();
