# Autostich — Gesamtübersicht

> **Roguelite-Autobattler-Stechspiel** (Prototyp, Vite + React).
> Eigenes Repo `GitGudMonkeh/autostich`, Deploy auf GitHub Pages unter `/autostich/`.
> UI-Text **Deutsch**, Code-Identifier **Englisch** — dieselbe Konvention wie TrickLadder.
>
> Stand: Prototyp, `main`. **171 Vitest-Fälle**, CI grün (Tests → Build → Pages).
> Enthält In-Game-Anleitung (#12), Stich-Feedback/„Juice" (#15), Crit-System, Ansage (#36),
> periodischen Leben-Abzug (#59) und den 70-Perk-Overhaul mit 3-Stufen-Rarität (#71).
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

**Bei Sieg:** Serie +1, `wins` +1, Score += `scoreBeforeCrit × (Crit? critMultiplier : 1)`, wobei
`scoreBeforeCrit = SCORE_PER_WIN × streakBaseMult(Serie) × Π scoreMult × tempoScoreMult + Σ scoreFlat`
(erst Multiplikatoren + Tempo, **dann** additive Boni, **dann** Crit). XP += 10, Heilung (`healOnWin` + bei Crit `healOnCrit`, C-/D-Perks), Initiative → Spieler.
**Bei Niederlage:** Serie → 0, Schaden = `max(0, DMG_PER_LOSS + Σ extraDamageTaken − Σ dmgReduce)`; ein **Schild** (C5) absorbiert den Rest-Schaden **vor** dem Leben. Leben −= (nicht absorbierter) Schaden, Initiative → Gegner; hat man B5, wird `tieArmed` scharf gestellt.
**Bei Gleichstand:** `ties` +1, Serie & Initiative unverändert.

**Crit (kritischer Treffer):** Nur bei Sieg. Crit-Chance = `Σ critChance-Hooks (+ L4-Bonus) × Π critChanceMult`, gedeckelt auf 100 %; alternativ **garantiert** (`guaranteedCrit`, z. B. D9). Ein Crit multipliziert den Stichscore mit `critMultiplier` (Basis ×2, L5 „Jackpot" überschreibt auf ×4). Über den injizierten `rng` gewürfelt → deterministisch. Roh-Chance **über** 100 % speist den Super-Crit (D19) und die Crit-Kette (L10).

> **Hinweis (ehrlich):** `initiative` (Spieler/Gegner) wird geführt und angezeigt-fähig gehalten, hat aber **aktuell keinen mechanischen Effekt** — im Autobattler gibt es keine Kartenwahl/Anspielreihenfolge, die davon abhinge. Vestigial / Reserve für spätere Regeln.

**Tod:** `life ≤ 0` → sofort `gameover` (kein Weiterziehen, kein Level-Up mehr).

---

## 5. Deck-Durchlauf (Cycle)

- Nach **40 Stichen** (`TRICKS_PER_CYCLE`, aus der Deckgröße abgeleitet) ist ein Durchlauf voll: `cycle` +1, `healOnCycle` (C4 +50, C7 Überlebensvorteil), dann die per-Durchlauf-Legendär-/Rare-Effekte (C9 Opfergabe −30, L9 Blutvertrag −100/+Stack, L11 Zeitraffer +Stack, L8 Schicksalsmaschine wählt den Schicksalswert), Schild (C5) lädt neu, `notfallUsed` zurückgesetzt, **Ansage-Auswertung** (#36) — dann Phase `prediction`. **Neu gemischt** wird **erst bei `SUBMIT_PREDICTION`** (`pos`→0, beide Reihenfolgen neu, `rng`-Payload), nicht mehr direkt am Durchlauf-Ende.

### Ansage-System (#36)
Ab dem **2. Durchlauf** schätzt der Spieler vor jeder neuen Runde, wie viele der 40 Stiche er gewinnt (`PredictionSelect`-Overlay, Auto-Play pausiert). Auswertung nach dem 40. Stich über die **Abweichung** `|Ansage − cycleWins|`: 0 → **×3**, 1 → **×1,75**, 2 → **×1,25**, ≥3 → **×1** (`PREDICTION_*_MULT`). Der Rundenscore (`cycleBaseScore`, alle Stichscores des Durchlaufs) wird mit dem Multiplikator verrechnet; **nur der Bonus** (`floor(cycleBaseScore × (mult−1))`) wird zusätzlich auf den Score addiert (kein Doppelzählen) und fließt voll in Bestenliste/Geist. Tod vor dem Durchlauf-Ende → kein Bonus (Ansage „nicht abgeschlossen"). Der erste Durchlauf läuft ohne Ansage (Referenz). Live-Anzeige in der StatusRail (Ansage · Siege · offen · „nicht mehr exakt erreichbar"); Game-Over zeigt exakte/knappe Ansagen + Ansage-Bonus.
- **Deck-Wertmods bleiben über Durchläufe erhalten** — die A-Perks sind dauerhaft. Die StatusRail zeigt „Deck bis zum Mischen" (Rest-Karten des laufenden Durchlaufs).

---

## 6. Leben, XP, Level-Up

| Größe | Wert / Regel |
|---|---|
| **Leben** (`life`, Start `START_LIFE = 2000`) | Fungiert als „Run-Timer". Verluste zehren daran (flat −`DMG_PER_LOSS = 10`, reduzierbar/schildbar). **Anti-Infinity (#59, ersetzt #32):** zusätzlich ein periodischer, quadratisch eskalierender Abzug — alle 2,5 Min aktiver Spielzeit −`lifeDrainAt(n) = 5·n²` (n = Intervall-Index): −5, −20, −45, −80 … kein Cap. App.jsx erkennt den Intervall-Wechsel und dispatcht `LIFE_DRAIN` mit dem Betrag (Determinismus). Heilung über C-Perks; `maxLife` = Startwert (Heilung cappt dort). |
| **XP** (`XP_PER_WIN = 10` je Sieg) | Sammelt bis zur Level-Schwelle. Überschuss bleibt erhalten; mehrere Level-Ups in einem Stich werden nacheinander abgearbeitet. |
| **XP-Kurve** (`leveling.js`) | `100, 120, 150, 190, 240, 300, 380, 480, 600, 750, 940, 1180, … 7050` (Level 1→20), danach ~×1,25 auf Zehner gerundet. Früh schnell, spät zäh. |
| **Level-Up** | Öffnet die Perk-Auswahl (`PERKS_OFFERED = 3` Optionen). Ist der Perk-Pool leer (alle wählbaren der 70 gewählt) → **keine Pause**, Spiel läuft weiter. Mehrfach-Level-Ups werden als Queue nacheinander angeboten (#57). |

---

## 7. Perk-System (70 Perks: 35 normal · 24 selten · 11 legendär, 5 Kategorien) — `perks.js`

Datengetriebene Registry (analog zu `clauses.js` in TrickLadder). Jeder Perk ist **pro Lauf nur einmal** wählbar; bereits gewählte werden nicht mehr angeboten. Effekte laufen über optionale **Hooks**, die die Engine konsultiert:

- `onPick(deck, rng)` → neues Deck (einmalige, dauerhafte Kartenmod)
- `cardBonus(ctx)` → Wertbonus auf die Spielerkarte *dieses* Stichs
- `healOnWin(ctx)` / `healOnCrit(ctx)` / `dmgReduce(ctx)` / `healOnCycle({deck})` → Lebens-Ökonomie
- `scoreMult(ctx)` (multiplikativ) / `scoreFlat(ctx)` (additiv) → Score
- `critChance(ctx)` / `guaranteedCrit(ctx)` → Crit-Chance bzw. garantierter Crit
- **Legendär-Hooks:** `winTie` (Gleichstand→Sieg), `extraDamageTaken` (Zusatzschaden), `critMultiplier` (Crit-Faktor überschreiben), `critChanceMult` (Faktor auf Crit-Chance), `tempoScoreFactorMult` (Tempo-Faktor).
- **Flags (Engine-/Reducer-State):** `speedPct`, `shieldPerCycle`, `winTieAfterLoss`, `legendaryCritGain` (L4), `cleanRunHeal` (C8), `sacrificeCycle` (C9), `emergencyHeal` (C10), `ueberzahl` (B10), `hochlauf` (E9), `ruheVorDemSturm` (E10), `superCrit` (D19), `kingmaker` (L7), `schicksal` (L8), `bloodPact` (L9), `chainCrit` (L10), `zeitraffer` (L11).

`ctx` je Stich: `{ posInCycle, trickNo, lastResult, lostLastTrick, winStreak, sinceWin, lossStreak, ascChain, fateValue, life, maxLife }` (+ `pValueBase` im `cardBonus`). `ctx` je Sieg (`wctx`): `{ winValue, margin, winStreak, wins, speedPct, lastWinValue, altLen, critFollowArmed, misfireBonus, weaknessArmed, suitStreak, recentWinCount, baseValue, fateValue, bloodStacks, zeitrafferStacks }`.

**Rarität & Angebot (#71):** Drei Stufen — `common` (Default, „normal"), `rare`, `legendary`. `buildOffer(owned, rng, count, level)` zieht **gewichtet ohne Zurücklegen** über den injizierten `rng` (`RARITY_WEIGHTS = { common: 100, rare: 25, legendary: 4 }`). Level-Gates: Seltene ab `RARE_MIN_LEVEL = 2`, Legendaries ab `LEGENDARY_MIN_LEVEL = 5`, höchstens **einer** je Angebot (`MAX_LEGENDARIES_PER_OFFER = 1`). Kein garantierter Legendary-Drop.

**Balance-Logik:** Normale Perks wirken sofort ohne Vorbedingung; **seltene** haben höhere Spitzen, brauchen aber Wertstruktur / Serie / Lebenszustand / bestimmte Ergebnisse / andere Tempo-/Crit-Picks; **legendäre** sind regelverändernde Motoren, meist mit Nachteil. Heilmaximum bleibt `maxLife` (keine Überheilung); Schild ist die einzige separate Schadensressource.

### A — Deck (violett): dauerhafte Kartenwerte (einmalig beim Pick)
| ID | Name | Rarität | Effekt |
|---|---|---|---|
| A1 | Starke Fünfen | normal | Alle Karten mit Wert 5 → **+6** (dauerhaft). |
| A2 | Gerade Stärke | normal | Alle Karten mit **geradem** Wert → +1. |
| A3 | Ungerade Stärke | normal | Alle Karten mit **ungeradem** Wert → +1. |
| A4 | Farbverstärkung | normal | Alle Karten **einer zufälligen Farbe** → +2. |
| A5 | Kleine ganz groß | normal | Vier zufällige Karten mit Wert 1–3 → je **+6**. |
| A6 | Mittelklasse | normal | Alle Karten mit Wert 4–7 → **+2**. |
| A7 | Spitzenförderung | normal | Die vier aktuell **höchsten** Karten → je **+6**. |
| A8 | Nachzügler | normal | Die vier aktuell **niedrigsten** Karten → je **+6**. |
| A9 | Farbduell | **selten** | Eine zufällige Farbe → **+3**, eine andere zufällige Farbe → **−1**. |
| A10 | Verdichtung | **selten** | Alle Karten, deren Wert **mehrfach** im Deck vorkommt → +1. |

### B — Stich (rot): Wertbonus auf die aktuelle Karte / Stich-Effekt
| ID | Name | Rarität | Effekt |
|---|---|---|---|
| B1 | Gegenangriff | normal | Nach einer **Niederlage**: nächste Karte +2. |
| B2 | Momentum | normal | Jeder **3.** Sieg der laufenden Serie (3/6/9…): +6. |
| B3 | Starker Auftakt | normal | Die **ersten drei** Stiche jedes Durchlaufs: je +4. |
| B4 | Zehnter Schlag | normal | Jeder **10.** Stich: +8. |
| B5 | Initiative | normal | Nach Niederlage: nächste Karte +2 **und** du gewinnst den nächsten Gleichstand. |
| B6 | Knappe Kiste | normal | Sieg mit **exakt 1** Wertpunkt Vorsprung: **+100 Score**. |
| B7 | Durchbruch | normal | Nach **5 Stichen ohne Sieg**: nächste Karte **+10** (Sieg resettet). |
| B8 | Revanche | **selten** | Nach **2** Niederlagen in Folge: nächste Karte **+7**. |
| B9 | Perfekte Folge | **selten** | Streng **ansteigende** Werte: je Folgekarte +1/+2/+3 … max **+5**. |
| B10 | Überzahl | **selten** | Sieg mit ≥5 Vorsprung zählt für **Serien-Effekte doppelt** (Statistik bleibt 1 Sieg). |

### C — Leben (grün): Überleben & Verteidigung
| ID | Name | Rarität | Effekt |
|---|---|---|---|
| C1 | Lebensraub | normal | Jeder Sieg heilt **2**. |
| C2 | Triumph | normal | Sieg mit Kartenwert **≥8** heilt **6**. |
| C3 | Panzerung | normal | Verlorene Stiche: **−2** Schaden. |
| C4 | Zweite Luft | normal | Nach jedem vollen Durchlauf: **+50** Leben. |
| C5 | Schutzschild | normal | Je Durchlauf **50 Schildpunkte** (absorbieren Schaden vor dem Leben). |
| C6 | Trotz | normal | Unter 50 % Leben −1 Schaden; bei ≤25 % insgesamt **−2**. |
| C7 | Überlebensvorteil | **selten** | Nach jedem Durchlauf **4 Leben je eigener Karte mit Wert ≥13** (max 60). |
| C8 | Sauberer Durchlauf | **selten** | **10 Stiche** in Folge ohne echten Lebensverlust: **+15** (Schild-Absorption zählt als sauber). |
| C9 | Opfergabe | **selten** | Durchlauf-Beginn **−30** Leben (kann nicht töten); dafür **+20 %** Score. |
| C10 | Notfallration | **selten** | **1×** je Durchlauf bei ≤25 % Leben: **+40**. |

### D — Score & Crit (gold)
| ID | Name | Rarität | Effekt |
|---|---|---|---|
| D1 | Punktebonus | normal | Alle Siege: **+15 %** Score. |
| D2 | Siegesserie | normal | **Eskalierende Kombo:** je Sieg in Serie +10 % (Serie 5→×1,5, 10→×2,0, 20→×3,0), **ohne Cap**; Reset bei Niederlage. Ab **×1,5** floatet der Kombo-Wert. |
| D3 | Hohe Karten, hohe Belohnung | normal | Sieg mit Kartenwert **≥8**: +60 Score. |
| D4 | Außenseitersieg | normal | Sieg mit Kartenwert **≤3**: **×3** Score. |
| D5 | Zehnter Sieg | normal | Jeder **10.** Sieg: +300 Score. |
| D6 | Kritische Chance | normal | **+12 %** Crit-Chance (Crit ×2 Score). |
| D7 | Geschärfter Blick | normal | Sieg mit Kartenwert **≥8**: **+35 %** Crit-Chance. |
| D8 | Kritisches Momentum | normal | Je Serienstufe **+4 %** Crit-Chance (max +40 %). |
| D9 | Perfekter Rhythmus | normal | Jeder **10.** Sieg garantiert kritisch. |
| D10 | Übermacht | **selten** | Siege mit ≥8 Vorsprung: **×2** Score. |
| D11 | Kritische Heilung | **selten** | Jeder Crit heilt **5**. |
| D12 | Präzision | **selten** | Sieg mit **demselben** Wert wie beim vorherigen Sieg: **×3** Score. |
| D13 | Wechselspiel | **selten** | Im Sieg/Niederlage-**Wechselmuster**: jeder weitere Sieg +100. |
| D14 | Crit-Folge | **selten** | Nach einem Crit: nächster Sieg **+20 %** Crit-Chance. |
| D15 | Fehlzündung | **selten** | Je Sieg **ohne** Crit +3 pp Crit (max +30 pp); Crit setzt zurück. |
| D16 | Schwachstellenanalyse | **selten** | Niederlage mit ≥5 Abstand: nächster Sieg **+40 %** Crit-Chance. |
| D17 | Farbserie | **selten** | Siege in Folge gleicher **Farbe**: +75/+100/… (max +200). |
| D18 | Volles Haus | **selten** | ≥4 Siege in den letzten **5** Stichen: aktueller Sieg +250. |
| D19 | Überschusskrit | **selten** | Crit-Chance **>100 %** → Chance auf **Super-Crit** (×1,5 auf den Crit-Faktor). |

### E — Tempo (blau): Geschwindigkeit (hebt zusätzlich den Score über den Tempo-Faktor)
| ID | Name | Rarität | Effekt |
|---|---|---|---|
| E1–E5 | Tempo I–V | normal | Flip-Geschwindigkeit je **+30 %** (kumulativ 150 %). Tempo hebt auch den Tempo-Score. |
| E6 | Drehzahl | **selten** | Je 30 % **permanentes** Tempo +5 % Crit-Chance (150 % → +25 %). |
| E7 | Kontrollverlust | **selten** | Ab 100 % Tempo **+30 %** Score; Niederlagen +1 Schaden. |
| E8 | Schnellschuss | **selten** | Jeder **10.** Stich bei Sieg: +150 Score. |
| E9 | Hochlauf | **selten** | Je Sieg **+2 %** temporäres Tempo (max +40 %); Niederlage −10 pp. |
| E10 | Ruhe vor dem Sturm | **selten** | Nach einem Gleichstand laufen 5 Stiche **50 % schneller**. |

### ★ Legendär (#33/#71): mächtig, oft mit Nachteil — `rarity: "legendary"`, ab Level 5, gewichtet
| ID | Kat. | Name | Effekt (Vorteil + Nachteil) |
|---|---|---|---|
| L1 | Deck | Überladung | Alle Karten dauerhaft **+2** — dafür Niederlagen **+3** Schaden. |
| L2 | Stich | Unaufhaltsam | Ab **3 Siegen in Folge** gewinnst du **alle Gleichstände**, bis die Serie endet. |
| L3 | Leben | Letztes Aufbäumen | Bei **≤25 % Leben**: alle Karten **+3** (nur dieser Stich). |
| L4 | Score | Kritische Masse | Jeder Crit **+1 pp** dauerhafte Crit-Chance (max +30 pp). |
| L5 | Score | Jackpot | Crits **×4** statt ×2 — dafür **zufällige** Crit-Chance halbiert (garantierte unberührt). |
| L6 | Tempo | Raserei | **Tempo-Score-Bonus doppelt** — dafür Niederlagen **+2** Schaden. |
| L7 | Deck | Königsmacher | Erreicht eine Karte durch Aufwertungen erstmals Wert **≥13** → dauerhaft **+2** (je Karte 1×). |
| L8 | Deck | Schicksalsmaschine | Je Durchlauf zufälliger Kartenwert; diese Karten **+8** Wert **und** bei Sieg **×2** Score. |
| L9 | Leben | Blutvertrag | Durchlauf-Beginn **100 Leben** opfern → dauerhaft **+20 %** Score/Stack (max 5×). Nur bei >100 Leben, kann nicht töten. |
| L10 | Score | Kettenreaktion | Ein Crit **kettet** (Chance = halbe finale Crit-Chance), je Stufe ×2 (max 3: ×2→×4→×8→×16). |
| L11 | Tempo | Zeitraffer | Tempo-Boni **×2** auf die **reale** Speed (Tempo-Score normal); je Durchlauf **+10 %** Score (max +50 %). |

> Score-Werte sind **fraktional** (D-Perks multiplizieren) und werden zur Anzeige abgerundet. Score-Magnituden liegen als eigene Tuning-Konstanten (`D1_BONUS_PCT`, `D2_STEP`, `D3_BONUS`, …) im Tuning-Block. Legendär-Zusatzschaden (L1/L6/E7) addiert auf den flat Grundschaden; C3/C6/C5 wirken weiter.

---

## 8. Score, Highscore & Geist

- **Score** wächst nur durch **Siege**, skaliert über die D-Perks. Er ist die einzige Ziel-Metrik des Laufs.
- **Basis-Siegesserie (#39):** jede Siegesserie hebt den Score-Mult **immer** um `STREAK_BASE_STEP = +2 %`/Stufe (gedeckelt `STREAK_BASE_CAP = +30 %`, Cap ab Serie 15) — auch **ohne** Perk D2. **D2** (Kombo, ungedeckelt) **verstärkt** die Serie zusätzlich multiplikativ. Der Header-Chip (#37) zieht damit auch ohne D2 mit der Serie hoch.
- **Lokale Bestenliste** (`storage.js`, `localStorage["as_highscores"]`, **Top 5**): Eintrag `{ score, level, tricks, cycles, ts }`. Sortierung: Score↓, dann mehr Stiche, dann jünger. Wird beim Game-Over **und** beim vorzeitigen Beenden gesichert (idempotent via Ref).
- **Geist** (`as_ghost`, getrennt von der Bestenliste): speichert nur den **Rekordlauf** als Score-Trajektorie (`traj[k]` = Score nach `(k+1)·GHOST_STEP` Stichen, `GHOST_STEP = 13`). Die StatusRail zeigt live den **Delta zum Rekord an genau dieser Stelle** („▲ +N vs. Rekord" / „⚑ Rekord-Distanz überholt"). Ein Step-Wechsel invalidiert alte Trajektorien.

---

## 9. Tempo & Steuerung

- **Basis-Tempo fest & ruhig:** `BASE_FLIP_MS = 1750` ms je Stich bei 0 % Speed. Beschleunigung über die permanenten E-Perks (`speedPct`) plus **temporäres Tempo** (`tempTempo`: E9 Hochlauf-Rampe, E10 Ruhe-Burst). Effektiver Takt = `BASE_FLIP_MS / (1 + (speedPct + tempTempo)/100) / Turbo` (alle 5 E-Perks → 150 % → 700 ms). **L11 Zeitraffer** verdoppelt die Tempo-Boni **nur** für die reale Anzeige (der Tempo-Score bleibt einfach). Turbo-Buttons (2×/3×) beschleunigen zusätzlich Ablauf + Animation, **nicht** den Score.
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

**Stich-„Juice" / Game-Feel (#15):** Gewinner-Karte poppt (`as-pop`), aufsteigende Score-/Leben-Zahlen (`as-float`), Impact-Flash am Aufprall (`as-impact`), Leben-Balken-Flash bei Schaden/Heilung (`as-flash`), floatende Kombo-Anzeige ab ×1,5 (`as-combo`, #31), Hinweis-Float beim periodischen Leben-Abzug (`as-notice`, #59), Score-Multiplikator-Chip im Header mit Scale-Puls bei Anstieg (`as-multpulse`, #37). Alle Dauern sind an den Flip-Takt gekoppelt. `@media (prefers-reduced-motion: reduce)` schaltet Animationen praktisch ab (Barrierefreiheit).

---

## 11. Architektur

Harte Grenze wie in TrickLadder:

```
src/game/            reine Logik (kein React / Math.random / Date)
  constants.js       TUNING-BLOCK + Deck/Farben
  deck.js            buildDeck, makeRng, shuffle, shuffledOrder, clamp, fmtDuration
  engine.js          resolveTrick — Stich-Auflösung (pure, rng injiziert)
  perks.js           PERK_DEFS (70), CATEGORIES (A–E), buildOffer, critChanceFor/critChanceRawFor
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
| `DMG_PER_LOSS` | 10 | Flat-Schaden je Niederlage. |
| `LIFE_DRAIN_INTERVAL_MS` / `LIFE_DRAIN_BASE` | 2,5 min / 5 | Anti-Infinity (#59): alle 2,5 Min −`lifeDrainAt(n) = 5·n²` (quadratisch, kein Cap). |
| `XP_PER_WIN` | 10 | XP je Sieg. |
| `SCORE_PER_WIN` | 100 | Basispunkte je Sieg (Perks/Tempo skalieren darauf). |
| `TEMPO_SCORE_FACTOR` | 0.005 | Je %-Punkt `speedPct` +0,5 % Stichscore. |
| `CRIT_BASE_MULT` | 2 | Crit verdoppelt den Stichscore (L5 überschreibt auf 4). |
| `PERKS_OFFERED` | 3 | Perks je Level-Up. |
| `TRICKS_PER_CYCLE` | 40 | Stiche je Deck-Durchlauf (= 4 Farben × 10 Werte, abgeleitet). |
| `PREDICTION_MAX` | 40 | Max. Ansage (= `TRICKS_PER_CYCLE`). Multiplikatoren `PREDICTION_*_MULT`: 3 / 1,75 / 1,25 / 1 (#36). |
| `BASE_FLIP_MS` | 1750 | ms je Stich bei 0 % Speed. |
| `VALUE_CAP` | `null` | Kein Kartenwert-Cap (bewusst). |
| `GHOST_STEP` | 13 | Geist-Score-Stützstelle alle N Stiche. |
| **Rarität (#71)** | | `RARITY_WEIGHTS { common:100, rare:25, legendary:4 }` · `RARE_MIN_LEVEL 2` · `LEGENDARY_MIN_LEVEL 5` · `MAX_LEGENDARIES_PER_OFFER 1`. |
| **Siegesserie (#39)** | | `STREAK_BASE_STEP 0.02` · `STREAK_BASE_CAP 0.30` (Basis) · `D2_STEP 0.10` (Kombo, ohne Cap). |
| **Score-Magnituden** | | `D1_BONUS_PCT 15` · `D3_HIGH_MIN 8` · `D3_BONUS 60` · `D4_LOW_MAX 3` · `D4_MULT 3` · `D5_BONUS 300`. |
| **Legendär/Crit** | | `L4_CRIT_STEP 0.01` · `L4_CRIT_CAP 0.30` · `SUPERCRIT_MULT_FACTOR 1.5` (D19) · `CHAIN_MAX_STAGES 3` (L10). |
| **Rare-Konstanten (#71)** | | Überlebensvorteil (`SURVIVAL_*`), Sauberer Durchlauf (`CLEAN_RUN_*`), Opfergabe (`SACRIFICE_*`), Notfallration (`EMERGENCY_HEAL`), Hochlauf/Ruhe (`RAMP_TEMPO_*`, `CALM_*`), Blutvertrag (`BLOOD_*`), Königsmacher (`KINGMAKER_*`), Schicksalsmaschine (`FATE_*`), Zeitraffer (`ZEITRAFFER_*`). |

---

## 13. Tests & Deployment

- **Tests:** Vitest, nur der `game/`-Layer — **171 Fälle** über `deck` (3), `engine` (80), `leveling` (3), `perks` (62), `reducer` (21), `storage` (2). `npm test` / `npm run test:watch`.
- **Deployment:** GitHub Actions (`deploy.yml`) auf Push nach `main` → `npm ci` → `npm test` → `npm run build` → GitHub Pages. `vite.config.js`: `base = "/autostich/"` beim Build, `"/"` im Dev.
- **Befehle:** `npm run dev` · `npm run build` · `npm run preview`.

---

## 14. Beobachtungen / offene Punkte

Kein Bug-Report, nur was beim Durchlesen auffällt — als Diskussionsgrundlage:

1. **`initiative` ohne Wirkung.** Wird korrekt geführt, aber nirgends ausgewertet. Entweder eine geplante Mechanik (z. B. wer „anspielt") oder streichbar.
2. **Gegner rein passiv.** Der Gegner ist eine feste 1–10-Verteilung ohne eigene Progression. Die gesamte Spannung kommt aus deiner Deck-/Stich-Kurve gegen eine Konstante. Mögliche spätere Achse: skalierende Gegner je Durchlauf.
3. **Leben ≈ sehr großer Puffer.** 2000 Leben / 10 Schaden = 200 Netto-Verluste; mit C-Perks (Heilung/Schild) faktisch unbegrenzt. Der Lauf endet, wenn die Verlustrate die Heilung übersteigt — die Balance hängt stark daran, wie oft man verliert (also wie weit das Deck über 10 gehoben ist). Zusätzlich zwingt der periodische, quadratisch eskalierende Leben-Abzug (#59, `5·n²` alle 2,5 Min) auch reine Heil-Builds irgendwann in die Knie.
4. **E-Perks (Tempo) konkurrieren mit „echten" Perks.** Da jeder Perk pro Lauf nur einmal kommt und Level-Ups begrenzt sind, ist ein Tempo-Perk ein Opportunitätskosten-Pick (schneller, aber nicht stärker) — bewusst so?
5. **Score-Skalierung ist multiplikativ stapelbar** (D2 × D4 × D1 …). Bei langen Läufen kann Score sehr schnell explodieren — im Playtest beobachten.

---

*Ende. Abgeleitet aus dem Code-Stand des Repos `GitGudMonkeh/autostich` (Branch `main`).*
