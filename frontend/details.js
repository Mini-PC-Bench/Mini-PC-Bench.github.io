import { fmt, fmtD, escapeHtml } from './format.js';

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

function renderDetailLinks(device, linksLoaded) {
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

export { DETAIL_METRIC_GROUPS, DETAIL_METRICS, formatDetailMetricValue, renderDetailMetrics, renderDetailLinks, renderDetailPhoto, renderDeviceSummary };
