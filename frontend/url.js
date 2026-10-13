function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(key);
  return raw && raw.trim() ? raw.trim() : null;
}

// Single writer for every URL param (device id today; filter params join it in a later phase).
function writeUrlState(updates, { replace = false } = {}) {
  const url = new URL(window.location.href);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

export { getUrlParam, writeUrlState };
