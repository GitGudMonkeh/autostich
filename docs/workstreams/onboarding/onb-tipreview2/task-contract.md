# Task contract — onb-tipreview2 (tip review round 2)

**Branch:** `task/tip-review-2` (from `dev`) → merged into `dev`.
**Source of scope:** `docs/workstreams/onboarding/tip-review-2026-08-28.md`, section
"Round 2 (owner playtest after implementation)" — rows R1–R23, all collected and confirmed by the
owner on 2026-08-28, implemented in one batch on the owner's go ("setzten wir alle Änderungen um").

## Scope delivered

| Row | Change | Where |
| --- | --- | --- |
| R1 | Hint multipliers formatted to two decimals (`mult2`, toFixed(2) pattern); audited E3/E4/E6 | hintScript.js |
| R2 | Scene tab buttons at 10.5 px — every label single-line at 390 px (verified for "Wiederholung" and "Wiederholung + Wechsel") | scenes.css |
| R3 | Screen renamed back to "Tutorial" (DE/EN/ES "Tutorial", ZH 教程): `tut.title`, `start.tutorial`, DE probe captions "Tutorial · …" | four catalogs |
| R4 | Scene tab rows size their columns by button count (`grid-auto-flow: column`) — two tabs fill the full row | scenes.css, scenes.jsx |
| R5 | "Weiter" past a lesson's last page closes the tutorial back to the game; "Zurück" below the first page still goes to the list | TutorialSections.jsx |
| R6 | Uniform "Formation(en)" instead of "Muster"/patterns in hint.e6, tut.sz.ue.bunt/zick, tut.aufstellung.stapeln.0 (all four catalogs); `stats.noPatterns` untouched (behavioural patterns) | catalogs |
| R7 | Ion-storm canvas overshoots the card by its pad (12 px) so the jagged frame rides the card edge on any screen (CDP-verified: overshoot ~11–12 px each side) | scenes.css, scenes.jsx |
| R8/R15/R23 | "Mehr dazu" dropped from E4, C3 and H1 (targets removed) | hintScript.js |
| R9 | Rarity lesson passes `{ hasFormation: true }` to `scoreFlat` — renders "+100 anstatt +50" (was +0/+0); D_HIGH twin already passed a proper ctx | scenes.jsx |
| R10 | Strukturen lesson drops its probe lead and tip via a `stumm` probe beat (no key, no line); keys `tut.architekt.strukturen.1/.2` deleted | catalog.js, TutorialSections.jsx, scenes.jsx, catalogs |
| R11 | H4 reworded ("Im Glossar oben rechts schlägst du fast alles nach."); the glossar anchor PULSES (`as-hint-pulse` keyframes, static under prefers-reduced-motion) | catalogs, HintCard.jsx, index.css |
| R12 | Spotlight scrim geometry runs through a rAF loop writing the DOM directly — no more one-frame trailing during scroll | HintCard.jsx |
| R13 | Sections and lessons reordered to first-run appearance: grundlagen → blitz → wahl → aufstellung → architekt → feuer → danach → pflanze → eis → fortgeschritten; grundlagen = stich/score/serie/werte/herkunft; architekt = wasist/hauptaktion/wohin/strukturen/aufwerten/tipps; feuer/pflanze put feld before the mechanic lesson | catalog.js |
| R14 | Aufwerten tile wears normal offer styling when upgradable; dashed + dimmed only when nothing on the board can be upgraded | ArchitectScreen.jsx |
| R16 | Alliance color band removed from the opponent card (both render paths incl. the slice ghost snapshot) | Battlefield.jsx |
| R17 | `hintHold`: while an event hint card is open the battlefield holds the resolved trick face-up (no fly-away, no finisher, no zug beat) — covers E9 and every trick-referent hint at any speed | Battlefield.jsx, App.jsx |
| R18 | C5 no longer consumed by leaving the phase (dismiss-by-deciding skips it); it re-shows in every stuck phase until ✕. Predicate verified against the owner repro (18/20 + size-3/4 offers → true) and a geometry-only case; mid-phase re-evaluation confirmed (state.architect updates live) | useHints.js, tests |
| R19 | New C6 banner (Kombis/Formationen toggles) in the architect phase AFTER C5's ✕ (`seenAt` per-hint context in hint progress storage); anchor glow on the toggle row (`archtoggles`) | hintScript.js, useHints.js, storage.js, ArchitectScreen.jsx, catalogs |
| R20 | Blitz panel drops the Blitzfrequenz bar, Serienkette and Serienschutz badge (duplicated Multiplikatoren panel / status bar); collapsed "Crit ×N" headline stays; 8 dead keys removed per catalog | ChargeBar.jsx, catalogs |
| R21 | Milestone bar fills per milestone (`segFill` in milestoneBarState) and resets to 0 in the next stage color; quarter marks removed; total `fill` kept for existing consumers | progression.js, ScoreMilestoneBar.jsx |
| R22 | `START_DECK_POINTS` 50 → 0; welcome bonus (50 DP after first completed run) stays per owner confirmation | storage.js |

## Guard updates (invariant genuinely changed, owner-decided)

- `test/buehne-desktop.test.js` deckzug guards pin the `hintHold` variants of `gezogen`/`aufOn` (R17).
- `test/i18n-guards.test.js` SAME_OK: `tut.title` — "Tutorial" is the same word in EN/ES (R3).
- `test/storage.test.js` DP expectations follow the 0-DP fresh start (R22).
- New tests: `noOfferPlaceable` against the owner repro board + geometry case, and the C6
  next-phase rule (`c5Done`) in `test/hints.test.js` (R18/R19).

## Evidence

- Gates: `npm test -- --maxWorkers=1` (153 files, 2464 tests green), `npm run lint -- --max-warnings=0`,
  `npm run build`, `npm run gen:db`, `npm run loc:export` — all green on the final tree.
- CDP (headless Chromium, 390×844, DE locale, production build):
  - Formationen tabs: 4 × 79 px, full row width, "Wiederholung" one line at 10.5 px (R2/R4).
  - Stapeln tabs: 2 × 163 px, full row, both labels one line (R2/R4).
  - Strukturen lesson: lead and tip gone, board present (R10).
  - Blitz card: canvas overshoot ≈ 12 px per side, frame rides the card edge (R7, screenshot).
  - Rarity lesson renders "+100 anstatt +50" (R9).
  - "Weiter" past 4/4 closes the dialog to the game (R5).
  - Overview title "Tutorial" from the start chip (R3).
- Node: `milestoneBarState` segFill 0.5 at 5 M, resets to 0 at each threshold, 1 at max (R21).

## Deviations / notes

- R12 keeps the scrim hole as one fixed element; the lag fix is the rAF-direct-DOM loop, not
  document-anchored positioning (anchors live in nested scrolling contexts; per-frame measurement
  covers them all).
- R17 holds the presentation for EVERY open event hint card, not only E9 — U-hints are unaffected
  visually (no fresh trick at phase start) and trick hints all benefit.
- R18 root cause: the predicate was correct; the once-per-profile marker could be consumed by
  leaving a stuck phase without the player acting on the banner. C5 is now ✕-only.
- R13 archetype-lesson order (feld before mechanic) applied to feuer and pflanze by the same
  "what appears first" rule; eis already matched.
