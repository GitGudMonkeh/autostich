# Task contract — zh-hans-sample

Tier **C**. It hangs under the `feature/zh-hans` integration branch, alongside `task/zh-hans-plan`
(`task-lifecycle.md` — *Tier C*, `git-workflow.md` — *Multi-agent feature integration branch*).

Scaffold produced by `/create-task`. Every `TODO` below is a decision, not a formatting gap: the
setup command fills only what it can derive and leaves the judgement to a human
(`AGENTS.md` — *House rules*).

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/zh-hans-sample` |
| Base | `feature/zh-hans` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Owner | TODO — assign (`AGENTS.md` — *Roles and source of truth*) |
| Integrator | TODO — assign before integration (`AGENTS.md` — *Roles and source of truth*) |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |

No reviewer row: no independent review was requested at setup. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

The base is durable. Unlike at `task/zh-hans-plan` setup time, `origin/feature/zh-hans` now exists on
the remote and points at this exact SHA, which is also the source commit the sample order quotes.

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `C:/Code/Autostich-worktrees/zh-hans-sample` |
| Branch checked out there | `task/zh-hans-sample` |
| Upstream | none — the branch deliberately does not track its base |
| Preview port | 5198 |
| Preview URL | http://localhost:5198 |
| Server invocation | `npm run dev -- --port 5198 --strictPort` |

**Note on the port.** `create-task` step 8 allocates the lowest free integer from 5181 upward across
the reserved table in `NEW_MACHINE_SETUP.md` (5173, 5180) and
`grep -rn "Preview port" docs/workstreams`. Run in the cockpit checkout that grep sees only up to
5189, because the ledger is per-branch while the ports are not. Measured across the unmerged
branches: `task/spanish-locale` records up to 5196 and `task/zh-hans-plan` records 5197. 5198 was
allocated instead of the cockpit-only answer, and the deviation is recorded here rather than left to
surface as a `--strictPort` failure. This repeats the deviation `task/zh-hans-plan` already
documented; the allocation algorithm has a known blind spot across branches.

## Scope

TODO — the parts, in the order they must happen. The delivered sample translation and the two
rendering findings it produced are the material this task starts from; what of it is in scope is a
decision, not a derivation.

## Non-goals and tripwire

TODO — what is out of scope, and the signal that a rejected approach has crept back in. Note that
`task/zh-hans-plan` carries its own non-goals and tripwires, and that contract binds its own branch,
not this one.

## Approved architecture

TODO — binding statements. In particular whether this task may touch shared UI rendering, given
`task/zh-hans-plan` tripwire 3 reserves the i18n seam for `task/spanish-locale`.

## Task-specific inputs

TODO — name the inputs the work is measured against.

## Acceptance gate

TODO — the single criterion that decides success or failure.

## Expected file surface

TODO — the indicative file list, and the must-not-touch files named explicitly so scope compliance is
verifiable by blob hash rather than by inspection (`task-lifecycle.md` — *The task contract*).

## Known hazards

TODO — each hazard must be resolved before handoff (`task-lifecycle.md` §10).

## Definition of done

TODO — checkboxes, ticked only when true.

## Open questions

TODO — the blocking ones first, each with a recommended answer so that silence is an answer
(`task-lifecycle.md` — *Tier B — feature workstream*, decision block).
