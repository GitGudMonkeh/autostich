# Minibosse — Mechanik-Katalog (Brainstorm-Stand)

**Status: Zwischenstand einer Design-Session, keine Spezifikation.** Aus zwei Sammelrunden
(2026-09-16) kamen neunzehn Vorschläge; ein Durchgang Boss für Boss hat daraus **vierzehn Minibosse
mit gesetzten Werten**, vier Endboss-Kandidaten und einen optionalen gemacht — §3. §2 hält die
Messungen, gegen die tariert wurde. Die Werte sind **Owner-Entscheid am Papier, nicht simuliert**;
die offenen Mechanikfragen sind entschieden (§4, Punkt 4).

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

## 3. Der Katalog

Zwei Sammelrunden ergaben neunzehn Vorschläge; der Durchgang Boss für Boss (Owner, 2026-09-16) hat
sie auf drei Listen verteilt und die Werte gesetzt. Die Nummern sind stabil.

### 3.1 Minibosse — vierzehn, mit gesetzten Werten

**Die Namen sind Figuren, ohne Artikel** (Owner, 2026-09-16). Jeder Zwischenboss ist jemand, der
etwas tut, nicht eine Erscheinung, die eintritt — dieselbe Form wie Späher, Wucherer und Wärter, die
den Ton vorgegeben haben. Verworfen als zu altbacken: Mehrer, Siegler, Markscheider. Die vier
Endboss-Kandidaten und der optionale behalten ihre Arbeitsnamen, bis sie selbst an der Reihe sind.

> **Beim Umbenennen mitgeprüft:** das Spiel führt schon Namen auf -er an anderen Stellen — **Henker**
> und **Sammler** als legendäre Perks, **Brecher** als Auftragsaufgabe. Kollidieren tut keiner der
> vierzehn, aber das Register ist geteilt. Ebenfalls geprüft und vermieden: **Zöllner** hätte sich
> den Stamm mit dem Gebäude **Zollhaus** geteilt, **Wächter** mit Wärter.

| Nr. | Name | Regel und Wert |
| --- | --- | --- |
| M01 | **Späher** | Die Gegnerreihenfolge ist nicht gemischt, sondern nach deiner Formationsstärke verteilt: die höchsten Gegnerkarten auf die Positionen mit dem höchsten Formations-Mult. Positionen ohne Formation stehen alle auf Mult 1 und werden untereinander gemischt. Der Anker zählt als Formation und fällt damit nicht in die Zufallsgruppe |
| M03 | **Züchter** | Alle Gegnerkarten **+1 alle 10 Durchläufe**, dauerhaft und kumulativ — bei D10, D20, D30, D40, D50 |
| M04 | **Neider** | **Alle 5 Durchläufe −1** auf die Karte, die in diesem Fenster die meisten Stiche gewonnen hat. Der Abzug bleibt bis zum Laufende |
| M08 | **Dreher** | Nach jedem Durchlauf rückt die Aufstellung **um eine Position** weiter; **Position 40 wandert auf 1**. Nach 40 Durchläufen steht das Brett wieder wie am Anfang |
| M10 | **Schließer** | Vor jeder Aufstellphase rückt die Sperre **ein Segment** weiter. Die fünf Karten darin spielen ihre Stiche normal und zahlen auch, **können in dieser Phase aber nicht getauscht werden**. Bei acht Segmenten und einer Aufstellphase je vier Durchläufe braucht sie rund 32 Durchläufe einmal herum |
| M11 | **Bremser** | Formations-Energie **4 → 2** je Aufstellphase |
| M12 | **Maurer** | Eine getauschte Karte ist die **nächsten zwei Aufstellphasen** gesperrt. Zurücknehmen innerhalb der laufenden Phase bleibt möglich |
| M13 | **Wucherer** | Die Preistreppe **verdreifacht** statt zu verdoppeln — Neuwurf 3 · 9 · 27 statt 3 · 6 · 12 |
| M14 | **Beutelschneider** | An jeder Durchlaufgrenze verfällt **ein Viertel des Kontostands, aufgerundet**. Bei 10 Münzen verfallen 3, bei 5 verfallen 2, bei 1 verfällt sie |
| M15 | **Vogt** | **3 Münzen je Durchlauf**, automatisch abgezogen, solange Deckung da ist — keine Verweigerung. Reicht der Kontostand nicht, **Gegner +1** in diesem Durchlauf |
| M16 | **Hetzer** | Der Distrikt-Bonus kehrt sein Vorzeichen um, der Betrag bleibt: **−8 %** je verschiedenem gleich-kategorigem Nachbargebäude, höchstens drei gezählt — bis −24 % statt bis +24 % |
| M17 | **Bauaufseher** | Baufeld-Deckel **24 → 16** Zellen. Eine volle Spalte (8) bleibt erreichbar, kostet aber das halbe Budget |
| M18 | **Schmarotzer** | **1 Münze je 2 gehaltene Perks je Durchlauf, abgerundet.** Bei Kontostand 0 passiert nichts. Break-even bei rund 6 Perks gegen ein Einkommen von etwa 3 je Durchlauf |
| M19 | **Wärter** | Bei **D20 und D40** gibst du je einen gehaltenen Skill ab. Welchen, entscheidest du |

### 3.2 Die Spielertexte

Was im Spiel an der Kachel steht. Nach `docs/text-style-guide.md` §3 und denselben Regeln wie die
Auftragstexte (`docs/zwischenaufgaben.md` §8): ein bis zwei Sätze, Bedingung vor Wirkung, aktiv,
kein Gedankenstrich, kein Selbstbezug, kanonische Begriffe (Durchlauf, Stich, Lauf, Position,
Formation, Neuwurf, Kampfwert).

| Nr. | Name | Text |
| --- | --- | --- |
| M01 | **Späher** | Die Gegnerkarten kommen nicht zufällig. Wo deine Formationen am stärksten sind, steht der stärkste Gegner. |
| M03 | **Züchter** | Alle zehn Durchläufe gewinnen alle Gegnerkarten einen Punkt Kampfwert. Der Aufschlag bleibt bis zum Ende des Laufs. |
| M04 | **Neider** | Alle fünf Durchläufe verliert die Karte mit den meisten Stichen einen Punkt Kampfwert. Der Verlust bleibt bis zum Ende des Laufs. |
| M08 | **Dreher** | Nach jedem Durchlauf rückt deine Aufstellung eine Position weiter. Was auf Position 40 stand, steht danach auf Position 1. |
| M10 | **Schließer** | Vor jeder Aufstellphase wird ein anderes Segment versiegelt. Seine fünf Karten spielen normal, lassen sich aber nicht tauschen. |
| M11 | **Bremser** | Du hast zwei Tauschzüge je Aufstellphase statt vier. |
| M12 | **Maurer** | Eine getauschte Karte bleibt zwei Aufstellphasen lang an ihrer Position. Zurücknehmen kannst du sie in der laufenden Phase weiterhin. |
| M13 | **Wucherer** | Jeder weitere Kauf derselben Art verdreifacht den Preis, statt ihn zu verdoppeln. Der Neuwurf kostet 3, dann 9, dann 27. |
| M14 | **Beutelschneider** | An jedem Durchlaufende verfällt ein Viertel deiner Münzen, aufgerundet. Bei 10 Münzen sind das 3. |
| M15 | **Vogt** | Jeder Durchlauf kostet dich 3 Münzen. Reichen sie nicht, gewinnen alle Gegnerkarten in diesem Durchlauf einen Punkt Kampfwert. |
| M16 | **Hetzer** | Jedes Gebäude verliert 8 Prozent je angrenzendem Gebäude derselben Kategorie. Höchstens drei Nachbarn zählen. |
| M17 | **Bauaufseher** | Dir stehen 16 Baufeldzellen zur Verfügung statt 24. |
| M18 | **Schmarotzer** | Je zwei gehaltene Perks kosten dich eine Münze je Durchlauf. Hast du keine Münzen, passiert nichts. |
| M19 | **Wärter** | Nach Durchlauf 20 und nach Durchlauf 40 gibst du einen gehaltenen Skill ab. Welchen, entscheidest du. |

> **Eine Regelkollision, bewusst aufgelöst.** Der Style Guide behält Bindestriche in Komposita
> ausdrücklich, der Owner wollte keine (2026-09-16). Gewählt sind durchgehend zusammengeschriebene
> Formen, die ohne Bindestrich korrekt sind: Aufstellphase, Baufeldzellen, Durchlaufende. Damit
> bricht kein Kompositum und es steht trotzdem kein Strich im Text.

### 3.3 Endboss-Kandidaten — vier, geparkt

Nicht verworfen, sondern für den Endboss zurückgelegt (Owner, 2026-09-16). Ohne gesetzte Werte.

| Nr. | Name | Regel |
| --- | --- | --- |
| M02 | **Der Konter** | Jeder Sieg gibt der nächsten Gegnerkarte +1, stapelnd; eine Niederlage setzt zurück |
| M05 | **Der Gleichmacher** | Alle dauerhaften Wertgewinne sind wirkungslos; jede Karte kämpft mit ihrem Grundwert 1 bis 10 |
| M06 | **Die Umkehr** | Der Kampfwert ist **11 − Wert**, bei **0 abgefangen**. Bewusst als Formel und nicht als Spiegelung notiert (Owner): so steht in der Regel, dass jede gekaufte Wertsteigerung gegen dich arbeitet — was über 10 gehoben wurde, fällt auf 0 |
| M09 | **Die gezielte Sperre** | N Positionen gesperrt, und der Boss wählt sie mitten in deine längste Formation |

### 3.4 Optional — einer

| Nr. | Name | Warum geparkt |
| --- | --- | --- |
| M07 | **Der Zensus** | Schwer zu umgehen, und er greift den Score direkt an statt über eine Bedingung (Owner) |

### 3.5 Was beim weiteren Tarieren zusammenstößt

Minibosse treten einzeln auf; die Paare zählen erst für den Endboss und für die Frage, ob eine Ebene
denselben Boss zweimal ziehen darf.

- **M10, M11 und M12 sitzen alle drei auf der Aufstellphase.** Schließer sperrt fünf Positionen,
  Bremser halbiert die Energie, Maurer bindet jeden Tausch für zwei Phasen. Je zwei zusammen nehmen
  dieselbe Handlung doppelt.
- **M08 Dreher gegen M11 oder M12** — Rotation je Durchlauf gegen wenige, gebundene Tauschzüge.
- **M13, M14, M15 und M18 hängen an derselben Börse.** Je zwei zusammen ziehen doppelt ab, und jede
  Tarierung verschiebt, was die anderen kosten.
- **M16 gegen M17** — Hetzer verlangt Platz zum Streuen, Bauaufseher nimmt ihn.

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
2. **Tarierung.** Offen ist, ob der Threshold die Konstante je Ebene ist und jeder Miniboss auf
   ungefähr denselben gemessenen Score-Verlust tariert wird, oder ob der Threshold mit dem Boss
   wandert. Das Erste ist mit dem vorhandenen Sim-Harness messbar.
3. **M06 Die Umkehr hat keine Größe.** Sie ist an oder aus; es gibt keine Zahl, an der man sie
   schwächer stellen kann. Tarierbar ist sie nur über die **Dauer** oder über den **Threshold**.
4. **Die drei offenen Mechaniken sind entschieden** (Owner, 2026-09-16):
   - **M06** — der Kampfwert **fängt bei 0 ab**, wie der Gegnerwert es heute schon tut. Eine über 10
     gehobene Karte fällt damit auf 0, nicht ins Negative.
   - **M15** — **keine Verweigerung.** Die 3 Münzen werden automatisch abgezogen, solange Deckung da
     ist. Der Vogt ist damit eine Steuer, keine Entscheidung je Durchlauf — die Entscheidung
     verschiebt sich auf das Ausgeben: wer seine Börse leerkauft, zahlt die Strafe.
   - **M18** — **abgerundet**, ein Perk kostet also nichts, drei kosten eine Münze. Steht der
     Kontostand auf 0, **passiert nichts** — keine Strafe, kein Rückstand. Die Familie kann damit
     nie mehr tun, als die Börse leer zu halten.

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
