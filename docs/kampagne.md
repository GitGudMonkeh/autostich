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
- **Rewards geben Power** — und sind die **einzige** Reward-Achse, die das tun soll.
- **Rewards haben Raritäten.** Die Rarität steigt mit **zwei** Eingängen:
  1. Zahl der erfolgreich abgeschlossenen **Aufträge**,
  2. wie weit der Endscore **über** der Schwelle lag.
- **Später drei Ebenen**, jede aus vier Läufen; eine bestandene Ebene schaltet die nächste frei, mit
  neuen Freischaltungen und höherer Schwierigkeit. **Geplant wird jetzt nur Ebene 1.**

---

## 3. Offen — das muss vom Owner kommen, bevor gebaut wird

1. **Die Schwellen-Leiter selbst.** Vier Zahlen für Ebene 1. Siehe die Messung in §6 — die Streuung
   der Endscores ist der Kern des Problems.
2. **Was „Boss" über die Schwelle hinaus bedeutet.** Ist die vierte Runde nur eine höhere Zahl, oder
   trägt sie eine eigene Regel (Modifikator, Handicap, Sonderbedingung)?
3. **Wie viele Rewards zur Wahl stehen.** Eins wird genommen — aber aus wie vielen? (Die Aufträge
   legen drei aus; dieselbe Zahl wäre naheliegend, ist aber nicht gesetzt.)
4. **Die Raritätsstufen der Rewards.** Dieselben vier plus Legendär wie sonst im Spiel, oder eigene?
5. **Wie die zwei Eingänge zur Rarität verrechnet werden.** Addieren sie sich, ist einer ein Deckel,
   gibt es eine Matrix? Und mit welchen Schwellen?
6. **Der Reward-Katalog.** Umfang, Achsen, Werte.
7. **Der Kollisionsfall aus §5** — gehört er dazu?

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

**Nicht angefasst.** Dem Owner gemeldet, Entscheidung offen (§3.7).

---

## 6. Gemessen: Endscore eines ganzen Laufs

Die Bezugsgröße für jede Schwelle. 12 Seeds je Spielweise, voller Lauf über 50 Durchläufe,
Architekt an, alle vier Fraktionen freigeschaltet (2026-09-22).

| Spielweise | p25 | p50 | p75 | max |
| --- | --- | --- | --- | --- |
| naiv (kein Umbau) | 16,8 Mio | 18,6 Mio | 55,0 Mio | 77,1 Mio |
| Blitz | 8,1 Mio | 19,2 Mio | 49,5 Mio | 66,7 Mio |
| Feuer | 12,3 Mio | 17,8 Mio | 47,2 Mio | 55,1 Mio |
| Eis | 18,2 Mio | 33,6 Mio | 72,8 Mio | **432,0 Mio** |
| Pflanze | 16,3 Mio | 18,2 Mio | 44,0 Mio | 310,9 Mio |

> **Das ist der Kern des Schwellen-Problems: zwischen p25 und dem Maximum liegt Faktor 50.**
> Eine feste Zahl ist für einen guten Bau geschenkt und für einen schlechten unmöglich — und der
> zweite Raritäts-Eingang („wie weit über der Schwelle") ist damit bei einem Eis-Ausreißer sofort am
> Anschlag, während ein p25-Lauf die Schwelle gar nicht erst reißt.
>
> Wer die Leiter setzt, muss das mitentscheiden. Mögliche Richtungen, ungewichtet und **nicht**
> vorgeschlagen, nur als Sortierung der Frage: feste Zahlen; Schwelle relativ zum eigenen bisherigen
> Bestwert; Schwelle relativ zum Median der Ebene; oder der zweite Raritäts-Eingang misst nicht den
> Faktor, sondern eine gedeckelte Stufenleiter.

**Zur Messung selbst:** die Sim spielt auf Score, nicht auf eine Schwelle. Ein Spieler, der eine
Schwelle kennt und darauf spielt, verhält sich anders — derselbe Vorbehalt, der im Auftragsdokument
bei Sperrfeuer und Aufmarsch steht. Die Zahlen sind eine Untergrenze für das Machbare, kein Urteil.

---

## 7. Der erste Raritäts-Eingang, nachgezählt

**Aufträge je Lauf: höchstens zwei.** `contracts.js` hat zwei Fenster (D1–16, D17–32), je einen
Auftrag. Über eine Kampagne von vier Läufen sind also **höchstens 8** erfüllte Aufträge möglich —
und beim ersten Reward (nach Lauf 1) höchstens **2**.

Daraus folgt eine Kante, die beim Entwurf der Raritätsformel auffallen wird: **der erste Reward kann
über diesen Eingang nie hoch sein.** Wer will, dass schon der erste Reward legendär werden kann, muss
das über den zweiten Eingang (Score über Schwelle) erlauben oder die Formel anders bauen.

Gezählt wird `state.contracts.done` — die Liste der erfüllten Aufgaben-Ids. Sie überlebt heute den
Lauf nicht; für die Kampagne muss sie beim Laufende eingesammelt werden.

---

## 8. Nähte im Code

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
