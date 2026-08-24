# M2b — the workshop's contents · measurement record (`#menu-rework`)

**Task:** `M2b` · **Branch:** `task/menu-m2b-workshop-contents` · **Base:** `feature/desktop-menus` @ `4d16a5da`
**Deliverable shape:** planning report §5.2 — four parts, and the decision block the owner reads first.

---

## Decision block

**ANSWERED — owner, 2026-08-24. All three recommendations accepted.**

| | Decision |
| --- | --- |
| Q1 | The colour segments, the random-deck switch and the locked-tier box take the `--ctl-*` / `--sf-sunken` / `--ed-quiet` steps for their role |
| Q2 | The allowlist entry covers the **whole file**; the fifteen scene components are named individually as permanently outside the axes |
| Q3 | `.cz-fxrow` adopts `--in-tight` |

The file carries **67 axis literals** (measured, not inherited — see MENU-54), and they split cleanly
by *what the box is*. Four components draw the menu (`PacksView` 9, `PackDetail` 11, `FxView` 2,
`FxStage` 13 = **35**); **fifteen** — the block as put said *sixteen*, a miscount of the same tally —
draw the simulated game board and the objects standing on it (**32**).
Every number below was read back from a canvas in the built page at 1600×900, not estimated.

**Already decided, not asked** — eleven families sit **0–4/255** from the step for their role and are
taken: `#20202c`→`--ctl-face-on` (1), `#211f2e`→`--ctl-face-on` (3), `#3a3a46`/`#3a3a44`/`#3a3947`→
`--ctl-edge` (2/0/3), `#2a2836`/`#2a2a34` as edges→`--ed-quiet` (2/0), `#14131c` as a row surface→
`--sf-sunken` (4), `.is-sel`'s wash→`--ctl-chip` (3), `.cz-fxrow`'s hairline→`--ed-quiet` (3),
`.cz-detailcard`'s `14px`→`--rd-lg` (0). That is the ladder doing the job it was derived for.

### Q1 — Three widgets that are the Options screen written a second time

The colour toggles are a **segmented control**; the random-deck row carries a **switch** measuring
46×26 with a 20×20 knob — `.op-switch`'s exact geometry. Same widgets, different numbers:

| | Now | Step for the role | Δ | Sites |
| --- | --- | --- | --- | --- |
| segment, off half | `#16151f` · `#14131c` | `--ctl-off-alt` | **16** · **18** | 7 |
| segment, its frame | `#33324a` · ~~`#34324a`~~ | `--ctl-edge` | **8** | ~~6~~ **5** — MENU-49 |
| switch, off face | `#2a2836` | `--ctl-off` | **8** | 1 |
| switch, its knob | `#ffffff` | `--ctl-knob` | **13** | 1 |
| locked-tier box | `#1c1b24` · `#2e2d38` | `--sf-sunken` · `--ed-quiet` | **8** · **4** | 2 |

**Recommendation: adopt.** These are visible — the off half of a segment lightens by 16–18/255 — and
that is the point: two screens render one widget and disagree about it. `#33324a` and `#34324a` are
**one unit apart in the same file**, which is the disease this round is here to end. Rejected: keeping
them and recording the family as a gap. There is no gap — `--ctl-*` was ratified at the freeze as a
closed set of nine *because a control is not a panel*, and these are controls.

> **One row of this table was wrong, and it is corrected rather than left.** `#34324a` is not a
> segment frame; it is the effects **preview** box. There are five segment frames, not six, and the
> sixth value took `--ed-strong` — the step for *a framed panel* — at Δ10 rather than `--ctl-edge` at
> Δ8. Role over fit, which is the principle the recommendation itself rests on. MENU-49, Part 3.

### Q2 — What "the allowlist covers the whole file" means

The acceptance gate says the entry covers the file. The fifteen scene components are not menu boxes:
`#0b0a16` is the ground under a battlefield image, the three-stop gradients are the wash that lets the
demo card read against it, and `linear-gradient(180deg,#26304a,#141a28)` + `0 2px 9px #000a` is a
**playing card standing on the board**. The vocabulary's five axes dress panels; `--sf-ground` (`#141419`)
is the app's background and is 11/10/3 away. Converting them would change game art to match a menu
ladder.

**Recommendation: the entry covers the whole file, and the fifteen scenes are named — individually, by
component — as permanently outside the axes**, the shape §2c already uses for `PHASE_ACCENTS`. A
`hooks` region exempts everything it does not mention, silently; an enumerated list of names is louder
and narrower, and every name must match a real function or the guard fails. Rejected: leaving `hooks`
in place — that is the half-migration the gate forbids.

### Q3 — The effect rows' inset

`.cz-fxrow` pads `12px 12px 12px 13px` — three numbers, and the ladder has one rung for *a row*,
`--in-tight` (11 px). Measured on the effects tab at 1600×900: five rows, each **41.5 px** tall in a
list with 247 px of content in 247 px of room. Adopting costs **2 px of height per row** (41.5 → 39.5,
−10 px over five) and shifts the label **2 px left, 1 px right**. Nothing overflows; the list is not
scrolled at any of the five sizes.

**Recommendation: adopt.** Same move the owner accepted on the shell's panels (M2a Q1) and on Options
(M1 Q3). Rejected: `--in-snug` (13 px) — it means *an inner box*, and picking a rung by fit rather
than by role is how a ladder stops meaning anything.

*Not in this block, deliberately: the mechanism, the commit order, the acceptance viewports and the
axis caps are decided (contract, Approved architecture). No typography token is touched.*

---

## The vocabulary — did it hold?

> **Partly. Twenty-nine of the thirty-five menu literals had a step for their role. Six did not, and
> they are named rather than taken.**

This is the answer the contract asks for in handoff point 2, and it is a *no* with a number rather
than an impression. The six are three **state-colour pairs** — a surface and its edge, tinted to say
*on*, *unlocked* or *active* — plus a selection ring and a chip's label padding:

| ID | What has no step | Measured |
| --- | --- | --- |
| **MENU-46** | the **accent-tinted** state pair (`#1a1330`+`#9b82f0aa`, `#9b82f0`+`#b9a6ff`) | `--sf-deck`, the deck-tinted *panel* recipe, paints 22/255 away — and in the wrong hue: the row hard-codes violet while `--deck-a1` is the active deck's colour |
| **MENU-47** | the **unlock** state pair on the tier pills | `#6a4fb0` is 108/255 from `--ctl-edge`; it is a signal, not a control's chrome |
| **MENU-48** | the **affirmative** state pair (`#123a25`+`#2f7a4f`) | `--ctl-danger` + `--ctl-danger-wash` are the destructive pair. Transposed to `--ac-green` the recipe lands 15/15/7 away, so it is not the same recipe in another hue — there simply is no affirmative counterpart |
| **MENU-50** | a **selection ring** written as a shadow | `--el-glow-*` is reserved for the primary CTA by an explicit rule (`#ruhe`); spending it here would break the rule it exists to express |
| **MENU-51** | a **chip's label padding** (`py-[3px]`) | `--btn-pad-y` is 0.625rem — five times over; `py-0.5`/`py-1` are 2 and 4 |

**Nothing was minted and nothing was worked around at a call site.** Each of the six is enumerated in
`panel-tokens.test.js` — `stateLiterals`, `ELEV_EXEMPT`, `utilExempt` — so it cannot grow without
someone editing a list, and three counter-checks prove each list still points at something real. That
is MENU-38's shape applied five more times: *count it, do not coin it.*

---

## Part 1 — Baseline

**Named, not re-derived** — the contract's instruction, and this time it holds without a re-take.

The baseline is **`evidence/M2a/after-c2`**, M2a's post-change capture set. Its validity was checked
before the first edit:

```
git diff --stat ff766616..HEAD -- src/ scripts/ test/     (empty)
git diff --stat 1ef515dc..ff766616 -- src/ scripts/ test/ (empty)
```

The M2a merge changed no `src/`, `scripts/` or `test/` byte, and the one commit after it is docs-only.
**No byte of the captured tree differs from this task's base**, so the inherited set is the base tree
measured — and unlike M2a, this task did not have to re-take it.

**Why M2a's two reasons for re-taking do not apply here.**

1. *It could not see half the subject.* That was MENU-36, and M2a fixed it: `shop-fx` was added to the
   survey (`35e66fe5`) and `evidence/M2a/after-c2` is the first set that contains it. The effects tab —
   the larger half of this task's surface — is in the baseline.
2. *The clock.* H-c bites when the two halves straddle an ISO-week boundary. `4d16a5da` is dated
   **Mon 24 Aug 2026**, and the ISO week begins on Monday, so the baseline was taken on the *first day*
   of its week. Both halves of every comparison in this record therefore sit on the same side of the
   boundary with six days of margin, which is the condition H-c asks for. Verified rather than assumed:
   Part 2 reports the unmatched-node count and the `SPAN` paths the hazard names.

The image pairs use **`evidence/M2a/compare/after`** as the *before* half, for the same reason and with
the same check: it was rendered from this task's base tree.

---

## Part 2 — The zero-delta claim, and where it is made

**This task is one commit, so the claim it gates is scope containment rather than value preservation.**
M2a split its work so that "the conversion moves nothing" and "these four adoptions move exactly this
much" stayed two checkable claims. Here the two are not separable: of the eleven families taken without
asking, only three are *exactly* value-identical (`#2a2a34`→`--ed-quiet`, `#3a3a44`→`--ctl-edge`,
`14px`→`--rd-lg`); the rest move by 1–4/255 by design. A commit containing only those three would gate
a claim nobody doubts, and H-e forbids landing the widened allowlist ahead of the migration it verifies.

**The claim made here is therefore:** *the task moves the two workshop surfaces and nothing else, and
every value that moved is one of the steps the owner adopted.* Instrument:
`scripts/viewport-survey.mjs` with M1's surface probe, compared by `scripts/surface-delta.mjs`.
Geometry tolerance is zero.

```bash
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/M2a/after-c2 \
                               docs/workstreams/desktop-menus/evidence/M2b/after
```

**Result — the containment claim holds.**

| | |
| --- | --- |
| Cells compared | **160** — 16 surfaces × 5 sizes × 2 languages, **0 unreached** |
| Matched nodes | **25 027** |
| Unmatched nodes | **0**, on any surface — including the four H-c surfaces |
| Computed element deltas | **410** — `shop-fx` 360, `shop-packs` 50 |
| **Every other surface (14)** | **0** — architect, feedback, glossary, guide, hub, leaderboard, options, perk-choice, privacy, run-stage, skill-choice, stats, upgrades, victory |
| Token declarations differing in text | **0** |

**Zero unmatched nodes settles H-c without a re-take.** M1 lost a capture pair to the ISO week
ticking over (MENU-30) and M2a re-took its baseline rather than explain 72 box deltas. Here the node
sets are identical on all four state-dependent surfaces, which is the hazard's own test. The baseline
was *named*, as the contract asks, and the machine agrees it was safe to name.

The margin, stated rather than assumed: `matrix.json` carries no capture timestamp (`generated` is
`null` in both files), so the dating comes from the commit that landed the baseline —
**2026-08-24 10:39 +0200**, against this capture at **~12:00 the same day**. Both sit on Monday, the
**first day** of the ISO week, so the boundary is six days ahead of both halves rather than between
them.

**Zero token-text changes is a second, independent statement**, and it differs from M2a's run on
purpose. M2a saw one (`--sf-glass` entering the stylesheet, MENU-40) because it was that token's first
consumer. This task introduced **no token at all** — every step it uses already had live consumers
from M1's Options screen — so nothing entered or left the built stylesheet. The vocabulary was
*picked from*, never *added to*, and the built CSS says so.

### The noise floor, measured rather than assumed at zero

Every delta table in this workstream rests on an unstated premise: that a difference in the matrix
means a difference in the code. This task captured the **same tree twice** — `after` and `after-run2`,
two independent survey runs, fresh profile each time — and compared them with the same instrument:

```bash
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/M2b/after \
                               docs/workstreams/desktop-menus/evidence/M2b/after-run2
```

| | |
| --- | --- |
| Cells compared | **160** |
| Computed deltas | **0** — on all 16 surfaces |
| Unmatched nodes | **0** |

**The harness's noise floor is exactly zero**, so all 410 deltas above are attributable to the change
with no "is this run-to-run variation?" caveat left over — including the 230 fractional box deltas,
which are the class most likely to be doubted. The second run is committed as the evidence for this
claim; it was captured anyway for the image set, so the measurement cost nothing.

> **The printed report is not the whole report.** `surface-delta.mjs:140` prints its first 200 deltas
> and this task has 410. Read from the printed list, the evidence looked like *deltas in German only,
> and none at 1920×1080 on `shop-packs`* — a conclusion that would have gone straight into this record
> as a finding. Aggregated from the matrices with the script's own matching rule and no cap, every
> transition is in **all ten cells** of its surface, both languages. Recorded as **MENU-55**.

---

## Part 3 — Before / after comparison

### The 410, accounted for completely: 180 style, 230 box

**Thirteen distinct style transitions, and every one is a step this task adopted.** No `rd`, no `sh`,
no `bi`, `bw`, `bs`, `ol`, `op` or `cl` moved anywhere — the migration touched surface, edge and inset
and nothing else, which is what "picked a token" is supposed to look like.

| n | Transition | What it is |
| --- | --- | --- |
| 50 | `pd: 12px 12px 12px 13px → 11px 11px 11px 11px` | `.cz-fxrow` → `--in-tight` (5 rows × 10 cells) — **Q3** |
| 40 | `bc: … rgba(150, 150, 170, .13) … → … rgb(42, 42, 52) …` | the row hairline → `--ed-quiet`, in its four rarity variants |
| 20 | `bc: rgb(42, 40, 54) … → rgb(42, 42, 52) …` (top side) | the two footnote rules → `--ed-quiet` |
| 10 | `bg: rgb(42, 40, 54) → rgb(42, 42, 52)` | the eyebrow rule → `--ed-quiet` |
| 10 | `bc: rgb(42, 40, 54) ×4 → rgb(42, 42, 52) ×4` | the random-deck row's frame → `--ed-quiet` |
| 10 | `bg: rgb(20, 19, 28) → rgb(20, 19, 32)` | the random-deck row → `--sf-sunken` |
| 10 | `bg: rgb(42, 40, 54) → rgb(48, 48, 58)` | the switch face → `--ctl-off` — **Q1** |
| 10 | `bg: rgb(255, 255, 255) → rgb(242, 242, 244)` | the knob → `--ctl-knob` — **Q1** |
| 10 | `bc: rgb(52, 50, 74) → rgb(48, 45, 64)` | the effects preview frame → `--ed-strong` — **MENU-49** |
| 10 | `bg: rgba(255, 255, 255, .043) → rgba(255, 255, 255, .03)` | `.is-sel` → `--ctl-chip` |

**And all 230 box deltas are the arithmetic of one of them** — `--in-tight` on the effect rows:

| n | Box delta | Why |
| --- | --- | --- |
| 50 | `box[h] −2.00` | five rows × ten cells, each 2 px shorter — **exactly the cost put to the owner** |
| 30 | `box[h] −10.00` | the three containers above them lose 5 × 2 px |
| 100 | `box[y] −1 … −10`, ten of each | the staircase: each row shifts by an even amount as the rows above shrink, each row's painted child by one more (padding-top 12 → 11) |
| 50 | `box[x] +1.00` | the right-hand chip of each row moves **1 px right** — the right inset went 12 → 11 |

> **One prediction needs restating rather than defending.** Q3 said the label shifts "2 px left, 1 px
> right". The 1 px right is in the matrix, 50 times. The 2 px left is **not**, and not because it did
> not happen — `padding-left` measured 13 → 11 in the browser — but because the left-hand text is not a
> *painting* node, and the surface probe records only nodes that paint. The claim was right; half of
> it is outside what this instrument can see, and saying so is cheaper than implying the gate
> confirmed it.

### Nothing broke

Overflow, out-of-frame, truncation and page-scroll counts are **byte-identical on all 20 workshop
cells**, before and after, in both languages — the same check M2a ran, and the same result.

```
20 of 20 workshop cells byte-identical on all four counts
```

### What the gate could NOT see — and it is the biggest change the owner approved

**The segmented controls do not appear in any capture.** The survey reaches the effects tab (MENU-36,
M2a's fix) but lands on its *default* category and row, and a colour segment renders only for an
effect that has a colour mode. The pack detail's step arrows and its card-face chooser are the
`!inline` branch and do not render above 1280 px at all; the tier pills and the locked-tier readout
need a multi-tier pack that is not equipped.

So `--ctl-off-alt` (Δ**16–18**), `--ctl-face-on`, `--ctl-edge` on the segment frames, the arrows, the
tier pills and the locked box are **absent from all 410 deltas** — not because they did not change, but
because no cell renders them. That is MENU-36's shape one layer deeper, and it is recorded as
**MENU-56**. Those values were verified in the browser instead, in the table below, and the images in
`compare/` show the same default state the matrix does.

### Every number the decision block put to the owner, re-measured

**The contract added this section after MENU-43, and it earned its keep immediately** — one row of Q1
was wrong (MENU-49). Read back from the built page at 1600×900 **after** the change:

| Decision-block claim | Re-measured | Delta named |
| --- | --- | --- |
| Q1 · segment frame → `--ctl-edge` | `rgb(58, 58, 68)` = `#3a3a44` | as put: was `#33324a`, **8/255** — browser only, MENU-56 |
| Q1 · segment ON → `--ctl-face-on` | `rgba(32, 32, 44, .95)` | as put: was `#211f2e`, **3/255** — browser only |
| Q1 · segment OFF → `--ctl-off-alt` | `rgb(37, 37, 46)` = `#25252e` | as put: was `#16151f`, **16/255** — browser only |
| Q1 · switch face → `--ctl-off` | `rgb(48, 48, 58)` | as put: **8/255**; in the gate, 10 cells |
| Q1 · switch edge → `--ctl-edge` | `rgb(58, 58, 68)` | as put: **0** — and it produced no delta, which is the check |
| Q1 · knob → `--ctl-knob` | `rgb(242, 242, 244)` | as put: **13/255**; in the gate, 10 cells |
| Q1 · switch geometry | **46 × 26**, knob **20 × 20** | unchanged — no `box` delta on either node |
| Q1 · random row → `--sf-sunken` / `--ed-quiet` | `rgb(20, 19, 32)` · `rgb(42, 42, 52)` | as put: **4** · **2**; in the gate, 10 cells each |
| Q1 · locked box → `--sf-sunken` / `--ed-quiet` | not rendered in any cell | as put: **8** · **4** — MENU-56 |
| Q1 · `#34324a` is a segment frame | **wrong — it is the preview box** | **MENU-49**: 5 frames not 6; took `--ed-strong`, Δ**10**, not `--ctl-edge`, Δ8 |
| Q3 · row padding → `--in-tight` | `11px` on all four sides | as put: was `12/12/12/13`, 50 deltas |
| Q3 · row height 41.5 → 39.5 | **39.5** (last row 38.5) | as put: **−2 px** × 50 |
| Q3 · list content −10 px | **247 → 237 px** | as put, to the pixel; `box[h] −10.00` × 30 |
| Q3 · nothing overflows | 20/20 cells byte-identical | as put |
| Q3 · label 2 px left, 1 px right | 1 px right × 50; the left shift is not a painting node | **restated above**, not defended |
| Q2 · fifteen scene components | **fifteen**, 32 literals | the block first said *sixteen* — a miscount of the same tally, corrected here |

### What was NOT put to the owner and should have been — the phone

**Q1 quoted its deltas without saying that they also apply below 1280 px.** The three CSS rules this
task changes all sit inside `@media (min-width: 1280px)`, so the phone's stylesheet is untouched — but
the JSX inline styles apply at every width. Every converted value is **opaque**, so the painted delta
below 1280 px is the same number as above it; the one alpha token, `--ctl-face-on`, lands within
**3/255** of the old value over any ground the phone puts behind it.

The phone therefore moves by: segment off half **16–18**, segment frame **8**, switch face **8**, knob
**13**, locked box **8/4**, preview frame **10**, and the ≤4 families. M2a put exactly this question to
the owner for two values (its Q3, "everything below 1280 px is owner decision 9, which is why this is
asked rather than decided"); this task did not, and that is an omission in the block rather than in
the work. Recorded as **MENU-57** and named at the End stop rather than left in the images.

### The pairs the owner pages through

`evidence/M2b/compare/{before,after}` — **28 images per side**: the two surfaces this task touches,
five sizes, both languages, plus DPR 2 at 1280×720 and 1920×1080. Same harness, same seeded state
(`muted: true`, telemetry off, effects minimal, seeded name), animations pinned to time zero, fonts
awaited, one session.

**The `before` half is not a re-render — it is M2a's `compare/after`, the same 28 files.** Verified by
checksum: the two directories hash identically, so git stores one set of blobs and the copy costs tree
entries only. That is stronger evidence than re-capturing the base tree would have been — with the
identical files there is no re-render drift to argue about, and Part 1 already showed that no `src/`
byte differs between M2a's capture and this task's base.

> **An agent does not report a visual result as approved.** The pairs go to the owner at the End stop,
> with the ten style transitions named, the corrected `#34324a` (MENU-49) stated rather than left in
> the images, and the two things the images **cannot** show called out: the segmented controls that no
> cell renders (MENU-56) and the phone cost Q1 did not quote (MENU-57).

### Every number the decision block put to the owner, re-measured

**The contract added this section after MENU-43, and it earned its keep immediately** — one row of Q1
was wrong (MENU-49). Read back from the built page at 1600×900 **after** the change:

| Decision-block claim | Re-measured | Delta named |
| --- | --- | --- |
| Q1 · segment frame → `--ctl-edge` | `rgb(58, 58, 68)` = `#3a3a44` | as put: was `#33324a`, **8/255** |
| Q1 · segment ON → `--ctl-face-on` | `rgba(32, 32, 44, .95)` | as put: was `#211f2e`, **3/255** |
| Q1 · segment OFF → `--ctl-off-alt` | `rgb(37, 37, 46)` = `#25252e` | as put: was `#16151f`, **16/255** |
| Q1 · switch face → `--ctl-off` | `rgb(48, 48, 58)` = `#30303a` | as put: was `#2a2836`, **8/255** |
| Q1 · switch edge → `--ctl-edge` | `rgb(58, 58, 68)` | as put: **0** |
| Q1 · knob → `--ctl-knob` | `rgb(242, 242, 244)` | as put: was `#ffffff`, **13/255** |
| Q1 · switch geometry | **46 × 26**, knob **20 × 20** | unchanged, as stated |
| Q1 · random row → `--sf-sunken` / `--ed-quiet` | `rgb(20, 19, 32)` · `rgb(42, 42, 52)` | as put: **4** · **2** |
| Q1 · `#34324a` is a segment frame | **wrong — it is the preview box** | **MENU-49**: 5 frames not 6; took `--ed-strong`, Δ**10**, not `--ctl-edge`, Δ8 |
| Q3 · row padding → `--in-tight` | `11px` on all four sides | as put: was `12/12/12/13` |
| Q3 · row height 41.5 → 39.5 | **39.5** (last row 38.5) | as put: **−2 px** per row |
| Q3 · list content −10 px | **247 → 237 px** | as put, to the pixel |
| Q3 · nothing overflows | `scrollHeight === clientHeight` (237/237) | as put |
| Q2 · fifteen scene components | **fifteen**, 32 literals | the block first said *sixteen* — a miscount of the same tally, corrected here |

---

## Part 4 — Findings

One row per observation, with an ID and a disposition. Four dispositions, and **only the first returns
as work in this task**: *Defect in this task* · *Expected* · *Pre-existing, out of scope* ·
*New design question*.

| ID | Observation | Disposition |
| --- | --- | --- |
| **MENU-44** | **MENU-38's ratchet was ruled at the freeze and never implemented — and this region needed it zero times.** The freeze says `panel-tokens.test.js` "counts translucent-edge literals per migrated file and fails on growth"; `4d16a5da` is docs-only and the guard has no such counter. It did not block this task, and the reason is worth recording: the workshop's single member of that family is `.cz-fxrow`'s hairline, whose **role** is the definition of `--ed-quiet` — "a divider inside a panel". Measured over the panel fill: **3/255**. It collapsed onto the step, exactly as M2a's two did at 9 and 8. **The family is also larger than recorded:** `.13` is an *eighth* alpha, beside the seven MENU-38 lists. | **Pre-existing, out of scope** — ratchet still unbuilt; hand to the planner with the corrected alpha count |
| **MENU-45** | **Guard membership, measured: this diff breaks none of them.** H-a named `cz-ruhe`, `shop-scale` and `fx-panel` as candidates. All three pass **unmodified**, and the reason is that M1 and M2a had already rewritten them to invariants: `fx-panel` resolves `.cz-stage`'s radius *through the vocabulary* before asserting 14 px, and `cz-ruhe` asserts `border-bottom: 1px solid` without naming a colour. A guard written to the invariant survives the migration it was written before. The third measurement in a row where the answer was fewer guards than predicted. | **Expected** — measured, nothing rewritten |
| **MENU-46** | **The accent-tinted state pair has no step, and the workshop disagrees with itself about its colour.** `#1a1330` + `#9b82f0aa` (row) and `#9b82f0` + `#b9a6ff` (switch) are a surface and its edge, tinted to say *on*. `--sf-deck`/`--ed-deck-panel` are the deck-tinted **panel** recipe (9/5 % over glass, 26 % border) and paint 22/255 away. Separately and pre-existing: this row hard-codes **violet**, while every other on-state on the screen writes `var(--deck-a1, #9b82f0)` — with a cyan deck equipped the row is the one control that does not follow it. | **New design question** — planner |
| **MENU-47** | **The tier pills' unlock pair has no step.** `#1a1330e6`/`#0a0a12e6` with `#6a4fb0`/`#33313f`. The unlocked edge is **108/255** from `--ctl-edge`: this is a signal colour, not a control's chrome, and the five axes do not rank signals. | **New design question** — planner |
| **MENU-48** | **`--ctl-*` has a destructive pair and no affirmative one.** `--ctl-danger` (edge) and `--ctl-danger-wash` (wash) are two of the ratified nine. The workshop's "läuft gerade" readout is the same shape in green — `#123a25` + `#2f7a4f` — and there is nothing to take. Measured: the danger recipe transposed to `--ac-green` paints **15/15/7** away, so it is not one value written twice; it is a missing member of a pair the vocabulary already half-has. The closest thing to a real gap this task found. | **New design question** — planner |
| **MENU-49** | **A row of the decision block was wrong, and the owner acted on it.** Q1 listed `#34324a` as a sixth segment frame. It is the **effects preview box** — there are five segment frames. The value took `--ed-strong` (the framed-look step, Δ**10**) rather than the `--ctl-edge` the block named (Δ8), because role beats fit and the block's own argument says so. **MENU-43's shape on the very next task**, which is why Part 3 re-measures the block: the error was again in the half nobody re-checks after a yes. | **Defect in this task** — corrected, decision unaffected |
| **MENU-50** | **A selection ring is not on the elevation axis.** `.cz-shown` paints `0 0 0 2px var(--c), 0 0 18px -6px var(--c)`. The first half has neither blur nor spread — it is a **border written as a shadow** so the tile does not grow, the same distinction the guard already draws for `inset`. The second half is a glow, and `--el-glow-*` is reserved by `#ruhe` for the primary CTA "and nothing else"; this marker colours itself with `--c`, the tile's rarity, not with a CTA's signal. Exempted by name, not by pattern, and counter-checked in both directions. | **New design question** — planner |
| **MENU-51** | **A chip pads against two roman numerals, and nothing fits.** `px-1 py-[3px]` on the tier pill. §2c leaves label padding outside the ladder deliberately, and the tokens that *do* live outside it are five times too large (`--btn-pad-y` = 0.625rem). The named Tailwind steps bracket it without hitting it (2 and 4). Named rather than rewritten: moving a pill 1 px, on an element that also renders below 1280 px, is a change nobody asked for. | **New design question** — planner |
| **MENU-52** | **H-b, the fifth time in this repository, and this time in the guard's inline reader.** The check asked `!/var\(/.test(val)` — *does a token appear* — instead of *does a literal still stand beside one*. `` border: `1px solid ${on ? "var(--deck-a1, #9b82f0)" : "#2a2836"}` `` therefore read as clean. Measured: **3 hidden call sites in `CustomizeScreen.jsx`, 0 in the other three migrated files**, so the hole had never bitten before and would have bitten exactly here. The reader now strips `var()` **fallbacks** — the CSS side's own `withoutFallbacks` — and then asks what literals remain. After TYPO-12, MENU-15, MENU-29 and MENU-33/34: *a guard that asks whether the good thing is present is not asking whether the bad thing is.* | **Defect in this task** — fixed, counter-checked |
| **MENU-53** | **Two thirds of this file's "menu" literals are not menu.** 32 of 67 draw the simulated board: the ground under a battlefield image, the wash over it, a playing card standing on it, and the chrome chip the stage lays over the artwork. They were counted as migration debt by every tally this workstream has made, including the one in M2a's allowlist comment. They are not debt; they are a different subject, and the acceptance gate is met by *guarding* the whole file rather than by *converting* all of it. | **Expected** — named in the guard, owner-approved (Q2) |
| **MENU-55** | **The gate's report is capped at 200 and this task produced 410.** `surface-delta.mjs:140` prints `deltas.slice(0, 200)` and appends "… and N more". Read from that list, the evidence said *every delta is German, and `shop-packs` has none at 1920×1080* — a striking asymmetry that would have been written up as a finding. It is an artefact of the cap: aggregated from the matrices with the script's own matching rule, all thirteen transitions appear in **all ten cells** of their surface. The script is correct and its summary line is honest; the trap is that the printed body reads like the whole set. **The first task in this round large enough to hit it.** | **Pre-existing, out of scope** — no change made; named so the next worker over 200 deltas does not read a sample as a census |
| **MENU-56** | **The capture cannot see the largest change the owner approved.** The survey opens the effects tab (MENU-36) but lands on its default category and row, and a colour segment renders only for an effect that *has* a colour mode. The pack detail's arrows and card-face chooser are the `!inline` branch — they do not render above 1280 px at all. The tier pills and the locked-tier readout need an unequipped multi-tier pack. So `--ctl-off-alt` (Δ16–18), the segment frames, the arrows, the pills and the locked box produce **zero of the 410 deltas**. MENU-36 one layer deeper: it is no longer *which tab*, it is *which state within the tab*. Verified in the browser instead, and stated as such rather than implied by the gate. | **New design question** — planner: a state axis for the survey |
| **MENU-57** | **Q1 quoted its deltas without saying they also apply below 1280 px.** The three CSS rules land inside `@media (min-width: 1280px)`, but the inline styles do not: every converted value is opaque, so the phone moves by the same numbers — segment off half 16–18, knob 13, switch face 8. M2a asked the owner about exactly this for two values, on the ground that "everything below 1280 px is owner decision 9". This block did not. The work is unchanged and defensible; what was missing was the sentence naming who the change reaches. Named at the End stop rather than left in the images. | **Defect in this task** — omission in the block, surfaced to the owner |
| **MENU-58** | **The harness's noise floor is zero, and nobody had measured it.** Every delta table in this workstream assumes a matrix difference means a code difference. This task captured the same tree twice — two independent survey runs, fresh profile each — and compared them: **0 deltas, 0 unmatched, across 160 cells**. The 230 fractional box deltas in Part 3 are therefore attributable to the change rather than to run-to-run variation, which is the class of delta most open to doubt. It cost nothing: the second run was needed for the image set anyway. Worth keeping as a standing check whenever a task's delta count is large enough to argue about. | **Expected** — measured, recorded for the round |
| **MENU-54** | **The handover count was off by one on both halves.** M2a's allowlist comment records "68 Literale ... 66 davon" for this file. Measured with the guard's own readers: **69** at M2a's base (`308ab5ae`) of which **2** were the shell's, and **67** at M2b's base after M2a converted its two. That comment is superseded by M2b's own — which states the measured 67 and the 32/35 split — so the wrong pair no longer stands anywhere; it is recorded here because a measured claim inside a guard is exactly what the next worker inherits as a fact. | **Defect in this task** — superseded, measured numbers recorded |
