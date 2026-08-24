# Erststart — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Vorher lesen: **`docs/design-sprache.md`**. Dieses Dokument wiederholt den Kanon nicht, es wendet ihn
an.

Mockup: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 — Artboard
**„Erststart — der Willkommens-Bildschirm"**. Es zeigt Ist und Vorschlag in echter Größe, dazu die
Sprachwahl in allen vier Zuständen auf ihrer echten Breite.

Bezug: die Fassung **ab 1280 px** (zweispaltig). Der schmale Dialog darunter und der spätere
„Name ändern"-Dialog sind nicht Gegenstand; siehe *Abgrenzung*.

**Messgrundlage.** Alle Zahlen sind im Produktionsbuild an einem echten Viewport gemessen, mit
geleertem Speicher — also im echten Erststart-Zustand: **1280 × 720, 1536 × 791, 1400 × 700**.

---

## Ausgangsproblem

Es ist der einzige Bildschirm, an dem jeder Spieler garantiert vorbeikommt, und er entscheidet zwei
Dinge auf einmal: den **Namen**, der später an den globalen Bestenlisten hängt, und die **Sprache**.

Er erscheint auf **Englisch** — der Standard ist Englisch, und die Umschaltung steht auf diesem
Bildschirm. Das bleibt so und ist richtig: es ist der einzige Moment, in dem ein deutscher Spieler
garantiert an der Sprachwahl vorbeikommt, ohne erst die Optionen zu suchen. Es erhöht aber den
Einsatz auf genau diesem einen Bedienelement — und das ist heute das schwächste des Bildschirms.

Was **schon richtig ist** und nicht angefasst wird: Überzug `rgba(12, 12, 16, .94)` ohne
`backdrop-filter`, die Zweispaltigkeit, und die Kartengröße **900 × 444 px**, die bei allen drei
gemessenen Größen identisch ist und nirgends überläuft. Der Umbau ist eine Angleichung, keine
Neuanlage.

---

## Karte und Aufbau

| | Ist (*gemessen*) | Ziel |
| --- | --- | --- |
| Größe | 900 × 444 px | unverändert |
| Spalten | 340 / 464 px, Fuge 34 | unverändert |
| Radius | 16 px | **14 px** |
| Rahmen | `1px solid rgba(0, 0, 0, 0)` — keiner | **26 % Deckfarbe**, wie jedes Panel |

Der Rahmen trägt nach §1 die Zugehörigkeit. Heute trägt sie hier nichts.

---

## Kopf

Links, in der Reihenfolge des Kopf-Kanons (§2):

| Teil | Ist (*gemessen*) | Ziel |
| --- | --- | --- |
| Eyebrow | „Willkommen", `rgb(38, 198, 230)` = Hub-Cyan | Deckfarbe nach der **Schrift-Mischung** (62 %, §3) |
| Wortmarke | `.as-wordmark`, 340 × 48 px | **unverändert** — sie ist die Marke |
| Titel | 22,5 px, Verlauf, `drop-shadow(rgba(155,130,240,.18))` | **27 px**, Textfarbe, **kein Schein** |
| Unterzeile | fehlt | **neu** — siehe *Texte* |

Zwei Verläufe übereinander waren einer zu viel: die Wortmarke ist das farbige Element dieser Spalte,
der Titel steht daneben und muss nicht mit ihr konkurrieren. Das Violett im Schein ist ohnehin der
feste Fremdton, der überall sonst gefallen ist.

Die Unterzeile beantwortet die Frage, die der Bildschirm sonst offen lässt — *warum will das Spiel
jetzt meinen Namen* —, und zwar dort, wo sie entsteht. Heute steht die Antwort unter dem Feld, in der
anderen Spalte.

---

## Sprachwahl

**Das ist der härteste Befund des Bildschirms.** *Gemessen*, beide Zustände:

| gewählt | Kante „Deutsch" | Kante „English" |
| --- | --- | --- |
| English (der Standard) | `rgb(154, 154, 168)` | `rgb(44, 44, 54)` |
| Deutsch | `rgb(234, 244, 255)` | `rgb(44, 44, 54)` |

Der rechte Knopf bekommt **nie** eine Zustandskante — die Trennlinie des Segmented überschreibt sie
(`index.css:3893`). Übrig bleiben sechs Punkte Flächenunterschied (`rgb(25,25,34)` gegen
`rgb(19,19,24)`). Und weil der Standard Englisch ist, ist der Zustand **ohne** Markierung genau der,
den jeder neue Spieler zuerst sieht.

**Ziel: ein Segmented nach §4.** Zwei feste Zustände, die nie mehr werden — genau der Fall, für den
die Bauform da ist:

- inaktiv `rgba(19,19,26,.9)` / `#8a8a95`
- aktiv `rgba(32,32,44,.95)` / `#f0eefc` **plus** `inset 0 -2px 0` in der Deckfarbe
  (Flächen-Mischung 70 %, §3)
- Rahmen 1 px `#3a3a44`, Radius 8, geteilte Kontur, Feldhöhe mindestens 44 px

**Beide Signale, und sie sitzen auf der Seite, die gewählt ist** — unabhängig davon, welche der
beiden es ist. Die Unterkante allein ist zu leise, die Fläche allein erst recht.

Die Umschaltung wirkt weiterhin **sofort**: der Dialog wechselt mit, damit man das Ergebnis seiner
Wahl sieht, bevor man weiterklickt. Die Sprachnamen stehen weiterhin in ihrer eigenen Sprache.

---

## Eingabefeld und Vorschau

*Gemessen* trägt das Feld heute **drei Cyans**: Grund `#0e1b22`, Rand `#26c6e6`, Schrift `#a8ecf7`.
Cyan gehört nach §3 dem Hub und darf in Menüs nicht für Beschriftungen ausgegeben werden.

**Ziel: Feld und Vorschau sind Zeilen nach §1** — `rgba(15, 15, 21, .72)`, Rand
`rgba(150, 150, 170, .12)`. Die Deckfarbe erscheint an zwei Stellen und sonst nirgends:

- im **Schein** um das leere Feld (siehe *Der eine Schein*),
- im **Rand des gefüllten Feldes**, sobald ein Name dasteht.

Die Vorschau behält ihren Aufbau — Zeichen, Name mit „· du", Punktzahl. Das Zeichen wird gezeichnet.
Der Punktwert steht in der Rolle „an / gekauft", also `#54e08a`.

---

## Der eine Schein — benannte Ausnahme

Nach `#ruhe` leuchtet nur die Hauptaktion. Auf diesem Bildschirm leuchtet stattdessen das
**Eingabefeld**, und das bleibt so:

Der Speichern-Knopf ist beim Öffnen **tot**, bis ein Name dasteht. Das Feld *ist* die Aufgabe dieses
Bildschirms; der Knopf ist nur die Bestätigung. Ein Schein am toten Knopf wäre ein Versprechen, das
er nicht einlöst.

Es bleibt bei **einem** Schein: der Knopf bekommt keinen — auch nicht, wenn er scharf wird.

---

## Texte

**Neu, eine Zeile in beiden Katalogen** — die Unterzeile des Kopfes:

> „Er erscheint auf der globalen Bestenliste. Du kannst ihn später ändern."
> „It appears on the global leaderboard. You can change it later."

**Gekürzt**, weil die Unterzeile die Hälfte übernimmt: `name.hint` heißt heute
*„1–{max} Zeichen · erscheint im globalen Highscore. Jederzeit im Menü änderbar."* — ein Satz mit
angehängtem Mittelpunkt, der zwei Dinge sagt, von denen eines jetzt im Kopf steht. Übrig bleibt das
Maß, gefolgt vom Datenschutz-Verweis:

> „1–{max} Zeichen." + *Datenschutz*

Damit fällt auch der Anglizismus „Highscore" aus dieser Zeile; das Wort heißt an dieser Stelle
**Bestenliste**, wie überall sonst.

**Zwei Textglyphen entfallen:** `🖫` im Speichern-Knopf und `♔` in der Vorschau. Beide werden
gezeichnete SVG auf dem 16-px-Raster, in `currentColor` (§4) — eine Textglyphe hängt am
Schriftschnitt und sieht auf jeder Plattform anders aus.

Player-sichtbarer Text folgt `docs/text-style-guide.md` und `docs/localization/i18n.md`.

---

## Abgrenzung

- **Der schmale Dialog unter 1280 px** wird nicht angefasst.
- **Der „Name ändern"-Dialog** bleibt, wie er ist — das ist ein Umbenennen, kein Auftritt.
- **Die Wortmarke** wird nicht angefasst: sie zieht ihren Verlauf aus derselben Quelle wie der Hub.
- **Der Überzug** bleibt `rgba(12, 12, 16, .94)` ohne `backdrop-filter` — schon richtig.
- **Kartengröße und Spaltenaufteilung** bleiben.
- **Die Namensprüfung** — Länge, Wortliste, die Begründung am toten Knopf — ist Verhalten und wird
  hier nicht verändert. Sie bekommt nur die Farben der Sprache.
- **Kein neuer Schlüssel für die Sprachwahl**, keine dritte Sprache.

---

## Offene Punkte für den Owner

1. **Der Wortlaut der neuen Unterzeile** in beiden Sprachen.
2. **Ob `name.hint` wirklich gekürzt wird.** Der Vorschlag setzt voraus, dass die Unterzeile den
   Bestenlisten-Hinweis übernimmt. Bleibt der Hinweis lang, steht dieselbe Aussage zweimal auf
   demselben Bildschirm.
