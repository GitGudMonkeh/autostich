# Fraktion 5 — Brainstorm (exp)

> **Status: BRAINSTORM.** Kein Beschluss, keine Zahlen, keine Messung. Zweck ist die *Exploration* —
> welcher Designraum ist noch frei, und welche Mechaniken passen in die Maschine, die auf `exp` steht.
> Nichts hier ist gesetzt, bevor der Owner es nach *Gesetzt* schiebt.
>
> Stand: 2026-09-17 · Basis: `origin/exp` (`e816c554`) · Auftrag des Owners: „neues Deck designen, nur
> Brainstorm, Exploration von möglichen Mechaniken und Skills, keine Messungen."
>
> **Lesart „Deck":** hier als **Fraktion** gelesen — der Progressions-Baum nennt jede Fraktion ein Deck
> (`iceDeck`, `plantDeck`), und „Mechaniken und Skills" gibt es nur dort. Sollte der Owner das kosmetische
> Deck (`themes.js`) gemeint haben, ist dieses Dokument die falsche Antwort.
>
> Sprache Deutsch, wie `docs/skill-rework.md`, `docs/stein-fraktion.md` und `docs/muenz-oekonomie.md` —
> Fraktions-, Skill- und Ressourcennamen sind Produktsprache, und der Owner schreibt hier mit. Bewusste
> Abweichung von der Engineering-Sprache in `AGENTS.md`, nur für dieses Dokument.

---

## 1 · Wo wir stehen

Vier Fraktionen, je 15 Skills mit vier Stufen (Normal · Selten · Sehr selten · Episch) und drei Legendäre.
Das Angebot läuft über **zwei Türen** à drei Fraktionssymbolen; `MAX_ARCHETYPES = 4` sind gleichzeitig
aktiv. `docs/skill-rework.md` §2 führt „Fraktion 5" und „Fraktion 6" als leere Zeilen — **sechs ist das
erklärte Ziel**, fünf ist der nächste Schritt.

| | Ressource | Wo sie liegt | Multiplikator, den sie besitzt | Zeitprofil |
|---|---|---|---|---|
| **⚡ Blitz** | Ladung → Stapel | eigene Karten (dauerhaft) | **Crit** (Chance + Multiplikator) | schubweise |
| **🔥 Feuer** | Hitze (flüchtige Leiste) | global | **heatMult** — gedeckelt | sofort, volatil |
| **❄ Eis** | Masse je Brettfeld | Brett (8×5), gefrorene Zellen | **keiner** — flache Brüche | aufstauen → Explosion |
| **🌿 Pflanze** | Wachstum je Karte | eigene Karten (nie fallend) | **formationMult** (grüne Farbblöcke) | langsam, verzinst |

Dazu auf `exp`: **Münz-Ökonomie** (`coins.js`, Einnahme aus der Aufstellung), **Aufträge** hinter eigenem
Knopf (`contracts.js`), Architekt statt Shop, Perk-Familien I–IV, Präzision als Crit-Perk-Kategorie.

### Die drei Lehren aus der letzten Bestandsaufnahme

`docs/skill-rework.md` §8 hat 108 800 Läufe vermessen. Drei Befunde sind für eine **neue** Fraktion wichtiger
als jede Einzelzahl:

1. **Wer keinen Multiplikator besitzt, verliert.** Pflanze skaliert vom planlosen zum kompetenten Spieler
   ×185, Blitz ×147 — beide speisen einen Multiplikator (Formation bzw. Crit). Feuers Deckel bremst es auf
   ×15. Eis zahlt flach und steht unten. **Erste Frage an jeden Entwurf: welchen Faktor besitzt er?**
2. **Eine Fraktion darf ihren Partner nicht vergiften.** Eis kostet jede Kombination rund die Hälfte, weil
   der kompetente Spieler es fallen lässt, sobald er die Wahl hat — und der Motor genau diese Masse braucht.
   **Zweite Frage: funktioniert sie noch mit drei bis vier Skills, oder erst mit dreizehn?**
3. **Ein reiner Winrate-Verstärker ist die gefährlichste Sorte Effekt.** Er hilft allen vier anderen
   Fraktionen genauso — und wird damit Pflichtbeimischung statt eigener Weg. (Steht schon in
   `docs/stein-fraktion.md` §6.2, und gilt unverändert.)

---

## 2 · Der freie Designraum

Was **niemand** anfasst — die ehrliche Inventur der Hebel, die noch offen sind:

| Hebel | Stand heute | Warum das interessant ist |
|---|---|---|
| **Die Reihenfolge des Gegnerdecks** (`oppOrder`) | wird jeden Durchlauf frisch gemischt, **völlig unangetastet** | die letzte große Stellschraube. Niemand entscheidet, *wer wem begegnet*. |
| **Der Gleichstand** | ~10 % aller Stiche, **gibt exakt nichts** — kein Score, keine Ressource, kein Zähler | rund 200 tote Stiche je Lauf. Und: **ein Gleichstand bricht die Serie nicht** (`engine.js`, Tie-Zweig: „Serie & Initiative unverändert"). |
| **Die Serie als Fraktions-Achse** | Basis-Serie +2 %/Punkt, Deckel +150 %. Feuersturm und Vorentladung *lesen* sie, niemand *besitzt* sie | der größte Einzelhebel im Spiel und der letzte freie Multiplikator. |
| **Der Überlappungsbonus** (2→×1,5 · 3→×2 · 4→×3) | nur Verwachsung (Pflanze) hebt ihn | multiplikativ auf das Faktor-Produkt — sehr starker, kaum bespielter Hebel. |
| **`initiative`** | wird geführt und angezeigt, **hat keinen mechanischen Effekt** | ein fertiger Zustand ohne Bedeutung. Namensgeber inklusive. |
| **Karten aus dem Deck nehmen** | Deck ist immer 40, Durchlauf immer 40 Stiche | Deck-Thinning ist der klassische Deckbuilder-Hebel, den es hier nie gab. Strukturell teuer. |
| **Die eigene Reihenfolge während des Laufs** | fest, nur die Aufstellungsphase ändert sie (4 Energie) | Bewegung *zwischen* den Durchläufen ist frei. |
| **Kopieren / Wiederholen** | gar nicht vorhanden | kein Echo, kein Duplikat, keine Erinnerung an einen Stich. |
| **Die vier Farben als System** | Farbblock-Formation, drei Farb-Perks, Pflanzen-Grün | niemand spielt die **Rotation** der vier Farben; Pflanze konvergiert nur auf eine. |

**Besetzt und zu meiden:** Brettfeld-Cluster und Bersten (Eis) · Wert schmieden und Brandmarken (Feuer) ·
Stapel und Crit (Blitz) · Wachstum, Grün und grüne Formationen (Pflanze) · Anker, Nachhall und
Formationskern (Architekt/Perks) · Vokabeln **Masse · Wachstum · Schicht · Kern · Sockel · Ladung · Hitze**.

---

## 3 · Sechs Richtungen

Jede im selben Raster. Die ersten drei sind ausgearbeitet, die letzten drei sind Skizzen.

---

### K1 · **Waage** — die Fraktion des Gleichstands

> *Klinge an Klinge. Wer nicht verliert, hat nicht verloren.*

| | |
|---|---|
| **Ressource** | **Gleichgewicht** — steigt mit jedem Gleichstand |
| **Wo sie liegt** | globale Leiste (wie Hitze), aber nie fallend |
| **Multiplikator** | **die Serie** — der letzte freie, und der größte |
| **Zeitprofil** | stetig, mit einem Knick, sobald die Paraden greifen |
| **Braucht Siege?** | nein — sie braucht *Nicht-Niederlagen* |

**Der Kern.** Heute ist der Gleichstand der einzige Ausgang im Spiel, den nichts liest — und zugleich der
einzige, der die Serie **hält**, ohne sie zu erhöhen. Die Waage macht daraus ein System: sie **wandelt
knappe Niederlagen in Gleichstände** und kauft damit die Serie frei.

Der Preis ist eingebaut und braucht keine Sonderregel: **ein Gleichstand zahlt keinen Score.** Du tauschst
den Ertrag eines Stichs gegen den Multiplikator aller folgenden. Genau der Preis, der
`docs/stein-fraktion.md` §6.1 für den Serien-Schutz fehlt.

**Passiv (ohne Skill).** Jeder Gleichstand gibt +1 Gleichgewicht. Ist die Leiste voll, **pariert** sie den
nächsten Stich, den du knapp verlierst — er wird ein Gleichstand — und leert sich. Gleichgewicht zahlt bei
einem Sieg Basis-Score je Punkt.

**Linien und Skills (Arbeitstitel, keine Zahlen):**

- **Parade** — Niederlagen abfangen
  - *Parade* · verlierst du mit höchstens N Wertabstand, wird der Stich ein Gleichstand
  - *Riposte* · die Karte nach einem Gleichstand kämpft mit +Wert
  - *Deckung* · die Parade kostet keine volle Leiste mehr, sondern einen Teil
- **Gleichgewicht** — die Leiste füllen
  - *Ausgleich* · ein Gleichstand gibt Gleichgewicht je Formation an seiner Position
  - *Waagschale* · jede volle Leiste gibt dauerhaft +Basis-Score je Sieg
  - *Stillstand* · zwei Gleichstände in Folge geben die doppelte Ladung
- **Beharrung** — der Multiplikator, den die Fraktion besitzt
  - *Gleichmut* · der Deckel der Basis-Serie steigt
  - *Trägheit* · eine Niederlage halbiert die Serie, statt sie zu löschen
  - *Langmut* · je Serienpunkt über dem alten Deckel zusätzlich Score
- **Spiegel** — Gleichstände *erzeugen* statt abwarten
  - *Spiegelklinge* · deine niedrigste Karte je Segment kämpft mit dem Wert der Gegnerkarte (garantierter Gleichstand)
  - *Pattstellung* · liegt die Karte in einer Wiederholung, zählt ihr Gleichstand als Sieg
  - *Symmetrie* · ein Gleichstand gibt beiden Nachbarn +Wert im nächsten Durchlauf
- **Auszahlung**
  - *Waffengleichheit* · ein Sieg zählt + % je Punkt Gleichgewicht
  - *Endstand* · der letzte Stich eines Durchlaufs zahlt Gleichgewicht als Basis-Score aus
  - *Übergewicht* · Gleichgewicht über der Leiste wird Serienpunkte

**Legendäre (Richtungen):** *Patt* — jeder Gleichstand zählt als Sieg, gibt aber keinen Score ·
*Gleichnis* — deine Serie fällt nie unter die Hälfte ihres Höchststands · *Waage der Welt* — Gleichgewicht
ersetzt den Serien-Deckel vollständig.

**Warum das gut passt.** Es kostet **null neue Systeme**: der Gleichstand existiert, die Serie existiert,
`initiative` und `tieArmed` liegen bereit. Der einzige echte Eingriff ist der Niederlage-Zweig in
`resolveTrick` — dieselbe Naht, die Stein bräuchte, aber mit Preis statt ohne.

**Wo es brechen kann.**
1. **Die Serie ist der größte Hebel.** Eine Fraktion, die sie schützt, ist für *jede* Beimischung
   attraktiv — das Winrate-Verstärker-Problem in neuer Kleidung. Bremse: die Parade kostet den Stich-Score,
   und nur Karten unter einer Schwelle parieren.
2. **Gleichstände werden seltener, je stärker dein Deck wird.** Sobald Karten über 10 stehen, fallen
   Gleichstände strukturell weg — die Fraktion baut sich selbst ab. Das ist entweder ein elegantes
   Verfallsdatum oder ein Konflikt mit jedem A-Perk. **Das ist die zentrale offene Frage des Entwurfs.**
   Ausweg wäre, die Ressource an die *Parade* zu hängen statt an den natürlichen Gleichstand.
3. **Unsichtbarkeit.** „Ich habe nicht verloren" ist ein schwächeres Gefühl als „es hat geknallt". Braucht
   ein eigenes Kartenkind und einen hörbaren Klingenschluss.

---

### K2 · **Strömung** — die Fraktion der Reihenfolge

> *Der Fels bestimmt nicht, wie stark die Welle ist. Er bestimmt, wann sie kommt.*

| | |
|---|---|
| **Ressource** | **Sog** — Ladung, die Gegnerkarten im nächsten Durchlauf verschiebt |
| **Wo sie liegt** | auf dem **Gegnerdeck** — auf seiner *Reihenfolge*, nicht auf seinen Werten |
| **Multiplikator** | **formationMult**, aber von der anderen Seite: sie plant die Begegnung |
| **Zeitprofil** | wächst mit dem Wissen, nicht mit der Zeit |
| **Braucht Siege?** | ja, aber Niederlagen lenken ebenso |

**Der Kern.** `oppOrder` wird jeden Durchlauf neu gemischt und ist die **einzige große Stellschraube, die
nie jemand angefasst hat**. Strömung greift nicht die Werte an (das wäre Stein) und nicht die eigene
Aufstellung (das wäre der Gletscher-Handel) — sie greift die **Begegnung** an: wer trifft auf wen.

**Die eigentliche Pointe liegt nicht in der Mechanik, sondern in der Phase.** Der Block läuft
Skill → Perk → **Aufstellung** → Architekt → Durchlauf. Wenn die Reihenfolge des nächsten Gegnerdurchlaufs
schon *während* der Aufstellungsphase feststeht und sichtbar ist, wird aus der Aufstellung eine
**Gegenaufstellung**: die einzige echte Entscheidungsphase des Spiels bekommt einen Gegner, gegen den man
sie trifft. Das ist neues *Spiel*, nicht nur ein neuer Zähler.

**Passiv (ohne Skill).** Jeder Sieg schiebt die geschlagene Gegnerkarte im nächsten Durchlauf nach hinten,
jede Niederlage zieht die siegreiche Karte nach vorn. Das Gegnerdeck sortiert sich über den Lauf von selbst:
schwere Karten wandern in die Segmente, in denen du verlierst, leichte dorthin, wo du gewinnst. Die
Reihenfolge des nächsten Durchlaufs ist in der Aufstellungsphase sichtbar.

**Linien und Skills:**

- **Lenkung** — die Reihenfolge verschieben
  - *Sog* · ein Sieg schiebt die geschlagene Karte N Positionen weiter nach hinten
  - *Gegenstrom* · eine Niederlage schiebt die siegreiche Karte ans Durchlauf-Ende
  - *Untiefe* · die höchste Gegnerkarte jedes Segments tauscht mit der niedrigsten
- **Kielwasser** — Wissen
  - *Kielwasser* · du siehst die Gegnerreihenfolge des nächsten Durchlaufs beim Aufstellen
  - *Lotse* · du siehst zwei Durchläufe voraus
  - *Peilung* · Positionen, an denen du im nächsten Durchlauf höher stehst, sind in der Aufstellung markiert
- **Strudel** — Score aus der Lenkung
  - *Strudel* · ein Sieg gegen eine Karte, die du selbst hierher gelenkt hast, zählt +…
  - *Brandung* · je Karte, die diesen Durchlauf verschoben wurde, +Basis-Score je Sieg
  - *Wirbel* · drei gelenkte Karten in einem Segment: der ganze Segment-Faktor steigt
- **Auftrieb** — die eigene Aufstellung
  - *Auftrieb* · +1 Formations-Energie je Aufstellungsphase
  - *Drift* · am Durchlauf-Ende tauschen zwei Karten deiner Wahl gratis
  - *Flaute* · eine Segmentgrenze deiner Wahl ist offen, solange sie nicht gelenkt wurde
- **Tiefe**
  - *Tiefgang* · gelenkte Karten behalten ihre Position über mehrere Durchläufe
  - *Ankerplatz* · eine Position, die du dreimal gewonnen hast, friert die Gegnerkarte dort fest

**Legendäre (Richtungen):** *Flut* — das Gegnerdeck läuft aufsteigend sortiert, die schweren Karten zuletzt ·
*Gezeiten* — der Durchlauf hat zwei Hälften, die erste flach, die zweite schwer, und die zweite zahlt doppelt ·
*Mahlstrom* — du bestimmst die Reihenfolge des nächsten Gegnerdurchlaufs selbst.

**Warum das gut passt.** Es ist die einzige Richtung hier, die **eine neue Entscheidung** schafft statt
einen neuen Zähler. Es lässt die Aufstellungsfreiheit unangetastet (im Gegenteil: es macht sie wertvoller),
und es kollidiert mit keiner bestehenden Vokabel.

**Wo es brechen kann.**
1. **Reine Winrate-Verstärkung.** Schwere Gegnerkarten ans Ende schieben hebt die Siegquote für jeden
   Build — Lehre 3 aus §1. Gegenmittel: die Lenkung **verschiebt**, sie **entfernt nicht** (die Summe des
   Gegnerdecks bleibt konstant), und der Score-Anteil hängt am Bekenntnis zur Fraktion.
2. **Formationen sind pro Durchlauf eingefroren** (`computeFormations` bei `pos === 0`). Alles, was *während*
   eines Durchlaufs bewegt, ist ein teurer und verwirrender Eingriff. **Empfehlung: ausschließlich an der
   Durchlaufgrenze arbeiten** — dort wird ohnehin neu gerechnet.
3. **Der Mischzeitpunkt müsste vorziehen.** `oppOrder` entsteht heute beim Übergang in `play`; „sichtbar in
   der Aufstellungsphase" heißt: früher mischen. Machbar, aber eine echte Naht im Reducer.
4. **Anzeigelast.** Vierzig fremde Karten in einer Reihenfolge lesbar zu machen, ist echte UI-Arbeit.

---

### K3 · **Stein** — Erosion *(bestehender Entwurf, gegengelesen)*

`docs/stein-fraktion.md` liegt seit 2026-08-18 als Konzept vor: permanenter **−Wert auf dem Gegnerdeck**,
**Niederlagen als Rohstoff**, **die Serie hält**. Vision und Abgrenzung sind stark und stehen unverändert.

**Was sich seither geändert hat und den Entwurf berührt:**

- Er ist **vor** dem Skill-Rework geschrieben. Er rechnet mit „17 + 4 Legendäre"; der heutige Rahmen ist
  **15 Skills mit vier Stufen + drei Legendäre**, angeboten über Türen. Die Linien-Struktur müsste neu.
- **Er beantwortet Lehre 1 nicht:** Stein besitzt keinen Multiplikator. Abtrag und Splitter zahlen flach,
  und der Haupt-Payoff („der späte Sieg der schweren Karte") ist eine Flat-Zahl. Das ist exakt die Bauform,
  mit der Eis unten steht. Ein Stein-Neuanlauf braucht zuerst die Antwort: **welchen Faktor besitzt er?**
- **Sein §6.2-Risiko ist inzwischen belegt.** Ein flacheres Gegnerdeck hilft allen vier anderen Fraktionen.
  Das war 2026-08 eine Sorge und ist nach §8 eine gemessene Regel.
- **Sein §6.1-Risiko hat eine Lösung bekommen** — nämlich K1: der Serien-Schutz mit eingebautem Preis.
  Die beiden Entwürfe streiten sich damit um dieselbe Achse. **Das wird eine Entscheidung, keine Koexistenz.**

**Mein Vorschlag, falls Stein weitergeht:** den Serien-Halt an K1 abgeben und Stein auf seine wirklich
eigene Pointe reduzieren — **Zinseszins am Gegnerdeck**, mit einem Multiplikator, der am *kumulierten
Abtrag* hängt statt am einzelnen Splitter („je 10 Punkte, die dem Gegnerdeck fehlen, +x % Score"). Dann ist
der Motor multiplikativ, das Zeitprofil bleibt, und die Fraktion hat einen Grund, sie **allein** zu spielen.

---

### K4 · **Prisma** — die vier Farben *(Skizze)*

Farbe ist heute Dekoration mit drei Ausnahmen (Farbblock-Formation, Farb-Perks, Pflanzen-Grün). Niemand
spielt die **Rotation**. Prisma macht daraus eine Leitfarbe, die je Durchlauf wechselt: Siege in der
Leitfarbe laden, die Ladung hebt den **Farbblock-Faktor** und färbt Karten um.

**Abgrenzung zu Pflanze:** Pflanze *konvergiert* dauerhaft auf Grün. Prisma *rotiert* und belohnt Vielfalt
und Farbfolgen (die Farbserie aus `D_SUIT_STREAK` wäre die natürliche Fraktions-Achse).

**Risiko:** überlappt mit Pflanzes Auszahlungskanal und mit drei bestehenden Perk-Familien. Könnte sich eher
wie eine Perk-Kategorie anfühlen als wie eine Fraktion. Braucht eine Pointe, die kein Perk haben kann.

---

### K5 · **Echo** — die Wiederholung *(Skizze)*

Kopieren gibt es im ganzen Spiel nicht. Echo merkt sich Stiche: der beste Stich eines Durchlaufs klingt im
nächsten an derselben Position nach und zahlt anteilig erneut.

**Reiz:** es ist der einzige Entwurf, der **den eigenen Peak verstärkt** — genau das, was Feuer fehlt.
**Risiko:** damit verstärkt es auch jeden *fremden* Peak und ist die reinste Form des Cross-Skalierers.
Das riecht stark nach **Legendärem**, nicht nach Fraktion. Als Fraktion bräuchte es eine eigene Quelle,
aus der das Echo entsteht, nicht nur einen Spiegel auf alles andere.

---

### K6 · **Opfer** — das kleinere Deck *(Skizze)*

Der klassische Deckbuilder-Hebel, den es hier nie gab: **Karten aus dem Spiel nehmen**. Das Deck ist immer
40, der Durchlauf immer 40 Stiche — beides hängt aneinander.

Billige Variante ohne Strukturbruch: die Karte bleibt liegen, wird aber zum **Hohlraum** — sie verliert
immer, zahlt nie, und speist dafür die Fraktion; in der Formationserkennung zählt sie als das, was ihre
Nachbarn brauchen.

**Reiz:** eine echte, harte Entscheidung in einer Phase, in der es sonst nur Zugewinn gibt.
**Risiko:** kämpft direkt gegen die Score-pro-Sieg-Ökonomie und gegen die Formations-Länge. Strukturell die
teuerste Richtung hier.

---

## 4 · Querschnitt

| | Neuer Hebel | Eigener Multiplikator | Kosten im Code | Verträgt sich mit Beimischung |
|---|---|---|---|---|
| **K1 Waage** | Gleichstand + Serie | **ja** (Serie) | niedrig | riskant — Serien-Schutz ist für alle attraktiv |
| **K2 Strömung** | `oppOrder` + Aufstellungsphase | mittelbar (Formation) | mittel–hoch (Mischzeitpunkt, UI) | riskant — Winrate, gedämpft durch „verschieben statt entfernen" |
| **K3 Stein** | Gegnerwerte, permanent | **nein** (offen) | mittel | riskant — flacheres Deck hilft allen |
| **K4 Prisma** | Farbrotation | mittelbar (Farbblock) | niedrig | gut |
| **K5 Echo** | Wiederholung | fremd geliehen | niedrig | schlecht — reiner Cross-Skalierer |
| **K6 Opfer** | Deckgröße | offen | hoch | gut |

**Mein Favorit ist K2 Strömung**, aus einem Grund, der nichts mit Zahlen zu tun hat: es ist die einzige
Richtung, die dem Spiel eine **neue Entscheidung** gibt statt einer neuen Ressource. Vier Fraktionen füllen
heute vier Leisten; die fünfte Leiste macht das Spiel nicht tiefer. Eine Aufstellungsphase, in der man weiß,
gegen wen man aufstellt, schon.

**Der günstigste Einstieg ist K1 Waage** — sie braucht kein neues System, nur eine Naht im
Niederlage-Zweig, und sie hebt 200 tote Stiche je Lauf.

---

## 5 · Offene Fragen an den Owner

Nach `AGENTS.md` sind das Produktentscheidungen; sie gehören nicht in eine technische Wahl.

1. **Welche Richtung?** Eine der sechs, eine Kreuzung (K1 + K3 teilen sich die Serien-Achse und schließen
   sich aus), oder etwas ganz anderes?
2. **Bleibt `MAX_ARCHETYPES` bei 4?** Fünf Fraktionen bei vier gleichzeitigen schärfen die Wahl; ein Deckel
   von 5 verwässert die Türen und die Bekenntnis-Skalierung. (Offene Frage 6 aus `stein-fraktion.md`.)
3. **Jetzt oder nach den Reparaturen?** `skill-rework.md` §8.7 hat vier offene Baustellen — Eis als System,
   Feuers fehlende Decke, Baumreihe, die zwölf Dauerschwachen. Eine fünfte Fraktion baut auf einem Feld,
   auf dem zwei von vier bekannt schief stehen. Das ist keine Warnung, nur die Reihenfolge-Frage.
4. **Die Ranked-Falle.** `RANKED_ARCHETYPES` leitet sich aus den `deckUnlock`-Knoten ab und verlangt je
   Fraktion einen beendeten Lauf. Ein neuer Knoten **entzieht bestehenden Spielern den Ranglisten-Zugang**,
   bis sie einen Lauf mit der neuen Fraktion beendet haben. Bewusst so, oder die neue Fraktion ausnehmen?
5. **Nur für K2:** darf die Gegnerreihenfolge des nächsten Durchlaufs in der Aufstellungsphase **sichtbar**
   sein? Daran hängt, ob die Fraktion ein Zähler ist oder eine Entscheidung.
6. **Nur für K1:** soll die Ressource am **natürlichen** Gleichstand hängen (verfällt, sobald das Deck über
   10 wächst) oder an der **Parade** (bleibt tragfähig, ist aber ein Stück weniger elegant)?

---

## 6 · Nächster Schritt

Eine Richtung wählen. Danach die Reihenfolge, die Eis und Pflanze schon gegangen sind:
**Vision → Fundament (Passiv) → Linien → Skills → Zahlen zuletzt.** Zahlen erst, wenn die Linien stehen,
und gemessen erst, wenn es etwas zu messen gibt.
