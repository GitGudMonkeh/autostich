# Haltungen — Fraktion 5 (Arbeitsdokument)

> **Status: lebendes Dokument, Designphase.** Der Mechanismus und die vier Passive sind vom Owner
> gesetzt, alle fünf Linien sind besetzt — 15 Skills. **Keine Zahlen sind tariert, nichts ist gemessen** —
> alle Werte hier sind Startwerte oder Kopfrechnung und stehen so lange zur Disposition, bis Sim und
> Playtest etwas dazu sagen.
>
> Stand: 2026-09-22 · Basis: `origin/exp` · Vorgänger: `docs/fraktion-5-brainstorm.md` (die sechs
> Richtungen und die Landkarte des freien Designraums; diese Fraktion ist keine davon, sondern ein
> Vorschlag des Owners).
>
> **Gesetzt** = Owner-Entscheidung. **Vorschlag** = Diskussionsstand. **Offen** = noch niemand.
>
> **Arbeitstitel:** noch keiner. Der Owner schlug „Echo" vor — belegt, gleich doppelt: `L_ECHO` ist ein
> legendäres Perk, und im englischen Katalog ist „Echo" die Übersetzung von **Nachhall**, also
> ausgerechnet des Begriffs für den Kernmechanismus dieser Fraktion. Freie Vorschläge: **Reigen**
> (ein Rundtanz, in dem mehrere sich im Kreis abwechseln) oder **Zirkel**.
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
- **Für den Haltungswechsel zählt immer die GRUNDFARBE der Karte**, nie die effektive. Pflanzen-Grün
  färbt nicht mit, eine Farballianz fasst nichts zusammen (§2.2).
- **Alle vier Haltungen laufen ab dem ersten Skill der Fraktion.** Kein Aufbau, keine Skalierung mit
  der Skill-Zahl — die vier Grundwerte in §3 gelten sofort und unverändert (anders als Blitz, dessen
  Passiv je gehaltenem Skill wächst).
- **Ein Verlängerer verlängert immer die aktuell aktive Haltung**, nicht seine eigene.
- **Crit-Chance ist additiv**, kein Mindestwert: Blaus +50 % addieren sich auf, was das Deck schon
  hat. Ein Blitz-Deck bei 80 % steht damit bei 130 % und bekommt aus dem Überschuss über der
  100-%-Klemme +0,3× Crit-Multiplikator.
- **Der Zähler ist bei 5 gedeckelt.** Erreicht die schon aktive Farbe ihre 5, **löst sie aus und
  setzt zurück** — aber die Haltung bleibt dieselbe, und es zählt **nicht als Haltungswechsel**. Für
  **Beschleunigung** (Schwelle sinkt) und **Runde** (Farbe getragen) zählen ausschließlich echte
  Wechsel auf eine *andere* Farbe.
  Damit steht die aktive Farbe nie auf einem hohen Zählerstand, und das Pendeln zwischen zwei
  Haltungen ist an der Wurzel ausgeschlossen: wird sie verdrängt, steht sie irgendwo zwischen 0 und 4.
- **Der Lauf startet in Rot, mit Zähler 0.** Fest, nicht gewürfelt. Damit beginnt jeder Lauf mit der
  nachsichtigsten Haltung, und das trifft genau die Phase, in der das Deck am schwächsten ist (45 %
  Siegquote roh).

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

### 2.2 · Die Grundfarbe zählt — und was Pflanze damit macht

**Gesetzt (Owner):** der Haltungswechsel liest die **Grundfarbe**, wie **Buntspiel** es schon tut
(`zwischenaufgaben.md`). Sind Pflanze und diese Fraktion zusammen aktiv, bekommt die Karte einen
Punkt in ihrer Grundfarbe — dieselbe Lösung wie dort der Ring um das Blatt, und wie dort nur, solange
die Information gebraucht wird.

**Die Regel ist erzwungen, nicht gewählt**, und die Messung dafür liegt schon vor: Pflanze färbt bis
D15 im Median 17,5 von 40 Karten grün und bis D30 deren 36 — und schon bei D15 hat **mindestens eine
Farbe keine ungefärbte Karte mehr**. Über die effektive Farbe gezählt könnte diese Haltung ab da nie
wieder auslösen, ab D30 wäre die Rotation grün-only. Über die Grundfarbe läuft sie unverändert weiter.

**Damit ist Grün für das Haltungssystem nicht mehr besonders** — die Farbzuordnung (§8) ist reine
Gefühlssache, keine mechanische Entscheidung mehr.

**Aber: die Pflanze-Mischung hebelt den Preis aus §2.1 aus.** Dort kostet bunt bauen den Farbblock.
Mit Pflanze nicht: die Karten werden grün, das Brett liest sich als **ein großer Farbblock** — und
ihre Grundfarben bleiben 10/10/10/10, die Rotation läuft also schnell weiter. Formation *und* Stapel,
ohne den Handel dazwischen. Das ist nach heutigem Stand die stärkste Paarung im Entwurf und die
erste Stelle, an der ich beim Tarieren nachsehen würde.

---

## 3 · Die vier Haltungen — **gesetzt**

Jede beugt **eine Regel**, die es schon gibt, statt eine Zahl zu addieren. Keine doppelt eine andere,
und zusammen decken sie die Score-Pipeline ab.

| Farbe | Haltung | Greift an | Was sie tut | Grundwert |
| --- | --- | --- | --- | --- |
| **Rot** | **Anheben** (Ergebnis) | den Ausgang des Stichs | Niederlage → Gleichstand, Gleichstand → Sieg. | eine Stufe |
| **Blau** | Crit | die Spitze | Durchgehend Crit-Chance, solange sie klingt. | **+50 %** |
| **Grün** | Überlappung | die Formations-Geometrie | Die Überlappung färbt ab: die Nachbarkarte **innerhalb des Segments** erbt eine Stufe. | +1 Stufe |
| **Gelb** | Score | den Basis-Score | Glatter Multiplikator. | **×1,4** |

Die vier Grundwerte **stehen und skalieren nicht** mit der Zahl gehaltener Skills (Owner). Gelbs ×1,4
wirkt nur, solange die Haltung klingt — bei gleichmäßiger Rotation rund ein Viertel der Stiche, also
grob +10 % über den Lauf; Feuers Hitze-Multiplikator liegt zum Vergleich bei ×1,2 *dauerhaft*.

**Farbzuordnung gesetzt** (Owner). Sie ist seit §2.2 reine Gefühlssache — die Grundfarbe entscheidet
nur, *wann* eine Haltung zündet, nicht *was* sie tut. Das Farbregister liest sich stimmig: Rot dreht
den verlorenen Stich, Blau ist die Spitze, Grün das Verweben, Gelb der Ertrag.

**Namen sind damit noch nicht vergeben.** „Anheben" ist die Wendung des Owners für die rote Haltung
und als Name frei (im Code nur als gewöhnliches Wort in einem Kommentar). **„Blitz" für die blaue
geht nicht** — so heißt die Fraktion. Ob die Haltungen überhaupt eigene Namen bekommen oder schlicht
über ihre Farbe laufen, ist offen.

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
- **Die Segmentbindung des Abfärbens ist eine bewusste Einschränkung, keine geerbte.** „Die
  Nachbarkarte erbt" ist von sich aus positionsbezogen, und Positionen kennen keine Segmente — ohne
  die ausdrückliche Klausel liefe das Abfärben über jede Grenze und der Skill *Übergriff* (§5.4)
  hätte nichts zu tun. Sie muss deshalb im Spielertext des Passivs stehen, nicht nur hier (Owner).
  Angenehmer Nebeneffekt: damit zählt die **Lage innerhalb des Segments** — eine Karte am Rand färbt
  nur nach innen, eine in der Mitte nach beiden Seiten.

---

## 4 · Die Linien — **gesetzt** (Schnitt A)

Eine Linie je Haltung, dazu eine für die Rotation, die über alle wirkt: **4 × 3 + 3 = 15.**

Welche Linie man sammelt, *ist* die Farbidentität des Builds. Eine Linie tief = campen, gestreut =
tanzen.

| Linie | Stand |
| --- | --- |
| **Score** | Stauung · Zinsen · Mitklang — **voll** |
| **Crit** | Grundrauschen · Übertrag · Schwungrad — **voll** |
| **Überlappung** | Doppelbindung · Übergriff · Verankerung — **voll** |
| **Ergebnis** | Genugtuung · Rückhalt · Kehrtwende — **voll** |
| **Rotation** | Anklang · Runde · Beschleunigung — **voll** |

Dazu kommen **3 Legendäre** (Format der Bestandsfraktionen) — noch nicht angefasst.

### 4.1 · Das Leerlauf-Risiko der Haltungslinien

Ein Haltungs-Skill liegt still, solange seine Haltung nicht klingt. Bei vier Haltungen ist das
strukturell die meiste Zeit — dieselbe Form, an der Eis krankt (`skill-rework.md` §8.3: Eis kostet
den Partner die Hälfte, weil der Spieler es fallen lässt).

**Stand dazu, ungeschönt:** nur die **Crit-Linie** trägt einen Skill, der außerhalb seiner Haltung
wirkt (*Grundrauschen*). Score, Überlappung und Ergebnis haben keinen — die Kandidaten, die es
gewesen wären (*Grundlast*, *Gefüge*, *Standhaft*), sind jeweils nicht gewählt worden. Ob das ein
Problem ist, entscheidet sich daran, wie lang eine Haltung im typischen Lauf tatsächlich klingt; die
drei Linien liegen sonst strukturell den größten Teil der Zeit still.

---

## 5 · Die Skills, Stand

Kennwerte sind durchweg **offen**. Hier steht nur, was der Skill tut.

### 5.1 · Score-Linie — voll

Passiv: glatter Multiplikator auf den Basis-Score.

| Skill | Wirkung |
| --- | --- |
| **Stauung** | Solange sie klingt, zahlen Siege nicht, sondern sammeln an; endet die Haltung, entlädt sich der Stau mit Zuschlag. |
| **Beharrlichkeit** | Je Stich, den die Haltung schon läuft, steigt der Multiplikator. Campen zahlt. |
| **Mitklang** | Der Multiplikator zählt je gleichzeitig klingender Haltung. Tanzen zahlt. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Stauung** · Zuschlag auf den Stau | ×1,25 | ×1,4 | ×1,6 | ×2,0 + *der Stau entlädt sich auch am Durchlauf-Ende* |
| **Beharrlichkeit** · Multiplikator je Stich Laufzeit | +0,02 | +0,03 | +0,04 | +0,06 |
| **Mitklang** · Multiplikator je zusätzlich klingender Haltung | +0,15 | +0,25 | +0,35 | +0,50 |

**Stauung und die Verlängerer beißen sich.** Stauung zahlt erst, wenn die Haltung *endet* — Schwungrad
(§5.2) und Kehrtwende (§5.5) sorgen dafür, dass sie es nicht tut. In einem Build mit beidem
verschwindet der Score in einem Stau, der nie aufgeht. Das Episch-Extra entlädt ihn deshalb zwangsweise
am Durchlauf-Ende; auf den unteren Stufen bleibt die Falle bestehen und ist Absicht.

**Die Linie hat ihre Spannung in sich:** das Passiv belohnt, *drin* zu sein, Stauung belohnt, dass es
*endet*. Und Beharrlichkeit/Mitklang sind ein Spiegelpaar — im Block-Build wächst Beharrlichkeit und
Mitklang steht auf ×1, im bunten Build umgekehrt. Dieselbe Linie bedient beide Spielstile.

**Warnung:** in einem harten Block-Build kann eine Haltung sehr lang laufen, potenziell einen ganzen
Durchlauf. Beharrlichkeit hätte dann 30+ Schritte — auf Episch wären das +1,8, also ×3,2 zusätzlich.
Das ist die Stelle, an der diese Linie wegläuft, falls sie wegläuft. Bewusst ohne Deckel, weil das
Raster sagt: lieber niedrigere Werte als Deckel auf Rampen.

### 5.2 · Crit-Linie — voll

Passiv: durchgehend 50 % Crit-Chance, solange sie klingt.

| Skill | Wirkung |
| --- | --- |
| **Grundrauschen** | Ein Teil der Chance gilt auch außerhalb der Haltung. Der Anti-Leerlauf-Skill der Linie. |
| **Übertrag** | Ein Crit springt auf den nächsten Stich über — der wird ebenfalls ein Crit, auch wenn er von sich aus ein normaler Sieg gewesen wäre. |
| **Schwungrad** | Jeder Crit verlängert die laufende Haltung um einen Stich. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Grundrauschen** · Crit-Chance außerhalb der Haltung | +8 % | +12 % | +17 % | +25 % |
| **Übertrag** · Reichweite des Übersprungs | 1 Stich | 2 Stiche | 3 Stiche | 4 Stiche |
| *ergibt Critrate (Passiv 50 %)* | *67 %* | *75 %* | *80 %* | *83 %* |
| **Schwungrad** · Verlängerungen je Haltung | höchstens 2× | 3× | 5× | 8× |

Übertrag ist bewusst über die **Reichweite** gestaffelt und nicht über eine Sprungchance: mit einer
Chance von 50 → 100 % bewegte sich die Critrate nur von 60 auf 67 %, das wäre eine Leiter, die nichts
tut. Und **Schwungrads Deckel ist der Stufenwert** — damit ist die Runaway-Rechnung aus §6.4 in der
Tabelle erledigt statt als Sonderregel.

**Regel, die Übertrag braucht:** der übergesprungene Crit darf **nicht seinerseits überspringen** —
sonst crittet man ab dem ersten Crit bis zum Ende der Haltung durch, ohne Abbruch.

**Warnung zu Schwungrad** (§6.4).

### 5.3 · Rotation-Linie — voll

Wirkt über alle Haltungen. Trägt vermutlich auch den Kernskill, weil das Raster in `skill-rework.md`
§1 verlangt, dass der erste Skill einer Fraktion sie allein zum Laufen bringt.

| Skill | Wirkung |
| --- | --- |
| **Anklang** | Die vorige Haltung klingt länger nach. |
| **Runde** | Hast du alle vier Haltungen einmal getragen, gibt die vollendete Runde etwas auf den Score — **im nächsten Durchlauf**. |
| **Beschleunigung** | Jeder Wechsel senkt die Schwelle für den nächsten. Schritt **und Boden** sind Stufenwerte. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Anklang** · Mindestdauer statt 3 Stichen | 4 | 5 | 6 | 8 |
| **Runde** · Basis-Score je Sieg im nächsten Durchlauf | 60 | 90 | 130 | 200 + *mehrere Runden stapeln* |
| **Beschleunigung** · Schritt · Boden der Schwelle | −1 · 4 | −1 · 3 | −1 · 2 | −2 · 2 |

**Runde stapelt erst auf Episch** — das beantwortet die frühere offene Frage als Stufenwert statt als
Sonderregel. Und **Beschleunigungs Boden geht nicht auf 1**: bei Schwelle 1 löst jede Farbe mit ihrem
ersten Sieg aus, und dann klingen dauerhaft drei bis vier Haltungen (§6.7). Boden 2 macht die Rotation
sehr schnell, ohne in diesen Zustand zu kippen.

**Runde zahlt verzögert**, und das ist eine Eigenschaft, keine Nebensache: zwischen den Durchläufen
liegt die Aufstellungsphase. Der Spieler weiß also, dass der Bonus kommt, und kann darauf aufstellen.

**Offen bei Runde:** ob der Bonus ein Multiplikator auf den Durchlauf ist oder ein Flat je Sieg, und
vor allem, ob **mehrere Runden stapeln**. Mit Beschleunigung sind zwei bis drei Runden in einem
Durchlauf erreichbar — stapeln sie, ist diese Kombination der Motor, auf den die ganze Linie zeigt.

**Die Linie ist damit durchgehend Tanz-Build.** Alle drei zahlen auf häufiges Wechseln, und sie
verstärken sich gegenseitig: Beschleunigung erzeugt mehr Wechsel, Anklang lässt sie überlappen, Runde
zahlt für die vollendete Runde, die durch Beschleunigung viel schneller kommt. Für den Block-Build
steht in dieser Linie nichts.

**Warnung zu Beschleunigung** (§6.7).

**Warnung:** eine Linie, die immer wirkt, wird auch immer genommen. Bei zwei Türen à drei Skills
könnte Rotation die vier Haltungslinien systematisch verdrängen. Beim Bau des Angebots mitdenken.

### 5.4 · Überlappungs-Linie — voll

Passiv: die Überlappung färbt ab, die Nachbarkarte **innerhalb des Segments** erbt eine Stufe.

| Skill | Wirkung |
| --- | --- |
| **Doppelbindung** | Eine Karte darf in zwei Formationen desselben Typs liegen. Der einzige Weg über die ×3-Decke, weil es sonst nur vier Typen gibt — hebt die *Anzahl*, nicht den *Wert*. |
| **Übergriff** | Das Abfärben springt über die Segmentgrenze. |
| **Verankerung** | Beim Auslösen der Haltung erbt jede Karte des aktuellen Segments einmal. Zündet auch in einer Haltung, die nur einen Stich lebt — also der für den Tanz-Build. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Doppelbindung** · für wie viele Formationstypen | 1 | 2 | 3 | alle 4 |
| **Übergriff** · Grenzen mit den meisten Formationen daneben | 1 | 2 | 3 | alle |
| **Verankerung** · Reichweite beim Auslösen | aktuelles Segment | + das folgende | die drei um die Position | alle acht |

Übergriffs Leiter spiegelt bewusst **Spalier** (`1 / 2 / 3 / alle`) — dasselbe Muster für dieselbe
Geste spart dem Spieler eine Regel.

**Offen dazu:** was Übergriff auf einer Grenze tut, die ohnehin schon offen ist. Spalier (Pflanze),
Segmentarbeit (Perk-Familie E) und Durchlass (Auftragsbeute) öffnen Grenzen bereits — dort wäre der
Skill wirkungslos, solange das Abfärben offenen Grenzen von selbst folgt. Entweder folgt es ihnen
nicht (dann ist Übergriff auch dort etwas wert), oder der Skill überschneidet sich mit jedem
Grenzöffner im Spiel.

**Nachbarschaft zu Pflanze, zu beachten:** **Verwachsung** (SK_PLANT_14) hebt den Überlappungs-*Wert*,
**Wurzelgeflecht** (Legendär) hebt die *Anzahl*, **Spalier** (SK_PLANT_03) öffnet Segmentgrenzen. Wer
hier baut, sollte einen dritten Griff nehmen.

### 5.5 · Ergebnis-Linie — voll

Passiv: Niederlage → Gleichstand, Gleichstand → Sieg.

**Was das Passiv schon allein tut:** ein Gleichstand bricht die Serie heute nicht, eine Niederlage
schon. „Niederlage → Gleichstand" heißt damit, dass die Serie überlebt, solange die Haltung klingt —
das Passiv ist bereits ein Serienschutz. Und „Gleichstand → Sieg" hebt rund 10 % aller Stiche von tot
auf voll, mit Score, Serie und Farbzähler.

| Skill | Wirkung |
| --- | --- |
| **Genugtuung** | **Jeder gerutschte Stich** zahlt Basis-Score je Punkt Rückstand, den er gedreht hat. Je deutlicher du eigentlich verloren hättest, desto mehr zahlt er — der einzige Griff im Entwurf, der niedrige Karten wertvoll macht. |
| **Rückhalt** | Nach einem gerutschten Stich kämpft die nächste Karte mit mehr Wert. |
| **Kehrtwende** | Ein gerutschter Stich verlängert die Haltung um einen Stich. |

> **Korrektur an Genugtuung.** Ursprünglich stand dort „ein gerutschter **Sieg**". Das zahlt nichts:
> das Passiv schiebt eine Niederlage nur auf Gleichstand, ein gerutschter Sieg war also immer ein
> Gleichstand — und der hat per Definition **Rückstand 0**. Sie liest deshalb **jeden** gerutschten
> Stich; dann trägt die Niederlage ihren Rückstand bei und die Fantasie stimmt.

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Genugtuung** · Basis-Score je Punkt Rückstand | 25 | 40 | 55 | 80 |
| **Rückhalt** · Stichwert der nächsten Karte | +3 | +4 | +6 | +8 |
| **Kehrtwende** · Verlängerungen je Haltung | höchstens 3× | 4× | 6× | 10× |

Kehrtwendes Deckel liegt bewusst **über** dem von Schwungrad (2/3/5/8), weil ihre Rate niedriger ist
und sie strukturell nicht weglaufen kann (§6.5).

**Warnung zu Kehrtwende** (§6.5).

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

### 6.5 · Zwei Verlängerer — und die Frage, die sie aufwerfen

**Schwungrad** (Crit-Linie) und **Kehrtwende** (Ergebnis-Linie) haben dieselbe Form: sie verlängern
die Haltung je Auslöser um einen Stich. Ihre Vorzeichen sind aber entgegengesetzt.

Ein „gerutschter" Stich ist alles, was kein echter Sieg bleibt — die Rutschquote ist damit
**1 − Siegquote**, und Kehrtwende wird **schwächer, je besser der Lauf läuft**:

| Siegquote | Dauer mit Kehrtwende |
| --- | --- |
| 45 % (Laufbeginn) | ~6,7 Stiche |
| 55 % | ~5,5 Stiche |
| 77 % (bestes gemessenes Build, §6.1) | ~3,9 Stiche |

Schwungrad läuft bei 100 % Crit ins Unendliche, Kehrtwende kann das strukturell nicht. Gutes
Gegengewicht — solange die beiden nicht zusammenwirken.

**Entschieden (Owner): ein Verlängerer verlängert immer die aktuell aktive Haltung**, nicht seine
eigene. Das ist die Lesart, bei der sich die Raten addieren — 0,67 aus Schwungrad plus rund 0,45 aus
Kehrtwende liegen über 1, rechnerisch würde die Haltung also nicht mehr enden.

**Aufgefangen wird das durch die Stufenwerte**, nicht durch eine Sonderregel: Schwungrad deckelt bei
2/3/5/8 Verlängerungen je Haltung, Kehrtwende bei 3/4/6/10. Beide auf Episch gehalten sind zusammen
höchstens 18 Verlängerungen, die Haltung läuft also längstens 21 Stiche. Endlich, und nur mit zwei
epischen Skills aus zwei Linien erreichbar.

### 6.6 · Der Stapel

Überlappung, Crit und Score multiplizieren **denselben Stich**: das Abfärben hebt den
Formations-Multiplikator, der Score-Multiplikator liegt darauf, und der Crit multipliziert den
fertigen Stapel. Drei Faktoren hintereinander auf derselben Karte.

Die Blitz-Notizen haben für diese Form einen Namen und eine Narbe (`skill-rework.md` §7.46,
„kubischer Weglauf" — dort waren es zwei Achsen an derselben Ressource). **Ergebnis** ist der
Ausreißer und deshalb wertvoll: sie multipliziert nicht, sie wandelt, und läuft nie weg.

### 6.7 · Beschleunigung braucht einen Boden

Die Schwelle steht bei 5 gewonnenen Stichen. Senkt jeder Wechsel sie, läuft sie ohne Boden dorthin:

> 5 → 4 → 3 → 2 → 1 → 0

**Bei Schwelle 1 löst jede Farbe mit ihrem ersten Sieg aus.** Bei ~60 % Siegquote ist dann rund jeder
zweite Stich ein Wechsel — und weil eine Haltung mindestens 3 Stiche hält, klingen ab da **permanent
drei bis vier Haltungen gleichzeitig**. Bei Schwelle 0 gilt das sogar ohne Sieg.

Das ist genau der Zustand aus §6.6, nur dauerhaft statt als Blitz.

**Erledigt (Owner):** Schritt *und* Boden sind **Stufenwerte** des Skills und stehen damit in der
Stufentabelle, wie die mehrteiligen Zeilen der Bestandsskills (`ableiter: [{ critEvery, extra, back }, …]`).
Diese Rechnung bleibt als Begründung stehen, warum der Boden dort **nicht fehlen darf**: ohne ihn
endet jede Leiter, wie flach sie auch ansetzt, nach wenigen Wechseln bei 0.

Anders als bei den Verlängerern (§6.5) ist das kein Randfall bei extremen Werten: die Leiter läuft
schon nach vier Wechseln an ihr Ende, und vier Wechsel sind in einem bunten Build ein bis zwei
Durchläufe.

---

## 7 · Verworfen — und warum

| Verworfen | Grund |
| --- | --- |
| **Haltung „Segment"** (die Segmentgrenze dehnt sich, Formationsläufe reichen weiter) | Zu nah an der Überlappungs-Haltung; beide hätten an derselben Geometrie gezogen. Ersetzt durch **Score**. Kosten: es war das einzige Passiv, das ändert, *welche* Formationen überhaupt existieren. |
| **Crit-Passiv „jeder N-te Sieg ist garantiert ein Crit"** | Eine Mindest-Haltung von 3 Stichen trägt bei ~60 % Siegquote rund 1,8 Siege. Ein Takt von 3 zündet darin **nie** — der Skill wäre im Tanz-Build wertlos und im Block-Build stark gewesen. Ersetzt durch die durchgehende Chance, die glatt mit der Dauer skaliert. |
| **Pechbremse** (ein Sieg ohne Crit hebt die Chance für den nächsten) | Stirbt am eigenen Erfolg: wer auf Crit baut, verfehlt nie, also greift sie nie. Gehört zur Sorte „immer genommen, nie gespürt" (`skill-rework.md` §8.5). |
| **Metronom · Takt · Zielschuss** | Hingen alle am gestrichenen Takt-Passiv. |
| **„Aufteilung"** | Name belegt (Glossar: „Aufteilung deines Scores auf Formationen / Crits / Übrige"), und mechanisch war der Skill identisch zu Mitklang, nur auf der Crit-Achse. |
| **„Echo" als Fraktionsname** | Doppelt belegt: `L_ECHO` ist ein legendäres Perk, und im englischen Katalog ist „Echo" die Übersetzung von **Nachhall** — dem Begriff für genau den Mechanismus dieser Fraktion. |
| **„Zinsen" als Skillname** | Belegt durch **Zinseszins**, ein legendäres Perk („die Bank", Kapital × Zinssatz) mit eigenem Readout in der Build-Übersicht. Der Skill heißt jetzt **Beharrlichkeit**. |
| **Trägheit** (je länger eine Haltung hält, desto stärker wird sie) | Owner: zu teuer. Der Skill hätte **jedem der vier Passive eine Dauer-Skala** aufgezwungen — vier Umbauten für einen Skill, und jedes Passiv müsste eine zweite Achse tragen, die es sonst nicht braucht. Campen zahlt stattdessen über *Zinsen* (Score-Linie). |
| **Zweitstufe · Standhaft · Gnadenfrist** (Ergebnis-Kandidaten) | Nicht gewählt. *Standhaft* wäre der Skill gewesen, der außerhalb der eigenen Haltung wirkt (§4.1). |
| **Kehrtwende, ursprüngliche Fassung** (ein gerutschter Stich zählt für den Farbzähler seiner Farbe) | Vom Owner umdefiniert auf „verlängert die Haltung um einen Stich". Die alte Fassung hätte in die eigene Maschine zurückgespeist — dieselbe Form wie der nicht gewählte *Taktgeber* der Crit-Linie. |
| **Gefüge · Weiterreichen · Verkettung** (Überlappungs-Kandidaten) | Nicht gewählt. Gefüge bleibt der stärkste der drei, falls die Linie später aufgemacht wird: es hebt die Reichweite des Passivs von „dichte Stellen" auf das ganze Brett. |
| **Linien-Schnitt B** (Tanzen · Campen · Steuern · Ertrag) | Die vier Haltungen hätten keine Heimat gehabt. |
| **Linien-Schnitt C** (Partitur · Takt · Ausklang · Haltungen · Ertrag) | Am leichtesten zu tarieren, aber liest sich wie eine Bauteilliste. |
| **Feste Kreis-Reihenfolge** (Haltungen klingen nur mit ihren Nachbarn zusammen) | Der Owner bestimmt den Kreis über die Farbblöcke in der Aufstellung — eine vom Design gesetzte Reihenfolge nähme ihm genau das. |

Die sechs Richtungen aus `docs/fraktion-5-brainstorm.md` (Waage · Strömung · Stein · Prisma · Echo ·
Opfer) sind damit **nicht** erledigt — diese Fraktion ist ein eigener Vorschlag des Owners, keine
davon. Der Brainstorm bleibt als Landkarte gültig.

---

## 8 · Offene Punkte

**Keine Regelfrage blockiert den Sim-Bau mehr.** Eine kleine Lesart ist dabei nicht ausdrücklich
entschieden und hier als Annahme festgehalten, korrigierbar: **ein Selbst-Auslösen frischt die
Mindestdauer auf.** Die aktive Haltung läuft ohnehin bis zur Ablösung, spürbar wird es also erst
danach — eine Farbe, die kurz vor ihrer Verdrängung noch einmal ausgelöst hat, klingt drei Stiche
länger nach. Das ist die Stelle, an der „die Farbe warm halten" überhaupt etwas wert ist.

**Werte und Design, offen:**

1. **Was zahlt ein gerutschter Sieg?** Er war ein Gleichstand — zahlt er wie ein echter Sieg (100 %,
   am einfachsten und am stärksten) oder einen Anteil? Dazu der Nebeneffekt ohne Zahl: eine zur
   Gleichstand gerutschte Niederlage ist für **alles** keine Niederlage mehr — Niederlagenserie,
   Schwachstellenanalyse, Revanche und Initiative laufen ins Leere.
2. **Übergriff auf bereits offenen Grenzen** — §5.4.
3. **Namen der vier Haltungen** — ob sie eigene bekommen oder über ihre Farbe laufen (§3). Die
   Zuordnung selbst ist gesetzt.
4. **Hat die Fraktion einen eigenen Ertrag?** Feuer hat `fireBase`, Pflanze `plantBase`, Blitz
   `lightYield`, Eis `glacierYield` — jede Fraktion trägt einen eigenen Score-Kanal. Diese hier
   beugt nur Regeln. Ob das ein Mangel ist oder die Pointe, ist offen.
5. **Paare oder Drei** — wie viele Haltungen gleichzeitig klingen dürfen. Bewusst offen bis Skills
   und Balancing stehen.
6. **Name und Thema.** „Echo" ist belegt (Kopf dieses Dokuments). Vier Fraktionen sind Elemente, diese
   wäre ein Konzept — die Genre-Recherche im Repo nennt das Elementar-Skin „das generischste im
   Feld", der Bruch wäre also möglicherweise ein Gewinn.
7. **Drei Legendäre.** Nach Owner-Plan erst, wenn die Sim erste Zahlen gegen die anderen Decks
    geliefert hat.
8. **Die Startwerte selbst** (§5) sind Startwerte, kein Tarierstand — nichts davon ist gemessen.

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

**Alle 15 Skills stehen, mit Startwerten je Stufe, dazu die vier Grundwerte der Passive.** Der Plan
des Owners von hier aus:

1. **Die drei Regelfragen** aus §8 beantworten — sie blockieren den Sim-Bau.
2. **Die Sim auf das neue Deck bauen und messen**, gegen die bestehenden vier.
3. **Erst mit diesen Zahlen die drei Legendären entwerfen** — bewusst danach, damit sie sich an einem
   gemessenen Stand messen und nicht an einer Schätzung.

Die Zahlen in §5 sind Startwerte zum Bauen, nicht zum Verteidigen.
