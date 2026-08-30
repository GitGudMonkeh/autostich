# City-Grid Asset-Technik-Prototyp

Reiner Technik-Test, bewusst **außerhalb** von `src/`: kein App-Screen, keine Wirkung auf den
Produktions-Bundle, keine neue Dependency (Pixi.js läuft aus einer lokalen Kopie der bereits im
Projekt installierten Version). Prüft, ob die KI-generierten Assets (Gebäude-Renders +
Straßen-Sheet) sich zu einem funktionierenden Stadt-Grid mit Kauf-Bauanimation, Neon-Blitz und
aufleuchtenden Straßen zusammensetzen lassen.

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
```

Dann `http://localhost:8080/` öffnen. Klick auf eine helle Boden-Kachel baut eines von vier
Gebäuden von unten nach oben auf (mit Neon-Abschlussblitz); das Straßensegment vor dem Grundstück
leuchtet auf. Gedimmte Kacheln sind Deko-/Straßenland.

## Anschlussmodell der Straßen-Kacheln (Kernbefund, dritte Iterationsrunde)

Die entscheidende Korrektur nach dem Schief-/Falschsegment-Feedback: **diese Straßen-Plates
verbinden sich über die Diamant-ECKEN (bildschirm-horizontal), nicht über die Kantenmitten.**
Per Composite-Test (Kacheln in beiden Modellen nebeneinandergelegt, Screenshots verglichen)
nachgewiesen: Kante-an-Kante — das Modell der ersten beiden Runden — erzeugt parallel versetzte,
nie verbundene Fahrbahnbänder; genau das war das „Schiefe" im Mobil-Screenshot. Ecke-an-Ecke in
Bildschirm-Reihen fluchtet die Fahrbahn sauber durch.

Konsequenz für den Stadtplan: Funktionszellen liegen Ecke-an-Ecke (Δx = Kachelbreite), die
versetzten Zwischenreihen füllen die Lücken mit der Plaza-Bodenkachel des Sheets (Kante-an-Kante).

## Welche Straßen-Kacheln „gehen" — und welche nicht

Vorgabe des Owners: nur Straßen verwenden, die nachweislich funktionieren. Ergebnis der
Composite-Prüfung jeder einzelnen Kachel:

| Kachel | Befund | Verwendung |
| --- | --- | --- |
| Gerade (horizontal) | Fahrbahn fluchtet in Bildschirm-Reihen sauber durch | ✅ in Gebrauch |
| Gerade (vertikal, 90° gedreht/gebacken) | Scheitert an der **eingebackenen Perspektive** der KI-Kacheln: die Fahrbahn läuft nicht exakt durch die Diamant-Ecken, gedreht wird sie zur anschlusslosen Diagonale (per Markierungslinien-Test belegt: die Transformation selbst ist korrekt, das Artwork ist es nicht) | ❌ verworfen |
| Kreuzung | Artwork in sich stimmig, braucht aber eine funktionierende vertikale Gerade als Anschluss | ❌ verworfen (bis vertikales Artwork existiert) |
| T-Stück | wie Kreuzung | ❌ verworfen |
| „Kurve" | Ist **keine 90°-Abzweigung**: unten geschlossener Pflasterblock, oben Pflasterplatten, Fahrbahn läuft links→rechts mit Bogen — eine gebogene Gerade | ❌ verworfen |
| Plaza | Volle Diamant-Pflasterfläche | ✅ als Boden-/Grundstückskachel |

Der Stadtplan nutzt deshalb **nur horizontale Straßenzüge** (zwei Reihen), ohne Kreuzungen. Das
ist die ehrliche Obergrenze dieses Sheets.

## Weitere Korrekturen dieser Runde (alle gegen Screenshots verifiziert)

- **Uneinheitliche Diamant-Größen behoben:** T/Kreuzung waren im Sheet ~5–10 % kleiner gezeichnet
  als Gerade/Kurve; der frühere „einheitliche Leinwand"-Zuschnitt konservierte das (und schnitt
  bei der Kreuzung Reste der Nachbarkacheln mit). Jetzt: tight-Zuschnitt pro Kachel + im Code
  Nicht-uniform-Skalierung jeder Bodenkachel auf exakt `TILE_W×TILE_H` — das Raster stimmt per
  Konstruktion.
- **Gebäudegröße:** Basis jetzt ~0,95× Kachelbreite (vorher 1,3×) — Gebäude stehen auf ihrem
  Grundstück statt in die Straße zu ragen. Nur noch die 4 stilkonsistenten Gebäude der letzten
  Generation im Zyklus (Pagode/Alt-Turm haben einen anderen Kamerawinkel; Dateien bleiben liegen).
- **Diamant-Hitareas** statt rechteckiger Sprite-Bounds — bei Ecke-an-Ecke-Kacheln überlappen
  Rechteck-Hitboxen die Nachbarzellen massiv (gefunden, als der Testklick zunächst ins Leere
  ging: das Polygon muss in lokalen Anchor-Koordinaten um (0,0) zentriert sein).

## Bekannte, bewusste Grenzen

- Kein vertikaler Straßenzug, keine Kreuzungen — braucht neu generiertes Artwork in **strenger
  orthografischer 2:1-Projektion mit Fahrbahn exakt durch die Diamant-Ecken** (nächste
  Asset-Runde; der Generierungs-Prompt muss das explizit verlangen, „isometric" allein reicht
  nicht — die aktuelle Generation hat leichte Perspektive eingebacken).
- Kachelränder tragen je eigene Neon-Deko → an Nahtstellen doppelte Randlinien. Art-Eigenschaft,
  kein Alignment-Fehler.
- Karten-Ränder der Füllreihen sind gezackt (Deko-Reihen enden versetzt). Kosmetik.
- `assets/` enthält auch die aktuell ungenutzten Kacheln (Kreuzung, T, Kurve, vertikale Gerade,
  Alt-Gebäude) als Material für die nächste Runde; geladen wird nur, was der Plan nutzt.

## Dateien

- `index.html`, `main.js` — Szene (Stadtplan, Aktivierungslogik, Pixi-Rendering; kein Build-Schritt).
- `vendor/pixi.min.mjs` — lokale Kopie der Projekt-Pixi-Version (nicht eingecheckt).
- `assets/` — aus den Chat-Bildern zugeschnittene/freigestellte Kacheln und Gebäude.

## Was das NICHT ist

Kein fertiges Gameplay-Feature, keine i18n-Anbindung, kein `src/game`-Domänenmodell. Nächster
Schritt (falls gewünscht): Straßen-Sheet in korrekter Orthografie neu generieren (dann vertikale
Züge + Kreuzungen), und das bewährte Muster als echten `src/game/` + `src/ui/`-Screen nach
Projektkonventionen bauen.
