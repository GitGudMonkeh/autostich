# Münzen — Erkundung

**Status: Erkundung, Fokus Münzen.** Diese Fassung sammelt, *was möglich wäre* — sie legt nichts fest.
Preise sind Verhältnisse zueinander, keine Werte. Gemessen wird auf Ansage.

Aufgaben, Bosse und Par sind hier nur so weit enthalten, wie die Münze sie berührt. Ihr Design kommt
später.

Sprache Deutsch, weil Inhalt und Spielertexte Produktsprache sind und der Owner hier mitschreibt —
dieselbe bewusste Abweichung wie in `docs/skill-rework.md`, und nur für dieses Dokument.

---

## 1. Rahmen

### Gesetzt (Owner)

- **Münzen als Ökonomie, Bosse mit Mechaniken und Beute, Score mit Par.** (2026-09-06.)
- **Der Progression-Baum wird mit dem neuen Progress entfernt. SP und DP fallen weg.** (2026-09-07.)
  Die Münze ist damit die einzige Währung im Spiel.
- **Ausgeben kann man Münzen für** (2026-09-07, erste Ideen, Liste offen): Neuwürfe · Skills
  aufwerten · eine bestimmte Fraktion an die Tür rufen · Energie in der Aufstellphase · Baufelder.
  **Einiges davon limitiert, damit es nicht überpowert wird.**
- **Münzen werden nicht an den Score gekoppelt.** Sie kommen aus **Spielmechanik-Aufgaben.**
  (2026-09-07.)
- **Die Aufgabenregel:** eine Aufgabe muss **bis Durchlauf 15 bzw. 30** erfüllt werden. Geschafft gibt
  einen Bonus, nicht geschafft gibt nichts. (2026-09-07.) **Das Aufgaben-Design selbst kommt später** —
  §5 hält nur fest, was die Münze davon braucht.
- **Zwei Zwischenbosse in Durchlauf 15 und 30**, Platzhalter. (2026-09-07.)

### Der größere Rahmen — frühe Idee des Owners, nicht beschlossen

Am 2026-09-07 geteilt, hier knapp festgehalten, weil die Münze darin lebt. **Kein Design, keine
Setzung** — das Progression-Design ist ein eigenes Vorhaben:

Inhalt für 15–20 Stunden, also 30–40 Läufe. Drei Ebenen zu je fünf Läufen. Jeder Lauf hat zwei
Zwischenbosse und einen Endboss, jeder Boss eine Mechanik auf den ganzen Lauf und eine Score-Schwelle;
wer sie reißt, verliert die Ebene. Fortschritt läuft über XP und passiert automatisch. Ebene bestanden
heißt Ebene übersprungen; die dritte ist das finale Ziel. Offen darin: ob man zwischen den Läufen einer
Ebene etwas mitnimmt.

Für die Münze zählen daraus genau zwei Dinge: **sie muss keine Progression tragen** (die läuft über XP,
automatisch), und **die Mitnahme-Frage betrifft sie** (§2).

### Sprachregelung

Der Denkstand nennt einen Durchgang „Runde"; Code und dieses Dokument nennen so den Deck-Durchlauf.
Ab hier: **Stich** → **Durchlauf** (40 Stiche) → **Lauf** (50 Durchläufe, 3 Bosse) → **Ebene** (5
Läufe). „Runde" wird nicht mehr benutzt; wo `skill-rework.md` „50 Runden" schreibt, sind Durchläufe
gemeint.

### Nicht hier

| Thema | Wo |
| --- | --- |
| Aufgaben-Design, Boss-Design, Progression | später, eigene Vorhaben |
| Skill-Inhalte und Stufen | `docs/skill-rework.md` (parallel auf `exp`) |
| Code, Konstanten, Tests | spätere Runde |

### Offen

- **F1 — Wer setzt den Boden?** Neuwürfe, Formations-Energie und Baufeld-Größe kommen heute aus dem
  Progression-Baum. Fällt der weg, braucht jede der drei einen neuen Startwert, bevor eine Münze etwas
  dazukaufen kann. Die Flächen A, D und E hängen daran.
- **F2 — Knapp oder reichlich?** §3.4.
- **F3 — Verfallen Münzen am Laufende, oder nimmt man sie in den nächsten Lauf mit?** §2.

---

## 2. Was die Münze ist

**Laufintern.** Sie entsteht im Lauf, wird im Lauf ausgegeben, und — Vorschlag — **verfällt am
Laufende**.

Der Verfall ist nicht Sparsamkeit, sondern das, was die Münze interessant macht. Eine Währung, die
verfällt, stellt die Frage *„jetzt ausgeben oder auf den nächsten Durchlauf sparen?"* — fünfzigmal je
Lauf. Eine Währung, die man mitnimmt, stellt sie nie: dort ist Sparen immer richtig.

**Damit hängt F3 an einer offenen Frage der Progression** (nimmt man zwischen den Läufen einer Ebene
etwas mit?). Drei Varianten:

| | Regel | Preis |
| --- | --- | --- |
| V1 | Münzen enden mit dem Lauf | Spar-Frage bleibt scharf; am Laufende gibt man alles aus — sauberer Schlusspunkt |
| V2 | Rest wandert in den nächsten Lauf | die Ebene bekommt einen Bogen, aber Sparen wird immer richtig, und es verstärkt den, dem die Läufe ohnehin gelingen |
| V3 | nur Boss-Beute wandert, Aufgaben-Münzen verfallen | behält beides, kostet zwei Töpfe |

**Klein und zählbar.** Zweistellig, im Kopf zu behalten — nicht im Zahlenraum des Scores.

**Sie muss keine Progression tragen.** Freischaltungen laufen über XP und passieren automatisch. Die
Münze darf ganz das bleiben, was sie am besten kann: eine kleine, schnelle Entscheidung innerhalb eines
Laufs.

---

## 3. Wofür man sie ausgibt

Die fünf vom Owner genannten, plus drei aus der Erkundung.

---

#### A — Neuwurf kaufen

**Kauft:** einen zusätzlichen Neuwurf des aktuellen Angebots (Tür, Perk-Auswahl, Architekt).

**Warum:** die einzige Stelle, an der heute schon eine knappe laufinterne Ressource existiert — drei
getrennte Pools, kein Nachschub. Der Spieler kennt das Gefühl „ich hätte gern noch einen" bereits; die
Münze beantwortet eine Frage, die das Spiel schon stellt.

**Deckel:** ein gekaufter Neuwurf je Angebot, Preis verdoppelt sich innerhalb des Durchlaufs. Ohne das
Erste wird die Tür zum Katalog, ohne das Zweite wird ein reicher Spieler zum Katalogleser.

**Preis:** billig. **Hängt an F1.**

---

#### B — Skill aufwerten

**Kauft:** hebt einen gehaltenen Skill um eine Stufe.

**Warum:** die einzige Fläche, auf die sich **sparen** lohnt, und die einzige, die einen schwachen
frühen Fund im Late Game noch rettet.

**Warum riskant:** Die Stufenleiter im Skill-Rework ist so gewählt, dass der Erwartungswert über die
Ziehungsquoten etwa dem heutigen Skill entspricht. Eine kaufbare Stufe verschiebt ihn nach oben — für
den Spieler, der ohnehin gut läuft. **Nicht bauen, bevor die Stufen stehen.**

**Deckel, drei Härtegrade:** eine Aufwertung je Lauf · eine je Abschnitt zwischen den Bossen und nie
auf die höchste Stufe · frei kaufbar mit steil steigendem Preis.

**Preis:** mit Abstand die teuerste Fläche.

---

#### C — Eine Fraktion an die Tür rufen

**Kauft:** garantiert, dass das **nächste** Türangebot mindestens ein Symbol der gewählten Fraktion
zeigt.

**Warum:** Einfluss ohne Macht. Kein stärkerer Skill, sondern eine **verlässlichere Richtung** — genau
das, was einem halb gebauten Fraktions-Build fehlt. Kostet die Balance fast nichts, weil sie die Stärke
der Skills nicht anfasst, nur ihre Verteilung.

**Deckel:** einmal je Skill-Phase, wirkt nur auf das nächste Angebot, ruft **ein Symbol, keine Tür**.
Ein Ruf, der wartet, bis er passt, wäre kein Ruf mehr.

**Offen:** Zusammenspiel mit dem Startfokus (`skill-rework.md` §1) — naheliegend wäre, dass der Ruf auf
die Fokus-Fraktion weniger kostet.

**Preis:** mittel.

---

#### D — Energie in der Aufstellphase

**Kauft:** einen zusätzlichen Tausch in der laufenden Aufstellphase.

**Warum:** die knappste Zahl im Spiel, in der Phase, die der Spieler am unmittelbarsten sieht. Die
klarste „ich rette diesen Durchlauf"-Ausgabe im Katalog.

**Deckel:** höchstens +2 je Aufstellphase, Preis steigt innerhalb der Phase, gekaufte Energie
**verfällt mit der Phase**.

**Preis:** mittel, steigend. **Hängt an F1.**

---

#### E — Baufeld-Zellen

**Kauft:** hebt den Baufeld-Deckel.

**Warum schwieriger:** die einzige Fläche mit **dauerhafter** Wirkung. Eine gekaufte Zelle trägt in
jedem folgenden Durchlauf — je früher gekauft, desto mehr. Das ergibt eine unangenehme Kurve: die beste
Ausgabe ist immer die früheste, und wer früh kein Geld hat, holt es nie auf.

**Zwei Wege:** dauerhaft mit hartem Deckel (+2 je Kauf, höchstens zweimal je Lauf) — oder auf Zeit (+4
für einen Durchlauf, beliebig oft). Letzteres passt zum Verfalls-Prinzip, fühlt sich beim Bauen aber
falsch an: ein Gebäude, dessen Fläche nächste Runde weg ist.

**Preis:** teuer. **Hängt an F1.**

---

#### F — Eine Karte umstellen, mitten im Durchlauf

**Kauft:** einen einzelnen Positionstausch außerhalb der Aufstellphase — wenn man sieht, dass eine
Formation um eins verfehlt wird.

**Warum:** sehr starkes Gefühl, sehr kleiner Eingriff, und ein natürlicher harter Deckel: einmal je
Durchlauf.

**Preis:** mittel.

---

#### G — Ein Gebäude zurücknehmen

**Kauft:** ein gesetztes Gebäude verschieben oder abreißen.

**Warum:** der Architekt ist heute endgültig — was steht, steht. Eine Münze, die einen Fehlbau
zurücknimmt, ist **Vergebung statt Macht**: die freundlichste Art, eine Ökonomie einzuführen, weil sie
niemanden stärker macht, sondern nur einen Fehler kleiner.

**Preis:** mittel.

---

#### H — Eine Aufgabe neu würfeln

**Kauft:** die laufende Aufgabe gegen eine andere tauschen.

**Warum:** die Ökonomie bezieht sich auf sich selbst — man gibt Münzen aus, um besser an Münzen zu
kommen. Setzt voraus, dass Aufgaben gewürfelt werden (offen, §5), und braucht dann einen Deckel, sonst
würfelt man bis zur leichtesten.

**Preis:** billig.

---

### 3.1 Zwei Arten, und wo die Deckel sitzen

| | Fläche | Deckel | Preis | Bereit? |
| --- | --- | --- | --- | --- |
| **Reichweite** | A Neuwurf | 1 je Angebot | billig | nach F1 |
| | C Fraktion rufen | 1 je Skill-Phase | mittel | **ja** |
| | H Aufgabe neu würfeln | 1 je Durchlauf | billig | wenn Aufgaben gewürfelt werden |
| **Stärke** | B Skill-Stufe | je Abschnitt | sehr teuer | nach dem Skill-Rework |
| | D Energie | +2 je Phase | mittel | nach F1 |
| | E Baufeld | 2× je Lauf | teuer | nach F1 |
| | F Karte umstellen | 1 je Durchlauf | mittel | **ja** |
| | G Gebäude zurücknehmen | 1 je Durchlauf | mittel | **ja** |

Die Unterscheidung ist nützlicher als jede Preisliste:

- **Reichweite** — mehr Auswahl, gleiche Stärke. Kaum Balance-Risiko.
- **Stärke** — der Durchlauf wird besser. Hier sitzen die Deckel.

**Wenn eine erste Fassung klein anfangen soll: C, F und G.** Alle drei brauchen kein anderes Vorhaben
(kein F1, kein Skill-Rework, kein Aufgaben-Design), alle drei sind laufintern und verfallen von selbst,
und keine macht einen Build stärker — sie geben Richtung, Korrektur und Vergebung. Das ist eine
vollständige kleine Ökonomie, die man bauen, spielen und wieder verwerfen kann.

### 3.2 Warum jede Fläche einen Deckel braucht

Autostich rechnet einen Stich als Basis mal Multiplikatoren; der Score wächst über den Lauf
geometrisch. **Alles, was am Multiplikator hängt, wächst mit** — wer vorne liegt, verdient mehr, kauft
mehr, liegt weiter vorne.

Zwei Gegenmittel, beide hier eingebaut:

1. **Deckel je Phase, nicht je Lauf.** Ein Deckel auf den Kontostand wäre umgehbar. Ein Deckel auf das,
   was *in diesem Moment* kaufbar ist, begrenzt die Höhe, ohne das Sparen zu bestrafen — Sparen bringt
   dann **Reichweite, nicht Höhe**.
2. **Einnahmen aus Aufgaben, nicht aus Score.** Wer den doppelten Score hat, bekommt dieselben Münzen,
   sofern beide die Aufgabe schaffen. Das hält die Ökonomie flach, während der Score exponentiell
   läuft. Genau das ist die Owner-Setzung.

### 3.3 Wann und wo man kauft

Bisher offen, und beim Fokus auf die Münzen die nächste konkrete Frage. **Es gibt keinen freien Platz
im Entscheidungsplan** — vor jedem Durchlauf steht genau eine Entscheidung, im Block Skill → Perk →
Aufstellen → Architekt. Ein eigener Kauf-Bildschirm müsste einer anderen Entscheidung ihren Platz
wegnehmen. Das ist der Grund, warum die Flächen oben alle **an einer Stelle sitzen, die es schon gibt**:

| Fläche | Wo der Kauf sitzt |
| --- | --- |
| A Neuwurf | am Angebot, neben dem vorhandenen Neuwurf-Knopf |
| B Skill-Stufe | bei den gehaltenen Skills |
| C Fraktion rufen | an der Tür, vor der Wahl |
| D Energie | in der Aufstellphase, neben der Energie-Anzeige |
| E Baufeld | in der Architekt-Phase |
| F Karte umstellen | im laufenden Durchlauf, am Brett |
| G Gebäude zurücknehmen | in der Architekt-Phase, am Gebäude |
| H Aufgabe neu würfeln | an der Aufgaben-Anzeige |

**Kein Shop.** Der ist schon einmal entfernt worden (#229). Die Münze ist kein Ort, den man besucht,
sondern ein Knopf, der dort auftaucht, wo die Entscheidung ohnehin fällt.

Was dann noch fehlt, ist die Anzeige: **ein Kontostand, der immer sichtbar ist.** Vorschlag: in der
Statusleiste, klein, neben dem, was dort schon steht.

### 3.4 Knapp oder reichlich — F2

Die Frage, die den Charakter der Ökonomie entscheidet:

| | Gefühl | Folge |
| --- | --- | --- |
| **Knapp** | 8 bis 12 Käufe je Lauf, jeder eine Entscheidung | jede Ausgabe wiegt; Sparen ist eine echte Alternative |
| **Reichlich** | fast jeder Durchlauf erlaubt einen Kauf | Ökonomie ist Rhythmus statt Entscheidung; die Deckel müssen eng sein |

Der Unterschied ist nicht die Zahl, sondern was der Spieler tut: bei *knapp* schaut er auf seine Münzen
und wartet; bei *reichlich* schaut er auf den Deckel und kauft, was gerade geht. Beides ist ein
legitimes Spiel — nur muss man wissen, welches.

---

## 4. Woher die Münzen kommen

**Gesetzt (Owner):** aus Spielmechanik-Aufgaben, nicht aus dem Score. Eine Aufgabe muss **bis
Durchlauf 15 bzw. 30** erfüllt werden — geschafft gibt einen Bonus, nicht geschafft gibt nichts.

**Das Aufgaben-Design kommt später.** Hier steht nur, was die Münze davon braucht:

- **Der Takt ist der Abschnitt, nicht der Durchlauf.** Eine Aufgabe läuft über 15 Durchläufe. Damit
  kommt Geld in **wenigen, großen Portionen** — bei 15 und bei 30, und was der Endboss zahlt. Das ist
  ein anderer Rhythmus als ein Tropfen je Durchlauf, und er hat eine Folge für §3: **die frühen
  Durchläufe haben noch kein Geld.** Wer eine Ökonomie will, die von Anfang an mitspielt, braucht
  entweder einen Startbetrag oder eine kleine laufende Quelle daneben.
- **Verfehlen kostet nichts.** Kein Abzug, keine Strafe — das ist gesetzt und macht die Aufgabe zu
  einer Einladung statt zu einer Pflicht.
- **Die Höhe ist die eigentliche Stellschraube.** Wenn ein Abschnittsbonus das Budget für die nächsten
  15 Durchläufe ist, entscheidet er allein über knapp oder reichlich (F2).

**Ein Befund für später, damit er nicht verloren geht:** die Engine berechnet je Stich bereits die
Größen, an denen die Perks hängen — Kartenwert beim Sieg, Abstand zur Gegnerkarte, laufende Serie,
Anzahl Siege, ob der Stich davor verloren ging, ob er über eine Formation lief, ob er kritisch war.
Dazu die Motor-Zähler je Fraktion. **Eine Mechanik-Aufgabe braucht deshalb kein neues Messwerk** — sie
liest dieselben Größen wie ein Perk. Das gilt unabhängig davon, wie die Aufgaben am Ende aussehen.

---

## 5. Am Rand

**Bosse.** Zwei Zwischenbosse in Durchlauf 15 und 30, Platzhalter. Für die Ökonomie ist ein Boss nichts
Neues: er zahlt in denselben Topf, nur mehr. Wenn er ein Vielfaches einer Aufgabe zahlt, taktet die
Ökonomie nach den Bossen — das ist eine Verhältnisfrage, keine Strukturfrage.

**Korrektur zur letzten Fassung:** ich hatte die Wochen-Modifikatoren als fertiges Muster für
Boss-Mechaniken bezeichnet. Der Owner hat widersprochen, und zu Recht — **ein paar Wirkungsstellen sind
brauchbar, der Pool als Ganzes ist für Bosse zu generisch.** Ein Boss braucht eine Mechanik, die etwas
über *diesen* Boss sagt; ein Wochen-Modifikator ist bewusst charakterlos, weil er zu jeder Woche passen
muss. Was bleibt: die Nähte, an denen so etwas greift, existieren bereits, und `difficulty` (im
Normallauf ein No-op) trägt einen stärkeren Gegner.

**Par.** Gesetzt, aber nicht Gegenstand dieser Runde. Zwei Sätze, die stehen bleiben sollen: Die Kurve
ist exponentiell, weil der Score geometrisch wächst — ein linearer Par wäre in Durchlauf 5 unerreichbar
und in Durchlauf 45 belanglos. Und: **Par zahlt keine Münzen.** Der Owner hat Münzen vom Score
entkoppelt; ein zahlender Par wäre die Kopplung durch die Hintertür.

**Für später notiert, aus der vorigen Runde.** Wenn eine Ebene fünf Läufe **in Folge** verlangt,
verlangt sie milde Boss-Schwellen — bei der Zielgröße 30–40 Läufe müssten etwa drei von vier Läufen
durchgehen. Verlangt sie fünf **gesammelte** Läufe, reicht jeder zweite. Harte Schwellen und
Serienzwang zugleich kosten das Drei- bis Sechsfache der Zielgröße. *(Wahrscheinlichkeitsrechnung über
die genannte Zielgröße, kein Sim-Ergebnis. Gehört zur Progression, steht hier nur, damit es nicht
verloren geht.)*

---

## 6. Offene Fragen

| # | Frage | Stand |
| --- | --- | --- |
| F1 | Wer setzt nach dem Wegfall des Baums den Boden für Neuwürfe, Energie und Baufeld? | hängt am neuen Progress; A, D, E warten darauf |
| F2 | Knapp oder reichlich? | §3.4 — entscheidet den Charakter |
| F3 | Verfall je Lauf, oder Mitnahme in die Ebene? | V1 / V2 / V3 in §2 |
| M1 | Welche Flächen überhaupt? | fünf gesetzt, drei aus der Erkundung (§3) |
| M2 | Welche zuerst? | C, F, G — brauchen kein anderes Vorhaben |
| M3 | Deckel je Phase oder je Lauf? | je Phase: begrenzt die Höhe, nicht das Sparen |
| M4 | Skill-Aufwertung: welcher Härtegrad? | drei in §3 B |
| M5 | Baufeld dauerhaft oder auf Zeit? | §3 E |
| M6 | Ruft die Münze ein Symbol oder eine ganze Tür? | ein Symbol, nur das nächste Angebot |
| M7 | Ist der Ruf auf die Fokus-Fraktion billiger? | hängt am Fokus (`skill-rework` §1) |
| M8 | Gibt es einen Startbetrag oder eine laufende Quelle neben den Abschnittsboni? | sonst haben die ersten 15 Durchläufe keine Ökonomie (§4) |
| M9 | Wo steht der Kontostand? | Vorschlag: Statusleiste, klein (§3.3) |

---

## 7. Wenn es weitergeht

1. **F1, F2, F3.** Ohne sie ist jede Zahl geraten.
2. **C, F und G bauen.** Die kleinste vollständige Ökonomie: sie verdient, sie gibt aus, sie verfällt —
   und keine der drei macht einen Build stärker.
3. **Aufgaben-Design**, wenn es soweit ist. Erst dann steht, wie viel Geld wann fließt — und damit, ob
   die Deckel oben passen.
4. **Stärke-Flächen**, wenn die kleine Form trägt. B wartet auf den Skill-Rework, D und E auf F1.
