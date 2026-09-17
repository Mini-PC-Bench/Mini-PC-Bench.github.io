const DATA_URL = './devices.json';
const LINKS_URL = './device-links.json';
const DEVICE_QUERY_PARAM = 'device';
const COLUMN_STORAGE_KEY = 'minipc-benchmarks.visible-columns';
const META_SUFFIX = 'Cinebench R23 &nbsp;·&nbsp; Geekbench 6 &nbsp;·&nbsp; 3DMark &nbsp;·&nbsp; H264 &nbsp;·&nbsp; Power draw &nbsp;·&nbsp; Efficiency score';

// Edit this list to define which optional columns are enabled for first-time visitors.
const DEFAULT_VISIBLE_COLUMNS = [
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'firestrike',
  'timespy',
  'h264',
  'watts',
  'power_idle_watts',
  'noise_idle',
  'noise_load',
  'noise_perf',
  'composite',
  'efficiency'
];

const BENCH_HIGHER = [
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'gbai_cpu',
  'gbai_gpu',
  'firestrike',
  'timespy',
  'steelnomad',
  'photoshop',
  'premiere',
  'storage',
  'wireless_audio'
];
const BENCH_LOWER = [
  'h264',
  'av1',
  'av1_hw',
  'coding',
  'noise_idle',
  'noise_load',
  'noise_perf',
  'power_idle_watts',
  'cpu_temp',
  'ssd_temp',
  'volume'
];

const TABLE_COLUMNS = [
  { id: 'name', label: 'Device', pickerLabel: 'Device', title: 'Device name', headerClass: 'col-name', cellClass: 'col-name', alwaysVisible: true, sortDefaultDir: 1 },
  { id: 'cb23s', label: 'CB R23 1T', pickerLabel: 'CB R23 Single', title: 'Cinebench R23 Single Core (higher is better)', sortDefaultDir: -1 },
  { id: 'cb23m', label: 'CB R23 nT', pickerLabel: 'CB R23 Multi', title: 'Cinebench R23 Multi Core (higher is better)', sortDefaultDir: -1 },
  { id: 'gb6s', label: 'GB6 1T', pickerLabel: 'GB6 Single', title: 'Geekbench 6 Single Core (higher is better)', sortDefaultDir: -1 },
  { id: 'gb6m', label: 'GB6 nT', pickerLabel: 'GB6 Multi', title: 'Geekbench 6 Multi Core (higher is better)', sortDefaultDir: -1 },
  { id: 'gbai_cpu', label: 'GB AI CPU', pickerLabel: 'Geekbench AI CPU', title: 'Geekbench AI CPU score (higher is better)', sortDefaultDir: -1 },
  { id: 'gbai_gpu', label: 'GB AI GPU', pickerLabel: 'Geekbench AI GPU', title: 'Geekbench AI GPU score (higher is better)', sortDefaultDir: -1 },
  { id: 'firestrike', label: 'FireStrike', pickerLabel: 'Fire Strike', title: '3DMark Fire Strike - DirectX 11 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  { id: 'timespy', label: 'Time Spy', pickerLabel: 'Time Spy', title: '3DMark Time Spy - DirectX 12 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  { id: 'steelnomad', label: 'Steel Nomad', pickerLabel: 'Steel Nomad', title: '3DMark Steel Nomad score (higher is better)', sortDefaultDir: -1 },
  { id: 'coding', label: 'Coding ↓', pickerLabel: 'Coding', title: 'Coding benchmark score (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'photoshop', label: 'Photoshop', pickerLabel: 'Photoshop', title: 'Photoshop benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'premiere', label: 'Premiere', pickerLabel: 'Premiere', title: 'Premiere benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'storage', label: 'Storage', pickerLabel: 'Storage Benchmark', title: '3DMark Storage Benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'wireless_audio', label: 'BT Audio', pickerLabel: 'Wireless BT Audio', title: 'Wireless Bluetooth audio benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'h264', label: 'H264 (s) ↓', pickerLabel: 'H264', title: 'H264 video encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'av1', label: 'AV1 (s) ↓', pickerLabel: 'AV1 Encode', title: 'AV1 encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'av1_hw', label: 'AV1 HW (s) ↓', pickerLabel: 'AV1 HW Encode', title: 'AV1 hardware encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'watts', label: 'Watts ↓', pickerLabel: 'Max Power Draw', title: 'Maximum power draw from wall under load (lower is better)', lowerBetter: true, cellClass: 'watts-cell', sortDefaultDir: 1 },
  { id: 'power_idle_watts', label: 'Idle W ↓', pickerLabel: 'Idle Power', title: 'Power draw at idle in watts (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'cpu_temp', label: 'CPU C ↓', pickerLabel: 'Max CPU Temp', title: 'Maximum CPU temperature under load in degrees Celsius (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'ssd_temp', label: 'SSD C ↓', pickerLabel: 'SSD Temp', title: 'SSD temperature under load in degrees Celsius (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'volume', label: 'Volume ↓', pickerLabel: 'Volume', title: 'Chassis volume in liters (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_idle', label: 'Idle dB ↓', pickerLabel: 'Idle Noise', title: 'Fan noise at idle in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_load', label: 'Load dB ↓', pickerLabel: 'Load Noise', title: 'Fan noise at load (default profile) in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_perf', label: 'Perf dB ↓', pickerLabel: 'Perf Noise', title: 'Fan noise at load (performance profile) in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'composite', label: 'Score', pickerLabel: 'Composite Score', title: 'Average of all available normalized benchmark scores (0-100 each, relative to dataset max)', cellClass: 'score', sortDefaultDir: -1 },
  { id: 'efficiency', label: 'Eff.', pickerLabel: 'Efficiency', title: 'Score / Watts x 10 - higher means more performance per watt', cellClass: 'eff', sortDefaultDir: -1 }
];

const CHART_META = {
  cb23s: { title: 'Cinebench R23 · Single Core CPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  cb23m: { title: 'Cinebench R23 · Multi Core CPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  gb6s: { title: 'Geekbench 6 · Single Core CPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  gb6m: { title: 'Geekbench 6 · Multi Core CPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  gbai_cpu: { title: 'Geekbench AI · CPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  gbai_gpu: { title: 'Geekbench AI · GPU', desc: 'Higher is better', unit: '', lowerBetter: false },
  firestrike: { title: '3DMark Fire Strike', desc: 'Higher is better · DirectX 11 GPU benchmark', unit: '', lowerBetter: false },
  timespy: { title: '3DMark Time Spy', desc: 'Higher is better · DirectX 12 GPU benchmark', unit: '', lowerBetter: false },
  steelnomad: { title: '3DMark Steel Nomad', desc: 'Higher is better', unit: '', lowerBetter: false },
  coding: { title: 'Coding', desc: 'Lower is better', unit: '', lowerBetter: true },
  photoshop: { title: 'Photoshop', desc: 'Higher is better', unit: '', lowerBetter: false },
  premiere: { title: 'Premiere', desc: 'Higher is better', unit: '', lowerBetter: false },
  storage: { title: '3DMark Storage Benchmark', desc: 'Higher is better', unit: '', lowerBetter: false },
  wireless_audio: { title: 'Wireless Bluetooth Audio', desc: 'Higher is better', unit: '', lowerBetter: false },
  h264: { title: 'H264 Video Encode', desc: 'Lower is better · seconds to encode sample video', unit: 's', lowerBetter: true },
  av1: { title: 'AV1 Encoding', desc: 'Lower is better · seconds to encode sample video', unit: 's', lowerBetter: true },
  av1_hw: { title: 'AV1 Encoding (Hardware)', desc: 'Lower is better · seconds to encode sample video', unit: 's', lowerBetter: true },
  watts: { title: 'Maximum Power Draw from the Wall', desc: 'Lower is better · watts under full CPU load', unit: 'W', lowerBetter: true },
  power_idle_watts: { title: 'Power Draw at Idle', desc: 'Lower is better · watts at desktop idle', unit: 'W', lowerBetter: true },
  cpu_temp: { title: 'Maximum CPU Temperature', desc: 'Lower is better · measured under sustained load', unit: 'C', lowerBetter: true },
  ssd_temp: { title: 'SSD Temperatures', desc: 'Lower is better · measured under sustained storage load', unit: 'C', lowerBetter: true },
  volume: { title: 'Volume', desc: 'Lower is better · chassis size in liters', unit: 'L', lowerBetter: true },
  noise_load: { title: 'Fan Noise at Load (Default Profile)', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true },
  noise_perf: { title: 'Fan Noise at Load (Performance Profile)', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true },
  noise_idle: { title: 'Fan Noise at Idle', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true },
  // Multi-series chart
  noise: {
    title: 'Fan Noise · All Profiles',
    desc: 'Lower is better · dB(A) measured at 30 cm',
    unit: 'dB',
    lowerBetter: true,
    multiSeries: true,
    defaultSortSeries: 'noise_load',
    defaultVisibleSeries: ['noise_idle', 'noise_load', 'noise_perf'],
    series: [
      { key: 'noise_idle', label: 'Idle', colorVar: '--noise1' },
      { key: 'noise_load', label: 'Load', colorVar: '--noise2' },
      { key: 'noise_perf', label: 'Performance', colorVar: '--noise3' }
    ]
  }
};

const DETAIL_METRIC_GROUPS = [
  {
    title: 'Links',
    type: 'links'
  },
  {
    title: 'Quick View',
    items: ['composite', 'efficiency', 'watts', 'power_idle_watts', 'volume']
  },
  {
    title: 'CPU',
    items: ['cb23s', 'cb23m', 'gb6s', 'gb6m', 'gbai_cpu']
  },
  {
    title: 'GPU & Pro Apps',
    items: ['gbai_gpu', 'firestrike', 'timespy', 'steelnomad', 'coding', 'photoshop', 'premiere']
  },
  {
    title: 'Media, Thermals & Acoustics',
    items: ['h264', 'av1', 'av1_hw', 'noise_idle', 'noise_load', 'noise_perf', 'cpu_temp', 'ssd_temp', 'storage', 'wireless_audio']
  }
];

const DETAIL_METRICS = {
  composite: { label: 'Composite score', decimals: 1 },
  efficiency: { label: 'Efficiency', decimals: 1 },
  watts: { label: 'Max power draw', unit: 'W' },
  power_idle_watts: { label: 'Idle power', unit: 'W' },
  volume: { label: 'Volume', unit: 'L', decimals: 2 },
  cb23s: { label: 'Cinebench R23 single' },
  cb23m: { label: 'Cinebench R23 multi' },
  gb6s: { label: 'Geekbench 6 single' },
  gb6m: { label: 'Geekbench 6 multi' },
  gbai_cpu: { label: 'Geekbench AI CPU' },
  gbai_gpu: { label: 'Geekbench AI GPU' },
  firestrike: { label: '3DMark Fire Strike' },
  timespy: { label: '3DMark Time Spy' },
  steelnomad: { label: '3DMark Steel Nomad' },
  coding: { label: 'Coding', decimals: 3 },
  photoshop: { label: 'Photoshop' },
  premiere: { label: 'Premiere' },
  h264: { label: 'H264 encode', unit: 's' },
  av1: { label: 'AV1 encode', unit: 's' },
  av1_hw: { label: 'AV1 hardware encode', unit: 's' },
  noise_idle: { label: 'Idle noise', unit: 'dB' },
  noise_load: { label: 'Load noise', unit: 'dB' },
  noise_perf: { label: 'Performance noise', unit: 'dB' },
  cpu_temp: { label: 'CPU temperature', unit: 'C' },
  ssd_temp: { label: 'SSD temperature', unit: 'C' },
  storage: { label: 'Storage score' },
  wireless_audio: { label: 'Wireless BT audio', decimals: 1 }
};

let DEVICES = [];
let MAX_H = {};
let MIN_L = {};
let visibleColumns = new Set();
let sortCol = 'composite';
let sortDir = -1;
let filterQ = '';
let activeChart = 'cb23s';
let activeDeviceId = null;
let linksLoaded = false;

// Multi-series chart state
let multiSeriesSort = 'noise_load';
let multiSeriesMode = 'stacked'; // 'stacked' | 'grouped'
let multiSeriesVisible = new Set(CHART_META.noise.defaultVisibleSeries ?? CHART_META.noise.series.map(series => series.key));

const benchmarkTable = document.getElementById('benchmark-table');
const infoGrid = document.getElementById('info-grid');
const countEl = document.getElementById('count');
const siteMetaEl = document.getElementById('site-meta');
const chartBox = document.getElementById('chart-box');
const columnToggleBtn = document.getElementById('column-toggle');
const columnMenuEl = document.getElementById('column-menu');
const columnOptionsEl = document.getElementById('column-options');
const deviceDetailOverlay = document.getElementById('device-detail-overlay');
const deviceDetailCloseBtn = document.getElementById('device-detail-close');
const deviceDetailTitle = document.getElementById('device-detail-title');
const deviceDetailSummary = document.getElementById('device-detail-summary');
const deviceDetailBody = document.getElementById('device-detail-body');
const siteHeader = document.querySelector('header');
const tableWrap = document.querySelector('.table-wrap');
let floatingTableHeader = null;

const fmt = v => v == null ? '—' : v.toLocaleString();
const fmtD = (v, d = 1) => v == null ? '—' : v.toFixed(d);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function syncFloatingTableHeader() {
  if (!floatingTableHeader) return;
  const tableRect = benchmarkTable.getBoundingClientRect();
  const wrapRect = tableWrap.getBoundingClientRect();
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  const sourceHeaders = benchmarkTable.querySelectorAll('thead th');
  const floatingHeaders = floatingTableHeader.querySelectorAll('thead th');
  const shouldShow = tableRect.top < headerHeight && tableRect.bottom > headerHeight;

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
  floatingTableHeader.style.top = `${headerHeight}px`;
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

function normalizeDeviceLinks(rawLinks) {
  const links = [];

  if (Array.isArray(rawLinks)) {
    rawLinks.forEach(link => {
      if (!link || typeof link !== 'object') return;
      const url = typeof link.url === 'string' ? link.url.trim() : '';
      if (!url) return;
      links.push({
        label: typeof link.label === 'string' && link.label.trim() ? link.label.trim() : 'Open link',
        url,
        kind: typeof link.kind === 'string' ? link.kind.trim().toLowerCase() : '',
        logo: typeof link.logo === 'string' && link.logo.trim() ? link.logo.trim() : ''
      });
    });
  }

  const deduped = [];
  const seen = new Set();
  links.forEach(link => {
    if (seen.has(link.url)) return;
    seen.add(link.url);
    deduped.push(link);
  });

  return deduped;
}

function findDeviceById(id) {
  return DEVICES.find(device => device.id === id) ?? null;
}

function getDeviceIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(DEVICE_QUERY_PARAM);
  return raw && raw.trim() ? raw.trim() : null;
}

function setDeviceIdInUrl(deviceId, { replace = false } = {}) {
  const url = new URL(window.location.href);

  if (deviceId) {
    url.searchParams.set(DEVICE_QUERY_PARAM, deviceId);
  } else {
    url.searchParams.delete(DEVICE_QUERY_PARAM);
  }

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

function slugifyDeviceName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveDeviceId(device) {
  if (typeof device.id === 'string' && device.id.trim()) {
    return device.id.trim();
  }

  return slugifyDeviceName(device.name);
}

function formatDetailMetricValue(metricId, value) {
  const config = DETAIL_METRICS[metricId] ?? {};
  if (value == null) return null;
  const formatted = typeof config.decimals === 'number' ? fmtD(value, config.decimals) : fmt(value);
  return `${formatted}${config.unit ?? ''}`;
}

function renderDetailMetrics(group, device) {
  const items = group.items
    .map(metricId => {
      const value = formatDetailMetricValue(metricId, device[metricId]);
      if (value == null) return '';
      const label = DETAIL_METRICS[metricId]?.label ?? metricId;
      return `<div class="detail-stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
    })
    .filter(Boolean)
    .join('');

  if (!items) return '';

  return `<section class="detail-section">
    <h3>${escapeHtml(group.title)}</h3>
    <dl class="detail-stats-grid">${items}</dl>
  </section>`;
}

function renderDetailLinks(device) {
  if (!linksLoaded) {
    return `<section class="detail-section">
      <h3>Links</h3>
      <p class="detail-empty">Loading outbound links…</p>
    </section>`;
  }

  const items = device.links.map(link => {
    const kindIcon = link.logo
      ? `<img class="detail-link-logo" src="${escapeHtml(link.logo)}" alt="" loading="lazy">`
      : link.kind === 'affiliate'
      ? '<span class="detail-link-icon" aria-hidden="true">$</span>'
      : link.kind === 'youtube'
        ? '<span class="detail-link-icon" aria-hidden="true">▶</span>'
        : '<span class="detail-link-icon" aria-hidden="true">↗</span>';
    const meta = link.kind ? `<span class="detail-link-kind">${escapeHtml(link.kind)}</span>` : '';
    return `<a class="detail-link-card" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
      <span class="detail-link-head">${kindIcon}<span class="detail-link-label">${escapeHtml(link.label)}</span></span>
      ${meta}
    </a>`;
  }).join('');

  if (!items) {
    return `<section class="detail-section">
      <h3>Links</h3>
      <p class="detail-empty">No outbound links added for this mini PC yet.</p>
    </section>`;
  }

  return `<section class="detail-section">
    <h3>Links</h3>
    <div class="detail-links-grid">${items}</div>
  </section>`;
}

function renderDetailPhoto(device) {
  const hasPhoto = typeof device.photo === 'string' && device.photo.trim();
  const photo = hasPhoto ? `
    <div class="detail-photo-frame is-loading" data-testid="detail-photo-frame">
      <div class="detail-photo-loader" data-testid="detail-photo-loader" aria-hidden="true">
        <span class="detail-photo-spinner"></span>
      </div>
      <img class="detail-photo-image" src="${escapeHtml(device.photo)}" alt="${escapeHtml(device.name)}" loading="lazy" decoding="async">
    </div>
  ` : `
    <div class="detail-photo-placeholder" data-testid="detail-photo-placeholder">
      <svg class="detail-photo-placeholder-mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="10" width="40" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="16" cy="20" r="3.5" fill="currentColor"/>
        <path d="M8 34l10-9 8 7 6-6 10 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>No photo available yet</span>
    </div>
  `;
  const stateClass = hasPhoto ? 'has-photo' : 'no-photo';

  return `<section class="detail-section detail-photo-section ${stateClass}" data-testid="detail-photo-section">
    <h3>Photo</h3>
    <div class="detail-photo">${photo}</div>
  </section>`;
}

function renderDeviceSummary(device) {
  const parts = [];
  if (device.composite) parts.push(`score ${fmtD(device.composite)}`);
  if (device.watts != null) parts.push(`${fmt(device.watts)}W max draw`);
  if (device.noise_load != null) parts.push(`${fmt(device.noise_load)}dB load noise`);
  if (device.links.length) parts.push(`${device.links.length} saved link${device.links.length === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function renderDeviceDetail(device) {
  deviceDetailTitle.textContent = device.name;
  deviceDetailSummary.textContent = renderDeviceSummary(device);
  const photo = renderDetailPhoto(device);
  const links = renderDetailLinks(device);
  const metrics = DETAIL_METRIC_GROUPS.filter(group => group.type !== 'links').map(group => {
    return renderDetailMetrics(group, device);
  }).filter(Boolean).join('');
  deviceDetailBody.innerHTML = `<div class="detail-feature-grid">${photo}${links}</div>${metrics}`;
  initDetailPhotoLoading();
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
        ${visible.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}
      </tr>
    </thead>
    <tbody aria-busy="true" aria-label="Loading benchmark data">
      ${rows}
    </tbody>`;
}

function renderChartMessage(message) {
  chartBox.innerHTML = `<div class="chart-head"><div class="chart-title">Charts</div><div class="chart-desc">${escapeHtml(message)}</div></div>`;
}

function renderLoadingChart() {
  chartBox.innerHTML = `
    <div class="chart-loading" role="status" aria-label="Loading benchmark data">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Loading benchmark data…</span>
    </div>`;
}

function normalizeDevices(data) {
  const seenIds = new Set();

  DEVICES = data.map(device => {
    const id = resolveDeviceId(device);

    if (!id) {
      throw new Error(`Device is missing a usable id: ${device.name ?? 'unknown device'}`);
    }

    if (seenIds.has(id)) {
      throw new Error(`Duplicate device id found: ${id}`);
    }

    seenIds.add(id);

    return {
      ...device,
      id,
      links: [],
      photo: typeof device.photo === 'string' ? device.photo.trim() : (typeof device.image === 'string' ? device.image.trim() : ''),
      h264: device.h264 ?? device.handbrake ?? null,
      av1: device.av1 ?? null,
      av1_hw: device.av1_hw ?? device.av1_hardware ?? null,
      gbai_cpu: device.gbai_cpu ?? device.geekbench_ai_cpu ?? null,
      gbai_gpu: device.gbai_gpu ?? device.geekbench_ai_gpu ?? null,
      steelnomad: device.steelnomad ?? device.steel_nomad ?? null,
      coding: device.coding ?? null,
      photoshop: device.photoshop ?? null,
      premiere: device.premiere ?? null,
      storage: device.storage ?? device.storage_benchmark ?? null,
      ssd_temp: device.ssd_temp ?? device.ssd_temperature ?? null,
      wireless_audio: device.wireless_audio ?? device.bluetooth_audio ?? null,
      cpu_temp: device.cpu_temp ?? device.max_cpu_temp ?? null,
      volume: device.volume ?? device.chassis_volume_l ?? null,
      noise_idle: device.noise_idle ?? device.noise?.idle ?? null,
      noise_load: device.noise_load ?? device.noise?.load_default ?? null,
      noise_perf: device.noise_perf ?? device.noise?.load_performance ?? null
    };
  });

  MAX_H = {};
  BENCH_HIGHER.forEach(column => {
    MAX_H[column] = Math.max(...DEVICES.map(device => device[column] ?? 0), 0);
  });

  MIN_L = {};
  BENCH_LOWER.forEach(column => {
    MIN_L[column] = Math.min(...DEVICES.map(device => device[column] ?? Infinity));
  });

  DEVICES.forEach(device => {
    const scores = BENCH_HIGHER
      .map(column => device[column] != null && MAX_H[column] ? (device[column] / MAX_H[column]) * 100 : null)
      .filter(value => value !== null);
    device.composite = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
    device.efficiency = device.watts ? (device.composite / device.watts) * 10 : 0;
  });
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

  infoGrid.innerHTML = cards.map(card => `
    <div class="info-card ${card.cls}">
      <div class="info-label">${card.label}</div>
      <div class="info-value ${card.cls}">${card.value}</div>
      <div class="info-device" title="${escapeHtml(card.device)}">${escapeHtml(card.device)}</div>
    </div>`).join('');
}

function getFiltered() {
  const q = filterQ.trim().toLowerCase();
  return q ? DEVICES.filter(device => device.name.toLowerCase().includes(q)) : [...DEVICES];
}

function ensureValidSortColumn() {
  const available = getVisibleColumns();
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
  if (BENCH_HIGHER.includes(column.id) || BENCH_LOWER.includes(column.id)) {
    return renderBenchCell(column, device[column.id]);
  }

  if (column.id === 'name') {
    const linkCount = device.links.length
      ? `<span class="device-name-meta">${device.links.length} link${device.links.length === 1 ? '' : 's'}</span>`
      : '<span class="device-name-meta">details</span>';
    return `<td class="col-name"><button type="button" class="device-name-trigger" data-device-id="${escapeHtml(device.id)}"><span>${escapeHtml(device.name)}</span>${linkCount}</button></td>`;
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

  const classAttr = column.cellClass ? ` class="${column.cellClass}"` : '';
  return `<td${classAttr}>${fmt(device[column.id])}</td>`;
}

function renderTable() {
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
    maxEfficiency: Math.max(...DEVICES.map(device => device.efficiency), 0)
  };

  countEl.textContent = filterQ.trim()
    ? `Showing ${filtered.length} of ${DEVICES.length} devices`
    : `${DEVICES.length} devices`;

  const headerHtml = visible.map(column => {
    const active = column.id === sortCol;
    const classes = [column.headerClass, active ? 'active' : ''].filter(Boolean).join(' ');
    const classAttr = classes ? ` class="${classes}"` : '';
    return `<th data-col="${column.id}"${classAttr} title="${escapeHtml(column.title)}">${column.label} <span class="sort-ind">${sortIndicatorFor(column)}</span></th>`;
  }).join('');

  const bodyHtml = devices.map((device, index) => {
    const rank = index + 1;
    const rankHtml = rank <= 3
      ? `<span class="rank-badge rank-${rank}">${rank}</span>`
      : `<span style="color:var(--muted);font-size:0.72rem">${rank}</span>`;
    const cells = visible.map(column => renderTableCell(column, device, metrics)).join('');
    return `<tr><td>${rankHtml}</td>${cells}</tr>`;
  }).join('');

  benchmarkTable.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        ${headerHtml}
      </tr>
    </thead>
    <tbody>
      ${bodyHtml || '<tr><td class="table-message">No matching devices.</td></tr>'}
    </tbody>`;

  benchmarkTable.querySelectorAll('thead th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const columnId = th.dataset.col;
      const column = getColumnById(columnId);
      if (!column) return;
      if (columnId === sortCol) {
        sortDir *= -1;
      } else {
        sortCol = columnId;
        sortDir = column.sortDefaultDir ?? -1;
      }
      renderTable();
    });
  });

  benchmarkTable.querySelectorAll('.device-name-trigger').forEach(button => {
    button.addEventListener('click', () => {
      openDeviceDetail(button.dataset.deviceId);
    });
  });
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

// ── Multi-series chart helpers ──────────────────────────────────────────────

function buildStackedSegments(device, meta, globalMax) {
  if (!meta.series.some(series => device[series.key] != null)) {
    return `<span class="chart-segment-empty">no data</span>`;
  }

  const toW = v => v != null && globalMax ? ((v / globalMax) * 100).toFixed(2) : '0';
  let segments = '';
  let previousValue = null;

  meta.series.forEach(series => {
    const value = device[series.key];
    if (value == null) return;
    if (previousValue != null) {
      const delta = Math.max(value - previousValue, 0);
      const w = ((delta / globalMax) * 100).toFixed(2);
      segments += `<div class="chart-segment" data-w="${w}" style="width:0;background:var(${series.colorVar})" title="${series.label}: ${fmt(value)}${meta.unit} (+${fmt(Math.round(delta))})"></div>`;
    } else {
      segments += `<div class="chart-segment" data-w="${toW(value)}" style="width:0;background:var(${series.colorVar})" title="${series.label}: ${fmt(value)}${meta.unit}"></div>`;
    }
    previousValue = value;
  });

  return segments;
}

function buildGroupedTracks(device, meta, globalMax) {
  return meta.series.map(s => {
    const val = device[s.key];
    const pct = val != null && globalMax ? ((val / globalMax) * 100).toFixed(2) : '0';
    return `<div class="chart-track chart-track-thin">
      <div class="chart-fill" data-w="${pct}" style="width:0;background:var(${s.colorVar})" title="${s.label}: ${val != null ? fmt(val) + meta.unit : '—'}"></div>
    </div>`;
  }).join('');
}

function renderChartMultiSeries(meta) {
  const enabledSeries = meta.series.filter(series => multiSeriesVisible.has(series.key));
  const enabledMeta = { ...meta, series: enabledSeries };
  const devices = DEVICES.filter(device => enabledSeries.some(series => device[series.key] != null));

  if (!devices.length) {
    renderChartMessage('No noise data available.');
    return;
  }

  // Global max across all series for proportional bar sizing
  const globalMax = Math.max(...devices.flatMap(device => enabledSeries.map(series => device[series.key] ?? 0)), 0);

  // Sort by selected series key (lower is better for noise)
  const sorted = [...devices].sort((a, b) => {
    const av = a[multiSeriesSort] ?? Infinity;
    const bv = b[multiSeriesSort] ?? Infinity;
    return av - bv;
  });

  // ── Controls ──
  const sortPills = enabledSeries.map(s => `
    <button class="chart-sort-pill${multiSeriesSort === s.key ? ' active' : ''}" data-sort="${s.key}">${s.label}</button>
  `).join('');

  const modeBtns = `
    <button class="chart-mode-btn${multiSeriesMode === 'stacked' ? ' active' : ''}" data-mode="stacked" title="Stacked bars">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="3" rx="1" fill="currentColor"/><rect x="1" y="8" width="12" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>
    </button>
    <button class="chart-mode-btn${multiSeriesMode === 'grouped' ? ' active' : ''}" data-mode="grouped" title="Grouped bars">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="5.5" y="2" width="4" height="10" rx="1" fill="currentColor" opacity=".6"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor" opacity=".3"/></svg>
    </button>`;

  // ── Legend ──
  const legendHtml = `
    <div class="chart-legend">
      ${meta.series.map(s => `
        <button type="button" class="legend-item${multiSeriesVisible.has(s.key) ? ' active' : ''}" data-series="${s.key}" aria-pressed="${multiSeriesVisible.has(s.key)}" ${enabledSeries.length === 1 && multiSeriesVisible.has(s.key) ? 'disabled' : ''}>
          <span class="legend-dot" style="background:var(${s.colorVar})"></span>
          <span>${s.label}</span>
        </button>`).join('')}
      ${multiSeriesMode === 'stacked' ? `<span class="legend-hint">Segments show delta from previous profile</span>` : ''}
    </div>`;

  // ── Rows ──
  const rowsHtml = sorted.map((device, idx) => {
    const isTop = idx < 3;
    const primaryVal = device[multiSeriesSort];
    const allVals = enabledSeries.map(s => device[s.key] != null ? `${fmt(device[s.key])}` : '—').join(' / ');
    const numTitle = `${enabledSeries.map(s => `${s.label}: ${device[s.key] != null ? fmt(device[s.key]) + meta.unit : '—'}`).join(', ')}`;

    if (multiSeriesMode === 'stacked') {
      return `<div class="chart-row">
        <button type="button" class="chart-label${isTop ? ' top' : ''}" data-device-id="${escapeHtml(device.id)}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</button>
        <div class="chart-track chart-track-stacked">
          ${buildStackedSegments(device, enabledMeta, globalMax)}
        </div>
        <span class="chart-num chart-num-multi${isTop ? ' top' : ''}" title="${escapeHtml(numTitle)}">${allVals}${meta.unit}</span>
      </div>`;
    } else {
      return `<div class="chart-row chart-row-grouped">
        <button type="button" class="chart-label${isTop ? ' top' : ''}" data-device-id="${escapeHtml(device.id)}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</button>
        <div class="chart-track-group">
          ${buildGroupedTracks(device, enabledMeta, globalMax)}
        </div>
        <span class="chart-num chart-num-multi${isTop ? ' top' : ''}" title="${escapeHtml(numTitle)}">${allVals}${meta.unit}</span>
      </div>`;
    }
  }).join('');

  chartBox.innerHTML = `
    <div class="chart-head">
      <div class="chart-head-row">
        <div>
          <div class="chart-title">${meta.title}</div>
          <div class="chart-desc">${meta.desc} &nbsp;·&nbsp; ${sorted.length} devices</div>
        </div>
        <div class="chart-multi-controls">
          <span class="chart-control-label">Sort by</span>
          ${sortPills}
          <span class="chart-control-sep"></span>
          ${modeBtns}
        </div>
      </div>
      ${legendHtml}
    </div>
    ${rowsHtml}`;

  // Animate bars
  requestAnimationFrame(() => requestAnimationFrame(() => {
    chartBox.querySelectorAll('.chart-segment[data-w]').forEach(el => {
      el.style.width = `${el.dataset.w}%`;
    });
    chartBox.querySelectorAll('.chart-fill[data-w]').forEach(el => {
      el.style.width = `${el.dataset.w}%`;
    });
  }));

  // Sort pill listeners
  chartBox.querySelectorAll('.chart-sort-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      multiSeriesSort = btn.dataset.sort;
      renderChart();
    });
  });

  chartBox.querySelectorAll('.legend-item[data-series]').forEach(btn => {
    btn.addEventListener('click', () => {
      const seriesKey = btn.dataset.series;
      if (multiSeriesVisible.has(seriesKey)) {
        if (multiSeriesVisible.size === 1) return;
        multiSeriesVisible.delete(seriesKey);
        if (multiSeriesSort === seriesKey) {
          multiSeriesSort = meta.series.find(series => multiSeriesVisible.has(series.key)).key;
        }
      } else {
        multiSeriesVisible.add(seriesKey);
      }
      renderChart();
    });
  });

  // Mode toggle listeners
  chartBox.querySelectorAll('.chart-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      multiSeriesMode = btn.dataset.mode;
      renderChart();
    });
  });

  chartBox.querySelectorAll('.chart-label[data-device-id]').forEach(label => {
    label.addEventListener('click', () => {
      openDeviceDetail(label.dataset.deviceId);
    });
  });
}

// ── Single-series chart ─────────────────────────────────────────────────────

function renderChart() {
  if (!DEVICES.length) {
    renderChartMessage('No chart data available.');
    return;
  }

  const meta = CHART_META[activeChart];

  if (meta.multiSeries) {
    renderChartMultiSeries(meta);
    return;
  }

  const isLower = meta.lowerBetter;
  const allDevices = DEVICES.filter(device => device[activeChart] != null);
  if (!allDevices.length) {
    renderChartMessage('No data available for this metric yet.');
    return;
  }
  const sorted = [...allDevices].sort((a, b) => isLower
    ? (a[activeChart] ?? Infinity) - (b[activeChart] ?? Infinity)
    : (b[activeChart] ?? 0) - (a[activeChart] ?? 0));

  const maxVal = Math.max(...sorted.map(device => device[activeChart] ?? 0), 0);
  const topColors = isLower ? ['var(--pow1)', 'var(--pow2)', 'var(--pow3)'] : ['var(--bar1)', 'var(--bar2)', 'var(--bar3)'];
  const dimColor = isLower ? 'var(--pow-dim)' : 'var(--bar-dim)';

  const rows = sorted.map((device, index) => {
    const value = device[activeChart];
    const pct = maxVal ? (value / maxVal) * 100 : 0;
    const color = index < 3 ? topColors[index] : dimColor;
    const isTop = index < 3;
    return `<div class="chart-row">
      <button type="button" class="chart-label${isTop ? ' top' : ''}" data-device-id="${escapeHtml(device.id)}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</button>
      <div class="chart-track">
        <div class="chart-fill" data-w="${pct.toFixed(2)}" style="background:${color}"></div>
      </div>
      <span class="chart-num${isTop ? ' top' : ''}">${fmt(value)}${meta.unit}</span>
    </div>`;
  }).join('');

  chartBox.innerHTML = `
    <div class="chart-head">
      <div class="chart-title">${meta.title}</div>
      <div class="chart-desc">${meta.desc} &nbsp;·&nbsp; ${sorted.length} devices</div>
    </div>
    ${rows}`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.chart-fill[data-w]').forEach(el => {
      el.style.width = `${el.dataset.w}%`;
    });
  }));

  chartBox.querySelectorAll('.chart-label[data-device-id]').forEach(label => {
    label.addEventListener('click', () => {
      openDeviceDetail(label.dataset.deviceId);
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
    normalizeDevices(data);
    updateSiteMeta();
    renderInfoCards();
    renderTable();
    renderChart();
    syncDeviceDetailFromUrl();
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
    document.querySelectorAll('.tab-btn[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${view}-view`);
    });
    if (view === 'charts') renderChart();
  });
});

document.getElementById('search').addEventListener('input', event => {
  filterQ = event.target.value;
  renderTable();
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
    if (!deviceDetailOverlay.hidden) closeDeviceDetail();
  }
});

deviceDetailCloseBtn.addEventListener('click', () => {
  closeDeviceDetail();
});

deviceDetailOverlay.addEventListener('click', event => {
  if (event.target === deviceDetailOverlay) closeDeviceDetail();
});

window.addEventListener('scroll', syncFloatingTableHeader, { passive: true });
window.addEventListener('resize', syncFloatingTableHeader);
tableWrap.addEventListener('scroll', syncFloatingTableHeader, { passive: true });

window.addEventListener('popstate', () => {
  if (!DEVICES.length) return;
  syncDeviceDetailFromUrl();
});

visibleColumns = loadVisibleColumns();
renderColumnPicker();
loadData();