import { FILTER_DEFS } from './filters.js';

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

function normalizeDevices(data) {
  const seenIds = new Set();

  const DEVICES = data.map(device => {
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

  const MAX_H = {};
  BENCH_HIGHER.forEach(column => {
    MAX_H[column] = Math.max(...DEVICES.map(device => device[column] ?? 0), 0);
  });

  const MIN_L = {};
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

  const FILTER_BOUNDS = {};
  FILTER_DEFS.forEach(def => {
    const values = DEVICES.map(device => device[def.id]).filter(value => value != null);
    FILTER_BOUNDS[def.id] = values.length
      ? { min: Math.min(...values), max: Math.max(...values), present: values.length }
      : { min: 0, max: 0, present: 0 };
  });
  return { DEVICES, MAX_H, MIN_L, FILTER_BOUNDS };
}

export { BENCH_HIGHER, BENCH_LOWER, normalizeDevices, normalizeDeviceLinks };
