# Task contract — MH1 · Harness fixes · `#menu-rework`

**Two tool fixes. Not an expansion.** This task exists because a measuring tool that lies quietly is
worse than one that is honestly limited — and because the planner ruled something at the freeze and
never had it built.

**You do not touch a screen.** No `src/ui/**`, no `.xx-*` rules.

---

## Identity

| | |
| --- | --- |
| **Task** | `MH1` — harness fixes |
| **Branch** | `task/menu-mh1-harness` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | A — a known file surface, no architectural fork. The one sentence that says why: this task carries out decisions already taken and changes no screen |
| **Owner stops** | One, before integration. There is nothing to decide at the start |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview 5189 · survey 5181 |

**Green at handover:** 142 files / 2206 tests · lint · build · gen:db, all exit 0.

---

## Scope — three small things

### 1. `surface-delta.mjs` must not truncate silently

It prints **200 of 410**. Read as complete, its output looked like *"deltas only in German, a hole at
1920×1080"* — a finding that did not exist. M2b caught it by re-aggregating (MENU-55).

**Print it all, or say what was withheld and how much, in the output itself.** A tool that silently
truncates manufactures findings that are expensive precisely because they look measured.

Same rule anywhere else in the harness that summarises without saying so.

### 2. Build MENU-38's ratchet

Ruled at the freeze in `conventions.md` §2c, never built — the planner's miss. The translucent neutral
edge, `rgba(150, 150, 170, …)`, counted per migrated file, failing on growth, exactly as ink is.

**Measure the family first.** The ruling said seven alphas; M2b found an eighth (MENU-44). The
starting count comes from a fresh measurement, not from the ruling's number.

### 3. Label what the gate does not cover

The survey captures **surfaces, not states**. No cell renders the segment controls in their selected,
hovered, focused or disabled states, so the gate cannot see them (MENU-56).

**Do not build a state axis.** Owner decision, 2026-08-24: its payoff lands in the design rework,
which will know which states matter — guessing them now means touching it twice.

**Write the limitation where a reader of the output will see it**, in `viewport-survey.mjs`'s header
and in the delta tool's output:

> *Surfaces only. Control states are not captured and are verified by hand.*

That is the whole fix. A green gate that names its blind spot is honest; one that does not feigns
coverage.

---

## Tripwire

> **If this diff touches a screen's markup or its `.xx-*` rules — stop.** The instrument and the
> subject do not move in the same commit.

Also out: the vocabulary (`@theme` is not your surface), anything below 1280 px, a new dependency
(`cdp.mjs` is dependency-free on purpose — read its header before reaching for one).

---

## Acceptance gate

> **The noise floor is still zero.** Same tree captured twice, 0 deltas — the property MENU-58
> established and the one thing these changes could break.

If it comes back non-zero: stop and report. Do not tune it away.

---

## Expected file surface

`scripts/surface-delta.mjs` · `scripts/viewport-survey.mjs` (header only) ·
`test/panel-tokens.test.js` · a guard for each of 1 and 2 ·
`docs/workstreams/desktop-menus/measurements/MH1.md`

**Must not change:** any `src/**`, `test/typo-tokens.test.js`.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] `surface-delta.mjs` prints in full, or names what it withheld and how much
- [ ] MENU-38's ratchet built, starting count from a **fresh** measurement of the family
- [ ] The surfaces-only limitation written where a reader of the output sees it
- [ ] Both new guards counter-checked by deliberately breaking the seam
- [ ] **Noise floor re-measured: same tree twice, 0 deltas**
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] A short measurement record — this task moves no pixels, so it needs the noise-floor result and
      the findings table, not a comparison set
- [ ] Handoff, fifteen lines or fewer. Working tree clean, worktree left for M3
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
