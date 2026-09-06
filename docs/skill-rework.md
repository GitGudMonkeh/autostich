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
- **Keine Deckel auf Skill-Rampen, lieber niedrigere Werte.** Rampen laufen offen; die Zahl je Schritt
  ist der Regler. Der harte Deckel des fertigen Crit-Multiplikators in der Engine (12× seit 7.19, vorher
  8×) ist davon nicht berührt, er bleibt, bis der Owner anderes sagt.
- **Crit-Chance über 100 % gibt einen sehr kleinen Crit-Multiplikator-Bonus.** Systemregel, Größe in
  der Sim. Überschlag, der denselben Überschuss in mehr Crit-Mult wandelte, ist seit 7.19 gestrichen; die
  Regel bleibt der Sockel für alle Fraktionen.
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
| Reststrom | Rate | Leiste startet nach dem Leeren bei 2 | bei 3 | bei 4 | bei 6 |
| Gewitterfront | Rampe Crit-Chance | +0,5 % je volle Leiste | +0,75 % | +1 % | +1,5 % |
| Entladung | Rampe Crit-Mult | +0,02× je volle Leiste | +0,03× | +0,04× | +0,06×; der Crit, der die Leiste füllt, hat doppelten Mult |
| Ladungsserie | Serie zu Crit | +1 % Crit je Serienpunkt | +1,5 % | +2 % | +2,5 %; ab Serie 8 jeder Sieg +1 Ladung |
| Kettenblitz | Tiefe (seit 7.18; vorher Breite; Leiter seit 7.19) | jede volle Leiste gibt der Karte mit den meisten Stapeln +1 Stapel | +2 | +3 | +4 |
| Blitzfänger | Ionisierung zu Wert (seit 7.18 ohne Schwelle) | ionisierte Karten kämpfen mit +1 Wert | +2 | +3 | +4 |
| Kurzschluss | Tiefe zu Score | Sieg mit Karte ab 6 Stapeln: Stapel zählen doppelt | ab 5 | ab 4 | ab 3 |
| Spannungsstau | Glättung (seit 7.18 auf den Crit-Multiplikator) | Sieg ohne Crit +0,05× Crit-Multiplikator für den nächsten Crit, der Crit leert | +0,075× | +0,1× | +0,15×; Crit halbiert statt leert |
| Vorentladung (neu, 7.18) | Serie zu Crit | ab Serie 5 gibt jeder Serienpunkt +0,1× Crit-Multiplikator auf den Stich | ab 4 | ab 3 | ab 2 |
| ~~Überschlag~~ | gestrichen (7.19; die Systemregel „Überschuss über 100 %" in groß, im gierigen Build −15 %) | – | – | – | – |
| Überspannung | Dauerwert je Leiste (seit 7.19; vorher Ionisierung zu Ladung) | jede volle Leiste gibt der Karte, die sie ionisiert, dauerhaft +1 Wert | +1 | +2 | +3 |
| Blitzschlag | Tiefen-Motor (Leiter seit 7.18) | jeder 4. Crit ionisiert die Siegkarte | jeder 3. | jeder 2. | jeder 2., zwei Stapel |
| ~~Dauerstrom~~ | gestrichen (7.18, in Blitzableiter aufgegangen) | – | – | – | – |
| Serienschutz | Schutz | Niederlage ab 70 % Ladung hält die Serie, kostet 70 % | 50 % | 40 % | 30 %; einmal je Runde gratis |
| Ionenfeld | Feld nach jeder Leiste (neu 7.18, Werte 7.19; Platz der alten Ionisierung) | jede volle Leiste: die nächsten 5 Stiche kämpfen alle Karten mit +3 Wert | 7 Stiche | 10 Stiche, +4 | 15 Stiche, +5 |
| Vorentladung | Serie zu Crit-Multiplikator (neu 7.18; Platz des Breitenbeschleunigers) | ab Serie 5 gibt jeder Serienpunkt +0,1× Crit-Mult auf den Stich | ab 4 | ab 3 | ab 2 |

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
| Donnergott | Rate | Die Ladungsleiste ist bei 7 voll. Dauerhaft +0,4× Crit-Multiplikator. |
| Doppelentladung | Tiefe | Jede Ionisierung gibt 2 Stapel statt 1. Crit mit einer ionisierten Karte: der Stich zählt doppelt. |
| Hochspannung (neu, ersetzt Flächenionisation) | Kit | Alle gehaltenen Blitz-Skills wirken eine Stufe höher, Episch bleibt Episch. |
| Durchschlag | Crit | Auch Niederlagen können critten: ein Crit bei einer Niederlage gewinnt den Stich. |

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
| Glut | Kaltstart (seit 7.12; vorher Rate aus Vorsprung ×1,25 … ×2; Schwellen seit 7.16) | unter 50 % Hitze zählt Hitze aus Siegen ×2 | unter 60 % | unter 70 % | unter 90 %; darunter kühlen Niederlagen nur halb |
| Zunder | Rate aus jedem Sieg (Sätze seit 7.16) | jeder Sieg +2 % Hitze | +3 % | +4 % | +5 % |
| Feuersturm | Serie zu Score (seit 7.17; vorher Serie zu Hitze) | bei voller Leiste zählt jeder Serienpunkt +0,1 % Score | +0,15 % | +0,2 % | +0,3 %; schon ab 90 % Hitze (7.18; war 80) |
| Glutbett | Schutz | Niederlagen kühlen nicht unter 40 % | nicht unter 60 % | nicht unter 80 % | Niederlagen kühlen nicht |
| Rückzündung | Comeback zu Hitze | Sieg nach Niederlage +0,5 % Hitze je Punkt Rückstand | +1 % | +1,5 % | +2 %; die Karte nach einer Niederlage hat +2 Wert |
| Glühende Klinge | Hitze zu Wert | alle Karten +1 Wert je 40 % Hitze | je 30 % | je 25 % | je 20 % |
| Weißglut | über die Leiste | Leiste bis 200; über 100 je 10 % +3 % Score | +4 % | +5 % | +6 % |
| Feuerwalze | Serie zu Wert | ab 80 % Hitze: nach einem Sieg hat die nächste Karte +2 Wert | ab 60 % | ab 40 % | ab 20 %; auch nach einer Niederlage |
| Verbrennung | Vorsprung zu Score | Sieg mit Vorsprung ab 8: Stich ×1,5 | ab 7 | ab 6 | ab 5 |
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
| Phönixfeuer | Rhythmus | Niederlagen heizen statt zu kühlen, +3 % je Punkt Rückstand (7.19: war +2 %). Bei voller Hitzeleiste hält die erste Niederlage jeder Runde die Serie (7.19). Fällt die Hitze auf 0, zündet sie auf 50 % neu, ohne Rundenlimit. |
| Sonnenzorn | Multiplikator | Der Hitze-Multiplikator rechnet mit der höchsten je erreichten Hitze — bis 200 %, auch ohne Weißglut (7.19: vorher bis 100 %). Er zählt doppelt: je 10 % +4 % Score statt +2 %. |
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
Legendären ist der reine Feuer-Build (Lifts, unten).

## 5. Eis

Offen.

## 6. Pflanze

Offen.

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
