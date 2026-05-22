const DATA_URL = './devices.json';
const COLUMN_STORAGE_KEY = 'minipc-benchmarks.visible-columns';
const META_SUFFIX = 'Cinebench R23 &nbsp;·&nbsp; Geekbench 6 &nbsp;·&nbsp; 3DMark &nbsp;·&nbsp; HandBrake &nbsp;·&nbsp; Power draw &nbsp;·&nbsp; Efficiency score';

// Edit this list to define which optional columns are enabled for first-time visitors.
const DEFAULT_VISIBLE_COLUMNS = [
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'firestrike',
  'timespy',
  'handbrake',
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
  'coding',
  'photoshop',
  'premiere',
  'storage',
  'wireless_audio'
];
const BENCH_LOWER = [
  'handbrake',
  'h264',
  'av1',
  'av1_hw',
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
  { id: 'coding', label: 'Coding', pickerLabel: 'Coding', title: 'Coding benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'photoshop', label: 'Photoshop', pickerLabel: 'Photoshop', title: 'Photoshop benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'premiere', label: 'Premiere', pickerLabel: 'Premiere', title: 'Premiere benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'storage', label: 'Storage', pickerLabel: 'Storage Benchmark', title: '3DMark Storage Benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'wireless_audio', label: 'BT Audio', pickerLabel: 'Wireless BT Audio', title: 'Wireless Bluetooth audio benchmark score (higher is better)', sortDefaultDir: -1 },
  { id: 'handbrake', label: 'HB (s) ↓', pickerLabel: 'HandBrake', title: 'HandBrake video encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
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
  coding: { title: 'Coding', desc: 'Higher is better', unit: '', lowerBetter: false },
  photoshop: { title: 'Photoshop', desc: 'Higher is better', unit: '', lowerBetter: false },
  premiere: { title: 'Premiere', desc: 'Higher is better', unit: '', lowerBetter: false },
  storage: { title: '3DMark Storage Benchmark', desc: 'Higher is better', unit: '', lowerBetter: false },
  wireless_audio: { title: 'Wireless Bluetooth Audio', desc: 'Higher is better', unit: '', lowerBetter: false },
  handbrake: { title: 'HandBrake Video Encode', desc: 'Lower is better · seconds to encode sample video', unit: 's', lowerBetter: true },
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
    series: [
      { key: 'noise_idle', label: 'Idle', colorVar: '--noise1' },
      { key: 'noise_load', label: 'Load', colorVar: '--noise2' },
      { key: 'noise_perf', label: 'Performance', colorVar: '--noise3' }
    ]
  }
};

let DEVICES = [];
let MAX_H = {};
let MIN_L = {};
let visibleColumns = new Set();
let sortCol = 'composite';
let sortDir = -1;
let filterQ = '';
let activeChart = 'cb23s';

// Multi-series chart state
let multiSeriesSort = 'noise_load';
let multiSeriesMode = 'stacked'; // 'stacked' | 'grouped'

const benchmarkTable = document.getElementById('benchmark-table');
const infoGrid = document.getElementById('info-grid');
const countEl = document.getElementById('count');
const siteMetaEl = document.getElementById('site-meta');
const chartBox = document.getElementById('chart-box');
const columnToggleBtn = document.getElementById('column-toggle');
const columnMenuEl = document.getElementById('column-menu');
const columnOptionsEl = document.getElementById('column-options');

const fmt = v => v == null ? '—' : v.toLocaleString();
const fmtD = (v, d = 1) => v == null ? '—' : v.toFixed(d);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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

function renderChartMessage(message) {
  chartBox.innerHTML = `<div class="chart-head"><div class="chart-title">Charts</div><div class="chart-desc">${escapeHtml(message)}</div></div>`;
}

function normalizeDevices(data) {
  DEVICES = data.map(device => ({
    ...device,
    handbrake: device.handbrake ?? device.h264 ?? null,
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
  }));

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

function renderInfoCards() {
  if (!DEVICES.length) {
    infoGrid.innerHTML = '';
    return;
  }

  const byScore = [...DEVICES].sort((a, b) => b.composite - a.composite);
  const byEff = [...DEVICES].sort((a, b) => b.efficiency - a.efficiency);
  const byGpu = [...DEVICES].sort((a, b) => b.firestrike - a.firestrike);
  const byQuiet = [...DEVICES].sort((a, b) => a.noise_load - b.noise_load);
  const byIdle = [...DEVICES].sort((a, b) => a.power_idle_watts - b.power_idle_watts);
  const byWatts = [...DEVICES].sort((a, b) => a.watts - b.watts);

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
  const suffix = column.id === 'handbrake'
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
    if (device.affiliateLink) {
      return `<td class="col-name"><a href="${escapeHtml(device.affiliateLink)}" target="_blank" rel="noopener noreferrer" title="View on retailer">${escapeHtml(device.name)}</a></td>`;
    }
    return `<td class="col-name">${escapeHtml(device.name)}</td>`;
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
  const [s0, s1, s2] = meta.series;
  const v0 = device[s0.key];
  const v1 = device[s1.key];
  const v2 = device[s2.key];

  if (v0 == null && v1 == null && v2 == null) {
    return `<span class="chart-segment-empty">no data</span>`;
  }

  const toW = v => v != null && globalMax ? ((v / globalMax) * 100).toFixed(2) : '0';
  let segments = '';

  // Segment 0: idle absolute
  if (v0 != null) {
    segments += `<div class="chart-segment" data-w="${toW(v0)}" style="width:0;background:var(${s0.colorVar})" title="${s0.label}: ${fmt(v0)}${meta.unit}"></div>`;
  }

  // Segment 1: load delta (or absolute if idle missing)
  if (v1 != null) {
    if (v0 != null) {
      const delta = Math.max(v1 - v0, 0);
      const w = ((delta / globalMax) * 100).toFixed(2);
      segments += `<div class="chart-segment" data-w="${w}" style="width:0;background:var(${s1.colorVar})" title="${s1.label}: ${fmt(v1)}${meta.unit} (+${fmt(Math.round(delta))})"></div>`;
    } else {
      segments += `<div class="chart-segment" data-w="${toW(v1)}" style="width:0;background:var(${s1.colorVar})" title="${s1.label}: ${fmt(v1)}${meta.unit}"></div>`;
    }
  }

  // Segment 2: perf delta (or absolute if load missing)
  if (v2 != null) {
    const base = v1 ?? v0;
    if (base != null) {
      const delta = Math.max(v2 - base, 0);
      const w = ((delta / globalMax) * 100).toFixed(2);
      segments += `<div class="chart-segment" data-w="${w}" style="width:0;background:var(${s2.colorVar})" title="${s2.label}: ${fmt(v2)}${meta.unit} (+${fmt(Math.round(delta))})"></div>`;
    } else {
      segments += `<div class="chart-segment" data-w="${toW(v2)}" style="width:0;background:var(${s2.colorVar})" title="${s2.label}: ${fmt(v2)}${meta.unit}"></div>`;
    }
  }

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
  const devices = DEVICES.filter(d => meta.series.some(s => d[s.key] != null));

  if (!devices.length) {
    renderChartMessage('No noise data available.');
    return;
  }

  // Global max across all series for proportional bar sizing
  const globalMax = Math.max(...devices.flatMap(d => meta.series.map(s => d[s.key] ?? 0)), 0);

  // Sort by selected series key (lower is better for noise)
  const sorted = [...devices].sort((a, b) => {
    const av = a[multiSeriesSort] ?? Infinity;
    const bv = b[multiSeriesSort] ?? Infinity;
    return av - bv;
  });

  // ── Controls ──
  const sortPills = meta.series.map(s => `
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
        <span class="legend-item">
          <span class="legend-dot" style="background:var(${s.colorVar})"></span>
          <span>${s.label}</span>
        </span>`).join('')}
      ${multiSeriesMode === 'stacked' ? `<span class="legend-hint">Segments show delta from previous profile</span>` : ''}
    </div>`;

  // ── Rows ──
  const rowsHtml = sorted.map((device, idx) => {
    const isTop = idx < 3;
    const primaryVal = device[multiSeriesSort];
    const allVals = meta.series.map(s => device[s.key] != null ? `${fmt(device[s.key])}` : '—').join(' / ');
    const numTitle = `${meta.series.map(s => `${s.label}: ${device[s.key] != null ? fmt(device[s.key]) + meta.unit : '—'}`).join(', ')}`;

    if (multiSeriesMode === 'stacked') {
      return `<div class="chart-row">
        <div class="chart-label${isTop ? ' top' : ''}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</div>
        <div class="chart-track chart-track-stacked">
          ${buildStackedSegments(device, meta, globalMax)}
        </div>
        <span class="chart-num chart-num-multi${isTop ? ' top' : ''}" title="${escapeHtml(numTitle)}">${allVals}${meta.unit}</span>
      </div>`;
    } else {
      return `<div class="chart-row chart-row-grouped">
        <div class="chart-label${isTop ? ' top' : ''}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</div>
        <div class="chart-track-group">
          ${buildGroupedTracks(device, meta, globalMax)}
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

  // Mode toggle listeners
  chartBox.querySelectorAll('.chart-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      multiSeriesMode = btn.dataset.mode;
      renderChart();
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
      <div class="chart-label${isTop ? ' top' : ''}" title="${escapeHtml(device.name)}">${escapeHtml(device.name)}</div>
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
}

function setLoadingState() {
  siteMetaEl.textContent = 'Loading benchmark data…';
  countEl.textContent = 'Loading data…';
  renderTableMessage('Loading benchmark data…');
  renderChartMessage('Loading benchmark data…');
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
  } catch (error) {
    console.error(error);
    setErrorState('Could not load devices.json. Serve this folder over HTTP or open the GitHub Pages site instead of using file://.');
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(item => item.classList.toggle('active', item === btn));
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
  if (event.key === 'Escape') setColumnMenuOpen(false);
});

visibleColumns = loadVisibleColumns();
renderColumnPicker();
loadData();