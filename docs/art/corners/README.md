# Ecken-Ornamente — Sammelstand

Fraktions-Ornamente für den Kopf der Skill-Wahl (ab 1400 px). Sie sollen aus den **oberen Ecken** in die
tote Fläche des Kartenkopfs laufen (~300 × 115 px je Seite) und **mit dem aktiven Reiter wechseln** — damit
sind sie Information („du bist bei Blitz"), nicht Deko.

Einbau ist NICHT gemacht: Issue #402.

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
