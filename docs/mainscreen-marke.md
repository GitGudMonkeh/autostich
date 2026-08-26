# Mainscreen & Marke — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, SVG- vs. DOM-Fassung des Zeichens, i18n-Schlüssel, CSS-Ablage, Tests) bespricht
der Owner mit dem umsetzenden Worker direkt und ist **nicht** Teil dieses Dokuments.

Mockup (Zielentwurf, mit Deck-Reglern): https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8

Die tragenden Artboards:

| Artboard | Was es zeigt |
| --- | --- |
| **Marke — das Zeichen ist ein Buchstabe** | Die Wortmarke in beiden Sprachen, die Kleinfassung, die eigenständige Bildmarke |
| **Mainscreen — Buchstabe** | Der vollständige Screen bei 1600 × 900, so wie er werden soll |
| **Das Zeichen — 5 × 8** | Die Begründung des Rasters |
| **Feste Varianten I–IV** | Der Weg zur gewählten Fassung; nur als Beleg, nicht als Auftrag |
| **Deck-Probe** | Derselbe Screen in vier echten Decks, beide verworfenen Richtungen |

Bezug: die Fassung **ab 1280 px**. Die schmale Fassung ist nicht Teil dieses Entwurfs; siehe *Abgrenzung*.

**Verworfen, bewusst dokumentiert:** Die Artboards *Mainscreen — Lockup* (Zeichen neben dem Schriftzug)
und *Mainscreen — Siegel hinter dem Namen* bleiben auf dem Canvas stehen. Sie sind **nicht** umzusetzen.
Warum sie gescheitert sind, steht unten — damit niemand sie in einem halben Jahr erneut vorschlägt.

---

## Das Zeichen

Ein **5 × 8 Raster** ist kein dekoratives Muster, sondern das Brett des Spiels. Geprüft, nicht
angenommen:

- `src/game/architect.js` — `COLS = 5`, `ROWS = 8`, `N_POS = 40`
- `COLS` ist dort ausdrücklich als `= SEGMENT_SIZE` aus `formations.js` geführt
- `N_POS` ist deckungsgleich mit `TRICKS_PER_CYCLE`, also der Deckgröße

Damit sagt das Raster drei Dinge ohne ein Wort: **5 breit** = die Segmentbreite, an deren Grenze jeder
Formationslauf endet · **8 hoch** = die acht Segmente eines Durchlaufs · **40 Zellen** = ein volles Deck.

### Die drei Zellenzustände

| Zustand | Fläche | Kante |
| --- | --- | --- |
| ruhig | `rgba(255,255,255,.03)` | `rgba(255,255,255,.22)` |
| Zwischenton | Deckfarbe 28 % | Deckfarbe 66 % |
| leuchtend | Deckfarbe voll | Deckfarbe voll, dazu `0 0 8px` Deckfarbe 55 % |

Die Werte gelten für den **dunklen Screen-Grund**. Auf hellerem Grund (Panels, Werkstatt) dürfen sie
zurückgenommen werden — die erste Fassung nutzte 9 % / 16 % / 40 % und war auf dem Mainscreen
schlicht unsichtbar. Das ist der Fehler, vor dem diese Zeile warnt.

### Die gewählte Fassung: Fünferschritt

**Jede dritte Position in Lesereihenfolge** trägt den Zwischenton (`p % 3 === 0`), die beiden
gegenüberliegenden Ecken (`p = 0` und `p = 39`) leuchten. Bei fünf Spalten entstehen daraus von selbst
Diagonalen — geordnet genug, dass das Auge die Regel findet, und über das ganze Brett verteilt statt
in einer Zone geballt.

**Die Menge wird aus der Regel erzeugt, nicht abgetippt.** Eine Liste von 14 Zahlen im Code ist eine
Liste, die beim nächsten Blick niemand mehr prüfen kann.

---

## Die Wortmarke

Schnitt, Gewicht, Sperrung und Verlauf bleiben **unangetastet** — es gilt weiter die bestehende
`.as-wordmark`-Regel (Orbitron 450, `letter-spacing: .06em`, Verlauf Weiß → `--deck-a2` → `--deck-a1`
→ `--deck-a2` → Weiß, Deckfarben-Schein). Geändert wird genau eine Sache:

**Das I trägt keinen Glyph mehr, sondern eine Spalte aus acht Zellen.**

Damit gibt es keine zweite Form, die sich neben dem Schriftzug behaupten muss — Zeichen und Name sind
dieselbe Sache. Das ist der Kern des Entwurfs.

### Warum das I

**`AUTOSTICH` und `AUTOTRICK` haben beide neun Zeichen und tragen das I an siebter Stelle.** Eine
Fassung deckt beide Sprachen an derselben Position ab; es braucht keine zweite Zeichnung und keine
Sonderregel je Locale.

> Nebenbefund: Der Kommentar an `.hub-play .as-wordmark` in `index.css` nennt für die deutsche Marke
> *„zehn Zeichen"* und misst den 52-px-Deckel der Handy-Fassung dagegen. Es sind neun. Der Deckel ist
> damit gegen eine falsche Annahme gemessen — nicht dramatisch, aber beim Anfassen mitkorrigieren.

### Maße

Alle Maße der Spalte stehen **in `em`**, damit sie mit `--wm-size` mitwächst und beim nächsten
Größenwechsel nichts nachjustiert werden muss.

| | Wert |
| --- | --- |
| Zelle | `.09em` × `.09em` |
| Radius | `.014em` |
| Kante | `.012em` |
| Fuge zwischen den Zellen | `.022em` |
| Abstand links / rechts | `.02em` / `.085em` |

Ergibt eine Spalte von `.874em` Höhe. Die Versalhöhe von Orbitron liegt bei rund `.7em` — die Spalte
überschreitet die Zeile also oben und unten leicht. ~~**Das ist Absicht:** der Buchstabe bricht die
Versallinie und wird dadurch als Zeichen lesbar statt als verunglücktes I.~~

> **Überholt — Owner-Entscheidung vom 26.08.2026 am gebauten Screen (Q11).** Die Spalte schließt oben
> und unten **bündig** mit den Buchstaben ab. Zwei Zahlen dieses Abschnitts sind damit ersetzt und eine
> ist korrigiert:
>
> - Die Versalhöhe ist **`.71875em`**, nicht „rund .7em" — gemessen an der Schrift, ab 352 px
>   Schriftgrad konvergiert und für **jede** Versalie identisch: Orbitron zieht auch seine runden
>   Formen flach, es gibt also keinen Überschuss.
> - Die Spalte ist damit **`.71875em`** hoch statt `.874em`.
> - Die Maßtabelle darüber gilt **als Verhältnis weiter**: die ganze Spalte skaliert um einen Faktor
>   (`.71875 / .874 = .8224`), Zelle und Fuge behalten also ihr Verhältnis zueinander. Nur so bleibt
>   der Buchstabe ein *Ausschnitt* des Zeichens und wird nicht zu einer zweiten Zeichnung mit eigenem
>   Rhythmus. Gemessen ergibt das Zelle `.074em` und Fuge `.0181em`.
> - **Über die Fugen allein ging es nicht**, und das ist der Grund für die Skalierung: acht Zellen zu
>   `.09em` sind `.72em` und damit bereits höher als die Versalie — die Fuge müsste negativ werden.
>
> Nachweis: `docs/workstreams/mainscreen-branding/measurements/C5.md`, Belege in `evidence/C5/`.

### Welche Zellen leuchten

Dieselbe Fünferschritt-Regel, auf eine einzelne Spalte angewandt: **jedes dritte Segment leuchtet**,
also 1, 4 und 7 von acht. Der Buchstabe ist damit kein neues Muster, sondern ein Ausschnitt des
Zeichens.

> **Ergänzt — Owner-Entscheidung vom 26.08.2026 (Q11).** Die **fünf übrigen** Zellen der Spalte tragen
> den **Zwischenton** der Zustandstabelle (Deckfarbe 28 % Fläche, 66 % Kante) statt des ruhigen Weiß
> bei 3 %. Das ist kein neuer Wert, sondern ein anderer aus derselben Tabelle — und es ist die Regel
> dieses Abschnitts auf ihren eigenen Fall angewandt: die drei Zustände gelten für den **dunklen
> Screen-Grund**, und der Grund der Spalte ist kein Screen, sondern eine Reihe massiver 88-px-Buchstaben.
> Dort geht der Schritt nach oben statt zurück.
>
> **Nur in der Spalte.** Die eigenständige Bildmarke steht auf dem Screen-Grund, für den die Tabelle
> kalibriert ist, und behält ihren ruhigen Zustand.

### Kleinfassung

Unter etwa **40 px** fallen die acht Zellen zusammen. Die Antwort ist **kein Sondersatz**, sondern ein
**Rückfall auf den normalen Glyph** — dieselbe Marke, nur ohne Zellen. Betrifft den Run-Kopf
(`.as-wordmark-sm`, 22 px) und den Namens-Dialog.

### Eigenständige Bildmarke

Das **volle 5 × 8 im Fünferschritt** bleibt als Bildmarke bestehen, für alles, wo kein Schriftzug
hinpasst: App-Icon, Favicon, Discord-Avatar, Ladebild. Ein Zeichen, zwei Zuschnitte — die Spalte im
Namen, das ganze Brett als Marke.

---

## Tagline

| Sprache | Text |
| --- | --- |
| Deutsch | **Legen. Stechen. Eskalieren.** |
| Englisch | **Order. Trick. Escalate** |

Steht unter der Wortmarke, `15px`, Sperrung `.05em`, in `#9a9aa6`; die Punkte zwischen den Wörtern
gedämpft in `#5c5c68`. Neuer Text — gehört in beide Katalog-Dateien.

---

## Kopfzone

**Zentriert**, nicht linksbündig. Das weicht von `.hub-play { align-items: flex-start }` ab, und zwar
begründet: *jeder* Block darunter — Bonusleiste, beide Knöpfe, Seed-Zeile, Rangliste — läuft über die
volle Spaltenbreite. Es gibt also keine linke Textachse, gegen die eine zentrierte Marke verstoßen
könnte; sie sitzt als Titel über ihrem Block.

Die Wortmarke behält auf dem Desktop ihre vollen **88 px**.

**Nicht** in die Kopfzone zurückgeholt wird der Versions-/Build-Stempel. Er ist am 16.08.2026 bewusst
in den Fuß gewandert (`#kopf`), weil er ein Build-Stempel ist und keine Überschrift.

---

## Aufbau des Screens

Der bestehende Aufbau aus `StartScreen.jsx` bleibt — **das hier ist eine neue Schicht, kein Umbau.**
Spaltenpaar wie gehabt: `.hub-pair` mit `700fr 740fr`, 80 px Fuge, auf 1520 px gedeckelt.

### Links (`hub-play`, 700 px)

1. Wortmarke + Tagline, zentriert
2. Bonus-/Onboarding-Leiste
3. **„Lauf fortsetzen"** — gefüllt in der Deckfarbe, mit Untertitel „Durchlauf {cycle}/{total} · Score {score}"
4. **„Lauf beginnen"** — daneben zur Umrissform zurückgenommen
5. Seed-Zeile
6. Rangliste mit Wochen-Chip

Punkt 3 und 4 folgen der Regel, die im Code schon steht: ein gespeicherter Lauf ist die **einzige**
gefüllte Primäraktion, „Lauf beginnen" tritt dann zurück. Ohne gespeicherten Lauf ist es umgekehrt.

Die Spalte hat mit beiden Knöpfen rund **180 px Luft** — der Platz ist für das Erstkontakt-Angebot
(Tutorial) reserviert, das im Code über der Play-Gruppe sitzt.

### Rechts (`hub-stand`, 740 px)

**Die Deck-Tafel wird der Gegenstand des Screens** — das ist der eigentliche Marken-Zug neben der
Wortmarke. Sie wächst vom heutigen 112-px-Bild auf ein **196 × 268 px** gerahmtes Feld und nimmt die
vier Kennzahlen in sich auf.

Inhalt der Tafel, von oben:

- Eyebrow „Dein Stand"
- Deck-Artwork, gerahmt, mit Ecken
- Deckname und Stufe: „Hirsch — Erwacht", darunter drei Fortschritts-Pips und „Stufe II von III"
  — **die Stufenzeile entfällt bei Decks ohne Stufen**, sie wird nicht leer gezeigt
- `EFFEKTE` — die ausgerüsteten Global-FX als Chips
- `MUSIK` — laufendes Stück mit Wiedergabe-Zeichen
- `SPIELFELD` — **nur wenn das Spielfeld nicht zum Deck gehört**, wie heute schon
- darunter, durch eine Linie getrennt: die vier Kennzahlen (Stichpunkte · Deck-Punkte · Woche · Letzter Lauf)

Darunter die vier Verwaltungseinträge als **Listenzeilen** statt als 2 × 2 Kachelgrid: Zeichen,
Titel, Untertitel, rechts der Wert oder ein Zustands-Chip, dann ein Chevron.

### Fuß

Unverändert in der Struktur: Optionen · Tutorial · Feedback als Chips links, „Angemeldet als … ·
Name ändern · Datenschutz" mittig, Versionsstempel rechts.

---

## Was die Deck-Tafel **nicht** zeigt

Der Vorlagen-Entwurf trug dort eine Zeile **„BUILD DNA"** mit vier Feldern (Formation · Engine ·
Element · Effect). Die ist **gestrichen**, und zwar nicht aus Geschmack:

- „Formation: Midline" ist keiner der vier realen Formationstypen (Wiederholung · Farbblock · Treppe · Wechsel)
- vor allem entsteht der Build **im Lauf** durch Perks, Skills und Aufstellung — nicht am Deck

Eine Zeile, die dem Deck eine feste Build-Identität zuschreibt, führt den Spieler in die Irre. Der
Platz wird stattdessen mit dem gefüllt, was das Deck wirklich trägt: Stufe, Effekte, Musik, Spielfeld.

---

## Deckfarbe

Der Screen zieht durchgehend die aktive Deckfarbe, wie heute schon ab 1280 px. Sie sitzt an
**sieben** Stellen gleichzeitig: Wortmarken-Verlauf, Zellen im I, Fortsetzen-Knopf, Umriss von „Lauf
beginnen", Tönung und Rahmen der Deck-Tafel, Wochen-Chip, Horizont am unteren Rand.

Panel-Tönung nach dem Rezept der Hub-Kacheln (`.as-hub-tile`), aber zurückgenommen: **9 % oben, 5 %
unten**, Rahmen **26 %**. Die Zeilen in den Panels bleiben neutral.

### Offener Punkt: Helligkeit der Deckfarbe

Am Deck-Probe-Artboard sichtbar und **noch nicht gelöst**: die 52 Deck-Looks in `themes.js` schwanken
stark in der Helligkeit.

- **Obsidian** (`#e8edf5`) und **Ascension** (`#e6b93a`) machen den Fortsetzen-Knopf fast weiß — er
  verliert seine Rolle als einziges lautes Element
- **Thron I** (`#8f0f2a`) ist so dunkel, dass derselbe Knopf kaum aus der Fläche tritt

Beides deutet darauf hin, dass die Deckfarbe am Knopf nicht roh durchgereicht, sondern auf eine
Ziel-Helligkeit gezogen werden sollte — dasselbe Mittel, mit dem `.as-hub-glyph` die Schwankung schon
abfängt (dort: 62 % Deckfarbe auf Weiß). **Die Entscheidung fällt am gebauten Screen, nicht am
Mockup.**

Zweiter Beobachtungspunkt: **Genesis** (`#26c6e6` / `#ff2ec8`) hat den größten Abstand zwischen erster
und zweiter Deckfarbe. Wortmarke und Fortschrittsbalken laufen dort sichtbar durch zwei Farben statt
durch eine Tönung. Ob das Absicht ist, ist zu entscheiden.

---

## Verworfene Richtungen

Beide sind gebaut und liegen auf dem Canvas. **Nicht umsetzen.**

**Lockup** — Zeichen links neben dem Schriftzug. Ein 5 : 8 Hochformat und eine breite, flache
Wortmarke sind zwei gegenläufige Silhouetten; sie stehen nebeneinander, ohne sich zu stützen. Dazu
kam ein harter Preis: in einer 700-px-Spalte passt „AUTOSTICH" bei 88 px nicht neben das Zeichen
(rund 687 px Schrift plus Zeichen plus Fuge), die Marke musste auf 72 px schrumpfen.

**Monolith / Siegel** — Zeichen groß und leise als Fläche hinter der Kopfzone. Es konkurriert mit dem
Spielfeld-Bodenband um dieselbe Zone; zwei große weiche Flächen übereinander sind eine zu viel. Die
zurückgebaute Fassung (klein, nur hinter dem Namen) löst das, war aber gegenüber dem Buchstaben immer
noch die schwächere Antwort: eine Fläche bei 22 % Deckkraft erklärt sich nie von selbst, und man hat
weiterhin keine Bildmarke, die für sich steht.

---

## Abgrenzung

Nicht Teil dieses Auftrags:

- Die **schmale Fassung** unter 1280 px. Die Zellen-Spalte im I gilt dort erst ab etwa 40 px
  Schriftgröße; darunter der normale Glyph.
- **Das Deck-Artwork und das Spielfeld-Bodenband.** Im Mockup bewusst Platzhalter — beides existiert
  im Build und wird nicht nachgemalt.
- **Die Ziel-Helligkeit der Deckfarbe** (siehe oben) — offener Punkt, keine Vorgabe.
- Jede Änderung an Gameplay, Fraktionen oder Spielfeld.
- Die technische Umsetzung insgesamt. Das bespricht der Owner mit dem Worker.

---

## Offene Punkte für den Owner

1. **Ziel-Helligkeit der Deckfarbe** am Fortsetzen-Knopf über alle 52 Deck-Looks.
2. Ob der **Zwei-Farben-Verlauf** bei Decks wie Genesis so bleiben soll.
3. Ob die drei Effekt-Namen ohne deutschen Eintrag (`Cube Matrix`, `Edge Glow`, `Sun Pulse` — nur
   `Klinge` hat einen unter `fxsyn.klinge.name`) deutsche Namen bekommen oder bewusst englisch bleiben.
4. Ob das **Erstkontakt-Tutorial-Angebot** in der reservierten Luft der linken Spalte bleibt oder eine
   andere Form bekommt.
