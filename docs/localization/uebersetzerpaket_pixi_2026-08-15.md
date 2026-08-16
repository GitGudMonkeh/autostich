# Autostich — Übersetzungspaket DE → EN

**Begleitdokument zu `strings_de_pixi_2026-08-15.csv`**
Quelle: Branch `Autostich/pixi` · Stand 2026-08-15 · **2 238 Strings**

> **Der deutsche Text ist bereinigt.** Die Sprachprüfung
> (`sprachpruefung_pixi_2026-08-15.md`) ist vollständig umgesetzt: sachlich falsche Aussagen sind
> korrigiert, Begriffs-Kollisionen aufgelöst, ein Begriff hat überall denselben Namen. Die
> Terminologie-Entscheidungen stehen in `docs/text-style-guide.md` §1 — **das ist die verbindliche
> Begriffsliste**, §3 unten ist ihre Übersetzungs-Zuordnung.
>
> Zwei Punkte sind bewusst so geblieben und in §9 erklärt.

---

## 1. Was ist Autostich?

Ein **Roguelite-Autobattler-Stechspiel**. Kernschleife in einem Satz: Deine 40 Karten und die 40 Karten
eines anonymen Gegners werden automatisch gegeneinander aufgedeckt — die höhere Zahl gewinnt den
*Stich*. Du greifst **nie in den Kampf ein**; du baust **zwischen** den Durchläufen einen Build, der
dein Deck, deine Kartenreihenfolge und deine Punktemultiplikatoren dauerhaft stärkt.

```
40 Stiche automatisch → Durchlauf-Ende → genau EINE Entscheidung
   (Skill · Perk · Aufstellung · Architekt) → nächster Durchlauf … 50 Runden lang → Ende
```

Es gibt **keine Lebenspunkte und keinen Tod** — der Lauf hat feste Länge, das Ziel ist der höchste
**Score**. Deshalb ist fast jeder Text ein *Regeltext*: eine Bedingung und eine Wirkung. Ton: knapp,
aktiv, in der Du-Form, ein bis zwei Sätze. Kein Fantasy-Pathos außer in den vier Archetyp-Leitfäden
(Kategorie `tutorial`, `tutorial.guide.*`) — die dürfen bildhaft sein.

**Die fünf Systeme, deren Vokabular du brauchst:**

| System | Worum es geht |
|---|---|
| **Karten & Stiche** | 40 Karten (4 Farben × Werte 1–10). Kartenwert = dauerhaft, Stichwert = nur dieser Stich, Kampfwert = Summe. |
| **Formationen** | Muster in der *Reihenfolge* deiner Karten (gleiche Werte, gleiche Farbe, aufsteigend, Zick-Zack). Sie geben Score-Multiplikatoren. |
| **Perks** | Dauerhafte Effekte in **Familien** mit vier Stufen (I–IV) plus seltene **legendäre** Einzelperks. |
| **Archetypen (Skills)** | Vier Elementardecks: **Blitz** (Crit/Ladung/Ionisierung), **Feuer** (Hitze/Asche/Schmiede), **Eis** (Gletscher/Masse/Bersten), **Pflanze** (Wachstum/Grün/Wurzeln). |
| **Der Architekt** | Nach manchen Durchläufen legst du Tetris-artige **Gebäude** auf ein 8×5-Brett, das deine 40 Deckpositionen abbildet. Kein Geld — die Begrenzung ist Platz. |

---

## 2. Die CSV

**Format:** UTF-8 ohne BOM · RFC-4180 (alle Felder gequotet, `""`-Escape) · CRLF · sortiert nach
`category` → `id`. Jede Zeile hat exakt 8 Spalten.

| Spalte | Bedeutung |
|---|---|
| `id` | Stabiler Schlüssel `kategorie.objekt.feld`. **Nicht ändern.** Wo das Spiel echte Keys hat, stecken sie drin (`ability.SK_FIRE_01.desc`, `item.family.D_STREAK.tier2.desc`). Reine UI-Texte: `ui.<komponente>.<slug>`. |
| `category` | `ui` · `item` · `tutorial` · `ability` · `achievement` · `store` · `system` |
| `de` | Der deutsche Ausgangstext, **exakt wie er im Spiel steht** |
| `en` | **Deine Spalte.** Leer geliefert. |
| `context` | Wo der Text erscheint + Datei:Zeile. Bei Variablen steht hier `Var.: {n} = …` |
| `limit` | Weiche Zeichenobergrenze, wo bekannt. `1` = **harte** Schranke (Karten-Badges). Siehe §6. |
| `status` | `new` bei Lieferung. Bitte auf `done` / `question` setzen. |
| `note` | `wortformen` = **keine Anzeige**, siehe §7 · „Eigenname … nicht übersetzen" |

**Neu erzeugen** (nach Balance- oder Textänderungen):
```bash
node scripts/export-strings.mjs
```
Die Datentexte (Skills/Perks/Familien/Gebäude/Glossar/Leitfäden) werden dabei aus den echten
Code-Registern **importiert** und mit aufgelösten Zahlen ausgeschrieben. Ein Diff der CSV zeigt
zuverlässig, was sich seit der letzten Lieferung geändert hat.

**Verteilung:**

| category | Zeilen | Inhalt |
|---|---:|---|
| `item` | 687 | Perk-Familien (4 Stufen), legendäre Perks, Architekt-Gebäude, Decks/Packs/Effekte, Wochen-Modifikatoren |
| `ui` | 593 | Oberfläche: Buttons, Labels, HUD-Leisten, Phasen, Formations-/Farb-/Archetypnamen |
| `tutorial` | 494 | Glossar (Begriff + Erklärung + Wortformen) und die vier Archetyp-Leitfäden |
| `achievement` | 208 | Endbildschirm, Bestenlisten, Statistik-Hub, Upgrade-Baum, Freischaltungen |
| `ability` | 168 | 84 Archetyp-Skills, je Name + Beschreibung |
| `store` | 77 | Der Architekt (Bauphase) |
| `system` | 11 | Seed, Name, Laden, App-Installation |

---

## 3. Kanonische Begriffe — DE → EN

Das ist der wichtigste Abschnitt. Autostich hat ein enges, wiederkehrendes Regelvokabular; **eine
deutsche Vokabel muss durchgängig auf genau eine englische abgebildet werden.** Die Spalte
„Vorschlag EN" war ein Vorschlag. **Seit 2026-08-15 ist die Tabelle FREIGEGEBEN und eingefroren** —
ab hier ist sie Prüfregel, nicht Diskussionsgrundlage (`test/i18n-guards.test.js`).

> **Freigabe-Entscheidungen vom 15.08.2026** (alle drei offenen Punkte plus eine Korrektur):
> 1. `Aufstellungsphase` → **`order phase`** (nicht `layout phase`).
> 2. `Formations-Energie` → **`order energy`** (zieht mit Punkt 1 mit).
> 3. `Gönn dir` → **`LET’S GO!`** (nicht `TREAT YOURSELF` — Wirkung vor Wörtlichkeit).
> 4. `Stark` → **`FIERCE`** (nicht `STRONG` — steigert besser in die Kette FIERCE › BRUTAL › INSANE › GODLIKE).
> 5. Deutsche Seite: Raritätsstufe IV heißt jetzt **„Episch"** statt „Rar" (im Code umgesetzt,
>    `TIER_META` in `rarity.js`). Die englische Leiter bleibt Common · Uncommon · Rare · **Epic**.
>
> **Woher die Vorschläge kommen:** Die Kernbegriffe sind gegen die Genre-Konvention geprüft
> (Balatro, Slay the Spire, Hearthstone, Super Auto Pets, TFT, klassische Stichspiele) — die
> Begründung je Begriff steht in `genre-terminologie.md`. Kurz: `cycle` und `trick` sind die
> etablierten Fachbegriffe, nicht Übersetzungen; die Raritätsleiter endet auf `Epic` statt
> `Legendary`, weil „legendär" bei uns eine eigene Achse ist; unsere eigenwilligen Wörter
> (Weißglut, Firn, Grenzbonus) bleiben distinktiv, weil genau das die Genre-Norm ist.


### 3.1 Grundbegriffe

| DE (kanonisch) | Vorschlag EN | Anmerkung |
|---|---|---|
| Stich | **trick** | Kartenspiel-Fachbegriff, nicht „round" |
| Durchlauf | **cycle** | ein kompletter Deck-Durchlauf = 40 Stiche · **das einzige Wort dafür** (im HUD als „Durchl." gekürzt) |
| Position | **position** | fester Platz 1–40 in der Ziehreihenfolge — daran hängen Perks/Anker/Gebäude |
| Lauf / Run | **run** | ein ganzes Spiel (50 Durchläufe) |
| Sieg / Niederlage / Gleichstand | win / loss / tie | Banner: WON / LOST / TIE |
| Kartenwert | **card value** | dauerhafter Wert |
| Stichwert | **trick value** | nur für diesen Stich |
| Kampfwert | **combat value** | Kartenwert + alle Stichwert-Boni |
| Wertvorsprung / Marge | **margin** | |
| Score | **score** | bleibt „score", nicht „points" |
| Direkt-Score | **direct score** | Score ohne Serien-/Crit-/Formations-Multiplikator |
| Serie (Siegesserie) | **streak** | |
| Serienpunkt | **streak point** | eine Stufe der Serie |
| Crit | **crit** | Kurzform bleibt |
| Crit-Chance / Crit-Multiplikator | crit chance / crit multiplier | |
| Prozent (`%`) | **percent (`%`)** | additive Crit-Angaben stehen in % |
| Prozentpunkte | **percentage points** | nur wo gegen die 100-%-Schwelle gerechnet wird (3 Stellen) |
| Multiplikator | multiplier | Malzeichen bleibt `×` |
| Faktor | factor | |
| Neuwurf / Reroll | **reroll** | |
| Seed | seed | |
| Geist / Rekord | ghost / record | |

### 3.2 Deck, Farben, Aufstellung

| DE | Vorschlag EN |
|---|---|
| Deck | deck |
| Farbe (Rot · Blau · Grün · Gelb) | suit (Red · Blue · Green · Yellow) |
| Farbserie | suit streak |
| Ziehreihenfolge / Kartenreihenfolge | **draw order** |
| Segment (5 Positionen) | **segment** |
| Segmentgrenze | segment boundary |
| Position | position |
| Aufstellungsphase | **order phase** |
| Formations-Energie | **order energy** |
| Tausch | swap |
| Chronik | **chronicle** (Kartenübersicht) |

### 3.3 Formationen

| DE | Vorschlag EN | Kürzel (1 Zeichen, hart!) |
|---|---|---|
| Formation | **formation** | — |
| Wiederholung | **repeat** | W → **R** |
| Farbblock | **suit block** | F → **B** |
| Treppe | **stair** | T → **S** |
| Wechsel | **zigzag** | Z → **Z** |
| Anker | **anchor** | A → **A** |
| Nachhall | **echo** | N → **E** |
| (Formations-)Kern | **core** | K → **C** |
| Grenzbonus | **crossover bonus** | G → **X** |
| Überlappung | overlap | — |
| Joker | **wild** | „joker" ist im EN eine Spielkarte |
| Bindeglied | **link** | |
| Farballianz | suit alliance | |
| Farbblock-Transparenz | suit-block transparency | |

> **Die acht Kürzel müssen paarweise verschieden und je genau 1 Zeichen sein**
> (`ui.formationlabel.*.abbr`, `limit = 1`). Der Vorschlag oben ist bereits kollisionsfrei.
> (Die frühere Kollision zwischen dem Grenzbonus-„G" und dem Gletscher-Badge ist im Code behoben —
> das Gletscher-Badge ist jetzt ❄.)

### 3.4 Archetypen

| DE | Vorschlag EN |
|---|---|
| Archetyp | **archetype** (nicht „faction") |
| Bekenntnis | **commitment** |
| Konsument | **consumer** |
| Überlauf | **overflow** |
| Skill-Slot | skill slot |
| Verstärker | **amplifier** — Skill, der ohne seinen Basis-Skill nichts tut |
| Legendär(er) | **legendary** |

**⚡ Blitz — lightning**

| DE | EN |
|---|---|
| Ladung | **charge** |
| Ionisierung / ionisiert | **ionization / ionized** |
| Stapel (Ionisierung) | **stack** |
| Kaskade | **cascade** |
| Überschlag | **arc-over** |
| Sturmgröße / Sturmintensität | storm breadth / storm depth |

**🔥 Feuer — fire**

| DE | EN |
|---|---|
| Hitze / Hitzeleiste | **heat / heat bar** |
| Brandmal, Brand, gebrandmarkt | **brand, branded** |
| Asche | **ash** |
| Schmieden / Schmiede / Ascheschmiede | **forge / forging** |
| **Weißglut** | **white heat** — nur der **Hitze**-Überlauf |
| **Ascheglut** | **ash glow** — der **Asche**-Überlauf der Schmiede |
| **Glutdividende** | **ember dividend** — automatischer Direkt-Score je Feuer-Sieg |

**❄️ Eis — ice**

| DE | EN |
|---|---|
| Gletscher | **glacier** |
| Masse | **mass** |
| Bersten / bricht / brechen | **burst (n.) / bursts, to burst** |
| Berst-Score | **burst score** |
| Schwelle (Masse) | **threshold** — nie „tier": „tier" ist die Familien-/Gebäude-Stufe |
| Firn / Firn-Boden / Firn-Reserve | **firn / firn ground / firn reserve** (Fachbegriff, existiert im EN) |
| Cluster | **cluster** |
| Eis-Formation (Block/Kreuz/Linie/Große Fläche) | ice formation (block / cross / line / great field) |
| Kollision | collision |

**🌿 Pflanze — plant**

| DE | EN |
|---|---|
| Wachstum | **growth** |
| Setzling | **seedling** |
| Grün / reif | **green / ripe** |
| Wurzeln / Wurzel-Score | **roots / root score** |
| Blüte / Blüte-Score | **bloom / bloom score** |
| Kolonisieren / Ausläufer | **colonize / runner** |
| Überwucherung | **overgrowth** |
| Trimmen / Trimmung | **pruning / a pruning** |
| Ernte / Erntedank | harvest |

### 3.5 Perks, Rarität, Architekt, Meta

| DE | Vorschlag EN |
|---|---|
| Perk | **perk** |
| Familie / Stufe I–IV | **family / tier I–IV** |
| Rarität: Normal · Selten · Sehr selten · Episch | **Common · Uncommon · Rare · Epic** |
| Regelersetzung / Kumulativ / Rolle | replacement / cumulative / role |
| Kategorien A–E (Deck · Stich · Rolle · Score · Form) | Deck · Trick · Role · Score · Form |
| Präzision | Precision |
| Der Architekt / Bauphase | **the Architect / build phase** |
| Bauplan | **blueprint** |
| Gebäude | **building** |
| Baufeld (Deckel) | **build space** |
| Zelle / abgedeckte Zelle | cell / covered cell |
| Polyomino / Form | polyomino / shape |
| Struktur (Zeile/Spalte/Diagonale) | **structure** (row / column / diagonal) |
| Distrikt / Nachbargebäude | **district / adjacent building** |
| Staffel | **relay** |
| Lage | **placement** |
| Crit-Wette / Jackpot | crit bet / jackpot |
| Stufen-Kicker | tier kicker |
| Aufwerten / Versetzen / Abriss | **upgrade / move / demolish** |
| Tragwerk · Handelsbau · Sakralbau | structural · commercial · sacral |
| Upgrade-Baum | **upgrade tree** |
| Stichpunkte (SP) | **Trick Points (TP)** ⚠️ Abkürzung im UI hart, siehe §6 |
| Deckpunkte (DP) | **Deck Points (DP)** |
| Onboarding | onboarding |
| Deck-Werkstatt | **deck workshop** |
| Bestenliste / Wochen-Rangliste | leaderboard / weekly ranking |
| Ranglisten-Lauf | ranked run |
| Wochen-Modifikator | weekly modifier |
| Challenger | challenger |
| Glossar / Leitfaden | glossary / guide |

### 3.6 Die Score-Ansagen (Battlefield)

Eskalationsstufen bei einem Sieg, per CSS in Großbuchstaben gerendert. Sie müssen **kurz und
steigernd** sein — Wirkung vor Wörtlichkeit:

| DE | Vorschlag EN |
|---|---|
| Stark | **FIERCE** |
| Brutal | BRUTAL |
| Irre | INSANE |
| Gottgleich | **GODLIKE** |
| Lawine | AVALANCHE |
| Gönn dir | **LET’S GO!** |
| Kritisch! | CRITICAL! |
| Voll geladen | FULLY CHARGED |

---

## 4. Variablen und Platzhalter

**Es gibt kein Loc-System.** Alle Strings stehen inline im Code; dieser Export ist die erste
Zusammenführung. Für dich heißt das:

1. **Datentexte** (Skills, Perks, Familien, Gebäude, Glossar, Leitfäden) haben ihre Zahlen **bereits
   eingesetzt**. „+15 Score je Serienpunkt" heißt im Code
   `` `+${C.STREAK_SCORE} Score je Serienpunkt` ``. Übersetze die Zahl, wie sie dasteht — sie wandert
   beim nächsten Balance-Pass automatisch mit, wenn der Code danach auf ein echtes Platzhalter-System
   umgestellt wird. **Erfinde keine Zahlen und rechne nichts um.**
2. **UI-Texte** enthalten Laufzeit-Werte. Wo die CSV `{n}`, `{wert}`, `{faktor}` o. Ä. zeigt, steht im
   Feld `context` `Var.: …`. **Reihenfolge ist frei** — englischer Satzbau darf vom deutschen abweichen,
   solange alle Platzhalter erhalten bleiben.
3. **Die Wochen-Modifikatoren** (`item.weekmod.*.desc`) tragen `{n}` für die wöchentlich gewürfelte
   Stärke, mit dem Bereich im `context` (z. B. „`{n}` = Stärke 10–15").

---

## 5. Markup, Sonderzeichen, Zahlen

### 5.1 Markup
- **Kein HTML, kein Rich-Text-Parser.** Die Strings sind tag-frei.
- **Ausnahme: die Archetyp-Leitfäden** (`tutorial.guide.*`, **55 Zeilen**) nutzen `**Fettung**` in
  Markdown-Schreibweise. Die Sternchen **müssen erhalten bleiben**; die betonte Stelle darf im
  Englischen an eine andere Satzposition wandern.
- **Ein String** (`ability.SK_LIGHTNING_02.desc`, Skill *Ionisierung*) benutzt `▸`-Aufzählungen und
  echte Zeilenumbrüche. Beides beibehalten.

### 5.2 Zeichen, die bleiben müssen
`×` (Malzeichen, **nie** `x`) · `−` (echtes Minus U+2212, **nie** Bindestrich) · `≥` `≤` `±` ·
`·` (Mittelpunkt als Trenner) · `→` `↔` `⇄` `⇧` · `–` (Halbgeviertstrich) ·
Emoji und Symbole (🔥 ⚡ ❄️ 🌿 ⚔️ ◆ ✶ ★ ⚓ ❖ 🏛 🏗 …) — sie sind Teil der Icon-Sprache.

### 5.3 Anführungszeichen
Deutsch `„…"` → Englisch `"…"` (typografisch, U+201C/U+201D). Betroffen: 7 Zeilen.

### 5.4 Zahlen — **hier ändert sich etwas**
| | Deutsch (Quelle) | Englisch (Ziel) |
|---|---|---|
| Dezimaltrenner | Komma: `×1,25` · `+0,20` | **Punkt**: `×1.25` · `+0.20` |
| Tausendertrenner | Punkt: `+1.200` · `2.000` | **Komma**: `+1,200` · `2,000` |
| Prozent | `+40 %` (**mit** Leerzeichen) | `+40%` (ohne) |
| Große Zahlen | `Mio. / Mrd. / Bio.` | `M / B / T` (Kürzel, `ui.format.*`) |

⚠️ Die Zahlen kommen aus dem Code mit deutscher Formatierung (Helfer `de()`, `grp()`,
`toLocaleString("de-DE")`). **Das Umstellen auf englisches Format ist eine Code-Änderung, nicht nur
eine Textänderung** — bitte in der `note`-Spalte markieren, wo dir eine Zahl auffällt, die aus dem
Code kommt und nicht aus dem String.

### 5.5 Plural
Es gibt **keine i18n-Bibliothek, kein ICU MessageFormat, kein `Intl.PluralRules`**. Plurale sind
handkodierte Ternäre im Code (`Karte`/`Karten`, `Lauf`/`Läufe`, `Sieg`/`Siege`, `Perk`/`Perks`).
Wo beide Formen als eigene CSV-Zeilen stehen, übersetze beide. Falls eine englische Regel eine dritte
Form oder eine andere Verzweigung braucht, bitte in `note` vermerken — dann wird der Code angepasst.

---

## 6. Platz- und Darstellungs-Grenzen

- **`limit = 1` (hart):** die acht Formations-Kürzel (`ui.formationlabel.*.abbr`). Genau ein Zeichen,
  alle acht paarweise verschieden. Vorschlag siehe §3.3.
- **`limit = 6…12` (eng):** Farbnamen, Archetyp-Namen, Bau-Kategorie-Chips, Raritäts-Chips, HUD-Zellen
  („Runde", „Zeit", „Serie", „Mult", „Siege", „Verl.", „Quote"). Insgesamt **290 Zeilen** tragen eine
  Angabe. Längere Wörter brechen um oder werden abgeschnitten.
- **GROSSBUCHSTABEN per CSS** an ~70 Stellen (Header, Badges, die Sieg-/Niederlage-Banner, die
  Score-Ansagen aus §3.6, Eyebrows). Die CSV zeigt die Normalschreibung — die Großschrift macht CSS.
  Englische Wörter sind in Großschrift oft breiter als erwartet; bei den Bannern und Ansagen kurz halten.
- **Schriften:** Pixel-/Retro-Fonts **„Press Start 2P"** (Kartenzahlen, Wortmarke, Banner, Header) und
  **„VT323"**; Fließtext = System-Monospace. Press Start 2P ist **Latin-only**, aber sehr breit —
  jedes zusätzliche Zeichen kostet spürbar Platz. Für EN sind alle nötigen Glyphen vorhanden.
- **Monospace-Raster:** Weil fast alles Monospace ist, gibt es keine „schmalen" Wörter. Bei zwei
  gleichwertigen Übersetzungen die kürzere nehmen.
- **56 Strings sind länger als 200 Zeichen** (längster: 424) — durchweg Glossar-Erklärungen und
  Leitfaden-Absätze in scrollenden Overlays. Dort ist Länge unkritisch.

---

## 7. Die Glossar-Wortformen (`note = wortformen`) — **kein Anzeigetext**

**109 Zeilen** mit IDs `tutorial.glossary.<begriff>.match` sind **keine sichtbaren Strings**.

Der Renderer `tokenizeGlossary` (`src/game/glossary.js:439`) durchsucht **jede** Beschreibung im Spiel
nach diesen Wortformen und **fettet sie automatisch** — ein Tap darauf öffnet die Erklärung. Die Listen
enthalten deutsche Flexionen, z. B.:

```
tutorial.glossary.stich.match      → Stich | Stiche
tutorial.glossary.bersten.match    → Bersten | bricht | brechen | Berst-Schwelle | Berst-Faktor
tutorial.glossary.green.match      → Grün | grüne | grünen | grüner | Reife | reif
```

**Für Englisch sind diese Listen komplett neu zu erstellen** — nicht zu übersetzen. Gebraucht wird pro
Begriff die Menge aller Formen, die in den englischen Beschreibungen vorkommen (Singular, Plural,
Verbformen, Komposita). Fehlt eine Form, greift die Auto-Fettung nicht; ist eine Form zu generisch,
fettet sie zu viel. **Bitte erst ganz am Schluss anlegen**, wenn die englischen Beschreibungen stehen —
dann aus dem fertigen englischen Textkorpus.

Beispiel für die Erwartung:
```
glossary.bursting.match → burst | bursts | bursting | burst score | burst threshold
```

---

## 8. Nicht übersetzen

| Was | Warum |
|---|---|
| **„Autostich"** | Markenname. Liegt zusätzlich als Bild vor (`src/assets/logo.png`) — der Start­bildschirm zeigt die Wortmarke als Grafik, der In-Game-Header als Text. Bei einer Titel-Lokalisierung bräuchte das Logo eine eigene Fassung. |
| **53 Musiktitel** (`ui.music.*`, `note` gesetzt) | Eigennamen: *Midnight Drive, Neon Drift, Event Horizon, Terminal Velocity* … bereits englisch. |
| **Deck-/Pack-Namen** (`item.deck.*`, `item.pack.*`) | Marken-Set, überwiegend schon englisch: Sunset Rider, Kitsune, Malibu Wave, Biolumen, Kosmospanther, Moonwhale, Genesis, Ascension, Flamingo, Peacock, Ronin, Seraph, Beryll, Scarab, Eldritch, Prisma. |
| **Ausnahme — vier deutsche Deck-Namen** | *Königspfau, Sparfuchs, Schwarzes Loch, Roter Oni* wirken im EN als Fremdkörper. Vorschlag: **Royal Peacock, Penny Pincher, Black Hole, Red Oni**. Bitte bestätigen. |
| **Die vier Element-Decks** (Feuer/Eis/Blitz/Pflanze) | tragen bewusst die Archetyp-Namen → mit §3.4 übersetzen (Fire/Ice/Lightning/Plant). |
| **Effekt-Namen der Kosmetik** | *Aurora, Würfel-Matrix, Neon-Brandung, Leuchten, Meteor, Neonrahmen, Holo-Sweep, Glitch, Sonne, Laserfächer, Prisma, Holo-Würfel, Supernova* — Produktnamen im Shop; übersetzen, aber als Set konsistent halten. |

---

## 9. Was sich gegenüber der ersten Fassung geändert hat

Die in der ersten Lieferung markierten Problemzeilen sind **korrigiert**. Für dich relevant, weil sich
der deutsche Ausgangstext an diesen Stellen geändert hat:

| Bereich | Änderung |
|---|---|
| **Glossar** | 3 Einträge zu den entfernten „Meisterrängen" gelöscht, **6 neue**: Stichpunkte (SP), Deckpunkte (DP), Upgrade-Baum, Ranglisten-Lauf, Wochen-Modifikator, Position. Dazu neu: **Serienpunkt**, **Ascheglut**. |
| **Alle `item.building.*`** | Der Effekttext wird jetzt an **einer** Stelle erzeugt (`familyEffectText`). Wortlaut, Zahlformat (×1,10 statt ×1.10) und die Joker-Typen (ausgeschriebene Namen statt roher Schlüssel) sind vereinheitlicht. |
| **Crit-Angaben** | „pp" ist weg — additive Crit-Chance steht in **%**. |
| **Rarität** | Ein Vokabular: „Rarität" + Normal · Selten · Sehr selten · Rar. Kein „Seltenheit", keine Farbwörter. |
| **Durchlauf** | Ersetzt „Runde" überall; der Spielfeld-Zähler heißt „Stich 23 / 40". |
| **Weißglut** | Bezeichnet nur noch den **Hitze**-Überlauf; der Asche-Überlauf heißt **Ascheglut**. |
| **Zwei Familien umbenannt** | *Zehnter Sieg* → **Beutezug**, *Zehnter Schlag* → **Markstein**. |
| **Leitfäden** | Skill-gebundene Effekte sind als solche benannt; Glutdividende (Feuer) und Firn (Eis) ergänzt. |
| **Deck-Ansicht** | Reiter „Passives" heißt „Skills"; Skills tragen Marken „braucht X" / „Konsument" / „trimmbar". |

### Zwei bewusste Ausnahmen

1. **„Prozentpunkte" bleibt an drei Stellen** — überall dort, wo gegen die 100-%-Schwelle gerechnet
   wird (*Überschlag*, *Überschusskrit*, *Raserei*). „je 10 % über 100 %" wäre unlesbar.
   Im Englischen bitte ebenso: `%` als Regel, `percentage points` an diesen drei Stellen.
2. **Der Pack-Preis wird nicht im Freischalt-Text genannt** (`item.unlock.buy.label` sagt nur die
   Währung). Der Preis steht auf der Pack-Kachel; ihn in den Text zu holen, hätte einen Import-Zyklus
   im Code erzeugt.

### Bekannte Grenzen, die die Übersetzung betreffen

- **Zahlformat ist Code, nicht Text.** Dezimal-Komma, Tausenderpunkt und `toLocaleString("de-DE")`
  stecken in Helfern (`de()`, `grp()`, `fmtFactor`, `fmtScore`). Die Umstellung auf englisches Format
  ist eine Code-Änderung — bitte in `note` markieren, wo dir eine Zahl auffällt, die *nicht* aus dem
  String kommt.
- **Plural ist handkodiert** (§5.5). Braucht Englisch eine andere Verzweigung, in `note` vermerken.
- **Es gibt weiterhin kein Loc-System.** Alle Strings stehen inline im Code; diese CSV ist die
  Zusammenführung. Der Umbau auf ein echtes Loc-Layer steht noch aus — bis dahin ist der Export
  (`node scripts/export-strings.mjs`) der Weg, Änderungen sichtbar zu machen.

---

## 10. Rücklieferung

Bitte dieselbe CSV zurück, **unverändert in `id`, `category`, `de`**, gefüllt in `en`, mit
`status` (`done` / `question`) und Anmerkungen in `note`. Zusätzlich willkommen:

- eine Liste der Begriffe, bei denen du dich für eine EN-Vokabel entschieden hast, die von §3 abweicht;
- Stellen, an denen der deutsche Satzbau eine englische Wortstellung verhindert (dann bauen wir den
  String im Code um);
- Stellen, an denen `limit` in EN nicht einzuhalten ist — dann ändern wir das Layout, nicht den Text;
- die neu erstellten `match`-Wortformen (§7) als letzter Schritt.

Fragen bitte je Zeile in `note`, nicht gesammelt — dann lassen sie sich direkt neben dem Quelltext
beantworten.
