# Integration note — `chore/i18n-dead-key`

**Why this file exists:** a branch that points at a *feature* branch and then waits is the kind of
thing nobody can explain a week later. This says what it is, why it hangs where it hangs, and what to
do with it.

| | |
| --- | --- |
| Branch | `chore/i18n-dead-key` |
| Commit | `a6a8bfd5` — *chore: remove the one dead catalogue key, and the exception with it* |
| Base | `feature/viewport-1280` @ `d3f65b43` |
| Worktree | `C:\Code\Autostich-worktrees\i18n-dead-key` |
| Gates at commit time | `npm test` 135 files / 2051 tests · `npm run lint -- --max-warnings=0` 0 warnings · `npm run build` · `npm run gen:db` — all green, all run in that worktree |

## Why it is not based on `dev`

The commit does two things that belong together: it deletes `gameover.best.hint` from both catalogues
(plus the regenerated translator CSV), and it removes the exception that carried that key in
`test/i18n-guards.test.js`. **That exception only exists on `feature/viewport-1280`** — it arrived
with the guard fix in `f598b3da` and has never been on `dev`.

Basing on `dev` would have split the change in half: the deletion there, the exception removal on the
feature branch, and a coordinated landing between them. Two halves that must meet is more failure
surface than a dead string is worth.

## Consequence

**It cannot go to `dev` on its own.** Its base carries six `#viewport-1280` commits, and merging it
early would drag them along before they are reviewed.

## The decision: keep it separate, integrate after

Deliberately **not** merged into `feature/viewport-1280`. That branch is reviewed against
`task-contract-T1b.md`, and this change appears in no part of that contract's expected file surface.
Folding it in would put an out-of-contract change inside that review's range — `/prepare-review`
checks scope compliance by object hash, so it would surface as a deviation, and the reviewer would be
asked to judge something no contract covers.

Order:

1. `#viewport-1280` finishes, is reviewed, lands on `dev`.
2. `d3f65b43` is then an ancestor of `dev`, so this branch merges or rebases onto it trivially.
3. Review this commit on its own terms — one commit, four files, no contract needed at that size.

## The one place the two branches touch

Both change `src/i18n/de.js` and `src/i18n/en.js`. Here: one deleted entry each, around line 185.
On the feature branch: comment prose carrying "ab 1400 px" forward. Different regions of the same
files, so a clean merge is expected — but this is the seam to look at if one is not.

## Not done here

- **Not pushed.** Awaiting authorisation; `AGENTS.md` — *House rules*.
- No pull request, no merge, no promotion.
