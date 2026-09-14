# Zwischenaufgaben (exp) — Planungsdokument

**Status: lebendes Dokument.** Der Beutekatalog ist durchdesignt und vom Owner Wert für Wert
abgenommen (2026-09-14). Der Aufgaben-Pool ist eine Skizze und der nächste Arbeitsschritt.

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

Zwei Aufgaben je Lauf. Die erste läuft über die Durchläufe 1 bis 15, die zweite über 16 bis 30. Jede
wird zufällig zugewiesen, zeigt ihren Fortschritt laufend an und schüttet beim Erfüllen Beute aus.

**Gesetzt (Owner, 2026-09-14):**

- Zwei Fenster: **D1 bis D15** und **D16 bis D30**.
- Die Aufgabe wird **zufällig zugewiesen**, nicht gewählt.
- Die Belohnung ist **bis zur Erfüllung verdeckt**. Kein Neuwurf auf die Beute.
- Beute **wirkt weiter und zahlt nie in Score**.
- Beute kommt in **Raritäten**, die Ziehung zeigt **zwei Karten mit gemischten Stufen**.
- **Legendäre Beute ist schon bei D15 möglich.**
- Aufgaben müssen **Arbeit kosten**. Eine Bedingung, die nebenbei abläuft, ist keine Aufgabe.
- **Keine Kategorie doppelt** im Katalog.

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

| Zähler | Spanne zwischen den Bauweisen | taugt als zugewiesene Aufgabe |
| --- | --- | --- |
| Siege | 19 gegen 19 | ja, völlig neutral, aber es ist eine **Uhr** |
| Serie | 8 gegen 9 | ja |
| Formationen | 15 gegen 15 in Fenster 1, 17 gegen 21 in Fenster 2 (Pflanze vorn) | ja, mit leichter Schlagseite |
| Crits | **2 (Feuer) gegen 52 (Blitz)** | nein, nur mit Eignungsfilter |

Eine Aufgabe auf Siegen ändert nichts am Spiel, sie tickt ab. Eine Aufgabe auf Formationen bewegt sich
um Faktor 1,7 zwischen naivem und überlegtem Aufstellen. Eine Aufgabe auf Crits ist mit Blitz eine
Formalität und mit Feuer unmöglich.

---

## 3. Die Aufgabe

### 3.1 Zuweisung mit Eignungsfilter

**Gesetzt:** zugewiesen, nicht gewählt.
**Vorschlag:** der Zufall zieht aus einem **gefilterten** Topf. Jede Aufgabe trägt eine Eignung, die
der State beantwortet (hält mindestens einen Blitz-Skill, Architekt aktiv, und so weiter). Aufgabe 1
wird **nach der ersten Skill-Wahl** zugewiesen, Aufgabe 2 bei **D16** mit vier bis fünf gehaltenen
Skills. Beide Male weiß die Ziehung genug über den Bau.

Ohne diesen Filter ist „zugewiesen" unfair, siehe §2.3.

### 3.2 Marken statt bestanden

Ein Zähler, drei Marken: **Bronze, Silber, Gold**. Kein Scheitern, nur Höhe. Das passt zu einem Spiel,
das keine Niederlage kennt.

**Vorschlag für die Kalibrierung**, damit keine Zahl erfunden ist:

- Bronze auf **p75** des Normalspiels: man muss hinsehen.
- Silber auf **p90**: man muss den Bau anpassen.
- Gold **darüber**: man muss dafür bauen.

Auf die Messung aus §2.2 angewandt, für Fenster 1:

| Aufgabe | Bronze | Silber | Gold |
| --- | --- | --- | --- |
| Siege in einem Durchlauf | 22 | 24 | 26 |
| Durchläufe mit mindestens 16 Formationen | 8 von 15 | 11 | 13 |
| beste Serie | 10 | 12 | 14 |

**Einschränkung, die mitgeschrieben gehört:** der Greedy-Löser der Sim ist die Obergrenze menschlichen
Aufstellens, der Zufallsspieler die Untergrenze (128 gegen 223 Formationen im Fenster). Ein Mensch
liegt dazwischen. Die Marken sind damit eingeklammert, nicht gesetzt.

### 3.3 Gegen Wiederholung

**Vorschlag**, drei Regeln, alle billig:

1. **Parametrisierte Aufgaben statt einer langen Liste.** Dasselbe Muster wie `WEEK_MODS`
   (`range: [min,max]`, `desc(mag)`): 16 Definitionen mit zwei bis vier gewürfelten Parametern ergeben
   40 bis 60 unterscheidbare Aufträge.
2. **Fenster 2 zieht nie dieselbe Achse wie Fenster 1.**
3. **Die letzten vier Aufgaben sind gesperrt.** Ein Feld im Profil, additiv über `DEFAULT_PROFILE`,
   kein Schema-Sprung nötig.

### 3.4 Der Pool: nächster Arbeitsschritt

Noch **nicht designt**. Die Skizze steht, sieben Achsen mit je zwei bis drei Grundformen:

| Achse | Grundformen | zieht gegen |
| --- | --- | --- |
| Aufstellung | Gedränge (N Durchläufe mit mindestens X Formationen), Reinheit (ein Typ stellt die Hälfte) | den Greedy-Mix |
| Serie | Lauf (Serie von N), Farbtreue (N gleichfarbige Siege in Folge) | verteilte Stärken |
| Stichbilanz | Übermacht (N Siege in einem Durchlauf), Kaltstart (die ersten 10 Stiche), Schlussspurt (die letzten 10) | die Formationsqualität, hohe Karten müssen nach vorn |
| Verzicht | Genügsam (N Angebote ablehnen), Sparsam (mit mindestens N Münzen abschließen) | die Baustärke |
| Bau | Richtfest (zwei Gebäude auf Stufe 3), Dichte (N Zellen belegt) | die Breite |
| Karten | Kleine Helden (N Siege mit Wert bis 4), Monochrom (N Siege einer Farbe) | die natürliche Auswahl |
| Fraktion (nur mit Eignung) | Blitz: Stapel. Feuer: Hitze halten. Eis und Pflanze offen bis zum Rework | fraktionsintern |

**Kaltstart** ist der interessanteste Kandidat: die Spielerreihenfolge ist persistent, der Gegner wird
jeden Durchlauf neu gemischt. Die ersten zehn Stiche zu gewinnen heißt, die hohen Karten nach vorn zu
ziehen und dafür die Formationen hinten zu zerreißen.

---

## 4. Die Ziehung

**Gesetzt:** zwei Karten, gemischte Stufen, kein Neuwurf.
**Vorschlag:** die Marke bestimmt den Shift im vorhandenen Raster `tierWeightsForShift` (`rarity.js`).
Keine neue Mechanik.

| Ergebnis | Karten | Shift | Normal · Selten · Sehr selten · Episch | Garantie |
| --- | --- | --- | --- | --- |
| unter Bronze | 1, keine Wahl | 0 | 60 · 25 · 12 · 3 | keine |
| Bronze | 2 | 1 | 52 · 25 · 16 · 7 | keine |
| Silber | 2 | 2 | 40 · 23 · 25 · 12 | eine Karte mindestens Selten |
| Gold | 2 | 4 | 22 · 18 · 32 · 28 | eine Karte Episch, dazu Chance auf Legendär (Satz offen) |

Zwei Filter sind bei zwei Karten **Pflicht**, nicht Kür:

- **Nie zweimal dieselbe Familie** in einer Ziehung.
- **Keine tote Karte.** Gezogen wird nur, was dieser Lauf nutzen kann. Bei zwei Karten ist eine Niete
  die halbe Beute.

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

Dazu zwei Punkte aus §3 und §4, die ebenfalls beim Owner liegen:

7. **Wird die Stufe angekündigt?** Ist der Inhalt verdeckt und die Stufe auch, kann niemand
   entscheiden, ob der Umweg auf Gold lohnt, und die Aufgabe wird ein Los. Vorschlag: Inhalt verdeckt,
   Stufe sichtbar („Gold: 2 Karten, eine episch").
8. **Legendär-Satz bei Gold.** Noch keine Zahl.

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
| Ziehung | `tierWeightsForShift` in `rarity.js` |
| Aufgaben-Gedächtnis | Profil in `storage.js`, additiv über `DEFAULT_PROFILE` |

**Bauaufwand, geschätzt:** elf der dreizehn Familien sind Zahlen auf vorhandenen Pfaden. Jede braucht
ein Feld im Lauf-State, eine Lesestelle, Text in zwei Sprachen und einen Test.
