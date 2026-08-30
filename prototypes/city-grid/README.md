# City-Grid Asset-Technik-Prototyp

Reiner Technik-Test, bewusst **außerhalb** von `src/`: kein App-Screen, keine Wirkung auf den
Produktions-Bundle, kein neuer Dependency (Pixi.js läuft aus einer lokalen Kopie der bereits im
Projekt installierten Version, `node_modules/pixi.js/dist/pixi.min.mjs`). Prüft nur, ob die beiden
Gebäude-Renders und das Straßen-Sheet aus dem Chat sich zu einem funktionierenden isometrischen
Grid mit Kauf-Bauanimation und Auto-Tiling-Straßen zusammensetzen lassen. Stil ist bewusst
zweitrangig — es geht um die Mechanik.

## Starten

Pixi-Build einmalig lokal bereitstellen (nicht eingecheckt, siehe `.gitignore` hier drin):

```bash
mkdir -p prototypes/city-grid/vendor
cp node_modules/pixi.js/dist/pixi.min.mjs prototypes/city-grid/vendor/pixi.min.mjs
```

Statischer Server nötig (ES-Module laden nicht von `file://`):

```bash
cd prototypes/city-grid
python3 -m http.server 8080
# oder: npx serve .
```

Dann `http://localhost:8080/` öffnen. Klick auf eine leere Grundstücks-Kachel (gelber Rahmen) baut
abwechselnd Pagode/Turm von unten nach oben auf; angrenzende Straßenzellen werden automatisch mit
der passenden Kachel (gerade/Ecke/T/Kreuzung) belegt.

## Ergebnis (verifiziert per Headless-Browser-Lauf gegen die echten Assets)

- **Grid, Klick-Kauf, Bauanimation, Straßen-Auto-Tiling funktionieren technisch.** Alle vier
  Straßen-Kachel-Typen (gerade, Ecke, T, Kreuzung) werden korrekt aus der Nachbarschafts-Bitmaske
  ausgewählt und zusammen mit den Gebäuden in einer Szene gerendert.
- **Rotation ist die eine echte Grenze.** Die Straßen-Kacheln sind 2:1-Iso-Diamanten (keine Quadrate).
  Eine simple Sprite-Rotation um 90°/270° dreht Breite und Höhe gegeneinander und sprengt die
  Kachel-Fläche (im Test als schiefe, spitze Kachel sichtbar, siehe `docs/decisions/` falls das
  später dokumentiert wird). Der Prototyp fängt das ab, indem 90°/270°-Rotationen auf die
  unrotierte Kachel zurückfallen — optisch sauber, aber teils falsch orientiert. Für echte
  4-Wege-Rotation braucht es **pro Kachel-Typ eigene Artwork je Drehlage**, keinen Code-seitigen
  Dreh. Das ist eine Asset-Produktions-Folgefrage, keine Pixi-Grenze.
- **Anker/Zuschnitt der Gebäude passt.** Beide Gebäude-Renders sind bereits so gezeichnet, dass ihr
  visueller Fußpunkt (die untere Spitze) sauber auf `anchor(0.5,1)` sitzt — kein Nacharbeiten nötig
  für den Prototyp-Zweck.
- **Chroma-Key-Freistellung funktioniert** für Gebäude (Grün raus) und Straßen (dunkler Hintergrund
  raus) ohne sichtbare Löcher; ein dünner Farbsaum an Kanten ist normale Anti-Aliasing-Restfarbe.
- **Kachel-Nähte: gefunden, behoben, eine Grenze bleibt** (zweite Iterationsrunde, gegen die
  ersten Screenshots geprüft). Ursache der sichtbaren Lücken/Versätze war NICHT das Grid, sondern
  dass jede Straßen-Kachel von der ursprünglichen Zuschneide-Logik eine eigene, leicht andere
  Pixel-Größe bekam (Tight-Bbox je Motiv) — dieselbe `TILE_W`-Skalierung ergab dadurch pro Kachel
  eine andere Höhe. Behoben durch **eine einzige kanonische Leinwandgröße (242×150) für alle
  Kacheln**, zentriert auf den vermessenen Mittelpunkt im Original-Sheet zugeschnitten, plus ~9 %
  **Bleed** (Kacheln geringfügig größer als der Grid-Schritt gerendert, überlappen sich leicht statt
  mit Ein-Pixel-Spalt aneinanderzustoßen). Zusätzlich: `road_cross`/`road_tjunction`/`road_corner`
  im Sheet malen nur die Fahrbahn selbst, lassen die Diamant-Ecken dazwischen transparent (eigene
  Bildkomposition, kein Zuschnittfehler) — dort schien vorher der schwarze Canvas-Hintergrund durch.
  Eine schlichte Pflaster-Unterlage (`road_straight` als Füllkachel hinter jeder aktiven Straßenzelle)
  behebt das. **Nicht behebbar durch Zuschneiden:** Die Ecken-Kachel (`road_corner`) hat im Sheet
  eine runde/blockige Silhouette, während gerade/Kreuz/Grundstück-Kacheln scharfe Diamantspitzen
  haben — ich habe die Alternativ-Kandidaten im Sheet (die zwei „Kurven"-Kacheln aus Zeile 1, die
  gespiegelte Ecke aus Zeile 3) geprüft, keine ist eine scharfe 90°-Diamant-Ecke. Echte Konsistenz
  braucht hier neue Artwork, nicht mehr Zuschneide-Iteration.

## Dateien

- `index.html`, `main.js` — die Szene (Grid-Logik + Pixi-Rendering in einer Datei, kein Build-Schritt).
- `vendor/pixi.min.mjs` — 1:1-Kopie der Projekt-Pixi-Version, damit der Prototyp offline läuft.
- `assets/` — aus den drei Chat-Bildern zugeschnittene/freigestellte Einzel-Kacheln:
  `building_pagoda.png`, `building_tower.png`, `plot_empty.png`,
  `road_straight.png`, `road_corner.png`, `road_tjunction.png`, `road_cross.png`.

## Was das NICHT ist

Kein fertiges Gameplay-Feature, keine i18n-Anbindung, kein `src/game`-Domänenmodell, keine
Bundle-Split-Prüfung. Nächster Schritt (falls gewünscht): das hier bewährte Muster
(Grid-Zustand als reine Logik, Iso-Rendering separat) als echten `src/game/` + `src/ui/`-Screen
nach Projektkonventionen bauen — inklusive der offenen Art-Entscheidungen aus dem Chat (finale
Gebäude-Assets, Rotations-Artwork für Straßen).
