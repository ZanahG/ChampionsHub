const STORAGE_KEY = 'pokemonChampionsTeams';
const TEAM_SLOTS = 6;
const POKEMON_PER_TEAM = 6;
const MOVES_PER_POKEMON = 4;
const EV_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const SPRITES_BASE_PATH = './assets/images/sprites/';
const ICONS_BASE_PATH = './assets/images/icons/';

const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
];

const FIXED_LEVEL = 50;
const FIXED_IV = 31;
const MAX_STAT_POINTS_PER_STAT = 32;
const MAX_TOTAL_STAT_POINTS = 66;
const SP_TO_EV = 8;

const NATURE_EFFECTS = {
  Hardy:   { up: null,  down: null },
  Lonely:  { up: 'atk', down: 'def' },
  Brave:   { up: 'atk', down: 'spe' },
  Adamant: { up: 'atk', down: 'spa' },
  Naughty: { up: 'atk', down: 'spd' },

  Bold:    { up: 'def', down: 'atk' },
  Docile:  { up: null,  down: null },
  Relaxed: { up: 'def', down: 'spe' },
  Impish:  { up: 'def', down: 'spa' },
  Lax:     { up: 'def', down: 'spd' },

  Timid:   { up: 'spe', down: 'atk' },
  Hasty:   { up: 'spe', down: 'def' },
  Serious: { up: null,  down: null },
  Jolly:   { up: 'spe', down: 'spa' },
  Naive:   { up: 'spe', down: 'spd' },

  Modest:  { up: 'spa', down: 'atk' },
  Mild:    { up: 'spa', down: 'def' },
  Quiet:   { up: 'spa', down: 'spe' },
  Bashful: { up: null,  down: null },
  Rash:    { up: 'spa', down: 'spd' },

  Calm:    { up: 'spd', down: 'atk' },
  Gentle:  { up: 'spd', down: 'def' },
  Sassy:   { up: 'spd', down: 'spe' },
  Careful: { up: 'spd', down: 'spa' },
  Quirky:  { up: null,  down: null }
};

function getNatureMultiplier(nature, statKey) {
  if (statKey === 'hp') return 1;

  const effect = NATURE_EFFECTS[nature] || { up: null, down: null };

  if (effect.up === statKey) return 1.1;
  if (effect.down === statKey) return 0.9;
  return 1;
}

function buildSpritePath(fileName = '') {
  if (!fileName) return '';
  return `${SPRITES_BASE_PATH}${fileName}`;
}

function buildIconPath(fileName = '') {
  if (!fileName) return '';
  return `${ICONS_BASE_PATH}${fileName}`;
}

function calculateHP(base, statPoints = 0, iv = FIXED_IV, level = FIXED_LEVEL) {
  const effectiveEV = statPointsToEffectiveEV(statPoints);
  return Math.floor(((2 * base + iv + Math.floor(effectiveEV / 4)) * level) / 100) + level + 10;
}

function calculateOtherStat(base, statPoints = 0, nature = 'Serious', statKey, iv = FIXED_IV, level = FIXED_LEVEL) {
  const effectiveEV = statPointsToEffectiveEV(statPoints);
  const raw = Math.floor(((2 * base + iv + Math.floor(effectiveEV / 4)) * level) / 100) + 5;
  return Math.floor(raw * getNatureMultiplier(nature, statKey));
}

function calculatePokemonStats(baseStats, evs = {}, nature = 'Serious') {
  return {
    hp: calculateHP(baseStats.hp ?? 0, evs.hp ?? 0),
    atk: calculateOtherStat(baseStats.atk ?? 0, evs.atk ?? 0, nature, 'atk'),
    def: calculateOtherStat(baseStats.def ?? 0, evs.def ?? 0, nature, 'def'),
    spa: calculateOtherStat(baseStats.spa ?? 0, evs.spa ?? 0, nature, 'spa'),
    spd: calculateOtherStat(baseStats.spd ?? 0, evs.spd ?? 0, nature, 'spd'),
    spe: calculateOtherStat(baseStats.spe ?? 0, evs.spe ?? 0, nature, 'spe')
  };
}

function getNatureStatClass(nature, statKey) {
  const effect = NATURE_EFFECTS[nature] || { up: null, down: null };

  if (effect.up === statKey) return 'nature-up';
  if (effect.down === statKey) return 'nature-down';
  return '';
}

function refreshSummaryStats(container, pokemon) {
  const dexPokemon = getPokemonData(pokemon.name);
  if (!dexPokemon) return;

  const baseStats = dexPokemon.baseStats || {};
  const calculatedStats = calculatePokemonStats(baseStats, pokemon.evs, pokemon.nature);

  const statMap = {
    hp: calculatedStats.hp,
    atk: calculatedStats.atk,
    def: calculatedStats.def,
    spa: calculatedStats.spa,
    spd: calculatedStats.spd,
    spe: calculatedStats.spe
  };

  Object.entries(statMap).forEach(([statKey, value]) => {
    const row = container.querySelector(`[data-stat-row="${statKey}"]`);
    if (!row) return;

    const valueEl = row.querySelector('strong');
    if (valueEl) valueEl.textContent = value;

    row.classList.remove('nature-up', 'nature-down');
    const nextClass = getNatureStatClass(pokemon.nature, statKey);
    if (nextClass) row.classList.add(nextClass);
  });
}

function buildItemOptions(selectedItem = '') {
  const defaultOption = '<option value="">Select item</option>';

  const options = itemsDex.map(item => `
    <option value="${escapeAttribute(item.name)}" ${item.name === selectedItem ? 'selected' : ''}>
      ${escapeHtml(item.name)}
    </option>
  `).join('');

  return defaultOption + options;
}

let pokemonDex = [];
let pokemonMap = new Map();
let teams = [];
let currentSlotIndex = 0;
let selectedPokemonIndex = 0;
let pokemonSearch = '';
let currentDraft = createEmptyTeam();
let pokemonPage = 1;
let isEditingSet = false;
let teamGrid;
let teamModal;
let teamBuilder;
let modalTitle;
let teamNameInput;
let teamNoteInput;
let saveTeamBtn;
let closeModalBtn;
let cancelBtn;
let clearTeamBtn;
let fillExampleBtn;
let battleBtn;
let historyBtn;
let toast;
let logoImg;
let logoWrap;
let itemsDex = [];
let itemsMap = new Map();

document.addEventListener('DOMContentLoaded', init);

async function init() {
  getDOMElements();
  bindStaticEvents();
  await loadPokemonData();
  await loadItemsData();
  teams = loadTeams();
  renderTeamGrid();
}

function getPokemonPerPage() {
  return isEditingSet ? 16 : 32;
}

function getDOMElements() {
  teamGrid = document.getElementById('teamGrid');
  teamModal = document.getElementById('teamModal');
  teamBuilder = document.getElementById('teamBuilder');
  modalTitle = document.getElementById('modalTitle');
  teamNameInput = document.getElementById('teamName');
  teamNoteInput = document.getElementById('teamNote');
  saveTeamBtn = document.getElementById('saveTeamBtn');
  closeModalBtn = document.getElementById('closeModalBtn');
  cancelBtn = document.getElementById('cancelBtn');
  clearTeamBtn = document.getElementById('clearTeamBtn');
  fillExampleBtn = document.getElementById('fillExampleBtn');
  battleBtn = document.getElementById('battleBtn');
  historyBtn = document.getElementById('historyBtn');
  toast = document.getElementById('toast');
  logoImg = document.getElementById('logoImg');
  logoWrap = document.getElementById('logoWrap');
}

function bindStaticEvents() {
  if (saveTeamBtn) saveTeamBtn.addEventListener('click', saveCurrentDraft);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeTeamModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeTeamModal);
  if (clearTeamBtn) clearTeamBtn.addEventListener('click', clearCurrentSlot);
  if (fillExampleBtn) fillExampleBtn.addEventListener('click', fillExampleTeam);
  if (battleBtn) {
    battleBtn.addEventListener('click', () => {
      window.location.href = 'battle.html';
    });
  }

  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      showToast('La pantalla de historial la armamos después de la de batalla.');
    });
  }

  if (teamModal) {
    teamModal.addEventListener('click', (event) => {
      if (event.target === teamModal) closeTeamModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && teamModal?.classList.contains('open')) {
      closeTeamModal();
    }
  });

  if (logoImg && logoWrap) {
    logoImg.addEventListener('error', () => {
      logoImg.style.display = 'none';
      logoWrap.classList.add('fallback-active');
    });
  }
}

async function loadPokemonData() {
  try {
    const response = await fetch('assets/data/pokemon.json');
    if (!response.ok) {
      throw new Error('No se pudo cargar assets/data/pokemon.json');
    }

    const data = await response.json();
    pokemonDex = Array.isArray(data) ? data : [];
    pokemonMap = new Map(pokemonDex.map((pokemon) => [pokemon.name, pokemon]));
  } catch (error) {
    console.error('Error cargando la data de Pokémon:', error);
    showToast('Error cargando pokemon.json');
    pokemonDex = [];
    pokemonMap = new Map();
  }
}

async function loadItemsData() {
  try {
    const response = await fetch('assets/data/items.json');
    if (!response.ok) {
      throw new Error('No se pudo cargar assets/data/items.json');
    }

    const data = await response.json();
    itemsDex = Array.isArray(data) ? data : [];
    itemsMap = new Map(itemsDex.map(item => [item.name, item]));
  } catch (error) {
    console.error('Error cargando la data de ítems:', error);
    itemsDex = [];
    itemsMap = new Map();
  }
}

function getPokemonData(name) {
  return pokemonMap.get(name) || null;
}

function createEmptyPokemon() {
  return {
    name: '',
    item: '',
    nature: 'Serious',
    moves: ['', '', '', ''],
    evs: {
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0
    }
  };
}

function createEmptyTeam() {
  return {
    teamName: '',
    note: '',
    pokemon: Array.from({ length: POKEMON_PER_TEAM }, createEmptyPokemon),
    updatedAt: null
  };
}

function clampEV(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return 0;
  return Math.min(MAX_STAT_POINTS_PER_STAT, Math.floor(number));
}

function statPointsToEffectiveEV(statPoints = 0) {
  return clampEV(statPoints) * SP_TO_EV;
}

function normalizeTeam(team) {
  const emptyTeam = createEmptyTeam();
  if (!team || typeof team !== 'object') return emptyTeam;

  return {
    teamName: team.teamName || '',
    note: team.note || '',
    updatedAt: team.updatedAt || null,
    pokemon: Array.from({ length: POKEMON_PER_TEAM }, (_, index) => {
      const sourcePokemon = team.pokemon?.[index] || {};

      return {
        name: sourcePokemon.name || '',
        item: sourcePokemon.item || '',
        nature: NATURES.includes(sourcePokemon.nature) ? sourcePokemon.nature : 'Serious',
        moves: Array.from(
          { length: MOVES_PER_POKEMON },
          (_, moveIndex) => sourcePokemon.moves?.[moveIndex] || ''
        ),
        evs: {
          hp: clampEV(sourcePokemon.evs?.hp),
          atk: clampEV(sourcePokemon.evs?.atk),
          def: clampEV(sourcePokemon.evs?.def),
          spa: clampEV(sourcePokemon.evs?.spa),
          spd: clampEV(sourcePokemon.evs?.spd),
          spe: clampEV(sourcePokemon.evs?.spe)
        }
      };
    })
  };
}

function loadTeams() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return Array.from({ length: TEAM_SLOTS }, createEmptyTeam);
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.from({ length: TEAM_SLOTS }, (_, index) => normalizeTeam(parsed[index]));
  } catch (error) {
    console.error('No se pudieron leer los equipos guardados:', error);
    return Array.from({ length: TEAM_SLOTS }, createEmptyTeam);
  }
}

function saveTeamsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function isTeamFilled(team) {
  return Boolean(team.teamName.trim() || team.pokemon.some((pokemon) => pokemon.name.trim()));
}

function getFilledPokemonCount(team) {
  return team.pokemon.filter((pokemon) => pokemon.name.trim()).length;
}

function renderTeamGrid() {
  if (!teamGrid) return;

  teamGrid.innerHTML = '';

  teams.forEach((team, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `team-slot ${isTeamFilled(team) ? 'filled' : 'empty'}`;
    button.addEventListener('click', () => openTeamModal(index));

    if (isTeamFilled(team)) {
      const count = getFilledPokemonCount(team);
      const names = team.pokemon
        .map((pokemon) => pokemon.name.trim())
        .filter(Boolean)
        .slice(0, 4);

      button.innerHTML = `
        <div class="team-card">
          <div class="team-card-name">${escapeHtml(team.teamName || `Team ${index + 1}`)}</div>
          <div class="team-card-count">${count}/6 Pokémon</div>
          <div class="team-mini-list">
            ${
              names.length
                ? names.map((name) => `<span>${escapeHtml(name)}</span>`).join('')
                : '<span>Sin nombres aún</span>'
            }
          </div>
        </div>
      `;
    } else {
      button.innerHTML = '<span class="plus">+</span>';
    }

    teamGrid.appendChild(button);
  });
}

function openTeamModal(slotIndex) {
  currentSlotIndex = slotIndex;
  currentDraft = JSON.parse(JSON.stringify(normalizeTeam(teams[slotIndex])));
  selectedPokemonIndex = 0;
  pokemonSearch = '';
  pokemonPage = 1;
  isEditingSet = false;

  if (modalTitle) modalTitle.textContent = `Editar equipo ${slotIndex + 1}`;
  if (teamNameInput) teamNameInput.value = currentDraft.teamName;
  if (teamNoteInput) teamNoteInput.value = currentDraft.note;

  renderTeamBuilder(currentDraft);

  if (teamModal) {
    teamModal.classList.add('open');
    teamModal.setAttribute('aria-hidden', 'false');
  }

  document.body.style.overflow = 'hidden';
}

function getFilteredPokemon() {
  const normalizedSearch = pokemonSearch.trim().toLowerCase();

  return pokemonDex.filter((pokemon) =>
    pokemon.name.toLowerCase().includes(normalizedSearch)
  );
}

function getPokemonPaginationData() {
  const filteredPokemon = getFilteredPokemon();
  const perPage = getPokemonPerPage();
  const totalPages = Math.max(1, Math.ceil(filteredPokemon.length / perPage));

  if (pokemonPage > totalPages) {
    pokemonPage = totalPages;
  }

  const startIndex = (pokemonPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pagePokemon = filteredPokemon.slice(startIndex, endIndex);

  return {
    filteredPokemon,
    totalPages,
    pagePokemon
  };
}

function buildPokemonPagination() {
  const { filteredPokemon, totalPages } = getPokemonPaginationData();

  if (!filteredPokemon.length) return '';

  return `
    <div class="box-pagination-inner">
      <button
        type="button"
        class="box-page-btn"
        id="prevPokemonPage"
        ${pokemonPage === 1 ? 'disabled' : ''}
      >
        ← Prev
      </button>

      <div class="box-page-info">
        Page ${pokemonPage} / ${totalPages}
      </div>

      <button
        type="button"
        class="box-page-btn"
        id="nextPokemonPage"
        ${pokemonPage === totalPages ? 'disabled' : ''}
      >
        Next →
      </button>
    </div>
  `;
}

function closeTeamModal() {
  if (teamModal) {
    teamModal.classList.remove('open');
    teamModal.setAttribute('aria-hidden', 'true');
  }

  document.body.style.overflow = '';
}

function buildNatureOptions(selectedNature = 'Serious') {
  return NATURES.map((nature) => `
    <option value="${escapeAttribute(nature)}" ${nature === selectedNature ? 'selected' : ''}>
      ${escapeHtml(nature)}
    </option>
  `).join('');
}

function buildPokemonOptions(selectedPokemon = '') {
  const defaultOption = '<option value="">Select a Pokémon</option>';

  const options = pokemonDex.map((pokemon) => `
    <option value="${escapeAttribute(pokemon.name)}" ${pokemon.name === selectedPokemon ? 'selected' : ''}>
      ${escapeHtml(pokemon.name)}
    </option>
  `).join('');

  return defaultOption + options;
}

function buildMoveOptions(pokemonName, selectedMove = '') {
  const pokemon = getPokemonData(pokemonName);
  const moves = pokemon?.moves || [];

  const defaultOption = '<option value="">Select move</option>';

  const options = moves.map((move) => `
    <option value="${escapeAttribute(move)}" ${move === selectedMove ? 'selected' : ''}>
      ${escapeHtml(move)}
    </option>
  `).join('');

  return defaultOption + options;
}

function buildPokemonPreview(pokemonName) {
  const pokemon = getPokemonData(pokemonName);

  if (!pokemon) {
    return `<div class="pokemon-placeholder">Select a Pokémon</div>`;
  }

  const types = Array.isArray(pokemon.types) ? pokemon.types : [];
  const typeIcons = Array.isArray(pokemon.typeIcons) ? pokemon.typeIcons : [];

  const iconsHtml = types.map((type, index) => {
    const iconFile = typeIcons[index] || '';
    const iconPath = buildIconPath(iconFile);

    return iconPath
      ? `<img class="pokemon-type-icon" src="${escapeAttribute(iconPath)}" alt="${escapeAttribute(type)}" title="${escapeAttribute(type)}">`
      : '';
  }).join('');

  return `
    <div class="pokemon-preview-inline">
      <img
        class="pokemon-preview-sprite"
        src="${escapeAttribute(buildSpritePath(pokemon.sprite || ''))}"
        alt="${escapeAttribute(pokemon.name)}"
      />
      <div class="pokemon-preview-icons">
        ${iconsHtml}
      </div>
    </div>
  `;
}

function renderTeamBuilder(team) {
  if (!teamBuilder) return;

  const selectedPokemon = team.pokemon[selectedPokemonIndex] || createEmptyPokemon();

  teamBuilder.innerHTML = `
    <div class="builder-layout box-style-layout ${isEditingSet ? 'editing-set' : ''}">
      <aside class="box-team-column">
        <div class="box-team-header">Team ${currentSlotIndex + 1}</div>

        <div class="box-team-slots">
          ${team.pokemon.map((pokemon, index) => buildTeamSlotBox(pokemon, index)).join('')}
        </div>
      </aside>

      <section class="box-picker-column">

        <div class="box-search-input-wrap">
          <input
            id="pokemonSearchInput"
            class="box-search-input"
            type="text"
            placeholder="Buscar Pokémon..."
            value="${escapeAttribute(pokemonSearch)}"
          />
        </div>

        <div class="box-picker-grid">
          ${buildPokemonPickerGrid()}
        </div>

        <div class="box-pagination">
          ${buildPokemonPagination()}
        </div>
      </section>

      <aside class="box-summary-column" id="builderSummary">
        ${buildSimplePokemonSummary(selectedPokemon)}
      </aside>
    </div>
  `;

  attachPokemonCardEvents();
}

function buildTeamSlotBox(pokemon, index) {
  const dexPokemon = getPokemonData(pokemon.name);
  const sprite = dexPokemon?.sprite ? buildSpritePath(dexPokemon.sprite) : '';
  const isActive = index === selectedPokemonIndex;

  return `
    <button
      type="button"
      class="box-team-slot ${isActive ? 'active' : ''}"
      data-slot-index="${index}"
    >
      ${
        sprite
          ? `<img class="box-team-slot-sprite" src="${escapeAttribute(sprite)}" alt="${escapeAttribute(pokemon.name || `Pokémon ${index + 1}`)}">`
          : ''
      }
    </button>
  `;
}

function buildPokemonPickerGrid() {
  const { filteredPokemon, pagePokemon } = getPokemonPaginationData();

  if (!filteredPokemon.length) {
    return `<div class="box-empty-search">No se encontraron Pokémon.</div>`;
  }

  return pagePokemon.map((pokemon) => {
    const currentName = currentDraft.pokemon[selectedPokemonIndex]?.name || '';
    const isSelected = pokemon.name === currentName;

    return `
      <button
        type="button"
        class="box-picker-card ${isSelected ? 'selected' : ''}"
        data-pokemon-name="${escapeAttribute(pokemon.name)}"
      >
        <img
          class="box-picker-sprite"
          src="${escapeAttribute(buildSpritePath(pokemon.sprite || ''))}"
          alt="${escapeAttribute(pokemon.name)}"
        />
        <span class="box-picker-name">${escapeHtml(pokemon.name)}</span>
      </button>
    `;
  }).join('');
}

function buildSimplePokemonSummary(pokemon) {
  const dexPokemon = getPokemonData(pokemon.name);

  if (!dexPokemon) {
    return `
      <div class="box-summary-empty">
        Select a Pokemon for this Slot.
      </div>
    `;
  }

  const types = Array.isArray(dexPokemon.types) ? dexPokemon.types : [];
  const typeIcons = Array.isArray(dexPokemon.typeIcons) ? dexPokemon.typeIcons : [];
  const baseStats = dexPokemon.baseStats || {};
  const calculatedStats = calculatePokemonStats(baseStats, pokemon.evs, pokemon.nature);

  const typesHtml = types.map((type, index) => `
    <div class="box-summary-type">
      ${typeIcons[index] ? `<img src="${escapeAttribute(buildIconPath(typeIcons[index]))}" alt="${escapeAttribute(type)}">` : ''}
      <span>${escapeHtml(type)}</span>
    </div>
  `).join('');

  const statRows = [
    ['hp', 'HP', calculatedStats.hp],
    ['atk', 'Atk', calculatedStats.atk],
    ['def', 'Def', calculatedStats.def],
    ['spa', 'SpA', calculatedStats.spa],
    ['spd', 'SpD', calculatedStats.spd],
    ['spe', 'Spe', calculatedStats.spe]
  ].map(([statKey, label, value]) => `
    <div class="box-stat-row ${getNatureStatClass(pokemon.nature, statKey)}" data-stat-row="${statKey}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');

  const previewHtml = `
    <div class="box-set-preview">
      <div class="box-set-preview-row">
        <span>Object</span>
        <strong>${escapeHtml(pokemon.item || '—')}</strong>
      </div>
      <div class="box-set-preview-row">
        <span>Nature</span>
        <strong>${escapeHtml(pokemon.nature || '—')}</strong>
      </div>
      <div class="box-set-preview-row">
        <span>EV total</span>
        <strong>${getPokemonEVTotal(pokemon)} / 510</strong>
      </div>
    </div>

    <button type="button" class="edit-set-trigger" id="editSetBtn">
      Edit set
    </button>
  `;

  const editorHtml = `
    <div class="set-editor-panel">
      <div class="box-edit-grid">
        <div class="field">
          <label>Object</label>
          <select data-field="item">
            ${buildItemOptions(pokemon.item)}
          </select>
        </div>

        <div class="field">
          <label>Nature</label>
          <select data-field="nature">
            ${buildNatureOptions(pokemon.nature)}
          </select>
        </div>
      </div>

      <div class="box-set-two-columns">
        <div class="box-set-column">
          <div class="subsection-title compact-subtitle">Moveset</div>
          <div class="moves-grid compact-moves-grid">
            ${pokemon.moves.map((move, moveIndex) => `
              <div class="field">
                <label>Movement ${moveIndex + 1}</label>
                <select data-field="move" data-move-index="${moveIndex}">
                  ${buildMoveOptions(pokemon.name, move)}
                </select>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="box-ev-column">
          <div class="subsection-title compact-subtitle">EVs</div>
          <div class="ev-grid compact-ev-grid side-ev-grid">
            ${EV_STATS.map((stat) => `
              <div class="field">
                <label>${stat.toUpperCase()}</label>
                <input
                  type="number"
                  min="0"
                  max="32"
                  step="1"
                  data-field="ev"
                  data-stat="${stat}"
                  value="${pokemon.evs[stat]}"
                />
              </div>
            `).join('')}
          </div>

          <div class="ev-total compact-ev-total" data-ev-total>
            <span>Total EVs: <strong>${getPokemonEVTotal(pokemon)}</strong> / ${MAX_TOTAL_STAT_POINTS}</span>
          </div>
        </div>
      </div>

      <div class="set-action-row">
        <button type="button" class="set-action-btn primary" id="saveSetBtn">
          Save Set
        </button>
      </div>
    </div>
  `;

  return `
    <div class="box-summary-card">
      <div class="box-summary-head">
        <img
          class="box-summary-sprite"
          src="${escapeAttribute(buildSpritePath(dexPokemon.sprite || ''))}"
          alt="${escapeAttribute(dexPokemon.name)}"
        />
        <div>
          <h4>${escapeHtml(dexPokemon.name)}</h4>
          <div class="box-summary-types">${typesHtml}</div>
        </div>
      </div>

      <div class="box-stats-block">
        ${statRows}
      </div>

      ${isEditingSet ? editorHtml : previewHtml}
    </div>
  `;
}

function buildPartySlot(pokemon, index) {
  const dexPokemon = getPokemonData(pokemon.name);
  const sprite = dexPokemon?.sprite ? buildSpritePath(dexPokemon.sprite) : '';
  const isActive = index === selectedPokemonIndex;

  return `
    <button
      type="button"
      class="party-slot ${isActive ? 'active' : ''}"
      data-slot-index="${index}"
    >
      <div class="party-slot-sprite-wrap">
        ${
          sprite
            ? `<img class="party-slot-sprite" src="${escapeAttribute(sprite)}" alt="${escapeAttribute(pokemon.name || `Pokémon ${index + 1}`)}">`
            : `<span class="party-slot-empty">+</span>`
        }
      </div>

      <div class="party-slot-meta">
        <span class="party-slot-number">Pokémon ${index + 1}</span>
        <span class="party-slot-name">${escapeHtml(pokemon.name || 'Vacío')}</span>
      </div>
    </button>
  `;
}

function buildPokemonSummary(pokemon) {
  const dexPokemon = getPokemonData(pokemon.name);

  if (!dexPokemon) {
    return `
      <div class="summary-card empty">
        <div class="summary-empty">Select Pokémon too see summary.</div>
      </div>
    `;
  }

  const types = Array.isArray(dexPokemon.types) ? dexPokemon.types : [];
  const typeIcons = Array.isArray(dexPokemon.typeIcons) ? dexPokemon.typeIcons : [];
  const ability = Array.isArray(dexPokemon.abilities) && dexPokemon.abilities.length
    ? dexPokemon.abilities[0]
    : '—';

  const typeHtml = types.map((type, index) => {
    const icon = typeIcons[index] || '';
    return `
      <div class="summary-type">
        ${icon ? `<img src="${escapeAttribute(buildIconPath(icon))}" alt="${escapeAttribute(type)}">` : ''}
        <span>${escapeHtml(type)}</span>
      </div>
    `;
  }).join('');

  const moveHtml = pokemon.moves.map((move, index) => `
    <div class="summary-move-row">
      <span>Move ${index + 1}</span>
      <strong>${escapeHtml(move || '—')}</strong>
    </div>
  `).join('');

  return `
    <div class="summary-card">
      <div class="summary-head">
        <img
          class="summary-sprite"
          src="${escapeAttribute(buildSpritePath(dexPokemon.sprite || ''))}"
          alt="${escapeAttribute(dexPokemon.name)}"
        />

        <div class="summary-head-meta">
          <h4>${escapeHtml(dexPokemon.name)}</h4>
          <div class="summary-types">
            ${typeHtml}
          </div>
        </div>
      </div>

      <div class="summary-block">
        <div class="summary-row">
          <span>Objeto</span>
          <strong>${escapeHtml(pokemon.item || '—')}</strong>
        </div>
        <div class="summary-row">
          <span>Naturaleza</span>
          <strong>${escapeHtml(pokemon.nature || '—')}</strong>
        </div>
        <div class="summary-row">
          <span>Habilidad</span>
          <strong>${escapeHtml(ability)}</strong>
        </div>
        <div class="summary-row">
          <span>EV total</span>
          <strong>${getPokemonEVTotal(pokemon)} / 510</strong>
        </div>
      </div>

      <div class="summary-moves">
        ${moveHtml}
      </div>
    </div>
  `;
}

function refreshSummaryPanel() {
  const summary = document.getElementById('builderSummary');
  if (!summary) return;
  summary.innerHTML = buildPokemonSummary(currentDraft.pokemon[selectedPokemonIndex]);
}

function attachPokemonCardEvents() {
  const slotButtons = teamBuilder.querySelectorAll('[data-slot-index]');
  const pickerButtons = teamBuilder.querySelectorAll('[data-pokemon-name]');
  const searchInput = document.getElementById('pokemonSearchInput');
  const prevPageBtn = document.getElementById('prevPokemonPage');
  const nextPageBtn = document.getElementById('nextPokemonPage');
  const editSetBtn = document.getElementById('editSetBtn');
  const saveSetBtn = document.getElementById('saveSetBtn');

  slotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedPokemonIndex = Number(button.dataset.slotIndex);
      renderTeamBuilder(currentDraft);
    });
  });

  pickerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const pokemonName = button.dataset.pokemonName;
      const pokemon = currentDraft.pokemon[selectedPokemonIndex];

      pokemon.name = pokemonName;

      const allowedMoves = new Set(getPokemonData(pokemon.name)?.moves || []);
      pokemon.moves = pokemon.moves.map((move) => (allowedMoves.has(move) ? move : ''));

      renderTeamBuilder(currentDraft);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      pokemonSearch = event.target.value;
      pokemonPage = 1;

      const caretStart = event.target.selectionStart ?? pokemonSearch.length;
      const caretEnd = event.target.selectionEnd ?? pokemonSearch.length;

      renderTeamBuilder(currentDraft);

      requestAnimationFrame(() => {
        const newSearchInput = document.getElementById('pokemonSearchInput');
        if (!newSearchInput) return;

        newSearchInput.focus();
        newSearchInput.setSelectionRange(caretStart, caretEnd);
      });
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (pokemonPage > 1) {
        pokemonPage--;
        renderTeamBuilder(currentDraft);
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const { totalPages } = getPokemonPaginationData();
      if (pokemonPage < totalPages) {
        pokemonPage++;
        renderTeamBuilder(currentDraft);
      }
    });
  }

  if (editSetBtn) {
    editSetBtn.addEventListener('click', () => {
      isEditingSet = true;
      renderTeamBuilder(currentDraft);

      requestAnimationFrame(() => {
        const firstField = document.querySelector('#builderSummary input, #builderSummary select');
        if (firstField) firstField.focus();
      });
    });
  }

  if (saveSetBtn) {
    saveSetBtn.addEventListener('click', () => {
      isEditingSet = false;
      renderTeamBuilder(currentDraft);
      showToast('Set saved.');
    });
  }

  const summary = document.getElementById('builderSummary');
  if (!summary) return;

  const inputs = summary.querySelectorAll('input, select');

  inputs.forEach((input) => {
    input.addEventListener('input', (event) => handlePokemonInput(summary, selectedPokemonIndex, event));
    input.addEventListener('change', (event) => handlePokemonInput(summary, selectedPokemonIndex, event));
  });

  updateEVDisplay(summary, currentDraft.pokemon[selectedPokemonIndex]);
  refreshSummaryStats(summary, currentDraft.pokemon[selectedPokemonIndex]);
}

function getItemData(name) {
  return itemsMap.get(name) || null;
}

function handlePokemonInput(container, pokemonIndex, event) {
  const pokemon = currentDraft.pokemon[pokemonIndex];
  const target = event.target;
  const field = target.dataset.field;

  if (field === 'item') {
    pokemon.item = target.value;
  }

  if (field === 'nature') {
    pokemon.nature = target.value;
  }

  if (field === 'move') {
    const moveIndex = Number(target.dataset.moveIndex);
    pokemon.moves[moveIndex] = target.value;
  }

  if (field === 'ev') {
    const stat = target.dataset.stat;
    target.value = String(clampEV(target.value));
    pokemon.evs[stat] = clampEV(target.value);
  }

  updateEVDisplay(container, pokemon);
  refreshSummaryStats(container, pokemon);
}

function refreshPokemonCardUI(card, pokemon) {
  const preview = card.querySelector('[data-pokemon-preview]');
  if (preview) {
    preview.innerHTML = buildPokemonPreview(pokemon.name);
  }

  const moveSelects = card.querySelectorAll('[data-field="move"]');
  moveSelects.forEach((select, index) => {
    select.innerHTML = buildMoveOptions(pokemon.name, pokemon.moves[index]);
  });
}

function getPokemonEVTotal(pokemon) {
  return EV_STATS.reduce((sum, stat) => sum + clampEV(pokemon.evs[stat]), 0);
}

function updateEVDisplay(card, pokemon) {
  const total = getPokemonEVTotal(pokemon);
  const display = card.querySelector('[data-ev-total]');

  if (!display) return;

  display.classList.toggle('over-limit', total > MAX_TOTAL_STAT_POINTS);
  display.innerHTML = `
    <span>Total SP: <strong>${total}</strong> / ${MAX_TOTAL_STAT_POINTS}</span>
    <span>${total > MAX_TOTAL_STAT_POINTS ? 'Distribución inválida' : 'Distribución válida'}</span>
  `;
}

function validateDraft() {
  for (let i = 0; i < currentDraft.pokemon.length; i++) {
    const pokemon = currentDraft.pokemon[i];
    const totalSP = getPokemonEVTotal(pokemon);

    if (totalSP > MAX_TOTAL_STAT_POINTS) {
      showToast(`El Pokémon ${i + 1} supera el máximo de ${MAX_TOTAL_STAT_POINTS} SP.`);
      return false;
    }
  }

  return true;
}

function saveCurrentDraft() {
  currentDraft.teamName = teamNameInput ? teamNameInput.value.trim() : '';
  currentDraft.note = teamNoteInput ? teamNoteInput.value.trim() : '';
  currentDraft.updatedAt = new Date().toISOString();

  if (!validateDraft()) return;

  teams[currentSlotIndex] = JSON.parse(JSON.stringify(currentDraft));
  saveTeamsToStorage();
  renderTeamGrid();
  closeTeamModal();
  showToast('Equipo guardado en tu navegador.');
}

function clearCurrentSlot() {
  teams[currentSlotIndex] = createEmptyTeam();
  saveTeamsToStorage();
  renderTeamGrid();
  closeTeamModal();
  showToast('Slot vaciado.');
}

function fillExampleTeam() {
  currentDraft.teamName = 'Sun Offense';
  currentDraft.note = 'Ejemplo';
  if (teamNameInput) teamNameInput.value = currentDraft.teamName;
  if (teamNoteInput) teamNoteInput.value = currentDraft.note;

  currentDraft.pokemon = [
    {
      name: 'Charizard',
      item: 'Life Orb',
      nature: 'Timid',
      moves: ['Protect', 'Heat Wave', 'Air Slash', 'Solar Beam'],
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 }
    },
    {
      name: '',
      item: '',
      nature: 'Serious',
      moves: ['', '', '', ''],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: '',
      item: '',
      nature: 'Serious',
      moves: ['', '', '', ''],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: '',
      item: '',
      nature: 'Serious',
      moves: ['', '', '', ''],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: '',
      item: '',
      nature: 'Serious',
      moves: ['', '', '', ''],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: '',
      item: '',
      nature: 'Serious',
      moves: ['', '', '', ''],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    }
  ];

  renderTeamBuilder(currentDraft);
}

function showToast(message) {
  if (!toast) return;

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