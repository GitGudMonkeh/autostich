# Task contract — `tut-t2-rueckbau`

**T2 · Tier C · retiring the guided run.**

> **This contract is deliberately thin, and that is the design.** The binding scope of this task is
> [`../tutorial-plan/tasks/T2-rueckbau.md`](../tutorial-plan/tasks/T2-rueckbau.md), incorporated here
> by reference. Copying it would create a second source of truth — the same mistake in a task
> document that H4 warns about in player text.
>
> `task-lifecycle.md` — *The task contract* — says the contract wins over a planning report. It still
> does: **where this file and the brief disagree, this file wins.** It just chooses to say almost
> nothing, so there is nothing to disagree about.

## Identity

| | |
| --- | --- |
| **Branch** | `task/tut-t2-rueckbau` |
| **Base** | `origin/feature/tutorial-sections` @ `48fe06563a4eb0055eb6e9cdbe31452e70228e72` |
| **Owner** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Integrator** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Reviewer** | none requested (`AGENTS.md`, *Independent review*) |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/tut-t2-rueckbau` |
| **Branch checked out there** | `task/tut-t2-rueckbau` |
| **Upstream** | none — the branch deliberately does not track its base |
| **Preview port** | `5191` |
| **Server invocation** | `npm run dev -- --port 5191 --strictPort` |
| **Production-build preview** | `npx vite preview --port 5191 --strictPort --base /autostich/` — **the `--base` is mandatory** |

## Scope · Non-goals and tripwire · Approved architecture · Task-specific inputs · Acceptance gate · Expected file surface · Known hazards · Definition of done

**All of the above: [`../tutorial-plan/tasks/T2-rueckbau.md`](../tutorial-plan/tasks/T2-rueckbau.md)**,
which carries each of these sections by name. Shared rules that bind every task in the workstream:
[`../tutorial-plan/tasks/README.md`](../tutorial-plan/tasks/README.md). The reasoning and the
measurements behind them: [`../tutorial-plan/planning-report.md`](../tutorial-plan/planning-report.md).

Read all three before the first edit. This task's whole difficulty is the four guards in the brief's
table; read that table before touching a file, not after a red suite.

## Ordering — settled by the owner starting both tasks together

The planning report recommended T2 run early rather than last, and the contract for the planning task
carried that as an open question. *Observed:* the owner created this worktree and T1's in the same
breath. **T2 therefore runs in parallel with T1, not after it.** Recorded here so the question does
not get reopened mid-task.

## Open questions — carried into this task, and one of them is yours to close

1. **Staffing.** Owner and Integrator above are unfilled. A decision, not a derivation.
2. **The `tutorialDone` flag — you decide, and you must say which.**
   `loadTutorialDone` / `saveTutorialDone` live at `src/game/storage.js:701`. Either the new sections
   reuse the key or they get their own. **Removing a key changes saved profiles; keeping a dead one
   is cheaper than a migration.** T9 builds progress state on top of your answer, so it is a blocker
   for that task and not for this one. Put it in the handoff explicitly.

## What this task must NOT do

Beyond the brief's non-goals, one boundary is task-local and worth stating twice because two workers
are running in parallel right now:

**Do not create or touch anything under `src/ui/tutorial-sections/`.** That belongs to
`task/tut-t1-shell`, running concurrently in `C:/Code/Autostich-worktrees/tut-t1-shell`. The only
file both tasks have reason to open is `MIGRATED` in `test/i18n-guards.test.js`: **you remove exactly
one entry** — `src/ui/tutorial/TutorialOverlay.jsx` — **and T1 adds two.** Two separate edits, never
combined, and neither worker touches the other's line.

**`src/game/storage.js` is the one place this task may enter `src/game/`**, and only for open
question 2. Tripwire 1 exists so somebody looks at a `src/game/` diff: if you make one, **say so
plainly in the handoff with the reason**, rather than leaving a reviewer to find it and assume the
worst.
