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
  "cb23s": 0,
  "cb23m": 0,
  "gb6s": 0,
  "gb6m": 0,
  "watts": 0,
  "handbrake": 0,
  "firestrike": 0,
  "timespy": 0,
  "noise": {
    "idle": 0,
    "load_default": 0,
    "load_performance": 0
  },
  "power_idle_watts": 0,
  "affiliateLink": ""
}
```

#### Field Reference

- `name`: Device label shown in table/cards/charts.
- `cb23s`: Cinebench R23 single-core score. Higher is better.
- `cb23m`: Cinebench R23 multi-core score. Higher is better.
- `gb6s`: Geekbench 6 single-core score. Higher is better.
- `gb6m`: Geekbench 6 multi-core score. Higher is better.
- `watts`: Maximum power draw from the wall under load. Lower is better.
- `handbrake`: Encode time in seconds. Lower is better.
- `firestrike`: 3DMark Fire Strike score. Higher is better.
- `timespy`: 3DMark Time Spy score. Higher is better.
- `noise.idle`: Fan noise at idle in dB(A) at 30 cm. Lower is better.
- `noise.load_default`: Fan noise under load in default profile. Lower is better.
- `noise.load_performance`: Fan noise under load in performance profile. Lower is better.
- `power_idle_watts`: Idle power draw from the wall. Lower is better.
- `affiliateLink`: Optional URL used for clickable device name. Leave `""` for no link.

### Notes

- Use numbers (not quoted strings) for all benchmark, power, and noise values.
- If there is no affiliate URL, keep `affiliateLink` as an empty string.
- Keep `devices.json` valid JSON: commas between objects, no trailing commas.
- The app recalculates overall score and efficiency automatically from the numeric fields.

## Default Visible Columns

To change which optional columns are visible by default for first-time visitors, edit `DEFAULT_VISIBLE_COLUMNS` in `app.js`.

Visitors can change visible columns from the `Columns` button in the table toolbar. Their selection is stored in local storage under:

```text
minipc-benchmarks.visible-columns
```

Use `Reset defaults` in the picker to restore the configured defaults.
