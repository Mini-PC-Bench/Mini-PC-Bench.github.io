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

export { FILTER_GROUPS, FILTER_DEFS, deviceMatchesFilters };
