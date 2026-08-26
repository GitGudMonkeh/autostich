# T1 — handoff

**`task/tut-t1-shell` · the shell and the catalogue.** Brief:
[`../tutorial-plan/tasks/T1-shell-und-katalog.md`](../tutorial-plan/tasks/T1-shell-und-katalog.md).

## Gates

Run bare, exit code read directly — **not** through a pipe (see *Corrections* below).

| Gate | Result |
| --- | --- |
| `npm test` | **exit 0** — 141 files, 2184 tests |
| `npm run lint -- --max-warnings=0` | exit 0 |
| `npm run build` | exit 0 |
| `npm run build` with `VITE_PREVIEW=1` | exit 0 |
| `npm run gen:db` | exit 0 |
| `npm run loc:export` | exit 0 — the CSV needed regenerating (H8) |

## Measured, 390 × 844, both languages

Reproduce with [`evidence/measure-t1.mjs`](evidence/measure-t1.mjs); raw numbers in
[`evidence/measurements.json`](evidence/measurements.json).

| View | Card | Content / visible | Overhang | Hidden by foot | Sideways | Taps < 44 px |
| --- | --- | --- | --- | --- | --- | --- |
| Themenliste (de/en) | 366 × 331.1 | 190 / 190 | **0** | nothing | no | **0** |
| Lektionsliste (de/en) | 366 × 222.3 | 81 / 81 | **0** | nothing | no | **0** |
| Lektion **de** | 366 × 525.2 | 384 / 384 | **0** | nothing | no | **0** |
| Lektion **en** | 366 × 504.2 | 363 / 363 | **0** | nothing | no | **0** |

The built lesson measures **525.2 px** against the approved prototype's **524.2** — the shape that
was released is the shape that shipped. German is 21 px taller than English, which is why it is the
budget language.

**The Probierfeld calls the real function, verified by using it.** Tapping two cells took the segment
from `9,9,4,9,4` to `9,9,9,4,4` and the readout from `×1,88` to `×1,50` — `computeFormations` doing
the arithmetic, not a lookup table. In English the same interaction reads `Detected · Repeat · ×1.50`:
the name comes from the register and the decimal separator from `fmtNum`.

## Corrections — things I got wrong and fixed

**The measurement harness lied twice before it told the truth.**

1. `$LASTEXITCODE` does **not** reliably survive a pipe into a PowerShell cmdlet. A run that printed
   `Test Files 141 passed` alongside `exit: 0` had in fact been red minutes earlier while printing
   the same `exit: 0`. Every gate above was re-run bare. `AGENTS.md` warns about this for bash; it
   holds for PowerShell too, and the previous task's report should be read with that in mind (its
   green run is independently corroborated by its own `2142 passed / 0 failed` summary).
2. My first "the Probierfeld does not react" reading was a defect in the **measuring script**, not in
   the product: two `.click()` calls in one `evaluate()` give React no chance to flush between them.
   Documented at the top of the script so the next person does not re-diagnose it.

**Four guards caught four real mistakes of mine.** Recorded because each is the guard earning its
keep:

- `i18n-guards` — I wrote *"Learn Autostich"*. **The game is called Autotrick in English.**
- `i18n-guards` — `tut.eyebrow` and `tut.progress` are genuinely identical in both languages;
  they belong in `SAME_OK`, and now are.
- `overlay-nesting` — my `shell()` helper portalled three lines further down than the guard's
  260-character window. The guard was right for the wrong reason and the fix is better code: **one**
  `overlayPortal(` call site instead of three.
- `hook-deps-budget` — my `eslint-disable-next-line exhaustive-deps` would have raised the exception
  budget. The guard says stabilise the dependency first, so I did: `fmtNum(x, locale)` makes `locale`
  a real dependency and the disable disappears. **The budget did not move.**

**And one I caught myself:** the new guard's own assertion was red on the *explanatory comment* that
quotes the forbidden pattern as a counter-example — the failure mode `AGENTS.md` names under *"some
guards have historically matched their own explanatory comments"*. Comments are stripped before
matching now.

## Decisions

**Hazard A — the 44 px tap target — is SCOPED, not applied app-wide.** *Measured:* `ActionButton`
renders 42 px everywhere (`py-2.5`), and the real Glossary's Close is 42 px with 26.5 px chips. The
overlay now gets `.tut-card .as-actbtn { padding-top/bottom: 11.5px }` — **one rule, scoped to this
surface.** Changing a shared component's metrics under cover of a new feature is the drift the design
document exists to stop.

> **A trap worth knowing:** the first version of that rule sat inside `@media (min-width: 1280px)`,
> which is where `.as-actbtn`'s neighbours live — so it had no effect at 390 px and the measurement
> was unchanged. `index.css` has one very large desktop block; a mobile rule must go outside it.

**T9 decides whether 44 px becomes the app-wide rule in `design-sprache.md` §11.** If it does, this
scoped rule should be deleted rather than left as a second place where the number lives.

**The card is centred, one rule for both cases.** The report proposed "fills the cap → top; well
under → centred". `items-center` does both by itself: a card at the 92dvh cap has 12 px of frame
either side regardless, a short one floats. No conditional.

## For the content tasks (T3–T8)

- **The budget model is accurate**: it predicted 384 px for the German lesson and the browser
  measured 384. Trust it while writing; still run V1–V4.
- **T4, a content finding from actually playing with it:** the placeholder's starting order makes the
  obvious move *lower* the multiplier (`×1,88 → ×1,50`, because two overlapping formations beat one
  longer one). A teaching example must be chosen so the intended move improves the readout. That is
  T4's call, not T1's — the two placeholder lessons here are scaffolding.
- **T2 handed a rule over and it is honoured:** *"kein Tutorial-Text nennt eine Zahl direkt"* now
  lives in `test/tutorial-sections.test.js`.

## Open

1. **The overlay is not reachable in the app.** T9 owns the hub entry; T1 measured through a
   temporary scaffold that was deliberately not committed.
2. **`viewport-1280.test.js` wants a fifth sample directory.** T2 removed `ui/tutorial` and left a
   note asking for `ui/tutorial-sections`. It exists now — **whoever integrates T1 and T2 should add
   it**, since neither branch can see the other's change.
3. Staffing — Owner and Integrator are still `TODO` in the contract.
