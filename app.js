const DATA_URL = './devices.json';
const LINKS_URL = './device-links.json';
const DEVICE_QUERY_PARAM = 'device';
const COMPARE_QUERY_PARAM = 'compare';
const COLUMN_STORAGE_KEY = 'minipc-benchmarks.visible-columns';
const COMPARE_STORAGE_KEY = 'minipc-benchmarks.compare-selection';
const COMPARE_DIFF_STORAGE_KEY = 'minipc-benchmarks.compare-diff-only';
const COMPARE_MAX = 4;
const META_SUFFIX = 'Cinebench R23 &nbsp;·&nbsp; Geekbench 6 &nbsp;·&nbsp; 3DMark &nbsp;·&nbsp; H264 &nbsp;·&nbsp; Power draw &nbsp;·&nbsp; Efficiency score';

// Edit this list to define which optional columns are enabled for first-time visitors.
const DEFAULT_VISIBLE_COLUMNS = [
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'gbai_cpu_single',
  'gbai_gpu_single',
  'firestrike',
  'timespy',
  'h264',
  'watts',
  'power_idle_watts',
  'noise_idle',
  'noise_load',
  'noise_perf',
  'composite',
  'efficiency',
  'composite_perf',
  'efficiency_perf'
];

const BENCH_HIGHER = [
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'gbai_cpu_single',
  'gbai_gpu_single',
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

function createPerformanceColumn(id, label, pickerLabel, title, lowerBetter = false, extra = {}) {
  return {
    id: `${id}_perf`,
    label: `${label} <span class="profile-label">Perf</span>`,
    pickerLabel: `Perf: ${pickerLabel}`,
    title,
    lowerBetter,
    sortDefaultDir: lowerBetter ? 1 : -1,
    ...extra
  };
}

const TABLE_COLUMNS = [
  { id: 'compare', label: '<span class="sr-only">Compare</span>⇄', pickerLabel: 'Compare', title: 'Add to the comparison basket', headerClass: 'col-compare', cellClass: 'col-compare', alwaysVisible: true, notSortable: true },
  { id: 'name', label: 'Device', pickerLabel: 'Device', title: 'Device name', headerClass: 'col-name', cellClass: 'col-name', alwaysVisible: true, sortDefaultDir: 1 },
  { id: 'cb23s', label: 'CB R23 1T', pickerLabel: 'CB R23 Single', title: 'Cinebench R23 Single Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('cb23s', 'CB R23 1T', 'CB R23 Single', 'Cinebench R23 Single Core (Performance profile; higher is better)'),
  { id: 'cb23m', label: 'CB R23 nT', pickerLabel: 'CB R23 Multi', title: 'Cinebench R23 Multi Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('cb23m', 'CB R23 nT', 'CB R23 Multi', 'Cinebench R23 Multi Core (Performance profile; higher is better)'),
  { id: 'gb6s', label: 'GB6 1T', pickerLabel: 'GB6 Single', title: 'Geekbench 6 Single Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('gb6s', 'GB6 1T', 'GB6 Single', 'Geekbench 6 Single Core (Performance profile; higher is better)'),
  { id: 'gb6m', label: 'GB6 nT', pickerLabel: 'GB6 Multi', title: 'Geekbench 6 Multi Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('gb6m', 'GB6 nT', 'GB6 Multi', 'Geekbench 6 Multi Core (Performance profile; higher is better)'),
  { id: 'gbai_cpu_single', label: 'GB AI CPU', pickerLabel: 'Geekbench AI CPU (Single)', title: 'Geekbench AI CPU Single score (higher is better)', sortDefaultDir: -1 },
  { id: 'gbai_gpu_single', label: 'GB AI GPU', pickerLabel: 'Geekbench AI GPU (Single)', title: 'Geekbench AI GPU Single score (higher is better)', sortDefaultDir: -1 },
  { id: 'firestrike', label: 'FireStrike', pickerLabel: 'Fire Strike', title: '3DMark Fire Strike - DirectX 11 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('firestrike', 'FireStrike', 'Fire Strike', '3DMark Fire Strike - DirectX 11 GPU benchmark (Performance profile; higher is better)'),
  { id: 'timespy', label: 'Time Spy', pickerLabel: 'Time Spy', title: '3DMark Time Spy - DirectX 12 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('timespy', 'Time Spy', 'Time Spy', '3DMark Time Spy - DirectX 12 GPU benchmark (Performance profile; higher is better)'),
  { id: 'steelnomad', label: 'Steel Nomad', pickerLabel: 'Steel Nomad', title: '3DMark Steel Nomad score (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('steelnomad', 'Steel Nomad', 'Steel Nomad', '3DMark Steel Nomad score (Performance profile; higher is better)'),
  { id: 'coding', label: 'Coding ↓', pickerLabel: 'Coding', title: 'Coding benchmark score (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  createPerformanceColumn('coding', 'Coding ↓', 'Coding', 'Coding benchmark score (Performance profile; lower is better)', true),
  { id: 'photoshop', label: 'Photoshop', pickerLabel: 'Photoshop', title: 'Photoshop benchmark score (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('photoshop', 'Photoshop', 'Photoshop', 'Photoshop benchmark score (Performance profile; higher is better)'),
  { id: 'premiere', label: 'Premiere', pickerLabel: 'Premiere', title: 'Premiere benchmark score (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('premiere', 'Premiere', 'Premiere', 'Premiere benchmark score (Performance profile; higher is better)'),
  { id: 'storage', label: 'Storage', pickerLabel: 'Storage Benchmark', title: '3DMark Storage Benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'wireless_audio', label: 'BT Audio', pickerLabel: 'Wireless BT Audio', title: 'Wireless Bluetooth audio benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'h264', label: 'H264 (s) ↓', pickerLabel: 'H264', title: 'H264 video encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  createPerformanceColumn('h264', 'H264 (s) ↓', 'H264', 'H264 video encode time in seconds (Performance profile; lower is better)', true),
  { id: 'av1', label: 'AV1 (s) ↓', pickerLabel: 'AV1 Encode', title: 'AV1 encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  createPerformanceColumn('av1', 'AV1 (s) ↓', 'AV1 Encode', 'AV1 encode time in seconds (Performance profile; lower is better)', true),
  { id: 'av1_hw', label: 'AV1 HW (s) ↓', pickerLabel: 'AV1 HW Encode', title: 'AV1 hardware encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  createPerformanceColumn('av1_hw', 'AV1 HW (s) ↓', 'AV1 HW Encode', 'AV1 hardware encode time in seconds (Performance profile; lower is better)', true),
  { id: 'watts', label: 'Watts ↓', pickerLabel: 'Max Power Draw', title: 'Maximum power draw from wall under load (lower is better)', lowerBetter: true, cellClass: 'watts-cell', sortDefaultDir: 1 },
  createPerformanceColumn('watts', 'Watts ↓', 'Max Power Draw', 'Maximum power draw from wall under load (Performance profile; lower is better)', true, { cellClass: 'watts-cell' }),
  { id: 'power_idle_watts', label: 'Idle W ↓', pickerLabel: 'Idle Power', title: 'Power draw at idle in watts (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'cpu_temp', label: 'CPU C ↓', pickerLabel: 'Max CPU Temp', title: 'Maximum CPU temperature under load in degrees Celsius (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  createPerformanceColumn('cpu_temp', 'CPU C ↓', 'Max CPU Temp', 'Maximum CPU temperature under load in degrees Celsius (Performance profile; lower is better)', true),
  { id: 'ssd_temp', label: 'SSD C ↓', pickerLabel: 'SSD Temp', title: 'SSD temperature under load in degrees Celsius (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'volume', label: 'Volume ↓', pickerLabel: 'Volume', title: 'Chassis volume in liters (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_idle', label: 'Idle dB ↓', pickerLabel: 'Idle Noise', title: 'Fan noise at idle in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_load', label: 'Load dB ↓', pickerLabel: 'Load Noise', title: 'Fan noise at load (default profile) in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'noise_perf', label: 'Perf dB ↓', pickerLabel: 'Perf Noise', title: 'Fan noise at load (performance profile) in dB(A) (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'composite', label: 'Score', pickerLabel: 'Composite Score', title: 'Average of all available normalized benchmark scores (0-100 each, relative to dataset max)', cellClass: 'score', sortDefaultDir: -1 },
  { id: 'efficiency', label: 'Eff.', pickerLabel: 'Efficiency', title: 'Score / Watts x 10 - higher means more performance per watt', cellClass: 'eff', sortDefaultDir: -1 },
  { id: 'composite_perf', label: 'Perf Score', pickerLabel: 'Perf. Composite Score', title: 'Performance profile score using Performance values with Default fallback', cellClass: 'score', sortDefaultDir: -1 },
  { id: 'efficiency_perf', label: 'Perf Eff.', pickerLabel: 'Perf. Efficiency', title: 'Performance profile score per Performance watts', cellClass: 'eff', sortDefaultDir: -1 }
];

function createPerformanceChart(key, title, desc, unit = '', lowerBetter = false) {
  return {
    title,
    desc,
    unit,
    lowerBetter,
    multiSeries: true,
    defaultSortSeries: key,
    defaultMode: 'stacked',
    defaultVisibleSeries: [key, `${key}_perf`],
    emptyMessage: 'No Default or Performance data available for this metric yet.',
    series: [
      { key, label: 'Default', colorVar: '--profile-default' },
      { key: `${key}_perf`, label: 'Performance', colorVar: '--profile-performance' }
    ]
  };
}

const CHART_META = {
  cb23s: createPerformanceChart('cb23s', 'Cinebench R23 · Single Core CPU', 'Higher is better'),
  cb23m: createPerformanceChart('cb23m', 'Cinebench R23 · Multi Core CPU', 'Higher is better'),
  gb6s: createPerformanceChart('gb6s', 'Geekbench 6 · Single Core CPU', 'Higher is better'),
  gb6m: createPerformanceChart('gb6m', 'Geekbench 6 · Multi Core CPU', 'Higher is better'),
  gbai_cpu: {
    title: 'Geekbench AI · CPU',
    desc: 'Higher is better',
    unit: '',
    lowerBetter: false,
    multiSeries: true,
    defaultSortSeries: 'gbai_cpu_single',
    defaultMode: 'stacked',
    defaultVisibleSeries: ['gbai_cpu_half', 'gbai_cpu_single', 'gbai_cpu_quantised'],
    emptyMessage: 'No Geekbench AI CPU data available yet.',
    series: [
      { key: 'gbai_cpu_half', label: 'Half', colorVar: '--ai-cpu-half' },
      { key: 'gbai_cpu_single', label: 'Single', colorVar: '--ai-cpu-single' },
      { key: 'gbai_cpu_quantised', label: 'Quantised', colorVar: '--ai-cpu-quantised' }
    ]
  },
  gbai_gpu: {
    title: 'Geekbench AI · GPU',
    desc: 'Higher is better',
    unit: '',
    lowerBetter: false,
    multiSeries: true,
    defaultSortSeries: 'gbai_gpu_single',
    defaultMode: 'stacked',
    defaultVisibleSeries: ['gbai_gpu_half', 'gbai_gpu_single', 'gbai_gpu_quantised'],
    emptyMessage: 'No Geekbench AI GPU data available yet.',
    series: [
      { key: 'gbai_gpu_half', label: 'Half', colorVar: '--ai-gpu-half' },
      { key: 'gbai_gpu_single', label: 'Single', colorVar: '--ai-gpu-single' },
      { key: 'gbai_gpu_quantised', label: 'Quantised', colorVar: '--ai-gpu-quantised' }
    ]
  },
  firestrike: createPerformanceChart('firestrike', '3DMark Fire Strike', 'Higher is better · DirectX 11 GPU benchmark'),
  timespy: createPerformanceChart('timespy', '3DMark Time Spy', 'Higher is better · DirectX 12 GPU benchmark'),
  steelnomad: createPerformanceChart('steelnomad', '3DMark Steel Nomad', 'Higher is better'),
  coding: createPerformanceChart('coding', 'Coding', 'Lower is better', '', true),
  photoshop: createPerformanceChart('photoshop', 'Photoshop', 'Higher is better'),
  premiere: createPerformanceChart('premiere', 'Premiere', 'Higher is better'),
  storage: { title: '3DMark Storage Benchmark', desc: 'Higher is better', unit: '', lowerBetter: false },
  wireless_audio: { title: 'Wireless Bluetooth Audio', desc: 'Higher is better', unit: '', lowerBetter: false },
  h264: createPerformanceChart('h264', 'H264 Video Encode', 'Lower is better · seconds to encode sample video', 's', true),
  av1: createPerformanceChart('av1', 'AV1 Encoding', 'Lower is better · seconds to encode sample video', 's', true),
  av1_hw: createPerformanceChart('av1_hw', 'AV1 Encoding (Hardware)', 'Lower is better · seconds to encode sample video', 's', true),
  watts: createPerformanceChart('watts', 'Maximum Power Draw from the Wall', 'Lower is better · watts under full CPU load', 'W', true),
  power_idle_watts: { title: 'Power Draw at Idle', desc: 'Lower is better · watts at desktop idle', unit: 'W', lowerBetter: true },
  cpu_temp: createPerformanceChart('cpu_temp', 'Maximum CPU Temperature', 'Lower is better · measured under sustained load', 'C', true),
  ssd_temp: { title: 'SSD Temperatures', desc: 'Lower is better · measured under sustained storage load', unit: 'C', lowerBetter: true },
  volume: { title: 'Volume', desc: 'Lower is better · chassis size in liters', unit: 'L', lowerBetter: true },
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
      { key: 'noise_idle', label: 'Idle', colorVar: '--noise-idle' },
      { key: 'noise_load', label: 'Load', colorVar: '--noise-load' },
      { key: 'noise_perf', label: 'Performance', colorVar: '--noise-performance' }
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
    items: ['composite', 'efficiency', 'composite_perf', 'efficiency_perf', 'watts', 'watts_perf', 'power_idle_watts', 'volume']
  },
  {
    title: 'CPU',
    items: ['cb23s', 'cb23s_perf', 'cb23m', 'cb23m_perf', 'gb6s', 'gb6s_perf', 'gb6m', 'gb6m_perf', 'gbai_cpu_single']
  },
  {
    title: 'GPU & Pro Apps',
    items: ['gbai_gpu_single', 'firestrike', 'firestrike_perf', 'timespy', 'timespy_perf', 'steelnomad', 'steelnomad_perf', 'coding', 'coding_perf', 'photoshop', 'photoshop_perf', 'premiere', 'premiere_perf']
  },
  {
    title: 'Media, Thermals & Acoustics',
    items: ['h264', 'h264_perf', 'av1', 'av1_perf', 'av1_hw', 'av1_hw_perf', 'noise_idle', 'noise_load', 'noise_perf', 'cpu_temp', 'cpu_temp_perf', 'ssd_temp', 'storage', 'wireless_audio']
  }
];

const DETAIL_METRICS = {
  composite: { label: 'Composite score', decimals: 1 },
  efficiency: { label: 'Efficiency', decimals: 1 },
  composite_perf: { label: 'Performance composite score', decimals: 1 },
  efficiency_perf: { label: 'Performance efficiency', decimals: 1 },
  watts: { label: 'Max power draw', unit: 'W' },
  watts_perf: { label: 'Max power draw (Performance)', unit: 'W' },
  power_idle_watts: { label: 'Idle power', unit: 'W' },
  volume: { label: 'Volume', unit: 'L', decimals: 2 },
  cb23s: { label: 'Cinebench R23 single' },
  cb23s_perf: { label: 'Cinebench R23 single (Performance)' },
  cb23m: { label: 'Cinebench R23 multi' },
  cb23m_perf: { label: 'Cinebench R23 multi (Performance)' },
  gb6s: { label: 'Geekbench 6 single' },
  gb6s_perf: { label: 'Geekbench 6 single (Performance)' },
  gb6m: { label: 'Geekbench 6 multi' },
  gb6m_perf: { label: 'Geekbench 6 multi (Performance)' },
  gbai_cpu_single: { label: 'Geekbench AI CPU (Single)' },
  gbai_gpu_single: { label: 'Geekbench AI GPU (Single)' },
  firestrike: { label: '3DMark Fire Strike' },
  firestrike_perf: { label: '3DMark Fire Strike (Performance)' },
  timespy: { label: '3DMark Time Spy' },
  timespy_perf: { label: '3DMark Time Spy (Performance)' },
  steelnomad: { label: '3DMark Steel Nomad' },
  steelnomad_perf: { label: '3DMark Steel Nomad (Performance)' },
  coding: { label: 'Coding', decimals: 3 },
  coding_perf: { label: 'Coding (Performance)', decimals: 3 },
  photoshop: { label: 'Photoshop' },
  photoshop_perf: { label: 'Photoshop (Performance)' },
  premiere: { label: 'Premiere' },
  premiere_perf: { label: 'Premiere (Performance)' },
  h264: { label: 'H264 encode', unit: 's' },
  h264_perf: { label: 'H264 encode (Performance)', unit: 's' },
  av1: { label: 'AV1 encode', unit: 's' },
  av1_perf: { label: 'AV1 encode (Performance)', unit: 's' },
  av1_hw: { label: 'AV1 hardware encode', unit: 's' },
  av1_hw_perf: { label: 'AV1 hardware encode (Performance)', unit: 's' },
  noise_idle: { label: 'Idle noise', unit: 'dB' },
  noise_load: { label: 'Load noise', unit: 'dB' },
  noise_perf: { label: 'Performance noise', unit: 'dB' },
  cpu_temp: { label: 'CPU temperature', unit: 'C' },
  cpu_temp_perf: { label: 'CPU temperature (Performance)', unit: 'C' },
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
let compareSelection = [];
let compareDiffOnly = false;

const multiSeriesState = new Map();

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
const compareBox = document.getElementById('compare-box');
const compareSubtitleEl = document.getElementById('compare-subtitle');
const compareTabCountEl = document.getElementById('compare-tab-count');
const compareTrayEl = document.getElementById('compare-tray');
const compareTrayItemsEl = document.getElementById('compare-tray-items');
const compareDiffOnlyEl = document.getElementById('compare-diff-only');
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
  const compareAction = `<div class="detail-actions">
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
  document.querySelectorAll('.tab-btn[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${viewName}-view`);
  });
  if (viewName === 'charts') renderChart();
  if (viewName === 'compare') renderCompareView();
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
        ${visible.map(column => `<th>${escapeHtml(column.pickerLabel)}</th>`).join('')}
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
      gbai_cpu_half: device.gbai_cpu_half ?? null,
      gbai_cpu_single: device.gbai_cpu_single ?? null,
      gbai_cpu_quantised: device.gbai_cpu_quantised ?? null,
      gbai_gpu_half: device.gbai_gpu_half ?? null,
      gbai_gpu_single: device.gbai_gpu_single ?? null,
      gbai_gpu_quantised: device.gbai_gpu_quantised ?? null,
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

    const performanceScores = BENCH_HIGHER
      .map(column => {
        const value = device[`${column}_perf`] ?? device[column];
        return value != null && MAX_H[column] ? (value / MAX_H[column]) * 100 : null;
      })
      .filter(value => value !== null);
    device.composite_perf = performanceScores.length
      ? performanceScores.reduce((sum, value) => sum + value, 0) / performanceScores.length
      : 0;
    const performanceWatts = device.watts_perf ?? device.watts;
    device.efficiency_perf = performanceWatts ? (device.composite_perf / performanceWatts) * 10 : 0;
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
    maxEfficiency: Math.max(...DEVICES.map(device => device.efficiency), 0),
    maxCompositePerf: Math.max(...DEVICES.map(device => device.composite_perf), 0),
    maxEfficiencyPerf: Math.max(...DEVICES.map(device => device.efficiency_perf), 0)
  };

  countEl.textContent = filterQ.trim()
    ? `Showing ${filtered.length} of ${DEVICES.length} devices`
    : `${DEVICES.length} devices`;

  const headerHtml = visible.map(column => {
    const active = column.id === sortCol;
    const classes = [column.headerClass, active ? 'active' : ''].filter(Boolean).join(' ');
    const classAttr = classes ? ` class="${classes}"` : '';
    if (column.notSortable) {
      return `<th${classAttr} title="${escapeHtml(column.title)}">${column.label}</th>`;
    }
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

  benchmarkTable.querySelectorAll('.compare-checkbox').forEach(input => {
    input.addEventListener('change', () => toggleCompare(input.dataset.deviceId));
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

function getMultiSeriesState(meta) {
  if (!multiSeriesState.has(activeChart)) {
    multiSeriesState.set(activeChart, {
      sort: meta.defaultSortSeries ?? meta.series[0].key,
      mode: meta.defaultMode ?? 'stacked',
      visible: new Set(meta.defaultVisibleSeries ?? meta.series.map(series => series.key))
    });
  }

  return multiSeriesState.get(activeChart);
}

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
      const delta = Math.abs(value - previousValue);
      const w = ((delta / globalMax) * 100).toFixed(2);
      segments += `<div class="chart-segment" data-w="${w}" style="width:0;background:var(${series.colorVar})" title="${series.label}: ${fmt(value)}${meta.unit} (delta ${fmt(Math.round(delta))})"></div>`;
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
  const state = getMultiSeriesState(meta);
  const enabledSeries = meta.series.filter(series => state.visible.has(series.key));
  const enabledMeta = { ...meta, series: enabledSeries };
  const devices = DEVICES.filter(device => enabledSeries.some(series => device[series.key] != null));

  if (!devices.length) {
    renderChartMessage(meta.emptyMessage ?? 'No chart data available.');
    return;
  }

  // Global max across all series for proportional bar sizing
  const globalMax = Math.max(...devices.flatMap(device => enabledSeries.map(series => device[series.key] ?? 0)), 0);

  const sortDirection = meta.lowerBetter ? 1 : -1;
  const sorted = [...devices].sort((a, b) => {
    const av = a[state.sort];
    const bv = b[state.sort];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDirection * (av - bv);
  });

  // ── Controls ──
  const sortPills = enabledSeries.map(s => `
    <button class="chart-sort-pill${state.sort === s.key ? ' active' : ''}" data-sort="${s.key}">${s.label}</button>
  `).join('');

  const modeBtns = `
    <button class="chart-mode-btn${state.mode === 'stacked' ? ' active' : ''}" data-mode="stacked" title="Stacked bars">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="3" rx="1" fill="currentColor"/><rect x="1" y="8" width="12" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>
    </button>
    <button class="chart-mode-btn${state.mode === 'grouped' ? ' active' : ''}" data-mode="grouped" title="Grouped bars">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="5.5" y="2" width="4" height="10" rx="1" fill="currentColor" opacity=".6"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor" opacity=".3"/></svg>
    </button>`;

  // ── Legend ──
  const legendHtml = `
    <div class="chart-legend">
      ${meta.series.map(s => `
        <button type="button" class="legend-item${state.visible.has(s.key) ? ' active' : ''}" data-series="${s.key}" aria-pressed="${state.visible.has(s.key)}" ${enabledSeries.length === 1 && state.visible.has(s.key) ? 'disabled' : ''}>
          <span class="legend-dot" style="background:var(${s.colorVar})"></span>
          <span>${s.label}</span>
        </button>`).join('')}
      ${state.mode === 'stacked' ? `<span class="legend-hint">Segments show delta from previous series</span>` : ''}
    </div>`;

  // ── Rows ──
  const rowsHtml = sorted.map((device, idx) => {
    const isTop = idx < 3;
    const allVals = enabledSeries.map(s => device[s.key] != null ? `${fmt(device[s.key])}` : '—').join(' / ');
    const numTitle = `${enabledSeries.map(s => `${s.label}: ${device[s.key] != null ? fmt(device[s.key]) + meta.unit : '—'}`).join(', ')}`;

    if (state.mode === 'stacked') {
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
      state.sort = btn.dataset.sort;
      renderChart();
    });
  });

  chartBox.querySelectorAll('.legend-item[data-series]').forEach(btn => {
    btn.addEventListener('click', () => {
      const seriesKey = btn.dataset.series;
      if (state.visible.has(seriesKey)) {
        if (state.visible.size === 1) return;
        state.visible.delete(seriesKey);
        if (state.sort === seriesKey) {
          const nextSeries = meta.series.find(series => state.visible.has(series.key));
          state.sort = nextSeries?.key ?? meta.series[0].key;
        }
      } else {
        state.visible.add(seriesKey);
      }
      renderChart();
    });
  });

  // Mode toggle listeners
  chartBox.querySelectorAll('.chart-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
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
    compareSelection = loadCompareSelection();
    updateSiteMeta();
    renderInfoCards();
    renderTable();
    renderChart();
    syncDeviceDetailFromUrl();
    syncCompareFromUrl();
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