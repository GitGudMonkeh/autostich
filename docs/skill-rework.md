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

- 40 Runden, 10 Skill-Phasen, 40 Karten. Vier Fraktionen jetzt, sechs als Ziel.
- **15 Skills je Fraktion**, ohne Legendäre. Legendäre werden separat behandelt.
- **Jeder Skill hat vier Stufen:** Normal, Selten, Sehr selten, Episch. Stufen sind bessere Versionen
  desselben Skills. Episch hat ein kleines Extra oder ist sehr stark.
- **Passive werden überarbeitet**, je Fraktion vor den Skills.
- **Direkt-Score wird aus den Skills nach Möglichkeit entfernt.** Er ist im Late Game bedeutungslos.
  Fraktions-Score geht in die Basis, vor die Multiplikatoren.
- **Keine Deckel auf Skill-Rampen, lieber niedrigere Werte.** Rampen laufen offen; die Zahl je Schritt
  ist der Regler. Der harte Deckel des fertigen Crit-Multiplikators in der Engine (8×) ist davon nicht
  berührt, er bleibt, bis der Owner anderes sagt.
- **Crit-Chance über 100 % gibt einen sehr kleinen Crit-Multiplikator-Bonus.** Systemregel, Größe in
  der Sim. Wechselwirkung mit Überschlag, der denselben Überschuss in Ladung wandelt, wird bei Skill 11
  entschieden.
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
| Blitz | gesetzt | gesetzt (Ionisierung und Breitenbeschleuniger gestrichen) | Vorschlag liegt vor | separat, später |
| Feuer | offen | offen | offen | separat, später |
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
je Stapel läuft über die Sim.

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

**Kurzschluss** — Tiefe zu Score. Heute: Sieg mit voller Karte +250 Direkt-Score, +3 Ladung.
Direkt-Score entfällt, Ersatz: die Stapel dieser Karte zählen in diesem Stich mehrfach.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | ab 6 Stapeln: Stapel zählen 1,5×, +1 Ladung | – |
| Selten | ab 5 Stapeln: Stapel zählen 1,5×, +2 Ladung | – |
| Sehr selten | ab 5 Stapeln: Stapel zählen 2×, +3 Ladung | – |
| Episch | ab 4 Stapeln: Stapel zählen 2×, +4 Ladung | die nächste Karte in der Reihenfolge erhält +1 Stapel |

**Spannungsstau** — Glättung. Heute: Sieg ohne Crit +5 % für den nächsten Sieg, Deckel 50 %, Crit setzt zurück.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | +3 %, Deckel 30 % | – |
| Selten | +5 %, Deckel 40 % | – |
| Sehr selten | +5 %, Deckel 60 % | – |
| Episch | +7 %, Deckel 70 % | ein Crit halbiert den Stau statt ihn zu leeren |

**Überschlag** — Ventil. Heute: Crit-Chance über 100 % gibt je 10 Prozentpunkte +1 Ladung je Sieg.
Tiefen-Klausel entfällt.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | je 20 Prozentpunkte +1 Ladung | – |
| Selten | je 15 Prozentpunkte +1 Ladung | – |
| Sehr selten | je 10 Prozentpunkte +1 Ladung | – |
| Episch | je 5 Prozentpunkte +1 Ladung | zählt auch bei Niederlagen |

**Überspannung** — Kaskade. Heute: Crit auf oder neben einer ionisierten Karte +3 Ladung.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | +1 Ladung, nur auf der ionisierten Karte selbst | – |
| Selten | +2 Ladung, auf oder neben | – |
| Sehr selten | +3 Ladung, auf oder neben | – |
| Episch | +4 Ladung, auf oder neben | Reichweite zwei Karten |

**Blitzschlag** — Ionisierung an der Leiste vorbei. Heute: jeder Crit ionisiert die Siegkarte. Das
Passiv braucht zehn Crits je Ionisierung; die Stufen setzen den Skill in ein Verhältnis dazu.

| Stufe | Effekt | Extra | Ionisierungen je 10 Crits mit Passiv |
| --- | --- | --- | --- |
| Normal | jeder 5. Crit ionisiert die Siegkarte | – | 3 |
| Selten | jeder 4. Crit | – | 3,5 |
| Sehr selten | jeder 3. Crit | – | 4,3 |
| Episch | jeder 2. Crit | die Siegkarte erhält 2 Stapel | 6, davon 5 doppelt |

**Dauerstrom** — Serie zu Ladung plus Rampe. Heute: je 3 Serienpunkte +1 Ladung je Sieg, höchstens +3,
volle Leiste +2 % Crit-Chance, Deckel 40 %.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | je 4 Serienpunkte +1 Ladung, höchstens +2; +1 % je volle Leiste, Deckel 20 % | – |
| Selten | je 3, höchstens +2; +2 %, Deckel 30 % | – |
| Sehr selten | je 3, höchstens +3; +2 %, Deckel 40 % | – |
| Episch | je 2, höchstens +4; +3 %, Deckel 50 % | – (stark) |

Anmerkung: die Rampe überschneidet sich mit Gewitterfront. Ob Dauerstrom die Rampe behält oder ein
reiner Serie-zu-Ladung-Skill wird, ist ein Entscheid des Owners; der Vorschlag lässt beides stehen.

**Serienschutz** — Schutz. Heute: Niederlage mit mindestens 50 % Ladung bricht die Serie nicht, die
Ladung wird verbraucht.

| Stufe | Effekt | Extra |
| --- | --- | --- |
| Normal | ab 70 % Ladung, kostet die ganze Leiste | – |
| Selten | ab 50 %, kostet 50 % | – |
| Sehr selten | ab 40 %, kostet 40 % | – |
| Episch | ab 30 %, kostet 30 % | einmal je Runde kostenlos |

**Entscheid Owner je Skill:** —

---

## 4. Feuer

Offen.

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
