# Haltungen — Fraktion 5 (Arbeitsdokument)

> **Status: lebendes Dokument, gebaut und erstmals gemessen.** Der Mechanismus und die vier Passive sind vom
> Owner gesetzt, alle fünf Linien sind besetzt — 15 Skills, keine Legendären. Die Fraktion läuft in der Sim
> (`--mode motor --arch stance`, `--mode skills --arch stance`); die Zahlen stehen in **§6.8** (der Mechanismus
> im Lauf) und **§6.9** (die 15 Skills). **Nichts ist tariert** — alle Werte in §3 und §5 sind unverändert
> Startwerte, und die Messung sagt, an welchen drei Stellen zuerst zu drehen ist (§10).
>
> Stand: 2026-09-22 · Basis: `origin/exp` · Vorgänger: `docs/fraktion-5-brainstorm.md` (die sechs
> Richtungen und die Landkarte des freien Designraums; diese Fraktion ist keine davon, sondern ein
> Vorschlag des Owners).
>
> **Gesetzt** = Owner-Entscheidung. **Vorschlag** = Diskussionsstand. **Offen** = noch niemand.
>
> **Arbeitstitel: „Prisma"** (Owner) — im Code `stance`. Der endgültige Name ist NICHT entschieden, und Prisma
> ist im Spiel bereits zweimal belegt: als Gottgleich-Prunk „Prisma-Kaskade" (`PrismaKaskadePixi.jsx`) und als
> kosmetisches Deck „Prisma (Element-Bund)". Für einen Arbeitstitel reicht das, für den Spielertext nicht.
> „Echo" ging aus demselben Grund nicht: `L_ECHO` ist ein legendäres Perk, und im englischen Katalog ist „Echo"
> die Übersetzung von **Nachhall** — ausgerechnet der Begriff für den Kernmechanismus dieser Fraktion.
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
- Eine Haltung ist aktiv, bis eine andere sie ablöst. **Beim Wechsel klingt sie noch 3 Stiche nach** —
  „die alte Haltung wirkt noch in die neue hinein" (Owner). Der Nachklang beginnt AM WECHSEL, nicht beim
  Auslösen: wie lange sie vorher aktiv war, spielt keine Rolle.
- Eine Haltung wirkt **immer auf voller Stärke**, auch im Nachklang. Es gibt keine Abschwächung.
- Damit gilt: **jeder Wechsel erzeugt Überlappung.** Fallen mehrere Wechsel dicht hintereinander, stapeln
  sich die Nachklänge und es klingen drei oder vier Haltungen zugleich.
  *(Die Gegen-Lesart — Mindestdauer ab dem Auslösen — ist gemessen und verworfen: §6.8.1.)*
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

> Eine Haltung wird bei fünf gewonnenen Stichen ihrer Farbe aktiv und bleibt es, bis eine andere sie ablöst.
> Danach klingt sie noch drei Stiche nach — immer auf voller Stärke.

### 2.1 · Blöcke gegen bunt — die Build-Achse

Sie fällt aus dem Mechanismus heraus, ohne dass eine Regel sie ansagen muss:

| Aufstellung | Zähler | Wechsel | Ergebnis |
| --- | --- | --- | --- |
| **Farbblöcke** | steigen nacheinander | weit auseinander | eine Haltung, lang — der Nachklang ist verklungen, bevor der nächste Wechsel kommt. Campen. |
| **Bunt gemischt** | steigen gemeinsam | bündeln sich | die Nachklänge stapeln sich, drei bis vier Haltungen zugleich. Tanzen. |

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
| **Rot** | Ergebnis | den Ausgang des Stichs | Niederlage → Gleichstand, Gleichstand → Sieg. | eine Stufe |
| **Blau** | Crit | die Spitze | Durchgehend Crit-Chance, solange sie klingt. | **+50 %** |
| **Grün** | Überlappung | die Formations-Geometrie | Die Überlappung färbt ab: die Nachbarkarte **innerhalb des Segments** erbt eine Stufe. | +1 Stufe |
| **Gelb** | Score | den Basis-Score | Glatter Multiplikator. | **×1,4** |

Die vier Grundwerte **stehen und skalieren nicht** mit der Zahl gehaltener Skills (Owner). Gelbs ×1,4
wirkt nur, solange die Haltung klingt — bei gleichmäßiger Rotation rund ein Viertel der Stiche, also
grob +10 % über den Lauf; Feuers Hitze-Multiplikator liegt zum Vergleich bei ×1,2 *dauerhaft*.

**Farbzuordnung gesetzt** (Owner). Sie ist seit §2.2 reine Gefühlssache — die Grundfarbe entscheidet
nur, *wann* eine Haltung zündet, nicht *was* sie tut. Das Farbregister liest sich stimmig: Rot dreht
den verlorenen Stich, Blau ist die Spitze, Grün das Verweben, Gelb der Ertrag.

**Die Haltungen bekommen vorerst keine eigenen Namen** (Owner). Im Spiel laufen sie über ihre Farbe —
„die rote Haltung", „die blaue Haltung". Die Spalte **Haltung** oben ist Engineering-Kurzschrift für
dieses Dokument, kein Spielertext. Das spart vier Vokabeln in einem System, das ohnehin viele neue
Begriffe mitbringt, und die Farbe ist im Panel ohnehin das, was der Spieler abliest. Später
nachrüstbar, ohne dass eine Regel sich ändert.

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
- **Ein gerutschter Sieg zahlt voll** — dieselben 400 Basis-Score wie ein erkämpfter (Owner). Rot ist
  damit nicht nur ein Sicherheitsnetz, sondern selbst eine Score-Quelle, und braucht dafür keine
  Sonderregel. **Der Nebeneffekt ohne Zahl:** eine zum Gleichstand gerutschte Niederlage ist für
  **alles** keine Niederlage mehr — Niederlagenserie, Schwachstellenanalyse, Revanche und Initiative
  laufen in einem roten Deck leer.
- **Ergebnis** ist als einzige gegen jede Haltungslänge robust: sie wirkt pro Stich und braucht keine
  Dauer. Das war der Prüfstein, an dem das alte Crit-Passiv gescheitert ist (§7).
- **Die Segmentbindung des Abfärbens ist eine bewusste Einschränkung, keine geerbte.** „Die
  Nachbarkarte erbt" ist von sich aus positionsbezogen, und Positionen kennen keine Segmente — ohne
  die ausdrückliche Klausel liefe das Abfärben über jede Grenze, und der Skill *Übergriff* (§5.4),
  der genau sie aufhebt, hätte die Hälfte seiner Wirkung schon geschenkt bekommen.
  Sie muss deshalb im Spielertext des Passivs stehen, nicht nur hier (Owner).
  Angenehmer Nebeneffekt: damit zählt die **Lage innerhalb des Segments** — eine Karte am Rand färbt
  nur nach innen, eine in der Mitte nach beiden Seiten.

### 3.1 · Die Leiste und die Stufe — **gesetzt**

Die vier Passive sind flach: sie wirken je Stich, begrenzt, und bauen nichts auf. Genau daran lag die Fraktion
Faktor 2 bis 14 unter dem Feld (§6.8 A). Der Sammler, der das behebt, steht bewusst **neben** den Haltungen und
nicht in ihnen:

```
1.  Jeder ECHTE Haltungswechsel füllt die Leiste um 1.
    (Ein Selbst-Auslösen nicht — wie bei Beschleunigung auch.)

2.  Voll  →  EINKLANG: alle vier Haltungen klingen gleichzeitig, für 3 Stiche.
             Leiste auf 0.

3.  Voll  →  und die STUFE steigt um 1. Dauerhaft, für den Rest des Laufs.
```

| | Grundwert | Regler |
| --- | --- | --- |
| Leiste voll bei | 10 Wechseln | **Runde** kürzt auf 8 / 7 / 6 / 4 (§5.3) |
| Einklang dauert | 3 Stiche | Runde Episch: +2 |
| Stufe gibt | **×1,02** auf jeden Sieg-Score | der Satz je Stufe ist der Haupt-Regler |

**Der Einklang braucht keine eigene Mechanik.** „Alle vier klingen" heißt, in die vier Nachklang-Zähler zu
schreiben, die es ohnehin gibt — keine neue Regel, kein neuer Zustand. Er hebt dabei nur an und kürzt nie:
ein längerer Nachklang, den ein Verlängerer eben gelegt hat, bleibt stehen.

**Die Stufe hat EINE Lesart** (Owner: „das Spiel ist schon kompliziert genug"): ein glatter Multiplikator auf
jeden Sieg-Score, unabhängig davon, welche Haltung klingt. Die Alternative — jedes der vier Passive liest die
Stufe auf seine Weise — ist verworfen: bei Rot und Grün skaliert sie holprig, und Rots Lesart („Score je
gerutschtem Stich") wäre wortgleich mit dem Skill **Genugtuung** gewesen. Das Passiv hätte seinen eigenen
Skill aufgefressen.

**Offen (Annahme):** der Einklang lässt die Haltungen *klingen*, er *löst sie nicht aus*. Für die Skills, die
am Klingen hängen, macht das keinen Unterschied; keiner hängt seit §5.3 noch am **Auslösen**. Zu beachten ist
dafür etwas anderes: der Einklang lässt alle vier gleichzeitig klingen, ohne dass eine ABGELÖST wurde — die
Nachklang-Skills (**Genugtuung**, **Verankerung**) prüfen deshalb auf „klingt, ist aber nicht aktiv" und nicht
auf die Leiste.

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
wirkt (*Grundrauschen*) — seit §5.3 sogar völlig haltungsunabhängig. Score, Überlappung und Ergebnis
haben keinen; die Kandidaten, die es gewesen wären (*Grundlast*, *Gefüge*, *Standhaft*), sind jeweils
nicht gewählt worden. Ob das ein Problem ist, entscheidet sich daran, wie lang eine Haltung im
typischen Lauf tatsächlich klingt; die drei Linien liegen sonst strukturell den größten Teil der Zeit
still.

---

## 5 · Die Skills, Stand

**Alle 15 stehen mit Startwerten je Stufe.** Die Leitern sind geschätzt und folgen dem Raster aus
`skill-rework.md` §1 (Faktoren ≈ 0,85 / 1,05 / 1,35 / 1,8; keine zwei Stufen gleich; keine Deckel auf
Rampen, lieber niedrigere Werte). **Nichts davon ist gemessen.** Was jeder Skill tut, steht in der
jeweiligen Linie darunter; hier die Leitern auf einen Blick:

| Linie | Skill · Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- | --- |
| **Score** (gelb) | **Stauung** · Zuschlag auf den größten Sieg, je Stich Laufzeit | +10 % | +15 % | +20 % | +30 % |
| | **Beharrlichkeit** · je Stich Laufzeit | +0,2 | +0,3 | +0,4 | +0,6 |
| | **Mitklang** · je zusätzlich klingender Haltung | +0,3 | +0,5 | +0,7 | +1,0 |
| **Crit** (blau) | **Grundrauschen** · Crit-Chance, in jeder Haltung | +12 % | +18 % | +26 % | +40 % + *Crit-Mult +0,5* |
| | **Übertrag** · Crit-Multiplikator je Crit der Haltung | +0,10 | +0,15 | +0,20 | +0,30 |
| | **Schwungrad** · Verlängerungen je Haltung | 2× | 3× | 5× | 8× |
| **Überlappung** (grün) | **Doppelbindung** · Formationstypen | 1 | 2 | 3 | alle 4 |
| | **Übergriff** · Zuschlag auf den Überlappungsbonus (dazu: alle Grenzen offen) | +0,3 | +0,4 | +0,55 | +0,7 |
| | **Verankerung** · Score-Multiplikator im Nachklang, je Formation | +0,15 | +0,25 | +0,35 | +0,50 |
| **Ergebnis** (rot) | **Genugtuung** · Basis-Score im Nachklang, je gedrehtem Stich | 75 | 120 | 165 | 240 |
| | **Rückhalt** · Stichwert der nächsten Karte | +3 | +4 | +6 | +8 |
| | **Kehrtwende** · Serienpunkte je gerutschtem Stich (dazu: Verlängerungen je Haltung) | +1 · 3× | +2 · 4× | +3 · 6× | +4 · 10× + *Serien-Satz +0,5 %* |
| **Rotation** (alle) | **Anklang** · Nachklang-Stiche (je +100 Basis-Score) | 4 | 5 | 6 | 8 |
| | **Runde** · Leiste voll nach … Wechseln (ohne: 10) | 8 | 7 | 6 | 4 + *Einklang +2* |
| | **Beschleunigung** · Schritt · Boden der Schwelle | −1 · 4 | −1 · 3 | −1 · 2 | −2 · 2 |

**Drei Leitern sind Deckel statt Rampen** — Schwungrad, Kehrtwende und Beschleunigungs Boden. Das ist
Absicht: die drei Runaway-Rechnungen aus §6 sind damit in der Stufentabelle erledigt statt als
Sonderregel, so wie das Raster es vorzieht.

### 5.1 · Score-Linie — voll

Passiv: glatter Multiplikator auf den Basis-Score.

| Skill | Wirkung |
| --- | --- |
| **Stauung** | Endet die Haltung, zahlt der **größte** Sieg aus ihr noch einmal — umso mehr, je länger sie lief. |
| **Beharrlichkeit** | Je Stich, den die Haltung schon läuft, steigt der Multiplikator. Campen zahlt. |
| **Mitklang** | Der Multiplikator zählt je gleichzeitig klingender Haltung. Tanzen zahlt. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Stauung** · Zuschlag auf den größten Sieg, je Stich Laufzeit | +10 % | +15 % | +20 % | +30 % |
| **Beharrlichkeit** · Multiplikator je Stich Laufzeit | +0,2 | +0,3 | +0,4 | +0,6 |
| **Mitklang** · Multiplikator je zusätzlich klingender Haltung | +0,3 | +0,5 | +0,7 | +1,0 |

**Neudesign §5.3 (Owner), in zwei Schritten.** Zuerst: *„Der größte gestaute Stich zahlt doppelt —
aber nicht doppelt, sondern skaliert mit der Länge der gelben Haltung."* Dann, auf die gebaute
Fassung: *„Der Skill macht zuviel. Ich will nur, dass der größte Stich mehr je Stich zahlt, ohne das
Entladen."*

**Das Bunkern ist damit gestrichen.** Siege zahlen wieder normal. Übrig ist eine einzige Zahl:

```text
Auszahlung beim Ende der gelben Haltung = größter Sieg × Satz × Stiche Laufzeit
```

Was mit dem Bunkern weggefallen ist, und warum das richtig ist:

- **Der Faktor auf den Stau** (`×1,25 … ×2,0`) — er war der Grund, warum der Skill vier Teile hatte.
- **Das Episch-Extra „entlädt auch am Durchlauf-Ende"** — es flickte nur die Falle, dass gebunkerter
  Score in einer nie endenden Haltung versickert. Ohne Bunker gibt es nichts zu verlieren: der
  Zuschlag wartet einfach, bis Gelb endet. Damit hat die Fraktion **gar keinen Durchlauf-Ende-Haken**
  mehr (`stanceCycleEnd` ist gelöscht).
- **Der Konflikt mit den Verlängerern** — Schwungrad und Kehrtwende halten die Haltung am Leben und
  schoben den Stau vor sich her. Jetzt verlängern sie nur die Laufzeit, also den Hebel: aus einer
  Falle ist eine Synergie geworden.

Der Spieler sieht seinen größten Sieg jetzt auch, wenn er passiert — vorher verschwand er ungesehen
im Stau.

**Zu beachten — dieselbe Achse wie Beharrlichkeit.** Beide lesen die Laufzeit der gelben Haltung. Sie
sind trotzdem nicht dasselbe: Beharrlichkeit hebt den Multiplikator **jedes** Stichs, Stauung nur den
**einen** größten. In einem Build mit beiden multiplizieren sie sich aber auf genau diesem Stich —
Startwerte, nicht tariert.

Die Laufzeit zählt auch auf **Niederlagen** hoch — sie verlängern die Haltung genauso. Im Code liegt
sie als eigener Zähler (`peakTicks`), nicht als `ranFor.Y`: dieser wird im selben Stich zurückgesetzt,
in dem Gelb endet und ausgezahlt wird.

**Nachbarschaft zu Eis, heute NICHT wirksam.** Der Owner-Gedanke war, die gelbe Haltung über einen
Gletscher zu legen: der Bruch wäre der größte Sieg. Im Code wird `glacierDirect` in `resolveTrick`
erst **nach** der Stich-Wertung auf `score` addiert — `gained` trägt den Bruch an der Stelle, an der
Stauung die Spitze merkt, noch nicht. Was wirkt, ist der andere Weg: `glacierWinMult` enthält
`stanceMult`, die gelbe Haltung hebelt den Bruch also über ihren Multiplikator. Den Bruch *in* die
Spitze zu legen wäre eine eigene Änderung am Score-Fluss und ist **nicht entschieden**.

**Die Linie zieht jetzt in eine Richtung:** Passiv, Beharrlichkeit und Stauung belohnen alle drei,
dass die gelbe Haltung *lange* läuft — die frühere Spannung („Stauung belohnt, dass es endet")
ist mit dem Bunkern gegangen. Übrig bleibt das Spiegelpaar Beharrlichkeit/Mitklang: im Block-Build
wächst Beharrlichkeit und Mitklang steht auf ×1, im bunten Build umgekehrt. **Zu beobachten:** ob die
gelbe Linie damit zu einseitig ist — die Gegenspannung müsste dann woanders herkommen.

**Neudesign §5.3, Mitklang (Owner): verdoppelt** (`+0,15/0,25/0,35/0,50` → `+0,3/0,5/0,7/1,0`). Es
klingen höchstens **drei** zusätzliche Haltungen gleichzeitig, und drei gibt es nur im Einklang oder
direkt nach dichten Wechseln — der alte Satz trug entsprechend wenig. Was er jetzt trägt (Basis
`×1,4`):

| zusätzlich klingend | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| 1 | ×1,7 | ×1,9 | ×2,1 | ×2,4 |
| 2 | ×2,0 | ×2,4 | ×2,8 | ×3,4 |
| 3 *(alle vier)* | ×2,3 | ×2,9 | ×3,5 | ×4,4 |

**Neudesign §5.3, Beharrlichkeit (Owner): alle vier Sätze ×10** (vorher `+0,02 / 0,03 / 0,04 / 0,06`). Auf den alten
Werten war Campen eine Geste ohne Gewicht: die gelbe Haltung lebt typisch 4–7 Stiche, das waren
`+0,08 … +0,42` auf einer Basis von `×1,4`. Was der Satz jetzt trägt:

| Laufzeit | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| 5 Stiche | ×2,4 | ×2,9 | ×3,4 | ×4,4 |
| 10 Stiche | ×3,4 | ×4,4 | ×5,4 | ×7,4 |
| 20 Stiche | ×5,4 | ×7,4 | ×9,4 | ×13,4 |

**Warnung, jetzt zehnmal so scharf:** in einem harten Block-Build kann eine Haltung sehr lang laufen,
potenziell einen ganzen Durchlauf. Beharrlichkeit hätte dann 30+ Schritte — auf Episch `+18,0`, also
`×19,4` statt der früheren `×3,2`. Das ist die Stelle, an der diese Linie wegläuft, falls sie
wegläuft. Weiterhin bewusst ohne Deckel, weil das Raster sagt: lieber niedrigere Werte als Deckel auf
Rampen — der Satz ist damit der einzige Regler, und er steht jetzt hoch.

### 5.2 · Crit-Linie — voll

Passiv: durchgehend 50 % Crit-Chance, solange sie klingt.

| Skill | Wirkung |
| --- | --- |
| **Grundrauschen** | Crit-Chance in **jeder** Haltung, zusätzlich zum Passiv; Episch dazu ein Crit-Multiplikator. Der Crit-Boden der Fraktion. |
| **Übertrag** | Jeder Crit hebt den **Crit-Multiplikator** weiter, solange die Haltung klingt. Die Rampe fällt mit ihr. |
| **Schwungrad** | Jeder Crit verlängert die laufende Haltung um einen Stich. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Grundrauschen** · Crit-Chance, in jeder Haltung | +12 % | +18 % | +26 % | +40 % |
| **Grundrauschen** · Crit-Multiplikator, in jeder Haltung | — | — | — | +0,5 |
| **Übertrag** · Crit-Multiplikator je Crit der Haltung | +0,10 | +0,15 | +0,20 | +0,30 |
| **Schwungrad** · Verlängerungen je Haltung | höchstens 2× | 3× | 5× | 8× |

**Schwungrads Deckel ist der Stufenwert** — damit ist die Runaway-Rechnung aus §6.4 in der Tabelle
erledigt statt als Sonderregel.

**Neudesign §5.3, Grundrauschen (Owner):** *„Werte anheben und einen Crit-Multi on top für Episch."*
Chance `8/12/17/25 %` → `12/18/26/40 %`, dazu auf Episch `+0,5` Crit-Multiplikator.

**Und der Ausschluss ist weg** (Owner, Nachtrag): Grundrauschen schließt sich **nicht mehr** mit dem
blauen Passiv aus. Beide Hälften — Chance und Multiplikator — gelten in **jeder** Haltung und addieren
sich auf die 50 % des Passivs. Auf Episch heißt das `50 + 40 = 90 %` Crit-Chance, solange Blau klingt,
sonst 40 %, und `+0,5` Crit-Multiplikator durchgehend.

Damit ist Grundrauschen **kein Anti-Leerlauf-Skill mehr**, sondern der **Crit-Boden** der Fraktion.
Der Name passt weiterhin: ein Rauschteppich, der immer liegt. Und der epische Multiplikator stapelt
sich jetzt mit **Übertrags** Rampe, statt sich mit ihr auszuschließen — beide zusammen sind der
Weglauf-Kandidat der blauen Linie (§6.4).

**Neudesign §5.3, Übertrag (Owner):** *„Anstatt Crit-Chance würde ich gerne etwas anderes — eventuell
hebt es den Crit-Multi an oder erhöht den Crit weiter."* Gewählt wurde die **Rampe**: jeder Crit der
klingenden blauen Haltung hebt den Crit-Multiplikator um einen Schritt weiter, und der Zuschlag fällt
auf 0, sobald Blau verklungen ist (den Nachklang trägt er noch).

Der Grund, warum dieser Slot überhaupt frei war: die blaue Linie hatte **Chance** (Grundrauschen),
**erzwungene Crits** (Übertrag alt) und **Dauer** (Schwungrad), aber nichts auf dem Multiplikator —
Prisma trug zu `critMultiplier` gar nichts bei. Jetzt schließt die Linie ihren Kreis: Chance macht
Crits, Crits machen Multiplikator, Schwungrad macht Dauer für mehr davon.

Der Schritt zählt **nach** dem Stich, der ihn auslöst (wie Serienanker und Crit-Folge) — der erste
Crit einer Haltung ist also noch ein normaler.

**Zu beachten:** `critMultiplier` wird aus allen Quellen **addiert** und danach weich gedeckelt
(`softCritMult`, Owner-gehalten). Was Prisma beiträgt, landet in derselben Summe und unter demselben
Deckel wie Blitz, Präzision und der Überschuss-Crit. Größenordnung an Blitz geeicht: ein Ionen-Stapel
ist `+0,15`. **Startwerte.**

**Der Kreis ist auch die Warnung:** Blau crittet mit dem Passiv ohnehin zu 50 %, Schwungrad verlängert
je Crit, und die Rampe wächst je Crit — drei Zahlen, die sich gegenseitig füttern. Das ist die Stelle,
an der die blaue Linie zuerst wegläuft (§6.4).

**Warnung zu Schwungrad** (§6.4).

### 5.3 · Rotation-Linie — voll

Wirkt über alle Haltungen. Trägt vermutlich auch den Kernskill, weil das Raster in `skill-rework.md`
§1 verlangt, dass der erste Skill einer Fraktion sie allein zum Laufen bringt.

| Skill | Wirkung |
| --- | --- |
| **Anklang** | Die vorige Haltung klingt länger nach — und jeder Stich in diesem Fenster gibt Basis-Score. |
| **Runde** | Die Einklang-Leiste ist schon nach weniger Wechseln voll (§3.1) — der Lauf sammelt also schneller Stufen. |
| **Beschleunigung** | Jeder Wechsel senkt die Schwelle für den nächsten. Schritt **und Boden** sind Stufenwerte. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Anklang** · Nachklang-Stiche (je +100 Basis-Score) | 4 | 5 | 6 | 8 |
| **Runde** · Leiste voll nach … Wechseln (ohne: 10) | 8 | 7 | 6 | 4 + *Einklang +2 Stiche* |
| **Beschleunigung** · Schritt · Boden der Schwelle | −1 · 4 | −1 · 3 | −1 · 2 | −2 · 2 |

**Anklang hat mit §6.14 einen eigenen Körper bekommen** (Owner). Vorher verlängerte er nur, wie lange etwas
anderes gilt — sein ganzer Wert war der Wert fremder Passive, und gemessen kam nichts dabei heraus. Jetzt
zahlen die Stiche im Fenster selbst: **+100 Basis-Score je Stich**, also 400 / 500 / 600 / **800** als Decke.
Der Satz ist flach, die STUFE ist die Länge.

Drei Dinge, die die Regel festlegt: das Fenster wird bei einem zweiten Wechsel **aufgefrischt, nicht
gestapelt** (sonst zahlte Hin-und-Her doppelt); der **Einklang zahlt nicht** (dort klingen alle vier, ohne dass
ein Wechsel stattgefunden hat); und die Decke ist eine Decke — Basis-Score gibt es nur auf einem **Sieg**, bei
rund 57 % Siegquote bringt Episch also eher 450 als 800.

**Beschleunigungs Boden geht nicht auf 1**: bei Schwelle 1 löst jede Farbe mit ihrem ersten Sieg aus, und
dann klingen dauerhaft drei bis vier Haltungen (§6.7). Boden 2 macht die Rotation sehr schnell, ohne in
diesen Zustand zu kippen.

**Runde hat mit §3.1 eine neue Aufgabe bekommen** (Owner). Sie zahlte vorher Basis-Score für die vollendete
Vier-Farben-Runde und sagte damit fast dasselbe wie die Einklang-Leiste selbst; jetzt **verkürzt sie die
Leiste**. Die vollendete Runde bleibt als Zähler bestehen, aber nur noch als Telemetrie.

**Die Linie ist damit durchgehend Tanz-Build.** Alle drei zahlen auf häufiges Wechseln, und sie verstärken
sich gegenseitig: Beschleunigung erzeugt mehr Wechsel, Anklang lässt sie überlappen, Runde macht aus
denselben Wechseln mehr Stufen. Für den Block-Build steht in dieser Linie nichts — und gemessen ist das die
Stelle, an der der Tanz-Build zum ersten Mal etwas zurückbekommt (§6.11).

**Warnung zu Beschleunigung** (§6.7).

**Warnung:** eine Linie, die immer wirkt, wird auch immer genommen. Bei zwei Türen à drei Skills
könnte Rotation die vier Haltungslinien systematisch verdrängen. Beim Bau des Angebots mitdenken.

### 5.4 · Überlappungs-Linie — voll

Passiv: die Überlappung färbt ab, die Nachbarkarte **innerhalb des Segments** erbt eine Stufe.

| Skill | Wirkung |
| --- | --- |
| **Doppelbindung** | Eine Karte darf in zwei Formationen desselben Typs liegen. Der einzige Weg über die ×3-Decke, weil es sonst nur vier Typen gibt — hebt die *Anzahl*, nicht den *Wert*. |
| **Übergriff** | Solange Grün klingt, zählen **alle** Segmentgrenzen als offen. Dazu ein Zuschlag auf den Überlappungsbonus. |
| **Verankerung** | Im **Nachklang** der Haltung zählt jeder Stich einen Score-Multiplikator je Formation an seiner Siegposition. |

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Doppelbindung** · für wie viele Formationstypen | 1 | 2 | 3 | alle 4 |
| **Übergriff** · Zuschlag auf den Überlappungsbonus | +0,3 | +0,4 | +0,55 | +0,7 |
| **Verankerung** · Score-Multiplikator im Nachklang, je Formation | +0,15 | +0,25 | +0,35 | +0,50 |

**Neudesign §5.3 (Owner):** *„Stiche während grün aktiv ist oder nachklingt zählen, als wären alle
Segmentgrenzen offen. Als Leiter: der Überlappbonus wird größer."* Die alte Fassung staffelte die
**Anzahl** der Grenzen (1 / 2 / 3 / alle) und traf damit auf der Normal-Stufe neben jedem anderen
Grenzöffner gar nichts. Jetzt ist die **Geste** unbedingt — Grün klingt, alle Grenzen sind offen, für
die Erkennung wie fürs Abfärben — und gestaffelt ist der **Zuschlag**. Beides zusammen wirkt sowohl
auf der Naht (Formationen und Abfärben laufen über die Grenze) als auch überall sonst (jede
Mehrfach-Überlappung ist mehr wert), und der Skill hat damit auf jedem Brett einen Körper.

Der Zuschlag liegt **absolut** auf dem Überlappungsfaktor — dieselbe Achse und dieselbe Rechnung wie
Pflanzes **Verwachsung**, die Stelle im Code ist `overlapPlus` in `formations.js`.

**Zu beachten, nicht entschieden:** Übergriff und **Verwachsung** (`0,4 / 0,7 / 1 / 1,4`) **addieren
sich** auf derselben Achse. Ein Prisma-Pflanze-Build, der beide episch hält, steht bei `+2,1` auf
einem Faktor, dessen Basis `1,5` (zwei Formationen) ist — das ist die Stelle, an der diese Paarung
zuerst wegläuft. Übergriffs Leiter liegt deshalb **bewusst unter** der von Verwachsung: er bekommt
die offenen Grenzen zusätzlich, ohne dafür zu zahlen. Startwerte, nicht tariert.

**Nachbarschaft zu Pflanze, weiterhin:** **Wurzelgeflecht** (Legendär) hebt die *Anzahl*, **Spalier**
(SK_PLANT_03) öffnet Segmentgrenzen. Spalier, Segmentarbeit (Perk-Familie E) und Durchlass
(Auftragsbeute) überschneiden sich mit Übergriffs Grenz-Hälfte — anders als vorher bleibt ihm daneben
aber der Zuschlag, er ist also nie ein toter Skill-Platz.

**Neudesign §5.3, Verankerung (Owner):** *„Komplett ändern. Im Nachklang bekommen nachklingende Stiche
einen Bonus auf Multi, abhängig von der Anzahl der Formationen, die auf ihnen liegen. Leiter ist der
Bonus."*

Die alte Fassung (Überlappungs-Stufen für ganze Segmente beim **Auslösen** der grünen Haltung) ist
ersatzlos gestrichen, samt `anchorSeg` im Zustand und `anchorPositions` in `formations.js`. **Sie
ändert damit keine Geometrie mehr** — das tun nur noch das Abfärben, Doppelbindung und Übergriff.

Sie ist stattdessen der Gegenpol zu **Genugtuung**: dieselbe Zwei-Phasen-Form (aktiv sammeln, im
Nachklang zahlen), nur auf Grün statt Rot und **multiplikativ statt flach**. Der Zuschlag liegt in
`stanceMult`, nicht in `formMult` — sie ist eine Zahl, keine Geometrie, und das Brett muss dafür nicht
neu gelesen werden.

Gezählt wird `activeFormationCount`: die **zahlenden** Formationen der Siegposition — dieselbe Zahl,
die der Stich anzeigt und die Brennpunkt, Feuerlinie und Spannungsfeld lesen. Die *erste* Karte eines
Laufs trägt Faktor 1 und zählt deshalb nicht mit; das ist die Konvention des Spiels und nicht eine
eigene Lesart dieses Skills.

**Zahlen sind reine Startwerte** (Owner ausdrücklich: *„Balancing muss dann über die Sim gemacht
werden, keine Ahnung, was aktuell hier zu stark oder zu schwach ist"*). Die Leiter
(`+0,15 / 0,25 / 0,35 / 0,50`) war die von **Mitklang**, weil beide dieselbe „je X"-Form haben —
Mitklang ist seither verdoppelt (§5.1), Verankerung steht noch auf den alten Werten.

### 5.5 · Ergebnis-Linie — voll

Passiv: Niederlage → Gleichstand, Gleichstand → Sieg.

**Was das Passiv schon allein tut:** ein Gleichstand bricht die Serie heute nicht, eine Niederlage
schon. „Niederlage → Gleichstand" heißt damit, dass die Serie überlebt, solange die Haltung klingt —
das Passiv ist bereits ein Serienschutz. Und „Gleichstand → Sieg" hebt rund 10 % aller Stiche von tot
auf voll, mit Score, Serie und Farbzähler.

| Skill | Wirkung |
| --- | --- |
| **Genugtuung** | Die rote Haltung sammelt, wie viele Stiche sie gedreht hat. In ihrem **Nachklang** zahlt dann jeder Stich Basis-Score je gedrehtem Stich. |
| **Rückhalt** | Nach einem gerutschten Stich kämpft die nächste Karte mit mehr Wert. |
| **Kehrtwende** | Ein gerutschter Stich gibt **Serienpunkte** und verlängert die Haltung um einen Stich. |

> **Korrektur an Genugtuung.** Ursprünglich stand dort „ein gerutschter **Sieg**". Das zahlt nichts:
> das Passiv schiebt eine Niederlage nur auf Gleichstand, ein gerutschter Sieg war also immer ein
> Gleichstand — und der hat per Definition **Rückstand 0**. Sie liest deshalb **jeden** gerutschten
> Stich; dann trägt die Niederlage ihren Rückstand bei und die Fantasie stimmt.
>
> **SUPERSEDED (§5.3, Owner):** Der Rückstand ist als Kennzahl ganz weg. Genugtuung zählt nur noch
> *wie viele* Stiche gedreht wurden, nicht *wie deutlich* — damit fällt auch das Argument der
> Korrektur oben weg, und mit ihm der einzige Griff im Entwurf, der niedrige Karten wertvoll machte.

**Startwerte:**

| Kennwert | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Genugtuung** · Basis-Score im Nachklang, je gedrehtem Stich | 75 | 120 | 165 | 240 |
| **Rückhalt** · Stichwert der nächsten Karte | +3 | +4 | +6 | +8 |
| **Kehrtwende** · Serienpunkte je gerutschtem Stich | +1 | +2 | +3 | +4 |
| **Kehrtwende** · Verlängerungen je Haltung | höchstens 3× | 4× | 6× | 10× |
| **Kehrtwende** · Satz des Serien-Multiplikators, solange Rot klingt | — | — | — | +0,5 % je Serienpunkt |

**Neudesign §5.3, Genugtuung (Owner):** *„Ändern in extra Score auf jeden Stich im Nachklang, für
jeden gedrehten Stich während der Haltung. Und verdreifache die aktuellen Basis-Score-Werte."*
(25/40/55/80 → **75/120/165/240**.)

Sie hat damit **zwei Phasen**. Solange Rot aktiv ist, wird nur gezählt (`turns`); im **Nachklang**
zahlt dann jeder Stich `Satz × gedrehte Stiche` Basis-Score. Die Haltung sammelt ihre Genugtuung an
und holt sie sich, wenn sie schon abgelöst ist — das ist die Geste, und es ist der erste Skill der
Fraktion, dessen Ertrag ausdrücklich *nach* seiner Haltung liegt.

Der Zähler **überlebt die Ablösung** und fällt erst, wenn Rot gar nicht mehr klingt. Anders wäre er im
Nachklang, der ihn auszahlen soll, schon auf 0. Er läuft im Nachklang weiter mit: dort gerutschte
Stiche erhöhen ihn, der Nachklang zahlt sich also leicht selbst hoch.

Basis-Score gibt es nur auf einem **Sieg**, wie bei Anklang — „jeder Stich" ist die Decke, nicht der
Erwartungswert.

**Größenordnung, nicht tariert.** Ein normaler Sieg hat 400 Basis-Score. Vier gedrehte Stiche und
Episch sind `4 × 240 = 960` zusätzliche Basis **je Stich** des Nachklangs — mehr als das Doppelte
eines Siegs, und das läuft durch den ganzen Multiplikator-Stapel. Dazu kommt, dass jeder Verlängerer
den Nachklang länger macht. Das ist die Stelle, an der die rote Linie zuerst wegläuft.

Kehrtwendes Deckel liegt bewusst **über** dem von Schwungrad (2/3/5/8), weil ihre Rate niedriger ist
und sie strukturell nicht weglaufen kann (§6.5). Die beiden Deckel sind **getrennt**: „höchstens 10×"
ist Kehrtwendes eigener, nicht ein gemeinsamer — beide episch gehalten ergeben die 18 aus §6.5.

**Neudesign §5.3 (Owner):** *„Zusatz als Leiter: gerutschte Stiche geben +1, +2 usw. mehr Serie."*
Die Verlängerung bleibt daneben bestehen; der Skill trägt jetzt **zwei** gestaffelte Zahlen.

Der Grund: die Verlängerung allein war ein Körper, der nichts wiegt. Sie zahlt in **Dauer**, und Dauer
ist bei Prisma die meistumkämpfte Währung (Leiste, Anklang, Schwungrad, Selbst-Auslösen zahlen alle
dorthin). Die Serie ist dagegen die Achse, auf der ein gedrehter Stich tatsächlich etwas dreht, und
sie ist im Mischbuild genauso wertvoll wie im Mono — anders als die Dauer.

Sie liest **jeden** gerutschten Stich, wie Genugtuung:

- die zum **Gleichstand** gehobene Niederlage gibt die Punkte **aus dem Stand** — ohne den Skill
  rührt sich die Serie dort gar nicht (ein Gleichstand bricht sie nicht, hebt sie aber auch nicht);
- der gerutschte **Sieg** gibt sie **zusätzlich** zu seinem eigenen Serienpunkt.

Die Punkte kommen **nach** der Wertung ihres Stichs, wie beim Serienanker und bei der Crit-Folge — sie
wirken ab dem nächsten. Zu beachten: auf einem gerutschten Gleichstand steigt damit die *Siegesserie*,
obwohl der Stich keiner ist. Das ist genau die Geste („eine Kehrtwende"), aber es ist die Stelle, an
der ein Build mit großem Serien-Multiplikator zuerst wegläuft — Startwerte, nicht tariert.

**Episch, dritte Zahl (Owner):** *„Episch soll außerdem den Serien-Multi erhöhen, ein kleines
bisschen."* Gehoben wird der **Satz**, nicht das Ergebnis: jeder Serienpunkt zählt `+0,5 %` statt der
`+2 %` aus `STREAK_BASE_STEP`. Der Deckel bei `+150 %` bleibt, wo er ist — der höhere Satz erreicht ihn
nur früher (Serie 60 statt 75) und kann nie darüber hinaus. Die Wirkung ist damit **strukturell
begrenzt**, ohne dass es dafür eine Sonderregel braucht.

| Serie | ohne | mit |
| --- | --- | --- |
| 10 | ×1,20 | ×1,25 |
| 25 | ×1,50 | ×1,63 |
| 50 | ×2,00 | ×2,25 |
| 60 | ×2,20 | ×2,50 *(Deckel)* |
| ab 75 | ×2,50 | ×2,50 |

**Angenommen, nicht entschieden:** der Owner hat keine Bedingung genannt. Gebaut ist sie als Passiv
der roten Haltung — sie zahlt nur, **solange Rot klingt**, wie jeder andere Skill der Fraktion in
seiner eigenen Haltung. Damit bleibt **Grundrauschen der einzige Skill, der außerhalb seiner Haltung
wirkt** (§4.1). Soll sie stattdessen unbedingt gelten, ist das eine Zeile.

> **Nachtrag (§5.3):** Grundrauschen ist seither nicht mehr nur die *Ausnahme*, sondern ganz
> haltungsunabhängig — es addiert sich auf das blaue Passiv, statt es zu ersetzen.

`+0,5 %` ist ebenfalls Startwert — „ein kleines bisschen" ist ein Viertel des Grundsatzes.

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

### 6.3 · Übertrag hebt die Critrate auf ⅔ — SUPERSEDED (§5.3)

> Galt für die alte Fassung (ein Crit springt auf die nächsten Stiche über). Seit dem Neudesign hebt
> Übertrag den Crit-MULTIPLIKATOR und die Critrate gar nicht mehr. Die Rechnung unten und die Zeile
> „⅔ (mit Übertrag)" in §6.4 sind damit hinfällig; ohne Übertrag steht die Critrate der blauen
> Haltung bei den 50 % des Passivs.

Ohne Kette: nach einem Crit ist der nächste sicher, nach einem übergesprungenen würfelt man wieder.
Im stationären Zustand crittet damit **zwei von drei Stichen** statt einem von zwei.

### 6.4 · Schwungrad — wo es bricht

Schwungrad verlängert die Haltung je Crit um einen Stich, die Zeit läuft aber weiter. Die Haltung
hält, solange sie schneller verlängert wird, als sie abläuft. Im Erwartungswert:

> **Haltungsdauer ≈ 3 / (1 − Critrate)**

| Critrate | Dauer |
| --- | --- |
| 50 % (Passiv allein) | 6 Stiche |
| ⅔ *(galt mit dem alten Übertrag, §6.3)* | 9 Stiche |
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

### 6.8 · Was die erste Messung sagt — **gemessen**

Der Entwurf ist gebaut und läuft in der Sim (`--mode motor --arch stance`, `--mode skills --arch stance`). Drei
Befunde, alle drei unbequem.

**A · Die Fraktion liegt weit unter dem Feld.** Mono, gieriger Spieler, dieselben 25 Seeds (Stand VOR dem
Verlängerer-Fix aus §6.9; danach steht Prisma bei 4.743.795, der Abstand bleibt):

| Fraktion | Median | p90 | p90 ÷ Median |
| --- | --- | --- | --- |
| Eis | 155.237.412 | 1.363.871.385 | 8,8 |
| Blitz | 105.236.611 | 358.536.343 | 3,4 |
| Pflanze | 43.587.934 | 688.730.160 | 15,8 |
| Feuer | 17.422.914 | 112.650.960 | 6,5 |
| **Prisma** | **4.026.085** | **6.632.749** | **1,6** |

Faktor 4,3 unter der schwächsten der vier, Faktor 39 unter der stärksten. Die Spalte rechts sagt, warum:
**die Fraktion hat keinen Sammler.** Hitze, Wachstum, Stapel und Gletschermasse wachsen über den Lauf; die
Haltungen setzen ihren Zähler alle fünf Siege auf null. Jeder ihrer vier Werte ist flach, je Stich und
begrenzt — es gibt nichts, was sich aufbaut, und entsprechend keinen Schwanz nach oben. Das beantwortet §8
Punkt 2 („eigener Ertrag?") nicht als Geschmacksfrage, sondern als Messung.

**B · Die Build-Achse aus §2.1 existiert, ist aber einseitig.** Drei feste Builds, je 20 Läufe:

| Build | Median | Wechsel | Stiche je Wechsel | Ø klingende Haltungen | ×Form je Sieg | gleichfarbige Nachbarn |
| --- | --- | --- | --- | --- | --- | --- |
| Campen (Blöcke) | 4.524.607 | 257 | 8,0 | 1,17 | 2,59 | 33 % |
| Tanzen (bunt) | 3.463.553 | 351 | 6,0 | 1,23 | 1,96 | 0 % |
| Überlappung | 4.916.004 | 251 | 8,1 | 1,10 | 3,47 | 32 % |

Bunt bauen erzeugt tatsächlich mehr Wechsel (+37 %) — und kostet dafür ein Viertel des Scores, weil die
Formationen wegbrechen (×Form 2,59 → 1,96, Formations-Siege 74 % → 54 %). Der Preis aus §2.1 ist also da. Was
er einkauft, ist fast nichts: **+0,06 gleichzeitig klingende Haltungen.**

**C · Die Überlappungs-Fantasie ist im Regelwerk nicht erreichbar.** In 81–91 % der Stiche klingt genau EINE
Haltung. Alle vier gleichzeitig: **0,1–0,4 % der Stiche.** Der Grund ist strukturell und steht schon in §2:
Überlappung entsteht nur, wenn zwei *Wechsel* innerhalb der Mindestdauer fallen — Wechsel kommen aber alle
6–8 Stiche, die Mindestdauer ist 3. Und die vier Zähler **entsynchronisieren sich von selbst**: wer auslöst,
fällt auf 0 zurück, während die anderen weiterzählen. Sie pendeln sich auf gleichmäßige Abstände ein, egal wie
das Brett liegt.

Geprüft, ob ein Regler das hebt (je 10 Läufe, Build „Tanzen"):

| Mindestdauer | 3 | 5 | 8 | 12 |
| --- | --- | --- | --- | --- |
| Ø klingend | 1,26 | 1,20 | 1,36 | 1,36 |

| Schwelle | 5 | 4 | 3 | 2 |
| --- | --- | --- | --- | --- |
| Ø klingend | 1,26 | 1,20 | 1,21 | 1,17 |

Die Schwelle tut **gar nichts** (sie beschleunigt alle vier Zähler gleichmäßig), die Mindestdauer bringt bis
1,36 und sättigt dann. Anklang Episch (8) ist also bereits das Ende der Fahnenstange.

#### 6.8.1 · Der Nachklang — **entschieden**

Im Verlauf standen zwei Formulierungen, und sie ergaben verschiedene Spiele:

- **A** — Mindestdauer **ab dem Auslösen**. Eine Haltung, die lange aktiv war, hat sie verbraucht und verstummt
  mit der Ablösung. Überlappung entsteht nur, wenn zwei *Wechsel* dicht aufeinanderfolgen.
- **B** — Nachklang **ab dem Wechsel**: *„die alte Haltung wirkt noch in die neue hinein."* Jeder Wechsel
  erzeugt Überlappung.

**Der Owner hat B gesetzt.** Gemessen, dieselben 20 Seeds:

| Build | A · Median | A · Ø klingend | A · 2+ Haltungen | B · Median | B · Ø klingend | B · 2+ Haltungen |
| --- | --- | --- | --- | --- | --- | --- |
| Campen | 5.300.774 | 1,25 | 23 % | **6.878.269** | **1,76** | **58 %** |
| Tanzen | 3.645.630 | 1,26 | 22 % | **4.992.161** | **1,74** | **55 %** |
| Überlappung | 5.044.064 | 1,13 | 11 % | **6.814.465** | **1,54** | **45 %** |

B **verdoppelt die Fraktion mono** (4.743.795 → 9.658.869) und macht die Überlappung erst zu einer Mechanik:
aus 11–23 % werden 45–58 % der Stiche mit zwei oder mehr klingenden Haltungen, drei zugleich in 8–15 %, alle
vier in 0,7–2,4 %. Die grüne Geometrie schlägt jetzt durch (×Form im Block-Build 2,86 → 4,42).

Nebenwirkung, die damit erledigt ist: die frühere Annahme in §8, ein Selbst-Auslösen frische die Mindestdauer
auf, hat keinen Gegenstand mehr. Der Nachklang entsteht ausschließlich beim Wechsel; ein Selbst-Auslösen hält
nur den Zähler unten.

### 6.10 · Erste Paar-Erkundung — **gemessen, grob**

Je 30 Seeds, Fraktions-Policy, keine Tarierung. Das Bild ist ein Gefühl, kein Urteil.

| Paar | Median | p90 | Siegquote | gegen den stärkeren Mono | gegen den schwächeren |
| --- | --- | --- | --- | --- | --- |
| Feuer + Eis | 27.058.760 | 91.200.383 | 64,5 % | −80 % | +38 % |
| **Feuer + Prisma** | 15.360.042 | 26.128.418 | 67,4 % | **−22 %** | +59 % |
| Pflanze + Blitz | 28.904.993 | 67.116.383 | 62,9 % | −72 % | −33 % |
| Pflanze + Prisma | 22.382.449 | 46.182.894 | 59,0 % | −48 % | +132 % |
| **Prisma + Blitz** | 24.862.857 | 65.457.608 | **70,4 %** | −76 % | +157 % |

Mono zum Vergleich: Eis 133.246.931 · Blitz 104.205.158 · Pflanze 43.320.034 · Feuer 19.581.167 ·
**Prisma 9.658.869**.

**Jedes** Paar liegt unter seinem stärkeren Mono, auch die beiden ohne Prisma (Feuer+Eis −80 %,
Pflanze+Blitz −72 %). Mischen kostet in diesem Spiel — das ist der Boden, gegen den zu lesen ist, kein
Prisma-Effekt.

Was daraus heraussticht:

- **Feuer + Prisma ist die günstigste Mischung im Feld** (−22 %). Das ist zugleich ein schwaches Kompliment:
  der Abstand ist klein, weil Feuer der schwächste der vier ist.
- **Prisma + Blitz hat die beste Siegquote aller Paare** (70,4 %). Die rote Leiter und Blitz' Crit greifen
  ineinander — Blau addiert +50 % Crit-Chance auf ein Deck, das ohnehin crittet, und der Überschuss über 100 %
  wird zu Crit-Multiplikator (§2).
- **Prisma gewinnt von jedem Partner mehr, als es gibt** (+59 % bis +157 %, während der Partner 22–76 %
  verliert). Das ist die Signatur einer Fraktion ohne eigenen Motor — dieselbe Ursache wie §6.8 A.
- **Die in §2.2 vorhergesagte Pflanze-Explosion tritt nicht ein.** Pflanze + Prisma liegt mit 22,4 Mio im
  Mittelfeld der Paare, nicht darüber. Der Hebel („das Brett liest sich als ein grüner Farbblock, die
  Grundfarben bleiben bunt") existiert, trägt aber nicht weit genug, um etwas zu sprengen.

### 6.11 · Die Leiste, gemessen — **gemessen**

Dieselben 20 Seeds, feste Builds, vor und nach §3.1:

| Build | vorher | **nachher** | Einklang je Lauf | Stufe am Ende | Ø klingend | alle vier klingen |
| --- | --- | --- | --- | --- | --- | --- |
| Campen | 6.878.269 | **13.863.252** | 25,9 | 25,9 → ×1,52 | 1,89 | 6,6 % |
| Tanzen | 4.992.161 | **9.956.149** | **48,3** | **48,3 → ×1,97** | 1,93 | **10,1 %** |
| Überlappung | 6.814.465 | **12.081.678** | 25,4 | 25,4 → ×1,51 | 1,61 | 4,6 % |

**Die feste Aufstellung verdoppelt sich durchweg.** Und der Tanz-Build bekommt endlich etwas zurück: 48
Füllungen gegen 26 sind fast doppelt so viele Stufen, und alle vier Haltungen klingen bei ihm in 10 % der
Stiche gegen 6,6 % beim Campen. Die §2.1-Achse hat zum ersten Mal zwei Seiten, die beide etwas gewinnen.

**Aber der Zufallsspieler bewegt sich kaum:** mono mit der Fraktions-Policy 9.658.869 → **10.077.052**,
also +4 %. Der Grund ist der Tausch bei Runde. Die alte Runde zahlte Basis-Score bedingungslos, und davon
profitierte ein zufälliger Build voll; die neue Stufe muss erspielt werden. Wer auf sie hinspielt, verdoppelt —
wer sie nur mitnimmt, steht fast auf der Stelle. Das ist die gewollte Richtung, aber es heißt auch: **die
Fraktion ist jetzt deutlich stärker vom Können abhängig als vorher.**

Stand gegen das Feld, mono, 30 Seeds:

| Fraktion | Median | p90 ÷ Median |
| --- | --- | --- |
| Eis | 133.157.074 | 8,2 |
| Blitz | 104.205.158 | 3,0 |
| Pflanze | 43.739.781 | 7,5 |
| Feuer | 19.581.167 | 5,4 |
| **Prisma** | **10.077.052** | **1,8** |

Der Abstand zu Feuer ist von Faktor 2,0 auf 1,9 geschrumpft — die Lücke ist also **nicht** geschlossen.
**Der Satz je Stufe (0,02) ist der Haupt-Regler dafür** und bewusst niedrig gewählt; er gehört gemessen, nicht
geschätzt.

**Zur Herkunft dieser Zahlen:** alle fünf Zeilen sind in derselben Sitzung, mit demselben Skript, denselben
Seeds (1–30) und derselben Policy gerechnet — keine übernommenen Altwerte. Die vier oberen sind gegen
`origin/exp` gegengeprüft und dort **bitgleich**; die Fraktion ist also vollständig hinter `activeArchetypes`
gekapselt. Der Vergleich ist damit intern gültig.
**Er ist aber nicht mit den Zahlen in `skill-rework.md` §8 vergleichbar**: das sind Duell-Läufe in gemischter
Welt (einstellige Millionen), diese hier sind Mono-Läufe mit der Fraktion allein im Angebot und 13 gehaltenen
Skills. Und es ist die ZUFÄLLIGE Fraktions-Policy, nicht der kompetente Spieler — der liegt bei Prisma rund
7 % darüber (§6.9).

### 6.12 · Duos, Trios, Quartette — **gemessen**

Alle 10 Duos, alle 10 Trios und alle 5 Quartette, je 30 Seeds, Fraktions-Policy mit Slot-Split.
Mono zum Bezug: Eis 133.157.074 · Blitz 104.205.158 · Pflanze 43.739.781 · Feuer 19.581.167 ·
**Prisma 10.077.052**.

**Die vier stärksten Trios enthalten alle Prisma**, und das beste ohne (Blitz+Pflanze+Feuer, 33.159.776)
liegt unter der Hälfte des besten mit (Blitz+Pflanze+Prisma, 72.007.741). Bei den Duos stehen zwei
Prisma-Paare an der Spitze; Blitz+Prisma ist mit 44.999.054 das stärkste Duo im Feld.

Am schärfsten zeigt es der Zuwachs, den Prisma als DRITTE Fraktion zu einem bestehenden Duo bringt:

| Duo | + Prisma | Zuwachs | zum Vergleich: + Feuer |
| --- | --- | --- | --- |
| Blitz + Feuer | 65.319.755 | **+159 %** | — |
| Blitz + Pflanze | 72.007.741 | **+148 %** | +14 % |
| Pflanze + Feuer | 57.566.341 | **+89 %** | — |
| Eis + Feuer | 44.190.438 | +63 % | — |
| Eis + Pflanze | 27.156.204 | +44 % | +18 % |
| Eis + Blitz | 31.767.033 | +41 % | −3 % |

**Prisma ist als Beimischung zwei- bis fünfmal so viel wert wie jede andere Fraktion.**

Und am Deckel des echten Spiels (`MAX_ARCHETYPES` = 4) ist das Quartett OHNE Prisma das schwächste
von allen fünf:

| Quartett | Median | Siegquote |
| --- | --- | --- |
| ohne Eis | **70.015.649** | 67,6 % |
| ohne Feuer | 47.209.826 | 65,3 % |
| ohne Blitz | 43.120.499 | 61,7 % |
| ohne Pflanze | 36.443.933 | 68,0 % |
| **ohne Prisma** | **27.849.925** | 65,0 % |

#### Warum — und warum das ein Problem ist

Die Ursache ist eine Regel aus §2, vom Owner gesetzt: **„Alle vier Haltungen laufen ab dem ERSTEN Skill
der Fraktion. Die vier Grundwerte stehen und skalieren NICHT mit der Zahl gehaltener Skills."**

Prisma ist damit die einzige Fraktion, deren Passive bei **einem** Skill schon auf voller Stärke sind.
Hitze, Wachstum, Stapel und Gletschermasse brauchen Picks, um etwas zu leisten; Rot, Blau, Grün und Gelb
nicht. Ein einziger Slot kauft das ganze Passiv-Paket — und genau deshalb kostet die Verdünnung, die jede
andere Fraktion hart trifft, Prisma fast nichts.

Der Mono-Befund aus §6.11 dreht sich damit um: **schwächster Mono, stärkster Mischer.**

**Das ist die Signatur eines Pflicht-Picks.** Ein Slot, der in jedem Deck +41 bis +159 % bringt, wird immer
genommen, und dann ist die Wahl keine mehr. **Offene Frage an den Owner** (sie ist größer als ein
Zahlenregler): soll das Passiv-Paket bei einem Skill voll sein — oder mit der Zahl gehaltener
Fraktions-Skills wachsen, wie Blitz es tut?

**Einschränkungen:** 30 Seeds, zufällige Policy mit Slot-Split (ein balancierter Mischer, kein echter
Spieler), schwere Verteilungsschwänze — die Mediane tragen, die p90-Spalte nicht.

### 6.13 · Was der Einklang allein wert ist — **gemessen**

Ablation über `SIM_STANCE_EINKLANG=0`: die Leiste füllt sich weiter und die Stufe steigt weiter, nur der
Moment — alle vier Haltungen klingen gleichzeitig — fällt weg. Kontrolle Eis+Blitz in beiden Läufen
**22.466.244**, bitgleich: der Haken trifft ausschließlich Prisma.

**Feste Builds** (30 Seeds, keine Policy-Divergenz — der sauberste Vergleich):

| Build | mit Einklang | ohne | Wert des Moments |
| --- | --- | --- | --- |
| Campen | 13.376.551 | 9.470.600 | **+41 %** |
| Tanzen | 10.444.790 | 6.930.441 | **+51 %** |
| Überlappung | 13.618.725 | 9.823.748 | **+39 %** |

**Gemischte Builds** (frischer Seed-Satz 1001–1060, N = 60):

| Kombination | mit | ohne | Wert des Moments |
| --- | --- | --- | --- |
| Prisma mono | 13.225.635 | 11.071.804 | +19 % |
| Blitz+Pflanze+Prisma | 55.709.218 | 40.812.541 | +37 % |
| Eis+Blitz+Feuer+Prisma | 50.615.496 | 35.502.577 | +43 % |

**Der Einklang trägt rund 40 % der Fraktion** — und im Tanz-Build am meisten (+51 %), weil dort die
Leiste am häufigsten voll wird. Ø klingende Haltungen fallen ohne ihn von 1,86 auf 1,75 (Campen) und von
1,89 auf 1,71 (Tanzen); „alle vier" von 9,5 % auf 2,1 % der Stiche.

**Ein Messfehler, offen benannt.** Der erste Durchgang lief über dieselben 30 Seeds wie §6.12 und gab
Unterschiede von **−38 % bis +57 %**, mono sogar +29 % OHNE den Einklang. Das war Stichprobenrauschen,
nicht Mechanik: bei p90/Median bis 15 tragen 30 Seeds einen Median, aber keine Differenz zweier Mediane.
Die Zahlen oben stammen deshalb aus festen Builds und einem doppelt so großen, frischen Seed-Satz. **Die
30-Seed-Vergleiche in §6.10 und §6.12 sind aus demselben Grund mit Vorsicht zu lesen** — die Rangfolge
dort ist robust (die Abstände sind groß), einzelne Prozentangaben sind es nicht.

### 6.14 · Die 15 Skills im Duo und Trio — **gemessen, groß**

Sechs gemischte Welten, je eigener Seed-Bereich: **Prisma+Blitz · +Pflanze · +Eis** (Duos) und
**+Blitz+Pflanze · +Blitz+Feuer · +Pflanze+Feuer** (Trios). Je Welt 600 Explore-Läufe, 120 Greedy-Läufe
und für jeden der 15 Skills eine gepaarte Ablation über dieselben 120 Seeds — rund **15.000 Läufe**,
das Zwölffache von §6.9. Die Welt bleibt breit, der Bericht ist auf Prisma verengt (`--only`).

#### A · Der gierige Spieler nimmt die Fraktion, aber nicht ihre Skills

| Welt | Ø Skills gehalten | davon Prisma | Anteil |
| --- | --- | --- | --- |
| Prisma + Blitz | 12,8 | 3,4 | 27 % |
| Prisma + Pflanze | 13,0 | 3,3 | 25 % |
| Prisma + Eis | 13,0 | **1,9** | **15 %** |
| Prisma + Blitz + Pflanze | 12,9 | 3,1 | 24 % |
| Prisma + Blitz + Feuer | 12,7 | 3,3 | 26 % |
| Prisma + Pflanze + Feuer | 12,0 | 2,0 | 17 % |

Im **Duo** stellt Prisma die Hälfte des Angebotstopfs — genommen werden **22 %**. Der kompetente
Spieler schaltet die Fraktion mit zwei, drei Picks ein und gibt den Rest beim Partner aus. Genau das
passt zum Befund aus §6.12: was Prisma im Mischbuild wertvoll macht, sind die **Passive und die
Leiste**, nicht die Skills — die Passive sind ab dem ersten Skill voll, alles Weitere ist optional.

#### B · Vierzehn von fünfzehn liegen im Rauschen

Median des Ablations-Effekts; `pos/6` = in wie vielen der sechs Welten der Skill positiv maß (bei
reinem Rauschen wären 3 zu erwarten).

| Skill | Halte | Duos | Trios | alle 6 | pos/6 | Spanne je Welt |
| --- | --- | --- | --- | --- | --- | --- |
| Doppelbindung | 21 % | 4 % | 10 % | **7 %** | 6/6 | 3 % … 40 % |
| Schwungrad | 15 % | 10 % | 2 % | **6 %** | 4/6 | -39 % … 77 % |
| Beschleunigung | 45 % | 11 % | -2 % | **2 %** | 4/6 | -2 % … 25 % |
| Runde | 14 % | -0 % | -0 % | **-0 %** | 2/6 | -20 % … 42 % |
| Rückhalt | 10 % | 4 % | -6 % | **-1 %** | 3/6 | -46 % … 33 % |
| Mitklang | 14 % | 4 % | -7 % | **-1 %** | 3/6 | -17 % … 31 % |
| Grundrauschen | 18 % | -3 % | -0 % | **-2 %** | 2/6 | -13 % … 126 % |
| Übertrag | 17 % | -10 % | 6 % | **-2 %** | 3/6 | -23 % … 20 % |
| Verankerung | 17 % | -11 % | -1 % | **-3 %** | 2/6 | -15 % … 4 % |
| Genugtuung | 6 % | -5 % | -2 % | **-4 %** | 1/6 | -64 % … 3 % |
| Stauung | 18 % | -4 % | 0 % | **-4 %** | 2/6 | -32 % … 36 % |
| Beharrlichkeit | 14 % | -3 % | -5 % | **-4 %** | 1/6 | -64 % … 40 % |
| Kehrtwende | 11 % | -2 % | -13 % | **-9 %** | 1/6 | -43 % … 8 % |
| Übergriff | 12 % | -21 % | 1 % | **-10 %** | 3/6 | -39 % … 8 % |
| Anklang | 17 % | -12 % | -8 % | **-10 %** | 2/6 | -60 % … 8 % |

**Genau ein Skill trägt ein sauberes Signal: Doppelbindung** — positiv in **6 von 6** Welten (bei
reinem Zufall 1,6 % Wahrscheinlichkeit), im Trio +10 %. Dass ausgerechnet er es ist, passt: er hebt
die Überlappungs-ANZAHL, und die Überlappung ist die einzige Achse, auf der Prisma multiplikativ mit
dem Rest des Spiels zusammenwirkt.

Beschleunigung und Schwungrad stehen bei 4/6 — das ist nicht vom Zufall zu trennen. Alle übrigen
zwölf liegen bei 1/6 bis 3/6 und mit Median zwischen −10 % und +0 %.

**Die rechte Spalte ist die wichtigste.** Schwungrad reicht von −39 % bis +77 %, Grundrauschen von
−13 % bis +126 %, Anklang von −60 % bis +8 %. Bei 120 gepaarten Läufen und diesen Verteilungen sagt
eine EINZELNE Welt nichts; nur das Vorzeichen über sechs Welten trägt. Wer aus dieser Tabelle eine
einzelne Prozentzahl zitiert, zitiert Rauschen.

#### C · Was das heißt

Die Rotations-Linie, die in der Mono-Welt allein +32 % trug (§6.9), ist im Mischbuild ebenfalls
verschwunden (Beschleunigung +2 %, Anklang −10 %, Runde −0 %). **Prisma hat im Duo und Trio derzeit
keine Skills, die etwas entscheiden** — es hat vier Passive, eine Leiste und fünfzehn Beigaben.

Das ist kein Tarier-, sondern ein Entwurfsbefund, und er hängt an derselben Wurzel wie §6.12: solange
die Passive bei einem Slot voll sind, gibt es keinen Grund, einen zweiten zu investieren.

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

**Drei Punkte sind seither entschieden** (Owner) und stehen dort, wo sie beim Bauen gelesen werden:
ein gerutschter Sieg zahlt **voll** (§3), **Übergriff wirkt auf einer schon offenen Grenze nicht**
(§5.4), und die **Haltungen bekommen vorerst keine eigenen Namen** — sie laufen über ihre Farbe (§3).

> **SUPERSEDED IN PART (§5.3, Owner):** Der mittlere Punkt gilt nicht mehr. Übergriff wählt keine
> Grenzen mehr aus — solange Grün klingt, sind **alle** offen, und die Stufe staffelt stattdessen
> einen Zuschlag auf den Überlappungsbonus. Auf einer ohnehin offenen Grenze gewinnt er weiterhin
> nichts, aber der Skill ist deswegen nicht mehr wirkungslos (§5.4).

**Werte und Design, offen:**

1. **Hat die Fraktion einen eigenen Ertrag?** Feuer hat `fireBase`, Pflanze `plantBase`, Blitz
   `lightYield`, Eis `glacierYield` — jede Fraktion trägt einen eigenen Score-Kanal. Diese hier
   beugt nur Regeln. Ob das ein Mangel ist oder die Pointe, ist offen.
2. **Paare oder Drei** — wie viele Haltungen gleichzeitig klingen dürfen. Bewusst offen bis Skills
   und Balancing stehen.
3. **Name und Thema.** „Echo" ist belegt (Kopf dieses Dokuments). Vier Fraktionen sind Elemente, diese
   wäre ein Konzept — die Genre-Recherche im Repo nennt das Elementar-Skin „das generischste im
   Feld", der Bruch wäre also möglicherweise ein Gewinn.
4. **Drei Legendäre.** Nach Owner-Plan erst, wenn die Sim erste Zahlen gegen die anderen Decks
   geliefert hat.
5. **Die Startwerte selbst** (§5) sind Startwerte, kein Tarierstand — nichts davon ist gemessen.

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

**Gebaut und gemessen.** Die Fraktion läuft in der Sim (`--mode motor --arch stance`,
`--mode skills --arch stance`), die Zahlen stehen in §6.8 und §6.9. Damit ist Schritt 1 des Owner-Plans erledigt
— und er hat drei Fragen aufgeworfen, die vor dem Entwurf der Legendären beantwortet gehören:

1. ~~Welche Lesart des Nachklangs gilt?~~ **Entschieden: ab dem Wechsel** (§6.8.1). Sie hat die Fraktion mono
   verdoppelt und die Überlappung erst zu einer Mechanik gemacht.
2. ~~Bekommt die Fraktion einen Sammler?~~ **Entschieden: die Einklang-Leiste** (§3.1). Die festen Builds haben
   sich verdoppelt; der Abstand zu Feuer ist aber nur von Faktor 2,0 auf 1,9 gefallen (§6.11). Offen bleibt
   daher der **Satz je Stufe** — er ist der Haupt-Regler und gehört gemessen.
3. **Was wird aus den vier Haltungslinien?** (§6.9) Acht ihrer zwölf Skills maßen null oder negativ, während
   die Rotations-Linie allein +32 % trug. Das ist die Warnung aus §5.3, eingetreten — die Messung stammt
   allerdings noch aus der alten Nachklang-Lesart und gehört wiederholt, bevor daraus etwas folgt.
4. **Skalieren die Passive mit der Skill-Zahl?** (§6.12) Heute nicht — und deshalb ist Prisma als
   Beimischung zwei- bis fünfmal so viel wert wie jede andere Fraktion, während das Quartett ohne sie das
   schwächste von fünf ist. Die größte offene Frage nach der Messung, und eine Regel-, keine Zahlenfrage.

Erst danach **die drei Legendären** — bewusst zuletzt, damit sie sich an einem gemessenen Stand messen.

Die Zahlen in §5 sind Startwerte zum Bauen, nicht zum Verteidigen.

### 10.1 · Work-Order für Schritt 1

Für eine frische Session zum Kopieren. Branch und Worktree vergibt der Owner beim Start
(`AGENTS.md` — *Session placement*). Der Auftrag steht deutsch, weil er auf die deutsche
Design-Sprache dieses Dokuments zeigt; Code und Commits bleiben englisch.

> **Auftrag.** Die fünfte Fraktion („Haltungen") so weit implementieren, dass die Sim sie messen
> kann — gegen die bestehenden vier. **Noch keine Legendären**, die kommen nach den ersten Zahlen.
>
> **Zuerst lesen:** `AGENTS.md` · dieses Dokument als vollständige Spezifikation ·
> `docs/skill-rework.md` §1 für das Stufen-Raster, dem die Tabellen in §5 folgen.
>
> **Umfang.** Fraktionsmodul nach Vorbild `src/game/factions/*.js` · Stufentabellen in `skills.js`
> wie BLITZ/FEUER/EIS/PFLANZE · Haltungs-Substate (vier Farbzähler auf der **Grundfarbe**, aktive
> Haltung, Restdauer je klingender Haltung) · Anbindung der vier Passive in `resolveTrick` ·
> Sim-Anbindung, mono und gemischt messbar · Tests im Stil der bestehenden Fraktions-Tests.
>
> **Code-Identifier:** `stance`. Der spielersichtbare Fraktionsname ist **nicht** entschieden — kein
> Name in Spielertexte, und „Echo" ist belegt (§8.1).
>
> **Ausdrücklich nicht im Umfang.** Die drei Legendären · ein `deckUnlock`-Knoten in
> `progression.js` (Migrationsfalle, §9 — die Fraktion bleibt vorerst über `unlockedArchetypes`
> erreichbar, wie Eis es war) · UI-Politur, den Grundfarben-Punkt (§2.2) nur so weit, wie die
> Messung ihn braucht.
>
> **Nähte, die schon da sind:** die Tabelle in §9 — nichts davon neu bauen. Der teure Eingriff ist
> `computeFormations`, ebenfalls §9; die Sim spielt Millionen Stiche, Performance im Blick behalten.
>
> **Hazard:** die Source-Text-Ratchet-Tests aus `AGENTS.md`. Neue Skills und Registry-Einträge lösen
> dort Guards aus. Guards nicht aufweichen, um grün zu werden.
>
> **Gates:** `npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db`.
> Dazu `npm run loc:export`, sobald Spielertexte dazukommen, und der `VITE_PREVIEW`-Build, falls
> preview-gegateter Code berührt wird.
>
> **Ergebnis:** ein Sim-Lauf, der die Fraktion mono und in Paaren gegen die bestehenden vier stellt,
> im Format von `skill-rework.md` §8, damit die Zahlen vergleichbar sind.
