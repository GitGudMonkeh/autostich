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

### 3.1 Währung — Konstruktionspunkte (KP)
Läufe verdienen **KP**, KP kauft Knoten. Vorschlag (v0, alles sim-/tunebar):

- **+1 KP** je abgeschlossenem Lauf (Grundstock, auch bei schwachem Lauf → Progression bricht nie ab).
- **+KP je Score-Meilenstein** des Laufs (z. B. je erreichte 2M-Schwelle +1 KP, gedeckelt) → guter Lauf zahlt sich aus.
- **+KP bei Rang-Aufstieg** (Meister I→V) als Bonus-Schub.

> **Offene Entscheidung A:** genaue KP-Kurve. Alternativen: rein score-skaliert / rein rang-basiert / hybrid (Vorschlag).

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
   - *Gebäude-Reroll* (bis +2 Architekt-Rerolls).
   - *Fundamentplan* (Start mit 1 vorgebauten Basis-Gebäude / höhere Start-Stufe).
2. **🎬 Auftakt / Start** — Lauf-Eröffnung.
   - *Zusatz-Reroll* Perk/Skill (bis +2).
   - *Formations-Energie* Start +N.
   - *Frühere Skills* (Skill-Angebot 1 Runde früher).
3. **⚡🔥❄🌿 Fraktionen** — kleine, faire Fraktions-Startvorteile (je Fraktion 1 Knoten).
   - z. B. Blitz Start +1 Ladung · Feuer Start-Hitze · Eis 1 Gratis-Schicht · Pflanze 1 Setzling vorgewachsen.
4. **👑 Meisterschaft** — Prestige/Skalierung (nimmt die heutigen Rang-Multiplikatoren auf: LegendMult, RareShift, Legendär-Garantie), jetzt als **wählbare** Knoten statt automatisch.

> **Offene Entscheidung B:** Größe für v1 — schlanker Baum (≈ 10–14 Knoten) zum Start, später erweitern? (Vorschlag: ja.)

---

## 4 · Verhältnis zur bestehenden Rang-Leiter

Zwei Optionen:

- **(B1) Tree ersetzt die Auto-Rewards** *(Vorschlag).* `masteryGrade` bleibt als **Prestige-Rang + Schwierigkeit + KP-Quelle + Gate für tiefe Knoten**. Die heutigen Auto-Rewards (Cover/Reroll/LegendMult) werden zu **Knoten** — man *wählt* sie, statt sie geschenkt zu bekommen. Klarste Fantasie, kein Doppel-Buff.
- **(B2) Tree zusätzlich** — Auto-Rewards bleiben, Baum obendrauf. Schneller gebaut, aber Power-Creep + zwei parallele Systeme.

> **Offene Entscheidung C:** B1 (falten) vs. B2 (schichten). Vorschlag **B1**.

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

## 6 · Bestenlisten-Fairness (wichtig)

Ein Meta-Baum macht Läufe stärker → Highscores zwischen frischem und ausgebautem Profil sind **nicht mehr vergleichbar**.

> **Offene Entscheidung D:** Wie damit umgehen?
> - **(D1)** Bestenliste nur für **Challenger-Seed / „faire" Läufe**, die den Tree ignorieren (fixe Basiswerte).
> - **(D2)** Getrennte Boards: „mit Ausbau" vs. „fair".
> - **(D3)** Tree-Boni sind moderat genug, dass es egal ist (riskant).
>
> Vorschlag: **D1** — der Meister/Challenger-Modus fährt basis-fair, der normale Lauf nutzt den Tree.

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

## 9 · Offene Entscheidungen (zusammengefasst)

| # | Frage | Vorschlag |
|---|---|---|
| A | KP-Kurve (wie verdient man Punkte?) | Hybrid: +1/Lauf + Score-Meilensteine + Rang-Aufstieg |
| B | Baumgröße v1 | schlank (≈10–14 Knoten), später erweitern |
| C | Rang-Rewards falten (B1) oder schichten (B2)? | **B1** falten |
| D | Bestenlisten-Fairness | **D1** fairer Challenger/Meister-Modus ignoriert Tree |
| E | Respec: frei / kostet / keiner? | frei in v1 (Experimentier-freundlich), später ggf. Kosten |

---

## 10 · Nicht-Ziele (v1)
- Kein Knoten-Art-Polish vor den Mockups.
- Keine neuen Fraktions-Mechaniken — nur kleine Startvorteile.
- Kein Online-Sync des Profils (bleibt lokal).
