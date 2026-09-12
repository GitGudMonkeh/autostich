# Task contract — onb-tipreview5 (tip review round 5)

**Branch:** `task/tip-review-5` (from `dev`) → merged into `dev`.
**Source of scope:** `docs/workstreams/onboarding/tip-review-2026-08-28.md`, section
"Round 5 (owner playtest after round 4)" — rows W1 and W2, confirmed by the owner on 2026-08-29
(W1 on the go "umsetzten"; W2 a follow-up bug report, fixed via `task/tip-review-5b`).

## Scope delivered

| Row | Change | Where |
| --- | --- | --- |
| W1 | "Alle Tutorial-Tipps überspringen" (H1) now also lifts the Blitz-only first-run gate. One gesture, three effects: all hints marked seen (as before); sticky profile flag `tutorialSkipped` so every FUTURE run starts with the normal tree allowlist (fire, plus purchased ice/plant); and a new `SKIP_TUTORIAL` reducer action lifts the gate in the RUNNING run (`state.firstRun` → false, `state.unlockedArchetypes` → tree allowlist), so the run's next skill offer already carries the other archetypes. An already rolled Blitz-only offer on screen is not rerolled. Outside a first run the action is a no-op. The deliberate guided "Tutorial-Lauf" is unaffected (it never had the archetype gate on veteran profiles). | storage.js, reducer.js, useHints.js, App.jsx |
| W2 | **BUG: the tutorial overview's "Glossar öffnen" foot did nothing.** `setGlossaryOpen` is only the pause bookkeeping flag — the glossary UI lived solely inside the run-HUD `GlossaryPanel` (own state, not rendered in the menu at all; in a run the click silently froze the run). App now renders the already-exported `GlossaryOverlay` itself (`glossaryStandalone` state); the pause flag runs in sync so the auto-play guard chains and their dep lists stay untouched; Escape closes the standalone overlay first. | App.jsx |

## Guard updates

- `test/firstrun.test.js`, new describe "Tutorial überspringen (W1)": a `tutorialSkipped` profile
  starts like a veteran (no firstRun, normal allowlist with fire); `SKIP_TUTORIAL` lifts the gate
  mid-run and the next `buildSkillOffer` carries fire; the action is a no-op outside first runs.
- No profile migration link: `tutorialSkipped: false` is correct for every old profile, and
  `loadProfile` fills missing fields from `DEFAULT_PROFILE`.

## Evidence

- Gates on the final tree: `npm test -- --maxWorkers=1` (153 files, 2471 tests green),
  `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`
  (no player-visible text changed → no loc:export delta).
- CDP (headless Chromium, 390×844, DE, production build): fresh profile (hadCompletedRun false)
  with iceDeck/plantDeck tree nodes → "Lauf beginnen" → skip on H1: profile shows
  `tutorialSkipped: true`; the run continues and its FIRST skill offer (Durchlauf 5) carries all
  four archetype pages (Blitz/Feuer/Eis/Pflanze, screenshot r5-skill-feuer). The reducer snapshot
  mid-run confirms `firstRun: false` and the full allowlist right after the skip.

## Deviations / notes

- The first-run start still skips the start-skill decision (that already happened at run start
  and cannot be retrofitted after a mid-run skip); the first offer arrives on schedule before
  Durchlauf 5.
- Skipping inside a guided Tutorial-Lauf also sets `tutorialSkipped` — harmless (the flag only
  matters while `hadCompletedRun` is false) and consistent: skip means no more forced guidance.
