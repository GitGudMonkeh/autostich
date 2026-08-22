# Ecken-Ornamente — Sammelstand

Fraktions-Ornamente für den Kopf der Skill-Wahl (ab 1400 px). Sie sollen aus den **oberen Ecken** in die
tote Fläche des Kartenkopfs laufen (~300 × 115 px je Seite) und **mit dem aktiven Reiter wechseln** — damit
sind sie Information („du bist bei Blitz"), nicht Deko.

Einbau ist GEMACHT (icons-corners, 22.08.2026) — Issue #402 damit erledigt. Zone, Auslieferung
und die beiden Einbaustellen stehen unten unter „Einbau".

## Ablage

    docs/art/corners/corner_<archetyp>.webp     (Master, 1536 × 1024)

Ein Bild je Fraktion, im Einbau **zweimal benutzt** — rechts gespiegelt (`transform: scaleX(-1)`). Vier
Dateien statt acht, und für einen Kopf ist Symmetrie richtig. Der Grund ist schwarz, gezeigt wird mit
`mix-blend-mode: screen` (wie die Skill-Embleme).

## Messung (19.08.2026)

Leuchtfläche = Anteil der Pixel über Luma 10. Streuung = Schwankung zwischen benachbarten Bildbereichen —
hoch heißt Rhythmus, niedrig heißt gleichförmiger Teppich.

| Fraktion | Leuchtfläche | > 40 | > 90 | > 180 | Streuung | Farbton |
|---|---|---|---|---|---|---|
| Blitz | 10,9 % | 4,5 % | 2,0 % | 0,60 % | 1,98 | 259° |
| Feuer | 12,0 % | 3,9 % | 1,6 % | 0,40 % | 1,88 | 14° |
| Eis | 13,0 % | 6,7 % | 2,5 % | 0,45 % | 1,68 | 206° |
| Pflanze | 18,6 % | 8,2 % | 3,3 % | 0,89 % | 1,44 | 131° |
| **Perk** (Filigran) | 7,7 % | 2,8 % | 0,8 % | 0,04 % | 1,99 | 359° |

**Deckkraft je Fraktion** (damit alle vier dieselbe wahrgenommene Lichtmenge tragen — dieselbe Logik wie der
Schleier-Deckel der Spielfelder, `BATTLEFIELD_VEIL`):

**Blitz 11,0 % · Feuer 10,0 % · Eis 9,2 % · Pflanze 6,4 % · Perk 15,6 %**

Pflanze ist der einzige Ausreißer und bleibt es bewusst: Ranken SIND dicht. Statt das Bild zu verbiegen,
regelt die Tabelle die Anzeige.

## Die Perk-Ecke ist bewusst anders gebaut

Die Perk-Wahl hat **eine** Identitätsfarbe (`PHASE_ACCENTS.red`, `#e05555`), also ein Bild statt vier. Und
das Motiv ist **gemacht statt gewachsen**: Filigran-Ecke wie auf den Kartenrücken, geometrisch und
symmetrisch — die vier Fraktions-Ecken sind Naturgewalten, diese hier sind die Karten selbst.

Sie ist mit 7,7 % die dünnste des Satzes (Filigran ist Linie, keine Fläche) und trägt deshalb die höchste
Deckkraft. Zwei Punkte für den Einbau, beide Regler-Fragen:

- **Ihre Randlinien laufen auf der Bildkante.** Im Spiel sitzt sie in einer Karte, die schon einen 1-px-
  Akzentrahmen und die farbige Haarlinie trägt — daraus können drei parallele rote Linien werden. Ausweg:
  das Bild leicht nach innen versetzen, nicht neu erzeugen.
- **Ihr Auslauf ist abrupter** als bei den organischen vier: Linien enden, statt zu zerfasern. Die Maske
  muss dort mehr Arbeit leisten, der Verlauf also früher beginnen.

## Messfalle: Farbton ist eine RICHTUNG, kein Wert

Der erste Messlauf meldete für die rote Ecke **236°** — Blauviolett. Ursache: bei Rot liegen die Pixel
beidseits der 0-Grad-Marke, und das arithmetische Mittel aus 358° und 2° ist 180°. Der Farbton braucht ein
KREISMITTEL (Vektorsumme über Sinus/Kosinus); damit sind es korrekt **359°**. Bei den vier anderen fiel es
nicht auf, weil ihre Farbtöne alle weit weg von der Naht liegen.

## Was beim Erzeugen entschieden wurde

Drei Fehlversuche, alle mit derselben Lehre — **die Helligkeits-HIERARCHIE macht das Bild, nicht die Form**:

1. „Wurzeln": feine Verästelung, aber nur ein Helligkeitsband (Fläche über 40 = 0,1 %) → wirkte tot, und das
   Motiv war identisch mit dem, was Pflanze bekommen sollte.
2. „Handgezeichnet": Winkel richtig, aber gleiche Strichstärke und gleiche Helligkeit überall (über die
   Hälfte des Lichts in EINEM Band, nichts über 90) → liest sich als Diagramm.
3. Eis, erste Runde: 25,2 % Leuchtfläche bei Streuung 1,26 → gleichmäßiger Teppich. Ursache war der Prompt
   selbst („every side branch at the SAME fixed angle, again and again") — eine Bestellung von
   Gleichförmigkeit. Der Winkel darf konstant bleiben, aber Länge, Abstand und Dicke müssen schwanken.

Was funktioniert hat: **drei Bänder** — wenige fast weiße Kernpixel, ein mittleres Band auf den Hauptkanälen,
eine große sehr schwache Fläche aus Kapillaren und Korona. Jede Stufe etwa halb so groß wie die darunter.

**Ins Bild gehört normale Helligkeit, nicht vorgedimmte.** Der erste Versuch war schon auf 10 % heruntergemalt
(hellstes Pixel 57 von 255) — auf 10 % Deckkraft gelegt wäre er unsichtbar gewesen. Die Oberfläche dimmt.


## Einbau (icons-corners, 22.08.2026) — Issue #402 erledigt

*Nachtrag an ein deutsches Dokument mit festem Aufbau; er bleibt deshalb deutsch (AGENTS.md,
„Appending to an existing German document"). Die Arbeitsstrom-Dokumente der Aufgabe sind englisch.*

### Zone: 300 × 115 px, eine für beide Bildschirme

Gemessen in der laufenden Anwendung, nicht aus dem Stylesheet gelesen — die Sonde und ihre Ausgabe
liegen bei:

    docs/workstreams/desktop-icons/icons-corners/corner-zone-probe.mjs
    docs/workstreams/desktop-icons/icons-corners/visual/V1-measurements.json

| | Skill-Wahl | Perk-Wahl |
|---|---|---|
| Overlay-Karte | 880 px (Polsterbox 878) | 880 px (Polsterbox 878) |
| Kopfpolster | 16 px | 24 px |
| Kopfband bis zur Aktionsleiste | **77 px** | **115 px** |

Bei 1600 × 900, 1920 × 1080 und 2560 × 1440 identisch; bei 1280 × 720 liegt die Karte bei 768 px und
unter dem 1400-px-Tor — dort wird gar kein Ornament gerendert.

**Die BREITE ist der Backwert** (`strip_w=300` in `scripts/skill-art-build.py`), denn durch sie wird der
Bloom-Radius geteilt. Anders als bei den Emblem-Streifen ist sie *erklärt* statt *ausgerechnet*: ein
Streifen mit `left:0; right:0` ist so breit, wie die Kachel es zulässt, ein Eckornament bekommt seine
Breite. Gewählt wurde sie trotzdem gegen eine gemessene Hülle: breitester Kopftext 244 px, mittig, es
bleiben ~317 px je Seite (Perk) bzw. ~324 px (Skill). Das Licht der Master läuft bei ~213 px aus.

**Die HÖHE ist bewusst KEINE Kopfhöhe.** Der Kopf wächst mit Runden-Score und Bonushinweis, die
Aktionsleiste rutscht mit. Deshalb eine feste Zone von 115 px, und die Maske ist bei 62 % = 71 px
fertig — also vor dem schmalsten je gemessenen Kopf (77 px). So entsteht keine Kante, egal wie hoch
der Kopf gerade steht. `test/corner-art.test.js` rechnet genau diese Ungleichung nach.

### Auslieferung: `src/assets/corners/`, 600 × 400

Fünf Dateien, 80 kB zusammen — eine je Master. **600 ist hergeleitet, nicht geerbt**: 300 CSS-px × Desktop-DPR-Deckel 2
(`DPR_CAP_DESKTOP`, `src/ui/fx/mobileTier.js`) — die Skill-Lose liefern 384 auf eine 265er Zone, was
`icons-perks` selbst als geschätzt und nicht gemessen vermerkt hat (dessen offene Frage Q-D). Lange
Kante 600, kurze aus dem 3:2 der Master abgeleitet, nie quadratisch gequetscht.

### Die Deckkraft-Tabelle bleibt eine ANZEIGE-Größe

*(Die Zahlen hier sind die BALANCE der Lose zueinander. Der gemeinsame Pegel darüber wurde am
Sicht-Gate auf 3× gesetzt — s. „Am Sicht-Gate entschieden" unten. Die Verhältnisse ändert das nicht.)*

Sie steht als `CORNER_OPACITY` in `src/ui/cornerArt.js` und ist **nicht** in die Pixel gebacken — das
Los backt mit Licht 1,0. Beides zusammen hieße doppelt korrigiert und rund ein Hundertstel der
gewollten Helligkeit; `test/corner-art.test.js` hält die zwei Wege auseinander.

**Nachgemessen, wie gezeigt** (Differenz V2 − V1 über die echten 300 × 115 der Zone, 1920 × 1080):

| Los | Deckkraft | Mittleres Zusatzlicht | Spitze (p99) | Fläche > 2 |
|---|---|---|---|---|
| Blitz | 11,0 % | 0,737 | 13,43 | 10,34 % |
| Feuer | 10,0 % | 0,579 | 9,20 | 8,68 % |
| Eis | 9,2 % | 0,734 | 10,52 | 11,89 % |
| Pflanze | 6,4 % | 0,655 | 7,79 | 12,79 % |
| Perk | 15,6 % | 0,593 | 9,19 | 9,11 % |

**Streuung 1,27-fach** — die Tabelle hält, was sie versprochen hat, und zwar ohne einen eigenen
Angleich-Lauf. Was zwischen den Losen wirklich verschieden ist, ist nicht die Lichtmenge, sondern ihre
VERTEILUNG: Pflanze trägt die größte Fläche bei der niedrigsten Spitze (weicher Teppich), Blitz die
höchste Spitze bei mittlerer Fläche (Linien). Wer die Ecken „ungleich hell" findet, meint diesen
Unterschied, nicht die Deckkraft.

### Die beiden Einbaustellen

`src/ui/CardCorners.jsx` — eine Komponente, beide Bildschirme, je zwei Ornamente, das rechte über
`transform: scaleX(-1)` gespiegelt und an die rechte Kante verankert. Regeln in `src/index.css`
(`.co-corner`), Gate im JSX wie bei den Emblemen, damit unter 1400 px kein `<img>` im DOM steht.

- **Skill-Wahl**: das Ornament folgt dem AKTIVEN REITER (`curG.arch`), nicht dem Kartenakzent.
- **Perk-Wahl**: eine Ecke, weil es eine Identitätsfarbe gibt. Beide Sonderwünsche aus dem Abschnitt
  „Die Perk-Ecke ist bewusst anders gebaut" sind umgesetzt — 6 px nach innen versetzt (gegen die drei
  parallelen roten Linien aus Akzentrahmen, Haarlinie und Bildkante) und die Maske setzt früher ein
  (6 % statt 18 %, fertig bei 55 % statt 62 %).

- **Legendär-Phase**: dieselbe Bindung wie die Skill-Wahl — die Ecke folgt dem aktiven Reiter. Sie kam
  am Sicht-Gate dazu und war vorher kein Ziel dieser Aufgabe; s. unten.


## Am Sicht-Gate entschieden (V3, 22.08.2026)

Zwei Änderungen aus dem Sicht-Gate, beide Eigentümer-Entscheidungen, keine technischen.

### 1. Pegel 3×

Befund in Runde 1: „gut platziert, aber zu transparent, man kann sie kaum erkennen." Beurteilt an
einer Vier-Stufen-Tafel bei identischem Spielzustand
(`docs/workstreams/desktop-icons/icons-corners/visual/V3-gain-options.png`). 4× wurde in derselben
Runde verworfen: die Filigran-Ecke liest sich dort als Rahmen statt als Ecke.

Umgesetzt als EIN Regler (`CORNER_GAIN` in `src/ui/cornerArt.js`), nicht als fünf geänderte Zahlen.
Das trennt zwei Dinge, die nicht zusammengehören:

- die **Balance** zwischen den Losen — gemessen, oben in dieser README, nicht anzufassen;
- den **Pegel** des Ganzen — eine Gestaltungsfrage, die dem Eigentümer gehört.

`test/corner-art.test.js` prüft deshalb die VERHÄLTNISSE, nicht die absoluten Werte: der Pegel darf
wandern, ein still geänderter Einzelwert fällt auf. Der entschiedene Pegel selbst ist zusätzlich
festgeschrieben — sonst könnte er unbemerkt auf 1 zurückfallen, und genau diesen Zustand hat das Gate
abgelehnt. Diese Lücke hat der Gegen-Check gefunden, nicht die Planung.

### 2. Die Legendär-Phase bekommt eine Ecke — die ihres Reiters

Auf Wunsch des Eigentümers am Gate. Sie war vorher ausdrücklich KEIN Ziel dieser Aufgabe: der Contract
begrenzte die Ornamente auf die zwei Auswahl-Bildschirme. Die Erweiterung ist damit eine bewusste
Scope-Änderung und keine stille.

**Gebaut und wieder verworfen: eine goldene Phasen-Ecke.** Der erste Anlauf gab der Legendär-Phase
eine eigene Identitäts-Ecke — das Perk-Filigran, beim Backen auf `#d4a63a` umgefärbt. Technisch
sauber (ein Motiv, ein Master, kein Laufzeit-Filter, Deckkraft auf 11,4 % hergeleitet, weil Gold das
1,369-fache Licht des Rots trägt), am Gate aber verworfen: die Legendär-Wahl spricht die Sprache der
SKILL-Wahl — dieselbe Reiterzeile, dieselben Skill-Embleme auf den Karten — und eine eigene Ecke im
Kopf hätte eine zweite Aussage dazugesetzt, die der Bildschirm nicht braucht. Das Legendäre steht im
Titel und im Gold-Rahmen der Karte.

**Ausgeliefert wird die FRAKTIONS-Ecke des aktiven Reiters**, wortgleich zur Skill-Wahl: Blitze bei
Blitz, Ranken bei Pflanze. Die Schale dort wechselt ohnehin schon mit dem Reiter.

Mit der Entscheidung ist die Umfärb-Mechanik wieder aus dem Backskript verschwunden — sie hätte keinen
Aufrufer mehr gehabt, und eine Fähigkeit ohne Aufrufer ist ein Versprechen, das niemand prüft.
Vergleichsbild beider Varianten:
`docs/workstreams/desktop-icons/icons-corners/visual/Q9-legendaer-varianten.png`.

### Nachgemessen bei ausgeliefertem Pegel

Differenz gegen die Grundlinie über die echten 300 × 115 der Zone, 1920 × 1080:

| Los | Balance | × 3 = Deckkraft | Mittleres Zusatzlicht | Spitze (p99) | Fläche > 2 |
|---|---|---|---|---|---|
| Blitz | 11,0 % | 33,0 % | 2,269 | 40,00 | 18,89 % |
| Feuer | 10,0 % | 30,0 % | 1,751 | 27,51 | 16,74 % |
| Eis | 9,2 % | 27,6 % | 2,241 | 31,39 | 19,57 % |
| Pflanze | 6,4 % | 19,2 % | 1,998 | 23,88 | 22,90 % |
| Perk | 15,6 % | 46,8 % | 1,775 | 27,92 | 16,44 % |

**Streuung 1,30-fach** (bei Pegel 1 waren es 1,27). Der Pegelwechsel hat die Balance also nicht
verschoben — genau dafür ist der eine Regler da.

Die Legendär-Phase hat keine eigene Zeile, weil sie kein eigenes Los hat: sie zeigt die
Fraktions-Ecken und ist durch deren Zeilen abgedeckt.
