# Task contract — onb-firstrun (T-O3)

| | |
| --- | --- |
| Task | `onb-firstrun`, Tier B |
| Feature branch | `feature/onboarding` |
| Task branch | `task/onb-firstrun` |
| Base | `feature/onboarding` (after T-O1 — shares `SkillSelect.jsx` and `hintScript.js`) |
| Binding spec | `docs/tutorial-onboarding-design.md` §6 — owner-approved 2026-08-28 |
| Session | Claude Code remote session, owner-authorized task creation (2026-08-28) |

## Scope

The first-run start behaviour, both keyed on `hadCompletedRun === false` at the `START_RUN` site:

- **§6.1 skip:** the opening skill decision is skipped — the start patch takes the handler's
  existing `phase: "play"` exit; the schedule stays byte-identical; the first skill offer arrives
  on schedule before cycle 5.
- **§6.2 gate:** `unlockedArchetypes = ["lightning"]` for that run, through the existing §4b
  allowlist parameter.
- **§6.2 badge:** "Guter Start" on the guaranteed Blitz consumer in the first offer of a first
  run, rule-derived (`recommendedStarter` in `hintScript.js` — the consumer of the offered
  archetype), with the reason line that defines the crit at the moment of choice. UI only, in
  `SkillSelect.jsx`; copy in all four catalogs.
- Guard tests (`test/firstrun.test.js`): skip and gate lift after the first completed run; the
  sim/standard (profile-less) and ranked paths unchanged; the badge finds its skill across seeds
  and yields null rather than a wrong badge.

This task touches `src/game/reducer.js` deliberately — the START_RUN payload edge the spec names,
not engine logic. rng verification: `rngAtOr` resolves to addressed sub-streams
(`rngAt(seed, 0, …)`) for every seeded run, so the skipped draw shifts no later stream; the
seedless fallback path is unreachable under `firstRun` (it requires a profile, and profile runs
are always seeded by `beginRun`).

## Non-goals

Schedule changes (none, ever, for this feature) · hint engine and banners (T-O1) · event hints
(T-O2) · sections (T-O4).

## Acceptance gate

`npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green.
