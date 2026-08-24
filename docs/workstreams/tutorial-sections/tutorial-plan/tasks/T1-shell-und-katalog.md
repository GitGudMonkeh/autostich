# T1 — Shell & Katalog

**Branch `task/tut-t1-shell` · Tier C · base `feature/tutorial-sections`**
Shared rules: [`README.md`](README.md). Binding scope: [`../task-contract.md`](../task-contract.md).

**This task ships zero lessons.** That is the point: six workers write into this shape afterwards,
and the shape has to be unarguable before they do. It is the only task the others wait on.

## Scope, in order

1. **The overlay shell.** Reuse the hub-modal shell verbatim — `overlayPortal`, `MODAL_CARD`,
   `TopHairline`, `ActionButton`, `92dvh` card in a `p-3` frame. Read `src/ui/Glossary.jsx:141–152`
   for the exact incantation. **Do not invent a shell**; the desktop pass has to inherit whatever
   that shell becomes.
2. **Three levels** — Themenliste → Lektionsliste → Lektion. Navigation is state inside the overlay,
   not routes.
3. **The four beat components.** `Satz` · `Bild` · `Probierfeld` · `Merksatz`. A fifth kind requires
   an entry in `docs/design-sprache.md` §11 first.
4. **The catalogue** at `src/ui/tutorial-sections/catalog.js` — pure data, **no display text, no
   React, no `t()`**. Same discipline as today's `src/ui/tutorial/tutorialScript.js`, whose header
   comment explains why; read it before you design the schema, then let it be deleted by T2.
5. **The lesson-height guard** — a test that fails when a lesson's beats exceed the budget.
6. **Two placeholder lessons** so the shell is demonstrable, in both languages. They are scaffolding
   and T3–T8 replace them.

## The form, measured — reproduce these, do not re-derive them

| | Measured at 390 × 844 |
| --- | --- |
| Card | 366 × 524.2 — **62 % of the screen** |
| Head · foot | 70 · 66 |
| Content | 386 px · **0 overhang · nothing clipped · no sideways scroll** |
| Beat costs | Satz 77 px (110 chars) · Bild 121–123 · Probierfeld 204–215 · Merksatz 90 |
| Tap targets | **0 under 44 px** |

Reproduce with [`../evidence/measure.mjs`](../evidence/measure.mjs) and compare against
[`../evidence/measurements.json`](../evidence/measurements.json).
[`../evidence/lesson.js`](../evidence/lesson.js) is the measured prototype — it is a **reference for
geometry, not code to port**: it is imperative DOM, deliberately, so it could be injected into a
production build.

**Three decisions that are not yours to revisit** (report §1.4a, owner-approved):

- the lesson card is **centred**, not top-aligned — it never fills the cap, and top-aligned leaves
  307.8 px of black below it;
- **44 px** for anything carrying a decision. Note `ActionButton`'s `py-2.5` yields **42 px**, so
  honouring this is a change to a *shared* component — see Hazards;
- the Merksatz sits on a **hairline**, never in its own box (`design-sprache.md` §1 — *Kein Panel im
  Panel*). The Probierfeld uses the §1 **Zeile** recipe exactly: `rgba(15,15,21,.72)`,
  `1px solid rgba(150,150,170,.12)`, radius **8**.

## The Probierfeld contract

A Probierfeld renders a small board and a readout **computed by the real pure function from
`src/game/`, imported and called read-only.** Never a re-implementation. T1 builds the harness; the
content tasks supply the function and the board.

```js
// The shape T1 provides. `compute` is passed in by the lesson, never written here.
<Probierfeld cells={…} onSwap={…} compute={(order) => computeFormations(order, deck)} readout={…} />
```

Verified available and pure: `computeFormations` (`formations.js:205`), `boardFactorMap` /
`structureFactorMap` / `districtFactorMap` / `neighborCounts` (`architect.js:399–457`),
`enumeratePlacements` / `isValidFootprint` / `nextRotationFootprint` (`architect.js:170–233`).

**Five cells, not forty.** Measured: five across the 364 px content width give 54.8 × 78.3 px each;
ten would be 27 px. That the readable width is exactly `SEGMENT_SIZE` is why the formation lessons
teach the segment and the formation in one picture.

## The height guard — the deliverable that makes T3–T8 safe

Without it, "≤ 400 px" is a sentence in a document and six workers will each interpret it. Build a
test that measures beat heights from the catalogue and fails over budget.

**Counter-check it** (`docs/engineering/testing.md` §5): add a deliberately over-long lesson, prove
the guard goes red, remove it. A guard that is merely green is not evidence.

**Do not** make it a source-text ratchet. `AGENTS.md` — *Hazard: source-text ratchet tests* — is
about the cost of those; this one should assert a relationship (summed beat cost vs. budget), not a
spelling.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Any lesson content beyond the two placeholders | T3–T8 |
| Deleting anything under `src/ui/tutorial/` | T2 owns the teardown; the two must not collide |
| The hub entry point | T9 |
| A desktop layout | Owner decision 5 |
| `docs/design-sprache.md` §11 | T9 writes it. If you make a decision §11 must carry, note it in your handoff. |

## Acceptance gate

> The shell renders all three levels at 390 × 844 in both languages, a lesson of three beats shows
> **0 px overhang and nothing clipped**, the height guard fails on an over-budget lesson and passes
> on a compliant one, and the catalogue contains **no display string**.

## Expected file surface

```
src/ui/tutorial-sections/TutorialSections.jsx      the overlay, three levels
src/ui/tutorial-sections/beats.jsx                 Satz · Bild · Probierfeld · Merksatz
src/ui/tutorial-sections/catalog.js                pure data
src/i18n/de.js, src/i18n/en.js                     section headers + two placeholder lessons
test/tutorial-sections.test.js                     height guard, catalogue purity, key parity
src/index.css                                      only if a beat needs a class utilities cannot express
```

Add the two new `.jsx` files to `MIGRATED` in `test/i18n-guards.test.js`. That list **grows**; T2
removes exactly one entry from it and you add two — the two changes are independent and must not be
combined into one edit.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | **The 44 px decision hits `ActionButton`, a component used across the whole app.** `py-2.5` = 42 px today; the real Glossary's Close button measures 42 and its chips 26.5. | Do **not** quietly change `ActionButton` for everyone. Either scope the larger target to the tutorial, or raise it as an app-wide change in your handoff for a separate decision. Changing a shared component's metrics under cover of a new feature is exactly the drift the design document exists to stop. |
| **B** | `overlayPortal` is mandatory for any `fixed inset-0` element — `test/overlay-nesting.test.js` enforces it for **every** such element in the project. | Use it. Read the header comment in `src/ui/overlayPortal.jsx`; the failure mode is silent and needs a scroll position to appear. |
| **C** | Measuring against `vite preview` without `--base /autostich/` gives a page that mounts nothing and **still screenshots plausibly**. | Use the committed script; it guards both. |
| **D** | The catalogue freezing the language at module load. | No `import { t }` in `catalog.js` — resolution belongs at display time. `tutorialScript.js`'s header explains the trap. |

## Definition of done

- [ ] Three levels render at 390 × 844, both languages, V1–V4 captured
- [ ] Three-beat lesson: 0 px overhang, nothing clipped, no sideways scroll
- [ ] 0 tap targets under 44 px inside the overlay
- [ ] Height guard written **and counter-checked** (the red run recorded)
- [ ] `catalog.js` contains no display string, no React, no `t()`
- [ ] Two new files added to `MIGRATED`
- [ ] Hazard A resolved **or** escalated in the handoff — not silently decided
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
