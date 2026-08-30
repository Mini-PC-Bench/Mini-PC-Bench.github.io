# compare-builds — branch output comparison tool

Answers one question: *does this branch render exactly the same thing as
master?* It builds two git refs, serves both in separate Nginx containers,
drives both through the same set of UI scenarios with Playwright, and diffs
the results.

Use it whenever a change is meant to be output-neutral (refactors,
minification, file reorganisation), and use it to review the exact delta when
a change is meant to alter output.

## Usage

Docker is the only prerequisite:

```powershell
pwsh ./scripts/compare-builds/compare-builds.ps1 -Before master -After feature/abc
```

The script exits `0` when both refs render identically and `1` when they
differ, so it can gate a CI job. Results land in `compare-out/` at the repo
root (git-ignored):

| Path | Contents |
| --- | --- |
| `report.html` | Side-by-side HTML report; opens automatically unless `-SkipOpenReport` |
| `before/`, `after/` | Raw per-scenario snapshots |
| `build-before/site`, `build-after/site` | The two published site builds |

## What is compared

For each scenario the tool captures and diffs:

- **DOM structure** — normalized element tree with sorted attributes and classes,
  so formatting-only changes are ignored but real markup changes are not.
- **Visible text** — `document.body.innerText`.
- **Table contents** — every header and every rendered row, cell by cell.
- **Chart rows** — rendered chart labels and values.
- **Counts and metrics** — device rows, visible columns, column options, chart
  tabs, info cards, links, images, buttons, inputs, the `#site-meta` and
  `#count` labels, plus console errors and failed requests.
- **Screenshots** — full-page, reported as advisory warnings by default because
  font rendering can differ; pass `-FailOnScreenshotDiff` to make them blocking.

## Scenarios

Defined in [scenarios.js](./scenarios.js): default table, table sorted by
multi core, filtered table, all optional columns enabled, device detail
overlay, default chart, multi series noise chart, changelog page, and the 404
page. Add a scenario there whenever you introduce a view or control worth
protecting.

## Options

| Option | Purpose |
| --- | --- |
| `-Minify` | Run `minify-assets.ps1` on both builds to compare what actually ships |
| `-BeforePort` / `-AfterPort` | Pin host ports; a free port in 8090-8199 is chosen otherwise |
| `-FailOnScreenshotDiff` | Treat pixel-level screenshot differences as failures |
| `-KeepServers` | Leave both sites running for manual side-by-side inspection |
| `-SkipOpenReport` | Do not open the report (used in CI) |
| `-OutputDir` | Change the output location from `compare-out` |

With `-KeepServers` both sites stay up on their printed ports for eyeballing.
Stop them with:

```powershell
docker compose -p minibench-compare -f scripts/compare-builds/docker-compose.compare.yml down
```

## Comparing something other than two branches

`compare-builds.ps1` is a wrapper around two reusable scripts that work
against any URLs, so you can point them at a preview deployment or a running
dev server:

```bash
node scripts/compare-builds/capture.js --base-url http://127.0.0.1:8090 --out ./compare-out/before
node scripts/compare-builds/capture.js --base-url http://127.0.0.1:8091 --out ./compare-out/after
node scripts/compare-builds/compare.js --before ./compare-out/before --after ./compare-out/after --report ./compare-out/report.html
```

## Files

| File | Purpose |
| --- | --- |
| `compare-builds.ps1` | Entry point: builds both refs via git worktrees, serves them, runs the comparison |
| `docker-compose.compare.yml` | Two Nginx containers (before/after) plus the `compare` runner container |
| `Dockerfile.compare` | Playwright image used by the `compare` container |
| `scenarios.js` | The list of UI states to capture and compare |
| `serialize.js` | Runs in the browser; normalizes the DOM/text/table/chart state into diffable text |
| `capture.js` | Node script: drives Playwright through every scenario against a base URL and writes snapshots |
| `compare.js` | Node script: diffs two snapshot directories and writes `report.html` |
| `run.js` | Container entry point that chains `capture.js` (before), `capture.js` (after), and `compare.js` |
