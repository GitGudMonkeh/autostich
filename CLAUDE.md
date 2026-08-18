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
denselben Branch). Build (`npm run build`) + Tests (`npm test`, aktuell **1351 grün**) müssen vor jedem Push grün sein.
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
- **Aurora/Neon-Brandung laufen über den Feld-Kompositor** — in Preview WIE in Produktion, ohne env-Verzweigung
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

### #deckglow-raus — „Leuchten" ist ersatzlos entfernt (18.08.2026)
Grund war **Hitze auf dem Handy, nicht der Look**. Leuchten war die einzige Kompositor-Ebene, die (a) keine
Verkleinerung vertrug (Faktor 1,0 — sie reitet auf den Bildkonturen, s. #kompositor unten) und (b) GLEICHZEITIG mit
einem Hintergrund lief. Sie füllte damit als einzige die volle Panelfläche in voller Auflösung, 30×/s, den ganzen Lauf
— zusätzlich zu Aurora/Brandung. Ausgebaut wurden: Ebene + Shader (`deckglowShader.js` gelöscht), Registereintrag
(`GLOBAL_FX`, 5 DP), Options-Toggle `fxDeckGlow`, Shop-Vorschau `DeckGlowScene`, i18n-Schlüssel, Tests.
- **Mitgegangen, weil ohne Aufruferin tot:** der `stack`-Pfad in `FieldCompositor`/`FieldLayer` (mehrere Ebenen in
  EINER Bühne) und die ganze **Textur-Maschinerie** (`pickBfSrc`/`blankSource`/`loadFieldTexture`/`def.texture`) —
  Leuchten war die einzige Ebene mit `sampler2D`. Die Ebenen-LISTE im Kompositor bleibt eine Liste; eine zweite
  gleichzeitige Ebene kommt zusammen mit ihrer Aufruferin zurück, nicht auf Vorrat.
- **Besitz: gelöscht, NICHT erstattet** (Entscheidung des Users). Migration `v10 → v11` entfernt `fx:deckglow` aus
  `ownedCosmetics`, `normalizeFxOptions` wirft `fxDeckGlow` aus gespeicherten Optionen (sonst schriebe der
  `{...DEFAULT_OPTIONS, ...o}`-Merge in `loadOptions` den toten Schlüssel ewig weiter).
- Wächter stehen jetzt auf dem Kopf: `test/themes.test.js` prüft, dass NICHTS zurückbleibt (Key, Gruppe `bgglow`,
  Option) — ein versehentliches Wiedereinsetzen beim Merge eines älteren Branches fällt dort auf, nicht am Gerät.
- Die Messwerte unten (Abweichung je Auflösungsfaktor) bleiben absichtlich stehen: sie sind die Begründung DAFÜR,
  dass die Ebene nicht billiger zu haben war, und der Maßstab für die nächste konturen-nahe Ebene.

### #kompositor — EIN Renderpfad für die Shader-Feldeffekte (kein A/B mehr)
`src/ui/fx/FieldCompositor.jsx` ist EINE Pixi-Bühne mit einer `LAYERS`-Registry; jede Ebene rendert in eine eigene
Render-Textur (Kosten ∝ Fläche → quadratisch im Faktor) oder — bei Faktor 1 — direkt auf die Bühne. Ebenen:
**Neon-Brandung** (mobil 1,0) und **Aurora** (mobil 0,85 — beide gegengerechnet, s. #perf-dpr) — sie schließen einander aus, es läuft also immer
höchstens EINE. (**Leuchten/DeckGlow** war die dritte, mobil 1,0 — entfallen, s. #deckglow-raus.) Aufrufer ist
`src/ui/fx/FieldLayer.jsx` (`layer=` für die Ebene; den `stack=`-Pfad gibt es nicht mehr).
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
- **`DRAW_HZ_COARSE` steht seit 18.08.2026 auf 60 — zweite Kehrtwende, beide Male am Gerät entschieden.**
  Runde 1 (nach dem Kompositor-Umbau): 60 probiert, gegen `?hz=30` verglichen, **kein sichtbarer Unterschied** →
  zurück auf 30, weil doppelte Füllarbeit ohne Gegenwert reiner Verlust ist. Runde 2 (nach Deckglow-Ausbau,
  MSAA-Ausbau und `DPR_CAP_COARSE` 1,4 → 1,0): der Unterschied IST jetzt zu sehen. Das ist kein Widerspruch —
  vorher lief das Brett auf einer heißen, gedrosselten GPU und hätte 60 Zeichnungen ohnehin nie gehalten,
  sondern nur unregelmäßige geliefert.
  - **Der Preis, ausgerechnet:** die Füllarbeit pro Sekunde ist damit wieder da, wo sie vor dem DPR-Schritt war
    (1,0² × 60 = 60 gegen 1,4² × 30 = 58,8). Das gemessene „lauwarm, unter 10 % Akku" stammt aus einem Lauf bei
    **30 Hz** — der Wärmetest bei 60 steht aus. Wird es wieder warm, ist DIESE Zahl die Stelle, nicht die
    Auflösung: die trägt nachweislich mehr Bild pro Watt.
  - **Nebenwirkung, offen:** die feste 8-ms-Toleranz in `frameMinMs` ist auf einen 60-Hz-SCHIRM gerechnet. Bei
    einem Deckel von 60 stimmt sie für 60- und 120-Hz-Schirme, **auf einem 90-Hz-Schirm lässt sie jeden Frame
    durch → 90 statt 60 Zeichnungen/s** (bei Deckel 30 gab es das Leck nicht). Sauber wäre eine Toleranz als
    ANTEIL der Zielperiode (0,75 × Periode ergibt 30/30/30 bzw. 60/45/60 über 60/90/120 Hz). Bewusst nicht
    nebenbei geändert — die 8 ms sind hergeleitet und testgesichert.
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
- **Gezählt, nicht am Gerät gemessen** — die Einsparung ist aus dem Code abgeleitet.

#### #perf-holo2 — Auflösung runter, Linienbreite gegengerechnet
Zweiter Durchgang. Frage war „hilft es, den Würfel ~20 % kleiner zu machen?" — **nein, und die Rechnung sagt
auch warum.** Auf einem 360×340-Panel decken die 96 Kanten (7.200 px Linie × 1,5 px) rund **8,8 % der Canvas**
ab; der Rest ist die vollflächige transparente Ebene, die pro Frame ohnehin komponiert wird (dieselbe Messung
wie bei den anderen Prunks: Kosten ≈ Canvas-Pixel/s, fast unabhängig vom Bildinhalt). 20 % kleiner spart
deshalb 20 % von 8,8 % = **1,6 %** — und auf der CPU gar nichts, weil die Tessellierung an der SEGMENTZAHL
hängt (96, unverändert), nicht an der Länge.
- **Der Hebel ist `resolution`** (quadratisch): `resLite` 1,25 → 1,0 = **~35 % weniger Füllarbeit**.
- **Kleiner machen kompensiert das Aliasing NICHT.** Was über „treppig" entscheidet, ist die Linienbreite in
  GERÄTE-Pixeln — und die ist von der Würfelgröße unabhängig (Stroke-Breite steht in CSS-px). Ein kleinerer
  Würfel macht die Artefakte nur kleiner, nicht seltener.
- **Was kompensiert, ist die Breite:** `coreW` auf lite 1,5 → **1,9**. Über Geräte-Pixel gemessen ist die Linie
  danach exakt so breit wie vorher (1,5 × 1,25 = 1,875 gegen 1,9 × 1,0). Kostet ~1 Prozentpunkt der Ersparnis
  und kauft die Schärfe vollständig zurück. **Netto 34,6 % bei unveränderter Kantenschärfe.**
- Gröber abgetastet wird damit nur der Kern-Blitz — eine weiche, vorgebackene Radialtextur, also genau der
  Fall, in dem Auflösung am wenigsten trägt (dieselbe Begründung wie für `antialias: false`).
- **Merksatz für die anderen Prunks:** Auflösung senken ist fast immer richtig, aber jede Linie, die danach
  dünner als ~1,8 Geräte-Pixel läge, braucht ihren Breiten-Ausgleich mit. Ohne den tauscht man Fill gegen
  Aliasing statt gegen nichts. **Angewandt auf Laser-Fächer und Prisma-Kaskade** (17.08.2026):
  - **Laser-Fächer**: `resLite` 1,0 **+** Kernlinie × 1,25 auf lite (1,58 → 1,98 CSS-px, damit wieder
    1,98 Geräte-px wie vorher). Die BEAMS brauchen nichts — Sprites mit vorgebackener Verlaufstextur.
  - **Prisma-Kaskade**: `resLite` 1,0, **bewusst OHNE Ausgleich**. Die Ringe sind `THICK×H` ≈ 6,8 CSS-px
    breit und liegen auch bei 1,0 weit über der Grenze; ×1,25 wäre dort keine Kompensation, sondern eine
    sichtbare Look-Änderung.
  - **Sonnen-Puls ist als einziger noch auf 1,25** — nicht angefasst, offener Rest.
  - Wächter: `test/gott-resolution.test.js` bindet Auflösung und Breite aneinander. Grund: die zwei Zahlen
    stehen ~130 Zeilen auseinander (Zeichenschleife oben, `app.init` unten), und wer nur EINE zurückdreht,
    bekommt nicht „wie vorher", sondern schlechter als beide Zustände (zu fett bzw. zu dünn).
- **Nicht am Gerät verifiziert.** Alles gerechnet; ob 1,9 px auf dem Display wirklich wie vorher aussieht,
  entscheidet das Display.

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
- **Blur war es NICHT** — der Befund zum Level-up-Mount bleibt gültig, die BEGRÜNDUNG war aber falsch und ist am
  18.08.2026 widerlegt (s. #overlay-portal): die `(pointer: coarse)`-Regel griff bis dahin gar nicht, der
  Overlay-Blur lief auf dem Handy die ganze Zeit mit. Seit dem Fix ist er dort wirklich aus.
- **`contain: layout` am Overlay bringt NICHTS — gemessen, bitte nicht nochmal probieren (18.08.2026).** Die Idee
  war, die Layout-Invalidierung am Overlay abzuschneiden, damit der Mount nicht die Seite darunter mit-layoutet.
  Messstand: der ECHTE Overlay-Knoten wird als Klon in die laufende Seite eingehängt, Layout synchron erzwungen
  (`offsetHeight`), wieder ausgehängt; A/B ist ausschließlich `contain`, verschränkt gemessen (A,B,A,B), 180 Zyklen
  je Variante, Produktionsbuild in Chromium. **Handy-Viewport: 1,40 ms gegen 1,40 ms (−0,0 %) · Desktop-Viewport:
  1,30 gegen 1,40 ms.** Der Grund ist strukturell und hätte vorher auffallen können: ein `position: fixed`-Element
  ist vom Fluss seiner Vorfahren ohnehin abgekoppelt — die Aufwärts-Invalidierung, die Containment blockieren würde,
  gibt es hier gar nicht. `contain: layout` liefert nur, was `position: fixed` schon liefert.
- **Nebenbefund aus derselben Messung, und der ist der interessantere:** das Einfügen des 95-Knoten-Teilbaums samt
  erzwungenem Layout kostet **1,4 ms** auf Desktop-x86 — bei ~6× ARM-Faktor also ~8 ms am Gerät. Die 271–417 ms
  können damit NICHT überwiegend „das Layout des eingefügten Overlays" sein. Wo sie wirklich sitzen (React-Render,
  Stil-Neuberechnung, Paint/Raster, oder die Effekt-Umschaltung, die am selben `boardVisible`-Wechsel hängt), ist
  offen — und die nächste Messung, bevor jemand den persistenten Mount baut. Der wäre sonst ein großer Umbau auf
  eine unbelegte Ursache.

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
- **Blur war es NICHT** — der Befund zum Level-up-Mount bleibt gültig, die BEGRÜNDUNG war aber falsch und ist am
  18.08.2026 widerlegt (s. #overlay-portal): die `(pointer: coarse)`-Regel griff bis dahin gar nicht, der
  Overlay-Blur lief auf dem Handy die ganze Zeit mit. Seit dem Fix ist er dort wirklich aus.

### #overlay-portal — Overlay im Overlay: `backdrop-filter` bricht `position: fixed` (2026-08-18)
Gemeldet als „alter Lauf in der Statistik sieht kaputt aus". Reproduktion: in der Statistik **runterscrollen**, dann
einen Eintrag antippen — die Detailansicht erscheint um die Scroll-Strecke nach oben versetzt (Kopf mit dem Score
abgeschnitten) und bleibt dort hängen. Gemessen in Chromium mit dem echten Stylesheet: scrollTop 600 → Overlay
`top` = **−600 px**; mit Portal an `document.body` → **0 px**.
- **Ursache:** `backdrop-filter` macht ein Element zum CONTAINING BLOCK für `position: fixed`-Nachfahren. Die
  Statistik-Wurzel ist zugleich Blur-Ebene UND Scroll-Container (`overflow-y-auto`) → das Kind hängt am
  Scroll-Ursprung statt am Viewport. Das Umschalten auf `overflow-hidden` beim Öffnen half nicht: `scrollTop`
  bleibt erhalten. **Dieselbe Ursache stand schon am Kauffenster der Deck-Werkstatt** (CustomizeScreen, dort per
  Portal gelöst) — es ist der dritte Auftritt derselben Naht, deshalb jetzt ein Wächter.
- **Fix:** `RunDetail` und `GuideOverlay` rendern über `createPortal(…, document.body)`. Farbsicher, weil
  `--deck-a1/a2` für genau diesen Fall zusätzlich auf `:root` gespiegelt werden (App.jsx). React-Events blubbern
  weiter durch den REACT-Baum → Escape/Klick-außen unverändert.
- **Kein Fehler, obwohl es so aussieht:** `UpgradeScreen` rendert `DeckDetail` per `return <DeckDetail/>` — das
  ERSETZT den eigenen Baum, ist also keine Verschachtelung. Die Glossar-Wirte (Architekt, Aufstellung, Perk-/
  Skill-Auswahl) scrollen nicht in der Wurzel; `GlossaryOverlay` ist dort latent, nicht aktiv betroffen.
- **Zweiter, unabhängiger Fehler an derselben Stelle (#perf-C war wirkungslos):** der zentrale Blur-Deckel für
  Mobile hat NIE funktioniert. Zwei stille Schritte: (1) lightningcss behandelt `-webkit-backdrop-filter` und
  `backdrop-filter` als dieselbe Eigenschaft und behält beim Minifizieren nur die LETZTE — die Quelle schrieb den
  Standard zuerst, also fiel er aus dem Build; (2) ein wichtiges `-webkit-backdrop-filter` überschreibt in Blink
  ein INLINE gesetztes `backdrop-filter` NICHT (nachgemessen). Auf dem Handy lief damit jedes offene Overlay
  weiter mit Vollbild-Blur. **Reihenfolge in index.css deshalb NICHT umdrehen: Präfix zuerst, Standard zuletzt.**
  Prüfbar nur am BUILD, nicht an der Quelle: `grep backdrop-filter dist/assets/*.css`.
- Wächter: `test/overlay-nesting.test.js` — hält beide Bedingungen fest und schickt die Regel durch das echte
  lightningcss, statt Schreibweisen zu vergleichen. Er prüft zuerst, dass er die Naht überhaupt noch findet
  (sonst wäre er still grün).

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

### #kante-bündig + #kachel-glyph — Hub-Handy: eine Bahn, vier Wasserzeichen (2026-08-17)
- **Der Breiten-Trichter ist aufgegeben.** Die drei Bahnen (100 % Bonus/Start · 94 % Rangliste ·
  88 % Kacheln) sollten Rangordnung tragen; auf 358 px sind 6 Prozentpunkte aber nur ~21 px, also gut
  10 px je Seite — zu wenig für Absicht, zu viel für unsichtbar. Es las sich als schiefer Stapel.
  **Alle Blöcke fluchten jetzt auf 88 %**, der abgemessenen Grenze der Kacheln (bei 86 % bricht auf
  375 px die Überschrift „Deck workshop" um). Nachgemessen: alle Bahnen links 37 / rechts 338.
  Rangordnung tragen weiter Farbe, Höhe und Reihenfolge. Desktop unberührt (volle Spaltenbreite).
- **Die vier Verwaltungskacheln haben ein Wasserzeichen** (`TileGlyph` in StartScreen.jsx,
  `.as-hub-glyph` in index.css): Pfeil · vier Bausteine · Treppchen · Ring, unten rechts, 54 px,
  **9 % Deckkraft**, Farbe `color-mix(--deck-a1 62 %, #fff)`. Der Weiß-Anteil ist der Punkt — reine
  Deckfarbe schwankt über die 40 Decks zu stark in der Helligkeit, das Zeichen wäre mal da, mal weg.
  Damit bleibt die #ruhe-Regel heil: bei 9 % ist es Textur, kein zweites Signal neben dem Streifen.
  Ab 1400 px aus (dort tragen die Listenzeilen ohnehin Untertitel).
- **Die Formen liegen als PFADDATEN vor, nicht als JSX.** Eine Tabelle aus `<>…</>`-Fragmenten lässt
  die i18n-Ratsche anschlagen: ihr `>…<`-Greifer fischt den Schlüsselnamen der nächsten Zeile als
  „fest verdrahteten Anzeigetext". Wer hier Formen ergänzt, bleibt bei Daten.
- **Nebenbei behoben, war schon vorher kaputt:** Der „kaufbar"-Hinweis lief in JEDER Kombination über
  den Kachelrand (390/DE 11 px · 390/EN 18 px · 375/EN 25 px, sichtbar als „9 availabl…"). „Upgrades"
  (63 px) + „9 available" (74 px) brauchen 141 px, die Kachel hat 116–123 px Innenbreite — daran ist
  mit Innenabstand nichts zu retten. Am Handy steht deshalb nur noch **die Zahl** im goldenen Ring
  (Gold heißt dort bereits „Guthaben"), der volle Satz ab 1400 px und im `title`.

### #perf-blur + #perf-ring — die Menü-Framerate auf dem Desktop (2026-08-18)
Gemeldet: Werkstatt und Baum fallen auf 10–20 fps, **Mobile ist in Ordnung**. Es ist NICHT das Laden der Assets
(gemessen 2,5 s nach dem Öffnen, alle Bilder dekodiert, Kosten bleiben) — es ist der Effekt-Stapel, den der
Desktop-Pass selbst eingeführt hat. Gemessen im Produktionspfad bei 1723×1030, Werkstatt/Baum:
`wie war 12,3 / 8,1` → `Blur weg 26,1 / 22,8` → `zusätzlich Ring still 31,8 / 47,4`.
- **`backdrop-filter` ist der teuerste einzelne Posten** und lag DOPPELT: vollflächig am Wurzelknoten
  (`.up-root` · `.cz-root` · `.gd-dim`) und noch einmal an jedem Panel (`.up-nav` · `.up-page` · `.gd-nav` ·
  `.gd-page`). Jeder Repaint darüber zwingt den Filter zur Neuberechnung — dieselbe Falle, die
  `:root[data-reduced-fx]` für Mobile längst entschärft. **Genau deshalb war Mobile nie betroffen**: dort
  schaltet `@media (pointer: coarse)` den Overlay-Blur seit jeher ab.
  Optischer Preis: **0,10 (Werkstatt) / 0,37 (Baum) von 255** mittlere Bildabweichung — bei 82 % Überzug und
  93–95 % deckenden Panels bleibt nichts zu verwischen (zum Vergleich galten bei der Kompositor-Abnahme 0,56
  als nicht unterscheidbar). Die Wurzelknoten brauchen `none !important`, sie setzen den Blur INLINE.
  **NICHT angefasst**: `.as-glass` (Hub-Panels, 72–78 % über dem Deckbild — dort trägt der Blur wirklich) und
  `.up-branch` (unter 1400 px, auf dem Desktop nicht gerendert).
- **Der Ring wandert jetzt per `transform` statt `background-position`.** Letzteres ist eine PAINT-Eigenschaft:
  der Browser rasterte das ganze Pseudo-Element (bei `.up-page` ~1500×970) sechzigmal pro Sekunde neu. Jetzt
  zwei Boxen — `.as-ring-run` trägt die Maske und steht, sein `::before` ist ein dreifach gekacheltes Band und
  wird um genau eine Kachel (33,333 %) verschoben (nahtlose Schleife). Die Animation kostet damit nur noch
  ~3–4 fps statt ~14. **`as-ring` und `as-ring-run` sind ab jetzt ein PAAR** — Klasse ohne Kind = kein Rahmen.
  Die Werkstatt-Panels trugen den Ring als wortgleiche Kopie in eigenem `::before`; sie teilen jetzt die Klasse.
- **Was BLEIBT und eine Look-Entscheidung ist:** ein panelgroßes MASKIERTES Element kostet auch im Stillstand
  (22,4 gegen 35,9 fps ohne Ring) — die Maske wird pro komponiertem Frame angewandt. Zwei gemessene Auswege,
  beide offen: die zwei großen Panels (`.up-page`, `.cz-main`) auf einen statischen 1-px-Deckfarbenrand →
  **27,6 / 32,0**, oder gar kein Ring → 35,9 / 51,1.
  **Verworfen: die maskenfreie „Blende"** (Band ganzflächig, `::after` deckt alles außer 1 px). Bringt nur
  25 / 26,4 fps UND ändert das Bild um **8,27 von 255** (die Panelfüllung liegt doppelt → Innenfläche dunkler).
- **Messfalle, in die ich selbst getappt bin:** eine Ablation „ohne Maske" per `opacity: 0` misst *kein Ring*,
  nicht *Ring ohne Maske*. Wer hier weitermisst: die Ablation muss den Ring SICHTBAR lassen.
- Wächter: `test/desktop-perf.test.js`.

### #flach — der Baum lief auf flachen Fenstern aus dem Rahmen (2026-08-18)
Gemeldet von einem Laptop mit **1920×1200 bei 125 % Skalierung** — der CSS-Viewport ist damit **1536×791**, also
FLACH, nicht hoch. (Erst in die falsche Richtung gemessen; der Perf-HUD nennt Viewport und DPR, das ist die
Quelle der Wahrheit.) Dort standen Skill-Kacheln und Auswertung sichtbar UNTER der Panelkante und die Seite
scrollte 31–72 px: `.up-card` ist auf `height: 100 %` geklemmt, der Inhalt brauchte mehr.
- Zwei Ursachen: (1) auf der Fraktionsseite zieht die **Challenge-Karte mit dem großen Deck-Bild** die einzige
  Rasterzeile von `.up-facbody` auf ihre Höhe → `grid-template-rows: minmax(0, 1fr)` + `max-height: 100%` an
  der Karte. (2) Auf „Allgemein" passen Knotenspalten + Auswertung zusammen nicht → `.up-vgrid` scrollt, der
  Auswertungskasten bleibt stehen (er ist die Antwort auf die Frage, die man im Baum stellt).
- `.up-page` klemmt zusätzlich (`overflow: hidden`), gescrollt wird eine Ebene tiefer — sonst liefe die Ringkante
  beim Scrollen durch den Inhalt (dieselbe Naht wie `.cz-main`/`.cz-mainscroll`).
- Gemessen 1536×791: Überlauf 85 → 0 px (Allgemein) bzw. 44 → 0 px (Fraktion), Seiten-Scroll 72 → 0 px.
  Auf 1536×960 und 1920×1080 ändern die vier Regeln **nichts** (identische Werte).
- **Werkstatt und Leitfaden waren dort schon sauber** — beim Leitfaden greift das Ventil an `.gd-page .gd-cols`.

### #desktop-leitfaden — Leitfaden ab 1400 px gerahmt wie Baum und Werkstatt (2026-08-18)
Der letzte große Screen, der noch als **672-px-Modal** in der Mitte eines 1920-px-Bildes stand (35 % der Breite
genutzt, dafür ~2900 px Inhalt untereinander). Jetzt derselbe gerahmte Screen: Überzug `rgba(12,12,16,.82)` +
`blur(10px)`, Rand `16/48/18`, Panelglas `.93→.95`, Radius 14, `as-ring` — alles an `.up-root`/`.up-nav`/`.up-page`
**abgemessen, nicht neu erfunden**. Die vier Archetypen werden zur Nav-Spalte (300 px) statt zur Reiterzeile;
das sind dieselben vier Fraktionen, die im Baum schon als Spalte stehen. Zweitzeile der Nav ist **kein neuer
Text**, sondern `loop.center` aus den Leitfaden-Daten („STURM · nährt sich selbst"). Spalte endet am Inhalt
(`align-self: start` wie `.up-nav`), nicht auf voller Höhe.
- **KEIN zweiter Renderpfad.** `GuideOverlay.jsx` setzt die Klammern `gd-desk`/`gd-page`/`gd-cols`/`gd-col` in
  jeder Breite; unterhalb 1400 px sind sie `display: contents` (Basis-Regel in index.css) → Handy-Fassung
  DOM- und pixelgleich (nachgemessen: Schriftgrößen 15/13,5/10,5 px und Ring-Deckel 190 px unverändert).
  Nur Nav-Spalte und Seitenkopf hängen an `useIsWide()` — die sind DOM, nicht Anordnung.
- **Das Spaltenraster hängt an `.gd-page`**, nicht an `.gd-cols` allein: `DeckDetail.jsx` zeigt dieselbe
  `GuideBody` in einer schmalen Spalte und hat kein `.gd-page` → dort bleibt alles einspaltig.
- **Höhe füllt man NICHT mit Spalten.** Die Spalten teilen sich die Panelbreite, also ist die Inhaltshöhe immer
  *Inhaltsfläche ÷ Panelbreite* — egal auf wie viele Spalten verteilt (mit 3 und 4 nachgemessen: identisch).
  Der einzige Hebel ist die GRÖSSE; der Körper stand bis dahin in Handy-Maßen auf einem 1920er Bild und füllte
  70 %. Alles hängt jetzt an EINEM Wert `--gs` (Schrift, Polster, Abstände, Ringbreite) in **drei gemessenen
  Stufen**: `.95` ab 1400 px · **`1.2`** ab 1750 px UND 1000 px Höhe · **`.9`** im bestehenden
  `max-height: 950px`-Block (dort zusätzlich Rand 10/36/12 wie beim Baum).
  Gemessen (längste Spalte / Platz, alle vier Archetypen): 1920×1080 **85–95 %** · 1440×900 84–96 % ·
  1600×900 77–86 % · 1400×950 83–93 % · 1400×1080 85–95 % — **überall ohne Scrollen**. 2560×1400 bleibt bei
  54–62 % (Baum und Werkstatt haben dort dieselbe Luft; weiter aufblasen hieße 20-px-Fließtext).
- **Ohne die kleine Stufe liefe es über**: mit der heutigen Größe braucht Eis auf 1400×950 799 px bei 762 px
  Platz (105 %), auf 1600×900 106 %. Die Stufe ist Pflicht, nicht Feinschliff.
- **Ventil**: `.gd-scroll` ist auf dem Desktop `overflow: hidden` (wie die Werkstatt) — Überlauf würde
  ABGESCHNITTEN. Gescrollt wird deshalb INNEN an `.gd-page .gd-cols`, nicht am Panel: der `as-ring` sitzt mit
  `inset: 0` im Fluss und liefe sonst beim Scrollen mitten durch den Inhalt (dieselbe Naht wie `.cz-main`).
- **Erreichbarkeit — war der blinde Fleck.** Der Screen hing anfangs nur an der Skill-Auswahl IM LAUF und am
  GameOver; der „Leitfaden ›"-Knopf der Fraktionsseite öffnete `DeckDetail` auf dessen Reiter „Leitfaden"
  (derselbe Inhalt, aber im schmalen Modal). In den Menüs kam man also gar nicht hin. Seit 18.08.2026 öffnet
  der Knopf den gerahmten Screen. Zwei Fallstricke dabei, beide abgesichert: der Leitfaden rendert als
  **Geschwister** des Baum-Wurzelknotens (der schließt bei `onClick`, ein Klick im Leitfaden blubberte sonst
  dorthin und nähme den Baum mit), und `useEscape` bekommt `guideArch` als OBERSTE Stufe der Kette (beide
  Handler hängen am selben `window`-Listener — ohne den Zweig schlösse ein Tastendruck beide Ebenen).
- **Maßstab-Schwelle 1750 px ist gemessen, nicht gegriffen**: auf 1723×1030 (Fenster des Users) liefe schon
  `--gs 1.1` über (100 %), `.95` liegt dort bei 79 %. Wer die Schwelle senken will, misst vorher.
- **VIER Stufen, nicht drei** (18.08.2026 nachgezogen): `≤820 px` Höhe → `.82`. Ein Laptop mit 1920×1200 bei
  125 % Skalierung ist CSS **1536×791**; dort liefen Blitz und Eis mit `.9` um 1–6 % über und der
  Spaltenbereich fing an, intern zu scrollen. Mit `.82`: 1536×791 → 93 %, 1536×760 → 98 %, 1600×800 → 88 %.
  **Reihenfolge ist Teil der Regel**: beide `max-height`-Blöcke treffen auf ein 791-px-Fenster zu, die
  Spezifität ist gleich — der 820er MUSS nach dem 950er stehen. Andersherum ist er wirkungslos, und im
  Browser sieht man davon nichts (genau so ist es beim ersten Anlauf passiert).
- **Der Untertitel im Seitenkopf bricht um statt abzuschneiden** (anders als `.up-page-hint` im Baum, wo der
  „Leitfaden ›"-Knopf die Ecke braucht). Blitz ist mit **913 px** der längste der vier und passte auf
  1536 px CSS-Breite rechnerisch exakt, auf dem Gerät des Users nicht mehr. Zwei Zeilen als Deckel, die
  Kopfreihe trägt die Höhe **fest** (`min-height: 36px`) — sonst verschöben sich die Spalten beim Wechsel
  zwischen ein- und zweizeiligen Archetypen.
- Gemessen über zehn Fenstergrößen (1400×950 bis 2560×1400) und alle vier Archetypen: Füllung 62–98 %,
  **nirgends Scrollen**, Untertitel nirgends gekürzt.
- Wächter: `test/guide-desktop.test.js` (Quelltext-Ratsche über beide Dateien: `display: contents`, die
  `.gd-page`-Bindung, das Ventil, die drei Stufen, `align-self: start`, die Verdrahtung des Knopfs).
- **Bewusst NICHT drin**: ein „Glossar ›"-Knopf im Seitenkopf (spiegelbildlich zum „Leitfaden ›" im Baum).
  Das wäre Overlay auf Overlay — `GlossaryOverlay` liegt wie `GuideOverlay` auf `z-[60]` und beide hängen an
  `useEscape`, ein Escape schlösse also beide. Eigener Schritt, kein Layout.
- **Nicht am Gerät gesehen** — alles im Produktionspfad über Playwright gemessen und nachgerendert
  (Chromium, echte Komponente), aber nicht auf einem physischen Monitor abgenommen.

### #typo — Geist statt System-Mono, projektweit (2026-08-17)
Bis hierher lief **alles** in `ui-monospace` (eine Zeile in index.css: `html, body`). Überschriften, Knöpfe,
Beschreibungen und Zahlen trugen dieselbe Schrift — Typografie war damit als Ordnungsmittel gar nicht im Einsatz.
Jetzt zwei Schriften mit je einer Aufgabe: **Geist trägt Sprache, Geist Mono trägt Zahlen.**
- **Der Zweifelsfall-Test:** „Steht das untereinander in einer Spalte und soll sich vergleichen lassen?" → Mono.
  Sonst Geist. Deshalb ist `Bonus noch offen` unter der Kennzahl `0/1` **Geist** und nicht Mono, und deshalb ist
  die Einheit `SP` neben der Zahl Geist (ein Wort), die Zahl selbst Mono.
- **Rollen statt Einzelfälle** (`.ty-*` in index.css, ganze Begründung am Block dort): `ty-num` · `ty-num-sm` ·
  `ty-unit` · `ty-meta` · `ty-badge` · `ty-screen-title` · `ty-title` · `ty-display`.
  **Die Rollen setzen KEINE `font-size`** — und das ist zwingend, kein Versehen: index.css steht hinter
  `@import "tailwindcss"` und ist damit **ungelayert**, schlägt also jede Utility unabhängig von Spezifität.
  Eine Größe in einer Rolle würde die ~470 abgemessenen `text-[Npx]` stumm überschreiben. Größen bleiben an der
  Fundstelle, Familie/Gewicht/Sperrung/Ziffernvariante in der Rolle.
- **Gewichte nur 400/500/600.** `font-bold`/`font-extrabold` liefern über den `@theme`-Block **600** statt
  700/800 — eine Zeile statt 290 Einzeländerungen. Wer wirklich 700 braucht: `font-[700]` plus Begründung.
  **Zwei bewusste Ausnahmen:** die Groß-Ansage (`Battlefield.jsx`, 800 auf 40–100 px — auf der Größe liest
  sich 600 dünn, nicht ruhig) und die Kartenvorschau in der Werkstatt.
- **`font-mono` bedeutet ab jetzt etwas.** Vorher war die Klasse folgenlose Verzierung (alles war Mono), sie
  stand deshalb an 56 Stellen, die meisten davon Prosa. Alle geprüft und getrennt; Gegenprobe war `tabular-nums`
  (96 Stellen), das die echten Zahlen fast vollständig markiert hatte.
- **Entfallen: Press Start 2P und VT323** samt Dateien und Lizenztexten. VT323 (`font-pixel-dense`, 27×) stand
  ausschließlich an Zahlen → `ty-num`; Press Start 2P (`font-pixel`, 8×) an Überschriften/Badges → `ty-display`.
  **Der Neon-Glow des CRT-Skins bleibt** — er hängt jetzt an `.ty-display` statt an der Pixelschrift; er war
  immer der Träger des Looks, die Pixelschrift nur seine lauteste Begleiterscheinung. Damit ist auch die
  Sonderregel „StatusBar behält System-Mono, weil VT323 schmaler baut" ersatzlos weg: es gibt EINE Zahlenschrift.
- **Orbitron bleibt unangetastet**: Wortmarke, Kartenzahlen, Floats, Wochen-Chip. Der Wochen-Chip ist die eine
  begründete Grenze — er trägt eine Zahl als ABZEICHEN (Rolle wie Kartenzahlen), keine ablesbare Kennzahl.
- **Geist baut schmaler als die alte Mono.** Wer eine Zeile nachjustiert, korrigiert nach **oben**: im Hub sind
  CTA 16→17 px, Kacheltitel 13,5→14 px, Ranglisten-Knopf 14→15 px. Umgekehrt sind die großen Zahlen **kleiner**
  geworden (Status-Tafel 30→27 px, Kachel-Guthaben 16→17 px bei Gewicht 800→600) — Mono trägt auf Größe mehr.
- **Selbst gehostet wie Orbitron**, `src/assets/fonts/`: je Familie `latin` + `latin-ext` mit `unicode-range`.
  DE/EN laden nur latin = **52 kB** (29,4 + 23,1); latin-ext (16,5 + 14,7) kommt erst, wenn eine Sprache Zeichen
  daraus braucht. Beide OFL, Urheberzeilen in `src/assets/fonts/OFL.txt`.
- **Geprüft**: Build + ESLint (0/0) + 1351 Tests grün; Hub (Handy 390 + Desktop 1520), Skill-/Perk-Auswahl,
  Aufstellungsphase, StatusBar und Namens-Dialog im echten Produktions-Build nachgerendert und die berechneten
  Schriften je Element ausgelesen (nicht nur angeschaut). **Nicht** am Gerät gesehen, und **nicht** gesehen:
  Architekt, Werkstatt, Bestenliste, Statistiken, Upgrade-Baum, GameOver — die Klassen dort sind geändert, der
  Blick darauf steht aus. Ebenso offen: Geist Mono setzt die **Null geschlitzt**; im Score-HUD fällt das auf,
  abschaltbar wäre es zentral über `font-feature-settings` an `.ty-num`.

### #perf-aa + #perf-dpr — MSAA raus, Dichte-Regler rein (18.08.2026)
Zwei Nachzügler aus dem Hitze-Durchgang, beide an derselben Stelle: der **Pixi-Emitter-Bühne** (`PixiStage.jsx`),
also der zweiten vollflächigen Canvas, die den ganzen Lauf läuft (Komet/Sternenfeld).
- **`antialias: false`** in `PixiStage`, `HologridSlicePixi`, `FireHead`. Die Begründung ist nicht neu — sie steht seit
  den Prunks in `pixiGott.js` und ist dort GEMESSEN: MSAA kostet ein Full-Canvas-Resolve je Frame und hat an weichen,
  vorgebackenen Radialtexturen nichts zu glätten. Diese drei standen trotzdem auf `true`, nicht als Entscheidung,
  sondern aus der jeweils ersten Fassung mitgeschleppt. `CardFxStage` ist bewusst NICHT dabei: dort hängt es am
  Gerätetyp (`antialias: !isCoarse()`), Desktop behält sein MSAA.
  **Falls Meteor-Schweife danach treppig wirken: Ausgleich über die LINIENBREITE, nicht zurück auf MSAA (#perf-holo2).**
- **`PixiStage` kannte den Gerätedeckel nicht.** Die Dichte hing dort allein an der Options-Stufe
  (`lite ? 1.4 : 2`) — ein Handy auf „Effekte: aus" hat die vollflächige Emitter-Bühne also in **DPR 2** gerendert,
  während der Feld-Kompositor daneben bei 1,4 lag. Pixel skalieren quadratisch, das war doppelte Füllarbeit am
  teuersten Dauer-Effekt. Jetzt binden BEIDE Deckel: `Math.min(dprCap(), lite ? DPR_CAP_COARSE : DPR_CAP_DESKTOP)`.
  Dieselbe Lücke steckt noch in `CardFxStage` und `HologridSlicePixi` (`lite ? 1.25 : 2`) — **offen**, dort ist die
  Fläche kleiner bzw. die Laufzeit kurz.
- **ERGEBNIS AM GERÄT (18.08.2026): `DPR_CAP_COARSE` 1,4 → 1,0.** Über `?dpr=1` am echten Handy gegengeprüft:
  **50–60 fps, unter 10 % Akku über die Sitzung, Gerät nur noch lauwarm**, optisch unauffällig. Pixel skalieren
  quadratisch → **49 % weniger Füllarbeit** für alles, was den Deckel liest. Die 1,4 stammten aus der Zeit der
  raw-WebGL-Felder und waren nie gemessen, nur nie hinterfragt.
  - **Erfasst**: `PixiStage` (vollflächig, ganzer Lauf), der Feld-Kompositor und die vier Canvas-2D-Karteneffekte
    (Kantenglühen · Ionensturm · Frost · Moos).
  - **Nicht erfasst, weil eigene `resolution`**: `CardFxStage` + `HologridSlicePixi` (je 1,25) und die fünf
    Gottgleich-Prunks (`pixiGott.js`, 1,25 — dort mit eigener Messung begründet). **Offen.**
  - **Die Kompositor-Faktoren mussten gegengerechnet werden**, sonst hätte diese Änderung zwei Geräte-Urteile
    lautlos mitgerissen: die Faktoren sind RELATIV zur Bühne. Brandung lag effektiv bei 1,4 × 0,75 = **1,05**,
    unverändert übernommen wären es 0,75 gewesen — und ×0,5 der alten Bühne (= 0,70) war am Gerät als „sichtbar
    zu weich" verworfen (harte Wasserlinie). Jetzt **1,0 × 1,0 = 1,00** (Brandung, dabei zusätzlich ohne
    Render-Textur-Umweg) und **1,0 × 0,85 = 0,85** (Aurora, vorher 0,84). Wächter `test/mobile-tier.test.js`
    prüft das PRODUKT, nicht den Faktor.
  - **Noch zu holen, aber nur mit Blick am Gerät**: sah die Brandung bei `?dpr=1` gut aus (dort lief sie
    effektiv auf 0,75), sind weitere 44 % ihrer Füllarbeit frei — dann Faktor zurück auf 0,75.
  - `FireHead` kannte als einzige Pixi-Bühne GAR KEINEN Gerätedeckel (DPR 2 auf dem Handy). Fiel nicht auf, weil
    sie noch Preview/Dev-gegatet ist; jetzt ebenfalls aus `dprCap()`.
- **`?dpr=<zahl>`** (mobileTier.js) überschreibt den Auflösungsdeckel aller Effekte, die `dprCap()` lesen —
  das Gegenstück zu `?hz=` und der Regler, mit dem am Gerät entschieden wird, ob `PixiStage` von 1,4 herunterkann.
  Obergrenze bleibt die Gerätedichte. Ungültige Werte werden ignoriert statt den Effekt zu zerlegen.
- **Der `maxFPS`-Literal-Rückfall**: `PixiStage` las die Rate im Init aus `DRAW_HZ_COARSE`, setzte sie im
  Parameter-Effekt zwei Zeilen weiter aber als `lite ? 30 : 0`. Der läuft bei JEDEM Prop-Wechsel → das Literal gewann,
  und `?hz=` war ausgerechnet an der Vollbild-Bühne wirkungslos. Der alte Wächter („importiert mobileTier?") konnte
  das nicht sehen; er prüft jetzt, dass JEDE `maxFPS`-Zuweisung `DRAW_HZ_COARSE` liest. Gegengeprobe gemacht: der
  Wächter fällt, wenn man das Literal wieder einsetzt.
- **Nicht am Gerät gesehen** — Look-Abnahme (Aliasing an Meteor/Sternenfeld) steht aus.

### #perf-ansage — Groß-Ansage auf `lite`: nur noch die Basis-Glyphe (18.08.2026)
Die nicht-epischen Ansagen (Stark/Brutal/Irre) bestehen aus ZWEI übereinanderliegenden Wortschichten: einer soliden
Basis-Glyphe (near-white, 3 `drop-shadow`-Lagen) und darüber dem Chrome-Verlauf (`background-clip: text`, 3–4 Lagen).
Auf `lite` fällt die Chrome-Schicht jetzt weg — **7 Blur-Lagen auf zwei Schichten → 3 Lagen auf einer.**
- **Warum ausgerechnet die Ansage** und nicht die Kartenzahlen: sie ist das einzige gefilterte Element des Bretts, das
  über seine ganze Lebensdauer (`BIG_ANNOUNCE_MS` = 1,9 s) SKALIERT animiert wird (`as-bigscore`, Überschwinger 1,2).
  Filter + Skalierung = Neuraster je Frame. Kartenzahlen rastern einmal je Aufdecken, Floats gar nicht (die steigen
  über transform/opacity, das komponiert der Browser ohne Neuraster).
- **Die Kartenzahlen sind bewusst NICHT angefasst.** Am Handy laufen sie längst auf einer einzigen Blur-Lage à 1,5 px:
  `pointer: coarse` kürzt die Radien (index.css), und der Mobil-Default `reducedFx:"mobile"` setzt `data-reduced-fx="1"`,
  was die zweite Lage ganz wirft. Der Rest wäre ~5 400 px², neu gerastert je Flip — gegen 144 000 px² × 30/s beim
  Feld-Shader. Dort ist Wärme nicht das Argument, sondern der Look.
- **Basis bleibt, Chrome geht** — nicht umgekehrt: die Basis ist die lesbare Schicht (#354 hat sie genau deshalb
  eingeführt). Ohne Chrome fehlt der Metallic-Verlauf, ohne Basis die Präsenz.
- **Falle**: die Chrome-Schicht lag IM FLUSS und gab dem Wrapper seine Größe, die Basis absolut darüber. Fällt Chrome
  weg, muss die Basis in den Fluss — sonst ist der Wrapper 0×0 und die Zentrierung sitzt auf nichts.
- `lite` = alles außer „Effekte: aus" (Handy-Default UND Desktop-„ausgewogen") — derselbe Knopf wie `gBig/gMid` zwei
  Zeilen darüber. Der epische Zweig (`GottChromeWord`, SVG) ist unberührt: eigene Komponente, feuert selten.
- **Gerechnet, nicht am Gerät gemessen.**

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

### #global — Globale Bestenliste (2026-08-18)
Die Hub-Kachel „Bestenliste" versprach im Untertitel „Globale Highscores", öffnete aber denselben Bildschirm wie
der große Ranglisten-Knopf: `fetchGlobalTop` existierte seit #14 und wurde von der UI **nirgends** aufgerufen.
Jetzt trennen sich die beiden Einstiege über EINEN neuen Prop `mode` an `LeaderboardScreen`:
- **`mode="board"`** (Kachel + GameOver, `setShowLeaderboard("board")`) — **Global · Woche · Challenger**.
  Nachschlagen. Der Wochen-Reiter zeigt dort NUR die Platzierung; Seed-Kasten, Modifikator-Chips und
  Spielen-Knopf hängen an `!boardMode`, dazu eine Zeile, die auf den Ranglisten-Knopf verweist.
- **`mode="ranked"`** (Ranglisten-Knopf, `setShowLeaderboard("ranked")`) — **unverändert**: Woche mit Seed,
  Modifikatoren, Spielen, Regeln. Die Regeln bleiben bewusst dort — sie beschreiben, wie man Ranked spielt.
- Der Wochen-Reiter behält in BEIDEN Sätzen die id `"meister"`: sie ist zugleich der Board-String der Datenbank
  und der Wert, den App.jsx als `initialTab` hereinreicht. Umbenennen bräche beides still.

#### Zwei neue Angaben je Zeile
- **Die sechs Skills.** `anonymized` (#205 Anti-Copy) verdeckt ab jetzt nur noch **Perks + finale Aufstellung**,
  nicht mehr die Skills. Begründung: Sechs Skills sind die Identität eines Laufs — ohne sie ist eine Bestenliste
  eine Namensliste mit Zahlen. Nachbauen hängt an den ~20 Perks und der Kartenreihenfolge, und die bleiben weg.
  Statt die Perk-Zeile ersatzlos fehlen zu lassen, sagt `runstats.hidden`, dass da absichtlich etwas fehlt —
  aber nur, wenn wirklich etwas verdeckt wird (`perks !== null`), sonst wäre der Hinweis eine Lüge.
- **Baumstand x/27** (`tree_nodes`, NEUE Spalte). In der ZEILE eine Pille, deren **Hintergrund auf den Anteil
  gefüllt** ist — über zwanzig Zeilen liest man „viel Baum gegen wenig Baum", ohne Zahlen zu vergleichen.
  In der DETAILANSICHT ein eigener Block mit Balken (`RunTreeBlock` in RunStats.jsx), platziert VOR den
  Kennzahlen: der Baumstand ist keine Kennzahl des Laufs, sondern seine Vorbedingung.
  **Bewusste Asymmetrie bei fehlendem Wert:** die Liste zeigt eine gestrichelte `–/27`-Pille (in einer Spalte
  muss eine Lücke sichtbar bleiben, sonst vergleicht man Zeilen mit ungleicher Grundlage), die Einzelansicht
  rendert gar nichts (dort gibt es nichts zu vergleichen, ein „kein Wert"-Kasten wäre nur Rauschen).
  Der Nenner kommt aus `TOTAL_NODES` — nirgends abgetippt, ein Wächter prüft das.

#### OFFEN: die Migration muss noch auf Supabase laufen
**`docs/global-board-migration.sql`** (Dashboard → SQL Editor → einfügen → Run, idempotent) — **noch nicht
passiert.** Sie legt `tree_nodes integer` an (NULLABLE, **ohne Default**: ab PG 11 füllt ein Default auch alle
BESTEHENDEN Zeilen, jeder Alt-Lauf behauptete dann „0 Knoten" — NULL heißt „unbekannt", darauf verlässt sich
die gestrichelte Pille) plus einen partiellen Index `where board is null` für die Global-Abfrage. An den
RLS-Policies ist nichts zu tun (`using (true)` / `with check (true)`, keine Spalten-Whitelist).
`docs/supabase-schema.sql` (Schema für ein frisches Projekt) ist mitgezogen. Bis dahin zeigt die Pille
überall `–/27`, sonst ändert sich nichts: `tree_nodes` hat im Abruf UND beim Insert eine **eigene** Kaskadenstufe
(`COLS_TREE` vor `COLS_FULL`, `TREE_FIELD` vor `EXTRA_FIELDS`). Läge der Baumstand in `COLS_FULL`/`EXTRA_FIELDS`,
nähme die fehlende Spalte alle FB-8-Detailfelder mit — der stille Datenverlust aus #197, eine Ebene höher.
Deploy-Reihenfolge Code↔Schema ist damit egal.

#### Global = nur Casual, ungefiltert nach Läufen
`fetchGlobalTop` filtert `board=is.null`: Ranglisten-Läufe fahren auf fixer Baseline (Baum wirkungslos) und
stünden mit einer Baum-Pille daneben für einen Vorteil, den es in ihrer Zeile nicht gab. Sie bleiben im
Wochen-Board. **Der Filter ist die ZWEITE Achse, an der die Abfrage scheitern kann** — unabhängig von den
Spalten. Fehlt die `board`-Spalte, 400t JEDE Spalten-Stufe am Filter; deshalb läuft die Kaskade danach noch
einmal OHNE Filter, statt das Board leer zu lassen (äußere Schleife in `fetchGlobalTop`).
Gezeigt werden **alle Läufe roh**, nicht der beste je Spieler (Entscheidung des Users) — der Kopf sagt das
auch: „Allzeit · Top 20" links, „alle Läufe" rechts.

#### Zwei Sachen, die erst das Nachmessen entschieden hat (Vite-Harnisch + Headless-Chromium, 390 px)
- **`grid` allein sizet die implizite Spalte auf MAX-CONTENT.** Ein langer Nickname zog die ganze Liste über
  das Panel hinaus (gemessen: Zeilen 313 statt 292 px → waagerechte Scrollleiste im `overflow-y-auto`-Panel).
  **`truncate` hilft dagegen NICHT** — es kappt die Darstellung, nicht den max-content-Beitrag. Fix ist eine
  Klasse: `grid-cols-1` (= `minmax(0, 1fr)`) deckelt die Spur. **Der Fehler bestand schon vorher**, die
  zweizeilige Zeile hat ihn nur sichtbar gemacht. Merksatz für jede neue Liste: `grid` → `grid grid-cols-1`.
- **`fmtScoreShort` in der Zeile: probiert und wieder rausgeflogen.** Es rundet auf EINE Nachkommastelle;
  in einer Liste mit zwanzig Milliarden-Läufen lesen sich mehrere Zeilen dann als dasselbe „1,8 Mrd." — bei
  einer RANGLISTE der eine Fehler, den man nicht machen darf. Der volle Score passt: die Zweizeiligkeit gibt
  Zeile 1 allein an Name und Score, die volle Zahl braucht ~85 px von ~281.
- **Warum überhaupt zweizeilig:** einzeilig gerechnet (390 px, Karte + Panel + Zeilenpolster ab) bleiben ~278 px:
  Rang 24 · bis zu sieben Fraktions-Icons ~90 · Baum-Pille ~44 · Score ~85 · Abstände ~14 — für den NAMEN bliebe
  fast nichts. Zeile 1 trägt die Identität (Rang · Name · Score), Zeile 2 die Einordnung (Icons · Baum · Durchlauf).

#### Datenschutz-Naht mitgezogen
Der Hinweis nannte „Score, Durchläufe, Stiche, Archetypen, Perks, Skills, Seed" — gespeichert wurden aber
zusätzlich beste Serie, Formationen, Crits, Siege, bester Stich und die Score-Anteile. Text ergänzt (beide
Sprachen) UND abgesichert: `test/privacy.test.js` liest jetzt `COL_STAGES[0]` aus `leaderboard.js` und verlangt
für JEDE Board-Spalte einen Eintrag — dieselbe Gegenprobe, die es für `clientInfo()` schon gab. Eine neue Spalte
erzwingt damit eine Entscheidung über den Hinweistext, statt still an ihm vorbeizulaufen.

Wächter: `test/global-board.test.js` (Verdrahtung als Quelltext-Ratsche — das Projekt hat kein Component-Test-Setup),
erweitert `test/leaderboard.test.js` (4-stufige Kaskade + Casual-Filter + Filter-Rückfall + Insert-Stufen).

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

### #marke — der Spieltitel ist sprachabhängig: DE „Autostich", EN „Autotrick" (18.08.2026)
Der Titel war bis dahin von der Begriffstabelle ausgenommen (`genre-terminologie.md` §2: „Kein Grund zur
Umbenennung — Balatro heißt auch Balatro"). **Die Entscheidung ist umgedreht**, mit derselben Beobachtung
als Begründung: „Autostich" trägt „Stich" sichtbar, sagt also seinen Mechanismus im Namen; englisch geht
genau das verloren und das Wort liest sich als Nähbegriff (stitch). Der Vergleich mit Balatro trug nicht —
das ist ein reines Kunstwort, „Autostich" ein sprechender Name. Der Titel folgt jetzt derselben Abbildung
wie das Wort in ihm (**Stich → trick**), die Tabelle im Übersetzerpaket §3.1 führt ihn als eigene Zeile.
- **Geändert ist NUR `src/i18n/en.js`** (6 Texte): Wortmarke `start.logo.alt` „AUTOSTICH" → **„AUTOTRICK"**,
  Tutorial-Kopf + -Text, drei Datenschutz-Texte. Der deutsche Katalog ist unberührt.
- **Der Tab-Titel zieht mit, der PWA-Name NICHT.** Neuer Schlüssel `meta.title` (DE „Autostich — Prototyp",
  EN „Autotrick — Prototype"); `App.jsx` setzt `document.title` in demselben Effekt, der schon
  `<html lang>` mitzieht. `index.html` behält den deutschen Titel **statisch** — er steht im HTML, lange
  bevor React die gewählte Sprache kennt, und ist damit nur die Anzeige bis zum ersten Render.
  `public/manifest.webmanifest` bleibt einsprachig: ein Manifest kennt keine Sprachumschaltung, es wird
  beim Installieren einmal gelesen. Wer das ändern will, braucht zwei Manifeste und einen Link-Tausch.
- **`start.logo.alt` ist aus `SAME_OK` geflogen.** Die Liste führt Texte, die in beiden Sprachen gleich
  lauten DÜRFEN — die Wortmarke tut das nicht mehr. Drei Wächter greifen jetzt bei einem Rückfall
  (gegengeprobt): die Parität („englische Texte unterscheiden sich"), die Begriffstabelle und ein eigener
  Test, der den ganzen Katalog in BEIDE Richtungen prüft (kein „Autostich" in en.js, kein „Autotrick"
  in de.js). Der eigene Test ist nötig, weil die Tabelle nur Schlüssel sieht, in denen schon das deutsche
  Wort steht — ein neuer englischer Text mit falscher Marke fiele ihr sonst nicht auf.
- **Die Übersetzer-CSV ist mitgezogen** (`npm run loc:export`) — `test/loc-csv.test.js` bindet sie an den
  Katalog, eine Textänderung ohne Export macht die Suite rot.
- **Nicht angefasst** (Code-Innenleben, kein Anzeigetext): `export function Autostich()` in App.jsx, die
  Supabase-Tabellen `autostich_scores`/`_telemetry`/`_reports`, der Deploy-Pfad `/autostich/`, der
  Cache-Präfix im Service Worker und die Repo-/Branch-Namen.
- **Deckel im Hub bleibt gültig**: die 52 px in `index.css` (`.hub-play .as-wordmark`) sind an der
  DEUTSCHEN Marke gemessen — zehn Zeichen gegen neun, die englische bleibt darunter.
- **Nicht am Gerät gesehen** — Build, Lint und 1569 Tests grün, der Blick auf die englische Wortmarke im
  Hub steht aus (Orbitron, anderes Wortbild).

### #meisterhand — der gewonnene Skill-Slot war nicht erreichbar (18.08.2026)
Der legendäre Perk **Meisterhand** (`L_MEIS`) hebt `state.skillSlots` von 6 auf 7. Der Slot ließ sich aber nicht
füllen — der Fehler lag an ZWEI Stellen, und jede allein hätte gereicht.
- **Oberfläche:** `SkillSelect` rechnete `full = skills.length >= slots`. `skills` enthält den **legendären
  Skill aus der Legendär-Phase mit** — der zählt laut Reducer (`PICK_SKILL`, `normalCount`) aber NICHT gegen den
  Deckel, er hat seinen eigenen festen Slot (#272). 6 normale + 1 legendärer Skill galten damit schon bei
  7 Slots als „voll". Der einzige angebotene Ausweg war das Ersetzen-Fenster, und das TAUSCHT nur.
  Jetzt zählt die UI wie der Reducer (`normalHeld`). **Wer hier anfasst: die zwei Zählungen müssen
  dieselbe sein, sonst widerspricht die Oberfläche der Regel.**
- **Gleiche Stelle, zweiter Fehler:** die Ersetzen-Liste bot den legendären Skill mit an. Der Reducer weist ein
  solches `replaceId` ab → das Fenster schloss sich und es passierte NICHTS. Legendäre sind jetzt herausgefiltert.
- **Regel:** der Perk gibt den Slot, aber die Gelegenheit fehlte. Skill-Phasen liegen fest im
  `DECISION_SCHEDULE`, und die Legendär-Phase (Runde 29) ist die **letzte** davon. Wer Meisterhand danach zieht —
  der Normalfall, legendäre Perks häufen sich in der 2. Perk-Phase — bekam einen Slot, für den nie wieder ein
  Angebot kam. **`PICK_PERK` öffnet bei `def.skillSlotBonus` deshalb sofort eine Skill-Wahl** (`skillOffer` +
  `phase:"levelup"`), dieselbe Naht wie `DECLINE_LEGENDARY`, nur andersherum ausgelöst. Endstand nach der
  Legendär-Phase: 7 gehaltene Skills → **8**.
- **Das Bonus-Angebot ist als solches markiert** (`state.skillOfferBonus`), und das ist kein Schmuck:
  `DECLINE_SKILL` gibt sonst nach der „nie verschwendet"-Regel ein PERK-Angebot als Ersatz — aus einem Perk
  würden zwei. Beim Bonus heißt Ablehnen: Slot bleibt leer, die nächste reguläre Skill-Phase füllt ihn
  (`normalCount < skillSlots` → hinzufügen statt ersetzen). Der Eis-Ablehn-Gletscher entfällt aus demselben Grund.
  Der Ablehnen-Knopf trägt dort **„Ablehnen"** statt „Ablehnen → Perk" — sonst verspricht er etwas, das nicht kommt.
- **Eigener RNG-Adress-Strom `"meisterhand"`** statt `"skill"`: in einer PERK-Phase ist der Skill-Strom dieses
  Durchlaufs zwar frei, aber ein eigener Name kann per Konstruktion nie kollidieren. **Legendär-Chance 0** — der
  legendäre SKILL hat seine eigene Phase und seinen eigenen Slot, ein Perk soll keinen zweiten nachliefern.
- **Anzeige zieht mit**: „{gehalten}/{Slots}" rechnet den Legendär-Slot jetzt mit ein → **7/7** statt 7/6 (das
  war schon vorher falsch), nach Meisterhand **7/8**.
- Wächter: `test/legendaries-v03.test.js` (Reducer-Naht + Quelltext-Ratsche über `SkillSelect.jsx`).
  Gegenprobe gemacht: alle drei sabotierten Nähte fallen.

### #victory-perks — der Endscreen zeigte nur einen Bruchteil der genommenen Perks (18.08.2026)
`GameOver` reichte `RunBuildChips` nur `state.perks`. Seit dem Rarität-Umbau (#167) sind die alten
Kategorie-A-Perks aber **Familien** und stehen als Stufen-Map in `state.familyTiers` — also gerade NICHT in
`perks`. Der Endscreen zeigte damit die paar flachen Perks und die Legendären, und der Rest eines Laufs fehlte.
- Neu ist ein optionales `entry.families` (die Stufen-Map, unverändert wie im State). Die Chips stehen in
  **derselben Zeile** wie die flachen Perks — für den Spieler ist beides „ein Perk, das ich genommen habe";
  die Trennung ist eine Implementierungsgrenze, keine Spielregel. Farbe kommt von der **Stufe**
  (grau/grün/blau/lila, wie in `PerkList`), Beschriftung ist „Name + römische Stufe".
- Die Zeile hat jetzt eine Überschrift mit Gesamtzahl (`runstats.perks`) — mit den Familien sind es zwei Dutzend
  Chips, ohne Beschriftung liest sich das als namenlose Wolke über den Skills.
- **Die Bestenlisten-Detailansicht (`RunDetail`) bleibt unverändert, und das ist kein Vergessen:** die Board-Zeile
  speichert `perks`/`skills`, **keine** Familien-Spalte — dort sind die Daten schlicht nicht da. Ein Wächter hält
  das fest: kommt eine Spalte dazu, wird der Test rot und die Detailansicht ist nachzuziehen.
- `showPerks` hängt nicht mehr allein an `perks` (ein Lauf kann 20 Familien und 0 flache Perks haben), bleibt aber
  vollständig hinter `!anonymized` — die Anti-Copy-Regel (#205) gilt für Familien genauso.
- Wächter: `test/victory-perks.test.js`; die Ratsche in `test/global-board.test.js` ist nachgezogen (sie pinnte
  den alten Wortlaut der `showPerks`-Zeile).
- **Nicht am Gerät gesehen** — Build, Lint und 1578 Tests grün, der Blick auf die Chip-Wolke steht aus.

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

### #rahmen + #werkstatt-aktion — zwei Nachzügler des Desktop-Passes (2026-08-18)
- **Die Karte trug die ganze Zeit einen Rahmen um den ganzen Bildschirm.** `.up-card`/`.cz-card`/`.gd-card`
  sollten auf dem Desktop flächen- und rahmenlos sein (die Panels sind der Rahmen des Screens, nicht die
  Karte) — die Regel stand da und wirkte nie: `[data-skin="crt"] .as-panel.as-panel-deck` wiegt (0,3,0),
  `.up-card.as-panel` nur (0,2,0). Die Deck-Variante gewann und malte weiter einen animierten 1-px-Verlauf
  seitlich UND über den Kopf hinweg. Fix: die Abräum-Regeln nennen jetzt **beide** Klassen. Wer sie kürzt,
  holt den Rahmen zurück, ohne dass etwas rot wird — `test/desktop-perf.test.js` wacht.
- **Kein Buch-Emoji mehr vor „Leitfaden".** Baum und Werkstatt tragen dort auch kein Zeichen.
  **Regel des Users: NIE ein Icon einbauen, das nicht schon im System ist, ohne vorher zu fragen.**
- **Werkstatt, rechte Spalte: der Kaufen-/Ausrüsten-Knopf war auf flachen Fenstern unsichtbar.** Die Vorschau
  ist dort höher als die Spalte; der Knopf lag im Fluss hinter den Bildern und rutschte unter die gedeckelte
  Panelkante (von `overflow-hidden` der Karte weggeschnitten). Zwei Hälften, beide nötig: der Aktionsblock ist
  jetzt ein `flex-none`-Geschwister des Scrollers (`.cz-action`) UND die Spalte eine schrumpffähige Flex-Kette
  (`.cz-side` flex-column, `.cz-detail`/`.cz-detailcard` `flex: 1; min-height: 0`) — vorher standen beide auf
  `height: auto`, der Scroller hatte also nie eine definierte Höhe und wuchs einfach weiter.
  Gemessen 1536×791: Knopf sichtbar innerhalb des Panels, Bilderliste scrollt 104 px. Auf 1723×1030 und
  1920×1080 unverändert (Panel endet am Inhalt, kein Scrollen).

### #skilltext — Skill-Beschreibungen im Baum: Spaltenfluss statt Raster (2026-08-18)
Die Beschreibungen waren auf drei Zeilen geklemmt (`-webkit-line-clamp: 3`), weil im Raster die höchste
Zelle die Höhe der ganzen Reihe bestimmt. Gemessen kostete das **5–6 von 21** gekürzten Texten auf
1920×1080 und **14 von 21** auf 1536×791 — mitten im Satz, ohne Hinweis, dass noch etwas kommt.
- **Der Denkfehler war die Annahme, die Klemme kaufe Übersicht.** Die Skill-Spalte SCROLLT in jeder Größe
  ohnehin (1,1× auf 1920, 1,7× auf 1536). Sie sparte also kein Scrollen, sie versteckte nur Text.
- Jetzt `columns: 320px` statt `grid`: jede Karte hat ihre eigene Höhe, es gibt keine Reihe, die reißen
  könnte. **Spaltenzahl kommt aus der Breite**, nicht aus einer Zahl — drei Spalten auf 1920, zwei auf
  1536, Textbreite überall ~340–425 px statt auf 217 px zu schrumpfen. Kosten: Inhalt 816 → 993 px
  (2,1× statt 1,7× Scrollen auf 1536), dafür **0 gekürzte Texte** in allen vier Fraktionen × drei Größen.
- Bewusst bezahlt: die Lesereihenfolge läuft spaltenweise (runter, dann rechts) statt zeilenweise.
- **Wer auf `grid` zurückstellt, muss die Klemme mitbringen** — sonst reißt ein langer Skill die Reihe auf.
  Wächter: `test/desktop-perf.test.js`.

### #perf-shopdpr + #perf-shopmount — was die Effekt-Vorschau kostet (2026-08-18)
Gemeldet: die Werkstatt verlangt der GPU ein Vielfaches dessen ab, was das Spielen kostet, und das
Durchklicken der Effektliste ist zäh. Zwei Ursachen, beide behoben, eine dritte gemessen und verworfen.
- **Die Vorschau rendert nicht mehr feiner als das Spiel** (`previewDprCap` in `mobileTier.js`). Die
  Werkstatt zeigt das Brett VERGRÖSSERT: der Rahmen ist `sceneScale` mal so breit wie die 668 px des
  Bretts (auf 1920 px ≈ 1,86). Ein Brett-Pixel bekam damit `1,86 × dpr` Gerätepixel statt `dpr` — fast
  doppelt so fein wie ihn je ein Spieler sieht, und das quadratisch bezahlt. Der Deckel
  `DPR_CAP_DESKTOP / sceneScale` (= 2 / 1,86 ≈ **1,07**) dreht das auf exakt die Dichte des Bretts
  zurück. **Das ist eine Identität, keine Geschmacksfrage** — feiner als das Spiel kann die Vorschau
  nichts zeigen, was es zu beurteilen gäbe; der Wächter rechnet `previewDprCap(s) × s = 2` nach.
  Gemessen (Aurora, 1920 px Rahmen): DPR 2 → **−71 %** Gerätepixel · DPR 1,25 → **−26 %** ·
  **DPR 1 → 0 %** (dort ist die Gerätedichte ohnehin die Grenze). Wer an einem 1×-Monitor misst, sieht
  von diesem Hebel also nichts — das ist kein Fehler.
- **Bewusst ein MODUL-Wert, kein Prop**: die zehn Vorschau-Szenen mounten dieselben In-Game-Bühnen
  (Kompositor, PixiStage, fünf Prunks, CardFxStage, Hologrid, die Canvas-2D-Effekte) und lesen `dprCap()`
  alle selbst. Sicher ist das nur, weil die Werkstatt **nur im Menü** erreichbar ist (App.jsx #190) —
  während sie offen ist, existiert keine Lauf-Bühne, die den Deckel mitnehmen könnte. Wer die Werkstatt
  je im Lauf öffnet, muss daraus ein Prop machen. Gesetzt in `FxStage`, zurückgesetzt beim Verlassen.
- **Die Szene mountet erst, wenn die Auswahl steht** (`FX_MOUNT_DELAY_MS = 150`). Jeder Wechsel baut
  eine komplette Bühne auf (WebGL-Kontext, Texturen, Partikel); beim Durchblättern entstand je Klick
  eine, die sofort wieder abgerissen wurde. Gemessen: fünf Klicks im 40-ms-Takt bauen **2 statt 5–6**
  Bühnen, bei 400 ms Abstand kommt weiter jede einzelne. Der ERSTE Aufbau wartet nicht (sonst stünde
  beim Öffnen 150 ms lang eine leere Bühne — gemessen 15 ms bis zum ersten Bild). Name, Preis und
  Aktionsknopf folgen der Auswahl weiter sofort; nur die teure Bühne wartet.
  **Nebeneffekt, der den Deckel überhaupt erst wirksam macht**: die Szene wartet zusätzlich auf die
  Breitenmessung. Vorher mountete sie im ersten Frame mit Maßstab 1 und behielt die falsche Auflösung.
- **Verworfen: den WebGL-Kontext vorwärmen** (Präzedenz #perf-warm). Gebaut, gemessen, ausgebaut —
  größter Aufbau-Task beim ersten echten Effekt, je drei Läufe: mit **218 · 232 · 239 ms**, ohne
  **243 · 247 · 226 ms**. Der Median liegt 11 ms auseinander, die Streuung innerhalb einer Gruppe über
  20 ms. Plausibler Grund: teuer sind die Shader der EINZELNEN Pixi-App, und die hängen an deren
  Instanz — ein fremder Kontext wärmt sie nicht. Beim ÖFFNEN des Reiters ist ohnehin nichts zu holen:
  dort mountet die statische Startszene („Keine Animation"), gemessen **null** Long Tasks. Der erste
  Ruckler sitzt am ersten echten Effekt. Wer es auf echter GPU erneut versucht, misst zuerst und nimmt
  eine warme PIXI-APP, keinen rohen Kontext. Die Begründung steht im Quelltext, damit sie niemand
  zweimal bezahlt.
- Wächter: `test/fx-preview-cost.test.js` (rechnet den Deckel nach, hält beide Verdrahtungen fest).
- **Nicht am Gerät gesehen** — alles im Messstand (Playwright, Software-Renderer) gemessen.

### #fx-panel + #vorschau-brett — der Effekte-Reiter der Werkstatt (2026-08-18)
Der letzte Screen des Desktop-Passes. Fünf Befunde, alle vor dem Bauen gemessen (Playwright im echten
Produktionspfad, Anker 1920×1080 und 1536×791); zwei davon waren größer als vermutet, einer stimmte nicht.
- **Das Loch rechts war 568 px, nicht 280** — die Liste füllte 28 % ihrer Spalte (233 px Zeilen in 823 px
  auf 1920 · 279 px / 52 % leer auf 1536). Und es konnte **nie zuwachsen**: die vier Reiter haben
  `5 · 5 · 5 · 6` Zeilen, nicht „5–13". Der `overflow-y: auto` an `.cz-fxlist` hatte noch nie etwas zu scrollen.
- **Ein Panel gegen zwei war nur eine Frage der FASSUNG.** Die Aufteilung stimmte längst: Pakete
  `1276 + 520`, Effekte ein Panel `1822` mit innerem Raster `1246 + 520`. Der zweiten Spalte fehlten
  Glas, Ring und Kante — sonst nichts. Jetzt tragen `.cz-stage` (links) und `.cz-fxside` (rechts) die
  Panel-Optik, `.cz-main` gibt sie ab (`:has(.cz-stage)`), **beide enden am Inhalt** (`align-self: start`,
  wie `.cz-side` und `.up-nav`). Rechte Spalte 823 → 413 px, leere Fläche 0.
- **Die Kategorie-Reiter sind in den Kopf des rechten Panels gezogen.** Vorher klebten zwei Reiterzeilen
  22 px übereinander, die kein einziges Maß teilten (210×48 / 16 px / Radius 12 / Rahmen rundum gegen
  ~300×31 / 11 px / Radius 6-6-0-0 / Unterkante). Sie werden **einmal** gebaut und am `wide`-Schalter an
  einer von zwei Stellen gerendert — DOM, nicht Anordnung, also nicht per CSS lösbar (dieselbe Entscheidung
  wie die Nav-Spalte im Leitfaden). Zwei gerenderte Zeilen hießen zwei Fokus-Reihenfolgen im Baum.

#### Die Vorschau IST das Brett — zwei Zahlen aus dem laufenden Spiel (`src/ui/fx/previewScale.js`)
Gemessen am Battlefield-Panel (`[data-tut="bf-board"]`): **1920 → 668×347 · 1536 → 668×347 · Handy 390 →
358×347.** Auf dem Desktop ist das Brett also FEST (1fr-Spalte eines `[1fr_340px]`-Rasters), und die Karte
ist dort immer 104×144 — **41,5 % der Bretthöhe**. Daraus zwei Regeln, die die Vorschau beide verfehlt hatte:
- **Brett-Verhältnis 1,93 : 1, NICHT die 2,5 : 1 des Spielfeld-JPGs.** Das Brett schneidet das 1600×640-Bild
  bereits zu; eine Vorschau im BILDformat zeigt einen Ausschnitt, den es im Spiel nirgends gibt. Die alte
  Vorschau stand auf 1,62 : 1 (1246×767) — also weder das eine noch das andere. Jetzt `aspect-ratio:
  var(--bf-ratio)`; **die Zahl steht nur in previewScale.js**, index.css liest sie als Variable.
- **Maßstab = Vorschaubreite ÷ 668.** `width: 104, height: 144` stand als Literal in **sechs** Szenen
  („Demo-Karte im echten 104×144-Slot") — eine Handy-Zahl, die den Desktop-Pass nicht mitbekommen hat. Der
  Rahmen wuchs von 186 px auf 767 px, die Karte nicht: **Kartenfläche 24,9 % → 1,6 %**, der 10-DP-Effekt war
  anderthalb Prozent des Bildes. Jetzt ein `CardSlot` für alle sechs; nachgemessen landet die Karte auf
  **41 %** der Rahmenhöhe — dem In-Game-Wert — auf jeder Breite (Identität, kein Zufallstreffer, s. Test).
- **Skaliert wird per `transform`, NICHT über width/height.** Die DOM-Effekte rechnen in absoluten Pixeln
  (SliceFx streut auf 46–116 px und schneidet 120 px weit) — ein größerer Slot allein ließe die Geometrie
  stehen. Die Canvas-/Pixi-Effekte lesen den Slot per `getBoundingClientRect()`, und das liefert die
  TRANSFORMIERTE Box → sie folgen **ohne eine einzige Änderung an ihnen**. Nicht mitskaliert werden ihre
  internen Konstanten (Strichbreiten, Glow-Radien); bei Neonrand und Funkenkranz ist das unauffällig, wer
  eine Ebene ergänzt, prüft es am Bild. `translate(-50%,-50%) scale(s)` zentriert weiter korrekt (Prozente
  beziehen sich auf die UNskalierte Box, `transform-origin` sitzt in deren Mitte).
- **Der Maßstab VERGRÖSSERT nur** (`Math.max(1, …)`). Am Handy ist der Rahmen 324 px breit; die reine Regel
  ergäbe 0,49 und eine 70-px-Karte. **Nachgewiesen unangetastet:** Geometrie an sechs Messpunkten × vier
  Reitern identisch, drei von vier Reitern **bitidentisch** (0,000 von 255), der vierte weicht um 0,177 ab —
  das ist das laufende Pixi-Bild, kein Layout.

#### Zwei Fallen, beide beim Bauen zugeschnappt
- **`position: static` ignoriert `top`, `relative` nicht.** Die Vorgängerfassung stand auf `static`; für den
  Ring braucht die Bühne aber `relative` — und dann greift plötzlich das INLINE gesetzte `top` (der
  Sticky-Abstand unter dem Kopf, 135 px). Das Panel rutschte um genau diese 135 px nach unten und lief unten
  aus dem Scroller (**gemessen: 62 px Überlauf auf 1536×791**). Fix ist `top: auto !important`.
- **Der Ring-Wächter zählt Namen im Quelltext.** `test/desktop-perf.test.js` vergleicht die Vorkommen von
  `as-ring` und seinem Laufband-Kind. Ein Kommentar, der beide Namen erwähnt, kippt die Bilanz — die
  Begründung am `.cz-stage` schreibt sie deshalb bewusst NICHT aus.
- Der Panel-Hintergrund braucht `!important`: `.cz-stage` setzt seine Sticky-Kopf-Fläche INLINE
  (`STICKY_HEAD_BG`), und Inline schlägt jede Stylesheet-Regel. Genau dort stand vorher `background: none !important`.

Wächter: `test/fx-panel.test.js` — rechnet den Maßstab NACH (previewScale.js ist rein, ohne React) und hält
die vier Nähte als Quelltext-Ratsche fest (`align-self: start` · `display: contents` unter 1400 ·
`top: auto` · `--bf-ratio` als Variable statt abgetippter Zahl). Gegenprobe gemacht: alle drei sabotierten
Nähte fallen. **Nicht am Gerät abgenommen** — alles headless im Produktionsbuild gemessen und nachgerendert.

### #shop-demo + #vorschau-boden — Würfel-Matrix in der Werkstatt (2026-08-18)
Zwei Meldungen aus derselben Ecke, mit derselben Wurzel: die Vorschau hatte ihre eigenen Zahlen statt der
gemeinsamen. Beide fielen erst auf, als die Vorschau mit #vorschau-brett das Brettformat bekam.
- **„Liegt nicht sauber": Das Würfelfeld schwebte über dem Horizont.** Die Vorschau schrieb ihre Platzierung
  mit vier Sonderwerten selbst hin (`riseBase 1.2 · riseScale 0.55 · yBias 0.32 · depthScale 0.8`, laut
  Kommentar „visuell in shop-großer Box abgestimmt" — auf **1,62 : 1**). Der Boden hängt an der HÖHE
  (`baseY` = 0,28 · H), das Spielfeld-Bild darunter wird per `object-cover` beschnitten; bei einer
  Formatänderung wandern beide **unterschiedlich**. Statt die vier Zahlen neu abzustimmen benutzt die
  Vorschau jetzt `floorEffectPlacement()` — genau das, wozu `effectZones.js` im Kopf auffordert
  („nicht selbst hart kodieren"). Inhaltlich ist das ohnehin richtig: die Vorschau IST das Brett, nur größer.
  Der Wächter in `test/fx-seams.test.js` zählt die Werkstatt ab jetzt zu den Konsumenten.
- **„Soll auch bei stummer Musik laufen."** Ohne Signal sinken die Türme in Ruhe — im SPIEL richtig, in der
  Werkstatt unbrauchbar: dort steht die Kaufentscheidung an, und man müsste erst die Musik anschalten, um zu
  sehen, wofür man 40 DP ausgibt. Neuer Prop **`demo`** (nur die Vorschau setzt ihn) speist ein synthetisches
  Signal in **dieselbe** Pipeline (`driveCube` → Grundpegel-Abzug, Kontrast, adaptive Attack/Release). Nur die
  Quelle ist anders, das Verhalten identisch — kein zweiter Zeichenpfad, der driften könnte (#kompositor-Regel).
  - **Umgeschaltet wird über eine PEGELMESSUNG, nicht über ein Mute-Flag**: der Analyser existiert auch bei
    stummgeschalteter Wiedergabe und liefert dann konstant 0. Das Fenster (`DEMO_SILENCE_S` 0,35 s über
    `DEMO_PEAK_MIN` 3) trifft damit auch „pausiert", „Track zu Ende" und „Lautstärke 0" — und geht echter
    Musik automatisch aus dem Weg, sobald sie einsetzt.
  - **Reihenfolge ist Teil der Regel**: der Demo-Zweig steht VOR dem Audio-Zweig. Andersherum fütterte der
    Audio-Zweig bei stummer Wiedergabe Nullen und senkte die Türme ab, bevor das Ersatzsignal drankäme.
  - Das Signal ist **kein Sinus über alle Würfel** (das läse sich als Welle durchs Feld, nicht als Musik),
    sondern die drei Anteile eines echten Spektrums: Kick unten (4er-Takt, 1 und 3 betont), Hi-Hats oben,
    wandernde Melodie dazwischen. Rein aus der Zeit gerechnet, ohne Zustand — der Effekt kann doppelt leben.
  - Gemessen (Handy-Viewport-unabhängig, 1536 × 791 @ DPR 1,25, Ton stumm): mittlere Bildabweichung zwischen
    Frames im Abstand 0,7 s **2,1–2,5 von 255** — zum Vergleich gilt in diesem Projekt 0,56 als nicht
    unterscheidbar. Das Feld lebt also sichtbar.
- Wächter: `test/cubematrix-demo.test.js` — rechnet das Signal NACH (Wertebereich, Bewegung je Band, Takt,
  Bass-unten-Verteilung) und hält die Verdrahtung als Ratsche fest (Pegel statt Flag · Demo vor Audio ·
  dieselbe Pipeline · im Spiel AUS · Sonderwerte weg).

#### Aurora: nachgemessen, KEIN Platzierungsfehler
Gemeldet als „nicht mittig, links ist eine Lücke". Über **18 Frames** den Schwerpunkt des Grün-Überschusses
gemessen: im Mittel **45,2 %** der Breite, Einzelframes schwanken zwischen **18,7 % und 68,3 %**. Die Aurora
ist also nicht schief montiert — sie **wandert** (Patch-Rauschen × `t*DRIFT`), und ein Screenshot zeigt eine
Drei-Sekunden-Scheibe davon. Horizontal ist der Shader ohnehin formatunabhängig: Bogen und Strahlen rechnen in
normiertem `uv.x`, nicht in Aspekt-Koordinaten.
- **`bandScale 1.12` / `bandShift 0.2` bleiben.** Sie sind VERTIKAL und wären der Kandidat gewesen (dieselbe
  Sorte Shop-Sonderwert wie oben), aber gegengerendert: mit den In-Game-Werten (1/0) wird der Bogen oben
  abgeschnitten — der Scheitel liegt über dem Rahmen. Die Sonderwerte zeigen MEHR vom Effekt, nicht weniger.
  Das ist eine bewusste Showcase-Entscheidung (#359) und weiter gültig.
- Wer die Lücken wirklich weghaben will, muss an die **Fleckigkeit** des Effekts (`PATCH_FL`/`PATCH_C`) — und
  das ändert das Spiel mit. Eigene Entscheidung, kein Vorschau-Fix.

### #fx-flaeche + #fx-dichte — die Würfel-Matrix rechnete in absoluten Pixeln (18.08.2026)
Gemeldet als „passt am Handy, am Desktop ist die Skalierung falsch". Ursache ist eine Zeile: `proj()` in
`CubeMatrixField.jsx` benutzt `D_PERSP = 205` als Brennweite in **Pixeln** — die Feldbreite hing damit gar
nicht an der Canvasbreite. Gemessen (deckende Pixel im unteren Band, Playwright im Produktionspfad):
**überall dieselben 437 px.** Als ANTEIL des Rahmens sind das: Vorschau 1244 px → **35 %** · 1045 → 42 % ·
860 → 51 % · Brett Desktop 668 → **65 %** · Brett Handy 358 → **122 %** (randvoll, angeschnitten).
Genau daher der Eindruck: am Handy ist der Rahmen schmaler als das Feld, auf jedem Desktop-Rahmen verliert es
sich mittig. **Dieselbe Sorte Fehler wie das 104 × 144-Kartenliteral in #vorschau-brett** — eine absolute Zahl,
die den Desktop-Pass nicht mitbekommen hat.
- **Die Regel ist jetzt ein Anteil**: `feldMassstab(W) = max(1, W × FELD_FUELLUNG / feldBasisBreite())`,
  `FELD_FUELLUNG = 0,80`. Am Gerät entschieden (72 % / 80 % / 88 % nebeneinander gerendert, der User hat 80 %
  gewählt — es entspricht seiner eingezeichneten Fläche). `feldBasisBreite()` ist aus der Projektion
  ABGELEITET (`2·D_PERSP·(D_SPREAD+C_SIZE)/(FELD_TIEFE−C_SIZE+3,2)`), nicht abgetippt: wer an `D_SPREAD`,
  `D_PERSP` oder `C_SIZE` dreht, zieht den Anteil automatisch mit.
- **`max(1, …)` ist keine Vorsicht, sondern die Zusage „mobil fassen wir nicht an"** (dieselbe Regel wie
  `sceneScale` in previewScale.js). Die Schwelle liegt bei ≈ 548 px; Handy-Brett (358) und Handy-Vorschau (324)
  liegen darunter und sind damit **nachweislich** unangetastet. Die Grenze ist eine BREITE, kein Gerätetyp —
  ein Tablet im Querformat trägt sie darum richtig.
- **Der Maßstab muss in die Brennweite UND in `NEAR_DY` (Front-Offset).** Beides gehört zu derselben
  Projektion; skaliert man nur die Brennweite, wächst das Feld, aber die vorderste Bodenreihe rutscht unter den
  Rahmen und der Boden ist nicht mehr bündig. Ein Wächter bindet die zwei Stellen aneinander.
- **Nachgemessen, dass die Vorschau danach ein Modell des Bretts ist** (gleicher Schwellwert, unteres Band):
  Brett im laufenden Spiel **69,5 % → 86,3 %**, Werkstatt-Vorschau **86,5 %**. Beide Flächen stehen auf
  1,93 : 1, Höhe und Maßstab wachsen linear mit der Breite → dasselbe Bild, nur größer.
- **#fx-dichte: 18 × 6 = 108 → 13 × 4 = 52**, also halbiert, über BEIDE Achsen (je Achse allein hätte die
  andere unverändert dicht gelassen). Auf einem Feld, das 80 % der Bühne einnimmt, standen 108 Türme als
  geschlossene Wand statt als Einzeltürme.
  **Die lite-Werte stehen jetzt ausgeschrieben daneben** (`C_COLS_LITE 12 · C_ROWS_LITE 4`) statt als Abzug
  (`C − 6` / `R − 2`): derselbe Abzug hätte mit den neuen Desktop-Zahlen 7 × 2 = 14 ergeben. Das Handy bleibt
  bei seinen 48.
- **Nicht am Gerät gesehen** — alles headless gemessen und nachgerendert (Chromium, echte Komponente, Brett aus
  einem laufenden Lauf). Der Blick auf einem physischen Monitor steht aus.

### #fx-grace — eine Sekunde Ruhe, bevor ein angeklickter Effekt losspielt (18.08.2026)
Ein Klick in der Effekt-Liste wechselt `sel` → das wechselt den `key` an `GlobalFxScenePreview` → die neue Szene
ist im SELBEN Frame gemountet, `GottScene` reicht `trigger={1}` an den Prunk, dessen `onFire` spielt sofort
`fx_godlike` + Swell. Beim Durchtippen der Liste knallte also jede Zeile im Moment des Tippens los.
- **`FX_GRACE_MS = 1000`, ein Hook (`useGrace`) je Szene.** Der Halt hängt am MOUNT, nicht an einem Prop: der
  Szenenwechsel IST der Remount, damit trifft er genau den gemeinten Fall. Ein Prop hätte durch alle sechs
  Szenen gefädelt werden müssen — und wäre beim Farbmodus-Toggle fälschlich noch einmal angesprungen, denn der
  remountet bewusst NICHT (#perf-shop).
- **Nur die Szenen mit echtem Abspiel-Moment**: `FinisherScene` · `ScorchScene` · `HologridScene` ·
  `BlackholeScene` · `GottScene` · `StandardFinisherScene` (Sieg-Finisher + Gottgleich-Prunk). Hintergrund-
  Effekte und Karten-Animationen laufen weiter sofort an — sie haben keinen Knall, den man abwarten könnte,
  und eine Sekunde stehendes Feldbild wäre dort keine Ruhe, sondern eine Verzögerung.
- **Der TON wartet mit, nicht nur das Bild** — er war der Anlass. Beim Schwarzen Loch heißt das ausdrücklich
  auch das Sog-Bett (`audio.loop("fx_blackhole")`), sonst wäre der erste hörbare Ton wieder sofort da.
- **Wo eine Karte im Spiel ohnehin liegt, liegt sie auch in der Wartezeit**: Klinge und Standard-Finisher zeigen
  die blanke Karte (dasselbe Bild, das SliceFx zwischen zwei Schnitten selbst rendert), die Canvas-Szenen zeigen
  ihren Backdrop. Kein zweiter Look, nur später.
- Wächter: `test/cubematrix-flaeche.test.js` — rechnet den Maßstab NACH (`feldMassstab` ist rein) und hält
  Dichte + Grace als Quelltext-Ratsche fest, inklusive der Gegenprobe „diese vier Szenen haben KEINE Grace".
  Fünf Sabotagen durchgespielt, alle fünf fallen (Maßstab nicht in der Brennweite · Front-Offset nicht
  mitskaliert · Spaltenzahl zurückgedreht · Grace aus einer Szene entfernt · Grace-Dauer auf 0).
