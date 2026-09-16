# Minibosse — Favoritenliste (Brainstorm-Stand)

**Status: Zwischenstand einer Design-Session, keine Spezifikation.** Festgehalten ist, was der Owner
am 2026-09-16 aus einer Sammlung von rund 35 Mechanik-Vorschlägen als Favoriten markiert hat, samt
den Messungen, die die Auswahl begründen. Gesetzt sind nur die Auswahl selbst und der Rahmen
in §1.

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

---

## 3. Die Favoriten

### 3.1 Mitwachsend — hängen an der eigenen Leistung

Diese Klasse löst das Formproblem aus §2.2 von selbst und ist **fraktionsneutral per Konstruktion**:
besteuert wird, was im jeweiligen Bau am stärksten ist.

| Name | Regel | Naht |
| --- | --- | --- |
| **Der Späher** | Die höchsten Gegnerkarten landen auf den Positionen mit dem höchsten Formations-Mult. Erzwingt, dass Wert und Formation zusammensitzen | `oppOrder` ist nur eine Permutation; `state.formations` liegt vor dem ersten Stich |
| **Der Konter** | Jeder Sieg gibt der nächsten Gegnerkarte +1, stapelnd; eine Niederlage setzt zurück. Die Serie kauft ihre eigene Wand | `oppValueMod` im Stich-Pfad |
| **Der Erbe** | Die Karte mit den meisten Stichen in Durchlauf n verliert in n+1 zwei Wert. Die beste Karte erodiert, es braucht ein rotierendes Ensemble | Per-Karte-Zähler aus dem `lastTrick`-Strom |

### 3.2 Bau-Direktoren — ändern ab Durchlauf 1, was gebaut wird

| Name | Regel | Anmerkung |
| --- | --- | --- |
| **Der Gleichmacher** | Alle Spielerkarten zählen mit `baseRank`; jeder dauerhafte Wertgewinn ist ignoriert | Reiner Build-Check. Trifft Feuer und Eis hart (sie heben den Kartenwert), Blitz und Pflanze kaum — durch die Sichtbarkeit beim Laufstart ist das eine Bau-Ansage statt einer Fraktionssteuer |
| **Die Umkehr** | Spielerwerte gespiegelt (11 − Wert) | Über einen ganzen Lauf wird aus dem Rätsel eine Bauregel — Treppe läuft rückwärts, Wechsel überlebt |
| **Die Zehrung** | Gegner +1 alle 8 Durchläufe | Die direkte Antwort auf §2.2: der Ramp hält den Druck über den Lauf flach statt vorne. `difficulty.oppRampEvery` existiert bereits (`engine.js`) |
| **Der Wärter** | Bei D10, D20, D30 nimmt der Boss einen gehaltenen Skill — der Spieler wählt welchen | Eskalierende Bau-Erosion, nur über einen ganzen Lauf lesbar |
| **Die Quarantäne** | Je Durchlauf ist ein Segment versiegelt, rotierend 1 → 8 | Über 40 Durchläufe trifft es jedes Segment fünfmal; erzwingt Gleichverteilung statt einer starken Ecke |

### 3.3 Aufgenommen, aber **anzupassen** (Owner, 2026-09-16)

Drei Favoriten, die in der gesammelten Fassung noch nicht passen. Sie sind ausdrücklich **gehalten,
nicht gesetzt** — die Anpassung steht aus und ist eine eigene Runde.

| Name | Regel im Rohzustand | Was offen ist |
| --- | --- | --- |
| **Der Zensus** | Alle 10 Durchläufe liest der Boss das Brett und schaltet den häufigsten Formationstyp für die nächsten 10 ab | Anpassung ausstehend |
| **Die Drift** | Die Aufstellung rotiert je Durchlauf um eine Position; Formationen schneiden die Segmentgrenzen jedes Mal anders | Anpassung ausstehend. Gegenmittel liegt fertig: E_SEGMENT, Durchlass, Spalier, Pfeiler |
| **Die gezielte Sperre** | N Positionen gesperrt, und der Boss wählt die Mitte der längsten Formation | Anpassung ausstehend. Naht vorhanden: Wochen-Mod `blockForm` |

---

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

---

## 5. Verworfen, damit es niemand wiederentdeckt

| Vorschlag | Warum nicht |
| --- | --- |
| **Die Vorschau** (Boss zeigt seine Reihenfolge, Spieler antwortet mit N Tauschzügen) | Über einen ganzen Lauf sind das bis zu fünfzig Unterbrechungen in einem Auto-Battler. Nur zu retten, wenn sie einmal je Aufstellphase käme |
| **Par je Durchlauf** (Mindest-Score in jedem Durchlauf) | Bei ×88 Score-Wachstum ist eine feste Sprosse früh unmöglich und spät geschenkt. Nur als relatives Par zu retten |
| **Der Dämpfer** (Serien-Mult aus) | Gemessen liegt der Median-Serien-Mult bei 1,02 bis 1,10. Er trifft den Serienbau, nicht den Lauf |
| **Alle flachen Dauerabzüge** (Übermacht, Rost, Blender, Fessel) | §2.2: rückwärts gebaut. Mit Ramp-Form oder als Phase eines wechselnden Bosses überleben sie |
