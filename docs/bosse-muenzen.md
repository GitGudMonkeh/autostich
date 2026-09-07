# Münzen, Bosse und Par — Arbeitsdokument

**Status: Entwurf.** Erste Fassung, gebaut wie `docs/skill-rework.md`: erst Richtung und Abgrenzung,
dann Vorschläge je Baustein, Entscheid je Zeile beim Owner. Es steht noch keine Zeile Code dahinter,
und es soll auch keine geben, bevor §8 abgearbeitet ist.

Sprache Deutsch, weil Inhalt, Ökonomie-Gefühl und Spielertexte Produktsprache sind und der Owner hier
mitschreibt — dieselbe bewusste Abweichung von der Engineering-Sprache wie in `docs/skill-rework.md`,
und nur für dieses Dokument.

Entscheidungen des Owners stehen unter **Gesetzt**. Alles unter **Vorschlag** ist Diskussionsstand und
gilt erst, wenn es nach Gesetzt wandert. Zahlen unter Vorschlag sind **Startwerte zum Draufschauen**,
keine Balance-Aussagen — gemessen wird auf Ansage, nicht vorher.

---

## 1. Rahmen

### Gesetzt (Owner)

- **Münzen als Ökonomie, Bosse mit Mechaniken und Beute, Score mit Par.** (Owner, 2026-09-06,
  `docs/skill-rework.md` §1 — dort als „Details dazu außerhalb dieses Dokuments" ausgelagert. Dies ist
  dieses Dokument.)
- **Ausgeben kann man Münzen für** (Owner, 2026-09-07, erste Ideen, Liste nicht abgeschlossen):
  Neuwürfe · Skills aufwerten · eine bestimmte Fraktion an die Tür rufen · Energie in der
  Aufstellphase · Baufelder. **Einiges davon limitiert, damit es nicht überpowert wird.**
- **Woher die Münzen kommen: aus Aufgaben**, später zusätzlich aus Bossen und Zwischenbossen, wenn man
  deren Aufgabe schafft. Die genaue Bauart der Aufgaben ist ausdrücklich Teil dieser Exploration
  (Owner, 2026-09-07) — §4 ist deshalb der Teil mit den meisten Alternativen.
- **Drei Bosse auf 50 Durchläufe: zwei Zwischenbosse, ein Endboss.** (Owner, 2026-09-07 — schließt den
  offenen Punkt „Anzahl und Abstand der Bosse" aus `docs/skill-rework.md` §1, jedenfalls die Anzahl.)
- **Boss-Mechaniken und Boss-Beute werden später entworfen, im Rahmen der Progression.** (Owner,
  2026-09-07.) §5 setzt deshalb nur den Rahmen und die Naht, nicht den Inhalt.

### Nicht in diesem Dokument

| Thema | Wo es hingehört |
| --- | --- |
| Skill-Inhalte, Stufen, Fraktionen, Legendäre | `docs/skill-rework.md` (läuft parallel auf `exp`) |
| Konkrete Boss-Mechaniken und Boss-Beute | später, im Rahmen der Progression (Owner) |
| Zwillingstür, Brett- und Deck-Änderungen | geparkt (`docs/skill-rework.md` §1) |
| Der laufübergreifende Baum (SP/DP, Werkstatt) | `src/game/progression.js`, hier nur als Abgrenzung (§3.1) |
| Code, Konstanten, Tests | eine spätere Runde, nach §8 |

Die Skill-Aufwertung (§3.2, Fläche B) ist die eine Stelle, an der dieses Dokument den Skill-Rework
berührt. Sie greift auf dessen Stufenleiter zu, ändert sie aber nicht — und sie ist deshalb der
Baustein, der am ehesten warten muss, bis dort die Stufen stehen.

### Offen (liegt beim Owner)

Die vollständige Liste steht als Entscheidliste in §8. Die drei größten:

- Der **Abstand** der drei Bosse (die Anzahl ist gesetzt) — §5.2.
- Ob ein Boss ein **besonderer Durchlauf** oder eine **eigene Phase** im Entscheidungsplan ist — §5.3.
- Ob **Par** nur anzeigt oder auch auszahlt — §6.4.

### Warum die drei zusammen in einem Dokument stehen

Sie sind ein System, nicht drei. Aufgaben zahlen Münzen; Münzen kaufen Einfluss auf den nächsten
Durchlauf; Bosse sind die Aufgabe, die am meisten zahlt; und Par ist das Maß, an dem der Spieler
ablesen kann, ob er auf Kurs ist — also die Skala, an der sowohl Aufgaben als auch Bosse ihre
Schwierigkeit ausrichten können. Wer eines davon allein entwirft, entwirft es zweimal.

---

## 2. Ausgangslage — was heute da ist

Alle drei Bausteine bauen auf nichts auf. Das ist eher Vorteil als Nachteil: es gibt kein Altsystem,
das man umbiegen müsste, aber auch keinen erprobten Zahlenraum, an dem man sich festhalten kann.

| Baustein | Stand heute | Nächstes Verwandtes im Code |
| --- | --- | --- |
| Münzen | **Gibt es nicht.** Mit dem Shop gestrichen (#229); der Endbildschirm zeigt keine Münzzeile mehr. | Die drei Reroll-Pools (`rerollsPerk`/`rerollsArch`/`rerollsSkill`) — eine knappe, laufinterne Ressource ohne Nachschub. |
| Bosse | **Gibt es nicht.** Der Gegner ist ein Deck. | `difficulty.oppValue` / `oppRampEvery` / `maxCycles` (`engine.js`, im Normallauf `null`) und die Wochen-Modifikatoren (`weekMods.js`, nur Ranked). |
| Par | **Gibt es nicht.** | Die Score-Meilensteine (`SP_MILESTONES`) mit festen absoluten Schwellen und der Meilensteinbalken über dem Battlefield. |
| Aufgaben | **Gibt es nicht als laufinternes System.** | Die Kosmetik-Freischaltungen (`cosmetics.js`) — aber das sind *laufübergreifende*, klebrige Profil-Flags („ein Lauf ohne Reroll"), keine Ziele während eines Laufs. |

**Was es dagegen schon gibt: zwei Währungen.** Stichpunkte (SP) speisen den Progression-Baum,
Deckpunkte (DP) die Werkstatt. Beide sind laufübergreifend und werden am Laufende ausgeschüttet.
Münzen wären die dritte. §3.1 zieht die Grenze.

**Und einen fertigen Rhythmus.** Ein Lauf sind 50 Deck-Durchläufe à 40 Stiche („Durchlauf" und „Runde"
meinen in diesem Dokument dasselbe). Vor jedem Durchlauf steht genau eine Entscheidung, und der
Entscheidungsplan wiederholt den Block Skill → Perk → Aufstellen → Architekt. Jede Boss- oder
Aufgaben-Idee, die eine eigene Entscheidung will, nimmt einer bestehenden ihren Platz weg. Das ist die
härteste Randbedingung in diesem Dokument.

> Hinweis zum Plan: `dev` und `exp` bauen ihn heute unterschiedlich — `dev` mit einem handgesetzten
> 50er-Plan samt Legendär-Phase, `exp` als sauber wiederholten Vier-Block ohne sie. Dieses Dokument
> beschreibt Positionen deshalb als „Durchlauf n von 50" und nicht als Index im Plan. Welcher Plan am
> Ende gilt, entscheidet der Skill-Rework, nicht dieses Dokument.

---

## 3. Münzen — die Ökonomie

### 3.1 Was die Münze ist, und was sie nicht ist

**Vorschlag.** Die Münze ist die **laufinterne** Währung. Sie entsteht im Lauf, wird im Lauf
ausgegeben und **verfällt am Laufende**. Sie wandert nicht ins Profil und lässt sich nicht in SP oder
DP tauschen.

| | Münzen | SP (Stichpunkte) | DP (Deckpunkte) |
| --- | --- | --- | --- |
| Lebensdauer | ein Lauf | Profil | Profil |
| Verdient durch | Aufgaben, Bosse | Lauf abschließen, Score-Meilensteine, Treue | Score-Meilensteine, abgeschlossene Läufe |
| Kauft | den nächsten Durchlauf | dauerhafte Böden (Baum) | Kosmetik (Werkstatt) |
| Entscheidung | „jetzt oder sparen?" | „welcher Ast zuerst?" | „welches Deck?" |

Das ist die wichtigste Trennung im ganzen Dokument, aus einem konkreten Grund: **drei der fünf
Ausgabeflächen, die der Owner nennt, sind heute schon Belohnungen des Progression-Baums.** Der Baum
hebt Rerolls, Formations-Energie und Baufeld-Zellen — jeweils von einem Boden auf ein Maximum. Kauft
die Münze dieselben drei Dinge, konkurrieren zwei Systeme um dieselbe Fläche, und der Baum verliert
seinen Sinn.

**Vorschlag für die Auflösung, und zugleich der Grund für die Limits, die der Owner selbst schon
angesprochen hat:**

> **Der Baum hebt den Boden, die Münze kauft die Ausnahme.**
> Was der Baum gibt, gilt dauerhaft und in jedem Lauf. Was die Münze kauft, gilt **einmal** — für
> diese eine Phase, diesen einen Durchlauf. Die Münze macht einen Lauf nicht stärker, sie macht einen
> *Moment* stärker.

Damit ist auch klar, wo der Deckel sitzt: nicht am Gesamtvermögen, sondern **je Phase**. Wer 200
Münzen hat, kann trotzdem nur einen Neuwurf je Türangebot kaufen. Sparen bringt Reichweite, nicht
Höhe. §3.3 baut das aus.

### 3.2 Die fünf Ausgabeflächen

Jede Fläche als eigener Baustein, im selben Zuschnitt: was sie kauft, warum sie interessant ist, ihr
Limit, und was sie kostet (Startwert). Die Preise stehen in der Währung von §3.4.

---

#### A — Neuwurf kaufen · *die sichere Fläche*

**Kauft:** einen zusätzlichen Neuwurf des aktuellen Angebots (Tür, Perk-Auswahl, Architekt-Angebot).

**Warum sie funktioniert:** Rerolls sind die einzige Stelle, an der heute schon eine knappe laufinterne
Ressource existiert — drei getrennte Pools, kein Nachschub, im Normallauf ein Neuwurf je Pool. Der
Spieler kennt das Gefühl „ich hätte jetzt gern noch einen" bereits. Die Münze beantwortet eine Frage,
die das Spiel schon stellt.

**Limit (Vorschlag):** höchstens **ein gekaufter Neuwurf je Angebot**, und der Preis **verdoppelt sich
innerhalb desselben Durchlaufs** mit jedem gekauften Neuwurf. Ohne das eine wird die Tür zum
Automaten, ohne das andere wird ein reicher Spieler zum Katalogleser.

**Preis (Startwert):** 3 Münzen, dann 6, dann 12 innerhalb desselben Durchlaufs.

**Wechselwirkung:** Der Baum hebt die Neuwürfe von 1 auf bis zu 3. Bei drei Baum-Neuwürfen plus
gekauften wird die Tür beliebig durchsuchbar — deshalb das harte „einer je Angebot".

---

#### B — Skill aufwerten · *die stärkste und die riskanteste Fläche*

**Kauft:** hebt einen gehaltenen Skill um **eine Stufe** (Normal → Selten → Sehr selten → Episch).

**Warum sie funktioniert:** Sie gibt der Ökonomie ein Ziel, auf das sich sparen lohnt, und sie
verwandelt einen schwachen frühen Fund in etwas, das im Late Game noch zählt. Sie ist damit die
einzige Fläche, die den Lauf über seine ganze Länge trägt.

**Warum sie riskant ist:** Sie greift direkt in den Kern des laufenden Skill-Reworks. Dessen
Stufenleiter ist so gewählt, dass der Erwartungswert über die Ziehungsquoten etwa dem heutigen Skill
entspricht. Eine kaufbare Stufe verschiebt diesen Erwartungswert nach oben — und zwar für den Spieler,
der die Münzen hat, also ohnehin gut läuft. **Diese Fläche sollte nicht gebaut werden, bevor die
Stufen im Skill-Rework stehen.**

**Limit (Vorschlag), drei Stufen von zahm nach mutig — Entscheid beim Owner:**

| | Regel | Wirkung |
| --- | --- | --- |
| B1 zahm | höchstens **eine** gekaufte Aufwertung je Lauf | ein Höhepunkt, kein System |
| B2 mittel *(Empfehlung)* | eine Aufwertung **je Boss-Abschnitt** (also bis zu drei je Lauf), **nie auf Episch** | Aufwertung ist ein Rhythmus; die Spitzenstufe bleibt Fundsache |
| B3 mutig | frei kaufbar, Preis steigt je Stufe steil | die Ökonomie *ist* der Build; stärkste Kopplung, größtes Balance-Risiko |

**Preis (Startwert, für B2):** 12 Münzen auf Selten, 25 auf Sehr selten. Episch nicht kaufbar.

---

#### C — Eine Fraktion an die Tür rufen · *die eleganteste Fläche*

**Kauft:** garantiert, dass das **nächste** Türangebot mindestens ein Symbol der gewählten Fraktion
zeigt.

**Warum sie funktioniert:** Sie ist Einfluss ohne Macht. Der Spieler bekommt keinen stärkeren Skill,
sondern eine **verlässlichere Richtung** — genau das, was einem halb gebauten Fraktions-Build fehlt.
Die Türen zeigen heute drei Fraktionssymbole aus höchstens zwei Fraktionen; ein gerufenes Symbol ist
eine kleine, gut lesbare Zusage. Und sie kostet die Balance fast nichts, weil sie die Stärke der Skills
nicht anfasst, nur ihre Verteilung.

**Limit (Vorschlag):** höchstens **einmal je Skill-Phase**, wirkt nur auf das **nächste** Angebot, und
sie ruft **ein Symbol, keine Tür** — die anderen Symbole bleiben gewürfelt. Ein gerufener Ruf, der
überlebt, bis er passt, wäre kein Ruf mehr, sondern ein Katalog.

**Preis (Startwert):** 5 Münzen.

**Offene Frage:** Soll der Ruf mit dem Fokus zusammenspielen (dem noch offenen Startfokus aus
`docs/skill-rework.md` §1)? Naheliegend wäre: der Ruf auf die **Fokus**-Fraktion kostet weniger, der
auf eine fremde mehr. Das kann aber erst entschieden werden, wenn der Fokus selbst entschieden ist.

---

#### D — Energie in der Aufstellphase · *die taktische Fläche*

**Kauft:** einen zusätzlichen Tausch in der laufenden Aufstellphase.

**Warum sie funktioniert:** Formations-Energie ist heute die knappste Zahl im Spiel — drei bis fünf
Tausche, und die Aufstellung ist die Entscheidung, die der Spieler am unmittelbarsten sieht. Eine
gekaufte Energie ist die klarste „ich rette diesen Durchlauf"-Ausgabe im ganzen Katalog.

**Limit (Vorschlag):** höchstens **+2 je Aufstellphase**, Preis steigt innerhalb der Phase. Die
gekaufte Energie **verfällt mit der Phase** — sie wird nicht angespart.

**Preis (Startwert):** 4 Münzen für den ersten Tausch, 8 für den zweiten.

**Wechselwirkung:** Der Baum hebt die Energie von 3 auf 5. Bei 5 plus 2 gekauften ist die Aufstellung
fast frei — das ist der Grund für die harte Kappe bei 2 und dafür, dass die Kappe **absolut** ist und
nicht mit dem Baum mitwächst. Zusätzlich zu prüfen (später, in der Sim): ob die gekaufte Energie den
negativen Wochen-Modifikator „Energie-Ebbe" entwertet.

---

#### E — Baufeld-Zellen · *die langsamste Fläche*

**Kauft:** hebt den Baufeld-Deckel um Zellen.

**Warum sie schwieriger ist als die anderen vier:** Baufeld ist die einzige der fünf Flächen, die
**dauerhaft** wirkt. Eine gekaufte Zelle bleibt bis zum Laufende und trägt in jedem folgenden
Durchlauf — sie widerspricht damit dem Prinzip aus §3.1 („die Münze kauft die Ausnahme"). Und sie
zahlt sich umso mehr aus, je früher man sie kauft, was in einer Ökonomie, die erst anlaufen muss, eine
unangenehme Kurve ergibt: die beste Ausgabe ist die früheste.

**Zwei Wege, Entscheid beim Owner:**

| | Regel | Bemerkung |
| --- | --- | --- |
| E1 dauerhaft, hart gedeckelt *(Empfehlung)* | +2 Zellen je Kauf, **höchstens zweimal je Lauf** (also +4), Preis steigt stark | bleibt eine echte Investitionsentscheidung, aber kann den Baum nicht überholen — der Baum hebt selbst nur von 20 auf 24 |
| E2 auf Zeit | +4 Zellen **für einen Durchlauf**, beliebig oft | passt sauber zum Ausnahme-Prinzip, fühlt sich aber beim Bauen falsch an: ein Gebäude, dessen Fläche nächste Runde wieder weg ist |

**Preis (Startwert, für E1):** 15 Münzen für den ersten Kauf, 35 für den zweiten.

---

**Zusammenfassung der fünf, mit Empfehlung für einen ersten Ausbau:**

| Fläche | Wirkung | Limit (Vorschlag) | Preis (Startwert) | Für die erste Fassung? |
| --- | --- | --- | --- | --- |
| A Neuwurf | ein Angebot neu | 1 je Angebot, Preis ×2 im Durchlauf | 3 / 6 / 12 | **ja** |
| B Skill-Stufe | +1 Stufe | 1 je Boss-Abschnitt, nie Episch (B2) | 12 / 25 | ja, aber **nach** dem Skill-Rework |
| C Fraktion rufen | nächstes Türsymbol | 1 je Skill-Phase, nur nächstes Angebot | 5 | **ja** |
| D Energie | +1 Tausch | +2 je Phase, verfällt | 4 / 8 | **ja** |
| E Baufeld | +2 Zellen | 2× je Lauf (E1) | 15 / 35 | später |

Die Empfehlung „erst A, C, D" hat einen Grund: diese drei sind laufintern, verfallen von selbst und
berühren weder den Skill-Rework noch den Progression-Baum. Man kann sie bauen, spielen und wieder
verwerfen, ohne dass etwas anderes nachziehen muss.

### 3.3 Warum jede Fläche ein Limit braucht

Der Owner hat es beim Nennen der Flächen schon vorweggenommen. Der Vollständigkeit halber der
Mechanismus dahinter, weil er die Form der Limits bestimmt:

Autostich rechnet einen Stich als Basis mal Multiplikatoren, und der Score wächst über den Lauf
geometrisch. **Jede Ökonomie, die an einen Multiplikator gekoppelt ist, wächst mit — und jede
Ökonomie, deren Einnahmen am Score hängen, wächst quadratisch.** Ein Spieler, der vorne liegt,
verdient mehr, kauft mehr, liegt weiter vorne. Das ist der Grund, warum in §4 die Aufgaben-Bauart, die
sich am naheliegendsten anfühlt (Münzen je Score), die riskanteste ist.

Zwei Gegenmittel, beide im Vorschlag verbaut:

1. **Limits je Phase statt je Lauf.** Ein Deckel auf den Kontostand wäre umgehbar und fühlt sich
   willkürlich an. Ein Deckel auf das, was in *diesem Moment* kaufbar ist, begrenzt die Höhe, ohne das
   Sparen zu bestrafen.
2. **Einnahmen aus Aufgaben, nicht aus Score.** Eine Aufgabe zahlt einen festen Betrag — der Spieler
   mit dem doppelten Score bekommt dieselben Münzen wie der mit dem halben, sofern beide die Aufgabe
   schaffen. Das hält die Ökonomie flach, während der Score exponentiell läuft. (Das ist zugleich der
   Grund, warum die Owner-Setzung „Münzen aus Aufgaben" die gesündere Wahl ist, und nicht nur eine
   thematische.)

### 3.4 Größenordnung

**Vorschlag.** Die Münze ist eine **kleine, zählbare** Zahl: ein Lauf bewegt sich in der Größenordnung
von **100 bis 150 Münzen insgesamt**, ein Kauf kostet 3 bis 35. Der Spieler soll den Kontostand im
Kopf haben, ohne ihn zu lesen.

Das ist bewusst eine andere Größenordnung als der Score (Millionen) und als SP/DP (einstellig bis
niedrig zweistellig). Drei Währungen im selben Zahlenraum wären in der UI nicht auseinanderzuhalten.

Daraus folgt grob: **etwa 2 bis 3 Münzen je Durchlauf im Schnitt**, und ein Lauf trägt ungefähr
**8 bis 12 nennenswerte Käufe**. Das ist die Zahl, an der §4 sich ausrichtet.

*(Alle Zahlen in §3: Vorschlag, ungemessen. Sie sind so gewählt, dass die Verhältnisse zueinander
stimmen — der billigste Kauf kostet etwa einen Durchlauf Einkommen, der teuerste etwa ein Achtel des
Laufs. Ob die absolute Höhe stimmt, kann nur die Sim sagen, und die läuft auf Ansage.)*

---

## 4. Aufgaben — woher die Münzen kommen

Der Owner hat gesetzt: Münzen kommen **aus Aufgaben**, und später zusätzlich aus Bossen und
Zwischenbossen, wenn man deren Aufgabe schafft. Wie eine Aufgabe aussieht, ist ausdrücklich offen.
Dies ist deshalb der Teil des Dokuments mit den echten Alternativen.

### 4.1 Was eine Aufgabe leisten muss

Vier Anforderungen, aus denen sich die Bauarten in §4.2 ergeben:

1. **Sichtbar vor dem Durchlauf, entschieden nach dem Durchlauf.** Eine Aufgabe, die man erst beim
   Abrechnen sieht, ist keine Aufgabe, sondern ein Bonus.
2. **Beeinflussbar, aber nicht erzwingbar.** Sie soll den Spieler dazu bringen, einen Durchlauf anders
   zu spielen — nicht ihn dafür bestrafen, dass sein Build sie nicht bedienen kann.
3. **Flach in der Auszahlung.** Fester Betrag, nicht scoreabhängig (§3.3).
4. **Billig zu lesen.** Ein Satz. Wenn eine Aufgabe erklärt werden muss, ist sie zu kompliziert für
   eine Zeile, die vor jedem Durchlauf steht.

Anforderung 2 ist die schwierigste, weil das Deck vor dem Durchlauf feststeht und der Spieler nur über
Aufstellung, Gebäude und Skills eingreift. Eine Aufgabe wie „gewinne 30 Stiche" ist praktisch nur eine
verkleidete Score-Kopplung. Eine Aufgabe wie „gewinne fünf Stiche in Folge mit Karten derselben
Fraktion" ist eine echte Entscheidung an der Aufstellung.

### 4.2 Drei Bauarten

---

**Bauart 1 — Rundenziel** *(Empfehlung)*

Vor jedem Durchlauf steht **ein** Ziel, gewürfelt aus einem Katalog, sichtbar neben dem
Entscheidungsplan. Wird es im Durchlauf erfüllt, zahlt es beim Abrechnen einen festen Betrag.

- **Takt:** jeder Durchlauf, also 50 Ziele je Lauf.
- **Auszahlung (Startwert):** 2 Münzen; etwa die Hälfte der Ziele wird geschafft → ~50 Münzen je Lauf.
- **Dafür:** gleichmäßiges Einkommen, kein neuer Bildschirm, keine neue Entscheidung im Plan. Die
  Aufgabe ist eine Zeile, kein System.
- **Dagegen:** 50 gewürfelte Ziele nutzen jeden Katalog ab. Braucht Wiederholungsschutz, sonst steht
  dreimal hintereinander dasselbe da.

---

**Bauart 2 — Auftragskarte**

Der Spieler nimmt aus zwei bis drei angebotenen Aufträgen einen an. Ein Auftrag läuft über **mehrere**
Durchläufe („gewinne in den nächsten drei Durchläufen je einen Stich mit Crit"), zahlt dafür mehr, und
man kann immer nur einen halten.

- **Takt:** ein neuer Auftrag, sobald der alte erfüllt oder verfallen ist; grob 10 bis 15 je Lauf.
- **Auszahlung (Startwert):** 8 bis 12 Münzen.
- **Dafür:** das Annehmen ist selbst eine Entscheidung, und ein mehrrundiger Auftrag lenkt den Build
  spürbarer als eine Rundenaufgabe.
- **Dagegen:** braucht eine eigene Auswahl — also entweder einen neuen Bildschirm oder einen Platz im
  Entscheidungsplan, und der Plan hat keinen freien. Deutlich mehr Bauaufwand als Bauart 1.

---

**Bauart 3 — Nur Bosse**

Keine laufenden Aufgaben. Münzen fallen ausschließlich an den drei Bossen, wenn deren Bedingung
erfüllt wird.

- **Takt:** dreimal je Lauf.
- **Auszahlung (Startwert):** 30 bis 50 Münzen je Boss.
- **Dafür:** sehr wenig Bauaufwand, und die Ökonomie hat genau einen Rhythmus statt zweier.
- **Dagegen:** zwischen den Bossen ist die Ökonomie tot, und die ersten sechzehn Durchläufe eines Laufs
  haben gar keine. Wer den ersten Boss verfehlt, hat für den halben Lauf keine Ökonomie — das ist
  genau die Abwärtsspirale, die §3.3 vermeiden will.

---

**Empfehlung: Bauart 1, mit den Bossen als dritter, viel größerer Auszahlung obendrauf.** Das
entspricht der Owner-Setzung am direktesten („aus Aufgaben, später aus Bossen"), hält das Einkommen
flach und braucht keinen neuen Platz im Entscheidungsplan — die einzige Ressource, von der es keine
freie gibt. Bauart 2 ist der naheliegende zweite Ausbauschritt, wenn Bauart 1 sich als zu beiläufig
erweist.

### 4.3 Wie ein Zielkatalog aussehen könnte

Beispiele, nicht der Katalog — der wird gebaut, wenn die Bauart steht. Sie sollen zeigen, welche
*Arten* von Zielen das Spiel hergibt, und was ihre jeweilige Schwäche ist:

| Art | Beispiel | Greift an | Schwäche |
| --- | --- | --- | --- |
| Aufstellung | „Gewinne 4 Stiche in Folge" | Aufstellphase | wird von einem starken Build automatisch erfüllt |
| Fraktion | „Gewinne 6 Stiche mit Feuer-Karten" | Aufstellung, Skill-Wahl | unerfüllbar, wenn die Fraktion nicht im Build ist |
| Verzicht | „Beende den Durchlauf ohne Neuwurf" | Ökonomie selbst | angenehm spannungsreich: die Aufgabe kostet, was sie zahlt |
| Gebäude | „Baue in diesem Durchlauf ein Gebäude" | Architekt-Phase | nur in Architekt-Runden erfüllbar |
| Schwelle | „Erreiche Par in diesem Durchlauf" | alles | die Kopplung an §6 — und der Grund, Par früh zu entscheiden |

Der letzte Eintrag ist der interessanteste: er verbindet Aufgaben und Par zu einem System und macht Par
zu mehr als einer Anzeige, ohne dass Par selbst auszahlen muss. §6.4 nimmt das auf.

**Zu beachten:** Ein Ziel, das der Build nicht bedienen kann („Feuer", wenn kein Feuer im Deck ist),
ist tote Anzeige. Der Katalog sollte deshalb aus dem **aktuellen Zustand** gewürfelt werden — nur
Fraktionen, die der Spieler hält; nur Gebäude-Ziele in Architekt-Runden. Das ist technisch billig und
verhindert die häufigste Frustquelle solcher Systeme.

### 4.4 Was noch fehlt

- Ob eine verfehlte Aufgabe **irgendetwas** kostet (Vorschlag: nein — eine Aufgabe, die man ignorieren
  kann, ist eine Einladung; eine, die bestraft, ist eine Pflicht).
- Ob Aufgaben in der Wochen-Rangliste gelten oder dort seed-fest gewürfelt werden müssen. (Muss geklärt
  werden, bevor gebaut wird: Ranked ist seed-deterministisch, damit alle Spieler dieselbe Woche
  spielen. Gewürfelte Aufgaben müssen aus demselben Seed kommen oder in Ranked ausgeschaltet sein.)
- Ob der Endbildschirm die erfüllten Aufgaben zeigt. (Vorschlag: ja, als Zeile — die Münzzeile, die
  #229 entfernt hat, käme damit in anderer Form zurück.)

---

## 5. Bosse

### 5.1 Gesetzt

- **Drei Bosse je Lauf: zwei Zwischenbosse, ein Endboss.** (Owner, 2026-09-07.)
- **Mechaniken und Beute werden später entworfen, im Rahmen der Progression.** (Owner, 2026-09-07.)

Dieser Abschnitt setzt deshalb bewusst nur den **Rahmen**: wo die Bosse liegen, welche Form sie im
Ablauf haben, und an welcher Naht sie später andocken. Was ein Boss *tut*, steht hier nicht.

### 5.2 Wo sie liegen — Vorschlag

Der Endboss ist Durchlauf 50. Für die beiden Zwischenbosse zwei Raster:

| | Zwischenbosse | Abschnitte | Bemerkung |
| --- | --- | --- | --- |
| **Drittel** *(Empfehlung)* | 17 und 34 | 17 / 17 / 16 | gleichmäßig; der erste Boss kommt, nachdem der Build steht — nach vier bis fünf Skill-Phasen hat der Spieler etwas zu prüfen |
| Früh | 13 und 30 | 13 / 17 / 20 | die erste Begegnung kommt früher und lehrt das System, bevor es zählt; der letzte Abschnitt wird lang |

Die Empfehlung ist das Drittel-Raster, aus einem einfachen Grund: die drei Abschnitte werden damit zur
natürlichen Einheit für alles andere in diesem Dokument — die Skill-Aufwertung „einmal je
Boss-Abschnitt" (§3.2 B2), der Par-Verlauf (§6), und später die Progression. Ein Lauf bekommt eine
Dreiteilung, die er heute nicht hat.

**Zu entscheiden ist außerdem:** Ist der Endboss der **50. Durchlauf** oder ein **51.**, der nach dem
regulären Lauf kommt? Vorschlag: der 50. — ein Lauf hat 50 Durchläufe, und der letzte davon ist der
Endboss. Ein 51. Durchlauf verlängert jeden Lauf und macht aus einer runden Zahl eine unrunde.

### 5.3 Form — offen, mit Vorschlag

Die Frage, die dieses Dokument stellen sollte und die der Owner offen gelassen hat: **ist ein Boss ein
besonderer Durchlauf oder eine eigene Phase im Entscheidungsplan?**

| | Was es bedeutet | Kosten |
| --- | --- | --- |
| **F1 Besonderer Durchlauf** *(Empfehlung)* | Gleiches Format — 40 Stiche —, aber ein anderes Gegnerdeck plus eine Regel, die nur in diesem Durchlauf gilt. Kein neuer Eintrag im Plan, nur eine markierte Runde. | am kleinsten: der Plan bleibt unberührt, der Rhythmus auch |
| F2 Eigene Phase | Ein neuer Eintragstyp neben Skill/Perk/Aufstellen/Architekt: eine Begegnung als eigener Schritt. | jede Boss-Phase nimmt einer anderen Entscheidung ihren Platz — bei drei Bossen fallen drei Entscheidungen weg |
| F3 Beides | Markierter Durchlauf plus ein Vorbereitungs-Schritt davor: Regel wird angekündigt, man rüstet sich. | zwei Nähte statt einer, dafür ist der Boss lesbar, bevor er zuschlägt |

**Empfehlung F1**, mit einem Zusatz aus F3, der nichts kostet: **die Boss-Regel wird einen Durchlauf
vorher angekündigt.** Der Spieler sieht in Durchlauf 16, was in 17 gilt, und geht mit dieser Kenntnis
in die Entscheidung vor 17. Das ist der ganze Wert von F3, ohne einen Platz im Plan zu verbrauchen —
und es macht die Boss-Regel zu einer Entscheidung statt zu einer Überraschung.

### 5.4 Die Naht, die es schon gibt

Für den späteren Entwurf der Mechaniken ist wichtig, dass zwei Hälften bereits existieren:

- **Ein stärkerer Gegner** ist ein gelöstes Problem. `difficulty.oppValue` legt einen flachen Aufschlag
  auf jede Gegnerkarte, `oppRampEvery` lässt ihn mitwachsen. Im Normallauf ist `difficulty` `null`,
  also ein reiner No-op — die Naht liegt frei und kostet nichts, solange sie nicht benutzt wird.
- **Eine Regel, die einen Abschnitt lang gilt**, ist als Muster ebenfalls da: die neunzehn
  Wochen-Modifikatoren. Sie sind seed-deterministisch gewürfelt, in positive und negative geteilt,
  haben Ausschlusspaare, tragen ihren Anzeigetext selbst und hängen an benannten Wirkungsstellen in
  Reducer und Engine. **Das ist das nächste Verwandte zu einer Boss-Regel, das es im Spiel gibt** — und
  wenn Boss-Regeln denselben Zuschnitt bekommen, teilen sich beide später eine Darstellung.

Damit ist ein Boss im Kern: *ein markierter Durchlauf + ein `difficulty`-Wert + eine Regel im
Zuschnitt eines Modifikators + eine Beute.* Drei der vier Teile gibt es schon in irgendeiner Form.
Was fehlt, ist die Auswahl — und die ist der Teil, den der Owner zu Recht der Progression zugeschlagen
hat.

### 5.5 Was hier ausdrücklich nicht entschieden wird

Boss-Mechaniken, Boss-Beute, ob Bosse eigene Gegnerdecks haben oder nur aufgewertete, ob ein
verfehlter Boss etwas kostet, ob Bosse in Ranked gelten. Alles später, im Rahmen der Progression.

Die eine Sache, die dieses Dokument für später **braucht**: dass ein Boss eine **Aufgabe** hat, deren
Erfüllung Münzen zahlt (Owner-Setzung, §1). Alles andere kann sich noch ändern, ohne dass §3 und §4
nachziehen müssen.

---

## 6. Score mit Par

### 6.1 Das Problem

Der Score in Autostich ist eine Zahl, die über den Lauf geometrisch wächst — Basis mal Multiplikatoren,
und die Multiplikatoren wachsen mit. Daraus folgt ein Anzeigeproblem, das jeder Spieler kennt und
niemand benennt: **die Zahl allein sagt nichts.** 400.000 Punkte in Durchlauf 12 sind ein
ausgezeichneter Lauf; dieselben 400.000 in Durchlauf 44 sind ein gescheiterter. Der Spieler kann das
nicht sehen, weil ihm der Vergleichspunkt fehlt.

Heute gibt es dafür nur die Score-Meilensteine — feste absolute Schwellen (10, 25, 50, 75, 100
Millionen). Die sagen etwas über den **fertigen Lauf**, aber nichts über den laufenden. Wer nach
Durchlauf 20 wissen will, ob er auf Kurs ist, bekommt keine Antwort.

### 6.2 Was Par ist — Vorschlag

**Par ist der Score, den ein durchschnittlicher Lauf bis zu diesem Durchlauf erreicht hat.** Er steht
neben dem eigenen Score, als Differenz oder als Verhältnis. Mehr nicht.

- Par ist **kumulativ**, nicht je Durchlauf: „nach Durchlauf 20 hat ein Durchschnittslauf X Punkte".
  Ein Par je einzelnem Durchlauf schwankt zu stark — ein einzelner Durchlauf kann durch eine gute
  Aufstellung das Dreifache bringen, ohne dass der Lauf besser wäre.
- Par ist **eine Kurve**, keine Zahl: 50 Werte, einer je Durchlauf.
- Par ist **fest**, nicht mitwachsend. Er kommt aus der Sim, nicht aus dem laufenden Spiel. Ein Par,
  der sich an den eigenen Lauf anpasst, ist kein Maßstab.

### 6.3 Die Kurve

Die Form der Kurve steht damit schon fest, bevor irgendeine Zahl gemessen ist: **sie ist exponentiell,
weil der Score exponentiell wächst.** Ein linearer Par wäre in Durchlauf 5 unerreichbar und in
Durchlauf 45 belanglos.

Grob geschätzt aus dem, was bekannt ist — 400 Basispunkte je Sieg, etwa 26 Siege je Durchlauf, und
Läufe, die in der Größenordnung mehrerer zehn Millionen enden — liegt das Wachstum je Durchlauf im
Bereich von **10 bis 20 Prozent**, mit dem größten Teil des Gesamtscores in den letzten zehn
Durchläufen.

> **Kennzeichnung nach Hausregel:** Diese Spanne ist **inferiert**, nicht gemessen. Sie stammt aus
> einer Überschlagsrechnung über bekannte Konstanten und die Meilenstein-Schwellen, nicht aus einem
> Sim-Lauf. Die echte Kurve ist eine reine Messfrage — `sim/` kann sie liefern, sobald der Owner sie
> ansagt. Bis dahin ist jede konkrete Par-Zahl in diesem Dokument Platzhalter.

Zwei Dinge, die die Messung mitbringen muss, wenn sie kommt: **welcher** Lauf der Durchschnitt ist
(alle Läufe? nur abgeschlossene? nur die eines geübten Spielers?), und ob der Par je **Fraktion**
verschieden sein muss. Ein reiner Blitz-Build und ein reiner Pflanze-Build haben vermutlich
unterschiedliche Kurvenformen — falls ja, ist ein gemeinsamer Par für beide falsch.

### 6.4 Was an Par hängt — die eigentliche Entscheidung

Par kann drei verschieden große Dinge sein. Das ist die Entscheidung, die den Rest bestimmt:

| | Par ist… | Folgen |
| --- | --- | --- |
| **P1 Anzeige** *(Empfehlung für die erste Fassung)* | eine Zahl neben dem Score, sonst nichts | kostet fast nichts, kann nichts kaputt machen, und man sieht sofort, ob die Kurve stimmt |
| P2 Anzeige + Aufgabe | zusätzlich ein Aufgabenziel („erreiche Par") aus dem Katalog in §4.3 | verbindet Par mit der Ökonomie, ohne dass Par selbst auszahlt — der Umweg über die Aufgabe hält die Auszahlung flach |
| P3 Ökonomie | Score über Par zahlt Münzen aus | die stärkste Kopplung — und die riskanteste: sie macht die Einnahmen scoreabhängig und damit genau die Spirale auf, die §3.3 vermeidet |

**Empfohlener Weg: P1 bauen, P2 danach, P3 nicht.** P1 ist eine Anzeige und kann jederzeit wieder
verschwinden. P2 ist ein Katalogeintrag. P3 wäre ein Umbau der ganzen Ökonomie und würde die
Owner-Setzung „Münzen aus Aufgaben" von hinten wieder aufmachen.

Was Par außerdem gut kann, ohne etwas auszuzahlen: **die Schwierigkeit der Bosse ausrichten.** Wenn
nach Durchlauf 17 ein Boss steht und Par sagt, wo ein Durchschnittslauf dort steht, dann ist die
Boss-Bedingung nicht mehr geraten. Das ist der Grund, Par vor den Bossen zu entscheiden — nicht danach.

---

## 7. Wechselwirkungen und Risiken

Die fünf Stellen, an denen dieser Entwurf mit etwas kollidieren kann, das es schon gibt oder das
parallel entsteht:

| # | Risiko | Wo | Gegenmittel im Vorschlag |
| --- | --- | --- | --- |
| 1 | Münzen kaufen dasselbe wie der Progression-Baum (Rerolls, Energie, Baufeld) und entwerten ihn | §3.2 A, D, E | Trennung „Baum hebt den Boden, Münze kauft die Ausnahme" (§3.1); absolute Kappen, die nicht mit dem Baum mitwachsen |
| 2 | Kaufbare Skill-Stufen verschieben den Erwartungswert der Stufenleiter im Skill-Rework | §3.2 B | Fläche B erst bauen, wenn die Stufen stehen; Episch nicht kaufbar |
| 3 | Scoreabhängige Einnahmen erzeugen eine Aufwärtsspirale | §3.3, §6.4 | feste Auszahlung je Aufgabe; P3 nicht empfohlen |
| 4 | Aufgaben und Boss-Regeln brechen die Seed-Determinismus-Zusage der Wochen-Rangliste | §4.4, §5.5 | aus dem Wochen-Seed würfeln oder in Ranked abschalten — vor dem Bau zu klären |
| 5 | Eine dritte Währung neben SP und DP überfrachtet die UI | §3.4 | anderer Zahlenraum (zweistellig), anderer Ort, verfällt am Laufende |

Risiko 2 ist das einzige mit einer zeitlichen Abhängigkeit: es löst sich von selbst, wenn Fläche B
wartet, bis der Skill-Rework seine Stufen gesetzt hat. Die anderen vier sind Entwurfsentscheidungen und
stehen in §8.

---

## 8. Entscheidliste

Eine Zeile je Entscheidung. Der Vorschlag ist jeweils das, was dieses Dokument empfiehlt; die letzte
Spalte füllt der Owner.

### Münzen

| # | Frage | Vorschlag | Entscheid |
| --- | --- | --- | --- |
| M1 | Verfallen Münzen am Laufende? | ja, laufintern (§3.1) | |
| M2 | Sitzen die Limits je Phase oder je Lauf? | je Phase (§3.1, §3.3) | |
| M3 | Welche Flächen kommen in die erste Fassung? | A Neuwurf, C Fraktion rufen, D Energie (§3.2) | |
| M4 | Limit für gekaufte Neuwürfe | 1 je Angebot, Preis ×2 im Durchlauf | |
| M5 | Limit für gekaufte Skill-Stufen | B2: 1 je Boss-Abschnitt, nie Episch | |
| M6 | Ruft die Münze ein Symbol oder eine Tür? | ein Symbol, nur nächstes Angebot | |
| M7 | Ist der Ruf auf die Fokus-Fraktion billiger? | offen — hängt am Fokus (`skill-rework` §1) | |
| M8 | Limit für gekaufte Energie | +2 je Aufstellphase, verfällt mit der Phase | |
| M9 | Baufeld dauerhaft oder auf Zeit? | E1 dauerhaft, höchstens 2× je Lauf | |
| M10 | Größenordnung je Lauf | 100–150 Münzen, Käufe 3–35 (§3.4) | |

### Aufgaben

| # | Frage | Vorschlag | Entscheid |
| --- | --- | --- | --- |
| A1 | Bauart | 1 Rundenziel, plus Bosse als große Auszahlung (§4.2) | |
| A2 | Ein Ziel je Durchlauf? | ja, 50 je Lauf | |
| A3 | Auszahlung je Ziel | 2 Münzen (Startwert) | |
| A4 | Kostet ein verfehltes Ziel etwas? | nein (§4.4) | |
| A5 | Wird der Katalog aus dem aktuellen Zustand gewürfelt? | ja — keine Ziele, die der Build nicht bedienen kann (§4.3) | |
| A6 | Gelten Aufgaben in Ranked? | zu klären vor dem Bau — Seed-Determinismus (§4.4, Risiko 4) | |
| A7 | Zeigt der Endbildschirm die erfüllten Aufgaben? | ja, als Zeile | |

### Bosse

| # | Frage | Vorschlag | Entscheid |
| --- | --- | --- | --- |
| B1 | Abstand der drei Bosse | Drittel: 17 · 34 · 50 (§5.2) | |
| B2 | Endboss = Durchlauf 50 oder ein 51.? | der 50. | |
| B3 | Form | F1 besonderer Durchlauf, kein neuer Platz im Plan (§5.3) | |
| B4 | Wird die Boss-Regel vorher angekündigt? | ja, einen Durchlauf vorher | |
| B5 | Haben Boss-Regeln den Zuschnitt der Wochen-Modifikatoren? | ja — eine gemeinsame Darstellung (§5.4) | |
| B6 | Mechaniken und Beute | **später, im Rahmen der Progression** (gesetzt) | gesetzt |

### Par

| # | Frage | Vorschlag | Entscheid |
| --- | --- | --- | --- |
| P1 | Ist Par kumulativ oder je Durchlauf? | kumulativ (§6.2) | |
| P2 | Ist Par fest oder mitwachsend? | fest, aus der Sim | |
| P3 | Was hängt an Par? | P1 Anzeige zuerst, P2 Aufgabe danach, P3 Ökonomie nicht (§6.4) | |
| P4 | Ein Par für alle Fraktionen oder je Fraktion einer? | offen — Messfrage (§6.3) | |
| P5 | Wird die Par-Kurve gemessen? | ja, auf Ansage — vorher ist jede Zahl Platzhalter | |

---

## 9. Was als Nächstes passiert

Nichts davon wird gebaut, bevor §8 steht. Wenn es soweit ist, ist die Reihenfolge, die am wenigsten
kostet:

1. **Par als reine Anzeige** (P3 = P1). Braucht eine Messung und eine Zahlenreihe, sonst nichts, und
   liefert danach den Maßstab, an dem sich Aufgaben und Bosse ausrichten.
2. **Aufgaben mit den drei laufinternen Ausgabeflächen** (A, C, D). Das ist die Ökonomie in ihrer
   kleinsten vollständigen Form — sie verdient, sie gibt aus, sie verfällt.
3. **Bosse**, sobald die Progression ihre Mechaniken und ihre Beute gesetzt hat.
4. **Skill-Aufwertung** (Fläche B), sobald der Skill-Rework seine Stufen gesetzt hat.

Schritt 1 und 2 hängen an keinem anderen Vorhaben. Schritt 3 und 4 warten je auf ein anderes Dokument —
und das ist der Grund, warum dieser Entwurf sie nach hinten legt und nicht ausdesigniert.
