# Visual findings at 1280 × 720 — `#viewport-1280`

**V3 human visual gate, 2026-08-22.** Owner, through the preview viewport harness at 1280 × 720
(`VITE_PREVIEW=1`, options → test viewport). These are the owner's observations, transcribed
verbatim with the date, per `task-lifecycle.md` — *A finding is not a finding until it has an ID*.

**Nothing here is fixed.** Contract §9 makes every layout repair a non-goal of T1b: *"Any layout
repair. What overflows is measured and written down. This holds even when the fix would be one line.
Repairs are T2."* This file is the writing-down.

**Not a survey.** These four came from a person looking at three screens. Commit 4's matrix — five
sizes × two languages × the surface list of contract §5.2 — has not run, so this list is not
complete and must not be read as if it were.

---

## Findings

| ID | Owner's words, verbatim (2026-08-22) | Surface | Classification |
| --- | --- | --- | --- |
| `V1280-01` | *"legendare auf 2 nebeneinander andern anstatt 4. bessere uebersicht"* | Legendary choice | Defect in this workstream → T2 |
| `V1280-02` | *"Challenger deck soll skalieren das es nicht scrollbar ist seperat"* | Legendary / skill choice, deck rail | Defect in this workstream → T2 |
| `V1280-03` | *"guide pages lassen sich nicht scrollen"* | Guide | Defect in this workstream → T2 |
| `V1280-04` | *"die seite is komplett kaput. mittelteil kleiner skalieren das die seiten panels ganz angezeigt werden"* | Skill choice | Defect in this workstream → T2 |

Classification per `task-lifecycle.md` — *Classification is a required output*. None is
"pre-existing, out of scope": all four are consequences of the threshold now applying at 1280, a
width the desktop pass was never dimensioned for.

---

## What the code says about them

**Measured**, by reading the source — not by re-measuring the screens.

### `V1280-01` and `V1280-04` share a root cause

Both screens are built on the same component. `src/ui/SkillSelect.jsx:17` and
`src/ui/LegendarySelect.jsx:8` both import `LevelupRig` from `LevelupWings.jsx`.

`.lv-rig` is a three-track grid — `minmax(0,1fr) · 924px · minmax(0,1fr)` — whose middle track is
**fixed**. `index.css` states the arithmetic for the narrowest case in place:

```
1280 px − 32 (overlay padding) − 880 (card) − 44 (grip lane) = 324 px for two wings, 162 per side
```

The wing asks for `width: 320px`. At 1280 it gets about half. That is `V1280-04` exactly: the side
panels cannot show themselves, because the middle track refuses to give up any width.

`V1280-01` is the same fixed 924 px seen from inside: four legendary offers share it, so each gets
roughly 220 px and the text wraps hard.

**This confirms a prediction.** Planning report §1.5 row 11 predicted the wings would be squeezed at
1280 and asked for it to be documented rather than repaired. It was documented in `evidence-T1.md`
§7.7 on the same day, before the owner saw the screen. **Prediction held.**

The owner's proposed remedy for `V1280-04` — scale the middle part down so the side panels fit — is
a different shape of fix from what §1.5 assumed (which was leaving the wings alone until a dedicated
task). That difference is the owner's call and is recorded here, not resolved.

### `V1280-02` and `V1280-03` are new

Neither appears in the planning report's §1.5 pressure points. `V1280-03` (the guide not scrolling)
is adjacent to R3 — *"declared scrollers, removal of `--gs`"* — but the planning report predicted a
**text-shrink** problem in the guide, not a **scroll** problem. Recorded as new, not as a hit.

---

## Not covered by this gate

- 1600 × 900, 1920 × 1080, 1400 × 700, 1536 × 791 — only 1280 × 720 was looked at.
- English. All four observations were made in one language; contract §5.1 requires both, because the
  longest strings differ per language.
- Every surface not named above: hub, shop, upgrade tree, glossary, stats, leaderboard, run details,
  victory, options, perk choice, the formation phase, the architect, and the run dialogs.
- The dev build was used, not the production build. The harness is `VITE_PREVIEW`-gated, so this is
  the intended way to look — but it is not the artefact the measurement pass will produce.
