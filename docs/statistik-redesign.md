# Statistik — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Vorher lesen: **`docs/design-sprache.md`**, insbesondere §1 *Wenn die Anzahl schwankt* — dieser
Screen ist der Anlass für diese Regeln, und sie stehen dort, nicht hier.

Mockup: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 — Artboard
**„Statistik — eine Seite, fester Rahmen"**.

Bezug: die Fassung **ab 1280 px**. Die Handy-Fassung ist nicht Gegenstand.

**Messgrundlage.** Produktionsbuild, echter Viewport, deutsch, **1280 × 720, 1400 × 700,
1536 × 791**, mit **zwölf Läufen im Speicher** — anders zeigt der Screen nur seinen leeren Zustand.

---

## Ausgangsproblem

Die Statistik hat mehr Inhalt, als in 720 px passt. Das ist die Datenmenge, keine Layout-Schwäche —
also **muss** etwas scrollen, und die Frage ist nur, was.

*Gemessen:* Die Karte ist an **jeder** der drei Größen **983 px** hoch; die Sektionshöhen hängen nicht
am Fenster, nur die Breiten. Bei 1280 × 720 liegen damit **263 px unter der Falz**, der Überzug
scrollt 1,4× (bei 1536 × 791 noch 1,27×).

**Der Screen scrollt als einziger das Fenster statt eines Panels.** Der `sticky`-Kopf ist die
Notlösung dafür — er hält Titel und Schließen an Ort und Stelle, während die Karte darunter
durchläuft.

Dazu enden die drei Spalten **305 px auseinander**: Spalte 1 bei 718 px, Spalte 2 bei 687, Spalte 3
bei **992**. „Am häufigsten" ist mit 726 px allein länger als Spalte 1 komplett — die Karte nimmt
ihre Höhe von einer einzigen Spalte.

---

## Die Entscheidung: der Inhalt scrollt, nicht das Fenster

**Der Kopf verlässt den Scroller.** Er steht fest, die Karte klemmt auf die Fensterhöhe, und darunter
scrollt der Inhaltsbereich **als Ganzes** — ein Scroller, nicht drei. Damit verhält sich der Screen
wie Baum und Bestenliste, und der `sticky`-Kopf ist keine Notlösung mehr, sondern der Kopf des Kanons.

**Verworfen: eine Navigationsspalte** wie im Baum, mit den fünf Sektionen als Seiten. Sie hätte das
Scrollen ganz beseitigt — und dafür den Überblick, der der Wert dieses Screens ist. Aus einem
Überblick würden fünf Einzelauskünfte.

---

## Kopf

| Teil | Ist (*gemessen*) | Ziel |
| --- | --- | --- |
| Eyebrow | fehlt | **Rückblick** |
| Titel | „Statistiken", 27 px | unverändert |
| Unterzeile | fehlt | „Was du bisher gespielt hast. Eine Zeile anklicken öffnet den vollständigen Lauf." |
| Aktionszone | Auskunftssatz (819 px breit) **plus** Schließen | nur **Schließen** |

Der Auskunftssatz steht heute in der Aktionszone, wo §2 nur Aktionen zulässt. Er ist Material für die
Unterzeile — dort beantwortet er die Frage, die der Screen sonst offen lässt, und die Aktionszone
wird frei.

---

## Sektionen

*Gemessen:* `border: 0`, Hintergrund transparent, Radius 14. Die fünf Sektionen sind **reine
Abstände**, keine Panels — deshalb liest sich der ungleiche Spaltenfuß als Fehler statt als Kante.

**Ziel:** Tönung 5 % / 1 % und Rahmen 26 %, wie jedes Panel (§1). Reihenfolge und Inhalt der fünf
Sektionen bleiben.

---

## Spalten, Luft und schwankende Anzahlen

Das ist der eigentliche Gegenstand dieses Screens. Die Regeln stehen in `design-sprache.md` §1
*Wenn die Anzahl schwankt*; hier steht, wie sie hier angewandt werden.

**Jede Spalte ist ein eigener Stapel, keine Rasterzeile.** Vorher streckten sich die Zeilen am
längsten Nachbarn, wodurch die zwei kurzen Panels in Spalte 1 auseinandergezogen wurden — eine Lücke
mitten in der Spalte. **Restluft sammelt sich am Fuß einer Spalte, nie zwischen zwei Panels.**

**Die Lauf-Liste füllt ihre Spalte.** Sie ist die einzige echte Liste hier, und es gibt Material:
*gemessen* speichert das Spiel bis zu **30** Läufe (`RUN_HISTORY_CAP`), angezeigt werden **10**
(`slice(0, 10)`). Künftig so viele, wie die Spalte trägt — bei 1280 × 720 etwa dreizehn. **Gefüllt
wird mit vorhandenem Inhalt, nie mit erfundenem.**

**Die Höchstfälle, gemessen — auf diesem Screen ist nichts unbegrenzt:**

| Block | schwankt | Höchstfall | Quelle |
| --- | --- | --- | --- |
| Am häufigsten · Skills | 0–5 Zeilen | 5 | `slice(0, 5)` |
| Am häufigsten · Perks | 0–5 Zeilen | 5 | `slice(0, 5)` |
| Archetyp-Nutzung | 0–4 Zeilen | 4 | es gibt vier Archetypen |
| Was am besten läuft | 0–3 Zeilen | 3 | je der erste Eintrag |
| Deine Läufe | 0–10 Zeilen | 10 → *so viele, wie passen* | `slice(0, 10)`, Speicher 30 |
| Lauf-Detail · Skills eines Laufs | 1–7 Chips | 7 | `SKILL_SLOTS` 6 + Meisterhand 1 |

Die ersten vier sind **Ziele**: reservierter Platz, freie Plätze gedämpft und benannt
(„noch nicht gespielt"). Der Block ist damit immer gleich hoch und sagt nebenbei etwas Wahres — es ist
noch Platz.

Die Skills eines Laufs sind ein **Ergebnis**: keine leeren Plätze, sondern Umbruch in **vier Chips je
Reihe**, also eine oder zwei Reihen statt sieben möglicher Höhen.

---

## Klickziele

*Gemessen:* Die zehn Lauf-Zeilen sind **33 px** hoch — die kleinste Klickfläche des ganzen
Desktop-Passes, und jede öffnet ein Fenster.

**Ziel: 44 px** (§4, ohne Ausnahme). Kosten: rund 110 px mehr in der Sektion — bezahlt, weil es
Klickziele sind, und aufgefangen davon, dass die Liste ihre Spalte ohnehin füllt.

---

## Noch nicht Gegenstand: das Lauf-Fenster

Ein Klick auf eine Lauf-Zeile öffnet die Detailansicht (`RunDetail`). Sie wird **in diesem Auftrag
nicht angefasst** — sie bekommt einen eigenen Durchgang.

Ein Befund liegt aber schon vor und gehört hierher, damit er nicht verlorengeht:
*gemessen* ist das Fenster bei **1400 × 700 ganze 749 px hoch** — höher als der Bildschirm. Bei
1280 × 720 sind es 717 px, also drei Pixel Luft. Im Markup steht `max-h-[90dvh]`; auf dem Desktop
greift es nicht.

---

## Abgrenzung

- **Die Handy-Fassung** bleibt unberührt.
- **Die fünf Sektionen, ihre Reihenfolge und ihr Inhalt** bleiben — es geht um Rahmen, Höhe und
  Klickziele, nicht um andere Zahlen.
- **Gold bleibt die einzige Farbachse.** Auf einem Schirm ohne Kategorien, Raritäten oder Zustände
  ist der Rekord das einzige Farbsignal, und das behält damit seine Aussage.
- **Der Überzug** (`rgba(12, 12, 16, .94)` ohne `backdrop-filter`) und der **Titel auf 27 px** sind
  schon richtig.
- **Das Lauf-Fenster** — eigener Durchgang, siehe oben.
- **Keine Mechanik:** nichts hier ändert, was gezählt, gespeichert oder ausgewertet wird.

---

## Offene Punkte für den Owner

1. **Der Wortlaut der neuen Unterzeile** in beiden Sprachen.
2. **Wie viele Läufe die Liste höchstens zeigt.** Der Vorschlag sagt „so viele, wie die Spalte
   trägt", gedeckelt auf die gespeicherten 30. Wenn eine feste Obergrenze lieber ist (etwa 15), ist
   das eine Zahl.
