# Visual review — icons-corners

**V1 baseline · V2 capture · V3 human gate · V4 classification**
(`docs/engineering/task-lifecycle.md` §8)

Three design iterations, so three capture rounds — §8 requires each iteration to produce its own
capture and its own classification.

---

## Status

| Round | What changed | V2 | V3 |
| --- | --- | --- | --- |
| **1** | The five ornaments on two screens, at the measured opacities | `V2-*` | **Passed with changes, 2026-08-22.** Verbatim: *"alle sind sichtbar. sehen gut platziert aus aber zu transparent, man kann sie kaum erkenne"* |
| **2** | Level 3×, plus a gold phase ornament on the legendary head | `V2R2-*` | **Partly passed, 2026-08-22.** Level and gold both accepted on sight — *"1. sitzt und passt / 2. gold passt"* — then reversed on the legendary question: *"wir lassen die skill effekte fuer die legendare phase und doch nicht das goldene ornament"* |
| **3** | Legendary head takes the FACTION ornament of its tab; the gold variant and its bake machinery removed | `V2R3-*` | **PASSED, 2026-08-22.** Verbatim: *"passt alles. gut weiter"* |

**V1** was taken before the first source change. The legendary head has a **reconstructed** baseline
only (`V1L-*`) — it entered scope at the round-1 gate, after pixels had moved.

**An agent must not report a visual result as approved.** All three verdicts are transcribed because
the owner gave them; none is this session's judgement. **The V3 gate is closed.**

---

## What was looked at for V3, round 3

    visual/V2R3-head-comparison.png

Six rows: the four faction heads, the perk head, and the legendary head now carrying its tab's
faction ornament. Left is before, right is the shipped state.

| File | Shows |
| --- | --- |
| `visual/Q9-legendaer-varianten.png` | the gold-versus-faction comparison the round-2 reversal was decided on |
| `visual/V3-gain-options.png` | the four level steps the 3× decision was made against |
| `visual/V2R3-measurements.json` | every rendered property, read out of the live DOM |
| `visual/V1L-legendary-1920x1080-card.png` | the reconstructed legendary baseline |

Sizes 1280×720, 1600×900, 1920×1080, 2560×1440, DPR 1. Seed input `11` (32-bit seed 33).

**The question round 3 had to answer** was whether the skill head and the legendary head still read
as different moments now that both show the same faction ornament for the same tab. Answered yes:
*"passt alles"*. The legendary phase keeps its gold title and gold card frame, and that was enough.

---

## V4 classification

| ID | Observation | Classification | Disposition |
| --- | --- | --- | --- |
| **ICONS-CORNER-01** | The five span **1.30-fold** in mean added light at the shipped level, against 1.27-fold at level 1. The balance survived the level change | Expected — the split between balance and level works | No fix |
| **ICONS-CORNER-02** | Light differs in **distribution**, not amount: Pflanze has the largest lit area (22.90 %) at the lowest peak (23.88), Blitz the highest peak (40.00). Pflanze reads as a wash, Blitz as lines | New design question | Backlog, input to a future workstream. Seen at V3 and accepted as shipped |
| **ICONS-CORNER-03** | The same ornament reaches 77 px on the skill head and 115 px on the perk head, because the sticky bar sits lower there. Same scale, different reach | Expected, and a deliberate consequence of one shared zone | No fix. Closed at V3 |
| **ICONS-CORNER-04** | The perk filigree is inset 6 px with an earlier mask, so the accent frame, the hairline and the ornament's own edge line do not stack into three parallel lines | Defect avoided — the README predicted it | Done and guarded. 6 px confirmed at V3 |
| **ICONS-CORNER-05** | ~~`LegendarySelect` gets no ornament~~ **Closed 2026-08-22.** It now carries the faction ornament of its active tab | Closed — scope extended by the owner | Implemented |
| **ICONS-CORNER-06** | `.pk-strip` / `.sk-strip` were not unified | Pre-existing, out of scope | No fix. `ICONS-VIS-01` still stands |
| **ICONS-CORNER-07** | `npm test` exits 1 on this branch as on the base, through a load-dependent 5 s timeout in `test/i18n-guards.test.js` | Pre-existing, out of scope | Not fixed (hazard H7) |
| **ICONS-CORNER-08** | At level 1× the ornaments were barely recognisable. The **level** was a design decision the task had silently taken by shipping the measured opacities raw | Defect in this task | **Fixed** in round 2 |
| **ICONS-CORNER-09** | The counter-check found that setting the level back to 1 broke **no** guard, because every other assertion is ratio-based. The rejected state could have returned silently | Defect in this task's guards | **Fixed** — the decided level is ratcheted. Found by the counter-check, not by planning |
| **ICONS-CORNER-10** | ~~Should the legendary corner follow its tab?~~ **Closed 2026-08-22 — yes.** A gold phase ornament was built, shown side by side and rejected; that screen speaks the skill screen's language | Closed by the owner | The gold delivery and the bake-time recolour were **removed**, not left dormant |
| **ICONS-CORNER-11** | ~~The legendary opacity is derived, not measured~~ **Void.** The derived entry no longer exists | Withdrawn with the gold variant | — |
| **ICONS-CORNER-12** | The round-3 edit left a CSS comment unterminated. The whole suite stayed green (2139 passing) — **only `npm run build` caught it**, because no guard reads CSS validity | Defect in this task, caught before hand-off | **Fixed.** Worth a reviewer's note: the source-text ratchets can read a broken stylesheet and be satisfied |
| **ICONS-CORNER-13** | An earlier version of the lot-declaration slice in `test/corner-art.test.js` looked for `})` and, once the derived argument was dropped, ran on for hundreds of lines and swallowed an unrelated `light=`. It was **green for the wrong reason** | Defect in this task's guards | **Fixed** — the slice now balances parentheses, and the `light=` seam was re-counter-checked |

---

## What this review cannot tell you

The V3 gate is closed, so nothing below is an open question — these are the limits of the evidence
behind it, and they do not go away because a person approved the pictures.

- **The legendary baseline is RECONSTRUCTED, and that is a real weakening.** §8 wants V1 before the
  first pixel moves; that screen entered scope at V3. `V1L-*` was taken by disabling one JSX line,
  capturing, and restoring, verified by the guards going green again. One viewport only.
- **The legendary head is reached by resuming an injected run state**, not by playing to cycle 29.
  The state is real — lifted from `as_activerun` after a seeded run started, four fields changed, then
  loaded through the application's own validating path. But arriving there normally was not tested.
- **One game state per screen.** A head carrying a bonus hint, or a much longer localized title, was
  captured by neither V1 nor V2.
- **DPR 1 only.** The files are sized for the DPR-2 cap; the extra resolution is derived, not seen.
- **It still cannot tell you the ornaments look good.** Every number here is about light, geometry and
  clipping.
