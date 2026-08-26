# Design-Sprache — Overlays und Menüs (Desktop ab 1280 px · Handy in §11)

**Status: lebendes Dokument.** Es ist die Quelle der Wahrheit für die Bildsprache aller Menü-Overlays
und wird bei jedem Screen fortgeschrieben, den wir uns vornehmen. Wer einen Screen anfasst, liest
zuerst hier — und trägt hier nach, was er entschieden hat.

**Was hier entschieden ist, gilt auch für Screens, die eine Form vorher kopiert haben.** Ein Bauteil
wandert von Screen zu Screen — die Navigationsspalte des Baums steht heute in drei Overlays. Ändert
sich das Original, ziehen die Kopien nach; sie sind dieselbe Bedienung, nicht eine ähnliche. Anlass:
die Bestenliste trug die Spalte des Baums noch zwei Entscheidungen nach dessen Umbau.

Es beschreibt **nur Gestaltung**, keine Mechanik und keine Umsetzung. Technische Fragen
(Komponenten-Schnitt, wo das CSS liegt, Tests) bespricht der Owner mit dem umsetzenden Worker.

Zugehörige Aufträge, die auf diesem Dokument aufsetzen:

| Screen | Auftrag |
| --- | --- |
| Optionen | `docs/optionen-redesign.md` |
| Feedback-Melder | `docs/feedback-redesign.md` |
| Mainscreen & Marke | `docs/mainscreen-marke.md` |
| Upgrade-Baum | `docs/upgrade-baum-redesign.md` |
| Erststart | `docs/erststart-redesign.md` |
| Statistik | `docs/statistik-redesign.md` |
| Bestenliste | `docs/bestenliste-redesign.md` |
| Deck-Werkstatt | `docs/werkstatt-redesign.md` |
| Lauf-Bildschirm (kein Overlay, s. §8) | `docs/battlefield-redesign.md` |
| Tutorial-Sektionen (Handy, s. §11) | `docs/workstreams/tutorial-sections/tutorial-plan/planning-report.md` |

Mockups: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 (Marke, Mainscreen,
Melder, Baum) und https://claude.ai/code/artifact/c8328e42-db0b-411f-b26e-ec72a60a17ec (Optionen).

**Bezug ist durchgehend die Desktop-Fassung ab 1280 px.** Die schmale Fassung ist nicht Gegenstand
dieses Dokuments; wo sie angefasst wird, gelten die Komponenten-Maße aber ebenfalls.

---

## 1. Fundament

### Die Karte verschwindet

Ein Overlay ist **keine Karte auf dem Hub**, sondern ein Screen. Der Überzug trennt vom Spiel,
**Fläche und Rahmen tragen die Sektions-Panels**. Die äußere Karte ist nur noch das Raster.

- Überzug: `rgba(12, 12, 16, .94)`
- **Kein `backdrop-filter`.** Begründung und Messung stehen an `.up-root` (`#perf-blur`): er war der
  teuerste Posten des Desktop-Passes und optisch bei 94 % Überzug nicht auffindbar.

### Panel

Das Panel ist die Fläche, auf der alles steht. Es zieht die aktive **Deckfarbe** in die Fläche, nach
dem Rezept der Hub-Kacheln (`.as-hub-tile`), aber zurückgenommen:

```
border-radius: 14px;
padding: 16px 18px 18px;
border: 1px solid color-mix(in srgb, var(--deck-a1) 26%, #2b2a36);
background: linear-gradient(180deg,
  color-mix(in srgb, var(--deck-a1) 5%, rgba(27,26,36,.93)) 0%,
  color-mix(in srgb, var(--deck-a1) 1%, rgba(22,22,32,.95)) 100%);
```

**5 % oben, 1 % unten.** Der Ton soll erkennbar sein, nicht gelesen werden: man merkt beim Deckwechsel,
dass sich etwas geändert hat, ohne dass die Fläche eine Farbe *hat*. Den Hauptteil der Zugehörigkeit
trägt der **Rahmen** (26 %), nicht die Fläche.

Der Wert kam über drei Runden zustande: 13 / 7 % ist das Rezept der Hub-Kacheln (`.as-hub-tile`) und
auf großen Panels deutlich zu viel; 9 / 5 % war ein Zwischenschritt und wirkte auf flächenreichen
Screens wie dem Upgrade-Baum immer noch zu kräftig. **Mehr Tönung heißt linear mehr Deck-Gefühl und
weniger Textkontrast** — bei hellen Decks (Ascension `#e6b93a`, Obsidian `#e8edf5`) fällt beides
zuerst auf, dort wird geprüft.

### Kein Panel im Panel

Ein getöntes Panel enthält **keine zweite gerahmte Fläche**. Wo ein Bereich innerhalb eines Panels
abgesetzt werden muss (Auswertungskasten, Zusammenfassung), trennt ihn eine **Linie nach oben**
(`1px solid rgba(150,150,170,.14)`) — kein eigener Rahmen, kein eigener Radius, keine eigene Fläche.

Der Grund ist im Vergleich Optionen ↔ Upgrade-Baum sichtbar geworden: bei gleichen Werten wirkte der
Baum kräftiger, weil er zwei Tönungsebenen übereinander legte. Eine Ebene reicht.

**Damit endet jede Seite gleich:** ein abschließender Bereich — Auswertung, Zusammenfassung, ein
Verweis — hängt als Sektion mit Trennlinie am Fuß des Panels, nicht als Kasten darin.

**Und in dieser Reihenfolge**, von innen nach außen:

1. der Inhalt der Seite,
2. was zum angetippten Element gehört (die Detailzeile) — sie steht direkt bei dem, was sie erklärt,
3. die Abschluss-Sektion der Seite (Auswertung, Challenge),
4. die Zeichenerklärung.

Der Grund ist die Blickrichtung: Punkt 2 gehört zu einem einzelnen Element und muss neben ihm stehen;
Punkt 3 gilt für die ganze Seite und darf ans Ende; Punkt 4 gilt für den ganzen Screen. Wer die
Reihenfolge tauscht, schiebt die Erklärung eines Knotens hinter die Zusammenfassung der Seite — genau
der Fehler, den `UpgradeScreen.jsx:576` heute macht. Zwei Fälle im
Baum: der Auswirkungs-Kasten der Allgemein-Seite und die Challenge der Fraktionsseite
(`.up-impact`, `.up-chall` — beide heute mit eigener Fläche `#12121a` und eigenem Rahmen).

### Sektions-Überschrift

```
font-size: 12.5px; font-weight: 600;
text-transform: uppercase; letter-spacing: .18em;
color: var(--deck-a1);
padding-bottom: 13px;
```

### Zeile

Alles, was **in** einem Panel steht — Optionszeilen, Eingabefelder, Listenzeilen —, bleibt
**neutral**. So liest sich die Tönung als Fläche, und der Text sitzt auf ruhigem Grund.

```
padding: 11px 13px; border-radius: 8px; gap: 13px;
background: rgba(15, 15, 21, .72);
border: 1px solid rgba(150, 150, 170, .12);
```

- Titel: `13.5px / 600 / #e8e8ea`
- Beschreibung: `12px / line-height 1.38 / #8a8a95`, `margin-top: 2px`

**Eine Farbkante an einer Zeile muss etwas unterscheiden.** Tragen alle Zeilen einer Liste dieselbe
Kante, unterscheidet sie nichts und summiert nur zu einer Farbwolke — die Beobachtung, aus der
`#kante-anlauf` entstanden ist. Fundstelle: die 17 Fähigkeiten der Fraktionsseite tragen alle die
Kante ihrer Fraktion, auf einer Seite, die nur diese Fraktion zeigt (`index.css:2571`). Dort bleiben
die 17 neutral, und die vier legendären behalten ihre goldene Kante — damit sagt Gold auf der Seite
wieder etwas.

### Wenn die Anzahl schwankt

Listen, deren Länge vom Spielstand abhängt, dürfen ihre Nachbarn nicht verschieben. Welche Regel
gilt, entscheidet **eine** Frage: ist die Zahl ein **Ziel** oder ein **Ergebnis**?

| Fall | Regel | Beispiel |
| --- | --- | --- |
| **Ziel** — ein Rahmen, den man füllen kann | Platz nach dem **Höchstfall** reservieren, freie Plätze **gedämpft** stehen lassen und sagen, was fehlt | „Meistgewählte Skills", 5 Plätze: wer zwei gespielt hat, sieht drei freie, nicht drei fehlende |
| **Ergebnis** — was tatsächlich passiert ist | in **fester Spaltenzahl** umbrechen, damit die Höhe in bekannten Stufen springt statt beliebig | die Skills *eines* Laufs: 1–7 Stück, vier je Reihe → eine oder zwei Reihen, nicht sieben Höhen |
| **Offen** — wartender Inhalt vorhanden | mit **vorhandenem** Inhalt füllen, nie mit erfundenem | die Lauf-Liste: 30 gespeichert, 10 gezeigt — künftig so viele, wie die Spalte trägt |

Die erste Zeile ist §5 *Leere Werte* auf eine Liste angewandt. Die zweite verhindert, dass ein
Ergebnis leere Plätze behauptet, die es nie gab.

**Dazu die Layout-Hälfte, ohne die keine der drei Regeln hilft:**

- **Panels sitzen in einem Raster mit festen Zeilen, nicht in einem Fluss.** Ein Block, der doch
  länger wird, **scrollt in sich** — er schiebt nie seinen Nachbarn. Dieselbe Naht wie im Baum seit
  `#flach` (`grid-template-rows: minmax(0, 1fr)` plus innerer Scroller).
- **Gleichhöhe wird nie erzwungen.** Ein Block endet an seinem Inhalt. Drei Panels mit 501, 491
  und 544 px auf eine Höhe zu zwingen macht aus dem längsten einen **abgeschnittenen** und aus dem
  kürzesten einen **hohlen** — beides schlechter als eine ungleiche Kante. (Anlass: das Lauf-Fenster,
  wo genau das passiert war, nachdem die Regel darüber schon geschrieben stand.)
- **Spaltenbreiten folgen dem Inhalt, nicht dem gleichen Anteil.** Drei gleich breite Spuren für drei
  ungleiche Inhalte sind keine Ordnung, sondern eine Behauptung. Im Lauf-Fenster wurde aus
  374 · 374 · 374 ein 300 · 570 · 254 — der Build trägt 27 Chips, die Aufstellung ein Hochformat.
- **Ein Element mit festem Seitenverhältnis wird über seine knappe Achse bemessen.** Das Kartenbrett
  ist 5 Spalten × 8 Reihen aus 5:7-Karten, also rund **1 : 2,2 im Hochformat**. An der Spaltenbreite
  aufgehängt wäre es in einer 374-px-Spur 813 px hoch und liefe aus jedem Panel; über die Höhe
  bemessen braucht es 254 px Breite. Alles andere in einem Menü wird von der Breite bestimmt — solche
  Objekte sind die Ausnahme und müssen als solche behandelt werden.
- **Ein Hochformat bekommt einen hochformatigen Platz.** Die knappe Achse zu bemessen reicht nicht,
  wenn das Verhältnis extrem ist: das Kartenbrett (rund 1 : 2,2) in eine Reihe aus Querformaten zu
  setzen zwingt entweder das Brett auf Briefmarkengröße oder dem Nachbarn 130 px Luft auf. Dann
  bekommt es eine **Spur über mehrere Reihen** statt einer Zelle in einer.
  In einem **flachen, breiten** Kasten heißt derselbe Satz: das Hochformat steht **neben** dem
  übrigen Inhalt, nicht darüber oder darunter. *Gemessen am Eis-Panel des Laufs* — dasselbe
  5 × 8-Brett kostet das Panel **259 px, wenn es unter der Ablesungszeile sitzt, und 190 px, wenn es
  links daneben steht.* Gleiche Fassung, gleiche Daten, nur die Achse ist richtig.
- **Mehrhöhe geht in die Kacheln, nicht in die Fugen.** Wo ein Panel höher ist als sein Inhalt,
  wachsen seine Elemente. Die Luft auf die Abstände zwischen Gruppen zu verteilen macht aus einem
  Panel drei lose Blöcke — und die Zahlen bleiben klein, obwohl Platz da wäre.
- **Ein Panel, dessen Inhalt umschaltet, behält seine Maße.** Sonst schiebt es beim Öffnen seine
  Nachbarn — dasselbe Verbot wie oben, nur in der Zeit statt im Raum. Die Fläche steht vorher fest,
  der neue Inhalt scrollt darin.
- **Restluft sammelt sich am Fuß einer Spalte, nie zwischen zwei Panels.** Luft am Ende liest sich
  als „die Spalte ist zu Ende", Luft in der Mitte als „hier fehlt etwas". Eine Spalte ist deshalb ein
  eigener Stapel und keine Rasterzeile, die sich am längsten Nachbarn streckt.
- **Und dasselbe gilt INNERHALB einer Zeile.** Ein Raster, das sich in der Höhe strecken darf, legt
  die Mehrhöhe in seine Zeilen statt an seinen Fuß — jede Zeile wird dann etwas zu hoch, und die Luft
  steht mitten im Panel. Der Fall ist schwerer zu sehen als der obere, weil nichts überläuft und
  nichts abgeschnitten wird; man sieht nur ein Panel, das lose wirkt. *Gemessen am Lauf-Bildschirm:*
  eine 42-px-Zeile für 17 px Inhalt und eine 38er für 17, zusammen 70 px Luft in vier Panels. Ein
  Raster, das nicht ausdrücklich am Anfang ausgerichtet ist, ist der Regelfall dieses Fehlers.

### Zählen statt aufzählen

Eine Liste, die zu lang für ihre Fläche ist, aber **bekannte Kategorien** hat, wird nicht gekürzt und
nicht gescrollt — sie wird **gezählt**. Das Panel zeigt je Kategorie ein Feld mit der Anzahl; ein
Klick darauf öffnet die Liste **an Ort und Stelle**, im selben Panel, mit denselben Maßen.

Der Gewinn ist doppelt: die Fläche steht fest, egal was der Spielstand hergibt — und es wird *mehr*
sichtbar, nicht weniger, weil die Liste Platz für Beschreibungen hat, den eine Chip-Wolke nie hatte.

Im Lauf-Fenster: 20 Perks als Chips waren zwanzig Namen ohne Wirkung. Als acht Kategoriefelder plus
Liste sind es acht Zahlen und, einen Klick entfernt, jeder Perk mit Stufe und Wirkung.

**Wenn geöffnet wird, werden die Kategoriefelder zur Reiterzeile** — dieselben Felder, dieselbe
Reihenfolge, dieselben Farben, nur flach. Man wechselt die Kategorie, ohne zurückzugehen. Was sonst
noch im Panel stand, klappt auf je eine Zeile zusammen statt zu verschwinden.

**Kein Overlay dafür.** Ein Überzug nimmt den halben Bildschirm, um ein paar Zeilen zu zeigen, und
verdeckt genau das, wozu die Liste gehört. Ein Panel, das umschaltet, verdeckt nichts und braucht
keine dritte Ebene.

### Die Kachel ist der Köder, die Ansicht ist das Bild

Wo ein Katalog aus **Bildern** besteht, gewinnt man Bildwirkung **nicht**, indem man die Kacheln
vergrößert. Eine Kachel wächst in der Breite und kostet Sichtbarkeit im Quadrat: jede gewonnene
Reihe Kachelbreite nimmt eine Reihe Kacheln aus dem ersten Bildschirm. Die Wirkung entsteht in der
**Detailansicht** — und dort dadurch, dass **ein** Bild führt statt drei gleich großer.

*Gemessen an der Werkstatt bei 1280 × 720:* fünf statt sechs Katalogspalten hätten der Kachel 40 px
gebracht und **sieben von zwölf** ohne Scrollen sichtbaren Decks gekostet. Dasselbe Panel mit dem
Kartenrücken als Hochformat und Vorderseite plus Spielfeld als Beiwerk daneben bringt dem
Hauptbild **155 → 266 px** — die 2,9-fache Fläche — und kostet den Katalog **keinen Pixel**.

Daraus die allgemeine Form: **eine Ansicht, die ein Objekt verkaufen soll, führt genau ein Bild.**
Drei gleich große Bilder nebeneinander sind ein Inventar, kein Angebot.

**Und die Gegenprobe gehört dazu:** die schmale Spalte zu kürzen, um dem Katalog Breite zu geben,
war der naheliegende Schluss und war falsch. Ein Block, dessen Schrumpffaktor sich aus dem
Verhältnis von Inhalt zu Fläche ergibt, ist **breitengebunden** — kürzt man die Spalte, schrumpft er
im selben Verhältnis mit. Bei 520 → 424 px verliert die Vorschau 20 % und der Katalog gewinnt nichts,
was er zeigen könnte.

### Ein Textfeld, das schmaler ist als sein längstes Wort, ist kein Textfeld

Bevor eine Spaltenzahl entschieden wird, wird die **ungekürzte Breite der längsten Beschriftung
gemessen** — Klon ohne `truncate` in einen freien Messrahmen, im Produktionsbuild, in der Schrift,
die dort wirklich steht. Geschätzt wird sie nicht: an der Werkstatt lag die Schätzung um 12 px
daneben, und 12 px waren der Unterschied zwischen „ein Name abgeschnitten" und „fünf".

Zwei Befunde, die daran hängen und über den Screen hinausgehen:

- **`hyphens: auto` ist kein Mittel.** *Gemessen:* an allen sechs zu langen Namen ändert es nichts —
  der Browser bringt kein deutsches Wörterbuch mit. Wer auf automatische Trennung baut, baut auf
  nichts.
- **Eine Farbkante darf auch nicht wiederholen, was das Element schon zeigt.** Die Regel oben sagt,
  eine Kante muss etwas *unterscheiden*; der zweite Fall ist die Kante, die etwas **doppelt**. Die
  Pack-Kachel trug die Akzentfarbe ihres Decks als 4-px-Kante — über einem Coverbild, das dieselbe
  Farbe großflächig zeigt. Die vier Pixel sind am Text besser aufgehoben.
- **Ein Feld mit zwei Werten braucht die Breite für beide.** Wo eine Ablesung außer ihrem Wert noch
  einen Zusatz trägt („21 · +2695 %", „31 % +18 Ion."), ist nicht der Wert zu breit, sondern das Feld
  zu schmal — und es gehört über die volle Spurbreite, während die einwertigen Nachbarn sich eine
  Zeile teilen. *Gemessen an den Multiplikatoren des Laufs:* in einer 214-px-Spur fehlten dem
  Formationswert 35 px. **Umbrechen ist dafür kein Ersatz:** es senkte die abgeschnittenen Stellen
  von vier auf zwei und ließ die Spur von 340 auf 375 px wachsen — die Seite lief dann 37 px über.
  Ein zu schmales Feld kostet Breite; ein umbrechendes kostet Höhe, und Höhe ist meist teurer.

**Und eine Warnung zum Messen selbst, weil sie stille Fehlmessungen erzeugt:** *was ein Panel nicht
abschneidet, meldet keinen Überlauf.* Ein gestrecktes Flex-Kind mit `overflow: visible` gibt über
`scrollHeight` immer seine eigene Boxhöhe zurück — es „passt" also scheinbar immer, während sein
Inhalt längst darunter hinausläuft. Der Bedarf wird deshalb am **Klon im freien Messrahmen**
genommen, auf die tatsächlich gerenderte Breite gesetzt und in der Höhe frei. Dasselbe gilt für
Kontrast: wer jedes Textblatt gegen die Panelfläche misst, meldet dunkle Schrift auf einem hellen
Chip als 1,07 : 1 — der Grund muss der sein, der wirklich dahinterliegt.

### Haarlinie

Unter dem Kopf, über die volle Breite: `linear-gradient(90deg, a1, a2, a1)`, Deckkraft `.85`,
**Höhe 2 px, überall.** Beide Stopps tragen die Flächen-Mischung (70 %, §3).

**Das Farbpaar bleibt, unverändert** — auch bei Decks, deren zwei Farben fast gegenüberliegen.
*Gemessen über alle 42 Paare* tut es je nach Deck etwas völlig anderes, und beides ist richtig:

| Familie | Anzahl | Was die Linie tut |
| --- | --- | --- |
| Ton-Verlauf, Abstand ab 90° | 10 | zwei Farben, bis 173° auseinander (Eldritch, Malibu Wave, Genesis) |
| beides zugleich, 30–90° | 9 | eine Wanderung in Ton und Helligkeit |
| Helligkeits-Verlauf, unter 30° | 23 | ein Ton, hell nach dunkel — bei 16 davon liegt der Ton unter 10° |

Die Linie tut damit auf **41 von 42 Decks** etwas: im Ton bis 173°, in der Helligkeit im Verhältnis
bis 1,85 (Median 1,39). Es ist dasselbe Paar, das die Wortmarke trägt — die Haarlinie zeigt vom Deck
genau das, was die Marke auch zeigt.

**Ein Deck fällt heraus, und das bleibt so: Seraph** (`#ffe08a` / `#fff2c0`) — 4° Ton, Verhältnis
1,11. Zwei fast gleiche Cremetöne, die die Mischung noch näher zusammenschiebt; die Linie liest sich
dort als eine Farbe statt als Verlauf. Ihre Aufgabe ist, den Kopf abzusetzen, und das tut sie — hell
auf dunklem Grund. Eine Sonderregel für ein Deck von 42 wäre teurer als der Fehler.

Der Wert ist nicht beliebig: die Strichstärken dieser Sprache sind eine Leiter mit vier Sprossen, und
jede Sprosse ist belegt.

| Stärke | Bedeutung |
| --- | --- |
| 1 px | neutrale Trennlinie (`rgba(150,150,170,.14)`) — trennt, ohne zu betonen |
| **2 px** | **die Haarlinie in der Deckfarbe** — trennt und sagt, wo man ist |
| 3 px | Kante einer Zweitaktion |
| 4 px | Kante der Hauptsache — Schließen, aktive Zeile, gewählter Knoten |

3 px war für die Haarlinie schon vergeben. Und auf einem 1200 px breiten Panel wird aus einer 3-px-Linie
ein Balken: sie soll den Kopf absetzen, nicht ihn unterstreichen.

---

## 2. Kopf-Kanon

Gilt für **alle** Overlays. Der Grund ist einfach: sie gehören zu einem Spiel, und der Ausgang muss
überall an derselben Stelle liegen.

### Raster

```
auto · [screen-eigene Zonen] · 1fr · auto
align-items: start;      ← der Kern
column-gap: 26px;
```

**`align-items: start`, nicht `center`.** Dadurch sitzt die Aktionszone immer am selben Punkt unter
der Oberkante — egal wie hoch der Titelblock daneben ist. Zentriert man gegen einen unterschiedlich
hohen Block, landet der Knopf in jedem Screen woanders; genau daher kam der Versatz.

### Zone 1 — Titelblock

Immer in dieser Reihenfolge:

| Teil | Stil |
| --- | --- |
| Eyebrow | `12px / 500 / uppercase / letter-spacing .1em`, Deckfarbe |
| Titel | `27px / 600 / letter-spacing -.01em` |
| Unterzeile | `13px / line-height 1.45 / #8a8a95` — beantwortet die Frage, die der Screen sonst offen lässt |

### Letzte Zone — Aktionen

**Schließen ist immer das letzte Element.** Zweitaktionen stehen links davon, screen-eigene Zonen
(Währung, Fortschritt) weiter links. **Nichts steht je rechts von Schließen.**

Eine Bauart, eine Größe — ersetzt die drei heutigen Fassungen:

```
font: 600 15px Geist; padding: 11px 18px; border-radius: 8px; min-height: 44px;
background: rgba(12, 12, 18, .5);
border: 1px solid rgba(150, 150, 170, .18);
border-left: 4px solid rgba(150, 150, 170, .35);
color: #d5d5df;
```

Gezeichnetes ✕ vor dem Wort. Zweitaktionen tragen dieselbe Größe, aber eine 3-px-Kante.

### Die Eyebrow-Wörter

Der Eyebrow nennt den **Bereich**, der Titel den **Screen**. Wo der Bereich denselben Namen trägt wie
der Screen, nimmt der Eyebrow die kürzere, im Hub gebräuchliche Form — deshalb bleiben „Optionen"
und „Upgrades", obwohl sie fast wie ihre Titel klingen.

| Eyebrow | Titel | Unterzeile |
| --- | --- | --- |
| Upgrades | Upgrade-Baum | Dauerhafte Verbesserungen für jeden Lauf. |
| Kosmetik | Deck-Werkstatt | Decks, Spielfelder, Effekte. |
| Rückblick | Statistiken | *neu* — „Was du bisher gespielt hast. Eine Zeile anklicken öffnet den vollständigen Lauf." |
| Vergleich | Bestenliste | *neu* — „Die besten Läufe aller Spieler." |
| Rangliste | Bestenliste | *neu* — „Woche {n} — alle spielen denselben Seed." |
| Nachschlagen | Glossar | Begriffe & Sonderregeln — keine einzelnen Perks/Skills |
| Nachschlagen | Leitfaden | So spielst du jeden Archetyp. |
| Optionen | Einstellungen | Alles sofort wirksam und gespeichert. |
| Playtest | Feedback senden | Geht direkt an die Entwicklung. |

**Ein Screen mit zwei Einstiegen bekommt zwei Kopf-Fassungen, nicht zwei Screens.** Die Bestenliste
öffnet sich über die Hub-Kachel zum *Nachsehen* und über den Ranglisten-Knopf zum *Spielen* — dieselbe
Liste, zwei Aufgaben. Der **Titel bleibt gleich**, weil die Sache dieselbe ist; **Eyebrow und
Unterzeile sagen, welche der beiden Aufgaben gerade läuft**. Genau dafür hat der Kopf diese zwei
Teile. Ein zweiter Titel wäre ein zweiter Screen, und den gibt es nicht.

**Glossar und Leitfaden teilen sich einen Eyebrow.** Das ist kein Versehen: sie sind derselbe Bereich,
und der geteilte Kicker sagt genau das. Zwei Beiträge einer Rubrik tragen dieselbe Rubrik.

**Warum nicht ein einziges System für alle acht:** „Optionen" und „Upgrades" sind der kurze Name des
Screens, „Playtest" und „Rückblick" der Bereich. Ein durchgehendes Bereichs-System hätte zwei bereits
freigegebene Wörter umgeworfen, ohne dass ein Spieler etwas davon hat. Die Regel oben deckt beide
Fälle ab und ist die schmalere.

**Geprüft und verworfen:** „Verlauf" für Statistiken (zu nah am Titel und für die Lauf-Historie
belegt), „Sammlung" für die Werkstatt („Kosmetik" sagt zusätzlich, dass hier nichts das Spiel
verändert), „Weltweit" für die Bestenliste (kollidiert mit „Globale Highscores" darunter),
„Fortschritt" für den Baum (die Ablesung im selben Kopf heißt schon so).

### Ablesungen im Kopf

Währung und Fortschritt stehen als **benannte Ablesung**, nicht als nackte Zahl am Titel:
Beschriftung darüber, Wert darunter. Die **Farbe der Währung bleibt screen-eigen** (SP gold, DP
cyan) — sie kodiert, welche Währung gemeint ist.

---

## 3. Farbrollen

Das ist die wichtigste Seite dieses Dokuments. Eine Farbe, eine Rolle.

| Rolle | Farbe | Gilt für |
| --- | --- | --- |
| **Struktur / Chrome** | **die Deckfarbe** `var(--deck-a1)` | Eyebrows, Sektions-Überschriften, Lane-Überschriften, Haarlinie, Aktiv-Kante der Auswahl, Regler-Füllung, Haken im Dropdown, Panel-Tönung |
| **Kaufbar / Währung** | Gold | Preisschilder, Kaufen-Knopf, SP-Guthaben |
| **An / gekauft** | Grün `#54e08a` | Schalter „an", gekaufte Knoten, Zeichenkachel einer aktiven Zeile |
| **Gesperrt** | Grau `#8a8a95` / `#3a3a48` | Zeichen und Marken gesperrter Zeilen |
| **Inhalt** | Raritätstöne (`tierColor`), Fraktionsfarben (`FACTION_GLOW`) | nur dort, wo die Farbe **das Gemeinte ist** — eine blaue Rarität, eine Fraktions-Identität |

**Grundsatz: Struktur ist immer die Deckfarbe.** Feste Fremdtöne für Struktur gibt es nicht mehr.
Das folgt der Regel, die `genAccentMobile()` in `UpgradeScreen.jsx` bereits für die Handy-Fassung
anwendet — mit dem Kommentar *„Struktur, kein Spiel-Signal"*. Der Desktop zieht nach.

**Cyan `#26c6e6` gehört dem Hub.** Laut `#ruhe` ist es dort die Handlungsfarbe und die einzige auf
voller Sättigung. Es darf in Menüs nicht für Beschriftungen ausgegeben werden.

**Das Grün der Rolle ist `#54e08a`, nicht `#5ab87a`.** Dieses Dokument hat zuerst den falschen Ton
genannt. `#5ab87a` ist im Code dreifach als **Inhalt** belegt — Fraktion Pflanze
(`FactionIcon.jsx:34`, `skills.js:287`, `glossary.js:43`), die Kartenfarbe „Grün"
(`constants.js:717`) und eine Perk-Kategorie (`perks.js:50`). Eine Farbe, eine Rolle: dieser Ton hat
schon drei, und keine davon ist „Zustand". Auf der Pflanzen-Seite des Baums fielen Rollenfarbe und
Fraktions-Identität deshalb zusammen.

`#54e08a` **ist** die Zustandsfarbe, schon heute und dreimal: `STATE_ON` „ausgerüstet / läuft
gerade" (`CustomizeScreen.jsx:71`), `GRUEN` „gekauft" (`UpgradeScreen.jsx:35`) und das Häkchen im
Melder (`FeedbackModal.jsx:139`). Der hellere, sattere Ton sitzt zudem **über** den Pigmenttönen
statt zwischen ihnen — genau das, was ein Zustandslicht tun soll.

Dazu, damit es nicht wieder abgeleitet wird: das **Aktiv-Abzeichen** der Werkstatt ist
Fläche `#123a25` · Schrift `#54e08a` · Rand `#2f7a4f` (`CustomizeScreen.jsx:1430`).

**Zwei Goldtöne, klar getrennt:** Währung `#d6ab6b`, kaufbare Kante `#d4a63a`. Ein dritter Ton
(`#f2a83a` mit Schein, heute im Baum-Kopf) entfällt.

### Ziel-Helligkeit der Deckfarbe

Wenn Struktur immer die Deckfarbe ist, hängt die Lesbarkeit der Menüs an einer Farbe, die der Spieler
aussucht. **Gemessen über alle 42 Decks mit eigenem Akzent**, Kontrast von `a1` gegen den Zeilengrund
`#16161f`:

| | Spanne | darunter |
| --- | --- | --- |
| ungemischt | **1,94 : 1** (Thron `#8f0f2a`) bis **15,31 : 1** (Origami `#f4ecdd`) — Faktor 7,9 | 3 Decks unter 4,5 : 1, davon 2 unter 3 : 1 |

Dieselbe Regel, dasselbe Panel, und einmal steht der Text da und einmal nicht. **Das Mittel ist eine
Mischung auf Weiß**, wie `.as-hub-glyph` sie schon benutzt. Es sind zwei Werte, weil es zwei Aufgaben
gibt:

| Rolle | Mischung | Ergebnis über alle 42 Decks |
| --- | --- | --- |
| **Deckfarbe als Schrift** — Eyebrows, Sektions- und Lane-Überschriften | `color-mix(in srgb, var(--deck-a1) 62%, #ffffff)` | schlechtestes Deck **4,65 : 1**, alle 42 über 4,5 |
| **Deckfarbe als Fläche oder Kante** — Haarlinie, Aktiv-Kante, Regler-Füllung, Haken im Dropdown | `color-mix(in srgb, var(--deck-a1) 70%, #ffffff)` | schlechtestes Deck **3,80 : 1**, alle 42 über 3 |

4,5 für Schrift, 3 für alles, was man nur sehen und nicht lesen muss — zwei Zahlen für zwei
Aufgaben, nicht zwei Zahlen aus Geschmack. Die 62 % sind kein übernommener Wert: es ist genau die
Mischung, bei der das dunkelste Deck über 4,5 : 1 kommt.

**Nicht gemischt wird die Tönung**: die 5 / 1 % der Panel-Fläche und die 26 % des Rahmens bleiben, wie
sie sind. Sie sollen nicht gelesen werden, sie sind die Zugehörigkeit — und sie sind selbst schon
Mischungen.

Der Rahmen ist dabei ausdrücklich geprüft worden, nicht bloß ausgelassen. *Gemessen* über alle 42
Decks, Rahmen gegen die Panelfläche: **1,25 : 1 bis 2,33 : 1, Faktor 1,9** — nicht 7,9 wie bei der
Schrift. Kein Rahmen verschwindet; sie sind alle leise, und leise ist ihre Aufgabe. Eine Mischung
würde alle 42 anheben, um bei zwei Decks 0,3 zu gewinnen.

**Verworfen: ein einziger Wert für alles.** 62 % auch für Flächen und Kanten wäre eine Zahl statt
zweien, und der Unterschied in der Sättigung ist klein (Mittel 0,44 gegen 0,39). Trotzdem nein:
Haarlinie, Regler-Füllung und Aktiv-Kante sind das, was vom Deck überhaupt noch zu sehen ist, nachdem
die Schrift weichgezeichnet wurde. Ihr Kontrast war ohnehin erfüllt — dort Farbe wegzunehmen kostet
etwas und bringt nichts. Die zwei Zahlen sind keine Komplexität, sie sind die Trennung zwischen
**lesen** und **sehen**.

**Was es kostet, ehrlich:** die Mischung nimmt Farbe. Über alle 42 Decks fällt die mittlere Sättigung
von 0,65 auf 0,39, bei 62 % also gut vierzig Prozent. Am stärksten trifft es die dunklen, kräftigen
Decks — Thron geht von tiefem Burgunder in ein staubiges Rosé. Das ist der Preis dafür, dass die
Menüs auf jedem Deck funktionieren, und er wird bewusst bezahlt: **die drei Decks, die die Regel
nötig machen, sind drei von 42 — aber wer Thron spielt, spielt immer Thron.**

### Was ausdrücklich NICHT deck-getönt wird

Fraktionsfarben, Raritätstöne und Gold. Sie tragen Spielbedeutung, kein Chrome.

---

## 4. Komponenten

**Alles Bedienbare misst 44 px in der Höhe.** Sichtbar ist jeweils weniger; das Klickziel ist die
volle Höhe. Diese Regel hat keine Ausnahme.

### Schalter

| | |
| --- | --- |
| Spur | 46 × 26 px, vollrund |
| Klickfläche | 46 × 44 px |
| Griff | 20 × 20 px, `#f2f2f4`, 2 px Innenabstand |
| an | Fläche und Rand `#54e08a` |
| aus | Fläche `#30303a`, Rand `#3a3a44` |

### Segmented

Nur für **zwei bis drei feste Zustände, die nie mehr werden**. Alles Wachsende geht ins Dropdown.

```
Rahmen 1px #3a3a44, radius 8, geteilte Kontur
Feld: padding 9px 15px, min-height 44px
inaktiv: rgba(19,19,26,.9) / #8a8a95
aktiv:   rgba(32,32,44,.95) / #f0eefc + inset 0 -2px 0 var(--deck-a1)
```

Aktiv braucht **beide** Signale — hellerer Grund *und* Unterkante. Die Unterkante allein ist zu leise.

### Dropdown

Für Listen, die wachsen (Sprachen, Auflösungen).

```
Knopf:   min 172 × 44, radius 8, Rand #3a3a44, Fläche rgba(19,19,26,.9), Text #f0eefc
Chevron: 12px, #8a8a95, dreht beim Öffnen um 180°
Liste:   radius 10, Rand #3a3a44, Fläche #1b1a24, Schatten 0 16px 40px rgba(0,0,0,.55)
Eintrag: min-height 36, radius 6, #c9c9d2; Hover rgba(255,255,255,.05)
gewählt: heller UND Haken in der Deckfarbe
```

Feste Knopfbreite, damit der Kasten beim Wechseln nicht springt. Zahlenlisten in Geist Mono.

### Regler

```
Breite 148px, Greiffläche 44px hoch
Spur 6px, radius 3, Rest #2a2a34, Füllung Deckfarbe
Griff 16px, #f2f2f4, 2px Rand #14141a
Wert rechts: Geist Mono, tabellarisch, #c9c9d2, min-width 46px
```

**Der Farbwechsel gehört unter den Griff**, nicht an das Prozentmaß der Spur: der 16-px-Griff wandert
nur zwischen 8 px und 140 px, ein reiner Prozentwert läuft ihm an den Enden um 8 px davon.
Rechnung: `calc(8px + var(--fill) * 132px)` mit `--fill` als Bruchzahl.

### Zeichenkachel

`28 × 28`, Radius 8, Zeichen 16 px. Farbe folgt dem Zeilenzustand über `--c`:
Fläche `rgba(255,255,255,.03)`, Rand `color-mix(in srgb, var(--c) 42%, transparent)`.

### Zeichen

**Gezeichnete SVG, 16-px-Raster, eine Strichstärke, `currentColor`. Keine Emoji, keine Textglyphen.**
Eine Textglyphe hängt am Schriftschnitt und sieht je nach Rückfall anders aus — das ☾ des Ruhigen
Modus las sich als „C", das 🔒 im Baum sieht auf jeder Plattform anders aus.

---

## 5. Zustände

### Gesperrt

Deckkraft **42 %**, Zeichenkachel stumm, **keine Eingabe — auch nicht per Tastatur**. Optisch
gesperrt und tatsächlich fokussierbar ist kein Zustand, sondern eine Falle.

Der Titel sagt **warum** gesperrt ist, nicht nur *dass*: „Kein Lauf zum Anhängen gefunden",
„öffnet sich mit Rarität · Legendär".

**Leuchtet etwas, dann das, was gerade dran ist.** Nach `#ruhe` leuchtet die Hauptaktion — auf
einem Screen, dessen Hauptaktion beim Öffnen gesperrt ist, leuchtet stattdessen das Element, das die
Sperre löst. Einziger Fall bisher: der Erststart, wo das Eingabefeld leuchtet und der Speichern-Knopf
nicht, weil er ohne Namen tot ist. Es bleibt bei **einem** Schein je Screen; die Ausnahme verschiebt
ihn, sie vermehrt ihn nicht.

**Der Zustand steht auf dem Bedienelement, nicht erst in einer Erklärung daneben.** Eine Kachel, die
gesperrt ist und trotzdem ihren Preis in Gold zeigt, sagt „kaufbar" — und die Wahrheit steht dann
irgendwo anders. Konkret: **Gold nur bei `buy`.** Gesperrt, zu teuer und kaufbar sind drei Zustände
und brauchen drei Bilder. Anlass: das Kärtchen der Legendär-Phase im Baum zeigte „5 SP" in Gold,
während sein Gate unerfüllt war; der Grund stand 71 px tiefer und 330 px weiter rechts, in der Seite,
die gerade offen war (`UpgradeScreen.jsx:515` / `:576`).

Daraus die allgemeine Regel: **erklärt sich ein Element nur woanders, gehört die Erklärung an das
Element.** Ein Bedienelement, das seinen ganzen Inhalt tragen kann, braucht keine aufklappende Zeile
in einer anderen Spalte.

### Bedingung und Fortschritt sind zwei Dinge

Eine **Bedingung ist ein Satz** und passt nicht auf eine Kachel. Ein **Fortschritt ist eine Zahl**
und passt immer. *Gemessen an den zwölf Herausforderungen der Werkstatt:* der Bedingungssatz ist im
Mittel 142,5 px breit und im schlimmsten Fall 344,4 px — auf einem Feld von 71,3 px. **Elf von zwölf
sind abgeschnitten.** Die zugehörigen Zähler sind **keiner breiter als 62 px**.

Also: **die Kachel trägt den Fortschritt** — ein schmaler Balken in der Deckfarbe und ein Zähler in
Geist Mono —, und der **Satz steht in der dauerhaft sichtbaren Ansicht daneben**, als
Abschluss-Sektion mit Trennlinie.

**Und der Zähler hat zwei Formen, weil es zwei Arten von Zielen gibt:** ein **Paar**, solange beide
Zahlen kurz sind („3 / 5", „21 / 300"), und **Prozent**, wo das Ziel in die Millionen geht („2 %").
Der rohe Paar-Text eines Score-Ziels wäre „412.000 / 25.000.000" und damit dreimal so breit wie
seine Kachel — *gemessen* passt selbst die gekürzte Form nicht neben den Balken. Das ist keine
Ausnahme von der Regel, sondern ihre Anwendung: ein Paar liest sich als „tu es N mal", ein
Prozentsatz als „erreiche eine Zahl". **Am Ort mit Platz — der Abschluss-Sektion — steht immer das
volle Paar.**

Das ist keine Ausnahme von *„erklärt sich ein Element nur woanders, gehört die Erklärung an das
Element"*, sondern ihre Bedingung: die Erklärung darf danebenstehen, solange sie **ohne Klick und
ohne Wechsel** im Bild ist. Was die Regel verbietet, ist die Erklärung, die man erst **aufklappen**
muss — nicht die, die immer schon dasteht.

### Abhängigkeiten sichtbar machen

Wo A B steuert, muss man das **sehen**, nicht nur merken: Ton aus → beide Regler auf 42 % und ihr
Wert liest „stumm" statt einer wirkungslosen Zahl. Master aus → Untergruppe auf 42 %.

### Leere Werte

Ein Balken bei null sagt „nichts" sehr laut. Ist etwas **noch nicht freigeschaltet**, wird die Kachel
gedämpft und sagt das — sie ist nicht bei null.

---

## 6. Typografie

| Rolle | Schrift |
| --- | --- |
| Fließtext, Titel, Beschriftungen | **Geist** |
| Zahlen, Werte, Codes, Kleinbeschriftungen | **Geist Mono**, tabellarische Ziffern |
| Marke, große Ablesungen | **Orbitron** 450–500 |

**Kleinbeschriftung** (das Label über einer Ablesung, über einem Feld):
`Geist Mono, 10px, letter-spacing .14em, uppercase, #5c5c68`.

---

## 7. Text

- **Ein String ist ein ganzer Satz.** Keine Fragmente, die erst durch Aneinanderkleben Sinn ergeben
  (`" / {total} Knoten · Ranglisten-Lauf"` + `"bei {total}/{total} Knoten"` ist der Gegenentwurf).
- **Kein Layout im String.** Kein führendes Leerzeichen, kein angehängter Mittelpunkt, kein Emoji.
  **Eine benannte Ausnahme: das weiche Trennzeichen** (`U+00AD`). Es ist unsichtbar, ändert das Wort
  nicht und wirkt nur an der Stelle, an der die Zeile ohnehin bräche. Es ist Typografie, kein Layout.
  Erlaubt ist es dort, wo ein **einzelnes Wort breiter ist als sein Feld** und die Alternative ein
  abgeschnittener Name wäre — nicht als Bequemlichkeit. *Gemessen:* `hyphens: auto` ist dafür kein
  Ersatz; der Browser bringt kein deutsches Wörterbuch mit und ändert an keinem der sechs Fälle
  etwas. Erster Fall: sechs Deck- und Herausforderungsnamen der Werkstatt in einer 70-px-Kachel.
- **Beschriftung statt nackter Zahl.** Eine Ablesung ohne Wort daneben ist Rätselraten.
- Wiederholt ein Element den Namen seines Containers, streicht man ihn: die Spalte trägt den Namen,
  der Eintrag die Stufe.
- Player-sichtbarer Text folgt `docs/text-style-guide.md` und `docs/localization/i18n.md`.

---

## 8. Was diese Sprache NICHT anfasst

- Die Fassung unter 1280 px, solange sie nicht ausdrücklich beauftragt ist.
- Spielbedeutungs-Farben (Fraktionen, Raritäten, Gold).
- Alles, was Verhalten ist statt Gestaltung — Rate-Limits, Speicherwege, Freischalt-Logik.
- **Mechanik.** Wer eine gestalterische Änderung auf eine Spielregel stützt, muss sie vorher im Code
  nachlesen und die Quelle nennen. (Anlass: eine Gruppierung der Baum-Lanes wurde aus der
  Farbverteilung erschlossen statt aus den `prereq`-Ketten — und war falsch.)

### Der Lauf-Bildschirm ist kein Overlay — und was hier trotzdem für ihn gilt

Dieses Dokument heißt *Overlays und Menüs*. Der Lauf ist keins von beidem: kein Überzug, keine Karte,
kein Schließen-Knopf, und er wird nicht gelesen, sondern **beobachtet, während er sich bewegt**.
Beim Umbau seiner Instrumente (`docs/battlefield-redesign.md`) war die Abgrenzung deshalb die erste
Frage, und sie ist hier entschieden, damit der nächste Screen sie nicht neu erfinden muss:

| | gilt | warum |
| --- | --- | --- |
| **§1 Fundament** | **ja** | Spaltenbreiten nach Inhalt, Restluft an den Fuß, Zählen statt aufzählen, Hochformat, umschaltendes Panel — reine Layout-Logik, und die Befunde des Laufs waren genau ihre Verletzungen (Spurbreite schwankte um Faktor 9,7, 35 % des Inhalts sichtbar) |
| §2 Kopf-Kanon | nein | der Lauf hat keinen Overlay-Kopf und keine Aktionszone |
| §3 Farbrollen | teilweise | die vier Fraktionsfarben sind dort **Inhalt**, nicht Chrome — sie bleiben unangetastet |
| §4 „alles Bedienbare misst 44 px" | nein | *gemessen* sind 19 von 22 Bedienelementen der Instrumentenbank kleiner, und jeder Pixel Höhe kostet dort 2,5 px Bühnenbreite |

Die allgemeine Form: **§1 ist Layout und gilt überall, wo Flächen und Inhalte gegeneinander stehen.
§2 und §4 sind Overlay-Konventionen und gelten nur dort.** Wer einen weiteren Nicht-Overlay-Screen
anfasst, entscheidet nach demselben Schnitt und trägt das Ergebnis hier nach.

---

## 9. Offene Punkte

**1 — Welche Farbe hat ein DP-Preis?** §2 sagt, die Farbe der Währung bleibt screen-eigen (SP gold,
DP cyan); §3 sagt, Cyan gehört dem Hub und darf in Menüs nicht für Beschriftungen ausgegeben werden,
und weist Preisschilder dem Gold zu.

*Nachgeschlagen, nicht erschlossen:* **DP trägt heute drei Farben.** Auf dem **Hub** — der Stelle,
an der ein Spieler sein Guthaben im normalen Ablauf sieht — ist es `#d6ab6b`, exakt das Währungsgold
dieses Dokuments (`StartScreen.jsx:55`, `:774`). Auf dem **Endscreen** ist es `#35c6e6`
(`GameOver.jsx`), in der **Werkstatt** ebenfalls `#35c6e6`. Es gibt also keine gewachsene
DP-Identität, die eine Umstellung bräche.

Dazu: die Unterscheidungsaufgabe, für die §2 die screen-eigene Farbe vorsieht, tritt in der Werkstatt
gar nicht ein — SP wird dort nie gezeigt (`CustomizeScreen.jsx:1256`).

**Empfehlung: Gold.** Im Mockup ist Gold gezeichnet. **Kosten, ehrlich:** auf dem Endscreen stehen
SP und DP untereinander; dort ist die Unterscheidung echt und liefe künftig über die Beschriftung
statt über die Farbe. Der Endscreen trägt dort heute ohnehin `#d4a63a`, `#f2c14a` und `#35c6e6` —
drei Töne für zwei Währungen — und ist ein eigener Folgepunkt.

Fällt die Entscheidung stattdessen auf Cyan, gehören zwei Dinge hierher: **welcher** Ton
(`#26c6e6` und `#35c6e6` stehen beide im Code), und die Bestätigung, dass Cyan damit gleichzeitig
aus jeder Strukturrolle im Menü verschwindet.

---

---

Was vorher hier stand, ist abgearbeitet: die Haarlinien-Höhe (§1), die Ziel-Helligkeit der Deckfarbe (§3),
die Eyebrow-Wörter (§2) und der Zwei-Farben-Verlauf bei Genesis-artigen Decks (§1). Neue Punkte
entstehen bei jedem Screen, den wir uns vornehmen — sie gehören hierher, nicht in den Auftrag.

---

## 11. Die Handy-Fassung

**Sprachhinweis:** Dieser Eintrag ist deutsch, wie das ganze Dokument. Das ist die dokumentierte
Ausnahme aus `AGENTS.md` — *Appending to an existing German document*: ein englischer Abschnitt
mitten in einer deutschen Vorlage bricht die Vorlage, auf die der Rest der Datei baut.

**Warum hier und nicht in einem eigenen Dokument.** §8 nimmt „die Fassung unter 1280 px" aus —
**„solange sie nicht ausdrücklich beauftragt ist"**. Die Tutorial-Sektionen sind dieser Auftrag. Ein
Geschwisterdokument hätte eine Bildsprache in zwei Dateien geteilt, die jemand von Hand im Gleichlauf
halten müsste; das ist derselbe Fehler, den §1 an „zwei Tönungsebenen" und §7 an „ein String ist ein
ganzer Satz" beschreibt, nur eine Etage höher.

**Bezugsgröße ist 390 × 844** (`scripts/phone-proof.mjs`). Jede Zahl unten ist **gemessen** im
Produktionsbuild, nicht gerechnet; das Skript liegt bei
`docs/workstreams/tutorial-sections/tutorial-plan/evidence/measure.mjs`.

### Die Karte

Wie im Glossar und im Leitfaden: `max-height: 92dvh` in einem `p-3`-Rahmen. Bei 390 × 844 sind das
**366 × 776,5 px** für eine Karte, die bis an den Deckel wächst, und 55,5 px Luft am Fuß.

### Oben angeschlagen oder mittig — eine Regel, nicht zwei

**`items-center`. Immer.** Eine Karte am 92dvh-Deckel steht damit ohnehin wieder oben (12 px Rahmen
je Seite); eine kurze schwebt mittig.

*Gemessen:* eine Tutorial-Lektion aus drei Takten ist **525,2 px** hoch, also 62 % des Schirms. Oben
angeschlagen lägen **307,8 px** Schwarz darunter, und der Bildschirm liest sich wie eine Seite, der
der Inhalt ausgegangen ist. Mittig teilt sich dieselbe Luft **159,9 / 159,9**.

Das Glossar schlägt oben an und darf das: es füllt mit seinen 109 Begriffen **immer** bis zum Deckel,
der Unterschied tritt dort nie auf.

### Wieviel Luft zu viel ist

*Gemessen:* eine Liste aus fünf nackten Zeilen ließ **228,5 px** unter der Karte frei — 27 % des
Schirms. Mit einer Weitermachen-Zeile und einer Fortschritts-Zeile waren es **104,2 px**.

**Über rund 180 px ist der Bildschirm dünn an Inhalt, nicht schlecht gesetzt.** Die Antwort ist
Inhalt, nicht Polsterung — und der beste Inhalt ist der nützlichste Knopf: „weitermachen, wo du warst".

### Tippziele

**44 px für alles, was eine Entscheidung trägt** — Knöpfe, tippbare Zeilen, Zellen. Chips und Filter
bleiben, wie sie sind.

**Das Haus hält das heute nicht ein, und das ist ehrlich festzuhalten.** *Gemessen* im echten Glossar
bei 390 × 844: der Schließen-Knopf misst **42 px**, die Kategorie-Chips **26,5 px**; `ActionButton`
liefert app-weit 42 px (`py-2.5`). §4 nennt 44 px, ist aber ausdrücklich auf ≥ 1280 px bezogen — für
das Telefon gab es bis hierher keine Regel.

**Offen und bewusst offen gelassen:** ob die 44 px rückwirkend für die ganze App gelten. Die
Tutorial-Sektionen setzen sie über **eine** Regel, die nur ihre eigene Fläche trifft
(`.tut-card .as-actbtn`, `index.css`). Fällt die Entscheidung für app-weit, gehört diese Regel
**gelöscht** statt stehengelassen — sonst lebt die Zahl an zwei Orten.

### Die Zeile gilt auch hier

`§1 — Zeile` (`rgba(15,15,21,.72)`, `1px solid rgba(150,150,170,.12)`, Radius 8) ist die Fläche für
alles, was **in** einer Karte steht, auch auf dem Telefon. Und `§1 — Kein Panel im Panel` gilt
unverändert: ein Abschluss (im Tutorial der Tipp) hängt an einer **Linie nach oben**, nicht in
einem eigenen Kasten.

### Messen: die Falle, die zweimal Geld gekostet hat

`vite preview` wendet die Base aus `vite.config.js` **nicht** an — dort steht
`command === "build" ? "/autostich/" : "/"`, und für `preview` ist das Kommando `"serve"`. Ohne
`--base /autostich/` fällt jede Asset-Anfrage in den SPA-Fallback und liefert `index.html`:
**1391 Byte HTML, wo 156 575 Byte CSS hingehören.**

Die Seite mountet dann nichts — **und screenshottet trotzdem als plausibler dunkler Schirm.** Wer so
misst, bekommt einen vollständigen Satz selbstsicherer, wertloser Zahlen. Zwei Wächter gehören in
jedes Messskript: die Größe der CSS-Antwort prüfen, und abbrechen, wenn `#root` weniger als ein paar
Dutzend Knoten hat. `scripts/phone-proof.mjs:162` beschreibt dieselbe Falle.

### Die zwei Lektionsarten

Der erste Bau kannte **eine** Art und **ein** Budget: 400 px, „kurz und knackig". Die Proberunden
passen da nicht hinein, und das ist ihr Zweck, nicht ihr Fehler — ein Schirm, auf dem man etwas
**tut**, darf länger sein als einer, den man liest.

*Gemessen* am freigegebenen Entwurf bei 390 × 844: Median **645 px**, **31 von 41** Lektionen über
400, Maximum 1.360. Drei Auflösungen standen zur Wahl — das Budget fällt · der Entwurf wird zerlegt ·
zwei Arten. Der Owner hat die zwei Arten gewählt.

| Art | Budget | Was sie ist |
| --- | --- | --- |
| **karte** | **400 px** | Eine Sache, ein Blick. Sie scrollt nicht. |
| **runde** | **960 px** | Man arbeitet damit. Sie scrollt einmal. |

**Woher die 960 kommen.** Eineinhalb Schalenhöhen: 638 × 1,5 = 957, aufgerundet. Einmal
weiterschieben ist zumutbar, dreimal ist eine Seite ohne Ende. Die Zahl ist hergeleitet, nicht an den
Bestand angepasst — *gemessen* reißt bei dieser Grenze **genau eine** der 41 Lektionen ihr Budget.
Ein Budget, das nichts fängt, wäre keins.

**Was beide Arten teilen:** der Tipp steht am Ende, genau einmal. Das ist die Regel, die den
ursprünglichen Fehler verhindert — das Fazit hinter dem Fuß, während „Weiter" daneben leuchtet — und
sie gilt für beide unverändert.

**Was eine Runde von einer Karte unterscheidet, ist nicht ihre Länge, sondern ihr beweglicher Teil.**
Eine Runde ohne Probierfeld ist eine Karte, die ihr Budget missbraucht; genau so wird ein gehobenes
Budget still zum neuen Normalmaß. Der Wächter verlangt deshalb mindestens ein Probierfeld je Runde
und lässt der Karte weiterhin höchstens eines.

### Die Takt-Arten

Vier trugen den ersten Bau, vier kamen mit den Proberunden dazu.

| Takt | Was er ist |
| --- | --- |
| `satz` | Fließtext, der eine Sache sagt |
| `bild` | eine stehende Abbildung mit Unterschrift |
| `probierfeld` | der bewegliche Teil |
| `tip` | der Abschluss, an einer Linie nach oben |
| `merk` | ein hervorgehobener Satz, den man behalten soll |
| `regeln` | nummerierte Punkte, jeder ein eigener Kasten |
| `tabelle` | Werte nebeneinander; ihre Zeilenzahl steht am Takt |
| `liste` | die Tipps am Ende einer Sektion |

`merk` und `tip` sind **nicht** dasselbe: der Tipp schließt die Lektion ab und steht genau einmal am
Ende, ein Merksatz steht mittendrin und darf mehrfach vorkommen. Beide bleiben bei `§1 — Kein Panel
im Panel`.

### Was §11 NICHT anfasst

- Das Band 640–1279 px. Es ist weiterhin unbeauftragt.
- Die Desktop-Fassung der Tutorial-Sektionen. Sie kommt nach dem Menü-Umbau und erbt dann, was aus
  der geteilten Overlay-Schale geworden ist (Owner-Entscheidung).

---

## 10. Änderungsprotokoll

| Datum | Was |
| --- | --- |
| 25.08.2026 | **§11 — die Handy-Fassung**, anlässlich der Tutorial-Sektionen (`#tutorial-sections`). Erster Eintrag des Dokuments unterhalb von 1280 px; §8 sah ihn vor („solange sie nicht ausdrücklich beauftragt ist"). Härtester Befund: das Haus hält seine eigene 44-px-Regel auf dem Telefon nicht ein — der Schließen-Knopf des Glossars misst gemessen 42 px, seine Chips 26,5. Neu festgehalten: `items-center` als EINE Regel für kurze wie volle Karten (gemessen 307,8 px Schwarz bei oben angeschlagener 525-px-Karte gegen 159,9/159,9 mittig) und die Grenze, ab der ein Bildschirm dünn an Inhalt ist statt schlecht gesetzt (rund 180 px Restluft). |
| 24.08.2026 | **Lauf-Bildschirm entworfen**, Auftrag unter `docs/battlefield-redesign.md`. Härtester Befund: die Instrumentenbank war um Faktor 2,2 überbucht (2460 px Bedarf auf 1140 px), und die Breite hing an der ANZAHL der Fraktionen statt am Inhalt — dieselbe Spur maß je nach Lauf 584 oder 60 px. Sichtbar waren 35 % des Inhalts. Neu: Perks und Multiplikatoren stehen als umschaltende Spalten neben der Bühne, unten ein Element im Fokus und die übrigen als Kopfzeilen. Ergebnis über vier Lauf-Formen und drei Größen: 0 Scrollbereiche, 0 abgeschnittene Stellen, Seite exakt Fensterhöhe. |
| 24.08.2026 | **Die Abgrenzung „was gilt für einen Nicht-Overlay-Screen" ist entschieden** (§8): §1 ist Layout und gilt überall, §2 und §4 sind Overlay-Konventionen und gelten dort nicht. Anlass war der Lauf; die Frage stellt sich beim Hub genauso und war bis dahin offen. |
| 24.08.2026 | Drei Ergänzungen in §1: **Restluft gehört auch INNERHALB einer Zeile an den Fuß** (ein streckbares Raster legt die Mehrhöhe in seine Zeilen — gemessen 70 px Luft in vier Panels, ohne dass etwas überläuft), **ein Hochformat steht in einem flachen Kasten NEBEN dem Inhalt** (dasselbe Brett kostet unten 259 px, daneben 190), und **ein Feld mit zwei Werten braucht die Breite für beide** (Umbrechen ist kein Ersatz: es kostete 35 px Breite gegen 35 px Höhe, und Höhe war teurer). |
| 24.08.2026 | Dazu eine Mess-Warnung in §1: **was ein Panel nicht abschneidet, meldet keinen Überlauf** — ein gestrecktes Flex-Kind mit `overflow: visible` meldet über `scrollHeight` immer seine eigene Boxhöhe. Bedarf wird am Klon im freien Rahmen genommen. Ebenso beim Kontrast: gegen den Grund messen, der wirklich dahinterliegt, nicht gegen die Panelfläche. Beide Fehler sind in dieser Session einmal gemacht und korrigiert worden. |
| 24.08.2026 | **Das weiche Trennzeichen ist erlaubt** (§7, benannte Ausnahme) — Entscheidung des Owners. Nur dort, wo ein einzelnes Wort breiter ist als sein Feld und die Alternative ein abgeschnittener Name wäre. `hyphens: auto` ist dafür geprüft und wirkungslos. Damit ist der zweite offene Punkt der Werkstatt erledigt. |
| 24.08.2026 | Zum ersten offenen Punkt (**Farbe eines DP-Preises**) nachgeschlagen statt erschlossen: DP trägt heute **drei** Farben, und auf dem Hub ist es bereits das Währungsgold `#d6ab6b`. Damit gibt es keine DP-Identität, die eine Umstellung bräche. Empfehlung Gold, mit den Kosten am Endscreen notiert. Entscheidung steht noch aus. |
| 24.08.2026 | **Deck-Werkstatt entworfen**, Auftrag unter `docs/werkstatt-redesign.md`. Der am weitesten gebaute der sieben Screens — Überzug, Panel-Aufteilung, schmale Spalte links, kein Blur, Haarlinie 2 px sind bereits richtig. Drei Löcher: acht von dreißig Pack-Namen abgeschnitten, elf von zwölf Freischalt-Bedingungen abgeschnitten, und der Effekte-Reiter endet 153 px vor dem Bildschirmende (226 px bei 1536 × 791). |
| 24.08.2026 | Zwei Regeln daraus in §1: **die Kachel ist der Köder, die Ansicht ist das Bild** (samt der gemessenen Gegenprobe, dass die schmale Spalte zu kürzen die Vorschau kostet und dem Katalog nichts bringt) und **ein Textfeld, das schmaler ist als sein längstes Wort, ist kein Textfeld** (mit den zwei Befunden: `hyphens: auto` wirkt nicht, und eine Farbkante darf auch nicht wiederholen, was das Element schon zeigt). |
| 24.08.2026 | Eine Regel in §5: **Bedingung und Fortschritt sind zwei Dinge** — die Kachel trägt den Zähler, der Satz steht in der dauerhaft sichtbaren Ansicht daneben. Dazu die Klarstellung, wann eine Erklärung danebenstehen darf: ohne Klick und ohne Wechsel im Bild. |
| 24.08.2026 | **Zwei offene Punkte neu in §9** — die Farbe eines DP-Preises (§2 und §3 widersprechen sich) und das weiche Trennzeichen gegen §7. Beide gehören dem Owner. |
| 24.08.2026 | Angelegt. Fundament, Kopf-Kanon, Farbrollen, Komponenten aus den Aufträgen Optionen, Melder, Mainscreen und Baum-Reiter 1–2 zusammengeführt. |
| 24.08.2026 | Farbentscheidung Upgrade-Baum: **eine** Struktur-Farbe, und die ist die Deckfarbe. Feste Fremdtöne (Cyan/Violett) für Struktur entfallen. |
| 24.08.2026 | **Zählen statt aufzählen** (§1) — das Muster hinter dem Build-Panel des Lauf-Fensters: bekannte Kategorien werden zu Zählfeldern, die Liste öffnet im selben Panel und die Felder werden zur Reiterzeile. Kein Overlay, keine dritte Ebene. Idee des Owners. |
| 24.08.2026 | Drei weitere Regeln in §1: **ein Hochformat bekommt einen hochformatigen Platz**, **Mehrhöhe geht in die Kacheln, nicht in die Fugen**, und **ein Panel, dessen Inhalt umschaltet, behält seine Maße**. Alle drei aus Fehlgriffen an demselben Panel. |
| 24.08.2026 | **Lauf-Fenster entworfen** (Teil zwei der Statistik). Gemessen an einem vollen Lauf — 7 Skills, 20 Perks, Aufstellung: 949 px gegen 720 px Bildschirm, und unter der Aufstellung ein 272-px-Loch, weil der Score-Verlauf nur zwei der drei Spuren spannt. |
| 24.08.2026 | Drei Regeln daraus, alle in §1: **Gleichhöhe wird nie erzwungen**, **Spaltenbreiten folgen dem Inhalt**, und **ein Element mit festem Seitenverhältnis wird über seine knappe Achse bemessen**. Anlass war ein eigener Fehlgriff: die erste Fassung des Vorschlags zwang drei Panels auf eine Höhe und schnitt damit den längsten ab. |
| 24.08.2026 | **Statistik entworfen**, Auftrag unter `docs/statistik-redesign.md`. Entscheidung: der **Inhalt** scrollt, nicht das Fenster — die Karte ist an jeder Größe 983 px hoch, bei 720 px Fenster liegen 263 px unter der Falz, und der `sticky`-Kopf war die Notlösung dafür. Dazu Sektionen ohne Tönung und ohne Rahmen, 33-px-Klickziele und eine Auskunftszeile in der Aktionszone. |
| 24.08.2026 | Drei Regeln daraus, alle in §1: **wenn die Anzahl schwankt** (Ziel reservieren · Ergebnis umbrechen · Offenes mit vorhandenem Inhalt füllen), **Panels schieben nie ihren Nachbarn**, und **Restluft sammelt sich am Fuß einer Spalte, nie zwischen zwei Panels**. |
| 24.08.2026 | **Bestenliste entworfen**, Auftrag unter `docs/bestenliste-redesign.md`. Der Screen hat die Maße des Baums, den richtigen Überzug und die richtige Titelgröße — er ist nur bei zwei Entscheidungen nicht mitgekommen: dem Farbanlauf der Navigationsspalte (`#up-form`) und dem Schein nach außen (`#up-ruhe`). Dazu ein Panel ohne Tönung und ohne Rahmen, ein Kopf ohne Eyebrow und Unterzeile und 22 Textglyphen. |
| 24.08.2026 | Zwei Regeln daraus: **geteilte Bauteile ziehen nach** (Intro) und **ein Screen mit zwei Einstiegen bekommt zwei Kopf-Fassungen, nicht zwei Screens** (§2). |
| 24.08.2026 | **Erststart-Bildschirm entworfen**, Auftrag unter `docs/erststart-redesign.md`. Härtester Befund: die gewählte Sprache ist nur auf der linken Seite markiert — rechts überschreibt die Trennlinie des Segmented die Zustandskante, und der Standard ist Englisch, also ist der unmarkierte Zustand der, den jeder zuerst sieht. Dazu drei Cyans im Eingabefeld, ein Titel unter Maß mit violettem Schein, eine Karte ohne Rahmen und zwei Textglyphen. |
| 24.08.2026 | Dazu eine **benannte Ausnahme in §5**: wo die Hauptaktion beim Öffnen gesperrt ist, leuchtet das Element, das die Sperre löst — beim Erststart also das Eingabefeld statt des Speichern-Knopfes. Ein Schein je Screen, nur an anderer Stelle. |
| 24.08.2026 | **Der Zwei-Farben-Verlauf der Haarlinie bleibt** (§1) — der letzte offene Punkt. Die Frage war auf Decks gemünzt, deren Farben fast gegenüberliegen; gemessen über alle 42 Paare tut das Paar je nach Deck etwas anderes: Ton-Verlauf bei 10, beides bei 9, reiner Helligkeits-Verlauf bei 23. Auf 41 von 42 Decks tut die Linie etwas. Einzige Ausnahme ist Seraph, und die bleibt. |
| 24.08.2026 | **Eyebrow-Wörter für alle acht Overlays festgelegt** (§2) — der letzte offene Punkt der Kopfzeile. Regel: der Eyebrow nennt den Bereich, der Titel den Screen; wo beide gleich heißen, nimmt der Eyebrow die kurze Hub-Form. Glossar und Leitfaden teilen sich einen. Vier verworfene Wörter sind mit notiert. Zwei Unterzeilen sind neue Copy und stehen als solche markiert. |
| 24.08.2026 | Zur Ziel-Helligkeit zwei Gegenproben, beide gemessen und beide ohne Änderung: der **Rahmen** bleibt ungemischt (Spanne nur 1,9-fach), und **ein einziger Mischwert für alles** ist verworfen — er nimmt Farbe dort weg, wo der Kontrast schon erfüllt war. Beides in §3 notiert, damit es nicht wiederkommt. |
| 24.08.2026 | **Ziel-Helligkeit der Deckfarbe entschieden** (§3), damit ist offener Punkt 3 erledigt. Gemessen über alle 42 Decks mit eigenem Akzent: der Kontrast von `a1` gegen den Zeilengrund schwankt um den Faktor 7,9, drei Decks liegen unter 4,5 : 1. Mischung auf Weiß, zwei Werte: **62 %** für Schrift (schlechtestes Deck dann 4,65 : 1), **70 %** für Flächen und Kanten (3,80 : 1). Die Tönung bleibt ungemischt. Kosten: rund vierzig Prozent der Sättigung. |
| 24.08.2026 | **Haarlinie einheitlich 2 px** (§1), offener Punkt 1 erledigt. 3 px war an die Zweitaktions-Kante vergeben, und auf einem 1200-px-Panel wird daraus ein Balken. Dazu die Strichstärken-Leiter 1 / 2 / 3 / 4 px mit je einer Bedeutung. |
| 24.08.2026 | **Reihenfolge am Fuß einer Seite festgelegt** (§1): Inhalt, Detailzeile des angetippten Elements, Abschluss-Sektion, Zeichenerklärung. |
| 24.08.2026 | **Legendär-Phase des Baums (Reiter 4).** Kein Reiter, sondern zwei Kärtchen am Fuß der Navigationsspalte. Sie tragen künftig Text und Zustand selbst; die Detailzeile im Panel entfällt für sie. Marke in Gold nur bei `buy`, gesperrt auf 42 % und aus der Tastatur-Reihenfolge, gekauft mit gezeichnetem Haken in `#54e08a`. Die Höhe hat den ersten Entwurf verworfen: mit Kaufknopf in eigener Zeile lief die Spalte 16 px aus dem Panel (gemessen). Mit dem Knopf **in** der Zeile und ohne den Platzhalter `synLeg` sind es 545 px — einen Pixel weniger als heute, bei 73 px Luft. |
| 24.08.2026 | Zwei Regeln aus Reiter 4 nachgetragen (§5): **der Zustand steht auf dem Bedienelement**, und **erklärt sich ein Element nur woanders, gehört die Erklärung an das Element.** |
| 24.08.2026 | **Fraktionsseite des Baums (Reiter 3).** Die Challenge-Karte fällt: sie zeigte bei 1280 × 720 nur ihr Deckbild, 151 px ihres Inhalts waren verborgen (238 px mit angetipptem Knoten). An ihrer Stelle eine 44-px-Zeile am Fuß mit Bedingung, Fortschritt und Verweis auf die Werkstatt, wo dieselben Daten einen eigenen Reiter haben (`CustomizeScreen.jsx:299`/`:1313`). Damit bekommen die Fähigkeiten die volle Breite: 480 → 830 px, zwei Textspuren statt einer, legendäre Kachel 114 → 202 px, Scrollen 4,5× → 2,96×. Gemessen im Produktionsbuild an 1280 × 720 und 1536 × 791, der Vorschlag als Stil-Überzug eingehängt und nachgemessen. |
| 24.08.2026 | **Die Rolle „an / gekauft" ist `#54e08a`, nicht `#5ab87a`.** Das Dokument hatte sich die Fraktionsfarbe von Pflanze geliehen; `#54e08a` ist im Code längst die Zustandsfarbe. Begründung in §3. Reiner Dokument-Fehler — der Code war richtig. |
| 24.08.2026 | Zwei Regeln nachgetragen: **jede Seite endet gleich** (abschließender Bereich als Sektion mit Trennlinie, §1) und **eine Farbkante muss etwas unterscheiden** (§1, Zeile). |
| 24.08.2026 | Panel-Tönung von 9 / 5 % auf **5 / 1 %** zurückgenommen, nach dem direkten Vergleich Optionen ↔ Upgrade-Baum im selben Deck. Dazu die Regel **kein Panel im Panel**: abgesetzte Bereiche bekommen eine Trennlinie statt eines zweiten Rahmens. |
