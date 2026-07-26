# Autostich – Raritätssystem für Perks und Shop-Items

**Implementierungsstand:** Design-Spezifikation, Stand 26.07.2026  
**Ziel:** Bestehende Perks und Shop-Items in aufwertbare Familien mit vier regulären Raritätsstufen überführen.

> Diese Datei beschreibt den gewünschten Zielzustand. Die Spalte **Alt** dient nur als Migrations- und Vergleichshilfe und ist nicht Teil der neuen UI.

## 1. Globale Raritätsstufen

| Rang | Seltenheit | UI-Farbe | Shoppreis |
|---:|---|---|---:|
| I | Normal | Grau | 8 Münzen |
| II | Ungewöhnlich | Grün | 12 Münzen |
| III | Selten | Blau | 18 Münzen |
| IV | Rar | Lila | 30 Münzen |

Die Stufe eines Angebots wird über die jeweilige Drop-Rate bestimmt. Jede Stufe darf direkt angeboten werden; ein Spieler muss die vorherigen Stufen nicht besitzen.

## 2. Gemeinsame Familien- und Upgrade-Logik

### 2.1 Familienzustand

- Jeder reguläre Perk und jedes Shop-Item gehört zu genau einer **Familie**.
- Pro Familie existiert im Run nur ein aktueller Rang: `0`, `I`, `II`, `III` oder `IV`.
- Besitzt der Spieler Rang II, wird Rang I dieser Familie nicht mehr angeboten. Entsprechend werden alle Stufen kleiner oder gleich dem aktuellen Rang aus dem Angebotspool entfernt.
- Rang IV schließt die Familie ab; sie wird danach nicht mehr angeboten.
- Eine höhere angebotene Stufe wird in der UI als **Upgrade** der bestehenden Familie dargestellt.
- Die Seltenheitsfarbe und der Preis richten sich immer nach der **Zielstufe**.

### 2.2 Direkte Drops

- Jede Stufe kann ohne Vorstufe droppen.
- Ein direkter Drop von III löst **nicht** automatisch I und II aus.
- Der Spieler besitzt danach die Familie auf Rang III.

### 2.3 Effektarten

**Regelersetzung:** Nur die Regel der höchsten gehaltenen Stufe ist aktiv. Es gibt keine parallelen Trigger mehrerer Stufen.

**Kumulativer Pick-Effekt:** Jede tatsächlich gewählte Stufe führt einmal ihr eigenes dauerhaftes oder sofortiges Paket aus. Frühere Deckänderungen bleiben erhalten, obwohl im Build nur der höchste Familienrang angezeigt wird.

**Rollen-Upgrade:** Bestehende Zielkarten behalten die Rolle. Ändern sich Zahlenwerte oder Regeln, werden sie auf die neue Stufe aktualisiert. Erhöht sich die Zielanzahl, wählt der Spieler nur die zusätzlichen Ziele.

### 2.4 Angebotsfilter – Pseudocode

```ts
function canOfferFamilyTier(currentTier: number, offeredTier: number): boolean {
  return offeredTier > currentTier;
}

function applyFamilyPick(family: Family, targetTier: Tier) {
  const previousTier = runState.familyTiers[family.id] ?? 0;

  if (family.upgradeType === 'replacement') {
    removeRuntimeRule(family.id);
    installRuntimeRule(family.id, targetTier);
  } else if (family.upgradeType === 'cumulative') {
    executeOneTimeTierPayload(family.id, targetTier);
  } else if (family.upgradeType === 'role') {
    upgradeRoleTargetsAndRule(family.id, previousTier, targetTier);
  }

  runState.familyTiers[family.id] = targetTier;
}
```

## 3. Perks

### 3.1 Legendäre Perks

Legendäre Perks bleiben außerhalb des neuen Vierstufensystems und funktionieren unverändert. **Königsmacher (`L7`) wird entfernt.**

| ID | Name | Effekt | Status |
|---|---|---|---|
| L1 | Überladung | 5 gewählte Karten dauerhaft +6. | Beibehalten, unverändert |
| L2 | Unaufhaltsam | Solange Sieg: nächste Karte +4 bis Niederlage. | Beibehalten, unverändert |
| L3 | Letztes Aufbäumen | Positionen 36–40 +5. | Beibehalten, unverändert |
| L4 | Kritische Masse | Jeder Crit gibt Karte dauerhaft +1, max +4. | Beibehalten, unverändert |
| L5 | Jackpot | 4 Zufallskarten: erster Crit je Durchlauf +1.000. | Beibehalten, unverändert |
| L6 | Raserei | +5 % Crit je Sieg; Überschuss wird Crit-Schaden. | Beibehalten, unverändert |
| L8 | Schicksalsmaschine | Erfolgreichste und erfolgloseste Karte tauschen Werte. | Beibehalten, unverändert |
| L9 | Blutvertrag | 4 Karten −2; Nachfolger +6. | Beibehalten, unverändert |
| L10 | Kettenreaktion | Nach Crit ist nächster gewonnener Stich garantiert kritisch. | Beibehalten, unverändert |
| L11 | Zeitraffer | Position 40 wiederholt temporäre Effekte von Position 20. | Beibehalten, unverändert |

### 3.2 Reguläre Perk-Familien

Bei allen Tabellen gilt: `Alt` ist der bisherige Effekt; `I–IV` sind der neue Zielzustand.

#### A · Deck – dauerhafte Kartenwerte

| ID | Familie | Typ | Alt | I · Normal | II · Ungewöhnlich | III · Selten | IV · Rar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|
| A1 | Schwache Karten sind stark | Kumulativer Pick-Effekt | Alle Karten mit Wert 5 dauerhaft +4. | Alle ursprünglichen 5er erhalten dauerhaft +1 Wert. | Alle ursprünglichen 4er erhalten dauerhaft +2 Wert. | Alle ursprünglichen 3er erhalten dauerhaft +3 Wert. | Alle ursprünglichen 1er und 2er erhalten dauerhaft +4 Wert. | Jede gewählte Stufe verstärkt eine neue, niedrigere Wertgruppe. Frühere Boni bleiben bestehen. |
| A2 | Gerade Stärke | Kumulativer Pick-Effekt | Alle geraden Werte dauerhaft +1. | Vier zufällige gerade Karten +1. | Alle ursprünglichen 2er und 8er +1. | Alle ursprünglichen 4er und 6er +1. | Alle geraden Karten zusätzlich +1. | Neue Stufen wenden nur ihr Paket an; Stufe IV kann frühere Pakete zusätzlich skalieren. |
| A3 | Ungerade Stärke | Kumulativer Pick-Effekt | Alle ungeraden Werte dauerhaft +1. | Vier zufällige ungerade Karten +1. | Alle ursprünglichen 3er und 7er +1. | Alle ursprünglichen 1er und 9er +1. | Alle ungeraden Karten zusätzlich +1. | Wie Gerade Stärke. |
| A4 | Farbverstärkung | Kumulativer Pick-Effekt | Eine zufällige Farbe dauerhaft +2. | Eine zufällige Farbe: vier zufällige Karten +1. | Eine zufällige Farbe: alle Karten +1. | Wähle eine Farbe: alle Karten +1. | Wähle eine Farbe: alle Karten +2. | Jede Stufe ist ein neuer Farb-Buff; frühere Farb-Buffs bleiben. |
| A5 | Kleine ganz groß | Kumulativer Pick-Effekt | Vier zufällige ursprüngliche 1–3er je +5. | Zwei zufällige ursprüngliche 1–3er je +3. | Drei zufällige ursprüngliche 1–3er je +4. | Vier zufällige ursprüngliche 1–3er je +5. | Alle ursprünglichen 1–3er +3. | Jede Stufe bufft neue bzw. erneut zufällige Karten; Boni stapeln. |
| A6 | Mittelklasse | Kumulativer Pick-Effekt | Alle aktuellen Werte 4–7 dauerhaft +1. | Drei zufällige Karten mit aktuellem Wert 4–7 +1. | Fünf zufällige Karten mit aktuellem Wert 4–7 +1. | Alle Karten mit aktuellem Wert 4–7 +1. | Alle Karten mit aktuellem Wert 3–8 +1. | Prüfung des aktuellen Werts erfolgt jeweils beim Pick. |
| A7 | Spitzenförderung | Kumulativer Pick-Effekt | Vier aktuell höchste Karten je +4. | Zwei aktuell höchste Karten je +2. | Drei aktuell höchste Karten je +3. | Vier aktuell höchste Karten je +4. | Fünf aktuell höchste Karten je +5. | Rangliste wird bei jedem Pick neu bestimmt. |
| A8 | Nachzügler | Kumulativer Pick-Effekt | Vier aktuell niedrigste Karten je +5. | Zwei aktuell niedrigste Karten je +3. | Drei aktuell niedrigste Karten je +4. | Vier aktuell niedrigste Karten je +5. | Fünf aktuell niedrigste Karten je +6. | Rangliste wird bei jedem Pick neu bestimmt. |
| A9 | Farbduell | Kumulativer Pick-Effekt | Zufällige Farbe +3, andere zufällige Farbe −1. | Zufällige Farbe +1, andere −1. | Zufällige Farbe +2, andere −1. | Wähle die Gewinnerfarbe +3; Verliererfarbe zufällig −1. | Wähle Gewinner- und Verliererfarbe: +4 / −1. | Jede Stufe führt den jeweiligen Tausch dauerhaft aus. |
| A10 | Verdichtung | Kumulativer Pick-Effekt | Alle Karten mit mehrfach vorkommendem aktuellem Wert +1. | Zwei zufällige Karten aus mehrfachen Werten +1. | Vier zufällige Karten aus mehrfachen Werten +1. | Alle Karten aus Wertgruppen mit mindestens 3 Vorkommen +1. | Alle Karten aus mehrfachen Wertgruppen +1. | Deckzustand wird beim Pick geprüft. |

#### B · Stich – temporäre Stich-Effekte

| ID | Familie | Typ | Alt | I · Normal | II · Ungewöhnlich | III · Selten | IV · Rar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|
| B1 | Gegenangriff | Regelersetzung | Nach Niederlage nächste Karte +4. | Nach Niederlage nächste Karte +3. | Nach Niederlage nächste Karte +5. | Nach Niederlage nächste Karte +7. | Nach Niederlage nächste Karte +10. | Nur der höchste Wert ist aktiv. |
| B2 | Momentum | Regelersetzung | Nach genau 3 Siegen nächste Karte +5. | Nach genau 4 Siegen in Folge erhält die nächste Karte +4 Wert. | Nach genau 3 Siegen in Folge erhält die nächste Karte +5 Wert. | Nach genau 3 Siegen in Folge erhält die nächste Karte +7 Wert. | Nach genau 3 Siegen in Folge erhält die nächste Karte +10 Wert. | Die höhere Stufe ersetzt nur den Bonus und gegebenenfalls die benötigte Serienlänge. Es wird immer nur die direkt nächste Karte verstärkt. |
| B3 | Starker Auftakt | Regelersetzung | Erste 3 Karten je +4. | Erste 2 Karten je +2. | Erste 3 Karten je +3. | Erste 4 Karten je +4. | Erste 5 Karten je +5. | Nur höchste Fassung aktiv. |
| B4 | Zehnter Schlag | Regelersetzung | Position 10/20/30/40 +8. | Position 20 und 40 +6. | Position 10/20/30/40 +6. | Position 5/10/15/20/25/30/35/40 +6. | Jede fünfte Position +8. | Positionsliste wird vollständig ersetzt. |
| B5 | Initiative | Regelersetzung | Nach Niederlage nächsten Gleichstand gewinnen. | Nach 2 Niederlagen nächsten Gleichstand gewinnen. | Nach Niederlage nächsten Gleichstand gewinnen. | Nach Niederlage zählt die nächste eigene Karte bei Gleichstand als +1. | Nach Niederlage erhält die nächste Karte +2 Wert und gewinnt Gleichstand. | Nur höchste Regel aktiv. |
| B6 | Knappe Kiste | Regelersetzung | In Wiederholung +2 temporärer Wert. | In Wiederholung +1. | In Wiederholung +2. | In mindestens einer Formation +2. | In mindestens einer Formation +3. | Nur höchste Regel aktiv. |
| B7 | Durchbruch | Regelersetzung | Nach 5 Stichen ohne Sieg nächste Karte +10. | Nach 6 ohne Sieg +7. | Nach 5 ohne Sieg +10. | Nach 4 ohne Sieg +12. | Nach 3 ohne Sieg +15. | Triggerzähler und Bonus werden ersetzt. |
| B8 | Revanche | Regelersetzung | Nach 2 Niederlagen nächste Karte +7. | Nach 3 Niederlagen +6. | Nach 2 Niederlagen +7. | Nach 2 Niederlagen nächste zwei Karten je +6. | Nach jeder Niederlage nächste Karte +8. | Nur höchste Fassung aktiv. |
| B9 | Perfekte Folge | Regelersetzung | Treppenkarten +1/+2/+3, danach +4. | Treppenkarten ab dritter Karte +1, danach +2. | Wie heute: +1/+2/+3, danach +4. | Treppenkarten +2/+3/+4, danach +5. | Treppenkarten +3/+4/+5, danach +6. | Nur höchste Staffel aktiv. |
| B10 | Überzahl | Regelersetzung | Höherer Dauerwert als Vorgänger: +3. | Mindestens 2 höher als Vorgänger: +2. | Höher als Vorgänger: +3. | Nicht niedriger als Vorgänger: +3. | Höher als Vorgänger: +5; gleich: +2. | Nur höchste Vergleichsregel aktiv. |

#### C · Rolle – Kartenrollen

| ID | Familie | Typ | Alt | I · Normal | II · Ungewöhnlich | III · Selten | IV · Rar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|
| C1 | Vorhut | Rollen-Upgrade | 3 Ziele; auf Position 1–5 +3. | Wähle 1 Karte; Position 1–5 +2. | Wähle 2 Karten; Position 1–5 +3. | Wähle 3 Karten; Position 1–5 +4. | Wähle 4 Karten; Position 1–10 +4. | Bestehende Ziele werden aktualisiert; zusätzliche Ziele neu wählen. |
| C2 | Triumph | Rollen-Upgrade | 3 Ziele; nach Sieg beim nächsten Auftauchen +2. | 1 Ziel; nach Sieg +2. | 2 Ziele; nach Sieg +2. | 3 Ziele; nach Sieg +3. | 4 Ziele; nach Sieg +4. | Bestehende Rollen bleiben, Zahlenwert steigt. |
| C3 | Leibwache | Rollen-Upgrade | 2 Ziele; verliert Vorgänger, +5. | 1 Ziel; verliert Vorgänger, +3. | 2 Ziele; +4. | 3 Ziele; +5. | 4 Ziele; verliert einer der zwei Vorgänger, +6. | Zusätzliche Ziele neu wählen; Triggerregel ersetzt. |
| C4 | Staffelläufer | Rollen-Upgrade | 3 Ziele; nach Sieg Nachfolger +2. | 1 Ziel; Nachfolger +2. | 2 Ziele; Nachfolger +2. | 3 Ziele; Nachfolger +3. | 4 Ziele; nächste zwei Karten je +3. | Ziele bleiben; höchste Übergaberegel aktiv. |
| C5 | Anführer | Rollen-Upgrade | 1 Ziel; nach Sieg nächste 2 Karten +2. | 1 Ziel; nächste Karte +2. | 1 Ziel; nächste 2 Karten +2. | 2 Ziele; nächste 2 Karten +3. | 2 Ziele; nächste 3 Karten +4. | Bei III wird ein weiteres Ziel gewählt. |
| C6 | Finisher | Rollen-Upgrade | 2 Ziele; letzte Segmentposition +5. | 1 Ziel; letzte Segmentposition +3. | 2 Ziele; +4. | 3 Ziele; +5. | 4 Ziele; letzte zwei Segmentpositionen +5. | Bestehende Ziele aktualisieren, neue ergänzen. |
| C7 | Überlebensvorteil | Regelersetzung | Niedrigste Karte jedes Segments +3. | Niedrigste Karte in vier zufälligen Segmenten +2. | Niedrigste Karte jedes Segments +2. | Zwei niedrigste Karten jedes Segments +3. | Zwei niedrigste Karten jedes Segments +5. | Segmentprüfung läuft mit höchster Regel. |
| C8 | Joker | Rollen-Upgrade | 2 Ziele; zählen für Farbblock als Vorgängerfarbe. | 1 Ziel; als Vorgängerfarbe. | 2 Ziele; als Vorgängerfarbe. | 3 Ziele; als Vorgänger- oder Nachfolgerfarbe. | 4 Ziele; freie Farbe für Farbblock. | Ziele bleiben; Flexibilität der Wildcard steigt. |
| C9 | Opfergabe | Kumulativer Pick-Effekt | 1 Ziel −3; Nachfolger dauerhaft +5. | 1 Ziel −2; Nachfolger +3. | 1 Ziel −2; Nachfolger +4. | 1 Ziel −3; Nachfolger +6. | Wähle 2 Ziele: je −3; Nachfolger je +7. | Jede Stufe führt eine neue Opfergabe aus. |
| C10 | Bindeglied | Rollen-Upgrade | 2 Ziele; Treppe ±1. | 1 Ziel; Treppe ±1. | 2 Ziele; Treppe ±1. | 3 Ziele; Treppe ±1 oder ±2. | 4 Ziele; für Treppe beliebiger Wert zwischen Nachbarn. | Ziele bleiben; Interpretationsraum steigt. |

#### D · Score – Score-Perks

| ID | Familie | Typ | Alt | I · Normal | II · Ungewöhnlich | III · Selten | IV · Rar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|
| D1 | Punktebonus | Regelersetzung | Sieg mit Formation +75 Score. | Formation-Sieg +50. | Formation-Sieg +100. | Formation-Sieg +175. | Formation-Sieg +300. | Nur höchster Flat-Score aktiv. |
| D2 | Siegesserie | Regelersetzung | +25 je Serienpunkt, max +250. | +15 je Punkt, max +150. | +25 je Punkt, max +250. | +35 je Punkt, max +420. | +50 je Punkt, max +750. | Nur höchste Formel aktiv. |
| D3 | Hohe Karten, hohe Belohnung | Regelersetzung | Sieg mit Wert ≥8: +125. | Wert ≥9: +100. | Wert ≥8: +150. | Wert ≥7: +225. | Wert ≥6: +350. | Schwelle und Auszahlung werden ersetzt. |
| D4 | Außenseitersieg | Regelersetzung | Sieg mit Wert ≤3: +300. | Wert ≤2: +250. | Wert ≤3: +350. | Wert ≤4: +500. | Wert ≤5: +750. | Nur höchste Schwelle aktiv. |
| D5 | Zehnter Sieg | Regelersetzung | Jeder 10. Sieg +750. | Jeder 12. Sieg +600. | Jeder 10. Sieg +800. | Jeder 8. Sieg +900. | Jeder 5. Sieg +1.000. | Zählerregel ersetzt; Laufzähler bleibt erhalten. |
| D6 | Kritische Chance | Regelersetzung | Jeder Crit +150. | Crit +100. | Crit +175. | Crit +275. | Crit +450. | Nur höchster Wert aktiv. |
| D7 | Geschärfter Blick | Regelersetzung | Crit mit Wert ≥8: +300. | Crit mit Wert ≥9: +225. | Crit mit Wert ≥8: +350. | Crit mit Wert ≥7: +500. | Crit mit Wert ≥6: +750. | Schwelle und Auszahlung ersetzt. |
| D8 | Kritisches Momentum | Regelersetzung | Crit in Serie ab 2: +200. | Crit in Serie ab 3: +150. | Crit in Serie ab 2: +250. | Jeder Crit in Serie: +350. | Jeder Crit in Serie: +500; Serie steigt zusätzlich um 1. | Nur höchste Regel aktiv. |
| D9 | Perfekter Rhythmus | Regelersetzung | Jeder 5. Sieg +300. | Jeder 7. Sieg +250. | Jeder 5. Sieg +350. | Jeder 4. Sieg +450. | Jeder 3. Sieg +600. | Zählerregel ersetzt; Fortschritt bleibt. |
| D10 | Übermacht | Regelersetzung | Sieg mit ≥8 Vorsprung: +350. | ≥10: +300. | ≥8: +400. | ≥6: +550. | ≥4: +750. | Schwelle und Auszahlung ersetzt. |
| D11 | Kritische Ernte | Regelersetzung | Crit + Formation: +250. | Crit + Formation: +175. | Crit + Formation: +300. | Crit + Formation: +475. | Crit + Formation: +750. | Nur höchster Wert aktiv. |
| D12 | Präzision | Regelersetzung | 2 Siege gleicher Wert: zweiter +400. | 2 Siege gleicher Wert: +250. | 2 Siege gleicher Wert: +450. | Gleicher oder ±1 Wert: +550. | Gleicher oder ±1 Wert: +800; Kette kann weiterlaufen. | Nur höchste Vergleichsregel aktiv. |
| D13 | Wechselspiel | Regelersetzung | Sieg direkt nach Niederlage +200. | +150. | +275. | +450. | +700 und nächste Niederlage gibt +200 gespeicherten Score. | Nur höchste Regel aktiv. |
| D14 | Crit-Folge | Regelersetzung | Sieg direkt nach Crit +200. | +150. | +275. | +450. | +700; ist der Folgesieg ebenfalls Crit, zusätzlich +300. | Nur höchste Regel aktiv. |
| D15 | Fehlzündung | Regelersetzung | Sieg ohne Crit lädt +30, max +300. | +20, max +200. | +35, max +350. | +50, max +500. | +75, max +750; Ladung bleibt nach Crit zu 25 % erhalten. | Aktuelle Ladung bleibt beim Upgrade bestehen, wird aber ans neue Cap angepasst. |
| D16 | Schwachstellenanalyse | Regelersetzung | Nach Niederlage mit ≥5 Abstand: nächster Sieg +300. | ≥7 Abstand: +250. | ≥5: +350. | ≥4: +500. | Nach jeder Niederlage: nächster Sieg +600; bei ≥5 Abstand +900. | Nur höchste Regel aktiv. |
| D17 | Farbserie | Regelersetzung | Gleiche Siegerfarbe: +100 je Stufe, max +400. | +75 je Stufe, max +300. | +100 je Stufe, max +500. | +150 je Stufe, max +750. | +200 je Stufe, max +1.200; Farbwechsel halbiert statt reset. | Nur höchste Formel aktiv; laufende Farbstufe bleibt. |
| D18 | Volles Haus | Regelersetzung | 5 Siege im Segment: fünfter +750. | 5 Siege: +500. | 4 Siege: vierter +650. | 4 Siege: vierter +900. | 3 Siege: dritter +1.000; fünfter zusätzlich +1.000. | Nur höchste Segmentregel aktiv. |
| D19 | Überschusskrit | Regelersetzung | Crit über 100 % Chance +250. | Über 110 %: +200. | Über 100 %: +300. | Jeder Überschuss-Crit +500. | +500 plus 5 Score je Prozentpunkt über 100. | Nur höchste Formel aktiv. |

#### E · Form – Formationswerkzeuge

| ID | Familie | Typ | Alt | I · Normal | II · Ungewöhnlich | III · Selten | IV · Rar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|
| E1 | Schrittmacher | Regelersetzung | Wiederholung darf 1 fremde Karte enthalten. | Einmal pro Segment darf 1 fremde Karte überbrückt werden. | Jede Wiederholung darf 1 fremde Karte enthalten. | Bis zu 2 einzelne fremde Karten dürfen überbrückt werden. | Fremde Karten unterbrechen Wiederholungen nicht, zählen aber nicht mit. | Nur höchste Erkennungsregel aktiv. |
| E2 | Farbbrücke | Regelersetzung | 1 andersfarbige Karte unterbricht Farbblock nicht. | Einmal pro Segment darf 1 Fremdfarbe überbrückt werden. | Jeder Farbblock darf 1 Fremdfarbe enthalten. | Jeder Farbblock darf 2 Fremdfarben enthalten. | Fremdfarben unterbrechen nie; jede zweite zählt sogar zur Länge. | Nur höchste Erkennungsregel aktiv. |
| E3 | Sanfter Anstieg | Regelersetzung | Treppe darf einmal zwei gleiche Werte enthalten. | Einmal pro Segment ist 1 Gleichstand erlaubt. | Jede Treppe darf 1 Gleichstand enthalten. | Jede Treppe darf 2 Gleichstände enthalten. | Gleiche Werte gelten in Treppen als +1 Schritt, wenn nötig. | Nur höchste Regel aktiv. |
| E4 | Großer Schritt | Regelersetzung | Treppe darf einmal einen Rückschritt enthalten. | Einmal pro Segment 1 Rückschritt. | Jede Treppe 1 Rückschritt. | Jede Treppe bis zu 2 Rückschritte. | Treppen dürfen die Richtung einmal wechseln. | Nur höchste Regel aktiv. |
| E5 | Pendelwerk | Regelersetzung | Wechsel ab 2 Karten, Differenz ≥4. | Wechsel ab 3 Karten; Mindestdifferenz 3. | Wechsel ab 2 Karten; Mindestdifferenz 4. | Wechsel ab 2 Karten; Mindestdifferenz 3. | Wechsel ab 2 Karten; Mindestdifferenz 2 und Faktor startet bei ×1,35. | Nur höchste Regel aktiv. |
| E6 | Drehzahl | Regelersetzung | Eine Karte darf zu 2 Treppen gehören. | Einmal pro Segment darf eine Karte zu 2 Treppen gehören. | Eine Karte pro Treppe darf doppelt zählen. | Bis zu 2 Karten pro Segment dürfen doppelt zählen. | Jede Karte darf gleichzeitig zu 2 Treppen gehören. | Nur höchste Regel aktiv. |
| E7 | Kontrollverlust | Regelersetzung | Position 10/20/30/40 sind ×1,25-Anker. | Position 20 und 40 sind Anker. | Position 10/20/30/40 sind Anker. | Jede Segment-Endposition ist Anker. | Jede Segment-Endposition ist ×1,35-Anker. | Ankerliste und Faktor ersetzen sich. |
| E8 | Schnellschuss | Regelersetzung | Position 5/15/25/35 sind ×1,25-Anker. | Position 5 und 25 sind Anker. | Position 5/15/25/35 sind Anker. | Position 5/10/15/20/25/30/35/40 sind Anker. | Jede fünfte Position ist ×1,35-Anker und erhält +2 Wert. | Ankerliste und Zusatzbonus ersetzen sich. |
| E9 | Segmentarbeit | Regelersetzung | Formationen dürfen Segmentgrenzen überschreiten. | Wähle 1 Grenze; sie ist offen. | Wähle 2 Grenzen; sie sind offen. | Alle Grenzen sind offen, aber nur eine Formation darf je Grenze weiterlaufen. | Alle Grenzen sind offen; Formationen laufen ohne Einschränkung weiter. | Bei Upgrades bleiben gewählte Grenzen offen; höchste globale Regel greift. |
| E10 | Feinjustierung | Geparkt / möglicher Shop-Transfer | Jede Formationsphase +1 kostenloser beliebiger Tausch. | GEPARKT – vorerst kein Perk. | GEPARKT – vorerst kein Perk. | GEPARKT – vorerst kein Perk. | GEPARKT – vorerst kein Perk. | Nicht weiter als vierstufige Perk-Familie ausarbeiten. |

### 3.3 Spezifische Perk-Entscheidungen

- `A1` heißt künftig **Schwache Karten sind stark**. Die Stufen gehen von ursprünglichem Wert 5 abwärts; je schwächer die Karten, desto höher der Bonus.
- `B2 Momentum` darf auch auf III und IV ausschließlich die **direkt nächste Karte** verstärken. Keine Mehrkarten-Auszahlung und kein Trigger nach nur zwei Siegen, damit keine selbsttragende Endlossieg-Kette entsteht.
- `E10 Feinjustierung` wird **nicht als Perk implementiert**. Die Familie ist im Perk-Pool deaktiviert und wird als Shop-Familie umgesetzt.

## 4. Shop-Items

### 4.1 Shop-Grundregeln

- Zielstufe I/II/III/IV kostet 8/12/18/30 Münzen.
- Ein Upgrade kostet den vollen Preis der Zielstufe; es gibt im aktuellen Design keinen Rabatt für die bereits gehaltene Stufe.
- Bisherige legendäre Shop-Items werden nicht länger über einen separaten Legendär-Pool behandelt. Sie sind reguläre vierstufige Familien.
- Der bestehende Shop soll Angebote anhand von Familien-ID und Zielstufe erzeugen.
- Nach Kauf wird der Familienrang gespeichert und alle niedrigeren oder gleichen Stufen dieser Familie werden aus zukünftigen Angeboten entfernt.

### 4.2 Shop-Familien

#### Shop – Kartenfamilien

| Familie | Alte IDs | Alt | Typ | I · 8 | II · 12 | III · 18 | IV · 30 | Wiederholbar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|---|
| Feinschliff | K1 / K5 / K8 | K1: 1 Karte +1 (8). K5: 1 Karte +2 (12). K8: 1 Karte +3 (18). | Regelersetzung / einmaliger Pick | Wähle 1 Karte: dauerhaft +1. | Wähle 1 Karte: dauerhaft +2. | Wähle 1 Karte: dauerhaft +3. | Wähle 1 Karte: dauerhaft +5. | Ja | Beim Upgrade wird dieselbe oder eine neu gewählte Karte um die Differenz zur Zielstufe verstärkt. Direkter Drop gibt nur den Zielwert. |
| Mehrfacher Feinschliff | K6 / K9 | K6: 2 Karten je +1 (12). K9: 3 Karten je +1 (18). | Kumulativer Pick-Effekt | Wähle 1 Karte: dauerhaft +1. | Wähle 2 Karten: dauerhaft je +1. | Wähle 3 Karten: dauerhaft je +1. | Wähle 5 Karten: dauerhaft je +1. | Ja | Jede gekaufte Stufe führt ihr eigenes Kartenpaket aus; frühere Verstärkungen bleiben. |
| Umlackierung | K2 / K7 / K10 | K2: 1 Karte umfärben (8). K7: 2 Karten umfärben (12). K10: 3 Karten umfärben (18). | Kumulativer Pick-Effekt | Wähle 1 Karte und eine neue Farbe. | Wähle 2 Karten und für jede eine neue Farbe. | Wähle 3 Karten und für jede eine neue Farbe. | Wähle 5 Karten und für jede eine neue Farbe. | Ja | Jede Stufe erlaubt eine neue Umfärbung; frühere Farbänderungen bleiben. |
| Werttausch | K3 | Wähle 2 Karten; sie tauschen ihre Dauerwerte. Preis 8. | Kumulativer Pick-Effekt | Wähle 2 Karten; sie tauschen ihre Dauerwerte. | Wähle 2 Karten; Werttausch, danach erhält die niedrigere Karte +1. | Wähle 2 Paare; jedes Paar tauscht seine Dauerwerte. | Wähle 2 Karten; du darfst ihre Werte frei zwischen beiden verteilen, Summe bleibt gleich; beide erhalten danach +1. | Ja | Jede Stufe ist ein neuer Eingriff ins Deck. |
| Farbtausch | K4 | Wähle 2 Karten; sie tauschen ihre Farben. Preis 8. | Kumulativer Pick-Effekt | Wähle 2 Karten; sie tauschen ihre Farben. | Wähle 2 Karten; tausche Farben oder gib beiden dieselbe gewählte Farbe. | Wähle 2 Paare; jedes Paar tauscht seine Farben. | Wähle bis zu 4 Karten; verteile ihre vorhandenen Farben frei neu. | Ja | Jede Stufe ist ein neuer Eingriff; frühere Farben bleiben wie geändert. |
| Segmentveredelung | K-L1 | Legendär: Wähle 1 Segment; alle 5 Karten dauerhaft +1. Preis 30. | Kumulativer Pick-Effekt | Wähle 1 Segment; 2 zufällige Karten darin +1. | Wähle 1 Segment; 3 zufällige Karten darin +1. | Wähle 1 Segment; alle 5 Karten darin +1. | Wähle 1 Segment; alle 5 Karten darin +2. | Nein | Jede Stufe führt eine neue Segmentveredelung aus; frühere Boni bleiben. |

#### Shop – Ankerfamilien

| Familie | Alte IDs | Alt | Typ | I · 8 | II · 12 | III · 18 | IV · 30 | Wiederholbar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|---|
| Kraftanker | A1 | Eine Position: Karte erhält im Stich +2 temporären Wert. Preis 8. | Regelersetzung | Wähle 1 Position: +1 temporärer Wert. | Wähle 1 Position: +2 temporärer Wert. | Wähle 1 Position: +4 temporärer Wert. | Wähle 1 Position: +6 temporärer Wert; bei Sieg zusätzlich +100 Score. | Ja | Beim Upgrade bleibt die Position; die aktive Stärke wird ersetzt. Position darf beim Kauf neu gewählt werden. |
| Punkteanker | A2 | Eine Position: Sieg gibt +150 Flat-Score. Preis 8. | Regelersetzung | Wähle 1 Position: Sieg +100 Score. | Wähle 1 Position: Sieg +200 Score. | Wähle 1 Position: Sieg +350 Score. | Wähle 1 Position: Sieg +600 Score. | Ja | Nur der höchste Scorewert ist aktiv. |
| Kritanker | A3 | Eine Position: +15 Prozentpunkte Crit-Chance. Preis 12. | Regelersetzung | Wähle 1 Position: +10 pp Crit. | Wähle 1 Position: +15 pp Crit. | Wähle 1 Position: +25 pp Crit. | Wähle 1 Position: +40 pp Crit; Crit dort gibt zusätzlich +250 Score. | Ja | Nur die höchste Crit-Regel ist aktiv. |
| Serienanker | A4 | Eine Position: Sieg erhöht Serie um +1 zusätzlichen Punkt. Preis 12. | Regelersetzung | Wähle 1 Position: jeder zweite Sieg dort +1 Serienpunkt. | Wähle 1 Position: jeder Sieg dort +1 Serienpunkt. | Wähle 1 Position: Sieg dort +2 Serienpunkte. | Wähle 1 Position: Sieg dort +2 Serienpunkte; Niederlage dort setzt die Serie nicht zurück. | Ja | Nur die höchste Regel ist aktiv. |
| Formationsanker | A5 | Eine Position zählt als Formation und gibt bei Sieg ×1,25. Preis 18. | Regelersetzung | Wähle 1 Position: zählt als Formation, bei Sieg ×1,15. | Wähle 1 Position: zählt als Formation, bei Sieg ×1,25. | Wähle 1 Position: zählt als Formation, bei Sieg ×1,40. | Wähle 1 Position: zählt als Formation, bei Sieg ×1,60; kann mit natürlichen Formationen überlappen. | Ja | Nur der höchste Faktor ist aktiv. |
| Jokeranker | A6 | Eine Position: darf für jede Basisformation benötigten Wert/Farbe annehmen. Preis 18. | Regelersetzung | Wähle 1 Position: Joker nur für Wiederholung. | Wähle 1 Position: Joker für Wiederholung oder Treppe. | Wähle 1 Position: Joker für Wiederholung, Treppe und Farbblock. | Wähle 1 Position: Joker für alle Basisformationen; bildet allein keine Formation. | Ja | Die Position bleibt, die Joker-Flexibilität steigt. |
| Zeitsegment | A-L1 | Legendär: 1 Segment wird direkt ein zweites Mal gespielt; Durchlauf 45 Stiche. Preis 30. | Regelersetzung | Wähle 1 Segment: seine letzte Karte wird einmal wiederholt. | Wähle 1 Segment: seine letzten 2 Karten werden wiederholt. | Wähle 1 Segment: alle 5 Karten werden wiederholt, aber nur Score- und Serien-Effekte zählen. | Wähle 1 Segment: vollständige Wiederholung aller 5 Karten inklusive Score, Serie, Crits, Skills und Positionseffekten. | Nein | Nur die höchste Wiederholungsregel ist aktiv. |

#### Shop – Formationsfamilien

| Familie | Alte IDs | Alt | Typ | I · 8 | II · 12 | III · 18 | IV · 30 | Wiederholbar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|---|
| Abstieg | F1 | Treppen dürfen streng steigend oder streng fallend verlaufen. Preis 8. | Regelersetzung | Wähle pro Durchlauf 1 Segment: Treppen dürfen dort fallend verlaufen. | Treppen dürfen überall steigend oder fallend verlaufen. | Treppen dürfen einmal die Richtung wechseln. | Treppen dürfen beliebig als Berg oder Tal verlaufen; jeder Richtungswechsel nach dem ersten senkt den Faktor um 0,10. | Nein | Nur die höchste Erkennungsregel ist aktiv. |
| Enger Wechsel | F2 | Wechsel-Mindestdifferenz sinkt von 4 auf 3. Preis 8. | Regelersetzung | Ein Wechsel pro Segment darf Mindestdifferenz 3 nutzen. | Alle Wechsel: Mindestdifferenz 3. | Alle Wechsel: Mindestdifferenz 2. | Alle Wechsel: Mindestdifferenz 2; ab der vierten Karte +0,10 zusätzlicher Faktor je Karte. | Nein | Nur die höchste Schwelle ist aktiv. |
| Verstärkte Wiederholung | F3 | Faktor der zweiten Wiederholungskarte ×1,25 → ×1,35. Preis 12. | Regelersetzung | Zweite Karte einer Wiederholung ×1,30. | Zweite Karte ×1,35. | Zweite und dritte Karte erhalten je +0,10 Faktor. | Alle Wiederholungsfaktoren erhalten zusätzlich ×1,20. | Nein | Nur die höchste Faktorregel ist aktiv. |
| Farballianz | F4 | Wähle 2 Farben; sie zählen für Farbblöcke als dieselbe Farbe. Preis 12. | Regelersetzung | Wähle 2 Farben; einmal pro Segment dürfen sie verbunden werden. | Wähle 2 Farben; sie zählen immer als dieselbe Farbe. | Wähle 3 Farben; sie zählen als dieselbe Farbe. | Alle vier Farben dürfen in Farbblöcken paarweise als zwei frei gewählte Allianzen gruppiert werden. | Nein | Allianzen werden beim Upgrade neu festgelegt. |
| Offene Grenze | F5 | Wähle 1 Segmentgrenze; Formationen dürfen sie überschreiten. Preis 18, wiederholbar. | Kumulativer Pick-Effekt | Wähle 1 Segmentgrenze: nur Wiederholungen dürfen sie überschreiten. | Wähle 1 Segmentgrenze: alle Formationen dürfen sie überschreiten. | Wähle 2 Segmentgrenzen: alle Formationen dürfen sie überschreiten. | Alle Segmentgrenzen sind offen. | Ja | Gewählte Grenzen bleiben offen; höhere Stufen öffnen zusätzliche oder globale Grenzen. |
| Nachhall | F6 | Endet eine Formation, erhält die nächste Karte den stärksten Einzelfaktor als eigene Formation. Preis 18. | Regelersetzung | Nachhall nur bei Wiederholungen; Faktor maximal ×1,20. | Nachhall bei allen Formationen; Faktor maximal ×1,25. | Nachhall übernimmt den stärksten Einzelfaktor vollständig. | Nachhall übernimmt den stärksten Einzelfaktor und hält für die nächsten 2 Karten; erzeugt keinen weiteren Nachhall. | Nein | Nur die höchste Nachhallregel ist aktiv. |
| Formationskern | F-L1 | Legendär: Wähle Formationstyp; jede aktive Formation dieses Typs zusätzlich ×1,50. Preis 30. | Regelersetzung | Wähle 1 Formationstyp: dessen aktive Formationen zusätzlich ×1,15. | Wähle 1 Formationstyp: zusätzlich ×1,25. | Wähle 1 Formationstyp: zusätzlich ×1,40. | Wähle 1 Formationstyp: zusätzlich ×1,50, inklusive Nachhall. | Nein | Der gewählte Formationstyp bleibt; Faktor steigt. |
| Feinjustierung | E10 → Shop | Geparkter Perk: jede Formationsphase +1 Energie. | Regelersetzung | Jede zweite Formationsphase: +1 Energie. | Jede Formationsphase: +1 Energie. | Jede Formationsphase: +2 Energie. | Jede Formationsphase: +3 Energie. | Nur die höchste Energiestufe ist aktiv. | Einheitliche Formulierung: zusätzliche Energie statt kostenloser Tausche. 1 Energie entspricht 1 Tausch. |

#### Shop – Planungsfamilien

| Familie | Alte IDs | Alt | Typ | I · 8 | II · 12 | III · 18 | IV · 30 | Wiederholbar | Upgrade-Verhalten |
|---|---|---|---|---|---|---|---|---|---|
| Perk-Neuwurf | P1 | 1 gespeicherter Neuwurf für eine zukünftige Perk-Auswahl. Preis 8. | Kumulativer Vorrat / Regelersetzung | Erhalte 1 gespeicherten Perk-Neuwurf. | Erhalte 2 gespeicherte Perk-Neuwürfe. | Erhalte 3 gespeicherte Perk-Neuwürfe; ein ungenutzter bleibt nach der Auswahl erhalten. | Bei jeder zukünftigen Perk-Auswahl 1 kostenloser Neuwurf. | Ja | I–III geben Vorrat; IV ersetzt den Vorrat durch eine dauerhafte Regel. |
| Skill-Neuwurf | P2 | 1 gespeicherter Neuwurf für eine zukünftige Skill-Auswahl. Preis 8. | Kumulativer Vorrat / Regelersetzung | Erhalte 1 gespeicherten Skill-Neuwurf. | Erhalte 2 gespeicherte Skill-Neuwürfe. | Erhalte 3 gespeicherte Skill-Neuwürfe; ein ungenutzter bleibt nach der Auswahl erhalten. | Bei jeder zukünftigen Skill-Auswahl 1 kostenloser Neuwurf. | Ja | Wie Perk-Neuwurf. |
| Warenwechsel | P3 | Eine Kategorie des aktuellen Shops einmal neu würfeln. Preis 8. | Kumulativer Soforteffekt | Würfle 1 einzelnes Angebot neu. | Würfle 1 Kategorie neu. | Würfle 2 Kategorien neu. | Würfle den gesamten Shop neu; mindestens ein günstiges Angebot bleibt garantiert. | Ja | Jede Stufe ist ein sofortiger Shop-Eingriff. |
| Reservierung | P4 | Ein anderes Item wird im nächsten Shop zusätzlich angeboten. Preis 12. | Kumulativer Soforteffekt | Reserviere 1 Item für den nächsten Shop. | Reserviere 1 Item für die nächsten 2 Shops, bis es gekauft wird. | Reserviere bis zu 2 Items für den nächsten Shop. | Reserviere 1 Familie; im nächsten Shop erscheint garantiert die nächsthöhere verfügbare Stufe dieser Familie. | Ja | Jede Stufe erzeugt ihre eigene Reservierung. |
| Legendensuche: Perks | P5 | Zukünftige Legendär-Chance für Perks +5 pp, bis +15 pp. Preis 18. | Regelersetzung / kumulative Chance | Rar- und Legendär-Chance für Perks +3 pp. | +5 pp. | +10 pp. | +15 pp; zusätzlich mindestens ein ungewöhnlicher oder besserer Perk pro Angebot. | Ja | Beim Upgrade gilt nur der höchste Gesamtbonus; keine Addition über das Ziel hinaus. |
| Legendensuche: Skills | P6 | Zukünftige Legendär-Chance für Skills +5 pp, bis +15 pp. Preis 18. | Regelersetzung / kumulative Chance | Rar- und Legendär-Chance für Skills +3 pp. | +5 pp. | +10 pp. | +15 pp; zusätzlich mindestens ein ungewöhnlicher oder besserer Skill pro Angebot. | Ja | Wie Perk-Legendensuche. |
| Schicksalskontrolle | P-L1 | Legendär: bei jeder zukünftigen Perk- und Skill-Auswahl 1 kostenloser Neuwurf. Preis 30. | Regelersetzung | Bei der nächsten Perk- oder Skill-Auswahl 1 kostenloser Neuwurf. | Bei den nächsten 3 Perk-/Skill-Auswahlen je 1 kostenloser Neuwurf. | Bei jeder zukünftigen Perk-Auswahl 1 kostenloser Neuwurf und bei jeder Skill-Auswahl insgesamt 3 gespeicherte Neuwürfe. | Bei jeder zukünftigen Perk- und Skill-Auswahl 1 kostenloser Neuwurf. | Nein | Nur die höchste Regel ist aktiv. |

### 4.3 Feinjustierung – verbindliche Terminologie

`Feinjustierung` wird überall ausschließlich über **Formationsenergie** beschrieben. Ein kostenloser Tausch ist mechanisch identisch mit `+1 Energie` und darf nicht als separate Mechanik implementiert oder angezeigt werden.

| Stufe | Effekt |
|---|---|
| I | Jede zweite Formationsphase: +1 Energie. |
| II | Jede Formationsphase: +1 Energie. |
| III | Jede Formationsphase: +2 Energie. |
| IV | Jede Formationsphase: +3 Energie. |

## 5. Skills – Erweiterung ohne Raritätssystem

Skills erhalten **kein** Raritätssystem. Alle Skills bleiben gleichwertige Einzeloptionen innerhalb ihres Archetyps. Die folgenden Änderungen erweitern jeden Archetyp um zwei neue Skills und schärfen bestehende Überschneidungen.

### 5.1 Globale Skill-Regeln

- Die bestehenden drei Archetypen **Blitz**, **Feuer** und **Eis** bleiben erhalten.
- Jeder Archetyp erhält genau zwei zusätzliche normale Skills.
- Die maximale Anzahl gleichzeitig gehaltener Skills bleibt unverändert.
- Neue Skills werden wie bestehende normale Skills in den jeweiligen Archetyp-Pool aufgenommen.
- Ionisierung stapelt bis maximal **5 Stapel pro Karte**.
- Temporäre Kartenwertboni gelten nur für den angegebenen Durchlauf beziehungsweise das nächste Auftauchen.
- Neue Skills müssen dieselben Trigger- und UI-Konventionen wie bestehende Skills verwenden.

---

### 5.2 Blitz

#### Neuer Skill: Blitzfänger

**Vorgeschlagene ID:** `SK_LIGHTNING_11`

> Würde eine Karte ionisiert, die bereits 5 Ionisierungsstapel besitzt, erhält sie stattdessen +2 temporären Wert und erzeugt 1 Ladung.

Implementierungsregeln:

- Der Effekt greift nur, wenn die Zielkarte bereits vor der neuen Ionisierung bei 5 Stapeln steht.
- Die zusätzliche Ionisierung wird in diesem Fall nicht angewendet.
- Stattdessen erhält die Karte einmalig `+2` temporären Wert.
- Zusätzlich wird `+1` Blitzladung erzeugt.
- Mehrere Ionisierungsversuche auf dieselbe volle Karte dürfen den Effekt mehrfach auslösen, sofern sie aus getrennten Triggern stammen.
- Der Ladungsgewinn respektiert das aktuelle Ladungsmaximum.

#### Neuer Skill: Spannungsbogen

**Vorgeschlagene ID:** `SK_LIGHTNING_12`

> Gewinnt eine ionisierte Karte, wird ihr direkter Nachfolger um 1 Stapel ionisiert. Besitzt dieser bereits 5 Ionisierungsstapel, springt der Effekt in Deckreihenfolge zur nächsten noch nicht vollständig ionisierten, noch nicht gespielten Karte weiter.

Implementierungsregeln:

1. Trigger nur bei einem Sieg mit einer Karte, die mindestens 1 Ionisierungsstapel besitzt.
2. Suche ab der direkt folgenden Deckposition vorwärts.
3. Bereits gespielte Karten werden übersprungen.
4. Karten mit 5 Ionisierungsstapeln werden übersprungen.
5. Die erste gültige Karte erhält genau `+1` Ionisierungsstapel.
6. Es wird pro Trigger höchstens eine Karte ionisiert.
7. Gibt es keine gültige Karte mehr, verfällt der Effekt.
8. Die Suche läuft nicht vom Deckende zurück an den Anfang.

---

### 5.3 Feuer

#### Bestehender Skill: Glühende Klinge – Änderung

**ID:** `SK_FIRE_06`

Bisher:

> Bei mindestens 50 % Hitze erhalten alle eigenen Karten +2 temporären Wert.

Neu:

> Bei mindestens 50 % Hitze erhalten alle eigenen Karten +1 temporären Wert. Solange der Effekt aktiv ist, verursachen Niederlagen 10 % mehr Hitzeverlust.

Implementierungsregeln:

- Der Wertbonus ist aktiv, solange die Hitze vor dem Stich mindestens `50` beträgt.
- Fällt die Hitze unter `50`, endet der Wertbonus sofort.
- Der erhöhte Hitzeverlust gilt nur, solange Glühende Klinge aktiv ist.
- Der Modifikator beträgt `+10 %` auf den berechneten Basis-Hitzeverlust.

#### Neuer Skill: Überhitzt

**Vorgeschlagene ID:** `SK_FIRE_13`

> Bei mindestens 80 % Hitze erhalten alle eigenen Karten zusätzlich +2 temporären Wert. Solange der Effekt aktiv ist, verursachen Niederlagen 50 % mehr Hitzeverlust.

Implementierungsregeln:

- Der Wertbonus ist zusätzlich zu Glühende Klinge.
- Mit beiden Skills aktiv ergibt sich ab 80 Hitze insgesamt `+3` temporärer Wert.
- Der Verlustmodifikator von Überhitzt beträgt `+50 %`.
- Die Verlustmodifikatoren von Glühende Klinge und Überhitzt werden addiert:
  - nur Glühende Klinge: `×1,10`
  - nur Überhitzt: `×1,50`
  - beide aktiv: `×1,60`
- Anschließend werden bestehende Verlustreduktionen wie Hitzeschild angewendet.
- Erst am Ende wird zugunsten des Spielers abgerundet.

Empfohlene Berechnungsreihenfolge:

```ts
let modifiedLoss = baseHeatLoss;

let increasedLossPercent = 0;
if (hasGlowingBlade && heatBeforeLoss >= 50) increasedLossPercent += 0.10;
if (hasOverheated && heatBeforeLoss >= 80) increasedLossPercent += 0.50;

modifiedLoss *= 1 + increasedLossPercent;

if (hasHeatShield) {
  modifiedLoss *= 0.5;
}

const finalHeatLoss = Math.floor(modifiedLoss);
```

#### Neuer Skill: Funkenflug

**Vorgeschlagene ID:** `SK_FIRE_14`

> Ein Sieg mit mindestens 8 Wertpunkten Vorsprung speichert 25 % seines Feuer-Flat-Scores. Der nächste Sieg erhält den gespeicherten Betrag als zusätzlichen Flat-Score.

Implementierungsregeln:

- Maßgeblich ist ausschließlich der durch den Feuer-Archetyp erzeugte Flat-Score dieses Stichs.
- Andere Scorequellen, Crit-Multiplikatoren, Formationen und Perks werden nicht in die Berechnung einbezogen.
- Der gespeicherte Betrag beträgt `floor(fireFlatScore * 0.25)`.
- Der Speicher wird beim nächsten Sieg vollständig als zusätzlicher Flat-Score ausgezahlt.
- Eine Niederlage löscht den gespeicherten Betrag nicht.
- Solange bereits ein Betrag gespeichert ist, kann kein weiterer Funkenflug-Betrag erzeugt werden.
- Der Sieg, der den gespeicherten Betrag verbraucht, erzeugt nicht gleichzeitig einen neuen Speicher.
- Der Speicher wird am Ende des Durchlaufs nicht gelöscht und bleibt bis zum nächsten Sieg bestehen.

---

### 5.4 Eis

#### Bestehender Skill: Kristallform – Änderung

**ID:** `SK_ICE_10`

Bisher:

> Eingefrorene Karten dürfen für Wiederholung, Treppe und Wechsel als Wert −1, unverändert oder +1 zählen.

Neu:

> Eingefrorene Karten dürfen für Wiederholung, Treppe und Wechsel als ihren tatsächlichen Wert, −2 oder +2 gelten. Ist eine eingefrorene Karte dadurch Teil mindestens einer dieser Formationen, erhält sie zusätzlich einen Formationsbonus.

Implementierungsregeln:

- Für jede Formation wird automatisch die günstigste der drei Varianten verwendet:
  - tatsächlicher Wert
  - tatsächlicher Wert `−2`
  - tatsächlicher Wert `+2`
- Die Karte selbst behält ihren echten Dauer- und temporären Wert.
- Die alternative Interpretation gilt nur für die Formationserkennung.
- Der Bonus gilt nur, wenn die Karte durch eine der zulässigen Interpretationen tatsächlich Teil einer gültigen Wiederholung, Treppe oder eines Wechsels ist.
- Der Bonus zählt als zusätzlicher **Formationsbonus**, nicht als temporärer Kartenwert.
- Mehrere gültige Formationen lösen den Kristallform-Bonus pro Karte und Stich nur einmal aus.
- **Offener Balancewert:** Die genaue Höhe des Formationsbonus muss noch festgelegt werden. Empfohlener Datenparameter: `crystalFormBonusMultiplier`.

Abgrenzung zu `Eisschritt`:

- `Eisschritt` bleibt der spezialisierte Treppen-Skill mit einer Abweichung von `±1`.
- `Kristallform` arbeitet gröber mit `±2`, gilt dafür für Wiederholung, Treppe und Wechsel und belohnt die erfolgreiche Nutzung zusätzlich.

#### Neuer Skill: Gletscherschub

**Vorgeschlagene ID:** `SK_ICE_11`

> Entsteht durch einen kostenlosen Frosttausch am neuen Platz mindestens eine neue Formation, erhalten alle fünf Karten des betroffenen Segments im nächsten Durchlauf +2 temporären Wert.

Implementierungsregeln:

1. Der Trigger gilt nur für einen kostenlosen Frosttausch.
2. Vor dem Tausch wird der Formationszustand des Zielsegments gespeichert.
3. Nach dem Tausch wird der Formationszustand erneut berechnet.
4. Mindestens eine Formation muss neu entstanden sein, die vor dem Tausch in diesem Segment nicht aktiv war.
5. Wird die Bedingung erfüllt, erhalten alle Karten des Zielsegments für den nächsten Durchlauf `+2` temporären Wert.
6. Mehrere neu entstandene Formationen durch denselben Tausch erhöhen den Bonus nicht.
7. Mehrere Gletscherschub-Auslösungen auf dasselbe Segment vor dem nächsten Durchlauf stapeln nicht; sie erneuern nur den gespeicherten Bonus.
8. Eine lediglich verlängerte Formation zählt als neu, wenn mindestens eine zuvor nicht enthaltene Position nun Teil der Formation ist.
9. Der Bonus bleibt an den fünf betroffenen Karten, auch wenn sie anschließend innerhalb der Formationsphase noch einmal verschoben werden.

#### Neuer Skill: Eisblüte

**Vorgeschlagene ID:** `SK_ICE_12`

> Gewinnt eine eingefrorene Karte, die gleichzeitig Teil von mindestens zwei aktiven Formationen ist, erhalten ihre direkten Nachbarn im nächsten Durchlauf jeweils +3 temporären Wert.

Implementierungsregeln:

- Es müssen beim gewonnenen Stich mindestens zwei gleichzeitig aktive Formationen auf der auslösenden Karte liegen.
- Anker allein zählen nicht als eine der zwei benötigten Formationen.
- Kristallform, Eisschritt, Frostbrücke und andere Wildcard-Regeln dürfen die Formationen ermöglichen.
- Der direkte Vorgänger und der direkte Nachfolger in der Deckreihenfolge erhalten jeweils `+3` temporären Wert für den nächsten Durchlauf.
- An Position 1 oder 40 wird nur der vorhandene Nachbar verstärkt.
- Segmentgrenzen verhindern die Nachbarschaft nicht; maßgeblich ist die direkte Deckposition.
- Mehr als zwei aktive Formationen erhöhen den Bonus nicht.
- Mehrere Eisblüte-Auslösungen auf derselben Zielkarte vor deren nächstem Auftauchen stapeln nicht; sie erneuern den Bonus.
- Die auslösende Karte selbst erhält keinen Bonus.

---

### 5.5 Aktualisierte Skill-Pools

| Archetyp | Bestehende normale Skills | Neue normale Skills | Neuer Gesamtpool normal |
|---|---:|---:|---:|
| Blitz | 10 | 2 | 12 |
| Feuer | 10 | 2 | 12 |
| Eis | 10 | 2 | 12 |

Legendäre Skills bleiben unverändert und außerhalb eines Raritätssystems.

### 5.6 Skill-Akzeptanzkriterien

1. Ionisierung kann auf keiner Karte 5 Stapel überschreiten.
2. Blitzfänger ersetzt nur einen ansonsten verfallenden Ionisierungsversuch auf einer bereits voll ionisierten Karte.
3. Spannungsbogen ionisiert pro Sieg höchstens eine gültige, noch nicht gespielte Karte.
4. Glühende Klinge gibt nur noch `+1` temporären Wert.
5. Glühende Klinge und Überhitzt ergeben gemeinsam maximal `+3` temporären Wert aus diesen beiden Skills.
6. Die erhöhten Hitzeverluste beider Skills werden additiv kombiniert und vor Hitzeschild angewendet.
7. Funkenflug speichert ausschließlich 25 % des Feuer-Flat-Scores.
8. Kristallform verändert nie den echten Kartenwert.
9. Gletscherschub bufft bei erfolgreichem Trigger genau das gesamte betroffene Fünfersegment.
10. Eisblüte benötigt mindestens zwei aktive Nicht-Anker-Formationen auf der siegreichen eingefrorenen Karte.
11. Alle sechs neuen Skills werden als normale Skills in den jeweiligen Archetyp-Pool aufgenommen.
12. Es gibt für Skills weiterhin keine Stufen, Upgrade-Familien oder Raritätsfarben.

## 6. Datenmodell – Empfehlung

```ts
type Tier = 1 | 2 | 3 | 4;
type Rarity = 'normal' | 'uncommon' | 'rare' | 'rar';
type UpgradeType = 'replacement' | 'cumulative' | 'role';

interface TierDefinition {
  tier: Tier;
  rarity: Rarity;
  weight: number;       // finale Drop-Raten separat balancen
  shopPrice?: number;   // 8 | 12 | 18 | 30
  description: string;
}

interface FamilyDefinition {
  id: string;
  name: string;
  source: 'perk' | 'shop';
  category: string;
  upgradeType: UpgradeType;
  enabled: boolean;
  tiers: Record<Tier, TierDefinition>;
}

interface RunFamilyState {
  currentTier: Tier | 0;
  selectedTargets?: string[];
  selectedPosition?: number;
  selectedSegment?: number;
  selectedFormationType?: string;
}
```

Für einmalige kumulative Effekte muss nicht rekonstruiert werden, welche Stufen historisch gekauft wurden, solange die Deckänderungen direkt auf den Karten gespeichert werden. Für UI, Savegame und Angebotsfilter genügt der höchste Familienrang.

## 7. Migration bestehender IDs

- Bestehende IDs dürfen als Legacy-Aliasse bestehen bleiben, sollten aber intern auf eine Familien-ID plus Stufe gemappt werden.
- Beispiel: `K1`, `K5`, `K8` werden zu Familie `SHOP_CARD_FINISH`, Stufen I, II und III.
- Bestehende Savegames müssen beim Laden auf Familienzustände migriert werden.
- `L7 Königsmacher` wird ersatzlos verworfen.
- `E10 Feinjustierung` wird aus dem Perk-Pool entfernt und zur Shop-Familie migriert.

```ts
const legacyMigration = {
  K1: { familyId: 'SHOP_CARD_FINISH', tier: 1 },
  K5: { familyId: 'SHOP_CARD_FINISH', tier: 2 },
  K8: { familyId: 'SHOP_CARD_FINISH', tier: 3 },
  E10: { familyId: 'SHOP_FORM_FINE_TUNING', tier: 2, source: 'shop' },
  L7: null,
};
```

## 8. UI-Anforderungen

- Familienname einmal anzeigen, nicht den alten Item-/Perk-Namen pro Stufe.
- Römische Stufe direkt hinter dem Namen: `Momentum III`.
- Bei bestehender niedrigerer Stufe Badge **Upgrade** anzeigen.
- Vor dem Pick den aktuell gehaltenen Rang und den Zielrang sichtbar machen.
- Bei kumulativen Effekten klar formulieren, dass der neue Effekt **zusätzlich** ausgeführt wird.
- Bei Regelersetzung nur den vollständigen Zieltext anzeigen; keine Addition der alten Texte suggerieren.
- Farben: I Grau, II Grün, III Blau, IV Lila. Legendäre Perks behalten ihre bisherige legendäre Darstellung.

## 9. Akzeptanzkriterien

1. Eine Familie kann nie mit zwei aktiven regulären Rängen gleichzeitig im Build erscheinen.
2. Nach Erwerb von II werden I und II derselben Familie nicht mehr angeboten; nur III oder IV sind möglich.
3. Ein direkter IV-Drop funktioniert ohne vorherige Stufen.
4. Regelersetzungsfamilien erzeugen niemals doppelte Trigger.
5. Kumulative Pick-Effekte verändern das Deck nur beim tatsächlichen Erwerb der jeweiligen Stufe.
6. Rang IV entfernt die Familie vollständig aus dem regulären Angebotspool.
7. `Momentum` verstärkt unabhängig von der Stufe nur eine direkt folgende Karte.
8. `Feinjustierung` existiert nicht im Perk-Pool und nutzt im Shop ausschließlich die Einheit Energie.
9. `Königsmacher` ist nicht mehr im Perk-Pool, in Savegames oder in Angebotsdaten enthalten.
10. Die vier ehemaligen legendären Shop-Items funktionieren als reguläre Familien mit I–IV.

## 10. Noch nicht festgelegt

- Exakte Höhe des zusätzlichen Formationsbonus von `Kristallform` (`crystalFormBonusMultiplier`).

- Konkrete Drop-Gewichte der vier regulären Raritäten.
- Ob Upgrades im Shop einen Preisnachlass gegenüber dem vollen Zielstufenpreis erhalten.
- Ob bestimmte Familien oder Zielstufen erst ab bestimmten Durchläufen freigeschaltet werden.
- Ob die Bezeichnung `Rar` intern ebenfalls `rar` heißen soll oder technisch besser als `epic` geführt wird. Die sichtbare deutsche Bezeichnung bleibt **Rar**.
