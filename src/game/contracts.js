/* Contracts — "Zwischenaufgaben", the mid-run task system (docs/zwischenaufgaben.md).

   OPT-IN PER RUN. Everything here is inert unless the run carries `contractsEnabled`, which only the
   "Aufträge" button on the start screen sets. A run started any other way never touches this module,
   so the normal run stays exactly what it is today — that separation is the whole point of the flag
   and must survive any change in here.

   The module is React-free and side-effect-free: it rolls offers, measures progress against the state
   the engine already keeps, and returns the patch a piece of loot applies. The reducer owns the state. */

import * as C from "./constants.js";
import { FORMATION_TYPES, SEGMENT_SIZE } from "./formations.js";
import { TIER_META } from "./rarity.js";
import { ROWS as ARCH_ROWS, COLS as ARCH_COLS, posOf as archPos, familyDef, MAX_TIER as ARCH_MAX_TIER,
         CATEGORIES as ARCH_CATEGORIES } from "./architect.js";
import { MAX_SKILL_TIER, rerollOffer, rerollPrice } from "./coins.js";
import { isLegendarySkill } from "./skills.js";

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

/* Three steps, not four (Owner, 2026-09-16). With three offers per window that means every offer
   set now shows exactly one of each — the choice spans the full range instead of sampling it. */
export const STEPS = ["leicht", "mittel", "schwer"];

/* Rarity runs 1..4 through TIER_META (Normal · Selten · Sehr selten · Episch); 5 is legendary, which
   has no tier of its own — it is a single piece, like the legendary perks. */
export const TIER_LEGENDARY = 5;
export const tierLabel = (tier) => (tier >= TIER_LEGENDARY ? "Legendär" : (TIER_META[tier] || {}).label || "");

/* Each step pays from a band of two neighbouring rarities, weighted toward the lower one. Legendary
   rides on the UPPER half of the hard band only, with the same 70/30 split one level deeper
   (Owner, 2026-09-16): 70 % Sehr selten, 21 % Episch, 9 % Legendär per drawn piece. */
export const STEP_TIER = { leicht: 1, mittel: 2, schwer: 3 };
export const STEP_BAND = { leicht: [1, 2], mittel: [2, 3], schwer: [3, 4] };
export const LOWER_SHARE = 0.7;
export const LEGENDARY_SHARE = 0.3;
export const LEGENDARY_STEP = "schwer";

export const OFFERS_PER_WINDOW = 3;   // three tasks to choose from, always three different steps
export const LOOT_PER_REWARD = 3;     // three pieces to choose from once the task is done

/* ------------------------------------------------------------------------------------------------
   The fourteen tasks
   ------------------------------------------------------------------------------------------------
   kind — how the counter is read:
     "spitze"  best single occurrence in the window (best cycle, or best placement)
     "summe"   running total over the whole window
     "zustand" read at the window's end, the whole run counts

   `variants` rolls a parameter instead of listing near-identical tasks (the same trick WEEK_MODS
   uses): Reinheit rolls the formation type, Quartier the building category. A variant may carry its
   own rungs — Reinheit's four types are differently easy and each carries its own.

   `extra` is the hard step's SECOND condition (Owner, 2026-09-16). Both must hold in the same cycle;
   `positions` asks for a board shape, `noSuitStreak` forbids one. `steps` narrows which steps a task
   offers at all — Langbau has no easy step, because five cards is the segment wall and everything
   below it is free.

   `measure` swaps the counter for one step: Durchmarsch's hard step is no longer the best cycle but
   a RUN of perfect ones, which nothing else in the catalogue measures. */
export const TASKS = [
  { id: "durchmarsch",  kind: "spitze",  rungs: [25, 35, 5],
    measure: { schwer: "perfectRun" } },
  { id: "sperrfeuer",   kind: "spitze",  rungs: [3, 6, 8],
    extra: { schwer: { positions: 40, min: 2 } } },
  /* Gedränge zählt seit 2026-09-22 (Owner) Formationen JE POSITION, summiert über das Brett — die
     Paare aus Position × Formation, nicht mehr die distinkten Formationen. Offene Segmentgrenzen
     verschmelzen Läufe und drückten die distinkte Zahl; das Paar-Maß ist davon unabhängig. */
  { id: "gedraenge",    kind: "spitze",  rungs: [40, 50, 70],
    extra: { schwer: { positions: 40, min: 2 } } },
  /* Reinheit zählt KARTEN in einer Formation des gewürfelten Typs, nicht die Formationen selbst
     (Owner, 2026-09-15). Distinkte Läufe eines Typs reichen gemessen von 2 bis 8 — neun mögliche
     Werte für vier Stufen, jede Stufe ein Sprung. Karten reichen von 6 bis 40 und lassen sich
     überhaupt erst feinjustieren. Die Leitern sind Owner-Werte. */
  { id: "reinheit",     kind: "spitze",  variantKey: "formation",
    variants: [
      { id: "farbblock",    rungs: [20, 30, 40], extra: { schwer: { positions: 40, min: 2 } } },
      { id: "wiederholung", rungs: [20, 30, 34] },
      { id: "treppe",       rungs: [20, 26, 32] },
      { id: "wechsel",      rungs: [20, 26, 32] },
    ] },
  { id: "langbau",      kind: "spitze",  rungs: [null, 10, 15], steps: ["mittel", "schwer"] },
  { id: "vollbrett",    kind: "spitze",  rungs: [30, 40, 40],
    extra: { schwer: { positions: 20, min: 3 } } },
  { id: "verflechtung", kind: "spitze",  rungs: [5, 10, 20],
    extra: { schwer: { positions: 5, min: 4 } } },
  /* Farbtreue misst seit 2026-09-16 nicht mehr die LÄNGE der Serie, sondern wie viele FARBEN im
     Fenster eine Serie von `streak` geschafft haben. Die Leiter ist damit die Zahl der Farben. */
  { id: "farbtreue",    kind: "spitze",  rungs: [1, 2, 3], streak: 10,
    extra: { schwer: { positions: 40, min: 2 } } },
  { id: "buntspiel",    kind: "spitze",  rungs: [5, 7, 8],
    extra: { schwer: { noSuitStreak: 3 } } },
  /* Brecher is the one task whose ladder runs over the THRESHOLD, not the amount: ten tricks stay
     ten, the combat value they must beat is what rises. `threshold: true` tells the display to read
     the rung as "über X" and the target as TEN. */
  { id: "brecher",      kind: "summe",   rungs: [10, 15, 20], threshold: true, need: 10 },
  { id: "fussvolk",     kind: "summe",   rungs: [50, 100, 150] },
  /* Aufmarsch hieß „Kampfwert" und maß Kartenwert — Brand auf dem Gegnerdeck, Glühende Klinge und
     Gebäude-Stichwert fielen unter den Tisch (Owner-Befund im Playtest, 2026-09-16). Ein Deck HAT
     keinen Kampfwert, nur eine gespielte Karte hat einen. Gemessen wird deshalb der beste Durchlauf:
     die Summe (pValue − oValue) über seine vierzig Stiche. Damit zählt jede Quelle mit. */
  { id: "aufmarsch",    kind: "spitze",  rungs: [60, 120, 250] },
  /* Quartier würfelt die Kategorie NICHT mehr (Owner, 2026-09-16). Verlangt ist nur, dass die Reihen
     dieselbe Kategorie tragen — welche, entscheidet der Spieler mit dem, was er baut. Gemessen wird
     deshalb die beste der drei. Vorher gab der Wurf sie vor, und zwei der drei Kategorien erreichten
     gemessen nie mehr als eine volle Reihe. */
  { id: "quartier",     kind: "zustand", rungs: [1, 3, 5] },
  { id: "saeckel",      kind: "zustand", rungs: [60, 80, 120] },
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

/* Which steps a task offers at all. Most offer all three; Langbau has no easy one. */
export const stepsOf = (taskId) => {
  const task = TASK_BY_ID[taskId];
  return (task && task.steps) || STEPS;
};
export const offersStep = (taskId, step) => stepsOf(taskId).includes(step);

/* The hard step's second condition, if the task or its variant carries one. */
export function extraFor(taskId, step, variantId = null) {
  const task = TASK_BY_ID[taskId];
  if (!task) return null;
  const variant = variantId && (task.variants || []).find((v) => v.id === variantId);
  const src = (variant && variant.extra) || task.extra;
  return (src && src[step]) || null;
}

/* Which counter this step reads. Only Durchmarsch swaps one, and only on its hard step. */
export const measureFor = (taskId, step) =>
  ((TASK_BY_ID[taskId] || {}).measure || {})[step] || taskId;

/* What the counter must reach. For Brecher that is ten tricks, not the rung. */
export const targetFor = (taskId, step, variantId = null) => {
  const task = TASK_BY_ID[taskId];
  if (!task) return null;
  return task.need != null ? task.need : rungFor(taskId, step, variantId);
};

/* ------------------------------------------------------------------------------------------------
   The loot catalogue — 14 families of four, plus five legendary singles
   ------------------------------------------------------------------------------------------------
   `effect` is read by applyLoot below. Categories exist so one reward never offers the same kind of
   help twice; the draw is per FAMILY, so all fourteen are equally likely. */
export const LOOT_CATEGORIES = ["muenze", "aufstellung", "baufeld", "skills", "perks", "neuwurf"];

export const LOOT_FAMILIES = [
  { id: "zehrgeld",    category: "muenze",      effects: [{ coins: 15 }, { coins: 25 }, { coins: 50 }, { coins: 100 }] },
  { id: "muenzrecht",  category: "muenze",      effects: [{ income: 1, cycles: 15 }, { income: 1 }, { income: 2 }, { income: 4 }] },
  { id: "ablass",      category: "muenze",      effects: [{ forfeitMult: 1.5 }, { forfeitMult: 2 }, { forfeitMult: 2.5 }, { forfeitMult: 3 }] },
  { id: "freizug",     category: "aufstellung", effects: [{ energy: 1, cycles: 5 }, { energy: 1 }, { energy: 2 }, { energy: 2, unspentMult: 2 }] },
  /* Durchlass öffnet Segmentgrenzen. Stufe I würfelt eine, ab II wählt der Spieler — und die Wahl
     zeigt, welche Grenzen schon offen sind, egal woher (E_SEGMENT, Spalier, Pfeiler, früherer
     Durchlass). Ohne das kauft man eine Tür, die längst offen steht. */
  { id: "durchlass",   category: "aufstellung", effects: [{ openBorders: 1, random: true }, { openBorders: 1 }, { openBorders: 2 }, { openBorders: 4 }] },
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
  /* Wie Stadtrecht dem Baufeld: hebt eine REGEL auf, statt eine Zahl zu heben (§5). Der historische
     Begriff für das Niederlegen einer Befestigung — die Grenzen fallen, nicht eine Zahl steigt. */
  { id: "schleifung", effect: { openBorders: "all" } },
];

/* Sieben innere Grenzen bei acht Segmenten zu fünf Positionen. Die letzte Position hat keine Grenze
   hinter sich, deshalb eins weniger als Segmente. */
export const BORDER_COUNT = Math.max(0, Math.ceil(C.BOARD_POSITIONS / SEGMENT_SIZE) - 1);
export const ALL_BORDERS = Array.from({ length: BORDER_COUNT }, (_, i) => i);

/* Die vom Auftrag geöffneten Grenzen — die Menge, die formations.js als vierte Quelle liest. */
export const openBordersOf = (state) => {
  const b = boonsOf(state);
  if (!b || !b.openBorders) return null;
  return b.openBorders === "all" ? new Set(ALL_BORDERS) : new Set(b.openBorders);
};

/* Grenzen, die der Spieler NICHT mehr wählen muss, weil sie ohnehin offen sind. Die Auswahl zeigt sie
   an, statt sie zu verstecken — sonst gibt jemand eine Wahl für eine offene Tür aus. */
export function borderPickState(state, alreadyOpen = null) {
  const open = alreadyOpen instanceof Set ? alreadyOpen : new Set(alreadyOpen || []);
  const fromLoot = openBordersOf(state) || new Set();
  for (const g of fromLoot) open.add(g);
  return ALL_BORDERS.map((g) => ({ g, open: open.has(g) }));
}

/* Die getroffene Wahl in den Segen schreiben. Schon offene Grenzen werden abgewiesen — der Klick darf
   nicht ins Leere gehen. */
export function applyBorderPick(state, borders, alreadyOpen = null) {
  const open = alreadyOpen instanceof Set ? alreadyOpen : new Set(alreadyOpen || []);
  const chosen = [...new Set(borders || [])].filter((g) => ALL_BORDERS.includes(g) && !open.has(g));
  if (!chosen.length) return null;
  const b = { ...(state.contractBoons || {}) };
  if (b.openBorders === "all") return null;                 // Schleifung hat alles offen, nichts zu wählen
  b.openBorders = [...new Set([...(b.openBorders || []), ...chosen])];
  return { contractBoons: b };
}

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
   between safety and rarity. With three steps and three offers that now means exactly one of each.
   `used` keeps window 2 from repeating window 1's task.

   The step is drawn FIRST and the task second, out of those that offer that step: since Langbau has
   no easy step, picking the task first would sometimes leave a step with nobody to fill it. */
export function rollOffers(rng = Math.random, used = [], count = OFFERS_PER_WINDOW) {
  const steps = shuffled(STEPS, rng).slice(0, count);
  const taken = new Set();
  const out = [];
  for (const step of steps) {
    const eligible = (pool) => pool.filter((t) => !taken.has(t.id) && offersStep(t.id, step));
    let free = eligible(TASKS.filter((t) => !used.includes(t.id)));
    if (!free.length) free = eligible(TASKS);          // Notausgang: lieber wiederholen als leer lassen
    if (!free.length) continue;
    const task = pick(free, rng);
    taken.add(task.id);
    const variantId = task.variants ? pick(task.variants, rng).id : null;
    out.push({ taskId: task.id, step, variantId,
      rung: rungFor(task.id, step, variantId), target: targetFor(task.id, step, variantId),
      extra: extraFor(task.id, step, variantId) });
  }
  return out;
}


/* Die drei Stufen EINER Auslage (Owner, 2026-09-17).

   MINDESTENS EINE trägt die obere Rarität des Bandes. Vorher würfelte jedes Stück für sich 70/30,
   und in rund einem Drittel der Fälle kam dreimal die untere heraus — eine mittlere Aufgabe zahlte
   dann dreimal Selten, obwohl ihr Band Selten ODER Sehr selten verspricht. Das Band war damit eine
   Aussage über die Ziehung, nicht über die Auslage.

   LEGENDÄR bleibt die Ausnahme und ERSETZT einen der unteren Plätze, nie den garantierten oberen.
   Es gibt also weiterhin höchstens eins, und es kostet die Episch-Garantie nicht. */
export function rollTiers(step, rng = Math.random, count = LOOT_PER_REWARD) {
  const band = STEP_BAND[step] || STEP_BAND.leicht;
  const tiers = [band[1]];                                   // Platz 1: die Garantie
  for (let i = 1; i < count; i++) tiers.push(rng() < LOWER_SHARE ? band[0] : band[1]);
  if (step === LEGENDARY_STEP && rng() < LEGENDARY_SHARE) {
    const i = tiers.findIndex((t, k) => k > 0 && t === band[0]);
    if (i >= 0) tiers[i] = TIER_LEGENDARY;                   // nur ein UNTERER Platz weicht
  }
  return shuffled(tiers, rng);                               // die Garantie soll nicht immer oben stehen
}

/* Three pieces, no category twice. A legendary tier draws from the four singles; every other tier
   draws a family and takes that family's piece AT that tier. Findet eine Stufe keine freie Familie
   mehr, rutscht sie auf die andere des Bandes — lieber eine Rarität daneben als ein leerer Platz. */
export function rollLoot(rng = Math.random, step = "leicht", count = LOOT_PER_REWARD) {
  const band = STEP_BAND[step] || STEP_BAND.leicht;
  const out = [];
  const usedCategories = new Set();
  const usedIds = new Set();
  for (const wunsch of rollTiers(step, rng, count)) {
    if (wunsch >= TIER_LEGENDARY) {
      const free = LEGENDARIES.filter((l) => !usedIds.has(l.id));
      if (free.length) {
        const leg = pick(free, rng);
        usedIds.add(leg.id);
        out.push({ kind: "legendary", id: leg.id, tier: TIER_LEGENDARY, effect: leg.effect });
        continue;
      }
    }
    const frei = (tier) => LOOT_FAMILIES.filter((f) => !usedCategories.has(f.category) && !usedIds.has(`${f.id}@${tier}`));
    let tier = wunsch >= TIER_LEGENDARY ? band[1] : wunsch;
    let free = frei(tier);
    if (!free.length) { tier = tier === band[0] ? band[1] : band[0]; free = frei(tier); }
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

/* Reinheits Maß: wie viele der vierzig Positionen in MINDESTENS EINER Formation des Typs liegen.
   Eine Position, die in drei Farbblöcken steckt, zählt einmal — sonst wäre es wieder ein Läufe-Maß
   mit anderem Namen. */
export function cardsInType(perPosition, type) {
  let n = 0;
  for (const p of perPosition || []) {
    for (const f of p.formations || []) {
      if (f.type === type && FORMATION_TYPES.includes(f.type)) { n += 1; break; }
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

/* Formationen je Position, summiert über das Brett: eine Position in drei Formationen zählt drei.
   Das ist die Summe der Formationslängen, und sie ändert sich nicht, wenn eine offene Segmentgrenze
   zwei Läufe zu einem verschmilzt. */
export function formationPairs(perPosition) {
  let n = 0;
  for (const p of perPosition || []) {
    for (const f of p.formations || []) if (FORMATION_TYPES.includes(f.type)) n += 1;
  }
  return n;
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

/* Quartier zählt seit 2026-09-16 (Owner) jede volle REIHE des Baufelds, nicht nur die Zeilen:
   waagerecht (8 × 5 Zellen), senkrecht (5 × 8) und diagonal (8 × 5). Einundzwanzig Reihen, alle
   gleich viel wert — eine volle Spalte ist teurer als eine Zeile, zählt aber gleich (Owner). */
export const BUILD_LINES = (() => {
  const lines = [];
  for (let r = 0; r < ARCH_ROWS; r++) {                    // waagerecht
    lines.push(Array.from({ length: ARCH_COLS }, (_, c) => archPos(r, c)));
  }
  for (let c = 0; c < ARCH_COLS; c++) {                    // senkrecht
    lines.push(Array.from({ length: ARCH_ROWS }, (_, r) => archPos(r, c)));
  }
  for (let r = 0; r + ARCH_COLS <= ARCH_ROWS; r++) {       // diagonal, beide Richtungen
    lines.push(Array.from({ length: ARCH_COLS }, (_, i) => archPos(r + i, i)));
    lines.push(Array.from({ length: ARCH_COLS }, (_, i) => archPos(r + i, ARCH_COLS - 1 - i)));
  }
  return lines;
})();

/* Volle Reihen einer Kategorie. Eine Reihe zählt nur, wenn JEDE ihrer Zellen von einem Gebäude
   dieser Kategorie bedeckt ist — ein Gebäude belegt seinen ganzen `footprint`, nicht eine Zelle. */
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
  for (const line of BUILD_LINES) if (line.every((p) => cells.has(p))) n += 1;
  return n;
}

/* Die beste der drei Kategorien. Quartier verlangt nur, dass die Reihen DIESELBE Kategorie tragen —
   welche, sucht sich der Spieler mit seinem Bau aus (Owner, 2026-09-16). */
const bestCategory = (state) => Math.max(...ARCH_CATEGORIES.map((c) => fullSegments(state, c)));

/* ZWEI Zahlen, nicht eine. Ein Spitzen-Zähler erfüllt sich über den BESTEN Wert des Fensters, aber
   steuern kann der Spieler nur den LAUFENDEN — und bei Sperrfeuer, Durchmarsch und Buntspiel fällt
   der laufende an jeder Durchlaufgrenze auf null zurück. Zeigt die Leiste nur das Maximum, steht dort
   dauerhaft dieselbe Zahl und niemand sieht, dass gerade wieder gezählt wird (Owner, 2026-09-15).

   `readLive` ist der Stand JETZT, `readBest` der Spitzenwert des Fensters. Erfüllt wird über readBest. */
export function readLive(state, contract) {
  if (!contract) return 0;
  const tally = state.contractTally || {};
  const forms = state.formations || [];
  switch (measureFor(contract.taskId, contract.step)) {
    case "durchmarsch":  return state.cycleWins || 0;
    case "perfectRun":   return tally.perfectRun || 0;
    case "sperrfeuer":   return tally.segments || 0;
    case "gedraenge":    return formationPairs(forms);
    case "reinheit":     return cardsInType(forms, contract.variantId);
    case "langbau":      return longestFormation(forms);
    case "vollbrett":    return positionsWith(forms, 1);
    case "verflechtung": return positionsWith(forms, 3);
    case "farbtreue":    return suitsAtStreak(tally, streakOf(contract));
    case "buntspiel":    return minSuitWins(tally.suitWins);
    case "brecher":      return tally.overThreshold || 0;
    case "fussvolk":     return tally.lowWins || 0;
    case "aufmarsch":    return tally.cycleMargin || 0;
    case "quartier":     return bestCategory(state);
    case "saeckel":      return state.coins || 0;
    default:             return 0;
  }
}

/* Die geforderte Serienlänge von Farbtreue — die Leiter zählt dort FARBEN, nicht Stiche. */
export const streakOf = (contract) => (TASK_BY_ID[(contract || {}).taskId] || {}).streak || 0;

/* Wie viele Farben im Fenster schon eine Serie von `n` geschafft haben. */
export function suitsAtStreak(tally, n) {
  if (!n) return 0;
  const by = (tally || {}).bestStreakBySuit || {};
  let c = 0;
  for (const k of Object.keys(by)) if (by[k] >= n) c += 1;
  return c;
}

/* Die Zusatzbedingung der schweren Stufe. `positions` verlangt eine Brettform, `noSuitStreak`
   verbietet eine Farbserie — die einzige Bedingung des Katalogs, die etwas AUSSCHLIESST. */
export function extraHolds(state, contract, cycleMaxStreak = null) {
  const e = contract && contract.extra;
  if (!e) return true;
  if (e.positions) return positionsWith(state.formations || [], e.min || 1) >= e.positions;
  if (e.noSuitStreak != null) {
    const run = cycleMaxStreak != null ? cycleMaxStreak : (state.contractTally || {}).cycleMaxStreak || 0;
    return run <= e.noSuitStreak;
  }
  return true;
}

/* Der Spitzenwert des Fensters. Für Summe und Zustand gibt es keinen Unterschied zum laufenden Wert —
   sie laufen ohnehin nicht zurück. */
export function readBest(state, contract) {
  if (!contract) return 0;
  const tally = state.contractTally || {};
  const live = readLive(state, contract);
  /* Trägt die Stufe eine Zusatzbedingung, zählt nur ein Durchlauf, in dem BEIDE standen. Der
     laufende darf mitzählen, solange die Bedingung gerade hält — sonst sähe der Spieler seinen
     Erfolg erst eine Durchlaufgrenze später. */
  if (contract.extra) {
    const gated = tally.bestGated || 0;
    return extraHolds(state, contract) ? Math.max(gated, live) : gated;
  }
  switch (measureFor(contract.taskId, contract.step)) {
    case "durchmarsch":  return Math.max(tally.bestCycleWins || 0, live);
    case "perfectRun":   return Math.max(tally.bestPerfectRun || 0, live);
    case "sperrfeuer":   return Math.max(tally.bestSegments || 0, live);
    case "gedraenge":    return Math.max(tally.bestForms || 0, live);
    case "reinheit":     return Math.max(tally.bestPure || 0, live);
    case "langbau":      return Math.max(tally.bestLong || 0, live);
    case "vollbrett":    return Math.max(tally.bestCovered || 0, live);
    case "verflechtung": return Math.max(tally.bestWoven || 0, live);
    case "farbtreue":    return live;                        // wächst ohnehin nur
    case "buntspiel":    return Math.max(tally.bestRainbow || 0, live);
    case "aufmarsch":    return Math.max(tally.bestMargin || 0, live);
    default:             return live;
  }
}

/* Zeigt die Anzeige zwei Zahlen? Nur dort, wo der laufende Wert an einer Durchlaufgrenze zurückfällt
   oder hinter dem Spitzenwert zurückbleiben kann. */
export const hasPeak = (contract) =>
  !!contract && (TASK_BY_ID[contract.taskId] || {}).kind === "spitze";

export const readValue = readBest;   // Bestand: der erfüllende Wert

export const minSuitWins = (suitWins) => {
  const w = suitWins || {};
  return Math.min(...C.SUIT_ORDER.map((s) => w[s] || 0));
};

export const isFulfilled = (state, contract) =>
  !!contract && readBest(state, contract) >= (contract.target || Infinity);

/* ------------------------------------------------------------------------------------------------
   The per-trick tally
   ------------------------------------------------------------------------------------------------
   Five tasks cannot be read off the state afterwards: they need what happened while the tricks ran.
   One object carries all five, so a contract run costs a single extra bookkeeping step per trick. */

export const emptyTally = () => ({
  segments: 0, bestSegments: 0, segWins: 0, segIndex: 0,
  suitWins: {}, bestRainbow: 0,
  suitStreak: 0, suitStreakSuit: null, bestSuitStreak: 0,
  bestStreakBySuit: {}, cycleMaxStreak: 0,     // Farbtreue zählt Farben · Buntspiel verbietet lange Serien
  overThreshold: 0, lowWins: 0,
  cycleMargin: 0, bestMargin: 0,               // Aufmarsch: echter Kampfwert-Vorsprung je Durchlauf
  perfectRun: 0, bestPerfectRun: 0,            // Durchmarsch schwer: Serie makelloser Durchläufe
  bestCycleWins: 0, bestForms: 0, bestPure: 0, bestLong: 0, bestCovered: 0, bestWoven: 0,
  bestGated: 0,                                // Spitze nur aus Durchläufen, in denen die Zusatzbedingung stand
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
       included — there the mechanic is the subject. Seit 2026-09-16 wird die beste Serie JE FARBE
       behalten: die Leiter zählt, wie viele Farben die geforderte Länge geschafft haben. */
    const eff = card.green ? "G" : card.suit;
    if (eff === t.suitStreakSuit) t.suitStreak += 1;
    else { t.suitStreakSuit = eff; t.suitStreak = 1; }
    if (t.suitStreak > t.bestSuitStreak) t.bestSuitStreak = t.suitStreak;
    if (t.suitStreak > (t.bestStreakBySuit[eff] || 0)) {
      t.bestStreakBySuit = { ...t.bestStreakBySuit, [eff]: t.suitStreak };
    }
    // Buntspiels Verbotsbedingung liest die LÄNGSTE Farbserie dieses Durchlaufs, nicht des Fensters.
    if (t.suitStreak > t.cycleMaxStreak) t.cycleMaxStreak = t.suitStreak;

    if (threshold != null && (trick.pValue || 0) > threshold) t.overThreshold += 1;
    if ((card.value || 0) <= 4) t.lowWins += 1;
  } else {
    t.suitStreak = 0;
    t.suitStreakSuit = null;
  }

  /* Aufmarsch: der WIRKLICHE Kampfwert-Vorsprung dieses Stichs. `oValue` trägt den Brand auf der
     Gegnerkarte schon abgezogen, `pValue` alle Boni des Spielers — genau das, was vorher fehlte. */
  if (trick) t.cycleMargin += (trick.pValue || 0) - (trick.oValue || 0);
  return t;
}

/* Called at each cycle boundary: freeze the peaks of the cycle that just ended and reset what is
   measured per cycle. A "Spitze" counter keeps the best window value, not the current one. */
export function tallyCycleEnd(tally, state, contract = null) {
  const t = { ...(tally || emptyTally()) };
  const forms = state.formations || [];
  const keep = (key, value) => { if (value > (t[key] || 0)) t[key] = value; };
  keep("bestCycleWins", state.cycleWins || 0);
  keep("bestSegments", t.segments || 0);
  keep("bestRainbow", minSuitWins(t.suitWins));
  keep("bestForms", formationPairs(forms));
  keep("bestLong", longestFormation(forms));
  keep("bestCovered", positionsWith(forms, 1));
  keep("bestWoven", positionsWith(forms, 3));
  keep("bestMargin", t.cycleMargin || 0);
  /* Durchmarsch schwer: eine Serie makelloser Durchläufe. Ein einziger verlorener Stich setzt sie
     zurück — deshalb wird hier gezählt und nicht das Maximum gehalten. */
  t.perfectRun = (state.cycleWins || 0) >= C.BOARD_POSITIONS ? (t.perfectRun || 0) + 1 : 0;
  keep("bestPerfectRun", t.perfectRun);
  /* Die gesperrte Spitze: nur ein Durchlauf, in dem die Zusatzbedingung stand, darf zählen. Sie
     wird HIER geprüft, mit der Aufstellung und den Serien des gerade beendeten Durchlaufs. */
  if (contract && contract.extra && extraHolds(state, contract, t.cycleMaxStreak || 0)) {
    keep("bestGated", readLive({ ...state, contractTally: t }, contract));
  }
  t.segments = 0; t.segWins = 0; t.segIndex = 0;
  t.suitWins = {};
  t.cycleMargin = 0;
  t.cycleMaxStreak = 0;
  return t;
}

/* Reinheit is the one peak that depends on the running contract's variant, so it is frozen with the
   contract in hand rather than blindly for all four types. */
export function tallyPure(tally, state, variantId) {
  if (!variantId) return tally;
  const v = cardsInType(state.formations || [], variantId);
  return v > ((tally || {}).bestPure || 0) ? { ...tally, bestPure: v } : tally;
}

/* ------------------------------------------------------------------------------------------------
   Applying a piece of loot
   ------------------------------------------------------------------------------------------------
   Returns a PATCH for the reducer to merge. Effects that cannot be expressed as a one-shot number
   (a third door for the next three skill phases, a price scale) land in `state.contractBoons`, which
   the engine reads where the corresponding knob is used. */

/* Sofortwirkungen — sie schreiben in den State statt in die Segen-Ablage, weil sie EINMAL greifen.

   Lehrbrief hebt die am weitesten ausgebauten Skills zuerst: die Stufe ist superlinear bezahlt
   (12 · 25 · 40), also ist der obere Schritt der wertvollere. Aus demselben Grund hebt Aufstockung
   die höchsten ausbaufähigen Gebäude — TIER_FACTOR steigt mit 1 · 1,5 · 2,2 · 3,1. */
/* Legendäre Skills tragen KEINE Stufe (UPGRADE_SKILL weist sie aus demselben Grund ab). Sie stehen in
   `state.skills` wie jeder andere, also muss jede Hebung sie ausdrücklich überspringen — sonst hebt
   Lehrbrief ein Legendäres auf „Episch" und erfindet eine Stufe, die es nicht gibt. */
export const upgradableSkills = (state) =>
  (state.skills || []).filter((id) => !isLegendarySkill(id));

function raiseSkills(state, count, steps) {
  const tiers = { ...(state.skillTiers || {}) };
  const open = upgradableSkills(state)
    .filter((id) => (tiers[id] ?? 0) < MAX_SKILL_TIER)
    .sort((a, b) => (tiers[b] ?? 0) - (tiers[a] ?? 0));
  for (const id of open.slice(0, count)) tiers[id] = Math.min(MAX_SKILL_TIER, (tiers[id] ?? 0) + steps);
  return tiers;
}

/* Vollendung: „ein gehaltener Skill DEINER WAHL wird episch, alle anderen steigen um eine Stufe."
   Die Wahl ist ein eigener Schritt, kein Automatismus — deshalb rechnet applyLoot hier nichts, sondern
   stellt die Auswahl, und diese Funktion führt sie aus, sobald der Spieler gewählt hat. */
export function applySkillPick(state, skillId, rest = 0) {
  const open = upgradableSkills(state);
  if (!open.includes(skillId)) return null;
  const tiers = { ...(state.skillTiers || {}) };
  for (const id of open) {
    tiers[id] = id === skillId ? MAX_SKILL_TIER : Math.min(MAX_SKILL_TIER, (tiers[id] ?? 0) + rest);
  }
  return { skillTiers: tiers };
}

function raiseBuildings(state, count) {
  const arch = state.architect;
  if (!arch || !Array.isArray(arch.buildings)) return null;
  const open = arch.buildings
    .map((b, i) => ({ i, tier: b.tier }))
    .filter((x) => Number.isInteger(x.tier) && x.tier < ARCH_MAX_TIER)   // Legendäre tragen keine Stufe
    .sort((a, b) => b.tier - a.tier);
  const lift = new Set((count === "all" ? open : open.slice(0, count)).map((x) => x.i));
  if (!lift.size) return null;
  return { ...arch, buildings: arch.buildings.map((b, i) => (lift.has(i) ? { ...b, tier: b.tier + 1 } : b)) };
}

export function applyLoot(state, piece, rng = Math.random) {
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
  if (e.upgradeBuildings) {
    const arch = raiseBuildings(state, e.upgradeBuildings);
    if (arch) patch.architect = { ...(patch.architect || {}), ...arch };
  }
  if (e.skillUp) patch.skillTiers = raiseSkills(state, e.skillUp, e.steps || 1);
  /* Vollendung stellt eine AUSWAHL statt sie zu treffen. Hält der Lauf keinen stufbaren Skill, gibt es
     nichts zu wählen — dann entfällt der Schritt ersatzlos, statt ein leeres Fenster zu öffnen, aus dem
     niemand herauskommt. */
  if (e.skillToEpic) {
    patch.pendingSkillPick = upgradableSkills(state).length ? { rest: e.skillUpRest || 0 } : null;
  }
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
  /* Durchlass. Stufe I würfelt SOFORT eine noch geschlossene Grenze; ab II stellt sie eine Auswahl,
     genau wie Vollendung. Schleifung öffnet alle und braucht deshalb keine Wahl. */
  if (e.openBorders === "all") boons.openBorders = "all";
  else if (e.openBorders) {
    if (e.random) {
      const open = new Set(openBordersOf(state) || []);
      const free = ALL_BORDERS.filter((g) => !open.has(g));
      if (free.length) {
        const g = free[Math.floor(rng() * free.length) % free.length];
        boons.openBorders = [...new Set([...(boons.openBorders || []), g])];
      }
    } else {
      // Schleifung oder ein früherer Durchlass kann schon alles offen haben. Eine Wahl ohne Ziel
      // ließe sich nicht bestätigen und das Overlay nie wieder schließen.
      const open = new Set(openBordersOf(state) || []);
      if (ALL_BORDERS.some((g) => !open.has(g))) patch.pendingBorderPick = { count: e.openBorders };
    }
  }

  patch.contractBoons = boons;
  return patch;
}

/* ------------------------------------------------------------------------------------------------
   Reading the boons — the seams the rest of the engine calls
   ------------------------------------------------------------------------------------------------
   Every accessor takes the value the game would use WITHOUT contracts and returns the value to use.
   The first line of each is the same null check, so a normal run pays one property read and gets its
   own number back untouched. That shape is deliberate: it keeps the opt-in promise checkable at the
   call site instead of spread through the engine. */

export const boonsOf = (state) => (state && state.contractsEnabled && state.contractBoons) || null;

/* A boon with `until` expires at that cycle; one without runs to the end of the run. */
const live = (b, cycle) => !!b && (b.until == null || cycle <= b.until);

/* Münzrecht — extra coins on top of the cycle payout. */
export function coinsPerCycleWith(state, base, cycle = state.cycle || 0) {
  const b = boonsOf(state);
  return b && live(b.income, cycle) ? base + (b.income.per || 0) : base;
}

/* Freizug — more formation energy at the start of each placement phase. */
export function formationEnergyWith(state, base, cycle = state.cycle || 0) {
  const b = boonsOf(state);
  return b && live(b.energy, cycle) ? base + (b.energy.plus || 0) : base;
}

/* Freizug IV — unspent energy pays a multiple at the end of the phase. */
export function unspentEnergyWith(state, base) {
  const b = boonsOf(state);
  return b && b.unspentMult ? Math.floor(base * b.unspentMult) : base;
}

/* Ablass — a declined skill or perk pays more. Rounded down, so the family never pays a fraction. */
export function forfeitWith(state, base) {
  const b = boonsOf(state);
  return b && b.forfeitMult ? Math.floor(base * b.forfeitMult) : base;
}

/* Nachlass and Freilos IV. The legendary reroll at normal price is its own knob, so it is applied
   BEFORE the discount — otherwise the two would multiply and a quarter off a normal price would be
   cheaper than the family says. */
export function rerollPriceWith(state, base, legendary = false, normalBase = null) {
  const b = boonsOf(state);
  if (!b) return base;
  const start = legendary && b.legendaryRerollNormalPrice && normalBase != null ? normalBase : base;
  return contractRerollPrice(start, b);
}

/* DAS Neuwurf-Angebot für Knopf UND Reducer — beide müssen durch diese Tür.
   `rerollOffer` aus coins.js nennt sich selbst „die eine Quelle für Knopf und Reducer", war es aber
   nicht: der Reducer legte `rerollPriceWith` darüber, der Knopf nicht. Wer Nachlass hielt, sah den
   vollen Preis und konnte den Wurf nicht auslösen, weil `can` gegen den vollen Preis prüfte — die
   Beute war damit für ALLE Neuwürfe wirkungslos, nicht nur für legendäre (Owner-Befund 2026-09-17).
   coins.js kann contracts.js nicht importieren (Zyklus über MAX_SKILL_TIER), also liegt die Tür hier. */
export function rerollOfferWith(state, freeTokens = 0, legendary = false) {
  const o = rerollOffer(state, freeTokens, legendary);
  const b = boonsOf(state);
  if (!b || o.free || o.capped) return o;      // gratis bleibt gratis, gedeckelt bleibt gedeckelt
  const normal = rerollPrice(state.coinRerolls || 0, false);
  const price = rerollPriceWith(state, o.nextPrice, legendary, normal);
  if (price === o.nextPrice) return o;
  return { ...o, price, nextPrice: price, can: (state.coins || 0) >= price };
}

/* Freilos I-IV — a free reroll that does not touch the coin pools. */
export const freeRerollPhases = (state) => (boonsOf(state) || {}).freeRerollPerPhase || null;

/* Auslage — how many perks the offer shows. */
export function perksOfferedWith(state, base) {
  const b = boonsOf(state);
  return b && b.perksOffered ? Math.max(base, b.perksOffered) : base;
}

/* Auslage III/IV and Beschau — the rarity floor of the perk offer. */
export function perkFloorWith(state, base) {
  const b = boonsOf(state);
  return b && b.perkFloor ? Math.max(base, b.perkFloor) : base;
}

/* Beschau IV — legendary perks appear more often. The factor multiplies the existing chance rather
   than replacing it, so a run that already lifted it keeps that lift. */
export function perkLegendaryWith(state, base) {
  const b = boonsOf(state);
  return b && b.legendaryChance ? base * 2 : base;
}

/* Reliquiar — the next perk offer is three legendaries. `legForce` already exists in buildPerkOffer;
   the boon simply names how many slots, and clears once spent (the reducer drops it). */
export const legendaryPerkForce = (state) => (boonsOf(state) || {}).legendaryPerkPick || 0;

/* Freibrief — how many doors a skill phase opens. */
export function skillDoorsWith(state, base, cycle = state.cycle || 0) {
  const b = boonsOf(state);
  if (!b || !b.thirdDoor) return base;
  const open = b.thirdDoor === "run" || cycle <= b.thirdDoor;
  return open ? base + 1 : base;
}

/* Freibrief IV — epic and legendary appear more often behind the doors. */
export function skillLegendaryWith(state, base) {
  const b = boonsOf(state);
  return b && b.highTierChance ? base * 2 : base;
}

/* Veredelung — lift the tiers of one skill offer. `offerLift` raises every skill by one for a few
   phases; `offerLiftBelow` raises every tier UNDER the named one, for the rest of the run. Tiers are
   0-based here (0 Normal … 3 Episch), the same scale skillTiers uses. */
export function liftSkillTiers(state, tiers, cycle = state.cycle || 0, maxTier = 3) {
  const b = boonsOf(state);
  if (!b || !tiers || typeof tiers !== "object") return tiers;
  const byPhase = live(b.offerLift, cycle) ? (b.offerLift.steps || 1) : 0;
  const below = b.offerLiftBelow || 0;          // 3 = alles unter Sehr selten, 4 = alles unter Episch
  if (!byPhase && !below) return tiers;
  const hebe = (t) => {
    if (!Number.isInteger(t)) return t;          // Legendäre tragen keine Stufe
    let out = t + byPhase;
    if (below && t + 1 < below) out = Math.max(out, t + 1);
    return Math.min(maxTier, out);
  };
  /* ZWEI Formen, und das war der Fehler: die Türen halten ihre Stufen als OBJEKT je Skill-id
     (`rollSkillOfferTiers` gibt `{ SK_… : 0 }` zurück), eine flache Auswahl als Array. Geprüft wurde
     nur auf Array, also hob Veredelung die Türen nie — alle vier Stufen waren wirkungslos
     (Owner-Befund 2026-09-17). Die Tests trafen es nicht, weil sie den Helfer mit Arrays fütterten,
     also mit einer Form, die das Spiel an dieser Stelle gar nicht baut. */
  if (Array.isArray(tiers)) return tiers.map(hebe);
  return Object.fromEntries(Object.entries(tiers).map(([id, t]) => [id, hebe(t)]));
}

/* Die Türen tragen ihre Stufen selbst ([{ skills, tiers }]), also hebt Veredelung sie dort und nicht
   an einer flachen Liste. Ohne Segen kommt dasselbe Array zurück, nicht eine Kopie. */
export function liftDoorTiers(state, doors, cycle = state.cycle || 0) {
  const b = boonsOf(state);
  if (!b || !Array.isArray(doors) || (!b.offerLift && !b.offerLiftBelow)) return doors;
  return doors.map((d) => (d && d.tiers ? { ...d, tiers: liftSkillTiers(state, d.tiers, cycle) } : d));
}

/* Stiftung — every phase begins with coins. */
export const coinsPerPhase = (state) => (boonsOf(state) || {}).coinsPerPhase || 0;

/* Läuft dieses Stück noch, und wie lange? Vier Wirkungen sind befristet — Münzrecht I und Freizug I
   über `cycles`, Veredelung I und II über `phases`, Freibrief I und II über eine Zielrunde. Ohne die
   Zahl kann der Spieler nicht unterscheiden, ob eine Beute abgelaufen ist oder nie gewirkt hat; genau
   diese Frage stand am Anfang des Beute-Audits (Owner, 2026-09-17).
   Gibt `null` für alles Dauerhafte, sonst die verbleibenden Durchläufe (0 = abgelaufen). */
export function lootCyclesLeft(state, piece, cycle = state.cycle || 0) {
  const b = boonsOf(state);
  const fam = LOOT_BY_ID[(piece || {}).id];
  if (!b || !fam) return null;                              // Legendäre laufen alle bis zum Laufende
  const e = fam.effects[(piece.tier || 1) - 1] || {};
  let until = null;
  if (e.cycles && e.income && b.income) until = b.income.until;
  else if (e.cycles && e.energy && b.energy) until = b.energy.until;
  else if (e.phases && e.offerLift && b.offerLift) until = b.offerLift.until;
  else if (e.thirdDoor && e.thirdDoor !== "run" && typeof b.thirdDoor === "number") until = b.thirdDoor;
  if (until == null) return null;
  return Math.max(0, until - cycle);
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
