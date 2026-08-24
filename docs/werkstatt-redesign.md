# Deck-Werkstatt — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Vorher lesen: **`docs/design-sprache.md`**. Dieses Dokument wiederholt den Kanon nicht, es wendet ihn
an.

Mockup: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 — Artboards
**„Werkstatt 1/3 — Katalog und Vorschau"**, **„Werkstatt 2/3 — Herausforderungen"** und
**„Werkstatt 3/3 — Effekte"**. Ist und Vorschlag je in echter Größe.

Bezug: die Fassung **ab 1280 px**. Die Handy-Fassung ist nicht Gegenstand; siehe *Abgrenzung*.

**Messgrundlage.** Produktionsbuild, echter CDP-Viewport, deutsch, **1280 × 720, 1400 × 700,
1536 × 791** — nie gegen 1920. Mit **vollem Spielstand**: 137 Läufe, Bestserie 21, Bestscore 412.000,
245 DP, 12 gekaufte Packs, 3 freie Herausforderungen, 7 gekaufte Effekte, `as_reset_epoch` gesetzt.
Jeder Vorschlag ist zusätzlich **als Stil-Überzug in den laufenden Build gehängt und nachgemessen**.

---

## Was der Bildschirm schon richtig macht

Und was deshalb **nicht** angefasst wird:

- **Überzug** `rgba(12, 12, 16, .94)`, **kein `backdrop-filter`** (gemessen: `none`). Beides ist der
  Stand nach `#perf-blur` und `#ueberzug`.
- **Die Karte ist nur das Raster.** `.cz-card` ist flächenlos, die Panels tragen Fläche und Rahmen —
  genau, was §1 verlangt.
- **Die schmale Spalte steht links**, wie Baum, Leitfaden und Glossar (`#panelseite`).
- **Haarlinie 2 px.**
- **Das Detail endet an seinem Inhalt**, nicht auf Rasterhöhe.
- **Das Aktiv-Abzeichen** `#123a25` / `#54e08a` / `#2f7a4f` ist genau der Dreiklang, den §3 notiert.
- **Die Spaltenbreiten 520 / 26 / 636 bleiben.** Sie zu ändern ist geprüft und verworfen — siehe
  *Die Rechnung*.

**Der Umbau ist deshalb ein Nachziehen mit drei echten Löchern.**

---

## Reiter 1 — Katalog und Vorschau

### Das Loch

*Gemessen bei 1280 × 720:*

| | Detailspalte | Katalog |
| --- | --- | --- |
| Breite | 520 px | 636 px |
| Inhalt | **1** Pack | **30** Packs |
| Scrollen | 540 / 540 = **1,0×** | 1087 / 544 = **2,0×** |

Die Vorschau rendert ihren Bilderblock mit **322,6 px in einer 482-px-Spur** (Faktor 0,66,
`shopScale.js`) — und der **Kartenrücken**, das eigentliche Bild, misst dabei **155,3 × 215 px**. Bei
1400 × 700 sind es 146 px. Ein 520 px breites Panel zeigt ein Deck in Briefmarkengröße.

Dazu: **acht von dreißig Namen sind abgeschnitten.** 70 px Platz, längster Name **101,5 px**
(„Schwarzes Loch"). Die Unterzeile darunter sagt zwölfmal „freigeschaltet" und siebzehnmal
„kaufbar" — beides steht schon in der Färbung bzw. im Preisschild.

### Die Entscheidung: der Rücken wird das Bild

Der Kartenrücken steht als **Hochformat über beide Zeilen**, Vorderseite und Spielfeld rücken als
Paar daneben. §1: *ein Element mit festem Seitenverhältnis wird über seine knappe Achse bemessen*,
und *ein Hochformat bekommt einen hochformatigen Platz*.

*Gemessen, Vorschlag als Stil-Überzug im echten Build:*

| Kartenrücken | heute | Ziel |
| --- | --- | --- |
| 1280 × 720 | 155,3 px | **250,1 px** |
| 1400 × 700 | 146 px | **246 px** |
| 1536 × 791 | 188,3 px | **250,1 px** (284 px wären dort möglich) |

**250 px ist der Wert, der an allen drei Größen ohne Überhang steht** — Überhang 0, der
Aktionsknopf bei y = 700 gegen die Kartenkante 702. Das ist die **2,6-fache Bildfläche**, und der
Katalog gibt dafür **keinen Pixel** ab.

**Der Schrumpffaktor wird dabei überflüssig.** `shopScale.js` existiert nur, weil der Block als
Paar-plus-Band zu hoch wurde. Nebeneinander passt er ohne Schrumpfen.

### Die Kachel

- **Die Unterzeile fällt.** Der Zustand steht im Abzeichen (`AKTIV` / Preis / Schloss) und in der
  Färbung (im Besitz = farbig, sonst grau). Eine Zeile, die zwölfmal dasselbe Wort sagt, sagt nichts.
- **Die Farbkante fällt.** Sie trägt die Akzentfarbe des Packs — dieselbe, die das Coverbild darüber
  großflächig zeigt. §1: *eine Farbkante muss etwas unterscheiden*, und sie darf nicht wiederholen.
  Die vier Pixel gehen an den Namen: **66 → 70 px**.
- **Das ausgerüstete Deck trägt stattdessen einen Ring** in der Deckfarbe (2 px), zusätzlich zum
  `AKTIV`-Abzeichen.
- **Der Name bekommt zwei feste Zeilen.** Mit den 70 px passen *gemessen* **alle 42** Deck- und
  Herausforderungsnamen — sechs davon nur mit einem weichen Trennzeichen (offener Punkt 2).
  `hyphens: auto` löst es nicht: *gemessen*, es ändert bei allen sechs nichts.
- **Die Kachelhöhe bleibt 162 px**, es stehen weiter **12 Kacheln ohne Scrollen** im Bild.

**Die Spaltenzahl darf später der Fensterbreite folgen** (Entscheidung des Owners: keine Präferenz,
später). Zwei Dinge gehören dann dazu, sonst wird daraus der Fehler, den die Rechnung unten
verwirft:

- **Über Haltepunkte, nicht über `minmax()`.** Eine Mindestbreite je Kachel würde bei 1280 px auf
  vier bis fünf Spalten fallen und dort **weniger** Decks zeigen — genau die Richtung, die gemessen
  verworfen ist. Die Spaltenzahl darf mit der Breite nur **steigen**.
- **Erst messen, dann festlegen.** *Gemessen* liefert die feste Sechserteilung 86 px (1280 × 720),
  104,7 (1400 × 700) und 128,7 (1536 × 791) — ein brauchbares Band. Oberhalb von 1536 px ist nichts
  gemessen; am Breiten-Deckel (1720 px) käme die Sechserteilung rechnerisch auf rund 176 px, also
  über das Band hinaus. Der Ansatz wäre dort eine siebte und achte Spalte. **Gerechnet, nicht
  gemessen** — vor der Umsetzung an echten Viewports nachzumessen.

### Die Rechnung — warum die Kacheln nicht größer werden

Der naheliegende Schluss war: Detailspalte kürzen, Kacheln vergrößern. *Alle Varianten als
Stil-Überzug gehängt und bei 1280 × 720 gemessen:*

| Fassung | Kachel | sichtbar | Scrollen | Rücken | Namen ab&shy;geschnitten |
| --- | --- | --- | --- | --- | --- |
| **Ist** — 520 / 636, sechs Spalten | 86 px | 12 / 30 | 2,00× | 155,3 px | 8 |
| **Ziel** — 520 / 636, Rücken als Bild | 86 px | **12 / 30** | 2,11× | **250,1 px** | **0** |
| Spalte 424, sechs Spalten | 102 px | 6 / 30 | 2,30× | 150,5 px | 0 |
| Spalte 424, fünf Spalten | 125,6 px | 5 / 30 | 3,07× | 150,5 px | 0 |
| Spalte 380, fünf Spalten | 134,4 px | 5 / 30 | 3,00× | — | 0 |

**Der Schluss war falsch.** Die Vorschau ist nicht höhen-, sondern **breitengebunden**: kürzt man
die Spalte, schrumpft der Block im gleichen Verhältnis mit. Und fünf Spalten kosten **sieben von
zwölf** sichtbaren Kacheln für 40 px Kachelbreite — ein Katalog, der weniger zeigt, verkauft
weniger.

### Der Zufalls-Schalter

Er ist heute ein **gerahmter, getönter Kasten im getönten Panel** (§1: *kein Panel im Panel*), sein
Schalter violett `#9b82f0` statt grün, seine Spur 26 px hoch **ohne die 44-px-Klickfläche**. Künftig
eine **neutrale Kanon-Zeile** an derselben Stelle, „an" in `#54e08a`, Klickfläche 44 px.

---

## Reiter 2 — Herausforderungen

**Die Galerie bleibt eine Galerie.** Das Bild weckt die Frage, die Vorschau beantwortet sie — sechs
Spalten, 86-px-Kacheln, zwei volle Reihen ohne Scrollen, genau wie heute.

### Das Loch

*Ungekürzte Textbreite gemessen (Klon ohne `truncate`, freier Messrahmen), verfügbar sind 71,3 px:*

| | Platz | braucht | abgeschnitten |
| --- | --- | --- | --- |
| Freischalt-Bedingung | 71,3 px | Median **142,5** · max **344,4** | **11 / 12** |

344,4 px ist „Schließe einen Ranglisten-Wochenlauf ohne einen einzigen Reroll ab" — das
**4,8-fache** der Kachelbreite. Im Bild stehen „Erreiche ein…", „Erreiche Sc…", „Schließe 5 …",
„Schalte alle…". Die einzige vollständige Zeile ist „freigeschaltet" — die, die nichts fordert.

**Das schließt einen Kreis.** `docs/upgrade-baum-redesign.md:151` schickt den Spieler künftig mit
„Deck »Eis« — Schließe 5 Läufe nur mit Eis-Skills ab · 0 / 5 · Werkstatt ›" hierher, und `:272` hält
fest, dass die Werkstatt dabei nicht angefasst wurde. Bedingung und Fortschritt kommen auf beiden
Screens aus derselben Funktion `packUnlock()`.

### Die Entscheidung

- **Die Kachel trägt Fortschritt statt Satz** — ein 3-px-Balken in der Deckfarbe und ein Zähler in
  Geist Mono. *Gemessen: keiner der zwölf Zähler ist breiter als 62 px*, alle passen mit Balken
  daneben. Die drei freien Decks sagen „frei" bzw. „Stufe III".
- **Die Bedingung wird die Abschluss-Sektion der Vorschau** — Trennlinie statt Rahmen,
  Kleinbeschriftung „Freischalten", der Satz in voller Größe, darunter Balken und Zähler. Genau die
  Reihenfolge aus §1: Inhalt, dann Abschluss der Seite.
- **Heute ist sie ein grauer Kasten mit Rahmen** am Fuß der Spalte, der wie ein toter Knopf aussieht,
  mit dem Fortschritt als `· 0 / 5` in `opacity-70` hinter einem Mittelpunkt (`:1725`).
- **Der Rücken wird auch hier das Bild.** Bei einem Deck, das man noch nicht hat, ist das Bild der
  ganze Zweck der Spalte.
- **Die Stufen-Pillen I/II/III tragen die Deckfarbe** statt `#c9b6ff` auf `#1a1330` — freigeschaltete
  hell, gesperrte grau.

---

## Reiter 3 — Effekte

### Das Loch

*Gemessen bei 1280 × 720:* die Bühne schließt bei y = 548,6, das Listen-Panel bei y = 546,3, die
Karte erst bei y = 702 — **153,4 px leer**. Bei 1536 × 791 sind es **226,7 px**. Durch 94 % Überzug
liest sich in der Lücke der Hub durch („Statistiken", „Optionen", „Tutorial", „Angemeldet als …").

Das Listen-Panel ist an **jeder** Fenstergröße **388,9 px** hoch und wächst nie mit. `.cz-fxlist` hat
nie etwas zu scrollen (`client 247 = scroll 247`); die vier Kategorien haben 5 · 5 · 5 · 6 Zeilen.
Damit **ändert der Screen zwischen den Reitern seine Höhe** — „Packs" füllt 543,6 px, „Effekte" 391
bzw. 389. §1: *ein Panel, dessen Inhalt umschaltet, behält seine Maße.*

Der Grund ist nicht das Panel, sondern die Zeile: sie ist **41,5 px hoch** und sagt „Neonrahmen ·
im Besitz". **Was ein Effekt tut, steht ausschließlich in der Bühne daneben** — §5, *erklärt sich
ein Element nur woanders, gehört die Erklärung an das Element.*

### Die Entscheidung

- **Die Zeile wird die Kanon-Zeile** — 11 / 13 px Polster, Titel 13,5 / 600, Beschreibung 12 px auf
  1,38. Damit sagt die Liste, was die Effekte tun, ohne dass man jeden einzeln anklickt.
- **Beide Panels füllen die Spalte.** Fünf Zeilen à 57 px plus Kategorien, Sektionskopf und Fußnote
  füllen die 514 px; die Kategorie mit **sechs** Zeilen scrollt um rund 65 px — und damit hat der
  Scroller, der seit dem Umbau leer läuft, zum ersten Mal Arbeit.
- **Die Auskunft steht auf allen drei Reitern.** Heute fällt sie im Effekte-Kopf weg und hinterlässt
  **664 px Lücke** in Spalte 3.
- **Der Skill-Effekt sagt „immer an" statt „aktiv".** Er ist per Mechanik immer eingeschaltet
  (`CustomizeScreen.jsx:1771`); zweimal „aktiv" in einer Liste, die genau eines erlaubt, ist ein
  falsches Paar. Die Mechanik bleibt unberührt — nur das Wort sagt die Wahrheit.
- **Der Farbmodus wird das Kanon-Segmented** (§4): hellerer Grund *und* Unterkante in der Deckfarbe,
  44 px — statt einer eigenen Fassung mit eigenen Grautönen (`#33324a` / `#211f2e`, 41,5 px).

---

## Kopf

Der Kopf ist auf allen drei Reitern derselbe und folgt §2:

| Zone | Inhalt |
| --- | --- |
| 1 — Titelblock | Eyebrow **Kosmetik** · Titel **Deck-Werkstatt** (27 px) · Unterzeile **„Decks, Spielfelder, Effekte."** |
| 2 — Währung | benannte Ablesung: Beschriftung **GUTHABEN**, Wert **245 DP** |
| 3 — Bestand | benannte Ablesung: **PACKS 13 / 30** bzw. **FREI 3 / 12** bzw. **EFFEKTE 7 / 21** |
| 4 — Aktion | **Schließen** mit gezeichnetem ✕, 4-px-Kante |

Dazu: `align-items: start` statt `center` (`index.css:2833`), Reiter auf 44 px, Haarlinie auf
Deckkraft 0,85 mit den 70-%-gemischten Stopps.

**Der Satz „Karte antippen zeigt Rücken, Front und Spielfeld." entfällt.** Ab 1280 px steht die
Vorschau dauerhaft daneben; der Satz beschreibt eine Geste, die es dort nicht gibt.

**Preis, ehrlich:** der Kopf wächst durch Eyebrow und Unterzeile um **29,2 px** (140,4 → 169,6). Der
Katalog verliert sie, das Scrollen geht von 2,00 auf **2,11×**.

---

## Farben und Zeichen

**Kein gezeichnetes Zeichen im ganzen Screen** — `.cz-root svg` zählt **0** auf allen drei Reitern
und allen drei Größen. Stattdessen neun 🔒 auf den Kacheln, ein zehntes im String selbst
(`"shop.unlock": "🔒 Freischalten: {cond}"`, `de.js:1069`), „Aktiv ✓", „✓ Aktiv — keine Animation"
und ein „→" mitten im Fließsatz in vier Strings. Alles wird gezeichnet bzw. entfällt.

| Fundstelle | Heute | Ziel |
| --- | --- | --- |
| Aktive Filterkante (`:1397`) | `#26c6e6` — Cyan als Struktur | Deckfarbe. Cyan gehört dem Hub (`#ruhe`) |
| Zufalls-Deck-Schalter (`:1385`) | `#9b82f0` — Violett für „an" | `#54e08a`; Zustand ist grün |
| Stufen-Pillen (`:1459`) | `#c9b6ff` / `#6a4fb0` | Deckfarbe frei, Grau gesperrt |
| „kaufbar" (`:1440`) | `#f2c14a` — dritter Goldton | entfällt mit der Unterzeile |
| Wähl-Knopf der Bühne (`:1928`, `:71`) | `#e0605a` — **rote Kante an der Hauptaktion** | Deckfarbe für das Angebot, `#54e08a` für „läuft gerade" |
| „im Standard enthalten" (`:1935`) | `#7fb4ff` — festes Blau | neutral; eine Auskunft ist kein Signal |
| Guthaben und Preisschilder (`:1259`, `:1439`) | `#35c6e6` — drittes Cyan | eine Währung, eine Farbe — **offener Punkt 1** |
| Trennlinien (`:1867`, `:1444`) | `#2a2836` | `rgba(150,150,170,.14)` |

Die **Raritätskante** der Effekt-Zeilen **bleibt**: sie unterscheidet fünf Stufen und darf es
deshalb (§1).

**Der rote Wähl-Knopf ist auch ein Code-Befund, nicht nur ein Design-Befund:** der Kommentar
unmittelbar darüber sagt *„Ausrüsten-Angebot in Deckfarbe (war Violett)"*, während der Code
`--c: STATE_OFF` setzt. Kommentar und Code gehen auseinander.

---

## 44 px

Gemessen unter der Regel: Hauptreiter **42,3**, FX-Kategorien **33,5**, Filter- und Sortier-Chips
**30,5**, FX-Zeilen **41,5**, Farbmodus-Umschalter **41,5**, Zufalls-Schalter **26**. §4 kennt keine
Ausnahme; die Spur des Schalters bleibt sichtbar 46 × 26, die Klickfläche wird 46 × 44.

---

## Abgrenzung

- **Die Fassung unter 1280 px** wird nicht angefasst. Die Handy-Fassung ist ein Overlay über dem
  Katalog und bleibt es.
- **Die Spaltenbreiten 520 / 26 / 636** bleiben — geprüft und mit Zahlen verworfen.
- **Die Galerie bleibt eine Galerie** auf beiden Pack-Reitern.
- **Keine Mechanik.** Nichts hier ändert, was ein Pack kostet, was ein Effekt tut oder woran eine
  Freischaltung hängt. Der Skill-Effekt bleibt immer an; nur sein Wort ändert sich.
- **Spielbedeutungs-Farben** — Raritätstöne, Fraktionsfarben, Gold — werden nicht deck-getönt.
- **Der Katalog scrollt weiter.** 30 Packs passen bei 686 px Kartenhöhe nicht auf einen Bildschirm,
  und keine Spaltenzahl ändert das.

---

## Offene Punkte für den Owner

1. **Die Farbe eines DP-Preises.** §2 und §3 widersprechen sich. *Nachgeschlagen:* DP trägt heute
   drei Farben, und auf dem **Hub** ist es bereits `#d6ab6b`, das Währungsgold des Kanons
   (`StartScreen.jsx:55`, `:774`); cyan ist es nur auf dem Endscreen und hier. Die
   Unterscheidungsaufgabe aus §2 tritt in der Werkstatt nicht ein, weil SP hier nie gezeigt wird
   (`CustomizeScreen.jsx:1256`). **Empfehlung: Gold**, so ist es im Mockup gezeichnet. Steht als
   offener Punkt 1 in `design-sprache.md` §9, samt Kosten.
2. ~~Das weiche Trennzeichen.~~ **Entschieden am 24.08.2026: erlaubt.** Als benannte Ausnahme in
   §7 des Kanons eingetragen — nur dort, wo ein einzelnes Wort breiter ist als sein Feld.
3. **Die neuen Wortlaute.** „Decks, Spielfelder, Effekte." als Unterzeile, „immer an" für den
   Skill-Effekt, die Bedingungstexte als ganze Sätze mit Punkt („Erreiche Score 25.000.000" →
   „Erreiche 25 Millionen Punkte in einem Lauf."), und die gekürzten Fußnoten. Alles neue Copy und
   im Mockup als solche markiert.

---

## Folgepunkte außerhalb dieses Auftrags

- **Der Endscreen trägt drei Farbtöne für zwei Währungen** — SP als `#d4a63a` mit Wert `#f2c14a`,
  DP als `#35c6e6` (`GameOver.jsx`). Weder der Kanon-Goldton `#d6ab6b` noch eine einheitliche
  Cyan-Fassung. Er ist von jeder Antwort auf offenen Punkt 1 betroffen und wird hier **nicht**
  angefasst.
