# Autostich — Gesamtübersicht

> **Roguelite-Autobattler-Stechspiel** (Prototyp, Vite + React).
> Eigenes Repo `GitGudMonkeh/autostich`, Deploy auf GitHub Pages unter `/autostich/`.
> UI-Text **Deutsch**, Code-Identifier **Englisch** — dieselbe Konvention wie TrickLadder.
>
> Stand: Prototyp, `main` @ `0cbbab8`. 40 Vitest-Fälle, CI grün (Tests → Build → Pages).
> Enthält In-Game-Anleitung (#12) und Stich-Feedback/„Juice" (#15).
> Diese Übersicht ist aus dem Code abgeleitet — Quelle der Wahrheit bleibt der Code.

---

## 1. Kernidee

Ein **Stechspiel ohne Spielerentscheidung im Kampf**: In jedem *Stich* deckt deine Seite und die Gegnerseite automatisch die nächste Karte auf, die **höhere Zahl gewinnt**. Du steuerst nicht *welche* Karte du spielst — du baust zwischen den Kämpfen einen **Build aus Perks**, der dein Deck und deine Stiche dauerhaft stärker macht.

Der Loop ist ein klassischer Roguelite-Autobattler:

```
Stiche gewinnen → XP → Level-Up → Perk wählen → Deck/Stiche werden stärker →
mehr Stiche gewinnen … bis die Verluste dein Leben auffressen (Game Over).
```

**Ziel:** möglichst hoher **Score**, bevor der Lauf endet. Der Reiz liegt im *Deckbau während des Laufs* — nicht im taktischen Ausspielen.

**Zentrale Design-Pointe:** Farben sind im Kampf **rein kosmetisch** — es zählt nur der Zahlenwert. Farbe wird erst relevant, weil ein Deck-Perk (A4) gezielt *eine Farbe* verstärkt. Kartenwerte dürfen **über 10 hinaus** wachsen (kein Cap) — genau das ist die Machtkurve: ab Wert 11 überbietet deine Karte **jede** mögliche Gegnerkarte (Gegner-Maximum ist 10).

---

## 2. Deck & Karten

- **40 Karten** = 4 Farben × 10 Werte (**1–10**). Beide Seiten (Spieler + Gegner) haben je ein eigenes 40er-Deck.
- Farben (`SUITS`, `SUIT_ORDER = ["R","B","G","Y"]`): **Rot `#e0605a` · Blau `#5a8ade` · Grün `#5ab87a` · Gelb `#d4a63a`**. Reine Anzeige, kein Kampfeffekt.
- **Kartenobjekt:** `{ id, suit, baseRank, value }`
  - `value` = **aktueller Kampfwert** (durch Deck-Perks dauerhaft veränderbar).
  - `baseRank` = Ursprungswert (nur Anzeige — der violette „+X"-Boost = `value − baseRank`).
- **Kein Wert-Cap** (`VALUE_CAP = null`): Deck-Mods sollen den Gegner-Maximalwert bewusst überbieten können.
- Der **Gegner** ist neutral: sein Deck bleibt unverändert bei Werten 1–10 (jeder Wert kommt 4× vor). Zu Lauf-Beginn sind beide Decks identisch → viele Gleichstände, ~50/50; mit jedem Deck-Perk kippt die Bilanz zu deinen Gunsten.

---

## 3. Spielablauf & Phasen

Ein **reiner Reducer** (`src/game/reducer.js`) treibt `state.phase`:

```
menu ──START_RUN──▶ play ──(Level-Up)──▶ levelup ──PICK_PERK──▶ play …
                     │  └──(Durchlauf-Ende)──▶ prediction ──SUBMIT_PREDICTION──▶ play …
                     └──(Leben ≤ 0)──▶ gameover ──Neustart/Menü──▶ …
```

| Phase | Bedeutung |
|---|---|
| `menu` | Startbildschirm (`StartScreen`): „Neuer Run" + lokale Bestenliste. Kein Lauf aktiv, Timer ruht. |
| `play` | Der Autobattler läuft: Stich für Stich, auto-getaktet. |
| `levelup` | Level-Up-Overlay (`PerkSelect`): pausiert, bietet 3 Perks. Auswahl → zurück zu `play`. |
| `prediction` | Ansage-Overlay (`PredictionSelect`, #36): nach jedem Durchlauf-Ende — schätze deine Siege der nächsten 40 Stiche. Pausiert; nach Bestätigung neu mischen → `play`. |
| `gameover` | Leben aufgebraucht: Endbildschirm (`GameOver`) mit Score, Statistik, Bestenliste. |

**Actions:** `START_RUN` / `RESET` (frischer Lauf), `TO_MENU` (Lauf verlassen), `RESOLVE_TRICK` (einen Stich auflösen), `PICK_PERK` (Perk wählen), `SUBMIT_PREDICTION` (Ansage bestätigen → mischen + nächster Durchlauf, #36).

**Determinismus-Invariante** (wie TrickLadder): der `game/`-Layer nutzt **nie** `Math.random`/`Date`. Zufall kommt als **Action-Payload** (`rng`) aus `App.jsx` herein. `makeRng(seed)` (mulberry32) existiert für reproduzierbare Sim/Test-Läufe.

---

## 4. Stich-Auflösung (Herzstück, `engine.js` · `resolveTrick`)

Pro Stich wird je Seite die **nächste Karte** aus der gemischten Ziehreihenfolge gezogen (`playerOrder[pos]` / `oppOrder[pos]`) und verglichen:

1. **Spielerwert** = `card.value` + alle **Kategorie-B**-Boni dieses Stichs (`cardBonus`-Hooks).
2. **Gegnerwert** = `card.value` (immer neutral, nie verändert).
3. **Vergleich:**
   - `pValue > oValue` → **Sieg**
   - `pValue < oValue` → **Niederlage**
   - `pValue === oValue` → **Gleichstand** (kein Effekt) … **außer** `tieArmed` (Perk B5) ist gesetzt → Gleichstand zählt als **Sieg** (`win_tie`).

**Bei Sieg:** Serie +1, `wins` +1, Score += `SCORE_PER_WIN × Π scoreMult + Σ scoreFlat` (D-Perks), XP += 10, Heilung (`healOnWin`, C-Perks), Initiative → Spieler.
**Bei Niederlage:** Serie → 0, Schaden = `max(0, 10 − Σ dmgReduce)`; erster Verlust je Durchlauf mit Schild (C5) → 0 Schaden; Leben −= Schaden, Initiative → Gegner; hat man B5, wird `tieArmed` scharf gestellt.
**Bei Gleichstand:** `ties` +1, Serie & Initiative unverändert.

> **Hinweis (ehrlich):** `initiative` (Spieler/Gegner) wird geführt und angezeigt-fähig gehalten, hat aber **aktuell keinen mechanischen Effekt** — im Autobattler gibt es keine Kartenwahl/Anspielreihenfolge, die davon abhinge. Vestigial / Reserve für spätere Regeln.

**Tod:** `life ≤ 0` → sofort `gameover` (kein Weiterziehen, kein Level-Up mehr).

---

## 5. Deck-Durchlauf (Cycle)

- Nach **40 Stichen** (`TRICKS_PER_CYCLE`, aus der Deckgröße abgeleitet) ist ein Durchlauf voll: `cycle` +1, `healOnCycle` (C4: +50 Leben), Schild (C5) lädt neu, **Ansage-Auswertung** (#36) — dann Phase `prediction`. **Neu gemischt** wird **erst bei `SUBMIT_PREDICTION`** (`pos`→0, beide Reihenfolgen neu, `rng`-Payload), nicht mehr direkt am Durchlauf-Ende.

### Ansage-System (#36)
Ab dem **2. Durchlauf** schätzt der Spieler vor jeder neuen Runde, wie viele der 40 Stiche er gewinnt (`PredictionSelect`-Overlay, Auto-Play pausiert). Auswertung nach dem 40. Stich über die **Abweichung** `|Ansage − cycleWins|`: 0 → **×3**, 1 → **×1,75**, 2 → **×1,25**, ≥3 → **×1** (`PREDICTION_*_MULT`). Der Rundenscore (`cycleBaseScore`, alle Stichscores des Durchlaufs) wird mit dem Multiplikator verrechnet; **nur der Bonus** (`floor(cycleBaseScore × (mult−1))`) wird zusätzlich auf den Score addiert (kein Doppelzählen) und fließt voll in Bestenliste/Geist. Tod vor dem Durchlauf-Ende → kein Bonus (Ansage „nicht abgeschlossen"). Der erste Durchlauf läuft ohne Ansage (Referenz). Live-Anzeige in der StatusRail (Ansage · Siege · offen · „nicht mehr exakt erreichbar"); Game-Over zeigt exakte/knappe Ansagen + Ansage-Bonus.
- **Deck-Wertmods bleiben über Durchläufe erhalten** — die A-Perks sind dauerhaft. Die StatusRail zeigt „Deck bis zum Mischen" (Rest-Karten des laufenden Durchlaufs).

---

## 6. Leben, XP, Level-Up

| Größe | Wert / Regel |
|---|---|
| **Leben** (`life`, Start `START_LIFE = 2000`) | Fungiert als „Run-Timer". Nur **Verluste** zehren daran (Basis −`DMG_PER_LOSS = 10`, **zeitbasiert eskalierend** +5 je 5 Min aktiver Zeit — Anti-Infinity #32; reduzierbar/schildbar). Heilung über C-Perks. `maxLife` = Startwert (Heilung cappt dort). |
| **XP** (`XP_PER_WIN = 10` je Sieg) | Sammelt bis zur Level-Schwelle. Überschuss bleibt erhalten; mehrere Level-Ups in einem Stich werden nacheinander abgearbeitet. |
| **XP-Kurve** (`leveling.js`) | `100, 120, 150, 190, 240, 300, 380, 480, 600, 750, 940, 1180, … 7050` (Level 1→20), danach ~×1,25 auf Zehner gerundet. Früh schnell, spät zäh. |
| **Level-Up** | Öffnet die Perk-Auswahl (`PERKS_OFFERED = 3` Optionen). Ist der Perk-Pool leer (alle 25 gewählt) → **keine Pause**, Spiel läuft weiter. |

---

## 7. Perk-System (35 Perks: 29 verbreitet + 6 legendär, 5 Kategorien) — `perks.js`

Datengetriebene Registry (analog zu `clauses.js` in TrickLadder). Jeder Perk ist **pro Lauf nur einmal** wählbar; bereits gewählte werden nicht mehr angeboten. Effekte laufen über optionale **Hooks**, die die Engine konsultiert:

- `onPick(deck, rng)` → neues Deck (einmalige, dauerhafte Kartenmod)
- `cardBonus(ctx)` → Wertbonus auf die Spielerkarte *dieses* Stichs
- `healOnWin(ctx)` / `dmgReduce()` / `healOnCycle()` → Lebens-Ökonomie
- `scoreMult(ctx)` (multiplikativ) / `scoreFlat(ctx)` (additiv) → Score
- **Legendär-Hooks (#33):** `winTie` (Gleichstand→Sieg), `extraDamageTaken` (Zusatzschaden), `critMultiplier` (Crit-Faktor überschreiben), `critChanceMult` (Faktor auf Crit-Chance), `tempoScoreFactorMult` (Tempo-Faktor).
- **Flags:** `shieldPerCycle`, `winTieAfterLoss`, `legendaryCritGain` (L4), `speedPct`

`ctx` je Stich: `{ posInCycle, trickNo, lastResult, lostLastTrick, winStreak, life, maxLife }` · je Sieg: `{ winValue, winStreak, wins }`.

**Rarität & Angebot (#33, Tuning #38):** Jeder Perk hat `rarity` (`common`/`legendary`, Default common). `buildOffer(owned, rng, count, level)` zieht **gewichtet** (`RARITY_WEIGHTS = { common: 100, legendary: 5 }`), deterministisch über den injizierten `rng`. Legendaries erscheinen **ab Level 2** (`LEGENDARY_MIN_LEVEL`) und **höchstens einer je Angebot** (`MAX_LEGENDARIES_PER_OFFER`) — Drop-Rate ~1 %/Slot bzw. ~3 %/Angebot (frischer Pool), steigend, wenn Commons weggewählt werden.

### A — Deck (violett): dauerhafte Kartenwerte (einmalig beim Pick)
| ID | Name | Effekt |
|---|---|---|
| A1 | Starke Fünfen | Alle Karten mit Wert 5 → **+2** Wert (dauerhaft). |
| A2 | Gerade Stärke | Alle Karten mit **geradem** Wert → +1. |
| A3 | Ungerade Stärke | Alle Karten mit **ungeradem** Wert → +1. |
| A4 | Farbverstärkung | Alle Karten **einer zufälligen Farbe** → +1. |
| A5 | Einzelnes Upgrade | Eine zufällige Karte mit Wert 0–3 → **+5**. |

### B — Stich (rot): temporärer Wertbonus auf die aktuelle Karte
| ID | Name | Effekt |
|---|---|---|
| B1 | Gegenangriff | Nach einem **verlorenen** Stich: nächste Karte +3. |
| B2 | Momentum | Bei Siegesserie durch 3 teilbar (3,6,9…): nächste Karte +5. |
| B3 | Starker Auftakt | **Erster** Stich jedes Deck-Durchlaufs: +5. |
| B4 | Zehnter Schlag | Jeder **10.** Stich: +4. |
| B5 | Initiative | Nach einer Niederlage gewinnst du den **nächsten Gleichstand** (Flag `winTieAfterLoss`). |

### C — Leben (grün): Überleben & Verteidigung
| ID | Name | Effekt |
|---|---|---|
| C1 | Lebensraub | Jeder Sieg heilt **1** Leben. |
| C2 | Verbesserter Lebensraub | Jeder Sieg heilt zusätzlich **2** Leben. |
| C3 | Panzerung | Verlorene Stiche: **−1** Schaden. |
| C4 | Zweite Luft | Nach jedem vollen Deck-Durchlauf: **+50** Leben. |
| C5 | Schutzschild | **Erster** verlorener Stich je Durchlauf: 0 Schaden (Flag `shieldPerCycle`). |

### D — Score (gold): Punkte
| ID | Name | Effekt |
|---|---|---|
| D1 | Punktebonus | Alle Siege: **+20 %** Score (`×1,2`). |
| D2 | Siegesserie | **Eskalierende Kombo:** je Sieg in Serie `+0,1×` (Serie 1→×1,1, 5→×1,5, 10→×2,0, 20→×3,0), **ohne Obergrenze**; Reset bei Niederlage. Ab **×1,5** floatet der Kombo-Wert im Battlefield. |
| D3 | Hohe Karten, hohe Belohnung | Sieg mit Kartenwert **≥8**: +3 Score. |
| D4 | Außenseitersieg | Sieg mit Kartenwert **≤3**: **doppelter** Score. |
| D5 | Zehnter Sieg | Jeder **10.** Sieg: +25 Score. |

### E — Tempo (blau): nur Geschwindigkeit (kein Kampfeffekt)
| ID | Name | Effekt |
|---|---|---|
| E1–E5 | Tempo I–V | Flip-Geschwindigkeit **+10 % / +20 % / +30 % / +40 % / +50 %** (kumulativ). |

### ★ Legendär (#33): mächtig, aber mit Nachteil — `rarity: "legendary"`, ab Level 2, gewichtet
| ID | Kat. | Name | Effekt (Vorteil + Nachteil) |
|---|---|---|---|
| L1 | Deck | Überladung | Alle Karten dauerhaft **+2** Wert — dafür verlorene Stiche **+3** Schaden. |
| L2 | Stich | Unaufhaltsam | Ab **3 Siegen in Folge** gewinnst du **alle Gleichstände**, bis die Serie endet. |
| L3 | Leben | Letztes Aufbäumen | Bei **≤ 25 % Leben**: alle Karten **+6** Wert (nur dieser Stich). |
| L4 | Score | Kritische Masse | Jeder Crit erhöht die Crit-Chance **dauerhaft +1 pp** (max **+30 pp**). |
| L5 | Score | Jackpot | Crits geben **×4** statt ×2 Score — dafür **zufällige Crit-Chance halbiert** (garantierte Crits unberührt). |
| L6 | Tempo | Raserei | **Tempo-Score-Bonus doppelt** — dafür verlorene Stiche **+2** Schaden. |

> Score-Werte sind **fraktional** (D-Perks multiplizieren) und werden zur Anzeige abgerundet. Score-Magnituden liegen als eigene Tuning-Konstanten (`D1_BONUS_PCT`, `D2_STEP`, …) im Tuning-Block. Legendär-Zusatzschaden (L1/L6) addiert auf den zeit-eskalierten Grundwert (#32); C3/C5 wirken weiter.

---

## 8. Score, Highscore & Geist

- **Score** wächst nur durch **Siege**, skaliert über die D-Perks. Er ist die einzige Ziel-Metrik des Laufs.
- **Basis-Siegesserie (#39):** jede Siegesserie hebt den Score-Mult **immer** um `STREAK_BASE_STEP = +2 %`/Stufe (gedeckelt `STREAK_BASE_CAP = +30 %`, Cap ab Serie 15) — auch **ohne** Perk D2. **D2** (Kombo, ungedeckelt) **verstärkt** die Serie zusätzlich multiplikativ. Der Header-Chip (#37) zieht damit auch ohne D2 mit der Serie hoch.
- **Lokale Bestenliste** (`storage.js`, `localStorage["as_highscores"]`, **Top 5**): Eintrag `{ score, level, tricks, cycles, ts }`. Sortierung: Score↓, dann mehr Stiche, dann jünger. Wird beim Game-Over **und** beim vorzeitigen Beenden gesichert (idempotent via Ref).
- **Geist** (`as_ghost`, getrennt von der Bestenliste): speichert nur den **Rekordlauf** als Score-Trajektorie (`traj[k]` = Score nach `(k+1)·GHOST_STEP` Stichen, `GHOST_STEP = 13`). Die StatusRail zeigt live den **Delta zum Rekord an genau dieser Stelle** („▲ +N vs. Rekord" / „⚑ Rekord-Distanz überholt"). Ein Step-Wechsel invalidiert alte Trajektorien.

---

## 9. Tempo & Steuerung

- **Basis-Tempo fest & ruhig:** `BASE_FLIP_MS = 2000` ms je Stich bei 0 % Speed. Beschleunigung **nur** über die E-Perks (`speedPct`), kein manueller Regler. Effektiver Takt = `2000 / (1 + speedPct/100)` (alle 5 E-Perks → 150 % → 800 ms).
- **Auto-Play** (Default an): ein Effekt plant nach jedem Stich den nächsten. **Manuell** möglich (Button „Nächster Stich").
- **Pause** hält Takt **und** Run-Timer an. Der Timer (`fmtDuration`) akkumuliert nur aktive `play`-Zeit — friert bei Pause und außerhalb von `play` ein.

---

## 10. UI-Komponenten (implementiert)

| Komponente | Rolle |
|---|---|
| `StartScreen` | Startbildschirm: „Neuer Run" + lokale Top-5-Bestenliste + Rekord + Zugang zur Anleitung (öffnet beim allerersten Start einmal automatisch). |
| `AnleitungModal` | **Schnellstart-Anleitung** (#12): 6 Kacheln (Auto-Stechspiel, Sieg/Niederlage/Gleichstand, Leben-Timer, Perks bei Level-Up, Deck-Durchlauf, Steuerung) + Kernidee-Fazit. |
| `Controls` | Pause/Weiter, Auto/Manuell, Nächster Stich, Beenden, Neustart. |
| `Battlefield` | Zwei verdeckte Deck-Stapel (Du/Gegner) mit Rest-Zähler, die zwei aufgedeckten Karten mit Deal-Animation, Ergebnis-Banner (GEWONNEN / GLEICHSTAND→SIEG / VERLOREN / GLEICHSTAND) + Score/Leben-Deltas. Trägt das **Stich-„Juice"** (s. u.). |
| `Card` / `CardBack` | Karte mit **effektivem** Kampfwert (groß), violettem Dauerhaft-Boost „+X", rotem Stich-Bonus „⚔ +X", Farb-Label, Sieg/Niederlage-Glow. |
| `BuildPanel` | Wachsender Build: gewählte Perks je Kategorie (klickbar → Beschreibung) **+ Deck-Wert-Histogramm** (macht A-Mods sichtbar; Werte >12 violett hervorgehoben). |
| `PerkSelect` | Level-Up-Overlay: 3 Perk-Karten je Kategorie-Farbe (Legendaries gold-violett hervorgehoben), „einmal pro Lauf" + Kern-Stats-Zeile (Leben/Crit/Tempo/Tempo-Score/Score-Mult, #40) + Build-Kontext (Perks + Histogramm, #22). |
| `PredictionSelect` | Ansage-Overlay (#36): Ergebnis-Banner des letzten Durchlaufs (EXAKT!/SEHR KNAPP!/KNAPP!/VERFEHLT + Bonus) + Eingabe `[−] Zahl [+]`/Slider (0–40) + „Ansage abgeben". |
| `StatusRail` | Leben-Balken (blitzt bei Schaden/Heilung), XP/Level-Balken, Kennzahlen (Score, Serie + beste Serie, Stiche, Durchlauf), Siege/Verluste/Quote %/Tempo, „Deck bis zum Mischen", Geist-Delta. |
| `GameOver` | Endbildschirm: großer Score, Zeit, Rekord-Marker, Statistik (Level/Stiche/Durchläufe/beste Serie/Perks), Perk-Liste, **Punkteverlauf-Graph** (Lauf vs. vorheriger Rekord, #35), Bestenliste, Neustart/Menü. |
| `Sparkline` | Geteilter Score-Verlauf-Graph (#30/#35): Lauf (gold) vs. Rekord (violett), auto-skaliert; kompakt in der StatusRail, größer im GameOver (`height`-Prop). |

**Stich-„Juice" / Game-Feel (#15):** Gewinner-Karte poppt (`as-pop`), aufsteigende Score-/Leben-Zahlen (`as-float`), Impact-Flash am Aufprall (`as-impact`), Leben-Balken-Flash bei Schaden/Heilung (`as-flash`), floatende Kombo-Anzeige ab ×1,5 (`as-combo`, #31), Hinweis-Float beim Stufenwechsel der Niederlagenkosten (`as-notice`, #32), Score-Multiplikator-Chip im Header mit Scale-Puls bei Anstieg (`as-multpulse`, #37). Alle Dauern sind an den Flip-Takt gekoppelt. `@media (prefers-reduced-motion: reduce)` schaltet Animationen praktisch ab (Barrierefreiheit).

---

## 11. Architektur

Harte Grenze wie in TrickLadder:

```
src/game/            reine Logik (kein React / Math.random / Date)
  constants.js       TUNING-BLOCK + Deck/Farben
  deck.js            buildDeck, makeRng, shuffle, shuffledOrder, clamp, fmtDuration
  engine.js          resolveTrick — Stich-Auflösung (pure, rng injiziert)
  perks.js           PERK_DEFS (25), CATEGORIES (A–E), buildOffer
  leveling.js        XP_CURVE, xpToNext
  reducer.js         initialState/menuState + reducer (Zustandsmaschine)
  storage.js         localStorage: Geist + Top-5-Bestenliste
src/ui/              StartScreen, Controls, Battlefield, Card, BuildPanel,
                     PerkSelect, StatusRail, GameOver
src/App.jsx          Autostich — useReducer-State, Effekte (Auto-Play-Takt,
                     Timer, Geist-Mitschrift, Highscore-Sicherung), Render
```

- `App.jsx` besitzt die Seiteneffekte, die der reine Layer nicht darf: `Math.random` (als `rng`-Payload injiziert), Timer/Uhr, `localStorage`, Auto-Play-`setTimeout`.
- **Farbschema:** Hintergrund dunkel (`#141419`/`#17171c`, Rand `#26262e`), Karten `#1c1c22`; Akzent violett `#8a7de0` (Marke „AUTO**STICH**"), Gold `#d4a63a` (Score), Grün `#5ab87a` (Leben), Rot `#e0605a` (Verlust). Tailwind v4.

---

## 12. Tuning-Konstanten (`constants.js`)

| Konstante | Wert | Bedeutung |
|---|---|---|
| `START_LIFE` | 2000 | Startleben (= Run-Puffer). |
| `DMG_PER_LOSS` | 10 | Basis-Schaden je Niederlage (Stufe 0). |
| `LOSS_COST_STEP` / `LOSS_COST_STEP_MS` | 5 / 5 min | Anti-Infinity (#32): +5 Schaden je 5 Min aktiver Zeit, ungedeckelt (`lossCostFor(elapsedMs)`). |
| `XP_PER_WIN` | 10 | XP je Sieg. |
| `SCORE_PER_WIN` | 1 | Basispunkt je Sieg (D-Perks skalieren darauf). |
| `PERKS_OFFERED` | 3 | Perks je Level-Up. |
| `TRICKS_PER_CYCLE` | 40 | Stiche je Deck-Durchlauf (= Deckgröße `SUIT_ORDER × RANKS`, abgeleitet). |
| `PREDICTION_MAX` | 40 | Max. Ansage (= `TRICKS_PER_CYCLE`, abgeleitet). Multiplikatoren `PREDICTION_*_MULT`: 3 / 1,75 / 1,25 / 1 (#36). |
| `BASE_FLIP_MS` | 2000 | ms je Stich bei 0 % Speed. |
| `VALUE_CAP` | `null` | Kein Kartenwert-Cap (bewusst). |
| `GHOST_STEP` | 13 | Geist-Score-Stützstelle alle N Stiche. |
| `D1_BONUS_PCT` 20 · `D2_STEP` 0.1 · `D3_HIGH_MIN` 10 · `D3_BONUS` 3 · `D4_LOW_MAX` 3 · `D4_MULT` 2 · `D5_BONUS` 25 | | Score-Perk-Magnituden. |

---

## 13. Tests & Deployment

- **Tests:** Vitest, nur der `game/`-Layer — **40 Fälle** über `deck` (3), `engine` (16), `leveling` (3), `perks` (9), `reducer` (7), `storage` (2). `npm test` / `npm run test:watch`.
- **Deployment:** GitHub Actions (`deploy.yml`) auf Push nach `main` → `npm ci` → `npm test` → `npm run build` → GitHub Pages. `vite.config.js`: `base = "/autostich/"` beim Build, `"/"` im Dev.
- **Befehle:** `npm run dev` · `npm run build` · `npm run preview`.

---

## 14. Beobachtungen / offene Punkte

Kein Bug-Report, nur was beim Durchlesen auffällt — als Diskussionsgrundlage:

1. **`initiative` ohne Wirkung.** Wird korrekt geführt, aber nirgends ausgewertet. Entweder eine geplante Mechanik (z. B. wer „anspielt") oder streichbar.
2. **Gegner rein passiv.** Der Gegner ist eine feste 1–10-Verteilung ohne eigene Progression. Die gesamte Spannung kommt aus deiner Deck-/Stich-Kurve gegen eine Konstante. Mögliche spätere Achse: skalierende Gegner je Durchlauf.
3. **Leben ≈ sehr großer Puffer.** 2000 Leben / 10 Schaden = 200 Netto-Verluste; mit C-Perks (Heilung/Schild) faktisch unbegrenzt. Der Lauf endet, wenn die Verlustrate die Heilung übersteigt — die Balance hängt stark daran, wie oft man verliert (also wie weit das Deck über 10 gehoben ist). Zusätzlich eskalieren die Niederlagenkosten zeitbasiert (#32).
4. **E-Perks (Tempo) konkurrieren mit „echten" Perks.** Da jeder Perk pro Lauf nur einmal kommt und Level-Ups begrenzt sind, ist ein Tempo-Perk ein Opportunitätskosten-Pick (schneller, aber nicht stärker) — bewusst so?
5. **Score-Skalierung ist multiplikativ stapelbar** (D2 × D4 × D1 …). Bei langen Läufen kann Score sehr schnell explodieren — im Playtest beobachten.

---

*Ende. Abgeleitet aus dem Code-Stand des Repos `GitGudMonkeh/autostich` (Branch `main`).*
