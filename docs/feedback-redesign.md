# Feedback-Melder — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
bespricht der Owner mit dem umsetzenden Worker direkt und ist **nicht** Teil dieses Dokuments.

Mockup (Zielentwurf, mit Zustands- und Deck-Reglern):
https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 — Artboard
**„Feedback — im Optionen-Schnitt"**.

Bezug: die Fassung **ab 1280 px** (`FeedbackModal.jsx`, `.fb-*` in `index.css`). Die schmale Fassung
ist nicht Teil dieses Entwurfs; siehe *Abgrenzung*.

> **Vorher lesen: `docs/optionen-redesign.md`.** Der Melder erbt dessen Bildsprache vollständig — die
> Komponenten-Maße (Schalter, Segmented, Zeilen, Zeichenkacheln) stehen dort und werden hier **nicht
> wiederholt**. Dieses Dokument beschreibt nur, was am Melder anders wird.

---

## Ausgangsproblem

Der Melder funktioniert, spricht aber eine eigene Sprache — obwohl er aus demselben Fußband kommt wie
die Optionen und dasselbe tut: ein Overlay über dem Hub, in dem man etwas einstellt und wieder geht.

1. **Der Kopf ist anders gebaut.** Der Schließen-Knopf sitzt in einer eigenen `ActionBar` über dem
   Titel, der Titel selbst ist zentriert, die Auskunftszeile steht in einer eigenen Rasterspalte
   hinter einem senkrechten Strich. Die Optionen haben dafür längst eine Form: Eyebrow, Titel,
   Auskunft als Unterzeile, Schließen rechts daneben.
2. **Vier Bedienelemente, vier Bauarten.** Die Art-Auswahl sind Pillen mit linker Farbkante
   (`as-edge` + `as-edge-thin`), der Lauf-Bezug eine native Checkbox, die Felder haben eigene
   Flächenwerte (`#0f0f14` / `#33333e`), die Zeichen sind Textglyphen (`✕ ☁ ➤ ⓘ ⊘`).
3. **Die vier Meldungen sind vier Einzelfälle.** Danke, Entwurf nachgesendet, Sendefehler und
   „nicht konfiguriert" tragen unterschiedliche Polsterungen und Schriftgrößen, obwohl sie dasselbe
   sind: eine Zeile Rückmeldung.
4. **Der „kein Lauf"-Fall ist ein Sonderfall statt eines Zustands.** Die Checkbox ist `disabled`, die
   Zeile sieht aber aus wie jede andere — man liest erst am Text, dass hier nichts geht.

---

## Zielstruktur

### Die Karte verschwindet

Der wichtigste Zug, und derselbe wie im Optionen-Screen ab 1280 px: **keine Karte mehr.** Der
Überzug trennt vom Spiel, Fläche und Rahmen tragen die **Sektions-Panels**. Damit liest sich der
Melder als derselbe Screen-Typ statt als eigenes Fenster.

- Überzug: `rgba(12,12,16,.94)`, kein `backdrop-filter` (gleiche Begründung wie `#perf-blur` an
  `.op-root` / `.up-root`)
- Raster: 1080 px breit, mittig — die bestehende Breite aus `.fb-card` bleibt
- Zwei Panels nebeneinander: `minmax(0,1fr) 400px`, Fuge 26 px — ebenfalls die bestehenden Werte
- Panel-Rezept aus den Optionen: **9 % oben, 5 % unten** Deck-Tönung, Rahmen **26 %**, Radius 14

### Kopf

Wie im Optionen-Screen: Eyebrow „Playtest" in der Deckfarbe · Titel „Feedback senden" ·
Auskunftszeile als **Unterzeile darunter** · Schließen-Knopf rechts (`as-edge-neutral`, 4-px-Kante
links). Darunter die Haarlinie in der Deckfarbe **a1 → a2 → a1**.

Die `ActionBar` entfällt hier ersatzlos. Sie ist eine Leiste für Panels mit mehreren Aktionen; ein
einzelner Schließen-Knopf braucht keine.

### Panel links — „Deine Meldung"

| Feld | Form |
| --- | --- |
| `ART` | **Eine** Segmented-Variante über die volle Panelbreite: Bug · Idee · Balance · Sonstiges. 44 px hoch, aktiv = hellerer Grund **und** 2-px-Unterkante in der Deckfarbe |
| `WAS IST PASSIERT?` | Textfeld, 268 px hoch (bestehender Wert), Zeichenzähler rechts neben dem Label |
| Hinweis | „Je mehr Details, desto schneller können wir helfen." mit gezeichnetem Info-Zeichen |

### Panel rechts — „Absenden"

| Feld | Form |
| --- | --- |
| `NAME` | Einzeiliges Feld, gleiche Fläche wie alle Zeilen |
| Lauf-Bezug | **Options-Zeile**: 28-px-Zeichenkachel mit Zustandsfarbe, Titel, Beschreibung, **ein Schalter** statt Checkbox |
| Absenden | Gefüllte Deck-Taste im Schnitt von „Lauf fortsetzen" auf dem Mainscreen, nur kleiner. Inaktiv: flache Zeilenfläche, `#6c6c7e`, `cursor: not-allowed` |
| Hinweis | „Noch mindestens {n} Zeichen." mittig unter dem Knopf |

### Feldflächen

Alle Eingabefelder übernehmen die **Zeilenfläche** der Optionen: `rgba(15,15,21,.72)` mit
`1px solid rgba(150,150,170,.12)`, Radius 8, Polsterung 11/13. Die bisherigen Sonderwerte
(`#0f0f14` / `#33333e`) entfallen.

### Feld-Beschriftungen

`10px` Geist Mono, Sperrung `.14em`, Versalien, `#5c5c68` — dieselbe Beschriftung wie die
Attributzeilen der Deck-Tafel. Ersetzt `text-meta-3 uppercase tracking-wide opacity-55`.

### Zeichen

Gezeichnete SVG im 16-px-Raster, eine Strichstärke, `currentColor` — keine Textglyphen mehr.
Betrifft `✕` (Schließen), `☁` (Lauf-Bezug), `➤` (Absenden), `ⓘ` (Detail-Hinweis) und `⊘` (zu kurz).
Begründung wie im Optionen-Auftrag: eine Textglyphe hängt am Schriftschnitt und sieht je nach
Rückfall-Schrift anders aus.

---

## Zustände

### Lauf-Bezug

| Zustand | Bild |
| --- | --- |
| Lauf vorhanden | Zeichenkachel grün (`#5ab87a`), Schalter an, Titel nennt Seed und Durchlauf |
| Kein Lauf | Zeile auf **42 % Deckkraft**, Zeichenkachel stumm (`#3a3a48`), Schalter gesperrt und nicht fokussierbar, Titel „Kein Lauf zum Anhängen gefunden" |

Das ist exakt der Sperr-Zustand aus dem Optionen-Kanon — kein Sonderfall, sondern dieselbe Regel.
Wichtig: **gesperrt heißt auch per Tastatur gesperrt**, nicht nur optisch.

### Die vier Meldungen

Gleiche Maße, gleicher Schnitt, gleiche Polsterung — nur die Farbrolle unterscheidet sie. Jede trägt
ein gezeichnetes Zeichen links.

| Meldung | Rolle |
| --- | --- |
| „Danke — ist angekommen." | grün |
| „Dein zuletzt hängengebliebener Report ist jetzt rausgegangen." | grün |
| Sendefehler | rot |
| „Melder ist in diesem Build nicht konfiguriert" | amber |

**Der Danke-Zustand sitzt in derselben Rasterzelle wie das Formular.** Das steht heute schon so im
Code und ist zu erhalten: sonst springt der Screen in dem Moment, in dem die Bestätigung das Formular
ersetzt.

---

## Texte

**Es kommt kein einziger neuer Text dazu.** Alle Zeichenketten existieren bereits unter
`feedback.*` in beiden Katalogen; der Schließen-Knopf nutzt `common.close`. Dieser Auftrag ist rein
gestalterisch — an `de.js` und `en.js` ist nichts zu tun.

---

## Abgrenzung

Nicht Teil dieses Auftrags:

- Die **schmale Fassung** unter 1280 px. Die Komponenten-Maße gelten dort, sobald sie angefasst wird
  — insbesondere die 44-px-Regel.
- **Der Honeypot.** Er bleibt unsichtbar außerhalb des Bildausschnitts und wird nicht gestaltet.
- **Rate-Limit, Entwurfs-Speicherung, Versandweg.** Verhalten, nicht Gestaltung — unverändert.
- Die technische Umsetzung insgesamt.

---

## Offene Punkte für den Owner

1. Ob der Melder zusätzlich die **Deck-Tönung der Panels** tragen soll (im Mockup: ja, 9/5 %) oder
   ob ein Fehler-Melder bewusst neutral bleiben sollte.
2. Ob der Zeichenzähler wie heute ab `MAX_LEN − 100` auf Amber wechselt — im Mockup ist nur der
   Ruhezustand gezeigt.
