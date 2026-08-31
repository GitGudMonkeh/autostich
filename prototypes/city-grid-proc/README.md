# City-Grid Prototyp — prozedural (ohne Bild-Assets)

Zweiter Anlauf nach dem Asset-Experiment in `../city-grid/`: alles wird mit Pixi-`Graphics`
gezeichnet, keine Bilder. Damit ist die Anschluss-Korrektheit der Straßen **per Konstruktion**
garantiert — Fahrbahnlinien laufen von der Kachelmitte zum Mittelpunkt einer verbundenen Kante,
und benachbarte Kacheln teilen sich diesen Punkt exakt. Die Probleme der KI-Assets
(eingebackene Perspektive, uneinheitliche Diamant-Größen, Eck- statt Kanten-Anschluss) können
hier prinzipiell nicht auftreten.

## Mechanik

- Klick auf eine freie Kachel → Gebäude wächst von unten nach oben (Höhen-Interpolation beim
  Zeichnen, kein Masken-Trick), danach weißer Abschluss-Blitz + Neon-Bodenringe.
- Straßen werden **abgeleitet**: jede freie Zelle, die (8-fach) an ein Gebäude grenzt, wird
  Straße. Ein Einzelgebäude bekommt so seinen Ring; stehen Gebäude aneinander, läuft die
  Straße um den gemeinsamen Block statt zwischen den Gebäuden hindurch.
- **Blöcke:** bis zu 4 Gebäude dürfen direkt aneinander gebaut werden (4er-Nachbarschaft,
  auch auf einer bestehenden Straßenzelle). Ein Klick, der einen Block auf 5 vergrößern
  würde, wird abgelehnt — kurzer roter Diamant-Blitz auf der Zelle.
- **Schwebe-Autos** fliegen auf dem Netz: facettierter 3D-Rumpf mit Neon-Deck, leuchtender
  Kanzel, Licht-Bars vorn/hinten und Anti-Grav-Glow. Jedes Auto bekommt einen eigenen
  Höhen-Slot plus sanftes Auf-und-ab — zwei Autos an einer Kreuzung passieren sich also
  über-/untereinander statt zu clippen. Ein Bodenschatten auf der Fahrbahn macht die
  Flughöhe ablesbar. Gefahren wird exakt auf den gezeichneten Fahrspuren (Kantenmitte →
  Zellmitte → Kantenmitte), Abbiegen an jeder Zellmitte entlang des echten Straßengraphen.
- **Bäume wachsen nur in Zwischenräumen**: kein Vorab-Streuen übers Feld. Eine Bodenzelle,
  die auf ≥3 orthogonalen Seiten von Straße/Gebäude umschlossen ist (dort wäre nie eine
  Straße nötig), begrünt sich mit einer kleinen Park-Animation. Baum-Design passend zu den
  Gebäuden: facettierte Low-Poly-Kronen (dunkle/helle Seite), Mint-Rim, Glow-Spitze,
  Landering am Boden.
- Ringe benachbarter Gebäude **verschmelzen**: jede Straßenzelle bestimmt ihre Verbindungen aus
  den 4 orthogonalen Straßen-Nachbarn (Bitmask) und zeichnet sich neu — Geraden, Kurven,
  T-Stücke und Kreuzungen entstehen dadurch von selbst, Kreuzungen ab 3 Verbindungen mit
  Junction-Pad. Bordsteine liegen nur an unverbundenen Kanten.
- Auf Straßenzellen kann nicht gebaut werden → zwischen zwei Gebäuden liegt immer eine Straße.

## Gebäude

Acht deterministische Typen (Seed aus Zellkoordinaten, gleiche Zelle → gleiches Gebäude):
Turm mit Rücksprüngen + Antenne, flacher Riegel mit Dachaufbauten, Zikkurat, Doppel-Türme,
**Super-Wolkenkratzer** (fünf Rücksprünge, Spitze mit Magenta-Beacon, bis ~240 px),
**japanische Pagode** (drei Etagen mit überhängenden, an den Ecken glühenden Vermilion-Dächern,
Gold-Fenstern und Gold-Finial), **Park** (mint-gerahmte Rasenfläche mit Brunnen, Bäumen und
Laterne — wächst als Garten statt in die Höhe) und **Arena** (elliptische Schüssel mit
Sitzrängen, Mint-Spielfeld und vier Flutlicht-Masten). Iso-Boxen mit drei sichtbaren Flächen,
Neon-Silhouette und teilweise erleuchteten Fenstern.

## Straßenleben

- **Fußgänger** schlendern am Straßenrand: gleiche Wegelogik wie die Autos, aber seitlich zum
  Bordstein versetzt, deutlich langsamer, mit Geh-Wippen. Winzige Leuchtfiguren (Kopf + Körper).
- Parks in den Zwischenräumen variieren deterministisch: Baumgruppe, Laterne + Baum,
  Holo-Billboard mit Scanlines, Brunnen-Plaza mit Neon-Ringen, oder Torii-Schrein-Garten
  (Vermilion-Tor + Gold-Laterne) passend zu den Pagoden.

## Starten

```bash
mkdir -p prototypes/city-grid-proc/vendor
cp node_modules/pixi.js/dist/pixi.min.mjs prototypes/city-grid-proc/vendor/pixi.min.mjs
cd prototypes/city-grid-proc
python3 -m http.server 8080
```

## Verifiziert (Headless-Browser, Screenshots)

- Einzelgebäude: geschlossener Straßenring, Markierungen fließen durch die Ring-Ecken.
- Mehrere Gebäude (auch diagonal versetzt): Ringe teilen sich Straßen, Junction-Pads genau an
  den echten Verzweigungen, Bordsteine umranden Außenkanten und eingeschlossene Leerblöcke.
- 2×2-Block: Straße läuft geschlossen um den ganzen Block, keine Straße zwischen den vier
  Gebäuden; der 5. angrenzende Bauversuch wird mit rotem Blitz abgelehnt. Park- und
  Arena-Zellen im Screenshot-Test bestätigt.
- Kein Asset-Laden → Start praktisch sofort, Gesamtgröße wenige KB statt mehrerer MB.

## Verhältnis zu ../city-grid/

Das Asset-Experiment bleibt als Referenz liegen (inkl. der dort dokumentierten Befunde, warum
die KI-Straßenkacheln nur eingeschränkt verwendbar sind). Wenn später echte Assets in strenger
Orthografie existieren, ist dieser prozedurale Prototyp die Schablone dafür, wie die Kacheln
geschnitten sein müssen: 2:1-Diamant, Kante-an-Kante, Fahrbahn durch die Kantenmittelpunkte.
