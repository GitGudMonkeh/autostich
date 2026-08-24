# T9 — handoff

**`task/tut-t9-einstieg` · hub entry, progress, `design-sprache.md` §11.** Brief:
[`../tutorial-plan/tasks/T9-einstieg-und-designdoc.md`](../tutorial-plan/tasks/T9-einstieg-und-designdoc.md).

**The tutorial section is now reachable in the game.** Hub chip → topic list → lesson, progress
persists, the loud first-contact offer retires itself.

## Gates — run bare, exit codes read directly

| Gate | Result |
| --- | --- |
| `npm test` | **exit 0** — 140 files, 2158 tests |
| `npm run lint -- --max-warnings=0` | exit 0 |
| `npm run build` | exit 0 |
| `npm run build` with `VITE_PREVIEW=1` | exit 0 |
| `npm run gen:db` | exit 0 |
| `npm run loc:export` | exit 0 |

## Measured — the real path, 390 × 844, both languages

Not a scaffold this time: the run below starts at the hub, clicks the tutorial chip, opens a lesson,
reloads the page, and checks what survived.

| Step | Card | Content / visible | Overhang | Hidden | Sideways | Taps < 44 |
| --- | --- | --- | --- | --- | --- | --- |
| Themenliste, fresh | 366 × 378.1 | 237 / 237 | **0** | nothing | no | **0** |
| Lektion **de** | 366 × 525.2 | 384 / 384 | **0** | nothing | no | **0** |
| Lektion **en** | 366 × 504.2 | 363 / 363 | **0** | nothing | no | **0** |
| Themenliste after reload | 366 × 450.4 | 309 / 309 | **0** | nothing | no | **0** |

**Progress survives a reload** — `as_tut_progress` reads
`{"seen":["aufstellung/formationen"],"last":"aufstellung/formationen"}` after the visit, and the
resume row comes back reading *"Weitermachen · Aufstellung · Was sind Formationen"* / *"Continue ·
Order phase · What formations are"*.

**The loud offer retires itself:** present on a fresh profile, **absent** after one lesson has been
opened — measured in both languages, before and after.

**One number to read honestly.** The topic list leaves 232.9 px of air on a fresh profile, above the
~180 px threshold §11 itself sets. That is **not** the layout: there are only two placeholder
sections right now. With six sections the card runs well past it. Worth re-measuring once T3–T8 land,
and worth *not* dressing up as a pass.

## Decisions — both open questions closed

**Open question 1 — the progress key: a NEW key, and the old one is still read.**
The guided run stored a boolean ("seen, yes/no"). The sections need which lessons and where to
resume — a different shape, so `as_tutorial_done` is **not reinterpreted**. New:
`as_tut_progress = { seen: ["section/lesson", …], last }`.

The old key is still **read, never written**: whoever finished the guided run does not get pitched
again. One line instead of a migration; an orphaned boolean in localStorage costs nothing.

> **`src/game/storage.js` changed — stated plainly, as tripwire 1 intends.** 38 insertions, 12
> deletions: `loadTutorialDone`/`saveTutorialDone` replaced by
> `loadTutorialProgress`/`saveTutorialProgress`/`tutorialOpened`. That file holds no deterministic
> simulation state, so the sim and determinism tests are untouched — but the diff is real and a
> reviewer should see it named here rather than discover it.
>
> **`RESET_KEYS` gained `as_tut_progress`.** Without it the test-code `reset` would leave tutorial
> progress behind and the "first visit" mask it promises would be a lie. `test/storage.test.js`
> already asserted that property for the old key; the assertion is ported, not dropped, and one new
> case covers the legacy read.

**Open question 2 — what dismisses the loud offer: ONE lesson opened.**
There is no completion left to reach (no reward, no gate — owner decision), so "finished" would be a
lie and pitching forever would be a nuisance. Opening a lesson means the player found the way in.
The quiet chip next to "Optionen" is untouched and always available.

## `design-sprache.md` §11 — die Handy-Fassung

Written **in German**, per `AGENTS.md` — *Appending to an existing German document*; the deviation is
noted in the entry's first line. The title lost "(Desktop, ab 1280 px)", the document table gained
the workstream, and §10 has a dated row.

It carries five things, each with the measurement that decided it: the phone card (92dvh in a p-3
frame), **`items-center` as one rule for short and full cards** (307.8 px of black when top-aligned
versus 159.9/159.9 centred), the ~180 px "thin on content" threshold, the 44 px tap target — with the
honest note that the house does not meet it today (Glossary Close 42 px, chips 26.5) — and the
`vite preview --base` trap that produces confident, worthless numbers.

**Left deliberately open in §11:** whether 44 px becomes app-wide. The tutorial sets it through one
scoped rule (`.tut-card .as-actbtn`). **If the answer is app-wide, that rule must be deleted**, not
left as a second home for the number.

## Nachtrag — der Abschluss-Takt heißt jetzt „Tipp"

Owner, 25.08.2026: aus **Merksatz** wurde **Tipp** (`Tip` im Englischen). Durchgezogen bis in die
Bezeichner — `kind: "tip"`, `<Tip>`, `.tut-tip`, `tut.tip` —, weil ein Label und ein Bezeichner, die
sich widersprechen, mit der Zeit auseinanderlaufen. Bezeichner englisch nach `AGENTS.md` — *Code
identifiers remain English*; das alte `merksatz` war dort ohnehin ein deutscher Ausrutscher.

**Nicht umbenannt, mit Absicht:** `../tutorial-plan/evidence/lesson.js` und seine Messwerte. Sie
halten fest, was an dem Tag gemessen wurde; Belege werden nicht rückwirkend an eine spätere
Entscheidung angeglichen. Ebenso unberührt bleiben die Stellen in `docs/decisions/` und
`docs/sim-harness-plan.md`, die das Wort in ganz anderer Sache benutzen.

Gates nach der Umbenennung erneut bare gefahren: test · lint · build, alle exit 0. Im Build
gegengeprüft: die Lektion zeigt **TIPP** bzw. **TIP**.

## Open

1. **T3–T8 are unwritten.** Two placeholder lessons stand in for ~34. That is deliberate: what a
   player reads is a product decision, and six sections of prose should not be authored before
   anyone has used the shell. It can now be used.
2. **Re-measure the topic list once the real sections land** — see the 232.9 px note above.
3. **T4 content finding carried from T1:** the placeholder's starting order makes the obvious move
   *lower* the multiplier (×1,88 → ×1,50, two overlapping formations beating one longer one). A
   teaching example must be chosen so the intended move improves the readout.
