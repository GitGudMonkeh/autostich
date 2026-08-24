#!/usr/bin/env node
/* #menu-rework M8 — the profile and the BOARD the leaderboard is measured against.
   ============================================================================

   WHY A STUBBED BOARD, and it is hazard H-a answered in code rather than in prose.

   `leaderboard` is the one surface of this round that reads the NETWORK. TYPO-08 has it on record:
   the row count follows whatever `autostich_scores` holds at the moment of the run, so two halves of
   a comparison are two different screens and the difference does not cancel. `surface-delta.mjs`
   pre-registers that and counts the unmatched paths separately — which keeps the gate honest but
   leaves the redesign itself unmeasured, because the rows ARE the redesign.

   So this file holds the board still. `boardRows()` is a fixed, generated table with no `Date.now()`
   and no `Math.random()` in it; `measure.mjs` installs it as a `fetch` interceptor BEFORE the app
   boots, so `leaderboardConfigured` stays true, every code path is the real one, and the same twenty
   rows arrive in both halves. Re-running produces a byte-identical board.

   The contract asks for the row count of both halves either way. With this it is the same number by
   construction, and the record says so instead of explaining a difference afterwards.

   THE PROFILE is the second half. `rankedUnlocked` (progression.js:136) demands every `deckUnlock`
   node bought AND one finished run per ranked archetype; without both, the ranked cockpit renders
   the LOCKED line instead of the play button, and the play button is one of the things the design
   document puts a number on. Four flags, no more: this harness measures the leaderboard, not the
   tree.

   NOTHING HERE READS THE CLOCK OR THE RANDOM SOURCE. Re-running produces the same bytes, which is
   the only property that makes a before/after pair a comparison. */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* The namespace prefix. `storage.js` builds its keys through `k()`, which is the identity in the
   deployed build — copied rather than imported for the reason M7's seed states: importing
   `storage.js` into Node drags `import.meta.env` and the whole game graph in for one string. */
const K = (s) => s;

/* `maybeResetForEpoch` (storage.js:329) wipes a fresh namespace exactly once unless this stamp is
   already present. A seeded profile without it has one boot to live and does not survive it —
   silently, with the empty screen as the result. See M7-F02. */
const RESET_EPOCH = "2026-08-16-test-neustart";

/* THE SECOND STAMP, and it cost this harness one wrong capture before it went in — the same class of
   defect as M7-F02, one layer further down.

   A profile blob without `schemaVersion` enters `migrateProfile` (storage.js:150) at v0 and walks the
   whole chain. Step v6 -> v7 (#369 Progression-Rework) does this:

       if (spent > 0 || hasOldNodes) { out.stichPoints += spent; out.stichSpent = 0; out.nodes = {}; }

   It is right for a real profile — the old tree's node ids are dead and the SP are refunded — and it
   is fatal for a seeded one: `nodes` is EMPTIED, so `rankedUnlocked` goes false, and the ranked
   cockpit renders the locked line instead of the play button. Nothing errors. The screen is simply a
   different screen, and its geometry is the geometry of that different screen.

   Stamping the current version is what says "this blob is already v11", which it is: it was written
   in v11's shape. If the version is ever bumped, this line follows — and the assertion in
   `measure.mjs` (the play button must be present) is what catches it if it does not. */
const PROFILE_SCHEMA_VERSION = 11;

/* THE FROZEN INSTANT. The hub reads the ISO week and the ranked tab renders a live countdown that
   ticks every second — two halves taken minutes apart differ in the countdown even with zero code
   changed, and a span crossing midnight cost this workstream 72 box deltas across ten surfaces.
   `measure.mjs` pins `Date` to this value in both halves, so the week label, the week seed and the
   countdown are the same string in both. Monday, 2026-08-24, 12:00 UTC — the middle of a week, so
   no rounding sits near a boundary. */
export const FROZEN_MS = Date.UTC(2026, 7, 24, 12, 0, 0);

/* Four flags, and each one is load-bearing. `nodes` unlocks the two deck nodes `rankedUnlocked`
   checks; `archetypeRunsCompleted` is its second condition. `onboarding` keeps the hub out of its
   guided state, which would otherwise change the tile row the harness clicks. */
export const PROFILE = {
  schemaVersion: PROFILE_SCHEMA_VERSION,
  stichPoints: 0, stichSpent: 0,
  onboarding: 6,
  nodes: { iceDeck: 1, plantDeck: 1 },
  archetypeRunsCompleted: { lightning: 1, fire: 1, ice: 1, plant: 1 },
};

/* ------------------------------------------------------------------ the board

   Twenty rows, generated by arithmetic rather than typed, so the table cannot drift while someone
   edits it. What varies row to row is what the LIST shows: rank tone (the first three), name length
   (the truncation case), archetype icon count (0 to 3), tree progress (including the missing value
   that renders the dashed pill), and cycle count.

   Row 4 carries the empty `tree_nodes` on purpose: `TreePill` renders a DASHED "-/27" for it, which
   is a second visual state that no capture would otherwise contain.
   Row 8 carries the long name — past the point where `truncate` bites in the narrow cockpit column. */
const ARCH = ["", "fire", "lightning,fire", "fire,ice", "lightning,fire,ice", "plant", "ice,plant"];
const NAMES = ["Vexil", "Nomad", "Kestrel", "Bo", "Sable", "Quill", "Wren",
  "Ferrothorn-Ueberbau", "Ash", "Mirek", "Tuli", "Odessa", "Prow", "Kite", "Halcyon",
  "Bram", "Sooth", "Ivor", "Lace", "Wend"];

export function boardRows(limit = 20, board = null, seed = null) {
  const n = Math.max(0, Math.min(NAMES.length, Number(limit) || 0));
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: 9000 + i,
      name: NAMES[i],
      score: 1284000 - i * 41137,
      level: 6 - (i % 3),
      tricks: 88 - i,
      cycles: 9 - (i % 5),
      archetypes: ARCH[i % ARCH.length],
      best_streak: 7 - (i % 4),
      perks: "",
      skills: "",
      max_formations: 3 + (i % 3),
      formation_score: 12000 - i * 311,
      crits: 14 - (i % 6),
      wins: 40 - i,
      crit_bonus_score: 9400 - i * 173,
      best_trick_score: 31000 - i * 517,
      /* Row 4 has no tree value: the dashed pill is a state of its own and belongs in the capture. */
      tree_nodes: i === 3 ? null : 27 - ((i * 3) % 27),
      seed: seed != null ? Number(seed) : 4000000 + i * 7,
      board: board || null,
      created_at: "2026-08-" + String(10 + (i % 14)).padStart(2, "0") + "T09:00:00Z",
    });
  }
  return rows;
}

/* THE STUB, as source text. It is installed as an init script so it is in place before the module
   graph runs — `leaderboard.js` reads `import.meta.env` at module scope, and a stub installed after
   that has already missed the first fetch. Only `autostich_scores` is intercepted; every other
   request (the bundle, the fonts, the media) goes to the real network untouched.

   The champion archive asks for `limit = 1` per expired week, ten times. Giving every week the same
   winner would hide the row's own variance, so the name rotates with the week seed — deterministic,
   because the seed is a function of the week and the week is frozen. */
export function fetchStubSource({ champions = true } = {}) {
  const rows = JSON.stringify(boardRows(NAMES.length));
  const names = JSON.stringify(NAMES);
  return "(() => {\n"
    + "  const ALL = " + rows + ";\n"
    + "  const NAMES = " + names + ";\n"
    + "  const json = (v) => new Response(JSON.stringify(v), { status: 200, headers: { \"content-type\": \"application/json\" } });\n"
    + "  const real = window.fetch.bind(window);\n"
    + "  window.fetch = function (input, init) {\n"
    + "    const url = typeof input === \"string\" ? input : (input && input.url) || \"\";\n"
    + "    if (url.indexOf(\"autostich_scores\") < 0) return real(input, init);\n"
    + "    const limit = Math.max(0, Math.min(ALL.length, Number((/[?&]limit=(\\d+)/.exec(url) || [])[1] || 20)));\n"
    + "    const seedM = /[?&]seed=eq\\.(\\d+)/.exec(url);\n"
    + "    const boardM = /[?&]board=eq\\.([^&]+)/.exec(url);\n"
    + "    if (seedM && limit === 1) {\n"
    + (champions
      ? "      const i = Math.abs(Number(seedM[1])) % NAMES.length;\n"
        + "      return Promise.resolve(json([Object.assign({}, ALL[i], { seed: Number(seedM[1]), board: \"meister\" })]));\n"
      /* `champions: false` is what re-measures the design's open question 1: the EMPTY challenger tab
         and the card height it produces. An empty archive is a real state — a fresh table, or ten
         weeks nobody played — and it is the state the design took its 347 px from. */
      : "      return Promise.resolve(json([]));\n")
    + "    }\n"
    + "    const out = ALL.slice(0, limit).map((r) => Object.assign({}, r, {\n"
    + "      board: boardM ? decodeURIComponent(boardM[1]) : null,\n"
    + "      seed: seedM ? Number(seedM[1]) : r.seed,\n"
    + "    }));\n"
    + "    return Promise.resolve(json(out));\n"
    + "  };\n"
    + "  return true;\n"
    + "})()";
}

/* Pin the clock. `Date.now()` and `new Date()` both, because `currentWeek(new Date(now))` uses the
   constructor and `msUntilWeekEnd` uses it again — freezing only one of the two leaves the countdown
   live. `performance.now()` is deliberately left alone: React's scheduler reads it, and a frozen
   monotonic clock is a hung scheduler, not a still screen. */
export function freezeClockSource(ms = FROZEN_MS) {
  return "(() => {\n"
    + "  const FIXED = " + ms + ";\n"
    + "  const Real = Date;\n"
    + "  function Frozen(...a) {\n"
    + "    if (!(this instanceof Frozen)) return new Real(FIXED).toString();\n"
    + "    return a.length ? new Real(...a) : new Real(FIXED);\n"
    + "  }\n"
    + "  Frozen.prototype = Real.prototype;\n"
    + "  Frozen.now = () => FIXED;\n"
    + "  Frozen.parse = Real.parse;\n"
    + "  Frozen.UTC = Real.UTC;\n"
    + "  window.Date = Frozen;\n"
    + "  return FIXED;\n"
    + "})()";
}

export function seedBlob(lang = "de") {
  return {
    [K("as_reset_epoch")]: RESET_EPOCH,
    [K("as_profile")]: JSON.stringify(PROFILE),
    [K("as_username")]: "M8",
    [K("as_options")]: JSON.stringify({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null }),
    [K("as_tutorial_done")]: "1",
  };
}

if (process.argv[1] && process.argv[1].endsWith("seed.mjs")) {
  const blob = seedBlob("de");
  if (process.argv.includes("--write")) {
    writeFileSync(join(HERE, "seed.json"), JSON.stringify({ blob, rows: boardRows() }, null, 1));
    console.log("seed.json written — " + boardRows().length + " board rows");
  } else {
    console.log("profile keys " + Object.keys(blob).length + " · board rows " + boardRows().length
      + " · frozen " + new Date(FROZEN_MS).toISOString());
  }
}
