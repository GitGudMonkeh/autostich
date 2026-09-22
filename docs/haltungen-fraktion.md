# Haltungen — Fraktion 5 (Arbeitsdokument)

> **Status: lebendes Dokument, Designphase.** Der Mechanismus und die vier Passive sind vom Owner
> gesetzt, zwei der fünf Linien sind besetzt. **Keine Zahlen sind tariert, nichts ist gemessen** —
> alle Werte hier sind Startwerte oder Kopfrechnung und stehen so lange zur Disposition, bis Sim und
> Playtest etwas dazu sagen.
>
> Stand: 2026-09-22 · Basis: `origin/exp` · Vorgänger: `docs/fraktion-5-brainstorm.md` (die sechs
> Richtungen und die Landkarte des freien Designraums; diese Fraktion ist keine davon, sondern ein
> Vorschlag des Owners).
>
> **Gesetzt** = Owner-Entscheidung. **Vorschlag** = Diskussionsstand. **Offen** = noch niemand.
>
> Sprache Deutsch, wie `skill-rework.md`, `stein-fraktion.md` und `muenz-oekonomie.md` — Fraktions-,
> Haltungs- und Skillnamen sind Produktsprache und der Owner schreibt hier mit. Bewusste Abweichung
> von der Engineering-Sprache in `AGENTS.md`, nur für dieses Dokument.

---

## 1 · Die Idee

Vier **Haltungen**, eine je Farbe. Es ist immer mindestens eine aktiv, ihr Passiv wirkt auf jeden
Stich. Welche aktiv ist, entscheidet nicht der Spieler direkt — sondern die Farbe, mit der er gerade
gewinnt.

> **Die Aufstellung wird damit zur Partitur.** Wo die Farben liegen, entscheidet, in welcher
> Reihenfolge die Haltungen zünden und wie dicht sie aufeinanderfolgen. Der Spieler komponiert eine
> Abfolge und sieht dann zu, wie sie abläuft.

Das ist die zweite Dimension auf derselben Entscheidung, die das Spiel ohnehin trägt (`docs/pitch.md`:
*wer neben wem steht*) — nicht eine fünfte Leiste neben vier bestehenden.

---

## 2 · Der Mechanismus — **gesetzt**

- Ein Anzeigepanel zählt je Farbe die **gewonnenen Stiche** dieser Farbe. Alle vier Zähler laufen
  **parallel**.
- Bei **5 gewonnenen Stichen** einer Farbe wird auf deren Haltung gewechselt. Die fünf müssen **nicht
  aufeinanderfolgend** sein.
- **Nur die auslösende Farbe setzt ihren Zähler zurück.** Die anderen drei zählen weiter — eine Farbe
  kann also bei 4 stehen, während eine andere gerade auslöst, und im Stich darauf direkt nachziehen.
- Eine Haltung ist ab dem Auslösen **mindestens 3 Stiche** aktiv (Stiche, nicht Siege) und darüber
  hinaus so lange, bis eine andere sie ablöst.
- Eine Haltung wirkt **immer auf voller Stärke**, auch im Nachklang. Es gibt keine Abschwächung.
- Damit gilt: **Überlappung entsteht genau dann, wenn zwei Wechsel innerhalb von 3 Stichen fallen.**
- Wechsel passieren **mitten im Durchlauf**, nicht an einer Grenze.
- Das Brett **darf mitten im Durchlauf neu gelesen und gerechnet werden**, wo aktuelle Werte das
  nötig machen.

**Der Mechanismus in einem Satz, für Spielertext später:**

> Eine Haltung wird bei fünf gewonnenen Stichen ihrer Farbe aktiv, bleibt aktiv bis eine andere sie
> ablöst, mindestens aber drei Stiche lang — immer auf voller Stärke.

### 2.1 · Blöcke gegen bunt — die Build-Achse

Sie fällt aus dem Mechanismus heraus, ohne dass eine Regel sie ansagen muss:

| Aufstellung | Zähler | Wechsel | Ergebnis |
| --- | --- | --- | --- |
| **Farbblöcke** | steigen nacheinander | weit auseinander | eine Haltung, lang. Campen. |
| **Bunt gemischt** | steigen gemeinsam | bündeln sich | mehrere Haltungen gleichzeitig. Tanzen. |

Und es bepreist sich selbst: **bunt bauen heißt, auf den Farbblock als Formation zu verzichten.**
Stapel gegen Multiplikator, ohne Sonderregel.

**Offen (bewusst):** wie viele Haltungen gleichzeitig klingen dürfen. Der Mechanismus erlaubt bis zu
vier; ob es dabei bleibt oder auf Paare gedeckelt wird, ist eine Balancing-Frage und wird nicht vorab
entschieden (Owner).

---

## 3 · Die vier Haltungen — **gesetzt**

Jede beugt **eine Regel**, die es schon gibt, statt eine Zahl zu addieren. Keine doppelt eine andere,
und zusammen decken sie die Score-Pipeline ab.

| Haltung | Greift an | Was sie tut |
| --- | --- | --- |
| **Überlappung** | die Formations-Geometrie | Die Überlappung färbt ab: die Nachbarkarte erbt eine Stufe. |
| **Crit** | die Spitze | Durchgehend 50 % Crit-Chance, solange sie klingt. |
| **Ergebnis** | den Ausgang des Stichs | Niederlage → Gleichstand, Gleichstand → Sieg. |
| **Score** | den Basis-Score | Glatter Multiplikator. |

**Offen:** welche Farbe welche Haltung trägt.

**Was dabei zu wissen ist:**

- **Der Basis-Crit im Spiel ist 0.** Crit kommt sonst nur aus den Präzision-Perks und aus Blitz, in
  kleinen Schritten. 50 Punkte auf einen Schlag sind für ein Deck ohne Blitz also *die* Crit-Quelle —
  diese Haltung ist im Mono-Build mit Abstand das stärkste der vier Passive.
- Sie landet auf Blitz' Achse, **verpufft dort aber nicht**: die Systemregel wandelt jeden Punkt
  Crit-Chance über 100 % in +0,01× Crit-Multiplikator. Ein Blitz-Deck bekommt aus den 50 Punkten also
  Multiplikator statt Chance.
- **Das Überlappungs-Passiv tut auf einer formationslosen Karte nichts.** Der Bonus beginnt erst bei
  zwei Formationen (`2 → ×1,5 · 3 → ×2 · 4 → ×3`); eine Karte von 0 auf 1 gehoben bleibt bei ×1 und
  hat auch keinen eigenen Formationsfaktor.
- **Ergebnis** ist als einzige gegen jede Haltungslänge robust: sie wirkt pro Stich und braucht keine
  Dauer. Das war der Prüfstein, an dem das alte Crit-Passiv gescheitert ist (§7).

---

## 4 · Die Linien — **gesetzt** (Schnitt A)

Eine Linie je Haltung, dazu eine für die Rotation, die über alle wirkt: **4 × 3 + 3 = 15.**

Welche Linie man sammelt, *ist* die Farbidentität des Builds. Eine Linie tief = campen, gestreut =
tanzen.

| Linie | Stand |
| --- | --- |
| **Score** | Stauung · Zinsen · Mitklang — **voll** |
| **Crit** | Grundrauschen · Übertrag · Schwungrad — **voll** |
| **Rotation** | Anklang · Runde · *(dritter Platz geparkt, bis die Haltungen stehen)* |
| **Überlappung** | offen |
| **Ergebnis** | offen |

Dazu kommen **3 Legendäre** (Format der Bestandsfraktionen) — noch nicht angefasst.

### 4.1 · Das Leerlauf-Risiko der Haltungslinien

Ein Haltungs-Skill liegt still, solange seine Haltung nicht klingt. Bei vier Haltungen ist das
strukturell die meiste Zeit — dieselbe Form, an der Eis krankt (`skill-rework.md` §8.3: Eis kostet
den Partner die Hälfte, weil der Spieler es fallen lässt).

**Gegenmittel im Entwurf:** jede Linie trägt mindestens einen Skill, der **außerhalb** seiner eigenen
Haltung wirkt — in der Crit-Linie ist das *Grundrauschen*.

---

## 5 · Die Skills, Stand

Kennwerte sind durchweg **offen**. Hier steht nur, was der Skill tut.

### 5.1 · Score-Linie — voll

Passiv: glatter Multiplikator auf den Basis-Score.

| Skill | Wirkung |
| --- | --- |
| **Stauung** | Solange sie klingt, zahlen Siege nicht, sondern sammeln an; endet die Haltung, entlädt sich der Stau mit Zuschlag. |
| **Zinsen** | Je Stich, den die Haltung schon läuft, steigt der Multiplikator. Campen zahlt. |
| **Mitklang** | Der Multiplikator zählt je gleichzeitig klingender Haltung. Tanzen zahlt. |

**Die Linie hat ihre Spannung in sich:** das Passiv belohnt, *drin* zu sein, Stauung belohnt, dass es
*endet*. Und Zinsen/Mitklang sind ein Spiegelpaar — im Block-Build wächst Zinsen und Mitklang steht
auf ×1, im bunten Build umgekehrt. Dieselbe Linie bedient beide Spielstile.

**Warnung:** in einem harten Block-Build kann eine Haltung sehr lang laufen, potenziell einen ganzen
Durchlauf. Zinsen als Rampe je Stich hätte dann 30+ Schritte. Das ist die Stelle, an der diese Linie
wegläuft, falls sie wegläuft.

### 5.2 · Crit-Linie — voll

Passiv: durchgehend 50 % Crit-Chance, solange sie klingt.

| Skill | Wirkung |
| --- | --- |
| **Grundrauschen** | Ein Teil der Chance gilt auch außerhalb der Haltung. Der Anti-Leerlauf-Skill der Linie. |
| **Übertrag** | Ein Crit springt auf den nächsten Stich über — der wird ebenfalls ein Crit, auch wenn er von sich aus ein normaler Sieg gewesen wäre. |
| **Schwungrad** | Jeder Crit verlängert die laufende Haltung um einen Stich. |

**Regel, die Übertrag braucht:** der übergesprungene Crit darf **nicht seinerseits überspringen** —
sonst crittet man ab dem ersten Crit bis zum Ende der Haltung durch, ohne Abbruch.

**Warnung zu Schwungrad** (§6.4).

### 5.3 · Rotation-Linie — zwei von drei

Wirkt über alle Haltungen. Trägt vermutlich auch den Kernskill, weil das Raster in `skill-rework.md`
§1 verlangt, dass der erste Skill einer Fraktion sie allein zum Laufen bringt.

| Skill | Wirkung |
| --- | --- |
| **Anklang** | Die vorige Haltung klingt länger nach. |
| **Runde** | Hast du alle vier Haltungen einmal getragen, wirft die vollendete Runde etwas ab. |
| *(offen)* | Geparkt, bis die Haltungen stehen. Kandidaten aus der Diskussion: *Beschleunigung* (jeder Wechsel senkt die Schwelle für den nächsten) und *Trägheit* (je länger eine Haltung hält, desto stärker) — die beiden Motoren für Tanzen und Campen. |

**Warnung:** eine Linie, die immer wirkt, wird auch immer genommen. Bei zwei Türen à drei Skills
könnte Rotation die vier Haltungslinien systematisch verdrängen. Beim Bau des Angebots mitdenken.

### 5.4 · Überlappungs-Linie — offen

Passiv: die Überlappung färbt ab, die Nachbarkarte erbt eine Stufe.

Kandidaten aus der Diskussion, Namen auf Kollision geprüft:

| Kandidat | Wirkung |
| --- | --- |
| **Gefüge** | Eine Karte ohne Formation zählt als eine. Hebt die Reichweite des Passivs von „dichte Stellen" auf das ganze Brett. |
| **Doppelbindung** | Eine Karte darf in zwei Formationen desselben Typs liegen. Der einzige Weg über die ×3-Decke, weil es sonst nur vier Typen gibt. |
| **Weiterreichen** | Das Abfärben läuft eine Karte weiter statt nur zum direkten Nachbarn. |
| **Verkettung** | Eine Karte, die von beiden Seiten erbt, zählt beide Stufen. |
| **Übergriff** | Das Abfärben springt über die Segmentgrenze. |
| **Verankerung** | Beim Auslösen der Haltung erbt jede Karte des aktuellen Segments einmal. Zündet auch in einer Haltung, die nur einen Stich lebt. |

**Nachbarschaft zu Pflanze, zu beachten:** **Verwachsung** (SK_PLANT_14) hebt den Überlappungs-*Wert*,
**Wurzelgeflecht** (Legendär) hebt die *Anzahl*, **Spalier** (SK_PLANT_03) öffnet Segmentgrenzen. Wer
hier baut, sollte einen dritten Griff nehmen.

### 5.5 · Ergebnis-Linie — offen

Passiv: Niederlage → Gleichstand, Gleichstand → Sieg. Noch keine Kandidaten.

---

## 6 · Was gerechnet ist

**Alles in diesem Abschnitt ist Kopfrechnung aus der Deckstruktur, nicht gemessen.** Die einzige
gemessene Zahl ist als solche markiert.

### 6.1 · Ein Farbblock liefert 4,5 Siege

Eine Karte mit Wert *v* schlägt eine zufällige Gegnerkarte mit Wahrscheinlichkeit *(v−1)/10* (das
Gegnerdeck hat vier Karten je Wert 1–10). Ein Farbblock sind die Werte 1 bis 10 einer Farbe, also im
Schnitt **4,5 Siege je Durchgang**.

**Die Schwelle von 5 liegt damit knapp über dem, was ein Farbblock roh liefert.** Folge:

- **Roh, zu Lauf-Beginn:** ein Block reicht *fast*. Der fünfte Sieg fällt erst im zweiten Durchgang —
  grob ein Wechsel je Durchlauf, eher seltener.
- **Mit hochgezogener Farbe** (Farbverstärkung, Farbduell, Spitzenförderung): der Block liefert 6, 7,
  8 Siege, der Wechsel passiert mitten im Block, die Kadenz fällt Richtung 6–7 Stiche.

*Gemessen* (`skill-rework.md` §8, nicht von uns): die Siegquote läuft über einen Lauf von 45 % roh auf
55–77 % je nach Build. **Die Rotation beschleunigt sich also von selbst über den Lauf.**

Nebeneffekt, der bleibt: **eine Farbe hochzuziehen ist ein Tempo-Hebel.** Farbverstärkung und
Farbduell werden zu Rotations-Werkzeugen, ohne dass die Fraktion dafür einen Skill ausgibt. Der Owner
lässt das bewusst so und tariert nach Sim.

### 6.2 · Der Vierer und sein Zünder

Alle vier gleichzeitig aktiv heißt: **vier Wechsel in vier aufeinanderfolgenden Stichen.** Dafür
müssen alle vier Zähler auf 4 stehen und dann vier Siege in Folge fallen, je einer pro Farbe.

Und es gibt einen sauberen Schlüssel: **ab Kartenwert 11 gewinnt eine Karte immer** (Gegner-Maximum
ist 10, `VALUE_CAP` ist bewusst `null`). Vier Karten über 10, eine je Farbe, nebeneinander gelegt,
sind ein **garantierter Zünder**.

### 6.3 · Übertrag hebt die Critrate auf ⅔

Ohne Kette: nach einem Crit ist der nächste sicher, nach einem übergesprungenen würfelt man wieder.
Im stationären Zustand crittet damit **zwei von drei Stichen** statt einem von zwei.

### 6.4 · Schwungrad — wo es bricht

Schwungrad verlängert die Haltung je Crit um einen Stich, die Zeit läuft aber weiter. Die Haltung
hält, solange sie schneller verlängert wird, als sie abläuft. Im Erwartungswert:

> **Haltungsdauer ≈ 3 / (1 − Critrate)**

| Critrate | Dauer |
| --- | --- |
| 50 % (Passiv allein) | 6 Stiche |
| ⅔ (mit Übertrag) | 9 Stiche |
| 90 % (mit Blitz/Präzision) | 30 Stiche |
| 100 % | **sie endet nie** |

Das ist keine theoretische Ecke — die Crit-Chance kann 100 % erreichen, die Systemregel für den
Überschuss existiert genau deswegen. Ein Deckel auf die Verlängerung oder ein Verfall würde es
auffangen; das ist Tarieren und steht hier nur, damit es beim Sim-Lauf nicht überrascht.

### 6.5 · Der Stapel

Überlappung, Crit und Score multiplizieren **denselben Stich**: das Abfärben hebt den
Formations-Multiplikator, der Score-Multiplikator liegt darauf, und der Crit multipliziert den
fertigen Stapel. Drei Faktoren hintereinander auf derselben Karte.

Die Blitz-Notizen haben für diese Form einen Namen und eine Narbe (`skill-rework.md` §7.46,
„kubischer Weglauf" — dort waren es zwei Achsen an derselben Ressource). **Ergebnis** ist der
Ausreißer und deshalb wertvoll: sie multipliziert nicht, sie wandelt, und läuft nie weg.

---

## 7 · Verworfen — und warum

| Verworfen | Grund |
| --- | --- |
| **Haltung „Segment"** (die Segmentgrenze dehnt sich, Formationsläufe reichen weiter) | Zu nah an der Überlappungs-Haltung; beide hätten an derselben Geometrie gezogen. Ersetzt durch **Score**. Kosten: es war das einzige Passiv, das ändert, *welche* Formationen überhaupt existieren. |
| **Crit-Passiv „jeder N-te Sieg ist garantiert ein Crit"** | Eine Mindest-Haltung von 3 Stichen trägt bei ~60 % Siegquote rund 1,8 Siege. Ein Takt von 3 zündet darin **nie** — der Skill wäre im Tanz-Build wertlos und im Block-Build stark gewesen. Ersetzt durch die durchgehende Chance, die glatt mit der Dauer skaliert. |
| **Pechbremse** (ein Sieg ohne Crit hebt die Chance für den nächsten) | Stirbt am eigenen Erfolg: wer auf Crit baut, verfehlt nie, also greift sie nie. Gehört zur Sorte „immer genommen, nie gespürt" (`skill-rework.md` §8.5). |
| **Metronom · Takt · Zielschuss** | Hingen alle am gestrichenen Takt-Passiv. |
| **„Aufteilung"** | Name belegt (Glossar: „Aufteilung deines Scores auf Formationen / Crits / Übrige"), und mechanisch war der Skill identisch zu Mitklang, nur auf der Crit-Achse. |
| **Linien-Schnitt B** (Tanzen · Campen · Steuern · Ertrag) | Die vier Haltungen hätten keine Heimat gehabt. |
| **Linien-Schnitt C** (Partitur · Takt · Ausklang · Haltungen · Ertrag) | Am leichtesten zu tarieren, aber liest sich wie eine Bauteilliste. |
| **Feste Kreis-Reihenfolge** (Haltungen klingen nur mit ihren Nachbarn zusammen) | Der Owner bestimmt den Kreis über die Farbblöcke in der Aufstellung — eine vom Design gesetzte Reihenfolge nähme ihm genau das. |

Die sechs Richtungen aus `docs/fraktion-5-brainstorm.md` (Waage · Strömung · Stein · Prisma · Echo ·
Opfer) sind damit **nicht** erledigt — diese Fraktion ist ein eigener Vorschlag des Owners, keine
davon. Der Brainstorm bleibt als Landkarte gültig.

---

## 8 · Offene Punkte

1. **Die Überlappungs-Linie** — drei aus sechs Kandidaten (§5.4).
2. **Die Ergebnis-Linie** — noch keine Kandidaten.
3. **Der dritte Rotations-Skill** — geparkt, bis die Haltungen stehen.
4. **Die Farbzuordnung** — welche Farbe trägt welche Haltung. Dabei zu bedenken: Pflanze färbt Karten
   dauerhaft grün, Grün campt also von selbst. Der Owner hat die Kombination Grün + Pflanze
   ausdrücklich als **Camping-Ehe** akzeptiert, nicht als Unfall.
5. **Bekommt Campen etwas Eigenes?** Zinsen zahlt dafür, aber als Linie, nicht als Fundament.
6. **Womit startet der Lauf** — welche Haltung ist zu Beginn aktiv, und wird sie gewürfelt oder
   gewählt? Hängt mit dem geparkten „Fokus am Start" aus `skill-rework.md` §1 zusammen.
7. **Hat die Fraktion einen eigenen Ertrag?** Feuer hat `fireBase`, Pflanze `plantBase`, Blitz
   `lightYield`, Eis `glacierYield` — jede Fraktion trägt einen eigenen Score-Kanal. Diese hier
   beugt nur Regeln. Ob das ein Mangel ist oder die Pointe, ist offen.
8. **Paare oder Drei** — wie viele Haltungen gleichzeitig klingen dürfen. Bewusst offen bis Skills
   und Balancing stehen.
9. **Name und Thema.** Vier Fraktionen sind Elemente, diese wäre ein Konzept. Die Genre-Recherche im
   Repo nennt das Elementar-Skin „das generischste im Feld", der Bruch wäre also möglicherweise ein
   Gewinn. Kandidat, der das Element *und* die Farbe trägt: **Licht / Prisma**. Owner: wird
   nachgelagert entschieden.
10. **Drei Legendäre.**
11. **Alle Zahlen.**

### 8.1 · Vokabel-Kollisionen (geprüft)

Belegt und damit gesperrt: **Nachhall** (Formations-Meta-Faktor F6, `afterglowFactor`) ·
**Gleichklang** (Perk-Familie `D_PRECISION`) · **Aufteilung** (Glossar) · **Doppelschlag**
(`skill-rework.md`, der Begriff für Doppelentladungs Wirkung) · **Sättigung · Brücke · Flut ·
Rückkopplung · Aufstockung · Ausbreitung · Geflecht · Bindung · Ansteckung · Verteilung ·
Nachbarschaft · Nachschlag · Ausschlag · Zugabe · Echo · Weitergabe · Fortsetzung · Nachspiel ·
Einschlag · Zündschnur · Impuls**.

Geprüft frei und noch unbenutzt: **Verankerung · Doppelbindung · Gefüge · Verkettung · Übergriff ·
Zwillinge · Weiterreichen · Übertrag · Mitriss · Schlagfolge · Zweitschlag · Übersprung · Ausbeute ·
Taktgeber · Schlagzahl · Anschub · Verlängerung · Nachdruck · Vortrieb · Brennweite · Ausstrahlung ·
Teilhabe · Mitwirkung · Beteiligung · Streuwirkung**.

Für die ausklingende Haltung braucht es ein eigenes Wort, weil *Nachhall* vergeben ist — Kandidaten:
**Anklang** (bereits als Skillname verwendet), **Widerhall**, **Schweif**, **Färbung**.

---

## 9 · Nähte im Code (Vorab-Inventar, noch nichts angefasst)

Der Entwurf ist deutlich billiger als die anderen Fraktions-Ideen, weil fast jede Linse schon eine
Naht hat:

| Braucht | Liegt schon da |
| --- | --- |
| Farb-Match, grün- und allianz-bewusst | `src/game/color.js` — `effColor` / `colorMatches` / `colorsAllied`; die Farballianz lässt zwei Farben als eine zählen |
| Farbe des Siegs je Stich | `engine.js` — `winSuit` / `winSuitStreak`, bereits auf der *effektiven* Farbe |
| Gleichstand als Sieg | `engine.js` — `tieArmed` und der Tie-Zweig |
| Garantierter Crit | `engine.js` — `forceCrit` (heute vom Henker-Perk gesetzt) |
| Serie halten | `engine.js` — `streakNoReset` |
| Überlappungs-Stufen | `formations.js` — `OVERLAP_BONUS` |

**Der eine echte Eingriff:** `computeFormations` läuft heute **einmal je Durchlauf** (`pos === 0`) und
hält dann. Überlappungs-Abfärben und alles, was die Geometrie mitten im Durchlauf ändert, verlangt ein
Neurechnen bei jedem Haltungswechsel. Der Owner hat das ausdrücklich freigegeben.

Dazu wie bei jeder neuen Fraktion: `reducer.js` (`activeArchetypes`), `progression.js`
(`deckUnlock`-Knoten — **Achtung, Migrationsfalle:** `RANKED_ARCHETYPES` leitet sich daraus ab und
verlangt je Fraktion einen beendeten Lauf, ein neuer Knoten entzieht bestehenden Spielern also den
Ranglisten-Zugang, bis sie einen Lauf damit beendet haben), `skills.js`, Fraktions-Icon, Panel, i18n
(`de.js` · `en.js` · `enSkills.js`), Glossar und Tests.

---

## 10 · Nächster Schritt

Die Überlappungs-Linie (§5.4), dann die Ergebnis-Linie. Danach die Farbzuordnung, die Legendären und
zuletzt die Zahlen — in der Reihenfolge, die Eis und Pflanze schon gegangen sind.
