# T9 — Einstieg & Design-Dokument

**Branch `task/tut-t9-einstieg` · Tier C · base `feature/tutorial-sections` · needs T1 + one content task**
Shared rules: [`README.md`](README.md). Binding scope: [`../task-contract.md`](../task-contract.md).

The task that connects the section to the game and writes down what the whole workstream learned.
Runs last because §11 has to describe what was actually built, not what was planned.

## Scope, in order

1. **The hub entry.** The tutorial chip already exists (`StartScreen.jsx:836`) and so does the loud
   first-contact offer above "Lauf beginnen" (`:447`, gated by `firstContact` at `:180`). Both today
   start a *guided run* that T2 has deleted. Repoint them at the new overlay.
2. **Progress state.** Which lessons are done, which section to resume. Local, like
   `loadTutorialDone` / `saveTutorialDone` in `storage.js:701`. **Read T2's handoff first** — it
   decided whether the old flag is retired or reused, and that decision is an input here.
3. **The resume row** on the Themenliste — measured to be worth 124 px of otherwise dead air
   (report §1.4a). It is content, not padding.
4. **`docs/design-sprache.md` §11 — Die Handy-Fassung.**
5. **The link out to the Glossary** from the Themenliste foot, and to `GuideOverlay` from S4 — the
   three teaching layers pointing at each other rather than duplicating each other (H4).

## §11 — what it must settle

**Decision already taken (report §5): extend `design-sprache.md`, do not fork it.** The document's
own §8 excludes the narrow fassung only *"solange sie nicht ausdrücklich beauftragt ist"* — this
workstream is that commission. A sibling file would split one design language into two kept in step
by hand.

**The entry is German.** `AGENTS.md` — *Appending to an existing German document* — this is the
documented exception, not a break of the language rule. Note the deviation where you make it, as
that section requires. The title line loses "(Desktop, ab 1280 px)".

Follow the file's fixed template — a heading, the rule, the measurement that produced it, and the
occasion. Five things to carry, each with the number that decided it:

| | Point | Measured |
| --- | --- | --- |
| 1 | **The phone card.** `92dvh` in a `p-3` frame. | The real Glossary at 390 × 844: 366 × 776.5, 55.5 px of air. House behaviour, covered by §1's *Restluft an den Fuß*. |
| 2 | **Fills the cap → top-aligned. Well under it → centred.** | A three-beat lesson is 524.2 px = 62 % of the screen. Top-aligned it leaves **307.8 px** of black below; centred, **159.9 / 159.9**. |
| 3 | **How much air is too much.** | Five bare rows left **228.5 px**; with a resume row and a progress line, **104.2 px**. Over roughly 180 px, the screen is thin on content — add content, not padding. |
| 4 | **Tap targets: 44 px for anything carrying a decision; chips unchanged.** | The phone does not obey §4 today: the Glossary's Close is **42 px**, its chips **26.5 px**, and `ActionButton`'s `py-2.5` yields 42 everywhere. |
| 5 | **The measurement trap.** | `vite preview` ignores the config base. Without `--base /autostich/` the page serves the SPA fallback — 1391 bytes where 156 575 belong — mounts nothing, **and still screenshots as a plausible dark screen**. |

Point 4 has a consequence you must not resolve quietly: honouring 44 px app-wide is a change to
`ActionButton`, used everywhere. **Read T1's handoff** — hazard A there was either scoped to the
tutorial or escalated. Whichever it was, §11 records the rule *and* names the open cost.

Also add the workstream to the table of related documents at the top of the file, the way the other
nine screens are listed.

## Non-goals

| Non-goal | Why |
| --- | --- |
| A desktop fassung | Owner decision 5 — after the menu rebuild |
| Rewriting §1–§8 of the design document | Append §11; adjust the title line and the table, nothing else |
| A reward or gate for finishing | Owner decision, question 3 — **nein** |
| Touching the onboarding chain | H1, and it is `src/game/` — Tripwire 1 |
| Changing `ActionButton` for the whole app on your own initiative | That is a design decision with app-wide reach. Record it; do not smuggle it. |

## Acceptance gate

> The hub opens the new section, progress survives a reload, the resume row is present and measured,
> `design-sprache.md` carries a §11 in German with all five points and their numbers, and the three
> teaching layers link to each other.

## Expected file surface

```
src/ui/StartScreen.jsx                   chip + first-contact offer repointed
src/App.jsx                              overlay wiring, progress state
src/game/storage.js                      progress persistence — see hazard B
src/ui/tutorial-sections/*.jsx           resume row, glossary/Leitfaden links
src/i18n/de.js, src/i18n/en.js           entry + resume strings
docs/design-sprache.md                   §11, title line, document table
test/tutorial-sections.test.js           extend
```

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | `StartScreen.jsx` and `App.jsx` are both in `MIGRATED` and among the most ratchet-protected files in the repository. | Read the assertion before you edit. `AGENTS.md` — *Hazard: source-text ratchet tests*. No tidying. |
| **B** | **Progress state means writing to `src/game/storage.js` — inside Tripwire 1's directory.** | `storage.js` holds no deterministic simulation state, so the sim and determinism tests are not at risk. But a `src/game/` diff is exactly what the tripwire exists to make somebody look at: **state it plainly in the handoff**, with the reason, rather than letting a reviewer find it. If a UI-side store is honestly possible, prefer it. |
| **C** | §11 is a durable document. A number written from memory outlives the memory. | Every number in the table above is measured and reproducible with `../evidence/measure.mjs`. Re-run it and quote what you get, rather than copying this table. |
| **D** | The first-contact offer is gated on `!prof.hadCompletedRun && !tutorialDone` (`StartScreen.jsx:180`). With no reward and no gate, "done" now means "read some lessons". | Decide what dismisses the loud offer, and say so. A player who read two lessons and left should probably not be shouted at forever, and should not be told they finished either. |

## Definition of done

- [ ] Hub chip and first-contact offer open the new section; no path reaches deleted code
- [ ] Progress survives a reload; resume row present and measured
- [ ] Glossary and Leitfaden linked from the section
- [ ] `design-sprache.md` §11 written **in German**, all five points with measured numbers, deviation noted
- [ ] Title line and document table updated
- [ ] Hazard B stated in the handoff if `src/game/storage.js` changed
- [ ] Hazard D decided and recorded
- [ ] V1–V4 at 390 × 844 in both languages
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] Committed and pushed
