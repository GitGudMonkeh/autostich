# Health-Check — Execution Log

What was executed from `report.md`'s findings, where, and what remains open. Companion to the
report (committed on `task/health-check`); this file lives with the fixes on `task/health-fixes`.
Both branches were cut from `origin/dev` @ `b476e47b`.

## Branch map

| Branch | Contents |
| --- | --- |
| `task/health-check` | The report; harness cuts C1–C5; evidence size tripwire; doc-drift fixes |
| `task/health-fixes` | All code and test fixes below, in six commits, each gate-verified |

## Executed

**Part 2 (on `task/health-check`, commit `e8f27b5a`):** C1 conventions.md 764→524 (rulings moved
verbatim to the decision log), C2 review section slimmed with `task-lifecycle.md` §8 now canonical,
C3 git-workflow §10 → pointer, C4 CLAUDE.md restatements dropped, C5 promotion commands → pointer;
evidence tripwire (1 MB file / 25 MB dir with ruling); architecture.md `assetsInlineLimit` drift and
i18n.md double-§7 fixed.

**Code (on `task/health-fixes`):**

| Commit | Findings | Note |
| --- | --- | --- |
| `980859e2` | F1 (11 files + stale zh-Hans comment), M13-as-deletion | 24 new keys in all four locales; Card/LayoutPerks/MuteButton added to the MIGRATED ratchet, counter-checked; dead `DeckHistogram` deleted instead of translated |
| `115faa2a` | G2 (ring CSS, Stats-Escape, Schale remount, draft race, fundBonus preview), A1, A2, S4, S7, S8 | dialog roles on five modals; quota signals; surrogate-safe name |
| `a2f428b8` | G1, M4, M3-dead-exports, S1/S2 | reducer passes `archOf(state)` on all ten sites; geometry dedup; 11 dead exports removed (each re-verified at this head); SQL abuse-stop constraints appended — **owner must apply them in the Supabase dashboard** |
| `8a1664ad` | S3 | `AppErrorBoundary` wraps the app; boot-path guard re-pinned and counter-checked; `error.crash.*` keys ×4 locales |
| `af544d45` | G4 (M27–M31) | five guards strengthened; all five counter-checked (sabotage red / revert green); found and fixed the `.as-kpi` coverage gap in `MIGRATED_SELECTORS` on the way |
| `c111f590` + `d30f8935` | G3 (M6, M7, loc-todo dedup) | dead `compress:music` removed; FX bench made win32-portable (syntax-checked; full run needs the deliberate playwright prerequisite); the second commit repairs a lint warning the first was pushed with — recorded honestly in its message |
| `0393b9d9` | M2, M3-telemetry, S5, M8 | queue race, decisions size cap, cancellable prefetch chain, `+5` → `{n}` from `SP_LOYALTY_SP` |

Every commit ran `npm test` green (2433 after this workstream's own additions); the clusters that
touched build-relevant surfaces ran all four gates. All counter-checks per `testing.md` §5 are
recorded in the guard comments and commit messages.

## Open — needs the owner (integration stop)

1. **Apply the two SQL constraints** in the Supabase dashboard (`docs/supabase-schema.sql` and
   `docs/autostich-reports-schema.sql`, the `#health-check` blocks at the end). Until then S1/S2
   remain open server-side.
2. **Sign off the crash screen's look** (S3) — dark screen, localized message, reload button,
   deliberately token-free. Visible design is the owner's.
3. **Sign off G1** — formations after perk/family picks now include building effects, matching the
   other five call sites. No test pinned the old behavior and `archOf` is null outside architect
   runs, but it is a gameplay-visible correction and deserves an explicit yes.
4. **Integration authorization** for both branches (report + fixes), per the lifecycle's end stop.

## Open — deferred with reasons (agent-side follow-ups)

- **M16** `scripts/zh-gate-shots.mjs` state leak between language passes, and **M17**
  `scripts/viewport-survey.mjs` shrinkage criterion computing `null` in the chunked workflow: both
  are preview-evidence tooling with owner-facing capture semantics; fixing them properly needs a
  capture re-run to prove the fix, which is its own small task.
- **S6** `publishRun` failures stay invisible (`App.jsx` `.catch(() => {})`): the fix is a
  player-visible UI decision (toast? retry?) — owner's call before implementation.
- **144 low findings** (report Appendix B): per the report's recommendation these are opportunistic
  cleanup during neighbouring tasks, not a dedicated sweep. None was invalidated by this work; the
  handful touching files edited here were fixed in passing where trivial.
- **SHOW_HIT_ICONS** (`Battlefield.jsx:301`) was reported as dead code but is a deliberately parked
  feature per its own comment ("Auf true zurück, sobald da") — left in place, report stands
  corrected here.
