const LEVEL = 50;
const IV = 31;
const SP_TOTAL_MAX = 66;
const SP_STAT_MAX = 32;

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
    { name: "Serious", up: null, down: null },
    { name: "Bold", up: "def", down: "atk" },
    { name: "Modest", up: "spa", down: "atk" },
    { name: "Calm", up: "spd", down: "atk" },
    { name: "Timid", up: "spe", down: "atk" },
    { name: "Lonely", up: "atk", down: "def" },
    { name: "Mild", up: "spa", down: "def" },
    { name: "Gentle", up: "spd", down: "def" },
    { name: "Hasty", up: "spe", down: "def" },
    { name: "Adamant", up: "atk", down: "spa" },
    { name: "Impish", up: "def", down: "spa" },
    { name: "Careful", up: "spd", down: "spa" },
    { name: "Jolly", up: "spe", down: "spa" },
    { name: "Naughty", up: "atk", down: "spd" },
    { name: "Lax", up: "def", down: "spd" },
    { name: "Rash", up: "spa", down: "spd" },
    { name: "Naive", up: "spe", down: "spd" },
    { name: "Brave", up: "atk", down: "spe" },
    { name: "Relaxed", up: "def", down: "spe" },
    { name: "Quiet", up: "spa", down: "spe" },
    { name: "Sassy", up: "spd", down: "spe" }
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

const pokemonSelect = document.getElementById("pokemonSelect");
const natureSelect = document.getElementById("natureSelect");
const itemSelect = document.getElementById("itemSelect");
const abilitySelect = document.getElementById("abilitySelect");
const weatherSelect = document.getElementById("weatherSelect");
const megaToggle = document.getElementById("megaToggle");
const abilityActiveToggle = document.getElementById("abilityActiveToggle");

const evInputs = {
    hp: document.getElementById("evHp"),
    atk: document.getElementById("evAtk"),
    def: document.getElementById("evDef"),
    spa: document.getElementById("evSpa"),
    spd: document.getElementById("evSpd"),
    spe: document.getElementById("evSpe")
};

const pokemonSprite = document.getElementById("pokemonSprite");
const pokemonName = document.getElementById("pokemonName");
const typeIcons = document.getElementById("typeIcons");
const pokemonBaseInfo = document.getElementById("pokemonBaseInfo");
const statsTableBody = document.getElementById("statsTableBody");
const summaryBox = document.getElementById("summaryBox");
const evWarning = document.getElementById("evWarning");
const singleModeBtn = document.getElementById("singleModeBtn");
const compareModeBtn = document.getElementById("compareModeBtn");
const singleModeView = document.getElementById("singleModeView");
const compareModeView = document.getElementById("compareModeView");
const DEFAULT_SPRITE_PATH = "../assets/images/sprites/default.png";

let pokemonData = [];
let currentMode = "single";

function clampSp(value) {
    const num = Number(value) || 0;
    return Math.max(0, Math.min(SP_STAT_MAX, num));
}

function setMode(mode) {
  currentMode = mode;

  singleModeBtn.classList.toggle("active", mode === "single");
  compareModeBtn.classList.toggle("active", mode === "compare");

  singleModeView.classList.toggle("hidden", mode !== "single");
  compareModeView.classList.toggle("hidden", mode !== "compare");
}

singleModeBtn.addEventListener("click", () => setMode("single"));
compareModeBtn.addEventListener("click", () => setMode("compare"));

function readConfig(prefix) {
  return {
    pokemonIndex: document.getElementById(`pokemonSelect${prefix}`).value,
    nature: document.getElementById(`natureSelect${prefix}`).value,
    item: document.getElementById(`itemSelect${prefix}`).value,
    ability: document.getElementById(`abilitySelect${prefix}`).value,
    weather: document.getElementById(`weatherSelect${prefix}`).value,
    mega: document.getElementById(`megaToggle${prefix}`).checked,
    abilityActive: document.getElementById(`abilityActiveToggle${prefix}`).checked,
    sps: {
      hp: clampSp(document.getElementById(`evHp${prefix}`).value),
      atk: clampSp(document.getElementById(`evAtk${prefix}`).value),
      def: clampSp(document.getElementById(`evDef${prefix}`).value),
      spa: clampSp(document.getElementById(`evSpa${prefix}`).value),
      spd: clampSp(document.getElementById(`evSpd${prefix}`).value),
      spe: clampSp(document.getElementById(`evSpe${prefix}`).value)
    }
  };
}

function spToEv(sp) {
    return Math.min(sp * 8, 252);
}

function getSelectedNature() {
    return NATURES.find(n => n.name === natureSelect.value) || NATURES[0];
}

function getSelectedItem() {
    return ITEMS.find(i => i.name === itemSelect.value) || ITEMS[0];
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

function populateNatures() {
    natureSelect.innerHTML = NATURES.map(nature => {
    let label = nature.name;
    if (nature.up && nature.down) {
        label += ` (+${STAT_LABELS[nature.up]}, -${STAT_LABELS[nature.down]})`;
    }
    return `<option value="${nature.name}">${label}</option>`;
    }).join("");
    natureSelect.value = "Serious";
}

function populateItems() {
    itemSelect.innerHTML = ITEMS.map(item => `<option value="${item.name}">${item.name}</option>`).join("");
    itemSelect.value = "No item";
}

function populatePokemonSelect() {
    pokemonSelect.innerHTML = `<option value="">Select a Pokemon</option>` +
    pokemonData.map((pokemon, index) => {
        return `<option value="${index}">${pokemon.name}</option>`;
    }).join("");
}

function populateAbilities(pokemon) {
    const abilities = pokemon?.abilities || [];
    abilitySelect.innerHTML = `<option value="">No ability selected</option>` +
    abilities.map(ability => `<option value="${ability}">${ability}</option>`).join("");
}

function renderPokemonCard(pokemon, usingMega) {
    if (!pokemon) {
    pokemonSprite.src = DEFAULT_SPRITE_PATH;
    pokemonName.textContent = "Select a Pokemon";
    typeIcons.innerHTML = "";
    pokemonBaseInfo.textContent = "Level 50 stat calculation";
    return;
    }

    pokemonSprite.src = pokemon.sprite
      ? `../assets/images/sprites/${pokemon.sprite}`
      : "";
    pokemonSprite.alt = pokemon.name;

    pokemonName.textContent = usingMega ? `${pokemon.name} (Mega)` : pokemon.name;

    typeIcons.innerHTML = (pokemon.typeIcons || [])
      .map(icon => `<img src="../assets/images/icons/${icon}" alt="type icon" />`)
      .join("");

    const statSource = usingMega ? "megaStats" : "baseStats";
}

function getCurrentBaseStats(pokemon) {
    const usingMega = megaToggle.checked && pokemon.megaStats;
    return usingMega ? pokemon.megaStats : pokemon.baseStats;
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

function updateCalculator() {
  const selectedIndex = pokemonSelect.value;
  const pokemon = pokemonData[selectedIndex];

  if (!pokemon) {
    renderPokemonCard(null, false);
    statsTableBody.innerHTML = "";
    summaryBox.textContent = "Select a Pokemon to see calculated stats.";
    evWarning.textContent = "";
    return;
  }

  Object.values(evInputs).forEach(input => {
    input.value = clampSp(input.value);
  });

  const sps = {
    hp: clampSp(evInputs.hp.value),
    atk: clampSp(evInputs.atk.value),
    def: clampSp(evInputs.def.value),
    spa: clampSp(evInputs.spa.value),
    spd: clampSp(evInputs.spd.value),
    spe: clampSp(evInputs.spe.value)
  };

  const totalSp = Object.values(sps).reduce((sum, value) => sum + value, 0);

  if (totalSp > SP_TOTAL_MAX) {
    evWarning.textContent = `Total SP used: ${totalSp}/${SP_TOTAL_MAX} - Over budget`;
  } else {
    evWarning.textContent = `Total SP used: ${totalSp}/${SP_TOTAL_MAX}`;
  }

  const nature = getSelectedNature();
  const item = getSelectedItem();
  const ability = abilitySelect.value;
  const weather = weatherSelect.value;
  const abilityActive = abilityActiveToggle.checked;

  const usingMega = megaToggle.checked && !!pokemon.megaStats;
  const baseStats = getCurrentBaseStats(pokemon);

  renderPokemonCard(pokemon, usingMega);

  const calculatedStats = {};

  STAT_KEYS.forEach(statKey => {
    const base = baseStats[statKey];
    const natureMultiplier = getNatureMultiplier(statKey, nature);

    let finalValue;
    if (statKey === "hp") {
      finalValue = calcHp(base, sps[statKey]);
    } else {
      finalValue = calcOtherStat(base, sps[statKey], natureMultiplier);
    }

    calculatedStats[statKey] = finalValue;
  });

  applyItemModifiers(calculatedStats, item);
  applyAbilityModifiers(calculatedStats, ability, weather, abilityActive);

  statsTableBody.innerHTML = STAT_KEYS.map(statKey => {
    let natureText = "—";
    let natureClass = "";
    let rowClass = "";

    if (statKey !== "hp") {
      if (nature.up === statKey) {
        natureText = "+10%";
        natureClass = "nature-up";
        rowClass = "stat-up";
      } else if (nature.down === statKey) {
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
        <td>${baseStats[statKey]}</td>
        <td>${sps[statKey]}</td>
        <td class="${natureClass}">${natureText}</td>
        <td><strong>${calculatedStats[statKey]}</strong></td>
      </tr>
    `;
  }).join("");

  const abilityText = ability
    ? `${ability}${abilityActive ? " (active)" : " (inactive)"}`
    : "No ability selected";

  const weatherText = weather === "none" ? "No weather" : weather;
  const megaText = usingMega ? "Yes" : "No";

  summaryBox.innerHTML = `
    <strong>Summary</strong><br><br>
    Pokemon: ${pokemon.name}<br>
    Mega: ${megaText}<br>
    Nature: ${nature.name}<br>
    Item: ${item.name}<br>
    Ability: ${abilityText}<br>
    Weather: ${weatherText}<br><br>

    <strong>Final Stats</strong><br>
    HP: ${calculatedStats.hp}<br>
    ATK: ${calculatedStats.atk}<br>
    DEF: ${calculatedStats.def}<br>
    SPA: ${calculatedStats.spa}<br>
    SPD: ${calculatedStats.spd}<br>
    SPE: ${calculatedStats.spe}
  `;
}

async function loadPokemonData() {
    try {
    const response = await fetch("../assets/data/pokemon.json");
    if (!response.ok) {
        throw new Error("Could not load pokemon.json");
    }

    pokemonData = await response.json();
    populatePokemonSelect();
    populateNatures();
    populateItems();
    updateCalculator();
    } catch (error) {
    pokemonSelect.innerHTML = `<option value="">Failed to load Pokemon data</option>`;
    summaryBox.textContent = "Error loading pokemon.json. Check the path: assets/data/pokemon.json";
    console.error(error);
    }
}

pokemonSelect.addEventListener("change", () => {
    const selectedIndex = pokemonSelect.value;
    const pokemon = pokemonData[selectedIndex];
    populateAbilities(pokemon);
    if (!pokemon?.megaStats) {
    megaToggle.checked = false;
    }
    updateCalculator();
});

[
    natureSelect,
    itemSelect,
    abilitySelect,
    weatherSelect,
    megaToggle,
    abilityActiveToggle,
    ...Object.values(evInputs)
].forEach(element => {
    element.addEventListener("input", updateCalculator);
    element.addEventListener("change", updateCalculator);
});

loadPokemonData();