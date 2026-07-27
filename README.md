# Autostich — Gesamtübersicht

> **Roguelite-Autobattler-Stechspiel** (Prototyp, Vite + React).
> Eigenes Repo `GitGudMonkeh/autostich`, Deploy auf GitHub Pages unter `/autostich/`.
> UI-Text **Deutsch**, Code-Identifier **Englisch**.
>
> Stand: Prototyp, V2-Systeme (Runden/Stats/Skills/Formationen/Shop) + 4-Stufen-Raritätsfamilien.
> **586 Vitest-Fälle**, CI grün (Tests → Build → Pages).
> Diese Übersicht ist **aus dem Code abgeleitet** — die Quelle der Wahrheit bleibt der Code
> (`src/game/*`). Bei Unstimmigkeit gilt der Code, nicht dieses Dokument.

---

## 1. Kernidee

Ein **Stechspiel ohne Spielerentscheidung im Kampf**: In jedem *Stich* deckt deine Seite und die
Gegnerseite automatisch die nächste Karte auf, die **höhere Zahl gewinnt**. Du steuerst nicht *welche*
Karte du spielst — du baust **zwischen** den Durchläufen einen Build, der dein Deck und deine Stiche
dauerhaft stärker macht.

```
Stiche auto-auflösen → Durchlauf-Ende → eine Entscheidung (Stat · Perk · Skill · Formation · Shop)
→ Build/Aufstellung werden stärker → nächster Durchlauf … über genau MAX_CYCLES Runden → Ende.
```

**Ziel:** möglichst hoher **Score** über den festen Lauf. **Kein Leben, kein Tod durch Schaden** —
der Lauf hat eine feste Länge (`MAX_CYCLES = 44` Deck-Durchläufe), danach Game Over. Der Reiz liegt im
*Bauen während des Laufs* — Deckwerte, Kartenrollen, Formationsaufstellung, Archetyp-Skills und Shop.

**Design-Pointe:** Kartenwerte dürfen **über 10 hinaus** wachsen (`VALUE_CAP = null`) — ab Wert 11
überbietet deine Karte jede mögliche Gegnerkarte (Gegner-Maximum ist 10). Farbe ist im reinen Wert­vergleich
kosmetisch, wird aber über **Formationen** (Farbblock), Farb-Perks und Archetypen mechanisch relevant.

---

## 2. Deck & Karten

- **40 Karten** = 4 Farben × 10 Werte (**1–10**), `TRICKS_PER_CYCLE = 40` daraus abgeleitet. Beide Seiten
  haben je ein eigenes 40er-Deck.
- Farben (`SUIT_ORDER = ["R","B","G","Y"]`): **Rot · Blau · Grün · Gelb**.
- **Kartenobjekt:** `{ id, suit, baseRank, value }` — `value` = aktueller Kampfwert (durch Deck-Effekte
  dauerhaft veränderbar), `baseRank` = Ursprungswert (Anzeige; der Boost ist `value − baseRank`).
- **Spieler-Reihenfolge ist persistent** über den ganzen Lauf (sie ist das Aufstellungs-Objekt der
  Formationsphase); nur das **Gegnerdeck wird pro Durchlauf neu gemischt**. Zu Lauf-Beginn wird die
  Start-Reihenfolge so gemischt, dass ihr Formations-Potential im Band `[FORMATION_START_MIN,
  FORMATION_START_MAX]` liegt (gleichmäßigere Runs).

---

## 3. Spielablauf & Phasen

Ein **reiner Reducer** (`src/game/reducer.js`) treibt `state.phase`; die Stich-Auflösung liegt in
`engine.js` (`resolveTrick`, pure). Nach jedem Durchlauf steht **genau eine Entscheidung** an, deren Typ
der feste **Entscheidungsplan** `DECISION_SCHEDULE` (44 Einträge) vorgibt.

| Phase | Bedeutung |
|---|---|
| `menu` | Startbildschirm (`StartScreen`): „Neuer Run", lokale + globale Bestenliste. |
| `play` | Der Autobattler läuft: Stich für Stich, auto-getaktet. |
| `levelup` | Auswahl-Overlay — je nach Plan **Perk** (`PerkSelect`), **Stat** (`StatSelect`) oder **Skill** (`SkillSelect`); pausiert. |
| `formation` | **Formationsphase** (`FormationPhase`, §22.8): Karten der Aufstellung tauschen. |
| `shop` | **Shop** (`ShopScreen`): Münzen ausgeben (Karten · Anker · Formationen · Planung). |
| `gameover` | Nach `MAX_CYCLES` Durchläufen: Endbildschirm (`GameOver`) mit Score, Statistik, Bestenliste. |

**Entscheidungsplan** (`DECISION_SCHEDULE`, Shop-Spec §2.2): fester 44-Einträge-Plan statt eines Zyklus —
Verteilung **11 Stat · 11 Perk · 8 Formation · 8 Shop · 6 Skill**. Ziel-Flows (Karten/Positionen/Farben
wählen) laufen als Unter-Overlays von Perk-/Shop-Auswahl (`CONFIRM_TARGET`, `SHOP_TARGET_*`, `FAMILY_TARGET_*`).

**Actions (Auszug):** `START_RUN`/`RESET`, `TO_MENU`, `END_RUN`, `RESOLVE_TRICK` (ein Stich; `action.rng`
wird an `resolveTrick` gereicht), `PICK_PERK`/`PICK_FAMILY`, `PICK_STAT`, `PICK_SKILL`/`DECLINE_SKILL`,
`REROLL_PERK`/`REROLL_SKILL`, `SWAP_CARDS`/`UNDO_SWAP`/`RESET_FORMATION`/`CONFIRM_FORMATION`, `BUY_ITEM`,
`LEAVE_SHOP`.

**Determinismus-Invariante:** der `game/`-Layer nutzt **nie** `Math.random`/`Date`. Zufall kommt als
**Action-Payload** (`rng`) aus `App.jsx` herein. `makeRng(seed)` (mulberry32) existiert für reproduzierbare
Sim/Test-Läufe.

---

## 4. Stich-Auflösung (`engine.js` · `resolveTrick`)

Pro Stich wird je Seite die nächste Karte gezogen und der **Zahlenwert** verglichen. `pos` ist der
Stich-Index des Durchlaufs, `actualPos` die zugehörige **Deckposition** — unter einem **Zeitsegment**
(Shop) weichen beide ab; positionsgebundene Effekte nutzen `actualPos`.

1. **Spielerwert** = `card.value` + alle Wert-Boni des Stichs (Perk-`cardBonus`, Kartenrollen, Anker,
   Archetyp-Effekte).
2. **Gegnerwert** = `card.value` (neutral).
3. **Vergleich:** höher → **Sieg**, niedriger → **Niederlage**, gleich → **Gleichstand** (kein Score),
   außer eine Initiative-Armierung wertet den Gleichstand als Sieg (`win_tie`).

**Score bei Sieg** (fraktional, zur Anzeige gerundet):

```
scoreVorCrit = SCORE_PER_WIN
             × streakBaseMult(Serie) × statStreakFactor(Serien-Stat, Serie)   ← Serie (Basis + Stat, gedeckelt)
             × Π Perk-scoreMult
             × formationMult × statFormFactor(Form-Stat, hatFormation)         ← Formation (Layout + Stat)
             + Σ Flats (Anker · Feuer-Score · Ionisierung · Perk-scoreFlat)
score       = scoreVorCrit × (Crit ? critMultiplier : 1)
```

**Crit:** nur bei Sieg. Crit-Chance kommt aus dem **Crit-Chance-Stat** + **Blitz-Skills** (+ Anker/Perks),
auf 100 % gedeckelt; Überschuss > 100 % speist Sonderregeln (Überschusskrit, Kettenreaktion). Crit-Faktor =
`CRIT_BASE_MULT (1,5)` + Crit-Mult-Stat + Legendär-Boni. Über den injizierten `rng` gewürfelt → deterministisch.

> **`initiative`** wird geführt/angezeigt, hat aber aktuell **keinen** mechanischen Effekt (Reserve).

---

## 5. Deck-Durchlauf (Cycle) & Score

- Nach **40 Stichen** ist ein Durchlauf voll: `cycle += 1`, Rundenscore-Tracking (`lastCycleScore`), dann
  die anstehende **Entscheidung** (`DECISION_SCHEDULE[cycle]`). Neu gemischt wird das **Gegnerdeck** beim
  Übergang in den nächsten `play`.
- **Basis-Siegesserie (#39):** jede Serie hebt den Score-Mult um `STREAK_BASE_STEP (+2 %)`/Stufe, gedeckelt
  bei `STREAK_BASE_CAP (+150 %)`. Der **Serien-Stat** (`statStreakMult`, +2 %/Serienpunkt je Pick) legt
  darauf, **gedeckelt bei `STREAK_STAT_CAP (+300 %)`** (Balance-Pass gegen Runaway).
- Der Lauf endet nach `MAX_CYCLES` Durchläufen — **nicht** durch Verluste.

---

## 6. Stats (V2 §22.3) — `stats.js`

Bei einer **Stat-Runde** werden **immer alle** angeboten; du wählst einen. Additiv, keine Caps
(außer dem Serien-Faktor-Deckel oben), beliebig oft wählbar. Beschreibungen ziehen ihre Zahlen aus den
Konstanten (kein Text↔Code-Drift, `docs/desc-check.md`).

| Stat | Feld | Schritt/Pick |
|---|---|---|
| Crit-Chance | `statCritChance` | `STAT_CRIT_CHANCE_STEP` (+7 pp) |
| Crit-Multiplikator | `statCritMult` | `STAT_CRIT_MULT_STEP` (+0,25× auf Basis 1,5×) |
| Formations-Multiplikator | `statFormMult` | `STAT_FORM_MULT_STEP` (+5 % bei aktiver Formation, max 1×/Stich) |
| Serien-Multiplikator | `statStreakMult` | `STAT_STREAK_MULT_STEP` (+2 % je Serienpunkt) |
| Einkommen | `economyStatLevel` | `STAT_ECONOMY_STEP` (+1 Level → +`SHOP_INCOME_PER_LEVEL` Münzen/Shop) |

---

## 7. Formationen (§22.7) — `formations.js`

Aus der **persistenten Reihenfolge** + den **Dauerwerten** wird je Position ein Formations-Multiplikator
berechnet. Basis-Formationen sind **segmentgebunden** (`SEGMENT_SIZE = 5`): ein Lauf endet an jeder
Segmentgrenze (Rollen/Werkzeuge/Shop können Grenzen öffnen).

- **Wiederholung** (≥2 gleiche Werte): 2.→×1,25, 3.→×1,50, 4.→×1,80, danach je +0,40 (kein Cap).
- **Farbblock** (≥3 gleiche Farbe): ab der 3. ×1,35, je weitere +0,20.
- **Treppe** (≥3 streng steigend, Schritt ≤3): ab der 3. ×1,35, je weitere +0,20.
- **Wechsel** (≥3 Zick-Zack, Nachbardiff ≥5): ab der 3. ×1,40, je weitere +0,20.
- **Anker**: einzelne Position zählt als Formation ×1,25 (Familien-Anker E_LOSS/E_QUICKSHOT, Eisanker,
  Shop-Formationsanker).
- **Überlappung** (`OVERLAP_BONUS`): steckt eine Karte in mehreren Formationen, multipliziert der Bonus
  das Faktor-Produkt zusätzlich — **2 → ×1,5 · 3 → ×2 · 4 → ×3**.
- **Meta-Faktoren** (nach der Überlappung): **Nachhall** (Shop) trägt den stärksten Endfaktor auf die
  Folgekarte(n); **Formationskern** (Shop) hebt einen gewählten Typ zusätzlich (`FORMATION_CORE_FACTOR`).

**Formationsphase (§22.8, `FormationPhase`):** pausiert den Lauf; je Phase `FORMATION_ENERGY = 4` Energie;
ein beliebiger Tausch zweier Karten kostet 1 (Eis-Frosttausch ggf. gratis). Formationen werden nach jedem
Tausch live neu berechnet; Undo/Reset erstatten Energie.

---

## 8. Perks — 4-Stufen-Familien (`families.js`) + Legendäre (`perks.js`)

Der reguläre Perk-Pool ist in **aufwertbare Familien** (Stufen **I–IV**) migriert (Rarität-Epic #167). Ein
Angebotseintrag ist entweder ein flacher `perkId` (Legendäre) oder `{ familyId, tier }`. Gewichtung über
`TIER_WEIGHTS`/`RARITY_WEIGHTS`; `buildPerkOffer` zieht deterministisch über den `rng`, eine Familie
höchstens einmal je Angebot. `PERKS_OFFERED = 3`, kein Level-Gate (nur Gewicht), höchstens
`MAX_LEGENDARIES_PER_OFFER = 1` Legendäres.

| Kat. | Thema | Upgrade-Typ | Familien (Beispiele) |
|---|---|---|---|
| **A** | Deck (dauerhafte Werte) | kumulativ | Gerade/Ungerade Stärke, Farbverstärkung, Spitzenförderung, Farbduell, Verdichtung … |
| **B** | Stich-Effekte | Ersetzung | Gegenangriff, Momentum, Starker Auftakt, Initiative, Durchbruch, Revanche, Überzahl … |
| **C** | Kartenrollen | Rolle/Ersetzung/kumulativ | Vorhut, Triumph, Leibwache, Staffelläufer, Anführer, Finisher, Joker, Bindeglied, Opfergabe … |
| **D** | Score & Crit | Ersetzung | Punktebonus, Siegesserie, Hohe/Niedrige Karten, Übermacht, Präzision, Fehlzündung, Volles Haus, Überschusskrit … |
| **E** | Formationswerkzeuge | Ersetzung | Schrittmacher, Farbbrücke, Sanfter Anstieg, Großer Schritt, Pendelwerk, Anker (Kontrollverlust/Schnellschuss), Segmentarbeit … |

**Legendäre (`PERK_DEFS`, `rarity: "legendary"`):** L1 Überladung · L2 Unaufhaltsam · L3 Letztes Aufbäumen ·
L4 Kritische Masse · L5 Jackpot · L6 Raserei · L8 Schicksalsmaschine · L9 Blutvertrag · L10 Kettenreaktion ·
L11 Zeitraffer (mächtig, teils mit Nachteil; kein Leben mehr → reine Wert-/Score-/Crit-Motoren).

---

## 9. Skills & Archetypen (#93/#165) — `skills.js`

Auf **Skill-Runden** wählst du aus **`SKILLS_OFFERED = 6`** Skills (2+2+2 über alle drei Archetypen,
`MAX_ARCHETYPES = 3`), bis zu **`SKILL_SLOTS = 4`** gleichzeitig. Ein expliziter Legendär-Wurf
(`SKILL_LEGENDARY_BASE` + Shop-Bonus) kann genau einen legendären Skill einsetzen.

- **⚡ Blitz** — Ladung/Ionisierung/Crit: Ladung sammeln (`LIGHTNING_MAX_CHARGE`), Karten ionisieren
  (`ION_*` → +Score je Stapel), Gewitterfront/Reaktoren, Legendäre (Donnergott u. a.). Positionsgebundene
  Effekte (Leitfähigkeit/Ionisierung) lesen `actualPos` (korrekt unter Zeitsegment).
- **🔥 Feuer** — Hitzeleiste 0–`HEAT_MAX`: belohnt totale Überlegenheit mit Feuer-Flat-Score
  (`FIRE_SCORE_*`); Konsumenten (Flächenbrand/Schmelzpunkt) tauschen Hitze gegen große Boni; Legendäre
  (Phönixfeuer/Sonnenkern).
- **❄ Eis** — Kontroll-/Aufstellungs-Archetyp: eigene Karten **einfrieren** (`ICE_BASE_FREEZE`), Eisanker,
  Formations-Wildcards (Eisschritt/Kristallform/Frostbrücke), Permafrost (+Dauerwert & Joker); kein
  verbrauchbarer Ressourcen-Balken.

---

## 10. Shop (Shop-Spec) — `shop.js` · `shopFamilies.js`

Münzökonomie: `STARTING_COINS = 2`, `BASE_COINS_PER_CYCLE = 2`, Einkommens-Stat gibt je Pick
`+SHOP_INCOME_PER_LEVEL` pro Shop-Besuch; komplettes Ablehnen eines Perk-Angebots gibt `PERK_DECLINE_COINS`.

- **Angebot:** `SHOP_ITEMS_PER_CATEGORY = 2` je Kategorie (`SHOP_CATEGORIES = cards · anchors · formations
  · planning`), Cheap-Garantie, höchstens **eine** legendäre Ersetzung (`SHOP_LEGENDARY_CHANCE`).
- **Preise:** vier feste Stufen `SHOP_PRICE = { cheap 8, strong 12, premium 18, legendary 30 }`.
- **Shop-Familien** (4 Stufen I–IV, `SHOP_FAMILY_DEFS`): Karten-Pakete (Feinschliff/Umlackierung/Werttausch
  …), **Anker** (Kraft/Punkte/Krit/Serie/Formation/Joker + **Zeitsegment**), **Formations-Regeln**
  (Abstieg, Enger Wechsel, Verstärkte Wiederholung, Nachhall, Farballianz, Offene Grenze, Formationskern,
  Feinjustierung) und **Planung** (Perk-/Skill-Neuwurf, Legendensuche, Warenwechsel, Reservierung,
  Schicksalskontrolle). **Positionsanker** hängen an der Deckposition (nicht `card.id`); das **Zeitsegment**
  wiederholt ein Segment im Durchlauf (`playSequence`).

---

## 11. Rarität (Epic #167) — `rarity.js`

Familien werten über **vier Stufen (I–IV)** auf; nur Stufen **echt über** dem aktuellen Rang werden
angeboten, IV schließt ab (Karten-Familien bleiben nachkaufbar). `TIER_META` liefert Preis/Farbe/Label je
Stufe; `TIER_WEIGHTS` die Angebots-Gewichtung. Flache Legendäre laufen weiter über `RARITY_WEIGHTS`
(`{ common: 100, rare: 25, legendary: 9 }`).

---

## 12. Score, Bestenliste & Geist — `storage.js` · `leaderboard.js`

- **Score** ist die einzige Ziel-Metrik; er wächst nur durch Siege.
- **Lokale Bestenliste** (`localStorage["as_highscores"]`, **Top 5**): `{ score, level, tricks, cycles, ts }`,
  Sortierung Score↓ → mehr Stiche → jünger. Weitere Keys: `as_ghost`, `as_options` (Default-Merge),
  `as_username`, `as_seen_guide`. Ein `VITE_PREVIEW`-Präfix (`preview_`) trennt den Testbranch-Namespace.
- **Geist** (`as_ghost`): nur der **Rekordlauf** als Score-Trajektorie (`traj[k]` nach `(k+1)·GHOST_STEP`
  Stichen, `GHOST_STEP = 13`). Ein `step`-Wechsel invalidiert alte Trajektorien (Versions-Migration).
- **Globale Bestenliste** (`leaderboard.js`, Supabase Data API, dependency-frei per `fetch`): Top-N lesen +
  Lauf veröffentlichen. Robust gegen eine noch nicht migrierte `archetypes`-Spalte (bei 400 Rückfall auf
  Basis-Spalten); der Preview-Build schreibt nie in die echte Tabelle.

---

## 13. Tempo & Steuerung

- **Basis-Tempo fest:** `BASE_FLIP_MS = 1750` ms je Stich. Die Speed-Stufen (1×–4×) sind **reine Anzeige**
  und **score-neutral** (Turbo teilt nur die Anzeigedauer). Es gibt keinen score-relevanten Tempo-Regler.
- **Auto-Play** (Default an) plant nach jedem Stich den nächsten; **manuell** über „Nächster Stich".
- **Pause** hält Takt **und** Run-Timer an; der Timer (`fmtDuration`) akkumuliert nur aktive `play`-Zeit.

---

## 14. UI-Komponenten (`src/ui/`)

`StartScreen`, `Controls`, `Battlefield` (+ Klingenschnitt-/Float-„Juice"), `Card`/`CardBack`, `CardGrid`,
`CardDetail`, `BuildPanel`/`BuildSummary`, `PerkSelect`/`StatSelect`/`SkillSelect`, `FormationPhase`,
`ShopScreen` (+ `ShopTargetSelect`/`FamilyTargetSelect`/`TargetSelect`), `StatusRail`, `ChronikOverview`
(Kartenübersicht), `GameOver`, `GlobalLeaderboard`, `MusicBar`/`MuteButton`, `AnleitungModal`,
`OptionsModal`, `UsernameModal`, Archetyp-HUD (`HeatBar`/`ChargeBar`/`CrystalBar`/`FrostOverlay`),
`Sparkline`, `CrtParticles`, `PanelMascot`.

Bewegung respektiert `prefers-reduced-motion` (gemeinsamer Hook `usePrefersReducedMotion`); abweisbare
Overlays teilen sich `useEscape` (Escape schließt).

---

## 15. Architektur

Harte Grenze: `src/game/` = reine Logik (kein React / `Math.random` / `Date`).

```
src/game/
  constants.js     TUNING-BLOCK + Deck/Farben + DECISION_SCHEDULE
  deck.js          buildDeck, makeRng, shuffle, shuffledOrder, clamp, fmtDuration
  engine.js        resolveTrick — Stich-Auflösung (pure, rng injiziert)
  reducer.js       initialState/menuState + reducer (Zustandsmaschine)
  formations.js    computeFormations + Segment-/Überlappungslogik
  stats.js         STAT_DEFS + statStreakFactor/statFormFactor
  perks.js         PERK_DEFS (Legendäre) + buildPerkOffer + Crit-Helfer
  families.js      FAMILY_DEFS (A–E, 4 Stufen) — regulärer Perk-Pool
  skills.js        SKILL_DEFS (Blitz/Feuer/Eis) + Archetyp-Helfer
  shop.js          Shop-State/Angebot/Reroll + Positionsanker + Zeitsegment
  shopFamilies.js  SHOP_FAMILY_DEFS (cards/anchors/formations/planning, 4 Stufen)
  rarity.js        Stufen-Meta (TIER_META/TIER_WEIGHTS), Preise
  storage.js       localStorage: Geist + Top-5 + Optionen + Flags
  leaderboard.js   globale Bestenliste (Supabase, fetch)
src/ui/            React-Komponenten (s. o.)
src/App.jsx        useReducer-State + Seiteneffekte (Auto-Play-Takt, Timer, Geist, Highscore, Audio)
```

`App.jsx` besitzt die Seiteneffekte, die der reine Layer nicht darf: `rng`-Payload, Timer/Uhr,
`localStorage`, Auto-Play-`setTimeout`.

---

## 16. Tuning-Konstanten (`constants.js` / `formations.js`, Auszug)

| Konstante | Wert | Bedeutung |
|---|---|---|
| `MAX_CYCLES` | 44 | Feste Lauflänge in Deck-Durchläufen (danach Ende). |
| `TRICKS_PER_CYCLE` | 40 | Stiche je Durchlauf (aus Deckgröße abgeleitet). |
| `SCORE_PER_WIN` | 100 | Basispunkte je Sieg. |
| `CRIT_BASE_MULT` | 1,5 | Basis-Crit-Faktor (Crit-Mult-Stat baut darauf auf). |
| `STREAK_BASE_STEP` / `STREAK_BASE_CAP` | 0,02 / 1,50 | Basis-Serien-Mult (+2 %/Stufe, Deckel +150 %). |
| `STREAK_STAT_CAP` | 3,00 | Deckel des Serien-**Stat**-Beitrags (Runaway-Schutz). |
| `STAT_*_STEP` | 0,07 / 0,25 / 0,05 / 0,02 / 1 | Crit-Chance / Crit-Mult / Form / Serie / Einkommen je Pick. |
| `FORMATION_ENERGY` | 4 | Tausch-Energie je Formationsphase. |
| `SEGMENT_SIZE` *(formations.js)* | 5 | Formations-Segmentgröße (Arena-Grenzen). |
| `OVERLAP_BONUS` *(formations.js)* | {2:1,5 · 3:2 · 4:3} | Überlappungs-Multiplikator je Anzahl Formationen. |
| `PERKS_OFFERED` / `SKILLS_OFFERED` / `SKILL_SLOTS` | 3 / 6 / 4 | Angebotsgrößen. |
| `STARTING_COINS` / `BASE_COINS_PER_CYCLE` / `SHOP_INCOME_PER_LEVEL` | 2 / 2 / 3 | Shop-Münzökonomie. |
| `SHOP_PRICE` | 8/12/18/30 | Vier feste Preisstufen (cheap/strong/premium/legendary). |
| `RARITY_WEIGHTS` | {100/25/9} | Gewicht flacher Perks (common/rare/legendary). |
| `BASE_FLIP_MS` | 1750 | ms je Stich (Speed 1×; score-neutral). |
| `GHOST_STEP` | 13 | Geist-Score-Stützstelle alle N Stiche. |
| `VALUE_CAP` | `null` | Kein Kartenwert-Cap (bewusst). |

Archetyp- und Shop-Familien-Feintuning stehen ebenfalls im Tuning-Block (`LIGHTNING_*`, `HEAT_*`/`FIRE_*`,
`ICE_*`/`FROST*`, `ANCHOR_*`, `FORMATION_CORE_FACTOR` …).

---

## 17. Tests & Deployment

- **Tests:** Vitest, nur der `game/`-Layer — **586 Fälle** (`vite.config.js` → `environment: "node"`).
  `npm test` / `npm run test:watch`.
- **Deployment:** GitHub Actions auf Push nach `main` → `npm ci` → `npm test` → `npm run build` → Pages.
  `vite.config.js`: `base = "/autostich/"` beim Build (Testbranch überschreibt via `DEPLOY_BASE`), `"/"` im Dev.
- **Befehle:** `npm run dev` · `npm run build` · `npm run preview`.

---

*Ende. Abgeleitet aus dem aktuellen Code-Stand des Repos `GitGudMonkeh/autostich`.*
