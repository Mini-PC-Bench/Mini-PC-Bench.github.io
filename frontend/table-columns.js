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

export { TABLE_COLUMNS, DEFAULT_VISIBLE_COLUMNS };
