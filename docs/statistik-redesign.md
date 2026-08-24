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

## Das Lauf-Fenster

Ein Klick auf eine Lauf-Zeile öffnet die Detailansicht (`RunDetail`). Sie ist Teil dieses Auftrags.

Mockup: Artboard **„Statistik — das Lauf-Fenster"**, Fassungen *Ist*, *Vorschlag* und *Geöffnet*.

**Messgrundlage:** ein **voller** Lauf — 7 Skills, 20 Perks, Aufstellung. Das ist der Normalfall; der
Snapshot fällt nur weg, wenn der Speicher voll läuft (`storage.js:398` — Notfallpfad, nicht Regelpfad)
und bei fremden Board-Läufen. Ein dünner Lauf misst 717 px, ein voller **949**.

### Was schon richtig ist

Auf dem Desktop ist das **keine Karte, sondern ein Raster**: `background: none`,
`border-color: transparent`, `padding: 0` (`index.css:4488`). Das ist §1 wörtlich und bleibt. Ebenso
bleiben der Überzug, die Score-Zahl auf 46 px, Gold als ihre Farbe und die Kennzahlreihe im Kopf.

### Aufteilung

| | Ist (*gemessen*) | Ziel |
| --- | --- | --- |
| Spuren | 374 · 374 · 374 | **290 · 544 · 290** |
| Aufstellung | eine Zelle in Reihe 1, darunter 272 px Loch | **Spur über beide Reihen** |
| Score-Verlauf | `1 / span 2`, 770 px | `1 / span 2` der linken Spuren, 856 px |
| Reihe 1 | wächst mit dem Inhalt | **fest 380 px** |

**Die Aufstellung ist ein Hochformat** — 5 Spalten zu 8 Reihen aus 5:7-Karten, rund **1 : 2,2**. In
einer Reihe aus Querformaten zwingt sie entweder sich selbst auf Briefmarkengröße oder dem Nachbarn
130 px Luft auf. Sie bekommt deshalb eine Spur über **beide** Reihen; damit verschwindet zugleich das
gemessene 272-px-Loch, das heute unter ihr klafft.

**Die erste Reihe misst fest 380 px.** Das ist die Bedingung dafür, dass das Umschalten im
Build-Panel nichts verschiebt.

### Stats & Verlauf

Acht Werte, **zweispaltig in vier Reihen** statt achtmal untereinander — eine schmale Spur mit acht
gleichen Zeilen liest sich als Menü, nicht als Kennzahlenblock. Die Kacheln füllen die Reihenhöhe.

### Build — zählen statt aufzählen

Das ist der Kern, und die Regel dazu steht in `design-sprache.md` §1 *Zählen statt aufzählen*.

*Gemessen* fließen heute **34 Chips** inhaltsbreit (50 bis 109 px, Höhen 23 / 51 / 80) — jede
Namenslänge ergibt ein anderes Bild, und **keine einzige Beschreibung ist erreichbar**.

**Ziel: fünfzehn feste Kacheln**, immer gleich viele:

| Block | Felder | Quelle |
| --- | --- | --- |
| Skills nach Fraktion | **4** | vier Fraktionen |
| Perks nach Kategorie | **8** | 7 Kategorien (`perks.js:47`) + Legendär |
| Gebäude nach Kategorie | **3** | `value` · `score` · `formation` (`architect.js`) |

Jedes Feld zeigt die Anzahl in der **Kategoriefarbe** — sie ist Inhalt, kein Chrome (§3). Leere
Kategorien bleiben stehen und sind gedämpft (§1, *Ziel*). Die Mehrhöhe des Panels geht in die
**Kacheln**, nicht in die Fugen.

**Die Architekten-Gebäude fehlten bisher ganz.** *Geprüft:* 41 Gebäude in drei Kategorien
(Wert 12 · Score 19 · Formation 10), bis zu 24 gleichzeitig auf dem Brett (`MAX_COVER`).

### Build — geöffnet

Ein Klick auf ein Feld öffnet die Liste **im selben Panel**, mit denselben Maßen (544 × 380):

- Die **acht Kategoriefelder werden zur Reiterzeile** — dieselben Felder, dieselbe Reihenfolge,
  dieselben Farben, nur flach. Das gewählte trägt die Unterkante in seiner Farbe. Man wechselt die
  Kategorie, ohne zurückzugehen.
- **Skills und Gebäude klappen auf je eine Zeile zusammen** statt zu verschwinden; sie bleiben
  sichtbar und anklickbar.
- Die **Liste scrollt im Panel**: Name, Stufe, Wirkung. Sie ist die einzige Stelle des Screens, an
  der eine Liste beliebig lang sein darf.
- Der Kopf sagt, wo man ist: „Build · Perks · Score".

**Kein Overlay, keine dritte Ebene.** Ein Überzug hätte den halben Bildschirm genommen, um sechs
Zeilen zu zeigen, und genau das verdeckt, wozu die Liste gehört. Escape schließt weiterhin genau
eine Ebene.

### Höhe

*Gemessen:* die vier Panels summieren sich beim vollen Lauf auf **1757 px**; das Fenster misst 949 px
gegen 720 px Bildschirm (bei 1400 × 700 sind es 297 px darüber hinaus). `.rd-root` trägt dafür einen
eigenen Scroller (`index.css:4485`) — erreichbar ist alles.

**Ziel:** Kopf raus aus dem Scroller, der Inhalt scrollt. **Dass es passt, wird nicht behauptet:**
ein voller Lauf hat mehr Inhalt, als ein 720-px-Fenster fasst.

### Ohne Aufstellung

Der Ausnahmefall (Speicher voll, fremder Board-Lauf): die dritte Spur **fällt weg**, statt leer zu
bleiben — die Spaltenzahl folgt dem Inhalt.

### Zeichen

Zwei Textglyphen entfallen: `⧉` am Seed und `↻` an „Nachspielen" werden gezeichnete SVG (§4).

### Kopf

Eyebrow **Rückblick · Lauf** — die Statistik, aus der man kommt, trägt denselben Bereich.

---

## Abgrenzung

- **Die Handy-Fassung** bleibt unberührt.
- **Die fünf Sektionen, ihre Reihenfolge und ihr Inhalt** bleiben — es geht um Rahmen, Höhe und
  Klickziele, nicht um andere Zahlen.
- **Gold bleibt die einzige Farbachse.** Auf einem Schirm ohne Kategorien, Raritäten oder Zustände
  ist der Rekord das einzige Farbsignal, und das behält damit seine Aussage.
- **Der Überzug** (`rgba(12, 12, 16, .94)` ohne `backdrop-filter`) und der **Titel auf 27 px** sind
  schon richtig.
- **Keine Mechanik:** nichts hier ändert, was gezählt, gespeichert oder ausgewertet wird.

---

## Offene Punkte für den Owner

1. **Der Wortlaut der neuen Unterzeile** in beiden Sprachen.
2. **Die Namen der Kategoriefelder** im Build-Panel und der Wortlaut der Kopfzeile im
   geöffneten Zustand.
3. **Wie viele Läufe die Liste höchstens zeigt.** Der Vorschlag sagt „so viele, wie die Spalte
   trägt", gedeckelt auf die gespeicherten 30. Wenn eine feste Obergrenze lieber ist (etwa 15), ist
   das eine Zahl.
