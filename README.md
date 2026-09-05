# Autostich — Gesamtübersicht

*A card game about who stands next to whom: put the right cards side by side for fifty rounds, and
your skills turn a polite little line-up into an engine that scores high enough to unlock tracks most
players never hear.*

Der Pitch in allen vier Projektsprachen, mit den kurzen Fassungen und der Genre-Angabe:
`docs/pitch.md`. Er ist **kein Spielertext** — er steht in keinem i18n-Katalog und wird nirgends im
Spiel angezeigt.

> **Roguelite-Autobattler-Stechspiel** (Prototyp, Vite + React).
> Eigenes Repo `GitGudMonkeh/autostich`, Deploy auf GitHub Pages unter `/autostich/`.
> UI-Text **Deutsch**, Code-Identifier **Englisch**.
>
> Stand: **v0.3** — 4 Elementar-**Archetypen** (Feuer/Blitz/Eis/Pflanze), **Architekt** (ersetzt den alten
> Shop/die Münzökonomie), **Upgrade-Baum** (laufübergreifend, SP/DP — ersetzt die früheren Meisterränge),
> **Ranglisten-Wochenmodus** mit Wochen-Modifikatoren, Challenger-Seeds, Chronik, 4-Stufen-Raritätsfamilien.
> Die frühere **Stat-Phase ist entfernt** (#267) — Crit-Chance/-Multiplikator kommen aus den
> Präzision-Familien bzw. aus Blitz.
> **1263 Vitest-Fälle** (84 Dateien), CI grün (Tests → Lint → Build → Pages).
> Spielertexte folgen `docs/text-style-guide.md`; `node scripts/export-strings.mjs` zieht sie alle in eine CSV.
> Diese Übersicht ist **aus dem Code abgeleitet** — die Quelle der Wahrheit bleibt der Code
> (`src/game/*`). Bei Unstimmigkeit gilt der Code, nicht dieses Dokument.

---

## Schnellstart

```bash
npm install       # Abhängigkeiten
npm run dev       # Dev-Server (Vite, http://localhost:5173)
npm test          # Vitest (game/-Layer, Node-Umgebung)
npm run build     # Produktions-Build nach dist/ (base = /autostich/)
npm run preview   # gebauten Stand lokal ansehen
```

**Deploy:** GitHub Actions auf Push nach `main` → `npm ci` → `npm test` → `npm run build` → GitHub Pages
(`/autostich/`). Entwickelt wird auf `Autostich_Test`, danach nach `main` gemergt.

---

## 1. Kernidee

Ein **Stechspiel ohne Spielerentscheidung im Kampf**: In jedem *Stich* deckt deine Seite und die
Gegnerseite automatisch die nächste Karte auf, die **höhere Zahl gewinnt**. Du steuerst nicht *welche*
Karte du spielst — du baust **zwischen** den Durchläufen einen Build, der dein Deck und deine Stiche
dauerhaft stärker macht.

```
Stiche auto-auflösen → Durchlauf-Ende → eine Entscheidung (Skill · Perk · Aufstellung · Architekt)
→ Build/Aufstellung werden stärker → nächster Durchlauf … über genau MAX_CYCLES Durchläufe → Ende.
```

**Ziel:** möglichst hoher **Score** über den festen Lauf. **Kein Leben, kein Tod durch Schaden** —
der Lauf hat eine feste Länge (`MAX_CYCLES = 50` Deck-Durchläufe), danach Game Over. Der Reiz liegt im
*Bauen während des Laufs* — Deckwerte, Kartenrollen, Formationsaufstellung, Archetyp-Skills und Architekt-Gebäude.

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
der feste **Entscheidungsplan** `DECISION_SCHEDULE` (50 Einträge) vorgibt.

| Phase | Bedeutung |
|---|---|
| `menu` | Startbildschirm (`StartScreen`): „Neuer Run", lokale + globale Bestenliste. |
| `play` | Der Autobattler läuft: Stich für Stich, auto-getaktet. |
| `levelup` | Auswahl-Overlay — je nach Plan **Perk** (`PerkSelect`) oder **Skill** (`SkillSelect`); pausiert. In Durchlauf 29 die **Legendär-Phase** (`LegendarySelect`, fixer 7. Slot). |
| `glacier-target` | Eis: nach jedem Eis-Skill-Pick genau eine Karte als **Gletscher** festfrieren (Pflicht). |
| `formation` | **Formationsphase** (`FormationPhase`, §22.8): Karten der Aufstellung tauschen. |
| `shop` | **Architekt** (`ArchitectScreen`, #202 · Shop-Ersatz): Gebäude auf dem 8×5-Baufeld platzieren/aufwerten (keine Münzen). Der Aktionsschlüssel heißt intern noch `shop`. |
| `gameover` | Nach `MAX_CYCLES` Durchläufen: Endbildschirm (`GameOver`) mit Score, Statistik, Bestenliste. |

**Entscheidungsplan** (`DECISION_SCHEDULE`): fester 50-Einträge-Plan statt eines Zyklus —
Verteilung **10 Skill · 13 Perk · 13 Formation · 13 Architekt (`shop`) · 1 Legendär**. Die erste
Entscheidung (Durchlauf 1) ist bewusst ein Skill-Blind-Commit; die Legendär-Phase liegt in Durchlauf 29
(`LEG_PHASE_CYCLE`, aus dem Plan abgeleitet). Ziel-Flows (Karten/Positionen/Farben wählen) laufen als
Unter-Overlays der Perk-Auswahl (`CONFIRM_TARGET`, `FAMILY_TARGET_*`).

**Actions (Auszug):** `START_RUN`/`RESET`, `TO_MENU`, `END_RUN`, `RESOLVE_TRICK` (ein Stich; `action.rng`
wird an `resolveTrick` gereicht), `PICK_PERK`/`PICK_FAMILY`, `PICK_SKILL`/`DECLINE_SKILL`, `GLACIER_LOCK`,
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
scoreVorCrit = SCORE_PER_WIN (400)
             × streakBaseMult(Serie)          ← Basis-Serien-Multiplikator (gedeckelt)
             × Π Perk-scoreMult
             × formationMult                  ← Formations-Faktor der Position (inkl. Überlappung)
             × Architekt-Faktoren              ← Struktur (Zeile/Spalte/Diagonale) + Distrikt
             + Σ Flats (Anker · Feuer-Score · Ionisierung · Perk-scoreFlat · Gebäude-Flat)
score       = scoreVorCrit × (Crit ? critMultiplier : 1)
            + Direkt-Score                    ← Glutdividende, Wurzel/Blüte, Berst-Score … am Stack vorbei
```

**Crit:** nur bei Sieg. Der **Basis-Crit ist 0** — Crit-Chance kommt aus den **Präzision-Familien**
(`families.js` Kat. P) und aus **Blitz-Skills**, auf 100 % gedeckelt; Überschuss > 100 % speist
Sonderregeln (Überschusskrit, Überschlag, Raserei). Crit-Faktor = `CRIT_BASE_MULT (2,25)` +
Präzision-Wucht + Blitz (+`LIGHTNING_CRIT_MULT_PER_SKILL` je Skill) + Legendär-Boni.
Über den injizierten `rng` gewürfelt → deterministisch.

> **`initiative`** wird geführt/angezeigt, hat aber aktuell **keinen** mechanischen Effekt (Reserve).

---

## 5. Deck-Durchlauf (Cycle) & Score

- Nach **40 Stichen** ist ein Durchlauf voll: `cycle += 1`, Rundenscore-Tracking (`lastCycleScore`), dann
  die anstehende **Entscheidung** (`DECISION_SCHEDULE[cycle]`). Neu gemischt wird das **Gegnerdeck** beim
  Übergang in den nächsten `play`.
- **Basis-Siegesserie (#39):** jeder Serienpunkt hebt den Score-Mult um `STREAK_BASE_STEP (+2 %)`,
  gedeckelt bei `STREAK_BASE_CAP (+150 %)`. Der frühere Serien-**Stat** ist mit der Stat-Phase entfallen
  (#267); Serien-Score kommt jetzt aus Familien (Siegesserie) und Skills.
- Der Lauf endet nach `MAX_CYCLES` Durchläufen — **nicht** durch Verluste.

---

## 6. Präzision — Crit als Perk-Kategorie (`families.js` Kat. P)

**Die Stat-Phase ist entfernt** (#267): Crit-Chance/-Multiplikator/Formations-/Serien-Mult waren als
Stat eine „gelöste" Entscheidung. Formation und Serie behalten ihre Basis-Systeme; der Crit-Anteil
wandert in fünf RNG-gegatete **Präzision-Familien** (kein Legendäres). Basis-Crit = 0.

| Familie | Wirkung (Stufen I–IV) |
|---|---|
| **Schärfe** | flat +Crit-Chance auf alle Karten (`PRECISION_SHARP_PP`) |
| **Wucht** | +Crit-Multiplikator auf Basis `CRIT_BASE_MULT` (`PRECISION_FORCE_MULT`) |
| **Zielsicherheit** | +Crit-Chance auf hohe Karten; die Wertschwelle weitet sich je Stufe |
| **Brennglas** | +Crit-Chance je gleichzeitiger Formation ab der zweiten (gedeckelt) |
| **Farbfokus** | +Crit-Chance auf eine gewählte Farbe; Stufe IV eine zweite Farbe |

**Blitz** bleibt der verlässliche, selbst-erzeugende Crit-Archetyp; Präzision ist additiv obendrauf.

---

## 7. Formationen (§22.7) — `formations.js`

Aus der **persistenten Reihenfolge** + den **Dauerwerten** wird je Position ein Formations-Multiplikator
berechnet. Basis-Formationen sind **segmentgebunden** (`SEGMENT_SIZE = 5`): ein Lauf endet an jeder
Segmentgrenze (Rollen/Werkzeuge/Shop können Grenzen öffnen).

- **Wiederholung** (≥2 gleiche Werte): 2.→×1,25, 3.→×1,50, 4.→×1,80, danach je +0,40 (kein Cap).
- **Farbblock** (≥3 gleiche Farbe): ab der 3. ×1,35, je weitere +0,20.
- **Treppe** (≥3 streng steigend, Schritt ≤4): ab der 3. ×1,35, je weitere +0,20.
- **Wechsel** (≥3 Zick-Zack, Nachbardifferenz ≥4 · `WECHSEL_MIN_DIFF`): ab der 3. ×1,40, je weitere +0,20.
- **Anker**: einzelne Position zählt als Formation — der Faktor kommt **je Quelle** (Familien-Anker
  Kontrollverlust/Schnellschuss ×1,25…1,35, Architekt-Grundstein ×1,10…1,49, Eisanker). Höchstens ein Anker je Position.
- **Überlappung** (`OVERLAP_BONUS`): steckt eine Karte in mehreren Formationen, multipliziert der Bonus
  das Faktor-Produkt zusätzlich — **2 → ×1,5 · 3 → ×2 · 4 → ×3**.
- **Meta-Faktoren** (nach der Überlappung): **Nachhall** (Shop) trägt den stärksten Endfaktor auf die
  Folgekarte(n); **Formationskern** (Shop) hebt einen gewählten Typ zusätzlich (`FORMATION_CORE_FACTOR`).

**Aufstellungsphase (§22.8, `FormationPhase`):** pausiert den Lauf; je Phase `FORMATION_ENERGY = 4`
Formations-Energie (Normal-Lauf: `ENERGY_FLOOR = 3` + Upgrade-Baum, max 5);
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

Auf **Skill-Runden** stehst du vor **zwei Türen** (`SKILL_DOORS = 2`): jede zeigt **drei Fraktionssymbole**
(`SKILL_DOOR_SIZE = 3` Skills aus höchstens `SKILL_DOOR_FACTIONS = 2` Fraktionen, Wiederholung erlaubt). Erst das
Öffnen zeigt die drei Skills mit ihren gewürfelten Stufen (Normal / Selten / Sehr selten / Episch), einer wird
genommen; gehaltene Skills sind unbegrenzt. **Legendäre Skills** sind die fünfte Seltenheit des Türwurfs
(`SKILL_LEGENDARY_PER_SLOT` je Platz). Der Angebots-Pool auf exp ist `SKILL_OFFER_ARCHETYPES` (Feuer und Blitz,
bis Eis und Pflanze überarbeitet sind); die Sim kann ihn je Lauf ersetzen (`--arch`). **Verstärker-Skills**
(`enabler`) werden nur angeboten, wenn ihr Basis-Skill gehalten wird. Details: `docs/skill-rework.md`.

- **⚡ Blitz** — Ladung/Ionisierung/Crit: Ladung sammeln (`LIGHTNING_MAX_CHARGE`), Karten ionisieren
  (`ION_*` → +Score je Stapel), Gewitterfront/Reaktoren, Legendäre (Donnergott u. a.). Positionsgebundene
  Effekte (Leitfähigkeit/Ionisierung) lesen `actualPos` (korrekt unter Zeitsegment).
- **🔥 Feuer** — Hitzeleiste 0–`HEAT_MAX` (`factions/fire.js`): Siege mit Abstand erzeugen Hitze, Niederlagen
  kühlen, je 10 % gehaltener Hitze ein eigener Score-Multiplikator (`HEAT_MULT_PER_10`); die Skills nutzen die
  Hitze (Konsumenten Flächenbrand/Schmelzpunkt/Schmiede, Schwellen-Skills, Brände); Legendäre (Sonnenkern,
  Phönixfeuer, Sonnenzorn, Damaststahl).
- **❄ Eis** — Gletscher-Archetyp (`glacier.js`): jeder Eis-Skill friert eine Karte auf ihrem Brettfeld
  fest. Ein **Gletscher** ist ab dann starr, sammelt aber jeden Durchlauf **Masse** und **birst** an der
  obersten Schwelle über seine Nachbarn (Kaskade/Kollision). **Firn** liegt als Reserve auf offenem Boden
  und füllt einen Gletscher nach jedem Bruch wieder auf. **Eis-Formationen** (Block/Kreuz/Linie/Fläche)
  verstärken das Bersten.
- **🌿 Pflanze** — Wachstums-Archetyp: Siege lassen Karten **wachsen**, ab `PLANT_GREEN_THRESHOLD` werden
  sie dauerhaft **grün** und bilden einen gemeinsamen Farbblock. Payoffs: **Wurzeln** (nur Mono-Pflanze
  → Kartenwert), **Blüte**, **Überwucherung**; **Trimmen** ist der Wendepunkt vom Wachsen zum Ernten.

---

## 10. Architekt (Shop-Ersatz, #202) — `architect.js` · `ArchitectScreen.jsx`

Der alte **Shop mit Münzökonomie ist entfernt** (#229). An der `shop`-Entscheidung öffnet stattdessen der
**Architekt**: ein **8×5-Baufeld**, auf dem du **Gebäude** aus einem Bauplan-Angebot platzierst. Keine
Münzen, keine Preise — die Begrenzung ist das **Baufeld** (Normal-Lauf: `COVER_FLOOR = 20` Zellen +
0…4 aus dem Upgrade-Baum → max `MAX_COVER = 24`).

- **Angebot:** `ARCHITECT_OFFER = 3` Baupläne je Phase + „Aufwerten", höchstens **eine** legendäre Familie
  (`ARCHITECT_LEGENDARY_CHANCE`), Kategorie-gewichtet (`ARCHITECT_CAT_WEIGHT`). Deterministisch über den
  Lauf-Seed; **neu würfelbar** über den Gebäude-Reroll-Pool (#263).
- **Ablauf (#261):** Bauplan wählen = verbindlich → Gebäude wird sofort platziert → eine kombinierte
  Verschiebe-/Dreh-Phase (alle Gebäude frei ziehbar) → **ein** „Bestätigen" startet den Durchlauf. Kein
  Platz → Ersetzen-Menü im Skill-Stil.
- **Gebäude-Familien** (`ARCHITECT_FAMILIES`, 4 Stufen I–IV + Legendäre): drei Kategorien **Wert** (Stichwert-
  Boosts), **Score** (Flat/Serie/Crit/Meilenstein) und **Formation** (Anker/Joker/Formations-Mult/Segment
  öffnen). Struktur-Kombis (volle Zeile/Spalte/Diagonale) stapeln multiplikativ; colorLocked-Gebäude buffen
  eine wählbare Farbe.
- **Reroll-Ökonomie (#263):** drei getrennte Pools je Lauf — **Perks · Gebäude · Skills**, nicht
  untereinander teilbar, kein Nachschub. Normal-Lauf mit Profil: `REROLL_BASE = 1` je Pool (+ Baum-Knoten);
  Ranglisten-Lauf und Sim: fest `BASE_REROLLS = 2`.

> Die **Positionsanker**/das **Zeitsegment** aus dem alten Shop leben als inerter Substate in `shop.js` weiter
> (`initialShop`), sind aber im Architekt-Spiel ohne Funktion.

---

## 11. Rarität (Epic #167) — `rarity.js`

Familien werten über **vier Stufen (I–IV)** auf; nur Stufen **echt über** dem aktuellen Rang werden
angeboten, IV schließt ab (Karten-Familien bleiben nachkaufbar). `TIER_META` liefert Farbe/Label je Stufe —
**Normal · Selten · Sehr selten · Rar** (die einzige gültige Benennung, siehe `docs/text-style-guide.md`);
`TIER_WEIGHTS` die Angebots-Gewichtung. Welche Stufen überhaupt droppen, deckelt der Upgrade-Baum
(`RARITY_TIER_BASE = 2` → Knoten `tier3`/`tier4`). Flache Legendäre laufen weiter über `RARITY_WEIGHTS`
(`{ common: 100, rare: 25, legendary: 9 }`).

---

## 12. Score, Bestenliste & Geist — `storage.js` · `leaderboard.js`

- **Score** ist die einzige Ziel-Metrik; er wächst nur durch Siege. Laufübergreifend fallen **SP**
  (Upgrade-Baum) und **DP** (Deck-Werkstatt, rein kosmetisch) an — siehe `progression.js`/`storage.js`.
- **Lokale Bestenliste** (`localStorage["as_highscores"]`, **Top 5**): `{ score, level, tricks, cycles, ts }`,
  Sortierung Score↓ → mehr Stiche → jünger. Weitere Keys: `as_ghost`, `as_options` (Default-Merge),
  `as_username`, `as_seen_guide`. Ein `VITE_PREVIEW`-Präfix (`preview_`) trennt den Testbranch-Namespace.
- **Geist** (`as_ghost`): nur der **Rekordlauf** als Score-Trajektorie (`traj[k]` nach `(k+1)·GHOST_STEP`
  Stichen, `GHOST_STEP = 13`). Ein `step`-Wechsel invalidiert alte Trajektorien (Versions-Migration).
- **Globale Bestenliste** (`leaderboard.js`, Supabase Data API, dependency-frei per `fetch`): Top-N lesen +
  Lauf veröffentlichen. Robust gegen eine noch nicht migrierte `archetypes`-Spalte (bei 400 Rückfall auf
  Basis-Spalten); der Preview-Build schreibt nie in die echte Tabelle.
- **Feedback-Melder** (#396, `reports.js` + `FeedbackModal.jsx`): Chip „🐞 Feedback" im Hauptmenü, Insert in
  `autostich_reports` (Schema: `docs/autostich-reports-schema.sql`, einmal im Dashboard ausführen). RLS
  erlaubt anon **nur insert, kein select** — der öffentliche Schlüssel taugt damit zum Melden, nicht zum
  Mitlesen. Der Discord-Ping hängt serverseitig an der Tabelle; der Client weiß davon nichts.
  **Umgekehrt zum Leaderboard:** der Melder schreibt in JEDER Umgebung (die Preview-Builds *sind* die
  Playtest-Builds), unterschieden wird über die Spalte `build_env`. Mitgeschickt wird ohne Zutun der
  Kontext des zuletzt gespielten Laufs (Seed/Durchlauf/Score), Version, Gerät und ein Ring-Puffer der
  letzten JS-Fehler (`errorBuffer.js`) — der überbrückt, dass der Absturz im Lauf passiert, gemeldet aber
  danach im Menü wird. Fehlgeschlagene Sendungen parken in `as_feedback_draft` und gehen beim nächsten
  Öffnen still raus.

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
`ArchitectScreen` (Bauphase, #202) + `FamilyTargetSelect`/`TargetSelect`, `StatusRail`, `ChronikOverview`
(Kartenübersicht), `GameOver`, `GlobalLeaderboard`, `MusicBar`/`MuteButton`, `AnleitungModal`,
`OptionsModal`, `UsernameModal`, Archetyp-HUD (`HeatBar`/`ChargeBar`/`CrystalBar`/`FrostOverlay`),
`Sparkline`, `CrtParticles`.

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
  perks.js         PERK_DEFS (Legendäre) + buildPerkOffer + Crit-Helfer
  families.js      FAMILY_DEFS (A–E + P Präzision, 4 Stufen) — regulärer Perk-Pool
  skills.js        SKILL_DEFS (Blitz/Feuer/Eis/Pflanze) + Archetyp-Helfer
  glacier.js       Eis: Masse/Firn/Bersten/Kaskade + Eis-Formationen (Single Source der Zahlen)
  architect.js     ARCHITECT_FAMILIES, Brett/Formen/Platzierung, Struktur- & Distrikt-Faktoren,
                   familyEffectText (der EINE Gebäude-Beschreibungstext)
  glossary.js      GLOSSARY — die einzige Quelle der Begriffs-Erklärungen (+ Auto-Fettung)
  progression.js   Upgrade-Baum: NODES/BRANCHES, SP/DP-Ableitungen, Freischaltungen
  weekMods.js      WEEK_MODS + pickWeekMods (Ranglisten-Wochenmodifikatoren)
  weeklySeed.js    Wochen-Seed (currentWeek/pastWeeks)
  cosmetics.js     DECK_DEFS/BATTLEFIELD_DEFS + Freischalt-Logik (rein kosmetisch)
  themes.js        PACKS/GLOBAL_FX — Deck-Werkstatt (DP-Kauf)
  color.js         effColor/colorMatches — grün- und allianz-bewusstes Farb-Matching
  shop.js          inerter Rest-Substate des alten Shops (Positionsanker/Zeitsegment)
  rarity.js        Stufen-Meta (TIER_META/TIER_WEIGHTS)
  storage.js       localStorage: Profil + Geist + Top-5 + Optionen + Flags
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
| `MAX_CYCLES` | 50 | Feste Lauflänge in Deck-Durchläufen (danach Ende). |
| `TRICKS_PER_CYCLE` | 40 | Stiche je Durchlauf (aus Deckgröße abgeleitet). |
| `SCORE_PER_WIN` | 400 | Basispunkte je Sieg. |
| `CRIT_BASE_MULT` | 2,25 | Basis-Crit-Faktor (Präzision-Wucht und Blitz bauen darauf auf). |
| `STREAK_BASE_STEP` / `STREAK_BASE_CAP` | 0,02 / 1,50 | Basis-Serien-Mult (+2 %/Serienpunkt, Deckel +150 %). |
| `FORMATION_ENERGY` | 4 | Formations-Energie je Aufstellungsphase (Sim/Standard). |
| `ENERGY_FLOOR` / `COVER_FLOOR` *(progression.js)* | 3 / 20 | Normal-Lauf-Basis: Energie bzw. Baufeld-Zellen (+ Baum). |
| `SEGMENT_SIZE` *(formations.js)* | 5 | Formations-Segmentgröße (Arena-Grenzen). |
| `WECHSEL_MIN_DIFF` *(formations.js)* | 4 | Mindest-Nachbardifferenz für den Wechsel. |
| `OVERLAP_BONUS` *(formations.js)* | {2:1,5 · 3:2 · 4:3} | Überlappungs-Multiplikator je Anzahl Formationen. |
| `PERKS_OFFERED` / `SKILLS_OFFERED` / `SKILL_SLOTS` | 3 / 12 / 6 | Angebotsgrößen (+ fixer 7. Legendär-Slot). |
| `MAX_ARCHETYPES` | 4 | Gleichzeitig aktive Archetypen. |
| `FIRST_SKILL_CYCLE` / `LEG_PHASE_CYCLE` | 1 / 29 | Erste Skill-Runde bzw. Legendär-Phase (aus dem Plan abgeleitet). |
| `BASE_REROLLS` / `REROLL_BASE` *(progression.js)* | 2 / 1 | Reroll-Pool je Kategorie: Ranglisten-/Sim-Lauf bzw. Normal-Lauf. |
| `ARCHITECT_OFFER` / `MAX_COVER` | 3 / 24 | Baupläne je Architekt-Angebot / Baufeld-Obergrenze. |
| `RARITY_TIER_BASE` *(progression.js)* | 2 | Startbare Max-Rarität (Normal + Selten), Baum hebt auf 4. |
| `RARITY_WEIGHTS` | {100/25/9} | Gewicht flacher Perks (common/rare/legendary). |
| `BASE_FLIP_MS` | 1750 | ms je Stich (Speed 1×; score-neutral). |
| `GHOST_STEP` | 13 | Geist-Score-Stützstelle alle N Stiche. |
| `VALUE_CAP` | `null` | Kein Kartenwert-Cap (bewusst). `PLANT_VALUE_CAP = 11` deckelt nur grüne Karten. |

Archetyp-Feintuning steht ebenfalls im Tuning-Block (`LIGHTNING_*`, `HEAT_*`/`FIRE_*`, `PRECISION_*`,
`ANCHOR_*`, `FORMATION_CORE_FACTOR` …); die Eis-Zahlen liegen gesammelt in `glacier.js`.

---

## 17. Tests & Deployment

- **Tests:** Vitest — **1263 Fälle** in 84 Dateien (`vite.config.js` → `environment: "node"`).
  `npm test` / `npm run test:watch`.
- **Wo die Abdeckung liegt — und wo nicht.** Der Schwerpunkt ist der `game/`-Layer: rund neun von zehn
  Test-Importen zeigen dorthin. Die UI ist dünn abgedeckt, die Effekt-Schicht `src/ui/fx/` praktisch gar
  nicht (ein einziger Import, und der prüft nur Timing-Konstanten). Wo die UI geprüft wird, geschieht das
  überwiegend **statisch** — der Test liest die Quelldatei als Text (`registry-guards`, `i18n-guards`,
  `hub-panels`, `privacy` …) und sichert Nähte ab, nicht Laufzeitverhalten. Das ist Absicht (Node-Umgebung,
  kein jsdom, kein Browser), hat aber eine Konsequenz, die man kennen muss: **eine grüne Suite ist keine
  Abnahme der Optik.** GPU-Effekte, Layout und Mobile-Verhalten werden im `/test/`-Slot von Hand geprüft.
- **Lint:** `npm run lint` (ESLint Flat-Config, `eslint.config.js`). Die CI fährt ihn mit
  `--max-warnings=0` — ohne Deckel wandert die Warnungszahl nur in eine Richtung.
- **Deployment:** GitHub Actions → `npm ci` → `npm test` → `npm run lint -- --max-warnings=0` →
  `npm run build` → `npm run gen:db` → Pages. Vier Slots auf **derselben** Pages-Seite, je Branch einer:
  `main` → `/autostich/` · `Autostich_Test` → `/test/` · `Autostich/pixi` → `/pixi/` · `balancing` →
  `/balancing/`. `vite.config.js`: `base = "/autostich/"` beim Build (die Slots überschreiben via
  `DEPLOY_BASE`), `"/"` im Dev.
- **Medien** (55 Musikstücke, ~150 MB) liegen bewusst außerhalb von `src/` und `public/` im Ordner
  `media/` und wandern damit in **keinen** Slot-Build. Veröffentlicht wird einmal zentral nach
  `/autostich/media/` (`deploy-media.yml`); alle vier Slots referenzieren denselben absoluten Pfad über
  `VITE_MEDIA_BASE`. Vorher trug jeder Build eine eigene Kopie — die Pages-Seite lag bei 1,7 GB
  (Limit: 1 GB), `dist/` bei 163 MB statt heute ~21 MB.
  **Ein geänderter Track braucht einen NEUEN Dateinamen** — ohne Build-Hash gibt es kein Cache-Busting.
- **Befehle:** `npm run dev` · `npm run build` · `npm run preview` · `npm test` · `npm run lint`.

---

*Ende. Abgeleitet aus dem aktuellen Code-Stand des Repos `GitGudMonkeh/autostich`.*
