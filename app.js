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

const BENCH_HIGHER = ['cb23s', 'cb23m', 'gb6s', 'gb6m', 'firestrike', 'timespy'];
const BENCH_LOWER = ['handbrake', 'noise_idle', 'noise_load', 'noise_perf', 'power_idle_watts'];

const TABLE_COLUMNS = [
  { id: 'name', label: 'Device', pickerLabel: 'Device', title: 'Device name', headerClass: 'col-name', cellClass: 'col-name', alwaysVisible: true, sortDefaultDir: 1 },
  { id: 'cb23s', label: 'CB R23 1T', pickerLabel: 'CB R23 Single', title: 'Cinebench R23 Single Core (higher is better)', sortDefaultDir: -1 },
  { id: 'cb23m', label: 'CB R23 nT', pickerLabel: 'CB R23 Multi', title: 'Cinebench R23 Multi Core (higher is better)', sortDefaultDir: -1 },
  { id: 'gb6s', label: 'GB6 1T', pickerLabel: 'GB6 Single', title: 'Geekbench 6 Single Core (higher is better)', sortDefaultDir: -1 },
  { id: 'gb6m', label: 'GB6 nT', pickerLabel: 'GB6 Multi', title: 'Geekbench 6 Multi Core (higher is better)', sortDefaultDir: -1 },
  { id: 'firestrike', label: 'FireStrike', pickerLabel: 'Fire Strike', title: '3DMark Fire Strike - DirectX 11 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  { id: 'timespy', label: 'Time Spy', pickerLabel: 'Time Spy', title: '3DMark Time Spy - DirectX 12 GPU benchmark (higher is better)', sortDefaultDir: -1 },
  { id: 'handbrake', label: 'HB (s) ↓', pickerLabel: 'HandBrake', title: 'HandBrake video encode time in seconds (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
  { id: 'watts', label: 'Watts ↓', pickerLabel: 'Max Power Draw', title: 'Maximum power draw from wall under load (lower is better)', lowerBetter: true, cellClass: 'watts-cell', sortDefaultDir: 1 },
  { id: 'power_idle_watts', label: 'Idle W ↓', pickerLabel: 'Idle Power', title: 'Power draw at idle in watts (lower is better)', lowerBetter: true, sortDefaultDir: 1 },
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
  firestrike: { title: '3DMark Fire Strike', desc: 'Higher is better · DirectX 11 GPU benchmark', unit: '', lowerBetter: false },
  timespy: { title: '3DMark Time Spy', desc: 'Higher is better · DirectX 12 GPU benchmark', unit: '', lowerBetter: false },
  handbrake: { title: 'HandBrake Video Encode', desc: 'Lower is better · seconds to encode sample video', unit: 's', lowerBetter: true },
  watts: { title: 'Maximum Power Draw from the Wall', desc: 'Lower is better · watts under full CPU load', unit: 'W', lowerBetter: true },
  power_idle_watts: { title: 'Power Draw at Idle', desc: 'Lower is better · watts at desktop idle', unit: 'W', lowerBetter: true },
  noise_load: { title: 'Fan Noise at Load (Default Profile)', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true },
  noise_perf: { title: 'Fan Noise at Load (Performance Profile)', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true },
  noise_idle: { title: 'Fan Noise at Idle', desc: 'Lower is better · dB(A) measured at 30 cm', unit: 'dB', lowerBetter: true }
};

let DEVICES = [];
let MAX_H = {};
let MIN_L = {};
let visibleColumns = new Set();
let sortCol = 'composite';
let sortDir = -1;
let filterQ = '';
let activeChart = 'cb23s';

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
    : column.id === 'power_idle_watts'
      ? 'W'
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

function renderChart() {
  if (!DEVICES.length) {
    renderChartMessage('No chart data available.');
    return;
  }

  const meta = CHART_META[activeChart];
  const isLower = meta.lowerBetter;
  const allDevices = DEVICES.filter(device => device[activeChart] != null);
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
