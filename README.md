# Mini PC Benchmarks

Static benchmark comparison page for mini PCs, designed to be hosted on GitHub Pages.

## Files

- `index.html` - main page markup
- `styles.css` - page styles
- `app.js` - client-side logic for loading data, rendering charts/table, and saving column visibility
- `devices.json` - benchmark dataset consumed by the page

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Set the source to deploy from your default branch.
4. Open the published URL after Pages finishes building.

The page fetches `devices.json` at runtime, so it should be served over HTTP or HTTPS. Opening the HTML directly with `file://` will usually fail because browsers block local `fetch()` requests.

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
    "power_idle_watts": 8,
    "affiliateLink": "https://example.com/affiliate-link"
  }
]
```

## Add a New Mini PC Entry

Use this workflow each time you review a new device.

1. Open `devices.json`.
2. Add one new object inside the top-level array.
3. Keep field names exactly as shown below.
4. Save the file and refresh the page.
5. Check table view, chart view, and search for the new device name.

#### Copy/Paste Template

```json
{
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
  "power_idle_watts": null,
  "affiliateLink": ""
}
```

#### Field Reference

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
- `affiliateLink`: Optional URL used for clickable device name. Leave `""` for no link.

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
./process-source.ps1 -SourceDir ./source -DevicesPath ./devices.json
```

The importer reads the benchmark CSVs, selects the preferred row per file, resolves each source device label, and writes the merged metrics back into `devices.json`.

### Resolver Order

`process-source.ps1` resolves source labels in this order:

1. `alias`: exact match in the `$aliases` table.
2. `canonical`: normalized source name matches a normalized canonical device name already in `devices.json`.
3. `fuzzy`: token overlap score is high enough to auto-resolve the device.
4. `unresolved`: no safe match was found.

### Name Normalization Rules

The resolver normalizes names before canonical and fuzzy matching:

- lowercases the label
- removes parenthetical suffixes such as `(Gen4)`
- removes storage sizes such as `512GB` and `1TB`
- removes generation tags such as `Gen3`, `Gen4`, and `Gen5`
- splits on non-alphanumeric characters
- removes noise words such as SSD vendor names and storage units
- keeps unique tokens only

### Fuzzy Matching Rules

Fuzzy matching is intentionally conservative:

- at least 2 normalized tokens must overlap
- score is `intersection / max(rawTokenCount, deviceTokenCount)`
- score must be at least `0.34`
- if both names contain identity tokens, they must overlap

Identity tokens are normalized tokens that contain digits and are at least 3 characters long. This helps prevent false positives such as matching unrelated devices that happen to share a brand or generic model family.

### Canonical Name Preference

If multiple entries normalize to the same canonical key, the importer prefers the cleaner base name. It penalizes names with:

- parenthetical suffixes
- generation suffixes
- storage suffixes
- extra length

This prevents variants such as storage-specific labels from overriding the intended canonical device name.

### Importer Output

`process-source.ps1` logs the result of the import run:

- `Updated metric entries`: number of metrics written into `devices.json`
- `Fuzzy matches`: auto-resolved source labels with their token score
- `Alias matches`: source labels resolved through the explicit alias table
- `Unresolved source names`: labels that still need either a new alias or a new device entry

Example output:

```text
Updated metric entries: 746

Fuzzy matches (auto-resolved using token scoring, score >= 0.34):
  'Minisforum M1 Pro (Gen4)' -> 'Minisforum M1 Pro-125H' (score: 0.75)

Alias matches (explicit mappings):
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

1. If the unresolved name is a variant of an existing device, add/update an alias in `process-source.ps1` (`$aliases` table).
2. If it auto-resolves correctly in the `Fuzzy matches` section, an alias is optional. Add one only if you want the mapping to be explicit and stable.
3. If it is a truly new device, add a new object to `devices.json` using the template above.
4. Run `./process-source.ps1` again and confirm the unresolved list is reduced or empty.

### Alias Mapping Example

```powershell
$aliases = @{
  'Source Label With Storage/Gen Suffix' = 'Canonical Device Name'
}
```

### Handling Unresolved Names

Treat the unresolved list as a work queue for the current import run:

- add new devices for models you want to track in `devices.json`
- add aliases for labels that represent existing devices with extra storage or generation suffixes
- use `./transpose-source.ps1` to inspect the exact raw labels before deciding which path to take

### Notes

- Use numbers (not quoted strings) for all benchmark, power, and noise values.
- For optional metrics with missing data, use `null` instead of `0`.
- If there is no affiliate URL, keep `affiliateLink` as an empty string.
- Keep `devices.json` valid JSON: commas between objects, no trailing commas.
- The app recalculates overall score and efficiency automatically from the numeric fields.
- Prefer aliases for ambiguous labels or labels you do not want depending on fuzzy-match behavior.
- Use `./transpose-source.ps1` to inspect the exact raw source labels before adding aliases.

## Default Visible Columns

To change which optional columns are visible by default for first-time visitors, edit `DEFAULT_VISIBLE_COLUMNS` in `app.js`.

Visitors can change visible columns from the `Columns` button in the table toolbar. Their selection is stored in local storage under:

```text
minipc-benchmarks.visible-columns
```

Use `Reset defaults` in the picker to restore the configured defaults.
