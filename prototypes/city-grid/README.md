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
eines von sechs Gebäuden (reihum) von unten nach oben auf und lässt es neon aufblitzen; angrenzende
Straßenzellen werden automatisch mit der passenden Kachel (gerade/Ecke/T/Kreuzung, korrekt gedreht)
belegt.

## Ergebnis (verifiziert per Headless-Browser-Lauf gegen die echten Assets, dritte Iterationsrunde)

- **Grid, Klick-Kauf, Bauanimation, Neon-Blitz, Straßen-Auto-Tiling funktionieren technisch,
  jetzt mit sechs Gebäuden** (die ursprüngliche Pagode/Turm plus vier neu generierte: schlanker
  Turm, breites niedriges Gebäude, Stufenpyramide, rundes Eckgebäude) und einem **zweiten,
  saubereren Straßen-Sheet**.
- **Rotation ist gelöst, nicht mehr nur umgangen.** Die Straßen-Kacheln sind 2:1-Iso-Diamanten
  (keine Quadrate) — eine gleichmäßige 90°/270°-Sprite-Rotation sprengt die Kachel-Fläche (siehe
  vorherige Runde: schiefe, spitze Kacheln). Fix: bei 90°/270° werden die Skalierungsachsen
  **vertauscht** (`applyRoadTransform` in `main.js`) angewendet, sodass die gedrehte Bounding-Box
  wieder exakt auf `TILE_W×TILE_H` trifft. Das zerrt die Kachel-Grafik geringfügig (Kauf des
  Nutzers, bewusst in Kauf genommen), liefert aber echte 4-Wege-Rotation ohne zusätzliche Artwork —
  Ecken/T-Stücke zeigen jetzt in alle vier Richtungen, gerade Straßen laufen in beide Achsen.
- **Das zweite Straßen-Sheet braucht keine Pflaster-Unterlage mehr.** Anders als das erste Sheet
  (transparente Kerben an Kreuzung/Ecke, siehe Historie unten) haben alle vier Kacheln im zweiten
  Sheet volle Diamant-Pflasterfläche — der Behelf von letzter Runde (`road_straight` als Füllkachel
  hinter jeder aktiven Zelle) wurde ersatzlos entfernt.
- **Ecken-Kachel jetzt scharf statt rund/blockig.** Das zweite Sheet liefert eine echte
  90°-Diamant-Ecke mit sauberem Kurvenradius — die stilistische Einschränkung aus der letzten
  Runde (keine scharfe Ecke im ersten Sheet verfügbar) ist damit erledigt.
- **Anker/Zuschnitt der Gebäude passt bei allen sechs.** Jedes Gebäude ist so gezeichnet, dass sein
  visueller Fußpunkt (die untere Spitze bzw. Kante) sauber auf `anchor(0.5,1)` sitzt.
- **Chroma-Key-Freistellung funktioniert** für alle Gebäude (Grün raus) und Straßen (Grün raus,
  Sheet 2 nutzt anders als Sheet 1 ebenfalls Grün statt dunklem Hintergrund) ohne sichtbare Löcher.
- **Ladezeit als neuer, ehrlicher Punkt:** sechs Gebäude-PNGs plus vier Straßen-Kacheln sind
  zusammen ~8,7 MB (ungefähre `assets/`-Größe) — beim allerersten Laden spürbar mehr als die
  ursprünglichen zwei Gebäude. Kein Bug, aber vor einem echten Feature-Einbau ein Punkt für die
  Asset-Pipeline (Kompression/WebP, Atlas) statt für den Techniktest selbst.

### Historie (erste Iterationsrunde, erstes Straßen-Sheet — inzwischen ersetzt)

Ursache der ursprünglich sichtbaren Kachel-Lücken war NICHT das Grid, sondern dass jede
Straßen-Kachel von der ursprünglichen Zuschneide-Logik eine eigene, leicht andere Pixel-Größe bekam
(Tight-Bbox je Motiv) — dieselbe `TILE_W`-Skalierung ergab dadurch pro Kachel eine andere Höhe.
Behoben durch eine einzige kanonische Leinwandgröße für alle Kacheln, zentriert auf den vermessenen
Mittelpunkt im Original-Sheet zugeschnitten, plus Bleed (Kacheln geringfügig größer als der
Grid-Schritt gerendert). Das erste Sheet hatte zusätzlich transparente Kerben an Kreuzung/Ecke und
nur eine runde/blockige Ecken-Kachel — beides mit dem zweiten Sheet (oben) erledigt.

## Dateien

- `index.html`, `main.js` — die Szene (Grid-Logik + Pixi-Rendering in einer Datei, kein Build-Schritt).
- `vendor/pixi.min.mjs` — 1:1-Kopie der Projekt-Pixi-Version, damit der Prototyp offline läuft.
- `assets/` — aus den Chat-Bildern zugeschnittene/freigestellte Einzel-Kacheln:
  sechs `building_*.png`, `plot_empty.png`,
  `road_straight.png`, `road_corner.png`, `road_tjunction.png`, `road_cross.png`.

## Was das NICHT ist

Kein fertiges Gameplay-Feature, keine i18n-Anbindung, kein `src/game`-Domänenmodell, keine
Bundle-Split-Prüfung. Nächster Schritt (falls gewünscht): das hier bewährte Muster
(Grid-Zustand als reine Logik, Iso-Rendering separat) als echten `src/game/` + `src/ui/`-Screen
nach Projektkonventionen bauen — inklusive der offenen Art-Entscheidungen aus dem Chat (welche der
sechs Gebäude bleiben, finale Asset-Pipeline/Kompression).
