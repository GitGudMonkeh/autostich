# Task Contract — S2: collapse, retune, document (`#typo-system`)

**Status:** proposed. **Blocked by S1.** Written now, on purpose: S2 carries the entire visible
change, and a contract for it drafted after S1 finishes would be drafted under schedule pressure —
the failure mode R9 names. It is written while nothing is urgent.
**Written:** 2026-08-23 by the planning session.
**Follows** `planning-report.md` in this directory. Where the two disagree, **this contract wins**.

**What S2 is.** S1 leaves ~39 provisional tokens, each still holding its current value, and a tree
that renders byte-identically to before. S2 collapses those tokens onto the seven-step ladder,
expressed **only** as a desktop override, closes the weight-ladder leak, and writes the convention
down. **This is the task where the product changes.**

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | `#typo-system` S2 — collapse to the ladder, retune, document |
| **Branch** | `task/typo-s2-scale`, off `feature/typo-system` after S1 has merged up |
| **Base** | record the `feature/typo-system` SHA here before the first commit |
| **Worktree** | `C:\Code\Autostich-worktrees\typo-s2-scale` — **new**, `npm ci` first |
| **Owner** | Claude worker, single writer |
| **Reviewer** | **None.** S1 got the independent review because its defect mode is invisible; S2's real gate is human eyes at V3, and a technical reviewer adds little to a question about how something looks |

---

## Start condition

- S1 merged into `feature/typo-system`, its zero-delta gate met and its evidence committed.
- S0's coverage record in hand — S2 must know which screens carry **no** machine check.
- `dev` still frozen for desktop changes.

---

## Scope

### 1. Collapse — two commits, never one

Per S1's *Approved architecture* A2, and the order matters:

1. **Re-point.** Every provisional token in a band takes that band's ladder value.
   **Values change; no call site is touched.** This is the visible commit, and it is the only one.
2. **Rename.** `text-meta-2`/`text-meta-3` → `text-meta`, variants deleted. **A pure rename with
   provably zero computed-style change**, verified by the same harness as S1.

Mixing them produces a diff where nobody can tell which line moved a pixel.

**The ladder** (planning report §3.1, owner decision §8.1c Q8b) — ratio 1.2, body 13 px:

```text
9 · 11 · 13 · 15.5 · 18.5 · 22.5 · 27          (+ display 30 / 38.4 / 88, exempt)
```

**The roles** (§3.2) — seven, fixed in planning:
`--text-micro` 9 · `--text-meta` 11 · `--text-body` 13 · `--text-body-lg` 15.5 ·
`--text-title` 18.5 · `--text-head` 22.5 · `--text-figure` 27.

### 2. Desktop-scope every retuned value

The collapse lives **only** inside `@media (min-width: 1280px)`. Base token values stay at the numbers
S1 recorded.

**This is what makes the mobile non-goal structural instead of careful.** Mobile cannot move, because
no value it reads was edited. A retune that leaks outside that media query is a defect, not a
judgement call — guarded, and the guard counter-checked.

### 3. Tune at 1280×720, verify upward

Planning report §7.4b. The itch.io release ships into 1280×720, no design rule exists below
`max-height: 820px`, and the ladder pushes reading text **upward** (12 → 13 px). Vertical pressure
lands exactly where there is least room.

**Working rule: tune at 1280×720 and verify upward. Never tune at 1920 and check downward.**

If 13 px will not fit the panels there, **the fallback is one number** — base 13 → 12.5, in one
block, and every screen follows. That is the system doing its job. Reaching instead for a per-screen
exception is the failure this workstream exists to prevent.

**How hard to tune, given that overflow is now accepted (§8.1d Q11b).** Not harder than the one
number above. The rule stays because *where* you tune from still decides which base is right, and
picking the base is a decision this workstream owns and the rework will inherit. But do **not** spend
effort making panels fit that a rework is about to re-cut anyway — measure the overflow, record it,
move on. **The deliverable is the right base and an honest list, not a tidy 720 screenshot.**

### 4. Close the weight-ladder leak

The ~58 `font-weight:` declarations in `src/index.css` that bypass the `@theme` remap — the source of
all 220 off-ladder nodes at 650/700/800/900 — **move onto 400/500/600.**

Exceptions **only** where already on record: the large announcement (`Battlefield.jsx`, 800 at
40–100 px) and the workshop card preview. A new exception needs its reason in the comment at the
declaration, per house rule.

**Pre-registered visible effect:** some desktop headings render less heavy than today. That is the
intended outcome. At V4 it is classified *expected*, not a finding.

### 5. Write it down

A typography section in `docs/engineering/conventions.md` — the document has **none** today. It
carries:

1. the seven-row role table: name, base value, desktop value, intended use;
2. the rule, stated so it cannot be misread: ***a menu picks a role, or changes a role for everyone.
   A menu does not introduce a size.***
3. the escape hatch and its price: a menu that needs a value no role provides proposes a **new
   role** — reviewed once, available to all. Not a call-site number.
4. the exemption list (planning report §5 items 5 and 6), so the menu pass does not "fix"
   container-query text into fixed steps and undo a deliberate decision.

Without this section the system decays back into call sites within two workstreams. The planning
report is a record of a decision; a conventions section is an instruction that survives it.

### 6. V2, and the handoff

- V2 capture: same screens, same sizes, same DPR, same seeded state as V1. S0's capture record says
  how.
- Hand V2 to the **V3 human gate**, as a **before/after pairing per screen** — the owner's stated
  requirement (§8.1d Q11b: *"vorher nachher reicht"*). No annotated overlays, no diff heatmaps, no
  commentary asking to be agreed with. Two images, same parameters, side by side.
- **Do not report the visual result as approved** — that is not a claim any agent makes
  (`task-lifecycle.md` §8). The relaxed criteria change what counts as a defect; they do not move the
  judgement from the owner to the worker.
- V4 classification: every finding gets a row and an ID in one of the four dispositions. **Expect the
  bulk to land in "New design question → backlog entry, named as input to a future workstream"** —
  that workstream being the menu-and-panel rework. That is the correct disposition for accepted
  overflow, not a way of tidying findings away: each still gets an ID, and the set of IDs is the
  rework's input.

---

## Non-goals

1. **No layout change — and after 2026-08-23 this is a licence, not just a restriction.** A retuned
   size that overflows a lane is a **V4 finding, classified and handed to the menu-and-panel
   rework** — which re-cuts lanes anyway, and which the owner has confirmed follows this workstream
   regardless. S2 does not re-cut them. Expect volume: at ratio 1.2 roughly 42 % of menu text moves,
   so overflow is the normal case. **Resist the urge to "just fix" the ones that look bad** — every
   such fix is work thrown away twice over, once when the rework re-cuts it and once when its
   presence hides a finding the rework needed.
2. **No mobile change.** Structural, per part 2.
3. **No new size step to rescue a distinction.** Specifically: `meta` and `label` are **one** band on
   this ladder. If two things at 11 px read too alike, the fix is `.ty-*` — family, weight, case,
   tracking — not a reintroduced step. A private extra step would silently return one row to the
   1.125 ladder.
4. **No `@layer` restructuring of `index.css`.** The unlayered position is load-bearing.
5. **No panel, radius, shadow or padding work.** That is the successor workstream (planning
   report §9), and mixing surfaces into this diff gives the V3 reviewer two variables where the
   claim needs one.
6. **No PR, no push to `test`/`main`.**

### Tripwire

If closing the weight leak or the collapse starts requiring per-screen size exceptions to keep a
screen looking right, **stop and report.** More than two such exceptions across the whole tree means
the ladder or its base is wrong, and that is a planning question, not something to absorb quietly at
the call site.

---

## Acceptance gate

- [ ] **Distinct rendered sizes across the desktop screens drop from 39 to the seven ladder steps
      plus the display sizes.** The residue is exactly the §5 exemptions, enumerated, not estimated
- [ ] **Displacement lands in the corridor, not under a ceiling:** ~42 % of menu text moved > 5 %,
      **worst case ~10 %**. Materially *larger* means the collapse overshot; materially *smaller*
      means some screen kept its old values. The worst case is the load-bearing half — above ~10 %
      a value missed its step, and that is where clipping comes from
- [ ] **At 1280×720: every new clip, overflow or scrollbar is *found and written down*.**
      **Downgraded from a gate to an observation, owner 2026-08-23 (§8.1d Q11b)** — *"wenn die Menüs
      und Panels fucked sind, ist das ok"*, because a complete menu-and-panel rework follows this
      workstream. So overflow no longer blocks integration. **It is still measured**, and the list is
      a **handoff deliverable to the rework**, which needs to know where the type outgrew the boxes.
      A finding recorded is worth more here than a lane hastily re-cut and then thrown away
- [ ] The **one** thing that still blocks: text that is **unreadable or absent** — clipped to zero,
      overlapping to illegibility, or pushed out of a scrollable region with no way to reach it.
      "Ugly" is accepted; "cannot be read" is not, and no rework schedule makes it acceptable
- [ ] Guide and glossary measured **individually** — 29 and 22 distinct sizes today, the two screens
      the owner named. Each lands on the ladder; each gets its own V3 comparison
- [ ] Distinct rendered weights back to 400/500/600, or each survivor is a named exception with its
      reason at the declaration
- [ ] **Phone pixel-identical**, via `phone-proof.mjs compare before after`. Above the harness's
      documented noise floor is a defect
- [ ] No retuned value outside the `@media (min-width: 1280px)` block. Guarded, counter-checked
- [ ] **The one-edit test, performed and recorded:** change one token value, rebuild, and every screen
      using that role moves. The goal restated as an experiment — if it fails, the workstream has not
      delivered regardless of how the screens look
- [ ] A new size cannot be introduced at a call site without failing a guard
- [ ] `conventions.md` typography section written, with all four items of part 5
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db` green,
      unpiped. Preview build (`VITE_PREVIEW=1`) also builds
- [ ] V2 complete and matching V1's parameters exactly
- [ ] V3 passed **by a person**; V4 classification table written, every finding with an ID

## Definition of done

- [ ] Start condition verified, base SHA recorded
- [ ] `npm ci` run in the worktree
- [ ] Collapse landed as two separate commits, re-point before rename
- [ ] Weight leak closed; exceptions listed with reasons
- [ ] `conventions.md` section written
- [ ] Acceptance gate met, each box against a real result
- [ ] V2 captured, V3 gate passed by the owner, V4 table written
- [ ] Screens with **no machine check** (S0's coverage record) named explicitly in the V3 handoff, so
      the reviewer knows where to look hardest
- [ ] Evidence package written, including **what was not proven**
- [ ] Branch clean, committed, merged into `feature/typo-system`
- [ ] Handoff written for the "adapt all menus" workstream: token table, the one rule, the escape
      hatch, the exemption list, and **V2 as that workstream's V1 baseline**
