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

### 5.2 Feuer 🔥 (`fire`) — Glow `#e0714a`
- **Status:** ⚪ Noch nicht dran

### 5.3 Eis ❄️ (`ice`) — Glow `#5ec8f0`
- **Status:** ⚪ Noch nicht dran

### 5.4 Pflanze 🌿 (`plant`) — Glow `#5ab87a`
- **Status:** ⚪ Noch nicht dran

---

## 6. Entscheidungs-Log
- 2026-08-11 · Doc angelegt; Referenz-Deck = Prisma; Reihenfolge startet mit Blitz; alles in Pixi.

## 7. Session-Log
- **2026-08-11:** Codebase sondiert (Fraktionen/Icons, Prisma-Deck, PixiStage-Muster, Finisher-
  Positionierung, Layer-Stack). Doc-Gerüst erstellt. Nächster Schritt: Blitz-Spec vom User.
</content>
</invoke>
