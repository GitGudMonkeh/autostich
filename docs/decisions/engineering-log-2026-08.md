# Engineering Log — August 2026

> **This is a historical engineering log. It is not current instruction.**
>
> Current canonical instructions: `AGENTS.md`.
> Current engineering documentation: `docs/engineering/`.
> Index, status legend, and search recipes for this log: `docs/decisions/README.md`.

## How to read this file

- Entries are **dated historical records.** Each captures what was measured, decided, or rejected at
  a point in time, together with the reasoning. **Later entries may supersede earlier ones.**
- **Branch names, test counts, file lists, and "current state" claims in this file are historical.**
  They were accurate when written. Do not follow them as current instruction — verify any such claim
  against current code and current documentation before acting on it.
- **Do not read this file front to back.** It is self-indexing by `#tag`. Search for the tag or
  keyword your task needs:

```bash
grep -n "#perf-dpr" docs/decisions/engineering-log-2026-08.md
```

- Some entries carry a **status marker** (`SUPERSEDED IN PART`, `REFUTED`, `CORRECTED`) on the line
  above the heading. The marker states what no longer holds and names the later entry that changed
  it; the historical entry below the marker is unchanged. Legend: `docs/decisions/README.md`.
- The records are **German and stay German.** They are preserved as written — not translated, not
  reformatted, not spell-corrected. New engineering material is English (see `AGENTS.md`).

## Desktop-Umbau: die ENTSCHEIDUNGSREGELN (vom User abgenommen, 19.08.2026)

Der Screen-für-Screen-Umbau auf den ruhigen Desktop-Ton (#cz-ruhe → #lv-ruhe → Baum → …) läuft nach diesen
elf Regeln. Sie sind an Werkstatt und Level-up-Karten erprobt und ausdrücklich abgenommen („auch die
richtigen Entscheidungen getroffen, merke dir das für den weiteren Umbau"). **Wer den nächsten Screen
nachzieht, arbeitet sie ab — sie ersetzen das Raten.**

**Wie geändert wird**
1. **Modifikator statt Löschung.** Eine laute Fassung wird nicht entfernt, sondern bekommt einen Schalter:
   `as-ring-quiet` (Klasse), `phaseCard(…, { quiet })` (Parameter). EINE Fassung mit einem Schalter statt
   zweier Fassungen, die auseinanderlaufen. Screens, die noch nicht dran waren, behalten die laute Fassung,
   bis sie ausdrücklich nachgezogen werden — dann ist es dort ein Wort, kein zweiter Rahmen.
2. **Die BESTEHENDE Regel ändern, nie eine zweite danebenstellen.** Als eine Parallel-Session die
   Werkstatt-Reiter zu Kanten-Knöpfen gemacht hatte, wurde genau diese Regel umgeschrieben — zwei Regelsätze
   für dieselben drei Knöpfe wären die Doppelpflege, vor der die Datei sonst überall warnt.
3. **Inline schlägt Stylesheet.** Setzt ein Element seinen Stil inline (Karten, Reiter, Sticky-Köpfe), ist
   ein PARAMETER an der Quelle besser als `!important` an drei Eigenschaften. `!important` nur, wo die Naht
   sonst nicht erreichbar ist — und dann mit Begründung im Kommentar.
4. **Klammer-Technik für neue Struktur.** Ein neuer Wrapper ist unterhalb 1400 px `display: contents` —
   dann ist die Handy-Fassung DOM- und pixelgleich (`cz-fxfoot`, `gd-cols`, `gl-body`, `lv-rig`).

**Was IMMER unangetastet bleibt**
5. **Projektweite Signale.** Die farbige Linkskante der Kanten-Karten (#kante), der animierte Goldrahmen
   `as-legendary`, die Deck-Linie am Kopf. Sie in EINEM Screen zu dämpfen ließe ihn aus dem System fallen.
   Auffallen, benennen, den systemweiten Schritt anbieten — nicht ungefragt tun.
6. **Bedeutung überlebt das Leiserstellen.** Der Halo der Angebotskarten durfte fallen, WEIL dieselbe
   Information im Stufen-/Raritäts-Badge und an der Farbkante steht. Fällt mit der Optik auch die Aussage,
   ist es kein Leiserstellen, sondern ein Datenverlust.
7. **Die Handy-Fassung bewegt sich nicht** — und das wird GEMESSEN, nicht behauptet: Element-Geometrie bei
   390 px vorher/nachher. Bisher überall 0 Abweichungen. Am Handy bleibt die laute Fassung bewusst: kleiner
   Schirm, Daumenziele, die Karte braucht ihre Ablösung vom Brett.

**Wie entschieden wird**
8. **Ein Signal je Element.** Unterstreichung ODER Fläche, Kante ODER Rahmen — nie beides für denselben
   Zustand. Der Werkstatt-Reiter hat deshalb nur noch den Strich, die gewählte Listenzeile nur die Fläche.
9. **Ausnahmen brauchen einen Grund, keinen Geschmack.** „Neu würfeln" behält seinen Rahmen, weil es die
   einzige Handlung der Leiste ist, die etwas KOSTET (ein Token). Steht der Grund im Kommentar, überlebt die
   Ausnahme den nächsten Aufräumdurchgang.
10. **Nichts erfinden, was es nicht gibt.** Ein Mockup zeigt gelegentlich Knöpfe oder Icons, die das Spiel
    nicht hat (der „▷ Vorschau"-Knopf). Die werden NICHT nebenbei gebaut — und ein Icon, das nicht schon im
    System ist, kommt nie ohne Rückfrage dazu.

**Absicherung**
11. **Wächter, die RECHNEN statt Schreibweisen zu vergleichen** (`phaseCard`-Fassungen gegeneinander,
    `feldMassstab`, `previewDprCap`), plus die Gegenprobe: jede Naht einzeln sabotieren und nachweisen, dass
    der Wächter fällt. Ein Wächter, der nur grün ist, ist kein Beleg.

**Nebenregel aus einem Fehlgriff:** Wird eine Positions-Meldung untersucht, BEIDE Achsen messen. Der
Level-up-Sprung lag senkrecht; die erste Messung hatte nur `left`/`width` geprüft und „steht stabil" gemeldet.

## Arbeitsstand `Autostich/pixi` (Session bis 2026-08-11)

Gearbeitet wird ausschließlich auf `Autostich/pixi`. **Vor jedem Arbeitsbeginn UND vor jedem Push**
`git fetch origin Autostich/pixi && git rebase origin/Autostich/pixi` (Parallel-Sessions committen zeitweise
denselben Branch). Build (`npm run build`) + Tests (`npm test`, aktuell **1351 grün**) müssen vor jedem Push grün sein.
Deutschsprachiger Code/Kommentare beibehalten.

> SUPERSEDED IN PART: the starfield deletion listed below no longer holds - starfield is back, see "Rendering-Fakten" (#311).
> REFUTED: the premise "Pixi custom shaders do not render on the mobile setup" was disproved - see #fx-spike (2026-08-17).
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

> SUPERSEDED IN PART: the Leuchten/DeckGlow layer described below was removed - see #deckglow-raus (18.08.2026).
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

### #glossar-desktop — das Glossar als gerahmter Screen (2026-08-18)
Der letzte Screen im 672-px-Modal: **109 Begriffe** in einer Spalte, die 42 % der Bildbreite nutzt. Ab 1400 px
derselbe gerahmte Screen wie Baum, Werkstatt und Leitfaden — Überzug (94 % nach #ueberzug, **kein** Blur), Ränder 16/48/18,
Kopf-Raster `auto 1fr auto` + eigene Haarlinie, Panelglas, Radius 14, `as-ring`: alles an `.up-*`/`.gd-*`
**abgemessen, nicht neu erfunden**. Wie beim Leitfaden gibt es **keinen zweiten Renderpfad** — das JSX setzt die
`gl-*`-Klammern in jeder Breite, unterhalb 1400 px sind sie `display: contents`.
- **Kategorien werden zur Navigationsspalte** (300 px, `align-self: start`) mit **Zähler je Kategorie**. Und sie
  **FILTERN** dort, statt zu springen (eine Zeile, eine Seite — wie im Leitfaden). Die Sprungmarke bleibt die
  richtige Antwort auf dem Handy, wo alles untereinander steht; die Naht hängt deshalb an `useIsWide()`, nicht an
  CSS. Kategorien ohne Treffer bleiben **stehen** und werden nur blass — eine Spalte, deren Zeilen beim Tippen
  wandern, kann man nicht lesen.
- **Die Suche steht in der Kopfzeile**, in der Spalte, in der der Leitfaden seine Auskunft zeigt. Sie ist das
  wichtigste Werkzeug des Glossars und hing bisher im mitscrollenden Kopf. **Tippen schaltet auf „Alle"** — im
  Mockup lag „Serie" sonst als **1 von 6** Treffern da, die anderen fünf hinter einem selbst gesetzten und
  vergessenen Filter. Die Zähler bleiben und laden zum Nachschärfen ein.
- **Begriffe im SPALTENFLUSS** (`columns: 3 300px`), nicht im Raster — dieselbe Lehre wie #skilltext: im Raster
  bestimmt die höchste Zelle die Reihenhöhe, und dagegen hilft nur eine Klemme, die mitten im Satz abschneidet.
  „Archetypen" behält seine fünf Fraktions-Untergruppen, jede mit eigenem Fluss. Preis, bewusst bezahlt: die
  Lesereihenfolge läuft spaltenweise.
- **`display: block` an `.gl-body`/`.gl-cols` im 1400er Block ist PFLICHT, nicht Kosmetik.** Genau das hat beim
  ersten Anlauf gefehlt: die Basisregel setzt beide auf `display: contents`, ein solches Element erzeugt gar keine
  Box — `overflow` und `columns` hatten nichts, woran sie greifen konnten. Die Liste stand einspaltig und
  ungescrollt da, während `getComputedStyle` brav `column-count: 3` meldete. **Der eine Fehler, den man dem
  Quelltext nicht ansieht**, weil beide Regeln für sich richtig aussehen. Wächter hält ihn fest.
- **Ventil innen**: `.gl-scroll` ist `overflow: hidden`, gescrollt wird in `.gl-body` — sonst liefe die Ringkante
  (`as-ring`, `inset: 0`) beim Scrollen mitten durch den Inhalt (Naht wie `.cz-main`/`.gd-page .gd-cols`).
- **KEIN `--gs`-Maßstab wie beim Leitfaden.** Der muss auf EINE Seite passen; das Glossar ist eine Liste und
  scrollt ohnehin — Stufen hätten hier nichts zu regeln. Nur ein fester Schritt nach oben aus den Handy-Maßen
  (Begriff 13 → 14,5 px, Beschreibung 11,5 → 12,8 px) und dieselbe Rand-Straffung auf flachen Fenstern.
- **Neu im Register**: `GLOSSARY_CATEGORIES[].hint`, ein Einzeiler je Kategorie für den Seitenkopf (`de.js`
  erzeugt daraus `glossary.cathint.*`, `enGlossary.js` übersetzt). Er gehört ins Register, weil er ein Text ÜBER
  die Kategorie ist, kein Text der Oberfläche.
- **Handy-Fassung nachgewiesen unberührt**: Produktionsbuild vor/nach, 390 und 820 px, Geometrie der ersten sechs
  Begriffskarten identisch, Scrollhöhe identisch (12007 bzw. 8644 px), mittlere Bildabweichung **0,007 bzw. 0,003
  von 255** (0,56 gilt hier als nicht unterscheidbar).
- Gemessen 1920×1080 · 1536×791 · 1400×950: überall drei Spalten, **nirgends Seiten-Scrollen**.
- Wächter: `test/glossary-desktop.test.js` (11 Prüfungen, Gegenprobe gemacht: alle sabotierten Nähte fallen).
- **Nicht am Gerät abgenommen** — alles headless im Produktionsbuild gemessen und nachgerendert.

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

#### #formlegend — die Ratsche hat einen blinden Fleck: String-Tabellen (2026-08-18)
Gemeldet aus dem Spiel: die Legende „Formationen & Rahmenfarben" in der Aufstellungsphase stand auf Englisch
mitten in einer sonst englischen Seite **auf Deutsch**. Die acht Erklärsätze lagen als `FORMATION_LEGEND`-Tabelle
fest verdrahtet in `ArchPanels.jsx` — die i18n-Ratsche konnte sie nicht sehen: ihr Greifer fischt JSX-Textknoten
(`>…<`) und Text-Props, **keine String-Literale in einer Konstanten-Tabelle**. Wer Anzeigetext in einer Tabelle
sammelt (Legenden, Spaltenköpfe, Aufzählungen), bekommt von der Ratsche also keinen Schutz.
- **Dieselbe Lücke, andere Form:** `CODEISH` wirft jeden Fund mit Klammern/Semikolon weg. Damit lief auch
  `title="Teil einer aktiven Gletscher-Formation (2D)"` durch — die Klammer allein reichte. Beide Klassen sind in
  ArchPanels/CardGrid/GameOver/RunDetail jetzt migriert (`formlegend.*`, `cardgrid.*`, `arch.buildingsN`).
- **Die Faktoren stehen NICHT mehr im Katalog.** `formations.js` exportiert sie (`WIED_F2/F3/F4`, `WIED_STEP`,
  `ESKALATION_STEP`, `FARBBLOCK_BASE`, `TREPPE_BASE`, `WECHSEL_BASE`, `MAX_TREPPE_STEP`, `OVERLAP_BONUS`), die
  Legende formatiert sie je Sprache (`fmtNum`) — derselbe Aufbau wie `GlacierFormLegend`. Vorher hätte ein
  Balancing-Schritt die Legende still falsch werden lassen. **Zwei Nachkommastellen** über `toFixed(2)`:
  `fmtNum` kürzt die Nullen sonst weg und die Leiter ×1,25 / ×1,50 / ×1,80 liest sich nicht mehr als Reihe.
- Der Grenzbonus-Faktor kommt aus `FAMILY_DEFS.E_SEGMENT.tiers[4].crossBonus` (die Familienstufe IST die Quelle).
- Wächter: `test/formation-legend.test.js` — jede Zeile der Tabelle muss über `t()` kommen (unabhängig von der
  Sprache des Literals), jeder Formationstyp aus `FORMATION_LABELS` braucht seinen Satz in BEIDEN Katalogen, und
  keine der Tuning-Zahlen darf im Katalog stehen. Gegenprobe gemacht: der Wächter fällt bei jedem der drei Rückfälle.

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

### #buehne + #deckflug + #skillheim — der Spielbildschirm am PC (19.08.2026)
Der Lauf war der **letzte Screen ohne Desktop-Pass**: 1024er Deckel (`max-w-5xl`) mit einem lg-Umbruch bei
1024 px. Auf 1920 px blieben links und rechts je 448 px leer — und trotzdem passte er nicht auf den Schirm
(Pflanze, Eis, Perks, Skills und Musik lagen unter der Scroll-Kante). Vom Spielfeldbild (1600 × 640) landeten
dabei **23 %** auf dem Schirm: gequetscht auf 668 × 347 UND seitlich um 46 % beschnitten (`object-cover` auf
1,93 : 1 statt 2,5 : 1). Jetzt ist das Brett die **Bühne**: 2,5 : 1 wie die Quelle, auf 1920 × 1080 volle
**1600 × 640**, Dokumenthöhe exakt 1080 (kein Scrollen). Drei Etappen, drei Commits.

- **Die Bühnenbreite ist EINE Regel mit DREI Deckeln** (`--bf-w` in index.css): native Bildbreite ·
  Fensterbreite − Ränder · **`(100dvh − --rn-chrome) × 2,5`**. Der dritte ist der entscheidende: 2,5 : 1 heißt,
  dass 1600 px Breite 640 px HÖHE kosten — auf flachen Fenstern (ein 1920×1200-Laptop bei 125 % ist CSS
  1536×791) ist die Höhe die knappe Größe. `--rn-chrome: 430px` ist gemessen (Kopf + Leiste + Bank + Ränder).
- **Karten wachsen über einen MASSSTAB, nicht über ein zweites Maß.** `--card-s` = 11 % der Bühnenbreite auf
  die 104 px der Karte gerechnet (176 px bei 1600); der Slot wächst, sein Inhalt wird per `transform: scale()`
  skaliert. Die sieben 104×144-Fundstellen (Card, Klingenschnitt, Laser-Stücke, previewScale) bleiben damit
  unangetastet, und die Canvas-/Pixi-Effekte folgen von selbst — `CardFxStage` misst je Frame neu.
  **`--card-s` MUSS einheitenlos sein** (`… / 104 / 1px`): `scale()` nimmt eine Zahl, `--bf-w` ist eine Länge.
  Ohne die Division fällt die Deklaration still aus und die Karten bleiben unbemerkt auf 104 × 144.
- **Instrumentenbank statt Sidebar**: Analyse links (296), eine Spur je Archetyp (1fr), Build rechts (296).
  **Feste Höhe (270 px)** — wüchse sie mit ihrem Inhalt, schöbe der vierte Archetyp die Bühne aus dem Bild.
  **Flex statt Grid**, weil die Zahl der Fraktions-Leisten im Lauf wechselt (0–4). Die 30 px gegenüber der
  ersten Fassung kommen aus dem Außenrand darunter (`:has(.rn-shell)`, 24 → 12), nicht von der Bühne.
- **Vitalleiste**: aus zwei gestapelten Zeilen wird eine, und sie nimmt **Musik** und **Meilensteinbalken**
  auf (vorher eigene Reihen ganz unten bzw. über dem Brett). Der Umzug ist DOM (`useIsWide`), nicht Anordnung —
  zwei gerenderte Musikleisten wären zwei Fokus-Ziele. Die Chronik ist dort eine kleine KARTE (42 px
  Deck-Rücken), kein 🎴-Zeichen.
- **Deck am Rand, Karte fliegt** (#deckflug): vier Kästen auf der Bühne (Stapel · Karte · Karte · Stapel),
  Mitten bei **21,25 / 41,5 / 58,5 / 78,75 %**. Die äußeren 15,75 % bleiben frei — dort haben die
  Spielfeldbilder ihr Motiv (die Mitte ist bewusst leer). Beim Aufdecken kommt die Karte vom Stapel herüber,
  **während** sie flippt: **Maßstab außen (`bf-scale`) · Bewegung darin (`bf-fly-in`) · Drehung ganz innen
  (`as-flip3d-inner`)**. Alles auf einem Knoten überschreibt sich und kippt die Perspektive mit (dieselbe
  Regel wie Animation/Filter, #ios-word).
  - **Die Flugstrecke ist im Kartenmaßstab KONSTANT 191,45 px** — Lücke (9,25 % der Bühne) + Kartenbreite
    (11 %) geteilt durch den Maßstab (11 % / 104 px). Deshalb steht dort eine feste Zahl und keine Rechnung
    mit `--bf-w`: die Animation läuft INNERHALB des skalierten Wrappers.
  - **Falle, die zuschnappte**: `position: static` für die zwei Kästen nahm dem Deck seinen Bezugspunkt —
    die absolut liegenden Stapelkarten hingen danach an der Seite und saßen auf der Gegnerseite MITTEN AUF
    der Karte. Es muss `relative` sein.
  - **Das Feuer brennt jetzt am STAPEL** (`deckSlotRef` zeigt auf den Deck-Kasten). Das ist die Fassung, für
    die der Anker gebaut wurde (nicht neu starten bei Sieg/Verlust) — Entscheidung des Users.
- **Skills bei ihrem Archetyp** (#skillheim): `PanelSkills` am Fuß der Fraktions-Schale, Zuordnung aus dem
  Register (`archetypeOf`) — dieselbe, nach der auch das Angebot gebaut wird. `mt-auto` hält die Zeile unten,
  dadurch stehen die Skill-Zeilen aller Spuren auf EINER Linie. Gescrollt wird bei einem langen Motor nur das
  **Detail**; Kopf und Skill-Fuß bleiben stehen. Das Build-Panel lässt die untergebrachten Archetypen weg,
  **nicht die ganze Spalte**: ein Skill, dessen Panel gerade nicht steht, bleibt dort sichtbar. Sind alle
  untergebracht, entfällt die Spalte (eine Überschrift „Skills — 0" mit „ab Durchlauf 1 wählbar" wäre gelogen).
  Der **Auto-Kollaps bei mehreren Fraktionen ist ab 1400 px aus** — er ist eine Platz-Regel des Handys.
- **KEIN zweiter Renderpfad**: `rn-head/rn-body/rn-main/rn-bars/rn-bank` reichen unter 1400 px ihre Kinder
  unverändert durch (`display: contents`), dieselbe Klammer-Technik wie #desktop-leitfaden und #glossar-desktop.
  Handy-Fassung bei 390 px nachgemessen (auch mit vier Archetypen): unverändert.
- **Messstand**: ein Spätzustand mit vier Archetypen kommt nicht aus einem Turbo-Lauf (das Skill-Angebot ist
  archetyp-gegatet) — er wird über den **Simulator** erzeugt und als Fortsetzungs-Snapshot in
  `localStorage["as_activerun"]` geladen (Schema 2). Derselbe Weg wie beim Architekt-Profil (#Architekt-Mount).
  Gemessen damit: vier Spuren à 237 px, je 270 px hoch bei 268 px Inhalt.
- Wächter: `test/buehne-desktop.test.js` (29 Prüfungen, Gegenprobe gemacht: Einheiten-Division und
  `static` statt `relative` lassen ihn beide fallen).

#### #deckzug — der Stich läuft ab 1400 px in ZWEI Takten (19.08.2026)
Gemeldet: „das Ziehverhalten wirkt sehr asynchron — manchmal ziehen beide Decks gleichzeitig, manchmal nur
eines." Am Messstand nachgesehen (`getAnimations()` je Seite, 30-ms-Takt): je Stich lief auf EINER Seite
`bf-fly-in` + `as-flip-reveal`, auf der anderen `as-flyaway`. **Beide zogen nur beim Unentschieden.**
- **Ursache, und sie ist eine Reihenfolge, kein Timing:** der Stich ist beim Rendern längst entschieden.
  `flyAway`/`oppFlyAway` standen damit im ERSTEN Bild fest — und `flipOn`/`oppFlipOn` schließen die
  wegfliegende Seite ausdrücklich aus (`!flyAway`). Die Verliererkarte ist also nie eingeflogen. Bei einem
  gewählten Finisher (Klinge/Scorch/Hologrid/Loch) flippte die Gegnerkarte gar nicht: sie wird in-place
  unsichtbar gerendert, der Effekt zeichnet sie. **Vor #deckflug fiel das nicht auf** — da lagen Stapel und
  Spielfläche übereinander, es gab keinen sichtbaren Zug.
- **Der Umbau ist ein zweiter Takt, keine zweite Animation.** `zugMs` (= `flipDur`) ist die Zugdauer;
  `aufOn = sliceOn && gezogen` ist „aufgelöst wird erst, wenn die Karten liegen". Daran hängen ALLE acht
  Auflösungs-Nähte (`flyAway` · die vier Finisher-Zweige · `oppFlyAway` · `playerWinner` · `oppWinner`).
  Solange `gezogen` false ist, ist keine davon wahr → beide Seiten fliegen ein und flippen, immer.
- **Der Zustand hängt an der STICH-NUMMER** (`drawnNo === trickNo`), nicht an einem Flag. Ein
  `setDrawnNo(false)` im Effekt käme einen Frame zu spät und ließe die Auflösung des neuen Stichs für ein
  Bild aufblitzen; `drawnNo !== trickNo` ist schon im ersten Render richtig.
- **Die drei Finisher mit EIGENEM Trigger müssen mitwarten** (`nachZug`): Klinge-Ghost, Hologrid-Sweep und
  Loch-Puls hängen am Stichwechsel, nicht an einer Render-Bedingung — ohne Verzögerung schneidet bzw. saugt
  der Effekt eine Karte, die noch flippt. Scorch braucht nichts: `ScorchFx` wird an `oppScorched` gerendert,
  mountet also von selbst erst nach dem Zug.
- **`nachZug` ist STABIL** (`useCallback([])`, `zugMs` über ein Ref): als Dependency ließe ein Turbo-Wechsel
  mitten im Stich die gekeyten Effekte erneut laufen → zweiter Ghost auf demselben Stich.
- **Unterhalb 1400 px, bei reduzierter Bewegung und ab hohem Turbo (`flipMs ≤ 170`) ist `zugMs` 0** — dann
  läuft `nachZug` synchron und jede Naht rechnet wie vorher. Die Handy-Fassung ist damit per Konstruktion
  unberührt; nachgemessen (390 px, Brett-Geometrie vorher/nachher): die sechs Abweichungen von 61 Elementen
  treten **auch zwischen zwei Läufen derselben Fassung** auf — es ist der Abtastzeitpunkt innerhalb des
  Flips, keine Änderung.
- **Nachgemessen am laufenden Brett** (1920×1080): beide Seiten starten `bf-fly-in` und `as-flip-reveal` auf
  **derselben `startTime`**, der Wegflug beginnt 467–583 ms später (Zugdauer 460 ms). Vorher stand in jeder
  Zeile genau eine Seite.
- **Die Deck-Lücke ist von 9,25 % auf 3,25 % der Bühnenbreite herunter** (Wunsch: Stapel näher an die
  Spielkarten) — und in einem dritten Anlauf weiter auf 1 % (s. #deckpaar unten). Die Flugstrecke zieht
  jedes Mal mit: 191,45 → 134,73 → **113,45 px** im Kartenmaßstab. Der Wächter RECHNET sie aus der Lücke,
  statt sie zu vergleichen — wer die eine ändert und die andere vergisst, lässt die Karte an ihrer Fläche
  vorbeifliegen.

#### #kartenreihe → #deckpaar — die Abstände der Reihe, in drei Anläufen (19.08.2026, je am Bild)
Die Reihe hat vier Kästen und damit drei Abstände. Welcher davon der kleinste ist, entscheidet, was
zusammengehört — und das hat drei Runden gebraucht:
1. **3,25 % aussen / 6 % in der Mitte** (Ausgangslage): der Stapel stand WEITER von seiner Karte weg als
   die zwei Karten voneinander. Die Reihe las sich als zwei Paare mit einem Loch dazwischen.
2. **Alle drei gleich** (`--bf-gap`, 3,25 % → 52 / 52 / 52 px bei 1600): das Loch war weg, aber damit auch
   die Zugehörigkeit — vier gleich weit entfernte Karten, keine Seiten mehr.
3. **1 % innen / 3,25 % in der Mitte** (`--bf-deckgap` + `--bf-gap`): der INNERE Abstand ist jetzt der
   kleinste. Der Stapel gehört sichtbar zu seiner Karte, die Mitte ist die Grenze Spieler ↔ Gegner.
   Gemessen **16 / 52 / 16 px** bei 1600 · **10 / 34 / 10** bei 1028; die Reihe wird 860 → **788 px**.
- **Die gespielten Karten bewegen sich dabei kein Pixel** (nachgemessen 758–934 und 986–1162 vor wie nach):
  die Reihe ist symmetrisch und zentriert, ein kleinerer AUSSEN-Abstand zieht nur die Stapel nach innen.
- **0,75 % war zu eng** (12 px bei 1600, 8 bei 1028 — beide Kartenrahmen stossen fast zusammen), deshalb 1 %.
  Ganz ohne Naht läsen sich Stapel und Karte als ein Objekt; der Wächter verlangt darum > 0.
- **Die Flugstrecke hängt an der INNEREN Lücke** — über die fliegt die Karte: (1 % + 11 %) × 104 / 11 % =
  **113,45 px** im Kartenmaßstab. Am laufenden Brett gegengeprüft (erster Keyframe gegen die gemessene
  Distanz Stapelmitte ↔ Kartenmitte): **−192/+192 px bei 1600, −123/+123 bei 1028, Soll = Ist**.
- Der Wächter RECHNET beide Faktoren gegeneinander (innen < mitte, innen > 0) und leitet die Flugstrecke
  aus `--bf-deckgap` ab, statt Zahlen zu vergleichen — ein Zahlendreher sähe im Quelltext sonst „geändert" aus.

#### #turbo-takt — bei Turbo passte die Choreografie nicht mehr in den Stich (19.08.2026)
Gemeldet: „die Animationen werden verkürzt oder geskippt, wenn ich auf einen der Turbos gehe — wie am Handy
sollten alle spielen, egal ob normal, ×2, ×4 oder MAX." Am laufenden Brett nachgemessen (`getAnimations()`,
Zug + Wegflug gegen den Stich-Takt): **1× 1360 von 1750 ms ✔ · ×2 1060 von 880 ✗ · ×4 540 von 440 ✗ ·
MAX 540 von 300 ✗**. Der nächste Stich schnitt sie ab.
- **Es war NICHT das Überspringen einer Seite** — der Zug lief auf allen vier Stufen beidseitig (#deckzug
  wirkt). Es waren die festen **Untergrenzen** in `clamp(flipMs × f, MIN, MAX)`: 220 ms für den Zug,
  320 ms für den Wegflug. Sie halten die Dauer, wenn der Takt längst darunter liegt — bei MAX frisst der
  Zug damit 73 % des Stichs und für den Wegflug bleibt nichts.
- **Zwei Anteile als ZUSÄTZLICHE Deckel** (`ZUG_ANTEIL 0,40` · `WEG_ANTEIL 0,52`), keine neuen Werte: bei
  1× greifen sie nicht (0,40 × 1750 = 700 > 460 · 0,52 × 1750 = 910 > 900), das **Normaltempo ist
  unverändert**. Ab ×2 skalieren sie beide Takte mit dem Tempo mit — jede Animation läuft dann
  VOLLSTÄNDIG, nur schneller. Nachgemessen: ×2 783 von 880 · ×4 366 von 420 · MAX 255 von 310 ms.
- **Zusammen 92 %** — die restlichen 8 % sind der Atemzug zwischen zwei Stichen. Der Wächter rechnet die
  Summe für ×2/×4/MAX nach und verlangt zugleich, dass bei 1× KEIN Deckel greift.
- **Eine neue Untergrenze wäre genau der Fehler, den das behebt.** Bei MAX plus voller Rundenbeschleunigung
  (`dynamicSpeed`) wird der Zug rechnerisch bis auf ~78 ms kurz. Das ist gewollt: MAX heisst schnell, und
  eine vollständige kurze Animation ist besser als eine abgeschnittene lange.
- **Nur ab 1400 px** (`wide`): die Handy-Fassung hat keinen Zug-Takt und behält ihre Rohwerte. Nachgewiesen
  über einen Pixelvergleich des Bretts bei 390 px (Lauf angehalten, Effekte aus): **0,0000 von 255**,
  größte Einzelabweichung **0**.
- **Nicht angefasst**: die Ghost-Timings des Klingenschnitts (`sHalves`/`sSpark`/`sFloat`). Der Ghost ist
  bewusst vom Stich-Takt entkoppelt und darf mit dem nächsten Stich überlappen — er liegt als eigene Ebene
  über dem Brett, nicht auf der Karte.
- **Offen / nicht am Gerät gesehen**: alles headless über Playwright im laufenden Dev-Server gemessen und
  nachgerendert, kein Blick auf einem physischen Monitor. Ebenfalls offen: eine echte **Desktop-Fassung der
  vier Fraktions-Leisten** (sie sind für 358 px Handy-Breite gebaut; in einer 237-px-Spur bricht mehr um, als
  nötig wäre), die @2x-Frage für die 52 Spielfeldbilder (auf einem 2×-Display braucht eine 1600-px-Bühne
  3200 Bildpixel, die Quelle hat 1600) und der Blick auf die Bühne über alle 40 Decks.

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

### #lv-fluegel + #sk-reiter — Level-up-Karte mit zwei Seitenleisten, Skill-Wahl mit Fraktionsreitern (18.08.2026)
Perk- und Skill-Wahl bleiben **eine Karte über dem Brett** — bewusste AUSNAHME vom Desktop-Pass: die anderen
Screens ersetzen den Hub, diese hier unterbrechen einen laufenden Stich. Was auf dem Desktop fehlte, war nicht
Rahmen, sondern Platz. Ab 1400 px ist die Karte **880 px** breit (vorher `max-w-3xl` = 768) und hat zwei
ausklappbare Flügel (`src/ui/LevelupWings.jsx`): **links** das Deck (`FormationPanel` — Kartenraster + aktive
Formationen + 🏗-Gebäude-Toggle — plus `DeckStrength`), **rechts** die `StatusRail`, also dieselbe Komponente wie
neben dem Brett. Kein Nachbau: sonst driften die Kennzahlen im Overlay von denen im Spiel weg.
- **Drei-Spuren-Raster, Mittelspur FEST** (`minmax(0,1fr) 924px minmax(0,1fr)`; 924 = 880 + 2 × 22 Griffbahn).
  Zwei Fallen, beide beim Bauen zugeschnappt und beide GEMESSEN: (1) mit `auto` als Mittelspur misst sich die
  Spur am Inhalt → die Karte wurde beim Zuklappen eines Flügels **880 → 784 px** schmal; (2) ohne ausdrückliches
  `grid-column: 1/2/3` greift die Auto-Platzierung → fehlt der linke Flügel, rutscht die Karte in Spur 1 und
  klebt bei **38 px** am Fensterrand statt bei 360. Beides sieht mit beiden Flügeln offen völlig richtig aus.
- **Nichts wird verdeckt** — die Flügel sind Geschwister im Raster, keine Überlagerung; sie schrumpfen mit ihrer
  Spur (`width: 320px; max-width: 100%`). Nachgemessen 1600/1536/1400 px: Karte immer 880 px auf denselben
  Pixeln, Lücke zu beiden Flügeln 22 px, **kein waagerechter Überlauf**. Die 22-px-Bahn hält der Kartenrand frei,
  dort sitzen die Griffe — ein Wächter bindet Bahnbreite, Griffbreite und `left/right: -22px` aneinander.
- **Zustand in den OPTIONEN, nicht in `useState`** (`lvWingDeck`/`lvWingStats`): die Karte wird bei JEDEM
  Level-up neu gemountet, ein Komponenten-State wäre also jedes Mal wieder auf Default. Derselbe Weg wie
  `lastSkillArch`. Beide Schlüssel brauchen einen Eintrag in `DEFAULT_OPTIONS` — sonst schluckt sie der
  `{...DEFAULT_OPTIONS, ...o}`-Merge in `loadOptions`. Default **an**.
- **Keine doppelten Daten**: zeigt der linke Flügel Deck und Formationen, lassen beide Karten ihre gleichnamigen
  Klappfelder weg (`deckWingOpen`). Zuklappen holt sie zurück — der Flügel ersetzt sie, er verdrängt sie nicht.
- **#sk-reiter**: ab 1400 px steht statt des Swipe-Pagers eine Reiterzeile — `groups.map` + `goTo(i)`, also
  derselbe Zustand, nur zweite Darstellung. **Kein neuer State.** Jeder Reiter nennt seine drei Skillnamen als
  Vorschau; damit sieht man alle zwölf Angebote (`SKILLS_OFFERED = 12` = 3 je Fraktion), OHNE durchzuklicken.
  `repeat(n, 1fr)`, nicht feste Vier — `groups` filtert leere Fraktionen weg, es können 1–4 sein. Gerendert ist
  immer nur EINE Navigation (`wide`-Zweig): zwei hießen zwei Tab-Reihenfolgen und zwei Tutorial-Ziele.
  Das Angebot steht dreispaltig (`sm:grid-cols-2` ließ die dritte Karte allein in Zeile 2 mit Loch daneben).
  Die Passiv-Beschreibung ist auf dem Desktop **offen** (`openArch === null` = „noch nicht angefasst"; bewusstes
  Zuklappen schreibt `""`, damit „zu" auch zu bleibt). Der Leitfaden-i-Chip saß am Pager-Badge und wandert in
  die Passiv-Zeile — sonst wäre der Archetyp-Leitfaden von der Skill-Wahl aus nicht mehr erreichbar.
- **Handy nachweislich unangetastet**: Element-Geometrie bei 390 px vorher/nachher verglichen — Perk **0**
  Abweichungen, Skill genau **eine** neue Box (der Flex-Behälter der Passiv-Zeile, weil der i-Chip ein eigener
  Knopf sein muss — verschachtelte `<button>` sind ungültig) auf exakt demselben Rechteck wie der Knopf vorher.
- Wächter: `test/levelup-wings.test.js` (14). Gegenprobe gemacht: `auto`-Spur, fehlendes `grid-column`,
  verstellte Griffbahn und aufgehobene Entdopplung lassen ihn fallen.
- **Nachjustiert am Bild (18.08.2026, zweite Runde):**
  - **Die Karte trägt ab 1400 px KEINE Kontext-Klappfelder mehr.** Deck-Stärke, Formationen und Build sind in
    den Flügeln zu Hause; der Build steht rechts UNTER den Multiplikatoren (erst wodurch der Score entsteht,
    dann womit). Gebunden an die BREITE, nicht an den Auf-/Zu-Zustand der Flügel — andersherum wäre der Griff
    kein Schalter, sondern nur eine zweite Anordnung derselben Inhalte.
  - **Das Kartenraster im Flügel trug Desktop-Schriftgrößen auf Handy-Breite.** Tailwinds `sm:`-Varianten
    greifen am VIEWPORT (≥ 640 px), nicht an der Panelbreite — auf einer 50-px-Kachel drängelten sich
    24-px-Kartenzahl, 12-px-Faktor und 11-px-Formationskürzel. Die Regeln in index.css setzen sie auf die
    Werte zurück, für die das Raster gebaut ist (16 / 8 / 7,5). Faktor und Kürzel sind dabei ABSICHTLICH
    verschieden groß: der Faktor steht mittig im Fluss, das Kürzel absolut unten rechts — auf einer schmalen
    Kachel stoßen sie sonst zusammen. Container Queries wären das saubere Werkzeug.
  - **Der Gebäude-Rahmen saß versetzt — es war das Schriftladen.** `CardGrid` misst die Zellen in einem
    `useLayoutEffect` und hält sie über einen `ResizeObserver` aktuell; der sieht aber nur die Größe des
    RASTERS. Laden Orbitron/Geist nach, ändern sich die Zellen INNEN, ohne dass das Raster seine Außenmaße
    ändern muss → der Rahmen bleibt auf der Ersatzschrift stehen. Jetzt misst er zusätzlich bei
    `document.fonts.ready` nach (dieselbe Falle wie #ios-word Punkt 2). Im Spiel fiel das kaum auf, im
    schmalen Flügel sofort: dort ist die Kachel halb so breit, ein Versatz von 4 px also ein Achtel davon.
  - **Die Passiv-Beschreibung merkt sich ihren Zustand** (`options.lvPassive`, Default ZU) statt in einem
    `useState` zu liegen — die Skill-Wahl wird je Phase neu gemountet, man musste sie also in JEDER Phase neu
    zuklappen. Bewusst EIN Schalter für alle Fraktionen: „aufgeklappt lassen" ist eine Lesegewohnheit, keine
    Eigenschaft der gerade gezeigten Fraktion. Damit ist auch die frühere „auf dem Desktop offen"-Regel weg.
  - Flügelbreite 320 → 356 px (greift erst ab ~1670 px Fenster; darunter deckelt die Spur), Polster
    14/16 px — „Bester 244.744" stand 1 px vor dem Innenrand.
- **Dritte Runde (18.08.2026) — Angebot aufgeräumt:**
  - **Gleiche Kartenhöhen wie in der Legendär-Auswahl.** `LegendarySelect` löst das seit einem Playtest
    („die Reihe wirkte zerrissen") mit `gridAutoRows: "1fr"`; dasselbe Mittel steht jetzt an `.sk-offers`.
    **`align-items: stretch` muss mit** — das Angebotsraster trägt ein `items-start`, ohne die zweite Zeile
    zöge sich die Karte INNERHALB der gleich hohen Zeile wieder auf Inhaltshöhe und die Regel täte sichtbar
    nichts. Gemessen 1600 und 1400 px: 255 / 255 / 255 px. Bewusst NUR ab 1400 px — am Handy ist das Angebot
    einspaltig, dort bläht `1fr` jede Karte einzeln auf und verlängert den Screen.
  - **Die Namensvorschau im Reiter ist wieder raus.** Sie war das Argument für die Reiterzeile („alle zwölf
    ohne Klick"), passt aber nicht: der längste Fall ist in BEIDEN Sprachen Blitz — 58 Zeichen DE
    („Breitenbeschleuniger · Statische Aufladung · Blitzableiter") / 60 EN — auf ~181 px Textbreite, also
    zweizeilig. Entscheidung des Users: weglassen, man klickt die Reiter ohnehin durch. Der Reiter ist
    damit einzeilig (44 px). Nützliche Nebenzahl: die Reiterbreite ist von der Fenstergröße UNABHÄNGIG
    (Karte fest 880 → Reiterzeile 846 → je Reiter ~205 px), eine Messung deckt also alle Desktop-Breiten ab.
  - **Ionisierung gekürzt** (~330 → ~200 Zeichen). Raus sind drei Dinge, keins davon geht verloren:
    „+1 je Blitz-Skill über 2" skaliert mit dem ARCHETYP statt mit dem Skill → wandert in den
    Glossar-Eintrag *Ionisierung* (den der Passiv-Aufklapper direkt darunter zeigt); „dann Ladung leeren"
    ist implizit und mit **Reststrom** sogar falsch (verbraucht wird auf den Boden 4, nicht auf 0); und der
    Voll-Tiefe-Satz beschreibt den Umrechnungskurs von **Überschlag** (10 → 5 Prozentpunkte je Ladung),
    wirkt ohne diesen Skill also gar nicht — und Überschlag sagt ihn in seinem eigenen Text bereits wörtlich.
    **Score- und Crit-Zeile bleiben ausdrücklich stehen** (Entscheidung des Users: sie entscheiden mit, ob
    man den Skill nimmt), obwohl sie auch im Glossar stehen.
  - Offen/nicht angefasst: Überschlag und Reststrom bekommen denselben Durchgang später.
  - **Die Karte hat ab 1400 px keine feste Höhe mehr.** Am Handy ist `height: min(92dvh,760px)` richtig (die
    zentrierte Karte sprang sonst beim Archetyp-Wechsel in Position UND Größe); auf dem Desktop ist sie die
    Mittelspur eines Rasters, dessen Höhe die höheren Flügel bestimmen — der Kopf steht also fest, und der
    Rahmen darf am Angebot enden. `max-height` bleibt als Deckel. Gemessen 1600 px: **540 px ohne gehaltene
    Skills, 673 px mit einem** — der Rahmen wächst also erst ab der zweiten Skill-Runde, statt vorher einen
    halben Bildschirm Leere zu zeigen.
  - **Die Haarlinie trägt jetzt die Identitätsfarbe der Phase** (Skill = Fraktion, Perk = Rot) statt des festen
    Tri-Color-Verlaufs: Rahmen, Überschrift und Balken sagen dasselbe. `PhaseHairline` nimmt dafür einen
    optionalen `accent` (ein PHASE_ACCENTS-Eintrag) und baut den Verlauf aus dessen `rgb`
    (halbtransparent → voll → halbtransparent, damit der Balken seine Silhouette behält). **Ohne `accent`
    bleibt der alte Verlauf** — Legendär, Ziel, Gletscher, Aufstellung und Architekt tragen ihn weiter und
    sollen sich nicht heimlich mitverändern; sie umzustellen ist je eine Zeile.
  - **Zurückgenommen**: die Flügelrahmen kurz auf `--deck-border` gestellt und wieder auf den Archetyp-Akzent
    zurück (Entscheidung des Users: „das ist sogar besser"). Die #356-Regel („neutrale Struktur-Panels tragen
    den Deck-Rahmen") gilt damit hier bewusst NICHT — die Flügel gehören zur Phase, nicht zum Brett.
- **Nicht am Gerät gesehen** — alles headless im Produktionspfad gemessen und nachgerendert.
- **Gleich mitgezogen (#sprache-Nachzügler)**: `BuildSummary.jsx` und `BuildPanel.jsx` sind jetzt migriert und
  stehen in der `MIGRATED`-Ratsche. Sieben neue Schlüssel (`build.*`). Anlass war die deutsche Fußzeile der
  Deck-Stärke, die im englischen Build danebenstand — dabei kamen die Build-Panel-Überschriften („Perks — N",
  „Skills — N") und drei „noch keine …"-Texte mit heraus, die genauso einsprachig waren.
  - **`empty` als Default-PARAMETER darf `t()` rufen** (`empty = t("build.perks.empty")`): Default-Werte werden
    bei JEDEM Aufruf ausgewertet, nicht beim Laden des Moduls — ein Sprachwechsel schlägt also durch. Eine
    Modul-Konstante daneben wäre auf der Startsprache eingefroren.
  - Die Schwelle „unschlagbar" (>10) stand zweimal da — im Filter und ausgeschrieben in der Legende. Sie ist
    jetzt `UNBEAT_OVER` und wird in den Text interpoliert.
  - **Falle in `BuildPanel`**: der Filter-Parameter hieß `t` und hätte den i18n-Leser in genau dieser Funktion
    verdeckt (jetzt `lv`). Der Fehler wäre erst beim nächsten `t()`-Aufruf INNERHALB des Filters aufgefallen.
  - `build.perks.head`/`build.skills.head` stehen in `SAME_OK` — „Perks"/„Skills" heißen in beiden Sprachen gleich.

### #packsort + #herausforderungen — Sortier-Knopf in der Werkstatt, und der Reiter heißt jetzt deutsch (18.08.2026)
Neben den drei Filtern (Alle · Besitz · Kaufbar) steht auf den Reitern **Packs** und **Herausforderungen** ein
vierter Knopf, der die Kachel-Reihenfolge umschaltet. **Die Beschriftung ist der NÄCHSTE Klick**, nicht der
Zustand: „Farbe" → sortiert nach Farbe und heißt danach „Preis" → sortiert zurück. Zwei Zustände, kein Menü.
- **Der Gegenpol heißt je Reiter anders.** Eine Herausforderung hat keinen Preis (`packPrice` gibt für
  cond-Packs `null`), dort steht **„Standard"** = die gewachsene Register-Reihenfolge. „Preis" wäre gelogen.
- **Sortiert wird nach FARBTON der Pack-Akzentfarbe `a1`** (HSL-Hue, Rot → Gelb → Grün → Blau → Violett →
  zurück zu Rot). Unbunte Packs (Sättigung < `NEUTRAL_S` = 0,12) und solche ohne lesbaren Hexwert wandern ans
  ENDE — sie haben keinen Platz im Farbkreis und stünden sonst zufällig mitten im Regenbogen.
  Die Rechnung liegt rein in **`src/ui/packSort.js`** (kein React) → der Wächter rechnet sie nach.
- **Die Sortierung sitzt im SCREEN, nicht in `PacksView`** — und das ist die eigentliche Falle: `catList` ist
  die eine Quelle für die Kacheln, den Index der Detailansicht (`packOv.idx`) UND das Blättern mit ‹ ›. Läge
  sie in der Ansicht, zeigte das Detail nach dem Umschalten ein anderes Pack als die angetippte Kachel.
  Beim Umschalten wird der offene Index über `indexOf` auf DASSELBE Pack umgerechnet statt zugeklappt — ab
  1400 px steht das Detail dauerhaft daneben, ein Zuklappen sähe dort wie ein Fehler aus.
- **Im Farbmodus entfällt das Vorziehen des ausgerüsteten Packs** (`orderPacks`): es risse ein Loch in den
  Farbverlauf. Der Standardmodus gibt dieselbe Liste **unverändert** zurück (gleiche Referenz, kein Kopieren).
- **Der Knopf trägt bewusst KEINE Aktiv-Kante** wie die Filter. Sie widerspräche der Beschriftung: es leuchtete
  „Preis", während nach Farbe sortiert ist. Rückmeldung ist die Umsortierung selbst. Abgesetzt ist er über eine
  **Haarlinie** — in der Filter-Optik läse sich „Farbe" neben „Kaufbar" als vierter Filter („zeige nur farbige").
  Ein Icon dafür gibt es im System nicht, und eins einzuführen ist ohne Rückfrage verboten (s. #rahmen).
- **„Challenges" heißt im Deutschen jetzt „Herausforderungen"** (Werkstatt-Reiter, Deck-Detail-Reiter, Hinweis-
  text, Ranked-Badge). Englisch bleibt „Challenges"/„challenge". `shop.head.challenges` sagte das längst — die
  Reiter waren die letzten Stellen mit dem englischen Wort. Nachgemessen: der lange Reiter passt auf 390 px in
  beiden Zeilen (Werkstatt 126 px von 324 · Deck-Detail 140 px von 324, je einzeilig).
  **Zwei Einträge sind aus `SAME_OK` geflogen** (`shop.tab.challenges`, `deckdetail.tab.challenges`) und die
  Begriffstabelle hat eine Zeile mehr: *Herausforderung → challenge*. `Challenger` (Ranglisten-Archiv) ist
  davon NICHT betroffen — das ist ein Modusname, kein übersetzbares Wort.
- Wächter: `test/pack-sort.test.js` (Farbrechnung + Beschriftung + Verdrahtung als Quelltext-Ratsche).
- **Am Gerät nicht abgenommen** — im Produktionsbuild über Playwright gerendert (390 px DE und 1600 px EN,
  beide Reiter, beide Sortierungen) und die Reihenfolge aus den Kachel-Kantenfarben ausgelesen.

### #rahmen-huelle + #run-dialoge + #graph-achsen — Nachzügler des Desktop-Passes (19.08.2026)
Ein Muster zog sich durch den Pass: Panels füllten die verfügbare FLÄCHE statt ihren INHALT zu umschließen.
Bei vollen Screens fällt das nicht auf — genau dann nicht, wenn man es baut.
- **Bestenliste/Ranked**: die Karte setzt ihre Höhe INLINE (`min(88vh, 760px)`, aus der Handy-Fassung), und
  `.lb-root` zog sie zusätzlich auf `stretch`. Bei drei Einträgen stand damit ein 760-px-Rahmen um 350 px
  Inhalt. **`height: auto !important` + `max-height: 100%`** — `max-height` allein überstimmt eine explizite
  `height` NICHT, das war die Falle. Dazu `.lb-root` auf `align-items: start` und `.lb-body` auf
  `align-self: start` (der alte Kommentar dort las „endet am letzten Eintrag statt am Rahmen" als Fehler —
  es ist das gewünschte Verhalten). Gemessen 1920×1080: Global 760 → **347 px**, Ranked 760 → **505 px**,
  je 1 px Rest.
- **Victory · Gebäude-Liste**: `repeat(auto-fill, minmax(300px, 1fr))` legt LEERE Spuren an → bei EINEM
  Gebäude ein 1220 px breiter Rahmen um eine 300-px-Karte. Die Spaltenzahl kommt jetzt aus der ANZAHL
  (`--gob-cols`, in GameOver.jsx auf max 3 gedeckelt) plus `width: fit-content`. Gemessen: 1 Gebäude
  1220 → 322 px, 7 Gebäude weiter dreispaltig (930 px).
  **`auto-fit` ist NICHT die Lösung** — zusammen mit `fit-content` klappt es auf EINE Spalte zusammen und
  macht aus sieben Gebäuden eine Liste. Sieht im Quelltext plausibel aus, ist beim Bauen passiert.
- **NICHT angefasst: `.go-stats`/`.go-build` bleiben `align-self: stretch`.** Kurz auf `start` gestellt und
  wieder zurück: das ist die gemessene Entscheidung aus #go-breit („ein Panel mit Luft am Fuß ist kein Loch"),
  und die Luft unter dem Score-Verlauf ist nicht das Problem — sie ist der PLATZ für den Graphen.

#### #run-dialoge — Beenden und Neustarten (`src/ui/RunConfirm.jsx`, neu)
Beide Rückfragen waren auf jeder Breite `max-w-xs` (320 px) und fragten in der Reihenfolge „Titel → Knöpfe →
Erklärung, was die Knöpfe tun". Am Handy ist genau das richtig (#362 zieht die Aktionsleiste nach oben, damit
man zum Bestätigen nicht scrollen muss); auf dem Desktop gibt es kein Scrollen, dort kostet es nur eins.
- **Beenden (560 px): Optionszeilen statt Knopfreihe.** Drei Wege, zwei davon fast gleich benannt
  („Beenden" / „Beenden & speichern") — jede Zeile trägt ihre Folge jetzt SELBST (Kanten-Karte wie bei
  Perks/Skills/Packs), der gemeinsame `app.abort.help` entfällt dort. Drei neue Schlüssel (`*.sub`).
- **Neustarten (440 px): dieselbe Karte, nur breiter** — zwei Wege, nichts zu verwechseln; die Warnung steht
  auf dem Desktop VOR den Knöpfen.
- **`Enter` löst die primäre Wahl aus** (nur Desktop, nur solange der Dialog offen ist); `Esc` schließt über
  den bestehenden Pfad. Die Kürzel stehen im Knopf — sonst weiß sie niemand.
- **Der Überzug behält seinen Blur**, anders als die großen Screens (#perf-blur): was dort gemessen wurde, war
  ein vollflächiger Filter unter einem Screen, über den dauernd neu gemalt wird. Diese Dialoge stehen still.
- Handy-Fassung nachgewiesen unverändert: Element-Geometrie bei 390 px vorher/nachher **identisch**, beide Dialoge.

#### #graph-achsen — der Score-Verlauf mit Achsen
`Sparkline` bekommt einen Schalter `axes` statt einer zweiten Komponente (eine zweite Fassung driftet).
Der Victory-Screen schaltet ihn ab 1400 px ein, die StatusRail bleibt bei der kompakten Linie.
- **`preserveAspectRatio` muss dafür weg.** Die kompakte Linie zieht sich mit `none` auf jede Kachelgröße —
  mit Beschriftung verzerrt das die Buchstaben mit (x und y skalieren unabhängig). Die Achsen-Fassung rechnet
  in einem festen Seitenverhältnis (620 × 250) und skaliert gleichmäßig.
- **Runde Achsenwerte, keine Drittel**: `niceStep` (1 · 2 · 5 × 10^k) unter einem Drittel des Maximums →
  0 / 1M / 2M statt 0 / 754.978 / 1,5M / 2,3M.
- Die x-Achse rechnet in STICHEN (`(i+1) × GHOST_STEP`), nicht in Stützstellen — die Zahl an der Achse ist
  sonst ein Index, den niemand kennt.
- **Nicht am Gerät gesehen** — alles headless im Produktionspfad gemessen und nachgerendert.

> CORRECTED: the reasoning below is wrong in two places - see #cube-takt (18.08.2026); the inequality itself still holds.
### #cube-deckfarbe + #cube-flimmern — zwei Nachzügler am Würfel-Feld (18.08.2026)
- **Der Bodenraster war das einzige Element, das den Farbmodus nicht mitgemacht hat.** `drawFloor` las ein festes
  `GRID_COL` (`#7a2fff`), während Türme und Punkte längst über `deckColored` umfärbten. Im Deckfarbe-Modus ist er
  jetzt die **Mischung der beiden Deckfarben** — dieselbe Rolle, die das Standard-Violett zwischen Cyan und Magenta
  spielt: der Boden liegt farblich zwischen den zwei Enden der Turm-Skala, statt eine dritte Farbe einzuführen.
  Gemessen (Demo-Signal, Deck orange/grün, nur die schwachen Rasterpixel gemittelt): Standard **rgb(83,49,85)**
  gegen Deckfarbe **rgb(66,59,51)**. `drawFloor` liest `propsRef.current` selbst — das `p` der Zeichenschleife
  reicht dort nicht hinein.
  - **Vorbehalt**: bei KOMPLEMENTÄREN Deckpaaren (Orange/Grün) ist die Mischung ein Oliv. Auf ~20 % Deckkraft
    unter den Türmen fällt das kaum auf; wenn doch, ist die Alternative eine Zeile — statt der Mischung die
    Deck-PRIMÄRFARBE.
- **Das Flackern war die Rückflanke.** `RELEASE: 0.20` lag ÜBER `ATTACK: 0.16` — der Turm fiel zwischen zwei
  Schlägen also steiler zurück, als er hochgekommen war, und genau das liest sich als Flackern statt als Puls.
  Ein Hüllkurvenfolger will es andersherum: schnell rauf, langsam runter. **0,20 → 0,09.** Die SPITZEN bleiben
  unangetastet (die Höhe hängt an `GAIN`/`CONTRAST`), es fällt nur weicher ab. Trifft beide Enden der adaptiven
  Skala, weil `SLOW` sie multipliziert — also auch die schnellen Lieder, um die es ging.
  **Wer die Bewegung insgesamt dämpfen will, dreht an `CONTRAST`, nicht an dieser Ungleichung.**
- Wächter: `test/cubematrix-demo.test.js` — `drawFloor` muss `deckColored` lesen, und die Rückflanke muss
  langsamer sein als die Anstiegsflanke. Gegenprobe gemacht: beide Rückfälle lassen ihn fallen.
- **Nach Gehör nicht abgenommen** — die Rückflanke ist aus der Hüllkurven-Mathematik hergeleitet, nicht an einem
  Lied gemessen (headless gibt es keine Wiedergabe).
- **NACHTRAG (#cube-takt, s. u.): die BEGRÜNDUNG oben ist an zwei Stellen falsch, die Ungleichung bleibt richtig.**
  „0,20 → 0,09 halbiert die Fallzeit" ist umgedreht — ein halbierter Koeffizient **verdoppelt** sie. Und „die
  Spitzen bleiben unangetastet" gilt nur, wenn man die Zeichenrate für unendlich hält; bei einem Tiefpass
  entscheidet die Rate mit über die erreichte Höhe. Das gemeldete Flackern war real, saß aber in der Zeitbasis.

### #cube-takt — die Würfel-Matrix rechnete in Frames statt in Zeit (18.08.2026)
Gemeldet vom Handy: „die Würfel kommen nicht mehr hinterher, synchron mit der Musik zu laufen — obwohl die Frames
nur auf ca. 50 fps droppen. Es ist langsam und kaum Ausschlag." Es waren nicht die fps. Es waren **zwei
Konstruktionsfehler, die sich gegenseitig verstärkt haben** — und beide sahen im Quelltext gesund aus.
- **Die Hüllkurve war frame-, nicht zeitbasiert.** `cubeV[i] += (ziel − cubeV[i]) * ATTACK` lief einmal je
  GEZEICHNETEM Frame. Ein solcher Koeffizient ist keine Geschwindigkeit, sondern eine Geschwindigkeit geteilt
  durch die Zeichenrate. `dt` wurde zwar berechnet und an `render()` gereicht — aber nur für Stille-Fenster und
  Demo-Takt benutzt, nicht für die Hüllkurve.
- **Die Drossel lieferte 20 Zeichnungen/s statt der im Kommentar versprochenen 25.** `FRAME_MS = liteOn() ? 40 : 24`
  ohne die halbe Frame-Toleranz: auf einem 60-Hz-Schirm fällt der Frame bei 33,3 ms durch die 40er-Schwelle,
  gezeichnet wird erst der bei 50 ms. Exakt die Falle, die `mobileTier.js` seit #perf-warm für die WebGL-Felder
  beschreibt — die Datei hatte sie nur nie gelesen, sondern ein eigenes Literal geführt (zweite Wahrheit).
- **Zusammen ergab das Zeitkonstanten von 0,31 s (Anstieg) und 0,56 s (Rückflanke)**, mit dem Trägheits-Faktor
  0,63 / 1,11 s. Bei einem Schlag alle 0,46–0,54 s heißt das: die Spitze kommt eine knappe Zählzeit **zu spät**
  und der Turm ist zum nächsten Schlag noch zu 38–62 % oben — der Ausschlag findet auf einem Plateau statt.
  Das ist die vollständige Erklärung für „langsam" UND „kaum Ausschlag" aus EINER Ursache.
- **Die Spitzenhöhe hing mit an der Rate — der Punkt, den die #cube-flimmern-Notiz bestreitet.** Ein
  Kick-Transient dauert im Spektrum ~150 ms; bei 50 ms je Zeichnung sind das 3 Schritte, ein Tiefpass erreicht
  davon `1 − 0,84³ ≈ 41 %` der Zielhöhe. Bei 60/s wären es 9 Schritte und ~79 %. **Weniger Zeichnungen =
  niedrigere Türme**, ganz unabhängig von `GAIN`/`CONTRAST`.
- **Ein fps-Einbruch machte den Effekt LANGSAMER, nicht nur ruckeliger** — 60 → 50 fps kostete ein Fünftel der
  Geschwindigkeit. Genau deshalb passte die Beobachtung des Users („nur 50 fps, trotzdem völlig daneben") nicht
  zu einer reinen Ruckel-Erklärung.

**Der Umbau, in drei Teilen:**
1. **Zeitkonstanten statt Schrittanteile.** `TAU_UP: 0.10` / `TAU_DN: 0.30` (Sekunden), umgerechnet über
   `glaettung(dt, τ) = 1 − exp(−dt/τ)`. Ebenso `TAU_BASE` (Grundpegel, war `0.04`/Frame) und `TAU_ACT`
   (Song-Aktivität, war `0.01`/Frame). `SLOW: 0.5` als Koeffizienten-Faktor wird zu `TAU_SLOW: 2.0` — halber
   Koeffizient = doppelte Zeit. **Damit ist das Verhalten von der Bildrate entkoppelt**: bei 20, 30 oder 60
   Zeichnungen/s steht der Turm zur selben Wanduhrzeit auf derselben Höhe, nur feiner aufgelöst.
   - **Nicht `dt/τ` nehmen** (lineare Näherung): die läuft bei `dt > τ` über 1 und katapultiert bei einem
     Frame-Aussetzer den Turm über sein Ziel. Die Exponentialform ist zugleich die, für die „zwei halbe
     Schritte = ein ganzer" exakt gilt — und genau das ist die Eigenschaft, die der Wächter nachrechnet.
   - **`TAU_ACT` war der stille Zusatzschaden**: `0.01`/Frame ergab bei 20/s eine Zeitkonstante von **5 s**
     (eingeschwungen nach 10–15 s). Bis dahin stand `songAct` niedrig, also lief das Feld in den ersten
     Sekunden JEDES Tracks auf den trägen Zeitkonstanten — doppelt zäh, ausgerechnet beim Einsetzen der Musik.
2. **Zeichenrate aus der geteilten Formel.** `hzMinMs(hz)` ist aus `frameMinMs()` herausgezogen (mobileTier.js);
   die Würfel-Matrix ruft sie mit ihrer eigenen `AMBIENT_HZ = 30`. Der eigene Wert neben `DRAW_HZ_COARSE` (60)
   ist begründet, wie die Datei dort verlangt: vollflächige Canvas-2D-Ambiente-Ebene mit weichen Verläufen, und
   **seit Teil 1 entscheidet die Rate nur noch über die Glätte, nicht mehr über Tempo oder Ausschlag**.
   Ergebnis: Desktop 30/s (**unverändert** — die 24er-Schwelle ergab auch schon 30), **Handy 20 → 30/s** und
   gleichmäßig statt unter Jitter zwischen 40 und 60 ms kippend. `?hz=20` greift weiter nach unten durch
   (`Math.min(AMBIENT_HZ, DRAW_HZ_COARSE)`) — das ist der Regler für den Wärmevergleich am Gerät.
   **Der Preis, ehrlich benannt: +50 % Zeichnungen auf dem Handy.** Wenn es warm wird, ist `AMBIENT_HZ` die
   Stelle, und sie kostet seit Teil 1 nur Glätte.
3. **Das Ersatzsignal liefert jetzt auch seine AKTIVITÄT** (`if (demoOn) songAct = TUNE.SPEED_HI`). Ohne das
   misst der Spektral-Fluss die Stille, hinter der das Ersatzsignal steht → `songAct` fiele auf 0 und die
   Werkstatt-Vorschau liefe dauerhaft träge, während dasselbe Feld im Spiel knackig läuft. Zwei Tempi für ein
   Feld wäre wieder Drift Vorschau↔Spiel. Dafür musste `demoOn` VOR `computeSpeed` bestimmt werden; es liest
   `stilleS` damit aus dem Vorframe — bei einem 0,35-s-Fenster bedeutungslos.
- Wächter: `test/cubematrix-demo.test.js` (Abschnitt #cube-takt). Er **rechnet** die Bildratenfreiheit als
  Eigenschaft nach (zwei halbe Schritte = ein ganzer), prüft, dass nichts überschießt, dass die Zeitkonstanten
  den musikalischen Takt treffen, und dass die Zielrate auf 60 Hz einen GLEICHMÄSSIGEN Abstand ergibt.
- **Zwei Fallen beim Schreiben der Wächter, beide zugeschnappt** (dieselbe Sorte wie beim `as-ring`-Zähler in
  #fx-panel): die Ratsche „kein `ATTACK:` mehr im Quelltext" las den **eigenen Begründungs-Kommentar**, der die
  alten Namen absichtlich nennt → sie prüft jetzt gegen den kommentarfreien Quelltext. Und `indexOf("computeSpeed(dt, demoOn)")`
  fand die **Definition** statt des Aufrufs → jetzt `"&& computeSpeed(dt, demoOn)"`.
- **Nicht am Gerät abgenommen** — alles aus dem Quelltext hergeleitet und im Wächter nachgerechnet; headless gibt
  es keine Wiedergabe. Der Blick (und das Ohr) am Handy steht aus, ebenso die Wärme-Gegenprobe zu `AMBIENT_HZ`.

### #lv-fest + #sk-ablehnen — die Level-up-Karte sprang, weil das Overlay zentriert (19.08.2026)
Zweimal getrennt gemeldet („springt, wenn ich links aufklappe" und „springt beim Archetyp-Wechsel"), **es ist
EIN Fehler**: Perk- und Skill-Wahl liegen in einem `fixed inset-0 flex items-center` — die OBERKANTE hängt damit
an der HÖHE des Inhalts, jede Änderung verschiebt sie um die halbe Differenz.
- **Gemessen bei 1536×791 (DPR 1,25), Skill-Wahl**: Karte 540 px hoch → y = **126** · linker Flügel auf (605 px,
  also höher als die Karte) → y = **93** · Passiv-Block aufgeklappt (Karte 671 px) → y = **60**. Der Archetyp-
  Wechsel macht dasselbe, weil jedes Angebot anders lang ist.
- **Der rechte Flügel fiel nie auf** — er ist mit ~365 px KÜRZER als die Karte und ändert die Rasterhöhe darum
  gar nicht. Genau daher las sich der Fehler als „nur links".
- **Fix ist eine Zeile**: `.lv-rig { min-height: var(--lv-h) }`. Das Raster ist damit immer gleich hoch (derselbe
  Deckel `min(92dvh, 760px)`, den Karte und Flügel ohnehin tragen), die Zentrierung hat nichts mehr zu variieren,
  und die Karte sitzt über `align-items: start` auf einem festen Pixel und wächst nur noch nach UNTEN.
  Nachgemessen: **y = 32 in allen Kombinationen** (4 Fraktionen × 4 Flügel-Zustände × Passiv auf/zu), Perk-Wahl
  ebenso (sie teilt sich `.lv-rig`).
- **Ein tieferer Anker ist nicht zu haben**: eine Karte darf bis `--lv-h` hoch werden, also muss oben genau der
  Rest übrig bleiben. Wer die Karte optisch tiefer setzen will, muss den DECKEL senken, nicht den Anker.
- **Warum es die erste Messung nicht gefunden hat**: ich hatte nur `left`/`width` über sechs Fensterbreiten
  gemessen und daraus „steht stabil" gemeldet. Der Sprung war die ganze Zeit auf der ANDEREN Achse. Merksatz für
  jede Positionsmeldung: **beide Achsen messen, nicht die vermutete.**
- **`--lv-h` steht jetzt EINMAL** (an `.lv-rig` in der Basis) statt an Karte, Flügel und Anker je einzeln — die
  drei müssen denselben Wert tragen, sonst ist die feste Oberkante entweder zu tief oder verschenkt Platz.

#### #sk-ablehnen — Reroll/Ablehnen der Skill-Wahl waren nachgebaut
Zwei handgeschriebene Kästen (`text-xs px-3 py-2`, Ablehnen ohne `font-bold`, Hover über `opacity` statt
`brightness`) statt der `ActionButton`s, die die Perk-Wahl benutzt — dieselbe Handlung, sichtbar anderes Bild.
Jetzt dieselbe Komponente. Der STICKY-Rahmen bleibt handgeschrieben: `ActionBar` ist selbst der Sticky-Behälter,
hier gehört aber die Reiterzeile mit unter dasselbe Dach.
- **Unterhalb 1400 px nimmt `.sk-actbtn` die MASSE zurück, nicht die Optik.** „Ablehnen → Perk" ist länger als das
  „Alle ablehnen" der Perk-Wahl: in den Standardmaßen braucht es gemessen **158 px, auf 375 px stehen 151** zur
  Verfügung — mit `whitespace-nowrap` liefe der Text aus dem Knopf. Mit der Regel 133/151, geprüft auf 430 · 390 ·
  375 · 360 px in DE (EN ist kürzer). Eine Zeile CSS statt eines zweiten JSX-Zweigs.
- **Die Tastatur-Kürzel der Run-Dialoge sind wieder raus** (`↵`/`Esc`-Chips in `RunConfirm.jsx`): sie waren die
  einzigen Zeichen auf dem Dialog und zogen den Blick auf die Mechanik statt auf die Wahl. **Der Enter-Handler ist
  mitgegangen** — ein unangekündigter Tastendruck, der einen laufenden Lauf beendet, ist schlechter als gar keiner.
  Escape schließt weiter über den bestehenden `useEscape`-Pfad des Aufrufers.
- Wächter: `test/levelup-wings.test.js` (Abschnitte #lv-fest + #sk-ablehnen), `test/rahmen-huelle.test.js`.
  Gegenprobe gemacht: alle fünf sabotierten Nähte fallen.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen (Chromium, echte Komponenten, 1536×791 bei
  DPR 1,25 wie im Perf-HUD des Users).

### #lv-gebaeude — die gewählten Gebäude als Ausklapp-Reiter im linken Flügel (19.08.2026)
Am Fuß des Deck-Flügels, unter der Deck-Stärke. **Die Liste ist NICHT neu**: `ArchBuildingList` steht so schon
in der Aufstellungsphase und in der Chronik — samt ihrer eigentlichen Eigenschaft, dass Antippen den
Gebäude-Rahmen am Brett cyan leuchten lässt. Genau deshalb gehört sie in DIESEN Flügel und nicht in den rechten:
das Brett, auf das sie zeigt, steht darüber.
- **`bare`-Schalter statt zweiter Fassung**: er nimmt der Liste Kasten und Überschrift ab (die trägt hier der
  Reiter), die EINTRÄGE bleiben dieselbe eine `buildings.map` — ein Wächter zählt sie.
- **Antippen erreicht das Brett auch bei ausgeschaltetem 🏗-Schalter.** `FormationPanel` rechnet jetzt
  `archOn = hasArch && (showArch || !!glowBid)`. Ohne das täte ein Antippen bei ausgeschaltetem Schalter
  sichtbar nichts — genau das, was der Kommentar an `ArchBuildingList` vom Aufrufer verlangt.
- **Zwei Zustände, zwei verschiedene Orte, und das ist die Entscheidung**: der REITER (auf/zu) ist eine
  Gewohnheit und liegt in den Optionen (`lvWingBuildings`, Default ZU, Eintrag in `DEFAULT_OPTIONS` — sonst
  schluckt ihn der `{...DEFAULT_OPTIONS, ...o}`-Merge). Der ZEIGER (`inspectBid`) ist eine flüchtige Frage
  („wo liegt das?") und liegt in `useState`, endet also mit der Karte. Der alte Wächter „kein `useState` in
  LevelupWings" ist entsprechend auf „genau einer, und zwar dieser" verschärft statt aufgeweicht.
- Gemessen 1536×791: Flügel zu 655 px · aufgeklappt 728 (Deckel) mit innerem Scroll 1037 px. **Die Karte bleibt
  bei y = 32 und h = 548** — der Anker aus #lv-fest trägt auch das.
- **Vorbehalt, den der Aufbau nicht auflöst**: der Reiter sitzt unter der Deck-Stärke, das Brett ganz oben — bei
  aufgeklappter Liste kann das Brett aus dem sichtbaren Bereich gescrollt sein, das Leuchten passiert dann
  außerhalb des Blickfelds. Platzierung ist so gewünscht; wer es näher haben will, schiebt den Reiter über die
  Deck-Stärke.
- **Dabei aufgefallen und am 19.08.2026 behoben: `src/ui/archEffects.js` war nicht migriert** (s. #arch-eff).
- Wächter: `test/levelup-wings.test.js` (Abschnitt #lv-gebaeude). Gegenprobe gemacht: alle vier sabotierten
  Nähte fallen.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert.

### #cz-ruhe — ruhigere Deck-Werkstatt ab 1400 px (19.08.2026, Entwurf des Users)
Vier kleine Griffe, alle oberhalb der Desktop-Schwelle; die Handy-Fassung ist **nachgemessen unberührt**
(Element-Geometrie bei 390 px vorher/nachher identisch, beide Reiter — die einzigen Unterschiede sind
Klassennamen und eine Box mit 0×0, die neue Klammer).
- **Der Ring steht still und ist nur noch angedeutet.** `.as-ring` malt sonst ein wanderndes Deckfarben-Band
  (`as-ring-slide`, 7 s) plus Schein. Auf einem Screen, der aus BILDERN besteht, zieht eine dauernd laufende
  Kante den Blick von genau den Bildern ab. **Es ist NICHT die Regel gelöscht, sondern ein Modifikator gesetzt**
  (`as-ring-quiet` an den vier Werkstatt-Panels): der Ring bleibt EINE Fassung mit einem Schalter, Baum,
  Leitfaden und Glossar behalten ihren laufenden Ring, bis jemand sie ausdrücklich nachzieht — dann ist es
  dort eine Klasse, kein zweiter Rahmen. Nebenwirkung, willkommen: die Animation kostete gemessen ~3–4 fps
  (#perf-ring). **`background-image: none` muss mit** — sonst bliebe der dreifach gekachelte Verlauf stehen
  und stünde nur still.
- **Die Reiter sind flache Text-Reiter.** Eine Parallel-Session hatte sie am selben Tag zu Knöpfen der
  Kanten-Familie gemacht (Fläche, Rahmen, Radius, farbige Linkskante, `min-width: 210px`) — das löste das
  alte Problem („600 px breite Fläche je Reiter") und schuf ein zweites: drei gerahmte Flächen über den
  Deckbildern sind das Lauteste im Bild. Jetzt EIN Signal, die Unterstreichung in der Deckfarbe; Breite am
  Text (gemessen 50 / 86 / 58 px statt 3 × 210). **Geändert wurde die BESTEHENDE Regel**
  (`.cz-head [role="tab"]`), nicht eine zweite danebengestellt — zwei Regelsätze für dieselben drei Knöpfe
  wären genau die Doppelpflege, vor der die Datei sonst überall warnt.
- **Kachelraster luftiger** (10 → 16 px). Auf 1400+ px stehen sechs Kacheln je Zeile; bei 10 px las sich das
  als zusammenhängende Fläche statt als einzelne Karten.
- **Der Aktionsknopf der Effekt-Bühne ist kein Vollbreiten-Balken mehr**, sondern steht rechts neben der
  Beschreibung (`cz-fxfoot`: Beschreibung links im Fluss, Knopf 210 px rechts). Ein Knopf über die ganze
  Panelbreite ist eine Handy-Geste (Daumen); auf dem Desktop ist er dort das lauteste Element.
  **Beide Fassungen der Aktion tragen `cz-actbtn`** — der Knopf UND die „im Standard enthalten"-Auskunft,
  die ihre Maße selbst baut; sonst spränge die Fußzeile je nach Effekt.
- **`cz-fxfoot` ist unterhalb 1400 px `display: contents`** — dieselbe Klammer-Technik wie `.gd-cols`/`.gl-body`.
  Ohne sie bekäme die Handy-Fassung eine zusätzliche Box zwischen Bühne und Knopf.
- **BEWUSST NICHT angefasst**: die Deck-Linie am Kopf (bleibt, wie sie ist — ausdrücklich so gewünscht) und
  die farbige linke Kante der Pack-Kacheln (`.as-edge-card`). Die ist ein projektweites Signal (#kante), kein
  Werkstatt-Detail — sie hier allein zu dämpfen ließe die Werkstatt aus dem System fallen. Der Mockup zeigt
  die Kacheln ohne sie; das wäre ein eigener, systemweiter Schritt.
- Wächter: `test/cz-ruhe.test.js` (6). Gegenprobe gemacht: alle sechs sabotierten Nähte fallen. Der
  #perf-ring-Wächter in `test/desktop-perf.test.js` prüft die Panel-Klassen jetzt mit Wortgrenze statt auf
  den exakten Klassenstring — der Modifikator ist eine Ergänzung, kein Ersatz der Konstruktion.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert (2046×979 bei DPR 1,25).

### #vorschau-deck — die Effekt-Vorschau zeigt DEIN Deck (19.08.2026)
Im Deckfarbe-Modus zog die Bühne bis hierher das je Effekt **handverlesene** Pack aus `LOOK_REFS` (#327):
Aurora auf Moonwhale, Glutfunken auf Kosmos, Klinge auf Drache. Der Zweck war, den Umschalter
Standard↔Deckfarbe sichtbar zu machen. Jetzt zieht sie **das gerade ausgerüstete Deck** — Akzentfarben UND
Spielfeld. Die Vorschau beantwortet damit die Frage, die vor einem Kauf zählt („wie sieht das in MEINEM
Spiel aus") statt „was ist der Unterschied zwischen den zwei Modi".
- **Der Preis ist bekannt und wurde angenommen** (Entscheidung des Users): liegt dein Deck farblich nah am
  Standard-Look eines Effekts, zeigt der Umschalter dort fast nichts mehr. Genau dagegen war `LOOK_REFS`
  gebaut. **Die Tabelle bleibt trotzdem und ist kein toter Code** — sie ist der STANDARD-Modus.
- **Standard-Modus bleibt Genesis als Basislinie.** Fiele auch er auf das aktive Deck, gäbe es keinen
  neutralen Bezug mehr, gegen den man vergleicht. Nachgemessen: Aurora/Deckfarbe → `bf_sunset`,
  Aurora/Standard → `bf_onboarding`, und zurück.
- **`activeLook(deckId)` steht in `themes.js`, nicht in der Werkstatt**, und baut auf `resolvePackByDeckId`:
  das löst **Stufen-Decks auf ihre eigene Stufenfarbe** auf (Stufe II hat andere a1/a2 als Stufe I) — dieselbe
  Auflösung, die das Spiel benutzt. Ein Nachbau über `deckId` liefe genau daran vorbei. Rückfall ist Genesis,
  nicht `null` — sonst müsste jede der dreizehn Lesestellen es einzeln abfangen.
- **Ein Kontext (`DeckLookCtx`), kein Prop.** `look` wird an **dreizehn** Stellen gelesen (neun `look={}` plus
  vier Szenen, die es sich selbst holen), und die Kette dorthin führt durch Komponenten, die mit dem Deck
  nichts zu tun haben. Gleiche Bauart wie `SceneScaleCtx` in derselben Datei.
  **In `GlobalFxScenePreview` wird der Kontext EINMAL oben gelesen** und die Auswahl läuft über einen lokalen
  Wähler `look(key)` — die Szenen-Auswahl ist eine `if`-Kette, ein Hook je Zweig wäre ein bedingter Hook.
- **Karten-Animationen ohne Modus-Gate**: Neonrahmen/Holo/Glitch laufen im Spiel *immer* in der Deckfarbe
  (#318), haben also gar keinen Umschalter. Ihre Vorschau nimmt das aktive Deck deshalb ohne `deckTint`-Prüfung
  — ein Gate wäre dort eine Bedingung, die nie umschaltet.
- **„Gottgleich · Standard" hat jetzt einen eigenen Farbmodus** (`fxGottStandardDeck`). Vorher war er der
  einzige Gottgleich-Eintrag ohne: der Chrome-Schriftzug stand fest auf dem Synthwave-Zweiton, während jeder
  Prunk daneben umfärben konnte. Der Fehler saß in `App.jsx`: die `gottDeck`-Zuordnung kannte nur die fünf
  Prunks, `activeGottFx(...) || ""` fiel auf `vOpt[""]` = undefined. **Beide Enden lesen dasselbe Flag** —
  ein Schalter, der nur die Vorschau umfärbt, wäre eine Lüge; ein Wächter hält das fest.
  Der Schlüssel passt auf die `/^fx.+Deck$/`-Regex und hängt sich damit von selbst in `FX_DECK_KEYS`
  (Anhebung + Dev-Reset) ein. Der Zähler in `test/announce-deck.test.js` ist 13 → **14**; die Zahl steht dort
  bewusst als Literal, damit ein neues Farbmodus-Flag eine bewusste Handlung bleibt.
- **Kein Remount, keine Laufzeitkosten**: `deckTint` ist längst ein Live-Prop (#345-perf). Die einzige neue
  Arbeit ist ein anderes Hintergrundbild beim Umschalten.
- Wächter: `test/showcase-look.test.js` (die #327-Prüfungen bleiben — sie sichern jetzt den STANDARD-Modus).
- **Nicht am Gerät gesehen** — headless im Produktionspfad über zwei Decks (Sunset rot/orange, Moonwhale
  blau) gemessen und nachgerendert.

#### #cz-ruhe, zweite Runde — die Effekt-Liste sind flache Zeilen
Am Handy ist jede Zeile eine eigene Kanten-KARTE (Fläche, Radius, 8 px Luft dazwischen) — richtig dort, wo
man mit dem Daumen ein Ziel treffen muss. Auf dem Desktop stehen fünf bis sechs davon in einer schmalen
Spalte und lesen sich als Stapel Kacheln statt als Liste. Ab 1400 px deshalb: keine Fläche, kein Radius, kein
Abstand — Haarlinien trennen, gewählt = hellere Fläche.
- **Die Rarity-Kante links bleibt.** Sie ist das einzige Farbsignal der Zeile (grau/grün/blau/lila/gold nach
  Preisstufe) und kommt aus `.as-edge-card` über `--c` — `border-left` darf beim Abräumen NICHT mitfallen.
- **`gap: 0` am Behälter ist Pflicht, nicht Kosmetik**: er trägt `gap-2` als Utility, ohne das Zurücknehmen
  hingen die Haarlinien in der Luft, statt zwei Zeilen zu trennen.
- Handy nachgemessen unberührt: Element-Geometrie bei 390 px vorher/nachher **0 Abweichungen von 62**.

### #lv-ruhe — Perk- und Skill-Wahl im Desktop-Ton (19.08.2026, Entwurf des Users)
Dieselbe Kur wie an der Werkstatt (#cz-ruhe), an den zwei Karten, die einen laufenden Stich unterbrechen.
Alles ab 1400 px; Handy nachgemessen **0 Abweichungen** (Element-Geometrie 390 px vorher/nachher, 113 bzw.
102 Elemente).
- **Die Karte selbst wird über `phaseCard(accent, base, { quiet })` leiser gestellt, nicht über CSS.** Drei
  Griffe in dieselbe Richtung: farbiger Außenschein weg (der dunkle Schlagschatten bleibt — er trägt die
  Ablösung vom Brett), Rahmen 42 % → 18 %, Lichtkegel am Kopf 14 % → 6 %. Bewusst ein PARAMETER: die Karte
  setzt ihren Stil inline, eine Regel bräuchte `!important` an drei Eigenschaften. Es ist derselbe Schalter-
  Gedanke wie `as-ring-quiet` — EINE Fassung mit einem Schalter statt zweier Karten, die auseinanderlaufen.
  **Gebunden an die BREITE (`useIsWide`), nicht an den Flügel-Zustand** — sonst änderte Aufklappen die Optik.
- **Der Halo der Angebotskarten fällt weg.** Er stand auf hohen Familienstufen und seltenen Perks und war
  auf einem großen Schirm nebeneinander gestellt das lauteste Element. Die Information geht nicht verloren:
  sie steht im Stufen-/Raritäts-BADGE und in der Farbkante links. **`.as-legendary` ist ausdrücklich NICHT
  dabei** — der animierte Goldrahmen IST die Seltenheits-Ansage und kommt ein-, zweimal je Lauf vor.
- **Kurze Trennlinie unter dem Kartennamen** (`.lv-cardname::after`, 26 px, `currentColor`): sie ordnet Kopf
  und Text, ohne einen Kasten zu ziehen. Über die volle Breite wäre sie wieder einer.
- **Die Aktionsleiste wird flach — mit einer Ausnahme.** Keine Fläche, kein Verlauf, keine Kante; „Neu
  würfeln" behält einen leichten Rahmen (ausdrücklicher Wunsch des Users, und er hat eine Begründung: es ist
  die einzige Handlung der Leiste, die etwas KOSTET — ein Reroll-Token — und darf sich vom Ausweg daneben
  abheben).
- **Die Durchlauf-Score-Pille verliert ihre Fläche**: sie ist eine Auskunft über die letzte Runde, keine
  Handlung, und stand als gefüllte Kapsel zwischen Titel und Angebot wie ein Bedienelement.
- **BEWUSST NICHT angefasst**: (1) die Haarlinie am Kartenkopf — sie trägt seit #lv-fluegel die
  Identitätsfarbe der Phase, das war eine eigene Entscheidung; im Mockup fehlt sie, das wäre ein eigener
  Schritt. (2) Der Farbverlauf der Angebotskarten (`.as-edge-card` mischt `--c` in die Fläche) — dasselbe
  Argument wie bei den Pack-Kacheln: projektweites Signal (#kante), nicht hier allein zu dämpfen.
- Wächter: `test/lv-ruhe.test.js` (7) — er RECHNET die zwei `phaseCard`-Fassungen gegeneinander nach, statt
  Schreibweisen zu vergleichen. Gegenprobe gemacht: alle sechs sabotierten Nähte fallen. Der #sk-ablehnen-
  Wächter prüft die Knopf-Klasse jetzt mit Wortgrenze — `lv-actbtn` kommt dort als Ergänzung dazu.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert (1920×1080, DPR 1,25).

### #up-ruhe — Baum, Leitfaden und Glossar im Desktop-Ton (19.08.2026, Entwurf des Users)
Dritter Screen nach der Liste („Desktop-Umbau: die Entscheidungsregeln", oben). Handy nachgemessen
**0 Abweichungen von 208 Elementen** (390 px vorher/nachher).
- **Sechs Panels, ein Wort je Panel**: `up-nav`/`up-page`, `gd-nav`/`gd-page`, `gl-nav`/`gl-page` tragen jetzt
  `as-ring-quiet`. Damit ist der laufende Ring nur noch dort, wo ihn niemand nachgezogen hat — der Schalter
  aus #cz-ruhe hat sich als das richtige Werkzeug erwiesen (Regel 1).
- **Der Zweig-Pfad `.up-branch` bekommt ihn BEWUSST NICHT.** Er wird nur gerendert, wenn `wide` false ist
  (eigener Renderpfad, kein `display: contents`-Trick); die Quiet-Regeln stehen im 1400er Block und täten
  dort nichts. Eine Zeile, die etwas verspricht und nichts hält, ist schlechter als keine — ein Wächter
  hält die Abwesenheit fest.
- **Der Schein NACH AUSSEN fällt an drei Stellen**, überall dieselbe Geste („hier bist du"): aktive
  Navigationszeile, gewählter Knoten, gewählte Legendär-Phase. **Der Anlauf nach INNEN bleibt** — er trägt
  die Aussage; beides zu entfernen nähme der Spalte ihren Zustand. Der 2-px-Ring an der Legendär-Phase war
  der einzige RING im ganzen Screen und wird zur Fläche, also zu derselben Sprache, die die Zeile darüber
  schon spricht.
- **„Zurücksetzen" und „Schließen" werden Text-Knöpfe** (wie die Aktionsleiste in #lv-ruhe): Werkzeuge am
  Rand, keine Angebote. **Das 44-px-Klickziel bleibt** — die Polsterung steht in einer eigenen, früheren
  Regel und wird nicht angefasst; der Wächter prüft beides zusammen.
- **Die Auswertung wird zu flachen Kacheln mit Haarlinie** (`.up-stat`, `.up-dropbox`) statt gefüllter
  Blöcke — dieselbe Bauform wie die Kennzahlen der StatusRail, und sie trennt die vier Werte sauberer als
  der Farbunterschied zum Kastengrund allein.
- **OFFEN und bewusst nicht getan — die Fläche der Kanten-Karte.** Der Baum zeigt 16–27 Knoten gleichzeitig,
  alle mit dem 90°-Farbanlauf aus `.as-edge-card`. In der Summe ist genau das, was der Mockup als „zu starker
  Glow" markiert. Es ist aber **projektweites Signal** (#kante, Regel 5) und trifft Perk-/Skill-Karten,
  Werkstatt-Kacheln, Filter und Baum gleichermaßen. **Das ist inzwischen der DRITTE Screen, an dem dieselbe
  Frage auftaucht** — der nächste sinnvolle Schritt wäre, den Anlauf systemweit von 42 % auf ~25 % Breite
  oder in der Deckkraft zu senken, EINMAL an der Familie, mit Bildvergleich über Baum · Werkstatt ·
  Level-up. Nicht nebenbei, sondern als eigener Durchgang.
- **Ebenfalls offen** (Mockup-Inhalte, die es im Spiel nicht gibt — Regel 10): die thematische Gruppierung
  der Fraktions-Skills („Ladung & Aufladung", „Krit & Multiplikatoren", …) bräuchte eine Zuordnung je Skill
  im Register; die Kachel „Aktive Effekte 7/7" und die „Maximiert"-Zeilen der Auswertung wären neue
  Kennzahlen; der „BEREICH"-Eyebrow über der Navigationsspalte wäre ein neuer Katalogtext.
- Wächter: `test/up-ruhe.test.js` (7). Gegenprobe gemacht: alle sechs sabotierten Nähte fallen. Die
  Ratschen in `test/glossary-desktop.test.js` und `test/guide-desktop.test.js` prüfen die Panel-Klasse jetzt
  mit Wortgrenze — der Modifikator ist eine Ergänzung, kein Ersatz der Konstruktion (dritter Wächter dieser
  Art nach `desktop-perf` und `levelup-wings`).
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert (1920×1080, DPR 1,25),
  Allgemein-Seite und Fraktionsseite.

### #kante-anlauf — der Farbanlauf der Auswahlkarten, nur auf dem Desktop leiser (19.08.2026)
Der offene Punkt aus #up-ruhe, jetzt als eigener Schritt. Die Kanten-Karte (#kante) lässt ihre
Signaturfarbe von der linken Kante in die Fläche auslaufen. EINE Karte liest sich damit richtig — der
Desktop zeigt aber Rudel davon (27 Knoten im Baum, 18 Kacheln in der Werkstatt, drei Angebote plus
gehaltene Skills in der Level-up-Karte), und in der Summe wird aus dem Signal eine Farbwolke. **An DREI
Screens kam dieselbe Beobachtung auf** (#cz-ruhe, #lv-ruhe, #up-ruhe) und wurde jedes Mal bewusst nicht
einzeln behoben — der Anlauf ist projektweites Signal, ein Screen darf ihn nicht allein ändern.
- **Vier Variablen statt vier Literale, und die Rückfälle SIND die Handy-Werte.** `.as-edge-card` rechnet
  jetzt über `var(--edge-wash, 14%)` / `var(--edge-wash-w, 42%)` (gewählt: 24 % / 46 %). Steht keine
  Variable, rechnet die Regel exakt wie vorher. Der 1400er Block setzt sie um: **Mischung 14 → 9 %,
  Auslauf 42 → 26 %** (gewählt 24 → 16 % / 46 → 30 %).
- **Bewusst so herum und nicht als zweite Regel im Desktop-Block**: es bleibt EINE Definition des Anlaufs,
  und man liest an der Fundstelle, dass es einen Schalter gibt. Eine Kopie unten hätte die Familie
  gespalten — genau das, was Regel 2 verbietet.
- **Falle**: die Prozentzeichen gehören IN die Variable. `color-mix(… var(--x)%, …)` ist ungültig und
  fällt lautlos auf die ganze Deklaration zurück.
- **Die 4-px-KANTE ist unberührt.** Sie ist das Signal; der Anlauf war immer nur ihr Nachhall. Ebenso
  unberührt: `.as-edge` / `.as-edge-strong` (Knöpfe) — die tragen ihren Anlauf als Handlungs-Vorrang, und
  die Screens stellen sie ohnehin je Fall flach (`lv-actbtn`, `cz-actbtn`, `up-actions`).
- **Handy bitidentisch nachgewiesen**: Pixelvergleich 390 px vorher/nachher, mittlere Abweichung
  **0,0000 von 255**, größte Einzelabweichung **0**. (Bei einer reinen FARB-Änderung ist der Pixelvergleich
  der richtige Nachweis — eine Geometrie-Messung hätte hier nichts gesehen.)
- **Mitgenommen, weil dieselbe Stelle**: die Angebotskarten der Perk-/Skill-Wahl sind ab 1400 px weniger
  rund (12 → 6 px). Drei Karten in einer Reihe unter einem 14-px-Panel lesen sich mit 12-px-Ecken als
  Pillen statt als Felder. Am Handy bleiben die 12 px — dort ist die Karte ein einzelnes Tippziel.
- Wächter: `test/kante-anlauf.test.js` (5). Er RECHNET nach, dass beide Achsen kleiner sind als der
  Handy-Rückfall — ein Zahlendreher (62 statt 26) sähe im Quelltext sonst weiter „geändert" aus.
  Gegenprobe gemacht: alle fünf sabotierten Nähte fallen.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert.

### #hub-knopf — EIN Ziel, der Rest sind Angebote (19.08.2026, Entwurf des Users)
Bis hierher trugen alle vier Hub-Knöpfe dieselbe Bauform (90°-Farbanlauf + 4-px-Kante links), nur in
verschiedenen Helligkeiten. Am Handy trägt das — dort steht immer nur ein Knopf im Blick. Auf einem 1920er
Schirm stehen sie übereinander in einer Spalte, und vier Varianten derselben Geste sortieren sich nicht:
sie ergeben eine Leiter, auf der keine Stufe heraussticht.
- **Ab 1400 px zwei Bauformen statt vier Helligkeiten.** `as-cta-primary` ist eine TASTE (Fläche in der
  Deckfarbe, Rahmen rundum, weicher Schein, Licht von oben) — das einzige laute Element der Seite. Tutorial,
  Rangliste und „Lauf beginnen"-während-ein-Lauf-läuft sind ruhige ZEILEN: flache Fläche, Haarlinie, kein
  Anlauf.
- **Der Zustandswechsel braucht keine zweite Regel.** Welcher Knopf `as-cta-primary` trägt, entscheidet
  `normalCls` in StartScreen.jsx: läuft ein Lauf, ist die Taste **„Lauf fortsetzen"** und „Lauf beginnen"
  fällt auf `as-cta-ghost`. Die Taste wandert mit der ABSICHT mit, statt an einem bestimmten Knopf zu
  kleben — genau das hält der Wächter fest, es ist die Stelle, an der die Hierarchie hängt.
- **Das Tutorial bleibt ausdrücklich eine Zeile.** Es soll für neue Spieler sichtbar sein, aber nie mit dem
  Start konkurrieren (dieselbe Absicht wie #tutorial-sichtbarkeit, nur jetzt auch in der Form).
- **Die 4-px-Kante entfällt an den Hub-Knöpfen** — sie ist das Signal der KANTEN-FAMILIE (`as-edge-*`), und
  die Hub-Knöpfe gehören nicht dazu; sie haben eigene Klassen. Kein Eingriff in ein geteiltes Signal.
- **Handy bitidentisch nachgewiesen**: Pixelvergleich 390 px vorher/nachher, mittlere Abweichung
  **0,0000 von 255**, größte Einzelabweichung **0**.
- **Die Zweitzeile der Fortsetzen-Taste hat Luft bekommen** („Durchlauf 1/50 · Score 544"). Sie klebte am
  Titel: der Knopf ist `flex-col` mit `leading-tight` und ohne Abstand dazwischen. **Beide Werte gehören
  zusammen** — nur die Luft zu erhöhen schöbe die Zeile an den unteren Rahmen, nur das Fußpolster ließe sie
  oben kleben. Gemessen 1920×1080: **17 px über dem Titel · 5 px Titel→Zeile · 19 px Zeile→Rahmen.**
- Wächter: `test/hub-knopf.test.js` (6). Gegenprobe gemacht: alle sabotierten Nähte fallen.
- **Nicht am Gerät gesehen** — headless in beiden Zuständen (mit und ohne laufenden Lauf) nachgerendert.

### #up-form — eine Kachelform für Baum, Leitfaden und Glossar (19.08.2026, Nachjustierung)
Nachschlag zu #up-ruhe, nach dem Bild des Users. Alles ab 1400 px; Handy **bitidentisch** nachgewiesen
(Pixelvergleich 390 px, mittlere Abweichung 0,0000 von 255).
- **Radius 6 px, überall.** Die Angebotskarten der Perk-/Skill-Wahl stehen seit #lv-ruhe auf 6 px; Baum,
  Leitfaden und Glossar liefen mit 9/11/12 px daneben. Das ist keine Feinheit — nebeneinander gestellt lesen
  sich verschiedene Radien als verschiedene BAUTEILE, auch wenn sonst alles gleich ist. Die PANELS behalten
  ihre 14 px: sie sind der Rahmen, nicht der Inhalt.
- **Gleiche Kachelhöhe je Reihe** (Allgemein-Seite) über **`subgrid`**. Die sechs Kategorien sind eigene
  Spalten und brachen bis hierher jede für sich um. Jetzt teilen sich alle Spalten DIESELBEN Zeilen: Reihe 1
  ist so hoch wie ihr höchster Knoten, alle sechs füllen sie, und die Pfeile stehen auf einer Linie.
  Gemessen 1920×1080: Reihe 1+2 je sechs Kacheln à 96 px, Reihe 3 drei à 81 px. Die Zeilenzahl steht als
  `--up-rows` an EINER Stelle (längste Kette 4 Knoten + 3 Pfeile + Überschrift).
  **`align-items: stretch` am Raster ist Pflicht** — mit `start` zöge sich jede Spalte wieder auf
  Inhaltshöhe und das subgrid hätte Zeilen, die niemand füllt.
- **Die Navigationsspalte verliert ihren Farbanlauf.** Fünf Zeilen mit je eigenem Verlauf sind fünf Flächen;
  die Farbe gehört an die Kante. Gewählt = hellere Fläche, wie in der Effekt-Liste der Werkstatt.
- **Die legendären Skills bekommen eine eigene Reihe** unter einer Trennlinie, statt im Spaltenfluss der
  übrigen 21 zu treiben. Spaltenzahl aus der ANZAHL (`--leg-cols`), nicht aus der Breite — `auto-fill` legt
  leere Spuren an, `auto-fit` klappt auf eine zusammen (beides gemessen, #rahmen-huelle). Gemessen: vier
  Karten à 244×168 px auf einer Linie.
- **Die Fraktionsreiter der Skill-Wahl sind flach** (`.sk-tab`): keine Fläche, kein Rahmen, kein Radius,
  kein Schein — EIN Signal, die Unterstreichung in der Fraktionsfarbe. `!important` durchgehend, weil
  Fläche, Rahmenton und Schein inline aus `g.meta.color` kommen; die Unterkante bleibt ausgenommen.
- **Bewusst NICHT übernommen** (Mockup-Inhalte, die es im Spiel nicht gibt): thematische Skill-Gruppen,
  „Aktive Effekte 7/7", die „Maximiert"-Zeilen, der „BEREICH"-Eyebrow.
- Wächter: `test/up-ruhe.test.js` (11) + `test/lv-ruhe.test.js`. Gegenprobe gemacht.

#### #hub-knopf, Nachjustierung: eckiger, LINKER Anlauf statt Halo
Die Taste hatte einen Schein NACH AUSSEN (`0 0 30px -12px`) — dasselbe Mittel, das an Ring, Knoten und
Angebotskarten in denselben Durchgängen gerade gefallen ist. Er ist raus. An seine Stelle tritt der
**linke Anlauf** (zweiter Wunsch des Users, nachdem die halo-lose Fassung zu flach wirkte): ein
waagerechter Verlauf über die ersten 30 % plus eine 3-px-Kante in der Deckfarbe — dieselbe Geste wie an
der Kanten-Familie, und sie sagt „von hier geht es los". Darunter liegt weiter das Licht von oben
(senkrechter Verlauf + `inset 0 1px 0`), das die Fläche zur Taste macht. Dazu **Radius
6 px** für alle fünf Hub-Knöpfe — sie trugen ihn als Tailwind-Utility (`rounded-xl` = 12 px), und index.css
steht ungelayert dahinter, schlägt sie also ohne `!important`.

### #wing-ruhe + #lv-ruhe (Punkt 5) — die zwei letzten Griffe am Level-up (19.08.2026)
Aus fünf Vorschlägen des Users hat er zwei ausgewählt; die übrigen drei sind bewusst nicht gemacht
(Begründung am Ende). Alles ab 1400 px, Handy **bitidentisch** (Pixelvergleich 390 px, Perk und Skill je
0,0000 von 255).
- **Der linke Flügel: dünnere Rahmen, Fokus auf Zustand.** Dort stehen 40 Kacheln auf 356 px Breite;
  2-px-Rahmen plus ein FORMATIONS-Schein je Kachel sind dann keine Auszeichnung mehr, sondern eine
  Flimmerfläche. `CardGrid` bekommt deshalb `quietFrames` (Default false, auf dem Brett ändert sich
  nichts): Rahmen 2 → 1 px, und der Formations-Schein fällt.
  **Die ZUSTANDS-Scheine bleiben** — gewählt · getippt · Gletscher · Gebäude. Sie sind selten und genau
  das, was man im Flügel sucht; fielen sie mit, wäre die Kachel dort zustandslos. Genau diese Trennung
  hält der Wächter fest.
- **Haarlinie statt Rahmen** an der Angebotskarte: die drei nicht-farbigen Kanten treten auf 7 %
  Deckkraft zurück, damit die FARBKANTE links die einzige sichtbare Kante bleibt. **Bewusst je Seite
  gesetzt und nicht als `border-color`** — die Sammelangabe griffe auch links durch und löschte das Signal.
- **Die Aktionsknöpfe sind so breit wie ihr Text** statt auf halbe Kartenbreite gestreckt. Gemessen
  1920 px: 113/132 px (Skill) und 113/102 px (Perk) statt zweier ~420-px-Balken. `flex-1` steht als
  Utility im JSX; index.css schlägt es ungelayert, beide Bildschirme brauchen keinen zweiten Zweig.
- **Stufung nach OBEN**: der Kartenname bekommt etwas Laufweite, der Beschreibungstext bleibt unangetastet.
  Ihn zu kürzen oder zu klemmen wäre der Fehler aus #skilltext (14 von 21 Texten mitten im Satz).

#### Aus dem Vorschlag NICHT übernommen — und warum
- **„Details ›" auf der Skill-Karte** (Kurzfassung mit Häkchen-Bullets, Rest hinter einem Link): versteckt
  genau den Text, auf dem die Entscheidung beruht, im Moment der Entscheidung. Denselben Fehler hat das
  Projekt schon einmal korrigiert (#skilltext). Dazu wären es 84 Skills in zwei Sprachen — ein Text-Projekt,
  kein Layout-Schritt.
- **Rechtes Panel umsortieren**: inhaltlich richtig, aber `StatusRail` ist DIESELBE Komponente wie neben
  dem Brett — eine Umsortierung trifft das laufende Spiel mit. Das ist eine Spiel-Entscheidung, keine
  Layout-Entscheidung, und wartet auf eine ausdrückliche Ansage.
- **Ein-/Ausklappen**: gibt es seit #lv-fluegel samt gemerktem Zustand. Offen wäre nur der Default, und der
  steht bewusst auf „auf" — die Flügel sind der Grund für die breite Fassung.

#### Fehler beim Flachlegen der Fraktionsreiter — und der Wächter, der ihn nicht sah
Der erste Wurf schrieb `border-bottom: 2px solid !important`. Die KURZFORM setzt die Farbe still auf
`currentColor` zurück und schlägt mit `!important` den inline gesetzten Fraktionston — damit trugen **alle
vier** Reiter dieselbe helle Linie und der aktive war nicht mehr zu erkennen. Aufgefallen ist es am Bild,
nicht im Test. Jetzt werden die drei anderen Seiten einzeln abgeräumt und von der Unterkante nur
`border-bottom-width` / `-style` gesetzt; die FARBE bleibt inline (`g.meta.color`).
**Merksatz:** Wer eine inline gesetzte Teil-Eigenschaft am Leben lassen will, darf die Kurzform nicht
anfassen — sie setzt alle Teile zurück, auch die, die man gar nicht nennt.
Beim Nachrüsten des Wächters ist derselbe Fallstrick zugeschnappt wie beim `as-ring`-Zähler (#fx-panel)
und der `ATTACK:`-Ratsche (#cube-takt): die Negativ-Prüfung las den eigenen Begründungskommentar, der die
verbotene Kurzform absichtlich beim Namen nennt. Sie prüft jetzt gegen den kommentarfreien Quelltext.

#### #run-dialoge, Nachjustierung (19.08.2026): eckiger, mit Richtungspfeil
Hub-Knöpfe, Baum-Kacheln und Angebotskarten stehen auf 6 px; die zwei Rückfragen liefen mit 12/8 px
daneben. Jetzt tragen Optionszeile (`rc-row`) und die zwei Knöpfe der Neustart-Rückfrage (`rc-btn`)
denselben Radius. **Die KARTE behält ihren** — sie ist der Rahmen, nicht der Inhalt (dieselbe Trennung wie
an den Panels von Baum, Werkstatt und Leitfaden).
- **Der Pfeil rechts ist kein neues Zeichen**: dieselbe Geste tragen die Verwaltungszeilen im Hub. Er steht
  fest im Markup, weil `OptionRow` ohnehin nur im Desktop-Zweig gerendert wird — kein Breiten-Gate nötig.
- **Nur der Pfeil bewegt sich** beim Überfahren, die Zeile nicht (anders als die Angebotskarten): ein
  Dialog, der beim Zeigen wackelt, liest sich nervös.
- Handy bitidentisch (Pixelvergleich 390 px, beide Dialoge 0,0000 von 255).

### #up-still + #lv-griff + #update-desk — drei Nachzügler (19.08.2026)
- **Die Auswertung des Baums: Balken ODER Wort, nie beides.** Ist eine Achse voll, sagt ein 100-%-Balken
  nichts mehr — dann steht dort „Maximiert" (`upgrades.impact.maxed`). Ist sie es nicht, zeigt der Balken
  auf einen Blick, wie weit noch fehlt; das leistet die Zahl allein nicht. Jede Kachel trägt damit EIN
  Element unter der Zahl statt zweier, und der Kasten wird ruhig, ohne dass Information verloren geht.
  Der Balken ist dabei von 6 auf 3 px zurückgenommen — er soll den Anteil zeigen, nicht die Kachel füllen.
  - **Beide Zustände nehmen EXAKT gleich viel Platz** (`min-height` + `margin-top` in EINER Regel für
    beide). Sonst stünden in einem Kasten mit gemischten Achsen (Baufeld voll, Rerolls nicht)
    unterschiedlich hohe Kacheln nebeneinander. Gemessen 1920×1080: 87 px in beiden Zuständen.
  - **Nur ab 1400 px.** Am Handy stehen die vier Kacheln gestapelt und der Kasten ist die einzige
    Zusammenfassung weit und breit — dort hält der Balken die Reihe optisch zusammen.
- **#lv-griff: die Griffe der Flügel standen nicht still.** Sie hängen mit `top: 50%` an `.lv-cardwrap`;
  solange der nur so hoch war wie die Karte, verschob jeder Archetyp-Wechsel sie um die halbe
  Höhendifferenz (jedes Angebot ist anders lang). **`align-self: stretch`** macht den Kasten so hoch wie
  das Raster — und dessen Höhe steht seit #lv-fest fest (`--lv-h`). Damit ist die Griffposition eine
  Konstante, **ohne dass irgendwo eine Pixelzahl geraten werden müsste**; die Karte darin behält ihre
  Inhaltshöhe (sie ist ein Block im Fluss, kein Rasterkind). Gemessen 1536×791: Griff y = 358 in allen
  vier Fraktionen, während die Karte zwischen 458 und 554 px schwankt.
  (Das ist der zweite Teil desselben Fehlers wie #lv-fest — dort stand die KARTE still, hier die Griffe.
  Merksatz bleibt: was an einer variablen Höhe hängt, wandert mit ihr.)
- **#update-desk**: die „Neue Version verfügbar"-Leiste ist ab 1400 px eckig (6 px) und ihr Knopf verliert
  den Schein. Sie ist ein HINWEIS, kein Angebot; die goldene Kante bleibt, „Neu laden" ist ihre Handlung.
- **ENTSCHIEDEN (19.08.2026): die fünfte Kachel „Aktive Effekte 7/7" aus der Vorlage kommt NICHT.**
  Der Perk-Qualitäts-Balken behält die volle Breite. Begründung des Users, und sie trägt: der Balken IST
  die Aussage der unteren Zeile, und er lebt von der Länge — vier Rarität-Anteile nebeneinander liest man
  über die Breite, nicht über einen Rest neben einer Kachel. Dazu hätte die Kachel eine Größe gebraucht,
  die es im Baum gar nicht gibt (was sind „aktive Effekte"? Knoten mit Lauf-Wirkung? freigeschaltete
  Achsen?) — sie hätte also eine neue Kennzahl erfunden, um einen Platz zu füllen. **Wer sie später doch
  will, definiert zuerst die Zahl, dann das Layout.**
- **Offen**: die Überschrift der Vorlage lautet „BAUM-EFFEKT · AKTUELLE LAUF-WIRKUNG", im Spiel steht
  „Was der Baum gerade bewirkt" — eine Zeile in beiden Katalogen, wenn gewünscht.

### #arch-eff — die Effektzeile unter jedem Gebäude ist migriert (19.08.2026)
`src/ui/archEffects.js` baute seine zehn Sätze aus deutschen Vorlagen zusammen (`+${vb} Stichwert`,
`+${sc.amount} Score bei ${suit}`, `Struktur ×${f}` …). Im englischen Build stand damit **überall Deutsch**,
wo die Gebäude-Liste erscheint: Aufstellungsphase, Chronik, Endscreen und der Level-up-Flügel (#lv-gebaeude).
- **Die i18n-Ratsche konnte es nicht sehen** — dieselbe Lücke wie bei #formlegend: ihr Greifer fischt
  JSX-Textknoten und Text-Props, keine Template-Literale in einer HILFSDATEI. Die Datei steht jetzt in der
  `MIGRATED`-Liste, ab da hält die Ratsche sie fest.
- **Der Wortlaut ist ÜBERNOMMEN, nicht neu erfunden**: „Stichwert"/„trick value" und „Serienpunkt"/„streak
  point" stehen so schon im `building.eff.*`-Block, „Struktur"/„structure" in `arch.cell.struct`. Derselbe
  Effekt darf nicht zweimal verschieden heißen — ein Wächter prüft genau diese vier Formulierungen.
- **Das Dezimalzeichen hing an einem hart gesetzten Komma** (`toFixed(2).replace(".", ",")`) — im englischen
  Build also ein deutsches Trennzeichen mitten in der Zahl. Jetzt `fmtNum(x.toFixed(2))`, genau wie `dfmt2`
  in ArchPanels.jsx: **beide Teile sind nötig** — `fmtNum` allein kürzt die Null weg (×1,40 würde ×1,4) und
  die Faktoren lesen sich nicht mehr als Reihe.
- Wächter: `test/arch-eff.test.js` (5). Er prüft die AUSGABE in beiden Sprachen, nicht nur die Schreibweise
  im Quelltext — bei einer Datei, die ihre Sätze zusammenbaut, ist das der einzige belastbare Nachweis.
  Die Negativ-Prüfung läuft gegen den kommentarfreien Quelltext (der Dateikopf nennt die alten Vorlagen
  absichtlich beim Namen). Gegenprobe gemacht: alle vier sabotierten Nähte fallen.
- Die Übersetzer-CSV ist mitgezogen (`npm run loc:export`, 2653 → 2663 Zeilen).

### #eckig + #up-untertitel — ein Radius für alle Knöpfe, kein abgeschnittener Untertitel (19.08.2026)
- **ALLE Bestätigen-/Schließen-Knöpfe stehen ab 1400 px auf 6 px**, über EINE Regel. Hub-Knöpfe,
  Baum-Kacheln, Angebotskarten und die Run-Dialoge waren schon dort; die Schließen-Knöpfe der Screens, die
  `ActionButton`-Sorte und die drei handgebauten Knöpfe des Endscreens (Menü · Neuer Lauf · „Bestätigen"
  der Freischalt-Karte) liefen mit 8 px daneben. Acht gegen sechs sieht man einzeln nicht — nebeneinander
  schon, und genau das ist der Punkt: verschiedene Radien lesen sich als verschiedene Bauteile.
- **`as-actbtn` ist der neue, stabile Haken der Sorte** (`ACTIONBTN_BASE` in modalStyle.jsx). Er trifft
  JEDEN ActionButton im Spiel auf einmal — ohne ihn müsste die Klasse an dreißig Fundstellen einzeln
  stehen, und die nächste neue Fundstelle vergisst sie. Die übrigen Klassen der Sorte sind Utilities und
  stehen genauso an fremden Knöpfen, taugen also nicht als Greifer.
- **Der Archetyp-Untertitel im Baum bricht jetzt UM statt abzuschneiden.** Er stand auf `nowrap` + Ellipse,
  weil der „Leitfaden ›"-Knopf die rechte Ecke braucht — der Blitz-Text ist der längste und wurde damit auf
  jedem realen Fenster mitten im Satz gekürzt. Zwei Zeilen sind der Deckel (wie im Leitfaden), und die
  **Kopfreihe trägt ihre Höhe FEST** (`min-height`): sonst springen die Knotenspalten beim Archetyp-Wechsel.
  Gemessen 1920×1080 · 1536×791 · 1400×950 über alle vier Fraktionen: **nirgends gekürzt**, Kopfreihe
  überall 41 px, das Raster darunter startet je Breite auf demselben y.
- **Handy bitidentisch** (Pixelvergleich 390 px, 0,0000 von 255). Der neue Klassenname wandert zwar in die
  Handy-DOM, aber keine Regel unterhalb 1400 px greift ihn ab.
- Wächter: `test/up-ruhe.test.js`. Gegenprobe gemacht: alle fünf sabotierten Nähte fallen.

### #perf-ansage2 — die Groß-Ansage war auf dem Handy ein Dauer-Effekt (18.08.2026)
#perf-ansage hatte den EPISCHEN Zweig ausdrücklich ausgelassen, begründet mit „sie feuert selten statt bei jedem
stärkeren Sieg". **Das stimmt für den frühen Lauf und ist im späten genau falsch herum.**
- Gottgleich hatte mit `cool: 2500` den **kürzesten** Cooldown der ganzen Leiter (Stark 5600 · Brutal 4600 ·
  Irre 3600) und zugleich `rank: 4` — es wird von `BIG_DOMINANCE_MS` nie unterdrückt, unterdrückt aber selbst
  2 s lang alle anderen. Sobald der Stich-Score dauerhaft über `GOTT_FX_MIN` (500k) liegt, stand die teuerste
  Ansage bei 1,9 s Lebensdauer auf **~76 % Einschaltdauer** — und die übrigen drei Stufen kamen gar nicht mehr vor.
- **Der teuerste Posten ist der Sheen-Sweep, nicht das Chrome.** Er ist eine `<mask>` mit einer ZWEITEN vollen
  Textinstanz plus ein per SMIL 0,95 s lang bewegtes `<rect>`. Weil die Maske eine Paint-Operation INNERHALB des
  SVG ist, wird der ganze gefilterte Teilbaum samt der drei `drop-shadow`-Lagen fast eine Sekunde lang **je Frame
  neu gerastert**. Die `willChange`-Promotion schützt davor nicht: sie verhindert Re-Raster durch die
  TRANSFORMATION, nicht durch geänderten Inhalt.
- **Er hing allein an `reduced`** — auf dem Handy ist das false (Default „ausgewogen" → `lite`), der Sweep lief
  dort also mit. Jetzt `sheen={reduced || lite ? "off" : "once"}`. **Die Wortmarke bleibt unangetastet**
  (Chrome-Verlauf, Kontur, Glow) — nur der Lichtstreifen fehlt. Gottgleich bleibt damit auf dem Handy als eigene
  Stufe erkennbar, und die Shop-Vorschau (`sheen="loop"`) zeigt weiter denselben Aufbau.
- **`willChange` gab es nur am epischen Zweig**, ohne Grund: die Konstruktion ist bei allen vier dieselbe (außen
  die skalierende `as-bigscore`-Animation, innen die gefilterten Wortschichten). Der nicht-epische Wrapper trägt
  es jetzt auch. Die #ios-word-Trennung bleibt heil — Promotion außen, Filter innen.
- **`cool` 2500 → 4000** (Entscheidung des Users). Einschaltdauer ~76 % → **~47 %**, und die Leiter ist wieder
  eine Leiter. Gottgleich ist damit nicht mehr der dichteste Takt der Leiter (Irre 3600 ist es) — genau das
  hält der Wächter fest, und zwar **nur** das: die unteren Stufen haben absichtlich längere Cooldowns, weil sie
  auf viel mehr Stichen auslösen.
- **Verworfen: Gottgleich auf das DOM-Design der anderen Stufen umstellen.** Bringt nach dem Sweep-Ausbau nur
  noch den kleinen Rest (SVG-Textlayout, 5-Stopp-Verlauf, 3-px-Kontur, `getBBox` + `fonts.ready`-Nachmessung),
  kostet aber die Identität der höchsten Stufe (gleiche Schrift, gleiche Behandlung wie Irre) UND bräche die eine
  Wahrheit mit der Shop-Vorschau, die dieselbe Komponente mountet.
- Wächter: `test/announce-perf.test.js`. Er liest die Stufenleiter aus der Quelle, statt die Zahlen abzutippen,
  und prüft zuerst, dass er sie überhaupt noch findet.
- **Der Sweep-Ausbau trifft ALLE DREI epischen Ansagen** (Gottgleich, Lawine, „Gönn dir") — sie laufen durch
  denselben `b.tier.epic`-Zweig und damit durch den einen `<GottChromeWord>`-Aufruf. Es gibt in Battlefield.jsx
  genau EINE In-Game-Renderstelle der Wortmarke; wer hier eine zweite anlegt, spaltet auch diesen Schalter.
- **GERECHNET, nicht am Gerät gemessen.**

### #ansage-deck — vier von sechs Ansagen ignorierten das aktive Deck (19.08.2026)
Die Farbe einer Groß-Ansage kam aus drei verschiedenen Quellen, und zwei davon kannten das Deck gar nicht:
Stark/Brutal/Irre trugen je einen FEST eingetragenen `chrome`-Block (7-Stopp-Verlauf + Glow + optionale Aura,
Leiter Cyan → Violett → Magenta), „Gönn dir" ein festes Gold `#ffd24a`, und nur Gottgleich/Lawine folgten der
Deckfarbe — die auch nur bei eingeschaltetem Prunk-Farbmodus. Jetzt tragen **Stark/Brutal/Irre und „Gönn dir"
IMMER die Deckfarbe**; Gottgleich und Lawine behalten ihren Prunk-Schalter (dort hängt die Farbe am gekauften
Effekt, das ist eine andere Frage als „welches Deck spiele ich").
- **Die Rechnung liegt rein in `src/ui/fx/announceChrome.js`** (kein React, kein Canvas) — dieselbe Bauart wie
  `previewScale.js` und `packSort.js`, damit der Wächter die Verläufe NACHRECHNET statt Schreibweisen zu
  vergleichen. Dass ein Verlauf die Deckfarbe wirklich enthält, sieht man dem Aufrufer nicht an.
- **ZWEI Achsen, seit #ansage-stufen (19.08.2026).** Der erste Wurf hatte nur die Sättigung und bezahlte das
  damit, dass die drei unteren Stufen denselben Farbton trugen. Die Rückfrage „am Desktop ziehen die Panels
  doch verschiedene Farbstufen aus dem Deck — geht das nicht auch für die Ansagen?" war berechtigt:
  - **Ton** (`TON_JE_RANG` = 0 / 0,5 / 1): Stark = Deck-Primär · Brutal = Mitte · Irre = Deck-Sekundär.
    Damit ist die Farbleiter des festen Satzes (Cyan → Violett → Magenta) zurück — sie zieht ihre drei Töne
    jetzt aus dem Deck statt aus einer Tabelle.
  - **Sättigung** (`WEISS_JE_RANG` = 0,78 / 0,70 / 0,62): je höher die Stufe, desto weniger Weiß.
  - dazu unverändert die zweite Glow-Lage `aura` erst ab Brutal (`AURA_AB_RANG = 2`).
  **Woher das Muster stammt:** die Panels ziehen NICHT mehrere Deckfarben — ein Deck hat genau `a1` und `a2`.
  Sie ziehen EINE Farbe in Stufen (`color-mix(… var(--deck-a1) N%, dunkel)`, N zwischen 7 und 80, plus
  `--deck-border` bei 45 %). Genau diese Idee trägt hier zwei Achsen statt einer.
- **Der Mittelstopp ist der GEGENPOL, nicht fest die Sekundärfarbe.** Genau das war die Falle beim Nachziehen:
  fest auf `a2` gesetzt fällt er bei Irre mit der Hauptfarbe zusammen (die dort ja selbst `a2` ist) und der
  Verlauf läuft flach — ausgerechnet auf der höchsten Stufe. Jetzt `ton <= 0.5 ? a2 : a1`.
- **Zwei gleiche Deckfarben zählen als EINE.** Sonst liefe die Ton-Achse über eine Strecke der Länge 0; der
  Verlauf wäre in der Mitte flach, ohne dass man dem Code ansieht, warum. Dann greift der Einfarb-Pfad
  (aufgehelltes Eigen-Grau als Mitte, keine Aura).
- **`null` ist überall der geplante Rückfall, kein Fehlerfall**: `deckChrome` gibt `null` zurück, sobald die
  Deckfarbe unlesbar ist oder die Stufe keinen `rank` hat (die epischen) — der Aufrufer nimmt dann den fest
  eingetragenen Satz. **Die drei festen `chrome`-Blöcke bleiben deshalb ausdrücklich stehen und sind kein
  toter Code**; ein Wächter zählt sie, damit sie beim nächsten Aufräumen nicht als Leiche wegfliegen.
- **Reihenfolge in `epicWordColors` IST die Regel**: `deckAlways` („Gönn dir") → feste `tier.color` → Prunk-Modus.
  Der mittlere Fall hat heute keinen Nutzer mehr, bleibt aber als Ausweg für eine Stufe mit eigener Farbe.
- **Die drei Fundstellen im nicht-epischen Zweig gehören zusammen** (Basis-Glyphe · Verlauf · `chromeFilter`).
  Stellt jemand EINE davon auf `b.tier.chrome` zurück, trägt dasselbe Wort zwei Farbsysteme gleichzeitig — der
  Wächter prüft deshalb den ganzen Zweig auf Abwesenheit von `b.tier.chrome`.
- **Falle beim Wächter-Schreiben**: `it("„Gönn dir" …")` — das deutsche Schlusszeichen ist ein GERADES `"` und
  beendet den JS-String. Vite meldet das als „invalid JS syntax", nicht als Anführungszeichen-Fehler. Im
  Zweifel `“…”` verwenden.
- Wächter: `test/announce-deck.test.js` (Farbrechnung nachgerechnet + Verdrahtung als Ratsche).
- **Nicht am Gerät gesehen** — Build, Lint und 1772 Tests grün, der Blick auf die Ansagen über 40 Decks
  (besonders dunkle Decks: der Verlauf lebt vom Weiß-Anteil) steht aus.

### #fx-deckdefault — Deckfarbe ist die Vorauswahl, für ALLE Effekte (19.08.2026)
Die dreizehn Farbmodus-Flags (`fx*Deck`) standen alle auf `false` = Standardton. Die Karten-Animationen
(Edge/Holo/Glitch) laufen dagegen ohnehin IMMER in der Deckfarbe und haben deshalb gar kein Flag — ein frisch
gekaufter Hintergrund- oder Prunk-Effekt fiel daneben als einziger auf einen deckfremden Ton zurück, und zwar
genau im Moment des Kaufs, in dem man ihn zum ersten Mal sieht. **Default ist jetzt `true`.** Der Standardton
bleibt als Wahl erhalten, er ist nur nicht mehr die Vorauswahl.
- **„Auch direkt nach Kauf" kostet nichts extra**: die Flags sind GLOBAL (nicht je gekauftem Stück), ein neu
  freigeschalteter Effekt liest beim ersten Rendern also schon `true`. Es gibt keinen Kauf-Pfad, der sie setzt.
- **Der Default allein erreicht bestehende Stände NICHT** — `loadOptions` merged `{...DEFAULT_OPTIONS, ...o}`,
  der gespeicherte Wert gewinnt immer. Dieselbe Naht, an der schon `fxDeckGlow` hängen blieb. Deshalb
  `liftFxDeckDefaults(o)` in `normalizeFxOptions`: hebt einmalig alle dreizehn und setzt den Marker
  `fxDeckDefaultLift`. Vertretbar, weil `false` bis dahin der DEFAULT war — ein gespeichertes `false` lässt
  sich nicht von „nie angefasst" unterscheiden, es gibt also keine bewusste Wahl zu überschreiben.
- **Der Marker MUSS in DEFAULT_OPTIONS auf `false` stehen.** Stünde er auf `true`, bekäme ihn jedes Alt-Profil
  aus dem Merge und die Anhebung liefe kein einziges Mal — die Änderung wäre lautlos wirkungslos.
- **Und sie muss zurückgeschrieben werden**: `loadOptions` speichert jetzt auch, wenn der Marker fehlte
  (vorher nur bei geändertem `reducedFx`). Ohne das liefe die Anhebung bei JEDEM Start und überschriebe eine
  spätere bewusste Wahl „Standard" — ein Schalter, der sich nach dem Neuladen von selbst zurückstellt.
- **`FX_DECK_KEYS` wird aus `DEFAULT_OPTIONS` abgeleitet** (`/^fx.+Deck$/`), nicht abgetippt, und
  `COSMETIC_OPTION_KEYS` spreizt sie ein. Vorher standen dieselben dreizehn Namen zweimal da; ein neuer Effekt
  mit Farbmodus hängt sich jetzt automatisch in Anhebung UND Dev-Reset ein.
- **`test/storage.test.js` führt eine eigene Kopie von `DEFAULT_OPTIONS`** (das Original ist modul-privat) —
  sie ist die Ratsche auf die Defaults und musste mitgezogen werden. Genau dafür ist sie da: eine geänderte
  Vorauswahl soll ein bewusster Akt sein, kein Nebeneffekt.
- Wächter: `test/announce-deck.test.js`, Abschnitt #fx-deckdefault.

### #boden-zeile — die Stich-Aufschlüsselung steht bei Boden-Effekten mobil über den Karten (19.08.2026)
Gemeldet: „bei Bodeneffekten, wie Neonbrandung und Cubes kann man die Score-Zusammensetzung nicht mehr lesen."
Nachgemessen (390×844, Produktionsbuild): Brett **358×347**, der Boden beginnt laut `EFFECT_ZONES.mobile.y`
(86 %) bei **298 px** — die Zeile lag mit 302–322 px komplett darin.
- **Nur die Aufschlüsselung wandert, die Sieg/Niederlage-Ansage NICHT** (ausdrückliche Ansage des Users nach
  zwei falschen Anläufen: erst hatte ich die zwei Zeilen getauscht, dann beide nach oben geschoben, dann der
  Zeile eine Trägerfläche gegeben — alles drei war nicht gefragt). Die Ansage ist großer, fetter, farbiger
  Text und über dem Effekt weiterhin lesbar; die feine Faktorenkette ist es nicht.
- Gemessen danach: Zeile **25–45** (statt 302–322). **Die Panelhöhe bleibt 347 px.**
- **Die drei Abstände werden UMVERTEILT, nicht gekürzt** (Zeile · Kartenreihe · Ansage): `4+32+16 = 52 px`
  im Normalfall, `−12+24+40 = 52 px` mit der Zeile oben. Der negative Abstand holt die Zeile in das obere
  Panel-Polster (`p-6` = 24 px): die Hälfte davon war über ihr ungenutzte Luft, und jedes Pixel, das sie dort
  gewinnt, ist ein Pixel Abstand der Karten zum Effekt. Damit bleibt die Panelhöhe gleich — **und das ist die
  Bedingung, unter der die Verschiebung überhaupt etwas bringt.** Das Effekt-Band ist ein PROZENTSATZ der
  Panelhöhe (86 %); ein kürzeres Panel zöge den Boden mit nach oben und die Karten kämen ihm genauso nah wie
  vorher. Wer an einem der drei Werte dreht, muss einen anderen gegenrechnen — der Wächter addiert beide
  Seiten und fällt bei jeder einseitigen Änderung.
- Endstand gemessen: Zeile **13–33** · Karten **57–250** · Ansage 290–322 · Boden ab 298. Die Karten haben
  damit **48 px Abstand** zum Bandbeginn (vorher 24) — und stehen auf **exakt denselben Pixeln wie ohne
  Boden-Effekt**. Die Zeile kostet die Karten damit gar nichts mehr; bezahlt wird sie allein aus dem Polster
  oben und dem größeren Abstand der Ansage unten.
- **EIN Block, zwei Einhängepunkte** (`const kette`, `{ketteOben && kette}` vor der Kartenreihe,
  `{!ketteOben && kette}` dahinter). Zwei Fassungen wären die Doppelpflege, vor der die Datei überall warnt.
- **Nur `cubematrix` + `neonsurf`.** Aurora ist ein Himmels-Effekt (oben), Sternenfeld/Komet sind Finisher
  (kurz, kein Dauerbild). Neue Boden-Ebene → in `bodenFx` eintragen.
- **Nur mobil** (`MOBILE_MQ`, dieselbe 640-px-Grenze wie die Zonen-Wahl) — so angesagt. **Der Desktop ist
  damit nicht sauber, sondern unangetastet:** das Brett ist dort breiter, aber gleich hoch (gemessen 668×347
  bei 1400 px), und sein Band beginnt schon bei 82 % = **285 px** — die Zeile liegt also auch dort im Boden.
  Wer das angeht, hängt `ketteOben` allein an `bodenFx` statt zusätzlich an die Breite.
- `useMediaQuery` ist aus `useIsWide.js` herausgezogen (`useIsWide` ist jetzt der Sonderfall darauf).
- Kontrollmessungen: ohne Boden-Effekt (mobil) und auf 1400 px steht alles unverändert (Karten 57–250,
  Ansage 266–298, Zeile 302–322).
- Wächter: `test/trick-breakdown.test.js`. Gegenprobe gemacht: Verschiebung ohne Boden-Effekt · Aurora
  fälschlich als Boden · oberer Einhängepunkt entfernt · Ansage zweimal gerendert · Ansage in den wandernden
  Block gezogen — alle fünf fallen.
- **Nicht am Gerät gesehen** — headless im Produktionsbuild gemessen und nachgerendert.

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

### #shop-skalieren + #shop-luft — die Pack-Vorschau passt jetzt ins Fenster (19.08.2026)
Gemeldet: „im Shop die Anzeigen im Fenster skalieren, damit man dort nicht scrollen muss, um alles zu sehen" —
und „die Shop-Panels sind zu nah am Rahmen". Zwei getrennte Nähte, beide nur ab 1400 px (Desktop-Fassung);
die Handy-Fassung ist per Konstruktion unberührt (alle Griffe hängen im `inline`-Zweig von `PackDetail`).
- **Gemessen zuerst** (Produktionsbuild, Playwright, echte Komponente): der Inhalt der Detailspalte braucht
  **662 px**. Auf 1920 × 1080 und 1723 × 1030 hat er genau 662 — dort passte es und niemand hätte etwas
  gesehen. Auf **1536 × 791** hat er 558, also **104 px Überhang**: Kartenrückseite, Spielfeld und der
  Aktivieren-Knopf standen nie zusammen im Bild. Ein Scroller in einer Spalte, die selbst schon in einem
  gedeckelten Panel sitzt, ist die falsche Antwort — die drei Bilder sind eine VORSCHAU: sie müssen nicht
  groß sein, sie müssen vollständig sein.
- **Geschrumpft wird die BREITE des ganzen Blocks — und der erste Anlauf hat genau das falsch gemacht.**
  Fassung 1 schrumpfte die HÖHEN über Flexbox (`min-height: 0` an den Bildkästen). Das passte rechnerisch
  und kam vom Gerät sofort zurück: *„auf der Laptop-Auflösung sind die Karten- und Hintergrundbilder nicht
  mehr ausgerichtet."* Der Grund ist strukturell und hätte vorher auffallen können — die Kästen sind
  BREITEN-getrieben (`aspect-ratio`): schrumpft man die Höhe, bleibt der KASTEN breit und das Bild steht
  mittig darin. Damit stehen die drei Bilder weder bündig unter ihren Beschriftungen noch bündig
  zueinander, und je flacher das Fenster, desto weiter laufen sie auseinander (gemessen 23 px Versatz auf
  1536 × 791, 43 px auf 1400 × 700). Über die BREITE ist die flache Fassung eine echte VERKLEINERUNG der
  hohen: alles bleibt an seiner Kante.
- **Die Rechnung ist eine Zeile** (`src/ui/shopScale.js`, rein, ohne React): `f = 1 − Überhang / Bildhöhe`.
  Beschriftungen, Abstände und der Aktivieren-Knopf skalieren NICHT mit der Breite, stehen also auf beiden
  Seiten der Gleichung und kürzen sich heraus — die Formel braucht deshalb keine Liste der festen Posten
  (die wäre bei jedem neuen Element in der Spalte still falsch). Das Kartenpaar steht NEBENeinander und
  zählt einmal in die Bildhöhe.
- **Gemessen wird IMMER an der ungeschrumpften Fassung** (Breite auf 100 %), sonst ist der Überhang schon
  wegskaliert und der Faktor liefe mit jedem Durchgang weiter nach unten. Zwei Griffe gehören dazu:
  1. Der Scroller steht während der Messung auf `overflow-y: hidden`. Mit sichtbarer Leiste misst man eine
     um deren Breite schmalere Spalte; der daraus errechnete Faktor ließe nach dem Anwenden wieder rund
     15 px überstehen — die Leiste käme zurück.
  2. Beides passiert in einem `useLayoutEffect`, also VOR dem Zeichnen. Den Zwischenzustand sieht man nie.
- **`overflow-y: auto` bleibt bewusst stehen**: das Ventil, falls der Faktor seine Untergrenze
  (`SHOT_F_MIN` = 0,45) erreicht. Realistisch nie — auf dem flachsten sinnvollen Desktop-Fenster
  (1400 × 700) liegt er bei rund 0,62.
- **Der Block steht mittig, nicht linksbündig.** Beide Fassungen gerendert und verglichen: linksbündig
  teilt er sich zwar eine Kante mit Titel und Aktionsknopf, lässt aber rechts eine tote Spalte stehen
  (auf 1536 × 791 rund 110 px), die sich wie ein fehlendes Bild liest.
- **Nebenrechnung, die zugunsten der Sicherheit ausgeht**: der 12-px-Spalt zwischen den zwei Karten
  skaliert NICHT mit, die Kartenbreite ist also `(f·W − 12)/2` statt `f·(W − 12)/2` — die Bilder werden
  eine Spur kleiner als nötig. Überhang bleibt damit garantiert bei 0.
- **#shop-luft**: zwischen Reiter-Unterkante (y = 144) und Panel-Oberkante (y = 152) standen **8 px**. Beide
  sind LEUCHTENDE Kanten (aktiver Reiter mit Deckfarben-Strich, Panels mit `as-ring`) — zwei helle Linien in
  8 px Abstand lesen sich als eine gedoppelte Kante statt als Kopf und Inhalt. Jetzt `padding-bottom: 18px`
  an `.cz-head`, also am KOPF und nicht als `margin-top` am Raster: der Kopf ist sticky, sein Polster gehört
  zu ihm und fährt mit. **Der Upgrade-Baum behält seine 8** — dort ist die Reiterzeile ausgeblendet, es
  stoßen also gar keine zwei Leuchtkanten aufeinander.
- Nachgemessen nach dem Umbau: Überhang **0** und Beschriftungen **bündig zu ihren Bildern** auf
  1920 × 1080 · 1723 × 1030 · 1536 × 791 · 1400 × 760 · 1400 × 700; Aktivieren-Knopf überall im Panel, auch
  beim Stufen-Deck (I/II/III kostet eine Zeile mehr und wird von den Bildern mitbezahlt). Beim Durchklicken
  mehrerer Packs und beim Fenster-Resize stellt sich der Faktor sauber neu ein (nachgemessen hin und
  zurück), Reiter „Herausforderungen" und „Effekte" laufen nirgends über.
- Wächter: `test/shop-scale.test.js` — rechnet den Faktor NACH und hält die Verdrahtung als Ratsche fest,
  **inklusive der Gegenprobe, dass die Höhen-Schrumpfung nicht zurückkommt**. Sechs Sabotagen durchgespielt,
  alle fallen.
- **Nicht am Gerät gesehen** — alles headless im Produktionsbuild gemessen und nachgerendert.

### #held-merken — „Deine Skills" merkt sich, ob es offen war (19.08.2026)
Das Klappfeld stand in Perk- UND Skill-Wahl auf `useState` im `CollapsibleField` — und die Karte wird je
Level-up neu gemountet. Wer es zuklappte, fand es in der nächsten Phase wieder offen. Dieselbe Naht, die
`lvPassive`, `lvWingDeck`/`lvWingStats` und `lvWingBuildings` schon haben.
- **Ein SCHALTER an derselben Komponente, keine zweite Fassung** (Regel 1): `CollapsibleField` nimmt
  jetzt optional `open` + `onToggle`. Reicht ein Aufrufer beide herein, ist das Feld GESTEUERT; ohne sie
  hält es seinen Zustand weiter selbst — Chronik, „Deck-Stärke" und „Dein Build" bleiben unberührt. Ein
  Wächter hält BEIDE Pfade fest: fiele der interne weg, ließen sich diese drei gar nicht mehr klappen.
- **`lvHeld: true` in `DEFAULT_OPTIONS`** (Default AUF, wie bisher). Ohne den Eintrag schluckt der
  `{...DEFAULT_OPTIONS, ...o}`-Merge in `loadOptions` den Schlüssel — die bekannte Falle, die auch
  `fxDeckGlow` und die Flügel-Schlüssel getroffen hätte. `test/storage.test.js` führt die Defaults als
  eigene Kopie und ist damit die Ratsche darauf.
- **EIN Schlüssel für beide Bildschirme**, nicht je einer: „aufgeklappt lassen" ist eine Lesegewohnheit,
  keine Eigenschaft der gerade offenen Karte (dieselbe Entscheidung wie bei `lvPassive`).
- Nachgemessen im Messstand (Karte je Klick neu gemountet, wie im Spiel): zu → bleibt zu über den
  Remount, wieder auf → bleibt auf; auf 1536 und 390 px, in Perk- und Skill-Wahl.
- Handy-Geometrie unverändert (390 px, beide Bildschirme, 273 Boxen ohne eine Abweichung). Der
  Pixelvergleich weicht dort minimal ab — das ist der animierte Goldrahmen der legendären Angebotskarten
  (nachgewiesen: zwei Läufe DERSELBEN Fassung weichen genauso ab).
- Wächter: `test/levelup-wings.test.js`. Gegenprobe gemacht: alle sechs sabotierten Nähte fallen.

### #brett-luft — die Legendenzeile bekommt Luft zum Brett (19.08.2026)
Zwischen der Gebäude-/Legendenzeile („🏗 Gebäude an · Wert · Score · Formation") und dem Brett standen
**8 px**. Auf dem Desktop stoßen dort zwei sehr verschiedene Dinge aneinander: eine Zeile aus Knopf und
Farbmarken und ein Raster aus 40 gerahmten Kacheln — bei 8 px liest sich die Zeile wie die erste
Brettreihe. Jetzt **14 px**, der Schritt, den dieser Durchgang auch sonst für „gehört zusammen, ist
aber nicht dasselbe" benutzt.
- **Die Zeile ist GETEILT** (Aufstellungsphase · Chronik · Victory · Lauf-Details) — es gibt genau eine
  Stelle, an der der Abstand steht, und die Regel trifft alle vier gleich. `ArchToggle` bekommt dafür
  nur einen Haken (`arch-toggle`), gestellt wird im Desktop-Block.
- **Am Handy bleiben die 8 px** (gemessen 390 px: unverändert): dort ist der Platz knapp und die Zeile
  bricht ohnehin um, was die Trennung selbst schon leistet.
- Wächter: `test/rd-ruhe.test.js` (Abschnitt #brett-luft) — er prüft, dass der Desktop-Wert GRÖSSER ist
  als die Handy-Fassung, statt eine Zahl zu vergleichen. Gegenprobe gemacht: alle vier sabotierten
  Nähte fallen (Regel weg · gleicher Wert wie am Handy · Haken weg · `mb-2` weg).

### #lv-anker — die Flügel-Griffe stehen fest, und zwar auf der Karte (19.08.2026)
Dritte Runde an derselben Naht, gemeldet: „wenn ich die gehaltenen Skills ein- und ausklappe, wandern
die Griffe mit — sicherlich auch bei der Skill-Auswahl." Stimmt beides. Seit `HeldSkills` als Klappfeld
IN der Karte steht (Parallel-Session), ändert der SPIELER ihre Höhe — und der auf die Kartenmitte
gesetzte Griff (#lv-mitte) wanderte **gemessen 103 px**, während man ihn ansieht.
- **Die drei Fassungen und ihre Meldungen**: an die Rasterhöhe geheftet (#lv-griff) hingen die Griffe
  unter der Karte · auf die Kartenmitte gesetzt (#lv-mitte) wandern sie mit jedem Angebot · jetzt
  gedeckelt.
- **Der Deckel ist die Auflösung des Widerspruchs.** `top: min(50%, 190px)`: 190 px ist die Mitte der
  **kleinsten** Karte (gemessen 381 px — Skill/Feuer, nichts gehalten; breitenunabhängig über
  1536 · 1920 · 2047). Auf ihr sitzt der Griff damit exakt mittig, auf jeder größeren steht er still.
  Nachgemessen über 2 Bildschirme × 5 Angebote × 2 Klappzustände × 3 Fenster: **eine einzige Position
  je Fensterhöhe**, Anteil 25–44 % der Kartenhöhe, kleinster Abstand zur Kartenkante **152 px**.
- **`min(50%, …)` statt einer nackten Zahl**: eine noch kürzere Karte (andere Sprache, kleineres
  Angebot) ließe den Griff sonst unterhalb ihrer Mitte stehen. Die Form ist die Zusage, die Zahl nur
  der Deckel.
- **Warum nicht die Karte stabilisieren**: eine feste Kartenhöhe brächte die Leere zurück, die
  #lv-fluegel entfernt hat (kleinste Karte 381, Deckel 760 → bis zu 379 px Loch).
- Wächter: `test/up-ruhe.test.js` — er RECHNET nach, dass der Deckel die halbe kleinste Karte nicht
  überschreitet, statt die Zahl zu vergleichen. Gegenprobe gemacht: nackte 50 %, nackte Pixelzahl, zu
  hoher Deckel und der wieder gestreckte Kasten fallen alle vier.
- Handy unberührt (Griffe werden unter 1400 px gar nicht gerendert; Pixelvergleich 390 px im Rauschen).

### #kpi-passt — die Zahl der Status-Tafel passt sich der Kachel an (19.08.2026)
Gemeldet vom Gerät: „Letzter Lauf **179.077.04**…" — der Score lief aus seiner Kachel und wurde vom
`overflow: hidden` des Rahmens mitten in der Zahl abgeschnitten. Nachgemessen: elf Zeichen brauchen bei
27 px rund **175 px**, die Kachel hat innen **117 px** (bei 1400) bis **141 px** (ab 1920) — also
32–34 px Überlauf, und zwar auf JEDER Desktop-Breite.
- **Die Regel rechnet, statt zu raten.** `ty-num` ist Geist Mono, der Vorschub ist damit für jedes
  Zeichen gleich — **gemessen 0,59 × Schriftgrad**, Ziffern wie Trennzeichen (headless über drei
  Längen gegengeprüft, exakt derselbe Wert). Mit der Zeichenzahl aus dem JSX (`--kpi-n`) und `cqw`
  (100 cqw = Innenbreite der Kachel) ergibt sich der größte Grad, der noch hineinpasst:
  `max(14px, min(27px, 100cqw / (n × 0,6)))`. Keine Schwelle, kein Messen im JavaScript, und die Regel
  folgt jeder Fensterbreite von selbst. Der Teiler 0,6 ist die Sicherheitsmarge auf die 0,59.
- **`container-type: inline-size` ist Pflicht, nicht Kosmetik**: ohne Container beziehen sich `cqw` auf
  ein Containment weiter oben und die Rechnung wäre **stumm falsch**. Die Kachel ist ein Rasterfeld
  (`grid-cols-4`), ihre Breite hängt also nicht am Inhalt — die Bedingung des Containments ist ohnehin
  erfüllt. Ein Wächter hält beides fest (Container vorhanden · Teiler ≥ gemessener Vorschub).
- **Der Deckel bleibt der bisherige Grad**: kurze Werte (SP, DP, „0/1") ändern sich um **kein Pixel**
  (nachgemessen 27 px in allen Fällen). Nur was nicht passt, wird kleiner — 179 Mio. auf 21,1/21,6 px
  mit 3–4 px Luft, ein 12-stelliger Score noch auf 15,5 px.
- **Die Wertzeile behält die Höhe des vollen Grades** (`min-height: 27px` + `align-items: flex-end`).
  Ohne das rückt die kleinere Zahl ihre Unterzeile mit nach oben — gemessen 4 px, und die vier Kacheln
  stehen nicht mehr auf einer Linie. Nach dem Umbau: Wertzeile 208–231 und Unterzeile 232 in ALLEN vier.
- **Messfalle**: der Hub ist ab 1400 px gezoomt (0,848 auf 1400–1600). `getBoundingClientRect` liefert
  die SICHTBARE Größe, CSS-Längen im Inneren sind unzoomt — wer beides mischt (Rect-Breite minus
  Polster aus dem Stylesheet), misst 5 px Überlauf, die es nicht gibt. Vergleich deshalb über
  `offsetWidth`, oder die Rect-Breite durch den Zoom teilen.
- Der Hub-Zoom ist auch der Grund, warum die 27 px am Gerät kleiner ankommen als am Schreibtisch.
- Handy unberührt: die Tafel ist ab 1400 px sichtbar (`hidden min-[1400px]:flex`), und beide Regeln
  stehen im Desktop-Block. Pixelvergleich 390 px: **0,0000 von 255**.
- Wächter: `test/hub-panels.test.js` (Abschnitt #kpi-passt). Gegenprobe gemacht: alle fünf sabotierten
  Nähte fallen.

### #rd-ruhe — die Lauf-Details im Desktop-Ton (19.08.2026)
Sechster Screen nach der Liste („Desktop-Umbau: die ENTSCHEIDUNGSREGELN", oben). Vorgabe des Users:
**„layout passt erstmal"** — also nur die Lautstärke. Es ist derselbe Screen wie der Siegesbildschirm,
nur aus anderer Herkunft (gespeicherte Zeile statt laufendes Spiel); die Werte sind deshalb **1 : 1**
die von `.st-box` (#st-ruhe) und `.go-box` (#go-ruhe), und der Wächter rechnet das nach, statt sie
noch einmal abzutippen.
- **Die vier Ringe stehen still** (`as-ring-quiet` an `rd-c1…c4`, im JSX). In der Meldung des Users war
  genau das der lauteste Posten: vier wandernde Deckfarben-Bänder um vier Panels.
- **EINE Kachelform.** Vorher fünf Radien nebeneinander: 14 (Panel) · 12 (Baumstand) · 8 (Kennzahlen,
  Gebäudeliste, Hinweise) · 4 (Chips) · 16 (Kopf-Karte). Jetzt 6 px innen, 14 am Panel.
- **Schließen wird Text-Knopf**, wie in Baum und Statistik; das Klickziel bleibt (11/18 px).
- **`RunStats.jsx` teilen sich DREI Screens** (Victory · Chronik · Lauf-Details). Die Kästen bekommen
  dort nur HAKEN (`rs-cell` · `rs-tree` · `rs-note`), gestellt wird ausschließlich `.rd-card`-eingegrenzt
  — ein Griff an der Quelle träfe die anderen beiden mit. Ein Wächter prüft die Eingrenzung für jeden
  der vier Haken.
- **NICHT angefasst** (Regel 5, 6): das Brett der finalen Aufstellung — seine Kartenrahmen tragen Wert,
  Score und Formation als FARBE, das ist die Aussage des Panels. Und der blaue Rahmen der Gebäudeliste
  (Architekt-Signal, gleiche Entscheidung wie an `.go-blist`); nur ihre Fläche gibt sie ab.
- Handy bitidentisch (Pixelvergleich 390 px: 0,0000 von 255).
- Wächter: `test/rd-ruhe.test.js` (9). Gegenprobe gemacht: alle sieben sabotierten Nähte fallen.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert (1920×1080).

### #ecke — Glossar und Ton in JEDEM Menü, oben links (19.08.2026)
Beide hingen am Startbildschirm: der Mute-Knopf in dessen linker oberer Ecke, das Glossar rechts oben
(unter 1400 px) bzw. im Fußband neben Discord (darüber). Sobald ein Menü-Screen offen war — Werkstatt,
Baum, Statistik, Bestenliste, Leitfaden, Optionen —, war beides weg. **EIN globales Paar**
(`src/ui/CornerTools.jsx`) statt sieben Einbauten; es liegt auf z 70 über allen Menü-Overlays (z 20–60)
und ist damit auch im Glossar selbst erreichbar. Reihenfolge: **Glossar links, Ton rechts.**
- **Nur im Menü** (`phase === "menu"` in App.jsx). Im Lauf haben beide ihren eigenen Platz — das ⓘ im
  Kopf, den Ton in der Steuerzeile; ein schwebendes Paar über dem Brett wäre ein drittes Bedienelement.
- **Ab 1400 px.** Alle Regeln stehen im Desktop-Block, darunter ist das Paar `display: none`. Handy
  bitidentisch nachgewiesen (Pixelvergleich 390 px über Hub, Optionen und Statistik: je 0,0000 von 255).
  **Messfalle dabei:** der erste Vergleich zeigte Abweichungen — der Messstand rendert die Komponente in
  BEIDEN Fassungen, in der „vorher"-Fassung fehlte ihr aber die Regel, sie stand also als ungestylter
  Block im Fluss. Eine neue Komponente muss im Vorher-Lauf **weggelassen** werden, nicht nur ihr CSS.
- **Der Platz kommt vom KOPF, nicht von der Wurzel.** Die Menü-Köpfe setzen ihren Titel ganz links; ohne
  Polster läge er unter den Knöpfen. Ein Polster an der Wurzel hätte den ganzen Screen verschmälert —
  Baum, Leitfaden und Glossar sind auf flachen Fenstern auf 0 px Überlauf ausgemessen (#flach,
  #desktop-leitfaden), 92 px weniger Breite hießen dort mehr Höhe.
- **Und nur, solange das Paar wirklich da ist** (`:root[data-corner-tools]`, gesetzt in App.jsx). Sonst
  stünde der Titel der Bestenliste auch dann eingerückt da, wenn man sie vom ENDSCREEN aus öffnet — dort
  gibt es kein Paar. Der Marker hängt am `<html>`, weil Leitfaden und Glossar per Portal an
  `document.body` rendern und unter `.app-root` nicht erreichbar wären.
- **Die zwei Grenzen sind gerechnet, nicht geraten**: die Karte beginnt bei
  `48 + (Breite − 96 − Deckel) / 2`, das Paar endet bei 90 px → das Polster darf frühestens bei
  `Deckel + 2 × 90` entfallen. Deckel 1720 → **1920 px**, Deckel 1560 (Optionen) → **1760 px**. Darüber
  steht das Paar links NEBEN der Karte im freien Grund. Der Wächter rechnet das nach, statt die Zahlen
  zu vergleichen.
- **Der Mute-Knopf des Hubs ist ab 1400 px ausgeblendet** (`as-mute-hub`) — das Paar sitzt an derselben
  Stelle, zwei Knöpfe für dieselbe Handlung wären zwei Fassungen. **Das Glossar-ⓘ im Fußband bleibt**
  (anderer Platz, anderes Paar: es steht dort mit dem Discord-Zeichen). Wenn es weg soll, ist es eine
  Zeile — dann steht Discord allein.
- Gemessen 2047 · 1920 · 1600 · 1536 · 1400 px über sieben Screens: nirgends Überschneidung mit dem
  Titel (39–103 px Luft), nirgends waagerechtes Scrollen; das Paar liegt auf der Höhe der Schließen-
  Knöpfe (Mitte 43 gegen 43–49).
- Wächter: `test/ecke.test.js` (9). Gegenprobe gemacht: alle sieben sabotierten Nähte fallen — inklusive
  der Falle, dass die Ratsche zuerst den eigenen Begründungskommentar las (dritter Fall dieser Art).
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert.

### #lv-mitte — die Flügel-Griffe sitzen auf der Kartenmitte (19.08.2026)
Gemeldet: „die hängen ganz unten, es sieht komisch aus — sollten mittig sein" (Perk- UND Skill-Wahl).
Das ist die Rücknahme der Überkorrektur aus #lv-griff: dort wurde `.lv-cardwrap` auf die RASTERhöhe
gestreckt, damit der Griff (`top: 50%`) nie wandert. Gemessen 1536×791: Raster 728 px, Karte je nach
Angebot **381–515 px** → Griff bei 396, Kartenmitte bei 222–289. Auf dem kürzesten Angebot ragten
**21 px seines Körpers unter die Kartenkante** hinaus.
- **Beides zugleich geht nicht, und das ist der Kern:** die Karte hat eine FESTE OBERKANTE (#lv-fest)
  und eine vom Angebot abhängige Höhe — ihre Mitte MUSS also wandern. Es gibt nur „fest verankert,
  aber nicht an der Karte" oder „mittig auf der Karte, wandert mit ihr".
- **Gewählt ist mittig**, weil der Griff zur KARTE gehört: er steht damit in jedem Zustand an derselben
  Stelle DER KARTE. Nachgemessen: Griffmitte = Kartenmitte in allen fünf Fällen (Perk 248 · Blitz 251 ·
  Feuer 222 · Eis 289 · Pflanze 241), Oberkante der Karte unverändert fest bei y = 32.
- **Warum die alte Begründung trotzdem nicht falsch war:** als sie entstand, wanderte die Karte SELBST
  (das Overlay zentriert). Seit #lv-fest steht ihre Oberkante; ein mitwandernder Griff liest sich
  seitdem als „sitzt auf der Karte" statt als Springen.
- **Die feste Rasterhöhe bleibt** — sie hält die Oberkante, das ist eine andere Aufgabe als die
  Griffposition. Eine geratene Pixelzahl am Griff bleibt verboten (sie wäre für kein Angebot richtig);
  der Wächter hält beides fest.
- **Nicht stabilisierbar ohne Verlust:** die Höhendifferenz kommt allein aus der Länge der Angebotstexte
  (gemessen: Pager 157/196/215/292 px; der Rest der Karte ist auf allen Reitern gleich, und die Höhe ist
  breitenunabhängig — 1536 und 1920 liefern dieselben Werte). Ein `min-height` an der Karte wäre eine
  geratene, sprachabhängige Zahl und brächte die Leere zurück, die #lv-fluegel gerade entfernt hat.
- Handy bitidentisch (Pixelvergleich 390 px, Perk und Skill je 0,0000 von 255) — die Regel steht im
  1400er Block, unterhalb werden Griffe gar nicht erst gerendert.
- Wächter: `test/up-ruhe.test.js` (auf die neue Entscheidung UMGESCHRIEBEN, nicht gelöscht).
  Gegenprobe gemacht: alle drei sabotierten Nähte fallen.

### #bonus-benennen — die Wochen-Kachel sagt jetzt, was es zu holen gibt (19.08.2026)
„Bonus noch offen" nannte den Betrag nicht. Nachgesehen: der Ranked-Wochenbonus ist **+5 SP UND +5 DP**
für die erste abgeschlossene Ranked-Runde der Woche — bei **vollem Baum stattdessen +10 DP** (SP wären
dort nutzlos, deshalb wandert der SP-Anteil in DP). Die Kachel zeigt beide Fassungen.
- **Eigene Zeile über dem Zustand, nicht davorgestellt.** Gemessen: „+5 SP · +5 DP Bonus noch offen"
  braucht 131 px, die Kachel hat 118 (bei 1400 px) bis 140 (bei 2047). Es bräche also ohnehin um — dann
  lieber an der gewählten Stelle. Der Betrag trägt die Ranglisten-Farbe, „Bonus noch offen" bleibt die
  stille Zeile darunter. **Die Kachelhöhe ändert sich dadurch NICHT** (110 px bei 2047, 93 bei 1400,
  alle vier Zellen gleich) — die Zeile passt in die Luft, die die Zahl darüber ohnehin freilässt.
- **Die Zahlen sind aus `storage.js` exportiert** (`RANKED_WEEK_SP` · `RANKED_WEEK_DP` ·
  `RANKED_WEEK_DP_FULL`) statt im Katalog zu stehen — sonst ließe ein Balancing-Schritt die Tafel still
  falsch werden (dieselbe Naht wie bei der Formations-Legende, #formlegend). `recordRun` rechnet mit
  denselben Konstanten; ein Wächter prüft beide Enden UND die Beziehung `DP_FULL = SP + DP`.
- **Nicht angefasst**: die Bonus-Zeile am Ranglisten-Knopf unterhalb 1400 px (`start.ranked.bonus`,
  „Bonus {have}/{max}"). Sie hat dasselbe Thema, ist aber die HANDY-Fassung — und die wird in diesem
  Umbau grundsätzlich nicht angefasst. Wenn sie mitziehen soll, ist es dort dieselbe Zeile.
- Wächter: `test/hub-panels.test.js` (Abschnitt #bonus-benennen).

### #op-oben — die Optionen hingen mittig statt oben (19.08.2026)
Gemeldet: „Optionen-Screen etwas weiter nach oben, ist zu weit unten." Ursache ist eine Zeile aus der
Handy-Fassung, die der Desktop-Pass nie überschrieben hat: `.op-root` ist `flex items-center` — richtig
für eine Sprechblase, falsch für drei Panels, die kürzer sind als jeder Desktop-Schirm. Gemessen
1920 × 1080: **206 px Leere über dem Titel** (und ebenso viel darunter), 157 px auf 2047 × 983.
- **Fix ist `align-items: start !important` an der BESTEHENDEN `.op-root`-Regel** — dieselbe Zeile, die
  `.st-root`/`.lb-root` seit #rahmen-huelle tragen. Der Screen fängt damit auf demselben Pixel an wie
  Baum, Werkstatt, Statistik und Bestenliste (16 px, auf flachen Fenstern 10).
- **Der Höhendeckel an `.op-card` muss bleiben** (`max-height: 100%`): oben verankert ohne Deckel
  wüchse die Karte auf flachen Fenstern aus dem Bild, statt dass ihr Rumpf scrollt. Der Wächter prüft
  beides zusammen — die Ankerung allein wäre die halbe Regel.
- Gemessen nach dem Umbau: Oberkante 16 px auf 2047 × 983 und 1920 × 1080, 10 px auf 1536 × 791,
  nirgends Scrollen. **Handy bitidentisch** (Pixelvergleich 390 px, 0,0000 von 255; Karte weiter
  mittig bei 42/42 px).
- Wächter: `test/menu-desktop.test.js`. Gegenprobe gemacht: beide sabotierten Nähte fallen.

### #st-ruhe — die Statistik im Desktop-Ton (19.08.2026)

Vierter Screen nach der Liste („Desktop-Umbau: die ENTSCHEIDUNGSREGELN", oben). Vorgabe des Users:
**„informationen und layout ist gut"** — also ausdrücklich nur die Lautstärke, kein Inhalt, keine
Anordnung. Alles ab 1400 px; Handy **bitidentisch** nachgewiesen (Pixelvergleich 390 px, mittlere
Abweichung **0,0000 von 255**, größte Einzelabweichung **0**, dazu 253 Elemente Geometrie ohne eine
einzige Abweichung).
- **Der Ring steht still** (`as-ring-quiet` an den fünf `st-sec`, gesetzt im JSX). Fünf wandernde
  Deckfarben-Bänder um Zahlenblöcke sind Bewegung ohne Aussage — derselbe Modifikator wie in Werkstatt,
  Baum, Leitfaden und Glossar (Regel 1). Damit trägt den laufenden Ring projektweit nur noch, wer nicht
  nachgezogen wurde.
- **EINE Kachelform für alles im Panel.** Der Screen hatte **fünf** Radien nebeneinander: 14 (Panel) ·
  14 (Kennzahl) · 12 (Rekordlauf) · 8 (Kästen) · 4 (Lauf-Zeilen). Jetzt tragen alle Inhaltskacheln 6 px
  wie im Baum; die PANELS behalten ihre 14 — sie sind der Rahmen, nicht der Inhalt.
- **Flache Haarlinien-Fassung statt gefüllter Kästen** (`.st-box`, Werte von `.up-stat`). Betroffen sind
  die acht `MENU_PANEL`-Kästen: fünf Kennzahlen, Score-Verlauf, Skills/Perks/Archetyp-Nutzung, die
  Auswertungszeilen und die zwei Hinweiskästen.
  - **Die Kennzahlen-Kacheln hatten ihre eigene Panel-Fassung** (#kpi-kacheln: Glasverlauf, Radius 14,
    Lichtkante). Sie ist ersatzlos in `.st-box` aufgegangen — `.st-kpis > div` setzt jetzt nur noch
    KPI-Eigenes (Polster, Ausrichtung, Schriftgrößen). Zwei Fassungen derselben Kachel wären genau die
    Doppelpflege aus Regel 2; ein Wächter hält fest, dass dort keine Fläche zurückkommt.
  - **`!important` an Fläche und Rahmen ist die Ausnahme mit Grund** (Regel 3, 9): die acht Kästen setzen
    `MENU_PANEL` **inline**, und die Konstante liegt in `modalStyle.jsx` — ein Parameter an der Quelle
    träfe jeden Menü-Screen des Spiels statt dieses einen. Denselben Weg ging `.st-kpis > div` schon.
- **Schließen wird Text-Knopf**, wie „Zurücksetzen/Schließen" im Baum (#up-ruhe): Werkzeug am Rand, kein
  Angebot. **Das Klickziel bleibt** — die 11/18 px Polster stehen in einer eigenen, früheren Regel und
  sind unangetastet; der Wächter prüft beides zusammen.
- **BEWUSST NICHT angefasst** (Regel 5, 6): das Gold der Kanten-Familie. Der Rekordlauf und die Zeile,
  die ihn hält, tragen es an der Linkskante — es ist das **einzige** Farbsignal des Screens („deine
  Bestmarke"), die übrigen neun Zeilen stehen neutral. Nur ihr RADIUS zieht mit, nicht ihre Kante.
  Ebenso unberührt: die Balken-Tracks der Pick-Raten und der Fraktionsbalken des Rekordlaufs — das sind
  Daten, keine Dekoration.
- Wächter: `test/st-ruhe.test.js` (10). Gegenprobe gemacht: **alle sieben** sabotierten Nähte fallen
  (Modifikator weg · ein Kasten ohne `st-box` · Radius zurückgedreht · Fläche ohne `!important` ·
  Schließen-Knopf wieder gefüllt · zweite Fassung an der KPI-Regel · Klickziel geschrumpft). Der alte
  #kpi-kacheln-Wächter in `test/desktop-perf.test.js` ist auf die neue Entscheidung UMGESCHRIEBEN, nicht
  gelöscht — die Farbregel („kein Deck-Ton an den fünf Kennzahlen") steht weiter dort und gilt jetzt für
  `.st-kpis > div` UND `.st-box`.
- **Nicht am Gerät gesehen** — headless im Produktionspfad gemessen und nachgerendert (1920×1080 und
  390×844, echte Komponente mit gesetzter Lauf-Historie).

### #graph-knapp — die zwei übrigen Score-Verläufe bekommen Zahlen (19.08.2026)
Gemeldet: „das in der Statistik ohne Beschriftung aussagelos" (Lauf-Details) und „same here, hier aber nur
minimal Beschriftung" (Trend-Kachel). #graph-achsen hatte die beschriftete Fassung im Victory-Screen
eingeführt — die zwei anderen Fundstellen DESSELBEN Graphen blieben bei der kompakten Linie und zeigten
zwei Kurven ohne einen einzigen Zahlenwert.
- **`axes` hat jetzt DREI Stufen** statt zwei (weiter EIN Schalter, keine zweite Komponente):
  `false` kompakte Linie (StatusRail) · `true` ausführlich (Victory + **Lauf-Details**, je ab 1400 px) ·
  **`"knapp"`** nur die Höhenmarken (Statistik-Trend).
- **Warum der Trend NICHT die volle Fassung bekommt, und das ist der eigentliche Punkt:** seine x-Achse
  zählt **LÄUFE, nicht Stiche**. Die volle Fassung würde sie mit „Stiche" beschriften (sie rechnet
  `(i+1)·GHOST_STEP`) und damit etwas Falsches behaupten. `"knapp"` beschriftet deshalb ausschließlich die
  Höhe — und genau die fehlte: ohne einen Zahlenwert sagt eine steigende Linie nur „irgendwie mehr".
- **Die Zahlen der knappen Fassung sind HTML, kein `<text>`** — der Grund, warum sie überhaupt eine eigene
  Stufe ist: die kompakte Linie streckt sich mit `preserveAspectRatio="none"` auf jede Kachelbreite, ein
  `<text>` darin würde mitverzerrt (dieselbe Falle, wegen der die volle Fassung ihr festes Seitenverhältnis
  hat). Waagerechte LINIEN verzerren nicht, die bleiben im SVG. Weil `viewBox="0 0 300 H"` mit der festen
  Höhe H 1 : 1 auf Pixel abbildet, sitzen die HTML-Marken exakt auf ihren Linien (dieselbe `y(v)`-Rechnung,
  keine zweite Formel daneben). Die Kachelhöhe ändert sich dadurch nicht.
- **Zwei Marken statt vier**: `niceStep(max/2)` statt `/3`. Auf 70 px Höhe stünden vier Linien als Schraffur.
- **Ein Höhendeckel musste weg**: `.rd-c4 > .rd-spark > svg` stand auf `height: 170px !important` — richtig
  für die gestreckte Linie, falsch für die beschriftete: die skaliert gleichmäßig und stand unter dem Deckel
  mittig mit leeren Rändern links und rechts (gemessen 917 × 170 statt 917 × 370), die Beschriftung halb so
  groß. Jetzt `height: auto`. `.rd-root` scrollt, der höhere Graph ist also erreichbar.
- **Merksatz**: ein fester Höhenwert an einem Sparkline-Container gehört zur KOMPAKTEN Fassung. Wer dort
  Achsen einschaltet, muss ihn mit aufheben — sonst sieht man nicht „zu klein", sondern „mittig in einem zu
  breiten Kasten", und sucht den Fehler in der Komponente.
- Wächter: `test/graph-labels.test.js` (sechs Sabotagen durchgespielt, alle fallen);
  `test/rahmen-huelle.test.js` ist nachgezogen — es pinnte `preserveAspectRatio={axes ? …}` und die Aussage
  „nur der Victory-Screen schaltet die Achsen ein".
- **Nicht am Gerät gesehen** — headless im Produktionsbuild mit einer gesetzten Lauf-Historie nachgerendert.

---

## #menu-rework — §2c ruling log (moved verbatim from `docs/engineering/conventions.md`, 2026-08-26)

The standing rules these rulings produced remain in `conventions.md` §2c — that document wins
on what the rule is; this record wins on why it exists. Moved as part of the health-check
harness reduction (`docs/workstreams/health-check/report.md`, cut C1). English preserved as
written.

### The planner's ruling at the freeze, 2026-08-24

The vocabulary above is **frozen**. Three decisions close it.

**1. The annex is closed, not open.** *Outside the ladder* is a complete list as of this freeze, not a
category anyone may add to. A screen that needs an entry which is not on it **stops and reports** —
the same rule as for a missing step, and for the same reason. An open annex beside a capped ladder is
the ladder's escape valve, and it would undo the cap within three screens.

**2. The two extensions the pilot proposed are ratified.** Both were raised rather than taken, which
is what the escape hatch is for:

| Extension | Ruling |
| --- | --- |
| `--sf-deck` · `--ed-deck-panel` | **Approved.** The deck-colour system predates this round and panels have to participate in it. Bounded by its own clause: rows inside a tinted panel stay neutral |
| `--ctl-*` (nine) | **Approved as a closed set of nine.** A control genuinely is not a panel — it pads against its label and carries state colour. `--ctl-*` is not an open prefix: those nine are the set |

**3. The two named gaps stay gaps — but ink gets a ratchet, not an axis.**

*Padding that is not a box inset* is correctly outside. Screen margins are layout and heading spacing
belongs to §2b. No action.

*Text colour* is the nearest extension and is **not taken in this round.** Opening a sixth axis after
the freeze is what the freeze exists to prevent. But seven literals on one screen become seventy
across eleven if nothing watches them — that is precisely how the 43 shadows happened. So:

> **`panel-tokens.test.js` counts ink literals per migrated file and fails on growth.**

A ratchet, not a vocabulary. It stops the spread without opening an axis mid-round, and it hands the
successor workstream a measured number instead of an impression. Implemented by M2a.

### The window is closed — the planner's second ruling, 2026-08-24

**M2a did not spend the extension window, and the planner accepts that reading.** The vocabulary is
closed for the rest of the round.

The workshop was chosen as the stress test precisely so this answer would mean something: 2128 lines,
a sticky head and 60 inline backgrounds against a ladder derived from a 362-line modal. It made the
case **role by role in its measurement record**, not as an assurance, and it named the request it
would have filed had the reading gone the other way. That is what makes "nothing was missing"
evidence rather than a claim.

**Two real gaps were named rather than taken. Both stay gaps, and one gains a ratchet.**

| ID | Gap | Ruling |
| --- | --- | --- |
| **MENU-38** | The neutral **translucent** edge — `rgba(150, 150, 170, …)` at **seven alphas** across 15+ rules, carried by the `.as-edge-*` role classes. Every edge in the ladder is opaque | **Not an axis. Ratcheted**, exactly as ink was. Taking one step of a seven-member family from inside one screen is a half-migration decided by a screen that can only see one member — and a half-migrated family is how the 43 shadows happened. `panel-tokens.test.js` counts translucent-edge literals per migrated file and fails on growth |
| **MENU-39** | The deck hairline written twice, with its two fallbacks mirrored | **Backlog.** A duplication, not a missing token. Nothing to add to the ladder; it collapses whenever someone touches both sites |

**Why not simply grant MENU-38.** It is the more tempting call, and it is wrong for the same reason
the cap exists. `.as-edge-*` has 143 call sites and is not migrated in this round. A token minted for
one of its seven alphas would sit in a frozen vocabulary carrying a value the workshop had no standing
to choose, and the eventual migration would have to either honour it or break it. The ratchet costs
nothing and hands the successor a measured number instead of an impression.

### The first *no*, and the threshold that answers it — 2026-08-24

M2b is the first screen to report that the vocabulary did **not** fully hold: **29 of 35 menu literals
had a step for their role, six did not.** Three state-colour pairs, a selection ring, a chip's label
padding.

**All six are ratcheted, none coined.** M2b had already applied the right shape without asking —
each is enumerated in `panel-tokens.test.js` (`stateLiterals`, `ELEV_EXEMPT`, `utilExempt`) with
counter-checks, so none can grow without someone editing a list. *Count it, do not coin it.*

| ID | Gap | Why not a token, now |
| --- | --- | --- |
| **MENU-46** | accent-tinted state pair | `--sf-deck` is 22/255 away **and in the wrong hue** — the row hard-codes violet while `--deck-a1` varies. The finding is that this screen does not participate in the deck system; a token would paper over it |
| **MENU-47** | unlock pair on the tier pills | 108/255 from `--ctl-edge`. It is a **signal, not chrome** — already covered by *meaning-coded borders* below |
| **MENU-48** | affirmative state pair | The strongest of the six. See the threshold |
| **MENU-50** | selection ring written as a shadow | `--el-glow-*` is reserved for the primary CTA by `#ruhe`. Spending it here would break the rule it exists to express. **Correctly refused** |
| **MENU-51** | chip label padding, `py-[3px]` | `--btn-pad-y` is five times over; Tailwind's neighbours are 2 px and 4 px. A genuine micro-gap with one sighting |

**The threshold, and it is the general rule from here on:**

> **A gap becomes a token on the third independent sighting, not the first.**

This is not caution for its own sake — it is §2c's own derivation principle applied to its own growth.
The steps in the ladder were **derived by counting call sites**; a token minted from one screen's need
is chosen, not derived, and the screen that chose it had no way to see the other ten. MENU-48 is the
case that makes this concrete: `--ctl-danger` + `--ctl-danger-wash` are the destructive pair and there
is no affirmative one, but transposing the recipe onto `--ac-green` lands **15/15/7 away** — so the
affirmative pair is not the same recipe in another hue, and nobody yet knows what it *is*. Two more
sightings would say.

**MENU-48 stands at one.** The ratchet bounds the cost until it reaches three or the round ends.

**What this admits.** `--ctl-*` was ratified as a closed set of nine, derived from Options — a screen
with destructive actions and no affirmative-state control. Closing a set on one screen's evidence is
what produced this asymmetry, and that was the planner's call, not a worker's. The threshold is the
correction: sets close on counting, and reopen on counting.

### MENU-38 re-measured — the family is twelve, and the ruling scoped it wrongly

*MH1, 2026-08-24, measuring before building the ratchet as its contract required.*

The freeze ruling said **seven** alphas. M2b found an eighth. The measurement says **twelve**, across
**64 literals**:

```
.07  .08  .10  .12  .13  .14  .16  .18  .22  .25  .30  .35
```

Four were unknown to both the ruling and to MENU-44: `.08` and `.30` in `index.css`, `.22` and `.25`
**inline in `StartScreen.jsx`**.

**Why the ruling was short, and it is not an arithmetic slip.** It scoped the family by
`.as-edge-*` — *the class that carries it*. The family is wider than the class. A value does not stop
being part of a family because it is written somewhere the family's usual class is not, and a ruling
that defines a set by its most visible carrier will always undercount it.

Two consequences:

- **The ratchet starts at 0 in all seven migrated units** — and that zero is an **achieved state**,
  not an absence. M2b pulled the workshop onto `--ed-quiet`. A later reader must not mistake the
  ratchet's floor for "there was never anything here".
- **`.22` and `.25` live in `StartScreen.jsx`**, which belongs to the mainscreen workstream, not to
  this round. Named there as an input rather than migrated from here.

**The threshold is unaffected.** Twelve sightings of a *family* is not twelve sightings of one gap;
the rule counts screens that miss the same step, and the translucent edge still belongs to whoever
migrates `.as-edge-*`. What changes is the number the successor inherits: **twelve, measured**, rather
than seven, inferred from a class name.

### One sub-1280 exception, granted and named — 2026-08-24

Owner decision 9 holds: this round changes nothing below 1280 px. **M3 has one exception, and it is
granted because it was declared rather than buried.**

`.up-root`'s sub-1280 scrim was the literal `#0c0c10ee`. M3 pointed it at `--sf-scrim`, which the
vocabulary already carries. **Measured delta: ≤ 1.8/255 — below perception on an overlay wash.**

**Why granted rather than reverted.** Reverting would leave the tree carrying a literal where every
sibling carries a token, which is the exact condition this round removes; and the change is smaller
than the noise floor of the eye, on a surface whose whole job is to be unnoticed. The mobile strand
inherits one fewer literal and no visible difference.

**Why it needed a ruling at all.** Because the rule is *nothing below 1280*, not *nothing visible
below 1280*. A worker who decides for itself which sub-threshold changes are small enough has
replaced the rule with its own judgement. M3 did not — it named the value, the delta and the reason,
and left the decision here. That is the shape any further exception must take, and there is no
standing permission: **the next one is asked for too.**

### The threshold meets the ink exclusion — and the threshold was counting the wrong thing

*M8's first planner question, 2026-08-24. The first case where two rules of this section point in
opposite directions, and a worker correctly refused to settle it.*

`color-mix(in srgb, var(--deck-a1) 62%, #ffffff)` — deck colour at reading brightness, as **text** —
was M3's first sighting, M7's second, M8's third.

| Rule | Says |
| --- | --- |
| *The first no* — the threshold | a gap becomes a token **on the third independent sighting** |
| *The planner's ruling at the freeze* | text colour is **not taken in this round** |

**Ruling: do not mint. And the reason is a correction to the threshold, not a win for the exclusion.**

M8 supplied the measurement that decides it: after its work, **the three screens read that value
through one shared rule** — `.st-eyebrow, .lb-eyebrow`. The cost of it remaining a literal is
**one call site, not three.**

**The threshold exists to stop a value spreading across call sites.** That is its whole purpose:
§2c's steps were *derived by counting call sites*, and a token minted from one screen's need is
chosen rather than derived. But here the spread was already collapsed — by a shared CSS rule, which
is the same collapse a token performs, reached by a different road. Minting would add a name for
something that occurs once.

**So the threshold is restated, and this is what it should have said from the start:**

> **A gap becomes a token on the third independent *call site*, not the third screen.**

Three screens behind one rule are one site. One screen writing a value in four places is four.
Counting screens was a proxy for counting spread, and a proxy is wrong exactly when someone does the
right thing for other reasons — which is what happened here.

**The ink exclusion is untouched by this** and keeps its own reason: opening a sixth axis mid-round is
what the freeze prevents. Had the count been three real sites, the two rules would genuinely have
collided and the answer would have been the owner's.

**Carried to the successor with its number:** the target-brightness mix is the ink axis's **first
named entry**, at one call site and three consumers. The ratchet keeps counting.

### `--sf-row` — the threshold fires, and the vocabulary grows once — 2026-08-25

*M9-F09. The first token added after the freeze, and the only one so far.*

M9 counted and reported instead of minting, which is what the closure requires of a **worker**. The
closure never barred the *planner* from acting on the threshold — those two rules govern different
people, and this is the first time that distinction has had to do any work.

**Measured before ruling, because the last count was taken from screens and was wrong for it:**

```
rgba(15, 15, 21, .72)   8 call sites, 4 screens
  index.css:4348, 4789, 4976, 5548, 5566, 5610      six rules, four of them !important
  FeedbackModal.jsx:38, UsernameModal.jsx:37        two JS constants, set inline
```

**Eight sites against a threshold of three.** Not a marginal case, and not ink — it is a **surface**,
which is the vocabulary's own domain, so the ink exclusion does not reach it.

**Three things make this a transcription rather than an invention:**

1. **`design-sprache.md` §1 already names it as *the* row surface.** The canon decided it is a role;
   §2c giving it a name records that decision rather than making one.
2. **Four of the eight sites carry `!important`**, and they carry it for the reason this round
   exists: `ROW_BG` is a JS constant set **inline**, so no stylesheet rule can reach it. That is H2
   and H5 exactly, on four screens, in a round created to remove them. Leaving it means shipping the
   disease the round was formed to cure.
3. **The value does not change.** `--sf-row: rgba(15, 15, 21, .72)` is what those eight sites already
   paint, so adopting it is value-preserving and provable at zero delta.

**This is not a second window.** A window is a worker's licence to add what it needs. This is the
planner acting on a rule that was written down before the case arose, on a count that was measured
rather than asserted, for a value the canon had already named. **A worker that finds a ninth gap
still stops and reports.**

**The migration is its own task** — `task-contract-MR1-row-ground.md`. It spans four screens that are
already approved, so it is value-preserving and gated at zero delta, and it removes four `!important`
on the way.

### The sub-1280 threshold, stated once instead of ruled three times — 2026-08-25

Three workers have now asked to convert a literal that is *almost* a token, on a value read below
1280 px. Deciding each on its own has worked, and it has also produced a precedent nobody could
predict from. **M5-F02 is the third, and it is the one that turns the practice into a rule.**

| Task | The delta | Ruling |
| --- | --- | --- |
| **M3** | scrim, **≤ 1.8/255**, no alpha change | granted |
| **M4** | scrim, **4/4/4 per channel + .02 alpha**, visible at every width | **refused** |
| **M5** | `#2a2a33` against `--ed-quiet` `#2a2a34` — **1/255, blue only**, eight sites | **granted** |

**The rule these three describe:**

> **A sub-1280 conversion is granted where the maximum per-channel delta is ≤ 2/255 and no alpha
> changes.** Above that, or where alpha moves, it is the owner's.

M5's is the smallest of the three — an order below perception — and it covers **the entire neutral
edge vocabulary of that file**. Refusing would leave eight literals standing in a migrated file,
precisely where this round's subject is.

M4's refusal stands on measurably different facts: more than double the channel delta, an alpha
change, and visible at every width on a screen with no approved design. **The distinction is a
number, not a mood.**

**What does *not* change: the worker still asks.** The threshold makes the answer predictable, not
automatic. A worker that applies it itself has replaced *"nothing below 1280"* with its own
arithmetic, which is what the original clause exists to prevent — and all three of these were found
*because* someone asked instead of taking. The rule shortens the answer; it does not remove the
question.

**Every grant is recorded with its number**, so the fourth case is decided against three measurements
rather than against a memory.

### The alpha clause — derived, not picked — 2026-08-25

**M11-F03 is the first pure-alpha case, and the rule above does not cover it.** `#0c0c10f2` against
`--sf-scrim-desk` `rgba(12, 12, 16, .94)`: **the colour is identical** and only the opacity moves, by
**Δα = 0.009**.

The `≤ 2/255 per channel` bound was **picked from three colour cases**. It has no authority over
alpha, and saying so is more useful than stretching it — *overlays differ in opacity more often than
in tone*, so the next strand meets this again.

**So alpha gets its own bound, and it is derived:**

> **Alpha, with the colour unchanged: Δα ≤ 0.01** — one percentage point of opacity.

**Why that number and not another.** A change of Δα moves the *composited* pixel by at most
`Δα × 255` — the full range — and that worst case only occurs against a **white** backdrop. At
Δα = 0.01 the bound is 2.55/255 in the worst case and **under 1/255 against the dark surfaces these
overlays actually cover.** So one percentage point of opacity is comparable to, and in practice
smaller than, the colour bound already in force.

**M11-F03 at Δα = 0.009 is granted.** M4's refused request moved alpha by **0.02** — twice this
clause — *and* moved colour by 4/255, so it stays refused under both halves.

**The colour bound is untouched at ≤ 2/255.** A clause was added; nothing was loosened. Four cases
have now been decided and none of the earlier three changes.

**And the worker still asks.** Two clauses do not make an entitlement — they make the answer
predictable, which is the point.

