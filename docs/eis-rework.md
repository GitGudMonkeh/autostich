# Design-Doc: Eis-Neudesign — „Gletscher, Brechen & Kaskade" (v1)

> Status: **Design steht auf Mechanik-Ebene.** Reihenfolge: (1) Design (Vision → Fundament → Rollen), (2) ✔ dünne Linien aufgefüllt, (3) ✔ Legendäre, (4) **Zahlen ganz zuletzt** (Sim + Playtest).
> **NEU-Design, kein Rework** — alte Eis-Skills bewusst ignoriert. Diese Arbeit **ersetzt Issue #288** (das schließen wir danach).
> Ziel-Branch: `balancing`.
>
> **Terminologie:** „Bersten" bleibt als **Substantiv** (das Bersten, Berst-Schwelle, Berst-Faktor), als **Verb** sagen wir **„brechen"** — „ein Gletscher **bricht** in seine Nachbarn".

---

## 1 · Vision

**Eis = die räumliche Cluster-Fraktion.** Du baust ein **dichtes Gletscherfeld** und löst eine **Kaskade** aus.

Eine Ressource (**Masse**), ein Payoff (**Brechen**), eine Fähigkeit (**Cluster bauen**). Bewusst **simpler als Pflanze**.

**Sauberer Kontrast zur Pflanze:**
- **Pflanze wächst nach innen** (Tiefe — Wert pro Karte hoch, positions-agnostisch).
- **Eis wächst nach außen** (Fläche — Gletscher sammeln Masse an → brechen → wirken auf die Nachbarn). Räumliche/AoE-Identität statt Pro-Karte-Achse.

**Begriffe (festgezurrt):**
- **Masse** — der Ansammel-Wert (nicht „tief/Tiefe" — das verwechselt man mit dem Kartenwert). **Masse liegt auf dem Brettfeld** (siehe §2), nicht nur auf der Karte.
- **Gletscher** — eine Karte, die du **auf ihr Feld festfrierst** (§2.1). Ein großer heißt **mächtiger Gletscher**.
- **Bersten / brechen** — der Payoff-Event: ein Gletscher **bricht** in seine Nachbarn.
- Glaziologie-Check: Gletscher **wachsen** durch Akkumulation → korrekte Richtung für eine Ansammel-Mechanik.

---

## 2 · Das Fundament (Baseline-Eis, immer an)

Was ein Gletscher **ohne Skills** tut — die 17 Rollen sind nur Modifikatoren darauf.

### 2.1 · Was ein Gletscher ist — der Pick fixiert die Karte
- Du **wählst** eine Karte als Gletscher → sie **pickt auf ihrer aktuellen Brett-Zelle fest** und ist ab da **starr: in keiner künftigen Aufstellung mehr verschiebbar.**
- Damit ist die Kern-Entscheidung **Position vs. Wert**: du legst eine Karte verbindlich auf einen Platz (für Cluster/Nachbarschaft) und gibst die Freiheit auf, sie später umzustellen.
- Folge: du **bereitest das Brett für zukünftige Gletscher vor** — Anker setzen, Lücken für spätere Nachbarn lassen. Frühe Picks = mehr Masse-Zeit, aber riskanter (Feld noch leer); späte Picks = sicherer, aber weniger Zeit zum Brechen.
- **Eis-Formationen** werden dadurch zum *Umbauen um die fixen Anker herum* (Andockpunkt für die späteren 2D-Formationen).

### 2.2 · Masse liegt auf dem Feld (Firn-Boden)
- **Masse lebt auf der Brett-Zelle, nicht auf der Karte.** Ein **Gletscher ist ein festgefrorenes Feld**; ein ungefrorenes Feld kann ebenfalls Masse tragen (**Firn-Boden**).
- Pickst du später einen Gletscher auf ein aufgeladenes Feld, **erbt er die dort angesammelte Masse** (startet nicht bei 0). → macht „das Brett vorbereiten" mechanisch real.
- Masse ist **nur steigend**. Baseline-Quelle: **Sieg eines Gletschers → +Masse** auf sein Feld.

### 2.3 · Schwellen-Stufen & Brechen
- **Berst-Schwellen in Stufen: 4 / 8 / 12 / …** Ein Gletscher **bricht**, wenn er eine Stufe erreicht hat — Stufe 1 (≥4) klein, Stufe 2 (≥8) deutlich stärker, Stufe 3 (≥12) noch stärker. Die Stufen sind **überlinear**, damit sich **Anhäufen lohnt**.
- **Teil-Reset = eine Stufe runter** (ersetzt die alte 50%-Regel): nach dem Bruch fällt der Gletscher auf die **vorige Schwelle** (12→8, 8→4). **Große Gletscher bleiben groß** — der Puls schwingt zwischen den Stufen, nicht von Null.
- **Überlauf → direkter Score:** Masse **über der höchsten Stufe** wird nicht gehortet, sondern jede Runde als **Score** ausgeschüttet (stetiger Riesen-Bonus + weiches Ventil gegen endloses Aufstapeln).
- **Burst-Score = Masse × Berst-Faktor.** **Berst-Faktor = 1 + Kaskade × (angrenzende Gletscher).**
- **Kollision** — bricht ein Gletscher auf einen Nachbarn, der **selbst Gletscher** ist → Bonus/Krit statt „ins Leere".
- **Nachbarschaft = 4 orthogonale** (links / rechts / oben / unten) auf dem 8×5-Brett.

> ⚠ Stufen-Werte (4/8/12), Überlinearität und Überlauf-Rate sind **zahlen- und playtest-abhängig** — hier nochmal ran, sobald Werte/Sim stehen.

### 2.4 · Timing — wann bricht er, wann landet der Score
Zweiphasig (analog zu `precomputeArchitect`: vorab rechnen, während des Durchlaufs anwenden):
- **Phase A · Snapshot am Durchlauf-Start** *(Rechnung, keine UI):* auf dem **statischen Brett** wird der **ganze Bruch auf einmal** berechnet — wer bricht, in welcher Stufe, plus Kaskade/Kettenbruch/Gletschersturz/Kollision. Deterministisch & **reihenfolge-frei** (Positionen dank §2.1 fixiert, Masse steht fest). Ergebnis: **ein fixer Burst-Score pro Gletscher**.
- **Phase B · Auszahlung pro Stich** *(UI-Anker):* der vorberechnete Burst-Score landet **auf dem Stich, in dem die Gletscher-Karte spielt** → Score verteilt sich lesbar über den Durchlauf, jede Karte zeigt ihren eigenen Beitrag.
- **Brechen ist unabhängig von Sieg/Niederlage** des Stichs (hängt an der Masse-Schwelle). Der Burst-Score wird dem Stich zugerechnet.
- **Stufen-Abfall & Firn-Boden-Updates** werden am **Durchlauf-Ende** verbucht (nach Auszahlung), damit der Snapshot konsistent bleibt.

### 2.5 · Kern-Prinzipien
- **A — Was gibt das Brechen? → Direkt-Score, der mitwächst.** Burst-Score = Masse × Berst-Faktor + Überlauf — alles Größen, die den ganzen Lauf mitwachsen.
- **B — Masse nach dem Bruch? → eine Stufe runter** (Lade-Entlade-Puls, selbstbremsend, große bleiben groß).
- **Design-Prinzip:** ein Eis-Skill darf **„Verlieren" nicht bedeutungslos** machen (kein „Gletscher können nicht verlieren"-Zustand).
- **Deckel/Leitplanken:** bewusst **noch nicht** — erst wenn Design + Werte stehen (v.a. Verzahnung, Große Lawine, Kaskade).

### 2.6 · Fraktions-Passiv: **Ewiger Frost**
Das eine „immer an"-Signature, das für **jede Eiskarte** gilt (Pendant zu Feuers Hitze, Pflanzes Wachstum) — **quer zu den 4 Linien**, kein fünfter Motor.
- **Jeder Gletscher gewinnt jede Runde etwas Masse — bedingungslos**, egal ob Sieg oder Niederlage.
- **Rolle:** der bedingungslose **Grundsockel** der Ansammlung. Die Skills *verstärken* Akkumulation (Anfrieren bei Sieg, Dauerfrost am Boden …), der Passiv trägt sie darunter. Gibt Eis sein Signature-Gefühl: **Unaufhaltsamkeit** — der Gletscher *wird* irgendwann brechen.
- **Muss klein bleiben:** ein bedingungsloser Tick weicht „Verlieren" leicht auf (Prinzip bleibt heil — der Gletscher kann weiter verlieren, es kostet die Stiche), also **Sockel, nicht Motor**. Konkreter Wert am Sim.

---

## 3 · Die vier Kategorien (Linien) & ihre Fantasien

Pipeline **Aufbauen → Verbinden → Brechen**, plus eine Kontroll-Achse quer dazu.

| Linie | Fantasie | Rolle im Build |
|---|---|---|
| **1 · Firn** | „Das ewige Anwachsen" — Schnee presst sich unerbittlich zu Eis. | **Masse-Motor** (Fundament jedes Eis-Builds) |
| **2 · Eisschild** | „Das verbundene Feld" — Gletscher verschmelzen, Nachbarschaft ist Macht. | **Cluster/Dichte** (der Skill-Ausdruck, freie Aufstellung) |
| **3 · Lawine** | „Der Zusammenbruch" — das Eis bricht und reißt das Feld mit. | **Payoff** (Kaskade/Krit) |
| **4 · Frostgriff** | „Die Starre" — die Kälte greift nach außen. | **Kontrolle & Duo** (Quer-Achse) |

---

## 4 · Die Rollen (Mechanik — noch ohne Zahlen)

Regel = **Bedingung → Effekt**. 12 Kern-Rollen + 5 Auffüller = **17 normale Rollen** (Ziel wie Feuer). Verteilung: Firn 4 · Eisschild 5 · Lawine 5 · Frostgriff 3.

### Linie 1 · Firn — Masse-Motor
- **Anfrieren** — Sieg → **mehr Masse** auf dem Feld; Formations-Sieg → **extra**. *(der Grundmotor — aktiv & sofort, Aufbau über Siege UND Formationen)*
- **Schneetreiben (Verwehung)** — gewinnt ein Gletscher, **verweht** er einen Teil Masse auf ein **angrenzendes Feld** (Firn-Boden). *(lokal & gerichtet: baut den Boden **neben** Gletschern → Dichte; erreicht ferne Zellen nicht)*
- **Dauerfrost** — ab dem Pick friert der Boden weiter zu: **ungefrorene Felder sammeln passiv Masse**, aber **offener Boden friert am tiefsten** — Felder mit wenigen/keinen Gletscher-Nachbarn laden schneller, Felder direkt neben Gletschern kaum. *(brettweit & passiv: lädt die **fernen** Zellen → erlaubt Platzierung außerhalb der Nachbarschaft; mechanischer Gegenpol zu Schneetreiben. Nur ungefrorene Felder.)*
- **Verdichtung** — der **Gebäude-Bonusanteil** auf einem Gletscher (Karten-/Stichwert) wird **nicht als Score ausgezahlt, sondern in Masse getankt**. *(dritte Masse-Quelle — siegunabhängig, koppelt Architekt an Eis; die Karte spielt ihren Stich normal, nur der Gebäude-Bonus kippt in Masse. Motor des „alles auf Gletscher stapeln"-Builds)*

> Die drei Boden-Motoren decken **verschiedene Zonen**: Anfrieren (Sieg, sofort) · Schneetreiben (nah/dicht, gerichtet) · Dauerfrost (fern/offen, passiv). Verdichtung als vierte, siegunabhängige Quelle über den Architekten.

### Linie 2 · Eisschild — Cluster/Dichte
- **Verschmelzen** — angrenzende Gletscher **poolen ihre Masse** (heben einander auf den Cluster-Durchschnitt, nie fallend). *(macht dichte Felder gleichmäßig mächtig)*
- **Packeis** — ein Gletscher mit **vielen Gletscher-Nachbarn** bekommt Bonus-Masse. *(belohnt die Mitte des Feldes)*
- **Eisbrücke** — erweitert, was **„angrenzend"** zählt (Diagonalen dazu). *(verbindet zersplitterte Felder zu einem Cluster)*
- **Eiswall** — eine **komplett gefrorene, durchgehende Gletscher-Reihe** bufft alle ihre Gletscher. *(belohnt geplante Vollreihen — Formations-Payoff, greift in die 2D-Formationen)*
- **Verzahnung** — je **größer das verbundene Cluster**, desto schneller gewinnen **alle seine Gletscher** Masse. *(Cluster füttert sich selbst — **Runaway-Kandidat**, später hart zu deckeln)*

### Linie 3 · Lawine — Brechen/Kaskade
- **Abbruchkante** — der Burst-Score **belohnt das Erreichen hoher Stufen noch steiler**. *(Größe = Wucht, belohnt Einzelriesen; hat mit den Stufen echtes Futter)*
- **Kettenbruch** — bricht ein Gletscher, **zwingt er angrenzende Gletscher, sofort mitzubrechen** — in ihrer aktuellen Stufe, auch wenn sie die Schwelle diese Runde nicht erreicht hätten. *(die echte Kaskade; reißt Stufe-3-Nachbarn mit → dichte Felder aus großen Gletschern)*
- **Zermalmen** — Kollision (Bruch trifft Gletscher) → **Krit** statt normalem Treffer. *(Dichte gibt Krit)*
- **Rissbildung** — instabiles Eis: **senkt die erste Schwelle** → bricht früh & oft auf Stufe 1, kommt nie hoch. *(Tempo-Gegenpol zu Abbruchkante: viele kleine statt weniger großer Brüche)*
- **Gletschersturz** — je **mehr Gletscher im selben Durchlauf brechen**, desto **stärker jeder einzelne Bruch**. *(brettweiter Kaskaden-Verstärker; belohnt das volle, gleichzeitig auslösende Feld)*

### Linie 4 · Frostgriff — Kontrolle/Duo
- **Einfrieren** — bricht ein Gletscher auf eine **Gegnerkarte**, verliert diese ihren **nächsten Stich garantiert**. *(harte Kontrolle nach außen; kein Debuff-Zustand, nur der eine Stich)*
- **Frostbund** — bricht ein Gletscher auf einen **Nicht-Eis-Nachbarn** (dein 2. Archetyp) → **bufft ihn** (offensiv, Score). *(Duo-Enabler; **stößt nach außen**)*
- **Eispanzer** — **zwei Hooks:** (1) eine **Niederlage auf einer Karte neben einem Gletscher** ist **folgenlos** (bricht keine Serie, füttert kein Gegner-On-Win); (2) diese abgeschirmte Niederlage **füttert stattdessen Masse in den angrenzenden Gletscher** — *der Gletscher frisst, was an ihm zerbricht.* *(räumlicher Schutz **und** Motor: schwache „Opfer-Karten" als Ring um den Gletscher parken; **zieht nach innen**, Gegenrichtung zu Frostbund. Prinzip heil: die Nachbarn verlieren weiter, kostet Stiche/Score.)*

---

## 5 · Synergien

- **Firn füttert alles** — ohne Masse kein Bruch. Vier Quellen in verschiedenen Zonen: Sieg (Anfrieren), nah (Schneetreiben), fern (Dauerfrost), Architektur (Verdichtung, siegunabhängig).
- **Stufen belohnen Anhäufen** — Anfrieren/Packeis/Dauerfrost bestimmen die **Klettergeschwindigkeit** zurück auf hohe Stufen nach dem „−1 Stufe"; Fütter-Motoren und Payoff greifen direkt ineinander.
- **Eisschild = Multiplikator-Linie:** Verschmelzen/Packeis/Eisbrücke/Verzahnung bauen große, dichte Cluster → davon leben **Kaskade (Kettenbruch/Gletschersturz)** und **Krit (Zermalmen)**. **Eiswall** zahlt geplante Vollreihen aus. Herz des „Breite"-Builds.
- **Abbruchkante = Gegenpol:** wenige **Riesen** auf hohen Stufen statt breitem Feld. Zusammen mit **Verdichtung** (Bauwert → Masse) der **Architekt-Eis-Build**: dickste Gebäude auf wenige Gletscher, steil als Bruch ausgezahlt. **Rissbildung** dreht dieselbe Achse aufs Tempo.
- **Frostgriff** hängt quer: dieselbe Bruch-Energie nach außen — Einfrieren (Tempo), Frostbund (Duo, nach außen), Eispanzer (Consistency + Masse, nach innen).

---

## 6 · Build-Möglichkeiten

- **Mono „Lawine":** all-in aufs dichte Gletscherfeld — die Kaskade IST der ganze Score.
- **Riesen (Abbruchkante + Verdichtung):** wenige, sehr mächtige Gletscher auf hohen Stufen — Tiefe statt Breite; **Architekt-Eis**.
- **Opfer-Ring (Eispanzer):** schwache Karten um den Gletscher parken, ihre Niederlagen als Masse ernten.
- **Duo-Support (Frostbund):** Gletscher, deren Brechen die Nachbarn des 2. Archetyps buffen — Eis als räumlicher Verstärker.
- **Positionier-Puzzle:** weil der Pick fixiert, ist Eis die „ordne das Brett optimal an"-Fraktion — Skill-Ausdruck komplett im Layout.

---

## 7 · Legendäre (je Linie eine Capstone)

- **Firn → „Eiszeit" (kriechende Eiszeit):** Dauerfrost im Overdrive — das **ganze Brett** flutet jede Runde mit Boden-Masse, und deine Karten **frieren über die Restrunden zunehmend** zu Gletschern ein. *(nutzt das Firn-Boden/Dauerfrost-System; **rampt** statt sofort zu wipen — bei Pick ~R29 kriecht die Eiszeit über die ~20 Restrunden; „krass"-Regler = Flutrate)*
- **Eisschild → „Ewiges Schild":** das **gesamte zusammenhängende Feld zählt als EIN Übergletscher** — alle poolen Masse, alle gelten füreinander als angrenzend, Kaskade rechnet volle Feldgröße. *(**Dauer-Zustand**; **vereint** vorhandene Gletscher zu einem)*
- **Lawine → „Große Lawine":** **ein** Snapshot, in dem **alles** bricht (Schwellen ignoriert, volle Stufe) → der größtmögliche Score-Moment, den es gibt. *(**einmaliges Event** / Finisher; **horten & detonieren**. Gletschersturz/Kollision maximal, weil alle im selben Event brechen)*
- **Frostgriff → „Erstarrung":** der **Gegner friert komplett ein** — jede vom Bruch getroffene Gegnerkarte verliert garantiert ihren Stich; der Bruch greift über die 4 Nachbarn hinaus weiter ins Gegnerfeld. *(Kontroll-Capstone)*

**Abgrenzung Eiszeit ↔ Ewiges Schild:** Eiszeit **pluralisiert** (füllt das Brett mit **vielen** eigenen Gletschern, Masse-Menge), Ewiges Schild **vereint** (macht aus vorhandenen **einen** Koloss, Verbindung/Kaskade). Gegensätzliche Operationen, verschiedene Builds.
**Abgrenzung Ewiges Schild ↔ Große Lawine:** Schild = **Zustand** (jede Runde ein Übergletscher), Lawine = **Event** (einmaliger Knall, danach leer).

---

## 8 · Offene Punkte (nächste Schritte)

1. ✔ **Dünne Linien aufgefüllt** — 17 normale Rollen (Firn 4 / Eisschild 5 / Lawine 5 / Frostgriff 3).
2. ✔ **Legendäre** — Eiszeit / Ewiges Schild / Große Lawine / Erstarrung.
3. **Zahlen** — ganz zuletzt (Sim + Playtest). Offen v.a.: Stufen-Werte 4/8/12 + Überlinearität + Überlauf-Rate, Masse-Raten der Motoren, Kaskade/Kollision-Faktoren, Eispanzer-Umwandlung, Eiszeit-Flutrate, Große-Lawine-Trigger (Finisher).
4. **2D-Formationen** — Formationen, die die 4 Brett-Richtungen ansprechen (dockt an §2.1: Umbauen um fixe Anker).
5. **#288 (Trimmen) schließen**, sobald dieses Design es in Code ablöst.
6. **Deckel/Runaway-Leitplanken** — aufgeschoben bis Design + Werte stehen (Verzahnung, Große Lawine, Kaskade).
