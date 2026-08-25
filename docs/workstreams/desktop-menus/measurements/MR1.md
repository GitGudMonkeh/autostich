# MR1 — the row ground

**Task** `MR1` · Tier A · branch `task/menu-mr1-row-ground` · base `64f304a5` (tip of
`feature/desktop-menus`) · worktree `C:/Code/Autostich-worktrees/menu-rework` · ports preview 5189 ·
survey 5181.

**One value, eight sites, four screens, and nothing may look different afterwards.** No comparison
set: a task that moves nothing does not need one. What it needs is the zero-delta result, the list
actually found, and the findings — which is what this record is.

---

## Part 1 — the baseline, named

| | |
| --- | --- |
| **Machine baseline** | `evidence/MR1/before/matrix.json` — 160 cells, **0 unreached**, taken on this branch at base `64f304a5` **before the first edit** |
| **Why not MH2's** | `evidence/MH2/after-1/matrix.json` is one commit and one merge older. Re-taken rather than named, because a baseline that predates the tip cannot separate this task's deltas from the tip's |
| **Two extra matrices** | `evidence/MR1/before-erststart` (20 cells) and `evidence/MR1/before-lbweek` (20 cells) — the two screens the survey cannot reach. See Part 3.2 |
| **Noise floor** | **zero, measured in this task rather than inherited.** Two independent runs of the same build (`after-*` vs `after2-*`, 40 cells, 3 430 nodes) are identical node for node — see Part 4. Every delta this task could have produced would have been its own |
| **Determinism** | pinned clock (2026-08-24 12:00 UTC), `autostich_scores` answered locally, reduced motion, seeded random, `dist/` verified before the first cell and after the last in every run |

---

## Part 2 — the site list, re-measured (H-a)

*The contract's list was measured 2026-08-25 and says to verify it rather than trust it. Verified
against base `64f304a5`.*

**It is exact, line for line, and there is no ninth.**

| Where | What | Contract | Found |
| --- | --- | --- | --- |
| `src/index.css:4348` | `.gl-search input` | `!important` | `!important` ✓ |
| `src/index.css:4789` | `.un-first .un-prev` | `!important` | `!important` ✓ |
| `src/index.css:4976` | `.fb-run` | `!important` | `!important` ✓ |
| `src/index.css:5548` | `.lb-weekcount` | plain | plain ✓ |
| `src/index.css:5566` | `.lb-ctxtile` | plain | plain ✓ |
| `src/index.css:5610` | `.lb-mod` | `!important` | `!important` ✓ |
| `src/ui/FeedbackModal.jsx:38` | `const ROW_BG` | inline | inline, **three readers** (214, 227, 276) |
| `src/ui/UsernameModal.jsx:37` | `const ROW_BG` | inline | inline, **two readers** (124, 179) |

**Eight declaration sites, thirteen painting sites.** The two constants are read five times between
them, and the record says so because the gate's node counts below are counts of *painters*, not of
declarations.

### The near-miss sweep (H-b, first half)

Swept for every spelling that could be the same colour or be mistaken for it — `0f0f15`,
`15 15 21`, `rgb(15`, and every `rgba(…, .72)` in `src/**` and `index.html`:

| Hit | Verdict |
| --- | --- |
| `index.css:2528` — `rgba(27, 26, 36, 0.72)` on `.as-glass` | **Not the row ground.** Same alpha, different colour (12/11/15 off per channel); it is the top stop of the `--sf-glass` family. A grep written on the alpha alone takes it — this one was not |
| `index.css:4305` — `rgba(15,15,21,.72)` in a comment | The `#gl-ruhe` design note recording what that pass took. Historical record, preserved as written, and stripped before any guard reads the file |

Nothing else in the tree carries this value in any spelling.

---

## Part 3 — the zero-delta gate

> **Claim: this diff moves no pixel, on any surface, at any of the five sizes, in either language.**

Instrument: `surfaceProbeSource()` — the four surface axes plus the box, tolerance **zero** — compared
by `scripts/surface-delta.mjs`. Three matrices, because one instrument does not reach all eight sites.

### 3.1 The result

| Comparison | Cells | Matched nodes | Unmatched | Deltas |
| --- | --- | --- | --- | --- |
| `before` → `after` (survey, 16 surfaces) | 160 | 25 189 | 0 | **0** |
| `before-erststart` → `after-erststart` | 20 | 1 220 | 0 | **0** |
| `before-lbweek` → `after-lbweek` | 20 | 2 210 | 0 | **0** |
| **Total** | **200** | **28 619** | **0** | **0** |

Full output: `evidence/MR1/delta-survey.txt`, `delta-erststart.txt`, `delta-lbweek.txt`.

**Zero on every surface.** Not one of the eight sites was painting something other than what the list
says — H-b comes back clean.

**MENU-56 still holds and is repeated because it is repeated on every run:** surfaces only, in their
resting state. No cell captures a control hovered, focused, selected or disabled.

### 3.2 What reaches which site — MR1-F04, and it is the finding this task nearly missed

**Counted in the baseline matrix rather than assumed:** of 160 cells, the nodes actually *painting*
`rgba(15, 15, 21, .72)` number 50 — and every one of them is on `glossary` (10) or `feedback` (40).

> **The leaderboard contributes zero. Three of the eight sites — `.lb-weekcount`, `.lb-ctxtile`,
> `.lb-mod` — are outside every cell the survey has ever taken.**

The reason is the entry, and M8 already put it on record (`measurements/M8.md`: *"it is not enough for
this task"*). The survey opens hub tile 2, which is the **board** entry on its default tab. All three
rules live behind `tab === "meister"`; two of them additionally behind `!boardMode`, i.e. the
**ranked** entry, which no survey cell has ever opened. First start is the same shape and was already
named — M9's H-c: the survey seeds `as_username`, so `.un-first` has never been in a matrix either.

A green survey run would therefore have covered **three of the eight sites and claimed all eight.**
So two task-local harnesses were built, both writing the survey's cell shape so `surface-delta.mjs`
reads them with no special case:

| Instrument | Reaches | Painting nodes measured |
| --- | --- | --- |
| `scripts/viewport-survey.mjs` | `.gl-search input`, `.fb-run` + the three `ROW_BG` readers in `FeedbackModal.jsx` | 50 |
| `evidence/MR1/erststart.mjs` | the two `ROW_BG` readers in `UsernameModal.jsx`, in **both** variants of the modal | 20 |
| `evidence/MR1/lb-week.mjs` | `.lb-weekcount`, `.lb-ctxtile`, `.lb-mod` | 80 |

**Both harnesses assert that they see the thing before they report on it.** `lb-week.mjs` records a
cell as *unreached* unless the selectors it exists for are actually in the DOM (`.lb-weekcount=1
.lb-ctxtile=3 .lb-mod=3` in every ranked cell); `erststart.mjs` was checked against its own baseline,
where the probe finds exactly the two nodes `ROW_BG` paints. A gate that cannot see what it gates is
worse than no gate, and that is the failure this section exists to have avoided.

**`erststart.mjs` measures the change-name variant too, deliberately.** `.un-prev` renders outside the
`firstTime` branch while the stylesheet rule is `.un-first .un-prev` — so in that variant the inline
constant is the *only* thing painting the row, with no rule above it to mask a wrong token. It is the
cell where this migration would have failed loudest.

### 3.3 The token ships

`@theme` variables that nothing references are pruned by Tailwind 4 (conventions §2c, *"a token you do
not use does not ship"*). Verified in the built stylesheet rather than assumed:

```
--sf-row:#0f0f15b8          one declaration
var(--sf-row)               six consumers in dist/assets/*.css
```

`#0f0f15b8` is the minifier's spelling of `rgba(15, 15, 21, .72)`, and it is what the **literal**
minified to as well — which is why the alpha rounding is not a delta, and the 28 619 matched nodes are
the proof rather than the argument.

---

## Part 4 — the four `!important`, and MR1-F02

The contract's model: the four rules shout because `ROW_BG` is a JS constant set inline, and no
stylesheet rule reaches an inline literal; once the inline emits `var(--sf-row)` the shout is
unnecessary. **Measured at each of the four, that model holds for exactly one of them.**

| Rule | Inline declaration on the same element | Verdict |
| --- | --- | --- |
| `.un-first .un-prev` (4789) | `UsernameModal.jsx:179` — `background: ROW_BG`, the **same** value | the contract's case exactly. **Removed** |
| `.fb-run` (4976) | **none.** `FeedbackModal.jsx:247` sets no background at all, and no other rule or utility touches it | never had the stated reason. **Removed** — MR1-F03 |
| `.gl-search input` (4348) | `Glossary.jsx:169` — `background: "#0f0f14"`, a **different** value | **load-bearing. Kept, and explained at the site** |
| `.lb-mod` (5610) | `LeaderboardScreen.jsx:113` — `background: "#17161f"`, a **different** value | **load-bearing. Kept, and explained at the site** |

**Why the last two are not the disease this round exists to cure.** Both inline values are the
*narrow* version's opaque row — `#17161f` is a counted state literal of `LeaderboardScreen.jsx` in the
guard, named there as exactly this: *"ab 1280 px überschreibt index.css die ersten beiden"*. The
declaration is not a rule shouting over a value it disagrees with; it is the desktop re-pointing a
phone value, which is the same shape `--sf-scrim` / `--sf-scrim-desk` carries with the planner's
blessing. Removing it would move the phone's value onto the desktop — a change below 1280 px in
effect, which is decision 9's own boundary.

**Neither was restored quietly nor kept unexplained.** Both carry a `#menu-rework MR1` comment naming
the file, the line, the inline value and this finding. Neither file is in this task's permitted
surface, so pointing those two inline values at the token is not MR1's to do — it is named as
inheritance below.

### The counter-check — both are load-bearing, and this is the measurement that says so

Reintroducing the defect: **both declarations removed, nothing else touched**, rebuilt, and the same
cells re-measured against the shipped build. `lb-week.mjs` is in the loop because `.lb-mod` is in no
survey cell — running only the survey here would have produced a *smaller* red and hidden the larger
half. Evidence: `evidence/MR1/counter-important/`.

| Instrument | Cells | Matched nodes | Deltas | What moved |
| --- | --- | --- | --- | --- |
| survey, `de/1280x720` | 16 | 2 474 | **1** | `glossary` — the search input's `bg` falls `rgba(15, 15, 21, 0.72)` → `rgb(15, 15, 20)`, i.e. to `#0f0f14`, the inline literal |
| `lb-week.mjs` | 20 | 2 210 | **30** | `ranked-week` — three `.lb-mod` rows × 10 cells, `bg` falls to `rgb(23, 22, 31)`, i.e. to `#17161f`, the inline literal. Both languages, all five sizes, evenly |

**31 deltas, every one of them a background falling back to the inline value the declaration exists to
override.**

The tree was restored and rebuilt inside the same script's `finally`, and the restoration was then
**measured rather than assumed**: both task-local harnesses were re-run on the restored build
(`after2-erststart`, `after2-lbweek`) and compared twice —

| Comparison | Deltas | What it establishes |
| --- | --- | --- |
| `before-*` → `after2-*` | **0** | the gate still holds after the counter-check put the tree back |
| `after-*` → `after2-*` | **0** | **the noise floor is zero**, measured here rather than inherited: two independent runs of the same build, 40 cells, are identical node for node |

The 160-cell survey was not re-run for this — the two harnesses cover the sites the counter-check
touched, and the source was restored byte-for-byte from the same string it was read from.

`.gl-search input` shows once rather than ten times only because the survey half was narrowed to one
size and one language; the property, the node and the direction are the point, and one cell is enough
to establish them where the other instrument already covers all ten.

---

## Part 5 — the guards (H-c)

**Measured which break, rather than predicted:** the suite was run against the migrated tree before a
single guard was touched. **Exactly one went red**, and it went red for the right reason.

| Guard | What happened | Answer |
| --- | --- | --- |
| `panel-tokens.test.js` — *"JEDES stateLiteral steht noch in der Datei"* | red. `rgba(15, 15, 21, .72)` was the first entry of `UN_STATE_LITERALS` and of `FB_STATE_LITERALS`, and it is no longer in either file | **the ratchet turns down**: struck from both lists. That is the guard's own documented mechanism, not a weakening |
| `panel-tokens.test.js` — the surface axis, `M8_SURFACE_EXEMPT` / `M9_SURFACE_EXEMPT` | **green, and that is the problem.** Five exemptions (`.lb-weekcount`, `.lb-ctxtile`, `.lb-mod`, `.un-first .un-prev`, `.fb-run`) now take nothing out, because the rules they cover read the token | **struck.** An exemption that exempts nothing lets the *next* literal through at the same place in silence. All five rules are now fully checked on the surface axis |
| every other guard, including `typo-tokens.test.js` | untouched | — |

### What replaced them, and it is stricter

The seven struck entries were a list of the sites that *happened* to carry the value on the day
somebody wrote them down. A ninth site in a file nobody had listed was invisible to all seven — which
is how eight sites came to exist in the first place. So the replacement is the invariant, not a lower
number:

> **The value is written out once, in its own declaration, and every consumer reads the token.**

Two new tests in `panel-tokens.test.js`:

1. *"das Literal steht im ganzen Baum genau einmal — in seiner eigenen Deklaration"* — comments
   stripped first, both alpha spellings (`.72` / `0.72`) and any whitespace, across `index.css` and
   **every file in the JSX allowlist** rather than a named pair. A file added to the allowlist is
   covered on the same day.
2. *"das Token hat lebende Verbraucher auf BEIDEN Seiten"* — the pruning half. `at least one`, never
   a count: a threshold of eight would punish the next worker who consolidates two rules into one,
   and that is precisely the mistake M9 paid for.

**Counter-checked by reintroducing the defect, four ways:**

| Defect reintroduced | Guard |
| --- | --- |
| a ninth site as a literal in JSX | **red** |
| a ninth site as a literal in CSS | **red** |
| the one hit is a rule, not the declaration (`--sf-row` renamed) | **red** |
| every consumer removed — CSS side, then JSX side | **red**, both |
| clean tree | **green** |

`test/typo-tokens.test.js` is unmodified. No ratchet grew.

---

## Part 6 — the gates

| Gate | Result |
| --- | --- |
| `npx vitest run` | **143 files · 2289 tests · exit 0** |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `npm run gen:db` | exit 0 — 219 entries |

**2289, not 2287**, and the two are the guard above. The contract's number is the count before this
task added its invariant; nothing was removed.

---

## Findings

| ID | Finding | Disposition |
| --- | --- | --- |
| **MR1-F01** | **The eight are still eight.** The contract's list re-measured against `64f304a5` is exact, line for line; no ninth arrived. The two constants have five readers between them, so eight declarations paint thirteen sites | Confirmed, no action |
| **MR1-F02** | **Two of the four `!important` are load-bearing, and not for the contract's reason.** `.gl-search input` and `.lb-mod` override a *different* inline literal (`#0f0f14` / `#17161f`), which is the desktop re-pointing a phone value — the `--sf-scrim` / `--sf-scrim-desk` shape — not a rule shouting at the row ground. Counter-checked by removal | **Kept and explained at both sites.** H-d reported here rather than settled quietly |
| **MR1-F03** | **`.fb-run`'s `!important` never had the stated reason.** `FeedbackModal.jsx:247` sets no inline background at all, and no other rule or utility touches the element. The contract's model — "they shout because `ROW_BG` is inline" — is true of exactly one of the four | Removed. No behaviour change, proven at zero delta |
| **MR1-F04** | **Three of the eight sites are outside every survey cell.** Counted, not assumed: the 50 row-ground painting nodes in the 160-cell baseline are all on `glossary` and `feedback`. `.lb-weekcount`, `.lb-ctxtile` and `.lb-mod` need the `meister` tab and the **ranked** entry, which no cell has ever opened (M8 named the entry problem; this is its consequence for a value gate). A green survey would have covered three of eight and claimed eight | Closed **for this task** by `evidence/MR1/lb-week.mjs`. The survey itself is untouched — extending it is a change to shared evidence tooling and not MR1's to make. **Passed to the successor** |
| **MR1-F05** | **Removing the five dead exemptions and the two ratchet entries would have left the guard weaker than before**, because each of them silently covers the *next* literal at that place. Replaced by a tree-wide invariant instead, counter-checked four ways, and the replacement is stricter than the seven it retires | Done in this task |
| **MR1-F06** | **A near-miss that a looser sweep takes:** `rgba(27, 26, 36, 0.72)` on `.as-glass` shares the alpha and is a different colour. Named here so the next reader of a `.72` grep does not have to re-derive it | Reported, out of scope |
| **MR1-F07** | **The minifier emits the token as `#0f0f15b8`**, an 8-bit alpha (184/255 = .7216) rather than `.72`. It is not a delta because the literal minified identically before the change — but a future worker who changes *how* this value is written, rather than where it lives, is changing an alpha at the third decimal | Reported; proven irrelevant here at 28 619 matched nodes |
