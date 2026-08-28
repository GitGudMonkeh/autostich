# Tip review, 2026-08-28 — collected changes (owner walkthrough)

Working document for the tip-by-tip review round. The owner dictates changes per tip; nothing is
implemented until the walkthrough is done, then everything lands in one task. German copy below is
the binding wording (EN/ES/ZH follow at implementation). Style rule enforced here: **no em-dash in
player text** (text-style-guide.md, "Kein Gedankenstrich").

## Status: COLLECTING — not yet implemented

## Hints

| # | Hint | Change |
| --- | --- | --- |
| 1 | **H1** (welcome card) | New body: "Autostich spielt sich selbst: Dein Deck kämpft die {cards} Stiche allein, du triffst die Entscheidungen dazwischen." + "Bei jedem Stich decken beide Decks ihre oberste Karte auf. Die höhere gewinnt, die Farbe spielt keine Rolle." ({cards} stays a constant placeholder.) |
| 2 | **E1** (first win) | "Dein erster Sieg: {win} Basispunkte. Serie, Crits, Formationen und Gebäude werden mit dem Basisscore multipliziert." (replaces "legen sich als Faktoren darauf") |
| 3 | **H3** (first perk) | Drop the "das kostet nichts" claim (declining forfeits the perk). **OPEN: wording** — (a) neutral: "Ein Perk wirkt sofort und bleibt bis zum Ende des Laufs. Passt keiner, kannst du ablehnen." or (b) with the price named: "... Passt keiner, kannst du ablehnen. Der Perk verfällt dann." |

## Probierfeld lessons (Mehr-dazu targets)

| # | Lesson | Change |
| --- | --- | --- |
| 4 | **wahl/kategorien** | Remove the TIPP beat ("Rechts steht, wie viele Familien jede Kategorie hat, zusammen 73.") entirely. |
| 5 | **wahl/raritaet** | Opening sentence replaced: "Perks kommen in unterschiedlicher Rarität, sichtbar am Rahmen." Example cards stay. "Ersetzen, nicht stapeln" merk stays. Everything after it goes: the "Höhere Stufen sind stärker ... Stufe IV schließt eine Familie ab ..." paragraph and the TIPP ("Eine Familie zweimal auf derselben Stufe ..."). |
| 6 | **wahl/legendaer** | Intro shortened to: "Legendäre sind besonders starke Perks und müssen erst freigeschaltet werden." Example cards stay. The "Erst freischalten." block goes. The TIPP goes. |

## Open questions

- H3 wording (a) or (b), see row 3.
- Several existing hint texts still carry em-dashes (H2, S-F1, S-A2, E3, U1, ...). Sweep them
  dash-free in the same pass, or leave shipped copy untouched?

## Ground rules for this round (owner, 2026-08-28)

- Collect first, implement everything in one task at the end.
- No em-dashes in any new or reworded player text.
- The Mehr-dazu lessons are reviewed alongside the hints; expect heavy cuts.
