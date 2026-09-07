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
  Belohnung oder Münzen geben. **Kein Endboss vorerst.** (2026-09-07.)
- **Diese Runde erkundet nur.** Ausgaben und Verdienen werden ausgelegt, nicht entschieden.
  (2026-09-07.)

> **Eine Lesart zum Bestätigen:** „lass Boss am Ende des Laufs erstmal weg" ist so gelesen, dass der
> **Endboss** entfällt und die beiden Zwischenbosse bleiben. Falls anders gemeint, ist §5 die einzige
> Stelle, die sich ändert.

### Nicht in diesem Dokument

| Thema | Wo es hingehört |
| --- | --- |
| Skill-Inhalte, Stufen, Fraktionen, Legendäre | `docs/skill-rework.md` (läuft parallel auf `exp`) |
| Der neue Progress, der Baum, SP und DP ersetzt | eigenes Vorhaben — hier nur als Abhängigkeit (§2, F1) |
| Boss-Mechaniken und Boss-Beute | später, im Rahmen der Progression |
| Zwillingstür, Brett- und Deck-Änderungen | geparkt (`docs/skill-rework.md` §1) |
| Code, Konstanten, Tests | eine spätere Runde |

### Offen — die drei Fragen, die alles andere sortieren

- **F1 — Wer setzt künftig den Boden?** Rerolls, Formations-Energie und Baufeld-Größe kommen heute
  aus dem Progression-Baum. Fällt der weg, braucht jede der drei einen neuen Startwert, bevor eine
  Münze etwas dazukaufen kann. Das ist keine Münz-Frage, aber die Münz-Flächen A, D und E hängen
  daran (§3.2).
- **F2 — Aufgaben zufällig oder fest?** Die Achse, die der Owner benannt hat. §4.3 legt drei Modelle
  nebeneinander.
- **F3 — Ist die Münze knapp oder reichlich?** Eine Ökonomie, in der man sich fast alles leisten kann,
  ist eine Verzögerung; eine, in der man fast nichts kann, ist Dekoration. §3.4.

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
3. **Der Score hat keine Auszahlung mehr.** Score-Meilensteine speisen heute SP und DP; fallen beide,
   ist der Score eine Zahl, die nur noch sich selbst bedeutet. Das ist kein Problem dieses Dokuments,
   aber es macht **Par** wichtiger als vorher: wenn Score nichts mehr einbringt, ist die Rückmeldung
   „stehst du gut da?" das Einzige, was er noch leisten kann (§6).

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

Nach Ebene sortiert. Die Spalte „hängt an" nennt die Größe, die die Engine **bereits** je Stich oder je
Durchlauf führt — eine Aufgabe, die dort andockt, kostet fast nichts.

---

**Ebene 1 — Der einzelne Stich.** Die reichste Ebene, weil die Engine hier am meisten weiß.

| Aufgabe | Hängt an | Was sie am Spiel ändert |
| --- | --- | --- |
| Gewinne einen Stich mit Abstand 1 | `margin` | man hält die passende Karte zurück, statt mit der höchsten zu gewinnen |
| Gewinne 5 Stiche mit Karten unter Wert 4 | `winValue` | schwache Karten werden zur Ressource statt zum Ballast |
| Gewinne mit Abstand ≥ 8 | `margin` | die Übermacht wird gezielt gesucht |
| Gewinne den Stich direkt nach einer Niederlage, dreimal | `lostLastTrick` | Niederlagen bekommen einen Nutzen |
| Gewinne jeden 3. Stich | `wins` | ein Rhythmus statt einer Summe |

---

**Ebene 2 — Serie und Verlauf.** Über den Durchlauf hinweg, nicht je Stich.

| Aufgabe | Hängt an | Was sie ändert |
| --- | --- | --- |
| Erreiche eine Serie von 8 | `winStreak` | Aufstellung wird auf Kontinuität optimiert statt auf Spitzen |
| Verliere in den ersten 10 Stichen keinen | Position + Sieg | der Anfang der Aufstellung bekommt Gewicht |
| Gewinne die letzten 5 Stiche | Position + Sieg | das Ende bekommt Gewicht — heute meist egal |
| Halte eine Serie über eine Segmentgrenze | `winStreak` + Segmente | zwingt zu einem Blick auf die Segmentstruktur |

---

**Ebene 3 — Aufstellung und Formationen.** Die Ebene, auf der der Spieler am meisten Kontrolle hat —
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

**Ebene 4 — Architekt und Baufeld.**

| Aufgabe | Hängt an | Was sie ändert |
| --- | --- | --- |
| Baue ein Gebäude, das an zwei andere grenzt | Nachbarschaft | Bauplanung statt Lückenfüllen |
| Fülle ein Segment des Baufelds vollständig | Belegung | eine Fläche wird zu Ende gedacht |
| Halte 5 Zellen bis zum Ende frei | Belegung | Verzicht, und eine echte Gegenrichtung zu Fläche E |
| Baue ein Gebäude jeder der drei Kategorien | Kategorie | Breite statt Spezialisierung |

Einschränkung: nur in Architekt-Runden erfüllbar. Solche Aufgaben müssen entweder auf diese Runden
beschränkt bleiben oder über mehrere Durchläufe laufen.

---

**Ebene 5 — Fraktionen.** Jede Fraktion führt eigene Motor-Zähler, an denen eine Aufgabe direkt hängen
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

**Ebene 6 — Verzicht.** Die interessanteste Art, weil die Aufgabe kostet, was sie zahlt.

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

**Ebene 7 — Der ganze Durchlauf.**

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
**Ebene** steht fest (etwa: jeder vierte Durchlauf eine Formations-Aufgabe), die konkrete Aufgabe wird
aus dieser Ebene gewürfelt.

- **Dafür:** der Spieler weiß, *welche Art* Aufgabe kommt, aber nicht welche. Das ist genug Struktur
  zum Planen und genug Zufall gegen die Checkliste. Und es löst das Ebene-4-Problem von selbst:
  Architekt-Aufgaben werden nur in Architekt-Runden gezogen.
- **Dagegen:** braucht einen Katalog mit ausreichend Einträgen **je Ebene**, nicht nur insgesamt.
  Mehr Vorarbeit als Modell 1 oder 2.

---

**Wenn eine Richtung gefragt ist: Modell 3.** Es ist das einzige, das mit dem Entscheidungsplan
zusammenarbeitet statt gegen ihn — der Plan sagt ohnehin schon, was in dieser Runde entschieden wird,
und die Aufgabenebene kann daran hängen. Aber das ist eine Erkundungs-Aussage, keine Empfehlung zum
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

## 5. Bosse — Platzhalter

**Gesetzt:** zwei Zwischenbosse, gedanklich in **Durchlauf 15 und 30**. Sie geben **Belohnung oder
Münzen**. **Kein Endboss vorerst.** Mechaniken und Beute später, im Rahmen der Progression.

Mehr steht hier bewusst nicht. Was für dieses Dokument zählt, ist nur die Naht:

- Ein Boss ist eine **Aufgabe, die mehr zahlt als eine gewöhnliche.** Damit ist er im Sinne von §4
  nichts Neues, sondern der große Bruder — und die Ökonomie muss für ihn nicht umgebaut werden.
- Die Abstände 15 und 30 teilen den Lauf in **15 / 15 / 20**. Das ist als Rhythmus brauchbar und wird
  hier nur festgehalten, nicht bewertet: der letzte Abschnitt ist der längste und hätte, sobald es
  einen Endboss gibt, den natürlichen Platz dafür.
- **Zwei Hälften existieren schon:** ein stärkerer Gegner ist über `difficulty` (im Normallauf ein
  reiner No-op) gelöst, und eine Regel, die einen Abschnitt lang gilt, hat mit den Wochen-Modifikatoren
  ein fertiges Muster — seed-deterministisch, positiv/negativ geteilt, mit Ausschlusspaaren, Text am
  Objekt. Wenn Boss-Regeln denselben Zuschnitt bekommen, teilen sie sich später eine Darstellung.

---

## 6. Score mit Par

Gesetzt vom Owner, hier auf das Nötige reduziert — mit einer Klarstellung, die aus dieser Runde folgt.

**Das Problem.** Der Score wächst geometrisch. 400.000 Punkte in Durchlauf 12 sind ein ausgezeichneter
Lauf, dieselben 400.000 in Durchlauf 44 ein gescheiterter. Der Spieler kann das nicht sehen, weil ihm
der Vergleichspunkt fehlt. Mit dem Wegfall von SP und DP wird das dringender: der Score bringt dann
nichts mehr ein, also ist die Rückmeldung alles, was er noch leisten kann.

**Was Par wäre.** Der Score, den ein durchschnittlicher Lauf bis zu diesem Durchlauf erreicht hat —
kumulativ, nicht je Durchlauf; eine feste Kurve aus der Sim, nicht am eigenen Lauf mitwachsend; als
Differenz neben dem eigenen Score.

**Die Form der Kurve steht schon fest, bevor eine Zahl gemessen ist: exponentiell.** Ein linearer Par
wäre in Durchlauf 5 unerreichbar und in Durchlauf 45 belanglos. Aus den bekannten Konstanten
überschlagen liegt das Wachstum grob bei 10 bis 20 Prozent je Durchlauf, mit dem größten Teil des
Gesamtscores in den letzten zehn.

> **Kennzeichnung nach Hausregel:** diese Spanne ist **inferiert, nicht gemessen** — eine
> Überschlagsrechnung über Konstanten, kein Sim-Lauf. Jede konkrete Par-Zahl ist bis dahin Platzhalter.
> Die Messung liefert `sim/` auf Ansage.

**Die Klarstellung aus dieser Runde:** *Par zahlt nicht aus.* Der Owner hat gesetzt, dass Münzen nicht
am Score hängen — und Par ist eine Score-Größe. Ein Par, der Münzen zahlt, wäre die Score-Kopplung
durch die Hintertür, samt der Aufwärtsspirale aus §3.3.

Par kann damit zwei Dinge sein, und beide sind mit der Setzung verträglich:

- **Anzeige.** Eine Zahl neben dem Score. Kostet fast nichts, kann nichts kaputt machen.
- **Maßstab.** Die Kurve sagt, wo ein Durchschnittslauf in Durchlauf 15 und 30 steht — und damit, wie
  schwer ein Boss dort sein darf. Das ist der stillste und vielleicht nützlichste Gebrauch von Par:
  er macht Boss-Schwierigkeit zu einer Messung statt zu einer Schätzung.

Zwei Fragen, die die Messung mitbringen muss: **welcher** Lauf der Durchschnitt ist (alle? nur
abgeschlossene? nur geübte?), und ob der Par **je Fraktion** verschieden sein muss — ein reiner
Blitz-Build und ein reiner Pflanze-Build haben vermutlich verschiedene Kurvenformen.

---

## 7. Risiken

| # | Risiko | Wo | Gegenmittel |
| --- | --- | --- | --- |
| 1 | Kaufbare Skill-Stufen verschieben den Erwartungswert der Stufenleiter | §3.2 B | Fläche B erst nach dem Skill-Rework; höchste Stufe nicht kaufbar |
| 2 | Die Ökonomie koppelt doch an den Score und erzeugt eine Aufwärtsspirale | §3.3, §6 | feste Auszahlung je Aufgabe; Par zahlt nicht aus |
| 3 | Gewürfelte Aufgaben brechen die Seed-Zusage der Wochen-Rangliste | §4.5 | aus dem Wochen-Seed würfeln oder in Ranked abschalten — vor dem Bau zu klären |
| 4 | Aufgaben, die der Build nicht bedienen kann, sind tote Anzeige | §4.2 Ebene 5 | nur aus dem aktuellen Zustand würfeln — gehaltene Fraktionen, passende Rundentypen |
| 5 | Fraktionsaufgaben veralten mit dem nächsten Balance-Pass | §4.2 Ebene 5 | an Konzepten aufhängen, nicht an heutigen Zahlenwerten |
| 6 | Ohne Baum fehlt der Startwert für Rerolls, Energie, Baufeld | §3.2 A, D, E | F1 — hängt am neuen Progress, nicht an diesem Dokument |
| 7 | Verzichtsaufgaben häufen sich, und das Spiel besteht aus Nicht-Spielen | §4.2 Ebene 6 | Anteil begrenzen |

Risiko 1 und 6 lösen sich von selbst, wenn die betroffenen Flächen auf ihr anderes Vorhaben warten.
Die übrigen sind Entwurfsentscheidungen.

---

## 8. Was zu entscheiden wäre

Kein Entscheidungsdruck — diese Runde erkundet. Die Liste hält fest, **worüber** entschieden werden
muss, sobald es soweit ist, und in welcher Reihenfolge es Sinn ergibt.

### Zuerst, weil alles andere daran hängt

| # | Frage | Stand |
| --- | --- | --- |
| F1 | Wer setzt nach dem Wegfall des Baums den Boden für Neuwürfe, Energie und Baufeld? | hängt am neuen Progress |
| F2 | Aufgaben fest, zufällig oder gemischt? | drei Modelle in §4.3 |
| F3 | Ist die Münze knapp oder reichlich? | zwei Charaktere in §3.4 |

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
| A1 | Welche Ebenen kommen in den Katalog? | sieben in §4.2 |
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
| B2 | Endboss | vorerst weggelassen (gesetzt) |
| B3 | Mechaniken und Beute | später, Progression |
| P1 | Par kumulativ und fest? | ja (§6) |
| P2 | Zahlt Par aus? | nein — wäre Score-Kopplung durch die Hintertür |
| P3 | Ein Par für alle Fraktionen oder je Fraktion einer? | Messfrage |
| P4 | Wird die Par-Kurve gemessen? | auf Ansage |

---

## 9. Wenn es weitergeht

Die Reihenfolge, die am wenigsten kostet — nicht als Plan, sondern als Beobachtung, was auf was wartet:

1. **F1, F2, F3.** Ohne diese drei ist jede Zahl geraten.
2. **Ein Aufgabenkatalog auf Papier**, ein bis zwei Dutzend Einträge über die Ebenen verteilt. Erst an
   einem gefüllten Katalog sieht man, ob Modell 1, 2 oder 3 trägt — und ob es je Ebene genug Ideen
   gibt.
3. **Die Reichweiten-Flächen** (A, C, H). Die Ökonomie in ihrer kleinsten vollständigen Form: sie
   verdient, sie gibt aus, sie verfällt — und sie kann nichts kaputt machen.
4. **Par als Anzeige**, sobald die Kurve gemessen ist. Danach ist sie auch der Maßstab für die
   Boss-Schwierigkeit.
5. **Stärke-Flächen und Bosse**, wenn die kleine Form sich als tragfähig erwiesen hat.

Schritt 2 und 3 hängen an keinem anderen Vorhaben. Die Skill-Aufwertung wartet auf den Skill-Rework,
die Bosse auf die Progression — das ist der Grund, warum dieser Entwurf beide nach hinten legt.
