# Münzen, Aufgaben und Bosse — Erkundung

**Status: Erkundung.** Diese Fassung sammelt, *was möglich wäre* — sie legt nichts fest. Zahlen sind
Platzhalter zum Draufschauen, keine Balance-Aussagen. Gemessen wird auf Ansage, nicht vorher.

Aufgebaut wie `docs/skill-rework.md`: erst Richtung und Abgrenzung, dann Vorschläge je Baustein,
Entscheid je Zeile beim Owner. Entscheidungen des Owners stehen unter **Gesetzt**; alles unter
**Vorschlag** oder **Erkundung** ist Diskussionsstand.

Sprache Deutsch, weil Inhalt, Ökonomie-Gefühl und Spielertexte Produktsprache sind und der Owner hier
mitschreibt — dieselbe bewusste Abweichung von der Engineering-Sprache wie in `docs/skill-rework.md`,
und nur für dieses Dokument.

---

## 1. Rahmen

### Gesetzt (Owner)

- **Münzen als Ökonomie, Bosse mit Mechaniken und Beute, Score mit Par.** (2026-09-06,
  `docs/skill-rework.md` §1 — dort als „Details außerhalb dieses Dokuments" ausgelagert.)
- **Der Progression-Baum wird mit dem neuen Progress entfernt. SP und DP fallen weg.** (2026-09-07.)
  Damit ist die Münze die einzige Währung, die es im Spiel noch gibt — §2 zieht die Folgen.
- **Ausgeben kann man Münzen für** (2026-09-07, erste Ideen, Liste offen): Neuwürfe · Skills
  aufwerten · eine bestimmte Fraktion an die Tür rufen · Energie in der Aufstellphase · Baufelder.
  **Einiges davon limitiert, damit es nicht überpowert wird.**
- **Münzen werden nicht an den Score gekoppelt.** Sie kommen aus **gezielten
  Spielmechanik-Aufgaben** — zufällig oder fest, offen welches von beiden. (2026-09-07.)
- **Zwei Zwischenbosse, gedanklich in Durchlauf 15 und 30.** Reine Platzhalter, mit der Idee, dass sie
  Belohnung oder Münzen geben. (2026-09-07.)
- **Diese Runde erkundet nur.** Ausgaben und Verdienen werden ausgelegt, nicht entschieden.
  (2026-09-07.)

### Frühe Idee, ausdrücklich nicht beschlossen: die neue Progression

Der Owner hat am 2026-09-07 seinen aktuellen Denkstand geteilt — **eine frühe Idee, nichts
Beschlossenes und nichts Ausgereiftes.** Sie steht hier nicht, um entworfen zu werden — das
Progression-Design gehört ihr eigenes Vorhaben —, sondern weil die Münz-Erkundung **dagegen geprüft
werden muss.** Sie verändert an mehreren Stellen, was in diesem Dokument sinnvoll ist.

Der Denkstand, so wie er geteilt wurde:

- **Ausgangspunkt: Inhalt für etwa 15 bis 20 Stunden**, also grob **30 bis 40 Läufe**.
- **Drei Ebenen. Eine Ebene sind fünf aufeinanderfolgende Läufe.**
- **Jeder Lauf hat zwei Zwischenbosse und einen Endboss an seinem Ende** — also drei Bosse je Lauf,
  fünfzehn Bosse je Ebene. Entweder fünfzehn eigene, oder ein kleinerer Pool, aus dem gezogen wird,
  plus ein fester finaler Boss.
- **Jeder Boss hat eine Mechanik, die auf den ganzen Lauf wirkt**, und **eine Score-Schwelle**. Wer
  die Schwelle nicht schafft, verliert die Ebene.
- **Fortschritt läuft über XP und passiert automatisch** — je weiter man kommt, desto mehr Raritäten,
  Decks, Legendäre werden freigeschaltet. Keine Kaufentscheidung, kein Baum.
- **Ebene geschafft heißt Ebene übersprungen:** wer Ebene 1 bestanden hat, startet künftig in Ebene 2;
  wer Ebene 2 bestanden hat, ist in der finalen Ebene und muss alle fünf Läufe plus den Endboss
  schaffen. Das ist das finale Ziel.
- **Offen im Denkstand selbst:** ob man zwischen den Läufen einer Ebene etwas mitnimmt, und ob es
  innerhalb einer Ebene schwerer wird — außer über die steigende Score-Schwelle je Boss.

Was das für dieses Dokument bedeutet, steht an vier Stellen: der Endboss ist damit **kein separates
Thema mehr, sondern Teil derselben Struktur** (§5); Par und Boss-Schwelle sind **dasselbe Objekt**
(§6); die Zielgröße 30–40 Läufe **rechnet sich in eine Erfolgsquote um** (§7); und die offene
Mitnahme-Frage hat in den Münzen **einen naheliegenden Kandidaten** (§3.5).

### Sprachregelung

Der Denkstand nennt einen Durchgang „Runde"; dieses Dokument und der Code nennen so den einzelnen
Deck-Durchlauf. Damit man nicht aneinander vorbeiredet, ab hier durchgehend:

| Begriff | Was es ist | Größe |
| --- | --- | --- |
| **Stich** | eine Karte gegen eine Karte | — |
| **Durchlauf** | ein Deck-Durchgang | 40 Stiche |
| **Lauf** | ein Spiel von Anfang bis Ende, mit drei Bossen | 50 Durchläufe |
| **Ebene** | fünf Läufe | 250 Durchläufe |

„Runde" wird ab hier nicht mehr benutzt. Wo `docs/skill-rework.md` von „50 Runden" spricht, sind
Durchläufe gemeint — das bleibt gültig.

### Nicht in diesem Dokument

| Thema | Wo es hingehört |
| --- | --- |
| Skill-Inhalte, Stufen, Fraktionen, Legendäre | `docs/skill-rework.md` (läuft parallel auf `exp`) |
| Das Progression-Design selbst — Ebenen, XP, Freischaltungen | eigenes Vorhaben; hier nur als Rahmen festgehalten |
| Boss-Mechaniken und Boss-Beute im Einzelnen | später, im Rahmen der Progression |
| Zwillingstür, Brett- und Deck-Änderungen | geparkt (`docs/skill-rework.md` §1) |
| Code, Konstanten, Tests | eine spätere Runde |

### Offen — die Fragen, die alles andere sortieren

- **F1 — Wer setzt künftig den Boden?** Neuwürfe, Formations-Energie und Baufeld-Größe kommen heute
  aus dem Progression-Baum. Fällt der weg, braucht jede der drei einen neuen Startwert, bevor eine
  Münze etwas dazukaufen kann. Keine Münz-Frage, aber die Flächen A, D und E hängen daran (§3.2).
- **F2 — Aufgaben zufällig oder fest?** Die Achse, die der Owner benannt hat. Drei Modelle in §4.3.
- **F3 — Ist die Münze knapp oder reichlich?** §3.4.
- **F4 — Was heißt „die Ebene verloren"?** Fünf Läufe **in Folge**, oder fünf bestandene Läufe
  **gesammelt**? Der Unterschied entscheidet, wie hart die Boss-Schwellen sein dürfen — und zwar
  gegen die Intuition. §7 rechnet es aus.
- **F5 — Nimmt man zwischen den Läufen einer Ebene etwas mit?** Offen im Denkstand selbst. §3.5 legt
  dar, warum die Münze der naheliegende, aber nicht der harmlose Kandidat ist.

---

## 2. Ausgangslage

Alle Bausteine bauen auf nichts auf — und mit dem Wegfall des Baums auf noch weniger als zuvor.

| Baustein | Stand |
| --- | --- |
| Münzen | **Gibt es nicht.** Mit dem Shop gestrichen (#229); der Endbildschirm zeigt keine Münzzeile mehr. |
| Aufgaben | **Gibt es nicht als laufinternes System.** Das einzig Verwandte sind Kosmetik-Freischaltungen — laufübergreifende, klebrige Profil-Flags („ein Lauf ohne Neuwurf"), keine Ziele während eines Laufs. |
| Bosse | **Gibt es nicht.** Der Gegner ist ein Deck. Nächstes Verwandtes: `difficulty.oppValue` / `oppRampEvery` (im Normallauf `null`) und die Wochen-Modifikatoren (nur Ranked). |
| Par | **Gibt es nicht.** |
| SP / DP / Baum | **Fallen weg** (Owner, 2026-09-07). |

### Was der Wegfall von SP und DP bedeutet

Drei Folgen, die diesen Entwurf gegenüber der ersten Fassung verändern:

1. **Die Münze ist die einzige Währung.** Kein Zahlenraum-Konflikt mehr, keine Verwechslungsgefahr in
   der UI, keine Frage „warum kaufe ich das hier und nicht dort". Das vereinfacht die Sache erheblich.
2. **Die Limits brauchen eine neue Begründung.** In der ersten Fassung waren sie da, um den Baum nicht
   zu entwerten. Der Grund ist weg — der Bedarf nicht. Was bleibt, ist der Grund, den der Owner selbst
   genannt hat: **damit es nicht überpowert wird.** §3.3 formuliert das aus, und es führt zu anderen,
   engeren Limits als die Baum-Begründung es getan hätte.
3. **Der Score verliert seine alte Auszahlung und bekommt eine neue.** Score-Meilensteine speisen
   heute SP und DP; fallen beide, bedeutet der Score zunächst nur noch sich selbst. Genau diese Lücke
   füllt der geteilte Denkstand: **die Score-Schwelle je Boss.** Damit ist hoher Score kein
   Selbstzweck mehr, sondern die Bedingung, um weiterzukommen — der Incentive, der bisher gefehlt hat,
   sitzt dann nicht in einer Belohnung, sondern in einer Hürde. §6 zieht die Folgen für Par.
4. **Die Münze muss keine Progression tragen.** Freischaltungen laufen im Denkstand über XP und
   passieren automatisch. Das entlastet die Münze von der Frage „womit belohne ich Fortschritt?" — sie
   darf ganz das bleiben, was sie am besten kann: eine kleine, schnelle Entscheidung innerhalb eines
   Laufs.

### Ein Befund, der §4 trägt

Die Engine berechnet **für jeden einzelnen Stich** bereits die Größen, an denen die Perks hängen:

| Größe | Was sie sagt | Wer sie heute nutzt |
| --- | --- | --- |
| `winValue` | Wert der Karte, mit der man gewonnen hat | „Hohe Karten, hohe Belohnung", „Außenseitersieg" |
| `margin` | Abstand zur Gegnerkarte | „Übermacht", „Knappe Kiste" |
| `winStreak` | laufende Siegesserie | „Momentum", „Siegesserie" |
| `wins` | Anzahl Siege im Durchlauf | „Perfekter Rhythmus", „Beutezug" |
| `lostLastTrick` | der Stich davor ging verloren | „Gegenangriff", „Revanche" |
| `hasFormation` | der Stich lief über eine Formation | „Kritische Ernte" |
| Crit-Flags | der Stich war kritisch | die ganze Präzisions-Familie |

Dazu führt der Lauf **kumulative Motor-Zähler je Fraktion** — Ionisierungen, verbrannte Asche, Brände,
Wachstum, Gletscher-Ertrag —, die heute nur die Fraktions-Panels anzeigen.

**Das heißt: eine Mechanik-Aufgabe braucht kein neues Messwerk.** Sie liest dieselben Größen wie ein
Perk. Das ist der Grund, warum „gezielte Spielmechanik-Aufgaben" nicht nur die bessere Design-Wahl
sind, sondern auch die billigere.

### Und einen fertigen Rhythmus

Ein Lauf sind 50 Deck-Durchläufe à 40 Stiche („Durchlauf" und „Runde" meinen hier dasselbe). Vor jedem
Durchlauf steht genau **eine** Entscheidung, im wiederholten Block Skill → Perk → Aufstellen →
Architekt. **Es gibt keinen freien Platz im Plan.** Jede Idee, die eine eigene Entscheidung will,
nimmt einer bestehenden ihren Platz weg — die härteste Randbedingung in diesem Dokument.

> Hinweis: `dev` und `exp` bauen den Plan heute verschieden. Dieses Dokument nennt Positionen deshalb
> als „Durchlauf n von 50", nicht als Index im Plan.

---

## 3. Wofür man Münzen ausgibt

### 3.1 Was die Münze ist

**Vorschlag.** Die Münze ist **laufintern**: sie entsteht im Lauf, wird im Lauf ausgegeben und
**verfällt am Laufende**. Sie trägt nichts ins nächste Spiel.

Das ist keine Sparsamkeit, sondern das, was die Münze interessant macht: eine Währung, die verfällt,
zwingt zu der Frage *„jetzt ausgeben oder auf den nächsten Durchlauf sparen?"* — und diese Frage stellt
sich fünfzigmal je Lauf. Eine Währung, die man mitnimmt, stellt sie nie: dort ist Sparen immer richtig.

### 3.2 Die Flächen

Die fünf vom Owner genannten, plus drei aus der Erkundung. Preise sind **Verhältnisse zueinander**,
keine Werte — sie zeigen, was teuer und was billig sein soll.

---

#### A — Neuwurf kaufen

**Kauft:** einen zusätzlichen Neuwurf des aktuellen Angebots (Tür, Perk-Auswahl, Architekt).

**Warum:** Rerolls sind die einzige Stelle, an der heute schon eine knappe laufinterne Ressource
existiert — drei getrennte Pools, kein Nachschub. Der Spieler kennt das Gefühl „ich hätte jetzt gern
noch einen" bereits; die Münze beantwortet eine Frage, die das Spiel schon stellt.

**Limit:** höchstens **ein** gekaufter Neuwurf je Angebot, Preis verdoppelt sich innerhalb desselben
Durchlaufs. Ohne das Erste wird die Tür zum Katalog, ohne das Zweite wird ein reicher Spieler zum
Katalogleser.

**Hängt an F1:** wie viele Neuwürfe der Spieler ohne Münzen hat, ist offen, seit der Baum wegfällt.

**Preis:** billig (Richtwert 3 → 6 → 12).

---

#### B — Skill aufwerten

**Kauft:** hebt einen gehaltenen Skill um eine Stufe.

**Warum:** die einzige Fläche, auf die sich **sparen** lohnt, und die einzige, die einen schwachen
frühen Fund im Late Game noch rettet. Sie trägt den Lauf über seine ganze Länge.

**Warum riskant:** Sie greift in den Kern des laufenden Skill-Reworks. Dessen Stufenleiter ist so
gewählt, dass der Erwartungswert über die Ziehungsquoten etwa dem heutigen Skill entspricht — eine
kaufbare Stufe verschiebt ihn nach oben, und zwar für den Spieler, der ohnehin gut läuft.
**Nicht bauen, bevor die Stufen stehen.**

**Limit — drei Härtegrade:**

| | Regel | Wirkung |
| --- | --- | --- |
| B1 zahm | eine gekaufte Aufwertung je Lauf | ein Höhepunkt, kein System |
| B2 mittel | eine je Abschnitt zwischen den Bossen, **nie auf die höchste Stufe** | Aufwertung wird ein Rhythmus; die Spitze bleibt Fundsache |
| B3 mutig | frei kaufbar, Preis steigt steil je Stufe | die Ökonomie *ist* der Build — stärkste Kopplung, größtes Risiko |

**Preis:** teuer, mit Abstand die teuerste Fläche.

---

#### C — Eine Fraktion an die Tür rufen

**Kauft:** garantiert, dass das **nächste** Türangebot mindestens ein Symbol der gewählten Fraktion
zeigt.

**Warum:** Einfluss ohne Macht. Der Spieler bekommt keinen stärkeren Skill, sondern eine
**verlässlichere Richtung** — genau das, was einem halb gebauten Fraktions-Build fehlt. Und sie kostet
die Balance fast nichts, weil sie die Stärke der Skills nicht anfasst, nur ihre Verteilung.

**Limit:** einmal je Skill-Phase, wirkt nur auf das **nächste** Angebot, ruft **ein Symbol, keine
Tür** — die übrigen Symbole bleiben gewürfelt. Ein Ruf, der wartet, bis er passt, wäre kein Ruf mehr.

**Offen:** Zusammenspiel mit dem Startfokus (noch offen in `docs/skill-rework.md` §1). Naheliegend
wäre, dass der Ruf auf die Fokus-Fraktion weniger kostet — entscheidbar erst, wenn der Fokus steht.

**Preis:** mittel.

---

#### D — Energie in der Aufstellphase

**Kauft:** einen zusätzlichen Tausch in der laufenden Aufstellphase.

**Warum:** Formations-Energie ist die knappste Zahl im Spiel, und die Aufstellung ist die Entscheidung,
die der Spieler am unmittelbarsten sieht. Die klarste „ich rette diesen Durchlauf"-Ausgabe im Katalog.

**Limit:** höchstens **+2 je Aufstellphase**, Preis steigt innerhalb der Phase, gekaufte Energie
**verfällt mit der Phase**.

**Hängt an F1**, und zusätzlich zu prüfen: ob gekaufte Energie den negativen Wochen-Modifikator
„Energie-Ebbe" entwertet.

**Preis:** mittel, steigend.

---

#### E — Baufeld-Zellen

**Kauft:** hebt den Baufeld-Deckel.

**Warum schwieriger als die anderen:** die einzige Fläche mit **dauerhafter** Wirkung. Eine gekaufte
Zelle trägt in jedem folgenden Durchlauf — je früher gekauft, desto mehr. Das ergibt eine unangenehme
Kurve: die beste Ausgabe ist immer die früheste, und wer früh kein Geld hat, holt es nie auf.

| | Regel | Bemerkung |
| --- | --- | --- |
| E1 dauerhaft, hart gedeckelt | +2 Zellen je Kauf, höchstens 2× je Lauf, Preis steigt stark | echte Investitionsentscheidung, aber begrenzt |
| E2 auf Zeit | +4 Zellen für einen Durchlauf, beliebig oft | passt zum Verfalls-Prinzip, fühlt sich beim Bauen aber falsch an — ein Gebäude, dessen Fläche nächste Runde weg ist |

**Preis:** teuer.

---

#### Drei weitere, die die Erkundung nahelegt

Nicht vom Owner genannt, aber sie fallen aus den Mechaniken heraus, die ohnehin da sind:

**F — Eine Karte umstellen, außerhalb der Aufstellphase.** Ein einzelner Positionstausch mitten im
Durchlauf, wenn man sieht, dass eine Formation um eins verfehlt wird. Sehr starkes Gefühl, sehr kleiner
Eingriff — und ein natürlicher harter Deckel: einmal je Durchlauf.

**G — Ein Gebäude verschieben oder abreißen.** Der Architekt ist heute endgültig: was steht, steht.
Eine Münze, die einen Fehlbau zurücknimmt, ist Vergebung statt Macht — die freundlichste Art, eine
Ökonomie einzuführen.

**H — Eine Aufgabe neu würfeln.** Wenn Aufgaben gewürfelt werden (§4.3), ist die Aufgabe selbst eine
Ausgabefläche: eine unpassende gegen eine neue tauschen. Elegant, weil die Ökonomie sich damit auf sich
selbst bezieht — man gibt Münzen aus, um besser an Münzen zu kommen. Braucht dann einen Deckel, sonst
würfelt man bis zur leichtesten.

---

**Übersicht:**

| | Fläche | Wirkung | Deckel | Preis | Bereit? |
| --- | --- | --- | --- | --- | --- |
| A | Neuwurf | ein Angebot neu | 1 je Angebot | billig | ja, nach F1 |
| B | Skill-Stufe | +1 Stufe | je Abschnitt (B2) | sehr teuer | erst nach dem Skill-Rework |
| C | Fraktion rufen | nächstes Türsymbol | 1 je Skill-Phase | mittel | ja |
| D | Energie | +1 Tausch | +2 je Phase | mittel | ja, nach F1 |
| E | Baufeld | +2 Zellen | 2× je Lauf | teuer | ja, nach F1 |
| F | Karte umstellen | 1 Tausch im Durchlauf | 1 je Durchlauf | mittel | Erkundung |
| G | Gebäude zurücknehmen | Fehlbau lösen | 1 je Durchlauf | mittel | Erkundung |
| H | Aufgabe neu würfeln | andere Aufgabe | 1 je Durchlauf | billig | hängt an §4.3 |

Die Flächen zerfallen in zwei Arten, und die Unterscheidung ist nützlicher als jede Preisliste:

- **Reichweite** (A, C, H): mehr Auswahl, gleiche Stärke. Kaum Balance-Risiko.
- **Stärke** (B, D, E, F, G): der Durchlauf wird besser. Hier sitzen die Deckel.

Wenn eine erste Fassung klein anfangen soll, ist die Reichweiten-Gruppe der Ort dafür — sie lässt sich
bauen, spielen und wieder verwerfen, ohne dass die Balance nachzieht.

### 3.3 Warum jede Fläche einen Deckel braucht

Der Owner hat es beim Nennen der Flächen vorweggenommen. Der Mechanismus dahinter bestimmt die *Form*
der Deckel:

Autostich rechnet einen Stich als Basis mal Multiplikatoren, und der Score wächst über den Lauf
geometrisch. **Alles, was am Multiplikator hängt, wächst mit.** Eine Ökonomie, die daran koppelt,
wächst also nicht linear mit, sondern schneller — wer vorne liegt, verdient mehr, kauft mehr, liegt
weiter vorne.

Zwei Gegenmittel, beide hier eingebaut:

1. **Deckel je Phase, nicht je Lauf.** Ein Deckel auf den Kontostand wäre umgehbar und fühlte sich
   willkürlich an. Ein Deckel auf das, was *in diesem Moment* kaufbar ist, begrenzt die Höhe, ohne das
   Sparen zu bestrafen. Sparen bringt dann **Reichweite, nicht Höhe** — man kann öfter kaufen, nicht
   stärker.
2. **Einnahmen aus Aufgaben, nicht aus Score.** Eine Aufgabe zahlt fest: wer den doppelten Score hat,
   bekommt dieselben Münzen wie der mit dem halben, sofern beide die Aufgabe schaffen. Das hält die
   Ökonomie flach, während der Score exponentiell läuft. Genau das ist die Owner-Setzung — sie ist
   nicht nur thematisch die schönere, sondern strukturell die einzige, die stabil bleibt.

### 3.4 Knapp oder reichlich — F3

Die Frage, die den Charakter der ganzen Ökonomie entscheidet, und die vor jeder Zahl beantwortet
gehört:

| | Gefühl | Folge |
| --- | --- | --- |
| **Knapp** | ein Lauf erlaubt vielleicht 8 bis 12 Käufe; jeder ist eine Entscheidung | jede Ausgabe wiegt; Sparen ist eine echte Alternative; das Verfehlen einer Aufgabe tut weh |
| **Reichlich** | fast jeder Durchlauf erlaubt einen Kauf | Ökonomie ist Rhythmus statt Entscheidung; Deckel müssen sehr eng sein, sonst tragen die Käufe den Lauf |

**Erkundung, kein Vorschlag.** Der Unterschied ist nicht die Zahl, sondern was der Spieler tut: bei
*knapp* schaut er auf seine Münzen und wartet; bei *reichlich* schaut er auf den Deckel und kauft, was
gerade geht. Beides ist ein legitimes Spiel — nur muss man wissen, welches.

Eine Größenordnung, an der sich Zahlen später ausrichten können: die Münze soll **zählbar** bleiben —
zweistellig, im Kopf zu behalten, nicht im Zahlenraum des Scores.

### 3.5 Nimmt man Münzen in den nächsten Lauf mit? — F5

Der Denkstand lässt offen, ob man zwischen den Läufen einer Ebene etwas mitnimmt. Die Münze ist dafür
der naheliegende Kandidat — sie ist schon eine Währung, sie hat schon einen Bogen, und eine Ebene ist
genau der größere Bogen, über den sie stattdessen laufen könnte.

**Sie ist aber nicht der harmlose Kandidat.** Drei Varianten, mit ihrem jeweiligen Preis:

| | Regel | Was es mit dem Spiel macht |
| --- | --- | --- |
| **V1 Verfall je Lauf** | Münzen enden mit dem Lauf | die Spar-Frage bleibt scharf: „jetzt ausgeben oder auf Durchlauf 40 warten?" Am Laufende gibt man alles aus, weil Sparen wertlos wird — ein sauberer, lesbarer Schlusspunkt |
| **V2 Rest wandert in die Ebene** | was übrig ist, startet den nächsten Lauf | die Ebene bekommt einen Bogen, und Lauf 1 zahlt auf Lauf 5 ein. Aber **Sparen wird immer richtig** — die Frage aus V1 verschwindet, und mit ihr die interessanteste Eigenschaft der Münze |
| **V3 Nur Boss-Beute wandert** | laufende Aufgaben verfallen, Boss-Münzen bleiben | beides zugleich: die kleine Ökonomie bleibt scharf, die große bekommt einen Bogen. Dafür zwei Töpfe, die der Spieler auseinanderhalten muss |

**Der Kernkonflikt in einem Satz:** Verfall macht die Münze zu einer Entscheidung, Mitnahme macht sie zu
einem Vermögen. Ein Vermögen wird immer gespart, bis es gebraucht wird — das ist kein Fehler, aber es
ist ein anderes Spiel.

**Was gegen V2 spricht, über das Gefühl hinaus:** die Ebene ist ohnehin schon die Stelle, an der sich
Vorteile stapeln — XP, Freischaltungen, gelernte Bosse. Ein mitgenommenes Vermögen legt eine weitere
Schicht darauf, und zwar für den Spieler, dem die Läufe ohnehin gelingen. In einer Struktur, in der
das Scheitern eines Laufs die Ebene kosten kann (§7), ist das die Richtung, in die man am wenigsten
zusätzlich verstärken will.

Wenn der Denkstand eine Mitnahme *will* — und das Argument dafür ist stark, weil eine Ebene sonst nur
fünf unverbundene Läufe sind —, ist **V3 der Weg, der beides behält.** Aber das ist Erkundung: die
Frage gehört zur Progression, nicht zur Ökonomie, und dieses Dokument liefert dazu nur die
Nebenwirkung.

---

## 4. Wie man Münzen verdient

Der Kern dieser Runde. Gesetzt ist: **keine Score-Kopplung, sondern gezielte Spielmechanik-Aufgaben.**
Offen ist alles andere.

### 4.1 Was „gezielte Spielmechanik-Aufgabe" heißt

Eine Aufgabe, die den Spieler dazu bringt, **einen Durchlauf anders zu spielen** als er ihn sonst
gespielt hätte. Das ist der ganze Test, und er trennt scharf:

| Keine Aufgabe | Aufgabe |
| --- | --- |
| „Erreiche 500.000 Punkte" — misst nur, ob der Build gut ist | „Gewinne drei Stiche in Folge mit Karten unter Wert 5" — ändert, wie man aufstellt |
| „Gewinne 30 Stiche" — passiert ohnehin oder gar nicht | „Gewinne einen Stich mit einem Abstand von genau 1" — man hält eine Karte zurück |
| „Sammle 200 Wachstum" — der Build entscheidet, nicht der Spieler | „Beende den Durchlauf ohne einen Neuwurf" — kostet etwas Reales |

Die schlechten Beispiele haben alle dieselbe Krankheit: **sie messen den Build, nicht das Spiel.** Der
Spieler kann nichts tun, um sie zu erfüllen oder zu verfehlen — sie passieren ihm.

Vier Anforderungen, aus denen der Rest folgt:

1. **Vor dem Durchlauf sichtbar.** Eine Aufgabe, die man beim Abrechnen erfährt, ist ein Bonus.
2. **Beeinflussbar, aber nicht erzwungen.** Sie soll eine Entscheidung ändern, nicht den Build
   vorschreiben.
3. **Flach in der Auszahlung.** Fester Betrag (§3.3).
4. **Ein Satz.** Was erklärt werden muss, passt nicht in eine Zeile, die vor jedem Durchlauf steht.

### 4.2 Der Katalog — was das Spiel hergibt

Nach Gruppen sortiert. Die Spalte „hängt an" nennt die Größe, die die Engine **bereits** je Stich oder je
Durchlauf führt — eine Aufgabe, die dort andockt, kostet fast nichts.

---

**Gruppe 1 — Der einzelne Stich.** Die reichste Ebene, weil die Engine hier am meisten weiß.

| Aufgabe | Hängt an | Was sie am Spiel ändert |
| --- | --- | --- |
| Gewinne einen Stich mit Abstand 1 | `margin` | man hält die passende Karte zurück, statt mit der höchsten zu gewinnen |
| Gewinne 5 Stiche mit Karten unter Wert 4 | `winValue` | schwache Karten werden zur Ressource statt zum Ballast |
| Gewinne mit Abstand ≥ 8 | `margin` | die Übermacht wird gezielt gesucht |
| Gewinne den Stich direkt nach einer Niederlage, dreimal | `lostLastTrick` | Niederlagen bekommen einen Nutzen |
| Gewinne jeden 3. Stich | `wins` | ein Rhythmus statt einer Summe |

---

**Gruppe 2 — Serie und Verlauf.** Über den Durchlauf hinweg, nicht je Stich.

| Aufgabe | Hängt an | Was sie ändert |
| --- | --- | --- |
| Erreiche eine Serie von 8 | `winStreak` | Aufstellung wird auf Kontinuität optimiert statt auf Spitzen |
| Verliere in den ersten 10 Stichen keinen | Position + Sieg | der Anfang der Aufstellung bekommt Gewicht |
| Gewinne die letzten 5 Stiche | Position + Sieg | das Ende bekommt Gewicht — heute meist egal |
| Halte eine Serie über eine Segmentgrenze | `winStreak` + Segmente | zwingt zu einem Blick auf die Segmentstruktur |

---

**Gruppe 3 — Aufstellung und Formationen.** Die Ebene, auf der der Spieler am meisten Kontrolle hat —
und damit die für Aufgaben tragfähigste.

| Aufgabe | Hängt an | Was sie ändert |
| --- | --- | --- |
| Baue eine Treppe der Länge 4 | Formationstyp `treppe` | eine schwer zu bauende Formation wird gezielt versucht |
| Baue in einem Segment zwei verschiedene Formationstypen | Formationen je Segment | die Überlappung wird bewusst gesucht |
| Gewinne 6 Stiche, die über eine Formation liefen | `hasFormation` | Formation statt roher Kartenwert |
| Baue einen Farbblock über 5 Karten | `farbblock` | eine ganze Segmentlänge auf eine Farbe |
| Beende die Aufstellphase mit ungenutzter Energie | Energie | Verzicht als Aufgabe — kollidiert reizvoll mit Fläche D |

Die vier Formationstypen — Wiederholung, Farbblock, Treppe, Wechsel — sind der natürlichste
Aufgaben-Fundus im ganzen Spiel: sie sind sichtbar, planbar, verschieden schwer, und der Spieler
entscheidet sie direkt.

---

**Gruppe 4 — Architekt und Baufeld.**

| Aufgabe | Hängt an | Was sie ändert |
| --- | --- | --- |
| Baue ein Gebäude, das an zwei andere grenzt | Nachbarschaft | Bauplanung statt Lückenfüllen |
| Fülle ein Segment des Baufelds vollständig | Belegung | eine Fläche wird zu Ende gedacht |
| Halte 5 Zellen bis zum Ende frei | Belegung | Verzicht, und eine echte Gegenrichtung zu Fläche E |
| Baue ein Gebäude jeder der drei Kategorien | Kategorie | Breite statt Spezialisierung |

Einschränkung: nur in Architekt-Runden erfüllbar. Solche Aufgaben müssen entweder auf diese Runden
beschränkt bleiben oder über mehrere Durchläufe laufen.

---

**Gruppe 5 — Fraktionen.** Jede Fraktion führt eigene Motor-Zähler, an denen eine Aufgabe direkt hängen
kann.

| Fraktion | Zähler | Beispielaufgabe |
| --- | --- | --- |
| Blitz | Crits, Ladung, Ionisierungen | „Fülle die Ladungsleiste zweimal in einem Durchlauf" |
| Feuer | Asche, Brände | „Verbrenne Asche in fünf verschiedenen Stichen" |
| Pflanze | Wachstum, Kolonisierung | „Bringe drei Karten auf Wachstum 5" |
| Eis | Gletschermasse, Einfrieren | „Friere zwei Gegnerkarten im selben Segment ein" |

**Achtung, doppelt.** Erstens: eine Fraktionsaufgabe ist tot, wenn der Build die Fraktion nicht hat —
sie darf nur aus **gehaltenen** Fraktionen gewürfelt werden. Zweitens: Blitz, Feuer und Pflanze werden
gerade überarbeitet. Fraktionsaufgaben sollten deshalb an **Konzepten** hängen („die Leiste füllen"),
nicht an heutigen Zahlen — sonst veralten sie mit dem nächsten Balance-Pass.

---

**Gruppe 6 — Verzicht.** Die interessanteste Art, weil die Aufgabe kostet, was sie zahlt.

| Aufgabe | Was sie ändert |
| --- | --- |
| Beende den Durchlauf ohne einen Neuwurf | der Neuwurf wird zur Abwägung statt zur Gewohnheit |
| Gib in diesem Durchlauf keine Münze aus | die Ökonomie prüft sich selbst |
| Nimm den zuerst angebotenen Skill, ohne die zweite Tür zu öffnen | Entscheidungsdruck statt Optimierung |
| Spiele einen Durchlauf ohne Gebäudebau | die Gewohnheit wird unterbrochen |

Verzichtsaufgaben sind die einzigen, die **garantiert** eine Entscheidung ändern — man muss aktiv etwas
lassen. Sie sind zugleich die riskantesten: zu viele davon, und das Spiel besteht aus Nicht-Spielen.
Ein Anteil, kein Prinzip.

---

**Gruppe 7 — Der ganze Durchlauf.**

| Aufgabe | Was sie ändert |
| --- | --- |
| Gewinne in jedem der 8 Segmente mindestens 3 Stiche | Gleichmäßigkeit statt Spitzen — greift die Aufstellung als Ganzes an |
| Verliere höchstens 10 Stiche | eine ehrliche Schwelle, wenn sie über der Gewohnheit liegt |
| Gewinne die Stiche 1, 20 und 40 | Positionen statt Summen — zwingt zum Blick auf die Reihenfolge |

### 4.3 Zufällig oder fest — F2

Die Achse, die der Owner benannt hat. Drei Modelle:

---

**Modell 1 — Fest.** Jeder Lauf hat dieselbe Aufgabenliste, in derselben Reihenfolge.

- **Dafür:** planbar. Der Spieler lernt sie und baut den Lauf darauf. Perfekt fair, seed-unabhängig,
  in Ranked ohne Sonderbehandlung. Sehr billig zu bauen.
- **Dagegen:** ab dem dritten Lauf sind es keine Aufgaben mehr, sondern eine Checkliste. Die Ökonomie
  wird zum festen Einkommen, und wer die Liste kennt, spielt jeden Lauf gleich an.

---

**Modell 2 — Zufällig.** Vor jedem Durchlauf eine gewürfelte Aufgabe aus dem Katalog.

- **Dafür:** jeder Lauf fühlt sich anders an; die Aufgabe reagiert auf den Zustand (nur gehaltene
  Fraktionen, nur passende Runden); der Katalog kann wachsen, ohne dass etwas umgebaut wird.
- **Dagegen:** Fairness wird zur Bauaufgabe. Ranked ist seed-deterministisch — gewürfelte Aufgaben
  müssen aus demselben Seed kommen oder dort abgeschaltet sein. Und ein Pechlauf, in dem dreimal eine
  schwere Aufgabe kommt, fühlt sich ungerecht an, ohne dass der Spieler etwas falsch gemacht hat.

---

**Modell 3 — Gemischt.** Ein fester Rahmen, zufällig gefüllt: jeder Durchlauf hat eine Aufgabe, ihre
**Gruppe** steht fest (etwa: jeder vierte Durchlauf eine Formations-Aufgabe), die konkrete Aufgabe wird
aus dieser Gruppe gewürfelt.

- **Dafür:** der Spieler weiß, *welche Art* Aufgabe kommt, aber nicht welche. Das ist genug Struktur
  zum Planen und genug Zufall gegen die Checkliste. Und es löst das Gruppe-4-Problem von selbst:
  Architekt-Aufgaben werden nur in Architekt-Runden gezogen.
- **Dagegen:** braucht einen Katalog mit ausreichend Einträgen **je Gruppe**, nicht nur insgesamt.
  Mehr Vorarbeit als Modell 1 oder 2.

---

**Wenn eine Richtung gefragt ist: Modell 3.** Es ist das einzige, das mit dem Entscheidungsplan
zusammenarbeitet statt gegen ihn — der Plan sagt ohnehin schon, was in dieser Runde entschieden wird,
und die Aufgabengruppe kann daran hängen. Aber das ist eine Erkundungs-Aussage, keine Empfehlung zum
Bauen: alle drei sind spielbar, und welches sich richtig anfühlt, weiß man erst, wenn man eines davon
gespielt hat.

### 4.4 Takt, Menge, Schwierigkeit

Drei Stellschrauben, alle offen:

**Takt.** Eine Aufgabe je Durchlauf (50 je Lauf) ist der naheliegende Rhythmus — sie steht neben der
Entscheidung, die ohnehin ansteht. Alternativen: eine je Abschnitt (dann sind es fünf bis zehn, jede
größer), oder eine laufende plus eine kurzfristige.

**Menge.** Hängt an F3. Bei „knapp" schafft man vielleicht die Hälfte, bei „reichlich" fast alle.
Wichtiger als die Quote ist, dass **das Verfehlen normal ist** — eine Aufgabe, die man immer schafft,
ist ein Bonus; eine, die man selten schafft, ist Frust. Die Mitte ist das Ziel.

**Schwierigkeit.** Eine Aufgabe sollte nicht schwerer werden, weil der Lauf länger läuft — der Build
wird ohnehin stärker, dieselbe Aufgabe wird von allein leichter. Zwei Wege: die Aufgaben in späteren
Abschnitten aus einem schwereren Katalogteil ziehen, oder die Schwelle mitwachsen lassen. Ersteres ist
lesbarer, Letzteres ist billiger.

### 4.5 Was noch offen ist

- Kostet eine verfehlte Aufgabe etwas? *(Neigung: nein — eine Aufgabe, die man ignorieren kann, ist
  eine Einladung; eine, die bestraft, ist eine Pflicht. Bei einer Ökonomie, die sonst nichts hat, wäre
  eine Strafe zudem eine Abwärtsspirale.)*
- Gelten Aufgaben in der Wochen-Rangliste? **Vor dem Bau zu klären** — Ranked ist seed-deterministisch,
  damit alle dieselbe Woche spielen. Gewürfelte Aufgaben müssen aus dem Wochen-Seed kommen oder dort
  ausgeschaltet sein.
- Sieht man die Aufgabe des **nächsten** Durchlaufs schon? Das würde die Entscheidung, die davor steht,
  informieren — und ist damit vermutlich der größte Gewinn für den kleinsten Aufwand.
- Zeigt der Endbildschirm die erfüllten Aufgaben? *(Neigung: ja — die Münzzeile, die #229 entfernt hat,
  käme damit in anderer Form zurück.)*

---

## 5. Bosse

**Gesetzt:** zwei Zwischenbosse, gedanklich in **Durchlauf 15 und 30**, mit Belohnung oder Münzen.
Alles Weitere gehört dem Denkstand aus §1 und der Progression — hier steht nur, was die Ökonomie davon
berührt.

### 5.1 Ein Boss ist eine Aufgabe mit Schwelle

Im Sinne von §4 ist ein Boss nichts Neues, sondern der **große Bruder einer Aufgabe** — mit zwei
Unterschieden, die aus dem Denkstand kommen:

| | Gewöhnliche Aufgabe | Boss |
| --- | --- | --- |
| Bedingung | eine Spielmechanik | eine **Score-Schwelle** |
| Verfehlen | kostet nichts | kostet die Ebene |
| Wirkung | keine | eine **Mechanik auf den ganzen Lauf** |
| Zahlt | wenige Münzen | viele, plus Fortschritt |

Die Ökonomie muss dafür nicht umgebaut werden: der Boss zahlt in denselben Topf, nur mehr. Was sich
ändert, ist das Gewicht — wenn ein Boss ein Vielfaches einer Aufgabe zahlt, dann taktet die Ökonomie
nach den Bossen und nicht nach den Aufgaben. Das ist eine Verhältnisfrage (§3.4), keine Strukturfrage.

### 5.2 Die Mechanik wirkt auf den ganzen Lauf — und dafür gibt es ein fertiges Muster

Der wichtigste technische Befund dieser Runde. „Eine Mechanik, die auf den ganzen Lauf wirkt" ist
**exakt** das, was die Wochen-Modifikatoren heute schon sind:

- neunzehn Regeln, die einen **ganzen Lauf lang** gelten,
- in **positive und negative** geteilt, mit **Ausschlusspaaren**, damit sich Gegensätze nicht treffen,
- **seed-deterministisch** gezogen — dieselbe Auswahl für alle, bei Neustart reproduzierbar,
- ihren **Anzeigetext tragen sie selbst**, mit gerollter Stärke im Text,
- und sie hängen an **benannten Wirkungsstellen** in Reducer und Engine: gesperrte Aufstell-Felder,
  gesperrte Baufeld-Zellen, stärkere Gegner, Deck-Shuffle, Energie, Bau-Limit, Skill- und
  Perk-Verknappung, Neuwurf-Sperre, Raritätsdeckel, doppelte Legendäre, verstärkte Boni.

Eine Boss-Mechanik ist strukturell dasselbe Objekt. **Der Bauaufwand liegt damit nicht in der Mechanik,
sondern in der Auswahl** — wann sie greift, wie sie angekündigt wird, wie viele gleichzeitig laufen.
Wenn Boss-Mechaniken denselben Zuschnitt bekommen, teilen sich beide Systeme später Auswahl,
Darstellung und Prüfung.

Dazu kommt die zweite fertige Hälfte: ein stärkerer Gegner ist über `difficulty` gelöst — ein flacher
Aufschlag plus ein mitwachsender Ramp, im Normallauf ein reiner No-op.

**Drei Dinge, die das Muster mitbringt und die im Boss-Entwurf beantwortet werden müssen:**

1. **Stapeln sich die Mechaniken?** Wer Durchlauf 15 und 30 hinter sich hat, trägt ab 30 zwei Regeln
   gleichzeitig, bis 50 dann drei. Bei negativen Mechaniken addieren sich die Nachteile genau dann, wenn
   die Schwelle am höchsten ist. Die Wochen-Modifikatoren lösen das mit Ausschlusspaaren — das Werkzeug
   liegt bereit, aber die Regel muss gewollt sein.
2. **Sind Boss-Mechaniken nur Nachteile?** Der Wochen-Pool ist bewusst gemischt. Ein Boss, der eine
   Mechanik *schenkt* statt auferlegt, ist genauso denkbar und macht die Begegnung zu einer Weggabelung
   statt zu einer Wand.
3. **Wie viele braucht der Pool?** Fünfzehn eigene Bosse je Ebene sind fünfzehn Lauf-Mechaniken — das
   ist viel Inhalt. Die vom Owner selbst genannte Alternative (kleiner Pool, gezogen, plus fester
   finaler Boss) ist genau das, was die Wochen-Modifikatoren tun: neunzehn Regeln reichen dort für
   beliebig viele Wochen, weil die Kombination die Abwechslung trägt, nicht die Anzahl.

### 5.3 Ankündigung

Unabhängig von allem anderen: **die Boss-Mechanik sollte vor dem Boss sichtbar sein**, nicht erst mit
ihm. Der Spieler sieht in Durchlauf 14, was ab 15 gilt, und geht mit dieser Kenntnis in die
Entscheidung davor. Das kostet keinen Platz im Entscheidungsplan und verwandelt den Boss von einer
Überraschung in eine Vorbereitung — bei einer Mechanik, die dann 35 Durchläufe lang wirkt, ist das
kein Komfort, sondern die Voraussetzung dafür, dass die Entscheidung überhaupt eine ist.

---

## 6. Score mit Par — jetzt eine Schwelle

Der geteilte Denkstand ändert diesen Abschnitt am stärksten. Bisher war Par eine Anzeige. Mit einer
Score-Schwelle je Boss wird er **die Schwelle selbst.**

### 6.1 Par und Boss-Schwelle sind dasselbe Objekt

Beides ist eine Antwort auf dieselbe Frage: *wie viel Score ist in Durchlauf n normal?*

- **Par** beantwortet sie als Auskunft: „ein durchschnittlicher Lauf steht hier bei X."
- **Die Boss-Schwelle** beantwortet sie als Bedingung: „unter X ist hier Schluss."

Das ist **eine Kurve mit zwei Gebrauchsweisen**, nicht zwei Systeme. Wer die Par-Kurve gemessen hat,
liest die drei Boss-Schwellen bei Durchlauf 15, 30 und 50 direkt daran ab — als Prozentsatz des Par an
dieser Stelle. Und der Spieler, der Par laufend sieht, sieht damit zugleich, wie er zur nächsten
Schwelle steht. Eine Anzeige, zwei Zwecke, keine doppelte Zahlenpflege.

Damit beantwortet sich auch, was ein Par „soll": er ist nicht Dekoration, sondern **die Skala, auf der
die ganze Progression ihre Schwierigkeit einstellt.**

### 6.2 Was das über die Kurve verlangt

Die Form steht fest, bevor eine Zahl gemessen ist: **exponentiell**, weil der Score geometrisch wächst.
Ein linearer Par wäre in Durchlauf 5 unerreichbar und in Durchlauf 45 belanglos. Aus den bekannten
Konstanten überschlagen liegt das Wachstum grob bei 10 bis 20 Prozent je Durchlauf, mit dem größten
Teil des Gesamtscores in den letzten zehn.

> **Kennzeichnung nach Hausregel:** diese Spanne ist **inferiert, nicht gemessen** — eine
> Überschlagsrechnung über Konstanten, kein Sim-Lauf. Jede konkrete Par- oder Schwellenzahl ist bis
> dahin Platzhalter. Die Messung liefert `sim/` auf Ansage, und sie ist jetzt nicht mehr nur nützlich,
> sondern **Voraussetzung**: ohne sie sind die Boss-Schwellen geraten.

Drei Fragen, die die Messung mitbringen muss — die erste ist neu und die wichtigste:

1. **Welcher Lauf ist der Durchschnitt?** Solange Par nur anzeigt, ist das Geschmackssache. Sobald er
   die Schwelle setzt, entscheidet er, wer weiterkommt. Eine Kurve aus *allen* Läufen und eine aus den
   *guten* Läufen liegen weit auseinander.
2. **Ein Par für alle Fraktionen, oder je Fraktion einer?** Ein reiner Blitz- und ein reiner
   Pflanze-Build haben vermutlich verschiedene Kurvenformen. Als Anzeige wäre ein gemeinsamer Par
   ungenau; als Schwelle wäre er unfair.
3. **Wie verändern die Boss-Mechaniken die Kurve?** Wer ab Durchlauf 15 eine Regel trägt, spielt nicht
   mehr den gemessenen Durchschnittslauf. Die Schwelle in Durchlauf 30 muss gegen einen Lauf *mit*
   Mechanik gesetzt sein, nicht gegen den unbelasteten — sonst wird der zweite Boss härter als geplant,
   ohne dass jemand es beschlossen hat.

### 6.3 Par zahlt weiterhin nicht aus

Die Klarstellung bleibt, und sie wird mit der Schwelle sogar wichtiger: **Par zahlt keine Münzen.**
Der Owner hat gesetzt, dass Münzen nicht am Score hängen. Ein Par, der Münzen zahlt, wäre die
Score-Kopplung durch die Hintertür — und in einer Struktur, in der ein verfehlter Boss eine Ebene
kostet, wäre die dadurch entstehende Aufwärtsspirale besonders teuer: wer gut läuft, verdient mehr,
kauft mehr, reißt die Schwelle leichter.

Der Boss zahlt fürs **Bestehen**, nicht für die Höhe. Das hält die Ökonomie flach und die Schwelle
scharf.

---

## 7. Was die Zielgröße verlangt — F4

Der Denkstand nennt eine Zielgröße: **15 bis 20 Stunden, also 30 bis 40 Läufe.** Daraus lässt sich
etwas ableiten, das sonst geraten werden müsste — nämlich, **wie oft ein Lauf gelingen muss.** Und das
Ergebnis hängt vollständig daran, was „die Ebene verloren" bedeutet.

Drei Ebenen zu fünf Läufen sind **15 Läufe für den perfekten Durchmarsch**. Bei 30 bis 40 Läufen
insgesamt heißt das: **10 bis 13 Läufe je Ebene**, also ungefähr das Doppelte des Minimums.

Zwei Lesarten, gerechnet:

| Erfolgsquote je Lauf | **A:** fünf **in Folge** nötig | **B:** fünf bestandene **gesammelt** |
| --- | --- | --- |
| 50 % | 62 Läufe | 10 Läufe |
| 60 % | 30 | 8,3 |
| 70 % | 16,5 | 7,1 |
| 75 % | **12,9** | 6,7 |
| 80 % | **10,3** | 6,3 |
| 90 % | 6,9 | 5,6 |

*(Erwartungswerte, Läufe je Ebene. A: eine Serie von fünf Erfolgen; ein Fehlschlag setzt zurück.
B: fünf Erfolge sammeln; ein Fehlschlag kostet nur diesen Lauf. Reine Wahrscheinlichkeitsrechnung
über die Zielgröße — **kein Sim-Ergebnis** und keine Aussage darüber, wie schwer das Spiel heute ist.)*

**Das Ergebnis ist kontraintuitiv, und es ist der nützlichste Satz in diesem Abschnitt:**

> **Lesart A — fünf in Folge — verlangt die *milderen* Schwellen.** Drei von vier Läufen müssen
> durchgehen (75–80 %), sonst sprengt die Wiederholung die Zielgröße. Lesart B — sammeln — verträgt
> harte Schwellen: dort reicht **jeder zweite Lauf** (40–50 %).

Der Grund ist die Serie. Bei A kostet ein einzelner Fehlschlag alles bereits Erreichte, und diese
Kosten wachsen exponentiell mit der geforderten Länge. Bei B kostet ein Fehlschlag genau einen Lauf.

**Was daraus folgt, ohne dass etwas entschieden werden muss:**

- Wer **harte, spürbare Boss-Schwellen** will — den Balatro-Moment, in dem es wirklich knapp wird —,
  braucht Lesart B oder etwas dazwischen (ein Puffer: „ein Fehlschlag je Ebene ist erlaubt").
- Wer **die Serie** will — die Spannung, dass fünf Läufe am Stück halten müssen —, muss die Schwellen
  großzügiger setzen, als es sich anfühlt: bei 75 % Erfolgsquote scheitert nur jeder vierte Lauf.
- **Beides zugleich — harte Schwellen und Serienzwang — ergibt 30 bis 60 Läufe je Ebene**, also das
  Drei- bis Sechsfache der Zielgröße. Das ist die eine Kombination, die die Rechnung ausschließt.

Ein dritter Weg, der beides teilweise behält und die Rechnung entschärft: **die Ebene bricht nicht ab,
sondern verliert.** Ein verfehlter Boss beendet den Lauf, aber die XP für das Erreichte bleiben — was
der Denkstand ohnehin vorsieht („abhängig davon, wie weit man kommt"). Dann ist ein gescheiterter Lauf
kein verlorener Abend, sondern ein kürzerer, und die Zielgröße verträgt deutlich härtere Schwellen.

---

## 8. Risiken

| # | Risiko | Wo | Gegenmittel |
| --- | --- | --- | --- |
| 1 | Kaufbare Skill-Stufen verschieben den Erwartungswert der Stufenleiter | §3.2 B | Fläche B erst nach dem Skill-Rework; höchste Stufe nicht kaufbar |
| 2 | Die Ökonomie koppelt doch an den Score und erzeugt eine Aufwärtsspirale | §3.3, §6 | feste Auszahlung je Aufgabe; Par zahlt nicht aus |
| 3 | Gewürfelte Aufgaben brechen die Seed-Zusage der Wochen-Rangliste | §4.5 | aus dem Wochen-Seed würfeln oder in Ranked abschalten — vor dem Bau zu klären |
| 4 | Aufgaben, die der Build nicht bedienen kann, sind tote Anzeige | §4.2 Gruppe 5 | nur aus dem aktuellen Zustand würfeln — gehaltene Fraktionen, passende Rundentypen |
| 5 | Fraktionsaufgaben veralten mit dem nächsten Balance-Pass | §4.2 Gruppe 5 | an Konzepten aufhängen, nicht an heutigen Zahlenwerten |
| 6 | Ohne Baum fehlt der Startwert für Rerolls, Energie, Baufeld | §3.2 A, D, E | F1 — hängt am neuen Progress, nicht an diesem Dokument |
| 7 | Verzichtsaufgaben häufen sich, und das Spiel besteht aus Nicht-Spielen | §4.2 Gruppe 6 | Anteil begrenzen |

Risiko 1 und 6 lösen sich von selbst, wenn die betroffenen Flächen auf ihr anderes Vorhaben warten.
Die übrigen sind Entwurfsentscheidungen.

**Vier weitere, die erst mit dem Denkstand aus §1 entstehen** — sie gehören der Progression, nicht der
Ökonomie, stehen aber hier, weil sie an dieselben Zahlen rühren:

| # | Risiko | Wo | Gegenmittel |
| --- | --- | --- | --- |
| 8 | Harte Schwellen **und** Serienzwang zugleich sprengen die Zielgröße um das Drei- bis Sechsfache | §7 | eines von beidem wählen, oder ein Puffer je Ebene |
| 9 | Boss-Schwellen werden gegen eine Par-Kurve gesetzt, die ohne Boss-Mechaniken gemessen wurde — der zweite und dritte Boss werden dadurch unbeabsichtigt härter | §6.2 | die Kurve **mit** aktiven Mechaniken messen, oder die Schwelle je Boss dagegen korrigieren |
| 10 | Negative Boss-Mechaniken stapeln sich: ab Durchlauf 30 zwei, ab 50 drei — genau dort, wo die Schwelle am höchsten ist | §5.2 | Ausschlusspaare wie bei den Wochen-Modifikatoren; oder ein gemischter Pool, in dem auch Vorteile liegen |
| 11 | Mitgenommene Münzen verstärken den, dem die Läufe ohnehin gelingen | §3.5 | V1 oder V3 statt V2 |

---

## 9. Was zu entscheiden wäre

Kein Entscheidungsdruck — diese Runde erkundet. Die Liste hält fest, **worüber** entschieden werden
muss, sobald es soweit ist, und in welcher Reihenfolge es Sinn ergibt.

### Zuerst, weil alles andere daran hängt

| # | Frage | Stand |
| --- | --- | --- |
| F1 | Wer setzt nach dem Wegfall des Baums den Boden für Neuwürfe, Energie und Baufeld? | hängt am neuen Progress |
| F2 | Aufgaben fest, zufällig oder gemischt? | drei Modelle in §4.3 |
| F3 | Ist die Münze knapp oder reichlich? | zwei Charaktere in §3.4 |
| F4 | Heißt „Ebene verloren" fünf **in Folge** oder fünf **gesammelt**? | entscheidet die Härte der Schwellen — §7 rechnet es |
| F5 | Nimmt man Münzen in den nächsten Lauf mit? | V1 / V2 / V3 in §3.5 |

### Ausgaben

| # | Frage | Erkundungsstand |
| --- | --- | --- |
| M1 | Verfallen Münzen am Laufende? | ja — sonst stellt sich die Spar-Frage nie (§3.1) |
| M2 | Deckel je Phase oder je Lauf? | je Phase: begrenzt die Höhe, nicht das Sparen (§3.3) |
| M3 | Welche Flächen überhaupt? | fünf gesetzt, drei aus der Erkundung dazu (§3.2) |
| M4 | Welche zuerst? | die Reichweiten-Gruppe (A, C, H) — kleinstes Balance-Risiko |
| M5 | Skill-Aufwertung: welcher Härtegrad? | B1 / B2 / B3 in §3.2 |
| M6 | Baufeld dauerhaft oder auf Zeit? | E1 / E2 in §3.2 |
| M7 | Ruft die Münze ein Symbol oder eine ganze Tür? | ein Symbol, nur das nächste Angebot |
| M8 | Ist der Ruf auf die Fokus-Fraktion billiger? | hängt am Fokus (`skill-rework` §1) |

### Verdienen

| # | Frage | Erkundungsstand |
| --- | --- | --- |
| A1 | Welche Gruppen kommen in den Katalog? | sieben in §4.2 |
| A2 | Takt — eine Aufgabe je Durchlauf oder je Abschnitt? | §4.4 |
| A3 | Wie hoch soll die Erfolgsquote liegen? | die Mitte: Verfehlen muss normal sein (§4.4) |
| A4 | Wird die Schwierigkeit mitgezogen? | schwererer Katalogteil je Abschnitt, oder mitwachsende Schwelle |
| A5 | Kostet eine verfehlte Aufgabe etwas? | Neigung: nein (§4.5) |
| A6 | Gelten Aufgaben in Ranked? | vor dem Bau zu klären — Seed-Determinismus |
| A7 | Sieht man die nächste Aufgabe im Voraus? | vermutlich größter Gewinn für kleinsten Aufwand |
| A8 | Anteil Verzichtsaufgaben | begrenzen, nicht streichen |

### Bosse und Par

| # | Frage | Stand |
| --- | --- | --- |
| B1 | Zwischenbosse in 15 und 30 | gesetzt, Platzhalter |
| B2 | Stapeln sich Boss-Mechaniken über den Lauf? | Werkzeug da (Ausschlusspaare), Regel offen — §5.2 |
| B3 | Nur Nachteile, oder auch geschenkte Mechaniken? | der Wochen-Pool ist bewusst gemischt — §5.2 |
| B4 | Fünfzehn eigene Bosse, oder ein Pool mit Ziehung? | die Kombination trägt die Abwechslung, nicht die Anzahl — §5.2 |
| B5 | Wird die Boss-Mechanik vorher angekündigt? | sie wirkt 35 Durchläufe lang — ohne Ankündigung ist sie keine Entscheidung (§5.3) |
| B6 | Mechaniken und Beute im Einzelnen | später, Progression |
| P1 | Par kumulativ und fest? | ja (§6) |
| P2 | Zahlt Par aus? | nein — wäre Score-Kopplung durch die Hintertür |
| P3 | Sind Par-Kurve und Boss-Schwelle dasselbe Objekt? | ja, eine Kurve mit zwei Gebrauchsweisen (§6.1) |
| P4 | Welcher Lauf ist der Durchschnitt? | als Anzeige Geschmackssache, als Schwelle entscheidend (§6.2) |
| P5 | Ein Par für alle Fraktionen oder je Fraktion einer? | als Anzeige ungenau, als Schwelle unfair (§6.2) |
| P6 | Wird die Kurve **mit** aktiven Boss-Mechaniken gemessen? | sonst wird Boss 2 und 3 unbeabsichtigt härter (§6.2, Risiko 9) |

---

## 10. Wenn es weitergeht

Die Reihenfolge, die am wenigsten kostet — nicht als Plan, sondern als Beobachtung, was auf was wartet:

1. **F1 bis F5.** Ohne sie ist jede Zahl geraten. F4 zuerst: sie entscheidet, ob die Boss-Schwellen
   mild oder hart sein dürfen, und das steht vor jeder Messung.
2. **Die Par-Kurve messen.** Sie ist jetzt keine Nebensache mehr, sondern die Skala, auf der die
   Boss-Schwellen sitzen — und damit die Voraussetzung dafür, dass die Progression überhaupt
   eingestellt werden kann. `sim/` liefert sie auf Ansage.
3. **Ein Aufgabenkatalog auf Papier**, ein bis zwei Dutzend Einträge über die Gruppen verteilt. Erst an
   einem gefüllten Katalog sieht man, ob Modell 1, 2 oder 3 trägt — und ob es je Gruppe genug Ideen
   gibt.
4. **Die Reichweiten-Flächen** (A, C, H). Die Ökonomie in ihrer kleinsten vollständigen Form: sie
   verdient, sie gibt aus, sie verfällt — und sie kann nichts kaputt machen.
5. **Stärke-Flächen und Bosse**, wenn die kleine Form sich als tragfähig erwiesen hat.

Schritt 3 und 4 hängen an keinem anderen Vorhaben. Die Skill-Aufwertung wartet auf den Skill-Rework,
die Bosse auf die Progression — das ist der Grund, warum dieser Entwurf beide nach hinten legt.

Was sich gegenüber der letzten Fassung verschoben hat: **die Messung ist nach vorn gerückt.** Solange
Par nur anzeigte, war sie ein Komfort. Als Skala für die Boss-Schwellen ist sie die Zahl, ohne die die
Progression nicht eingestellt werden kann.
