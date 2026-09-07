# Münz-Ökonomie — Umsetzungsplan

**Status: beschlossen** (Owner, 2026-09-07). Dieses Dokument ist die Vorgabe für die Umsetzung, nicht
eine Ideensammlung. Alle Zahlen sind **Startwerte für die erste Fassung** und über die Sim tunebar —
sie sind gesetzt genug zum Bauen, nicht gesetzt genug zum Verteidigen.

Sprache Deutsch, weil Ökonomie-Gefühl und Spielertexte Produktsprache sind und der Owner hier
mitschreibt — bewusste Abweichung von der Engineering-Sprache (`AGENTS.md`), wie bei
`docs/skill-rework.md`, und nur für dieses Dokument.

---

## 1. Was gebaut wird

Eine **laufinterne Währung**. Der Spieler verdient Münzen dadurch, dass er Stiche gewinnt, und gibt
sie in fünf Situationen aus — immer dann, wenn in der laufenden Phase **knapp etwas fehlt**: ein
passendes Angebot, ein Tausch, ein Bauplatz, eine Fraktion, eine Stufe.

Zwei Eigenschaften halten das zusammen:

- **Die Einnahme wächst mit der Siegzahl, nicht mit dem Score.** Der Score wächst über den Lauf um
  Faktor hundert, die Siegzahl ist bei 40 je Durchlauf hart gedeckelt. Die Ökonomie kann deshalb nicht
  explodieren.
- **Die Deckel sitzen je Phase, nicht je Lauf.** Sparen bringt Reichweite, nicht Höhe.

Der Shop kommt **nicht** zurück (#229). Es gibt keinen Ort, den man besucht — jeder Kauf sitzt an der
Stelle, an der die Entscheidung ohnehin fällt.

---

## 2. Einnahme

**Formel:** `Münzen je Durchlauf = floor((gewonnene Stiche − 20) / 4)`

| Gewonnene Stiche | Münzen |
| --- | --- |
| ≤ 20 | 0 |
| 24 | 1 |
| 28 | 2 |
| 32 | 3 |
| 36 | 4 |
| 40 | 5 |

- Ausgezahlt **am Ende jedes Durchlaufs**.
- Über einen Lauf ergibt das grob **130 Münzen** (Annahme: ~24 Siege früh, ~32 in der Mitte, ~40 spät).
  Das ist die Größenordnung, gegen die alle Preise in §3 gesetzt sind. **Ändert sich die Formel, müssen
  die Preise mitwandern.**
- **Kein Perfektionsbonus.** 40 von 40 zahlt 5, wie die Formel sagt.

**Warum Schwelle 20:** Sie erzeugt die Spreizung. Die Siegzahl selbst steigt über den Lauf nur um
Faktor ~1,7 (24 → 40); durch die Schwelle wird daraus Faktor 5 bei den Münzen. Damit ist früh knapp
und spät reichlich, ohne dass die Kopplung an den Score zurückkommt.

**Naht:** `cycleWins` existiert bereits in `engine.js` (Durchlauf-Sieg-Bilanz, eingeführt für
Zinseszins #203) und wird je Durchlauf zurückgesetzt. Die Auszahlung hängt an derselben Stelle, an der
der Durchlauf abgerechnet wird.

---

## 3. Die fünf Ausgabeflächen

Gemeinsame Regeln:

- Jeder Kauf sitzt **an einem Bildschirm, den es schon gibt** — kein eigener Kaufbildschirm, kein
  Platz im Entscheidungsplan.
- Preistreppen laufen **je Phase** und werden **in der nächsten Phase auf den Basispreis
  zurückgesetzt**.
- Wer die Münzen nicht hat, sieht den Kauf, kann ihn aber nicht auslösen.

---

### 3.1 Neuwurf kaufen

**Wirkung:** ein zusätzlicher Neuwurf des aktuellen Angebots.
**Wo:** am Angebot, neben dem vorhandenen Neuwurf-Knopf — Skill-, Perk- und Architekt-Angebot.
**Regel:** beliebig oft je Phase, aber jeder weitere kostet mehr. Reset in der nächsten Phase.
**Preis [TUNING]:** 3 → 6 → 12 → … (Verdopplung).

**Legendär-Neuwurf.** Enthält das Angebot ein Legendäres (Skill oder Perk), ist der Neuwurf teurer und
garantiert **wieder ein Legendäres** im neuen Angebot.

- Das neue Legendäre ist **nicht dasselbe wie das gerade angezeigte**. Der Ausschluss gilt nur gegen
  das aktuelle Angebot — beim zweiten Neuwurf kann das aus dem ersten wiederkommen.
- **Kein Deckel.** Wer genug Münzen hat und so oft würfeln will, bis das passende Legendäre kommt,
  darf das; die Kosten sind der Regler.
- **Preis [TUNING]:** offen, siehe §7.

**Naht:** die drei Pools `rerollsPerk` / `rerollsArch` / `rerollsSkill` im Reducer (je Lauf, kein
Nachschub). Der Kauf legt zusätzliche Neuwürfe auf denselben Weg, ohne die vorhandenen Pools
anzufassen. Das Legendär-Angebot läuft über `buildSkillOffer` (`skills.js`) bzw. den Perk-Zug.

---

### 3.2 Energie in der Aufstellphase

**Wirkung:** ein zusätzlicher Tausch in der laufenden Aufstellphase.
**Wo:** in der Aufstellphase, neben der Energie-Anzeige.
**Regel:** mehrfach kaufbar, jeder weitere teurer. Gekaufte Energie **verfällt mit der Phase** — sie
wird nicht angespart. Reset in der nächsten Aufstellphase.
**Preis [TUNING]:** 3 → 6 → 12 → …

**Naht:** `formationEnergy` im Reducer, Basis aus `formationEnergyBase` / `C.FORMATION_ENERGY`. Der
Kauf erhöht die laufende Energie, nicht die Basis.

---

### 3.3 Eine Fraktion an die Tür rufen

**Wirkung:** das **nächste** Skill-Angebot zeigt garantiert mindestens ein Symbol der gewählten
Fraktion.
**Wo:** an der Tür, vor der Wahl.
**Regel:** einmal je Skill-Phase. Wirkt nur auf das nächste Angebot, ruft **ein Symbol, keine ganze
Tür** — die übrigen Symbole bleiben gewürfelt.
**Preis [TUNING]:** 5, fest.

> **Abhängigkeit:** Diese Fläche setzt die Zwei-Türen-Auswahl mit Fraktionssymbolen voraus. Die gibt
> es auf `dev` **nicht** — sie kommt mit dem Skill-Rework (`docs/skill-rework.md`, Branch `exp`). Heute
> liefert `buildSkillOffer` eine flache Skill-Liste ohne Türen. **Vor dem Skill-Rework nicht baubar.**

---

### 3.4 Baufeld-Zellen

**Wirkung:** hebt den Baufeld-Deckel um 2 Zellen, dauerhaft für den restlichen Lauf.
**Wo:** in der Architekt-Phase.
**Regel:** **genau zweimal je Lauf**, danach nicht mehr kaufbar.
**Preis [TUNING]:** 20 für den ersten Kauf, 40 für den zweiten.

Bewusst schmerzhaft: der zweite Kauf kostet rund ein Drittel des Laufeinkommens. Es ist die einzige
Fläche mit dauerhafter Wirkung, deshalb der harte Deckel.

**Naht:** `architect.maxCover` im Reducer (Basis `ARCH_MAX_COVER`, heute 24). Der Kauf hebt `maxCover`,
wie es der Bauhütten-Pick heute schon tut.

---

### 3.5 Skill aufwerten

**Wirkung:** hebt einen gehaltenen Skill um **eine** Stufe.
**Wo:** in der Skill-Phase, als **eigene Wahl neben der Skill-Auswahl** — nicht an der Tür.
**Kosten:** nur Münzen. **Kein Verzicht auf die Skill-Wahl** — man kann aufwerten *und* einen neuen
Skill nehmen.

**Ablauf:**

1. Der Spieler wählt „Aufwerten".
2. Er sieht **seine gehaltenen Skills**, je Skill die **nächste Stufe** und **was sie bringt**.
3. Er wählt einen aus — oder **bricht ab**, wenn ihm keine Stufe gefällt. Der Abbruch ist folgenlos.

**Regel:** mehrfach möglich, auch mehrfach auf demselben Skill (Normal → Selten → Sehr selten →
Episch). Jeder Schritt kostet den Preis seiner **Zielstufe**.

**Preis [TUNING], gestaffelt nach Zielrarität:**

| Zielstufe | Preis |
| --- | --- |
| Selten | 12 |
| Sehr selten | 25 |
| Episch | 40 |

Ein Skill von Normal ganz auf Episch kostet damit 12 + 25 + 40 = **77**, also über die Hälfte des
Laufeinkommens. Die beabsichtigte Wahl: **mehrere Skills auf Selten/Sehr selten heben, oder wenige auf
Episch, wenn man spart.**

Ein natürlicher Deckel wirkt ohne eigene Regel: **man kann nicht mehr Skills aufwerten, als man hält.**

> **Abhängigkeit:** Diese Fläche setzt die vierstufigen Skills voraus (Normal / Selten / Sehr selten /
> Episch). Die gibt es auf `dev` **nicht** — Skills tragen dort keine Stufe. Sie kommen mit dem
> Skill-Rework (`docs/skill-rework.md`, Branch `exp`). **Vor dem Skill-Rework nicht baubar.**

---

## 4. Anzeige

- **Kontostand immer sichtbar**, klein, in der Statusleiste (`StatusBar.jsx`).
- Jeder Kaufknopf zeigt **seinen aktuellen Preis** — bei den Treppen also den nächsten, nicht den
  Basispreis.
- Die Auszahlung am Ende eines Durchlaufs soll sichtbar sein (Anzahl Siege → Münzen).
- Alle Texte über die i18n-Kataloge (`src/i18n/de.js`, `src/i18n/en.js`), keine hart kodierten Strings.

---

## 5. Was heute baubar ist

| Fläche | Baubar auf `dev`? | Warum |
| --- | --- | --- |
| Einnahme (§2) | **ja** | `cycleWins` existiert |
| Neuwurf (§3.1) | **ja** | Reroll-Pools existieren |
| Energie (§3.2) | **ja** | `formationEnergy` existiert |
| Baufeld (§3.4) | **ja** | `maxCover` existiert |
| Fraktion rufen (§3.3) | **nein** | braucht die Türen aus dem Skill-Rework |
| Skill aufwerten (§3.5) | **nein** | braucht die Skill-Stufen aus dem Skill-Rework |
| Legendär-Neuwurf (§3.1) | teilweise | legendäre Perks gibt es; legendäre Skills im Angebot hängen am Rework-Stand |

**Empfohlene Reihenfolge:** Einnahme + Anzeige zuerst, dann Neuwurf, Energie, Baufeld. Die beiden
Rework-abhängigen Flächen folgen, wenn der Skill-Rework integriert ist.

---

## 6. Nicht in diesem Umfang

| Thema | Status |
| --- | --- |
| Zwischenaufgaben bei Durchlauf 15/30 | später. Sie sind ein **kleiner Bonus** obendrauf, nicht die Hauptquelle — die Hauptquelle sind die Siege aus §2. |
| Bosse | später, im Rahmen der Progression |
| Score mit Par | später |
| Der Progression-Baum, SP und DP | fallen mit dem neuen Progress weg — nicht Gegenstand dieses Plans |

---

## 7. Offene Punkte für die Umsetzung

1. **Preis des Legendär-Neuwurfs.** Nicht festgelegt. Er muss deutlich über dem normalen liegen; der
   Bezugspunkt ist die erwartete Anzahl Würfe bis zum gewünschten Legendären (bei ~6 Kandidaten aus
   zwei aktiven Fraktionen im Schnitt fünf).
2. **Eigene Preistreppe für den Legendär-Neuwurf, oder dieselbe wie der normale?** Bei einer
   gemeinsamen Treppe treibt ein Legendär-Neuwurf den nächsten normalen Neuwurf derselben Phase mit
   hoch. Eigene Treppe ist sauberer, aber eine mehr zu erklären.
3. **Verfallen Münzen am Laufende?** Vom Owner noch nicht entschieden. Der Plan geht von **Verfall**
   aus — sonst wird Sparen immer richtig. Falls Mitnahme gewollt ist, ändert das nur diese eine Regel,
   nicht die Struktur.
4. **Der erste Durchlauf zahlt nichts** (Auszahlung am Ende). In der ersten Skill-Phase gibt es also
   noch keine Münzen. Falls das stört, wäre ein kleiner Startbetrag die Lösung — nicht entschieden.
5. **Ranked.** Wochen-Läufe sind seed-deterministisch. Die Ökonomie ist es von selbst (die Formel hängt
   an gespielten Siegen, nicht am Zufall) — zu prüfen ist nur, ob die Wochen-Modifikatoren, die
   Neuwürfe oder Energie beschneiden, mit gekauften kollidieren (z. B. „Kein Reroll", „Energie-Ebbe").
6. **Namensgleichheit beachten:** der legendäre Perk „Zinseszins" arbeitet mit `zinsCapital` /
   `zinsRate` auf Score-Kapital, nicht mit Münzen. Kein Zusammenhang, aber verwechselbar.
7. **Tote Preisleiter im Code:** `TIER_META` in `rarity.js` trägt noch `price: 8 / 12 / 18 / 30` aus der
   Shop-Zeit; `priceOfTier` wird nirgends mehr aufgerufen. Entweder für §3.5 wiederverwenden oder
   entfernen — nicht danebenlegen.
