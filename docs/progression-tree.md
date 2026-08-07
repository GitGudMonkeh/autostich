# Design-Doc: Progression-Tree + neuer Start-Screen (Entwurf v0)

> Status: **Entwurf zur gemeinsamen Abstimmung.** Reihenfolge: (1) dieses Design, (2) Mockups Start-Screen, (3) Mockups Progression-Tree, (4) Umsetzung auf `balancing`.
> Anlass: Meta-Progression von der **linearen Rang-Leiter** zu einem **verzweigten Knoten-Baum** heben. Erster konkreter Knoten: **Baufeld — 3 Knoten, je +4 Zellen.**

---

## 1 · Ziel & Fantasie

Heute ist die laufübergreifende Progression eine **flache Leiter** (Meister I–V, Rewards automatisch je Rang; Großmeister nur Schwierigkeit). Es gibt keine *Wahl*.

Ziel: ein **Progression-Tree** — ein dauerhafter Baum aus Upgrade-Knoten, den der Spieler über viele Läufe hinweg **selbst gestaltet**. Er gibt der Meta-Ebene Richtung, Wiederspielwert und eine sichtbare Heimat. Der **Start-Screen** wird zum Hub: Rang, Punkte, freie Knoten, Lauf starten — alles an einem Ort.

Leitbild: *„Die Werkstatt wächst mit dir."* Der Baum ist die Werkstatt/das Fundament; jeder Lauf verdient Punkte, die man in permanente Fundament-Verbesserungen investiert.

---

## 2 · Ist-Zustand (Code-Anker)

| Thema | Heute | Datei |
|---|---|---|
| Baufeld-Deckel | `MAX_COVER = 24` (Brett 8×5 = 40 Zellen) | `architect.js:46` |
| Baufeld +Rang | `masteryCoverBonus(g)` = +2/Grad ab II (bis +8) | `mastery.js:92` |
| Baufeld in-run | Bauhütte `+BAUHUETTE_COVER` (8) | `reducer.js:311` |
| Rang-System | `masteryGrade` 0–10 (Meister I–V + Großmeister I–V) | `mastery.js` |
| Rang-Rewards | Reroll +1/2/3 · Cover +2..+8 · LegendMult · RareShift · Legendär-Garantie | `mastery.js` |
| Persistenz | Profil in localStorage: `games, totalScore, bestScore, …, masteryGrade` | `storage.js:86` |
| Start-Screen | Wortmarke → Neuer Lauf / Meister Run / Resume → Seed → Optionen/Kollektion/Bestenliste | `StartScreen.jsx` |

**Wichtig:** Rang-Rewards greifen heute über **Seams im Reducer** (z. B. `maxCover = base + masteryCoverBonus(grade)`, `rerollsArch = base + masteryRerollBonus(grade)`). Der Tree kann **exakt dieselben Seams** benutzen — statt `masteryX(grade)` liest der Run dann `treeX(profile)`. Kein Engine-Umbau nötig.

---

## 3 · Kern-Modell

### 3.1 Währung — Konstruktionspunkte (KP) · **beschlossen: Hybrid (A)**
Läufe verdienen **KP**, KP kauft Knoten. Drei Quellen (alle sim-/tunebar):

- **+1 KP** je abgeschlossenem Lauf (Grundstock, auch bei schwachem Lauf → Progression bricht nie ab).
- **+KP je Score-Meilenstein** des Laufs (z. B. je erreichte 2M-Schwelle +1 KP, gedeckelt) → guter Lauf zahlt sich aus.
- **+KP bei Rang-Aufstieg** = einmaliger Schub, sobald ein neuer **Meister-Rang** erreicht wird (Ränge I–V werden über Score-Schwellen freigeschaltet, `advanceGrade`). Belohnt Langzeit-Fortschritt, nicht nur Grind. *(Optional streichbar, falls unerwünscht.)*

### 3.2 Knoten & Stufen
Ein **Knoten** hat: `id`, Branch, Kosten (KP), optionale **Voraussetzung** (Vorgänger-Knoten und/oder Mindest-Rang), Effekt. Manche Knoten sind **mehrstufig** (dieselbe id, Level 1..N) — das ist das „3 Knoten"-Muster.

**Beispiel Baufeld (der Anker-Fall):**
```
Baufeld-Erweiterung   —   3 Stufen, je +4 Zellen maxCover
  Stufe 1:  Kosten k1   → maxCover 24 → 28
  Stufe 2:  Kosten k2   → 28 → 32   (Voraussetzung: Stufe 1)
  Stufe 3:  Kosten k3   → 32 → 36   (Voraussetzung: Stufe 2)
```
+12 gesamt, Deckel bleibt < 40 (Brettgröße) → sinnvoller Kopfraum, nie „ganzes Brett gratis".

### 3.3 Branches (v0-Vorschlag)
Vier thematische Äste, an den Spiel-Säulen ausgerichtet:

1. **🏗 Architekt / Baufeld** — Bau-Ökonomie.
   - *Baufeld-Erweiterung* (3× +4 Zellen).
   - *Fundamentplan* (Start mit 1 vorgebauten Basis-Gebäude / höhere Start-Stufe).
2. **🎬 Auftakt / Start** — Lauf-Eröffnung.
   - *Reroll II & III* — 2 Knoten in Sequenz, je **+1 Reroll für alle drei Phasen** (Skill/Perk/Architekt), Basis 1 → bis 3 (siehe 3.5).
   - *Formations-Energie* Start +N.
   - *Frühere Skills* (Skill-Angebot 1 Runde früher).
3. **⚡🔥❄🌿 Fraktionen** — kleine, faire Fraktions-Startvorteile (je Fraktion 1 Knoten).
   - z. B. Blitz Start +1 Ladung · Feuer Start-Hitze · Eis 1 Gratis-Schicht · Pflanze 1 Setzling vorgewachsen.
4. **👑 Meisterschaft** — Prestige/Skalierung (nimmt die heutigen Rang-Multiplikatoren auf: LegendMult, RareShift), jetzt als **wählbare** Knoten statt automatisch.
   *(Legendär-Slot liegt NICHT hier — ist der Onboarding-Capstone, siehe 3.6/3.7.)*

**Beschlossen (B): ~14 Knoten für v1** — genug für echte Wahl über vier Äste, klein genug zum sauberen Balancing; später erweiterbar. Grobe Verteilung: Architekt/Baufeld ~4 · Auftakt ~4 · Fraktionen 4 (je 1) · Meisterschaft ~2–3.

### 3.4 Der Spine (Entscheidungs-Takt eines Laufs)

Ein Lauf hat **50 Zyklen** (`MAX_CYCLES = 50`, `constants.js`). Nach jedem Sieg liest die Engine `DECISION_SCHEDULE[cycle]` und legt den Entscheidungstyp fest. Der Grundtakt ist ein **Vierer-Beat**:

```
🎯 Skill  →  ⭐ Perk  →  🛡 Aufstellung  →  🏗 Architekt
```

Ein voller Block = 4 Siege; über den Lauf ~12,5 Blöcke, angereichert mit Sonderpunkten (Legendär-Slot, Architekt-Doppelschlag im Endgame). Aktuelle `BASE_SCHEDULE`:

| Runden | Muster |
|---|---|
| 1–24 | **Aufbau:** stumpfer 4er-Beat Skill/Perk/Aufstellung/Architekt — Fundamente legen |
| 25–34 | **Peak:** Skill-Zugang dünnt aus, **Legendär-Slot bei 29**, danach **Architekt-Doppelschlag (32 + 34)** — Score-Motor verdrahten |
| 35–50 | **Endgame:** kein neuer Skill mehr (ab 41 nur noch selten), **Perk + Aufstellung + Architekt** rotieren — Feintuning & Skalierung |

**Verteilung:** 🎯 Skill 9–10 · ⭐ Perk 13 · 🛡 Aufstellung 13 · 🏗 Architekt 14 · 👑 Legendär 0–1 — je ~alle 4 Runden, Architekt verdichtet zum Ende.

### 3.5 Reroll-Ökonomie · **beschlossen**

Reroll = an einer Entscheidung die angebotenen Optionen **einmal neu würfeln**. Bezug: **pro Phase, use-it-or-lose-it** (wie heute), getrennt für Skill / Perk / Architekt.

- **Basis: 1 Reroll pro Phase.** Jede Skill-/Perk-/Architekt-Phase startet mit genau einem Neuwurf.
- **Werkstatt: 2 Knoten, je +1 für alle drei Phasen** (Reroll II → Reroll III, in Sequenz). Voll ausgebaut → **3 Reroll pro Phase**.

| Werkstatt-Stufe | Reroll/Phase | Effekt |
|---|---|---|
| Start | **1** | knapp — ein Fehlwurf pro Phase korrigierbar |
| Reroll II (Knoten) | **2** | solides Sieben |
| Reroll III (Folgeknoten) | **3** | hohe Konsistenz, Archetyp-Ziele planbar |

> Das ersetzt die heutige Basis (Reroll je Phase = 2). Neue Basis = 1, die +2 kommen ausschließlich über den Baum.

### 3.6 Legendär-Slot (Runde 29) · **beschlossen: Onboarding-Capstone**

Der Legendär bei Runde 29 ist **kein Werkstatt-Knoten mehr**, sondern die **letzte Onboarding-Stufe** (siehe 3.7) — der Abschluss-Hook, der das Onboarding krönt:

- **Vor dem Capstone:** Runde 29 ist ein normales **Skill-Angebot** (thematisch der sauberste Platzhalter — der Takt bleibt unangetastet, nur der Entscheidungs-*Typ* an einer Stelle ändert sich). Basis-Lauf hat damit **10 Skill-Angebote**.
- **Nach dem Capstone:** Runde 29 wandelt sich in den **Legendär-Slot** → **eine Skill-Auswahl weniger, dafür ein legendärer Skill**. Das Angebot enthält **je einen legendären Skill pro aktivem Archetyp** (bis zu 3 zur Wahl). Klarer Prestige-Payoff, kein Zusatz-Slot, kein Takt-Umbau.

### 3.7 Onboarding-Kette (frei, scriptgesteuert — vor der Werkstatt)

Neuer Spieler → „Normales Spiel" → **Lauf-Vorbereitung** mit **3 Archetyp-Slots** oben. **Keine gespeicherten Decks** — es sind immer dieselben 3 Slots, die man belegt; Default ist die **letzte Archetyp-Auswahl aus dem vorigen Lauf**. Das Onboarding öffnet Schritt für Schritt, *was* in diese Slots darf und welche Rarität / Reroll / Legendär verfügbar ist. Erst wenn es durch ist, beginnt die **Münzen-/Werkstatt-Ökonomie**.

| Stufe | Archetypen | Slots | Rarität (Perks + Gebäude) | Reroll | Legendär (R29) |
|---|---|---|---|---|---|
| **Start** | Blitz + Feuer | 2 (3. ausgegraut) | Grau + Grün | — | Skill-Angebot |
| 1 | **+ Eis** (Slot antippen → Blitz/Feuer/Eis tauschen) | 2 | Grau + Grün | — | Skill |
| 2 | Blitz/Feuer/Eis | 2 | Grau + Grün | **+1 Basis** | Skill |
| 3 | Blitz/Feuer/Eis | 2 | **+ nächste Stufe** | 1 | Skill |
| 4 | Blitz/Feuer/Eis | **+ 3. Slot** (3 mischbar) | + | 1 | Skill |
| 5 | Blitz/Feuer/Eis | 3 | **+ übernächste Stufe** | 1 | Skill |
| 6 | **+ Pflanze** → beliebige **3 von 4** | 3 | volle Basis-Rarität | 1 | Skill |
| **7 · Capstone** | alle 4, 3 von 4 | 3 | voll | 1 | **Legendär-Slot** (je 1 leg. Skill pro aktivem Archetyp) |
| **danach** | **Münzen → Werkstatt** (Baufeld-Erweiterung · +2 Rerolls · Fraktions-Startvorteile · Meisterschaft) | | | | |

**Nahtstellen zur Werkstatt:**
- Onboarding gibt **Reroll 1**; die **+2 Rerolls** sind Werkstatt-Knoten (setzen genau dort an, wo das Onboarding aufhört).
- **Baufeld-Erweiterung** ist reiner Werkstatt-Stoff (KP), nie Onboarding.
- **Legendär** ist der Onboarding-Capstone (Stufe 7), **nicht** mehr Werkstatt.

**Vorrücken — pro neu gewonnener Runde (Bestfortschritt), eins pro Runde:** Trigger ist die **weiteste je erreichte Runde** (persistent im Profil). Jede Runde, die man zum ersten Mal *richtig gewinnt*, schaltet das nächste Kettenglied frei — dichter Opening-Hook, fast jede frühe Runde ein neues Spielzeug. Wer früh verliert, macht im nächsten Lauf ab der Bestrunde weiter. Freigeschaltete Archetypen/Slots/Raritäten wirken auf die **nächste** Lauf-Vorbereitung.

| Neue Bestrunde | Freischaltung |
|---|---|
| 1 | **+ Eis** (3. Archetyp wählbar) |
| 2 | **Reroll** (Basis 1/Phase) |
| 3 | **Rarität +1** (nächste Stufe) |
| 4 | **+ 3. Slot** (3 Archetypen mischbar) |
| 5 | **Rarität +1** (übernächste Stufe) |
| 6 | **+ Pflanze** (beliebige 3 von 4) |
| 7 | **Legendär-Capstone** (R29-Slot, je 1 leg. Skill pro aktivem Archetyp) |

Ab Bestrunde 7 ist das Onboarding komplett → weitere Progression läuft über **Münzen/Werkstatt**. *(Reihenfolge/Rundenzahlen sim-/tunebar — die 7 Glieder liegen fest, die genauen Runden justieren wir am Playtest.)*

---

## 4 · Verhältnis zur bestehenden Rang-Leiter

Zwei Optionen:

**Beschlossen (C): B1 — falten.** `masteryGrade` bleibt als **Prestige-Rang + Schwierigkeit + KP-Quelle + Gate für tiefe Knoten**. Die heutigen Auto-Rewards (Cover/Reroll/LegendMult/RareShift/Legendär-Garantie) werden zu **wählbaren Knoten** — man investiert KP hinein, statt sie automatisch geschenkt zu bekommen. Kein Doppel-Buff, klare Fantasie, ein System statt zwei.

---

## 5 · Persistenz & Determinismus

Profil (`storage.js`) erhält:
```js
konstruktPoints: number,        // verfügbares Guthaben
konstruktSpent: number,         // ausgegeben (für Respec/Anzeige)
nodes: { [nodeId]: level },     // freigeschaltete Knoten + Stufe
```
→ `PROFILE_SCHEMA_VERSION` erhöhen + Migrations-Block (`if (v < N)`), Default-Werte 0/{}.

**Determinismus bleibt heilig:** Tree-Boni sind feste Zahlen aus dem Profil, sie fließen an **denselben Reducer-Seams** ein wie heute `masteryCoverBonus`. Sie berühren **keine** geseedeten RNG-Ströme zusätzlich (Challenger-Seed-Läufe bleiben reproduzierbar *für dasselbe Profil*). Der Sim läuft profil-los (Baseline unberührt).

**Balance-Hebel:** alle Knoten-Effekte als `envNum`/tunebare Konstanten. Gegenprobe: Cross-Sim mit einem „max ausgebauten" Profil fahren → prüfen, ob die Decke (v. a. Baufeld+Architekt) nicht kippt.

---

## 6 · Bestenlisten-Fairness · **beschlossen (D): zwei-stufig**

Ein Meta-Baum macht Läufe stärker → Highscores zwischen frischem und ausgebautem Profil sind **nicht mehr vergleichbar**. Lösung: die globale Liste läuft **immer unter gleichen Bedingungen für alle** — es gibt zwei faire Standard-Zustände:

- **Fair-Modus (Basis) — global, immer verfügbar.** Der Tree wird **ignoriert**, es gelten fixe Basiswerte. Alle Teilnehmer starten gleich → vergleichbar. (Der normale Lauf nutzt weiterhin deinen Tree, zählt aber nur lokal/für die KP-Ernte.)
- **Vollausbau-Liga (Prestige) — global, freigeschaltet, wenn dein Baum KOMPLETT ist.** Hier läuft jeder mit dem **voll ausgebauten Tree als fixem Standard** → wieder gleiche Bedingungen für alle, nur auf höherem Niveau. Das ist der „Endgame"-Wettbewerb: erst den Baum fertigstellen, dann in der Liga antreten, wo der Max-Baum die Norm ist.

So bleibt jede globale Wertung apples-to-apples (alle gleich, ob auf Basis- oder Max-Niveau), und der Baum-Ausbau ist ein PvE-Ziel mit klarem Prestige-Payoff (Zugang zur Liga).

> Offen (klein): fährt die Vollausbau-Liga zusätzlich basis-fair-Seeds (Challenger), oder freie Seeds? Später.

---

## 7 · Start-Screen-Redesign (Konzept, Mockup folgt)

Der Start-Screen wird der **Hub**. Rangfolge:

1. **Wortmarke / Held** (bleibt).
2. **Neuer Lauf** (großer Blickfang) + **Fortsetzen** (Resume-Karte).
3. **Progression-Hub — der neue Kern:** kompakte Vorschau
   *Rang-Abzeichen · KP-Guthaben · „N Knoten frei"* → öffnet den vollen **Tree-Screen**. Ein Puls/Badge, wenn ungenutzte KP da sind (Zug-Impuls).
4. **Meister Run** (basis-fair, Bestenlisten-Modus) + **Seed einfügen**.
5. **Ruhige Sekundär-Navi:** Optionen · Kollektion · Bestenliste · Statistik.

Der **Tree-Screen** selbst (eigener Screen wie Kollektion/Bestenliste): Branch-Spalten oder radiale Äste, Knoten mit Kosten/Voraussetzung/Effekt, KP-Guthaben oben, Respec-Knopf. Detail-Design im Mockup-Schritt.

---

## 8 · Umsetzungs-Skizze (nach Design-Freeze)

1. `progression.js` (neu, `src/game/`): Knoten-Definitionen (data-driven, wie `families.js`/`ARCHITECT_FAMILIES`), `nodeEffects(profile)`-Ableiter (`treeCoverBonus`, `treeRerollBonus`, …), Kauf-/Respec-Reducer-Logik. Rein, deterministisch, testbar.
2. `storage.js`: Profil-Felder + Migration + KP-Vergabe in `recordRun`.
3. Reducer-Seams: `masteryCoverBonus(grade)` → `masteryCoverBonus(grade) + treeCoverBonus(profile)` (bzw. bei B1 ersetzen). Analog Rerolls etc.
4. UI: `ProgressionTree.jsx` (Screen) + `StartScreen`-Umbau + KP-Anzeige.
5. Tests: `progression.test.js` (Kauf/Voraussetzung/Effekt-Ableitung/Migration), Determinismus-Guard, Sim-Gegenprobe „max Profil".

---

## 9 · Entscheidungen — **beschlossen**

| # | Frage | Beschluss |
|---|---|---|
| A | KP-Kurve | **Hybrid**: +1/Lauf + Score-Meilensteine + Rang-Aufstiegs-Schub |
| B | Baumgröße v1 | **~14 Knoten** |
| C | Rang-Rewards falten oder schichten? | **falten** (B1) — Auto-Rewards werden wählbare Knoten |
| D | Bestenlisten-Fairness | **zwei-stufig**: Fair-Modus (Basis, Tree ignoriert) + **Vollausbau-Liga** (freigeschaltet bei komplettem Baum, alle mit Max-Tree) |
| E | Respec | **frei** (v1) |
| F | Reroll-Ökonomie | **1 pro Phase (Basis)** + 2 Werkstatt-Knoten je **+1 für alle Phasen** (Sequenz), bis 3 · use-it-or-lose-it |
| G | Legendär-Slot (R29) | **Onboarding-Capstone** (nicht Werkstatt): Basis = Skill-Angebot, Capstone wandelt R29 → Legendär-Slot mit je 1 leg. Skill pro aktivem Archetyp |
| H | Onboarding-Kette | **frei vor der Werkstatt, Trigger = neu gewonnene Runde (Bestfortschritt), eins pro Runde**: Archetypen (Blitz+Feuer → +Eis → +3.Slot → +Pflanze), Rarität (Grau+Grün → +2 Stufen), Reroll 1, Capstone Legendär · 3 Slots, keine gespeicherten Decks, Default = letzte Auswahl |

---

## 10 · Nicht-Ziele (v1)
- Kein Knoten-Art-Polish vor den Mockups.
- Keine neuen Fraktions-Mechaniken — nur kleine Startvorteile.
- Kein Online-Sync des Profils (bleibt lokal).
