# Zwischenaufgaben (exp) — Planungsdokument

**Status: lebendes Dokument.** Beutekatalog und Aufgaben-Katalog sind durchdesignt und vom Owner Wert
für Wert abgenommen (2026-09-14). Offen sind die neun Punkte in §10; danach ist das Dokument
umsetzungsreif.

Entscheidungen des Owners stehen unter **Gesetzt**. Alles unter **Vorschlag** ist Diskussionsstand und
gilt erst, wenn es nach Gesetzt wandert.

Sprache Deutsch, weil Beutenamen und Beutetexte Produktsprache sind und der Owner hier mitschreibt.
Bewusste Abweichung von der Engineering-Sprache in `AGENTS.md`, wie bei `docs/skill-rework.md` und
`docs/muenz-oekonomie.md`, und nur für dieses Dokument.

Übersicht aller 56 Beutestücke mit Raritätsfarben:
<https://claude.ai/code/artifact/e6122960-8f20-464e-849a-66ba5f83163d>

Der Platzhalter in `docs/muenz-oekonomie.md` §7 („Zwischenaufgaben bei Durchlauf 15/30: später") wird
durch dieses Dokument abgelöst. Bosse bleiben weiterhin ausgeklammert (§11).

---

## 1. Was gebaut wird

Zwei Aufgaben je Lauf. Die erste läuft über die Durchläufe 1 bis 15, die zweite über 16 bis 30. Zu
Beginn jedes Fensters liegen **drei Angebote** auf dem Tisch. Jedes ist ein Paar aus einer Aufgabe und
der Beute, die sie zahlt, beides sichtbar. Eins nimmst du an, die anderen zwei verfallen.

**Gesetzt (Owner, 2026-09-14):**

- Zwei Fenster: **D1 bis D15** und **D16 bis D30**.
- **Drei Angebote zur Wahl**, jedes mit eigener Schwierigkeit.
- **Jede Aufgabe hat vier Stufen, benannt wie die Raritäten** (Normal, Selten, Sehr selten, Episch).
- **Die Stufe der Aufgabe ist die Stufe der Beute.** Es gibt keine zweite Leiter und keinen zweiten Zug.
- **Aufgabe und Beute sind beim Wählen sichtbar.** Man soll erkennen, ob ein Angebot zum geplanten Bau
  passt. Kein Neuwurf.
- Beute **wirkt weiter und zahlt nie in Score**.
- **Legendäre Beute ist schon bei D15 möglich**, als Chance auf der Stufe Episch.
- **Die unterste Stufe ist knapp ohne Aufwand erreichbar.** Wer sie nimmt, tauscht Rarität gegen
  Sicherheit. Alle Stufen darüber verlangen Investition.
- Nicht erfüllt zahlt **nichts**.
- **Keine Kategorie doppelt** im Beutekatalog.

**Ersetzt zwei frühere Beschlüsse** (beide vom Owner selbst, 2026-09-14): die Aufgabe wird nicht mehr
zufällig zugewiesen, sondern gewählt, und die Beute ist nicht mehr bis zur Erfüllung verdeckt. Mit der
Schwierigkeit als Raritätsträger entfällt auch die Marken-Leiter aus Bronze, Silber und Gold; sie war
ein zweites Vokabular für eine Leiter, die das Spiel schon hat.

---

## 2. Warum: die Messung

Alle Zahlen in diesem Abschnitt sind **gemessen** auf dem exp-Stand (2026-09-14), nicht geschätzt.
Die Sonden liegen nicht im Repo; die Methode steht jeweils dabei und ist nachbaubar.

### 2.1 Der frühe Lauf trägt nichts zum Score bei

`node sim/batch.js --mode pacing --runs 60 --seed 7`, Median-Lauf:

| | bis D13 | bis D25 | bis D38 | letzte 10 Durchläufe |
| --- | --- | --- | --- | --- |
| Anteil am Endscore | **1,9 %** | 6,3 bis 7,9 % | rund 26 % | **66 %** |

Entscheidungen sind dagegen **linear** verteilt: der Block Skill, Perk, Aufstellen, Architekt
wiederholt sich über alle 50 Durchläufe. Der frühe Lauf kostet vollen Entscheidungspreis und zahlt
zwei Prozent. Das ist die Lücke, die die Aufgaben schließen sollen.

Daraus folgt die Regel, an der der ganze Katalog hängt: **jede Belohnung in Score wäre früh
unsichtbar.** Nur was weiterwirkt, hat bei D15 Gewicht.

### 2.2 Was die beiden Fenster produzieren

Eigene Sonde über `runOne` mit `onTrick`-Sampling an den Durchlaufgrenzen, 40 Läufe je Spielweise,
Median:

| Fenster 1 (D1 bis D15) | je Durchlauf p50 / p90 | bester Durchlauf p50 / p90 |
| --- | --- | --- |
| Siege | 19 / 22 | 22 / 26 |
| Formationen | 15 / 19 | 18 / 21 |
| beste Serie am Fensterende | 8 / 12 | |

Kumuliert bis D15: rund 285 Siege, 128 Formationen (naiv) bis 223 (Greedy-Aufstellung), 64 bis 73
Münzen, 3 bis 4 gehaltene Skills.

### 2.3 Uhr, Können, Fraktion

Der wichtigste Fund für die Bedingung. Wie stark hängt ein Zähler an der Spielweise?

| Zähler | Spanne zwischen den Bauweisen | taugt als Bedingung |
| --- | --- | --- |
| Siege | 19 gegen 19 | neutral, aber allein betrachtet eine **Uhr** |
| Serie | 8 gegen 9 | ja |
| Formationen | 15 gegen 15 in Fenster 1, 17 gegen 21 in Fenster 2 (Pflanze vorn) | ja, mit leichter Schlagseite |
| Crits | **2 (Feuer) gegen 52 (Blitz)** | nein, reine Fraktionssteuer |

Eine Aufgabe auf Siegen allein ändert nichts am Spiel, sie tickt ab. Eine Aufgabe auf Formationen
bewegt sich um Faktor 1,7 zwischen naivem und überlegtem Aufstellen. Eine Aufgabe auf Crits ist mit
Blitz eine Formalität und mit Feuer unmöglich, weshalb keine im Katalog steht.

Seit die Aufgabe **gewählt** statt zugewiesen wird, ist die Fraktions-Schieflage kein Fairness-Problem
mehr, sondern ein Passungs-Problem: man nimmt, was zum Bau passt. Die Uhren-Frage bleibt trotzdem,
denn eine Bedingung, die von allein abläuft, trägt auf keiner Stufe eine Entscheidung.

---

## 3. Die Aufgabe

### 3.1 Drei Angebote, drei Schwierigkeiten

Zu Beginn eines Fensters liegen drei Angebote aus. Jedes zeigt die Aufgabe, ihre Stufe und die Beute,
die sie zahlt. Die drei tragen **immer drei verschiedene Stufen**, sonst wäre es keine Entscheidung
zwischen Sicherheit und Rarität, sondern nur zwischen Tätigkeiten.

Die Wahl fällt im ersten Fenster **nach der ersten Skill-Wahl**, im zweiten bei **D16**. Beide Male
weiß der Spieler genug über seinen Bau, um zu beurteilen, was zu ihm passt.

### 3.2 Vier Stufen, dieselbe Leiter wie überall

| Stufe der Aufgabe | Beute | Was die Stufe verlangt |
| --- | --- | --- |
| Normal | ein Stück Normal | läuft nebenbei mit, wenn man nichts dagegen tut |
| Selten | ein Stück Selten | die Aufstellung muss ernst genommen werden |
| Sehr selten | ein Stück Sehr selten | man muss darauf zuspielen |
| Episch | ein Stück Episch, mit einer Chance auf ein Legendäres | der Bau muss danach ausgerichtet sein |

Der Satz für Legendär auf der Stufe Episch ist offen (§10). Es ist die einzige Stelle, an der ein
legendäres Stück in den Lauf kommt.

### 3.3 Drei Arten Zähler

Ohne diese Unterscheidung stünde Fenster 2 mit dem Vorsprung aus Fenster 1 da.

- **Summe** zählt nur im eigenen Fenster.
- **Zustand** wird am Fensterende abgelesen, der ganze Lauf zählt.
- **Spitze** ist das beste einzelne Vorkommen im Fenster, also die beste Aufstellung oder der beste
  Durchlauf.

### 3.4 Dieselbe Leiter in beiden Fenstern

Eine Aufgabe hat **einen** Satz Schwellen, nicht zwei. Damit ist dieselbe Stufe bei D30 leichter als
bei D15, weil der Bau steht. Das gleicht sich von selbst aus: Beute aus Fenster 1 wirkt in 8 bis 9
Phasen jeder Sorte nach, bei D30 nur in 5. **Frühe Beute ist wertvoller, späte Stufen sind billiger.**

### 3.5 Voraussetzungen werden genannt, nicht weggefiltert

Bei sechs der elf Aufgaben sind die oberen Stufen an etwas gebunden, das man erst finden muss. Das ist
**gewollt** (Owner, 2026-09-14): eine solche Aufgabe sagt dem Spieler, wohin er bauen soll.

Ein erster Vorschlag, solche Stufen gar nicht erst anzubieten, ist damit **verworfen**: er hätte genau
die Aufgaben entfernt, die den frühen Lauf lenken sollen. Stattdessen **steht die Voraussetzung am
Angebot**, etwa „Diese Stufe verlangt offene Segmentgrenzen". Wer das Tor sieht, kann entscheiden, ob
er es aufmacht.

### 3.6 Gegen Wiederholung

**Vorschlag**, drei Regeln, alle billig:

1. **Gewürfelte Parameter statt einer langen Liste.** Dasselbe Muster wie `WEEK_MODS`
   (`range: [min,max]`, `desc(mag)`): Reinheit würfelt den Formationstyp, Quartier die Kategorie,
   Farbtreue die Farbe.
2. **Kein Angebot zweimal in einem Lauf**, und Fenster 2 zieht keine Aufgabe aus Fenster 1.
3. **Die letzten vier Aufgaben sind gesperrt.** Ein Feld im Profil, additiv über `DEFAULT_PROFILE`,
   kein Schema-Sprung nötig.

---

## 4. Der Aufgaben-Katalog

**Elf Aufgaben mit je vier Stufen.** Die Werte sind Owner-Entscheid aus Playtest-Erfahrung
(2026-09-14), wo nicht anders vermerkt. Die Messungen darunter sagen, wo sie gegenüber dem
Sim-Verhalten stehen.

| Aufgabe | zählt | Normal · Selten · Sehr selten · Episch |
| --- | --- | --- |
| **Durchmarsch** Siege in einem Durchlauf | Spitze | 22 · 26 · 30 · 34 |
| **Sperrfeuer** Segmente mit allen fünf Stichen | Spitze | 2 · 3 · 4 · 5 |
| **Strähne** längste Siegesserie | Spitze | 10 · 15 · 30 · 60 |
| **Gedränge** Formationen in einer Aufstellung | Spitze | 15 · 25 · 35 · 45 |
| **Reinheit** Formationen eines gewürfelten Typs | Spitze | siehe unten |
| **Langbau** längste Formation | Spitze | 5 · 10 · 15 · 20 |
| **Vollbrett** Positionen mit mindestens einer Formation | Spitze | 30 · 34 · 37 · 40 |
| **Farbtreue** Siege derselben Farbe in Folge | Spitze | 5 · 7 · 10 · 15 |
| **Aufmarsch** Kampfwert über dem Gegnerdeck | Zustand | 20 · 30 · 40 · 60 |
| **Quartier** volle Baufeld-Segmente einer Kategorie | Zustand | 1 · 2 · 3 · 4 |
| **Säckel** Münzen gehalten | Zustand | 60 · 80 · 100 · 120 |

**Reinheit je Typ.** Treppe und Wechsel kommen je Aufstellung häufiger vor als Farbblock und
Wiederholung (gemessen 4,1 und 5,5 gegen 2,6 und 3,1), deshalb tragen sie höhere Leitern. Farbblock
und Wiederholung sind Owner-Werte, Treppe und Wechsel **Vorschlag**.

| Typ | Normal · Selten · Sehr selten · Episch |
| --- | --- |
| Farbblock | 3 · 4 · 5 · 6 |
| Wiederholung | 3 · 4 · 5 · 6 |
| Treppe | 4 · 5 · 6 · 8 |
| Wechsel | 5 · 7 · 9 · 11 |

### 4.1 Die Texte

Nach denselben Regeln wie die Beutetexte (§8): ein Satzmuster je Aufgabe, nur die Zahl skaliert, kein
Gedankenstrich, kein Selbstbezug.

| Aufgabe | Text |
| --- | --- |
| Durchmarsch | Gewinne in einem Durchlauf X Stiche. |
| Sperrfeuer | Gewinne in einem Durchlauf alle fünf Stiche in X Segmenten. |
| Strähne | Gewinne X Stiche in Folge. |
| Gedränge | Baue X Formationen in einer Aufstellung. |
| Reinheit | Baue X Formationen vom Typ [Typ] in einer Aufstellung. |
| Langbau | Baue eine Formation aus X Karten. |
| Vollbrett | Bringe X der 40 Positionen in mindestens eine Formation. |
| Farbtreue | Gewinne X Stiche derselben Farbe in Folge. |
| Aufmarsch | Bringe dein Deck X Kampfwert über das Gegnerdeck. |
| Quartier | Bedecke X Baufeld-Segmente vollständig mit Gebäuden einer Kategorie. |
| Säckel | Halte X Münzen, bis der Auftrag endet. |

**Sperrfeuer braucht eine genaue Erklärung** (Owner): ein Segment sind die festen Fünferblöcke der
Aufstellung, also die Positionen 1 bis 5, 6 bis 10 und so weiter bis 36 bis 40. Acht Stück je
Durchlauf, kein gleitendes Fenster. Ein Segment zählt nur, wenn alle fünf Stiche darin gewonnen sind.

### 4.2 Zwei harte Grenzen im Regelwerk

Beide sind aus dem Code gelesen, nicht geschätzt, und beide binden obere Stufen.

**Formationen enden an Segmentgrenzen.** `canExtendSeg` (`formations.js`) lässt einen Lauf nur dann
über eine Grenze wachsen, wenn sie offen ist. Geöffnet wird sie durch die Perk-Familie **E_SEGMENT**
(Stufe I und II öffnen die ersten ein bis zwei Grenzen, III und IV alle), durch das Pflanzen-**Spalier**
oder durch den Architekten-**Pfeiler**. Ohne eines davon ist eine Formation **höchstens fünf Karten
lang**. Langbau ab Stufe Selten ist damit faktisch eine E_SEGMENT-Aufgabe. Dazu kommt die Typgrenze:
Wiederholung schafft ohne Deckumbau höchstens 4 (vier Karten je Wert), Farbblock und Treppe höchstens
10, nur Wechsel läuft frei.

**Eine Farbe hat zehn Karten.** Mehr als zehn gleichfarbige Siege in Folge gehen nur mit
**Farballianz** (zwei Farben zählen als eine, dann bis 20) oder mit Pflanzen-Grün. Farbtreue auf Episch
ist damit gebunden.

### 4.3 Was die Messung zu diesen Werten sagt

Drei Stellen, an denen die Sim niedriger liegt als die Playtest-Werte. Zwei davon sind
Messartefakte, eine ist eine echte Decke.

**Sperrfeuer.** Der Median-Lauf schafft im besten Durchlauf des ersten Fensters 1 volles Segment, p90
sind 2. Der Greedy-Löser der Sim optimiert aber **Formationen**, nicht Segmentsiege, er versucht es
also nie. Feuer erreicht bei D30 im p90 acht volle Segmente. Die Messung misst hier einen Spieler, der
nicht danach spielt.

**Aufmarsch.** Gemessen liegt die Kampfwert-Differenz bei D15 im Median bei 3,5 (naiv) bis 11 (Blitz),
p90 bei 24. Die unterste Stufe ist 20. Vermutlich derselbe Grund: die Perk-Politik der Sim nimmt
Wert-Perks nicht gezielt. Aufmarsch ist damit auch auf Normal ein echter Auftrag.

**Säckel hat eine arithmetische Decke.** Das gemessene Gesamteinkommen bis D15 beträgt 64 bis 72
Münzen. Wer nichts ausgibt, hält am Ende von Fenster 1 rund 70. **Die Stufen 100 und 120 sind dort
unmöglich**, egal wie gut jemand spielt; sie funktionieren nur in Fenster 2 (Einkommen bis D30: 121 bis
151). Entweder bekommt Säckel niedrigere obere Stufen, oder es wird im ersten Fenster nur bis Selten
angeboten. **Offen.**

**Korrektur zu einer früheren Aussage in dieser Reihe:** die Obergrenze für Formationen je Aufstellung
ist **nicht** 21. Das war das Beste, was die Sim erreicht. Gemessen (Münz-Doku §2.5) gehen die Paare
aus Position mal Formation bis 145, was bei mittlerer Länge 3,3 rund **45 distinkte Formationen**
ergibt; der Münz-Deckel bindet ab 32 und trifft 1 % aller Durchläufe. Gedränge auf Episch sitzt damit
auf dem beobachteten Maximum.

### 4.4 Verworfene Aufgaben

| Aufgabe | Grund |
| --- | --- |
| **Übergewicht** (Gewinnquote) | dieselbe Sache wie Durchmarsch, nur anders verpackt. Zusätzlich im ersten Fenster eine reine Uhr: naiv 48,0 %, Feuer 47,8 %, Blitz 48,0 %, Pflanze 47,7 %. |
| **Dichte** (belegte Baufeldzellen) | zu einfach. Ohne Limitierung geht es nur darum, dem Architekten überhaupt etwas zu bauen. |
| **Genügsam** (Angebote ablehnen) | Ablehnen als Weg zum Gewinnen ist keine Mechanik, die das Spiel haben soll (Owner). |
| **Meisterschaft** (Skills auf hoher Stufe) | zu wenig Einfluss, zu nah am Glückswurf (Owner). Gegenmessung fürs Protokoll: bei D15 hält ein Lauf **0 Skills auf Selten oder höher** (p90: 1), bei D30 ebenso. Ohne Kaufen passiert dort nichts. |
| **Hochbau** (Gebäude auf Stufe 3) | gestrichen (Owner). |
| **Kaltstart** (die ersten zehn Stiche) | ging in Sperrfeuer auf. |

---

## 5. Was die Raritäten bedeuten

Die Stufe sagt nicht nur, wie groß eine Zahl ist, sondern wie weit sie reicht. Beim Lesen einer Karte
ist das die erste Information.

| Stufe | Bedeutung |
| --- | --- |
| Normal | Wirkt sofort oder für ein paar Phasen. Sie hilft im Moment und ist danach vorbei. |
| Selten | Dieselbe Sache, meist bis zum Laufende. Ab hier zahlt Beute nicht einmal, sondern jede Phase. |
| Sehr selten | Die dauerhafte Wirkung wird so groß, dass sich Bauen danach lohnt. |
| Episch | Höchste Stufe. Meist mit einem Zusatz, den keine Stufe darunter hat. |
| Legendär | Einzelstück ohne Stufe. Es hebt eine Regel des Laufs auf, statt eine Zahl zu heben. |

---

## 6. Der Beutekatalog

**56 einzigartige Belohnungen:** 13 Familien mit je vier Stufen (52) plus vier legendäre
Einzelstücke. Sechs Kategorien, keine doppelt.

Alle Werte sind vom Owner abgenommen (2026-09-14) und über die Sim tunebar.

### 6.1 Münze

Kaufkraft. Zum Vergleich: ein Lauf verdient heute gemessen 205 bis 260 Münzen.

**Zehrgeld** (`coins`, sofort)

| Stufe | Text |
| --- | --- |
| Normal | Du bekommst sofort 15 Münzen. |
| Selten | Du bekommst sofort 25 Münzen. |
| Sehr selten | Du bekommst sofort 50 Münzen. |
| Episch | Du bekommst sofort 100 Münzen. |

**Münzrecht** (Auszahlung am Durchlaufende)

| Stufe | Text |
| --- | --- |
| Normal | Jeder Durchlauf zahlt 1 Münze zusätzlich, die nächsten 15 lang. |
| Selten | Jeder Durchlauf zahlt 1 Münze zusätzlich, bis zum Laufende. |
| Sehr selten | Jeder Durchlauf zahlt 2 Münzen zusätzlich, bis zum Laufende. |
| Episch | Jeder Durchlauf zahlt 4 Münzen zusätzlich, bis zum Laufende. |

**Ablass** (Ablehnerträge: Skill 12, Perk 6)

| Stufe | Text |
| --- | --- |
| Normal | Ein abgelehnter Skill oder Perk zahlt anderthalbmal so viele Münzen. |
| Selten | Ein abgelehnter Skill oder Perk zahlt doppelt so viele Münzen. |
| Sehr selten | Ein abgelehnter Skill oder Perk zahlt zweieinhalbmal so viele Münzen. |
| Episch | Ein abgelehnter Skill oder Perk zahlt dreimal so viele Münzen. |

> Der Name grenzt die Familie auf das **Ablehnen** ein. Übrige Formations-Energie und die leere
> Bauphase zahlen weiter ihren normalen Satz.

### 6.2 Aufstellung

Eine Familie: wie oft du tauschen darfst. Die dünnste Kategorie im Katalog, siehe §10.

**Freizug** (`formationEnergyBase`, Basis 4)

| Stufe | Text |
| --- | --- |
| Normal | Jede Aufstellphase beginnt mit 1 Energie mehr, die nächsten fünf lang. |
| Selten | Jede Aufstellphase beginnt mit 1 Energie mehr, bis zum Laufende. |
| Sehr selten | Jede Aufstellphase beginnt mit 2 Energie mehr, bis zum Laufende. |
| Episch | Jede Aufstellphase beginnt mit 2 Energie mehr. Übrige Energie zahlt am Phasenende doppelt. |

> **Verworfen: Aufklärung** (die kommende Gegnerreihenfolge sehen). Technisch fast umsonst, weil
> `oppOrder` am Rundenende bereits im State liegt. Vom Owner gestrichen.

### 6.3 Baufeld

Fläche und Höhe.

**Baurecht** (`architect.maxCover`, Basis 24)

| Stufe | Text |
| --- | --- |
| Normal | Das Baufeld trägt 1 Zelle mehr, bis zum Laufende. |
| Selten | Das Baufeld trägt 2 Zellen mehr, bis zum Laufende. |
| Sehr selten | Das Baufeld trägt 3 Zellen mehr, bis zum Laufende. |
| Episch | Das Baufeld trägt 4 Zellen mehr, bis zum Laufende. |

**Aufstockung** (Gebäudestufen, Deckel bleibt 4)

| Stufe | Text |
| --- | --- |
| Normal | Ein gebautes Gebäude steigt sofort um eine Stufe. |
| Selten | Zwei gebaute Gebäude steigen sofort um eine Stufe. |
| Sehr selten | Drei gebaute Gebäude steigen sofort um eine Stufe. |
| Episch | Alle gebauten Gebäude steigen sofort um eine Stufe. |

> **Verworfen: Bauangebot** (mehr Baupläne zur Auswahl je Bauphase). Vom Owner gestrichen.

### 6.4 Skills

Lehrbrief hebt, was du hältst. Veredelung hebt, was angeboten wird. Freibrief öffnet, woraus du wählst.

**Lehrbrief** (Preisleiter 12, 25, 40)

| Stufe | Text |
| --- | --- |
| Normal | Ein gehaltener Skill steigt ohne Münzen um eine Stufe. |
| Selten | Zwei gehaltene Skills steigen ohne Münzen um eine Stufe. |
| Sehr selten | Drei gehaltene Skills steigen ohne Münzen um eine Stufe. |
| Episch | Jede Aufwertung kostet die Hälfte, bis zum Laufende. |

**Freibrief** (`skillDoors`, Fokus rufen 5)

| Stufe | Text |
| --- | --- |
| Normal | Die nächste Skill-Phase öffnet eine dritte Tür. |
| Selten | Fokus rufen kostet nichts mehr, bis zum Laufende. |
| Sehr selten | Jede Skill-Phase öffnet eine dritte Tür, bis zum Laufende. |
| Episch | Jede Skill-Phase öffnet eine dritte Tür, bis zum Laufende. Episch und Legendär erscheinen im Skill-Angebot häufiger. |

**Veredelung** (Stufe des ganzen Angebots)

| Stufe | Text |
| --- | --- |
| Normal | Im nächsten Skill-Angebot steht jeder Skill eine Stufe höher. |
| Selten | In den nächsten drei Skill-Angeboten steht jeder Skill eine Stufe höher. |
| Sehr selten | In jedem Skill-Angebot steigen Normal und Selten um eine Stufe. Sehr selten bleibt. |
| Episch | In jedem Skill-Angebot steigt jede Stufe unter Episch um eine. |

### 6.5 Perks

Wie viele zur Auswahl stehen, und wie gut sie sein dürfen.

**Auslage** (`perksOffered`, heute 3)

| Stufe | Text |
| --- | --- |
| Normal | Die nächste Perk-Auswahl zeigt vier Perks statt drei. |
| Selten | Jede Perk-Auswahl zeigt vier Perks statt drei. |
| Sehr selten | Jede Perk-Auswahl zeigt vier Perks statt drei, keiner davon Normal. |
| Episch | Jede Perk-Auswahl zeigt vier Perks statt drei, keiner davon Normal oder Selten. |

**Beschau** (`rareFloor`)

| Stufe | Text |
| --- | --- |
| Normal | Im nächsten Perk-Angebot fällt kein Perk unter Selten. |
| Selten | In jedem Perk-Angebot fällt kein Perk unter Selten. |
| Sehr selten | In jedem Perk-Angebot fällt kein Perk unter Sehr selten. |
| Episch | In jedem Perk-Angebot fällt kein Perk unter Sehr selten. Legendäre erscheinen häufiger. |

> **Verworfen: Zweitwahl** (zwei Perks statt einem). Vom Owner gestrichen.

### 6.6 Neuwurf

Vorrat und Preis. Die drei Freiwurf-Pools stehen heute auf 0 und warten als Naht
(`docs/muenz-oekonomie.md` §3.1).

**Freilos** (`rerollsSkill`, `rerollsPerk`, `rerollsArch`)

| Stufe | Text |
| --- | --- |
| Normal | Du bekommst zwei Neuwürfe ohne Münzen. |
| Selten | Jede Skill-Phase hat einen Neuwurf ohne Münzen. |
| Sehr selten | Jede Phase hat einen Neuwurf ohne Münzen, bei Skills, Perks und Gebäuden. |
| Episch | Jede Phase hat einen Neuwurf ohne Münzen. Auch der legendäre Neuwurf kostet nur den normalen Preis. |

**Nachlass** (Preistreppe 3, 6, 12. **Abgerundet, nie unter 1.**)

| Stufe | Text |
| --- | --- |
| Normal | Jeder Neuwurf kostet ein Viertel weniger. (2, 4, 9) |
| Selten | Jeder Neuwurf kostet die Hälfte. (1, 3, 6) |
| Sehr selten | Jeder Neuwurf kostet ein Viertel des Preises. (1, 1, 3) |
| Episch | Neuwürfe kosten nichts mehr, bei Skills, Perks und Gebäuden. |

> Aufgerundet hätte bei einem Viertel Nachlass den ersten Neuwurf unverändert gelassen (3 wird 2,25
> wird 3). Abgerundet ohne Mindestpreis wäre er bei drei Vierteln gratis. Deshalb abgerundet mit
> Mindestpreis 1.

> **Verworfen: Rückgriff** (das verworfene Angebot bleibt wählbar). Vom Owner gestrichen. Der Befund
> dahinter bleibt notiert: der Neuwurf **ersetzt** das Angebot heute vollständig, nur eine gerufene
> Tür überlebt (`REROLL_SKILL` in `reducer.js`).

### 6.7 Legendäre Einzelstücke

Ohne Stufe, wie die legendären Perks. Nur aus einer Gold-Ziehung.

| Name | Text |
| --- | --- |
| **Reliquiar** | Drei legendäre Perks stehen zur Wahl. |
| **Vollendung** | Ein gehaltener Skill deiner Wahl wird sofort episch. Alle anderen gehaltenen Skills steigen um eine Stufe. |
| **Stadtrecht** | Das Baufeld hat keinen Deckel mehr. Du baust, so weit die Fläche reicht. |
| **Stiftung** | Jede Phase beginnt mit 5 Münzen, bis zum Laufende. |

> **Verworfen: Zwilling** (die nächste Tür zeigt zwei Angebote, beide werden genommen) und
> **Doppelernte** (die nächste Aufgabe zieht zweimal). Beide vom Owner gestrichen.

---

## 7. Namen und Register

Beute heißt nach **Urkunden und Privilegien der Stadt**. Das ist die vierte freie Schublade neben
Elementen (Skills), Mechanik (Perks) und Bauwerken (Gebäude), und sie passt zum Gegenstand: fast jede
Belohnung handelt von Erlaubnis.

**Kollisionsprüfung (2026-09-14):** `grep -ro` über `src/` gegen alle 70 Skill-Namen, 41 Gebäude,
22 Perks, rund 75 Perk-Familien, Themes und Ränge sowie beide i18n-Kataloge. **Null Treffer.**
Zwei Fundstellen waren Fließtext, keine Namen: „Auslage" steckt in einem Kommentar zur
Medien-Auslagerung, „Refinement" in einem englischen Tutorialsatz.

Eine echte Kollision wurde dabei gefunden und beseitigt: **Schatzkammer ist bereits ein Gebäude**,
daraus wurde Reliquiar.

| Kategorie | Arbeitswort | Name | Englisch (Vorschlag) |
| --- | --- | --- | --- |
| Münze | Münzsack | **Zehrgeld** | Purse |
| | Rente | **Münzrecht** | Minting Right |
| | Ablehnerträge | **Ablass** | Indulgence |
| Aufstellung | Energie | **Freizug** | Leeway |
| Baufeld | Zellen | **Baurecht** | Building Rights |
| | Stufe | **Aufstockung** | Storey |
| Skills | Aufwertung | **Lehrbrief** | Indenture |
| | Tür | **Freibrief** | Free Pass |
| | Fund | **Veredelung** | Refinement |
| Perks | Breite | **Auslage** | Wares |
| | Güte | **Beschau** | Hallmark |
| Neuwurf | Freiwürfe | **Freilos** | Free Draw |
| | Rabatt | **Nachlass** | Rebate |
| Legendär | | **Reliquiar** | Reliquary |
| | | **Vollendung** | Culmination |
| | | **Stadtrecht** | City Charter |
| | | **Stiftung** | Endowment |

Das Englische ist ein erster Wurf und noch **nicht** an `docs/text-style-guide.md` abgeglichen.
Indenture und Hallmark sind die exakten zünftigen Gegenstücke, Leeway und Culmination die schwächsten
der Liste.

**Freilos** teilt den Wortstamm mit dem Gebäude **Losbude**. Keine Namensgleichheit, aber dieselbe
Assoziationsecke. Bewusst in Kauf genommen; Gnadenwurf steht als Alternative bereit.

---

## 8. Textregeln

Die Beutetexte folgen `docs/text-style-guide.md` §3, ohne Ausnahme:

- **Kein Gedankenstrich.** Geprüft: 0 im ganzen Katalog. Komposita und Halbgeviertstriche in
  Zahlenbereichen bleiben, wie der Guide es vorsieht.
- **Keine Pfeilnotation.** Geprüft: 0.
- **Ein Satzmuster je Familie, nur die Zahl skaliert.** Aufstockung: „Ein / Zwei / Drei / Alle
  gebaute(n) Gebäude steigen sofort um eine Stufe."
- **Bedingung vor Wirkung**, kurz und aktiv, ein bis zwei Sätze.
- **Kein Selbstbezug.** Keine Karte nennt ihren eigenen Namen.
- Kanonische Begriffe aus §1 des Guides: Durchlauf (nicht Runde), Stich, Lauf, Score, Serie, Position,
  Formation, Neuwurf, Rarität.

---

## 9. Wert-Anker

Was dieselbe Wirkung heute in Münzen kostet. Der Maßstab, an dem jede Stufe hängt.

| | Münzen |
| --- | --- |
| Skill-Aufwertung auf Selten / Sehr selten / Episch | 12 · 25 · 40 |
| Baufeld, 2 Zellen: erster / zweiter Kauf | 20 · 40 |
| Energie, 1 mehr in der laufenden Phase | 3 · 6 |
| Fokus rufen | 5 |
| Neuwurf, Treppe je Phase | 3 · 6 · 12 |
| Legendärer Neuwurf | 15 · 30 · 60 |
| Einkommen je Lauf (gemessen) | 205 bis 260 |
| Phasen jeder Sorte nach D15 / nach D30 | 8 bis 9 · 5 |

**Fenster 1 ist die wertvollere Beute.** Dieselbe Karte wirkt dort in 8 bis 9 Phasen jeder Sorte nach,
bei D30 nur in 5. Das ist keine Schieflage, sondern der Zweck.

---

## 10. Offene Punkte

1. **Auslage deckt Beschau zu.** Auslage III ist „vier Perks, keiner unter Selten", Beschau II ist
   „keiner unter Selten": dieselbe Wirkung plus eine Karte. Auslage IV schlägt Beschau III genauso.
   Beide hängen an `rareFloor`.
2. **Nachlass IV macht Freilos überflüssig.** Kostet der Neuwurf nichts mehr, ist ein Freiwurf-Vorrat
   wertlos. Und der legendäre Neuwurf verliert seinen einzigen Regler: laut
   `docs/muenz-oekonomie.md` §3.1 sind die Kosten das, was „würfeln bis das passende Legendäre kommt"
   begrenzt.
3. **Aufstellung hat nur noch eine Familie.** Zieht die Beute je Kategorie, ist Freizug viermal so
   häufig wie jede Münz-Familie. Zieht sie je Familie, kommt aus der Aufstellphase fast nie etwas.
   Der Ziehungs-Modus ist damit eine Entscheidung, die vorher nicht nötig war.
4. **Zwei Stufen brechen ihr Satzmuster.** Lehrbrief IV wechselt von „Skills steigen" zu
   „Aufwertungen kosten die Hälfte", Freibrief II von „dritte Tür" zu „Fokus rufen ist gratis".
   Gedeckt durch die Regel des Skill-Reworks („Episch hat ein kleines Extra"), aber gegen das
   Stufenmuster aus dem Style-Guide.
5. **Veredelung und Freibrief IV ziehen am selben Hebel.** Veredelung hebt die Stufe des
   Skill-Angebots garantiert, Freibrief IV erhöht die Chance auf Episch und Legendär. Wenn eine davon
   etwas anderes tun soll, dann Freibrief: dort ist die Auswahl das Thema, nicht die Güte.
6. **Archetyp oder Fraktion.** Der Style-Guide setzt **Archetyp** als kanonisch, die exp-Dokumente
   schreiben durchgehend „Fraktion". Im deutschen Katalog steht es 13 zu 8 für Archetyp. Zu
   entscheiden, bevor die Aufgabentexte geschrieben werden.

Dazu drei Punkte aus §3 und §4, die ebenfalls beim Owner liegen:

7. **Legendär-Satz auf der Stufe Episch.** Noch keine Zahl. Es ist die einzige Stelle, an der ein
   legendäres Stück in den Lauf kommt.
8. **Säckel im ersten Fenster.** Die Stufen 100 und 120 sind bis D15 arithmetisch unmöglich, weil das
   Gesamteinkommen dort 64 bis 72 Münzen beträgt (§4.3). Entweder niedrigere obere Stufen, oder Säckel
   wird in Fenster 1 nur bis Selten angeboten.
9. **Treppe und Wechsel bei Reinheit.** Die beiden Leitern (4·5·6·8 und 5·7·9·11) sind Vorschlag aus
   den gemessenen Typanteilen, nicht Owner-Entscheid.

**Erledigt:** „Wird die Stufe angekündigt" hat sich mit dem sichtbaren Angebot von selbst beantwortet.
Aufgabe, Stufe und Beute stehen alle drei am Angebot.

---

## 11. Nicht in diesem Umfang

| Thema | Status |
| --- | --- |
| **Bosse** | Ausgeklammert (Owner, 2026-09-12). Der Befund aus der Vorarbeit bleibt notiert: ein Boss ist kein Entscheidungs-Slot, sondern ein Durchlauf, und alle Hebel dafür existieren bereits (Gegnerwert-Aufschlag, gesperrte Positionen, Marker je Gegnerkarte, Front-Load-Reihenfolge). Ohne Niederlage im Spiel braucht er einen Einsatz. |
| **Score mit Par** | Später. Wenn der frühe Lauf **Anteil am Endscore** bekommen soll statt nur Gewicht im Lauf, ist Par der Hebel, nicht die Aufgabe. |
| **Befristete Beute** | Regler in der Hinterhand. Gemessen liegen 66 % des Endscores in den letzten zehn Durchläufen; dauerhafte Beute hebt den Schwanz mit. Wenn das Ende zu fett wird, läuft Beute aus Fenster 1 am Ende von Fenster 2 ab. |
| **Beute-Kompendium im Glossar** | Vorschlag. Man sieht nur 4 von 56 Stücken je Lauf; gesehene Stücke im Glossar zu sammeln macht den Katalog über Läufe hinweg lesbar. |

---

## 12. Nähte im Code

Jede Familie hängt an etwas, das auf `exp` bereits existiert. Keine Familie braucht eine neue
Engine-Primitive.

| Familie | Naht |
| --- | --- |
| Zehrgeld, Münzrecht, Ablass | `coins.js`: `coinGrant`, `coinsForFormations`, `FORFEIT_*` |
| Freizug | `formationEnergyBase` im Reducer, `unspentEnergyCoins` |
| Baurecht, Stadtrecht | `architect.maxCover` (Basis `MAX_COVER` 24) |
| Aufstockung | Gebäudestufen in `architect.js`, `MAX_TIER` 4 |
| Lehrbrief | `UPGRADE_PRICES` in `coins.js` |
| Freibrief | `state.skillDoors`, Fokus-Ruf |
| Veredelung | Stufenwurf des Skill-Angebots (`rollSkillOfferTiers`) |
| Auslage | `perksOffered` |
| Beschau | `rareFloor`, `perkLegendaryChance` |
| Freilos, Nachlass | `rerollsSkill` / `rerollsPerk` / `rerollsArch`, `buyReroll` |
| Reliquiar | Legendär-Pool in `perks.js` |
| Vollendung | `skillTiers` |
| Stiftung | Auszahlung am Phasenbeginn |
| Aufgaben-Gedächtnis | Profil in `storage.js`, additiv über `DEFAULT_PROFILE` |

Die Zähler der elf Aufgaben, alle aus vorhandenem State:

| Aufgabe | Zähler |
| --- | --- |
| Durchmarsch | Siege je Durchlauf aus dem `wins`-Verlauf |
| Sperrfeuer | Stichergebnisse je Fünferblock, `SEGMENT_SIZE` in `formations.js` |
| Strähne | `bestStreak` |
| Gedränge | `countBuiltFormations(state.formations)`, dieselbe Zahl, die die Münz-Einnahme zählt |
| Reinheit | dieselbe Funktion, gefiltert auf einen Typ aus `FORMATION_TYPES` |
| Langbau | Länge des längsten Laufs, `members.length` in `computeFormations` |
| Vollbrett | Positionen mit mindestens einem Eintrag in `formations` |
| Farbtreue | `suitStreak` in der Engine, respektiert Farballianz und Pflanzen-Grün |
| Aufmarsch | Summe über `deck[].value` minus Summe über `oppDeck[].value` |
| Quartier | `occupiedCells` je Zeile plus `familyDef(b.familyId).category`, wie `summarizeArchitect` es tut |
| Säckel | `state.coins` am Fensterende |

**Bauaufwand, geschätzt:** elf der dreizehn Familien sind Zahlen auf vorhandenen Pfaden. Jede braucht
ein Feld im Lauf-State, eine Lesestelle, Text in zwei Sprachen und einen Test.
