// Reveal archived entries before scrolling to a shared date link.
function revealChangelogDate() {
  let id;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  const month = target?.closest('.changelog-month');
  if (!month) return;
  month.open = true;
  requestAnimationFrame(() => target.scrollIntoView());
}

window.addEventListener('hashchange', revealChangelogDate);
window.addEventListener('load', revealChangelogDate);

const returnView = new URLSearchParams(window.location.search).get('from');
const returnLink = [...document.querySelectorAll('[data-return-view]')]
  .find(link => link.dataset.returnView === returnView);
if (returnLink) {
  const label = returnLink.textContent.trim();
  returnLink.textContent = `← Back to ${label}`;
  returnLink.classList.add('page-link-return');
}
