const fmt = v => v == null ? '—' : v.toLocaleString();
const fmtD = (v, d = 1) => v == null ? '—' : v.toFixed(d);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export { fmt, fmtD, escapeHtml, clamp };
