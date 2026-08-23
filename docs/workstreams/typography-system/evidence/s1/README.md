# S1 evidence — provisional tokens, value-preserving migration, and the proof

**Task:** `#typo-system` S1 (`task-contract-S1.md`) · **Branch:** `task/typo-s1-tokens`
**Base:** `feature/typo-system` at `7b131f1a` · **Date:** 2026-08-23

---

## 1. The acceptance gate — zero delta

The whole reason S1 exists as a task of its own: prove by machine that a 900-site substitution changed
nothing. Re-run the survey against S0's V1 matrix, node by node.

| | |
| --- | --- |
| Cells compared | **150** — 15 surfaces × 5 viewports × 2 languages |
| Text nodes compared pairwise | **26 405** |
| **Deltas in size / weight / family** | **0** |
| Paths present in only one run | 70 / 343 — **all on `leaderboard`, no other screen contributes one** |

The unmatched paths are the network-dependent global-board rows S0 §4.2 predicted and told S1 to
expect. That they land **entirely** on that one screen is a second, independent confirmation of the
S0 finding: had the migration disturbed structure anywhere, the unmatched nodes would be spread.

**Reproduce:**

```bash
npm run build
node scripts/viewport-survey.mjs --out <tmp>
# then compare <tmp>/matrix.json against evidence/v1/matrix.json, matching nodes by cells[*].type[*].path,
# treating an absent path as "not comparable" rather than as a delta (S0 §4.2)
```

## 2. Mobile — unchanged

`phone-proof.mjs`, both languages, five screens, 390 px.

| Proof | Result |
| --- | --- |
| **2 — rendered geometry** | **identical on all ten cells**, node for node (163 · 472 · 412 · 171 · 372 per language) |
| **2b — pixels** | **0.0000 % beyond noise** on all ten. Raw differences peak at delta 2 on the shop, inside the harness's own documented floor |
| 1 — rule applicability | **differs, and cannot do otherwise** — see below |

**Proof 1 is not applicable to this change, and saying so is more useful than reporting a failure.**
It compares the *text* of the rules that apply at 390 px, on the reasoning that an identical rule set
cannot move the layout. That is a sufficient condition, not a necessary one. S1 renames classes —
`.text-2xl` becomes `.text-body-5` — so the rule text necessarily differs and proof 1 must report a
difference no matter how correct the change is. Its failure here carries no information; proof 2 is
what answers the question, and it answers it with identical geometry across 2854 nodes.

## 3. The band map

What each provisional token holds, and the band it will collapse onto in S2. **Assignment is
mechanical — nearest ladder step, ties upward.** Whether a given call site is semantically a label or
a caption is S2's judgement.

| Band → S2 name | Provisional token | Current value | Came from |
| --- | --- | --- | --- |
| **micro** → `--text-micro` (9) | `--text-micro-1` | 7px | `text-[7px]` |
| | `--text-micro-2` | 8px | `text-[8px]`, CSS |
| | `--text-micro-3` | 9px | `text-[9px]` |
| | `--text-micro-4` | 9.5px | `text-[9.5px]` |
| | `--text-micro-5` | 7.5px | CSS only |
| | `--text-micro-6` | 8.5px | CSS only |
| **meta** → `--text-meta` (11) | `--text-meta-1` | 10px | `text-[10px]` — **tie, resolved up** |
| | `--text-meta-2` | 10.5px | `text-[10.5px]`, CSS |
| | `--text-meta-3` | 11px | `text-[11px]`, CSS |
| | `--text-meta-4` | 11.5px | `text-[11.5px]`, CSS |
| | `--text-meta-5` | 0.72rem (11.52px) | CSS only |
| **body** → `--text-body` (13) | `--text-body-1` | 12px | `text-[12px]` — **tie, resolved up** |
| | `--text-body-2` | 12.5px | `text-[12.5px]`, CSS |
| | `--text-body-3` | 13px | `text-[13px]`, CSS |
| | `--text-body-4` | 13.5px | `text-[13.5px]`, CSS |
| | `--text-body-5` | 0.75rem **+ line-height** | `text-xs` |
| | `--text-body-6` | 12.8px | CSS only |
| | `--text-body-7` | 0.82rem (13.12px) | CSS only |
| **body-lg** → `--text-body-lg` (15.5) | `--text-body-lg-1` | 14px | `text-[14px]`, CSS |
| | `--text-body-lg-2` | 14.5px | `text-[14.5px]`, CSS |
| | `--text-body-lg-3` | 15px | `text-[15px]`, CSS |
| | `--text-body-lg-4` | 16px | `text-[16px]`, CSS |
| | `--text-body-lg-5` | 0.875rem **+ lh** | `text-sm` |
| | `--text-body-lg-6` | 1rem **+ lh** | `text-base`, CSS `1rem` |
| | `--text-body-lg-7` | 0.9rem (14.4px) | CSS only |
| | `--text-body-lg-8` | 16.5px | CSS only |
| | `--text-body-lg-9` | 1.05rem (16.8px) | CSS only |
| **title** → `--text-title` (18.5) | `--text-title-1` | 17px | `text-[17px]`, CSS — **tie, resolved up** |
| | `--text-title-2` | 18px | `text-[18px]` |
| | `--text-title-3` | 19px | `text-[19px]`, CSS |
| | `--text-title-4` | 20px | `text-[20px]` |
| | `--text-title-5` | 1.125rem **+ lh** | `text-lg` |
| | `--text-title-6` | 1.25rem **+ lh** | `text-xl` |
| **head** → `--text-head` (22.5) | `--text-head-1` | 21px | `text-[21px]` |
| | `--text-head-2` | 24px | `text-[24px]`, CSS |
| | `--text-head-3` | 1.5rem **+ lh** | `text-2xl` |
| | `--text-head-4` | 23px | CSS only |
| **figure** → `--text-figure` (27) | `--text-figure-1` | 27px | `text-[27px]`, CSS |
| | `--text-figure-2` | 25px | CSS only |
| | `--text-figure-3` | 26px | CSS only |
| **display — NOT collapsed** | `--text-display-1` | 1.875rem **+ lh** | `text-3xl` |
| | `--text-display-2` | 2.25rem **+ lh** | `text-4xl` |
| | `--text-display-3` | 3rem **+ lh** | `text-5xl` |
| | `--text-display-4` | 1.9rem (30.4px) | CSS only |
| | `--text-display-5` | 46px | CSS only |
| | `--text-display-6` | 56px | CSS only |

**46 provisional tokens.** The named-scale variants (`-5`/`-6` rows above) exist because
`text-xs`/`sm`/`base`/`lg`/`xl`/`2xl` are not bare sizes — Tailwind pairs each with a line-height.
A size-only token would have silently changed the line-height at 259 call sites.

## 4. What was migrated, and what was not

| | Count |
| --- | --- |
| JSX size utilities substituted | **740** of 770 |
| `font-size` declarations in `index.css` tokenised | **144** of 163 |
| **Total call sites touched** | **884** |

**Not migrated, and each is on the contract's A5 list rather than a discovery:**

- `CardGrid.jsx` (25) and `Battlefield.jsx` (4) — card marks and board counters, sized against
  artwork rather than reading distance. Exempting the whole file is deliberately coarser than "the
  card face only": a line-range rule rots the moment either file is edited, and both are almost
  entirely game-piece text. **S2 must not collapse these onto a reading band.**
- One occurrence in `MuteButton.jsx` — prose inside a comment.
- 19 `font-size` declarations that do not resolve to a fixed value: the `--gs` family (13), three
  container-query `clamp(… cqw …)`, `var(--wm-size, …)`, `calc(2rem * var(--num-scale))` and the KPI
  `max(14px, min(27px, …))`.

**Line-heights in the stylesheet are deliberately not tokenised.** A line-height is not a `--text-*`
value; in Tailwind's model it *pairs* with a size token. Forcing the 35 standalone ones into that
namespace would invent pairings that do not exist and would make S2's collapse move line-heights
nobody asked it to move. S2 may revisit them with the visual gate open, which is where that decision
belongs.

## 5. Ratchets — five fired, one more than predicted

| Ratchet | Predicted | Handling |
| --- | --- | --- |
| `global-board.test.js:91` | yes | literal re-expressed against the token |
| `go-ruhe.test.js:127` | yes | literal re-expressed |
| `go-ruhe.test.js:401` | "verify it still passes" | **it did not** — it compares `indexOf` positions of three class literals, and one of the three was renamed. Same literal updated; the position check itself is untouched |
| `go-ruhe.test.js:466` | unchanged | unchanged — container-query sizing is exempt |
| `levelup-wings.test.js:336` | yes, counter-check | **re-expressed to compute**: it now resolves the token out of `@theme` and asserts the value is 12px, so it checks the measured 158→133 px relationship rather than a spelling. Counter-checked twice — re-pointing the token to 13px fails it, removing the declaration fails it |
| **`hub-panels.test.js:224`** | **NOT on the list** | pins `as-kpi-v text-[27px]`. Same shape as the others; re-expressed against the token |

**None was loosened.** Every one of them still fails if the thing it protects is broken.

## 6. The new guard — `test/typo-tokens.test.js`

The `.ty-*` roles went in six days before the tokens and carried **no guard at all**. This is it.

The contract it enforces: roles carry family, weight and tracking and **no `font-size`**; tokens carry
size. The split is forced by the cascade, not chosen — `index.css` is unlayered, so a `font-size` in a
role would beat the token at every call site carrying it, and **nothing would look broken** until
someone edited a token and watched nothing move.

**Six seams counter-checked, each sabotaged and observed to fail:**

| Sabotage | Result |
| --- | --- |
| `font-size` smuggled into `.ty-num` | fails ✓ |
| `@theme` → `@theme inline` | fails ✓ |
| a role emptied of family and weight | fails ✓ |
| an undefined `var(--text-…)` read | fails ✓ |
| a raw px `font-size` put back in the stylesheet | fails ✓ |
| a `text-[11px]` added at a non-exempt call site | fails ✓ |

State restored clean after each.

**The guard caught a defect in itself.** Its rule scanner anchored on the previous rule's closing
brace and *consumed* it, so two rules written back to back could never both be found — it reported
zero roles. It was noticed only because a companion assertion demanded that roles exist. The
complement assertion is why the bug surfaced instead of shipping as a silently-half-blind guard, and
it is left in the file for that reason.

## 7. Defects found and fixed during the task

**The codemod rewrote prose.** It changed `text-xs` inside a German comment in `SkillSelect.jsx` that
describes what the code *used to* look like. Updating it would have turned a historical note into a
false statement — those old boxes never carried `text-body-5`. Reverted. This is precisely the hazard
`AGENTS.md` names, and the `#viewport-1280` block warns about it in this very stylesheet. The new
guard strips comments before scanning for the same reason.

## 8. Gates

`npm test` (139 files) · `npx eslint . --max-warnings=0` · `npm run build` · `npm run gen:db` —
all run bare and unpiped, all green.

## 9. What this does NOT prove

- **The 168 utilities on screens the survey cannot reach** (S0 §5) are migrated with **no machine
  check**. `DeckDetail` (20) and `BuildSummary` (19) are the largest. A wrong token there will be
  caught by a person at V3, or not at all.
- **Nothing about how it looks.** S1's visual result is *none* by design. The suite does not render
  (`testing.md` §10), and a green gate here says the values did not move — not that the typography is
  good. That question is S2's, and its answer is the V3 human gate.
