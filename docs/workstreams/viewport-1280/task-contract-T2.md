# Task Contract — T2: the architecture (`#viewport-1280`)

**Status:** proposed, **not started.**
**Follows** `task-contract-T1b.md`, which is complete: the threshold is at 1280 and the survey has
run. Where the two disagree, this contract wins.

**Independent review of T1b was skipped — the owner's decision, 2026-08-22.** It is recorded here
because it changes what T2 rests on: the measurement tooling T2 is graded by has not been checked by
anyone but its author.

---

## 1. Identity

| Field | Value |
| --- | --- |
| **Task** | `#viewport-1280` T2 — R2 and R3 across the desktop pass |
| **Branch** | `feature/viewport-1280` — **continues**, do not create a new one |
| **Base** | `05123e64` on that branch |
| **Worktree** | `C:\Code\Autostich-worktrees\viewport-1280` — exists, `npm ci` already run |
| **Owner** | Claude worker, single writer |
| **Concurrency** | One writer. Sequential sessions may continue in this worktree. Never two at once. |

**Why T2 does not branch from `dev`, which `AGENTS.md` would normally require.** T1b is not merged
into `dev`, so a branch cut from `dev` would carry the threshold at 1400 — and every repair here is a
repair *of the 1280 layout*. It would be untestable at the width it exists for. T2 therefore stacks on
`feature/viewport-1280`. Stated as a deviation rather than done quietly.

---

## 2. Local workspace

```bash
git -C C:\Code\Autostich-worktrees\viewport-1280 fetch origin
git -C C:\Code\Autostich-worktrees\viewport-1280 rev-parse --abbrev-ref HEAD   # feature/viewport-1280
git -C C:\Code\Autostich-worktrees\viewport-1280 log --oneline -1              # 05123e64
git -C C:\Code\Autostich-worktrees\viewport-1280 status --short                # empty
```

---

## 3. Scope

Repair what the survey measured, as a **class** rather than case by case. Four strands, one task:

1. **R2 — elastic lanes.** Every fixed pixel lane in a desktop grid becomes a clamp with a written
   floor. Measured: **14 such lanes** in `src/index.css` (`grid-template-columns` carrying a
   three-digit `px` value). This is planning-report §1.5 rows 3–7 resolved at once.
2. **R3 — the frame yields before the text, and what does not fit scrolls.** Padding, gaps and lane
   widths shrink first. Text does not shrink to make something fit. `--gs` is removed outright.
3. **The owner's four visual findings**, `visual-findings-1280.md`, `V1280-01` to `V1280-04`. These
   are design decisions the owner has already made; T2 implements them, it does not re-open them.
4. **`shotFactor()` and the hub `zoom` reviewed against R3** — planning report §7.2 leaves this open
   and requires T2 to *say why each stays, or remove it*. A silent keep is not an answer.

### 3.1 The four owner findings, mapped to mechanism

| ID | Owner's words (2026-08-22) | Mechanism measured |
| --- | --- | --- |
| `V1280-01` | *"legendare auf 2 nebeneinander andern anstatt 4"* | four offers share the fixed 924 px middle track of `.lv-rig` |
| `V1280-02` | *"Challenger deck soll skalieren das es nicht scrollbar ist seperat"* | same rig, deck rail |
| `V1280-03` | *"guide pages lassen sich nicht scrollen"* | `--gs` shrinks text so the page need not scroll — R3 reverses that trade |
| `V1280-04` | *"die seite is komplett kaput. mittelteil kleiner skalieren das die seiten panels ganz angezeigt werden"* | `.lv-rig` side rails: 482 px at 1920, **162 px at 1280**, asking for 320 |

**`V1280-04` answers what the planning report left to T3.** §5 held "178 px wings: leave as is, make
the middle lane elastic, or drop the wings" as an open design question. The owner has chosen: make
the middle lane elastic. T3 is therefore folded into T2, which is what §5 wanted anyway — *"T2 and T3
are what the earlier revision split into two repair rounds. Merging them is the point."*

### 3.2 Suggested commit sequence

Not binding, but the ordering is the method — the same argument as T1's §3.1.

| # | Commit | Proof |
| --- | --- | --- |
| 1 | Teach the survey to **assert** criteria 1–5, not merely report them | fails on today's tree, at the surfaces already known to fail |
| 2 | R3 scrollers where a panel can overflow; `--gs` removed | guide criterion 4 goes green; nothing else regresses |
| 3 | R2 clamps across the 14 fixed lanes | criteria 1–3 go green |
| 4 | `.lv-rig` middle track elastic (`V1280-01`, `V1280-02`, `V1280-04`) | side rails reach their floor at 1280 |
| 5 | `shotFactor()` and hub `zoom`: keep with a written reason, or remove | stated either way |

Commit 1 first for the reason T1's commit 1 came first: after it, every red is a real signal.

---

## 4. Non-goals and tripwire

- **The threshold.** It is 1280 and does not move. The completeness guard stays green.
- **The phone layout.** Not one rule below the threshold changes. `phone-proof.mjs` stays PASS.
- **Absolute text sizes and the named type scale.** That is strand S2 and it starts *after* T2 —
  tuning text against lanes that are about to become elastic means tuning twice (planning report §1.6).
- **`gameover.best.hint`** — still awaiting a product decision, still untouched.
- **A third layout tier, `xl:`, or a global `zoom`.**
- **Unrelated cleanup in touched files.**

**Tripwires — stop and report rather than continue:**

- `node scripts/phone-proof.mjs compare before-pinned after` reports any deviation.
- The completeness guard `test/viewport-1280.test.js` fails.
- A repair requires raising a text size. That is S2's decision, not T2's.

---

## 5. Approved architecture

Quoted from `planning-report.md` §3, which is the agreed design:

> **R2 · Lanes are elastic, with a floor.** Every fixed pixel lane becomes `clamp(floor, preferred,
> ceiling)`, with the floor derived from what that lane must show legibly and written down beside it.
> After this there is no bare pixel number left in a desktop grid.

> **R3 · The frame yields before the text; what does not fit, scrolls.** Padding, gaps and lane widths
> shrink first. Text does not shrink to make something fit. When the floor is reached the panel
> scrolls internally, using the idiom already present in `index.css`:
>
> ```css
> min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-right: 6px;
> ```
>
> The outer document never scrolls. Silent scrolling counts as a defect — the affordance must be
> visible.

**Measured, and it qualifies the quote:** `overflow-y: auto` occurs **16 times** in `index.css`, but
`overscroll-behavior: contain` only **6**. The idiom is applied in full in about a third of the
places that scroll. Bringing the other ten up to it is part of R3, not a separate cleanup.

---

## 6. Task-specific inputs

| Input | What it gives T2 |
| --- | --- |
| `survey-findings.md` | the aggregated damage table, the common cause, the prediction accounting |
| `evidence/survey/matrix.json` | 130 cells; every overflowing element with its structural path and pixel count |
| `visual-findings-1280.md` | the owner's four decisions, verbatim, with IDs |
| `scripts/viewport-survey.mjs` · `surveyProbe.js` | the measurement; T2 extends it to assert |
| `scripts/phone-proof.mjs` | the regression proof that must stay PASS |
| `evidence-T1.md` §7 | what commit 3 did, and the four tool defects found on the way |

**Start from `matrix.json`, not from the screen.** The worst offending element per surface is already
recorded with its path; reading it beats hunting.

---

## 7. Acceptance gate

Planning report §6.2, at **1280×720 · 1600×900 · 1920×1080**, in **DE and EN**:

1. **No page scrolling** — `scrollHeight <= clientHeight` and `scrollWidth <= clientWidth`.
2. **No truncated text** — nothing with `text-overflow: ellipsis` and `scrollWidth > clientWidth`, no
   `line-clamp` in effect.
3. **No element outside its panel** — tolerance 0 px, panel as defined in `surveyProbe.js`.
4. **No text shrinkage** — no text node smaller at 1280 than the same node at 1920.
5. **In-panel scrolling is declared, not accidental** — every panel that can overflow has an explicit
   scroll container using the R3 idiom, with a visible affordance.
6. **Phone unchanged** — `phone-proof.mjs compare before-pinned after` PASS, 0.0000 % beyond noise.
7. **The completeness guard green**, threshold still 1280 at all four sites.

**Criteria 1–5 belong IN the survey script, not in prose.** §6.2 is explicit: *"Criteria 1–5 are
machine-checkable and therefore belong in the measurement script, not in a prose checklist, so that
every repair round is held to the same standard."* That is commit 1.

**Two known exemptions**, each to be re-stated or removed rather than inherited silently:

- **1400×700** is not in the acceptance sizes, and the survey found every surface scrolls 15 px
  vertically there. Either it enters the criteria or it is named as out of scope.
- **The four unmeasured surfaces** — formation phase, architect, victory, run details, run dialogs.
  T2 cannot assert criteria on what nobody has measured. Say so; do not let green on nine surfaces
  read as green on thirteen.

Gates, unpiped, in this order:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

plus the `VITE_PREVIEW=1` build. T2 changes `src/`, so both variants matter.

**Never pipe a gate command.** `npm test | tail -20` reports the exit code of `tail`.

---

## 8. Expected file surface

### Expected to change

`src/index.css` (the bulk), `src/ui/**` where a lane or scroller is carried in JSX,
`scripts/viewport-survey.mjs` and `scripts/surveyProbe.js` (assertions), `test/**` where a
source-text ratchet legitimately follows a changed rule, `docs/workstreams/viewport-1280/**`.

### Must not change — verifiable by blob or tree hash

`docs/decisions/**` · `docs/workstreams/viewport-harness/**` · `sim/**` · `src/assets/**` ·
`src/main.jsx` · `index.html` · `package.json` · `package-lock.json` · `vite.config.js` ·
`eslint.config.js` · `AGENTS.md` · `CLAUDE.md` · `.gitattributes` · `.github/**` · `public/**`

### Must not change behaviourally — reviewer must judge

- **Every rule below the threshold.** The proof is `phone-proof.mjs`, not a hash.
- **The threshold itself** — `--breakpoint-dt`, the eleven `min-width` queries, the counter-edge,
  `DESKTOP_MIN`. The completeness guard covers these.
- **The height media queries** 950 / 900 / 820 / 1000, unless R3 explicitly retires one — and then
  with the reason written at the site.
- **`src/game/**`** — layout work has no business there.

---

## 9. Known hazards

1. **Source-text ratchets.** ~20 test files slice `index.css` position-dependently. R2 and R3 move
   real rules, so some failures will be genuine and some only spelling. Read each assertion; decide
   whether *behaviour* or *spelling* changed. **Never weaken a guard to reach green.**
2. **`.lv-rig`'s middle track is fixed on purpose.** The comment at the site records why: an `auto`
   track measured itself against the content, so the card became narrower when a wing was collapsed
   (measured: 880 → 784 px) and the offer jumped mid-decision. Making it elastic must not bring the
   jump back. This is the hazard with the most history behind it.
3. **`--gs` removal touches the guide's entire scale.** Four measured steps, bound to width *and*
   height. Removing it without a scroller in place turns shrunken text into overflowing text.
4. **`shotFactor()` measures at runtime in JavaScript.** It reads `scrollHeight - clientHeight` and
   scales the preview. A layout change upstream changes what it measures; it can therefore mask or
   amplify a repair. It is also the only shrink mechanism outside CSS.
5. **The hub `zoom` clamp bottoms out at 0.85 from 1600 px down** — measured, all of 1600, 1536, 1400
   and 1280. Anything that assumes the floor engages only at 1280 is wrong.
6. **The measurement tooling has not been independently reviewed.** T2 is graded by a script whose
   author is also the worker being graded. Four defects were found in the sibling tool during T1b,
   three of which were invisible while it reported PASS.
7. **Windows / Git Bash.** `MSYS_NO_PATHCONV=1` for `revision:path` arguments.
8. **`.gitattributes` is load-bearing.** When CI and local disagree, check line endings first.

---

## 10. Definition of done

- The survey **asserts** criteria 1–5 and fails on a tree that violates them — demonstrated, not
  claimed.
- No bare pixel value remains in a desktop `grid-template-columns`; every clamp carries its floor and
  the reason for that floor beside it.
- Every panel that can overflow scrolls by declaration, with a visible affordance; the outer document
  scrolls nowhere.
- `--gs` is gone, and the guide sets text at its desktop size at every measured width.
- The four owner findings are implemented, each referenced by ID in the commit that closes it.
- `shotFactor()` and the hub `zoom` are each kept-with-a-reason or removed, in writing.
- Phone proof PASS; completeness guard green; all gates green including the preview build.
- The survey re-run and its findings table regenerated, so the before/after is a measurement rather
  than an assertion.
- What is still not measured is named again, not quietly dropped.

**Not done** if any acceptance item is asserted rather than shown, if a text size was raised to make
something fit, or if a guard was weakened to reach green.
