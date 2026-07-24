# Autostich — Stand des Test-Builds (`Autostich_Test`)

> **Stand:** 2026-07-24 · Branch `Autostich_Test` · Live unter `…/autostich/test/`
> Diese Testumgebung wird **nie** nach `main` gemergt. Nordstern-Doc: [`docs/autostich-v2-plan.md`](autostich-v2-plan.md).
> Autoritative Quelle für offene Skill-Archetypen: **GitHub-Issue #93** (im Issue gehalten, kein Repo-Doc).

Autostich ist ein **Roguelite-Autobattler-Stechspiel**: dein Deck spielt automatisch Stich um Stich gegen einen neutralen Gegner, du formst zwischen den Durchläufen deinen Build aus Stats, Perks, Skills und der Deck-Aufstellung. Ziel ist maximaler **Score** (kein Leben mehr) über einen festen Run.

UI-Text ist Deutsch, der Code englisch. Die `game/`-Schicht ist rein deterministisch (kein `Math.random`/`Date` — Zufall kommt als seedbarer `rng` herein).

---

## 1. Run-Struktur (V2 §22)

- **Fester Run über genau 40 Deck-Durchläufe** (`MAX_CYCLES = 40`), danach Ende — **kein Leben, kein vorzeitiger Tod**. „Aufgeben" bleibt möglich.
- Ein Deck = **40 Karten** (4 Farben R/B/G/Y × Werte 1–10). Pro Durchlauf werden alle 40 gespielt → **1.600 Stiche** pro Run.
- **Start-Reihenfolge** deines Decks = einmaliger **Seed-Shuffle** beim Run-Start. Die **Spieler-Reihenfolge ist danach persistent** — nur das **Gegnerdeck** wird pro Durchlauf neu gemischt.
- Der Gegner ist **neutral** (fester Kartenwert, keine Boni). Höherer Wert gewinnt; Gleichstand ist standardmäßig kein Sieg (außer über bestimmte Perks/Skills).
- **Tempo** (Speed 1×/2×/3×/4×) ist rein Anzeige und **score-neutral**.

### Entscheidungszyklus (§22.2)
Vor jedem neuen Durchlauf gibt es eine Entscheidung nach festem Muster `DECISION_CYCLE = [Stat, Perk, Formation, Stat, Perk, Skill]` (Index `cycle % 6`). Über 40 Durchläufe ergibt das grob **14× Stat · 13× Perk · 7× Formation · 6× Skill**.

---

## 2. Score-System

Der Score eines gewonnenen Stichs entsteht aus einer additiven Basis, die dann mehrfach multipliziert wird:

```
Basis        = 100 (SCORE_PER_WIN) + Σ Flat-Boni (Perks D + Crit-Flats + Ionisierung + Gewitterfront + L5-Jackpot)
scoreBeforeCrit = Basis × Serie × Perk-Mult × Serien-Stat × Formation × Formations-Stat
gained       = scoreBeforeCrit × (Crit ? Crit-Faktor : 1)
```

- **Serie (immer aktiv, #39):** je Serienstufe +2 %, gedeckelt bei +30 % (`STREAK_BASE_STEP/CAP`).
- **Crit:** Basis-Crit-Faktor **×1,5** (`CRIT_BASE_MULT`). Die **Crit-Chance kommt ausschließlich aus dem Crit-Chance-Stat und dem Blitz-Archetyp** — nicht mehr aus Perks. Der Crit-Mult-Stat hebt den Faktor über 1,5.
- **Treffer-Aufschlüsselung (§17):** bei nennenswerten Siegen zeigt das Spielfeld unter dem Banner die exakte Faktorenkette, z. B. `100 Basis · +250 Flats · ×1,12 Serie · ×2,40 Form · ×3,00 Crit · = …` (aus `lastTrick.breakdown`, driftfrei).

---

## 3. Stat-System (§22.3)

Bei jeder **Stat-Runde** werden **immer alle vier** Stats angeboten, du wählst genau einen. Additiv, keine Caps, keine Diminishing Returns, beliebig oft wählbar. Werte nach Balancing-Pass **#94**:

| Stat | Effekt je Pick | Wirkung |
|---|---|---|
| **Crit-Chance** | **+5 Prozentpunkte** | additive Crit-Wahrscheinlichkeit |
| **Crit-Multiplikator** | **+0,2×** | hebt den Crit-Faktor über die Basis 1,5× |
| **Formations-Multiplikator** | **+5 %** | Score-Bonus bei einem Sieg mit ≥1 aktiver Formation (max 1×/Stich) |
| **Serien-Multiplikator** | **+2 % je Serienpunkt** | multipliziert den Stichscore mit dem aktuellen Serienstand |

---

## 4. Formations-System (§22.7)

Aus der **persistenten Spieler-Reihenfolge** und den **Dauerwerten** der Karten wird pro Position ein **Formations-Multiplikator** berechnet (zu Durchlauf-Beginn, stabil für den ganzen Durchlauf; greift nur bei **Sieg** der Karte). Basis-Formationen sind **segmentgebunden** — ein „Segment" (Arena) umfasst 5 Karten, Läufe enden an Segmentgrenzen (außer E9 hebt das auf).

| Formation | Bedingung | Faktoren |
|---|---|---|
| **Wiederholung** | ≥2 gleiche Werte | 2.→×1,30 · 3.→×1,60 · 4.+→×2,00 |
| **Farbblock** | ≥3 gleiche Farbe | ab 3.→×1,30, je weitere +0,15 |
| **Treppe** | ≥3 streng steigend | ab 3.→×1,25, je weitere +0,15 |
| **Wechsel** (Zick-Zack) | ≥3 alternierend, Nachbardifferenz ≥6 | ab 3.→×1,25, je weitere +0,15 |
| **Anker** (E7/E8) | einzelne Position | ×1,25 (zählt als Formation) |

Mehrere Formationen auf einer Karte **stapeln** (Produkt der Faktoren). Kategorie-C-Rollen und -E-Werkzeuge biegen die Erkennung (Joker, Bindeglied, Lückentoleranz usw. — siehe Perk-Tabellen).

### Formationsphase — Deck-Aufstellung (§22.8)
Alle paar Durchläufe pausiert der Run und öffnet die **Aufstellung**: du **tauschst je zwei Karten** (1 Energie pro Tausch, **4 Energie** je Phase, `FORMATION_ENERGY`). Formationen werden nach jedem Tausch live neu berechnet; Undo/Zurücksetzen erstatten Energie. Perk **E10 „Feinjustierung"** gibt einen zusätzlichen kostenlosen Tausch.

---

## 5. Perk-System — 70 Perks

Perks werden nach Perk-Runden aus einem 3er-Angebot gewählt, **gewichtet nach Seltenheit** (Normal/Legendär; höchstens 1 Legendär je Angebot). Sechs Kategorien:

### A — Deck-Modifikation (einmalig beim Pick, dauerhaft)
| ID | Name | Beschreibung |
|---|---|---|
| A1 | Starke Fünfen | Alle Karten mit Wert 5 → dauerhaft +4. |
| A2 | Gerade Stärke | Alle geraden Werte → +1. |
| A3 | Ungerade Stärke | Alle ungeraden Werte → +1. |
| A4 | Farbverstärkung | Eine zufällige Farbe → +2. |
| A5 | Kleine ganz groß | Vier zufällige Karten mit Ursprungswert 1–3 → je +5. |
| A6 | Mittelklasse | Alle Karten mit aktuellem Wert 4–7 → +1. |
| A7 | Spitzenförderung | Die vier höchsten Karten → je +4. |
| A8 | Nachzügler | Die vier niedrigsten Karten → je +5. |
| A9 | Farbduell | Eine zufällige Farbe +3, eine andere −1. |
| A10 | Verdichtung | Karten, deren Wert mehrfach vorkommt, → +1. |

### B — Stich-Effekte (temporärer Wertbonus auf die aktuelle Karte)
| ID | Name | Beschreibung |
|---|---|---|
| B1 | Gegenangriff | Nach verlorenem Stich: nächste Karte +4. |
| B2 | Momentum | Nach genau 3 Siegen in Folge: nächste Karte +5 (einmalig). |
| B3 | Starker Auftakt | Erste drei Karten jedes Durchlaufs +4. |
| B4 | Zehnter Schlag | Positionen 10/20/30/40 → +8. |
| B5 | Initiative | Nach einer Niederlage gewinnst du den nächsten Gleichstand. |
| B6 | Knappe Kiste | Karte in einer Wiederholung → +2. |
| B7 | Durchbruch | Nach 5 Stichen ohne Sieg: nächste Karte +10. |
| B8 | Revanche | Nach 2 Niederlagen in Folge: nächste Karte +7. |
| B9 | Perfekte Folge | Karten einer Treppe je nach Position +1/+2/+3/+4. |
| B10 | Überzahl | Höherer Dauerwert als der direkte Vorgänger → +3. |

### C — Kartenrollen (meist mit manueller Kartenauswahl)
| ID | Name | Beschreibung |
|---|---|---|
| C1 | Vorhut | 3 Karten wählen: auf Position 1–5 → +3. |
| C2 | Triumph | 3 Karten wählen: nach einem Sieg beim nächsten Auftauchen +2. |
| C3 | Leibwache | 2 Karten wählen: verliert ihr Vorgänger, +5. |
| C4 | Staffelläufer | 3 Karten wählen: nach ihrem Sieg direkter Nachfolger +2. |
| C5 | Anführer | 1 Karte wählen: nach ihrem Sieg die nächsten zwei Karten +2. |
| C6 | Finisher | 2 Karten wählen: auf der letzten Segmentposition +5. |
| C7 | Überlebensvorteil | Die niedrigste Karte jedes Segments → +3. |
| C8 | Joker | 2 Karten wählen: zählen für Farbblock als Farbe ihres Vorgängers. |
| C9 | Opfergabe | 1 Karte wählen: −3 Dauerwert, ihr Nachfolger +5 Dauerwert. |
| C10 | Bindeglied | 2 Karten wählen: für Treppen als ±1 Wert zählbar. |

### D — Flat Score (additiv, fließt in die multiplizierte Basis)
| ID | Name | Beschreibung |
|---|---|---|
| D1 | Punktebonus | Sieg mit ≥1 aktiver Formation → +75. |
| D2 | Siegesserie | +25 je Serienpunkt, max +250. |
| D3 | Hohe Karten, hohe Belohnung | Sieg mit Kartenwert ≥8 → +125. |
| D4 | Außenseitersieg | Sieg mit Kartenwert ≤3 → +300. |
| D5 | Zehnter Sieg | Jeder 10. Sieg → +750. |
| D6 | Kritische Chance | Jeder Crit → +150. |
| D7 | Geschärfter Blick | Crit mit Kartenwert ≥8 → +300. |
| D8 | Kritisches Momentum | Crit ab Serie 2 → +200. |
| D9 | Perfekter Rhythmus | Jeder 5. Sieg → +300. |
| D10 | Übermacht | Sieg mit ≥8 Vorsprung → +350. |
| D11 | Kritische Ernte | Crit mit Karte in aktiver Formation → +250. |
| D12 | Präzision | Zwei Siege in Folge mit demselben Kartenwert → +400 auf den zweiten. |
| D13 | Wechselspiel | Sieg direkt nach einer Niederlage → +200. |
| D14 | Crit-Folge | Sieg direkt nach einem Crit → +200. |
| D15 | Fehlzündung | Jeder Sieg ohne Crit lädt +30 (max +300), Auszahlung beim nächsten Crit. |
| D16 | Schwachstellenanalyse | Nach Niederlage mit ≥5 Abstand: nächster Sieg +300. |
| D17 | Farbserie | Aufeinanderfolgende Siege gleicher Farbe: +100/+200/… max +400. |
| D18 | Volles Haus | Fünf Siege in einem Segment → +750 auf den fünften. |
| D19 | Überschusskrit | Crit über 100 % effektiver Crit-Chance → +250. |

### E — Formationswerkzeuge (verändern die Formationserkennung)
| ID | Name | Beschreibung |
|---|---|---|
| E1 | Schrittmacher | Wiederholung darf 1 fremde Karte dazwischen haben. |
| E2 | Farbbrücke | 1 andersfarbige Karte unterbricht einen Farbblock nicht. |
| E3 | Sanfter Anstieg | Treppe darf 1× zwei gleiche Werte enthalten. |
| E4 | Großer Schritt | Treppe darf 1× einen Rückschritt enthalten. |
| E5 | Pendelwerk | Wechsel löst schon ab 2 Karten aus (Diff ≥6). |
| E6 | Drehzahl | Eine Karte darf zu zwei Treppen gehören. |
| E7 | Kontrollverlust | Positionen 10/20/30/40 sind Anker (×1,25). |
| E8 | Schnellschuss | Positionen 5/15/25/35 sind Anker (×1,25). |
| E9 | Segmentarbeit | Formationen dürfen über Segmentgrenzen fortlaufen. |
| E10 | Feinjustierung | Jede Formationsphase erhält einen zusätzlichen kostenlosen Tausch. |

### L — Legendär (mächtig; höchstens 1 je Angebot)
| ID | Name | Beschreibung |
|---|---|---|
| L1 | Überladung | 5 Karten wählen: dauerhaft +6. |
| L2 | Unaufhaltsam | Jeder Sieg gibt der nächsten Karte +2, bis eine Niederlage kommt. |
| L3 | Letztes Aufbäumen | Positionen 36–40 → +5. |
| L4 | Kritische Masse | Jeder Crit gibt der Karte dauerhaft +1 (max +4). |
| L5 | Jackpot | 4 zufällige Karten geben beim ersten Crit pro Durchlauf +1.000. |
| L6 | Raserei | Jeder Folgesieg +2 auf die nächste Karte (max +10). |
| L7 | Königsmacher | Die höchste Karte jedes Segments → +5. |
| L8 | Schicksalsmaschine | Nach jedem Durchlauf tauschen erfolgreichste & erfolgloseste Karte ihre Werte. |
| L9 | Blutvertrag | 4 Karten wählen: −2 Dauerwert, ihre Nachfolger +6 Dauerwert. |
| L10 | Kettenreaktion | Nach einem Crit ist der direkte Nachfolger garantiert kritisch (falls er gewinnt). |
| L11 | Zeitraffer | Position 40 wiederholt die temporären Wert-Effekte von Position 20. |

*(Verteilung: A 10 · B 10 · C 10 · D 19 · E 10 · L 11 = **70**.)*

---

## 6. Skill-System / Blitz-Archetyp

Skills sind seltene, **regelverändernde Build-Motoren neben den Perks** (max 4 aktiv). Der erste Blitz-Skill **aktiviert den Blitz-Archetyp**; davor sind Ladung/Crit-Basis inaktiv.

**Grundmechanik Blitz:** Aktivierungs-Sockel **+5 pp** Crit-Chance **+5 pp je gehaltenem Blitz-Skill**. Crits erzeugen **Ladung** (Basis +1), max **10**. Bei voller Ladung löst ein **Verbraucher** aus, dann wird verbraucht. **Ionisierte Karten** tragen einen dauerhaften Marker (max 4 Stapel, +25 Score/Stapel bei Sieg).

| ID | Name | Beschreibung |
|---|---|---|
| 01 | Blitzableiter | Jeder Crit → +1 Ladung und +50 Score. |
| 02 | Ionisierung *(Verbraucher)* | Bei voller Ladung 2 zufällige ungespielte Karten ionisieren, dann Ladung verbrauchen. |
| 03 | Kettenblitz | Beim Ionisieren zwei zusätzliche Karten ionisieren. |
| 04 | Überspannung | Crit mit ionisierter Karte → +3 Ladung. |
| 05 | Reststrom | Nach vollem Verbrauch bleiben 3 Ladungen erhalten. |
| 06 | Gewitterfront | Jeder Verbrauch: +2 % Crit dauerhaft (max +20 %); danach +100 Score für die nächsten 3 Siege. |
| 07 | Geladene Serie *(Verbraucher)* | Bei voller Ladung wird die Siegesserie einmalig vor der nächsten Niederlage geschützt. |

---

## 7. Weitere Features (UI & System)

- **Chronik-Kartenübersicht** — Klick auf die Chronik öffnet alle 40 Karten in Spielreihenfolge mit Werten, Ionisierungs-Stapeln, Formations-Multiplikator/Kürzel und Rollen-Markern (Tooltips).
- **Benanntes Formations-Feedback** — im Kampf schwebt bei Formations-Siegen der Name + Faktor ein (`WIEDERHOLUNG ×1,60`, Peak-Styling ab ×6/×12).
- **Rollen-Badges** — in der Formationsphase tragen Karten mit einer Kartenrolle ein goldenes Marker-Symbol.
- **Treffer-Aufschlüsselung** — kompakte Faktorenkette großer Siege (siehe Abschnitt 2).
- **Tempo-Regler** 1×–4× (Anzeige, score-neutral) · Pause · Optionen · Neustart · Aufgeben.
- **Geist & Highscore** — der Run wird gegen die persönliche Rekord-Trajektorie („Geist") verglichen; der beste Score wird über `localStorage` gehalten. Kein Leben — die Bewertung ist rein score-basiert.

---

## 8. Offenes Issue #93 — Skill-Archetypen: Feuer + Blitz-Rework + Eis

> **Status: OFFEN (Epic).** Autoritative Spec im GitHub-Issue #93. Ziel-Branch `Autostich_Test`, **kein** Merge nach `main`. Umsetzung in Wellen **F0 → F1 → F2 → F3**, Spiel nach jeder Phase spielbar, Tests grün.

Ausbau des Skill-Systems um zwei neue Archetypen (**Feuer**, **Eis**) plus ein vollständiges **Blitz-Rework** und die gemeinsame Angebots-Infrastruktur.

### Rahmenregeln (alle Archetypen)
- **Max. 2 aktive Archetypen pro Run** (aktiv registriert ab dem ersten gewählten Skill des Archetyps).
- **Skill-Angebot zeigt immer 4 Skills**, nach Archetyp gruppiert (2+2, `SKILLS_OFFERED 3→4`). Erstangebot: **2 von 3 Archetypen zufällig** (Blitz+Feuer / Blitz+Eis / Feuer+Eis). Ein aktiver Archetyp → 2 davon + 2 aus einem neuen; zwei aktive → nur diese beiden.
- **Konsumenten getrennt:** max **1 Hitze-Konsument** UND max **1 Ladungs-Konsument**. Ein zweiter desselben Typs → **Bestätigungsdialog** (alt vs. neu), Ressource bleibt erhalten.
- **Determinismus bleibt:** Zufall (Ziel-/Frostauswahl) über den injizierten `rng`; Marker wandern beim Umordnen mit (Hitze global; Frost/Ionisierung an `card.id`).

### Phase F0 — Geteiltes Fundament
Skill-Framework archetyp-agnostisch: `archetype`-Werte `fire`/`ice`, `activeArchetypes[]` voll verdrahten, Max-2-Regel, gruppiertes 4er-Angebot, `SkillSelect.jsx` mit Per-Archetyp-Theming (Blitz violett, Feuer orange-rot, Eis blau), **generischer Konsumenten-Ersatzdialog**, `ChargeBar` zu generischer Ressourcenleiste.

### Phase F1 — Feuer 🔥 *(„belohnt totale Überlegenheit")*
**Hitzeleiste 0–100** (persistent). Hitzegewinn nur bei Sieg ab ≥3 Vorsprung: `(Vorsprung−2)×2 %`; Hitzeverlust bei Niederlage `min(Rückstand,10) %`. **Feuer-Flat-Score:** `(Vorsprung−2)` × (25 + 5×(aktive Feuer-Skills−1)) → fließt in `scoreBase`. Kein Crit-Fokus.

**Normal (10):** Glut (Siege +50 % Hitze) · Brennstoff (Sieg mit Dauerwert ≥8: +5 % Hitze) · Brandbeschleuniger (Vorsprung ≥10: +15 % Hitze) · Hitzeschild (halber Hitzeverlust) · Nachglut (nächste Niederlage nach Sieg: 0 % Verlust) · Glühende Klinge (ab 50 % Hitze alle Karten +2) · Verbrennung (Feuer-Flat +10/Punkt) · Feuerwalze (jeder Sieg: nächste Karte +1 temp., bis +5) · Flächenbrand *(Konsument, bei 100 % Hitze +1.000 Flat, verbraucht 100)* · Schmelzpunkt *(Konsument, −10 % Hitze/Stich, eigene Karte +3)*.
**Legendär (2):** Sonnenkern (max Hitze 150 %, Überschuss bleibt) · Phönixfeuer (nach Konsumenten-Auslösung nächste Karte +10 temp.).

### Phase F2 — Blitz-Rework ⚡
Grundmechanik bleibt (5 pp Sockel + 5 pp/Skill, Crits → Ladung, max 10, Ionisierung). **Neu:** **02 Ionisierung** und **07 Geladene Serie** werden **exklusive Ladungs-Konsumenten** (max 1, Ersatzdialog) — die bisherige „beide + Priorität"-Logik entfällt.
**Neue Normal (08–10):** Statische Aufladung (Sieg ohne Crit → 1 Ladung) · Leitfähigkeit (Crit neben ionisierter Karte → +2 Ladung) · Entladung (nach vollem Verbrauch: nächster Crit +500 Flat).
**Legendär (2):** Donnergott (max Ladung 10→15, dafür dauerhaft **+1,0× Crit-Mult**) · Endloser Sturm (nach Verbrauch sofort auf 50 % des Maximums; mit Reststrom **max**, nicht additiv).

### Phase F3 — Eis ❄️ *(Kontroll-/Aufstellungs-Archetyp, keine Ressourcenleiste, kein Konsument)*
Arbeitet mit dauerhaft **eingefrorenen** eigenen Karten (blauer Schimmer, an `card.id`). Grundmechanik friert 2 zufällige Karten ein (je weiterer Eis-Skill +1). **Kostenloser Frosttausch:** jede eingefrorene Karte darf **pro Formationsphase 1× gratis** getauscht werden (zusätzlich zu den 4 Energien).

**Normal (10):** Frostgriff (2 weitere einfrieren) · Kalte Präzision (Frost-Karte zählt für Wiederholung als Vorgängerwert) · Eisschritt (für Treppen ±1) · Frostbrücke (unterbricht Farbblock nicht) · Kältereserve (verliert Frost-Karte: +4 temp.) · Kaltfront (nach Frosttausch: +3 temp. im nächsten Durchlauf) · Eisanker (Frost-Karte = Anker, ×1,25, zählt als Formation) · Frostspur (nach Frosttausch: neuer Nachfolger +2 temp.) · Stillstand (Frost-Karte gewinnt in Formation → +200 Flat) · Kristallform (für Wiederholung/Treppe/Wechsel als −1/±0/+1 zählbar).
**Legendär (2):** Frostbiss (Frost-Karte gewinnt → 2 zufällige Gegnerkarten des nächsten Durchlaufs −3 temp., erst im Kampf sichtbar) · Permafrost (Frost-Karten +2 Dauerwert **und** Joker für Wiederholung/Treppe/Farbblock gleichzeitig).

### Globale Abnahmekriterien
Erster Skill eines Archetyps aktiviert dessen Grundsystem · Angebote nach aktiven Archetypen gruppiert, max 2/Run · max 1 Hitze- **und** 1 Ladungs-Konsument mit Ersatzdialog · alle Pools vollständig (Blitz 10+2, Feuer 10+2, Eis 10+2) · bestehende Score-/Stich-/Formationssysteme unverändert · Determinismus intakt · `npm test` grün nach jeder Phase.

---

## 9. Weitere offene / erledigte Punkte

- **#94 Balancing (erledigt):** Stat-Steps gebufft — Crit-Chance +2→+5 pp, Crit-Mult +0,1→+0,2×, Serie +0,5→+2 %/Serienpunkt (Formation unverändert).
- **Zurückgestellt (Nutzer-Wunsch):** „starke Formation aufgelöst"-Warnung in der Formationsphase (§16) — bessere Lösung folgt später.
- **Reine Politur (kein Blocker):** noch ausführlichere Ergebnis-Aufschlüsselung.

---

## 10. Technische Basis

- **Vite + React.** `src/game/` = reine, deterministische Logik (getestet in `test/`, aktuell **197 Tests**). `src/App.jsx` + `src/ui/` = React-Wiring & Seiteneffekte.
- Zentrale Module: `reducer.js` (Zustandsmaschine: `menu → play/levelup/formation/target → gameover`), `engine.js` (`resolveTrick`), `perks.js`, `skills.js`, `stats.js`, `formations.js`, `constants.js` (TUNING-Block).
- Deploy: Push auf `Autostich_Test` → GitHub-Action `deploy-test.yml` → `…/autostich/test/`.
