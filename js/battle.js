const STORAGE_KEY = 'pokemonChampionsTeams';
const POKEMON_PER_TEAM = 6;
const POKEMON_PER_PAGE = 32;

let teams = [];
let pokemonDex = [];
let pokemonMap = new Map();

let selectedTeamIndex = 0;
let enemyTeam = Array.from({ length: POKEMON_PER_TEAM }, () => createEmptyEnemyPokemon());

let pickerSlotIndex = 0;
let pokemonSearch = '';
let pokemonPage = 1;

const myTeamSelect = document.getElementById('myTeamSelect');
const myTeamPreview = document.getElementById('myTeamPreview');
const enemyTeamGrid = document.getElementById('enemyTeamGrid');
const selectedBattleGrid = document.getElementById('selectedBattleGrid');
const pokemonPickerModal = document.getElementById('pokemonPickerModal');
const closePickerModalBtn = document.getElementById('closePickerModalBtn');
const pickerGrid = document.getElementById('pickerGrid');
const pickerPagination = document.getElementById('pickerPagination');
const pokemonSearchInput = document.getElementById('pokemonSearchInput');
const toast = document.getElementById('toast');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadPokemonData();
  teams = loadTeams();
  renderTeamSelect();
  renderMyTeam();
  renderEnemyTeam();
  renderSelectedBattle();
  bindEvents();
}

function bindEvents() {
  myTeamSelect.addEventListener('change', (event) => {
    selectedTeamIndex = Number(event.target.value);
    renderMyTeam();
  });

  closePickerModalBtn.addEventListener('click', closePickerModal);

  pokemonPickerModal.addEventListener('click', (event) => {
    if (event.target === pokemonPickerModal) closePickerModal();
  });

  pokemonSearchInput.addEventListener('input', (event) => {
    pokemonSearch = event.target.value;
    pokemonPage = 1;
    renderPicker();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pokemonPickerModal.classList.contains('open')) {
      closePickerModal();
    }
  });
}

async function loadPokemonData() {
  try {
    const response = await fetch('assets/data/pokemon.json');
    if (!response.ok) throw new Error('No se pudo cargar pokemon.json');

    const data = await response.json();
    pokemonDex = Array.isArray(data) ? data : [];
    pokemonMap = new Map(pokemonDex.map((pokemon) => [pokemon.name, pokemon]));
  } catch (error) {
    console.error(error);
    showToast('Error cargando pokemon.json');
    pokemonDex = [];
    pokemonMap = new Map();
  }
}

function loadTeams() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function createEmptyEnemyPokemon() {
  return {
    name: '',
    selected: false,
    seenMoves: ['', '', '', '']
  };
}

function getPokemonData(name) {
  return pokemonMap.get(name) || null;
}

function getUsableTeams() {
  return teams.filter((team) =>
    team &&
    Array.isArray(team.pokemon) &&
    team.pokemon.some((pokemon) => pokemon.name && pokemon.name.trim())
  );
}

function renderTeamSelect() {
  const usableTeams = getUsableTeams();

  if (!usableTeams.length) {
    myTeamSelect.innerHTML = `<option value="0">No saved teams</option>`;
    myTeamSelect.disabled = true;
    return;
  }

  myTeamSelect.disabled = false;
  myTeamSelect.innerHTML = usableTeams.map((team, index) => `
    <option value="${index}">
      ${escapeHtml(team.teamName || `Team ${index + 1}`)}
    </option>
  `).join('');
}

function getCurrentMyTeam() {
  return getUsableTeams()[selectedTeamIndex] || null;
}

function renderMyTeam() {
  const team = getCurrentMyTeam();

  if (!team) {
    myTeamPreview.innerHTML = '';
    return;
  }

  myTeamPreview.innerHTML = team.pokemon.map((pokemon) => {
    const dexPokemon = getPokemonData(pokemon.name);
    const sprite = dexPokemon?.sprite || '';

    return `
      <article class="my-pokemon-card">
        ${sprite ? `<img src="${escapeAttribute(sprite)}" alt="${escapeAttribute(pokemon.name)}">` : ''}
        <div class="my-pokemon-name">${escapeHtml(pokemon.name || 'Empty')}</div>
        <div class="my-pokemon-meta">${escapeHtml(pokemon.item || 'No item')}</div>
        <div class="my-pokemon-meta">${escapeHtml(pokemon.nature || 'No nature')}</div>
      </article>
    `;
  }).join('');
}

function renderEnemyTeam() {
  enemyTeamGrid.innerHTML = enemyTeam.map((pokemon, index) => {
    const dexPokemon = getPokemonData(pokemon.name);

    if (!pokemon.name || !dexPokemon) {
      return `
        <button class="enemy-slot empty" type="button" data-enemy-slot="${index}">
          <span>+</span>
        </button>
      `;
    }

    return `
      <button class="enemy-slot filled" type="button" data-enemy-slot="${index}">
        <img src="${escapeAttribute(dexPokemon.sprite || '')}" alt="${escapeAttribute(pokemon.name)}">
        <div class="enemy-slot-name">${escapeHtml(pokemon.name)}</div>
      </button>
    `;
  }).join('');

  enemyTeamGrid.querySelectorAll('[data-enemy-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      pickerSlotIndex = Number(button.dataset.enemySlot);
      openPickerModal();
    });
  });
}

function renderSelectedBattle() {
  const selected = enemyTeam.filter((pokemon) => pokemon.selected).slice(0, 4);

  selectedBattleGrid.innerHTML = Array.from({ length: 4 }, (_, index) => {
    const pokemon = selected[index];

    if (!pokemon || !pokemon.name) {
      return `<div class="selected-empty">Empty slot</div>`;
    }

    const dexPokemon = getPokemonData(pokemon.name);
    const sprite = dexPokemon?.sprite || '';
    const moves = dexPokemon?.moves || [];

    return `
      <article class="selected-card">
        <div class="selected-head">
          ${sprite ? `<img src="${escapeAttribute(sprite)}" alt="${escapeAttribute(pokemon.name)}">` : ''}
          <div class="selected-name">${escapeHtml(pokemon.name)}</div>
        </div>

        <div class="selected-controls">
          <label class="selected-checkbox-wrap">
            <input type="checkbox" checked disabled />
            <span>Selected</span>
          </label>
        </div>

        <div class="moves-grid">
          ${pokemon.seenMoves.map((move, moveIndex) => `
            <div class="move-field">
              <label>Move ${moveIndex + 1}</label>
              <select data-selected-name="${escapeAttribute(pokemon.name)}" data-move-index="${moveIndex}">
                ${buildMoveOptions(moves, move)}
              </select>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');

  selectedBattleGrid.querySelectorAll('[data-selected-name]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const pokemonName = event.target.dataset.selectedName;
      const moveIndex = Number(event.target.dataset.moveIndex);
      const enemyPokemon = enemyTeam.find((pokemon) => pokemon.name === pokemonName && pokemon.selected);

      if (!enemyPokemon) return;
      enemyPokemon.seenMoves[moveIndex] = event.target.value;
    });
  });
}

function buildMoveOptions(moves, selectedMove = '') {
  const defaultOption = `<option value="">Select move</option>`;
  const options = moves.map((move) => `
    <option value="${escapeAttribute(move)}" ${move === selectedMove ? 'selected' : ''}>
      ${escapeHtml(move)}
    </option>
  `).join('');

  return defaultOption + options;
}

function openPickerModal() {
  pokemonSearch = '';
  pokemonPage = 1;
  pokemonSearchInput.value = '';
  renderPicker();
  pokemonPickerModal.classList.add('open');
  pokemonPickerModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePickerModal() {
  pokemonPickerModal.classList.remove('open');
  pokemonPickerModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function getFilteredPokemon() {
  const query = pokemonSearch.trim().toLowerCase();
  return pokemonDex.filter((pokemon) => pokemon.name.toLowerCase().includes(query));
}

function getPaginationData() {
  const filtered = getFilteredPokemon();
  const totalPages = Math.max(1, Math.ceil(filtered.length / POKEMON_PER_PAGE));

  if (pokemonPage > totalPages) pokemonPage = totalPages;

  const start = (pokemonPage - 1) * POKEMON_PER_PAGE;
  const end = start + POKEMON_PER_PAGE;

  return {
    filtered,
    totalPages,
    pageItems: filtered.slice(start, end)
  };
}

function renderPicker() {
  const { filtered, totalPages, pageItems } = getPaginationData();

  if (!filtered.length) {
    pickerGrid.innerHTML = `<div class="selected-empty">No Pokémon found</div>`;
    pickerPagination.innerHTML = '';
    return;
  }

  pickerGrid.innerHTML = pageItems.map((pokemon) => `
    <button class="picker-card" type="button" data-picker-name="${escapeAttribute(pokemon.name)}">
      <img src="${escapeAttribute(pokemon.sprite || '')}" alt="${escapeAttribute(pokemon.name)}">
      <span>${escapeHtml(pokemon.name)}</span>
    </button>
  `).join('');

  pickerGrid.querySelectorAll('[data-picker-name]').forEach((button) => {
    button.addEventListener('click', () => {
      assignEnemyPokemon(button.dataset.pickerName);
    });
  });

  pickerPagination.innerHTML = `
    <button class="page-btn" id="pickerPrevBtn" ${pokemonPage === 1 ? 'disabled' : ''}>← Prev</button>
    <div class="page-info">Page ${pokemonPage} / ${totalPages}</div>
    <button class="page-btn" id="pickerNextBtn" ${pokemonPage === totalPages ? 'disabled' : ''}>Next →</button>
  `;

  const prevBtn = document.getElementById('pickerPrevBtn');
  const nextBtn = document.getElementById('pickerNextBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (pokemonPage > 1) {
        pokemonPage--;
        renderPicker();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (pokemonPage < totalPages) {
        pokemonPage++;
        renderPicker();
      }
    });
  }
}

function assignEnemyPokemon(name) {
  enemyTeam[pickerSlotIndex] = {
    name,
    selected: enemyTeam[pickerSlotIndex]?.selected || false,
    seenMoves: enemyTeam[pickerSlotIndex]?.seenMoves || ['', '', '', '']
  };

  closePickerModal();
  renderEnemyTeam();
  renderSelectedBattle();
  refreshEnemySelectionControls();
}

function refreshEnemySelectionControls() {
  const alreadySelected = enemyTeam.filter((pokemon) => pokemon.selected).length;

  enemyTeamGrid.querySelectorAll('[data-enemy-slot]').forEach((button) => {
    const index = Number(button.dataset.enemySlot);
    const pokemon = enemyTeam[index];
    const existingToggle = button.querySelector('.enemy-selected-toggle');
    if (existingToggle) existingToggle.remove();

    if (!pokemon.name) return;

    const toggle = document.createElement('label');
    toggle.className = 'enemy-selected-toggle';
    toggle.style.display = 'none';
  });
}

enemyTeamGrid?.addEventListener?.('change', () => {});

function rebuildEnemyGridWithSelection() {
  enemyTeamGrid.innerHTML = enemyTeam.map((pokemon, index) => {
    const dexPokemon = getPokemonData(pokemon.name);

    if (!pokemon.name || !dexPokemon) {
      return `
        <button class="enemy-slot empty" type="button" data-enemy-slot="${index}">
          <span>+</span>
        </button>
      `;
    }

    return `
      <div class="enemy-slot filled">
        <button class="enemy-slot filled" type="button" data-enemy-slot="${index}">
          <img src="${escapeAttribute(dexPokemon.sprite || '')}" alt="${escapeAttribute(pokemon.name)}">
          <div class="enemy-slot-name">${escapeHtml(pokemon.name)}</div>
        </button>
        <label class="selected-checkbox-wrap" style="margin-top:8px; color:white;">
          <input type="checkbox" data-enemy-selected="${index}" ${pokemon.selected ? 'checked' : ''} />
          <span>Selected</span>
        </label>
      </div>
    `;
  }).join('');

  enemyTeamGrid.querySelectorAll('[data-enemy-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      pickerSlotIndex = Number(button.dataset.enemySlot);
      openPickerModal();
    });
  });

  enemyTeamGrid.querySelectorAll('[data-enemy-selected]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const index = Number(event.target.dataset.enemySelected);
      const nextValue = event.target.checked;
      const selectedCount = enemyTeam.filter((pokemon) => pokemon.selected).length;

      if (nextValue && selectedCount >= 4) {
        event.target.checked = false;
        showToast('Only 4 opponent Pokémon can be selected.');
        return;
      }

      enemyTeam[index].selected = nextValue;
      renderSelectedBattle();
    });
  });
}

function renderEnemyTeam() {
  rebuildEnemyGridWithSelection();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}