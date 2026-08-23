# V4 — classification (`#typo-system`)

**Written:** 2026-08-23 · **Follows** the V3 human gate on the V1↔V2 comparison set.

**V3 verdict: passed by the owner**, on the before/after material in `evidence/v3/`
(150 pairs, plus six pre-rendered). The owner answered the End stop with a single word —
*"integration"* — which `task-lifecycle.md` §2 defines as the visual gate and the integration
authorization answered together.

**No agent reported the visual result as approved**, and this record does not claim otherwise. What
follows is the classification the lifecycle requires as a **required output** of that gate: every
finding in exactly one row, with an ID, so that none of it survives only in a chat message.

---

## Findings

| ID | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| **TYPO-01** | Some desktop headings render less heavy — the weight ladder pulled 24 CSS declarations and 92 `<b>`/`<strong>` elements from 700/800 to 600 | **Expected platform behaviour** | Pre-registered before the work started (planning report §8.1d Q2b). No fix |
| **TYPO-02** | 41.9 % of menu text changed size by more than 5 % | **Expected** | The agreed consequence of ratio 1.2 (§8.1c Q8b). Predicted ~42 %, measured 41.9 %. No fix |
| **TYPO-03** | Worst-case displacement is **28.6 %** (7 px → 9 px), against a predicted 10 % | **New design question** | The §3.1 fit covered the 9–27 px band only; sub-9 px text was never in it but is migrated into `--text-micro` anyway. Backlog: should the micro band keep a step below 9, or is 7 px text a defect in its own right? Input to the menu-and-panel rework |
| **TYPO-04** | Overflow at 1280×720 grew by ~28 nodes (de 402→430, en 401→426); truncation +1/+4 | **New design question** | Accepted by the owner (§8.1d Q11b). Handed to the menu-and-panel rework as its input list. Not fixed here — §5 non-goal 7 |
| **TYPO-05** | Large pre-existing overflow: 147 nodes on the end screen, 157–170 on the glossary, at **every** viewport, **before** any typography change | **Pre-existing, out of scope** | Recorded in the V1 baseline. Backlog for the rework. This is why V1 is taken before the first edit — without it TYPO-04 and TYPO-05 would be indistinguishable |
| **TYPO-06** | Weight **450** renders on 108 nodes (`.ty-num-sm`, the wordmark), outside the documented 400/500/600 ladder | **Pre-existing, out of scope** | Predates this workstream; the `#typo` pass introduced both the ladder and the 450. Backlog: either the ladder has four rungs or `.ty-num-sm` moves |
| **TYPO-07** | `ArchitectScreen` has **no root class** — its outermost node is `fixed inset-0 overlay-root z-20`, which every overlay shares | **New design question** | Found in S0 when a survey marker had to fall back to a tutorial hook. Backlog; cheap to fix in any task that already edits the file |
| **TYPO-08** | The global leaderboard's row **count** varies between runs (network data), so node counts are not reproducible there; sizes are stable | **Expected platform behaviour** | Documented in S0 §4.2 and honoured by S1's gate. No fix; any future comparison must match nodes by path and treat an absent path as not-comparable |
| **TYPO-09** | 168 size utilities on screens the survey cannot reach carry **no machine check** — `DeckDetail` (20) and `BuildSummary` (19) are the largest | **Pre-existing, out of scope** | The written downgrade record from S0 §5.1. Compensation was human review at V3; those screens are in the comparison set |
| **TYPO-10** | The `-N` provisional variants remain at every call site instead of the seven clean role names | **Expected** | Not a shortfall but an arithmetic necessity: a class renders one size, and the variants differ on the phone. Resolved by having them resolve *through* the role token on desktop. Documented in `conventions.md`; a later mobile strand deletes them |

**Only "Defect in this task" returns as work in this task. There are none.**

---

## Downgrade record — the S1 independent review was not run

`task-lifecycle.md` §11: *a reduced acceptance criterion needs a downgrade record.* This is it.

**What was reduced.** `task-contract-S1.md` requested an **independent technical review**, and the
reason it gave was specific rather than ceremonial: a 884-site mechanical substitution has a defect
mode — one wrong token at one call site — that neither the suite nor a screenshot reliably catches.

**What happened.** The owner directed the work straight from S1 to S2. That is a priority decision
and the owner's to make (`AGENTS.md` — *Decision authority*), and `AGENTS.md` — *Independent review*
is explicit that review is optional and risk-based and that **a missing review does not block
integration** where none was run.

**What compensates, and it is not nothing:**

- The **zero-delta gate** covers the defect mode the review was asked to catch, on 26 405 nodes
  across 150 cells, by machine. A wrong token changes a computed size; that is exactly what the gate
  measures. This is stronger evidence than a reviewer reading a diff.
- **Phone geometry identical** on 2854 nodes, pixels sub-noise.
- Five ratchets handled and the sixth verified; a new guard with **six counter-checks**.

**What is genuinely uncovered:** the **168 utilities** of TYPO-09, where neither the machine gate nor
a reviewer looked, only the V3 comparison. If a wrong token is ever found in this migration, that is
where to look first.

---

## Added at integration, 2026-08-23

Merging `dev` (16 commits, the mobile-icons workstream) into the feature branch produced **no
conflicts** — which is precisely the case where a textually clean merge can be semantically wrong,
so it was measured rather than trusted.

| ID | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| **TYPO-11** | The victory screen's node set depends on **run outcome**, not just on layout: `"★ Neuer Rekord"` appeared in the post-merge run and not in V2, changing one node from weight 400 to 600 | **Expected platform behaviour** | The same class as TYPO-08 (leaderboard), but sourced from game state rather than the network. One node of 2609. Any future zero-delta comparison must expect it on that surface. No fix |
| **TYPO-12** | The `.ty-*`/token guard checked only `text-[Npx]` and **not the named scale** — a `text-xs` arriving from another branch would have passed silently | **Defect in this task** | **Fixed here.** `dev` still carried `text-xs` in `PerkSelect.jsx` where this branch had migrated the same line; the merge reconciled them, but only a manual grep proved it. A guard covering half the ways to write a size will eventually be wrong. Counter-checked |

**Post-merge verification:** 2609 nodes re-surveyed at 1280×720 against V2 — **one deviation, and it
is TYPO-11**. All four gates green on the merged tree (140 test files). The named-scale check finds
exactly ten occurrences left in the tree, all of them in the two exempt files or inside comments.
