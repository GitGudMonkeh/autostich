# Task contract — `tut-t9-einstieg`

**T9 · Tier C · the hub entry, the progress state and `design-sprache.md` §11.**

> **Thin by design.** The binding scope is
> [`../tutorial-plan/tasks/T9-einstieg-und-designdoc.md`](../tutorial-plan/tasks/T9-einstieg-und-designdoc.md),
> incorporated by reference. Where this file and the brief disagree, this file wins — it just says
> almost nothing, so there is nothing to disagree about.

## Identity

| | |
| --- | --- |
| **Branch** | `task/tut-t9-einstieg` |
| **Base** | `origin/feature/tutorial-sections` @ `557377d14778dd65906c26ed19b58b9456b73b9d` — the T1+T2 integration |
| **Owner** | repository owner (`AGENTS.md`, *Roles and source of truth*) |
| **Integrator** | Claude Code (same table) |
| **Reviewer** | none requested |
| **Concurrency** | one writer; sequential sessions may continue in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/tut-t9-einstieg` |
| **Branch checked out there** | `task/tut-t9-einstieg` |
| **Upstream** | none |
| **Preview port** | `5192` |
| **Server invocation** | `npm run dev -- --port 5192 --strictPort` |
| **Production-build preview** | `npx vite preview --port 5192 --strictPort --base /autostich/` — `--base` mandatory |

## Scope · Non-goals · Architecture · Inputs · Gate · File surface · Hazards · Done

**All of it: [`../tutorial-plan/tasks/T9-einstieg-und-designdoc.md`](../tutorial-plan/tasks/T9-einstieg-und-designdoc.md).**
Shared rules: [`../tutorial-plan/tasks/README.md`](../tutorial-plan/tasks/README.md).
Reasoning and measurements: [`../tutorial-plan/planning-report.md`](../tutorial-plan/planning-report.md).

## Ordering — T9 runs before T3–T8, deliberately

The plan put T9 last so §11 could describe what was built. It is being run **now**, after T1 and T2,
for two reasons recorded here so the deviation is not mistaken for drift:

1. **The section is built and unreachable.** Until the hub opens it, every judgement about it rests
   on screenshots. T9 turns it into something that can be used.
2. **T3–T8 are ~34 lessons of player-facing prose in two languages.** That is the owner's layer
   (`AGENTS.md` — *Decision authority*: what a player reads is a product decision). Writing all six
   sections before anyone has used the shell would be settling a product question by volume.

§11 loses nothing by this: it describes the shell, the beats, the card metrics and the tap-target
rule, all of which T1 has already settled and measured.

## Inputs T9 must read first — both are prior tasks' handoffs

| | |
| --- | --- |
| [`../tut-t1-shell/handoff.md`](../tut-t1-shell/handoff.md) | the measured numbers §11 must carry, and **hazard A's resolution**: 44 px is currently scoped to `.tut-card .as-actbtn`. §11 decides whether it becomes app-wide — and if it does, that scoped rule must be **deleted**, not left as a second home for the number. |
| T2's commit `a3a42d1b` | `src/game/storage.js` was left **untouched**. `loadTutorialDone`/`saveTutorialDone` are still exported and currently unused. The choice between reusing that key and adding a new one is T9's, and it is open question 2 below. |

## Open questions — T9 closes both

1. **The progress key.** Reuse `as_tutorial_done` or add a new one? Removing a key changes saved
   profiles; keeping a dead one is cheaper than a migration. Whatever is chosen, **state it**, and if
   `src/game/storage.js` changes, say so plainly in the handoff with the reason — a `src/game/` diff
   is exactly what tripwire 1 exists to make somebody look at.
2. **What dismisses the loud first-contact offer** (`StartScreen.jsx:180`,
   `!prof.hadCompletedRun && !tutorialDone`). With no reward and no gate (owner decision, question 3
   answered *nein*), "done" now means "read some lessons". A player who read two and left should
   probably neither be shouted at forever nor told they finished.

## What this task must NOT do

- **No reward, no gate, no wiring to the onboarding counter.** Owner decision. Reviving that chain
  would silently cut a new player's first six runs of SP *and* DP.
- **No content.** The two placeholder lessons stay as they are; T3–T8 replace them.
- **No desktop layout.** Owner decision 5 — after the menu rebuild.
- **Do not rewrite §1–§8 of `design-sprache.md`.** Append §11; adjust the title line and the document
  table, nothing else. The entry is **German** (`AGENTS.md` — *Appending to an existing German
  document*), and the deviation is noted where it is made.
