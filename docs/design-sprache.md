# Design-Sprache — Overlays und Menüs (Desktop, ab 1280 px)

**Status: lebendes Dokument.** Es ist die Quelle der Wahrheit für die Bildsprache aller Menü-Overlays
und wird bei jedem Screen fortgeschrieben, den wir uns vornehmen. Wer einen Screen anfasst, liest
zuerst hier — und trägt hier nach, was er entschieden hat.

Es beschreibt **nur Gestaltung**, keine Mechanik und keine Umsetzung. Technische Fragen
(Komponenten-Schnitt, wo das CSS liegt, Tests) bespricht der Owner mit dem umsetzenden Worker.

Zugehörige Aufträge, die auf diesem Dokument aufsetzen:

| Screen | Auftrag |
| --- | --- |
| Optionen | `docs/optionen-redesign.md` |
| Feedback-Melder | `docs/feedback-redesign.md` |
| Mainscreen & Marke | `docs/mainscreen-marke.md` |
| Upgrade-Baum | alle vier Schritte entschieden: Kopf & Legende, Allgemein-Seite, Fraktionsseite, Legendär-Phase |

Mockups: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 (Marke, Mainscreen,
Melder, Baum) und https://claude.ai/code/artifact/c8328e42-db0b-411f-b26e-ec72a60a17ec (Optionen).

**Bezug ist durchgehend die Desktop-Fassung ab 1280 px.** Die schmale Fassung ist nicht Gegenstand
dieses Dokuments; wo sie angefasst wird, gelten die Komponenten-Maße aber ebenfalls.

---

## 1. Fundament

### Die Karte verschwindet

Ein Overlay ist **keine Karte auf dem Hub**, sondern ein Screen. Der Überzug trennt vom Spiel,
**Fläche und Rahmen tragen die Sektions-Panels**. Die äußere Karte ist nur noch das Raster.

- Überzug: `rgba(12, 12, 16, .94)`
- **Kein `backdrop-filter`.** Begründung und Messung stehen an `.up-root` (`#perf-blur`): er war der
  teuerste Posten des Desktop-Passes und optisch bei 94 % Überzug nicht auffindbar.

### Panel

Das Panel ist die Fläche, auf der alles steht. Es zieht die aktive **Deckfarbe** in die Fläche, nach
dem Rezept der Hub-Kacheln (`.as-hub-tile`), aber zurückgenommen:

```
border-radius: 14px;
padding: 16px 18px 18px;
border: 1px solid color-mix(in srgb, var(--deck-a1) 26%, #2b2a36);
background: linear-gradient(180deg,
  color-mix(in srgb, var(--deck-a1) 5%, rgba(27,26,36,.93)) 0%,
  color-mix(in srgb, var(--deck-a1) 1%, rgba(22,22,32,.95)) 100%);
```

**5 % oben, 1 % unten.** Der Ton soll erkennbar sein, nicht gelesen werden: man merkt beim Deckwechsel,
dass sich etwas geändert hat, ohne dass die Fläche eine Farbe *hat*. Den Hauptteil der Zugehörigkeit
trägt der **Rahmen** (26 %), nicht die Fläche.

Der Wert kam über drei Runden zustande: 13 / 7 % ist das Rezept der Hub-Kacheln (`.as-hub-tile`) und
auf großen Panels deutlich zu viel; 9 / 5 % war ein Zwischenschritt und wirkte auf flächenreichen
Screens wie dem Upgrade-Baum immer noch zu kräftig. **Mehr Tönung heißt linear mehr Deck-Gefühl und
weniger Textkontrast** — bei hellen Decks (Ascension `#e6b93a`, Obsidian `#e8edf5`) fällt beides
zuerst auf, dort wird geprüft.

### Kein Panel im Panel

Ein getöntes Panel enthält **keine zweite gerahmte Fläche**. Wo ein Bereich innerhalb eines Panels
abgesetzt werden muss (Auswertungskasten, Zusammenfassung), trennt ihn eine **Linie nach oben**
(`1px solid rgba(150,150,170,.14)`) — kein eigener Rahmen, kein eigener Radius, keine eigene Fläche.

Der Grund ist im Vergleich Optionen ↔ Upgrade-Baum sichtbar geworden: bei gleichen Werten wirkte der
Baum kräftiger, weil er zwei Tönungsebenen übereinander legte. Eine Ebene reicht.

**Damit endet jede Seite gleich:** ein abschließender Bereich — Auswertung, Zusammenfassung, ein
Verweis — hängt als Sektion mit Trennlinie am Fuß des Panels, nicht als Kasten darin.

**Und in dieser Reihenfolge**, von innen nach außen:

1. der Inhalt der Seite,
2. was zum angetippten Element gehört (die Detailzeile) — sie steht direkt bei dem, was sie erklärt,
3. die Abschluss-Sektion der Seite (Auswertung, Challenge),
4. die Zeichenerklärung.

Der Grund ist die Blickrichtung: Punkt 2 gehört zu einem einzelnen Element und muss neben ihm stehen;
Punkt 3 gilt für die ganze Seite und darf ans Ende; Punkt 4 gilt für den ganzen Screen. Wer die
Reihenfolge tauscht, schiebt die Erklärung eines Knotens hinter die Zusammenfassung der Seite — genau
der Fehler, den `UpgradeScreen.jsx:576` heute macht. Zwei Fälle im
Baum: der Auswirkungs-Kasten der Allgemein-Seite und die Challenge der Fraktionsseite
(`.up-impact`, `.up-chall` — beide heute mit eigener Fläche `#12121a` und eigenem Rahmen).

### Sektions-Überschrift

```
font-size: 12.5px; font-weight: 600;
text-transform: uppercase; letter-spacing: .18em;
color: var(--deck-a1);
padding-bottom: 13px;
```

### Zeile

Alles, was **in** einem Panel steht — Optionszeilen, Eingabefelder, Listenzeilen —, bleibt
**neutral**. So liest sich die Tönung als Fläche, und der Text sitzt auf ruhigem Grund.

```
padding: 11px 13px; border-radius: 8px; gap: 13px;
background: rgba(15, 15, 21, .72);
border: 1px solid rgba(150, 150, 170, .12);
```

- Titel: `13.5px / 600 / #e8e8ea`
- Beschreibung: `12px / line-height 1.38 / #8a8a95`, `margin-top: 2px`

**Eine Farbkante an einer Zeile muss etwas unterscheiden.** Tragen alle Zeilen einer Liste dieselbe
Kante, unterscheidet sie nichts und summiert nur zu einer Farbwolke — die Beobachtung, aus der
`#kante-anlauf` entstanden ist. Fundstelle: die 17 Fähigkeiten der Fraktionsseite tragen alle die
Kante ihrer Fraktion, auf einer Seite, die nur diese Fraktion zeigt (`index.css:2571`). Dort bleiben
die 17 neutral, und die vier legendären behalten ihre goldene Kante — damit sagt Gold auf der Seite
wieder etwas.

### Haarlinie

Unter dem Kopf, über die volle Breite: `linear-gradient(90deg, a1, a2, a1)`, Deckkraft `.85`,
**Höhe 2 px, überall.**

Der Wert ist nicht beliebig: die Strichstärken dieser Sprache sind eine Leiter mit vier Sprossen, und
jede Sprosse ist belegt.

| Stärke | Bedeutung |
| --- | --- |
| 1 px | neutrale Trennlinie (`rgba(150,150,170,.14)`) — trennt, ohne zu betonen |
| **2 px** | **die Haarlinie in der Deckfarbe** — trennt und sagt, wo man ist |
| 3 px | Kante einer Zweitaktion |
| 4 px | Kante der Hauptsache — Schließen, aktive Zeile, gewählter Knoten |

3 px war für die Haarlinie schon vergeben. Und auf einem 1200 px breiten Panel wird aus einer 3-px-Linie
ein Balken: sie soll den Kopf absetzen, nicht ihn unterstreichen.

---

## 2. Kopf-Kanon

Gilt für **alle** Overlays. Der Grund ist einfach: sie gehören zu einem Spiel, und der Ausgang muss
überall an derselben Stelle liegen.

### Raster

```
auto · [screen-eigene Zonen] · 1fr · auto
align-items: start;      ← der Kern
column-gap: 26px;
```

**`align-items: start`, nicht `center`.** Dadurch sitzt die Aktionszone immer am selben Punkt unter
der Oberkante — egal wie hoch der Titelblock daneben ist. Zentriert man gegen einen unterschiedlich
hohen Block, landet der Knopf in jedem Screen woanders; genau daher kam der Versatz.

### Zone 1 — Titelblock

Immer in dieser Reihenfolge:

| Teil | Stil |
| --- | --- |
| Eyebrow | `12px / 500 / uppercase / letter-spacing .1em`, Deckfarbe |
| Titel | `27px / 600 / letter-spacing -.01em` |
| Unterzeile | `13px / line-height 1.45 / #8a8a95` — beantwortet die Frage, die der Screen sonst offen lässt |

### Letzte Zone — Aktionen

**Schließen ist immer das letzte Element.** Zweitaktionen stehen links davon, screen-eigene Zonen
(Währung, Fortschritt) weiter links. **Nichts steht je rechts von Schließen.**

Eine Bauart, eine Größe — ersetzt die drei heutigen Fassungen:

```
font: 600 15px Geist; padding: 11px 18px; border-radius: 8px; min-height: 44px;
background: rgba(12, 12, 18, .5);
border: 1px solid rgba(150, 150, 170, .18);
border-left: 4px solid rgba(150, 150, 170, .35);
color: #d5d5df;
```

Gezeichnetes ✕ vor dem Wort. Zweitaktionen tragen dieselbe Größe, aber eine 3-px-Kante.

### Ablesungen im Kopf

Währung und Fortschritt stehen als **benannte Ablesung**, nicht als nackte Zahl am Titel:
Beschriftung darüber, Wert darunter. Die **Farbe der Währung bleibt screen-eigen** (SP gold, DP
cyan) — sie kodiert, welche Währung gemeint ist.

---

## 3. Farbrollen

Das ist die wichtigste Seite dieses Dokuments. Eine Farbe, eine Rolle.

| Rolle | Farbe | Gilt für |
| --- | --- | --- |
| **Struktur / Chrome** | **die Deckfarbe** `var(--deck-a1)` | Eyebrows, Sektions-Überschriften, Lane-Überschriften, Haarlinie, Aktiv-Kante der Auswahl, Regler-Füllung, Haken im Dropdown, Panel-Tönung |
| **Kaufbar / Währung** | Gold | Preisschilder, Kaufen-Knopf, SP-Guthaben |
| **An / gekauft** | Grün `#54e08a` | Schalter „an", gekaufte Knoten, Zeichenkachel einer aktiven Zeile |
| **Gesperrt** | Grau `#8a8a95` / `#3a3a48` | Zeichen und Marken gesperrter Zeilen |
| **Inhalt** | Raritätstöne (`tierColor`), Fraktionsfarben (`FACTION_GLOW`) | nur dort, wo die Farbe **das Gemeinte ist** — eine blaue Rarität, eine Fraktions-Identität |

**Grundsatz: Struktur ist immer die Deckfarbe.** Feste Fremdtöne für Struktur gibt es nicht mehr.
Das folgt der Regel, die `genAccentMobile()` in `UpgradeScreen.jsx` bereits für die Handy-Fassung
anwendet — mit dem Kommentar *„Struktur, kein Spiel-Signal"*. Der Desktop zieht nach.

**Cyan `#26c6e6` gehört dem Hub.** Laut `#ruhe` ist es dort die Handlungsfarbe und die einzige auf
voller Sättigung. Es darf in Menüs nicht für Beschriftungen ausgegeben werden.

**Das Grün der Rolle ist `#54e08a`, nicht `#5ab87a`.** Dieses Dokument hat zuerst den falschen Ton
genannt. `#5ab87a` ist im Code dreifach als **Inhalt** belegt — Fraktion Pflanze
(`FactionIcon.jsx:34`, `skills.js:287`, `glossary.js:43`), die Kartenfarbe „Grün"
(`constants.js:717`) und eine Perk-Kategorie (`perks.js:50`). Eine Farbe, eine Rolle: dieser Ton hat
schon drei, und keine davon ist „Zustand". Auf der Pflanzen-Seite des Baums fielen Rollenfarbe und
Fraktions-Identität deshalb zusammen.

`#54e08a` **ist** die Zustandsfarbe, schon heute und dreimal: `STATE_ON` „ausgerüstet / läuft
gerade" (`CustomizeScreen.jsx:71`), `GRUEN` „gekauft" (`UpgradeScreen.jsx:35`) und das Häkchen im
Melder (`FeedbackModal.jsx:139`). Der hellere, sattere Ton sitzt zudem **über** den Pigmenttönen
statt zwischen ihnen — genau das, was ein Zustandslicht tun soll.

Dazu, damit es nicht wieder abgeleitet wird: das **Aktiv-Abzeichen** der Werkstatt ist
Fläche `#123a25` · Schrift `#54e08a` · Rand `#2f7a4f` (`CustomizeScreen.jsx:1430`).

**Zwei Goldtöne, klar getrennt:** Währung `#d6ab6b`, kaufbare Kante `#d4a63a`. Ein dritter Ton
(`#f2a83a` mit Schein, heute im Baum-Kopf) entfällt.

### Ziel-Helligkeit der Deckfarbe

Wenn Struktur immer die Deckfarbe ist, hängt die Lesbarkeit der Menüs an einer Farbe, die der Spieler
aussucht. **Gemessen über alle 42 Decks mit eigenem Akzent**, Kontrast von `a1` gegen den Zeilengrund
`#16161f`:

| | Spanne | darunter |
| --- | --- | --- |
| ungemischt | **1,94 : 1** (Thron `#8f0f2a`) bis **15,31 : 1** (Origami `#f4ecdd`) — Faktor 7,9 | 3 Decks unter 4,5 : 1, davon 2 unter 3 : 1 |

Dieselbe Regel, dasselbe Panel, und einmal steht der Text da und einmal nicht. **Das Mittel ist eine
Mischung auf Weiß**, wie `.as-hub-glyph` sie schon benutzt. Es sind zwei Werte, weil es zwei Aufgaben
gibt:

| Rolle | Mischung | Ergebnis über alle 42 Decks |
| --- | --- | --- |
| **Deckfarbe als Schrift** — Eyebrows, Sektions- und Lane-Überschriften | `color-mix(in srgb, var(--deck-a1) 62%, #ffffff)` | schlechtestes Deck **4,65 : 1**, alle 42 über 4,5 |
| **Deckfarbe als Fläche oder Kante** — Haarlinie, Aktiv-Kante, Regler-Füllung, Haken im Dropdown | `color-mix(in srgb, var(--deck-a1) 70%, #ffffff)` | schlechtestes Deck **3,80 : 1**, alle 42 über 3 |

4,5 für Schrift, 3 für alles, was man nur sehen und nicht lesen muss — zwei Zahlen für zwei
Aufgaben, nicht zwei Zahlen aus Geschmack. Die 62 % sind kein übernommener Wert: es ist genau die
Mischung, bei der das dunkelste Deck über 4,5 : 1 kommt.

**Nicht gemischt wird die Tönung**: die 5 / 1 % der Panel-Fläche und die 26 % des Rahmens bleiben, wie
sie sind. Sie sollen nicht gelesen werden, sie sind die Zugehörigkeit — und sie sind selbst schon
Mischungen.

Der Rahmen ist dabei ausdrücklich geprüft worden, nicht bloß ausgelassen. *Gemessen* über alle 42
Decks, Rahmen gegen die Panelfläche: **1,25 : 1 bis 2,33 : 1, Faktor 1,9** — nicht 7,9 wie bei der
Schrift. Kein Rahmen verschwindet; sie sind alle leise, und leise ist ihre Aufgabe. Eine Mischung
würde alle 42 anheben, um bei zwei Decks 0,3 zu gewinnen.

**Verworfen: ein einziger Wert für alles.** 62 % auch für Flächen und Kanten wäre eine Zahl statt
zweien, und der Unterschied in der Sättigung ist klein (Mittel 0,44 gegen 0,39). Trotzdem nein:
Haarlinie, Regler-Füllung und Aktiv-Kante sind das, was vom Deck überhaupt noch zu sehen ist, nachdem
die Schrift weichgezeichnet wurde. Ihr Kontrast war ohnehin erfüllt — dort Farbe wegzunehmen kostet
etwas und bringt nichts. Die zwei Zahlen sind keine Komplexität, sie sind die Trennung zwischen
**lesen** und **sehen**.

**Was es kostet, ehrlich:** die Mischung nimmt Farbe. Über alle 42 Decks fällt die mittlere Sättigung
von 0,65 auf 0,39, bei 62 % also gut vierzig Prozent. Am stärksten trifft es die dunklen, kräftigen
Decks — Thron geht von tiefem Burgunder in ein staubiges Rosé. Das ist der Preis dafür, dass die
Menüs auf jedem Deck funktionieren, und er wird bewusst bezahlt: **die drei Decks, die die Regel
nötig machen, sind drei von 42 — aber wer Thron spielt, spielt immer Thron.**

### Was ausdrücklich NICHT deck-getönt wird

Fraktionsfarben, Raritätstöne und Gold. Sie tragen Spielbedeutung, kein Chrome.

---

## 4. Komponenten

**Alles Bedienbare misst 44 px in der Höhe.** Sichtbar ist jeweils weniger; das Klickziel ist die
volle Höhe. Diese Regel hat keine Ausnahme.

### Schalter

| | |
| --- | --- |
| Spur | 46 × 26 px, vollrund |
| Klickfläche | 46 × 44 px |
| Griff | 20 × 20 px, `#f2f2f4`, 2 px Innenabstand |
| an | Fläche und Rand `#54e08a` |
| aus | Fläche `#30303a`, Rand `#3a3a44` |

### Segmented

Nur für **zwei bis drei feste Zustände, die nie mehr werden**. Alles Wachsende geht ins Dropdown.

```
Rahmen 1px #3a3a44, radius 8, geteilte Kontur
Feld: padding 9px 15px, min-height 44px
inaktiv: rgba(19,19,26,.9) / #8a8a95
aktiv:   rgba(32,32,44,.95) / #f0eefc + inset 0 -2px 0 var(--deck-a1)
```

Aktiv braucht **beide** Signale — hellerer Grund *und* Unterkante. Die Unterkante allein ist zu leise.

### Dropdown

Für Listen, die wachsen (Sprachen, Auflösungen).

```
Knopf:   min 172 × 44, radius 8, Rand #3a3a44, Fläche rgba(19,19,26,.9), Text #f0eefc
Chevron: 12px, #8a8a95, dreht beim Öffnen um 180°
Liste:   radius 10, Rand #3a3a44, Fläche #1b1a24, Schatten 0 16px 40px rgba(0,0,0,.55)
Eintrag: min-height 36, radius 6, #c9c9d2; Hover rgba(255,255,255,.05)
gewählt: heller UND Haken in der Deckfarbe
```

Feste Knopfbreite, damit der Kasten beim Wechseln nicht springt. Zahlenlisten in Geist Mono.

### Regler

```
Breite 148px, Greiffläche 44px hoch
Spur 6px, radius 3, Rest #2a2a34, Füllung Deckfarbe
Griff 16px, #f2f2f4, 2px Rand #14141a
Wert rechts: Geist Mono, tabellarisch, #c9c9d2, min-width 46px
```

**Der Farbwechsel gehört unter den Griff**, nicht an das Prozentmaß der Spur: der 16-px-Griff wandert
nur zwischen 8 px und 140 px, ein reiner Prozentwert läuft ihm an den Enden um 8 px davon.
Rechnung: `calc(8px + var(--fill) * 132px)` mit `--fill` als Bruchzahl.

### Zeichenkachel

`28 × 28`, Radius 8, Zeichen 16 px. Farbe folgt dem Zeilenzustand über `--c`:
Fläche `rgba(255,255,255,.03)`, Rand `color-mix(in srgb, var(--c) 42%, transparent)`.

### Zeichen

**Gezeichnete SVG, 16-px-Raster, eine Strichstärke, `currentColor`. Keine Emoji, keine Textglyphen.**
Eine Textglyphe hängt am Schriftschnitt und sieht je nach Rückfall anders aus — das ☾ des Ruhigen
Modus las sich als „C", das 🔒 im Baum sieht auf jeder Plattform anders aus.

---

## 5. Zustände

### Gesperrt

Deckkraft **42 %**, Zeichenkachel stumm, **keine Eingabe — auch nicht per Tastatur**. Optisch
gesperrt und tatsächlich fokussierbar ist kein Zustand, sondern eine Falle.

Der Titel sagt **warum** gesperrt ist, nicht nur *dass*: „Kein Lauf zum Anhängen gefunden",
„öffnet sich mit Rarität · Legendär".

**Der Zustand steht auf dem Bedienelement, nicht erst in einer Erklärung daneben.** Eine Kachel, die
gesperrt ist und trotzdem ihren Preis in Gold zeigt, sagt „kaufbar" — und die Wahrheit steht dann
irgendwo anders. Konkret: **Gold nur bei `buy`.** Gesperrt, zu teuer und kaufbar sind drei Zustände
und brauchen drei Bilder. Anlass: das Kärtchen der Legendär-Phase im Baum zeigte „5 SP" in Gold,
während sein Gate unerfüllt war; der Grund stand 71 px tiefer und 330 px weiter rechts, in der Seite,
die gerade offen war (`UpgradeScreen.jsx:515` / `:576`).

Daraus die allgemeine Regel: **erklärt sich ein Element nur woanders, gehört die Erklärung an das
Element.** Ein Bedienelement, das seinen ganzen Inhalt tragen kann, braucht keine aufklappende Zeile
in einer anderen Spalte.

### Abhängigkeiten sichtbar machen

Wo A B steuert, muss man das **sehen**, nicht nur merken: Ton aus → beide Regler auf 42 % und ihr
Wert liest „stumm" statt einer wirkungslosen Zahl. Master aus → Untergruppe auf 42 %.

### Leere Werte

Ein Balken bei null sagt „nichts" sehr laut. Ist etwas **noch nicht freigeschaltet**, wird die Kachel
gedämpft und sagt das — sie ist nicht bei null.

---

## 6. Typografie

| Rolle | Schrift |
| --- | --- |
| Fließtext, Titel, Beschriftungen | **Geist** |
| Zahlen, Werte, Codes, Kleinbeschriftungen | **Geist Mono**, tabellarische Ziffern |
| Marke, große Ablesungen | **Orbitron** 450–500 |

**Kleinbeschriftung** (das Label über einer Ablesung, über einem Feld):
`Geist Mono, 10px, letter-spacing .14em, uppercase, #5c5c68`.

---

## 7. Text

- **Ein String ist ein ganzer Satz.** Keine Fragmente, die erst durch Aneinanderkleben Sinn ergeben
  (`" / {total} Knoten · Ranglisten-Lauf"` + `"bei {total}/{total} Knoten"` ist der Gegenentwurf).
- **Kein Layout im String.** Kein führendes Leerzeichen, kein angehängter Mittelpunkt, kein Emoji.
- **Beschriftung statt nackter Zahl.** Eine Ablesung ohne Wort daneben ist Rätselraten.
- Wiederholt ein Element den Namen seines Containers, streicht man ihn: die Spalte trägt den Namen,
  der Eintrag die Stufe.
- Player-sichtbarer Text folgt `docs/text-style-guide.md` und `docs/localization/i18n.md`.

---

## 8. Was diese Sprache NICHT anfasst

- Die Fassung unter 1280 px, solange sie nicht ausdrücklich beauftragt ist.
- Spielbedeutungs-Farben (Fraktionen, Raritäten, Gold).
- Alles, was Verhalten ist statt Gestaltung — Rate-Limits, Speicherwege, Freischalt-Logik.
- **Mechanik.** Wer eine gestalterische Änderung auf eine Spielregel stützt, muss sie vorher im Code
  nachlesen und die Quelle nennen. (Anlass: eine Gruppierung der Baum-Lanes wurde aus der
  Farbverteilung erschlossen statt aus den `prereq`-Ketten — und war falsch.)

---

## 9. Offene Punkte

1. **Eyebrow-Wörter** für Screens, die heute keinen haben (Werkstatt, Statistik, Glossar, Leitfaden,
   Bestenliste). Vorschläge liegen als Mockup vor, sind aber neue Copy.
3. Ob **Genesis-artige Decks** (a1 und a2 fast gegenüber) den Zwei-Farben-Verlauf so behalten sollen.

---

## 10. Änderungsprotokoll

| Datum | Was |
| --- | --- |
| 24.08.2026 | Angelegt. Fundament, Kopf-Kanon, Farbrollen, Komponenten aus den Aufträgen Optionen, Melder, Mainscreen und Baum-Reiter 1–2 zusammengeführt. |
| 24.08.2026 | Farbentscheidung Upgrade-Baum: **eine** Struktur-Farbe, und die ist die Deckfarbe. Feste Fremdtöne (Cyan/Violett) für Struktur entfallen. |
| 24.08.2026 | Zur Ziel-Helligkeit zwei Gegenproben, beide gemessen und beide ohne Änderung: der **Rahmen** bleibt ungemischt (Spanne nur 1,9-fach), und **ein einziger Mischwert für alles** ist verworfen — er nimmt Farbe dort weg, wo der Kontrast schon erfüllt war. Beides in §3 notiert, damit es nicht wiederkommt. |
| 24.08.2026 | **Ziel-Helligkeit der Deckfarbe entschieden** (§3), damit ist offener Punkt 3 erledigt. Gemessen über alle 42 Decks mit eigenem Akzent: der Kontrast von `a1` gegen den Zeilengrund schwankt um den Faktor 7,9, drei Decks liegen unter 4,5 : 1. Mischung auf Weiß, zwei Werte: **62 %** für Schrift (schlechtestes Deck dann 4,65 : 1), **70 %** für Flächen und Kanten (3,80 : 1). Die Tönung bleibt ungemischt. Kosten: rund vierzig Prozent der Sättigung. |
| 24.08.2026 | **Haarlinie einheitlich 2 px** (§1), offener Punkt 1 erledigt. 3 px war an die Zweitaktions-Kante vergeben, und auf einem 1200-px-Panel wird daraus ein Balken. Dazu die Strichstärken-Leiter 1 / 2 / 3 / 4 px mit je einer Bedeutung. |
| 24.08.2026 | **Reihenfolge am Fuß einer Seite festgelegt** (§1): Inhalt, Detailzeile des angetippten Elements, Abschluss-Sektion, Zeichenerklärung. |
| 24.08.2026 | **Legendär-Phase des Baums (Reiter 4).** Kein Reiter, sondern zwei Kärtchen am Fuß der Navigationsspalte. Sie tragen künftig Text und Zustand selbst; die Detailzeile im Panel entfällt für sie. Marke in Gold nur bei `buy`, gesperrt auf 42 % und aus der Tastatur-Reihenfolge, gekauft mit gezeichnetem Haken in `#54e08a`. Die Höhe hat den ersten Entwurf verworfen: mit Kaufknopf in eigener Zeile lief die Spalte 16 px aus dem Panel (gemessen). Mit dem Knopf **in** der Zeile und ohne den Platzhalter `synLeg` sind es 545 px — einen Pixel weniger als heute, bei 73 px Luft. |
| 24.08.2026 | Zwei Regeln aus Reiter 4 nachgetragen (§5): **der Zustand steht auf dem Bedienelement**, und **erklärt sich ein Element nur woanders, gehört die Erklärung an das Element.** |
| 24.08.2026 | **Fraktionsseite des Baums (Reiter 3).** Die Challenge-Karte fällt: sie zeigte bei 1280 × 720 nur ihr Deckbild, 151 px ihres Inhalts waren verborgen (238 px mit angetipptem Knoten). An ihrer Stelle eine 44-px-Zeile am Fuß mit Bedingung, Fortschritt und Verweis auf die Werkstatt, wo dieselben Daten einen eigenen Reiter haben (`CustomizeScreen.jsx:299`/`:1313`). Damit bekommen die Fähigkeiten die volle Breite: 480 → 830 px, zwei Textspuren statt einer, legendäre Kachel 114 → 202 px, Scrollen 4,5× → 2,96×. Gemessen im Produktionsbuild an 1280 × 720 und 1536 × 791, der Vorschlag als Stil-Überzug eingehängt und nachgemessen. |
| 24.08.2026 | **Die Rolle „an / gekauft" ist `#54e08a`, nicht `#5ab87a`.** Das Dokument hatte sich die Fraktionsfarbe von Pflanze geliehen; `#54e08a` ist im Code längst die Zustandsfarbe. Begründung in §3. Reiner Dokument-Fehler — der Code war richtig. |
| 24.08.2026 | Zwei Regeln nachgetragen: **jede Seite endet gleich** (abschließender Bereich als Sektion mit Trennlinie, §1) und **eine Farbkante muss etwas unterscheiden** (§1, Zeile). |
| 24.08.2026 | Panel-Tönung von 9 / 5 % auf **5 / 1 %** zurückgenommen, nach dem direkten Vergleich Optionen ↔ Upgrade-Baum im selben Deck. Dazu die Regel **kein Panel im Panel**: abgesetzte Bereiche bekommen eine Trennlinie statt eines zweiten Rahmens. |
