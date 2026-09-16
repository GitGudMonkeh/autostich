# Minibosse — Mechanik-Katalog (Brainstorm-Stand)

**Status: Zwischenstand einer Design-Session, keine Spezifikation.** Aus zwei Sammelrunden
(2026-09-16) hat der Owner **neunzehn Minibosse** ausgewählt — §3 führt sie mit stabilen Nummern,
§2 die Messungen, die die Auswahl begründen. Gesetzt sind die Auswahl und der Rahmen in §1.
**Tariert ist nichts**; der Durchgang Boss für Boss steht als Nächstes an.

Sprache Deutsch, weil die Bossnamen Produktsprache sind und der Owner hier mitschreibt. Bewusste
Abweichung von der Engineering-Sprache in `AGENTS.md`, wie bei `docs/zwischenaufgaben.md`,
`docs/muenz-oekonomie.md` und `docs/skill-rework.md`, und nur für dieses Dokument.

---

## 1. Der Rahmen

**Gesetzt (Owner, 2026-09-16):**

- **Vier Läufe schließen eine Ebene ab.** Lauf 1 bis 3 tragen je einen Miniboss, Lauf 4 einen
  schwereren Endboss.
- **Ein Miniboss wirkt den ganzen Lauf**, nicht einen Abschnitt.
- **Der Boss wird zufällig zugewiesen, nicht gezogen.** Keine Auswahl wie bei den Aufträgen.
- **Ein Miniboss darf jedes System anfassen** — Gegner, Brett, Karten, Rechnung, Wirtschaft,
  Entscheidungsphasen.
- Jeder Boss trägt einen steigenden Score-Threshold.
- **Der Boss steht beim Laufstart fest und ist sichtbar**, vor der ersten Skill-Wahl — man
  muss sich darauf einstellen können.

**Nicht Gegenstand dieses Dokuments:** Progression, Ebenen, Endbosse, Belohnungen, Threshold-Werte.

> **Zur Lauflänge:** Der Owner spricht von 40 Durchläufen. `MAX_CYCLES` steht auf `exp` bei **50**
> (`constants.js`, Zielband 40–50). Die Messungen unten laufen über 50 und zeigen die Bänder
> einzeln, damit sie für beide Längen lesbar bleiben.

---

## 2. Die Messung, an der die Auswahl hängt

Gemessen am `exp`-Stand vom 2026-09-16 über eigene Sonden auf `runOne` mit `onTrick`-Sampling,
16 bis 20 Läufe je Sonde, alle vier Fraktionen über `factionPolicy`. Die Sonden liegen nicht im
Repo; die Methode ist nachbaubar. `factionPolicy` optimiert die Aufstellung **nicht** — die Zahlen
taugen als Verhältnis, nicht als absolute Erfolgsquote.

### 2.1 Der Score liegt hinten

Anteil am Endscore, Median über 20 Läufe:

| Durchläufe | 1–8 | 9–16 | 17–24 | 25–32 | 33–40 | 41–50 |
| --- | --- | --- | --- | --- | --- | --- |
| Anteil | **0,6 %** | 2,0 % | 5,1 % | 10,3 % | 22,2 % | **60,7 %** |

### 2.2 Ein flacher Gegner-Aufschlag wirkt genau falsch herum

Anteil der Siege, die bei „Gegner +N" kippen:

| Durchläufe | +1 | +2 | +3 | +5 |
| --- | --- | --- | --- | --- |
| 1–8 | **20 %** | 37 % | 53 % | 77 % |
| 9–16 | 19 % | 34 % | 48 % | 70 % |
| 17–32 | 14 % | 26 % | 36 % | 58 % |
| 33–45 | **9 %** | 17 % | 25 % | 42 % |

Zusammen mit §2.1: ein flacher Abzug tut am meisten weh, wo 2,6 % des Scores liegen, und am
wenigsten dort, wo 61 % liegen. Gegen den Threshold gerechnet kostet „Gegner +1" grob **10 %
Score** — eher die Untergrenze, weil ein verlorener Stich zusätzlich die Serie bricht.

**Daraus die Auswahlregel:** ein Miniboss über einen ganzen Lauf braucht eine **steigende Form**
oder muss an etwas hängen, das **mit dem Score mitwächst**. Flache Abzüge sind Frühspiel-Steuer mit
Endspiel-Rabatt.

### 2.3 Der Score wächst an den Multiplikatoren, nicht an den Siegen

Über den Lauf: Score je Durchlauf **×88**, Siegquote nur **×1,6** (48 % → 75 %). `base` steht
konstant bei 400 (`SCORE_PER_WIN`). Der Deck-Median bleibt bei **6** von D1 bis D50; nur zwei von
vierzig Karten kommen je über 10. Ein Boss auf Siege hat damit einen Deckel, ein Boss auf die
Rechnung nicht.

Fraktionsspreizung je Sieg-Stich bei D40: Eis 2.570 · Feuer 4.599 · Pflanze 17.192 · Blitz 17.489
— **6,8×**. Kontext für den Threshold, aber es bindet auch die Minibosse.

### 2.4 Die Münzwirtschaft ist der stärkste einzelne Hebel

Gemessen über 24 gepaarte Seeds mit einer Policy, die tatsächlich kauft (`withCoins` + `ALL_BUYS`
aus `sim/coin-policy.js`). Verstellt wurde der Einnahme-Sockel je Durchlauf über `SIM_COIN_BASE`:

| Sockel je Durchlauf | Median-Endscore | gegen voll |
| --- | --- | --- |
| 2 (Normalzustand) | 55,5 Mio | — |
| 1 | 41,9 Mio | **−24 %** |
| 0 | 31,4 Mio | **−43 %** |

Einnahme je Lauf: **232 Münzen**, und **flach über den Lauf verteilt** — 63 / 78 / 82 über die drei
Drittel. Preisanker: Neuwurf 3 · Energie 3 · Fokus 10 · Skill-Stufe 12 / 25 / 40 · Baufeld 20.

Ein Drittel Einkommen weg kostet damit **24 % Endscore**, „Gegner +1" rund 10 % — der Münzhebel ist
grob **zweieinhalbmal so stark je Einheit**. Und weil das Einkommen flach liegt, der Score aber zu
61 % hinten (§2.1), ist die Wirtschaft die **einzige Fläche, auf der eine flache Regel richtig herum
gebaut ist**: eine früh verweigerte Münze ist eine nicht gekaufte Stufe, und die multipliziert durch
alle Restdurchläufe.

> **Grenze der Messung:** die Policy bedient nur vier der neun Ausgabeflächen (Energie, Baufeld,
> Skill- und Familien-Aufwertung) und optimiert die Aufstellung nicht. Neuwurf, Fokus rufen und Perk
> verkaufen sind nicht ausgeübt. Die 24 % sind damit eher die Untergrenze, und sie sind ein
> Verhältnis, keine Tarierung.

---

## 3. Die neunzehn Minibosse

Stand nach zwei Sammelrunden (Owner, 2026-09-16). Die Nummern sind stabil und dienen dem
Tarierungs-Durchgang, der als Nächstes ansteht — **kein Wert unten ist tariert.** Die Spalte
*Stellschraube* nennt, woran beim Tarieren gedreht wird.

### 3.1 Gegner

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M01 | **Der Späher** | Die höchsten Gegnerkarten landen auf den Positionen mit dem höchsten Formations-Mult | Wie streng sortiert wird — ganz, oder nur die N höchsten gesetzt | `oppOrder` ist eine Permutation; `state.formations` liegt vor dem ersten Stich |
| M02 | **Der Konter** | Jeder Sieg gibt der nächsten Gegnerkarte +1, stapelnd; eine Niederlage setzt zurück | Schritt je Sieg; ob die Rücksetzung hart ist oder abklingt | `oppValueMod` im Stich-Pfad |
| M03 | **Die Zehrung** | Gegner +1 alle N Durchläufe | Intervall und Schrittgröße | `difficulty.oppRampEvery` (`engine.js`) |

### 3.2 Karten

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M04 | **Der Erbe** | Die Karte mit den meisten Stichen in Durchlauf n verliert in n+1 zwei Wert | Wertverlust; wie „beste Karte" definiert wird; ob sich der Verlust erholt | Per-Karte-Zähler aus dem `lastTrick`-Strom |
| M05 | **Der Gleichmacher** | Alle Spielerkarten zählen mit `baseRank`; dauerhafte Wertgewinne sind ignoriert | Anteil des Gewinns, der erhalten bleibt (voll ignoriert ist die härteste Sprosse) | `deck[i].value` gegen `baseRank` |
| M06 | **Die Umkehr** | Spielerwerte gespiegelt (11 − Wert) | **Keine Größe** — siehe §4, Punkt 4 | `deck[i].value` |

### 3.3 Brett und Aufstellung

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M07 | **Der Zensus** *(anzupassen)* | Alle 10 Durchläufe liest der Boss das Brett und schaltet den häufigsten Formationstyp für die nächsten 10 ab | Intervall; ob ein oder mehrere Typen fallen | `FORMATION_TYPES`-Filter in `computeFormations` |
| M08 | **Die Drift** *(anzupassen)* | Die Aufstellung rotiert je Durchlauf um eine Position | Schrittweite und Takt | `playerOrder`; Gegenmittel liegt fertig (E_SEGMENT, Durchlass, Spalier, Pfeiler) |
| M09 | **Die gezielte Sperre** *(anzupassen)* | N Positionen gesperrt, und der Boss wählt die Mitte der längsten Formation | Zahl der Positionen; wie oft neu gewählt wird | Wochen-Mod `blockForm` |
| M10 | **Die Quarantäne** | Je Durchlauf ist ein Segment versiegelt, rotierend 1 → 8 | Zahl der gleichzeitig versiegelten Segmente; Rotationstempo | `SEGMENT_SIZE`-Blöcke im Stich-Pfad |
| M11 | **Der Starrsinn** | Energie 4 → 1 je Aufstellphase | Energie je Phase; ob Zukauf erlaubt bleibt | `FORMATION_ENERGY`, `formationEnergyFor` |
| M12 | **Der Kitt** | Eine getauschte Karte ist N Durchläufe gesperrt; kein `UNDO_SWAP` | Sperrdauer; ob das Undo mitfällt | `SWAP_CARDS` / `UNDO_SWAP`, Pinning wie Gletscher-STARR |

### 3.4 Wirtschaft

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M13 | **Der Wucherer** | Die Preistreppe verdreifacht statt zu verdoppeln | `PRICE_LADDER` | `coins.js`, eine Konstante für alle drei Treppen |
| M14 | **Der Schwund** | An jeder Durchlaufgrenze verfällt ein Anteil des Kontostands | Verfallsanteil | `coinGrant` / Kontostand am Durchlaufwechsel |
| M15 | **Der Tribut** | Je Durchlauf N Münzen an den Boss; nicht gezahlt heißt Gegner +1 in diesem Durchlauf | Tributhöhe und Strafgröße | Durchlaufwechsel, plus `oppValueMod` |

### 3.5 Bau

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M16 | **Die Zersiedelung** | Der Distrikt-Bonus kehrt sich um: gleich-kategorige Nachbarn kosten, statt zu zahlen | `DISTRICT_BONUS` (Vorzeichen und Betrag), `DISTRICT_CAP` | `architect.js` |
| M17 | **Der Enge Grund** | Baufeld-Deckel 24 → 12 Zellen | `MAX_COVER` | `architect.maxCover`, Wochen-Mod `tightBuild` |

### 3.6 Perks und Skills

| Nr. | Name | Regel | Stellschraube | Naht |
| --- | --- | --- | --- | --- |
| M18 | **Die Zehrende Gier** | Jedes gehaltene Perk kostet eine Münze Unterhalt je Durchlauf | Unterhalt je Perk; was bei Zahlungsunfähigkeit passiert | `state.perks` gegen den Kontostand am Durchlaufwechsel |
| M19 | **Der Wärter** | Bei D10, D20, D30 nimmt der Boss einen gehaltenen Skill — der Spieler wählt welchen | Zahl und Zeitpunkte; ob der Skill zurückkommt | `state.skills`, `skillTiers` |

### 3.7 Was beim Tarieren zusammenstößt

Minibosse treten einzeln auf, die Paare sind also erst für den Endboss und für die Frage relevant,
ob eine Ebene denselben Boss zweimal ziehen darf. Notiert, solange es frisch ist:

- **M11 Starrsinn × M08 Drift** und **M12 Kitt × M08 Drift** — Rotation je Durchlauf gegen einen
  Tausch zur Antwort. Unspielbar.
- **M16 Zersiedelung × M17 Enge Grund** — Zersiedelung verlangt Platz zum Streuen, Enge Grund nimmt
  ihn. Direkter Widerspruch.
- **M13 / M14 / M15 / M18** hängen alle an derselben Börse. Je zwei zusammen ziehen doppelt ab, und
  die Tarierung jedes einzelnen verschiebt, was die anderen kosten.
- **M02 / M03 / M15** enden alle in `oppValueMod`. Gemessener Anker: +1 kostet rund 10 % Endscore.

## 4. Entschieden, und was offen bleibt

**Entschieden (Owner, 2026-09-16): der Boss ist beim Laufstart sichtbar.** Zufällig
**zugewiesen** heißt nicht **versteckt**, und daran hing, ob das System trägt. Weil der Boss vor der
ersten Skill-Wahl steht, ist er das Thema des Laufs: der Spieler kann ihn nicht wählen, aber den
Konter — Fraktion, Skills, Perks, Aufstellung. Das löst genau die Schieflage, die die Aufträge nur
durchs Wählen lösen konnten (`docs/zwischenaufgaben.md` §2.3), und es macht die zweite Begegnung mit
demselben Boss besser statt langweiliger. Verdeckt wäre ein Lauf in Durchlauf 1 entschieden gewesen,
bevor irgendetwas getan werden konnte.

Was danach offen bleibt:

1. **Wo der Boss steht.** Lesbar sein muss er vor der ersten Skill-Wahl, die über `START_RUN` läuft, und
   danach den ganzen Lauf über. Die Aufträge haben dieselbe Frage schon beantwortet — ihr Stand
   sitzt in `src/ui/StatusRail.jsx` (`docs/zwischenaufgaben.md` §4.3). Anzeige ist Owner-Sache.
2. **Zensus, Drift und gezielte Sperre** brauchen die Anpassungsrunde aus §3.3.
3. **Tarierung.** Offen ist, ob der Threshold die Konstante je Ebene ist und jeder Miniboss auf
   ungefähr denselben gemessenen Score-Verlust tariert wird, oder ob der Threshold mit dem Boss
   wandert. Das Erste ist mit dem vorhandenen Sim-Harness messbar.
4. **M06 Die Umkehr hat keine Größe.** Sie ist an oder aus; es gibt keine Zahl, an der man sie
   schwächer stellen kann. Tarierbar ist sie nur über die **Dauer** (nicht den ganzen Lauf) oder über
   den **Threshold**. Das gilt es vor dem Durchgang zu wissen, sonst sucht man an ihr eine
   Stellschraube, die es nicht gibt.

---

## 5. Was nicht in den Katalog kam

### 5.1 Verworfen, mit Befund

| Vorschlag | Warum nicht |
| --- | --- |
| **Die Vorschau** (Boss zeigt seine Reihenfolge, Spieler antwortet mit N Tauschzügen) | Über einen ganzen Lauf sind das bis zu fünfzig Unterbrechungen in einem Auto-Battler. Nur zu retten, wenn sie einmal je Aufstellphase käme |
| **Par je Durchlauf** (Mindest-Score in jedem Durchlauf) | Bei ×88 Score-Wachstum ist eine feste Sprosse früh unmöglich und spät geschenkt. Nur als relatives Par zu retten |
| **Der Dämpfer** (Serien-Mult aus) | Gemessen liegt der Median-Serien-Mult bei 1,02 bis 1,10. Er trifft den Serienbau, nicht den Lauf |
| **Alle flachen Dauerabzüge** (Übermacht, Rost, Blender, Fessel) | §2.2: rückwärts gebaut. Mit Ramp-Form oder als Phase eines wechselnden Bosses überleben sie |

### 5.2 Nicht gewählt, ohne Befund dagegen

Aus der zweiten Sammelrunde (Wirtschaft, Bau, Perks) übrig geblieben. **Gegen keines davon spricht
etwas** — der Owner hat acht andere genommen, das ist der ganze Grund. Notiert, damit sie für den
Endboss oder eine spätere Erweiterung greifbar bleiben.

| Vorschlag | Regel in einem Satz |
| --- | --- |
| **Der Pfand** | Verzicht zahlt nichts — Skill/Perk/Energie/Bau ablehnen bringt 0 statt 12/6/1/6 |
| **Die Inflation** | Jeder Preis +1 je fünf vergangene Durchläufe |
| **Die Schwerkraft** | Ein Tausch darf eine Karte nur eine Position weit bewegen |
| **Der Preis der Bewegung** | Jeder Tausch kostet zusätzlich eine Münze |
| **Der Denkmalschutz** | Gesetzt ist gesetzt: kein Versetzen, kein Abreißen |
| **Die Bauordnung** | Nur eine Bau-Kategorie im ganzen Lauf — Wert, Score oder Formation |
| **Der Brandstifter** | Alle N Durchläufe brennt ein Gebäude ab |
| **Der Zensor** | Eine Perk-Familie ist den ganzen Lauf gesperrt (A · B · C · D · E · P · S — sieben Varianten aus einer Regel) |
| **Die Zunftordnung** | Höchstens ein Perk je Familie; ein zweiter ersetzt den ersten |
| **Der Pfandleiher** | Jedes neue Perk zwingt, ein gehaltenes zu verkaufen |
