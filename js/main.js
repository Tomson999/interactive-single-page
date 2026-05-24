const gridContainer = document.getElementById('grid-container');
const tableContainer = document.getElementById('table-container');
const tableBody = document.getElementById('table-body');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const emptyMessage = document.getElementById('empty-message');
const scrollStatus = document.getElementById('scroll-status');
const observerTarget = document.getElementById('observer-target');
const inputSearch = document.getElementById('input-search');
const btnSearchClear = document.getElementById('btn-search-clear');
const filterStatus = document.getElementById('filter-status');
const filterSpecies = document.getElementById('filter-species');
const filterGender = document.getElementById('filter-gender');
const btnFavOnly = document.getElementById('btn-fav-only');
const btnResetFilters = document.getElementById('btn-reset-filters');
const btnResetAll = document.getElementById('btn-reset-all');
const btnViewGrid = document.getElementById('btn-view-grid');
const btnViewTable = document.getElementById('btn-view-table');
const btnTheme = document.getElementById('btn-theme');
const btnExport = document.getElementById('btn-export');
const sortButtons = document.querySelectorAll('.btn-sort');

const DEFAULT_STATE = {
  search: '', status: 'All', species: 'All', gender: 'All',
  favoritesOnly: false, sortField: 'name', sortOrder: 'asc', favorites: [],
};

let allCharacters = [];
let filteredChars = [];
let visibleCount = 20;
let isLoading = false;  // Bug 3: laadguard tegen race conditions
let favorites = loadFavorites();
let currentTheme = loadTheme();
let currentView = loadView();
let state = { ...DEFAULT_STATE, favorites };

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function applyView(view) {
  gridContainer.hidden = view !== 'grid';
  tableContainer.hidden = view !== 'table';
  btnViewGrid.classList.toggle('active', view === 'grid');
  btnViewTable.classList.toggle('active', view === 'table');
  btnViewGrid.setAttribute('aria-pressed', String(view === 'grid'));
  btnViewTable.setAttribute('aria-pressed', String(view === 'table'));
}

applyTheme(currentTheme);
applyView(currentView);

function render() {
  const chars = filteredChars.slice(0, visibleCount);
  const actief = countActiveFilters(state);

  if (currentView === 'grid') {
    renderGrid(gridContainer, chars, favorites, toggleFavorite);
  } else {
    renderTable(tableBody, chars, favorites, toggleFavorite);
  }

  emptyState.hidden = filteredChars.length > 0;
  if (!filteredChars.length) {
    emptyMessage.textContent = state.search
      ? `Geen resultaten voor "${state.search}"`
      : 'Geen karakters gevonden voor de huidige filters.';
  }

  scrollStatus.hidden = visibleCount >= filteredChars.length;
  scrollStatus.textContent = `${visibleCount} van ${filteredChars.length} geladen — scroll voor meer`;

  updateStats(allCharacters.length, filteredChars.length, favorites.length, actief);
  btnResetFilters.hidden = actief === 0;
  btnResetFilters.textContent = `✕ Wis filters (${actief})`;
  btnExport.disabled = favorites.length === 0;
}

function applyAndRender() {
  state.favorites = favorites;
  filteredChars = applyFilters(allCharacters, state);
  visibleCount = 20;
  render();
}

function toggleFavorite(id) {
  const wasAdded = !favorites.includes(id);
  favorites = wasAdded
    ? [...favorites, id]
    : favorites.filter((fid) => fid !== id);
  saveFavorites(favorites);
  const char = allCharacters.find((c) => c.id === id);
  if (char) {
    showToast(wasAdded
      ? `❤️ ${char.name} toegevoegd aan favorieten`
      : `❌ ${char.name} verwijderd uit favorieten`
    );
  }
  applyAndRender();
}



async function loadData() {
  // Bug 3: voorkom meerdere gelijktijdige fetches
  if (isLoading) return;
  isLoading = true;

  // Bug 4: toon skeletons altijd in grid (ook als tabelweergave actief is)
  gridContainer.hidden = false;
  tableContainer.hidden = true;
  renderSkeletons(gridContainer, 12);
  errorBanner.hidden = true;

  try {
    allCharacters = await fetchCharacters();
    applyView(currentView);   // Herstel de juiste weergave
    applyAndRender();
  } catch (err) {
    applyView(currentView);   // Herstel ook bij fout
    errorBanner.hidden = false;
    errorMessage.textContent = `⚠️ ${err.message}`;
  } finally {
    isLoading = false;
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && visibleCount < filteredChars.length) {
      visibleCount = Math.min(visibleCount + 20, filteredChars.length);
      render();
    }
  },
  { threshold: 0.1 }
);
observer.observe(observerTarget);

document.getElementById('form-search').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = inputSearch.value.trim();
  if (val.length >= 1) { state.search = val; applyAndRender(); }
});

inputSearch.addEventListener('input', () => {
  state.search = inputSearch.value;
  btnSearchClear.hidden = !inputSearch.value.length;
  applyAndRender();
});

btnSearchClear.addEventListener('click', () => {
  inputSearch.value = ''; btnSearchClear.hidden = true;
  state.search = ''; applyAndRender();
});

filterStatus.addEventListener('change', () => { state.status = filterStatus.value; applyAndRender(); });
filterSpecies.addEventListener('change', () => { state.species = filterSpecies.value; applyAndRender(); });
filterGender.addEventListener('change', () => { state.gender = filterGender.value; applyAndRender(); });

btnFavOnly.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  btnFavOnly.classList.toggle('btn-primary', state.favoritesOnly);
  btnFavOnly.setAttribute('aria-pressed', String(state.favoritesOnly));
  applyAndRender();
});

btnResetFilters.addEventListener('click', () => {
  state.status = 'All'; state.species = 'All'; state.gender = 'All'; state.favoritesOnly = false;
  filterStatus.value = 'All'; filterSpecies.value = 'All'; filterGender.value = 'All';
  btnFavOnly.classList.remove('btn-primary');
  btnFavOnly.setAttribute('aria-pressed', 'false');
  showToast('✓ Filters gewist');
  applyAndRender();
});

btnResetAll.addEventListener('click', () => {
  state = { ...DEFAULT_STATE, favorites };
  inputSearch.value = ''; btnSearchClear.hidden = true;
  filterStatus.value = 'All'; filterSpecies.value = 'All'; filterGender.value = 'All';
  btnFavOnly.classList.remove('btn-primary');
  btnFavOnly.setAttribute('aria-pressed', 'false');

  // Bug 2: reset ook de visuele staat van de sorteerknopppen
  sortButtons.forEach((b) => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
    b.textContent = b.textContent.replace(/ [↑↓]$/, '');
  });
  const defaultSortBtn = document.querySelector('[data-field="name"]');
  if (defaultSortBtn) {
    defaultSortBtn.classList.add('active');
    defaultSortBtn.setAttribute('aria-pressed', 'true');
    defaultSortBtn.textContent += ' ↑';
  }

  applyAndRender();
});

sortButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    const order = (state.sortField === field && state.sortOrder === 'asc') ? 'desc' : 'asc';
    state.sortField = field; state.sortOrder = order;
    sortButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
      b.textContent = b.textContent.replace(/ [↑↓]$/, '');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent += order === 'asc' ? ' ↑' : ' ↓';
    applyAndRender();
  });
});

btnViewGrid.addEventListener('click', () => {
  currentView = 'grid'; saveView(currentView); applyView(currentView); render(); showToast('⊞ Grid');
});
btnViewTable.addEventListener('click', () => {
  currentView = 'table'; saveView(currentView); applyView(currentView); render(); showToast('☰ Tabel');
});

btnTheme.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme); saveTheme(currentTheme);
});

btnExport.addEventListener('click', () => exportFavoritesCSV(favorites, allCharacters));
document.getElementById('btn-retry').addEventListener('click', loadData);

loadData();
