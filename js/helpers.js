const STORAGE_KEYS = {
  favorites: 'rickMortyFavorites',
  theme: 'rickMortyTheme',
  view: 'rickMortyView',
};

function loadFavorites() {
  const stored = localStorage.getItem(STORAGE_KEYS.favorites);
  try { return stored ? JSON.parse(stored) : []; } catch { return []; }
}

function saveFavorites(favorites) {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
}

function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEYS.theme);
  return stored === 'dark' ? 'dark' : 'light';
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function loadView() {
  const stored = localStorage.getItem(STORAGE_KEYS.view);
  return stored === 'table' ? 'table' : 'grid';
}

function saveView(view) {
  localStorage.setItem(STORAGE_KEYS.view, view);
}

const API_BASE = 'https://rickandmortyapi.com/api/character';
const PAGES_TO_FETCH = [1, 2, 3];

async function fetchCharacters() {
  const promises = PAGES_TO_FETCH.map((page) =>
    fetch(`${API_BASE}?page=${page}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP fout: status ${res.status}`);
        return res.json();
      })
  );
  const results = await Promise.all(promises);
  return results.flatMap((r) => r.results);
}

function applyFilters(characters, state) {
  let result = [...characters];

  if (state.search.trim()) {
    result = result.filter((char) =>
      char.name.toLowerCase().includes(state.search.toLowerCase())
    );
  }

  if (state.status !== 'All') result = result.filter((char) => char.status === state.status);
  if (state.species !== 'All') result = result.filter((char) => char.species === state.species);
  if (state.gender !== 'All') result = result.filter((char) => char.gender === state.gender);
  if (state.favoritesOnly) result = result.filter((char) => state.favorites.includes(char.id));

  result.sort((a, b) => {
    if (state.sortField === 'created') {
      const diff = new Date(a.created) - new Date(b.created);
      return state.sortOrder === 'asc' ? diff : -diff;
    }
    const cmp = String(a[state.sortField]).localeCompare(String(b[state.sortField]));
    return state.sortOrder === 'asc' ? cmp : -cmp;
  });

  return result;
}

function countActiveFilters(state) {
  return [
    state.status !== 'All',
    state.species !== 'All',
    state.gender !== 'All',
    state.favoritesOnly,
  ].filter(Boolean).length;
}

function statusDotClass(status) {
  return status === 'Alive' ? 'status-alive'
    : status === 'Dead' ? 'status-dead'
      : 'status-unknown';
}

function renderSkeletons(container, count) {
  container.innerHTML = '';
  Array.from({ length: count }).forEach(() => {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = `
      <div class="skeleton skel-img"></div>
      <div class="skel-body">
        <div class="skeleton skel-line" style="width:70%"></div>
        <div class="skeleton skel-line" style="width:45%"></div>
        <div class="skeleton skel-line" style="width:85%"></div>
        <div class="skeleton skel-line" style="width:55%"></div>
      </div>`;
    container.appendChild(el);
  });
}

function renderGrid(container, characters, favorites, onFavToggle) {
  container.innerHTML = '';
  characters.forEach((char) => {
    const isFav = favorites.includes(char.id);
    const card = document.createElement('article');
    card.className = 'character-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${char.image}" alt="${char.name}" class="card-img" loading="lazy" />
        <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${char.id}"
          aria-label="${isFav ? 'Verwijder' : 'Voeg toe als'} favoriet: ${char.name}"
          aria-pressed="${isFav}">❤
        </button>
      </div>
      <div class="card-body">
        <h3 class="card-name">${char.name}</h3>
        <div class="card-status">
          <span class="status-dot ${statusDotClass(char.status)}" aria-hidden="true"></span>
          ${char.status} — ${char.species}
        </div>
        <p class="card-detail"><strong>Geslacht:</strong> ${char.gender}</p>
        <p class="card-detail"><strong>Oorsprong:</strong> ${char.origin.name}</p>
        <p class="card-detail"><strong>Locatie:</strong> ${char.location.name}</p>
        <p class="card-detail"><strong>Afleveringen:</strong> ${char.episode.length}</p>
      </div>`;
    card.querySelector('.card-fav-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      onFavToggle(char.id);
    });
    // Bug 5: fallback bij gebroken afbeelding
    const cardImg = card.querySelector('.card-img');
    cardImg.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'card-img-placeholder';
      placeholder.textContent = '👤';
      cardImg.replaceWith(placeholder);
    });
    container.appendChild(card);
  });
}

function renderTable(tbody, characters, favorites, onFavToggle) {
  tbody.innerHTML = '';
  characters.forEach((char) => {
    const isFav = favorites.includes(char.id);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${char.image}" alt="${char.name}" class="table-avatar" loading="lazy"></td>
      <td style="font-weight:500">${char.name}</td>
      <td><div class="table-status">
        <span class="status-dot ${statusDotClass(char.status)}" aria-hidden="true"></span>
        ${char.status}
      </div></td>
      <td>${char.species}</td>
      <td>${char.gender}</td>
      <td><span class="table-cell-overflow" title="${char.origin.name}">${char.origin.name}</span></td>
      <td><span class="table-cell-overflow" title="${char.location.name}">${char.location.name}</span></td>
      <td>${char.episode.length} afl.</td>
      <td>
        <button class="table-fav-btn ${isFav ? 'active' : ''}" data-id="${char.id}"
          aria-label="${isFav ? 'Verwijder' : 'Voeg toe als'} favoriet: ${char.name}"
          aria-pressed="${isFav}">❤
        </button>
      </td>`;

    row.querySelector('.table-fav-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      onFavToggle(char.id);
    });
    tbody.appendChild(row);
  });
}

function updateStats(total, filtered, favCount, activeFilters) {
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-filtered').textContent = filtered;
  document.getElementById('stat-favorites').textContent = favCount;
  document.getElementById('stat-active-filters').textContent = activeFilters;
}


function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function exportFavoritesCSV(favorites, characters) {
  const favChars = characters.filter((c) => favorites.includes(c.id));
  if (!favChars.length) { alert('Geen favorieten om te exporteren!'); return; }
  const headers = ['ID', 'Naam', 'Status', 'Soort', 'Geslacht', 'Oorsprong', 'Locatie', 'Afleveringen'];
  const rows = favChars.map((c) =>
    `${c.id},"${c.name}","${c.status}","${c.species}","${c.gender}","${c.origin.name}","${c.location.name}",${c.episode.length}`
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `rick-morty-favorieten-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
