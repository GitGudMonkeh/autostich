# Task contract — onb-tutorial-entry (tutorial entry rework, round 3 opener)

**Branch:** `task/tutorial-entry` (from `dev`) → merged into `dev`.
**Source of scope:** owner request 2026-08-28 after the round-2 batch, confirmed in chat
("ja passt. altes System raus."). Note: the old guided-run system (TutorialOverlay/useTutorial)
was already removed on dev — only its stale start button copy remained.

## Scope delivered

1. **No separate tutorial start button.** The loud first-contact offer ("Tutorial starten") on
   the start screen is gone; "Lauf beginnen" is the only start, and the first run of a fresh
   profile guides itself (H1 card + tips, unchanged behavior). The quiet "Tutorial" chip stays
   and opens the overview. Dead keys `start.tutorial.offer(.sub)` removed from all four catalogs;
   the `tutorialDone`/`firstContact` plumbing (incl. the `tutorialOpened` legacy read in App)
   removed.
2. **Skip-all on the welcome card.** H1 gets a muted secondary action "Alle Tutorial-Tipps
   überspringen" (`hint.h1.skipAll`, four catalogs): `useHints.skipAll()` marks every id in
   HINT_DEFS seen — no tip ever fires again (including late ice/plant/legendary ones); the card
   closes because H1 itself is then seen.
3. **"Tutorial-Lauf" button in the tutorial overview.** Top of the flat list (`tut.run` +
   `tut.run.sub`): resets the whole hint progress (`useHints.resetAll()` — seen, visits, last,
   seenAt) and starts a new run with `guided: true`. `launchRun` stores the flag (any normal
   start clears it) and `useHints` treats a guided run as a first run, so H1 and the full tip
   sequence fire even on a profile with completed runs.
4. **Confirmation when a run is active.** The overview is reachable mid-run through the
   Mehr-dazu deep link's back path; pressing "Tutorial-Lauf" there would kill the run. New
   `TutorialRunConfirm` (RunConfirm.jsx, z-70 above the overview, `app.tutrun.title/.help`)
   asks first; without an active run the guided run starts directly.

## Guard updates

- `test/rahmen-huelle.test.js`: the `rc-btn` count grows 2 → 3 — the new dialog's action button
  carries the same radius class the guard protects.

## Evidence

- Gates: `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`,
  `npm run loc:export` green. `npm test -- --maxWorkers=1`: 2463/2464 — the one failure is the
  known 5-second-timeout flake in the plant sim aggregation of `test/faction-panels.test.js`
  (passes in isolation, in earlier full runs on the same tree, and `src/game`/`sim` are
  byte-identical to dev in this diff, so the engine under test is unchanged).
- CDP (headless Chromium, 390×844, DE, production build):
  - Hub: no "Tutorial starten", "Lauf beginnen" and the "Tutorial" chip present.
  - Overview: "Tutorial-Lauf" button with sub note at the top.
  - Pressing it starts a run; H1 shows with "Los geht's" and "Alle Tutorial-Tipps überspringen".
  - Skip closes the card and marks all 33 hints seen (localStorage `as_hints`).

## Notes

- A guided run on a veteran profile keeps veteran offers (no Blitz-only first skill gate) — the
  tips adapt (H2b instead of H2). Owner scope was "den mit Tutorial-Tipps geführten Lauf
  wiederholen", not replaying the first-run offer gating.
