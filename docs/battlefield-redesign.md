# Lauf-Bildschirm — Neu-Aufbau der Instrumente (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Reiner Design-Auftrag — die technische Umsetzung
(Komponenten-Schnitt, CSS-Ablage, Tests, State für die Umschaltungen) bespricht der Owner mit dem
umsetzenden Worker und ist **nicht** Teil dieses Dokuments.

Bezug: die Fassung **ab 1280 px**. Geprüft an **1280 × 720 · 1400 × 700 · 1536 × 791**, nie gegen 1920.

**Lies zuerst `docs/design-sprache.md`.** Dieses Dokument setzt darauf auf. Zur Abgrenzung siehe
*Was von der Design-Sprache gilt* weiter unten — der Lauf ist kein Overlay, und es gilt nicht alles.

**Die Bühne wird nicht angefasst.** `#buehne` (19.08.2026) ist richtig und bleibt: 2,5 : 1, drei
Deckel, kein Beschnitt. Dieser Auftrag betrifft ausschließlich die Instrumente darum herum.

---

## Wie gemessen wurde

Produktionsbuild (`npm run build`), Vite-Preview, echter CDP-Viewport. Der Lauf-Zustand ist **nicht
erfunden**: ein Skript fährt den echten Reducer headless bis zu einem gewählten Durchlauf (dasselbe
Muster wie `sim/run.js`) und schreibt den State heraus; er geht als `as_activerun` in den Speicher
und wird über „Lauf fortsetzen" geladen (`App.jsx:999`, `RESTORE_RUN`). Direkt danach wird pausiert —
sonst löst der Lauf weiter Stiche auf und zwei Messungen desselben Falls wären nicht dieselbe Messung.

Fünf Zustände, alle bei Durchlauf 44–47, Phase „play". Ein Strich heißt „nicht eigens erhoben",
nicht „null":

| | Fraktionen | Skills | Familien | Gletscher | Wochen-Mods |
| --- | --- | --- | --- | --- | --- |
| fac1 | 1 (Eis) | 7 (1 leg) | 15 | 10 | 0 |
| fac2 | 2 | 7 | 15 | – | 0 |
| fac4 | 4 | 7 | 15 | – | 0 |
| ranked | 4 | **12** (2 leg) | 9 | 8 | 4 |
| eis | 1 (Eis) | 7 | – | **18** | 0 |

Die 12 Skills im Ranglisten-Lauf sind kein Ausreißer, sondern die Wochen-Mod „Skill-Fülle"
(`reducer.js:278`, `effSkillSlots`).

**Zwei Fallen, beide benannt, weil sie Messungen still falsch machen:**

- `maybeResetForEpoch` (`storage.js:329`) wischt beim Start den ganzen Speicher, wenn
  `as_reset_epoch` fehlt. Ohne den Stempel misst man immer leere Zustände.
- **Was ein Panel nicht abschneidet, meldet keinen Überlauf.** Ein gestrecktes Flex-Kind mit
  `overflow: visible` gibt über `scrollHeight` immer seine eigene Boxhöhe zurück — es „passt" also
  scheinbar immer. Gemessen wird der Bedarf deshalb an einem **Klon im freien Rahmen**, auf die
  tatsächlich gerenderte Breite gesetzt und in der Höhe frei.

---

## Ausgangsbefund

### Die Bank ist überbucht, nicht schlecht sortiert

Ungekürzter Bedarf der sechs Spuren bei vier Fraktionen: Multiplikatoren 402 · Blitz 333 · Feuer 207
· Pflanze 325 · Eis 356 · Build 837 = **2460 px**. Verfügbar bei 1280 × 720: **1140 px**. Faktor 2,2.
In der Höhe 2044 px Inhalt auf 723 px Fläche.

**Keine Umverteilung allein löst das** — es muss Inhalt aus der Dauersicht heraus.

### Die Breite hing an der Anzahl, nicht am Inhalt

Gemessen bei 1280 × 720:

| Lauf | Fraktions-Spuren | Breite **je Spur** |
| --- | --- | --- |
| 1 Fraktion | 1 | 584 px |
| 2 | 2 | 286 px |
| 3 | 3 | 187 px |
| 4 | 4 | 137 px |
| 4 + Rangliste | 4 | **60 px** |

Faktor **9,7** für dasselbe Panel mit demselben Inhalt. Gleichzeitig standen `.rn-rail`,
`.rn-build` und `.rn-week` in **jedem** dieser Fälle auf fest 296 px (`index.css:6052–6054`) und die
Fraktionsspuren auf `flex: 1 1 0` (`index.css:6040`) — die Panels mit dem variabelsten Inhalt
bekamen die feste Breite, die mit fester Bauform die variable. Das ist §1 *Spaltenbreiten folgen dem
Inhalt* genau andersherum.

### 35 % des Inhalts war sichtbar

1280 × 720, vier Fraktionen: sechs eigene Scrollbereiche in einer 210 px hohen Bank, **723 px von
2044 px** Inhalt sichtbar. Einzeln: Build 640 px Inhalt in 210 (×3,05) · Multiplikatoren 311 in 210
· Eis-`fac-body` 363 in 33 (×11). Von 15 Perk-Familien standen vier im Bild.

### Höhe ist kein Ausweg

Gemessen, indem `--rn-chrome` zur Laufzeit verstellt wurde:

| Bank | Bühne 1280 × 720 | Karte |
| --- | --- | --- |
| 210 (damals) | 850 × 340 | 94 × 129 |
| +60 | 700 × 280 | 77 × 107 |
| +120 | 550 × 220 | 61 × 84 |

Linear und an allen drei Größen identisch: **1 px Bank = 2,5 px Bühnenbreite.** Die Lösung musste
aus Breite und aus Weglassen kommen.

---

## Der Zielentwurf

### Aufbau

```
Kopfzeile          Marke · Steuerung · Glossar          (unverändert)
Vitalleiste                                             (unverändert)
Bühnenzeile        Perks │ B Ü H N E │ Multiplikatoren
Band               Element im Fokus       │ Kopfzeilen der übrigen
```

Die **Bühnenzeile** ist neu: die beiden Instrumenten-Spalten stehen neben der Bühne statt unter ihr.
Der Platz war schon da — die Bühne ist schmaler als die Shell, gemessen **187 px je Seite** bei
1280 × 720, 272 px bei 1400 × 700, 226 px bei 1536 × 791.

### Die Bühne behält ihr Seitenverhältnis, und die Flanke richtet sich nach ihr

Das ist die tragende Entscheidung des Owners. **Die Flanke ist so hoch wie die Bühne** — nicht
umgekehrt. Streckt man die Reihe an einer zu hohen Flanke, wird das Spielfeldbild wieder
beschnitten (gemessen: 748 × 340 statt 748 × 299 sind 2,2 : 1 und kosten **12 % der Bildbreite**).

Die Reihenhöhe folgt derselben Drei-Deckel-Rechnung wie `--bf-w` heute (`index.css:5870`): native
Bildbreite · Fensterbreite · **und was die Höhe übrig lässt**. Der dritte ist nicht optional — ohne
ihn läuft die Bühne auf flachen Fenstern aus dem Bild (gemessen bei 1400 × 700: 29 px Überlauf).

Ergebnis:

| | Bühne | Verhältnis | Flanke |
| --- | --- | --- | --- |
| 1280 × 720 | 748 × 299 | 2,5 : 1 | 214 px |
| 1400 × 700 | 795 × 318 | 2,5 : 1 | 251 px |
| 1536 × 791 | 1005 × 402 | 2,5 : 1 | 214 px |

### Links: Perks als Zählfassung

Sieben Kategorien, im Code vorhanden und nicht zu erfinden: **Deck · Stich · Rolle · Score · Form ·
Präzision · Ausbau** (`perks.js:47`). Je Kategorie ein Feld mit der Anzahl.

**Ohne die Zählfassung ist die Spalte unmöglich:** die Chipliste braucht in einer Flanke gemessen
**640–656 px** bei 299–402 px Platz. Als sieben Zählfelder sind es **286 px**.

Ein Klick auf ein Feld **schaltet die Spalte um** auf diese Kategorie — dieselbe Fläche, dieselben
Maße, eine Rückzeile „Alle Kategorien". Kein Überzug über der Bühne (§1: *ein Panel, das umschaltet,
verdeckt nichts und braucht keine dritte Ebene*).

Die Restluft auf der Detailseite ist **kein Loch, sondern der Platz für die Beschreibungen** — drei
Einträge brauchen 130 px, die Spalte hat 299–402.

### Rechts: Multiplikatoren, mit Analyse als zweiter Seite

Dauersicht: die vier Ablesungen (Formation · Gebäude · Crit-Chance · Crit-Mult). **277 px.**

**Zwei der vier tragen zwei Werte** — Formation (Anzahl *und* Bonus) und Crit-Chance (Prozent *und*
Ionisierungs-Anteil). Genau die bekommen die volle Spurbreite, die zwei einwertigen teilen sich eine
Zeile. Drei Zeilen statt zwei, dafür keine Ellipse.

*Verworfen und gemessen:* den Wert **umbrechen** zu lassen senkt die abgeschnittenen Stellen von 4
auf 2 und lässt die Spur von 340 auf **375 px** wachsen — die Seite lief dann 37 px über. Es
scheitert an der Höhe, nicht an der Breite.

**Die Bilanz** (Siege · Verluste · Quote · Stiche · Crits, gemessen 73 px) und die **Analyse**
(Bester Score · Score-Herkunft · Score-Verlauf, 77 px) verlassen die Dauersicht und bilden zusammen
die **zweite Seite** derselben Spur, erreichbar über eine schmale Zeile am Fuß. Beide sind Rückblick,
keine stehende Ablesung — die Zuordnung ist der Grund, die gewonnenen Pixel sind die Folge.

### Unten: ein Element im Fokus, die übrigen als Kopfzeilen

Gemessen: eine **eingeklappte Fraktionszeile ist 49 px hoch** und braucht 298 px Breite für ihre
Kopfzeile (Zeichen · Name · Zustands-Chip).

| | |
| --- | --- |
| Liste rechts | 310 px breit |
| Kopfzeilen | wachsen auf die Bandhöhe — bei drei Stück **65 px** je |
| Fokus-Panel links | **878 px** bei 1280 × 720 (statt 137), 1134 px bei 1536 |

Ein Klick auf eine Kopfzeile tauscht sie mit dem Fokus. Der **Zustands-Chip bleibt für alle
sichtbar** — das ist Bedingung, nicht Zierrat: sonst fällt genau der „gleich knallt's"-Blick weg,
den `gameplay-redesign.md` §4 als einzige Dauerinformation der Fraktionszeile nennt.

### Der Panel-Zuschnitt

Jedes Element-Panel zeigt in der Dauersicht: **Kopfzeile · zwei Ablesungen · Skill-Chips.**
Damit passen sie ins Band: Blitz 180 · Feuer 199 · Pflanze 168 · Eis 206, bei 210 px Fläche.

Mit dem heutigen vollen Inhalt bräuchte Blitz 396 px — der Zuschnitt ist Voraussetzung, nicht Zugabe.

**Welche zwei Ablesungen je Fraktion bleiben, ist offen** (siehe *Offene Punkte*).

### Eis: das 5 × 8-Brett statt der Kachelreihe

Der härteste Fall des Screens. **Erreichbar sind 18 Gletscher** — gemessen im echten Reducer
(Durchlauf 46, 7 Eis-Skills, „Eiszeit" im Slot). Der Deckel `EISZEIT_MAX_GLACIERS = 16`
(`glacier.js:211`) begrenzt nur die **Flut**; jeder Eis-Skill friert über die `glacier-target`-Phase
zusätzlich ein Feld.

Als 18 Kacheln à 46 × 87 px:

| Breite | 200 | 320 | 500 | 620 | 900 | 1200 |
| --- | --- | --- | --- | --- | --- | --- |
| Höhe | 1116 | 725 | 469 | 437 | 437 | **344** |

**Selbst auf voller Bankbreite 344 px** — 134 zu viel, und zwischen 620 und 900 px passiert gar
nichts mehr, weil die Kachelreihe dort nicht weiter umbricht.

**Gewählt: das Brett selbst.** 5 Spalten × 8 Reihen, eine Zelle je Position, Zellgröße 11–14 px;
gefrorene Zellen tragen ihre Stufe in der Helligkeit (vier Stufen nach `THRESHOLDS = [4, 8, 12]`,
`glacier.js:15`), kritische (`KRIT_FROM = 9`, `GlacierBar.jsx:20`) einen Schein. Dazu drei
Zählfelder **bricht · kritisch · ruhig**.

**Das Brett bekommt einen hochformatigen Platz: links neben den Ablesungen, nicht unter ihnen.**
Das ist der Unterschied zwischen 259 px und 190 px — dieselbe Fassung, andere Achse.

Vier Fassungen wurden mit denselben echten 18 Gletschern bei 878 px gemessen:

| | voll | im Zuschnitt |
| --- | --- | --- |
| heute — 18 Kacheln | 390 | 298 |
| Kacheln kleiner, ohne Bildfeld | 256 | 164 |
| Brett hochkant, **unter** der Zeile | 351 | 259 |
| Brett quer, 40er-Streifen | 287 | 196 |
| **Brett hochkant, links daneben** | **246** | **190** |

**Warum das Brett und nicht die kleineren Kacheln:** die Höhe hängt an **nichts** — 40 Zellen, ob
drei gefroren sind oder achtzehn. Und die Kopfzahlen des Panels sind ohnehin Aussagen über Lage und
Gruppierung („Kaskade 9 brechen", „Größtes Cluster 18"); im gemessenen Stand bilden alle 18
Gletscher *ein* Cluster, und das ist der Grund für 8,1 Mio. Ertrag. Das Brett zeigt es, achtzehn
Massezahlen zeigen es nicht.

**Kosten, ehrlich:** die Masse je Gletscher verlässt die Dauersicht (bleibt im Tooltip der Zelle),
und die drei Stufen-Segmente je Gletscher fallen — die Stufe steckt in der Helligkeit.

### Die Wochen-Modifikatoren sind keine Dauerspur

Sie stehen bei Laufbeginn fest (`reducer.js:281` schreibt sie **einmal** in den State) und ändern
sich nie. Sie nahmen 296 px Dauerplatz und drückten die vier Fraktionsspuren von 137 auf **60 px**.

*Gemessen und verworfen:* sie unter die Multiplikatoren zu hängen — die Spur braucht dann **528
statt 335 px** und die Seite läuft 178–198 px über. Sie brauchen einen eigenen Platz; wo, ist offen.

### Die Löcher

**Luft mitten im Panel war ein Fehler, und er ist eine Zeile.** `.fac-body` ist ein Raster mit
`flex: 1 1 auto`; seine Zeilen strecken sich auf die Panelhöhe — gemessen bei Pflanze eine
42-px-Zeile für 17 px Inhalt und eine 38er für 17. `align-content: start` darauf: **Zeilenluft
70 → 4 px.**

**Luft am Fuß** verschwindet über §1 *Mehrhöhe geht in die Kacheln*: die Zählfelder der Perks, die
Kennzahl-Kacheln der Multiplikatoren und die Kopfzeilen der Element-Liste wachsen mit der
Spaltenhöhe (Kopfzeilen 49 → 65 px bei drei Stück).

---

## Ergebnis, gemessen

Vier Lauf-Formen × drei Größen = zwölf Zellen:

| | vorher | nachher |
| --- | --- | --- |
| eigene Scrollbereiche | 6 | **0** |
| abgeschnittene Textstellen | 3–4 | **0** |
| sichtbarer Anteil des Inhalts | 35 % | **100 %** |
| Seitenhöhe gegen Fenster | +2 bis +22 px | **exakt** |
| Bühne | 850 × 340 (2,5 : 1) | 748 × 299 (2,5 : 1) |

Die Bühne wird bei 1280 × 720 um 102 px schmaler. Das ist der Preis der Flanken, und der Owner hat
ihn bewusst bezahlt: **die Flanke zahlt, nicht die Bühne** — deshalb behält sie ihr Verhältnis und
wird kleiner statt beschnitten.

---

## Was von der Design-Sprache gilt

`design-sprache.md` heißt *Overlays und Menüs*. **Der Lauf ist keins von beidem** — kein Überzug,
keine Karte, kein Schließen-Knopf, und er wird nicht gelesen, sondern beobachtet, während er sich
bewegt.

| | gilt | Begründung |
| --- | --- | --- |
| **§1 Fundament** | **ja** | Spaltenbreiten nach Inhalt, Restluft an den Fuß, Zählen statt aufzählen, Hochformat, umschaltendes Panel — alles reine Layout-Logik, und die Befunde dieses Screens sind genau ihre Verletzungen |
| §2 Kopf-Kanon | nein | der Lauf hat keinen Overlay-Kopf und keine Aktionszone |
| §3 Farbrollen | **teilweise** | die vier Fraktionsfarben sind hier **Inhalt**, nicht Chrome — sie bleiben |
| §4 44 px | nein | gemessen sind 19 von 22 Bedienelementen der Bank kleiner; ein Kopf, der auf 44 px wächst, kostet die Bühne Höhe |

**Diese Abgrenzung ist eine Entscheidung dieses Auftrags und gehört in den Kanon**, nicht nur
hierher — sonst zieht der nächste Screen Regeln nach, die für ihn nie gedacht waren.

---

## Für den umsetzenden Worker

**`.rn-rail`, `.rn-build` und `.rn-week` tragen im JSX noch `lg:col-start-*` / `lg:row-start-*` aus
dem Layout vor `#buehne`.** In einer Flex-Reihe sind das tote Haken — kaum ist die Bank ein Raster,
platzieren sie sich selbst. Der erste Überzugs-Versuch bekam dadurch drei Zeilen à 93 px statt einer
à 210, und es war erst zu sehen, als die berechneten Rasterzeilen ausgelesen wurden.

---

## Verworfene Richtungen

**Flügel über der Bühne.** Der Owner hat sich für die umschaltende Flanke entschieden, nachdem die
Geometrie auf dem Tisch lag. Gemessen, wo die Kartenplätze liegen (x vom linken Bühnenrand):

| | 1280 × 720 (Bühne 850) | 1536 × 791 (Bühne 1028) |
| --- | --- | --- |
| dein Stapel · deine Karte | 216–309 · 318–411 | 261–374 · 384–497 |
| Gegner | 439–532 · **541–634** | 530–643 · **654–767** |

Ein Flügel von rechts in der gezeichneten Größe (rund 380 px) deckt bei 1280 den Bereich 470–850 —
also **beide Gegnerplätze**. Von links lässt er bei 1536 die eigene Karte frei und überlappt sie bei
1280 um 62 px. Dazu §1: *Kein Overlay dafür … verdeckt genau das, wozu die Liste gehört* — hier
wiegt das schwerer als in einem Menü, weil das Verdeckte das laufende Spiel ist.

**Auto-Kollaps der Fraktions-Panels als Lösung.** Er ist auf dem Desktop bewusst aus
(`App.jsx:1258`, `manyActive={wide ? false : manyFac}`) mit der Begründung *„die Bank stellt ihre
Spuren ohnehin nebeneinander"* — bei 60–137 px trägt das nicht. Eingeschaltet und nachgemessen:
abgeschnittener Text 4 → 0, sichtbarer Anteil 35 → 44 %, **aber am Build (430 px verborgen) und an
den Multiplikatoren (101 px) ändert er nichts.** Als Sofortmaßnahme brauchbar, als Lösung nicht.

**Die Bank höher machen.** 1 px Bank = 2,5 px Bühnenbreite; +60 px kosten die Karte 18 % ihrer
Breite.

**Waagerecht scrollende Bank.** Verlegt das Problem in eine Geste, die während eines laufenden
Stichs niemand macht.

---

## Abgrenzung

Nicht Teil dieses Auftrags:

- Die Fassung unter 1280 px.
- **Die Bühne selbst** (`#buehne`) — Seitenverhältnis, Kartenmaße, Flugstrecke, Deckstapel.
- Die Vitalleiste und die Kopfzeile.
- Jede Änderung an Mechanik, Fraktionen oder Spielfeld.
- Die technische Umsetzung insgesamt.

---

## Offene Punkte für den Owner

1. **Welche zwei Ablesungen je Element-Panel in der Dauersicht bleiben.** Im Mockup sind es
   mechanisch die ersten zwei der heutigen Reihenfolge — bei Eis also Gletscher-Ertrag und die
   Kennzahl-Reihe. Ob das die richtigen zwei sind, ist eine Aussage darüber, was ein Spieler
   während eines laufenden Stichs sehen muss, und keine Layout-Frage. Betrifft alle vier Fraktionen
   einzeln.
2. **Wohin die Wochen-Modifikatoren wandern.** Sie sind lauf-konstant und dürfen keine Dauerspur
   belegen (gemessen: in der Flanke sprengen sie die Seite um 178–198 px). Kandidaten: eine
   Chip-Zeile in der Vitalleiste, oder eine dritte Seite der rechten Flanke neben Analyse.
3. **Ab wie vielen Elementen die Fokus-Liste erscheint.** Gemessen an den Randfällen: bei **einem**
   Element steht die 310-px-Liste leer daneben, bei **zwei** streckt sich die eine Kopfzeile auf
   210 px. Beides ist falsch. Vorschlag: die Liste erscheint erst ab drei Elementen; darunter teilen
   sich die Panels das Band (bei zweien je 594 px, bei einem die volle Breite). *Gerechnet aus den
   gemessenen Kurven, am gebauten Screen noch nachzumessen.*
4. **Ob die Detailseite der Perks-Spalte die Beschreibungen dauerhaft zeigt** oder erst beim Klick
   auf einen Eintrag. Der Platz ist da (drei Einträge brauchen 130 px von 299–402), die Frage ist,
   ob drei Beschreibungen nebeneinander lesbarer sind als eine ausgewählte.

---

*Angelegt 24.08.2026. Alle Zahlen im Produktionsbuild an 1280 × 720, 1400 × 700 und 1536 × 791
gemessen; der Vorschlag als Stil-Überzug über dem ausgelieferten Build eingehängt und dort
nachgemessen. Keine Zeile in `src/` wurde dafür geändert.*
