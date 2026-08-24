# Task contract — `tut-t1-shell`

**T1 · Tier C · the shell and the catalogue of the tutorial sections.**

> **This contract is deliberately thin, and that is the design.** The binding scope of this task is
> [`../tutorial-plan/tasks/T1-shell-und-katalog.md`](../tutorial-plan/tasks/T1-shell-und-katalog.md),
> incorporated here by reference. Copying it would create the second source of truth this entire
> workstream exists to avoid — and it would be the same mistake in a task document that H4 warns
> about in player text.
>
> `task-lifecycle.md` — *The task contract* — says the contract wins over a planning report. It still
> does: **where this file and the brief disagree, this file wins.** It just chooses to say almost
> nothing, so there is nothing to disagree about.

## Identity

| | |
| --- | --- |
| **Branch** | `task/tut-t1-shell` |
| **Base** | `origin/feature/tutorial-sections` @ `48fe06563a4eb0055eb6e9cdbe31452e70228e72` |
| **Owner** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Integrator** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Reviewer** | none requested (`AGENTS.md`, *Independent review*) |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/tut-t1-shell` |
| **Branch checked out there** | `task/tut-t1-shell` |
| **Upstream** | none — the branch deliberately does not track its base |
| **Preview port** | `5190` |
| **Server invocation** | `npm run dev -- --port 5190 --strictPort` |
| **Production-build preview** | `npx vite preview --port 5190 --strictPort --base /autostich/` — **the `--base` is mandatory** |

## Scope · Non-goals and tripwire · Approved architecture · Task-specific inputs · Acceptance gate · Expected file surface · Known hazards · Definition of done

**All of the above: [`../tutorial-plan/tasks/T1-shell-und-katalog.md`](../tutorial-plan/tasks/T1-shell-und-katalog.md)**,
which carries each of these sections by name. Shared rules that bind every task in the workstream:
[`../tutorial-plan/tasks/README.md`](../tutorial-plan/tasks/README.md). The reasoning and the
measurements behind them: [`../tutorial-plan/planning-report.md`](../tutorial-plan/planning-report.md).

Read all three before the first edit. The brief's §*Known hazards* A is the one most likely to be
resolved wrongly by accident.

## Open questions — carried into this task, not settled by it

1. **Staffing.** Owner and Integrator above are unfilled. A decision, not a derivation.
2. **The 44 px tap target reaches `ActionButton`** (`py-2.5` = 42 px today), used across the whole
   app. The brief's hazard A requires this to be either **scoped to the tutorial** or **escalated in
   the handoff** — never silently changed for everyone. Whichever you choose, T9 needs the answer for
   `design-sprache.md` §11.
3. **`test/tutorial.test.js:105`'s rule** — *"kein Tutorial-Text nennt eine Zahl direkt"* — must
   survive T2 deleting that file. T2's brief hands it here. If T2 has not landed yet, port it
   yourself rather than waiting.

## What this task must NOT do

Beyond the brief's non-goals, one boundary is task-local and worth stating twice because two workers
are running in parallel right now:

**Do not touch `src/ui/tutorial/`, the eight `data-tut` components, or `test/tutorial.test.js`.**
Those belong to `task/tut-t2-rueckbau`, which is running concurrently in
`C:/Code/Autostich-worktrees/tut-t2-rueckbau`. The only file both tasks have reason to open is
`MIGRATED` in `test/i18n-guards.test.js`: **you add two entries, T2 removes one.** Two separate
edits, never combined, and neither worker touches the other's line.
