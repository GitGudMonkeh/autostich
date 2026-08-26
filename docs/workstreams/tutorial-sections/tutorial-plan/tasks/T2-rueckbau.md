# T2 — Rückbau des geführten Laufs

**Branch `task/tut-t2-rueckbau` · Tier C · base `feature/tutorial-sections`**
Shared rules: [`README.md`](README.md). Binding scope: [`../task-contract.md`](../task-contract.md).

Owner decision 2: the guided run is retired and its content moves into the new sections. **This is
not deleting a folder.** It is a pass through eight components you do not own, into four guards, one
of which throws rather than fails. Runs in parallel with T1 and touches none of its files.

## Why first, not last

Leaving the guided run alive means two tutorials in the hub and two sets of `tutorial.*` keys. The
guards below fire whenever you do it. Doing it early frees the namespace so T1 can claim `tut.*`
cleanly rather than working around a live neighbour.

## Scope, in order

1. **Read the four guards below and decide each one before editing anything.** `AGENTS.md` —
   *Hazard: source-text ratchet tests*: read the assertion, decide whether behaviour or spelling
   changed, and never weaken a guard to get green.
2. **Remove `src/ui/tutorial/`** — 698 lines across `TutorialOverlay.jsx`, `tutorialScript.js`,
   `tutorialVars.js`, `useTutorial.js`.
3. **Remove the `data-tut` anchors from the eight components.** *Measured:* `data-tut` appears in
   **9** files — the eight below plus `TutorialOverlay.jsx` itself.
   `App.jsx` · `ArchitectScreen.jsx` · `Battlefield.jsx` · `FormationPhase.jsx` · `PerkSelect.jsx` ·
   `SkillSelect.jsx` · `StatusBar.jsx` · `StatusRail.jsx`
4. **Unwire the caller** — `App.jsx` holds `tutorialActive`, `tutorialRun`, `tutorialDone`, the
   `useTutorial` call and the `<TutorialOverlay>` render. `loadTutorialDone` / `saveTutorialDone` in
   `storage.js` — decide whether the new sections reuse the flag or get their own key, and **say
   which in the handoff.** Removing a storage key changes saved profiles; keeping a dead one is
   cheaper than a migration.
5. **Remove the 42 `tutorial.*` keys** from `de.js` and `en.js`, in the same commit as the code.
6. **Mark `docs/tutorial-guided-run-plan.md` superseded in part** — a status banner, **not a
   deletion.** §3 (the seed path), §6 and §14 (the data-vs-text split) are what T1's catalogue
   copies and must stay readable. Use the marker vocabulary from `AGENTS.md` — *Historical
   engineering log*: `SUPERSEDED IN PART`.

## The four guards, and the right resolution for each

| Guard | What happens | Resolution |
| --- | --- | --- |
| `test/tutorial.test.js` — 288 lines, 7 `data-tut` assertions, including a **bidirectional** check that every coach-mark points at a real anchor **and** every anchor is used by a coach-mark | the whole file is about a feature that is going away | **Delete the file in the same commit as the feature.** Never in a separate one — a commit where the feature is gone and the test remains does not build, and a commit where the test is gone and the feature remains is unguarded. |
| `test/levelup-wings.test.js:255` — asserts `data-tut="skill-offer"` appears **exactly once** | a foreign test, on a foreign feature, that happens to count your anchor | **Drop that one expectation.** The surrounding assertion about the level-up wings stays untouched. Do not delete the test. |
| `i18n-guards` — *"jeder Katalog-Schlüssel wird auch irgendwo benutzt"* | 42 `tutorial.*` keys become dead | remove them from **both** catalogues, same commit |
| `i18n-guards:577` — *"die Ratschen-Liste zeigt nur auf existierende, i18n-nutzende Dateien"* | `readFileSync` **throws** on the deleted `TutorialOverlay.jsx` — an error, not a clean red | remove **that one line** from `MIGRATED` |

**On that last one, because it will look wrong.** `MIGRATED` carries the comment *"wächst und
schrumpft nie"*, so removing an entry reads like weakening a guard. It is not. The guard's own name
is *"zeigt nur auf existierende Dateien"* — deleting the entry for a deleted file is what the guard
**asks for**. The invariant it protects is "no hard-wired text in a migrated file", and a file that
no longer exists cannot hold any. **No other entry may be touched.** T1 adds two entries; those two
changes are independent and must not be merged.

## Carry forward, do not delete

`test/tutorial.test.js:105` asserts *"kein Tutorial-Text nennt eine Zahl direkt — nur Platzhalter"*.
That rule is `text-style-guide.md` §4 and it applies to the new catalogue with equal force. **Hand it
to T1** rather than losing it with the file: name it in your handoff so T1's
`test/tutorial-sections.test.js` inherits it. If T1 has already landed, port it yourself.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Building anything of the new sections | T1 and T3–T8 |
| "While I'm in here" cleanups in the eight components | `AGENTS.md` — *Workers must not perform unrelated cleanup/refactors*. You are in foreign territory; leave with exactly the anchors gone. |
| Deleting `docs/tutorial-guided-run-plan.md` | Owner decision 2 — it is marked, not removed |
| Weakening any guard to reach green | `AGENTS.md` — House rules |

## Acceptance gate

> `src/ui/tutorial/` is gone, no `data-tut` remains anywhere in `src/`, the four guards are resolved
> as specified above with **no guard weakened**, the 42 keys are gone from both catalogues, and the
> full gate set passes.

## Expected file surface

```
src/ui/tutorial/**                       deleted (4 files)
src/App.jsx                              anchors + wiring removed
src/ui/{ArchitectScreen,Battlefield,FormationPhase,PerkSelect,SkillSelect,StatusBar,StatusRail}.jsx
                                         anchors only
src/i18n/de.js, src/i18n/en.js           42 keys removed
src/game/storage.js                      only if the tutorial-done flag is retired — decide and say
test/tutorial.test.js                    deleted
test/levelup-wings.test.js               one expectation dropped
test/i18n-guards.test.js                 one MIGRATED line removed
docs/tutorial-guided-run-plan.md         status banner
```

**Must not change:** `src/game/**` apart from the storage decision above, and nothing under
`src/ui/tutorial-sections/` (T1 owns it).

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | The eight components are among the most ratchet-protected in the repository. A reflowed JSX line can turn a test red without changing behaviour. | Remove the attribute, change nothing else on the line. Resist tidying. |
| **B** | `src/game/storage.js` is in scope only for the flag. | If you touch it, you are inside the tripwire's neighbourhood — `storage.js` is `src/game/`. It holds no deterministic simulation state, so the sim tests are not at risk, but **say so explicitly in the handoff** rather than letting a reviewer discover a `src/game/` diff and assume the worst. |
| **C** | Deleting the file and deleting the test in separate commits leaves a broken intermediate. | One commit. |
| **D** | *Measured:* `test/viewport-1280.test.js:112` and the `i18n-guards` walker both name `ui/tutorial` explicitly as a directory they descend into. | Removing the directory is fine — both walk what exists — but grep for `ui/tutorial` across `test/` before you finish and check each hit reads as a *path*, not a hard-coded expectation. |

## Definition of done

- [ ] `grep -rn "data-tut" src/` returns nothing
- [ ] `src/ui/tutorial/` gone; `test/tutorial.test.js` gone; same commit as the feature
- [ ] 42 `tutorial.*` keys gone from both catalogues
- [ ] Exactly one line removed from `MIGRATED`, no other
- [ ] `levelup-wings` keeps its wings assertion, loses only the anchor count
- [ ] No guard weakened — for each of the four, the handoff states what changed and why it is not a weakening
- [ ] `test/tutorial.test.js:105`'s rule handed to T1 in writing
- [ ] `tutorial-guided-run-plan.md` marked `SUPERSEDED IN PART`, §3/§6/§14 intact
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] Committed and pushed
