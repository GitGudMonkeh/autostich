# Skill-Artworks — Sammelstand

Embleme für die Skill-Wahl auf dem Desktop (ab 1280 px). Erzeugt mit ChatGPT nach dem Stil-Anker der
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
s. docs/decisions/engineering-log-2026-08.md). Angeglichen wird ERST, wenn alle 21 vorliegen — der
Zielwert ist der Median des Satzes, und der wandert mit jedem neuen Bild.

**Nicht-quadratische Bilder werden schwarz aufgefüllt, nicht beschnitten** (Überschlag und Dauerstrom
kamen als 1536 × 1024). Unter `mix-blend-mode: screen` ist der schwarze Rand unsichtbar — Beschneiden
würde dagegen genau die Bogen- bzw. Bandenden kosten, die die Silhouette ausmachen.

## Stand Blitz — VOLLSTÄNDIG, 21 von 21

Alle Master liegen. Gemessen über den ganzen Satz streut die **Lichtmenge** (Leuchtfläche ×
Spitzenhelligkeit) von **5,0 bis 51,2 — Faktor 10**, Median 17,5.

**Entschieden am Bild (19.08.2026): die HELLIGKEIT wird nicht angeglichen — ausgeliefert wird „wie
generiert", plus den gebackenen Bloom (s. Einbau).**
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

**Überarbeitet am 19.08.2026** (die erste Fassung war reines Licht auf Schwarz — es fehlte der dunkle
Gegenstand, an dem sich das Leuchten bricht): `04` Überspannung (bricht jetzt durch den aufgerissenen
Rasterboden), `14` Überschlag (der Fels ist sichtbar statt schwarze Silhouette), `15` Blitzschlag (die
Karte reißt entlang des Einschlags statt einer flachen Ellipse), `L02` Doppelentladung (goldener
Detonationskern zwischen zwei getroffenen Karten — vorher war es die legendäre Fassung von `10` Entladung,
also dieselbe Geste zweimal).

**Verworfen und nicht wieder aufnehmen:** Reststrom als Kapsel mit vier Leuchtringen (las sich als
halbvolle Batterie und war Gerätegehäuse statt Sturm) · Ladungsserie als Kette gleich großer Kugeln
(gleichmäßig wiederholte Rundformen lesen sich als Deko, nicht als Aufbau) · Blitzfänger als
geschlossene Steinkugel mit Kern (die Schale muss OFFEN sein — geschlossen ist es dasselbe Bild wie
`13` Spannungsstau, und zwei runde Brocken im selben Angebot sind eine Verwechslung, kein Satz).

## Einbau (19.08.2026)

Ausgeliefert wird aus `src/assets/skills/<archetyp>/` — **384 px, WebP q86**, erzeugt von
**`scripts/skill-art-build.py`** aus den Mastern. Alle 21 zusammen: **405 kB**. Von Hand pflegt man dort
nichts; wer ein Master austauscht, lässt das Skript neu laufen.

- **Platzierung**: als **Kopfstreifen** über der Angebotskarte (`.sk-strip` / `.sk-offer-art`). Am Regler
  entschieden (zweite Runde): **Zone 210 px · Zuschnitt füllend · Auslauf ab 62 %**. Der untere Rand wird
  nicht gekappt, sondern über eine Maske aufgelöst; `object-position: center top` hält die Aussage im Bild
  (die Motive haben sie oben, den Bodenraster unten — und der darf verschwinden).
- **Bloom gebacken statt gerechnet**: Radius 16 CSS-px, Stärke 70 %, Sättigung 200 %, ebenfalls am Regler
  gewählt. Als CSS-Filter wäre er Rasterarbeit auf dem Screen, der ohnehin am Mount klemmt. **Der Radius
  wird umgerechnet**: 16 px gelten für die Anzeige mit 277 px Breite, die Datei hat 384 → 22,2 px. Wer die
  Zonenbreite ändert, zieht diese Zahl mit.
- **Die Auflösung hängt an der BREITE, nicht an der Zonenhöhe.** Der Streifen zeigt das Bild `cover` in
  einer 277 px breiten Karte; bei DPR-Deckel 2 sind das 554 Gerätepixel. Die erste Fassung lieferte 192 px
  aus, begründet mit einem 64-px-Emblem — mit dem Streifen war dieselbe Datei fast dreifach hochskaliert.
  384 ist der Kompromiss (1,4-fach, 405 kB); pixelgenau wären 512 px und **655 kB**.
- **Gate**: `const art = wide ? skillArt(id) : null` — ab 1280 px. Weil das Gate im JSX sitzt und nicht in
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

## Stand Feuer (7 von 21, Sammlung läuft)

Silhouetten-Matrix und Messwerte; Zielbild ist die Blitz-Referenz (Leuchtfläche ~11 %, Streuung > 1,7).

| Skill | ID | Motiv | Silhouette | > 10 | Streuung |
|---|---|---|---|---|---|
| Glut | `SK_FIRE_01` | Glutbett, das aufatmet | flaches Band unten | 28,1 % | 1,39 |
| Zunder | `SK_FIRE_02` | Funkenschlag an dunklem Stein | Funkenfächer | 18,5 % | 2,33 |
| Feuersturm | `SK_FIRE_03` | Feuertrichter, oben offen | Trichter (Krone 62 %, Fuß 27 %) | 21,9 % | 2,35 |
| Glutbett | `SK_FIRE_04` | aufgebrochener Brocken, Kohlen im Spalt | Brocken mit Diagonalspalt | 20,7 % | 2,10 |
| Rückzündung | `SK_FIRE_05` | Stichflamme aus sterbender Glut | senkrechter Strahl | 10,0 % | 3,37 |
| Glühende Klinge | `SK_FIRE_06` | glühend geschmiedete Klinge | Klinge, diagonal | 25,0 % | 2,19 |

Offen: `07`–`17` · `L01`–`L04`.

**Zwei Lehren aus dieser Runde:**

- **Holz gibt es in dieser Welt nicht.** Der erste Zunder-Versuch war ein fotorealistisches Reisigbündel —
  Rinde und Zweige fallen sofort aus dem Neon-Ton der Fraktion. Feuer lebt hier in Glut, Asche, Rauch,
  glühendem Stahl und Funken; alles glüht von innen oder ist schwarz verkohlt. „Photographic" im Prompt
  meint ein gerendertes Energie-Phänomen, kein Foto eines Alltagsgegenstands.
- **Ein Motiv aus dem WORT statt aus der MECHANIK wird schwach.** „Zunder" als Anfeuerholz war klein und
  unspektakulär; die Mechanik sagt „jeder Sieg zündet zuverlässig" — daraus wurde der Funkenschlag am Stein,
  und der trägt. Bei jedem weiteren Skill zuerst die Wirkung lesen, dann das Bild suchen.

**Fläche schlägt keine Silhouette.** Das ist der eine Fall, den der Helligkeits-Angleich NICHT rettet:
fehlende Form lässt sich nicht wegskalieren. `01` Glut bleibt trotz 28 % — sein Band unten ist als Form
erkennbar. `04` Glutbett brauchte **drei Anläufe**, und alle drei sind lehrreich:

1. **Kruste über das ganze Bild** — 42,3 % Leuchtfläche, Streuung 1,23 (niedrigster Wert des Projekts).
   Eine Textur, keine Form.
2. **Einzelne gekippte Ascheplatte, frei im Schwarz** — löste die Textur, erzeugte aber eine graue Scheibe.
   Der Skill ist mechanisch PASSIV (Niederlagen kosten weniger Hitze); ein flacher Gegenstand macht das nur
   sichtbar. Das Bild muss nicht „ein Bett" zeigen, sondern **Bewahrung**.
3. **Geode im Querschnitt** — inhaltlich richtig, aber senkrechte Mandelform + konzentrische Falten + exakt
   mittige Lage lasen sich unmissverständlich anatomisch. Gegenmittel war nicht ein anderes Motiv, sondern
   **Asymmetrie**: diagonaler, außermittiger Bruch, gezackte Kanten statt Oval, und ein verschobenes
   Krustenstück, das die Öffnung an einer Seite überlappt.

Endstand: 20,7 % Fläche, Streuung 2,10 — halb so viel Licht wie Versuch 1, aber mit Form.

**Feuersturm brauchte drei Fassungen, und keine davon war ein Helligkeitsproblem:** gleichmäßige Säule
(zu beherrscht) → Trichter mit Trümmern bis in alle vier Ecken (Form ging in der Unruhe unter, Krone 72 %
der Breite) → Trichter mit gedeckelter Krone. Der Prompt-Satz, der es löste, war eine **Obergrenze**:
„the crown opens to about half the frame width". Ohne so eine Grenze füllt ein solches Motiv immer das
ganze Bild. Gemessen: Krone 62 %, Fuß 27 % — und die Lichtwerte sind mit 21,9 % gegen 20,3 % praktisch
unverändert. Die drei Fassungen unterscheiden sich rein geometrisch.

**Werkzeug-Lehre am Rande:** beim Messen greift das Skript „die neueste Datei". Kommt ein Upload nicht durch,
misst es damit still das VORHERIGE Bild und speichert es unter dem neuen Namen — einmal passiert und nur
aufgefallen, weil die Zahlen auf drei Nachkommastellen mit dem Vorgänger übereinstimmten. Eine Gegenprobe gegen EINEN Zahlenwert reichte nicht (sie schlug beim
nächsten Bild wieder fehl); jetzt führt das Skript eine Liste der bereits verarbeiteten Upload-Hashes und
bricht ab, bevor gemessen wird.
