# Optionen-Overlay — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, i18n-Schlüssel, CSS-Ablage, Tests) bespricht der Owner mit dem umsetzenden
Worker direkt und ist **nicht** Teil dieses Dokuments.

Mockup (Zielentwurf, klickbar): https://claude.ai/code/artifact/c8328e42-db0b-411f-b26e-ec72a60a17ec

Das Mockup hat zwei Artboards:

| Artboard | Was es zeigt |
| --- | --- |
| **Einstellungen — überarbeitet** | Der ganze Screen bei 1600 × 900, bedienbar. Abhängigkeiten (Ton → Regler, Master → Unterschalter) lassen sich durchklicken |
| **Komponenten & Zustände** | Schalter, Dropdown, Segmented, Regler und Zeilen-Zeichen in allen Zuständen, mit Maßen |

Zwei Regler über den Artboards: **Deck** (Serie · Genesis · Titan · Gottgleich, Farben aus
`src/game/themes.js`) und **toenung** (9/5 % · 13/7 % · aus). Beide sind Prüfwerkzeuge, keine
Spieler-Optionen — siehe *Deck-Tönung*.

Bezug: die Fassung **ab 1280 px** (drei Panels nebeneinander). Die schmale Fassung ist nicht Teil
dieses Entwurfs; siehe *Abgrenzung*.

---

## Ausgangsproblem

Der Screen stand, trug aber vier Sorten Unruhe gleichzeitig:

1. **Dev-Optionen standen gleichrangig neben Spieler-Optionen.** „FPS-Zähler & Report" und
   „Test-Viewport" nahmen ein Drittel der mittleren Spalte ein und sind für Spieler ohne Bedeutung.
2. **Tote Fläche unten links.** Die Spalten endeten bei ~680 / ~1010 / ~790 px. Unter der ersten
   Spalte blieben ~350 px Leere, durch die das Spielfeld schien — das liest sich als Fehler, nicht
   als Weißraum.
3. **Uneinheitliche Bedienelemente.** Zwei Schalter-Breiten, drei Ausprägungen derselben
   Segmented-Auswahl, Regler ohne Wertanzeige, drei Akzentfarben (Deckfarbe, Grün, Gold) ohne
   erkennbare Regel.
4. **Master/Unterschalter zu leise.** „Floating-Text anzeigen" sah aus wie jede andere Zeile; dass
   die drei Zeilen darunter von ihr abhängen, trug allein eine dünne Einrück-Kante.

Zwei Punkte aus der ersten Kritik haben sich am Code **nicht** bestätigt und sind hier bewusst
*nicht* als Aufgabe geführt: die Lautstärke-Regler waren bereits an „stumm" gekoppelt (nur zu leise,
um als gesperrt zu lesen), und die doppelten Zeilen-Zeichen waren die beiden Dev-Zeilen — die fallen
mit ihnen ohnehin weg.

---

## Zielstruktur

### Spaltenaufteilung

| Spalte | Sektionen |
| --- | --- |
| 1 | **Allgemein** — Sprache · Haptik · Ruhiger Modus · Anonyme Spieldaten senden |
| 2 | **Ton** — Ton · Effekt-Lautstärke · Musik-Lautstärke<br>**Grafik & Leistung** — Auflösung · Effekte reduziert |
| 3 | **HUD & Text** — Floating-Text (Master + 3 Unterschalter) · Stich-Aufschlüsselung · Zahlengröße |

Ergibt Spaltenhöhen von rund **470 / 530 / 540 px**. Der Screen passt damit ohne Scroll in ein
900 px hohes Fenster.

**Warum Ton in der Mitte und nicht links:** Ohne die Dev-Zeilen trägt „Grafik & Leistung" nur noch
zwei Optionen. Ton nach links unter „Allgemein" zu ziehen würde die mittlere Spalte auf diese zwei
Zeilen reduzieren — die Raggedness wäre nur umgezogen. Wer Ton zwingend links haben will, braucht
ein anderes Raster: **zwei** Spalten (Allgemein + Ton | Grafik + HUD) bei ~1180 px Kartenbreite,
dafür ca. 1000 px Höhe, also Scroll unter 1000 px Fensterhöhe. Diese Variante ist **nicht**
freigegeben, sondern hier nur als bekannte Alternative festgehalten.

### Kopf

- Eyebrow „OPTIONEN" (Deckfarbe) · Titel „Einstellungen" · darunter als **Unterzeile**
  „Alles sofort wirksam und gespeichert."
  Die Auskunftszeile steht damit am Titel, nicht rechts daneben hinter einem Trennstrich — eine
  Kontur weniger, und die Ansage gehört ohnehin zum Titel.
- Rechts der Schließen-Knopf. **Ohne Esc-Chip** und ohne Esc-Hinweis im Fuß — Escape funktioniert
  weiter, wird aber nicht beworben (Owner-Entscheidung).
- Darunter die Haarlinie im Zwei-Farben-Verlauf der Deckfarbe: `a1 → a2 → a1`.

### Fuß (neu)

Volle Breite unter den Spalten, an der **Unterkante** der Karte verankert (nicht direkt unter der
höchsten Spalte):

- links: **„↺ Alles auf Standard zurücksetzen"** — ruhiger Textknopf, kein Signalknopf.
- rechts: „Änderungen wirken sofort" in `#5c5c68`.

---

## Was wegfällt, was dazukommt

**Weg:**

- „FPS-Zähler & Report" und „Test-Viewport" aus dem Spieler-Screen.
- Der Esc-Chip am Schließen-Knopf.
- Der Prozentwert aus der Beschreibung von „Zahlengröße" (steht jetzt am Regler).

**Neu:**

- **Auflösung** (siehe unten) als erste Zeile in „Grafik & Leistung".
- **Fußzeile** mit Zurücksetzen.
- **Dropdown** als eigene Auswahl-Komponente.

**Umbenannt:**

| Vorher | Nachher | Warum |
| --- | --- | --- |
| Sektion „Anzeige" | **„HUD & Text"** | „Anzeige" und „Grafik & Leistung" überlappten semantisch; alles in der Sektion betrifft Aufschriften über dem Feld |
| „Ton stumm" (an = stumm) | **„Ton"** (an = Ton an) | Grün heißt im Spiel „an". Ein grüner Schalter, der Ton *abschaltet*, sagt das Gegenteil |
| Unterschalter „↳ Score" usw. | **„Score"**, **„Multiplikator"**, **„Sieg / Niederlage"** | Der „↳"-Vorsatz ist redundant, sobald Einrückung und Kante die Zugehörigkeit tragen |

---

## Auflösung (neue Option)

Ersetzt an dieser Stelle den früheren Test-Viewport, ist aber eine **Spieler-Option** und heißt
entsprechend nicht mehr so.

- Auswahl über Dropdown: **Automatisch** · 1280 × 720 · 1600 × 900 · 1920 × 1080 · 2560 × 1440
  (die vier Größen stehen so in `src/ui/testViewport.js`).
- Zahlen in Geist Mono, damit die Stellen untereinander stehen.
- Erste Zeile der Sektion, über „Effekte reduziert".

**Offen (Owner):** Der Beschreibungstext im Mockup — *„Feste Bildgröße statt der vollen Fenstergröße.
‚Automatisch' folgt dem Fenster."* — ist **Platzhalter**. Er muss geschrieben werden, sobald
feststeht, was die Option für Spieler tatsächlich tut und ob das Umschalten weiterhin die Seite neu
lädt. Ebenfalls offen, ob „Automatisch" der richtige Name für den Standardzustand ist.

---

## Komponenten-Kanon

Eine Größe je Komponente, keine Ausnahmen. Alles Bedienbare misst **44 px in der Höhe** — sichtbar
ist jeweils weniger, das Klickziel ist die volle Höhe.

### Schalter

| | |
| --- | --- |
| Spur | 46 × 26 px, vollrund |
| Klickfläche | 46 × 44 px |
| Griff | 20 × 20 px, `#f2f2f4`, 2 px Innenabstand an beiden Enden |
| an | Fläche und Rand `#5ab87a` |
| aus | Fläche `#30303a`, Rand `#3a3a44` |
| gesperrt | Zustandsbild bleibt, Deckkraft 42 %, nimmt keine Eingabe an — **auch nicht per Tastatur** |

Grün ist im Spiel „an". Gold bleibt Währung und Ziel und kommt in diesem Screen nicht vor.

### Dropdown (neu)

Für alles, was **wachsen wird** — Sprachen, Auflösungen.

| | |
| --- | --- |
| Knopf | min. 172 × 44 px, Radius 8, Rand `#3a3a44`, Fläche `rgba(19,19,26,.9)`, Text `#f0eefc` |
| Chevron | 12 px, `#8a8a95`, dreht beim Öffnen um 180° |
| Liste | Radius 10, Rand `#3a3a44`, Fläche `#1b1a24`, Schatten `0 16px 40px rgba(0,0,0,.55)` |
| Eintrag | min. 36 px, Radius 6, `#c9c9d2`; Hover `rgba(255,255,255,.05)` |
| gewählt | heller (`#f0eefc`) **und** Haken in der Deckfarbe — nicht nur fettere Schrift |
| Zahlenlisten | Geist Mono, tabellarische Ziffern |

Feste Knopfbreite, damit der Kasten beim Wechseln der Auswahl nicht springt. Klick daneben schließt.

### Segmented

Bleibt **nur** für zwei bis drei feste Zustände, die nie mehr werden — im Screen also ausschließlich
„Effekte reduziert" (Aus · Mobile · An). Alles Wachsende geht ins Dropdown.

| | |
| --- | --- |
| Rahmen | 1 px `#3a3a44`, Radius 8, geteilte Kontur zwischen den Feldern |
| Feld | 9 × 15 px Polsterung, min. 44 px hoch |
| inaktiv | Fläche `rgba(19,19,26,.9)`, Text `#8a8a95` |
| aktiv | Fläche `rgba(32,32,44,.95)`, Text `#f0eefc` **und** 2 px Unterkante in der Deckfarbe |

Die Unterkante allein war zu leise — der aktive Zustand braucht beide Signale.

### Regler

| | |
| --- | --- |
| Breite | 148 px, Greiffläche 44 px hoch |
| Spur | 6 px, Radius 3, Rest `#2a2a34` |
| Füllung | Deckfarbe, links vom Griff |
| Griff | 16 px, `#f2f2f4`, 2 px Rand `#14141a` |
| Wert | rechts daneben, Geist Mono, tabellarisch, `#c9c9d2`, feste Mindestbreite 46 px |
| gesperrt | Deckkraft 42 %, Wert zeigt **„stumm"** statt einer Zahl |

**Wichtig:** Der Farbwechsel gehört unter den **Griff**, nicht an das Prozentmaß der Spur. Der 16-px-
Griff wandert nur zwischen 8 px und 140 px; eine reine Prozentfüllung läuft ihm an beiden Enden um
8 px davon.

Alle drei Regler tragen dieselbe Farbe (Deckfarbe). Ein Regler ist Chrome, kein Zustandssignal —
Grün bleibt den Schaltern vorbehalten, Gold der Währung.

### Zeilen-Zeichen

28 × 28 px Kachel, Radius 8, Zeichen 16 px. Farbe folgt dem Zeilenzustand: **an `#5ab87a`**,
**aus / gesperrt `#3a3a48`**; der Rand ist eine 42-%-Mischung derselben Farbe, die Fläche
`rgba(255,255,255,.03)`.

**Gezeichnete SVG statt Textglyphe.** Die bisherigen Zeichen waren Unicode-Glyphen und hingen damit
am Schriftschnitt — das ☾ des Ruhigen Modus las sich je nach Fallback als „C". Ein Strich-Satz,
16 px Raster, gleiche Strichstärke, `currentColor`.

---

## Zustände und Abhängigkeiten

Zwei Abhängigkeiten müssen **sichtbar** sein, nicht nur wirksam:

**Ton → Lautstärke-Regler.** Ist „Ton" aus, fallen beide Regler auf 42 % Deckkraft, nehmen keine
Eingabe an, und ihr Wert zeigt „stumm" statt einer Zahl. Eine Zahl, die nichts bewirkt, ist die
schlechtere Antwort als das Wort, das sagt warum.

**Floating-Text-Master → drei Unterschalter.** Master und Unterschalter stehen in **einem
umschlossenen Block**: Master oben mit Trennlinie darunter, die drei Unterschalter eingerückt an
einer 2-px-Kante in der Deckfarbe (40 % Deckkraft). Ist der Master aus, fällt die Untergruppe auf
42 % und nimmt keine Eingabe an.

Verhalten des Masters bleibt wie bisher: er spiegelt „irgendetwas sichtbar" und setzt beim
Umschalten alle drei zugleich.

**Bekannter Nebeneffekt, bewusst nicht gelöst:** Schaltet man den letzten aktiven Unterschalter
einzeln aus, kippt der Master auf „aus", sperrt die anderen beiden, und der Weg zurück über den
Master schaltet *alle drei* wieder ein — die vorherige Auswahl geht verloren. Das ist das heutige
Verhalten. Falls es stören soll, wäre die Antwort ein Mixed-State am Master; das ist eine eigene
Entscheidung und **nicht** Teil dieses Auftrags.

---

## Deck-Tönung

Die drei Sektions-Panels tragen die aktive Deckfarbe **in der Fläche**, nach dem Rezept, das die
Hub-Kacheln (`.as-hub-tile`) schon benutzen:

- Verlauf von oben nach unten: **9 %** Deckfarbe über dem oberen Grundton, **5 %** über dem unteren.
- Rahmen: **26 %** Deckfarbe.
- Die Options-**Zeilen** darin bleiben **neutral**. So liest sich die Tönung als Fläche, und der Text
  sitzt weiter auf ruhigem Grund.
- Die Haarlinie zieht den echten Zwei-Farben-Verlauf `a1 → a2 → a1`.

9/5 % ist gegenüber den 13/7 % der Hub-Kacheln bewusst zurückgenommen: mehr Tönung heißt linear mehr
Deck-Gefühl und weniger Textkontrast. Der Regler „toenung" im Mockup schaltet zwischen 9/5, 13/7 und
aus, um genau das vergleichen zu können.

**Prüfen mit hellen Decks.** Die 40 Decks schwanken stark in der Helligkeit. Der ehrlichste Test ist
**Gottgleich** (`#e6b93a`) — bei Gold trennt genau diese Stufe „getöntes Panel" von „bräunlichem
Panel". Sollte 9/5 dort noch zu viel sein, ist der nächste Schritt **nicht** weiter herunterdrehen,
sondern die Deckfarbe vorher auf Weiß abmischen — dasselbe Mittel, mit dem `.as-hub-glyph` die
Helligkeitsschwankung über die Decks abfängt.

---

## Texte

Bestehende Zeichenketten bleiben unverändert, außer den hier genannten. Alles Neue muss in **beiden**
Katalogen stehen.

| Stelle | Text |
| --- | --- |
| Sektion Anzeige | „HUD & Text" |
| Ton (Titel) | „Ton" |
| Ton (Beschreibung) | „Alle Klick- und Spiel-Sounds. Aus = komplett stumm." |
| Unterschalter | „Score" · „Multiplikator" · „Sieg / Niederlage" (ohne „↳") |
| Floating-Text (Beschreibung) | „Aufsteigende Zahlen und Texte über dem Feld. Schaltet die drei Arten darunter gemeinsam. Die großen Ansagen (Stark/Brutal/Irre/Gottgleich) bleiben immer sichtbar." |
| Zahlengröße (Beschreibung) | „Größe der aufsteigenden Score-Zahlen." — **ohne** `{pct}` |
| Regler-Wert gesperrt | „stumm" |
| Fuß links | „Alles auf Standard zurücksetzen" |
| Fuß rechts | „Änderungen wirken sofort" |
| Auflösung | Titel „Auflösung"; Beschreibung **offen**, siehe oben |

Die Telemetrie-Beschreibung ist im Mockup gekürzt dargestellt, damit die Spalte im Bild bleibt. Der
**bestehende** Text bleibt gültig — er ist bewusst so ausführlich, weil an dieser Zeile die
Datenschutz-Entscheidung fällt. Nicht kürzen.

Player-sichtbarer Text folgt `docs/text-style-guide.md` und den Katalog-Konventionen aus
`docs/localization/i18n.md`.

---

## Abgrenzung

Nicht Teil dieses Auftrags:

- Die **schmale Fassung** unter 1280 px. Sie bleibt, wie sie ist. Die Komponenten-Maße oben gelten
  aber auch dort, sobald sie angefasst wird — insbesondere die 44-px-Regel.
- **Wohin die Dev-Optionen wandern.** Dass sie aus dem Spieler-Screen verschwinden, ist entschieden;
  wo sie stattdessen leben, entscheidet der Owner mit dem Worker.
- **Mixed-State** am Floating-Text-Master (siehe oben).
- Jede Änderung an Gameplay, Fraktionen oder Spielfeld.
- Die technische Umsetzung insgesamt — Komponenten-Schnitt, Zustandshaltung, wo CSS liegt,
  Test-Abdeckung. Das bespricht der Owner mit dem Worker.

---

## Offene Punkte für den Owner

1. Beschreibungstext und Standard-Name („Automatisch"?) für **Auflösung**.
2. Wohin die **Dev-Optionen** wandern.
3. Ob 9/5 % Tönung bei hellen Decks trägt — Entscheidung fällt am gebauten Screen, nicht am Mockup.
4. Ob der Master einen **Mixed-State** bekommen soll.
