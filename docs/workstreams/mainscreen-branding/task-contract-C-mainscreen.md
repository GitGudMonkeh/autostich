# Task contract — Mainscreen · `#mainscreen-branding`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/mainscreen-branding/planning-report.md` disagree, this contract wins.

**This is the last unmigrated menu surface *and* an approved design commission.** Both, in one task,
the way M1 handled Options — and for the same reason: the screen is touched once instead of twice.

---

## Identity

| | |
| --- | --- |
| **Task** | the mainscreen — brand mark, tagline, head zone, deck panel, and the vocabulary |
| **Branch** | `task/mainscreen-brand` — create it yourself |
| **Base** | **`feature/desktop-menus`**, not `dev`. The vocabulary lives there and `dev` does not have it yet. **Tip SHA: `2600c74f`**, recorded by C1 with the working tree clean |
| **Tier** | **C**, not the B the planning report says — see below |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2317 tests · lint · build · gen:db, all exit 0, **CI green**.

### Why Tier C and not the report's Tier B

The report was written before the vocabulary existed and scoped a **design** task: three commits,
mark and tagline and panel. It is now **also** the round's last migration — 22 colour values, **25
inline `style={{`**, 19 `.hub-*` and 31 `.as-hub-*` rules, none of it on tokens.

Design **plus** migration **plus** a new component is the shape M1 carried, and M1 was Tier C. The
correction is made here rather than discovered at the End stop.

---

## Scope — four commits, in this order, and they do not merge

**Binding design input:** `docs/mainscreen-marke.md` (274 lines), *"freigegeben"*.

*Measured render graph:* `StartScreen.jsx` (891 lines) is mounted only by `App.jsx` and renders
`ChipIcon`, `GlossaryPanel`, `Lead`, `MuteButton`, `PwaInstall`, `RankIcon`, `Stripe`, `TileGlyph`.
**`GlossaryPanel` (M6) and `PwaInstall` (M11) are already migrated — do not touch them.**
`MuteButton` and `RankIcon` are their own files and are **not** yours either.

### C1 — measurement only. No pixel moves.

**Re-derive the head-zone budget at 1280×720 first, before any other size**, in a **`main`** build.

Everything the report says about that budget was measured **before the typography round landed**, and
that round moved 41.9 % of menu text by more than 5 %. **The figures in §1.3 are not to be trusted;
your measurement replaces them.**

*Measured and still present:* `.hub-pair, .hub-play, .hub-stand, .hub-foot { display: contents }`
(`index.css:2245`) · `zoom: clamp(0.85, …, 1)` (`:2515`) · `.hub-play .as-wordmark { --wm-size: 88px;
margin-top: -70px }` (`:2706`).

**Then measure the mark at its real height.** The owner decided **5 × 8** on 2026-08-25, superseding
the report's 5 × 6 — *two rows taller than the shape the budget was ever reasoned against.* Whether
the head zone holds wordmark + tagline + mark at 1280×720 is the top risk of this workstream, and
**C1's numbers are the only thing that answers it.** If it does not hold, that is **Q9** — an owner
decision with three named options, and *shrinking the tagline is not one of them.*

**C1 exists as its own commit and not as a bullet.** If proving the work correct is a sub-bullet it
is what gets cut, and here it is worse: C1's numbers are the input to a decision the owner has to
make, and a worker that has already composed the head zone has an interest in the answer.

### C2 — the head zone, at today's surface values.

`BrandGrid.jsx` (new) as a data-driven inline SVG, `currentColor` throughout. The tagline as **two
catalog keys** wired through `t()`. The composed lockup.

**Design 1280 → 1600 → 1920, smallest first.** A head zone that survives 720 px of height scales up;
one composed at 1920 and squeezed does not.

**The English tagline carries the closing period** — *"Order. Trick. Escalate."* Owner decision,
2026-08-25. `mainscreen-marke.md:126` prints it without; **that line is the outlier** (planning report
§8.1, Q3a).

### C3 — the deck panel, at today's surface values.

Option **C3** of the report: named header, heavier deck art, the **existing** battlefield and FX
lines restyled as the attribute chip row, KPI row re-weighted. **"Build DNA" stays out** — *measured:*
no formation/engine/element/effect summary is computed for the hub; `computeFormations` is run-scoped
(`App.jsx:616`). The mockup's four chips are placeholders for data that would have to be invented.

### C4 — the vocabulary.

Now every surface, edge, elevation, radius and inset from `conventions.md` §2c.

**Owner decision Q2, 2026-08-25: the mainscreen uses the shared vocabulary.** Where it genuinely
needs something the ladder does not have, that is **a documented deviation in a named table with a
reason** — never a private value, and never a minted token. A deviation that is only *"this looked
better"* is a token proposal to the planner, or it does not happen.

---

## Two things this screen inherits from the round

**Four inline translucent-edge alphas** — `.10`, `.18`, `.22`, `.25` on `rgba(150,150,170,…)`. MH1
measured the family at **twelve** alphas across 64 literals, and named `.22`/`.25` as living here.
The family is **ratcheted, not collapsed** in this round. **An inline literal is unreachable by any
rule that is not `!important`** — so if C2 or C4 touches one of those lines, **convert it to a
`var()` rather than copying it**, and say so.

**The sub-1280 clauses.** A conversion below 1280 px is granted at **≤ 2/255 per channel with no
alpha change**, or **Δα ≤ 0.01 with the colour unchanged** — *by the planner, on request.* Five cases
decided. **You still ask.**

---

## Re-measure the design's predictions before building against them

**Four design documents have gone to workers this round. All four failed the same way and only that
way: observations held — several to the decimal — and predictions did not.** Dead space measured in a
preview build; height arithmetic stale in all three terms; a board aspect that was the phone card's;
an open question that moved a share by nine points.

> **Take a design's observations. Re-measure its predictions, in a `main` build.** A stale figure is
> a finding and an owner question — never a silent adjustment, and **never a reason to doubt the
> design's direction.** Nothing any of the four recommended was wrong in sign.

`mainscreen-marke.md` has **four open owner points** of its own: target brightness of the deck colour
across 52 looks · whether Genesis-like decks keep the two-colour gradient · whether three effect names
get German entries · where the first-contact tutorial offer goes. **Build what works without them and
report them.**

---

## Non-goals, and the tripwires

`GlossaryPanel`, `PwaInstall`, `MuteButton`, `RankIcon`, `App.jsx` · every screen already migrated ·
**Build DNA** · the deck artwork and the board floor band (placeholders in the mockup; both exist in
the build) · the battle screen and pick phase · anything below 1280 px · **any type size, `.ty-*` role
or `--text-*` token** · a new dependency, icon or glyph · translating the German comments in
`index.css` · **minting a token** · the twelve `.as-edge-*` alphas · `@theme` beyond a ratified
deviation.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

### The wordmark trap, and it is specific

`.hub-play .as-wordmark` is scoped **deliberately**: the run header carries the same class and takes
its 22 px from `.as-wordmark-sm`. **A rule that sets `.as-wordmark` unscoped moves the mark inside a
running game.** The reason is commented at `index.css:2703 ff.` Read it before you touch the mark.

### The `zoom` trap

`.hub-pair, .hub-foot { zoom: clamp(…) }`. The containing-block consequences are recorded at
`index.css:303-325` and guarded by `test/overlay-nesting.test.js`: **no `position: fixed` in the head
zone, and `backdrop-filter` only where `.as-glass` already puts it.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English. Player text changes → `npm run loc:export` |
| **Baseline** | **captured fresh by C1**, before C2's first edit. The round's sets are not a valid "before" for a screen nobody has migrated |
| **Survey marker** | `hub` → `.as-hub-tile` |
| **Deck coverage** | the mark is deck-tinted. **Verify on a dark *and* a bright deck** — the mockup was rendered with one, and there are 52 |

### The harness, and what it does not see

- **Noise floor zero**, clock pinned, leaderboard stubbed, bundle verified.
- **The gate captures surfaces, not control states**, and prints so every run.
- **A cell reaches one *state* of a surface.** MR1 found three of eight sites in no cell; M6 found the
  survey opens the glossary from the **hub** button and not the mainscreen's. **Your screen has one
  cell and many states.** Show your changed sites are inside a measured cell, and measure directly
  what is not.
- **Run the gates bare, without pipes.**

### Two shapes that cost this round eight findings

**A check that asks whether something is *present* will eventually pass on the wrong thing.** Write it
as *"contains no X other than Y"*. Two of the eight were a guard and a probe written by workers who
had this sentence in their contract.

**A guard can go red because you succeeded.** Three this round. **Rewrite to the invariant, not to a
lower number**, and add a **negative probe**.

---

## Acceptance gate

> **Wordmark, tagline and mark read as one lockup at all five viewports, in both languages, on a dark
> and a bright deck; 1280×720 holds the whole head zone or Q9 has been answered and implemented; the
> tagline is never shrunk below its chosen role; every surface in `StartScreen.jsx` and the
> `.hub-*`/`.as-hub-*` rules comes from §2c with every deviation in a named table; and the machine
> half shows every surface but `hub` at zero deltas.**

---

## Expected file surface

`src/ui/StartScreen.jsx` · `src/ui/BrandGrid.jsx` *(new)* · `src/index.css` (`.hub-*`, `.as-hub-*`,
`.as-wordmark` **scoped**) · `src/i18n/de.js`, `src/i18n/en.js` (two keys) ·
`test/panel-tokens.test.js` · `test/hub-knopf.test.js`, `test/hub-panels.test.js`,
`test/hub-deck-bg.test.js` and any guard your diff actually breaks ·
`docs/workstreams/mainscreen-branding/measurements/C1.md` … · `evidence/**`

**Must not change:** every file under non-goals · anything inside `@media (max-width: …)` ·
`test/typo-tokens.test.js` · every `--text-*` token · the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **R1** | **Head-zone height at 1280×720 — the top risk.** All three short-desktop blocks fire, the wordmark is already pulled up 70 px, and this is the itch.io embed. **5 × 8 is two rows taller than the budget was reasoned against** | C1 measures there first. If it does not hold, that is Q9 — an owner decision, not a silent trade-off |
| **R2** | **The report's §1.3 figures are pre-typography** | Yours replace them. Do not build against a number you did not take |
| **R3** | **The unscoped `.as-wordmark` trap** | `index.css:2703 ff.` Verify `run-stage` did not move |
| **R4** | **Deck tint against a one-deck mockup** | Dark and bright deck, both |
| **R5** | **`zoom` containing-block traps** | No `fixed` in the head zone; blur only where `.as-glass` puts it |
| **R6** | **A new type role may be needed** for the tagline | Propose a **role**, once, to the owner. Never a call-site number. Budget one owner round |
| **R7** | **Four inline translucent alphas live here** | Convert rather than copy; say which |
| **R8** | **The design's predictions** | Re-measure in a `main` build first |

---

## Definition of done

- [ ] Branch and base confirmed, `git status --short` empty, before the first edit
- [ ] **C1 committed on its own**, head-zone budget re-derived at 1280×720 first, mark measured at
      its real 5 × 8 height, baseline captured
- [ ] Q9 answered by the owner **if** C1 shows the head zone cannot hold it
- [ ] C2 the head zone · C3 the deck panel · C4 the vocabulary — separate commits
- [ ] Tagline: two catalog keys, `t()`-wired, **closing period in both languages**; `loc:export` run
- [ ] **Build DNA absent**; deck artwork and floor band untouched
- [ ] Every §2c deviation in a named table **with a reason**
- [ ] Any inline translucent alpha touched is **converted, not copied**, and named
- [ ] **Machine half: every surface but `hub` at zero deltas**; `run-stage` explicitly among them
- [ ] Guards: measured which break, each rewritten to the **invariant** and counter-checked
- [ ] Measurement records per commit; **Part 3 re-measures every number the decision block put to the
      owner**
- [ ] Owner-facing set: both languages, two sizes, **dark and bright deck** — **one opened and
      confirmed to be an image**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
