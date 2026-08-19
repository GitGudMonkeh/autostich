# Perk-Kategorie-Embleme — Sammelstand

Ein Emblem je **Perk-Kategorie** (`CATEGORIES` in `src/game/perks.js`), nicht je Perk und nicht je Familie —
das wären 130 Bilder. Sie sollen wie die Skill-Embleme als **Kopfstreifen** auf der Angebotskachel liegen.

Einbau ist NICHT gemacht: Issue #402.

## Die sieben Kategorien

| | Name | Bedeutung | Farbe | Familien | Perks | Motiv | Silhouette |
|---|---|---|---|---|---|---|---|
| A | Deck | Dauerhafte Kartenwerte | `#8a7de0` | 11 | 3 | Kartenstapel von der Seite, jede Kante glüht | liegender Block ✅ |
| B | Stich | Stich-Effekte | `#e0605a` | 11 | 3 | zwei Karten prallen frontal aufeinander | gespiegeltes Paar |
| C | Rolle | Kartenrollen | `#5ab87a` | 12 | 3 | drei Karten im Fächer, je ein anderes Mal | Fächer |
| D | Score | Score | `#d4a63a` | 20 | 5 | steigende Stufenfolge aus Lichtbalken | Treppe |
| E | Form | Formationswerkzeuge | `#5a8ade` | 14 | 7 | Winkel und Lineal über Kartenfeldern | gekreuztes Werkzeug |
| P | Präzision | Crit-Chance & -Multiplikator | `#e08a3a` | 5 | 0 | Fadenkreuz über einer Karte | Kreis mit Kreuz |
| S | Ausbau | Slots & Ökonomie | `#5ec8c0` | 0 | 1 | Gerüst mit leerem, hell umrissenem Fach | offener Rahmen |

## Die Farbe trägt hier NICHT — die Silhouette muss es

Vier der sieben Farben bedeuten im Spiel längst etwas anderes:

- **A Deck `#8a7de0`** ist exakt die Blitz-Fraktionsfarbe.
- **C Rolle `#5ab87a`** ist exakt die Pflanzen-Farbe.
- **E Form `#5a8ade`** liegt dicht an Eis `#5ec8f0`.
- **D Score `#d4a63a`** ist das Gold, das „legendär" heißt (Kartenkante, Badges).
- **B Stich `#e0605a`**, **P Präzision `#e08a3a`** und Feuer `#e0714a` liegen in einem engen warmen Feld.

Bei den Skills konnte die Farbe die Fraktion tragen — es waren vier gut getrennte. Hier muss die FORM die
Arbeit machen, und sie muss zusätzlich gegen die 21 vergebenen Blitz-Silhouetten stehen.

## Sprache: Zustand statt Ereignis

Skills sind Ereignisse (ein Einschlag, ein Ausbruch, ein Moment). Perks sind **Zustände**: Gegenstände in
Ruhe, von innen beleuchtet. Kein Einschlag, keine Funken, keine Entladung. Die Bauart bleibt gleich (drei
Helligkeitsbänder, schwarzer Grund, quadratisch, `mix-blend-mode: screen`).

## Messung

| Emblem | > 10 | > 40 | > 90 | > 180 | Streuung | Farbton |
|---|---|---|---|---|---|---|
| Blitz-Skill (Referenz des anderen Satzes) | 10,9 % | 4,5 % | 2,0 % | 0,60 % | 1,98 | 259° |
| **A Deck** | 23,5 % | 10,3 % | 1,6 % | 0,44 % | 1,95 | 261° |

**Der Perk-Satz muss zu SICH SELBST passen, nicht zu den Skills** — Perk- und Skill-Kacheln erscheinen nie
auf demselben Bildschirm. Deck trägt doppelt so viel Licht wie ein Blitz-Emblem (das Licht ist hier flächig
statt linear: die große Deckfläche des obersten Blattes), und das ist in Ordnung. **23,5 % ist damit der
Referenzwert für die sechs anderen.**

Weicht später eine Kategorie stark ab, wird sie beim Backen angeglichen (`scripts/skill-art-build.py`) —
eine Zahl in einer Tabelle statt eines neuen Bildversuchs.

## Komposition

Der Kopfstreifen zeigt die **oberen 76 %** des quadratischen Bildes (Zone 210 px auf 277 px Kachelbreite,
`object-fit: cover`, `object-position: center top`). Bei Deck liegen 100 % des Lichts in diesem Fenster —
die Unterkante des Stapels sitzt aber knapp an der Grenze. Für die restlichen sechs gilt: **Motiv in die
oberen zwei Drittel, unteres Drittel fast schwarz.**
