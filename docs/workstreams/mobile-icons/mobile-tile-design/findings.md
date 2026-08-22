# mobile-tile-design — findings

Task `mobile-tile-design`, workstream `mobile-icons`, branch `task/mobile-tile-design`.
Contract: [`task-contract.md`](./task-contract.md). Planning report:
[`planning-report.md`](./planning-report.md). Part 1 of two.

**Status: part 1 in progress.** Setup and baseline done; the measurement and the sheet are open.

---

## S1 — baseline, before the first edit

Measured in this worktree on 2026-08-23, at base `2eddf9d3eceb2168851481a38cd228dd3c602045`, before
any file under `scripts/` or `src/` was touched.

```console
$ npm ci
… exit 0
$ npm test          # vitest run

 Test Files  138 passed (138)
      Tests  2149 passed (2149)
   Duration  45.83s
… exit 0
```

**The baseline is green.** This matters beyond bookkeeping: the `icon-position-review` contract
recorded `npm test` exiting 1 through load-dependent timeouts in `test/i18n-guards.test.js`, green
only under `npx vitest run --testTimeout=30000`. That did **not** reproduce here, and no timeout
override was used. H6 is therefore resolved in the strong direction — from here on, a red suite is
this task's own doing and needs no argument about pre-existing failures.

`npm ci` emitted `npm warn allow-scripts` for `esbuild` and `ffmpeg-static`: their `postinstall`
steps were not run. **Observed, and shown to be harmless for this task** — Vitest, and therefore
Vite and esbuild, ran the full suite from this worktree. It is recorded because a later failure of
the dev server or the build would make it the first thing to check, and because nothing here is
worth guessing about twice.

---

## Setup, and what it deviated from

`/create-task` could not be invoked by this session — the project commands carry
`disable-model-invocation`, and `CLAUDE.md` reserves them for the owner. The owner instructed this
session to take the step over on 2026-08-23. Its steps were then carried out by hand, with its own
prohibitions in force: nothing pushed, nothing deleted, no force flag, nothing overwritten.

Recorded because a hand-run setup is a deviation, and because two of its results differ from what the
command would have produced:

- **The preview port is 5187, not 5186.** The command allocates the lowest free port from 5181 up,
  reading `grep -rn "Preview port" docs/workstreams` in the cockpit checkout. That grep sees
  5180–5185 and would have chosen 5186 — which `icon-position-review`'s contract already pins, in a
  file that exists only on `task/icon-position-review` and is therefore invisible to a cockpit grep.
  **This is a gap in the allocation rule, not a one-off**: any contract on an unmerged branch is
  invisible the same way. Worth a follow-up task against `.claude/commands/create-task.md`.
- **The contract is the real one, not a scaffold.** The command writes headings plus `TODO`; the
  planning session had already written the contract, so it was placed instead. No section was left
  as a heading.

The base branch `feature/mobile-icons` exists locally only, by the owner's decision of 2026-08-23:
pushing it now would protect nothing, since it points at `2eddf9d3`, a commit `origin/dev` already
carries, and the contract records the base as a SHA rather than as a branch name. It becomes durable
— and is pushed — when the first task branch is integrated into it.
