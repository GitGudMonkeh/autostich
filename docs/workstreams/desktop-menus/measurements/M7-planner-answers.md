# M7 — the planner's two answers

**Written 2026-08-24**, answering the two questions M7 routed to the planner in `M7.md` §5. The three
owner questions are not answered here; they are the owner's.

---

## 1. The panel tint — §2c carries 9/5, the canon says 5/1

**This is not mine to decide, and saying so is the answer.** A tint is visible design; the canon is
where visible design is decided. What I can do is price it, so the decision is made against a number
instead of a feeling.

*Measured:* `--sf-deck` is defined once, at `src/index.css:321-322`, and read at **three call sites**
(`:4476`, `:5084`, `:5543`).

| | |
| --- | --- |
| **Cost of the change** | **One edit.** Two `color-mix` percentages |
| **Reach** | Three surfaces, all already approved — Options, the workshop, the tree |
| **Consequence** | Those three need a fresh owner look. Nothing else moves |

**This is the escape hatch working exactly as designed** — *a menu changes a token for everyone* —
and it is the first time the round has had occasion to use it. The mechanism has been in §2c since
the freeze and needed no preparation.

**Not M7's to fix, and it did right to route it.** The 9/5 has been shipping since M1; M7 merely
noticed that the canon has since said something else. A worker that quietly aligned a token to a
document its own contract does not cite would have changed three approved screens without anyone
deciding to.

**To the owner:** if the canon's 5/1 is meant to bind the built screens, say so and it is one edit
plus one look at three screens. If 9/5 is right where it ships, the canon's line wants a note that it
describes an intent the implementation deliberately differs from — otherwise the next worker asks
this again.

---

## 2. The state dependency of the `stats` cell — and the larger finding under it

M7 asked whether the `stats` cell's state dependency is a problem. The answer comes from its own
corrected M7-F01, which is bigger than the question:

> **The survey's cells are not independent. Run history accumulates across them** — 0 runs in the
> first cell, 9 in the last, because every `victory` cell writes one and nothing clears it.

**Ruling: this is comparable, and therefore not a defect — but it must be written down, because it
looks exactly like noise.**

It is comparable for a measured reason rather than a hopeful one: M7 ran **two independent full
surveys and got congruent results**. The accumulation is deterministic — same cell order, same play
path, same counts. A deterministic difference that appears in both halves of a comparison cancels.

**What it costs if unwritten.** A worker seeing `stats` differ between its baseline and its capture
has no way to tell *the code changed* from *the profile had three more runs by the time that cell was
reached*. That is the same class as the wall clock (MENU-30) and the stale bundle (M3-F09): a real
effect that presents as a regression.

**Required of the next harness task**, alongside the bundle check already outstanding:

> **Record the accumulated run count per cell in `matrix.json`.** A comparison can then subtract a
> known state difference instead of guessing at one. Cheap — the number is already in the profile the
> survey seeds.

**For every contract from here:** a task whose surface is state-dependent seeds the profile, **says
what it seeded**, and treats a delta on that surface as not-comparable until the seed is shown to
match. `stats`, `feedback`, `leaderboard` and `victory` are the four.

---

## Carried to the owner, not answered here

- **M7-F08 reaches the canon, not a screen.** The board is 1:1.375 on the desktop, not 1:2.2 — the
  2.2 is the 5:7 phone card, and from 640 px `CardTile` carries `sm:aspect-square`. A canon rule and
  the fix for the hole beneath the formation both rest on that figure, and the hole grew from 598 to
  691 px rather than closing. **This belongs to whoever maintains the design canon**, and this round
  does not reach into it. M7 built what it was commissioned to build and let the panel end at its
  content, because stretching would have meant a 1434 px frame around 748 px of content — which the
  canon's own §1 forbids. Commissioned work, canon-conforming result, finding filed.
- **Twelve handover captures were base64 text wearing `.png` names.** Found by looking at an image,
  not by a gate. The fourth instance of this repository's recurring shape — *the check asks whether
  something is there, never whether it is the right thing.* Belongs with the harness debt.
