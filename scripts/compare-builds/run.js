#!/usr/bin/env node
// Container entry point: capture both running sites, then diff them.

const { spawnSync } = require('child_process');
const path = require('path');

const outDir = process.env.OUT_DIR || '/compare/out';
const here = __dirname;

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(here, script), ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

let status = run('capture.js', ['--base-url', 'http://web-before', '--label', process.env.BEFORE_LABEL || 'before', '--out', path.join(outDir, 'before')]);
if (status !== 0) process.exit(status);

status = run('capture.js', ['--base-url', 'http://web-after', '--label', process.env.AFTER_LABEL || 'after', '--out', path.join(outDir, 'after')]);
if (status !== 0) process.exit(status);

process.exit(run('compare.js', [
  '--before', path.join(outDir, 'before'),
  '--after', path.join(outDir, 'after'),
  '--report', path.join(outDir, 'report.html'),
  ...(process.env.FAIL_ON_SCREENSHOT_DIFF === '1' ? ['--fail-on-screenshot-diff'] : [])
]));
