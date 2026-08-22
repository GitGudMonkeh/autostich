# Task Contract — S1: tokens and value-preserving migration (`#typo-system`)

**Status:** proposed, **not started.** Blocked by **S0**, not by the `icons-*` merge — see
*Start condition*.
**Written:** 2026-08-22 by the planning session. **Revised 2026-08-23:** the ladder and role table
are fixed in planning (§3.1/§3.2); the `icons-*` start condition is replaced by the freeze; **V1
capture and the inventory re-measurement moved out to `task-contract-S0.md`**, which also extends the
survey's reach so the zero-delta gate covers more than two thirds of the surface.
**Follows** `planning-report.md` in this directory. Where the two disagree, **this contract wins**.

**Owner decisions this contract rests on** (planning report §8.1 / §8.1b / §8.1c, 2026-08-22 and
2026-08-23): the scale follows the industry convention and is the **seven-step 1.2 ladder at body
13 px** (`9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27`), ties resolving upward; the **seven-row role table
is fixed in planning** (§3.2), not settled here; guide and glossary are explicitly in scope; visible
desktop change is permitted, so the weight ladder is closed as a cleanup; **`dev` is frozen for
desktop changes until this workstream finishes**, so the start condition is met and V1 can be
captured now.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | `#typo-system` S1 — typography tokens, value-preserving migration |
| **Branch** | `task/typo-s1-tokens`, off `feature/typo-system` after S0 has merged up (branch shape: `task-contract-S0.md`) |
| **Base** | the `feature/typo-system` SHA at branch time. **Record it here as a SHA before the first commit** |
| **Worktree** | `C:\Code\Autostich-worktrees\typo-s1-tokens` — **new**, `npm ci` before any gate is believed |
| **Owner** | Claude worker, single writer |
| **Concurrency** | One writer. Sequential sessions may continue in this worktree. Never two at once |
| **Reviewer** | Independent technical review **requested** for this task (planning report §6.3). S2 does not get one |

**Why a review is requested here** and not as ceremony: a 64-file mechanical substitution has a
defect mode — one wrong token at one call site — that neither the suite nor a screenshot reliably
catches, and this task edits three source-text ratchets. That is exactly the risk class `AGENTS.md`
names as worth a second opinion.

## Start condition

**Rewritten 2026-08-23.** The previous version required the `icons-*` worktrees to be merged and said
"stop and report" otherwise. That check now blocks forever: the owner froze `dev` for desktop changes
until this workstream finishes, so `task/icon-position-review` stays unmerged **by decision**. A
worker obeying the old contract would correctly refuse to start.

**Do not create the branch until all four hold:**

```bash
git fetch origin
git log --oneline feature/typo-system -1              # S0 merged up, and the slashed-zero note before it
git merge-base --is-ancestor origin/main origin/test && \
git merge-base --is-ancestor origin/test origin/dev    # ancestry intact
```

- [ ] **S0 is merged into `feature/typo-system`**, its V1 capture committed and its coverage record
      written. Without it there is no baseline and no acceptance oracle.
- [ ] The slashed-zero note (`task-note-slashed-zero.md`) landed **before** S0 captured.
- [ ] Ancestry intact.
- [ ] No other writer in `C:\Code\Autostich-worktrees\typo-s1-tokens`.

If any fails: **stop and report.** Do not work around it.

**The freeze has a second effect worth using:** `dev` cannot move under this branch, so the inventory
numbers S0 measured stay valid for S1's whole duration. They are still re-checked — it is one command
— but a delta now means a mistake, not drift.

## Local workspace

```bash
git -C C:\Code\Autostich-worktrees\typo-s1-tokens rev-parse --abbrev-ref HEAD  # task/typo-s1-tokens
git -C C:\Code\Autostich-worktrees\typo-s1-tokens status --short               # empty
git -C C:\Code\Autostich-worktrees\typo-s1-tokens log --oneline -1             # == the recorded base SHA
```

`npm ci` in this worktree first. `node_modules/` is per-worktree; until it has run, a red suite means
missing dependencies, not a defect.

---

## Scope

Five parts, in this order. Part 1 happens **before the first source edit**.

### 1. Inherit S0's measurements, and check them in one command

**Moved out 2026-08-23.** The inventory re-measurement and the V1 capture are now **S0**
(`task-contract-S0.md`), because extending the survey's reach had to happen before the baseline was
taken, not after. S1 consumes S0's output rather than producing it:

- **the inventory** — distinct sizes, weights, families; utility and `dt:` counts; the five ratchets
- **the V1 capture set**, with the state, sizes and DPR recorded so S2's V2 can match them
- **the coverage record** — which screens are machine-checked and which are not

**S1's own obligation is one re-check, not a re-measurement.** `dev` is frozen, so nothing can have
drifted; re-run the utility count and the ratchet check, and if either differs from S0's figure,
**stop and report** — under a freeze a delta is a mistake, not drift.

**Carry the coverage record forward into the handoff.** The screens with no machine check are the
ones S2's V3 reviewer must look at hardest, and that list dies if S1 does not pass it on.

### 3. Define the provisional token set

One token per **distinct current value**, in `@theme`, in the `--text-*` namespace. Naming and the
collapse path are binding — see *Approved architecture*.

Each token carries its current size and, where the call sites it replaces agree on one, its
line-height. Where they do not agree, the token carries size only and the call sites keep their
`leading-*`; F2 in the planning report guarantees those still win.

### 4. Migrate

- **All size utilities in `src/ui/**` and `src/App.jsx`** → the token whose value equals the current
  one. **Substitute in place. Do not reorder classes inside an attribute.**
- **The `font-size`/`line-height` declarations in `src/index.css`** that resolve to a fixed value →
  `var(--text-…)`. **Excluding** the exemptions below.
- **Leave existing `leading-*`, `tracking-*` and `font-*` at call sites alone.** Removing them is not
  value-preserving reasoning, it is a bet.

### 5. Ratchets and the new guard

Per planning report §2.3:

| Ratchet | Handling |
| --- | --- |
| `test/global-board.test.js:91` | rewrite the literal to the token |
| `test/go-ruhe.test.js:127` | rewrite the literal to the token |
| `test/go-ruhe.test.js:401` | **verify it still passes** — it compares `indexOf` positions and breaks on class reordering, which is the trap in part 4 |
| `test/go-ruhe.test.js:466` | **unchanged.** Container-query sizing is exempt |
| `test/levelup-wings.test.js:336` | re-express against the token; **counter-check by breaking the seam** |

**New guard, required:** the `.ty-*`/token contract — the roles carry family/weight/tracking, the
tokens carry size/line-height, and **no `.ty-*` rule carries a `font-size`**. Counter-checked.
`.ty-*` has no guard today; this task is where it gets one.

---

## Non-goals and tripwire

1. **No visible change.** S1's rendered output is identical to V1. This is the acceptance gate, not
   an aspiration.
2. **No collapse, no retune, no ladder.** The ten-step ladder is S2's. S1 that "already tidies a few
   values" has destroyed its own acceptance criterion.
3. **No `@media (min-width: 1280px)` token override.** That block is created in S2. S1 does not
   write it, not even empty.
4. **No mobile change.** Base values are today's values.
5. **No `@layer` restructuring of `index.css`.** The unlayered cascade is load-bearing.
6. **No renaming or removal of `.ty-*`.**
7. **No layout change**, no lane re-cutting, no spacing adjustments "while in there".
8. **No new dependency.** The mechanism is in the installed Tailwind 4.3.3.
9. **No commit to `dev`/`test`/`main`, no PR.**

### Tripwire

**If the diff starts changing a computed font size anywhere, stop.** That is the signal that the
migration stopped being a substitution and became a retune. The zero-delta check (below) is the
instrument; run it early and often, not once at the end.

Second tripwire: **if `src/index.css` gains a `font-size` inside a `.ty-*` rule, stop.** That
re-creates the trap the `#typo` pass documented and this task guards against.

---

## Approved architecture

Binding. These are decisions, not suggestions.

**A1 — mechanism.** Tailwind's native `--text-*` theme namespace. `@theme` block, **plain, never
`@theme inline`** — `inline` substitutes the value into the utility and destroys S2's ability to
retune through a media query, which is the entire point of the workstream.

**A2 — naming, and how S2 collapses without re-deciding anything.** This determines whether the call
sites are touched twice.

**Updated 2026-08-23:** the band names are no longer S1's to invent. The planning report's **§3.2**
fixes the **seven-row** role table — `--text-micro` · `-meta` · `-body` · `-body-lg` · `-title` ·
`-head` · `-figure` — together with the current values each row absorbs. S1 uses those names
verbatim; a value that fits no §3.2 row is a finding to raise, not a name to coin.

Each provisional token is named `--text-<band>` or `--text-<band>-<n>`, where `<band>` is the §3.2
row the value lands on and `<n>` distinguishes the several current values inside that row. Example:
today's 11 px, 11.5 px and 11.52 px become `--text-label`, `--text-label-2`, `--text-label-3`, each
holding its own current value.

The collapse then runs in **two commits inside S2**, and neither mixes an invisible change with a
visible one:

1. re-point every variant in a band to that band's ladder value — **values change, no call site is
   touched**. This is the visible commit, and it is the only one.
2. rewrite `text-label-2`/`text-label-3` → `text-label` and delete the variants — **a pure rename,
   provably zero computed-style change**, verified by the same harness as S1.

So the call sites are edited twice in total, but only **once for meaning**. The second edit is a
rename a machine can verify. The alternative — value-named tokens like `--text-12-8` — leaves a
permanent vocabulary that lies as soon as S2 re-points it.

**A3 — band assignment is mechanical in S1.** S1 maps *values* to bands, not call sites to roles.
Judging that a given call site is semantically a label rather than a caption is S2's work, where the
visual gate can see the result. Where S2 finds a call site in the wrong band, it corrects that site
individually **with a stated reason** — it does not sweep.

**A4 — the ladder is fixed and is not S1's business.** For reference only, **updated 2026-08-23**:
`9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27`, body 13, **ratio 1.2** (planning report §3.1, owner decision
§8.1c Q8b). S1 assigns bands against it; S1 does not apply it.

Two properties of this ladder that S1 must respect while assigning:

- **Ties resolve upward.** Two of today's values sit exactly between two steps: **10 px** (137 call
  sites) and **17 px**. They belong to `--text-meta` (11) and `--text-title` (18.5) respectively. A
  codemod that rounds to nearest without this rule will split them arbitrarily.
- **`meta` and `label` are one band, not two.** The earlier 1.125 ladder separated 10.5 and 11.5; the
  chosen one does not. S1 assigns both to `--text-meta` variants and does **not** invent a
  `--text-label` band to preserve the old distinction — that distinction is carried by `.ty-*`
  (planning report §3.2).

**A5 — exemptions, enumerated before the codemod is written.** These are not migrated:

- the three container-query rules (`font-size: clamp(… cqw …)`) — fit-to-box, not a scale step
- the `--gs` family (`calc(<n>px * var(--gs))`)
- inline `fontSize` computed at runtime from game state (`Battlefield.jsx` floats, score sizing)
- game-piece text: card marks and board counters in `CardGrid.jsx`, `ArchitectScreen.jsx`,
  `Battlefield.jsx` — sized against artwork, not reading distance. They may take tokens of their own
  later; they do not take the menu bands

**A6 — `.ty-*` stays.** It carries family and numeric variant, which `--text-*` cannot express. The
two compose: `ty-num text-label`.

---

## Task-specific inputs

| Input | Where |
| --- | --- |
| Measured typography inventory, 13 screens × 5 widths × 2 languages | `docs/workstreams/viewport-1280/evidence/survey/matrix.json` |
| The zero-delta comparison, and the scale fit | `planning-report.md` Appendix |
| The five ratchets, with line numbers | `planning-report.md` §0.2 |
| The unlayered-cascade constraint and why the roles carry no size | `src/index.css`, the `#typo` block above `.ty-num`; `docs/decisions/engineering-log-2026-08.md` `#typo` |
| Capture harness | `scripts/cdp.mjs`, `viewport-proof.mjs`, `phone-proof.mjs`, `pixel-diff.mjs`, `surveyProbe.js` |
| Visual review flow V1–V4 | `docs/engineering/task-lifecycle.md` §8 |

---

## Acceptance gate

**One criterion decides this task:**

> Re-running the survey over the same screens, widths and languages yields **zero deltas in computed
> `font-size`, `font-weight` and `font-family` on every matched node**, against the V1 measurement.

A non-zero delta is a defect in S1. It is never a design question, and it is never resolved by
adjusting the expectation.

Supporting criteria, all required:

1. No `text-[Npx]` size utility remains in `src/ui/**` outside the A5 exemptions. **Guarded**, so the
   next workstream cannot quietly add one back.
2. Class order inside every rewritten attribute is unchanged (`go-ruhe.test.js:401` still passes).
3. Every provisional token is reachable from at least one call site — no dead tokens.
4. The band map is committed as a table: current value → token name → band → node count.
5. Phone captures pixel-identical to V1, beyond the harness's documented noise floor.
6. Gates, unpiped, in this order:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

plus the `VITE_PREVIEW=1` build — S1 changes `src/`, so both variants matter.

**Never pipe a gate command.** `npm test | tail -20` reports the exit code of `tail`.

`npm run loc:export` is **not** required: no player-visible string changes. If one does, the task has
left its scope.

7. Each touched or added guard **counter-checked** by deliberately breaking its seam and observing
   the failure. A guard that is merely green is not evidence.

---

## Expected file surface

### Expected to change

`src/index.css` (the `@theme` block and the tokenisable declarations) · `src/ui/**` and
`src/App.jsx` (className attributes only) · `test/` at the four ratchet sites plus the new guard ·
`docs/workstreams/typography-system/**`

### Must not change — verifiable by blob or tree hash

`docs/decisions/**` · `docs/workstreams/viewport-1280/**` · `docs/workstreams/viewport-harness/**` ·
`src/game/**` · `src/i18n/**` · `src/assets/**` · `sim/**` · `src/main.jsx` · `index.html` ·
`package.json` · `package-lock.json` · `vite.config.js` · `eslint.config.js` · `AGENTS.md` ·
`CLAUDE.md` · `.gitattributes` · `.github/**` · `public/**`

`src/i18n/**` is on that list deliberately: this task cannot have a reason to touch a string, so a
diff there is a scope breach and should be visible as one.

### Must not change behaviourally — reviewer must judge

`scripts/**` — the capture and survey scripts may gain assertions or output, but the measurement they
perform must stay comparable to V1. A survey that changed what it measures cannot prove a no-op.

Anything outside this surface is **recorded and reported before it is changed**, not silently
included.

---

## Known hazards

| # | Hazard | Handling |
| --- | --- | --- |
| H1 | One wrong token at one call site | The acceptance gate catches it node by node. Run the zero-delta check **during** the migration, not once at the end |
| H2 | A codemod reorders classes inside an attribute | `go-ruhe.test.js:401` fires. Substitute in place |
| H3 | A ratchet is "fixed" by relaxing it | Re-express against the token, counter-check. Never weaken a guard for green CI |
| H4 | The `--gs` and container-query rules get swept up | A5 enumerates them before the codemod exists; `go-ruhe.test.js:466` fires if it happens |
| H5 | Tailwind tree-shakes an unused token and a call site silently loses its size | Criterion 3 (no dead tokens) plus the zero-delta check |
| H6 | The suite goes green while the UI is wrong | The suite does not render (`testing.md` §10). The zero-delta measurement, not the suite, is the evidence here |
| H7 | Sibling worktree lands on `dev` mid-task | Surface it, do not silently rebase around it (`AGENTS.md`) |

---

## Definition of done

- [ ] Start condition verified, base SHA recorded in this contract
- [ ] `npm ci` run in the worktree
- [ ] S0's inventory and V1 capture inherited; the one-command re-check run and matching
- [ ] S0's coverage record read, and the not-machine-checked screens carried into the handoff
- [ ] Provisional token set defined in `@theme`, plain (not `inline`)
- [ ] All in-scope call sites migrated; A5 exemptions untouched and enumerated
- [ ] Band map committed as a table
- [ ] Four ratchets handled, the fifth verified unchanged, new `.ty-*`/token guard added
- [ ] Every touched and added guard counter-checked, each counter-check recorded
- [ ] **Zero-delta acceptance gate met and the measurement committed**
- [ ] Phone pixel-identity verified
- [ ] All four gates plus the preview build green, unpiped, results reported honestly
- [ ] Evidence package written: diff range as SHAs, scope compliance verified by hash, reproduce
      commands, and **what was not proven**
- [ ] Branch clean, committed, pushed
- [ ] Handoff written for the independent review, and for S2
