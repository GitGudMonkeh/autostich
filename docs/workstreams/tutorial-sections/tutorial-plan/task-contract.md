# Task contract — `tutorial-plan`

**Tier C · planning and design task under `feature/tutorial-sections`.**

> **Departure from `/create-task` step 11, declared rather than hidden.** That step requires the
> scope sections to be emitted as `TODO`, so setup cannot fabricate a decision nobody made. Here the
> decisions *were* made — by the owner, in the session that produced
> [`planning-report.md`](planning-report.md), which records all four answers in its opening table.
> Writing them down is transcription, not a guess, and the prohibition exists against the guess.
> Sections that genuinely nobody has decided — staffing — are still `TODO`.

---

## Identity

| | |
| --- | --- |
| **Branch** | `task/tutorial-plan` |
| **Base** | `feature/tutorial-sections` @ `b9ca89a698d1928c542cd02fe5e81862f0a0bc63` |
| **Base durability** | ⚠ The feature branch exists **locally only**. Until a human pushes it, this base is not durable. |
| **Owner** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Integrator** | TODO — `AGENTS.md`, *Roles and source of truth* |
| **Reviewer** | none — no independent review was requested (`AGENTS.md`, *Independent review*) |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/tutorial-plan` |
| **Branch checked out there** | `task/tutorial-plan` |
| **Upstream** | none — the branch deliberately does not track its base |
| **Preview port** | `5189` |
| **Server invocation** | `npm run dev -- --port 5189 --strictPort` |
| **Production-build preview** | `npx vite preview --port 5189 --strictPort --base /autostich/` — **the `--base` is mandatory**, see *Known hazards* K1 |

## Scope

In this order.

1. **Land the planning report** at `docs/workstreams/tutorial-sections/tutorial-plan/planning-report.md`,
   with the owner's four answers recorded in its opening table.
2. **Land the evidence** that the report's numbers are measured rather than computed — the
   measurement script, the measurement JSON, and the three screenshots the findings are *about*.
3. **Land nine task briefs**, one per task in the report's §7 cut, each carrying the scope, the
   lesson list, the hazards and the acceptance gate that task needs — so that each is handoff-ready
   without a further planning round.

Nothing in `src/` changes in this task. This task plans; the nine tasks build.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any change under `src/` | This is the planning task. The shell is T1, the teardown is T2. |
| Video, voice-over, subtitles | Owner decision 4. The report computes the cost as a *later* decision (§6, H3). |
| A desktop fassung | Owner decision 5 — after the menu rebuild. |
| Rewriting `src/ui/guides.js` | Owner decision 3 — the Leitfaden stays and is linked. |
| Changing mechanics because they are hard to explain | A finding, not a mandate. Report it; do not fix it. |
| Writing `docs/design-sprache.md` §11 | The *decision* to extend rather than fork is in the report (§5). The entry itself is T9. |

**Tripwire 1 — `src/game/**`.** If a diff touches it for anything but reading, stop. The tutorial is
UI. The deterministic layer stays byte-identical or the sim and determinism tests move.

**Tripwire 2 — a redefined term.** If a lesson defines a term `src/game/glossary.js` already
carries, stop. Link it, or change the glossary. Never write alongside it.

**Tripwire 3 — this task.** If a diff on `task/tutorial-plan` touches anything outside
`docs/`, stop. This task writes documents.

## Approved architecture

Binding. Each is argued in the planning report at the cited section.

1. **The overlay reuses the hub-modal shell verbatim** — `overlayPortal`, `MODAL_CARD`,
   `TopHairline`, `ActionButton`, `92dvh` card in a `p-3` frame. No new shell. *(§1.1)*
2. **Three levels** — Themenliste → Lektionsliste → Lektion. *(§1.1)*
3. **A lesson is three beats** — one Satz, one Probierfeld **or** one Bild, one Tipp. Four beat
   *kinds* exist; a fifth requires a design-document entry. *(§1.2)*
4. **The budget is ≤ 400 px of beats at 390 × 844 in German**, or it is two lessons. *(§1.4a)*
5. **The lesson card is centred**, not top-aligned — it never fills the cap. *(§1.4a)*
6. **Interactivity is a Probierfeld calling the real pure function** from `src/game/` read-only —
   `computeFormations`, `boardFactorMap`, `districtFactorMap`, `enumeratePlacements`. Never a
   re-implementation. This is what makes H4 structural rather than editorial. *(§1.3)*
7. **Content lives in `src/ui/tutorial-sections/catalog.js` as pure data, no display text.**
   Sentences live in `de.js`/`en.js` under the **`tut.*`** namespace — *not* `tutorial.*`, which
   belongs to the guided run being removed. *(§3)*
8. **The onboarding counter stays inert.** The tutorial pays nothing and is wired to nothing.
   *(§6, H1 — owner-confirmed)*
9. **`docs/design-sprache.md` gains a §11**; no sibling document. Its own §8 excludes the narrow
   fassung only *"solange sie nicht ausdrücklich beauftragt ist"*. German, per `AGENTS.md` —
   *Appending to an existing German document*. *(§5)*
10. **44 px** for anything carrying a decision; chips unchanged. Note this is a change to the shared
    `ActionButton` (`py-2.5` yields 42 px), not to the tutorial. *(§5, owner question 4)*

## Task-specific inputs

| | |
| --- | --- |
| **Canonical phone** | 390 × 844, dpr 2 (`scripts/phone-proof.mjs`) |
| **Budget language** | German — the longer of the two |
| **Measurement harness** | `scripts/cdp.mjs` against a production build; **not** the dev server |
| **Checklist for the gap report** | the 109 terms in `src/game/glossary.js` |
| **Mechanics sources** | `families.js`, `perks.js`, `skills.js`, `constants.js`, `engine.js`, `architect.js`, `formations.js` |
| **Text rules** | `docs/text-style-guide.md`, `docs/localization/i18n.md` |

## Acceptance gate

> **The owner releases the section list and the interaction form in one pass, and every section is
> afterwards individually handoff-able to a worker without a further planning round.**

Met when all three hold:

- the gap report is a **checkable list** over all 109 glossary terms, each covered, marked as a gap,
  or deliberately omitted **with its reason**;
- at least one **self-critiqued, in-build-measured** design of the section form exists at 390 × 844,
  with its numbers marked *measured · computed · estimated*;
- the nine task briefs exist and each names its own scope, hazards and gate.

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed.

```
docs/workstreams/tutorial-sections/tutorial-plan/task-contract.md
docs/workstreams/tutorial-sections/tutorial-plan/planning-report.md
docs/workstreams/tutorial-sections/tutorial-plan/tasks/T1..T9.md
docs/workstreams/tutorial-sections/tutorial-plan/evidence/measure.mjs
docs/workstreams/tutorial-sections/tutorial-plan/evidence/lesson.js
docs/workstreams/tutorial-sections/tutorial-plan/evidence/measurements.json
docs/workstreams/tutorial-sections/tutorial-plan/evidence/knackig-mitte-390x844.png
docs/workstreams/tutorial-sections/tutorial-plan/evidence/knackig-top-390x844.png
docs/workstreams/tutorial-sections/tutorial-plan/evidence/long-390x844.png
```

**Must not be touched by this task:** everything under `src/`, `test/`, `scripts/`, and every
`docs/` file outside this directory. Verifiable by blob hash, not by reading.

Three screenshots are committed and not more. `task-lifecycle.md` §7 permits captured images
**where the finding is visual** — the approved form, the rejected alignment, and the Tipp behind
the foot each are. The remaining captures are regenerable from the committed, deterministic script.

## Known hazards

| | Hazard | State |
| --- | --- | --- |
| **K1** | `vite preview` ignores the config base — without `--base /autostich/` every asset 404s to the SPA fallback, the page mounts nothing, **and still screenshots as a plausible dark screen**. Cost this session one full set of confident, worthless numbers. | **Resolved** — the harness asserts the CSS response size and aborts under 50 `#root` nodes. Carried into the report §0 and into §11's brief. |
| **H1** | Reviving the onboarding chain would silently cut new players' first six runs of SP **and** DP (`dpForRun` also calls `isSpRun`). | **Resolved by decision** — stays inert. |
| **H2** | No living design document for mobile. | **Resolved by decision** — `design-sprache.md` §11. Written by T9. |
| **H3** | The video calculation needed real numbers. | **Resolved** — report §6. Recommendation: no video; if wanted, subtitles-only. |
| **H4** | Two truths across glossary / Leitfaden / tutorial. | **Resolved structurally** — the Probierfeld calls the live function; lessons link and never restate. Tripwire 2. |
| **H5** | Text volume: *measured* +250 keys per language = +21 % of `de.js`. | **Resolved by budget** — ≤ 400 px per lesson caps it; §7 distributes it. |
| **H6/H7** | Teardown across 9 files, into four guards including the `MIGRATED` ratchet that **throws** on a deleted file. | **Resolved on paper** — report §6 names each guard and its correct resolution. Executed by T2. |
| **H8** | `npm run loc:export` in every task that changes player-visible text. | **Standing** — in every one of T1–T9's gates. |

## Definition of done

- [ ] Planning report committed, with the owner's four answers recorded
- [ ] Gap report covers all 109 glossary terms, each with a verdict and a reason
- [ ] At least one measured design at 390 × 844, numbers marked by provenance
- [ ] Nine task briefs written, each independently handoff-able
- [ ] Evidence committed per `task-lifecycle.md` §7 — script and JSON always, images only where the finding is visual
- [ ] No file outside `docs/workstreams/tutorial-sections/` changed (verified by hash, not by reading)
- [ ] Branch committed and pushed

## Open questions

1. **The feature branch is not on the remote.** Until someone pushes `feature/tutorial-sections`,
   this task's base is local-only and the work is not durable in the sense `AGENTS.md` requires.
   Pushing it is an owner action.
2. **Staffing** — Owner and Integrator rows above are unfilled. Staffing is a decision, not a
   derivation.
3. **T2 ordering.** The report recommends the teardown runs *first*, in parallel with T1, so the
   `tutorial.*` namespace is free and the hub never shows two tutorials. Not yet confirmed.
