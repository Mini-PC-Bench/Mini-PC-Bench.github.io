#!/usr/bin/env node
// Diffs two snapshots produced by capture.js and writes a console + HTML report.
//
// Usage: node tests/compare/compare.js --before ./compare-out/before --after ./compare-out/after --report ./compare-out/report.html

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { scenarios } = require('./scenarios');

const ARTIFACTS = [
  { file: 'dom.txt', label: 'DOM structure' },
  { file: 'text.txt', label: 'Visible text' },
  { file: 'table.txt', label: 'Table contents' },
  { file: 'charts.txt', label: 'Chart rows' }
];

const MAX_DIFF_LINES = 60;

function parseArgs(argv) {
  const args = { before: null, after: null, report: null, failOnScreenshotDiff: false };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--before') { args.before = value; i += 1; }
    else if (key === '--after') { args.after = value; i += 1; }
    else if (key === '--report') { args.report = value; i += 1; }
    else if (key === '--fail-on-screenshot-diff') { args.failOnScreenshotDiff = true; }
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.before || !args.after) throw new Error('--before and --after are required');
  return args;
}

function readLines(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hashFile(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Classic LCS diff, sufficient for the snapshot sizes we produce.
function diffLines(before, after) {
  const n = before.length;
  const m = after.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const changes = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) { i += 1; j += 1; continue; }
    if (lcs[i + 1][j] >= lcs[i][j + 1]) { changes.push({ type: 'removed', line: before[i], index: i + 1 }); i += 1; }
    else { changes.push({ type: 'added', line: after[j], index: j + 1 }); j += 1; }
  }
  while (i < n) { changes.push({ type: 'removed', line: before[i], index: i + 1 }); i += 1; }
  while (j < m) { changes.push({ type: 'added', line: after[j], index: j + 1 }); j += 1; }
  return changes;
}

function compareMetrics(beforeMetrics, afterMetrics) {
  const keys = [...new Set([...Object.keys(beforeMetrics || {}), ...Object.keys(afterMetrics || {})])].sort();
  return keys
    .map(key => ({ key, before: beforeMetrics?.[key], after: afterMetrics?.[key] }))
    .filter(entry => JSON.stringify(entry.before) !== JSON.stringify(entry.after));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function buildReport(results, args) {
  const rows = results.map(result => {
    const status = result.differences.length === 0 ? 'pass' : 'fail';
    const details = result.differences.map(difference => {
      if (difference.kind === 'metrics') {
        const items = difference.entries
          .map(entry => `<tr><td>${escapeHtml(entry.key)}</td><td class="removed">${escapeHtml(JSON.stringify(entry.before))}</td><td class="added">${escapeHtml(JSON.stringify(entry.after))}</td></tr>`)
          .join('');
        return `<h4>${escapeHtml(difference.label)}</h4><table class="metrics"><tr><th>Metric</th><th>before</th><th>after</th></tr>${items}</table>`;
      }
      if (difference.kind === 'screenshot') {
        return `<h4>${escapeHtml(difference.label)}</h4>
          <div class="shots">
            <figure><figcaption>before</figcaption><img src="${escapeHtml(difference.beforeSrc)}" alt="before"></figure>
            <figure><figcaption>after</figcaption><img src="${escapeHtml(difference.afterSrc)}" alt="after"></figure>
          </div>`;
      }
      const lines = difference.changes
        .slice(0, MAX_DIFF_LINES)
        .map(change => `<div class="${change.type}">${change.type === 'added' ? '+' : '-'} ${escapeHtml(change.line)}</div>`)
        .join('');
      const more = difference.changes.length > MAX_DIFF_LINES
        ? `<div class="more">… ${difference.changes.length - MAX_DIFF_LINES} more changed lines</div>`
        : '';
      return `<h4>${escapeHtml(difference.label)} <span class="badge">${difference.changes.length} changed lines</span></h4><pre class="diff">${lines}${more}</pre>`;
    }).join('');

    return `<section class="scenario ${status}">
      <h2>${escapeHtml(result.id)} <span class="status">${status.toUpperCase()}</span></h2>
      <p class="desc">${escapeHtml(result.description || '')}</p>
      ${details || '<p class="ok">No differences.</p>'}
    </section>`;
  }).join('');

  const failed = results.filter(result => result.differences.length > 0).length;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Build comparison report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #f6f7f9; color: #16181d; }
  h1 { margin-bottom: .25rem; }
  .summary { margin-bottom: 2rem; font-size: 1.1rem; }
  section.scenario { background: #fff; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; border-left: 6px solid #21a179; }
  section.scenario.fail { border-left-color: #d2374c; }
  .status { font-size: .75rem; padding: .15rem .5rem; border-radius: 999px; background: #21a179; color: #fff; vertical-align: middle; }
  .fail .status { background: #d2374c; }
  .desc { color: #5b626e; margin-top: 0; }
  pre.diff { background: #0f1116; color: #d7dae0; padding: .75rem; border-radius: 8px; overflow-x: auto; font-size: .8rem; line-height: 1.45; }
  .added { color: #7ee787; } .removed { color: #ff7b72; } .more { color: #9aa3af; }
  table.metrics { border-collapse: collapse; font-size: .85rem; }
  table.metrics td, table.metrics th { border: 1px solid #dde1e7; padding: .3rem .6rem; text-align: left; }
  table.metrics td.added { color: #12784f; } table.metrics td.removed { color: #a3182a; }
  .badge { font-size: .7rem; background: #eceff3; border-radius: 999px; padding: .1rem .5rem; color: #5b626e; }
  .shots { display: flex; gap: 1rem; flex-wrap: wrap; }
  .shots img { max-width: 46vw; border: 1px solid #dde1e7; border-radius: 6px; }
  .ok { color: #21a179; }
</style></head>
<body>
  <h1>Build comparison report</h1>
  <p class="summary"><strong>${results.length - failed}</strong> scenarios identical, <strong>${failed}</strong> with differences.<br>
  before: <code>${escapeHtml(args.before)}</code><br>after: <code>${escapeHtml(args.after)}</code></p>
  ${rows}
</body></html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const beforeDir = path.resolve(args.before);
  const afterDir = path.resolve(args.after);
  const reportPath = path.resolve(args.report || path.join(path.dirname(beforeDir), 'report.html'));

  const results = [];

  for (const scenario of scenarios) {
    const beforeScenario = path.join(beforeDir, 'scenarios', scenario.id);
    const afterScenario = path.join(afterDir, 'scenarios', scenario.id);
    const differences = [];

    if (!fs.existsSync(beforeScenario) || !fs.existsSync(afterScenario)) {
      differences.push({ kind: 'text', label: 'Snapshot availability', changes: [{ type: 'removed', line: `missing snapshot for ${scenario.id}` }] });
      results.push({ id: scenario.id, description: scenario.description, differences });
      continue;
    }

    for (const artifact of ARTIFACTS) {
      const before = readLines(path.join(beforeScenario, artifact.file));
      const after = readLines(path.join(afterScenario, artifact.file));
      if (!before || !after) continue;
      const changes = diffLines(before, after);
      if (changes.length) differences.push({ kind: 'text', label: artifact.label, changes });
    }

    const beforeMeta = readJson(path.join(beforeScenario, 'metrics.json')) || {};
    const afterMeta = readJson(path.join(afterScenario, 'metrics.json')) || {};
    const metricEntries = compareMetrics(
      { ...beforeMeta.metrics, consoleErrors: beforeMeta.consoleErrors, requestFailures: beforeMeta.requestFailures },
      { ...afterMeta.metrics, consoleErrors: afterMeta.consoleErrors, requestFailures: afterMeta.requestFailures }
    );
    if (metricEntries.length) differences.push({ kind: 'metrics', label: 'Counts and page metrics', entries: metricEntries });

    const beforeShot = path.join(beforeScenario, 'screenshot.png');
    const afterShot = path.join(afterScenario, 'screenshot.png');
    if (fs.existsSync(beforeShot) && fs.existsSync(afterShot) && hashFile(beforeShot) !== hashFile(afterShot)) {
      const difference = {
        kind: 'screenshot',
        label: 'Screenshot (pixels differ)',
        beforeSrc: path.relative(path.dirname(reportPath), beforeShot).replace(/\\/g, '/'),
        afterSrc: path.relative(path.dirname(reportPath), afterShot).replace(/\\/g, '/')
      };
      if (args.failOnScreenshotDiff) differences.push(difference);
      else differences.push({ ...difference, advisory: true });
    }

    results.push({ id: scenario.id, description: scenario.description, differences });
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(results, args), 'utf8');

  let blocking = 0;
  for (const result of results) {
    const hard = result.differences.filter(difference => !difference.advisory);
    const advisory = result.differences.filter(difference => difference.advisory);
    if (hard.length === 0 && advisory.length === 0) {
      console.log(`PASS  ${result.id}`);
      continue;
    }
    if (hard.length === 0) {
      console.log(`WARN  ${result.id} — ${advisory.map(difference => difference.label).join(', ')}`);
      continue;
    }
    blocking += 1;
    console.log(`FAIL  ${result.id} — ${hard.map(difference => difference.label + (difference.changes ? ` (${difference.changes.length} lines)` : '')).join(', ')}`);
  }

  console.log(`\nreport: ${reportPath}`);
  if (blocking > 0) {
    console.log(`${blocking} scenario(s) differ.`);
    process.exit(1);
  }
  console.log('All scenarios match.');
}

main();
