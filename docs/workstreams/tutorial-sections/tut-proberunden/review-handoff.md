# Review handoff — tut-proberunden

**This document prepares a handoff. It does not review anything, it approves nothing, and it states
no outcome.** Every gate row below says whether the command was run in this session. Findings return
to the worker; a reviewer does not implement (`docs/engineering/git-workflow.md` — *Reviewer
ownership*).

**Review Type: Full.** No `--closure` was passed, so the whole agreed scope is open to examination.

## Blocking notice

| | |
| --- | --- |
| Hazards without a status at handoff | **0 of 6** — all six carry a status below |
| Unticked done criteria | **0 of 5** |
| Push state | head is on `origin/task/tut-proberunden` — a reviewer can fetch the range |
| Worktree | clean, and still clean after the gates ran |

## Context

| | |
| --- | --- |
| Task | `tut-proberunden`, Tier C |
| Contract | `docs/workstreams/tutorial-sections/tut-proberunden/task-contract.md` |
| Worktree | `C:/Code/Autostich-worktrees/tut-proberunden` |
| Branch | `task/tut-proberunden` |
| Base | `47020403041c97f70022b1a11c7770970e83821c` (contract Identity: `origin/feature/tutorial-sections`) |
| Head | `f4df23db2282b9a4ab1e49f11c1250c76e3a36b8` |
| Ancestry | `merge-base --is-ancestor` exit **0** — the range is real *(measured)* |
| Size | 25 files, +4089 / −545 *(measured)* |
| Commits | 15 *(measured)* |
| Gates | all five run in this session, all exit 0 *(measured)* |

## Commits

```
f4df23db chore(tut-proberunden): the task's preview port is 5201
130b0fa3 fix(tut-proberunden): the budget guard measures both languages, not one
9ec3a2d4 docs(tut-proberunden): both remaining open questions are now closed
61fb8556 feat(tut-proberunden): archetype accents, and the percent sign stops breaking
27833d45 docs(tut-proberunden): close the three remaining open questions
21cbf1bf feat(tut-proberunden): Nach dem Lauf and Fortgeschritten - all ten sections done
ac88e559 feat(tut-proberunden): Feuer, Pflanze and Eis
b64f85b9 feat(tut-proberunden): Perks und Skills, and Blitz
411da6f1 feat(tut-proberunden): Der Architekt, four lessons on real buildings
001d6662 feat(tut-proberunden): Aufstellung, five played lessons
c045068f feat(tut-proberunden): Grundlagen, seven played lessons
fd3a0a03 docs(tut-proberunden): the over-budget lesson is split, not shortened
a9990622 docs(tut-proberunden): record the budget decision in the contract
da842d51 fix(tut-proberunden): the kinds hang on length, not on interactivity
ff087c16 feat(tut-proberunden): two lesson kinds, two height budgets
```

## What was agreed

The binding scope is the contract, section *Scope*. Its **Acceptance gate**, verbatim:

> - `npm test` grün, einschließlich der umgebauten Wächter in `test/tutorial-sections.test.js`
> - `npm run lint` grün
> - **Sprachgate:** `node scripts/text-voice-check.mjs` grün, und die neuen Texte verstoßen gegen
>   keine Regel aus `docs/text-style-guide.md`. Der Entwurf ist dagegen geprüft und meldet null.
> - **Zahlengate:** jede angezeigte Zahl stammt aus einer Konstante, nicht aus dem Text. Der
>   bestehende Wächter „kein Lektionstext nennt eine Zahl direkt" bleibt in Kraft.
> - **Visuelles Gate:** V1–V4 bei 390 × 844 nach `docs/engineering/task-lifecycle.md`.

**One gate in that list could not be run: `scripts/text-voice-check.mjs` does not exist in the
repository** *(measured — `ls` finds no such file)*. The language checks that were actually run are
the terminology and parity guards in `test/i18n-guards.test.js`, which are part of `npm test` and
which returned four real findings during the work (`Rangliste → ranked/ranking`,
`Stichpunkte → Trick Points`, `Aufstellungsphase → order phase`, and `Formation` reserved for card
formations). A reviewer should decide whether the contract's reference is stale or whether a checker
is genuinely missing.

## The claims to check

Stated by the worker. These are where the work is most likely to be wrong:

1. **The height model is a model, not a measurement.** `catalog.js` computes lesson heights from text
   lengths with no browser. It is calibrated against the production build and, across all 42
   lessons, sits above the real measurement everywhere (by 9 to 66 px). The calibration table is in
   `catalog.js`; the per-lesson comparison is in `evidence/measure.md`. **If a reviewer presses on
   one thing, press here**: three separate times during this task the model silently measured the
   wrong thing while staying green.
2. **Every displayed number is derived, none typed.** `vars.js` reads or counts from the game modules.
   Worth spot-checking a few against `src/game/**` rather than trusting the comment.
3. **Four probes compute with real game functions** (`computeFormations`, `boardFactorMap`,
   `tierNum`), and the rest read constants. Whether any of them quietly reimplements a rule instead
   of calling it is a judgement a reviewer should make.
4. **The four Architekt layouts use real building families.** Their factors were checked against
   `boardFactorMap`, but whether the eight families are the *right* ones for teaching is not a
   mechanical question.
5. **The English catalog was walked once, at the end.** It found no defects, but it also refuted the
   guard's own premise that German is always the longer language. See *Known state* below.

## Scope compliance

The contract's *Tripwire* is: **„Berührt ein Diff `src/game/**`, außer um zu lesen — anhalten."**
The *Expected file surface* adds: „`src/game/**` erscheint hier nicht."

| Entry | Kind | Base | Head | Result |
| --- | --- | --- | --- | --- |
| `src/game/**` | tree | `6888f8d95e9ea7c6a6b005459f90b3000d91042c` | `6888f8d95e9ea7c6a6b005459f90b3000d91042c` | **unchanged** *(measured)* |

A tree hash proves the whole subtree byte-identical, recursively, including that nothing was added
into it. **The tripwire holds.**

Reproduce:

```bash
MSYS_NO_PATHCONV=1 git -C C:/Code/Autostich-worktrees/tut-proberunden rev-parse --verify "47020403041c97f70022b1a11c7770970e83821c:src/game"
```

### Files changed outside the declared surface

The contract says: „Alles darüber hinaus ist im Review zu begründen." Seven paths are outside the
list *(measured)*. The worker's reason for each:

| Path | Reason given by the worker |
| --- | --- |
| `src/ui/tutorial-sections/vars.js` | New file. The placeholder list had to be readable by both the shell and the guard; two copies would have let the guard measure something other than the reader sees. |
| `src/i18n/index.js` | `fmtPct` now emits a no-break space for German. The line break between number and percent sign was the defect; fixing it in 48 call sites instead of one source would have been the wrong repair. |
| `test/i18n-guards.test.js` | Four `SAME_OK` entries for words identical in both languages, and the `fmtPct` expectation updated to the no-break space with a counter-proof. |
| `docs/design-sprache.md` | §11 required by the guard comment in `catalog.js` before any new beat kind may exist. |
| `docs/text-style-guide.md` | §2 now states the no-break space and why. |
| `docs/localization/strings_de_pixi_2026-08-15.csv` | Generated by `npm run loc:export`, which `AGENTS.md` requires when player-visible text changes. |
| `.claude/launch.json` | Preview port. 5198 was allocated to this worktree and is held by a foreign dev server; the owner decided to pin 5201. |

**Not mechanically verifiable — a reviewer must judge** whether each of these seven is inside the
task's intent.

## Gate results

All run in this session, from the contract's worktree, unpiped, real exit codes *(measured)*.

| Gate | Command | Exit | Result |
| --- | --- | ---: | --- |
| Tests | `npm test` | 0 | 140 files, 2175 tests passed |
| Lint | `npm run lint -- --max-warnings=0` | 0 | clean |
| Build | `npm run build` | 0 | built, chunk-size warning only (pre-existing) |
| DB | `npm run gen:db` | 0 | 219 entries |
| Localization | `npm run loc:export` | 0 | 3037 rows; worktree still clean afterwards, so the committed CSV is current |
| Language | `node scripts/text-voice-check.mjs` | — | **not run — the script does not exist in the repository** |

`npm test` passed in full, so the both-results rule for Windows load artefacts
(`NEW_MACHINE_SETUP.md`) did not apply.

## Hazards

Status column supplied by the worker, as `task-lifecycle.md` — *Two standing rules* requires.

| Hazard (verbatim from the contract) | Status at handoff | Recorded elsewhere |
| --- | --- | --- |
| **1. Das Höhenbudget — GELÖST, siehe *Approved architecture*.** … „Median der 41 Lektionen 645 px, über dem Budget von 400 px 31 von 41, über der Schalen-Decke von 638 px 21 von 41, Maximum 1.360 px" … „Der Wächter darf **nicht abgeschwächt** werden" | **measured.** Two budgets set deliberately (400 / 960), neither guard weakened; the 960 is derived as 1.5 shell heights. All 42 lessons verified against the production build. | `task-contract.md:130` *Approved architecture*; `evidence/measure.md` per-lesson tables |
| **2. Die Drei-Takt-Regel — GELÖST.** Ersetzt durch vier artbewusste Wächter | **measured.** The three-beat rule is gone; four kind-aware guards replace it, plus the reverse rule. | `test/tutorial-sections.test.js` |
| **3. Die Zahlen im Text.** Der Wächter verbietet Ziffern im Lektionstext … müssen als Platzhalter durchgereicht werden | **measured.** The digit guard is still in force and green; `vars.js` grew from 6 placeholders to 45, all read or counted from game modules. A second guard requires every placeholder to have a value. | `evidence/measure.md` — *V3* |
| **4. Englisch.** Jeder Schlüssel muss in beiden Katalogen stehen. Der Entwurf ist nur auf Deutsch geschrieben | **measured.** 235 keys, both catalogs, parity guard green; the tutorial was walked end to end in English. It also refuted the budget guard's premise — see *Known state*. | `evidence/measure.md` — *The English walk* |
| **5. `BoardProbe` zeigt heute Lagen, die es im Spiel nicht gibt** … einzellige Gebäude, während keine Familie `form: "single"` trägt | **measured and removed.** `BoardProbe` is deleted. Replaced by four fixed layouts from eight real families. It also drew only 2 of the board's 8 rows, so a column or diagonal could never complete — a third defect the contract had not listed. | `evidence/measure.md` — *V4* |
| **6. `completedStructures(...).length`** … ist immer `undefined` … Heute folgenlos, aber tot | **measured and removed** with `BoardProbe`. No call site remains. | `evidence/measure.md` — *V4* |

## Definition of done

**Five criteria, none unticked** *(measured against the contract's list)*:

- alle zehn Sektionen mit 42 Lektionen im Katalog, jede mit ihrer `art` — 10 sections, 42 lessons
- beide Sprachkataloge vollständig, `npm run loc:export` gelaufen — 235 keys, exit 0
- alle Wächter grün, einschließlich der beiden Budgets und der Umkehrregel — 2175 tests, exit 0
- die eine Lektion über Budget gekürzt — resolved by splitting instead, on owner decision
- V1–V4 bei 390 × 844 gemessen, Belege im Workstream-Ordner — `evidence/measure.md`

**Downgrade record.** The contract carries one, verbatim: the fourth criterion originally read
„die eine Lektion über Budget gekürzt" and is struck through with the note that the owner chose to
**split** „Zwei Builds, die sich selbst verstärken" rather than shorten it, because both builds were
wanted. Measured after the split: 696 px and 784 px. This is a change of method, not a reduction of
the criterion — **a reviewer should confirm that reading.**

## Evidence and its limits

`docs/workstreams/tutorial-sections/tut-proberunden/evidence/` — all committed, nothing untracked
*(measured)*:

- `measure.md` — the V1–V4 tables, the model-versus-measurement comparison for all 42 lessons, and
  the record of every defect found and how.
- 10 PNG files, 1.9 MB total. Per `task-lifecycle.md` — *Committing evidence*, images belong in the
  commit only when they **are** the evidence. **Whether these ten qualify is a reviewer's call**;
  this document does not decide it and does not say what any image shows.

**Limits, stated by the worker:**

- One viewport only: **390 × 844**. No tablet, no desktop. The contract's non-goals exclude a desktop
  pass, so this is intended, not an omission.
- One browser: headless Chrome via `scripts/cdp.mjs`. No Firefox, no Safari, no real device.
- **Light mode was never checked.** The game renders dark and the tutorial inherits it, but nobody
  looked.
- The probes were checked for **rendering and readout correctness**, not for interaction edge cases:
  rapid tapping, sliders dragged to their bounds mid-render, or language switched while a probe
  holds state were not exercised.
- **Screen-reader behaviour was not tested.** `aria-pressed` is set on toggles and sliders carry an
  `aria-label`, but no assistive technology was run.

## Known state a reviewer will hit

*(measured unless noted)*

- **English is longer than German in four lessons** — `blitz/karte` 595 against 575, and three tip
  lists 388 against 368. None exceeds its budget, but three are `kurz` lessons with 12 px of
  headroom. The budget guard previously measured German only, on a premise written into its own
  comment; it now measures both and takes the higher. This was found in the last hour of the task.
- **The preview port in the contract is 5201, not the 5198 originally allocated.** 5198 is held by a
  foreign dev server serving a different worktree. Every measurement in this task ran on 5201.
- **`scripts/text-voice-check.mjs` does not exist**, though the Acceptance gate names it.
- The build emits a chunk-size warning. It predates this task *(inferred — the warning is generic
  and no chunk configuration was touched)*.
- `src/i18n/de.js` now contains 48 no-break spaces inside string literals. ESLint's
  `no-irregular-whitespace` allows them in strings and flags them in code, which is the intended
  split; a reviewer seeing an invisible character in a diff should know it is deliberate.

## Open questions for the reviewer

1. **Is the height model trustworthy enough to be a gate?** It is a text-length model with no
   browser. It is calibrated and currently conservative everywhere, but it was wrong three times
   during this task and each time it was green while wrong. Should it stay a hard gate, or become a
   warning with the V1–V4 measurement as the real gate?
2. **Seven files outside the declared surface** — see the table above. Each has a reason; whether
   all seven belong in this task rather than a follow-up is a scope judgement.
3. **`src/i18n/index.js` is shared with the whole game.** The `fmtPct` change affects every
   percentage everywhere, not only the tutorial. Is that acceptable inside a tutorial task, or
   should it have been split out?
4. **The planned `text-sprachpass` task now overlaps less than intended.** The percent-sign fix was
   done here. Does that leave that task coherent?
5. **Ten committed PNGs, 1.9 MB.** Do they qualify as evidence that must be committed, or should
   some be dropped to keep the repository light?
6. **Was splitting the over-budget lesson a downgrade?** The contract records it as an owner
   decision and a change of method. A reviewer may read it differently.

## Suggested reading order

1. `task-contract.md` — *Scope*, *Approved architecture*, *Tripwire*. What was agreed.
2. `evidence/measure.md` — the measurements, and the record of what went wrong and how it was found.
3. `src/ui/tutorial-sections/catalog.js` — the height model and its calibration table. This is where
   the claims in this handoff are most load-bearing.
4. `test/tutorial-sections.test.js` — the guards, several of which exist because they caught a real
   defect; the comments say which.
5. `src/ui/tutorial-sections/beats.jsx` — the probes. Largest single file in the diff.
6. The rest of the diff.

## Provenance

Generated by `/prepare-review` on 2026-08-26, from
`docs/workstreams/tutorial-sections/tut-proberunden/task-contract.md`.

**What this command did not verify:** it did not review the code, did not judge whether the work is
correct, and reached no outcome. It measured the range, hashed the tripwire, ran the five gates that
exist, and quoted the contract. The hazard statuses, the claims to check, and the evidence limits
were supplied by the worker — who, in this instance, is the same session that did the work. **A
reviewer should treat those sections as the worker's own account, not as independent verification.**
