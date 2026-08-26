# MH1 — harness fixes · measurement record (`#menu-rework`)

**Task:** `MH1` · **Branch:** `task/menu-mh1-harness` · **Base:** `feature/desktop-menus` @ `631a0b4e`
**Deliverable shape:** this task moves no pixels, so it carries **no comparison set** — the noise-floor
result and the findings table, per the contract.

---

## Decision block

**Nothing to decide.** The contract opens with "there is nothing to decide at the start", and nothing
surfaced during the work that changed that. Both rulings this task executes were already taken:
MENU-38's ratchet at the freeze, and the no-state-axis decision by the owner on 2026-08-24.

One deviation is recorded rather than asked, under `AGENTS.md` — *Appending to an existing German
document*: the MENU-38 ratchet is written in **German**, because `test/panel-tokens.test.js` is 619
lines of German following a fixed template, and a single English block in the middle of it breaks the
template the rest of the file depends on. Everything else this task produced — both scripts, the new
guard file, this record — is English.

---

## 1. The acceptance gate: the noise floor

> **Same tree captured twice, 0 deltas.**

**PASS — the noise floor is still zero.** Two full survey runs over the unchanged tree at
`631a0b4e` + this task's diff, into separate output directories, compared with the rewritten
comparator:

```text
  compared 160 cells, 25027 matched nodes
  Surfaces only. Control states are not captured and are verified by hand.

  unmatched nodes: 0 pre-registered (H-c: leaderboard, victory), 0 elsewhere

  ZERO computed deltas on the four surface axes.
```

`exit 0`. Both runs reported **160 cells · 0 not reached**.

Three things are worth separating, because only the first is the gate:

1. **0 computed deltas over 25 027 matched nodes.** The property MENU-58 established survives this
   task. These changes could have broken it and did not — which is what makes a delta in a later
   round *the change* rather than *probably the change*.
2. **0 unmatched nodes, including on the two H-c surfaces.** Leaderboard and victory are *allowed* to
   differ between runs; on these two runs they did not. That is a stronger result than the gate asks
   for, and it is not something to rely on — the allowance exists for a reason.
3. **The blind-spot line is printed on the green run.** Visible in the transcript above. That is the
   whole of scope item 3, demonstrated rather than asserted.

---

## 2. Findings

| ID | Finding | Status |
| --- | --- | --- |
| **MH1-01** | `surface-delta.mjs` truncated **two** lists, not one: deltas at 200 and unmatched nodes at 40. Both printed `… and N more`, so the *quantity* was disclosed — but never *which*, and that is the half that mattered | **Fixed.** Both print in full; a census states the distribution |
| **MH1-02** | **The truncation was biased by construction, and the bias produced exactly MENU-55's false reading.** Cells sort `lang/size/surface`, so the first 40 of 80 cells are *all of `de`, all five sizes*, with `1920x1080` last inside that block. A cut at 200/410 (48.8 %) therefore lands mid-`de/1920x1080` — which reads as **"deltas only in German, a hole at 1920×1080"**. The false finding was not bad luck; it was the sort order | **Diagnosed.** Mechanism verified by reproducing the sort |
| **MH1-03** | **The MENU-38 family is twelve alphas, not seven.** The freeze ruling said seven; M2b found an eighth (MENU-44). Fresh measurement over `src/`, comments stripped: **64 literals, 12 distinct alphas** — `.07 .08 .10 .12 .13 .14 .16 .18 .22 .25 .30 .35`. Four were unrecorded by both: `.08` and `.30` (`index.css`), `.22` and `.25` (`StartScreen.jsx`, inline). The ruling's number was scoped to `.as-edge-*`; **the family is broader than the class that carries it** | **Measured.** Recorded in the ratchet's header |
| **MH1-04** | **The ratchet's starting count is 0 in every migrated unit** — and that is an *achieved* state, not an absent one. The workshop's single member (`.cz-fxrow`'s hairline) was collapsed onto `--ed-quiet` by M2b at a measured 3/255. Because the edge **is** one of the five axes, a literal in a migrated rule already fails the axis check; the ratchet's real coverage is `exemptFns` scenes, `stateLiterals`, and whole-file scope — precisely where the axis check is blind | **Built.** Counter-checked at that exact seam (CC-5) |
| **MH1-05** | A ratchet whose every cap is `0` is green for **two** indistinguishable reasons: nothing is there, or the detector broke. The ink ratchet is safe by its `> 40` sum; this one is not | **Answered.** A liveness check counts the family in the tree (`> 30`, measured 58 in `index.css`) |
| **MH1-06** | `scripts/phone-proof.mjs:481` elides `structuralBands` to the first three with **no total stated** — a genuinely silent summary, the same class as MH1-01 | **Reported, not fixed.** The phone strand's tool; outside this contract's file surface |
| **MH1-07** | `scripts/viewport-proof.mjs:328,353` cap `layoutDiffs` at 40 and 20 — but both write `layoutDiffCount` (the full length) alongside. They disclose the quantity | **No action.** Not silent |

### The gap this task deliberately does not close

**MENU-56 stands as a gap, and is now labelled instead of fixed.** The survey captures surfaces in
their resting state; no cell renders a segment control selected, hovered, focused or disabled. Owner
decision, 2026-08-24: a state axis pays off in the design rework, which will know which states carry
a decision. The sentence

> *Surfaces only. Control states are not captured and are verified by hand.*

now sits in `viewport-survey.mjs`'s header **and is printed by `surface-delta.mjs` on every run —
including the green one.** That second half is the load-bearing one: a gate that discloses its blind
spot only when it fails reassures precisely when it is trusted most.

---

## 3. What changed

| File | Change |
| --- | --- |
| `scripts/surface-delta.mjs` | Both caps removed; every list prints in full. A `census()` states the distribution of deltas by cell, language, size, surface and property, and of unmatched nodes by cell, surface and side. The blind-spot line is printed on every run |
| `scripts/viewport-survey.mjs` | Header only — the surfaces-only boundary, why it is deliberate, and MENU-56 |
| `test/panel-tokens.test.js` | MENU-38's ratchet: seven per-unit caps, a liveness check, and the inherited-total assertion. German, per the deviation noted above |
| `test/harness-honesty.test.js` | **New.** The guards for scope items 1 and 3 |

**Not touched:** any `src/**`, `test/typo-tokens.test.js`. Verified with `git diff --name-only`.
The tripwire held — the instrument moved, the subject did not.

### Why the truncation guard is behavioural

It builds two matrices with **288 deltas** across two languages, two sizes and six surfaces, runs the
real script as a child process, and demands all 288 back. A source-text check for `.slice(` would
have been cheaper and would have caught only the spelling that exists today. A second block does the
same for **60 unmatched nodes** against the old cap of 40 — guarded separately, because the delta
fixture produces no unmatched nodes at all, and a guard that never exercises a list cannot notice a
cap on it.

Both fixtures assert their own size first (`> 200`, `> 40`). A fixture under the cap would pass
whether or not the cap exists, which is the quiet way this kind of guard becomes decoration.

---

## 4. Counter-checks

Each seam broken deliberately, one at a time, guard confirmed red, then restored. `git status` clean
afterwards, and the full pair green again (50 tests across the two files).

| # | Seam broken | Result |
| --- | --- | --- |
| **CC-1** | `deltas.slice(0, 200)` reintroduced in `surface-delta.mjs` | **RED** — *EVERY delta reaches the output* |
| **CC-2** | `realUnmatched.slice(0, 40)` reintroduced | **RED** — *EVERY unmatched node reaches the output* |
| **CC-3** | The printed blind-spot line deleted | **RED** — 3 guards fell: the failed run, the green run, and the printed-line check |
| **CC-4** | The surfaces-only sentence removed from the survey header | **RED** — *viewport-survey.mjs carries the limitation in its header* |
| **CC-5** | `rgba(150, 150, 170, .18)` added inside `ScorchScene` — an `exemptFns` scene | **RED** — the ratchet and the inherited-total assertion fell. **The axis check did not**, which is the point: this is the seam only the ratchet watches |
| **CC-6** | `EDGE_NEUTRAL` narrowed to `rgba(150,150,170,…)` (no `\s*`) | **RED** — the liveness check alone fell, proving a broken detector cannot report all-zero silently |

CC-5 and CC-6 are the two that make the ratchet worth having. CC-5 shows it covers what the axis
check cannot see; CC-6 shows it cannot go quietly blind.

---

## 5. What M3 inherits

- **A comparator that withholds nothing**, and states its distribution so a long list cannot be
  misread as a pattern. `surface-delta.mjs` output can now be quoted as measured.
- **A gate that names its blind spot on every run.** Control states are *not* covered. Verify them by
  hand, or say plainly that they were not verified.
- **MENU-38's ratchet, starting at 0 for all seven migrated units.** M3 appends its file and its
  selector prefix to `CAP` exactly as it does for the ink ratchet. If M3's screen carries translucent
  neutral edges, the honest move is to **record the measured number, not zero it** — the ratchet only
  forbids growth.
- **The corrected family census: twelve alphas, 64 literals.** The successor workstream that migrates
  `.as-edge-*` (143 call sites) inherits a measured family, not an impression — and should know the
  ruling's "seven" was scoped to the class, not to the family.
- **MH1-06 open:** `phone-proof.mjs` still elides silently. Another strand's tool, and a one-line fix
  for whoever owns it next.
