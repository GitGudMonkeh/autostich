# M2a — the workshop's shell · measurement record (`#menu-rework`)

**Task:** `M2a` · **Branch:** `task/menu-m2a-workshop-shell` · **Base:** `feature/desktop-menus` @ `308ab5ae`
**Deliverable shape:** planning report §5.2 — four parts, and the decision block the owner reads first.

---

## Decision block

**ANSWERED — owner, 2026-08-24. All three recommendations accepted.**

| | Decision |
| --- | --- |
| Q1 | The shell's two panel insets go 14/16/12 px → `--in-base` (18) |
| Q2 | The head's vertical divider adopts `--ed-quiet` |
| Q3 | The two inline values become tokens; two `!important`s fall, and the phone moves by ≤ 2 and 8 /255 |

The questions as they were put, for the record. Each cost was **measured before it was asked** —
rendered in a browser and read back from a canvas, not estimated.

### Q1 — Two panel insets against one rung

The catalogue scroller (`.cz-mainscroll`) and the effects stage (`.cz-stage`, `.cz-fxside`) both pad
`14px 16px 12px` — three numbers on four sides. The ladder has exactly one rung for *a panel*:
`--in-base`, 18 px.

Measured at 1280×720 from the baseline capture: the catalogue is 636 px wide, so its six tiles lose
**0.7 px of width each**. The stage loses **10 px of height**, which its preview absorbs — the preview
is `flex: 0 1 auto` on an `aspect-ratio`, built to shrink on flat windows. No overflow at any of the
five sizes.

**Recommendation: adopt.** It is the same move the owner accepted on the Options panels (M1, Q3,
16 → 18), and it stops the panel being the one box on the screen whose padding is three numbers.
Rejected: `--in-snug` (13 px) is closer to today but its rung means *an inner box*, not a panel — that
would pick a step by fit rather than by role, which is how a ladder stops meaning anything.

### Q2 — A divider that was written as a translucency

`.cz-readout`'s left border is `rgba(150, 150, 170, .18)`. Over the head it paints **[49, 48, 61]**.
`--ed-quiet` — "a divider inside a panel", exactly this role — paints **[42, 42, 52]**. Nine units
apart on one 1-px vertical line in the head.

The translucent spelling is not a decision anybody made for the workshop: the head was taken *1:1 from
`.up-head`* (the rule says so), and the value came with it.

**Recommendation: adopt the step.** Rejected: proposing a translucent-edge token and spending the
extension window on it. `rgba(150, 150, 170, …)` is a **family of seven alphas** across the
`.as-edge-*` role classes, and this round does not migrate those. Opening one step of it from inside
the workshop would put a value in the frozen vocabulary that the workshop does not get to decide —
recorded instead as MENU-38, the same shape as MENU-26 for ink.

### Q3 — Two values that are read at every width

The overlay wash (`#0c0c10ee`) and the hairline under the effects stage (`#23222e`) were set **inline
in the JSX**. An inline *literal* beats every stylesheet rule, which is precisely why the 1280 block
had to shout `!important` at both. An inline `var()` does not — the rule redefines the property on the
element and the cascade stays intact.

Converting them means the value below 1280 px becomes the token's. Measured cost, **phone only**:

| | Was | Becomes | Delta |
| --- | --- | --- | --- |
| the wash | `#0c0c10ee` (α .933) | `--sf-scrim-desk` (α .94) | **≤ 2/255**, against the brightest ground the hub can put behind it |
| the hairline | `#23222e` | `--ed-quiet` `#2a2a34` | **8/255**, on one 1-px line |

Above 1280 px **nothing changes**: the desktop already painted `.94`, and the desktop already sets the
stage's border to 0. "Everything below 1280 px" is owner decision 9, which is why this is asked rather
than decided.

**Recommendation: convert.** Two `!important`s go with it, and the extension window closes with
"nothing was missing" instead of with two tokens that differ from existing ones by 2 and 8 /255 —
which is the disease this round is cleaning up, not the cure. Rejected: `--sf-scrim-alt` +
an edge token (§ *The extension window* below).

*Not in this block, deliberately: the mechanism, the commit order, the acceptance viewports and the
axis caps are decided (contract, Approved architecture). No typography token is touched.*

---

## The extension window — the written answer

> **Nothing was missing.**

M2a holds the round's one extension request and **does not use it**. That is a claim, so here is what
it rests on. Every surface, edge, elevation, radius and inset in the shell was listed, and for each
one the question was *does the vocabulary have a step for this box's ROLE* — not *does it have this
exact number*.

| Shell value | Role | Step | Delta |
| --- | --- | --- | --- |
| overlay wash | the full-screen wash | `--sf-scrim` → `--sf-scrim-desk` | 0 desktop, ≤2/255 phone |
| head fill | a sticky head that runs out | `--sf-head-fade` | **0** |
| the four panels' fill | a panel above 1280 px | `--sf-glass` | **0** |
| the four panels' radius | a panel | `--rd-lg` | **0** |
| card's outer corner | the overlay shell | `--rd-shell` | **0** |
| card / wrapper elevation | a panel at rest | `--el-flat` | **0** |
| close button radius | a button | `--rd-sm` | **0** |
| head divider | a divider inside a panel | `--ed-quiet` | 9/255 |
| stage hairline (phone) | a divider inside a panel | `--ed-quiet` | 8/255 |
| the two panel insets | a panel | `--in-base` | +4/+2/+6 px |

**No box in the shell lacked a step for its role.** Four values differed from their step by 2–9/255,
and that is what a ladder is *for*: §2c derives its steps by counting call sites precisely because the
tree wrote the same thing down twice in unrelated places. Two of the four are exactly that —
`#0c0c10ee` is `--sf-scrim-desk` written again, and the head's translucent divider composites to
within nine units of `--ed-quiet`.

**The alternative, and why it was rejected.** Two extensions were genuinely available:

- `--sf-scrim-alt: #0c0c10ee` — a second phone wash. §2c's phone clause even pre-authorises the
  *shape* ("where the tree has two values for one role below 1280, the vocabulary keeps both — that is
  what `--ctl-off` and `--ctl-off-alt` are"). Rejected because those two are **1.7/255 apart**: this is
  one value written twice, not two values. A third wash beside `--sf-scrim` (.8) and `--sf-scrim-desk`
  (.94) would put a near-duplicate into a frozen ladder, which is how 43 shadows happen.
- an edge token for `#23222e` — rejected for the same reason, 8/255 from a step whose *definition* is
  this exact role.

**What was named instead of taken.** Two real gaps, recorded rather than hidden, both belonging to the
planner and neither the workshop's to open:

- **MENU-38 — the neutral translucent edge.** `rgba(150, 150, 170, …)` at seven alphas across 15+
  rules, carried by the `.as-edge-*` role classes. The ladder's edges are all opaque. This is a family
  and it belongs to whoever migrates those roles.
- **MENU-39 — the deck hairline written twice**, with its two fallbacks mirrored.

**If the planner disagrees with the reading, the request to file is `--sf-scrim-alt`.** It is named
here so the window can still be spent by decision rather than reopened by accident.

---

## Part 1 — Baseline

**Named, not re-derived, and then re-taken on purpose.**

The contract names *M1's post-change capture set* (`evidence/M1/after-c2b`). Its validity was checked
before the first edit:

```
git diff --stat 159e198a..308ab5ae -- src/ scripts/ test/
 (empty)
```

The base commit is M1's merge plus one docs-only commit, so **the inherited set is valid** — no `src/`
byte differs between the capture and this task's base.

**It is still not the baseline this task uses, and that is deliberate.** Two reasons, both measured:

1. **It cannot see half the subject.** The survey's `shop-packs` surface lands on the workshop's
   default tab. `.cz-stage` and `.cz-fxside` — the effects tab, and the whole of M2b's scope — appear
   in no capture this workstream has ever taken (MENU-36). A gate blind to half a screen is not a gate
   for that screen. `shop-fx` was added to the survey, so the comparison needs a *before* that has it.
2. **The clock.** M1 lost a capture pair to the ISO week ticking over midnight (MENU-30). Re-taking
   the before-half means both halves of every comparison in this record come from **one session on one
   day**, and the week label cannot differ between them. That is cheaper than explaining 72 box deltas.

**The baseline of this record is therefore `evidence/M2a/before`** — the same harness, the same seeded
state, 16 surfaces × 5 sizes × 2 languages, captured from the base tree (`308ab5ae`'s `src/`, rebuilt).
Where it and the inherited set disagree on a `shop-packs` cell, that is stated in Part 2.

---

## Part 2 — The zero-delta gate

**The claim: commit 1 moves no pixel, on any of the 16 surfaces, at any of the 5 sizes, in either
language.** Instrument: `scripts/viewport-survey.mjs` with M1's surface probe, compared by
`scripts/surface-delta.mjs`. Geometry tolerance is **zero**.

```bash
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/M2a/before \
                               docs/workstreams/desktop-menus/evidence/M2a/after-c1
```

**Result — PASSED, first run.**

| | |
| --- | --- |
| Cells compared | **160** — 16 surfaces × 5 sizes × 2 languages, 0 unreached |
| Matched nodes | **25 027** |
| Computed element deltas | **0** |
| Unmatched nodes | **0**, on any surface — including the four H-c surfaces |
| Token declarations differing in text | **1** |

**The one token difference is a result rather than noise:** `--sf-glass: (absent) → linear-gradient(180deg, #1b1a24ed, #161620f2)`, in all 160 cells. The token existed in `@theme` and
was **not in the built stylesheet**, because nothing referenced it and Tailwind prunes what nothing
references. Commit 1 is its first consumer. That is MENU-03 observed from the other side, and it is
the machine confirming MENU-40.

**Zero unmatched nodes is itself a measurement.** M1 reported 98 unmatched on the two pre-registered
H-c surfaces, and amended the hazard to name `stats` and `feedback` as well (MENU-17). Here all four
are clean, and the reason is Part 1's second one: both halves were captured in **one session on one
day**, from a fresh profile each time, so the run history, the network board and the ISO week are
identical on both sides. The H-c amendment is right; it bites a partial comparison, not a
full-versus-full one taken this way.

### What this proves, item by item

Every conversion in commit 1 is value-preserving, and each was *measured* rather than argued:

| Change | Proof |
| --- | --- |
| `.cz-head` fade → `--sf-head-fade` | 0 deltas; the baseline's own `bi` already recorded the fade with its `180deg` normalised away |
| the four panels → `--sf-glass` | 0 deltas — and this is the claim M1 declined to make (MENU-31) |
| `--rd-lg` on four panels, `--rd-shell` on the card | 0 deltas |
| `rounded-2xl` removed from the card | 0 deltas. This one was **not** obvious: an unlayered `.as-panel` rule could have been what actually painted that corner, in which case dropping the utility would have changed nothing *and* the token would have been decoration. The gate says the computed radius is unchanged at every size |
| `--el-flat` for two `box-shadow: none` | 0 deltas |
| `.cz-close`'s dead 8 px removed | 0 deltas — the radius was already 6 px, which is what made it dead |
| the shared `#eckig` rule → `--rd-sm` | 0 deltas on `.up-close`, `.gd-close`, `.gl-close`, `.st-close`, `.lb-head > button` and every `ActionButton` in the tree |

### The substitution check (H-c), done before writing a token rather than after

Every token this task puts at a call site was checked for the MENU-15/MENU-29 shape — a composite
declared at `:root` that reads a property set per element:

| Token | Reads | Verdict |
| --- | --- | --- |
| `--sf-glass`, `--sf-head-fade`, `--sf-scrim-desk` | nothing — literal stops only | flat, cannot freeze a fallback |
| `--ed-quiet` | nothing | flat |
| `--el-flat` | nothing (`none`) | flat |
| `--rd-sm`, `--rd-lg`, `--rd-shell`, `--in-base` | `--ui-scale` only, declared at `:root` and set by nobody (reserved hook) | resolves at `:root` to the intended value by construction |

No token used here is parameterised per element, so none decomposes. The two rules that *re-point* a
step (`.cz-head`, `.cz-stage`/`.cz-fxside`) redefine a **flat** property on the element, which is the
shape §2c states does work.

---

## Part 3 — Before / after comparison

**Commit 2 is where pixels are meant to move.** Diffed against commit 1 rather than against the
baseline, so "the conversion is value-preserving" and "these four adoptions move exactly this much"
stay two checkable claims rather than one.

```bash
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/M2a/after-c1 \
                               docs/workstreams/desktop-menus/evidence/M2a/after-c2
```

### Scope containment, measured across all 160 cells

| Surface | Deltas |
| --- | --- |
| `shop-packs` | 4040 |
| `shop-fx` | 690 |
| **every other surface (14)** | **0** |

The task was allowed to move one screen and it moved one screen. Unmatched nodes: 0 everywhere.

### And of those 4730, only **two** are style changes

Every remaining delta is a `box` coordinate — the geometric consequence of the two.

| Transition | Count | What it is |
| --- | --- | --- |
| `pd: 14px 16px 12px 16px → 18px 18px 18px 18px` | 30 | three panels (`.cz-mainscroll`, `.cz-stage`, `.cz-fxside`) × 10 cells |
| `bc: … rgba(150, 150, 170, 0.18) → … rgb(42, 42, 52)` | 10 | `.cz-readout`'s divider × 10 cells — `--ed-quiet`, exactly |

**Nothing else on any axis.** No `bg`, no `bi`, no `rd`, no `sh` anywhere — which independently
confirms the two phone-only changes (Q3) are invisible above 1280 px, as promised when they were put
to the owner.

### What the geometry actually did — including where the prediction was wrong

| | Before | After |
| --- | --- | --- |
| catalogue tile, 1280×720 (30 tiles) | 86.00 px wide | **85.33 px** |
| catalogue tile, 1920×1080 (30 tiles) | 175.33 px | **174.66 px** |
| effects stage panel, 1280×720 | 636 × **391.25** | 636 × **399.17** |
| the preview inside it | 604 × 313.75 | **600 × 311.67** |

The tile prediction was right: **0.67 px**, against the 0.7 px put to the owner.

**The stage prediction was wrong in its sign, and it is corrected here rather than left to be
discovered.** Q1 said "the stage loses 10 px of height, which its preview absorbs". The panel is
content-sized (`align-self: start`), so adding padding makes it **grow**, not shrink: +4 top +6 bottom
is +10 px of chrome, the preview loses 4 px of width and therefore 4 / 1.925 ≈ **2.08 px** of height
through its `aspect-ratio`, and the panel nets **+7.92 px**. The mechanism named in the recommendation
— the preview absorbs it — is what happened; the direction of the panel's own box was not.

**No consequence anywhere.** Overflow, out-of-frame, truncation and page-scroll counts are byte-identical
before and after on all 20 workshop cells, in both languages:

```
de/1280x720/shop-packs   20/13/8/0   -> 20/13/8/0
de/1400x700/shop-fx       0/0/0/14   ->  0/0/0/14        (overflow/outside/truncated/pageScrollY)
```

### The pairs the owner pages through

`evidence/M2a/compare/{before,after}` — **28 images per side**: the two surfaces the task touches,
five sizes, both languages, plus DPR 2 at 1280×720 and 1920×1080. Same harness, same seeded state
(`muted: true`, telemetry off, effects minimal, seeded name), animations pinned to time zero, fonts
awaited, one session.

`shop-fx` appears in a before/after pair **for the first time in this workstream** (MENU-36).

> **An agent does not report a visual result as approved.** The pairs went to the owner at the End
> stop, with the two style changes named and the corrected stage geometry (MENU-43) stated rather than
> left in the images.

**APPROVED — owner, 2026-08-24: "bilder schauen gut aus."** The comparison is accepted as shown; the
1280×720 `de` pair for both surfaces was reviewed directly, the remaining 24 pairs alongside it in
`evidence/M2a/compare/`. That closes the second of this task's two owner stops.

---

## Part 4 — Findings

One row per observation, with an ID and a disposition. Four dispositions, and **only the first returns
as work in this task**: *Defect in this task* · *Expected* · *Pre-existing, out of scope* ·
*New design question*.

| ID | Observation | Disposition |
| --- | --- | --- |
| **MENU-31** | **M1's reason for leaving the glass gradient a literal is measurably wrong.** `.cz-stage, .cz-fxside` set `--sf-head` to a literal rather than `var(--sf-glass)`, on the stated ground that the token carries `180deg` and "therefore serialises differently, which the zero-delta run would report as a difference". Measured in a browser: Chrome **normalises the default direction away**, so `linear-gradient(180deg, A, B)` and `linear-gradient(A, B)` have the *same* computed string. The baseline capture confirms it independently — the recorded `bi` of a rule written *with* an angle has no angle in it. Painted pixels compared over 116×38 px: 0/255, and then 0 deltas across 160 cells. Both rules read the token now; the comment is corrected where it stood. | **Expected** — M1's stated reason measured and corrected in place |
| **MENU-32** | **`.cz-close { border-radius: 8px }` was dead and had never rendered.** The `#eckig` rule 1600 lines later in the same media block sets 6 px at equal specificity and wins as the later one. Confirmed on the built screen *before* removal — the baseline records `rd 6px` on that button at every size. **Exactly MENU-01's shape on a second screen**, which makes it a pattern: a close button gets a radius written beside it, and a later collective rule quietly overrides it. | **Defect in this task** — removed, 0 deltas |
| **MENU-33** | **The JSX inline-style guard read a value only to the first comma.** `[^,\`"']*` after the property name is fine for `background: "#0b0a16cc"` and useless for `background: "linear-gradient(180deg,#0c0c10aa,…)"` — what remained was `linear-gradient(180deg`, which holds no hex and no `rgba(`. Measured on `CustomizeScreen.jsx`: the guard saw **42** literals, the truth is **68**, the hole hid **26**, and every one of the 26 was a multi-stop gradient. H-b, the fourth time in this repository after TYPO-12, MENU-15 and MENU-29. The reader counts parentheses now. | **Defect in this task** — fixed, counter-checked |
| **MENU-34** | **Two more holes of the same shape, found while closing MENU-33.** (a) `/<[A-Za-z][^<>]*>/` cannot match a JSX tag containing `>`, and `onClick={() => setTab(m)}` splits the tag in half — eight of twenty-seven ink literals fell outside the guard's view. (b) A greedy `style={{[\s\S]*}}` runs past the style object to the last `}}` in the tag, which belongs to that same arrow function. Both replaced by character-wise readers. The lesson three times over: a regex describing the *common* spelling of a construct is not a reader of it. | **Defect in this task** — fixed, counter-checked |
| **MENU-35** | **`overlay-nesting.test.js` breaks on a COMMENT, not on a value.** It decides "is this overlay portalled" by looking for `overlayPortal(` in the 260 characters *before* the class literal. Three lines of prose inserted between the two pushed it out of the window; the guard failed while its invariant was intact. The comment moved; the window was **not** widened, because the distance heuristic is what makes the guard cheap and the alternative is a parser. Recorded because the next worker in this file will want to write a comment in the same place. | **Expected** — comment moved, guard untouched |
| **MENU-36** | **The survey had never opened the workshop's effects tab.** `shop-packs` lands on the default tab, so `.cz-stage` and `.cz-fxside` — two of the screen's four panels, and the entire scope of M2b — appear in no capture this workstream has taken. M2a changes the radius, fill and padding of both, and the zero-delta gate could not have seen any of it. A `shop-fx` surface was added, reached by the tab's role rather than its label (`shop.tab.fx` is "Effekte"/"Effects"). Additive; 10 cells, all reached; 690 of this task's deltas are on it. | **Defect in this task** — surface added |
| **MENU-37** | **The guard's own "does the allowlist hit anything" check was half blind, and counter-checking found it.** It demanded that *at least one* class hook match a tag — with seventeen hooks that is satisfied by sixteen, so renaming `cz-root` away left the workshop's root unguarded and the suite green. It now proves **every** hook individually. The counter-check earning its keep on the guard it was written for. | **Defect in this task** — fixed, counter-checked |
| **MENU-38** | **The neutral translucent edge is not in the vocabulary, and it is a family.** `rgba(150, 150, 170, α)` appears at **seven alphas** (.1 / .12 / .14 / .16 / .18 / .3 / .35) across 15+ rules, carried by the `.as-edge-*` role classes and by `.as-chip`, and copied by hand into `.up-readout` and `.cz-readout`. Every edge step in the ladder is opaque. This is the nearest *edge* extension exactly as ink is the nearest *surface* one — and it belongs to whoever migrates those role classes, not to the workshop. The shell's two instances took `--ed-quiet`, whose definition is their role. Named rather than taken; the extension window was **not** spent on it. | **New design question** — planner |
| **MENU-39** | **The deck hairline is written twice, with its fallbacks mirrored.** `.cz-hair` builds `linear-gradient(90deg, var(--deck-a1, #9b82f0), var(--deck-a2, #26c6e6), …)` inline; `--hl-deck` in `@theme` is the same gradient with the two fallback colours the other way round. With a deck active — the normal state, `--deck-a1` is set at `.app-root` even outside a run — they are identical, which is why the capture shows no difference. Without one they fall back to mirrored gradients. Not converted: the hairline is `--hl-*`, outside the five axes and outside this task. | **Pre-existing, out of scope** |
| **MENU-40** | **`--sf-glass` was absent from the built stylesheet until this task used it.** No call site referenced it, so Tailwind pruned it — MENU-03 in action, on a token the pilot created deliberately for the desktop. Thirteen rules carried the gradient verbatim while the token naming it did not ship. Measured by the gate itself: one token-text difference across all 160 cells, `(absent) → linear-gradient(…)`. | **Expected** — documented in §2c |
| **MENU-41** | **The workshop's overlay wash is `--sf-scrim-desk` written a second time.** `#0c0c10ee` is α .933; the token is α .94. Measured against the brightest ground the hub can put behind it (deck violet `#9b82f0`): **max 2/255, mean 1.33**, and pixel-identical over most of the wash. Collapsed onto the named token. **`ChronikOverview.jsx` carries the same literal** and will meet the same wall — one line for whoever converts the chronicle, and it needs no extension. | **Expected** — collapsed; chronicle noted for its worker |
| **MENU-42** | **The extension window closed unused, with the measurement behind it rather than an assurance.** Every surface, edge, elevation, radius and inset in the shell had a step for its **role**; four differed from that step by 2–9/255, which is the condition a derived ladder exists to end. Two extensions were genuinely available (`--sf-scrim-alt`, an edge token for `#23222e`) and both were rejected as near-duplicates — 1.7 and 8 /255 from steps that already exist. If the planner reads it differently, the request to file is named in *The extension window*. | **Expected** — window answered in writing, not spent |
| **MENU-43** | **A recommendation put to the owner was wrong in its sign, and the owner acted on it.** Q1 said the effects stage "loses 10 px of height". The panel is content-sized, so padding makes it **grow**: measured +7.92 px, with the preview inside losing 4 px of width and 2.08 px of height. The mechanism named — the preview absorbs it — held, and nothing overflows, so the decision stands on the same facts. Recorded because a decision block is only worth its accuracy, and the error was in the half nobody re-measures after a yes. | **Expected** — corrected in Part 3, decision unaffected |
