#!/usr/bin/env node
// Captures a normalized snapshot of every scenario from a running site.
//
// Usage: node tests/compare/capture.js --base-url http://127.0.0.1:8081 --out ./compare-out/before

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { scenarios } = require('./scenarios');
const { serializePageState } = require('./serialize');

function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:8080', out: null, label: null, screenshots: true };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--base-url') { args.baseUrl = value; i += 1; }
    else if (key === '--out') { args.out = value; i += 1; }
    else if (key === '--label') { args.label = value; i += 1; }
    else if (key === '--no-screenshots') { args.screenshots = false; }
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.out) throw new Error('--out is required');
  return args;
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Charts animate their bar widths over two frames plus a CSS transition.
  await page.waitForTimeout(600);
}

async function capture() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(args.out);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'scenarios'), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce'
  });

  const summary = { label: args.label || args.baseUrl, baseUrl: args.baseUrl, scenarios: {} };

  for (const scenario of scenarios) {
    const page = await context.newPage();
    const consoleErrors = [];
    const requestFailures = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', request => requestFailures.push(new URL(request.url()).pathname));

    await page.goto(new URL(scenario.path, args.baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await settle(page);
    if (scenario.setup) {
      await scenario.setup(page);
      await settle(page);
    }

    const state = await page.evaluate(`(${serializePageState.toString()})()`);
    state.consoleErrors = consoleErrors.sort();
    state.requestFailures = [...new Set(requestFailures)].sort();

    const scenarioDir = path.join(outDir, 'scenarios', scenario.id);
    fs.mkdirSync(scenarioDir, { recursive: true });
    fs.writeFileSync(path.join(scenarioDir, 'dom.txt'), `${state.dom}\n`, 'utf8');
    fs.writeFileSync(path.join(scenarioDir, 'text.txt'), `${state.text}\n`, 'utf8');
    fs.writeFileSync(path.join(scenarioDir, 'table.txt'), `${[...state.tableHeaders, ...state.tableRows].join('\n')}\n`, 'utf8');
    fs.writeFileSync(path.join(scenarioDir, 'charts.txt'), `${state.chartRows.join('\n')}\n`, 'utf8');
    fs.writeFileSync(
      path.join(scenarioDir, 'metrics.json'),
      `${JSON.stringify({ metrics: state.metrics, consoleErrors: state.consoleErrors, requestFailures: state.requestFailures }, null, 2)}\n`,
      'utf8'
    );
    if (args.screenshots) {
      await page.screenshot({ path: path.join(scenarioDir, 'screenshot.png'), fullPage: true });
    }

    summary.scenarios[scenario.id] = { description: scenario.description, metrics: state.metrics };
    console.log(`captured ${scenario.id} (${state.metrics.tableRowCount} table rows)`);
    await page.close();
  }

  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await browser.close();
  console.log(`snapshot written to ${outDir}`);
}

capture().catch(error => {
  console.error(error);
  process.exit(1);
});
