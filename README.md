# Mini PC Benchmarks

Static benchmark comparison page for mini PCs, designed to be hosted on GitHub Pages.

## Files

- `minipc-benchmarks.html` - main page markup
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

Run a simple static server from this folder:

```bash
python3 -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123/minipc-benchmarks.html
```

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
    "power_idle_watts": 8
  }
]
```

## Default Visible Columns

To change which optional columns are visible by default for first-time visitors, edit `DEFAULT_VISIBLE_COLUMNS` in `app.js`.

Visitors can change visible columns from the `Columns` button in the table toolbar. Their selection is stored in local storage under:

```text
minipc-benchmarks.visible-columns
```

Use `Reset defaults` in the picker to restore the configured defaults.
