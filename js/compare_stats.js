const LEVEL = 50;
const IV = 31;
const SP_TOTAL_MAX = 66;
const SP_STAT_MAX = 32;

const SPRITES_BASE_PATH = "../assets/images/sprites/";
const ICONS_BASE_PATH = "../assets/images/icons/";
const SAVED_POKEMON_KEY = "championsHubSavedPokemonBuilds";

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spa: "SPA",
  spd: "SPD",
  spe: "SPE"
};

const NATURES = [
  { name: "Hardy", up: null, down: null },
  { name: "Lonely", up: "atk", down: "def" },
  { name: "Brave", up: "atk", down: "spe" },
  { name: "Adamant", up: "atk", down: "spa" },
  { name: "Naughty", up: "atk", down: "spd" },

  { name: "Bold", up: "def", down: "atk" },
  { name: "Docile", up: null, down: null },
  { name: "Relaxed", up: "def", down: "spe" },
  { name: "Impish", up: "def", down: "spa" },
  { name: "Lax", up: "def", down: "spd" },

  { name: "Timid", up: "spe", down: "atk" },
  { name: "Hasty", up: "spe", down: "def" },
  { name: "Serious", up: null, down: null },
  { name: "Jolly", up: "spe", down: "spa" },
  { name: "Naive", up: "spe", down: "spd" },

  { name: "Modest", up: "spa", down: "atk" },
  { name: "Mild", up: "spa", down: "def" },
  { name: "Quiet", up: "spa", down: "spe" },
  { name: "Bashful", up: null, down: null },
  { name: "Rash", up: "spa", down: "spd" },

  { name: "Calm", up: "spd", down: "atk" },
  { name: "Gentle", up: "spd", down: "def" },
  { name: "Sassy", up: "spd", down: "spe" },
  { name: "Careful", up: "spd", down: "spa" },
  { name: "Quirky", up: null, down: null }
];

const ITEMS = [
  { name: "No item", modifiers: {} },
  { name: "Choice Scarf", modifiers: { spe: 1.5 } },
  { name: "Choice Band", modifiers: { atk: 1.5 } },
  { name: "Choice Specs", modifiers: { spa: 1.5 } },
  { name: "Assault Vest", modifiers: { spd: 1.5 } },
  { name: "Eviolite", modifiers: { def: 1.5, spd: 1.5 } },
  { name: "Iron Ball", modifiers: { spe: 0.5 } }
];

const ABILITY_EFFECTS = {
  "Swift Swim": ({ stats, weather, active }) => {
    if (active && weather === "rain") stats.spe = Math.floor(stats.spe * 2);
  },
  "Chlorophyll": ({ stats, weather, active }) => {
    if (active && weather === "sun") stats.spe = Math.floor(stats.spe * 2);
  },
  "Tail Wind": ({ stats, weather, active }) => {
    if (active && weather === "tailwind") stats.spe = Math.floor(stats.spe * 2);
  },
  "Sand Rush": ({ stats, weather, active }) => {
    if (active && weather === "sand") stats.spe = Math.floor(stats.spe * 2);
  },
  "Slush Rush": ({ stats, weather, active }) => {
    if (active && weather === "snow") stats.spe = Math.floor(stats.spe * 2);
  },
  "Huge Power": ({ stats, active }) => {
    if (active) stats.atk = Math.floor(stats.atk * 2);
  },
  "Pure Power": ({ stats, active }) => {
    if (active) stats.atk = Math.floor(stats.atk * 2);
  },
  "Marvel Scale": ({ stats, active }) => {
    if (active) stats.def = Math.floor(stats.def * 1.5);
  }
};

let pokemonData = [];
let currentMode = "single";

const singleModeBtn = document.getElementById("singleModeBtn");
const compareModeBtn = document.getElementById("compareModeBtn");
const singleModeView = document.getElementById("singleModeView");
const compareModeView = document.getElementById("compareModeView");
const DEFAULT_SPRITE_PATH = "../assets/images/sprites/default.png";

function buildSpritePath(fileName = "") {
  return fileName ? `${SPRITES_BASE_PATH}${fileName}` : "";
}

function buildIconPath(fileName = "") {
  return fileName ? `${ICONS_BASE_PATH}${fileName}` : "";
}

function getEl(id) {
  return document.getElementById(id);
}

function clampSp(value) {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(SP_STAT_MAX, num));
}

function spToEv(sp) {
  return Math.min(sp * 8, 252);
}

function getNatureByName(name) {
  return NATURES.find(n => n.name === name) || NATURES[0];
}

function loadSavedPokemonBuilds() {
  try {
    const raw = localStorage.getItem(SAVED_POKEMON_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error loading saved pokemon builds:", error);
    return [];
  }
}

function saveSavedPokemonBuilds(builds) {
  localStorage.setItem(SAVED_POKEMON_KEY, JSON.stringify(builds));
}

function buildSavedPokemonFromSingleMode() {
  const result = calculatePokemonResult("A");
  if (!result) return null;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    label: `${result.pokemon.name} - ${result.nature.name}`,
    pokemonIndex: result.selectedIndex,
    pokemonName: result.pokemon.name,
    nature: result.nature.name,
    item: result.item.name,
    ability: result.ability,
    weather: result.weather,
    mega: result.mega,
    abilityActive: result.abilityActive,
    sps: { ...result.sps }
  };
}

function refreshSavedPokemonSelectors() {
  const builds = loadSavedPokemonBuilds();

  const selectors = [
    getEl("savedBuildSelectACompare"),
    getEl("savedBuildSelectBCompare")
  ];

  selectors.forEach(select => {
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = `
      <option value="">Select saved build</option>
      ${builds.map(build => `
        <option value="${build.id}">${build.label}</option>
      `).join("")}
    `;

    select.value = builds.some(build => build.id === currentValue) ? currentValue : "";
  });
}

function applySavedBuildToPanel(prefix, buildId) {
  const builds = loadSavedPokemonBuilds();
  const build = builds.find(item => item.id === buildId);
  if (!build) return;

  const refs = getConfigRefs(prefix);

  if (refs.pokemonSelect) refs.pokemonSelect.value = build.pokemonIndex;
  populateAbilities(refs.abilitySelect, pokemonData[build.pokemonIndex]);

  if (refs.natureSelect) refs.natureSelect.value = build.nature;
  if (refs.itemSelect) refs.itemSelect.value = build.item;
  if (refs.abilitySelect) refs.abilitySelect.value = build.ability;
  if (refs.weatherSelect) refs.weatherSelect.value = build.weather;
  if (refs.megaToggle) refs.megaToggle.checked = !!build.mega;
  if (refs.abilityActiveToggle) refs.abilityActiveToggle.checked = !!build.abilityActive;

  if (refs.evInputs.hp) refs.evInputs.hp.value = build.sps.hp;
  if (refs.evInputs.atk) refs.evInputs.atk.value = build.sps.atk;
  if (refs.evInputs.def) refs.evInputs.def.value = build.sps.def;
  if (refs.evInputs.spa) refs.evInputs.spa.value = build.sps.spa;
  if (refs.evInputs.spd) refs.evInputs.spd.value = build.sps.spd;
  if (refs.evInputs.spe) refs.evInputs.spe.value = build.sps.spe;

  updateCalculator();
}

function saveCurrentSinglePokemon() {
  const build = buildSavedPokemonFromSingleMode();

  if (!build) {
    alert("Select a Pokemon before saving.");
    return;
  }

  const builds = loadSavedPokemonBuilds();

  const duplicateIndex = builds.findIndex(saved =>
    saved.pokemonName === build.pokemonName &&
    saved.nature === build.nature &&
    saved.item === build.item &&
    saved.ability === build.ability &&
    saved.weather === build.weather &&
    saved.mega === build.mega &&
    saved.abilityActive === build.abilityActive &&
    JSON.stringify(saved.sps) === JSON.stringify(build.sps)
  );

  if (duplicateIndex !== -1) {
    alert("This Pokémon build is already saved.");
    return;
  }

  builds.push(build);
  saveSavedPokemonBuilds(builds);
  refreshSavedPokemonSelectors();
}

function getItemByName(name) {
  return ITEMS.find(i => i.name === name) || ITEMS[0];
}

function getNatureMultiplier(statKey, nature) {
  if (statKey === "hp") return 1;
  if (nature.up === statKey) return 1.1;
  if (nature.down === statKey) return 0.9;
  return 1;
}

function calcHp(base, sp) {
  const ev = spToEv(sp);
  return Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL) / 100) + LEVEL + 10;
}

function calcOtherStat(base, sp, natureMultiplier) {
  const ev = spToEv(sp);
  const raw = Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL) / 100) + 5;
  return Math.floor(raw * natureMultiplier);
}

function applyItemModifiers(stats, item) {
  const modifiers = item.modifiers || {};
  Object.entries(modifiers).forEach(([statKey, multiplier]) => {
    stats[statKey] = Math.floor(stats[statKey] * multiplier);
  });
}

function applyAbilityModifiers(stats, ability, weather, abilityActive) {
  const effect = ABILITY_EFFECTS[ability];
  if (effect) {
    effect({ stats, weather, active: abilityActive });
  }
}

function populateNatures(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = NATURES.map(nature => {
    let label = nature.name;
    if (nature.up && nature.down) {
      label += ` (+${STAT_LABELS[nature.up]}, -${STAT_LABELS[nature.down]})`;
    }
    return `<option value="${nature.name}">${label}</option>`;
  }).join("");
  selectEl.value = "Serious";
}

function populateItems(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = ITEMS.map(item => `<option value="${item.name}">${item.name}</option>`).join("");
  selectEl.value = "No item";
}

function populatePokemonSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML =
    `<option value="">Select a Pokemon</option>` +
    pokemonData.map((pokemon, index) => `<option value="${index}">${pokemon.name}</option>`).join("");
}

function populateAbilities(selectEl, pokemon) {
  if (!selectEl) return;
  const abilities = pokemon?.abilities || [];
  selectEl.innerHTML =
    `<option value="">No ability selected</option>` +
    abilities.map(ability => `<option value="${ability}">${ability}</option>`).join("");
}

function getConfigRefs(prefix) {
  return {
    pokemonSelect: getEl(`pokemonSelect${prefix}`),
    natureSelect: getEl(`natureSelect${prefix}`),
    itemSelect: getEl(`itemSelect${prefix}`),
    abilitySelect: getEl(`abilitySelect${prefix}`),
    weatherSelect: getEl(`weatherSelect${prefix}`),
    megaToggle: getEl(`megaToggle${prefix}`),
    abilityActiveToggle: getEl(`abilityActiveToggle${prefix}`),
    evInputs: {
      hp: getEl(`evHp${prefix}`),
      atk: getEl(`evAtk${prefix}`),
      def: getEl(`evDef${prefix}`),
      spa: getEl(`evSpa${prefix}`),
      spd: getEl(`evSpd${prefix}`),
      spe: getEl(`evSpe${prefix}`)
    }
  };
}

function getDisplayRefs(prefix) {
  return {
    pokemonSprite: getEl(`pokemonSprite${prefix}`),
    pokemonName: getEl(`pokemonName${prefix}`),
    typeIcons: getEl(`typeIcons${prefix}`),
    pokemonBaseInfo: getEl(`pokemonBaseInfo${prefix}`),
    statsTableBody: getEl(`statsTableBody${prefix}`),
    summaryBox: getEl(`summaryBox${prefix}`),
    evWarning: getEl(`evWarning${prefix}`)
  };
}

function readConfig(prefix) {
  const refs = getConfigRefs(prefix);

  const selectedIndex = refs.pokemonSelect?.value ?? "";
  const pokemon = pokemonData[selectedIndex];

  const sps = {
    hp: clampSp(refs.evInputs.hp?.value),
    atk: clampSp(refs.evInputs.atk?.value),
    def: clampSp(refs.evInputs.def?.value),
    spa: clampSp(refs.evInputs.spa?.value),
    spd: clampSp(refs.evInputs.spd?.value),
    spe: clampSp(refs.evInputs.spe?.value)
  };

  return {
    selectedIndex,
    pokemon,
    nature: getNatureByName(refs.natureSelect?.value || "Serious"),
    item: getItemByName(refs.itemSelect?.value || "No item"),
    ability: refs.abilitySelect?.value || "",
    weather: refs.weatherSelect?.value || "none",
    mega: refs.megaToggle?.checked || false,
    abilityActive: refs.abilityActiveToggle?.checked || false,
    sps
  };
}

function normalizeInputs(prefix) {
  const refs = getConfigRefs(prefix);
  Object.values(refs.evInputs).forEach(input => {
    if (!input) return;
    input.value = clampSp(input.value);
  });
}

function enforceTotalSpLimit(prefix, changedStatKey) {
  const refs = getConfigRefs(prefix);
  const inputs = refs.evInputs;

  const currentValues = {};
  STAT_KEYS.forEach(statKey => {
    currentValues[statKey] = clampSp(inputs[statKey]?.value);
  });

  const otherTotal = STAT_KEYS
    .filter(statKey => statKey !== changedStatKey)
    .reduce((sum, statKey) => sum + currentValues[statKey], 0);

  const maxAllowedForChanged = Math.max(0, SP_TOTAL_MAX - otherTotal);
  const finalValue = Math.min(currentValues[changedStatKey], maxAllowedForChanged);

  if (inputs[changedStatKey]) {
    inputs[changedStatKey].value = finalValue;
  }
}

function getCurrentBaseStats(pokemon, megaEnabled) {
  const usingMega = megaEnabled && pokemon?.megaStats;
  return usingMega ? pokemon.megaStats : pokemon.baseStats;
}

function calculatePokemonResult(prefix) {
  normalizeInputs(prefix);

  const config = readConfig(prefix);
  if (!config.pokemon) return null;

  const usingMega = config.mega && !!config.pokemon.megaStats;
  const baseStats = getCurrentBaseStats(config.pokemon, config.mega);

  const calculatedStats = {};
  STAT_KEYS.forEach(statKey => {
    const base = baseStats[statKey];
    const natureMultiplier = getNatureMultiplier(statKey, config.nature);

    if (statKey === "hp") {
      calculatedStats[statKey] = calcHp(base, config.sps[statKey]);
    } else {
      calculatedStats[statKey] = calcOtherStat(base, config.sps[statKey], natureMultiplier);
    }
  });

  applyItemModifiers(calculatedStats, config.item);
  applyAbilityModifiers(calculatedStats, config.ability, config.weather, config.abilityActive);

  return {
    ...config,
    usingMega,
    baseStats,
    calculatedStats
  };
}

function renderPokemonCard(prefix, result) {
  const refs = getDisplayRefs(prefix);
  if (!refs.pokemonSprite || !refs.pokemonName || !refs.typeIcons || !refs.pokemonBaseInfo) return;

  if (!result) {
    refs.pokemonSprite.src = DEFAULT_SPRITE_PATH;
    refs.pokemonSprite.alt = "Default Pokemon sprite";
    refs.pokemonName.textContent = "Select a Pokemon";
    refs.typeIcons.innerHTML = "";
    refs.pokemonBaseInfo.textContent = "Level 50 stat calculation";
    return;
  }

  const { pokemon, usingMega } = result;

  refs.pokemonSprite.src = buildSpritePath(pokemon.sprite || "");
  refs.pokemonSprite.alt = pokemon.name;
  refs.pokemonSprite.onerror = () => {
    refs.pokemonSprite.onerror = null;
    refs.pokemonSprite.src = DEFAULT_SPRITE_PATH;
  };

  refs.pokemonName.textContent = usingMega ? `${pokemon.name} (Mega)` : pokemon.name;

  refs.typeIcons.innerHTML = (pokemon.typeIcons || [])
    .map(icon => `<img src="${buildIconPath(icon)}" alt="type icon" />`)
    .join("");

  refs.pokemonBaseInfo.textContent = `Level ${LEVEL} stat calculation`;
}

function renderStatsTable(prefix, result) {
  const refs = getDisplayRefs(prefix);
  if (!refs.statsTableBody) return;

  if (!result) {
    refs.statsTableBody.innerHTML = "";
    return;
  }

  refs.statsTableBody.innerHTML = STAT_KEYS.map(statKey => {
    let natureText = "—";
    let natureClass = "";
    let rowClass = "";

    if (statKey !== "hp") {
      if (result.nature.up === statKey) {
        natureText = "+10%";
        natureClass = "nature-up";
        rowClass = "stat-up";
      } else if (result.nature.down === statKey) {
        natureText = "-10%";
        natureClass = "nature-down";
        rowClass = "stat-down";
      } else {
        natureText = "Neutral";
      }
    }

    return `
      <tr class="${rowClass}">
        <td>${STAT_LABELS[statKey]}</td>
        <td>${result.baseStats[statKey]}</td>
        <td>${result.sps[statKey]}</td>
        <td class="${natureClass}">${natureText}</td>
        <td><strong>${result.calculatedStats[statKey]}</strong></td>
      </tr>
    `;
  }).join("");
}

function renderSummary(prefix, result) {
  const refs = getDisplayRefs(prefix);
  if (!refs.summaryBox || !refs.evWarning) return;

  if (!result) {
    refs.summaryBox.textContent = "Select a Pokemon to see calculated stats.";
    refs.evWarning.textContent = "";
    return;
  }

  const totalSp = Object.values(result.sps).reduce((sum, value) => sum + value, 0);
  refs.evWarning.textContent =
    totalSp > SP_TOTAL_MAX
      ? `Total SP used: ${totalSp}/${SP_TOTAL_MAX} - Over budget`
      : `Total SP used: ${totalSp}/${SP_TOTAL_MAX}`;

  const abilityText = result.ability
    ? `${result.ability}${result.abilityActive ? " (active)" : " (inactive)"}`
    : "No ability selected";

  const weatherText = result.weather === "none" ? "No weather" : result.weather;
  const megaText = result.usingMega ? "Yes" : "No";

  refs.summaryBox.innerHTML = `
    <strong>Summary</strong><br><br>
    Pokemon: ${result.pokemon.name}<br>
    Mega: ${megaText}<br>
    Nature: ${result.nature.name}<br>
    Item: ${result.item.name}<br>
    Ability: ${abilityText}<br>
    Weather: ${weatherText}<br><br>

    <strong>Final Stats</strong><br>
    HP: ${result.calculatedStats.hp}<br>
    ATK: ${result.calculatedStats.atk}<br>
    DEF: ${result.calculatedStats.def}<br>
    SPA: ${result.calculatedStats.spa}<br>
    SPD: ${result.calculatedStats.spd}<br>
    SPE: ${result.calculatedStats.spe}
  `;
}

function renderSingleMode() {
  const result = calculatePokemonResult("A");
  renderPokemonCard("A", result);
  renderStatsTable("A", result);
  renderSummary("A", result);
}

function compareClass(a, b, side) {
  if (a === b) return "compare-tie";
  if (side === "A") return a > b ? "compare-win" : "compare-lose";
  return b > a ? "compare-win" : "compare-lose";
}

function compareWinnerLabel(a, b, nameA, nameB) {
  if (a === b) return "Tie";
  return a > b ? nameA : nameB;
}

function renderCompareResults(resultA, resultB) {
  const comparePanel = getEl("comparePanel");
  if (!comparePanel) return;

  if (!resultA || !resultB) {
    comparePanel.innerHTML = `<div class="summary-box">Select two Pokémon to compare.</div>`;
    return;
  }

  const rows = STAT_KEYS.map(statKey => {
    const valueA = resultA.calculatedStats[statKey];
    const valueB = resultB.calculatedStats[statKey];

    return `
      <tr>
        <td>${STAT_LABELS[statKey]}</td>
        <td class="${compareClass(valueA, valueB, "A")}">${valueA}</td>
        <td class="${compareClass(valueA, valueB, "B")}">${valueB}</td>
        <td>${compareWinnerLabel(valueA, valueB, resultA.pokemon.name, resultB.pokemon.name)}</td>
      </tr>
    `;
  }).join("");

  comparePanel.innerHTML = `
    <div class="compare-card-head">
      <img src="${buildSpritePath(resultA.pokemon.sprite || "")}" alt="${resultA.pokemon.name}">
      <h3>${resultA.pokemon.name}</h3>
    </div>

    <div class="compare-card-head">
      <img src="${buildSpritePath(resultB.pokemon.sprite || "")}" alt="${resultB.pokemon.name}">
      <h3>${resultB.pokemon.name}</h3>
    </div>

    <table class="compare-table">
      <thead>
        <tr>
          <th>Stat</th>
          <th>${resultA.pokemon.name}</th>
          <th>${resultB.pokemon.name}</th>
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderCompareMode() {
  const resultA = calculatePokemonResult("ACompare");
  const resultB = calculatePokemonResult("BCompare");

  const warningA = getEl("evWarningACompare");
  const warningB = getEl("evWarningBCompare");

  if (warningA) {
    if (!resultA) {
      warningA.textContent = "";
    } else {
      const totalSpA = Object.values(resultA.sps).reduce((sum, value) => sum + value, 0);
      warningA.textContent =
        totalSpA > SP_TOTAL_MAX
          ? `Total SP used: ${totalSpA}/${SP_TOTAL_MAX} - Over budget`
          : `Total SP used: ${totalSpA}/${SP_TOTAL_MAX}`;
    }
  }

  if (warningB) {
    if (!resultB) {
      warningB.textContent = "";
    } else {
      const totalSpB = Object.values(resultB.sps).reduce((sum, value) => sum + value, 0);
      warningB.textContent =
        totalSpB > SP_TOTAL_MAX
          ? `Total SP used: ${totalSpB}/${SP_TOTAL_MAX} - Over budget`
          : `Total SP used: ${totalSpB}/${SP_TOTAL_MAX}`;
    }
  }

  renderCompareResults(resultA, resultB);
}

function updateCalculator() {
  if (currentMode === "single") {
    renderSingleMode();
  } else {
    renderCompareMode();
  }
}

function setMode(mode) {
  currentMode = mode;

  if (singleModeBtn) singleModeBtn.classList.toggle("active", mode === "single");
  if (compareModeBtn) compareModeBtn.classList.toggle("active", mode === "compare");
  if (singleModeView) singleModeView.classList.toggle("hidden", mode !== "single");
  if (compareModeView) compareModeView.classList.toggle("hidden", mode !== "compare");

  updateCalculator();
}

function bindModeEvents() {
  if (singleModeBtn) {
    singleModeBtn.addEventListener("click", () => setMode("single"));
  }

  if (compareModeBtn) {
    compareModeBtn.addEventListener("click", () => setMode("compare"));
  }
}

const savePokemonBtn = getEl("savePokemonBtn");
if (savePokemonBtn) {
  savePokemonBtn.addEventListener("click", saveCurrentSinglePokemon);
}

const savedBuildSelectACompare = getEl("savedBuildSelectACompare");
if (savedBuildSelectACompare) {
  savedBuildSelectACompare.addEventListener("change", (event) => {
    if (!event.target.value) return;
    applySavedBuildToPanel("ACompare", event.target.value);
  });
}

const savedBuildSelectBCompare = getEl("savedBuildSelectBCompare");
if (savedBuildSelectBCompare) {
  savedBuildSelectBCompare.addEventListener("change", (event) => {
    if (!event.target.value) return;
    applySavedBuildToPanel("BCompare", event.target.value);
  });
}

function bindCalculatorEvents(prefix) {
  const refs = getConfigRefs(prefix);
  if (!refs.pokemonSelect) return;

  refs.pokemonSelect.addEventListener("change", () => {
    const selectedIndex = refs.pokemonSelect.value;
    const pokemon = pokemonData[selectedIndex];
    populateAbilities(refs.abilitySelect, pokemon);

    if (!pokemon?.megaStats && refs.megaToggle) {
      refs.megaToggle.checked = false;
    }

    updateCalculator();
  });

  [
    refs.natureSelect,
    refs.itemSelect,
    refs.abilitySelect,
    refs.weatherSelect,
    refs.megaToggle,
    refs.abilityActiveToggle
  ].forEach(element => {
    if (!element) return;
    element.addEventListener("input", updateCalculator);
    element.addEventListener("change", updateCalculator);
  });

  Object.entries(refs.evInputs).forEach(([statKey, input]) => {
    if (!input) return;

    input.addEventListener("input", () => {
      input.value = clampSp(input.value);
      enforceTotalSpLimit(prefix, statKey);
      updateCalculator();
    });

    input.addEventListener("change", () => {
      input.value = clampSp(input.value);
      enforceTotalSpLimit(prefix, statKey);
      updateCalculator();
    });
  });
}

function initializePanel(prefix) {
  const refs = getConfigRefs(prefix);
  if (!refs.pokemonSelect) return;

  populatePokemonSelect(refs.pokemonSelect);
  populateNatures(refs.natureSelect);
  populateItems(refs.itemSelect);
  populateAbilities(refs.abilitySelect, null);
}

async function loadPokemonData() {
  try {
    const response = await fetch("../assets/data/pokemon.json");
    if (!response.ok) {
      throw new Error("Could not load pokemon.json");
    }

    pokemonData = await response.json();

    initializePanel("A");
    initializePanel("ACompare");
    initializePanel("BCompare");

    bindCalculatorEvents("A");
    bindCalculatorEvents("ACompare");
    bindCalculatorEvents("BCompare");

    updateCalculator();
  } catch (error) {
    const fallbacks = [
      getEl("summaryBoxA"),
      getEl("summaryBoxACompare"),
      getEl("summaryBoxBCompare")
    ];

    fallbacks.forEach(box => {
      if (box) box.textContent = "Error loading pokemon.json. Check the path: ../assets/data/pokemon.json";
    });

    const selects = [
      getEl("pokemonSelectA"),
      getEl("pokemonSelectACompare"),
      getEl("pokemonSelectBCompare")
    ];

    selects.forEach(select => {
      if (select) select.innerHTML = `<option value="">Failed to load Pokemon data</option>`;
    });

    console.error(error);
  }
  refreshSavedPokemonSelectors();
}

bindModeEvents();
loadPokemonData();