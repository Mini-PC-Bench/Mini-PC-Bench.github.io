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
const META_SUFFIX = 'Cinebench R23 &nbsp;·&nbsp; Geekbench 6 &nbsp;·&nbsp; 3DMark &nbsp;·&nbsp; H264 &nbsp;·&nbsp; Power draw &nbsp;·&nbsp; Efficiency score';

// Numeric range filters offered in the filter panel. Extend this list to add more filters;
// coverage for a new field should be checked first with scripts/devices/report-field-coverage.ps1.
const FILTER_GROUPS = [
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'power', label: 'Power' },
  { id: 'physical', label: 'Physical' },
  { id: 'noise', label: 'Noise' }
];
const FILTER_DEFS = [
  { id: 'watts', group: 'power', label: 'Max power draw', unit: 'W', mode: 'max', step: 5 },
  { id: 'power_idle_watts', group: 'power', label: 'Max idle power', unit: 'W', mode: 'max', step: 1 },
  { id: 'volume', group: 'physical', label: 'Max volume', unit: 'L', mode: 'max', step: 0.1 },
  { id: 'noise_idle', group: 'noise', label: 'Max idle noise', unit: 'dB', mode: 'max', step: 1 },
  { id: 'noise_load', group: 'noise', label: 'Max load noise', unit: 'dB', mode: 'max', step: 1 },
  { id: 'cb23s', group: 'benchmarks', label: 'Min Cinebench R23 single-core', unit: 'pts', mode: 'min', step: 50 },
  { id: 'cb23m', group: 'benchmarks', label: 'Min Cinebench R23 multi-core', unit: 'pts', mode: 'min', step: 500 }
];

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
  { id: 'cb23s', label: 'CB R23 SC', pickerLabel: 'CB R23 Single', title: 'Cinebench R23 Single Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('cb23s', 'CB R23 SC', 'CB R23 Single', 'Cinebench R23 Single Core (Performance profile; higher is better)'),
  { id: 'cb23m', label: 'CB R23 MC', pickerLabel: 'CB R23 Multi', title: 'Cinebench R23 Multi Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('cb23m', 'CB R23 MC', 'CB R23 Multi', 'Cinebench R23 Multi Core (Performance profile; higher is better)'),
  { id: 'gb6s', label: 'GB6 SC', pickerLabel: 'GB6 Single', title: 'Geekbench 6 Single Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('gb6s', 'GB6 SC', 'GB6 Single', 'Geekbench 6 Single Core (Performance profile; higher is better)'),
  { id: 'gb6m', label: 'GB6 MC', pickerLabel: 'GB6 Multi', title: 'Geekbench 6 Multi Core (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('gb6m', 'GB6 MC', 'GB6 Multi', 'Geekbench 6 Multi Core (Performance profile; higher is better)'),
  { id: 'gbai_cpu_single', label: 'GB AI CPU', pickerLabel: 'Geekbench AI CPU (Single)', title: 'Geekbench AI CPU Single score (higher is better)', sortDefaultDir: -1 },
  { id: 'gbai_gpu_single', label: 'GB AI GPU', pickerLabel: 'Geekbench AI GPU (Single)', title: 'Geekbench AI GPU Single score (higher is better)', sortDefaultDir: -1 },
  { id: 'firestrike', label: 'FireStrike', pickerLabel: 'Fire Strike', title: '3DMark Fire Strike - DirectX 11 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('firestrike', 'FireStrike', 'Fire Strike', '3DMark Fire Strike - DirectX 11 GPU benchmark (Performance profile; higher is better)'),
  { id: 'timespy', label: 'Time Spy', pickerLabel: 'Time Spy', title: '3DMark Time Spy - DirectX 12 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('timespy', 'Time Spy', 'Time Spy', '3DMark Time Spy - DirectX 12 GPU benchmark (Performance profile; higher is better)'),
  { id: 'steelnomad', label: 'Steel Nomad L', pickerLabel: 'Steel Nomad Light', title: '3DMark Steel Nomad Light score (higher is better)', sortDefaultDir: -1 },
  createPerformanceColumn('steelnomad', 'Steel Nomad L', 'Steel Nomad Light', '3DMark Steel Nomad Light score (Performance profile; higher is better)'),
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
  steelnomad: createPerformanceChart('steelnomad', '3DMark Steel Nomad Light', 'Higher is better'),
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
  steelnomad: { label: '3DMark Steel Nomad Light' },
  steelnomad_perf: { label: '3DMark Steel Nomad Light (Performance)' },
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

const multiSeriesState = new Map();

const benchmarkTable = document.getElementById('benchmark-table');
const infoGrid = document.getElementById('info-grid');
const countEl = document.getElementById('count');
const siteMetaEl = document.getElementById('site-meta');
const chartBox = document.getElementById('chart-box');
const infoGridCaptionEl = document.getElementById('info-grid-caption');
const searchInputEl = document.getElementById('search');
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

const fmt = v => v == null ? '—' : v.toLocaleString();
const fmtD = (v, d = 1) => v == null ? '—' : v.toFixed(d);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(key);
  return raw && raw.trim() ? raw.trim() : null;
}

// Single writer for every URL param (device id today; filter params join it in a later phase).
function writeUrlState(updates, { replace = false } = {}) {
  const url = new URL(window.location.href);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
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

  FILTER_BOUNDS = {};
  FILTER_DEFS.forEach(def => {
    const values = DEVICES.map(device => device[def.id]).filter(value => value != null);
    FILTER_BOUNDS[def.id] = values.length
      ? { min: Math.min(...values), max: Math.max(...values), present: values.length }
      : { min: 0, max: 0, present: 0 };
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

// Pure: reads only its arguments plus FILTER_DEFS, so it never depends on render state.
function deviceMatchesFilters(device, state) {
  const q = state.q.trim().toLowerCase();
  if (q && !device.name.toLowerCase().includes(q)) return false;

  for (const def of FILTER_DEFS) {
    const limit = state.ranges[def.id];
    if (limit == null) continue;

    const value = device[def.id];
    if (value == null) {
      if (state.includeUnknown) continue;
      return false;
    }

    if (def.mode === 'max' && value > limit) return false;
    if (def.mode === 'min' && value < limit) return false;
  }

  return true;
}

function getFiltered() {
  return DEVICES.filter(device => deviceMatchesFilters(device, filterState));
}

function isAnyFilterActive() {
  return filterState.q.trim().length > 0 || Object.keys(filterState.ranges).length > 0;
}

function formatDeviceCountLabel(shownCount) {
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
    if (!devices.length) tbody.innerHTML = '<tr><td class="table-message">No matching devices.</td></tr>';
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
      ${bodyHtml || '<tr><td class="table-message">No matching devices.</td></tr>'}
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

function getStackedTotal(device, seriesList) {
  let previousValue = null;
  let total = 0;

  seriesList.forEach(series => {
    const value = device[series.key];
    if (value == null) return;
    total += previousValue == null ? value : Math.abs(value - previousValue);
    previousValue = value;
  });

  return total;
}

function buildStackedSegments(device, meta, globalStackMax) {
  if (!meta.series.some(series => device[series.key] != null)) {
    return `<span class="chart-segment-empty">no data</span>`;
  }

  const toPct = v => v != null && globalStackMax ? ((v / globalStackMax) * 100).toFixed(2) : '0';
  let segments = '';
  let separators = '';
  const presentSeries = meta.series.filter(series => device[series.key] != null);
  const rowTotal = getStackedTotal(device, presentSeries);
  let previousValue = null;
  let cumulative = 0;

  presentSeries.forEach(series => {
    const value = device[series.key];
    const delta = previousValue == null ? value : Math.abs(value - previousValue);
    if (delta <= 0) {
      previousValue = value;
      return;
    }

    const left = rowTotal ? (cumulative / rowTotal) * 100 : 0;
    const width = rowTotal ? (delta / rowTotal) * 100 : 0;
    const title = previousValue == null
      ? `${series.label}: ${fmt(value)}${meta.unit}`
      : `${series.label}: ${fmt(value)}${meta.unit} (delta ${fmt(Math.round(delta))})`;
    if (cumulative > 0) {
      separators += `<span class="chart-separator" aria-hidden="true" style="left:${left.toFixed(2)}%"></span>`;
    }
    segments += `<div class="chart-segment" data-w="${width.toFixed(2)}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;background:var(${series.colorVar})" title="${title}"></div>`;
    cumulative += delta;
    previousValue = value;
  });

  return `<div class="chart-stack-clip" style="width:${toPct(rowTotal)}%"><div class="chart-stack-content" style="width:100%">${segments}${separators}</div></div>`;
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
  const devices = getFiltered().filter(device => enabledSeries.some(series => device[series.key] != null));

  if (!devices.length) {
    renderChartMessage(meta.emptyMessage ?? 'No chart data available.');
    return;
  }

  // Global max across all series for proportional bar sizing
  const globalMax = Math.max(...devices.flatMap(device => enabledSeries.map(series => device[series.key] ?? 0)), 0);
  const globalStackMax = Math.max(...devices.map(device => getStackedTotal(device, enabledSeries)), 0);

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
      ${state.mode === 'stacked' ? `<span class="legend-hint">Segments show score deltas in legend order</span>` : ''}
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
          ${buildStackedSegments(device, enabledMeta, globalStackMax)}
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
          <div class="chart-desc">${meta.desc} &nbsp;·&nbsp; ${formatDeviceCountLabel(sorted.length)}</div>
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
    chartBox.querySelectorAll('.chart-stack-content').forEach(el => {
      el.style.transform = 'scaleX(1)';
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
  const allDevices = getFiltered().filter(device => device[activeChart] != null);
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
      <div class="chart-desc">${meta.desc} &nbsp;·&nbsp; ${formatDeviceCountLabel(sorted.length)}</div>
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
    normalizeDevices(data);
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
