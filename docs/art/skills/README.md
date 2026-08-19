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

| Bild | Farbton | Sättigung | Fläche | Spitze (p99) |
|---|---|---|---|---|
| `SK_LIGHTNING_01` Blitzableiter | 268° | 0,63 | 6 % | 195 |
| `SK_LIGHTNING_08` Statische Aufladung | 268° | 0,59 | 24 % | 214 |
| `SK_LIGHTNING_06` Gewitterfront | 259° | 0,79 | 22 % | 150 |

**Der Farbton ist NICHT die Baustelle.** Alle liegen zwischen 259° und 268°, die Fraktionsfarbe
`#8a7de0` bei 248° — ein enges Feld. Die Wolkenwand *wirkt* am blauesten, ist aber die nächste an der
Fraktionsfarbe; das macht ihre Sättigung (0,79), nicht ihr Ton. Eine `hue-rotate`-Korrektur wäre also
Behandlung des falschen Symptoms.

Auseinander läuft die **Lichtmenge** (Fläche × Helligkeit): 6,5 · 27 · 13,6. Die Kugel wiegt viermal so
schwer wie die Spitze — das ist es, was man in der Reihe sieht. Angeglichen wird deshalb über die
Helligkeit, und zwar **in die Datei gebacken**, nicht per CSS-`filter`: ein Filter je Emblem kostet
Rasterarbeit auf genau dem Screen, der laut Messung ohnehin am Mount klemmt (271–417 ms in
`phase:levelup`, s. CLAUDE.md).

## Stand Blitz (11 von 21 zugeordnet)

| Skill | ID | Motiv | Datei |
|---|---|---|---|
| Blitzableiter | `SK_LIGHTNING_01` | Spitze auf Fels, Einschlag von oben | ✅ |
| Ionisierung | `SK_LIGHTNING_02` | zwei Karten, Lichtbogen dazwischen | offen (Upload) |
| Kettenblitz | `SK_LIGHTNING_03` | waagerechte Zickzack-Kette, vier Einschlagsterne | offen (Upload) |
| Reststrom | `SK_LIGHTNING_05` | Blitzkanal mit vier Knoten | offen (Upload) |
| Gewitterfront | `SK_LIGHTNING_06` | Wolkenwand über Raster | ✅ |
| Ladungsserie | `SK_LIGHTNING_07` | aufziehende Spirale | offen (Upload) |
| Statische Aufladung | `SK_LIGHTNING_08` | Plasmakugel, unten gefüllt | ✅ |
| Kurzschluss | `SK_LIGHTNING_09` | zwei Splitter, Bogen über die Lücke | offen (Upload) |
| Entladung | `SK_LIGHTNING_10` | Blitz + Schockring auf dem Raster | offen (Upload) |
| Breitenbeschleuniger | `SK_LIGHTNING_12` | Kartenreihe, langer Bogen von links nach rechts | offen (Upload) |
| Spannungsstau | `SK_LIGHTNING_13` | Knoten im Steinkäfig | offen (Upload) |

Es fehlen: `04` Überspannung · `11` Blitzfänger · `14` Überschlag · `15` Blitzschlag · `16` Dauerstrom ·
`17` Serienschutz · `L01` Donnergott · `L02` Doppelentladung · `L03` Flächenionisation · `L04` Durchschlag.

**Verworfen und nicht wieder aufnehmen:** Reststrom als Kapsel mit vier Leuchtringen (las sich als
halbvolle Batterie und war Gerätegehäuse statt Sturm) · Ladungsserie als Kette gleich großer Kugeln
(gleichmäßig wiederholte Rundformen lesen sich als Deko, nicht als Aufbau).

## Die eine Regel beim Erzeugen

Bei 21 Bildern derselben Fraktion entscheidet die **Silhouette bei 64 px**, nicht das Motiv. Belegt sind
bereits: Nadel (01) · Doppelrechteck (02) · Zickzack-Kette (03) · Kanal (05) · Wolkenmasse (06) ·
Spirale (07) · Kreis (08) · Hantel/zwei Splitter (09) · Trichter mit Ring (10) · Kartenreihe mit Bogen (12) ·
Stachelkugel (13). Jedes weitere Bild braucht eine Form, die dagegen steht — mehr Detail hilft nie,
eine andere Grundform immer. Zweite Regel aus der Perlen-Panne: **nie aus gleichmäßig wiederholten,
gleich großen Rundformen bauen**; Wiederholung muss in Größe, Abstand oder Richtung variieren.

**Die eine Kollision, die zu beobachten ist:** `08` (Kugel) und `13` (Stachelkugel) sind beide rund. Sie
trennt heute nur der Splitterkranz — wenn eine der beiden im Angebot neben der anderen steht und man
stutzt, ist `13` die, die eckiger werden muss.
