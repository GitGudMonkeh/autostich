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
| Upgrade-Baum | in Arbeit — Reiter für Reiter |

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

### Haarlinie

Unter dem Kopf, über die volle Breite: `linear-gradient(90deg, a1, a2, a1)`, Deckkraft `.85`.
Höhe 3 px in Modals, 2 px im Baum — **zu vereinheitlichen**, siehe *Offene Punkte*.

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
| **An / gekauft** | Grün `#5ab87a` | Schalter „an", gekaufte Knoten, Zeichenkachel einer aktiven Zeile |
| **Gesperrt** | Grau `#8a8a95` / `#3a3a48` | Zeichen und Marken gesperrter Zeilen |
| **Inhalt** | Raritätstöne (`tierColor`), Fraktionsfarben (`FACTION_GLOW`) | nur dort, wo die Farbe **das Gemeinte ist** — eine blaue Rarität, eine Fraktions-Identität |

**Grundsatz: Struktur ist immer die Deckfarbe.** Feste Fremdtöne für Struktur gibt es nicht mehr.
Das folgt der Regel, die `genAccentMobile()` in `UpgradeScreen.jsx` bereits für die Handy-Fassung
anwendet — mit dem Kommentar *„Struktur, kein Spiel-Signal"*. Der Desktop zieht nach.

**Cyan `#26c6e6` gehört dem Hub.** Laut `#ruhe` ist es dort die Handlungsfarbe und die einzige auf
voller Sättigung. Es darf in Menüs nicht für Beschriftungen ausgegeben werden.

**Zwei Goldtöne, klar getrennt:** Währung `#d6ab6b`, kaufbare Kante `#d4a63a`. Ein dritter Ton
(`#f2a83a` mit Schein, heute im Baum-Kopf) entfällt.

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
| an | Fläche und Rand `#5ab87a` |
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

1. **Haarlinien-Höhe** vereinheitlichen: 3 px in den Modals, 2 px im Baum.
2. **Eyebrow-Wörter** für Screens, die heute keinen haben (Werkstatt, Statistik, Glossar, Leitfaden,
   Bestenliste). Vorschläge liegen als Mockup vor, sind aber neue Copy.
3. **Ziel-Helligkeit der Deckfarbe** auf gefüllten Knöpfen — über die 52 Deck-Looks schwankt sie so
   stark, dass ein Knopf bei Obsidian fast weiß und bei Thron fast unsichtbar wird. Mittel wäre eine
   Mischung auf Weiß, wie `.as-hub-glyph` sie schon benutzt.
4. Ob **Genesis-artige Decks** (a1 und a2 fast gegenüber) den Zwei-Farben-Verlauf so behalten sollen.

---

## 10. Änderungsprotokoll

| Datum | Was |
| --- | --- |
| 24.08.2026 | Angelegt. Fundament, Kopf-Kanon, Farbrollen, Komponenten aus den Aufträgen Optionen, Melder, Mainscreen und Baum-Reiter 1–2 zusammengeführt. |
| 24.08.2026 | Farbentscheidung Upgrade-Baum: **eine** Struktur-Farbe, und die ist die Deckfarbe. Feste Fremdtöne (Cyan/Violett) für Struktur entfallen. |
| 24.08.2026 | Panel-Tönung von 9 / 5 % auf **5 / 1 %** zurückgenommen, nach dem direkten Vergleich Optionen ↔ Upgrade-Baum im selben Deck. Dazu die Regel **kein Panel im Panel**: abgesetzte Bereiche bekommen eine Trennlinie statt eines zweiten Rahmens. |
