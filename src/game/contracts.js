/* Contracts — "Zwischenaufgaben", the mid-run task system (docs/zwischenaufgaben.md).

   OPT-IN PER RUN. Everything here is inert unless the run carries `contractsEnabled`, which only the
   "Aufträge" button on the start screen sets. A run started any other way never touches this module,
   so the normal run stays exactly what it is today — that separation is the whole point of the flag
   and must survive any change in here.

   The module is React-free and side-effect-free: it rolls offers, measures progress against the state
   the engine already keeps, and returns the patch a piece of loot applies. The reducer owns the state. */

import * as C from "./constants.js";
import { FORMATION_TYPES, SEGMENT_SIZE, countBuiltFormations } from "./formations.js";
import { TIER_META } from "./rarity.js";
import { ROWS as ARCH_ROWS, COLS as ARCH_COLS, posOf as archPos, familyDef } from "./architect.js";

/* ------------------------------------------------------------------------------------------------
   Windows and steps
   ------------------------------------------------------------------------------------------------ */

/* Owner 2026-09-15: 16 and 32, not 15 and 30. The decision block is Skill·Perk·Aufstellen·Architekt,
   so both bounds land on the last round of a complete block and each window is exactly four of them.
   Asserted in test/contracts.test.js against DECISION_SCHEDULE rather than trusted here. */
export const WINDOWS = [
  { id: 1, from: 1, to: 16 },
  { id: 2, from: 17, to: 32 },
];

export const STEPS = ["leicht", "mittel", "schwer", "sehrschwer"];

/* Rarity runs 1..4 through TIER_META (Normal · Selten · Sehr selten · Episch); 5 is legendary, which
   has no tier of its own — it is a single piece, like the legendary perks. */
export const TIER_LEGENDARY = 5;
export const tierLabel = (tier) => (tier >= TIER_LEGENDARY ? "Legendär" : (TIER_META[tier] || {}).label || "");

/* Each step pays from a band of two neighbouring rarities, weighted toward the lower one. On the
   fourth step the same weight IS the legendary rate — legendary has exactly this one way in. */
export const STEP_TIER = { leicht: 1, mittel: 2, schwer: 3, sehrschwer: 4 };
export const STEP_BAND = { leicht: [1, 2], mittel: [2, 3], schwer: [3, 4], sehrschwer: [4, TIER_LEGENDARY] };
export const LOWER_SHARE = 0.7;

export const OFFERS_PER_WINDOW = 3;   // three tasks to choose from, always three different steps
export const LOOT_PER_REWARD = 3;     // three pieces to choose from once the task is done

/* ------------------------------------------------------------------------------------------------
   The fifteen tasks
   ------------------------------------------------------------------------------------------------
   kind — how the counter is read:
     "spitze"  best single occurrence in the window (best cycle, or best placement)
     "summe"   running total over the whole window
     "zustand" read at the window's end, the whole run counts

   `variants` rolls a parameter instead of listing near-identical tasks (the same trick WEEK_MODS
   uses): Reinheit rolls the formation type, Quartier the building category. A variant may carry its
   own rungs — Reinheit's four ladders share one shape and differ only in where they start. */
export const TASKS = [
  { id: "durchmarsch",  kind: "spitze",  rungs: [22, 26, 30, 34] },
  { id: "sperrfeuer",   kind: "spitze",  rungs: [2, 3, 4, 5] },
  { id: "straehne",     kind: "spitze",  rungs: [10, 15, 30, 60] },
  { id: "gedraenge",    kind: "spitze",  rungs: [15, 25, 35, 45] },
  { id: "reinheit",     kind: "spitze",  variantKey: "formation",
    variants: [
      { id: "farbblock",    rungs: [2, 3, 4, 5] },
      { id: "wiederholung", rungs: [3, 4, 5, 6] },
      { id: "treppe",       rungs: [4, 5, 6, 7] },
      { id: "wechsel",      rungs: [5, 6, 7, 8] },
    ] },
  { id: "langbau",      kind: "spitze",  rungs: [5, 10, 15, 20] },
  { id: "vollbrett",    kind: "spitze",  rungs: [30, 34, 37, 40] },
  { id: "verflechtung", kind: "spitze",  rungs: [3, 5, 7, 10] },
  { id: "farbtreue",    kind: "spitze",  rungs: [5, 7, 10, 15] },
  { id: "buntspiel",    kind: "spitze",  rungs: [4, 5, 6, 7] },
  /* Brecher is the one task whose ladder runs over the THRESHOLD, not the amount: ten tricks stay
     ten, the combat value they must beat is what rises. `threshold: true` tells the display to read
     the rung as "über X" and the target as TEN. */
  { id: "brecher",      kind: "summe",   rungs: [10, 12, 15, 20], threshold: true, need: 10 },
  { id: "fussvolk",     kind: "summe",   rungs: [40, 60, 80, 110] },
  { id: "aufmarsch",    kind: "zustand", rungs: [20, 30, 40, 60] },
  { id: "quartier",     kind: "zustand", rungs: [1, 2, 3, 4], variantKey: "category",
    variants: [{ id: "score" }, { id: "value" }, { id: "formation" }] },
  { id: "saeckel",      kind: "zustand", rungs: [60, 80, 100, 120] },
];

export const TASK_BY_ID = Object.fromEntries(TASKS.map((t) => [t.id, t]));

/* The rung a task/step/variant pair asks for. A variant's own rungs win over the task's. */
export function rungFor(taskId, step, variantId = null) {
  const task = TASK_BY_ID[taskId];
  if (!task) return null;
  const i = STEPS.indexOf(step);
  if (i < 0) return null;
  const variant = variantId && (task.variants || []).find((v) => v.id === variantId);
  const rungs = (variant && variant.rungs) || task.rungs;
  return rungs ? rungs[i] : null;
}

/* What the counter must reach. For Brecher that is ten tricks, not the rung. */
export const targetFor = (taskId, step, variantId = null) => {
  const task = TASK_BY_ID[taskId];
  if (!task) return null;
  return task.need != null ? task.need : rungFor(taskId, step, variantId);
};

/* ------------------------------------------------------------------------------------------------
   The loot catalogue — 13 families of four, plus four legendary singles
   ------------------------------------------------------------------------------------------------
   `effect` is read by applyLoot below. Categories exist so one reward never offers the same kind of
   help twice; the draw is per FAMILY, so all thirteen are equally likely. */
export const LOOT_CATEGORIES = ["muenze", "aufstellung", "baufeld", "skills", "perks", "neuwurf"];

export const LOOT_FAMILIES = [
  { id: "zehrgeld",    category: "muenze",      effects: [{ coins: 15 }, { coins: 25 }, { coins: 50 }, { coins: 100 }] },
  { id: "muenzrecht",  category: "muenze",      effects: [{ income: 1, cycles: 15 }, { income: 1 }, { income: 2 }, { income: 4 }] },
  { id: "ablass",      category: "muenze",      effects: [{ forfeitMult: 1.5 }, { forfeitMult: 2 }, { forfeitMult: 2.5 }, { forfeitMult: 3 }] },
  { id: "freizug",     category: "aufstellung", effects: [{ energy: 1, cycles: 5 }, { energy: 1 }, { energy: 2 }, { energy: 2, unspentMult: 2 }] },
  { id: "baurecht",    category: "baufeld",     effects: [{ cover: 1 }, { cover: 2 }, { cover: 3 }, { cover: 4 }] },
  { id: "aufstockung", category: "baufeld",     effects: [{ upgradeBuildings: 1 }, { upgradeBuildings: 2 }, { upgradeBuildings: 3 }, { upgradeBuildings: "all" }] },
  { id: "lehrbrief",   category: "skills",      effects: [{ skillUp: 1, steps: 1 }, { skillUp: 2, steps: 1 }, { skillUp: 3, steps: 1 }, { skillUp: 4, steps: 2 }] },
  { id: "freibrief",   category: "skills",      effects: [{ thirdDoor: 1 }, { thirdDoor: 3 }, { thirdDoor: "run" }, { thirdDoor: "run", highTierChance: true }] },
  { id: "veredelung",  category: "skills",      effects: [{ offerLift: 1, phases: 1 }, { offerLift: 1, phases: 3 }, { offerLiftBelow: 3 }, { offerLiftBelow: 4 }] },
  { id: "auslage",     category: "perks",       effects: [{ perksOffered: 4, phases: 1 }, { perksOffered: 4 }, { perksOffered: 4, perkFloor: 2 }, { perksOffered: 4, perkFloor: 3 }] },
  { id: "beschau",     category: "perks",       effects: [{ perkFloor: 2, phases: 1 }, { perkFloor: 2 }, { perkFloor: 3 }, { perkFloor: 3, legendaryChance: true }] },
  { id: "freilos",     category: "neuwurf",     effects: [{ freeRerolls: 2 }, { freeRerollPerPhase: ["skill"] }, { freeRerollPerPhase: ["skill", "perk", "arch"] }, { freeRerollPerPhase: ["skill", "perk", "arch"], legendaryRerollNormalPrice: true }] },
  /* Nachlass rounds DOWN and never below one coin. Rounding up would have left the first reroll
     unchanged at a quarter off (3 → 2.25 → 3); rounding down without a floor would make it free at
     three quarters off. Hence down, with a floor of 1. */
  { id: "nachlass",    category: "neuwurf",     effects: [{ rerollScale: 0.75 }, { rerollScale: 0.5 }, { rerollScale: 0.25 }, { rerollScale: 0 }] },
];

export const LOOT_BY_ID = Object.fromEntries(LOOT_FAMILIES.map((f) => [f.id, f]));

export const LEGENDARIES = [
  { id: "reliquiar",  effect: { legendaryPerkPick: 3 } },
  { id: "vollendung", effect: { skillToEpic: 1, skillUpRest: 1 } },
  { id: "stadtrecht", effect: { coverUncapped: true } },
  { id: "stiftung",   effect: { coinsPerPhase: 5 } },
];

/* ------------------------------------------------------------------------------------------------
   Rolling the offers and the loot
   ------------------------------------------------------------------------------------------------ */

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];

function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Three offers, always three DIFFERENT steps — without that it is a choice between activities, not
   between safety and rarity. `used` keeps window 2 from repeating window 1's task. */
export function rollOffers(rng = Math.random, used = [], count = OFFERS_PER_WINDOW) {
  const pool = TASKS.filter((t) => !used.includes(t.id));
  const tasks = shuffled(pool.length >= count ? pool : TASKS, rng).slice(0, count);
  const steps = shuffled(STEPS, rng).slice(0, count);
  return tasks.map((task, i) => {
    const step = steps[i];
    const variantId = task.variants ? pick(task.variants, rng).id : null;
    return { taskId: task.id, step, variantId, rung: rungFor(task.id, step, variantId), target: targetFor(task.id, step, variantId) };
  });
}

/* One tier out of the step's band: the lower rarity at LOWER_SHARE, the upper at the rest. */
export const rollTier = (step, rng = Math.random) => {
  const band = STEP_BAND[step] || STEP_BAND.leicht;
  return rng() < LOWER_SHARE ? band[0] : band[1];
};

/* Three pieces, no category twice. A legendary tier draws from the four singles; every other tier
   draws a family and takes that family's piece AT that tier. */
export function rollLoot(rng = Math.random, step = "leicht", count = LOOT_PER_REWARD) {
  const out = [];
  const usedCategories = new Set();
  const usedIds = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const tier = rollTier(step, rng);
    if (tier >= TIER_LEGENDARY) {
      const free = LEGENDARIES.filter((l) => !usedIds.has(l.id));
      if (!free.length) continue;
      const leg = pick(free, rng);
      usedIds.add(leg.id);
      out.push({ kind: "legendary", id: leg.id, tier: TIER_LEGENDARY, effect: leg.effect });
      continue;
    }
    const free = LOOT_FAMILIES.filter((f) => !usedCategories.has(f.category) && !usedIds.has(`${f.id}@${tier}`));
    if (!free.length) continue;
    const fam = pick(free, rng);
    usedCategories.add(fam.category);
    usedIds.add(`${fam.id}@${tier}`);
    out.push({ kind: "family", id: fam.id, category: fam.category, tier, effect: fam.effects[tier - 1] });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
   Measuring — what the counter stands at right now
   ------------------------------------------------------------------------------------------------
   Nine of the fifteen read state the engine already keeps. The other five need a per-trick tally,
   which the reducer maintains in `state.contractTally` (see tallyTrick below). Nothing here writes. */

/* Distinct formations of the current placement, optionally filtered to one type. Counts each run
   once (ordinal === 1) and only the four real types — `formationskern` and `anker` are architecture,
   not a built formation. */
function formationsOfType(perPosition, type = null) {
  let n = 0;
  for (const p of perPosition || []) {
    for (const f of p.formations || []) {
      if (f.ordinal !== 1 || !FORMATION_TYPES.includes(f.type)) continue;
      if (!type || f.type === type) n += 1;
    }
  }
  return n;
}

/* The longest run of the placement. A run's members carry ordinals 1..L, so the highest ordinal a
   real type reaches IS that run's length. */
function longestFormation(perPosition) {
  let max = 0;
  for (const p of perPosition || []) {
    for (const f of p.formations || []) {
      if (FORMATION_TYPES.includes(f.type) && f.ordinal > max) max = f.ordinal;
    }
  }
  return max;
}

/* Positions carrying at least `min` distinct real formations. */
function positionsWith(perPosition, min) {
  let n = 0;
  for (const p of perPosition || []) {
    let c = 0;
    for (const f of p.formations || []) if (FORMATION_TYPES.includes(f.type)) c += 1;
    if (c >= min) n += 1;
  }
  return n;
}

/* Combat value of the player's deck over the opponent's — the whole run counts, read at the end. */
function deckLead(state) {
  const sum = (deck) => (deck || []).reduce((s, c) => s + ((c && c.value) || 0), 0);
  return sum(state.deck) - sum(state.oppDeck);
}

/* Fully covered building segments of one category. A segment is a ROW of the 8×5 building grid, and
   it counts only when all five of its cells are covered by buildings of that one category — a
   building occupies its whole `footprint`, not a single cell. */
function fullSegments(state, category) {
  const arch = state.architect;
  if (!state.architectEnabled || !arch || !Array.isArray(arch.buildings)) return 0;
  const cells = new Set();
  for (const b of arch.buildings) {
    const fam = familyDef(b && b.familyId);
    if (!fam || (category && fam.category !== category)) continue;
    for (const p of b.footprint || []) cells.add(p);
  }
  let n = 0;
  for (let r = 0; r < ARCH_ROWS; r++) {
    let full = true;
    for (let c = 0; c < ARCH_COLS; c++) if (!cells.has(archPos(r, c))) { full = false; break; }
    if (full) n += 1;
  }
  return n;
}

/* The live value of one contract. `perPosition` is state.formations (the current placement). */
export function readValue(state, contract) {
  if (!contract) return 0;
  const tally = state.contractTally || {};
  const forms = state.formations || [];
  switch (contract.taskId) {
    case "durchmarsch":  return Math.max(tally.bestCycleWins || 0, state.cycleWins || 0);
    case "sperrfeuer":   return Math.max(tally.bestSegments || 0, tally.segments || 0);
    case "straehne":     return state.bestStreak || 0;
    case "gedraenge":    return Math.max(tally.bestForms || 0, countBuiltFormations(forms));
    case "reinheit":     return Math.max(tally.bestPure || 0, formationsOfType(forms, contract.variantId));
    case "langbau":      return Math.max(tally.bestLong || 0, longestFormation(forms));
    case "vollbrett":    return Math.max(tally.bestCovered || 0, positionsWith(forms, 1));
    case "verflechtung": return Math.max(tally.bestWoven || 0, positionsWith(forms, 3));
    case "farbtreue":    return tally.bestSuitStreak || 0;
    case "buntspiel":    return Math.max(tally.bestRainbow || 0, minSuitWins(tally.suitWins));
    case "brecher":      return tally.overThreshold || 0;
    case "fussvolk":     return tally.lowWins || 0;
    case "aufmarsch":    return deckLead(state);
    case "quartier":     return fullSegments(state, contract.variantId);
    case "saeckel":      return state.coins || 0;
    default:             return 0;
  }
}

export const minSuitWins = (suitWins) => {
  const w = suitWins || {};
  return Math.min(...C.SUIT_ORDER.map((s) => w[s] || 0));
};

export const isFulfilled = (state, contract) =>
  !!contract && readValue(state, contract) >= (contract.target || Infinity);

/* ------------------------------------------------------------------------------------------------
   The per-trick tally
   ------------------------------------------------------------------------------------------------
   Five tasks cannot be read off the state afterwards: they need what happened while the tricks ran.
   One object carries all five, so a contract run costs a single extra bookkeeping step per trick. */

export const emptyTally = () => ({
  segments: 0, bestSegments: 0, segWins: 0, segIndex: 0,
  suitWins: {}, bestRainbow: 0,
  suitStreak: 0, suitStreakSuit: null, bestSuitStreak: 0,
  overThreshold: 0, lowWins: 0,
  bestCycleWins: 0, bestForms: 0, bestPure: 0, bestLong: 0, bestCovered: 0, bestWoven: 0,
});

/* Called for every resolved trick of a contract run. `trick` is the engine's lastTrick shape:
   { pCard, pValue, result }. `threshold` is the active Brecher rung, if one is running. */
export function tallyTrick(tally, trick, { trickNo = 0, threshold = null } = {}) {
  const t = { ...(tally || emptyTally()) };
  const won = trick && (trick.result === "win" || trick.result === "win_tie");
  const card = trick && trick.pCard;

  /* Sperrfeuer — the fixed five-blocks 1-5, 6-10 … 36-40 of the placement, eight per cycle. A
     segment counts only when all five of its tricks were won; a single loss kills it. */
  const seg = Math.floor(Math.max(0, trickNo - 1) / SEGMENT_SIZE);
  if (seg !== t.segIndex) { t.segIndex = seg; t.segWins = 0; }
  if (won) {
    t.segWins += 1;
    if (t.segWins === SEGMENT_SIZE) {
      t.segments += 1;
      if (t.segments > t.bestSegments) t.bestSegments = t.segments;
    }
  } else {
    t.segWins = 0;
  }

  if (won && card) {
    /* Buntspiel counts the BASE suit: a green card still counts as the colour it started as, and a
       colour alliance groups nothing. Over the effective colour the task would be impossible for
       Pflanze — by D16 at least one suit has no uncoloured card left. */
    const base = card.suit;
    t.suitWins = { ...t.suitWins, [base]: (t.suitWins[base] || 0) + 1 };

    /* Farbtreue uses the colour STREAK and therefore the effective colour, alliance and green
       included — there the mechanic is the subject. */
    const eff = card.green ? "G" : card.suit;
    if (eff === t.suitStreakSuit) t.suitStreak += 1;
    else { t.suitStreakSuit = eff; t.suitStreak = 1; }
    if (t.suitStreak > t.bestSuitStreak) t.bestSuitStreak = t.suitStreak;

    if (threshold != null && (trick.pValue || 0) > threshold) t.overThreshold += 1;
    if ((card.value || 0) <= 4) t.lowWins += 1;
  } else {
    t.suitStreak = 0;
    t.suitStreakSuit = null;
  }
  return t;
}

/* Called at each cycle boundary: freeze the peaks of the cycle that just ended and reset what is
   measured per cycle. A "Spitze" counter keeps the best window value, not the current one. */
export function tallyCycleEnd(tally, state) {
  const t = { ...(tally || emptyTally()) };
  const forms = state.formations || [];
  const keep = (key, value) => { if (value > (t[key] || 0)) t[key] = value; };
  keep("bestCycleWins", state.cycleWins || 0);
  keep("bestSegments", t.segments || 0);
  keep("bestRainbow", minSuitWins(t.suitWins));
  keep("bestForms", countBuiltFormations(forms));
  keep("bestLong", longestFormation(forms));
  keep("bestCovered", positionsWith(forms, 1));
  keep("bestWoven", positionsWith(forms, 3));
  t.segments = 0; t.segWins = 0; t.segIndex = 0;
  t.suitWins = {};
  return t;
}

/* Reinheit is the one peak that depends on the running contract's variant, so it is frozen with the
   contract in hand rather than blindly for all four types. */
export function tallyPure(tally, state, variantId) {
  if (!variantId) return tally;
  const v = formationsOfType(state.formations || [], variantId);
  return v > ((tally || {}).bestPure || 0) ? { ...tally, bestPure: v } : tally;
}

/* ------------------------------------------------------------------------------------------------
   Applying a piece of loot
   ------------------------------------------------------------------------------------------------
   Returns a PATCH for the reducer to merge. Effects that cannot be expressed as a one-shot number
   (a third door for the next three skill phases, a price scale) land in `state.contractBoons`, which
   the engine reads where the corresponding knob is used. */

export function applyLoot(state, piece) {
  if (!piece || !piece.effect) return null;
  const e = piece.effect;
  const patch = {};
  const boons = { ...(state.contractBoons || {}) };

  if (e.coins) patch.coins = (state.coins || 0) + e.coins;
  if (e.income) boons.income = { per: e.income, until: e.cycles ? (state.cycle || 0) + e.cycles : null };
  if (e.forfeitMult) boons.forfeitMult = Math.max(boons.forfeitMult || 1, e.forfeitMult);
  if (e.energy) boons.energy = { plus: e.energy, until: e.cycles ? (state.cycle || 0) + e.cycles : null };
  if (e.unspentMult) boons.unspentMult = e.unspentMult;
  if (e.cover) patch.architect = { ...state.architect, maxCover: (state.architect?.maxCover || 0) + e.cover };
  if (e.coverUncapped) patch.architect = { ...(patch.architect || state.architect), maxCover: Infinity };
  if (e.upgradeBuildings) boons.upgradeBuildings = e.upgradeBuildings;
  if (e.skillUp) boons.skillUp = { count: e.skillUp, steps: e.steps || 1 };
  if (e.skillToEpic) boons.skillToEpic = { count: e.skillToEpic, rest: e.skillUpRest || 0 };
  if (e.thirdDoor) boons.thirdDoor = e.thirdDoor === "run" ? "run" : (state.cycle || 0) + e.thirdDoor * 4;
  if (e.highTierChance) boons.highTierChance = true;
  if (e.offerLift) boons.offerLift = { steps: 1, until: (state.cycle || 0) + (e.phases || 1) * 4 };
  if (e.offerLiftBelow) boons.offerLiftBelow = e.offerLiftBelow;
  if (e.perksOffered) boons.perksOffered = Math.max(boons.perksOffered || 0, e.perksOffered);
  if (e.perkFloor) boons.perkFloor = Math.max(boons.perkFloor || 0, e.perkFloor);
  if (e.legendaryChance) boons.legendaryChance = true;
  if (e.legendaryPerkPick) boons.legendaryPerkPick = e.legendaryPerkPick;
  if (e.freeRerolls) {
    patch.rerollsSkill = (state.rerollsSkill || 0) + e.freeRerolls;
  }
  if (e.freeRerollPerPhase) boons.freeRerollPerPhase = e.freeRerollPerPhase;
  if (e.legendaryRerollNormalPrice) boons.legendaryRerollNormalPrice = true;
  if (e.rerollScale != null) boons.rerollScale = Math.min(boons.rerollScale ?? 1, e.rerollScale);
  if (e.coinsPerPhase) boons.coinsPerPhase = e.coinsPerPhase;

  patch.contractBoons = boons;
  return patch;
}

/* Reroll price under Nachlass: rounded DOWN, never below one coin, and free only at scale 0. */
export function contractRerollPrice(base, boons) {
  const scale = (boons || {}).rerollScale;
  if (scale == null) return base;
  if (scale === 0) return 0;
  return Math.max(1, Math.floor(base * scale));
}

/* Which window a cycle belongs to, or null between and after them. `cycle` is 1-based. */
export const windowFor = (cycle) => WINDOWS.find((w) => cycle >= w.from && cycle <= w.to) || null;

/* The cycle at which a window's offers go up: the first of the window. */
export const isWindowStart = (cycle) => WINDOWS.some((w) => w.from === cycle);
export const isWindowEnd = (cycle) => WINDOWS.some((w) => w.to === cycle);

/* Remaining cycles of the running contract — "noch 6 Durchläufe". Six cycles are six tries, and
   without the number nobody can tell whether rebuilding still pays. */
export function cyclesLeft(cycle, contract) {
  if (!contract) return 0;
  const w = WINDOWS.find((x) => x.id === contract.windowId);
  return w ? Math.max(0, w.to - cycle) : 0;
}
