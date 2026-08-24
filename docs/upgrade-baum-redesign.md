# Upgrade-Baum — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Vorher lesen: **`docs/design-sprache.md`**. Dieses Dokument wiederholt den Kanon nicht, es wendet ihn
an. Wo beide etwas sagen, gilt die Design-Sprache.

Mockup: https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8

| Artboard | Was es zeigt |
| --- | --- |
| **Baum 1/4 — Kopf & Legende** | Kopfzeile und Zeichenerklärung, bei 1520 px und im engen Fall 1216 px |
| **Baum 2/4 — Allgemein-Seite** | Die sechs Lanes, die Detailzeile, der Auswertungskasten |
| **Baum 2/4 — Farbentscheidung (B) & Balken** | Drei Farbfassungen derselben Seite; die gewählte ist markiert |
| **Baum 3/4 — Fraktionsseite** | Ist und Vorschlag, beide bei 884 × 618 px — der echten Größe im 1280-px-Fenster |
| **Baum 4/4 — Legendär-Phase** | Die zwei Kärtchen der Navigationsspalte, dazu vier Zustände auf 276 px |
| **Farbrollen — Ziel-Helligkeit** | Die Mischung der Deckfarbe über acht von 42 Decks |
| **Kopf-Kanon — alle Overlays** | Der Kopf, wie ihn jedes Overlay bekommt — gilt auch hier |

Ein Regler über jedem Artboard: **Deck**. Er ist ein Prüfwerkzeug, keine Spieler-Option.

Bezug: die Fassung **ab 1280 px** (Navigationsspalte links, eine Seite rechts). Die schmale Fassung
ist nicht Teil dieses Entwurfs; siehe *Abgrenzung*.

**Messgrundlage.** Alle Zahlen hier sind im Produktionsbuild an einem echten Viewport gemessen —
**1280 × 720, 1400 × 700 und 1536 × 791**, deutsch, alle vier Fraktionen, mit und ohne angetippten
Knoten. Nicht gegen 1920: der Screen hat laut eigener Rechnung im CSS schon auf 1080 px Höhe fast
nichts übrig, und 1280 × 720 ist die Größe, die die meisten Besucher sehen. Wo unten „gemessen"
steht, ist es gemessen; wo „gerechnet" steht, ist es abgeleitet.

---

## Ausgangsproblem

Der Baum ist der Screen, an dem der ganze Desktop-Durchgang Maß genommen hat — Werkstatt, Leitfaden,
Glossar, Statistik und Optionen sagen von ihren Werten, sie seien „1:1 von `.up-*`". Er ist zugleich
der Screen, der am wenigsten Luft hat: Kopf 172 + Zweig 808 + Legende 42 rechnet `.up-root` auf
1080 px vor, die Fraktionsseite ist schon einmal um 44 px übergelaufen.

Vier Dinge sind daran falsch, und alle vier kosten nichts an Höhe, wenn man sie richtig macht:

1. Die Kopfzeile sagt viel und liest sich schlecht — dreimal „Knoten", zweimal dieselbe Zahl.
2. Sechs Lanes tragen zwei feste Fremdfarben, die sonst niemand im Baum trägt.
3. Die Fraktionsseite gibt 39 % ihrer Breite an eine Karte, die bei 1280 px nur ein Bild zeigt.
4. Die Legendär-Phase zeigt einen gesperrten Knoten so, als wäre er kaufbar.

---

## Kopf und Zeichenerklärung

Der Kopf folgt dem **Kopf-Kanon** aus `docs/design-sprache.md` §2 — Eyebrow, Titel, Unterzeile links,
Aktionszone oben ausgerichtet, Schließen als letztes Element. Für den Baum kommt dazu:

**Zwei benannte Ablesungen statt einer nackten Zahl am Titel.** Beschriftung darüber, Wert darunter.
Die Währung behält ihre eigene Farbe (SP gold).

**Der Ranglisten-Stand wird ein Zustands-Chip mit Fortschrittsbalken**, kein Satz. Das Ziel ist ein
Vollständigkeits-Ziel; ein Balken sagt „noch weit hin" in einem Blick, wofür der heutige Satz zwei
Zeilen braucht. Im engen Fall (1216 px) weicht der Chip unter die Ablesungen — abgeschnitten wird
nichts.

**Was das an Höhe kostet: nichts.** Die zwei Zeilen grauer Auskunftstext verschwinden, Beschriftung
und Balken kommen dafür; die Kopfzeile bleibt einzeilig.

**Die Legende** trägt den Farbschlüssel links und den Bedienhinweis rechts. Zwei Änderungen:

- Der Hinweis heißt **„Klick auf einen Knoten erklärt ihn."** Auf dem Desktop tippt niemand. Er steht
  in der Legende statt im Kopf — ein Dauerhinweis im Kopf kostet bei jedem Öffnen Höhe, obwohl er
  nach dem ersten Mal nichts mehr sagt. Der Handy-Pfad behält seinen Text.
- **„Bald" steht nur noch auf der Legendär-Seite.** Es gibt genau einen Platzhalter-Knoten im ganzen
  Baum; die Notiz erklärt heute auf fünf von sechs Seiten nichts.

**Der Punkt „gekauft" trägt die Farbe der Seite, auf der er steht.** Heute ist er immer die Deckfarbe
(`UpgradeScreen.jsx:369`, `UI1` aus Zeile 42), während die Fraktionsseite gekaufte Knoten in der
Fraktionsfarbe malt (`nodeAccent`, Zeile 62, aufgerufen in Zeile 562). Der Punkt hat dort nie die
Farbe, die er benennt.

Gezeichnete SVG-Zeichen, keine Emoji — auch nicht in der Legende.

---

## Allgemein-Seite

Sechs Lanes als Spalten, die Knoten darin von oben nach unten.

**Die Spalte trägt den Namen, der Knoten die Stufe.** Elf von sechzehn Knoten wiederholen heute ihre
eigene Spaltenüberschrift; unter „Baufeld" stehen „Baufeld I / II / III". Das Wort steht bis zu
fünfmal in einer Spalte, die im 1280-px-Fenster **131 px** breit ist. Das löst den Umbruch dort von
selbst, ohne die Schrift zu verkleinern — *gerechnet:* rund 60 px Ersparnis, die der Seite genau
fehlen.

**Die Detailzeile steht direkt unter dem Raster**, nicht am Fuß des Panels. Heute ist sie das letzte
Kind (`UpgradeScreen.jsx:576`), also *unter* dem Auswertungskasten: man klickt oben links, und die
Erklärung samt Kaufen-Knopf erscheint rund 600 px weiter unten — bei scrollendem Raster auch ganz
außerhalb des Bildes. Die Reihenfolge am Fuß einer Seite steht in `design-sprache.md` §1.

**Die Detailzeile erbt die Farbe des Knotens, den sie erklärt.**

**Die Drop-Knoten bekommen ihren Satz zurück.** `wirkungOf()` ersetzt bei Knoten mit `shift` den
Beschreibungstext durch vier rohe Raritätsgewichte — „40 · 23 · 25 · 12", ohne Einheit und ohne
Schlüssel. Der lesbare Satz existiert, hängt aber im `title`-Attribut. Auf der Kachel steht der Satz;
die Verteilung wird ein farbiger Balken in der Detailzeile.

**Der Torhinweis erscheint auf dem Desktop und nennt das Tor beim Namen.** `upgrades.lane.note.afterLeg`
hängt an zwei Lanes und wird heute nur im Handy-Pfad ausgegeben. Er lautet **„öffnet sich mit
Rarität · Legendär"** — nicht „nach dem Legendär-Unlock". *Geprüft:* gesperrt sind genau zwei Lanes,
`drop1` und `perk2Leg`, beide über `prereq: "legLayer"`; alle vier anderen starten bei `prereq: null`,
auch Rarität. Es ist **ein einzelner Schlüsselknoten**, kein Gruppen-Tor.

**Der Auswertungskasten wird eine Sektion mit Trennlinie**, kein Kasten im Panel (`design-sprache.md`
§1). Er reagiert auf die Auswahl: ist ein Knoten angetippt, zeigt er, was der Kauf ändern würde. Der
Verteilungsbalken bekommt eine eigene Form — er ist eine Verteilung, keine Füllung, und darf nicht
aussehen wie die Füllbalken darüber.

---

## Farbentscheidung

**Eine Struktur-Farbe, und das ist die Deckfarbe.** Die Lane-Farben werden die Deckfarbe; die feste
Zuteilung Cyan `#26c6e6` / Violett `#9b82f0` entfällt.

Übrig bleiben vier eindeutige Rollen: **Gold = kaufbar · Grün `#54e08a` = gekauft · Grau = gesperrt ·
Raritäts- und Fraktionstöne dort, wo die Farbe das Gemeinte ist.**

Zwei Fassungen sind geprüft und verworfen und stehen als Protokoll auf dem Artboard:

- **A — zwei Fremdfarben behalten.** Scannt am schnellsten, aber Cyan ist im Hub die Handlungsfarbe,
  und in der Rarität-Lane stünde Violett neben violetten Raritätstönen: zwei fast gleiche Töne, die
  Verschiedenes meinen.
- **C — a1 für die offene, a2 für die gesperrte Gruppe.** Behält den Zwei-Gruppen-Scan ohne neue
  Farbrolle, fällt aber bei Decks auseinander, deren zwei Farben nah beieinanderliegen.

Der Preis der gewählten Fassung ist benannt: die zwei Gruppen unterscheiden sich nur noch durch
Überschrift, Trennstrich und Dämpfung. Das ist richtig so — die Sperre ist ein **Zustand**, keine
Kategorie.

---

## Fraktionsseite

Kette quer über den Kopf, darunter die Fähigkeiten, am Fuß die Challenge.

**Die Challenge-Karte fällt.** *Gemessen bei 1280 × 720:* sichtbar 402 px, Inhalt 553 px — **151 px
verborgen**, mit angetipptem Knoten **238 px**. Das Deckbild allein misst 290 × 401 px und füllt die
Karte damit vollständig; verborgen ist alles, was etwas sagt — Name, Bedingung, Balken, Zähler. Auch
bei 1536 × 791 fehlen 80 px (167 mit Auswahl). Dazu ist die Karte ein Panel im Panel.

**An ihrer Stelle eine Zeile am Fuß**, 44 px, Trennlinie statt Rahmen, kein Bild: Beschriftung,
Bedingung, Fortschritt, und ein Verweis auf die Werkstatt. *Geprüft:* dieselben Daten haben dort
einen eigenen Reiter (`CustomizeScreen.jsx:299`, gerendert in `:1313`, Bedingung und Fortschritt in
`:1441` und `:1528`) und kommen aus derselben Funktion `packUnlock()`, die der Baum benutzt. Die vier
Fraktions-Decks `feuer`, `eis`, `blitz`, `pflanze` sind alle `kind: "cond"` und stehen darin.

**Damit bekommen die Fähigkeiten die volle Breite.** *Gemessen, Vorschlag am echten Screen:*

| bei 1280 × 720 | heute | Ziel |
| --- | --- | --- |
| Breite der Fähigkeiten-Fläche | 480 px | **830 px** |
| Textspuren | 1 | **2**, Kachel 411 px |
| legendäre Kachel | 114 px | **202 px** |
| Fenster der Liste | 404 px | 344 px |
| Scrollen | 4,5 × | **2,96 ×** |

Über alle vier Fraktionen 2,7–3,0 × statt 4,1–4,5 ×; mit angetipptem Knoten 3,6–4,0 × statt
4,1–5,8 ×. Bei 1536 × 791 drei Spuren und 1,8–1,9 ×; bei 1400 × 700 zwei Spuren und 2,7–3,0 ×.
Nichts läuft aus dem Panel.

**Die 17 normalen Fähigkeits-Kacheln werden neutral**, die vier legendären behalten ihre goldene
Kante. Eine Farbkante muss etwas unterscheiden — auf einer Seite, die nur diese Fraktion zeigt, tut
die Fraktionskante das nicht, sie summiert nur zu einer Farbwolke.

**Die legendäre Reihe bleibt eine Reihe.** Ihre vier Spalten kommen aus der Anzahl, nicht aus der
Breite, und das ist richtig — mit 830 px Fläche ist die Kachel 202 px breit und das Problem
verschwindet von selbst. `auto-fill` und `auto-fit` sind beide gemessen und beide zu Recht verworfen.

**Ein eigener Reiter für die Challenges ist verworfen** — ein zweiter Einstieg in eine Liste, die es
schon gibt; dieselbe Begründung, mit der der „Details ›"-Knopf verschwunden ist
(`UpgradeScreen.jsx:552`).

**Reihenfolge am Fuß:** Fähigkeiten → Detailzeile des angetippten Knotens → Challenge-Zeile →
Zeichenerklärung.

Der Untertitel des Archetyps bleibt, wie er ist: *gemessen* wird er an keiner der geprüften Größen
gekürzt.

---

## Legendär-Phase

Kein Reiter und keine Seite: zwei Kärtchen am Fuß der Navigationsspalte
(`UpgradeScreen.jsx:507`) — ein kaufbarer Knoten (`deckReroll`) und ein Platzhalter (`synLeg`).

**Das Kärtchen trägt Text und Zustand selbst; die Detailzeile im Panel entfällt für diese beiden.**
Heute klickt man links und die Antwort erscheint rechts: *gemessen* 71 px tiefer und 330 px weiter
rechts bei 1280 × 720 (142 px tiefer bei 1536 × 791) — und zwar in der Seite, die gerade offen ist,
gemessen identisch auf der Allgemein-Seite und auf einer Fraktionsseite.

**Vier Zustände, vier Bilder** (`design-sprache.md` §5):

| Zustand | Bild |
| --- | --- |
| gesperrt | 42 % Deckkraft, graue Marke, **nicht fokussierbar**, darunter der Satz „öffnet sich mit der ersten Legendär-Stufe einer Fraktion" |
| Geld fehlt | volle Deckkraft, graue Marke, darunter „{n} SP fehlen" |
| kaufbar | goldene Kante; angetippt ersetzt ein 44-px-Kaufknopf die Marke **in derselben Zeile** |
| gekauft | Kante und Marke `#54e08a`, gezeichneter Haken |

**Gold heißt kaufbar.** Heute zeigt das Kärtchen „5 SP" in Gold, während sein Tor unerfüllt ist — die
Marke unterscheidet nur gekauft / Platzhalter / alles andere (`UpgradeScreen.jsx:515`).

**Der Platzhalter `synLeg` verschwindet, bis es ihn gibt.** Das ist keine Geschmacksfrage, sondern
Höhe. *Gemessen bei 1280 × 720:*

| Navigationsspalte | Höhe | Luft bis zur Panelkante |
| --- | --- | --- |
| heute | 546 px | 72 px |
| Kärtchen mit Text, Kaufknopf in eigener Zeile | 634 px | **−16 px**, die Karte läuft über |
| **Kaufknopf in der Zeile, ohne `synLeg`** | **545 px** | **73 px** |

Bei 1536 × 791 bleiben 144 px, bei 1400 × 700 53 px.

**Die Sektion bleibt in der Navigationsspalte.** An den Fuß der Allgemein-Seite zu wandern ist
verworfen: `deckReroll` steht in `branch: "deck"` und hängt an den Fraktions-Legendärstufen, und in
der Spalte ist es von jeder Seite aus sichtbar — was zu einem fraktionsübergreifenden Kauf passt.

**Das Kärtchen braucht keinen Auswahl-Zustand mehr.** Es klappt nichts mehr auf, es zeigt alles.
Damit gehört die hellere Fläche in der Spalte eindeutig der offenen Seite; heute liegen „angetipptes
Kärtchen" (5 %) und „offene Seite" (7 %) zwei Prozent auseinander.

---

## Was auf jeder Seite gilt

Aus `docs/design-sprache.md`, hier nur als Merkposten:

- **Panel:** Tönung 5 % oben / 1 % unten, Rahmen 26 %. Kein `backdrop-filter`.
- **Kein Panel im Panel.** Abgesetzte Bereiche bekommen eine Trennlinie nach oben.
- **Reihenfolge am Fuß:** Inhalt → Detailzeile des angetippten Elements → Abschluss-Sektion →
  Zeichenerklärung.
- **Haarlinie 2 px**, `linear-gradient(90deg, a1, a2, a1)`, Deckkraft `.85`.
- **Alles Bedienbare misst 44 px in der Höhe.**
- **Ziel-Helligkeit der Deckfarbe:** als Schrift `color-mix(in srgb, var(--deck-a1) 62%, #ffffff)`,
  als Fläche oder Kante `70%`. Die Tönung und der Rahmen werden **nicht** gemischt.
- **Gezeichnete SVG-Zeichen**, keine Emoji, keine Textglyphen.

---

## Texte

- **Ein String ist ein ganzer Satz.** `" / {total} Knoten · Ranglisten-Lauf"` beginnt mit einem
  Leerzeichen, wird an eine Zahl geklebt und ergibt zusammen mit `"bei {total}/{total} Knoten"`
  dreimal „Knoten" und zweimal dieselbe Zahl. Für eine Übersetzung nicht zerlegbar.
- **Kein Layout im String.** Kein führendes Leerzeichen, kein angehängter Mittelpunkt, kein Emoji.
  Betrifft auch `upgrades.state.owned`, das heute `"✓ Gekauft"` heißt.
- **Ein einzelnes „frei" trägt seinen Bezug nicht.** Ein Satzende, das nur mit dem Vordersatz
  funktioniert, wird ein eigenständiger Zustand.
- **Beschriftung statt nackter Zahl.** Ablesungen brauchen ein Wort daneben.
- Player-sichtbarer Text folgt `docs/text-style-guide.md` und `docs/localization/i18n.md`.

---

## Abgrenzung

- **Die Fassung unter 1280 px** — der Zweig-Pfad (`UpgradeScreen.jsx:484`) ist ein eigener
  Renderpfad und wird nicht angefasst. Er wurde ausdrücklich als gut genug erklärt.
- **Die Detailzeile der Seiten-Knoten** bleibt als Bauteil bestehen; nur ihr Platz ändert sich (siehe
  *Allgemein-Seite*) und sie entfällt für die zwei Kärtchen der Legendär-Phase.
- **Spielbedeutungs-Farben** — Fraktionen, Raritäten, Gold — werden nicht deck-getönt.
- **Keine Mechanik.** Nichts in diesem Dokument ändert, was ein Knoten kostet, was er bewirkt oder
  woran er hängt.
- **Die Werkstatt** wird nicht angefasst, obwohl die Challenge-Zeile auf sie zeigt.

---

## Offene Punkte für den Owner

1. **Der genaue Wortlaut der Challenge-Zeile.** Im Mockup steht „Deck »Eis« — Schließe 5 Läufe nur
   mit Eis-Skills ab · 0 / 5 · Werkstatt ›". Der mittlere Teil kommt aus `packUnlock()` und ist
   bestehender Text; der Rahmen darum ist neu.
2. **Der Satz am gesperrten Legendär-Kärtchen.** „öffnet sich mit der ersten Legendär-Stufe einer
   Fraktion" ist neu und beschreibt `anyLegOwned` korrekt, ist aber länger als der heutige Text.
3. **Die Eyebrow-Wörter** der Screens, die heute keines haben, sind ein eigener Punkt und stehen in
   `docs/design-sprache.md` §9.
