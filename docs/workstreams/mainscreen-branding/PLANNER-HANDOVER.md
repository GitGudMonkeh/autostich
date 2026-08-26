# Planner handover — `#mainscreen-branding`

**Written 2026-08-26, at the end of the workstream.** `HANDOFF-C.md` is the fifteen-line worker
handoff and says what was built. **This says what is yours.**

Three kinds of thing are in here and nothing else: **rulings I am asking for**, **counters I moved**,
and **instruments that changed under me**. Owner decisions are not re-litigated here — Q9 through Q12
are recorded in `planning-report.md` §8.2 with their reasoning. Where something is the owner's and not
yours, it says so.

**State:** branch `task/mainscreen-brand`, tip `23b5263f`. **CI green at the tip** — run
`32947867209` at `23b5263f`, and `32947667177` at `3b8a52c1` before it. Read the run for the branch
TIP and do not mistake a **cancelled** row for a verdict: the concurrency group cancels the previous
run on every push. `npm test` **145 files / 2350 tests**, lint `--max-warnings=0`, build, gen:db, all
exit 0, run bare without pipes. Tree clean, worktree left in place. **Not merged, no permanent branch
pushed, no PR.**

**The base has drifted.** `origin/feature/desktop-menus` is **two commits ahead** of `2600c74f`, the
tip this contract named (MH3b and its merge). They touch the harness and no file of mine, and MH3b's
change to `viewport-survey.mjs` is exit-code handling rather than measurement — but the integration is
a merge, not a fast-forward, and my six matrices were taken with the older instrument.

---

## 1. What I am asking you to rule on

### 1.1 An exemption names a selector, and a selector spans both halves of the stylesheet

**This is the one that is not only mine.** It cost me a real defect and the same shape is in five
other workers' lists.

`panel-tokens.test.js` exempts by selector. `.as-hub-field` needed an exemption for its **phone** rule
— that value is the narrow version's carrier and must not move — and the *same entry* silently covered
its **desktop** rule, where the value should have been a token. **Measured:** counter-checks C4/CC1
and CC2 stayed **green** with `#141419` and `#2a2a33` put back at the call site.

I fixed my own by scoping the desktop rules (`.hub-play .as-hub-field`), so the exemption reaches only
the rule it was written for. Then I measured how far the shape goes —
`evidence/C4/exempt-reach.mjs`:

```
exemption entries that match at least one rule:            187
entries that reach BOTH the phone and the desktop half:     16
   M5_INSET_EXEMPT  .gd-frame .gd-nav .gd-page
   M6_INSET_EXEMPT  .gl-frame .gl-nav .gl-page
   INSET_EXEMPT     .op-dd-btn .op-root .op-foot .op-cols .op-col2 .op-head .cz-root
                    .up-root  .st-root/.lb-root/.go-root
   C_INSET_EXEMPT   .hub-root
```

**Sixteen is not sixteen defects.** Where both halves share the reason — a screen margin is layout at
any width — the reach is harmless, and most of these are exactly that. It is a defect only where the
two halves have *different* reasons, which is what happened to me: untouchable below the threshold,
tokenisable above it.

| | |
| --- | --- |
| **What I am not doing** | going through sixteen entries on five other screens. Each needs its own judgement about whether the two halves share a reason, and that is a review of their migrations, not of mine |
| **Cheapest real fix** | teach `rules()` the media context and let an exemption say *which half* it means. One function, one optional field, and the sixteen become checkable instead of assumed |
| **Cheapest safe fix** | none — a narrower regex per entry is the same guesswork one screen at a time |
| **Cost of leaving it** | a migration that scopes its desktop rules is watched; one that does not is silently exempt. Nothing tells you which you are looking at |

### 1.2 The zero-delta gate's wording does not fit a screen that stands behind the others

The contract says *"every surface but `hub` at zero deltas."* **The hub's DOM stays mounted behind
every menu overlay** — the survey navigates from it — so one node added to `.hub-play` shifted the
structural path of eleven surfaces at once: **2750 deltas and 1600 unmatched nodes in C2**, none of
them a change to those eleven screens.

I did not report that as green. I measured that `0/0/2/0/5/0` is `.hub-play` (with the options overlay
open, `evidence/C2/whose-subtree.mjs`), then built `evidence/C2/outside-the-hub.mjs`, which filters the
subtree out of both matrices and re-runs the comparator. That turns the explanation into a gate, and
it gives a **stronger** statement than the contract asked for: *every node but the screen's own at
zero, `hub` included.*

**The ask:** if the next contract covers a screen that other surfaces render on top of, the gate should
be worded as **"every node outside `<the screen's root>` at zero"** and the filter named as a required
instrument. The tool is parameterised (`--prefix`, `--before`, `--after`) and was used unchanged by
C3, C4, C5 and C6.

**One case does not fit even that**, and it is worth deciding in advance rather than in the moment:
C3 removed a 14 px overflow at 1400 × 700, the scrollbar went, and **eleven surfaces got 8 px of width
back** — 2624 deltas, every one a box coordinate and none paint. That is the fix, not a regression. A
gate cannot tell those apart; a **rule** can: *deltas outside the screen are admissible only where the
document's own geometry changed, and only as box properties.*

### 1.3 `2px 6px` now has three call sites, and two of them are mine

§2c closes `--btn-pad-*` as *the* control-padding pair (10 px / 16 px). Measured across the stylesheet,
`padding: 2px 6px` is at **three** call sites: `.go-bestnew` (M4), and `.as-deck-attr-next` and
`.hub-play .as-week-chip` — **both this workstream's.**

**I am reporting this as a weak trigger and not as a trigger.** The restated threshold counts call
sites, and three is the bar — but a counter that reaches three because one worker added two is not the
independent spread the rule is about. It is also **control padding**, which §2c places outside the
ladder deliberately, so the honest reading is: *the closed pair does not cover the small chip, and the
gap now has three sightings, two of them from one screen.* Yours to weigh; I would not mint on it.

---

## 2. Counters I moved, as call sites rather than impressions

`evidence/C6/census.mjs` counts these over all of `src/**`, comments stripped, because a value named in
a comment is not a call site.

### 2.1 MENU-38 — the family is smaller than the number you were handed

MH1 measured **twelve alphas across 64 literals** before the round migrated anything. Now:

| | MH1, before the round | now |
| --- | --- | --- |
| call sites | 64 | **33** |
| distinct alphas | 12 | **10** |
| files | — | **6** |

`.14` and `.30` are gone; the round took them. What remains: `.07 ×3 · .08 ×1 · .10 ×1 · .12 ×8 ·
.13 ×1 · .16 ×6 · .18 ×7 · .22 ×1 · .25 ×1 · .35 ×4`, in `index.css` (27), `StartScreen.jsx` (2) and
one each in `FeedbackModal`, `Sparkline`, `UpgradeScreen`, `UsernameModal`.

**The mainscreen carries six of them, not the two MH1 named** (C4-F02) — MH1 counted the JSX file's
inline literals and the screen carries the family in the stylesheet too. Two left the JSX in C3
(converted to one rule each, not copied); four stay, and four of the six render below 1280 px. All six
are in the ratchet, **each alpha asserted by name**, so a seventh cannot appear without someone editing
a list.

### 2.2 Two families this screen had to deviate on — and neither is near the bar

| family | call sites, whole tree | distinct values | most-used value |
| --- | --- | --- | --- |
| translucent panel surface `rgba(20,20,26,·)` | **1** | 1 | `.45` ×1 |
| translucent divider `rgba(60,58,78,·)` | **3** | 2 | `.5` ×2, `.55` ×1 |

**Neither trips the threshold**, and the second is the interesting one: three sites but **no single
value at three**. The rule counts a value spreading, so this is two sightings and one, not three.

### 2.3 Panel insets — three misses, and they are three different values

The mainscreen has three genuine panel insets that miss `--in-base` (18): `14/20`, `22/24`, `14/16`.
**That is three one-sightings, not one three-sighting.** Reported that way on purpose: a category
missed at three different values does not trip a rule that counts a value spreading, and reading it the
other way would be a wish dressed as a trigger.

**A number you may want anyway:** `padding: 16px 48px 18px !important` is at **seven** call sites and
`11px 18px !important` at six. Both are screen margins, which §2c leaves outside the ladder by name. A
value at seven sites that the vocabulary deliberately does not cover is not a defect — it is worth
knowing that the carve-out is where the concentration is.

### 2.4 Ink

| unit | literals |
| --- | --- |
| `StartScreen.jsx` | **4** |
| `BrandGrid.jsx` | **0** |
| `index.css`, the hub families | **9** |

---

## 3. Instruments that changed under me

| instrument | change | why you need to know |
| --- | --- | --- |
| `evidence/C1/headzone.mjs` | **five viewports → eight**, plus `--out` | §4.1 — the five cannot see a whole class of error |
| `evidence/C2/outside-the-hub.mjs` | **new**, parameterised | §1.2 — it is what makes the gate statable for this screen |
| `evidence/C2/lockup.mjs` | `--out`; seeds a profile that **owns** the deck; C6 turned its reach around | §4.2 — without the profile, no capture of this screen has ever shown a deck colour |
| `test/desktop-perf.test.js` | **comments stripped before class counting** | it went red because a comment was written — second time this round. Rewritten to the invariant, and the strengthening is **measured**: the same defect masked by a comment is green before and red after (`evidence/C3/counter-checks.txt`, CC12/CC12′) |
| `test/panel-tokens.test.js` | the mainscreen entry, 12 exemptions, both ratchets | §1.1 and §2 |
| `test/marke.test.js`, `test/deck-tafel.test.js` | **new** | 15 + 13 assertions, every one as *"contains no X other than Y"* |

**Two instruments overwrote committed evidence before they grew an `--out`** — caught by `git status`
both times, which is the same way the survey's `--out` was earned (#typo-system S0). If a third
instrument is written, give it the flag on the first day.

---

## 4. What the next contract for this kind of screen should say differently

### 4.1 The five viewports are blind to the zoom band, and it is not a small blind spot

**All five viewports the contract names sit exactly on the `zoom` clamp's floor.** The zoom only rises
above 0.85 from **1632 px of width**. So a rule that divides by the zoom can be wrong across the whole
upper band and look right at every size anyone was asked to check.

Measured, on the deck-art height: the first formula was **zero at all five** and overflowed by
**28 / 66 / 89 px** at 1700 × 760, 1800 × 820 and 1920 × 850. The second, dividing by the real zoom,
still overflowed by **20 / 51 / 88**. Only the third — two terms, one for the chrome outside the zoom
and one for the column inside it — is zero at all eight.

**The ask:** any contract whose screen sits inside `.hub-pair` should name at least one viewport with
width > 1632 and a short height. It costs one row in the matrix and it is the difference between a
formula being right and looking right.

### 4.2 The survey has never captured a deck-tinted hub

`resolveSkinId` hands back `"default"` for any deck the profile has not unlocked, `resolvePackByDeckId`
is then null, and App sets **no `--deck-a1` at all**. The survey seeds a fresh profile, so **no `hub`
cell in any matrix this round carries a deck colour** — and this screen is deck-tinted at seven places.

I did not change the survey: adding an owned deck to its seed would move 160 cells of an agreed
baseline mid-workstream. `lockup.mjs` covers the mark directly instead and **fails** a cell whose
`--deck-a1` is empty rather than printing a blank. **Yours to decide whether the matrix should carry a
deck**, and it is a decision with a cost: every existing baseline stops comparing.

### 4.3 The gate cannot see an SVG's colour

The surface probe records background, border, shadow and outline. An SVG's `fill` and `stroke` are on
none of the four axes, so the whole brand mark is **invisible to the zero-delta gate by construction**.
C5 changed the cells' fill and the gate reported only the geometry that moved with it. The records say
so rather than enjoying it, but a successor reading a green gate should know what it did not look at.

### 4.4 Two of the contract's own numbers named something else

Not a complaint — the shape is M11-F07's and it recurs, so it is worth a sentence in whatever template
these contracts come from. `.hub-*` "19 rules" and `.as-hub-*` "31" are **line counts with comments in
them** (14 and 26 rules). "22 colour values" is **26 distinct / 28 occurrences**, nine of them outside
any style object. **A worker that trusts these builds against them.** The fix is cheap: say how a
number was taken, or take it with the instrument the worker will use.

---

## 5. What is out, and why, so nobody re-asks

| | |
| --- | --- |
| **Build DNA** | Q4, and the data does not exist — `computeFormations` is run-scoped |
| **The deck tier row** | its data is computed in `App.jsx`, a named non-goal. Same rule as Build DNA, not a preference |
| **The design's four open points** | deck brightness across 52 looks · the Genesis two-colour gradient · German names for three effects · where the tutorial offer goes. **The owner's, not yours** |
| **The standalone mark's tone** | after Q12 it is the only sign left on the screen and still carries the quiet state. Raised with the owner, not decided |
| **The `zoom` floor's stated reason** | C1-F14 — "below 0.85 the start button falls under 22 px" lands on nothing measurable in that button today. Not repaired: the floor is correct in effect and its reason is stale, which is a comment fix for whoever next touches that rule |
| **MENU-39, the doubled deck hairline** | still backlog, untouched |

---

## 6. One thing about how this workstream went that is worth carrying

**Every substantive finding came from measuring where nobody asked me to.** The head-zone risk turned
out to be in the other column; the deck-art formula was wrong outside the named viewports; the
exemption hole showed up because a counter-check was written for an allowlist entry that was already
green; and the letter's whole premise was a fact about two words that a third language need not honour.

**None of those was visible from the contract**, and each was cheap to find once an instrument existed.
The expensive part was never the measurement — it was deciding to take one.
