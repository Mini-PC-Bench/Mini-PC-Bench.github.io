import { fmt, escapeHtml } from './format.js';

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

export function createCharts({ chartBox, getDevices, getFiltered, getActiveChart, formatDeviceCountLabel, openDeviceDetail }) {
  const multiSeriesState = new Map();

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

  // ── Multi-series chart helpers ──────────────────────────────────────────────

  function getMultiSeriesState(meta) {
    const activeChart = getActiveChart();
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
    const activeChart = getActiveChart();
    if (!getDevices().length) {
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

  return { renderChart, renderChartMessage, renderLoadingChart };
}
