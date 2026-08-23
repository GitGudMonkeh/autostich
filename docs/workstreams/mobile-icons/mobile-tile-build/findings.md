# mobile-tile-build — findings

Task `mobile-tile-build`, workstream `mobile-icons`, branch `task/mobile-tile-build`.
Contract: [`task-contract.md`](./task-contract.md). Part 2 of two.
Part 1's record, including the V3 verdict this task implements:
[`../mobile-tile-design/findings.md`](../mobile-tile-design/findings.md).

---

## S1 — baseline, before the first edit

Measured in this worktree on 2026-08-23, at base
`899089ccb7724be37201a81547db5fef32c2d8e9`, before any file under `src/` was touched.

```console
$ npm ci      … exit 0
$ npm test    # vitest run

 Test Files  139 passed (139)
      Tests  2153 passed (2153)
… exit 0
```

Green. Four more tests than part 1's baseline: `dev` gained `test/skill-invocation-guard.test.js` with
the move of the three project commands to `.claude/skills/`.

## S2 — V1, before the first pixel moves

`phone-capture.mjs --label V1`, output `visual/V1-*.png` and `visual/V1-phone-capture.json`.

D3's set: **390 × 844, German and English, all three selection screens, DPR 1**, scrollbars hidden so
the widths are the phone case. Six images.

The capture also carries geometry, so V1 vs V2 is a diff of numbers and not only a look at two
pictures. Measured tile padding boxes:

| | Skill | Perk | Legendary |
| --- | --- | --- | --- |
| V1, 390 px, de and en alike | 315 | 303 | 319 |

**These match part 1's measurement exactly** — two scripts written days apart, same route, same
numbers. That is the cross-check that makes the figure worth dividing a bloom radius by.

One thing was changed rather than inherited from part 1's probe: the resume button is now found by
**class** (`button.as-cta-primary`, `StartScreen.jsx:455`) instead of by matching „fortsetzen". The
text match works in German and fails silently in English, and this capture runs in both — the same
trap `perkArt.js` calls out for emblems bound to translated names.
