// Run with npm run test:frontend (or the existing Docker E2E image).
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');

async function main() {
  const { outputFiles } = buildSync({
    stdin: {
      contents: "export * from './frontend/data.js'; export * from './frontend/filters.js'; export * from './frontend/details.js';",
      resolveDir: path.resolve(__dirname, '../..')
    },
    bundle: true,
    format: 'esm',
    write: false
  });
  const { normalizeDevices, normalizeDeviceLinks, deviceMatchesFilters, formatDetailMetricValue, renderDetailLinks, renderDetailPhoto } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

  const input = [
    { name: 'Mini Alpha!', cb23s: 100, cb23m: 200, cb23s_perf: 200, watts: 20, watts_perf: 40, handbrake: 30, image: ' photo.webp ', noise: { load_default: 25 } },
    { id: ' beta ', name: 'Beta', cb23s: 50, watts: null }
  ];
  const { DEVICES, MAX_H, MIN_L, FILTER_BOUNDS } = normalizeDevices(input);
  assert.equal(DEVICES[0].id, 'mini-alpha');
  assert.equal(DEVICES[1].id, 'beta');
  assert.equal(DEVICES[0].h264, 30);
  assert.equal(DEVICES[0].photo, 'photo.webp');
  assert.equal(DEVICES[0].noise_load, 25);
  assert.equal(DEVICES[0].composite, 100);
  assert.equal(DEVICES[0].efficiency, 50);
  assert.equal(DEVICES[0].composite_perf, 150);
  assert.equal(DEVICES[0].efficiency_perf, 37.5);
  assert.equal(DEVICES[1].composite, 50);
  assert.equal(DEVICES[1].composite_perf, 50);
  assert.equal(DEVICES[1].efficiency, 0);
  assert.equal(MAX_H.cb23s, 100);
  assert.equal(MIN_L.h264, 30);
  assert.deepEqual(FILTER_BOUNDS.watts, { min: 20, max: 20, present: 1 });
  assert.equal(input[0].composite, undefined);
  assert.throws(() => normalizeDevices([{ name: '!!!' }]), /missing a usable id/);
  assert.throws(() => normalizeDevices([{ name: 'A' }, { id: 'a', name: 'B' }]), /Duplicate device id/);
  assert.deepEqual(normalizeDevices([]).DEVICES, []);

  const state = { q: ' ALPHA ', ranges: { watts: 20, cb23m: 200 }, includeUnknown: false };
  assert.equal(deviceMatchesFilters(DEVICES[0], state), true);
  assert.equal(deviceMatchesFilters(DEVICES[0], { ...state, ranges: { watts: 19 } }), false);
  assert.equal(deviceMatchesFilters(DEVICES[0], { ...state, ranges: { cb23m: 201 } }), false);
  assert.equal(deviceMatchesFilters(DEVICES[1], { ...state, q: '', includeUnknown: true }), true);
  assert.equal(deviceMatchesFilters(DEVICES[1], { ...state, q: '' }), false);

  const links = normalizeDeviceLinks([null, { url: ' https://example.com ', label: ' Shop ', kind: ' AFFILIATE ' }, { url: 'https://example.com' }, { url: ' ' }]);
  assert.deepEqual(links, [{ url: 'https://example.com', label: 'Shop', kind: 'affiliate', logo: '' }]);
  assert.deepEqual(normalizeDeviceLinks(null), []);
  assert.equal(formatDetailMetricValue('volume', 1.234), '1.23L');
  assert.equal(formatDetailMetricValue('volume', null), null);
  assert.match(renderDetailLinks({ links }, false), /Loading outbound links/);
  assert.match(renderDetailLinks({ links: [] }, true), /No outbound links/);
  assert.match(renderDetailLinks({ links }, true), /Shop/);
  assert.match(renderDetailPhoto({ name: 'A & B', photo: 'photo.webp' }), /alt="A &amp; B"/);
  assert.match(renderDetailPhoto({ name: 'A' }), /detail-photo-placeholder/);
  console.log('Frontend module checks passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
