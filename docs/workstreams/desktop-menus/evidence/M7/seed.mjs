#!/usr/bin/env node
/* #menu-rework M7 — the seeded profile, written down rather than described.
   ============================================================================

   HAZARD H-e, ANSWERED IN CODE. The statistics screen reads accumulated run history: its node set,
   its section heights and its very existence depend on what is in `as_runhistory`. A measurement of
   this screen against an unnamed profile is a measurement nobody can repeat — and two halves of a
   before/after comparison taken against two different profiles are not a comparison at all.

   So the profile is GENERATED, deterministically, from this file. No `Date.now()`, no `Math.random()`,
   no timestamps taken at run time: every value below is fixed, and re-running this script produces a
   byte-identical blob.

   WHAT IT SEEDS, and why each number is what it is:

   · TWELVE RUNS. `docs/statistik-redesign.md` states its own measurement basis as "zwölf Läufen im
     Speicher — anders zeigt der Screen nur seinen leeren Zustand". Twelve is also over MIN_SAMPLE
     (8, runStats.js), so the "Was am besten läuft" section shows its populated form rather than its
     "too few runs" notice — the taller of the two, and therefore the honest one to measure.
   · RUN 0 IS THE FULL RUN — 7 skills (SKILL_SLOTS 6 + one legendary), 20 flat perks, a 40-card
     snapshot with formations, four architect buildings, a trajectory and a per-trick log. That is
     the "voller Lauf" the design measures the run window against.
   · RUN 6 IS THE THIN RUN — no snapshot, no traj, no trickLog, three skills. It is the design's
     717 px case (storage.js:398, the quota path) and it is seeded so the comparison can be MADE
     rather than asserted.
   · THE REST are ordinary runs of varying length, enough of each archetype that `bestArchetype`
     (minRuns 3) and `scoreLift` (minWith 3, and at least one run without) both return something.

   ONE FACT WORTH KNOWING BEFORE READING THE BUILD PANEL: a run in the local history carries NO
   `families` field. `App.jsx:674` writes `perks` and `skills` and nothing else of the pick set;
   only `GameOver.jsx:522` passes `families`, and it does so from the live state. So `RunBuildChips`
   in a SAVED run shows flat perks plus skills — measured, not assumed, and it is why this seed does
   not invent a families map it would never see in the field.

     node docs/workstreams/desktop-menus/evidence/M7/seed.mjs            # print the blob to stdout
     node docs/workstreams/desktop-menus/evidence/M7/seed.mjs --write    # write seed.json beside it

   The measurement harness (`measure.mjs`) imports `seedBlob()` from here. */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* The namespace prefix `storage.js` puts in front of every key. Production build → empty prefix
   (the preview namespace is VITE_PREVIEW-gated), so the keys are the bare ones. */
const K = (s) => s;

/* ---------------------------------------------------------------- ingredients

   Every id below is read from the real registries, not invented: skills from `SKILL_LIST`, perks
   from `PERK_DEFS`, buildings from `ARCHITECT_FAMILIES`. An invented id renders as its own raw
   string and would silently change every width on the screen. */
const SKILLS = {
  lightning: ["SK_LIGHTNING_01", "SK_LIGHTNING_05", "SK_LIGHTNING_08"],
  fire: ["SK_FIRE_01", "SK_FIRE_03", "SK_FIRE_06"],
  ice: ["SK_ICE_01", "SK_ICE_04", "SK_ICE_07"],
  plant: ["SK_PLANT_02", "SK_PLANT_03", "SK_PLANT_06"],
  legendary: "SK_LIGHTNING_L01",
};
/* All twenty-two flat perks exist; twenty is the design's "voller Lauf". The order is the registry's
   own, so the category grouping in `RunBuildChips` is the one a player would see. */
const PERKS = ["E10", "L2", "L6", "L4", "L_UMV", "L_ZINS", "L_VAB", "L_HENK", "L_ECHO", "L_SAMM",
  "L_BRENN", "L_PATT", "L_MONO", "L_RICHT", "L_BAUH", "L_MEIS", "L_SCHM", "L_HOCH", "L_OPFER", "L_TAKT"];

/* Four buildings on the board — two value, one score, one formation, so all three architect
   categories are represented and the legend row has something to legend. Every `cat` below is the
   family's OWN category from `ARCHITECT_FAMILIES`, and every footprint matches the family's `form`
   (domino = two adjacent cells, tromino_i = three in a line). Both are checked rather than assumed:
   a footprint that contradicts its form draws a frame the game would never draw. */
const BUILDINGS = [
  { id: "b1", familyId: "A_STUETZE", tier: 2, footprint: [0, 1], cat: "value", name: "Stützbalken" },
  { id: "b2", familyId: "A_RIEGEL", tier: 3, footprint: [5, 6, 7], cat: "value", name: "Riegel" },
  { id: "b3", familyId: "A_ZOLLHAUS", tier: 1, footprint: [21, 22], cat: "score", name: "Zollhaus" },
  { id: "b4", familyId: "A_KLAMMER", tier: 2, footprint: [30, 31], cat: "formation", name: "Klammer" },
];
const CAT_COLOR = { value: "#5ab87a", score: "#d4a63a", formation: "#5a8ade" };
const CAT_ICON = { value: "◆", score: "★", formation: "▲" };

const SUITS = ["R", "B", "G", "Y"];   // constants.js SUIT_ORDER — uppercase keys, and `suitColor` throws on anything else

/* Forty cards, five columns by eight rows, deterministic: value cycles 1..10, suit cycles the four
   colours, every fourth card green (plant). It is a board, not a replay — the run window measures
   the GRID, and the grid's geometry is the same whatever the faces say. */
function cards() {
  const out = [];
  for (let i = 0; i < 40; i++) {
    out.push({ id: `c${i}`, value: (i % 10) + 1, suit: SUITS[i % 4], green: i % 4 === 3 });
  }
  return out;
}

function cover() {
  const c = {};
  for (const b of BUILDINGS) {
    for (const pos of b.footprint) {
      c[pos] = {
        cat: b.cat, color: CAT_COLOR[b.cat], icon: CAT_ICON[b.cat], boost: b.cat === "value" ? b.tier : 0,
        legendary: false, name: b.name, tier: b.tier, badgeSuit: null, bid: b.id,
        effects: [`+${b.tier} Wert`, "Nachbarschaft"],
      };
    }
  }
  return c;
}

/* GHOST_STEP (constants.js) — the trajectory carries one point per this many tricks, and the
   labelled x-axis of `Sparkline` reads `(i + 1) * GHOST_STEP`. A trajectory whose LENGTH does not
   follow the run's trick count therefore prints an axis that contradicts the "Stiche" readout two
   panels away. Mirrored here rather than imported for the reason given at RESET_EPOCH. */
const GHOST_STEP = 13;

/* The trajectory: one point per GHOST_STEP tricks, monotonically rising and steepening — the shape a
   real score curve has, because the score compounds. */
function traj(peak, tricks) {
  const n = Math.max(2, Math.round(tricks / GHOST_STEP));
  const out = [];
  for (let i = 0; i <= n; i++) out.push(Math.round(peak * ((i / n) ** 2.4)));
  return out;
}

/* The per-trick log: one row per cycle, the run's own tricks spread evenly across them, three
   quarters of them won. Fixed pattern, so the bar field is identical between two runs of this
   script — and the row COUNT is the run's cycle count, which is what drives the panel's height. */
function trickLog(scale, cycles, tricks) {
  const per = Math.max(1, Math.round(tricks / cycles));
  const out = [];
  for (let c = 0; c < cycles; c++) {
    const row = [];
    for (let i = 0; i < per; i++) {
      row.push({ gained: Math.round(scale * (c + 1) * (1 + (i % 3) * 0.6)), won: i % 4 === 3 ? 0 : 1 });
    }
    out.push(row);
  }
  return out;
}

/* ---------------------------------------------------------------- the twelve runs

   `ts` is fixed and descending — newest first, which is the order `loadRunHistory` returns and the
   order the list renders. The dates therefore read as a plausible fortnight and never move. */
const T0 = Date.UTC(2026, 7, 20, 18, 0, 0);       // 20.08.2026, a fixed wall clock
const DAY = 86400000;

function run(i, o) {
  const score = o.score;
  return {
    score, level: o.cycles, tricks: o.tricks, cycles: o.cycles, ts: T0 - i * DAY - i * 3600000,
    bestStreak: o.streak, perks: o.perks, skills: o.skills,
    maxFormations: o.forms, formationScore: Math.round(score * 0.22), buildingScore: Math.round(score * 0.11),
    crits: o.crits, wins: o.wins, critBonusScore: Math.round(score * 0.13),
    bestTrickScore: Math.round(score * 0.09), bestGlacierTrickScore: o.skills.some((s) => s.startsWith("SK_ICE")) ? Math.round(score * 0.04) : 0,
    glacierYield: o.skills.some((s) => s.startsWith("SK_ICE")) ? Math.round(score * 0.08) : 0,
    streakScore: Math.round(score * 0.06),
    lightYield: o.skills.some((s) => s.startsWith("SK_LIGHTNING")) ? Math.round(score * 0.09) : 0,
    plantRoot: o.skills.some((s) => s.startsWith("SK_PLANT")) ? Math.round(score * 0.03) : 0,
    plantBloom: o.skills.some((s) => s.startsWith("SK_PLANT")) ? Math.round(score * 0.02) : 0,
    plantHarvest: 0,
    fireBase: o.skills.some((s) => s.startsWith("SK_FIRE")) ? Math.round(score * 0.07) : 0,
    fireWhite: 0,
    seed: o.seed, seedCode: o.seedCode,
    durationMs: o.durationMs, archetypes: o.archetypes,
    treeNodes: o.treeNodes,
    completed: o.completed !== false,
    ...(o.thin ? {} : { traj: traj(score, o.tricks), trickLog: trickLog(Math.round(score / (o.tricks * 6)), o.cycles, o.tricks) }),
    ...(o.thin ? {} : {
      deckSnapshot: {
        cards: cards(),
        formations: [],
        architectCover: o.arch ? cover() : null,
        buildings: o.arch ? BUILDINGS.map(({ id, familyId, tier, footprint }) => ({ id, familyId, tier, footprint })) : [],
        challengeBlockForm: [],
      },
    }),
  };
}

const SPEC = [
  /* 0 — THE FULL RUN. 7 skills, 20 perks, a board with four buildings. The design's 949 px case. */
  { score: 1284000, cycles: 9, tricks: 156, streak: 14, crits: 41, wins: 118, forms: 7,
    perks: PERKS, skills: [...SKILLS.lightning, ...SKILLS.fire, SKILLS.legendary],
    archetypes: ["lightning", "fire"], durationMs: 2_760_000, treeNodes: 27, seed: 84213771, seedCode: "GLDN-4213", arch: true },
  { score: 862400, cycles: 8, tricks: 132, streak: 11, crits: 30, wins: 96, forms: 5,
    perks: PERKS.slice(0, 14), skills: [...SKILLS.ice, ...SKILLS.plant],
    archetypes: ["ice", "plant"], durationMs: 2_310_000, treeNodes: 24, seed: 55120904, seedCode: "FROS-1209", arch: true },
  { score: 640100, cycles: 8, tricks: 121, streak: 9, crits: 26, wins: 84, forms: 4,
    perks: PERKS.slice(2, 13), skills: [...SKILLS.fire, ...SKILLS.lightning.slice(0, 2)],
    archetypes: ["fire", "lightning"], durationMs: 2_040_000, treeNodes: 22, seed: 31887415, seedCode: "EMBR-8874", arch: false },
  { score: 511900, cycles: 7, tricks: 108, streak: 8, crits: 21, wins: 74, forms: 4,
    perks: PERKS.slice(0, 10), skills: [...SKILLS.plant, ...SKILLS.ice.slice(0, 2)],
    archetypes: ["plant", "ice"], durationMs: 1_860_000, treeNodes: 21, seed: 77400212, seedCode: "VERD-4002", arch: true },
  { score: 448300, cycles: 7, tricks: 99, streak: 7, crits: 19, wins: 67, forms: 3,
    perks: PERKS.slice(4, 13), skills: [...SKILLS.lightning, ...SKILLS.ice.slice(0, 1)],
    archetypes: ["lightning", "ice"], durationMs: 1_680_000, treeNodes: 19, seed: 20915583, seedCode: "STRM-9155", arch: false },
  { score: 371600, cycles: 6, tricks: 88, streak: 6, crits: 15, wins: 58, forms: 3,
    perks: PERKS.slice(1, 9), skills: [...SKILLS.fire, ...SKILLS.plant.slice(0, 2)],
    archetypes: ["fire", "plant"], durationMs: 1_500_000, treeNodes: 18, seed: 64002891, seedCode: "ASCH-0028", arch: true },
  /* 6 — THE THIN RUN. No snapshot, no traj, no trickLog: the quota path (storage.js:398) and the
     foreign-board case. The design's 717 px comparison. */
  { score: 298700, cycles: 5, tricks: 71, streak: 5, crits: 11, wins: 47, forms: 2,
    perks: PERKS.slice(0, 6), skills: SKILLS.ice,
    archetypes: ["ice"], durationMs: 1_260_000, treeNodes: 16, seed: 11458023, seedCode: "KLAR-4580", thin: true },
  { score: 244100, cycles: 5, tricks: 66, streak: 5, crits: 10, wins: 43, forms: 2,
    perks: PERKS.slice(3, 11), skills: [...SKILLS.plant, ...SKILLS.fire.slice(0, 1)],
    archetypes: ["plant", "fire"], durationMs: 1_140_000, treeNodes: 15, seed: 90337146, seedCode: "MOOS-3371", arch: false },
  { score: 197500, cycles: 4, tricks: 55, streak: 4, crits: 8, wins: 36, forms: 2,
    perks: PERKS.slice(0, 7), skills: [...SKILLS.lightning.slice(0, 2), ...SKILLS.fire.slice(0, 2)],
    archetypes: ["lightning", "fire"], durationMs: 960_000, treeNodes: 13, seed: 48276630, seedCode: "FUNK-2766", arch: true },
  { score: 152800, cycles: 4, tricks: 48, streak: 3, crits: 6, wins: 31, forms: 1,
    perks: PERKS.slice(5, 11), skills: [...SKILLS.ice.slice(0, 2), ...SKILLS.plant.slice(0, 2)],
    archetypes: ["ice", "plant"], durationMs: 840_000, treeNodes: 11, seed: 70119458, seedCode: "TAUS-1194", arch: false },
  { score: 98300, cycles: 3, tricks: 37, streak: 3, crits: 4, wins: 24, forms: 1,
    perks: PERKS.slice(0, 5), skills: SKILLS.fire,
    archetypes: ["fire"], durationMs: 660_000, treeNodes: 9, seed: 25603387, seedCode: "GLUT-6033", arch: false, completed: false },
  { score: 54600, cycles: 2, tricks: 25, streak: 2, crits: 2, wins: 16, forms: 1,
    perks: PERKS.slice(2, 6), skills: SKILLS.lightning.slice(0, 2),
    archetypes: ["lightning"], durationMs: 480_000, treeNodes: 7, seed: 39824015, seedCode: "BLIT-8240", arch: false, completed: false },
];

export const HISTORY = SPEC.map((o, i) => run(i, o));

export const PROFILE = {
  schemaVersion: 11,
  games: HISTORY.length,
  totalScore: HISTORY.reduce((a, r) => a + r.score, 0),
  totalDurationMs: HISTORY.reduce((a, r) => a + r.durationMs, 0),
  bestScore: Math.max(...HISTORY.map((r) => r.score)),
  bestStreak: Math.max(...HISTORY.map((r) => r.bestStreak)),
  maxCrits: Math.max(...HISTORY.map((r) => r.crits)),
  bestTrickScore: Math.max(...HISTORY.map((r) => r.bestTrickScore)),
  archetypesEver: ["lightning", "fire", "ice", "plant"],
  firstTs: HISTORY[HISTORY.length - 1].ts,
  hadNoRerollRun: false,
  monoArchetypeRuns: { ice: 1, fire: 1, lightning: 1 },
  hadAllArchetypesRun: false,
  archetypeRunsCompleted: { lightning: 4, fire: 4, ice: 4, plant: 4 },
  lastRankedWeekSeed: null,
};

/* THE STAMP THAT MAKES THE SEED SURVIVE THE FIRST BOOT, and it is the whole reason the first run of
   this harness measured an empty screen against a fully seeded profile.

   `maybeResetForEpoch` (storage.js:329) runs ONCE per namespace in every deployed build and calls
   `wipeProfileStorage()` unless `as_reset_epoch` already holds `RESET_EPOCH`. A profile written into
   a fresh browser profile therefore has exactly one boot to live, and it does not survive it — the
   history, the totals and the username are gone before `StatsScreen` ever reads them, silently and
   with no error anywhere. Setting the stamp is what tells the build "this namespace has already been
   reset", which is true: it was reset by `localStorage.clear()` one line earlier.

   The value is copied from `storage.js` rather than imported: `measure.mjs` runs in Node against the
   BUILT bundle, and importing `storage.js` would drag `import.meta.env` and the whole game graph in
   for one string. If the epoch is ever bumped, this line is the one that has to follow — which is
   exactly what the assertion in `measure.mjs` catches. */
const RESET_EPOCH = "2026-08-16-test-neustart";

/* The blob the harness writes into localStorage. One object, one place, so the machine half and the
   owner-facing captures cannot drift apart. */
export function seedBlob(lang = "de") {
  return {
    [K("as_reset_epoch")]: RESET_EPOCH,
    [K("as_runhistory")]: JSON.stringify(HISTORY),
    [K("as_profile")]: JSON.stringify(PROFILE),
    [K("as_username")]: "M7",
    [K("as_options")]: JSON.stringify({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null }),
    [K("as_tutorial_done")]: "1",
  };
}

if (process.argv[1] && process.argv[1].endsWith("seed.mjs")) {
  const blob = seedBlob("de");
  if (process.argv.includes("--write")) {
    writeFileSync(join(HERE, "seed.json"), JSON.stringify(blob, null, 1));
    console.log(`seed.json written — ${HISTORY.length} runs, best ${PROFILE.bestScore}`);
  } else {
    console.log(JSON.stringify({ runs: HISTORY.length, best: PROFILE.bestScore, bytes: JSON.stringify(blob).length }, null, 1));
  }
}
