# Health-Check (`exp`) — Execution Log

What was executed from `report-exp-2026-09-28.md` on `claude/exp-branch-code-health-jsclyl` (cut from
`origin/exp` @ `29daa297`), and what remains open. Companion to the report; every commit below ran
`npm test`, `lint --max-warnings=0`, both builds and `gen:db` green on the combined tree.

## Executed

| Finding | Commit | What changed |
| --- | --- | --- |
| G-H1 contract tally misses the closing trick | `fix(contracts)` | engine freezes `lastCycleWins` before the per-cycle reset; the tally reads it. Regression test plays a real 40/40 cycle; counter-checked red without the fix (39 vs 40). |
| D-1 two high advisories, `npm audit fix` broken | `build(deps)` | pixi 8.21 → xmldom 0.8.15, js-yaml 4.3.2, vitest 4.1.11. Lockfile regenerated with `--legacy-peer-deps --package-lock-only` (arborist crashes otherwise). Audit clean. |
| P-1 double CI on `exp` | `ci` | `exp` joins `branches-ignore` in `ci.yml`; `deploy-exp.yml` gains the ordinary build so coverage is unchanged. |
| P-2 commit-message language | `ci` | both workflows check the pushed head's subject for the English conventional prefix; AGENTS.md names the check. Test names were **not** renamed (a translation-only diff of ~600 names is exactly what the language policy discourages). |
| P-3 balance-guard churn / red push | `test(balance-guard)` | header note: re-centre in the same commit as the change, never as a red push. The band itself is the owner's. |
| I-M2 README describes `main` | `docs(readme)` | header names the four branches and slots, new *Stand auf `exp`* section, volatile counts removed, phantom components and stale slot names replaced. |
| G-M5 / S-4 functions over 1,000 lines | `refactor(game)`, `refactor(app)` | see below |

### The long functions

| Function | Before | After | How |
| --- | --- | --- | --- |
| `reducer` (reducer.js) | 947-line switch | 43 handler functions + a dispatch table; longest handler 113 lines (`onStartRun`) | mechanical split, every case body moved verbatim |
| `resolveTrick` (engine.js) | 1,255 | 602, plus `resolveOutcome` (447) and `endCycle` (222) | two blocks moved verbatim into helpers that take the working variables as a context object and return the ones they rebind |
| `AutostichGame` (App.jsx) | 1,334 | 1,248 | action creators → `useRunActions`, audio/music/haptics effects → `useAudioSync`, perf marks → `usePerfMarks`; effects and dependency lists verbatim |
| `Battlefield` (Battlefield.jsx) | 1,254 | 897 | seven per-trick effect pools (score floats, big announcements, Gott and Hologrid triggers, slash ghosts, screen FX, formation float) became custom hooks in the same file; state, refs, effects and dependency lists verbatim |
| `ArchitectScreen` (ArchitectScreen.jsx) | 1,237 | 774 | board cells, build assistant and sticky action bar became sub-components in the same file; markup verbatim, props = the component values each block read |

The React cuts stay in their files on purpose: eight source-text ratchets read `Battlefield.jsx`
(announce ladders, Gott timing, deck tint …) and the per-file `hook-deps-budget` table pins both
files. Moving the blocks to their own modules is a follow-up that touches those guards; it changes
nothing about the component size.

The helper extraction was done with a script that computes the read and written variable sets of a
block; the suite (2,867 tests, including the bit-identical simulation and determinism guards) is the
proof that nothing changed — a missed variable would have surfaced there.

## Open

- **`AutostichGame`** is still ~1,250 lines: the 350-line JSX return and `saveRun` (~120 lines inside
  the component) are the next two cuts. The same in-file hook and sub-component technique applies;
  the five ratchets that read `App.jsx` pin JSX props of `StanceBar`, `RunLoader` and the prefetch
  chain, none of which those cuts would move.
- **`ArchitectScreen`'s drag handlers** (`startDrag`, `onCellDown`, `relocationsForDrop`,
  `rotateSelected`, ~150 lines) are the next hook candidate there; `Battlefield`'s remaining 900 lines
  are mostly derived render values and the JSX itself.
- **The catalog defect (I-H1 / T-H1 / B-1)** — 28 `undefined` strings in the inactive en/es catalogs, the
  vacuous parity guards, the 112 build warnings — was not in the scope of this pass and is untouched.
- **The evidence backlog (R-1)** and the inactive-catalog decision are the owner's (report, section 12).
