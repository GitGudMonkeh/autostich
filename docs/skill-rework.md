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
- Slots unbegrenzt.
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
| Blitz | gesetzt, drei Punkte offen | offen | offen | separat, später |
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
- **Alle 10 Crits** ist die Leiste voll und **ionisiert eine Karte**.
- **Ionisierte Karten geben nur noch mehr Score.** Keine Crit-Chance aus dem Feld, keine Sättigung.
- Einige Skills werden so geändert, dass sie **mit der Anzahl an Ionisierungen** etwas machen.

Muster, das damit für alle Fraktionen gilt (Vorschlag): Passiv = eine Ressource freischalten plus ein
fester Payoff. Skills ändern die Rate, den Payoff und tun etwas mit der Menge.

**Was das Passiv aus dem Bestand übernimmt oder streicht:**

| Heute | Neu |
| --- | --- |
| Crit-Chance je Blitz-Skill (Sockel 5 %, +8 % je Skill) und +0,1× Crit-Mult je Skill | nicht mehr im Passiv, siehe offener Punkt 1 |
| Jeder Crit +1 Ladung, Leiste 10, Verbraucher löst aus | Leiste 10 Crits, Payoff fest: eine Karte ionisieren |
| Skill "Ionisierung" als einziger Verbraucher, höchstens einer im Build | Verbraucher-Regel entfällt, der Skill ist im Passiv aufgegangen |
| Stapel geben Score und feldweit Crit-Chance, Sättigung gibt Kartenwert | nur noch Score |
| Kaskade, Bekenntnis | unberührt, bleiben Skill-Sache |

**Offene Punkte, die vor der 15er-Auswahl gesetzt sein müssen (Owner):**

1. **Crit-Quelle.** Ohne Crit-Chance füllt sich die Leiste nie. Entweder das Passiv behält einen festen
   Sockel, etwa "Blitz aktiv = 10 % Crit-Chance", oder der erste Blitz-Skill muss Crit-Chance liefern
   und ist damit der Kernskill. Das Tempo der Leiste hängt direkt daran, siehe Tabelle.
2. **Stapeln.** Kann eine Karte mehrfach ionisiert werden (Stapel wie heute, höchstens 5) oder ist eine
   Karte ionisiert oder nicht? Kurzschluss, Blitzfänger und Durchschlag brauchen "voll ionisiert",
   also Stapel. Ohne Stapel werden sie zu Anzahl-Skills.
3. **Welche Karte.** Die Karte, die den zehnten Crit macht, eine zufällige noch nicht ionisierte Karte,
   oder die nächste in der Reihenfolge. Die erste konzentriert Ionisierung auf starke Karten, die
   zweite verteilt, die dritte macht die Aufstellung relevant.

**Tempo der Leiste bei 10 Crits je Ionisierung** (Annahme: 26 gewonnene Stiche je Runde, also 65 %):

| Crit-Chance | Crits je Runde | Runden je Ionisierung | Ionisierungen je 40-Runden-Lauf |
| --- | --- | --- | --- |
| 10 % | 2,6 | 3,8 | ~10 |
| 15 % | 3,9 | 2,6 | ~16 |
| 20 % | 5,2 | 1,9 | ~21 |
| 30 % | 7,8 | 1,3 | ~31 |
| 50 % | 13 | 0,8 | ~52 |

Bei 40 Karten heißt das: unter 20 % Crit-Chance wird ohne Rate-Skills nie das halbe Deck ionisiert, ab
50 % ist alles ionisiert und es geht nur noch um Stapel. Die Zahl 10 und die Crit-Quelle sind zusammen
das Tempo der Fraktion.

**Was die 17 unter dem neuen Passiv sind (Vorschlag, Entscheid je Skill kommt in 3.4):**

| Skill | Unter dem neuen Passiv |
| --- | --- |
| Ionisierung | im Passiv aufgegangen, entfällt als Skill |
| Kettenblitz | ohne Basis-Bindung: jede volle Leiste ionisiert +2 Karten |
| Blitzableiter, Statische Aufladung, Reststrom, Dauerstrom, Überschlag | Rate-Skills, füllen die Leiste schneller, bleiben sinnvoll |
| Gewitterfront, Entladung | Payoff bei voller Leiste, dauerhaft Crit-Chance oder Crit-Mult, mehrere gleichzeitig möglich |
| Spannungsstau, Ladungsserie | Crit-Quelle aus Sieg ohne Crit oder aus der Serie |
| Überspannung, Blitzschlag, Breitenbeschleuniger | Ionisierung außerhalb der Leiste oder an Position gebunden, Kaskade |
| Kurzschluss, Blitzfänger | brauchen Stapel, sonst Kandidaten für Anzahl-Effekte |
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

*Wird nach dem Passiv entschieden. Je Skill die Vorlage aus Abschnitt 1.*

### 3.5 Stufen

*Je Skill eine Tabelle Normal / Selten / Sehr selten / Episch, siehe Vorlage.*

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
