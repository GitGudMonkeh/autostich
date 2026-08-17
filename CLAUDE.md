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
- **Bleibt:** Hintergrund-Effekt **Aurora** (raw-WebGL `src/ui/fx/AuroraFieldGL.jsx` — Pixi-Custom-Shader rendert auf
  dem Mobile-Setup NICHT), Hintergrund-Finisher **Glutfunken** (Pixi `src/ui/fx/embersPixi.js`), der synthetische
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
- **Produktion = DOM** (`FX_RENDERER`/`pixiEnabled` sind an `VITE_PREVIEW/DEV` gegated). Pixi-Emitter laufen nur
  im Preview/Dev. In-Game + Showcase nutzen in Prod für die verbliebenen DOM-Effekte die DOM-`FieldFxLayer`. Die
  DOM-Fassung kennt **kein `deckTint`** → Standard/Deckfarbe muss über die `color`-Wahl im Aufrufer geschaltet werden
  (siehe Showcase-Fix in CustomizeScreen).
- **Aurora läuft jetzt AUCH in Produktion als raw-WebGL** (`AuroraFieldGL`, wie Neon-Brandung/#345 & Komet/#346) — der
  DOM-Fallback („Glow von oben") entsprach nicht dem Showcase. `auroraGL` (Battlefield.jsx + `auroraGLActive` in
  CustomizeScreen) = `bgFx==="aurora" && deckA1 && (Preview/Dev ? FX_RENDERER==="pixi" : true)`. Heißt: in Prod IMMER
  WebGL; im Preview/Dev bleibt der A/B-Schalter (FX:dom → DOM-`FieldFxLayer`, FX:pixi → WebGL). `AuroraFieldGL` ist ein
  kleiner statischer Import (kein Pixi), mobil bereits gedrosselt (3 Vorhänge/30fps/DPR1.4). Die DOM-Aurora in
  `FieldFxLayer` bleibt als reiner Preview-A/B-Fallback bestehen.
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
