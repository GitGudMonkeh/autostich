# Bestenliste — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Vorher lesen: **`docs/design-sprache.md`**. Dieses Dokument wiederholt den Kanon nicht, es wendet ihn
an.

Mockup: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 — Artboard
**„Bestenliste — Nachsehen und Spielen"**. Ist und Vorschlag in echter Größe, dazu die zwei
Kopf-Fassungen.

Bezug: die Fassung **ab 1280 px**. Die Handy-Fassung ist nicht Gegenstand; siehe *Abgrenzung*.

**Messgrundlage.** Produktionsbuild, echter Viewport, deutsch, **1280 × 720, 1400 × 700,
1536 × 791** — beide Einstiege, jeder Reiter einzeln.

---

## Zwei Bildschirme in einem

Das ist die Ausgangslage, und sie ist leicht zu übersehen:

| Einstieg | Reiter | Aufgabe |
| --- | --- | --- |
| Hub-Kachel „Bestenliste" | Global · Woche · Challenger | **nachsehen** — kein Spielen-Knopf, keine Regeln |
| Ranglisten-Knopf | Diese Woche · Challenger · Regeln | **spielen** — Seed, Modifikatoren, Spielen-Knopf |

Gleiche Karte, gleiche Maße, gleicher Titel. Heute sagt der Kopf nicht, in welcher der beiden man
steckt.

---

## Was der Bildschirm schon richtig macht

Und was deshalb **nicht** angefasst wird:

- **Die Maße sind die des Baums:** Karte 1208 px, Navigationsspalte 300, Fuge 22, Panel 884
  (*gemessen*, an allen drei Größen gleich).
- **Überzug** `rgba(12, 12, 16, .94)` ohne `backdrop-filter`.
- **Titel** bereits auf 27 px, und das Pokal-Zeichen ist bereits ein Vektor, kein Emoji.
- **Die inhaltsgroße Karte.** Sie springt zwischen 347 und 698 px, aber *gemessen* bleiben Kopf,
  Navigationsspalte und Panel-Oberkante dabei stehen — nur die Unterkante wandert. Ein 760-px-Rahmen
  um drei Einträge wäre schlechter; das war die Entscheidung hinter `#rahmen-huelle` und sie gilt.

**Der Umbau ist deshalb ein Nachziehen, kein Neubau.**

---

## Navigationsspalte

*Gemessen* trägt heute jede Zeile den **Farbanlauf** (12 %, aktiv 26 %), **Radius 11 px**, und die
aktive Zeile zusätzlich einen **Schein nach außen** (`0 0 18px -10px`).

Das ist die Spalte des Upgrade-Baums — von vor zwei Entscheidungen. Der Kommentar an
`index.css:4252` sagt ausdrücklich, die Form sei von dort übernommen, *„damit die Screens dieselbe
Bedienung haben"*. Danach hat der Baum

- den Farbanlauf verloren (`#up-form`: *„fünf Zeilen mit je eigenem Farbverlauf sind fünf Flächen"*),
- den Schein nach außen verloren (`#up-ruhe`: *„eine leuchtende Spalte neben einem ruhigen Panel
  zieht den Blick heraus"*),
- und ist auf **Radius 6** gegangen.

**Ziel: dieselben drei Griffe hier.** Fläche statt Anlauf (`rgba(255,255,255,.018)`, Hover `.045`,
aktiv `.07`), kein Schein nach außen, Radius 6. Die 4-px-Kante in der Deckfarbe bleibt und trägt
weiterhin den aktiven Zustand.

Das ist keine neue Entscheidung, sondern dieselbe — hier zum ersten Mal angewandt.

---

## Panel

*Gemessen:* `linear-gradient(rgba(27, 26, 36, .93), rgba(22, 22, 32, .95))` und
`border: 0 !important` (`index.css:4275`). Also das alte Rezept **ohne** Deck-Tönung und **ohne**
Rahmen.

**Ziel:** Tönung 5 % oben / 1 % unten und Rahmen 26 % wie jedes Panel (§1). Erst der Rahmen macht
sichtbar, dass die Fläche zum aktiven Deck gehört; heute trägt sie diese Aussage gar nicht.

Radius 14 stimmt bereits, der Scroller sitzt bereits **innen** (`#lb-rahmen`) — beides bleibt.

---

## Kopf — eine Bauart, zwei Fassungen

Heute besteht der Kopf aus Titel und Schließen. §2 verlangt **Eyebrow · Titel · Unterzeile**.

Der Titel bleibt in beiden Fällen „Bestenliste": es ist dieselbe Liste. Was sich unterscheidet, ist
die Aufgabe — und die sagen Eyebrow und Unterzeile:

| Einstieg | Eyebrow | Titel | Unterzeile |
| --- | --- | --- | --- |
| Hub-Kachel | **Vergleich** | Bestenliste | „Die besten Läufe aller Spieler." |
| Ranglisten-Knopf | **Rangliste** | Bestenliste | „Woche {n} — alle spielen denselben Seed." |

„Rangliste" ist kein neues Wort: so heißt der Knopf auf dem Hub, über den man hereinkommt. Die
Unterzeile des Ranglisten-Einstiegs ist dynamisch und trägt die Woche, die ohnehin schon im Panel
steht.

**Ein zweiter Titel wäre ein zweiter Screen, und den gibt es nicht.**

---

## Zeichen

*Gemessen:* **22 Textglyphen** auf diesem Bildschirm.

- `⌗` `⚖` `♔` in den drei Kontext-Kacheln des Ranglisten-Cockpits,
- `✚` und `⊘` **neunzehnmal** im Regeln-Reiter — an jedem Modifikator.

**Ziel:** gezeichnete SVG auf dem 16-px-Raster, eine Strichstärke, `currentColor` (§4). Es sind fünf
Zeichen insgesamt; zwei davon werden neunzehnmal wiederverwendet.

**Nicht angefasst:** die Farben der Modifikatoren (grün positiv, rot negativ) und die
Champion-Medaillen — sie tragen Bedeutung, keine Chrome (§3).

---

## Texte

- **Zwei neue Unterzeilen**, je Einstieg eine — siehe *Kopf*.
- Der Eyebrow „Rangliste" nimmt den Wortlaut des Hub-Knopfes auf; „Vergleich" steht bereits in der
  Eyebrow-Tabelle in `design-sprache.md` §2.
- Player-sichtbarer Text folgt `docs/text-style-guide.md` und `docs/localization/i18n.md`.

---

## Abgrenzung

- **Die Handy-Fassung** — dort ist die Navigationsspalte eine Reiterzeile und bleibt es.
- **Die Kartenmaße und die inhaltsgroße Karte** bleiben.
- **Der Überzug**, der Titel-Vektor und der innenliegende Scroller bleiben.
- **Die Modifikator-Farben, die Rang- und Champion-Medaillen** bleiben — Bedeutung, kein Chrome.
- **Keine Mechanik:** nichts hier ändert, wer im Board landet, wie gewertet wird oder was ein
  Modifikator tut.
- **Der Spielen-Knopf** und das Ranglisten-Cockpit behalten ihren Aufbau; sie bekommen nur die
  gezeichneten Zeichen.

---

## Offene Punkte für den Owner

1. **Der leere Challenger-Reiter macht die Karte 347 px hoch** (*gemessen*, 1280 × 720). Auf 720 px
   Fensterhöhe ist dann mehr als die Hälfte Überzug. Der leere Zustand sagt zwar, was fehlt
   („Noch keine Wochensieger"), bestimmt aber die Größe des ganzen Fensters. Leben lassen — oder
   bekommt der leere Zustand eine Mindesthöhe?
2. **Der Wortlaut der zwei Unterzeilen** in beiden Sprachen.
