# Mini PC Benchmarks

Static benchmark comparison page for mini PCs, designed to be hosted on GitHub Pages.

## Files

- `index.html` - main page markup
- `styles.css` - page styles
- `app.js` - client-side logic for loading data, rendering charts/table, and saving column visibility
- `devices.json` - benchmark dataset consumed by the page
- `device-links.json` - editorial links keyed by device id
- `source-device-map.json` - reviewed raw source-label ownership mappings used by the importer
- `sync-device-links.ps1` - adds missing empty link entries from `devices.json`

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Set the source to deploy from your default branch.
4. Open the published URL after Pages finishes building.

The page fetches `devices.json` and `device-links.json` at runtime, so it should be served over HTTP or HTTPS. Opening the HTML directly with `file://` will usually fail because browsers block local `fetch()` requests.

## Local Preview

### Linux / macOS

Run a simple static server from this folder:

```bash
python3 -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123/
```

### Windows

No Python or Node required. Run the included PowerShell script (as Administrator):

```powershell
.\serve.ps1
```

Then open:

```text
http://localhost:80/
```

> **Note:** Port 80 requires an elevated PowerShell session. Alternatively, change the port in `serve.ps1` to anything above 1024 (e.g. `8123`) to run without Administrator privileges.

## Data Format

`devices.json` must contain an array of device objects. Example:

```json
[
  {
    "id": "example-device",
    "name": "Example Device",
    "cb23s": 2000,
    "cb23m": 15000,
    "gb6s": 2800,
    "gb6m": 14000,
    "watts": 80,
    "handbrake": 90,
    "firestrike": 9000,
    "timespy": 3500,
    "noise": {
      "idle": 29,
      "load_default": 40,
      "load_performance": 45
    },
    "power_idle_watts": 8
  }
]
```

`device-links.json` stores links separately and is keyed by the same stable device id:

```json
{
  "example-device": [
    {
      "label": "Affiliate link",
      "url": "https://example.com/buy",
      "kind": "affiliate"
    },
    {
      "label": "YouTube review",
      "url": "https://youtube.com/watch?v=example",
      "kind": "youtube"
    }
  ]
}
```

## Add a New Mini PC Entry

Use this workflow each time you review a new device.

1. Open `devices.json`.
2. Add one new object inside the top-level array.
3. Add the same `id` key to `device-links.json` with either `[]` or a list of links.
4. Keep field names exactly as shown below.
5. Save the files and refresh the page.
6. Check table view, chart view, search, and the device details popup.

#### Copy/Paste Template

```json
{
  "id": "brand-model-cpu",
  "name": "Brand Model CPU",
  "cb23s": null,
  "cb23m": null,
  "gb6s": null,
  "gb6m": null,
  "gbai_cpu": null,
  "gbai_gpu": null,
  "watts": null,
  "handbrake": null,
  "h264": null,
  "av1": null,
  "av1_hw": null,
  "firestrike": null,
  "timespy": null,
  "steelnomad": null,
  "coding": null,
  "photoshop": null,
  "premiere": null,
  "storage": null,
  "wireless_audio": null,
  "cpu_temp": null,
  "ssd_temp": null,
  "volume": null,
  "noise": {
    "idle": null,
    "load_default": null,
    "load_performance": null
  },
  "power_idle_watts": null
}
```

```json
{
  "brand-model-cpu": []
}
```

#### Field Reference

- `id`: Stable slug used to map links and identify the device internally. Keep it unique and do not reuse it for another product.
- `name`: Device label shown in table/cards/charts.
- `cb23s`: Cinebench R23 single-core score. Higher is better.
- `cb23m`: Cinebench R23 multi-core score. Higher is better.
- `gb6s`: Geekbench 6 single-core score. Higher is better.
- `gb6m`: Geekbench 6 multi-core score. Higher is better.
- `gbai_cpu`: Geekbench AI CPU score. Higher is better.
- `gbai_gpu`: Geekbench AI GPU score. Higher is better.
- `watts`: Maximum power draw from the wall under load. Lower is better.
- `handbrake`: H264 encode time in seconds. Lower is better.
- `av1`: AV1 software encode time in seconds. Lower is better.
- `av1_hw`: AV1 hardware encode time in seconds. Lower is better.
- `firestrike`: 3DMark Fire Strike score. Higher is better.
- `timespy`: 3DMark Time Spy score. Higher is better.
- `steelnomad`: 3DMark Steel Nomad score. Higher is better.
- `coding`: Coding benchmark score. Higher is better.
- `photoshop`: Photoshop benchmark score. Higher is better.
- `premiere`: Premiere benchmark score. Higher is better.
- `storage`: 3DMark Storage Benchmark score. Higher is better.
- `wireless_audio`: Wireless Bluetooth audio benchmark score. Higher is better.
- `cpu_temp`: Maximum CPU temperature under load in C. Lower is better.
- `ssd_temp`: SSD temperature under load in C. Lower is better.
- `volume`: Chassis volume in liters. Lower is better.
- `noise.idle`: Fan noise at idle in dB(A) at 30 cm. Lower is better.
- `noise.load_default`: Fan noise under load in default profile. Lower is better.
- `noise.load_performance`: Fan noise under load in performance profile. Lower is better.
- `power_idle_watts`: Idle power draw from the wall. Lower is better.

### Link File Reference

- `label`: Link text shown in the popup.
- `url`: Full outbound URL.
- `kind`: Short type tag. Current UI has built-in icons for `affiliate` and `youtube`.
- Link order is preserved exactly as written in `device-links.json`.
- If a mini PC has no links yet, use an empty array: `"device-id": []`.

## Source Data Workflow

There are two PowerShell scripts for working with the raw CSV files in `source`:

- `./process-source.ps1` updates `devices.json` by resolving source labels to canonical device names.
- `./transpose-source.ps1` exports a flat CSV for inspection without any name matching or consolidation.

### Import into devices.json

Use the importer script to map benchmark values from the `source` folder into `devices.json`:

```powershell
./process-source.ps1
```

Optional parameters:

```powershell
./process-source.ps1 -SourceDir ./source -DevicesPath ./devices.json -AutoAddDevices $false
```

- `SourceDir`: path to the source CSV folder (default: `./source`)
- `DevicesPath`: path to devices.json (default: `./devices.json`)
- `AutoAddDevices`: if `$true`, automatically create new device entries for unresolved non-component labels; if `$false` (default), add unresolved names to the report

The importer reads the benchmark CSVs, selects the preferred row per file, resolves each source device label, and writes the merged metrics back into `devices.json`. When `AutoAddDevices` is enabled, new devices are added with all metrics set to `null` and populated as metrics are imported. The importer also ensures every device has a stable unique `id`.

GPU and storage benchmark headers may describe a component rather than the whole host, for example `Minisforum AtomMan G1 Pro RTX 5060` or `Minisforum AtomMan G1 Pro 1TB Kingston (Gen4)`. For GPU metrics, the importer removes the GPU suffix before matching; for storage metrics, it removes capacity, drive vendor, and generation suffixes. These resolutions are reported during import and their values are written to the host device. This context-specific normalization is not applied to CPU or application benchmarks.

At the start of an import, the script also checks existing records whose names are clearly GPU or storage variants. A component record is removed only when it matches a host and has no conflicting non-null metrics. If both records contain different benchmark values, the records are retained and the script prints `Skipped conflicting component device ...`; this usually indicates a real hardware configuration variant, such as the same chassis with a different discrete GPU.

Keep `AutoAddDevices` disabled until component resolutions and unresolved names have been reviewed. A source label should become a new device only when it represents a separately tracked physical configuration, not merely a GPU, SSD, drive-generation, or storage-capacity label.

### Resolver Order

`process-source.ps1` resolves source labels in this order:

1. `mapping`: exact source label exists in `source-device-map.json` and points to a valid device id.
2. `exact`: source label exactly matches a device name in `devices.json`.
3. `unresolved`: no explicit or exact match exists.

The importer does not use fuzzy matching or component-name stripping to decide device identity. Unresolved labels from GPU and storage benchmark scopes are listed as potential component orphans until they receive an explicit mapping.

### Source Mapping File

`source-device-map.json` maps each reviewed raw CSV label to the stable `id` of its owner device. Mapping targets are validated before import. Keep the raw CSV labels unchanged and add a mapping entry when a label is a component or naming variant of an existing device.

When `AutoAddDevices` creates a new device, it assigns a stable slug derived from the device name. If that slug already exists, it adds a numeric suffix such as `-2`. Existing ids are preserved, so links remain stable.

### Importer Output

`process-source.ps1` logs the result of the import run:

- `Updated metric entries`: number of metrics written into `devices.json`
- `Explicit source mappings used`: reviewed source labels resolved through `source-device-map.json`
- `Unresolved source names`: labels that still need either a mapping or a new device entry
- `Potential component orphans`: unresolved labels from GPU or storage benchmark scopes that need explicit ownership

Example output:

```text
Updated metric entries: 746

Explicit source mappings used:
  'Minisforum M1 Pro 1TB Kingston (Gen4)' -> 'Minisforum M1 Pro-125H'
```

### Export Raw Source Labels

Use the transpose script when you want to inspect the raw source labels without any matching logic:

```powershell
./transpose-source.ps1
```

Optional parameters:

```powershell
./transpose-source.ps1 -SourceDir ./source -OutputCsv ./source-transposed.csv
```

This writes a CSV with one row per raw device label and one column per metric. It preserves variant labels as separate rows, which makes it useful for auditing unresolved names, storage variants, and generation-tag variants.

## New Device Naming Scheme

Use this canonical naming pattern for every new entry in `devices.json`:

```text
Brand Model CPU
```

Examples:

- `Beelink SER10 MAX HX 470`
- `ASUS NUC 15 Pro+ Ultra 9 285H`
- `GEEKOM IT15 Ultra 9 285H`

Guidelines:

- Keep the full brand and model first.
- Keep CPU SKU at the end.
- Do not include storage size (`512GB`, `1TB`) in canonical device names.
- Do not include SSD generation tags (`Gen3`, `Gen4`, `Gen5`) in canonical device names.
- Keep one canonical name per physical device model/CPU combination.

## Resolve Unresolved Source Names

When `process-source.ps1` reports unresolved names, use this decision flow:

1. If the unresolved name belongs to an existing device, add an entry to `source-device-map.json` using that device's `id`.
2. If it is a truly new device, add a new object to `devices.json` using the template above.
3. Add the same `id` to `device-links.json`, usually with `[]` first.
4. Run the importer again and confirm the unresolved and orphan lists are reduced or empty.

### Mapping Example

```json
{
  "Source Label With Storage/Gen Suffix": "existing-device-id"
}
```

### Handling Unresolved Names

Treat the unresolved list as a work queue for the current import run:

- add new devices for models you want to track in `devices.json`
- add explicit mappings for labels that represent existing devices with extra storage or generation suffixes
- use `./transpose-source.ps1` to inspect the exact raw labels before deciding which path to take

### Notes

- Use numbers (not quoted strings) for all benchmark, power, and noise values.
- For optional metrics with missing data, use `null` instead of `0`.
- Keep `devices.json` valid JSON: commas between objects, no trailing commas.
- Keep `device-links.json` valid JSON and keyed by existing device ids.
- The app recalculates overall score and efficiency automatically from the numeric fields.
- Prefer explicit mappings for ambiguous labels or labels that must not depend on name similarity.
- Use `./transpose-source.ps1` to inspect the exact raw source labels before adding aliases.

## Default Visible Columns

To change which optional columns are visible by default for first-time visitors, edit `DEFAULT_VISIBLE_COLUMNS` in `app.js`.

Visitors can change visible columns from the `Columns` button in the table toolbar. Their selection is stored in local storage under:

```text
minipc-benchmarks.visible-columns
```

Use `Reset defaults` in the picker to restore the configured defaults.
