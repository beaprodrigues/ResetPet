import { $, $$ } from './shared.mjs';

const header = $('#header');
const searchBtn = $('#search-toggle');
const searchBar = $('#search-bar');
const closeBtn = $('#search-close');
const searchInput = $('#search-input');

function onScroll() {
  header?.classList.toggle('scrolled', window.scrollY > 60 || searchBar?.classList.contains('open'));
}

function filterProducts(term) {
  const query = term.trim().toLowerCase();
  $$('.linha-card').forEach((card) => {
    const text = card.textContent.toLowerCase();
    card.hidden = query.length > 0 && !text.includes(query);
  });
}

function openSearch() {
  searchBar?.classList.add('open');
  header?.classList.add('scrolled');
  setTimeout(() => searchInput?.focus(), 200);
}

function closeSearch() {
  searchBar?.classList.remove('open');
  if (searchInput) {
    searchInput.value = '';
    filterProducts('');
  }
  onScroll();
}

export function initHeader() {
  window.addEventListener('scroll', onScroll, { passive: true });
  searchBtn?.addEventListener('click', openSearch);
  closeBtn?.addEventListener('click', closeSearch);
  searchInput?.addEventListener('input', (e) => {
    filterProducts(e.target.value);
    if (e.target.value.trim().length === 1) {
      $('#produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  onScroll();
}
