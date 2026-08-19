# Skill-Artworks — Sammelstand

Embleme für die Skill-Wahl auf dem Desktop (ab 1400 px). Erzeugt mit ChatGPT nach dem Stil-Anker der
Spielfelder/Kartenrücken: tiefschwarzer Grund, EIN Neonton, weißglühende Kerne, additives Leuchten.

## Ablage

Ein Bild je Skill, benannt nach der **Skill-ID** aus `src/game/skills.js` — die ID ist der Fügepunkt,
der Name dahinter nur Lesehilfe:

    docs/art/skills/<archetyp>/<SKILL_ID>_<name>.webp

Hier liegen die **Master (1024 px, WebP q92)**. Die Auslieferungsfassung (512 px) entsteht erst beim
Einbau — nicht von Hand pflegen, sonst gibt es zwei Wahrheiten.

## Warum schwarzer Grund und kein Alphakanal

Die Embleme werden mit `mix-blend-mode: screen` gezeigt: Schwarz verschwindet dabei von selbst, und das
Leuchten liegt additiv auf der Karte wie der restliche FX-Stack. Freistellen ist damit unnötig — je
dunkler der Grund im Bild, desto sauberer der Übergang.

## Farbangleich (gemessen 19.08.2026, `npm run` gibt es dafür noch nicht — Skript im Sitzungsverlauf)

Leuchtende Pixel (Luma > 28) je Master:

| Bild | Farbton | Sättigung | Fläche | Spitze (p99) | Lichtmenge |
|---|---|---|---|---|---|
| `SK_LIGHTNING_14` Überschlag | 264° | 0,82 | 5,9 % | 254 | 8,3 |
| `SK_LIGHTNING_01` Blitzableiter | 268° | 0,75 | 6,2 % | 255 | 8,8 |
| `SK_LIGHTNING_16` Dauerstrom | 268° | 0,85 | 10,0 % | 254 | 14,1 |
| `SK_LIGHTNING_15` Blitzschlag | 272° | 0,85 | 11,7 % | 253 | 16,5 |
| `SK_LIGHTNING_06` Gewitterfront | 259° | 0,77 | 22,1 % | 204 | 25,1 |
| `SK_LIGHTNING_08` Statische Aufladung | 268° | 0,76 | 24,2 % | 246 | 33,1 |
| `SK_LIGHTNING_04` Überspannung | 274° | 0,81 | 23,6 % | 255 | 33,4 |

**Der Farbton ist NICHT die Baustelle.** Alle liegen zwischen 259° und 274°, die Fraktionsfarbe
`#8a7de0` bei 248° — ein enges Feld, und die Sättigung ist mit 0,75–0,85 ebenso eng. Die Wolkenwand
*wirkt* am blauesten, ist aber die nächste an der Fraktionsfarbe. Eine `hue-rotate`-Korrektur wäre
Behandlung des falschen Symptoms.

Auseinander läuft die **Lichtmenge** (Leuchtfläche × Spitzenhelligkeit): **8,3 bis 33,4, also Faktor 4.**
Zwei Gruppen zeichnen sich ab — schlanke Motive (Überschlag, Blitzableiter) gegen flächige (Kugel,
Fontäne, Wolkenwand). Das ist es, was man in der Reihe sieht, nicht die Farbe. Angeglichen wird über die
Helligkeit und **in die Datei gebacken**, nicht per CSS-`filter`: ein Filter je Emblem kostet Rasterarbeit
auf genau dem Screen, der laut Messung ohnehin am Mount klemmt (271–417 ms in `phase:levelup`,
s. CLAUDE.md). Angeglichen wird ERST, wenn alle 21 vorliegen — der Zielwert ist der Median des Satzes,
und der wandert mit jedem neuen Bild.

**Nicht-quadratische Bilder werden schwarz aufgefüllt, nicht beschnitten** (Überschlag und Dauerstrom
kamen als 1536 × 1024). Unter `mix-blend-mode: screen` ist der schwarze Rand unsichtbar — Beschneiden
würde dagegen genau die Bogen- bzw. Bandenden kosten, die die Silhouette ausmachen.

## Stand Blitz — VOLLSTÄNDIG, 21 von 21

Alle Master liegen. Gemessen über den ganzen Satz streut die **Lichtmenge** (Leuchtfläche ×
Spitzenhelligkeit) von **5,0 bis 51,2 — Faktor 10**, Median 17,5.

**Entschieden am Bild (19.08.2026): es wird NICHT angeglichen — ausgeliefert wird „wie generiert".**
Die Messung bleibt trotzdem stehen, sie ist der Maßstab, falls der Satz später doch unruhig wirkt. Der
vorbereitete Weg wäre der folgende — er ist gebaut und im Mockup durchgespielt, aber nicht angewandt:

Angeglichen würde per Deckel, nicht per Normalisierung (dieselbe Entscheidung wie beim Schleier-Deckel
der Spielfelder, `BATTLEFIELD_VEIL`): über 24 wird heruntergezogen, darunter bleibt alles unberührt. Das
trifft genau **vier** Bilder — `L03` Flächenionisation (0,63) · `L01` Donnergott (0,81) · `04` Überspannung
(0,79) · `08` Statische Aufladung (0,78).

**Alle auf den Median zu ziehen wurde probiert und verworfen:** die vier schlanken Motive (`05` Reststrom,
`14` Überschlag, `01` Blitzableiter, `03` Kettenblitz) erreichen ihn selbst bei Faktor 1,6 nicht. Aufhellen
kann fehlende **Fläche** nicht ersetzen — es macht nur den vorhandenen Strich heller und hebt das Rauschen
im Grund mit an.

| Skill | ID | Motiv | Datei |
|---|---|---|---|
| Blitzableiter | `SK_LIGHTNING_01` | Spitze auf Fels, Einschlag von oben | ✅ |
| Ionisierung | `SK_LIGHTNING_02` | zwei Karten, Lichtbogen dazwischen | ✅ |
| Kettenblitz | `SK_LIGHTNING_03` | waagerechte Zickzack-Kette, vier Einschlagsterne | ✅ |
| Überspannung | `SK_LIGHTNING_04` | Fontäne aus dem Raster, drei Strahlen | ✅ |
| Reststrom | `SK_LIGHTNING_05` | Blitzkanal mit vier Knoten | ✅ |
| Gewitterfront | `SK_LIGHTNING_06` | Wolkenwand über Raster | ✅ |
| Ladungsserie | `SK_LIGHTNING_07` | aufziehende Spirale | ✅ |
| Statische Aufladung | `SK_LIGHTNING_08` | Plasmakugel, unten gefüllt | ✅ |
| Kurzschluss | `SK_LIGHTNING_09` | zwei Splitter, Bogen über die Lücke | ✅ |
| Entladung | `SK_LIGHTNING_10` | Blitz + Schockring auf dem Raster | ✅ |
| Blitzfänger | `SK_LIGHTNING_11` | offene Steinschale fängt den Blitz auf | ✅ |
| Breitenbeschleuniger | `SK_LIGHTNING_12` | Kartenreihe, langer Bogen von links nach rechts | ✅ |
| Spannungsstau | `SK_LIGHTNING_13` | Knoten im Steinkäfig | ✅ |
| Überschlag | `SK_LIGHTNING_14` | Bogen über eine dunkle Kante, Funkenregen rechts | ✅ |
| Blitzschlag | `SK_LIGHTNING_15` | eine stehende Karte, Einschlag mittig | ✅ |
| Dauerstrom | `SK_LIGHTNING_16` | waagerechtes Band über dem Raster | ✅ |
| Serienschutz | `SK_LIGHTNING_17` | Bogenkuppel über einem Splitter | ✅ |
| Donnergott | `SK_LIGHTNING_L01` | Wolfskopf aus Sturm, goldene Krone | ✅ |
| Doppelentladung | `SK_LIGHTNING_L02` | zwei gespiegelte Blitze, goldener Kern mittig | ✅ |
| Flächenionisation | `SK_LIGHTNING_L03` | Kartenfeld in Perspektive, vorne golden | ✅ |
| Durchschlag | `SK_LIGHTNING_L04` | Karte mit durchgeschlagenem, goldglühendem Loch | ✅ |

**Gold in den vier Legendären:** es sitzt jeweils an genau EINER Stelle (Krone · Kern · vordere Reihe ·
Lochrand) und trägt dieselbe Bedeutung wie die goldene Kartenkante — „legendär". Wer ein fünftes
Legendäres ergänzt, hält sich daran; Gold als zweite Deko über das ganze Bild verteilt nimmt der Kante
ihre Aussage.

**Verworfen und nicht wieder aufnehmen:** Reststrom als Kapsel mit vier Leuchtringen (las sich als
halbvolle Batterie und war Gerätegehäuse statt Sturm) · Ladungsserie als Kette gleich großer Kugeln
(gleichmäßig wiederholte Rundformen lesen sich als Deko, nicht als Aufbau) · Blitzfänger als
geschlossene Steinkugel mit Kern (die Schale muss OFFEN sein — geschlossen ist es dasselbe Bild wie
`13` Spannungsstau, und zwei runde Brocken im selben Angebot sind eine Verwechslung, kein Satz).

## Einbau (19.08.2026)

Ausgeliefert wird aus `src/assets/skills/<archetyp>/` — **192 px, WebP q86**, dieselben Dateinamen wie die
Master. Gerechnet: gezeigt werden sie mit **64 CSS-px**, der Desktop-Deckel ist DPR 2 → 128 px wären exakt,
192 gibt eine Stufe Reserve. Alle 21 zusammen: **121 kB** (256 px wären 196 kB gewesen).

- **Platzierung**: im Kopf der Angebotskarte, links neben Badge und Name (`.sk-em` in index.css).
- **Gate**: `const art = wide ? skillArt(id) : null` — ab 1400 px. Weil das Gate im JSX sitzt und nicht in
  CSS, lädt das Handy die Bilder gar nicht erst.
- **Zuordnung**: allein über den Dateinamen (`src/ui/skillArt.js`). Keine abgetippte Liste; ein neuer Skill
  bekommt sein Emblem dadurch, dass die Datei nach seiner ID heißt.
- **`assetsInlineLimit` in vite.config.js**: Skill-Embleme werden NIE als data-URI ins JS gezogen. Vites
  Standardgrenze sind 4 kB, und fünf der 21 lagen darunter — sie landeten im Entry-Chunk und wären damit
  auf jedem Handy mitgeladen worden. Das hätte das Gate zur Hälfte ausgehebelt, unsichtbar.
- Wächter: `test/skill-art.test.js` (11 Prüfungen). Gegenprobe gemacht: Gate entfernt, screen-Blending
  entfernt, Inline-Grenze entfernt, Datei ohne Skill — alle vier fallen.

## Die eine Regel beim Erzeugen

Bei 21 Bildern derselben Fraktion entscheidet die **Silhouette bei 64 px**, nicht das Motiv. Belegt sind
bereits: Nadel (01) · Doppelrechteck (02) · Zickzack-Kette (03) · Fontäne (04) · Kanal (05) ·
Wolkenmasse (06) · Spirale (07) · Kreis (08) · Hantel (09) · Trichter mit Ring (10) ·
Kartenreihe mit Bogen (12) · Stachelkugel (13) · Bogen über Kante (14) · einzelne Karte (15) ·
waagerechtes Band (16) · offene Schale (11) · Kuppel (17) · Kopf mit Krone (L01) · gespiegeltes V (L02) ·
Fläche in Perspektive (L03) · Karte mit Loch (L04). Für Blitz ist der Satz damit voll; wer eine der Formen
in Feuer, Eis oder Pflanze wiederverwendet, muss sie über die FRAKTIONSFARBE trennen, nicht über Details.
Jedes weitere Bild braucht eine Form, die dagegen steht — mehr Detail hilft nie, eine andere Grundform immer. Zweite Regel aus der Perlen-Panne: **nie aus gleichmäßig wiederholten,
gleich großen Rundformen bauen**; Wiederholung muss in Größe, Abstand oder Richtung variieren.

**Die eine Kollision, die zu beobachten ist:** `08` (Kugel) und `13` (Stachelkugel) sind beide rund. Sie
trennt heute nur der Splitterkranz — wenn eine der beiden im Angebot neben der anderen steht und man
stutzt, ist `13` die, die eckiger werden muss.
