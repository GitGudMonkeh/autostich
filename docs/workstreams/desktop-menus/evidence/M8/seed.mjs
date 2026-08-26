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
   the only property that makes a before/after pair a comparison.

   PROMOTED, 2026-08-25 (#menu-rework MH2). `boardRows`, `fetchStubSource`, `freezeClockSource` and
   `FROZEN_MS` now LIVE in `scripts/survey-stub.mjs` and are re-exported from here unchanged. They
   were task-local, so only this harness ever installed them while `viewport-survey.mjs` — which
   drives the production build and posts a real row per `victory` cell — ran without. Re-exporting
   rather than copying is the point: two copies of a write barrier are one copy and one liability.
   `measure.mjs` imports the same four names from the same place and did not change. */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FROZEN_MS, boardRows, fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";

export { FROZEN_MS, boardRows, fetchStubSource, freezeClockSource };

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
