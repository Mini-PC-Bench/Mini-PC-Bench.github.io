# Mini PC Benchmarks

Static benchmark comparison page for mini PCs, designed to be hosted on GitHub Pages.

## Files

- `index.html` - main page markup
- `styles.css` - ordered CSS entry importing the styles in `frontend/styles/`
- `app.js` - application entry, shared state, table/filter/comparison coordination, and startup
- `frontend/` - JavaScript modules for data, definitions, formatting, URL writing, detail markup, and charts; ordered CSS fragments
- `theme.js` - shared light/dark theme behavior for site pages
- `assets/mini-bench-logo.webp` - Mini Bench brand logo used in the site header
- `devices.json` - benchmark dataset consumed by the page
- `device-links.json` - editorial links keyed by device id
- `recommendations.json` - playlist ID and video records rendered in the Recommendations grid
- `scripts/source/update-recommendations.ps1` - refreshes recommendation records from the YouTube playlist
- `source-device-map.json` - reviewed raw source-label ownership mappings used by the importer
- `scripts/devices/sync-device-links.ps1` - adds missing empty link entries from `devices.json`
- `scripts/devices/validate-device-links.ps1` - resolves and sanity-checks YouTube and Amazon device links
- `scripts/devices/reorder-devices.ps1` - applies the preferred device field order
- `scripts/source/process-source.ps1` - imports benchmark CSV data into `devices.json`
- `scripts/source/transpose-source.ps1` - exports raw source labels to a flat CSV
- `scripts/assets/convert-device-image.ps1` - converts device source images for the site
- `scripts/dev/serve.ps1` - serves the site locally with PowerShell
- `CHANGELOG.md` - project changelog (source of truth); edit this file
- `changelog.template.html` - HTML layout for the generated changelog page
- `scripts/ci/build-changelog.ps1` - regenerates `changelog.html` from `CHANGELOG.md` and its template (`pwsh ./scripts/ci/build-changelog.ps1`)
- `changelog.html` - generated static changelog page, linked from the site header
- `LICENSE` - project license (source of truth); edit this file
- `license.template.html` - HTML layout for the generated license page
- `scripts/ci/build-license.ps1` - regenerates `license.html` from `LICENSE` and its template (`pwsh ./scripts/ci/build-license.ps1`)
- `license.html` - generated static license page, linked from the site footer
- `robots.txt` - disallows known AI/scraper crawlers and direct crawling of the JSON datasets
- `publish-files.txt` - allowlist of files and directories included in the GitHub Pages deployment

## Frontend development

Serve the repository over HTTP as before with `scripts/dev/serve.ps1` or the Docker web service (`docker compose up -d web`). `app.js` is a browser ES module and `styles.css` imports ordered CSS fragments, so source preview needs no bundling step or host Node installation. Keep `theme.js` as the independent deferred script shared by all pages.

Deployment stages `publish-files.txt`, then `scripts/ci/minify-assets.ps1` bundles the application and CSS with the existing esbuild dependency before minifying and hashing. The HTML still references `app.js`, `theme.js`, and `styles.css`. Include `frontend/` when copying sources for an unbundled preview.

Run the small module check in the existing Docker test image:

```bash
docker build -t geekbench-e2e -f Dockerfile.e2e .
docker run --rm -e NODE_PATH=/tests/node_modules -v "$PWD:/work:ro" geekbench-e2e:latest node /work/tests/frontend/modules.test.js
```

With project dependencies available, the same check is `npm run test:frontend`; CI runs it before bundling. The existing E2E suite checks source or staged output using `SITE_DIR`. See [the rebase guide](frontend-migration.md) before moving WIP onto the modularized code.

## Recommendations

The Recommendations tab links to Robtech’s mini PC recommendation lists from the [Top Mini PC Lists playlist](https://www.youtube.com/playlist?list=PLAAdXZQ2dtYrz-IRs-_in4AYt34EWJj2R). Videos are grouped by the year covered by the list (or publication year when the title has no year), newest first. Reasons-to-buy and reasons-not-to-buy videos are excluded.

The tab renders `recommendations.json` as a responsive thumbnail grid using the same wide layout as the dashboard. Each video has `id`, `title`, `year`, and `publishedAt` (`YYYY-MM-DD`); optional `startSeconds` preserves a link’s timestamp.

To refresh the model, enable [YouTube Data API v3](https://developers.google.com/youtube/v3/getting-started) and set `YOUTUBE_API_KEY` in your environment (or pass `-ApiKey`). Run directly with PowerShell 7.4 or newer:

```bash
pwsh ./scripts/source/update-recommendations.ps1
```

The updater uses the [playlistItems API](https://developers.google.com/youtube/v3/docs/playlistItems/list), follows every results page, includes TOP-N mini PC lists and the "Which Mini PC Should You Buy?" roundup, and excludes reasons-to-buy/not-to-buy and unrelated entries.

Run the updater’s offline check without an API key:

```bash
pwsh ./scripts/source/update-recommendations.ps1 -SelfTest
```

### Monthly recommendation check

The separate `Check monthly recommendations` workflow runs on the first day of each month at 08:17 UTC (09:17 in Warsaw in winter, 10:17 in summer). It refreshes `recommendations.json` in the runner checkout and fails if `git diff` detects changes, showing the diff in the logs. API/key errors also fail the workflow. It has read-only repository permissions and does not commit or deploy updates.

Store the API key in the repository’s **Settings → Secrets and variables → Actions → New repository secret**, with the name `YOUTUBE_API_KEY` and the key as its value. Enable YouTube Data API v3 for the key’s Google Cloud project. The workflow passes the secret to the updater through its environment; do not put the key in the workflow file or JSON. See [GitHub’s repository secret instructions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

In your [GitHub notification settings](https://github.com/settings/notifications), under **System → Actions**, enable **Email** and **Only notify for failed workflows**, then save. Watch this repository. Scheduled workflow notifications go to the user who created the workflow or most recently changed its cron schedule, so commit the workflow under your own account. See [Actions notification settings](https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications) and [scheduled workflow recipients](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs).

## Link Validation

Run the link sanity check from the repository root:

```powershell
.\scripts\devices\validate-device-links.ps1
```

The report is written to `device-links-report.md`. To check one device, use:

```powershell
.\scripts\devices\validate-device-links.ps1 -DeviceId minisforum-ai-x1-pro-hx-470
```

`-DevicesPath <device-id>` is also accepted as a backwards-compatible shorthand for
`-DeviceId <device-id>`. `-DevicesPath <path>` continues to select a custom
`devices.json` file.

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Set the source to deploy from your default branch.
4. Open the published URL after Pages finishes building.

The page fetches `devices.json`, `device-links.json`, and `recommendations.json` at runtime, so it should be served over HTTP or HTTPS. Opening the HTML directly with `file://` will usually fail because browsers block local `fetch()` requests.

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
.\scripts\dev\serve.ps1
```

Press `Ctrl+C` to stop the server.

Then open:

```text
http://localhost:80/
```

> **Note:** Port 80 requires an elevated PowerShell session. Alternatively, change the port in `scripts/dev/serve.ps1` to anything above 1024 (e.g. `8123`) to run without Administrator privileges.

## End-to-End Tests

The E2E suite uses Playwright in Docker. Docker and Docker Compose are the only
local prerequisites; Node.js, npm, Python, and browser binaries are not needed.

Run all tests from the repository root:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from e2e
```

The first run downloads the pinned Nginx and Playwright images and builds the
test image. The site is available at `http://127.0.0.1:8080` while the
containers are running.

For quick iterations after changing site code or an E2E test, run:

```bash
docker compose run --rm e2e
```

The site files and test files are bind-mounted, so these changes do not require
an image rebuild. Rebuild with `--build` when changing `Dockerfile.e2e`,
`package.json`, the Playwright version, or other image/dependency setup:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from e2e
```

Failed runs leave Playwright traces, screenshots, videos, and reports in
`test-results/` and `playwright-report/`. These generated directories are
ignored by Git. To run one file or one test during debugging:

```bash
docker compose run --rm e2e npx playwright test tests/e2e/theme.spec.js
docker compose run --rm e2e npx playwright test -g "toggles and persists"
```

Every bug fix should include a regression test. See
`.github/copilot-instructions.md` for the project testing and regression rules.

## Branch Output Comparison (Refactoring Safety Net)

To verify a refactor or reorganisation didn't change what the site renders,
use `scripts/compare-builds/`. It builds two git refs, serves both side by
side in containers, and diffs the rendered output scenario by scenario:

```powershell
pwsh ./scripts/compare-builds/compare-builds.ps1 -Before master -After feature/abc
```

See [scripts/compare-builds/README.md](./scripts/compare-builds/README.md) for
details, options, and scenario list.

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
    "h264": 90,
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
      "kind": "youtube",
      "logo": "./images/youtube.svg"
    }
  ]
}
```

The details view shows a device photo on the right of the Links section. Add a
relative image path as `"photo"` in the matching `devices.json` entry. Link
logos are optional; add a relative image path as `"logo"` to a link when a
brand mark is useful. Without either field, the view uses an accessible
placeholder or the built-in link-type icon.

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
  "photo": "./images/brand-model-cpu.webp",
  "cb23s": null,
  "cb23m": null,
  "gb6s": null,
  "gb6m": null,
  "gb7s": null,
  "gb7m": null,
  "ai_tokens": null,
  "gbai_cpu_half": null,
  "gbai_cpu_single": null,
  "gbai_cpu_quantised": null,
  "gbai_gpu_half": null,
  "gbai_gpu_single": null,
  "gbai_gpu_quantised": null,
  "cb23s_perf": null,
  "cb23m_perf": null,
  "gb6s_perf": null,
  "gb6m_perf": null,
  "gb7s_perf": null,
  "gb7m_perf": null,
  "firestrike_perf": null,
  "timespy_perf": null,
  "steelnomad_perf": null,
  "coding_perf": null,
  "photoshop_perf": null,
  "premiere_perf": null,
  "h264_perf": null,
  "av1_perf": null,
  "av1_hw_perf": null,
  "watts_perf": null,
  "cpu_temp_perf": null,
  "watts": null,
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
- `gbai_cpu_half`, `gbai_cpu_single`, `gbai_cpu_quantised`: Geekbench AI CPU scores by numeric format. Higher is better.
- `gbai_gpu_half`, `gbai_gpu_single`, `gbai_gpu_quantised`: Geekbench AI GPU scores by numeric format. Higher is better.
- `watts`: Maximum power draw from the wall under load. Lower is better.
- `h264`: H264 encode time in seconds. Lower is better.
- `av1`: AV1 software encode time in seconds. Lower is better.
- `av1_hw`: AV1 hardware encode time in seconds. Lower is better.
- `firestrike`: 3DMark Fire Strike score. Higher is better.
- `timespy`: 3DMark Time Spy score. Higher is better.
- `steelnomad`: 3DMark Steel Nomad Light score. Higher is better.
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

### Field Coverage Reports

Use `scripts/devices/report-field-coverage.ps1` to inspect the current dataset before choosing new filters. It discovers all stored leaf fields, including nested paths, and reports present/missing counts, coverage percentage, value types, numeric counts and ranges, and distinct value counts.

`null`, absent, and blank values count as missing; zero counts as present.

```powershell
./scripts/devices/report-field-coverage.ps1
./scripts/devices/report-field-coverage.ps1 -Fields cb23s,cb23m,noise.idle -IncludeMissingDevices
./scripts/devices/report-field-coverage.ps1 -ReportPath ./field-coverage.md
./scripts/devices/report-field-coverage.ps1 -Fields cb23s,cb23m -PassThru | Select-Object Field,Present,Missing,CoveragePct,Min,Max | Export-Csv ./field-coverage.csv -NoTypeInformation
```

- use `-DevicesPath` to inspect another JSON dataset.
- use `-IncludeMissingDevices:$false` for a summary only.

There are two PowerShell scripts for working with the raw CSV files in `source`:

- `./scripts/source/process-source.ps1` updates `devices.json` by resolving source labels to canonical device names.
- `./scripts/source/transpose-source.ps1` exports a flat CSV for inspection without any name matching or consolidation.

### Import into devices.json

Use the importer script to map benchmark values from the `source` folder into `devices.json`:

```powershell
./scripts/source/process-source.ps1
```

Optional parameters:

```powershell
./scripts/source/process-source.ps1 -SourceDir ./source -DevicesPath ./devices.json -AutoAddDevices $false
```

- `SourceDir`: path to the source CSV folder (default: `./source`)
- `DevicesPath`: path to devices.json (default: `./devices.json`)
- `AutoAddDevices`: if `$true`, automatically create new device entries for unresolved non-component labels; if `$false` (default), add unresolved names to the report

The importer reads the benchmark CSVs, selects the preferred row per file, resolves each source device label, and writes the merged metrics back into `devices.json`. When `AutoAddDevices` is enabled, new devices are added with all metrics set to `null` and populated as metrics are imported. The importer also ensures every device has a stable unique `id`.

GPU and storage benchmark headers may describe a component rather than the whole host, for example `Minisforum AtomMan G1 Pro RTX 5060` or `Minisforum AtomMan G1 Pro 1TB Kingston (Gen4)`. For GPU metrics, the importer removes the GPU suffix before matching; for storage metrics, it removes capacity, drive vendor, and generation suffixes. These resolutions are reported during import and their values are written to the host device. This context-specific normalization is not applied to CPU or application benchmarks.

At the start of an import, the script also checks existing records whose names are clearly GPU or storage variants. A component record is removed only when it matches a host and has no conflicting non-null metrics. If both records contain different benchmark values, the records are retained and the script prints `Skipped conflicting component device ...`; this usually indicates a real hardware configuration variant, such as the same chassis with a different discrete GPU.

Keep `AutoAddDevices` disabled until component resolutions and unresolved names have been reviewed. A source label should become a new device only when it represents a separately tracked physical configuration, not merely a GPU, SSD, drive-generation, or storage-capacity label.

### Resolver Order

`scripts/source/process-source.ps1` resolves source labels in this order:

1. `mapping`: exact source label exists in `source-device-map.json` and points to a valid device id.
2. `exact`: source label exactly matches a device name in `devices.json`.
3. `derived`: the source label's configuration suffix is stripped and the remaining base name matches exactly one device by slug.
4. `unresolved`: none of the above matched.

The `derived` tier handles the consistent disk-naming convention used by the source data. It repeatedly removes trailing configuration tokens from the label:

- capacity tokens such as ` 512GB`, ` 1TB`, ` 2TB`
- storage descriptors after capacity, such as drive vendors or interfaces (` SATA`, ` Kingston`)
- generation tokens such as ` Gen3`, ` Gen4`, ` Gen5`
- parenthesised tokens such as ` (DC)`, ` (Gen4)`

The remaining base name is slugified (lowercased, non-alphanumeric runs collapsed to `-`) and compared to slugified device names, so punctuation differences such as `ASUS NUC 16 Pro X7 358H` versus `ASUS NUC 16 Pro X7-358H` still resolve. Slugs shared by more than one device name are treated as ambiguous and are never resolved automatically; they must be mapped explicitly.

The importer still does not use fuzzy or similarity matching to decide device identity. Unresolved labels from GPU and storage benchmark scopes are listed as potential component orphans until they receive an explicit mapping or a new device entry.

### Source Mapping File

`source-device-map.json` maps each reviewed raw CSV label to the stable `id` of its owner device. Mapping targets are validated before import. Keep the raw CSV labels unchanged and add a mapping entry when a label is a component or naming variant of an existing device.

When `AutoAddDevices` creates a new device, it assigns a stable slug derived from the device name. If that slug already exists, it adds a numeric suffix such as `-2`. Existing ids are preserved, so links remain stable.

### Importer Output

`scripts/source/process-source.ps1` logs the result of the import run:

- `Updated metric entries`: number of metrics written into `devices.json`
- `Explicit source mappings used`: reviewed source labels resolved through `source-device-map.json`
- `Derived source mappings used`: labels resolved by stripping the capacity/generation configuration suffix
- `Unresolved source names`: labels that still need either a mapping or a new device entry
- `Potential component orphans`: unresolved labels from GPU or storage benchmark scopes that need explicit ownership

Example output:

```text
Updated metric entries: 746

Explicit source mappings used:
  'Minisforum M1 Pro 1TB Kingston (Gen4)' -> 'Minisforum M1 Pro-125H'

Derived source mappings used (configuration suffix stripped):
  'GEEKOM IT15 Ultra 9 285H 2TB Gen4' -> 'GEEKOM IT15 Ultra 9 285H'
```

### Export Raw Source Labels

Use the transpose script when you want to inspect the raw source labels without any matching logic:

```powershell
./scripts/source/transpose-source.ps1
```

Optional parameters:

```powershell
./scripts/source/transpose-source.ps1 -SourceDir ./source -OutputCsv ./source-transposed.csv
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

When `scripts/source/process-source.ps1` reports unresolved names, use this decision flow:

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
- use `./scripts/source/transpose-source.ps1` to inspect the exact raw labels before deciding which path to take

### Notes

- Use numbers (not quoted strings) for all benchmark, power, and noise values.
- For optional metrics with missing data, use `null` instead of `0`.
- Keep `devices.json` valid JSON: commas between objects, no trailing commas.
- Keep `device-links.json` valid JSON and keyed by existing device ids.
- The app recalculates overall score and efficiency automatically from the numeric fields.
- Prefer explicit mappings for ambiguous labels or labels that must not depend on name similarity.
- Use `./scripts/source/transpose-source.ps1` to inspect the exact raw source labels before adding aliases.

## Default Visible Columns

To change which optional columns are visible by default for first-time visitors, edit `DEFAULT_VISIBLE_COLUMNS` in `frontend/table-columns.js`.

Visitors can change visible columns from the `Columns` button in the table toolbar. Their selection is stored in local storage under:

```text
minipc-benchmarks.visible-columns
```

Use `Reset defaults` in the picker to restore the configured defaults.
