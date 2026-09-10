# Skill-Rework (exp) — Arbeitsdokument

**Status: lebendes Dokument.** Wird Fraktion für Fraktion in Sitzungen mit dem Owner gefüllt. Quelle der
Wahrheit für den Skill-Umbau auf dem Spielplatz-Branch `exp`; der Code folgt diesem Dokument, nicht
umgekehrt. Sprache Deutsch, weil Inhalt und Skilltexte Produktsprache sind und der Owner hier
mitschreibt (bewusste Abweichung von der Engineering-Sprache, nur für dieses Dokument).

Entscheidungen des Owners stehen unter **Gesetzt**. Alles unter **Vorschlag** ist Diskussionsstand
und gilt erst, wenn es nach Gesetzt wandert.

---

## 1. Rahmen

### Gesetzt (Owner, 2026-09-04)

- 40 Runden, 10 Skill-Phasen, 40 Karten. Vier Fraktionen jetzt, sechs als Ziel. *(Owner, 2026-09-06: 50 Runden,
  die Reihenfolge der Phasen bleibt — der Block Skill→Perk→Aufstellen→Architekt läuft weiter, 13 Skill-Phasen; 7.14.)*
- **15 Skills je Fraktion**, ohne Legendäre. Legendäre werden separat behandelt.
- **Jeder Skill hat vier Stufen:** Normal, Selten, Sehr selten, Episch. Stufen sind bessere Versionen
  desselben Skills. Episch hat ein kleines Extra oder ist sehr stark.
- **Passive werden überarbeitet**, je Fraktion vor den Skills.
- **Direkt-Score wird aus den Skills nach Möglichkeit entfernt.** Er ist im Late Game bedeutungslos.
  Fraktions-Score geht in die Basis, vor die Multiplikatoren.
- **Raritäten unterscheiden sich immer.** Zwei Stufen desselben Skills dürfen nie dieselben Werte haben
  (Owner, 2026-09-06); eine Leiter wie +1 / 1 / 2 / 3 ist keine. Prüfung: `BLITZ_TIERS` / `FEUER_TIERS`
  Zeile für Zeile — 7.19 verletzte es nur Überspannung (Normal = Selten), seit 7.20 behoben (1 / 2 / 3 / 4).
- **Keine Deckel auf Skill-Rampen, lieber niedrigere Werte.** Rampen laufen offen; die Zahl je Schritt
  ist der Regler. Der harte Deckel des fertigen Crit-Multiplikators in der Engine (8×; 7.19 versuchsweise
  12×, 7.20 zurück) ist davon nicht berührt — Entscheid Owner 2026-09-06 nach der Messung in 7.22: er bleibt bei 8.
- **Die Crit-Chance ist bei 100 % gedeckelt; jeder Prozentpunkt darüber wird zu +0,01× Crit-Multiplikator.**
  Systemregel für alle Fraktionen (Owner, 2026-09-06, §7.28: Satz 0,002 → 0,01; der Deckel auf der Chance
  war schon immer da, jetzt steht er als Regel). Überschlag, der denselben Überschuss wandelte, ist seit
  7.19 gestrichen.
- Slots unbegrenzt.
- **Kein Selbstwachstum der Stapel (Lesart A, gesetzt 2026-09-05).** Stapel entstehen nur aus der Leiste
  und aus Skills. Die heutige Engine-Regel "ionisierte Siegkarte +1 Stapel je Sieg" entfällt. Tiefe ist
  keine Ressource, die Anzahl der Ionisierungen ist eine. Zahlen in 3.5 vor Blitzfänger.
- Angebot: **zwei Türen**, jede zeigt **drei Fraktionssymbole** (drei Skills aus höchstens zwei
  Fraktionen, Wiederholung erlaubt). Nach der Wahl drei Skills mit ihren Stufen, einer wird genommen.
  Stufen sind an der Tür nicht sichtbar.
- Münzen als Ökonomie, Bosse mit Mechaniken und Beute, Score mit Par. Zwillingstür und Brett-Änderungen
  geparkt. Details dazu außerhalb dieses Dokuments.

### Offen (liegt beim Owner)

- Fokus am Start (eine von drei gewürfelten Fraktionen, ihre Tür jede zweite Phase sicher).
- Episch-Quote je Skill und Pity.
- Anzahl und Abstand der Bosse.

### Vorschlag: Stufenleiter

Faktoren auf den Kennwert des Skills, so gewählt, dass der Erwartungswert bei 62 / 25 / 10 / 3 Prozent
etwa der heutige Skill ist (0,98). Damit bleibt die vorhandene Balance-Arbeit gültig.

| Stufe | Faktor | Bemerkung |
| --- | --- | --- |
| Normal | 0,85 | etwas unter heute |
| Selten | 1,05 | etwa heute |
| Sehr selten | 1,35 | |
| Episch | 1,8 | oder Faktor 1,35 plus Extra |

Regeln dazu, ebenfalls Vorschlag: Faktoren auf Multiplikatoren kleiner als auf Flachwerte; ein Skill
darf wieder erscheinen, aber nur auf höherer Stufe, Nehmen heißt Ersetzen.

### Rollen-Raster je Fraktion (Vorschlag als Prüfliste, keine Pflicht)

Kernskill (schaltet die Mechanik ein und trägt das Passiv), Verbraucher, Skalierer, Passive, Werkzeuge,
Ausbauten. Der erste Skill einer Fraktion muss die Fraktion allein zum Laufen bringen, weil Builds mit
den Paar-Türen drei bis vier Fraktionen breit werden.

### Vorlage je Skill

```
### Name (ID) — Rolle
Heute: <Text heute>
Neu:   <Text der Normal-Stufe>
| Stufe | Kennwert(e) | Extra |
| Normal | | – |
| Selten | | – |
| Sehr selten | | – |
| Episch | | <Extra oder "stark"> |
Entscheid: bleibt / geändert / gestrichen — Begründung in einem Satz
```

---

## 2. Stand je Fraktion

| Fraktion | Passiv | Die 15 | Stufen | Legendäre |
| --- | --- | --- | --- | --- |
| Blitz | gesetzt | gesetzt (Ionisierung und Breitenbeschleuniger gestrichen) | **gesetzt, alle 15** (Übersicht 3.6) | **gesetzt, alle 4** (3.7; Hochspannung ersetzt Flächenionisation) |
| Feuer | gesetzt (4.2) | gesetzt (Funkenflug und Schmelzofen gestrichen) | **gesetzt, alle 15** (Übersicht 4.6) | **gesetzt, alle 4** (4.7) |
| Eis | offen | offen | offen | separat, später |
| Pflanze | offen | offen | offen | separat, später |
| Fraktion 5 | – | – | – | – |
| Fraktion 6 | – | – | – | – |

---

## 3. Blitz

### 3.1 Passiv heute

Spielertext (`skill.passive.lightning`): *Der erste Blitz-Skill gibt +13 % Crit-Chance, jeder weitere
+8 %. Dazu +0,1× Crit-Multiplikator je Blitz-Skill.*

Was dahinter läuft (Code-Stand, Konstanten in `src/game/constants.js`):

- **Crit-Chance:** Sockel 5 % beim ersten Blitz-Skill, +8 % je gehaltenem Blitz-Skill. Crit-Multiplikator
  +0,1× je Blitz-Skill, additiv, ohne Deckel. Harter Deckel auf den fertigen Crit-Multiplikator: 8×.
- **Ladung:** Jeder Crit erzeugt +1 Ladung, Maximum 10. Bei voller Ladung löst der gehaltene
  Verbraucher aus und verbraucht sie. Es gibt höchstens einen Blitz-Verbraucher im Build, ein neuer
  ersetzt den alten. Heute ist Ionisierung der einzige Verbraucher.
- **Ionisierung:** Stapel auf Karten, höchstens 5 je Karte. Jeder Stapel gibt bei Sieg mit der Karte
  +12 Score, danach erhält die Karte +1 Stapel. Jeder Stapel im Deck hebt feldweit die Crit-Chance um
  +1,5 Prozentpunkte, gezählt bis 12 Stapel. Ist die Breite voll (85 % der Karten ionisiert), bekommen
  alle Karten +1 Wert. Breite je Verbrauch: 2 Karten, +1 je Blitz-Skill über zwei.
- **Kaskade:** Ereignis zündet Ereignis, bei Blitz über Überspannung (Crit neben ionisierter Karte gibt
  Ladung).
- **Bekenntnis:** Direktdividenden der Legendären skalieren mit dem Anteil Blitz-Skills an den Slots
  (nach dem Slot-Wegfall: Anteil an gehaltenen Skills, siehe Rahmen).

### 3.2 Passiv neu

**Gesetzt (Owner, 2026-09-04).** Alle Passive werden vereinfacht. Blitz:

- Blitz schaltet die **Ladungsleiste** frei.
- **Jeder Blitz-Skill gibt als passiven Anteil +5 % Crit-Chance.** Kein Sockel, kein Crit-Multiplikator
  je Skill. Die Zahlenwerte aller Fraktionen werden später in der Sim getunt.
- **Alle 10 Crits** ist die Leiste voll und **ionisiert eine Karte**.
- **Ionisierte Karten geben nur noch mehr Score.** Keine Crit-Chance aus dem Feld, keine Sättigung.
- Einige Skills werden so geändert, dass sie **mit der Anzahl an Ionisierungen** etwas machen.
- **Ionisierung entfällt als Skill.**
- **Stapel ohne Deckel.** Eine Karte kann beliebig oft ionisiert werden, jeder Stapel zählt. Tuning
  notfalls über die Sim.
- **Zielkarte: die nächste in der Reihenfolge.** Die volle Leiste ionisiert die Karte, die nach der
  Karte des zehnten Crits an der Reihe ist. Damit entscheidet die Aufstellung mit, wo Stapel landen.

Muster, das damit für alle Fraktionen gilt (Vorschlag): Passiv = eine Ressource freischalten plus ein
fester Payoff. Skills ändern die Rate, den Payoff und tun etwas mit der Menge.

**Was das Passiv aus dem Bestand übernimmt oder streicht:**

| Heute | Neu |
| --- | --- |
| Crit-Chance je Blitz-Skill (Sockel 5 %, +8 % je Skill) und +0,1× Crit-Mult je Skill | +5 % Crit-Chance je Blitz-Skill, sonst nichts. Crit-Multiplikator kommt nur noch aus Skills und Perks |
| Jeder Crit +1 Ladung, Leiste 10, Verbraucher löst aus | Leiste 10 Crits, Payoff fest: eine Karte ionisieren |
| Skill "Ionisierung" als einziger Verbraucher, höchstens einer im Build | Verbraucher-Regel entfällt, der Skill ist im Passiv aufgegangen |
| Stapel geben Score und feldweit Crit-Chance, Sättigung gibt Kartenwert | nur noch Score |
| Ionisierte Siegkarte erhält je Sieg +1 Stapel (Selbstwachstum) | entfällt (Lesart A, gesetzt 2026-09-05). Stapel nur aus Leiste und Skills |
| Kaskade, Bekenntnis | unberührt, bleiben Skill-Sache |

**Folge des offenen Deckels:** "voll ionisiert" gibt es nicht mehr als Zustand. Skills, die heute daran
hängen (Kurzschluss, Blitzfänger, Durchschlag), brauchen entweder eine Schwelle ("ab 5 Stapeln") oder
skalieren je Stapel.

**Wo der Stapel-Score in die Rechnung geht. Gesetzt (Owner, 2026-09-04): in der Basis, vor den
Multiplikatoren, wie heute.** Ein gewonnener Stich rechnet Basis mal Multiplikatoren, also Kartenwert
und Zuschläge, dann Serie, Perk-Multiplikator, Formation, Crit. Der Stapel-Score steht in der Basis
und wird mit dem ganzen Stack multipliziert. Beispiel mit Basis 20, drei Stapeln zu 12 und
Multiplikator 8: 56 × 8 = 448. Die Tiefe der Stapel skaliert damit mit dem Build; das Tuning der Zahl
je Stapel läuft über die Sim. **Sim-Notiz (Owner, 2026-09-05):** werden die Stapel zu mächtig, ist auch
der Bonus je Stapel (heute 12) ein Regler, nicht nur die Raten und Schwellen der Skills.

**Gesetzt (Owner, 2026-09-04): Direkt-Score wird aus den Skills nach Möglichkeit entfernt.** Direkt-Score
nach den Multiplikatoren ist im Late Game bedeutungslos. Das gilt als Regel für alle Fraktionen. Im
Blitz-Bestand betroffen: Statische Aufladung (+40 Direkt-Score je Verbrauch), Kurzschluss (+250
Direkt-Score-Burst), bei den Legendären Doppelentladung und Flächenionisation (Direkt-Dividenden).

Alle drei offenen Punkte sind gesetzt. Die 15er-Auswahl kann beginnen.

Vorschlag am Rand: der passive Anteil von 5 % bleibt je Skill fest und skaliert nicht mit der Stufe.
Die Stufe wirkt auf den Skill-Effekt. Das hält das Passiv einfach und die Leiter berechenbar.

**Tempo der Leiste.** Crit-Chance = 5 % × gehaltene Blitz-Skills, 10 Crits je Ionisierung, Annahme
26 gewonnene Stiche je Runde (65 %). Ohne Rate-Skills:

| Blitz-Skills gehalten | Crit-Chance | Crits je Runde | Runden je Ionisierung |
| --- | --- | --- | --- |
| 1 | 5 % | 1,3 | 7,7 |
| 2 | 10 % | 2,6 | 3,8 |
| 3 | 15 % | 3,9 | 2,6 |
| 4 | 20 % | 5,2 | 1,9 |
| 6 | 30 % | 7,8 | 1,3 |
| 8 | 40 % | 10,4 | 1,0 |
| 10 | 50 % | 13 | 0,8 |

Über den Lauf gerechnet: ein reiner Blitz-Build, der in jeder Skill-Phase einen Blitz-Skill nimmt, macht
etwa 285 Crits und damit etwa 29 Ionisierungen, die erste um Runde 7. Ein Build mit drei bis vier
Blitz-Skills ab Runde 9 kommt auf etwa 15. Die Rate-Skills (Blitzableiter, Statische Aufladung,
Reststrom, Dauerstrom, Überschlag) liegen obendrauf und sind damit das, was Blitz früh spielbar macht.
Die Zehn ist der zweite Regler, die Sim tunt beides zusammen.

**Was die verbleibenden 16 unter dem neuen Passiv sind (Vorschlag, Entscheid je Skill kommt in 3.4).**
Rechnung zur 15: 16 Bestand plus neue Anzahl-Skills, also müssen so viele Bestandsskills gehen, wie
neue kommen, plus einer.

| Skill | Unter dem neuen Passiv |
| --- | --- |
| Ionisierung | **gestrichen (gesetzt)**, im Passiv aufgegangen |
| Kettenblitz | ohne Basis-Bindung: jede volle Leiste ionisiert +2 Karten |
| Blitzableiter, Statische Aufladung, Reststrom, Dauerstrom, Überschlag | Rate-Skills, füllen die Leiste schneller, bleiben sinnvoll |
| Gewitterfront, Entladung | Payoff bei voller Leiste, dauerhaft Crit-Chance oder Crit-Mult, mehrere gleichzeitig möglich |
| Spannungsstau, Ladungsserie | Crit-Quelle aus Sieg ohne Crit oder aus der Serie |
| Überspannung, Blitzschlag, Breitenbeschleuniger | Ionisierung außerhalb der Leiste oder an Position gebunden, Kaskade |
| Kurzschluss, Blitzfänger | hängen an "voll ionisiert", brauchen eine Schwelle oder skalieren je Stapel. Kurzschluss trägt Direkt-Score, der raus soll |
| Statische Aufladung | Rate-Skill, aber ihr Verbrauchs-Payoff ist Direkt-Score, der raus soll |
| Serienschutz | Ladung ausgeben statt Serie verlieren, bleibt |
| neu, Anzahl-Skills | z. B. Crit-Chance je ionisierter Karte, Sättigung ab N ionisierten Karten, Ladung je Crit steigt mit der Anzahl |

### 3.3 Skills heute (17 normale, 4 legendäre)

Linien wie im Code (`src/game/skills.js`). Kennwerte in Klammern sind die heutigen Konstanten.

**Linie 1 — Ladung (Aufbau, Reaktor, Entlade-Payoffs)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_01 | Blitzableiter | Jeder Crit +1 Ladung zusätzlich. Jeder volle Verbrauch gibt +1 Ladung zurück. |
| SK_LIGHTNING_08 | Statische Aufladung | Jeder Sieg ohne Crit +1 Ladung. Jeder volle Verbrauch +40 Direkt-Score. |
| SK_LIGHTNING_05 | Reststrom | Nach jedem vollen Verbrauch bleiben 4 Ladungen statt 0. |
| SK_LIGHTNING_06 | Gewitterfront | Jeder volle Verbrauch dauerhaft +1 % Crit-Chance (bis +50 %). |
| SK_LIGHTNING_10 | Entladung | Jeder volle Verbrauch dauerhaft +0,1× Crit-Multiplikator (bis +1×). |

**Linie 2 — Verbraucher (volle Ladung → Payoff, höchstens einer im Build)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_02 | Ionisierung | Verbraucher: bei voller Ladung 2 Karten ionisieren (+1 Stapel), +1 Karte je Blitz-Skill über zwei. |
| SK_LIGHTNING_07 | Ladungsserie | Jeder Serienpunkt +2 % Crit-Chance (bis +30 %). Verbraucht keine Ladung. |

**Linie 3 — Ionisierung (Breite, Tiefe, Überlauf, Konsum)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_03 | Kettenblitz | Verstärker (nur mit Ionisierung): jede Ionisierung erfasst +2 Karten. |
| SK_LIGHTNING_12 | Breitenbeschleuniger | Gewinnt eine ionisierte Karte, springt ein Stapel auf eine nicht ionisierte Karte, sonst auf den nächsten nicht vollen Nachfolger. |
| SK_LIGHTNING_11 | Blitzfänger | Trifft eine Ionisierung eine volle Karte: +2 Stichwert beim nächsten Auftauchen und +1 Ladung. |
| SK_LIGHTNING_09 | Kurzschluss | Sieg mit voll ionisierter Karte: +250 Score und +3 Ladung. |

**Linie 4 — Crit-Maschine (Chance und Mult erzeugen)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_13 | Spannungsstau | Jeder Sieg ohne Crit +5 % Crit-Chance für den nächsten Sieg (bis +50 %), ein Crit setzt zurück. |
| SK_LIGHTNING_14 | Überschlag | Crit-Chance über 100 % wird je Sieg in Ladung gewandelt: je 10 Prozentpunkte +1 Ladung, ab 85 % voller Karten je 5. |

**Linie 5 — Kaskade (Ereignis zündet Ereignis)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_04 | Überspannung | Crit auf oder neben einer ionisierten Karte +3 Ladung. |
| SK_LIGHTNING_15 | Blitzschlag | Jeder Crit ionisiert die gewonnene Karte (+1 Stapel). |

**Linie 6 — Serie-Schnittstelle**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_16 | Dauerstrom | Je 3 Serienpunkte +1 Ladung je Sieg in Folge (höchstens +3). Jeder volle Verbrauch dauerhaft +2 % Crit-Chance (bis +40 %). |
| SK_LIGHTNING_17 | Serienschutz | Niederlage mit mindestens 50 % Ladung bricht die Serie nicht, die Ladung wird dafür verbraucht. |

**Legendäre (separat, nicht Teil der 15)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_LIGHTNING_L01 | Donnergott | Verbraucher lösen schon bei 70 % Ladung aus, dauerhaft +0,4× Crit-Multiplikator. |
| SK_LIGHTNING_L02 | Doppelentladung | Verbraucher ionisiert 3× so viele Karten. Sieg mit ionisierter Karte +40 Score je Stapel im Feld (bis 120), anteilig zum Bekenntnis. |
| SK_LIGHTNING_L03 | Flächenionisation | Sieg mit ionisierter Karte: beide ungespielten Nachbarn +1 Stapel, +130 Score je ionisierter Karte im Feld (bis 30), anteilig zum Bekenntnis. |
| SK_LIGHTNING_L04 | Durchschlag | Voll ionisierte Karte gewinnt mit Crit: dauerhaft +0,18× Crit-Multiplikator (bis +2×). |

### 3.4 Die 15

**Durchgang über die 16 (Vorschlag, 2026-09-04).** Kriterien laut Owner: zu ähnlich zu einem anderen
Skill, oder durch die Passiv-Änderung nicht mehr relevant. Genau einer soll gehen.

| Skill | Unter dem neuen Passiv | Einordnung |
| --- | --- | --- |
| Blitzableiter | Crit gibt +1 Ladung extra, also 5 Crits je Ionisierung statt 10 | bleibt, der Rate-Skill |
| Statische Aufladung | Sieg ohne Crit gibt Ladung, Payoff ist Direkt-Score | bleibt, Payoff später ersetzen |
| Reststrom | Leiste startet nach dem Leeren bei 4 | bleibt, zweite Rate-Quelle mit anderem Mechanismus |
| Gewitterfront | volle Leiste gibt dauerhaft +1 % Crit-Chance | zweitähnlichster: Teilmenge von Dauerstrom, gleicher Auslöser, gleicher Payoff |
| Entladung | volle Leiste gibt dauerhaft +0,1× Crit-Mult | bleibt, einzige Mult-Rampe |
| Ladungsserie | Serienpunkt gibt Crit-Chance | bleibt, Serie zu Crit |
| Kettenblitz | volle Leiste ionisiert +2 Karten mehr | bleibt, Breite je Leiste, ohne Basis-Bindung |
| Breitenbeschleuniger | Stapel springt von der Siegkarte auf eine nicht ionisierte Karte | **nicht mehr relevant**, siehe unten |
| Blitzfänger | Ionisierung auf voller Karte gibt Wert und Ladung | bleibt, braucht Schwelle statt "voll" |
| Kurzschluss | Sieg mit voller Karte gibt Direkt-Score und Ladung | bleibt, braucht Schwelle, Direkt-Score raus |
| Spannungsstau | Sieg ohne Crit gibt Crit-Chance für den nächsten Sieg | bleibt, Glättung |
| Überschlag | Crit-Chance über 100 % wird Ladung | bleibt, Tiefen-Klausel entfällt, Ventil für Crit-Stapler |
| Überspannung | Crit neben ionisierter Karte gibt Ladung | bleibt, mit "nächste in der Reihenfolge" liegen ionisierte Karten nebeneinander, das passt |
| Blitzschlag | jeder Crit ionisiert die Siegkarte | bleibt vorerst, widerspricht aber dem Takt des Passivs, siehe unten |
| Dauerstrom | Serie gibt Ladung, volle Leiste gibt Crit-Chance | bleibt, zwei Effekte in einem |
| Serienschutz | Ladung statt Serienbruch | bleibt, einziger Schutz-Skill |

**Vorschlag zum Streichen: Breitenbeschleuniger.** Sein ganzer Wert kam aus der Breite: Feld-Crit
zählte alle Stapel im Deck, die Sättigung brauchte 85 % ionisierte Karten. Beides ist mit dem Passiv
weg. Wenn ionisiert nur noch mehr Score heißt, ändert ein Stapel, der von der Siegkarte auf eine
andere Karte springt, die Summe nicht, er wandert eher von einer Karte, die gewinnt, zu einer, die noch
nichts gezeigt hat. Der Skill wird erst wieder sinnvoll, wenn Anzahl-Skills existieren, und Breite
erzeugt dann schon Kettenblitz.

**Zweiter Kandidat, falls der Owner die Ähnlichkeit höher gewichtet: Gewitterfront.** Gleicher Auslöser
wie die zweite Hälfte von Dauerstrom, gleicher Payoff, nur andere Zahlen. Streichen hieße, Dauerstrom
behält die Rampe. Alternativ die Rampe aus Dauerstrom nehmen und Gewitterfront als reine Rampe
behalten, das wäre aber ein Redesign, kein Streichen.

**Für den Stufen-Durchgang vorgemerkt, kein Streichvorschlag: Blitzschlag.** Ein Crit ionisiert eine
Karte, das Passiv braucht zehn Crits dafür. Der Skill macht den Takt des Passivs zur Nebensache. Im
Stufen-Durchgang entweder als seltenster Effekt einordnen oder auf "jeder n-te Crit" umbauen.

**Entscheid Owner (2026-09-04): Breitenbeschleuniger gestrichen.** Die 15 sind damit: Blitzableiter,
Statische Aufladung, Reststrom, Gewitterfront, Entladung, Ladungsserie, Kettenblitz, Blitzfänger,
Kurzschluss, Spannungsstau, Überschlag, Überspannung, Blitzschlag, Dauerstrom, Serienschutz.

### 3.5 Stufen

**Vorgabe Owner:** die heutigen Werte liegen auf Selten bis Sehr selten. Normal und Selten werden etwas
schwächer, Sehr selten und Episch stärker. Episch hat ein kleines Extra oder ist sehr stark.

**Vorschlag (2026-09-04), Entscheid je Skill beim Owner.** Annahme dabei: der passive Anteil von 5 %
Crit-Chance ist je Skill fest und nicht Teil der Stufe. Alle Zahlen sind Startwerte für die Sim.
Direkt-Score ist überall entfernt; die Ersatz-Payoffs stehen in der Basis (Kartenwert, Stapel, Ladung).

**Blitzableiter** — Rate. Heute: jeder Crit +1 Ladung extra, volle Leiste gibt +1 zurück.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | jeder 2. Crit +1 Ladung extra | – |
| Selten | jeder Crit +1 Ladung extra | – |
| Sehr selten | jeder Crit +1 extra, volle Leiste gibt +1 zurück | – |
| Episch | jeder Crit +1 extra, volle Leiste gibt +2 zurück | Ladung über 10 geht nicht verloren, sie bleibt für die nächste Leiste |

Entscheid Owner (2026-09-04): **gesetzt wie vorgeschlagen.**

**Statische Aufladung** — Rate aus Siegen. Heute: Sieg ohne Crit +1 Ladung, volle Leiste +40
Direkt-Score. Direkt-Score entfällt, Ersatz ist Kartenwert.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | jeder 2. Sieg ohne Crit +1 Ladung | – |
| Selten | jeder Sieg ohne Crit +1 Ladung | – |
| Sehr selten | jeder Sieg ohne Crit +1 Ladung, jede 2. Niederlage +1 Ladung | – |
| Episch | jeder Sieg ohne Crit +2 Ladung, jede 2. Niederlage +1 Ladung | volle Leiste gibt der ionisierten Karte dauerhaft +1 Kartenwert |

Entscheid Owner (2026-09-04): **gesetzt wie vorgeschlagen, die Sim tunt.** Festgehalten für die Sim:
der Skill lädt bei Siegen ohne Crit und wird mit jedem Crit-Prozent schwächer. Auf Selten lädt damit
jeder Sieg genau einmal, unabhängig von der Crit-Chance, etwa 26 Ladung je Runde. Er ist am stärksten
im Build mit dem wenigsten Blitz; ein einzelner Normal-Pick in einem breiten Build macht etwa 50
Ionisierungen im Lauf gegen etwa 29 bei reinem Blitz ohne diesen Skill. Diesen Splash-Fall beobachten.
Optionen, falls nötig: Deckel je Runde, Anlasser (lädt nur unter 5), Skalierung mit gehaltenen
Blitz-Skills.

**Reststrom** — Rate. Heute: Leiste startet nach dem Leeren bei 4.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | startet bei 2 | – |
| Selten | startet bei 3 | – |
| Sehr selten | startet bei 4 | – |
| Episch | startet bei 6 | – (stark) |

Entscheid Owner (2026-09-04): **gesetzt wie vorgeschlagen**, Episch ohne Extra. Sim-Notiz: Reststrom
Episch mit Blitzableiter Sehr selten sind 1,5 Crits je Ionisierung, mit Statische Aufladung dazu lädt
zusätzlich jeder Sieg. Diesen Dreier messen.

**Gewitterfront** — Rampe Crit-Chance. Heute: volle Leiste +1 %, Deckel 50 %. Neu ohne Deckel, dafür
niedrigere Schritte (Owner-Vorgabe).

| Stufe | Effekt | reiner Blitz, ~29 Leisten | Rate-Build, ~60 Leisten |
| --- | --- | --- | --- |
| Normal | +0,5 % je volle Leiste | +15 % | +30 % |
| Selten | +0,75 % | +22 % | +45 % |
| Sehr selten | +1 % | +29 % | +60 % |
| Episch | +1,5 % | +44 % | +90 % |

Episch ohne Extra, stark. Heute liegt bei +1 % mit Deckel 50, also zwischen Selten und Sehr selten:
gleicher Schritt wie Sehr selten, aber gedeckelt. Über 100 % greift die Systemregel (kleiner
Crit-Mult-Bonus) und Überschlag.

Entscheid Owner (2026-09-04): **gesetzt wie überarbeitet.**

**Entladung** — Rampe Crit-Mult. Heute: volle Leiste +0,1×, Deckel +1×. Neu ohne Deckel, niedrigere
Schritte. Heute erreicht ein reiner Blitz-Build den Deckel nach zehn Leisten, effektiv +1×; das liegt
zwischen Selten und Sehr selten.

| Stufe | Effekt | reiner Blitz, ~29 Leisten | Rate-Build, ~60 Leisten | Extra |
| --- | --- | --- | --- | --- |
| Normal | +0,02× je volle Leiste | +0,6× | +1,2× | – |
| Selten | +0,03× | +0,9× | +1,8× | – |
| Sehr selten | +0,04× | +1,2× | +2,4× | – |
| Episch | +0,06× | +1,7× | +3,6× | der Crit, der die Leiste füllt, hat den doppelten Crit-Multiplikator |

Kontext: Basis-Crit-Multiplikator 2,25×, der alte Passiv-Anteil (+0,1× je Skill) ist weg, Entladung ist
damit die Haupt-Mult-Quelle von Blitz neben dem Legendären Durchschlag und den Präzisions-Perks. Der
Engine-Deckel 8× auf den fertigen Multiplikator bindet Rate-Builds auf Episch.

Entscheid Owner (2026-09-04): **gesetzt wie überarbeitet.**

**Ladungsserie** — Serie zu Crit. Heute: +2 % je Serienpunkt, Deckel 30 %. Neu ohne Deckel. Der Bonus
hängt an der laufenden Serie und fällt mit ihr, er begrenzt sich also selbst.

| Stufe | Effekt | bei Serie 10 | bei Serie 20 | Extra |
| --- | --- | --- | --- | --- |
| Normal | +1 % je Serienpunkt | +10 % | +20 % | – |
| Selten | +1,5 % | +15 % | +30 % | – |
| Sehr selten | +2 % | +20 % | +40 % | – |
| Episch | +2,5 % | +25 % | +50 % | ab Serie 8 gibt jeder Sieg +1 Ladung |

Heute liegt bei +2 % mit Deckel 30, also zwischen Selten und Sehr selten. Wechselwirkung: Serienschutz
hält die Serie und damit diesen Bonus, Dauerstrom zieht aus derselben Serie Ladung.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Kettenblitz** — Breite je Leiste. Heute: +2 Karten je Ionisierung, nur mit dem Skill Ionisierung.
Neu ohne Bindung, die zusätzlichen Karten folgen in der Reihenfolge.

| Stufe | Effekt | Stapel je Leiste | mono, ~29 Leisten | 3–4 Skills, ~15 Leisten | Extra |
| --- | --- | --- | --- | --- | --- |
| ohne Skill | – | 1 | 29 | 15 | – |
| Normal | jede 2. volle Leiste ionisiert +1 Karte | 1,5 | 44 | 23 | – |
| Selten | jede volle Leiste +1 Karte | 2 | 58 | 30 | – |
| Sehr selten | jede volle Leiste +2 Karten | 3 | 87 | 45 | – |
| Episch | jede volle Leiste +3 Karten | 5 | 145 | 75 | die Zielkarte selbst erhält +1 Stapel zusätzlich |

Leisten je Lauf aus 3.2, nur Passiv-Tempo. Heute +2 Karten (hinter Ionisierung), also Sehr selten.
Kettenblitz ist der Breiten-Multiplikator des Passivs: jede Rate-Quelle (Blitzableiter, Reststrom,
Statische Aufladung, Ladungsserie Episch) wird mit ihm mitvervielfacht — Rate × Breite ist der
Sim-Wachpunkt. Fällt Episch mit 5 Stapeln je Leiste zu stark aus: +3 Karten ohne Extra (4 je Leiste),
wie Reststrom.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen**, ob Episch das Extra behält, entscheidet
die Sim.

**Vorfrage vor Blitzfänger und Kurzschluss (Owner): wächst eine ionisierte Karte weiter?** Heute
bekommt eine ionisierte Siegkarte je Sieg +1 Stapel (`engine.js`, "Ionisierte Siegkarte: +1 Stapel").
3.2 sagt dazu nichts. Die Lesart entscheidet, ob Tiefe als Ressource existiert. Messung (Skript
`stacks.mjs` im Scratchpad: 40 Karten in fester Reihenfolge, 40 Stiche je Runde, 65 % Siege, 5 % Crit je
Skill, ohne Rate-Skills, Stapel-Score 12 je Stapel, 4000 Läufe):

| Lesart | Build | Stapel am Ende | Karten ≥5 Stapel | tiefste Karte | Treffer auf Karte ≥4 Stapel je Lauf | Stapel-Score zu Kartenbasis über den Lauf |
| --- | --- | --- | --- | --- | --- | --- |
| A: Stapel nur aus der Leiste | mono | 28 | 0 | 3 | 0,02 | 0,54× |
| A | 3–4 Skills | 17 | 0 | 2 | 0 | 0,40× |
| A | mono + Kettenblitz Selten | 56 | 0,5 | 4 | 0,6 | 1,08× |
| A | mono + Kettenblitz Episch | 141 | 12 | 9 | 25 | 2,69× |
| B: Siegkarte +1 je Sieg (heute) | mono | 239 | 17 | 25 | 6,3 | 3,54× |
| B | 3–4 Skills | 187 | 12 | 25 | 2,6 | 3,02× |
| B | mono + Kettenblitz Selten | 410 | 27 | 27 | 21,5 | 6,41× |
| B | mono + Kettenblitz Episch | 667 | 36 | 31 | 84 | 11,4× |

Unter A sind Schwellen ab 3 Stapeln tot; Blitzfänger und Kurzschluss brauchen einen Auslöser je
Ionisierung statt je Tiefe. Unter B entsteht Tiefe von selbst, fast unabhängig von der Build-Breite
(3,0× gegen 3,5×), Kurzschluss "ab 5" trifft fast jeden ionisierten Sieg, und die 12 je Stapel müssten
in der Sim auf etwa 2–3 fallen, womit ein frischer Stapel unsichtbar wird. **Empfehlung: A.** Das Passiv
bleibt ein fester Payoff, die Skills tragen die Skalierung (Kettenblitz 0,5× bis 2,7×), und "nur noch
mehr Score" heißt genau das. Preis: zwei Skills bekommen einen anderen Auslöser. Ein Mittelweg wäre
langsameres Wachstum (+1 Stapel je N Siege); die Zahl N wäre dann der Regler zwischen A und B.

Entscheid Owner (2026-09-05): **Lesart A gesetzt.** Kettenblitz dazu noch einmal unter A bestätigt;
gemessener Anteil des Stapel-Scores an der Kartenbasis über den Lauf, mono: ohne Kettenblitz 0,54×,
Normal 0,80×, Selten 1,08×, Sehr selten 1,62×, Episch 2,69×; mit 3–4 Skills 0,40 / 0,59 / 0,81 / 1,21 /
2,02×.

**Stapel-Tiefe in realen Builds.** Die Zahlen oben (nur Passiv, keine Rate-Skills) sind die untere
Schranke. Mit den gesetzten und den vorgeschlagenen Skills liegen die Stapel weit höher
(`blitz-build.mjs` im Scratchpad: ein Skill je Phase, alle Skills auf derselben Stufe, 3000 Läufe).
Mono nimmt Blitzableiter, Statische Aufladung, Kettenblitz, Reststrom, Blitzschlag, Blitzfänger,
Überspannung, Gewitterfront, Ladungsserie, Entladung; Splash die ersten vier davon.

| Build, Stufe aller Skills | Leisten | Stapel gesamt | tiefste Karte | Karten ≥3 / ≥4 / ≥5 / ≥6 / ≥8, Schnitt über den Lauf | am Ende |
| --- | --- | --- | --- | --- | --- |
| mono, Normal | 116 | 227 | 11 | 10,8 / 7,0 / 4,2 / 2,4 / 0,6 | 37 / 33 / 27 / 20 / 8 |
| mono, Selten | 233 | 539 | 20 | 19,8 / 16,6 / 13,8 / 11,4 / 7,5 | 40 / 40 / 40 / 40 / 39 |
| mono, Sehr selten | 358 | 1163 | 37 | 25,2 / 23,1 / 21,2 / 19,4 / 16,2 | alle 40 |
| mono, Episch | 577 | 3157 | 94 | 29,2 / 28,2 / 27,3 / 26,6 / 25,3 | alle 40 |
| Splash 4 Skills, Selten | 111 | 211 | 10 | 15,3 / 10,2 / 6,2 / 3,4 / 0,8 | 37 / 32 / 25 / 17 / 6 |
| Splash 4 ohne Statische Aufladung, Selten | 43 | 85 | 6 | 3,7 / 1,3 / 0,4 / 0,1 / 0 | 14 / 6 / 2 / 1 / 0 |

Statische Aufladung ist der größte Treiber (Sim-Notiz oben), Kettenblitz und Blitzschlag die nächsten.
Ab Selten hat ein Mono-Build am Ende alle 40 Karten über jeder Schwelle bis 8. Eine Stapel-Schwelle
steuert also, **wann** im Lauf ein Skill anspringt, nicht ob; sie gilt als Referenz für alle
Schwellen-Skills (Blitzfänger, Kurzschluss).

**Blitzfänger** — Tiefe zu Wert. Heute: Ionisierung trifft volle Karte (5 Stapel): +2 Stichwert beim
nächsten Auftauchen, +1 Ladung. Vorgabe Owner (2026-09-05): einfacher, ein Effekt je Skill, Schwelle auf
den Stapeln, die mit der Stufe sinkt; eine feste Schwelle bei 2 ist zu niedrig. Zwei frühere Entwürfe
(Wert je Ionisierung plus Ladung je Leiste; feste Schwelle 2 mit steigendem Wert) sind damit verworfen.
Neu: Zustand statt Ereignis, keine Ladung, ein Wert für alle Stufen.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | Karten ab 6 Stapeln haben +2 Wert | – |
| Selten | Karten ab 5 Stapeln haben +2 Wert | – |
| Sehr selten | Karten ab 4 Stapeln haben +2 Wert | – |
| Episch | Karten ab 3 Stapeln haben +2 Wert | – |

Karten mit dem Bonus im Schnitt über den Lauf, andere Skills auf Selten: mono 11 / 14 / 17 / 20, Splash
4 Skills 3 / 6 / 10 / 15, Splash ohne Statische Aufladung 0,1 / 0,4 / 1,3 / 3,7. Am Ende hat der
Mono-Build auf jeder Stufe alle 40 Karten über der Schwelle, der Splash-Build 17 / 25 / 32 / 37. Wert
wirkt doppelt, als Basis-Score und als Siegchance. Die Sim skaliert die +2 und kann die Schwellen
verschieben; nach oben begrenzt das Deck selbst (40 Karten mal Wert).

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.** Die Schwellenleiter 6 / 5 / 4 / 3 gilt als
Muster für die weiteren Schwellen-Skills.

**Kurzschluss** — Tiefe zu Score. Heute: Sieg mit voller Karte +250 Direkt-Score, +3 Ladung.
Direkt-Score entfällt, der Ladungs-Burst auch (ein Effekt je Skill). Ersatz in der Basis: die Stapel
der Siegkarte zählen doppelt. Schwellenleiter wie Blitzfänger.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | Sieg mit einer Karte ab 6 Stapeln: ihre Stapel zählen doppelt | – |
| Selten | ab 5 Stapeln | – |
| Sehr selten | ab 4 Stapeln | – |
| Episch | ab 3 Stapeln | – |

Karten über der Schwelle wie bei Blitzfänger (mono 11 / 14 / 17 / 20 im Schnitt über den Lauf, Splash
3 / 6 / 10 / 15). Spät im Mono-Lauf verdoppelt Kurzschluss damit praktisch den ganzen Stapel-Score; er
multipliziert mit Rate (Leisten), Breite (Kettenblitz) und der Zahl je Stapel, die die Sim setzt. Kein
Rückfluss in die Leiste, also reiner Payoff ohne Rückkopplung. Warum nicht der Ladungs-Burst als
einziger Effekt: mit allen 40 Karten über der Schwelle gäbe jeder Sieg Ladung, 26 Siege je Runde mal 3
wären acht Leisten je Runde, die wieder Stapel erzeugen. Das läuft weg.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Spannungsstau** — Glättung. Heute: Sieg ohne Crit +5 % Crit-Chance für den nächsten Sieg, Deckel
50 %, ein Crit leert den Stau. Neu ohne Deckel: der Stau begrenzt sich selbst, weil jeder Aufbau die
Chance auf den Crit erhöht, der ihn leert. Gemessen (`stau.mjs` im Scratchpad, Siegquote 65 %): bei
Basis-Crit 15 % ist +5 % offen gleich +5 % mit Deckel 50, die typische Spitze liegt bei 53 %.

| Stufe | Effekt je Sieg ohne Crit | Aufschlag bei Basis 15 % | bei 30 % | bei 50 % | Extra |
| --- | --- | --- | --- | --- | --- |
| Normal | +3 % | +7,8 | +4,8 | +2,5 | – |
| Selten | +4 % | +9,3 | +5,9 | +3,2 | – |
| Sehr selten | +5 % | +10,6 | +6,9 | +3,8 | – |
| Episch | +6 % | +19,6 | +13,7 | +8,0 | ein Crit halbiert den Stau statt ihn zu leeren |

Aufschlag = Prozentpunkte effektive Crit-Chance über der Basis. Heute (+5 %, Deckel 50) liegt auf Sehr
selten. Ohne das Extra brächte Episch mit +7 % nur +12,8 bei Basis 15, die Leiter wäre oben flach; das
Halbieren macht den Sprung. Wie Statische Aufladung wird der Skill mit jedem Crit-Prozent schwächer,
Glättung statt Skalierer (Sim-Notiz). Über 100 % im Einzelfall greift die Systemregel, kleiner
Crit-Mult-Bonus.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Überschlag** — Ventil nach oben. Heute: Crit-Chance über 100 % gibt je 10 Prozentpunkte +1 Ladung
je Sieg, ab 85 % voller Karten je 5. Tiefen-Klausel entfällt. Vorgabe Owner (2026-09-05): der Skill
gibt **Crit-Multiplikator**, niedrig angesetzt, die Sim tunt. Ein Entwurf mit Ladung je Sieg ist damit
verworfen (er wäre je Prozentpunkt gerechnet ohnehin ein Kreislauf gewesen: Leisten geben Crit-Chance,
Überschuss gibt Ladung, Ladung gibt Leisten). Neu: der Überschuss über 100 % wird zu Crit-Mult, als
Zustand, nicht als Aufbau.

| Stufe | Effekt | bei 50 Punkten Überschuss | bei 150 Punkten | Extra |
| --- | --- | --- | --- | --- |
| Normal | je 10 Punkte über 100 %: +0,02× Crit-Mult | +0,10× | +0,30× | – |
| Selten | +0,03× | +0,15× | +0,45× | – |
| Sehr selten | +0,04× | +0,20× | +0,60× | – |
| Episch | +0,06× | +0,30× | +0,90× | – (stark) |

Zustand heißt: der Bonus gilt, solange der Überschuss da ist, und fällt mit ihm. Kein Kreislauf, Mult
speist keine Leiste. Kontext: Basis-Crit-Mult 2,25×, Entladung Selten baut +0,03× je Leiste dauerhaft
auf; Überschlag liegt bewusst darunter. Überschuss in realen Builds: ein Mono-Build mit Gewitterfront
Selten (0,75 % je Leiste, rund 230 Leisten) endet je nach Zeitpunkt des Skills 50 bis 150 Punkte über
100. Wechselwirkung mit der Systemregel: die Regel bleibt als kleiner Sockel für alle Fraktionen,
Überschlag kommt obendrauf; die Sim setzt beide Zahlen zusammen.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet**, Systemregel als Sockel darunter.

**Überspannung** — Kaskade, Tiefe zu Ladung. Heute: Crit auf oder neben einer ionisierten Karte
+3 Ladung. "Neben" entfällt: mit den realen Stapelzahlen ist spät jede Karte ionisiert, die Bedingung
"ionisiert" wäre dann leer und der Skill ein zweiter Blitzableiter. Neu: Schwellenleiter, ein Effekt,
fester Betrag. Dritter Schwellen-Skill neben Blitzfänger (Wert) und Kurzschluss (Score).

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | Crit mit einer Karte ab 6 Stapeln: +2 Ladung | – |
| Selten | ab 5 Stapeln | – |
| Sehr selten | ab 4 Stapeln | – |
| Episch | ab 3 Stapeln | – |

Anteil der Crits, die zählen, gleich Anteil der Karten über der Schwelle: mono Selten im Schnitt über
den Lauf 29 / 35 / 42 / 50 %, am Ende alle; Splash 9 / 16 / 26 / 38 %, am Ende 43 / 63 / 80 / 93 %.
Spät bei 50 % Crit: 13 Crits mal 2 sind 26 Ladung je Runde, 2,6 Leisten vor Rate-Skills; Blitzableiter
Selten gibt 1,3. Die Rückkopplung Ladung → Stapel → tiefe Karten → Ladung ist durch die Crits je Runde
begrenzt, kein Kreislauf. Heute gibt +3 auf jeder ionisierten Karte, spät also +3 je Crit; die Leiter
liegt darunter, weil sie später anspringt.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Blitzschlag** — Ionisierung an der Leiste vorbei. Heute: jeder Crit ionisiert die Siegkarte
(+1 Stapel). Das Passiv braucht zehn Crits je Ionisierung; ein Stapel je Crit macht die Leiste zur
Nebensache. Die Stufen setzen den Skill deshalb in ein Verhältnis zum Passiv, heute läge über Episch,
bewusst. Ein Effekt, ein Regler, ohne Extra (das frühere "Episch: 2 Stapel" ist gestrichen).

| Stufe | Effekt | Stapel je 100 Crits | Extra |
| --- | --- | --- | --- |
| Normal | jeder 5. Crit ionisiert die Siegkarte | 20 | – |
| Selten | jeder 4. Crit | 25 | – |
| Sehr selten | jeder 3. Crit | 33 | – |
| Episch | jeder 2. Crit | 50 | – (stark) |

Größenordnung (`blitz-build.mjs`, andere Skills auf Selten): mono etwa 390 Crits im Lauf, also 78 / 98 /
130 / 195 Stapel aus Blitzschlag neben rund 470 aus der Leiste mit Kettenblitz Selten; Splash 4 Skills
177 Crits, also 35 / 44 / 59 / 89 neben rund 220. Unterschied zur Leiste: der Stapel landet auf der
Siegkarte, nicht auf der nächsten in der Reihenfolge. Starke Karten gewinnen öfter, critten öfter und
werden tiefer; Blitzschlag ist damit der Tiefen-Motor für die drei Schwellen-Skills, während die Leiste
und Kettenblitz die Breite machen.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.** Sim-Notiz dazu: werden die Stapel zu
mächtig, kann auch der Bonus je Stapel gesenkt werden (siehe 3.2).

**Dauerstrom** — Serie zu Ladung. Heute: je 3 Serienpunkte +1 Ladung je Sieg, höchstens +3, dazu volle
Leiste +2 % Crit-Chance, Deckel 40 %. Neu nur noch der erste Teil (ein Effekt je Skill; die Rampe gehört
Gewitterfront). Statt "je 3 Punkte +1" eine Schwelle mit festem Betrag, Leiter sinkt mit der Stufe.

| Stufe | Effekt | Siege je Runde über der Schwelle (65 % Siege) | Leisten je Runde | Extra |
| --- | --- | --- | --- | --- |
| Normal | ab 5 Serienpunkten gibt jeder Sieg +1 Ladung | 4,6 | 0,5 | – |
| Selten | ab 4 Serienpunkten | 7,1 | 0,7 | – |
| Sehr selten | ab 3 Serienpunkten | 11 | 1,1 | – |
| Episch | ab 2 Serienpunkten | 17 | 1,7 | – |

Heute (je 3 Punkte, höchstens +3) gibt etwa 15 Ladung je Runde, liegt also zwischen Sehr selten und
Episch. Warum fester Betrag statt "je N Punkte": Serienschutz hält die Serie über Niederlagen hinweg.
Mit genug Ladung bricht sie den ganzen Lauf nicht, und "je 3 Punkte +1" gäbe bei Serie 40 schon +13 je
Sieg, bei Serie 100 +33; das ist ein Kreislauf (Ladung hält die Serie, die Serie gibt Ladung). Der feste
Betrag ist durch die Siege je Runde begrenzt: höchstens 26 Ladung, 2,6 Leisten, auch bei endloser Serie.
Dauerstrom skaliert nicht mit Crit, sondern mit der Siegquote (Wert-Skills wie Blitzfänger verlängern
die Serie), und ist damit wie Statische Aufladung eine Ladungsquelle für Builds mit wenig Crit.
Ladungsserie (Crit je Serienpunkt, offen) hängt an derselben endlosen Serie; die Bremse dafür gehört zu
Serienschutz (Skill 15).

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Serienschutz** — Schutz. Heute: Niederlage mit mindestens 50 % Ladung bricht die Serie nicht, die
50 % werden verbraucht (`SERIENSCHUTZ_COST_FRAC`). Neu: ein Regler, Schwelle gleich Preis, sinkt mit der
Stufe. Die Leiste hat 10 Ladung, der Preis je geschützter Niederlage steht daneben.

| Stufe | Effekt | Preis je Niederlage | eine ganze Runde halten (14 Niederlagen) | Extra |
| --- | --- | --- | --- | --- |
| Normal | Niederlage mit mindestens 70 % Ladung bricht die Serie nicht, kostet 70 % | 7 Ladung | 98 Ladung | – |
| Selten | ab 50 %, kostet 50 % | 5 | 70 | – |
| Sehr selten | ab 40 %, kostet 40 % | 4 | 56 | – |
| Episch | ab 30 %, kostet 30 % | 3 | 42 | einmal je Runde kostenlos |

Heute liegt auf Selten. Was der Skill tut: er kauft Serie mit Leisten. 14 geschützte Niederlagen auf
Selten sind 7 Leisten weniger je Runde, dafür bleibt der Serien-Mult, Ladungsserie und Dauerstrom
laufen weiter. Ab wann die Serie endlos wird, hängt am Ladungseinkommen: ein Mono-Build auf Selten hat
über den Lauf rund 60 Ladung je Runde, spät deutlich mehr, kann sich ab der Mitte also auf Selten bis
Episch jede Niederlage leisten.

**Zur Bremse (Vorschlag: keine zusätzliche).** Eine endlose Serie läuft in den Engine-Deckeln aus,
nicht weg: der Serien-Mult ist ab Serie 75 bei +150 % fest (`STREAK_BASE_CAP`), Crit-Chance über 100 %
geht ins Ventil (Systemregel, Überschlag), der fertige Crit-Mult ist bei 8× gedeckelt. Ladungsserie
Episch und Dauerstrom geben je Sieg feste Beträge. Der Preis in Leisten ist die natürliche Bremse; ein
"höchstens N Schutz je Runde" wäre ein Deckel und braucht es nicht. Sim-Wachpunkt: Ladungsserie ×
Serienschutz, ob die Serie in realen Builds zu früh endlos wird; der Regler ist dann der Preis.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Damit sind alle 15 Blitz-Skills gesetzt.** Die Einzelentscheide stehen je Skill oben; die Zahlen sind
Startwerte für die Sim.

### 3.6 Übersicht Blitz (gesetzt, Stand 2026-09-05)

**Passiv:** jeder Blitz-Skill +5 % Crit-Chance. 10 Crits füllen die Leiste, die volle Leiste ionisiert
die nächste Karte in der Reihenfolge (+1 Stapel). Ein Stapel gibt bei Sieg mit der Karte Score in der
Basis (heute 12, Sim-Regler). Stapel ohne Deckel, kein Selbstwachstum, Direkt-Score aus allen Skills
entfernt. Crit-Chance über 100 % gibt einen sehr kleinen Crit-Mult-Bonus (Systemregel).

| Skill | Rolle | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- | --- |
| Blitzableiter | Rate (seit 7.18 mit Statische Aufladung und Dauerstrom zusammengelegt) | jeder 2. Crit +1 Ladung | jeder 2. Crit +1, volle Leiste +1 zurück | jeder Crit +1, volle Leiste +1 zurück | jeder Crit +1, volle Leiste +2 zurück; jeder Sieg ohne Crit +1 Ladung |
| ~~Statische Aufladung~~ | gestrichen (7.18, in Blitzableiter aufgegangen) | – | – | – | – |
| Ionenfeld (neu, 7.18) | Leiste zu Wert | jede volle Leiste lädt das Feld: die nächsten 5 Stiche kämpfen alle Karten mit +2 Wert | 7 Stiche | 10 Stiche | 15 Stiche, +3 Wert |
| Reststrom | Rate | Leiste startet nach dem Leeren bei 2 | bei 3 | bei 4 | bei 6; die Leiste ist bei 9 voll (Extra 7.22) |
| Gewitterfront | Rampe Crit-Chance | +0,5 % je volle Leiste | +0,75 % | +1 % | +1,5 %; dazu +0,02× Crit-Multiplikator je Leiste (Extra 7.22) |
| Entladung | Rampe Crit-Mult | +0,02× je volle Leiste | +0,03× | +0,04× | +0,06×; der Crit, der die Leiste füllt, hat doppelten Mult |
| Ladungsserie | Serie zu Crit (Sätze ÷10 seit 7.23) | +0,1 % Crit je Serienpunkt | +0,15 % | +0,2 % | +0,25 %; ab Serie 8 jeder Sieg +1 Ladung |
| Kettenblitz | Tiefe (seit 7.18; vorher Breite; Leiter seit 7.19) | jede volle Leiste gibt der Karte mit den meisten Stapeln +1 Stapel | +2 | +3 | +4; die zweittiefste Karte +1 (Extra 7.22) |
| Blitzfänger | Ionisierung zu Wert (seit 7.18 ohne Schwelle) | ionisierte Karten kämpfen mit +1 Wert | +2 | +3 | +4 und +1 je Stapel (Extra 7.22) |
| Kurzschluss | Tiefe zu Score | Sieg mit Karte ab 6 Stapeln: Stapel zählen doppelt | ab 5 | ab 4 | ab 3; verliert so eine Karte, zahlt ihr doppelter Stapel-Score beim nächsten Sieg (Extra 7.22) |
| Spannungsstau | Glättung (seit 7.18 auf den Crit-Multiplikator) | Sieg ohne Crit +0,05× Crit-Multiplikator für den nächsten Crit, der Crit leert | +0,075× | +0,1× | +0,15×; Crit halbiert statt leert |
| Vorentladung (neu, 7.18) | Serie zu Crit | ab Serie 5 gibt jeder Serienpunkt +0,1× Crit-Multiplikator auf den Stich | ab 4 | ab 3 | ab 2 |
| ~~Überschlag~~ | gestrichen (7.19; die Systemregel „Überschuss über 100 %" in groß, im gierigen Build −15 %) | – | – | – | – |
| Lichtbogen (7.28, Platz der Überspannung) | Ionisierung zu Crit-Chance — die Richtung, die vorher niemand bediente | jeder Stapel der gespielten Karte gibt +0,5 % Crit-Chance auf den Stich | +1 % | +1,5 % | +2 % |
| ~~Überspannung~~ | gestrichen (7.28, Owner: „vom Design nicht"; 7.24–7.27 Überschuss über dem Deckel zu Ladung, davor Dauerwert je Leiste und Ionisierung zu Ladung) | – | – | – | – |
| Blitzschlag | Tiefen-Motor (Leiter seit 7.18) | jeder 4. Crit ionisiert die Siegkarte | jeder 3. | jeder 2. | jeder 2., zwei Stapel |
| ~~Dauerstrom~~ | gestrichen (7.18, in Blitzableiter aufgegangen) | – | – | – | – |
| Serienschutz | Schutz | Niederlage ab 70 % Ladung hält die Serie, kostet 70 % | 50 % | 40 % | 30 %; einmal je Runde gratis |
| Ionenfeld | Feld nach jeder Leiste (neu 7.18, Werte 7.20; Platz der alten Ionisierung) | jede volle Leiste: die nächsten 5 Stiche kämpfen alle Karten mit +2 Wert | 7 Stiche, +3 | 10 Stiche, +4 | 15 Stiche, +5 |
| Vorentladung | Serie zu Crit-Multiplikator (neu 7.18; Platz des Breitenbeschleunigers) | ab Serie 5 gibt jeder Serienpunkt +0,1× Crit-Mult auf den Stich | ab 4 | ab 3 | ab 2, +0,15× je Punkt (Extra 7.22) |

**Sim-Wachpunkte Blitz:** Statische Aufladung im Splash-Build; Rate × Breite (Kettenblitz Episch);
Reststrom Episch mit Blitzableiter Sehr selten und Statische Aufladung; Ladungsserie × Serienschutz
(endlose Serie); Kettenblitz Episch × Blitzfänger; der Bonus je Stapel als Regler, wenn Stapel zu
mächtig werden; Schwellen 6 / 5 / 4 / 3 gegen die gemessene Stapel-Tiefe.

**Noch offen für Blitz:** die Skilltexte für `de.js`, die Umsetzung. Die Legendären sind in 3.7 gesetzt.

### 3.7 Legendäre Blitz

**Heute (Code-Stand):** vier Legendäre je Fraktion. Sie sind nie Teil des normalen Angebots, sondern
kommen ausschließlich über eine eigene Legendär-Phase (Plan-Token `legendary`, Runde 29): Mono zeigt
drei Legendäre der Fraktion, Duo und Trio zwei je Fraktion. Ein Legendär je Lauf. Direkt-Dividenden
skalieren mit dem Bekenntnis (Anteil der Fraktion an den Slots). Bestand siehe 3.3.

**Rahmen Legendäre. Gesetzt (Owner, 2026-09-05):**

1. **Keine Stufen.** Ein Legendär hat eine Fassung und steht über Episch.
2. **Kein Tor.** Legendäre erscheinen ohne Bedingung an gehaltene Skills, rein zufällig. Eine Skalierung
   der Effekte mit dem Bekenntnis-Anteil entfällt, die Effekte sind fest.
3. **Kanal: die Tür.** Ein Legendär ist die fünfte Stufe im Würfelwurf nach der Türwahl, für jede
   gezeigte Fraktion. **Startwert 3 bis 4 % je Skill-Platz**, die Sim passt an. Bei 3,5 % und drei
   Plätzen sind das rund 10 % je Phase: im Schnitt ein Angebot je Lauf, 65 % der Läufe sehen mindestens
   eines, 26 % zwei. Die eigene Legendär-Phase (Runde 29) entfällt.
4. **Kein Ersetzen.** Ein Legendär verdrängt nichts; wer Glück hat, hält zwei.

**Vorgabe Owner (2026-09-05): Legendäre dürfen zwei Dinge tun und sollen sich episch anfühlen.** Die
Ein-Effekt-Regel der 15 gilt für sie nicht. Vorschlag dazu: je Legendär ein Regelbruch plus ein
sichtbarer Moment, kein Direkt-Score, keine eigenen Deckel (die Engine-Deckel bleiben), jeder der vier
auf einer anderen Achse des Kits: Rate (Leiste), Tiefe (Stapel je Treffer), Feld (Stapel im Deck), Crit.

**Donnergott** — Rate. Heute: Verbraucher lösen schon bei 70 % Ladung aus, dazu dauerhaft +0,4×
Crit-Multiplikator. Neu der Regelbruch an der Leiste; der Mult-Anteil war zuerst gestrichen (ein
Effekt) und ist mit der Zwei-Effekte-Vorgabe wieder drin.

> **Die Ladungsleiste ist bei 7 voll.**
> **Dauerhaft +0,4× Crit-Multiplikator.**

Wirkung: alles, was an der Leiste hängt, läuft mit 10/7, also ×1,43: Ionisierungen, Kettenblitz,
Gewitterfront, Entladung, Blitzfänger-Ladung. Mit Reststrom mehr, weil der Rest fest ist: Reststrom
Selten braucht 4 statt 7 Ladung je Leiste (×1,75), Reststrom Episch 1 statt 4 (×4). Mono Selten aus
`blitz-build.mjs`: rund 230 Leisten werden etwa 400. Sim-Wachpunkt: Donnergott mit Reststrom Episch und
Blitzableiter, dann füllt jeder Crit eine Leiste; Regler sind die 7 (etwa 8) oder Reststrom Episch (6
auf 5). Der Crit-Mult ist der zweite, flache Effekt: +0,4× auf die Basis 2,25× sind früh +18 % je
Crit, spät unter dem 8×-Deckel im Mono-Build ohne Wirkung, im Splash-Build spürbar.

Entscheid Owner (2026-09-05): **gesetzt**, Leiste bei 7 plus +0,4× Crit-Mult (Mult-Anteil auf
Owner-Wunsch zurück).

**Doppelentladung** — Tiefe. Heute: der Verbraucher ionisiert dreimal so viele Karten, dazu Sieg mit
ionisierter Karte +40 Direkt-Score je Stapel im Feld (bis 120), anteilig zum Bekenntnis. Direkt-Score
und Bekenntnis entfallen. Erster Entwurf nur mit "2 Stapel je Ionisierung": dem Owner zu schwach.
Neu zwei Dinge, beide "doppelt":

> **Jede Ionisierung gibt 2 Stapel statt 1.**
> **Crit mit einer ionisierten Karte: der Blitz schlägt zweimal ein, der Stich zählt doppelt.**

Der erste Teil gilt für jede Quelle (Leiste, Kettenblitz-Karten, Blitzschlag): der Stapel-Score
verdoppelt sich, und die Schwellen 6 / 5 / 4 / 3 sind nach halb so vielen Treffern erreicht. Der zweite
Teil ist der sichtbare Moment: der ganze gewertete Stich (Basis mal Multiplikatoren) zählt zweimal.
Größenordnung: spät im Mono-Build sind alle Karten ionisiert und die Crit-Chance liegt bei 50 % und
mehr, also zählt jeder zweite Sieg doppelt, rund +50 % Score; früh, mit wenigen ionisierten Karten und
15 % Crit, fast nichts. Splash am Ende (37 von 40 Karten ionisiert, 20 % Crit) rund +20 %. Der Effekt
wächst mit Breite und Crit zugleich und ist damit der Schlussstein des Blitz-Builds. Abgrenzung:
Kettenblitz macht Breite, Donnergott Rate, Doppelentladung Tiefe und den Doppelschlag. Kein Kreislauf:
Stapel und Stichwertung speisen keine Leiste; Überspannung bleibt die einzige Rückkopplung, begrenzt
durch die Crits je Runde. Sim-Regler: der Bonus je Stapel und, falls nötig, "zählt 1,5×" statt doppelt.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.**

**Drittes Legendär (heute Flächenionisation)** — Heute: Sieg mit ionisierter Karte gibt beiden
ungespielten Nachbarn +1 Stapel, dazu +130 Direkt-Score je ionisierter Karte im Feld (bis 30),
anteilig zum Bekenntnis. Ein erster Entwurf (Sprung auf beide Nachbarn plus +1 % Crit je ionisierter
Karte) war dem Owner zu nah an den anderen Legendären: wieder Stapel, wieder Crit. Vorgabe: etwas
Eigenes. Vorschlag, mit neuem Namen, weil der alte nicht mehr passt:

**Hochspannung** — Kit.

> **Alle gehaltenen Blitz-Skills wirken eine Stufe höher.** Normal wie Selten, Selten wie Sehr selten,
> Sehr selten wie Episch; Episch bleibt Episch.

Keine neue Währung, kein neuer Zähler: der Regelbruch sitzt an der Leiter selbst. Jeder Blitz-Skill
rückt in seiner Tabelle eine Zeile nach unten, das Extra der Episch-Zeile eingeschlossen. Der
Blitz-Anteil von 5 % Crit je Skill ist nicht gestuft und bleibt. Sichtbarer Moment: alle Blitz-Karten
im Build wechseln ihren Stufenrahmen. Größenordnung: eine Stufe ist je Skill etwa ×1,3 (Blitzableiter
Normal auf Selten ×2 Extra-Ladung, Kettenblitz Selten auf Sehr selten ×1,5, Rampen ×1,33, Schwellen eine
Stufe früher); über acht Blitz-Skills, die sich in Rate, Breite und Rampen multiplizieren, grob ×2 bis
×3 auf den Blitz-Ausstoß, also in der Klasse von Donnergott und Doppelentladung. Skaliert mit der Zahl
der gehaltenen Blitz-Skills und ist damit das Bekenntnis-Legendär ohne Tor: im Splash-Build mit vier
Skills klein, im Mono-Build groß. Umsetzung: Stufenindex plus eins, bei Episch gedeckelt durch die
Leiter selbst. Abgrenzung: Donnergott Rate, Doppelentladung Tiefe und Doppelschlag, Hochspannung das
Kit, Durchschlag Crit.

Alternative, falls ein Feld-Legendär gewünscht bleibt: **Rückschlag** — verliert eine ionisierte Karte,
entlädt sie sich trotzdem: ihr Stapel-Score zählt als Basis des verlorenen Stichs. Neue Ereignisklasse
(Niederlagen scoren), spät im Mono-Build rund +50 % Stapel-Score über die 14 Niederlagen je Runde;
braucht einen Score-Pfad für verlorene Stiche in der Engine.

Entscheid Owner (2026-09-05): **Hochspannung gesetzt wie vorgeschlagen.** Flächenionisation entfällt.

**Durchschlag** — Crit. Heute: voll ionisierte Karte (5 Stapel) gewinnt mit Crit: dauerhaft +0,18×
Crit-Multiplikator, Deckel +2×. Die Mult-Rampe gehört jetzt Entladung, die Tiefe den Schwellen-Skills;
als Legendär wäre das nur mehr vom selben. Neu ein Regelbruch am Crit selbst: er entscheidet nicht
mehr nur den Score, sondern den Stich.

> **Auch Niederlagen können critten: ein Crit bei einer Niederlage gewinnt den Stich.**

Der Durchschlag-Sieg ist ein voller Crit-Sieg: Crit-Multiplikator, Ladung, Serie, Blitzschlag, alles
wie bei einem gewonnenen Crit. Größenordnung: 14 Niederlagen je Runde mal Crit-Chance. Bei 15 % sind
das +2 Siege je Runde (Siegquote 65 auf 70 %), bei 30 % +4 (75 %), bei 50 % +7 (83 %), bei 100 % +14:
kein Stich geht mehr verloren, die Serie bricht nie. Crit-Chance ist damit für den Crit-Build doppelt
wertvoll, und 100 % ist ein Ziel mit eigener Bedeutung; darüber greifen Systemregel und Überschlag wie
bisher. Abgrenzung: Donnergott Rate, Doppelentladung Tiefe und Doppelschlag, Hochspannung das Kit,
Durchschlag der Stich. Wechselwirkungen: Statische Aufladung (Sieg ohne Crit) und Spannungsstau sind
unberührt; Serienschutz wird mit steigender Crit-Chance überflüssig; Bosse mit Zählbedingungen werden
für Crit-Builds leichter. Umsetzung: der Crit-Wurf läuft auch auf verlorenen Stichen (eigener
Zufallsstrom), ein Treffer wandelt das Ergebnis vor der Wertung. Ein zweiter Effekt ist möglich, aber
nicht nötig; der Vorschlag lässt den Regelbruch allein stehen.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Übersicht Legendäre Blitz (gesetzt, Stand 2026-09-05).** Keine Stufen, kein Tor, fünfte Stufe im
Türwurf mit 3 bis 4 % je Skill-Platz, kein Ersetzen, zwei gleichzeitig möglich.

| Legendär | Achse | Effekte |
| --- | --- | --- |
| Donnergott | Rate + Tiefe | Die Ladungsleiste ist bei 7 voll. Jeder Stapel auf der Siegkarte zählt +0,25× statt +0,15× Crit-Multiplikator (7.20; vorher flach +0,4×). |
| Doppelentladung | Tiefe | Jede Ionisierung gibt 2 Stapel statt 1. Crit mit einer ionisierten Karte: der Stich zählt doppelt. |
| Hochspannung (neu, ersetzt Flächenionisation) | Kit | Alle gehaltenen Blitz-Skills wirken eine Stufe höher, Episch bleibt Episch. |
| Resonanz (7.25, ersetzt Durchschlag) | Formation × Ionisierung | Ionisierte Karten in einer Formation teilen ihre Stapel: jede Karte der Formation kämpft mit der Summe der Stapel ihrer Formation. |

Sim-Wachpunkte: Donnergott mit Reststrom Episch und Blitzableiter; Doppelentladung mit Kettenblitz
Episch (Stapel je Leiste ×2); Hochspannung im Mono-Build mit acht und mehr Skills; Durchschlag bei
Crit-Chance nahe 100 % (Serie bricht nie, Serien-Mult und Ladungsserie am Maximum); zwei Legendäre
zugleich, besonders Hochspannung plus eines der anderen.

---

## 4. Feuer

**Reihenfolge (Owner, 2026-09-05):** Feuer durcharbeiten, dann Blitz und Feuer umsetzen und über die Sim
tarieren, danach die weiteren Fraktionen an den Blitz- und Feuer-Werten ausrichten.

### 4.1 Passiv heute

Spielertext (`skill.passive.fire`): *Siege ab 3 Kampfwert-Vorsprung geben Hitze und Feuer-Score, je
größer der Vorsprung, desto mehr von beidem. Niederlagen kosten Hitze plus Wert-Rückstand, höchstens 10.
Jeder weitere Feuer-Skill gibt +5 Feuer-Score je Vorsprungspunkt.*

Code-Stand (`heatGainFor`, `heatLossFor`, Konstanten `HEAT_*`, `FIRE_*`):

- **Hitze** ist eine Leiste 0 bis 100. Gewinn je Sieg ab Vorsprung 3: (Vorsprung − 2) %, linear bis
  Vorsprung 8, darüber ein Wurzel-Schwanz (6 + 1,5·√(Vorsprung − 8)).
- **Verlust je Niederlage:** min(Rückstand, 10) plus 25 % der aktuellen Hitze. Die proportionale
  Kühlung ist ein weicher Deckel: je heißer, desto teurer die Niederlage.
- **Feuer-Score:** (Vorsprung − 2) × 25 in der Basis (`fireFlat`, vor den Multiplikatoren), +5 je
  weiterem Feuer-Skill. Dazu die **Hitze-Dividende:** 32 Direkt-Score je Hitze-Prozent je Feuer-Sieg
  (Deckel 70 %), skaliert mit dem Bekenntnis. Das ist der einzige Direkt-Score-Anteil des Passivs.
- **Konsumenten** (Flächenbrand, Schmelzpunkt): höchstens einer im Build. **Asche** aus Bränden speist
  die Ascheschmiede.

Gemessen mit gleichverteilten Werten 1 bis 10 gegen 1 bis 10: 62 % der Siege haben Vorsprung 3 oder
mehr, 33 % Vorsprung 5 oder mehr, 7 % Vorsprung 8 oder mehr; mittlerer Vorsprung eines Siegs 3,7.
Passiv-Hitze im Schnitt 1,9 % je Sieg, rund 49 % je Runde bei 26 Siegen. Die Verluste (14 Niederlagen,
je 25 % der Hitze plus Rückstand) sind größer: das Passiv allein hält die Hitze nahe null, erst Glut,
Zunder und Glutbett tragen sie.

### 4.2 Passiv neu

**Gesetzt (Owner, 2026-09-05):** Das Feuer-Passiv ist nur noch: **Siege mit Abstand erzeugen Hitze,
Niederlagen reduzieren Hitze.** Kein Feuer-Score und keine Dividende im Passiv. **Die Skills nutzen die
erzeugte Hitze.** Für die Schmiede: **Schmieden unabhängig von Asche.**

Lesart, zu bestätigen: der Owner schrieb "Siege reduzieren Hitze"; gelesen als Niederlagen (heutige
Regel). Sollte "Siege ohne Abstand kühlen" gemeint sein, ändert das die Rechnung unten.

**Vorschlag Zahlen (Startwerte für die Sim, Entscheid Owner):**

| Größe | Heute | Vorschlag | Grund |
| --- | --- | --- | --- |
| Hitze je Sieg mit Abstand | (Vorsprung − 2) %, Knie bei 8 | (Vorsprung − 2) %, linear ohne Knie | keine Deckel; große Siege zahlen voll |
| Mindest-Vorsprung | 3 | 3 | 62 % der Siege zählen, knappe nicht |
| Niederlage | min(Rückstand, 10) + 25 % der Hitze | −2 % flach | die proportionale Kühlung ist ein weicher Deckel |
| Leiste | 0 bis 100 | 0 bis 100 | Skala wie die Blitz-Leiste, kein Rampen-Deckel; darüber nur per Skill (Weißglut) |
| Passiv-Anteil je Feuer-Skill | +5 Feuer-Score je Punkt | **nichts (gesetzt)** | Owner: keine Abhängigkeit von gehaltenen Feuer-Skills |
| Direkt-Score | Hitze-Dividende 32 je % | **entfällt (gesetzt)** | Regel aus dem Rahmen |

Entscheid Owner (2026-09-05): **Lesart bestätigt (Niederlagen kühlen), Zahlen als Sim-Startwerte,
Direkt-Score weg, und keine Abhängigkeit von der Zahl gehaltener Feuer-Skills, weder im Passiv noch in
den Skills.** Damit entfallen im Bestand alle "+X je weiterem Feuer-Skill"-Anteile (Feuer-Score,
Funkenflug, Flächenbrand) und das Bekenntnis.

**Ergänzung des Passivs (Idee Owner, 2026-09-05, Entscheid offen): je 10 % gehaltener Hitze ein kleiner
Score-Multiplikator.** Bewertung: damit hat das Passiv wie bei Blitz Ressource plus festen Payoff, der
erste Feuer-Skill läuft allein, und es entsteht die Spannung "halten gegen verbrennen": Konsumenten
senken den Multiplikator, Halte-Builds pflegen ihn. Feuer wird so die Multiplikator-Fraktion, Blitz die
Basis-Fraktion. Vorschlag zur Größe: **+2 % Score je 10 % Hitze**, also ×1,2 bei voller Leiste, als
eigener Faktor im Multiplikator-Stack (neben Serie, Perk, Formation, Crit); obere Grenze für die Sim
+3 % (×1,3). Ein Tropf-Build pendelt bei 30 bis 60 % Hitze (×1,06 bis ×1,12), ein Halte-Build steht
bei 80 bis 100 (×1,16 bis ×1,2). Über 100 nur mit Weißglut, dessen Rolle damit "der Multiplikator
läuft weiter" wird; Sonnenzorn (Legendär, Score mal Spitzen-Hitze) bekommt später eine neue Fassung.

Entscheid Owner (2026-09-05): **gesetzt mit +2 % je 10 % Hitze.** Das Feuer-Passiv ist damit komplett:
Siege mit Abstand erzeugen Hitze, Niederlagen kühlen, je 10 % gehaltener Hitze +2 % Score als eigener
Multiplikator, sonst nichts.

Tempo mit den Vorschlagszahlen: netto je Stich 0,65 × 1,9 − 0,35 × 2 ≈ +0,55, also rund +22 je Runde
ohne Skills, Leiste voll nach etwa 4,5 Runden. Mit vier Feuer-Skills und +1 je Skill: 0,65 × 5,9 − 0,7
≈ +3,1 je Stich, voll in einer Runde. Konsumenten senken sie wieder (Schmelzpunkt heute −4 je Sieg).
Ohne Konsument steht die Leiste voll und die Erzeugung verpufft; der erste Feuer-Skill muss deshalb
ein Nutzer sein (Rollen-Raster).

**Folgen für den Bestand (Vorschlag, Entscheid je Skill in 4.4):**

| Skill | Unter dem neuen Passiv |
| --- | --- |
| Glut, Zunder, Feuersturm, Glutbett, Rückzündung | Rate-Skills (mehr Hitze, weniger Verlust), bleiben sinnvoll |
| Glühende Klinge, Feuerwalze | Zustand nach Hitzestand, Schwellen-Skills |
| Flächenbrand, Schmelzpunkt | Konsumenten, "nutzen die Hitze"; Verbraucher-Regel (höchstens einer) prüfen |
| Verbrennung, Funkenflug | hängen am Vorsprung und am Feuer-Score der Basis, nicht an der Hitze |
| Weißglut | Überhitzung über 100, einziger Weg über die Leiste |
| Brandmal, Lauffeuer | Gegner-Debuff; Asche entfällt als Währung |
| Ascheschmiede, Glutstahl, Schmelzofen | Schmiede ohne Asche: Vorschlag, Schmieden kostet Hitze |
| 17 Bestand | zwei gehen, wie bei Blitz im Durchgang |

### 4.3 Skills heute (17 normale, 4 legendäre)

Linien wie im Code (`src/game/skills.js`), Kennwerte in Klammern die heutigen Konstanten.

**Linie 1 — Hitze erzeugen**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_01 | Glut | Hitze aus Vorsprung ×1,5. |
| SK_FIRE_02 | Zunder | Jeder Sieg +2 % Hitze, auch knappe. |
| SK_FIRE_03 | Feuersturm | Jeder Sieg in Folge +1 % Hitze mehr, bis +5 %; Niederlage setzt zurück. |

**Linie 2 — Verteidigung**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_04 | Glutbett | Niederlagen kosten nur 50 % der Hitze, unter 30 % Hitze gar nichts. |
| SK_FIRE_05 | Rückzündung | Sieg nach Niederlage: +1 % Hitze je Rückstandspunkt, Siegkarte +2 Stichwert. |

**Linie 3 — Schwellen-Payoffs**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_06 | Glühende Klinge | Alle Karten +1 Wert ab 40 % Hitze, +2 ab 70 % (dazu ein Sieg mit Vorsprung 8 im Segment), +3 bei 100 % (Vorsprung 12). |
| SK_FIRE_07 | Weißglut | Hitze über 100 staut sich als Überhitzung bis 150, je höher, desto weniger kommt an; +2 % Feuer-Score je Punkt; baut 2 je Stich ab, 5 bei Niederlage. |

**Linie 4 — Wert- und Score-Motoren**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_08 | Feuerwalze | Ab 40 % Hitze gibt jeder Sieg in Folge der nächsten Karte +1 Stichwert, bis +3; Niederlage setzt zurück. |
| SK_FIRE_09 | Verbrennung | Feuer-Score ×1,5 ab Vorsprung 8, ×2 ab 12. |
| SK_FIRE_10 | Funkenflug | Siege unter Vorsprung 8 legen das Doppelte ihres Feuer-Scores plus 60 (+20 je weiterem Feuer-Skill) in einen Speicher; ein Sieg ab 8 zahlt ihn aus, Niederlage halbiert. |

**Linie 5 — Konsumenten (höchstens einer)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_11 | Flächenbrand | Ab 80 % Hitze brennt der nächste Sieg bis 40 % herunter: +20 Score je Punkt (+17 je weiterem Feuer-Skill). |
| SK_FIRE_12 | Schmelzpunkt | Jeder Sieg verbrennt 4 % Hitze: 10 Score je Punkt, +6 je gehaltenem Prozent Hitze; Niederlagen kosten keine Hitze. |

**Linie 6 — Brand, Asche, Schmiede**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_13 | Brandmal | Jeder Sieg brandmarkt eine Gegnerkarte (−1 Wert), +1 Asche. |
| SK_FIRE_14 | Lauffeuer | Verstärker (braucht Brandmal): Brände greifen auf eine Nachbarkarte über, +1 Asche. |
| SK_FIRE_15 | Ascheschmiede | Rundenende: niedrigste Karte dauerhaft +3 Wert, solange 20 Asche da sind; Überlauf gibt 2000 Score je 20 Asche. |
| SK_FIRE_16 | Glutstahl | Verstärker (braucht Ascheschmiede): geschmiedete Karten +12 Score je geschmiedetem Wert bei Sieg. |
| SK_FIRE_17 | Schmelzofen | Ab 50 % Hitze: Brände −1 Wert und +1 Asche extra; Schmieden 25 % billiger. |

**Legendäre (separat)**

| ID | Name | Heute |
| --- | --- | --- |
| SK_FIRE_L01 | Sonnenkern | Sieg gegen gebrandmarkte Karte +100 Score je Brand; endet eine Runde mit ≥ 60 % Hitze, stapeln Brände (bis 4) und Karten unter Wert 9 bekommen dauerhaft +2. |
| SK_FIRE_L02 | Phönixfeuer | Niederlagen kosten keine Hitze, sondern geben +8 % je Rückstandspunkt; auf 0 verbrauchte Hitze entzündet sich einmal je Runde auf 40 %. |
| SK_FIRE_L03 | Sonnenzorn | Gesamter Sieg-Score mal höchster je erreichter Hitze: +1 % je Prozent bis 100 (×2), +3 % je Punkt Überhitzung (mit Weißglut ×3,5). |
| SK_FIRE_L04 | Damaststahl | Schmiedet jede Runde die niedrigste Karte ohne Asche (+3, bis 10 Karten); geschmiedete Karten kämpfen mit +5; +14 Score je geschmiedetem Wertpunkt je Sieg. |

### 4.4 Die 15

**Durchgang über die 17 (Vorschlag, 2026-09-05).** Kriterien wie bei Blitz: zu ähnlich zu einem anderen
Skill, oder durch die Passiv-Änderung nicht mehr relevant. Zwei müssen gehen. Dazu die Owner-Vorgaben:
Skills nutzen die Hitze, keine Abhängigkeit von gehaltenen Feuer-Skills, Schmiede ohne Asche.

| Skill | Unter dem neuen Passiv | Einordnung |
| --- | --- | --- |
| Glut | Hitze aus Vorsprung ×1,5 | bleibt, der Rate-Skill des Passivs |
| Zunder | jeder Sieg +2 % Hitze, auch knappe | bleibt, zweite Rate-Quelle mit anderem Auslöser (die 38 % knappen Siege) |
| Feuersturm | Serie gibt Hitze | bleibt, Serie-Schnittstelle wie Dauerstrom bei Blitz; Deckel fällt |
| Glutbett | Niederlagen kühlen weniger | bleibt; mit der flachen −2 je Niederlage wird er zum "Niederlagen kühlen nicht", 14 × 2 = 28 Hitze je Runde, so viel wie das halbe Passiv |
| Rückzündung | Sieg nach Niederlage gibt Hitze und Wert | bleibt, Comeback-Skill; zwei Effekte, im Stufen-Durchgang auf einen bringen |
| Glühende Klinge | Kartenwert nach Hitzestand | bleibt, Schwellen-Skill; die Vorsprungs-Bedingungen fallen |
| Weißglut | Hitze über 100 | bleibt, einziger Weg über die Leiste |
| Feuerwalze | ab 40 % Hitze: Serie gibt der nächsten Karte Wert | bleibt, Wert-Motor mit Hitze-Tor |
| Verbrennung | Feuer-Score ×1,5 / ×2 bei großem Vorsprung | bleibt mit Vorbehalt: das Passiv macht keinen Feuer-Score mehr, der Multiplikator trifft nur noch Skill-Score (Konsumenten, Schmiede); im Stufen-Durchgang prüfen, ob er auf Hitze umgestellt wird |
| Funkenflug | Speicher aus Feuer-Score kleiner Siege, Auszahlung bei großem Sieg | **nicht mehr relevant:** rechnet mit Feuer-Score des Passivs (weg) und mit "+20 je weiterem Feuer-Skill" (weg); zweiter Vorsprungs-Payoff neben Verbrennung |
| Flächenbrand | ab 80 % Hitze: Sieg verbrennt bis 40 %, Score je Punkt | bleibt, der Burst-Konsument; "+17 je weiterem Feuer-Skill" fällt |
| Schmelzpunkt | jeder Sieg verbrennt 4 %, Score je Punkt und je gehaltener Hitze | bleibt, der Tropf-Konsument. Verbraucher-Regel (höchstens einer) prüfen: beide zugleich bremsen sich selbst, Schmelzpunkt hält die Hitze unter 80 |
| Brandmal | Sieg brandmarkt Gegnerkarte, Asche | bleibt als Gegner-Debuff; Asche fällt |
| Lauffeuer | Verstärker: Brände greifen über | bleibt vorerst; ohne Tor an den Türen ist ein Verstärker ohne Basis ein toter Pick, im Stufen-Durchgang eigenständig machen oder in Brandmal-Stufen aufgehen lassen |
| Ascheschmiede | Rundenende: niedrigste Karte +3 dauerhaft für 20 Asche | bleibt als **Schmiede**, ohne Asche; Vorschlag: kostet Hitze, damit ein Hitze-Nutzer |
| Glutstahl | Verstärker: geschmiedete Karten geben Score | bleibt vorerst, gleiche Verstärker-Frage wie Lauffeuer |
| Schmelzofen | ab 50 % Hitze: Brände stärker, mehr Asche, Schmieden billiger | **nicht mehr relevant:** zwei Effekte, beide an Asche gebunden; "Schmieden billiger" ist eine Stufe der Schmiede, kein Skill |

**Vorschlag zum Streichen: Funkenflug und Schmelzofen.** Funkenflug ist mit dem Passiv-Feuer-Score und
dem Skill-Zähler doppelt entwurzelt und deckt denselben Payoff wie Verbrennung (großer Vorsprung).
Schmelzofen hängt ganz an der Asche; was von ihm bleibt (Schmieden billiger, ab einer Hitzeschwelle),
gehört in die Stufen der Schmiede.

**Zweiter Kandidat, falls der Owner Verbrennung ohne Feuer-Score für tot hält: Verbrennung statt
Schmelzofen.** Dann bliebe Schmelzofen als reiner "ab 50 % Hitze"-Verstärker der Schmiede.

**Für den Stufen-Durchgang vorgemerkt:** Verstärker (Lauffeuer, Glutstahl) eigenständig machen oder in
die Stufen ihrer Basis-Skills aufnehmen; Verbraucher-Regel; Rückzündung auf einen Effekt; Schmiede
kostet Hitze.

**Entscheid Owner (2026-09-05): Funkenflug und Schmelzofen gestrichen.** Die 15 sind damit: Glut,
Zunder, Feuersturm, Glutbett, Rückzündung, Glühende Klinge, Weißglut, Feuerwalze, Verbrennung,
Flächenbrand, Schmelzpunkt, Brandmal, Lauffeuer, Schmiede (ex Ascheschmiede), Glutstahl.

### 4.5 Stufen

**Vorgaben (Owner, aus Blitz übernommen):** heutige Werte auf Selten bis Sehr selten; ein Effekt je
Skill; keine Deckel, lieber niedrigere Werte; Schwellen sinken mit der Stufe; Episch mit kleinem Extra
oder stark; kein Direkt-Score; keine Abhängigkeit von gehaltenen Feuer-Skills. Rechengrundlage: Passiv
gibt (Vorsprung − 2) % Hitze ab Vorsprung 3, im Schnitt 1,9 % je Sieg und 49 % je Runde brutto;
Niederlage −2 %; 26 Siege und 14 Niederlagen je Runde.

**Glut** — Rate aus Vorsprung. Heute: Hitze aus Vorsprung ×1,5. Neu dieselbe Form, gestuft. *(Überholt durch 7.12:
Glut ist der Kaltstart-Skill — unter 40/50/60/80 % Hitze zählt Hitze aus Siegen doppelt. Die Tabelle darunter ist
der Stand vor der Auswertung.)*

| Stufe | Effekt | Hitze je Runde zusätzlich | Extra |
| --- | --- | --- | --- |
| Normal | Hitze aus Vorsprung ×1,25 | +12 % | – |
| Selten | ×1,5 | +24 % | – |
| Sehr selten | ×1,75 | +37 % | – |
| Episch | ×2 | +49 % | – (stark) |

Heute liegt auf Selten. Glut vervielfacht nur den Vorsprungs-Anteil des Passivs, nicht Zunder oder
Feuersturm; damit bleibt er der Skill für Decks, die hoch gewinnen (Wert-Skills, Schmiede). Ohne
Nutzer verpufft die Hitze an der 100, Glut braucht also einen Konsumenten oder Schwellen-Skill im
Build.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Zunder** — Rate aus jedem Sieg. Heute: jeder Sieg +2 % Hitze, auch knappe. Neu dieselbe Form,
gestuft; der Skill für Decks, die knapp, aber oft gewinnen.

| Stufe | Effekt | Hitze je Runde zusätzlich | Extra |
| --- | --- | --- | --- |
| Normal | jeder Sieg +1 % Hitze | +26 % | – |
| Selten | +2 % | +52 % | – |
| Sehr selten | +3 % | +78 % | – |
| Episch | +4 % | +104 % | – (stark) |

Heute liegt auf Selten. Zunder Selten macht mehr Hitze als das ganze Passiv (49 % brutto), unabhängig
vom Vorsprung. Ökonomie: Passiv netto etwa +21 % je Runde (49 brutto, 28 Kühlung); Schmelzpunkt Selten
verbrennt heute 4 % je Sieg, also 104 % je Runde, und braucht darum Zunder oder Glut, um zu laufen.
Zunder plus Schmelzpunkt ist das Tropf-Paar, Glut plus Flächenbrand das Burst-Paar.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Feuersturm** — Serie zu Hitze. Heute: jeder Sieg in Folge +1 % Hitze mehr, bis +5 %, Niederlage setzt
zurück. Neu ohne Deckel, wie Ladungsserie bei Blitz: der Bonus hängt an der laufenden Serie. Die Leiste
(100) begrenzt ihn von selbst, mehr Hitze als voll gibt es nicht.

| Stufe | Effekt je Sieg | Hitze je Runde (Serie im Schnitt 2,9) | Extra |
| --- | --- | --- | --- |
| Normal | +0,5 % Hitze je Serienpunkt | +37 % | – |
| Selten | +1 % | +74 % | – |
| Sehr selten | +1,5 % | +111 % | – |
| Episch | +2 % | +148 % | – (stark) |

Heute (+1 %, Deckel 5) sind rund 66 % je Runde, also knapp unter Selten. Rechnung: bei 65 % Siegquote
steht die Serie bei einem Sieg im Schnitt bei 2,9 Punkten (Deckel 5 heute: 2,5). Feuersturm belohnt
Siegquote statt Vorsprung und wächst mit allem, was die Serie hält (Wert-Skills, fremde Serienschutz-
Skills); die Leiste deckelt den Überschuss, ein Konsument macht ihn nutzbar. Sim-Wachpunkt: Feuersturm
mit Serienschutz (Blitz) in einem gemischten Build, dann steht die Leiste dauerhaft voll.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Glutbett** — Schutz. Heute: Niederlagen kosten nur 50 % der Hitze, unter 30 % Hitze gar nichts. Mit
der flachen Kühlung (−2 je Niederlage) wird der Skill zu einem Boden: unter einer Schwelle kühlen
Niederlagen nicht mehr. Ein Effekt, die Schwelle steigt mit der Stufe.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | Niederlagen kühlen die Hitze nicht unter 40 % | – |
| Selten | nicht unter 60 % | – |
| Sehr selten | nicht unter 80 % | – |
| Episch | Niederlagen kühlen nicht | – |

Heute (halbe Kühlung überall plus Boden 30) liegt etwa auf Normal bis Selten. Wert: bis zu 28 Hitze je
Runde (14 Niederlagen mal 2), wenn die Hitze im geschützten Bereich liegt. Der Boden ist zugleich ein
Boden für den Passiv-Multiplikator: ab Selten sicher ×1,12, ab Sehr selten ×1,16. Konsumenten dürfen
weiter unter den Boden brennen, er gilt nur für Niederlagen. Ein Tropf-Build (30 bis 60 % Hitze) hat
von Normal und Selten am meisten, ein Halte-Build (80 bis 100) erst von Sehr selten und Episch.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Rückzündung** — Comeback zu Hitze. Heute: nach einer Niederlage gibt der nächste Sieg +1 % Hitze je
Punkt Rückstand der Niederlage, und die Siegkarte +2 Stichwert. Neu ein Effekt, die Hitze; der Wert
wird das Episch-Extra.

| Stufe | Effekt | Hitze je Runde (9 Comeback-Siege, Rückstand im Schnitt 3,7) | Extra |
| --- | --- | --- | --- |
| Normal | Sieg nach Niederlage: +0,5 % Hitze je Punkt Rückstand | +17 % | – |
| Selten | +1 % je Punkt | +33 % | – |
| Sehr selten | +1,5 % je Punkt | +50 % | – |
| Episch | +2 % je Punkt | +67 % | die Karte nach einer Niederlage hat +2 Wert |

Heute liegt auf Selten. Rechnung: bei 65 % Siegquote folgt auf 9 der 14 Niederlagen je Runde ein Sieg;
der Rückstand einer Niederlage ist im Schnitt 3,7 Punkte, wie der Vorsprung eines Siegs. Vierte
Rate-Quelle mit eigenem Auslöser: Glut belohnt hohe Siege, Zunder viele, Feuersturm Serien,
Rückzündung das Wechselspiel; ein Deck, das oft knapp verliert und dann gewinnt, hat hier am meisten.
Das Episch-Extra macht den Comeback-Sieg selbst wahrscheinlicher.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Glühende Klinge** — Hitze zu Wert. Heute: alle Karten +1 Wert ab 40 % Hitze, +2 ab 70 % (dazu ein
Sieg mit Vorsprung 8 im Segment), +3 bei 100 % (Vorsprung 12). Neu ohne die Vorsprungs-Bedingungen, als
Treppe wie der Passiv-Multiplikator: je Schritt Hitze +1 Wert auf alle Karten. Ein Effekt, der Schritt
ist der Regler.

| Stufe | Effekt | bei voller Leiste | Extra |
| --- | --- | --- | --- |
| Normal | alle Karten +1 Wert je 40 % Hitze | +2 | – |
| Selten | je 30 % | +3 | – |
| Sehr selten | je 25 % | +4 | – |
| Episch | je 20 % | +5 | – (stark) |

Heute (+3 bei 100, mit Bedingungen) liegt auf Selten. Wert wirkt doppelt, Siegchance und Basis; +1 auf
alle 40 Karten hebt die Siegquote grob um 8 Punkte, +3 in Richtung 90 %. Das ist der Payoff des
Halte-Builds: Hitze oben halten heißt starkes Deck, jeder Konsum kostet Wert. Zusammenspiel: Glutbett
sichert die Stufen gegen Niederlagen, Feuerwalze legt Serie-Wert obendrauf.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Weißglut** — über die Leiste. Heute: Hitze über 100 staut sich als Überhitzung bis 150, je höher,
desto weniger kommt an; +2 % Feuer-Score je Punkt; baut 2 je Stich ab, 5 bei Niederlage. Neu: die
Leiste reicht bis 200, und der Passiv-Multiplikator läuft darüber weiter, steiler. Ein Regler, die
Steigung über 100. Die Dämpfung und der eigene Abbau entfallen; über 100 kühlt nur, was auch unter 100
kühlt (Niederlagen, Konsumenten).

| Stufe | Effekt | Multiplikator bei 200 % (Passiv bis 100 gibt ×1,2) | Extra |
| --- | --- | --- | --- |
| Normal | Leiste bis 200 %; über 100 je 10 % Hitze +3 % Score | ×1,5 | – |
| Selten | +4 % | ×1,6 | – |
| Sehr selten | +5 % | ×1,7 | – |
| Episch | +6 % | ×1,8 | – (stark) |

Heute (×2 auf den Feuer-Score bei 150) liegt etwa auf Selten. Warum die Leiste ein Ende hat: ein
offener Score-Multiplikator hätte keines; mit Glutbett Episch (Niederlagen kühlen nicht) und Zunder
wüchse die Hitze linear über den Lauf, das wäre eine Rampe ohne Boden. Die 200 sind eine Skala wie die
100, kein Rampen-Deckel; die Steigung ist der Regler. Weißglut ist der Payoff des Halte-Builds neben
Glühende Klinge (Wert): beide wollen dieselbe hohe Hitze, jeder Konsum kostet beide. Sim-Wachpunkt:
Weißglut mit Glutbett Episch und Zunder, dann steht die Leiste dauerhaft bei 200.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Feuerwalze** — Serie zu Wert. Heute: ab 40 % Hitze gibt jeder Sieg in Folge der nächsten Karte
+1 Stichwert, bis +3; Niederlage setzt zurück. Neu ohne Serien-Skalierung, dafür fest: nach einem Sieg
hat die nächste Karte +2 Wert. Ein Effekt, die Hitze-Schwelle ist der Regler und sinkt mit der Stufe.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | ab 80 % Hitze: nach einem Sieg hat die nächste Karte +2 Wert | – |
| Selten | ab 60 % | – |
| Sehr selten | ab 40 % | – |
| Episch | ab 20 % | die nächste Karte hat den Bonus auch nach einer Niederlage (nachgetragen 2026-09-05, Regel für Hitze-Schwellen-Leitern) |

Heute (ab 40, gestaffelt +1 bis +3) liegt auf Sehr selten. Warum fest statt je Serienpunkt: offen
skaliert wäre die nächste Karte bei Serie 8 um +8 stärker und gewänne fast sicher, die Serie endete
nie; das war der Grund für den heutigen Deckel. Der feste Bonus rollt trotzdem: nach einem Sieg gewinnt
die nächste Karte mit +2 statt mit 65 % in etwa 80 %, die mittlere Serie steigt von 2,9 auf rund 5.
Feuerwalze ist damit der Serien-Motor von Feuer und füttert Feuersturm (Hitze je Serienpunkt) und
fremde Serien-Skills. Die Schwelle koppelt ihn an den Halte-Build; ein Tropf-Build kommt erst mit
Sehr selten oder Episch heran.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Verbrennung** — Vorsprung zu Score. Heute: Feuer-Score ×1,5 ab Vorsprung 8, ×2 ab 12. Das Passiv
macht keinen Feuer-Score mehr, der alte Multiplikator hätte nur noch Skill-Score (Konsumenten,
Schmiede) zu treffen. Neu trifft er den ganzen Stich: ein Sieg mit großem Vorsprung zählt ×1,5, Basis
mal Multiplikatoren. Ein Effekt, die Vorsprungs-Schwelle sinkt mit der Stufe.

| Stufe | Effekt | Anteil der Siege (Werte 1 bis 10, ohne Wert-Skills) | Extra |
| --- | --- | --- | --- |
| Normal | Sieg mit Vorsprung ab 8: der Stich zählt ×1,5 | 7 % | – |
| Selten | ab 7 | 13 % | – |
| Sehr selten | ab 6 | 22 % | – |
| Episch | ab 5 | 33 % | – |

Heute (×1,5 ab 8, nur auf Feuer-Score) liegt auf Normal, auf den ganzen Stich gerechnet ist Normal
schon stärker als heute. Der Skill skaliert mit allem, was den Vorsprung hebt: Glühende Klinge +3
verschiebt jede Schwelle um drei Punkte (Selten ab 7 trifft dann wie "ab 4", 44 % der Siege), Schmiede
hebt die schwächsten Karten, Feuerwalze die nächste Karte. Damit ist Verbrennung der Score-Payoff des
"hoch gewinnen"-Builds neben Glut (dessen Hitze-Seite) und ergänzt die Konsumenten, die den Score aus
der Hitze holen. Kein Kreislauf, Score speist nichts.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Flächenbrand** — Burst-Konsument. Heute: ab 80 % Hitze brennt der nächste Sieg die Hitze bis 40
herunter, +20 Basis-Score je verbranntem Punkt, +17 je weiterem Feuer-Skill. Der Skill-Zähler fällt.
Neu dieselbe Form, Schwelle 80 und Boden 40 fest, der Score je Punkt ist der Regler.

| Stufe | Effekt | Basis-Score je Burst (40 Punkte) | Extra |
| --- | --- | --- | --- |
| Normal | ab 80 % Hitze: der nächste Sieg brennt bis 40 herunter, +15 Basis-Score je Punkt | +600 | – |
| Selten | +20 je Punkt | +800 | – |
| Sehr selten | +25 je Punkt | +1000 | – |
| Episch | +30 je Punkt | +2400 | der Brand brennt die Leiste ganz herunter, bis 0 (80 Punkte) |

Heute (+20, plus Skill-Zähler) liegt auf Selten. Takt: von 40 zurück auf 80 dauert mit Passiv und Glut
Selten (rund 45 netto je Runde) etwa eine Runde, also ein Burst je Runde; mit Zunder dazu zwei. Der
Burst landet in der Basis eines einzigen Stichs und wird mit dessen Multiplikatoren gerechnet, Serie,
Formation, Crit, Verbrennung; das Burst-Paar Glut plus Flächenbrand will darum große Siege. Preis:
der Brand senkt den Passiv-Multiplikator von ×1,16 auf ×1,08 und nimmt Glühende Klinge eine Stufe,
das ist die "halten gegen verbrennen"-Spannung. Episch (erster Entwurf +30 ohne Extra war dem Owner
nicht episch genug): der Burst ist mit 80 Punkten 2,4-mal so groß wie auf Sehr selten, dafür steht die
Leiste danach auf null, Multiplikator ×1,0 und Klinge ohne Stufe, und der Wiederaufbau bis 80 dauert
knapp zwei Runden; je Runde etwa +20 % gegenüber Sehr selten, als Moment das Vielfache. Vorschlag
dazu: die Verbraucher-Regel (höchstens ein Konsument) entfällt; Flächenbrand und Schmelzpunkt zusammen
bremsen sich von selbst, Schmelzpunkt hält die Hitze unter 80.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet**, Episch mit dem Extra; die Verbraucher-Regel
entfällt.

**Schmelzpunkt** — Tropf-Konsument. Heute: jeder Sieg verbrennt 4 % Hitze, 10 Score je Punkt plus 6 je
gehaltenem Prozent Hitze (bei voller Leiste 2440 je Sieg); Niederlagen kosten keine Hitze. Neu ohne den
Hitze-Anteil im Preis und ohne die Niederlagen-Klausel (die gehört Glutbett): jeder Sieg verbrennt 4 %,
jeder Punkt gibt festen Basis-Score. Dieselbe Leiter wie Flächenbrand, der Score je Punkt ist der
Regler.

| Stufe | Effekt | Basis-Score je Sieg (4 Punkte) | Extra |
| --- | --- | --- | --- |
| Normal | jeder Sieg verbrennt 4 % Hitze, +15 Basis-Score je Punkt | +60 | – |
| Selten | +20 je Punkt | +80 | – |
| Sehr selten | +25 je Punkt | +100 | – |
| Episch | +30 je Punkt | +120 | die Hälfte der verbrannten Hitze kommt zurück |

Heute liegt, ohne den Hitze-Anteil gerechnet, auf Normal bis Selten. Ökonomie: der Tropf verbrennt bis
zu 104 % je Runde, mehr als jede Einnahme; die Hitze pendelt darum nahe null, und Schmelzpunkt setzt
genau um, was hereinkommt, Einnahme mal Score je Punkt (Passiv plus Glut Selten rund 45 je Runde: +900
auf Selten, mit Zunder Selten dazu +1900). Flächenbrand rechnet gleich: 800 je 45 Hitze sind 18 je
Punkt. Beide Konsumenten wandeln Hitze zum selben Kurs, der Unterschied ist der Takt: der Burst hält
die Hitze hoch (Multiplikator, Klinge) und legt alles in einen Stich, der Tropf hält sie niedrig,
verteilt den Score auf jeden Sieg und braucht keinen Crit.

Episch: ein erster Entwurf ("verbrennt 6 statt 4") war nur teurer, weil der Tropf einnahme-begrenzt ist
(Owner-Einwand). Der Rückfluss hebt die Grenze: jeder Hitzepunkt wird im Schnitt zweimal verbrannt, also
doppelter Score je Einnahmepunkt, 60 statt 25 auf Sehr selten (2,4×, wie der Episch-Sprung bei
Flächenbrand). Netto verbrennt der Tropf nur noch 2 je Sieg, 52 je Runde; bei Einnahmen über 52 (Zunder
Selten) steigt die Hitze trotz Tropf, Multiplikator und Klinge kommen mit. Sim-Wachpunkt: Schmelzpunkt
Episch mit Zunder und Glutbett, dann läuft der Tropf auf hoher Hitze.

Entscheid Owner (2026-09-05): **gesetzt wie überarbeitet.** Sim-Notiz (Owner): prüfen, ob der Schritt
Selten auf Sehr selten (20 auf 25 je Punkt) spürbar ist; gilt für alle Leitern mit 25-Prozent-Schritten.

**Brandmal** — Gegner-Debuff. Heute: jeder Sieg brandmarkt die geschlagene Gegnerkarte für die nächste
Runde (−1 Wert) und gibt +1 Asche; Brände erneuern sich je Runde und stapeln nicht. Asche entfällt. Neu
mit Hitze-Tor, damit der Skill an der Ressource hängt, und fester Brandstärke; die Schwelle sinkt mit
der Stufe (Leiter wie Feuerwalze).

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | ab 80 % Hitze: jeder Sieg brandmarkt die geschlagene Gegnerkarte, −2 Wert in der nächsten Runde | – |
| Selten | ab 60 % | – |
| Sehr selten | ab 40 % | – |
| Episch | ab 20 % | auch eine Niederlage brandmarkt die Gegnerkarte, die gewonnen hat |

Heute (immer aktiv, −1, plus Asche) liegt etwa auf Sehr selten. Größe: bei aktivem Tor werden je Runde
26 Gegnerkarten gebrandmarkt, das Gegnerdeck (Gesamtwert um 220) verliert 52 Punkte für die nächste
Runde; das ist in der Siegquote ähnlich viel wie Glühende Klinge +1 auf alle eigenen Karten, wirkt aber
nur gegen die Karten, die man schon geschlagen hat, und trifft nächste Runde durch die neue Aufstellung
andere Paarungen. Brände erneuern sich wie heute je Runde und stapeln nicht; das Stapeln bleibt dem
Legendär (Sonnenkern, später) vorbehalten. Der frühere Schmelzofen-Bonus (Brände stärker ab 50 %
Hitze) ist in dieser Leiter aufgegangen.

**Regel aus dem Owner-Einwand (2026-09-05): bei Hitze-Schwellen-Leitern braucht Episch ein Extra.** Im
Late Game liegt die Hitze hoch, der Schritt von 40 auf 20 % ist dann wertlos. Brandmal Episch: auch
die 14 Niederlagen je Runde brandmarken, also alle 40 Gegnerkarten, −80 statt −52, und es trifft genau
die Karten, gegen die man verliert. Begrenzt durch die Deckgröße, kein Aufbau über Runden (Stapeln
bleibt Legendär). Dieselbe Lücke hatte die schon gesetzte **Feuerwalze** (Episch ab 20 %); auf
Owner-Entscheid nachgetragen: Extra "die nächste Karte hat den Bonus auch nach einer Niederlage", also
+2 auf jede Karte, solange das Tor offen ist.

Entscheid Owner (2026-09-05): **Brandmal gesetzt wie überarbeitet**, Feuerwalze-Extra nachgetragen.

**Lauffeuer** — Brand in die Breite. Heute: Verstärker (braucht Brandmal): Brände greifen auf eine
Nachbarkarte über (−1), +1 Asche. Neu eigenständig, ohne Basis-Bindung: ein Sieg setzt die beiden
Nachbarn der geschlagenen Gegnerkarte im Gegnerdeck in Brand, −1 Wert in der nächsten Runde; die
geschlagene Karte selbst brennt nur mit Brandmal. Brände verschiedener Quellen addieren sich (Brandmal
−2 auf der Karte, Lauffeuer −1 je Nachbarschaft), je Runde erneuert, kein Aufbau über Runden. Leiter
wie Brandmal, mit Episch-Extra.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | ab 80 % Hitze: jeder Sieg brandmarkt beide Nachbarn der geschlagenen Gegnerkarte, −1 Wert in der nächsten Runde | – |
| Selten | ab 60 % | – |
| Sehr selten | ab 40 % | – |
| Episch | ab 20 % | Reichweite zwei Karten, also vier Nachbarn |

Heute (ein Nachbar, −1, plus Asche, nur mit Brandmal) liegt etwa auf Selten. Größe: 26 Siege mal zwei
Nachbarn sind 52 Brände, mit Überlappung auf 40 Karten; allein trifft Lauffeuer so fast das ganze
Gegnerdeck mit −1 (Größenordnung Glühende Klinge +1), mit Brandmal werden geschlagene Karten −3 und die
übrigen −1. Episch: vier Nachbarn je Sieg, 104 Brände auf 40 Karten, im Schnitt −2,6 je Karte, begrenzt
durch die Deckgröße. Warum eigenständig: an den Türen gibt es kein Tor, ein Verstärker ohne Basis wäre
ein toter Pick; als Geschwister-Skill von Brandmal (Karte gegen Nachbarn) funktioniert er allein und
stapelt mit ihm.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Schmiede** (ex Ascheschmiede) — Hitze zu Dauerwert. Heute: am Rundenende erhält die niedrigste Karte
dauerhaft +3 Wert, solange 20 Asche da sind (höchstens 9 je Karte, 10 Karten); Überlauf gibt Ascheglut,
2000 Score je 20 Asche. Owner-Vorgabe: Schmieden unabhängig von Asche. Neu kostet die Schmiedung Hitze,
die Schmiede ist damit der dritte Konsument, mit Dauerwert statt Score als Ertrag. Deckel je Karte und
Kartenzahl fallen; die Regel "immer die niedrigste Karte" verteilt von selbst und hebt den Boden des
Decks. Ein Effekt, der Preis ist der Regler.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | Rundenende: liegen mindestens 50 Hitze an, kostet die Schmiedung 50 und die niedrigste Karte erhält dauerhaft +3 Wert | – |
| Selten | kostet 40 | – |
| Sehr selten | kostet 30 | – |
| Episch | kostet 20 | schmiedet die zwei niedrigsten Karten |

Heute (20 Asche, etwa ein halbes Runden-Einkommen) liegt auf Selten bis Sehr selten. Takt: mit Passiv
und Glut Selten (rund 45 netto je Runde) schmiedet Selten jede Runde, Normal fast jede; über 40 Runden
bis zu +120 Deckwert (E: +240) auf 220 Grundwert, linear, ohne Rückkopplung in die Hitze. Der Preis
wird am Rundenende abgezogen: der Halte-Build startet die nächste Runde mit weniger Multiplikator und
Klinge, das ist die Spannung; Flächenbrand und Schmelzpunkt konkurrieren um dieselbe Hitze. Die
Schmiede ist der Motor des "hoch gewinnen"-Builds: höhere Karten heißen mehr Vorsprung, also mehr
Glut-Hitze und mehr Verbrennung. Ascheglut entfällt (Direkt-Score); Damaststahl (Legendär, schmiedet
heute ohne Asche) bekommt später eine neue Fassung.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

Entscheid Owner (2026-09-06, nach 7.13): **die Schmiede schmiedet ohne Preis, sie braucht nur eine Schwelle.** Die
Leiter folgt den anderen Hitze-Schwellen der Fraktion (Feuerwalze, Brandmal, Lauffeuer): Rundenende ab 80 / 60 / 40 /
20 % Hitze, Episch die zwei niedrigsten Karten; die Hitze bleibt liegen. Die Schwellenzahlen sind Vorschlag (Agent,
7.14), der Preis-Wegfall ist gesetzt.

**Glutstahl** — Wert zu Score. Heute: Verstärker (braucht Ascheschmiede): geschmiedete Karten geben bei
Sieg +12 Basis-Score je geschmiedetem Wertpunkt. Neu eigenständig: jeder Punkt, den eine Siegkarte über
ihrem Grundwert hat, gibt Basis-Score, egal woher der Punkt kommt: Schmiede (dauerhaft), Glühende
Klinge, Feuerwalze, Rückzündung Episch, fremde Wert-Skills. Ein Effekt, der Score je Punkt ist der
Regler.

| Stufe | Effekt | Klinge Selten bei 90 % Hitze (+3 auf alle): je Sieg / je Runde | Extra |
| --- | --- | --- | --- |
| Normal | Sieg: +8 Basis-Score je Punkt Wert über dem Grundwert der Karte | +24 / +620 | – |
| Selten | +12 je Punkt | +36 / +940 | – |
| Sehr selten | +16 je Punkt | +48 / +1250 | – |
| Episch | +20 je Punkt | +60 / +1560 | Schmiedewert zählt doppelt |

Heute (+12, nur Schmiedewert) liegt auf Selten, zählt aber weniger Quellen. Glutstahl ist damit das
Gegenstück zu Kurzschluss bei Blitz (Stapel zu Score): der Score-Ausgang für alles, was Wert baut, und
das Bindeglied zwischen Halte-Build (Klinge) und Schmiede-Build. Warum eigenständig: ohne Basis-Bindung
läuft er mit Klinge allein; mit Schmiede kommen je geschmiedeter Karte +3 (Episch +6) je Sieg dazu,
nach zehn Runden Schmiede Selten rund +30 Deckwert, also im Schnitt +0,75 je Karte. Kein Kreislauf,
Score speist nichts.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Damit sind alle 15 Feuer-Skills gesetzt.** Die Einzelentscheide stehen je Skill oben; die Zahlen sind
Startwerte für die Sim.

### 4.6 Übersicht Feuer (gesetzt, Stand 2026-09-05)

**Passiv:** Siege ab Vorsprung 3 geben (Vorsprung − 2) % Hitze, linear ohne Knie. Niederlagen kühlen
−2 % (seit 7.10: Vorsprung − 1 und Kühlung −6 %, Owner-Vorgabe „Hitze schneller verbrauchen"). Je 10 % gehaltener Hitze +2 % Score als eigener Multiplikator. Leiste 0 bis 100 (mit Weißglut
200). Kein Feuer-Score, kein Direkt-Score, keine Abhängigkeit von der Zahl gehaltener Feuer-Skills;
Asche und Verbraucher-Regel entfallen. Rechengrundlage: 26 Siege und 14 Niederlagen je Runde, Passiv
brutto 49 % und netto 21 % Hitze je Runde.

| Skill | Rolle | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- | --- |
| Feuerlinie (7.23, Platz von Glut) | Formation und Wert zu Score, kostet Hitze | ein Sieg in einer Formation zählt +2 % Score je Punkt Kampfwert der Siegkarte und verbrennt 3 % Hitze (ohne 3 % Hitze kein Bonus) | +3 % | +4 % | +5 %; der Bonus zählt je Formation an der Siegposition |
| ~~Glut~~ | gestrichen (7.23; Kaltstart-Verstärker, gierig in 3 % gehalten, Ablation −70 %) | – | – | – | – |
| Zunder | Rate aus jedem Sieg (Sätze seit 7.16) | jeder Sieg +2 % Hitze | +3 % | +4 % | +5 %; auch jede Niederlage +2 % (Extra 7.22) |
| Feuersturm | Serie zu Score (seit 7.17; vorher Serie zu Hitze) | bei voller Leiste zählt jeder Serienpunkt +0,1 % Score | +0,15 % | +0,2 % | +0,3 %; schon ab 90 % Hitze (7.18; war 80) |
| Glutbett | Schutz | Niederlagen kühlen nicht unter 40 % | nicht unter 60 % | nicht unter 80 % | Niederlagen kühlen nicht |
| Rückzündung | Takt (seit 7.24; 7.22 Konter nach Niederlage, tot ab der Laufmitte; davor Comeback zu Hitze, tot) | jeder 5. Sieg in Folge zündet: er zählt ×1,5 | jeder 4. | jeder 3. | jeder 2.; die zündende Karte kämpft mit +2 Wert |
| Glühende Klinge | Hitze zu Wert | alle Karten +1 Wert je 40 % Hitze | je 30 % | je 25 % | je 20 % |
| Weißglut | über die Leiste | Leiste bis 200; über 100 je 10 % +3 % Score | +4 % | +5 % | +6 % |
| Brandschneise (7.27, Platz der Feuerwalze) | Position zu Score, ohne Hitze-Tor | die 3 Siege mit dem größten Vorsprung eines Durchlaufs schlagen die Schneise; im nächsten Durchlauf zählt ein Sieg dort ×2,5 | 4 Positionen | 5 | 6; die Schneise hält zwei Durchläufe |
| ~~Feuerwalze~~ | gestrichen (7.27; +2 Wert ab einer Hitze-Schwelle — dieselbe Achse wie die Klinge, vier Stufen mit viermal +2, tot in 7.6, 7.9 und 7.13) | – | – | – | – |
| Verbrennung | Vorsprung zu Score | Sieg mit Vorsprung ab 8: Stich ×1,5 | ab 7 | ab 6 | ab 5; seine Hitze zählt ebenfalls ×1,5 (Extra 7.22) |
| ~~Flächenbrand~~ | gestrichen (7.16; der Brand kostete Klinge, Siegquote und Serie) | – | – | – | – |
| Schmelzpunkt | Überlauf-Wandler (seit 7.16; vorher Tropf-Konsument) | bei voller Leiste wird die Hitze, die ein Sieg nicht mehr auf die Leiste bringt, zu +15 Basis je Punkt; nichts wird verbrannt | +20 | +25 | +30; die Kühlung einer Niederlage bei voller Leiste zahlt beim nächsten Sieg |
| Brandmal | Gegner-Debuff | ab 80 % Hitze: Sieg brandmarkt die Gegnerkarte, −2 nächste Runde | ab 60 % | ab 40 % | ab 20 %; auch Niederlagen brandmarken |
| Lauffeuer | Brand in die Breite | ab 80 % Hitze: Sieg brandmarkt beide Nachbarn, −1 nächste Runde | ab 60 % | ab 40 % | ab 20 %; Reichweite zwei Karten |
| Schmiede | Hitze zu Dauerwert (seit 7.14: ohne Preis, nur Schwelle) | Rundenende ab 80 % Hitze: niedrigste Karte +3 dauerhaft, die Hitze bleibt | ab 60 % | ab 40 % | ab 20 %; zwei Karten |
| Glutstahl | Wert zu Score | +8 Basis-Score je Punkt Wert über Grundwert bei Sieg | +12 | +16 | +20; Schmiedewert zählt doppelt |

**Sim-Wachpunkte Feuer:** Einnahmen gegen die Leiste (Zunder, Feuersturm füllen schneller als die 100
fassen; Konsumenten machen den Überschuss nutzbar); Weißglut mit Glutbett Episch und Zunder (Leiste
dauerhaft 200); Schmelzpunkt Episch auf hoher Hitze; Flächenbrand Episch Takt (zwei Runden Aufbau);
Feuersturm × Serienschutz (Blitz) im gemischten Build; Siegquote aus Klinge, Brandmal und Lauffeuer
zusammen (Richtung 90 %); Schmiede offen (+120, Episch +240 Deckwert); Spürbarkeit der 25-Prozent-
Schritte (Owner); Hitze-Schwellen-Leitern, ob 80/60/40 im Late Game noch trennen.

**Umgesetzt in Phase 3 (7.3).** Die Skilltexte stehen im Skillkatalog (Normal-Stufe, dann die Leiter) und werden in Phase 4
abgenommen. Legendäre in 4.7 gesetzt.

### 4.7 Legendäre Feuer

Rahmen wie bei Blitz (3.7, gesetzt): keine Stufen, kein Tor, fünfte Stufe im Türwurf mit 3 bis 4 %,
kein Ersetzen, zwei Effekte erlaubt, episch. Dazu aus dem Feuer-Durchgang: kein Direkt-Score, keine
Asche, keine Abhängigkeit von gehaltenen Skills. Weil es kein Tor gibt, muss jedes Legendär allein
laufen, darf also nicht an einem bestimmten Skill hängen. Achsen: Gegner (Brand), Rhythmus (Niederlagen),
Halten (Multiplikator), Schmiede (Dauerwert).

**Sonnenkern** — Gegner. Heute: Sieg gegen gebrandmarkte Karte +100 Score je Brand; endet eine Runde
mit mindestens 60 % Hitze, stapeln sich Brände (bis 4) statt sich zu erneuern, und Karten unter Wert 9
bekommen dauerhaft +2. Direkt-Score, Hitze-Bedingung, Brand-Deckel und Dauerwert-Anteil entfallen. Neu
zwei Dinge am Brand, und der erste macht ihn eigenständig:

> **Jeder Sieg brandmarkt die geschlagene Gegnerkarte (−1 Wert), und Brände erneuern sich nicht mehr:
> sie stapeln sich über die Runden.**
> **Sieg gegen eine gebrandmarkte Karte: +20 Basis-Score je Brand auf ihr.**

Der Regelbruch ist das Stapeln: heute werden Brände jede Runde neu gesetzt, mit Sonnenkern bleiben sie
und wachsen. Eine Gegnerkarte, die in zehn Runden geschlagen wird, steht bei −10, also für die meisten
Karten (Werte 1 bis 10) bei null; der Wert einer Karte fällt nie unter null, das ist die natürliche
Grenze der Schwächung. Der Score-Teil wächst weiter: je Sieg 20 mal Brände, spät 200 bis 400 Basis je
Sieg, linear über die Runden. Allein trägt Sonnenkern sich mit dem eigenen −1 je Sieg; mit Brandmal
(−2 je Sieg, spät auch bei Niederlagen) und Lauffeuer (Nachbarn) stapelt das ganze Gegnerdeck drei bis
vier Punkte je Runde und ist nach wenigen Runden wertlos. Größenordnung dann: Siegquote nahe 100 %,
Serie bricht nie, Glut ohne Vorsprungsgrenze. Sim-Regler: die 20 je Brand, notfalls die −1. Abgrenzung
zu den anderen drei: Sonnenkern schwächt den Gegner, die anderen stärken das eigene Spiel.

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Phönixfeuer** — Rhythmus. Heute: Niederlagen kosten keine Hitze, sondern geben +8 % je Punkt
Rückstand; auf 0 verbrauchte Hitze entzündet sich einmal je Runde auf 40 % neu. Beide Ideen bleiben,
die Zahlen folgen dem neuen Passiv:

> **Niederlagen kühlen nicht, sie heizen: +2 % Hitze je Punkt Rückstand.**
> **Fällt die Hitze auf 0, entzündet sie sich neu auf 50 %.** (Owner: ohne "einmal je Runde".)

Der Regelbruch dreht die Passiv-Regel um. Statt −28 je Runde (14 Niederlagen mal 2) kommen +104 (14 mal
3,7 mal 2), ein Umschwung von rund 130 Hitze je Runde, so viel wie Zunder Episch plus Passiv. Ein Deck,
das viel verliert, heizt damit am meisten; Rückzündung (Sieg nach Niederlage) legt obendrauf, Glutbett
wird überflüssig. Der zweite Teil ist der Phönix-Moment für die Konsumenten, und er zündet so oft, wie
die Leiste auf null fällt: Flächenbrand Episch brennt bis 0 und steht sofort wieder auf 50, bis 80
fehlen dann 30, mit den Niederlagen-Einnahmen vier Niederlagen, also drei bis vier Bursts je Runde
statt einem je zwei Runden; Schmelzpunkt brennt die Leiste in rund zwölf Siegen leer und bekommt jedes
Mal 50 zurück, etwa zweimal je Runde. Begrenzt bleibt es durch die Stiche je Runde, jede Neuzündung
braucht erst das Leerbrennen. Sim-Wachpunkt: Phönixfeuer mit Flächenbrand Episch (Größenordnung 7000
bis 10 000 Basis je Runde) und mit Weißglut (Leiste 200 ohne jede Kühlung); Regler die 2 je Punkt und
die 50 der Neuzündung.

Entscheid Owner (2026-09-05): **gesetzt**, Neuzündung ohne Rundenlimit.

**Sonnenzorn** — Halten. Heute: der gesamte Sieg-Score wird mit der höchsten je erreichten Hitze
multipliziert, +1 % je Prozent bis 100 (×2), +3 % je Punkt Überhitzung (mit Weißglut ×3,5). Der
Hitze-Multiplikator steckt jetzt im Passiv (+2 % je 10 %); Sonnenzorn wird die legendäre Fassung davon,
zwei Regelbrüche am selben Multiplikator:

> **Der Hitze-Multiplikator rechnet mit der höchsten je erreichten Hitze, nicht mit der aktuellen.**
> **Der Hitze-Multiplikator zählt doppelt: je 10 % Hitze +4 % Score statt +2 %.**

(Formulierung auf Owner-Wunsch geändert, vorher "doppelt so steil".)

Der erste Teil löst die Spannung "halten gegen verbrennen" zugunsten des Spielers: wer einmal auf 100
war, behält ×1,4 (statt ×1,2 heute im Passiv bei voller Leiste), egal was Flächenbrand, Schmelzpunkt
oder Schmiede danach verbrennen. Burst- und Tropf-Builds bekommen damit den Halte-Payoff geschenkt,
Halte-Builds den doppelten Multiplikator. Der zweite Teil betrifft nur den Passiv-Anteil; die Steigung
von Weißglut über 100 bleibt, wie sie ist, zählt aber ebenfalls die Spitze: mit Weißglut Selten und
Spitze 200 sind das 1 + 0,4 + 0,4 = ×1,8 dauerhaft. Größenordnung: ein Feuer-Build mit Zunder steht in
Runde 2 bis 3 erstmals auf 100 und trägt ×1,4 durch den Rest des Laufs; Weißglut-Builds ×1,8 bis
×2,0 ab dem ersten Erreichen der 200. Kein Kreislauf, der Multiplikator speist keine Hitze. Abgrenzung:
Sonnenkern Gegner, Phönixfeuer Rhythmus, Sonnenzorn Multiplikator, Damaststahl Schmiede. Sim-Regler:
die 4 %.

Entscheid Owner (2026-09-05): **gesetzt**, Formulierung wie oben.

**Damaststahl** — Schmiede. Heute: schmiedet jede Runde die niedrigste Karte ohne Asche (+3, bis 10
Karten); geschmiedete Karten kämpfen mit +5 Wert; +14 Score je geschmiedetem Wertpunkt je Sieg. Der
Score-Teil gehört jetzt Glutstahl, der Karten-Deckel fällt, und die Schmiede schmiedet selbst schon
ohne Asche (für Hitze). Neu zwei Dinge, das erste macht ihn eigenständig:

> **Jede Runde wird deine niedrigste Karte geschmiedet, +3 Wert dauerhaft, ohne Preis.**
> **Geschmiedete Karten kämpfen mit doppeltem Schmiedewert.**

Der erste Teil ist eine Schmiede, die nichts kostet: sie läuft ohne Hitze und ohne den Skill Schmiede,
und mit ihm zusammen werden je Runde zwei Karten geschmiedet (Schmiede Episch: drei). Ab Runde 13 sind
das rund +80 Deckwert bis zum Ende, mit Schmiede Selten dazu +160. Der zweite Teil ist der Damast: eine
dreimal geschmiedete Karte (+9) kämpft mit +18, gewinnt also weit über ihrem Wert und macht Vorsprung
für Glut und Verbrennung; der Basis-Score rechnet mit dem echten Wert, nur der Vergleich im Stich
verdoppelt. Skaliert mit der Schmiede-Tiefe, nicht mit einer festen Zahl (heute +5 flach). Abgrenzung
zu Glutstahl Episch (Schmiedewert zählt doppelt für den Score): Damaststahl verdoppelt ihn für den
Sieg, Glutstahl für den Score; beide zusammen sind der Schmiede-Build. Kein Kreislauf: Dauerwert speist
keine Hitze. Sim-Regler: die +3 der freien Schmiedung, notfalls "jede zweite Runde".

Entscheid Owner (2026-09-05): **gesetzt wie vorgeschlagen.**

**Übersicht Legendäre Feuer (gesetzt, Stand 2026-09-05).** Rahmen wie Blitz; jedes läuft allein.

| Legendär | Achse | Effekte |
| --- | --- | --- |
| Sonnenkern | Gegner | Jeder Sieg brandmarkt die Gegnerkarte (−1), Brände stapeln sich über die Runden statt sich zu erneuern. Sieg gegen gebrandmarkte Karte +20 Basis-Score je Brand. |
| Ewige Glut (7.21, ersetzt Phönixfeuer) | Rampe | Jede Runde, die mit voller Hitzeleiste endet, hebt den Hitze-Multiplikator dauerhaft um +5 %, ohne Deckel. Die Hitze fällt nie unter 50 % der höchsten je erreichten Hitze. |
| ~~Phönixfeuer~~ | Rhythmus | gestrichen (7.21): Niederlagen heizen, Serienschutz je Runde, Überlauf-Wandler — der Rückstand einer Niederlage war im reifen Deck zu klein, um irgendetwas daraus zu machen (7.20). |
| Sonnenzorn | Multiplikator | Der Hitze-Multiplikator rechnet mit der höchsten je erreichten Hitze — bis 200 %, auch ohne Weißglut (7.19) — und zählt je 10 % +5 % Score statt +2 % (7.20: war +4 %). Solange die Hitze unter der Spitze liegt, zählt die Hitze aus Siegen ×2 (7.20). |
| Damaststahl | Schmiede | Jede Runde wird die niedrigste Karte ohne Preis geschmiedet (+3). Geschmiedete Karten kämpfen mit doppeltem Schmiedewert. |

Sim-Wachpunkte: Sonnenkern mit Brandmal und Lauffeuer (Gegnerdeck nach wenigen Runden bei null);
Phönixfeuer mit Flächenbrand Episch (mehrere Bursts je Runde) und mit Weißglut; Sonnenzorn mit Weißglut
(×1,8 bis ×2,0 dauerhaft); Damaststahl mit Schmiede Episch und Glutstahl Episch; zwei Legendäre zugleich.

**Umgesetzt in Phase 3 (7.3).** Die Legendären sind gesetzt; ihre Texte stehen im Skillkatalog und werden in Phase 4
abgenommen.

## 7. Umsetzung Blitz und Feuer (Plan, 2026-09-05)

Technische Reihenfolge, Entscheid des Agenten; die Produktvorgaben stehen in 3 und 4. Branch `exp`,
Eis und Pflanze bleiben bis zu ihrer Runde auf dem alten Stand. Jede Phase endet mit grünen Gates und
einem Push.

| Phase | Inhalt |
| --- | --- |
| 1 Stufenmodell und Angebot | Skill-Stufen im Zustand (`skillTiers` je gehaltenem Skill, Angebot mit gewürfelter Stufe je Platz 62 / 25 / 10 / 3, Legendär 3,5 % je Platz als fünfte Stufe). Legendär-Phase (Runde 29) entfällt, Plan auf 40 Runden mit 10 Skill-Phasen (Runden 1, 5, 9 … 37). Stufe sichtbar im Angebot und bei den gehaltenen Skills. Hochspannung als Stufe plus eins. Sim-Policies und Tests angepasst. |
| 2 Blitz | Eigenes Modul für Passiv, 15 Skills, 4 Legendäre mit Stufentabellen. Raus: Feld-Crit, Sättigung, Verbraucher-Regel, Bekenntnis, Direkt-Score, Ionisierung und Breitenbeschleuniger, alte Legendäre. Neu: Ladung über 10 (Blitzableiter Episch), Leiste 7 (Donnergott), Doppelschlag, Crit bei Niederlage (Durchschlag), Systemregel über 100 %. |
| 3 Feuer | Eigenes Modul für Passiv (Hitze aus Vorsprung, Kühlung −2, Hitze-Multiplikator als Faktor im Score), 15 Skills, 4 Legendäre. Raus: Asche, Feuer-Score des Passivs, Glutdividende, Bekenntnis, Verbraucher-Regel, Funkenflug, Schmelzofen, Deckel der Schmiede. Neu: Leiste bis 200 (Weißglut), Spitzen-Hitze (Sonnenzorn), stapelnde Brände (Sonnenkern), Kampfwert geschmiedeter Karten (Damaststahl). |
| 4 Texte und Anzeige | Skilltexte je Stufe (Deutsch, im Skillkatalog), Passiv-Texte, Glossar, `loc:export`. Ladungs- und Hitzeleiste mit den neuen Größen. |
| 5 Gates und Sim | `npm test`, Lint, Build, `gen:db`; Ratchets nur dort anpassen, wo sich die Invariante geändert hat. Deploy-Slot prüfen. Sim-Läufe Blitz und Feuer, mono und Splash, erste Zahlen an den Owner, dann Tarieren. |
| später | Türen (zwei Türen, drei Symbole), Eis, Pflanze, Münzen und Bosse. |

Zustandsmodell: `skills` bleibt die Liste der IDs, daneben `skillTiers` (ID → 0 bis 3) und
`skillOfferTiers` für das aktuelle Angebot; Legendäre haben keine Stufe. Skill-Effekte lesen ihre
Kennwerte aus Stufentabellen in der Skill-Definition statt aus Einzelkonstanten; die Sim-Regler
(`SIM_*`) bleiben für die Passiv-Größen (Leiste, Hitze je Punkt, Bonus je Stapel, Multiplikator je 10 %).

### 7.1 Stand Phase 1 (2026-09-05, umgesetzt)

- Stufenwurf je Platz (`rollSkillOfferTiers`, Gewichte `SKILL_TIER_WEIGHTS` 62 / 25 / 10 / 3, Legendär
  `SKILL_LEGENDARY_PER_SLOT` 3,5 % je Platz, Sim-Regler). Ein Legendär-Treffer ersetzt den Platz durch einen
  ungehaltenen Legendär derselben Fraktion; Pool leer → Platz bleibt normal. Der Stufenwurf hat einen eigenen
  Zufallsstrom ("tiers"), der Zug selbst ist unverändert.
- Plan: 40 Runden, zehn Blöcke Skill → Perk → Aufstellen → Architekt, Skills bei 1, 5, 9 … 37. Legendär-Phase,
  Legendär-Wahl (Screen, Aktionen, Texte) und Dev-Run-Regler dafür entfernt.
- Slots unbegrenzt (`SKILL_SLOT_LIMIT`, oberster Wert der Dev-Run-Regel heißt "kein Limit"); eine Dev-Run-Regel
  darunter begrenzt weiterhin, das Ersetzen-Fenster bleibt dafür bestehen. Kopfzeile und Bestand zählen nur noch,
  was gehalten wird.
- Stufe sichtbar: Badge im Angebot und bei den gehaltenen Skills, Kante der Angebotskarte in der Stufenfarbe.
  Farben und Namen sind die der bestehenden Raritätsleiter (Normal grau, Selten grün, Sehr selten blau, Episch
  lila), Legendär bleibt Gold. Wortlaut und Farben in Phase 4 mit den Texten abnehmen.
- Hochspannung (Stufe plus eins) folgt in Phase 2 mit den Stufentabellen des Blitz-Moduls; in Phase 1 gibt es
  noch keine Tabellen, die sich verschieben ließen.
- Vorläufig, bis Phase 2/3: die Skills lesen ihre Stufe noch nicht (Bestandseffekte unverändert); der Sim-Band-
  Wächter ist auf den gemessenen Stand des 40er-Plans zentriert (Random-Policy Median ≈ 1,97M, Mean ≈ 2,33M) und
  wird nach den Modulen erneut zentriert; die Glossartexte Skill-Slot und Legendärer Skill sowie der
  Meisterhand-Text nennen noch den alten Stand (Phase 4).

### 7.2 Stand Phase 2, Blitz (2026-09-05, umgesetzt)

Modul `src/game/factions/lightning.js` (reine Übergänge, keine Engine-Logik im Modul, kein React); die
Stufentabellen der 15 Skills stehen als `tiers[0..3]` in `SKILL_DEFS`, die Texte interpolieren dieselben Zahlen.
Passiv, 15 Skills und 4 Legendäre wie in 3.6 und 3.7. Technische Entscheide, die das Dokument offen ließ:

- **Leiste:** höchstens eine Zündung je Stich, nach Sieg und Niederlage (Statische Aufladung lädt auch auf
  Niederlagen). Ladung, die nach dem Leeren noch über der Leiste liegt, bleibt stehen und zündet beim nächsten
  Stich; das hält die Kombination Donnergott × Reststrom Episch × Blitzableiter (Boden plus Rückgabe ≥ Leiste)
  aus der Endlosschleife. Die Zielkarte ist die nächste Position; am Deckende wickelt sie an den Anfang.
- **Entladung Episch:** der Leisten-Crit verdoppelt den Multiplikator vor dem 8×-Deckel (der Deckel bleibt).
- **Serienschutz Episch:** der eine Gratisschutz je Runde verlangt keine Ladung.
- **Durchschlag:** eigener Zufallsstrom `durchschlag`; ein Treffer wandelt die Niederlage vor der Wertung, der
  Sieg-Zweig läuft als garantierter Crit-Sieg (Ladung, Serie, Blitzschlag, Doppelschlag inklusive).
- **Doppelentladung:** der Doppelschlag multipliziert den gewerteten Stich nach dem Crit-Faktor
  (`SIM_DOPPELENTLADUNG_STRIKE`, Start 2; 1,5 ist der Regler). Stapel je Ionisierung `SIM_DOPPELENTLADUNG_STACKS`.
- **Systemregel:** `SIM_OVERCRIT_MULT_PER_PP` 0,002 je Prozentpunkt über 100 %, für alle Fraktionen (Startwert).
- **Sim-Regler des Passivs:** `SIM_LIGHTNING_CRIT_PER_SKILL` 0,05 · `SIM_LIGHTNING_MAX_CHARGE` 10 ·
  `SIM_DONNERGOTT_MAX_CHARGE` 7 · `SIM_THUNDER_CRIT_MULT` 0,4 · `SIM_ION_SCORE_PER_STACK` 12.
- **Raus:** Ionisierung (Skill), Breitenbeschleuniger, Flächenionisation (ID L03 heißt jetzt Hochspannung),
  Feld-Crit, Sturm-Sättigung, Verbraucher-Regel, Direkt-Score, Bekenntnis, Selbstwachstum, Blitzfänger-Temp,
  alle alten Blitz-Konstanten. Die zwei Embleme der gestrichenen Skills sind gelöscht.
- **Anzeige (vorläufig, Phase 4):** Ladungsleiste zeigt Ladung, volle Leisten und die beiden Rampen; Karten-Pips
  zeigen weiter bis 5 Stapel; Skilltexte nennen die Normal-Stufe und dann die Leiter in einem Satz.
- Wird Spannungsstau ersetzt, geht sein Stau mit (Reducer); die Engine fasst den Stau ohne den Skill nicht an.
- Gates grün, Sim-Band-Wächter unverändert grün.

### 7.3 Stand Phase 3, Feuer (2026-09-05, umgesetzt)

Modul `src/game/factions/fire.js` (reine Übergänge, kein React); die Stufentabellen der 15 Skills stehen als `tiers[0..3]`
in `SKILL_DEFS` (`FEUER_TIERS`), die Texte interpolieren dieselben Zahlen. Passiv, 15 Skills und 4 Legendäre wie in 4.6
und 4.7. Technische Entscheide, die das Dokument offen ließ:

- **Hitze-Tore und Multiplikator eines Siegs** („ab X % Hitze", Flächenbrand-Schwelle, Brandmal, Lauffeuer, der Hitze-
  Multiplikator) lesen die Hitze nach dem Gewinn dieses Siegs und vor dem Verbrauch der Konsumenten. Zustands-Boni
  (Glühende Klinge, Feuerwalze, Rückzündung Episch) lesen die Hitze vor dem Stich. Die Hitze läuft mit Nachkommastellen
  (Glut ×1,25, Feuersturm 0,5 je Punkt); die Anzeige rundet.
- **Multiplikator:** je volle 10 % Hitze (abgerundet), ein Faktor `fireMult` = Hitze-Multiplikator × Verbrennung im
  Score-Stack an der Stelle des alten Sonnenzorn-Faktors; Anteil am Score wird wie der Formations-Anteil geschätzt
  (`fireHeat`, ehemals `fireWhite`).
- **Reihenfolge im Sieg:** Hitzegewinn → Schmelzpunkt (verbrennt höchstens, was da ist; Episch gibt die Hälfte zurück) →
  Flächenbrand (Tor auf der Hitze vor dem Tropf) → Phönix-Neuzündung (bei 0, ohne Rundenlimit) → Glutstahl → Sonnenkern-
  Score → Brände. Alle Feuer-Flats in der multiplizierten Basis, kein Direkt-Score.
- **Glutstahl** zählt den Kampfwert der Siegkarte über ihrem Grundwert (`baseRank`), alle Quellen, ohne den Damast-
  Kampfbonus; Episch zählt den Schmiedewert doppelt.
- **Brände** werden als Wertpunkte je Gegnerkarte geführt; Quellen addieren sich (Brandmal −2, Lauffeuer −1 je Nachbar,
  Sonnenkern −1), kein Deckel, der Wert fällt nie unter 0. Lauffeuer-Nachbarn sind die Nachbarn im Gegnerdeck (kein
  Wrap). Sonnenkern zahlt je Brandpunkt und stapelt am Rundenende auf die alten Brände; ohne ihn ersetzen die neuen
  die alten. Brandmal Episch brandmarkt bei einer Niederlage die Siegerkarte (Tor auf der Hitze vor der Niederlage).
- **Glutbett** ist ein Boden für Niederlagen: liegt die Hitze darunter, kühlt die Niederlage nicht, sonst nicht unter
  den Boden; Episch kühlt nie. Konsumenten brennen weiter darunter.
- **Schmiede** am Rundenende, ein Preis je Runde; Episch schmiedet zwei verschiedene Karten für denselben Preis.
  Niedrigste Karte deterministisch (kleinster Wert, dann kleinste id). Damaststahl schmiedet danach die dann niedrigste,
  ohne Preis, und verdoppelt im Kampf nur den Vergleich. Der Schmiedewert bleibt in der Karte, auch wenn Feuer fällt.
- **Weißglut:** `heat.max` folgt dem Build (100, mit Weißglut 200), Reducer und Engine gleichen ihn an; wird Weißglut
  ersetzt, klemmt die Hitze auf 100. Der Multiplikator über 100 liest die Stufe; ohne Weißglut ist bei 100 Schluss.
- **Sonnenzorn** liest die Spitze (`heat.peak`, immer mitgeführt) für den ganzen Multiplikator, auch den Weißglut-Teil.
- **Konsument-Garantie im Angebot** ist mit der Verbraucher-Regel entfallen (Blitz in Phase 2, Feuer jetzt): das Angebot
  zieht rein aus dem Pool; das Konsument-Abzeichen hängt am Glossar-Schlüsselwort. Das Sim-Policy-Limit „höchstens ein
  Konsument" ist weg.
- **Sim-Regler des Passivs:** `SIM_HEAT_MIN_MARGIN` 3 · `SIM_HEAT_MARGIN_OFFSET` 2 · `SIM_HEAT_PER_POINT` 1 · `SIM_HEAT_LOSS` 2
  · `SIM_HEAT_MULT_PER_10` 0,02 · `SIM_WEISSGLUT_HEAT_MAX` 200 · `SIM_FORGE_VALUE` 3; Legendäre `SIM_SONNENKERN_SCORE_PER_BRAND`
  20 · `SIM_PHOENIX_LOSS_HEAT` 2 · `SIM_PHOENIX_REIGNITE` 50 · `SIM_SONNENZORN_MULT_PER_10` 0,04.
- **Raus:** Asche (Ressource, Zähler, Anzeige, Glossar), Feuer-Score des Passivs, Glutdividende samt Architekt-Hebel,
  Bekenntnis, Verbraucher-Regel, Überhitzung (eigener Akku, Abbau, Dämpfung), Funkenflug samt Ertragszeile, Schmelzofen,
  Deckel der Schmiede (je Karte, Kartenzahl, Ascheglut), Sonnenkern-Dauerwert und Brand-Deckel, Phönix-Rundenlimit,
  Damast-Dividende und Karten-Deckel, alle alten Feuer-Konstanten. Die Embleme der zwei gestrichenen Skills sind gelöscht,
  das der Schmiede umbenannt.
- **Anzeige (vorläufig, Phase 4):** Hitzeleiste 0–100 (mit Weißglut 0–200, Marke bei 100), Multiplikator im Kopf, Klingen-
  Schritte als Striche, Abzeichen für Klinge, Feuerwalze, Verbrennung, Schmiede (Preis) und Sonnenzorn (Spitze),
  Schmiede-Zähler, Brand-Zeile; Ertrag in zwei Kanälen (Feuer-Score, Multiplikator-Anteil).
- Gates grün, Sim-Band-Wächter unverändert grün.

### 7.4 Stand Phase 4 und 5 (2026-09-05, erste Zahlen)

**Texte (Phase 4).** Die Skilltexte stehen seit Phase 2/3 im Skillkatalog (Normal-Stufe, dann die Leiter aus denselben
Tabellen), die Passiv-Texte und die Glossareinträge Hitze, Brand, Weißglut, Schmieden, Konsument, Überlauf, Ladung,
Ionisierung, Stapel, Legendärer Skill sind neu gefasst. Nachgezogen: Vorsprung, Skill-Slot (unbegrenzt), Bekenntnis
(nur noch Pflanze), der Meisterhand-Text (sofortige Skill-Wahl statt Slot) und der Direkt-Score-Tooltip. **Offen für den
Owner:** Wortlaut und Stufenfarben abnehmen; Karten-Pips zeigen weiter bis 5 Stapel (darüber nur der Tooltip) — Vorschlag:
ab 6 eine Zahl statt Pips; die Meta-Glossareinträge (Stichpunkte, Deckpunkte, Upgrade-Baum) nennen noch das
gestrichene Meta-System.

**Anzeige.** Ladungsleiste folgt `lightning.maxCharge` (Donnergott 7); Hitzeleiste 0–100, mit Weißglut 0–200 mit Marke
bei 100, Multiplikator im Kopf, Abzeichen für Klinge, Feuerwalze, Verbrennung, Schmiede und Sonnenzorn.

**Gates und Deploy (Phase 5).** `npm test`, Lint, Build, Preview-Build, `gen:db`, `loc:export` grün; CI und
Deploy-Slot `/autostich/exp/` grün für den Feuer-Stand (11278896). Der Sim-Band-Wächter (Random-Policy, Median
1,3M–2,7M) bleibt grün und wird nicht neu zentriert.

**Sim, erste Zahlen (Seeds 1…, Fraktions-Policy hält 10 Skills, alles andere Random-Baseline):**

| Build (200 Läufe) | Median | vs. Mix | p90 | Siegquote |
| --- | --- | --- | --- | --- |
| Mix (Random) | 1,33M | 1,00× | 2,37M | 58,1 % |
| Feuer mono | 2,69M | 2,02× | 7,87M | 65,9 % |
| Blitz mono | 2,36M | 1,77× | 5,56M | 53,4 % |
| Eis mono (alter Stand) | 5,83M | 4,38× | 19,5M | 53,5 % |
| Pflanze mono (alter Stand) | 5,15M | 3,86× | 7,82M | 64,6 % |

Splash (100 Läufe, Slot-Split): Feuer+Blitz 2,53M = 0,96× des besten reinen Members (gesund, Referenz ≈ 1,0); jede
Kombination mit Eis oder Pflanze verwässert (0,39× bis 0,66×), weil die alten Fraktionen noch auf der alten Ökonomie
stehen. Feuer+Pflanze ist mit 3,34M der beste Kombi-Floor.

Skill-Lift (200 Läufe je Fraktion, Ø-Score mit Skill ÷ Ø gesamt; zufällige Builds, Stufen gewürfelt):

- **Feuer:** Sonnenkern 2,70 · Damaststahl 1,16 · Sonnenzorn 1,13 · Feuersturm 1,10 · Median 1,01 · schwach: Glut 0,95,
  Zunder 0,93, Verbrennung 0,93, Glutstahl 0,92, Glutbett 0,89, Schmelzpunkt 0,89, Flächenbrand 0,87, Phönixfeuer 0,77.
  Lesart: mit zehn Feuer-Skills steht die Leiste meist voll (Wachpunkt „Einnahmen gegen die Leiste"); Rate-Skills und
  Konsumenten tragen dann wenig, der Multiplikator und die Brände alles. Sonnenkern stapelt das Gegnerdeck wie in 4.7
  vorhergesagt herunter (Regler: 20 je Brandpunkt, notfalls die −1).
- **Blitz:** Durchschlag 1,76 · Doppelentladung 1,18 · Donnergott 1,18 · Median 0,99 · schwach: Serienschutz 0,94,
  Reststrom 0,91, Hochspannung 0,90. Lesart: der Crit auf Niederlagen ist der stärkste Hebel; Hochspannung hebt
  gewürfelte Normal-Stufen nur eine Stufe und liegt darum unter dem Schnitt.
- Eis (Eiszeit 3,55, Erstarrung 2,39, Große Lawine 2,25) und Pflanze (Weltenbaum 1,48, Ewiger Frühling 1,44) zum
  Vergleich, alter Stand.

**Vorschlag für das Tarieren (Entscheid Owner):** erst Blitz und Feuer gegeneinander auf gleichen Floor bringen
(Regler: `SIM_ION_SCORE_PER_STACK`, `SIM_HEAT_MULT_PER_10`, Sonnenkern 20 je Brandpunkt, Durchschlag), dann Eis und
Pflanze in ihren Runden an dieses Niveau; die Verteilung der Lifts (Median ≈ 1, Legendäre oben) ist die gewünschte
Form. Phönixfeuer und die beiden Konsumenten sind die ersten Kandidaten für eine Anhebung.

### 7.5 Tarierung Feuer/Blitz (2026-09-05, umgesetzt)

Owner-Vorgabe: Eis und Pflanze bis zu ihrer Überarbeitung ignorieren, Feuer und Blitz gegeneinander tarieren, danach die
große Auswertung aus realistischen Läufen (gierige Picks, gemischt, über die Stufen). Werkzeug dafür im Sim-Harness:

- **Archetyp-Allowlist je Lauf** (`runOne(…, { archetypes })` → `START_RUN action.archetypes` → `unlockedArchetypes`):
  die Welt „nur Feuer und Blitz" — jedes Angebot hat 3 Feuer- und 3 Blitz-Skills, keine Eis-/Pflanze-Plätze.
- **`--mode duel`:** Feuer mono, Blitz mono, Feuer+Blitz Split und die Random-Baseline in dieser Welt, mit den aktiven
  Reglern im Kopf (für Sweeps über `SIM_*`).
- **`--mode skills`** (7.6): stufenbewusste UCB-Erkundung (Arm je Skill und Stufe) → gieriger Spieler auf frischen Seeds →
  gepaarte Ablation je Skill; Lift je Stufe, Haltequote, Marginalwert, Flags.

**Messung vor der Tarierung (200 Läufe, Seeds 1–200, Fraktions-Policy hält 10 Skills):** Feuer mono 2,40M, Blitz mono
2,15M (Floor 1,12×, Mean 1,22×, p90 1,37×), Split 2,29M, Mix 1,66M. Diagnose Blitz: Ø 103 Ionisierungen und 50 volle
Leisten je Lauf, am Laufende Ø 2,6 Stapel je Karte — bei 12 je Stapel trugen die Stapel nur rund 8 % der Basis, der
Regler war praktisch tot (Stapel-Score 12 → 21 bewegte den Median nicht).

**Sweep (Blitz mono):** Stapel-Score 30 → 2,18M · 45 → 2,30M · 60 → 2,37M; Crit je Blitz-Skill 0,07 → 2,43M.
**Sweep (Feuer mono):** Hitze-Multiplikator je 10 % 0,015 → 2,10M · 0,01 → 2,04M.

**Entscheid (Tarierung, technischer Regler): `SIM_ION_SCORE_PER_STACK` 12 → 60.** Damit Feuer mono 2,40M gegen Blitz
mono 2,47M (Floor 0,97×, Mean 0,99×, p90 1,22×), Split 2,46M (≈ 1,0× des besseren Mono, gesund), Mix 1,73M. Der
Stapel-Weg statt des Crit-Wegs, weil er die Leiste und die Stapel-Skills (Kettenblitz, Kurzschluss, Blitzfänger,
Überspannung) spürbar macht, wo mehr Crit nur den Crit-Multiplikator weiter füttert; Feuer zu senken hätte beide auf
Blitz' altes Niveau gezogen. Rest-Unterschied ist die Decke (p90 1,22×): Feuers Schwanz kommt aus Sonnenkern und
Sonnenzorn, das ist Gegenstand der Auswertung in 7.6, nicht der Tarierung. Alternative, falls die Stapel nach der
Auswertung zu mächtig sind: 45 plus Crit 0,06. Der Sim-Band-Wächter (Random, offene Welt) bleibt grün.

### 7.6 Große Auswertung Feuer/Blitz (2026-09-05, gemessen vor den Türen)

`npm run sim -- --mode skills --explore 1000 --runs 150 --seed 1` in der Welt „nur Feuer und Blitz", noch mit dem
flachen Angebot (3 Feuer + 3 Blitz je Phase; die Türen aus 7.7 kamen danach). Ablauf: 1000 Erkundungsläufe mit einem
Arm je Skill und Stufe (UCB), daraus eine Wertetabelle; 150 gierige Läufe auf frischen Seeds (Seeds 1001–1150), die
nehmen, was sich als stark erwiesen hat; je Skill eine gepaarte Ablation (derselbe Lauf ohne diesen Skill).
Lesehilfe: **Lift** = Mittelwert der Läufe mit dem Skill ÷ ohne (aus der Erkundung, stufenweise), **Median-Δ** = Median
der gepaarten Differenz (gierig), **win** = Anteil der Paare, in denen der Skill besser war, **anw.** = Anteil der
gierigen Läufe, in denen der Skill überhaupt gehalten wurde. Gierig hält Ø 10 Skills und liegt beim Median bei 16,4M
gegen 8,0M der Erkundung; 73 % der gierigen Läufe gewinnen ihre Ablation.

**Ausreißer nach oben (stark):** Sonnenkern (L, Lift 1,97, Median-Δ +106 %, in 23 % der Läufe), Glühende Klinge (1,25,
+89 %, in 73 %), Weißglut (1,15, +27 %, in 77 %), Ladungsserie (1,29, +105 %, in 86 %), Doppelentladung (L, 1,37, +50 %),
Durchschlag (L, 1,41, +25 %). Die drei Legendären sind gewollt oben. Ladungsserie und Klinge sind die zwei Skills, die
der gierige Spieler fast immer nimmt — sie tragen den Build, das ist eher zu viel Gewicht auf einem Skill als ein
Fehler des Skills.

**Skills, die nichts tun (tot, |Δ| < 3 %, win 42–58 %):** Feuerwalze, Schmiede, Glutstahl (Feuer); Spannungsstau,
Blitzschlag, Überspannung, Reststrom (Blitz).

**Skills, die schaden (Δ ≤ −5 % oder win ≤ 40 %):** Glut (−23 %, win 23 %), Feuersturm (−6 %), Glutbett (−3 %, win
25 %), Damaststahl (L, −7 %), Kurzschluss (−5 %), Blitzfänger (−8 %, win 33 %), Serienschutz (−24 %). Glut ist der
klarste Fall: ×1,25 Hitze auf Vorsprungssiege wird vom Passiv (+2 % je 10 % Hitze) kaum belohnt, der Platz kostet einen
besseren Skill.

**Selten gehalten (< 5 % der Läufe, Zahlen unsicher):** Rückzündung, Phönixfeuer, Zunder, Schmelzpunkt, Flächenbrand,
Donnergott, Kettenblitz. Die beiden Konsumenten und Phönixfeuer waren schon in 7.4 die schwächsten; der gierige
Spieler meidet sie ganz.

**Über die Stufen (Leiter-Flag = eine höhere Stufe misst schlechter als eine tiefere, n ≥ 8):** 24 von 30 Skills.
Klare Fälle mit Stufe, die nach unten kippt: Schmiede (N 1,10 → S 0,49), Glut (SS 0,45 bei E 1,10), Weißglut (S 0,58
zwischen N 1,15 und SS 1,27), Entladung (S 0,60), Dauerstrom (SS 0,53), Überspannung (S 0,52). Bei Stufen mit n < 20 ist
das meist Rauschen der Erkundung (der Explore verteilt 1000 Läufe auf 120 Arme); die Zahlen je Stufe sind Hinweise,
kein Urteil. Kein Skill zeigt eine saubere Leiter N < S < SS < E; das Stufenmodell ist in der Sim noch nicht als
Stärkeleiter sichtbar, weil eine höhere Stufe desselben Skills selten den Lauf entscheidet.

**Vorschläge (Entscheid Owner, nichts davon umgesetzt):**

1. Glut umbauen oder streichen — der Kernskill der Feuer-Rate schadet. Kandidat: Hitze-Multiplikator auf alle Siege
   statt nur auf Vorsprungssiege, oder Glut als Passiv-Verstärker (+1 % je 10 % Hitze je Stufe).
2. Serienschutz: −24 % — die 70 % Ladung sind zu teuer; entweder Kosten 40/30/20/10 oder Schutz ohne Verbrauch ab Episch.
3. Die toten Sieben: Feuerwalze (+2 Wert ab 80 % Hitze kommt zu selten), Schmiede (50 Hitze für +3 Wert lohnt nicht,
   Damaststahl gratis schadet trotzdem), Glutstahl (8 je Punkt zu wenig), Spannungsstau, Blitzschlag, Überspannung,
   Reststrom. Erst nach der Türen-Auswertung (7.7) anfassen: die Türen ändern, wie oft ein Skill überhaupt angeboten
   wird.
4. Stufen: Weißglut, Entladung, Dauerstrom, Überspannung mit mehr Läufen je Stufe nachmessen (Explore 3000), bevor
   eine Leiter umgestellt wird.
5. Die Auswertung nach den Türen wiederholen (gleicher Aufruf) — die Türen bringen weniger Skills je Phase (3 statt 6
   sichtbar), was Haltequoten und Marginalwerte verschiebt.

### 7.7 Türen-Angebot und Stufentexte (2026-09-05, umgesetzt)

Owner: auf /exp stand noch das alte Angebot aus allen vier Archetypen; gemeint sind die zwei Türen aus §1, die Sim
testet nur Feuer und Blitz, und ein Skill zeigt nur den Text seiner angezeigten Stufe.

**Türen (docs §1, `src/game/skills.js` `buildSkillDoors`):** eine Skill-Phase stellt zwei Türen; jede zeigt drei
Fraktionssymbole in Platzreihenfolge — drei Skills aus höchstens zwei Fraktionen, Wiederholung erlaubt (Feuer·Feuer·Blitz
oder Feuer·Feuer·Feuer). Die Stufen (und die Legendär-Chance je Platz) werden mit der Tür gewürfelt und erst nach dem
Öffnen gezeigt (`CHOOSE_DOOR`). Danach das Drei-Karten-Angebot auf einer Seite, jede Karte in ihrer Fraktionsfarbe,
einer wird genommen. Neuwurf würfelt die drei Skills der geöffneten Tür neu, zu denselben Symbolen (Owner-Korrektur
2026-09-05; zuerst baute er zwei neue Türen), vor den Türen gibt es keinen; Ablehnen geht an beiden Stufen
und gibt wie bisher ein Perk-Angebot. Meisterhand öffnet dasselbe Türen-Angebot. Der Dev-Run mit Voll-Katalog bleibt
flach. Der Entscheidungs-Log kennt die Türwahl als eigene Zeile (`k: "door"`).

Technische Entscheide (Agent): die Skills beider Türen sind verschieden, solange der Pool reicht (sechs Kandidaten je
Phase); die Fraktion je Platz wird gleichverteilt gezogen, ab der zweiten Fraktion auf der Tür nur noch aus diesen
beiden (bei zwei Fraktionen: 25 % eine Fraktion, 75 % gemischt); die Dev-Run-Regel „Skills je Fraktion" ist jetzt die
Türgröße, die Ranked-Verknappung ein Skill je Tür. Sim-Policies wählen die Tür stufenblind wie der Spieler (Random:
irgendeine; Fraktion: die mit den meisten Ziel-Skills; Greedy/UCB: die mit dem stärksten bekannten Skill).

**Annahme (Owner bestätigen):** der Angebots-Pool auf exp ist `SKILL_OFFER_ARCHETYPES = ["fire", "lightning"]` — Eis und
Pflanze stehen nicht hinter den Türen, bis sie überarbeitet sind. Eine Allowlist je Lauf (Sim `--arch`, `START_RUN
action.archetypes`) ersetzt den Pool, Eis/Pflanze bleiben so für die Sim erreichbar. Offen bleibt der Punkt „Fokus am
Start" aus §1.

**Stufentexte:** jeder Blitz- und Feuer-Skill trägt `descTiers` (vier eigenständige Sätze aus seiner Stufentabelle,
das Episch-Extra nur im Episch-Satz); `desc` ist der Normal-Satz. Katalog `ability.<id>.desc.<t>`, Leser
`skillDef(id, tier)`. Das Angebot zeigt die gewürfelte, der Bestand (Skill-Wahl, Perk-Wahl, Build-Übersicht, Statistik,
Lauf-Detail) die gehaltene Stufe; die Datenbank listet alle vier. Lauf-Einträge speichern `skillTiers` mit.

**Messung (Random-Policy, Feuer/Blitz):** Seeds 1–200 Median 1,23M mit Türen gegen 1,23M mit dem flachen Angebot —
die Türen verschieben das Zufallsniveau nicht. Duell (100 Läufe, Fraktions-Policy): Feuer mono 2,61M, Blitz mono 2,32M
(Floor 1,13×), Split 2,71M, Mix 1,64M — die Mono-Policies sehen mit Türen im Schnitt 1,5 statt 3 eigene Skills je Phase,
Feuer verträgt das offenbar besser. Nicht nachtariert; die Wiederholung der großen Auswertung (7.6, Punkt 5) ist der
nächste Schritt. Sim-Band-Wächter auf die Türen-Welt neu zentriert (Median 1,13M, Mean 1,34M über Seeds 1–40).

### 7.8 Motor-Diagnose: Hitze im Lauf, Ionisierung als Score-Treiber (2026-09-05)

Owner-Fragen: Wenn Glut tot ist — wie wird Hitze gehalten, ist ein Verstärker nötig, klebt die Leiste dauerhaft am
Anschlag? Wie hoch ist die Ionisierungsrate, und ist sie der Haupttreiber des Scores? Werkzeug: `npm run sim -- --mode
motor --runs 100 --seed 1` (`sim/motor.js`), je Fraktion allein in ihrer Welt, 100 Läufe, Seeds 1–100, Aufstellung und
Architekt greedy. Neben der Fraktions-Policy (zufällige eigene Skills) feste Builds über `fixedPolicy` mit Ausschluss-
liste: „Kern" = Klinge, Weißglut, Verbrennung, Brandmal, Lauffeuer, Glutstahl, Feuerwalze, Glutbett, Schmiede,
Schmelzpunkt, Flächenbrand in dieser Reihenfolge; „Verstärker" = die vier Rate-Skills Glut, Zunder, Feuersturm,
Rückzündung.

**Feuer — Hitze je Stich (nur solange die Hitze aktiv ist):**

| Build | Median | Ø Hitze | Stiche ≥ 100 % | am Anschlag | erste 100 % nach | Vorsprung-Siege | Passiv +Hitze je Runde | Kühlung je Runde | Mult-Anteil am Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fraktion (zufällig, Weißglut in 61 %) | 2,40M | 65 % | 22 % | 15 % | 281 Stiche (64 % der Läufe erreichen 100) | 75 % | 97 % | 23 % | 24 % |
| Kern ohne Verstärker | 10,06M | 126 % | 62 % | 44 % | 532 Stiche | 89 % | 226 % | 14 % | 52 % |
| Glut + Kern | 9,82M | 150 % | 75 % | 68 % | 323 Stiche | 90 % | 234 % | 11 % | 52 % |
| Zunder + Kern | 9,77M | 150 % | 76 % | 69 % | 263 Stiche | 90 % | 235 % | 11 % | 52 % |
| alle vier Verstärker + Kern | 6,06M | 144 % | 73 % | 66 % | 189 Stiche | 83 % | 148 % | 17 % | 47 % |

„Anschlag" = Hitze auf der Leistenlänge des Builds (100, mit Weißglut 200). „Passiv +Hitze je Runde" = Hitze aus
Vorsprung-Siegen ohne jeden Verstärker; Glut wäre ×1,25 … ×2 darauf.

Befund:

1. **Ein Verstärker ist nicht nötig.** Das Passiv allein produziert im Kern-Build 226 % Hitze je Runde gegen 14 %
   Kühlung — das Sechzehnfache. Die Hitze steht in 62 % der Stiche auf ≥ 100 % und in 44 % am Ende der 200er-Leiste.
   Glut oder Zunder heben das auf 75 %, bringen aber keinen Score (9,8M gegen 10,1M, Rauschen); alle vier Verstärker
   kosten vier Kern-Plätze und ein Drittel des Scores.
2. **Glut ist tot, weil die Leiste voll ist.** ×1,25 auf Hitze, die ohnehin am Anschlag klebt, ist nichts; das Ergebnis in
   7.6 (−23 % im gierigen Lauf) ist der Preis des verlorenen Platzes, nicht ein Rechenfehler des Skills.
3. **Der Engpass ist der Kaltstart.** Ohne Verstärker dauert es 532 Stiche (13 Runden) bis zur ersten vollen Leiste,
   mit Zunder 263, mit allen vier 189. Frühe Siege haben kleine Vorsprünge, Klinge gibt erst mit Hitze Wert — das
   Passiv startet langsam. Die Verstärker sind Kaltstart-Hilfen, kein Plateau.
4. **Der zufällige Feuer-Build hält die Hitze nicht** (Ø 65 %, 22 % der Stiche ≥ 100 %, nur 64 % der Läufe erreichen 100).
   Grund sind die Konsumenten und die Schmiede: Schmelzpunkt brennt 4 je Sieg, Flächenbrand auf 40, die Schmiede 50 je
   Runde — sie verbrennen die Basis des Multiplikators und zahlen 15–30 Basis-Score je Punkt zurück. Das deckt sich mit
   7.6: die drei Konsumenten sind die schwächsten Feuer-Skills.
5. Der Hitze-Multiplikator (mit Verbrennung) trägt in starken Builds die Hälfte des Scores, im Zufalls-Build ein Viertel.

**Blitz — Ionisierung (Welt nur Blitz):**

| Build | Median | Crits je Lauf | Crit-Rate | volle Leisten je Lauf | Stiche je Leiste | Stapel je Lauf | Stapel je Karte (Ende) | Karten ionisiert | Stapel der Siegkarte Ø | Crit-Anteil am Score | Stapel-Anteil am Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fraktion (zufällig) | 2,33M | 336 | 40 % | 53 | 30 | 127 | 3,2 | 82 % | 1,0 | 48 % | 13 % (Ø 16 %) |
| Stapel zuerst | 2,67M | 276 | 32 % | 126 | 13 | 302 | 7,5 | 99 % | 2,5 | 37 % | 33 % (Ø 36 %) |
| Crit zuerst | 3,24M | 394 | 47 % | 88 | 18 | 114 | 2,8 | 90 % | 0,6 | 59 % | 10 % (Ø 11 %) |

„Stapel-Anteil" = Score-Verlust desselben Laufs mit Stapel-Score 0 (gepaart, gleicher Seed, gleiche Picks); „Crit-Anteil"
= critBonusScore ÷ Score.

Befund:

1. **Der Crit ist der Haupttreiber, nicht die Ionisierung.** Zehn Blitz-Skills geben +50 % Crit-Chance aus dem Passiv;
   die Crit-Rate liegt bei 40–47 %, und 48–59 % des Scores sind Crit-Bonus. Der Crit-Build schlägt den Stapel-Build
   (3,24M gegen 2,67M).
2. **Die Ionisierungsrate ist hoch, die Stapel zahlen wenig.** Alle 30 Stiche eine volle Leiste, 127 Stapel je Lauf,
   82 % der Karten ionisiert — aber gleichmäßig verteilt: die Siegkarte trägt im Schnitt 1,0 Stapel, und der Stapel-Score
   ist ein flacher Basisbetrag (60 je Stapel gegen 400 Basis je Sieg). Anteil am Score 13 %; selbst der reine
   Stapel-Build (7,5 je Karte, 126 Leisten) kommt auf 33 %.
3. Kettenblitz und Blitzschlag (7.6: tot) sind die Rate-Skills der Ionisierung — sie sind tot, weil die Stapel wenig
   zahlen, nicht weil sie wenig ionisieren.

**Vorschläge (Entscheid Owner, nichts umgesetzt):**

- **Feuer, Glut:** entweder auf den Kaltstart drehen (Glut = Hitze schon ab Vorsprung 1 oder Offset 0, gestuft) oder auf
  das Plateau (Glut hebt die Steigung des Passivs: +2,5/3/3,5/4 % Score je 10 % statt +2 % — dann ist es ein Multiplikator-
  Skill und kein Hitze-Skill). Streichen ist die dritte Option; Zunder deckt die Kaltstart-Rolle heute schon (263 Stiche).
- **Feuer, Kaltstart als Systemregel:** Starthitze mit dem ersten Feuer-Skill (z. B. 30 %) oder Vorsprung-Schwelle 3 → 2.
  Beides verkürzt die 13 Runden, ohne das Plateau zu heben.
- **Feuer, Überschuss:** 226 % Hitze je Runde gegen eine Leiste von 100/200 verpuffen. Ein Ventil für Hitze über der Leiste
  (Schmiedung aus dem Überschuss statt aus der Leiste, oder Basis-Score je verpufftem Punkt) gäbe den Rate-Skills eine
  Aufgabe — und wäre der Platz, an dem die Konsumenten wieder Sinn ergeben (nur den Überschuss verbrennen).
- **Blitz:** Wenn der Crit die Identität sein soll, ist alles in Ordnung — dann sind Stapel Beiwerk und Kettenblitz/
  Blitzschlag Streichkandidaten. Soll die Ionisierung tragen: Stapel-Score 60 → 100–120 (verdoppelt den Anteil im
  Zufalls-Build grob auf 25–30 %, gemessen wird das erst) oder Stapel wirken auf den Crit-Multiplikator der Siegkarte
  statt flach in die Basis — dann skalieren sie mit dem Motor, der ohnehin trägt.

### 7.9 Große Auswertung mit Türen (2026-09-05)

Derselbe Aufruf wie 7.6 (`--mode skills --explore 1000 --runs 150 --seed 1`), jetzt in der Türen-Welt. Gierig hält
Ø 9,8 Skills, Median 14,4M (flach: 16,4M — mit drei sichtbaren Skills je Phase statt sechs findet der gierige Spieler
seltener seinen Wunschskill), Erkundung 7,8M, 74 % der gierigen Läufe gewinnen ihre Ablation.

**Robust in beiden Läufen (flach und Türen):**

| Urteil | Feuer | Blitz |
| --- | --- | --- |
| stark | Sonnenkern (L, +106 % / +143 %), Glühende Klinge (+89 % / +128 %, in 73 % / 88 % der Läufe), Weißglut (+27 % / +56 %) | Ladungsserie (+105 % / +65 %, in 86 % / 83 %), Doppelentladung (L, +50 % / +43 %), Durchschlag (L, +25 % / +24 %) |
| schadet | Glut (−23 % / −22 %, win 23 % / 14 %), Glutbett (−3 % / −32 %), Feuersturm (−6 % / −3 %) | Spannungsstau (0 % / −7 %, win 55 % / 31 %) |
| tot | Glutstahl, Schmiede | Überspannung, Reststrom, Kurzschluss |
| selten gehalten (< 5 %) | Flächenbrand, Schmelzpunkt (0 % mit Türen), Rückzündung, Phönixfeuer | — |

**Gewandert (Rauschen oder Türen-Effekt):** Feuerwalze tot → +42 % (in 19 % der Läufe; mit Türen nimmt der gierige
Spieler sie, wenn Klinge/Weißglut nicht hinter der Tür liegen — die Wert-Boni tragen den Kern), Damaststahl −7 % → +18 %,
Serienschutz −24 % → −3 %, Blitzfänger −8 % → +1 %, Blitzschlag tot → +13 %, Gewitterfront +14 % → 0 (in 46 % gehalten,
ohne Wirkung), Statische Aufladung +5 % → −2 % (in 71 % gehalten), Zunder selten → schadet (−1 %, win 38 %), Kettenblitz
−54 % → −4 %, Überschlag +8 % → −12 %. Beide Blitz-Legendären ohne Crit-Bezug fallen ab: Donnergott tot, Hochspannung −4 %
(eine Stufe mehr auf allen Skills ist wenig wert, wenn die Stufen selbst wenig tragen, s. u.).

**Stufen:** weiter keine saubere Leiter. Klinge misst N 1,25 · S 1,27 · SS 1,26 · E 1,38 — der stärkste Feuer-Skill ist
über die Stufen praktisch flach; Ladungsserie N 1,39 · S 0,90 · SS 1,63 · E 1,90. Die Stufen entscheiden in der Sim
keinen Lauf, die Skills selbst tun es.

**Was sich daraus ergibt (Entscheid Owner):**

1. Die sechs Starken sind stabil, davon drei Legendäre (gewollt). Klinge und Ladungsserie sind in beiden Welten die
   Skills, die den Build tragen — mit den Türen noch mehr (88 % / 83 % Haltequote). Wer die Fraktionen breiter machen
   will, senkt eher diese beiden als dass er die Toten hebt.
2. Glut, Glutbett, Feuersturm, Spannungsstau schaden in beiden Läufen — das sind die vier, an die zuerst Hand gehört;
   für Glut liefert 7.8 die Erklärung (Leiste voll) und die Optionen.
3. Die Konsumenten (Flächenbrand, Schmelzpunkt) und Phönixfeuer nimmt der gierige Spieler auch mit Türen nicht;
   Rückzündung ebenso. Vorschlag 7.8 „Überschuss-Ventil" ist die Stelle, an der sie Sinn bekämen.
4. Blitz hat mit Kurzschluss, Überspannung, Reststrom, Gewitterfront, Statische Aufladung, Donnergott sechs Skills ohne
   Wirkung — die meisten hängen an Stapeln oder Ladung, die den Score nicht tragen (7.8). Die Entscheidung „Crit oder
   Ionisierung als Träger" aus 7.8 geht vor jedem Einzel-Tuning.
5. Die Stufen tragen nicht: entweder die Leitern spreizen (Episch deutlich über Normal, z. B. Klinge je 40/30/20/10 %
   statt 40/30/25/20) oder akzeptieren, dass die Stufe vor allem der Angebots-Reiz ist.

### 7.10 Hitze schneller verbrauchen (2026-09-05, umgesetzt)

Owner: der Pool auf exp bleibt Feuer und Blitz (bestätigt). Hitze muss etwas schneller verbraucht werden, damit die
Verstärker (Glut, Zunder, Feuersturm, Rückzündung) Sinn ergeben. Der Neuwurf würfelt die drei Skills der geöffneten Tür
neu, nicht die Türen (7.7 nachgezogen).

Werkzeug: `--mode motor --arch fire` (Feuer-Builds aus 7.8) und `--mode duel`, je über `SIM_HEAT_LOSS` /
`SIM_HEAT_MARGIN_OFFSET`. Kühlung je Niederlage (Passiv-Zahl, Sim-Startwert des Owners aus 4.2):

| Kühlung | Kern ohne Verstärker | Glut + Kern | Zunder + Kern | alle vier + Kern | Stiche ≥ 100 % (Kern) | Feuer mono (Fraktion) | Floor Feuer ÷ Blitz |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 (alt) | 10,06M | 9,82M (−2 %) | 9,77M (−3 %) | 6,06M (−40 %) | 62 % | 2,61M | 1,13× |
| 4 | 6,55M | 6,73M (+3 %) | 7,75M (+18 %) | 6,10M (−7 %) | 30 % | 2,04M | 0,88× |
| 6 | 5,08M | 5,72M (+13 %) | 6,56M (+29 %) | 5,86M (+15 %) | 24 % | 1,87M | 0,81× |
| 10 | 4,46M | 4,06M (−9 %) | 5,03M (+13 %) | 5,47M (+23 %) | 18 % | 1,70M | 0,73× |
| **6, Offset 1** | 6,12M | 6,71M (+10 %) | 7,54M (+23 %) | 5,87M (−4 %) | 30 % | 2,32M | **1,00×** |

Motor-Sweeps 60 Läufe (Seeds 1–60), Duelle 100 Läufe; Blitz mono 2,32M in allen Zeilen.

**Entscheid (technische Regler, Agent): Kühlung 2 → 6 je Niederlage, Vorsprung-Offset 2 → 1.** Ab Kühlung 6 zahlt ein
einzelner Verstärker klar (Glut +10 %, Zunder +23 %); bei 4 bleibt Glut flach, bei 10 fällt Glut wieder (der
Multiplikator auf eine Basis, die die Kühlung abträgt). Kühlung allein zieht den zufälligen Feuer-Build unter Blitz
(0,81×); der Offset 1 gibt jedem Vorsprung-Sieg einen Hitzepunkt mehr und stellt den Floor auf 1,00× (Mean 0,97×,
p90 0,92×) — ohne die Verstärker zu entwerten (Zunder +23 %, Glut +10 %). Verworfen: ein steilerer Multiplikator
(2,5 % / 3 % je 10 %: Floor 0,83× / 0,85×, bewegt den Zufalls-Build kaum und bräuchte eine Nachkommastelle in den
Texten), Kühlung 8 mit Offset 1 (0,92×). Alle vier Verstärker zusammen lohnen weiter nicht — vier Kern-Plätze kosten
mehr als 60 % Stiche ≥ 100 % bringen; das ist gewollt: ein Verstärker, nicht vier.

Neuer Kaltstart: die erste volle Leiste kommt im Kern-Build erst nach ~29 Runden (Median der Läufe, die sie erreichen),
mit Zunder nach ~23, mit allen vier nach ~12. Die Hitze lebt jetzt in der Mitte der Leiste (Ø 50–90 %), der volle
Multiplikator ist ein Ziel, kein Zustand. Texte (Passiv im Angebot, Glossar) interpolieren die Konstanten; der
Sim-Band-Wächter wird auf die neue Welt zentriert.

### 7.11 Große Runde mit Random-Picks (2026-09-05, nach 7.10)

Owner: „nicht gierig, sondern random, um ein besseres Gefühl zu bekommen." `npm run sim -- --mode skills --policy
random --explore 1000 --runs 150 --seed 1`: der Zufallsspieler nimmt aus jeder Tür und jedem Angebot irgendetwas
(Aufstellung und Architekt greedy wie beim gierigen Spieler, damit nur die Picks anders sind). 1000 Läufe für die Lifts
(mit ÷ ohne, je Stufe), 150 frische Läufe plus je Skill der Zufallsspieler, der diesen Skill nie nimmt. Achtung: die
Ablation ist beim Zufallsspieler nur lose gepaart (seine übrigen Züge verschieben sich), fast alles landet dort bei
„tot" — die **Lift-Spalte** ist hier das Signal, nicht das Median-Δ.

Zufallsspieler: Median 2,08M (gierig 14,4M — das Siebenfache), Siegquote 57 %, Ø 10 Skills, Legendäre selten (3–7 %).

**Feuer, Lift (mit ÷ ohne):** Sonnenkern 3,68 (L) · Klinge 1,27 · Sonnenzorn 1,26 (L) · Weißglut 1,11 · Lauffeuer 1,09
· Damaststahl 1,09 (L) · Rückzündung 1,08 · Feuerwalze 1,07 · Phönixfeuer 1,07 (L) · Glutstahl 1,03 · Verbrennung 1,01 ·
Zunder 1,00 · Feuersturm 0,99 · Brandmal 0,98 · Glut 0,97 · Glutbett 0,96 · **Schmiede 0,91 · Schmelzpunkt 0,76 ·
Flächenbrand 0,75.**

**Blitz, Lift:** Durchschlag 1,47 (L) · Ladungsserie 1,16 · Hochspannung 1,04 (L) · Überschlag 1,02 · Spannungsstau 1,01
· Doppelentladung 1,01 (L) · Blitzschlag 1,00 · Reststrom 0,99 · Serienschutz 0,98 · Kurzschluss 0,97 · Statische
Aufladung 0,96 · Blitzfänger 0,95 · Dauerstrom 0,94 · Überspannung 0,93 · Kettenblitz 0,93 · Entladung 0,91 ·
Blitzableiter 0,89 · Gewitterfront 0,89 · Donnergott 0,80 (L, n ≈ 70).

Das Gefühl, das sich daraus ergibt:

1. **Für den Zufallsspieler sind die drei Hitze-Verbraucher die Falle.** Flächenbrand und Schmelzpunkt kosten ein Viertel
   des Laufs, die Schmiede ein Zehntel — sie verbrennen die Hitze, die Klinge und Multiplikator brauchen, und zahlen
   dafür flach zu wenig. Das ist in allen drei Auswertungen (gierig flach, gierig Türen, random) dasselbe Bild.
2. **Die Verstärker sind für sich neutral (0,97–1,08).** Sie zahlen nur, wo der Build Hitze in Score wandelt (7.10:
   im Kern-Build +10 % Glut, +23 % Zunder). Das ist die Feuer-Logik nach 7.10: Verstärker × Klinge/Weißglut, nicht
   Verstärker allein. Glut bleibt der schwächste der vier.
3. **Blitz ist flach.** Ohne Sonnenkern-Ausreißer liegen 15 von 19 Blitz-Skills zwischen 0,9 und 1,05 — das Passiv
   (+5 % Crit je Skill) trägt, der Skill selbst ist beinahe egal. Nur Durchschlag (1,47) und Ladungsserie (1,16) stechen
   heraus; Entladung, Blitzableiter, Gewitterfront und Donnergott liegen unter 1 (Rampen, die viele volle Leisten
   brauchen — der Zufallsspieler füllt zu wenige).
4. **Die Stufen zeigen beim Zufallsspieler mehr Spreizung als beim gierigen** (Klinge SS 2,55, Lauffeuer E 2,28,
   Statische Aufladung E 2,04), weil im Zufalls-Build ein einzelner starker Skill den Lauf trägt. Die Zahlen je Stufe
   bleiben aber dünn (n 30–120 je Stufe).

Nächster Schritt aus Sicht der Sim: die gierige Auswertung mit den 7.10-Konstanten wiederholen, sobald der Owner über
Konsumenten, Glut und Blitz-Träger (7.8/7.9) entschieden hat — vorher misst sie nur den heutigen Stand noch einmal.

### 7.12 Glut als Kaltstart, Stapel auf den Crit-Multiplikator (2026-09-06, umgesetzt)

Owner-Entscheid auf die Empfehlungen aus 7.11: Punkt 2 (Glut) und 3 (Blitz) umsetzen, Stufen (4) und die übrigen
Toten (5) warten. Die Verbraucher (Punkt 1) sind offen — der Owner will keine weitere Leiste; Vorschläge dazu am Ende.

**Glut (Kaltstart):** solange die Hitze vor dem Sieg unter 40 / 50 / 60 / 80 % steht, zählt die ganze Hitze aus dem Sieg
×2 — alle Quellen (Passiv, Zunder, Feuersturm, Rückzündung), kein Effekt über der Schwelle. Kein Episch-Extra über die
Schwelle 80 hinaus (Regel aus 4.2 „Schwellen-Leitern brauchen ein Episch-Extra" — offen, Vorschlag: „unter der Schwelle
kühlen Niederlagen nur halb"; nicht umgesetzt, Owner-Entscheid).

**Blitz:** jeder wirksame Stapel auf der Siegkarte gibt +0,1× Crit-Multiplikator auf diesen Stich (Kurzschluss zählt die
Stapel ab seiner Schwelle doppelt, wie beim Stapel-Score); Stapel-Score 60 in der Basis bleibt; Crit je Blitz-Skill 5 →
4 %. Beides `SIM_`-Regler (`ION_CRIT_MULT_PER_STACK`, `LIGHTNING_CRIT_PER_SKILL`).

**Messung (100 Läufe, Seeds 1–100):**

| Feuer-Build (Motor) | vorher (7.10) | jetzt | erste 100 % nach |
| --- | --- | --- | --- |
| Kern ohne Verstärker | 6,12M | 6,27M | 1100 Stiche |
| Glut + Kern | 6,71M (+10 %) | **9,37M (+49 %)** | 609 Stiche |
| Zunder + Kern | 7,54M (+23 %) | 8,28M (+32 %) | 737 Stiche |
| alle vier + Kern | 5,87M (−4 %) | 5,86M (−7 %) | 441 Stiche |
| Fraktion (zufällig) | 2,32M | 2,42M | 548 Stiche |

Glut ist damit der stärkste einzelne Verstärker und halbiert den Kaltstart des Kern-Builds (1100 → 609 Stiche); über der
Schwelle tut er nichts, was ihn vom Plateau fernhält.

| Blitz-Build (Motor) | vorher | jetzt | Crit-Rate | Crit-Anteil |
| --- | --- | --- | --- | --- |
| Fraktion (zufällig) | 2,33M | 2,21M | 40 % → 35 % | 48 % → 47 % |
| Stapel zuerst | 2,67M | 2,76M | 32 % → 26 % | 37 % → 43 % |
| Crit zuerst | 3,24M | 2,91M | 47 % → 41 % | 59 % → 57 % |

Der Stapel-Build holt auf (2,76M gegen 2,91M Crit-Build; vorher 2,67M gegen 3,24M). Stapel-Anteil am Score, jetzt mit
beiden Stapel-Wirkungen ablatiert (Basis-Score und Crit-Multiplikator auf 0, gepaart): Fraktion 16 % (vorher 13 %),
Stapel-Build 39 % (vorher 33 %), Crit-Build 12 %. Die Ionisierung trägt mehr, im Zufalls-Build bleibt der Crit aus dem
Passiv (47 % Crit-Anteil) aber der größere Posten. Ein Sweep der zwei Regler (0,15× / 4 % und 0,2× / 3 %) steht unten.

**Duell (100 Läufe, 0,1× / 4 %):** Feuer mono 2,36M, Blitz mono 2,34M — Floor 1,01×, Mean 0,97×, p90 0,95×. Split 2,32M,
Mix 1,45M.

**Sweep der zwei Regler (100 Läufe je Zeile):**

| Crit-Mult je Stapel / Crit je Skill | Blitz mono | Floor Feuer ÷ Blitz | Stapel-Build | Crit-Build | Stapel-Anteil Fraktion / Stapel-Build |
| --- | --- | --- | --- | --- | --- |
| 0,1× / 4 % | 2,34M | 1,01× | 2,76M | 2,91M | 16 % / 39 % |
| **0,15× / 4 %** | 2,42M | 0,98× | **2,97M** | 2,95M | 18 % / 43 % |
| 0,2× / 3 % | 2,12M | 1,11× | 2,53M | 2,65M | 15 % / 37 % |

**Entscheid (technischer Regler, Agent): 0,15× je Stapel, 4 % je Skill.** Erst dort steht der Stapel-Build auf Augenhöhe
mit dem Crit-Build (2,97M gegen 2,95M), der Floor bleibt bei Parität (0,98×). 3 % je Skill kippt: weniger Crits füllen
weniger Leisten, die Ionisierung sinkt mit — der Crit ist der Motor der Leiste, nicht ihr Konkurrent. Der Stapel-Anteil
im Zufalls-Build bleibt bei 18 % gegen 49 % Crit-Anteil; „Ionisierung trägt" gilt im Stapel-Build (43 %), nicht im
zufälligen — wer mehr will, hebt den Stapel-Score 60 mit, das kostet dann die Parität.

**Auswertungen mit dem Endstand (Kühlung 6, Offset 1, Glut-Kaltstart, 0,15× je Stapel, 4 % je Skill):**

*Gierig* (`--mode skills`, 1000 Explore, 150 Läufe): Median 13,0M (Türen vor 7.10: 14,4M — Kühlung und Crit-Kürzung
senken die Decke), Siegquote 70 %, Ø 9,8 Skills.

- Stark, wie in allen Läufen: Sonnenkern (+85 %), Klinge (+112 %, in 85 %), Weißglut (+23 %), Ladungsserie (+91 %, in 84 %),
  Doppelentladung (+70 %). Neu dazu: **Phönixfeuer** (+27 %, in 12 % — mit Kühlung 6 ist „Niederlagen heizen" etwas
  wert), Verbrennung (+16 %), **Kurzschluss** (+21 %; die doppelten Stapel zählen jetzt zweimal), Blitzableiter (+43 %),
  Entladung (+22 %), Überschlag (+16 %).
- **Glut im gierigen Lauf: neutral** (in 13 % gehalten, −3 %, win 42 %). Das widerspricht dem Motor nicht: dort schlägt
  Glut + Kern den Kern OHNE jeden Verstärker um 49 %; die Ablation misst Glut gegen die nächstbeste Alternative des
  gierigen Spielers, und die ist so gut wie Glut. Lift je Stufe N 0,83 · S 0,77 · SS 0,72 · E 1,03 — die Schwelle 40 %
  (Normal, 62 % der Würfe) ist zu früh erreicht, um viel zu verdoppeln; erst Episch (80 %) trägt.
- Schadet: Feuersturm (−10 %, in 48 % gehalten — der gierige Spieler nimmt ihn und verliert damit), Sonnenzorn (−19 %),
  Glutstahl (−8 %), Rückzündung (−27 %, selten), die Konsumenten (Flächenbrand −17 %, Schmelzpunkt −54 %, beide fast nie
  genommen); Blitz: Überspannung (−27 %), Statische Aufladung (−11 %), Blitzfänger (−5 %).
- Tot: Feuerwalze, Zunder, Kettenblitz (in 47 % gehalten, ohne Wirkung — mehr ionisierte Karten heben die Stapel der
  Siegkarte kaum), Reststrom, Spannungsstau (60 %), Dauerstrom, Serienschutz, Donnergott, Durchschlag (0 % — mit 4 % Crit
  je Skill critten Niederlagen seltener).

*Random* (`--policy random`): Median 2,00M, dasselbe Bild wie 7.11 — Verbraucher 0,75 / 0,79 / 0,91, Verstärker 0,97–1,10,
Blitz flach (Durchschlag 1,30, Ladungsserie 1,19, Donnergott 0,73). Der Zufallsspieler baut keine Synergie, deshalb
bewegen ihn die Änderungen an Glut und Stapeln nicht.

**Stand nach 7.12, für den Owner:** Die Ionisierung trägt jetzt im Stapel-Build (43 %) und Kurzschluss zahlt; Kettenblitz,
Blitzfänger, Überspannung, Reststrom bleiben ohne Wirkung — die Stapel liegen weiter breit statt tief. Glut hat eine
Rolle, aber nur die Episch-Schwelle trägt sie sichtbar; Vorschlag: Schwellen 50/60/70/90 statt 40/50/60/80. Die Verbraucher
sind die letzte offene Feuer-Baustelle (Punkt 1).

### 7.13 Verbraucher zünden bei voller Leiste (2026-09-06, umgesetzt)

Owner-Entscheid zu Punkt 1 (7.11/7.12): keine weitere Leiste — **die volle Hitzeleiste ist der Auslöser.** Flächenbrand
brennt den nächsten Sieg bis 40 (Episch bis 0) nur bei voller Leiste, Schmelzpunkt verbrennt 4 % je Sieg nur bei voller
Leiste, die Schmiede schmiedet am Rundenende nur bei voller Leiste (mit Weißglut heißt voll 200). Darunter rühren die
drei die Hitze nicht an, sie bleibt dem Passiv und der Klinge. Flächenbrands Schwelle „ab 80 %" entfällt (Stufentabelle
ohne `minHeat`); Stufentexte, Glossar (Konsument) und Hitzeleiste (Flächenbrand-Bereitschaft und Schmiede-Abzeichen
leuchten bei voller Leiste) folgen. Reihenfolge im Sieg unverändert: Hitzegewinn → Tor „voll" auf der Hitze nach dem
Gewinn → Schmelzpunkt → Flächenbrand → Phönix-Neuzündung.

**Messung (100 Läufe, Seeds 1–100, Duell und Motor Feuer):**

| | vorher (7.12) | jetzt |
| --- | --- | --- |
| Feuer mono (Duell, Median) | 2,36M | **2,86M (+21 %)** |
| Blitz mono | 2,34M | 2,42M |
| Floor Feuer ÷ Blitz | 1,01× | **1,18×** (Mean 1,19×, p90 1,17×) |
| Split / Mix | 2,32M / 1,45M | 2,65M / 1,50M |
| Motor: Fraktion (zufällig) | 2,42M | 2,97M (+23 %) |
| Ø Hitze / Stiche ≥ 100 % / Mult-Anteil | 52 % / 15 % / 22 % | 71 % / 26 % / 29 % |
| Motor: Kern ohne Verstärker | 6,27M | 6,73M (+7 %) |
| Glut + Kern / Zunder + Kern / alle vier | 9,37M / 8,28M / 5,86M | unverändert (die Kern-Builds halten keinen Konsumenten) |

Der Zufalls-Feuerbuild legt ein Fünftel zu, weil Schmelzpunkt und Schmiede die Hitze nicht mehr früh abtragen: die
Hitze liegt im Schnitt bei 71 statt 52 %, der Multiplikator trägt 29 statt 22 % des Scores. Das kostet die Parität aus
7.10/7.12: Feuer mono steht 18 % über Blitz mono.

**Auswertungen (1000 Explore, 150 Läufe, Seeds 1..):**

*Gierig:* Median 13,5M (7.12: 13,0M), Siegquote 70 %, Ø 8,8 Skills. Die Konsumenten nimmt der gierige Spieler weiter
nicht (Flächenbrand 1 %, Schmelzpunkt 7 %, Schmiede 1 % gehalten), und wo er sie hat, kosten sie: Lift 0,60 / 0,85 /
0,73. Das übrige Bild wie 7.12 — stark Sonnenkern (2,06), Damaststahl (1,26), Klinge (1,20, in 78 %), Ladungsserie
(1,33), Doppelentladung (1,42), Durchschlag (1,24); tot Feuersturm, Feuerwalze, Glut, Zunder, Kettenblitz, Reststrom,
Dauerstrom, Entladung; schadet Blitzfänger, Spannungsstau, Gewitterfront, Blitzableiter, Sonnenzorn. Kurzschluss kippt
von +21 % (7.12) auf „schadet" — in 7 % gehalten, die Ablation ist dort dünn; beobachten.

*Random:* Median 2,15M (7.12: 2,00M), Lift-Läufe 2,28M. **Die drei Verbraucher bleiben die Falle, nur etwas milder:
Flächenbrand 0,77 (vorher 0,75), Schmelzpunkt 0,83 (0,76), Schmiede 0,93 (0,91).** Klinge 1,33, Weißglut 1,16,
Lauffeuer 1,12, Rückzündung 1,09, Brandmal 1,08; Blitz flach wie gehabt (Durchschlag 1,42, Ladungsserie 1,19, der Rest
0,87–1,01).

**Warum die Verbraucher trotzdem schaden — drei Messungen, alle mit dem 7.13-Stand:**

*Auszahlung hochdrehen hilft nicht* (Random-Lifts, 1000 Läufe, Seeds 1–1000, nur die Stufentabellen skaliert):

| Variante | Flächenbrand | Schmelzpunkt | Schmiede |
| --- | --- | --- | --- |
| heute (15 / 20 / 25 / 30 je Punkt) | 0,77 | 0,83 | 0,93 |
| Auszahlung ×2 | 0,81 | 0,84 | 0,93 |
| Auszahlung ×3 | 0,84 | 0,86 | 0,93 |
| Auszahlung ×2, Schmiede +5 statt +3 Wert | 0,81 | 0,84 | 0,95 |
| Flächenbrand brennt nur bis 70 statt 40 | 0,79 | 0,83 | 0,92 |

*Der Schaden sitzt oben* (dieselben 1000 Läufe, Lift mit ÷ ohne als Mittelwert wie in der Auswertung und als Median):
Flächenbrand 0,70 im Mittel, 0,85 im Median; Schmelzpunkt 0,76 / 0,88; Schmiede 0,90 / 0,96. Das p90 der Läufe mit
Flächenbrand liegt bei 4,1M, ohne bei 6,1M. Auch ohne Klinge und ohne Weißglut im Build: 0,71 / 0,87 und 0,83 / 0,87 —
die Weißglut-Leiste (voll = 200, der Brand nimmt 160) verschärft es, ist aber nicht die Ursache.

*Gepaart im Kern-Build* (feste Builds, Welt nur Feuer, Seeds 1–100, „Konsument zuerst + Kern" gegen „Kern ohne
Konsumenten", Kern = Klinge, Weißglut, Verbrennung, Brandmal, Lauffeuer, Glutstahl, Feuerwalze, Glutbett):

| Build | Median | Ø Hitze | Siegquote | typ. ÷ Kern | besser in |
| --- | --- | --- | --- | --- | --- |
| Kern ohne Konsumenten | 7,94M | 73 | 66,4 % | — | — |
| Schmelzpunkt + Kern | 6,42M | 60 | 63,4 % | ×0,82 | 37 % der Seeds |
| Flächenbrand + Kern | 3,19M | 34 | 61,2 % | **×0,45** | 6 % |
| Schmiede + Kern | 5,60M | 57 | 62,8 % | ×0,80 | 19 % |
| Kern ohne Weißglut | 5,23M | 49 | 69,5 % | — | — |
| Flächenbrand + Kern ohne Weißglut | 2,32M | 28 | 60,6 % | ×0,46 | 6 % |

**Lesart.** Der Auslöser „volle Leiste" nimmt den Verbrauchern den frühen Schaden (bis zur vollen Leiste bleibt die Hitze
dem Passiv), nicht den späten, und der späte ist der große: verbrannte Hitze ist bei Feuer Kartenwert (Klinge) und
Multiplikator, also Siegquote, also Serie — Flächenbrand + Kern verliert fünf Punkte Siegquote und damit die Serien, die
den Score tragen. Der Ertrag (Basis-Score je Punkt, +3 Wert) hängt nicht an der Serie und kann das nicht aufwiegen: die
dreifache Auszahlung hebt Flächenbrand von 0,77 auf 0,84. Ein „halten gegen verbrennen" gibt es damit nicht — halten
gewinnt immer, weil die Leiste beim Halten weiterzahlt und beim Verbrennen einmal.

**Vorschläge dazu (Owner-Entscheid, Design; nichts umgesetzt):**

1. **Verbraucher als Überlauf-Wandler statt Brenner.** Bei voller Leiste verbrennen sie nichts, sondern wandeln, was über
   die Leiste hinausginge: Schmelzpunkt — der Hitze-Überschuss jedes Siegs wird Basis-Score je Punkt; Schmiede — am
   Rundenende bei voller Leiste ohne Preis eine Schmiedung; Flächenbrand — bei voller Leiste zählt der nächste Sieg
   ×1,5 (die Leiste bleibt). Kein Verlust, klein und einfach, konkurriert nicht mit Klinge. Größenordnung aus dem
   Motor: der Kern-Build verschenkt rund 60 Hitze je Runde am Anschlag, bei 15–30 je Punkt sind das +2–4 % Score.
2. **Oder streichen und die drei Plätze neu belegen** — die Fraktion hat mit Klinge, Weißglut, Verbrennung, Brandmal,
   Lauffeuer und den vier Verstärkern genug Träger; drei Skills, die der gierige Spieler nie und der Zufallsspieler zu
   seinem Schaden nimmt, sind schlechter als drei weniger.

**Paritäts-Sweep (Duell, 100 Läufe je Zeile; gemessen, nichts umgesetzt):**

| Regler | Blitz mono | Floor Feuer ÷ Blitz | Mean | p90 |
| --- | --- | --- | --- | --- |
| heute (Stapel-Score 60, 4 % je Skill, 0,15× je Stapel) | 2,42M | 1,18× | 1,19× | 1,17× |
| Hitze-Mult 0,015 statt 0,02 je 10 % (Feuer mono 2,77M) | 2,42M | 1,15× | 1,16× | 1,14× |
| Stapel-Score 90 | 2,57M | 1,11× | 1,08× | 1,10× |
| Crit je Skill 5 % | 2,55M | 1,12× | 1,04× | 1,01× |
| 0,2× je Stapel | 2,48M | 1,15× | 1,15× | 1,15× |
| Stapel-Score 90 + Crit 5 % | 2,70M | 1,06× | 0,93× | 0,91× |
| **Stapel-Score 120** | 2,70M | **1,06×** | **0,99×** | **0,98×** |

Der Hitze-Multiplikator ist kein Hebel (29 % des Feuer-Scores; ein Viertel weniger bringt drei Punkte). Ein einziger
Regler holt die Parität zurück: Stapel-Score 60 → 120 — alle drei Maße nahe 1, und die Richtung stimmt mit „die
Ionisierung soll tragen" überein. Das ist Balancing, also Owner-Entscheid; nicht umgesetzt.

### 7.14 Schmiede ohne Preis, 50 Runden, Parität (2026-09-06, umgesetzt)

Owner-Entscheide auf 7.13: **die Schmiede schmiedet ohne Preis und braucht nur eine Schwelle**; **50 Runden, die
Reihenfolge der Phasen bleibt gleich**; **Parität** herstellen; ab jetzt **nur gierig messen**. Flächenbrand und
Schmelzpunkt bleiben, wie sie in 7.13 stehen (offen, siehe 7.15).

**Schmiede.** Rundenende ab 80 / 60 / 40 / 20 % Hitze: die niedrigste Karte erhält dauerhaft +3 Wert, Episch die zwei
niedrigsten; die Hitze bleibt liegen. Die Schwellenzahlen folgen den anderen Hitze-Schwellen der Fraktion (Feuerwalze,
Brandmal, Lauffeuer) und sind Vorschlag (Agent), der Preis-Wegfall ist gesetzt. Damaststahl (Legendär) schmiedet weiter
ohne Schwelle und zählt Schmiedewert im Kampf doppelt — die beiden unterscheiden sich jetzt nur noch dort. Die Schmiede
ist damit kein Konsument mehr (Glossar, Stichwort `consume` entfernt); Abzeichen an der Leiste: „Schmiede ab 80".

**50 Runden.** `MAX_CYCLES` 40 → 50; der Plan ist der Block Skill→Perk→Aufstellen→Architekt, wiederholt bis zur
Laufänge — 13 Skill-Phasen in den Runden 1, 5, 9 … 49, jede Aufstellphase vom Architekten gefangen, keine zwei Skill-
oder Architektphasen hintereinander. Der alte 40-Plan liegt unverändert vorne (Prefix); der Sim-Schwanzblock für
Sweeps über 40 hinaus ist entfallen, `buildSchedule(n)` ist für jede Länge derselbe Block. Der Score wächst überlinear
mit den Runden: Zufallsspieler (Sim-Band, Seeds 1–40) 1,04M → 2,34M Median, 1,23M → 4,45M Mean; das Band ist neu
zentriert.

**Parität (Duell, 100 Läufe, 50 Runden, Schmiede ohne Preis):**

| Stapel-Score | Feuer mono | Blitz mono | Floor | Mean | p90 |
| --- | --- | --- | --- | --- | --- |
| 60 (vorher) | 7,48M | 6,46M | 1,16× | 1,04× | 1,04× |
| **75** | 7,48M | 7,02M | **1,07×** | **0,95×** | **0,93×** |
| 80 | 7,48M | 7,22M | 1,03× | 0,92× | 0,90× |
| 90 | 7,48M | 7,59M | 0,99× | 0,87× | 0,84× |
| 120 (Vorschlag aus 7.13, bei 40 Runden) | 7,48M | 8,53M | 0,88× | 0,75× | 0,70× |

Bei 50 Runden zinst der Stapel-Score stärker auf als bei 40 (mehr Ionisierungen je Lauf, mehr Stapel je Siegkarte): 120
kippt jetzt zu Blitz. **Entscheid (Regler, Agent): Stapel-Score 60 → 75** — Floor 1,07×, Mean 0,95×, p90 0,93×, die
kleinste Summe der Abweichungen über die drei Maße (90 trifft nur den Floor, der Schwanz gehört dann Blitz). Feuer mono
gegen Blitz mono ist damit im Band von 7.10/7.12.

**Motor Feuer bei 50 Runden** (100 Läufe): Fraktion (zufällig) 8,0M, Kern ohne Verstärker 13,2M, Glut + Kern 15,6M
(+17 %), Zunder + Kern 14,3M (+8 %), alle vier + Kern 13,1M (−1 %). Mit der Schmiede ohne Preis liegt die Hitze im
Zufallsbuild bei 78 % (7.13: 71 %), der Multiplikator trägt 37 % des Scores. Die Verstärker zahlen weniger als bei 40
Runden (Glut +49 % → +17 %): der Kaltstart wiegt bei längerem Lauf weniger.

### 7.15 Legendäre zur Laufmitte, gierige Auswertung, was offen ist (2026-09-06)

**Legendäre im Vergleich** (`--mode legendaries`, neu): der gierige Spieler (Wertetabelle aus 600 Explore-Läufen) spielt
150 Seeds einmal ohne Eingriff und einmal so, dass ihm in der 7. von 13 Skill-Phasen (Runde 25) das Legendäre hinter
Tür 1 liegt und er es nimmt — anstelle des normalen Picks, den er dort sonst getan hätte. Gepaart je Seed. Das misst
also „Legendäres statt eines guten normalen Skills zur Laufmitte", nicht „Legendäres geschenkt". Basis: Median 54,5M.

| Legendär | Median-Δ | typ. | besser in | Lesart |
| --- | --- | --- | --- | --- |
| Doppelentladung (Bl) | +49,6M | **+106 %** | 78 % | zwei Stapel je Ionisierung und der doppelte Stich: der Stapel-Build verdoppelt sich |
| Sonnenkern (Fe) | +47,0M | **+133 %** | 78 % | stapelnde Brände, in jeder Auswertung der stärkste Feuer-Skill |
| Durchschlag (Bl) | +9,4M | +25 % | 58 % | Niederlagen critten — mit 4 % Crit je Skill seltener als früher (7.12: tot im gierigen Lauf) |
| Hochspannung (Bl) | +5,8M | +17 % | 54 % | eine Stufe höher für alle Blitz-Skills; zur Mitte hält der Build höchstens sechs Skills, nur ein Teil davon Blitz |
| Damaststahl (Fe) | +2,8M | +3 % | 51 % | freie Schmiedung + doppelter Schmiedewert; neben der Schmiede ohne Preis (7.14) fast dasselbe |
| Donnergott (Bl) | +0,7M | +6 % | 52 % | Leiste bei 7, +0,4× Crit-Mult — so viel wie ein normaler Pick |
| Phönixfeuer (Fe) | −3,7M | −17 % | 43 % | Niederlagen heizen, Neuzündung: im Halte-Build zur Mitte ist die Leiste schon voll |
| Sonnenzorn (Fe) | −6,3M | −17 % | 44 % | Spitzen-Hitze ×0,04 je 10 %: auf voller Leiste nur +0,2 auf einen Multiplikator von 1,5–2,2 |

Drei Klassen: zwei Träger (Doppelentladung, Sonnenkern — verdoppeln den Lauf), zwei gute Picks (Durchschlag,
Hochspannung), vier, die zur Laufmitte einen normalen Pick nicht schlagen (Damaststahl, Donnergott, Phönixfeuer,
Sonnenzorn). Mit 3,5 % je Platz sieht ein Lauf im Schnitt 1,4 Legendäre; wer Doppelentladung oder Sonnenkern zieht,
spielt einen anderen Lauf als wer Sonnenzorn zieht — das ist die Spreizung, die der Owner sehen wollte. Vorschlag
(Owner-Entscheid): die vier Schwachen anheben, nicht die zwei Starken kappen — Sonnenzorn liest die Spitze auch über
100 (mit Weißglut bis 200: ×0,04 je 10 %), Phönixfeuer zündet auf 80 statt 50 neu, Donnergott Leiste 6 statt 7,
Damaststahl schmiedet die zwei niedrigsten. Nichts davon umgesetzt.

**Gierige Auswertung mit dem Endstand 7.14** (`--mode skills`, 1000 Explore, 150 Läufe; ab jetzt nur noch gierig):
Median 48,6M (40 Runden, 7.13: 13,5M — der Score wächst mit den Runden überlinear), Siegquote 74 %, Ø 11,7 Skills.

- Stark: Sonnenkern (+115 %, in 31 %), Ladungsserie (+87 %, in 90 %), Doppelentladung (+50 %, in 31 %), Klinge (+51 %,
  in 70 %), **Reststrom (+33 %** — zum ersten Mal nicht tot: bei 13 Skill-Phasen und mehr Leisten je Lauf zählt der
  Ladungs-Boden), Weißglut (+20 %, in 68 %), Feuerwalze (+21 %), Glutstahl (+21 %, selten), Verbrennung (+10 %).
- **Schmiede ohne Preis: der gierige Spieler nimmt sie jetzt (49 % statt 1 %), sie ist aber neutral** (−2 %, win 43 %):
  +3 Wert je Runde auf die niedrigste Karte reicht im Halte-Build nicht für einen Ausschlag, schadet aber auch nicht
  mehr. Damaststahl (in 32 %) ebenso neutral — beide schmieden dasselbe.
- Bleiben die Falle: Flächenbrand (1 %, −67 %), Schmelzpunkt (11 %, −27 %). Schadet: Zunder (−22 %, in 6 %),
  Feuersturm (win 40 %), Phönixfeuer (−3 %, win 30 %), Serienschutz (−4 %).
- Tot (in ≥ 40 % gehalten, ohne Wirkung): Blitzableiter (81 %), Kettenblitz (67 %), Entladung (63 %), Statische
  Aufladung (59 %), Blitzfänger (47 %), Blitzschlag (44 %), Schmiede (49 %) — der Blitz-Build hängt an Ladungsserie,
  Doppelentladung und Reststrom, die übrigen Blitz-Skills füllt der Spieler, weil die Tür sie zeigt.
- Sonnenzorn und Donnergott nimmt der gierige Spieler nie (0 %), Phönixfeuer selten (7 %) — dasselbe Bild wie der
  Legendären-Vergleich oben.

**Was offen ist (Stand 7.15, alles Owner-Entscheid; Vorschläge des Agenten dahinter):**

1. **Flächenbrand und Schmelzpunkt** (7.13): verbrannte Hitze kostet Klinge, Siegquote und Serie, keine Auszahlung
   heilt das. Vorschlag: Überlauf-Wandler (bei voller Leiste wird der Überschuss eines Siegs zu Basis-Score, Flächenbrand
   macht den nächsten Sieg ×1,5, nichts wird verbrannt) — oder beide streichen und die Plätze neu belegen.
2. **Glut** (7.12): nur die Episch-Schwelle (80 %) trägt sichtbar. Vorschlag: Schwellen 50 / 60 / 70 / 90 statt 40 / 50 /
   60 / 80; Episch-Extra „unter der Schwelle kühlen Niederlagen nur halb".
3. **Feuersturm** schadet im gierigen Lauf (7.12/7.13: −10 %, in 33–48 % gehalten). Vorschlag: Hitze je Serienpunkt
   halbieren und dafür ab Serie 5 verdoppeln, damit er nicht die frühen, kleinen Serien belohnt, die die Leiste vor der
   Klinge füllen — oder als Verstärker streichen, es gibt vier.
4. **Tote Blitz-Skills** (7.9–7.13): Kettenblitz, Blitzfänger, Überspannung, Reststrom, Dauerstrom, Entladung — die
   Stapel liegen breit statt tief, Schwellen-Skills auf der Siegkarte greifen selten. Vorschlag: Kettenblitz ionisiert
   die ZULETZT ionisierte Karte noch einmal (Tiefe statt Breite), Blitzfänger-Schwelle 2 / 2 / 1 / 1, Überspannung ohne
   Schwelle (+Ladung je Crit mit ionisierter Karte), Reststrom und Dauerstrom zusammenlegen.
5. **Stufenleitern**: die Sim sieht die Stufen nicht (Lift je Stufe schwankt, „Leiter"-Flags bei jedem zweiten
   Skill). Gesetzt: warten, bis die Skills stehen (Owner, 7.12).
6. **Die vier schwachen Legendären** (oben): Sonnenzorn, Phönixfeuer, Donnergott, Damaststahl.
7. Aus 1: Fokus am Start, Episch-Quote und Pity, Bosse.

### 7.16 Schritt 1–3 Feuer: Überlauf-Wandler, Flächenbrand gestrichen, Glut, Zunder (2026-09-06, umgesetzt)

Owner-Entscheide auf die Liste in 7.15: Punkte 1, 2, 3 umsetzen; die Schmiede bleibt, wie sie in 7.14 steht; **keine
Fraktion fällt unter 14 Skills** — wo zusammengelegt wird, kommen neue Skills dazu; Schritt für Schritt.

- **Schmelzpunkt = Überlauf-Wandler.** Bei voller Leiste wird die Hitze, die ein Sieg nicht mehr auf die Leiste bringt,
  zu +15 / 20 / 25 / 30 Basis-Score je Punkt; die Leiste bleibt voll, verbrannt wird nichts. Episch-Extra: die Kühlung
  einer Niederlage bei voller Leiste ist vorgemerkt (`heat.meltPending`) und zahlt beim nächsten Sieg.
- **Flächenbrand gestrichen** (SK_FIRE_11; das Emblem liegt weiter als Master in `docs/art/skills/fire/`). Feuer hat 14
  normale Skills — die Untergrenze; Feuersturm (Punkt 3, streichen) wartet deshalb auf seinen Ersatz, siehe unten.
- **Glut** 50 / 60 / 70 / 90 statt 40 / 50 / 60 / 80; Episch-Extra: unter der Schwelle kühlen Niederlagen nur halb (3
  statt 6).
- **Zunder** 2 / 3 / 4 / 5 % je Sieg statt 1 / 2 / 3 / 4.

**Messung (100 Läufe, 50 Runden, Stapel-Score 75):** Feuer mono 7,48M → **30,1M**, Blitz mono 7,17M — Floor 4,20×,
Mean 3,21×, p90 3,74×. Motor: Fraktion (zufällig) 8,0M → 25,6M, Kern ohne Verstärker 13,2M → 16,5M, alle vier
Verstärker + Kern 13,1M → 11,9M.

**Ursache, gemessen im reinen Feuer-Build (Zufallsspieler, Welt nur Feuer):** Ausschluss-Ablation — ohne Schmelzpunkt
×0,31, ohne Feuersturm ×0,38, ohne Klinge ×0,41; jeder andere Skill ohne ×1,2–1,4 (der freie Pick geht dann eher an
die zwei Träger). Lifts mit ÷ ohne (Median): Schmelzpunkt 3,15, Klinge 3,36, Feuersturm 2,57 (Episch 8,27), Weißglut
1,60. **Feuersturm × Schmelzpunkt ist ein Runaway:** Feuersturm gibt je Serienpunkt Hitze (bei Serie 30 und Episch +60
je Sieg), bei voller Leiste wird das alles zu Score — 60 × 30 = 1800 Basis je Sieg auf 400 Grundbasis, mit allen
Multiplikatoren. Vor dem Wandler war Feuersturms Hitze über der Leiste wertlos, jetzt ist sie der Score-Motor.

Sweep des Wandler-Satzes (Duell, 100 Läufe): 3 / 4 / 5 / 6 → Feuer mono 13,6M (Floor 1,90×); 5 / 7 / 8 / 10 → 15,8M
(2,20×); 8 / 10 / 13 / 15 → 19,7M (2,75×); 15 / 20 / 25 / 30 → 30,1M (4,20×). Ohne Feuersturm (Ausschluss) 12,5M —
selbst ohne den Runaway steht Feuer mono rund 1,7× über Blitz mono: die beiden Fallen sind weg, und Blitz trägt
weiter elf tote Skills (7.15). **Die Parität ist damit keine Regler-Frage mehr, sondern die Reihenfolge:** Feuersturm
entscheiden, Blitz-Runde, dann Stapel-Score neu setzen. Der Wandler-Satz bleibt vorerst bei 15 / 20 / 25 / 30 (Owner-
Entscheid); nichts daran gedreht.

**Vorschlag Feuersturm (Owner-Entscheid):** nicht streichen, sondern in seinem Platz umbauen (SK_FIRE_03, das Emblem
bleibt, Feuer bleibt bei 14 ohne neues Bild): *Feuersturm — bei voller Hitzeleiste zählt jeder Serienpunkt
+0,5 / 0,75 / 1 / 1,5 % Score; Episch schon ab 80 % Hitze.* Serie zu Score statt Serie zu Hitze — keine Hitze mehr, die
in den Wandler läuft, die Serien-Identität bleibt. Alternativ streichen und einen neuen Skill mit neuem Emblem setzen.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median **125M** (7.15: 48,6M), Siegquote 77 %. Der gierige
Spieler baut den Runaway in fast jedem Lauf: Schmelzpunkt in 91 % (+141 % typisch), Klinge 95 % (+290 %), Weißglut
87 %, Feuersturm 65 % (+85 %; Episch-Lift 1,73). Blitz schrumpft auf Ladungsserie (88 %) und Doppelentladung als
Zubringer, alles andere von Blitz liegt bei „tot" oder „selten"; Zunder (77 % gehalten) und Phönixfeuer schaden. Die
Zahlen sind kein Stand, den man tarieren sollte — erst der Feuersturm-Entscheid, dann die Blitz-Runde, dann die
Parität.

### 7.17 Feuersturm: Serie zu Score (2026-09-06, umgesetzt)

Owner: ja zum Vorschlag aus 7.16 — Feuersturm bleibt in seinem Platz (SK_FIRE_03, Emblem bleibt, Feuer bei 14) und
wird umgebaut: **bei voller Hitzeleiste zählt jeder Serienpunkt +Satz Score, Episch schon ab 80 % Hitze; Hitze gibt er
keine mehr.** Technisch ein Faktor im Feuer-Score-Stack neben Hitze-Multiplikator und Verbrennung (`feuersturmMult`),
liest die Hitze nach dem Gewinn wie die anderen Hitze-Tore und die effektive Serie nach dem Sieg wie der Serien-Mult;
der Hitze-Motor (`--mode motor`) zählt ihn nicht mehr zu den Verstärkern.

**Der Satz ist der Regler — Sweep (Duell, 100 Läufe, 50 Runden):**

| je Serienpunkt (N / S / SS / E) | Feuer mono | Floor Feuer ÷ Blitz | Mean | p90 |
| --- | --- | --- | --- | --- |
| 0,5 / 0,75 / 1 / 1,5 % (Vorschlag 7.16) | 22,8M | 3,18× | 2,35× | 2,41× |
| 0,25 / 0,375 / 0,5 / 0,75 % | 17,3M | 2,41× | 1,58× | 1,48× |
| 0,125 / 0,19 / 0,25 / 0,375 % | 14,1M | 1,97× | 1,19× | 1,04× |
| **0,1 / 0,15 / 0,2 / 0,3 %** | **13,3M** | **1,86×** | **1,12×** | **0,96×** |
| 0,05 / 0,075 / 0,1 / 0,15 % | 11,7M | 1,63× | 0,96× | 0,83× |

Mit dem vorgeschlagenen Satz war Feuersturm der nächste Motor (Lift 2,10 im Feuer-Build, Episch 6,86; der Kern-Build
51,9M statt 16,5M): ein Faktor je Serienpunkt ohne Deckel auf einem Build, dessen Serien in die Hunderte gehen, ist
selbst bei 0,5 % zu viel. **Entscheid (Regler, Agent): 0,1 / 0,15 / 0,2 / 0,3 %.** Ohne Feuersturm läge Feuer mono bei
rund 12,5M (Ausschluss, 7.16); mit ihm 13,3M — ein Skill, der zahlt, ohne den Lauf zu tragen. Lifts im Feuer-Build
(Zufallsspieler, Welt nur Feuer, 400 Läufe, Median): Sonnenkern 2,78 · Klinge 2,02 · Weißglut 1,49 · Glutstahl 1,12 ·
**Feuersturm 1,10 (Episch 2,06)** · Feuerwalze 1,08 · Schmelzpunkt 0,96 (ohne die Serienhitze wandelt er nur den
Passiv-Überschuss, neutral) · Brandmal 0,95 · Verbrennung 0,92 · Glut 0,91 · Schmiede 0,90 · Zunder 0,79 · Glutbett 0,73.
Motor: Kern (jetzt mit Feuersturm) 23,2M, Fraktion 13,1M.

Offen daran: das Episch-Extra „ab 80 %" ist ein weites Tor — Episch 2,06 gegen Normal 1,07, weil 80 fast immer anliegt,
die volle Leiste (mit Weißglut 200) selten. Vorschlag: Episch ab 90 % statt 80 %, oder so lassen (Episch darf sehr
stark sein). Owner-Entscheid.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median 71,5M (7.15: 48,6M; der Runaway in 7.16: 125M),
Siegquote 73 %, Ø 12,5 Skills. Feuersturm ist ein normaler Pick (in 24 %, +6 %; Episch-Lift 1,65), Schmelzpunkt
ebenso (17 %, +12 %). Träger: Ladungsserie (91 %, +138 %), Sonnenkern (29 %, +100 %), Doppelentladung (30 %, +89 %),
Klinge (75 %, +32 %), neu Donnergott (12 %, +116 %) und Damaststahl (19 %, +27 %). Tot: Entladung, Dauerstrom, Brandmal,
Statische Aufladung, Reststrom, Lauffeuer, Blitzschlag, Feuerwalze; schadet: Spannungsstau, Überschlag, Überspannung,
Zunder, Glut, Glutstahl, Glutbett, Rückzündung, Schmiede, Serienschutz. Die Feuer-Verstärker (Glut, Zunder,
Rückzündung) und Glutbett kosten den gierigen Spieler weiter — mit 50 Runden ist der Kaltstart kurz, danach tun sie
nichts.

**Parität, Stand danach:** Floor 1,86×, Mean 1,12×, p90 0,96× — der Median ist Feuers, der Schwanz gehört Blitz. Wie in
7.16 festgehalten: erst die Blitz-Runde, dann der Stapel-Score.

**Blitz-Plan, Vorschlag für den Owner (mindestens 14 je Fraktion; nur mit vorhandenen Emblemen):** Zwei Plätze mit
Emblem sind frei — SK_LIGHTNING_02 (ex Ionisierung, wurde Passiv) und SK_LIGHTNING_12 (ex Breitenbeschleuniger,
gestrichen). Damit geht die Runde ohne neues Bild auf 15:

1. **Rate zusammenlegen:** Blitzableiter bleibt und nimmt Statische Aufladung und Dauerstrom auf — jeder 2. / 2. / 1. / 1.
   Crit +1 Ladung; Episch dazu jeder Sieg ohne Crit +1 Ladung. Statische Aufladung und Dauerstrom werden gestrichen (−2).
2. **Zwei Plätze neu belegen (Emblem vorhanden):** SK_LIGHTNING_02 „Ionenfeld" — bei voller Ladungsleiste tragen ALLE
   ionisierten Karten +1 Wert (S +2, SS +3, E +4) bis zur nächsten Ionisierung; SK_LIGHTNING_12 „Vorentladung" — ab
   Serie 5 / 4 / 3 / 2 zählt der Crit-Multiplikator +0,1× je Serienpunkt auf diesen Stich, Episch auch ohne Crit
   +0,05×. Beides Tiefe statt Breite und Serie zu Crit, die Rollen, die dem Blitz-Build fehlen (+2).
3. **In ihrem Platz umbauen (Emblem bleibt):** Kettenblitz ionisiert die zuletzt ionisierte Karte noch einmal (Tiefe);
   Blitzfänger ohne Schwelle (+1 / +2 / +3 / +4 Wert je ionisierter Karte); Überspannung ohne Stapel-Schwelle;
   Blitzschlag: jeder 3. / 3. / 2. / 2. Crit ionisiert die Siegkarte, Episch zwei Stapel; Spannungsstau: der Stau geht
   in den Crit-Multiplikator statt in die Crit-Chance (+0,05× je Sieg ohne Crit, ein Crit leert ihn).
4. **Rampen messen:** Gewitterfront, Entladung, Überschlag gegen den 8×-Crit-Deckel prüfen, bevor an ihnen gedreht wird.

Nichts davon umgesetzt; Zahlen und Namen sind Vorschlag.

### 7.18 Blitz-Runde und Feuersturm-Tor (2026-09-06, umgesetzt)

Owner: ja zu beidem — Feuersturms Episch-Tor 80 → 90 % Hitze, und der Blitz-Plan aus 7.17. Blitz bleibt bei 15
normalen Skills, ohne neues Bild: die zwei Embleme der früher gestrichenen Plätze (SK_LIGHTNING_02 Ionisierung,
SK_LIGHTNING_12 Breitenbeschleuniger) tragen die zwei neuen Skills.

**Rate zusammengelegt.** Blitzableiter nimmt Statische Aufladung und Dauerstrom auf: jeder 2. / 2. / 1. / 1. Crit +1
Ladung, ab Selten nach jeder vollen Leiste +1 (Episch +2) zurück, Episch dazu jeder Sieg ohne Crit +1 Ladung. Das alte
Episch-Extra „Ladung über der Leiste bleibt" entfällt (der Überschuss verfällt auf jeder Stufe), die Niederlagen-Ladung
und der Dauerwert der Statischen Aufladung ebenso. Statische Aufladung (08) und Dauerstrom (16) sind gestrichen; die
Embleme bleiben als Master in `docs/art/skills/lightning/`.

**Zwei neue Skills.** *Ionenfeld* (02): jede volle Leiste lädt das Feld — für die nächsten 5 / 7 / 10 / 15 Stiche
kämpfen alle Karten mit +2 Wert (Episch +3). Das ist nicht der 7.17-Text („ionisierte Karten +1 … +4 bis zur nächsten
Ionisierung"): der wäre wortgleich mit dem neuen Blitzfänger gewesen. Als Feld nach jeder Leiste ist er der Blitz-
Gegenpart zur Klinge, an die Leiste gebunden statt an die Hitze, und die Rate-Skills bekommen einen Abnehmer. *Vor-
entladung* (12): ab Serie 5 / 4 / 3 / 2 gibt jeder Serienpunkt +0,1× Crit-Multiplikator auf den Stich (die Serie nach
dem Sieg, wie die Ladungsserie). Das „auch ohne Crit +0,05×" aus 7.17 ist weggelassen — ein Faktor je Serienpunkt
ohne Crit wäre Feuersturm noch einmal (7.17: Runaway). Episch trägt über die Schwelle 2.

**In ihrem Platz umgebaut.** Kettenblitz: jede (Normal jede 2.) volle Leiste gibt der Karte mit den meisten Stapeln
+1 / +1 / +2 / +3 Stapel — Tiefe statt Breite („die zuletzt ionisierte Karte" aus 7.17 wäre bei „nächste in der
Reihenfolge" jedes Mal eine andere; die tiefste Karte vertieft sich wirklich). Blitzfänger: ionisierte Karten kämpfen
mit +1 / +2 / +3 / +4 Wert, keine Schwelle. Überspannung: Crit mit einer ionisierten Karte +1 / +2 / +3 / +4 Ladung,
keine Schwelle. Blitzschlag: jeder 4. / 3. / 2. / 2. Crit ionisiert die Siegkarte, Episch mit zwei Stapeln. Spannungs-
stau: jeder Sieg ohne Crit +0,05 / 0,075 / 0,1 / 0,15× Crit-Multiplikator für den nächsten Crit, der Crit leert ihn
(Episch behält die Hälfte) — nicht mehr Crit-Chance, die das Passiv ohnehin sättigt.

**Technisch:** `lightning.fieldLeft` (Ionenfeld, zählt vor der Leiste je Stich herunter, der ladende Stich zählt nicht
mit), `lightningCritMult` liest die Serie nach dem Sieg (Vorentladung) und den Stau; `nonCritWins`/`lossCount` sind aus
dem Substate gefallen. Die Engine-Tests nutzten den Stau als künstliche Crit-Quelle — jetzt die Gewitterfront-Rampe.
Der Blitz-Motor (`--mode motor`) zeigt neu den Anteil der Crits am 8×-Deckel.

**Messung (100 Läufe, 50 Runden, Stapel-Score 75):**

| | vor der Runde (7.17) | jetzt |
| --- | --- | --- |
| Blitz mono (Duell, Median) | 7,17M | **10,95M (+53 %)** |
| Feuer mono | 13,3M | 13,3M |
| Floor Feuer ÷ Blitz | 1,86× | **1,22×** (Mean 0,89×, p90 0,79×) |
| Motor Blitz: Fraktion / Stapel zuerst / Crit zuerst | — | 9,4M / 18,0M / 11,2M |
| Stapel-Anteil (Fraktion / Stapel-Build) | 18 % / 43 % (7.12) | 45 % / 68 % |
| Stapel je Karte am Ende (Stapel-Build) | 6,7 | 12,6 |
| Crits am 8×-Deckel (Fraktion / Stapel / Crit) | — | 10,6 % / 9,8 % / 5,9 % |

Die Ionisierung trägt jetzt auch im Zufallsbuild fast die Hälfte, der Stapel-Build verdoppelt sich gegen den Crit-
Build. **Der 8×-Deckel bindet bei einem Zehntel der Crits** (Crit-Mult Ø 3,9–4,2×): Gewitterfront, Entladung und
Überschlag zeigen also in neun von zehn Crits, was sie können — der Deckel erklärt ihre „tot"-Flags nicht; das klärt
die gierige Auswertung unten.

**Parität, Sweep des Stapel-Scores (Duell, 100 Läufe):**

| Stapel-Score | Blitz mono | Floor | Mean | p90 |
| --- | --- | --- | --- | --- |
| 60 | 9,84M | 1,36× | 0,98× | 0,87× |
| **75** | **10,95M** | **1,22×** | **0,89×** | **0,79×** |
| 90 | 11,99M | 1,11× | 0,81× | 0,70× |

Kein Wert trifft Median und Schwanz zugleich: Blitz' Median liegt unter Feuers, sein Schwanz darüber — der Stapel-
Build streut, der Halte-Build nicht. Das ist die Varianz der Fraktion, kein Regler-Fehler; die Summe der Abweichungen
ist bei 60 und 75 gleich (0,51 / 0,54). **Entscheid (Regler, Agent): 75 bleibt.** Wer den Median gleichziehen will,
zahlt mit einem noch schwereren Blitz-Schwanz (90: p90 0,70×); Owner-Entscheid, falls gewünscht.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median 71,6M (7.17: 71,5M), Siegquote 73 %, Ø 11,9 Skills. Der
gierige Spieler baut jetzt Blitz-lastig: Vorentladung in 93 % (+21 % typisch), Ladungsserie 87 % (+113 %), Ionenfeld
83 %, Reststrom 79 %, Kettenblitz 78 %, Überspannung 75 %, Blitzableiter 56 %; Feuer nur noch Klinge 69 %, Feuerwalze
62 %, Weißglut 57 %. Träger bleiben Ladungsserie, Doppelentladung (+50 %), Sonnenkern (+38 %) — dazu neu Vorentladung
und Blitzschlag (+8 %, Episch-Lift 2,05). Spannungsstau (in 4 %, +84 %) und Donnergott (3 %, +77 %) sind stark, wenn
genommen. **„Tot" heißt jetzt etwas anderes:** Ionenfeld, Kettenblitz, Überspannung, Blitzableiter, Gewitterfront und
Reststrom werden zu 50–83 % gehalten und bewegen den Lauf um weniger als 3 % — Füller, die die Tür anbietet und die
nicht schaden, statt wie vor der Runde Skills, die niemand nimmt. Schadet: Entladung (−2 %, win 33 %), Überschlag
(−15 %), Zunder, Lauffeuer, Glutbett (−45 %, in 7 %), Serienschutz. Der Median bleibt, weil sich die Träger nicht
geändert haben — die Runde hat die Breite des Blitz-Builds gehoben (Duell +53 %), nicht seine Spitze.

**Was offen bleibt (Owner):** die Füller schärfen (Ionenfeld als Feld ist im gierigen Build neutral — Vorschlag: Wert 3 /
3 / 4 / 5 statt 2 / 2 / 2 / 3; Kettenblitz Normal jede Leiste statt jede 2.; Überspannung als Ladung ist bei 16 Stichen je
Leiste kein Engpass — Vorschlag: streichen oder zu „Crit mit ionisierter Karte: +1 Stapel" machen), Entladung und
Überschlag (die Rampen zahlen im gierigen Build nicht, obwohl der Deckel nur ein Zehntel der Crits bindet — Vorschlag:
Entladung +0,04 / 0,06 / 0,08 / 0,12× je Leiste, Überschlag streichen), Glutbett (−45 %), die Parität als Median-gegen-
Schwanz-Frage, und aus 7.15 die vier schwachen Legendären und die Stufenleitern.

### 7.19 Blitz-Durchgang 2, Crit-Deckel 12, zwei Legendäre (2026-09-06, umgesetzt)

Owner: „passt, alles" zu den Empfehlungen aus 7.18 — die Füller schärfen, Überschlag streichen, den Deckel heben, die
zwei schwachen Feuer-Legendären anfassen; Glutbett bleibt, die Stufenleitern warten, die Parität bleibt bei Stapel-
Score 75.

**Blitz.** *Ionenfeld* +3 / 3 / 4 / 5 Wert (war 2 / 2 / 2 / 3 — als Feld im gierigen Build neutral). *Kettenblitz:*
jede volle Leiste, auch Normal, gibt der Karte mit den meisten Stapeln +1 / 2 / 3 / 4 Stapel (war jede 2. / 1 / 1 / 1
Leiste mit +1 / 1 / 2 / 3). *Überspannung* ist neu die Schmiede des Blitzes: jede volle Leiste gibt der Karte, die sie
ionisiert, dauerhaft +1 / 1 / 2 / 3 Kartenwert — keine Ladung mehr (Ladung war bei 16 Stichen je Leiste kein Engpass,
7.18). *Überschlag* (14) ist gestrichen: der Überschuss über 100 % zahlt nur noch über die Systemregel; Blitz steht
damit bei 14 normalen Skills, der Untergrenze des Owners, das Emblem bleibt als Master. *Crit-Deckel* 8× → 12×
(`CRIT_MULT_CAP`, weiter der Regler des Owners): Rampen und Stapel auf der Siegkarte bekommen Luft, der Backstop bleibt.

**Legendäre.** *Sonnenzorn* liest die Spitze bis 200 % auch ohne Weißglut (vorher stand die Spitze ohne Weißglut bei
der Leiste selbst — der Skill hatte nichts zu lesen, 7.15: −17 %). *Phönixfeuer:* +3 % Hitze je Punkt Rückstand (war
+2), und bei voller Hitzeleiste hält die erste Niederlage jeder Runde die Serie — einmal je Runde, das Rundenende gibt
den Schutz frei; die Engine liest ihn vor dem Serienschutz, der dann keine Ladung ausgibt.

**Technisch:** `fillBar` backt den Überspannungs-Wert in die ionisierte Karte wie die Schmiede ihren Wert;
`chargeGainOnWin` kennt keine Karte mehr; `lightningCritMult(lightning, skills, skillTiers, streak)` ohne den
rawCrit-Term; `fireOnLoss` gibt `streakHeld` zurück, `heat.phoenixUsed` hält den Zustand je Runde. Die inaktiven
Kataloge (en/es/zh) behalten den gestrichenen Eintrag wie bisher. Sim-Band neu zentriert (Zufallsspieler, Seeds 1..40:
Median 3,53M → 5,67M, Mean 6,52M → 9,28M).

**Messung (100 Läufe, 50 Runden, Stapel-Score 75):**

| | 7.18 | jetzt |
| --- | --- | --- |
| Feuer mono (Duell, Median) | 13,3M | 13,6M |
| Blitz mono | 10,95M | **17,9M (+63 %)** |
| Floor Feuer ÷ Blitz | 1,22× (Mean 0,89×, p90 0,79×) | **0,76× (Mean 0,49×, p90 0,43×)** |
| Motor Blitz: Fraktion / Stapel zuerst / Crit zuerst | 9,4M / 18,0M / 11,2M | 16,0M / 28,7M / 23,8M |
| Leisten je Lauf (Fraktion) | 121 | 84 — Überspannung gibt keine Ladung mehr |
| Stapel-Anteil (Fraktion / Stapel-Build) | 45 % / 68 % | 48 % / 67 % |
| Crit-Mult Ø (Fraktion / Stapel / Crit) | 3,9× / 4,2× / 4,2× | 4,4× / 5,4× / 5,5× |
| Crits am Deckel (Fraktion / Stapel / Crit) | 10,6 % / 9,8 % / 5,9 % (8×) | 6,3 % / 14,6 % / 7,0 % (12×) |
| Motor Feuer: Fraktion / Glut + Kern | 13,3M / 22,8M | 13,4M / 22,8M |

**Die Parität ist gekippt** — Blitz mono liegt jetzt über Feuer mono, im Schwanz beim Doppelten. Zuordnung im Duell,
je eine Änderung der Runde zurückgedreht (Feuer mono bleibt 13,6M):

| Variante | Blitz mono | Floor | Mean | p90 |
| --- | --- | --- | --- | --- |
| jetzt | 17,9M | 0,76× | 0,49× | 0,43× |
| Überspannung ohne Dauerwert | **11,0M** | 1,24× | 0,59× | 0,43× |
| Ionenfeld 2 / 2 / 2 / 3 (7.18) | 12,8M | 1,07× | 0,62× | 0,57× |
| Crit-Deckel 8× | 15,0M | 0,91× | 0,63× | 0,58× |
| Kettenblitz wie 7.18 (jede 2. / 1 / 1 / 1 Leiste, +1 / 1 / 2 / 3) | 15,1M | 0,90× | 0,58× | 0,49× |
| Kettenblitz jede Leiste, +1 / 1 / 2 / 3 | 16,4M | 0,83× | 0,56× | 0,47× |
| Stapel-Score 60 (Regler) | 16,2M | 0,84× | 0,56× | 0,49× |
| Ionenfeld 2 / 3 / 4 / 5 | 13,5M | **1,01×** | 0,57× | 0,49× |
| Ionenfeld 2 / 3 / 3 / 4 | 13,5M | 1,01× | 0,55× | 0,51× |
| Ionenfeld 2 / 3 / 4 / 5 + Kettenblitz wie 7.18 | 12,1M | 1,13× | 0,67× | 0,53× |
| Ionenfeld 2 / 3 / 4 / 5 + Kettenblitz jede Leiste +1 / 1 / 2 / 3 | 13,3M | 1,02× | 0,65× | 0,53× |
| Ionenfeld 2 / 3 / 4 / 5 + 0,1× Crit-Mult je Stapel (statt 0,15×) | 12,7M | 1,07× | 0,58× | 0,54× |
| Ionenfeld 2 / 3 / 4 / 5 + Crit-Deckel 8× | 12,5M | 1,09× | 0,72× | 0,68× |
| Ionenfeld 2 / 3 / 4 / 5 + Überspannung 0 / 1 / 1 / 2 | 12,3M | 1,11× | 0,64× | 0,57× |
| Ionenfeld 2 / 3 / 4 / 5 + Kettenblitz +1 / 1 / 2 / 3 + 0,1× je Stapel | 12,4M | 1,10× | 0,68× | 0,57× |
| Ionenfeld 2 / 3 / 4 / 5 + Kettenblitz +1 / 1 / 2 / 3 + Crit-Deckel 8× | 12,5M | 1,09× | 0,81× | 0,70× |
| Ionenfeld 2 / 3 / 4 / 5 + Kettenblitz wie 7.18 + Crit-Deckel 8× | 11,9M | 1,14× | 0,83× | 0,72× |
| **Ionenfeld 2 / 3 / 4 / 5 + Überspannung 1 / 2 / 3 / 4 + Crit-Deckel 8×** (Kettenblitz bleibt +1 / 2 / 3 / 4) | 11,1M | **1,23×** | **0,79×** | **0,63×** |
| zum Vergleich 7.18 | 10,95M | 1,22× | 0,89× | 0,79× |

Owner-Regel dazu (2026-09-06, §1): Raritäten dürfen nie dieselben Werte haben — Kettenblitz +1 / 1 / 2 / 3 fällt damit
weg, und Überspannung 1 / 1 / 2 / 3 (Normal = Selten) muss ohnehin auf 1 / 2 / 3 / 4. Der Vorschlag ist deshalb die
letzte fette Zeile: Ionenfeld 2 / 3 / 4 / 5, Überspannung 1 / 2 / 3 / 4, Deckel 8×, Kettenblitz unverändert.

Der Dauerwert der Überspannung trägt den ganzen Median-Sprung (ohne ihn steht Blitz mono wieder bei 11,0M — die
Schmiede des Blitzes ist so stark wie die des Feuers, nur ohne Schwelle: 84 Leisten je Lauf sind 84 Schmiedungen),
Ionenfeld den zweiten Teil; der Schwanz hängt am Deckel und an der Kettenblitz-Tiefe (die Stapel auf der tiefsten Karte
sind zugleich Basis und Crit-Multiplikator). Beim Zufallsspieler (Band, Seeds 1..40) tragen Ionenfeld (−12 % ohne) und
der Dauerwert (−13 %) den Median, Kettenblitz nichts, der Deckel −5 %.

**Legendäre zur Laufmitte** (`--mode legendaries`, Skill-Phase 7 von 13, 150 gepaarte Läufe; Basis gierig 106M gegen
54,5M in 7.15):

| Legendär | 7.15 | jetzt |
| --- | --- | --- |
| Sonnenkern | +133 % | +132 % |
| Durchschlag | +25 % | +48 % |
| Doppelentladung | +106 % | +41 % |
| Damaststahl | +3 % | +26 % |
| Hochspannung | +17 % | +10 % |
| Donnergott | +6 % | −5 % |
| Phönixfeuer | −17 % | −8 % |
| Sonnenzorn | −17 % | −25 % |

Die Basis ist jetzt ein Blitz-Build (7.18: der gierige Spieler baut Blitz-lastig); ein Feuer-Legendäres, das nur die
Hitze liest, hat dort nichts zu lesen und kostet den Pick — Sonnenzorn und Phönixfeuer messen in dieser Reihe die
Fraktionswahl, nicht den Skill. Damaststahl (+26 %) zahlt fraktionsfrei. Der faire Blick auf die zwei gehobenen
Legendären ist der reine Feuer-Build (Lifts, unten). Dieselbe Reihe mit Deckel 8× (Basis 88,0M): Doppelentladung
+74 %, Sonnenkern +59 %, Durchschlag +18 %, Hochspannung +4 %, Damaststahl −4 %, Donnergott −12 %, Phönixfeuer −16 %,
Sonnenzorn −21 % — die Reihenfolge bleibt, die Legendären hängen nicht am Deckel.

**Lifts im reinen Feuer-Build** (Fraktions-Policy, 400 Läufe, Median mit ÷ ohne; 7.17b → jetzt): Feuer mono 13,6M →
14,1M. Sonnenzorn 0,83 → **0,94** (Mean 0,91 → 1,04), Phönixfeuer 0,84 → **0,87** (Mean 0,73 → 0,77). Beide sind
damit noch Kosten, aber keine Fallen mehr: Sonnenzorn liest jetzt eine Spitze, die über der Leiste liegt (Weißglut in
87 % der Builds), und trägt im Mittel; Phönixfeuer heizt auf Niederlagen, doch bei 59 % Stichen ≥ 100 % (Motor) ist
die Leiste meist schon voll — die Hitze aus Niederlagen verfällt am Anschlag, und der Serienschutz gilt einmal je
Runde. Sonst unverändert: Sonnenkern 2,69, Klinge 1,80, Weißglut 1,41, Feuersturm 1,10 (Episch 2,02), Glutbett 0,74.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median **155,9M** (7.18: 71,6M — mehr als verdoppelt), Siegquote
72 %, Ø 13,0 Skills. Der gierige Spieler baut wieder gemischt: Ladungsserie 95 %, Kurzschluss 89 %, Feuerwalze 89 %,
Blitzschlag 83 %, Klinge 81 %, Brandmal 72 %, Feuersturm 68 %, Vorentladung 68 %, Blitzableiter 59 %, Verbrennung
55 %, Blitzfänger 54 %. Träger: Damaststahl (+81 %, in 5 %), Sonnenkern (+128 %), Doppelentladung (+104 %), Ladungs-
serie (+181 % typisch), Vorentladung (+54 %), Blitzschlag (+32 %); Serienschutz, wenn genommen, +41 %. **Die zwei
geschärften Füller sind im gierigen Build nicht angekommen:** Ionenfeld wird noch zu 25 % gehalten (7.18: 83 %) und ist
neutral (+1 %), Überspannung zu 33 % und schadet (−11 %) — der gierige Spieler hat Besseres im Angebot, das Duell zeigt
dagegen, was die beiden im reinen Blitz-Build tragen (oben). Kettenblitz neutral (+1 %, in 42 %). Schadet weiter:
Glutbett (−45 %), Glut (−13 %), Spannungsstau (−9 %), Kurzschluss (−10 %, obwohl in 89 % gehalten — die Schwelle zählt
die tiefe Karte doppelt, der Pick kostet aber die Alternative), Gewitterfront, Entladung, Rückzündung. Sonnenzorn (in
3 %, −9 %) und Phönixfeuer (in 1 %) bleiben selten: der gierige Spieler nimmt kein Feuer-Legendäres ohne Feuer-Kern.

Die Verdopplung des gierigen Medians kommt nicht aus den Füllern und nur zum Teil aus dem Deckel: dieselbe Reihe
(`--mode legendaries`, Basis gierig, 600 Explore / 150 Läufe) mit Deckel 8× statt 12× gibt 88,0M statt 106,1M — der
Deckel trägt rund ein Fünftel des Medians und ein Drittel des p90 (257M gegen 353M). Der Rest hängt an keinem
einzelnen Skill (die Träger der Ablation sind dieselben wie in 7.18, dazu Damaststahl), sondern am Build: der gierige
Spieler hält jetzt Feuerwalze, Klinge, Brandmal und Feuersturm zu 68–89 % (7.18: 57–69 %) neben Ladungsserie 95 % und
Vorentladung — Feuers Multiplikator auf Blitz' Crit, die Serie als gemeinsamer Motor. Das ist gemessen, nicht
zugeordnet; die Tiefe (Stapel der tiefsten Karte als Basis und Crit-Multiplikator zugleich, 0,15× je Stapel,
Kurzschluss doppelt) ist der Verdacht — im Duell hebt sie zusammen mit dem Deckel den Blitz-Schwanz (oben).

**Was offen bleibt (Owner): die Parität.** Nichts davon umgesetzt; Vorschlag in zwei Schritten, beide gemessen (Tabelle
oben):

1. **Median:** Ionenfeld 2 / 3 / 4 / 5 statt 3 / 3 / 4 / 5 — Floor 1,01×. Der Normal-Wert entscheidet den Median (der
   Fraktions-Build hält Ionenfeld fast immer, meist auf Normal), die Leiter bleibt steil; 2 / 3 / 3 / 4 misst gleich.
2. **Schwanz** (auch dann Mean 0,57×, p90 0,49×): der Deckel zurück auf 8× und Kettenblitz jede Leiste +1 / 1 / 2 / 3
   — Floor 1,09×, Mean 0,81×, p90 0,70×, das ist der Stand von 7.18 (0,89× / 0,79×) bis auf ein Zehntel. Das nimmt die
   eigene Empfehlung aus 7.18 zurück: der Deckel 12× sollte den Rampen Luft geben, die Rampen zahlen aber weiter nicht
   (Entladung, Gewitterfront „schadet"), und die Luft ging an die Stapel der tiefsten Karte — im Duell ein Viertel des
   Blitz-Schwanzes, im gierigen Build ein Fünftel des Medians und ein Drittel des p90. Ohne den Deckel anzufassen („lieber
   Werte niedriger"):
   Kettenblitz +1 / 1 / 2 / 3 und 0,1× je Stapel statt 0,15× — 1,10× / 0,68× / 0,57×, der Schwanz bleibt dann bei
   Blitz. Überspannung bleibt in beiden Fällen, wie sie ist: sie ist die Schmiede des Blitzes und trägt den reinen Build,
   im gierigen Build ein Füller wie Ionenfeld.

Dazu aus 7.18 weiter offen: Glutbett (−45 %), die vier Legendären, die im gierigen Build nicht ankommen (Donnergott,
Phönixfeuer, Sonnenzorn — ohne Feuer-Kern nichts zu lesen —, Hochspannung), Kurzschluss als Pick, der in 89 % gehalten
wird und −10 % kostet, und die Stufenleitern.

### 7.20 Parität zurück, Donnergott, Phönixfeuer, Sonnenzorn (2026-09-06, umgesetzt)

Owner: „ja zu allem" — die Paritäts-Zeile aus 7.19 und drei der vier Legendären-Vorschläge; Hochspannung bleibt (es
trägt, was die Stufenleitern tragen), Glutbett bleibt. Dazu die Regel in §1: Raritäten unterscheiden sich immer.

**Parität.** Ionenfeld 2 / 3 / 4 / 5 (Normal 3 → 2 — der Normal-Wert entscheidet den Median), Überspannung 1 / 2 / 3 / 4
(Normal = Selten war die einzige Verletzung der Regel), Crit-Deckel 12 → 8 (die eigene Empfehlung aus 7.18 zurück-
genommen, 7.19). Kettenblitz bleibt +1 / 2 / 3 / 4.

**Donnergott** (Blitz, L): die Leiste bleibt bei 7 voll; statt flach +0,4× Crit-Multiplikator zählt jeder Stapel auf
der Siegkarte +0,25× statt +0,15× (`DONNERGOTT_ION_CRIT_MULT_PER_STACK`, Regler; Kurzschluss zählt weiter doppelt).
Zwei Dinge, Rate und Tiefe — der Motor, den der gierige Build wirklich spielt.

**Phönixfeuer** (Feuer, L): Niederlagen heizen +3 je Punkt Rückstand und halten bei voller Leiste einmal je Runde die
Serie (7.19); neu zahlt die Hitze, die über die Leiste hinausgeht, beim nächsten Sieg +30 Basis-Score je Punkt
(`PHOENIX_OVERFLOW_SCORE`; vorgemerkt in `heat.phoenixPending`, der Überlauf-Wandler der Niederlagen — in die Basis,
kein Direkt-Score; ohne den Skill verfällt die Vormerkung).

**Sonnenzorn** (Feuer, L): je 10 % Spitze +5 % statt +4 % (`SONNENZORN_MULT_PER_10`), und solange die Hitze unter der
Spitze liegt, zählt die Hitze aus Siegen ×2 (`SONNENZORN_HEAT_MULT`; zusätzlich zu Glut — unter beiden Schwellen ×4,
Sim-Wachpunkt). Der Zorn holt die Spitze zurück, im Kaltstart, wo Feuer verliert.

**Technisch:** `ionCritMultFor` liest den Satz je Build, `lightningCritMult` ohne flachen Term (`THUNDER_CRIT_MULT`
weg); `heatGainOnWin` bekommt `heatPeak`; `fireOnWin` gibt `phoenixPaid` zurück, `fireOnLoss` merkt `phoenixPending`.
Sim-Band unverändert (Zufallsspieler, Seeds 1..40: 5,64M / 8,89M — die Runde hebt und senkt sich für ihn auf).

**Messung (100 Läufe, 50 Runden, Stapel-Score 75):**

| | 7.19 | jetzt |
| --- | --- | --- |
| Feuer mono / Blitz mono (Duell, Median) | 13,6M / 17,9M | 13,6M / 11,1M |
| Floor Feuer ÷ Blitz (Mean, p90) | 0,76× (0,49×, 0,43×) | **1,23× (0,80×, 0,61×)** — 7.18: 1,22× (0,89×, 0,79×) |
| Motor Blitz: Fraktion / Stapel zuerst / Crit zuerst | 16,0M / 28,7M / 23,8M | 12,7M / 22,5M / 21,5M |
| Crit-Mult Ø (Fraktion / Stapel / Crit) | 4,4× / 5,4× / 5,5× | 4,0× / 4,6× / 4,9× |
| Crits am Deckel (Fraktion / Stapel / Crit) | 6 % / 15 % / 7 % (12×) | 11 % / 23 % / 17 % (8×) |
| Motor Feuer: Fraktion / Glut + Kern | 13,4M / 22,8M | 13,5M / 22,8M |

Die Parität steht wieder auf dem Stand von 7.18: Median 1,23×, der Schwanz bleibt bei Blitz (p90 0,61×, 7.18 0,79×) —
der Stapel-Build streut, der Halte-Build nicht. Der Deckel 8× bindet den Stapel-Build in einem Viertel seiner Crits.

**Legendäre zur Laufmitte** (`--mode legendaries`, 150 gepaarte Läufe; Basis gierig 81,0M — 7.19 mit Deckel 8×: 88,0M):

| Legendär | 7.19 (Deckel 12×) | 7.19 (Deckel 8×) | jetzt |
| --- | --- | --- | --- |
| Sonnenkern | +132 % | +59 % | +104 % |
| Doppelentladung | +41 % | +74 % | +38 % |
| Sonnenzorn | −25 % | −21 % | **+12 %** |
| Durchschlag | +48 % | +18 % | +3 % |
| Hochspannung | +10 % | +4 % | +11 % |
| Damaststahl | +26 % | −4 % | −4 % |
| Phönixfeuer | −8 % | −16 % | −15 % |
| Donnergott | −5 % | −12 % | −19 % |

Die Reihe streut zwischen zwei Läufen derselben Einstellung um ±20 Punkte (Sonnenkern 132 → 59 → 104 bei fast gleicher
Basis) — sie zeigt Vorzeichen und Größenordnung, keine Zehntel. Sonnenzorn ist mit den zwei neuen Dingen zum ersten
Mal positiv (+12 %, besser in 55 % der Seeds). Phönixfeuer und Donnergott bleiben unten; für beide ist die Reihe der
falsche Blick (die Basis ist ein gemischter Build ohne Feuer-Kern bzw. ohne Tiefe zur Laufmitte), der reine
Fraktions-Build unten ist der fairere.

**Lifts im reinen Feuer-Build** (400 Läufe, Median mit ÷ ohne; 7.19 → jetzt): Feuer mono 14,1M → 14,2M. Sonnenzorn
0,94 → **1,05** (Mean 1,04 → 1,17), Phönixfeuer 0,87 → 0,86 (Mean 0,77 → 0,77) — der Überlauf-Wandler mit 30 je
Punkt ist im reinen Build nicht sichtbar: der Rückstand einer Niederlage ist klein (zwei bis vier Punkte), der Überlauf
fällt nur bei voller Leiste an, und der Pick kostet den Verstärker, den er verdrängt. Regler-Sweep 30 / 60 / 100 je
Punkt und der Blitz-Lift des Donnergotts (0,25 / 0,35 / 0,5 je Stapel) unten.

**Phönix-Sonde** (reiner Feuer-Build, das Legendäre per Hook zur mittleren Skill-Phase eingesetzt, 60 Seeds gepaart,
`phoenix-probe.mjs`): gepaart 1,00, besser in 45 %. Der Überlauf-Wandler bekommt ab dem Pick **397 Hitzepunkte je
Lauf** — 61 Niederlagen, alle bei voller Leiste, aber der Rückstand einer Niederlage ist im reifen Feuer-Deck gut zwei
Punkte (×3 = 6,5 Hitze). Bei 30 je Punkt sind das 11.900 Basis-Score auf 25 Runden, bei 100 je Punkt 39.700 — gegen
rund 12.000 Basis je Runde. Der Regler kann das nicht heben (30 / 60 / 100: 13,3 / 13,5 / 13,6M mit, 15,6M ohne, gepaart
jedes Mal 1,00); die Ressource ist zu klein, nicht der Satz. `PHOENIX_OVERFLOW_SCORE` bleibt bei 30. Was Phönixfeuer
tragen könnte, ist eine Owner-Frage (unten).

**Donnergott im reinen Blitz-Build** (`blitz-lifts.mjs`, 400 Läufe, Median mit ÷ ohne): 2,57 — wie die anderen
Blitz-Legendären (Durchschlag 3,45, Hochspannung 2,71, Doppelentladung 2,03); der Satz je Stapel ist dort kein
Regler (0,25 / 0,35 / 0,5: 2,57 / 2,60 / 2,64), die Leiste bei 7 trägt. `DONNERGOTT_ION_CRIT_MULT_PER_STACK` bleibt
bei 0,25. Nebenbefund derselben Reihe: Blitzableiter 1,75 (Episch 4,64), Gewitterfront 1,16, Überspannung 1,07 (Normal
0,92, Sehr selten 1,95, Episch 1,97), Ionenfeld 0,51 (Normal 0,44, Sehr selten 1,33, Episch 1,67) — bei diesen beiden
trägt die Leiter, Normal nicht.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median **107,3M** (7.19: 155,9M, 7.18: 71,6M), Siegquote 74 %,
Ø 13,0 Skills. Träger: Ladungsserie (+176 % typisch, in 93 %), Sonnenkern (+58 %), Doppelentladung (+56 %), Klinge
(+48 %); dahinter Feuerwalze, Damaststahl, Feuersturm, Vorentladung. **Die drei umgebauten Legendären werden jetzt
genommen:** Donnergott in 25 % (7.19: 3 %, neutral −1 %), Sonnenzorn in 19 % (3 %, +5 %), Phönixfeuer in 5 % (1 %,
−9 %). Ionenfeld in 64 % (neutral), Überspannung in 43 % (−4 %), Kettenblitz in 55 % (+4 %). Schadet: Rückzündung
(−31 %), Glutbett (−47 %, in 1 %), Durchschlag (−11 %, in 24 % — der Crit auf der Niederlage wird mit Deckel 8×
wieder zur Falle), Spannungsstau (−10 %), Gewitterfront (−7 %), Serienschutz.

**Was offen bleibt (Owner):**

1. **Phönixfeuer** trägt nicht, weil Niederlagen im reifen Deck fast keinen Rückstand haben — die Hitze aus
   Niederlagen ist die kleine Ressource, egal wie sie gewandelt wird. Vorschlag zur Wahl: (a) der Überlauf zahlt je
   *Niederlage* einen festen Betrag statt je Punkt (etwa +150 Basis, unabhängig vom Rückstand); (b) Phönixfeuer
   liest den Rückstand nicht in Punkten, sondern hält bei voller Leiste *jede* Niederlage der Runde die Serie (der
   Serienschutz des Feuers — Sim-Wachpunkt Feuersturm × Ladungsserie, die Serie reißt dann fast nie); (c) so lassen,
   als Kaltstart-Legendäres für schwache Decks.
2. **Durchschlag** (−11 %) ist mit dem Deckel 8× wieder die Falle aus 7.15; **Rückzündung** (−31 %) und **Glutbett**
   (−47 %) bleiben die Feuer-Fallen — Glutbett auf Wunsch des Owners unverändert.
3. Aus 7.18/7.19 weiter: Kurzschluss als Pick (in 87 %, −1 %, jetzt neutral), die Stufenleitern (bei Ionenfeld und
   Überspannung tragen sie, bei den meisten nicht), Hochspannung danach.

### 7.21 Ewige Glut ersetzt Phönixfeuer (2026-09-06, umgesetzt)

Owner: Phönixfeuer ist „vollgestopft mit Versuchen, ihn nutzbar zu machen" — streichen und ein neues Legendäres bauen,
das trägt. Aus drei Vorschlägen (Ewige Glut: Rampe; Schmelzkern: Überlauf zu Dauerwert; Flammenkrone: Serie) die
Wahl: **Ewige Glut**, auf dem Platz SK_FIRE_L02, das Phönix-Emblem bleibt (Wiedergeburt aus der Glut).

**Ewige Glut** (Feuer, L, Achse Rampe) — zwei Dinge:

1. Jede Runde, die mit voller Hitzeleiste endet, hebt den Hitze-Multiplikator dauerhaft um +0,05
   (`EWIGE_GLUT_MULT_PER_ROUND`, Regler — Vorschlag 0,03, nach Sweep 0,05, unten; `heat.emberMult`, additiv im
   selben Faktor wie Passiv, Weißglut und Sonnenzorn, ohne Deckel). Im reinen Feuer-Build enden 28 von 49 Runden
   heiß: ab Runde 1 wächst die Rampe auf +1,5, der Feuer-Faktor später Siege steigt von 2,6 auf 4,0. Die Messlatte war
   Entladung Normal: +0,02× je Leiste bei 84 Leisten. Die Rampe zählt nur, solange der Skill gehalten wird.
2. Die Hitze fällt nie unter 50 % der Spitze (`EWIGE_GLUT_FLOOR_FRAC`) — ein Boden, der nur hält, nie hebt (wer
   den Skill unter der Spitze bekommt, wird nicht hochgezogen). Nach der ersten heißen Runde gibt es keinen Kaltstart
   mehr (Motor: 600 Stiche bis 100).

Warum es tragen sollte: Feuer hatte keine einzige dauerhafte Rampe, Blitz hat vier (Gewitterfront, Entladung, die
Kettenblitz-Tiefe, den Überspannungs-Dauerwert); Feuers Schwanz war deshalb flach (p90 Feuer ÷ Blitz 0,61×).
Wachpunkt: Weißglut und Sonnenzorn liegen im selben Faktor, additiv — kein Produkt.

**Gestrichen:** Phönixfeuer samt Serienschutz je Runde, Überlauf-Wandler und Neuzündung (`PHOENIX_*`, `phoenixUsed`,
`phoenixPending`, `fireOnLoss` gibt kein `streakHeld` mehr; die Engine hat keinen Feuer-Serienschutz). Der Emblem-
Master bleibt als `docs/art/skills/fire/SK_FIRE_L02_phoenixfeuer`, das Spiel-Asset heißt `SK_FIRE_L02_ewige-glut`.

**Sonde und Sweep** (`ember-probe.mjs`: reiner Feuer-Build, das Legendäre per Hook eingesetzt, gepaart gegen denselben
Seed ohne; 40–60 Seeds — die Paare streuen stark, p25 ≈ 0,8, weil sich die Builds nach der geänderten Tür trennen):

| Satz je heiße Runde | ab Runde 25 (Median, Mean) | ab Runde 1 (Median, Mean) | Rampe am Laufende | Feuer-Faktor später Siege |
| --- | --- | --- | --- | --- |
| 0,03 (Vorschlag) | 1,02 / 1,15 | 1,30 / 2,36 | 0,75 / 0,90 | 2,9 / 3,4 gegen 2,6 |
| **0,05 (gesetzt)** | **1,14 / 1,31** | **1,57 / 2,79** | 1,25 / 1,50 | 3,4 / 4,0 gegen 2,6 |
| 0,08 | 1,32 / 1,53 | — | 2,00 | 4,0 gegen 2,8 |

Die Rampe wächst wie gedacht (28 von 49 Rundenenden heiß, die Hitze steht am Rundenende im Median auf der Leiste),
aber 0,03 war zur Laufmitte nur der Preis des Picks wert. 0,05 trägt zur Laufmitte wie Sonnenzorn und Hochspannung
(+10 %) und ab Runde 1 wie ein Legendäres (1,57, Mean 2,79 — Sonnenkern liegt im reinen Build bei 2,6). 0,08 wäre ab
Runde 1 ein Runaway-Kandidat (Rampe 3 und mehr), nicht gemessen, nicht gesetzt.

**Lifts im reinen Feuer-Build** (400 Läufe, Median mit ÷ ohne): Ewige Glut **1,13** (Mean 1,05) — bei 0,03 noch 1,01;
Sonnenkern 2,55, Damaststahl 1,02, Sonnenzorn 1,01. Feuer mono 14,8M. Phönixfeuer stand hier bei 0,86.

**Duell** (100 Läufe): Feuer mono 13,9M (7.20: 13,6M — die Fraktions-Policy hält ein Legendäres in 12 % der Läufe),
Blitz mono 11,1M; Floor 1,25×, Mean 0,87×, p90 0,70× (7.20: 1,23× / 0,80× / 0,61×) — der Feuer-Schwanz zieht nach.
Band unverändert (Zufallsspieler 5,64M / 9,19M).

**Legendäre zur Laufmitte** (gierig gemischt, Basis 104,9M): Sonnenkern +96 %, Doppelentladung +54 %, Durchschlag
+14 %, Damaststahl +7 %, **Ewige Glut +6 %** (Lift 1,19, besser in 52 %), Hochspannung 0 %, Sonnenzorn −1 %,
Donnergott −16 %. In dieser Reihe zahlt ein Feuer-Legendäres höchstens den Pick zurück (der Build ist Blitz-lastig);
Phönixfeuer stand hier bei −15 %.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median **125,0M** (7.20: 107,3M), Siegquote 72 %, Ø 12,5
Skills. Ewige Glut in 12 % gehalten, Lift 1,10, Ablation ±0 — im gemischten Build ein neutraler Pick, kein Schaden
(Phönixfeuer: in 5 %, −9 %). Träger: Ladungsserie (+242 % typisch), Damaststahl (+166 %, in 13 %), Sonnenkern
(+121 %), Klinge (+101 %), Hochspannung (+43 %), Doppelentladung (+44 %), Feuersturm (+33 %), Weißglut (+24 %).
Schadet: Glut, Spannungsstau, Überspannung (−2 %), Glutbett, Gewitterfront. Sonnenzorn diesmal in 1 % (7.20: 19 %)
— die Wertetabelle des Explore streut bei Legendären von Lauf zu Lauf, die Lifts im reinen Build sind der stabilere
Blick.

**Fazit:** Ewige Glut trägt dort, wo ein Feuer-Legendäres tragen kann — im Feuer-Build (Lift 1,13, ab Runde 1 1,57)
— und kostet nirgends. Das war mit Phönixfeuer in keiner Fassung zu haben. Offen aus 7.20 bleiben Durchschlag am
8×-Deckel, Rückzündung, Glutbett (Owner: lassen), Kurzschluss als Pick und die Stufenleitern.

### 7.22 Die offene Liste: Rückzündung als Konter, acht Episch-Extras (2026-09-06, umgesetzt)

Owner: „die offenen abarbeiten" — „alle ja" zu den vier Vorschlägen. Durchschlag und Kurzschluss bleiben (die
„Falle" war ein Ausreißer: −11 % in einer Auswertung, +4 % und zur Laufmitte +14 % in der nächsten; im reinen
Blitz-Build Lift 3,45 — Kurzschluss neutral, seine verdoppelten Stapel verpuffen am 8×-Deckel, nicht am Skill).

**Rückzündung** (Feuer, im Platz umgebaut): war Hitze je Punkt Rückstand der letzten Niederlage — Lift 0,87, gierig
−31 %, wie Glut und Zunder: Hitze ist nie knapp, der Pick verdrängt einen Multiplikator. Jetzt der Konter: nach einer
Niederlage zählt der nächste Sieg ×1,15 / 1,25 / 1,35 / 1,5 (`rueckzuendungMult`, ein Faktor im Feuer-Stack neben
Hitze-Multiplikator, Verbrennung und Feuersturm); Episch dazu kämpft die Karte nach einer Niederlage mit +2 (blieb).
Kein Hitze-Anteil mehr; `lastLossDeficit` bleibt im Substate, ungenutzt.

**Acht Episch-Extras** (Owner-Regel: Episch braucht ein Extra oder ist sehr stark; Ionenfeld, Überspannung, Klinge
und Weißglut sind auf Episch schon stark und bleiben):

| Skill | Episch-Extra | Code |
| --- | --- | --- |
| Reststrom | die Leiste ist bei 9 voll | `bar: 9`, `maxChargeFor(skills, skillTiers)` — Donnergott (7) gewinnt |
| Gewitterfront | dazu +0,02× Crit-Multiplikator je Leiste | `multPerBar`, in `fillBar` auf `entladungMult` |
| Vorentladung | +0,15× je Serienpunkt statt +0,1× | `multPerStreak: 0.15` |
| Kettenblitz | auch die zweittiefste Karte +1 Stapel | `second: 1`, `deepestIndex(deck, exclude)` |
| Blitzfänger | dazu +1 Kampfwert je Stapel | `perStack: 1` |
| Kurzschluss | verliert eine Karte ab der Schwelle, zahlt ihr doppelter Stapel-Score beim nächsten Sieg | `onLoss`, `lightning.stackBank` → Basis des nächsten Siegs (kein Direkt-Score) |
| Zunder | auch jede Niederlage +2 % Hitze | `lossHeat: 2`, nach Kühlung und Böden |
| Verbrennung | der Faktor ×1,5 zählt auch auf den Hitzegewinn | `heatToo`, in `heatGainOnWin` |

**Messung.** Duell (100 Läufe): Feuer mono 13,6M, Blitz mono 11,7M (7.21: 11,1M — Reststrom Episch mit Leiste 9 und
die Extras heben den Blitz-Median leicht); Floor 1,16×, Mean 0,82×, p90 0,63× (7.21: 1,25× / 0,87× / 0,70×). Band
unverändert (Zufallsspieler 5,48M / 8,95M). Legendäre zur Laufmitte (Basis 74,8M): Sonnenkern +172 %, Doppelentladung
+54 %, Damaststahl +29 %, Ewige Glut +18 %, Durchschlag +13 %, Sonnenzorn −9 %, Hochspannung −12 %, Donnergott −11 %
— dieselbe Streuung von ±15 Punkten zwischen zwei Läufen wie zuvor.

**Ein Messfehler in den Lift-Reihen.** Die Lifts (mit ÷ ohne, Fraktions-Policy) hatten bis hier eine „ohne"-Gruppe,
die mit Legendär-Haltern angereichert war: wer ein Legendäres nahm, hielt einen normalen Skill weniger, und Sonnenkern
allein verdoppelt den Lauf — deshalb maß jeder Füller 0,85 bis 0,95, ohne zu schaden, und daraus wurden „Fallen". Mit
Filter (`NOLEG=1`, nur Läufe ohne Legendäres, 240 von 400) lesen sich die Feuer-Lifts so: Klinge 2,80, Weißglut 1,71,
Feuersturm 1,25, Lauffeuer 1,16, Schmelzpunkt 1,00, Feuerwalze 0,98, Brandmal 0,98, Glutstahl 0,94, Verbrennung 0,92,
Glut 0,91, Rückzündung 0,87, Zunder 0,84, Glutbett 0,73, Schmiede 0,72. Aber auch das trägt nicht weit: die
„ohne"-Gruppe eines zu 90 % gehaltenen Skills sind dann 20 bis 40 Läufe — Schmiede 0,72 ist Rauschen, kein Befund
(Dauerwert kann nicht schaden). **Die Lifts taugen für Legendäre (in 8–15 % gehalten) und mit Vorsicht für
Stufenvergleiche; der Schiedsrichter für „schadet" ist die gepaarte Ablation des gierigen Spielers.** Frühere
Lift-Urteile über Füller (7.16 ff.) sind entsprechend zu lesen.

Mit Filter (255 Blitz-Läufe ohne Legendäres) die Blitz-Reihe: Gewitterfront 2,18, Überspannung 1,42, Reststrom 1,42,
Ladungsserie 1,35, Blitzfänger 1,25, Ionenfeld 1,14, Kettenblitz 0,95, Blitzschlag 0,80, Vorentladung 0,80,
Kurzschluss 0,73, Spannungsstau 0,67, Entladung 0,48, Serienschutz 0,36 — im reinen Blitz-Build tragen die Rampen und
die Wert-Skills, die Crit-Multiplikator-Skills nicht (der 8×-Deckel). **Die Episch-Extras** (Episch gegen Normal
derselben Reihe, gefiltert, je Stufe 30–60 Läufe): Reststrom 4,36 gegen 1,32 (die Leiste bei 9 ist das stärkste
Episch im Blitz-Build), Kettenblitz 3,88 gegen 0,92, Gewitterfront 3,47 gegen 2,17, Blitzfänger 2,35 gegen 0,95,
Kurzschluss 0,89 gegen 0,72, Vorentladung 0,94 gegen 0,92; Feuer (ungefiltert): Zunder 1,10 gegen 0,85, Verbrennung
1,10 gegen 0,94, Rückzündung 0,89 gegen 0,86. Sechs der acht Extras zeigen sich in der Leiter; Vorentladung und
Kurzschluss hängen am Deckel (0,15 je Serienpunkt ist bei Serie 20 +3×, der Stapel-Build steht in einem Viertel seiner
Crits am Deckel) — dort trägt kein Extra, bis der Deckel fällt oder die Werte sinken.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median 99,5M (7.21: 125,0M, 7.20: 107,3M — die Wertetabelle
des Explore streut von Lauf zu Lauf um ±20 %, die Reihe 71,6 → 155,9 → 107,3 → 125,0 → 99,5M ist mehr Streuung als
Trend), Siegquote 72 %, Ø 12,8 Skills. **Rückzündung** ist von „schadet −31 %" auf neutral (±0, in 15 %, Lift 0,75)
— der Konter kostet nichts mehr, trägt aber im gemischten Build auch nichts: der erste Sieg nach einer Niederlage ist
spät im Lauf ein seltener Stich. Verbrennung wird mit dem Extra erstmals „stark" (+40 %, in 12 %), Gewitterfront
ebenso (+37 %, in 17 % — 7.21: „schadet"), Vorentladung +11 %, Kurzschluss +5 %, Blitzfänger +4 %, Ewige Glut +5 %
(in 23 %); Zunder, Reststrom, Kettenblitz neutral. Schadet: Glutbett (−5 %), Überspannung, Serienschutz, Schmiede,
Damaststahl (−5 %; 7.21: +166 % — bei 13–19 % Haltequote ist die Ablation ±30 Punkte Rauschen), Glut (−70 % in 3 %:
vier Läufe, kein Befund).

**Fazit der Runde.** Rückzündung ist keine Falle mehr, aber auch kein Träger — ein Füller mit Thema. Sechs der acht
Extras zeigen sich in der Leiter des reinen Builds (Reststrom, Kettenblitz, Gewitterfront, Blitzfänger deutlich;
Zunder, Verbrennung sichtbar); Vorentladung und Kurzschluss auf Episch bleiben vom Deckel gebunden. Der wichtigste
Ertrag der Runde ist der Messfehler: Lift-Urteile über zu 90 % gehaltene Füller waren durch die Legendär-Halter in der
„ohne"-Gruppe nach unten verzerrt; die gepaarte Ablation des gierigen Spielers ist der Schiedsrichter, und die streut
bei selten gehaltenen Skills um ±30 Punkte — Urteile brauchen zwei Läufe.

**Was offen bleibt:** Glutbett und Schmiede als „schadet" im gierigen Build (Owner: beide bleiben vorerst); der
8×-Deckel als Grenze für Vorentladung und Kurzschluss auf Episch (unten gemessen); die Streuung der Auswertung selbst
(mehr Läufe je Ablation, wenn Urteile fallen sollen).

**Die Deckel-Frage, gemessen** (Owner: „kein Freund von Deckel — was sind die Konsequenzen?"; `SIM_CRIT_MULT_CAP=1000`):

| | Deckel 8 | ohne Deckel |
| --- | --- | --- |
| Gierig (Legendären-Reihe, Basis): Median / p90 | 75–125M / 322–365M | 544M / 2,7 Mrd |
| Blitz mono (Duell): Median / Mean / p90 | 11,7M / 22M / 58M | 15,5M / 68M / 161M |
| Floor / Mean / p90 Feuer ÷ Blitz | 1,16× / 0,82× / 0,63× | 0,88× / 0,26× / 0,23× |
| Motor Blitz Fraktion / Stapel / Crit | 12,7M / 22,5M / 21,5M | 18,3M / 53,1M / 36,0M |
| Crit-Mult Ø (Fraktion / Stapel / Crit) | 4,0× / 4,6× / 4,9× | 5,8× / 9,2× / 6,3× |

Der Schwanz läuft ohne Deckel um das Drei- bis Achtfache weg, der Median um ein Drittel. „Lieber Werte niedriger" statt
Deckel, im Duell durchprobiert: ohne Deckel mit Stapel-Crit 0, Entladung ×¼, Vorentladung ×½, Spannungsstau ×½ und
ohne Doppel-Crit beim Leistenfüllen fällt der Blitz-Median auf 8,0M (Floor 1,69×), der Schwanz bleibt bei Mean 0,53×,
p90 0,54×. Jede Quelle einzeln zurückgedreht (Stapel 0,10 / 0,05 / 0,02 / 0: Mean 0,29 / 0,33 / 0,36 / 0,38×;
Entladung ×¼ 0,28×; Vorentladung ×½ 0,31×) ändert am Schwanz fast nichts: er ist das Produkt der offenen Rampen mit
einer Crit-Chance, die 100 % erreicht — niedrige Sätze treffen den Median zuerst und den Schwanz zuletzt. Optionen an
den Owner: (1) Deckel 8 bleibt (Status quo); (2) Deckel weg und Werte runter — nach dieser Messung nicht zu haben;
(3) Bremse statt Anschlag: über 8× zählt jeder weitere Punkt zu einem Viertel — ein Deckel, der bremst, die Rampen und
die zwei Episch-Extras behalten oben Wirkung; eine Zeile in der Engine, nicht gemessen; (4) Deckel 12 — 7.19: Parität
gekippt, gierig verdoppelt. Empfehlung: (3) messen, sonst (1).

Entscheid Owner (2026-09-06): **der Deckel bleibt bei 8.** Damit ist die offene Liste aus 7.20 geschlossen; Glutbett
und Schmiede bleiben vorerst, wie sie sind.

### 7.23 Ladungsserie ÷10, Feuerlinie statt Glut (2026-09-06, umgesetzt)

Owner, aus dem Spiel (Runde 42, Serie 540, Crit-Chance 549 %): „Ladungsserie ist zu krass — bei ×2,5 bin ich auf über
500 % Crit" und „Glut muss doch weg, dafür etwas, das mit hohen Kartenwerten und Formation interagiert." Entscheide:
**Ladungsserie ÷10**; **Feuerlinie** mit **3 % Hitzekosten** je ausgelöstem Sieg.

**Befund Ladungsserie.** Der Serien-Multiplikator hat einen Deckel (+2 % je Punkt, ab Serie 75 ×2,5), Ladungsserie
hatte keinen (+1 / 1,5 / 2 / 2,5 % je Serienpunkt); über 100 % zahlt der Überschuss +0,002× Crit-Multiplikator je
Prozentpunkt (549 % → 3,15× statt 2,25×). Die Serien sind in der Sim so lang wie beim Owner: beste Serie je Lauf
Feuer mono Median 614, p90 1111 (Schmiede — ab der Laufmitte verliert das Deck nicht mehr), Blitz mono 41, Zufallsmix
91 (150 Läufe je Welt, `streak-probe.mjs`). Die Feuer-Serie füttert den Blitz-Crit — darum war Ladungsserie seit
Wochen der Träger des gemischten Builds (+204 % gierig, in 88 %).

Optionen gemessen: Duell (Blitz mono) heute 11,7M → ÷2 12,3M, ÷4 10,7M, ÷10 10,2M — Blitz allein reagiert kaum, die
Serie ist dort kurz. Gierig (1000 Explore / 150 Läufe): ÷4 lässt Ladungsserie Träger (+138 %, in 95 %; Median 110,8M),
÷10 macht sie zum Füller (+21 %, in 96 %; Median 71,2M gegen 99,5M in 7.22 — der Preis der 500 %); den Platz „Serie zu
Crit" übernimmt Vorentladung (+36 %, ab Serie 58 dauerhaft am Deckel 8). Umgesetzt: `critPerStreak` 0,001 / 0,0015 /
0,002 / 0,0025, das Episch-Extra (ab Serie 8 jeder Sieg +1 Ladung) bleibt. Nebenbefund: die Textformatierung `pctS`
rundete auf eine Nachkommastelle — 0,15 % stand als „0,2 %", Gewitterfront Selten 0,75 % als „0,8 %"; jetzt zwei
Stellen.

**Feuerlinie** (SK_FIRE_01, Platz von Glut, Emblem umbenannt `SK_FIRE_01_feuerlinie.webp`): „Ein Sieg in einer
Formation zählt +2 / 3 / 4 / 5 % Score je Punkt Kampfwert der Siegkarte und verbrennt 3 % Hitze." Episch-Extra: der
Bonus zählt je Formation an der Siegposition (Überlappung). Kampfwert = der Wert, mit dem die Karte antritt (Grundwert
plus Schmiede, Klinge, Perks) — der Skill wächst mit jeder Schmiedung. Code: `feuerlinieMult(skills, skillTiers,
{ value, formCount, heldHeat })`, ein Faktor im Feuer-Stack (`fireOnWin` gibt `lineMult` zurück, Engine multipliziert
ihn in `fireMult`); `formCount` = `activeFormationCount(posForm)`. Das Tor liest wie alle Hitze-Tore die Hitze nach dem
Gewinn des Siegs (`held`): deckt sie die Kosten nicht, gibt es weder Bonus noch Kosten; zündet der Skill, gehen die
3 % nach dem Schmelzpunkt-Überlauf von der Leiste (die volle Leiste bleibt voll, der nächste Gewinn füllt die Lücke).
Glut ist gestrichen (`heatGainOnWin` ohne Kaltstart-Faktor, `fireOnLoss` ohne halbe Kühlung); Motor-Sim: Verstärker
sind nur noch Zunder und Rückzündung, Feuerlinie liegt im Kern. Verworfen (Vorschläge an den Owner): *Brennglas* (ab
Wert 9 / 8 / 7 / 6 zählt der Formations-Bonus ×1,5, Episch bei voller Leiste ×2) und *Flammenherd* (Rate: Hitze je
Punkt Kampfwert über 7 / 6 / 5 / 4 im Formations-Sieg — stirbt wie Glut an der vollen Leiste).

**Messung.** Duell (100 Läufe): Feuer mono 13,1M (7.22: 13,6M), Blitz mono 10,2M (11,7M); Floor 1,29×, Mean 0,86×,
p90 0,71× (7.22: 1,16× / 0,82× / 0,63×) — die Parität rückt Richtung Feuer, weil Blitz den Serien-Crit verliert.
Motor Feuer (Fraktion, 100 Läufe): 14,2M (12,9M), Stiche am Anschlag 30,6 % (53,7 %), ≥ 100 % 43,2 % (57,2 %) — die
Kosten der Feuerlinie holen die Leiste vom Anschlag, genau die Lücke, an der Glut gestorben war; Kern ohne Verstärker
26,5M (23,6M), Zunder + Kern 24,5M (23,5M). Band (Zufallsspieler, Seeds 1..40): 4,05M / 5,91M (7.22: 5,48M / 8,95M)
— neu zentriert (2,6–5,5M / 3,8–8,0M). Legendäre zur Laufmitte (Basis 52,1M): Sonnenkern +206 %, Doppelentladung
+66 %, Damaststahl +23 %, Hochspannung +13 %, Durchschlag +12 %, Donnergott +11 %, Ewige Glut +7 %, Sonnenzorn +5 %.
Lifts gefiltert (`NOLEG=1`): Feuer Klinge 2,39, Weißglut 1,36, Lauffeuer 1,27, Feuersturm 1,23, Schmelzpunkt 1,21,
Feuerlinie 0,91 (N 0,90 · S 0,90 · SS 1,08 · E 0,61 — bei 56 % Haltequote kein Befund, s. 7.22); Blitz Reststrom
1,61, Blitzschlag 1,55, Spannungsstau 1,32, Gewitterfront 1,19, Ionenfeld 1,13, Ladungsserie 1,02 (N 1,03 · E 1,44),
Legendäre im reinen Blitz-Build Durchschlag 3,09, Hochspannung 2,85, Doppelentladung 1,95, Donnergott 1,67.

**Gierig mit diesem Stand** (1000 Explore, 150 Läufe): Median 53,2M (7.22: 99,5M; ÷10 allein 71,2M — die Reihe
streut ±20 %, der Rest ist der Serien-Crit), Siegquote 73 %, Ø 12,7 Skills. **Feuerlinie: +15 % typisch, besser in
72 % der Paare, in 19 % gehalten** — nach Sonnenkern der zweitbeste Feuer-Pick, vor Klinge (+20 %, in 60 %) und
Weißglut (+14 %). Ladungsserie bleibt „stark" (+28 %, in 78 %; Episch-Lift 2,39 — das Extra trägt die Stufe),
Vorentladung +26 % (in 94 %), Doppelentladung +37 %, Sonnenkern +60 %. Schadet: Überspannung (−12 %, in 85 % —
zweite Runde in Folge, Wachpunkt), Glutbett (−8 %), Rückzündung (−5 %, in 7 %), Serienschutz, Spannungsstau. Tot:
Feuersturm, Glutstahl, Schmelzpunkt, Zunder, Brandmal, Schmiede, Blitzfänger, Ionenfeld, Kettenblitz, Entladung,
Reststrom, Kurzschluss; Durchschlag 14 %, −4 %.

**Owner: „Durchschlag und Rückzündung, beide unterperformen" — Befund und Vorschläge (nicht umgesetzt):**

*Rückzündung* (Konter seit 7.22): 7.22 neutral (in 15 %), jetzt −5 % (in 7 %), Lifts 0,42–0,90. Der Auslöser ist zu
selten: der erste Sieg nach einer Niederlage. Ab der Laufmitte verliert ein Feuer-Deck nicht mehr (Serie 614), und
selbst bei 14 % Niederlagen ist ×1,15 auf jeden siebten Sieg +2 % — Verbrennung zahlt ×1,5 auf ein Drittel der Siege.
Vorschlag **(a) Nachzündung**: verlorene Hitze zündet nach — „Dein nächster Sieg zählt +2 / 3 / 4 / 5 % Score je
Hitzepunkt, der seit deinem letzten Sieg verloren ging." Eine Niederlage (−6) → +12 … 30 %, zwei in Folge → +24 … 60 %,
und die Feuerlinie (−3) speist ihn mit: nach jedem Formations-Sieg zählt der nächste +6 … 15 %. Ohne Deckel, ein
Satz, das Episch-Extra (+2 Wert nach einer Niederlage) bleibt. Vorschlag (b): je Niederlage im Durchlauf +5 / 7,5 / 10
/ 15 % auf alle weiteren Siege des Durchlaufs (Niederlagen als Brennstoff, setzt sich am Rundenende zurück) — braucht
weiter Niederlagen, tut in starken Builds nichts. Empfehlung (a).

*Durchschlag* (Blitz, L): im reinen Blitz-Build Lift 3,09 (der Träger dort: die Niederlage wird zum Crit-Sieg, Serie
und Leiste laufen weiter), zur Laufmitte +12 %, gierig 14 % gehalten und −4 %. Im gemischten, Feuer-lastigen Build ist
die Crit-Chance auf einer Niederlage klein (Passiv 4 % je Blitz-Skill; der 500-%-Serien-Crit, der jede Niederlage zum
Sieg machte, ist weg). Vorschlag: zwei Dinge, wie ein Legendäres darf — „Niederlagen würfeln den Crit mit doppelter
Crit-Chance; ein Crit gewinnt den Stich. Jede Niederlage ohne Crit gibt +2 Ladung." Der zweite Satz macht jede
Niederlage nützlich (die Leiste läuft in der schwachen Phase weiter), der erste macht den Durchschlag bei 25 % Chance
verlässlich. Alternative: der Durchschlag-Sieg ionisiert die Siegkarte (+1 Stapel).

**Was offen bleibt:** Überspannung „schadet" zweimal in Folge (in 85 % gehalten — die +1 … 4 Dauerwert je Leiste
verdrängen einen Multiplikator?); Glutbett und Schmiede (Owner: bleiben); ein Chip an der Hitzeleiste für die
Feuerlinie wie bei Verbrennung (Anzeige, Owner-Frage); die Episch-Stufe der Feuerlinie ist in der Sim noch nicht
sichtbar (wenige Läufe).

### 7.24 Ohne Niederlage-Bedingung: Überspannung verwertet den Überschuss, Rückzündung im Takt (2026-09-06, umgesetzt)

Owner: „Beide sind tot, da ab Mitte des Spiels kaum noch Niederlagen passieren. Wir müssen die Niederlage-Bedingung
umgehen." Zu Überspannung: „vielleicht ein Skill daraus, der Crit über 100 % verwertet." Entscheide: **Überspannung
verwertet den Überschuss über dem Deckel**, **Rückzündung im Takt**; der Durchschlag-Vorschlag (Viertel über dem
Deckel) ist „zu situativ" — neue Vorschläge unten, nichts davon umgesetzt.

**Befund vorab, gemessen.** Crit-Chance über 100 % gibt es seit ÷10 kaum noch: Blitz mono in den Runden 41–50 in
12 % der Stiche (Ø +46 pp), Mix 4 %, davor 0 % (`overcrit-probe.mjs`, ohne Perk-Crit). Was wirklich da ist, liegt
über dem 8×-Deckel des Crit-Multiplikators (`capexcess-probe.mjs`, `SIM_CRIT_MULT_CAP=1000`): Blitz mono Runden 41–50
29 % der Crits, Ø +14×; Mix Runden 31–50 5–11 % der Crits, Ø +31 … 39× (Vorentladung auf den Feuer-Serien). Beides
ist Spätspiel — genau die Lücke „ab Mitte des Spiels".

**Überspannung** (SK_LIGHTNING_04, im Platz): „Ein Crit über dem Deckel entlädt den Überschuss: je 4 / 3 / 2 / 1×
Crit-Multiplikator über 8× gibt er +1 Ladung." Episch dazu: je 25 % Crit-Chance über 100 % +1 Ladung. Code: die
Engine hält den ungedeckelten Multiplikator (`critMultRaw`, vor dem Backstop) und gibt ihn mit `rawCrit` an
`chargeGainOnWin`; die Vorschau für Entladung Episch (`critFillsBar`) rechnet ohne Überspannung, der Multiplikator
steht dort noch nicht fest. Der Dauerwert je Leiste (7.19) ist weg (`fillBar` backt nichts mehr). Glossar „Kaskade"
nachgezogen. Warum der alte Skill „schadete": Wert ist im Überfluss da (Schmiede, Klinge, Ionenfeld, Blitzfänger,
Perks), das Deck gewinnt 73 %, ein Punkt auf einer zufälligen Karte bringt dem Multiplikator-Stack nichts — der Pick
verdrängt einen Multiplikator.

**Rückzündung** (SK_FIRE_05, im Platz): „Jeder 5. / 4. / 3. / 2. Sieg in Folge zündet: er zählt ×1,5." Episch dazu:
die zündende Karte kämpft mit +2 Wert (`fireValueBonus` liest die Serie vor dem Stich — wäre dieser Stich der N.
Sieg in Folge, kommt der Wert). `rueckzuendungMult(skills, skillTiers, streak)` liest die Serie nach dem Sieg wie
Feuersturm; ein Faktor im Feuer-Stack. Kein Niederlage-Bezug mehr; `lastLossDeficit` bleibt ungenutzt im Substate.
Motor-Sim: der letzte Verstärker ist Zunder, Rückzündung liegt im Kern. Verworfen: „unter voller Hitzeleiste zählt
jeder Sieg ×1,1 … 1,3".

**Messung.** Duell (100 Läufe): Feuer mono 14,2M (7.23: 13,1M — der Takt zahlt), **Blitz mono 7,3M (10,2M)**; Floor
**1,93×**, Mean 1,44×, p90 1,17× (7.23: 1,29× / 0,86× / 0,71×). Blitz mono ändert sich nur durch Überspannung
(dieselben Seeds, dieselben Picks) — der Dauerwert je Leiste war **die einzige Dauerwert-Quelle des Blitzes** und
trug den reinen Build: Motor Blitz Fraktion 11,3M → 9,3M, Stapel zuerst 17,3M → 12,6M, Crit zuerst 18,1M → 17,9M;
die neue Überspannung bringt +3 … 7 Leisten je Lauf (77 / 121 / 134 statt 74 / 119 / 127), weil der Überschuss spät
kommt und Normal 4× je Ladung braucht. Die „ionisierte Karte gewinnt"-Synergien hängen mit dran: Legendäre zur
Laufmitte (Basis 37,6M) Doppelentladung +9 % (7.23: +66 %), Durchschlag −14 % (+12 %), Donnergott −5 %; Sonnenkern
+171 %, Damaststahl +52 %, Sonnenzorn +16 %, Ewige Glut +12 %, Hochspannung +11 %. Lifts gefiltert: Feuer Klinge 2,34,
Feuerlinie 0,91, Rückzündung 0,81 (N 0,83 · E 1,36); Blitz Überspannung 0,69 (N 0,67 · E 0,85), Ladungsserie 0,66,
Vorentladung 1,15, Durchschlag 4,46 (L, in 13 %). Band: 3,71M / 6,07M, im Band. Motor Feuer unverändert (Fraktion
15,4M, Anschlag 30,6 %).

**Gierig** (1000 Explore, 150 Läufe): Median 47,7M (7.23: 53,2M), Siegquote 74 %, **Ø 10,5 Skills** (12,7 — der
gierige Spieler lehnt mehr Picks ab). Überspannung in 5 % gehalten, +21 % typisch, besser in 75 % (acht Läufe —
Rauschen); Rückzündung in 9 %, −9 % (13 Läufe); Feuerlinie in 9 %, +2 % (7.23: 19 %, +15 %). Stark: Sonnenkern
+65 %, Vorentladung +66 %, Klinge +67 %, Brandmal, Weißglut, Lauffeuer, Ladungsserie +27 %. Schadet: Reststrom −42 %
(in 7 %; 7.23: neutral in 71 %), Glutstahl −62 % (in 10 %), Zunder, Schmiede, Gewitterfront. Die Haltequoten springen
zwischen den Läufen (Reststrom 71 → 7 %, Überspannung 85 → 5 %) — das ist die Wertetabelle des Explore, nicht der
Skill; Urteile über Skills unter 15 % Haltequote brauchen zwei Läufe (7.22).

**Parität, Sweep.** Stapel-Score (der bisherige Regler) 75 → 100 → 125: Blitz mono 7,3M → 8,3M → 9,2M, Floor 1,93×
→ 1,71× → 1,54× — der Median folgt dem Regler nur schwach, den Dauerwert ersetzt er nicht. Sonde **Dauerwert als
Blitz-Passiv** (`SIM_ION_VALUE_PER_BAR`, Default 0 = aus; jede volle Leiste gibt der ionisierten Karte dauerhaft
+N): +1 → Blitz mono 13,0M, Floor 1,09×, Mean 0,71×, p90 0,55×; +2 → 13,6M, 1,04× / 0,57× / 0,51×. Ein Punkt als
Passiv holt mehr zurück als der alte Skill (den hielt nur, wer ihn zog), am Schwanz zu viel gegen 7.23 (0,86× /
0,71×). Optionen an den Owner: (a) Dauerwert +1 je Leiste als Blitz-Passiv (Passiv-Text ändert sich), (b) Dauerwert
je Ionisierung auf Blitzfänger (statt des Kampfbonus, Episch-Extra +1 je Stapel bleibt — nur Halter), (c) nichts,
Parität über Stapel-Score 125 (1,54×). Empfehlung (a), notfalls „jede zweite Leiste" als Zwischenschritt.

**Durchschlag (SK_LIGHTNING_L04) — Vorschläge ohne Situationsbindung** (Owner: der Deckel-Viertel-Vorschlag ist zu
situativ; heute: im reinen Blitz-Build Lift 4,46, im Mix −14 %, tot):

1. **Lichtbogen** — „Jeder Sieg ohne Crit zählt mit dem halben Crit-Multiplikator." Immer an, ab Stich 1, wächst mit
   den Rampen, vom Deckel begrenzt; in Crit-Builds rund +40 %. Eine Zeile in der Engine (`gained`).
2. **Kettenreaktion** — „Jeder Crit ionisiert die Siegkarte (+1 Stapel); jede volle Leiste ionisiert zwei Karten."
   Immer an, der Stapel-Motor; Rückkopplung Stapel → Crit-Multiplikator → Deckel, zu messen.
3. **Erdung** — „Jeder Sieg senkt die geschlagene Gegnerkarte dauerhaft um 1 Wert." Immer an, wächst über den Lauf,
   trägt das frühe Spiel; spät nur noch Vorsprung (Verbrennung, Hitze).

Empfehlung: Lichtbogen. Emblem bleibt (SK_LIGHTNING_L04), Name folgt der Wahl.

**Entscheid Owner (2026-09-06): Parität nach Empfehlung (a) — der Dauerwert +1 je Leiste ist Blitz-Passiv
(umgesetzt).** `ION_VALUE_PER_BAR` 1 (Sim-Regler), `fillBar` backt ihn auf die ionisierte Karte, egal welche Skills;
Passiv-Text, Leisten-Tooltip und Glossar „Ladung" nennen ihn. Gemessen: Duell Blitz mono 13,0M (7.24: 7,3M; 7.23:
10,2M), Floor 1,09×, Mean 0,71×, p90 0,55× — der Schwanz liegt jetzt beim Blitz. Motor Blitz Fraktion 11,3M (zurück
auf 7.23), Stapel zuerst 17,9M, **Crit zuerst 31,3M (7.23: 18,1M)** — Dauerwert × Vorentladung × Überspannung
Episch ist ein Kreislauf: mehr Wert, längere Serien, Crits über dem Deckel, daraus Ladung (168 Leisten je Lauf statt
127), Rampen, wieder Crits über dem Deckel (29 % der Crits am Deckel) — Wachpunkt, wenn der Blitz-Schwanz zu weit
läuft. Legendäre zur Laufmitte: Sonnenkern +132 %, Doppelentladung +70 % (wieder da), Ewige Glut +13 %, Sonnenzorn
+8 %, Donnergott +6 %, Damaststahl +1 %, Hochspannung −2 %, Durchschlag −9 %. Lifts gefiltert (Blitz): Überspannung
1,13 (N 0,98 · S 1,75 · E 2,02), Ladungsserie 1,22, Vorentladung 1,22, Reststrom 1,07; Durchschlag 2,97, Doppelentladung
1,73. Gierig: Median 81,5M (Ø 13,0 Skills), Doppelentladung +49 %, Vorentladung +43 %, Ladungsserie +28 %, Durchschlag
+11 % (in 22 %), Feuerlinie +9 % (in 10 %); Überspannung (18 %) und Rückzündung (5 %) neutral, „tot". Band 4,72M /
7,90M, neu zentriert.

**Owner: „alle Vorschläge für Durchschlag sind zu langweilig — was fehlt uns an coolen legendären Mechaniken?"**
Achsen, die heute kein Legendäres berührt: Formationen (keines!), das Gegnerdeck für Blitz (Feuer hat Sonnenkern),
die Reihenfolge und Nachbarn im eigenen Deck, Zeitfenster nach Ereignissen, die Brücke zwischen den Fraktionen (die
gierigen Bestbuilds sind gemischt), die Gegner-Reihenfolge (wird je Runde neu gemischt). Fünf Konzepte für den Platz
SK_LIGHTNING_L04 (Emblem bleibt), keines umgesetzt:

| Konzept | Einzeiler | Achse | Risiko / Aufwand |
| --- | --- | --- | --- |
| **Resonanz** | Ionisierte Karten in einer Formation teilen ihre Stapel: jede Karte der Formation kämpft mit der Summe der Stapel ihrer Formation. | Formation × Ionisierung — Formationsphase wird eine Blitz-Entscheidung, Kettenblitz vertieft die ganze Formation | stark, begrenzt durch Formationsgröße und Deckel; `formations.js` muss die Mitglieder je Formation liefern |
| **Durchschlag** (neu) | Jeder Crit schlägt durch: die geschlagene Gegnerkarte wird ionisiert. Ionisierte Gegnerkarten kämpfen mit −1 Wert je Stapel und zahlen ihren Stapel-Score dem, der sie schlägt. | Gegnerdeck für Blitz, dauerhaft über die Runden (Spiegel zu Sonnenkern) | Skalierung (500 Crits je Lauf) — Satz „jeder 2. Crit" oder halber Stapel-Score als Regler; Gegner-Stapel wie Brände speichern |
| **Gewitter** | Jede volle Leiste entfesselt ein Gewitter: die nächsten 5 Stiche critten sicher, und jeder Crit im Gewitter ionisiert die Siegkarte. | Zeitfenster nach der Leiste (Rhythmus, wie Ionenfeld) | spät nahe 100 % Crit; einfach zu bauen (`stormLeft` wie Henkers forceCrit) |
| **Plasma** | Crits heizen: jeder Crit gibt +2 % Hitze, die Hitze ist auch ohne Feuer-Skill aktiv. Jede Runde, die mit voller Hitzeleiste endet, füllt die Ladungsleiste. | Brücke Blitz ↔ Feuer — das erste Legendäre für gemischte Builds | Reducer aktiviert die Hitze für den Halter; Blitz mono bekommt den Hitze-Multiplikator (+20 %) dazu |
| **Blitzlenker** | Nach jedem Crit rückt die schwächste verbleibende Gegnerkarte an die nächste Position. | Gegner-Reihenfolge — der Blitz sucht sich das Ziel | Ertrag ist Vorsprung (Hitze, Verbrennung), spät im Überfluss |

Empfehlung: **Resonanz** (verändert das Spiel am meisten — Formationen bauen wird für Blitz zur Entscheidung), sonst
der neue Durchschlag (thematisch, behält den Namen). Beide werden nach der Wahl gebaut und gierig gemessen.

**Was offen bleibt:** der Blitz-Schwanz (Crit zuerst 31M, Duell p90 0,55× — Wachpunkt); Feuerlinie-Chip an der
Hitzeleiste (Anzeige); Glutbett und Schmiede (Owner: bleiben); die Streuung der gierigen Auswertung (Haltequoten
springen — zwei Läufe je Urteil).

### 7.25 Resonanz ersetzt Durchschlag (2026-09-06, umgesetzt)

Owner: „Resonanz ist stark, nehmen wir." Platz SK_LIGHTNING_L04, das Emblem bleibt (`SK_LIGHTNING_L04_resonanz.webp`).

**Resonanz** (Blitz, L, Achse Formation × Ionisierung — das erste Legendäre, das Formationen berührt): „Ionisierte
Karten in einer Formation teilen ihre Stapel: jede Karte der Formation kämpft mit der Summe der Stapel ihrer
Formation." Die gespielte Karte kämpft mit ihren eigenen Stapeln plus `RESONANZ_SHARE` (1, Sim-Regler) × den Stapeln
aller anderen Mitglieder ihrer Formationen — Vereinigung über alle Läufe an der Position; Anker, Grenzbonus, Nachhall
und Kern sind keine Formationen mit Mitgliedern. Die Summe zählt überall, wo die Siegkarte ihre Stapel liest:
Stapel-Score in der Basis, Crit-Multiplikator je Stapel, Blitzfänger, Kurzschluss (Schwelle und Vormerkung bei
Niederlage), Doppelentladung, Anzeige „voll ionisiert". Stapel-Änderungen (Blitzschlag) gehen weiter an die echte
Karte. Code: `computeFormations` legt je Lauf die Mitglieder auf jeden Eintrag (`members`, Positionen — bei zwei
Treppen je Segment, E_RPM, bekommt der zweite Eintrag den zweiten Lauf); `resonantStacks(card, posForm, slot,
cardAt)` in lightning.js; die Engine bildet `pCardR` als Lesesicht der gespielten Karte. Durchschlag (Niederlage
crittet) ist samt eigenem Zufallsstrom und `lastTrick.durchschlag` gestrichen; die anderen Zufallsströme sind
unberührt. Spielerisch: Kettenblitz vertieft die tiefste Karte — mit Resonanz die ganze Formation, in der sie steht;
die Formationsphase wird für Blitz eine Entscheidung (ionisierte Karten zusammenlegen, Läufe über die Segmentgrenze
öffnen).

**Messung.** Duell (100 Läufe): Feuer mono 14,2M, Blitz mono 13,0M (Median unverändert — die Fraktions-Policy zieht
ein Legendäres in ~12 % der Läufe), Mean 26,4M (26,0M), p90 76M (72M); Floor 1,09×, Mean 0,70×, p90 0,52×.
Legendäre zur Laufmitte (Basis 97,2M): Sonnenkern +121 %, Doppelentladung +50 %, **Resonanz +48 % (besser in 61 %,
Lift 1,37)**, Ewige Glut +4 %, Hochspannung +6 %, Donnergott −6 %, Damaststahl −5 %, Sonnenzorn −6 % — Durchschlag
stand hier zuletzt bei −9 %. Lifts gefiltert (reiner Blitz-Build, 400 Läufe): Resonanz 4,25 (in 12 %; Durchschlag
2,97 … 4,46), Hochspannung 3,10, Donnergott 2,40, Doppelentladung 1,77; die Stapel-Skills ziehen mit: Blitzfänger 1,47,
Kurzschluss 1,37, Überspannung 1,13, Kettenblitz 1,08.

**Gierig** (1000 Explore, 150 Läufe): Median 77,8M (7.24: 81,5M — Streuung), Mean 176M, p90 398M, p95 803M (der
Schwanz wächst: Resonanz × Doppelentladung × Kettenblitz), Siegquote 73 %, Ø 12,7 Skills. **Resonanz in 29 %
gehalten, +64 % typisch, besser in 84 % der Paare, Lift 2,22 — „stark"**, nach Sonnenkern (+79 %) der zweitbeste Pick,
vor Doppelentladung (+61 %). Kettenblitz wird mit ihr erstmals „stark" (+36 %, in 12 % — die Tiefe zahlt jetzt in die
ganze Formation), Kurzschluss in 85 % (+4 %, Episch-Lift 3,63), Überspannung in 39 % (+4 %, Episch 2,62). Donnergott
−19 % (in 8 %, Rauschen), Blitzfänger tot. Feuer unverändert: Klinge, Weißglut stark; Feuerlinie (8 %) und Rückzündung
(13 %, +7 %) Füller. Band im Rahmen (der Vollauf hält es).

**Fazit.** Resonanz ist das erste Legendäre mit Formationsbezug und misst sich auf Anhieb als Träger des gemischten
Builds (+48 % zur Laufmitte, +64 % gierig), ohne den Median zu verschieben; der Schwanz (p95 803M) ist der Wachpunkt.
`SIM_RESONANZ_SHARE` (Anteil der fremden Stapel, 1) ist der Regler, falls er zu weit läuft.

**Was offen bleibt:** der Blitz-Schwanz (7.24 Crit zuerst 31M, jetzt p95 803M gierig — Wachpunkt, Regler Resonanz-
Anteil und Stapel-Score); Feuerlinie-Chip an der Hitzeleiste (Anzeige); Glutbett und Schmiede (Owner: bleiben);
Anzeige der Resonanz-Summe im Stich (heute zeigt der Stich die eigenen Stapel — Owner-Frage).

### 7.26 Pass über alle Feuer- und Blitz-Skills (2026-09-06, Befund und Vorschläge, nichts umgesetzt)

Owner: „ein pass über alle skills. ob alle unterschiedlich genug, genügend Varianz, alle Beschreibungen gut sind."
Drei Fragen, vier Befunde (A–D), danach die Vorschläge je Skill (E). **Nichts umgesetzt** — jeder Punkt wartet auf
das Ja des Owners, Skill für Skill.

#### A. Auslöser und Erträge

Je Skill der Auslöser (woran er hängt) und der Ertrag (was herauskommt); die letzte Spalte ist der gierige Stand
(7.23–7.25, mit dem zweiten Lauf aus dieser Runde).

**Blitz.** Die Kette ist Crit → Ladung → volle Leiste → Stapel (+ Dauerwert seit 7.24).

| Skill | Auslöser | Ertrag | Gierig |
| --- | --- | --- | --- |
| Blitzableiter | jeder N. Crit; volle Leiste; Sieg ohne Crit (E) | Ladung | Füller |
| Reststrom | volle Leiste | Ladung (Startwert); Leistenlänge (E) | schwankt, 7.24 „schadet" |
| Ionenfeld | volle Leiste | Stichwert auf alle Karten, N Stiche | tot (7.23) |
| Gewitterfront | volle Leiste | Crit-Chance dauerhaft; Crit-Mult (E) | „schadet" (7.24) |
| Entladung | volle Leiste | Crit-Mult dauerhaft | tot (7.23) |
| Kettenblitz | volle Leiste | Stapel auf die tiefste Karte | stark seit Resonanz (7.25) |
| Ladungsserie | jeder Serienpunkt | Crit-Chance; Ladung ab Serie 8 (E) | stark |
| Vorentladung | Serienpunkt ab Serie N | Crit-Mult auf diesen Stich | Träger |
| Spannungsstau | Sieg ohne Crit | Crit-Mult bis zum nächsten Crit | „schadet" (7.23) |
| Blitzschlag | jeder N. Crit | Stapel auf die Siegkarte | Füller, Lift 1,55 |
| Blitzfänger | ionisierte Karte im Stich | Kampfwert | tot (7.23, 7.25) |
| Kurzschluss | Sieg ab N Stapeln | Stapel zählen doppelt | Füller, in 85 % |
| Überspannung | Crit über dem Deckel | Ladung | Füller (7.25) |
| Serienschutz | Niederlage mit Ladung | Serie hält | „schadet" (7.6), nie Träger |

Auslöser: **volle Leiste 5** (Reststrom, Ionenfeld, Gewitterfront, Entladung, Kettenblitz, dazu Blitzableiter zur
Hälfte) · Crit-Zähler 2 · Serie 2 · Sieg ohne Crit 1 (+ Blitzableiter E) · Stapel-Zustand 2 · Deckel-Überschuss 1 ·
Niederlage 1. Erträge: Ladung 3 · Crit-Mult 3 · Crit-Chance 2 · Stapel 2 · Wert 2 · Verdopplung 1 · Schutz 1.
**Unberührt bei Blitz:** Formation (nur Resonanz, L), das Gegnerdeck, das Durchlaufende, der Kampfwert-Vorsprung, die
eigene Reihenfolge.

**Feuer.** Die Kette ist Sieg mit Vorsprung → Hitze → Hitze-Multiplikator und Tore.

| Skill | Auslöser | Ertrag | Gierig |
| --- | --- | --- | --- |
| Feuerlinie | Sieg in einer Formation | Score-Faktor je Punkt Kampfwert; kostet 3 % Hitze | Füller (8–19 %) |
| Zunder | jeder Sieg (E: auch Niederlage) | Hitze | „schadet" (7.24) |
| Feuersturm | volle Leiste, dann je Serienpunkt | Score-Faktor | tot (7.23) |
| Rückzündung | jeder N. Sieg in Folge | Score-Faktor ×1,5; Kampfwert (E) | Füller |
| Glutbett | Niederlage | Hitze-Boden | „schadet" (Owner: bleibt) |
| Glühende Klinge | Hitze-Zustand | Kampfwert auf alle Karten | Träger |
| Weißglut | Hitze über 100 | Score-Faktor; Leistenlänge | stark |
| Feuerwalze | Hitze-Schwelle nach einem Sieg | Kampfwert der nächsten Karte | tot (7.6, 7.9, 7.13) |
| Verbrennung | Sieg ab Vorsprung N | Score-Faktor ×1,5; Hitze ×1,5 (E) | Füller |
| Schmelzpunkt | Überlauf bei voller Leiste | Basis-Score | tot (7.23) |
| Brandmal | Hitze-Schwelle, jeder Sieg | Gegnerkarte −2 Wert | stark (7.24) |
| Lauffeuer | Hitze-Schwelle, jeder Sieg | Nachbarn der Gegnerkarte −1 Wert | stark (7.24) |
| Schmiede | Durchlaufende ab Hitze-Schwelle | Dauerwert | tot (Owner: bleibt) |
| Glutstahl | jeder Sieg | Basis-Score je Punkt über dem Grundwert | −62 % (7.24) |

Auslöser: **Hitze-Schwelle 4** (Feuerwalze, Brandmal, Lauffeuer, Schmiede) · Sieg ohne Bedingung 2 · Sieg mit
Bedingung 3 · Hitze-Zustand 2 · Serie 1 · Überlauf 1 · Niederlage 1. Erträge: **Score-Faktor 5** (Feuerlinie,
Feuersturm, Rückzündung, Verbrennung, Weißglut) · Basis-Score 2 · Kampfwert 2 · Gegner-Debuff 2 · Hitze 1 ·
Dauerwert 1 · Schutz 1. **Unberührt bei Feuer:** die eigene Reihenfolge, Zeitfenster nach einem Ereignis, Ladung
oder Crit (die Brücke zum Blitz).

#### B. Was sich doppelt, nach Schärfe

1. **Gewitterfront × Entladung.** Gleicher Auslöser (volle Leiste), gleicher Satzbau („gibt dauerhaft +X"), nur das
   Ziel unterscheidet sich (Chance gegen Multiplikator). Und das Episch-Extra der Gewitterfront (+0,02× Crit-Mult je
   Leiste) **ist Entladung Normal, Zahl für Zahl**. Die schärfste Dublette im Spiel.
2. **Brandmal × Lauffeuer.** Gleicher Auslöser, **dieselbe Leiter 80/60/40/20**, gleicher Ertragstyp (Brand auf dem
   Gegnerdeck); der Unterschied ist „die geschlagene Karte −2" gegen „ihre Nachbarn −1". Sonnenkern (L) ist der
   dritte Brand und tut beides.
3. **Feuerwalze × Glühende Klinge.** Beide wandeln Hitze in Kampfwert. Gemessen (Stufe für Stufe, alle Hitzestände):
   Klinge erreicht oder schlägt Feuerwalze überall außer bei 40 % Hitze auf Sehr selten und Episch, braucht keinen
   Sieg davor und wächst mit der Hitze weiter — Feuerwalze bleibt auf jeder Stufe bei +2.
4. **Blitzableiter × Reststrom.** Blitzableiters Zusatz ab Selten („nach jeder vollen Leiste kommt +1 Ladung zurück")
   ist Reststrom, nur kleiner — auf Episch (+2 zurück) ist er **Reststrom Normal, Zahl für Zahl**. Dazu ist
   Blitzableiter Episch der einzige Skill mit **drei Sätzen und drei Effekten**
   (§1: ein Effekt je normalem Skill), und sein dritter Satz besetzt Spannungsstaus Auslöser.
5. **Verbrennung × Rückzündung.** Beide zahlen **×1,5** auf einen Sieg, beide lassen den Faktor fest und schieben nur
   die Bedingung (Vorsprung 8→5, Takt 5→2). Zwei Skills, eine Zahl.
6. **Reststrom Episch × Donnergott (L).** „Die Leiste ist schon bei 9 voll" ist die Kopfzeile eines Legendären
   („Die Ladungsleiste ist bei 7 voll") auf einer normalen Stufe.
7. **Blitzfänger × Ionenfeld × Passiv.** Drei Wertquellen beim Blitz. Der Dauerwert je Leiste (7.24) macht die dritte
   überflüssig; Blitzfänger ist seit 7.23 in jeder gierigen Auswertung tot.
8. **Schmiede × Damaststahl (L).** Seit 7.14 (Schmiede ohne Preis) fast deckungsgleich; Damaststahl misst −5 %.
   Schmiede bleibt (Owner) — die Unterscheidung muss also vom Legendären kommen.

Nicht doppelt, obwohl sie nebeneinander stehen: Blitzschlag (Breite, je Crit) gegen Kettenblitz (Tiefe, je Leiste);
Kurzschluss (Schwelle auf einer Karte) gegen Resonanz (Summe über eine Formation); Glutstahl (Basis-Score über
Grundwert) gegen Feuerlinie (Faktor auf den ganzen Kampfwert).

#### C. Weißglut verschiebt still die Tore von Feuersturm und Schmelzpunkt

> **KORRIGIERT (2026-09-06, noch in derselben Sitzung).** Die erste Fassung dieses Abschnitts behauptete, Weißglut
> schalte Feuersturm und Schmelzpunkt **ab**, und nannte das einen Regelfehler. Das war aus den Modulfunktionen bei
> genau 100 % Hitze geschlossen und ist **im Lauf nicht haltbar** — die Sonde unten misst das Gegenteil. Der Befund
> ist kleiner und anderer Art: eine versteckte Kopplung, kein Fehler. Was unten steht, ist der gemessene Stand.

Beide Skills lesen „volle Leiste" als **die Leiste des Builds**, nicht als 100 %. Mit Weißglut ist die Leiste 200,
ihr Tor steigt also still mit. Isoliert sieht das drastisch aus (Modulfunktionen, bei genau 100 % Hitze):
Feuersturm Sehr selten ×1,10 → ×1,00, Schmelzpunkt Normal +135 Basis → 0.

**Im Lauf gemessen** (`sim/probes/weissglut-gate.mjs`, Feuer mono, 150 Läufe, 128 ziehen Weißglut; Anteil der Stiche,
in denen das jeweilige Tor offen steht):

| Stiche … | Ø Hitze | Tor 90 (Feuersturm Episch) | Tor 100 | Tor „volle Leiste des Builds" (heute) |
| --- | --- | --- | --- | --- |
| **mit** Weißglut im Bestand (124.480) | 141 % | 70 % | 69 % | **40 %** (Leiste 200) |
| **ohne** Weißglut im Bestand (175.520) | 52 % | 42 % | 24 % | **24 %** (Leiste 100) |

Weißglut schaltet also nichts ab: Der Build wird mit der längeren Leiste so viel heißer (Ø 141 % gegen 52 %), dass
die 200 in **40 %** der Stiche stehen — häufiger, als ein Build ohne Weißglut die 100 erreicht. Schmelzpunkt und
Feuersturm N/S/SS zünden im Weißglut-Build mehr, nicht weniger. (Der Vergleich ist nicht sauber A/B: Weißglut wird
meist zur Laufmitte gezogen, die „ohne"-Gruppe ist überwiegend die kalte erste Laufhälfte. Er reicht aber, um
„abgeschaltet" auszuschließen.)

Was bleibt, ist eine **versteckte Kopplung**: ein Pick schreibt die Schwelle zweier anderer Skills um, und kein Text
sagt es. Dazu kommt, dass Feuersturm Normal, Selten und Sehr selten sich **dasselbe Tor teilen** (alle drei „voll") —
die Leiter dieser drei Stufen ist eine reine Ertragsleiter, erst Episch senkt zusätzlich das Tor auf absolute 90.

Das ist damit **keine Regelfrage, sondern eine Designfrage — Entscheid Owner.** Drei Lesarten:

1. **So lassen.** Weißglut ist die längere Leiste, und wer sie nimmt, verschiebt bewusst alles, was an „voll" hängt.
   Kostet nichts, der Spieler sieht es aber nur, wenn er rechnet.
2. **Text sagt es.** Tore bleiben, die Sätze nennen die Zahl des Builds („bei voller Leiste, mit Weißglut ab 200 %").
   Ehrlich, macht die Sätze länger; Schmelzpunkt ist schon der längste normale Text.
3. **Tore auf 100 % festnageln** (`C.HEAT_MAX` statt `max`). Dann sind sie von Weißglut unabhängig. **Achtung, das
   ist ein Buff, kein Fix:** Schmelzpunkt würde im Weißglut-Build Hitze wandeln, die zugleich auf der Leiste liegt
   und dort schon über Weißglut Score zahlt — dieselbe Hitze zweimal. Feuersturm N/S/SS gingen von 40 % auf 69 %
   offene Stiche. Müsste gemessen und wahrscheinlich im Satz gesenkt werden.

Ohne Empfehlung — Lesart 1 und 2 sind Geschmack, Lesart 3 ist eine Balance-Entscheidung.

**Entscheid Owner (2026-09-06): Lesart 1 — so lassen.** Die Tore von Feuersturm und Schmelzpunkt lesen weiter die
Leiste des Builds; Weißglut verschiebt sie mit, und die Texte bleiben, wie sie sind. Keine Code-Änderung, kein
Textzusatz. Damit ist Punkt 1 der Liste in F erledigt und **nicht** wieder aufzumachen: die Kopplung ist gewollt.

#### D. Die Stufenleitern: Feuer schiebt Schwellen, Blitz hebt Erträge

Es gibt zwei Arten von Leiter. Eine **Ertragsleiter** hebt, was der Skill je Auslösung zahlt (Ionenfeld +2/3/4/5,
Entladung +0,02…0,06×, Weißglut +3…6 %). Eine **Häufigkeitsleiter** lässt den Ertrag fest und senkt nur die
Schwelle oder den Takt, sodass derselbe Ertrag öfter oder früher kommt. Ausgelesen aus `FEUER_TIERS` / `BLITZ_TIERS`:

- **Feuer: 6 von 14 sind Häufigkeitsleitern** — Feuerwalze (+2 Wert), Brandmal (−2 Wert), Lauffeuer (−1 Wert),
  Schmiede (+3 Wert), Verbrennung (×1,5), Rückzündung (×1,5). Die ersten vier teilen sich sogar **dieselbe Leiter
  80/60/40/20**: dieselbe Entscheidung, viermal.
- **Blitz: 3 von 14** — Kurzschluss (×2), Blitzschlag (+1 Stapel bis Episch), Vorentladung (+0,1× bis Episch).

Die Buchstabenregel „Raritäten dürfen nicht mit den genau gleichen Werten" ist überall eingehalten — kein Skill hat
zwei identische Zeilen. Eine Häufigkeitsleiter ist trotzdem ab der Laufmitte nicht mehr spürbar, wenn die Ressource
dauerhaft über der Schwelle liegt: gemessen sitzen **43 % der Stiche bei 100 % Hitze oder darüber** (Motor Feuer,
7.23), und für die sind 80, 60, 40 und 20 dieselbe Schwelle. Feuerwalze ist der Extremfall, weil ihr Ertrag auch bei
niedriger Hitze fest bleibt: vier Stufen, viermal +2. Zum Vergleich läuft die Glühende Klinge über eine
Nenner-Leiter (+1 Wert je 40 / 30 / 25 / 20 % Hitze) und zahlt bei 100 % Hitze +2 / 3 / 4 / 5 — dieselbe Achse,
spürbare Stufen.

#### E. Textbefund (`docs/text-style-guide.md`)

Keine Selbstbezüge, keine Pfeilnotation, keine Dev-Sprache, Zahlenformat mit Komma durchgehend richtig. Offen:

1. **„Runde" statt „Durchlauf"** (§1a: „Runde" steht in der Spalte *NICHT verwenden*) in sieben Texten: Serienschutz
   Episch („einmal je Runde"), Brandmal und Lauffeuer (alle vier Stufen, „in der nächsten Runde"), Schmiede (alle
   vier, „Rundenende"), Sonnenkern („über die Runden"), Ewige Glut und Damaststahl („jede Runde"). Der Rest des
   Registers ist gemischt (engine.js und glossary.js sagen beides) — der Sweep gehört in eine eigene Runde, die
   Skilltexte sind hier aber die neuesten und sollten stimmen.
2. **Gedankenstrich** in Sonnenzorn („nicht mit der aktuellen — bis 200 %"). §3 verbietet ihn im Spielertext ohne
   gebuchte Ausnahme; er ist der einzige in allen 28 Feuer- und Blitz-Skills.
3. **„Prozentpunkte" fehlt** dort, wo gegen die 100-%-Schwelle gerechnet wird (§2, Ausnahme): Überspannung Episch
   („je 25 % Crit-Chance über 100 %"), Weißglut (alle vier, „über 100 % geben je 10 % Hitze") und Sonnenzorn.
4. **Überspannung sagt dasselbe zweimal**: „Ein Crit über dem Deckel entlädt den Überschuss: je 4× Crit-Multiplikator
   über 8× …" — „über dem Deckel" und „über 8×" sind dieselbe Bedingung. Der längste Blitz-Text (161 Zeichen).
5. **Drei Sätze / drei Effekte** in Blitzableiter Episch (siehe B.4). Alle anderen 27 Skills bleiben bei zwei Sätzen.
6. **Drei Satzanfänge für denselben Auslöser** bei Feuer: „Ein Sieg mit …" (Verbrennung), „Jeder Sieg gibt …"
   (Zunder), „Sieg: +8 Basis-Score …" (Glutstahl), „Sieg mit einer Karte ab …" (Kurzschluss, Blitz). Glutstahls
   Telegrammstil und sein Nachsatz „egal woher der Punkt kommt" fallen aus dem Register.
7. **Längste Texte** (Zeichen): Sonnenzorn 220, Sonnenkern 207, Schmelzpunkt Episch 193, Brandmal Episch 162,
   Überspannung Episch 161. Die Legendären dürfen lang sein; Schmelzpunkt Episch ist der längste normale Text.

Nicht als Befund gezählt: das geschützte Leerzeichen vor „%" (§2) fehlt in **allen** Registern gleichermaßen
(`skills.js`, `perks.js`, `families.js`, `glossary.js` haben null U+00A0) — das ist eine Repo-weite Konvention, die
`fmtPct` erst in der Oberfläche setzt, kein Skill-Befund. `node scripts/text-voice-check.mjs` ist schon vor dieser
Runde rot (englische Gebäudetexte, Zahlen-Drift) und taugt darum nicht als Tor für den Pass.

#### F. Vorschläge je Skill (Entscheid Owner, einzeln)

Reihenfolge nach Wirkung. Kein Vorschlag fällt unter 14 Skills je Fraktion, keiner fasst Glutbett oder Schmiede an,
keiner setzt einen Deckel oder Direkt-Score.

**Owner, 2026-09-06:** „1 (Regelfehler) → 2 Feuerwalze → 3 Gewitterfront/Entladung → dann Textpaket am Stück."
Damit steht die Reihenfolge. Punkt 1 ist nach der Messung in C aber kein Fehler mehr, den man wegmacht, sondern eine
Designfrage mit drei Lesarten — das Ja galt einer falschen Prämisse und wird neu eingeholt. Die Plätze bei 2 und 5
brauchen außerdem je ein Konzept vom Owner (Liste unten), bevor gebaut werden kann.

| # | Skill | Vorschlag | Empfehlung |
| --- | --- | --- | --- |
| 1 | Feuersturm, Schmelzpunkt | **Erledigt, ohne Änderung.** Als „Regelfehler" zurückgezogen (Korrektur in C): Weißglut schaltet die beiden nicht ab, sie zünden im Weißglut-Build häufiger. Übrig blieb die versteckte Kopplung; **Owner: Lesart 1, so lassen** — die Kopplung ist gewollt. | ✔ zu |
| 2 | Feuerwalze | Streichen und den Platz (SK_FIRE_08) neu belegen. Die Achse „Hitze zu Kampfwert" hat mit der Klinge schon ihren Skill; vier Stufen mit viermal +2 sind keine Leiter. Drei Konzepte in der Liste unten. | **ja**, Konzept vom Owner |
| 3 | Gewitterfront, Entladung | (a) Zusammenlegen zu einer Rampe je Leiste (Chance **und** Multiplikator, beides wächst mit der Stufe), der freie Platz bekommt einen Blitz-Skill auf einer unberührten Achse. (b) Nur das Episch-Extra der Gewitterfront tauschen, damit es nicht Entladung Normal ist. | (a); (b) ist der billige Notausgang |
| 4 | Serienschutz | Auslöser wechseln. Er ist der letzte Skill an der Niederlage-Bedingung, die der Owner in 7.24 zweimal abgeschafft hat, und misst seit 7.6 nie besser als „schadet". Vorschlag: Ladung schützt die Serie nicht mehr, sondern **verlängert** sie („Ab Serie N zählt jeder Sieg doppelt für die Serie" o. Ä.) — Vorschläge nach dem Ja. | **ja**, Richtung offen |
| 5 | Blitzfänger | Streichen und den Platz (SK_LIGHTNING_11) neu belegen; der Dauerwert je Leiste (Passiv, 7.24) und Ionenfeld decken die Wertachse. Der Platz ist der beste Kandidat für Blitz' erste Formation-, Gegnerdeck- oder Durchlaufende-Mechanik. | **ja**, Konzept vom Owner |
| 6 | Brandmal, Lauffeuer | Leitern trennen statt zusammenlegen: Brandmal behält die Schwellenleiter (80/60/40/20, Ertrag fest), Lauffeuer bekommt eine feste Schwelle und laddert **Reichweite und Wert**. Dann ist eines der Schwellen-Skill, das andere der Breiten-Skill. | ja, kleiner Eingriff |
| 7 | Blitzableiter | Auf einen Effekt zurückbauen: nur „Crit zu Ladung", Leiter über die Rate und die Menge (z. B. jeder 3. / jeder 2. / jeder / jeder Crit +2). Der Leisten-Rückfluss geht an Reststrom, der Satz „Sieg ohne Crit" an Spannungsstau. | ja |
| 8 | Reststrom | Episch ohne Leistenlänge (das ist Donnergotts Kopfzeile): stattdessen ein sehr starker Startwert (§1 erlaubt „oder ist sehr stark"). Nimmt Vorschlag 7 den Rückfluss auf, wächst Reststrom ohnehin. | ja |
| 9 | Verbrennung, Rückzündung | Eine der beiden bekommt eine **Ertragsleiter** statt der Bedingungsleiter — Vorschlag: Rückzündung feste Takt-Schwelle, Faktor 1,3 / 1,4 / 1,5 / 1,6. Dann teilen sie nicht mehr die Zahl ×1,5. | ja |
| 10 | Glutstahl | Kein Mechanikwechsel vorgeschlagen (Basis-Score ist eine gebrauchte Rolle), aber der Satz gehört ins Register: „Ein Sieg zählt +8 Basis-Score je Punkt Kampfwert über dem Grundwert der Siegkarte." Wert offen, misst −62 %. | Text ja, Wert später |
| 11 | Zunder | Kein Vorschlag. Einziger Hitze-Erzeuger neben dem Passiv, strukturell nötig; die Messung leidet daran, dass die Leiste ohnehin voll ist (7.8). Wachpunkt. | — |
| 12 | Damaststahl (L) | Unterscheidung vom (bleibenden) Schmiede-Skill ist eine eigene Runde, kein Text-Pass. Vorgemerkt. | später |
| 13 | Texte | Sammelpaket: „Runde" → „Durchlauf" (7 Stellen), Gedankenstrich in Sonnenzorn, „Prozentpunkte" in Überspannung / Weißglut / Sonnenzorn, Überspannung kürzen, Glutstahl ins Register. Reine Textänderung, `npm run loc:export` und die Textwächter in `test/skills.test.js`. | **ja**, in einem Rutsch |

**Konzepte für die zwei freien Plätze** (SK_FIRE_08, SK_LIGHTNING_11), falls 2 und 5 ein Ja bekommen — keines
gemessen, alle auf Achsen, die heute kein normaler Skill berührt:

| Platz | Konzept | Einzeiler | Achse |
| --- | --- | --- | --- |
| Feuer | **Brandschneise** | Ein Sieg an einer Position, an der du schon einmal gewonnen hast, zählt +N % Score. | eigene Reihenfolge / Position |
| Feuer | **Nachglut** | Die ersten N Stiche nach dem Durchlaufwechsel geben doppelte Hitze. | Zeitfenster nach einem Ereignis |
| Feuer | **Aschenregen** | Am Durchlaufende brandmarkt die Hitze über 50 % das ganze Gegnerdeck mit −1 Wert je 25 %. | Durchlaufende (heute nur Schmiede) |
| Blitz | **Erdung** | Jeder N. Crit senkt die geschlagene Gegnerkarte dauerhaft um 1 Wert. | Gegnerdeck (Blitz hat dort nichts) |
| Blitz | **Sammelschiene** | Nachbarn einer ionisierten Karte in derselben Formation erhalten bei jeder vollen Leiste +1 Stapel. | Formation (heute nur Resonanz, L) |
| Blitz | **Nachtladung** | Am Durchlaufende wird die angebrochene Leiste nicht geleert, sondern verdoppelt. | Durchlaufende |

**Was der Pass nicht anfasst:** Glutbett, Schmiede (Owner), Kettenblitz, Blitzschlag, Kurzschluss, Vorentladung,
Ladungsserie, Ionenfeld, Klinge, Weißglut, Feuerlinie und alle acht Legendären außer Damaststahl (vorgemerkt) und den
Texten von Sonnenzorn und Sonnenkern.

### 7.27 Feuerwalze raus, Brandschneise rein: der Auslöser muss knapp bleiben (2026-09-06, umgesetzt)

Owner: Punkt 2 der Liste in 7.26 F, Konzept **Brandschneise** — „aber bedenke das später in der Runde mit hohen
Werten alle Positionen gewonnen werden."

**Der Einwand ist gemessen richtig, und zwar schärfer als erwartet** (`sim/probes/positions-won.mjs`, Feuer mono,
100 Läufe, Ø über die Läufe; wie viele der 40 Positionen im Lauf bis dahin mindestens einmal gewonnen wurden):

| nach Durchlauf | 1 | 3 | 5 | 10 | 22 | 41 |
| --- | --- | --- | --- | --- | --- | --- |
| je schon gewonnen | 17,7 | 28,8 | 32,7 | 36,4 | 39,0 | **40,0 / 40** |

Die Bedingung „an dieser Position schon einmal gewonnen" siebt **drei Durchläufe lang**, danach ist sie eine
Formalität, und ab Durchlauf 41 ist sie in jedem Lauf immer wahr. Der Skill wäre in der zweiten Laufhälfte ein
bedingungsloser „+X % Score auf jeden Sieg" — genau die Falle, die 7.24 auf der anderen Seite (Niederlage-Bedingung)
schon zweimal geräumt hat. Ein Auslöser, der mit der Stärke des Decks verschwindet, taugt hier nicht; die
knappe Menge muss **strukturell** knapp sein, nicht „ist es schon passiert".

Drei Bauformen, alle mit dem Namen und dem Bild des Owners (eine Schneise, die durch das Deck gebrannt ist und der
man im nächsten Durchlauf folgt). Werte sind Platzhalter für den Sweep nach dem Ja.

**(a) Feste Breite, jeden Durchlauf neu geschlagen — Empfehlung.**
„Deine N größten Siege eines Durchlaufs schlagen eine Schneise. Im nächsten Durchlauf zählt ein Sieg auf diesen
Positionen ×1,5 Score." Stufen über die Breite: N = 3 / 4 / 5 / 6; Episch dazu ein Extra (z. B. die Schneise hält
zwei Durchläufe). Die Menge ist per Konstruktion knapp — egal wie stark das Deck wird, es sind N von 40 Positionen,
also 8–15 % der Stiche. Sie wandert jeden Durchlauf, und die **Aufstellungsphase wird zur Entscheidung** (starke
Karten auf die Schneise legen) — die Achse „eigene Reihenfolge", die heute kein normaler Skill berührt. Aufwand:
Positionsliste über die Durchlaufgrenze tragen (wie die Brände es schon tun) und am Durchlaufende die N größten
Vorsprünge nehmen — beides liegt in `fireCycleEnd`.

**(b) Zusammenhängendes Band.** „Der Sieg mit dem größten Vorsprung eines Durchlaufs schlägt eine Schneise: seine
Position und ihre N Nachbarn zählen im nächsten Durchlauf ×1,5 Score." Thematisch am nächsten am Bild (eine Bahn,
kein Streuselmuster) und ebenso knapp, aber die Nachbar-Sprache steht schon bei Lauffeuer — dort auf dem Gegnerdeck,
hier auf den eigenen Positionen.

**(c) Kette je Position.** „Ein Sieg zählt +0,5 % Score je Durchlauf in Folge, den du an dieser Position gewonnen
hast." Sättigt nicht als Bedingung, wird aber spät zur unbegrenzten Rampe: 40 Positionen mit 40er-Ketten. Auf den
offenen Schwanz-Wachpunkt (7.25, gierig p95 803M) würde das obendrauf kommen. Nur mit sehr kleinem Satz, und ich
würde es nicht empfehlen.

**Empfehlung (a)**, weil die Knappheit nicht von der Deckstärke abhängt und die Aufstellungsphase etwas zu
entscheiden bekommt. Nach dem Ja: bauen, Satz und Breite im Sweep, gierig messen (zwei Läufe, weil die Haltequote
eines neuen Skills anfangs niedrig ist), Parität im Duell prüfen.

**Feuerwalze** (SK_FIRE_08) geht dafür raus: vier Stufen mit viermal +2 Wert, gemessen tot in 7.6, 7.9 und 7.13, und
die Glühende Klinge deckt dieselbe Achse bei 100 % Hitze mit +2 / 3 / 4 / 5 ab. Die ID bleibt, das Emblem wird mit
`git mv` umbenannt, Feuer bleibt bei 14.

#### Entscheid und Umsetzung (Owner, 2026-09-06: „feste Breite, Variante a")

**Brandschneise** auf SK_FIRE_08, Feuerwalze gestrichen, Emblem umbenannt (`SK_FIRE_08_brandschneise.webp`).
Stufen über die Breite: **3 / 4 / 5 / 6 Positionen**, Faktor **×2,5** (Sweep unten), Episch hält die Schneise zwei
Durchläufe. Text: „Deine 3 Siege mit dem größten Vorsprung eines Durchlaufs schlagen eine Schneise: im nächsten
Durchlauf zählt ein Sieg auf diesen Positionen ×2,5." Schlüsselbegriffe `position` und `wertvorsprung` — der erste
Feuer-Skill ohne Hitze-Tor und der erste normale Skill auf der Achse „eigene Reihenfolge".

**Technische Entscheide.** Der Zustand liegt im Hitze-Substate: `laneWins` sammelt je Durchlauf `{ p, m }` (Position,
Vorsprung) — nur wenn der Skill gehalten wird, sonst bleibt die Liste leer; `lanes` hält die Schnitte, neuester
zuerst, höchstens zwei (mehr liest keine Stufe). Der Schnitt fällt in `fireCycleEnd`: die `width` größten Vorsprünge,
bei Gleichstand die kleinere Position (Determinismus §9). `schneiseMult` ist ein Faktor im Feuer-Stack neben Hitze-
Multiplikator, Verbrennung, Feuersturm, Rückzündung und Feuerlinie; die Engine reicht `pos` in `fireOnWin`. Ohne den
Skill verfällt eine liegende Schneise — ein Wiedererwerb fängt leer an. `fireValueBonus` verliert damit seinen
`lastResult`-Zweig (das war die Feuerwalze), die Hitzeleiste tauscht ihr Abzeichen.

**Sweep (Duell, 100 Läufe, Feuer mono / Floor Feuer ÷ Blitz).** Blitz mono steht unverändert bei 13,0M.

| Satz / Breite | ×1,5 · 3–6 | ×2 · 3–6 | **×2,5 · 3–6** | ×3 · 3–6 | ×1,5 · 5–8 | ×2 · 5–8 |
| --- | --- | --- | --- | --- | --- | --- |
| Feuer mono | 11,82M | 12,42M | **12,97M** | 13,41M | 12,09M | 12,91M |
| Floor | 0,91× | 0,96× | **1,00×** | 1,03× | 0,93× | 1,00× |

Gesetzt ist **×2,5 bei 3–6 Positionen**: die Breite ist die vom Owner entschiedene Leiter, der Faktor der freie
Regler, und die Parität steht damit bei 1,00× (7.25: 1,09×). Die Breite zu heben zahlt schlechter als der Faktor
(5–8 Positionen bei ×1,5 bringen nur 0,93×) und verwässert die Knappheit, die der Sinn der Bauform ist.

**Gierig, zwei Läufe** (150 Läufe nach 1000 Explore, einmal Seeds 1..1150, einmal 5000..6149 — zwei Läufe, weil die
Haltequote eines neuen Skills anfangs niedrig ist und die Explore-Tabelle zwischen den Läufen ±20 % schwankt):

| | Lauf A | Lauf B |
| --- | --- | --- |
| Median gierig | 105,2M (Ø 12,8 Skills) | 109,6M (Ø 13,0 Skills) |
| Brandschneise gehalten | 11 % | 15 % |
| Ablation (Median-Δ) | −3,8M, typ. −5 %, win 50 % | +0,04M, typ. 0 %, win 52 % |

**Brandschneise ist ein Füller** — sie wird genommen, trägt nicht und schadet nicht; die Stufenlifts (N 0,98 · S 0,66
· SS 0,43 · E 0,53 bzw. N 0,59 · S 1,02 · SS 0,76 · E 0,70) sind bei dieser Haltequote Rauschen. Das ist der übliche
Startpunkt eines neuen Skills. Dass die Zahlen zwischen den Läufen springen, zeigt derselbe Lauf an der Feuerlinie:
in A „tot" (−2 %, in 11 %), in B „stark" (+88 %, in 8 %) — Wertetabelle, nicht Skill. Träger sind in beiden Läufen
Sonnenkern, Klinge, Doppelentladung und Resonanz. Der gierige Median liegt über 7.25 (77,8M), aber Mediane
verschiedener Explore-Läufe sind nicht vergleichbar; die Niveau-Aussage macht das Duell.

**Was der Tausch kostet.** Die Feuerwalze war im Fraktions-Build kein toter Skill, sondern ein Dauerbonus: „+2 Wert
für die nächste Karte nach einem Sieg" liegt bei 70 % Siegquote fast immer an, hebt die Siegquote weiter und zahlt
darüber in Hitze und Serien. Ohne Ersatz fiel Feuer mono von 14,2M auf 11,8M (−17 %); der Zufallsspieler von 4,08M
auf 3,27M (200 Seeds). Ein Score-Faktor auf 3 von 40 Positionen ist linear und holt das nicht eins zu eins zurück —
×2,5 stellt die Parität her, das absolute Niveau bleibt unter 7.25. **Das ist die gemessene Folge der
Owner-Entscheidung, kein Nebeneffekt:** ein Skill, der immer an ist, wurde gegen einen getauscht, der 8–15 % der
Stiche trifft. Das Sim-Band ist darauf neu zentriert.

### 7.28 Crit über 100 % und ein Skill auf der Ionisierung (2026-09-06, Befund und Vorschläge)

Owner, zwei Punkte: „wir müssen irgendwie mit Crit über 100 % umgehen — eventuell, dass jeder Prozentpunkt über
100 % stattdessen 0,01 Crit-Multiplikator gibt" und „Überspannung mag ich vom Design nicht, da brauchen wir was
anderes; eventuell etwas, das mit den Ionisierungen auf den Karten wirkt. Haben wir etwas, was kartenabhängig aus
ihrer Ionisierung Crit macht?"

#### A. Was es heute gibt (Antwort auf die Frage)

**Kartenabhängig Crit aus Ionisierung gibt es — aber nur als Systemregel und nur auf den Multiplikator, nicht als
Crit-Chance und nicht als normaler Skill:**

| Quelle | Was sie tut | Art |
| --- | --- | --- |
| Systemregel (`ION_CRIT_MULT_PER_STACK`) | jeder Stapel auf der Siegkarte gibt **+0,15× Crit-Multiplikator** | Passiv, immer an |
| Donnergott (L) | dieselben Stapel zählen **+0,25×** statt 0,15× | Legendär |
| Kurzschluss | ab N Stapeln zählen die Stapel der Karte **doppelt** — das verdoppelt auch ihren Crit-Multiplikator-Anteil | Skill, Schwelle |
| Kettenblitz, Blitzschlag | erzeugen Stapel (Tiefe), zahlen selbst keinen Crit | Skill |
| Blitzfänger | Stapel zu Kampfwert | Skill |

**Frei ist die Richtung „Stapel → Crit-Chance".** Kein Skill und keine Regel macht das heute; die Chance kommt aus
dem Passiv (4 % je Blitz-Skill), Gewitterfront und Ladungsserie. Der Platz SK_LIGHTNING_04 ist genau dafür der
richtige.

#### B. Wie viel Crit über 100 % es überhaupt gibt (gemessen)

Zwei Sonden, je 100 Läufe: `overcrit-engine.mjs` (neu — zählt im echten Lauf die Stiche, deren Crit-Chance am
Anschlag steht, plus Multiplikator und Deckel-Anteil) und `overcrit-probe.mjs` (Blitz-Anteil der Rohchance, also der
Überschuss selbst; Untergrenze, ohne Perk-Crit).

| Blitz mono | R 1–10 | 11–20 | 21–30 | 31–40 | 41–50 |
| --- | --- | --- | --- | --- | --- |
| Stiche mit Crit-Chance ≥ 100 % | 0 % | 0 % | 0 % | 3 % | **15 %** |
| Ø Crit-Multiplikator | 2,37× | 2,48× | 2,72× | 3,59× | 5,41× |
| Crits am Deckel (8×) | 0 % | 0 % | 0 % | 4 % | **27 %** |
| Ø Überschuss, wo über 100 % | – | – | – | 38 pp | **70 pp** |

Im Zufallsmix dasselbe Bild, schwächer: 1 % / 6 % der Stiche, dort aber Ø 102 pp Überschuss.

**Lesart.** Der Überschuss ist ein reines Spätspiel-Ereignis, dann aber groß. Bei **0,002** je Prozentpunkt sind
70 pp **+0,14×** auf einen Multiplikator von 5,4× — rund 2,5 %, praktisch nichts; die Regel steht heute nur auf dem
Papier. Bei **0,01** (Owner-Vorschlag) sind es **+0,7×**, im Mix +1,0×. Ein Teil davon frisst der Deckel: in den
Runden 41–50 stehen schon 27 % der Crits bei 8×.

#### C. Sweep der Systemregel (Duell, 100 Läufe): sie kann unter dem Deckel kaum etwas bewirken

`SIM_OVERCRIT_MULT_PER_PP` 0,002 (Ist) / 0,005 / 0,01 (Vorschlag) / 0,02. Feuer mono steht in allen vier Läufen
unverändert bei 12,97M — die Regel betrifft nur Builds mit Crit über 100 %.

| Satz je Prozentpunkt | 0,002 | 0,005 | **0,01** | 0,02 |
| --- | --- | --- | --- | --- |
| Blitz mono, Median | 12,97M | 12,97M | **12,98M** | 13,02M |
| Floor Feuer ÷ Blitz | 1,00× | 1,00× | **1,00×** | 1,00× |
| Mean | 0,65× | 0,65× | 0,66× | 0,67× |

**Der Fünffache des Satzes bewegt den Median um 0,1 %, der Zehnfache um 0,4 %.** Der Grund steht in B: der
Überschuss entsteht genau dort, wo der Multiplikator ohnehin am Deckel steht — in den Runden 41–50 sitzen 27 % der
Crits auf 8×, und was die Regel oben drauflegt, schneidet der Deckel wieder ab. **Das korrigiert die Erwartung,
mit der ich in diese Messung gegangen bin:** „Überschuss → Multiplikator" ist kein Kreislauf, sondern eine Sackgasse,
solange der Deckel bei 8 steht (Owner-Entscheid 7.22: er bleibt).

**Was daraus folgt.** 0,01 ist unbedenklich und darf gesetzt werden — es kostet nichts und macht die Regel in den
Builds sichtbar, die noch unter dem Deckel sind. Es löst das Gefühl „Crit über 100 % ist verschenkt" aber nicht. Wer
den Überschuss wirklich spüren will, muss ihn in eine Währung geben, die der Deckel nicht abschneidet: **Stapel**
(Vorschlag 3 unten) oder **Ladung** (das tut Überspannung heute, Episch). Das ist die eigentliche Entscheidung —
Satz oder Währung.

#### D. Vorschläge für SK_LIGHTNING_04 (Entscheid Owner, nichts umgesetzt)

Überspannung (Überschuss über dem Deckel → Ladung) geht raus, die ID und das Emblem bleiben, Blitz bleibt bei 14.
Werte sind Platzhalter für den Sweep nach dem Ja; die gemessene Stapel-Tiefe ist die Bezugsgröße (Stapel-Build am
Laufende Ø 12,6 je Karte, §7.18; tiefste Karte 11 bis 94 je nach Stufe, §3.5).

| # | Name | Einzeiler | Warum / Risiko |
| --- | --- | --- | --- |
| 1 | **Zündschnur** | „Jeder Stapel auf der gespielten Karte gibt +1 % Crit-Chance auf diesen Stich." Leiter 0,5 / 1 / 1,5 / 2 % je Stapel. | **Empfehlung.** Die einzige freie Richtung (Stapel → Chance) und die direkte Antwort auf die Frage; wirkt ab dem ersten Stapel, nicht erst ab Runde 40. Macht die Ziehreihenfolge wichtig: die tiefen Karten crittet man, die flachen nicht. Risiko: tiefe Karten stehen spät über 100 % — und nach C verpufft dieser Überschuss am Deckel, wenn nicht 3 daneben steht. Regler: Satz je Stapel. |
| 2 | **Tiefenschlag** | „Deine tiefste Karte crittet immer." Leiter: die tiefste / die zwei / drei / vier tiefsten. | Dramatisch und sofort lesbar, koppelt an Kettenblitz. Risiko: garantierte Crits sind spät sehr stark, und es trifft nur N von 40 Positionen — schwankt stark mit der Ziehreihenfolge. |
| 3 | **Überladung** | „Crit-Chance über 100 % ionisiert: je 40 Prozentpunkte darüber erhält die Siegkarte +1 Stapel." Leiter 50 / 40 / 30 / 20 pp. | Verwertet denselben Überschuss wie C, aber in Tiefe statt Multiplikator — der Überschuss wird dauerhaft. Risiko: hängt wie Überspannung am Spätspiel, also wieder ein Skill, der 30 Runden nichts tut. |
| 4 | **Ladungsbogen** | „Crittet eine ionisierte Karte, crittet die nächste Karte ebenfalls." | Kette statt Rampe, sichtbarer Moment. Aber: Crit → Crit, nicht Ionisierung → Crit; beantwortet die Frage nur halb. |
| 5 | ~~Ionenlast~~ | „Jeder Stapel gibt zusätzlich +0,05× Crit-Multiplikator." | **Nicht empfohlen** — das ist die Systemregel in groß und Donnergotts Kopfzeile; genau die Dublette, die 7.26 B als Befund führt. |

**Empfehlung: 1 (Zündschnur) für den Platz, und C auf 0,01** — der Satz ist gratis, aber er ist nicht die Antwort auf
„Crit über 100 % umgehen"; das sagt C.

**Die eine Frage, die dabei offen bleibt und beim Owner liegt:** soll der Überschuss über 100 % *überhaupt* eine
eigene Auszahlung haben? Drei Wege, sich schließen gegenseitig nicht aus:

- **nur der Satz (C, 0,01)** — billig, ehrlich klein, das Thema bleibt kosmetisch;
- **Vorschlag 3 auf dem Platz** — der Überschuss wird Tiefe, also dauerhaft, aber der Skill schläft 30 Runden;
- **Vorschlag 1 auf dem Platz und der Überschuss bleibt am Deckel** — dafür hat Blitz endlich einen Skill, der
  Ionisierung in Crit übersetzt, und die Deckel-Frage wird eigenständig entschieden (Owner 7.22: der Deckel bleibt
  bei 8 — solange das gilt, ist die Sackgasse gewollt).

Nach dem Ja wird gebaut, der Satz gesweept, gierig zweimal gemessen (neue Skills starten mit niedriger Haltequote)
und die Parität im Duell geprüft. Wachpunkt bleibt der Blitz-Schwanz (7.25: gierig p95 803M).

#### E. Entscheid und Umsetzung (Owner, 2026-09-06)

**Lichtbogen** ersetzt Überspannung auf SK_LIGHTNING_04 (Emblem umbenannt, Blitz bleibt bei 14). Der Owner hat aus
der Liste Vorschlag 1 gewählt, aber den Arbeitsnamen verworfen: „Zündschnur klingt zu sehr nach Feuer-Skill."
Gesetzt: **„Jeder Stapel auf der gespielten Karte gibt +X % Crit-Chance auf diesen Stich"**, Leiter
**0,5 / 1 / 1,5 / 2 %** je Stapel — Startwerte, **nicht gemessen**.

**Technische Entscheide.** `lightningCritChance` bekommt die gespielte Karte als fünftes Argument; die Engine
reicht `pCardR` hinein, also die Lesesicht **mit** Resonanz-Summe. Gezählt wird über `effectiveStacks` — Kurzschluss
verdoppelt die Stapel hier genauso wie beim Stapel-Score und beim Crit-Multiplikator; eine eigene Zählung wäre die
dritte Lesart derselben Größe. Mit Überspannung fällt der letzte Leser des ungedeckelten Multiplikators weg:
`critMultRaw` ist aus der Engine raus, `chargeGainOnWin` verliert `critMultRaw`/`rawCrit`, und was über dem
8×-Deckel liegt, verfällt wieder. Glossar „Kaskade" nennt jetzt den Lichtbogen statt der Überspannung.

**Offen für die Messrunde** (auf Ansage des Owners, nicht vorher): Satz je Stapel, Wechselwirkung Lichtbogen ×
Kurzschluss × Kettenblitz (Tiefe zahlt jetzt dreifach: Score, Multiplikator, Chance), und ob der Blitz-Schwanz
dadurch weiter läuft (7.25: gierig p95 803M).

#### F. Messung des Lichtbogens (2026-09-06, auf Ansage des Owners)

**Der Duell-Median taugt für eine Crit-CHANCE-Änderung nicht — das ist der erste Befund.** Sweep über den Satz
(je 100 Läufe, Feuer mono steht in allen dreien bei 12,97M):

| Satz je Stapel | halb (0,25–1 %) | **Startwert (0,5–2 %)** | doppelt (1–4 %) |
| --- | --- | --- | --- |
| Blitz mono, Median | 13,36M | **10,31M** | 15,31M |
| Floor Feuer ÷ Blitz | 0,97× | **1,26×** | 0,85× |
| p90 / p95 | 78,0 / 92,9M | 83,0 / 117,5M | 83,1 / 116,8M |

Die Reihe ist **nicht monoton** — mehr Crit-Chance müsste den Median heben, nicht senken und dann wieder heben.
Kontrolllauf mit anderem Seed-Satz (500..599), unveränderter Stand: Blitz mono **12,96M statt 10,31M**, Feuer mono
14,23M statt 12,97M. Der Median wandert zwischen Seed-Sätzen also genauso weit wie zwischen den Sweep-Punkten.
Grund: der Crit-Wurf steht je (Runde, Position) fest, aber eine andere Chance **kippt andere Stiche zu Crits** —
damit läuft der ganze Rest des Laufs anders (Ladung, Stapel, Serien). Das trifft nur Chance-Änderungen; der Sweep
in C (0,002 → 0,02 auf den **Multiplikator**) war stabil, weil er keinen einzigen Stich umkippt. **Regel für
später: Crit-Chance-Regler über die gepaarte gierige Ablation messen, nicht über den Duell-Median.**

**Gierig (der Schiedsrichter), Startwerte, 150 Läufe nach 1000 Explore.** Median 69,8M, Ø 11,0 Skills.

| Skill | gehalten | Ablation | Lesart |
| --- | --- | --- | --- |
| **Lichtbogen** | **84 %** | +2,6M, typ. **+3 %**, win 53 % | **Füller** — fast jeder nimmt ihn, tragen tut er nicht |
| Blitzschlag | 94 % | +17,7M, +31 % | stark (war Füller) |
| Kurzschluss | 95 % | +7,3M, +25 % | stark (war „schadet") |
| Kettenblitz | 89 % | +6,7M, +22 % | stark |
| Resonanz (L) | 33 % | +131,8M, +238 % | Träger |
| Doppelentladung (L) | 23 % | +42,7M, +90 % | Träger |

**Lesart.** Der Lichtbogen selbst ist ein Füller, aber er hebt das ganze Tiefen-Bündel: Tiefe zahlt jetzt dreifach
(Stapel-Score, Crit-Multiplikator, Crit-Chance), und genau die Skills, die Tiefe erzeugen, sind mit ihm nach oben
gegangen — Blitzschlag, Kurzschluss und Kettenblitz stehen erstmals gemeinsam auf „stark", Resonanz zieht davon.
Der Schwanz bleibt der Blitz-Schwanz, aber nicht schlimmer als vorher (gierig p95 798M gegen 803M in 7.25).

**Entscheid Owner (2026-09-06): „so lassen, ist fein" — die Startwerte 0,5 / 1 / 1,5 / 2 % je Stapel sind
gesetzt.** Empfehlung war dieselbe: Er wird genommen, ohne zu tragen, und die
Rückkopplung liegt bei den Tiefen-Skills, nicht bei ihm — das ist die Rolle, die der Platz haben sollte. Wenn er
sich zu blass anfühlt, ist der doppelte Satz der Regler; dann aber gierig neu messen, nicht im Duell.

### 7.29 Blitz springt zu spät an (2026-09-09, Owner-Ansage) — Befund, nichts umgesetzt

Owner: „wir müssen etwas Blitz anlassen. aktuell ist es zu langsam crit gut zum laufen zu bekommen und
ionisierungen zu stapeln ohne einen legendären. schau die Verteilung der skillnutzlichkeit an und auch ob wir am
passive Bonus drehen müssen." Diese Runde **misst nur** — am Code der Fraktion ist nichts geändert.

Vier neue Sonden tragen die Zahlen: `sim/probes/blitz-ramp.mjs` (wann der Motor anspringt),
`blitz-critsource.mjs` (woher die Crit-Chance kommt), `faction-pacing.mjs` (wann eine Fraktion verdient) und
`lightning-socket-hook.mjs`, der eine **nicht gebaute** Passiv-Form messbar macht, ohne `src/` anzufassen.

#### A. Die Rampe: der Kreis schließt sich in den ersten sieben Runden kein einziges Mal

`blitz-ramp.mjs`, 100 Läufe, Welt nur Blitz, Fraktions-Policy (zufällige Blitz-Picks). Die 62 Läufe **ohne
Legendäres**:

| Runden | Blitz-Skills | Ø Crit-Chance | Leisten kumuliert | Ø Stapel je Karte | ionisierte Karten | Siege mit Stapel |
| --- | --- | --- | --- | --- | --- | --- |
| 1–10 | 1,8 | 8,4 % | 1 | 0,0 | 1 % | 1 % |
| 11–20 | 4,2 | 20,8 % | 5 | 0,1 | 9 % | 12 % |
| 21–30 | 6,8 | 34,4 % | 9 | 0,4 | 27 % | 31 % |
| 31–40 | 9,2 | 49,6 % | 17 | 1,3 | 52 % | 59 % |
| 41–50 | 11,8 | 71,6 % | 39 | 3,4 | 77 % | 82 % |

Meilensteine als Median-Runde: **erste Ionisierung Runde 8**, fünfte Leiste Runde 20, zehnte Leiste Runde 28;
Crit-Chance ≥ 25 % ab Runde 14, ≥ 50 % ab Runde 33.

**Das ist die gemessene Fassung des Owner-Befundes.** Blitz hat 50 Runden à 40 Stiche. Die erste Runde gibt den
ersten Skill, also 4 % Crit-Chance; bei rund 26 Siegen je Runde ist das ein Crit je Runde und damit **zehn Runden
für die erste volle Leiste**. Skills aus den Runden 5 und 9 drücken das auf acht. Bis dahin ist Blitz eine Fraktion
ohne Fraktionsmechanik: die Ladungsleiste steht sichtbar auf dem Schirm, und es passiert nichts.

Die Spalte „Siege mit Stapel" ist die härteste: sie sagt, wie oft die Ionisierung überhaupt **ausgezahlt** wird —
die Karte, mit der man gerade gewinnt, trägt Stapel. Das erste Laufdrittel liegt bei 1 %, die Laufmitte bei 31 %.

#### B. Bis Runde 30 ist das Passiv die Crit-Chance

`blitz-critsource.mjs`, 80 Läufe, dieselbe Welt; die 51 Läufe ohne Legendäres. Rohsumme je Quelle, vor der
100-%-Klemme:

| Runden | Passiv | Gewitterfront | Ladungsserie | Lichtbogen | Rest (Perks) | angezeigt |
| --- | --- | --- | --- | --- | --- | --- |
| 1–10 | 7,3 % | 0,0 % | 0,0 % | 0,0 % | 1,2 % | 8,5 % |
| 11–20 | 16,9 % | 0,5 % | 0,1 % | 0,0 % | 3,3 % | 20,8 % |
| 21–30 | 27,3 % | 1,8 % | 0,2 % | 0,2 % | 4,7 % | 34,2 % |
| 31–40 | 37,0 % | 5,7 % | 0,5 % | 0,8 % | 6,2 % | 49,4 % |
| 41–50 | 47,4 % | 19,6 % | 2,0 % | 3,3 % | 7,0 % | 72,3 % |

**Blitz hat keinen einzigen Skill, der flach Crit-Chance gibt.** Die drei Chance-Skills hängen alle an einer Größe,
die es früh nicht gibt: Gewitterfront an vollen Leisten, Ladungsserie an der Serie, Lichtbogen an Stapeln auf der
gespielten Karte. Zusammen tragen sie in den ersten zwanzig Runden **0,6 Prozentpunkte**. Damit ist die Antwort auf
die Owner-Frage „müssen wir am passiven Bonus drehen" formal beantwortet: In der ersten Laufhälfte **ist** der
passive Bonus der einzige Regler, den es gibt.

#### C. Ohne Legendäres — und im Vergleich mit den anderen drei Fraktionen

`faction-pacing.mjs`, 60 Läufe je Fraktion, mono-Welt, Median-Score zum Rundenstand:

| Fraktion | nach R 20 | nach R 30 | nach R 40 | Ende | Legendär-Quote | Median mit ÷ ohne |
| --- | --- | --- | --- | --- | --- | --- |
| Feuer | 0,39M | 1,21M | 4,35M | 16,99M | 42 % | **1,3×** |
| **Blitz** | 0,43M | **1,12M** | **2,98M** | 14,85M | 35 % | **6,9×** |
| Eis | 0,53M | 1,96M | 6,01M | 16,35M | 30 % | 3,9× |
| Pflanze | 0,39M | 1,73M | 5,58M | 19,31M | 42 % | 8,5× |

Blitz steht nach Runde 30 und nach Runde 40 **als letzte der vier** — nach Runde 40 bei 2,98M gegen 6,01M der
Eis-Fraktion. Ohne Legendäres endet Blitz bei 8,10M, mit einem bei 55,81M. (Die Legendär-Spalte ist **beobachtet,
nicht gepaart**: die Gruppe ist, wem eines angeboten wurde und wer es genommen hat. Gepaart, `--mode legendaries`
in der Blitz-Welt, Phase 7 von 13: Resonanz typ. +840 %, Hochspannung +400 %, Doppelentladung +142 % — und in 75 %
der Basisläufe hält der gierige Spieler in dieser Welt ohnehin schon eines.)

Der Grund steht in A: zwei der drei Legendären greifen **genau** an der Stelle, an der die Fraktion ohne sie nichts
hat. Doppelentladung macht aus jeder Ionisierung fünf Stapel statt einem; Resonanz lässt die gespielte Karte mit
den Stapeln ihrer Formationspartner kämpfen. Beide reparieren die dünne Streuung aus A — und beide sind legendär.
(Das dritte, Hochspannung, hebt jede gehaltene Stufe um drei und wirkt damit auf einer anderen Achse: es macht die
Leiter bezahlbar, die der Angebotswurf sonst nur zu 3 % ausgibt.)

#### D. Verteilung der Skillnutzlichkeit

Der Schiedsrichter ist die gepaarte gierige Ablation (§7.22). Gemessen in der Welt, nach der der Owner fragt —
`SIM_SKILL_LEGENDARY_PER_SLOT=0 npm run sim -- --mode skills --arch lightning --explore 800 --runs 120`.
Gierig-Median 35,2M, Siegquote 65 %, Ø **13,0** Skills:

| Skill | gehalten | Median-Δ | typ. | besser MIT | Flag |
| --- | --- | --- | --- | --- | --- |
| Blitzableiter | 82 % | +13,3M | **+100 %** | 71 % | stark |
| Gewitterfront | 100 % | +7,3M | +23 % | 60 % | |
| Ionenfeld | 82 % | +7,0M | +42 % | 70 % | stark |
| Kurzschluss | 98 % | +2,7M | +10 % | 63 % | |
| Reststrom | 90 % | +2,4M | +16 % | 62 % | |
| Blitzfänger | 96 % | +2,1M | +15 % | 61 % | |
| Blitzschlag | 86 % | +2,0M | +13 % | 69 % | |
| Kettenblitz | 92 % | +1,0M | +5 % | 62 % | |
| Vorentladung | 98 % | +0,5M | +3 % | 55 % | tot |
| Ladungsserie | 92 % | −0,9M | −1 % | 44 % | tot |
| Lichtbogen | 89 % | −1,2M | −7 % | 37 % | schadet |
| Spannungsstau | 93 % | −2,3M | −10 % | 27 % | schadet |
| Entladung | 100 % | −3,3M | −10 % | 36 % | schadet |
| **Serienschutz** | 99 % | **−30,1M** | **−47 %** | **21 %** | schadet |

**Wie diese Tabelle zu lesen ist.** Die Slots sind unbegrenzt, es gibt 13 Skill-Phasen und 14 normale Blitz-Skills
— der Spieler hält also **13 von 14**, und ein verbotener Skill wird schlicht durch den ersetzt, den er sonst
ausgelassen hätte. Beide Arme halten dieselbe Zahl Skills, das Passiv ist identisch, und die Spalte summiert sich
konstruktionsbedingt auf ungefähr null (gemessen −0,6M). Die Tabelle ist damit **keine Aussage darüber, ob ein
Skill trägt, sondern eine Rangliste innerhalb der Fraktion**: was ist dieser Skill wert gegen den, den man
stattdessen nimmt. Genau das ist die Frage nach der Nutzlichkeitsverteilung.

**Die Spannweite ist die eigentliche Zahl: von +13,3M bis −30,1M sind 43,4M auf einem Median von 35,2M.** Welchen
Skill man auslässt, entscheidet mehr als der halbe Lauf.

**Serienschutz ist ein Fallenskill, und zwar der teuerste.** Er zahlt mit **Ladung** — derselben Ladung, die die
Leiste füllt und die Ionisierung erzeugt; auf Normal kostet ein Halten 70 % der Leiste. Er ist der einzige
Blitz-Skill, der die eigene Fraktionsressource **ausgibt** statt sie zu erzeugen, und in einer Fraktion, die nach
A ohnehin an Leisten-Durchsatz hungert, ist das der schlechteste Tausch, den es gibt. Der gierige Spieler nimmt
ihn trotzdem in 99 % der Läufe; ohne ihn ist der Lauf in **79 %** der Seeds besser.

**Was trägt, sind die Rate-Skills, nicht die Crit-Skills.** Oben stehen Blitzableiter (+100 %), Ionenfeld (+42 %)
und Reststrom (+16 %) — zwei Rate-Skills und der einzige Skill, dessen Ertrag **nicht** davon abhängt, wo die
Stapel gelandet sind (das Feld gibt allen Karten Wert). Unten stehen Vorentladung, Ladungsserie, Lichtbogen,
Spannungsstau und Entladung: fünf der sechs Skills, die auf Crit-Chance oder Crit-Multiplikator zahlen und dafür
eine Größe brauchen, die es früh nicht gibt. Die eine Ausnahme ist Gewitterfront (+23 %) — ihre Rampe ist
**dauerhaft**, sie sammelt also ab der ersten Leiste und verliert nichts mehr.

**Lichtbogen ist der Beleg für die zwei Regime.** Dieselbe Ablation **mit** Legendären (normale Welt,
Gierig-Median 1,96 Mrd) reiht ihn bei +22 %; ohne Legendäres steht er bei −7 %. Er ist kein Skill, sondern ein
Verstärker: er zahlt je Stapel auf der gespielten Karte, und Stapel auf der gespielten Karte gibt es ohne
Doppelentladung oder Resonanz kaum (A: 12 % der Siege in den Runden 11–20). Dieselbe Welt reiht die drei
Legendären mit +1952 / +637 / +475 % vor allen normalen Skills und dreht zusätzlich Gewitterfront (−1 %),
Ionenfeld (0 %) und Blitzfänger (−7 %) ins Minus — **die Rangliste der normalen Skills ist eine andere, je
nachdem, ob ein Legendäres im Build liegt.** Das ist für sich schon ein Befund.

**Die Stufenleitern funktionieren — aber nur oben.** Im legendärfreien Lauf ist die Episch-Spalte in **10 von 14**
Zeilen die höchste (Reststrom E 2,15 · Blitzableiter E 1,82 · Ionenfeld E 1,50 · Blitzschlag E 1,49), die
mittleren Stufen sind Rauschen. Die vier Ausnahmen sind Vorentladung, Lichtbogen, Spannungsstau und Entladung —
also fast genau die Gruppe, die auch in der Ablation unten steht. Wo der Effekt nicht landet, ist auch die Leiter
nicht messbar. (Episch kommt im Angebotswurf mit 3 %; siehe `SKILL_TIER_WEIGHTS`.)

Als dritte, ungepaarte Sicht bestätigt `ARCH=lightning NOLEG=1 N=300 sim/probes/lifts.mjs` (184 Läufe ohne
Legendäres) das Muster nicht überall — sie stellt Blitzfänger (1,58) und Lichtbogen (1,78) nach oben und
Kettenblitz (0,58) und Ladungsserie (0,30) nach unten. Ladungsserie und Serienschutz (0,65) stehen in beiden
Sichten unten; Lichtbogen widerspricht sich. Nach der Leseregel aus §7.22 gilt die gepaarte Ablation.

#### E. Was die vorhandenen Regler tun (Sweep, `blitz-ramp.mjs`, je 100 Läufe, Gruppe ohne Legendäres)

| Variante | n | R 1–10 | R 11–20 | R 41–50 | 1. Leiste | ≥ 50 % Crit | Leisten am Laufende | Stapel auf dem Deck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Ist** (4 %/Skill, Leiste 10) | 62 | 8,4 % | 20,8 % | 71,6 % | R 8 | R 33 | 55,8 | 210 |
| 6 % je Skill | 62 | 12,1 % | 29,6 % | 93,1 % | R 6 | R 22 | 95,7 | 307 |
| 8 % je Skill | 71 | 15,6 % | 38,5 % | 99,7 % | R 6 | R 17 | 137,9 | 488 |
| Leiste 7 statt 10 | 75 | 8,3 % | 21,3 % | 87,9 % | R 6 | R 29 | 183,7 | 474 |
| Sockel 6 pp + 4 %/Skill | 58 | 14,3 % | 27,2 % | 82,8 % | R 5 | R 27 | 98,5 | 345 |
| **Sockel 8 pp + 3 %/Skill** | 64 | 14,2 % | 24,3 % | **72,5 %** | **R 5** | R 30 | 71,5 | 256 |

Die beiden Sockel-Zeilen sind mit `lightning-socket-hook.mjs` gemessen; die Form ist **nicht gebaut**.

**Der Median-Score steht bewusst nicht in der Tabelle.** Eine geänderte Crit-Chance kippt andere Stiche zu Crits,
danach läuft der ganze Lauf anders — dieselbe Falle wie in §7.28 F; und wie die Spalte `n` zeigt, ist die Gruppe
„ohne Legendäres" zwischen den Varianten nicht dieselbe Menge Läufe (alle sechs Läufe starten auf den Seeds
1–100). Die Rampenspalten sind direkte Beobachtungen und vergleichbar, der Median ist es nicht.

#### F. Warum „mehr je Skill" die falsche Form für dieses Problem ist

Das Passiv ist **linear in der Zahl gehaltener Blitz-Skills** — also zahlt es am wenigsten genau dann, wenn man am
wenigsten hält. Bei 13 Skill-Phasen im 50-Runden-Plan heißt das — nur der **passive Anteil**, die Rampen aus B
kommen oben drauf:

| Satz je Skill | Runde 1 (1 Skill) | Runden 1–10 (Ø 1,8) | Laufende (Ø 11,8) |
| --- | --- | --- | --- |
| 4 % (Ist) | 4 % | 7,3 % | 47 % |
| 6 % | 6 % | 10,9 % | 71 % |
| 8 % | 8 % | 14,5 % | 94 % |

Der Satz je Skill hebt das Laufende drei- bis viermal so stark wie den Anfang: 8 % je Skill setzt die Crit-Chance
am Laufende auf 99,7 % — die Fraktion crittet dann **immer**, und Gewitterfront, Ladungsserie und Lichtbogen zahlen
nur noch über die Überschussregel (die laut §7.28 C am 8×-Deckel verpufft). Das ist kein Tarierungsdetail, sondern
der Grund, warum der vorhandene Regler das Owner-Problem nicht löst: er verstärkt das Ende, das ohnehin läuft.

**Ein Sockel hat die umgekehrte Form.** „Blitz aktiv → +X Prozentpunkte, dazu +Y je gehaltenem Skill" zahlt vom
ersten Skill an voll und wächst danach nicht mit. Gemessen (Sockel 8 pp, Satz 3 %): die ersten zehn Runden gehen
von 8,4 auf 14,2 % Crit-Chance, die erste Leiste von Runde 8 auf **Runde 5** — und das Laufende bleibt mit 72,5
gegen 71,6 % praktisch stehen. Das ist genau die Verschiebung, nach der der Owner gefragt hat, und sie kostet die
Spätspiel-Balance nichts.

#### G. Vorschläge (Entscheid Owner, nichts umgesetzt)

**Zum Crit (Problem 1).**

| # | Vorschlag | Was es tut | Risiko |
| --- | --- | --- | --- |
| 1 | **Sockel im Passiv: „Blitz aktiv → +8 pp Crit-Chance", Satz je Skill 4 % → 3 %** | Empfehlung. Gemessen: R 1–10 8,4 → 14,2 %, erste Leiste R 8 → R 5, Laufende unverändert. Ein Regler, beide Symptome — die Ladung kommt aus Crits, die frühere Crit-Chance zieht die erste Ionisierung mit. | Der erste Blitz-Skill wird stark aufgewertet, ein einzelner Splash-Pick in einen Fremdbuild wird attraktiver. Regler dagegen: Sockel niedriger, Satz je Skill höher. |
| 2 | Sockel 6 pp, Satz je Skill bleibt 4 % | Derselbe frühe Effekt (14,3 %), aber das Laufende steigt mit (71,6 → 82,8 %). | Nur wählen, wenn Blitz **auch** stärker enden soll — das ist eine Paritätsfrage und gehört ins Duell, nicht hierher. |
| 3 | Satz je Skill 4 % → 6 %, kein Sockel | Der Regler, den es heute schon gibt (`SIM_LIGHTNING_CRIT_PER_SKILL`). | Nach F die falsche Form: hebt das Laufende (71,6 → 93,1 %) mehr als den Anfang, und drückt die drei Chance-Skills gegen die 100-%-Klemme. |

**Zu den Stapeln (Problem 2).** Die Streuung ist das Problem, nicht die Menge: eine volle Leiste ionisiert **die
nächste Karte in der Reihenfolge** — über einen Lauf verteilt sich das auf 40 Karten —, und Kettenblitz
konzentriert auf die **tiefste** Karte, die man einmal je 40 Stiche spielt. Keiner der beiden Wege erzeugt „die
Karte, die ich gleich spiele, trägt Stapel"; genau das ist die Lücke, die Doppelentladung und Resonanz füllen.

| # | Vorschlag | Was es tut | Risiko |
| --- | --- | --- | --- |
| 4 | **Grundstapel je Leiste als Konstante öffnen und auf 2 setzen** — heute steht in `fillBar` eine harte 1, die Doppelentladung mit ×5 multipliziert | Empfehlung für den ersten Schritt: verdoppelt die Streuung, ohne eine Identität anzufassen, und gibt einen sauberen Sweep-Regler (`SIM_ION_STACKS_PER_BAR`). Doppelentladung bleibt der Faktor darauf, Kettenblitz und Blitzschlag bleiben unberührt. | Hebt auch das Laufende; im Sweep gegen die Duell-Parität prüfen. |
| 5 | Kettenblitz zielt auf die **Siegkarte** statt auf die tiefste Karte | Macht aus der Tiefe etwas, das man auch spielt — repariert „Siege mit Stapel" direkt. | Ändert die Identität des Skills („Tiefe"), die in §7.18/§7.19 gesetzt wurde. Owner-Sache. |
| 6 | Eine kleine Resonanz für alle ins Passiv | Löst das Problem am direktesten. | **Nicht empfohlen** — das ist Resonanz' Kopfzeile in klein, genau die Dublette, die §7.26 B als Befund führt. |
| 7 | Leiste 10 → 7 | Vorhandener Regler, erste Leiste R 8 → R 6. | Nach E der teuerste Weg: das Crit-Gefühl ändert sich gar nicht (8,3 % in R 1–10), das Laufende explodiert (Leisten 55,8 → 183,7). |

**Zur toten Ecke (Problem 3, das der Owner nicht genannt hat, das aber in D steht).** Vier Skills stehen ohne
Legendäres im Minus, und einer davon groß.

| # | Vorschlag | Warum |
| --- | --- | --- |
| 8 | **Serienschutz zahlt nicht mehr mit Ladung** — fester kleiner Preis, oder die ausgegebene Ladung wird zu Stapeln statt zu verfallen | −47 % und in 79 % der Seeds besser ohne ihn. Er ist der einzige Blitz-Skill, der die Fraktionsressource ausgibt. Solange die Leiste der Engpass ist (A), kann kein Zahlenwert das reparieren — die Währung ist das Problem. |
| 9 | Ladungsserie ansehen | Seit dem ÷10 in §7.23 gibt sie auf Normal 0,1 % Crit je Serienpunkt und trägt in den ersten zwanzig Runden 0,1 pp (B). In beiden Sichten unten. |
| 10 | Das Crit-Multiplikator-Bündel (Entladung, Spannungsstau, Vorentladung) zusammen ansehen | Alle drei zahlen erst, wenn ohnehin gecrittet wird, und laufen dann gegen den 8×-Deckel (§7.28 C). Drei Skills auf derselben späten Achse. |

**Empfehlung: 1 und 4, dann messen** — erst die Rampe mit `blitz-ramp.mjs` (die Zahlen oben sind die
Vergleichsbasis), danach gierig gepaart und die Parität im Duell. Die tote Ecke (8–10) ist ein eigener Schritt und
gehört nicht in dieselbe Messung: der Sockel verschiebt die Rangliste aus D, also ist jede Zahl von dort danach
neu zu erheben.

**Was diese Runde NICHT beantwortet.** Ob Blitz nach den Eingriffen die Parität hält — das ist das Duell und
gehört hinter das Bauen. Und ob die Legendär-Abhängigkeit (C, 6,9×) danach kleiner ist: Vorschlag 4 hebt die
Streuung für alle, aber Doppelentladung multipliziert sie weiterhin mit fünf.

### 7.30 Sockel im Passiv, und die tote Ecke aufgeräumt (2026-09-09, Owner) — umgesetzt und gemessen

Owner nach dem Befund in §7.29: **„Sockel steigern und Skillnutzlichkeit erhöhen."** Drei Eingriffe, alle in der
Reihenfolge gebaut, in der sie voneinander abhängen — erst der Sockel, dann die Rangliste neu erhoben, dann die
beiden Skills, die danach unten standen.

#### A. Was gebaut wurde

| # | Eingriff | Vorher | Nachher |
| --- | --- | --- | --- |
| 1 | **Passiv-Sockel** (`LIGHTNING_CRIT_SOCKET`) | nur ein Satz je Skill, 4 % | **8 % Sockel, sobald Blitz aktiv ist**, dazu 3 % je gehaltenem Skill |
| 2 | **Serienschutz** (SK_LIGHTNING_17) | Anteil der Leiste (70 / 50 / 40 / 30 %), bei JEDER Niederlage | **1 Ladung, höchstens 2 / 3 / 5 / 8 mal je Durchlauf** |
| 3 | **Ladungsserie** (SK_LIGHTNING_07) | Crit-Chance je Serienpunkt, Ladung nur als Episch-Extra | **ab Serie 16 / 12 / 8 / 5 gibt jeder Sieg +1 Ladung** |

Der Sockel sitzt in `lightningCritChance` und zahlt an der Aktivierung, nicht an der Zahl gehaltener Skills — die
Form, die §7.29 F verlangt hat. Passiv-Text, Glossar-Eintrag „Crit" und die Stufentexte interpolieren die Konstanten
wie bisher, es gibt also keinen Text↔Code-Drift; `npm run loc:export` ist gelaufen. Die drei abgeschalteten Kataloge
(en/es/zh-Hans) bleiben auf ihrem Stand — das ist die dokumentierte Regel für inaktive Kataloge auf `exp`, und ihre
Blitz-Passivzeile stand schon vor dieser Runde auf dem Text von vor dem Rework.

#### B. Die Rampe: der Motor springt fünf Runden früher an

`blitz-ramp.mjs`, 100 Läufe, Welt nur Blitz, die Läufe ohne Legendäres. Dieselbe Sonde und dieselben Seeds wie in
§7.29 A:

| | vorher | nur Sockel | Sockel + beide Skills |
| --- | --- | --- | --- |
| Crit-Chance Runden 1–10 | 8,4 % | **14,2 %** | 14,3 % |
| Crit-Chance Runden 11–20 | 20,8 % | 24,3 % | 24,3 % |
| Crit-Chance Runden 41–50 | 71,6 % | 72,5 % | 84,1 % |
| Erste volle Leiste (Median-Runde) | R 8 | **R 5** | R 5 |
| Siege mit Stapel, Runden 21–30 | 31 % | 47 % | **48 %** |
| Siege mit Stapel, Runden 41–50 | 82 % | 85 % | **96 %** |
| Volle Leisten am Laufende | 55,8 | 71,5 | **145,9** |
| Stapel auf dem Deck | 210 | 256 | **420** |

**Die beiden Hälften des Eingriffs trennen sich sauber.** Der Sockel wirkt vorn (Runden 1–10 von 8,4 auf 14,2 %,
erste Ionisierung von Runde 8 auf Runde 5) und lässt das Laufende praktisch stehen. Die beiden Skill-Umbauten wirken
hinten (Leisten 71,5 → 145,9), weil beide auf die Ladung zahlen und die Serie erst spät lang genug wird.

#### C. Serienschutz: der Effekt war gut, der Preis war die Falle

Gepaart, fixe Policy, die den Skill immer hält, 100 Läufe:

| Fassung | Median | besser als ohne ihn |
| --- | --- | --- |
| ohne Serienschutz | 60,0M (1,00×) | — |
| **Ist vor dem Umbau** (70 % der Leiste, jede Niederlage) | 49,7M (**0,83×**) | 30 % |
| derselbe Skill **gratis** (Preis 0, unbegrenzt) | 74,0M (**1,23×**) | 71 % |

**Der Effekt ist +23 %, der Preis macht −17 % daraus.** Der Grund ist die Kadenz, nicht die Zahl: bei rund
14 Niederlagen je Durchlauf wird jeder Preis öfter fällig, als die Leiste Ladung erzeugt — und er wird genau dann
fällig, wenn die Leiste kurz vor der Ionisierung steht. Ein Sweep über Preis und Deckel zeigt, wie hart die Währung
ist (jeweils „besser als ohne"):

| Preis 3, 1× | Preis 3, 2× | Preis 2, 3× | Preis 2, 5× | **Preis 1, 2×** | Preis 1, 5× | Preis 1, 8× |
| --- | --- | --- | --- | --- | --- | --- |
| 51 % | 49 % | 56 % | 57 % | **64 %** | 63 % | 69 % |

**Bei Preis 2 bleibt er neutral, bei Preis 1 trägt er** — eine einzelne Ladung ist teuer, weil die Leiste der
Engpass der Fraktion ist. Gesetzt: **Preis 1 auf allen Stufen, die Leiter ist die Kadenz** (2 / 3 / 5 / 8 je
Durchlauf). Das ist zugleich die vierte Häufigkeitsleiter, die Blitz nach §7.26 D fehlt. Zum Maßstab: derselbe
Messaufbau gibt Blitzableiter Normal — dem stärksten Skill der Fraktion — 68 %, Blitzfänger Normal 60 %.

**Verworfen:** nur den Anteil senken (0,2 statt 0,7). Bei 14 Niederlagen kostet auch das mehr Ladung, als ein
Durchlauf erzeugt; ohne Deckel ist keine Zahl klein genug.

#### D. Ladungsserie: von der gesättigten Achse auf den Engpass

Der Skill stand in §7.29 D bei −1 % und **fiel durch den Sockel auf −17 %** — die Zwischenmessung nach Eingriff 1
ist damit selbst der Befund. Seine Achse ist Crit-Chance je Serienpunkt, und die ist nach dem Sockel spät am
Anschlag: mit dem Sockel stehen in den Runden 41–50 **31 % der Stiche** bei
100 % Crit-Chance und **49 % der Crits** am 8×-Deckel (`overcrit-engine.mjs`, 60 Läufe, Blitz mono; vor dem Sockel
waren es 15 % und 27 %, §7.28 B). Mehr Chance auf dieser Achse ist verschenkt.

Gepaarter Sweep, derselbe Aufbau wie oben:

| Fassung | Median | besser als ohne |
| --- | --- | --- |
| Ist (0,1 % Crit je Serienpunkt) | 0,79× | 44 % |
| Crit ×10 (1 % je Punkt) | 1,23× | 60 % |
| Ladung ab Serie 30 / 22 / 16 | 1,05× / 1,04× / 1,10× | 51 % / 55 % / **57 %** |
| Ladung ab Serie 12 / 8 | 1,32× / 1,30× | 68 % / 69 % |
| Ladung ab Serie 5 / 3 | 1,57× / 1,88× | 80 % / 81 % |

Gesetzt: **Ladung ab Serie 16 / 12 / 8 / 5**. Damit steht Normal bei 57 % (Blitzfänger-Niveau) und Episch bei 80 %,
und der Skill trägt seinen Namen wieder — „Ladungsserie" heißt Ladung aus der Serie, nicht Crit aus der Serie. Die
Ladung war schon vorher da, aber nur als Episch-Extra; sie ist jetzt der ganze Skill, und die Leiter ist die
fallende Schwelle.

**Verworfen:** den Crit-Satz verzehnfachen (1,23× / 60 %). Es funktioniert, aber es legt einen dritten Geber auf
die Achse, die nach dem Sockel als erste sättigt — genau die Dublette, die §7.26 B als Befund führt.

**Technischer Nebeneffekt:** `lightningCritChance` liest die Serie damit nicht mehr. Der Parameter bleibt als
`_streak` stehen — die Engine berechnet die Serie ohnehin und reicht sie durch, und eine künftige
Serie-zu-Chance-Quelle gehört an dieselbe Stelle; die fünfzehn Aufrufstellen zweimal umzustellen wäre der teurere
Weg.

#### E. Die Nutzlichkeitsverteilung danach

Dieselbe gepaarte gierige Ablation wie in §7.29 D, dieselbe legendärfreie Welt, dieselben Seeds
(`SIM_SKILL_LEGENDARY_PER_SLOT=0 --mode skills --arch lightning --explore 800 --runs 120`). Gierig-Median 71,4M,
Ø 12,9 Skills:

Die Vergleichsspalte ist die Zwischenmessung **nach dem Sockel, vor den beiden Skill-Umbauten** — nur so trennen
sich die Eingriffe; §7.29 D steht daneben, wo es die Geschichte des Skills erzählt.

| Skill | gehalten | Median-Δ | typ. | besser MIT | Flag | nur Sockel | §7.29 D |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ionenfeld | 97 % | +14,6M | +28 % | 65 % | stark | +21 % | +42 % |
| Gewitterfront | 94 % | +13,5M | +33 % | 70 % | stark | +12 % | +23 % |
| Blitzableiter | 72 % | +13,3M | +33 % | 63 % | stark | +71 % | +100 % |
| Kurzschluss | 100 % | +12,1M | +23 % | 73 % | | +5 % | +10 % |
| Kettenblitz | 93 % | +5,9M | +13 % | 61 % | | +6 % | +5 % |
| Blitzfänger | 76 % | +5,2M | +15 % | 69 % | | +24 % | +15 % |
| **Ladungsserie** | 98 % | +3,5M | **+7 %** | 56 % | | **−17 %** | −1 % |
| Reststrom | 79 % | +3,5M | +9 % | 63 % | | +17 % | +16 % |
| Blitzschlag | 92 % | +0,2M | 0 % | 54 % | tot | +10 % | +13 % |
| **Serienschutz** | 97 % | −0,1M | **−0 %** | 49 % | tot | **−45 %** | −47 % |
| Vorentladung | 99 % | −3,0M | −4 % | 38 % | schadet | +1 % | +3 % |
| Lichtbogen | 99 % | −2,6M | −6 % | 39 % | schadet | −2 % | −7 % |
| Entladung | 100 % | −9,5M | −13 % | 31 % | schadet | −7 % | −10 % |
| Spannungsstau | 100 % | −17,1M | −26 % | 30 % | schadet | −6 % | −10 % |

**Die beiden Umbauten sind angekommen.** Serienschutz geht von −45 auf −0 %, Ladungsserie von −17 auf +7 %. Keiner
von beiden ist damit ein Zugpferd, aber keiner ist mehr eine Falle — und das war das Ziel: ein Skill, den der
gierige Spieler in 97 % der Läufe nimmt und für den er 47 % zahlt, ist der teuerste Fehler, den ein Angebot
enthalten kann.

**Die Verteilung ist deutlich flacher.** Die Zahl, auf die es ankommt, ist die Spannweite im Verhältnis zum Median
— wo der Spieler 13 von 14 Skills hält, summiert sich die Spalte konstruktionsbedingt auf null, „alle positiv" ist
also gar nicht erreichbar (§7.29 D):

| | vorher | nur Sockel | jetzt |
| --- | --- | --- | --- |
| Bester Skill | +100 % | +71 % | **+33 %** |
| Schlechtester | −47 % | −45 % | **−26 %** |
| Spannweite ÷ Median | 1,23 | 1,19 | **0,44** |

**Was jetzt unten steht, ist ein Bündel, kein Einzelfall.** Spannungsstau (−26 %), Entladung (−13 %),
Vorentladung (−4 %) und Lichtbogen (−6 %) sind genau die vier, die auf den **Crit-Multiplikator** zahlen — und der
Deckel steht bei 8×. Nach dem Sockel sitzen in den Runden 41–50 **49 % der Crits** dort (vorher 27 %), das heißt:
knapp die Hälfte dessen, was diese vier oben drauflegen, schneidet der Deckel wieder ab. Das ist §7.29 G #10, jetzt
mit Zahl. Es ist eine Drei- bis Vier-Skill-Frage und keine Tarierung, deshalb steht sie in H und nicht in dieser
Runde.

#### F. Parität: Blitz ist im Feld angekommen — und Feuer steht jetzt allein unten

Duell über alle vier Fraktionen, 120 Läufe, Seeds 1–120, gepaart gegen denselben Lauf auf `origin/exp`:

| Build | vorher | nachher |
| --- | --- | --- |
| Feuer mono | 6,29M | 6,29M |
| **Blitz mono** | **6,92M** | **10,93M** |
| Eis mono | 9,88M | 9,88M |
| Pflanze mono | 11,36M | 11,36M |
| Split (alle vier) | 6,51M | 9,57M |
| Mix (zufällig) | 4,34M | 4,92M |

Blitz steigt um **58 %** und liegt jetzt zwischen Eis (9,88M) und Pflanze (11,36M). Die anderen drei stehen auf den
Seeds unverändert — der Eingriff ist sauber lokal.

**Damit ist Feuer die neue Untergrenze**, und zwar nicht erst seit dieser Runde: Feuer stand schon vorher bei
6,29M gegen Eis 9,88M und Pflanze 11,36M. Der Blitz-Buff hat die Lücke nur sichtbar gemacht, indem er den zweiten
Kandidaten aus ihr herausgezogen hat. Das ist eine eigene Entscheidung und keine Nacharbeit an dieser hier.

**Der Blitz-Schwanz ist gewachsen** (Mean 19,0 → 44,2M, p95 88,8 → 158,3M). Er ist damit der zweitgrößte des Feldes
hinter dem der Pflanze (Mean 181,7M) und bleibt der Wachpunkt aus §7.25.

#### G. Der Balance-Guard wurde nachgezogen — mit Beleg

`test/sim-balance-guard.test.js` fängt einen Tail-Runaway über 40 feste Seeds. Der Mean steigt von 6,39M auf 8,84M
und lief damit gegen die Obergrenze 8,5M. Nachgezogen auf 10,5M, und zwar erst nach der Prüfung, ob es ein echter
Runaway ist: über die 40 Seeds trägt **ein einziger Lauf** (129M) den Mean — ohne ihn stehen 5,75M —, und über
Seeds 1..200 liegt der Mean bei **6,48M**, also mitten im Band. Der Median-Guard darüber wandert von 2,59 auf
3,12M und bleibt in seinem Band, ohne Eingriff. Die Obergrenze fängt weiterhin, wofür sie da ist: der dokumentierte
echte Blowup lag bei 352M, also Faktor 33 über der neuen Grenze.

#### H. Offen

- **Feuer** ist jetzt allein unten (F). Entscheid Owner, ob Feuer nachzieht oder das Band so bleibt.
- **Die Stapel-Streuung** aus §7.29 G #4 (Grundstapel je Leiste 1 → 2) ist **nicht** gebaut — der Owner hat den
  Sockel und die Skillnutzlichkeit gewählt. Die Legendär-Abhängigkeit ist damit nicht direkt angefasst; sie sinkt
  nur mittelbar, weil der Lauf ohne Legendäres jetzt mehr Leisten schafft.
- **Die untere Hälfte der Rangliste** in E: nach dem Umbau von zwei Skills sind die verbliebenen Minus-Zeilen klein.
  Wo die Ablation 13 von 14 Skills hält, summiert sie sich konstruktionsbedingt auf null — irgendwer steht immer
  unten. Die Frage ist die **Spannweite**, nicht das Vorzeichen.

### 7.31 Das Crit-Multiplikator-Bündel (2026-09-09) — Vorschlag, NICHT abgenommen, nichts umgesetzt

Nach §7.30 stehen vier Skills unten, und drei davon auf derselben Achse. Diese Runde hält den Befund und den
Designstand fest; gebaut ist nichts, abgenommen ist nichts.

#### A. Gemessen: 81 % des Multiplikators wird verworfen

`sim/probes/blitz-multsource.mjs` (neu), Blitz mono, 60 Läufe, mit `SIM_CRIT_MULT_CAP=1000` gefahren, damit der
gebaute Wert überhaupt sichtbar wird:

| Runden | Basis | Entladung | Stau | Vorentladung | Stapel | Rest | gebaut | ausgezahlt | verworfen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–10 | 2,25× | 0,00× | 0,01× | 0,00× | 0,01× | 0,06× | 2,33× | 2,33× | 0 % |
| 11–20 | 2,25× | 0,04× | 0,01× | 0,02× | 0,07× | 0,12× | 2,50× | 2,50× | 0 % |
| 21–30 | 2,25× | 0,29× | 0,01× | 0,30× | 0,41× | 0,66× | 3,91× | 3,21× | 18 % |
| 31–40 | 2,25× | 1,27× | 0,00× | 3,11× | 1,55× | 3,32× | 11,51× | 4,60× | 60 % |
| **41–50** | 2,25× | 3,54× | **0,00×** | **+16,43×** | 4,64× | 9,19× | **36,01×** | **6,97×** | **81 %** |

Dazu `capexcess-probe.mjs` (ungedeckelt, 60 Läufe): in den Runden 41–50 liegen **67 % der Crits über 8×**, im Schnitt
um **+49,6×**. Zum Vergleich stand in §7.24 noch „29 % der Crits, Ø +14×" — der Überschuss hat sich vervierfacht,
auch durch den Sockel und die Ladungsserie aus §7.30 (mehr Leisten → größere Entladungs-Rampe).

**Die Regel, die daraus folgt:** solange die SUMME über dem Deckel liegt, ändert Umverteilen INNERHALB des
Multiplikators nichts. Vorentladung von +16,4× auf +1× zu stutzen senkt die gebaute Summe von 36× auf 21× —
ausgezahlt werden weiter 8×, der Skill misst danach genauso schlecht. Es gibt zwei Wege: alle Quellen unter 8
drücken (das hieße auch Präzision und Raserei streichen) oder die Skills verlassen die Währung.

**Der Deckel selbst ist damit kein Regler mehr:** von 8 auf 12 holt 4 von 50 Punkten Überschuss zurück, also
nichts. Nur ein vollständiges Streichen würde wirken — und das vervielfachte das Spätspiel. Der Owner-Entscheid aus
§7.22 („der Deckel bleibt bei 8") wird davon also nicht in Frage gestellt, er wird bestätigt.

#### B. Spannungsstau ist ein anderer Fall als die zwei anderen

Er baut spät **0,00×**. Nicht der Deckel frisst ihn, sein Auslöser ist weg: er zahlt für Siege **ohne** Crit, und
seit dem Sockel crittet ein Sieg in 84 % der Fälle. Sein Konzept („Trockenphase staut sich auf") setzt seltene
Crits voraus — genau die hat §7.30 abgeschafft. Das erklärt seine −26 % vollständig und unabhängig vom Deckel.

**Nebenbefund:** Blitzableiter **Episch** hängt am selben sterbenden Auslöser („+1 Ladung je Sieg ohne Crit"). Nicht
tot, aber auf ein Sechstel der früheren Häufigkeit entwertet.

#### C. Der Designstand (Vorschlag, Entscheid Owner)

**Owner-Regel, gesetzt am 2026-09-09: keine Skills, die auf Niederlagen reagieren.** Ein erster Entwurf, den
Spannungsstau an Niederlagen zu hängen („verlieren lädt auf"), ist daran gescheitert und ist verworfen.

| Skill | Vorschlag | Warum diese Währung |
| --- | --- | --- |
| **Vorentladung** | „Ab Serie X zählt ein Sieg **×1,5**", Leiter auf der Schwelle 20 / 15 / 10 / 6 | Der ×-Faktor sitzt an einer anderen Stelle der Formel, der Deckel fasst ihn nicht an. Identität unverändert. Bewusst der EINZIGE der drei mit einem ×-Faktor — sie multiplizieren mit allem und treiben den Schwanz |
| **Entladung** | „Jede volle Leiste gibt dauerhaft **+N Basis-Score** je Sieg", Startwerte 1 / 2 / 3 / 5 | Basis-Score kennt keinen Deckel, und das Paar mit Gewitterfront wird sinnvoll: eine gibt Chance, die andere Ertrag, statt zweier Rampen auf derselben vollen Achse |
| **Spannungsstau** | „Je **Ladung auf der Leiste** zählt dein Sieg **+N Basis-Score**", Startwerte 15 / 25 / 35 / 50 | Der Stau IST die Leiste: aufstauen, entladen, von vorn. Kein Blitz-Skill liest heute den Füllstand — freie Achse. Der Skill braucht danach keinen eigenen Zustand mehr (`stauBonus` fällt weg) |
| **Lichtbogen** | diese Runde nicht anfassen | Kleinster der vier (−6 %), anderes Problem (Crit-CHANCE ist geklemmt, nicht der Multiplikator), und in §7.28 E bewusst gesetzt. Vier Skills gleichzeitig zu ändern macht jede Zuordnung hinterher unmöglich |

**Verworfen für Spannungsstau,** neben den Niederlagen: „Stiche seit der letzten Ionisierung" (belohnt eine
LANGSAME Leiste, arbeitet gegen den eigenen Motor) und „je ionisierter Karte im Deck" (freie Achse, aber das ist
eine Rampe, kein Stau — der Name würde lügen).

#### D. Was auch danach offen bleibt

Nach den drei Umbauten stünden im Multiplikator noch Basis 2,25× + Stapel 4,6× + Rest 9,2× ≈ **16× gegen einen
Deckel von 8**. Der Deckel bindet also weiter, nur nicht mehr an Blitz-Skills, sondern am Passiv und an
systemweiten Quellen. Der „Rest" ist dabei auffällig groß; der Verdacht ist die Überschussregel (Crit-Chance über
100 % → +0,01× je Prozentpunkt), weil tiefe Stapel mit Lichtbogen die ROHE Chance weit über 100 % treiben. Das wäre
eine eigene Messung — und sie würde §7.28 C korrigieren, wo die Regel als „unbedenklich, kostet nichts" eingestuft
wurde.

Ebenfalls offen und älter: **Feuer** steht seit §7.30 F allein unten (6,29M gegen Blitz 10,93M, Eis 9,88M,
Pflanze 11,36M).

## 5. Eis

### 5.1 Bestandsaufnahme (2026-09-07, Befund, nichts umgesetzt)

**Ausgangslage.** Eis ist keine unangetastete Altfraktion. Sie trägt einen vollständigen, jungen Umbau —
`docs/eis-rework.md`, „Gletscher, Brechen & Kaskade" — der nie durch die exp-Struktur gelaufen ist. Jenes Dokument
nennt `balancing` als Ziel-Branch und stammt aus einem anderen Workstream; die Aussagen unten sind deshalb **am Code
geprüft**, nicht von dort übernommen.

#### Was wirklich im Code steht

| Baustein | Wo | Stand |
| --- | --- | --- |
| Fundament: Masse je Brettfeld, Schwellen 4/8/12, Bruch, Überlauf, Abkalben auf 0 | `glacier.js` `precomputeGlacier` | steht |
| Der Pick friert eine Karte auf ihrer Zelle fest | `reducer.js` `GLACIER_LOCK`; `SWAP_CARDS` verweigert den Tausch | steht |
| Schnee-Boden-Reserve je Feld, füllt einen Gletscher zum Durchlauf-Beginn nach | `engine.js` + `glacier.js` | steht |
| Fraktions-Passiv „Ewiger Frost": +1 Masse je Durchlauf, bedingungslos | `ewigerFrostTick` | steht |
| 17 Rollen + 4 Legendäre, je Skill ein `role: G_…` | `SKILL_DEFS`, `glacierOpts` | steht |
| 2D-Geometrien Block / Kreuz / Linie / Fläche | `glacierFormations` | steht |
| Leiste, Passiv-Text, sechs Glossar-Einträge, 21 Embleme | `de.js` `bar.ice.*`, `glossary.js` group `ice`, `assets/skills/ice` | steht |
| Sim kennt „ice" (Duell, Kreuz, Balance, Fraktions-Policy) | `sim/` | steht |
| Tests | 20 Dateien `test/glacier-*.test.js`, zusammen 111 Tests | steht |

**Es gibt keinen toten Code.** Die Mechanik ist gebaut, verdrahtet, sichtbar und getestet. Der Satz aus
`eis-rework.md` §8, das Surfacing sei offen, ist überholt.

**Aber: Eis ist heute unerreichbar.** `SKILL_OFFER_ARCHETYPES` = Feuer / Blitz / Pflanze, `buildSkillDoors` nimmt
diese Liste als Vorgabe, und der Reducer reicht keine andere herein. Kein Eis-Skill kann also an einer Tür
erscheinen. Ein Sim-Lauf mit `--arch ice` misst deshalb **keinen Eis-Build, sondern einen Zufalls-Build** — was
immer frühere Notizen an Eis-Zahlen nennen, ist damit nicht vergleichbar. *(Aus dem Code gelesen, nicht gemessen.)*

#### Was gegen den exp-Rahmen steht

| Befund | Betroffen | Warum |
| --- | --- | --- |
| **Keine Stufen** | alle 21 | §1 verlangt vier Stufen mit unterschiedlichen Werten. Kein Eis-Skill trägt `tiers`; die Mechanik liest globale Konstanten über `role`, nicht die Stufe. Käme Eis heute ins Angebot, würfelte die Tür eine Stufe, die **nichts** ändert — vier identische Skills mit vier Preisschildern. Das ist der größte Posten. |
| **21 statt 18 Skills** | 17 + 4 | Ziel ist 15 + 3. `test/skill-art.test.js` fordert ≥ 17 registrierte Skills je Fraktion und ein Emblem je Skill — 18 geht, drei Embleme müssten mit. |
| **Vier Legendäre** | L01–L04 | §6.11: drei je Fraktion, gemeinsames Band +101 … +160 %. |
| **Deckel** | `BURST_SOFTCAP` 40 000 / `BURST_SOFTSLOPE` 0,06 · `EISZEIT_MAX_GLACIERS` 16 | §1: keine Deckel auf Rampen, lieber niedrigere Werte. Beide sind ausdrücklich als Runaway-Bremse eingebaut. |
| **Score-Pfad neben der Basis** | der ganze Berst-Score | §1: kein Direkt-Score. Der Burst wird in `engine.js` **nach** den Multiplikatoren addiert (`score += glacierDirect`), dafür selbst mit dem vollen Sieg-Stack multipliziert (`glacierWinMult`). Bei einer Niederlage bleibt er ×1. Er ist damit nicht der tote Flach-Score, den die Regel meint — aber Eis ist die einzige Fraktion mit einem zweiten Score-Pfad. **Entscheid Owner, siehe unten.** |
| **Eingriff in die Aufstellungsordnung** | die Kernmechanik selbst | Ein gefrorener Gletscher ist in keiner künftigen Aufstellung mehr verschiebbar. Das ist der härteste Widerspruch zur Hausregel — und zugleich der Kern der Fraktion. **Entscheid Owner, siehe unten.** |
| **Mehrere Begriffe je Sache** | Masse / Schnee / Boden-Reserve (im Code: Firn) · Formation / Gletscher-Formation · Bersten / brechen / Bruch / Berst-Score | „ein Begriff je Sache". Am schwersten wiegt Formation: die 1D-Formationen des Spiels und die 2D-Gletscherformen heißen gleich und rechnen verschieden. |
| **Das Passiv beschreibt die Kaufregel, nicht den Motor** | `skill.passive.ice` | Blitz, Feuer und Pflanze beschreiben im Passiv ihren Motor (Ladung, Hitze, Wachstum). Eis beschreibt, was ein Skill-Pick auslöst. Der eigentliche Motor — Ewiger Frost, +1 Masse je Durchlauf — kommt darin nicht vor. |

**Was der Rahmen nicht bemängelt.** §1 verlangt, dass der erste Skill einer Fraktion sie allein zum Laufen bringt.
Bei Eis erfüllt das **jeder** Skill, weil der Pick selbst den Gletscher setzt und das Fundament ohne Skills läuft.
Die Kehrseite: es gibt keinen Kernskill, alle 17 sind Modifikatoren auf einer Baseline. Das ist eine Eigenart, kein
Fehler — es macht jede Tür-Kombination spielbar.

**Ein Beobachtungspunkt am Fundament, keine Regelverletzung:** die Berst-Schwelle ist die höchste Stufe (12). Ein
Gletscher bricht deshalb praktisch immer auf Stufe 3; die Stufen 1 und 2 der Wucht-Tabelle erreicht nur, wen
Kettenbruch oder Große Lawine mitreißt. Abbruchkante dreht damit real an einer Zahl, nicht an dreien.

**Der Eispanzer-Hinweis aus dem Handoff gilt:** er hängt an einer Niederlage-Bedingung. Bei Feuer und Blitz sind
solche Skills zweimal gestorben (§7.22, §7.24). Er schützt allerdings vor der Niederlage, statt sie zu belohnen —
Risiko notiert, kein Streichgrund.

#### Drei Entscheidungen, die der Owner treffen muss

Sie entscheiden, wie groß der Umbau wird. Alles Weitere in §5.2 hängt an ihnen.

| # | Frage | Optionen | Empfehlung |
| --- | --- | --- | --- |
| **E1** | Darf Eis die Aufstellungsordnung anfassen? | (a) Ausnahme: der Lock bleibt. (b) Der Lock fällt, Masse liegt auf der Karte statt auf dem Feld. | **(a).** Die Regel richtet sich gegen Skills, die das Deck hinter dem Rücken des Spielers umsortieren. Der Lock sortiert nichts um: der Spieler wählt selbst, welche Karte er festlegt, und bezahlt mit Aufstellungsfreiheit. (b) kostet die 2D-Geometrien, die Nachbarschaft und damit die ganze räumliche Identität — das wäre ein Neubau, kein Rework. |
| **E2** | Bleibt der Berst-Score neben der Basis? | (a) bleibt wie heute. (b) geht in die Basis wie Stapel- und Blüh-Score. | **(a), mit Protokollsatz.** Der Zweck der Regel ist erfüllt: der Burst ist nicht flach, er skaliert mit Masse, Geometrie, Kaskade **und** dem vollen Sieg-Stack. (b) hätte eine Nebenwirkung, die dem Design widerspricht: in der Basis gäbe es bei einer **Niederlage** keinen Burst mehr, und „Bersten ist unabhängig von Sieg und Niederlage" ist das Fundament (§2.4 des Eis-Designs). |
| **E3** | Kommen die Deckel raus? | (a) beide raus, dafür `BURST_SCALE` und die Eiszeit-Flutrate niedriger. (b) bleiben. | **(a).** §1 ist eindeutig, und beide Deckel sind Notbremsen für Zahlen, die nie tariert wurden. Der Preis: die neuen Werte müssen gemessen werden — auf Ansage, nicht nebenbei. |

### 5.2 Vorschlag: die 15 + 3 (2026-09-07, Entscheid Owner je Zeile)

**Gestrichen werden drei: Verschmelzen, Zermalmen, Erstarrung.** Damit stehen die Linien symmetrisch auf
Firn 4 · Eisschild 4 · Lawine 4 · Frostgriff 3 = 15, plus drei Legendäre.

Die Spalte **Regler** ist die Zahl, über die die vier Stufen laufen. Wo heute keine steht, ist der Skill binär und
braucht dafür einen Umbau — das sind die drei „umgebaut"-Zeilen. Werte sind noch keine genannt; die kommen nach
dem Ja, Skill für Skill, wie bei der Pflanze.

| # | Skill | Heute | Regler für die Stufen | Vorschlag |
| --- | --- | --- | --- | --- |
| 1 | **Anfrieren** (01) | Sieg +1 Masse, Formations-Sieg +2 extra | Masse je Sieg | **bleibt** — der Grundmotor; der Formations-Teil wandert auf die oberen Stufen |
| 2 | **Schneetreiben** (02) | Sieg sät +2 Schnee ins angrenzende offene Feld | Menge, Episch zwei Felder | **bleibt** — die nahe Boden-Quelle. Der 0-Masse-Sonderfall im Text ist eine Regel, die der Spieler nicht braucht: raus aus dem Text |
| 3 | **Dauerfrost** (03) | offene Felder sammeln +1 / +2 nach Abstand | die beiden Raten | **bleibt** — die ferne Boden-Quelle, mechanischer Gegenpol zu Schneetreiben |
| 4 | **Verdichtung** (04) | Gebäude-Wertbonus auf einem Gletscher wird Masse (0,25/Punkt) | die Rate | **bleibt** — einzige siegunabhängige Quelle und die einzige Architekt-Kopplung der Fraktion |
| — | **Verschmelzen** (05) | Cluster hebt alle auf den Durchschnitt | — | **gestrichen** — binär, im Spiel unsichtbar, und die Achse „Cluster gibt Masse" haben Packeis und Verzahnung schon zweimal. Dieselbe Operation in groß ist das Legendäre Ewiges Schild |
| 5 | **Packeis** (06) | +0,5 Masse je Gletscher-Nachbar | die Rate | **bleibt** — belohnt die Mitte des Feldes |
| 6 | **Eisbrücke** (07) | Diagonalen zählen als angrenzend | **fehlt** (binär) | **umgebaut** — die Diagonale bekommt ein Gewicht: ein diagonaler Gletscher zählt als Bruchteil eines Nachbarn. Eine Zahl, eine Leiter, dieselbe Fantasie |
| 7 | **Eiswall** (08) | volle Reihe/Spalte ×1,6 statt ×1,3 | der Faktor | **bleibt** — der einzige Skill, der eine der 2D-Formen ausdrücklich bedient |
| 8 | **Verzahnung** (09) | +0,25 Masse je Gletscher im Cluster, für jeden | die Rate | **bleibt**, aber niedrig anfangen: der Ertrag wächst quadratisch mit der Clustergröße. Der Runaway-Kandidat der Fraktion |
| 9 | **Abbruchkante** (10) | höhere Schwellen bersten steiler | die Wucht-Tabelle | **bleibt** — Gegenpol zu Rissbildung. Siehe Beobachtungspunkt in §5.1: real dreht sie an der Wucht der 3. Stufe |
| 10 | **Kettenbruch** (11) | Bruch reißt angrenzende Gletscher mit | **fehlt** (binär) | **umgebaut** — Regler ist die Wucht, mit der ein Mitgerissener bricht; Episch springt zusätzlich über eine Lücke |
| — | **Zermalmen** (12) | Kollision ×2 statt ×1,5 | — | **gestrichen** — dieselbe Achse wie die Kaskade, nur ein zweites Mal und kleiner: beide zahlen für Gletscher-Nachbarn. Von den fünf Lawine-Skills der schwächste Beitrag zur Fantasie |
| 11 | **Rissbildung** (13) | bricht schon ab 6 Masse statt 12 | die Schwelle | **bleibt** — das Tempo-Gegenstück, viele kleine statt weniger großer Brüche |
| 12 | **Gletschersturz** (14) | +5 % je gleichzeitig brechendem Gletscher | der Satz | **bleibt** — der brettweite Kaskaden-Verstärker |
| 13 | **Einfrieren** (15) | getroffene Gegnerkarte verliert ihren nächsten Stich | **fehlt** (binär) | **umgebaut** — Regler ist die Reichweite: wie viele Gegnerkarten der Bruch einfriert. Erbt damit die Achse des gestrichenen Legendären |
| 14 | **Frostbund** (16) | Nicht-Gletscher-Nachbarn +3 Stichwert | der Buff | **bleibt** — der Duo-Skill der Fraktion, stößt nach außen |
| 15 | **Eispanzer** (17) | Niederlage neben Gletscher hält die Serie und gibt +1 Masse | die Masse | **bleibt** — zieht nach innen, Gegenrichtung zu Frostbund. Der Serienschutz ist der Skill, die Masse die Leiter |
| L1 | **Eiszeit** (L01) | flutet das Brett, friert je Durchlauf das reservestärkste Feld ein, bis 16 Gletscher | Flutrate | **bleibt** — pluralisiert. Der Deckel 16 fällt mit E3 |
| L2 | **Ewiges Schild** (L02) | alle Gletscher aufs Maximum + 3, jeder gilt als Nachbar jedes anderen | der Zuschlag | **bleibt** — vereint |
| L3 | **Große Lawine** (L03) | im letzten Durchlauf bricht alles auf voller Stufe, ×6, ohne Soft-Cap | der Multiplikator | **bleibt** — detoniert. Mit E3 fällt die Soft-Cap-Ausnahme weg, weil es keinen Soft-Cap mehr gibt |
| — | **Erstarrung** (L04) | friert die getroffenen Gegnerkarten ein, Reichweite +1, jeder Bruch ×3 Score | — | **gestrichen** — die Kontrolle ist Einfrieren (15) in groß, und der Score-Teil ist ein nackter Faktor auf den Bruch, den der Kommentar im Code selbst als Notlösung ausweist („hebt Erstarrung im Mono vom toten Wert auf einen Muss-Pick"). Übrig bleiben drei Legendäre, die drei verschiedene Operationen auf demselben Feld sind |

#### Was das technisch bedeutet

Eine Entscheidung des Agenten, hier notiert statt in einem eigenen Dokument: **die Stufe muss bis in die Mechanik
reichen.** Heute ist `state.glacierRoles` eine Liste von Rollen-Strings, und an zwei Dutzend Stellen fragt der Code
`roles.includes(…)`. Der Umbau lässt diese Liste stehen und legt eine zweite Struktur daneben — Stufe je Rolle —,
aus der eine Funktion die Zahlen baut, so wie heute `glacierOpts` die Snapshot-Optionen baut. Die Alternative,
jede `includes`-Prüfung umzuschreiben, ist mehr Diff für dasselbe Ergebnis.

Damit fällt auch der Rest an seinen Platz: eine Stufentabelle `EIS` in `skills.js` neben `BLITZ`, `FEUER` und
`PFLANZE`, Texte über `tiered(rows, fn)` wie bei den anderen drei, und `glacier.js` liest Parameter statt
Konstanten.

#### Etappen (erst nach dem Ja)

1. **Stufen-Infrastruktur** — `EIS`-Tabelle, Stufe je Rolle, `glacier.js` auf Parameter, ein Text je Stufe.
2. **Die drei Streichungen** — Skills, Rollen, Embleme, Texte, Tests.
3. **Die drei Umbauten** — Eisbrücke, Kettenbruch, Einfrieren bekommen ihren Regler.
4. **Rahmen** — E1 bis E3 umsetzen, Passiv-Text auf den Motor, ein Begriff je Sache im Glossar.
5. **Angebot und Parität** — Eis in `SKILL_OFFER_ARCHETYPES`, Balance-Guard neu zentrieren, Parität gegen
   Feuer 7,75M / Blitz 7,43M / Pflanze 8,36M. Gemessen wird nur auf Ansage.

### 5.3 Die vier Stufen je Skill (2026-09-07, Owner) — umgesetzt, UNGEMESSEN

Owner: „bau die Raritäten und zeige sie mir." Die 15 Skills haben jetzt vier Stufen, und die Stufe erreicht die
Mechanik. **Startwerte, nicht gemessen.**

**Warum das mehr war als eine Tabelle.** Bis hierher las die Eis-Mechanik globale Konstanten über die Rolle `G_…`.
Eine an der Tür gewürfelte Stufe änderte deshalb nichts. Umgestellt in drei Schritten, technische Entscheidung des
Agenten: `state.glacierRoles` bleibt (zwei Dutzend `includes`-Prüfungen und alle Testszenarien hängen daran), daneben
steht neu `state.glacierRoleTiers` (Stufe je Rolle, vom Reducer beim Pick gesetzt), und das neue Modul
`src/game/factions/ice.js` macht aus beidem die Zahlen — wie `fire.js`, `lightning.js` und `plant.js` es für ihre
Fraktionen tun. `glacier.js` hält seitdem nur noch, was **ohne** Skill gilt: Schwellen, Wucht je Stufe, Kaskade,
Kollision, Passiv, Geometrie-Faktoren, die drei Legendären. 14 Rollen-Konstanten sind dort verschwunden; ihre Zahlen
stehen nur noch in der Stufentabelle `EIS`.

**Die Leiter.** Ein Regler je Skill, Normal bis Episch.

| Skill | Regler | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- | --- |
| **Anfrieren** | Masse je Gletscher-Sieg | 1 | 2 | 3 | 4, in einer Formation +4 |
| **Schneetreiben** | Schnee ins Nachbarfeld | 2 | 3 | 4 | 5, in zwei Felder |
| **Dauerfrost** | Schnee je Durchlauf, Abstand 2 / ab 3 | 1 / 2 | 2 / 3 | 2 / 4 | 3 / 6 |
| **Verdichtung** | Masse je Punkt Gebäudewert | 0,25 | 0,4 | 0,6 | 1 |
| **Packeis** | Masse je Gletscher-Nachbar | 0,5 | 0,75 | 1 | 1,5 |
| **Eisbrücke** | Gewicht einer Diagonale | 50 % | 75 % | 100 % | 125 % |
| **Eiswall** | Berst-Faktor der vollen Linie | ×1,45 | ×1,6 | ×1,8 | ×2,1 |
| **Verzahnung** | Masse je Gletscher im Cluster | 0,15 | 0,25 | 0,4 | 0,6 |
| **Abbruchkante** | Wucht 2. / 3. Schwelle (statt 1,5 / 2,2) | 1,6 / 2,6 | 1,8 / 3 | 2,1 / 3,6 | 2,5 / 4,4 |
| **Kettenbruch** | Reichweite der Kette | 1 Schritt | 2 | 3 | ganzes Cluster |
| **Rissbildung** | Berst-Schwelle (statt 12) | 9 | 8 | 7 | 6 |
| **Gletschersturz** | je gleichzeitig brechendem Gletscher | +3 % | +5 % | +7 % | +10 % |
| **Einfrieren** | eingefrorene Gegnerkarten je Bruch | 1 | 2 | 3 | 5 |
| **Frostbund** | Stichwert für Nicht-Gletscher-Nachbarn | +2 | +3 | +4 | +6 |
| **Eispanzer** | Masse je angrenzendem Gletscher | 1 | 2 | 3 | 4 |

**Die drei Umbauten aus §5.2 sind damit gebaut.** Eisbrücke zählt die Diagonale anteilig statt als Schalter (die
Nachbarschaft selbst ist weiter die 8er, nur die Kaskade rechnet mit dem Gewicht). Kettenbruch flutete bisher ohne
Grenze durch das Cluster; jetzt ist die Reichweite die Leiter, und die alte Wirkung ist die Episch-Stufe. Einfrieren
erbt die Reichweite des gestrichenen Legendären Erstarrung: die getroffene Karte plus bis zu vier Nachbarn im
Gegnerfeld, begrenzt durch die Nachbarn, die es am Rand gibt.

**Zwei kleine Regeln sind mit der Leiter gefallen**, beide, weil der Text sie sonst verschweigt:

- Schneetreiben hatte einen Sonderfall für den leeren Gletscher (er gab seine Sieg-Masse ab, statt zusätzlich zu
  säen). Er stand in keinem Skilltext und ist jetzt weg: gesät wird immer additiv.
- Anfrieren gab den Formations-Zuschlag auf jeder Stufe. Jetzt ist er das Episch-Extra (§1: ein Effekt je normalem
  Skill).

**Wächter.** Neu `test/ice-rework.test.js`: die Tabelle hat je Skill vier verschiedene Zeilen und vier verschiedene
Sätze, jeder Skill hat einen Regler, der von Normal bis Episch wirklich anders steht, und — der eigentliche Punkt —
die Stufe schlägt bis in die Engine durch: Anfrieren friert mehr an, Schneetreiben sät in zwei Felder, Rissbildung
bricht früher, Kettenbruch läuft weiter, Eisbrücke wiegt schwerer, Einfrieren greift weiter, Eiswall zahlt mehr.
Die 20 vorhandenen Gletscher-Testdateien lesen ihre Erwartungen jetzt aus der Stufenzeile statt aus einer Konstante.

**Offen, bis der Owner es sagt:** gemessen ist nichts. Die Zahlen sind Startwerte aus dem Design, nicht aus der Sim.
Ebenfalls offen bleiben E1 bis E3 aus §5.1 (Aufstellungs-Lock, Score-Pfad, die beiden Deckel) und das Angebot.

### 5.4 Eis kommt ins Angebot und wird gemessen (2026-09-07, auf Ansage) — gemessen, nichts tariert

Owner: „jetzt messen." Vorher musste Eis ins Angebot: `SKILL_OFFER_ARCHETYPES` führt jetzt alle vier Fraktionen.
Ohne das misst `--arch ice` einen Zufallsbuild (§5.1). Balance-Guard neu zentriert.

#### Parität — Duell, 200 Läufe, ohne Legendäre

`SIM_SKILL_LEGENDARY_PER_SLOT=0 npm run sim -- --mode duel --arch fire,lightning,plant,ice --runs 200`

| Build | Median | Mean | p90 | Siegquote |
| --- | --- | --- | --- | --- |
| Feuer mono | 6,42M | 8,62M | 16,49M | 66,2 % |
| Blitz mono | 5,68M | 9,43M | 17,24M | 59,3 % |
| Pflanze mono | 7,93M | 11,94M | 22,12M | 54,8 % |
| **Eis mono** | **8,95M** | **9,55M** | **14,88M** | 55,8 % |
| Split über alle vier | 5,31M | 6,83M | 11,46M | 56,7 % |
| Mix (Random) | 3,47M | 4,67M | 7,37M | 57,3 % |

**Die drei bekannten Fraktionen sind gefallen** (Feuer 7,75 → 6,42M, Blitz 7,43 → 5,68M, Pflanze 8,36 → 7,93M), weil
das Angebot breiter geworden ist: an derselben Tür steht jetzt auch Eis, ein Mono-Build bekommt also weniger eigene
Skills. Verglichen wird deshalb **innerhalb dieses Laufs**, nicht gegen die alten Zahlen.

**Eis überschießt: 1,39× gegen Feuer, 1,58× gegen Blitz, 1,13× gegen Pflanze.** Zugleich hat es den **kürzesten
Schwanz** von allen — p90 14,9M gegen Pflanzes 22,1M, Mean 9,55M gegen 11,94M. Hoher Boden, kaum Decke: der
Gletscher zahlt in jedem Lauf ungefähr dasselbe.

#### Was die Skills tragen — Ablation, mono, zweimal

`npm run sim -- --mode skills --arch ice --explore 900 --runs 120`, einmal mit Legendären, einmal ohne.

**Ohne Legendäre ist die Fraktion flach.** Kein einziger Skill kommt über +14 %; acht liegen bei oder unter null:

| trägt | Median-Δ | | tot oder schadet |
| --- | --- | --- | --- |
| Packeis | +14 % | | Abbruchkante +1 %, Kettenbruch +1 % |
| Verzahnung | +12 % | | Schneetreiben −0 %, Rissbildung −1 % |
| Eispanzer | +9 % | | Frostbund −2 %, Eiswall −3 % |
| Einfrieren | +7 % | | Dauerfrost −3 %, Verdichtung −4 % |
| Gletschersturz | +4 %, Anfrieren +4 %, Eisbrücke +2 % | | |

**KORRIGIERT (§5.7):** dieser Vergleich stammt aus alten Protokollen. Nachgemessen liegt die Spitze bei Feuer bei
+227 %, bei Blitz bei +68 %, bei der Pflanze bei +26 % — und überall stehen 8 bis 10 von 15 bei oder unter null.

**Mit Legendären kippt das Bild ins Gegenteil:** die drei Legendären sind alles (Eiszeit ×1,49, Ewiges Schild ×1,44,
Große Lawine ×1,43, typisch +318 bis +968 %), und neun der 15 normalen Skills werden tot oder schädlich — Eiszeit
flutet die Boden-Reserve, die jeden Gletscher zum Durchlauf-Beginn ohnehin auf volle Masse zieht, und macht damit
die ganze Firn-Linie überflüssig.

#### Die Legendären im gemischten Feld

`npm run sim -- --mode legendaries --arch fire,lightning,plant,ice --runs 150 --explore 600 --table sim/out/legtable-l9.json`

| Legendär | Fraktion | typischer Effekt |
| --- | --- | --- |
| Baumreihe / Wurzelgeflecht | Pflanze | +196 % / +181 % |
| Sonnenzorn / Sonnenkern / Ewige Glut | Feuer | +76 % / +75 % / +66 % |
| Doppelentladung / Hochspannung / Resonanz | Blitz | +72 % / +57 % / +49 % |
| **Eiszeit** | Eis | **+106 %** — mitten im Band |
| **Ewiges Schild** | Eis | **−13 %** |
| **Große Lawine** | Eis | **−13 %** |

> **KORRIGIERT (§5.9):** dieser Lauf lief mit einer Werte-Tabelle ohne Eis-Einträge — die drei Eis-Zeilen wurden in
> einem Build ohne Gletscherfeld gemessen und sagen nicht, was hier behauptet wird. Zahlen mit frischer Tabelle in §5.9.

Ewiges Schild und Große Lawine sind im gemischten Build tot (besser in 46 bzw. 47 % der Seeds — ein Münzwurf), im
reinen Eis-Build dagegen die stärksten Picks. Bekenntnis-Legendäre, wie die Wachstums-Skills der Pflanze (§6.22) —
nur eben auf der Legendär-Ebene, wo es teurer wiegt.

#### Der Grund: der weiche Deckel frisst genau die Achse, auf der Eis gebaut ist

Nachgerechnet durch die echte `precomputeGlacier`, ohne Sim-Lauf (`scratchpad/burst-cap.mjs`):

| Feld | Bruch ungedeckelt | Bruch im Spiel | durchgelassen |
| --- | --- | --- | --- |
| einzelner Gletscher | 8 976 | 8 976 | 100 % |
| Block 2×2 | 19 355 | 19 355 | 100 % |
| Kreuz | 15 778 | 15 778 | 100 % |
| **Große Fläche 3×3** | **88 307** | **42 898** | **49 %** |

`BURST_SOFTCAP` liegt bei 40 000, darüber zählt nur noch `BURST_SOFTSLOPE` = 6 % des Überschusses. Der Deckel greift
also **nicht** beim einzelnen Gletscher, sondern genau ab der Form, auf die die ganze Fraktion hinspielt. Und er
frisst nicht nur Score, sondern die **Wirkung jedes Verstärkers**: Abbruchkante hebt die Wucht nominal um 18 %; in
der Großen Fläche kommen davon **+2,2 %** an. Die Ablation misst +1 %. Dasselbe trifft Kaskade, Kollision,
Gletschersturz, Eiswall und Kettenbruch — jeden multiplikativen Hebel der Fraktion.

Das erklärt beide Befunde auf einmal: warum Eis einen hohen, aber flachen Median hat (der Deckel schneidet die
Spitzen ab und lässt den Boden stehen), und warum kein Skill über +14 % kommt.

#### Vorschlag (Entscheid Owner, nichts umgesetzt)

**E3 aus §5.1 umsetzen — der Deckel raus, dafür die Grundzahl runter.** Konkret: `BURST_SOFTCAP` und
`BURST_SOFTSLOPE` streichen, `EISZEIT_MAX_GLACIERS` streichen, und `BURST_SCALE` (heute 340) so weit senken, dass
Eis im Duell auf Feuer-Niveau landet. Startwert-Vorschlag rund 200, dann ein Sweep — Eis muss von 8,95M auf etwa
6,4M, und ohne Deckel steigen die großen Brüche zusätzlich.

Was das ändert: die Verstärker wirken wieder in voller Höhe, die Große Fläche wird wieder das Ziel, das sie sein
soll, und Ewiges Schild verliert seinen stillen Preis (es hebt heute alle Gletscher auf das Maximum, und was über
12 liegt, verfällt fast wertlos als Überlauf).

**Offen bleibt danach:** ob Ewiges Schild und Große Lawine als Bekenntnis-Legendäre bleiben dürfen, und ob die
Firn-Linie neben Eiszeit noch eine Rolle hat.

### 5.5 E3 umgesetzt: Deckel raus, Gletscherzahl gedeckelt, Parität (2026-09-07, Owner) — gemessen

Owner: Ja zu E3, dazu die Frage, ob die Zahl der Gletscher je Skill-Pick ein Hebel ist („1–3 einfrieren … eventuell
mit Deckel falls jemand voll mono geht"). Beides gebaut und gemessen.

#### Was der Hebel wirklich tut

Zwei neue Regler (Sim-übersteuerbar): `GLACIER_PER_PICK` (Gletscher je Eis-Skill-Pick) und `GLACIER_MAX`
(Gesamtzahl). Duell, 120 Läufe, ohne Legendäre, gegen Feuer 6,42M:

| | ohne Gesamt-Deckel | Deckel 8 |
| --- | --- | --- |
| 1 je Pick | 19,0M | 7,9M |
| 2 je Pick | **966M** | 9,2M |
| 3 je Pick | **10 671M** | 8,8M |

Und der Deckel allein (3 je Pick): 8 → 8,8M · 10 → 17M · 12 → 26M · 16 → 108M.

**Der Deckel entscheidet, nicht die Zahl je Pick.** Ohne ihn ist die Zahl je Pick eine Katastrophe; mit ihm ein
kleiner Hebel (+17 % von 1 auf 2, danach flach). Was sie wirklich ändert, ist **wann** das Feld steht — Gefühl,
nicht Balance. Sie bleibt deshalb vorerst bei 1; der Deckel steht bei 12.

#### Warum es explodiert

Nachgerechnet ohne Sim-Lauf (`scratchpad/cluster-scaling.mjs`), kompakte Blöcke, alle Gletscher auf voller Masse:

| Gletscher | Feld-Bruch | je Gletscher | Ø Geo-Faktor |
| --- | --- | --- | --- |
| 4 | 64 328 | 16 082 | 1,00 |
| 8 | 241 996 | 30 249 | 1,44 |
| 9 | 438 079 | 48 675 | 2,23 |
| 12 | 904 892 | 75 408 | 3,25 |
| 16 | 1 490 079 | 93 130 | 3,92 |

Von 4 auf 16 Gletscher wächst der Feld-Bruch um das **23-fache** — nicht vierfach. Der Grund sind die **überlappenden
Geometrie-Formen, die sich multiplizieren**: eine einzelne Form gibt höchstens ×1,6, der Durchschnitt je Gletscher
steht bei 16 Gletschern aber bei 3,92. Zählte statt des Produkts nur die stärkste Form, wäre das Wachstum das
8-fache statt des 23-fachen (`scratchpad/geo-max.mjs`). **Das ist der eigentliche Runaway der Fraktion, und er ist
noch offen.**

#### Der Stand nach der Tarierung

`BURST_SCALE` 340 → **170** (Sweep im Duell, 200 Läufe), `GLACIER_MAX` **12** — zwölf lassen die Große Fläche (3×3,
neun Gletscher) zu und halten drei Felder Luft; acht würden die Endgame-Form unmöglich machen.

| Build | Median | Mean | p90 |
| --- | --- | --- | --- |
| Feuer mono | 6,42M | 8,62M | 16,49M |
| Blitz mono | 5,68M | 9,43M | 17,24M |
| Pflanze mono | 7,93M | 11,94M | 22,12M |
| **Eis mono** | **6,55M** | 7,41M | 12,20M |
| Split über alle vier | 5,12M | 6,59M | 11,08M |
| Mix (Random) | 3,18M | 4,42M | 6,89M |

**Parität: 1,02× gegen Feuer.** Eis behält seinen Charakter — den kürzesten Schwanz von allen (p90 12,2M gegen
Feuers 16,5M und Pflanzes 22,1M).

**Eine Falle im Sweep, fürs Protokoll:** auf 120 Seeds traf die Grundzahl 90 die Parität, auf 200 Seeds lag dieselbe
Zahl 30 % darunter. Der Eis-Score hängt an wenigen dichten Feldern, die Duell-Zeile wackelt deshalb mit dem
Seed-Satz. Tariert wurde am Ende auf denselben 200 Seeds, aus denen die Vergleichszahlen stammen.

**Balance-Guard neu zentriert:** Seeds 1..40 Median ≈ 2,52M, Mean ≈ 10,20M (vorher 2,87M / 5,92M). Der Median
fällt leicht, der Mean steigt um 72 % — die gewollte Folge des gestrichenen Deckels: ein dichtes Gletscherfeld hat
wieder eine offene Decke, und der Zufallsspieler trifft sie in wenigen Seeds. Zur Einordnung, was das Band weiter
fängt: ohne Gletscher-Deckel lag der Mean bei 352M, mit Deckel 16 bei 330M.

#### Offen

1. **Die Geometrie-Multiplikation** — der Runaway sitzt dort, nicht in der Grundzahl. Vorschlag: überlappende Formen
   multiplizieren sich nicht mehr, die stärkste zählt. Dann trägt der Deckel weniger Last und die Zahl je Pick wird
   wieder ein echter Regler.
2. **Zwei Gletscher je Pick** — kostet nur +17 %, bringt das Feld aber in die Laufmitte statt ans Laufende.
3. Ewiges Schild und Große Lawine (§5.4) sind im gemischten Build weiter tot; die Ablation ist seit der Tarierung
   nicht wiederholt.

### 5.6 Die Geometrie stapelt nicht mehr (2026-09-07, Owner) — gemessen

Owner: Ja zum Vorschlag aus §5.5. Überlappende Gletscher-Formen multiplizieren sich nicht mehr; überlappt ein
Gletscher mehrere Formen, zählt die stärkste. Eine Zeile in `glacierFormations` (`f[p] = max(f[p], factor)` statt
`f[p] *= factor`) — und der Runaway der Fraktion ist weg.

#### Was sich an der Kurve ändert

Kompakte Blöcke, alle Gletscher auf voller Masse (`scratchpad/cluster-scaling.mjs`):

| Gletscher | Feld-Bruch vorher | jetzt | je Gletscher vorher | jetzt | Ø Geo vorher | jetzt |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | 64 328 | 32 164 | 16 082 | 8 041 | 1,00 | 1,00 |
| 8 | 241 996 | 99 578 | 30 249 | 12 447 | 1,44 | 1,21 |
| 12 | 904 892 | 196 701 | 75 408 | 16 392 | 3,25 | 1,50 |
| 16 | 1 490 079 | 261 520 | 93 130 | 16 345 | 3,92 | 1,47 |
| 20 | 2 193 109 | 333 879 | 109 655 | 16 694 | 4,54 | 1,47 |

**Das Wachstum von 4 auf 16 Gletscher fällt von 23,2× auf 8,1×**, und der Bruch **je** Gletscher flacht bei rund
16 000 ab, statt bis 110 000 weiterzuklettern. Genau das war gesucht: ein größeres Feld bleibt besser, aber es ist
nicht mehr überproportional besser als die Summe seiner Teile.

#### Neu tariert

`BURST_SCALE` 170 → **250**. Die Kurve ist flacher, also darf die Grundzahl wieder höher stehen.

| Build | Median | Mean | p90 |
| --- | --- | --- | --- |
| Feuer mono | 6,42M | 8,62M | 16,49M |
| Blitz mono | 5,68M | 9,43M | 17,24M |
| Pflanze mono | 7,93M | 11,94M | 22,12M |
| **Eis mono** | **6,58M** | 7,21M | 11,87M |
| Split über alle vier | 5,21M | 6,70M | 11,17M |
| Mix (Random) | 3,32M | 4,54M | 7,01M |

Parität 1,02× gegen Feuer, wie in §5.5 — aber auf einer gesünderen Kurve.

**Balance-Guard:** Seeds 1..40 Median ≈ 2,78M, Mean ≈ 6,24M (Seeds 1..200: 2,55M / 4,47M). Der Schwanz kommt damit
fast auf den Stand vor dem ganzen Eingriff zurück (§5.4: 2,87M / 5,92M) — vorher, nach dem Streichen der Deckel,
stand er bei 10,20M. Die Deckel waren also nicht die Ursache, sondern das Pflaster.

#### Was die zwei Regler jetzt tun

Beide noch einmal gemessen, Skala 250, volles Duell über 200 Seeds:

| | Eis mono | gegen Feuer |
| --- | --- | --- |
| Deckel 12, 1 je Pick (Stand) | 6,58M | 1,02× |
| **Deckel aus**, 1 je Pick | 6,58M | 1,02× |
| Deckel 12, **2 je Pick** | 9,05M | 1,41× |

**Der Gletscher-Deckel ist für den normalen Build inert geworden.** Ein Eis-Mono-Build hält rund zehn Eis-Skills und
friert damit ohnehin unter zwölf Gletscher ein; der Median ist mit und ohne Deckel identisch. Er bleibt trotzdem
stehen, aber als Leitplanke für die Ausnahmen (mehrere Gletscher je Pick, Ablehn-Gletscher), nicht als Balance-Regler.

**Zwei Gletscher je Pick sind jetzt ein echter Hebel: +38 %** (unter der alten Geometrie waren es +17 %, und der
Deckel musste die Katastrophe abfangen). Der Mix-Lauf steigt mit (3,32M → 4,32M), das trifft also nicht nur Mono.
Wer das will, tariert die Grundzahl dafür neu — Startwert grob 170 statt 250. **Entscheid Owner, nichts umgesetzt.**

#### Offen

1. **Zwei Gletscher je Pick** — jetzt eine echte Wahl: das Feld steht in der Laufmitte statt am Laufende, Preis ist
   eine neue Tarierung.
2. Ewiges Schild und Große Lawine (§5.4) sind im gemischten Build weiter tot; Ablation und Legendär-Band sind seit
   §5.4 nicht wiederholt und stehen auf der alten Kurve.

### 5.7 Viabilität aller Skills — und eine Korrektur (2026-09-07, auf Ansage) — gemessen, nichts umgesetzt

Owner: ein Gletscher je Pick bleibt; vor den Legendären erst die Viabilität. Gemessen wurde die Ablation zweimal:
mono je Fraktion und einmal gemischt, jeweils `--explore 900 --runs 120`, ohne Legendäre in den Mono-Läufen.

#### Korrektur

**In §5.4 und §5.6 steht, bei Feuer, Blitz und Pflanze trügen die guten Skills +30 bis +100 %. Das war aus den
alten Protokollen zitiert und stimmt auf der heutigen Kurve nicht.** Nachgemessen, Mono, ohne Legendäre:

| Fraktion | die drei besten | Spitze | bei oder unter null |
| --- | --- | --- | --- |
| Feuer | Glühende Klinge +227 %, Weißglut +61 %, Feuersturm +21 % | **+227 %** | 8 von 15 |
| Blitz | Blitzableiter +68 %, Ionenfeld +26 %, Kurzschluss +26 % | +68 % | 8 von 15 |
| **Eis** | **Packeis +19 %, Gletschersturz +19 %, Verzahnung +18 %** | **+19 %** | **8 von 15** |
| Pflanze | Spalier +26 %, Blütenlese +16 %, Rankgerüst +8 % | +26 % | 10 von 15 |

**Eis ist nicht flacher als die anderen — es ist normal.** Die Pflanze, die der Owner tariert und angenommen hat,
hat oben weniger Spielraum als Eis und unten mehr tote Zeilen. Was Eis fehlt, ist der eine Ausreißer, den Feuer mit
der Glühenden Klinge hat; die Form der Verteilung ist bei allen vier dieselbe.

#### Was in jeder Fraktion aktiv schadet

Im Mono-Build hält der gierige Spieler fast alles seiner Fraktion (Haltequote 82–100 %). Eine negative Zeile heißt
dort nicht „der Platz wäre besser vergeben" — es gibt kaum Alternativen —, sondern: **der Skill kostet Score.**

| Fraktion | schadet klar (≤ −7 %) |
| --- | --- |
| Blitz | Serienschutz −29 %, Spannungsstau −10 %, Entladung −9 %, Ladungsserie −7 % |
| Feuer | Rückzündung −14 %, Schmiede −14 %, Glutbett −13 %, Glutstahl −7 % |
| Pflanze | Lücke −10 %, Setzlingsbeet −8 % |
| Eis | Dauerfrost −7 %, Verdichtung −7 %, Rissbildung −7 % |

Zeilen zwischen −5 % und +5 % sind in diesem Instrument nicht von Rauschen zu trennen und werden hier nicht als
Befund geführt. Das ist ein **fraktionsübergreifender** Befund, kein Eis-Problem: Schmiede und Glutbett wurden in
§7.14 und §6.24 eigens tariert und stehen heute im Minus.

#### Der gemischte Lauf sagt vor allem etwas über das Instrument

Gemischt (`--arch fire,lightning,plant,ice`) sieht **jede** Fraktion halb tot aus — Pflanze mit vier schädlichen
Zeilen, Blitz mit sechs toten, Feuer mit fünf. Der Grund steht in der Halte-Spalte: dort hält der gierige Spieler
je Skill nur 4–30 %, und die gepaarte Differenz ist überwiegend Rauschen (Doppelentladung steht mit +1741 % bei
1 % Haltequote — ein Seed, keine Messung). **Für Aussagen über einzelne Skills taugt nur der Mono-Lauf.**

Eine Aussage trägt der gemischte Lauf doch: **Eis ist eine Bekenntnis-Fraktion.** Nach Eiszeit (+71 %) und
Anfrieren (+33 %) ist dort alles andere Ballast, bis hinunter zu Eispanzer −20 % und Große Lawine −54 %. Wer Eis
beimischt, bekommt fast nichts; wer sich festlegt, bekommt eine Fraktion auf Parität.

#### Was daraus folgt (Vorschlag, Entscheid Owner)

1. **Eis braucht keine Sonderbehandlung mehr.** Es steht auf Parität und in der Verteilung dort, wo die anderen
   auch stehen. Die Runde kann geschlossen werden.
2. **Die zwölf klar schädlichen Skills über alle vier Fraktionen sind die eigentliche offene Baustelle** — und
   die größten davon stehen bei Blitz und Feuer, nicht bei Eis.
3. Erst danach die Legendären: sie stehen seit §5.4 auf der alten Kurve, und Ewiges Schild wie Große Lawine sind
   im gemischten Feld weiter tot.

### 5.8 Große Lawine im Takt, Ewiges Schild als ein Gletscher (2026-09-07, Owner) — umgesetzt, UNGEMESSEN

Owner: „mach die große lawine so, dass sie nicht erst am ende feuert, eventuell in einer gewissen frequenz oder
jede runde. und ewiges schild scheint auch einen buff zu brauchen."

#### Große Lawine — Takt statt Finisher

**Neu:** jeden 5. Durchlauf brechen alle Gletscher auf einen Schlag, jeder mit der Wucht der höchsten Schwelle und
×2. Vorher: einmal im letzten Durchlauf, ×6.

**Warum der Takt und nicht „jede Runde".** Jede Runde hieße: nichts wächst mehr über die erste Schwelle hinaus, weil
der Bruch die Masse jedes Mal auf 0 setzt. Damit stürbe der Kern der Fraktion — halten, wachsen, gewaltig brechen.
Ein Takt von 5 liegt knapp unter dem natürlichen Rhythmus (ein Gletscher füllt sich aus Passiv und Siegen in rund
sechs Durchläufen) und ersetzt ihn deshalb nicht, sondern **synchronisiert** ihn: alle brechen gleichzeitig, und
genau darauf zahlen Kaskade, Kollision und Gletschersturz ein.

**Der Preis, offen benannt:** wer im Takt bricht, wächst nie bis 12. Die Masse je Bruch ist kleiner, dafür ist der
Bruch dichter und die Verstärker greifen zusammen. Ob das aufgeht, ist ungemessen.

`GROSSE_LAWINE_MULT` fällt von 6 auf **2**, weil sie jetzt rund fünfmal je Lauf feuert statt einmal. Beide Zahlen
sind über `SIM_GLACIER_LAWINE_EVERY` und `SIM_GLACIER_LAWINE_MULT` sweepbar.

Der One-Shot-Zustand `grosseLawineFired` ist damit gegenstandslos und aus State, Engine, Reducer und UI entfernt.
Die Gletscherleiste zeigt statt „bereit/verbraucht" jetzt einen Countdown auf den nächsten Schlag.

#### Ewiges Schild — der Zuschlag, der verfiel, gegen einen, der zählt

Das Legendäre hob bisher alle Gletscher auf das Maximum **und legte +3 Masse obendrauf**. Der Zuschlag war fast
wertlos: die Masse ist beim Bruch auf die höchste Schwelle gedeckelt, alles darüber verfiel als Überlauf (drei
Punkte gegen einen Bruch in Zehntausenden). Genau das erklärt, warum es in §5.4 bei −13 % stand.

**Neu:** der Zuschlag ist gestrichen; stattdessen **erbt jeder Gletscher die stärkste Gletscher-Formation des
Bretts**. Das ist dieselbe Idee wie der Rest des Skills, nur zu Ende gedacht — wenn das ganze Feld ein Gletscher
ist, dann teilt es auch seine Form. Seit §5.6 zählt bei überlappenden Formen ohnehin die stärkste, der Skill
verteilt also genau eine Zahl über das Feld.

Beispiel: ein einzelner 2×2-Block irgendwo auf dem Brett hebt jeden Gletscher auf ×1,15; eine Große Fläche auf
×1,5. Vorher zahlte die Form nur den neun Feldern, die sie bilden.

#### Texte

- **Ewiges Schild:** „Dein ganzes Feld zählt als ein einziger Gletscher. Jeden Durchlauf ziehen alle deine
  Gletscher auf die Masse des stärksten hoch, nie fallend. Beim Bersten gilt jeder als Nachbar aller anderen, egal
  wo sie liegen, und jeder bekommt die stärkste Gletscher-Formation des Bretts."
- **Große Lawine:** „Jeden 5. Durchlauf brechen ALLE deine Gletscher auf einen Schlag, auch die noch nicht vollen,
  jeder mit der Wucht der höchsten Schwelle und verstärkt."

#### Offen

Gemessen ist nichts — weder die Parität nach diesen beiden Änderungen noch das Legendär-Band. Der Takt 5 und der
Verstärker 2 sind Startwerte aus der Rechnung oben, keine Sim-Ergebnisse.

### 5.9 Legendäre gemessen — und ein Messfehler, der §5.4 entwertet (2026-09-07, auf Ansage)

#### Der Fehler zuerst

`--mode legendaries` lädt seine gierige Werte-Tabelle aus der Datei hinter `--table`, **wenn die Datei existiert**;
nur sonst erkundet es neu. `sim/out/legtable-l9.json` stammt aus der Zeit vor dem Eis-Angebot und enthält
418 Feuer-, 423 Blitz-, 436 Pflanze-Einträge und **null Eis**. Der gierige Spieler bewertet Eis-Skills darin mit
nichts und nimmt nie einen.

**Die drei Eis-Legendären wurden damit in einem Build ohne jede Eis-Unterstützung gemessen** — ohne Gletscherfeld.
Der Beweis steht in den übrigen neun Zeilen: sie waren auf die Ziffer identisch mit §5.4, obwohl sich die Eis-Kurve
seit §5.4 dreimal geändert hat (E3, Geometrie, Grundzahl). Das geht nur, wenn in diesen Läufen kein Eis vorkommt.

**KORREKTUR zu §5.4:** der dortige Befund „Ewiges Schild und Große Lawine sind im gemischten Build tot (−13 %)" ist
nicht belegt. Er zeigte in die richtige Richtung, aber die Zahl maß etwas anderes als behauptet. Der Umbau in §5.8
steht damit auf einer Diagnose, die so nicht gemessen war — die beiden Gründe dafür (der am Deckel verfallende
Masse-Zuschlag, die den ganzen Lauf unsichtbare Finisher-Lawine) bleiben davon unberührt, sie waren aus dem Code
gelesen, nicht aus der Sim.

**Merksatz für die nächste Runde:** eine `--table`-Datei ist an die Welt gebunden, in der sie entstanden ist. Kommt
eine Fraktion ins Angebot, braucht sie einen neuen Dateinamen.

#### Das Band, mit einer Tabelle, die Eis kennt

`--table sim/out/legtable-l12.json` (frisch erkundet, 715 Eis-Einträge), Skill-Phase 7 von 13, gepaart, 150 Läufe:

| Legendär | Fraktion | typ. Effekt | besser in |
| --- | --- | --- | --- |
| **Eiszeit** | Eis | **+281 %** | 89 % |
| Baumreihe | Pflanze | +138 % | 85 % |
| Sonnenzorn | Feuer | +114 % | 75 % |
| Wurzelgeflecht | Pflanze | +111 % | 76 % |
| Resonanz | Blitz | +90 % | 71 % |
| Ewige Glut | Feuer | +61 % | 68 % |
| Sonnenkern | Feuer | +56 % | 70 % |
| Ewiger Frühling | Pflanze | +53 % | 72 % |
| Doppelentladung | Blitz | +49 % | 69 % |
| Hochspannung | Blitz | +34 % | 65 % |
| Große Lawine | Eis | −8 % | 46 % |
| Ewiges Schild | Eis | −7 % | 46 % |

**Prozente aus verschiedenen Läufen sind nicht vergleichbar** — eine andere Werte-Tabelle ergibt einen anderen
gierigen Spieler und eine andere Basis. Vergleichbar ist die Reihenfolge innerhalb eines Laufs.

**Eiszeit ist das eigentliche Ungleichgewicht:** doppelt so hoch wie das nächstbeste von zwölf. Das deckt sich mit
§5.4, wo sie im Mono-Build die ganze Firn-Linie überflüssig machte — sie friert sich ihre Gletscher selbst ein und
braucht die Fraktion nicht.

#### Große Lawine: die Form stimmte, der Preis nicht

Vier Messungen, gleiche Kurve, gleiche Tabelle, nur das Verhalten getauscht:

| Große Lawine | typ. Effekt | besser in |
| --- | --- | --- |
| alt: einmal im letzten Durchlauf, ×6 | −1 % | 50 % |
| Takt 5, ×2 (§5.8) | −8 % | 46 % |
| Takt 5, ×6 | +13 % | 57 % |
| **Takt 5, ×10 (gesetzt)** | **+29 %** | **60 %** |

**Der Denkfehler in §5.8 war die Senkung von ×6 auf ×2.** Begründung dort: „sie feuert jetzt fünfmal statt einmal,
also ein Fünftel des Preises." Falsch — der erzwungene Bruch **ersetzt** einen Bruch, der ohnehin gekommen wäre. Der
Verstärker ist keine Prämie je Auslösung, sondern die Entschädigung dafür, dass bei niedrigerer Masse gebrochen
wird. Wer ihn senkt, nimmt genau diese Entschädigung weg.

Der Takt selbst war richtig: er hebt die Lawine von −1 % (alte Form) auf +29 %. Gesetzt ist ×10, der beste
**gemessene** Wert; +34 % (Hochspannung) ist die Unterkante des Bandes, ×12 bis ×14 läge mitten drin, ist aber
interpoliert und nicht gemessen.

**Ewiges Schild bleibt bei −7 %.** Ob der Buff aus §5.8 geholfen hat, ist offen: das Vorher wurde mit der kaputten
Tabelle gemessen, und für die alte Schild-Mechanik gibt es keinen Schalter, also kein sauberes A/B.

#### Nebenbefund: Legendär-Chance Skill gegen Perk (Owner-Frage)

| | legendärer Skill | legendärer Perk |
| --- | --- | --- |
| Wurf | **je Platz** (3,5 %) | **je Angebot** (3,0 %) |
| je Phase | 10,1 % (geöffnete Tür) · 19,2 % (beide Türen) | 3,0 % |
| erwartet je Lauf | 1,37 | 0,39 |
| mindestens einer im Lauf | 75,1 % | 32,7 % |
| Pool | 12 | 21 |

Der Unterschied liegt nicht im Satz, sondern darin, **wo** gewürfelt wird: der Skill würfelt je Platz, der Perk
einmal je Angebot. Bei 13 Phasen und fast gleichem Satz ergibt das das 3,5-fache. Dazu zieht der seltenere Wurf aus
dem größeren Topf (21 gegen 12), und auf `exp` fehlen alle früheren Perk-Zuschläge (Shop-Bonus bis +15 Prozentpunkte,
Baum-Multiplikator, garantierte Legendäre der zweiten Perk-Phase) — sie hingen an Shop und Meta-Progression, beide
entfernt. Naheliegendster Hebel, falls gewünscht: den Perk-Wurf ebenfalls je Platz führen — das allein bringt 3,0 %
auf 8,7 % je Phase und 0,39 auf 1,17 je Lauf, ohne eine Zahl zu ändern. **Nichts umgesetzt.**

### 5.10 Legendäre Perks: Chance je Phase 3 → 7 % (2026-09-07, Owner) — umgesetzt

Owner nach dem Nebenbefund aus §5.9: „können wir die Chance je Phase von 3 auf 7 erhöhen". `PERK_LEGENDARY_BASE`
steht jetzt bei 0,07.

| | vorher | jetzt | legendärer Skill zum Vergleich |
| --- | --- | --- | --- |
| Chance je Phase | 3,0 % | **7,0 %** | 10,1 % (geöffnete Tür, drei Plätze) |
| erwartet je Lauf | 0,39 | **0,91** | 1,37 |
| mindestens einer im Lauf | 32,7 % | **61,1 %** | 75,1 % |

Damit liegt der Perk bei rund zwei Dritteln der Skill-Rate statt bei einem Drittel. Der strukturelle Unterschied
bleibt bestehen: **der Skill würfelt je Platz, der Perk einmal je Angebot.** Wer beide gleichziehen will, führt den
Perk-Wurf ebenfalls je Platz — das gäbe 8,7 % je Phase ohne eine geänderte Zahl. Der Owner hat den einfacheren Weg
gewählt; der andere bleibt offen.

Zu bedenken, falls später doch umgestellt wird: der Perk zieht aus 21 Legendären, der Skill aus 12. Ein *bestimmter*
legendärer Perk bleibt also auch bei gleicher Angebotsrate deutlich seltener als ein bestimmter legendärer Skill.

**Balance-Guard:** Seeds 1..40 Median 2,78 → **2,72M**, Mean 6,24 → **6,42M**. Beides im Band (§5.6), nicht neu
zentriert — der Zufallsspieler bekommt zwar öfter ein legendäres Perk-Angebot, nimmt es aber nicht gezielt.

### 5.11 Eiszeit: der Brett-Deckel gilt auch für sie (2026-09-08) — umgesetzt

Owner: „ok. deine Reihenfolge" — erst Eiszeit runter, dann Ewiges Schild. Vor dem ersten Wert stand die Frage,
**woran** der Abstand hängt. Er hing nicht an der Flutrate.

**Der Befund.** §5.5 hat den Brett-Deckel `GLACIER_MAX = 12` eingeführt und dabei `EISZEIT_MAX_GLACIERS`
gestrichen. Der neue Deckel wurde aber nur an die eigene Skill-Wahl gehängt, nicht an `eiszeitTick` — der Aufruf
im Motor ließ `maxGlaciers` auf seinem Vorgabewert `Infinity`. Ergebnis: **die Picks des Spielers waren bei 12
gedeckelt, die Eiszeit nicht.** Sie fror weiter ein, bis das Brett voll war, und §5.5 hatte selbst gemessen, dass
die Gletscherzahl der stärkste Treiber überhaupt ist (12 → 26M, 16 → 108M). Kein Tarif-Problem, ein Leck.

**Die Korrektur.** Ein Argument im Motor:

```js
const ez = eiszeitTick(newFirnStack, newGlacierLocked, undefined, GLACIER_MAX > 0 ? GLACIER_MAX : Infinity, challengeBlockForm);
```

Keine Zahl der Eiszeit selbst wurde angefasst — `EISZEIT_FLOOD` steht unverändert bei 3.

**Gemessen** (gepaart, Seeds 601..750, explore 600, frische Wertetabelle `legtable-l12.json` nach §5.9):

| | vorher | jetzt |
| --- | --- | --- |
| Eiszeit | +281 % | **+37 %** |
| Rang im Feld (12 Legendäre) | 1. | 8. |

Das Feld dahinter: Baumreihe +139 %, Wurzelgeflecht +109 %, Sonnenzorn +91 %, Ewige Glut +60 %, Sonnenkern
+50 %, Ewiger Frühling +49 %, Resonanz +46 %, **Eiszeit +37 %**, Doppelentladung +31 %, Große Lawine +29 %,
Hochspannung +26 %, Ewiges Schild −12 %. Die Eiszeit sitzt damit im Feld, ohne dass ein Wert geraten werden
musste. Der geplante Sweep über `SIM_GLACIER_EISZEIT_FLOOD` entfällt.

**Nebenwirkung, erwünscht:** solange die Eiszeit das Brett allein füllte, waren die Firn-Skills (Schneetreiben,
Dauerfrost, Verdichtung) neben ihr bedeutungslos. Unter dem Deckel konkurriert sie wieder um Felder.

**Text.** Zwei Stellen sagten das Gegenteil der Regel und wurden nachgezogen:

- Eiszeit endet jetzt mit „Die Eiszeit friert weiter ein, solange auf dem Brett noch Platz für Gletscher ist."
  (vorher „kriecht bis ans Brettende weiter").
- Der Glossar-Eintrag *Gletscher* nennt die Grenze: „Auf dem Brett haben höchstens 12 Gletscher Platz, egal woher
  sie kommen." Die Zahl kommt aus `GLACIER_MAX`, nicht aus dem Text.

**Lehre, zum zweiten Mal in dieser Runde nach §5.9:** eine Grenze, die nur an einer von zwei Quellen hängt, ist
keine Grenze. Wer eine alte Schranke streicht und eine neue einführt, muss jede Stelle nachziehen, die die alte
gelesen hat — nicht nur die, die der Anlass war.

**Offen:** Ewiges Schild bei −12 % ist das einzige negative Legendäre im Feld. Ursache zuerst, Wert danach.

### 5.12 Ewiges Schild: Befund, warum es negativ misst (2026-09-08) — Befund, nichts geändert

Schritt 2 der Reihenfolge. Owner-Vorgabe war ausdrücklich Ursache vor Wert: „woran es liegt, statt noch einen Buff
zu raten." Es liegt nicht an seinen Zahlen.

**Was das Schild tut.** Drei Wirkungen, alle drei hängen an der **Zahl** der Gletscher:

| Wirkung | bei 1 Gletscher | bei 2 | bei 8 |
| --- | --- | --- | --- |
| Pool aufs Maximum (`uebergletscherPool`) | wirkungslos (`gs.length < 2` → return) | fast nichts | voll |
| Kaskade „jeder ist Nachbar aller" (`gN = totalG − 1`) | ×1,0 | ×1,25 | ×2,75 |
| stärkste Formation des Bretts erben | nichts zu erben | wenig | voll |

Es gibt keine Wirkung, die bei einem einzelnen Gletscher etwas tut. Das Schild ist eine **reine Auszahlungskarte
ohne eigene Rampe.**

**Was das Brett hergibt.** Sonde über dieselben 150 Seeds wie die Legendär-Messung, gepaart, Basis gegen Eingriff:

| | gemischtes Angebot (Feuer/Blitz/Pflanze/Eis) | nur Eis |
| --- | --- | --- |
| Ø Gletscher im Lauf | **1,83** | 5,18 |
| Stiche mit ≥ 2 Gletschern | 47 % | 71 % |
| Median-Δ | **−1,2M (besser in 43 %)** | **+15,9M (besser in 77 %)** |

Und segmentiert nach der Gletscherzahl — dieselbe Karte, dieselbe Messung:

| Ø Gletscher im Lauf | n (gemischt) | Median-Δ | n (Eis) | Median-Δ |
| --- | --- | --- | --- | --- |
| 1–3 | 106 | −1,2M (41 %) | 35 | −0,4M (49 %) |
| 3–6 | 6 | +12,9M (67 %) | 25 | **+31,4M (96 %)** |
| ≥ 6 | 6 | +1,0M (67 %) | 40 | **+30,8M (90 %)** |

**Der Befund.** Die Schwelle liegt scharf bei **drei Gletschern**. Darunter tut das Schild nichts und kostet einen
Pick — das sind die −1,2M, das ist der verlorene Platz und sonst nichts. Darüber ist es mit Abstand das stärkste
Eis-Legendäre, in 90–96 % der Läufe besser. Im gemischten Angebot erreichen **12 von 150 Läufen** diese Schwelle.

**Warum die anderen beiden nicht betroffen sind:** Eiszeit bringt ihre Gletscher selbst mit, Große Lawine
multipliziert jeden einzelnen Bruch (×10) und wirkt schon bei einem. Nur das Schild braucht ein Brett, das es
nicht selbst herstellt — und `GLACIER_PER_PICK = 1` (Owner, §5.6) gibt einen Gletscher je Eis-Pick, bei
durchschnittlich 2,9 Eis-Skills im gemischten Build.

**Kein Bug.** Der Mechanismus arbeitet wie gebaut. Was fehlt, ist die Bedingung.

**Vorschläge (Mechanik → Owner-Entscheid, nichts umgesetzt):**

- **a) Das Schild bringt sein Feld selbst mit** — solange es gehalten wird, friert jeder Eis-Pick **zwei** Gletscher
  statt einem. Es wird die „geh in die Breite"-Karte statt einer Karte, die auf Breite wartet. Rührt den globalen
  Ein-Pick-Entscheid nicht an, gibt dem Schild ein eigenes Profil neben der Eiszeit. **Empfehlung.**
- **b) Boden für kleine Bretter** — die Kaskade zählt nicht mehr `Gletscher − 1`, sondern mindestens einen vollen
  Nachbarring (Boden `gN = 4`). Die tote Zone verschwindet, die Decke bleibt. Billigste Änderung, aber das Schild
  bleibt eine Karte ohne eigenes Zutun.
- **c) So lassen und ehrlich beschriften** — das Schild *ist* die Mono-Eis-Auszahlung. Dann sind die −12 % im
  gemischten Feld richtig und kein Fehler; der Text muss die Bedingung nur nennen, damit sie vor dem Pick sichtbar
  ist statt danach.

Nicht vorgeschlagen, aber der Vollständigkeit halber: `GLACIER_PER_PICK` global auf 2 hebt die ganze Fraktion, nicht
nur diese Karte — das ist der §5.6-Entscheid des Owners und wird hier nicht wieder aufgemacht.

### 5.13 Ewiges Schild bringt sein Brett selbst mit (2026-09-08, Owner: Variante a) — umgesetzt

Owner auf die drei Vorschläge aus §5.12: „a". Solange das Schild gehalten wird, friert **jeder Eis-Pick vier Felder
statt einem** (`SCHILD_PER_PICK`). Aus der Karte, die auf ein breites Brett wartet, wird die Karte, die es baut.

**Umsetzung.** Eine Zeile im Reducer, die den Regler wählt:

```js
const perPick = glacierRoles.includes(G_ROLES.L_SCHILD) ? G_SCHILD_PER_PICK : G_PER_PICK;
```

`glacierRoles` ist der Stand **nach** dem Pick — das Schild zählt also schon für seinen eigenen Pick, nicht erst ab
dem nächsten. Der globale `GLACIER_PER_PICK = 1` (Owner, §5.6) bleibt unangetastet, ebenso der Brett-Deckel
`GLACIER_MAX = 12` und der Ablehn-Gletscher: das Ablehnen bei vollen Slots gibt weiter genau einen. Das ist kein
Pick, und die Karte verspricht im Text den Pick.

**Sweep** (gepaart, dieselben 150 Seeds, Tabelle `legtable-l12.json`):

| Felder je Eis-Pick | Median-Δ | typ. | besser in |
| --- | --- | --- | --- |
| 1 (vorher) | −1,21M | −12 % | 43 % |
| 2 | +0,29M | +2 % | 52 % |
| 3 | +1,55M | +17 % | 56 % |
| **4 (gesetzt)** | **+3,12M** | **+25 %** | **63 %** |
| 5 | +5,98M | +42 % | 66 % |

Monoton, ohne Sättigung bis 5 — der Brett-Deckel bindet in diesem Bereich noch nicht.

**Warum 4 und nicht 5.** Bei 4 füllen **drei Eis-Picks das Brett auf genau `GLACIER_MAX`**; der Satz „deine Eis-Picks
füllen das Brett" ist damit wörtlich wahr und für den Spieler nachrechenbar. Bei 5 ist der dritte Pick größtenteils
gegen den Deckel verschwendet, und das Schild wäre mit +42 % das stärkste Eis-Legendäre vor Eiszeit (+35 %) und
Großer Lawine (+36 %) — für die Karte mit der Bedingung die falsche Reihenfolge. 5 bleibt als Regler offen
(`SIM_GLACIER_SCHILD_PER_PICK`), falls Eis insgesamt angehoben werden soll.

**Wirkung im Brett** (Sonde, gemischtes Angebot, 150 Seeds): Ø Gletscher im Lauf **1,83 → 2,50** schon bei 2 je Pick;
Läufe über der Drei-Gletscher-Schwelle aus §5.12 **12 → 29 von 150**. Die tote Zone, in der die Karte nichts tat, ist
weg — bei 4 ist sie in 63 % der Seeds besser statt in 43 %.

**Das Feld danach** (gepaart, Seeds 601..750, Median-Δ):

| | | | |
| --- | --- | --- | --- |
| Baumreihe +145 % | Wurzelgeflecht +109 % | Sonnenzorn +97 % | Ewiger Frühling +61 % |
| Ewige Glut +55 % | Sonnenkern +55 % | Resonanz +46 % | Große Lawine +36 % |
| Eiszeit +35 % | Doppelentladung +28 % | Hochspannung +26 % | **Ewiges Schild +25 %** |

**Alle zwölf sind positiv.** Das Feld spannt +25 bis +145 %; das negative Legendäre gibt es nicht mehr. Das Schild
sitzt am unteren Rand, zusammen mit den beiden Blitz-Karten — und liegt damit dort, wo eine Karte mit Bedingung
liegen darf.

**Text.** Die Beschreibung führt jetzt mit dem, was der Spieler entscheidet: „Jeder Eis-Skill friert von jetzt an
4 Felder ein statt einem." Die Zahl kommt aus `SCHILD_PER_PICK`, nicht aus dem Text.

**Guard:** `test/ice-rework.test.js` prüft, dass der Schild-Pick selbst schon doppelt zählt, dass jeder weitere
Eis-Pick danach ebenfalls, und dass `SCHILD_PER_PICK > GLACIER_PER_PICK` bleibt.

### 5.14 Schild: 3 je Pick, Deckel aufgehoben — und der Befund, der daraus folgt (2026-09-08, Owner)

Owner: „nimm 3 und hebe für schild das limit auf." Umgesetzt: `SCHILD_PER_PICK` 4 → **3**, und solange das Schild
gehalten wird, entfällt `GLACIER_MAX` — die Grenze sind dann nur noch die freien Felder.

**An allen vier Stellen, nicht an einer.** Die Lehre aus §5.11 gilt in beide Richtungen: eine Grenze, die nur an
einer von mehreren Quellen hängt, ist keine Grenze — und eine *aufgehobene* Grenze, die nur an einer Quelle hängt,
ist eine Inkonsistenz. Der Deckel fällt daher für den Eis-Pick, für die Nachfolge-Picks in `GLACIER_LOCK`, für den
Ablehn-Gletscher und für die Eiszeit im Motor.

**Gemessen** (gepaart, Seeds 601..750, Tabelle `legtable-l12.json`):

| Ewiges Schild | Median-Δ | typ. | besser in |
| --- | --- | --- | --- |
| 4 je Pick, Deckel bei 12 (§5.13) | +3,12M | +25 % | 63 % |
| **3 je Pick, ohne Deckel** | +2,32M | **+25 %** | 58 % |

Der aufgehobene Deckel kauft genau zurück, was der Schritt von 4 auf 3 gekostet hat. Für das Schild allein ist die
Änderung ein Nullsummenspiel.

**Der Befund, der es nicht ist: Eiszeit stieg von +35 % auf +44 %, ohne angefasst zu werden.** Ursache ist die
gemeinsame Decke. Sonde über dieselben 150 Seeds, Eiszeit eingegriffen:

| | n | Median-Δ | besser in | Ø Gletscher |
| --- | --- | --- | --- | --- |
| hält **auch** das Schild | 14 | **+305.079.292** | 86 % | 7,4 |
| hält nur die Eiszeit | 136 | +2.871.957 | 63 % | 5,5 |

**Faktor 106.** Die beiden Legendären konkurrieren nicht mehr um einen Platz, sie verstärken sich: das Schild nimmt
die Decke weg, die Eiszeit ist der Motor, der den freigewordenen Platz von selbst füllt. Zusammen frieren sie das
ganze Brett ein.

**Zweite Nebenwirkung, unabhängig davon:** ist das Brett voll, gibt es nichts mehr zu platzieren. Die
2D-Formationen aus §5.6 (Block, Kreuz, Linie, Fläche) bedeuten nur etwas, solange Felder knapp sind — wer alles
einfriert, hat die stärkste Form immer. Der aufgehobene Deckel nimmt der Fraktion ihre einzige
Aufstellungsentscheidung.

**Damit steht die Frage des Owners im Raum** („Eiszeit und Ewiges Schild sind durch die Änderungen zu ähnlich"):
beide beantworten jetzt dieselbe Frage — *wie wird mein Brett breit?* Die eine über Zeit, die andere über Picks,
mit demselben Endzustand. Vorschläge dazu in §5.15; hier steht nur der gemessene Stand.

### 5.15 Variante a getestet: die Trennung gelingt, die Auszahlung nicht (2026-09-08, Owner: „lass mal a testen")

**Gebaut.** Die Eiszeit friert nichts mehr ein. Sie flutet weiter die Boden-Reserve jedes ungefrorenen Felds, und
danach zieht jeder Gletscher je Durchlauf bis zu `EISZEIT_DRAW` Reserve aus jedem angrenzenden **offenen** Feld in
seine Masse. Ein Feld gibt nur her, was es hat — zwei Gletscher an demselben Nachbarn teilen sich dessen Vorrat.

**Die Trennung funktioniert, und zwar strukturell.** Die Eiszeit will freie Felder, das Ewige Schild gefrorene. Den
Verbund aus §5.14 (Faktor 106) kann es nicht mehr geben: die Eiszeit erzeugt keinen Gletscher mehr, also füllt sie
den vom Schild aufgehobenen Deckel nicht mehr. Die ganze Deckel-Frage aus §5.11/§5.14 fällt im Motor mit ihr weg.
Das ist kein tarierter Abstand, sondern einer, der sich nicht wieder schließen kann.

**Die Auszahlung trägt nicht.** Sweep, gepaart, dieselben 150 Seeds:

| Flut / Zug | Eiszeit | besser in |
| --- | --- | --- |
| 3 / 2 (Start) | −10 % | 44 % |
| 3 / 4 | −11 % | 44 % |
| 8 / 8 | −5 % | 48 % |
| 15 / 15 | −3 % | 49 % |

Der Zug ist nicht die Bremse: 2 → 4 ändert nichts, weil ein gezogenes Feld sich nur mit der Flutrate nachfüllt.
Aber auch die Flut läuft asymptotisch gegen null und erreicht das Band der übrigen elf (+21…+145 %) nie.

**Warum — nachgerechnet, nicht geraten.** Beim Bruch deckelt `mCap` die Masse auf die höchste Schwelle (12); alles
darüber verfällt als Überlauf zu fast nichts. Und ein Gletscher birst höchstens **einmal je Durchlauf**. Bei Flut 8
und vier offenen Nachbarn zieht er 32 und kassiert 12 — der Rest ist weg. Sobald jeder Gletscher jeden Durchlauf
birst, ist jede weitere Flut vollständig verschenkt; genau da liegt die Decke, und sie ist bei Flut 8 schon
erreicht.

**Der eigentliche Fehler war meiner, nicht der des Reglers.** Die alte Eiszeit fügte **Gletscher** hinzu, und die
Gletscherzahl wirkt überlinear (§5.5: 12 → 26M, 16 → 108M), weil Kaskade, Kollision und Geometrie alle an der
Nachbarschaft hängen. Die neue füttert **Masse**, und Masse ist linear und gedeckelt. Ich habe einen überlinearen
Effekt gegen einen begrenzten getauscht — das repariert keine Zahl.

**Vorschlag, der Variante a behält und die Form korrigiert** (Mechanik → Owner-Entscheid, nicht umgesetzt): die
Eiszeit zahlt nicht in Masse, sondern in **Berstkraft**, spiegelbildlich zur vorhandenen Dichte-Kaskade.

| | heute im Code | Eiszeit-Spiegel |
| --- | --- | --- |
| Berstfaktor | `1 + 0,25 × Gletscher-Nachbarn` | `1 + x × offene Nachbarn` |

Ein einzelner Gletscher auf leerem Brett birst dann gewaltig, ein volles Brett gibt der Eiszeit nichts — dieselbe
Umkehrung wie jetzt, aber auf der Achse, die die Zahlen der Fraktion ohnehin treibt, und ohne neuen Begriff und
ohne Direkt-Score. Die Masse-Variante bleibt über `EISZEIT_DRAW` erhalten und ist eine Konstante von der Rückkehr
entfernt.

**Offene Naht, unabhängig davon:** Dauerfrost speist die neue Eiszeit nicht. Er füllt gezielt Felder mit Abstand
≥ 2 zum Gletscher (der Ring bekommt 0), der Zug nimmt aber nur aus dem angrenzenden Ring. Schneetreiben speist sie,
Dauerfrost nicht.

### 5.16 Die Eiszeit zahlt in Berstkraft (2026-09-08, Owner: „bau und messe") — umgesetzt

§5.15 hatte gemessen, dass die Masse-Variante nicht trägt, und die Ursache benannt: `mCap` deckelt die Bruchmasse
auf die höchste Schwelle, und ein Gletscher birst höchstens einmal je Durchlauf — jede Flut darüber hinaus verfällt.
Die Berstkraft kennt diese Decke nicht.

**Gebaut.** Ein Faktor im Bruch, direkt neben der Dichte-Kaskade, als deren Spiegel:

| | zählt | Faktor |
| --- | --- | --- |
| Kaskade (Dichte, im Code seit §2.3) | **gefrorene** Nachbarn | `1 + 0,25 × gN` |
| **Eiszeit (neu)** | **offene** Nachbarn | `1 + 2 × oN` |

Beide Seiten benutzen dieselbe Gewichtung `wOf`, sind also exakte Komplemente: eine Diagonale, die der Dichte unter
der Eisbrücke nur anteilig zählt, zählt der Eiszeit auch nur anteilig. Ohne das hätte die Eisbrücke der Eiszeit
doppelt gezahlt (bis 17× statt 9×) — ein Fehler in meinem ersten Wurf, vor der Endmessung korrigiert.

Der Zug aus §5.15 bleibt bei `EISZEIT_DRAW = 2`. Die beiden arbeiten zusammen, nicht nebeneinander: der Zug bringt
den Gletscher überhaupt erst auf die Schwelle, die Berstkraft zahlt den Bruch aus.

**Sweep** (gepaart, Seeds 601..750, Tabelle `legtable-l12.json`):

| je offenem Nachbarn | Eiszeit | besser in |
| --- | --- | --- |
| 0,25 | −4 % | 47 % |
| 0,5 | −1 % | 50 % |
| 1 | +13 % | 52 % |
| **2 (gesetzt)** | **+30 %** | **56 %** |

**Das Feld** (Median-Δ, gepaart): Baumreihe +137 %, Wurzelgeflecht +129 %, Sonnenzorn +102 %, Ewiger Frühling
+55 %, Ewige Glut +54 %, Sonnenkern +52 %, Resonanz +48 %, Große Lawine +33 %, Doppelentladung +31 %, **Eiszeit
+30 %**, Ewiges Schild +25 %, Hochspannung +24 %.

Alle zwölf positiv, +24 bis +137 %. Die drei Eis-Karten liegen mit +25 / +30 / +33 % eng beieinander.

**Die Trennung, nachgemessen.** Sonde über dieselben 150 Seeds, Eiszeit eingegriffen:

| Läufe mit beiden Eis-Legendären | Median-Δ |
| --- | --- |
| §5.14 (beide füllten das Brett) | +305.079.292 |
| **jetzt** | **+30.283.622** |

**Faktor 10 weniger**, und die Art der Kopplung ist eine andere: sie füllen nicht mehr gemeinsam das Brett (Ø 2,4
Gletscher statt 7,4), sondern das Schild erhöht die Berst-*Häufigkeit* und die Eiszeit die Berst-*Wucht*. Das ist
**selbstbegrenzend**: wer das Schild wirklich in die Breite spielt, friert die offenen Felder weg, von denen die
Eiszeit lebt. Auf vollem Brett ist ihr Faktor exakt 1,00 — der Guard prüft genau diesen Punkt.

**Offen, unverändert seit §5.15:** Dauerfrost speist die Eiszeit nicht. Er füllt gezielt Felder mit Abstand ≥ 2,
der Zug nimmt nur aus dem angrenzenden Ring. Für die Berstkraft ist das folgenlos — sie zählt Nachbarn, nicht
Reserve. Wenn die Firn-Skills als Familie zusammenspielen sollen, ist das ein eigener kleiner Schritt.

### 5.17 Die Firn-Familie bekommt eine gemeinsame Währung (2026-09-08, Owner: „eigener kleiner Schritt")

Die offene Naht aus §5.15/§5.16 war, dass Dauerfrost die Eiszeit nicht speist. Vor dem Bauen die Prüfung, ob eine
Kopplung überhaupt etwas bringen kann — und dabei stand die eigentliche Ursache im Weg.

**Der Befund: totes Kapital.** Eine Feld-Reserve kann höchstens `FIRN_REFILL_TARGET` (12) abrufen; darüber liegt
sie brach, bis das Feld einfriert. Sonde über 60 Läufe, nur ungefrorene Felder:

| | |
| --- | --- |
| Reserve über der Verwertungsgrenze | **69,0 %** |
| höchster je gesehener Stand auf einem Feld | **136** |

Dauerfrost füllt jeden Durchlauf weiter in einen Eimer, der 12 fasst, auf Feldern, die meist nie einfrieren. §5.7
hatte ihn schon vor allen Eiszeit-Änderungen bei −7 % gemessen; das passt zusammen. Die fehlende Kopplung war das
Symptom, nicht die Ursache.

**Der Schritt.** Der Zug endete am Ring, Dauerfrost füllt gezielt Felder mit Abstand ≥ 2 — seine Reserve kam nie an.
Jetzt gibt **jedes offene Feld bis zu `EISZEIT_DRAW` an den nächstgelegenen Gletscher ab**, einmal, nicht an jeden.
Ein Satz, kein Radius, kein neuer Begriff; `neighborFn` fällt aus der Signatur, weil der Zug keine Nachbarschaft
mehr braucht. Schneetreiben (nahe Quelle), Dauerfrost (ferne Quelle) und Eiszeit (Abnehmer) teilen sich damit eine
Währung.

**Gemessen** (gepaart, Seeds 601..750):

| Eiszeit | Median-Δ | typ. | besser in |
| --- | --- | --- | --- |
| §5.16 (Zug nur am Ring) | 2.047.935 | +30 % | 56 % |
| **jetzt** | **5.278.281** | **+42 %** | **63 %** |

Sie ist damit die stärkste der drei Eis-Karten (Große Lawine +34 %, Ewiges Schild +25 %) und liegt im Band
(+25…+134 %).

**Korrektur an §5.15.** Dort steht „Masse füttern trägt nicht" — das galt, **solange der Berstfaktor 1 war**. Mit
dem Faktor aus §5.16 (bis 9× bei vier offenen Nachbarn) wandelt zusätzliche Masse sich in Berst-*Häufigkeit*, und
jeder dieser Brüche ist neunfach wert. Die beiden Änderungen wirken nur zusammen: §5.16 allein hätte einen seltenen
Bruch stark gemacht, §5.17 allein einen häufigen Bruch schwach. Der Satz aus §5.15 bleibt richtig für die Welt, in
der er gemessen wurde, und ist außerhalb davon zu eng.

**Was der Schritt NICHT löst, ehrlich gemessen.** Der Zug ist eine Eiszeit-Mechanik. Ohne sie ändert sich nichts:
in der Dauerfrost-Kohorte liegen vorher wie nachher **65,2 %** der Reserve über der Grenze, gleiche Seeds, gleiche
17 Läufe. Die Familie hängt jetzt über das Legendäre zusammen, nicht aus sich heraus. Wer Dauerfrost ohne Eiszeit
spielt, füllt weiter einen Eimer, der 12 fasst. Das ist der nächste Schritt, wenn er gewünscht ist — und er gehört
zu Dauerfrost, nicht zur Eiszeit.

**Verbund gegengeprüft**, weil die Eiszeit stärker wurde:

| Läufe mit beiden Eis-Legendären | zusammen | nur eines | Faktor |
| --- | --- | --- | --- |
| §5.14 (beide füllten das Brett) | +305,1M | +2,9M | **106** |
| jetzt | +38,0M | +3,3M | **11** |

Die Trennung hält, und diesmal auf gesunder Basis: die Eiszeit allein ist +3,3M wert, nicht mehr nahe null wie in
§5.16.

### 5.18 Der Eis-Umbau: eine Achse, ein Ventil, ein Kampfwert-Hebel (2026-09-09, Owner) — umgesetzt und gemessen

Owner-Befund: „Eis is not hitting the mark. im Vergleich zu den anderen etwas zu schwer gut an score zu kommen. eis hat
aktuell von seinen skills keinen Fokus auf serie und verliert dadurch viele Stiche. die skill Auswahl ist zu breit
ausgelegt auf eng und breit bauen … Schnee ist zu situativ … wir brauchen die skills so das sich jeder gut anfühlt für
Eis zu locken, vllt nicht in jedem misch build aber zumindest für jedes Eis build."

#### Der Befund vor dem Bauen

1. **Warum die Stiche fehlen.** `glacierDirect = payout × glacierWinMult` — und `glacierWinMult` wird nur im
   Sieg-Zweig gesetzt (engine.js). Der Bruch bekommt Serie, Perks, Formation und Crit also **nur, wenn die
   Gletscherkarte ihren Stich gewinnt**, sonst zahlt er ×1. Die Fraktion, deren ganzer Score daran hängt, hatte
   **keinen einzigen Skill, der einen Gletscher stärker kämpfen lässt** — Frostbund buffte die *Nicht*-Gletscher, und
   Verdichtung nahm der Karte den Gebäude-Wertbonus sogar weg. Feuer hat die Glühende Klinge, Blitz den Blitzfänger,
   Pflanze den Ewigen Frühling.
2. **Der eng/breit-Riss ist einseitig.** Dichte wollen Packeis, Verzahnung, Eiswall, Kettenbruch — dazu Kaskade,
   Kollision und alle vier 2D-Formen. Offenen Boden wollten nur Schneetreiben, Dauerfrost und Frostbund. Kein
   Gegenpol also, sondern drei Ausreißer gegen das eigene Fundament, bei einer Brett-Entscheidung, die unumkehrbar
   und früh fällt.
3. **Schnee war eine Wette** auf „dieses Feld friert später ein" — bei Deckel 12 auf 40 Feldern selten. §5.17 hatte
   65 % der Reserve als totes Kapital gemessen und den Schritt ausdrücklich offen gelassen.

#### Was gebaut wurde

| | |
| --- | --- |
| **F1 · Der Zug ins Fundament** | Jedes offene Feld gibt je Durchlauf bis zu `FIRN_DRAW` (1) an den nächstgelegenen Gletscher ab. Die Mechanik steckte seit §5.17 in der Eiszeit; jetzt zahlen Schneetreiben und Dauerfrost ab Runde eins, in jeder Geometrie, ohne Wette. Dauerfrosts Null-Ring fällt. |
| **F2 · Vierte Schwelle** | Schwellen 4 / 8 / 12 / **18**, Wucht ×1 / ×1,5 / ×2,2 / **×3,2**. `BURST_AT` ist von `TOP` entkoppelt und bleibt 12. |
| **F3 · Überschuss bleibt liegen** | Der Bruch rechnet mit der vollen Masse statt mit gedeckelten 12; danach bleibt `Masse − BURST_AT` liegen. Der alte Überlauf-Score (1 Punkt je Masse neben ×250) entfällt — ein Ventil statt zwei. |
| **Gletscherzunge** (SK_ICE_13) | Ersetzt Rissbildung. „+1 Wert je 6/4/3/2 Masse"; Episch reicht die Hälfte an die Nachbarkarten weiter (stärkster Anspruch, nicht Summe). |
| **Sprödbruch** (SK_ICE_17) | Ersetzt Eispanzer. „+0,5/0,75/1/1,5 % Crit-Chance je Punkt Masse"; Episch gibt ein Crit +3 Masse zurück. Crit ist der größte Hebel auf den Bruch, und kein Eis-Skill bediente ihn. |
| **Verdichtung** | Neu gebaut: Masse je Punkt Kampfwert **über dem Grundwert**, ohne etwas zu unterdrücken, aus jeder Quelle. |
| **Frostbund** | Bufft **alle** Nachbarn statt nur der fremden. |
| **Eiszeit** | Behält Flut und Berstkraft; der Zug gehört ihr nicht mehr allein. |

**Ein Fehler beim Bauen, den ein Test gefangen hat.** Der Bruch-Abfall wird dem Feld **vor** der Wertberechnung
abgezogen (engine.js, `burn`/`consumed`). Wer den laufenden Akkumulator liest, lässt den Gletscher ausgerechnet in
seiner Bruchrunde mit +0 kämpfen — der Runde, in der ein Sieg am meisten wert ist. Zunge und Sprödbruch lesen deshalb
`glacierPreNow.snapMass`, dieselbe Masse, aus der der Bruch gerechnet wird.

**Die Rückkopplung, die zugemacht wurde.** Masse gibt Kampfwert (Zunge), Kampfwert gibt Masse (Verdichtung) — als
Kreis wüchse die Masse je Durchlauf um einen Bruchteil ihrer selbst und liefe ab ~24 geometrisch weg. Verdichtung
zählt den Zungen-Bonus deshalb nicht mit. (Die erste Einschätzung „gedämpft, darf stehen bleiben" war falsch: sie
rechnete einen Durchgang statt der Wiederholung.)

#### Gemessen — und zwei Eingriffe, die daraus folgten

**(a) F3 nahm der Masse die einzige Decke.** Ohne Deckel auf den liegenbleibenden Überschuss lag der Zufallsspieler
(Seeds 1..40) bei **Mean 48,25M**, ein Seed auf 959M. Ein ausgebautes Cluster gewinnt je Durchlauf mehr, als der Bruch
abzieht. Sweep über `KEEP_MAX`:

| KEEP_MAX | Median | Mean | Max |
| --- | --- | --- | --- |
| 0 (kein Deckel) | 3,95M | **48,25M** | 959,3M |
| 12 | 3,95M | 10,19M | 130,6M |
| **6** | **3,94M** | **9,47M** | 124,2M |
| 3 | 3,86M | 9,20M | 119,5M |

Der Deckel **kostet den Median nichts** (3,95 → 3,94M) und schneidet nur den Schwanz. 6 gesetzt — der Abstand zwischen
dritter und vierter Schwelle. Es ist kein Deckel je Einzelbruch (der bleibt gestrichen, §5.5), sondern eine Grenze für
das, was liegen bleibt.

**(b) Eis war danach zu stark.** Duell Eis/Feuer (Seeds 401..470), Median Eis ÷ Feuer:
250 → **1,65×**, 150 → **1,04×**, 110 → 0,80×. `BURST_SCALE` 250 → **150** gesetzt.

**Woher die Kraft kam — nicht von den neuen Skills.** Ablation Eis mono (explore 500, greedy 90):

| | Median-Δ | |
| --- | --- | --- |
| Ewiges Schild | +2999 % | die drei Legendären tragen |
| Große Lawine | +218 % | F2/F3 haben sie mitmultipliziert |
| Eiszeit | +199 % | |
| Gletschersturz | +83 % | |
| **Sprödbruch** | **+19 %** | die neuen Skills sind Mittelfeld |
| **Gletscherzunge** | **−1 %** | im gierigen Mono tot (s. u.) |
| Dauerfrost | −2 % | trotz F1 weiter unten |

**Endstand** Seeds 1..40: Median ≈ 3,36M, Mean ≈ 7,70M — **beide im bestehenden Band des Balance-Guards**, die Grenzen
sind deshalb unverändert geblieben.

#### Offen (Entscheid Owner)

1. **Die Gletscherzunge misst im gierigen Mono-Eis als tot (−1 %).** Der Grund ist erklärbar: dort liegt die
   Siegquote schon bei 63 %, der Hebel „gewinne den Stich, der den Bruch trägt" greift also selten. Ihr eigentliches
   Ziel — dass sich ein Eis-Build *nicht mehr wie Stiche-Verlieren anfühlt* — misst dieses Instrument nicht. Ob das
   reicht oder ob sie einen zweiten Hook braucht, ist eine Playtest-Frage, keine Sim-Frage.
2. **Der Schwanz gehört den Legendären**, nicht dem Fundament: Mean/p90 stehen im Duell weiter bei 2,79× / 1,85×
   gegen Feuer, während der Median auf 1,04× sitzt. Ewiges Schild mit +2999 % ist die eigentliche offene Baustelle —
   und es war schon vor §5.18 die stärkste der drei.
3. **Dauerfrost bleibt bei −2 %**, obwohl F1 genau seine Naht war. Der Zug allein trägt ihn nicht.

### 5.19 Ewiges Schild: der Deckel auf der Kaskade und das Ende der Gelddruckmaschine (2026-09-09, Owner) — umgesetzt und gemessen

§5.18 hatte das Schild bei **+2999 %** gemessen und als nächste Baustelle benannt. Owner: „ewigen Schild als
nächstes". Der Befund vor dem Bauen — das Schild tut drei Dinge, und zwei davon hatten keine Bremse.

**Die Kaskade war eine Zahl, die für vier gebaut wurde.** `KASKADE_PER_NEIGHBOR` gibt +25 % Wucht je angrenzendem
Gletscher; ein Gletscher hat höchstens 4 Nachbarn (mit Eisbrücke 8), also höchstens ×2. Das Schild setzte
`gN = totalG − 1` — bei 40 Gletschern also 39, mithin **×10,75**. Und weil jeder Gletscher das bekommt, wuchs der
Feld-Score **im Quadrat der Feldgröße**. Zusammen mit „3 Felder je Pick, ohne Deckel" (§5.14) waren zwei
unbegrenzte Größen miteinander multipliziert.

**Das Pooling erschuf Masse.** `uebergletscherPool` hob jede Runde alle Gletscher auf das MAXIMUM. 30 Gletscher,
einer auf 18, der Rest auf 2 → danach alle auf 18: **480 Masse je Durchlauf aus dem Nichts**. Nebenwirkung war die
eigentliche Frequenz-Explosion: danach brachen ALLE jede Runde statt nur der eine.

#### Der Schritt (Owner: „deine Empfehlung")

| | |
| --- | --- |
| **A · Kaskade gedeckelt** | Das Schild zählt einem Gletscher höchstens `SCHILD_NEIGHBORS` (8) Nachbarn zu — der voll umschlossene Gletscher, die Obergrenze, die auf dem Brett überhaupt erreichbar ist. ×3 statt ×10,75, und die Feldgröße multipliziert sich nicht mehr selbst. |
| **B · Pooling auf den Durchschnitt** | Statt aufs Maximum. Die Masse wird **verteilt statt gedruckt**, die Summe bleibt erhalten. |

Zu B gehört eine Textänderung: „nie fallend" ist weg, es heißt jetzt „jeden Durchlauf teilen sich alle dieselbe
Masse". Das war die eine Frage an den Owner, weil es ein Versprechen auf der Karte betrifft. Begründung für die
Empfehlung: die halbe Strecke (Maximum, aber nur halb aufrücken) hätte es nur verzögert — über 40 Durchläufe stehen
trotzdem alle oben. Und der Durchschnitt trifft die Fantasie besser: EIN Gletscher hat EINE Masse, das Maximum sind
30 Kopien des besten.

„3 Felder je Pick, ohne Deckel" bleibt unangetastet (Owner-Entscheid §5.13/§5.14) — ohne A und B lohnt sich das
große Brett nicht mehr überproportional.

#### Gemessen

Duell Eis/Feuer (Seeds 401..470), Eis ÷ Feuer:

| | Median | Mean | p90 |
| --- | --- | --- | --- |
| §5.18 (nach BURST_SCALE 150) | 1,04× | 2,79× | 1,85× |
| **jetzt** | **1,04×** | **1,30×** | **1,51×** |

Der Median steht still, der Schwanz fällt — genau die beabsichtigte Operation. Ablation Eis mono (explore 500,
greedy 90, Seeds 701..): **Ewiges Schild +2999 % → +446 %**; die drei Legendären liegen damit in einem Band
(446 / 244 / 91 %) statt in getrennten Universen. Balance-Guard Seeds 1..40 unverändert bei 3,36M / 7,70M — der
Zufallsspieler hält das Schild in diesen Seeds nie auf einem großen Feld, ihn berührt der Schritt nicht.

#### Offen

**Gletscherzunge (−10 %) und Sprödbruch (−9 %) messen im gierigen Mono-Eis negativ.** Beide liegen knapp außerhalb
des Rauschbandes, das §5.7 mit ±5 % beziffert hat, und die Zahlen sind mit der Runde davor nicht direkt
vergleichbar (dazwischen liegt BURST_SCALE 250 → 150). Der strukturelle Grund bleibt der aus §5.18: dort steht die
Siegquote schon bei 63 %, der Hebel „gewinne den Stich, der den Bruch trägt" greift also selten, und der Sim misst
nicht, wofür die beiden gebaut wurden. Das entscheidet der Playtest, nicht dieses Instrument.

### 5.20 Sprödbruch verdoppelt — und Kettenbruch ist der neue Anti-Skill (2026-09-09, Owner)

Owner: „sprödbruch werte verdoppeln, und wie steht kettenbruch aktuell da".

**Sprödbruch** 0,5/0,75/1/1,5 → **1/1,5/2/3 %** Crit-Chance je Punkt Masse (bei Masse 12 also 12/18/24/36 %). Der
Startwert war in §5.18 bewusst niedrig gesetzt, weil Crit multiplikativ auf den Bruch wirkt. Ablation (gleiche Seeds
701.., explore 500 / greedy 90): **−9 % → +51 %**, damit Platz 4 direkt hinter den drei Legendären. Die
**Gletscherzunge** ist mitgestiegen (**−10 % → +11 %**) — sie hängt am selben Sieg-Stack, den der Crit multipliziert.

Nebenbei: der Wächter in `glacier-roles-b2.test.js` tippte die Prozente ab und ist an der Verdopplung zerbrochen. Er
leitet seine Würfe jetzt aus `EIS.sproedbruch` ab — eine Neutarierung darf einen Wächter nicht mehr rot machen.

#### Kettenbruch: −18 %, der schlechteste Skill der Fraktion

Er war in §5.18 bei −8 % und ist jetzt bei **−18 %** (Haltequote 59 %, Siegquote der Ablation 34 %, Leiter invertiert:
N 0,66 · S 0,73 · SS 0,56 · E 1,01). Die Ursache ist strukturell, nicht numerisch — **er verbrennt Masse**. Sonde,
ein reifer Gletscher (12) neben drei jungen (5):

| | Brüche | Score | Masse danach |
| --- | --- | --- | --- |
| ohne Kettenbruch | 1 | 6.188 | 0 / 5 / 5 / 5 |
| mit Kettenbruch | 2 | 7.688 | 0 / **0** / 5 / 5 |

Er kassiert 5 Masse sofort auf Stufe 1 für +1.500 — und wirft damit den Weg zu einem Bruch auf Stufe 3 oder 4 weg,
der ein Vielfaches wert gewesen wäre. Ein erzwungener Bruch rechnet mit `Math.max(1, natTier)`, und seit §5.18 fällt
das Feld dabei auf `max(0, Masse − 12)`, also auf null. **§5.18 hat ihn also verschlimmert:** mit der vierten Schwelle
lohnt sich Warten mehr denn je, und er ist die Regel, die das Warten unterbricht.

Das ist exakt die Form, in der Rissbildung als Anti-Skill erkannt und in §5.18 ersetzt wurde („halten & wachsen, dann
gewaltig brechen" — und Kettenbruch bricht früh). Der Entscheid, ob er umgebaut oder ersetzt wird, liegt beim Owner.

### 5.21 Kettenbruch sammelt Masse, statt sie zu verbrennen (2026-09-09, Owner) — umgesetzt und gemessen

§5.20 hatte ihn bei −18 % vermessen und die Ursache benannt: der erzwungene Bruch eines unreifen Gletschers zahlt auf
Stufe 1 und lässt das Feld auf null fallen. Owner: „lege erstmal ein Design vor" — und zum Vorschlag der zutreffende
Einwand: „ich verliere wiederum den bruch von einem anderen Gletscher der kompensiert werden muss".

#### Die Regel

> Bricht ein Gletscher, reißt er die **Masse** angrenzender Gletscher mit in seinen Bruch: ihre Felder fallen auf
> null, ihre Masse zählt zu seiner. Die Kette läuft 1 · 2 · 3 Schritte · Episch durch das ganze Cluster.

Aus dem Skill, der die vierte Schwelle sabotiert, wird der Skill, der sie **erreicht** — 27 Masse bringt kein
Gletscher allein zusammen. Die Leiter dreht sich damit richtig herum: Episch war die schlechteste Stufe (je weiter
die Kette, desto mehr verbrannte sie), jetzt ist es die stärkste.

**Die Kompensation, ohne die der Owner nicht zugestimmt hätte.** Der Einwand traf, aber nur zur Hälfte — und das
ist messbar. Score je Punkt Masse, einzelner Gletscher: **330 bei Masse 12–17, 480 ab 18.** Die Masse ist also
kompensiert (+45 %), aber **erst wenn die Kette wirklich über 18 kommt**; darunter ist der Satz derselbe. Was gar
nicht kompensiert war, sind die Bruch-*Ereignisse*: Einfrieren, Frostbund und Gletschersturz zahlen je brechendem
Gletscher, nicht je Masse. **Deshalb gilt ein absorbiertes Feld weiter als gebrochen** — es steht in `breaks`, zahlt
aber `burst: 0`. Damit ist die Bilanz nie schlechter als vorher.

Sonde (reifer Gletscher 12, drei junge auf 5):

| | Brüche | Score |
| --- | --- | --- |
| ohne Skill | 1 | 6.188 |
| alt (verbrennt) | 2 | 7.688 |
| **neu, ein Schritt** | 2 | 8.766 |
| **neu, ganzes Cluster** | 4 | **20.250** (27 Masse, Stufe 4) |

#### Gemessen

**Kettenbruch −18 % → −5 %**, damit im Rauschband, das §5.7 mit ±5 % beziffert. Er schadet nicht mehr.

Die Parität ist dabei weggelaufen: Duell Eis/Feuer (Seeds 401..470) stand der Median auf **1,47×**. `BURST_SCALE`
150 → **105** bringt ihn auf 1,07× (Sweep: 150 → 1,47×, 120 → 1,21×, 105 → 1,07×). Balance-Guard Seeds 1..40
danach 3,17M / 7,02M — beide im bestehenden Band, die Grenzen bleiben unverändert.

#### Offen

1. **Die Haltequote des Kettenbruchs ist auf 17 % gefallen** (vorher 59 %). Der gierige Spieler nimmt ihn kaum noch
   — und bei 17 % ist die −5 % auf dünner Stichprobe gemessen. Ob er zu selten *angeboten* oder zu schwach *gewertet*
   wird, trennt dieses Instrument nicht.
2. **Eis behält einen fetteren Schwanz als Feuer**: Median 1,07×, aber Mean 1,46× und p90 1,52×. Das zieht sich
   durch §5.19 bis hier und liegt an den Legendären, nicht am Fundament.
3. **Eiswall ist jetzt die unterste Zeile** (−6 % bei 100 % Haltequote) — die nächste Kandidatin, wenn eine Runde
   gewünscht ist.

### 5.22 Kettenbruch: zwei Buffs gebaut, beide gemessen, beide zurückgenommen (2026-09-09, Owner)

Owner: „Kettenbruch erstmal noch weiter buffen". §5.21 hatte ihn von −18 % auf −5 % gebracht, aber die Haltequote
fiel dabei von 59 % auf 17 %. **Beide Versuche haben ihn nicht verbessert; der Code steht wieder auf dem Stand von
§5.21.** Der Eintrag existiert, damit niemand sie ein zweites Mal baut.

**Versuch 1 — die Kette sammelt auch REIFE Nachbarn ein.** Bis dahin übersprang sie jeden, der selbst bricht; in
einem gut gebauten Cluster also fast alle, was die niedrige Haltequote erklärte. Die Rechnung sah gut aus (480 statt
330 Score je Punkt Masse auf der vierten Schwelle, also +45 %). Gemessen wurde Eis dadurch **schwächer**: Median im
Duell 1,07× → **0,86×** Feuer, Haltequote 17 % → **0 %**. Ein reifer Gletscher hätte selbst gebrochen und dabei
seinen eigenen vollen Sieg-Stack bekommen — eingesammelt fällt der weg, und +45 % auf die Masse decken das nicht.

**Versuch 2 — die eingesammelte Masse zählt im Bruch doppelt.** Das sollte bezahlen, was das Absaugen kostet.
Gemessen: Lift **0,68**, Median-Δ **−7 %**, Haltequote 33 %. Die Parität lief auf 1,20× weg, ohne dass der Skill
selbst besser dastand — der Buff hob die Fraktion, nicht ihn.

#### Warum kein Zahlen-Buff greift

Vier Messungen, vier Lifts unter 1 (0,72 · 0,49 · 0,35 · 0,68), Siegquote der Ablation durchweg 27–34 %. Das ist
kein Rauschen, und die Ursache liegt nicht im Auszahlungssatz:

**Die Kette feuert JEDE Runde, in der ihr Auslöser bricht — und nullt dabei jedes Mal dieselben Nachbarn.** Die
reifen deshalb nie. Ein Feld, das jede Runde auf 0 gesetzt wird, sammelt nie mehr als den Ewigen Frost an; die
eingesammelte Masse bleibt also dauerhaft winzig, und ein Faktor auf eine winzige Zahl bleibt winzig. Gleichzeitig
kostet das Absaugen den Nachbarn dauerhaft seinen eigenen Bruch. Der Skill ist damit **eine dauerhafte Steuer auf
seine eigene Nachbarschaft**, kein einmaliger Handel — und das lässt sich nicht wegtarieren.

#### Vorschlag (Entscheid Owner)

**Die Kette muss ein EREIGNIS werden, kein Dauerzustand.** Empfehlung: sie feuert nur, wenn der Auslöser auf der
**vierten Schwelle** bricht (ab 18 Masse) statt bei jedem Bruch. Dann haben die Nachbarn zwischen zwei Ketten Runden
Zeit zu reifen, die eingesammelte Masse ist beim Auslösen groß statt winzig — und der Skill hängt an genau der
Schwelle, die §5.18 geschaffen hat. Alternativen wären ein Takt wie bei der Großen Lawine oder ein Absaugen, das
nur die halbe Masse nimmt und dem Feld seinen Vorlauf lässt.

### 5.23 Eisbeben ersetzt den Kettenbruch (2026-09-09, Owner) — umgesetzt und gemessen

Owner: „ne, ich mag die fixes nicht. skill ändern. neue Designrunde." — und aus der Runde: „eisbeben".

**Die Mechanik.** Bricht ein Gletscher über der Berst-Schwelle, bebt das Eis nach: je Punkt Masse **über** der
Schwelle zählt der Bruch zusätzlich. Episch dazu: das Nachbeben zählt dem Gletschersturz als eigener Bruch.

Der Gegensatz zum Kettenbruch ist der ganze Punkt: **kein fremdes Feld wird angefasst.** §5.22 hatte gezeigt, dass
genau das die Ursache war — eine Kette, die jede Runde dieselben Nachbarn nullt, lässt sie nie reifen. Das Eisbeben
liegt vollständig auf dem Stich, der ohnehin auszahlt, und belohnt die vierte Schwelle aus §5.18. Stetig statt mit
hartem Tor: bei genau der Schwelle ist es null und wächst mit jedem Punkt darüber. Ein Tor hätte den Skill früh tot
gemacht (die Abbruchkante misst auf Normal Lift 0,04).

#### Die Leiter steht doppelt so hoch wie entworfen

Mit der entworfenen Leiter (3 · 4 · 6 · 9 %) misst der Skill **tot**: Lift 0,97, Median-Δ +1 %, Haltequote 48 %.
Statt das als „Mechanik funktioniert nicht" zu buchen, wurde die Leiter probeweise verzehnfacht — die Sonde, die
§5.22 gefehlt hat. Ergebnis: **Haltequote 100 %, Median-Δ +243 %, Flag „stark"**. Die Mechanik hat also eine
Angriffsfläche, sie war nur eine Größenordnung zu klein dosiert. Grund: `KEEP_MAX` deckelt, was nach einem Bruch
liegen bleibt, der Überschuss beim nächsten Bruch ist deshalb typisch klein.

| Leiter (Normal) | Ablation Median-Δ | Haltequote | Duell Eis ÷ Feuer |
| --- | --- | --- | --- |
| 3 % (Entwurf) | +1 % | 48 % | 1,15× |
| 6 % (**gesetzt**) | +14 % | 68 % | 1,38× → 1,01× nach Tarierung |
| 9 % | +28 % | 81 % | 1,62× |
| 30 % (Sonde) | +243 % | 100 % | — |

9 % wurde verworfen, obwohl der Skill dort am besten dasteht: die Parität wäre nur mit `BURST_SCALE` ≈ 61 zu halten
gewesen, und das hätte **jeden anderen Eis-Skill für diesen einen bezahlt**.

#### Tarierung

`BURST_SCALE` 105 → **75**. Zwei Posten, nicht einer: der gestrichene Kettenbruch war ein Fallen-Skill (Lift 0,68),
und **ohne ihn stand die Fraktion schon bei 1,15×** — das Eisbeben legt darauf. Gemessen bei 75: Eis mono 17,95M
gegen Feuer 17,80M, **Median-Parität 1,01×** (Mean 1,29×, p90 1,09×). Der Balance-Guard blieb unangetastet im Band.

Nachgezogen: Emblem `SK_ICE_11_eisbeben.webp`, en/es-Katalog, Glossar. Zwei Glossar-Einträge beschrieben noch die
Kette — *Kaskade* („ein berstender Gletscher reißt seine Nachbarn mit") und *Cluster* (nannte den Kettenbruch als
Cluster-Leser). Beide sagen jetzt, was wirklich passiert; nachgeprüft statt umbenannt: `glacierClusters` hat genau
einen Leser, die Verzahnung.

### 5.24 Eiswall zahlt ab drei statt ab der vollen Reihe (2026-09-09, Owner-Route A) — umgesetzt und gemessen

Der Eiswall hob den Linien-Faktor einer **komplett** gefrorenen Reihe oder Spalte (1,45 … 2,1 statt 1,30) und maß
**−8 % bei 38 % Haltequote**, alle vier Stufen unter Lift 1 — der schwächste Skill der Fraktion.

#### Zwei Ursachen, nicht eine

**Alles oder nichts.** Bis die Reihe voll ist, zahlt er exakt null. Eine Reihe kostet 5 der 12 Gletscher, eine Spalte 8.

**Anti-Synergie — der eigentliche Befund.** Die halbe Fraktion bezahlt **Dichte**: Kaskade (+25 % je Nachbar),
Kollision, Packeis, Verzahnung, Frostbund. Die Reihe ist die **dünnste** Form überhaupt, jeder Gletscher hat
höchstens zwei Nachbarn. Gerechnet (nicht gemessen), Wucht je Gletscher:

| Bau | Gletscher | Kaskade | Kollision | Form | Wucht je Gletscher |
| --- | --- | --- | --- | --- | --- |
| Volle Reihe + Eiswall Episch | 5 | ×1,40 | ×1,22 | ×2,10 | **×3,59** |
| 3×3-Fläche, ohne jeden Skill | 9 | ×1,67 | ×1,33 | ×1,50 | **×3,33** |

Der Skill auf seiner höchsten Stufe erreicht knapp, was ein dichter Klotz gratis kann — mit weniger Gletschern und
schlechter für jeden anderen Eis-Skill. Kein Zahlenproblem.

#### Route A (Owner)

Der Eiswall liest jetzt die **Länge der geraden Kette**, in der ein Gletscher steht (Reihe oder Spalte, die längere
von beiden). Ab `EISWALL_MIN` = 3 zahlt sie, jeder weitere Gletscher zahlt mehr: `×(1 + per × (Länge − 2))`, Leiter
15 · 20 · 25 · 30 %. Eine volle Reihe ist auf Normal +45 % — ungefähr dort, wo der alte Hebel stand.

Zwei Entscheidungen dabei:

- **Eigener Skill-Faktor, keine fünfte Geometrie-Form.** Als Form hätte die „stärkste Form zählt"-Regel (§5.6) ihn
  im dichten Bau wieder verschluckt: eine Drei-Kette (1,15) verliert gegen die Fläche (1,50). Der Eiswall fasst
  `glacierFormations` seit dieser Runde gar nicht mehr an, die Linie steht wieder auf ihrer Konstanten.
- **Der dichte Bau enthält Ketten.** Ein 3×3-Klotz liefert in jeder Zeile und Spalte eine Drei — genau das macht den
  Skill in **jedem** Eis-Bau brauchbar statt nur im Reihen-Bau, was die Vorgabe des Owners war.

#### Gemessen

| | Haltequote | Lift | Median-Δ | Siegquote |
| --- | --- | --- | --- | --- |
| alt (voller Linien-Hebel) | 38 % | 0,64 | −8 % | 38 % |
| neu (Kettenlänge) | **99 %** | 1,02 | **+27 %** | **70 %** |

Vom letzten Platz auf den besten Nicht-Legendären nach Verzahnung und Gletschersturz.

`BURST_SCALE` 75 → **64**: der Eiswall zahlt jetzt in jedem Eis-Bau statt nur im Reihen-Bau, das hebt den Boden der
Fraktion (1,00× → 1,16× Feuer). Gemessen bei 64: Eis mono 17,86M gegen Feuer 17,80M, **Parität 1,00×** (Mean 1,29×,
p90 1,14×). Balance-Guard im Band, nicht neu zentriert.

Die Wächter sind gegengeprüft: ohne den Faktor in der Bruchformel fallen vier der neuen Fälle um.

**Offen, nicht angefasst:** der Boden der Fraktion hat sich verschoben. Schneetreiben steht bei −16 % (Siegquote
14 %), Einfrieren bei −4 % mit 16 % Haltequote, und drei Skills sind „tot" (Anfrieren, Frostbund, Gletscherzunge).
Das ist die nächste Runde, nicht diese.

### 5.25 Einfrieren greift die höchsten Gegnerkarten (2026-09-09, Owner) — umgesetzt und gemessen

Owner: „einfrieren, so umstellen das nicht die getroffene sondern die höchsten Gegnerkarten eingefroren werden."

Der Griff hing bis dahin daran, **wo der Gletscher zufällig lag**: er markierte die an dieser Position getroffene
Gegnerkarte plus so viele Nachbarfelder, bis die Stufenzahl voll war. Zwei Folgen, beide schlecht:

- Getroffen wurde meist eine Karte, die der brechende Gletscher **ohnehin geschlagen hatte** — der Griff verbrauchte
  sich an einem Sieg, den es schon gab.
- Am Rand kam die Stufe nie an: die Ecke hat zwei Nachbarn, die Episch-Reichweite fünf.

Gemessen stand er bei **−4 %, Haltequote 16 %, Siegquote 29 %** — auf der „schadet"-Liste.

**Jetzt** markiert jeder Bruch die höchsten Karten des Gegnerdecks, unabhängig von der Lage des Gletschers. Schon
markierte Karten werden übersprungen, damit mehrere Brüche im selben Durchlauf **verschiedene** Karten treffen statt
derselben — sonst wäre die Stufe für einen Mehrfach-Bruch wertlos. Sortiert wird stabil, bei gleichem Wert
entscheidet die Deck-Reihenfolge; kein Zufall im Griff.

| | Haltequote | Median-Δ | Siegquote |
| --- | --- | --- | --- |
| alt (getroffene Karte + Nachbarn) | 16 % | −4 % | 29 % |
| neu (höchste Karten) | **62 %** | **+17 %** | **62 %** |

`BURST_SCALE` 64 → **60**: die Stichquote des Mono-Eis-Builds steigt 59,6 → 62 %, und ein **gewonnener**
Gletscher-Stich zahlt den vollen Sieg-Stack (`glacierWinMult`) — der Griff hebt also auch den Bruch, nicht nur die
Kontrolle. Gemessen bei 60: **Parität 1,01×** gegen Feuer.

#### Nebenbefund zum Schneetreiben (nichts geändert)

Owner-Frage: „wieso geben sie nicht ihren vollen Schnee ab, ansonsten ist ja egal wie viel Schnee man aussäht wenn
immer nur 1 ankommt." — Der Befund stützt das. `FIRN_DRAW` steht auf **1**: jedes offene Feld gibt je Durchlauf
höchstens einen Punkt seiner Reserve an den nächsten Gletscher ab. Das Schneetreiben sät 2 · 3 · 4 · 5, der Abfluss
bleibt 1 — die Leiter verschiebt also nur, **wie lange** ein Feld nachliefert, nicht wie viel je Durchlauf ankommt.
Solange das Feld schneller gefüllt als geleert wird, ist die Stufe fast wirkungslos.

Der Deckel stammt aus §5.15, wo ein höherer Zug gemessen **nichts** brachte (Flut/Zug 3/2 → −10 %, 8/8 → −5 %,
15/15 → −3 %). Die dortige Begründung war `mCap`: die Bruchmasse war auf 12 gedeckelt, mehr Masse zu füttern war
linear und lief ins Leere. **§5.18 hat `mCap` gestrichen** — die Masse über der Schwelle bleibt seither liegen und
trägt in den nächsten Durchlauf. Damit war die Begründung für `FIRN_DRAW` = 1 hinfällig und der Deckel ungeprüft.
**Nachgemessen in §5.26 — die Vermutung war falsch, der Deckel bleibt.**

### 5.26 Der Zug-Deckel ist nicht der Engpass (2026-09-09, auf Ansage) — gemessen, nichts geändert

Sweep über `SIM_GLACIER_FIRN_DRAW` (Ablation Eis, je 90 gierige Läufe, Seed 701):

| Zug | Schneetreiben | Dauerfrost | Eiszeit | Greedy-Median |
| --- | --- | --- | --- | --- |
| **1** (gesetzt) | −20 % | −18 % | +59 % | 427M |
| 2 | −8 % | −7 % | +55 % | 633M |
| 4 | −25 % | −13 % | +131 % | 610M |
| alles | −3 % | 0 % | **+153 %** | 668M |

**Die These aus §5.25 ist widerlegt.** Selbst wenn jedes Feld seine ganze Reserve abgibt, erreichen die beiden
Firn-Skills bestenfalls null — sie sind auf keiner Zug-Stufe positiv. Was der offene Zug hebt, ist die **Eiszeit**:
sie flutet jedes freie Feld und saugt es dann leer, also skaliert sie mit dem Zug, während die Skills es nicht tun.
Der Deckel bremst nicht die Skills, er hält die Legendäre im Band — er bleibt, jetzt aus einem belegten Grund.

**Die Ursache liegt in der Währung, nicht im Durchfluss.** Bei Eis zahlt Masse nur, wenn sie viele Gletscher auf
einmal trifft: Verzahnung (Masse je Gletscher im Cluster, quadratisch in der Clustergröße) misst +42 % und ist
„stark"; **Anfrieren** legt seine Masse ohne jeden Umweg direkt auf den siegreichen Gletscher und ist trotzdem
**tot**. „Ein Sieg → etwas Masse für einen Gletscher" trägt strukturell nicht, mit Röhre wie ohne. *(Aus der
Ablation geschlossen, nicht einzeln gemessen.)*

Zweiter Befund im Code, unabhängig vom Durchfluss: `driftTargets` filtert auf **Nicht-Gletscher**-Nachbarn. Ein
Gletscher, dessen Nachbarn alle gefroren sind, sät gar nichts — der Skill hat im dichten Bau kein Ziel, während die
halbe Fraktion Dichte bezahlt. Dieselbe Anti-Dichte-Falle wie beim alten Eiswall (§5.24), und wörtlich die
Eröffnungsbeschwerde des Owners: „viele sähen nur auf unbelegten Boden und dadurch ist der skill tot für einen
Gletscher der dort gebaut wird".

Offen zur Owner-Entscheidung: drei Design-Routen für Schneetreiben (Cluster-Aussaat · selbstgefrierender Boden ·
Aussaat gegen den Gegner). **Dauerfrost hängt an derselben Diagnose** und steht bei −18 %.

### 5.27 Der Zug-Deckel fällt, die Eiszeit zieht nach (2026-09-09, Owner) — umgesetzt und gemessen

#### Der Grundsatz (Owner, wörtlich)

> „skills haben Vorrang vor legendären, die müssen sich gut anfühlen, legendäre bauen wir danach um sie herum, nicht
> unsere skills um zu starke legendäre"

**Das ist ab hier die Kollisionsregel.** Wo ein Fundament-Eingriff einem Skill hilft und eine Legendäre aus dem Band
trägt, wird die Legendäre nachtariert — nicht der Eingriff zurückgenommen. §5.26 hatte noch andersherum
argumentiert („der Deckel hält die Legendäre im Band, er bleibt"); diese Begründung ist damit **überholt**.

#### Was geändert wurde

Der Owner verwirft die drei Design-Routen aus §5.26 und entscheidet stattdessen: **„lass uns nochmal zug Deckel
öffnen, es ist scheiße dass wir mehr generieren als nutzen können."** Schneetreiben und Dauerfrost bleiben
mechanisch **unverändert**.

- `FIRN_DRAW` 1 → **ganze Reserve**. Jedes offene Feld gibt seinen kompletten Schnee an den nächsten Gletscher ab;
  nichts bleibt ungenutzt liegen. Der Regler bleibt für Diagnose-Sweeps (endlich = Deckel je Feld, 0 = Zug aus).
- `EISZEIT_FLOOD` 3 → **1**. Die Eiszeit flutet jedes freie Feld und war der größte Gewinner des offenen Zugs.
- `BURST_SCALE` 60 → **28**. Der offene Zug verdoppelt das Masse-Einkommen der Fraktion.

#### Gemessen

Die Eiszeit trug den **Schwanz**, nicht den Median — die Flut-Zahl allein bewegt bei gleichem `BURST_SCALE`:

| | Median Eis ÷ Feuer | Mean | p90 |
| --- | --- | --- | --- |
| Flut 3 | 1,97× | 4,08× | 2,99× |
| Flut 1 | 1,91× | **2,76×** | 2,58× |

Danach `BURST_SCALE` 28 → **Parität 0,97×** (Mean 1,34×, p90 1,23×). Balance-Guard im Band, nicht neu zentriert.

#### D1 ist beantwortet: der offene Zug rettet die beiden Skills NICHT

Ablation mit offenem Zug: **Schneetreiben −3 % bei 13 % Haltequote**, **Dauerfrost 0 %, Flag „tot"** bei 83 %.
Beide sind von „schadet" auf „wirkungslos" gestiegen — mehr nicht. Das deckt sich mit dem Sweep aus §5.26 und
bestätigt dessen Kern: die Ursache liegt in der Währung, nicht im Durchfluss. **Dauerfrost braucht damit doch eine
eigene Designrunde** (D1 war „erst messen, dann entscheiden" — gemessen ist).

#### Methodik-Korrektur: ein gieriger Lauf reicht nicht

Die erste Fassung dieses Abschnitts nannte eine Liste toter Skills aus **einem** Lauf, gemessen am Stand **vor** der
Nachtarierung (Bruchwucht 60, Flut 3). Beides war falsch — und die Annahme dahinter, „die Bruchwucht skaliert alle
Gletscher-Skills gleich, also bleibt die Rangfolge", ebenfalls: mit anderer Wucht wählt die gierige Politik andere
Builds, und damit kippen die Nachbarschaftseffekte.

Zwei Läufe am **Endstand** (Bruchwucht 30, Flut 1, offener Zug), Seeds 701 und 913, zeigen wie weit die gierige
Median-Δ zwischen Seeds schwankt:

| Skill | Median-Δ 701 | Median-Δ 913 | Lift 701 | Lift 913 |
| --- | --- | --- | --- | --- |
| Dauerfrost | +1 % („tot") | **+32 % („stark")** | 0,83 | 0,97 |
| Gletscherzunge | +15 % | −1 % | 0,80 | 0,73 |
| Schneetreiben | −13 % | −0 % | 0,81 | 0,70 |
| Frostbund | −13 % | +1 % | 0,72 | 0,65 |
| Verdichtung | −5 % | +0 % | 0,98 | 0,63 |

**Die gierige Median-Δ ist zwischen Seeds nicht belastbar** (Dauerfrost springt von „tot" auf „stark"). Der **Lift**
aus den Explore-Läufen ist es eher — er hat 500 statt 90 Läufe hinter sich. Wo beide Metriken über beide Seeds
zusammenfallen, ist der Befund echt.

**Belastbar schwach (Lift < 1 in beiden Läufen):** Frostbund (0,72 / 0,65) · Gletscherzunge (0,80 / 0,73) ·
Schneetreiben (0,81 / 0,70) · Verdichtung (0,98 / 0,63).

**Eigener Fall — Abbruchkante:** Haltequote 97 % in beiden Läufen, Median-Δ −4 % und −1 %. Sie wird immer genommen
und tut nichts; das ist ein anderes Problem als „zu schwach, wird gemieden".

**Regel für kommende Runden:** eine Liste, gegen die designt wird, braucht mindestens zwei Seeds am aktuellen
Tarierungsstand. Ein Lauf taugt zur Richtungsanzeige, nicht zur Entscheidungsgrundlage.

**Nicht nachgemessen:** ob die Eiszeit mit Flut 1 im **fraktionsübergreifenden** Legendär-Band der übrigen elf
liegt. Innerhalb Eis sind die drei stimmig (Lift 1,34 / 1,36 / 1,35); der Quervergleich (`--mode legendaries`)
steht aus.

## 6. Pflanze

### 6.1 Richtung und Abgrenzung (gesetzt, Owner 2026-09-06)

**Der Satz der Fraktion:** „Wie sieht mein Deck am Ende aus — und in welcher Ordnung?" Feuer und Blitz lesen den
Stich, Pflanze liest das Feld.

| | Frage an den Spieler | Wo der Score entsteht |
| --- | --- | --- |
| Blitz | Welche eine Karte mache ich tief? | Stapel auf der Siegkarte → Crit und Basis-Score |
| Feuer | Halte ich die Leiste heiß oder verbrenne ich sie? | Hitze → Multiplikatoren, Schwellen, hohe Kampfwerte |
| **Pflanze** | **Welche Karten sind grün, und wie stehen sie?** | **grüne Karten in Formationen** |

**Gesetzt:**

1. **Grün bleibt eine Farbe** (Owner: Variante b). Grüne Karten bilden Farbblöcke miteinander, unabhängig von ihrer
   Ursprungsfarbe. Die Alternative — Grün als Zustand neben der Farbe — ist verworfen.
2. **Ein vollständig grünes Deck ist das Ziel**, wenn man gezielt darauf spielt, kein Unfall und kein Selbstläufer.
3. **Wachstum liegt je Karte**, nicht als Deck-Vorrat.
4. **Drei Zustände:** grau → grün → blühend.
5. **Kein Direkt-Score.** Pflanzen-Score geht in die Basis, wie der Stapel-Score beim Blitz.
6. **Trimmen entfällt.** Mit dem Türen-Angebot werden Skills nicht mehr ersetzt; die Klausel an sechs Skills ist tot.
7. **Kein Skill-Tor.** Das Wachstum läuft, sobald ein Pflanzen-Skill liegt — kein Mono-Gate, kein Skill-Zähler im
   Tempo. Owner: „es darf nicht sein, dass ich einen grünen Skill nehme und mein Deck ist grün, aber es darf auch
   nicht vom Glück abhängen oder unzählige grüne Skills verlangen."

**Was die Fraktion bewusst nicht bekommt:** keinen Kartenwert aus Wachstum (der Auto-Sieg bei Wert 11 entfällt —
hohe Werte gehören Feuer), keine eigene Fraktionsleiste (Hitze und Ladung haben sie), keinen eigenen
Multiplikator-Stapel, keine Kolonisierung des Gegnerdecks.

### 6.2 Passiv „Wachstum" (Entwurf, Startwerte ungemessen)

**Wachstum je Karte, nur aufwärts. Ein Sieg gibt der Siegkarte +1 Wachstum, dazu +1 je aktiver Formation an ihrer
Position.** Niederlagen geben nichts.

Der zweite Summand ist der eigentliche Regler (Owner): er misst nicht, *ob* die Karte gewonnen hat, sondern **wie gut
sie steht**. Eine Karte in zwei Formationen wächst dreimal so schnell wie eine, die allein gewinnt — die
Aufstellungsphase wird damit zur Wachstumsentscheidung, und die Fraktion hängt ab dem ersten Stich an Formationen,
ohne dass ein Skill dafür nötig wäre.

| Zustand | Schwelle (Startwert) | Was er bedeutet |
| --- | --- | --- |
| grau | – | nichts |
| **grün** | **30 Wachstum** | die Karte ist grün — Farbe für alle Formationen, die Farbe lesen |
| **blühend** | **75 Wachstum** | Träger des Scores: ein Sieg mit ihr gibt Basis-Score je grüner Karte in ihrer Formation |

**Warum diese Schwellen.** Über 50 Runden gewinnt eine Position grob 30-mal. Wer nur mitläuft, steht am Laufende
also gerade an der Grün-Schwelle — vollgrün wird das Deck so nie. Wer seine Karten in Formationen stellt, verdoppelt
bis verdreifacht das Tempo: grün in der ersten Laufhälfte, blühend im letzten Drittel, und das ganze Deck grün, wenn
man darauf spielt. Das ist die Rechnung hinter dem Entwurf, **nicht gemessen** — der Regler ist die Schwelle, nicht
die Rate.

**Grün zahlt über die Formationen, die es schon gibt** (Farbblock, Wiederholung, Treppe), blühend zahlt in die Basis.
Damit hat Pflanze genau eine Score-Quelle mit einem Regler — das Gegenstück zum Stapel-Score des Blitzes.

**Offen, bis die Sim-Daten da sind (Owner: warten):** ein vollgrünes Deck ist ein 40er-Farbblock. Der heutige Deckel
(`PLANT_GREEN_FARBBLOCK_CAP` 3) bleibt vorerst stehen; ob er hoch, weg oder umgebaut wird, entscheidet die Messung.
Eine Nebenwirkung von Variante b steht fest: im vollgrünen Deck **wird der Farbblock trivial** — alle 40 Karten sind
ein Block. **Korrektur (Owner, 2026-09-06):** hier stand zuerst, im vollgrünen Deck sterbe auch der Wechsel. Das ist
falsch — `markWechsel` erkennt den Zick-Zack über den **Kartenwert** (Richtungswechsel plus Mindestdifferenz 4), die
Farbe kommt darin nicht vor. Wiederholung, Treppe und Wechsel sind vom Ergrünen unberührt; nur der Farbblock ist es
nicht.

### 6.3 Bestandsaufnahme der 17 + 4 Skills (2026-09-06, Befund und Vorschläge, nichts umgesetzt)

Jeder Skill gegen den Rahmen aus 6.1/6.2 gelesen. **Entscheid je Zeile beim Owner.**

#### Was strukturell durchfällt, unabhängig vom einzelnen Skill

| Befund | Betroffen | Warum |
| --- | --- | --- |
| **Verstärker mit `enabler`** — der Skill wirkt nur, wenn ein bestimmter anderer gehalten wird | Pfahlwurzel, Jahresringe, Flugsamen, Blütezeit, Rhizom, Erntedank (**6 von 17**) | Diese Bauform gibt es bei Feuer und Blitz nicht mehr: ein Skill muss allein laufen, sonst ist er im Türen-Angebot ein toter Pick |
| **Direkt-Score** (post-stack, gedeckelt, bekenntnis-skaliert) | Wurzeltiefe (Tiefenterm), Blüte (Feldterm), Weltenbaum, Mutterbaum, Ewiger Frühling (**5 Quellen**) | 6.1: kein Direkt-Score. Der Score gehört in die Basis |
| **Eigener Multiplikator-Stapel** | Photosynthese (×1,08), Baumreihe (bis ×2), Überwucherung (+0,20 auf alle Farbblöcke) | 6.1: Pflanze bekommt keinen eigenen Multiplikator neben Formation und Serie |
| **Trimm-Klausel** | Aussaat, Flugsamen, Setzlingsbeet, Zäher Halm, Ausläufer, Rhizom (**6**) | Mit dem Türen-Angebot werden Skills nicht ersetzt — die Klausel ist tot |
| **Wertachse** (Wachstum → Kartenwert → Auto-Sieg bei 11) | Kernholz, Baumreihe (Auslöser), `PLANT_VALUE_CAP`, Wurzelschlag-Passiv | 6.1: hohe Werte gehören Feuer; das neue Passiv leitet keinen Wert mehr ab |
| **Gegnerdeck** | Ausläufer, Rhizom, Erntedank (**3**) | 6.1: keine Kolonisierung — das Gegnerdeck ist Feuers Achse (Brand) |
| **Keine Stufen** | alle 17 | Jeder Skill braucht vier Stufen mit unterschiedlichen Werten (§1) |

#### Je Skill

| Skill | Heute | Verhältnis zum neuen Rahmen | Vorschlag |
| --- | --- | --- | --- |
| **Wurzeltiefe** (02) | +15 Basis je grünem Sieg, dazu ein Feldterm bis +120 (direkt) | Direkt-Score; der flache Satz je grünem Sieg ist genau das, was im neuen Passiv „blühend" leistet | **streichen** — die Rolle hat das Passiv |
| **Pfahlwurzel** (03) | Verstärker: Wurzel-Basis ×2 in Formation | Verstärker-Bauform | **streichen** |
| **Jahresringe** (04) | Verstärker: +35 je 10 eigenes Wachstum | Verstärker-Bauform — aber „eigenes Wachstum zahlt" ist die neue Achse | **Idee behalten**, als eigenständiger Skill neu bauen |
| **Aussaat** (05) | grüner Sieg sät beide Nachbarn +1 Wachstum | passt ohne Umbau; Trimm-Klausel raus | **bleibt**, Stufen über Menge/Reichweite |
| **Flugsamen** (06) | Verstärker: Aussaat überspringt Grünes | Verstärker-Bauform | **in Aussaat aufgehen** (Episch-Extra) |
| **Setzlingsbeet** (07) | niedrigste Karte je Segment startet +3 Wachstum | passt, löst den Kaltstart | **bleibt** |
| **Zäher Halm** (08) | graue Karten wachsen auch bei Niederlage | passt und wirkt genau früh, wo Niederlagen noch vorkommen | **bleibt** — mit Warnung: Niederlage-Bedingungen sind bei Feuer/Blitz zweimal gestorben (7.22, 7.24) |
| **Ranken** (09) | grüner Sieg färbt einen grauen Nachbarn **sofort** grün | **direkter Widerspruch zu 6.1** — genau das „ein Skill, und das Deck ist grün" | **umbauen** (Wachstum statt Farbe) oder streichen |
| **Blüte** (10) | +15 je grüner Karte im Segment, wenn die Nachbarn grün sind | doppelt die Auszahlung des neuen Zustands „blühend", und der **Name kollidiert** | **streichen**, Name für den Zustand frei |
| **Blütezeit** (11) | Verstärker: Blüte ×2 in Formation | Verstärker-Bauform | **streichen** |
| **Photosynthese** (12) | grün in Formation ×1,08 | eigener Multiplikator, dazu winzig | **streichen** oder als Basis-Score neu |
| **Blätterdach** (13) | grüner Farbblock ab 4: +8 Basis je Karte im Block (Deckel 10) | **passt am besten von allen** — Basis-Score, formationsförmig | **bleibt**, Deckelfrage mit den Sim-Daten |
| **Überwucherung** (14) | ab 66 % grünem Feld: alle Farbblöcke +0,20, Blüte doppelt | feldweiter Multiplikator — und mit „vollgrün ist das Ziel" dauerhaft an statt Belohnung | **umbauen** |
| **Kernholz** (18) | +15 Basis je Wertpunkt über dem Startwert | Wertachse stirbt mit dem Passiv | **streichen** |
| **Ausläufer** (15) | koloniert die niedrigste Gegnerkarte, Ernte +2 Wachstum | Gegnerdeck-Achse | **streichen** |
| **Rhizom** (16) | Verstärker: Nachbar mitgeerntet | Gegnerdeck + Verstärker | **streichen** |
| **Erntedank** (17) | Verstärker: Ernte mit reifer Karte +70 Basis | Gegnerdeck + Verstärker | **streichen** |
| **Weltenbaum** (L01) | Wald wächst am Durchlaufende; direkt +6,5 je Überlauf-Wachstum (Deckel 600) | Direkt-Score; „Überlauf" setzt den Wert-Deckel voraus, den es nicht mehr gibt | **neu bauen** |
| **Mutterbaum** (L02) | tiefster Baum verdoppelt Wurzel-Score; direkt +68 je Überlauf (Deckel 60) | Direkt-Score, hängt an Wurzeltiefe (Enabler-Logik) | **neu bauen** |
| **Baumreihe** (L03) | voll ausgewachsene Karten (Wert 11) bilden eine **positionsfreie Wiederholung**, ×1,3 bis ×2 | Auslöser stirbt mit der Wertachse — **die Idee ist die beste im Bestand** und trifft die neue Achse | **behalten**, Auslöser auf **blühend** umstellen |
| **Ewiger Frühling** (L04) | direkt +80 je grüner Karte (Deckel 40), bei vollgrünem Feld doppelt | Direkt-Score, und die Vollgrün-Verdoppelung belohnt jetzt den Normalfall | **neu bauen** |

#### Entscheid Owner (2026-09-06)

**Die Streichliste oben ist angenommen, mit einer Ausnahme: Ranken bleibt.** Owner: „Ranken war ein Spielerfavorit,
also auf das neue Passiv anpassen." Der Skill behält Namen und Platz (SK_PLANT_09); zu ersetzen ist nur der Auslöser
„färbt sofort grün", der gegen 6.1 steht. Entwurf dazu in 6.4.

#### Fazit

**Das ist kein Pass, das ist ein Neubau.** Von 17 normalen Skills überleben vier in ihrer Idee (Aussaat,
Setzlingsbeet, Zäher Halm, Blätterdach), einer liefert ein Konzept (Jahresringe), zwei sind Umbauten (Ranken,
Überwucherung), zehn fallen weg. Von den vier Legendären trägt eine ihre Idee weiter (Baumreihe), drei werden neu
gebaut. Für die 15 Plätze fehlen also rund zehn neue Skills.

**Die Rollen, die der neue Rahmen verlangt** (Raster für den Entwurf, keine Vorschläge):

| Rolle | Was sie tut | Bestand |
| --- | --- | --- |
| Tempo | Wachstum je Sieg erhöhen | fehlt |
| Breite | Wachstum auf andere Karten verteilen | Aussaat |
| Kaltstart | die ersten grünen Karten früher | Setzlingsbeet |
| Bestand | Wachstum auch ohne Sieg | Zäher Halm |
| **Formationsdichte** | Karten in **mehr** Formationen bringen — im neuen Passiv der stärkste Hebel überhaupt | **fehlt komplett** |
| Blüte-Ertrag | was blühende Karten auszahlen | Blätterdach (teilweise) |
| Schwelle | die Zustände früher erreichen | fehlt |
| Aufstellung | die Ordnung im Lauf ändern | fehlt |

Auffällig: **die Achse, die das neue Passiv am stärksten belohnt — mehr Formationen je Karte — hat heute keinen
einzigen Skill.** Dort liegt der freie Platz für den Kern der Fraktion.

### 6.4 Ranken auf dem neuen Passiv (Vorschlag, Entscheid Owner)

Was am alten Ranken gefiel, ist die **kriechende Ausbreitung**: eine grüne Karte zieht ihre Nachbarn nach, und das
wandert sichtbar durchs Deck. Was weg muss, ist allein das **sofortige Färben** — es macht aus einem Pick ein grünes
Deck (6.1). Drei Bauformen, die das Bild behalten und den Sprung ersetzen; Werte sind Startwerte, ungemessen.

| # | Bauform | Text (Normal) | Rolle und Risiko |
| --- | --- | --- | --- |
| 1 | **Ansteckung im Reifemoment** | „Wird eine deiner Karten grün, wachsen ihre grauen Nachbarn +8." Leiter 5 / 8 / 12 / 16. | **Empfehlung** — am nächsten am alten Gefühl: ein sichtbarer Moment, der eine Kette auslösen kann (die Nachbarn reifen früher und schieben ihrerseits). Die Kette ist gebremst, weil der Schub deutlich unter der Schwelle 30 liegt. Nähe zu Aussaat: dieselbe Richtung (Breite), aber anderer Auslöser — Aussaat ist der Dauertropf je Sieg, Ranken der Ruck im Reifemoment. |
| 2 | **Schwellensenkung am Nachbarn** | „Graue Karten neben einer grünen brauchen 6 weniger Wachstum bis Grün." Leiter 4 / 6 / 8 / 12. | Besetzt die Rolle *Schwelle*, die im Raster fehlt, und lässt den grünen Fleck stetig nach außen wachsen. Ruhiger, aber ohne Moment — es passiert nichts Sichtbares. |
| 3 | **Ausläufer entlang der Reihenfolge** | „Wird eine Karte grün, wächst die nächste graue Karte in der Ziehreihenfolge +12 — auch über grüne Karten hinweg." Leiter 8 / 12 / 16 / 20. | Die Ranke kriecht die Reihe entlang statt nur zum Nachbarn; nimmt die Idee des gestrichenen Flugsamen auf. Risiko: sie springt weit und wird schwer lesbar. |

Alle drei ersetzen **nur** den Auslöser; Name, Platz und Emblem bleiben.

### 6.5 Die 15 (Vorschlag, Entscheid Owner je Zeile)

Owner hat Ranken-Bauform 1 gewählt (Ansteckung im Reifemoment). Damit steht der Bestand, und die 15 Plätze lassen
sich füllen. **Einzeiler, noch keine Stufen und keine Werte** — die kommen nach dem Ja, Skill für Skill.

Zwei technische Haken der Formations-Engine, die den neuen Kern tragen und heute ungenutzt sind: **`isJoker`**
(eine Position passt bei der Erkennung auf jeden Wert und jede Farbe) und **`segInfo.isOpen`** (eine Segmentgrenze
ist offen, ein Lauf darf über 5 Karten hinaus). Beides existiert für Anker und Architekt — Pflanze kann es benutzen,
ohne dass ein neuer Begriff ins Regelwerk kommt.

| # | Skill | Rolle | Einzeiler | Herkunft |
| --- | --- | --- | --- | --- |
| 1 | **Aussaat** | Breite | Gewinnt eine grüne Karte, wachsen beide Nachbarn. | bleibt (05) |
| 2 | **Ranken** | Ansteckung | Wird eine Karte grün, wachsen ihre grauen Nachbarn kräftig. | umgebaut (09, Owner) |
| 3 | **Setzlingsbeet** | Kaltstart | Die niedrigste Karte je Segment startet mit Wachstumsvorsprung. | bleibt (07) |
| 4 | **Zäher Halm** | Bestand | Graue Karten wachsen auch bei Niederlage. | bleibt (08) |
| 5 | **Blätterdach** | Ertrag | Ein grüner Farbblock ab N Karten gibt Basis-Score je Karte im Block. | bleibt (13) |
| 6 | **Jahresringe** | Ertrag (Tiefe) | Ein Sieg gibt Basis-Score je 10 eigenes Wachstum der Siegkarte. | Konzept aus 04 |
| 7 | **Überwucherung** | Schwelle (Feld) | Ist das Feld zu N % grün, sinken die Schwellen für alle Karten. | umgebaut (14) — der feldweite Multiplikator entfällt |
| 8 | **Spalier** | **Formationsdichte** | Grüne Karten öffnen die Segmentgrenze an ihrer Position: Läufe wachsen über das Segment hinaus. | neu (`segInfo.isOpen`) |
| 9 | **Wildwuchs** | **Formationsdichte** | Blühende Karten zählen bei der Formationserkennung als Joker. | neu (`isJoker`) |
| 10 | **Lichtung** | Tempo | Ein Sieg in einer Formation gibt doppeltes Formations-Wachstum. | neu — verdoppelt den zweiten Summanden des Passivs |
| 11 | **Wurzelnetz** | Ausgleich | Am Durchlaufende gibt die am weitesten gewachsene Karte einen Teil ihres Zuwachses an die schwächste ab. | neu |
| 12 | **Verpflanzen** | Aufstellung | Ein Tausch mehr je Aufstellungsphase. | neu (`formationSwaps`) |
| 13 | **Frühblüher** | Schwelle | Die Schwelle zu *blühend* sinkt. | neu |
| 14 | **Unterholz** | Bestand | Eine Karte, die einen ganzen Durchlauf nicht gewinnt, wächst am Durchlaufende. | neu — Aufholen ohne Niederlage-Bedingung |
| 15 | **Aussamen** | Breite (Ereignis) | Wird eine Karte blühend, wachsen alle grauen Karten. | neu |

**Legendäre (4):**

| Platz | Skill | Einzeiler |
| --- | --- | --- |
| L03 | **Baumreihe** (Idee bleibt) | Blühende Karten bilden eine positionsfreie Wiederholung, egal wo sie liegen — Auslöser ist jetzt *blühend* statt Wert 11. |
| L01 | **Weltenbaum** (neu) | Am Ende jedes Durchlaufs wächst jede grüne Karte, je mehr grüne Karten im Feld stehen. |
| L02 | **Mutterbaum** (neu) | Deine am weitesten gewachsene Karte zählt in jeder Formation ihres Segments mit. |
| L04 | **Ewiger Frühling** (neu) | Ist das Feld vollständig grün, sind alle Karten blühend. |

**Warum diese Verteilung.** Der stärkste Hebel des Passivs ist die Zahl der Formationen je Karte — dafür stehen jetzt
zwei Skills (8, 9) und ein Legendäres (L02), die alle die **Erkennung** verändern statt Score zu addieren. Der Ertrag
läuft über zwei Skills (5, 6) plus das Passiv (blühend), also drei Quellen in der Basis und keinen einzigen
Multiplikator. Die Schwelle bekommt zwei Regler (7, 13), das Tempo einen (10), die Breite drei (1, 2, 15), der
Bestand zwei (4, 14), dazu Kaltstart (3), Ausgleich (11) und Aufstellung (12).

**Was bewusst fehlt:** kein Skill zahlt Direkt-Score, keiner hängt an einem anderen (kein `enabler`), keiner rührt
das Gegnerdeck an, keiner leitet Kartenwert ab, und **Ewiger Frühling belohnt das Zielbild ohne Multiplikator** —
vollgrün macht das Deck zu lauter Score-Trägern, statt einen Faktor obendrauf zu legen.

### 6.6 Die 15, nach Kategorien ausbalanciert (Vorschlag 2, Entscheid Owner)

Owner an 6.5: „viel zu viele Skills, die Wachstum fördern — man nimmt davon vielleicht 2–3. Wir brauchen etwas für
Score und Formationshebel oder eine Kombination." Der Einwand stimmt, gezählt: **10 von 15 waren Wachstum**, je zwei
Score und Hebel, einer Aufstellung. Neue Verteilung:

| Kategorie | 6.5 | **6.6** | Was die Kategorie tut |
| --- | --- | --- | --- |
| Wachstum | 10 | **5** | schneller und breiter grün werden |
| Formationshebel | 2 | **4** | ändern, **was als Formation erkannt wird** |
| Score aus grünen Formationen | 2 | **4** | Basis-Score, je Formationstyp getrennt |
| Kombination | 0 | **2** | zahlen Score **und** Wachstum |
| Aufstellung | 1 | – | Verpflanzen gestrichen (Owner); die Ordnung ändert jetzt ein Hebel-Skill (Nr. 8) |

#### Wachstum (5)

| # | Skill | Einzeiler |
| --- | --- | --- |
| 1 | **Aussaat** | Gewinnt eine grüne Karte, wachsen beide Nachbarn. |
| 2 | **Ranken** | Wird eine Karte grün, wachsen ihre grauen Nachbarn kräftig. |
| 3 | **Setzlingsbeet** | Die niedrigste Karte je Segment startet mit Wachstumsvorsprung. |
| 4 | **Lichtung** | Ein Sieg in einer Formation gibt doppeltes Formations-Wachstum. |
| 5 | **Zäher Halm** | Graue Karten wachsen auch bei Niederlage. |

Gestrichen gegenüber 6.5: Unterholz, Wurzelnetz, Aussamen, Frühblüher (alle vier waren nur weitere Wachstumsraten).

#### Formationshebel (4) — der Kern der Fraktion

| # | Skill | Einzeiler | Stufenleiter |
| --- | --- | --- | --- |
| 6 | **Spalier** | Segmentgrenzen neben grünen Karten sind offen — Läufe wachsen über das Segment hinaus. | **die Leiter ist die Zahl der Grenzen:** 1 / 2 / 3 / alle. Genommen werden die Grenzen mit den meisten grünen Karten daneben (deterministisch, kleinste Segmentnummer bei Gleichstand). Bei 40 Karten gibt es 7 Grenzen — Episch macht das Deck zu einer durchgehenden Reihe |
| 7 | **Wildwuchs** | Blühende Karten zählen bei der Formationserkennung als Joker. | **die Leiter ist die Zahl der Joker:** 1 / 2 / 3 / alle blühenden. Normal wirkt nur die am weitesten gewachsene Karte. Der Regler ist damit die Menge, nicht die Stärke — genau der Punkt des Owners („in der Sim schauen, wie viele blühende man hat") |
| 8 | **Wandertrieb** | Am Ende jedes Durchlaufs rückt eine blühende Karte einen Platz auf ihren nächsten blühenden Nachbarn zu. | Leiter über die Zahl der Karten, die rücken: 1 / 1 / 2 / 2 und zwei Plätze. **Ersetzt Verpflanzen als Aufstellungs-Skill** — die Ordnung ändert sich im Lauf, nicht in der Phase, und das Deck klumpt sichtbar zusammen |
| 9 | **Lücke** | Ein Lauf aus grünen Karten darf eine fremde Karte überspringen. | Leiter über die erlaubten Lücken je Lauf und Segment (`gap.run` / `gap.seg` — der Haken existiert schon für E_PACE und E_COLORBRIDGE) |

#### Score aus grünen Formationen (4) — je Formationstyp einer

| # | Skill | Einzeiler |
| --- | --- | --- |
| 10 | **Blätterdach** (Farbblock) | Ein grüner Farbblock ab N Karten gibt Basis-Score je Karte im Block. |
| 11 | **Rankgerüst** (Treppe) | Eine Treppe aus grünen Karten gibt Basis-Score je Stufe — Owner-Idee „grüne Treppen haben einen Bonus". |
| 12 | **Hecke** (Wiederholung) | Eine Wiederholung aus grünen Karten gibt Basis-Score je Mitglied. |
| 13 | **Jahresringe** (Tiefe) | Ein Sieg gibt Basis-Score je 10 eigenes Wachstum der Siegkarte. |

**Korrigiert in 6.7:** hier stand, der Wechsel bekomme keinen Score-Skill, weil er im vollgrünen Deck stirbt. Er
stirbt nicht — er liest den Kartenwert, nicht die Farbe. In 6.7 hat jeder der vier Formationstypen seinen Skill.

#### Kombination (2) — Score und Wachstum in einem

| # | Skill | Einzeiler |
| --- | --- | --- |
| 14 | **Blütenlese** | Ein Sieg in einer rein grünen Formation gibt Basis-Score **und** lässt alle ihre Mitglieder wachsen. |
| 15 | **Überwucherung** | Ist das Feld zu N % grün, zählt jede grüne Formation ein Mitglied mehr — mehr Score aus den Skills oben **und** mehr Formationsplätze. |

**Legendäre bleiben wie in 6.5** (Baumreihe mit Auslöser *blühend*, Weltenbaum, Mutterbaum, Ewiger Frühling).

**Zur Sim vorgemerkt** (Owner): wie viele blühende Karten ein Lauf tatsächlich hat — davon hängt ab, ob Wildwuchs
Episch (alle blühenden als Joker) zu stark ist. Die Messung geht erst, wenn das Passiv steht.

### 6.7 Endstand der 15 (Vorschlag 3, nach zwei Owner-Korrekturen)

Drei Eingriffe des Owners an 6.6:

1. **Wandertrieb raus** — kein Skill greift in die Aufstellungsordnung ein. Die Ziehreihenfolge gehört dem Spieler;
   sie wird in der Aufstellungsphase gesetzt und nicht vom Spiel verschoben. Die Kategorie „Aufstellung" entfällt
   damit ganz.
2. **Der Wechsel stirbt nicht** — er liest den Kartenwert, nicht die Farbe (Beleg oben in 6.2). Damit bekommt
   **jeder der vier Formationstypen seinen Score-Skill**, und der frei gewordene Platz ist gefüllt.
3. **„Ein Mitglied mehr" war unpräzise.** Gemeint war eine Score-Erhöhung, formuliert war es wie eine
   Erkennungsänderung. Neu und eindeutig: **Überwucherung senkt die Mindestlänge grüner Formationen** — ein grüner
   Farbblock, eine grüne Treppe, eine grüne Wiederholung entstehen mit einer Karte weniger. Das ist ein
   Erkennungs-Hebel (`minMembers` / `minLen`), kein Score-Zuschlag, und passt damit in die Hebel-Kategorie.

| Kategorie | # | Skill | Einzeiler |
| --- | --- | --- | --- |
| **Wachstum** | 1 | Aussaat | Gewinnt eine grüne Karte, wachsen beide Nachbarn. |
| | 2 | Ranken | Wird eine Karte grün, wachsen ihre grauen Nachbarn kräftig. |
| | 3 | Setzlingsbeet | Die niedrigste Karte je Segment startet mit Wachstumsvorsprung. |
| | 4 | Lichtung | Ein Sieg in einer Formation gibt doppeltes Formations-Wachstum. |
| | 5 | Zäher Halm | Graue Karten wachsen auch bei Niederlage. |
| **Hebel** | 6 | Spalier | Segmentgrenzen neben grünen Karten sind offen. Leiter: 1 / 2 / 3 / alle 7 Grenzen. |
| | 7 | Wildwuchs | Blühende Karten zählen als Joker. Leiter: 1 / 2 / 3 / alle blühenden Karten. |
| | 8 | Lücke | Ein grüner Lauf darf eine fremde Karte überspringen. Leiter über `gap.run` / `gap.seg`. |
| | 9 | Überwucherung | Ab N % grünem Feld entstehen grüne Formationen mit einer Karte weniger. Leiter über die Feldschwelle. |
| **Score** | 10 | Blätterdach | Ein grüner **Farbblock** gibt Basis-Score je grüner Karte darin. |
| | 11 | Rankgerüst | Eine grüne **Treppe** gibt Basis-Score je grüner Karte darin. |
| | 12 | Hecke | Eine grüne **Wiederholung** gibt Basis-Score je grüner Karte darin. |
| | 13 | **Windung** | Ein grüner **Wechsel** gibt Basis-Score je grüner Karte darin — der Zick-Zack über die Kartenwerte. |
| | 14 | Jahresringe | Ein Sieg gibt Basis-Score je 10 eigenes Wachstum der Siegkarte. |
| **Kombination** | 15 | Blütenlese | Ein Sieg in einer rein grünen Formation gibt Basis-Score **und** lässt alle Karten darin wachsen. |

**Verteilung:** Wachstum 5 · Hebel 4 · Score 5 · Kombination 1. Die vier Hebel ändern die **Erkennung**
(Segmentgrenze, Joker, Lücke, Mindestlänge) und fassen die Ordnung nicht an; die fünf Score-Skills decken die vier
Formationstypen plus die Tiefe der einzelnen Karte ab.

**Legendäre unverändert** (6.5): Baumreihe mit Auslöser *blühend*, Weltenbaum, Mutterbaum, Ewiger Frühling.

### 6.8 Die vier Stufen je Skill (Vorschlag, Startwerte ungemessen)

Regeln, nach denen die Leitern gebaut sind (§1): **keine zwei Stufen mit denselben Werten**, Episch hat ein kleines
Extra **oder** ist sehr stark, **keine Deckel** auf den Rampen, ein Effekt je Skill, **kein Direkt-Score** — alle
Score-Zahlen unten gehen in die Basis. Bezugsgrößen: Passiv-Schwellen grün **30** / blühend **75**, Wachstum +1 je
Sieg und +1 je aktiver Formation; eine Position gewinnt über einen Lauf grob 30-mal.

#### Wachstum

| Skill | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Aussaat** | Gewinnt eine grüne Karte, wachsen beide Nachbarn +1 | +2 | +3 | +4; auch die zweiten Nachbarn wachsen +1 |
| **Ranken** | Wird eine Karte grün, wachsen ihre grauen Nachbarn +5 | +8 | +12 | +16; wird eine Karte dadurch grün, wachsen ihre grauen Nachbarn ebenfalls +16 |
| **Setzlingsbeet** | Die niedrigste Karte je Segment startet mit +8 Wachstum | +12 | +16 | +16, die zwei niedrigsten |
| **Lichtung** | Ein Sieg in einer Formation gibt +1 Wachstum zusätzlich | +2 | +3 | +3 je Formation an der Siegposition |
| **Zäher Halm** | Graue Karten wachsen bei einer Niederlage +1 | +2 | +3 | +3; auch grüne Karten wachsen +1 |

#### Hebel

| Skill | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Spalier** | Die Segmentgrenze mit den meisten grünen Karten daneben ist offen | 2 Grenzen | 3 Grenzen | alle 7 Grenzen |
| **Wildwuchs** | Deine am weitesten gewachsene blühende Karte zählt als Joker | 2 blühende Karten | 3 blühende Karten | alle blühenden Karten |
| **Lücke** | Ein Lauf aus grünen Karten darf eine fremde Karte überspringen | zwei | drei | drei; die übersprungenen Karten wachsen +2 |
| **Überwucherung** | Ab 80 % grünem Feld entstehen grüne Formationen mit einer Karte weniger | ab 65 % | ab 50 % | ab 35 %; mit zwei Karten weniger |

#### Score aus grünen Formationen

Die Sätze unterscheiden sich **nach der Länge der Formation**, nicht willkürlich: ein grüner Farbblock kann im
Zielbild 40 Karten lang werden, eine Treppe oder Wiederholung bleibt bei drei bis fünf, ein Wechsel ist am
seltensten. Deshalb zahlt der Farbblock je Karte am wenigsten und der Wechsel am meisten.

| Skill | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Blätterdach** (Farbblock) | Ein Sieg in einem grünen Farbblock gibt +10 Basis-Score je grüner Karte darin | +15 | +20 | +25; blühende Karten zählen doppelt |
| **Rankgerüst** (Treppe) | Ein Sieg in einer grünen Treppe gibt +30 Basis-Score je grüner Karte darin | +45 | +60 | +80; blühende Karten zählen doppelt |
| **Hecke** (Wiederholung) | Ein Sieg in einer grünen Wiederholung gibt +30 Basis-Score je grüner Karte darin | +45 | +60 | +80; blühende Karten zählen doppelt |
| **Windung** (Wechsel) | Ein Sieg in einem grünen Wechsel gibt +35 Basis-Score je grüner Karte darin | +50 | +70 | +90; blühende Karten zählen doppelt |
| **Jahresringe** (Tiefe) | Ein Sieg gibt +20 Basis-Score je 10 Wachstum der Siegkarte | +30 | +40 | +50; Wachstum über der Blüh-Schwelle zählt doppelt |

#### Kombination

| Skill | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Blütenlese** | Ein Sieg in einer rein grünen Formation gibt +40 Basis-Score und lässt alle Karten darin +1 wachsen | +60 | +80 | +100, die Karten darin +2 |

**Das gemeinsame Episch-Motiv der Score-Skills** ist Absicht: „blühende Karten zählen doppelt" macht den dritten
Zustand zum Verstärker aller vier Formationstypen, statt ihm einen eigenen Skill zu geben. Damit hängt die Spitze
des Builds an derselben Größe wie das Passiv.

**Abhebung der Episch-Stufen** (Owner-Frage): 13 der 15 haben einen zweiten Satz oder einen qualitativen
Sprung — dasselbe Verhältnis wie bei Feuer und Blitz, wo rund zwei Drittel der Episch-Stufen ein Extra tragen. Die
beiden reinen Zahlen von zuvor sind nach Owner-Entscheid gefüllt: **Ranken Episch** kettet (eine Karte, die dadurch
grün wird, steckt ihre eigenen Nachbarn an — der einzige Dominoeffekt der Fraktion), **Überwucherung Episch** senkt
die Mindestlänge um zwei statt um eine. Reine Zahlen bleiben nur dort, wo der Sprung selbst qualitativ ist:
Spalier („alle 7 Grenzen" macht das Deck zu einer Reihe) und Wildwuchs („alle blühenden Karten").

**Was zu messen ist, sobald das Passiv steht** (nicht vorher): wie viele blühende Karten ein Lauf hat (Wildwuchs
Episch und die vier Episch-Extras hängen daran), wie lang grüne Farbblöcke wirklich werden (Blätterdach-Satz und die
offene Deckel-Frage aus 6.2), und wie oft Spalier Episch das Deck zu einer durchgehenden Reihe macht.

### 6.9 Umgesetzt (2026-09-07) — die Fraktion steht im Code

Die Pflanze ist gebaut: Passiv, 15 Skills mit vier Stufen, vier Formationshebel, vier Legendäre, Texte, Glossar,
Anzeige. **Nicht gemessen** (Owner: erst Design, dann Startwert, dann messen auf Ansage) und **noch nicht im
Türen-Angebot** — `SKILL_OFFER_ARCHETYPES` steht weiter auf Feuer/Blitz.

**Warum in einem Stück statt in Etappen.** Der Plan sah Passiv, dann die 15 Skills, dann die Hebel vor. Die Registry-
Wächter lassen das nicht zu: `skill-art.test.js` verlangt **mindestens 18 Skills je Fraktion** mit Emblem, und
`archetypesWithSkills` erwartet vier Fraktionen mit Skills. Eine Fraktion ohne Skills — und sei es für einen Commit —
macht die Suite rot. Also derselbe Schnitt wie bei Feuer und Blitz (Phase 2/3): eine Fraktion, ein Umbau.

**Der Abriss.** Raus sind: Wertableitung aus Wachstum und Auto-Sieg bei 11, der Alte Anker (die Aktivierung startete
eine grüne Karte mit Wert 11), `plantDirect` samt aller fünf Direkt-Score-Quellen, `plantFormMult`, Trimmen
(`TRIM_STEP`/`TRIM_CAP`/`trimCount`), die Bekenntnis-Skalierung `commitScale` (die Pflanze war ihr letzter Leser —
**keine Fraktion skaliert ihren Ertrag mehr an der Zahl gehaltener Skills**), die Kolonisierung des Gegnerdecks samt
Anzeige, die sechs `enabler`-Verstärker und die Niederlage-Klausel des Wurzelschlags. Zwei Emblem-Plätze sind
zurückgegeben (SK_PLANT_02 Wurzeltiefe, SK_PLANT_18 Kernholz), zehn Embleme tragen jetzt den Namen ihres neuen Skills.

**Technische Entscheide, die im Entwurf offen waren** (getroffen, wie §Entscheidungsbefugnis es vorsieht — Werte sind
Vorschläge, die Mechanik ist gesetzt):

| Frage | Entscheid | Warum |
| --- | --- | --- |
| Was heißt „Formation" für die Pflanze? | **Der echte Lauf** — Wiederholung, Farbblock, Treppe, Wechsel (die Einträge mit `members`). Anker, Nachhall, Formationskern und Grenzbonus zählen nicht. | Ein Begriff je Sache: dieselbe Definition trägt das Wachstum (+1 je Formation) und den Score (grüne Karten darin). Das Glossar nennt eine Formation „Muster benachbarter Karten" — Meta-Faktoren sind das nicht. |
| Satz des Passiv-Scores | **+20 Basis-Score je grüner Karte** (`PLANT_BLOOM_SCORE_PER_GREEN`) | Startwert. Bezug: ein grünes Segment fasst 5 Karten → 100 Basis-Score je Blüh-Sieg, gegen 400 Grund-Score je Sieg und 75 je Stapel beim Blitz. Der Regler der Fraktion. |
| „Ein Sieg in einem grünen Farbblock" | **Die Siegkarte muss grün sein**, gezahlt wird je grüner Karte in ihrem Lauf dieses Typs — der Lauf muss nicht rein grün sein. | Sonst hätte die Fraktion vier harte Tore statt einer Rampe. Blütenlese sagt bewusst „**rein** grün" und ist der einzige Skill mit dieser Bedingung. |
| Überwucherung, „zwei Karten weniger" | **Mindestens zwei Karten** bleiben nötig (Farbblock 3 → 2, nicht 1). | Ein Lauf aus einer Karte ist keine Formation. Der Text nennt die Klemme; Episch unterscheidet sich weiter über die Feldschwelle (35 % statt 50 %). |
| Lücke: welcher Lauf? | **Der Farbblock**, und nur wenn er grün beginnt. | „Ein Lauf aus grünen Karten" ist der grüne Farbblock; das Budget kommt auf E_COLORBRIDGE obendrauf, statt es zu ersetzen. Die übersprungenen Positionen liegen als `gapped` am Eintrag — daraus zahlt Lücke Episch. |
| Spalier: was heißt „daneben"? | **Die zwei Karten links und rechts der Grenze**; ohne grünen Nachbarn öffnet keine Grenze. Bei Gleichstand die kleinere Grenznummer. | Wörtlich der Text, deterministisch (§9), und im vollgrünen Deck öffnen mit Episch alle sieben. |
| Weltenbaum-Satz | **+1 Wachstum je 5 grüne Karten**, am Durchlaufende, für jede grüne Karte. | Der alte Satz (`WELTENBAUM_PER_GREEN`) übernommen — die einzige Zahl der Legendären, die weiterlebt. |
| Mutterbaum | Die am weitesten gewachsene Karte **tritt jedem Lauf ihres Segments als Mitglied bei** (und bekommt dessen Faktor auf der nächsten Ordinalzahl). | „Zählt mit" heißt Mitglied: so wirkt sie auf Score, Wachstum und Überlappung gleich, ohne neuen Faktor-Kanal. |
| Baumreihe | Ein echter **Wiederholungs-Eintrag** über alle blühenden Karten, mit den normalen Wiederholungs-Faktoren. | Kein eigener Multiplikator (§6.1) — die positionsfreie Wiederholung ist eine Formation wie jede andere und speist damit auch das Passiv. |

**Was der Code jetzt hält.** `src/game/factions/plant.js` (Passiv, Zustände, alle Skill-Effekte, Legendäre),
`PFLANZE_TIERS` in `skills.js` (15 Stufentabellen), die vier Hebel und zwei Legendären in `formations.js` (die
Erkennung liest ein Bündel `{ skillTiers, growth }` als neunten Parameter), ein Score-Kanal `plantBase` statt drei,
`test/plant-rework.test.js` mit 36 Wächtern — darunter die **Gegenprobe**, dass die Formations-Engine ohne gehaltenen
Pflanzen-Skill Byte für Byte dasselbe liefert wie vorher.

**Offen und beim Owner:** (1) die Messrunde — wie viele blühende Karten ein Lauf hat, wie lang grüne Farbblöcke
werden, ob der Grün-Farbblock-Deckel (`PLANT_GREEN_FARBBLOCK_CAP` 3) bleibt, und die Parität gegen Feuer und Blitz;
(2) ob die Pflanze ins Türen-Angebot kommt (`SKILL_OFFER_ARCHETYPES`) — das ändert jedes Angebot im Lauf und ist
darum keine technische Entscheidung; (3) das Sim-Band wird erst nach (1) und (2) neu zentriert.

### 6.10 Gemessen (2026-09-07, auf Ansage) — Duell, Feld, gierig mit allen drei Fraktionen

**Aufbau.** Alle Zahlen ohne Legendäre (`SIM_SKILL_LEGENDARY_PER_SLOT=0`, Owner: „legendäre erst mal außen vor, die
bekommen ein Redesign") — für alle drei Fraktionen gleich, die Vergleiche sind also fair. Die Sim-Welt kommt aus der
Allowlist je Lauf, `SKILL_OFFER_ARCHETYPES` bleibt unangetastet.

#### A · Duell (200 Läufe, Seeds 1–200, Türen aus Feuer/Blitz/Pflanze)

| Build | Median | Mean | p90 | Siegquote | Ø Skills |
| --- | --- | --- | --- | --- | --- |
| Feuer mono | 7,75M | 10,12M | 18,77M | 65,3 % | 11,1 |
| Blitz mono | 7,43M | 14,84M | 37,35M | 59,4 % | 11,3 |
| **Pflanze mono** | **4,90M** | **6,27M** | **9,72M** | **53,3 %** | 11,3 |
| Feuer+Blitz+Pflanze Split | 6,19M | 8,49M | 13,77M | 57,8 % | je 4,3 |
| Mix (Random) | 3,58M | 4,96M | 9,02M | 58,4 % | je 4,3 |

**Pflanze ÷ Feuer 0,63× · ÷ Blitz 0,66× (Median), 0,52× / 0,26× am p90.** Die Parität Feuer ÷ Blitz hält (1,04×).

#### B · Das Feld im Lauf (Sonde `sim/probes/plant-field.mjs`, 60 Läufe, Pflanze mono)

| Durchlauf | grün | blühend | Ø Wachstum | längster grüner Farbblock | Siege mit blühender Karte |
| --- | --- | --- | --- | --- | --- |
| 11 | 2,0 | 0,0 | 13 | 1,5 | 0 % |
| 21 | 22,2 | 1,8 | 35 | 5,5 | 5 % |
| 31 | 34,6 | 17,5 | 75 | 8,9 | 52 % |
| 41 | 38,5 | 31,3 | 135 | 10,8 | 89 % |
| 50 | 39,6 | 37,0 | 205 | 12,1 | 97 % |

Blühende Karten am Laufende: **Median 38 von 40** (p10 31, p90 40). Das Zielbild aus §6.1 wird erreicht — aber spät:
vor Durchlauf 11 passiert nichts, die erste blühende Karte kommt um 16–21, die Fraktion zahlt ab etwa 26. Der längste
grüne Farbblock endet bei 12 Karten (ohne Spalier wären es 5, das Segment); **das Deck wird nur in 13 % der Läufe zu
einer Reihe** (Block ≥ 20) — Spalier Episch ist selten, der Deckel `PLANT_GREEN_FARBBLOCK_CAP` bindet also kaum.

#### C · Gierig mit allen drei Fraktionen in den Türen (explore 900, gierig 120) — „wie im Spiel"

Median 21,8M, Ø 12,8 Skills, Siegquote 69 %. Die Pflanze-Zeilen (Ablation, gepaart):

| Skill | gehalten | Ablation | Lesart |
| --- | --- | --- | --- |
| Blütenlese | 13 % | **+6,00M (typ. +74 %)** | der einzige „starke" Pflanze-Skill im gemischten Build |
| Jahresringe | 10 % | +1,67M | zahlt aus der eigenen Tiefe, ohne Feld |
| Wildwuchs | 38 % | +0,81M | Episch-Lift 6,39 — der Ausreißer der Fraktion |
| Blätterdach | 51 % | −0,50M | wird oft genommen und zahlt nicht |
| Spalier / Ranken / Setzlingsbeet / Zäher Halm | 20/13/12/10 % | −2,9M / −3,0M / −3,8M / −4,8M | **Ballast** |

Die vier schlechtesten Picks des ganzen Feldes sind Pflanze-Wachstums-Skills. Das ist kein Defekt, sondern die
Signatur einer Bekenntnis-Fraktion: Anlauf ohne Auszahlung kostet im gemischten Build den Platz.

#### D · Gierig NUR in der Pflanze-Welt (explore 500, gierig 100)

Der gierige Spieler hält 13 der 15 Skills; die Ablation misst also „was kostet es, genau diesen wegzulassen":
Jahresringe **+1,19M (17 %)**, Spalier **+0,80M (12 %)**, Wildwuchs +0,57M, Windung +0,53M, Blätterdach +0,23M —
danach nichts mehr; Setzlingsbeet (−0,74M), Ranken (−0,62M) und Hecke (−0,40M) kosten. Die Episch-Stufen tragen die
Spitzen: **Wildwuchs 4,13 · Rankgerüst 3,35 · Spalier 2,18**. Median 9,1M, aber **p95 265M** — die Fraktion hat einen
Schwanz, und er sitzt in der Erkennungs-Achse, nicht im Passiv.

#### E · Sweep der Regler (Pflanze-Welt, 100 Läufe, Seeds 1–100)

| # | Variante | Median | Mean | p90 | Δ Median |
| --- | --- | --- | --- | --- | --- |
| A | Ist: Satz 20, Schwellen 30/75, +1 je Formation | 5,52M | 6,45M | 9,84M | — |
| B | Satz 30 | 5,70M | 6,75M | 10,23M | +3 % |
| C | Satz 40 | 5,93M | 7,04M | 10,62M | +7 % |
| D | Schwellen 25/60 | 5,66M | 6,04M | 8,47M | +3 % |
| E | 25/60 + Satz 30 | 5,98M | 6,33M | 8,95M | +8 % |
| F | **+2 Wachstum je Formation** | 6,06M | 6,63M | 8,98M | **+10 %** |
| G | +2 je Formation und Satz 40 | 6,62M | 7,23M | 9,69M | +20 % |
| H | Satz 80 (Vierfaches) | 6,82M | 8,23M | 13,41M | +24 % |

**Der Passiv-Satz ist kein Regler.** Vom Vierfachen bleiben +24 % übrig; der Satz je grüner Karte ist zu klein gegen
das, was der geteilte Multiplikator-Stack (Formation × Serie × Crit) aus der Basis macht. Der Owner-Regler „+1 je
Formation" bewegt mehr als der Score-Satz — er wirkt über die Zeit (früher grün, früher blühend), nicht über die Zahl.

#### Befund

1. **Die Pflanze liegt bei ⅔ der zwei tarierten Fraktionen, und ihr Schwanz ist der dünnste.** Sie ist nicht tot: 4,9M
   gegen 3,6M eines Zufallsspielers, und der Split mit ihr (6,19M) liegt über dem Mix.
2. **Sie hat als einzige Fraktion weder Multiplikator noch Siegquote.** Feuer multipliziert (Hitze-Multiplikator),
   Blitz kritet (bis ×8), die Pflanze addiert nur Basis-Score — und die Basis multipliziert derselbe Stack, den alle
   haben. Siegquote 53,3 % gegen 65,3 % (Feuer): grün gibt bewusst keinen Kartenwert, also gewinnt sie auch keine
   Stiche dazu.
3. **Die einzige multiplikative Achse, die sie hat, ist die Erkennung** — mehr und längere Formationen. Genau dort
   sitzen die Episch-Spitzen (Wildwuchs 4,13, Spalier 2,18) und der ganze Schwanz (p95 265M in der Pflanze-Welt).
4. **Die Rampe ist spät** (nichts vor Durchlauf 11, Auszahlung ab 26) — und im gemischten Build ist der Anlauf reiner
   Ballast (die vier schlechtesten Picks des Feldes).

#### Vorschläge (Entscheid Owner, nichts davon umgesetzt)

| # | Vorschlag | Was es kostet / bringt |
| --- | --- | --- |
| 1 | **Erst die Legendären neu bauen, dann tarieren.** | Bei Feuer und Blitz tragen die Legendären einen großen Teil (Sonnenkern +133 %, Doppelentladung +106 %, Resonanz +48 %); die vier der Pflanze sind bewusst leise. Die halbe Lücke kann dort liegen. Empfehlung. |
| 2 | Wenn jetzt tariert wird: **an der Erkennungs-Achse drehen, nicht am Passiv-Satz.** Z. B. Spalier Normal 2 statt 1 Grenze, Wildwuchs Normal 2 statt 1 Joker. | Das ist der multiplikative Kanal und der einzige, der auch den Schwanz hebt. Ungemessen — ein Sweep ist eine Runde. |
| 3 | **+2 Wachstum je Formation** (statt +1). | +10 % Median, gemessen (F). Macht die Aufstellung noch stärker zur Wachstumsentscheidung — dein eigener Regler aus §6.2. |
| 4 | Den Wachstums-Skills einen Grund im gemischten Build geben (kleiner Sofort-Ertrag) **oder** sie bewusst als Mono-Skills stehen lassen. | Heute sind sie die vier schlechtesten Picks des Feldes. Beides ist vertretbar — „Bekenntnis-Fraktion" ist eine legitime Bauform, nur muss sie gewollt sein. |
| 5 | Der Grün-Farbblock-Deckel (`PLANT_GREEN_FARBBLOCK_CAP` 3) **kann bleiben**. | Gemessen: der längste grüne Block endet bei 12 Karten, das Deck wird nur in 13 % der Läufe zu einer Reihe. Die offene Frage aus §6.2 ist damit beantwortet: der Deckel bindet kaum. |

### 6.11 Legendäre: drei je Fraktion (2026-09-07, Owner) — gemessen, gekürzt, neu gebaut

**Owner:** „lass die legendäre bauen, 3 reichen. lass auch bei den anderen auf 3 reduzieren. wir behalten die stärksten."

#### Gemessen: welche vier waren die schwächsten (Feuer/Blitz, 150 Läufe, gepaart, Legendäres in der mittleren Skill-Phase)

| Legendär | Fraktion | Median-Δ | typisch | besser in |
| --- | --- | --- | --- | --- |
| Resonanz | Blitz | +32,1M | +106 % | 80 % |
| Doppelentladung | Blitz | +29,5M | +85 % | 74 % |
| Sonnenkern | Feuer | +24,6M | +76 % | 66 % |
| Hochspannung | Blitz | +9,0M | +40 % | 64 % |
| **Donnergott** | **Blitz** | **+7,7M** | **+30 %** | 60 % |
| Damaststahl | Feuer | +2,5M | +8 % | 54 % |
| Ewige Glut | Feuer | −1,0M | −8 % | 47 % |
| **Sonnenzorn** | **Feuer** | **−3,6M** | **−14 %** | 46 % |

**Gestrichen: Donnergott (Blitz) und Sonnenzorn (Feuer)** — je das schwächste ihrer Fraktion. Mit ihnen gehen die
Konstanten `DONNERGOTT_MAX_CHARGE`, `DONNERGOTT_ION_CRIT_MULT_PER_STACK`, `SONNENZORN_MULT_PER_10`,
`SONNENZORN_HEAT_MULT`, die Spitzen-Lesart des Hitze-Multiplikators (`heatMult` rechnet wieder nur mit der aktuellen
Hitze; `heat.peak` trägt jetzt nur noch den Boden der Ewigen Glut) und ihre zwei Embleme.

**Offen benannt:** Feuers verbleibende drei sind nach dieser Messung dünn (Sonnenkern +76 %, Damaststahl +8 %, Ewige
Glut −8 %), während Blitz drei starke behält. Wenn Feuer eine Runde bekommt, sind Damaststahl und Ewige Glut die
Kandidaten — nicht in dieser Runde entschieden.

#### Die drei Legendären der Pflanze (neu; die vier aus §6.5 waren nie gebaut worden)

Drei Achsen statt vier Ideen — jede liest den eigenen Zustand, keine zahlt Direkt-Score, keine hat einen eigenen
Multiplikator-Stapel:

| Platz | Name | Text | Achse |
| --- | --- | --- | --- |
| L02 | **Wurzelgeflecht** (ersetzt Mutterbaum) | „Jede blühende Karte zählt in jeder Formation ihres Segments mit." | **Dichte** — mehr Mitglieder je Lauf (Passiv-Score und alle vier Score-Skills lesen die Mitglieder) und eine Formation mehr je blühender Karte (Wachstum, Überlappungsbonus) |
| L03 | **Baumreihe** (bleibt) | „Blühende Karten bilden eine positionsfreie Wiederholung, egal wo sie liegen." | **Multiplikator** — die Wiederholungsleiter ist ungedeckelt (2 → ×1,25 · 3 → ×1,50 · 4 → ×1,80, danach je +0,40) |
| L04 | **Ewiger Frühling** (bleibt) | „Ist das Feld vollständig grün, sind alle deine Karten blühend." | **Zielbild** — die Belohnung für §6.1 Punkt 2 |

**Gestrichen: Weltenbaum** (L01) — eine reine Wachstums-Rampe am Durchlaufende ohne eigene Auszahlung; die Fraktion
hat damit gar keinen Durchlaufende-Haken mehr. Mutterbaum ist in Wurzelgeflecht aufgegangen (aus „die am weitesten
gewachsene Karte" wurde „jede blühende Karte" — dieselbe Mechanik, an der Währung der Fraktion statt an einer
Einzelkarte).

#### Gemessen (Pflanze-Welt, 100 Läufe, gepaart, mittlere Skill-Phase)

| Legendär | Median-Δ | typisch | besser in | Lift im Build |
| --- | --- | --- | --- | --- |
| **Wurzelgeflecht** | +148,4M | **+152 %** | 74 % | 1,33 |
| **Baumreihe** | +104,8M | **+614 %** | 75 % | 1,45 |
| Ewiger Frühling | +7,8M | +10 % | 58 % | 0,98 |

**Das ändert die Lage der Fraktion.** In §6.10 lag die Pflanze OHNE Legendäre bei ⅔ von Feuer und Blitz; mit den
neuen Legendären steht der Median der Pflanze-Welt bei 210M statt 9,1M. Zwei der drei sind stärker als alles, was
Feuer und Blitz haben (Resonanz +106 % ist dort die Spitze). Die Paritätsfrage aus §6.10 ist damit **neu zu stellen,
nicht mehr aus den Zahlen von dort zu beantworten** — die nächste Runde misst das Duell mit Legendären für alle drei.
Ewiger Frühling ist der schwache der drei (+10 %) und wäre der nächste Kandidat für einen Umbau.

---

### 6.12 Sonnenzorn zurück, und die neun Legendären auf ein Band (2026-09-07, Owner) — umgesetzt

**Owner:** „lass uns sonnenzorn statt damaststahl behalten und alle 9 legendäre auf ähnliche bander bringen, ähnlich
nicht komplett gleich"

#### 1. Der Tausch bei Feuer

**Damaststahl (L04) ist gestrichen, Sonnenzorn (L03) ist zurück.** In §6.11 war umgekehrt gekürzt worden — nach der
Messung, nicht nach dem Geschmack. Der Owner behält Sonnenzorn. Damit fallen `damascusCombat`, der Damast-Kampfbonus
in der Engine und die schwellenlose Schmiedung; zurück kommen `SONNENZORN_MULT_PER_10`, `SONNENZORN_HEAT_MULT`, der
Spitzen-Zweig in `heatGainOnWin`/`heatMult` und das Spitzen-Abzeichen der Hitzeleiste.

#### 2. Der Messfehler, der die Runde erst möglich gemacht hat

Die erste Bandmessung war **nicht vergleichbar**: `--mode legendaries` würfelt für jeden Lauf eine eigene
Explore-Wertetabelle. Eine geänderte Konstante änderte damit auch die Zeilen der *unberührten* Legendären — Sonnenkern
schwankte über vier Läufe zwischen +181 % und +418 %, Baumreihe zwischen +273 % und +426 %. Bei einem Zielband von
Faktor 2 ist das Rauschen so groß wie das Signal.

**Behoben mit `--table <datei>`** (sim/legendaries.js, sim/policies/greedy.js): die Wertetabelle wird einmal erkundet,
als reine Daten geschrieben und von allen Varianten wiederverwendet. Danach bleiben unberührte Zeilen innerhalb von
±10 Prozentpunkten, und ein Lauf kostet 6 statt 8,5 Minuten. Ein Kontrolllauf mit den Vorgabewerten reproduzierte die
Ausgangsmessung **byte-gleich**.

Ohne diesen Umbau wäre jede Zahl unten Zufall gewesen. Alle folgenden Messungen laufen über die geteilte Tabelle,
je Runde **eine** Konstante bewegt.

#### 3. Vier Legendäre hatten überhaupt keinen Regler

Hochspannung, Wurzelgeflecht, Baumreihe und Ewiger Frühling waren reine Mechanik ohne Zahl. Jedes hat jetzt genau
einen Regler auf der **bestehenden** Mechanik — die Voreinstellungen waren exakt das alte Verhalten (der
Kontrolllauf oben beweist es):

| Legendär | Regler | Bedeutung |
| --- | --- | --- |
| Hochspannung | `HOCHSPANNUNG_STEPS` | um wie viele Stufen gehaltene Blitz-Skills höher wirken |
| Baumreihe | `BAUMREIHE_FACTOR_SCALE` | welchen Anteil des Wiederholungs-Bonus die positionsfreie Reihe zahlt |
| Wurzelgeflecht | `WURZELGEFLECHT_FACTOR_SCALE` | welchen Anteil des Lauf-Bonus die beitretende blühende Karte bekommt |
| Ewiger Frühling | `EWIGER_FRUEHLING_GREEN_FRAC` | ab welchem Anteil grüner Karten alles blüht |

**Verworfen:** eine Mindest-Lauflänge als Wurzelgeflecht-Regler. Gemessen kippte das Legendäre damit von +164 % auf
−4 % (Länge 3) und −22 % (Länge 4) — die kurzen Läufe sind der Großteil seiner Wirkung. Der Faktor-Anteil greift weich.

**Nebenbefund zum Nullpunkt:** der Eingriff ERSETZT einen normalen Pick. Ein Legendäres bei +4 % ist deshalb nicht
„schwach", sondern **weniger wert als ein gewöhnlicher Skill** — daher die negativen Zeilen. Der Boden des Bandes ist
nicht 0 %.

#### 4. Ergebnis: acht von neun in +58 … +127 %

Gemessen über die geteilte Tabelle, Welt Feuer/Blitz/Pflanze, 600 Explore + 150 gierige Läufe, gepaart, Legendäres in
der mittleren Skill-Phase (Runde 25). „typ." = typischer multiplikativer Effekt.

| Legendär | Fraktion | vorher | **nachher** | Regler |
| --- | --- | --- | --- | --- |
| Sonnenkern | Feuer | +418 % | **+127 %** | Brand 1 → 0,25 · Score je Brandpunkt 20 → 4 |
| Baumreihe | Pflanze | +411 % | **+125 %** | Faktor-Anteil 1 → 0,15 |
| Resonanz | Blitz | +40 % | **+90 %** | Stapel-Anteil 1 → 2 |
| Doppelentladung | Blitz | +37 % | **+82 %** | Stapel je Ionisierung 2 → 4 |
| Wurzelgeflecht | Pflanze | +164 % | **+75 %** | Faktor-Anteil 1 → 0,7 |
| Ewige Glut | Feuer | +23 % | **+66 %** | Boden 50 → 80 % der Spitze · Rampe 0,05 → 0,12 |
| Hochspannung | Blitz | +8 % | **+60 %** | Stufenhub 1 → 3 |
| Sonnenzorn | Feuer | +32 % | **+58 %** | +5 → +8 % je 10 % Spitze · Hitze ×2 → ×3 |
| **Ewiger Frühling** | Pflanze | +4 % | **−7 %** | unverändert — siehe unten |

Aus Faktor 100 (+4 … +418 %) ist Faktor 2,2 geworden. In einer Welt mit *eigener* Wertetabelle („wie im Spiel") liegt
dieselbe Aufstellung bei +21 … +213 % — das ist das Restrauschen der Tabelle, nicht ein anderes Band.

**Zwei Regler waren tot und mussten getauscht werden:**

- *Ewige Glut:* die Rampe je heißer Runde ist wirkungslos — Sweep 0,05 / 0,075 / 0,10 / 0,15 lag flach bei +23 %. Was
  das Legendäre trägt, ist der **Hitze-Boden**. Also 0,5 → 0,8.
- *Sonnenkern:* der Brand-Score ist zweitrangig. Bei Brandmarke 1 lag Sonnenkern selbst mit Score 4 noch bei +296 % —
  der Motor ist der **stapelnde Wert-Debuff**. Also 1 → 0,25 (Viertel sind binär exakt, die Kartenanzeige bleibt
  sauber; sie rundet jetzt zusätzlich auf zwei Stellen).

#### 5. Was nicht geht: Ewiger Frühling

Sein Regler ist ausgereizt und trifft das Band nicht:

| Anteil grün, ab dem alles blüht | 1 (heute) | 0,85 | 0,6 | 0,35 | 0,25 |
| --- | --- | --- | --- | --- | --- |
| typ. Effekt | +4 % | +10 % | +17 % | +37 % | +34 % |

Der Wert sättigt bei rund einem Drittel des Bandbodens — und bezahlt wird er mit dem Zielbild („vollständig grün"),
also genau der Identität aus §6.1. Deshalb **bleibt der Regler auf 1** und das Legendäre außerhalb des Bandes:
für +10 % gibt man das Zielbild nicht her.

**Ewiger Frühling braucht eine Design-Entscheidung, keine Zahl — Owner.** Der Befund dahinter: „alles blüht" allein
zahlt zu wenig, weil Blühen in dieser Fraktion nur ein *Zustand* ist; die Auszahlung hängt an den Formationen, die
eine blühende Karte betritt. Vorschlag, wenn gewünscht: das Zielbild behalten und ihm eine eigene Auszahlung geben
(z. B. das vollgrüne Feld hebt dauerhaft das Wachstum je Formation), statt den Auslöser weiter zu verbilligen.

#### 6. Was noch angefasst wurde

- **Skilltexte** tragen jetzt die Zahlen, die wirken: Resonanz nennt den Stapel-Anteil, Hochspannung den Stufenhub,
  Baumreihe und Wurzelgeflecht den Anteil des Formations-Bonus, Sonnenkern die gebrochene Brandmarke. Die zwei
  Anteils-Texte („zahlt 15 % des Wiederholungs-Bonus") sind korrekt, aber sperrig — **Wortlaut Owner**, wenn er das
  anders gesagt haben will.
- **Balance-Guard neu zentriert** (Zufallsspieler, Seeds 1..40): Median 4,01M, Mean 8,76M. Der Zufallsspieler steigt,
  weil ihn die gehobene Unterkante trifft und die gesenkte Oberkante kaum — den Formations-Motor der Pflanze baut er
  selten.
- Offen aus §6.10/§6.11: ob die Pflanze ins Angebot (`SKILL_OFFER_ARCHETYPES`) kommt, und die Paritätsrunde der drei
  Fraktionen mit Legendären.

---

### 6.13 Ewiger Frühling bekommt eine Auszahlung (2026-09-07, Owner) — umgesetzt, ungemessen

**Owner:** „ewiger Frühling noch einen bonus auf blühende Karten."

**Blühende Karten kämpfen mit +3 Wert.** Der zweite Effekt hängt am Zustand, nicht am vollgrünen Feld — er zahlt ab
der ersten blühenden Karte, das Zielbild bleibt der zweite Effekt und unverändert.

> „Blühende Karten kämpfen mit +3 Wert. Ist das Feld vollständig grün, sind alle deine Karten blühend."

**Warum Wert und nicht Score.** Die Fraktion hat **keinen einzigen Wert-Hebel**: alle 15 Skills sind Wachstum,
Basis-Score oder Formationserkennung, keiner macht eine Karte stärker. Deshalb war Ewiger Frühling in §6.12 nicht
zu retten — sein Auslöser war nie das Problem, seine Auszahlung war es: „alles blüht" ist ein Zustand, und die
Auszahlung des Zustands hing komplett an den Formationen, die eine blühende Karte betritt. Der Wert-Bonus gibt der
Pflanze über ihr Spitzen-Legendäres die Achse, die ihr fehlt — Siegquote statt noch eines Score-Kanals. Er verstößt
gegen keine der Regeln aus §6.1: kein Direkt-Score, kein Deckel, kein Verstärker, kein Eingriff in die
Aufstellungsordnung.

**Verworfen:** Basis-Score je blühender Karte (doppelt den Passiv-Kanal `PLANT_BLOOM_SCORE_PER_GREEN` — zwei Begriffe
für dieselbe Sache); mehr Wachstum für blühende Karten (über Blühend gibt es keinen Zustand mehr, der Bonus wäre tot).

**Startwert +3 ist ungemessen** (Owner-Regel: erst Design, dann Startwert, gemessen wird auf Ansage). Die Einordnung:
Kartenwerte laufen 1..10, Schmiede und Glutstahl geben +3 dauerhaften Wert, Blitzfänger +1..+4 auf ionisierte Karten.
`SIM_EWIGER_FRUEHLING_BLOOM_VALUE` ist der Sweep-Haken.

---

### 6.14 Alle auf ~100 % (2026-09-07, Owner) — gemessen, sieben von neun

**Owner:** „keine Kommazahlen auf den Karten. einfach nicht anzeigen und nach 4 Niederlagen hat sie dann −1" /
„schaffen wir alle die aktuell unter 100 % liegen nur mit ihren werten so anzupassen das sie um die 100 % liegen"

#### Anzeige: nur ganze Brandpunkte

Die Karte zeigt `Math.floor(brand)` und bleibt darunter leer — gerechnet wird weiter der volle Viertelwert. Nach vier
Niederlagen steht −1 auf der Karte, der Glutsaum erscheint mit ihr. Keine Kommazahl im Spiel.

#### Gemessen, ein Regler je Lauf, geteilte Wertetabelle

| Legendär | Regler | vorher | **nachher** |
| --- | --- | --- | --- |
| Ewige Glut | Boden 0,8 → **0,85** · Rampe 0,12 → **0,15** | +71 % | **+101 %** |
| Sonnenzorn | +8 → **+13 %** je 10 % Spitze | +58 % | **+101 %** |
| Wurzelgeflecht | Faktor-Anteil 0,7 → **1** (Regler wieder aus) | +63 % | **+100 %** |
| Doppelentladung | Stapel je Ionisierung 4 → **5** | +82 % | **+100 %** |
| Resonanz | Stapel-Anteil 2 → **2,25** | +83 % | **+108 %** |

Zusammen gemessen (alle Werte gesetzt, geteilte Tabelle) liegen sieben der neun in **+101 … +149 %**:
Baumreihe +149 · Doppelentladung +141 · Sonnenkern +126 · Resonanz +123 · Wurzelgeflecht +118 · Ewige Glut +101 ·
Sonnenzorn +101. Die Zeilen liegen über den Einzelmessungen, weil im Verbund auch die Basisläufe steigen (Kopplung
über die natürlichen Picks, §6.12).

#### Zwei erreichen 100 % nicht — und das ist keine Frage der Zahl

**Hochspannung (+59 %): der Regler ist arithmetisch am Ende.** `effectiveTier` rechnet `min(EPISCH, Stufe + Hub)`.
Bei Hub 3 ist jeder gehaltene Blitz-Skill bereits episch; 4 und mehr ändern nichts. Das ist keine Messung, das ist
die Formel. Mehr geht nur über eine andere Mechanik.

**Ewiger Frühling (+54 %): der Wert-Bonus sättigt.**

| +Wert auf blühende Karten | 3 | 6 | 8 | 12 | 20 |
| --- | --- | --- | --- | --- | --- |
| typ. Effekt | +23 % | +43 % | +51 % | +71 % | **+73 %** |

Zwischen 12 und 20 passiert nichts mehr: eine blühende Karte, die mit +12 schon fast jeden Stich gewinnt, gewinnt
mit +20 keinen weiteren. Der Deckel ist die Siegquote selbst, nicht der Regler. Gesetzt ist **+8** — darüber wandert
das Legendäre in den Auto-Sieg, den §6 der alten Pflanze-Ökonomie gerade ausgebaut hat (Wert-Achse mit Auto-Sieg
bei 11), und kauft dafür 20 Prozentpunkte.

#### Nicht angefasst

Sonnenkern (+126 %) und Baumreihe (+149 %) lagen schon über 100 % — der Auftrag galt den Zeilen darunter. Gemessen
läge Baumreihe mit Faktor-Anteil 0,12 statt 0,15 bei +112 %, falls die Oberkante enger soll.

Balance-Guard: Median 4,38M, Mean 9,39M — im Band von §6.12, nicht neu zentriert.

---

### 6.15 Ewiger Frühling bekommt den Multiplikator (2026-09-07, Owner) — umgesetzt und gemessen

**Owner:** „bei ewiger Frühling müssen wir dann neben Kartenwert noch einen anderen Boni geben, wie blühende Karten
gebe x % mehr Score in Formationen" · „Hochspannung passt so."

**Ein Sieg mit einer blühenden Karte zählt +15 % je aktiver Formation an ihrer Position.** Eigener Faktor im
Sieg-Stack (`breakdown.plantMult`), neben Serie, Perk, Formation, Nachhall, Kern, Feuer und Architekt.

> „Blühende Karten kämpfen mit +8 Wert, und ein Sieg mit einer blühenden Karte zählt +15 % je Formation an ihrer
> Position. Ist das Feld vollständig grün, sind alle deine Karten blühend."

**Das ist der erste Multiplikator der Fraktion.** Die Pflanze hatte drei Achsen — Wachstum, Basis-Score,
Formationserkennung — und keine multiplikative. Genau deshalb sättigte der Wert-Bonus in §6.14 bei +73 %: Wert kauft
Siege, und Siege sind endlich. Ein Faktor auf den Sieg-Score hat diese Grenze nicht.

**Gemessen** (ein Regler, geteilte Wertetabelle):

| +Satz je Formation | 8 % | **15 %** | 25 % | 40 % |
| --- | --- | --- | --- | --- |
| typ. Effekt | +83 % | **+108 %** | +139 % | +187 % |

Linear, keine Sättigung — im Gegensatz zum Wert-Bonus. Gesetzt: **0,15**.

#### Stand der neun (alle Werte gesetzt, geteilte Tabelle, gepaart)

| Legendär | Fraktion | typ. |
| --- | --- | --- |
| Baumreihe | Pflanze | +160 % |
| Doppelentladung | Blitz | +134 % |
| Wurzelgeflecht | Pflanze | +130 % |
| Sonnenkern | Feuer | +127 % |
| Resonanz | Blitz | +123 % |
| Sonnenzorn | Feuer | +117 % |
| **Ewiger Frühling** | Pflanze | **+108 %** |
| Ewige Glut | Feuer | +101 % |
| Hochspannung | Blitz | +59 % (Owner: „passt so") |

Acht von neun liegen in **+101 … +160 %**. Ausgangspunkt der Runde war +4 … +418 %.

**Nachtrag Owner (2026-09-07):** der Wert-Bonus geht von +8 auf **+6** — „+8 ist zu krass". Bewusst NICHT neu
gemessen (Owner-Ansage). Nach der Kurve aus §6.14 (+6 → +43 %, +8 → +51 % ohne den Multiplikator) kostet das grob
zehn Prozentpunkte; Ewiger Frühling landet damit knapp unter +100 % statt knapp darüber. Der Multiplikator bleibt
bei 15 %.

**Balance-Guard unverändert** (4,38M / 9,39M): der Zufallsspieler kann die Pflanze gar nicht ziehen —
`SKILL_OFFER_ARCHETYPES` ist weiter `["fire", "lightning"]`. Dass der Faktor greift, sichert stattdessen ein
Engine-Test auf `breakdown.plantMult`. **Sobald die Pflanze ins Angebot kommt, ist der Guard neu zu zentrieren.**

---

### 6.16 Die Pflanze kommt ins Angebot (2026-09-07, Owner) — umgesetzt

**Owner:** „danach kann auch pflanze gelockt werden auf exp. wir sind erstmal fertig"

`SKILL_OFFER_ARCHETYPES` ist jetzt `["fire", "lightning", "plant"]`. Damit stehen die 18 Pflanze-Skills im
Türangebot; Eis wartet weiter auf seine Runde. Der Türwurf selbst ändert sich nicht (2 Türen à 3 Skills aus
höchstens 2 Fraktionen) — nur der Topf, aus dem er zieht, ist um ein Drittel größer.

**Balance-Guard neu zentriert:** Median 4,01M → **2,98M**, Mean 8,76M → **4,82M**. Der Zufallsspieler *fällt*, und
das ist erklärbar: die Pflanze ist die einzige Fraktion, deren Motor ein GEBAUTER Build ist (Wachstum entsteht aus
Formationen, Formationen aus der Aufstellung). Wer zufällig pickt, zieht Pflanze-Skills, die nichts tun, und
verdünnt damit seine Feuer-/Blitz-Linien. Für den gierigen Spieler gilt das nicht — er wählt die Fraktion, die
sein Lauf trägt.

**Offen (nächste Runde):** die Paritätsrunde der drei Fraktionen mit Legendären — §6.10 verglich sie ohne, §6.12
bis §6.15 haben die Legendären seither zweimal bewegt.

---

### 6.17 Parität und tote Skills (2026-09-07, auf Ansage) — gemessen, nichts umgesetzt

**Owner:** „können wir alle 3 noch einmal gegeneinander ohne legendäre messen und pflanze auf Parität zu den anderen
beiden bringen. gibt es bei pflanze tote skills?"

#### A · Duell ohne Legendäre (200 Läufe, Seeds 1–200, Türen aus allen drei)

| Build | Median | Mean | p90 | Siegquote |
| --- | --- | --- | --- | --- |
| Feuer mono | 7,75M | 10,12M | 18,77M | 65,3 % |
| Blitz mono | 7,43M | 14,84M | 37,35M | 59,4 % |
| **Pflanze mono** | **4,90M** | **6,27M** | **9,72M** | **53,3 %** |
| Split über alle drei | 6,19M | 8,49M | 13,77M | 57,8 % |
| Mix (Zufall) | 3,58M | 4,96M | 9,02M | 58,4 % |

**Zahlengleich mit §6.10.** Das ist kein Zufall, sondern der Beweis, dass §6.11–§6.16 ausschließlich die Legendären
und den Angebotstopf angefasst haben — am normalen Spiel der Fraktionen hat sich nichts bewegt. Die Pflanze liegt
weiter bei **0,63× Feuer / 0,66× Blitz** im Median und zwölf Prozentpunkte unter Feuers Siegquote.

#### B · Tote Skills — zwei Sichten, und nur der Schnitt zählt

Ein Skill, der im gemischten Build nichts bringt, kann in der Mono-Fraktion tragen (Bekenntnis). Deshalb beide
Ablationen nebeneinander: gemischt (explore 900 / gierig 120, Skill konkurriert um den Platz) und Pflanze pur
(explore 500 / gierig 100, der Gierige hält 13 der 15 — gemessen wird der Grenznutzen im vollen Build).

| Skill | gemischt | Pflanze pur | Urteil |
| --- | --- | --- | --- |
| Blütenlese | **+6,00M (+74 %)** | +0,08M | trägt (pur gesättigt: 96 % halten ihn) |
| Jahresringe | +1,67M | **+1,19M (+17 %)** | trägt in beiden |
| Wildwuchs | +0,81M | +0,57M | trägt in beiden, Episch-Lift 4,1–6,4 |
| Spalier | −2,95M | **+0,80M (+12 %)** | reiner Bekenntnis-Skill |
| Windung | −0,20M | +0,53M | Bekenntnis |
| Blätterdach | −0,50M | +0,23M | Bekenntnis |
| Rankgerüst | +0,12M | +0,05M | flach |
| **Lichtung** | +0,71M | −0,00M | flach |
| **Aussaat** | −0,16M | −0,01M | **tot** |
| **Überwucherung** | −0,23M | −0,05M | **tot** |
| **Hecke** | −0,75M | −0,40M | **tot** |
| **Lücke** | −2,02M | −0,19M | **tot** (und nur 4 % gehalten) |
| **Ranken** | −3,00M | −0,62M | **tot** |
| **Setzlingsbeet** | −3,80M | −0,74M | **tot** |
| **Zäher Halm** | −4,81M | −0,21M | **tot** |

**Sieben der fünfzehn sind in BEIDEN Welten tot oder schädlich** — und vier davon sind die Wachstums-Skills
(Aussaat, Ranken, Setzlingsbeet, Zäher Halm). Das ist der Kern des Befunds: Wachstum füttert einen Zustand, und der
Zustand zahlt nur über Formationen, die man ohnehin baut. Wer Wachstum kauft, kauft Vorlauf ohne eigene Auszahlung.

Ein Nebenbefund: **Hecke und Rankgerüst haben dieselbe Leiter** (30/45/60/80) — Rankgerüst liegt bei +0,05M, Hecke
bei −0,40M. Der Unterschied ist allein, wie oft eine grüne Treppe gegen eine grüne Wiederholung entsteht.

#### C · Parität lässt sich mit den vorhandenen Reglern NICHT erreichen

Nötig sind ×1,55 auf den Median. Was die Regler hergeben, steht gemessen in §6.10 E: der Passiv-Satz bringt beim
**Vierfachen** +24 %, „+2 Wachstum je Formation" +10 %. Beides zusammen deckt keine Hälfte der Lücke, und keiner der
beiden hebt die Siegquote — die Pflanze gibt bewusst keinen Kartenwert.

**Der Grund ist strukturell und seit §6.10 unverändert:** Feuer hat einen Multiplikator (Hitze), Blitz hat Crit,
die Pflanze hat nur Basis-Score in einem Stack, den alle drei teilen. §6.15 hat der Fraktion beides gegeben —
Kampfwert und einen Formations-Multiplikator — aber **nur im Legendären**. Auf der Ebene der 15 Skills fehlt es
weiter.

#### Vorschläge (Entscheid Owner, nichts umgesetzt)

| # | Route | Was sie kostet / bringt |
| --- | --- | --- |
| 1 | **Die vier toten Wachstums-Skills umbauen**, sodass grün/blühend im Kampf oder im Multiplikator zahlt statt nur Wachstum zu füttern. | Trifft Parität und tote Skills mit einem Schnitt — die vier schlechtesten Picks des ganzen Feldes werden zur Achse, die der Fraktion fehlt. **Empfehlung.** Umfang: eine Runde wie der Blitz-Durchgang (§7.18). |
| 2 | Den Passiv-Kanal multiplikativ machen (z. B. blühende Karten heben den Formations-Faktor ihrer Läufe). | Ein Eingriff, große Wirkung, trifft aber jeden Build gleich — die toten Skills bleiben tot. |
| 3 | Nur Werte drehen (Score-Leitern der sechs Score-Skills hoch). | Gemessen aussichtslos für Parität; die Score-Achse ist der schwache Kanal (§6.10 E). Als Feinschliff NACH 1 oder 2 sinnvoll. |
| 4 | Parität nicht herstellen — die Pflanze bleibt die schwächere Bekenntnis-Fraktion. | Legitim, wenn gewollt: der Split mit ihr (6,19M) schlägt zufälliges Mischen deutlich, und ihr Schwanz (p95 265M pur) ist der höchste der drei. |

---

### 6.18 Wachstum muss über den Schwellen weiterzahlen (2026-09-07, Owner-Richtung) — Vorschlag, nichts umgesetzt

**Owner, zu §6.17:** „nein. das ist die Kern-Mechanik von Pflanze. der Hebel muss sein, dass diese in Kombination
mit den anderen Pflanzenskills dann einen Payoff haben."

Damit ist Route 1 aus §6.17 (Wachstums-Skills umbauen) **verworfen**. Wachstum bleibt die Kernmechanik; der Payoff
muss aus dem Zusammenspiel kommen.

#### Warum Wachstum heute nicht zahlt

Wachstum hat genau **zwei Ausgänge**: die Schwelle 30 (grün) und die Schwelle 75 (blühend). Alles, was die vier
Wachstums-Skills liefern, verpufft in dem Moment, in dem die Schwelle ohnehin fällt — und sie fällt ohnehin: das
Passiv allein bringt eine Position über 50 Runden auf grob 30 Wachstum, mit Formationen auf ein Vielfaches (Sonde
§6.10 B: 22 grüne Karten in Durchlauf 21, 34,6 in 31, 38,5 in 41).

**Die Wachstums-Skills verkaufen also Tempo, nicht Höhe** — und Tempo auf etwas, das der Spieler geschenkt bekommt.
Oberhalb von 75 ist jeder weitere Wachstumspunkt **wertlos**; genau ein Skill im Register liest die Zahl selbst.

**Und dieser eine Skill ist der beste der Fraktion.** Jahresringe („+20 Basis-Score je 10 Wachstum der Siegkarte")
ist in der Pflanze-Welt die Nummer 1 (+1,19M / +17 %) und im gemischten Build die Nummer 2 (+1,67M). Er ist der
einzige, der Wachstum in Score übersetzt — und er funktioniert. Das ist der Beweis für die Richtung, die der Owner
vorgibt.

#### Das Prinzip

> **Wachstum muss eine fortlaufende Währung sein, die die anderen Pflanzen-Skills lesen — keine Stoppuhr auf zwei
> Schwellen.**

Dann, und nur dann, haben Aussaat, Ranken, Setzlingsbeet und Zäher Halm einen Payoff, der mit jedem weiteren
Pflanzen-Skill wächst. Kein Verstärker-Skill, kein Skill-Zähler, kein Tor — die Kopplung entsteht strukturell, weil
mehrere Skills dieselbe Zahl lesen.

#### Drei Routen (Entscheid Owner)

| # | Route | Wie es aussieht | Einschätzung |
| --- | --- | --- | --- |
| **1** | **Blühend zählt mehrfach.** In allen sechs Score-Skills zählt eine blühende Karte wie N grüne (N je Stufe, z. B. 2/2/3/3). | Blätterdach: „+10 Basis-Score je grüner Karte im Farbblock, blühende zählen dreifach". | Kleinster Eingriff, hält die Sprache der drei Zustände. Heute gibt es das nur als Episch-Extra (`bloomDouble`) — die Leiter wird nur ausgezogen. **Macht die zweite Schwelle zum Ziel aller Score-Skills.** |
| **2** | **Score liest Wachstum statt Karten.** Die Score-Skills zahlen je 10 Wachstum der grünen Karten ihrer Formation statt je Karte. | Blätterdach: „+10 Basis-Score je 10 Wachstum der grünen Karten im Farbblock". | Volle, stufenlose Kopplung — jeder Wachstumspunkt zahlt überall. Dafür wird Grün zur reinen Eintrittskarte, und Jahresringe verliert seine Sonderstellung („ein Begriff je Sache"). |
| **3** | **Wachstum kauft Erkennung.** Die Erkennungs-Skills lesen Wachstum statt Feldanteile — z. B. Überwucherung nicht „ab 80 % grünem Feld", sondern ab einer Wachstumssumme. | Überwucherung: „ab X Wachstum im Segment entstehen grüne Formationen mit einer Karte weniger". | Trifft die einzige Achse, die messbar den Schwanz bewegt (§6.10 Befund 3: die Episch-Spitzen und p95 265M sitzen in der Erkennung). Der größte Umbau der drei. |

#### Eine Warnung zur Erwartung

Routen 1 und 2 vergrößern den **Basis-Score-Kanal**. Der ist gemessen der schwache Kanal der Fraktion: §6.10 E hat
den Passiv-Satz auf das **Vierfache** gedreht und dabei +24 % Median geholt. Wer aus 4,90M die 7,5M der anderen
beiden machen will, braucht ×1,55 — das schafft eine Kanalvergrößerung allein wahrscheinlich nicht.

**Empfehlung: Route 1 als Mechanik, plus die Erkenntnis aus Route 3 als zweiten Schritt.** Route 1 stellt das
Zusammenspiel her, das der Owner will, und ist billig; ob sie für Parität reicht, sagt die Messung. Reicht sie
nicht, ist die Erkennungs-Achse der einzige gemessene Ort, an dem die Fraktion wirklich Boden gutmacht.

---

### 6.19 Route 1 gebaut: blühende Karten zählen mehrfach (2026-09-07, Owner) — Parität erreicht, ein Ziel verfehlt

**Owner:** „ja, route 1 macht Sinn."

In den vier Formations-Score-Skills (Blätterdach, Rankgerüst, Hecke, Windung) zählt eine blühende Karte jetzt wie
**5/5/6/7 grüne** — auf jeder Stufe, nicht mehr nur als Episch-Extra (`bloomDouble` ist durch die Leiter `bloom`
ersetzt). Jahresringe und Blütenlese sind unberührt: der eine liest ohnehin die Wachstumszahl, der andere zahlt
pauschal für eine rein grüne Formation.

#### Gemessen (Duell ohne Legendäre, 200 Läufe, Türen aus allen drei)

| Blüh-Faktor | Pflanze mono | ÷ Feuer | Split |
| --- | --- | --- | --- |
| 1 (vorher) | 4,90M | 0,63× | 6,19M |
| 2/2/2/3 | 5,40M | 0,70× | 6,49M |
| 4/4/5/6 | 6,81M | 0,88× | 7,02M |
| **5/5/6/7** | **7,48M** | **0,97×** | 7,26M |

**Parität ist erreicht:** 7,48M gegen Feuer 7,75M und Blitz 7,43M. Die Siegquote bleibt bei 53,3 % — sie sollte auch,
grün gibt bewusst keinen Kartenwert (§6.1).

#### Was die Route bewirkt hat — und was nicht

**Bewirkt:** die Erkennungs-Achse ist explodiert. In der reinen Pflanze-Welt sprang Spalier von +0,80M (+12 %) auf
+2,71M (+36 %) und Wildwuchs von +0,57M auf +2,01M (+21 %), der gierige Median von 9,15M auf 12,75M. Das ist die
Kopplung, die der Owner wollte: mehr Mitglieder je Lauf heißt jetzt mehr blühende Karten, die mehrfach zählen.

**Nicht bewirkt: die vier Wachstums-Skills sind weiter tot.** Bei 5/5/6/7 messen sie Aussaat ±0, Ranken −0,27M,
Setzlingsbeet −0,83M, Zäher Halm −1,26M — Zäher Halm ist sogar SCHLECHTER geworden als vor der Runde (−0,21M).

**Der Grund, sauber:** Route 1 hängt am **Zustand** blühend, nicht an der **Zahl** Wachstum. Blühend erreicht das
Passiv allein bis Durchlauf ~31 (Sonde §6.10 B); die Wachstums-Skills kaufen also weiterhin nur ein paar Runden
Vorsprung. Und weil ein größerer Blüh-Faktor **alle** Skills hebt, steigen die Opportunitätskosten eines Slots
mit — deshalb wird Zäher Halm relativ schlechter, nicht besser.

**Ein flacher Blüh-Faktor kann die Wachstums-Skills grundsätzlich nicht retten.** Was sie bräuchten, ist der
Halbsatz aus §6.18, den Route 1 nicht enthält: Wachstum muss **über** der Blüh-Schwelle weiterzahlen. Der kleinste
Schritt dorthin, in derselben Form: der Blüh-Faktor einer Karte wächst mit ihrem Wachstum, statt fest zu sein
(z. B. `bloom + floor((Wachstum − 75) / X)`). Dann zahlen Aussaat, Ranken, Setzlingsbeet und Zäher Halm den ganzen
Lauf über, durch jeden Score-Skill.

**Balance-Guard neu zentriert:** Median 2,98M → 3,29M, Mean 4,82M → 5,30M (Zufallsspieler; er hat blühende Karten
selten in Formationen stehen, deshalb der kleine Sprung).

---

### 6.20 Das Blühgewicht gehört der Karte (2026-09-07, Owner-Variante B) — umgesetzt, UNGEMESSEN

**Owner:** „wie kompliziert klingen dann die skills. es soll nicht zu kompliziert werden." → Variante B.
**Prozessregel, ab jetzt verbindlich: erst Planung, gemessen wird nur auf ausdrückliches Go.** (§6.19 wurde gebaut
UND gemessen, nachdem der Owner nur die Route freigegeben hatte — das war zu weit gegriffen.)

#### Was sich ändert

Das Vielfache, mit dem eine blühende Karte in einer Formation zählt, ist keine Eigenschaft des Skills mehr, sondern
**der Karte** — und es wächst mit ihrem Wachstum:

> **Eine blühende Karte zahlt dabei fünffach. Je 40 weitere Wachstumspunkte zahlt sie einmal mehr.**

Die Regel steht **einmal** im Passiv-Text und im Glossar. Der Passiv-Text ist bei der Gelegenheit ganz neu
geschrieben (Owner: kompakt, ohne Gedankenstriche, klar): vier Aussagen in der Reihenfolge, in der der Spieler sie
braucht — wachsen, ergrünen, blühen, wiegen. Die vier Score-Skills verlieren dafür ihre Blüh-Klausel und
sind wieder einzeilig:

| | vor §6.19 | §6.19 (Route 1) | **§6.20 (jetzt)** |
| --- | --- | --- | --- |
| Blätterdach, Normal | „…je grüner Karte darin." | „…je grüner Karte darin; blühende zählen fünffach." | „…je grüner Karte darin." |
| Stufenleiter | score 10/15/20/25 | score + bloom 5/5/6/7 | score 10/15/20/25 |

**Damit ist der Skilltext einfacher als der Stand vor dieser Runde** — die Komplexität sitzt dort, wo der Spieler
ohnehin grau → grün → blühend lernt, und sie gilt überall gleich: `greenWeight(card, growth)` ist die eine Quelle,
die sowohl der Passiv-Kanal (`PLANT_BLOOM_SCORE_PER_GREEN`) als auch die vier Score-Skills lesen.

#### Warum das der fehlende Halbsatz ist

§6.19 hängte am **Zustand** blühend und ließ die vier Wachstums-Skills tot, weil das Passiv die Schwelle ohnehin
erreicht und ein fester Faktor alle Skills gleich hebt. Das Gewicht hängt an der **Zahl**: Wachstum zahlt über der
Blüh-Schwelle weiter, den ganzen Lauf, durch jeden Zähler grüner Karten. Genau das ist die Kopplung aus §6.18 —
Aussaat, Ranken, Setzlingsbeet und Zäher Halm haben jetzt einen Payoff, der mit jedem weiteren Pflanzen-Skill wächst.

#### Startwerte — Vorschlag, ungemessen

`PLANT_BLOOM_WEIGHT` 5 · `PLANT_BLOOM_WEIGHT_PER_GROWTH` 40. Eine Karte liegt am Laufende bei rund 205 Wachstum
(Sonde §6.10 B) → Gewicht 8. Die Parität aus §6.19 stand bei festem Gewicht 5–7; das wachsende Gewicht liegt am
Anfang darunter und am Ende darüber, die Kurve ist also flacher UND steiler zugleich. **Wohin das die Fraktion
trägt, ist offen — die Messung kommt auf Ansage.**

---

### 6.21 Variante B gemessen: überschossen, ein Wachstums-Skill lebt, die Überlappung ist der Motor (2026-09-07)

Alles ohne Legendäre (`SIM_SKILL_LEGENDARY_PER_SLOT=0`), Blühgewicht 5 plus 1 je 40 Wachstum über der Schwelle.

#### A · Duell (200 Läufe, Türen aus allen drei)

| Build | Median | Mean | p90 | Siegquote |
| --- | --- | --- | --- | --- |
| Feuer mono | 7,75M | 10,12M | 18,77M | 65,3 % |
| Blitz mono | 7,43M | 14,84M | 37,35M | 59,4 % |
| **Pflanze mono** | **10,49M** | 16,80M | 28,09M | 53,3 % |
| Split über alle drei | 8,84M | 13,93M | 23,11M | 57,8 % |

**Überschossen: 1,35× Feuer.** Der Weg dahin: 4,90M (festes Gewicht 1) → 7,48M (fest 5/5/6/7, §6.19) → **10,49M**
(5 plus Wachstum). Der Wachstumsterm allein trägt also rund +40 %.

Gierig, Pflanze pur: Median 25,79M (§6.19: 12,75M), p95 294M. Gemischt: Median 31,60M (vorher 21,81M), Siegquote 66 %.

#### B · Die Wachstums-Skills: einer von vier lebt

| Skill | Pflanze pur | gemischt | vorher (§6.17) |
| --- | --- | --- | --- |
| **Aussaat** | **+0,77M (+6 %)** | **+0,98M (+7 %)** | −0,01M / −0,16M |
| Ranken | −0,47M | −1,26M | −0,62M / −3,00M |
| Zäher Halm | −0,76M | −0,87M | −0,21M / −4,81M |
| Setzlingsbeet | −2,40M | −8,78M | −0,74M / −3,80M |

**Aussaat ist erstmals in BEIDEN Welten positiv** — der Mechanismus greift. Die anderen drei nicht: sie geben
Wachstum an Karten, die nicht gewinnen (Ranken an Nachbarn, Zäher Halm bei Niederlagen, Setzlingsbeet als Vorschuss),
und das Blühgewicht zahlt nur auf der Siegkarte und ihren Mitläufern. Aussaat trifft die Nachbarn der SIEGKARTE, also
genau die, die mit ihr in einer Formation stehen.

#### C · Sonde `plant-overlap` — überlappende Formationen (100 Läufe, Pflanze mono)

| Formationen an der Siegposition | Anteil Siege | Ø Pflanzen-Flat | Ø Formations-Mult | Ø Score | **Anteil am Gesamtscore** | blühend |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 6,8 % | 22 | 1,00 | 581 | 0,3 % | 5,5 % |
| 1 | 23,8 % | 82 | 1,26 | 885 | 1,4 % | 3,4 % |
| 2 | 38,4 % | 1.070 | 2,35 | 7.371 | 18,4 % | 42,9 % |
| 3 | 23,1 % | 2.066 | 3,90 | 22.456 | **33,8 %** | 67,7 % |
| **4+** | **8,0 %** | 3.460 | 9,04 | 89.218 | **46,2 %** | 85,3 % |

**8 % der Siege tragen 46 % des Scores, 31 % tragen 80 %.** Vom Ein- zum Vier-Formations-Sieg wächst der Flat ×42,
der Formations-Multiplikator ×7,2 und der Score ×101. Die Kopplung ist bestätigt: dieselbe Überlappung erzeugt die
Flats (einer je Formation) und multipliziert sie danach (Formationsfaktoren mal `OVERLAP_BONUS[4] = ×3`).

**Aber es ist keine Lotterie.** Der größte Stich eines Laufs macht im Median nur **2,7 %** des Lauf-Scores aus
(p90 4,3 %, max 10,0 %). Die Eskalation ist breit, nicht ein Jackpot: viele große Stiche, kein einzelner.

Der größte Stich eines Laufs hat in **73 %** der Läufe vier Formationen, in 25 % drei. Und 85 % der
Vier-Formations-Siege laufen über eine blühende Karte — **das Blühgewicht verstärkt genau die Siege, die ohnehin
die stärksten sind.** Das ist der Grund für den Überschuss aus A.

#### Vorschlag (Entscheid Owner, nichts umgesetzt)

Für Parität muss ×0,73 herunter. Der Wachstumsterm ist das, was Aussaat lebendig gemacht hat — der sollte bleiben,
gekürzt gehört das Grundgewicht:

| Variante | Frisch blühend | Laufende (≈205 Wachstum) | Erwartung |
| --- | --- | --- | --- |
| heute | 5 | 8 | 10,49M (1,35× Feuer) |
| **Grundgewicht 3, Schritt 40** | **3** | **6** | Parität, Wachstumsanteil steigt von ⅜ auf ½ |
| Grundgewicht 2, Schritt 30 | 2 | 6 | noch stärker wachstumsgetrieben, unsicherer |

**Empfehlung: Grundgewicht 3, Schritt 40.**

---

### 6.22 Grundgewicht 3: Parität erreicht, ein Zielkonflikt sichtbar (2026-09-07, Owner) — gemessen

Blühgewicht **3** plus 1 je 40 Wachstum, alles ohne Legendäre.

#### A · Duell (200 Läufe, Türen aus allen drei) — Parität

| Build | Median | Mean | p90 | Siegquote | ÷ Feuer |
| --- | --- | --- | --- | --- | --- |
| Feuer mono | 7,75M | 10,12M | 18,77M | 65,3 % | — |
| Blitz mono | 7,43M | 14,84M | 37,35M | 59,4 % | 0,96× |
| **Pflanze mono** | **8,36M** | 13,57M | 22,61M | 53,3 % | **1,08×** |
| Split über alle drei | 7,81M | 11,94M | 20,09M | 57,8 % | 1,01× |

Die ganze Leiter des Blühgewichts: 1 → 4,90M · fest 5/5/6/7 → 7,48M · **5 plus Wachstum → 10,49M** · **3 plus
Wachstum → 8,36M**. Die Fraktion liegt jetzt zwischen Feuer und Blitz, knapp darüber. Die Siegquote bleibt bei
53,3 %, wie vorgesehen.

#### B · Der Zielkonflikt: Aussaat

| | Grundgewicht 5 | **Grundgewicht 3** |
| --- | --- | --- |
| Aussaat, Pflanze pur | +0,77M (+6 %) | **+0,71M (+4 %)** |
| Aussaat, gemischt | +0,98M (+7 %) | **−1,11M (−4 %)** |
| Pflanze mono im Duell | 10,49M (1,35× Feuer) | **8,36M (1,08×)** |

**Das halbe Gewicht halbiert auch den Payoff fürs Wachstum.** Bei 5 zahlte Aussaat in beiden Welten, bei 3 nur noch
in der reinen. Der Rest der Wachstums-Skills bleibt in beiden Fällen negativ (Ranken −1,73M pur, Setzlingsbeet und
Zäher Halm nahe null bis leicht negativ).

*Vorsicht bei der gemischten Zahl:* der gierige Modus würfelt je Lauf seine eigene Wertetabelle, das kostet laut
§6.12 bis zu Faktor 2 Streuung. Die Duell-Zeilen sind fest verdrahtet und damit belastbar, die eine gemischte
Aussaat-Zeile ist es weniger.

#### C · Überlappung: die Konzentration ist unverändert

| Formationen | Anteil Siege | Ø Flat (3) | Ø Flat (5) | Anteil am Gesamtscore (3) | (5) |
| --- | --- | --- | --- | --- | --- |
| 2 | 38,4 % | 816 | 1.070 | 19,0 % | 18,4 % |
| 3 | 23,1 % | 1.567 | 2.066 | 33,8 % | 33,8 % |
| 4+ | 8,0 % | 2.632 | 3.460 | **45,2 %** | 46,2 % |

**Das Blühgewicht ist nicht der Hebel für die Konzentration.** Die Flats sinken um ein Viertel, die Verteilung bleibt
exakt gleich: 8 % der Siege tragen 45 %, 31 % tragen 79 %. Die Konzentration sitzt im Formations-Multiplikator
(×9,04 bei vier Formationen, inklusive `OVERLAP_BONUS[4] = ×3`) und in der Tatsache, dass es je Formation einen Flat
gibt — nicht darin, wie schwer eine blühende Karte wiegt. Wer die Konzentration ändern will, muss dort ansetzen.

#### Entschieden (Owner, 2026-09-07): Grundgewicht 3 bleibt

Der Kompromisskandidat 4 (Parität grob ×1,2, Aussaat vermutlich in beiden Welten knapp positiv) wird **nicht**
gemessen. Damit ist gesetzt: **die Wachstums-Skills sind Mono-Skills.** Sie zahlen in einem Pflanze-Build, im
gemischten Build kosten sie den Platz — das ist die Signatur einer Bekenntnis-Fraktion und ab jetzt gewollt, kein
offener Befund. Die Parität steht bei 1,08× Feuer.

**Was damit offen bleibt** (kein Auftrag, nur festgehalten): die Überlappungs-Konzentration aus C. Sie ist vom
Blühgewicht unabhängig; wer sie je angehen will, muss an den Formations-Multiplikator oder an „ein Flat je
Formation" heran.

---

### 6.23 Spalier wird sichtbar (2026-09-07, Owner) — umgesetzt

**Owner:** „Spalier muss in der Chronik und Aufstellphase zeigen, welche Segmentgrenzen offen sind."

Spalier öffnete seine Grenzen bisher nur im Motor: die Rechnung lag **inline in `computeFormations`**, die UI kannte
sie nicht. Die Aufstellphase und die Chronik zeigten die ⇕-Brücke nur für das Werkzeug Segmentarbeit (E_SEGMENT),
das über `openSegmentInfo` schon die Regel „eine Quelle für Engine und UI" befolgt.

**Jetzt folgt Spalier derselben Regel.** Zwei neue reine Funktionen in `formations.js`, direkt neben
`openSegmentInfo`:

- `spalierOpenBorders(cards, skills, skillTiers)` — die Grenzen mit den meisten grünen Nachbarn, als Set. Der Motor
  ruft sie auf, statt die Rechnung selbst zu tragen.
- `openBorderInfo(order, deck, skills, skillTiers, familyTiers)` — Werkzeug plus Spalier in einem Objekt, in der
  Form, die `CardGrid` schon erwartet. Das Feld `spalier` bleibt daneben stehen, damit die Anzeige sagen kann,
  **woher** eine Grenze offen ist.

Damit zeichnen Aufstellphase und Chronik die Brücke an genau den Grenzen, die der Motor öffnet — sie kann nicht mehr
davonlaufen. Die Brücke sieht gleich aus (offen ist offen, und ihr Grün ist ohnehin der Pflanzen-Ton); der Tooltip
nennt die Quelle, und die Kopfzeile der Aufstellphase ergänzt „Spalier: n grün gesäumte Grenzen offen".

**Ein Detail, das in der Aufstellphase zählt:** Spalier hängt am Grün-Stand der beiden Nachbarkarten einer Grenze.
Die Anzeige rechnet deshalb bei jedem Tausch neu — der Spieler sieht die Grenze wandern, während er stellt. Genau
dafür ist der Skill da.

Ein Test hält beides zusammen: `spalierOpenBorders` meldet dieselbe Grenze, die der Lauf im Motor überschreitet.

---

### 6.24 Glutbett bekommt einen zweiten Hook (2026-09-07, Owner) — umgesetzt, UNGEMESSEN

**Owner:** „glutbett überarbeiten. skill ist zu schwach. ersten Teil behalten, braucht aber noch einen anderen hook."

#### Warum er zu schwach war

Gemessen im gemischten Lauf: **−0,78M / −4 %**, Flag „schadet", trotzdem in 32 % der gierigen Builds. Drei Gründe:

1. **Rein defensiv.** Der Skill verhindert einen Verlust und gewinnt nie etwas. Und was er schützt, ist billig:
   Hitze zahlt +2 % Score je 10 %, ein Boden bei 40 % ist also höchstens +8 % Score wert — und nur in den Läufen,
   die sonst darunter gefallen wären.
2. **Er dupliziert ein Legendäres.** Ewige Glut hält die Hitze bei 85 % der Spitze, mit einem Boden, der mitwandert.
3. **Er hat keinen Moment.** Man merkt nie, dass er wirkt.

#### Der Hook — und die verworfene erste Fassung

Der erste Vorschlag war „liegt die Hitze auf dem Boden, geben Niederlagen +N % Hitze". **Vom Owner freigegeben, dann
von mir zurückgezogen** — er funktioniert nicht:

- **Er hebt sich selbst auf.** Die Kühlung ist `value = before <= floor ? before : max(floor, before - HEAT_LOSS)`.
  Auf dem Boden gibt die Niederlage +1, die nächste kühlt sofort auf den Boden zurück. Über zwei Niederlagen: null.
- **Den Begriff gibt es schon.** Zunder Episch trägt `lossHeat` („auch Niederlagen heizen") — ein zweiter Skill mit
  derselben Aussage bricht „ein Begriff je Sache".

**Umgesetzt ist stattdessen: nicht die Hitze steigt, sondern der Boden.**

> „Niederlagen kühlen die Hitze nicht unter 40 %. Fängt der Boden eine Niederlage ab, steigt er um 1 %."

Das kann die nächste Niederlage nicht zurücknehmen — der Boden ist ja das, was hält. **„Abfangen" heißt: die Hitze
lag darüber und die Kühlung hätte sie darunter gedrückt.** Liegt sie schon unten, passiert nichts; der Spieler muss
erst wieder hochheizen. Damit läuft der Boden nicht davon (sonst hätte jede Niederlage am Boden ihn gehoben, in
einem Lauf hunderte Male), und der Skill belohnt genau seinen Rhythmus: hochkommen, runtergeschlagen werden, das
Bett wird dicker.

Leiter: Boden 40/60/80 mit Anstieg +1/+2/+3. **Episch bleibt „keine Kühlung"** — dort fängt nie etwas ab, ein
steigender Boden wäre toter Text.

#### Sichtbar

Ein wachsender Boden, den man nicht sieht, wäre derselbe Fehler wie bei Spalier (§6.23). Die Hitzeleiste trägt
deshalb einen Strich an der Bodenhöhe und ein Abzeichen „Glutbett n %"; sobald der Boden über seiner Stufe liegt,
sagt der Tooltip, wie viele Punkte aus abgefangenen Stürzen erarbeitet sind. Der Zustand hängt als `bedFloor` am
Hitze-Substate, `glutbettFloor(heat, skills, skillTiers)` ist die eine Quelle für Motor und Anzeige.

**Startwerte sind Vorschlag und ungemessen** — Messung auf Ansage.

#### Nebenbefund: die Quelltext-Ratsche

Der Kleiner-Vergleich `bedFloor ... scale` und ein Kommentar, der die beiden Vergleichszeichen erklärte, wurden von
der i18n-Ratsche als fest verdrahteter Anzeigetext gemeldet: sie greift alles zwischen einem Größer- und einem
Kleiner-Zeichen. Behoben durch `bedFloor !== scale` (gleichwertig, weil `glutbettFloor` bereits auf die
Leistenlänge klemmt) — **nicht** durch Aufweichen des Wächters (AGENTS.md).

---

### 6.25 Ionisierung: „+1 Wert" heißt Kartenwert (2026-09-07, Owner) — umgesetzt, reine Textänderung

Owner-Frage zum Blitz-Passiv: *„bei ionsierung steht +1 wert. ist damit +1 Stapel gemeint oder +1 kartenwert"*.

#### Befund

Die volle Leiste tut an derselben Karte zwei Dinge, und der Text hatte sie in einen Relativsatz gefaltet
(„… ionisiert die nächste Karte, die dauerhaft +1 Wert erhält"). Gemeint ist der **Kampfwert der Karte**,
dauerhaft eingebacken wie bei der Schmiede — `fillBar` in `factions/lightning.js` schreibt
`value: c.value + ION_VALUE_PER_BAR`.

Die beiden Effekte hängen nicht aneinander, deshalb trägt die Verwechslung weiter als der Satz:
Doppelentladung gibt fünf Stapel, aber trotzdem nur +1 Kartenwert, und Kettenblitz gibt Stapel ganz ohne Wert.
Der Wert kommt ausschließlich aus der vollen Leiste.

#### Umgesetzt

Drei Register-Stellen benennen jetzt beides getrennt: das Passiv (`skill.passive.lightning`), der Leisten-Tooltip
(`bar.lightning.consumes.title`) und der Glossar-Eintrag „Ladung". Wortlaut des Passivs:

> „… ionisiert die nächste Karte in der Reihenfolge: Sie bekommt einen Stapel und dauerhaft +1 Kartenwert;
> jeder Stapel gibt bei Sieg mit ihr +75 Score in die Basis und +0,15× Crit-Multiplikator."

**Kartenwert** ist dabei der Begriff, den das Register schon führt (Perk-Familien und Schmiede-Perk sagen
durchgehend „dauerhaft +1 Kartenwert") — kein neuer Begriff, sondern der vorhandene an einer Stelle, die ihn
verkürzt hatte.

Keine Mechanik, keine Kennwerte, keine Messung. Gates grün, `loc:export` neu.

#### Nachtrag: die Schmiede angeglichen (Owner)

Dieselbe Verkürzung stand an vier Stellen um die Schmiede — Skilltext, Leisten-Tooltip, das Abzeichen auf der
Karte und der Glossar-Eintrag „Schmieden", der ausgerechnet mit „Hitze wird zu dauerhaftem Kartenwert" beginnt
und zwei Sätze später „+3 Wert" sagt. Alle vier sagen jetzt **Kartenwert**.

Nicht angefasst, weil dort ein anderer Begriff steht: die temporären Kampfwert-Boni (Ionenfeld, Blitzfänger,
Glutklinge, Takt, Ewiger Frühling — „kämpfen mit +n Wert") und die Brandmal-Abzüge. Die sind nicht dauerhaft
und nicht der gebackene Kartenwert; das Register trennt beides über „Stichwert / temporärer Wert".

#### Nachtrag 2: die Reste des Textpakets aus §7.26 (Owner)

Das Textpaket hatte „Runde" → „Durchlauf" in `skills.js` gezogen, nicht aber im Register und im Glossar. Drei
Stellen nachgeholt: der Schmiede-Tooltip und der Glossar-Eintrag „Schmieden" (beide „am Rundenende" → „am Ende
eines Durchlaufs", wie der Skilltext daneben), und „Brandmal", das dreimal in Runden rechnete.

**Gegengeprüft, nicht nur umbenannt:** der Brand hält wirklich einen Durchlauf. `newBrandActive` wird im
Durchlauf-Ende-Block von `engine.js` aus `brandPending` getauscht, nicht je Runde; die Kommentare dort sagen
weiter „Runde" und sind Altbestand (`AGENTS.md`: historische Kommentare bleiben).

Stehen gelassen: der Dev-Run-Knopf „Runde überspringen" (`skill.skipCycle`) — Dev-Werkzeug, kein Spielertext —
und die Ranked-Texte, die eine andere Runde meinen.

---

### 6.26 Durchgang durch die Wachstums-Skills (2026-09-09, Owner) — Entwürfe, NICHTS UMGESETZT

**Owner:** „nix Dritter Ausgang. ich entscheide die skills und wir designen die Änderungen." Und zum Vorgehen:
„nur Entwurf, wir machen erst alle skills durch bevor weiter gemeinsam bauen." Dieser Abschnitt sammelt die
Entwürfe je Skill; gebaut wird nichts, bevor der Durchgang steht.

**Der Ausgangsbefund** (§6.21 B, §6.22 B, Blühgewicht 3): von den fünf Wachstums-Skills lebt einer. Aussaat
+0,71M (+4 %) in der reinen Pflanze-Welt, Ranken −1,73M, Setzlingsbeet und Zäher Halm nahe null bis negativ,
Lichtung flach. Der Grund ist bei allen derselbe: **sie geben Wachstum an Karten, die in dem Moment nicht
gewinnen.** Das Blühgewicht zahlt nur auf der Siegkarte und ihren Formations-Mitläufern. Aussaat trifft die
Nachbarn der Siegkarte, also genau die, die mit ihr in einer Formation stehen — deshalb lebt genau der eine.

§6.18 bleibt in Kraft: Wachstum ist die Kernmechanik, ein dritter Ausgang neben Grün-Schwelle und Blühgewicht
wird **nicht** gebaut (Owner: „nix Dritter Ausgang"). Die Entwürfe drehen den Empfänger, nicht die Währung.

#### Ranken (SK_PLANT_09) — die Gegnerdeck-Achse kommt zurück

**Owner:** „ich hätte gerne die Mechanik vom alten pflanzen system wieder aufgelebt. grüne siege ranken in die
Gegnerkarten. Sieg auf einer gegnerkarte beeinflusst von ranken geben zusätzliches Wachstum."

Vorlage ist der gestrichene **Ausläufer** (SK_PLANT_15 alt): „Gewinnt eine grüne Karte, kolonisiert sie die
niedrigste Gegnerkarte. Besiegst du eine kolonisierte Karte, erntest du +2 Wachstum." Die Ernte ging an die
**Siegkarte** — das ist der Teil, der Ranken heilt, aus demselben Grund, aus dem Aussaat als einziger lebt.

Damit ist §6.1 in einem Punkt aufgehoben: das Gegnerdeck war dort Feuers Achse. **Abgrenzung:** Brand senkt
Gegnerwert, Ranken senkt nichts und erntet Wachstum. Gleiche Achse, verschiedene Erträge.

**Bauform (Owner: „a").** Der Sieg rankt in die Karte, die er gerade geschlagen hat — nicht in die niedrigste
freie wie beim alten Ausläufer. Dieselbe Gegnerkarte alterniert damit zwischen ranken und ernten, und der
Kreislauf ist an dem Stich sichtbar, der ihn auslöst.

> Gewinnt eine grüne Karte, rankt sie in die geschlagene Gegnerkarte — oder erntet sie, wenn dort schon Ranken
> liegen: +N Wachstum für die Siegkarte.

**Die Ernte verbraucht die Ranken.** Sonst wiederholt sich der gemessene Fehler der Feuerwalze (§7.27): nach
zehn Durchläufen sind 36 von 40 Positionen schon einmal gewonnen, die Bedingung wird zur Formalität, und der
Skill ist ab der Laufmitte ein bedingungsloses „+N Wachstum je Sieg". Mit Verbrauch bleibt die Knappheit
strukturell statt historisch — und „ernten" heißt sprachlich ohnehin, dass danach nichts mehr da ist.

**Leiter — Vorschlag, UNGEMESSEN** (Startwerte erst auf Ansage, §6.20-Prozessregel):

| Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- |
| +2 Wachstum | +3 | +4 | +6, und beim Ernten ranken die Nachbarn der geernteten Karte mit |

Das Episch-Extra ist das alte **Rhizom** (SK_PLANT_16) als halbe Zeile, statt als Verstärker-Skill mit `enabler`.

**Nebenbefund:** der Fraktions-Kaltstart (die zehn grünen Karten sind grün, sobald die Pflanze steht) lässt den
neuen Ranken ab Durchlauf 1 zünden. Der alte Auslöser „wird eine Karte grün" hätte umgekehrt gelitten — der
Kaltstart-Pfad im Reducer läuft an der Ranken-Kette vorbei, die zehn Karten hätten sie nicht ausgelöst.

**Umfang, wenn gebaut wird:** ein Lauf-Zustand für die Marker auf Gegnerkarten (analog `brandActive`, über
`card.id`) in `engine.js`/`reducer.js`, die Logik in `factions/plant.js`, Tabelle und Text in `skills.js`, dazu
Glossar, `de.js`, `loc:export`. Das neue Schlüsselwort braucht einen Glossareintrag.

**Offen (Owner):** ob die Ranken auf der Gegnerkarte sichtbar sind. Der Brand hat dafür eine Anzeige; ohne sie
ist der Kreislauf für den Spieler unsichtbar.

#### Setzlingsbeet (SK_PLANT_07) — das Beet ist ein Ort, kein Zeitpunkt

**Owner: „a"** — Mechanik ersetzen, Name und Platz bleiben.

Zwei Befunde, nicht einer. **Die Rolle ist doppelt besetzt:** Setzlingsbeet war laut §6.3 der Kaltstart-Skill;
seit dem 2026-09-08 hat die Fraktion einen eingebauten Kaltstart, und der ist stärker — er hebt zehn Karten auf
die Grün-Schwelle, während der Skill acht Karten auf 8–16 von 30 hebt, also keine davon grün macht. **Und der
Empfänger ist systematisch der falsche:** die niedrigste Karte je Segment ist die, die am seltensten gewinnt.
Das erklärt, warum er mit −2,40M pur / −8,78M gemischt (§6.21) tiefer liegt als Ranken und Zäher Halm.

> **Dein Beet ist das Segment mit den meisten grünen Karten. Seine Karten wachsen jeden Durchlauf +N.**

Ein Segment ist die Einheit, in der Formationen entstehen (`SEGMENT_SIZE` 5) — die fünf Karten wachsen also als
Gruppe, die zusammen in Formationen steht und als Mitläufer zählt. Das ist der einzige Ausgang, den Wachstum auf
einer Nicht-Siegkarte hat. Das Beet zieht dorthin, wo schon grün ist, und koppelt damit an Spalier, Blütenlese
und die Score-Skills. Der Skill lebt den ganzen Lauf statt nur im Moment des Picks.

**Leiter — Vorschlag, UNGEMESSEN** (Owner: „vllt einen kleinen buff", darum eine Stufe über dem Erstentwurf
1/2/3/3; Episch nach Owner-Ansage „es wirkt schon auf jedes segment", Werte unverändert):

| Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- |
| +2 | +3 | +4 | +4, auf **jedem** Segment |

Das Episch folgt damit dem Muster der Fraktion — Spalier öffnet auf Episch alle sieben Grenzen, Wildwuchs zählt
alle blühenden Karten. **Wachpunkt:** dort sitzt der Sprung auf der Erkennung, hier auf einer Wachstumsrate, und
die Breite springt von 5 auf 40 Karten. Übersteuert nach dem Umbau etwas, ist der Episch-Satz der erste Regler —
nicht die Breite, die ist die Entscheidung.

#### Lichtung (SK_PLANT_12) — bleibt, kleiner Buff

**Owner: „setzlingsbeet und Lichtung ist gut, vllt einen kleinen buff."**

Lichtung ist der einzige Wachstums-Skill, der direkt auf die Siegkarte zahlt und an Formationen hängt — er ist
mechanisch richtig gebaut und misst deshalb flach statt tot (+0,71M gemischt / −0,00M pur, §6.17; die Zahl ist
von vor dem Blühgewicht und damit veraltet). Kein Umbau, nur die Leiter.

| | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| heute | +1 | +2 | +3 | +3 je Formation an der Siegposition |
| **Vorschlag** | **+2** | **+3** | **+4** | **+4 je Formation** |

#### Zäher Halm (SK_PLANT_08) — Richtung gesetzt, Episch offen

**Owner: „zäher Halm die limitation von grau aufheben, episch was anderes designen, erst vorlegen."**

Die Beschränkung auf graue Karten fällt: **jede** Karte wächst bei einer Niederlage. Damit ist das heutige
Episch-Extra („auch grüne Karten wachsen +1") verbraucht und wird ersetzt; die Leiter wird 1/2/3/4 statt
1/2/3/3.

**Episch (Owner: „1a"):**

> Verliert eine Karte, wächst sie zusätzlich **+1 je Formation an ihrer Position**.

Das nimmt die Größe, die das Passiv beim Sieg schon benutzt (`PLANT_GROWTH_PER_FORMATION`), und trifft die
Formationsachse — laut §6.3 der stärkste Hebel der Fraktion und der einzige Ausgang, über den Wachstum auf einer
nicht-siegenden Karte überhaupt zahlt. Kein neuer Begriff, keine neue Zahl. Verworfen: „blühende Karten wachsen
doppelt" (zu nah an Jahresringe Episch, §7.26 B) und „zweimal in Folge verloren" (bester Charakter, aber ein
neuer Zähler je Karte und die Fraktion hat sonst keine Serien-Achse).

**Zum Auslöser, gegen die naheliegende Sorge:** Niederlage-Bedingungen sind bei Feuer und Blitz zweimal
gestorben (§7.22, §7.24), weil dort die Siegquote über den Lauf steigt und die Niederlage verschwindet. Die
Pflanze gibt bewusst keinen Kartenwert (§6.1) und liegt über alle Balance-Runden hinweg unverändert bei
**53,3 % Siegquote** — fast jeder zweite Stich ist eine Niederlage. Ob die Quote *innerhalb* eines Laufs steigt,
ist nicht gemessen; der Lauf-Durchschnitt spricht dagegen, dass der Auslöser wegbricht.

#### Aussaat (SK_PLANT_05) — bleibt, kleinster Buff

**Owner: „Aussaat passt, eventuell kleiner buff."**

Der einzige Wachstums-Skill, der schon zahlt (+0,71M / +4 % in der reinen Pflanze-Welt, §6.22), weil er als
einziger die Nachbarn der **Siegkarte** trifft — also die Karten, die mit ihr in einer Formation stehen. Er ist
die Blaupause für den ganzen Durchgang und braucht deshalb den kleinsten Schub. Der Satz zählt zudem doppelt: er
geht an beide Nachbarn.

| | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| heute | +1 | +2 | +3 | +4, zweite Nachbarn +1 |
| **Vorschlag** | **+2** | **+3** | **+4** | **+5**, zweite Nachbarn +1 (unverändert) |

#### Nicht angefasst (Owner: „alle so lassen")

Drei Skills geben oder lesen Wachstum nebenbei und bleiben **unverändert**: Lücke (Episch +2 auf die
übersprungenen Karten), Blütenlese (+1, Episch +2 auf alle Karten der rein grünen Formation) und Jahresringe,
der als einziger Wachstum *liest* statt gibt — und der beste Skill der Fraktion ist (§6.18).

#### Die übrigen zehn: zwei Reworks, ein Buff, ein Nerf

**Owner, nach dem Blick auf die Liste:** „Lücke und überwucherung rework, hecke buffen und Jahresringe etwas
nerfen (vor allem da wir Wachstums Optionen gerade buffen)." Spalier, Wildwuchs, Blätterdach, Rankgerüst, Windung
und Blütenlese bleiben unangetastet, ebenso die drei Legendären (seit §6.15 auf einem Band).

**Zwei Befunde steuern die Reworks.**

*Die Pflanze kann strukturell nur einen der vier Formationstypen selbst erzeugen.* Grün ist eine Farbe, also baut
sie Farbblöcke; Treppe, Wiederholung und Wechsel brauchen Wertmuster, und Kartenwerte fasst die Fraktion bewusst
nicht an (§6.1). Rankgerüst, Hecke und Windung warten deshalb darauf, dass die Aufstellung zufällig passt — der
einzige Gegenhebel ist Wildwuchs.

*Und ausgerechnet auf dem Farbblock ist der Faktor für Grün eingefroren.* `escalatingFactor` gibt jedem Lauf
`FARBBLOCK_BASE 1,35 + ESKALATION_STEP 0,20` je Karte über der Mindestlänge; für grüne Karten deckelt
`PLANT_GREEN_FARBBLOCK_CAP` die Ordinalzahl bei 3. Ein grüner Farbblock steht damit **immer bei ×1,35**, ob er
drei Karten lang ist oder vierzig (ohne Deckel wären es ×2,75 bei zehn, ×8,75 bei vierzig). Der Deckel kam in v0.3
gegen den Runaway; §6.2 hat die Frage ausdrücklich offen gelassen („Owner: warten").

##### Dickicht ersetzt Lücke (SK_PLANT_15)

Lücke wurde nicht einmal genommen (4 % gehalten, −0,19M / −2,02M). Der Grund ist ein enges Fenster: bei wenig Grün
gibt es keine Läufe zu retten, bei viel Grün sind die Lücken schon grün. Sie repariert Löcher, statt Raum zu
schaffen — der Unterschied zu Spalier (+36 %). Der Platz behält seine Achse: Lücke arbeitete auf dem Farbblock
(`suitGapFor`), Dickicht tut es auch.

> **Grüne Farbblöcke zählen bis ×1,55 statt ×1,35.**

| Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- |
| bis ×1,55 | bis ×1,75 | bis ×1,95 | bis ×2,35 |

Der Text nennt nur die Zahl, die sich ändert (Hausmuster wie Eiswall) — dass ein längerer Lauf mehr Faktor gibt,
erklärt die Formations-Legende dem Spieler ohnehin. **Wachpunkt:** das war der Runaway-Schutz; der Deckel wird
gehoben, nicht aufgehoben. „Unbegrenzt" auf Episch ist der Kandidat zum Sprengen und wartet auf die Messung.

##### Verwachsung ersetzt Überwucherung (SK_PLANT_14)

Bei Überwucherung liegt das Tor hinter dem Ziel: „ab 80 % grünem Feld" sind 32 von 40 Karten — wer so weit ist,
bekommt Formationen ohnehin geschenkt. Der Skill schaltet ein, wenn man ihn nicht mehr braucht (−0,05M / −0,23M).

An seine Stelle tritt der Griff auf `OVERLAP_BONUS` (`2 ×1,5 · 3 ×2 · 4 ×3`) — den gemessenen Motor der Fraktion
(§6.21 C: 8 % der Siege tragen 45 % des Scores). Kein neuer Multiplikator, sondern der Formations-Faktor, den
§6.1 erlaubt.

> **Mehrere Formationen an deiner Siegposition: ihr Überlappungsbonus ist um 0,25 höher.**

| Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- |
| +0,25 | +0,5 | +0,75 | +1 |

**Bewusst absolut statt prozentual:** der Zwei-Formations-Sieg gewinnt am meisten (×1,5 → ×1,75 ist +17 %, ×3 →
×3,25 nur +8 %), und dort liegen 38 % der Siege. §6.22 hat die Konzentration genau im Überlappungs-Multiplikator
verortet; ein prozentualer Aufschlag würde die Spitze weiter aufblasen, der absolute verbreitert die Basis.

##### Hecke +33 %, Jahresringe −33 %

**Hecke** (SK_PLANT_10) teilt sich die Leiter mit Rankgerüst (30/45/60/80), weil §6.8 nach Formationslänge
staffelt — Treppe und Wiederholung sind beide drei bis fünf Karten lang. Gemessen entstehen grüne Wiederholungen
aber seltener als Treppen, und der Unterschied ging voll auf die Hecke (−0,40M gegen +0,05M). Neue Leiter
**40 / 60 / 80 / 105** (≈ 1,33× Rankgerüst). Die saubere Zahl käme aus einer Sonde, die zählt, wie oft eine grüne
Wiederholung gegen eine grüne Treppe entsteht; bis dahin ist 1,33× ein bewusst konservativer Schritt.

**Jahresringe** (SK_PLANT_04) liest Wachstum direkt und wird deshalb von jedem der fünf Wachstums-Buffs
mitgehoben, ohne angefasst zu werden — er ist schon heute der beste Skill der Fraktion (+17 %). Der Teiler wird
gröber, die Sätze bleiben: **je 15 Wachstum** statt je 10 (−33 %). Das trifft genau die Kopplung, die dieser
Durchgang verstärkt, und lässt das Episch („über der Blüh-Schwelle zählt doppelt") unberührt.

##### Was sich strukturell verschiebt

Die Kategorie „Formationshebel (4)" aus §6.6 gibt es so nicht mehr: Spalier und Wildwuchs bleiben Erkennungs-
hebel, Dickicht und Verwachsung sind **Formations-Faktor-Skills**. Damit bekommt die Fraktion erstmals eine
Multiplikator-Achse auf der Ebene der 15 — genau der Mangel, den §6.17 C gemessen und benannt hat („Feuer hat
einen Multiplikator, Blitz hat Crit … §6.15 hat der Fraktion beides gegeben, aber nur im Legendären").

**Emblem-Umbenennung** (`git mv`, der ID-Präfix ist, was `skillArt.js` liest):
`SK_PLANT_15_luecke.webp` → `…_dickicht.webp`, `SK_PLANT_14_ueberwucherung.webp` → `…_verwachsung.webp`.

**Anzeige-Notiz:** die Formations-Legende (`formlegend.overlap`) zeigt die Zahlen aus `OVERLAP_BONUS`. Ändert
Verwachsung sie, muss die Legende mitrechnen — sonst läuft die Anzeige dem Motor davon, genau der Fehler, den
§6.23 bei Spalier behoben hat.

#### Der Durchgang auf einer Seite

Alle 15 Skills sind durchgesprochen. **Nichts davon ist gebaut, alle Werte sind ungemessen.**

| Skill | Was passiert | Leiter |
| --- | --- | --- |
| **Ranken** (09) | Rework: rankt in die geschlagene Gegnerkarte, Ernte gibt der Siegkarte Wachstum und verbraucht die Ranken | 2 / 3 / 4 / 6 + Nachbarn beim Ernten |
| **Setzlingsbeet** (07) | Rework: das grünste Segment wächst jeden Durchlauf | 2 / 3 / 4 / 4 auf jedem Segment |
| **Aussaat** (05) | Leiter | 2 / 3 / 4 / 5 |
| **Lichtung** (12) | Leiter | 2 / 3 / 4 / 4 je Formation |
| **Zäher Halm** (08) | Grau-Limit raus, neues Episch | 1 / 2 / 3 / 4 + je Formation |
| **Dickicht** (15) | ersetzt Lücke: hebt den Grün-Farbblock-Deckel | ×1,55 / 1,75 / 1,95 / 2,35 |
| **Verwachsung** (14) | ersetzt Überwucherung: hebt den Überlappungsbonus | +0,25 / 0,5 / 0,75 / 1 |
| **Hecke** (10) | Buff gegen die seltenere Formation | 40 / 60 / 80 / 105 |
| **Jahresringe** (04) | Nerf: gröberer Teiler | je 15 Wachstum statt je 10 |
| Spalier · Wildwuchs · Blätterdach · Rankgerüst · Windung · Blütenlese | unverändert | — |
| Wurzelgeflecht · Baumreihe · Ewiger Frühling | unverändert (§6.15) | — |

#### Wachpunkt für den Schluss des Durchgangs

Die Parität steht bei **1,08× Feuer** (§6.22). Dieser Durchgang bufft mehrere Skills gleichzeitig; die Summe ist
nicht die Summe der Einzelmessungen. Nach dem Umbau gehört eine Duell-Runde gefahren — **auf Ansage des Owners**,
nicht nebenbei.

---

### 6.27 Baseline vor dem Umbau: der Kaltstart war ein +12-%-Buff (2026-09-09, auf Ansage) — gemessen, nichts geändert

**Owner: „jetzt messen wir."** Gemessen wurde der **heutige Stand** — aus §6.26 ist keine Zeile gebaut. Der Zweck
ist das fehlende Vorher: die letzte gültige Referenz (§6.22, 1,08× Feuer) stammt vom 2026-09-07 und liegt damit
**vor** dem Fraktions-Kaltstart (2026-09-08) und vor dem Eis-Umbau (§5.18–§5.23).

Beides ohne Legendäre, 200 Läufe, Seeds 1–200:
`SIM_SKILL_LEGENDARY_PER_SLOT=0 npm run sim -- --mode duel --arch … --runs 200`

#### A · Gleicher Topf wie §6.22 (Feuer/Blitz/Pflanze) — der saubere Vergleich

| Build | §6.22 (07.09.) | jetzt (09.09.) | Δ |
| --- | --- | --- | --- |
| Feuer mono | 7,75M | 7,87M | +1,6 % |
| Blitz mono | 7,43M | 7,34M | −1,2 % |
| **Pflanze mono** | **8,36M** | **9,39M** | **+12,3 %** |
| Split über alle drei | 7,81M | 8,66M | +10,9 % |
| Siegquote Pflanze | 53,3 % | 52,9 % | unverändert |

**Feuer und Blitz reproduzieren auf ±1,6 %** — die Messung ist belastbar, und der Sprung der Pflanze ist echt.
Er kommt vom **Kaltstart**: die zehn grünen Karten sind ab dem ersten Pflanzen-Pick grün, also zünden Spalier,
Blütenlese, die Score-Skills und das Blühgewicht ab Durchlauf 1 statt ab Durchlauf 10–16. Die Siegquote bleibt
unbewegt — grün gibt weiter keinen Kartenwert (§6.1), der Gewinn sitzt ganz im Score.

**Pflanze ÷ Feuer: 1,08× → 1,19×.** Der Kaltstart wurde am 08.09. ohne Messung eingebaut; das ist hiermit
nachgeholt.

#### B · Die echte Welt (alle vier Fraktionen im Angebotstopf)

`SKILL_OFFER_ARCHETYPES` enthält seit §5.4 alle vier — das ist der Topf, in dem wirklich gespielt wird:

| Build | Median | Siegquote | Ø eigene Skills |
| --- | --- | --- | --- |
| Feuer mono | 7,15M | 66,6 % | 9,4 |
| Blitz mono | 5,65M | 59,2 % | 9,6 |
| **Pflanze mono** | **9,01M** | 55,1 % | 9,5 |
| Eis mono | 7,37M | 57,7 % | 9,8 |
| Split über alle vier | 5,69M | 57,2 % | je ~3,3 |

**Pflanze ÷ Feuer: 1,26×.** Ein Nebenbefund, der für jede künftige Messung gilt: im Vier-Fraktionen-Topf bekommt
ein Mono-Build rund **zwei Skills weniger** (9,5 statt 11,3), weil die Türen breiter streuen. Das trifft die
Fraktionen ungleich — Blitz verliert 23 %, die Pflanze nur 4 %. Wer §6.22-Zahlen gegen Vier-Fraktionen-Zahlen
hält, vergleicht zwei Welten.

#### Was daraus für §6.26 folgt

Der Durchgang bufft an sieben Stellen und nerft an einer — und die Fraktion liegt **vor** dem ersten Handgriff
schon 19 bis 26 % über Feuer. Gebaut wie entworfen, steuert sie deutlich über.

**Empfehlung: trotzdem bauen wie entworfen, danach mit dem Blühgewicht tarieren.** Der Grund steht in §6.21/§6.22:
`PLANT_BLOOM_WEIGHT` ist der eine Regler, der die ganze Fraktion skaliert (5 → 3 brachte 10,49M → 8,36M, also
×0,80). Die Einzelentwürfe sind auf ihre **Rolle** designt, nicht auf ihre Größe; sie nachträglich einzeln zu
drücken, verwässert das Design und ist nicht messbar. Ein Regler ist es.

---

### 6.28 Der Durchgang ist gebaut und gemessen: +21 %, und der Regler reicht nicht (2026-09-09, Owner) — gemessen

**Owner: „ja Bau, und eventuell über blühend etwas runter tarieren."** Alle fünf Etappen aus §6.26 stehen im Code,
jede mit grünen Gates gepusht. Danach dieselbe Messung wie §6.27 (Duell, 200 Läufe, ohne Legendäre, alle vier
Fraktionen im Topf).

#### A · Was der Durchgang bringt

| Build | vor §6.26 (§6.27 B) | nach §6.26 | Δ |
| --- | --- | --- | --- |
| Feuer mono | 7.149.056 | 7.149.056 | **bit-identisch** |
| Blitz mono | 5.646.630 | 5.646.630 | **bit-identisch** |
| Eis mono | 7.371.566 | 7.371.566 | **bit-identisch** |
| **Pflanze mono** | 9,01M | **10,88M** | **+21 %** |
| Siegquote Pflanze | 55,1 % | 55,3 % | unverändert |

Die drei anderen Fraktionen reproduzieren auf die Stelle genau — der Umbau ist sauber isoliert, und der Zuwachs
der Pflanze ist echt. Die Siegquote bleibt liegen, wie vorgesehen: die Fraktion gibt weiter keinen Kartenwert.

**Pflanze ÷ Feuer: 1,26× → 1,52×.**

#### B · Der Sweep über das Blühgewicht — er reicht nicht

| Grundgewicht | je … Wachstum +1 | Median | ÷ Feuer |
| --- | --- | --- | --- |
| 3 (heute) | 40 (heute) | 10,88M | 1,52× |
| 2 | 40 | 9,72M | 1,36× |
| 1 | 40 | 8,59M | 1,20× |
| 3 | 80 | 9,22M | 1,29× |
| 2 | 80 | 8,01M | 1,12× |
| 2 | 120 | 7,58M | 1,06× |

**Das Grundgewicht allein kommt nicht hin:** selbst bei 1 — eine frisch blühende Karte zählt dann wie eine grüne,
der Blüh-Bonus ist weg — steht die Fraktion bei 1,20×. Parität verlangt zusätzlich einen Schritt von 40 auf grob
120–150, und **genau das entkernt den Wachstumsterm**, der in §6.20/§6.21 gebaut wurde, um die Wachstums-Skills
überhaupt zu bezahlen: bei 205 Wachstum am Laufende fällt das Gewicht von 6 auf 3.

#### C · Eine Vermutung, gemessen und widerlegt

Die naheliegende Erklärung war, dass die zwei neuen Faktor-Skills den Überschuss tragen — Verwachsung Episch hebt
`OVERLAP_BONUS[2]` von ×1,5 auf ×2,5, also **+67 %** und nicht die +17 %, die §6.26 für die Normalstufe nennt.
Gemessen stimmt das nicht:

| Lauf | Median | Anteil |
| --- | --- | --- |
| voll | 10,88M | — |
| Verwachsung neutralisiert | 10,49M | −3,6 % |
| Dickicht neutralisiert | 10,40M | −4,4 % |

**Zusammen tragen die beiden neuen Skills rund 8 %.** Der Überschuss sitzt breit im Rest des Durchgangs — den vier
gehobenen Leitern, dem Setzlingsbeet als Dauerquelle, dem Ranken-Kreislauf und dem Zähen Halm. Damit ist das
Blühgewicht tatsächlich der richtige Regler (er skaliert alles gleichmäßig), nur eben kein hinreichender.

#### Offen (Entscheid Owner)

Zwei Wege, und sie schließen einander nicht aus:

1. **Über das Blühgewicht tarieren** (Gewicht 2, Schritt 120–150). Trifft Parität, kostet aber die Steigung, die
   das Wachstum über der Blüh-Schwelle überhaupt bezahlt — also die Kopplung aus §6.18, für die dieser Durchgang
   gebaut wurde.
2. **Den Durchgang selbst kleiner machen** — die vier gehobenen Leitern (Aussaat, Lichtung, Hecke, Setzlingsbeet)
   ganz oder teilweise zurücknehmen. Trifft die Ursache, lässt das Passiv in Ruhe, macht aber die Buffs rückgängig,
   die diese Runde beschlossen hat.

Ob Parität überhaupt das Ziel ist, ist ebenfalls offen: §6.22 hat die Pflanze bewusst als Bekenntnis-Fraktion
gesetzt, ihre Siegquote liegt zwölf Punkte unter Feuer, und im gemischten Split trägt sie sich mit 6,03M.

---

### 5.28 Eis als System: der Boden wird Motor (2026-09-09) — gebaut, gemessen, Ziel NICHT erreicht

**Owner:** „dann lass uns bei Eis ansetzen. wie reparieren wir das System?" — und nach dem Vorschlag: „sonde und dann c,
das klingt gut. eventuell auch einen anderer schwellen Trigger und wenn sich masse verteil brechen viele klein oder
einer sammelt an und bricht stark."

#### A · Diagnose, und eine Korrektur an meiner eigenen

§8.3 hat gemessen, dass jede Kombination mit Eis halbiert wird. Meine erste Erklärung („die Dichte-Multiplikatoren
brechen zusammen") ist **falsch**. Die reine Formel, auf synthetischen Brettern durchgerechnet (alle Gletscher auf
Berst-Schwelle, ohne Skills):

| Gletscher | dicht | je Gletscher | verstreut | je Gletscher |
| --- | --- | --- | --- | --- |
| 1 | 792 | 792 | 792 | 792 |
| 4 | 6 435 | 1 609 | 3 168 | 792 |
| 12 | 23 141 | 1 928 | 9 504 | 792 |

Die ganze Dichte-Maschine (Kaskade, Kollision, Geometrie) bringt **×2,4**. Die restlichen **×12** sind schlicht
zwölfmal so viele Brüche. **Eis ist die einzige Fraktion, deren Motor-GRÖSSE an der Pick-Zahl hängt** — Feuer, Blitz
und Pflanze haben einen Motor, der pro Stich ohnehin läuft, und ihre Skills schrauben nur daran.

Gemessene Gletscherzahlen je Build (Fraktions-Policy, 30 Läufe): Eis mono **12,9** · Paar **6,9–7,5** ·
Tripel **4,7** · Vierer **4,1**.

#### B · Ein Fehler im ZUG, unabhängig von der Balance

`firnDrawTick` gab die Reserve jedes offenen Feldes an den **nächsten** Gletscher. Im dichten Cluster ist kein Feld je
zu einem INNEREN Gletscher am nächsten — bei zwölf im 3×3-Block bekamen sechs gar nichts, während ein Randgletscher
19 von 28 Punkten zog. Jetzt teilt jedes Feld anteilig auf alle, Gewicht 1/Abstand: der nächste bekommt am meisten,
keiner geht leer aus. Zweite Hälfte desselben Fehlers: die Reserve UNTER einem Gletscher floss nicht mehr ab, sobald
der Rundenstart-Nachschub sie nicht abrief — sie fließt jetzt in ihn selbst.

#### C · Gebaut

- **`FIRN_GROUND` 0,35** — jedes offene Feld friert je Durchlauf so viel Reserve an (Fraktions-Passiv, zweite Hälfte).
  Das Brett stellt (40 − Gletscher) Quellen und ist damit fast unabhängig von der Pick-Zahl.
- **ZUG anteilig** statt „der Nächste nimmt alles"; Reserve unter Eis fließt in den eigenen Gletscher.
- **`BURST_SCALE` 30 → 24**, damit Mono steht bleibt.

#### D · Gemessen — und das Ziel ist verfehlt

Gletscherzahl künstlich gedeckelt (`SIM_GLACIER_MAX`), Regler in beiden Spalten 30, damit nur das Einkommen wirkt:

| Deckel | Gletscher-Score, Boden 0 | Boden 0,35 | Faktor | Ø Masse je Gletscher (Boden 0) |
| --- | --- | --- | --- | --- |
| 3 | 1,53M | 1,93M | **×1,26** | **17,6** |
| 12 | 4,95M | 7,19M | **×1,45** | **11,3** |

**Das Boden-Einkommen hilft zwölf Gletschern MEHR als dreien** — die Kurve wird steiler, nicht flacher. Der Grund
steht in der letzten Spalte: **die Stufenleiter endet bei 18.** Ein Drei-Gletscher-Build sitzt mit 17,6 Masse schon an
der obersten Sprosse, dort wandelt zusätzliche Masse nur noch linear (`effMass` × 3,2). Ein Zwölfer sitzt mit 11,3
UNTER der Berst-Schwelle — dort schiebt dieselbe Masse ihn über die Schwelle und zahlt doppelt.

Auch der Deckel auf der liegenbleibenden Masse ist nicht der Hebel (`SIM_GLACIER_KEEP_MAX`, Boden 0,35, Regler 30;
Anteil 3 ÷ 12 am Gletscher-Score): KEEP 6 → **0,27** · KEEP 18 → **0,30** · KEEP 40 → **0,34**. Er hebt beide Seiten
um rund das Doppelte und verschiebt die Form kaum.

Endstand mit Regler 24 (60 Läufe, Seeds 1–60, Median): Eis mono 7,28M (vorher 7,12M, **+2 %**) · Fe+Ei 7,09M
(vorher 6,44M, **+10 %**) · Fe+Bl+Ei 6,46M (vorher 6,81M, **−5 %**). Mono steht, das Paar gewinnt durch den
reparierten ZUG, die Ansteckung bleibt.

**Warum meine Sonde (`sim/probes/eis-kurve.mjs`) das Gegenteil vorhersagte:** sie startet Gletscher bei Masse 0 und
lässt sie wachsen. Im echten Lauf sitzt ein Build mit wenigen Gletschern längst über der obersten Sprosse. Die Sonde
misst die Masse-Ökonomie richtig und die Umwandlung falsch. Sie bleibt nützlich für die Verteilungsfrage (B), nicht
für die Höhe.

#### E · Was jetzt fehlt — die Idee des Owners ist die Lösung, nicht die Kür

„Einer sammelt an und bricht stark" ist heute **nicht baubar**: der Bruch feuert bei 12, und über 18 zahlt die Leiter
nicht mehr. Damit ist Masse für einen kleinen Eis-Anteil eine lineare Währung, und die ZAHL der Gletscher bleibt der
beherrschende Term. Offen zur Entscheidung:

1. **Leiter nach oben öffnen** — weitere Sprossen über 18, dicht genug, dass angesammelte Masse sie erreicht.
2. **Trigger, der Halten erlaubt** — Bruch erst an einer hohen Schwelle, oder im Takt statt jeden Durchlauf.
3. **Als Skill statt als Regel** — die Abbruchkante („belohnt hohe Stufen noch steiler") misst 99 % Haltequote bei
   +4 % Wirkung und ist der offensichtliche Träger dieser Fantasie.

---

### 5.29 Die Stufenleiter wird geöffnet (2026-09-09) — gebaut und gemessen

**Owner:** „1." (von den drei Wegen aus §5.28 E) — „und dann schauen wir uns alle skills an die davon profitieren
müssen und designen wie."

§5.28 D hatte die Ursache benannt: die Leiter endete bei 18. Ein Drei-Gletscher-Build sitzt mit Ø 17,6 Masse schon an
der obersten Sprosse und wandelt jede weitere Masse nur noch linear; ein Zwölfer sitzt mit 11,3 unter der
Berst-Schwelle, wo dieselbe Masse doppelt zahlt. Deshalb half das Boden-Einkommen den vielen mehr als den wenigen.

#### A · Gebaut

| | vorher | jetzt |
| --- | --- | --- |
| `THRESHOLDS` | 4 / 8 / 12 / 18 | **4 / 8 / 12 / 18 / 27 / 40 / 60** |
| `TIER_MULT` | 0 / 1 / 1,5 / 2,2 / 3,2 | **0 / 1 / 1,5 / 2,2 / 3,2 / 4,6 / 6,7 / 9,7** |
| `FIRN_GROUND` | 0,35 | **0,6** |
| `BURST_SCALE` | 24 | **20** |

Die Fortsetzung hält den Rhythmus der bestehenden Leiter: Schwellen ×1,5, Wucht ×1,45 je Sprosse. Die Berst-Schwelle
bleibt bei 12 — wer sie überschießt, landet auf der Sprosse, die sein Einkommen hergibt.

**Ein Fund beim Bauen:** die Abbruchkante überschreibt die Stufen 2–4 mit einem eigenen fünfstelligen Array
(`abbruchTierMult`). Ohne Nacharbeit hätte `tierMult[5]` `undefined` in den Bruch gereicht, sobald der Skill liegt.
Die Sprossen über der vierten erben jetzt denselben relativen Zuschlag; ein Wächter hält die volle Länge fest.

#### B · Gemessen

Anteil eines Drei-Gletscher-Builds am Zwölfer, **am reinen Gletscher-Score** (`SIM_GLACIER_MAX`, 40 Läufe):

| | Boden 0,35 | 0,6 | 1,0 | 1,6 |
| --- | --- | --- | --- | --- |
| Leiter bis 18 | 0,27 | — | — | — |
| **Leiter offen** | **0,38** | **0,59** | **0,68** | **0,74** |

Ab 1,0 bläht sich der ganze Motor auf (Mono +47 %), ohne die Form noch viel zu verbessern — deshalb 0,6.

Build-Ebene (Cross, 400 Läufe je Build, Seeds 1–400), **Eis-Ansteckung = Kombi mit Eis ÷ dieselbe ohne**:

| | §8 (Ausgangslage) | §5.28 | **§5.29** |
| --- | --- | --- | --- |
| Fe+Bl → Fe+Bl+Ei | 0,43× | 0,43× | **0,49×** |
| Fe+Pf → Fe+Ei+Pf | 0,50× | 0,50× | **0,55×** |
| Bl+Pf → Bl+Ei+Pf | 0,52× | 0,54× | **0,59×** |
| Fe+Bl+Pf → Vierer | 0,63× | 0,64× | **0,67×** |

Eis mono 6,73M → **7,14M (+6 %)**; die Fraktion ist damit nicht mehr die schwächste (Feuer 7,31M). Fe+Ei 5,65 →
6,62M · Bl+Ei 6,01 → 7,16M · Fe+Bl+Ei 6,49 → 7,53M. Balance-Guard Seeds 1–40: Median 3,79M, Mean 8,35M
(Seeds 1–200: 3,98M / 8,41M) — Median-Band neu zentriert, Mean-Band unverändert.

#### C · Was bleibt

Die Ansteckung ist von 0,43–0,63× auf 0,49–0,67× gestiegen — die Richtung stimmt, gesund wäre ≈ 1,0. Der Rest ist
**keine Motor-Frage mehr, sondern eine Skill-Frage**: ein Misch-Build hat 4,3 Eis-Slots, und die müssen so viel wert
sein wie 4,3 Feuer- oder Pflanze-Slots. Genau das ist der nächste Schritt (Owner: „dann schauen wir uns alle skills an
die davon profitieren müssen und designen wie").

---

### 6.29 Pflanze tarieren: Baumreihe gebremst, sieben Skills angehoben (2026-09-09, Owner) — UNGEMESSEN

Owner nach der Bestandsaufnahme (§8): „Baumreihe definitiv, Wurzelgeflecht ein bisschen nerfen. danach diese skills
alle ein bisschen buffen und dann sieht pflanze ja ganz rund aus."

#### A · Warum die Baumreihe nicht mit ihrer Schraube zu bremsen war

Gemessen (§8, mono / Paar / Tripel): **Baumreihe +1079 / +953 / +522 %** — das Doppelte des nächsten Legendären
(Wurzelgeflecht +591 %) und weit über dem Blitz-Band (+383 bis +553 %). §6.12 hatte dafür schon einen Regler gebaut,
`BAUMREIHE_FACTOR_SCALE`, und ihn von 1 auf 0,15 gedreht. Es hat nicht gereicht — und der Grund steht in der Mechanik:

Die Reihe zahlte auf **vier Kanälen** gleichzeitig, und der Regler fasst nur den ersten an.

| Kanal | Was er tut | Vom Regler erfasst |
| --- | --- | --- |
| 1 · eigener Faktor | `1 + (wiedFactor(n) − 1) × 0,15` auf jede blühende Position | **ja** |
| 2 · Überlappung | die Reihe ist eine Formation MEHR → `OVERLAP_BONUS` ×1,5 / ×2 / ×3 | nein |
| 3 · Wachstum | +1 Wachstum je Formation je Sieg → schneller blühen → längere Reihe (Rückkopplung) | nein |
| 4 · **Mitglieder** | die Reihe hält bis zu 40 blühende Karten, und Hecke wie Blüte-Passiv zahlen **je Mitglied** | nein |

Kanal 4 ist der Motor. Die Hecke liest den Typ *Wiederholung* — und die Reihe IST eine Wiederholung, deren
Mitgliederliste das ganze Brett sein kann. Ein Sieg zahlte damit `Mitglieder × Blühgewicht × Heckensatz`; bei
vollgrünem Feld (Ewiger Frühling) sind das 40 × ≥3 × 105.

Damit tat die **Multiplikator-Achse die Arbeit der Dichte-Achse** — und zwar besser als das Wurzelgeflecht, dem sie
laut §6.11 gehört.

#### B · Der Schnitt (Owner-Entscheid a)

Die Reihe behält Faktor (Kanal 1), Formationszahl (Kanal 2) und Wachstum (Kanal 3). **Ihre Mitglieder zahlen keinen
Basis-Score mehr** (Kanal 4). Ein Feld `scoreless: true` auf dem Formations-Eintrag, und `plantScoreFormations`
filtert es aus den drei Score-Pfaden (`formationScore`, `formationGreenCount`, `bluetenlese`); `plantFormCount`
und der Überlappungsbonus lesen weiter alles.

Gegengeprobe am Wächter (Naht absichtlich geöffnet, 8 Karten, 4 blühend): ein Stich zahlt **720 statt 240** Basis-Score.
Auf einem echten Brett mit 20–40 blühenden Karten ist der Faktor entsprechend größer.

`BAUMREIHE_FACTOR_SCALE` bleibt bei 0,15 — jetzt ist es der saubere Regler für ihre Größe, weil er den einzigen
verbliebenen Score-Kanal fasst. Erst messen, dann drehen.

#### C · Wurzelgeflecht

`WURZELGEFLECHT_FACTOR_SCALE` **1 → 0,85**. Die Historie ist wichtig: §6.12 stellte 0,7 ein (+164 → +75 %), §6.15
drehte wieder auf 1 (+63 → +100 %) — beides richtig für den damaligen Stand. Heute misst der Skill +591 %. „Ein
bisschen nerfen" ist deshalb die halbe Strecke zurück, nicht die ganze.

#### D · Die sieben angehobenen Skills

Alle sieben aus dem unteren Ende der Pflanze-Tabelle in §8. Die Sätze sind Startwerte, keiner ist gemessen.

| Skill | gemessen (mono · Paar · Tripel) | alt | neu |
| --- | --- | --- | --- |
| Blätterdach | Halte 6 % · −1 % · +1 % | 10/15/20/25 | **15/22/30/40** |
| Rankgerüst | −0 % · +1 % · −3 % | 30/45/60/80 | **33/49/66/88** |
| Verwachsung | +1 % · −2 % · −1 % | 0,25/0,5/0,75/1 | **0,4/0,7/1,0/1,4** |
| Lichtung | in allen sieben Welten schwach | 2/3/4/4 | **3/5/7/7** |
| Jahresringe | −0 % · +1 % · −11 % | Teiler 15, 20/30/40/50 | **Teiler 12, 25/35/45/60** |
| Zäher Halm | −2 % · −3 % · −10 % | 1/2/3/4 | **2/3/4/6** |
| Setzlingsbeet | −1 % · −3 % · −15 % | 2/3/4/4 | **3/4/6/6** |

Zwei Einschränkungen, die der Satz allein nicht auflöst:

- **Rankgerüst durfte nur +10 %.** Die vier Score-Sätze sind nach Formationstyp gestaffelt (Farbblock < Treppe <
  Wechsel, Hecke über der Treppe) — ein Wächter hält das, und mein erster Wurf (40/60/80/110) hat ihn zu Recht
  gerissen. Rankgerüsts eigentliches Problem ist ohnehin die **Häufigkeit** einer grünen Treppe, nicht der Satz.
- **Vier der sieben sind Wachstums-Skills** (Lichtung, Zäher Halm, Setzlingsbeet, halb auch Jahresringe), und die
  Wachstums-Achse ist als ganze flach: Aussaat misst +2 %, Ranken −2 %. Wachstum ist seit dem Fraktions-Kaltstart
  nicht knapp, und über der Blüh-Schwelle zahlt es nur noch über `PLANT_BLOOM_WEIGHT_PER_GROWTH` (40 Wachstum = +1
  Gewicht). Der systemische Hebel wäre dieser Teiler, nicht sieben Einzelsätze — **nicht angefasst**, weil er die
  ganze Fraktion und beide Legendären mithebt und das eine eigene Entscheidung ist.

#### E · Was offen bleibt

Alles hier ist ungemessen. Insbesondere: Heckes gemessene +105 % mono stammen zum Teil aus genau dem Kanal, der
jetzt zu ist — die Staffel der vier Score-Skills lässt sich erst nach einer neuen Messung beurteilen.

---

### 6.30 §6.29 nachgemessen: der Schnitt sitzt, und er sitzt tief (2026-09-09, auf Ansage) — gemessen

7 Pflanze-Welten, 56.875 Läufe, 39 min. Dieselben Parameter wie die §8-Baseline (Explore 900 · Greedy/Ablation 175),
damit die Zahlen nebeneinander stehen dürfen.

#### A · Die Welten

| Welt | §8 | nach §6.29 | Δ | sauber? |
| --- | --- | --- | --- | --- |
| **Pf** | 2.306.329.242 | **523.764.008** | **−77 %** | ja |
| Fe+Pf | 435.711.050 | 164.401.306 | −62 % | ja |
| Bl+Pf | 656.965.124 | 332.384.271 | −49 % | ja |
| Fe+Bl+Pf | 155.049.540 | 105.136.235 | −32 % | ja |
| Ei+Pf | 92.443.205 | 76.705.968 | −17 % | nein — Eis hat sich mitbewegt |
| Fe+Ei+Pf | 57.228.097 | 57.810.366 | +1 % | nein |
| Bl+Ei+Pf | 30.483.351 | 39.501.768 | +30 % | nein |

Die drei Eis-Welten taugen nicht als Beleg: dort haben sich seit §8 ZWEI Fraktionen verschoben (§5.29–§5.33).

**Die Fraktionen stehen damit neu** (mono, Median; Blitz und Feuer sind seit §8 unangetastet):

| Bl | 1.686.071.449 |
| --- | --- |
| **Pf** | **523.764.008** |
| Ei | 348.155.337 (§8-Stand; die Eis-Runde misst 224M) |
| Fe | 112.712.536 |

Die Pflanze war der Ausreißer nach oben und ist es nicht mehr. **Jetzt ist es Blitz**, mit dem 3,2-fachen der Pflanze.

#### B · Die drei Legendären

| Skill | §8 mono | jetzt | Paar | Tripel |
| --- | --- | --- | --- | --- |
| **Baumreihe** | +1079 % | **+112 %** | +953 → +138 % | +522 → +90 % |
| **Wurzelgeflecht** | +591 % | **+505 %** | +284 → +210 % | +141 → +90 % |
| Ewiger Frühling | +282 % | +291 % | +109 → +115 % | +85 → +64 % |

Der Schnitt an der Mitgliederliste hat die Baumreihe um **rund 90 %** ihrer Wirkung gekostet — der Beleg, dass Kanal 4
tatsächlich der Motor war und die Schraube aus §6.12 am falschen Ende saß. Sie ist damit vom stärksten Legendären des
Spiels zum schwächsten der Pflanze geworden, liegt aber im gesunden Band (Große Lawine +143 %, Eiszeit +131 % in §8)
und wird weiter in 59 % der Läufe gehalten. Wenn sie wieder etwas größer sein soll, ist `BAUMREIHE_FACTOR_SCALE`
(0,15) jetzt der saubere Regler: er fasst den einzigen verbliebenen Score-Kanal.

Wurzelgeflecht −15 % — genau die bestellte kleine Korrektur. Es ist jetzt das stärkste Pflanze-Legendäre und liegt
neben Resonanz (+553 %) und Hochspannung (+520 %). Ewiger Frühling unverändert, wie erwartet: nicht angefasst.

#### C · Die sieben angehobenen Skills

| Skill | Haltequote | Wirkung mono · Paar · Tripel | Urteil |
| --- | --- | --- | --- |
| **Blätterdach** | **6 % → 53 %** | +2 → +8 % · −1 → −24 % · +1 → +6 % | **repariert** — der gierige Spieler nimmt ihn jetzt |
| **Rankgerüst** | 98 → 90 % | −0 → **+6 %** · +1 → +5 % · −3 → **+150 %** | **repariert**, trotz nur +10 % Satz |
| Jahresringe | 47 → 76 % | −0 → −4 % · +1 → +1 % · −11 → −2 % | besser gehalten, Wirkung weiter ~0 |
| Setzlingsbeet | 29 → 37 % | −1 → −4 % · −3 → −11 % · −15 → −2 % | Tripel-Schaden weg, sonst flach |
| Verwachsung | 98 → 42 % | +1 → +5 % · −2 → +8 % · −1 → −0 % | Wirkung leicht hoch, wird seltener genommen |
| Zäher Halm | 100 → 98 % | −2 → −4 % · −3 → −14 % · −10 → +7 % | unverändert flach |
| **Lichtung** | 100 → 74 % | −0 → −2 % · −5 → −3 % · 0 → 0 % | **weiter in allen sieben Welten schwach** |

Zwei von sieben sind repariert, zwei sind besser, drei sind unverändert flach — und alle drei unveränderten sind
Wachstums-Skills. Das ist genau der Befund, den §6.29 D vorweggenommen hat: **die Wachstums-Achse trägt nicht, und
Einzelsätze heben sie nicht.** Wer sie heben will, muss an `PLANT_BLOOM_WEIGHT_PER_GROWTH` (40 Wachstum = +1
Blühgewicht), nicht an sieben Zahlen.

#### D · Der Nebenbefund: die Hecke ist mitgefallen

| | §8 | jetzt |
| --- | --- | --- |
| Hecke, mono | 100 % gehalten · **+105 %** | 33 % gehalten · **+12 %** |

Die Hecke liest den Typ *Wiederholung* — und ihre +105 % kamen zum großen Teil aus der Baumreihe, deren Mitglieder sie
mitzählte. Ohne diesen Kanal ist sie ein normaler Score-Skill mit einer seltenen Bedingung (eine grüne Wiederholung),
und der gierige Spieler lässt sie in zwei Dritteln der Läufe liegen. Das ist keine Nebenwirkung, die man wegtariert —
es ist die Hecke, die man jetzt zum ersten Mal ohne Verstärker sieht. Kandidat für die nächste Runde.

Damit ist auch die Staffel der vier Score-Sätze neu zu beurteilen (§6.29 E): sie war an einer Hecke kalibriert, die es
so nicht mehr gibt.

---

### 6.31 Wurzelgeflecht gesweept: 0,45 trifft das Band (2026-09-10, Owner) — gemessen

Owner: „Wurzelgeflecht auch noch etwas runterbringen. auf die 150-250."

#### A · Die Abkürzung, die den Sweep bezahlbar macht

`sim/survey.js --fraktion plant --groesse 1` misst die Mono-Welt allein: 18 Skills statt 288, **13 min statt 39**.
Die Seeds einer Welt hängen nicht davon ab, welche anderen Welten mitlaufen — die Zahl muss also mit dem großen Lauf
identisch sein. **Kontrollpunkt gefahren und bestätigt:** bei 0,85 kommen exakt die +505 % und der Median
523.764.008 aus §6.30 heraus, auf den Euro. Erst danach der Sweep.

#### B · Der Sweep

| `WURZELGEFLECHT_FACTOR_SCALE` | Wurzelgeflecht | Pf-Median | Baumreihe | Ewiger Frühling |
| --- | --- | --- | --- | --- |
| 0,85 (Kontrolle = §6.30) | +505 % | 523.764.008 | +112 % | +291 % |
| 0,60 | +397 % | 455.460.117 | +105 % | +264 % |
| **0,45** | **+220 %** | **366.535.256** | +75 % | +274 % |

**0,45 gesetzt** — gemessener Punkt im bestellten Band, keine Interpolation.

Die Kurve ist nicht linear: 0,85 → 0,60 (Schritt 0,25) kostet 21 % der Wirkung, 0,60 → 0,45 (Schritt 0,15) kostet
45 %. Der Regler greift unten deutlich härter, weil der Faktor multiplikativ über die Positionen eines Laufs wirkt.
Wer tiefer als 150 % will, braucht deshalb nur noch einen kleinen Schritt; wer bei 250 % landen will, liegt zwischen
0,45 und 0,60.

#### C · Was der Schnitt mitnimmt

- **Die Fraktion fällt weiter**: mono 524M → **367M**. Gegen Blitz (1,686 Mrd, seit §8 unangetastet) ist das jetzt
  das 4,6-fache statt des 3,2-fachen. Die Pflanze steht damit knapp über Eis (§8: 348M) und klar über Feuer (113M) —
  aber Blitz steht allein oben, und der Abstand ist durch diese Runde größer geworden, nicht kleiner.
- **Die Baumreihe sinkt mit** (+112 → +75 %), obwohl an ihr nichts geändert wurde. Das ist kein zweiter Effekt,
  sondern die Ablation: sie misst den Beitrag GEGEN den Rest des Builds, und der Rest ist kleiner geworden. Sie wird
  weiter in 71 % der Läufe gehalten (vorher 59 %) — der gierige Spieler nimmt sie also häufiger, nicht seltener.
  Wenn sie wieder größer sein soll, ist `BAUMREIHE_FACTOR_SCALE` (0,15) der Regler.
- Ewiger Frühling praktisch unverändert (+291 → +274 %) und damit das stärkste Pflanze-Legendäre.

Die drei stehen jetzt bei **+274 / +220 / +75 %** statt +1079 / +591 / +282 % vor der Runde.

#### D · Offen

Die drei Zahlen sind mono gemessen. Die Misch-Welten sind seit §6.30 nicht neu gefahren — dort kann der Regler anders
greifen, weil ein Misch-Build weniger blühende Karten je Segment hat. Und der eigentliche Befund aus §6.30 steht
unverändert: die Hecke ist ohne den Baumreihen-Kanal zu dünn (33 % gehalten, +12 %), und die Wachstums-Achse trägt
nicht.

---

### 7.32 Die Klinge liest nur noch die Passiv-Leiste (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

Owner: „als erstes einen nerf bei glühender klinge und weißglut. lass uns erst den nerf designen."

#### A · Der Befund: die Klinge füttert den Motor am EINGANG

§8 misst **Glühende Klinge +141 %** und **Weißglut +96 %** mono — die zwei stärksten NORMALEN Skills des Spiels,
beide über Sonnenzorn (+91 %), dem Legendären der Fraktion.

Das Passiv gibt Hitze aus dem Vorsprung: `(Vorsprung − HEAT_MARGIN_OFFSET) × HEAT_PER_POINT`, ab `HEAT_MIN_MARGIN`.
Jeder andere Feuer-Skill LIEST Hitze und zahlt Score. Die Klinge liest Hitze und zahlt **mehr Hitze**:

> +Wert → größerer Vorsprung → mehr Hitze → +Wert

Gerechnet: ein Sieg, der ohne sie Vorsprung 3 hätte (2 % Hitze), macht mit +4 Wert Vorsprung 7 (6 %) — **dreifaches
Hitze-Einkommen**. Dazu zwei Mitnahmen: der größere Vorsprung zündet die Verbrennung (Tor 8/7/6/5 → ×1,5), und
+Wert dreht Niederlagen in Siege, was wieder Hitze bringt.

**Weißglut ist kein eigener Motor, sondern ein Hebel.** Es verlängert die Leiste 100 → 200 (binär, nicht auf der
Stufenleiter) und verdoppelt damit die Landebahn für alles, was an Hitze hängt:

| | ohne Weißglut | mit Weißglut |
| --- | --- | --- |
| Klinge Normal … Episch | +2 / +3 / +4 / **+5** | +5 / +6 / +8 / **+10** |
| Hitze-Multiplikator voll | ×1,20 | ×1,50 … **×1,80** |
| Sonnenzorn, Spitzen-Lesart | 10 Stufen | 20 Stufen |

Seine +96 % sind damit zum großen Teil **die Zahl der Klinge in Verkleidung**.

#### B · Der Schnitt (Owner-Entscheid)

**Die Klinge liest `HEAT_MAX` (100), nie die von Weißglut verlängerte Leiste.** Eine Zeile in `fireValueBonus`,
ein Halbsatz im Skilltext („… bis 100 %"). Wirkung:

- stärkster Build (Episch + Weißglut): **+10 → +5 Wert**,
- normaler Build ohne Weißglut: **unverändert**,
- die Rückkopplung bleibt — sie ist nur noch halb so lang.

Warum nicht zusätzlich die Stufen strecken: das wäre ungefähr die Dosis, mit der die Baumreihe von +1079 auf +112
gefallen ist (§6.30). Ein Hebel, dann messen.

**Weißglut bleibt vorerst unangetastet** (Owner). Der Grund ist derselbe wie bei Wurzelgeflecht/Baumreihe in §6.31:
die beiden sind verkoppelt, und als das Wurzelgeflecht fiel, sank die Baumreihe ungefragt von +112 auf +75 mit. Wer
hier beide gleichzeitig voll anfasst, kann hinterher nicht trennen, welcher Schnitt was bewirkt hat.

Der Wächter (`fire-rework.test.js`) hält die Entkopplung an ihrer schärfsten Stelle — volle 200er-Leiste, Episch,
mit und ohne den Weißglut-Skill. Gegengeprobt: mit offener Naht liefert er wieder 10 statt 5.

#### C · Erwartung und offene Frage

Die Klinge sollte deutlich fallen, Weißglut **von allein mit** — um wie viel, ist der Punkt der Messung. Bleibt
Weißglut danach über dem Band, sind die Regler `WEISSGLUT_HEAT_MAX` (200) und `multPer10` bereit.

---

### 7.33 Der Schnitt nachgemessen: ein Hebel, zwei Skills, und Feuer steht jetzt letzter (2026-09-10) — gemessen

Feuer-Mono allein, 900 Explore / 175 Greedy und Ablation, 7 min. Feuer ist seit §8 sonst unangetastet, die Zahlen
stehen also direkt nebeneinander.

#### A · Beide Ziele getroffen — mit einem Hebel

| Skill | §8 | jetzt | |
| --- | --- | --- | --- |
| **Glühende Klinge** | +141 % | **+24 %** | angefasst |
| **Weißglut** | +96 % | **+20 %** | **nicht angefasst** |
| Sonnenzorn (L) | +91 % | +96 % | — |
| Sonnenkern (L) | +14 % | **+116 %** | — |
| Feuersturm | +35 % | +20 % | — |
| Verbrennung | +27 % | +10 % | — |
| Schmelzpunkt | +22 % | +9 % | — |

**Die Verkopplungs-These ist bestätigt.** Weißglut ist um 79 % gefallen, ohne dass eine seiner beiden Zahlen
verändert wurde — genau die Vorhersage aus §7.32 B, und dieselbe Mechanik, mit der die Baumreihe in §6.31 ungefragt
von +112 auf +75 mitgefallen ist. Hätten wir beide gleichzeitig genervt, stünde Weißglut jetzt irgendwo unten und
niemand wüsste, welcher Schnitt es dorthin gebracht hat.

**Die Regler für Weißglut bleiben deshalb, wo sie sind.** +20 % ist Mittelfeld; es braucht keinen zweiten Schnitt.

#### B · Die Form der Fraktion ist jetzt richtig

Vorher standen **zwei normale Skills über dem Legendären** der Fraktion (Klinge +141 %, Weißglut +96 % gegen
Sonnenzorn +91 %). Jetzt führen die beiden Legendären die Tabelle an (+116 % und +96 %), und der stärkste normale
Skill steht bei +24 %. Das ist die Ordnung, die das Design will.

Sonnenkerns Sprung (+14 → +116 %) ist keine zweite Änderung, sondern wieder die Ablation: sein Beitrag wurde vorher
vom Klingen-Motor überdeckt. Er war die ganze Zeit so groß, nur nicht sichtbar.

#### C · Der Preis: Feuer ist jetzt klar letzter

Die Fraktion fällt mono **112,7M → 65,1M (−42 %)**. Damit steht sie so:

| Bl | 1.686M | (seit §8 unangetastet) |
| --- | --- | --- |
| Pf | 367M | §6.31 |
| Ei | 348M | §8-Stand; die Eis-Runde misst 224M |
| **Fe** | **65M** | |

Feuer war schon in §8 letzter (15× hinter Blitz), jetzt sind es **26×**. Der Schnitt hat das Problem nicht
geschaffen, er hat es vertieft — und er war trotzdem richtig, weil die FORM vorher falsch war.

Acht der siebzehn Feuer-Skills messen mono bei oder unter null (Brandschneise +1, Zunder 0, Ewige Glut −0,
Schmiede −2, Rückzündung −2, Glutstahl −4, Feuerlinie −5, Glutbett −6). Sie waren schon in §8 flach; mit dem
kleineren Motor sind sie es etwas deutlicher.

#### D · Was daraus folgt

Feuer braucht als nächstes einen **Buff**, keinen zweiten Nerf — und die acht flachen Skills sind der Ort dafür,
nicht die Spitze. Blitz steht mit 1,686 Mrd weiter allein oben und ist seit der Bestandsaufnahme unangetastet.

---

### 7.34 Sieben der acht flachen Feuer-Skills angehoben — und warum der achte nicht gebufft wird (2026-09-10, Owner) — UNGEMESSEN

Owner: „dann buff die acht flachen feuer skills." §7.33 hatte acht mit einer Wirkung bei oder unter null gelistet.

#### A · Zwei strukturelle Funde vor den Zahlen

**1. Die Ewige Glut (L) hatte ein verschobenes Tor.** Ihre Rampe wächst, wenn eine Runde mit VOLLER Leiste endet —
und „voll" las die Leiste des BUILDS. Mit Weißglut (mono in 98 % der Läufe gehalten) stand das Tor bei 200 statt 100,
die Rampe tickte fast nie, und das Legendäre maß −0 %. Das ist derselbe Fehler wie bei der Klinge in §7.32: Weißglut
verschob eine Schwelle, die nichts mit ihm zu tun hat. Das Tor liest jetzt `HEAT_MAX`.

**2. Das Glutbett darf nach der eigenen Owner-Regel gar nicht gebufft werden.** Es ist ein reiner
Niederlagen-Skill: ein Boden unter der Kühlung, und Episch „kühlt gar nicht". Bei 74 % Siegquote und einer Leiste,
die ab der Laufmitte am Anschlag steht, verteidigt es gegen etwas, das nicht passiert — kein Satz auf der Karte
erreicht das. Und §7.31 hält fest: **„keine Skills, die auf Niederlagen reagieren."** Genau aus diesem Grund wurde
die Rückzündung in §7.24 vom Konter zum Takt umgebaut.

Das Glutbett ist deshalb **nicht angefasst**. Es gehört ersetzt, nicht hochgedreht — dieselbe Entscheidung wie
seinerzeit bei Glut, Feuerwalze und Flächenbrand, und sie gehört dem Owner.

#### B · Die sieben

| Skill | gemessen | alt | neu | warum |
| --- | --- | --- | --- | --- |
| Glutstahl | −4 % | 8/12/16/20 | **14/20/27/36** | zahlt je Punkt Kampfwert über dem Grundwert — genau die Quelle, die §7.32 halbiert hat |
| Feuerlinie | −5 % | 0,02–0,05, Kosten 3 | **0,035–0,08, Kosten 2** | liest den Kampfwert der Siegkarte, derselbe verkleinerte Eingang; die Kosten fehlen bei voller Leiste dem Schmelzpunkt als Überlauf |
| Zunder | 0 % | 2/3/4/5 | **4/6/8/10** | bei voller Leiste kein Hitze-, sondern ein Score-Skill: was nicht mehr auf die Leiste passt, geht über den Schmelzpunkt (100 % gehalten) in den Basis-Score |
| Rückzündung | −2 % | ×1,5 | **×1,8** | die Leiter ist der Takt (5/4/3/2), der Faktor steht auf allen Stufen gleich — also hebt er auf allen |
| Brandschneise | +1 % | Breite 3–6, ×2,5 | **Breite 4–10, ×3** | deckte 8–15 % der Stiche bei Ø ×1,2 — zu wenig für einen Skill mit einem ganzen Durchlauf Vorlauf; jetzt 10–25 % |
| Schmiede | −2 % | 1/1/1/2 Karten | **1/2/2/3** | die Schwelle (80/60/40/20) war nie das Problem; +3 auf die niedrigste Karte hebt den Vorsprung kaum, und der Vorsprung IST das Hitze-Einkommen |
| Ewige Glut (L) | −0 % | Tor = Leiste des Builds | **Tor = `HEAT_MAX`** | s. A 1 |

Dazu `FORGE_VALUE` 3 → **4** (Schmiede und, über `forgedDouble`, Glutstahl Episch).

Drei Wächter mussten mit, alle auf die neue Wahrheit statt auf ein weicheres Maß:

- der Schmiede-Textwächter prüfte „Plural nur bei Episch"; die Kartenzahl ist jetzt eine Leiter, also prüft er
  **jede** Stufe gegen ihre eigene Zeile — strenger als vorher, nicht lockerer,
- die Schneisen-Wächter zählten 3 fest verdrahtete Positionen; sie lesen die Breite jetzt aus der Tabelle,
- der Ewige-Glut-Wächter hielt ausdrücklich fest, dass die Rampe mit Weißglut erst bei 200 tickt — das war der Fehler,
  er ist umgedreht und hält jetzt die Gegenrichtung.

#### C · Balance-Guard neu zentriert, mit Beleg

Median über Seeds 1..40: **5,26M** (alte Obergrenze 5,15M, um 2 % überschritten). Über Seeds 1..200: **4,74M** —
dasselbe Niveau, also kein einzelner Ausreißer, sondern die gewollte Folge. Band neu auf 3,40M–7,10M (≈ ±35 %).
Der Mean liegt bei 8,76M (Seeds 1..200: 8,04M) und bleibt im bestehenden Band 4,0–10,5M.

#### D · Das Glutbett bleibt (Owner-Entscheid, 2026-09-10)

Owner: „gluttbett so lassen, das bleibt ein nichen pick." Damit ist die Frage aus A 2 beantwortet und die Regel aus
§7.31 bekommt ihre erste ausdrückliche Ausnahme: **ein Niederlagen-Skill darf als Nische bestehen bleiben** — er
darf nur nicht als Baustein eines Motors geplant werden. Das Glutbett behält seine Werte, seine gemessenen −6 % im
Mono-Bau sind kein Defekt, sondern der Preis der Nische. Es wird in dieser Runde nicht mehr angefasst und ist auch
kein offener Punkt mehr.

#### E · Offen

Alles ungemessen.

---

### 7.35 §7.34 nachgemessen: fünf von sieben sitzen, zwei nicht — und einmal lag meine Begründung falsch (2026-09-10) — gemessen

Feuer-Mono, 4.050 Läufe, 7 min, Parameter der §8-Baseline.

#### A · Die Fraktion

| | §8 (vor dem Nerf) | §7.33 (nach dem Nerf) | jetzt |
| --- | --- | --- | --- |
| Fe mono Median | 112.712.536 | 65.050.455 | **137.337.513** |
| Siegquote | 77 % | 74 % | 76 % |

**+111 % gegenüber §7.33** und damit über dem Stand VOR dem Klingen-Schnitt. Der Rückstand auf Blitz (1.686M,
unverändert) fällt von 26× auf **12×**. Die Reihenfolge steht jetzt Bl 1.686M · Pf 367M · Ei 348M/224M · **Fe 137M**.

#### B · Skill für Skill

| Skill | §7.33 | jetzt | |
| --- | --- | --- | --- |
| **Ewige Glut** (L) | −0 % | **+52 %** | Tor-Fix, nicht die Zahl |
| **Feuerlinie** | −5 % | **+28 %** | ✓ |
| **Brandschneise** | +1 % | **+8 %** | ✓ |
| **Schmiede** | −2 % | **+6 %** | ✓ |
| **Rückzündung** | −2 % | **+2 %** | ✓, knapp |
| **Zunder** | 0 % | **−2 %** | ✗ |
| **Glutstahl** | −4 % | **−7 %** | ✗ |
| Glutbett | −6 % | −9 % | absichtlich nicht angefasst (Owner: Nische) |

Der größte Einzelgewinn war **kein Buff, sondern ein Tor-Fix**: die Ewige Glut steigt von −0 auf +52 % und ist damit
das dritte Legendäre in einem gesunden Band (Sonnenkern +66 %, Sonnenzorn +54 %). Die Rampe lief die ganze Zeit, sie
wurde nur nie freigegeben.

Nebenbefund: **die Glühende Klinge fällt weiter** (+24 → +9 %, Haltequote 82 → 55 %). Das ist keine dritte Änderung,
sondern wieder die Ablation — die anderen Skills sind gewachsen, also ist ihr relativer Beitrag kleiner. Sie ist vom
Pflicht-Pick zum normalen Pick geworden, was genau die Absicht war.

#### C · Die zwei, die nicht gewirkt haben — und warum

**Zunder (0 → −2 %, verdoppelt).** Meine Begründung in §7.34 war: bei voller Leiste ist Zunder ein Score-Skill, weil
der Überlauf über den Schmelzpunkt in den Basis-Score geht. **Das war falsch** — nicht die Mechanik, sondern die
Annahme darunter. Der Schmelzpunkt wird gar nicht mehr zuverlässig gebaut: seine Haltequote fällt in derselben
Messung von **100 % auf 61 %** und seine Wirkung von +9 auf +4 %. Ohne ihn wird jeder Punkt Hitze über der Leiste
schlicht weggeworfen, und doppelt so viel Weggeworfenes ist immer noch nichts.

**Glutstahl (−4 → −7 %, +75 % auf den Satz).** Er zahlt je Punkt Kampfwert ÜBER dem Grundwert — und diese Quelle war
zu großen Teilen die Klinge, deren Motor §7.32 halbiert hat und die jetzt nur noch in 55 % der Läufe gehalten wird.
Glutstahl ist ein **Mitfahrer**, kein Motor. Ein höherer Satz auf eine Bemessungsgrundlage nahe null bleibt nahe null.
Dieselbe Signatur wie Verwachsung in der Pflanze-Runde (§6.30).

Beide brauchen eine MECHANIK, keine Zahl:

- Zunder: entweder an einen Ausgang hängen, den jeder Feuer-Bau hat, statt an den Schmelzpunkt — oder anerkennen,
  dass Hitze-Einkommen an einer gesättigten Leiste keine eigene Achse trägt, und den Platz neu belegen.
- Glutstahl: braucht eine eigene Wertquelle statt einer geliehenen — oder er wandert auf eine Achse, die der Bau
  ohnehin baut.

Beides sind Design-Entscheidungen und gehören dem Owner.

#### D · Stand

Von den acht flachen Skills aus §7.33 sind **vier repariert**, einer (Ewige Glut) weit darüber, einer bleibt
absichtlich Nische, und **zwei sind offen** (Zunder, Glutstahl). Feuer ist als Fraktion nicht mehr das Problem —
**Blitz steht mit dem Zwölffachen weiter allein oben und ist seit der Bestandsaufnahme unangetastet.**

---

### 7.37 Die drei Blitz-Legendären gesenkt (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

Owner nach der Feuer-Runde: „als nächstes blitz", und auf die Frage nach dem Einstieg: die drei Legendären senken.
Zahlen vorher vorgelegt und abgenommen (Dosis „mittel").

#### A · Ausgangslage

§8 misst mono **Resonanz +553 % · Hochspannung +520 % · Doppelentladung +383 %** — die drei stärksten Legendären
des Spiels. Zum Vergleich die Spitzen der anderen Fraktionen nach ihren Runden: Pflanze +274 %, Eis +284 % (§8-Stand),
Feuer +66 %. Zielband dieser Runde: **250–300 %**.

Jeder der drei hängt an genau EINEM Regler, und zwei davon aneinander.

| Skill | Regler | alt | neu | was er tut |
| --- | --- | --- | --- | --- |
| Resonanz | `RESONANZ_SHARE` | 2,25 | **1,5** | eine Karte kämpft mit ihren Stapeln + Anteil × den Stapeln der anderen Formations-Mitglieder |
| Hochspannung | `HOCHSPANNUNG_STEPS` | 3 | **2** | alle gehaltenen Blitz-Skills wirken so viele Stufen höher |
| Doppelentladung | `DOPPELENTLADUNG_STACKS` | 5 | **3** | Stapel je Ionisierung |

`DOPPELENTLADUNG_STRIKE` (2) bleibt bewusst stehen: ein Hebel je Skill und Runde.

#### B · Warum genau diese Zahlen

**Resonanz stand weit über ihrem eigenen Nullpunkt.** Der Regler ist mit „1 = die ganze Summe" dokumentiert; bei 2,25
bekam jede Karte mehr als das Doppelte der vollen Partnersumme. Gerechnet an einer Vierer-Formation, die anderen drei
mit je 5 Stapeln (ein Stapel = +75 Basis-Score und +0,15× Crit-Multiplikator):

| SHARE | Stapel der Siegkarte | Score | Crit-Multiplikator |
| --- | --- | --- | --- |
| 2,25 (alt) | 38 | 2.850 | +5,70× |
| **1,5 (neu)** | **27** | **2.025** | **+4,05×** |
| 1,0 (Nullpunkt) | 20 | 1.500 | +3,00× |

**Hochspannung hat keinen anderen Zwischenwert.** Der Regler ist diskret, und die Kurve ist extrem steil: bei 1 maß er
+8 % (schwächer als ein normaler Pick, §6.12), bei 3 sind es +520 %. **2 ist der einzige Wert dazwischen.** Landet er
falsch, braucht der Skill eine andere MECHANIK — etwa nur N Skills statt aller —, keine andere Zahl. Das ist die
wichtigste offene Stelle dieser Runde.

**Doppelentladung** geht auf 3 zurück, den Mittelwert ihrer eigenen Historie (2 → 4 → 5).

#### C · Zwei Vorhersagen, die die Messung prüfen soll

1. **Resonanz und Doppelentladung sind gekoppelt** — Doppelentladung erzeugt die Stapel, Resonanz teilt sie. Beide
   fallen also, und der Anteil ist nicht sauber trennbar. Dieselbe Lage wie Wurzelgeflecht/Baumreihe (§6.31) und
   Klinge/Weißglut (§7.33); dort ist der ungetroffene Partner jedes Mal von allein mitgefallen.
2. **Die Stapel-Schnitte landen vermutlich WEICHER, als die Prozente aussehen.** §7.31 hat gemessen, dass 81 % des
   gebauten Crit-Multiplikators am 8×-Deckel verfällt — 54 Stapel reichen allein schon dafür. Was hier weggenommen
   wird, wurde zum Teil ohnehin verworfen. Hochspannung dagegen sollte HÄRTER treffen, weil Stufen jeden
   Skill-Effekt heben, nicht nur den Multiplikator.

Trifft (2) zu, ist der eigentliche Hebel der Fraktion nicht ihre Spitze, sondern der Deckel — und §7.31 wartet
weiter auf eine Abnahme.

---

### 7.38 §7.37 nachgemessen: weich gelandet, eine Vorhersage widerlegt (2026-09-10) — gemessen

Blitz-Mono, 4.050 Läufe, 7 min, Parameter der §8-Baseline.

#### A · Die drei

| Skill | §8 | jetzt | Regler-Schnitt | Wirkungs-Verlust |
| --- | --- | --- | --- | --- |
| Resonanz | +553 % | **+438 %** | −33 % | −21 % |
| Hochspannung | +520 % | **+428 %** | −33 % | −18 % |
| Doppelentladung | +383 % | **+275 %** | −40 % | −28 % |
| **Bl mono Median** | 1.686.071.449 | **1.028.320.158** | | **−39 %** |

Zielband war 250–300 %. **Nur Doppelentladung ist angekommen.** Jeder Regler hat weniger als proportional gewirkt.

#### B · Vorhersage 2 bestätigt, Vorhersage zu Hochspannung WIDERLEGT

§7.37 C sagte: die Stapel-Schnitte landen weicher als die Prozente, weil laut §7.31 81 % des gebauten
Crit-Multiplikators am 8×-Deckel verfällt. **Das stimmt** — Resonanz und Doppelentladung verlieren beide weniger
Wirkung, als der Regler hergibt.

Derselbe Absatz sagte, **Hochspannung müsse HÄRTER treffen**, weil Stufen jeden Skill-Effekt heben. **Das war
falsch** — sie ist von den dreien am wenigsten gefallen (−18 %). Der Grund ist strukturell und hätte mir vorher
auffallen müssen: **die Stufenleiter ist nur vier lang.** Ein Skill, der auf Selten oder höher gewürfelt wurde,
erreicht mit +2 Stufen genauso Episch wie mit +3. Der Unterschied zwischen 3 und 2 betrifft also nur die Skills, die
auf NORMAL gewürfelt wurden — ein Viertel des Angebots.

Damit ist die offene Stelle aus §7.37 B beantwortet, und zwar schlecht:

| `HOCHSPANNUNG_STEPS` | Wirkung |
| --- | --- |
| 1 | +8 % (§6.12: schwächer als ein normaler Pick) |
| 2 | **+428 %** |
| 3 | +520 % |

Der Regler ist nicht nur diskret, er **sättigt**. Zwischen 1 und 2 liegt der ganze Sprung, zwischen 2 und 3 fast
nichts. **Es gibt keine Zahl, die diesen Skill ins Band bringt** — er braucht eine andere Mechanik (etwa: nur die
N ältesten/wenigsten Skills werden gehoben, oder +1 Stufe mit einer zweiten Wirkung daneben).

#### C · Die Legendären tragen die Höhe nicht allein

Drei Schnitte von 33–40 % haben die Fraktion um 39 % gesenkt — und sie steht damit immer noch bei **1,03 Mrd**,
also beim **2,8-fachen der Pflanze** (367M) und beim **7,5-fachen von Feuer** (137M). Der Motor darunter trägt den
Großteil; wer Blitz ins Feld holen will, kommt über die Legendären allein nicht hin.

#### D · §7.31 ist in den Daten sichtbar

Die zwei schwächsten Blitz-Skills dieser Messung sind ausgerechnet die zwei Crit-Multiplikator-Karten:
**Vorentladung −11 % · Entladung −11 %**, dazu Spannungsstau −1 %. Genau die Skills, von denen §7.31 sagt, dass
ihr Beitrag am 8×-Deckel verfällt. Der Befund liegt seit dem 09.09. vor und wartet weiter auf eine Abnahme.

Dazu passt der Anzeigefehler aus derselben Runde: `totalCritMult` (Statusleiste und Ladungsleiste) addiert vier
Quellen **ohne** `CRIT_MULT_CAP` — der Motor deckelt korrekt (`engine.js` nach allen Additionen), die Anzeige nicht.
Sie zeigt also einen Wert, den der Stich nie zahlt, und fehlt gleichzeitig um `lightIonCritMult` (die Stapel der
Siegkarte). Nicht angefasst, Entscheid offen.

---

### 7.39 Hochspannung wird ein Misch-Legendäres, und die Crit-Anzeige sagt die Wahrheit (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

Zwei Owner-Entscheide nach §7.38.

#### A · Hochspannung: +1 Stufe, dafür für JEDE Fraktion

§7.38 hat gezeigt, dass keine Zahl den Skill ins Band bringt — der Regler sättigt, weil die Stufenleiter nur vier
lang ist (1 → +8 %, 2 → +428 %, 3 → +520 %). Owner: „+1 Stufe aber für alle skills, nicht nur Blitz."

Damit ändert sich die ROLLE des Skills: aus dem Mono-Blitz-Verstärker wird ein **Misch-Legendäres**. Wer Blitz mono
spielt, bekommt +1 Stufe auf 13 Blitz-Skills; wer mischt, bekommt sie auf denselben 13 Slots, egal welcher Fraktion.
Der Skill verliert seinen Mono-Bonus und behält seinen Wert — das ist genau die Richtung, in die die Fraktion soll.

**Umsetzung.** Der Hebel lag in `lightning.js` und war für Blitz allein gebaut. Er liegt jetzt als `boostedTier`
in `skills.js` — die gemeinsame Quelle, die alle vier Fraktionsmodule ohnehin importieren; ein Import auf
`lightning.js` aus den anderen dreien wäre ein Zyklus. Vier Nähte lesen ihn:

| Fraktion | Stelle |
| --- | --- |
| Blitz | `effectiveTier` |
| Feuer | `fireTier` |
| Pflanze | `plantTier` |
| Eis | `iceRoleTiers` — dort, weil die Stufe EINMAL je Rolle geseedet wird und alles darunter nur `roleTiers` liest |

`HOCHSPANNUNG_STEPS` 2 → **1**. Skilltext neu: „Alle deine gehaltenen Skills wirken eine Stufe höher — jede
Fraktion."

Ein Wächter prüft alle vier Fraktionen über ihre EIGENE Stufenfunktion, nicht über den Helfer: der Hebel sitzt
zentral, aber jedes Modul muss ihn auch wirklich lesen. Gegengeprobt — nimmt man ihn aus `fireTier` heraus, fällt er.

#### B · Die Crit-Anzeige (Owner-Entscheid B)

Der Deckel im Motor greift korrekt (`engine.js`, `Math.min` nach allen Additionen — auch die
Entladung-Verdopplung läuft davor). **Die Anzeige griff nicht:** `totalCritMult` addierte vier Quellen ohne
`CRIT_MULT_CAP`, und Statusleiste wie Ladungsleiste zeigten Werte, die kein Stich je zahlt.

Das ist nicht Kosmetik. Laut §7.31 verfällt ohnehin 81 % des gebauten Multiplikators am Deckel — die Anzeige lud
also ausgerechnet dort zum Weiterkaufen ein, wo nichts mehr ankommt.

Jetzt: `totalCritMult` klemmt wie der Motor. Der gebaute Wert bleibt als `totalCritMultRaw` erhalten und steht in
der Statusleiste als Unterzeile daneben — **„am Deckel · 11,3 gebaut"** —, sobald er über dem Deckel liegt.

Zwei Dinge dazu ehrlich benannt:

- Die Zeile ist zugleich UNVOLLSTÄNDIG und war es immer: `lightIonCritMult` (die Stapel der Siegkarte, bei Blitz die
  größte Quelle) hängt an der Karte, die gerade gewinnt, nicht am Build — eine Build-Anzeige kann sie nicht kennen.
  Der echte Stich liegt also oft HÖHER am Deckel, als die Zeile vermuten lässt.
- Die Ladungsleiste zeigt nur den gedeckelten Wert, ohne Überschuss — dort ist kein Platz. Wer den Überschuss sehen
  will, findet ihn in der Statusleiste.

#### C · Offen

Beides ungemessen. Hochspannung ist der größere Eingriff: er verschiebt den Skill von Mono nach Misch und hebt
zugleich alle drei anderen Fraktionen, wenn er dort liegt. Die Wirkung auf die Fraktionshöhen ist noch nicht
gemessen — und die Misch-Welten schon gar nicht.

---

### 7.41 §7.39/§7.40 nachgemessen: Blitz ist eingefangen, mein Fit war falsch (2026-09-10) — gemessen

Blitz-Mono, 4.050 Läufe, 6 min, Parameter der §8-Baseline. In dieser Messung stecken ZWEI Änderungen (Hochspannungs
neue Mechanik und Resonanz 0,7); die Anteile sind deshalb nicht sauber trennbar, was vorher so angesagt war.

#### A · Die Fraktion ist eingefangen

| | §8 | §7.38 | jetzt |
| --- | --- | --- | --- |
| Bl mono Median | 1.686.071.449 | 1.028.320.158 | **415.748.556** |
| Doppelentladung | +383 % | +275 % | **+235 %** |
| Resonanz | +553 % | +438 % | **+170 %** |
| Hochspannung | +520 % | +428 % | **+92 %** |

Damit steht das Feld so: **Bl 416M · Pf 367M · Ei 348M (§8-Stand) / 224M · Fe 137M.** Blitz und Pflanze liegen
gleichauf, Eis daneben, Feuer als einziges deutlich darunter. Der 12-fache Abstand aus §7.38 ist weg.

#### B · Mein Potenzgesetz war falsch

§7.40 hat aus zwei Messpunkten (2,25 → +553 %, 1,5 → +438 %) einen Exponenten von 0,58 gefittet und für 0,7 rund
**+280 %** vorhergesagt. Gemessen sind **+170 %**.

Rechnet man den neuen Punkt nach, liegt der Exponent zwischen 1,5 und 0,7 bei **1,24** statt 0,58 — die Elastizität
ist also nicht konstant, sie STEILT sich nach unten auf. Zwei Punkte reichten für diese Kurve nicht, und ich habe
das Ergebnis genauer angegeben, als die Datenlage hergab.

Ein Teil der Abweichung ist allerdings nicht Resonanz: Hochspannung ist in derselben Messung von +2 auf +1 Stufe
gefallen, und in 65 % der Läufe wird er gehalten. Dort liegt jeder Blitz-Skill jetzt eine Stufe tiefer, erzeugt
weniger Stapel — und Resonanz teilt genau diese Stapel. Die zwei Schnitte multiplizieren sich.

#### C · Hochspannung lässt sich mono gar nicht beurteilen

+428 → +92 %. In einer MONO-Welt ist die neue Mechanik („+1 Stufe für alle Fraktionen") identisch mit der alten
(„+1 Stufe für Blitz") — es gibt keine anderen Fraktionen im Bau. Mono misst also nur die Zahl 2 → 1, nicht den
Umbau. **Sein eigentlicher Zweck ist in dieser Messung unsichtbar.** Wer wissen will, ob der Skill jetzt taugt,
muss die Misch-Welten fahren.

#### D · Der Preis: der Mittelbau ist eingebrochen

Acht Blitz-Skills messen mono bei oder unter null (Ionenfeld +2, Blitzableiter +2, Serienschutz 0, Vorentladung −0,
Spannungsstau −2, Gewitterfront −6, Ladungsserie −11, Entladung −19). Vorher waren es sechs, und **Gewitterfront ist
von +69 auf −6 gefallen, Kettenblitz von +33 auf +5, Blitzableiter von +24 auf +2** — ohne dass einer von ihnen
angefasst wurde.

Die Ursache ist Hochspannung: eine Stufe weniger trifft nicht nur den Legendären, sondern **jeden der dreizehn
gehaltenen Skills** in jedem Lauf, in dem er liegt. Das war der teuerste Teil des Umbaus, und er war nicht
beabsichtigt — beabsichtigt war, den Skill von Mono nach Misch zu verschieben.

---

### 7.42 Der Crit-Deckel wird weich, Entladung wechselt die Achse (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

Owner nach der Mittelbau-Diagnose: „Deckel weich machen und Dupletten von der Achse nehmen", dann alle drei
Vorschläge angenommen (Steigung 0,2 · Entladung auf Basis-Score · Spannungsstau-Entwürfe).

#### A · Der Befund, der dahinter steht

Der Crit-Multiplikator hat **5,75× Kopfraum** (Basis 2,25, Deckel 8). Was ihn füllt:

| Quelle | füllt den Kopfraum allein bei |
| --- | --- |
| Stapel (0,15× je Stapel) | **38 Stapeln** — mit Kurzschluss schon bei **19** |
| Vorentladung Episch (0,15× je Serienpunkt) | Serie 38 |
| Spannungsstau Normal (0,05× je Sieg ohne Crit) | 115 Siegen in Folge |
| Entladung Normal (0,02× je volle Leiste) | **288 vollen Leisten** |

Ein Doppelentladung/Resonanz-Bau erreicht 19 Stapel mühelos. Ab da ist jeder weitere Punkt Crit-Multiplikator, aus
welcher Quelle auch immer, exakt null wert — und das erklärt vier der sechs schwächsten Blitz-Skills.

**Es geht tiefer als §7.31.** Ein Stapel zahlt ZWEIERLEI: +75 Basis-Score und +0,15× Crit-Multiplikator. Über dem
Deckel bleibt nur der Score. Der harte Deckel halbiert also die Auszahlung der **Kernressource der Fraktion**, nicht
nur den Wert von vier Skills — was auch Ladungsserie erklärt (−11 % bei 100 % Haltequote): sie beschleunigt die
Leiste, die Leiste macht Stapel, und Stapel sind ab Nummer 19 nur noch halb so viel wert.

#### B · Der weiche Deckel

```
m > CRIT_MULT_CAP  →  CRIT_MULT_CAP + (m − CRIT_MULT_CAP) × CRIT_MULT_SOFT_SLOPE
```

`CRIT_MULT_SOFT_SLOPE = 0,2`, dieselbe Form wie das vorhandene `WIN_SOFTCAP`. Eine Quelle (`softCritMult` in
`constants.js`), die Motor UND Anzeige lesen — sonst driften sie wieder auseinander wie in §7.39.

| gebaut | 10× | 16× | 36× |
| --- | --- | --- | --- |
| gezahlt | 8,4 | 9,6 | 13,6 |

**`SLOPE = 0` stellt exakt den alten harten Deckel wieder her** — der Rückweg braucht keine Codeänderung, nur eine 0.

#### C · Entladung von der Multiplikator- auf die Score-Achse

Vier Skills sagten dasselbe (Entladung, Spannungsstau, Vorentladung, Gewitterfronts Episch-Anhang). Behalten hat die
Achse **Vorentladung** — die einzige, die eine Entscheidung verlangt (Serie aufbauen und halten); die anderen sammeln
passiv.

Die volle Leiste zahlt schon in Rate (Blitzableiter, Reststrom), Kartenwert (Ionenfeld), Crit-Chance (Gewitterfront),
Stapel (Kettenblitz) und Multiplikator. Frei war allein der **Basis-Score**.

| | alt | neu |
| --- | --- | --- |
| Entladung | +0,02/0,03/0,04/0,06× Crit-Mult je Leiste | **+2/3/4/6 Basis-Score je Sieg**, dauerhaft |
| Episch-Extra | der Leisten-füllende Crit zählt ×2 Mult | **die Rampe zählt bei einem Crit doppelt** |

Eigener Zustand `lightning.entladungScore`; `entladungMult` bleibt bestehen, wird aber nur noch von Gewitterfronts
Episch-Anhang gespeist. **Startwerte, NICHT gemessen** — wie viele volle Leisten ein Lauf hat, ist nicht erhoben.

#### D · Gewitterfront bleibt vorerst

Ihr Episch-Anhang (+0,02× Crit-Mult) steht jetzt allein auf der Achse. Er war nie ihre Identität — sie ist der
Crit-Chance-Skill — aber er war NICHT Teil der drei abgenommenen Punkte. Offen, Owner-Entscheid.

#### E · Wächter

Drei, alle gegengeprobt:

- der Backstop ist weich: der Überschuss kommt an, aber gedämpft, wächst linear mit der Steigung, und unter dem Knick
  ändert sich nichts (macht man `softCritMult` wieder hart, fällt er),
- Entladungs Rampe zahlt Basis-Score und fasst den Multiplikator NICHT an; Episch verdoppelt sie bei einem Crit,
- die Stufenleiter trägt `scorePerBar` und darf `multPerBar`/`fillDouble` auf keiner Stufe zurückbekommen.

---

### 7.43 Spannungsfeld ersetzt den Spannungsstau (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

Vier Entwürfe sind vorher gefallen, und jeder aus einem Grund, der hier festgehalten gehört, weil er sich sonst
wiederholt.

#### A · Was nicht ging und warum

**Der Stau umgehängt.** Sein Auslöser ist „Sieg ohne Crit", wird also seltener, je besser der Build läuft — §7.31 maß
ihn mit 0,00× gebaut. Ein Skill, der sich abschaltet, sobald die Fraktion funktioniert, ist an jeder Achse falsch.

**Kondensator (Leiste länger, Ionisierung größer).** Owner: „das ist nur ionisiere mehr Karten mit extra Steps." Er
hat recht — mehr Stapel je Leiste bei längerer Leiste ist derselbe Regler in neuer Verpackung. Dazu zwei harte
Zahlenprobleme, die beide erst beim Rechnen auffielen:

- Ein **prozentualer** Aufschlag ist unlesbar auf einer Leiste, die der Spieler als Kästchen abzählt.
- Ein **flacher** Aufschlag ist relativ zum Build. Reststrom Episch (Boden 6, Leiste 9) mit Blitzableiter Episch
  (Rückgabe 2) braucht **1 Ladung je Leiste**; „+5 lang" macht daraus 6, also ein Sechstel der Rate für doppelte
  Stapel. Der Preis wäre in dem Build, der am meisten Stapel will, am höchsten gewesen.

**Der erste Episch-Anhang** („Ladung über der Leiste geht nicht verloren") war ein Nichts: die Leiste fällt bei jeder
Füllung auf den Boden zurück, ein Stich bringt höchstens 1–3 Ladung, es gibt also nichts zu sparen.

**Der zweite** („sind alle Karten der Formation ionisiert, zählt sie doppelt") war eine Zeitschaltuhr. Die Leiste
ionisiert **die nächste Karte in der Reihenfolge** und läuft am Deck-Ende wieder vorne los, Stapel verschwinden nie —
die Bedingung wird also irgendwann von allein wahr und danach nie wieder falsch. Auch das Wort „volle Formation" gab
es im Spiel nicht; der Owner hat beides zurückgewiesen.

#### B · Das Loch, das die Lösung gefunden hat

Die Score-Kette ist

```text
(Basis + Flats) × Serie × Perk × Formation × Nachhall × Kern × fireMult × plantMult × architectMult × Crit
```

Feuer hat darin einen eigenen Faktor, Pflanze hat einen, **Blitz hatte keinen**. Alles, was die Fraktion tut, landet
in Basis-Score, Kartenwert oder Crit. Owners Vorgabe — „etwas das pro Stapel einen Bonus gibt, eventuell auf
Formation" — trifft genau diese Lücke.

#### C · Der Skill

**Spannungsfeld** (SK_LIGHTNING_13): „Gewinnst du mit einer Karte in einer Formation, zählt der Stich +X % je Stapel
dieser Formation."

| Stufe | je Stapel der Formation |
| --- | --- |
| Normal | +0,3 % |
| Selten | +0,4 % |
| Sehr selten | +0,5 % |
| Episch | +0,7 %, dazu +1 Stapel auf die Karte mit den wenigsten Stapeln der Formation je Sieg |

Zwei Festlegungen, die im Kartentext nicht stehen:

- **Jede Karte zählt genau einmal**, auch wenn die Siegkarte in mehreren Formationen der Position hängt. Sonst zahlt
  eine Karte in drei Formationen dreifach für sich selbst; Resonanz zählt aus demselben Grund so.
- Gelesen wird die **echte** Siegkarte, nicht die Resonanz-Sicht. Die trägt die Formationssumme schon in `ionStacks`
  — sonst stünde dieselbe Zahl zweimal im selben Produkt.
- Der Episch-Stapel läuft **nicht** durch Doppelentladung. Das ist keine Ionisierung durch die Leiste.

Der Skill zahlt für **gestreute** Stapel: eine Dreier-Formation, in der alle drei Karten Stapel haben, zahlt dreimal
so viel wie dieselbe Formation mit einer tiefen Karte und zwei leeren. Damit steht er gegen Kurzschluss und
Kettenblitz, die Tiefe wollen — die Entscheidung, die Blitz gefehlt hat.

#### D · Was das kostet

`stauBonus` ist aus dem Substate raus, `stauAfterWin` gestrichen, die beiden Reducer-Zeilen, die den Stau beim
Ersetzen leerten, entfallen. Neu: `formationStacks`, `lightFormMult`, `feldFeed` im Blitz-Modul, `lightMult` als
eigener Faktor im Produkt und im Breakdown.

#### E · Wächter

Drei, alle gegengeprobt:

- `formationStacks` zählt jede Karte einmal über absichtlich überlappende Formationen (gibt man die Vereinigung auf,
  fällt er),
- `lightMult` steht im **Produkt**, nicht nur im Breakdown — der Stich zahlt genau um den Faktor mehr (nimmt man ihn
  aus `scoreBeforeCrit`, fällt er),
- die Episch-Nachladung trifft die Karte mit den wenigsten Stapeln und wird von Doppelentladung NICHT vervielfacht.

**Startwerte, NICHT gemessen.** Die Zahl mit dem größten Risiko ist das Episch: eine Dreier-Formation mit je 20
Stapeln zahlt +84 % auf den Stich, während Kurzschluss als ganzer Skill +56 % misst.

---

### 7.44 Der Chance-Überschuss wird sichtbar und zahlt dreifach (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

**Owner:** „mit dem Umbau von crit multi das er weniger über 8 gibt können wir auch den Deckel von 100 % crit Chance
so nutzen das alle 5 % mehr crit etwas mehr crit multi geben, das hilft bei Gewitterfront und auch dem skill der crit
Chance pro Stapel auf der Karte gibt." Dann: „die crit Chance darf dann auch nicht mehr über 100 % anzeigen."

#### A · Die Regel gab es schon, sie war nur wirkungslos

`overcritMult` zahlte bereits +0,01× Crit-Mult je Prozentpunkt über 100 % (§7.28, derselbe Owner-Entscheid,
0,002 → 0,01). Zwei Gründe, warum sie sich nicht anfühlte:

1. **Sie war unsichtbar.** Kein Kartentext, kein Glossareintrag, keine Zeile in der Statusleiste.
2. **Der weiche Deckel frisst sie.** Der Bonus wird auf `critMultiplier` addiert und läuft danach durch
   `softCritMult` — ein Build über dem Knick bekommt **ein Fünftel**. Also genau die Builds, die Chance über 100 %
   stapeln (Blitz), bekommen am wenigsten zurück. Das ist eine Wechselwirkung aus §7.42, die dort nicht bedacht war.

#### B · Was gebaut ist

`OVERCRIT_MULT_PER_PP` **0,01 → 0,03**, also +0,15× je 5 Punkte. Der Satz ist so gewählt, dass **5 Punkte
Crit-Chance genau einen Stapel wert sind** (`ION_CRIT_MULT_PER_STACK` = 0,15) — eine merkbare Äquivalenz, und
oberhalb des Knicks gibt sie ungefähr das zurück, was der weiche Deckel wegnimmt.

| Crit-Chance | vorher | jetzt | davon über dem Knick |
| --- | --- | --- | --- |
| 150 % | +0,5× | +1,5× | +0,3× |
| 200 % | +1,0× | +3,0× | +0,6× |

Linear, keine Treppe: bei 103 % gibt es +0,09×, nicht null. Eine Treppe je 5 Punkte hätte eine tote Zone erzeugt;
Feuer stuft nur deshalb, weil die Hitzeleiste selbst in Zehnerschritten steht.

Die Statusleiste zeigt die Chance jetzt **höchstens 100 %** und den Überschuss als Unterzeile
(`+{pp} über 100 % · +{mult}× Mult`). Bis dahin stand dort die rohe Zahl (#181) — der Überschuss war sichtbar, aber
nicht als das, was er tut. Die Anzeige rechnet nicht mehr selbst: `displayCritChance` und `critChanceOverPP` liegen
neben `totalCritMult` in `perks.js`, derselbe Griff wie in §7.39, damit Motor und Anzeige eine Quelle behalten.

#### C · Ein Nebeneffekt, der beim Rechnen auffiel

Ein Punkt **unter** 100 % wandelt 1 % der Stiche von ×1 auf ×M, bringt also (M−1)/100. Ein Punkt **über** 100 %
bringt den Satz. Die beiden sind gleich viel wert bei **M = 4**:

- Build mit 8× Multiplikator: ein Punkt darunter bringt 0,07, darüber 0,03 → darunter bleibt deutlich besser.
- Build mit 3× Multiplikator: darunter 0,02, darüber 0,03 → **darüber ist besser**.

Für Builds mit niedrigem Crit-Multiplikator lohnt es sich also, die Chance absichtlich zu überschießen, statt sie zu
erreichen. Praktisch trifft das kaum jemanden — wer über 100 % Chance baut, hat fast immer auch Stapel und damit
einen hohen Multiplikator — aber es ist eine echte Umkehrung und gehört notiert. Bei 0,02 läge der Kipppunkt bei
M = 3, bei 0,01 bei M = 2 (praktisch nie).

#### D · Der alte Wächter ist gefallen, nicht aufgeweicht

Die bisherige Invariante hieß „100 Punkte über 100 % dürfen den Multiplikator um höchstens ein Achtel des Deckels
heben, sonst wird die Regel selbst zur Crit-Quelle" — bei 0,03 sind es drei Achtel. Sie wurde **nicht gelockert,
sondern durch die Aussagen ersetzt, die noch stimmen**:

- am Knick ist ein Punkt über 100 % weniger wert als ein Punkt darunter (`< (CRIT_MULT_CAP − 1) / 100`),
- die Regel allein bleibt unter dem Knick (`100 × Satz < CRIT_MULT_CAP`).

Dazu zwei neue Anzeige-Wächter, beide gegengeprobt: die Anzeige-Chance erreicht 100 % und geht nie darüber, und der
Überschuss steht mit genau `OVERCRIT_MULT_PER_PP` je Punkt im Multiplikator.

**Die Regel hat weiterhin keinen Deckel.** Bei 400 % Chance wären das +9×. Bei 0,01 egal, bei 0,03 nicht mehr — die
Zahl, auf die bei der Messung zu schauen ist.

---

### 7.45 Die Anzeige zeigt die wirksame Stufe, nicht die gewürfelte (2026-09-10, Owner) — umgesetzt

**Owner:** „überall bei dem Skill auch die neue Rarität angezeigt wird, Skillauswahl, Panels usw."

#### A · Der Fehler war größer als das Badge

`tierOf(state, id)` gibt die **gewürfelte** Stufe und weiß nichts von Hochspannung; die Engine rechnet über
`boostedTier`. Seit §7.39 hebt Hochspannung jede gehaltene Stufe um eins, in jeder Fraktion — und die Oberfläche
zeigte das nirgends.

Das Badge war dabei das kleinere Problem. `skillDef(id, tier)` wählt den **Text** dieser Stufe: ein von Hochspannung
gehobener Skill zeigte „SELTEN" und beschrieb die Selten-Zahlen, während der Stich mit den Episch-Zahlen abrechnete.
**Die Beschreibung log den Spieler an.**

#### B · Was umgestellt ist

Neu in `skills.js` neben `boostedTier`: `effectiveTierOf(state, id)` und `tierIsLifted(state, id)` — eine Quelle für
alle Oberflächen, derselbe Griff wie bei `totalCritMult` (§7.39) und `displayCritChance` (§7.44).

| Oberfläche | liest jetzt |
| --- | --- |
| Gehaltene Skills (`HeldSkills`) | wirksame Stufe, Badge **und** Text |
| Skillauswahl: Bestandsliste und Ersetzen-Liste | wirksame Stufe |
| Skillauswahl: **Angebot** | wirksame Stufe (Owner: „dort auch schon anzeigen") |
| Bauplan-Panel (`SkillList`) | wirksame Stufe |
| Chronik-Detail, Lauf-Statistik | wirksame Stufe |
| **Skill aufwerten** (`SkillUpgrade`) | **gewürfelte Stufe** |

Das Angebot rechnet nicht über `effectiveTierOf`, sondern über `boostedTier(state.skills, rolledTier)` — die
Angebotsstufe steht in `state.skillOfferTiers`, nicht in `skillTiers`. Liegt Hochspannung im Bau, zeigt die Karte
also, was man **bekommt**, statt was gewürfelt wurde.

**Die Ausnahme ist keine Nachlässigkeit.** Im Aufwert-Screen bezahlt man dafür, die gewürfelte Stufe zu heben.
Stünde dort die wirksame, zeigte ein gehobener Skill fälschlich „höchste Stufe" und `upgradeBuy` rechnete den
falschen Preis. Ein Kommentar an der Zeile sagt das, damit es beim nächsten Umbau nicht „mitgezogen" wird.

#### C · Die Marke

Ohne Kennzeichnung sieht ein gehobenes Selten aus wie ein gewürfeltes Episch — und fällt scheinbar grundlos zurück,
sobald Hochspannung ersetzt wird. `SkillTierBadge` bekommt `lifted` und hängt ein gedämpftes **„gehoben"** an, in
derselben Form wie das vorhandene „gehalten" daneben. Kein neues Symbol.

#### D · Wächter

Drei, alle gegengeprobt:

- `effectiveTierOf` liefert dieselbe Zahl wie die Stufenfunktion des Motors, und `descTiers` wandert mit,
- `tierIsLifted` meldet nur, wenn wirklich gehoben wurde (Episch bleibt Episch, Legendäre haben keine Stufe),
- **die fünf Oberflächen lesen `effectiveTierOf` und keine davon `tierOf`** — der Aufwert-Screen genau umgekehrt.
  Der letzte prüft den Quelltext, weil dort der Rückfall passiert: ein `tierOf` schleicht sich beim nächsten Umbau
  in eine Anzeige zurück, und keine Zahl im Spiel würde sich ändern, nur der Text würde wieder lügen.

---

### 7.46 §7.42/§7.43/§7.44 nachgemessen: der Stapel hat drei Achsen bekommen (2026-09-10) — gemessen

Blitz-Mono, 12.050 Läufe je Variante, Parameter der §8-Baseline, dieselbe Zeile wie §7.41
(`node sim/survey.js --fraktion lightning --groesse 1 --explore 900 --runs 175 --cross 500 --seed 1`).

**Die Basis `blitz-mono2` liegt VOR §7.42.** In dieser Messung stecken deshalb drei Zahlenänderungen, nicht zwei —
das ist beim Aufsetzen fast untergegangen und wäre derselbe Fehler wie in §7.41, wo zwei Änderungen nicht trennbar
waren. Diesmal sind sie getrennt worden.

#### A · Die Zahl

| | §7.41 (Basis) | jetzt |
| --- | ---: | ---: |
| Bl mono Median | 415.748.556 | **3.115.597.844** |
| p95 / Median | 8× | **120×** |
| max / Median | 172× | **1.138×** |
| Siegquote | 68,6 % | 66,9 % |

7,5× über der Basis. Der Median ist dabei nicht einmal das Schlimme: die Verteilung ist von „breit" auf
**„weglaufend"** gekippt. Ein Lauf im oberen Zwanzigstel zahlt jetzt das 120-fache des mittleren.

#### B · Welche der drei war es — das 2×2

Zwei der drei Änderungen haben einen ENV-Regler und lassen sich einzeln zurückdrehen: `SIM_CRIT_MULT_SOFT_SLOPE=0`
stellt den harten Deckel aus der Zeit vor §7.42 wieder her (so in §7.42 als Rückweg gebaut), `SIM_OVERCRIT_MULT_PER_PP=0.01`
den Satz vor §7.44.

| Median | Überschuss 0,01 (alt) | Überschuss 0,03 (§7.44) |
| --- | ---: | ---: |
| **harter** Deckel (vor §7.42) | **523.458.186** | 1.691.611.064 |
| **weicher** Deckel (§7.42) | 4.491.542.696 | **3.115.597.844** (Ist-Stand) |

Mit beiden Deckeln zurück steht Blitz bei **523M gegen 416M Basis**. Der einzige Unterschied dieser Zelle zur Basis
ist Spannungsfeld: **§7.43 allein kostet +26 %**, und der Skill misst dort +45 %. Das ist ein normaler, gesunder
Skill. Der Ausschlag kommt nicht von ihm.

**§7.44 lässt sich aus diesen Zahlen nicht sauber ablesen** — die zwei Zellen sagen ×3,2 und ×0,7, also nicht
einmal dasselbe Vorzeichen. Der gierige Spieler lernt seine Wertetabelle je Variante NEU, und eine geänderte
Crit-Chance kippt andere Stiche in Crits (§7.28 F). Unterschiede unter rund Faktor 2 sind in dieser Messreihe nicht
interpretierbar. Belastbar ist nur: §7.44 ist nicht der Treiber, in keiner Zelle.

#### C · Der Treiber ist der weiche Deckel, und Kettenblitz ist der Zeuge

**Kettenblitz: +5 % (Basis) → +601 % (Ist-Stand) → +11 % (beide Deckel zurück).** Er ist der einzige Blitz-Skill,
der reine TIEFE auf EINER Karte macht — jede volle Leiste legt auf die Karte mit den meisten Stapeln nach.

Vorher zahlte Tiefe genau einmal. Der Crit-Multiplikator klemmte **ab Stapel 39** hart bei 8×, jeder weitere Stapel
war auf dieser Achse tot; nur der Basis-Score lief weiter. Das, und nicht eine zu kleine Zahl, war der Grund für die
+5 % in §7.41.

Jetzt zahlt derselbe Stapel dreimal, und keine der drei Achsen hat noch eine Obergrenze:

| Achse | je Stapel | Deckel |
| --- | ---: | --- |
| Basis-Score (`ION_SCORE_PER_STACK`) | +75 | hatte nie einen |
| Crit-Multiplikator (`ION_CRIT_MULT_PER_STACK`) | +0,15 | seit §7.42 weich, also praktisch keiner |
| `lightMult` (Spannungsfeld) | +0,3 bis +0,7 % | neu in §7.43, keiner |

Die drei stehen als **Produkt** in der Score-Formel. Mit den echten Funktionen nachgerechnet (kein Simulationslauf),
eine Karte mit S Stapeln in einer Dreier-Formation, Spannungsfeld Episch:

| Stapel S | Crit-Mult hart | Crit-Mult weich | `lightMult` | Stich vorher | Stich jetzt | Faktor |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 8,00× | 8,35× | 1,350× | 33.200 | 46.781 | 1,41× |
| 100 | 8,00× | 9,85× | 1,700× | 63.200 | 132.286 | 2,09× |
| 200 | 8,00× | 12,85× | 2,400× | 123.200 | 474.936 | 3,86× |
| 400 | 8,00× | 18,85× | 3,800× | 243.200 | 2.177.552 | **8,95×** |

Aus **linear** ist **kubisch** geworden, und die letzte Spalte läuft weiter. Genau das erzeugt den Schwanz: ein Lauf,
der zufällig tief stapelt, gewinnt nicht 30 % mehr, sondern das Zehnfache. Stapel verschwinden nie und wachsen über
50 Runden monoton — die Kurve wird also in jedem langen Lauf abgefahren, nicht nur in Ausreißern.

#### D · Was ich in §7.43 falsch konstruiert habe

§7.43 C behauptet, Spannungsfeld zahle für **gestreute** Stapel und stehe damit gegen Kurzschluss und Kettenblitz,
die Tiefe wollen — „die Entscheidung, die Blitz gefehlt hat".

**Das stimmt nicht.** `formationStacks` bildet die SUMME der Stapel über die Formation, und eine Summe unterscheidet
nicht, ob sie aus drei Karten mit je 20 Stapeln kommt oder aus einer mit 60. Der Vergleich in §7.43 C („dreimal so
viel wie dieselbe Formation mit einer tiefen Karte und zwei leeren") hält nur, wenn man die tiefe Karte künstlich
auf der Tiefe der anderen einfriert. Real macht Kettenblitz die eine Karte tief, und Spannungsfeld zählt sie voll
mit. Der Skill steht nicht gegen Kettenblitz — **er multipliziert mit ihm.**

Die Entscheidung, die Blitz fehlen sollte, ist damit nicht gebaut. Der eigene Multiplikator (der strukturelle Fund
aus §7.43) ist gebaut und wirkt; die Streu-Bedingung ist es nicht.

#### E · Der Überschuss über 100 %, gemessen

Sonde `sim/probes/overcrit-probe.mjs`, 120 Läufe. Blitz mono, Runden 41–50: **31 % der Stiche liegen über 100 %
Crit-Chance, im Mittel 52 Punkte darüber** — bei 0,03 also +1,56× Multiplikator. Im Zufallsmix sind es 5 % der
Stiche. Die in §7.44 notierte Sorge (400 % Chance wären +9×) tritt im gierigen Lauf nicht ein; die Regel hat
weiterhin keinen Deckel, ist aber nicht das Problem dieser Runde.

#### F · Neue Sonde

`sim/probes/spannungsfeld.mjs` bildet je Formations-Sieg die Sicht des Skills nach (`formationStacks`, also die
Vereinigung, jede Karte einmal) und meldet je 10-Runden-Block, wie viele Karten in der Formation hängen, wie viele
davon ionisiert sind, die Stapelsumme und die tiefste Karte. 100 Läufe, Blitz mono, Fraktions-Policy:

| Runden | gehalten | Ø Mitglieder | Ø davon ionisiert | Ø Stapelsumme | Ø tiefste Karte |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1–10 | 13 % | 3,76 | 0,15 | 0,2 | 0,2 |
| 11–20 | 28 % | 4,07 | 0,85 | 1,7 | 1,1 |
| 21–30 | 48 % | 4,17 | 2,00 | 6,0 | 3,3 |
| 31–40 | 64 % | 4,35 | 3,37 | 21,3 | 10,4 |
| 41–50 | 78 % | 4,60 | 4,40 | 67,1 | 33,0 |

Runden 41–50 je Formations-Sieg: Mitglieder Median 4,0 / p99 40 (die Formation ist durch das Brett begrenzt) —
**Stapelsumme Median 24, p99 1.423, max 2.577.** Die zwei Spalten sind der ganze Unterschied: die Mitgliederzahl
hat eine Obergrenze, die Stapelsumme nicht. Und **spät ist fast jedes Mitglied ohnehin ionisiert** (4,40 von 4,60),
die Streu-Bedingung greift also früh und mittig und sättigt gegen Ende.

#### G · Was offen ist

Alles Owner-Entscheide, nichts davon umgesetzt:

1. **Die Tiefe einer Karte hat keinen Gegenspieler.** Drei Achsen, kein Deckel, Produkt. Ein harter Deckel zurück
   widerspricht der Owner-Regel „Deckel sind frustrierend" und war der Grund für §7.42; die Alternativen wären eine
   flachere Rest-Steigung (`CRIT_MULT_SOFT_SLOPE` 0,2 → kleiner), ein zweiter Knick weit oben, oder eine
   abnehmende Wirkung der Stapel EINER Karte an der Wurzel (`effectiveStacks`).
2. **Spannungsfelds Streu-Bedingung fehlt** (D). Zählte der Skill etwa die ionisierten KARTEN der Formation statt
   der Stapelsumme, wäre die Entscheidung gebaut und eine Achse aus dem Tiefen-Produkt heraus.
3. **Die Rauschgrenze dieser Messreihe ist rund Faktor 2** (B). Für kleinere Effekte braucht es mehr Läufe oder
   feste Builds statt des gierigen Spielers.
4. Unverändert offen: Gewitterfronts Episch-Anhang steht seit §7.42 allein auf der Crit-Mult-Achse, und Hochspannung
   lässt sich mono weiterhin nicht beurteilen (§7.41 C) — dafür braucht es die Misch-Welten.

---

### 7.47 Spannungsfeld zählt Karten statt Stapel (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

**Owner-Entscheid** auf die zwei Vorschläge aus §7.46 G: nur Nummer 2 (die Streu-Bedingung nachbauen). Der weiche
Crit-Deckel bleibt vorerst, wie er ist.

#### A · Was sich ändert

`lightFormMult` liest nicht mehr die Stapel**summe** der Formation, sondern die Zahl der ionisierten **Karten**.

| Stufe | vorher (§7.43) | jetzt |
| --- | --- | --- |
| Normal | +0,3 % je Stapel | **+2 % je ionisierter Karte** |
| Selten | +0,4 % | **+3 %** |
| Sehr selten | +0,5 % | **+4 %** |
| Episch | +0,7 % | **+6 %**, Anhang unverändert |

Der Episch-Anhang (+1 Stapel auf die Karte mit den wenigsten Stapeln der Formation) bleibt Wort für Wort stehen —
und passt jetzt erst richtig: er macht aus einer dunklen Karte eine leuchtende, also genau das, wofür der Skill
zahlt. Vorher war er eine von vielen Stapelquellen unter anderen.

#### B · Warum, in einer Zeile

Eine Summe kann ins Unendliche wachsen, eine Kartenzahl nicht. Gemessen (§7.46 F, Runden 41–50):

| | Median | p99 | Obergrenze |
| --- | ---: | ---: | --- |
| Stapelsumme der Formation | 24 | **1.423** | keine |
| ionisierte Karten der Formation | 4 | 40 | **das Brett** |

Damit hängt `lightMult` nicht mehr an der Tiefe EINER Karte und multipliziert sich nicht mehr mit den beiden anderen
Stapel-Achsen (Basis-Score, Crit-Multiplikator). Aus dem kubischen Ausschlag aus §7.46 C wird ein quadratischer.

#### C · Warum diese Sätze

Der Satz je Karte ist so gewählt, dass der **Normalfall gleich bleibt und nur der Ausreißer fällt**:

| | Median (4 Karten) | p90 (5) | Extremfall |
| --- | ---: | ---: | ---: |
| vorher, Episch 0,7 % je Stapel | +17 % | +76 % | **+996 %** |
| jetzt, Episch 6 % je Karte | +24 % | +30 % | **+240 %** |

#### D · Der Preis, offen benannt

**Spät sättigt der Skill.** In den Runden 41–50 sind 4,40 von 4,60 Mitgliedern ohnehin ionisiert (§7.46 F) — dort
ist „je ionisierter Karte" praktisch „je Formationsmitglied", und der Skill misst dann die Formationsgröße, nicht
mehr die Streuung. Die Bedingung greift **früh und mittig** (Runden 21–30: 2,00 von 4,17). Das ist der Punkt, an dem
die Obergrenze entsteht, aber es heißt auch: der Skill wird gegen Ende zu einem Formations-Skill.

**Und der Umbau reicht nicht allein.** Er nimmt eine der beiden offenen Achsen heraus, nicht beide. Mit den echten
Funktionen nachgerechnet, eine Karte mit S Stapeln:

| S | vor §7.42 | §7.46-Stand (kubisch) | jetzt (quadratisch) | Rest gegenüber vorher |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 63.200 | 132.286 | 96.491 | 1,53× |
| 200 | 123.200 | 474.936 | 245.384 | 1,99× |
| 400 | 243.200 | 2.177.552 | 710.570 | **2,92×** |

**Blitz landet damit nicht wieder bei 416M.** Der Rest ist der weiche Crit-Deckel und steht weiter offen (§7.46 G 1);
gerechnet, aber nicht gemessen, würde eine Rest-Steigung von 0,05 statt 0,20 den Faktor bei S = 400 auf 1,66× bringen.

#### E · Wächter

Drei, alle gegengeprobt, indem die Naht absichtlich auf die Stapelsumme zurückgedreht wurde — beide neuen fallen:

- `lightFormMult` zählt Karten: dieselben drei Mitglieder einmal mit Stapelsumme 6 und einmal mit 501 geben
  **denselben** Faktor; eine dunkle Karte zählt nicht mit; leuchtet keine, ist der Faktor 1,
- derselbe Vergleich im Motor (`breakdown.lightMult` über `resolveTrick`, Deck hundertfach tiefer),
- die Stufentabelle trägt `perCard` aufsteigend, und **`perStack` darf nicht zurückkommen** — das war die
  Tiefen-Lesart, und ein stiller Rückfall dorthin würde keinen Text im Spiel ändern.

---

### 7.48 §7.47 nachgemessen: der Schwanz sitzt, der Skill ist tot (2026-09-10) — gemessen

Blitz-Mono, 12.050 Läufe, dieselbe Zeile wie §7.41/§7.46. Genau **eine** Änderung seit §7.46 (Spannungsfeld liest
Karten statt Stapel), die Zahl ist also sauber zuzuordnen.

#### A · Die Verteilung: das Ziel ist getroffen

| | Basis (vor §7.42) | §7.46 | jetzt |
| --- | ---: | ---: | ---: |
| Median | 415.748.556 | 3.115.597.844 | **1.639.303.628** |
| p90 | 1,89 Mrd | 84,4 Mrd | **20,9 Mrd** |
| p95 | 3,44 Mrd | 374,9 Mrd | **35,3 Mrd** |
| max | 71,5 Mrd | 3.545 Mrd | 3.425 Mrd |
| Siegquote | 68,6 % | 66,9 % | **70,0 %** |

**p95 ist auf ein Zehntel gefallen** (375 → 35,3 Mrd), p90 auf ein Viertel, der Median auf die Hälfte. Der
Körper der Verteilung ist eingefangen, und die Siegquote ist die höchste aller vier Messungen.

**Der max hat sich nicht bewegt** (−3 %). Das ist keine Überraschung, sondern die Vorhersage aus §7.47 D: der
Umbau nimmt EINE der zwei Achsen heraus. Der eine Extremlauf lebt vollständig auf der anderen — Basis-Score ×
Crit-Multiplikator, beide linear in der Stapeltiefe, beide ohne Deckel. `max/Median` steht deshalb rechnerisch
schlechter da als vorher (2.089× statt 1.138×), aber nur, weil der Median gefallen ist und der Ausreißer nicht.

Blitz steht damit bei **3,9× der Basis** statt 7,5×. Wie angekündigt: nicht zurück auf 416M.

#### B · Der Preis: der umgebaute Skill misst nichts mehr

**Spannungsfeld +139 % → +3 %**, Haltequote 100 % → 66 %, Explore-Lift 1,014 → 0,867. Je Stufe:

| Stufe | Satz | Lift |
| --- | ---: | ---: |
| Normal | 2 % | **0,52** |
| Selten | 3 % | **0,60** |
| Sehr selten | 4 % | 1,22 |
| Episch | 6 % | 1,43 |

**Unter „Sehr selten" ist der Skill keinen Platz wert.**

Der Fehler liegt bei mir, und er ist benennbar: ich habe den Satz am **Median** der alten Auszahlung geeicht
(+17 % → +24 %) und daraus geschlossen, der Normalfall bleibe gleich. Der Median war aber nie, wo der Wert des
Skills lag. Die gemessenen +139 % kamen fast vollständig aus genau dem Schwanz, den der Umbau absichtlich
abschneidet (p99 der alten Stapelsumme: 1.423 Stapel = +996 % auf den Stich). Ein Skill, dessen Wert im
99. Perzentil steckt, verliert seinen Wert, wenn man das 99. Perzentil kappt — das hätte ich vorher sehen können,
statt „der Median liegt leicht über heute" zu berichten.

Die Bauform selbst ist davon nicht widerlegt: die Kartenzahl ist begrenzt und tut, was sie soll. Nur die Leiter
ist zu flach.

#### C · Was der Umbau sonst bewegt hat

| Skill | Basis | §7.46 | jetzt |
| --- | ---: | ---: | ---: |
| Doppelentladung (L) | +235 % | +420 % | +330 % |
| Kettenblitz | +5 % | +601 % | **+238 %** |
| Hochspannung (L) | +92 % | +420 % | +217 % |
| Resonanz (L) | +170 % | +133 % | +213 % |
| Kurzschluss | +56 % | +106 % | +116 % |
| Blitzableiter | +2 % | +77 % | +54 % |

**Kettenblitz ist nicht repariert, nur gedämpft** (+601 → +238 %). Er steht weiter als zweitstärkster normaler
Skill weit über seinem Basiswert von +5 %, weil seine beiden verbleibenden Achsen offen sind. Das ist derselbe
Befund wie beim max in A, an einem anderen Zeugen.

Drei Skills sind mitgefallen, ohne angefasst worden zu sein: Lichtbogen +3 → −10 %, Serienschutz 0 → −15 %,
Blitzfänger +13 → −4 %. Alle drei hängen an der Stapeltiefe der gespielten Karte, deren Auszahlung mit dem
Wegfall des Feld-Faktors kleiner geworden ist.

#### D · Was offen ist

1. **Die Leiter des Spannungsfelds ist zu flach** (B). Eine Verdopplung auf **4/6/8/12 %** hielte die Obergrenze
   intakt (die Kartenzahl bleibt begrenzt) und brächte Normal auf +16 % je Formations-Sieg statt +8 %. Nicht
   gerechnet, ob das reicht — die Beziehung zwischen Satz und gemessenem Effekt ist in dieser Reihe nicht linear
   und gehört gesweept, nicht geschätzt.
2. **Der weiche Crit-Deckel** (§7.46 G 1) ist weiter der Haupthebel und jetzt zweifach belegt: am unbewegten max
   und an Kettenblitz. Gerechnet, nicht gemessen: Rest-Steigung 0,20 → 0,05 bringt den Stich bei 400 Stapeln von
   2,92× auf 1,66× gegenüber vor §7.42.
3. Unverändert offen: Gewitterfronts Episch-Anhang (−6 % bei 95 % Haltequote), und Hochspannung ist mono
   weiterhin nicht beurteilbar (§7.41 C).

---

### 7.49 Der Deckel wird flacher, die Leiter bekommt einen Sweep-Griff (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

**Owner-Entscheid:** beides aus §7.48 D, aber die zwei Zahlen nicht gleichzeitig raten. Der Deckel ist gerechnet und
wird gesetzt; die Leiter wird **gesweept statt geschätzt**, weil ihr Satz in §7.47 schon einmal falsch geeicht war
und ein zweiter Schätzwert derselbe Fehler mit anderer Zahl wäre.

#### A · Der weiche Deckel: 0,20 → 0,05

`CRIT_MULT_SOFT_SLOPE`. Über dem Knick (CRIT_MULT_CAP = 8) zählt jeder weitere Punkt nur noch zu 5 % statt 20 %.
Kein harter Schnitt kommt zurück — die Regel behält die Form aus §7.42, sie wird nur flacher.

| Rest-Steigung | S = 100 | S = 200 | S = 400 | S = 400 ggü. vor §7.42 |
| --- | ---: | ---: | ---: | ---: |
| 0,20 (§7.42) | 96.491 | 245.384 | 710.570 | 2,92× |
| **0,05** | 82.899 | 175.922 | **403.818** | **1,66×** |

Belegt ist die Zahl zweifach: §7.48 A (der max hat sich durch §7.47 nicht bewegt, der Extremlauf lebt also ganz auf
dieser Achse) und §7.48 C (Kettenblitz +5 % Basis → +601 % → nach §7.47 immer noch +238 %).

**Systemregel, ausdrücklich:** `softCritMult` deckelt den Crit-Multiplikator **aller vier Fraktionen**, nicht nur
Blitz. In der Praxis trifft die Zahl fast nur Blitz, weil kaum ein anderer Bau über CRIT_MULT_CAP kommt — aber
gemessen wird sie hier nur an Blitz mono. Siehe D.

#### B · Der Sweep-Griff für die Leiter

Neu `SPANNUNGSFELD_SCALE` (Default 1), Form wie die vorhandenen `WURZELGEFLECHT_FACTOR_SCALE` und
`BAUMREIHE_FACTOR_SCALE`. `SIM_SPANNUNGSFELD_SCALE=2 node sim/survey.js …` fährt die ganze Leiter, ohne die Tabelle
anzufassen.

Ein Skalierer und keine vier Einzelsätze, weil die **Staffelung** der Stufen abgenommen ist und nur ihre **Höhe**
unsicher ist — §7.48 B hat gemessen, dass die Stufen 3 und 4 tragen (Lift 1,22 / 1,43) und die Stufen 1 und 2 nicht
(0,52 / 0,60). Das ist ein Höhen-, kein Formproblem.

**Der Regler sitzt in der TABELLE, nicht im Motor.** Sonst zeigte die Karte weiter 6 %, während der Stich mit 12 %
abrechnet — genau der Fehler, den §7.45 an der Stufenanzeige gefunden hat, und einer, der keine Zahl im Spiel
ändert und deshalb niemandem auffällt.

#### C · Wächter

- Die Leiter trägt `perCard` aufsteigend, `perStack` bleibt draußen (§7.47), und der Episch-Anhang hängt an der
  letzten Stufe,
- der Kartentext von Episch nennt genau den Tabellenwert,
- **`SPANNUNGSFELD_SCALE` bewegt Kennwert UND Kartentext zusammen** — der Wächter fragt ein zweites Node mit
  gesetztem ENV, weil die Konstante beim Laden gelesen wird, und prüft beide Seiten. Gegengeprobt: schiebt man den
  Regler in `lightFormMult`, verdoppelt sich die Zahl und der Text bleibt stehen — der Wächter fällt.

#### D · Bewusst offen (Owner)

Die **Kontrollmessung an Feuer und Eis** zum neuen Deckel bleibt draußen, bis der Owner sie anweist. Das ist ein
Entscheid, keine Lücke: der Deckel ist eine Systemregel, und dass ihre Wirkung auf die anderen drei Fraktionen
ungemessen ist, steht hier, damit es nicht später als Fund verkauft wird.

---

### 7.50 §7.49 nachgemessen: der Deckel sitzt, die Leiter bleibt unlesbar (2026-09-10) — gemessen

Vier Läufe à 12.050, dieselbe Zeile wie §7.41/§7.46/§7.48. Ein Punkt für den Deckel allein, dann drei für die Leiter
(`SIM_SPANNUNGSFELD_SCALE` 1 / 2 / 3), alle auf der neuen Rest-Steigung.

| Variante | Steigung | Leiter | Median | p90 | p95 | max | Sieg |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| vor §7.42 (Basis) | — | — | 415.748.556 | 1,89 Mrd | 3,44 Mrd | **71,5 Mrd** | 68,6 % |
| §7.48-Stand | 0,20 | ×1 | 1.639.303.628 | 20,93 Mrd | 35,33 Mrd | **3.425 Mrd** | 70,0 % |
| **Deckel 0,05** | 0,05 | ×1 | 1.014.231.310 | 6,67 Mrd | 10,23 Mrd | **73,7 Mrd** | 71,3 % |
| + Leiter ×2 | 0,05 | ×2 | 769.415.151 | 8,34 Mrd | 20,70 Mrd | 185,1 Mrd | 69,4 % |
| + Leiter ×3 | 0,05 | ×3 | 1.056.839.114 | 7,28 Mrd | 15,35 Mrd | 132,5 Mrd | 71,4 % |

#### A · Der Deckel sitzt, und der Beleg ist nicht der Median

Der Median fällt 1.639 → 1.014M (−38 %). **Das allein wäre nichts** — §7.46 B hat die Rauschgrenze dieser Reihe mit
rund Faktor 2 beziffert, und −38 % liegt darunter.

Der Beleg steht am anderen Ende der Verteilung, und dort ist er eindeutig:

| | §7.48 | Deckel 0,05 | Änderung |
| --- | ---: | ---: | ---: |
| p90 | 20,93 Mrd | 6,67 Mrd | **−68 %** |
| p95 | 35,33 Mrd | 10,23 Mrd | **−71 %** |
| max | 3.425 Mrd | 73,7 Mrd | **−98 %** |

**Der max ist auf Basisniveau zurück** (71,5 Mrd vor §7.42, jetzt 73,7 Mrd — Faktor 1,03). Drei Kennzahlen zeigen in
dieselbe Richtung und alle drei weit außerhalb des Rauschens. Damit ist die Diagnose aus §7.46 C und §7.48 A
bestätigt: der Extremlauf lebte vollständig auf der Crit-Deckel-Achse, und §7.47 konnte ihn nicht erreichen, weil er
die andere Achse angefasst hat. Die Siegquote steigt nebenbei auf 71,3 %, den höchsten Wert der ganzen Reihe.

#### B · Der Leiter-Sweep ist am Median nicht lesbar

1.014 → 769 → 1.057M. **Nicht monoton**, Spannweite Faktor 1,37 — also Rauschen, kein Signal. Der gierige Spieler
lernt seine Wertetabelle je Variante neu; das war in §7.46 B schon beziffert und gilt hier genauso.

Lesbar ist allein der **Skill-Effekt**, und der ist monoton:

| Leiter | Sätze | Effekt | Haltequote | Lift je Stufe |
| --- | --- | ---: | ---: | --- |
| ×1 | 2/3/4/6 % | +3 % | 55 % | 0,56 / 0,73 / 0,91 / 0,96 |
| ×2 | 4/6/8/12 % | +7 % | 59 % | 0,69 / 0,29 / 1,28 / 1,18 |
| ×3 | 6/9/12/18 % | **+26 %** | 62 % | 0,65 / 0,74 / 0,51 / 2,11 |

#### C · Was der Sweep NICHT gelöst hat

**Auch bei ×3 tragen die unteren drei Stufen nicht** (Lift 0,65 / 0,74 / 0,51). Der Wert des Skills sitzt bei ×3
vollständig in Episch (2,11). Verdreifachen hat also den Skill als ganzes angehoben, aber die Leiter nicht
begradigt — das ist nicht das, was §7.48 D erwartet hat.

Die Stufen-Lifts sind dabei selbst verrauscht: bei ×2 steht Stufe 2 auf 0,29 und Stufe 3 auf 1,28, bei ×3 Stufe 3
auf 0,51 unter Stufe 2. Eine monotone Leiter kann das nicht erzeugen; die Explore-Stichproben je Stufe (n ≈ 60–270)
tragen diese Auflösung nicht. **Sie sollten deshalb keinen Entscheid tragen.**

Die naheliegende Erklärung, ausdrücklich als **Vermutung und nicht gemessen**: die Arbeit macht der Episch-Anhang
(+1 Stapel auf die Karte mit den wenigsten Stapeln), nicht der Prozentsatz — er ist das einzige, was die unteren
drei Stufen nicht haben. Das ließe sich mit einem Lauf trennen, in dem `feedLowest` auf allen Stufen liegt.

#### D · Wo Blitz jetzt steht

Rund **1,0 Mrd gegen 416M Basis, also 2,4×** — und gegen das Feld aus §7.41 (Pf 367M · Ei 348M/224M · Fe 137M) rund
das Dreifache der Pflanze. Die Fraktion ist nicht eingefangen, sie ist nur nicht mehr weggelaufen: die FORM der
Verteilung stimmt wieder (max auf Basisniveau), die HÖHE nicht.

#### E · Offen

1. **Die Leiter ist nicht entschieden.** ×3 ist der beste gemessene Punkt (+26 %), lässt aber drei von vier Stufen
   unter Lift 1. Owner-Entscheid.
2. **Der Episch-Anhang als eigentlicher Träger** (C) — eine Messung, kein Umbau.
3. Die Höhe der Fraktion (D) ist ein eigener Posten und mit diesen zwei Reglern nicht zu holen.
4. Unverändert offen: Kontrollmessung des neuen Deckels an Feuer und Eis (§7.49 D, Owner hat sie ausgesetzt),
   Gewitterfronts Episch-Anhang, Hochspannung nur in Misch-Welten beurteilbar.

---

### 7.51 Blitz bekommt keinen eigenen Multiplikator, das Feld zieht auf die Crit-Chance (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

**Owner:** „lass den blitz mult raus. Blitz nutzt schon crit als mult. lass mir damit arbeiten."

#### A · Die Prämisse aus §7.43 war falsch

§7.43 hat als strukturellen Fund notiert: *„Blitz hatte keinen eigenen Multiplikator — Feuer hat `fireMult`,
Pflanze `plantMult`, Blitz zahlte nur in Basis-Score, Wert und Crit."*

Das letzte Wort dieser Aufzählung widerlegt den Satz. **Der Crit-Multiplikator IST die Multiplikator-Achse der
Fraktion**, und sie ist an dieselbe Kernressource gebunden wie alles andere: jeder Stapel der Siegkarte zahlt über
`ION_CRIT_MULT_PER_STACK` dorthin. Ich habe daneben eine zweite gestellt, und zwei Multiplikator-Achsen an
derselben Ressource sind genau das kubische Wachstum aus §7.46 C.

Die drei Runden §7.43 → §7.47 → §7.49 haben an den Symptomen dieser einen falschen Annahme gearbeitet.

#### B · Was raus ist

`lightMult` ist aus dem Score-Produkt, aus `glacierWinMult` und aus dem Breakdown verschwunden; `lightFormMult` aus
dem Blitz-Modul; `SPANNUNGSFELD_SCALE` aus den Konstanten (der Sweep-Griff aus §7.49 hat keinen Gegenstand mehr).
Die Sonde `sim/probes/spannungsfeld.mjs` ist gelöscht — ihr Messgegenstand existiert nicht mehr.

#### C · Wohin das Spannungsfeld zieht

Der Skill bleibt (die Owner-Untergrenze von 14 normalen Skills je Fraktion, §7.16, hält), aber auf der Achse, die
Blitz ohnehin hat:

| Stufe | vorher (§7.47) | jetzt |
| --- | --- | --- |
| Normal | +2 % Stich je ionisierter Karte | **+2 % Crit-Chance je ionisierter Karte** |
| Selten | +3 % | **+3 %** |
| Sehr selten | +4 % | **+4 %** |
| Episch | +6 %, Anhang | **+6 %**, Anhang unverändert |

**Es steht damit gegen Lichtbogen**, der eine Zeile höher in derselben Funktion sitzt und die **Tiefe EINER** Karte
belohnt (`critPerStack`). Streuung gegen Tiefe, auf einer Achse, die das Spiel schon hat — das ist die Entscheidung,
die §7.43 bauen wollte und mit einer zweiten Achse verfehlt hat.

Die Sätze sind aus §7.47 übernommen, jetzt aber in Prozentpunkten Crit-Chance. Die **100-%-Klemme deckelt sie von
selbst**; darüber zahlen sie über die Überschuss-Regel weiter (§7.44), also gedämpft statt verworfen. Gemessen
(§7.46 F) sind das mittig 2,0 und spät 4,4 ionisierte Karten — der Beitrag wächst also dort, wo Crit-Chance knapp
ist (Runden 21–30: Ø 32 % Roh-Chance), und sättigt dort, wo sie es nicht mehr ist. **Startwerte, nicht gemessen.**

`litCards` ist 0, wo die Formation nicht bekannt ist (Statusleiste) — dieselbe Bauform wie `card = null` bei
Lichtbogen: die Anzeige zeigt den Bau, nicht den Stich.

#### D · Wächter

Der neue hält beide Hälften der Owner-Entscheidung fest: **kein Blitz-Faktor im Breakdown** (geprüft über die
vollständige Liste der `*Mult`-Schlüssel, nicht nur über den alten Namen) und **die Stapel heben weiterhin den
Crit-Multiplikator**.

Gegengeprobt in der Form, die wirklich droht: ein `lightMult = 1` zurück in den Breakdown gelegt — ein Faktor, der
**keine einzige Zahl im Spiel ändert** und deshalb sonst niemandem auffiele. Der Wächter fällt darauf.

Dazu: die Stufentabelle trägt `critPerCard` aufsteigend, und **weder `perStack` (§7.43) noch `perCard` (§7.47)
dürfen zurückkommen** — beide waren Lesarten der zweiten Achse.

#### E · Was das für die Messreihe bedeutet

§7.43, §7.47 und §7.49-B (der Sweep-Griff) sind damit erledigt oder gegenstandslos. Was aus der Reihe **bleibt**:

- **§7.42/§7.49-A, der weiche Crit-Deckel bei 0,05** — er steht, und §7.50 hat ihn als den wirksamen Hebel belegt
  (max −98 %, zurück auf Basisniveau).
- **§7.44**, der Chance-Überschuss, ist jetzt sogar wichtiger: das Spannungsfeld zahlt auf die Chance, und über
  100 % wird daraus Crit-Multiplikator.
- Der Stand aus §7.50 (Median rund 1,0 Mrd, 2,4× der Basis) ist mit diesem Umbau **nicht mehr gültig** und muss neu
  gemessen werden.

---

### 7.52 §7.51 nachgemessen: die Fraktion ist auf dem Basisniveau angekommen (2026-09-10) — gemessen

Blitz-Mono, 12.050 Läufe, dieselbe Zeile wie §7.41/§7.46/§7.48/§7.50.

#### A · Jede Kennzahl liegt auf oder unter der Basis

| | Basis (vor §7.42) | §7.48 | §7.50 | **jetzt** | jetzt ÷ Basis |
| --- | ---: | ---: | ---: | ---: | ---: |
| Median | 415.748.556 | 1.639.303.628 | 1.014.231.310 | **383.967.591** | **0,92×** |
| p90 | 1,89 Mrd | 20,93 Mrd | 6,67 Mrd | **2,17 Mrd** | 1,15× |
| p95 | 3,44 Mrd | 35,33 Mrd | 10,23 Mrd | **3,07 Mrd** | **0,89×** |
| max | 71,5 Mrd | 3.425 Mrd | 73,7 Mrd | **58,1 Mrd** | **0,81×** |
| Siegquote | 68,6 % | 70,0 % | 71,3 % | 67,1 % | — |

Nicht nur der Median: **der ganze Schwanz ist zurück.** Gegen das Feld aus §7.41 (Pf 367M · Ei 348M/224M · Fe 137M
— je zum Stand ihrer letzten Messung, also nur grob vergleichbar) steht Blitz mit 384M **gleichauf mit der
Pflanze**. Das ist der Zustand, den §7.41 als gesund beschrieben hat, und er ist ohne einen einzigen neuen Deckel
erreicht.

#### B · Die Form der Fraktion stimmt

| Skill | Basis | §7.48 | §7.50 | **jetzt** | gehalten |
| --- | ---: | ---: | ---: | ---: | ---: |
| Doppelentladung (L) | +235 % | +330 % | +325 % | **+211 %** | 60 % |
| Resonanz (L) | +170 % | +213 % | +208 % | **+137 %** | 69 % |
| Hochspannung (L) | +92 % | +217 % | +55 % | **+69 %** | 64 % |
| Kurzschluss | +56 % | +116 % | +72 % | **+45 %** | 99 % |
| **Lichtbogen** | +18 % | −10 % | 0 % | **+25 %** | 98 % |
| Blitzableiter | +2 % | +54 % | +14 % | **+11 %** | 98 % |
| **Kettenblitz** | +5 % | **+238 %** | +40 % | **+1 %** | 48 % |

**Die drei Legendären führen, der stärkste normale Skill steht bei +45 %.** Dieselbe Form, die §7.33 für Feuer als
richtig festgehalten hat.

**Kettenblitz ist repariert**, und er war der Zeuge des ganzen Problems: +5 % (Basis) → +601 % (§7.46) → +238 %
(§7.47) → +40 % (§7.50) → **+1 %**. Seine Haltequote fällt von 92 % auf 48 % — der gierige Spieler nimmt ihn nur
noch, wenn er passt, statt immer. Reine Tiefe auf einer Karte ist kein Motor mehr.

**Lichtbogen ist zurück** (+18 → −10 → 0 → **+25 %**, 98 % gehalten) und damit der zweitstärkste normale Skill. Die
Crit-Chance-Achse trägt wieder, und genau dort sitzt das Spannungsfeld jetzt als Gegenspieler.

#### C · Was offen bleibt

**Das Spannungsfeld selbst misst 0 %** bei 58 % Haltequote. Die Stufen-Lifts (1,97 / 0,48 / 0,18 / 1,68) sind nicht
monoton und damit reines Rauschen — die Stichprobe je Stufe trägt diese Auflösung nicht, wie schon in §7.50 C. Der
Skill ist neutral, nicht kaputt; die Höhe seiner Leiter ist der nächste Regler und ein Owner-Entscheid.

**Drei Skills stehen im Minus:** Entladung −23 %, Vorentladung −23 %, Serienschutz −13 % (alle ~100 % gehalten).
Vorentladungs Fall von +4 auf −23 % ist auffällig — sie zahlt Crit-Multiplikator je Serienpunkt, und die flachere
Rest-Steigung aus §7.49 entwertet genau das. **Kandidat, nicht Befund:** Unterschiede dieser Größe liegen bei
mittleren Skills im Rauschen dieser Reihe (§7.46 B), und §7.50 hat Vorentladung auf derselben Steigung noch mit
+4 % gemessen. Das gehört gezielt nachgemessen, bevor jemand daran dreht.

Unverändert offen: Gewitterfronts Episch-Anhang, Hochspannung nur in Misch-Welten beurteilbar (§7.41 C), und die
Kontrollmessung des neuen Deckels an Feuer und Eis (§7.49 D, vom Owner ausgesetzt).

---

### 7.53 Die Rauschgrenze, zum ersten Mal gemessen — und was sie über die ganze Reihe sagt (2026-09-10) — gemessen

**Owner: „nachmessen, dann toten skills angehen."**

Zweimal dieselbe Konfiguration, nur ein anderer Seed-Satz (`--seed 1` gegen `--seed 101`), sonst identisch. Damit
ist zum ersten Mal beziffert, was ein einzelner Lauf dieser Reihe überhaupt auflösen kann — bisher habe ich die
Grenze geschätzt (§7.46 B: „rund Faktor 2") statt sie zu messen.

#### A · Der Fraktions-Median schwankt um Faktor 2

| | Seed 1 | Seed 101 |
| --- | ---: | ---: |
| Median | 383.967.591 | **756.807.703** |
| p90 | 2,17 Mrd | 5,74 Mrd |
| p95 | 3,07 Mrd | 9,23 Mrd |
| Siegquote | 67,1 % | 69,0 % |

**Faktor 1,97 auf dem Median, Faktor 3,0 auf dem p95 — bei identischem Code.** Die Schätzung aus §7.46 B war
richtig, aber sie war eine Schätzung; jetzt ist sie ein Messwert.

#### B · Je Skill: 17 Prozentpunkte, im Einzelfall weit mehr

| Skill | Seed 1 | Seed 101 | Spanne | gehalten |
| --- | ---: | ---: | ---: | ---: |
| Doppelentladung (L) | +211 % | +232 % | 21 pp | 60 / 70 % |
| Resonanz (L) | +137 % | +170 % | 33 pp | 69 / 61 % |
| **Hochspannung (L)** | +69 % | +280 % | **211 pp** | 64 / 63 % |
| Kurzschluss | +45 % | +40 % | **5 pp** | 99 / 99 % |
| Blitzableiter | +11 % | +42 % | 31 pp | 98 / 85 % |
| Lichtbogen | +25 % | +4 % | 22 pp | 98 / 77 % |
| Ionenfeld | +6 % | +24 % | 18 pp | 60 / 99 % |
| Reststrom | +2 % | +31 % | 29 pp | 83 / 74 % |
| **Kettenblitz** | +1 % | +35 % | 35 pp | 48 / 91 % |
| Blitzschlag | +4 % | +1 % | **3 pp** | 98 / 94 % |
| Blitzfänger | +4 % | 0 % | **4 pp** | 51 / 86 % |
| Spannungsfeld | 0 % | +0 % | **0 pp** | 58 / 29 % |
| Gewitterfront | 0 % | 0 % | **0 pp** | 20 / 85 % |
| Ladungsserie | −5 % | +3 % | 8 pp | 100 / 51 % |
| Serienschutz | −13 % | −20 % | **7 pp** | 100 / 98 % |
| Entladung | −23 % | −5 % | 17 pp | 99 / 53 % |
| **Vorentladung** | −23 % | +5 % | 28 pp | 100 / 86 % |

**Median der Spannen: 17 Prozentpunkte.** Auch die Haltequoten schwanken heftig (Gewitterfront 20 → 85 %,
Ladungsserie 100 → 51 %, Kettenblitz 48 → 91 %).

#### C · Was das an früheren Aussagen korrigiert

- **§7.52 A ist zu präzise formuliert.** „Median 0,92× der Basis" gilt für Seed 1; mit Seed 101 wären es 1,82×.
  Belastbar ist nur: Blitz liegt jetzt in der **Größenordnung** der Basis statt beim Vier- bis Achtfachen. Die
  RICHTUNG hält mit großem Abstand (1.639 → 1.014 → 384/757M), die zweite Stelle nicht.
- **§7.52 B, „Kettenblitz ist repariert" (+1 %), war zu stark.** Der zweite Lauf misst +35 %. Was hält: er ist weit
  von den +601 % aus §7.46 weg. Was nicht hält: die Genauigkeit.
- **Vorentladung −23 % war zu Recht als Kandidat markiert** (§7.52 C) — der zweite Lauf sagt +5 %. Die Vorsicht war
  richtig, und die Regel taugt allgemein: **unter etwa 35 pp (zweimal der Median) ist ein Einzellauf nicht lesbar.**
- **Hochspannung ist mono gar nicht messbar**, was §7.41 C schon aus einem anderen Grund festhielt: 211 pp Spanne
  bei gleicher Haltequote. Jede Zahl zu diesem Skill aus einem Mono-Lauf ist wertlos.

#### D · Die toten Skills — und diesmal belegt

Tot heißt hier: **in beiden Läufen bei oder unter null, mit kleiner Spanne.** Das ist der Filter, den die Reihe
bisher nicht hatte; unter ihm bleiben von den dreizehn normalen Skills sechs übrig:

| Skill | Seed 1 | Seed 101 | Spanne | Diagnose |
| --- | ---: | ---: | ---: | --- |
| **Serienschutz** | −13 % | −20 % | 7 pp | Kostet aktiv. Zahlt Ladung, um eine Serie nach einer Niederlage zu halten — und Ladung ist der Engpass. Dazu ein reiner Niederlagen-Skill, gegen die Owner-Regel aus §7.31. |
| **Spannungsfeld** | 0 % | +0 % | 0 pp | Neu auf der Crit-Chance (§7.51). Der Satz ist zu klein, die Bauform steht. |
| **Gewitterfront** | 0 % | 0 % | 0 pp | Dauerhafte Crit-Chance je voller Leiste. Spät ist die Chance ohnehin gesättigt (Ø 91 %, §7.46 E), früh gibt es kaum Leisten — der Skill zahlt genau dann nicht, wenn er könnte. |
| **Blitzschlag** | +4 % | +1 % | 3 pp | Jeder N. Crit ionisiert die Siegkarte. Ein Stapel ist seit §7.51 weniger wert, weil die Tiefe keine zweite Achse mehr hat. |
| **Blitzfänger** | +4 % | 0 % | 4 pp | Karten ab N Stapeln kämpfen mit +Wert. Wert hilft, Stiche zu gewinnen — bei 67–69 % Siegquote ist der Grenznutzen klein. |
| **Ladungsserie** | −5 % | +3 % | 8 pp | Ab Serie N gibt jeder Sieg +1 Ladung. Ladung IST der Engpass, trotzdem neutral — die Schwelle greift zu spät. |

Entladung (−23 / −5 %, 17 pp) liegt genau auf der Grenze und ist damit **nicht** entschieden.

**Nichts davon ist umgesetzt.** Die sechs sind ein Owner-Entscheid, und drei von ihnen (Gewitterfront, Ladungsserie,
Blitzschlag) haben eine strukturelle Diagnose, keine Zahlen-Diagnose — dort hilft ein größerer Satz nicht.

#### E · Konsequenz für die Methode

Eine Einzelmessung dieser Reihe trägt **eine Stelle**, nicht zwei. Für alles darunter braucht es entweder mehr
Läufe oder feste Builds statt des gierigen Spielers, der seine Wertetabelle je Variante neu lernt. Das gilt
rückwirkend für jede Prozentzahl in §7.41 bis §7.52.

---

### 7.54 Die zwei Zahlen-Skills: einer war einer, der andere nicht (2026-09-10, Owner) — umgesetzt und gemessen

**Owner: „zahlen, messen."** Beide Läufe, Seed 1 und Seed 101, weil §7.53 gezeigt hat, dass ein Einzellauf unter
35 Prozentpunkten nicht lesbar ist.

#### A · Gebaut

| Skill | vorher | jetzt |
| --- | --- | --- |
| **Spannungsfeld** | 2/3/4/6 % Crit-Chance je ionisierter Karte | **5/7/10/15 %** |
| **Blitzschlag** | +1/1/1/2 Stapel je Auslösung | **+2/3/4/6**, Kadenz unverändert |

Blitzschlags **Kadenz war nie das Problem**: die Leisten schütten im Lauf Ø 634 Stapel aufs Deck (`blitz-ramp`),
gegen die ein Stapel je zweitem Crit nicht ankommt. Der Satz musste hoch, nicht die Frequenz.

#### B · Blitzschlag ist repariert, deutlich

| Skill | vorher S1 / S101 | jetzt S1 / S101 |
| --- | ---: | ---: |
| **Blitzschlag** | +4 % / +1 % | **+74 % / +58 %** |
| Spannungsfeld | 0 % / +0 % | **−1 % / +1 %** |
| Blitzfänger *(nicht angefasst)* | +4 % / 0 % | 0 % / −1 % |

**+74 und +58 % in zwei unabhängigen Läufen** — weit über der Rauschgrenze, und damit der erste eindeutig
reparierte tote Skill der Reihe. Er ist jetzt der stärkste normale Skill neben Kurzschluss. Dass er die SIEGKARTE
ionisiert, die je Stich wechselt, macht ihn zum Streuer — er speist genau das, wofür Spannungsfeld zahlt.

#### C · Spannungsfeld ist kein Zahlen-Problem, und das ist jetzt belegt

**Zwei Achsen, zwei Anhebungen, kein Effekt:**

- §7.50: als Score-Multiplikator verdreifacht (`SPANNUNGSFELD_SCALE` ×3) → der Skill-Effekt stieg, aber drei von
  vier Stufen blieben unter Lift 1.
- §7.54: als Crit-Chance ×2,5 → **−1 % / +1 %**, also unverändert null.

Die Diagnose steht damit fest, und sie ist strukturell: **sein Tor ist zu eng und seine Skala zu klein.** Er zündet
nur bei einem Formations-Sieg, und er zählt höchstens die Karten einer Formation (Median 4). Lichtbogen sitzt auf
DERSELBEN Achse und misst +2 / +23 % — weil er bei JEDEM Stich zündet und mit der Stapeltiefe skaliert (Ø 10,7 je
Karte, tiefste Ø 215).

Bittere Pointe: **die Schranke, die den Weglauf aus §7.46 behoben hat, ist dieselbe, die den Skill klein hält.** Die
Kartenzahl ist begrenzt — das war der Zweck, und es ist auch der Preis.

#### D · Blitzfänger, dritte und vierte Bestätigung

Nicht angefasst, misst 0 % / −1 % (nach +4 % / 0 % in §7.53). Vier Läufe, viermal null. Zusammen mit dem Befund,
dass Episch schon heute **+1 Wert je Stapel ungedeckelt** gibt (auf der tiefsten Karte Ø +215 bei Grundwert ~7),
ist die Sache entschieden: **Wert sättigt, sobald der Stich ohnehin gewonnen ist.** Ein größerer Satz kann dort
nichts ausrichten.

#### E · Der Preis: die Fraktion steigt wieder

| | Seed 1 | Seed 101 |
| --- | ---: | ---: |
| vor der Runde | 383.967.591 | 756.807.703 |
| jetzt | **792.291.254** | **1.196.265.415** |

Rund verdoppelt, also **1,9× bis 2,9× der Basis** (415.748.556). Das ist kein Nebeneffekt, sondern die Rechnung:
einen toten Skill lebendig zu machen fügt der Fraktion Kraft hinzu. Blitzschlags `stacks` ist der Regler, wenn sie
wieder runter soll.

#### F · Bilanz der toten Skills

Von den sechs aus §7.53 D ist **einer repariert** (Blitzschlag) und **fünf sind strukturell**: Serienschutz,
Gewitterfront, Ladungsserie, Blitzfänger und jetzt auch Spannungsfeld. Meine Einordnung in §7.53 D war damit
zweimal falsch (Blitzfänger und Spannungsfeld als „Zahlen-Problem"), und beide Male hat dieselbe Prüfung gefehlt:
**erst nachsehen, ob der bestehende Satz auf seinem Maximum schon etwas bewirkt.** Bei Blitzfänger tat er es nicht
(+215 Wert = 0 %), bei Spannungsfeld ebenso wenig (§7.50s Verdreifachung).

---

### 7.55 Zwei Sonden vor dem Umbau — beide widerlegen eine Annahme (2026-09-10) — gemessen, nichts umgesetzt

Der Owner hat drei der fünf toten Skills freigegeben (Serienschutz und Ladungsserie umbauen, Spannungsfeld auf
„Crit-Chance je Formation, in der eine ionisierte Karte ist"; Gewitterfront und Blitzfänger bleiben). Vor dem Bauen
zwei Sonden — die Lehre aus §7.54, wo zweimal eine Zahl gedreht wurde, die nichts bewirken konnte.

#### A · Formationen je Position: die neue Lesart zündet NICHT früher

`sim/probes/feld-formationen.mjs`, 60 Läufe, Blitz mono, je Formations-Sieg:

| Runden | Ø Formationen | **Ø erleuchtet (neue Lesart)** | Ø ionisierte Karten (alte) | Siege mit ≥ 1 erleuchteter |
| --- | ---: | ---: | ---: | ---: |
| 1–10 | 1,38 | **0,18** | 0,17 | 14 % |
| 11–20 | 1,56 | **0,81** | 0,89 | 55 % |
| 21–30 | 1,63 | **1,36** | 2,15 | 87 % |
| 31–40 | 1,69 | **1,63** | 3,38 | 97 % |
| 41–50 | 1,73 | **1,72** | 4,09 | 100 % |

**Früh sind beide Lesarten praktisch gleich** (0,18 gegen 0,17 · 0,81 gegen 0,89), **spät ist die neue deutlich
kleiner** (1,72 gegen 4,09).

Der Grund ist die erste Spalte: eine Position hängt im Schnitt in nur **1,4 bis 1,7 Formationen**. Die Annahme, eine
einzelne ionisierte Karte könne mehrere Formationen zugleich erhellen, trägt also nicht — es gibt meist gar keine
mehreren. Und der frühe Engpass ist ein anderer: in den Runden 1–10 haben **86 % der Formations-Siege überhaupt
keine ionisierte Karte** in Reichweite.

**Folge: der Umbau wie spezifiziert macht den Skill schwächer, nicht früher.** Wer „früher" will, muss die
Ionisierungs-Bedingung streichen, nicht ihre Zählweise ändern — „je Formation der Position" zündet ab Runde 1 bei
jedem Formations-Sieg (1,38).

#### B · Serienlängen: meine Ladungsserie-Diagnose war falsch

`sim/probes/streak-probe.mjs`, 60 Läufe: **Blitz mono beste Serie p10 34 · p50 240 · p90 719**, und **82 % der
Läufe erreichen ≥ 75**.

Damit ist §7.53 D widerlegt, wo ich schrieb, Ladungsseries Schwelle („ab Serie 16") greife zu spät. **Sie ist
bequem erreichbar.** Der Skill feuert also oft und misst trotzdem −6/−11 %.

Die echte Erklärung liegt woanders: `blitz-ramp` zählt **Ø 150 volle Leisten je Lauf**, davon nur 2 in den Runden
1–10 und 9 bis Runde 20. **Ladung ist spät im Überfluss da und früh knapp** — und eine Serie von 16 hat man erst,
wenn die Leisten ohnehin laufen. Der Skill schenkt also Ladung genau dann, wenn sie nichts mehr wert ist.

Der strukturelle Fehler ist damit nicht die Höhe der Schwelle, sondern **die Kopplung an die Serie**: sie ist ein
Spätindikator. Ein Ladungs-Skill, der früh helfen soll, darf nicht an der Serie hängen.

#### C · Was daraus folgt

- Spannungsfeld: die spezifizierte Änderung erreicht ihr Ziel nicht (A) — Owner-Entscheid nötig, bevor gebaut wird.
- Ladungsserie: der Umbau muss die Serie als Auslöser verlassen (B), nicht ihre Schwelle senken.
- Serienschutz: unverändert der Fall aus §7.53 D — reagiert auf Niederlagen (Owner-Regel §7.31) und zahlt mit
  Ladung. Sein Auslöser ist sein Wesen, also braucht er einen neuen, keinen justierten.

**Nichts umgesetzt.** Zwei neue Sonden im Baum.

---

### 7.56 Spannungsfeld zählt Formationen, ohne Ionisierungs-Bedingung (2026-09-10, Owner) — umgesetzt, UNGEMESSEN

**Owner:** „Formations-Sieg gibt +X % Crit-Chance je Formation dieser Position — genau das meinte ich."

Das ist die Variante aus §7.55 A, nicht die zuerst genannte („je Formation, in der eine ionisierte Karte ist"). Die
Sonde hatte gezeigt, dass die zweite den Skill schwächer statt früher macht.

#### A · Was sich ändert

| | vorher (§7.51/§7.54) | jetzt |
| --- | --- | --- |
| Kennwert | ionisierte **Karten** der Formation | **Formationen dieser Position** |
| Bedingung | mindestens eine ionisierte Karte | **keine** |
| Sätze | 5/7/10/15 % | unverändert 5/7/10/15 % |
| Episch-Anhang | +1 Stapel auf die dünnste Karte | unverändert |

`litFormationCards` ist raus, `positionFormations(posForm)` ersetzt es — es braucht weder Karte noch Deck, nur den
Formations-Eintrag der Position. Meta-Faktoren (Anker, Nachhall) haben keine `members` und zählen nicht mit.

#### B · Warum das früh wirkt und die alte Lesart nicht

Aus §7.55 A, je Formations-Sieg:

| Runden | Formationen (neu) | ionisierte Karten (alt) | Siege mit ≥ 1 ionisierter Karte |
| --- | ---: | ---: | ---: |
| 1–10 | **1,38** | 0,17 | 14 % |
| 11–20 | **1,56** | 0,89 | 55 % |
| 41–50 | 1,73 | 4,09 | 100 % |

**Früh ist das der Faktor 8** (1,38 gegen 0,17), spät die Hälfte (1,73 gegen 4,09). Genau die Verschiebung, die der
Owner wollte: der Skill zahlt, wenn Crit-Chance knapp ist (Runden 1–10: Ø 14,8 % Roh-Chance), und sättigt, wenn sie
es nicht mehr ist (41–50: Ø 87,1 %).

Der Zweck ist die Kette dahinter: **mehr Crits → schnellere volle Leisten → früher Ladung und Stapel.** Blitz hat
in den Runden 1–10 nur 2 volle Leisten (§7.55 B), das ist der Kaltstart der Fraktion.

Bei Normal sind das +7 Punkte auf eine Basis von 14,8 % (also rund die Hälfte mehr Crits), bei Episch +21 Punkte.
**Die Sätze sind unverändert und weiterhin Startwerte** — was sich geändert hat, ist der Kennwert, nicht die Höhe.

#### C · Die Rollen stehen jetzt sauber gegeneinander

Auf der Crit-Chance-Achse sitzen damit zwei Skills mit entgegengesetzter Bauanleitung:

- **Lichtbogen** zahlt je **Stapel der gespielten Karte** — Tiefe, und er wächst über den Lauf (Ø 10,7 Stapel je
  Karte spät, tiefste Ø 215).
- **Spannungsfeld** zahlt je **Formation der Position** — Breite, und er ist von Anfang an da, aber gedeckelt
  (1,4–1,7).

Früh trägt das Feld, spät der Bogen. Das ist die Entscheidung, die §7.43 bauen wollte und dreimal verfehlt hat.

#### D · Wächter

Der neue hält beide Hälften: Meta-Faktoren ohne `members` zählen nicht mit, **und Ionisierung spielt keine Rolle
mehr** — ein leeres Deck gibt dieselbe Zahl wie ein voll ionisiertes. Gegengeprobt, indem eine nie erfüllbare
Mitglieder-Bedingung eingebaut wurde: der Wächter fällt. Dazu bleibt in der Stufentabelle festgehalten, dass weder
`perStack` (§7.43) noch `perCard` (§7.47) noch `critPerCard` (§7.51) zurückkommen dürfen.

---

### 5.30 Die Eis-Skills auf dem neuen Motor (2026-09-09) — gemessen, nichts umgesetzt

**Owner:** „und dann schauen wir uns alle skills an die davon profitieren müssen und designen wie."

Sieben Eis-Welten (mono, drei Paare, drei Tripel), Explore 600 → Greedy 140 → gepaarte Ablation je Skill,
44 660 Läufe, 40 min (`node sim/survey.js --only welten --fraktion ice`). Die Zahlen aus §8 waren auf dem ALTEN
Motor gemessen und sind für Eis nicht mehr gültig.

#### A · Die Tabelle (Haltequote / typischer Effekt)

| Skill | Achse | mono | Paar Ø | Tripel Ø | schwach in |
| --- | --- | --- | --- | --- | --- |
| **Große Lawine** (L) | Zahl | 71 % / +511 % | 38 % / +169 % | 13 % / +89 % | 0/7 |
| **Eiszeit** (L) | Masse | 62 % / +138 % | 35 % / +63 % | 18 % / +72 % | 0/7 |
| **Ewiges Schild** (L) | Dichte | 65 % / +221 % | 29 % / +60 % | 10 % / +28 % | 1/7 |
| Einfrieren | — | 99 % / +30 % | 29 % / +18 % | 20 % / +26 % | 2/7 |
| Dauerfrost | Masse | 100 % / +3 % | 61 % / **+27 %** | 23 % / +13 % | 2/7 |
| Abbruchkante | Masse | 68 % / +9 % | 20 % / +15 % | 9 % / −3 % | 2/7 |
| Frostbund | Dichte | 32 % / −5 % | 26 % / −4 % | 18 % / +39 % | 3/7 |
| Eisbeben | Masse | 35 % / +43 % | 60 % / +9 % | 15 % / +1 % | 3/7 |
| Sprödbruch | Masse | 100 % / +8 % | 28 % / +14 % | 16 % / −0 % | 3/7 |
| Eiswall | Dichte | 99 % / +14 % | 40 % / +5 % | 15 % / +19 % | 4/7 |
| Verzahnung | Dichte | 100 % / **+48 %** | 32 % / +1 % | 26 % / −2 % | 4/7 |
| Anfrieren | Masse | 19 % / −7 % | 12 % / −10 % | 15 % / +17 % | 4/7 |
| Eisbrücke | Dichte | 95 % / +17 % | 17 % / −14 % | 13 % / −0 % | 4/7 |
| Gletscherzunge | Masse | 34 % / −0 % | 39 % / −4 % | 8 % / +39 % | 5/7 |
| Gletschersturz | Zahl | 94 % / **+43 %** | 40 % / +2 % | 22 % / −5 % | 5/7 |
| Verdichtung | Masse | 97 % / −10 % | 36 % / +2 % | 15 % / −2 % | 5/7 |
| Packeis | Dichte | 100 % / **+24 %** | 26 % / −8 % | 14 % / −8 % | 5/7 |

Gehaltene Eis-Skills je Welt: Ei 13,1 · Bl+Ei 4,6 · **Ei+Pf 5,7 (§8: 3,9)** · Fe+Ei 8,3 · Bl+Ei+Pf **3,0 (§8: 1,7)** ·
Fe+Bl+Ei 2,7 · Fe+Ei+Pf 2,9. In den Paaren greift der gierige Spieler deutlich häufiger zu Eis als vor der Runde.

#### B · Was die Zahlen sagen

1. **Kein Eis-Skill ist mehr in allen sieben Welten schwach.** In §8 standen dort Frostbund und Anfrieren; die
   Liste der neun „überall Schwachen" enthält jetzt kein Eis mehr.
2. **Die Dichte-Achse verhält sich exakt wie vorhergesagt.** Packeis +24 % mono → −8 %/−8 % im Mix, Verzahnung
   +48 → +1/−2, Eisbrücke +17 → −14/−0, Gletschersturz +43 → +2/−5. Vier Skills, die *nur* mono zahlen — und alle
   vier auf dieselbe Weise.
3. **Die Masse-Achse trägt noch nicht von selbst.** Die offene Leiter hat Abbruchkante (+9/+15/−3), Sprödbruch
   (+8/+14/−0), Verdichtung (−10/+2/−2) und Anfrieren (−7/−10/+17) NICHT geheilt.
4. **Dauerfrost ist der erste Eis-Skill, der im Mix besser ist als mono** (+3 % → +27 %). Er lebt von offenen
   Feldern und wenigen Gletschern — genau die Bedingung eines Splashs. Das ist das Vorbild für die Masse-Achse.
5. **Zwei „immer genommen, kaum gespürt"**: Sprödbruch (100 % / +8 %) und Verdichtung (97 % / −10 %).

#### C · Diagnose je Reparaturfall

- **Anfrieren und Verdichtung** geben eine FLACHE Masse-Zahl (+1…4 je Sieg bzw. je Gebäude-Bonus). Das
  Boden-Einkommen liefert inzwischen rund 20 Masse je Durchlauf — die flache Zahl ist darin nicht mehr zu spüren.
  **Beide wurden vom eigenen Fundament entwertet.**
- **Abbruchkante** hebt die Wucht der Stufen 2–4 (1,6/2,6/3,8 auf Normal gegen die Basis 1,5/2,2/3,2) — das sind
  +7/+18/+19 %. Gegen eine Leiter, die jetzt bis 9,7 reicht, ist das ein Nebengeräusch.
- **Gletscherzunge und Sprödbruch** lesen Masse und profitieren automatisch; ihre Stufenleitern sind aber gegen
  die alte Masse (≈ 12) gerechnet und stehen jetzt zu niedrig.

Nichts davon ist umgesetzt — die Design-Entscheidungen stehen beim Owner.

---

### 5.31 Vier Eis-Skills auf die Masse-Achse (2026-09-09)

**Owner:** „passt, bau aber vllt noch einen für duo oder Triplett um."

Aus §5.30 folgten vier Reparaturfälle. Drei davon sind Mechanik-Umbauten, einer ist ein Seitenwechsel.

| Skill | vorher | jetzt | warum |
| --- | --- | --- | --- |
| **Abbruchkante** | Stufenwucht 1,6/2,6/3,8 statt 1,5/2,2/3,2 | **Berst-Schwelle 18/24/30/38** statt 12 | +7/+18/+19 % gegen eine Leiter bis ×9,7 war ein Nebengeräusch. Jetzt ist sie der Sammel-Skill: seltener bersten, dafür auf der Sprosse, die das eigene Einkommen hergibt. |
| **Anfrieren** | flach +1…4 Masse je Sieg | **+10/15/20/28 %** der Masse je Sieg | Der Boden liefert seit §5.29 ≈ 20 Masse je Durchlauf — die flache Zahl war darin nicht mehr zu spüren. Bezugsgröße ist die Masse *einschließlich* dieses Siegs, sonst gäbe der Skill auf einem frisch gefrorenen Feld exakt null. |
| **Verdichtung** | 0,25/0,4/0,6/1 je Punkt Kampfwert | **0,6/0,9/1,3/2** | 97 % Haltequote bei −10 % Wirkung. Mechanik unverändert, nur die Rate. |
| **Packeis** | +Masse je **Gletscher**-Nachbar | +Masse je **offenem** Nachbarfeld | Der reinste Mono-Skill der Fraktion (+24 % mono, −8 %/−8 % im Mix). Als Kante zwischen Eis und offenem Wasser trägt er den Namen weiter. |

**Nicht angefasst, mit Grund:** Gletscherzunge und Sprödbruch *lesen* die Masse (`floor(Masse / per)` bzw.
`Masse × crit`) und wachsen mit dem neuen Motor automatisch mit — §5.30 hatte ihre Stufenleitern zum Nachziehen
vorgeschlagen, der Code sagt, dass das nicht nötig ist.

**Die drei Dichte-Skills bleiben** (Verzahnung, Eisbrücke, Gletschersturz) — sie sind der Grund, mono zu spielen,
und das darf es geben (Owner: „nicht jeder skill muss in jeder Kombi gut sein").

**Ein Fund beim Bauen:** die Abbruchkante war die einzige Stelle, die `tierMult` überschrieb. Der Wächter hält jetzt
fest, dass sie die einzige `burstAt`-Quelle ist **und sie nur hebt** — §5.18 hatte mit der Rissbildung die letzte
senkende Quelle gestrichen, und das muss so bleiben, sonst bräche ein Gletscher früher als sein Text sagt.

#### Build-Ebene: unverändert, und das ist erklärbar

Cross über 400 Läufe je Build: Eis-Ansteckung **0,50 / 0,56 / 0,60 / 0,67×** gegen 0,49 / 0,55 / 0,59 / 0,67× vor
der Runde. Eis mono 7,14 → 6,78M, Bl+Ei 7,16 → 6,54M.

Das ist kein Widerspruch, sondern die Messgrenze: die Fraktions-Policy im Cross-Lauf setzt ihre Gletscher **immer**
auf das 3×3-Cluster — auch im Tripel mit vier Picks. Für einen so gebauten Build ist Packeis' Seitenwechsel ein
reiner Nerf, und die übrigen drei Änderungen betreffen Skills, die der Zufallsspieler ohnehin selten hält.

#### Welten-Messung: drei von vier wirken, einer ist kaputt

Sieben Eis-Welten, dieselben Parameter wie §5.30 (Explore 600 · Greedy/Ablation 140), Haltequote / typischer Effekt:

| Skill | mono vorher → jetzt | Paar vorher → jetzt | Urteil |
| --- | --- | --- | --- |
| **Verdichtung** | 97 % / −10 % → **41 % / +29 %** | 36 % / +2 % → **57 % / +6 %** | wirkt |
| **Packeis** | 100 % / +24 % → **83 % / −10 %** | 26 % / −8 % → **21 % / +37 %** | Spiegel wie bestellt |
| **Anfrieren** | 19 % / −7 % → **56 % / −2 %** | 12 % / −10 % → 15 % / +2 % | halb: wird genommen, wirkt nicht |
| **Abbruchkante** | 68 % / +9 % → **20 % / +12 %** | 20 % / +15 % → 20 % / +0 % | **kaputt** |

**Und Eis mono fällt in dieser Messung von 409,8M auf 224,2M.** Der Hauptposten ist Packeis: er war mono die zweite
Masse-Quelle und ist dort jetzt fast wirkungslos (ein Gletscher im Cluster hat kaum offene Nachbarn). Das ist der
bestellte Preis des Seitenwechsels — die Höhe ist offen und gehört tariert.

### 5.32 Der Fehler in der Abbruchkante: Schwellen zwischen den Sprossen (2026-09-09)

Die Haltequote 68 % → 20 % war kein Rauschen, sondern ein Konstruktionsfehler von mir. Auszahlung je Durchlauf und
Punkt Einkommen (Masse × Wucht ÷ Kletterzeit von `KEEP_MAX` auf die Schwelle):

| Schwelle | Sprosse | Wucht | Auszahlung | gegen „kein Skill" |
| --- | --- | --- | --- | --- |
| 12 (ohne Skill) | 3 | 2,2 | 4,40 | — |
| **18** | 4 | 3,2 | 4,80 | +9 % |
| **24** | 4 | 3,2 | **4,27** | **−3 %** |
| 27 | 5 | 4,6 | 5,91 | +34 % |
| **30** | 5 | 4,6 | 5,75 | +31 % |
| **38** | 5 | 4,6 | **5,46** | +24 % |
| 40 | 6 | 6,7 | 7,88 | +79 % |
| 60 | 7 | 9,7 | 10,78 | +145 % |

24 zählt noch zur vierten Sprosse wie 18, 38 noch zur fünften wie 30 — **die höhere Stufe kostete Wartezeit, ohne
Wucht zu bringen.** Stufe 2 zahlte weniger als gar kein Skill, Episch weniger als Stufe 3. Der gierige Spieler hat
das korrekt erkannt und den Skill fallen lassen.

**Korrigiert auf 18 / 27 / 40 / 60** — die Sprossen selbst: +9 % / +34 % / +79 % / +145 %, monoton. Ein Wächter hält
jetzt beide Bedingungen fest: jede Schwelle liegt auf einer Sprosse, und die Auszahlung steigt mit jeder Stufe.

**Offen:** die Korrektur ist gerechnet, nicht gemessen — die Welten-Messung nach §5.32 steht aus. Ebenso die Frage,
wie weit Packeis' Mono-Verlust nachtariert werden soll.

---

## 8. Bestandsaufnahme über alle vier Fraktionen (2026-09-09)

**Owner:** „wir haben jetzt reworks für Blitz, pflanze, Eis auf exp gebracht. diese sind noch nicht fertig aber bevor
wir da weiter machen müssen wir den aktuellen ist stand in der sim aufnehmen. […] wo steht jede Fraktion mono, wo
stehen die Fraktion wenn ich 2 bzw 3 mische. wie schneiden die einzelnen skills in den Kombinationen Mono, 2, 3 ab.
[…] gibt es skills die viel zu stark sind, gibt es skills die über alle Varianten unterperformen."

Gemessen auf `2ae80e4c` — enthält §6.26 (Pflanze), §7.30/§7.31 (Blitz), die Münz-Ökonomie und den Eis-Stand aus
§5.27. Neues Werkzeug `sim/survey.js` + `sim/survey-worker.js`: ein Auftrags-Pool über vier Prozesse,
**108 800 Läufe in 93 Minuten**. Rohdaten in `sim/out/survey.json` (ignoriert, reproduzierbar über
`node sim/survey.js --explore 900 --runs 175 --cross 500 --jobs 4`).

### 8.1 Aufbau — zwei Messungen, zwei Spieler

Das ist Absicht: die eine Frage ist „was passiert, wenn ich mische", die andere „was tut dieser Skill in dieser Welt".

| | **A · Build-Ranking** | **B · Skill je Welt** |
| --- | --- | --- |
| Spieler | planlos bei Skills/Perks | kompetent (Explore → eingefrorene Wertetabelle → Greedy) |
| Aufstellung/Architekt | greedy | greedy |
| Angebot | voller Pool, die Policy lehnt Fremdes ab | nur die Fraktionen dieser Welt |
| Slots | erzwungener Split (Paar 3+3, Tripel 2+2+2) | frei |
| Umfang | 16 Builds × 500 Läufe, gleiche Seeds | 14 Welten × (900 Explore + 175 Greedy + 175 je Skill) |

Abweichung von `--mode cross`: der Zufalls-Mix stellt hier ebenfalls greedy auf (`greedyFormationStep`). In
`--mode cross` tat er das als einziger Build nicht und war damit systematisch benachteiligt — was ausgerechnet die
beiden formationslastigen Fraktionen (Eis, Pflanze) verzerrt hat. Die Mix-Zahl ist deshalb **nicht** mit älteren
Cross-Läufen vergleichbar, alle übrigen Zeilen schon.

Die Ablation ist wie in `--mode skills` gepaart: derselbe Spieler, dieselben 175 Seeds, einmal mit und einmal ohne
den Skill; `robustDelta` und `flagFor` sind geteilt, damit die Flags identisch definiert bleiben.

### 8.2 A · Wo steht welcher Build (Median, 500 Läufe, Seeds 1–500)

| Build | Median | Mean | p90 | Siege | ÷ Mix | ÷ bester Reiner |
| --- | --- | --- | --- | --- | --- | --- |
| Fe+Pf | 16,61M | 39,21M | 82,70M | 60 % | 2,03× | 1,33× |
| Bl+Pf | 15,78M | 65,36M | 93,28M | 58 % | 1,93× | 1,27× |
| Fe+Bl | 15,21M | 44,43M | 62,77M | 65 % | 1,86× | 1,33× |
| Fe+Bl+Pf | 14,42M | 46,17M | 80,92M | 60 % | 1,77× | 1,16× |
| Pf | 12,47M | 85,78M | 93,45M | 56 % | 1,53× | — |
| Bl | 11,44M | 117,99M | 97,79M | 63 % | 1,40× | — |
| Fe+Bl+Ei+Pf | 9,10M | 15,85M | 28,36M | 59 % | 1,11× | 0,73× |
| Ei+Pf | 8,87M | 15,66M | 28,39M | 55 % | 1,09× | 0,71× |
| Fe+Ei+Pf | 8,27M | 15,93M | 33,31M | 58 % | 1,01× | 0,66× |
| Zufalls-Mix | 8,16M | 14,78M | 28,22M | 59 % | 1,00× | — |
| Bl+Ei+Pf | 8,14M | 15,71M | 26,01M | 57 % | 1,00× | 0,65× |
| Fe | 7,28M | 11,89M | 25,41M | 65 % | 0,89× | — |
| Ei | 6,73M | 12,51M | 23,33M | 60 % | 0,82× | — |
| Fe+Bl+Ei | 6,49M | 10,75M | 22,41M | 61 % | 0,80× | 0,57× |
| Bl+Ei | 6,01M | 10,52M | 20,40M | 59 % | 0,74× | 0,53× |
| Fe+Ei | 5,65M | 9,26M | 17,03M | 61 % | 0,69× | 0,78× |

Die Trennlinie verläuft exakt an Eis: **die sechs besten Builds enthalten kein Eis, die fünf schlechtesten alle.**

### 8.3 Eis ist ansteckend

Dieselbe Kombination, einmal ohne und einmal mit Eis, gleiche Seeds:

| ohne Eis | mit Eis | Faktor |
| --- | --- | --- |
| Fe+Bl 15,21M | Fe+Bl+Ei 6,49M | **0,43×** |
| Fe+Pf 16,61M | Fe+Ei+Pf 8,27M | **0,50×** |
| Bl+Pf 15,78M | Bl+Ei+Pf 8,14M | **0,52×** |
| Fe+Bl+Pf 14,42M | Fe+Bl+Ei+Pf 9,10M | **0,63×** |

Der Befund geht über „Eis ist schwach" hinaus: Eis **kostet den Partner die Hälfte**. Die Ursache steht in 8.4 —
allein hält der kompetente Spieler 13,0 Eis-Skills, im Tripel nur noch 1,7 bis 3,1. Er lässt Eis fallen, sobald er
die Wahl hat, und der Gletscher-Motor braucht genau diese Masse. Das bestätigt §5.12 (Ewiges Schild: 1,83 Gletscher
gemischt gegen 5,18 in Eis pur) als **strukturelles** Problem der Fraktion, nicht als Eigenheit einer Karte. Solange
das so ist, repariert kein einzelner Eis-Skill die Fraktion.

### 8.4 B · Die 14 Welten (kompetenter Spieler)

| Welt | Median | p90 | Siege | Ø Skills | Aufteilung |
| --- | --- | --- | --- | --- | --- |
| Pf | 2,31 Mrd | 19,74 Mrd | 64 % | 13,0 | Pf 13,0 |
| Bl | 1,69 Mrd | 19,14 Mrd | 72 % | 11,6 | Bl 11,6 |
| Ei | 348M | 1,64 Mrd | 64 % | 13,0 | Ei 13,0 |
| Fe | 113M | 367M | 77 % | 13,0 | Fe 13,0 |
| Bl+Pf | 657M | 13,70 Mrd | 64 % | 13,0 | Bl 6,7 · Pf 6,3 |
| Fe+Pf | 436M | 5,33 Mrd | 67 % | 12,7 | Fe 5,6 · Pf 7,1 |
| Fe+Bl | 283M | 3,85 Mrd | 71 % | 11,2 | Fe 2,9 · Bl 8,4 |
| Bl+Ei | 104M | 1,47 Mrd | 68 % | 12,9 | Bl 8,7 · **Ei 4,2** |
| Ei+Pf | 92M | 1,71 Mrd | 59 % | 12,9 | **Ei 3,9** · Pf 9,0 |
| Fe+Ei | 79M | 558M | 70 % | 12,6 | Fe 4,0 · Ei 8,6 |
| Fe+Bl+Pf | 155M | 2,79 Mrd | 67 % | 12,9 | Fe 4,3 · Bl 4,7 · Pf 3,9 |
| Fe+Ei+Pf | 57M | 537M | 64 % | 12,8 | Fe 4,1 · **Ei 3,1** · Pf 5,6 |
| Fe+Bl+Ei | 39M | 313M | 67 % | 12,0 | Fe 3,7 · Bl 5,9 · **Ei 2,5** |
| Bl+Ei+Pf | 30M | 383M | 60 % | 11,4 | Bl 5,4 · **Ei 1,7** · Pf 4,2 |

**Skalierung vom planlosen (A) zum kompetenten Spieler (B), reine Fraktion:**
Feuer **×15** (7,3M → 113M) · Eis **×52** (6,7M → 348M) · Blitz **×147** (11,4M → 1,69 Mrd) ·
Pflanze **×185** (12,5M → 2,31 Mrd).

Am Boden liegen alle vier innerhalb von Faktor 1,7; oben trennen sie 20×. **Feuer hat keine Decke** — es belohnt
Können praktisch nicht. Das ist die Gegenprobe zu §7.30 („Feuer steht jetzt allein unten") mit einem zweiten
Messverfahren.

### 8.5 Die Ausreißer

**In allen sieben Welten stark** (alle legendär): Baumreihe (Pf) +1079 % mono · Wurzelgeflecht (Pf) +591 % ·
Resonanz (Bl) +553 % · Ewiger Frühling (Pf) +282 % · Sonnenzorn (Fe) +91 %.

Die zwölf Legendären spannen **+1079 % bis +13 %** — Faktor 80. Ganz unten stehen zwei Feuer-Karten
(Ewige Glut +13 %, Sonnenkern +14 %), die schwächer sind als *normale* Skills anderer Fraktionen
(Glühende Klinge +141 %, Hecke +105 %). Bevor die Pflanze feintariert wird, muss Baumreihe runter: bei +1079 %
misst sich jeder andere Pflanze-Skill gegen einen Lauf, den Baumreihe längst gewonnen hat.

**In allen sieben Welten schwach:** Lichtung (Pf, hält 100 % und wirkt −0 %) · Frostbund (Ei) · Anfrieren (Ei).

**Schwach in sechs von sieben:** Ladungsserie (Bl) · Serienschutz (Bl) · Glutstahl (Fe) · Glutbett (Fe) ·
Packeis (Ei) · Schneetreiben (Ei) · Rankgerüst (Pf) · Zäher Halm (Pf) · Setzlingsbeet (Pf).

**Immer genommen, nie gespürt** — die schlimmste Sorte, weil sie einen Slot belegt und sich nach Fortschritt anfühlt:
Lichtung 100 %/−0 % · Zäher Halm 100 %/−2 % · Rankgerüst 98 %/−0 % · Glutstahl 98 %/−5 % · Verwachsung 98 %/+1 % ·
Windung 99 %/+2 % · Aussaat 99 %/+2 % · Abbruchkante 99 %/+4 %.

**26 von 70 Skills** bewegen den Score in ihrer eigenen Mono-Welt um weniger als 3 % — dort, wo sie es am
leichtesten haben.

### 8.6 Was diese Messung NICHT kann

1. **Die Stufenleiter ist hier nicht messbar.** Bei 900 Explore-Läufen bekommt eine einzelne Stufe im Median nur
   98–186 Läufe, und die Lifts springen (Blitzableiter N/S/SS/E: 0,13 → 1,01 → 1,35 → 0,34). Der „Leiter"-Verdacht
   feuert bei **41 von 58** normalen Skills. Das ist Rauschen. **Auf dieser Grundlage keine Stufen umbauen** — dafür
   braucht es einen eigenen Lauf mit erzwungener Stufengleichverteilung.
2. **Ein einzelner Effektwert hat Streuung.** 175 gepaarte Läufe sind für den Median-Effekt knapp (§5.27). Belastbar
   wird es durch die Wiederholung: sieben Welten je Skill sind zusammen 1225 gepaarte Läufe. Dem Muster über
   mono/Paar/Tripel trauen, nicht der Einzelzahl.
3. **A und B messen zwei Spieler.** Wo beide sich widersprechen, steckt die Information (8.4), nicht der Fehler.
4. **Ein Foto, kein Video.** Während des Laufs wurde nicht auf exp gepusht; danach kann sich alles verschoben haben.

### 8.7 Reihenfolge, die ich vorschlagen würde

1. **Eis als System**, nicht als Skill-Liste (8.3) — der Gletscher-Motor braucht eine Auszahlung, die auch bei zwei
   bis vier Gletschern trägt. Solange das offen ist, sind weitere Eis-Skill-Runden verlorene Arbeit.
2. **Feuer bekommt eine Decke** (8.4) — die multiplikative Kette fehlt, die Blitz über Crit und Pflanze über
   Wachstum haben; zwei der drei Feuer-Legendären zahlen nicht.
3. **Baumreihe herunter** (8.5), sonst tariert jede Pflanze-Runde gegen Rauschen.
4. **Die zwölf Dauerschwachen** aus 8.5 — die konkrete Arbeitsliste für „kein Skill darf nirgends sinnvoll sein".

---

## Änderungsprotokoll




| Datum | Was |
| --- | --- |
| 2026-09-04 | Dokument angelegt. Rahmen aus der Planungssitzung, Blitz-Bestand aus dem Code aufgenommen. |
| 2026-09-04 | Blitz-Passiv neu gesetzt (Leiste, 10 Crits, eine Karte ionisieren, nur Score). Folgen für den Bestand, Tempo-Tabelle und drei offene Punkte eingetragen. |
| 2026-09-04 | Crit-Quelle gesetzt: +5 % je Blitz-Skill als passiver Anteil, Zahlen später in der Sim. Ionisierung als Skill gestrichen. Tempo-Tabelle auf gehaltene Skills umgestellt. |
| 2026-09-04 | Stapel ohne Deckel gesetzt, Tuning über Sim. "Voll ionisiert" wird Schwelle oder Skalierer. Offen bleibt nur noch die Zielkarte. |
| 2026-09-04 | Zielkarte gesetzt: die nächste in der Reihenfolge. Passiv damit komplett. Stelle des Stapel-Scores (Basis oder Direkt-Score) als Vorschlag mit Beispiel eingetragen. |
| 2026-09-04 | Owner: Stapel-Score bleibt in der Basis. Regel für alle Fraktionen: Direkt-Score aus den Skills nach Möglichkeit entfernen. Betroffene Blitz-Skills markiert. |
| 2026-09-04 | Durchgang über die 16 Blitz-Skills mit Einordnung. Streichvorschlag Breitenbeschleuniger, zweiter Kandidat Gewitterfront, Blitzschlag für den Stufen-Durchgang vorgemerkt. Entscheid offen. |
| 2026-09-04 | Owner: Breitenbeschleuniger gestrichen, die 15 stehen. Stufen-Vorschlag für alle 15 eingetragen, heute = Selten bis Sehr selten, Direkt-Score überall ersetzt. Entscheid je Skill offen. |
| 2026-09-04 | Stufen gesetzt: Blitzableiter, Statische Aufladung, Reststrom, Gewitterfront und Entladung (beide ohne Deckel überarbeitet). Systemregel: Crit-Chance über 100 % gibt einen sehr kleinen Crit-Mult-Bonus. |
| 2026-09-05 | Ladungsserie (ohne Deckel) und Kettenblitz gesetzt. Lesart A gesetzt: kein Selbstwachstum der Stapel, Stapel nur aus Leiste und Skills. Messung beider Lesarten eingetragen. |
| 2026-09-05 | Blitzfänger zweimal überarbeitet, zuletzt auf Owner-Vorgabe: ein Effekt, Stapel-Schwelle sinkt mit der Stufe. Stapel-Tiefe in realen Builds gemessen (Passiv-Zahlen waren die untere Schranke) und als Referenz für alle Schwellen-Skills eingetragen. |
| 2026-09-05 | Stufen gesetzt: Blitzfänger, Kurzschluss, Spannungsstau (ohne Deckel), Überschlag (Crit-Mult statt Ladung), Überspannung, Blitzschlag, Dauerstrom (nur Serie zu Ladung), Serienschutz. Blitz damit komplett, Übersicht in 3.6. Sim-Notiz: Bonus je Stapel ist ein Regler. |
| 2026-09-05 | Legendäre: Rahmen gesetzt (keine Stufen, kein Tor, 3–4 % je Platz im Türwurf, kein Ersetzen, zwei möglich, zwei Effekte erlaubt). Alle vier Blitz-Legendären gesetzt: Donnergott, Doppelentladung, Hochspannung (neu, ersetzt Flächenionisation), Durchschlag. Übersicht in 3.7. |
| 2026-09-05 | Feuer begonnen. Reihenfolge vom Owner: Feuer durcharbeiten, Blitz und Feuer umsetzen und über die Sim tarieren, dann die weiteren Fraktionen. Passiv heute mit Messung, Passiv neu nach Owner-Idee (Hitze aus Siegen mit Abstand, Niederlagen kühlen, Skills nutzen die Hitze, Schmiede ohne Asche), Zahlen als Vorschlag, Bestand 17 + 4 aufgenommen. |
| 2026-09-05 | Feuer-Passiv komplett gesetzt (dazu je 10 % Hitze +2 % Score, kein Direkt-Score, keine Abhängigkeit von gehaltenen Skills). Funkenflug und Schmelzofen gestrichen. Alle 15 Feuer-Skills mit vier Stufen gesetzt, Verbraucher-Regel entfällt, Regel "Hitze-Schwellen-Leitern brauchen ein Episch-Extra". Übersicht in 4.6. |
| 2026-09-05 | Alle vier Feuer-Legendären gesetzt: Sonnenkern (Brände stapeln), Phönixfeuer (Niederlagen heizen, Neuzündung ohne Limit), Sonnenzorn (Spitzen-Hitze, doppelter Multiplikator), Damaststahl (freie Schmiede, doppelter Schmiedewert im Kampf). Blitz und Feuer damit fertig für die Umsetzung. |
| 2026-09-05 | Phase 1 umgesetzt (7.1): Stufenwurf je Platz mit Legendär als fünfter Stufe, 40-Runden-Plan ohne Legendär-Phase, Slots unbegrenzt, Stufe sichtbar. Gates grün; Sim-Band vorläufig neu zentriert. |
| 2026-09-05 | Phase 2 umgesetzt (7.2): Blitz-Modul mit Passiv, 15 Skills auf vier Stufen, 4 Legendären und Systemregel; Altlasten raus. Technische Entscheide dort festgehalten. Gates grün. |
| 2026-09-05 | Phase 3 umgesetzt (7.3): Feuer-Modul mit Passiv (Hitze aus Vorsprung, Kühlung −2, Hitze-Multiplikator als Faktor), 15 Skills auf vier Stufen, 4 Legendären; Asche, Feuer-Score, Glutdividende, Überhitzung, Funkenflug, Schmelzofen, Verbraucher-Regel raus. Technische Entscheide dort festgehalten. Gates grün. |
| 2026-09-05 | Phase 4 und 5 (7.4): veraltete Texte nachgezogen (Vorsprung, Skill-Slot, Bekenntnis, Meisterhand, Direkt-Score-Tooltip), Anzeige-Stand notiert, Deploy grün. Erste Sim-Zahlen: Feuer 2,69M und Blitz 2,36M mono gegen Eis 5,83M und Pflanze 5,15M (alter Stand), Feuer+Blitz Splash 0,96× gesund, Skill-Lifts je Fraktion. Tarier-Vorschlag an den Owner. |
| 2026-09-05 | Owner: Eis und Pflanze ignorieren, Feuer und Blitz tarieren, dann große Auswertung (gierig, gemischt, über die Stufen). Tarierung (7.5): Sim-Welt „nur Feuer und Blitz" (Allowlist je Lauf, `--mode duel`), Stapel-Score 12 → 60 nach Sweep; Floor Feuer ÷ Blitz 0,97×, Split gesund. Auswertungs-Modus `--mode skills` gebaut. |
| 2026-09-05 | Große Auswertung (7.6, vor den Türen): stark Sonnenkern, Klinge, Weißglut, Ladungsserie, Doppelentladung, Durchschlag; tot Feuerwalze, Schmiede, Glutstahl, Spannungsstau, Blitzschlag, Überspannung, Reststrom; schadet Glut, Serienschutz, Blitzfänger, Feuersturm, Glutbett, Kurzschluss, Damaststahl; Stufenleitern in der Sim noch nicht sichtbar. Fünf Vorschläge an den Owner, nichts umgesetzt. |
| 2026-09-05 | Türen-Angebot umgesetzt (7.7): zwei Türen à drei Fraktionssymbole, Stufen hinter der Tür, Angebot auf einer Seite; Pool auf exp Feuer/Blitz (Annahme, Owner bestätigen); Sim-Policies wählen Türen. Stufentexte: ein Text je Stufe im Angebot und im Bestand. Sim-Band neu zentriert. |
| 2026-09-05 | Motor-Diagnose (7.8, `--mode motor`): das Feuer-Passiv hält die Hitze allein (226 % Gewinn gegen 14 % Kühlung je Runde, 62 % der Stiche ≥ 100 %), Glut ist tot, weil die Leiste voll ist, Engpass ist der Kaltstart (532 Stiche bis 100 ohne, 263 mit Zunder); Konsumenten verbrennen die Basis. Blitz: Crit trägt 48–59 % des Scores, Stapel 13 % (Stapel-Build 33 %), Ionisierung alle 30 Stiche. Vorschläge an den Owner. |
| 2026-09-05 | Große Auswertung mit Türen (7.9): robust stark Sonnenkern, Klinge, Weißglut, Ladungsserie, Doppelentladung, Durchschlag; robust schädlich Glut, Glutbett, Feuersturm, Spannungsstau; tot Glutstahl, Schmiede, Überspannung, Reststrom, Kurzschluss; Konsumenten und Phönixfeuer ungenommen. Gierig 14,4M gegen 16,4M flach. Stufen tragen weiter nicht. Fünf Punkte für den Owner. |
| 2026-09-05 | Owner: Pool Feuer/Blitz bestätigt; Neuwurf würfelt die drei Skills der geöffneten Tür neu (umgesetzt); Hitze schneller verbrauchen (7.10): Kühlung 2 → 6, Vorsprung-Offset 2 → 1 nach Sweep — ein Verstärker zahlt jetzt +10 % (Glut) bis +23 % (Zunder), Feuer mono gegen Blitz mono 1,00×. Danach die große Runde mit Random-Picks (7.11). |
| 2026-09-05 | Random-Runde (7.11, `--policy random`): Zufallsspieler 2,08M gegen gierig 14,4M; Lifts statt Ablation lesen. Feuer: die drei Verbraucher kosten 9–25 %, Verstärker neutral (zahlen nur mit Klinge/Weißglut), Sonnenkern 3,68. Blitz flach (15 von 19 zwischen 0,9 und 1,05), Durchschlag 1,47, Ladungsserie 1,16. |
| 2026-09-06 | Owner zu den Empfehlungen: Glut als Kaltstart und Stapel auf den Crit-Multiplikator umsetzen (7.12), Stufen und übrige Tote warten, Verbraucher offen (keine neue Leiste). Umgesetzt: Glut ×2 Hitze unter 40/50/60/80 %; +0,15× Crit-Mult je Stapel der Siegkarte (Sweep: 0,1× / 0,15× / 0,2×), Crit je Skill 5 → 4 %. Glut + Kern +49 % im Motor, im gierigen Lauf neutral; Stapel-Build auf Augenhöhe mit dem Crit-Build, Kurzschluss zahlt, Phönixfeuer stark; Duell Floor 0,98×. Auswertungen gierig (13,0M) und random (2,0M) neu gefahren. |
| 2026-09-06 | Owner: die volle Leiste ist der Auslöser der Verbraucher (7.13, umgesetzt): Flächenbrand, Schmelzpunkt und Schmiede zünden nur bei voller Leiste, Flächenbrands 80-%-Schwelle entfällt; Texte, Glossar, Hitzeleiste nachgezogen. Feuer mono +21 % (2,86M), Floor Feuer ÷ Blitz 1,18×; gierig 13,5M, random 2,15M. Die Verbraucher bleiben die Falle (0,77 / 0,83 / 0,93): gemessen, dass verbrannte Hitze über Klinge und Siegquote die Serien kostet (Flächenbrand + Kern ×0,45), dreifache Auszahlung hilft nicht. Vorschläge: Überlauf-Wandler oder streichen; Parität über Stapel-Score 120 (Sweep). Nichts davon umgesetzt. |
| 2026-09-06 | Owner: Schmiede ohne Preis, nur Schwelle (7.14: ab 80/60/40/20 % Hitze, Episch zwei Karten, die Hitze bleibt); 50 Runden bei gleicher Phasenfolge (13 Skill-Phasen, `buildSchedule` = der Block für jede Länge); Parität: Stapel-Score 60 → 75 nach Sweep bei 50 Runden (Floor 1,07×, Mean 0,95×, p90 0,93×); Sim-Band neu zentriert. Neu `--mode legendaries` (7.15): jedes Legendäre zur Laufmitte, gepaart — Doppelentladung +106 %, Sonnenkern +133 %, Durchschlag +25 %, Hochspannung +17 %, Damaststahl/Donnergott neutral, Phönixfeuer/Sonnenzorn −17 %. Gierig (nur noch gierig): 48,6M, Schmiede jetzt genommen aber neutral, Reststrom erstmals stark, Verbraucher bleiben die Falle. Offene Liste mit Vorschlägen in 7.15. |
| 2026-09-06 | Owner: Punkte 1–3 aus 7.15 (7.16, umgesetzt): Schmelzpunkt als Überlauf-Wandler (15/20/25/30 je Punkt, Episch zahlt die Kühlung bei voller Leiste nach), Flächenbrand gestrichen (Feuer 14 = Untergrenze, Emblem-Master bleibt), Glut 50/60/70/90 mit halber Kühlung (E), Zunder 2–5. Schmiede bleibt. Gemessen: Feuersturm × Schmelzpunkt ist ein Runaway (Feuer mono 30M, 4,2× Blitz; ohne Feuersturm 1,7×). Feuersturm wartet wegen der Untergrenze auf seinen Ersatz — Vorschlag: Umbau in seinem Platz (Serie zu Score bei voller Leiste). Parität erst nach Feuersturm und der Blitz-Runde. Sim-Band neu zentriert. |
| 2026-09-06 | Owner: ja zum Feuersturm-Umbau (7.17, umgesetzt): bei voller Leiste zählt jeder Serienpunkt +Satz Score, Episch ab 80 %, keine Hitze mehr. Satz nach Sweep 0,1/0,15/0,2/0,3 % statt 0,5–1,5 % (der Vorschlag war ×3 Blitz): Feuer mono 13,3M, Floor 1,86×, Mean 1,12×, p90 0,96×; Feuersturm-Lift 1,10 (Episch 2,06 — Tor-Frage offen). Blitz-Plan als Vorschlag: Rate zusammenlegen, zwei freie Emblem-Plätze (Ionenfeld, Vorentladung) neu belegen, fünf Skills in ihrem Platz umbauen, Rampen gegen den Crit-Deckel messen. |
| 2026-09-06 | Owner: ja zu Feuersturm-Tor 90 % und zum Blitz-Plan (7.18, umgesetzt): Blitzableiter nimmt Statische Aufladung und Dauerstrom auf (beide gestrichen); Ionenfeld (02, Feld nach jeder Leiste) und Vorentladung (12, Serie zu Crit-Multiplikator) neu auf den alten Emblem-Plätzen; Kettenblitz vertieft, Blitzfänger und Überspannung ohne Schwelle, Blitzschlag schneller, Spannungsstau auf den Crit-Multiplikator. Blitz mono 7,2M → 11,0M, Floor 1,86× → 1,22× (Mean 0,89×, p90 0,79×); der 8×-Deckel bindet bei einem Zehntel der Crits. Stapel-Score bleibt 75 (Sweep 60/75/90: Median gegen Schwanz). Gierig 71,6M, Blitz-lastig; die umgebauten Skills sind Füller (gehalten, neutral), Träger unverändert. Offene Liste in 7.18. |
| 2026-09-06 | Owner: „passt, alles" zu den 7.18-Empfehlungen (7.19, umgesetzt): Ionenfeld 3/3/4/5, Kettenblitz jede Leiste +1/2/3/4, Überspannung als Dauerwert je Leiste (+1/1/2/3, keine Ladung), Überschlag gestrichen (Blitz 14), Crit-Deckel 8 → 12; Sonnenzorn liest die Spitze bis 200, Phönixfeuer +3 je Punkt und hält bei voller Leiste die erste Niederlage je Runde. Gemessen: die Parität kippt — Blitz mono 11,0M → 17,9M, Floor 0,76× (Mean 0,49×, p90 0,43×); der Dauerwert trägt den Median-Sprung, Ionenfeld den zweiten Teil, Deckel und Kettenblitz-Tiefe den Schwanz. Gierig 155,9M (verdoppelt; der Deckel trägt davon ein Fünftel, der Rest hängt am gemischten Build, nicht an einem Skill; die Füller bleiben Füller); Legendäre zur Laufmitte messen die Fraktionswahl; Lifts im Feuer-Build Sonnenzorn 0,83 → 0,94, Phönixfeuer 0,84 → 0,87. Sim-Band neu zentriert. Vorschlag: Ionenfeld 2/3/4/5, Deckel zurück auf 8, Kettenblitz +1/1/2/3 (Floor 1,09×, Mean 0,81×, p90 0,70×). Nichts davon umgesetzt. |
| 2026-09-06 | Owner: Raritäten unterscheiden sich immer (§1); „ja zu allem" (7.20, umgesetzt): Ionenfeld 2/3/4/5, Überspannung 1/2/3/4, Deckel zurück auf 8; Donnergott zahlt je Stapel +0,25× statt flach +0,4×; Phönixfeuer wandelt den Überlauf aus Niederlagen (+30 je Punkt beim nächsten Sieg); Sonnenzorn +5 % je 10 % Spitze und Siege heizen ×2 unter der Spitze; Hochspannung und Glutbett bleiben. Gemessen: Parität zurück (Floor 1,23×, Mean 0,80×, p90 0,61× — Stand 7.18), Motor Blitz 12,7M / 22,5M / 21,5M, Band im Rahmen. Legendäre zur Laufmitte: Sonnenzorn erstmals positiv (+12 %), Phönixfeuer −15 %, Donnergott −19 % (Pick-Kosten im gemischten Build; im reinen Blitz-Build 2,57). Gierig 107,3M; Donnergott (25 %) und Sonnenzorn (19 %) werden jetzt genommen und sind neutral. Phönix-Sonde: der Überlauf trägt ~400 Hitzepunkte je Lauf, der Satz ändert nichts (bleibt 30) — Owner-Frage in 7.20. |
| 2026-09-06 | Owner: Phönixfeuer streichen, neues Legendäres bauen — Wahl „Ewige Glut" (7.21, umgesetzt, Platz SK_FIRE_L02, Emblem bleibt): jede Runde mit voller Leiste am Ende +0,05 auf den Hitze-Multiplikator dauerhaft (Vorschlag 0,03, Sweep 0,03/0,05/0,08 zur Laufmitte 1,02/1,14/1,32 gepaart), die Hitze fällt nie unter 50 % der Spitze. Gemessen: Lift im reinen Feuer-Build 1,13 (Phönixfeuer 0,86), ab Runde 1 gepaart 1,57 (Mean 2,79), zur Laufmitte 1,14; Legendäre-Reihe +6 %; Duell Floor 1,25×, Mean 0,87×, p90 0,70×; gierig 125,0M, Ewige Glut neutral; Band im Rahmen. |
| 2026-09-06 | Owner: „die offenen abarbeiten", „alle ja" (7.22, umgesetzt): Rückzündung als Konter (nach einer Niederlage zählt der nächste Sieg ×1,15/1,25/1,35/1,5, Episch +2 Wert; keine Hitze mehr); acht Episch-Extras (Reststrom Leiste 9, Gewitterfront +0,02× Crit-Mult je Leiste, Vorentladung 0,15, Kettenblitz zweittiefste +1, Blitzfänger +1 je Stapel, Kurzschluss Stapel-Score bei Niederlage → nächster Sieg, Zunder Niederlage +2 Hitze, Verbrennung ×1,5 auch auf Hitze); Durchschlag und Kurzschluss-Pick bleiben (Rauschen). Gemessen: Rückzündung von −31 % auf neutral, Verbrennung und Gewitterfront erstmals „stark"; Duell Floor 1,16×, Mean 0,82×, p90 0,63×; gierig 99,5M (Streuung ±20 % zwischen Läufen); Band im Rahmen. Messfehler gefunden: Lifts zu 90 % gehaltener Füller waren durch Legendär-Halter in der „ohne"-Gruppe verzerrt — Filter `NOLEG=1`, Schiedsrichter ist die gepaarte Ablation. |
| 2026-09-06 | Owner aus dem Spiel: „Ladungsserie ist zu krass" (Serie 540, Crit 549 %), „Glut muss weg, dafür etwas mit hohen Kartenwerten und Formation" (7.23, umgesetzt): Ladungsserie ÷10 (0,1 / 0,15 / 0,2 / 0,25 % je Serienpunkt; gemessen ÷2, ÷4, ÷10 — ÷4 ließ sie Träger, +138 %; Serien in der Sim: Feuer mono Median 614), Feuerlinie ersetzt Glut auf SK_FIRE_01 (Formations-Sieg +2 / 3 / 4 / 5 % Score je Punkt Kampfwert, verbrennt 3 % Hitze, Episch je Formation; Vorschläge Brennglas und Flammenherd verworfen). Gemessen: Duell Floor 1,29×, Mean 0,86×, p90 0,71×; Motor Feuer vom Anschlag geholt (54 % → 31 % der Stiche); gierig 53,2M, Feuerlinie +15 % (zweitbester Feuer-Pick), Ladungsserie +28 % (Träger war +204 %); Band neu zentriert (4,05M / 5,91M). `pctS` auf zwei Nachkommastellen (0,15 stand als 0,2). Owner: Durchschlag und Rückzündung unterperformen — Vorschläge in 7.23 (Nachzündung; Durchschlag mit doppelter Chance und Ladung je Niederlage ohne Crit), nichts davon umgesetzt. |
| 2026-09-06 | Owner: „die Niederlage-Bedingung umgehen" (7.24, umgesetzt): Überspannung verwertet den Überschuss über dem Crit-Deckel (je 4 / 3 / 2 / 1× über 8× +1 Ladung, Episch je 25 % Crit-Chance über 100 % +1 — gemessen: Crit über 100 % gibt es seit ÷10 fast nur in den Runden 41–50, der Deckel-Überschuss ist ein Vielfaches davon); Rückzündung im Takt (jeder 5. / 4. / 3. / 2. Sieg in Folge ×1,5, Episch kämpft die zündende Karte mit +2). Durchschlag-Vorschlag (Viertel über dem Deckel) „zu situativ" — drei neue Vorschläge (Lichtbogen, Kettenreaktion, Erdung), nichts umgesetzt. Gemessen: Feuer mono 14,2M, **Blitz mono 7,3M (−28 %)** — der Dauerwert je Leiste war die einzige Dauerwert-Quelle des Blitzes; Floor 1,93× (Mean 1,44×, p90 1,17×); Stapel-Score 125 nur 1,54×; Sonde Dauerwert als Passiv `SIM_ION_VALUE_PER_BAR` +1 → 13,0M, Floor 1,09× (Mean 0,71×, p90 0,55×). Gierig 47,7M (Ø 10,5 Skills), Band im Rahmen. **Owner: Parität nach Empfehlung (a)** — der Dauerwert +1 je Leiste ist Blitz-Passiv (umgesetzt, `ION_VALUE_PER_BAR` 1, Passiv-Text/Tooltip/Glossar): Blitz mono 13,0M, Floor 1,09×; Motor Crit zuerst 31,3M (Kreislauf Dauerwert × Vorentladung × Überspannung Episch, Wachpunkt); gierig 81,5M (Ø 13,0 Skills); Legendäre Doppelentladung +70 %, Durchschlag −9 %; Band neu zentriert (4,72M / 7,90M). Owner: die drei Durchschlag-Vorschläge sind zu langweilig — fünf Konzepte auf offenen Achsen (Resonanz, Durchschlag neu, Gewitter, Plasma, Blitzlenker) in 7.24, Empfehlung Resonanz, nichts umgesetzt. |
| 2026-09-06 | Owner: „Resonanz ist stark, nehmen wir" (7.25, umgesetzt): SK_LIGHTNING_L04 Resonanz ersetzt Durchschlag (Emblem bleibt) — ionisierte Karten in einer Formation teilen ihre Stapel, die gespielte Karte kämpft mit der Summe (Stapel-Score, Crit-Mult je Stapel, Blitzfänger, Kurzschluss, Doppelentladung); `computeFormations` liefert die Mitglieder je Lauf (`members`), Engine-Lesesicht `pCardR`, Regler `SIM_RESONANZ_SHARE` 1; Durchschlag samt Zufallsstrom gestrichen. Gemessen: Legendäre zur Laufmitte Resonanz +48 % (Sonnenkern +121 %, Doppelentladung +50 %; Durchschlag war −9 %), reiner Blitz-Build Lift 4,25, gierig in 29 % gehalten, +64 % typisch, Lift 2,22 (Kettenblitz dadurch erstmals stark), Median 77,8M, p95 803M (Schwanz-Wachpunkt); Duell unverändert (Floor 1,09×). Gates grün. |
| 2026-09-06 | Übergabe an die nächste Sitzung: `docs/workstreams/skill-rework/HANDOFF-2026-09-06.md` (Stand, Owner-Regeln, Rundenablauf, Code-Karte, Messwerkzeuge und Leseregeln, Wachpunkte, Methode für den Skill-Pass mit Überschneidungs-Kandidaten, Einstieg Pflanze, Startprompt). Die Messskripte der Runden 7.22–7.25 liegen jetzt unter `sim/probes/` (README dort). Nächste Aufgabe (Owner): Pass über alle Feuer- und Blitz-Skills — unterschiedlich genug, genug Varianz, Beschreibungen gut — danach Pflanze. Nichts am Spiel geändert. |
| 2026-09-06 | Pass über alle Feuer- und Blitz-Skills (7.26, Befund, nichts umgesetzt): Auslöser- und Ertrags-Raster je Fraktion (Blitz hängt fünffach an der vollen Leiste, Feuer vierfach an einer Hitze-Schwelle; unberührt bei Blitz sind Formation, Gegnerdeck, Durchlaufende), acht Dubletten nach Schärfe, der gemessene stille Konflikt (Weißglut schaltet Feuersturm Normal bis Sehr selten und Schmelzpunkt ab, weil beide Tore die Build-Leiste lesen — die Feuersturm-Leiter dreht sich dabei um), die Stufenleitern (Feuer 6 von 14 mit festem Ertrag, vier teilen die Leiter 80/60/40/20; Feuerwalze viermal +2), sieben Textpunkte (Runde statt Durchlauf an 7 Stellen, ein Gedankenstrich, fehlende Prozentpunkte, Blitzableiter Episch mit drei Effekten). Dreizehn Vorschläge je Skill plus sechs Konzepte für zwei mögliche freie Plätze. Entscheid Owner, einzeln. |
| 2026-09-06 | Owner setzt die Reihenfolge (1 → Feuerwalze → Gewitterfront/Entladung → Textpaket). Punkt 1 vor der Umsetzung nachgemessen und **den eigenen Befund korrigiert** (7.26 C, neue Sonde `sim/probes/weissglut-gate.mjs`): Weißglut schaltet Feuersturm und Schmelzpunkt **nicht** ab. Isoliert bei 100 % Hitze stimmt es (×1,10 → ×1,00, +135 → 0), im Lauf nicht — der Weißglut-Build läuft bei Ø 141 % statt 52 % Hitze und steht in 40 % der Stiche auf 200, häufiger als ein Build ohne Weißglut die 100 erreicht (24 %). Kein Regelfehler, sondern eine versteckte Kopplung: ein Pick schreibt die Schwelle zweier anderer Skills um, ohne dass ein Text es sagt. Drei Lesarten an den Owner (so lassen / Text nennt die Zahl des Builds / Tore auf 100 % festnageln — Letzteres ist ein Buff, weil dieselbe Hitze dann über Weißglut und Schmelzpunkt zweimal zahlt), keine Empfehlung. Nichts umgesetzt. |
| 2026-09-06 | **Owner: Lesart 1 — so lassen.** Die Tore lesen weiter die Leiste des Builds, Weißglut verschiebt sie mit, Texte bleiben. Punkt 1 der Liste in 7.26 F ist damit zu, ohne Code- oder Textänderung; die Kopplung ist gewollt und wird nicht wieder aufgemacht. Nächster Punkt: Feuerwalze (7.26 F.2) — braucht ein Konzept vom Owner für den frei werdenden Platz SK_FIRE_08. |
| 2026-09-06 | Owner zu Punkt 2: Konzept **Brandschneise**, mit dem Einwand, dass später im Lauf alle Positionen gewonnen werden (7.27). Gemessen (neue Sonde `sim/probes/positions-won.mjs`, Feuer mono, 100 Läufe): der Einwand stimmt und ist schärfer als erwartet — nach 3 Durchläufen sind 28,8 von 40 Positionen schon einmal gewonnen, nach 10 sind es 36,4, ab Durchlauf 41 alle 40. Die Bedingung siebt drei Durchläufe und ist danach eine Formalität, in der zweiten Laufhälfte wäre der Skill ein bedingungsloser Score-Faktor. Drei Bauformen mit struktureller statt historischer Knappheit an den Owner (feste Breite, jeden Durchlauf neu geschlagen / zusammenhängendes Band / Kette je Position), Empfehlung (a). Feuerwalze geht dafür raus (vier Stufen mit viermal +2, tot in 7.6, 7.9, 7.13). Nichts umgesetzt. |
| 2026-09-06 | **Owner: „feste Breite, Variante a"** (7.27, umgesetzt): Brandschneise ersetzt Feuerwalze auf SK_FIRE_08 (Emblem umbenannt, Feuer bleibt bei 14) — die 3 / 4 / 5 / 6 Siege mit dem größten Vorsprung eines Durchlaufs schlagen die Schneise, im nächsten Durchlauf zählt ein Sieg auf diesen Positionen ×2,5; Episch hält sie zwei Durchläufe. Erster normaler Skill auf der Achse „eigene Reihenfolge" und der erste Feuer-Skill ohne Hitze-Tor. Zustand im Hitze-Substate (`laneWins` je Durchlauf, `lanes` = die zwei jüngsten Schnitte), Schnitt in `fireCycleEnd` (größte Vorsprünge, bei Gleichstand die kleinere Position), `schneiseMult` als Faktor im Feuer-Stack; `fireValueBonus` verliert den Feuerwalze-Zweig, die Hitzeleiste ihr Abzeichen. Satz nach Sweep im Duell: ×1,5 / 2 / 2,5 / 3 → Floor 0,91 / 0,96 / **1,00** / 1,03× (Breite 5–8 statt Faktor zahlt schlechter), gesetzt ×2,5 — Feuer mono 12,97M, Blitz mono 13,0M. Gemessen und offen benannt: die Feuerwalze war im Fraktions-Build kein toter Skill (Dauerbonus bei 70 % Siegquote), Feuer mono fiel ohne sie von 14,2M auf 11,8M; das Niveau bleibt unter 7.25, das Band ist neu zentriert (2,64M / 5,90M). Gierig zweimal: Brandschneise in 11 % / 15 % gehalten, Ablation −5 % / 0 % — Füller, wie ein neuer Skill startet. Gates grün. |
| 2026-09-06 | Owner: „wir müssen mit Crit über 100 % umgehen — eventuell 0,01 Crit-Multiplikator je Prozentpunkt" und „Überspannung mag ich vom Design nicht, eher etwas auf den Ionisierungen der Karten" (7.28, Befund und Vorschläge, **nichts umgesetzt**). Antwort auf die Frage: kartenabhängig Crit aus Ionisierung gibt es nur als Systemregel (+0,15× Crit-Multiplikator je Stapel der Siegkarte), als Donnergott (0,25×) und indirekt über Kurzschluss (doppelte Stapel ab Schwelle) — die Richtung **Stapel → Crit-Chance** ist frei. Gemessen (neue Sonde `sim/probes/overcrit-engine.mjs`): Crit-Chance ≥ 100 % gibt es erst spät (Blitz mono 0 % der Stiche bis Runde 30, 3 % in 31–40, 15 % in 41–50), dort mit Ø 70 pp Überschuss, aber 27 % der Crits stehen dann schon am 8×-Deckel. Sweep der Regel im Duell (0,002 / 0,005 / 0,01 / 0,02): Blitz mono 12,97 / 12,97 / 12,98 / 13,02M, Floor überall 1,00× — **der fünffache Satz bewegt den Median um 0,1 %**, weil der Deckel abschneidet, was die Regel drauflegt. Eigene Erwartung damit korrigiert: „Überschuss → Multiplikator" ist keine Rückkopplung, sondern eine Sackgasse, solange der Deckel bei 8 steht. Fünf Vorschläge für SK_LIGHTNING_04 (Zündschnur, Tiefenschlag, Überladung, Ladungsbogen, Ionenlast), Empfehlung Zündschnur plus Satz 0,01; die Frage „soll der Überschuss eine eigene Währung bekommen (Stapel/Ladung)?" liegt beim Owner. |
| 2026-09-06 | **Owner-Entscheide (7.28):** (1) die Crit-Chance ist bei 100 % gedeckelt, jeder Prozentpunkt darüber wird **+0,01× Crit-Multiplikator** — `OVERCRIT_MULT_PER_PP` 0,002 → 0,01, Systemregel in §1 und Glossar nachgezogen, Wächter in `lightning-rework.test.js` auf die neue Invariante umgeschrieben (der Überschuss aus 100 Prozentpunkten bleibt unter einem Achtel des Deckels). (2) **Zündschnur ersetzt Überspannung** auf SK_LIGHTNING_04, aber unter anderem Namen — „Zündschnur" klingt nach Feuer; Namenswahl beim Owner, Mechanik und Startwerte stehen (jeder Stapel der gespielten Karte +0,5 / 1 / 1,5 / 2 % Crit-Chance auf den Stich). (3) Owner zum Vorgehen: **erst Design, dann Startwert, dann messen — und nur auf Ansage.** Die Runden 7.23–7.28 haben zu viel Sim-Zeit verbraucht. |
| 2026-09-06 | **Lichtbogen ersetzt Überspannung** auf SK_LIGHTNING_04 (7.28 E, umgesetzt; Emblem umbenannt, Blitz bleibt bei 14): jeder Stapel der gespielten Karte gibt +0,5 / 1 / 1,5 / 2 % Crit-Chance auf den Stich — die Richtung „Ionisierung → Crit-Chance", die vorher weder Regel noch Skill bediente. Name vom Owner gewählt (Arbeitsname „Zündschnur" klang nach Feuer). `lightningCritChance` liest die gespielte Karte (mit Resonanz-Summe, Zählung über `effectiveStacks` — Kurzschluss verdoppelt hier wie überall); mit Überspannung fällt der letzte Leser des ungedeckelten Crit-Multiplikators weg (`critMultRaw` raus, Überschuss über dem Deckel verfällt). Startwerte **nicht gemessen** — Owner: erst Design, dann Startwert, gemessen wird auf Ansage. Gates grün. |
| 2026-09-06 | Lichtbogen gemessen (7.28 F, auf Ansage): **Duell-Median taugt für Crit-Chance nicht** — Sweep halb/Start/doppelt gibt 13,36 / 10,31 / 15,31M (nicht monoton), Kontrolllauf mit anderem Seed-Satz 12,96M statt 10,31M bei unverändertem Stand; eine andere Chance kippt andere Stiche zu Crits und schreibt den Rest des Laufs um. Der Multiplikator-Sweep in C war davon nicht betroffen. Gierig (Schiedsrichter): Lichtbogen in **84 %** gehalten, Ablation **+3 %** — Füller, aber er hebt das Tiefen-Bündel (Blitzschlag +31 %, Kurzschluss +25 %, Kettenblitz +22 %, Resonanz +238 %), weil Tiefe jetzt dreifach zahlt. Schwanz unverändert (gierig p95 798M gegen 803M in 7.25). Empfehlung: Startwerte lassen; Regler ist der doppelte Satz, dann gierig neu messen. Nichts geändert. |
| 2026-09-06 | **Owner: „so lassen, ist fein"** — die Startwerte des Lichtbogens (0,5 / 1 / 1,5 / 2 % Crit-Chance je Stapel) sind damit gesetzt, kein Regler gedreht. Der Blitz-Platz SK_LIGHTNING_04 ist zu; offen aus der Reihenfolge in 7.26 F bleiben Punkt 3 (Gewitterfront/Entladung zusammenlegen, dann ein freier Blitz-Platz) und das Textpaket. |
| 2026-09-06 | **Textpaket (7.26 E, Owner: „in einem Rutsch", umgesetzt).** Zehn Stellen in `skills.js`: „Runde" → „Durchlauf" an sieben (Serienschutz Episch, Brandmal, Lauffeuer, Schmiede — „Rundenende" wird „Am Ende eines Durchlaufs" —, Sonnenkern, Ewige Glut, Damaststahl); der einzige Gedankenstrich im Register (Sonnenzorn) aufgelöst; Prozentpunkte dort, wo gegen die 100er-Schwelle gerechnet wird (Weißglut und Sonnenzorn: die Schwelle bleibt ein Niveau „100 % Hitze", der Schritt sind „10 Prozentpunkte"); Glutstahl aus dem Telegrammstil ins Register („Ein Sieg zählt +8 Basis-Score je Punkt Kampfwert über dem Grundwert der Siegkarte"). Überspannung kürzen entfällt — der Skill ist seit 7.28 gestrichen. Blitzableiter Episch behält seine drei Sätze: das wäre ein Mechanikumbau (7.26 F.7), kein Text. Reine Textänderung, keine Kennwerte; `loc:export` neu, Gates grün. Punkt 3 der Reihenfolge (Gewitterfront/Entladung) hat der Owner vertagt — **als Nächstes Pflanze**. |
| 2026-09-06 | **Owner: auf der Skill-Karte nur Fraktion und Rarität.** Das KONSUMENT-Abzeichen ist aus dem Angebot und aus der Ersetzen-Liste entfernt (`SkillSelect.jsx`, Helfer `isConsumer` und Registerzeile `skill.badge.consumer` mit), die Karte trägt jetzt Fraktions-Badge + Stufe (Legendär bleibt die fünfte Stufe, „Ausgewählt" ist ein Zustand, kein Chip). Das Schlüsselwort `consume` bleibt auf Schmelzpunkt: es erklärt den Begriff weiter in der Build-Detailansicht und im Glossar — dort steht „Konsument" also noch, ebenso in der Aufklapp-Liste des Feuer-Passivs. Owner-Frage, falls das auch weg soll. Reine Anzeige, keine Mechanik; Gates grün. |
| 2026-09-06 | **Pflanze, Richtung gesetzt (6.1) und Passiv-Entwurf (6.2).** Owner: Grün bleibt eine Farbe (Variante b), vollgrünes Deck ist das Ziel eines gezielten Builds, Wachstum je Karte, drei Zustände grau/grün/blühend, kein Direkt-Score, Trimmen entfällt (keine Skill-Ersetzung mehr), kein Skill-Tor. Passiv: **+1 Wachstum je Sieg, dazu +1 je aktiver Formation an der Siegposition** (Owner-Idee — die Aufstellung wird zur Wachstumsentscheidung, nicht der Sieg allein); Schwellen als Startwerte grün 30 / blühend 75, blühend trägt den Basis-Score je grüner Karte in seiner Formation. Deckel-Frage auf grüne Farbblöcke bis zu den Sim-Daten vertagt; notiert, dass im vollgrünen Deck der Wechsel stirbt und der Farbblock trivial wird. Nichts umgesetzt, nichts gemessen. |
| 2026-09-06 | **Pflanze, Bestandsaufnahme der 17 + 4 Skills (6.3, Befund, nichts umgesetzt).** Strukturell durchgefallen: 6 Verstärker mit `enabler`, 5 Direkt-Score-Quellen, 3 eigene Multiplikatoren, die Trimm-Klausel an 6 Skills, die Wertachse (Kernholz, Baumreihe-Auslöser, Auto-Sieg bei 11), die Gegnerdeck-Achse (Ausläufer, Rhizom, Erntedank) und die fehlenden Stufen bei allen 17. Je Skill ein Vorschlag: vier bleiben in ihrer Idee (Aussaat, Setzlingsbeet, Zäher Halm, Blätterdach), Jahresringe liefert ein Konzept, Ranken und Überwucherung sind Umbauten, zehn fallen weg; von den Legendären trägt nur Baumreihe ihre Idee weiter (Auslöser Wert 11 → blühend), drei werden neu gebaut. Rollen-Raster für den Entwurf: **Formationsdichte — Karten in mehr Formationen bringen — ist im neuen Passiv der stärkste Hebel und hat heute keinen einzigen Skill.** Entscheid je Zeile beim Owner. |
| 2026-09-06 | **Owner: „ich geh so mit"** — die Streichliste aus 6.3 ist angenommen (zehn normale Skills und drei Legendäre fallen weg, vier bleiben in ihrer Idee, Baumreihe trägt ihre Idee weiter). **Ausnahme Ranken:** Spielerfavorit, bleibt auf SK_PLANT_09 und wird auf das neue Passiv gezogen — nur das sofortige Grünfärben muss weg. Drei Bauformen dafür an den Owner (6.4), nichts umgesetzt. |
| 2026-09-06 | **Owner: Ranken-Bauform 1** (Ansteckung im Reifemoment — wird eine Karte grün, wachsen ihre grauen Nachbarn). Daraufhin der Vorschlag für **die 15** (6.5): vier bleiben (Aussaat, Setzlingsbeet, Zäher Halm, Blätterdach), zwei sind Umbauten (Ranken, Überwucherung — deren feldweiter Multiplikator wird zur Schwellensenkung), Jahresringe kommt als Konzept zurück, acht sind neu. Kern der Fraktion sind zwei neue Skills auf der Formationsdichte (Spalier öffnet Segmentgrenzen über `segInfo.isOpen`, Wildwuchs macht blühende Karten zu Jokern über `isJoker`) — beide Haken existieren in der Formations-Engine und sind bisher ungenutzt. Legendäre: Baumreihe behält die Idee (Auslöser Wert 11 → blühend), Weltenbaum/Mutterbaum/Ewiger Frühling neu und ohne Direkt-Score. Keine Stufen, keine Werte — Entscheid je Zeile beim Owner. |
| 2026-09-06 | **Owner an 6.5: zu viele Wachstums-Skills** (10 von 15), Verpflanzen raus, Raritäten-Leitern für Spalier und Wildwuchs gefragt, Idee „grüne Treppen haben einen Bonus". Neue Aufteilung in 6.6: Wachstum 5, **Formationshebel 4**, **Score aus grünen Formationen 4** (je Formationstyp einer — Farbblock, Treppe, Wiederholung, dazu Tiefe; Wechsel bekommt keinen, weil er im vollgrünen Deck stirbt), **Kombination 2** (zahlen Score und Wachstum). Gestrichen: Unterholz, Wurzelnetz, Aussamen, Frühblüher, Verpflanzen. Neu: Rankgerüst (Treppe), Hecke (Wiederholung), Lücke (grüne Läufe dürfen eine fremde Karte überspringen — `gap.run`/`gap.seg`), Wandertrieb (blühende Karten rücken am Durchlaufende zusammen, ersetzt Verpflanzen), Blütenlese, Überwucherung als Formationsgrößen-Bonus. Leitern: **Spalier** über die Zahl offener Segmentgrenzen (1/2/3/alle von 7), **Wildwuchs** über die Zahl der Joker (1/2/3/alle blühenden) — die Menge ist der Regler. Zur Sim vorgemerkt: wie viele blühende Karten ein Lauf hat. Entscheid beim Owner. |
| 2026-09-06 | **Zwei Owner-Korrekturen und der Endstand der 15 (6.7).** (1) Wandertrieb gestrichen: kein Skill greift in die Aufstellungsordnung ein, die Kategorie „Aufstellung" entfällt. (2) **Faktenfehler von mir korrigiert:** der Wechsel stirbt im vollgrünen Deck nicht — `markWechsel` liest den Zick-Zack über den **Kartenwert** (Richtungswechsel, Mindestdifferenz 4), nicht über die Farbe; die falsche Behauptung stand in 6.2 und 6.6 und ist an beiden Stellen berichtigt. Trivial wird allein der Farbblock. Damit bekommt jeder der vier Formationstypen seinen Score-Skill (neu: **Windung** für den Wechsel). (3) „Ein Mitglied mehr" war unpräzise formuliert — **Überwucherung senkt jetzt die Mindestlänge grüner Formationen** (`minMembers`/`minLen`) und ist damit ein Erkennungs-Hebel statt eines Score-Zuschlags. Endverteilung: Wachstum 5 · Hebel 4 · Score 5 · Kombination 1. |
| 2026-09-06 | **Owner: die 15 stehen.** Vier Stufen je Skill ausgeschrieben (6.8, Startwerte ungemessen): Wachstum über Mengen (Aussaat 1–4, Ranken 5–16, Setzlingsbeet 8–16, Lichtung 1–3, Zäher Halm 1–3), Hebel über Anzahl und Schwelle (Spalier 1/2/3/alle 7 Grenzen, Wildwuchs 1/2/3/alle blühenden, Lücke 1–3 Sprünge, Überwucherung ab 80/65/50/35 % grünem Feld), Score je Formationstyp mit **nach Formationslänge gestaffelten Sätzen** (Farbblock 10–25 je Karte, Treppe und Wiederholung 30–80, Wechsel 35–90, Tiefe 20–50 je 10 Wachstum), Kombination Blütenlese 40–100 plus Wachstum. Gemeinsames Episch-Motiv der Score-Skills: blühende Mitglieder zählen doppelt — der dritte Zustand ist der Verstärker statt eines eigenen Skills. Messliste für die Bauphase notiert (Zahl blühender Karten, Länge grüner Farbblöcke, Wirkung von Spalier Episch). |
| 2026-09-06 | **Owner: drei Formulierungen für dieselbe Sache.** Die vier Score-Skills sagten „je grüner Karte im Block", „je Stufe" und „je Mitglied", Wildwuchs benutzte „blühende" substantiviert, Blütenlese sagte „Mitglieder". Vereinheitlicht auf den Begriff, den das Register kennt — **Karte** (Glossar: eine Formation ist ein „Muster benachbarter Karten"; „Mitglied" steht im Register nur als UI-Zusatz in der Kartendetail-Ansicht): alle vier Score-Skills zahlen „je grüner Karte darin", das gemeinsame Episch-Extra heißt überall „blühende Karten zählen doppelt", Wildwuchs zählt „blühende Karten", Blütenlese lässt „alle Karten darin" wachsen. Reine Formulierung, keine Werte. |
| 2026-09-06 | **Owner: ja zu beiden Episch-Nachschärfungen.** Ranken Episch kettet jetzt (wird eine Karte durch den Ruck grün, wachsen ihre grauen Nachbarn ebenfalls +16 — der einzige Dominoeffekt der Fraktion, ohne Selbstbezug im Text), Überwucherung Episch senkt die Mindestlänge um zwei statt um eine. Damit haben 13 der 15 Episch-Stufen ein Extra oder einen qualitativen Sprung — dasselbe Verhältnis wie bei Feuer und Blitz; reine Zahlen bleiben nur bei Spalier (alle 7 Grenzen) und Wildwuchs (alle blühenden Karten), wo der Sprung selbst qualitativ ist. **Damit ist Pflanze auf dem Papier vollständig:** Richtung (6.1), Passiv (6.2), Bestandsaufnahme (6.3), Ranken-Umbau (6.4), die 15 nach Kategorien (6.6/6.7), Stufen (6.8). Offen: die Umsetzung und die Messliste. |
| 2026-09-06 | **Übergabe für den Pflanze-Bau:** `docs/workstreams/skill-rework/HANDOFF-pflanze-build.md`. Owner will den Bau mit frischem Kontext. Enthält Stand (HEAD, Feuer/Blitz fertig, Pflanze nur auf dem Papier), die Owner-Regeln wörtlich (samt der neuen: erst Design, dann Startwert, gemessen nur auf Ansage), den Vertrag §6.1–§6.8 in einer Seite, die Abrissliste der alten Ökonomie mit Fundstellen (Wertachse, `plantDirect`, `plantFormMult`, Trimmen, `plantCommit`, Kolonisierung, `enabler`), die vier Formations-Haken (`segInfo.isOpen`, `isJoker`, `gap.run`/`gap.seg`, `minMembers`/`minLen`), fünf Etappen, die Messliste für später, die Fallen (Ratchets, ecke-Timeout, Formationen nur an Position 0, loc:export, Band erst nach der Messung neu zentrieren) und einen deutschen Startprompt. |
| 2026-09-07 | **Pflanze gebaut (6.9, umgesetzt).** Neues Modul `src/game/factions/plant.js` mit dem Passiv (Wachstum je Karte: +1 je Sieg, +1 je Formation an der Siegposition; grün ab 30, blühend ab 75; eine blühende Siegkarte gibt +20 Basis-Score je grüner Karte in ihren Formationen), den 15 Skills auf vier Stufen (`PFLANZE_TIERS`) und den vier Legendären. Die vier Hebel (Spalier, Wildwuchs, Lücke, Überwucherung) und zwei Legendäre (Baumreihe, Mutterbaum) ändern die Erkennung in `formations.js`, das dafür ein Bündel `{ skillTiers, growth }` bekommt. Alte Ökonomie raus: Wertachse mit Auto-Sieg bei 11, Alter Anker, `plantDirect`, `plantFormMult`, Trimmen, Bekenntnis-Skalierung (`commitScale` — die Pflanze war ihr letzter Leser), Kolonisierung des Gegnerdecks, die sechs `enabler`; zwei Emblem-Plätze zurückgegeben, zehn umbenannt. Ein Score-Kanal `plantBase` statt drei; PlantBar, Karten-Ring, Kartendetail, Glossar und Passiv-Text auf die drei Zustände umgestellt. Neuer Wächtersatz `test/plant-rework.test.js` (36 Fälle, inklusive Gegenprobe: ohne Pflanzen-Skill rechnet die Formations-Engine unverändert). In EINEM Stück statt in Etappen, weil die Registry-Wächter mindestens 18 Skills je Fraktion verlangen. Gates grün (2321 Tests). **Nicht gemessen, nicht im Türen-Angebot** — beides wartet auf die Ansage des Owners. |
| 2026-09-07 | **Pflanze gemessen (6.10, auf Ansage; Legendäre außen vor — sie bekommen ein Redesign).** Duell mit allen drei Fraktionen (200 Läufe): Feuer 7,75M · Blitz 7,43M · **Pflanze 4,90M** (0,63× / 0,66×), p90 9,72M gegen 18,8M/37,4M, Siegquote 53,3 % gegen 65,3 %; Split aller drei 6,19M über dem Mix 3,58M. Neue Sonde `sim/probes/plant-field.mjs`: das Feld ergrünt ab Durchlauf 11, blühend ab 16–21, am Ende Median 38 von 40 blühenden Karten, längster grüner Farbblock 12, Deck-als-Reihe nur in 13 % der Läufe (**der Grün-Farbblock-Deckel bindet kaum — die offene Frage aus §6.2 ist beantwortet**). Gierig mit allen drei in den Türen (explore 900, gierig 120, Median 21,8M): nur Blütenlese ist „stark" (+6,0M), die vier schlechtesten Picks des ganzen Feldes sind Pflanze-Wachstums-Skills (Zäher Halm −4,8M, Setzlingsbeet −3,8M, Ranken −3,0M, Spalier −2,9M) — die Signatur einer Bekenntnis-Fraktion. Gierig in der Pflanze-Welt: Jahresringe +17 %, Spalier +12 %, Wildwuchs +8 %, Episch-Spitzen Wildwuchs 4,13 / Rankgerüst 3,35 / Spalier 2,18, p95 265M. Regler-Sweep: **der Passiv-Satz ist kein Regler** (Vierfaches = +24 %), „+2 Wachstum je Formation" bewegt mehr (+10 %). Befund: der Pflanze fehlen Multiplikator und Siegquote, ihre einzige multiplikative Achse ist die Erkennung — dort sitzen Spitzen und Schwanz. Fünf Vorschläge in 6.10, Empfehlung: erst die Legendären, dann tarieren. Nichts geändert. |
| 2026-09-07 | **Legendäre auf drei je Fraktion (6.11, Owner: „3 reichen, wir behalten die stärksten").** Gemessen (150 Läufe, gepaart, mittlere Skill-Phase): Resonanz +106 % · Doppelentladung +85 % · Sonnenkern +76 % · Hochspannung +40 % · **Donnergott +30 %** · Damaststahl +8 % · Ewige Glut −8 % · **Sonnenzorn −14 %**. Gestrichen sind damit Donnergott (Blitz) und Sonnenzorn (Feuer) samt ihren vier Konstanten, der Spitzen-Lesart des Hitze-Multiplikators und ihren Emblemen. Die Pflanze bekommt drei neue: **Wurzelgeflecht** (jede blühende Karte zählt in jeder Formation ihres Segments mit — Dichte), **Baumreihe** (blühende Karten als positionsfreie Wiederholung — Multiplikator) und **Ewiger Frühling** (vollgrün → alles blüht — Zielbild); Weltenbaum ist gestrichen (Rampe ohne Auszahlung), Mutterbaum in Wurzelgeflecht aufgegangen. Gemessen in der Pflanze-Welt: Wurzelgeflecht **+152 %**, Baumreihe **+614 %**, Ewiger Frühling +10 % — zwei davon stärker als alles bei Feuer und Blitz. Der Median der Pflanze-Welt steht damit bei 210M statt 9,1M: **die Paritätsfrage aus §6.10 ist neu zu stellen**, die nächste Runde misst das Duell mit Legendären für alle drei. Offen benannt: Feuers verbleibende drei sind dünn (Damaststahl +8 %, Ewige Glut −8 %). Gates grün (2318 Tests). |
| 2026-09-07 | Owner: Sonnenzorn statt Damaststahl, und die neun Legendären auf ein Band. Messfehler in `--mode legendaries` gefunden und behoben (geteilte Wertetabelle, `--table`), vier reglerlose Legendäre bekamen je einen Regler auf der bestehenden Mechanik. Acht von neun liegen jetzt in +58 … +127 % statt +4 … +418 %. Ewiger Frühling erreicht das Band mit seinem Regler nicht und braucht eine Design-Entscheidung. §6.12. |
| 2026-09-07 | Owner: Ewiger Frühling bekommt einen Bonus auf blühende Karten. Umgesetzt als +3 Kampfwert je blühender Karte — der einzige Wert-Hebel der Fraktion, ab der ersten blühenden Karte wirksam; das Zielbild bleibt der zweite Effekt. Startwert ungemessen. §6.13. |
| 2026-09-07 | Owner: keine Kommazahlen auf Karten (Brandmarke zeigt nur ganze Punkte), und alle unter 100 % auf ~100 % heben. Fünf Legendäre über ihre Werte auf +100 … +108 % gebracht; sieben der neun liegen jetzt in +101 … +149 %. Hochspannung (Regler arithmetisch am Ende) und Ewiger Frühling (Wert-Bonus sättigt bei +73 %) erreichen das Band nicht. §6.14. |
| 2026-09-07 | Owner: Ewiger Frühling bekommt neben dem Kartenwert einen Score-Bonus in Formationen; Hochspannung bleibt wie er ist. Umgesetzt als +15 % je aktiver Formation beim Sieg mit einer blühenden Karte — der erste Multiplikator der Fraktion, gemessen +108 % und ohne Sättigung. Acht der neun Legendären liegen jetzt in +101 … +160 %. §6.15. |
| 2026-09-07 | Owner: Wert-Bonus des Ewigen Frühlings +8 → +6, ohne Neumessung. §6.15. |
| 2026-09-07 | Owner: die Pflanze kommt ins Türangebot (SKILL_OFFER_ARCHETYPES um "plant" erweitert). Balance-Guard neu zentriert (Median 2,98M, Mean 4,82M) — der Zufallsspieler fällt, weil die Pflanze als einzige Fraktion einen gebauten Motor braucht. §6.16. |
| 2026-09-07 | Auf Ansage gemessen: Duell aller drei ohne Legendäre (zahlengleich mit §6.10 — §6.11–§6.16 haben nur Legendäre und den Angebotstopf bewegt) und beide Ablationen der Pflanze. Sieben der 15 Pflanze-Skills sind in gemischter UND reiner Welt tot, vier davon die Wachstums-Skills. Parität (×1,55) ist mit den vorhandenen Reglern nicht erreichbar. Vier Routen vorgeschlagen, nichts umgesetzt. §6.17. |
| 2026-09-07 | Owner verwirft den Umbau der Wachstums-Skills: Wachstum ist die Kernmechanik, der Payoff muss aus dem Zusammenspiel kommen. Befund dazu: Wachstum hat nur zwei Ausgänge (die Schwellen 30 und 75), die das Passiv ohnehin erreicht — oberhalb von 75 ist jeder Punkt wertlos, und genau der eine Skill, der die Zahl liest (Jahresringe), ist der beste der Fraktion. Prinzip und drei Routen aufgeschrieben. §6.18. |
| 2026-09-07 | Route 1 gebaut: blühende Karten zählen in den vier Formations-Score-Skills wie 5/5/6/7 grüne, auf jeder Stufe. Parität erreicht (Pflanze mono 7,48M gegen Feuer 7,75M / Blitz 7,43M) und die Erkennungs-Achse deutlich gestärkt (Spalier +12 % → +36 %). Die vier Wachstums-Skills bleiben aber tot — ein flacher Blüh-Faktor hebt alle Skills gleich und hängt am Zustand, nicht an der Zahl. Balance-Guard neu zentriert. §6.19. |
| 2026-09-07 | Owner-Variante B: das Blühgewicht gehört der Karte, nicht dem Skill — „eine blühende Karte zählt wie 5 grüne, je 40 Wachstum darüber wie eine mehr", einmal im Passiv. Die vier Score-Skills sind wieder einzeilig, einfacher als vor der Runde. Wachstum zahlt damit über der Blüh-Schwelle weiter. Startwerte ungemessen. Prozessregel festgehalten: erst Planung, Messen nur auf ausdrückliches Go. §6.20. |
| 2026-09-07 | Variante B gemessen: Pflanze mono 10,49M gegen Feuer 7,75M — überschossen (1,35×). Aussaat ist erstmals in beiden Welten positiv, die anderen drei Wachstums-Skills nicht (sie füttern Karten, die nicht gewinnen). Neue Sonde `plant-overlap`: 8 % der Siege (vier überlappende Formationen) tragen 46 % des Scores, aber der größte Stich eines Laufs macht im Median nur 2,7 % aus — steile Eskalation, keine Lotterie. Vorschlag Grundgewicht 3. §6.21. |
| 2026-09-07 | Grundgewicht 3 gemessen: Pflanze mono 8,36M gegen Feuer 7,75M und Blitz 7,43M — Parität (1,08×). Zielkonflikt sichtbar: bei Gewicht 5 zahlte Aussaat in beiden Welten, bei 3 nur noch in der reinen. Die Überlappungs-Konzentration ist vom Gewicht unabhängig (8 % der Siege tragen 45 %, wie bei 5) — sie sitzt im Formations-Multiplikator, nicht im Gewicht. §6.22. |
| 2026-09-07 | Owner: Grundgewicht 3 bleibt, Kompromiss 4 wird nicht gemessen. Damit ist gesetzt, dass die Wachstums-Skills Mono-Skills sind — im gemischten Build kosten sie den Platz, und das ist gewollt. §6.22. |
| 2026-09-07 | Owner: Spalier zeigt seine offenen Segmentgrenzen jetzt in Aufstellphase und Chronik. Die Rechnung lag inline im Motor und ist als `spalierOpenBorders` plus `openBorderInfo` herausgezogen — eine Quelle für Engine und UI, wie bei `openSegmentInfo`. Die Anzeige rechnet bei jedem Tausch neu, weil Spalier am Grün-Stand der Nachbarkarten hängt. §6.23. |
| 2026-09-07 | Owner: Glutbett war zu schwach (−4 %, Flag „schadet") und bekommt einen zweiten Hook. Der erste freigegebene Vorschlag (Niederlagen am Boden geben Hitze) wurde zurückgezogen — er hebt sich selbst auf und dupliziert Zunder Episch. Umgesetzt: der BODEN steigt um 1/2/3 %, wenn er einen Sturz wirklich abfängt; Episch bleibt „keine Kühlung". Hitzeleiste zeigt Strich und Abzeichen. Ungemessen. §6.24. |
| 2026-09-07 | Owner-Frage: heißt „+1 Wert" im Blitz-Passiv ein Stapel oder Kartenwert? Antwort: Kartenwert, dauerhaft eingebacken; der Stapel ist der zweite, davon unabhängige Effekt derselben vollen Leiste (Doppelentladung gibt fünf Stapel und trotzdem nur +1 Wert, Kettenblitz Stapel ganz ohne Wert). Passiv, Leisten-Tooltip und Glossar „Ladung" benennen jetzt beides getrennt und benutzen den Begriff, den das Register schon führt: Kartenwert. Reine Textänderung, keine Mechanik, keine Messung. Offen: die Schmiede sagt an zwei Stellen weiter „+Wert". §6.25. |
| 2026-09-07 | Owner: die Schmiede auch angleichen. Vier Stellen (Skilltext, Leisten-Tooltip, Karten-Abzeichen, Glossar „Schmieden") sagen jetzt Kartenwert; der Glossar-Eintrag begann bereits mit „Hitze wird zu dauerhaftem Kartenwert" und sagte zwei Sätze später „+3 Wert". Die temporären Kampfwert-Boni (Ionenfeld, Blitzfänger, Glutklinge, Takt, Ewiger Frühling) und die Brandmal-Abzüge bleiben „Wert" — sie sind nicht der gebackene Kartenwert. Offen: zwei Reste des Textpakets aus §7.26, der Schmiede-Tooltip sagt „am Rundenende", Brandmal rechnet in Runden. §6.25. |
| 2026-09-07 | Owner: auch die Reste des Textpakets aus §7.26 angleichen. Drei Stellen im Register und im Glossar sagen jetzt Durchlauf statt Runde (Schmiede-Tooltip, Glossar „Schmieden", Glossar „Brandmal"). Gegengeprüft statt nur umbenannt: `newBrandActive` wird im Durchlauf-Ende-Block der Engine getauscht, der Brand hält also wirklich einen Durchlauf; die Kommentare dort bleiben als Altbestand. Der Dev-Knopf „Runde überspringen" und die Ranked-Texte bleiben. §6.25. |
| 2026-09-07 | Eis aufgenommen, nichts geändert. Befund: die Fraktion ist vollständig gebaut, verdrahtet, sichtbar und mit 111 Tests belegt — aber ohne exp-Struktur und heute unerreichbar, weil `SKILL_OFFER_ARCHETYPES` sie nicht führt (ein `--arch ice`-Lauf misst also einen Zufalls-Build). Acht strukturelle Punkte, der größte: kein Eis-Skill hat Stufen, die Mechanik liest Konstanten über `role`. Drei Owner-Entscheidungen isoliert (Aufstellungs-Lock, Score-Pfad neben der Basis, zwei Deckel) mit Empfehlung. Vorschlag für die 15 + 3: Verschmelzen, Zermalmen und Erstarrung streichen, Eisbrücke, Kettenbruch und Einfrieren bekommen einen Regler, der Rest bleibt. §5.1 und §5.2. |
| 2026-09-07 | Owner nimmt §5.2 an und lässt die Raritäten bauen. Drei Skills gestrichen (Verschmelzen, Zermalmen, Erstarrung), dann die vier Stufen je Skill. Der eigentliche Umbau lag darunter: die Eis-Mechanik las globale Konstanten über die Rolle, eine gewürfelte Stufe änderte nichts. Neu `state.glacierRoleTiers` und `src/game/factions/ice.js` (wie fire/lightning/plant); `glacier.js` hält nur noch, was ohne Skill gilt, 14 Rollen-Konstanten sind dort weg. Eisbrücke, Kettenbruch und Einfrieren haben ihren Regler bekommen; zwei stumme Regeln (Schneetreibens 0-Masse-Sonderfall, Anfrierens Formations-Zuschlag auf jeder Stufe) sind gefallen. Neuer Wächter `test/ice-rework.test.js`. Startwerte, UNGEMESSEN. §5.3. |
| 2026-09-07 | Auf Ansage gemessen. Eis ist ins Angebot gekommen (alle vier Fraktionen an den Türen), Balance-Guard neu zentriert (Median 2,87M / Mean 5,92M). Duell: Eis mono 8,95M gegen Feuer 6,42M, Blitz 5,68M, Pflanze 7,93M — 1,39× über Feuer, dabei der kürzeste Schwanz von allen. Ablation ohne Legendäre: die Fraktion ist flach, kein Skill über +14 %, acht bei oder unter null. Mit Legendären kippt es: die drei Legendären tragen alles, im gemischten Feld sind Ewiges Schild und Große Lawine mit −13 % aber tot. Ursache nachgerechnet: der weiche Deckel lässt in der Großen Fläche 49 % des Bruchs durch und macht aus Abbruchkantes nominalen +18 % ganze +2,2 %. Vorschlag: E3 umsetzen, Deckel raus, BURST_SCALE runter. Nichts tariert. §5.4. |
| 2026-09-07 | Owner-Ja zu E3, plus die Frage nach mehreren Gletschern je Pick. Beide Deckel gestrichen (weicher Bruch-Deckel, Eiszeit-Gletscherzahl), zwei neue Regler gebaut: Gletscher je Pick und Gesamtzahl. Befund: ohne Gesamt-Deckel ist die Zahl je Pick eine Katastrophe (2 je Pick → 966M, 3 → 10,7 Mrd gegen Feuer 6,4M), mit Deckel ein kleiner Hebel (+17 % von 1 auf 2). Ursache nachgerechnet: überlappende Geometrie-Formen multiplizieren sich, der Feld-Bruch wächst von 4 auf 16 Gletscher um das 23-fache. Tariert: BURST_SCALE 340 → 170, Gletscher-Deckel 12 → Eis mono 6,55M gegen Feuer 6,42M (1,02×). Balance-Guard neu zentriert (2,52M / 10,20M). Offen bleibt die Geometrie-Multiplikation. §5.5. |
| 2026-09-07 | Owner-Ja: überlappende Gletscher-Formen stapeln nicht mehr, die stärkste zählt (eine Zeile in `glacierFormations`). Das Wachstum von 4 auf 16 Gletschern fällt von 23,2× auf 8,1×, der Bruch je Gletscher flacht bei ~16k ab statt bis 110k zu klettern. Neu tariert: BURST_SCALE 170 → 250, Parität unverändert 1,02× (Eis 6,58M gegen Feuer 6,42M). Balance-Guard neu zentriert (2,78M / 6,24M) — der Schwanz ist fast auf dem Stand vor dem Eingriff, die Deckel waren also das Pflaster, nicht die Ursache. Nachgemessen: der Gletscher-Deckel ist für den normalen Build inert (Median mit und ohne identisch) und bleibt nur als Leitplanke; zwei Gletscher je Pick sind jetzt +38 % statt +17 % und brauchen eine eigene Tarierung. §5.6. |
| 2026-09-07 | Auf Ansage: Viabilität aller Skills, Ablation mono je Fraktion und einmal gemischt. KORREKTUR zu §5.4/§5.6 — die dort zitierten „+30 bis +100 % bei Feuer/Blitz/Pflanze" stammen aus alten Protokollen und stimmen heute nicht. Gemessen: Feuer +227 % (Glühende Klinge) / Blitz +68 % / Pflanze +26 % / Eis +19 % an der Spitze, und bei oder unter null stehen 8 von 15 bei Feuer, Blitz und Eis, 10 von 15 bei der Pflanze. Eis ist damit nicht flacher als die anderen, ihm fehlt nur der eine Ausreißer. Klar schädlich (≤ −7 %) sind zwölf Skills über alle vier Fraktionen, die größten bei Blitz (Serienschutz −29 %) und Feuer (Rückzündung/Schmiede −14 %). Der gemischte Lauf taugt für Einzelskills nicht (Haltequoten 4–30 %), sagt aber: Eis ist eine Bekenntnis-Fraktion. §5.7. |
| 2026-09-07 | Owner: die Große Lawine soll nicht erst am Ende feuern, und Ewiges Schild braucht einen Buff. Umgesetzt: die Lawine feuert jeden 5. Durchlauf statt einmal am Laufende, Verstärker 6 → 2 (sie feuert jetzt rund fünfmal je Lauf); „jede Runde" wurde verworfen, weil dann nichts mehr über die erste Schwelle wächst und der Kern der Fraktion stirbt. Der One-Shot-Zustand ist aus State, Engine, Reducer und UI raus, die Leiste zählt zum nächsten Schlag herunter. Ewiges Schild: der additive Masse-Zuschlag verfiel am Masse-Deckel und ist gestrichen; stattdessen erbt jeder Gletscher die stärkste Gletscher-Formation des Bretts. Beide Texte neu. UNGEMESSEN, Startwerte. §5.8. |
| 2026-09-07 | Auf Ansage gemessen — und ein Messfehler gefunden: `--mode legendaries` lädt die Werte-Tabelle aus der `--table`-Datei, wenn sie existiert, und `legtable-l9.json` stammt aus der Zeit vor dem Eis-Angebot (null Eis-Einträge). Die drei Eis-Legendären wurden dort in einem Build OHNE Gletscherfeld gemessen; der §5.4-Befund „Ewiges Schild und Große Lawine sind tot" ist damit nicht belegt und ist korrigiert. Mit frischer Tabelle: Eiszeit +281 % (doppelt so hoch wie das nächstbeste von zwölf, das eigentliche Ungleichgewicht), Ewiges Schild −7 %, Große Lawine −8 %. Sweep der Lawine: alt −1 %, Takt ×2 −8 %, ×6 +13 %, ×10 +29 % — der Takt aus §5.8 war richtig, die Senkung des Verstärkers auf ×2 war der Denkfehler (der erzwungene Bruch ersetzt einen ohnehin kommenden, der Verstärker ist die Entschädigung für die niedrigere Masse, keine Prämie je Auslösung). ×10 gesetzt. Nebenbefund auf Owner-Frage: legendäre Skills erscheinen 3,5× so oft wie legendäre Perks, weil der Skill je PLATZ würfelt und der Perk nur einmal je Angebot. §5.9. |
| 2026-09-07 | Owner: die Legendär-Chance im Perk-Angebot von 3 auf 7 % je Phase. `PERK_LEGENDARY_BASE` 0,03 → 0,07 — erwartet je Lauf 0,39 → 0,91, mindestens einer im Lauf 32,7 → 61,1 % (legendärer Skill zum Vergleich: 1,37 und 75,1 %). Der strukturelle Unterschied bleibt: der Skill würfelt je Platz, der Perk einmal je Angebot; ein Wurf je Platz gäbe 8,7 % je Phase und bleibt als Option offen. Balance-Guard 2,72M / 6,42M — im Band, nicht neu zentriert. §5.10. |
| 2026-09-08 | Eiszeit ignorierte den Brett-Deckel: `eiszeitTick` wurde im Motor ohne `maxGlaciers` aufgerufen, seit §5.5 `EISZEIT_MAX_GLACIERS` strich und den neuen `GLACIER_MAX` nur an die Skill-Wahl hängte. Die eigenen Picks standen bei 12, die Eiszeit fror bis zum vollen Brett weiter. Deckel durchgereicht, keine Zahl der Eiszeit geändert. Gemessen +281 % → +37 %, damit 8. von 12 Legendären. Skilltext und Glossar-Eintrag *Gletscher* nachgezogen. Der Sweep über die Flutrate entfällt. §5.11. |
| 2026-09-08 | Befund Ewiges Schild (nichts geändert): alle drei Wirkungen hängen an der Gletscherzahl, der Pool wirkt erst ab zwei, die Kaskade lohnt erst ab drei. Gemessen gepaart, dieselben 150 Seeds: gemischtes Angebot Ø 1,83 Gletscher → −1,2M (besser in 43 %); nur Eis Ø 5,18 → +15,9M (77 %), ab drei Gletschern +31M in 90–96 %. 12 von 150 gemischten Läufen erreichen die Schwelle. Kein Bug — eine Auszahlungskarte ohne eigene Rampe. Drei Vorschläge zur Owner-Entscheidung: a) je Eis-Pick zwei Gletscher, solange es gehalten wird (Empfehlung), b) Kaskaden-Boden von vier Nachbarn, c) so lassen und die Bedingung im Text nennen. §5.12. |
| 2026-09-08 | Owner: Variante a aus §5.12. Ewiges Schild friert je Eis-Pick vier Felder statt einem (`SCHILD_PER_PICK`, neuer Regler); der globale Ein-Pick-Entscheid, der Brett-Deckel und der Ablehn-Gletscher bleiben unberührt. Sweep 2 → +2 %, 3 → +17 %, 4 → +25 %, 5 → +42 %; 4 gesetzt, weil drei Eis-Picks das Brett damit auf genau `GLACIER_MAX` füllen und Eiszeit/Lawine vorn bleiben. Gemessen −12 % → +25 %, besser in 43 → 63 %; Ø Gletscher im Lauf 1,83 → 2,50. Damit sind alle zwölf Legendären positiv (+25 bis +145 %). Skilltext und Guard nachgezogen. §5.13. |
| 2026-09-08 | Owner: „nimm 3 und hebe für Schild das Limit auf." `SCHILD_PER_PICK` 4 → 3; solange das Schild liegt, entfällt `GLACIER_MAX` — an allen vier Stellen (Eis-Pick, Folge-Picks, Ablehn-Gletscher, Eiszeit im Motor), nicht nur am eigenen Pick. Für das Schild allein ein Nullsummenspiel: +25 % wie zuvor. Nebenbefund: Eiszeit stieg unangetastet von +35 auf +44 %, weil sie sich die aufgehobene Decke teilt — Läufe mit beiden Legendären messen +305M gegen +2,9M ohne, Faktor 106. Zweite Nebenwirkung: ein volles Brett hat keine Formations-Entscheidung mehr. §5.14. |
| 2026-09-08 | Owner: „lass mal a testen." Eiszeit friert nichts mehr ein, sondern flutet die Boden-Reserve, und jeder Gletscher zieht je Durchlauf bis zu `EISZEIT_DRAW` aus jedem angrenzenden offenen Feld in seine Masse. Die Trennung von Schild und Eiszeit gelingt strukturell — ohne eigene Gletscher kann die Eiszeit den aufgehobenen Deckel nicht mehr füllen, der Faktor-106-Verbund aus §5.14 ist unmöglich statt wegtariert. Die Auszahlung trägt aber nicht: Flut/Zug 3/2 → −10 %, 3/4 → −11 %, 8/8 → −5 %, 15/15 → −3 %, asymptotisch gegen null. Ursache: `mCap` deckelt die Bruchmasse auf 12 und je Durchlauf birst ein Gletscher höchstens einmal — Masse füttern ist linear und gedeckelt, Gletscher hinzufügen war überlinear. Vorschlag: die Eiszeit über die Berstkraft zahlen lassen (`1 + x × offene Nachbarn`, Spiegel der Dichte-Kaskade) statt über die Masse. Nicht umgesetzt. §5.15. |
| 2026-09-08 | Owner: „bau und messe." Die Eiszeit zahlt jetzt in Berstkraft statt in Masse — `1 + 2 × offene Nachbarn` im Bruch, der Spiegel der Dichte-Kaskade (`1 + 0,25 × gefrorene Nachbarn`), mit derselben `wOf`-Gewichtung, damit die Eisbrücke nicht doppelt zahlt. Sweep 0,25 → −4 %, 0,5 → −1 %, 1 → +13 %, 2 → +30 %; 2 gesetzt. Damit sind wieder alle zwölf Legendären positiv (+24 bis +137 %), die drei Eis-Karten liegen bei +25/+30/+33 %. Der Verbund aus §5.14 fällt von +305M auf +30M und ist selbstbegrenzend: auf vollem Brett ist der Eiszeit-Faktor exakt 1,00. Der Zug bleibt bei 2, Texte de/en/es und Guards nachgezogen. §5.16. |
| 2026-09-08 | Owner: „eigener kleiner Schritt" für die Firn-Familie. Vor dem Bauen gemessen, warum Dauerfrost schwach ist: 69 % aller Boden-Reserve auf ungefrorenen Feldern liegt über `FIRN_REFILL_TARGET` (12), höchster Stand 136 — totes Kapital, die fehlende Kopplung war nur das Symptom. Jetzt gibt jedes offene Feld bis zu `EISZEIT_DRAW` an den nächstgelegenen Gletscher ab statt nur an einen angrenzenden; damit erreicht auch Dauerfrosts ferne Reserve einen Abnehmer. Eiszeit +30 → +42 % (besser in 56 → 63 %), stärkste der drei Eis-Karten und im Band. Korrigiert §5.15: „Masse füttern trägt nicht" galt nur bei Berstfaktor 1 — mit dem Faktor aus §5.16 wandelt Masse sich in Berst-Häufigkeit, die beiden Änderungen wirken nur zusammen. Nicht gelöst: ohne Eiszeit bleibt die Dauerfrost-Kohorte bei 65,2 % totem Kapital. Verbund beider Legendären Faktor 106 → 11. §5.17. |
| 2026-09-08 | Owner: die drei Eis-Texte kompakter, ohne Gedankenstriche, ohne Fluff. Nur Wortlaut, keine Mechanik. Raus: die angehängten Erklärsätze („freier Boden ist deine Wucht…", „du kannst das ganze Brett einfrieren"), die Versalien und die Füllwörter. Die Große Lawine nennt jetzt ihren Faktor (×`GROSSE_LAWINE_MULT`) statt „verstärkt" — dieselbe Auskunft, präzise, wie in den übrigen Texten. Die Bindestriche in *Boden-Reserve*, *Eis-Skill* und *Gletscher-Formation* bleiben: das sind projektweite Begriffe aus Glossar und i18n, ein abweichender Wortlaut nur in diesen drei Karten bräche „ein Begriff je Sache". Nebenbei fielen die englischen und spanischen Schild-Texte auf, die noch auf dem Stand vor §5.13/§5.14 standen; beide nachgezogen. §5.18. |
| 2026-09-09 | Blitz-Befund (7.29, Owner-Ansage „Blitz anlassen"): Rampe, Crit-Quellen, Skillnutzlichkeit und Legendär-Abhängigkeit gemessen. Bis Runde 30 ist das Passiv die einzige Crit-Quelle; der Satz je Skill hat die falsche Form, ein Sockel ist gemessen (nicht gebaut); Serienschutz misst −47 %. Vier Sonden in `sim/probes/`. Vorschläge zum Entscheid, nichts umgesetzt. |
| 2026-09-09 | Blitz umgesetzt (7.30, Owner: „Sockel steigern und Skillnutzlichkeit erhöhen"): Passiv-Sockel 8 % bei 3 % je Skill (Runden 1–10 8,4 → 14,2 % Crit, erste Leiste R 8 → R 5); Serienschutz zahlt 1 Ladung mit Deckel je Durchlauf statt eines Leisten-Anteils bei jeder Niederlage (−45 → −0 %); Ladungsserie von Crit-Chance auf Ladung ab Serie 16/12/8/5 (−17 → +7 %). Spannweite der Skillnutzlichkeit ÷ Median 1,23 → 0,44. Duell gepaart: Blitz mono 6,92 → 10,93M, die anderen drei unverändert — Feuer steht jetzt allein unten. Balance-Guard-Obergrenze 8,5 → 10,5M mit Beleg. Offen: das Crit-Multiplikator-Bündel (Spannungsstau, Entladung, Vorentladung, Lichtbogen) läuft gegen den 8×-Deckel. |
| 2026-09-09 | Crit-Multiplikator-Bündel (7.31, Vorschlag, nichts umgesetzt): 81 % des gebauten Multiplikators fällt spät am 8×-Deckel weg (36,01× gebaut, 6,97× ausgezahlt), Vorentladung allein trägt +16,4× davon; Spannungsstau baut 0,00× — sein Auslöser (Sieg ohne Crit) ist seit dem Sockel fast verschwunden. Regel: Umverteilen INNERHALB des Multiplikators ändert nichts, solange die Summe über dem Deckel liegt. Owner-Regel gesetzt: keine Skills, die auf Niederlagen reagieren. Designstand für die drei Skills eingetragen, Abnahme offen. Neue Sonde `blitz-multsource.mjs`. |
| 2026-09-09 | Bestandsaufnahme über alle vier Fraktionen (§8, Owner: „bevor wir da weiter machen müssen wir den aktuellen ist stand in der sim aufnehmen"). Neues Werkzeug `sim/survey.js` + `sim/survey-worker.js` — Auftrags-Pool über vier Prozesse, 108 800 Läufe in 93 min statt ~7 h seriell. Gemessen, nichts am Spiel geändert. Kernbefunde: (a) **Eis ist ansteckend** — jede Kombination mit Eis fällt auf 0,43–0,63× derselben Kombination ohne Eis, weil der freie Spieler von 13,0 Eis-Skills mono auf 1,7–3,1 im Tripel herunterfällt; (b) die Fraktionen skalieren vom planlosen zum kompetenten Spieler um ×15 (Feuer) bis ×185 (Pflanze) — Feuer hat keine Decke; (c) die zwölf Legendären spannen +1079 % (Baumreihe) bis +13 % (Ewige Glut), Faktor 80; (d) 26 von 70 Skills wirken in ihrer eigenen Mono-Welt unter 3 %, drei sind in allen sieben Welten schwach (Lichtung, Frostbund, Anfrieren), neun weitere in sechs von sieben. Ausdrücklich NICHT messbar: die Stufenleiter (98–186 Läufe je Stufe, „Leiter"-Flag feuert bei 41 von 58 normalen Skills — Rauschen). |
| 2026-09-09 | Eis-System, erste Etappe (§5.28, Owner: „wie reparieren wir das System?" → „sonde und dann c"). Gebaut: `FIRN_GROUND` 0,35 (jedes offene Feld friert Reserve an — das Brett stellt 40−G Quellen und hängt damit fast nicht an der Pick-Zahl), der ZUG verteilt anteilig nach 1/Abstand statt „der Nächste nimmt alles" (im 3×3-Cluster bekamen sechs von zwölf Gletschern gar nichts), die Reserve unter einem Gletscher fließt in ihn selbst, `BURST_SCALE` 30 → 24. Gemessen und **Ziel verfehlt**: das Boden-Einkommen hebt zwölf Gletscher (×1,45) stärker als drei (×1,26), weil die Stufenleiter bei 18 endet — ein Drei-Gletscher-Build sitzt mit Ø 17,6 Masse schon an der obersten Sprosse, ein Zwölfer mit 11,3 unter der Berst-Schwelle. Der Deckel auf der Restmasse ist auch nicht der Hebel (Anteil 3÷12: 0,27 → 0,34 über KEEP 6/18/40). Endstand: Eis mono +2 %, Fe+Ei +10 %, Fe+Bl+Ei −5 % — Mono steht, die Ansteckung bleibt. Korrigiert meine Diagnose aus §8: die Dichte-Multiplikatoren bringen nur ×2,4, der Rest ist die schiere Zahl der Brüche. Offen: Leiter über 18 öffnen und/oder ein Trigger, der Ansammeln erlaubt (Owner-Idee); Träger-Kandidat ist die Abbruchkante. Neue Sonde `sim/probes/eis-kurve.mjs`, `sim/survey.js --only cross|welten`. |
| 2026-09-09 | Eis-System, zweite Etappe (§5.29, Owner: „1." — die Stufenleiter öffnen). `THRESHOLDS` 4/8/12/18 → 4/8/12/18/27/40/60, `TIER_MULT` bis 9,7 (Rhythmus der alten Leiter: Schwellen ×1,5, Wucht ×1,45), `FIRN_GROUND` 0,35 → 0,6, `BURST_SCALE` 24 → 20. Erst damit zahlt sich Masse für WENIGE Gletscher aus: Anteil eines Drei-Gletscher-Builds am Zwölfer (reiner Gletscher-Score) 0,27 → 0,38 (Leiter allein) → 0,59 (mit Boden 0,6). Eis-Ansteckung auf Build-Ebene 0,43/0,50/0,52/0,63× → **0,49/0,55/0,59/0,67×**; Eis mono 6,73 → 7,14M (+6 %) und damit nicht mehr die schwächste Fraktion. Nebenfund beim Bauen: die Abbruchkante überschrieb die Stufen mit einem fünfstelligen Array und hätte `undefined` in den Bruch gereicht — die neuen Sprossen erben jetzt denselben relativen Zuschlag, ein Wächter hält die Länge. Balance-Guard Median-Band neu zentriert (3,79M über Seeds 1–40, 3,98M über 1–200), Mean-Band unverändert. Offen: die Skill-Seite — ein Misch-Build hat 4,3 Eis-Slots, die so viel wert sein müssen wie 4,3 Feuer-Slots. |
| 2026-09-09 | Eis-Skills auf dem neuen Motor gemessen (§5.30, Owner: „schauen wir uns alle skills an die davon profitieren müssen"). Sieben Eis-Welten, 44 660 Läufe, 40 min. Kernbefunde: **kein Eis-Skill ist mehr in allen sieben Welten schwach** (in §8 waren es Frostbund und Anfrieren); in den Paaren hält der gierige Spieler deutlich mehr Eis (Ei+Pf 3,9 → 5,7, Bl+Ei+Pf 1,7 → 3,0). Die Dichte-Achse verhält sich wie vorhergesagt — Packeis +24 % mono → −8/−8 im Mix, Verzahnung +48 → +1/−2, Eisbrücke +17 → −14/−0, Gletschersturz +43 → +2/−5: vier Skills, die nur mono zahlen. Die Masse-Achse trägt NICHT von selbst: Abbruchkante +9/+15/−3, Sprödbruch +8/+14/−0, Verdichtung −10/+2/−2, Anfrieren −7/−10/+17. Diagnose: Anfrieren und Verdichtung geben eine flache Masse-Zahl und sind vom eigenen Boden-Einkommen (≈ 20 Masse je Durchlauf) entwertet; die Abbruchkante hebt die Stufen 2–4 um +7/+18/+19 % gegen eine Leiter, die bis 9,7 reicht. Dauerfrost ist der erste Eis-Skill, der im Mix BESSER ist als mono (+3 → +27 %) — das Vorbild für die Masse-Achse. Nichts umgesetzt. Nebenbei den Treiber repariert: mit `--only welten` lief das JSON-Schreiben auf die leere Cross-Map. |
| 2026-09-09 | Vier Eis-Skills auf die Masse-Achse (§5.31, Owner: „passt, bau aber vllt noch einen für duo oder Triplett um"). **Abbruchkante** hebt jetzt die Berst-Schwelle (18/24/30/38 statt 12) statt die Stufenwucht um +7/+18/+19 % — sie ist der Sammel-Skill geworden: seltener bersten, dafür auf der Sprosse, die das eigene Einkommen hergibt. **Anfrieren** gibt +10/15/20/28 % der Masse je Sieg statt flach +1…4 (Bezugsgröße einschließlich dieses Siegs, sonst gäbe der Skill auf einem frisch gefrorenen Feld exakt null). **Verdichtung** 0,25–1 → 0,6–2 je Punkt Kampfwert (97 % Haltequote bei −10 % Wirkung). **Packeis** zählt die OFFENEN Nachbarn statt der gefrorenen — der eine Seitenwechsel, den der Owner bestellt hat; es war der reinste Mono-Skill der Fraktion (+24 % mono, −8 %/−8 % im Mix). Nicht angefasst mit Grund: Gletscherzunge und Sprödbruch lesen die Masse direkt und wachsen mit dem neuen Motor von selbst mit — §5.30 hatte ihre Stufenleitern zum Nachziehen vorgeschlagen, der Code sagt, dass das nicht nötig ist. Die drei übrigen Dichte-Skills (Verzahnung, Eisbrücke, Gletschersturz) bleiben: sie sind der Grund, mono zu spielen. Wächter-Fund: die Abbruchkante war die einzige `tierMult`-Quelle und ist jetzt die einzige `burstAt`-Quelle — der Wächter hält fest, dass sie die Schwelle nur HEBT, nie senkt. Build-Ebene unverändert (Ansteckung 0,50/0,56/0,60/0,67×), was eine Messgrenze ist: die Fraktions-Policy im Cross-Lauf baut immer das 3×3-Cluster, dort ist Packeis' Wechsel ein reiner Nerf. Die Welten-Messung mit dem gierigen Spieler steht noch aus. |
| 2026-09-09 | Welten-Messung nach §5.31 und die Korrektur (§5.32). Drei der vier Umbauten wirken: **Verdichtung** mono −10 → +29 %, **Packeis** im Paar −8 → +37 % (der bestellte Spiegel), **Anfrieren** Haltequote 19 → 56 % bei weiterhin ~0 Wirkung. **Abbruchkante ist gefallen** (Haltequote 68 → 20 %) — und das war mein Konstruktionsfehler, kein Rauschen: die Schwellen 24 und 38 liegen ZWISCHEN den Sprossen der Leiter (24 zählt wie 18 zur vierten, 38 wie 30 zur fünften). Auszahlung je Durchlauf und Punkt Einkommen: 12 → 4,40 · 18 → 4,80 · **24 → 4,27** · 30 → 5,75 · **38 → 5,46** · 40 → 7,88 · 60 → 10,78. Stufe 2 zahlte damit weniger als gar kein Skill und Episch weniger als Stufe 3; der gierige Spieler hat das korrekt erkannt. Korrigiert auf **18/27/40/60** (die Sprossen selbst): +9/+34/+79/+145 %, monoton. Neuer Wächter hält beide Bedingungen: jede Schwelle liegt auf einer Sprosse UND die Auszahlung steigt mit der Stufe. Offen: Eis mono fiel in der Messung 409,8 → 224,2M, Hauptposten ist Packeis' Seitenwechsel (im Cluster hat ein Gletscher kaum offene Nachbarn) — die Höhe dieses Preises ist noch nicht tariert, und die Welten-Messung nach der Korrektur steht aus. |
| 2026-09-09 | Eis-Passiv-Text korrigiert (Owner-Befund: „wir haben keinen Tausch, wir haben kein slot limit mehr"). `skill.passive.ice` beschrieb noch zwei Regeln, die es seit dem exp-Skill-Rework nicht mehr gibt: das Einfrieren „auch wenn du bei vollen Skill-Slots tauschst" und „mehr Gletscher als Skill-Slots". Slots sind unbegrenzt (`SKILL_SLOT_LIMIT = 99`, nur eine Dev-Run-Regel begrenzt), damit gibt es im normalen Lauf keinen Tausch — der Glossar-Eintrag *Skill-Slot* sagte das schon, der Passiv-Text daneben das Gegenteil. Text in de/en/es neu; nur Wortlaut, keine Mechanik. Die dritte genannte Regel, der Ablehn-Gletscher ab `DECLINE_MIN_SKILLS = 4`, LEBT dagegen noch im Code (`reducer.js` DECLINE_SKILL) — nur ihre Begründung („Ausgleich für volle Slots") ist entfallen; die Kommentare dort sagen das jetzt, die Regel selbst ist eine offene Owner-Frage. |
| 2026-09-09 | Der Ablehn-Gletscher ist gestrichen (§5.33, Owner: „fliegt auch raus"). Ab vier gehaltenen Eis-Skills fror auch ein abgelehntes Skill-Angebot einen Gletscher ein — der Ausgleich dafür, dass bei vollen Skill-Slots kein weiterer Eis-Skill mehr passte. Slots sind seit dem exp-Skill-Rework unbegrenzt, damit ist der Ausgleich ohne Gegenstand. Raus: `DECLINE_MIN_SKILLS`, der Eis-Zweig in DECLINE_SKILL und das geparkte Perk-Angebot (`pendingPerkOffer`), das nur diesen einen Umweg bediente. Gletscher kommen jetzt ausschließlich aus Eis-Picks; Ablehnen zahlt für alle Fraktionen gleich (Münzen + Perk-Ersatz). Der Passiv-Satz dazu ist aus de/en/es raus, der Wächter dreht sich um (drei Fälle: 3, 4 und 6 Eis-Skills, alle ohne Gletscher). Wirkung auf die Eis-Stärke UNGEMESSEN — der gierige Spieler lehnt selten ab, aber ein Mono-Eis-Build verliert damit eine Gletscher-Quelle. |
| 2026-09-09 | Pflanze tariert (§6.29, Owner: „Baumreihe definitv, Wurzelgeflecht ein bisschen nerfen. danach diese skills alle ein bisschen buffen"). **Baumreihe** stand mono bei +1079 %, dem Doppelten des nächsten Legendären — und ihre Schraube aus §6.12 konnte das nicht fassen: sie zahlte auf vier Kanälen, der Regler fasst nur einen. Der Motor ist Kanal vier, die MITGLIEDERLISTE: die Reihe ist eine Wiederholung mit bis zu 40 blühenden Karten, und Hecke wie Blüte-Passiv zahlen je Mitglied — damit tat die Multiplikator-Achse die Arbeit der Dichte-Achse des Wurzelgeflechts. Owner-Entscheid a: die Reihe behält Faktor, Formationszahl und Wachstum, ihre Mitglieder zahlen keinen Basis-Score mehr (`scoreless` + `plantScoreFormations`). Gegenprobe am neuen Wächter: mit offener Naht zahlt ein Stich 720 statt 240. **Wurzelgeflecht** (+591 %) `WURZELGEFLECHT_FACTOR_SCALE` 1 → 0,85 — die halbe Strecke zurück, nicht die ganze, weil §6.15 die 0,7 schon einmal als zu hart verworfen hatte. **Sieben Skills angehoben**: Blätterdach 10→15 (+50 %), Rankgerüst 30→33 (nur +10 % — mehr lässt die Staffel der vier Score-Sätze nicht zu, ein Wächter hat meinen ersten Wurf zu Recht gerissen), Verwachsung +40 %, Lichtung/Zäher Halm/Setzlingsbeet +50 %, Jahresringe Teiler 15→12 und Sätze +25 %. Offen benannt: vier der sieben sind Wachstums-Skills, und die Achse ist als ganze flach — der systemische Hebel wäre `PLANT_BLOOM_WEIGHT_PER_GROWTH`, nicht sieben Einzelsätze; nicht angefasst, weil er die ganze Fraktion mithebt. ALLES UNGEMESSEN. |
| 2026-09-09 | §6.29 nachgemessen (§6.30, Owner: „mess nach"). 7 Pflanze-Welten, 56.875 Läufe, 39 min, Parameter der §8-Baseline. **Der Schnitt sitzt: Baumreihe +1079 → +112 % mono**, also rund 90 % ihrer Wirkung — der Beleg, dass die Mitgliederliste der Motor war und die Schraube aus §6.12 am falschen Ende saß. Sie ist damit das schwächste der drei Pflanze-Legendären, liegt aber im Band von Großer Lawine (+143 %) und Eiszeit (+131 %) und wird in 59 % der Läufe gehalten; `BAUMREIHE_FACTOR_SCALE` ist jetzt der saubere Regler, falls sie wieder wachsen soll. Wurzelgeflecht +591 → +505 % (die bestellte kleine Korrektur), Ewiger Frühling unverändert. **Die Fraktion fällt mono 2,31 Mrd → 524M (−77 %)**, in den drei sauber vergleichbaren Mischwelten −32 bis −62 %; damit ist die Pflanze nicht mehr der Ausreißer, sondern **Blitz** (1,69 Mrd, 3,2× Pflanze). Von den sieben angehobenen Skills sind zwei repariert (Blätterdach Haltequote 6 → 53 %, Rankgerüst mono −0 → +6 % und im Tripel −3 → +150 %), zwei besser, drei unverändert flach — und alle drei sind Wachstums-Skills, wie in §6.29 D vorhergesagt: die Achse hebt man nicht mit Einzelsätzen, sondern mit `PLANT_BLOOM_WEIGHT_PER_GROWTH`. Nebenbefund: **die Hecke ist mitgefallen** (100 % gehalten/+105 % → 33 %/+12 %) — ihre alte Zahl kam zum großen Teil aus dem Baumreihen-Kanal. Sie ist jetzt zum ersten Mal ohne Verstärker sichtbar und der Kandidat für die nächste Runde. |
| 2026-09-10 | Wurzelgeflecht gesweept (§6.31, Owner: „auf die 150-250"). Neuer Survey-Schalter `--groesse` misst eine Weltgröße allein — `--fraktion plant --groesse 1` sind 13 min statt 39, und der Kontrollpunkt bei 0,85 reproduziert §6.30 auf den Euro (+505 %, Median 523.764.008), die Abkürzung ist also belastbar. Sweep über `WURZELGEFLECHT_FACTOR_SCALE`: 0,85 → +505 % · 0,60 → +397 % · **0,45 → +220 %**. 0,45 gesetzt, gemessener Punkt im Band. Die Kurve greift unten härter (Schritt 0,25 kostet 21 %, Schritt 0,15 kostet 45 %) — der Faktor wirkt multiplikativ über die Positionen eines Laufs. Mitgenommen: die Fraktion fällt mono 524M → 367M, und die Baumreihe sinkt ohne eigene Änderung von +112 auf +75 % (Ablation misst gegen den Rest des Builds, und der ist kleiner geworden) — gehalten wird sie dabei häufiger, 59 → 71 %. Die drei Pflanze-Legendären stehen jetzt bei +274 / +220 / +75 % statt +1079 / +591 / +282 % vor der Runde. Offen: Blitz steht mit 1,69 Mrd allein oben, der Abstand ist durch diese Runde größer geworden. |
| 2026-09-10 | Glühende Klinge entkoppelt (§7.32, Owner: „erst den nerf designen", dann Entscheid a). Befund: die Klinge ist der einzige Feuer-Skill, der den Motor am EINGANG füttert — +Wert hebt den Vorsprung, und der Vorsprung IST das Hitze-Einkommen. Ein Sieg mit Vorsprung 3 (2 % Hitze) wird mit +4 Wert zu Vorsprung 7 (6 %): dreifaches Einkommen, dazu die Verbrennungs-Mitnahme und die gedrehten Niederlagen. Das ist die gemessene +141 %, nicht die Zahl auf der Karte. Weißglut (+96 %) ist kein eigener Motor, sondern der Hebel darunter: die Leiste 100 → 200 verdoppelt Klinge (+5 → +10 Wert), Hitze-Multiplikator und Sonnenzorns Spitzen-Lesart. Umgesetzt: **die Klinge liest `HEAT_MAX`, nie die verlängerte Leiste** — stärkster Build +10 → +5, normaler Build unverändert, die Rückkopplung bleibt halb so lang. Weißglut bewusst NICHT angefasst: dieselbe Verkopplung wie Wurzelgeflecht/Baumreihe in §6.31, wo die Baumreihe ungefragt von +112 auf +75 mitfiel; erst messen, dann entscheiden. Wächter gegengeprobt (offene Naht → 10 statt 5). UNGEMESSEN. |
| 2026-09-10 | §7.32 nachgemessen (§7.33). Feuer-Mono, 7 min. **Ein Hebel, beide Ziele getroffen: Glühende Klinge +141 → +24 %, Weißglut +96 → +20 % — und Weißglut wurde NICHT angefasst.** Die Verkopplungs-These aus §7.32 B ist damit bestätigt; hätten wir beide gleichzeitig genervt, wäre nicht trennbar gewesen, welcher Schnitt was bewirkt. Die Regler für Weißglut bleiben unangetastet, +20 % ist Mittelfeld. Die FORM der Fraktion stimmt jetzt: vorher standen zwei normale Skills über dem Legendären (141/96 gegen Sonnenzorn 91), jetzt führen die zwei Legendären (+116 % Sonnenkern, +96 % Sonnenzorn) und der stärkste normale steht bei +24 %. Sonnenkerns Sprung +14 → +116 % ist keine zweite Änderung, sondern die Ablation: sein Beitrag war vorher vom Klingen-Motor überdeckt. Preis: die Fraktion fällt mono 112,7M → 65,1M (−42 %) und steht damit klar letzter — der Rückstand auf Blitz wächst von 15× auf 26×. Der Schnitt hat das nicht geschaffen, nur vertieft. Nächster Schritt für Feuer ist ein Buff an den acht flachen Skills, kein zweiter Nerf. |
| 2026-09-10 | Sieben der acht flachen Feuer-Skills angehoben (§7.34, Owner: „dann buff die acht flachen feuer skills"). Zwei strukturelle Funde vor den Zahlen: (a) **die Ewige Glut hatte ein verschobenes Tor** — ihre Rampe wächst bei voller Leiste, und „voll" las die Leiste des BUILDS; mit Weißglut (98 % gehalten) stand sie bei 200 statt 100, die Rampe tickte fast nie, und das Legendäre maß −0 %. Derselbe Fehler wie bei der Klinge in §7.32. Tor liest jetzt `HEAT_MAX`. (b) **Das Glutbett darf nach der eigenen Owner-Regel nicht gebufft werden**: es ist ein reiner Niederlagen-Skill (Boden unter der Kühlung, Episch „kühlt gar nicht"), bei 74 % Siegquote und einer Leiste am Anschlag verteidigt es gegen etwas, das nicht passiert — und §7.31 hält fest „keine Skills, die auf Niederlagen reagieren", genau der Grund, aus dem die Rückzündung in §7.24 umgebaut wurde. Nicht angefasst; es gehört ersetzt, und das ist ein Owner-Entscheid. Die sieben: Glutstahl 8–20 → 14–36 · Feuerlinie 0,02–0,05 → 0,035–0,08 bei Kosten 3 → 2 · Zunder 2–5 → 4–10 (bei voller Leiste ein Score-Skill über den Schmelzpunkt) · Rückzündung ×1,5 → ×1,8 · Brandschneise Breite 3–6 → 4–10 und ×2,5 → ×3 · Schmiede 1/1/1/2 → 1/2/2/3 Karten · `FORGE_VALUE` 3 → 4. Drei Wächter auf die neue Wahrheit gezogen (der Schmiede-Textwächter prüft jetzt JEDE Stufe statt „Plural nur bei Episch" — strenger als vorher). Balance-Guard-Median neu zentriert mit Beleg: 5,26M über Seeds 1..40, 4,74M über 1..200 (kein Ausreißer), Band 3,40–7,10M; der Mean bleibt im bestehenden Band. UNGEMESSEN. |
| 2026-09-10 | §7.34 nachgemessen (§7.35). Feuer-Mono, 7 min. **Die Fraktion ist repariert: mono 65,1M → 137,3M (+111 %)**, über dem Stand vor dem Klingen-Schnitt; der Rückstand auf Blitz fällt von 26× auf 12×. Fünf von sieben sitzen — und der größte Einzelgewinn war KEIN Buff, sondern der Tor-Fix: **Ewige Glut −0 → +52 %** und damit das dritte Legendäre in einem gesunden Band (Sonnenkern +66 %, Sonnenzorn +54 %). Dazu Feuerlinie −5 → +28 %, Brandschneise +1 → +8 %, Schmiede −2 → +6 %, Rückzündung −2 → +2 %. **Zwei haben nicht gewirkt, und bei einem war meine Begründung falsch:** *Zunder* (0 → −2 % trotz Verdopplung) sollte laut §7.34 über den Schmelzpunkt-Überlauf zahlen — aber der Schmelzpunkt wird nicht mehr zuverlässig gebaut, seine Haltequote fällt in derselben Messung von 100 % auf 61 %; ohne ihn wird Überlauf-Hitze weggeworfen, und doppelt so viel Weggeworfenes ist nichts. *Glutstahl* (−4 → −7 % trotz +75 %) ist ein Mitfahrer der Klinge, deren Motor §7.32 halbiert hat und die nur noch 55 % gehalten wird — ein höherer Satz auf eine Bemessungsgrundlage nahe null bleibt nahe null (dieselbe Signatur wie Verwachsung in §6.30). Beide brauchen eine Mechanik, keine Zahl; das ist ein Owner-Entscheid. Nebenbefund: die Glühende Klinge fällt weiter (+24 → +9 %, Haltequote 82 → 55 %) — Ablation gegen einen gewachsenen Rest, also die Absicht. |
| 2026-09-10 | Glutstahl zurück auf 8/12/16/20 (§7.36, Owner). §7.34 hatte den Satz um 75 % gehoben, §7.35 hat gemessen, dass das nichts bringt: −4 → −7 %, also schlechter. Der Grund steht dort — er zahlt je Punkt Kampfwert über dem Grundwert, und diese Bemessungsgrundlage war zum guten Teil die Glühende Klinge, deren Motor §7.32 halbiert hat. Owner-Entscheid, mit Begründung: „es gibt noch genügend andere quellen werte zu erhöhen über perks wenn man darauf spielt" — Glutstahl bleibt damit ein Bau-Skill für einen Wert-Bau, kein Grundstock, und seine gemessene Schwäche im gierigen Mono-Lauf ist kein Defekt. Damit ist der Vorschlag aus §7.35 C (Glutstahl braucht eine eigene Wertquelle) zurückgezogen; offen bleibt allein Zunder. |
| 2026-09-10 | Die drei Blitz-Legendären gesenkt (§7.37, Owner, Zahlen vorher vorgelegt und abgenommen). §8 maß mono Resonanz +553 %, Hochspannung +520 %, Doppelentladung +383 % — die drei stärksten des Spiels, gegen Pflanze +274 % und Eis +284 % an ihren Spitzen; Zielband 250–300 %. Jeder hängt an genau einem Regler: `RESONANZ_SHARE` 2,25 → **1,5**, `HOCHSPANNUNG_STEPS` 3 → **2**, `DOPPELENTLADUNG_STACKS` 5 → **3**. `DOPPELENTLADUNG_STRIKE` bleibt bei 2 — ein Hebel je Skill und Runde. Resonanz stand weit über ihrem eigenen dokumentierten Nullpunkt („1 = die ganze Summe"): eine Karte in einer Vierer-Formation mit je 5 Partnerstapeln kämpfte mit 38 statt 27 Stapeln, also 2.850 statt 2.025 Basis-Score und +5,70× statt +4,05× Crit-Multiplikator. Hochspannung hat KEINEN anderen Zwischenwert — der Regler ist diskret, bei 1 maß er +8 %, bei 3 +520 %; landet 2 falsch, braucht der Skill eine andere Mechanik, keine andere Zahl. Zwei Vorhersagen für die Messung: (a) Resonanz und Doppelentladung sind gekoppelt und fallen beide, der Anteil ist nicht trennbar; (b) die Stapel-Schnitte landen vermutlich weicher als die Prozente aussehen, weil laut §7.31 81 % des gebauten Crit-Multiplikators am 8×-Deckel verfällt — trifft das zu, ist der eigentliche Hebel der Fraktion der Deckel, nicht ihre Spitze. UNGEMESSEN. |
| 2026-09-10 | §7.37 nachgemessen (§7.38). Blitz-Mono, 7 min. Alle drei gefallen, aber **weniger als proportional**: Resonanz +553 → +438 % (Regler −33 %), Hochspannung +520 → +428 % (−33 %), Doppelentladung +383 → +275 % (−40 %); Fraktion 1,686 → 1,028 Mrd (−39 %). Zielband war 250–300 % — **nur Doppelentladung ist angekommen**. Vorhersage (b) aus §7.37 C bestätigt: die Stapel-Schnitte landen weich, weil laut §7.31 81 % des Crit-Multiplikators am Deckel verfällt. Vorhersage zu Hochspannung **WIDERLEGT**: sie sollte härter treffen, ist aber am wenigsten gefallen. Der Grund ist strukturell — die Stufenleiter ist nur VIER lang, ein auf Selten oder höher gewürfelter Skill erreicht mit +2 genauso Episch wie mit +3; der Unterschied betrifft nur die auf Normal gewürfelten. Der Regler sättigt also: 1 → +8 %, 2 → +428 %, 3 → +520 %. **Es gibt keine Zahl, die diesen Skill ins Band bringt** — er braucht eine andere Mechanik. Zweiter Befund: drei Schnitte von 33–40 % haben die Fraktion nur um 39 % gesenkt, und sie steht weiter beim 2,8-fachen der Pflanze und beim 7,5-fachen von Feuer — die Legendären tragen die Höhe nicht allein. Dritter: die zwei schwächsten Blitz-Skills sind ausgerechnet die zwei Crit-Multiplikator-Karten (Vorentladung −11 %, Entladung −11 %), genau §7.31s Befund, live in den Daten. Dazu der Anzeigefehler: `totalCritMult` (Statusleiste, Ladungsleiste) addiert vier Quellen OHNE `CRIT_MULT_CAP` — der Motor deckelt korrekt, die Anzeige nicht, und ihr fehlt zugleich `lightIonCritMult`. Nicht angefasst, Entscheid offen. |
| 2026-09-10 | Zwei Owner-Entscheide nach §7.38 (§7.39). (a) **Hochspannung wird ein Misch-Legendäres**: +1 Stufe statt +2, dafür auf JEDE Fraktion statt nur auf Blitz. §7.38 hatte gezeigt, dass keine Zahl den Skill ins Band bringt, weil die vierstufige Leiter bei +2 sättigt; also eine andere Mechanik. Der Hebel wandert aus `lightning.js` als `boostedTier` nach `skills.js` (gemeinsame Quelle, ein Import auf lightning.js aus den anderen drei Modulen wäre ein Zyklus) und wird an vier Nähten gelesen: `effectiveTier`, `fireTier`, `plantTier` und — für Eis — `iceRoleTiers`, weil die Stufe dort einmal je Rolle geseedet wird. `HOCHSPANNUNG_STEPS` 2 → 1, Skilltext neu. Wächter prüft alle vier Fraktionen über ihre eigene Stufenfunktion (nicht über den Helfer) und ist gegengeprobt. (b) **Crit-Anzeige, Entscheid B**: der Motor deckelt korrekt, `totalCritMult` tat es nicht — Statusleiste und Ladungsleiste zeigten Werte, die kein Stich zahlt, und luden damit ausgerechnet dort zum Weiterkaufen ein, wo laut §7.31 ohnehin 81 % verfällt. `totalCritMult` klemmt jetzt wie der Motor, der gebaute Wert bleibt als `totalCritMultRaw` und steht als Unterzeile daneben („am Deckel · 11,3 gebaut"). Ehrlich benannt: die Zeile war und bleibt unvollständig, weil `lightIonCritMult` an der Siegkarte hängt und keine Build-Anzeige sie kennen kann — der echte Stich liegt oft höher am Deckel, als sie vermuten lässt. Beides UNGEMESSEN. |
| 2026-09-10 | Resonanz auf 0,7 und die Gedankenstriche raus (§7.40, Owner). `RESONANZ_SHARE` 1,5 → **0,7**: §7.38 hatte das Zielband 250–300 % mit +438 % verfehlt, zwei Messpunkte ergeben ein Potenzgesetz (Regler ×0,667 → Wirkung ×0,79, Exponent 0,58) und daraus 0,7 für rund +280 %. Der Anteil liegt damit UNTER dem Nullpunkt des Reglers: eine Karte bekommt 70 % der Partnersumme statt der vollen. Zweitens, Owner wörtlich „keine bescheuerten Bindestriche": alle fünf Gedankenstriche aus den Kartentexten raus — Hochspannung und Abbruchkante (beide von mir in dieser Runde), Eiswall und der Glutbett-Badge (Bestand) sowie der Eis-Passivtext in de/en/es. §5.18 hatte die Regel für die drei Eis-Texte schon aufgestellt; sie ist jetzt ein Wächter über ALLE Skill- und Passiv-Texte (`i18n-guards`), gegengeprobt. Bewusst NICHT im Wächter und offen: 19 Gedankenstriche in Glossar-Einträgen und Tooltips, davon drei aus der Eis-Runde — das ist ein eigener Textdurchgang und ein Owner-Entscheid. Hochspannung bleibt wie in §7.39 gebaut (Owner: „der passt"). |
| 2026-09-10 | §7.39/§7.40 nachgemessen (§7.41). Blitz-Mono, 6 min, zwei Änderungen zugleich (nicht trennbar, war so angesagt). **Blitz ist eingefangen: mono 1,028 Mrd → 416M**, damit Bl 416M · Pf 367M · Ei 348M/224M · Fe 137M — Blitz und Pflanze gleichauf, der 12-fache Abstand aus §7.38 ist weg. Doppelentladung +275 → +235 %, Resonanz +438 → **+170 %**, Hochspannung +428 → **+92 %**. **Mein Potenzgesetz aus §7.40 war falsch**: aus zwei Punkten gefittet (Exponent 0,58) sagte es für 0,7 rund +280 % voraus, gemessen sind +170 %; der Exponent liegt zwischen 1,5 und 0,7 tatsächlich bei 1,24, die Elastizität steilt sich nach unten auf. Zwei Punkte reichten für diese Kurve nicht. Teil der Abweichung ist nicht Resonanz: Hochspannung fiel gleichzeitig von +2 auf +1 Stufe und wird in 65 % der Läufe gehalten, dort erzeugt jeder Blitz-Skill weniger Stapel — und Resonanz teilt genau die. **Hochspannung lässt sich mono gar nicht beurteilen**: in einer Mono-Welt ist „+1 für alle Fraktionen" identisch mit „+1 für Blitz", die Messung sieht also nur 2 → 1, nicht den Umbau; dafür braucht es die Misch-Welten. Preis der Runde: der Mittelbau ist eingebrochen — acht Skills bei oder unter null, und Gewitterfront fiel +69 → −6, Kettenblitz +33 → +5, Blitzableiter +24 → +2, ohne angefasst worden zu sein. Ursache ist Hochspannung: eine Stufe weniger trifft jeden der dreizehn gehaltenen Skills, nicht nur den Legendären. Das war nicht beabsichtigt. |
| 2026-09-10 | Crit-Deckel weich, Entladung auf die Score-Achse (§7.42, Owner, Zahlen vorher abgenommen). Befund: der Multiplikator hat 5,75× Kopfraum, und **Stapel allein füllen ihn bei 38 — mit Kurzschluss schon bei 19**, was ein Doppelentladung/Resonanz-Bau mühelos erreicht; ab da ist jeder weitere Punkt aus jeder Quelle null wert. Das geht tiefer als §7.31: ein Stapel zahlt Basis-Score UND Crit-Multiplikator, über dem Deckel nur noch das erste — der harte Schnitt halbiert also die Auszahlung der Kernressource, nicht nur vier Skills (was auch Ladungsserie erklärt, −11 % bei 100 % Haltequote). Umgesetzt: `CRIT_MULT_SOFT_SLOPE = 0,2`, Form wie das vorhandene `WIN_SOFTCAP`, EINE Quelle (`softCritMult`) für Motor und Anzeige; gebaut 10/16/36× zahlt 8,4/9,6/13,6×, und SLOPE 0 stellt den alten harten Deckel ohne Codeänderung wieder her. Entladung verlässt die Multiplikator-Achse (dort sagten vier Skills dasselbe; behalten hat sie Vorentladung, die einzige, die eine Entscheidung verlangt) und zahlt jetzt **+2/3/4/6 Basis-Score je Sieg, dauerhaft je voller Leiste**, Episch verdoppelt die Rampe bei einem Crit statt den Multiplikator; eigener Zustand `entladungScore`, `entladungMult` speist nur noch Gewitterfronts Episch-Anhang. Der steht damit allein auf der Achse und ist offen (nicht Teil der drei abgenommenen Punkte). Drei Wächter, alle gegengeprobt. Startwerte, UNGEMESSEN — wie viele volle Leisten ein Lauf hat, ist nicht erhoben. |
| 2026-09-10 | Spannungsfeld ersetzt den Spannungsstau (§7.43, Owner: „können wir vllt irgendetwas bauen was Stapel mehr streut oder etwas das pro Stapel einen Bonus gibt, eventuell auf Formation"). Vier Entwürfe fielen vorher, jeder aus einem eigenen Grund (§7.43 A): der Stau umgehängt (sein Auslöser „Sieg ohne Crit" wird seltener, je besser der Build läuft — §7.31 maß 0,00× gebaut), der Kondensator („nur ionisiere mehr Karten mit extra Steps", dazu: ein Prozent-Aufschlag ist auf einer Kästchen-Leiste unlesbar, ein flacher Aufschlag kostet je nach Build zwischen einem Sechstel und einem Drittel der Rate), und zwei Episch-Anhänge (Überlauf sparen — es gibt nichts zu sparen, die Leiste fällt bei jeder Füllung auf den Boden; „alle Karten ionisiert" — eine Zeitschaltuhr, weil die Leiste im Kreis ionisiert und Stapel nie verschwinden). Der Fund, der es gelöst hat: **Blitz hatte keinen eigenen Multiplikator** — Feuer hat `fireMult`, Pflanze `plantMult`, Blitz zahlte nur in Basis-Score, Wert und Crit. Gebaut: Formations-Sieg zählt **+0,3/0,4/0,5/0,7 % je Stapel der Formation**, Episch dazu +1 Stapel auf die Karte mit den wenigsten Stapeln je Sieg. Jede Karte zählt einmal (Vereinigung wie bei Resonanz), gelesen wird die echte Siegkarte statt der Resonanz-Sicht, der Episch-Stapel läuft nicht durch Doppelentladung. Der Skill zahlt für GESTREUTE Stapel und steht damit gegen Kurzschluss und Kettenblitz. Drei Wächter, alle gegengeprobt. Startwerte, UNGEMESSEN; größtes Risiko ist das Episch (Dreier-Formation mit je 20 Stapeln = +84 %, Kurzschluss als ganzer Skill misst +56 %). |
| 2026-09-10 | Der Chance-Überschuss wird sichtbar und zahlt dreifach (§7.44, Owner, Zahlen vorher abgenommen). Die Regel gab es schon (`overcritMult`, +0,01× je Punkt über 100 %, §7.28), sie war nur wirkungslos: unsichtbar (kein Text, keine Zeile) und vom weichen Deckel aus §7.42 auf ein Fünftel gedämpft — ausgerechnet für die Builds, die Chance über 100 % stapeln. `OVERCRIT_MULT_PER_PP` **0,01 → 0,03**, so gewählt, dass **5 Punkte Crit-Chance genau einen Stapel wert sind** (ION_CRIT_MULT_PER_STACK 0,15); linear, keine Treppe. Die Statusleiste zeigt die Chance jetzt höchstens 100 % (Owner: „darf nicht mehr über 100 % anzeigen") und den Überschuss als Unterzeile; `displayCritChance`/`critChanceOverPP` liegen als geteilte Helfer neben `totalCritMult`, derselbe Griff wie §7.39. **Beim Rechnen aufgefallen und notiert (§7.44 C): unterhalb eines Crit-Multiplikators von 4× ist ein Punkt ÜBER 100 % mehr wert als einer darunter** — eine echte Umkehrung des Anreizes, praktisch aber selten, weil wer über 100 % baut fast immer Stapel und damit einen hohen Multiplikator hat. Der alte Wächter (100 Punkte ≤ ein Achtel des Deckels) fällt bei 0,03 und wurde NICHT gelockert, sondern durch zwei Aussagen ersetzt, die noch stimmen (am Knick bleibt ein Punkt darüber schlechter als einer darunter; die Regel allein bleibt unter dem Knick). Zwei neue Anzeige-Wächter, beide gegengeprobt. Die Regel hat weiterhin keinen Deckel — bei 400 % Chance wären es +9×, das ist die Zahl für die Messung. |
| 2026-09-10 | Die Anzeige zeigt die wirksame Stufe (§7.45, Owner: „überall bei dem Skill auch die neue Rarität angezeigt wird, Skillauswahl, Panels usw."). `tierOf` gab die GEWÜRFELTE Stufe, die Engine rechnet seit §7.39 über `boostedTier` — und das Badge war dabei das kleinere Problem: `skillDef(id, tier)` wählt auch den TEXT, ein von Hochspannung gehobener Skill zeigte „SELTEN" und beschrieb die Selten-Zahlen, während der Stich die Episch-Zahlen abrechnete. **Die Beschreibung log.** Neu `effectiveTierOf`/`tierIsLifted` in skills.js als EINE Quelle für alle Oberflächen (derselbe Griff wie `totalCritMult` §7.39 und `displayCritChance` §7.44); umgestellt sind gehaltene Skills, Skillauswahl (Bestand, Ersetzen-Liste UND Angebot — Owner: „dort auch schon anzeigen", über `boostedTier(state.skills, rolledTier)`, weil die Angebotsstufe in `skillOfferTiers` steht), Bauplan-Panel, Chronik-Detail und Lauf-Statistik. **Der Aufwert-Screen bleibt bewusst auf der gewürfelten Stufe** — dort ist sie der Preis, mit der wirksamen stünde ein gehobener Skill fälschlich auf „höchste Stufe" und `upgradeBuy` rechnete falsch. Die Marke ist ein gedämpftes „gehoben" neben dem Badge, Form wie das vorhandene „gehalten", kein neues Symbol. Drei Wächter, alle gegengeprobt, darunter einer, der prüft, dass keine der fünf Oberflächen wieder `tierOf` liest. |
| 2026-09-10 | §7.42/§7.43/§7.44 nachgemessen (§7.46). Blitz-Mono, vier Varianten à 12.050 Läufe. Zuerst der Aufsetz-Fund: die Basis liegt VOR §7.42, es steckten also DREI Zahlenänderungen in der Messung, nicht zwei — diesmal getrennt statt wie in §7.41 vermischt. **Blitz mono 416M → 3.116M (7,5×)**, und der Schwanz ist das eigentliche Problem: p95/Median 8× → 120×, max/Median 172× → 1.138×. Das 2×2 über die zwei ENV-Regler zeigt: **mit beiden Deckeln zurück steht Blitz bei 523M gegen 416M Basis, Spannungsfeld allein kostet also +26 %** (misst dort +45 %, ein normaler Skill). §7.44 ist in keiner Zelle der Treiber (die zwei Zellen sagen ×3,2 und ×0,7 — der gierige Spieler lernt je Variante neu, unter Faktor 2 ist diese Reihe nicht interpretierbar; das ist die Rauschgrenze und sie ist jetzt beziffert). **Treiber ist der weiche Crit-Deckel, Zeuge ist Kettenblitz: +5 % → +601 % → +11 % mit den Deckeln zurück.** Ursache strukturell: ein Stapel zahlt jetzt auf DREI Achsen ohne Obergrenze (Basis-Score +75, Crit-Mult +0,15 seit §7.42 nur noch weich gedeckelt, `lightMult` +0,3–0,7 % neu aus §7.43), und die drei stehen als Produkt in der Formel — aus linear ist kubisch geworden. Mit den echten Funktionen nachgerechnet zahlt eine Karte mit 400 Stapeln 243.200 → 2.177.552, Faktor 8,95× und ohne Ende. **Dazu ein Konstruktionsfehler von mir in §7.43 C**: Spannungsfeld zahlt NICHT für gestreute Stapel — `formationStacks` bildet die Summe, und eine Summe unterscheidet nicht drei Karten mit je 20 von einer mit 60. Der Skill steht nicht gegen Kettenblitz, er multipliziert mit ihm; die Entscheidung, die Blitz fehlen sollte, ist nicht gebaut. Der Überschuss über 100 % gemessen (Sonde, 120 Läufe): 31 % der Stiche in den Runden 41–50, im Mittel 52 Punkte darüber = +1,56× — die §7.44-Sorge (400 % = +9×) tritt im gierigen Lauf nicht ein. Neue Sonde `spannungsfeld.mjs`. Nichts umgesetzt, vier offene Owner-Entscheide in §7.46 G. |
| 2026-09-10 | Spannungsfeld zählt Karten statt Stapel (§7.47, Owner-Entscheid auf §7.46 G: nur Vorschlag 2, der weiche Crit-Deckel bleibt vorerst). `lightFormMult` liest nicht mehr die Stapel**summe** der Formation, sondern die Zahl der ionisierten **Karten**: **0,3/0,4/0,5/0,7 % je Stapel → 2/3/4/6 % je ionisierter Karte**, Episch-Anhang unverändert. Der Grund in einer Zeile: eine Summe wächst ins Unendliche (gemessen Median 24, p99 1.423), eine Kartenzahl ist durch das Brett begrenzt (Median 4, höchstens 40). Damit hängt `lightMult` nicht mehr an der Tiefe EINER Karte und multipliziert sich nicht mehr mit den zwei anderen Stapel-Achsen — aus dem kubischen Ausschlag aus §7.46 C wird ein quadratischer. Die Sätze sind so gewählt, dass der Normalfall bleibt und nur der Ausreißer fällt: Median +17 → +24 %, p90 +76 → +30 %, Extremfall **+996 → +240 %**. Der Episch-Anhang (+1 Stapel auf die dünnste Karte der Formation) passt jetzt erst richtig — er macht aus einer dunklen Karte eine leuchtende, also genau das, wofür der Skill zahlt. **Zwei Dinge offen benannt:** (a) spät SÄTTIGT der Skill, weil in den Runden 41–50 ohnehin 4,40 von 4,60 Mitgliedern ionisiert sind — dort misst er die Formationsgröße, nicht die Streuung; die Bedingung greift früh und mittig (Runden 21–30: 2,00 von 4,17). (b) Der Umbau nimmt EINE der zwei offenen Achsen heraus, nicht beide: bei 400 Stapeln zahlt der Stich weiterhin 2,92× so viel wie vor §7.42, **Blitz landet damit nicht wieder bei 416M**. Der Rest ist der weiche Crit-Deckel (§7.46 G 1, weiter offen); gerechnet, nicht gemessen, brächte eine Rest-Steigung 0,20 → 0,05 den Faktor auf 1,66×. Drei Wächter, alle gegengeprobt durch Zurückdrehen auf die Stapelsumme; einer davon hält fest, dass `perStack` nicht zurückkommen darf — ein stiller Rückfall dorthin würde keinen Text im Spiel ändern. UNGEMESSEN. |
| 2026-09-10 | §7.47 nachgemessen (§7.48). Blitz-Mono, 12.050 Läufe, genau EINE Änderung seit §7.46, die Zahl ist also sauber zuzuordnen. **Das Ziel ist getroffen: p95 374,9 → 35,3 Mrd (ein Zehntel), p90 84,4 → 20,9 Mrd, Median 3.116 → 1.639M, Siegquote 66,9 → 70,0 % (die höchste aller vier Messungen).** Der Körper der Verteilung ist eingefangen. **Der max hat sich NICHT bewegt** (3.545 → 3.425 Mrd, −3 %) — genau die Vorhersage aus §7.47 D: der eine Extremlauf lebt vollständig auf der zweiten, unangetasteten Achse (Basis-Score × Crit-Mult, beide linear in der Tiefe, beide ohne Deckel). Blitz steht bei 3,9× der Basis statt 7,5×, also wie angekündigt nicht zurück auf 416M. **Der Preis, und der Fehler ist meiner: Spannungsfeld misst +139 → +3 %**, Haltequote 100 → 66 %, und je Stufe liegt der Lift bei 0,52 / 0,60 / 1,22 / 1,43 — **unter „Sehr selten" ist der Skill keinen Platz wert**. Ich hatte den Satz am MEDIAN der alten Auszahlung geeicht (+17 → +24 %) und daraus berichtet, der Normalfall bleibe gleich. Der Median war aber nie, wo der Wert lag: die alten +139 % kamen fast vollständig aus dem Schwanz, den der Umbau absichtlich abschneidet (p99 der Stapelsumme 1.423 = +996 % auf den Stich). Ein Skill, dessen Wert im 99. Perzentil steckt, verliert ihn, wenn man das 99. Perzentil kappt — das war vorher sichtbar. Die Bauform ist davon nicht widerlegt (die Kartenzahl ist begrenzt und tut, was sie soll), nur die Leiter ist zu flach. **Kettenblitz ist nur gedämpft, nicht repariert** (+601 → +238 %, Basis +5 %) — derselbe Befund wie beim max, an einem zweiten Zeugen. Drei Skills sind ungefragt mitgefallen (Lichtbogen +3 → −10, Serienschutz 0 → −15, Blitzfänger +13 → −4), alle drei hängen an der Stapeltiefe der gespielten Karte. Offen: die Leiter des Feldes (Verdopplung auf 4/6/8/12 % wäre der Kandidat, gehört gesweept statt geschätzt) und der weiche Crit-Deckel als Haupthebel, jetzt zweifach belegt. |
| 2026-09-10 | Deckel flacher, Leiter bekommt einen Sweep-Griff (§7.49, Owner: „so bauen", beides aus §7.48 D, aber die zwei Zahlen nicht gleichzeitig raten). **`CRIT_MULT_SOFT_SLOPE` 0,20 → 0,05**: über dem Knick zählt jeder Punkt nur noch zu 5 %, die Form aus §7.42 bleibt, kein harter Schnitt kommt zurück. Bei 400 Stapeln fällt der Stich von 2,92× auf **1,66×** gegenüber der Zeit vor §7.42. Die Zahl ist zweifach belegt: §7.48 A (der max hat sich durch §7.47 nicht bewegt, der Extremlauf lebt ganz auf dieser Achse) und §7.48 C (Kettenblitz +5 % Basis → +601 % → immer noch +238 %). **Zweitens `SPANNUNGSFELD_SCALE`** (Default 1), Form wie `WURZELGEFLECHT_FACTOR_SCALE`: der Sweep-Griff für die Leiter des Spannungsfelds, damit ihre Höhe GEMESSEN statt geschätzt wird — §7.47 hatte den Satz schon einmal falsch geeicht, ein zweiter Schätzwert wäre derselbe Fehler mit anderer Zahl. Ein Skalierer und keine vier Einzelsätze, weil §7.48 B ein Höhen- und kein Formproblem gemessen hat (Stufen 3/4 tragen mit Lift 1,22/1,43, Stufen 1/2 nicht mit 0,52/0,60). **Der Regler sitzt in der TABELLE, nicht im Motor** — sonst zeigte die Karte weiter 6 %, während der Stich 12 % abrechnet, also der Fehler aus §7.45, der keine Zahl im Spiel ändert und deshalb niemandem auffällt. Drei Wächter; der neue fragt ein zweites Node mit gesetztem ENV (die Konstante wird beim Laden gelesen) und prüft, dass Kennwert und Kartentext zusammen wandern — gegengeprobt durch Verschieben des Reglers in `lightFormMult`, dann fällt er. **Bewusst offen und Owner-Entscheid:** die Kontrollmessung des neuen Deckels an Feuer und Eis bleibt draußen; der Deckel ist eine Systemregel für alle vier Fraktionen, gemessen wird er nur an Blitz mono. UNGEMESSEN. |
| 2026-09-10 | §7.49 nachgemessen (§7.50). Vier Läufe à 12.050: ein Punkt für den Deckel allein, drei für die Leiter (`SIM_SPANNUNGSFELD_SCALE` 1/2/3). **Der Deckel sitzt, und der Beleg ist NICHT der Median** (1.639 → 1.014M, −38 %, das liegt unter der in §7.46 B bezifferten Rauschgrenze von rund Faktor 2), sondern das andere Ende der Verteilung: **p90 −68 %, p95 −71 %, max −98 %** (3.425 → 73,7 Mrd). **Der max ist damit auf Basisniveau zurück** — 71,5 Mrd vor §7.42 gegen 73,7 Mrd jetzt, Faktor 1,03. Drei Kennzahlen, eine Richtung, alle weit außerhalb des Rauschens; die Diagnose aus §7.46 C und §7.48 A ist bestätigt, der Extremlauf lebte ganz auf der Crit-Deckel-Achse. Siegquote 71,3 %, der höchste Wert der Reihe. **Der Leiter-Sweep ist am Median dagegen nicht lesbar**: 1.014 → 769 → 1.057M, nicht monoton, Spannweite 1,37× — Rauschen. Lesbar ist nur der Skill-Effekt, und der ist monoton: **+3 → +7 → +26 %**. **Was der Sweep NICHT gelöst hat:** auch bei ×3 tragen die unteren drei Stufen nicht (Lift 0,65 / 0,74 / 0,51), der Wert sitzt vollständig in Episch (2,11) — Verdreifachen hat den Skill angehoben, aber die Leiter nicht begradigt. Die Stufen-Lifts sind dabei selbst verrauscht (bei ×2 Stufe 2 auf 0,29 unter Stufe 3 auf 1,28; eine monotone Leiter kann das nicht erzeugen, n ≈ 60–270 je Stufe trägt die Auflösung nicht) und sollen deshalb keinen Entscheid tragen. Vermutung, ausdrücklich UNGEMESSEN: die Arbeit macht der Episch-Anhang (+1 Stapel auf die dünnste Karte), nicht der Prozentsatz — er ist das einzige, was die unteren Stufen nicht haben; trennbar mit einem Lauf, in dem `feedLowest` auf allen Stufen liegt. **Wo Blitz steht: rund 1,0 Mrd gegen 416M Basis (2,4×) und rund das Dreifache der Pflanze.** Die FORM der Verteilung stimmt wieder, die HÖHE nicht — das ist ein eigener Posten und mit diesen zwei Reglern nicht zu holen. Die Leiter bleibt unentschieden (Owner); ×3 ist der beste gemessene Punkt. |
| 2026-09-10 | Blitz bekommt keinen eigenen Multiplikator, das Feld zieht auf die Crit-Chance (§7.51, Owner: „lass den blitz mult raus. Blitz nutzt schon crit als mult. lass mir damit arbeiten"). **Die Prämisse aus §7.43 war falsch.** Dort stand als struktureller Fund „Blitz hatte keinen eigenen Multiplikator — er zahlte nur in Basis-Score, Wert und Crit"; das letzte Wort widerlegt den Satz. Der Crit-Multiplikator IST die Multiplikator-Achse der Fraktion, und sie hängt an derselben Kernressource wie alles andere (jeder Stapel der Siegkarte zahlt über `ION_CRIT_MULT_PER_STACK` dorthin). Ich habe daneben eine zweite gestellt — zwei Multiplikator-Achsen an derselben Ressource sind genau das kubische Wachstum aus §7.46 C. Die drei Runden §7.43 → §7.47 → §7.49 haben an den Symptomen dieser einen Annahme gearbeitet. **Raus:** `lightMult` aus Score-Produkt, `glacierWinMult` und Breakdown, `lightFormMult` aus dem Blitz-Modul, `SPANNUNGSFELD_SCALE` aus den Konstanten (der Sweep-Griff aus §7.49 hat keinen Gegenstand mehr), Sonde `spannungsfeld.mjs` gelöscht. **Der Skill bleibt** (Owner-Untergrenze 14 normale Skills je Fraktion, §7.16) und zieht auf die Achse, die Blitz ohnehin hat: **+2/3/4/6 % Crit-CHANCE je ionisierter Karte der Formation**, Episch-Anhang unverändert. Damit steht er gegen Lichtbogen, der eine Zeile höher in derselben Funktion sitzt und die Tiefe EINER Karte belohnt — Streuung gegen Tiefe, auf einer vorhandenen Achse; das ist die Entscheidung, die §7.43 bauen wollte und mit einer zweiten Achse verfehlt hat. Die 100-%-Klemme deckelt ihn von selbst, darüber zahlt er über die Überschuss-Regel (§7.44) gedämpft weiter; gemessen (§7.46 F) sind es mittig 2,0 und spät 4,4 ionisierte Karten, der Beitrag wächst also dort, wo Chance knapp ist, und sättigt dort, wo sie es nicht mehr ist. `litCards` ist 0, wo die Formation nicht bekannt ist (Statusleiste) — dieselbe Bauform wie `card = null` bei Lichtbogen. **Wächter:** kein Blitz-Faktor im Breakdown (über die vollständige Liste der `*Mult`-Schlüssel, nicht nur den alten Namen) UND die Stapel heben weiterhin den Crit-Multiplikator; gegengeprobt in der Form, die wirklich droht — ein `lightMult = 1` zurück in den Breakdown, ein Faktor, der KEINE Zahl im Spiel ändert und sonst niemandem auffiele. Dazu: weder `perStack` (§7.43) noch `perCard` (§7.47) dürfen in der Stufentabelle zurückkommen. **Der Stand aus §7.50 (Median 1,0 Mrd, 2,4× der Basis) ist damit nicht mehr gültig.** Was aus der Reihe bleibt: der weiche Crit-Deckel bei 0,05 (§7.49 A, von §7.50 als der wirksame Hebel belegt) und §7.44, das jetzt sogar wichtiger ist. Startwerte, UNGEMESSEN. |
| 2026-09-10 | §7.51 nachgemessen (§7.52). Blitz-Mono, 12.050 Läufe. **Die Fraktion ist auf dem Basisniveau angekommen, und zwar auf JEDER Kennzahl: Median 384M gegen 416M (0,92×), p95 3,07 gegen 3,44 Mrd (0,89×), max 58,1 gegen 71,5 Mrd (0,81×).** Nicht nur der Median — der ganze Schwanz ist zurück, und das ohne einen einzigen neuen Deckel. Gegen das Feld aus §7.41 (Pf 367M · Ei 348M/224M · Fe 137M, je zum Stand ihrer letzten Messung) steht Blitz gleichauf mit der Pflanze. **Die Form stimmt auch:** die drei Legendären führen (+211 / +137 / +69 %), der stärkste normale Skill ist Kurzschluss mit +45 % — dieselbe Form, die §7.33 für Feuer als richtig festgehalten hat. **Kettenblitz ist repariert**, der Zeuge des ganzen Problems: +5 % (Basis) → +601 % (§7.46) → +238 % (§7.47) → +40 % (§7.50) → **+1 %**, Haltequote 92 → 48 %. Reine Tiefe auf einer Karte ist kein Motor mehr. **Lichtbogen ist zurück** (+18 → −10 → 0 → **+25 %**, 98 % gehalten) und damit zweitstärkster normaler Skill — die Crit-Chance-Achse trägt wieder, und genau dort sitzt das Spannungsfeld jetzt als Gegenspieler. **Offen:** das Spannungsfeld selbst misst 0 % bei 58 % Haltequote, die Stufen-Lifts (1,97 / 0,48 / 0,18 / 1,68) sind nicht monoton und damit Rauschen — der Skill ist neutral, nicht kaputt, die Höhe seiner Leiter ist der nächste Regler und ein Owner-Entscheid. Drei Skills im Minus (Entladung −23 %, Vorentladung −23 %, Serienschutz −13 %, alle ~100 % gehalten); Vorentladungs Fall von +4 auf −23 % ist ein KANDIDAT, kein Befund — sie zahlt Crit-Multiplikator je Serienpunkt und die flachere Rest-Steigung entwertet genau das, aber §7.50 hat sie auf derselben Steigung noch mit +4 % gemessen, also liegt das im Rauschen der Reihe (§7.46 B) und gehört gezielt nachgemessen. |
| 2026-09-10 | Die Rauschgrenze gemessen statt geschätzt (§7.53, Owner: „nachmessen, dann toten skills angehen"). Zweimal dieselbe Konfiguration, nur ein anderer Seed-Satz (`--seed 1` gegen `--seed 101`). **Ergebnis: Faktor 1,97 auf dem Fraktions-Median (384M gegen 757M) und Faktor 3,0 auf dem p95 — bei identischem Code.** Je Skill ist der Median der Spannen **17 Prozentpunkte**, im Einzelfall weit mehr (Hochspannung 211 pp, Kettenblitz 35 pp, Resonanz 33 pp); auch die Haltequoten springen (Gewitterfront 20 → 85 %, Ladungsserie 100 → 51 %). **Das korrigiert drei frühere Aussagen:** §7.52 A („Median 0,92× der Basis") gilt nur für Seed 1, mit Seed 101 wären es 1,82× — belastbar ist allein, dass Blitz in der GRÖSSENORDNUNG der Basis liegt statt beim Vier- bis Achtfachen (die Richtung 1.639 → 1.014 → 384/757M hält mit großem Abstand, die zweite Stelle nicht); §7.52 B („Kettenblitz ist repariert", +1 %) war zu stark, der zweite Lauf misst +35 % — weit weg von +601 % bleibt richtig, die Genauigkeit nicht; und die Vorsicht bei Vorentladung (§7.52 C, als Kandidat markiert) war berechtigt, der zweite Lauf sagt +5 % statt −23 %. **Faustregel daraus: unter etwa 35 pp ist ein Einzellauf dieser Reihe nicht lesbar, und er trägt eine Stelle, nicht zwei — rückwirkend für jede Prozentzahl in §7.41 bis §7.52.** Hochspannung ist mono grundsätzlich nicht messbar (211 pp bei gleicher Haltequote), was §7.41 C aus anderem Grund schon sagte. **Die toten Skills, diesmal belegt** (in BEIDEN Läufen ≤ 0 mit kleiner Spanne, sechs von dreizehn): Serienschutz −13/−20 % (kostet aktiv: zahlt Ladung für eine Serie nach einer Niederlage, und Ladung ist der Engpass — dazu ein Niederlagen-Skill gegen die Owner-Regel aus §7.31), Spannungsfeld 0/+0 %, Gewitterfront 0/0 % (spät ist die Chance gesättigt, früh gibt es kaum Leisten — er zahlt genau dann nicht, wenn er könnte), Blitzschlag +4/+1 %, Blitzfänger +4/0 %, Ladungsserie −5/+3 % (Ladung IST der Engpass, trotzdem neutral: die Schwelle greift zu spät). Entladung (−23/−5 %, 17 pp) liegt auf der Grenze und ist nicht entschieden. Drei der sechs haben eine STRUKTURELLE Diagnose, keine Zahlen-Diagnose — dort hilft ein größerer Satz nicht. Nichts umgesetzt, Owner-Entscheid. |
| 2026-09-10 | Die zwei Zahlen-Skills angehoben und gemessen (§7.54, Owner: „zahlen, messen"), beide Seed-Sätze, weil §7.53 die Rauschgrenze bei 35 pp beziffert hat. Gebaut: **Spannungsfeld 2/3/4/6 → 5/7/10/15 % Crit-Chance je ionisierter Karte**, **Blitzschlag +1/1/1/2 → +2/3/4/6 Stapel je Auslösung** bei unveränderter Kadenz (die war nie das Problem: die Leisten schütten im Lauf Ø 634 Stapel aufs Deck, gegen die ein Stapel je zweitem Crit nicht ankommt). **Blitzschlag ist repariert, und zwar deutlich: +4/+1 % → +74/+58 %** in zwei unabhängigen Läufen, weit über der Rauschgrenze — der erste eindeutig reparierte tote Skill der Reihe, jetzt stärkster normaler Skill neben Kurzschluss. Weil er die SIEGKARTE ionisiert, die je Stich wechselt, streut er und speist damit das Spannungsfeld. **Spannungsfeld ist dagegen KEIN Zahlen-Problem, und das ist jetzt belegt: zwei Achsen, zwei Anhebungen, kein Effekt** (§7.50 als Score-Multiplikator verdreifacht → drei von vier Stufen blieben unter Lift 1; §7.54 als Crit-Chance ×2,5 → −1/+1 %). Die Diagnose ist strukturell: sein Tor ist zu eng (nur Formations-Siege) und seine Skala zu klein (höchstens die Karten einer Formation, Median 4), während Lichtbogen auf DERSELBEN Achse +2/+23 % misst, weil er bei JEDEM Stich zündet und mit der Stapeltiefe skaliert (Ø 10,7 je Karte, tiefste Ø 215). Bittere Pointe: **die Schranke, die den Weglauf aus §7.46 behoben hat, ist dieselbe, die den Skill klein hält.** Blitzfänger (nicht angefasst) misst 0/−1 % — vierte Bestätigung, zusammen mit dem Befund, dass Episch schon heute +1 Wert je Stapel ungedeckelt gibt (auf der tiefsten Karte Ø +215 bei Grundwert ~7): **Wert sättigt, sobald der Stich ohnehin gewonnen ist.** **Preis der Runde:** die Fraktion steigt von 384/757M auf **792/1.196M**, also 1,9× bis 2,9× der Basis — kein Nebeneffekt, sondern die Rechnung: einen toten Skill lebendig zu machen fügt Kraft hinzu; Blitzschlags `stacks` ist der Regler. **Bilanz:** von den sechs toten Skills ist EINER repariert und FÜNF sind strukturell (Serienschutz, Gewitterfront, Ladungsserie, Blitzfänger, Spannungsfeld). Meine Einordnung in §7.53 D war damit zweimal falsch, und beide Male hat dieselbe Prüfung gefehlt: erst nachsehen, ob der bestehende Satz auf seinem Maximum überhaupt etwas bewirkt. |
| 2026-09-10 | Zwei Sonden vor dem Umbau der drei freigegebenen toten Skills (§7.55) — beide widerlegen eine Annahme. **(a) Die neue Spannungsfeld-Lesart zündet NICHT früher.** Neue Sonde `feld-formationen.mjs`: je Formations-Sieg hängt eine Position im Schnitt in nur **1,4 bis 1,7 Formationen**, früh sind die zwei Lesarten praktisch gleich (0,18 gegen 0,17 in den Runden 1–10; 0,81 gegen 0,89 in 11–20) und spät ist die neue deutlich KLEINER (1,72 gegen 4,09). Die Annahme, eine ionisierte Karte könne mehrere Formationen zugleich erhellen, trägt nicht — es gibt meist keine mehreren. Der frühe Engpass ist ein anderer: in den Runden 1–10 haben 86 % der Formations-Siege überhaupt keine ionisierte Karte in Reichweite. Der Umbau wie spezifiziert macht den Skill also SCHWÄCHER statt früher; wer früh will, muss die Ionisierungs-Bedingung streichen statt ihre Zählweise zu ändern. **(b) Meine Ladungsserie-Diagnose aus §7.53 D war falsch.** : `streak-probe` misst Blitz mono beste Serie p50 **240**, und 82 % der Läufe erreichen ≥ 75 — die Schwelle „ab Serie 16" ist bequem erreichbar, greift also nicht zu spät. Die echte Erklärung: `blitz-ramp` zählt Ø 150 volle Leisten je Lauf, davon nur 2 bis Runde 10 und 9 bis Runde 20 — **Ladung ist spät im Überfluss da und früh knapp**, und eine Serie von 16 hat man erst, wenn die Leisten ohnehin laufen. Der strukturelle Fehler ist nicht die Höhe der Schwelle, sondern die Kopplung an die Serie als Spätindikator. Nichts umgesetzt, zwei neue Sonden im Baum, Owner-Entscheid offen. |
| 2026-09-10 | Spannungsfeld zählt Formationen, ohne Ionisierungs-Bedingung (§7.56, Owner: „Formations-Sieg gibt +X % Crit-Chance je Formation dieser Position — genau das meinte ich"). Das ist die Variante aus §7.55 A statt der zuerst genannten; die Sonde hatte gezeigt, dass „je Formation, in der eine ionisierte Karte ist" den Skill **schwächer statt früher** macht. Kennwert ist jetzt die Zahl der FORMATIONEN dieser Position (`positionFormations`, braucht weder Karte noch Deck; Meta-Faktoren ohne Mitglieder zählen nicht mit), **Bedingung keine**, Sätze unverändert 5/7/10/15 %, Episch-Anhang unverändert. **Früh ist das der Faktor 8** (1,38 Formationen gegen 0,17 ionisierte Karten in den Runden 1–10), spät die Hälfte (1,73 gegen 4,09) — genau die Verschiebung dorthin, wo Crit-Chance knapp ist (Runden 1–10: Ø 14,8 % Roh-Chance gegen 87,1 % spät). Der Zweck ist die Kette dahinter: mehr Crits → schnellere volle Leisten → früher Ladung und Stapel; Blitz hat in den Runden 1–10 nur 2 volle Leisten (§7.55 B), das ist der Kaltstart der Fraktion. **Damit stehen auf der Crit-Chance-Achse zwei Skills mit entgegengesetzter Bauanleitung:** Lichtbogen zahlt je Stapel der gespielten Karte (Tiefe, wächst über den Lauf — Ø 10,7 je Karte spät, tiefste Ø 215), Spannungsfeld je Formation (Breite, von Anfang an da, aber gedeckelt bei 1,4–1,7). Früh trägt das Feld, spät der Bogen — das ist die Entscheidung, die §7.43 bauen wollte und dreimal verfehlt hat. Wächter gegengeprobt (eine nie erfüllbare Mitglieder-Bedingung eingebaut, er fällt); die Stufentabelle hält weiterhin fest, dass weder `perStack` (§7.43) noch `perCard` (§7.47) noch `critPerCard` (§7.51) zurückkommen dürfen. Startwerte, UNGEMESSEN. |
