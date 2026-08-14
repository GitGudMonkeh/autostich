# Eigenständige Archetypen-Effekte — Design-Doc

> **Lebendes Dokument.** Läuft über **mehrere Sessions mit Context-Clears** — dieses Dokument ist die
> **Quelle der Wahrheit**, die den Clear überlebt. Vor jedem Arbeitsbeginn zuerst hier lesen, am Ende
> den Stand hier festhalten (abgesegnete TUNE-Werte, offene Fragen, nächster Schritt).

Stand: 2026-08-14 · Branch: `Autostich/pixi`

---

## 1. Ziel & Scope

- **Ein eigenständiger Effekt pro Archetyp** — die vier Fraktionen: **Feuer**, **Blitz**, **Eis**, **Pflanze**.
- **Eigenständig / unabhängig von den Karten-Effekten** (Hitze/Blitzrahmen/Frost/Moos). Kein Kartenkind,
  keine Kopplung an die bestehenden Karten-Overlays — ein separater Effekt mit eigener Bühne/Ebene.
- **Abgrenzung:** Das ist **NICHT** Gottgleich-Prunk (abgeschlossen) und **NICHT** die
  Archetyp-Karteneffekte (`docs/archetyp-karteneffekte.md`, umgesetzt: Feuer/Blitz/Eis/Pflanze als
  Kartenkinder). Dies hier ist eine **neue, eigenständige** Effekt-Familie.

**Konzept je Effekt (was macht er, wo/wann erscheint er): TBD — wird je Effekt vom User vorgegeben.**

---

## 2. Workflow (verbindlich)

1. **Prototyp/Tuning-Board zuerst.** Je Effekt ein self-contained HTML-Board unter `docs/prototypes/`
   (arcade/synthwave-Look wie die bestehenden Boards), das den Effekt live zeigt und alle TUNE-Parameter
   als Slider anbietet. Reine Canvas-2D-/Inline-Umsetzung (CSP blockt externe Skripte), gleiche Mathematik/Optik.
2. **User dreht die Regler, segnet ab, gibt die Werte zurück.** Erst dann Code.
3. **Übernahme in den Code** (nur Zahlen/TUNE, keine blinden Logik-Änderungen).
4. **Verifikation:** `npm run build` + `npm test` grün, visuell via Playwright-Harness/Dev-Server.
5. **Am Ende bekommt JEDER Effekt ein eigenes GitHub-Issue.**

Regeln (wie immer): vor Push `git fetch origin Autostich/pixi && git rebase origin/Autostich/pixi`;
Build + alle Tests grün; deutschsprachiger Code/Kommentare; **kein Push ohne ausdrückliches „push"**;
kein PR ohne Auftrag.

---

## 3. Die vier Archetypen (Identität)

| Archetyp | id (`activeArchetypes`) | Icon | Glow-Farbe (`FACTION_GLOW`) | Gameplay-Kern |
|----------|--------------------------|------|------------------------------|---------------|
| **Feuer**   | `fire`      | 🔥 | `#e0714a` (Warm) | Schmieden (+Wert eigene) / Brandmarke (−Wert Gegner) / Weißglut |
| **Blitz**   | `lightning` | ⚡ | `#cf9bff` (Lila) | Krit-/Ladungs-Archetyp (Ionisierung, self-Crit) |
| **Eis**     | `ice`       | ❄️ | `#5ec8f0` (Kalt) | Gletscher/Firn-Masse, Frost, Schichten |
| **Pflanze** | `plant`     | 🌿 | `#5ab87a` (Grün) | Wachstum → reife grüne Karten, Ausläufer/Ranken |

Quellen: `src/ui/FactionIcon.jsx` (Icons + `FACTION_GLOW`), `src/game/skills.js` (`archetype:"…"`),
`src/game/engine.js` (`activeArchetypes` fire/ice/lightning/plant).

---

## 4. Umsetzungs-Reihenfolge & Status

| # | Archetyp | Konzept | Board | Abgesegnet | Code | Issue | Status |
|---|----------|---------|-------|------------|------|-------|--------|
| 1 | **Eis** | Wachsendes Eiskristall-Feld (Gletscher-Brüche) + Bersten | `docs/prototypes/eis-kristall-feld-tuning.html` | ✓ | `src/ui/fx/IceCrystalField.jsx` | [#364](https://github.com/GitGudMonkeh/autostich/issues/364) | **Umgesetzt (Renderer portiert + verdrahtet)** |
| 2 | TBD | TBD | – | – | – | – | offen |
| 3 | TBD | TBD | – | – | – | – | offen |
| 4 | TBD | TBD | – | – | – | – | offen |

---

## 5. Effekt 1 — Eis · Kristall-Feld (eigenständig)

**User-Spec (2026-08-14, wörtlich):**
> „mit jedem Gletscher der bricht Eiskristalle wachsen. sollen so aussehen wie auf der Karte, nur größer
> und die Kanten mehr wie ein hologrid. nach 10 Gletscher siegen, bersten die Eiskristalle. sie sollen
> jeweils von unten links und rechts leicht mittig ins Bild wachsen."

**Abgeleitetes Konzept:**
- **Eigenständiges Feld-Ambiente** auf dem Battlefield-Panel (nicht an eine Karte gebunden). Zwei
  Kristall-**Cluster** wachsen aus der **unteren linken** und **unteren rechten** Ecke **nach oben und
  leicht zur Mitte** ins Bild.
- **Optik = Karten-Frost** (`FrostIce.jsx`-DNA: kantige Neon-Scherben, Bühnenlicht A↔B, Glasur/Rime/Bloom),
  aber **größer** und mit **Hologrid-Kanten** (helle Wireframe-Kanten + interne Triangulation, leichtes Flackern).
- **Wachstum = Gletscher-Fortschritt.** Akkretion: mit jedem Gletscher-Ereignis wachsen die Kristalle
  (bestehende bleiben, neue kommen dazu). Board-Regler: **Gletscher-Siege 0→10**.
- **Bersten bei 10.** Nach 10 Gletscher-Siegen zerbersten die Kristalle (One-Shot-Splitter-Animation,
  fliegen nach außen/oben, verglühen).

**Offene Fragen / Annahmen (im Board so umgesetzt, beim Sign-off bestätigen):**
- **Trigger-Semantik:** „Gletscher der bricht" (Bruch je Durchlauf) vs. „10 Gletscher-Siege" — im Board
  als **ein Zähler 0→10** modelliert (jeder Schritt lässt wachsen, Schritt 10 = Bersten). Die genaue
  Engine-Anbindung (welches Spielereignis den Zähler hochzählt, ob nach dem Bersten reset/Zyklus) wird
  zur Code-Zeit geklärt.
- **Ebene:** Feld-Ambiente hinter den Karten (Battlefield-`FieldFxLayer`-Ebene). Nur bei aktivem
  Eis-Deck (`activeArchetypes` enthält `ice`).
- **Renderpfad:** Prototyp = Canvas-2D (wie die anderen Boards). In-Game-Umsetzung (Canvas-2D vs. Pixi)
  wird nach Sign-off entschieden.

**Board-TUNE-Gruppen:** Farben · Neon-Licht · Hologrid-Kanten · Cluster & Wuchs (Ecken-Anker,
Mitten-Zug, Fächer, Reichweite) · Kristall/Facetten · Details (Rime/Funkeln/Puls) · Bersten.

**Board (interaktiv):** https://claude.ai/code/artifact/47738cb6-398e-486e-bde1-30690557212e
(Quelle: `docs/prototypes/eis-kristall-feld-tuning.html`)

**Perf-Hinweis (Board):** Der Prototyp rendert alle Kristalle + Glasur-/Bloom-Radialverläufe live pro Frame
(bei hoher `DENSITY` teuer). Für In-Game muss das statische Feld je Sieg-Stufe (0–10) in ein Bitmap gecacht
werden (wie `FrostIce` je Stufe cached) — nur Funkeln/Flackern/Bersten laufen live. Renderpfad-Entscheidung
(Canvas-2D vs. Pixi) beim Sign-off.

**Ebene (bestätigt):** Der Effekt liegt **immer im Hintergrund** und ist die **UNTERSTE Effekt-Ebene** — direkt über
dem Battlefield-Bild, **alle anderen Effekte** (Aurora/Glutfunken/Sternenfeld, Karten-Animationen, Finisher/Prunk,
Groß-Ansagen …) liegen **darüber**. Karten sowieso davor.

**Abgesegnete Werte (2026-08-14, „sehr sehr geil"):**
```js
const TUNE = {
  ICE_DARK: "#141d47", ICE_MID: "#4f78c8", ICE_EDGE: "#cfeeff",
  NEON_A: "#22e0ff", NEON_B: "#a13cff", NEON_ANGLE: 90, NEON_RIM: 0.16, NEON_TIP: 0.28, NEON_PUNCH: 0.68, NEON_BLOOM: 0.36, NEON_BASE: 1,
  HOLO_EDGE: 0.76, HOLO_GRID: 0.8, HOLO_FLICK: 0,
  ANCHOR_X: 0.01, ANCHOR_Y: 1.09, CENTER_PULL: 0.58, SPREAD: 127, REACH: 0.49, RISE: 1.15, DENSITY: 0.52, CLUMP: 0.9, RAGGED: 0.94, GROW_BAND: 0.04, GROW_MS: 230,
  SHARD_LEN: 32, SHARD_WIDTH: 0.64, FACET: 0.54, GLAZE: 0,
  RIME: 0, SPARKLE: 0, SHIMMER: 0,
  BURST_SPEED: 3.4, BURST_SPREAD: 0.86, BURST_GRAV: 3, BURST_LIFE: 1370, BURST_SPIN: 0.12, BURST_FLASH: 1.5,
};
```
(Board-DEFAULTS auf diese Werte gesetzt.)

---

## 6. Session-Log

- **2026-08-14** — Doc angelegt. Workflow + 4-Archetypen-Rahmen festgehalten. Effekt 1 = **Eis**
  (Kristall-Feld) spezifiziert; Tuning-Board `docs/prototypes/eis-kristall-feld-tuning.html` gebaut.
  Nächster Schritt: User dreht die Regler, segnet TUNE ab → dann Code + eigenes Issue.
- **2026-08-14** — TUNE abgesegnet („sehr sehr geil"), als Board-Default gebacken. Effekt auf echten
  Battlefields (Eis/Kosmos/Polarlicht/Feuer) hinter Karten-Reihe gezeigt — passt. Ebene bestätigt:
  **unterste Effekt-Ebene**. **Issue [#364](https://github.com/GitGudMonkeh/autostich/issues/364) erstellt.**
- **2026-08-14** — **#364 umgesetzt.** Renderer 1:1 aus dem Board portiert → `src/ui/fx/IceCrystalField.jsx`
  (Canvas-2D, mobil-sicher wie FrostIce/Aurora). Trigger-Semantik geklärt (User: **„Gletscher bruch"**):
  ein monotoner Zähler `iceBreaks` pro Lauf zählt die **Gletscher-Brüche** (`engine.js` neues Feld
  `lastTrick.glacierBroke` = Bruch an der gespielten Position); der Zähler wächst 0→10 (Kristalle wachsen weich
  hoch), berstet bei 10 (Splitter + glatter Feld-Fade), dann leerer neuer Zyklus. **Persistenz: pro Lauf**
  (UI-Zähler in `App.jsx`, Reset im Menü/neuen Lauf). Ebene: `IceCrystalField` als `z-[1]` in `Battlefield.jsx`
  direkt über dem BF-Bild, hinter allen anderen Effekten + Karten; nur bei aktivem Eis-Deck (`iceActive`), lazy.
  **Perf:** rAF läuft nur während Wachs-Übergang/Bersten (abgesegnetes TUNE hat keine Dauer-Details → ruhendes
  Feld statisch), auf `lite` reduzierte Kristall-Dichte. Reduzierte Bewegung → Snap ohne Motion. Build + 1020
  Tests grün; Renderer + In-Game-Ebene via Playwright-Harness verifiziert.
