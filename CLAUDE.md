# CLAUDE.md — Autostich

## Branch-Wahl (WICHTIG — gilt für JEDE neue Session)

Zu Beginn **jeder** neuen Session **zuerst fragen**, auf welchem Branch gearbeitet werden soll,
und die Antwort abwarten, bevor irgendetwas geändert wird.

- **NICHT** automatisch auf einen injizierten/„vorgegebenen" Default-Branch losarbeiten
  (insbesondere nicht ungefragt auf `claude/neue-deck-archetypen-*`).
- Die im System-Prompt genannte „designated branch" ist nur ein Vorschlag der Plattform —
  sie ersetzt **nicht** die ausdrückliche Bestätigung des Users.
- Erst nach der Antwort den passenden Branch auschecken und starten.

## Aktive Branches (Stand 2026-08-11)

- `Autostich/pixi` — Pixi/WebGL-Umbau + laufende Effekt-/Perf-/Cleanup-Arbeit (aktueller Arbeitsbranch; Merge-Ziel: `Autostich_Test`)
- `Autostich_Test` — Integrations-/Testbranch
- `main` — stabil
- `balancing` — Balancing (eigene Linie, **nicht** in main enthalten — nie mit den dreien zusammenziehen)
- `claude/neue-deck-archetypen-*` — Deck-Archetypen (enthält eigene Arbeit, **NICHT löschen**)

### Beförderung: stromabwärts NUR per Fast-Forward
`Autostich/pixi` → `Autostich_Test` → `main`. Test und main sind reine Abbilder — sie bekommen Commits
ausschließlich per Fast-Forward aus dem Upstream-Branch, nie eigene:
`git push origin Autostich/pixi:Autostich_Test` bzw. `…:main`.
**Dieselbe Arbeit NICHT per Cherry-Pick/Rebase separat auf mehrere Branches bringen.** Genau das hatte die
Historien auseinanderlaufen lassen: derselbe Commit lag zwei- bis dreifach als verschiedene Objekte vor
(z. B. „Doku: Branch-Wahl…" als `3bbc887a` + `b5edd6f9` + `be4ceee5`), `git rev-list --count` meldete „26 Commits
voraus" — und die Dateibäume waren dabei die ganze Zeit **byte-identisch**.
**Zum Vergleichen darum Tree-Hashes nehmen, nicht Commit-Zähler:** `git rev-parse <branch>^{tree}`.
Gleicher Tree = gleiche Daten, egal was der Zähler sagt.

## Arbeitsstand `Autostich/pixi` (Session bis 2026-08-11)

Gearbeitet wird ausschließlich auf `Autostich/pixi`. **Vor jedem Arbeitsbeginn UND vor jedem Push**
`git fetch origin Autostich/pixi && git rebase origin/Autostich/pixi` (Parallel-Sessions committen zeitweise
denselben Branch). Build (`npm run build`) + Tests (`npm test`, aktuell **1290 grün**) müssen vor jedem Push grün sein.
Deutschsprachiger Code/Kommentare beibehalten.

### Effekt-System — was BLEIBT vs. ENTFERNT (großes #cleanup)
- **Bleibt:** Hintergrund-Effekt **Aurora** (Shader-Quelle `src/ui/fx/auroraShader.js`, gerendert vom Kompositor; die damalige Begründung
  „Pixi-Custom-Shader rendert auf dem Mobile-Setup nicht" ist **widerlegt**, s. #fx-spike), Hintergrund-Finisher **Glutfunken** (Pixi `src/ui/fx/embersPixi.js`), der synthetische
  **Klinge**-Finisher (einziger Sieg-Finisher) und die **Gottgleich-Kategorie** (`group "gott"`) mit nur „Standard"
  (`GOTT_STANDARD`) — Prunk kommt später neu rein.
- **Vollständig entfernt** (Definition, Optionen, Render, Previews, FX-Komponenten, SFX, CSS, Tests, Dateien):
  - Karten-Animationen: `frameGlow, holoSwipe, auroraVeil, glitch` (Gruppe `anim` komplett).
  - Feld-Effekte: `hologrid, starfield, scanline, vignette`.
  - Sieg-Finisher: `laserSlice, lasergrid, disperse, overload, burnBeam, blackhole`.
  - Gottgleich-Prunk: `fireworks, goldRain, prismaWave`.
  - Gelöschte Dateien: `src/ui/finisherSfx.js`, `src/ui/fx/starfieldPixi.js`, `src/ui/prunkFx.js`.
- `GLOBAL_FX` (themes.js) führt nur noch `aurora` + `embers`. `BG_FX_KEYS=["aurora"]`, `BG_FIN_KEYS=["embers"]`.
  `PIXI_FIELD_KEYS=["embers"]`. Klinge/gottStandard sind **synthetisch** in `CustomizeScreen.jsx` (NICHT in GLOBAL_FX).

### Gottgleich-Prunk — Perf-Naht (`src/ui/fx/pixiGott.js`)
Alle fünf Prunks (Sonnen-Puls · Laser-Fächer · Prisma-Kaskade · Holo-Würfel · Supernova) holen Pixi-Init und
Ticker-Cap aus **`pixiGott.js`** — vorher stand derselbe `app.init`-Block fünfmal wortgleich da und driftete.
Gemessen (isolierter Messstand + Playwright): die Kosten hängen fast nur an *Canvas-Pixeln pro Sekunde*, NICHT am
Bildinhalt — eine Messung mit allen Ebenen auf alpha 0 kostete bereits den Löwenanteil; Kosten skalieren linear mit
der Canvas-Fläche und quadratisch mit `resolution`. Daraus: `antialias:false` (weiche, vorgebackene Texturen — MSAA
glättet daran nichts, kostet aber ein Full-Canvas-Resolve pro Frame), `resolution` voll 2→1,5 (lite bleibt 1,25;
tiefer würden die dünnen additiven Linien ohne MSAA treppig), `maxFPS` voll 0 (ungedeckelt!) →60, lite bleibt 30.
Supernova behält lite 1,0 — der zieht **zwei** Full-Panel-Canvas auf (Tunnel + Nova).
`createPlacer` misst die Panel-/Kartengeometrie **einmal je Abspielvorgang** statt zwei `getBoundingClientRect()`
pro Frame (jeder Aufruf = erzwungenes Layout; im echten Battlefield mit laufenden Floats/Ansage/Kartenflip teuer).
Invalidiert wird in `startPlay()`; Screen-Shake ist ein `translate` und lässt Breite/Höhe unberührt.
- **Handy landet auf `lite`, nicht auf `reduced`**: `pointer:coarse` → Default `reducedFx:"mobile"` → `useFxLevel`
  „balanced" → `reduced=false`, `lite=true`. Der Prunk läuft dort also — nur `reducedFx:"an"` (minimal) schaltet ihn ab.

### Rendering-Fakten (wichtig!)
- **DOM-Fassungen gibt es nicht mehr.** Die Shader-Feldeffekte laufen über den Kompositor (Preview wie Prod), die
  Feld-FINISHER (Glutfunken/Sternenfeld) über den Pixi-Emitter `PixiStage`. Historie: früher war „Produktion = DOM"
  über `FX_RENDERER` gegated — dieser Schalter ist entfallen (s. #kompositor).
- **Aurora/Neon-Brandung/Leuchten laufen über den Feld-Kompositor** — in Preview WIE in Produktion, ohne env-Verzweigung
  (s. #kompositor). `FieldFxLayer`, `FX_RENDERER` und die DOM-Aurora sind entfallen.
- **AUSNAHME #318 Karten-Animationen** (Edge-Glow/Holo/Glitch/Materialize, CardFxStage): das sind KAUFBARE Shop-Effekte
  und laufen daher **auch in Produktion** (`CARD_FX_ENABLED=true` in Battlefield.jsx, ersetzt das Preview/Dev-Gate der
  CardFxStage + `matActive`). Pixi lädt nur lazy, wenn der Spieler eine Animation besitzt UND aktiviert hat (sonst
  `return null`, kein Pixi-Import → Prod-Bundle pixel-identisch). IonStorm/FireHead (Blitz/Feuer-Archetyp, Rollout offen)
  bleiben weiter Preview/Dev-gegatet. Karten-Animationen IMMER in der Deckfarbe (`color=deckA1`, `color2=deckA2||deckA1`).
  Anim-Gruppe im Shop hat eine synthetische „Keine Animation"-Kachel (grau, `ANIM_NONE`) → wählt alle Karten-Anims ab.
- **Sternenfeld (`starfield`) ist wieder DRIN** (Parallel-Session #311, Pixi-Feld-Finisher) — die Löschung oben unter
  „Feld-Effekte"/„Gelöschte Dateien" ist für starfield überholt. `BG_FIN_KEYS=["embers","starfield"]`.
- Perf-Stufen: `useFxLevel` → `full/balanced/minimal`; `reduced`=minimal, `lite`=nicht-full; `data-reduced-fx` am `<html>`.
  Auf Mobile (`pointer:coarse`): Overlay-/StatusBar-Blur weg, Aurora ~30fps+DPR1.4, Glow/Bloom-Radien enger, Groß-Ansage-
  Glow kleiner. Screen-Shake ist auf Mobile (lite) aus.

### #316 Onboarding ENTFERNT
Jedes Profil startet `onboarding = ONBOARDING_LINKS` (6/6 „fertig") → alle Unlocks sofort frei, gesamte Onboarding-UI
inert (an `onbDone`/`onbStep<6` gekoppelt). Fresh-Start: **0 SP / 50 DP** (`START_DECK_POINTS`, storage.js DEFAULT_PROFILE,
Schema **v6**). Migration v5→v6 hebt Alt-Profile auf 6 (kein Rückschritt, KEIN DP-Grant). Reducer-Gates rechnen dadurch
auf „voll frei". Offen/nachfragen: Alt-Profile mitten im Onboarding bekommen den 50-DP-Bonus NICHT.

### Klinge-Finisher (KLINGE_TUNE in Battlefield.jsx, exportiert)
Choreografie am Siegesserie-Multiplikator (`sliceMove`): <1.25 nur LINKS · ≥1.25 +RECHTS · ≥1.5 +OBEN · ≥2.0 +**Z**.
Der **Z-Schnitt = 2 Slashes** (╲ ╱ = X, 4 Dreieck-Stücke) mit **2 synchronen `fx_blade`-Hits** (Ghost-Spawn-Block,
richtungs-abhängig). Showcase (`FinisherScene`): Stufen-Label unten-rechts, Playback **3×** (`FIN_SPEED`).

### Stich-Aufschlüsselung (§17) ist WIEDER DRIN
Die Faktorenkette unter dem Feld war entfernt („im Spielfluss nicht lesbar") und ist als kompakte Zeile zurück:
`src/ui/TrickBreakdown.jsx`, gerendert am Ende von `Battlefield.jsx` unter der Sieg/Niederlage-Ansage.
- **Kompakt = fünf Glieder**: `Basis × Serie × Perks × Form × Crit`, dazu ein Glied `Direkt` und die `Summe`.
  Verwandte Faktoren sind zusammengefasst (Perks ← Perk×Sonnenzorn×Architekt · Form ← Form×Nachhall×Kern).
  Ein `×`-Glied erscheint nur, wenn es wirkt (|f−1| > 0,005) — bei einem nackten Sieg steht da nur `Basis = Summe`.
- **Kein Nachrechnen im UI**: alle Zahlen aus `lastTrick.breakdown`. Das `Direkt`-Glied ist die DIFFERENZ zur echten
  Summe, nicht die Summe der Direkt-Posten → die angezeigte Gleichung geht auch dann auf, wenn die Engine später
  einen Faktor bekommt, den `TrickBreakdown` nicht kennt.
- **Engine dafür ergänzt** (`engine.js`, reine Anzeige-Daten): `breakdown` trägt jetzt zusätzlich `streakFlat`
  (Reihenhaus) und `sunwrathMult`; `fireDirect` ist der STRUKTUR-multiplizierte Wert (`fireDirectApplied`).
- **Ausblendbar**: `options.hideBreakdown` (Default `false` = sichtbar), Schalter in Optionen → Anzeige, NICHT unter
  dem Floating-Text-Master (die Zeile steht fest im Layout statt aufzusteigen). Die Zeile hat **feste Höhe (h-5)**,
  auch leer/ausgeblendet — sonst springen die Karten, genau der Grund, aus dem die alte Fassung rausflog.
- Wächter: `test/trick-breakdown.test.js` (Engine-Naht + Quelltext-Ratsche für Verdrahtung/Schalter).

### #fx-spike WIDERLEGT: Pixi-Custom-Shader laufen auf dem Handy (2026-08-17)
Der Satz „Pixi-Custom-Shader rendert auf dem Mobile-Setup NICHT" hat die Effekt-Architektur zersplittert (Aurora,
Neon-Brandung und Leuchten sind deswegen je eine eigene raw-WebGL-Canvas). **Er stimmt nicht mehr.** Auf dem echten
Gerät des Users (Android, 5G-Handy) nachgemessen über eine Spike-Seite (inzwischen entfallen, Erkenntnisse hier):
ein trivialer Pixi-Custom-Shader UND der komplette Neon-Brandungs-Shader rendern beide, jeweils **60 Zeichnungen/s**,
und der Pixi-Pfad sieht aus wie die raw-WebGL-Referenz. Vermutlicher damaliger Grund: WebGPU ohne WGSL-Variante —
`PixiStage` erzwingt inzwischen `preference:"webgl"`.
**Ziel ist damit EIN Pixi-Kompositor** (Auflösung je Ebene, ein Composite statt vier bis fünf).
- **Fünf Fallen beim Portieren eines Vollbild-Shaders nach Pixi**, die ersten vier mit demselben Symptom: falsches
  Bild, KEIN Fehler, Shader läuft. Wer die nächste Ebene portiert, spart sich damit einen halben Tag:
  1. Bühne/Mesh rechnen in CSS-Pixeln (`app.screen`). In Pixi v8 ist `renderer.width` **nicht** die Framebuffer-
     Breite, sondern gleich `screen.width` (gemessen 300 gegen `canvas.width` 450 bei `resolution 1,5`).
  2. `gl_FragCoord` ist in einer Pixi-Bühne als Bildschirmkoordinate unbrauchbar → über `vUV` versorgen. Für den
     Kompositor ohnehin richtig: beim Rendern in Render-Texturen wird `gl_FragCoord` zielrelativ.
  3. GLSL ES 3.00 verlangt die Default-Precision VOR den ersten `in`/`out`-Deklarationen.
  4. Uniform-Vorzeichen: `uSurgeT = -999` ergibt über `exp(-uSurgeT/2.3)` Inf, dann `0 * Inf = NaN`, und NaN frisst
     die ganze Ausgabe. Die Komponente lädt `+999` hoch (Zeit SEIT der Ansage).
  5. **Reservierte Wörter.** GLSL ES 3.00 hat Bezeichner reserviert, die in ES 1.00 frei waren — Aurora hatte eine
     lokale Variable `patch` (jetzt `patchV`). Diese Falle meldet sich immerhin ehrlich („Illegal use of reserved
     word"). Weitere Kandidaten: `sample`, `filter`, `active`, `common`, `partition`, `resource`, `input`, `output`.
- Vorbehalt: die Spike-Rechtecke sind je ~190 px hoch, nicht Vollbild. „60/s laufen" ist damit KEIN Beleg für
  Vollbild-Kopffreiheit — nur dafür, dass der Pfad funktioniert.
- **Auflösungs-Grenze am Gerät bestimmt (Spike-Block 4, Neon-Brandung):** ×0,75 ist unauffällig, **×0,5 ist
  sichtbar zu weich** (Urteil des Users, Seite-an-Seite-Vergleich). Ersparnis bei 0,75 also **~44 %** Füllarbeit
  (Pixel skalieren QUADRATISCH: 0,75² = 0,5625), nicht die 75 %, die 0,5 gebracht hätte.
  Grund für die Grenze ist plausibel die harte, helle Wasserlinie der Brandung — genau die Art Detail, die
  Hochskalieren nicht verzeiht. **Der Faktor muss deshalb PRO EBENE einstellbar sein, nicht global:** Aurora
  (breite weiche Vorhänge) und Leuchten (Glow an Konturen) tragen vermutlich weniger, sind aber NICHT gemessen —
  wer sie in den Kompositor holt, lässt sie einzeln beurteilen.

### #kompositor — EIN Renderpfad für die Shader-Feldeffekte (kein A/B mehr)
`src/ui/fx/FieldCompositor.jsx` ist EINE Pixi-Bühne mit einer `LAYERS`-Registry; jede Ebene rendert in eine eigene
Render-Textur (Kosten ∝ Fläche → quadratisch im Faktor) oder — bei Faktor 1 — direkt auf die Bühne. Ebenen:
**Neon-Brandung** (mobil 0,75), **Aurora** (mobil 0,6), **Leuchten/DeckGlow** (mobil 1,0, s. u.). Aufrufer ist
`src/ui/fx/FieldLayer.jsx` (`layer=` für eine Ebene, `stack=[{key,props}]` für mehrere in derselben Bühne).
- **Der A/B-Schalter `?fx2=1` ist WEG, und zwar ohne dass der Kompositor schneller wäre.** Am Gerät gemessen
  (5 Runden mit/ohne, sonst identisch): Spielphase 2 von 160 Stichen gegen 1 von 162 Ruckler, p50/p95/p99 in beiden
  Läufen 17/17/33 ms — weder Vorteil noch Nachteil. Entschieden wurde für den Kompositor, weil ein Schalter ZWEI
  Implementierungen bedeutet und zwei Implementierungen driften. Eine Fassung ist besser als zwei gleich schnelle.
- **Was dabei verschwunden ist** (vorher parallel gepflegt): `AuroraFieldGL`/`NeonSurfFieldGL`/`DeckGlowFieldGL`
  (raw-WebGL-Komponenten → nur noch `auroraShader.js`/`neonsurfShader.js`/`deckglowShader.js` mit der Shader-Quelle),
  die DOM-Aurora in `FieldFxLayer` (dritte Aurora-Fassung, anderer Look, nur über `?fx=dom` erreichbar) samt der
  ganzen Komponente, `FX_RENDERER` + der FX:PIXI/DOM-Schalter im Perf-HUD, und `FxSpike.jsx` (die Spike-Seite hatte
  ihre eine Frage beantwortet und hielt sonst nur eine zweite Fassung derselben Shader am Leben).
- **Die Vorschau im Anpassen-Bildschirm fährt jetzt denselben Pfad wie das Spiel.** Vorher lag genau dort die
  größte Drift-Gefahr: der Showcase mountete noch die raw-Canvas, das Spiel den Kompositor.
- **Leuchten verträgt KEINE Verkleinerung.** Es reitet auf den KONTUREN des Hintergrundbildes; grob gerechnet trifft
  die Glut die feinen Linien nicht mehr → „Hintergrund wirkt pixelig, Details gehen verloren" (Urteil am Gerät).
  Gemessene Abweichung zur alten Fassung (von 255, Handy-Viewport): 0,50 → 5,45 · 0,60 → 4,88 · 0,75 → 3,63 ·
  0,85 → 3,33 · **1,00 → 0,56**. Kein Knick, an dem man billig davonkäme.
- **Faktor 1 geht OHNE Render-Textur direkt auf die Bühne.** Der Umweg ist auch bei voller Auflösung nicht gratis:
  `Math.round` auf eine krumme CSS-Breite lässt Textur- und Bildschirmmaß auseinanderlaufen, das Sprite resampelt
  dann die ganze Fläche. Gemessen: 1,81 mit Umweg gegen **0,56** ohne. Sichtbar auf dünnen hellen Konturen.
- **Abnahme einer portierten Ebene: rechnen, nicht gucken.** Beide Pfade auf `animate={false}` (friert sie auf
  dieselbe Sekunde), Panel gegen Panel, mittlere Abweichung je Zeilenband ausrechnen. Für Leuchten: 0,0 von 255.
  Der Blickvergleich trägt nicht — bei additivem Magenta auf grünen Konturen hatte ich ein vertikal GESPIEGELTES
  Bild zuerst für richtig gehalten.
- **Vergleichsaufbau braucht das CSS des Spiels.** Ohne Tailwind bleibt eine raw-Canvas auf der HTML-Standardgröße
  300×150 (`w-full h-full` greift nicht) → man vergleicht zwei Auflösungen. Erst Canvas-Größen gegenprüfen.
- **`?fxs=<zahl>`** überschreibt den Auflösungsfaktor aller Ebenen (Preview/Dev) — der Regler, mit dem am Gerät
  entschieden wird. Der Perf-HUD zeigt ihn an, sobald er gesetzt ist.
- Wächter: `test/pixi-field-shader.test.js` prüft die Port-Regeln als reine Funktion (kein WebGL nötig) und baut
  JEDE registrierte Ebene — ein Port-Fehler fällt in Millisekunden auf statt am Gerät.
- **NICHT im Kompositor** (eigene Canvas, bewusst offen): die Pixi-Emitter für Glutfunken/Sternenfeld (`PixiStage`)
  und die Würfel-Matrix. Das sind Partikel-/Szenen-Effekte, keine Vollbild-Shader — die Registry müsste dafür
  beliebige Pixi-Container aufnehmen statt nur ein Shader-Quad. Eigener Entwurfsschritt, kein mechanischer Port.
  Ein Perf-Argument dafür gibt es nach der Messung oben ohnehin nicht.

### #perf-scroll + #perf-spend — Scroll-Gate und Zeichenrate 30 → 60 (mobil)
- **Aus dem Bild gescrollt = Effekte anhalten** (`src/ui/fx/useOnScreen.js`, `boardOn` in Battlefield). Es gab im
  ganzen Projekt KEINE Stelle, die auf Scrollen reagiert hat: `boardVisible` prüfte nur Phase und Tab-Sichtbarkeit.
  Die Spielseite ist auf dem Handy höher als der Viewport (Fraktions-Panels unter dem Brett) — wer nach unten
  scrollt, ließ alle Effektschleifen mit voller Rate für ein Bild laufen, das niemand sieht. Derselbe Hebel wie
  #perf-overlay, nur die andere Achse. Bewusst `IntersectionObserver` statt `scroll`-Listener: ein Handler mit
  `getBoundingClientRect()` erzwingt je Scroll-Frame ein synchrones Layout, verursacht also genau die Kosten, die
  er sparen soll. `rootMargin: 200px` startet die Effekte VOR dem Einscrollen (sonst sieht man das Anlaufen).
- **`DRAW_HZ_COARSE` bleibt 30 — 60 wurde probiert und verworfen.** Nach dem Umbau war Luft da (p50/p95 = 17 ms),
  also stand der Standard kurz auf 60. Am Gerät verglichen (`?hz=30` im selben Build): **kein sichtbarer
  Unterschied** → die Verdopplung ist reiner Verlust, doppelte Füllarbeit in Akku und Wärme ohne Gegenwert.
  Merksatz für den nächsten Anlauf: das frühere „ruckelt trotz 60 FPS" lag NICHT an der Rate, sondern an ihrer
  Ungleichmäßigkeit (`frameMinMs`, Halbframe-Toleranz) — das ist längst behoben. Wer erhöhen will, braucht einen
  Effekt, dem man es ANSIEHT; die weichen Ambiente-Ebenen sind es nicht. **`?hz=<zahl>`** hält die Frage messbar.
- **EINE Wahrheit:** Kompositor, Prunks (`gottMaxFPS`), `CardFxStage`, Hologrid-Slice und `PixiStage` holen die Rate
  jetzt alle aus `mobileTier`. Vorher stand die 30 an fünf Stellen einzeln. Rangiert ein Effekt bei 60, ist DIESER
  Knopf die Stelle — kein zweiter Wert daneben.
- `frameMinMs` behält die halbe Frame-Toleranz relativ zur eingestellten Rate (1000/hz − 8) und bremst gar nicht
  mehr, wenn der Deckel jenseits der Bildschirmrate liegt. Der Wächter (`test/mobile-tier.test.js`) prüft jetzt das
  VERHÄLTNIS statt der festen 30 — sonst hätte er nur gemeldet, dass sich der Standard geändert hat.

### #perf-holo — Holo-Würfel: dieselbe Diagnose wie bei der Supernova, nur kleiner (2026-08-17)
Nicht die Füllrate, sondern die **GC**. Die Zeichenschleife baute pro Frame ~190 Wegwerf-Arrays: je Ecke ein
Vektor UND ein Projektions-Ergebnis (8 Blöcke × 8 Ecken = 128 allein dafür), dazu je Block Mittelpunkt,
Punktliste, Farbmischung und die `passes`-Literale. Bei 30 fps sind das ~5800 kurzlebige Objekte je Sekunde.
- **Behoben ohne jede Look-Änderung**: ein vorab angelegter Punktpuffer (`Float64Array`), EIN wiederverwendeter
  Vektor, Farben als Skalare statt über `mix()`/`intOf()`, Pass-Kennungen als Modul-Konstanten. Hot Path
  alloziert jetzt **nichts** mehr (~190 → 0 je Frame).
- **Die Tiefensortierung ist auf `lite` ersatzlos entfallen.** Sie ist der Maler-Algorithmus für die gefüllten
  Flächen — und die sind auf lite aus. Übrig bleiben rein ADDITIVE Kanten, und additives Blending ist
  reihenfolge-unabhängig. Die Sortierung lief dort also jeden Frame umsonst.
- Scratch-Puffer liegen **je Instanz**, nicht modulweit: der Effekt kann doppelt leben (Spiel + Werkstatt-
  Vorschau) und beide würden sich sonst im selben Frame denselben Puffer überschreiben.
- **Gezählt, nicht am Gerät gemessen** — die Einsparung ist aus dem Code abgeleitet. Der nächste Hebel wäre
  `resLite` (1,25 → 1,0 wie bei der Supernova, ~36 % weniger Fill), aber die 1,5-px-Kernlinien werden ohne
  MSAA sichtbar treppig; das gehört an ein echtes Gerät, nicht auf den Schreibtisch.

### #perf-meteor2 — „noch weniger Meteoriten": Anzahl bei Turbo, Fläche im späten Lauf
Die drei Deckel aus Runde 1 (`starfieldBudget.js`) machen jeden EINZELNEN Kometen billiger, die Menge blieb.
Runde 2 setzt an den zwei Achsen an — **bewusst getrennt, weil sich das Halbieren sehr unterschiedlich anfühlt**:
- **Turbo → Anzahl.** `cometStride`: unter dem Boden von `cometLifeS` (Stich-Takt < `SHOOT_DUR/MAX_SPEEDUP`
  = 500 ms) feuert nur noch jeder ZWEITE gewonnene Stich. Bei MAX (~350 ms Takt) fallen die gleichzeitigen
  Kometen damit von 2 auf 1. Oberhalb des Bodens endet jeder Komet ohnehin mit seinem eigenen Stich, dort
  wäre Auslassen reiner Verlust — deshalb greift es exakt erst ab da.
  **Einheitenfalle:** `sweepDurMs` ist in ms, `fullS` in Sekunden. Der erste Wurf verglich beides direkt; der
  Test hat es gefangen, nicht das Auge.
- **Spätes Spiel → Fläche.** `cometSize`/`SIZE_CAP_LITE = 2.1` deckelt `TIER_SIZE[4]` (3 → 2,1) — Fill geht
  quadratisch, also **halbe Fläche** ((2,1/3)² = 0,49) für den gottgleichen Riesen, der im späten Lauf der
  Dauerzustand ist. Alle Stufen darunter liegen unter dem Deckel und bleiben unberührt; 2,1 > 2 hält den
  Abstand zu „Irre", die Tier-Leiter kippt nicht um.
  **Hier NICHT die Anzahl halbiert, und das ist die eigentliche Entscheidung:** bei Normaltempo kommen die
  Stiche einzeln, jeder Komet gehört sichtbar zu seinem Stich. Jeden zweiten wegzulassen liest sich als
  Fehler, nicht als Sparmaßnahme. Wer das doch will: `cometStride` um eine Tier-Bedingung erweitern.
- Der Zähler (`winSeq`) hängt am gewonnenen STICH, nicht am gespawnten Kometen — sonst verschöbe sich das
  Muster mit jedem Übersprungenen. Übersprungen wird VOR der Zufallsrechnung, sonst wanderte die Streuung der
  verbleibenden Kometen mit dem Tempo. Wächter: `test/starfield-budget.test.js`.

### #perf-nova — Supernova mobil getrimmt: die Kosten waren die CPU, nicht die Füllrate
Profil des Prunks im isolierten Messstand (Handy-Viewport, `lite`): **`buildLine` allein 673 von 1563 ms**, mit
`buildSimpleUvs`/`packIndex`/`packAttributes`/`buildContextBatches` rund **60 % der Hauptthread-Arbeit** — reines
Neu-Tessellieren derselben Striche, Frame für Frame. Das ist die Ergänzung zur alten Prunk-Regel („Kosten hängen an
Canvas-Pixeln pro Sekunde"): die gilt für die FÜLLRATE, aber ein `Graphics`, das je Frame `clear()`+neu aufzeichnet,
kostet zusätzlich auf der CPU — und zwar auf dem Thread, wo die Frames verloren gehen.
- **Gemessen (24-s-Fenster, Median aus 3 Läufen — kürzere Fenster streuen um Faktor 2, weil mal mehr, mal weniger
  Detonation hineinfällt): 2239 → 1423 ms Hauptthread (−36 %), davon Geometrie-Neubau 1135 → 477 ms (−58 %).**
- **Ohne jede Look-Änderung:** (1) die Tunnel-SPEICHEN haben eine unveränderliche Form (gleicher Innen-/Außenradius,
  gleiche Breite, gleiche Farbe — nur Winkel und Deckkraft wandern). Sie liegen jetzt EINMAL je Abspielvorgang als
  eigenes `Graphics` und werden nur noch gedreht. (2) Solange der Tunnel unsichtbar ist (vor dem Ein-, nach dem
  Ausblenden), wird die Canvas nicht mehr jeden Frame geleert UND gerendert.
- **Nur auf `lite` (Handy):** Tunnel-Ringe 10→8 · Chroma-Bänder 6→4 · Strahlen 24→16 · Speed-Streaks 30→20.
- **Falle beim Bänder-Kürzen:** `nBands` steuerte auch die BREITE der chromatischen Spreizung mit
  (`rb = R + (bu−0.5)·RING_SEP·nBands·H`). Weniger Bänder hätten den Farbsaum also schmaler statt nur gröber gemacht
  — eine andere Choreografie, keine Sparmaßnahme. Anzahl und Breite sind jetzt getrennt (`bandSpread`).
- **Nicht angefasst, wäre der nächste Schritt:** die ZWEI Vollbild-Canvas (Tunnel z-9 + Nova z-11, DOM-Karte z-10
  dazwischen). Sie zu bündeln hieße, die Karte wie beim Hologrid-Slice in die Pixi-Bühne zu backen — echter Umbau,
  keine Nachjustierung. Ebenso offen: `lite`-Dichte 1,0 → 0,85 (~28 % weniger Füllarbeit, dünne Linien werden ohne
  MSAA treppig) und der Tunnel mit halber Zeichenrate (halbiert seine Kosten ganz, Risiko sichtbares Ruckeln im Spin).

### #perf-overlay + #perf-hologrid (aus einem Perf-Report, 2026-08-17)
Report eines 409-s-Laufs (Meteor + Hologrid-Slice + Neonrahmen): 386 Ruckler, davon **99 in nur 4 Architekt-Besuchen**.
- **Report-Lesart (wichtig!):** `perfRecorder.js` schreibt einen Ruckler dem letzten Mark innerhalb von
  `MARK_WINDOW_MS = 400` zu. Stiche kommen alle 0,3–0,6 s → das Fenster deckt fast die ganze Spielphase ab. `trick`
  heißt deshalb „Ruckler beim Spielen", NICHT „der Stich-Effekt kostet das"; `phase:play ≈ 0` ist ein Artefakt, kein
  Beleg. Sauber sind nur Eimer ohne konkurrierende Marks (Architekt).
- **Alle Effekt-Schleifen liefen hinter Vollbild-Overlays weiter.** Die Lauf-UI samt Battlefield wird für JEDE Phase
  außer menu/gameover gerendert (`App.jsx`); ArchitectScreen & Co. sind `fixed inset-0` **darüber**, sie ersetzen das
  Brett nicht. Gate war nur `document.visibilityState`. Jetzt: `boardVisible = active && phase === "play"` (App) →
  `Battlefield boardVisible` → `PixiStage active` · `CardEdgeGlow active` (ZWEI Instanzen: Spieler- + Gegnerkarte) ·
  `CardFxStage active`. Neue Dauer-Effekt-Ebene → an denselben Schalter hängen.
- **Hologrid-Slice baute je Sieg die ganze Bühne neu** (`clearScene()+build()`): Kartentextur backen + 12×16 = 192
  Kacheln à Texture+Container+Sprite+Graphics ≈ **~770 Pixi-Objekte pro gewonnenem Stich**. Jetzt `ensureScene()`:
  Bühne wird EINMAL gebaut, Neubau nur bei geändertem Raster/Kartengröße (`sceneKey`). Je Sieg bleiben: dasselbe
  Off-Canvas neu bemalen + `cardTex.source.update()`, `placeTiles()` + `armSweep()` (reine Arithmetik).
  Gemessen (Chromium, 38 Auslösungen): **Median 8,2 → 3,5 ms · max 23,9 → 6,1 ms**, Look unverändert.
  Wer hier anfasst: `restart()` ist der Loop-Pfad (Richtung bleibt), `armSweep()` würfelt sie neu.
- Offen/nicht angefasst: `COLS 12 × ROWS 16` (192 Kacheln Dauerlast während der ~2,5 s Animation) ist eine
  Look-Entscheidung; `LITE_GRID` (Parallel-Session: 0,45 → **0,28**) senkt sie auf „Ausgewogen" auf 4×4 = 16.

### #perf-warm Gottgleich-Prunk + Mobil-Ruckeln der WebGL-Felder
- **Prunk wärmt vor** (`warm`-Prop in allen fünf Prunk-Dateien, `gottMounted`/`gottWarm` in Battlefield): der Prunk
  hing an `gottTrigger > 0`, Chunk + `Application.init()` (Supernova: **zwei** Pixi-Apps) fielen damit in den ersten
  gottgleichen Sieg — gemessen 362 ms blockierter Hauptthread. Jetzt Aufbau beim ERSTEN Overlay (`boardVisible`
  false), wo ein Hitch unsichtbar ist. Zwei Fallstricke, beide abgesichert: (1) Pixi startet seinen Ticker in der
  Init selbst → der Warm-Pfad muss in `stopIdle()`, sonst rendert die leere Bühne den ganzen Lauf (nachgemessen
  214 → 2 Zeichnungen); (2) kommt der Sieg VOR dem Ende der async Init, merkt `startPlay()` das als `pending` und
  die Init holt es nach — sonst bliebe der erste Gottgleich stumm.
- **`minMs = 1000/30` war der Grund für „ruckelt trotz 60 FPS"** (alle drei raw-WebGL-Felder: Aurora, Neon-Brandung,
  Leuchten). Die Schwelle liegt exakt auf zwei 60-Hz-Frames → der übernächste Frame fällt knapp durch und die
  Zeichnung rutscht auf den überNÄCHSTEN. Simuliert: schon ohne Jitter 117× 33 ms + 55× 50 ms, also ~26 statt 30
  Zeichnungen/s und vor allem UNGLEICHMÄSSIG. Jetzt `1000/30 - 8` (halbe Frame-Toleranz) → 30,0/s, alle Abstände
  33 ms. **Der FPS-Zähler misst rAF-Frames, nicht Zeichnungen** — er zeigt bei gedeckelten Effekten immer die
  Bildschirmrate. Neue gedeckelte Schleife → dieselbe Toleranz einbauen.

### Level-up-Auswahl (Perk/Skill): gemessen — dieselbe Familie wie der Architekt-Mount
Aus drei Geräte-Reports fiel derselbe Befund: ALLE Ruckler und ALLE Long Tasks eines Laufs liegen in `phase:levelup`,
zusammen 271–417 ms in einem 0,2-s-Fenster, schlimmster Frame 200–233 ms. Das Spielen selbst war in denselben
Läufen sauber (0–1 Ruckler auf ~40 Stiche), Scrollen ebenfalls (0).
- **Es ist kein Skript-Hotspot.** Im Produktionsbuild profiliert (dev-Build ist wertlos: `validateProperty`/
  `warnInvalidARIAProps`/`jsxDEV` dominieren dort und existieren in Prod nicht) hat das ganze 11-s-Fenster nur
  223 ms JS, größter Posten die GC mit 40 ms. Keine teure Funktion.
- **Es ist der Mount selbst.** In 100-ms-Scheiben gemessen: die zwei Scheiben um das Erscheinen kosten 16 + 30 ms,
  davon **18 ms in EINEM Layout-Durchgang**; davor und danach 1–4 ms je Scheibe. Gesamt ~46 ms im Messstand —
  auf dem Handy passt das mit Faktor ~6 (ARM gegen Desktop-x86) genau auf die gemessenen 271–417 ms.
- Das Overlay hat nur **107 DOM-Knoten** (Architekt: 421), die Seite 420. Es ist also nicht die Größe des Overlays,
  sondern das erzwungene Layout der ganzen Seite beim Einfügen.
- **Unterschied zum Architekten, und der einzige Grund, es überhaupt weiter zu erwägen:** der Architekt wird 3–4×
  je Lauf besucht, die Level-up-Auswahl bis zu **50×**. In Summe also ~10 s blockierter Hauptthread pro Lauf statt
  ~0,3 s. Der EINE Hebel mit Belegen wäre, den Bildschirm zwischen den Zyklen gemountet zu halten (der Architekt-
  Messung nach kostet ein WIEDERHOLTES Layout desselben Screens nur 5–14 ms statt 55). Preis: dauerhaft gehaltener
  DOM + State, Risiko bei Fokus/Animation/Angebotswechsel. Beim Architekten war das Verhältnis schlecht — hier ist
  es offen und wäre ein eigener, sauber abzusichernder Umbau.
- **Blur war es NICHT** (naheliegender Verdacht, geprüft): die `@media (pointer: coarse)`-Regel in index.css nutzt
  `!important` und schlägt damit das inline gesetzte `backdropFilter`. Auf Mobile ist der Overlay-Blur aus.

### Level-up-Auswahl (Perk/Skill): gemessen — dieselbe Familie wie der Architekt-Mount
Aus drei Geräte-Reports fiel derselbe Befund: ALLE Ruckler und ALLE Long Tasks eines Laufs liegen in `phase:levelup`,
zusammen 271–417 ms in einem 0,2-s-Fenster, schlimmster Frame 200–233 ms. Das Spielen selbst war in denselben
Läufen sauber (0–1 Ruckler auf ~40 Stiche), Scrollen ebenfalls (0).
- **Es ist kein Skript-Hotspot.** Im Produktionsbuild profiliert (dev-Build ist wertlos: `validateProperty`/
  `warnInvalidARIAProps`/`jsxDEV` dominieren dort und existieren in Prod nicht) hat das ganze 11-s-Fenster nur
  223 ms JS, größter Posten die GC mit 40 ms. Keine teure Funktion.
- **Es ist der Mount selbst.** In 100-ms-Scheiben gemessen: die zwei Scheiben um das Erscheinen kosten 16 + 30 ms,
  davon **18 ms in EINEM Layout-Durchgang**; davor und danach 1–4 ms je Scheibe. Gesamt ~46 ms im Messstand —
  auf dem Handy passt das mit Faktor ~6 (ARM gegen Desktop-x86) genau auf die gemessenen 271–417 ms.
- Das Overlay hat nur **107 DOM-Knoten** (Architekt: 421), die Seite 420. Es ist also nicht die Größe des Overlays,
  sondern das erzwungene Layout der ganzen Seite beim Einfügen.
- **Unterschied zum Architekten, und der einzige Grund, es überhaupt weiter zu erwägen:** der Architekt wird 3–4×
  je Lauf besucht, die Level-up-Auswahl bis zu **50×**. In Summe also ~10 s blockierter Hauptthread pro Lauf statt
  ~0,3 s. Der EINE Hebel mit Belegen wäre, den Bildschirm zwischen den Zyklen gemountet zu halten (der Architekt-
  Messung nach kostet ein WIEDERHOLTES Layout desselben Screens nur 5–14 ms statt 55). Preis: dauerhaft gehaltener
  DOM + State, Risiko bei Fokus/Animation/Angebotswechsel. Beim Architekten war das Verhältnis schlecht — hier ist
  es offen und wäre ein eigener, sauber abzusichernder Umbau.
- **Blur war es NICHT** (naheliegender Verdacht, geprüft): die `@media (pointer: coarse)`-Regel in index.css nutzt
  `!important` und schlägt damit das inline gesetzte `backdropFilter`. Auf Mobile ist der Overlay-Blur aus.

### Architekt-Mount: gemessen, NICHT lohnend (bitte nicht nochmal aufrollen)
CPU-Profil des `ArchitectScreen`-Mounts mit einem ECHTEN Zyklus-47-Zustand (über `sim/run.js` + Policy-Spion
abgegriffen), 412 px: Mount ~97 ms · **Layout 52 ms** (2 Durchgänge) · Style 6 ms · Skript 8 ms.
- `getBoundingClientRect`: 82 Aufrufe, davon **55,5 ms in EINEM** — das erzwungene Erst-Layout. Die 80 Zellen-Reads
  in `measure()` kosten zusammen **0,3 ms**. Also KEIN Layout-Thrashing, und der `useLayoutEffect`-Zellen-Loop ist
  unschuldig. Ein wiederholtes Layout desselben Bildschirms kostet nur 5–14 ms.
- Heißt: es ist das inhärente Erst-Layout eines großen Bildschirms bei 421 DOM-Knoten, keine teure Funktion.
  Verschieben (useEffect statt useLayoutEffect) teilt den Long Task, spart aber keine Arbeit und lässt den
  Gebäude-Rahmen einen Frame lang fehlen. Einziger echter Hebel wäre, den Screen zwischen den 3–4 Besuchen
  gemountet zu halten (~45 ms je Folgebesuch) gegen dauerhaft gehaltenen DOM+State — schlechtes Verhältnis.
- Messstand-Vorbehalt: die 2 Layout-Durchgänge sind vermutlich Webfont-Nachladen auf frischer Seite; im laufenden
  Spiel steht die Schrift schon → real eher ~26 ms Layout.

### #ruhe — Hub-Palette: ZWEI Farbrollen statt vier (2026-08-17)
Der Startbildschirm wirkte unruhig, und es lag nicht am Layout: er trug den kompletten Logo-Verlauf
(Cyan · Blau · Violett · Gold) als Palette, dazu Discord-Blurple und Grün/Rot für Seed-Meldungen. **Farbe war
Deko statt Signal** — die vier Kachel-Kanten liefen den Verlauf in Lesereihenfolge nach und unterschieden damit
nichts. `BLUE` war nicht mal eine eigene Farbe, sondern der Übergangswert Cyan→Violett; **ersatzlos entfallen**.
- **Die Regel** (`StartScreen.jsx`, Konstanten-Block trägt die volle Begründung): `CY` Handlung (einzige Farbe
  auf voller Sättigung) · `AM` Währung · `RANK` Angebot (Rangliste/Tutorial) · `NEU` nichts zu melden.
  Kachel-Kanten: **Gold = hier liegt ein Guthaben** (Upgrades/Werkstatt), **Neutral = nur nachschlagen**
  (Bestenliste/Statistiken).
- **Alles außer `CY` ist um 42 % entsättigt** (sRGB-Sättigungsmatrix, s = 0,58 — die Rechnung hinter
  `filter: saturate()`). Bewusst **feste Hexwerte statt eines Filters** am Wurzelknoten: der erzeugte einen
  Stacking-Context, bräche das `backdrop-filter` der Bonus-Leiste und färbte ab 1400 px Bodenband und
  Deckfarben mit ein. Werte: Gold `#f2a83a`→`#d6ab6b`, Rangliste `#9b82f0`→`#6696a4`, Marke vierstopfig
  entsättigt (`.as-wordmark`).
- **Glow-Budget = 1**: nur `.as-cta-primary` leuchtet. Bonus-Balken (`boxShadow` raus) und `.as-hub-num`
  (`text-shadow` raus) haben ihren Schein verloren. Neue Dauer-Leuchtquelle im Hub → hier begründen.
- **Ambient-Glow**: drei Farbblasen → **eine** kühle Ellipse (`.as-wm-glow`), Höhe **380 → 190 px**. Die
  Kopfzone war dreigeteilt eingefärbt und der Grundton wanderte beim Lesen nach unten.
- Guthaben-Zahlen: **Zahl neutral (`#dcdce4`, 19→16 px), nur die EINHEIT bleibt gold** — sie sind Kontostand,
  kein Angebot. · Radien **16/12/8 → durchgehend 12 px** (`rounded-xl`; Ausnahmen: Discord-Kreis, 4-px-Wochen-Chip).
  · **Press Start 2P am Wochen-Chip raus** → damit entfallen zwei Sonderbehandlungen (`textShadow:"none"` gegen
  den `.font-pixel`-Glow, und die Bonus-Zeile durfte den Font wegen doppelter Laufweite gar nicht tragen).
- **GILT NUR UNTERHALB 1400 px.** Ab dort ziehen Knöpfe, Marke und Glow ihren Ton aus dem aktiven Deck
  (1400-px-Sektion in `index.css`) — diese Palette greift dort nicht. Bewusst **nicht** angefasst: die
  Desktop-Status-Tafel (Woche weiter in `VI`), `.as-hub-list`-Zeilentöne, der `font-pixel`-Tafeltitel und das
  Discord-Blurple (Markenfarbe).
- Offen: der `!onbDone`-Zweig der Bonus-Leiste (Violett) ist seit #316 unerreichbar und wurde nicht mitgezogen.

### #deck-mobil — Deck-Hintergrund + Deckfarben jetzt auch am Handy (2026-08-17)
Bis hierher war der Deck-Bezug des Hubs eine reine Desktop-Sache (Bodenband + Deckfarben ab 1400 px).
Jetzt trägt auch die Handy-Fassung ihn — **Desktop bleibt unangetastet, es bekommt sein eigenes Layout.**
- **Die Bilder waren längst da**: jedes der 40 Spielfelder hat `mobile.jpg` (1080×810) neben `desktop.jpg`
  (1600×640), beide in `BATTLEFIELD_ASSETS` (`src/ui/cosmeticAssets.js`). Der Hub las nur `.desktop`.
  **Kein zusätzliches Byte im Bundle**, nur ein zweiter Aufrufer.
- **Eigene Ebene, nicht eine mit Media-Query** (`.as-hub-bg*` in index.css, gerendert in StartScreen.jsx):
  andere Bilddatei, anderer Zuschnitt, andere Verschleierung. `fixed` aus demselben Grund wie beim
  Bodenband (der Hub sitzt in einem gedeckelten Container).
- **Zuschnitt `background-position: 20%` — die eine Entscheidung, die hier steckt.** Bild 4:3, Fenster ~1:2
  → `cover` behält nur **35,7 % der Bildbreite**. Die Bilder haben ihr Motiv aber AM RAND und die Mitte
  bewusst leer (dort liegt im Spiel das Brett) → mittig zugeschnitten sieht man 40× dieselbe Leerfläche
  (Oni verliert Dämonenkopf UND roten Mond). `0 %` = harte Bildkante, ein senkrechtes Randdetail läuft
  durch den Schirm. **20 % = Fenster auf 12,9–48,6 %.** Regler: 0 % Kante … 50 % Mitte.
- **Deckfarben auf ALLEN Breiten**: `.as-cta-primary`/`.as-ranked-btn`/`.as-tut-btn`/`.as-wordmark`/
  `.as-wm-glow`/`.as-week-chip` ziehen `var(--deck-a1/a2)` jetzt in der GRUNDREGEL. Die wortgleichen
  Dubletten in der 1400-px-Sektion sind **ersatzlos entfallen** — sie waren genau die Doppelpflege, vor der
  die Datei sonst überall warnt. Rückfall ist der #ruhe-Ton. `--deck-a1/a2` hängen an `.app-root` (App.jsx,
  auch im Menü gesetzt). Wortmarke mobil **statisch** — die Lichtwelle bleibt Desktop (Dauer-Animation).
- **Kacheln + Seed-Feld = getöntes Glas** (`.as-hub-tile`, neu `.as-hub-field`): deckende `#12121a`-Flächen
  lasen sich auf dem Bild als *Löcher darin* statt als Schicht darüber. Jetzt 58→68 % Deckkraft plus
  13→7 % `--deck-a1`. **Der Deck-Bezug kommt aus der FLÄCHE, die Signalfarben bleiben** (Gold = Guthaben).
  Ab 1400 px setzt `.as-hub-list .as-hub-tile` alles zurück (dort ist die Bank EINE Glasscheibe).
- **Blur-Warnung**: die projektweite Abschaltung auf `pointer: coarse` trifft nur `.fixed.inset-0` /
  `.absolute.inset-0` / `.as-statusbar` — **diese Kacheln fallen NICHT darunter und blurren am Handy
  wirklich** (6 Flächen statt 1). Menü hat keinen Frame-Loop, aber wer dort Frames sucht, fängt hier an.
- `color-mix` kompiliert wie überall als **Fallback + `@supports`-Block** (s. Knopf-Kommentar): die erste,
  „platte" Zeile im Build ist der Fallback, nicht das Ergebnis. Nicht erschrecken.
- **Offen/nicht geprüft**: nur 3 der 40 Decks angesehen (Ascension · Oni · Pflanze), am Schreibtisch statt
  am Gerät. Bei hellen Decks steht der goldene Guthaben-Stripe auf goldgetönter Kachel auf goldenem Bild —
  das #ruhe-Signal ist ausgerechnet dort am schwächsten. Abnahme gehört in den `/test/`-Slot.

#### Schleier-Deckel — alle 40 vermessen (`npm run bf:helligkeit`)
Gemessen wird die mittlere Luma im **Handy-Ausschnitt** (nicht im ganzen Bild), roh und mit Schleier.
- **Lesbarkeit ist NICHT das Thema**: schlechtester Kacheltext-Kontrast über alle 40 Decks und alle Pixel
  **10,6:1** (WCAG AAA verlangt 7:1). Der Deckel ist eine **Optik-**, keine Sicherheitsentscheidung.
- **Der Schleier leistet schon den Löwenanteil**: roh 8,8–57,2 (Faktor 6,5) → mit Schleier 15,1–35,1
  (Faktor 2,3), Median 19,9. Grund: die Schleierfarbe hat selbst Luma ≈ 19 und wirkt als Anziehungspunkt —
  sie zieht dunkle Bilder hoch und helle herunter.
- **32 von 40 liegen zwischen 15 und 24.** Sichtbar heraus fallen **zwei**: `bf_gottgleich` 35,1
  (Median +76 %) und `bf_pflanze` 29,0 (+46 %). Ein Deckel bei 24 träfe 8 Decks — sechs davon nur 1–8 %
  darüber, dort korrigiert man Rauschen. **Eingetragen sind deshalb genau zwei** (`BATTLEFIELD_VEIL` in
  `cosmeticAssets.js`, Faktor 1,54 / 1,38).
- **Deckel statt Normalisierung, bewusst**: alle Decks auf dieselbe Helligkeit zu ziehen nähme ihnen den
  Charakter (Ascension IST ein Lichtdom, Kosmos IST das Weltall). Die Liste begrenzt nur nach oben;
  dunkle Decks bleiben dunkel. Ein Eintrag ist eine **Ausnahme**, keine Pflege-Tabelle für 40 Werte.
- Technisch: `--vk` skaliert die vier Alpha-Stützstellen in `.as-hub-bg-veil` (`min(1, calc(…))`, sonst
  Alpha > 1). Wächter: `test/hub-deck-bg.test.js` prüft die Naht über drei Dateien als Quelltext-Ratsche.
- **Was die Messung nicht kann**: sie sieht Durchschnittshelligkeit, nicht Unruhe — ein Bild mit ruhigem
  Mittel, aber harten Kanten quer durch die Kachelzone kann störender sein als ein gleichmäßig helleres.

### Tuning-Größen (bewusst kommentiert, bei Bedarf nachdrehen)
- **Groß-Ansagen** (Battlefield `BIG_SCORE_TIERS`): je Stufe `rank` + `cool` (Stark 2800/Brutal 2200/Irre 1600/
  Gottgleich 2500 ms) + `BIG_DOMINANCE_MS=1400` (niedrigere Stufe kurz nach höherer unterdrückt → „nur die höchsten").
  Epische Serien/Lawine-Ansagen haben eigene 1×-Logik.
- **Screenshake** Amplitude je Tier: `[0,3,5,4,7]` (Irre ganz leicht, Gottgleich reduziert).
- **Score-Anzeige** (StatusBar) verkleinert bei ≥100M (21px) / ≥1Mrd (19px), sonst 25px.
- **Musik** (`src/ui/music.js` `TIER_MIN`): calm <10M · mid 10–30M · hot 30–70M · overdrive 70–90M · overdrive+ 90M+.
- **Showcase-Farbkontrast** (`PREVIEW_LOOK`): Aurora auf Moonwhale (blau), Glutfunken auf Kosmos (magenta) — damit
  Standard↔Deckfarbe-Toggle sichtbar ist. Ember-DOM-Farbe schaltet per `deckTint` (Standard `#ff6a30` = Pixi-FIRE).

### iPhone (#314) — nur strukturell, NICHT auf echtem Gerät verifiziert
`.app-root` (index.css): `100dvh` + Safe-Area-Insets als Padding; `text-size-adjust:100%`. Feinjustierung einzelner
„zu großer" Elemente braucht On-Device-Test.

### #ios-glow — hohl gesetzte Zahlen leuchten auf iPhone anders (2026-08-16)
Kartenzahlen und Score-/Krit-/Formations-Floats sind HOHL gesetzt (`-webkit-text-fill-color: transparent` +
`-webkit-text-stroke`). Der Glow lag als `text-shadow` daneben — und `text-shadow` leitet sich laut Spec aus der
**Glyphen-Geometrie** ab, nicht aus den gemalten Pixeln: WebKit/iOS malt deshalb den Schatten der VOLLEN Ziffer,
die 0-Versatz-Schichten füllen die Punze und ersäufen die Kontur (= „unscharf/überbelichtet"), während Blink nur
die gezeichnete Kontur schattiert (= scharfe Röhre). Zwei Looks aus einer Regel.
- **Regel für neue hohle Texte:** Glow IMMER über `filter: drop-shadow()` (arbeitet in beiden Engines auf dem
  gerenderten Alpha). Dieselbe Begründung stand schon an `chromeFilter` (Battlefield.jsx) für die Groß-Ansagen.
- Zentral in `index.css` unter `[data-skin="crt"] .card-num, .neon-num`; die Aufrufer setzen nur noch
  `--num-glow-c` / `--num-glow-c2` / `--num-glow-s` (`floatNumStyle` in Battlefield.jsx, `numGlow` in Card.jsx).
  Wer den Stil benutzt, muss die Klasse `card-num` **oder** `neon-num` tragen — sonst fehlt der Glow komplett.
- **Zweiter Fehler, gleiche Stelle:** der `@media (pointer: coarse)`-Deckel war für die Zahlen wirkungslos, weil
  der Glow INLINE stand (Inline schlägt Stylesheet) — das iPhone behielt den vollen 40px-Halo. Deshalb liegen die
  Radien jetzt in Custom Properties. Die tote `--num-shadow`-Variable (nie in CSS gelesen) ist entfallen.
- **NICHT auf echtem iOS-Gerät verifiziert** — Build/Tests/Lint grün, der Beleg steht aus (Test-Slot am iPhone).

### #ios-word — Gottgleich-Wortmarke doppelt/versetzt auf iOS (2026-08-16)
`src/ui/fx/GottChromeWord.jsx` zeigte auf dem iPhone einen zweiten, größeren, dunklen Geister-Schriftzug neben dem
eigentlichen Wort (In-Game-Ansage **und** Shop-Vorschau). Drei Konstruktionen liefen auf WebKit auseinander, alle drei
sind jetzt vermieden — die ausführliche Begründung steht im Dateikopf.
1. **Animation UND `filter` lagen auf DEMSELBEN Element.** Der Aufrufer legt seine Pop-Animation (`as-bigscore` /
   `ws-gott-word`, beide mit `scale`) über `style` ab, der Glow ist ein CSS-`filter`. WebKit invalidiert die
   Filter-Region über die skalierenden Frames unvollständig → der Glow eines FRÜHEREN, größeren Keyframes
   (Überschwinger `scale(1.1)`) bleibt stehen = die Geister-Kopie. **Regel: Animation außen (`<div>`), Filter innen.**
   Die nicht-epischen Stufen (Stark/Brutal/Irre) hatten diese Trennung immer und waren darum nie betroffen.
2. `textLength` + `lengthAdjust="spacingAndGlyphs"` mit `text-anchor="middle"` → WebKit richtet am NATÜRLICHEN statt
   am angepassten Wortmaß aus (seitlicher Versatz). Ersetzt durch EINE gemessene Streckung (`getBBox`), die identisch
   auf sichtbaren Text und Masken-Text geht — die beiden können nicht mehr divergieren. Nachmessen bei
   `document.fonts.ready`, sonst friert die Skalierung auf der Ersatzschrift ein.
3. Keine `font-family` am SVG-Text → erbte `ui-monospace` aus dem Body, das je Plattform anders auflöst (SF Mono auf
   iOS). Jetzt auf **Orbitron** gepinnt (gebündelt, dieselbe Schrift wie die Kartenzahlen). **Das ändert das Wortbild
   auf ALLEN Plattformen leicht** — bewusst, für den einheitlichen Look; `FONT` in der Datei ist die eine Stellschraube.
- Punkt 1 gilt auch für die Krit-/Formations-Floats: deren Glow sitzt jetzt auf einem inneren `<span class="neon-num">`
  statt auf dem animierten `<div>` (der Score-Float hatte diese Struktur schon).
- **Ebenfalls nicht auf echtem iOS-Gerät verifiziert.**

### #370 Ranked-Rework (Wochen-Rangliste, ersetzt Standard/Meister)
EIN wöchentlicher Ranked-Modus, fixe tree-unabhängige Baseline, seed-deterministische Wochen-Modifikatoren.
- **Freischaltung** (`progression.js` `rankedUnlocked`): alle Deck-Unlock-Knoten besessen UND jeder `RANKED_ARCHETYPES`
  ≥1× in `profile.archetypeRunsCompleted` (Zähler in `storage.js` `recordRun`, nur `completed`-Läufe).
- **Baseline**: `reducer.js` START_RUN — `ranked` (String `"ranked"`, akzeptiert via `isRankedMode` auch Alt-`"meister"`)
  → `effProfile = null` (Tree ohne Wirkung), fixe 2 Rerolls/Phase, rareCap 4, shift 0.
- **Wochen-Mods** (`src/game/weekMods.js`, NEU): `WEEK_MODS` (10 neg + 9 pos), `WEEK_MOD_PAIRS` (4 Ausschluss-Paare,
  positiv gewinnt), `pickWeekMods(seed)` (3–5, ≥2 pos/≥1 neg, seed-rein). `hasWeekMod`/`weekModMag` = Naht-Leser.
- **Gating-Prinzip (WICHTIG)**: JEDE Mod-Wirkung ist an `state.weekMods` gegated (nur Ranked gesetzt) → Nicht-Ranked-/
  Sim-Läufe byte-identisch. Deshalb blieben die 1000+ Bestandstests grün. `weekMods` wird in `sBase` gesetzt und über
  `resolveTrick`s `{...state}` durch alle Stiche getragen.
- **Alle 19 Nähte wirksam**: Phase 3a (reducer/START_RUN): blockForm/blockArch (`challengeBlock…`), enemyValue/cardValue
  (engine `oppValueMod`/`pValue`), energyEbb/energyFlood (`formationEnergyBase`), tightBuild/noBuildLimit (`architect.maxCover`),
  noReroll (`rerolls…=0`), perkCap (`rareCap→2`). Phase 3b: scarcePerks/scarceSkills (Angebots-Umfang), buildBoost/formBoost
  (Score-Stack, Bonus-Überschuss ×2), perkBlessing (`rareFloor→3`, symmetrisch zu rareCap via `tierWeightsForShift` minTier),
  doubleLeg (`PICK_LEGENDARY` bleibt in Phase, `legPicksMade`), skillFull (`state.skillSlots`, commitScale-Nenner bleibt Basis),
  legTakt (engine: `cycle%mag===0` → decision="perk" + legForce≥1), deckShuffle (engine formation: `shuffledOrder(playerOrder)`).
- **Board-String bleibt intern `"meister"`** (App.jsx record + LeaderboardScreen Wochen-Board + Champions), Seed segmentiert
  die Woche. Reiter heißen „Diese Woche · 🏆 Challenger · Regeln". DB-Rename auf `board='ranked'` bewusst NICHT gemacht
  (spaltet sonst das Champions-Archiv) — offen/Infra-Entscheidung.
- **Offen/Tuning** (Playtest): legTakt-Kadenz (aktuell 3–5 gerollt), exakte Cap-/Boost-Werte je Mod.

### Medien / Deploy-Struktur (#F-01, QA-Durchsicht)
Musik liegt in **`media/music/`** — bewusst AUSSERHALB von `src/` und `public/`, damit sie NICHT in jeden Slot-Build
wandert. `src/ui/music.js` importiert die Dateien nicht mehr, sondern baut URLs über `VITE_MEDIA_BASE`
(Dev `/media/` via Middleware in `vite.config.js`, Prod `/autostich/media/`). Veröffentlicht wird der Ordner EINMAL
zentral über `deploy-media.yml`; alle vier Slots zeigen auf denselben Pfad.
- **Ein geänderter Track braucht einen NEUEN Dateinamen** — ohne Build-Hash gibt es kein Cache-Busting.
- Neue Tracks: Datei nach `media/music/`, Zeile `const x = track("x")` in `music.js`, Eintrag in `POOL`.
  `test/music-assets.test.js` prüft beide Richtungen (keine toten Referenzen, keine verwaisten Dateien).
- `keep_files`: Unter-Slots (test/pixi/balancing) ersetzen ihren Ordner vollständig; der Root-Slot muss `true`
  behalten (sonst löschte er die Slots + `media/`) und prunt verwaiste Root-Assets NACH dem Publish.
- Hintergrund: dist/ ging dadurch von 163 MB auf 16 MB je Build, die Pages-Seite lag bei 1,71 GB (Limit 1 GB).

### Sprache / i18n (#sprache) — gilt für JEDEN neuen Anzeigetext
Autostich ist zweisprachig (DE/EN). **Jeder neue spieler-sichtbare Text gehört in `src/i18n/de.js` UND
`src/i18n/en.js`** — auch `title`, `aria-label`, `placeholder`, `alt`. Kein neuer Inline-String in der JSX.
- Schlüssel `<bereich>.<block>.<sache>`; Laufzeit-Zahlen als `{platzhalter}`; Zahlen über `fmtNum`/`fmtPct`
  (nie `toLocaleString`); Plural über `…_one`/`…_other` mit `count`; Tuning-Zahlen aus den Konstanten interpolieren.
- Begriffe: `docs/localization/uebersetzerpaket_pixi_2026-08-15.md` §3 ist seit 15.08.2026 **eingefroren** —
  eine deutsche Vokabel → **genau eine** englische (Durchlauf=cycle, Stich=trick, SP=TP, Aufstellungsphase=order
  phase, Formations-Energie=order energy, Episch=Epic, Stark=FIERCE, Gönn dir=LET’S GO!). Kein Synonym erfinden,
  keine Tabellenänderung ohne Rücksprache. Begründung je Begriff: `docs/localization/genre-terminologie.md`.
- `test/i18n-guards.test.js` erzwingt Schlüssel-/Platzhalter-Parität, Zahlformat, Terminologie und eine **Ratsche**:
  in migrierten Dateien (`MIGRATED`-Liste) darf kein Text mehr fest verdrahtet sein. Migrierte Datei → dort eintragen.
- `docs/localization/*.csv` ist **erzeugt** (`npm run loc:export`), niemals von Hand pflegen. Volle Begründung und
  Migrationsstand: `docs/localization/i18n.md`.
- **Sprachwahl:** Erstwahl im Namens-Dialog (unter dem Feld, wirkt sofort), danach Optionen → Sprache/Language.
  `SOURCE_LOCALE="de"` (Schreibsprache, Rückfall) ≠ `DEFAULT_LOCALE="en"` (was neue Spieler bekommen).
  Browsersprache wird bewusst NICHT befragt. Gespeichert in `options.lang` (`null` = nie gewählt).
- **Register-Muster** (an Rarität + Formationen erprobt): Register bleibt deutsche Quelle → `de.js` ERZEUGT seine
  Einträge daraus (nie abtippen) → `en.js` übersetzt → Auflösung zur Anzeigezeit über `src/i18n/labels.js`.
  Kein `import { t }` in einem Register (Zyklus über `de.js`).
- **Zahlen in übersetzten Registertexten**: EN tippt sie NICHT ab, sondern benutzt dieselben Konstanten-Ausdrücke
  wie DE (`${C.X}`, `${pct(C.Y)}`). Wächter „beide Sprachen nennen dieselben Zahlen" sichert die Naht ab.
- Migriert: `OptionsModal.jsx`, `StartScreen.jsx`, `UsernameModal.jsx`, Rarität, Formationstypen (Namen + Badges),
  **Skills (84)**, **Archetyp-Namen**, **legendäre Perks (14) + Kategorien**, **Perk-Familien (73 + 292 Stufen)**
  (`src/i18n/enSkills.js` · `enPerks.js` · `enFamilies.js`; Leser `skillDef`/`archMeta`/`perkDef`/`perkCat`/
  `familyDef` in `src/i18n/labels.js`), **Architekt-Gebäude** (41 Namen; Effekttexte erzeugt aus ~35 Satzbausteinen
  in `src/i18n/buildingText.js` — `familyEffectText` ist aus `architect.js` dorthin gewandert, ein `import { t }`
  dort wäre ein Zyklus), **Upgrade-Baum (26 Knoten)** + **Wochen-Mods (19)** (`src/i18n/enMeta.js`).
  **Glossar (109 + Wortformen)** (`src/i18n/enGlossary.js`; `tokenizeGlossary`/`glossaryEntries` sind nach
  `src/i18n/glossaryText.js` gewandert — die Fett-Regex wird jetzt JE SPRACHE gebaut statt einmal beim Laden).
  **Kosmetik (27 Sets + 13 FX)** (`src/i18n/enCosmetics.js`). **Alle Daten-Register sind damit migriert**;
  offen sind nur noch die Inline-Strings in `src/ui/*.jsx` + `src/App.jsx`.
- Kosmetik: Spielfeld- und Paketname leiten sich im Register vom DECKNAMEN ab (`bfName`/`packName` in
  cosmetics.js/themes.js) — vorher stand jeder der 27 Namen dreimal. EIN Name je Set, auch auf EN-Seite.
- **Archetyp-Leitfäden** migriert (`src/i18n/enGuides.js`): verschachtelte Bäume werden über EINEN rekursiven
  Walker erfasst (`guideWalk.js` — ohne `t`, sonst Zyklus über `de.js`; Auflösung in `guideText.js`).
- Offene Klangfragen (Flavour) sammeln sich in `docs/localization/unsicherheiten_en.md` (Stand: freigegeben).
- Glossar-`match`-Listen sind KEIN Anzeigetext: sie steuern die Auto-Fettung und werden für EN **neu geschrieben**,
  nicht übersetzt. Jede Form muss exakt so im EN-Katalog vorkommen, sonst fettet sie nie.
- Wochen-Mod-`desc` ist eine Funktion der Stärke: `de.js` ruft sie MIT DEM PLATZHALTER auf (`m.desc("{v}")`)
  und bekommt so die Vorlage — kein Abtippen. Leser `weekModList` gibt `desc` wieder als Funktion zurück.
- Beim Übersetzen eines Registers die **Struktur** mitnehmen, nicht die Ausgabe: `families.js` erzeugt 292
  Stufentexte aus ~120 Quellen (`MUSTER_DESC`-Templates + indizierte Präzisions-Konstanten) — `enFamilies.js`
  spiegelt beide Sparmechanismen, sonst hätte EN 292 Pflegestellen statt 120.

### Merge `Autostich/pixi` → `Autostich_Test` (Health Check 2026-08-16)
Geprüft: Tests 1263 grün (84 Dateien) · ESLint 0/0 (282 Dateien, CI-Gate `--max-warnings=0`) · Build grün, auch als
Slot-Build (`DEPLOY_BASE=/autostich/test/ VITE_PREVIEW=1`) · `npm audit --omit=dev` 0 Funde (die 7 Funde stecken
ausschließlich in der Dev-Toolchain) · kein totes Modul (167 Quellmodule) · kein TODO/FIXME/`debugger`.
- **pixi ist inhaltlich eine OBERMENGE von Autostich_Test.** `git cherry` weist 6 der 8 Test-Commits als
  patch-identisch bereits auf pixi nach; die beiden übrigen (Zinseszins-Rework `99bf8c7`, CLAUDE.md-Branchwahl
  `be4ceee`) liegen inhaltsgleich als `7b2c3c4` bzw. wörtlich im Kopf dieser Datei. Beim Merge geht nichts verloren.
- **Trotzdem 15 Konfliktdateien / 26 Hunks** — dieselbe Arbeit wurde auf beiden Branches separat committet.
  Auflösungsregel: **pixi-Seite gewinnt** (`--theirs` beim Merge IN Autostich_Test). Hunks sichten, NICHT pauschal
  per `-X theirs` durchwinken (die Randkontexte unterscheiden sich). Betroffen: `engine.js`(4) · `perks.js`(5) ·
  `constants.js` · `reducer.js` · `families.js` · `skills.js` · `App.jsx` · `BuildSummary.jsx` · `ChargeBar.jsx` ·
  `GuideOverlay.jsx` · `PerkSelect.jsx` · `guides.js` · `music.js` · `test/engine.test.js`.
- **Eine echte Richtungsentscheidung:** `src/ui/ChallengeModal.jsx` ist modify/delete. Auf pixi gelöscht
  (#382 Challenge-Modus entfernt), auf test danach noch am Layout angefasst → **Löschung beibehalten** (`git rm`).
- **Deploy-Reihenfolge beachten.** Der Merge-Push bringt `media/**` neu auf Autostich_Test und triggert damit
  `deploy-media.yml` UND `deploy-test.yml` in derselben `concurrency`-Gruppe. GitHub hält pro Gruppe nur EINEN
  wartenden Lauf → der Test-Deploy kann als „cancelled" enden (schon einmal passiert, s. Kommentar in
  deploy-media.yml). Musik fällt dabei nicht aus: `/autostich/media/` ist auf gh-pages bereits mit allen 55 Tracks
  publiziert. **Nach dem Push Actions prüfen, ggf. `deploy-test` einmal neu anstoßen.** Nebeneffekt: der Test-Slot
  schrumpft durch `keep_files:false` von 1513 auf ~230 Dateien.
- **Speicherstände:** `PROFILE_SCHEMA_VERSION` 6 → 10 (Migrationsblöcke v<7…v<10 vorhanden, Pfad ab v1 lückenlos),
  `ACTIVE_RUN_SCHEMA` 1 → 2 → **angefangene Läufe werden verworfen** (bewusst; steht in den Patch Notes unter
  „Was entfällt"). Der Test-Slot läuft im `preview_`-Namensraum, die Hauptseite ist nicht betroffen.
- **Grüne CI ≠ Abnahme des Umbaus.** ~209 Test-Importe zeigen auf `src/game/`, 17 auf `src/ui/`, genau EINER auf
  `src/ui/fx/` — also auf das, was dieser Branch umgebaut hat. Der eigentliche Gate ist der manuelle Durchlauf im
  `/test/`-Slot: Musik (media-Pfad), Pixi-Effekte, Handy (Safe-Area + Kontextwechsel Shop↔Lauf↔Anpassen),
  beide „Effekte reduziert"-Stufen, Speicherstand-Migration.
- **Bewusst NICHT angefasst** (kein Merge-Thema, eigener Schritt): Entry-Chunk 584 kB über der Vite-Warnschwelle
  (der Pixi-Chunk ist sauber async abgetrennt — der `preload-helper`-Fix hält das); `.git` bei 403 MB aus früher
  doppelt committeter Musik unter `src/assets/music/` (eine Bereinigung schriebe die Historie um und träfe jeden
  Branch — erst sinnvoll, wenn alle Feature-Branches zusammengeführt sind).

### #datenschutz — Hinweis + ehrlicher Telemetrie-Text (2026-08-16)
`src/ui/PrivacyModal.jsx` (z-50, über allen anderen Overlays), erreichbar aus **drei** Einstiegen: Telemetrie-Zeile
der Optionen (Moment der Entscheidung) · Fuß des Startbildschirms (dauerhafter Einstieg) · Namens-Dialog beim
Erststart (dort wird der öffentlich sichtbare Nickname gewählt). Telemetrie bleibt **Opt-out** (Default AN) —
bewusste Entscheidung; geändert hat sich der TEXT, der bisher weniger nannte, als der Code sendet.
- Der Hinweis deckt **beide** Sender ab: Telemetrie (`autostich_telemetry`) UND Bestenliste (`autostich_scores`).
  Die Bestenliste ist die personenbezogenere Hälfte — der Nickname ist selbst gewählt und öffentlich.
- Kontaktweg ist der Projekt-Discord (`src/ui/links.js` — die URL lag vorher doppelt im StartScreen).
- **Zahlen nicht abtippen:** `UA_MAX` ist aus `game/telemetry.js` exportiert und wird als `{ua}` interpoliert.
  Der i18n-Wächter prüft nur DE↔EN, nicht Text↔Code — diese Naht hält allein der Export.
- `test/privacy.test.js` ist die Ratsche: kommt in `clientInfo()` ein Feld dazu, das der Hinweis nicht kennt,
  wird der Test rot. Ebenso, wenn einer der drei Einstiege bei einem Umbau wegfällt.
- **Offen, nur du entscheidest:** Supabase-Serverregion (bei US-Region ist es ein Drittlandtransfer und gehört
  benannt — steht im Supabase-Dashboard), Speicherdauer (aktuell gibt es keine Löschroutine, die Zeilen liegen
  unbegrenzt) und ob für ein öffentlich erreichbares Spiel zusätzlich eine Impressumspflicht greift.

### Sonstiges
- Bash-cwd persistiert zwischen Calls; nach `cd` in node_modules zurück nach `/home/user/autostich`.
- Kein PR anlegen außer explizit gewünscht. GitHub-Issues #312–#316 sind abgearbeitet; #370 Phasen 1–3 fertig (Phase 4:
  DB-Rename + Playtest-Tuning offen).
