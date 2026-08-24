# Task contract — MH1 · Harness · `#menu-rework`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/desktop-menus/planning-report.md` disagree, this contract wins.

**You do not touch a screen.** This task repairs the instrument the remaining nine screens are
measured by. It exists as its own task for one reason: a screen task that also rebuilds its own
measuring device has two variables, and when the result is wrong nobody can say which one failed.

---

## Identity

| | |
| --- | --- |
| **Task** | `MH1` — the measurement harness |
| **Branch** | `task/menu-mh1-harness` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | the tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C — this is the *measurement task as a named deliverable* (`task-lifecycle.md` §5) |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive.** M3 does not start until this lands |
| **Reviewer** | None requested |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Preview port** | **5189** |
| **Survey port** | **5181**, hardcoded with `--strictPort` |

**Green at handover:** `npm test` **142 files / 2206 tests** · `lint --max-warnings=0` · `build` ·
`gen:db`, all exit 0.

---

## Scope — three items, in this order

### 1. The survey needs a state axis (MENU-56)

Today the survey has a **surface** axis: navigate to a screen, capture it. It has no **state** axis, so
no cell renders the segment controls in their selected, hovered, focused or disabled states.

The consequence, measured by M2b: **the gate cannot see the largest change the owner approved on that
screen.** M2b measured it in a browser and reported the gap rather than letting the gate feign
coverage. Nine screens remain and every one has controls with states.

**Build the state axis.** A cell becomes *(surface, language, size, DPR, **state**)*. What a state is
and how it is reached is yours to design — the constraint is that it must be **declared per surface
and reproducible**, in the same spirit as `SURFACES`' existing `steps` and `marker`: a state that is
reached but not asserted is a state that silently stops being reached.

**Do not make it a full cross product.** 15 surfaces × 5 sizes × 2 languages × 2 DPR is already 300
cells; multiplying by every state would make the round's gate unrunnable. States are declared where
they carry a decision, not everywhere.

### 2. `surface-delta.mjs` must not truncate silently (MENU-55)

It prints **200 of 410**. Read as complete, the output looked like *"deltas only in German, a hole at
1920×1080"* — a finding that did not exist. M2b caught it by re-aggregating.

**Either print all of it, or say what was withheld and how much**, in the output itself, where a
reader who does not know the tool will see it. A tool that silently truncates a comparison
manufactures false findings, and those are expensive precisely because they look measured.

**While you are in there:** any other place this harness summarises without saying so. Same rule.

### 3. Build MENU-38's ratchet, and re-measure the family

The ruling exists in `conventions.md` §2c and was never implemented — the planner's own miss. The
translucent neutral edge, `rgba(150, 150, 170, …)`, is counted per migrated file and fails on growth,
exactly as ink is.

**Re-measure the family first.** The ruling said seven alphas; M2b found an **eighth** (MENU-44). The
ratchet's starting count must come from a fresh measurement, not from the ruling's number.

---

## Non-goals, and the tripwires

| Non-goal | Why |
| --- | --- |
| **Any screen.** No `src/ui/*.jsx`, no `.xx-*` rules in `index.css` | This task changes the instrument, not the subject |
| Changing what a past comparison concluded | If the repaired harness contradicts a landed finding, that is a **new finding with an ID**, not a silent revision |
| The vocabulary | Closed. `@theme` is not your surface |
| Anything below 1280 px | Owner decision |
| A new dependency | House rule — the owner is **asked**. `cdp.mjs` is dependency-free on purpose; read its header before reaching for one |

### Tripwire

> **If this diff touches a screen's markup or its `.xx-*` rules — stop.** The instrument and the
> subject do not move in the same commit.

---

## The hazard that is specific to this task

**A harness change invalidates the baselines taken with the old harness.** The nine remaining screens
compare against captures produced before you.

**Resolve it by measuring, not by assuming:** after the change, re-run the noise-floor check that
MENU-58 established — **the same tree captured twice, expecting 0 deltas across the cell set.** If the
new harness reports a non-zero floor, it has introduced scatter and the round loses the property that
makes every comparison attributable. That check is this task's acceptance gate.

*MENU-58 measured zero on 160 cells. Your job is to still be able to say that afterwards.*

---

## Acceptance gate

> **The noise floor is still measured zero after the change, on a cell set that now includes states —
> and `surface-delta.mjs` cannot report a partial comparison without saying so.**

---

## Expected file surface

| File | |
| --- | --- |
| `scripts/viewport-survey.mjs` | the state axis |
| `scripts/surface-delta.mjs` | truncation |
| `scripts/cdp.mjs` | only if the state axis genuinely needs it |
| `test/panel-tokens.test.js` | MENU-38's ratchet |
| `test/*` | guards for the above |
| `docs/workstreams/desktop-menus/measurements/MH1.md` | |

**Must not change:** any `src/ui/**`, the `@theme` block, `test/typo-tokens.test.js`, anything inside
`@media (max-width: …)`.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] **State axis** built, declared per surface, reachable and asserted — a state reached but not
      asserted silently stops being reached
- [ ] The cell count after the change is **stated**, with the reason for what was and was not given a
      state
- [ ] `surface-delta.mjs` prints in full, or names what it withheld and how much, in its own output
- [ ] **MENU-38's ratchet built**, its starting count from a **fresh** measurement of the family, not
      from the ruling's seven
- [ ] **Noise floor re-measured: same tree twice, 0 deltas**, on the new cell set. If non-zero: stop
      and report — do not tune it away
- [ ] Guards for all three, each counter-checked by deliberately breaking the seam
- [ ] Measurement record `measurements/MH1.md` — the four parts, and Part 3 re-measures the decision
      block
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer
- [ ] Working tree clean; worktree left in place for M3
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
