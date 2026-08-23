# Typography System, Desktop (`#typo-system`) — Planning Report

**Status:** proposal. Nothing implemented, no branch created, no source file changed.
**Written:** 2026-08-22 · **Base:** `dev` at `2eddf9d3`, primary worktree, no source changes pending.
**Author:** Claude Code session (planning role).
**Revision:** sixth pass, 2026-08-23. The owner set the visual bar (**§8.1d**): V3 is a plain
before/after pairing, and **layout breakage is accepted** — a full menu-and-panel rework follows this
workstream. Clipping and overflow at 1280×720 drop from acceptance gate to **recorded observation
handed to that rework**; R4 and R8 re-rated accordingly. What still blocks is text that cannot be
*read*. V1 state settled at fresh + deterministic.
**Revision:** fifth pass, 2026-08-23. Start-readiness pass. New **§4.1**: the zero-delta acceptance
oracle reached only ~2/3 of the migrated surface (`ArchitectScreen` 79 utilities and `GameOver` 38
were never measured) — extended for those two, remainder recorded as a downgrade. Worker split is now
**three tasks** (§6.1) on a Tier C branch line; all three contracts plus the slashed-zero note are
written. R10 added.
**Revision:** fourth pass, 2026-08-23 (same day). A third owner round (§8.1c) changed the ladder
itself: **ratio 1.2, base 13, seven steps — `9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27`**, re-fitted
against the survey rather than adopted from the earlier table, ties resolving upward (10 → 11,
17 → 18.5). The role table drops from ten rows to seven (§3.2); the S2 displacement criterion
**inverts from a ceiling into a corridor** (§7.2); R4 and R8 are re-rated. The start condition is
**closed** — `dev` is frozen for desktop changes, so V1 can be captured now (§6.5). New §9 records
the frames-and-panels successor, measured and deliberately out of scope.
**Revision:** third pass, 2026-08-23. A second owner round (§8.1b) produced four changes with teeth:
the **role vocabulary moves out of S2 into planning** (Q1 and Q5 together make a mid-implementation
decision unaffordable), the **weight ladder becomes a cleanup rather than a negotiation** (Q2 grants
visible desktop change), **1280×720 becomes the binding retune viewport** rather than one of five
(Q3, itch.io), and the **slashed zero is scheduled before V1** rather than inside the typography diff
(Q6). §3.2 is new; R4 is downgraded; R8–R9 are new.
**Revision:** second pass. The owner answered Q1–Q3 on 2026-08-22 and fixed the start condition;
§3.1 is new (the scale, and how it was chosen), §8.1 became a decision record, and R3 is closed.
**Language:** English, per `AGENTS.md`. The German comments already in `index.css` are carried
forward as written — a translation-only diff in a ratchet-guarded file buys nothing and costs a
review round.

## Goal

Font family, size, weight, line-height and letter-spacing for the desktop UI are managed in **one
place**. A future typography change is one edit per role, not a pass over every menu.

This workstream runs **before** the "adapt every menu for desktop" work, so those menus are built and
checked against the finished system instead of being re-typeset twice.

---

## 0. Corrections to the brief

The brief's premises were checked against the code. Three do not hold as stated, and one of the three
changes the recommended route.

### 0.1 A central typography layer already exists — it stops one dimension short

The brief states there is no central system. There is one, built by the `#typo` pass on 2026-08-17
(`docs/decisions/engineering-log-2026-08.md`), and it is deliberately incomplete:

| Dimension | Where it lives today | Central? |
| --- | --- | --- |
| Font family | `@theme` (`--font-sans`, `--font-mono`) + `.ty-*` roles in `index.css` | **Yes** |
| Weight | `@theme` (`--font-weight-bold`/`-extrabold` → 600) + `.ty-*` roles | **Declared centrally, not enforced** — see §1.3 |
| Letter-spacing | `.ty-*` roles | **Mostly** — 33 further declarations sit in `index.css` |
| **Size** | Call sites only: 770 Tailwind utilities + 164 `font-size` declarations | **No** |
| **Line-height** | Call sites only: 163 utilities + 32 declarations | **No** |

The eight role classes — `ty-num` · `ty-num-sm` · `ty-unit` · `ty-meta` · `ty-badge` ·
`ty-screen-title` · `ty-title` · `ty-display` — carry family, weight, tracking and numeric variant.
They carry **no `font-size`**, and the reason is written above the block in `index.css`:

> *Diese Datei steht hinter `@import "tailwindcss"` und ist damit UNGELAYERT — jede Regel hier
> schlägt jede Tailwind-Utility, unabhängig von Spezifität. Eine `font-size` in einer Rollen-Klasse
> würde also das `text-[25px]` an der Fundstelle stumm überschreiben, und zwar an ~470 Stellen
> gleichzeitig.*

That constraint is real and still holds. **It is the single fact that decides the mechanism** (§2.1):
any option that adds `font-size` to an unlayered class in `index.css` silently overrides every
measured call site at once. The recommended option is the one that does not need to.

So the work is not "introduce a system". It is **"complete the system along the two axes it was
forced to skip, using a mechanism the unlayered-CSS constraint does not block"** — and the existing
roles are the vocabulary to complete it with, not something to replace.

### 0.2 The ratchet risk is real but an order of magnitude smaller than the brief assumes

The brief expects a class-name change across all menus to turn ratchets red "with high probability".
Measured on 2026-08-22 against the full `test/` tree (136 test files):

| Measurement | Value |
| --- | --- |
| Test files reading `src/**` as raw text | 63 |
| Test files reading `src/index.css` | 29 |
| Test files asserting on a **typography** utility or declaration | **4** |
| Individual typography assertions among them | **5** (one further mention is a comment, not an assertion) |

The five, in full:

| Location | What it pins | Breaks if… |
| --- | --- | --- |
| `test/global-board.test.js:91` | literal `className="text-[11px] opacity-45 leading-snug mb-3"` | that one attribute is rewritten |
| `test/go-ruhe.test.js:127` | literal `className="text-xs opacity-55 mt-2 flex …"` | that one attribute is rewritten |
| `test/go-ruhe.test.js:401` | source **order** via `indexOf("text-xs opacity-55")` | the same attribute is rewritten |
| `test/go-ruhe.test.js:466` | `font-size: clamp(… cqw …)` on named classes | container-relative sizing is replaced by a fixed token |
| `test/levelup-wings.test.js:336` | `font-size: 12px` in a named `index.css` block | that declaration is tokenised |

The reason the exposure is this low is structural, not luck: the guards in this repository pin
**semantic** class names (`go-kpi`, `cz-fxfoot`, `bf-scale`, `as-ring`) and the JSX structure around
them. Presentation utilities are largely unguarded — `.ty-*` has **zero** guards, and it went in
across the whole tree eight days ago.

This does not make the ratchets a non-issue; it makes them a **named list of five** that a worker
handles deliberately, instead of an unbounded hazard that argues for a slow screen-by-screen crawl.
Rows 4 and 5 are the interesting ones: they pin *behaviour* (fluid sizing, one measured value) and
must be re-expressed against the token, not deleted.

### 0.3 The expensive constraint is "desktop only", not the ratchets

97 % of the size declarations in this tree are **not** desktop-specific:

| Measurement (2026-08-22) | Value |
| --- | --- |
| Size utilities in `src/**` | **770** across 64 files |
| …carrying the `dt:` desktop variant | **35** |
| …carrying `sm:` | 16 |
| Text nodes whose computed size differs between 1920×1080 and 1280×720 | **60 of 2062 — 2.9 %** |

An unprefixed `text-[11px]` is one declaration serving **both** platforms. So "unify desktop, leave
mobile untouched" cannot be done by retuning the existing declarations — every retuned value has to
be expressed desktop-scoped, or mobile moves with it. This is the constraint that shapes §3, and it
has a consequence the owner should see stated: **the desktop scale and the mobile values diverge
permanently**, and mobile keeps its current spread until a later mobile strand collapses it too.
That is the direct cost of the non-goal, and it is accepted, not overlooked.

### 0.4 This workstream is already specified — and its input data already exists

`docs/workstreams/viewport-1280/planning-report.md` §1.6 deferred exactly this work, named it
"the typography strand", proposed the token shape (`--tx-title`, `--tx-head`, `--tx-body`, …) and
recorded the ordering rule:

> **Ordering matters: layout first, then type.** Tuning sizes against fixed-pixel lanes means tuning
> twice.

That rule is **satisfied**: `feature/viewport-1280` is merged into `dev` (`142d005d`). Layout first
has happened; type is now correctly next, and the brief's instruction to run this before the menu
pass agrees with it.

More usefully, the measurement probe that strand asked for was built and run. Every text-carrying
element on 13 screens × 5 widths × 2 languages was captured with its computed size, weight, opacity,
family and panel ancestor, and stored in
`docs/workstreams/viewport-1280/evidence/survey/matrix.json` (5.5 MB, 130 cells).

**The inventory this workstream needs is not a task — it is on disk.** §1.3 is read out of it. The
same file is also the S1 acceptance oracle (§7.1): re-run the survey, diff the computed sizes, expect
zero.

---

## 1. Current state

### 1.1 Relevant files

| File / group | Role |
| --- | --- |
| `src/index.css` (5640 lines) | `@theme` block (families, weights, `--breakpoint-dt`); the `.ty-*` role block; **164** `font-size`, **32** `line-height`, **33** `letter-spacing`, **58** `font-weight` declarations spread through the screen-specific sections |
| `src/ui/*.jsx` (64 files) | **770** size utilities, 163 `leading-*`, 152 `tracking-*`, 341 weight utilities, 47 inline `fontSize` |
| `src/ui/ArchitectScreen.jsx` · `StartScreen.jsx` · `CustomizeScreen.jsx` | densest three: 79 · 65 · 51 size utilities |
| `scripts/viewport-survey.mjs` + `scripts/surveyProbe.js` + `scripts/cdp.mjs` | the measurement harness; `surveyProbe.js` §"5 + 6. typography" already records per-node size/weight/opacity/family/panel |
| `scripts/viewport-proof.mjs` · `phone-proof.mjs` · `pixel-diff.mjs` | capture and pixel comparison for V1/V2 |
| `src/ui/testViewport.js` | `TEST_VIEWPORTS`; harness is **preview-gated** (`src/main.jsx:56`) |

### 1.2 Architecture facts that constrain the work

**F1 — `index.css` is unlayered and beats every utility.** It sits after `@import "tailwindcss"`, so
each of its rules wins over any Tailwind utility regardless of specificity. Any `font-size` placed in
a shared class there overrides all 770 call sites silently. This is load-bearing and documented in
three places; it is not to be "fixed" by wrapping the file in a layer as a side effect of this work.

**F2 — Tailwind 4.3.3 has a native token namespace for exactly this, and it was verified by
compiling, not by reading the docs.** A probe compiled against the repository's own installed
`tailwindcss@4.3.3`:

```css
@theme {
  --text-body: 13px;
  --text-body--line-height: 1.45;
  --text-body--font-weight: 500;
  --text-body--letter-spacing: 0.01em;
}
@media (min-width: 1280px) { :root { --text-body: 14px; } }
```

emits

```css
@layer theme { :root, :host { --text-body: 13px; --text-body--line-height: 1.45; … } }
…
.text-body {
  font-size: var(--text-body);
  line-height:     var(--tw-leading,  var(--text-body--line-height));
  letter-spacing:  var(--tw-tracking, var(--text-body--letter-spacing));
  font-weight:     var(--tw-font-weight, var(--text-body--font-weight));
}
@media (min-width: 1280px) { :root { --text-body: 14px; } }
```

Three properties of that output matter:

1. **One class carries four dimensions.** `text-body` is size *and* line-height *and* weight *and*
   tracking. That is the whole system in one utility.
2. **The `--tw-*` fallbacks are an escape hatch, not a leak.** A call site that still needs
   `leading-none` or `font-bold` keeps working and wins — the role supplies the *default*, the call
   site keeps the last word. Migration therefore never has to strip existing overrides in one go.
3. **The tokens stay live at `:root`.** Retuning desktop is a media-query override of a custom
   property — **no call site is touched**. This is precisely the "one edit per role" the goal asks
   for, and it works around F1 instead of fighting it: the utility is inside Tailwind's layer, so
   `index.css` still wins where it must.
   *Constraint:* the block must be plain `@theme`, **not `@theme inline`** — `inline` substitutes the
   value into the utility and kills the media-query override.

**F3 — the desktop threshold is already a single named token.** `--breakpoint-dt: 1280px` in
`@theme` generates the `dt:` variant; the media queries carry `1280px` literally (CSS media queries
cannot read custom properties) and a guard compares the two. Desktop-scoped token overrides go in a
`@media (min-width: 1280px)` block and inherit that guard's protection.

**F4 — `@utility` and `@layer` are unused in `index.css`.** Introducing either is available but is a
new mechanism in a file that has none; §2.1 option C weighs it.

### 1.3 The measured inventory

From `matrix.json`, German at 1920×1080, 13 screens, 2062 text nodes:

| Dimension | Measured |
| --- | --- |
| **Distinct rendered font sizes** | **39** (40 at 1280) |
| Their spread | 7.5 · 8 · 8.5 · 9 · 9.5 · 10 · 10.5 · 11 · 11.5 · 11.52 · 12 · 12.5 · 12.6 · 12.8 · 13 · 13.12 · 13.2 · 13.5 · 14 · 14.5 · 15 · 15.6 · 16 · 16.2 · 16.8 · 17 · 17.4 · 18 · 19 · 20 · 21 · 21.6 · 22 · 24 · 25 · 27 · 30 · 38.4 · 88 |
| Distinct **weights** | **8** — 400 (937) · 450 (57) · 500 (102) · 600 (746) · **650 (15) · 700 (184) · 800 (16) · 900 (5)** |
| Distinct **families** | 5 — Geist (1774) · Geist Mono (147) · Orbitron (108) · Georgia (27) · `ui-monospace` (6) |

Per screen, distinct sizes: guide 29 · glossary 22 · upgrades 22 · shop-packs 20 · leaderboard 20 ·
options 18 · feedback 18 · perk-choice 18 · hub 16 · stats 16 · privacy 16 · skill-choice 16 ·
run-stage 13.

Three readings of this table drive the plan:

- **There is no scale, there is a continuum.** 12 · 12.5 · 12.6 · 12.8 · 13 · 13.12 · 13.2 · 13.5 —
  eight steps inside 1.5 px. `13.12` and `11.52` are not decisions; they are a `calc()` and a
  rounding artefact. A "uniform look" is not achievable by nudging these; they have to collapse.
- **The weight ladder is declared centrally and enforced nowhere.** The `@theme` remap only rewrites
  the `font-bold`/`font-extrabold` *utilities*. There is **no `font-[700]` anywhere in the JSX** —
  every one of the 220 off-ladder nodes comes from a `font-weight:` declaration inside `index.css`,
  which is unlayered (F1) and therefore always wins. The documented "three rungs" ladder is, in
  measured fact, eight.
- **Desktop typography is viewport-invariant.** 39 sizes at 1920, 39 at 1600, 40 at 1280; 2.9 % of
  nodes change. The upcoming menu pass will need per-viewport steps that today do not exist —
  which is the concrete reason this strand runs first (§0.4).

### 1.4 Dependencies

- **Upstream, satisfied:** `feature/viewport-1280` merged at `142d005d`. Layout is settled; type can
  be tuned against lanes that will not move again.
- **Downstream, the reason for the ordering:** the "adapt all menus for desktop" workstream consumes
  the token set (§6.4).
- **Tooling:** `cdp.mjs`-based harness; **no Playwright** (rejected on record in
  `scripts/viewport-proof.mjs`). Captures need a **preview build** (`VITE_PREVIEW=1`), because
  `TestViewportHarness` is preview-gated.
- **Concurrency:** four sibling worktrees are open (`icons-corners`, `icons-perks`, `icons-skills`,
  `icon-position-review`). None is a typography task, but all three `icons-*` branches edit JSX in
  `src/ui/**`. **Collision risk is textual, in the same attributes this work rewrites.** §8.3 R3.
- **No new dependency is needed.** The mechanism is in the installed Tailwind. House rule satisfied
  without asking.

### 1.5 Guards that will fire

The five in §0.2, plus one class that needs naming in advance:

- `test/go-ruhe.test.js:466` pins `font-size: clamp(… cqw …)` — **container-query sizing.** Three
  such rules exist (`clamp(8px, 12cqw, 12px)` and siblings). A fixed token cannot express them;
  they are a **deliberate exemption** (§5), and the guard stays as it is.
- `test/levelup-wings.test.js:336` pins a literal `font-size: 12px` in a named block. When that
  declaration becomes a token the guard must be re-expressed against the token — **and
  counter-checked** by breaking the seam, per the project's guard preference.
- `.ty-*` has **no** guard today. S1 adds one (§7.2): a class this central, with this much riding on
  it, should not be re-derivable only by reading it.

---

## 2. Solution options

### 2.1 Mechanism

| | **A — `@theme` `--text-*` tokens** (Tailwind-native) | **B — bare CSS custom properties** | **C — role classes carrying size** |
| --- | --- | --- | --- |
| Shape | `--text-body: 13px` + `--…--line-height/-weight/-tracking`; call sites write `text-body` | `--tx-body: 13px` at `:root`; call sites write `text-[var(--tx-body)]` or CSS uses `var()` | extend `.ty-*` (or `@utility ty-body`) with `font-size`/`line-height` |
| **Pros** | Native, verified against the installed compiler (F2). One class = four dimensions. Call-site overrides still win via `--tw-*`. Desktop retune = one media query, zero call sites. Reads like the Tailwind already in the tree. | Works in `index.css` **and** JSX with the same name — the 164 CSS declarations tokenise without a second vocabulary. No compiler behaviour to rely on. | Fewest characters at the call site; the vocabulary (`ty-*`) already exists and is understood. |
| **Cons** | Two spellings remain: JSX uses `text-body`, `index.css` still needs `var(--text-body)` for its 164 declarations (mitigated — the same variable serves both). | `text-[var(--tx-body)]` is noisier than `text-body` and carries **only size**; line-height/weight/tracking need three more utilities per call site. Reinvents what F2 already provides. | **Blocked by F1.** An unlayered `.ty-body { font-size }` overrides all 770 call sites at once. `@utility` avoids the layer problem but makes conflict resolution depend on generated source order, not on which class the author wrote last — a subtle, hard-to-debug failure. |
| **Risks** | Depends on `@theme` (not `inline`) staying non-inlined — pin with a guard. | Vocabulary drift: two naming systems for one concept. | Silent global override, discovered visually, in a file no test guards. |
| **Ratchet exposure** | Rewrites `className` attributes → touches the 3 literal-attribute assertions. Tokenising CSS touches 1. | Same 3, plus longer attributes. | Touches ~0 attributes, but this is a *false* advantage — the change is invisible to tests **and** to review until someone looks at the screen. |

**A, with B's variable reused inside `index.css`.** They are the same variable; there is no second
vocabulary, only two ways to spell it (`text-body` in JSX, `var(--text-body)` in CSS). C is rejected
on F1 — it is the option the `#typo` pass already considered and rejected on record, and nothing has
changed since.

### 2.2 Migration route

| | **M1 — one codemod, whole tree** | **M2 — screen by screen** | **M3 — value-preserving tokenisation, then collapse** |
| --- | --- | --- | --- |
| Shape | Replace all 770 utilities with tokens **and** collapse to a scale in one commit | Migrate + retune one menu per commit | **Phase 1:** one token per *existing* value, mechanical substitution, output byte-identical. **Phase 2:** collapse the tokens onto a scale and retune desktop |
| Pros | One pass | Small, reviewable steps | Phase 1 is **provably a no-op** — verifiable by machine (§7.1), not by eye. Phase 2 changes ~7 numbers, and the visual review has exactly one thing to look at. |
| Cons | Every visual finding is ambiguous: mechanism bug or intended retune? | 13 partial states; "uniform look" is unassessable until the last commit; guaranteed re-touching | Two phases; Phase 1 briefly produces ~39 tokens, which is not yet a scale |
| Risks | A regression anywhere lands in a 64-file diff; V3 becomes an audit | Drift between early and late screens; the pass takes longest and is the one most likely to be interrupted | Phase 1 could be mistaken for the finished job — mitigated by keeping both phases in one workstream with one acceptance gate |
| Ratchet handling | All 5 at once, inside a large diff | Spread out, hit twice (migrate, then retune) | All 5 in Phase 1, **inside a diff that is provably behaviour-free** — the ideal moment to touch a ratchet |

**M3.** Its decisive property: it separates *"did the mechanism change anything?"* from *"do we like
the new look?"*, and answers the first by machine. A human visual gate that has to answer both at
once is the gate that misses things.

### 2.3 Handling the ratchets — the concrete rule

1. **Phase 1 is the window.** Rewrite the three literal-attribute assertions there, where the diff is
   verified behaviour-free. A ratchet updated inside a proven no-op is a *rename*; the same edit
   inside a retune is an *unverifiable claim*.
2. **Re-express, never relax.** `test/levelup-wings.test.js:336` moves from `font-size: 12px` to the
   token that produces 12 px. It must still fail when the seam breaks — **counter-check by breaking
   it deliberately**, per `AGENTS.md`.
3. **Container-query sizing is exempt** (`go-ruhe:466`). Three rules, guard unchanged, documented as
   a scale exemption in §5.
4. **Add the missing guard.** The `.ty-*`/token contract gets one: the roles carry family/weight/
   tracking, the tokens carry size/line-height, and no `.ty-*` rule carries a `font-size` (which
   would re-create the F1 trap). Counter-checked.
5. **Order utilities are the trap to look for.** `go-ruhe.test.js:401` compares `indexOf` positions.
   A codemod that reorders classes inside an attribute breaks it without changing a thing.
   **Substitute in place, preserve class order.**

---

## 3. Recommended approach

**Mechanism A, migrated by route M3, retuned desktop-scoped through the token, in two tasks.**

1. **Define the roles in `@theme`** — one token per role, each carrying size + line-height and, where
   the role implies it, weight and tracking. Names extend the vocabulary that exists
   (`ty-*` roles → `text-*` tokens), so the two halves of the system read as one.
2. **Phase 1 — value-preserving substitution.** Every one of the 770 utilities and the tokenisable
   subset of the 164 CSS declarations is replaced by the token whose value equals the current one.
   Class order preserved. Existing `leading-*`/`font-*`/`tracking-*` at call sites are left alone —
   F2 guarantees they still win. **Expected output: computed styles identical on every node, on
   every screen, both languages, all five widths.** Verified against `matrix.json` (§7.1).
3. **Phase 2 — collapse and retune, desktop only.** The ~39 provisional tokens collapse onto the
   **seven-step 1.2 ladder** of §3.1. The collapse is expressed **only** as a `@media (min-width: 1280px)`
   override of the token values; the base values stay at today's numbers, so **mobile renders exactly
   as before, by construction** — not by inspection.
4. **Retuning afterwards is one edit per role**, in one block, which is the goal.

**Why this beats the alternatives:** it is the only route where the expensive, invisible risk (770
mechanical edits) and the expensive, visible risk (a new type scale) are never in the same diff, and
where the first is checked by the harness that already exists rather than by a person looking at
screenshots.

**Two judgement calls, recorded here rather than escalated** (`AGENTS.md`, *Decision authority*):

- *Token names sit in the `--text-*` namespace* rather than the `--tx-*` proposed in
  viewport-1280 §1.6. `--tx-*` generates no utility; `--text-*` is the namespace Tailwind reads
  (F2). Same idea, working spelling.
- *`.ty-*` stays and is not folded into the tokens.* It carries family and numeric variant, which
  the `--text-*` namespace does not express. The two are complementary: `.ty-num text-num` reads
  correctly and each half owns what it can own.

### 3.1 The scale — industry practice, and where this product's own numbers already sit

**There is no game-specific typography standard distinct from general UI practice**, and the game
industry does not have one of its own. What exists is a convention that design systems and game-UI
toolkits arrived at independently, and it has three parts:

| Convention | Evidence it is the norm |
| --- | --- |
| **Name roles, not sizes.** The call site asks for *body* or *label*, never for a number. | Material Design 3 ships 15 named roles (Display/Headline/Title/Body/Label × L/M/S); Apple HIG ships ~11 text styles (Large Title → Caption 2); IBM Carbon and Atlassian do the same. Game engines encode the same idea as assets rather than docs — Unity TextMeshPro *style sheets*, Unreal *CommonUI* text styles, both a named set a designer edits once. |
| **Derive the sizes from one base and one ratio** (a modular scale). | The ratios in use are the musical intervals: 1.067 minor second · 1.125 major second · 1.2 minor third · 1.25 major third · 1.333 perfect fourth. |
| **Dense, data-heavy UI takes a small ratio; editorial and marketing take a large one.** | 1.125–1.2 is the band for dashboards, tools and stat-dense screens. 1.25–1.333 is for pages with few, large text objects. Hierarchy in dense UI is carried by **weight, colour, case and spacing** — the axes this project already centralised — not by many sizes. |

Autostich is the dense case: 13 screens, panels of stats, costs, rarities and counters, read at desk
distance in a browser. So the band is 1.125–1.2 before anything is measured.

**Which one, measured against your own 3701 menu text nodes** (both languages, 1920×1080, 9–27 px
band = 93.9 % of all menu text; battlefield excluded). For each ratio, the best-fitting base was
searched, sizes snapped to a half-pixel grid, and every node's displacement weighted by how many
nodes carry that size:

| Ratio | Steps | Mean size shift | **Text that moves > 5 %** | Worst case |
| --- | --- | --- | --- | --- |
| 1.067 minor second | 17 | 1.23 % | 2.8 % | 5.6 % |
| **1.125 major second** | **10** | **2.35 %** | **3.6 %** | **5.9 %** |
| 1.2 minor third | 6 | 4.48 % | **41.3 %** | 11.1 % |
| 1.25 major third | 5 | 4.97 % | 49.9 % | 13.0 % |
| 1.333 perfect fourth | 4 | 6.80 % | 52.0 % | 27.8 % |

**The knee is between 1.125 and 1.2, and it is a cliff, not a slope.** One step coarser buys four
fewer tokens and takes the visibly-moved text from 3.6 % to 41.3 %. That is not a taste judgement —
it is where this product's existing values stop fitting a ladder.

~~**Recommended: ratio 1.125, body anchored at 13 px.**~~ **Superseded 2026-08-23 — the owner chose
1.2. See "The ladder, as chosen" below. This paragraph is kept because the reasoning for the 13 px
anchor survives the ratio change and is reused there.**

```text
9 · 10.5 · 11.5 · 13 · 14.5 · 16.5 · 18.5 · 21 · 23.5 · 26.5      (+ display sizes 30 / 38.4 / 88)
```

Ten steps, mean shift 2.77 %, **1.6 % of menu text moves more than 5 %**, worst case 6.0 %.

Two reasons for 13 rather than the 11.5 the optimiser also finds (statistically a tie — 1.5 % vs
1.6 % moved):

- It moves reading text **upward**, which is the direction this codebase already knows it needs:
  the `#typo` log records that Geist builds narrower than the old mono and *"wer eine Zeile
  nachjustiert, korrigiert nach OBEN"*, and viewport-1280 §2.1 found the guide's problem to be a
  text problem.
- 12 px is today's single heaviest value (526 nodes) and sits below the 12–14 px floor that dense
  desktop UI conventionally treats as the lower bound for running text. Anchoring at 13 fixes that
  by construction instead of by 526 edits.

**Ten steps is not ten roles.** Material maps 15 roles onto ~9 sizes; the same applies here — several
named roles legitimately share a step and differ by weight, family or case, which is exactly what the
`.ty-*` layer already expresses. The token count is the ladder; the role count is the vocabulary on
top of it — **and as of the 2026-08-23 round that vocabulary is decided here, in §3.2, not during S2.**

**And the choice is not a commitment.** The base is one number in one block. If 13 reads too large at
1280 once it is on screen, it becomes 12.5 in one edit and every screen follows — which is the
workstream's actual deliverable, stated as a property of the decision rather than a promise about it.

#### Re-examined after the owner permitted visible desktop change (2026-08-23)

The table above ranks ratios by **displacement from today**. That was the right criterion while the
look had to survive the migration. Q2b removed that constraint — so the criterion was re-checked
rather than carried forward, because a decision that outlives its premise is the kind that quietly
turns out to be wrong.

The recommendation at that point was to stay at 1.125, on the grounds that a coarser ratio buys fewer
tokens rather than a more uniform look, and that 41 % moved text is a redesign this workstream is not
scoped for. **Recorded so the owner could overrule with the number in front of them:** 1.2 / 13 px,
41.3 % moved, requiring a lane-cutting pass.

#### The ladder, as chosen — ratio 1.2, base 13 px, seven steps (owner, 2026-08-23)

**The owner took the override, explicitly and with the consequence stated back:** *"lieber jetzt
einmal Desktop sauber aufsetzen"*, and the menu pass will walk every screen afterwards anyway. The
lane-cutting objection therefore lost its force — it was an objection about who pays, and the payer
volunteered.

**Re-fitted at that ratio, because the base is not a detail.** The 41.3 % figure quoted above comes
from the base that minimises *mean* displacement — the right objective while the look had to be
preserved, and the wrong one now. Re-run over the same 3701 menu text nodes:

| Base | Steps | Ladder | Moved > 5 % | **Worst case** |
| --- | --- | --- | --- | --- |
| 12 (mean-optimal) | 6 | 10 · 12 · 14.5 · 17.5 · 20.5 · 25 | 41.3 % | 11.1 % |
| 13.5 | 6 | 9.5 · 11.5 · 13.5 · 16 · 19.5 · 23.5 | **33.8 %** | 13.0 % |
| **13 ← chosen** | **7** | **9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27** | 42.4 % | **10.0 %** |
| 15.5 | 6 | 11 · 13 · 15.5 · 18.5 · 22.5 · 27 | 45.2 % | 22.2 % |

```text
9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27            (+ display sizes 30 / 38.4 / 88, exempt)
```

Three reasons for base 13 over the mean-optimal 12:

- **It keeps the 13 px body anchor the owner already approved** in the first round, and the reasoning
  for it is unchanged by the ratio: 12 px is today's heaviest single value (526 nodes) and sits below
  the floor dense desktop UI treats as the lower bound for running text.
- **Lowest worst case of any 1.2 fit — 10.0 %.** On a 720 px-high viewport the failure mode is
  clipping, and clipping is driven by the *largest* jump, not the average one. This is the number
  that matters for R8, and base 15.5 (22.2 %) shows how badly the wrong base does on it.
- **Clean values.** Two half-steps instead of four.

One extra step over the six-step minimum is not a regression: the token count was never the argument
(§3.1, "ten steps is not ten roles").

**Two values sit exactly between two steps** — the equidistant case §3.2 requires be checked before
S1, which does in fact occur: **10 px (137 call sites) and 17 px**.

> **Tie rule: equidistant values resolve upward.** 10 → 11, 17 → 18.5.

That follows the codebase's own documented direction (*"Geist baut schmaler … korrigiert nach OBEN"*,
`#typo` log) and is also what produces the 10.0 % worst case rather than a larger downward one.

**What 1.2 actually costs, stated rather than discovered.** At 1.125, `meta` (10.5) and `label` (11.5)
had separate steps. At 1.2 they merge onto **11**. The 302 call sites that today distinguish 10 px
from 11 px lose that distinction *in size* — it has to be carried by the `.ty-*` layer instead
(family, weight, case, tracking). That is not damage; it is precisely the dense-UI convention cited
above, where hierarchy is carried by those axes rather than by many sizes. But it is a real
consequence, it lands on the role vocabulary in §3.2, and S2 must not "fix" it by reintroducing a
step.

### 3.2 The role vocabulary — decided here, not in S2

**Why this moved.** The second pass left the role count to be settled inside S2 "against the
clustering, not guessed now". Two owner answers on 2026-08-23 make that untenable together:

- **Q1b — "pull the system straight once, no later manual pass."** A vocabulary settled mid-S2 is
  precisely the later pass, one workstream earlier than expected.
- **Q5b — the menu workstream *waits* for this one.** A waiting consumer cannot request a missing
  role. Whatever is not in the table at handoff becomes a call-site number in the menu pass, which is
  the exact failure this workstream exists to prevent.

So the vocabulary is owner-visible before S1 branches. It is a proposal in this report and a fixed
input to the task contract.

**Derivation.** Every one of the 39 rendered sizes (§1.3) maps to its nearest step on the **chosen
1.2 / base 13 ladder**, ties resolving upward; the names follow the dense-UI convention (§3.1) and
the semantics the `.ty-*` layer already carries:

| Token | Step | Absorbs today's | Intended use |
| --- | --- | --- | --- |
| `--text-micro` | 9 | 7 · 7.5 · 8 · 8.5 · 9 · 9.5 | rarity ticks, the smallest badge, footnote |
| `--text-meta` | 11 | **10 †** · 10.5 · 11 · 11.5 · 11.52 | labels, eyebrows, counters, chips, version stamp, seeds |
| `--text-body` | 13 | 12 · 12.5 · 12.6 · 12.8 · 13 · 13.12 · 13.2 · 13.5 | running text: descriptions, list rows, button text |
| `--text-body-lg` | 15.5 | 14 · 14.5 · 15 · 15.6 · 16 · 16.2 · 16.8 | emphasised body, primary list rows, CTA, card names |
| `--text-title` | 18.5 | **17 †** · 17.4 · 18 · 19 · 20 | panel and section titles |
| `--text-head` | 22.5 | 21 · 21.6 · 22 · 24 | screen headings |
| `--text-figure` | 27 | 25 · 27 | the large readouts: score, credits, KPI values |

**†** the two equidistant values, resolved upward per the tie rule in §3.1.

Above the ladder, unchanged and deliberately outside it: **30 / 38.4** (announcement) and **88**
(wordmark, an Orbitron `clamp()`), plus the exemptions of §5 items 5 and 6.

**Two rows carry the workstream.** `--text-body` absorbs eight of today's values and `--text-meta`
five; together they are most of the menu text. The uniform look is bought by those two collapses, not
by the choice of ratio.

**The `--text-meta` row is where 1.2 is paid for.** At 1.125 this was two rows — `meta` at 10.5 and
`label` at 11.5 — and 302 call sites distinguish those two sizes today. On the chosen ladder they are
one step. **The distinction does not disappear; it moves to the `.ty-*` layer**, which already
expresses it: `.ty-meta` (mono, 400) versus `.ty-badge` / `.ty-screen-title` (sans, 600, tracked,
uppercase) are visibly different roles at the same size, and that is the intended reading. S2 must
resolve any remaining confusion there and **must not reintroduce a size step to fix it** — doing so
would silently return to the 1.125 ladder for one row and leave the system with a private exception.

**Seven steps, seven tokens, and more roles than tokens is expected — more so at 1.2 than it would
have been at 1.125.** `.ty-num text-figure` and `.ty-title text-figure` are different roles on the
same step, differing in family and numeric variant; that is what the two-layer split is for, and why
the token count is not the vocabulary size. The coarser ladder simply pushes more of the vocabulary
onto the `.ty-*` half, which is the half built to carry it.

**The check that must run before S1 writes its first token.** Re-read the size histogram from
`matrix.json` and confirm that **every rendered size maps to exactly one row above** and that no row
is left with zero occupants. A row with no occupants is a name nobody needed. Ran on 2026-08-23
against the stored survey: **no empty rows, and exactly two equidistant values — 10 px and 17 px —
both resolved upward by the tie rule** (§3.1). The check is repeated against the tree S1 actually
branches from, because the numbers here are a baseline, not a constant (§6.5).

**The rule that ships with the table** (into `conventions.md`, §6.4): *a menu picks a role, or
changes a role for everyone. A menu does not introduce a size.*

---

## 4. Scope

**In scope:**

1. A named token set in `@theme` for the desktop UI: size, line-height, and weight/tracking where the
   role implies them. The ladder is the **seven-step 1.2 scale** of §3.1 and the roles are the
   **seven-row table of §3.2** — both fixed in planning, neither left to S2.
2. Value-preserving migration of the **770** size utilities in `src/ui/**` and `src/App.jsx`.
3. Value-preserving tokenisation of the `font-size`/`line-height` declarations in `src/index.css`
   that resolve to a fixed value — **excluding** the container-query and `--gs` families (§5).
4. Desktop-scoped retune of the token values to a coherent scale, in one `@media (min-width: 1280px)`
   block.
5. **Closing the weight ladder leak** (§1.3), **as a cleanup, not a negotiation.** Q2b grants visible
   desktop change, so the ~58 `font-weight:` declarations in `index.css` that bypass the `@theme`
   remap — the source of all 220 off-ladder nodes at 650/700/800/900 — **move onto 400/500/600.**
   Exceptions only where already on record (the large announcement, the workshop preview); a new
   exception needs a reason in the comment, per house rule. **Expected and accepted visible effect:
   some desktop headings render less heavy than today.** That is the intended outcome, not a defect,
   and it is pre-registered here so V4 classifies it as *expected*, not as a finding.
6. **The slashed zero on `.ty-num`** (`font-feature-settings`), carried from the `#typo` log's open
   items — **but committed before V1 is captured, not inside the typography diff.** Rationale and the
   one unverified premise: §6.6.
7. Ratchet handling per §2.3, including the new `.ty-*`/token guard, each counter-checked.
8. A short section in `docs/engineering/conventions.md` — which role to reach for, the §3.2 role
   table, and the rule that a new size is a token change, not a call-site number. **The document has
   no typography section today**; without one the system decays back into call sites within two
   workstreams.
9. Full visual evidence: V1 before the first edit, V2 after Phase 2, V3 human gate, V4 classification
   (§7.4).

10. **Extending the survey's reach to Architekt and Victory**, so the zero-delta oracle covers more
    than two thirds of the migrated surface — §4.1 below, contracted as **S0**.

**Out of scope but named, so it is not re-discovered:** the sibling `icons-*` branches (§1.4) merge
after this workstream and pay the textual merge cost — the freeze (§8.1c Q7b) made that the settled
order rather than a race.

### 4.1 Measurement coverage — the gap, and the decision (settled 2026-08-23, not escalated)

**The finding.** S1's entire justification for existing as a separate task is its acceptance oracle:
re-run the survey, expect zero computed-type deltas. Measured against the 13 surfaces
`viewport-survey.mjs` actually reaches — `hub · upgrades · shop-packs · skill-choice · perk-choice ·
glossary · guide · options · feedback · privacy · stats · leaderboard · run-stage` — that oracle
covers roughly **two thirds** of the 770 size utilities. On screens it never reaches:

| File | Size utilities |
| --- | --- |
| `ArchitectScreen.jsx` | **79** — the heaviest file in the tree |
| `GameOver.jsx` | **38** |
| `DeckDetail` · `BuildSummary` · `RunStats` · `RunGraphs` | 20 · 19 · 15 · 13 |
| `LegendarySelect` · `FormationPhase` · `FamilyTargetSelect` | 13 · 13 · 13 |
| `RunDetail` · `RunConfirm` · `ChronikOverview` | 11 · 10 · 10 |
| **≈ total** | **≈ 254 — a third of the surface** |

The previous strand knew: `survey-findings.md` §4.1 names *"architect · victory screen · run details ·
run dialogs"* as unreached, and identifies the blocker — `DevRunSetup` can build a set schedule but is
`VITE_PREVIEW`-gated, while the survey drives production by contract. It calls that conflict
*"unresolved and the remaining work."*

Sharpening it: **Architekt and GameOver are also two of the six screens the `#typo` pass never looked
at** (`docs/decisions/engineering-log-2026-08.md`). Left as is, they would receive neither a machine
check nor a human one.

**The decision — extend for those two, record the rest.**

1. **Reach Architekt and Victory before V1 is taken.** 117 utilities, 15 % of the surface, and the two
   largest single items. The route is the one already proven for the perk choice — `{ turbo: true }`
   plus `{ until, maxMs }` — not `DevRunSetup`: measuring a preview build would break the property
   the survey exists for, that **the tree measured is the tree that ships**. §4.1's objection that
   these screens *"sit further into the round schedule than a survey can wait for"* was a judgement
   about a routine survey's time budget, not a property of the game; a baseline taken twice in a
   workstream can afford minutes a routine survey cannot. **Time-boxed at 4 minutes per cell,
   measured on one cell before the budget is spent.**
2. **The remaining ~137 utilities across twelve small files become a written reduced criterion** —
   the downgrade record `task-lifecycle.md` §11 requires, not a silence. **Compensation, named now
   rather than improvised later:** those screens are migrated under human review at V3 instead of the
   zero-delta gate, and they are listed by name in S1's handoff so the V3 reviewer knows where to
   look hardest.

**Why this was settled here and not put to the owner** (`AGENTS.md` — *Decision authority*;
`task-lifecycle.md` §2, *"Not stops: technical choices"*): which surfaces a measurement script reaches
is a technical question with a measurable answer. What would have needed the owner — a reduced
acceptance criterion — is discharged by writing the downgrade record, which is a deliverable, not a
question.

## 5. Non-goals

1. **No change to the mobile UI.** Guaranteed structurally, not by care: base token values stay at
   today's numbers and every retune is inside the desktop media query. Mobile pixel-identity is an
   acceptance criterion (§7.3), not an aspiration.
2. **The system is not required to be mobile-ready.** A later mobile strand may collapse the base
   values onto the same roles; nothing here is designed to block that, and nothing here promises it.
3. **No new fonts, no new families, no new weights.** Geist / Geist Mono / Orbitron / Georgia stay as
   they are. (House rule: a new family would be a new dependency and an owner decision.)
4. **`.ty-*` roles are not renamed or removed.** They are eight days old and correct.
5. **Container-query text is exempt.** The three `clamp(…cqw…)` rules and the `--gs` family solve a
   different problem (fit-to-box, not a scale step). They keep their guards.
6. **Game-piece text is not part of the menu scale.** Card marks, board counters and floats
   (`CardGrid.jsx`, `ArchitectScreen.jsx`, `Battlefield.jsx`) are sized against artwork, not against
   reading distance. They may take tokens of their own; they do not take the menu roles.
7. **No layout change.** If a retuned size overflows a lane, the finding is classified (V4) and
   returned — this workstream does not also re-cut lanes.
8. **No `@layer` restructuring of `index.css`.** F1 is load-bearing and stays.
9. **No PR, no push to `test`/`main`, no commit** beyond what the task contract authorises.

### 5.1 What "pull it straight once" does and does not buy (Q1b)

The owner's instruction is that the system is straightened **now**, not revisited by hand later. Held
against the non-goals above, that produces three categories, and conflating them is how the promise
gets broken:

| | Status |
| --- | --- |
| **Straightened permanently** — the 770 call sites, the tokenisable CSS declarations, the size ladder, the weight ladder, the role vocabulary | Done here. A future change is one edit per role. **This is the deliverable.** |
| **Permanently outside the system** — items 5 and 6: fit-to-box text (`clamp(…cqw…)`, the `--gs` family) and game-piece text (card marks, board counters, floats) | **Not deferred work.** These are sized against a box and against artwork, not against reading distance; a reading scale is the wrong instrument for them. They will still be outside the menu roles in a year, by design. |
| **Genuinely deferred, one later pass** — **mobile keeps its 39-value spread** | The direct price of non-goal 1. Named in §0.3 and §8.1 as carried; it needs a backlog ID, not a date. |

**The mobile row is the honest asterisk on "once".** It is made as cheap as a deferral can be: because
every retune is expressed as a desktop override of a *token*, a later mobile strand collapses the base
values in **one block** rather than repeating a 770-site substitution. The second appointment is real;
its cost is not.

## 6. Worker split

### 6.1 Three tasks, sequential, one branch line

**Yes — the brief's instinct is right, and the measurement says where the seam goes.** The seam is not
"definition vs. migration"; it is **"provable no-op" vs. "visible change"**. Definition and migration
belong together, because a token set defined without migrating it is a guess about the clustering.

**Split into three on 2026-08-23**, when §4.1 showed the acceptance oracle covered two thirds of the
surface. Extending its reach has to happen *before* the baseline is taken, and it is harness work with
a different risk profile from a codemod — so it is its own task rather than a sixth part of S1.

| | **S0 — reach + V1** | **S1 — tokens + value-preserving migration** | **S2 — collapse, retune, document** |
| --- | --- | --- | --- |
| Delivers | Survey reaches Architekt + Victory; inventory re-measured; **V1 capture set**; coverage + downgrade record | Token set in `@theme`; 770 call sites + tokenisable CSS declarations migrated; 5 ratchets handled; new guard | Roles collapsed to the ladder; desktop `@media` override; weight-ladder leak closed; `conventions.md` section |
| Touches | `scripts/viewport-survey.mjs` + evidence. **Zero `src/**`** | `src/**`, mechanically | `src/index.css` values, `conventions.md` |
| Visual result | **None.** Nothing is edited | **None.** Byte-identical rendering | The uniform look |
| Verified by | Its own diff being `src`-free, and the capture set existing | Machine: `matrix.json` re-run, zero size/weight/family deltas (§7.1) | Human: V3 gate on V1↔V2 (§7.4) |
| Reviewer | None needed | **Independent review requested** | None — its gate is human eyes |
| Ratchets | None | All five handled here | None expected |

**Branch shape** (Tier C, `task-lifecycle.md` §2): `feature/typo-system` is cut once from `dev`; the
tasks sit below it as `task/typo-v1-survey`, `task/typo-s1-tokens`, `task/typo-s2-scale`, each merging
up. `feature/typo-system` reaches `dev` once, after the V3 gate.

One more change lands on that line before S0: the **slashed-zero one-liner**
(`task-note-slashed-zero.md`, Tier A), which must be in the tree *before* V1 is captured — §6.6.

**Sequential sessions, one task branch each** — `AGENTS.md` permits sequential continuation in a
worktree explicitly, and it is what the viewport-1280 strand did (T1 → T1b → T2).

**Why not parallel:** S1 needs S0's baseline to have anything to compare against; S2 retunes tokens
that S1 creates. Two writers in one worktree is forbidden, and separate worktrees would mean S2
guessing at S1's names.

**All three contracts are written** and live in this directory — `task-contract-S0.md`,
`task-contract-S1.md`, `task-contract-S2.md`, plus `task-note-slashed-zero.md`. **S2's was written
now, before S1 starts, deliberately:** it carries the whole visible change, and drafting it after S1
finishes would mean drafting it under the schedule pressure R9 names.

S1's contract settles one question this report left open — how S1 stays value-preserving while S2
still ends with clean role names. The answer is its *Approved architecture* A2: provisional tokens are
named for the ladder **band** they will land on, with numbered variants for the several current values
inside a band, so S2's collapse re-points values **without touching a call site**, and the later
removal of the variants is a pure rename a machine can verify. Where contract and report disagree,
the contract wins.

### 6.2 V1 is taken in S0, before S1 starts

`task-lifecycle.md` §8: the baseline is captured **before the first pixel moves**, not reconstructed.
S1 is expected to move zero pixels — which is precisely why its baseline is the honest one, and why
capturing it late would destroy the evidence that S1 was a no-op. **As of 2026-08-23 the capture is
S0's deliverable**, not S1's part 2, because the survey's reach had to be extended first (§4.1).

**Two things must land before that capture, in this order** (both added 2026-08-23):

1. the `icons-*` merge into `dev` — otherwise V1 attributes icon work to this workstream (§6.5);
2. the **slashed-zero one-liner** — otherwise every digit-bearing screen carries an unrelated pixel
   diff through the V3 comparison (§6.6).

Neither belongs inside the typography diff. Both are pre-baseline work, and the capture is taken once
they are in.

### 6.3 Independent review — recommended, not required

`AGENTS.md` makes it risk-based. The recommendation: **request one, scoped to S1's mechanical diff.**
The reasons are specific rather than ceremonial — a 64-file substitution has a defect mode (one
wrong token at one call site) that neither the test suite nor a screenshot reliably catches, and it
edits three ratchets. S2 does not need one: it is a small diff whose real gate is human eyes (V3).

### 6.4 Handoff to the "adapt all menus" workstream

**As of Q5b this is a strict predecessor, not a parallel track: the menu workstream waits for this
one, because its text sizes depend on the roles defined here.** Three consequences, all tightening:

- **The role table must be complete at handoff.** A waiting consumer cannot request a missing role;
  it would invent a call-site number instead. This is why §3.2 exists and why the vocabulary left S2.
- **Lane re-cutting has a named owner downstream.** A retuned size that overflows a lane is a V4
  finding handed to the menu pass — which re-cuts lanes anyway. This is what downgrades R4.
- **This workstream is now on the critical path for all menu work** (new risk R9). The schedule
  pressure lands squarely on V3, the one gate that cannot be automated away.

The deliverable that workstream consumes:

1. **The token table** — role name, base value, desktop value, intended use — in
   `docs/engineering/conventions.md`, not in this report. A planning report is a record of a
   decision; a conventions section is an instruction that survives it.
2. **One rule, stated so it cannot be misread:** *a menu adjusts by choosing a different role, or by
   changing a role for everyone. A menu does not introduce a size.* That rule is what makes the
   system hold; without it the next pass re-creates the 39 values.
3. **The escape hatch, and its price:** where a menu genuinely needs a value no role provides, it
   proposes a **new role** — reviewed once, available to all. Not a call-site number.
4. **The exemption list** (§5 items 5 and 6), so the menu pass does not "fix" container-query text
   into fixed steps and undo a deliberate decision.
5. **The V2 capture set** as that workstream's V1 baseline, avoiding a duplicate capture run.

### 6.5 Start condition — checked, not assumed

*The original text — "S1 branches only after the `icons-*` work is merged into `dev`", with a
`git worktree list` check for unmerged icons work — is **withdrawn**. Under the freeze (Q7b)
`task/icon-position-review` stays unmerged by decision, so that check would never pass and a worker
obeying it would correctly refuse to start. It has been replaced in `task-contract-S1.md` as well;
this paragraph records that it was removed on purpose, not lost.*

**The condition that now applies:**

```bash
git fetch origin
git rev-parse --short origin/dev                       # record this SHA; it is the base
git merge-base --is-ancestor origin/main origin/test && \
git merge-base --is-ancestor origin/test origin/dev     # ancestry intact
```

Per task: **S0** needs only the above. **S1** additionally needs S0 merged into `feature/typo-system`
with its V1 capture and coverage record. **S2** additionally needs S1 merged with its zero-delta gate
met. Each contract states its own.

**Status of the condition, measured 2026-08-23 at `dev` = `2eddf9d3`:**

| Branch | Commits not on `origin/dev` | Verdict |
| --- | --- | --- |
| `task/icons-corners` · `task/icons-perks` · `task/icons-skills` | 0 · 0 · 0 | **Merged.** The condition as written in §8.1 Q3 is met |
| `task/icon-position-review` | **3** | Not merged. Touches `docs/**` and `scripts/**` only — **no `src/ui/**`**, so it cannot collide with the substitution |

**Condition CLOSED — owner, 2026-08-23 (Q7b).** `task/icon-position-review` **waits as well**, and
more broadly: *no desktop change lands on `dev` until this workstream is finished.* That is stronger
than the sequencing §8.1 Q3 asked for — R3 is not designed out, it is out of scope for the duration.
Three consequences:

- **V1 can be captured now**, from `dev` = `2eddf9d3`. Nothing further will move under it.
- **The capture harness is frozen too, and that is a gain rather than a compromise.**
  `icon-position-review` would have changed `scripts/cdp.mjs`; because it waits, V1, V2 and the
  stored `matrix.json` are all produced by the same harness. The "pin the harness commit" mitigation
  is no longer needed.
- **The emblem follow-up ("all 112 emblems to center 25 %") integrates after this workstream** and
  pays the textual merge cost. That is the right way round: it edits image crops and positions, this
  edits class attributes on the same files — two mechanical diffs that do not overlap semantically.

The freeze also means the §1.3 inventory numbers, previously flagged as "a baseline, not a constant",
**are constant for the duration.** The re-measurement before S1 stays in the contract as a cheap
confirmation, not as a real risk.

### 6.6 The slashed zero — before V1, not inside the diff (Q6b)

Carried from the `#typo` log's open items: Geist Mono sets a slashed zero, which reads oddly in the
score HUD, and it is centrally switchable on `.ty-num` via `font-feature-settings`.

**Recommendation: do it — it is exactly the class of change this system exists to make, one line
reaching every screen. But commit it as its own change *before* V1 is captured.**

The sequencing is the whole point. Changed between V1 and V2, it puts a pixel diff on **every screen
containing a digit**, and the human reviewer at V3 has to filter it out of every comparison — on the
one gate that carries this workstream's central claim. Committed before the baseline, V1 already
contains it and the typography comparison stays readable.

It does not threaten the mobile criterion (§7.3): in a monospace face the slashed and unslashed zero
share an advance width, so geometry does not move. That is the reasoning, and it is still checked
rather than assumed — the geometry probe runs either way.

**One premise is unverified and must not be assumed:** *which* OpenType feature toggles it. The woff2
is compressed, so the feature list is not readable from the file; candidates are `zero`, `ss01`–`ss03`
and `cv01`. This is a ten-minute browser measurement — render a digit, try each feature, confirm the
advance width is unchanged — and it belongs in the contract as a check, not in this report as a fact.

## 7. Acceptance criteria

### 7.1 S1 — machine-checkable, and the reason the split exists

- **Re-running the survey over the same 13 screens × 5 widths × 2 languages yields zero deltas in
  computed `font-size`, `font-weight` and `font-family` on every matched node** against the stored
  `matrix.json`. A non-zero delta is a defect in S1, not a design question. This is the criterion
  that makes "provably a no-op" a measurement rather than a claim.
- No `text-[Npx]` size utility remains in `src/ui/**` outside the §5 exemptions. Guarded, so the
  next pass cannot quietly add one back.
- Class order inside every rewritten attribute is unchanged (protects `go-ruhe:401`).
- All four gates green: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
  `npm run gen:db`. Bare commands, unpiped — a failing run must be able to fail.
- Preview build (`VITE_PREVIEW=1`) also builds — the capture harness lives behind that gate.
- Each touched guard counter-checked by deliberately breaking its seam and observing the failure.

### 7.2 S2 — the system holds

- Every menu size resolves through a token. The count of distinct rendered sizes across the 13
  desktop screens drops from **39** to the **seven ladder steps of §3.1 plus the display sizes**; the
  residue is exactly the §5 exemptions, enumerated, not estimated.
- **Guide and glossary are measured individually**, not just included in the total: they carry 29 and
  22 distinct sizes today and are the two screens the owner named (§8.1 Q2). Each must land on the
  ladder, and each gets its own V3 comparison.
- **The predicted displacement holds — and at 1.2 the criterion is a corridor, not a ceiling.**
  Re-running the §3.1 fit against the built result shows **~42 % of menu text moved by more than 5 %,
  worst case ~10 %**. *(Rewritten 2026-08-23: the previous "no more than ~2 %" belonged to the 1.125
  ladder and would now fail by design.)* Both a materially **larger** figure and a materially
  **smaller** one are defects: larger means the collapse overshot, smaller means it did not happen
  and some screen kept its old values. **The worst case is the load-bearing half** — anything above
  ~10 % means a value did not land on its intended step, and that is where clipping comes from.
- **Every new clip, overflow and scrollbar at 1280×720 is found and written down** — the binding
  viewport, §7.4b. ~~A panel that overflows there is a defect.~~ **Relaxed by the owner on 2026-08-23
  (§8.1d Q11b):** overflow is a **recorded observation handed to the rework**, not a blocker. What
  still blocks is text that cannot be **read** — clipped to nothing, overlapping into illegibility,
  or unreachable in a scroll region.
- Distinct rendered weights are back to the documented ladder, or each survivor is a named exception
  with its reason at the declaration.
- **The one-edit test, performed and recorded:** change one token value, rebuild, and every screen
  using that role moves. This is the goal restated as an experiment; if it fails, the workstream has
  not delivered regardless of how the screens look.
- A new size cannot be introduced at a call site without failing a guard.

### 7.3 Mobile — unchanged, proven

- **Pixel-identical** phone captures before and after, via `phone-proof.mjs` at the established phone
  size, both languages, all covered screens. Anything above the harness's own documented noise floor
  is a defect.
- No base token value differs from the value it replaced; every retune is inside the desktop media
  query. Guarded.

### 7.4 Visual review — full V1–V4, per `task-lifecycle.md` §8

- **V1** before S1's first edit: complete capture set — **every screen × every desktop viewport
  (1280×720 · 1536×791 · 1600×900 · 1920×1080) × both languages × 1× and 2× DPR**, plus the phone
  baseline for §7.3. State, sizes and DPR recorded so V2 can match them exactly.
- **V2** after S2, same screens, same sizes, same DPR, same seeded state.
- **V3** human gate, presented as a **plain before/after pairing per screen** — the owner's stated
  requirement (§8.1d Q11b: *"vorher nachher reicht"*). No overlays, no diff heatmaps, no worker
  commentary asking to be agreed with. A person compares V1 and V2 and judges the uniform look.
  **An agent does not report a visual result as approved**, and this workstream's central claim —
  "the menus now look like one product" — is not a claim any automated layer can make. The relaxed
  criteria change what counts as a defect; they do not move the judgement to the worker.
- **V4** classification: every finding gets a row and an ID in one of the four dispositions.
  Findings that exist only in a chat message are lost. **After Q11b, expect most findings in
  "New design question → backlog entry, named as input to a future workstream"** — the
  menu-and-panel rework. Accepted overflow still gets an ID; the set of IDs *is* the rework's input,
  which is why "we'll fix it later" is not a disposition and writing it down is not optional.
- The DPR pair is not optional here: sub-pixel rounding of a new scale is exactly the class of defect
  that appears at 2× and not at 1×.
- **The 1400×700 cell of `matrix.json` is captured too**, even though it is not in the V1 list above:
  it is the second short viewport and the cheapest cross-check on the height finding of §7.4b.

### 7.4b 1280×720 is the binding viewport for the retune (Q3b — itch.io)

The viewport set already covers 1280×720; the harness has measured it since the viewport-1280 strand,
and 1280 is the desktop threshold (`--breakpoint-dt`). So the owner's itch.io requirement adds no
capture. **What it changes is which viewport the retune is tuned *at*.**

Two facts make 720 the constraint rather than one column of five:

1. **No design rule exists for that height.** The height-gated blocks stop at `max-height: 820px`;
   720 falls into the 820 branch, which was tuned for 820 and has never been examined at 720.
2. **The recommended ladder pushes reading text upward** (12 px → 13 px, §3.1), adding vertical
   pressure precisely where there is least room.

**Working rule for S2: tune at 1280×720 and verify upward, never tune at 1920 and check downward.**
If 13 px will not fit the panels there, the base becomes 12.5 — one number in one block, which is the
system doing its job rather than a concession.

**One thing to settle when the itch.io page is set up, not now:** itch embeds the build in an iframe
of **fixed** frame size, so the usable height can be below 720. Once that frame is chosen, its inner
height — not 720 — is the binding number, and this section is re-read against it.

### 7.5 Integration readiness

Per `AGENTS.md`: scope implemented and the contract met; gates run and evidence present; branch clean
and committed; V3 passed; open findings either fixed or recorded with their consequence stated.

## 8. Risks and open questions

### 8.1 Owner decisions, 2026-08-22

| # | Question | Decision |
| --- | --- | --- |
| Q1 | How uniform is uniform? | **Follow the industry convention rather than invent one.** Resolved in §3.1: named roles over a modular ladder, ratio chosen from the dense-UI band and then fitted to this product's measured values — 1.125, body 13 px, ten steps. The alternative the owner rejected implicitly by asking for the standard is a hand-tuned set that is only tidier than today. **The principle stands; the ratio was superseded on 2026-08-23 (§8.1c Q8b) — 1.2, body 13 px, seven steps. The 13 px anchor survived unchanged.** |
| Q2 | May guide (29 sizes) and glossary (22) change visibly? | **Yes — they are explicitly in scope and are to be adapted.** They are the two screens the system exists for; leaving them out would have made the uniform look unachievable on the exact screens that demonstrate it. |
| Q3 | Start condition | **Planning proceeds now; implementation starts once the `icons-*` feature branch is through and merged into `dev`.** This closes R3 by sequencing rather than by conflict resolution — see §6.5. |

Q3 also removes the last thing that could have blocked S1.

*Superseded by §8.1b: the second pass left the role count to S2. Q1b and Q5b together made that
unaffordable, and it is now decided in §3.2.*

**One item carried, not scheduled:** mobile keeps its 39-value spread (§0.3, §5 item 2). It needs a
named backlog entry so it is a known deferral rather than an oversight, but no date.

### 8.1b Owner decisions, 2026-08-23

Answers to the second-pass questions. **Q4b is recorded because it invalidated an entire analysis
round, and the correction is more useful than the answer.**

| # | Question | Decision |
| --- | --- | --- |
| Q1b | Cleanest solution; half-values acceptable; **straighten once, no later manual pass** | Half-values sanctioned. The instruction's real bite is elsewhere: the **role vocabulary moves into planning (§3.2)**, and the three categories of "once" are separated in **§5.1** so the mobile deferral is visible rather than implied. On the ratio, this round recommended keeping 1.125 and recorded 1.2 with its price so an override would be informed — **and the owner took that override the same day (Q8b, §8.1c). The ladder is 1.2 / base 13 / seven steps.** |
| Q2b | The weight ladder, explained; **changing the desktop look is fine — we're touching it again anyway** | **The leak is closed as a cleanup, not a negotiation** (scope item 5). All 220 off-ladder nodes move to 400/500/600; exceptions only where already on record. **Pre-registered visible effect: some desktop headings render less heavy.** Expected at V4, not a finding. |
| Q3b | 1280×720 must be covered — itch.io release | Already in the capture set, so **no new captures**. What changes is the tuning anchor: **1280×720 becomes the binding viewport** (§7.4b), because no design rule exists below `max-height: 820px` and the ladder pushes text upward. Working rule: tune at 720 height, verify upward. The itch iframe's inner height supersedes 720 once chosen. |
| Q4b | Wrong local repository | **The prior round was measured against a stale tree** (`…/GameDev/autostich`, branch `main`). Four premises broke: the desktop threshold is **1280 px, already centralised** as `--breakpoint-dt` with a `dt:` variant at 135 sites — not 1400 px with 134 inline arbitrary variants; **V3/V4 are the human gate and classification**, not further capture sets; the **capture harness exists and the survey has run**; and **this report already existed**. The front measurements (770 utilities, 164 CSS declarations, the ratchet counts) reproduced identically, so the substance carried and the conclusions did not. **Rule taken forward: verify the tree before measuring it** — §6.5 already says the numbers here are a baseline, not a constant. |
| Q5b | Menu work **waits** for this workstream | Turns the handoff into a **strict predecessor** (§6.4). Role table must be complete at handoff; lane re-cutting gains a named downstream owner (**R4 downgraded**); this workstream moves onto the critical path for all menu work (**R9**). |
| Q6b | Slashed zero — recommendation | **Do it, and commit it before V1** (§6.6). One line on `.ty-num`, no metric change, and sequencing it ahead of the baseline keeps a digit-wide pixel diff out of the V3 comparison. **The OpenType feature that toggles it is unverified** — a ten-minute browser measurement, in the contract as a check, not here as a fact. |

### 8.1c Owner decisions, 2026-08-23 (second round)

| # | Question | Decision |
| --- | --- | --- |
| Q7b | Does S1 wait for `task/icon-position-review` too? | **Yes — and further: no desktop change lands on `dev` until this workstream is finished.** A freeze, not a sequence. Closes R3 outright, freezes the capture harness (a gain — one harness across V1, V2 and the stored survey), makes the §1.3 numbers constant for the duration, and defers the emblem follow-up's merge cost to the party that edits image crops rather than class attributes. **V1 can be captured now.** §6.5. |
| Q8b | Ratio 1.2 instead of 1.125 | **Taken, with the consequence stated back** — *"lieber jetzt einmal Desktop sauber aufsetzen"*, and every menu is walked afterwards anyway. Re-fitted rather than adopted from the old table: **1.2, base 13, seven steps — 9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27**, ~42 % of menu text moving > 5 %, worst case **10.0 %** (the lowest of any 1.2 fit, and the number that governs clipping at 720 px height). Tie rule for the two equidistant values: **upward** — 10 → 11, 17 → 18.5. §3.1, §3.2. |
| Q9b | Frames and panels have the same problem | **Confirmed by measurement, and scoped out of this workstream as a named successor.** §9. |
| Q10b | "Do everything we need in order to start" | Done, 2026-08-23. Three contracts written (`S0`, `S1` revised, `S2`) plus the slashed-zero note; the stale `icons-*` start condition replaced by the freeze; the branch shape fixed to Tier C. **The one substantive finding along the way is §4.1** — the acceptance oracle covered two thirds of the surface — **settled technically rather than escalated**, per the standing instruction that technical questions are decided, not presented. |

### 8.1d Owner decisions, 2026-08-23 (third round) — the visual bar

| # | Question | Decision |
| --- | --- | --- |
| Q11b | What does the V3 gate need, and how good must the result look? | **"Vorher nachher reicht. Und wenn die Menüs und Panels fucked sind, ist das ok — ein komplettes Rework steht nach diesem Umbau eh aus."** Two consequences, both real relaxations: **(a)** V3 is a plain before/after pairing per screen — no overlays, no heatmaps, no commentary seeking agreement. **(b)** Layout breakage is **no longer a defect**: clipping, overflow and new scrollbars, including at 1280×720, drop from acceptance gate to **recorded observation** and are handed to the rework as input. |
| Q12b | Which state does V1 capture? | **Not answered, and not re-asked.** The stated default stands: **fresh, deterministic state** — the settings the existing proof scripts already enforce (seeded `Math.random`, seeded username, telemetry off, reduced motion, minimal effect tier, animations pinned). Reproducibility is the property V2 depends on; a personal save with arbitrary unlocks is not reproducible. |

**What Q11b does not relax, and this needs to be said plainly rather than assumed:** *unreadable* is
still a defect. Text clipped to nothing, overlapping into illegibility, or pushed out of a scroll
region with no way to reach it does not become acceptable because a rework is scheduled — it would
mean the retune produced a state nobody can even review. "Ugly" is in scope for the rework;
"cannot be read" is a defect in S2. That line is written into S2's acceptance gate.

**And one dependency the owner should see stated, not discovered:** these relaxations assume **nothing
ships between this workstream and the rework.** If a build goes to itch.io in between, 1280×720
clipping stops being a note for the rework and becomes the public first impression — at which point
S2's 720 criterion comes back as a gate. No decision needed now; it is written here so the question
surfaces at release planning rather than at release.

**Why Q11b makes the earlier decisions fit better rather than worse.** The 1.2 ladder was chosen
knowing ~42 % of menu text would move and lanes would need re-cutting (§8.1c Q8b). That cost was
accepted on the grounds that the menu pass would pay it. Q11b confirms the payer exists and is
committed — so the ratio decision now rests on a scheduled successor rather than an expectation. It
also removes real waste: effort spent making panels fit at 720 would have been thrown away twice, once
by the rework and once by hiding a finding the rework needed.

**Consequences of Q8b that are not obvious from the ratio alone**, and are therefore written into the
sections that carry them: the role table shrinks from ten rows to **seven** (§3.2); `meta` and `label`
merge onto one step, pushing that distinction onto the `.ty-*` layer (§3.2); and the S2 acceptance
criterion for displacement **inverts from a ceiling to a corridor** — at 1.2, *too little* movement is
as much a defect as too much (§7.2). A plan that changed the ratio without changing that criterion
would have failed its own gate on delivery.

### 8.2 Technical questions settled here, not escalated

- Token namespace, `.ty-*` retention → §3.
- Exemptions for container-query and `--gs` text → §5.
- Task split and branch structure → §6.
- Ratchet handling → §2.3.

### 8.3 Risks

| # | Risk | Likelihood | Consequence | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | One wrong token at one call site in a 64-file substitution | **High** — this is the defect mode of any codemod | A single element renders at the wrong size, unnoticed for weeks | §7.1's zero-delta check catches it **by machine, node by node**. This risk is the reason S1 exists as a separate task |
| R2 | `@theme` is later changed to `@theme inline`, or a `font-size` is added to a `.ty-*` rule | Low | The whole mechanism silently stops being central — the failure is invisible until someone edits a token and nothing moves | Both guarded (§7.1, §2.3 item 4), both counter-checked |
| R3 | ~~Merge collision with the three open `icons-*` worktrees~~ | — | — | **Closed by the owner's decision, 2026-08-22 (§8.1 Q3):** `icons-*` lands on `dev` first; S1 branches after. The conflict is designed out rather than resolved, which is the only handling that cannot silently drop a token. §6.5 states the precondition to check before branching |
| R4 | The retune overflows a lane the viewport-1280 pass tuned to fixed pixels | ~~Medium~~ → **High**, consequence **accepted** | Lanes tuned in the viewport-1280 pass need re-cutting | **Re-rated three times on 2026-08-23, and it has stopped being a risk.** Q5b gave overflows a named downstream owner (the menu pass re-cuts lanes anyway) — consequence down. Q8b raised the likelihood sharply: at ratio 1.2, ~42 % of menu text moves, so overflow is the expected case. Q11b then accepted it outright — *"wenn die Menüs und Panels fucked sind, ist das ok"*. Net: **a planned cost with a committed payer.** Still classified at V4 and handed on, never silently re-cut here (§5 item 7) — that discipline is now the *point*, because each un-fixed overflow is an input the rework needs and each hasty fix hides one |
| R5 | Phase 1 is mistaken for the finished workstream | Medium — it will look complete and every gate will be green | The system exists but the look is unchanged; the goal is unmet | One workstream, one acceptance gate. S1's own criteria state its visual result is **none** |
| R6 | The suite goes green while the UI is wrong | **Certain in principle** — the suite does not render (`testing.md` §10) | False confidence | V3 is a gate, not a courtesy. No agent reports the visual result as approved |
| R7 | The `--gs` calc family and container-query rules get tokenised by an over-eager codemod | Medium | A guard fires, or worse, fit-to-box text becomes fixed and clips | Exemptions enumerated in §5 **before** the codemod is written, and `go-ruhe:466` fires if it happens |
| R8 | **The upward-anchored ladder (12 → 13 px) does not fit 720 px of height** | ~~Medium~~ → **High** likelihood, consequence ~~High~~ → **Low** (Q11b) | ~~The first impression of the public build~~ → a list of overflow findings handed to the rework. **Only if a build ships before the rework does the original consequence return** — §8.1d | Tune **at** 1280×720 and verify upward (§7.4b) — the rule survives because it decides the *base*, which the rework inherits. **But "no new clipping at 720" is no longer a gate** (Q11b): overflow is measured, written down and passed on. What still blocks is text that cannot be **read**. Fallback remains one number: base 13 → 12.5 |
| R10 | **A third of the migration has no machine check** (§4.1) | **Certain unless acted on** — measured, not feared | 254 utilities migrated with no zero-delta gate, on screens including the heaviest file in the tree; a wrong token there surfaces weeks later | **S0** extends the survey to Architekt and Victory (117 of the 254) before V1 is taken. The remaining ~137 become a written downgrade record with a named compensation: human review at V3, and the screens listed by name in S1's handoff so the reviewer knows where to look hardest. **The residual risk is real and is accepted in writing rather than absorbed silently** |
| R9 | **This workstream is on the critical path for all menu work** (Q5b) | Medium | Schedule pressure lands on V3 — the human gate — which is the one step that cannot be automated and the one this workstream's central claim depends on | Named here so the pressure is visible before it is felt. V3 is a gate per `task-lifecycle.md` §8; **an agent must not report the visual result as approved**, and a skipped V3 is a downgrade needing a record (§11 of the lifecycle), not a judgement call in the moment |

---

## 9. The successor: frames and panels (Q9b) — named, measured, out of scope

The owner's assumption on 2026-08-23 — *"ich gehe davon aus, dass wir für die Menüs auch eine Rahmen-
und Panel-Vereinheitlichung machen, dort haben wir das gleiche Problem"* — is **correct, and in two
places worse.** Measured the same way as §1.3, same tree:

| Axis | Declarations in `index.css` | **Distinct values** |
| --- | --- | --- |
| `box-shadow` | 85 | **51** |
| `padding` | 202 | **123** |
| `background` | 237 | **116** |
| `border-radius` | 123 | **29** |
| `border` | 83 | 34 |

Plus **476 `rounded-*`** and **345 `border-*`** utilities in the JSX. 51 distinct shadows is more
spread than the 39 sizes this workstream exists to collapse.

**And the starting position is the same shape:** a half-built language already exists — `as-ring`
(89 JSX uses), `as-edge-*` (143), `phaseCard` / `phasePanel` / `PHASE_ACCENTS` / `PANEL_BG` in
`modalStyle.jsx` (18). As with `#typo`, it settles some dimensions and stops short of the rest.

**Two differences that make it a separate workstream rather than a second phase here:**

1. **A third mechanism.** `phaseCard` returns **inline styles from JS**. Typography had two consumers
   (utility and stylesheet); panels have three, and inline beats both others. The `@theme`-token
   mechanism of §2.1 does not reach an inline style — that strand needs its own answer, and finding
   it inside this diff would mean deciding it under time pressure.
2. **No modular ladder to reach for.** A type scale has an industry convention and a ratio (§3.1).
   Radii, elevation and padding have conventions but no single derivation, and they interact with the
   deck-colour system (`--deck-a1`, `--deck-border`) and the "Kante statt Fläche" rule, which are
   design decisions rather than arithmetic. That strand needs an owner design round; this one did not.

**Kept out of scope deliberately, not by oversight:** mixing surface changes into the typography diff
would destroy the one property that makes S1 checkable — computed *type* deltas of exactly zero — and
would give the V3 reviewer two variables where the workstream's claim needs one.

**Ordering, recommended:** type → panels → menu pass. Both systems should be finished before the menu
pass starts, for the same reason the owner gave for this one (Q5b): a menu adjusted against half a
system is a menu adjusted twice. That makes the panel strand, not this one, the last gate before the
menus — worth knowing now, because it changes what "when are the menus unblocked" means.

**No planning has been done for it here** beyond the inventory above. It needs its own report.

---

## Appendix — reproduce the measurements

```bash
# 39 distinct rendered sizes, 8 weights, 5 families (de @ 1920x1080, 13 screens, 2062 nodes)
node -e '
const m=JSON.parse(require("fs").readFileSync("docs/workstreams/viewport-1280/evidence/survey/matrix.json","utf8"));
const s=new Set(),w={},f={};
for(const [k,c] of Object.entries(m.cells)){ const [l,v]=k.split("/"); if(l!=="de"||v!=="1920x1080")continue;
  for(const e of (c.type||[])){ s.add(e.size); w[e.weight]=(w[e.weight]||0)+1;
    const fam=String(e.family||"").split(",")[0].replace(/"/g,"").trim(); f[fam]=(f[fam]||0)+1; } }
console.log([...s].sort((a,b)=>a-b).join(" "), "\n", w, "\n", f);'

# 2.9 % of text nodes change size between 1920 and 1280
# (same file; match nodes by cells[*].type[*].path across the two viewport keys)

# 770 size utilities across 64 files; 35 carry the desktop variant
grep -rohE "\btext-\[[0-9.]+px\]|\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b" src --include=*.jsx --include=*.js | wc -l
grep -rohE "dt:text-\[[0-9.]+px\]|dt:text-(xs|sm|base|lg|xl|2xl|3xl)" src --include=*.jsx | wc -l

# Only four test files assert on typography at all
grep -rlnE "text-\[|text-(xs|sm|base|lg|xl|2xl|3xl)|font-size|leading-|tracking-" test/

# 164 font-size / 58 font-weight declarations in index.css; no font-[NNN] anywhere in the JSX
grep -c "font-size" src/index.css
grep -ohE "font-weight:[^;]*;" src/index.css | sort | uniq -c
grep -rohE "font-\[[0-9]+\]" src --include=*.jsx | wc -l

# The roles carry no font-size, and why (F1)
sed -n '745,835p' src/index.css

# Tailwind 4.3.3 supports the --text-* namespace with paired line-height
grep -n -- "--text-xs" node_modules/tailwindcss/theme.css
```

**The §3.1 scale fit.** Node-weighted displacement of every menu text node against a modular ladder,
for each candidate ratio and base. Half-pixel grid; battlefield and display sizes excluded; the
9–27 px band is 93.9 % of menu text.

```js
// node scalefit.mjs   (run from the repository root)
import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("docs/workstreams/viewport-1280/evidence/survey/matrix.json","utf8"));

const hist = new Map();
for (const [k, c] of Object.entries(m.cells)) {
  const [, vp, scr] = k.split("/");
  if (vp !== "1920x1080" || scr === "run-stage") continue;      // battlefield has its own rules
  for (const e of (c.type || [])) {
    if (e.size >= 40) continue;                                 // wordmark / hero: own roles
    hist.set(e.size, (hist.get(e.size) || 0) + 1);
  }
}
const band = [...hist.entries()].filter(([s]) => s >= 9 && s <= 27).sort((a, b) => a[0] - b[0]);
const total = band.reduce((a, [, n]) => a + n, 0);

const ladder = (base, r) => {
  const o = new Set([base]);
  for (let v = base * r; v <= 27.001; v *= r) o.add(v);
  for (let v = base / r; v >= 8.999; v /= r) o.add(v);
  return [...new Set([...o].map(v => Math.round(v * 2) / 2))].sort((a, b) => a - b);
};
const score = (u) => {
  let shift = 0, moved = 0, worst = 0;
  for (const [size, n] of band) {
    const nearest = u.reduce((b, x) => Math.abs(x - size) < Math.abs(b - size) ? x : b, u[0]);
    const d = Math.abs(nearest - size) / size;
    shift += d * n; if (d > 0.05) moved += n; worst = Math.max(worst, d);
  }
  return { shift: 100 * shift / total, moved: 100 * moved / total, worst: 100 * worst };
};

for (const r of [1.067, 1.125, 1.2, 1.25, 1.333]) {
  let best = null;
  for (let b = 9; b <= 16.01; b += 0.5) {
    const u = ladder(b, r), s = score(u);
    if (!best || s.shift < best.s.shift) best = { b, u, s };
  }
  console.log(r, "base", best.b, "|", best.u.length, "steps |",
    best.s.shift.toFixed(2) + "% mean |", best.s.moved.toFixed(1) + "% move >5% |",
    best.s.worst.toFixed(1) + "% worst\n  ", best.u.join(" · "));
}
// CHOSEN 2026-08-23 (§8.1c Q8b): r = 1.2 anchored at body 13 — seven steps, worst case 10.0 %.
// The loop above optimises MEAN displacement and therefore picks base 12; that was the right
// objective only while the look had to be preserved. Print every base at 1.2 to see why 13 wins
// on the worst case, which is the number that governs clipping at 720 px height:
for (let b = 9; b <= 16.01; b += 0.5) {
  const u = ladder(b, 1.2), s = score(u);
  console.log(`base ${b} | ${u.length} steps | ${s.moved.toFixed(1)}% >5% | ${s.worst.toFixed(1)}% worst | ${u.join(" · ")}`);
}
console.log("chosen:", ladder(13, 1.2).join(" · "), score(ladder(13, 1.2)));
// Superseded, kept for the record — the 1.125 ladder of the second pass:
console.log("superseded:", ladder(13, 1.125).join(" · "), score(ladder(13, 1.125)));
```

### The §9 panel inventory

```bash
# Distinct values per axis in index.css — the analogue of the 39 sizes
for p in border-radius box-shadow "border:" background padding; do
  printf "%-14s %4s decls | %3s distinct\n" "$p" \
    "$(grep -c "$p" src/index.css)" \
    "$(grep -ohE "$p[^;]*" src/index.css | sed "s/$p//" | sort -u | wc -l)"
done

# 476 rounded-* and 345 border-* utilities in the JSX
grep -rhoE 'rounded[a-z0-9.-]*(\[[^]]*\])?' src --include=*.jsx | sort | uniq -c | sort -rn

# The partial panel language that already exists
for c in as-ring as-edge phaseCard as-legendary; do
  printf "%-12s css: %-3s jsx: %s\n" "$c" \
    "$(grep -c "$c" src/index.css)" "$(grep -rho "$c" src --include=*.jsx | wc -l)"
done
```
