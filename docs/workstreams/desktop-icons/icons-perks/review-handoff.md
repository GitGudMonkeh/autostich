# Review handoff — icons-perks

For **Codex**, as independent reviewer (`AGENTS.md` — *Roles and source of truth*; reviewer scope is
`docs/engineering/git-workflow.md` §9). Codex reviews; it does not implement.

| | |
| --- | --- |
| Task | `icons-perks`, Tier C |
| Branch | `task/icons-perks`, worktree `C:/Code/Autostich-worktrees/icons-perks` |
| Base | `origin/feature/desktop-icons` @ `3013881f723080753b8829feea4b051356f0cae0` |
| Contract | `docs/workstreams/desktop-icons/icons-perks/task-contract.md` — the binding scope, not restated here |
| Evidence | `evidence-package.md` |
| Visual | `visual-review.md` — **V3 passed by the owner, 2026-08-22** |

---

## Suggested reading order

1. **`task-contract.md` § Tripwire** — one paragraph, and it is what the whole task turns on.
2. **`visual-review.md` § "The measurement this task exists for"** — the zone, and the 5 px this task
   got wrong on the first pass.
3. **`scripts/skill-art-build.py`**, the block above the lot table — the same argument in the place
   the number lives.
4. **`src/ui/perkArt.js`** — the two-population split, ~80 lines.
5. **`test/perk-art.test.js`** — 32 assertions; the counter-check results are in the evidence package.
6. **`docs/art/legendaries/README.md`** — the light alignment, and the one method change.
7. **`src/index.css`**, the `.pk-offer-art` / `.pk-strip` / `.pk-strip-mid` block.

Everything else is assets.

---

## What this task did

Built the icon seam on the perk-selection screen, which had no icon code at all, and filled it. The
73 regular perks get the emblem of their category; the 21 legendary perks get their own.

Five parts, in the contract's order: the render zone was measured and recorded; the legendary lot was
ingested (21 masters, 21 delivery); the perk-category lot was baked (7 delivery); the wiring was
built behind the desktop gate; guards were added and each counter-checked by breaking its seam.

## The three things most worth a reviewer's scepticism

### 1. The zone number, and that it was wrong once

`strip_w = 265`. The perk **tile** is 270; the **image inside it** is 265, because the strip resolves
against the button's padding box and `.as-edge-card` carries a 4 px rarity edge plus 1 px on the other
three sides. The first pass measured the tile and baked both lots against 270 — a radius of 22.76 px
against the correct 23.18.

That is worth stating plainly rather than burying, because the contract's tripwire warns against a
*borrowed* constant and this was a *measured* one that measured the wrong box. If you are looking for
where this task could still be wrong, this is the shape of the error it already made once.

Re-derivable: `node docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs --label V2`
against `npm run dev -- --port 5184 --strictPort`.

### 2. The legendary strip is anchored differently from the category strip

`.pk-strip-mid` gives the legendary emblems `object-position: center center` where the category
emblems keep `center top`. This is the one place where the task made a visual decision instead of
finding one.

The argument is that `center top` exists because "the motifs have their statement at the top", which
is documented and true of the seven category masters (light centroid 0.42) and measurably false of
the 21 legendary ones (0.48) — they were never in this repository and never composed against that
rule. Top-anchored, Henker keeps 34.7 % of its light and what survives is the axe *shaft*.

**Judge whether that is applying the rule or overriding it** — as a code question. The *visual*
question is settled: the owner saw the both-anchors comparison over all 21 at V3 on 2026-08-22 and
approved it as shipped. Comparison image: `visual/V2-legendaries-anchor-comparison.png`.

### 3. The alignment statistic changed for the new lot

The perk-category factors are the README's, applied unchanged as the contract requires. The legendary
factors were solved against **total emitted light** rather than the **luminous area** the category set
used, because area-matching does not converge on this lot — five of 21 files hit the solver ceiling
and three were still short of target there.

The consequence to check: the two lots are now aligned by two different statistics. The defence is
that alignment is per lot and each set is internally consistent; the cost is that
`align --lot perkcats` now disagrees with what perkcats ships (E Form: 1.06 solved, 0.73 shipped).
That divergence is reported by the tool rather than acted on. See `ICONS-PERK-VIS-05`.

---

## Final card geometry — for `icons-corners`

`icons-corners` runs after this task because it needs the final geometry. This is it, read out of the
live DOM at 1600 × 900, 1920 × 1080 and 2560 × 1440 (identical at all three) and recorded in
`visual/V2-measurements.json` under `results.<size>.cards[].box`.

### The offer tile — `button.lv-offercard.as-edge-card`

| Property | Desktop (≥ 1400 px) | Below the gate (1280 × 720) |
| --- | --- | --- |
| Width | **270.00 px** | 230.00 px |
| Height | **317.50 px** with art | 172.38 px |
| `padding` | **`167px 12px 12px`** | `12px` |
| `border-radius` | **6px** | 12px |
| Border | **left 4px** (the rarity colour, `--c`), **1px** top/right/bottom | same |
| `overflow` | **hidden** | visible |
| `position` | **relative** | static |
| Grid | `270px 270px 270px`, `gap: 10px`, container 830 px, overlay card 880 px | `230px` × 3 |

### The header strip — `img.pk-strip`

| Property | Value |
| --- | --- |
| Box | **265 × 201 px** — 270 minus the 4 px and 1 px borders |
| Position | `absolute; left: 0; right: 0; top: 0` |
| `object-fit` | `cover`; `object-position` `50% 0%`, or `50% 50%` on a legendary |
| `mix-blend-mode` | `screen` |
| Mask | `linear-gradient(180deg, #000 62%, transparent)` |
| `filter` | `none` — and guarded to stay so |

### Five things that will bite `icons-corners`

1. **`overflow: hidden` is now on the tile**, and it was not before. Set by `.pk-offer-art`. A corner
   ornament that sits outside the border box will be clipped, and it will be clipped only on desktop,
   only when art is present.
2. **The tile height is content-dependent.** 317.50 px for this offer; V1 measured 162.50 px and
   126.75 px for two different offers of the same screen. Only the WIDTH is fixed. Do not anchor a
   bottom ornament to a constant.
3. **The top 201 px are already occupied** by a `screen`-blended emblem. A top corner ornament shares
   that space and will composite additively with it, not over it.
4. **The left edge carries 4 px of rarity colour** and the other three carry 1 px. A corner ornament
   that expects a symmetric border will sit 3 px off on the left.
5. **The `.pk-strip` / `.sk-strip` families are deliberately separate.** They differ in zone (265 × 201
   against 277-baked/210) and now in anchor. The contract named shared extraction as `icons-corners`'
   decision, and this task did not take it — `src/ui/skillArt.js`, `SkillSelect.jsx` and
   `LegendarySelect.jsx` are untouched. If you do unify them, the two zones are genuinely different
   numbers and the skill one is itself suspect (`ICONS-VIS-01`).

The `corners` lot is still `strip_w=None` in the build script and `bake --lot corners` still refuses.
That is intentional and is your zone to measure.

---

## Known state you will hit

**`npm test` reports 135 of 136 files green.** The one failure is
`test/i18n-guards.test.js` › "jeder Katalog-Schlüssel wird auch irgendwo benutzt", and it is a
**timeout at 5000 ms, not an assertion failure**.

It is pre-existing, and that was measured rather than asserted: reverting the tree to `HEAD` and
running the suite there fails the same way (2 of 3 runs, 5017 and 5154 ms). With this task's changes
present it fails 5 of 5, at 5121–5232 ms. Run alone, the same test takes 2050 ms over three runs — so
what is failing is the budget under parallel load, not the check.

Two honest caveats. The margin is ~150 ms, and `src/ui/perkArt.js` adds ~5 kB to the ~1.5 MB corpus
that guard concatenates and scans — about 0.3 % more work, inside the run-to-run spread but not
literally zero. And it is **not fixed here**: raising the budget means editing a guard this task does
not own, for a condition it did not create. Nothing in this task touches i18n.

Restoration of the working tree after the `HEAD` experiment was verified byte-identical with
`git hash-object`.

---

## Open questions — decisions deferred, not defects hidden

| # | Question | Who decides |
| --- | --- | --- |
| Q-A | ~~Should the legendary strip really be centre-anchored?~~ **Closed at V3, 2026-08-22.** The owner saw the both-anchors comparison over all 21 and approved it as shipped | Closed |
| Q-B | **Should the two lots be aligned to each other, not only to themselves?** They share a screen — a legendary tile beside two category tiles is the normal case, and the legendary median sits at 30.1 % luminous area against the category median's 23.5 %, so legendary tiles read brighter. Per-lot alignment is the contract's *Approved architecture* 6 and was followed; whether the architecture is right for *this* pair is a different question | Owner / future workstream (`ICONS-PERK-VIS-04`) |
| Q-C | ~~Is doubling the tile height wanted?~~ **Closed at V3, 2026-08-22.** 162.5 px → 317.5 px, approved as shipped | Closed |
| Q-D | **Is 384 px the right delivery size for a 265 px zone?** Inherited from the skill lots' reasoning (DPR cap 2 → 530 px would be exact; 384 is a 1.4× upscale that soft gradients forgive) and not re-derived here. At 265 the exact figure is 530, so the same reasoning holds, but it was reasoned, not measured | Reviewer, if it matters |
| Q-E | **`ICONS-PERK-VIS-05`** — `align --lot perkcats` disagrees with the shipped perkcats factors under the new statistic, most at E Form (1.06 vs 0.73). Shipping the README's numbers is what the contract requires. Should the two lots eventually use one statistic? | Owner / future workstream |
| Q-F | **The audit's 270.66 for the skill card** may itself be the skill BUTTON rather than the skill strip, by exact analogy with the 270/265 error this task made. If so, `ICONS-VIS-01` understates the discrepancy. Not investigated — touching the skill lots is a non-goal of this contract | Reviewer / a future task |
| Q-G | **Contract Q2** — does an S-category icon ever appear on a *regular* perk tile? S has 0 families and 1 perk, so on the current data: no, only via its single legendary. The emblem exists and the guard covers it either way. Reportable, not blocking | Noted |
| Q-H | **Contract Q3** — `E10` (`offerable: false`) is excluded from the legendary completeness guard, because it is neither offerable nor legendary. Recorded as an explicit assertion in `test/perk-art.test.js` so the gap reads as a decision | Noted |

Q-A and Q-C are closed by the owner's V3 verdict; the rest stand. A handoff with no open questions has
not looked hard enough — these are the ones this task can see, and the reviewer's job includes the
ones it cannot.

---

## Not done, deliberately

Nothing in the contract's *Must not be touched* list was touched: `SkillSelect.jsx`,
`LegendarySelect.jsx`, `skillArt.js`, `docs/art/skills/**`, `src/assets/skills/**`,
`docs/art/corners/**`, `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`.

Not committed and not pushed: the contract does not authorise it (`AGENTS.md` — *House rules*). No PR
opened. The work is in the worktree, uncommitted, awaiting the V3 gate and this review.
