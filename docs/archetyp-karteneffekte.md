# Archetyp-Karteneffekte (Pixi) — Design-Doc

> **Lebendes Dokument.** Läuft über mehrere Sessions. Wir designen **je Archetyp (Fraktion) einen
> Karten-Effekt**, umgesetzt in **Pixi.js**, und legen ihn zur Beurteilung auf das **Standard-Deck
> Prisma** als Referenz. Der User gibt je Effekt **„was & wann"** vor; hier wird spezifiziert,
> entschieden und der Umsetzungsstand protokolliert.

Stand: 2026-08-11 · Branch: `Autostich/pixi`

---

## 1. Ziel & Scope

- **Ein Karten-Effekt pro Archetyp** — die vier Fraktionen: **Blitz**, **Feuer**, **Eis**, **Pflanze**.
- **Alles in Pixi.js** (GPU-Bühne), kein neuer Canvas-2D-/DOM-Weg, sofern nicht bewusst entschieden.
- **Referenz-Deck: Prisma** (`deck_elementar`) — wir prototypen darauf, um die Effekte „in echt" zu sehen.
- Reihenfolge der Umsetzung: **Blitz → (danach nach Ansage)**.

Nicht-Ziel (vorerst): Balancing/Gameplay-Änderung. Die Effekte sind **visuell**; sie hängen an
bestehenden Spiel-Momenten (Sieg, Krit, Ladung …), ohne die Engine zu verändern.

---

## 2. Die vier Archetypen (Identität)

| Archetyp | id (`type`) | Icon | Glow-Farbe (`FACTION_GLOW`) | Gameplay-Kern | Bestehende Kartensignale |
|----------|-------------|------|------------------------------|---------------|---------------------------|
| **Blitz**   | `lightning` | ⚡ | `#cf9bff` (Lila) | Krit-/Ladungs-Archetyp (self-generierter Crit, Ionisierung) | Ionisierung: blauer 2px-Ring `#5ec8f0` + Pip-Track oben; Krit-Glow `CRIT_COLOR` |
| **Feuer**   | `fire`      | 🔥 | `#e0714a` (Warm) | Schmieden (eigene Karte +Wert) / Brandmarke (Gegner −Wert) | Schmiede-Inset-Bloom `#f0a83a`, Brand-Char-Saum von unten `#e0714a` |
| **Eis**     | `ice`       | ❄️ | `#5ec8f0` (Kalt) | Frost/Schichten | Frostbiss, Schicht-Marker |
| **Pflanze** | `plant`     | 🌿 | `#5ab87a` (Grün) | Wachstum → reife grüne Karten, Ausläufer | Wachstumsring, grüne Zahl/Saum, Ranke von links `#5ab87a` |

Quellen: `src/ui/FactionIcon.jsx` (Icons + `FACTION_GLOW`), `src/game/skills.js` (`archetype:"lightning"…`),
`src/ui/Card.jsx` (bestehende Kartensignale), `src/game/constants.js` (Blitz-Tuning-Block).

**Wichtig:** Fraktion ≠ Kartenfarbe. Karten haben **Suits** `R/B/G/Y` (`SUITS`); die Fraktionen sind
Gameplay-Identitäten (über Skills aktiv). Ein Karten-Effekt reagiert also auf **Spiel-Zustände**
(z. B. „diese Karte hat gerade kritisch getroffen"), nicht stumpf auf die Suit.

---

## 3. Referenz-Deck Prisma

- Pack/Theme: `elementar` → Deck `deck_elementar`, Battlefield `bf_elementar` (`src/game/themes.js`).
- Deckfarben: **a1 `#6cf0ff`**, **a2 `#ff6ac0`**.
- Freischaltung: alle vier Element-Decks frei (`allMonoArchetypes`). Für Dev/Preview via
  `unlockAllCosmetics` / Dev-Setup erreichbar.
- Zum Prototypen: Prisma als aktives Deck wählen und den jeweiligen Archetyp-Effekt darauf legen.

---

## 4. Technischer Rahmen (wo & wie mounten)

### 4.1 Layer-Stack im Battlefield-Panel (`src/ui/Battlefield.jsx`)
```
z0   Battlefield-Bild (Skin)
z1   Feld-Ambiente (Hologrid/Sternenfeld/Aurora/Glutfunken/Scanline/Vignette)
z2–3 Hintergrund-Effekt (AuroraGL) / Pixi-Bühne (PixiStage: embers/starfield)
z10  Karten (Card.jsx, DOM)
z21–22 Finisher / Prunk (auf der GEGNERkarte)
```

### 4.2 Pixi-Muster (bestehend)
- **`src/ui/fx/PixiStage.jsx`** — eine Pixi-`Application` als transparentes Overlay, `pointer-events:none`,
  `resizeTo: host`, DPR ≤ 2, Ticker pausiert im Hintergrund-Tab. Effekt-Registry `FIELD_FX` (key → Factory).
  Emitter-Contract: `{ setParams, erupt?, destroy }`. **Neue Effekte docken hier an** (bzw. an einer
  analogen Bühne).
- **`erupt({ sweepId, sweepDur, win, score, tier })`** wird je Stich-Wechsel ausgelöst (siehe `sweepId`-Effekt).
- Nur in **Preview/Dev-Build** gemountet (Prod bleibt Pixel-identisch) — Gate:
  `import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV`.

### 4.3 Effekt auf eine bestimmte Karte positionieren
- Finisher messen die **Gegnerkarte** über `oppSlotRef` relativ zu `panelRef`:
  `orr = oppSlotRef.current.getBoundingClientRect()` − `panelRef`-Rect → lokale x/y/w/h.
- **Eigene Karte hat aktuell KEINEN Slot-Ref.** Für Effekte auf der eigenen (Sieg-)Karte
  (z. B. Blitz) müssen wir einen **`playerSlotRef`** am eigenen `<Side>`-Wrapper ergänzen
  (analog `oppSlotRef` bei Zeile ~2023).

### 4.4 Trigger-Momente (Auswahl, die die Engine schon liefert)
- **Stich-Wechsel** (`sweepId`, `sweepDur`) — je aufgedecktem Stich.
- **Sieg / Niederlage** (`win`, `lost`), **Krit** (`isCrit`, `t.isCrit`), **Tier** (`hitTier`).
- **Wertdifferenz-Stufe** (1..4) für diff-gekoppelte Effekte (siehe Überladung/Zerstäubung).
- **Ionisierung / Ladung** (Blitz-State) — Kartendaten tragen `ionStacks`.

### 4.5 Offene technische Entscheidungen (global)
- [ ] Eine **eigene Pixi-Bühne für Karten-Effekte** (z. B. z-11, über den Karten) oder Wiederverwendung
  der bestehenden `PixiStage`? → Karten-Effekte müssen i. d. R. **vor** die Karten (z > 10).
- [ ] `playerSlotRef` ergänzen (für Effekte auf eigener Karte).
- [ ] `reduced`/`lite`-Verhalten je Effekt (Reduced-Motion: statisch/aus).
- [ ] Mobile-Perf-Budget (die jüngsten Commits drosseln bereits Blur/Aurora auf Mobile).

---

## 5. Effekt-Spezifikationen (je Archetyp)

> Vorlage je Effekt: **Was** (Optik) · **Wann** (Trigger) · **Wo** (Karte/Position/Layer) ·
> **Parameter** (Farbe/Dichte/Dauer) · **Reduced/Mobile** · **Umsetzungs-Notizen** · **Status**.

### 5.1 Blitz ⚡ (`lightning`) — Glow `#cf9bff` · Ion-Blau `#5ec8f0`

**Effekt A — „Ionensturm-Rahmen" (voll ionisierte Karte)**

- **Was:** Um den Kartenrahmen zucken **Blitze** — ein *bewegter* Blitzrahmen: gezackte Bogen-
  „Runner" wandern permanent an der Kartenkante entlang (mit hell-weißem Kern + farbigem Glow,
  additiv), dazu ein leises Dauer-Knistern der ganzen Kontur. **Ab und an springt ein Blitz quer
  über die Karte** (Cross-Arc, kurzer Flash mit gelegentlicher Gabelung).
- **Wann:** Sobald eine Karte **voll ionisiert** ist (`ionStacks >= ION_MAX_STACKS`, = **5**).
  Startort: **eigene Karte im Duell** (Battlefield), solange sie voll geladen & aufgedeckt ist.
- **Wo:** Panel-Overlay **über** den Karten (z > 10), positioniert auf die eigene Kartenbox
  (Ref am Karten-Wrapper), gemessen relativ zu `panelRef`. Eigener Pixi-`Application`-Layer
  (nicht die Feld-`PixiStage`, die z-3 hinter den Karten liegt).
- **Parameter (tunebar, Top des Moduls `TUNE`):** Farbe (Default Ion-Blau `#5ec8f0`, Kern Weiß;
  Blitz-Lila `#cf9bff` als Alternative), Runner-Anzahl/-Speed/-Span, Zacken-Amplitude,
  Reseed-Takt (Knister-Frequenz), Cross-Arc-Intervall/-Lebensdauer/-Gabel-Chance.
- **Reduced/Mobile:** `reduced` → **statischer** gezackter Glow-Rahmen, kein Zucken/keine
  Cross-Arcs (kein Flackern). Ticker läuft nur bei aktivem Voll-Ion & sichtbarem Tab (DPR ≤ 2).
- **Umsetzungs-Notizen:**
  - Neue Komponente `src/ui/fx/IonStorm.jsx` (Pixi `Application` + `Graphics`, additiver Blend).
    Prozeduraler Rounded-Rect-Perimeter-Sampler → gezackte Runner + Hum + Cross-Arcs; Jitter
    deterministisch per Hash (kein Per-Frame-RNG-Sturm).
  - Battlefield: `playerCardRef` am eigenen Karten-Wrapper ergänzt; `IonStorm` im Panel gemountet,
    `active = voll-ionisiert && aufgedeckt`. Gate wie `PixiStage`: nur Preview/Dev (Prod bleibt
    pixel-identisch, bis Rollout entschieden ist).
- **Status:** 🟢 v1 gebaut (Preview/Dev) — Feinschliff Look/Farbe nach Sichtung offen.

### 5.2 Feuer 🔥 (`fire`) — Flamme `#ff3d14` / Kern `#ffd9b0` / Glut `#ff6a1e`

**Effekt — „Brennender Kartenkopf" (Redesign; ersetzt die alte Deck-Seiten-Variante)**

- **Was:** Der **KOPF der eigenen Karte brennt** — eine verankerte, realistische **additive Partikel-
  Flammenlinie** lodert **oben ÜBER dem Rahmen** nach oben (heißer Kern warmweiß → rote Flamme,
  vertikal gestreckt, Sway + Neigung zur Mitte). Eine **Brennlinie** am oberen Rand hält das Feuer
  zusammen; ein **dezentes warmes Kanten-Glühen** leuchtet auf die Karte (kein Scorch/keine
  Verkohlung — bewusst verworfen). Optional Rauch. **Weniger gelb**, rötlich-realistisch.
- **Wann:** **Hitze** (0..1) blendet zwischen **vier abgestimmten Phasen (20/50/80/100 %)** über —
  die **Form bleibt gleich, nur die Intensität skaliert** (niedrig = Kante glimmt/fängt an zu
  brennen, voll = lodert hoch). Unter 20 % aus 0 eingeblendet. Quelle = **Hitzeleiste**
  (`state.heat.value / state.heat.max`, nur bei `heat.active` = Feuer-Builds).
- **⚠️ Platzierung (final):** auf der **gespielten eigenen Karte** (Kopf/oberer Rand), NICHT auf
  dem Deck (die alte „unter der Karte"-Variante wirkte komisch → verworfen). Beim Abwerfen
  (`flyAway`) → Hitze 0 (kein hängendes Feuer); dazu `isConnected`/Off-Panel-Guards wie IonStorm.
- **Wo:** Eigener Pixi-`Application`-Layer **ÜBER den Karten (z-12)**, positioniert auf die eigene
  Kartenbox (`playerCardRef`) relativ zu `panelRef`. Getrennt vom Blitz-Layer (z-11) → alle vier
  Effekte koexistieren.
- **Abgesegnete Phasen (2026-08-11, aus dem Feuer-Phasen-Board) — siehe `FIRE_PHASES` in
  `FireHead.jsx`:** je Phase Farben + `FLAME_RATE/RISE/H/SPREAD/SWAY/SIZE/LIFE/LEAN` +
  `GLOW_DOWN/GLOW_ALPHA/SMOKE`; dazwischen **linear interpoliert** (`paramsAt(h)`).
- **Reduced/Mobile:** Ticker nur bei Hitze > 0 & sichtbarem Tab; DPR ≤ 2; Partikel-Pool gedeckelt
  (`MAX=700`). (Explizites reduced-Verhalten optional nachrüstbar.)
- **Umsetzung (erledigt):** `src/ui/fx/FireHead.jsx` (Pixi: `ParticleContainer` Flammen + Glüh-/
  Brennlinien-Sprites + Rauch, Phasen-Interpolation). Alte `src/ui/fx/FireBurn.jsx` **gelöscht**,
  Deck-`slotRef` an `Side` **zurückgebaut**. Mount in Battlefield auf `playerCardRef`, Hitze aus der
  Hitzeleiste, `flyAway`→0. Dev-Sicht `?fireheat=<0..1>`. Gate Preview/Dev (Prod pixel-identisch).
- **Status:** 🟢 **Look + Phasen abgesegnet, in-game verdrahtet** (Kopf über dem Rahmen,
  Phasen-Interpolation aus der Hitzeleiste).

### 5.3 Eis ❄️ (`ice`) — Glow `#5ec8f0`
- **Status:** ⚪ Noch nicht dran

### 5.4 Pflanze 🌿 (`plant`) — Glow `#5ab87a`

**Effekt — „Moos-Wuchs" (realistisches Moos, wächst mit dem Wachstum zu)**

- **Was:** **Echtes, realistisches Moos** (bewusst KEIN Comic-Grün) überwächst die Karte. Look entsteht
  NICHT durch eine grüne Fläche, sondern durch **tausende winzige Härchen (Filamente)** in gedämpften
  **Oliv-/Waldgrüns**: dunkle **Schatten-Matte** unter den Büscheln (Tiefe/AO), gerichtetes Licht
  (oben-links) auf den Spitzen, **samtige Körnung** (feine Punkte), **fransiger Wuchsrand** (kein
  glatter Schnitt) und vereinzelte bräunliche **Sporophyten** (Stängel + Kapsel — das typische
  Moos-Detail). Optional langsam funkelndes **Tau**.
- **Wann / Wachstums-Quelle (GEKLÄRT):** Kopplung an das **Pflanzen-Wachstum** der Karte. Aus dem
  Code (`src/game/constants.js:377` + `src/game/skills.js:442` `growthRipe`): eine Karte wird ab
  **`PLANT_GREEN_THRESHOLD = 8` Wachstum** dauerhaft **grün = reif**. Darunter (Wachstum 1–7) ist sie
  **Setzling**, bei 0 nichts. Wachstum steigt je Sieg um `growInc = min(1, Pflanze-Skills/PLANT_GROWTH_SKILL_REF)`
  (`engine.js:491`), also **+1/Sieg bei vollem Fokus → 8 Siege bis reif**.
  **Mapping Effekt:** `coverage g = clamp(growth / PLANT_GREEN_THRESHOLD)` → **reif (Wachstum 8) = 100 %**
  volle Moos-Abdeckung. Diskrete Stufen 0…8 (der Reifestufen-Simulator im Prototyp spiegelt genau das).
  Das Moos wächst **von oben & den beiden Seiten** nach **innen/unten** zu. **Akkretion statt
  Neu-Würfeln:** festes `birthG` je Büschel; steigt Wachstum, kommen neue dazu, bestehende **bleiben**
  und reifen nur nach (`maturity = clamp((g - birthG)/0.22)`) — deterministisch (seeded RNG).
- **Wo:** Auf der eigenen (Pflanze-)Karte, Overlay über der Karte. Halme dürfen oben/seitlich **ein
  bisschen über die Kartenkante** wachsen (`OVERHANG`, dezent). In-Game analog IonStorm/FireHead auf
  `playerCardRef`, Gate Preview/Dev.
- **⚠️ Layer-Reihenfolge (User-Vorgabe):** Der **Blitz-Rahmen (IonStorm) muss ÜBER dem Moos-Effekt
  liegen** — Moos also unter IonStorm mounten (z. B. Moos z-10.5, IonStorm z-11 wie gehabt), damit der
  Ionensturm-Rahmen auf einer voll-ionisierten **und** bemoosten Karte sichtbar bleibt.
- **Algorithmus (Prototyp Canvas-2D, → Pixi portierbar):**
  1. **Feld-Aufbau** (`buildField`, seeded `mulberry32`): jittered Grid (Abstand aus `DENSITY`), je
     Büschel `birthG = clamp( max(fromEdge/maxInward, dTop/maxDown) + RAGGED·(fbm-0.5)·0.7 )`, wobei
     `maxInward=CW·(0.30+0.55·EDGE_BAND)`, `maxDown=CH·(0.80+0.80·(1-TOP_BIAS))`. Ausrichtung `ang`
     = überwiegend nach oben, an Seiten leicht nach innen gefächert; zusätzlich `outAng`
     (Auswärts-Richtung zum nächsten Rand) + `edgeOut` (Rand-Nähe) für Überwuchs, `tuftJit`, `size`
     (aus `CLUMP`), `hue` (Farbvariation).
  2. **Render in 3 Pässen** in ein Offscreen-Bitmap mit `M=20`px Rand (Überwuchs), nur neu gezeichnet
     wenn Wachstum/Parameter sich ändern (Cache): (1) Schatten-Matte, (2) **Härchen** (kurze
     Quadratic-Curves; Farbe Mitte→Spitze, Richtungslicht, Spitze-heller), (3) Sporophyten. Blit auf
     die Karte, **Rand vor dem Moos** gezeichnet (Halme wachsen drüber); Clip = leicht **erweitertes**
     RoundRect (`grow = M·OVERHANG`). **Tau** live additiv über dem Bitmap.
  3. **Neigung/Streuung:** Halmwinkel `a = ang + TILT + tuftJit·spread·0.6 + (rng-0.5)·spread`,
     `spread = 0.2 + SPREAD·2.1`. **Überwuchs:** Basis-Origin um `edgeOut·OVERHANG·3.5` nach außen,
     Länge ×`(1+edgeOut·OVERHANG·0.7)`.
- **Parameter (`TUNE`, ABGESEGNET @ reif/Stufe 8):**
  ```js
  const TUNE = {
    MOSS_DARK: "#24361a", MOSS_MID: "#4a6b2c", MOSS_TIP: "#8aa84e", SPORO_COLOR: "#9a6a34",

    EDGE_BAND: 0.26, TOP_BIAS: 0.52, DENSITY: 1, CLUMP: 0, RAGGED: 1, OVERHANG: 1,

    FILA_PER: 16, FILA_LEN: 3.5, FILA_THICK: 1.2, TILT: 12, SPREAD: 0.94, TIP_LIGHT: 0, SPECK: 0,

    SPOROPHYTE: 0, SHADOW: 0, DEW: 0,
  };
  ```
  (Wachstum selbst ist **Zustand** (0…8 → coverage 0…1), kein TUNE-Wert. Kurzes, dichtes Moos ohne
  Sporophyten/Tau/Körnung; leicht geneigt, stark gestreut, wächst voll über die Kante.)
- **Reduced/Mobile:** Moos ist **statisch** (Bitmap-Cache) → günstig; nur Tau animiert (abschaltbar via
  `DEW=0`). In-Game reduced → Tau aus, evtl. `DENSITY`/`FILA_PER` gedeckelt.
- **Prototyp:** `docs/prototypes/moos-tuning.html` — jetzt **Reifestufen-Simulator**: diskreter Regler
  **Wachstum 0…8** (Setzling → Reif) statt Continuous-Slider, Auto-Wachsen stept die Stufen, HUD zeigt
  Stufe/Zustand; Werte auf den abgesegneten TUNE gesetzt (bei Stufe 8 = reif steht der finale Look).
  Alle Tuning-Regler bleiben zum Nachjustieren, kopierbarer TUNE-Block. Look vom User als
  „pretty genius" abgesegnet.
- **Umsetzung (offen):** `src/ui/fx/MossGrow.jsx` (Pixi: Filamente als vorgerenderte **Sprites** gebacken
  + geblittet — vgl. FrostIce-Perf-Ansatz; Akkretion über `birthG`-Schwelle). Wachstum aus der Karte
  ziehen: `coverage = clamp(growth / PLANT_GREEN_THRESHOLD)`. **Unter** dem IonStorm-Layer mounten.
- **Status:** 🟢 **Design fertig** — Look + abgesegnete Werte + Wachstums-Quelle (Reifestufen 0…8) geklärt,
  Reifestufen-Simulator gebaut. Offen nur noch die Pixi-Umsetzung.

### 5.5 Extra — „Regen & Pool" (Wasser, Prototyp) 💧

- **Was:** Realistischer **Regen**, der sich am Boden **poolt**: Regen-Streaks in **Tiefen-Ebenen**
  (nah lang/hell, fern kurz/dunkel), **Aufschlag-Spritzer + Ripple-Ringe** auf der Oberfläche, und ein
  steigender, leicht transparenter **Wasserkörper** mit welliger Oberfläche, Glanz, Schaumkante &
  dezenter Spiegelung. **Perspektive/Tiefe (`DEPTH`):** die Wasserfläche kippt von der flachen
  Seitenansicht auf zu einer **nach hinten in die Szene laufenden Ebene**; Regen schlägt dann über die
  ganze Tiefe auf (ferne Tropfen weiter hinten/oben).
- **Wann/Wo:** **Noch offen** — welcher Archetyp/Trigger (naheliegend **Eis**/Frost-nah oder ein
  Feld-Effekt) und ob **in der Karte** oder im **Feld darunter**. Füllstand = Zustand, kein TUNE-Wert.
- **Algorithmus:** Regen-Partikel (depth-layered, `spawnDrop`); Aufschlag → `spawnSplash` +
  `spawnRipple`; Wasserkörper = Front-Wand (vertikale Säule, Gradient SURF→DEEP) + Oberflächen-Plane
  (Band zwischen `frontY`/`backY`, `backBase = waterTop - span`, `span = DEPTH·CH·0.5`); Ripple-Ringe
  als Ellipsen mit Foreshortening `ratio = 0.12 + 0.5·DEPTH`; Reflexions-Säulen additiv; Glanz/Schaum
  an der vorderen Wasserlinie. Alles auf Karten-RoundRect geclippt.
- **Parameter (`TUNE`, Default-Board-Werte):**
  ```js
  const TUNE = {
    RAIN_COLOR: "#bcd8ee", DEEP: "#0b3550", SURF: "#57b8e0",

    RAIN_RATE: 420, RAIN_SPEED: 900, RAIN_ANGLE: 0.14, RAIN_LEN: 20, RAIN_THICK: 1.4, RAIN_ALPHA: 0.5,

    SPLASH: 6, SPLASH_SIZE: 1.6, RIPPLE_LIFE: 900, RIPPLE_MAXR: 26, RIPPLE_ALPHA: 0.5,

    DEPTH: 0.35, W_OPACITY: 0.62, WAVE_AMP: 3.5, WAVE_SPEED: 1.0, SURF_GLINT: 0.6, REFLECT: 0.4, FOAM: 0.5,
  };
  ```
- **Prototyp:** `docs/prototypes/wasser-tuning.html` (Canvas-2D-Tuning-Board, Füllstand + Tiefe/3D +
  alle Regler, kopierbarer TUNE-Block). → Pixi-Ziel `src/ui/fx/RainPool.jsx`.
- **Status:** 🟡 **Prototyp/Look gesichert** — Platzierung (Archetyp/Trigger, Karte vs. Feld) + Pixi
  offen. **Nicht gepusht.**

---

## 6. Entscheidungs-Log
- 2026-08-11 · Doc angelegt; Referenz-Deck = Prisma; Reihenfolge startet mit Blitz; alles in Pixi.
- 2026-08-11 · Blitz „Ionensturm-Rahmen" & Feuer „Brennender Kartenkopf" gebaut/abgesegnet (Preview/Dev).
- 2026-08-12 · Pflanze „Moos-Wuchs" Look + Tuning-Board abgesegnet („pretty genius"); Neigung/Streuung/
  Überwuchs ergänzt. Als Design gesichert (Prototyp-HTML im Repo). **Wachstums-Quelle in-game offen.**
- 2026-08-12 · Zusätzlich „Regen & Pool" (Wasser) mit Tiefe/3D als Prototyp gesichert; Platzierung offen.

## 7. Session-Log
- **2026-08-11:** Codebase sondiert (Fraktionen/Icons, Prisma-Deck, PixiStage-Muster, Finisher-
  Positionierung, Layer-Stack). Doc-Gerüst erstellt. Nächster Schritt: Blitz-Spec vom User.
- **2026-08-12:** Pflanze-Moos designt & getunt (realistische Filamente, Akkretion via `birthG`,
  Sporophyten, Neigung/Streuung/Überwuchs). Wasser/Regen-Pool-Prototyp inkl. Perspektive/Tiefe.
  Beide Prototyp-HTMLs unter `docs/prototypes/` abgelegt, Specs + Default-`TUNE` in §5.4/§5.5.
  Design-Sicherung (kein Push ohne Freigabe).
</content>
</invoke>
