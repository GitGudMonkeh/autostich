# Task Contract — icons-corners

**Tier C — large UI / architecture workstream** (`docs/engineering/task-lifecycle.md` — *Tier C —
large UI / architecture workstream*), running as a task under the `feature/desktop-icons` feature
integration branch.

This contract is the binding scope statement. Where it and any planning report disagree, **this
contract wins**.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | icons-corners |
| **Feature** | feature/desktop-icons |
| **Branch** | `task/icons-corners` |
| **Base** | `origin/feature/desktop-icons` @ `5b6e5b090d2326f994d77ddcb2cac88a7a104ba9` |
| **Owner** | **Claude Code worker** — implementation, per `AGENTS.md` — *Roles and source of truth* |
| **Integrator** | **Claude Code** feature integrator, same source |
| **Reviewer** | **Not required.** Independent technical review is optional and risk-based; integration readiness is decided by scope completion, evidence, gates, branch state and unresolved blockers. Owner decision, 2026-08-22 |
| **Concurrency** | One writer. Sequential sessions may continue this task in the same worktree. Never two simultaneous writers. |

---

## Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/icons-corners` |
| **Branch checked out there** | `task/icons-corners` |
| **Upstream** | None. The branch deliberately does not track its base. |
| **Preview port** | `5185` |
| **Preview URL** | `http://localhost:5185` |

Server invocation:

```bash
npm run dev -- --port 5185 --strictPort
```

---

## Scope

The last task of the workstream, and the only one whose element is **not** a card emblem. Five corner
ornaments — one per archetype plus one for the perk panel — run from the upper corners into the card
head, mirrored on the right, changing with the active tab. They are information ("you are on
Lightning"), not decoration, which is why they follow the tab rather than sitting still.

This task also closes Issue #402, which has carried the corner and perk-category art since it was
drawn.

Four parts, in order:

1. **Measure the corner render zone and remove the bake refusal.** `scripts/skill-art-build.py:317`
   registers `corners` with `square=False, expect=5, strip_w=None`, so `bake --lot corners` refuses.
   The zone is this task's to measure — in the running application, on the real card head, on **both**
   screens. `Lot.size` names the long edge and `delivery_px` derives the short one from the master's
   3:2 aspect, so the delivery must not be forced square.
2. **Bake the five delivery copies** from the committed masters, applying the per-faction opacity the
   README already measured.
3. **Wire the ornaments** into the skill-selection and perk-selection card heads: two instances per
   head, the right one mirrored with `transform: scaleX(-1)`, switching with the active archetype tab,
   behind the same desktop gate as the emblems.
4. **Add guards** in the shape of `test/skill-art.test.js` and `test/perk-art.test.js`: lot
   completeness in both directions, the mirroring, the tab binding, and the no-runtime-filter rule.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any new icon design or artwork edit | Artwork is final. The five masters are committed and owner-approved |
| Any change to the mobile UI | Established workstream non-goal |
| Re-baking the skill or perk emblem lots | Shipped, owner-approved at V3. `ICONS-VIS-01` and `ICONS-PERK-VIS-10` both tempt exactly this and are both deliberately deferred |
| Fixing `ICONS-VIS-01` (skill zone 277 baked against 270.66 rendered) | Pre-existing, would re-bake every delivery file in every lot. A deliberate decision, not a drive-by |
| Reusing the skill or perk `strip_w` for the corners lot | This is the tripwire — below |
| Extending the ornaments to any screen beyond skill and perk selection | The README scopes them to the selection card heads |

### Tripwire

> **If a `strip_w` value appears for `corners` that was copied from the skill or perk lot rather than
> measured on the actual corner zone, stop.**

The refusal in the build script exists because a borrowed constant yields a bloom radius that is
authoritative and wrong. `icons-perks` hit exactly this and measured instead; the corners lot is a
third, different zone — and unlike the other two it is **not square**, so a copied number is wrong in
two dimensions at once.

### Secondary tripwire

> **If a corner ornament is placed outside the tile's border box, stop and re-anchor it.**

`overflow: hidden` now sits on the perk tile (set by `.pk-offer-art`). An ornament outside the box is
clipped — and clipped *only* on desktop and *only* when art is present, which is the hardest kind of
bug to see.

## Approved architecture

1. **One image per faction, used twice**, right side mirrored via `transform: scaleX(-1)`. Five files,
   not ten — a card head is symmetric, and the README settled this when the art was made.
2. **Black ground, shown with `mix-blend-mode: screen`**, as the emblems are. There is no alpha
   channel; the black disappears additively.
3. **Bloom is baked into the file, never a runtime CSS filter.** A filter on this surface measured
   271–417 ms at `phase:levelup` mount, and both `test/skill-art.test.js` and `test/perk-art.test.js`
   ratchet the absence of `filter:`/`blur(`. Any new rule inherits that constraint.
4. **The desktop gate lives in JSX, not CSS**, so mobile never fetches the images.
5. **Per-faction opacity comes from the README's measurement**, not from a fresh derivation. The five
   were measured against each other with Blitz among them, so this lot's alignment is already done.
6. **Master/delivery split**: masters stay at `docs/art/corners/`, delivery copies go to
   `src/assets/corners/` — the lot table already names both.
7. **Whether `.pk-strip` and `.sk-strip` get unified is this task's decision to make or decline.**
   `icons-perks` deliberately left it open and did not touch `skillArt.js`, `SkillSelect.jsx` or
   `LegendarySelect.jsx`. Declining is a legitimate outcome; the two zones are genuinely different
   numbers and the skill one is itself suspect.
8. **No history rewrite, no force flags, no push to a permanent branch, no promotion.**

## Task-specific inputs

| Input | Value |
| --- | --- |
| Masters | `docs/art/corners/corner_{lightning,fire,ice,plant,perk}.webp` — 5 files, **1536 × 1024** (3:2, not square), committed |
| Delivery | `src/assets/corners/` — **does not exist yet** |
| Lot table | `scripts/skill-art-build.py:317` — `corners`, `square=False`, `expect=5`, `strip_w=None` → `bake` refuses |
| Intended footprint | ~**300 × 115 px** per side, running from the upper corners into the card head (`docs/art/corners/README.md`) |
| Per-faction opacity, measured | Blitz **11.0 %** · Feuer **10.0 %** · Eis **9.2 %** · Pflanze **6.4 %** · Perk **15.6 %** — so all five carry the same perceived light |
| Why Plant is the outlier | Deliberate: vines *are* dense (18.6 % luminous area against Blitz's 10.9 %). The table regulates the display rather than bending the artwork |
| Perk corner, two known adjustments | Its outline runs to the image edge, and the card already carries a 1 px accent frame plus the coloured hairline — three parallel red lines unless the image is inset. And its outflow is abrupt (lines end, rather than fraying), so its mask must begin earlier than the organic four |
| Perk tile geometry, measured live | Width **270.00 px** fixed; height **content-dependent** — 317.50 px with art, 162.50 and 126.75 px measured on other offers of the same screen. `padding: 167px 12px 12px`, `border-radius: 6px`, border **left 4 px** (rarity colour), 1 px on the other three |
| Perk tile, top 201 px | Already occupied by a `screen`-blended emblem. A top ornament composites **additively with it**, not over it |
| Existing zones, for contrast only | `.pk-strip` 265 × 201 · `.sk-strip` 277-baked / 210 rendered — deliberately separate families |

## Acceptance gate

> **On both the skill-selection and perk-selection screens at ≥ 1400 px, the corner ornament of the
> active tab is visible in both upper corners, mirrored, not clipped, and the zone its bloom radius
> was computed from is the zone measured live in those same screens.**
>
> An ornament that is clipped by the tile's `overflow: hidden`, or one baked against an assumed zone,
> fails this gate even if a screenshot looks right — in the first case because the defect only appears
> on desktop with art present, in the second because the number cannot be reproduced.

## Expected file surface

**Written by this task**

| Path | Change |
| --- | --- |
| `src/assets/corners/*.webp` | 5 new delivery copies |
| `scripts/skill-art-build.py` | `strip_w` set for the `corners` lot, with its measurement recorded |
| `docs/art/corners/README.md` | Render zone, delivery state, and the resolution of Issue #402 |
| `src/ui/SkillSelect.jsx`, `src/ui/LegendarySelect.jsx`, `src/ui/PerkSelect.jsx` | Ornament wiring — this is the one task allowed to touch all three |
| `src/index.css` | Corner-ornament rules |
| `src/ui/<loader>.js` | If a loader is needed; may reuse the established glob shape |
| `test/*.test.js` | New guards — additions, never a weakening |
| `docs/workstreams/desktop-icons/icons-corners/*` | Contract, visual review, evidence package |

**Must not be touched**

- `docs/art/skills/**`, `src/assets/skills/**` — shipped lots
- `docs/art/{perkcats,legendaries}/**`, `src/assets/{perkcats,legendaries}/**` — shipped lots
- `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`

## Known hazards

| # | Hazard | Status at contract-writing |
| --- | --- | --- |
| H1 | `overflow: hidden` on the perk tile clips anything outside the border box — desktop-only, art-only | **Measured** by `icons-perks` and named in its handoff. The secondary tripwire covers it |
| H2 | Tile height is content-dependent; only the width is fixed | **Measured** — 317.50 / 162.50 / 126.75 px on three offers of the same screen. Never anchor to a constant height |
| H3 | The corners master is **3:2, not square** — a single hard-coded delivery edge ships it distorted | **Known and already handled in code**: `Lot.size` is the long edge, `delivery_px` derives the short one. This was review finding B1 of the audit task |
| H4 | Additive compositing over the existing emblem in the top 201 px of the perk tile | **Not measured** — two `screen`-blended layers stack; the combined brightness is not either one's |
| H5 | Two screens, two card families, one ornament system — the unification question | **Open by design**, see *Approved architecture* 7 |
| H6 | Source-text ratchets read `src/**` as raw text; new JSX and CSS can turn existing guards red without a behaviour change | **Not measured** — read the failing assertion before changing anything (`AGENTS.md` — *Hazard*) |
| H7 | `npm test` exits 1 on this base through load-dependent timeouts in `test/i18n-guards.test.js` | **Measured on the base**: `npx vitest run --testTimeout=30000` gives **2101/2101 green, exit 0**. Pre-existing, not this task's, and not to be fixed here |

## Definition of done

**Ticked by the integrator at hand-over, 2026-08-22, by verifying each line against
`evidence-package.md` and `visual-review.md` — not by performing the work.** The worker completed
every item but left the boxes untouched; an all-unticked list beside finished work is the ambiguity
`task-lifecycle.md` — *Two standing rules* exists to prevent, because it cannot be told apart from
work that was never done.

- [x] Corner render zone measured live on **both** screens and recorded, with the resulting `strip_w` — `corner-zone-probe.mjs` is committed; `skill-art-build.py:313` carries the measurement
- [x] `bake --lot corners` no longer refuses, and the reason is a measurement, not a flag flip
- [x] Five delivery copies produced at the correct 3:2 aspect — ships 600 × 400; without the aspect derivation it would have shipped 600 × 600
- [x] Ornaments wired into both card heads, mirrored right, switching with the active tab, behind the desktop gate — `src/ui/CardCorners.jsx`, `src/ui/cornerArt.js`
- [x] Perk corner inset so it does not form a third parallel line — **6 px**, confirmed at V3 (`ICONS-CORNER-04`)
- [x] Nothing clipped by `overflow: hidden` — verified in the running app
- [x] No runtime `filter:`/`blur(` on any new rule — guarded and counter-checked
- [x] Guards added for lot completeness, mirroring and tab binding — `test/corner-art.test.js`
- [x] The `.pk-strip`/`.sk-strip` unification question answered — **taken** for the corners (one component across three screens), **declined** for the emblem strips; reasoning in the handoff (H5)
- [~] V1 baseline taken **before** the first pixel moved, on both screens — taken for both, but the **legendary head has a reconstructed baseline only** (`V1L-*`): it entered scope at the round-1 gate, after pixels had moved. Recorded as a weakening in `visual-review.md`, not presented as clean
- [x] V2 capture at the same sizes, DPR and state as V1
- [x] V3 human visual gate passed — three rounds; closed 2026-08-22, verbatim *"passt alles. gut weiter"*
- [x] V4 classification written; every finding carries an ID
- [x] `npm run lint -- --max-warnings=0`, `npm run build`, `VITE_PREVIEW=1 npm run build`, `npm run gen:db` — all exit 0
- [~] `npm test` — **exit 1**, and not claimed as passing. The single failure is the H7 timeout in `test/i18n-guards.test.js`, not an assertion failure
- [x] `npm run loc:export` run — exit 0, no drift. Run rather than declared not-applicable
- [x] Issue #402 recorded as resolved in `docs/art/corners/README.md`
- [x] Evidence package written, stating its own limits; hazards H1–H7 each marked

## Open questions

| # | Question | Blocking? |
| --- | --- | --- |
| Q1 | Do the skill and perk card heads share one corner zone, or does each need its own `strip_w`? The two emblem zones already differ (265 × 201 against 277/210), so one number may not fit both | Yes — part 1 cannot finish without it |
| Q2 | The perk panel has one identity colour and therefore one ornament, while the skill screen has four that swap with the tab. Does the perk corner ever need to change, or is it static? | No — affects the binding, not the bake |
| Q3 | Should the ornament sit **under** the emblem strip in stacking order, or above it? Both are `screen`-blended, so the order changes the combined brightness in the overlap (H4) | No — a visual decision, settle it at V3 |
