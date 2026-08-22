# Perk-Kategorie-Embleme — Sammelstand

Ein Emblem je **Perk-Kategorie** (`CATEGORIES` in `src/game/perks.js`), nicht je Perk und nicht je Familie —
das wären 130 Bilder. Sie sollen wie die Skill-Embleme als **Kopfstreifen** auf der Angebotskachel liegen.

**Einbau ist gemacht (icons-perks, 22.08.2026, Issue #402).** Der Abschnitt „Zone und Auslieferung" ganz
unten hält den Stand fest; alles dazwischen ist der Sammelstand, wie er war, und wurde nicht angefasst.

## Die sieben Kategorien

| | Name | Bedeutung | Farbe | Familien | Perks | Motiv | Silhouette |
|---|---|---|---|---|---|---|---|
| A | Deck | Dauerhafte Kartenwerte | `#8a7de0` | 11 | 3 | Kartenstapel von der Seite, jede Kante glüht | liegender Block ✅ |
| B | Stich | Stich-Effekte | `#e0605a` | 11 | 3 | zwei blanke Karten, dazwischen die weißglühende Naht | gespiegeltes Paar ✅ |
| C | Rolle | Kartenrollen | `#5ab87a` | 12 | 3 | drei Karten im Fächer, je ANDERS beleuchtet (Umriss · Ecken · eine Kante) | Fächer ✅ |
| D | Score | Score | `#d4a63a` | 20 | 5 | steigende Stufenfolge aus Lichtbalken | Treppe ✅ |
| E | Form | Formationswerkzeuge | `#5a8ade` | 14 | 7 | Winkel und Lineal über Kartenfeldern | gekreuztes Werkzeug ✅ |
| P | Präzision | Crit-Chance & -Multiplikator | `#e08a3a` | 5 | 0 | Fadenkreuz über einer Karte | Kreis mit Kreuz ✅ |
| S | Ausbau | Slots & Ökonomie | `#5ec8c0` | 0 | 1 | Gerüst mit leerem, hell umrissenem Fach | offener Rahmen ✅ |

## Die Farbe trägt hier NICHT — die Silhouette muss es

Vier der sieben Farben bedeuten im Spiel längst etwas anderes:

- **A Deck `#8a7de0`** ist exakt die Blitz-Fraktionsfarbe.
- **C Rolle `#5ab87a`** ist exakt die Pflanzen-Farbe.
- **E Form `#5a8ade`** liegt dicht an Eis `#5ec8f0`.
- **D Score `#d4a63a`** ist das Gold, das „legendär" heißt (Kartenkante, Badges).
- **B Stich `#e0605a`**, **P Präzision `#e08a3a`** und Feuer `#e0714a` liegen in einem engen warmen Feld.

Bei den Skills konnte die Farbe die Fraktion tragen — es waren vier gut getrennte. Hier muss die FORM die
Arbeit machen, und sie muss zusätzlich gegen die 21 vergebenen Blitz-Silhouetten stehen.

## Zwei Verbote, beide aus einem Fehlversuch

**Die Karten tragen KEINE Zeichen.** `SUITS` in `constants.js` sind vier FARBEN (Rot · Blau · Grün · Gelb)
plus ein Wert 1–10 — Pik, Herz, Kreuz, Karo gibt es im ganzen Spiel nicht. Der erste Stich-Versuch kam mit
Pik und Herz zurück. In den Prompt gehört: *„a card is a blank dark rectangle whose identity comes from its
glowing outline alone."*

**Keine erfundene Ikonografie.** Der erste Rollen-Versuch malte Schild, Fadenkreuz und Funkel auf die drei
Karten — Symbole, die es im Spiel nirgends gibt (das Fadenkreuz ist obendrein das Motiv der Kategorie P).
Die Rollen des Spiels (Vorhut, Leibwache, Anführer, Staffelläufer, Finisher, Eckpfeiler, Joker, Bindeglied)
werden im Spiel über **Rahmen und Kanten** markiert, nicht über Zeichen. Genau das benutzt das Motiv jetzt:
drei Karten, die sich nur darin unterscheiden, WIE sie leuchten (voller Umriss · nur die Ecken · nur eine
Kante). Bedeutung durch Licht und Anordnung, nie durch ein Symbol.

**Und damit ist die Farbfrage endgültig entschieden:** die vier Kartenfarben sind `#e0605a` · `#5a8ade` ·
`#5ab87a` · `#d4a63a` — identisch mit den Kategoriefarben von Stich, Form, Rolle und Score. Vier der sieben
Kategorien tragen also die Farbe einer KARTENFARBE. Farbe kann in diesem Satz gar nichts identifizieren.

## Sprache: Zustand statt Ereignis

Skills sind Ereignisse (ein Einschlag, ein Ausbruch, ein Moment). Perks sind **Zustände**: Gegenstände in
Ruhe, von innen beleuchtet. Kein Einschlag, keine Funken, keine Entladung. Die Bauart bleibt gleich (drei
Helligkeitsbänder, schwarzer Grund, quadratisch, `mix-blend-mode: screen`).

## Messung

| Emblem | > 10 | > 40 | > 90 | > 180 | Streuung | Farbton |
|---|---|---|---|---|---|---|
| Blitz-Skill (Referenz des anderen Satzes) | 10,9 % | 4,5 % | 2,0 % | 0,60 % | 1,98 | 259° |
| **A Deck** | 23,5 % | 10,3 % | 1,6 % | 0,44 % | 1,95 | 261° |
| **B Stich** | 23,2 % | 5,7 % | 2,0 % | 0,38 % | 1,99 | 2° |
| **C Rolle** | 31,4 % | 7,6 % | 3,6 % | 1,56 % | 1,81 | 132° |
| **D Score** | 22,3 % | 8,7 % | 3,1 % | 0,96 % | 2,26 | 33° |
| **E Form** | 30,4 % | 5,7 % | 1,4 % | 0,25 % | 1,50 | 219° |
| **P Präzision** | 20,4 % | 5,5 % | 1,7 % | 0,49 % | 1,90 | 21° |
| **S Ausbau** | 33,7 % | 8,3 % | 2,4 % | 0,46 % | 1,49 | 177° |

## Helligkeits-Angleich — gerechnet über alle sieben

Zielwert ist der **Median: 23,5 %** Leuchtfläche. Die Faktoren sind numerisch gesucht (die Helligkeit wird
je Bild verstellt, bis die gemessene Fläche den Median trifft), nicht geschätzt:

| Emblem | roh | Faktor | danach |
|---|---|---|---|
| P Präzision | 20,4 % | **1,33** | 23,2 % |
| D Score | 22,4 % | **1,22** | 23,6 % |
| B Stich | 23,2 % | **1,05** | 23,5 % |
| A Deck | 23,5 % | **1,02** | 23,5 % |
| E Form | 30,8 % | **0,73** | 23,7 % |
| C Rolle | 32,3 % | **0,78** | 23,4 % |
| S Ausbau | 34,3 % | **0,72** | 23,1 % |

Spreizung vorher 1,7-fach, danach liegen alle zwischen 23,1 und 23,7 %.

**Zwei Muster stecken darin.** P und D werden AUFGEHELLT statt gedämpft — Fadenkreuz und Treppe sind
linienbetont und tragen von Haus aus wenig Licht. Und die drei „gebauten" Motive (Rolle, Form, Ausbau)
landen alle bei ~0,75, weil sie große beleuchtete Flächen haben. Das ist der Unterschied zwischen **Linie
und Fläche**, dieselbe Beobachtung wie Deck gegen Stich.

**D Score** hat mit 2,26 die höchste Streuung des Satzes — die Treppe gibt jeder Stufe einen eigenen
Helligkeitswert. Ihr Farbton liegt bei 33° statt der 43° der Kategoriefarbe, also oranger; das ist ein
Vorteil, weil es sich vom **Legendär-Gold** entfernt, mit dem Score sonst verwechselbar wäre.

**E Form** ist der zweite Angleich-Fall, aber aus anderem Grund als C: nicht ein zu heller Umriss, sondern
die großflächig angeleuchtete Steinplatte. Das zeigt die Streuung von 1,50 — dem niedrigsten Wert des
Satzes: das Licht verteilt sich gleichmäßig, statt zu rhythmisieren. Wirkt die Platte im Kleinen flach,
wäre der Griff „dunklerer Stein", nicht „weniger Werkzeug".

Der Unterschied im mittleren Band (5,7 gegen 10,3 %) ist kein Mangel, sondern der Motivunterschied: Deck
leuchtet **flächig** (die große Deckfläche des obersten Blattes), Stich **linear** (Naht und Kanten). Genau
deshalb werden mehrere Schwellen gemessen und nicht nur eine.

**Der Perk-Satz muss zu SICH SELBST passen, nicht zu den Skills** — Perk- und Skill-Kacheln erscheinen nie
auf demselben Bildschirm. Deck trägt doppelt so viel Licht wie ein Blitz-Emblem (das Licht ist hier flächig
statt linear: die große Deckfläche des obersten Blattes), und das ist in Ordnung. **23,5 % ist damit der
Referenzwert für die sechs anderen.**

Weicht später eine Kategorie stark ab, wird sie beim Backen angeglichen (`scripts/skill-art-build.py`) —
eine Zahl in einer Tabelle statt eines neuen Bildversuchs. **C Rolle ist der erste Fall**: ein durchgehend
heller Kartenumriss ist schlicht mehr Licht als eine Naht oder ein paar Kartenkanten (31,4 % Fläche, 1,56 %
fast weiß gegen 0,4 % bei A und B). Faktor nach Messung rund **0,85** — endgültig gerechnet wird über alle
sieben, sobald der Satz steht, denn der Zielwert ist der Median und der wandert noch.

## Die warmen drei trennt nur die Form

**B Stich (2°) · P Präzision (21°) · D Score (33°)** liegen in einem engen warmen Feld — bei 277 px
Kachelbreite ist das kein Farbunterschied mehr. Unterschieden werden sie ausschließlich über die
Grundform: **gespiegeltes Paar · Kreis mit Kreuz · Treppe**. Wer eines davon überarbeitet, darf die
Grundform nicht antasten.

Bei **P** ist der Ring mit rund 60 % der Bildbreite so groß, dass die Karte dahinter im Kleinen fast
verschwindet — der Bezug „auf eine Karte gezielt" geht verloren, die Silhouette bleibt aber eindeutig, weil
P der einzige Kreis des Satzes ist. Bewusst so belassen.

## Komposition

Der Kopfstreifen zeigt die **oberen 76 %** des quadratischen Bildes (Zone 210 px auf 277 px Kachelbreite,
`object-fit: cover`, `object-position: center top`). Bei Deck liegen 100 % des Lichts in diesem Fenster —
die Unterkante des Stapels sitzt aber knapp an der Grenze. Für die restlichen sechs gilt: **Motiv in die
oberen zwei Drittel, unteres Drittel fast schwarz.**

> Nachtrag icons-perks, 22.08.2026: Die 76 % gelten unverändert, die zwei Pixelmaße daneben waren
> geschätzt. GEMESSEN wird das Bild **265 px** breit gezeichnet (Kachel 270 minus 4 px Raritätskante
> und 1 px Gegenkante), die Zone daraus **201 px** hoch (0,76 × 265).
> Die Regel „Motiv in die oberen zwei Drittel" ist damit bestätigt: der Lichtschwerpunkt der sieben liegt
> im Median bei 0,42 der Bildhöhe, und 97,5–100 % ihres Lichts liegen im Fenster.

## Zone und Auslieferung

*Nachtrag der Aufgabe `icons-perks`, 22.08.2026. Auf Deutsch, weil dieses Dokument einer festen deutschen
Vorlage folgt und ein englischer Eintrag mittendrin sie bräche (`AGENTS.md` — Sprachregel, Ausnahme für
Anhänge an Bestandsdokumente). Neues Material sonst: Englisch.*

| | |
| --- | --- |
| Master | 7 × 1024 × 1024 WebP, hier im Ordner, unverändert |
| Auslieferung | 7 × 384 × 384 WebP, `src/assets/perkcats/`, 42 kB |
| Gebacken mit | `python3 scripts/skill-art-build.py bake --lot perkcats` |
| Gezeigt als | Kopfstreifen der Perk-Angebotskachel, `.pk-strip` in `src/index.css`, nur ab 1400 px |
| Zone | **265 × 201 CSS-px** |

**Die Zone ist gemessen, nicht angenommen.** Der Bloom steckt in der Datei, und sein Radius ist eine
CSS-Länge geteilt durch die Zonenbreite — eine geborgte Breite ergäbe einen Radius, der maßgeblich und
falsch ist. Genau deshalb hat `scripts/skill-art-build.py` dieses Los bis hierher verweigert. Ausgelesen
wurde die Breite in der laufenden Anwendung
(`docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs`), und sie ist an jedem Desktop-Format
gleich, an dem die Bilder überhaupt erscheinen: **265 px** bei 1600 × 900, 1920 × 1080 und 2560 × 1440.
Die KACHEL ist 270 — die Overlay-Karte ist auf 880 px gedeckelt, das Dreier-Raster damit 830 px breit,
eine Spalte (830 − 2 × 10)/3. Das BILD darin ist 5 px schmäler, weil `left: 0; right: 0` gegen die
Polsterbox auflöst und `.as-edge-card` links 4 px Raritätskante plus 1 px an den übrigen Seiten trägt.
Geteilt wird durch die Breite, in der das Emblem GEZEICHNET wird, nicht durch die Box drumherum.

Drei Nachbarzahlen sind Fallen, keine Abkürzungen: `STRIP_W = 277`, gegen das die Skill-Lose gebacken
sind und das nie an irgendetwas gemessen wurde; 270,66, die gemessene SKILL-Karte (`ICONS-VIS-01` in
der Sichtprüfung des Asset-Audits); und 270, die Perk-Kachel — am richtigen Bildschirm gemessen, aber
an der falschen Box.

**Die sieben Faktoren oben sind unverändert übernommen worden**, nicht neu hergeleitet — sie stehen als
`PERKCAT_LIGHT` im Backskript. Das ist eine Vorgabe des Aufgaben-Kontrakts und hat einen Grund: der
Zielwert ist ein Median, und ein Median wandert. `align --lot perkcats` rechnet inzwischen mit einer
anderen Statistik (Gesamtlicht statt Leuchtfläche, s. `docs/art/legendaries/README.md`) und meldet
deshalb eine Abweichung, statt eine Änderung vorzuschlagen — am deutlichsten bei **E Form**, wo der Löser
1,06 sagt und ausgeliefert 0,73 wird. Beide Zahlen sind für sich richtig; sie messen Verschiedenes. Die
ausgelieferte ist die, die schon einmal angesehen wurde.

**Das Legendär-Los wird getrennt angeglichen** und hängt zusätzlich mittig statt oben (`.pk-strip-mid`),
weil seine 21 Motive nachweislich nicht nach der Regel dieses Dokuments komponiert sind —
Lichtschwerpunkt im Median 0,48 gegen 0,42 hier. Begründung und Messung in
`docs/art/legendaries/README.md`. Für dieses Los ändert sich dadurch nichts.
