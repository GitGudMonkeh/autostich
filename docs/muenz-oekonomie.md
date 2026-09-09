# Münz-Ökonomie — Umsetzungsplan

**Status: beschlossen** (Owner, 2026-09-07). Dieses Dokument ist die Vorgabe für die Umsetzung, nicht
eine Ideensammlung. Alle Zahlen sind **Startwerte für die erste Fassung** und über die Sim tunebar —
gesetzt genug zum Bauen, nicht gesetzt genug zum Verteidigen.

**Umgesetzt wird auf `exp`** (Owner, 2026-09-07). Zwei der fünf Flächen brauchen die Türen und die
Skill-Stufen aus dem Skill-Rework; auf `dev` gibt es beides nicht. §6 sagt, was wovon abhängt.

Mockups der Screens: <https://claude.ai/code/artifact/b34fd2b7-9f7d-4f40-bf6d-a45187fe9c10>

Sprache Deutsch, weil Ökonomie-Gefühl und Spielertexte Produktsprache sind und der Owner hier
mitschreibt — bewusste Abweichung von der Engineering-Sprache (`AGENTS.md`), wie bei
`docs/skill-rework.md`, und nur für dieses Dokument.

---

## 1. Was gebaut wird

Eine **laufinterne Währung**. Der Spieler verdient Münzen dadurch, dass er Stiche gewinnt, und gibt sie
in fünf Situationen aus — immer dann, wenn in der laufenden Phase **knapp etwas fehlt**: ein passendes
Angebot, ein Tausch, ein Bauplatz, eine Fraktion, eine Stufe.

Drei Eigenschaften halten das zusammen:

- **Die Einnahme wächst mit der Siegzahl, nicht mit dem Score.** Der Score wächst über den Lauf um
  Faktor hundert, die Siegzahl ist bei 40 je Durchlauf hart gedeckelt. Die Ökonomie kann deshalb nicht
  explodieren.
- **Die Preistreppen laufen je Phase.** Sparen bringt Reichweite, nicht Höhe.
- **Kein Kauf kostet einen Spielzug.** Man zahlt Münzen, nie die Skill- oder Perk-Wahl.

Der Shop kommt **nicht** zurück (#229). Es gibt keinen Ort, den man besucht — jeder Kauf sitzt an der
Stelle, an der die Entscheidung ohnehin fällt.

---

## 2. Einnahme

**Die Kopplung an die Siegzahl ist gestrichen** (Owner, 2026-09-09). Sie bevorzugte die Fraktionen, die
leichter Stiche gewinnen — gemessen 1,76× zwischen Feuer (144 Münzen je Lauf) und Pflanze (82). §2.4 hat
die Messung.

Drei Quellen:

### 2.1 Startbetrag

**3 Münzen** beim Laufstart (Owner, 2026-09-09 — ersetzt das frühere „kein Startbetrag"). Damit ist die
erste Skill-Phase nicht mehr mittellos.

### 2.2 Je Durchlauf: Sockel plus Aufstellung

**Formel:** `Münzen je Durchlauf = 2 + floor(gebaute Formationen / 8)`

Ausgezahlt am Ende jedes Durchlaufs. „Gebaute Formationen" sind die **distinkten** Formationen der
Aufstellung — je Formation einmal (`ordinal === 1`), nicht je Position.

> **Fallstrick bei der Zählung:** im selben Array liegen `formationskern` und `anker` — Architekt- und
> Ankereffekte, die keine gebaute Formation sind. **Auf `FORMATION_TYPES` filtern**
> (wiederholung · farbblock · treppe · wechsel), sonst zählt die Einnahme Architektur mit und ist um
> etwa ein Drittel zu hoch.

**Warum Formationen:** Sie entstehen in der **Aufstellphase**, unabhängig von jedem Stich —
`computeFormations(playerOrder, deck, …)` läuft einmal je Durchlauf über die Aufstellung, bevor der
erste Stich fällt. Der Stich entscheidet nur, ob der Formations-*Multiplikator* ausgezahlt wird; für die
Zählung ist er egal. Damit hängt die Einnahme an der einen Phase, in der der Spieler ohne Fraktionshilfe
entscheidet.

### 2.3 Verzicht zahlt

Vier Quellen (Owner, 2026-09-09). Alle folgen demselben Gedanken: wer auf etwas verzichtet, tauscht
Build-Stärke gegen Kaufkraft.

| Verzicht | Münzen |
| --- | --- |
| Einen Skill ablehnen | **+12** |
| Einen Perk ablehnen | **+6** |
| Je übrige Formations-Energie am Ende der Aufstellphase | **+1** |
| Eine Architekt-Phase ohne Gebäude **und** ohne Aufwertung | **+6** |

> **Lesart zum Bestätigen:** „überbelichtete Energie" ist als **übrige, nicht verbrauchte** Energie
> gelesen. Gekaufte Energie (§3.2) zählt dabei nicht mit — sonst kauft man Energie für 3 und bekommt 1
> zurück, was den Kauf zur Geldvernichtung mit Rabatt macht.

**Eine Wechselwirkung, die auffallen wird:** Ablehnen zahlt mehr, als ein Neuwurf kostet (Perk +6 gegen
Neuwurf 3). Wer ohnehin ablehnen will, kann vorher mit Gewinn neu würfeln. Das kostet ihn die Phase, ist
also selbstbegrenzend — aber es ist eine Schleife, die ein Spieler finden wird. Beim Spielen darauf
achten.

### 2.4 Was gemessen ist

Sim auf dem exp-Stand, 10 Seeds je Fraktion, reine Fraktions-Policy mit Greedy-Aufstellung
(2026-09-09). **Gemessen**, nicht geschätzt:

| | Ø Formationen | Ø Siege | Münzen/Lauf alt (Siege) | Münzen/Lauf neu (2 + F/8) |
| --- | --- | --- | --- | --- |
| Blitz | 17,9 | 23,0 | 128 | 198 |
| Feuer | 17,3 | 24,4 | 144 | 197 |
| Eis | 16,9 | 20,4 | 94 | 190 |
| Pflanze | 20,8 | 19,5 | 82 | 216 |
| **Spanne** | | | **1,76×** | **1,14×** |

Die Fraktions-Schieflage fällt damit von 1,76× auf 1,14×. Das Einkommen steigt von ~112 auf **~200 je
Lauf**; jeder Durchlauf zahlt 3 bis 5, keiner mehr null.

**Die Preise in §3 bleiben unverändert** (Owner, 2026-09-09) — bewusst, um im Spiel zu sehen, wie sich
die höhere Kaufkraft anfühlt. Sie sind gegen ~130 gesetzt; mit ~200 plus den Verzichts-Quellen ist
deutlich mehr kaufbar als geplant. Das ist der Punkt, an dem beim Spielen zuerst etwas auffallen wird.

**Verworfen: die Zahl der Formations-*Typen*** (0–4 statt der Menge). Gemessen tragen 81–95 % aller
Aufstellungen alle vier Typen, Treppe ist in 100 % dabei, keine hat weniger als drei. Ein verkleideter
Fixbetrag.

**Naht:** `state.formations` liegt am Durchlaufende vor, an derselben Stelle, an der bisher
`coinsForWins(cycleWins)` stand. `cycleWins` wird für die Einnahme nicht mehr gebraucht.

---

## 3. Die fünf Ausgabeflächen

Gemeinsame Regeln:

- Jeder Kauf sitzt **an einem Bildschirm, den es schon gibt** — kein eigener Kaufbildschirm, kein Platz
  im Entscheidungsplan.
- Preistreppen laufen **je Phase** und werden **in der nächsten Phase auf den Grundpreis
  zurückgesetzt**.
- **Der Preis steht am Knopf, nicht in einem Tooltip.** Auf dem Handy gibt es keine Tooltips, und ein
  Kauf, dessen Preis man erst durch Antippen erfährt, ist ein Fehlkauf.
- Wer die Münzen nicht hat, sieht den Kauf, kann ihn aber nicht auslösen.

---

### 3.1 Neuwurf

**Wirkung:** ein zusätzlicher Neuwurf des aktuellen Angebots.
**Wo:** derselbe Neuwurf-Knopf, der schon da ist — Skill-, Perk- und Architekt-Angebot. Solange gratis
Neuwürfe übrig sind, zeigt er die Anzahl; danach den Preis. Kein zweiter Knopf.
**Regel:** beliebig oft je Phase, jeder weitere teurer. Reset in der nächsten Phase.
**Preis [TUNING]:** 3 → 6 → 12 → … (Verdopplung).

#### Legendär-Neuwurf

Enthält das Angebot ein Legendäres (Skill oder Perk):

- **Grundpreis 15** [TUNING], Treppe ebenso verdoppelnd: 15 → 30 → 60 → …
- Der neue Wurf enthält **garantiert wieder ein Legendäres**.
- Das neue ist **nicht dasselbe wie das gerade angezeigte**. Der Ausschluss gilt **nur gegen das
  aktuelle Angebot** — beim zweiten Neuwurf kann das aus dem ersten wiederkommen. Kein Gedächtnis über
  die Kette.
- **Kein Deckel.** Wer genug Münzen hat und so oft würfeln will, bis das passende Legendäre kommt, darf
  das; die Kosten sind der Regler.
- **Ein Zähler, zwei Grundpreise:** die Treppe zählt die Neuwürfe *der Phase*, der Grundpreis kommt aus
  der Art. Wer erst normal (3) und dann legendär würfelt, zahlt beim zweiten Kauf 30, nicht 15 — sonst
  wäre Mischen billiger als Durchhalten.
- **Optik:** derselbe Knopf, aber **voller goldener Rahmen** statt des halbtransparenten der normalen
  Neuwurf-Sorte, plus Glow. Voll-Gold ist im Screen noch frei — es führt keine neue Farbe ein und liest
  sich sofort als Sonderfall.

**Naht:** die drei Pools `rerollsPerk` / `rerollsArch` / `rerollsSkill` im Reducer (je Lauf, kein
Nachschub). Der Kauf legt zusätzliche Neuwürfe auf denselben Weg, ohne die vorhandenen Pools
anzufassen. Angebot über `buildSkillOffer` (`skills.js`) bzw. den Perk-Zug.

---

### 3.2 Energie in der Aufstellphase

**Wirkung:** ein zusätzlicher Tausch in der laufenden Aufstellphase.
**Wo:** an der Energie-Anzeige, die schon in der Phase steht — ein **+** daran, mit dem Preis daneben.
**Regel:** höchstens **+2 je Aufstellphase**, jeder weitere teurer, gekaufte Energie **verfällt mit der
Phase**. Reset in der nächsten Aufstellphase.
**Preis [TUNING]:** 3 → 6.

**Naht:** `formationEnergy` im Reducer, Basis aus `formationEnergyBase` / `C.FORMATION_ENERGY`. Der Kauf
erhöht die laufende Energie, nicht die Basis.

---

### 3.3 Fokus rufen

**Wirkung:** öffnet **sofort, in derselben Phase**, eine **dritte Tür** mit **drei Skills der gewählten
Fraktion** (Owner, 2026-09-07). Die zwei gewürfelten Türen bleiben — die gerufene ist eine zusätzliche
Wahl, keine Ersetzung.
**Wo:** **unter den Türen**, auf der Türstufe. Vier Fraktions-Chips; ein Tap wählt und bezahlt.
**Regel:** einmal je Skill-Phase. Nichts wird aufgehoben, nichts verfällt — der Ruf ist gekaufte
Auswahl, keine Vormerkung.
**Preis [TUNING]:** 5, fest.

Die Stufen der drei Skills werden wie überall gewürfelt; gerufen wird die Fraktion, nicht die Qualität.

**Offen:** Zusammenspiel mit dem Startfokus (`docs/skill-rework.md` §1) — naheliegend wäre, dass der
Ruf auf die Fokus-Fraktion weniger kostet. Entscheidbar erst, wenn der Fokus steht.

> **Abhängigkeit:** setzt die Zwei-Türen-Auswahl mit Fraktionssymbolen voraus (`state.skillDoors`,
> `onChooseDoor`, `atDoors` in `SkillSelect.jsx` auf `exp`). Auf `dev` gibt es das nicht.

---

### 3.4 Baufeld-Zellen

**Wirkung:** hebt den Baufeld-Deckel um 2 Zellen, dauerhaft für den restlichen Lauf.
**Wo:** in der Architekt-Phase, an der Deckel-Anzeige.
**Regel:** **genau zweimal je Lauf**, danach nicht mehr kaufbar.
**Preis [TUNING]:** 20 für den ersten Kauf, 40 für den zweiten.

Die einzige Ausgabe mit dauerhafter Wirkung und die einzige mit einem Vorrat, der sich leert — deshalb
zeigt sie zwei Punkte, wie viel vom Lauf noch übrig ist. Die anderen Käufe brauchen so etwas nicht.

**Naht:** `architect.maxCover` im Reducer (Basis `ARCH_MAX_COVER`, heute 24). Der Kauf hebt `maxCover`,
wie es der Bauhütten-Pick heute schon tut.

---

### 3.5 Skill aufwerten

**Wirkung:** hebt einen gehaltenen Skill um **eine** Stufe.
**Wo:** in der Skill-Phase, **im Angebots-Screen** (dort, wo man die drei Skills der geöffneten Tür
sieht) — als eigene Aktion neben Neuwurf und Ablehnen, in **eigener Zeile**: auf 390 px passen drei
Knöpfe nicht nebeneinander, und der Kauf ist eine andere Art Handlung als die Phasen-Aktionen. Der Knopf
trägt „ab 12", damit man vorher weiß, ob es sich lohnt hineinzugehen. **Nicht an der Tür.**
**Kosten:** nur Münzen. **Kein Verzicht auf die Skill-Wahl** (Owner, 2026-09-07 — ersetzt die frühere
Verzicht-plus-Preis-Regel).

**Ablauf:**

1. Der Spieler wählt „Skill aufwerten".
2. Er sieht **seine gehaltenen Skills**, je Skill die **nächste Stufe** und **was sie bringt** — mit dem
   alten Wert durchgestrichen und dem neuen hervorgehoben. Skills auf der höchsten Stufe stehen
   ausgegraut mit „Höchste Stufe".
3. Er wählt einen aus — oder **bricht ab**, wenn ihm keine Stufe gefällt. Der Abbruch ist folgenlos.
4. Nach einer Aufwertung bleibt er im selben Bildschirm: der Skill steht sofort wieder da, mit dem
   Preis seiner *nächsten* Stufe.

**Regel:** **mehrere Aufwertungen je Phase**, so lange die Münzen reichen (Owner, 2026-09-07). Auch
mehrfach auf demselben Skill (Normal → Selten → Sehr selten → Episch). Jeder Schritt kostet den Preis
seiner **Zielstufe**, nicht der Reihenfolge.

**Preis [TUNING], gestaffelt nach Zielrarität:**

| Zielstufe | Preis |
| --- | --- |
| Selten | 12 |
| Sehr selten | 25 |
| Episch | 40 |

Ein Skill von Normal ganz auf Episch kostet 12 + 25 + 40 = **77**, also über die Hälfte des
Laufeinkommens. Die beabsichtigte Wahl: **mehrere Skills auf Selten/Sehr selten heben, oder wenige auf
Episch, wenn man spart.** Ein natürlicher Deckel wirkt ohne eigene Regel: man kann nicht mehr Skills
aufwerten, als man hält.

> **Abhängigkeit:** setzt die vierstufigen Skills voraus (Normal / Selten / Sehr selten / Episch). Auf
> `dev` tragen Skills keine Stufe. Kommt mit dem Skill-Rework.

---

## 4. Anzeige

- **Kontostand immer sichtbar**, in der Statusleiste (`StatusBar.jsx`), ganz rechts als eigene Zelle:
  Münzsymbol plus Zahl, kein Label. **Feste Breite für drei Stellen** — der Kontostand kann dreistellig
  werden (Owner), und die Leiste darf beim Hochzählen nicht springen. Mobil sind Labels dort ohnehin
  über `hidden sm:inline` weg.
- Jeder Kaufknopf zeigt **seinen aktuellen Preis** — bei den Treppen also den nächsten, nicht den
  Grundpreis.
- Die Auszahlung am Ende eines Durchlaufs soll sichtbar sein (Formationen → Münzen), und die
  Verzichts-Zahlungen aus §2.3 im Moment, in dem sie anfallen — sonst merkt niemand, dass Ablehnen zahlt.
- Alle Texte über die i18n-Kataloge (`src/i18n/de.js`, `src/i18n/en.js`), keine hart kodierten Strings.
  Nach Textänderungen `npm run loc:export` — sonst schlagen die Katalog-Tests fehl.

---

## 5. Die Screens

Vier Bildschirme sind betroffen; die Mockups zeigen sie in dieser Reihenfolge (Link oben).

| Screen | Was dazukommt |
| --- | --- |
| **Türstufe** | Unter den zwei Türen der Block „Fokus rufen · 5" mit vier Fraktions-Chips und einer Zeile, was er bewirkt. |
| **Türstufe nach dem Ruf** | Dieselbe Phase, dieselbe Ansicht: die gerufene Tür erscheint **unter** den zwei gewürfelten, über volle Breite, im Fraktionsglow, mit „Gerufen"-Marke. Über die Breite statt als dritte Spalte: bei drei Karten nebeneinander wären es je ~115 px, und die gerufene sähe aus wie eine von dreien statt wie die, für die bezahlt wurde. |
| **Angebot der Tür** | Aufwerten-Knopf in eigener Zeile unter Neuwurf/Ablehnen. Die drei Skills stehen auf **einer** Seite (keine Fraktions-Navi, kein Pager — das ist der exp-Stand). |
| **Aufwertphase** | Neuer Bildschirm. Je Skill: Fraktion, Name, Preis rechts; darunter der Stufenwechsel als Chip-Paar; darunter der Effekt mit altem Wert durchgestrichen. Fuß: „Zurück zur Skill-Wahl". |

### 5.1 Zwei Altlasten am Skill-Screen, die mit erledigt werden

Vom Owner am laufenden Spiel gemeldet (2026-09-07). Sie gehören nicht zur Ökonomie, sitzen aber auf
demselben Bildschirm — wer den Aufwerten-Knopf einbaut, fasst diese Stellen ohnehin an:

1. **Die Banner der häufigsten Skills raus.** Nach der Türwahl stehen oben im Angebot noch Banner der
   häufigsten Skills. Die sollen weg.
2. **Das Panel darf keinen Leerraum unten haben.** Es ist heute höher als die Auswahl, die es umschließt.
   Es soll **mit dem Inhalt mitwachsen und mitschrumpfen** — so groß wie die Auswahl, nicht größer.

> Beides ist **nicht gegengeprüft**: die Türstufe existiert nur auf `exp`, und diese Stellen ließen sich
> von `dev` aus nicht ansehen. Vor dem Umbau am laufenden Spiel nachsehen, was genau gemeint ist.

---

## 6. Was wovon abhängt

| Fläche | Voraussetzung |
| --- | --- |
| Einnahme (§2) | `cycleWins` — vorhanden |
| Neuwurf (§3.1) | Reroll-Pools — vorhanden |
| Legendär-Neuwurf | legendäre Perks vorhanden; legendäre Skills im Angebot je nach Rework-Stand |
| Energie (§3.2) | `formationEnergy` — vorhanden |
| Baufeld (§3.4) | `maxCover` — vorhanden |
| Fokus rufen (§3.3) | **Türen aus dem Skill-Rework** |
| Skill aufwerten (§3.5) | **Skill-Stufen aus dem Skill-Rework** |

**Empfohlene Reihenfolge:** Einnahme und Anzeige zuerst — ohne sie ist keine andere Fläche prüfbar.
Dann Neuwurf, Energie, Baufeld. Fokus-Ruf und Aufwerten zuletzt, wenn ihre Voraussetzungen stehen.

---

## 7. Nicht in diesem Umfang

| Thema | Status |
| --- | --- |
| Zwischenaufgaben bei Durchlauf 15/30 | später. Sie sind ein **kleiner Bonus** obendrauf, nicht die Hauptquelle — die ist §2. |
| Bosse | später, im Rahmen der Progression |
| Score mit Par | später |
| Der Progression-Baum, SP und DP | fallen mit dem neuen Progress weg — nicht Gegenstand dieses Plans |

---

## 8. Offene Punkte

1. **Braucht ein Kauf eine Bestätigung?** Auf dem Handy ist ein Fehltipper leicht, ein zweiter Tap aber
   zäh, wenn man ihn dreimal je Phase macht. Mittelweg: nur die teuren Käufe bestätigen lassen —
   Baufeld, Episch-Aufwertung, Legendär-Neuwurf. **Nicht entschieden.**
2. **Verfallen Münzen am Laufende?** Der Plan geht von **Verfall** aus — sonst wird Sparen immer
   richtig. Falls Mitnahme gewollt ist, ändert das nur diese eine Regel, nicht die Struktur.
   **Nicht entschieden.**
3. **Ranked.** Die Ökonomie ist von selbst seed-unabhängig (sie hängt an der eigenen Aufstellung). Zu prüfen
   ist nur, ob Wochen-Modifikatoren, die Neuwürfe oder Energie beschneiden („Kein Reroll",
   „Energie-Ebbe"), mit gekauften kollidieren.
4. **Namensgleichheit beachten:** der legendäre Perk „Zinseszins" arbeitet mit `zinsCapital` /
   `zinsRate` auf Score-Kapital, nicht mit Münzen. Kein Zusammenhang, aber verwechselbar.
5. **Tote Preisleiter im Code:** `TIER_META` in `rarity.js` trägt noch `price: 8 / 12 / 18 / 30` aus der
   Shop-Zeit; `priceOfTier` wird nirgends mehr aufgerufen. Entweder für §3.5 wiederverwenden oder
   entfernen — nicht danebenlegen.
