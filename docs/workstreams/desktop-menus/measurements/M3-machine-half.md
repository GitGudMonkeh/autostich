# M3 — the machine half, produced after handoff

**Written by the planner, 2026-08-24.** M3-F09 handed off with this piece of its acceptance gate
missing: two stale preview servers made the survey reuse an abandoned bundle, and the agent could not
end them. This closes that debt.

## What was wrong, and what it cost

`viewport-survey.mjs` asks whether *something* answers on 5181 and reuses it. A stale server therefore
serves an abandoned bundle and the survey measures it without a word — the third instance of the
repository's recurring shape: **the check asks whether something is there, never whether it is the
right thing** (MH1's truncation, MENU-52 inside a guard, now this).

*Cleared by the planner:* PID 23076, holding 5181 since 17:19. A second server on 5189 (the owner's
preview, running since 01:02) was left alone and reported instead.

**M3's numbers were right; its run was incomplete.** The re-run reproduces the delta distribution
exactly and reaches **160 cells, 0 not reached**, where the stale run reached 158 with `architect` and
`victory` falling out. That is the failure the stale bundle produced: not wrong values, missing cells.

## The result

Baseline `evidence/M2b/after` → `evidence/M3/after`, full output in `evidence/M3/delta.txt`.

```
160 cells · 24 747 matched nodes · 5269 deltas
```

**Three surfaces moved. Every other surface: zero.**

| Surface | Deltas | Unmatched (before / after) | Reading |
| --- | --- | --- | --- |
| `upgrades` | 2811 | 120 / 130 | **M3's screen.** Expected |
| `guide` | 2410 | 160 / 160 | **The same screen.** See below |
| `options` | 48 | 0 / 0 | **Not M3's.** See below |

### `guide` is not a leak — it is a page inside the upgrade tree

*Measured:* `viewport-survey.mjs:105` reaches the guide as
`{ tile: 0 } → { .up-navrow, nth: 1 } → { .up-page-guide }`. It is **a page within the upgrade
screen**, wearing that screen's head, root and navigation column. A change to `.up-*` reaches it by
construction.

The unmatched counts confirm it rather than merely permitting it: **160 before and 160 after, exactly
balanced.** Nodes changed position; none disappeared. A screen that had lost content would show an
imbalance.

**Consequence for the plan — M5's scope shrinks.** The guide's *frame* is M3's and is now done. What
remains for M5 is the guide's *content* (`GuideOverlay`, marker `.gd-desk`), not its shell. §3.1 said
"Guide, 346 lines" as though it were a free-standing screen; it is not.

### `options` is the planner's own change, not M3's

48 deltas, **English only** — `en/1600x900` 30, `en/1280x720` 18, and zero in German. That is the
merge of `dev` into this branch, where `options.float.desc` took M1's redesign wording *and* dev's
FIERCE→NICE rename. A string of different length reflows its box; the properties bear it out
(`box[x]`, `box[y]`, `box[w]`, `box[h]`).

**Attributable to the merge commit, not to M3.** Recorded here so the next comparison does not
re-discover it as a mystery.

## What this task's gate now says

> Only the upgrade tree and the guide page it contains moved, plus one string the planner introduced.
> Every other surface: zero deltas, zero unmatched.

## Required of the next task that touches the harness

**The survey proves it is talking to the bundle it just built** — compare the served asset hash
against `dist/`, or start its own server and refuse an inherited one. Reusing a server is a
convenience; reusing it unverified is a silent wrong answer, and it has now cost one task its gate.
