const THEME_STORAGE_KEY = 'minipc-benchmarks.theme';
const themeToggleBtn = document.getElementById('theme-toggle');
const themeHeaderEl = document.querySelector('header');

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeToggleBtn.setAttribute('aria-pressed', String(isDark));
  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  themeToggleBtn.title = label;
  themeToggleBtn.setAttribute('aria-label', label);
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures.
  }
}

applyTheme(getSavedTheme());

themeToggleBtn.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  saveTheme(nextTheme);
});

// Keep anchor scroll offset in sync with the sticky header's actual height.
function updateHeaderOffset() {
  if (!themeHeaderEl) return;
  document.documentElement.style.setProperty('--header-offset', `${themeHeaderEl.offsetHeight}px`);
}

if (themeHeaderEl) {
  updateHeaderOffset();
  window.addEventListener('resize', updateHeaderOffset);
  window.addEventListener('load', updateHeaderOffset);
}
