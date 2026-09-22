# Kampagne — Notizen zum Entwurf

> **Stand: 2026-09-22.** Frisch begonnen. Dieses Dokument ist noch **kein Beschluss**, sondern der
> Zettel, auf dem steht, was gesetzt ist, was offen ist und was gemessen wurde. Wer daran
> anschließt, liest §2 (gesetzt) und §3 (offen) und fragt den Owner zu §3, bevor er baut.
>
> Sprache Deutsch, wie `docs/zwischenaufgaben.md` und `docs/muenz-oekonomie.md`: der Owner schreibt
> hier mit, und es geht um Produktgefühl. Bewusste Abweichung von der Engineering-Sprache
> (`AGENTS.md`).

---

## 1. Was das ist — und was es nicht ist

Eine **Kampagne** ist eine Kette von **vier ganzen Läufen**, die nacheinander gewonnen werden müssen.
Zwischen den Läufen wählt der Spieler **ein Reward**. Die Rewards bleiben bis zum Endboss oder bis
ein Lauf der vier verloren geht.

**Drei Schichten, die nicht verwechselt werden dürfen:**

| Schicht | Wo | Währung / Einsatz | Lebensdauer |
| --- | --- | --- | --- |
| **Meta-Progression** | `docs/progression-decisions.md`, `docs/progression-tree.md` | Stichpunkte, Upgrade-Knoten | über alle Läufe hinweg, dauerhaft |
| **Kampagne** (dieses Dokument) | neu | Rewards zwischen den Läufen | eine Kampagne (vier Läufe) |
| **Zwischenaufgaben** | `docs/zwischenaufgaben.md` | Beute für erfüllte Aufträge | ein Lauf |

Die Kampagne sitzt also **zwischen** Meta und Lauf. Sie ist die einzige der drei, die über mehrere
Läufe reicht, ohne dauerhaft zu sein.

---

## 2. Gesetzt (Owner, 2026-09-22)

- **Eine „Runde" ist ein ganzer Lauf** über 50 Durchläufe.
- **Vier Läufe hintereinander**, jeder mit einer **eskalierenden Score-Schwelle**, die geschlagen
  werden muss.
- **Der Endboss ist der Boss der vierten Runde.** Kein fünfter Lauf.
- **Zwischen den Läufen, zu Beginn des nächsten, wird ein Reward gewählt.** Eins, nicht mehrere.
- **Rewards bleiben** bis zum Endboss oder bis ein Lauf verloren geht.
- **Verloren heißt: die Kampagne beginnt von vorn.**
- **Rewards geben Power.** Ursprünglich als **einzige** Power-Achse gesetzt; **abgeschwächt am
  2026-09-22**: die Auftrags-Beute darf über *Lehrbrief* und *Aufstockung* weiter Power geben. Der
  Owner nimmt das **„fürs erste" hin** — also ausdrücklich vorläufig, nicht abgeräumt (§5).
- **Rewards haben Raritäten.** Die Rarität steigt mit **zwei** Eingängen:
  1. Zahl der erfolgreich abgeschlossenen **Aufträge**,
  2. wie weit der Endscore **über** der Schwelle lag.
- **Später drei Ebenen**, jede aus vier Läufen; eine bestandene Ebene schaltet die nächste frei, mit
  neuen Freischaltungen und höherer Schwierigkeit. **Geplant wird jetzt nur Ebene 1.**
- **Die Schwellen-Leiter für Ebene 1: 5 / 10 / 15 / 25 Mio.** Ausdrücklich **Startwerte** — sie
  werden im Playtest außerhalb der Sim nachgezogen, nicht an der Messung festgeschrieben.
- **Drei Rewards liegen aus, einer wird genommen.** Raritäten: die vier üblichen plus Legendär.
- **Jeder Reward ist nur einmal wählbar**, unabhängig von der Rarität. Hältst du ihn schon, kann er
  nur noch als **Upgrade auf eine höhere Stufe** erscheinen — die niedrigere wird dabei ersetzt,
  nicht gestapelt.
- **Die Raritätsformel ist eine Stufenleiter** — je Auftrag +1, ab 2× Schwelle +1, ab 3× Schwelle +2.
  Ausgeschrieben in §10.

---

## 3. Offen — das muss vom Owner kommen, bevor gebaut wird

1. ~~**Die Schwellen-Leiter selbst.**~~ — **entschieden: 5 / 10 / 15 / 25 Mio als Startwerte** (§2).
2. ~~**Was „Boss" über die Schwelle hinaus bedeutet.**~~ — **nicht Thema dieses Dokuments.** Die
   Bosse sind vom Owner bereits separat entworfen (2026-09-22). Für die Kampagne bleibt davon nur,
   dass der Boss der vierten Runde das Ende ist (§2). Randnotiz für den, der es baut: im heutigen
   Code gibt es noch keinen Boss — `grep -i boss src/` findet nur „Amboss" (Feuer-Schmiede).
3. ~~**Wie viele Rewards zur Wahl stehen.**~~ — **entschieden: drei liegen aus, einer wird
   genommen** (§10).
4. ~~**Die Raritätsstufen der Rewards.**~~ — **entschieden: die vier üblichen plus Legendär** (§10).
5. ~~**Wie die zwei Eingänge zur Rarität verrechnet werden.**~~ — **entschieden: eine Stufenleiter**,
   je Auftrag +1, ab 2× Schwelle +1, ab 3× Schwelle +2 (§10). Zwei Detailfragen stehen dort noch
   offen.
6. **Der Reward-Katalog.** Umfang, Achsen, Werte. — **Entwurf steht in §9**; offen sind dort nur noch Werte und Raritätsstufen.
7. ~~**Der Kollisionsfall aus §5**~~ — **entschieden: hingenommen, fürs erste** (§5). Vorläufig,
   nicht abgeräumt; der Playtest entscheidet, ob es dabei bleibt.

**Damit ist jede Frage aus dieser Liste beantwortet.** Was noch fehlt, ist keine Designfrage mehr,
sondern Zahlenarbeit und eine Machbarkeitsprüfung:

- **die Werte.** Im Katalog (§9) steht jede Größe als X, und je Reward sind es fünf Werte — einer je
  Raritätsstufe.
- **zwei Details an der Raritätsformel** (§10): trägt Stufe 3 weiterhin eine Chance auf Legendär,
  und gilt die Rarität für alle drei ausliegenden Rewards oder nur für das beste Stück?
- **drei Zuschnitte mit Code-Vorbehalt** (§9): *Ratsbrief*, *Bauherrschaft*, *Lückenschluss*.

---

## 4. Die Power-Achsen, aus denen ein Reward schöpfen kann

Aus `src/game/engine.js` (Zeile ~746, `breakdown`). Ein gewonnener Stich rechnet **multiplikativ**:

```
SCORE_PER_WIN (400)
  × streakMult      Serie
  × perkMult        Perks
  × fireMult        Feuer / Hitze
  × plantMult       Pflanze
  × formMult        Formation   (Startfaktor: formBase)
  × afterglowMult   Nachhall
  × coreMult        Formationskern
  × architectMult   Gebäude
  × critMult        Crit
  × strikeMult      Strike
  + flats + streakFlat + fireDirect + lightDirect + perkDirect
```

Dazu die Hebel **vor** der Formel, die nicht im `breakdown` stehen:

- **Kartenwert** — entscheidet, ob der Stich überhaupt gewonnen wird.
- **Crit-Chance** — wie oft `critMult` überhaupt greift.
- **Siegquote** — mehr gewonnene Stiche heißt mehr Wertungen; gemessen liegt sie um 48 %.

Jeder Reward drückt einen dieser Knöpfe. Wer einen neuen Knopf erfinden will, baut eine neue Achse
in die Score-Formel — das ist eine andere Größenordnung von Änderung und gehört gesondert entschieden.

---

## 5. Befund: zwei Beutestücke kollidieren mit „die einzige Power-Achse"

Der Owner hat gesetzt, dass **Kampagnen-Rewards die einzige Reward-Achse sind, die Power gibt**. Der
Beutekatalog der Zwischenaufgaben (61 Stücke, `src/game/contracts.js`) hält sich fast vollständig
daran — Münzen, Energie, Türen, Neuwürfe, Bauplatz, Segmentgrenzen, Angebotsbreite sind Ökonomie und
Ermöglichung. **Zwei Familien tun es nicht:**

| Stück | Wirkung | Warum das Power ist |
| --- | --- | --- |
| **Lehrbrief** I–IV | hebt 1–4 gehaltene Skills um 1–2 Stufen | Skill-Stufen zahlen direkt in `perkMult`, `fireMult`, Crit und Kartenwert |
| **Aufstockung** I–IV | hebt 1–alle gebauten Gebäude um eine Stufe | Gebäudestufen zahlen direkt in `architectMult` |

Grenzfall, bewusst nicht mitgezählt: **Baurecht** und **Stadtrecht** heben den Bauplatz — das ist
Ermöglichung, die Power kommt erst durch das, was der Spieler darauf baut. Ebenso **Vollendung**
(legendäres Stück): macht einen Skill episch, also dieselbe Frage wie Lehrbrief, nur einmalig.

**Entschieden am 2026-09-22: hingenommen, fürs erste.** Die beiden Stücke bleiben wie sie sind, und
der Satz „Rewards sind die einzige Power-Achse" gilt ab jetzt abgeschwächt (§2). Nichts zu bauen.

**Was dabei bewusst in Kauf genommen wird.** Zwei Kampagnen-Rewards zielen direkt auf diese Beute —
*Doppelwahl* (zwei Stücke statt einem) und *Adelsbrief* (eine Stufe höher) — und die Raritätsformel
zahlt Aufträge obendrein ein zweites Mal (§10: je Auftrag eine Raritätsstufe). Ein Spieler, der auf
Aufträge spielt, wird damit vierfach belohnt: mehr Beute, bessere Beute, stärkere Skills und
Gebäude daraus, und dazu ein höherwertiger Kampagnen-Reward.

**Woran man merkt, dass es doch kippt:** wenn im Playtest der Auftrags-Fokus die einzige sinnvolle
Spielweise wird. Dann liegen die zwei anderen Wege weiterhin bereit — Lehrbrief und Aufstockung auf
Ermöglichung umbauen (trifft 8 der 61 Beutestücke), oder Doppelwahl und Adelsbrief anders ausrichten.

---

## 6. Gemessen: Endscore eines ganzen Laufs

Die Bezugsgröße für jede Schwelle. **40 Seeds je Spielweise, 200 volle Läufe** über je 50 Durchläufe,
Architekt an, alle vier Fraktionen freigeschaltet (2026-09-22). Alle Zahlen in Mio.

> Ersetzt eine erste Messung mit 12 Seeds vom selben Tag. Die war zu dünn: bei dieser Streuung
> wanderten einzelne Perzentile um Faktor 2, und das Maximum war um Faktor 9 daneben.

| Spielweise | p10 | p25 | p50 | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- | --- |
| naiv (kein Umbau) | 6 | 8 | 16 | 27 | 56 | 92 |
| Blitz | 7 | 9 | 19 | 49 | 102 | **627** |
| Feuer | 5 | 7 | 9 | 18 | 37 | 55 |
| Eis | 9 | 15 | 34 | 62 | 174 | 432 |
| Pflanze | 8 | 12 | 24 | 43 | 106 | 470 |
| **alle zusammen** | **6** | **9** | **17** | **37** | **84** | **627** |

**Erreichungsquote** — Anteil der Läufe, die eine Schwelle reißen, **ohne jedes Kampagnen-Reward**
(also genau die Lage in Lauf 1). Die letzte Spalte ist reine Arithmetik auf derselben Messung:
vier solche Läufe hintereinander, ein Fehlschlag setzt die Kampagne zurück.

| Schwelle | naiv | Blitz | Feuer | Eis | Pflanze | **alle** | 4 am Stück |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 Mio | 98 % | 98 % | 83 % | 100 % | 98 % | **95 %** | 81,5 % |
| 10 Mio | 68 % | 68 % | 48 % | 88 % | 80 % | **70 %** | 24,0 % |
| 15 Mio | 50 % | 58 % | 33 % | 75 % | 68 % | **57 %** | 10,2 % |
| 20 Mio | 35 % | 48 % | 20 % | 70 % | 53 % | **45 %** | 4,1 % |
| 30 Mio | 23 % | 28 % | 13 % | 53 % | 33 % | **30 %** | 0,8 % |
| 50 Mio | 18 % | 23 % | 5 % | 30 % | 15 % | **18 %** | 0,1 % |
| 100 Mio | 0 % | 10 % | 0 % | 13 % | 13 % | **7 %** | 0,0 % |

**Drei Befunde, die jede Leiter mitentscheiden muss:**

1. **Die Kette kostet mehr als die einzelne Schwelle.** Weil ein Verlust die ganze Kampagne
   zurücksetzt, multiplizieren sich die Quoten. Eine Schwelle, die einzeln in 70 % der Läufe fällt,
   trägt eine Kampagne nur noch in 24 %.
2. **Faktor 100 zwischen schwachem und starkem Lauf** (p10 6 Mio, max 627 Mio). Eine feste Zahl ist
   für den einen geschenkt und für den anderen unmöglich — und der zweite Raritäts-Eingang („wie weit
   über der Schwelle") steht bei einem Ausreißer sofort am Anschlag.
3. **Die Spielweise verschiebt das um Faktor 4.** Feuer liegt im Median bei 9 Mio, Eis bei 34 Mio.
   Dieselbe feste Schwelle ist je nach Bau ein anderes Spiel.

> Mögliche Richtungen, ungewichtet und **nicht** vorgeschlagen, nur als Sortierung der Frage: feste
> Zahlen; Schwelle relativ zum eigenen bisherigen Bestwert; Schwelle relativ zum Median der Ebene;
> oder der zweite Raritäts-Eingang misst nicht den Faktor, sondern eine gedeckelte Stufenleiter.

**Zwei Vorbehalte.** Erstens spielt die Sim auf Score, nicht auf eine Schwelle; ein Spieler, der die
Schwelle kennt, verhält sich anders — derselbe Vorbehalt wie bei Sperrfeuer und Aufmarsch im
Auftragsdokument. Zweitens misst die Tabelle einen Lauf **ohne Rewards**. Sie beschreibt damit
Sprosse 1 exakt und die Sprossen 2–4 gar nicht: was dort machbar ist, hängt daran, wie viel Power ein
Reward gibt — und das ist noch nicht entschieden (§3.6). Die Zahlen sind eine Untergrenze, kein Urteil.

**Beide Tabellen kommen aus einer Sonde**, die im Repo liegt statt im Scratchpad:
`N=40 node sim/probes/kampagne-schwelle.mjs`. Sie legt die Rohwerte ab, `REUSE=1 LADDER=8,12,18 …`
fragt eine andere Leiter daraus ab, ohne 200 Läufe neu zu spielen.

---

## 7. Das Power-Budget: wie stark ein Reward sein muss

Die Leiter sagt das selbst. Lauf *n* wird mit *n−1* Rewards gespielt, also legt sie fest, wieviel ein
Reward tragen muss, damit die Kette hält. Ausgerechnet auf denselben 200 gemessenen Läufen: ein
Reward ist einen Faktor K auf den Endscore wert, Rewards stapeln multiplikativ, und der Anteil der
Läufe, die Schwelle T mit n Rewards reißt, ist damit exakt `Anteil(score ≥ T / Kⁿ)` — eine Abfrage
auf der Verteilung, kein neuer Lauf.

| K je Reward | L1 (5) | L2 (10) | L3 (15) | L4 (25) | **Kampagne** | Versuche je Sieg |
| --- | --- | --- | --- | --- | --- | --- |
| **×1 (ohne)** | 95 % | 70 % | 57 % | 38 % | **14,1 %** | 7,1 |
| ×1,1 | 95 % | 73 % | 62 % | 47 % | **20,0 %** | 5,0 |
| ×1,25 | 95 % | 80 % | 71 % | 60 % | **32,4 %** | 3,1 |
| ×1,5 | 95 % | 89 % | 89 % | 85 % | **62,9 %** | 1,6 |
| ×2 | 95 % | 95 % | 100 % | 100 % | **89,8 %** | 1,1 |
| ×3 | 95 % | 100 % | 100 % | 100 % | **95,0 %** | 1,1 |

Je Spielweise, Kampagnen-Erfolgsquote in %:

| K | naiv | Blitz | Feuer | Eis | Pflanze |
| --- | --- | --- | --- | --- | --- |
| ×1 | 9,0 | 14,2 | **2,2** | **42,7** | 21,1 |
| ×1,25 | 28,4 | 36,1 | 8,4 | 64,4 | 46,1 |
| ×1,5 | 52,8 | 73,0 | 30,4 | 100 | 75,1 |
| ×2 | 95,1 | 95,1 | 68,1 | 100 | 92,7 |

**Zwei Dinge, die daraus abzulesen sind.** Sprosse 1 ist mit 95 % praktisch geschenkt — die ganze
Schwierigkeit der Leiter sitzt in L3 und L4. Und die Spreizung zwischen den Spielweisen überlebt jede
Reward-Stärke: bei ×1,5 steht Eis auf 100 %, Feuer auf 30 %.

**Modellgrenze, ausdrücklich.** K ist als Faktor auf den *Endscore* definiert, nicht als Faktor auf
eine einzelne Achse. Für einen multiplikativen Reward ist beides dasselbe; für einen flachen nicht —
siehe §8. Die Tabelle taugt als Budget („wieviel Endscore muss ein Reward bringen"), nicht als
Bauanleitung.

Sonde: `node sim/probes/kampagne-budget.mjs`, `LADDER=…` und `K=…` setzen andere Leitern/Faktoren.

---

## 8. Welcher Hebel etwas bringt — und drei, die es nicht gibt

### Flach oder multiplikativ: zwei Bauformen mit gegensätzlicher Wirkung

Gemessen: der Endscore ist **exakt linear** in den Basispunkten je Sieg. Der Grund steht in
`engine.js:587` — `scoreBase = SCORE_PER_WIN + flats`, und die Multiplikatoren greifen auf die
**Summe**. Die Basispunkte sind also ein Summand neben den Flats (Ionisations-Stapel, Feuer- und
Perk-Flats), kein Vorfaktor. Über die Gerade lässt sich exakt ablesen, welchen Anteil sie tragen:

| Lauf | Endscore | Anteil der Basispunkte |
| --- | --- | --- |
| Eis, Seed 3 | 72,8 Mio | **2,6 %** |
| naiv, Seed 1 | 55,0 Mio | 7,5 % |
| Eis, Seed 1 | 25,4 Mio | 6,5 % |
| naiv, Seed 2 | 16,9 Mio | 21,1 % |
| Eis, Seed 2 | 12,6 Mio | **32,4 %** |

**Je stärker der Lauf, desto weniger trägt die Basis.** Daraus folgt für den Katalog:

- Ein **flacher** Reward („+X Basispunkte je Sieg") wirkt stark im schwachen Lauf und fast nicht im
  starken → **staucht die Streuung**, ist Aufholhilfe.
- Ein **multiplikativer** Reward („+X % auf Achse Y") wirkt überall denselben Prozentsatz →
  **verbreitert die Streuung**, verstärkt den starken Bau.

Bei der Faktor-100-Streuung aus §6 ist das keine Feinheit, sondern die Grundentscheidung des Katalogs.

### Was ein einzelner Hebel trägt

Gepaart, 24 Seeds je Spielweise, je Variante dieselben Seeds; Faktor = Median der Verhältnisse.

| Hebel | alle | naiv | Blitz | Feuer | Eis | Pflanze |
| --- | --- | --- | --- | --- | --- | --- |
| Basispunkte 400 → 0 | ×0,77 | ×0,75 | ×0,68 | **×0,47** | ×0,93 | ×0,83 |
| Basispunkte 400 → 800 | ×1,23 | ×1,25 | ×1,33 | **×1,53** | ×1,07 | ×1,17 |
| Serien-Schritt 2 → 3 % | ×1,05 | ×1,04 | ×1,08 | ×1,04 | ×1,05 | ×1,03 |
| Serien-Deckel 150 → 200 % | ×1,00 | ×1,00 | ×1,00 | ×1,00 | ×1,00 | ×1,00 |
| Crit-Basis 2,25 → 2,75 | ×1,07 | ×1,08 | ×1,07 | ×1,06 | ×1,09 | ×1,05 |
| Crit-Deckel 8 → 12 | ×1,00 | ×1,00 | ×1,06 | ×1,00 | ×1,00 | ×1,00 |
| Legendäre Skills ×2 | ×1,00 | ×1,00 | ×1,00 | ×1,00 | ×1,00 | ×1,00 |

**Die Basispunkt-Zeile ist der Beleg für die Aufhol-Wirkung von oben:** verdoppeln bringt Feuer
+53 %, Eis +7 %. Sie landet damit auch genau im Budget-Band aus §7 (×1,25).

**Zwei Deckel binden nach oben nicht.** Der Serien-Deckel greift erst ab Serie 75, die kein Lauf
erreicht (Gegenprobe: auf 0,1 gesenkt bewegt er den Score, der Knopf lebt also). Der Crit-Deckel
bindet nur bei Blitz (+6 %); für alle anderen ist er Luft.

> **Die Legendär-Zeile ist NICHT belastbar.** Der Knopf wirkt — auf Chance 1,0 gestellt steigt der
> Score um Faktor 20 —, aber bei 0,035 → 0,07 ist der Effekt kleiner als das Rauschen von 24 Seeds,
> und auf 0 gestellt stieg der Score in zwei von drei Stichproben sogar. Wer die Achse braucht, misst
> sie mit deutlich mehr Seeds neu.

### Drei naheliegende Hebel gibt es nicht

Alle drei ließen den Endscore **byte-identisch** — die Gründe sind aber verschieden, und einer davon
ist kein Befund über das Spiel:

| Hebel | Warum nichts passiert |
| --- | --- |
| **+1 Skill-Slot** | In exp sind Slots unbegrenzt: `reducer.js:901` fällt auf `SKILL_SLOT_LIMIT` (99) zurück. Es gibt keinen Deckel zu heben. |
| **Breiteres Skill-Angebot** | 12 Skills auf 4 Fraktionen sitzt schon **auf** dem Deckel `SKILL_OFFER_PER_ARCH_CAP = 3` (`skills.js:537`). |
| **Gratis-Neuwürfe** | Erreicht den State (`reducer.js:198`), aber die **Sim-Politiken würfeln nie neu**. Das ist eine Lücke der Sim, keine Aussage über das Spiel. |

Die ersten beiden sind echte Nicht-Hebel. Der dritte ist ungemessen, nicht wirkungslos.

Sonde: `N=24 node sim/probes/kampagne-hebel.mjs` (gepaart, je Variante dieselben Seeds).

---

## 9. Der Reward-Katalog (Entwurf, Owner 2026-09-22)

**Sechs Achsen, 16 Rewards, dazu fünf Legendäre.** Vom Owner gesetzt ist die Auswahl der Achsen.
**Die Werte unten sind ein erster Satz, kein Beschluss** — sie sind da, damit der Owner sie
überschreiben kann, nicht damit sie stehenbleiben.

Vier Achsen tragen drei Stücke, **Struktur und Kampagnen-Ebene nur zwei** — *Ratsbrief* und
*Gnadengesuch* sind gestrichen, die Plätze sind frei.

Zwei Achsen aus dem ersten Wurf sind **verworfen**: „Angebot und Auswahl" (mehr Skills zur Wahl,
höherer Raritätsboden) und „Start-Vorbelegung" (Lauf beginnt mit Skill/Gebäude/Serie).

**Die Basiswerte, gegen die alles unten zu lesen ist** (aus dem Code, nicht geschätzt):

| Größe | Wert | Quelle |
| --- | --- | --- |
| Basispunkte je gewonnenem Stich | **400** | `SCORE_PER_WIN` |
| Deck | **40 Karten**, Werte 1–10, Gesamtwert 220 | `RANKS`, `SUIT_ORDER` |
| Stiche je Durchlauf · Durchläufe je Lauf | **40** · **50** | `TRICKS_PER_CYCLE`, `MAX_CYCLES` |
| Münzen je Durchlauf | **2** (≈ 100 je Lauf) | `COIN_CYCLE_BASE` |
| Neuwurf | **3 Münzen** (legendär 15) | `REROLL_BASE` |
| Formationsenergie je Aufstellphase | **4** | `FORMATION_ENERGY` |
| Baufeld | **24** von 40 Zellen | `MAX_COVER` |

**Wie belastbar die Werte sind.** Nur die Score-Achse ist an eine Messung geknüpft: aus §8 ist
bekannt, dass +400 Basispunkte ×1,23 auf den Endscore bringen und dass der Endscore exakt linear in
den Basispunkten ist — daraus fallen Sold und Feldzeichen direkt. **Alles andere ist Augenmaß**,
gesetzt gegen die Basiswerte oben und gegen das Budget aus §7 (ein Reward sollte grob ×1,25–1,5
wert sein, damit die Kette trägt). Der Playtest zieht sie nach.

**Ein „—" heißt: dieses Stück gibt es auf dieser Stufe nicht.** Nicht jeder Reward trägt vier
Stufen; die Regel-Ausnahmen und die Kampagnen-Stücke sind dafür zu binär (§9 offene Fragen, Punkt 4).

### 1 · Score-Formel

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Sold** · jeder gewonnene Stich bringt mehr Grundpunkte, bevor die Multiplikatoren greifen | +100 | +200 | +350 | +600 |
| **Feldzeichen** · eine **ausgewürfelte** Achse — Serie, Perks, Formation, Kern, Nachhall, Gebäude, Crit, Feuer oder Pflanze — zahlt dauerhaft mehr. Welche es ist, steht im Angebot | +10 % | +20 % | +35 % | +55 % |
| **Steigbrief** · dein Score-Bonus wächst alle 10 Durchläufe. Am Ende eines Laufs steht er beim Fünffachen | +3 % / 10 D. (Ende +15 %) | +5 % (Ende +25 %) | +8 % (Ende +40 %) | +12 % (Ende +60 %) |

Sold hilft dem schwachen Lauf (§8: verdoppelte Basispunkte bringen Feuer +53 %, Eis +7 %),
Feldzeichen passt sich dem Bau an, Steigbrief zahlt erst spät.

### 2 · Kampfkraft

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Waffenrecht** · jede Karte in deinem Deck ist dauerhaft stärker | +1 | +2 | +3 | +4 |
| **Wetzstein** · am Ende jedes Durchlaufs bekommt deine schwächste Karte etwas dazu | +1 | +2 | +3 | +4 |
| **Zehnt** · jede Karte im Gegnerdeck ist dauerhaft schwächer | +1 | +2 | +3 | +4 |

Die einzige Achse, die sich selbst verstärkt: mehr gewonnene Stiche heißt mehr Wertungen **und**
längere Serien. Zehnt wirkt auch dann noch, wenn der eigene Kartenwert oben klemmt.

> **Achtung, hier ist +1 nicht klein.** Beide Decks ziehen Werte 1–10. Ein Punkt auf jede eigene
> Karte heißt, dass du Gleichstände gewinnst — das sind rund **zehn Prozentpunkte Siegquote**, von
> gemessenen ~48 % auf ~58 %. Diese Achse braucht den Playtest dringender als jede andere.

### 3 · Ökonomie

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Pfründe** · du bekommst jeden Durchlauf mehr Münzen | +1 | +2 | +3 | +4 |
| **Handelsbrief** · alles, was du kaufst, kostet weniger | −10 % | −20 % | −30 % | −50 % |
| **Mitgift** · der Lauf beginnt mit Münzen in der Tasche | 15 | 30 | 50 | 80 |

> **Auch hier ist die kleinste Stufe groß:** der Sockel liegt bei 2 Münzen je Durchlauf, ein
> Pfründe-Normal ist also schon **+50 % Einkommen** über den ganzen Lauf.

### 5 · Struktur

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Lehen** · dein Baufeld hat mehr Platz (von 24 Zellen) | +2 | +4 | +6 | +10 |
| **Fahnenrecht** · du hast in jeder Aufstellphase mehr Energie (von 4) | +1 | +2 | +3 | +4 |

> **Diese Achse hat nur zwei Stücke.** *Ratsbrief* (zusätzliche Entscheidungsphasen) ist am
> 2026-09-22 gestrichen worden; ein dritter Platz ist frei.

### 7 · Regel-Ausnahmen

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Standhaftigkeit** · deine Serie überlebt Niederlagen, statt abzureißen | 1 je Durchlauf | 2 | 3 | 4 |
| **Losentscheid** · knapp verlorene Stiche zählen trotzdem als Sieg | Rückstand ≤ 1 | ≤ 2 | ≤ 3 | ≤ 4 |
| **Lückenschluss** · eine Formation zählt als vollständig, auch wenn Karten nicht passen | 1 falsche Karte, **eine** Formation je Phase | 1 falsche Karte, **alle** Formationen | 2 falsche Karten | 3 falsche Karten |

> *Losentscheid* auf **Selten** ist exakt der bestehende Perk *Patt* (`PATT_MARGIN = 2`). Entweder
> ist das gewollt — dieselbe Regel, jetzt auch als Kampagnen-Stück — oder die Leiter muss höher
> ansetzen.

### 8 · Kampagnen-Ebene

| Reward | Normal | Selten | Sehr selten | Episch |
| --- | --- | --- | --- | --- |
| **Fürsprache** · die Schwelle des nächsten Laufs sinkt | −10 % | −20 % | −30 % | −50 % |
| **Doppelwahl** · nach einem erfüllten Auftrag wählst du zwei Beutestücke statt einem | beim nächsten Auftrag | jeden Auftrag **dieses** Laufs | dauerhaft | dauerhaft, und das zweite Stück eine Stufe höher |

> **Auch hier nur zwei Stücke.** *Gnadengesuch* (verlorenen Lauf wiederholen) ist am 2026-09-22
> gestrichen worden; ein dritter Platz ist frei. Damit federt **nichts** im Katalog einen verlorenen
> Lauf mehr ab — die Kampagne ist wieder kompromisslos Alles-oder-nichts.

### 8 · Kampagnen-Ebene

| Reward | Wirkung | Raritäts-Regler |
| --- | --- | --- |
| **Gnadengesuch** | ein verlorener Lauf darf einmal je Kampagne wiederholt werden | wie oft |
| **Fürsprache** | die Schwelle des nächsten Laufs sinkt um X % | X; einmalig oder dauerhaft |
| **Doppelwahl** | nach einem erfüllten **Auftrag** wählst du **zwei** Beutestücke statt einem | dauerhaft oder X-mal |

### Legendär (fünf)

| Reward | Wirkung |
| --- | --- |
| **Freispruch** | der nächste Lauf hat **keine Score-Schwelle** |
| **Handschlag** | **garantiert legendärer Perk** in der ersten Perk-Phase — nächster Lauf und alle folgenden |
| **Erleuchtung** | **garantiert legendärer Skill** in der Skill-Phase — nächster Lauf und alle folgenden |
| **Bauherrschaft** | **garantiert legendäres Gebäude** in der ersten Bauphase — nächster Lauf und alle folgenden |
| **Adelsbrief** | **Aufträge geben Beute eine Stufe über ihrem Schwierigkeitsgrad** — leicht zahlt wie mittel, mittel wie schwer, schwer darüber hinaus; und **schwer** hebt die Legendär-Chance von 30 % auf 50 % |

*Handschlag*, *Erleuchtung* und *Freispruch* stammen vom Owner, *Adelsbrief* ebenfalls.
*Bauherrschaft* schließt die Reihe Perk / Skill / Gebäude — dasselbe Versprechen auf der dritten
Angebotsart.

**Adelsbrief greift in die Auftrags-Beute** (`STEP_BAND` in `contracts.js`: leicht [1,2],
mittel [2,3], schwer [3,4], Legendär-Chance 30 % auf schwer). Eine Stufe höher heißt leicht [2,3],
mittel [3,4], schwer [4,5]. Offen bleibt, wie weit die Legendär-Chance auf schwer steigt und ob die
Garantie „mindestens ein Stück der oberen Stufe" mitwandert.

### Offene Fragen zum Katalog

1. **Die Werte selbst.** Ein erster Satz steht oben; nur die Score-Achse ist an eine Messung
   geknüpft, der Rest ist Augenmaß gegen die Basiswerte. Drei Stellen sind auffällig heiß:
   *Waffenrecht/Zehnt* (+1 ist schon ~10 Punkte Siegquote), *Pfründe* (+1 ist +50 % Einkommen) und
   *Gnadengesuch* (schon 1× nimmt der Kampagne ihre Schärfe).
2. **Zwei Zuschnitte brauchen einen Blick in den Code, bevor sie zugesagt werden:** *Bauherrschaft*
   (setzt voraus, dass es legendäre Gebäude als Rarität überhaupt gibt) und *Lückenschluss*
   (Formationen werden heute als exaktes Muster erkannt — Farbblock, Wiederholung, Treppe,
   Wechsel; eine Toleranz von X falschen Karten muss der Erkenner erst tragen können).
3. **Losentscheid liegt nah am Perk *Patt*** (Niederlage um ≤ 2 zählt als Sieg). Entweder anders
   schneiden oder bewusst als stärkere Kampagnen-Variante führen.
4. **Achsen 7 und 8 tragen Raritätsstufen schlecht** — der Sprung von „gar nicht" auf „einmal" ist
   größer als jeder Schritt danach.
5. **Doppelwahl und Adelsbrief verschärfen §5 beide.** Doppelwahl verdoppelt die Auftrags-Beute,
   Adelsbrief hebt ihre Stufe — beides trifft auch *Lehrbrief* und *Aufstockung*, genau die zwei
   Stücke, die schon heute mit „Rewards sind die einzige Power-Achse" kollidieren. Zusammen
   genommen ist die Auftrags-Beute damit der zweite große Power-Kanal der Kampagne, ob gewollt
   oder nicht.
6. **Nichts im Katalog federt einen verlorenen Lauf mehr ab.** Seit *Gnadengesuch* gestrichen ist,
   gibt jedes Stück Power und keines Sicherheit. Die Kampagne trägt damit ohne Rewards 14 % Erfolg
   und bei ×1,25 je Reward 32 % (§7) — ein Lauf zu verlieren kostet immer alles.
7. **Die zwei freien Plätze** auf Struktur und Kampagnen-Ebene.

---

## 10. Die Raritätsformel (Owner, 2026-09-22)

**Drei Rewards liegen aus, einer wird genommen.** Raritäten: die vier üblichen plus Legendär.

Die Rarität entsteht aus **Stufen**, und jeder Erfolg gibt eine Stufe:

| Beitrag | Stufen |
| --- | --- |
| je erfüllter Auftrag (höchstens 2 je Lauf) | **+1** |
| Endscore ≥ **2×** Schwelle | **+1** |
| Endscore ≥ **3×** Schwelle | **+2** (statt +1, nicht zusätzlich) |

| Summe | Rarität |
| --- | --- |
| 0 | Normal |
| 1 | Selten |
| 2 | Sehr selten |
| 3 | Episch + Chance auf Legendär |
| 4 | Legendär |

Ausgeschrieben ist das eine saubere Diagonale — jeder Schritt auf einer der beiden Achsen ist genau
eine Rarität:

| | Score < 2× | Score ≥ 2× | Score ≥ 3× |
| --- | --- | --- | --- |
| **0 Aufträge** | Normal | Selten | Sehr selten |
| **1 Auftrag** | Selten | Sehr selten | Episch |
| **2 Aufträge** | Sehr selten | Episch | **Legendär** |

**Was die Formel dadurch leistet.** Der Score allein kommt nur bis *Sehr selten* — für Episch braucht
es mindestens einen Auftrag, für Legendär beide Aufträge **und** den dreifachen Score. Damit sind die
Aufträge nicht mehr wegzudrücken: in einem früheren Zuschnitt (3× gab +3) reichte ein starker Lauf
allein für die Spitze, und der Auftrags-Eingang schaltete sich bei genau den Spielern ab, die ihn am
ehesten erfüllen.

### Was der Score-Eingang tatsächlich ausschüttet

Aus den 200 gemessenen Läufen (§6), jeweils **unter der Bedingung, dass die Schwelle gerissen wurde**
— ohne Kampagnen-Rewards, also die Untergrenze:

| | Schwelle | erreicht 2× | erreicht 3× |
| --- | --- | --- | --- |
| Lauf 1 | 5 Mio | 74 % | 60 % |
| Lauf 2 | 10 Mio | 64 % | 43 % |
| Lauf 3 | 15 Mio | 53 % | 35 % |
| Lauf 4 | 25 Mio | 47 % | 29 % |

**Der Score-Eingang ist in Lauf 1 am großzügigsten und in Lauf 4 am knausrigsten**, weil die Leiter
um Faktor 5 steigt und die Spielerstärke nicht. Seit 3× nur noch +2 gibt, bleibt der Effekt auf die
unteren Stufen beschränkt: er verschiebt Normal/Selten/Sehr selten, aber die Spitze hängt an den
Aufträgen und die werden nicht leichter oder schwerer, wenn die Schwelle steigt.

### Der Auftrags-Eingang, nachgezählt

**Aufträge je Lauf: höchstens zwei.** `contracts.js` hat zwei Fenster (D1–16, D17–32), je einen
Auftrag. Über eine Kampagne von vier Läufen sind also **höchstens 8** erfüllte Aufträge möglich.
Zwei je Lauf ist genau die Zahl, die die Formel oben als Maximum ansetzt — die Leiter ist also
ausgereizt, nicht gedeckelt.

Gezählt wird `state.contracts.done` — die Liste der erfüllten Aufgaben-Ids. Sie überlebt heute den
Lauf nicht; für die Kampagne muss sie beim Laufende eingesammelt werden.

**Ungemessen:** wie oft ein Spieler tatsächlich 0, 1 oder 2 Aufträge schafft. Ohne diese Verteilung
ist nicht sagbar, wie häufig Episch und Legendär wirklich fallen — die Score-Tabelle oben deckt nur
die eine Achse ab.

### Jeder Reward nur einmal

**Ein Reward, den du hältst, kommt nicht wieder — außer als Upgrade auf eine höhere Stufe**, und
die ersetzt die niedrigere, statt sich zu stapeln (Owner, 2026-09-22).

Das verhindert genau eine Sache: dreimal dasselbe Stück nehmen und eine einzige Achse ins Extrem
treiben. Bei **drei Picks je Kampagne** (zu Beginn von Lauf 2, 3 und 4) und 16 Stücken im Katalog
bindet die Regel sonst kaum — dieselbe Karte zweimal zu sehen ist ohnehin selten.

**Die Folge, die beim Werte-Setzen auffallen wird:** ein Upgrade ist nur die **Differenz** wert. Wer
*Sold* auf Selten hält (+200) und es auf Episch hebt (+600), gewinnt +400 — ein frisches
Episch-Stück gäbe seinen vollen Wert. Ein Upgrade ist damit fast immer der schwächere Zug, außer der
Sprung zwischen den Stufen ist groß. Wenn Upgrades sich attraktiv anfühlen sollen, muss entweder der
Abstand zwischen den Raritätsstufen wachsen, oder das Upgrade muss addieren statt zu ersetzen.

### Offen an der Formel

1. **Trägt Stufe 3 weiterhin eine „Chance auf Legendär"**, jetzt wo Stufe 4 das Legendäre garantiert?
   Beides nebeneinander ist möglich, aber nicht gesetzt.
2. **Was bedeutet „Rarität" für die Auslage?** Sind alle drei ausliegenden Rewards von dieser
   Rarität, oder ist es die Rarität des besten Stücks und die anderen liegen darunter? Die
   Auftrags-Beute löst dieselbe Frage über eine Bandbreite plus Garantie (`STEP_BAND`); dieselbe
   Bauform wäre hier möglich, ist aber nicht entschieden.

---

## 11. Nähte im Code

| Wofür | Wo |
| --- | --- |
| Lauf-Ende, Endscore | `state.score` bei `phase === "gameover"`; `src/ui/GameOver.jsx` |
| Erfüllte Aufträge eines Laufs | `state.contracts.done` (`src/game/contracts.js`) |
| Score-Formel und ihre Faktoren | `src/game/engine.js`, `breakdown` |
| Lauf starten mit Vorbelegung | `START_RUN` in `src/game/reducer.js` — nimmt schon `contracts: true` als Opt-in, dasselbe Muster trägt eine Kampagnen-Flagge |
| Dauerhafte Segen über einen Lauf | `state.contractBoons` + die Zugriffe in `contracts.js` — dieselbe Bauform (Wert ohne Segen rein, Wert mit Segen raus) passt für Kampagnen-Rewards |
| Zustand über Läufe hinweg | `src/game/storage.js` (Profil, `as_activerun`) |

**Das Muster der Auftrags-Segen ist die Vorlage.** Jeder Zugriff hat die Form
`xWith(state, basis) → basis, wenn kein Segen`. Ein normaler Lauf zahlt eine Feldabfrage und bekommt
seine eigene Zahl zurück. Kampagnen-Rewards sollten genauso gebaut werden — und die Lehre aus dem
Beute-Audit (2026-09-17) gleich mit: **prüfen, dass sich eine ZAHL ändert, nicht dass ein Schlüssel
geschrieben wird.** Veredelung schrieb ihren Schlüssel und wirkte trotzdem nie.
