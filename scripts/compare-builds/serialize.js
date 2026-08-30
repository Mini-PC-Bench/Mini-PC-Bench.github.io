// Runs inside the browser (page.evaluate). Produces a normalized, line-based
// description of the rendered DOM so two builds can be diffed textually.

function serializePageState() {
  const IGNORED_ATTRIBUTES = new Set(['data-w']);
  const VOLATILE_STYLE_PROPERTIES = new Set(['width', 'height', 'top', 'left', 'right', 'bottom', 'transform']);

  const collapse = value => String(value).replace(/\s+/g, ' ').trim();

  const roundPixels = value => value.replace(/-?\d+\.\d+px/g, match => `${Math.round(parseFloat(match))}px`);

  function normalizeStyle(styleValue) {
    return styleValue
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const [rawName, ...rest] = part.split(':');
        const name = rawName.trim();
        const value = collapse(rest.join(':'));
        if (VOLATILE_STYLE_PROPERTIES.has(name)) return `${name}:${roundPixels(value)}`;
        return `${name}:${value}`;
      })
      .join(';');
  }

  function attributesOf(element) {
    return Array.from(element.attributes)
      .filter(attribute => !IGNORED_ATTRIBUTES.has(attribute.name))
      .map(attribute => {
        if (attribute.name === 'class') {
          const classes = Array.from(element.classList).sort().join(' ');
          return classes ? `class="${classes}"` : null;
        }
        if (attribute.name === 'style') {
          const style = normalizeStyle(attribute.value);
          return style ? `style="${style}"` : null;
        }
        return `${attribute.name}="${collapse(attribute.value)}"`;
      })
      .filter(Boolean)
      .sort()
      .join(' ');
  }

  const lines = [];

  function walk(node, depth) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = collapse(node.textContent);
      if (text) lines.push(`${'  '.repeat(depth)}#text ${text}`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'SCRIPT' || node.tagName === 'NOSCRIPT') return;

    const attributes = attributesOf(node);
    lines.push(`${'  '.repeat(depth)}<${node.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ''}>`);
    node.childNodes.forEach(child => walk(child, depth + 1));
  }

  walk(document.documentElement, 0);

  const text = collapse(document.body.innerText);

  const countOf = selector => document.querySelectorAll(selector).length;

  const tableHeaders = Array.from(document.querySelectorAll('#benchmark-table thead th'))
    .map(th => collapse(th.textContent));

  const tableRows = Array.from(document.querySelectorAll('#benchmark-table tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('th, td')).map(cell => collapse(cell.textContent)).join(' | '));

  const chartRows = Array.from(document.querySelectorAll('#chart-box .chart-row, #chart-box .chart-bar-row'))
    .map(row => collapse(row.textContent));

  const metrics = {
    tableRowCount: countOf('#benchmark-table tbody tr'),
    deviceTriggerCount: countOf('#benchmark-table tbody .device-name-trigger'),
    visibleColumnCount: countOf('#benchmark-table thead tr:first-child th'),
    columnOptionCount: countOf('#column-options input[type="checkbox"]'),
    checkedColumnOptionCount: countOf('#column-options input[type="checkbox"]:checked'),
    chartTabCount: countOf('.chart-tab'),
    viewTabCount: countOf('.tab-btn'),
    infoCardCount: countOf('#info-grid > *'),
    chartSegmentCount: countOf('#chart-box .chart-segment'),
    detailRowCount: countOf('#device-detail-body .detail-metric, #device-detail-body .detail-row'),
    linkCount: countOf('a[href]'),
    imageCount: countOf('img'),
    buttonCount: countOf('button'),
    inputCount: countOf('input, select, textarea'),
    siteMeta: collapse(document.querySelector('#site-meta')?.textContent || ''),
    countLabel: collapse(document.querySelector('#count')?.textContent || ''),
    title: document.title
  };

  return {
    dom: lines.join('\n'),
    text,
    metrics,
    tableHeaders,
    tableRows,
    chartRows
  };
}

if (typeof module !== 'undefined') module.exports = { serializePageState };
