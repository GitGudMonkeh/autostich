# `#tutorial-sections` — the nine tasks

One brief per task. Each is written to be handed to a worker **on its own**, without reading the
other eight. What they share is stated here once and cited, not repeated.

## What every task inherits

| | |
| --- | --- |
| **Feature branch** | `feature/tutorial-sections` — every task branches from it and integrates back into it |
| **Tier** | C unless the brief says otherwise |
| **Binding scope** | [`../task-contract.md`](../task-contract.md) — *Approved architecture* items 1–10 bind every task |
| **The reasoning** | [`../planning-report.md`](../planning-report.md) — read §1 before writing any UI, §4 before writing any lesson |
| **Canonical phone** | 390 × 844, dpr 2 |
| **Visual gate** | full V1–V4 at 390 × 844, **in both languages** |
| **Gates** | `npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` · **and `npm run loc:export`** wherever player-visible text moves (H8) |

## The two tripwires, on every task

1. **`src/game/**`** — if a diff touches it for anything but *reading*, stop. The tutorial is UI.
2. **A redefined term** — if a lesson defines a term `src/game/glossary.js` already carries, stop.
   Link it, or change the glossary. Never write alongside it.

## The lesson contract, on every content task

- **Three beats:** one Satz · one Probierfeld **or** one Bild · one Merksatz.
- **≤ 400 px of beats** at 390 × 844 **in German**, or it is two lessons. German is the budget
  language because it is the longer of the two.
- **One to two sentences per Satz** — `docs/text-style-guide.md` §3.
- **No number typed into a sentence.** Interpolate the constant. This is `text-style-guide.md` §4 and
  it is testable — carry over the assertion at `test/tutorial.test.js:105`.
- **Key namespace `tut.*`**, never `tutorial.*`.
- **Currencies through the catalogue** — `t("common.cur.sp")`, never a literal `"SP"` or `"TP"`.
  They are the same currency in two languages (`de.js:461` / `en.js:448`).

## Order

```
T1 Shell & Katalog ─┐                    T2 Rückbau  (parallel, independent)
                    ├─> T3 · T4 · T5 · T6 · T7 · T8   (parallel with each other)
                    └─> T9 Einstieg & Design-Dokument  (needs T1 + any one content task)
```

**T1 is the only serialising task.** It ships with zero lessons on purpose: its job is to make the
shape unarguable before six workers write into it.

**T2 runs first, not last.** Leaving the guided run alive means two tutorials in the hub and two sets
of `tutorial.*` keys, and its guards fire either way. Doing it early also frees the namespace.

## Index

| | Task | Branch | Delivers |
| --- | --- | --- | --- |
| T1 | [Shell & Katalog](T1-shell-und-katalog.md) | `task/tut-t1-shell` | the overlay, three levels, four beat kinds, the catalogue schema |
| T2 | [Rückbau des geführten Laufs](T2-rueckbau.md) | `task/tut-t2-rueckbau` | `src/ui/tutorial/` gone, 8 components cleaned, 4 guards resolved |
| T3 | [S1 · Grundlagen](T3-s1-grundlagen.md) | `task/tut-s1-grundlagen` | 8 lessons |
| T4 | [S2 · Aufstellung](T4-s2-aufstellung.md) | `task/tut-s2-aufstellung` | 6 lessons, 2 Probierfelder |
| T5 | [S3 · Perks & Skills](T5-s3-perks-skills.md) | `task/tut-s3-perks-skills` | 6 lessons |
| T6 | [S4 · Die vier Archetypen](T6-s4-archetypen.md) | `task/tut-s4-archetypen` | 4 lessons |
| T7 | [S5 · Der Architekt](T7-s5-architekt.md) | `task/tut-s5-architekt` | 6 lessons, 2 Probierfelder |
| T8 | [S6 · Nach dem Lauf](T8-s6-nach-dem-lauf.md) | `task/tut-s6-nach-dem-lauf` | 4 lessons |
| T9 | [Einstieg & Design-Dokument](T9-einstieg-und-designdoc.md) | `task/tut-t9-einstieg` | hub entry, progress state, `design-sprache.md` §11 |

*Estimated:* 34 lessons planned, up to ~38 built — the 400 px budget splits a handful of the denser
topics. Section counts above are guidance for the cut, not contract.
