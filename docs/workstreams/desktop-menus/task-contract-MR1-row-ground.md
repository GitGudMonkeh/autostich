# Task contract — MR1 · The row ground · `#menu-rework`

**One value, eight sites, four screens. Nothing may look different afterwards.**

This task exists because the planner minted `--sf-row` after the freeze
(`conventions.md` §2c — *`--sf-row`, the threshold fires*). Minting the token was the decision;
this is carrying it out.

---

## Identity

| | |
| --- | --- |
| **Task** | `MR1` — adopt `--sf-row` |
| **Branch** | `task/menu-mr1-row-ground` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | A — one value, a known file surface, a decision already taken |
| **Owner stops** | One, before integration. Nothing here is the owner's to decide |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2287 tests · lint · build · gen:db, all exit 0.

---

## Scope — the eight sites

*Measured 2026-08-25. Verify the list before you trust it; a ninth may have arrived.*

```
rgba(15, 15, 21, .72)

  src/index.css:4348  4789  4976  5610      four rules, each with !important
  src/index.css:5548  5566                  two rules, plain
  src/ui/FeedbackModal.jsx:38               const ROW_BG, set inline
  src/ui/UsernameModal.jsx:37               const ROW_BG, set inline
```

Define `--sf-row: rgba(15, 15, 21, .72)` in the `@theme` block and point all eight at it.

### The four `!important` come out

They exist for exactly the reason this round exists. `ROW_BG` is a **JS constant set inline**, and no
stylesheet rule can reach an inline literal — so four rules had to shout. Once the inline style emits
`var(--sf-row)`, the rules reach it and the `!important` is unnecessary.

**Delete them, and delete any comment that explains why they were needed.** M1 did the same at
`index.css:3060`; that is the pattern.

**If you find one where removing it changes the picture: stop and report.** Do not put it back
quietly, and do not keep it "just in case" — an `!important` nobody can justify is worse than one
that is explained.

---

## Acceptance gate

> **Zero computed deltas on every surface.**

This task changes nothing anyone can see. `--sf-row` is defined as the value those eight sites
already paint, so the survey must show what it showed before, everywhere — including the four screens
whose appearance the owner has already approved.

**A non-zero delta is not a small problem here. It means one of the eight sites was not painting what
the list says**, which is a finding worth more than the migration.

---

## Non-goals, and the tripwire

Any screen's composition · any other value · the vocabulary beyond this one token · anything below
1280 px · any type size, `.ty-*` role or `--text-*` token · a new dependency, icon or glyph ·
translating the German comments in `index.css` · **minting a second token**.

> **Tripwire — if this diff changes anything that renders differently, stop.** The whole point is
> that it does not.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The eight are nine.** The list was measured on 2026-08-25 and the tree has moved since | Re-grep before you start. Migrate what is there, and say what you found |
| **H-b** | **A site is not painting what the list says** — a near-miss value that grep caught loosely | Zero-delta is the check. A non-zero result is a finding, not a nuisance |
| **H-c** | **A guard counts literals and falls below its threshold** because you removed some. M9 hit exactly this with `#ueberzug` | Rewrite it to the **invariant**, not to a lower number. M9's rewrite ended up *stricter* — that is the shape. Counter-check by reintroducing the defect |
| **H-d** | **An `!important` turns out to be load-bearing** | Stop and report. Neither restore it silently nor keep it unexplained |

---

## Expected file surface

`src/index.css` (`@theme` plus the six rules) · `src/ui/FeedbackModal.jsx` · `src/ui/UsernameModal.jsx` ·
`test/panel-tokens.test.js` · any guard your diff actually breaks ·
`docs/workstreams/desktop-menus/measurements/MR1.md`

**Must not change:** any other `src/ui/**` file · anything inside `@media (max-width: …)` ·
`test/typo-tokens.test.js` · every `--text-*` token · the value of any token already shipped.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] The site list re-measured; **what you actually found is stated**, not what this contract said
- [ ] `--sf-row` defined once in `@theme`; all sites point at it
- [ ] **The four `!important` removed**, with their explanatory comments
- [ ] **Zero computed deltas on every surface** — the whole gate
- [ ] Allowlist and ratchets updated; ratchets may fall, never grow
- [ ] Guards: measured which break, each rewritten to the **invariant** and counter-checked
- [ ] Short measurement record — no comparison set is needed for a task that moves nothing, but the
      zero-delta result and the findings table are
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff, fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
