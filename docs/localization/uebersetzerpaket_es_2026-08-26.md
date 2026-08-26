# Autostich — Übersetzungspaket DE → ES

**Begleitdokument zu `strings_es.csv`**
Eingefrorener Quellstand: **`d9763883bb5e1a2d5433d33f4de1121bb9da0cf9`** (Branch `dev`, 26.08.2026)
Umfang: **2 800 Zeilen**, davon 2 746 zu übersetzen und 54 bewusst einsprachig.

> **Sprache dieses Dokuments.** Repository-Dokumente sind sonst englisch. Dieses hier ist deutsch,
> weil es seinem Vorbild folgt (`uebersetzerpaket_pixi_2026-08-15.md`) und weil es **aus dem
> Deutschen heraus erklärt** — die Quellsprache ist Deutsch, und der Übersetzer liest sie.
> Abweichung von der Regel vermerkt (`AGENTS.md` — *Appending to an existing German document*,
> sinngemäß).

> **Übersetzt wird aus dem DEUTSCHEN, nicht aus dem Englischen.** Die Spalte `en_ref` steht als
> Referenz daneben, nicht als Vorlage: sie zeigt, wie eine Mehrdeutigkeit des Deutschen schon
> einmal aufgelöst wurde. **Wo Deutsch und Englisch sich widersprechen, gilt Deutsch** — und bitte
> in `note` vermerken, damit wir die englische Seite nachziehen.

> **Neutrales Spanisch.** Regionsneutral, kein Spanien- oder Lateinamerika-Kolorit. `tú`-Anrede
> wie im deutschen Original, **`ustedes` statt `vosotros`**, keine regionaltypischen Vokabeln.
> Die Sprach-ID ist `es`, nicht `es-ES` und nicht `es-419`. Das ist keine Kosmetik: an der ID
> hängen auch Zahl- und Datumsformat (§5.4).

---

## 1. Was ist Autostich?

Ein **Roguelite-Autobattler-Stechspiel**. Kernschleife in einem Satz: Deine 40 Karten und die 40
Karten eines anonymen Gegners werden automatisch gegeneinander aufgedeckt — die höhere Zahl gewinnt
den *Stich*. Du greifst **nie in den Kampf ein**; du baust **zwischen** den Durchläufen einen Build,
der dein Deck, deine Kartenreihenfolge und deine Punktemultiplikatoren dauerhaft stärkt.

```
40 Stiche automatisch → Durchlauf-Ende → genau EINE Entscheidung
   (Skill · Perk · Aufstellung · Architekt) → nächster Durchlauf … 50 Runden lang → Ende
```

Es gibt **keine Lebenspunkte und keinen Tod** — der Lauf hat feste Länge, das Ziel ist der höchste
**Score**. Deshalb ist fast jeder Text ein *Regeltext*: eine Bedingung und eine Wirkung. Ton: knapp,
aktiv, in der Du-Form, ein bis zwei Sätze. Kein Fantasy-Pathos außer in den vier Archetyp-Leitfäden
(`guide.*`) — die dürfen bildhaft sein.

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
`category` → `id`. Jede Zeile hat exakt **9** Spalten.

| Spalte | Bedeutung |
|---|---|
| `id` | Stabiler Schlüssel `bereich.objekt.feld`. **Nicht ändern.** |
| `category` | `i18n` (2 639) · `building` (107) · `system` (54) |
| `de` | Der deutsche Ausgangstext, **exakt wie er im Spiel steht**. Das ist deine Vorlage. |
| `es` | **Deine Spalte.** Leer geliefert. |
| `en_ref` | Die englische Fassung. **Referenz, keine Vorlage** — siehe Kasten oben. |
| `context` | Wo der Text erscheint |
| `limit` | Zeichenobergrenze, wo sie belegt ist. Siehe §6. Leer heißt **nicht** „unbegrenzt". |
| `status` | `new` bei Lieferung. Bitte auf `done` / `question` setzen. |
| `note` | Herkunft der Längenschranke, „do-not-translate", und **dein Platz für Rückfragen**. |

**Neu erzeugen** (nach Balance- oder Textänderungen):

```bash
npm run loc:export
```

Die Datentexte werden dabei aus den echten Code-Registern **importiert** und mit aufgelösten Zahlen
ausgeschrieben. Ein Diff der CSV zeigt zuverlässig, was sich seit der Lieferung geändert hat (§10).

### Was `category` bedeutet

- **`i18n`** — der eigentliche Katalog. Alles, was das Spiel über `t()` auflöst.
- **`building`** — die Effekttexte der Architekt-Gebäude. Sie werden aus Satzbausteinen **erzeugt**,
  nicht einzeln gepflegt. Du übersetzt sie trotzdem als ganze Sätze; wir bauen sie danach in die
  Bausteine zurück. Wenn ein Satzbau im Spanischen eine andere Reihenfolge braucht, sag es in `note`
  — dann ändern wir den Generator, nicht den Text.
- **`system`** — 54 Musiktitel. **Nicht übersetzen** (§8), sie stehen mit `status = n/a` da.

---

## 3. Kanonische Begriffe — DE → ES

Das ist der wichtigste Abschnitt. Autostich hat ein enges, wiederkehrendes Regelvokabular; **eine
deutsche Vokabel muss durchgängig auf genau eine spanische abgebildet werden.** Ein Test erzwingt
das später maschinell (`test/i18n-guards.test.js`), sobald die Tabelle steht.

> **Die Spalte „Vorschlag ES" ist ein VORSCHLAG, kein Beschluss.** Anders als die englische Tabelle,
> die seit dem 15.08.2026 eingefroren ist, ist diese hier offen. Sie soll dir das Anfangen ersparen,
> nicht die Entscheidung abnehmen: **bestätige, oder schlage etwas Besseres vor.** Wo du abweichst,
> eine Zeile in `note` — wir tragen es nach und frieren die Tabelle dann ein.
>
> Die Vorschläge sind am Genre orientiert (Stechspiel-Fachsprache, Roguelite-Konvention), nicht
> wörtlich übersetzt. Wo ein deutsches Wort eigenwillig ist (Weißglut, Firn, Grenzbonus), soll auch
> das Spanische eigenwillig bleiben — genau das ist die Genre-Norm.

### 3.1 Grundbegriffe

| DE (kanonisch) | Vorschlag ES | Anmerkung |
|---|---|---|
| Autostich (Spieltitel) | **Autobaza** | Entschieden. Die Marke wechselt mit der Sprache: der deutsche Titel trägt „Stich" sichtbar, der spanische trägt „baza". Deutsch bleibt `Autostich`, Englisch ist `Autotrick`. |
| Stich | **baza** | Kartenspiel-Fachbegriff, nicht „ronda" |
| Durchlauf | **ciclo** | ein kompletter Deck-Durchlauf = 40 Stiche · **das einzige Wort dafür** |
| Position | **posición** | fester Platz 1–40 in der Ziehreihenfolge |
| Lauf / Run | **partida** | ein ganzes Spiel (50 Durchläufe) |
| Sieg / Niederlage / Gleichstand | victoria / derrota / empate | |
| Kartenwert | **valor de carta** | dauerhafter Wert |
| Stichwert | **valor de baza** | nur für diesen Stich |
| Kampfwert | **valor de combate** | Kartenwert + alle Stichwert-Boni |
| Marge | **margen** | |
| Score | **puntuación** | durchgängig ein Wort. Falls du `score` für geläufiger hältst: sag es, aber dann überall. |
| Direkt-Score | **puntuación directa** | Score ohne Multiplikatoren |
| Serie (Siegesserie) | **racha** | |
| Serienpunkt | **punto de racha** | |
| Crit | **crítico** | Kurzform in engen Zellen: `crít.` |
| Crit-Chance / Crit-Multiplikator | probabilidad de crítico / multiplicador de crítico | |
| Multiplikator | multiplicador | Malzeichen bleibt `×` |
| Neuwurf / Reroll | **relanzamiento** (Verb: relanzar) | |
| Seed | **semilla** | |
| Geist / Rekord | fantasma / récord | |

### 3.2 Deck, Farben, Aufstellung

| DE | Vorschlag ES |
|---|---|
| Deck | **mazo** |
| Farbe (Rot · Blau · Grün · Gelb) | **palo** (Rojo · Azul · Verde · Amarillo) |
| Farbserie | racha de palo |
| Ziehreihenfolge | **orden de robo** |
| Segment (5 Positionen) | **segmento** |
| Aufstellungsphase | **fase de orden** |
| Formations-Energie | **energía de orden** |
| Tausch | intercambio |
| Chronik | **crónica** |

### 3.3 Formationen — **die Kürzel sind hart**

| DE | Vorschlag ES | Kürzel (1 Zeichen, hart!) |
|---|---|---|
| Formation | **formación** | — |
| Wiederholung | **repetición** | W → **R** |
| Farbblock | **bloque de palo** | F → **B** |
| Treppe | **escalera** | T → **E** |
| Wechsel | **zigzag** | Z → **Z** |
| Anker | **ancla** | A → **A** |
| Nachhall | **eco** | N → **O** |
| (Formations-)Kern | **núcleo** | K → **N** |
| Grenzbonus | **bonificación de cruce** | G → **X** |
| Joker | **comodín** | — |

> **Die acht Kürzel müssen paarweise verschieden und je genau 1 Zeichen sein** (`formation.*.abbr`,
> `limit = 1`, maschinell geprüft). Der Vorschlag `R B E Z A O N X` ist bereits kollisionsfrei —
> beachte, dass **eco → O** und nicht E, weil `escalera` das E schon hat. Wenn du eine Vokabel
> änderst, prüfe die Kollision mit.
>
> **Achtung Doppelbelegung:** `comodín` ist im Spanischen auch das übliche Wort für den *Joker* als
> Spielkarte und in anderen Spielen für Perk-artige Objekte. Hier heißt es ausschließlich der
> Formations-Joker. Für `Perk` steht deshalb unten ein anderes Wort — bitte nicht zusammenziehen.

### 3.4 Archetypen

| DE | Vorschlag ES |
|---|---|
| Archetyp | **arquetipo** (nicht „facción") |
| Bekenntnis | **compromiso** |
| Konsument | **consumidor** |
| Überlauf | **desbordamiento** |
| Skill / Skill-Slot | **habilidad** / ranura de habilidad |
| Verstärker | **amplificador** |
| Legendär | **legendario** |

**⚡ Blitz — Rayo**

| DE | ES |
|---|---|
| Ladung | **carga** |
| Ionisierung / ionisiert | **ionización / ionizado** |
| Stapel | **acumulación** |
| Kaskade | **cascada** |
| Überschlag | **arco** |

**🔥 Feuer — Fuego**

| DE | ES |
|---|---|
| Hitze / Hitzeleiste | **calor / barra de calor** |
| Brandmal, gebrandmarkt | **marca, marcado** |
| Asche | **ceniza** |
| Schmieden / Schmiede | **forjar / forja** |
| **Weißglut** | **calor blanco** — nur der **Hitze**-Überlauf |
| **Ascheglut** | **brasa de ceniza** — der **Asche**-Überlauf |
| **Glutdividende** | **dividendo de brasas** |

**❄️ Eis — Hielo**

| DE | ES |
|---|---|
| Gletscher | **glaciar** |
| Masse | **masa** |
| Bersten / bricht | **estallido / estalla** |
| Schwelle (Masse) | **umbral** — nie „nivel": „nivel" ist die Familien-/Gebäude-Stufe |
| Firn | **neviza** (Fachbegriff der Gletscherkunde, existiert im Spanischen) |
| Cluster | **agrupación** |

**🌿 Pflanze — Planta**

| DE | ES |
|---|---|
| Wachstum | **crecimiento** |
| Setzling | **plántula** |
| Grün / reif | **verde / maduro** |
| Wurzeln | **raíces** |
| Blüte | **floración** |
| Ausläufer | **estolón** |
| Überwucherung | **invasión** |
| Trimmen / Trimmung | **poda / una poda** |

### 3.5 Perks, Rarität, Architekt, Meta

| DE | Vorschlag ES |
|---|---|
| Perk | **ventaja** — bewusst nicht `comodín`, das ist der Joker (§3.3) |
| Familie / Stufe I–IV | **familia / nivel I–IV** |
| Rarität: Normal · Selten · Sehr selten · Episch | **Común · Poco común · Rara · Épica** |
| Der Architekt / Bauphase | **el Arquitecto / fase de construcción** |
| Bauplan | **plano** |
| Gebäude | **edificio** |
| Baufeld | **espacio de construcción** |
| Zelle / abgedeckte Zelle | celda / celda cubierta |
| Struktur (Zeile/Spalte/Diagonale) | **estructura** (fila / columna / diagonal) |
| Distrikt / Nachbargebäude | **distrito / edificio adyacente** |
| Staffel | **relevo** |
| Lage | **colocación** |
| Aufwerten / Versetzen / Abriss | **mejorar / mover / demoler** |
| Stichpunkte (SP) | **Puntos de baza (PB)** ⚠️ Kürzel im UI hart, siehe §6 |
| Deckpunkte (DP) | **Puntos de mazo (PM)** ⚠️ dito |
| Deck-Werkstatt | **taller de mazos** |
| Bestenliste / Wochen-Rangliste | **clasificación / clasificación semanal** |
| Ranglisten-Lauf | **partida clasificatoria** |
| Wochen-Modifikator | **modificador semanal** |
| Glossar / Leitfaden | **glosario / guía** |
| Upgrade-Baum | **árbol de mejoras** |

> **Die Währungskürzel ändern sich.** Deutsch `SP`/`DP`, Englisch `TP`/`DP`, Spanisch `PB`/`PM`.
> Sie stehen in engen Zellen — bitte bei zwei Zeichen bleiben.

### 3.6 Die Score-Ansagen

Eskalationsstufen bei einem Sieg, per CSS in **Großbuchstaben** gerendert. Sie müssen **kurz und
steigernd** sein — Wirkung vor Wörtlichkeit. In Großschrift werden spanische Wörter schnell breit.

| DE | EN (eingefroren) | Vorschlag ES |
|---|---|---|
| Stark | NICE | **BIEN** |
| Brutal | BRUTAL | **BRUTAL** |
| Irre | INSANE | **DEMENCIAL** |
| Gottgleich | GODLIKE | **DIVINO** |
| Lawine | AVALANCHE | **AVALANCHA** |
| Gönn dir | LET’S GO! | **¡VAMOS!** |

Die Kette muss **hörbar steigern** — das ist das einzige harte Kriterium. Wenn dir eine bessere
Reihe einfällt, nimm sie und schreib sie in `note`.

---

## 4. Variablen, Plural, Genus

### 4.1 Platzhalter
Laufzeitwerte stehen als `{name}` im Text, zum Beispiel `Durchlauf {cycle}/{total}`.

- **Alle Platzhalter müssen erhalten bleiben** — ein Test prüft das je Zeile maschinell.
- **Die Reihenfolge ist frei.** Spanischer Satzbau darf vom deutschen abweichen.
- **Erfinde keine Platzhalter** und lass keinen weg, auch nicht, wenn er im Spanischen überflüssig
  wirkt.

### 4.2 Zahlen in Datentexten
Skills, Perks, Familien, Gebäude und Glossar haben ihre Zahlen **bereits eingesetzt**
(„+15 Score je Serienpunkt"). Übersetze die Zahl, wie sie dasteht. **Erfinde keine Zahlen und rechne
nichts um** — ein Test vergleicht die Zahlenmenge beider Sprachen Zeile für Zeile.

### 4.3 Plural
Das Spiel kennt Plural als Schlüsselpaar `…_one` / `…_other`, ausgewählt über die Zählvariable.
**Spanisch passt genau hinein**: es hat dieselben zwei Formen mit derselben Grenze wie Deutsch und
Englisch (nur exakt 1 ist Singular; 0 und alles andere ist Plural). Wo beide Formen als eigene
Zeilen stehen, übersetze beide. Kein Sonderfall, kein Code nötig.

### 4.4 Genus — **die eigentliche Falle**
Das Einsetzverfahren kann **keine Genus-Kongruenz** mit einem eingesetzten Wort. Ein Satz wie

```
{name} bloqueado        ← falsch, sobald {name} feminin ist („la ventaja bloqueada")
```

lässt sich nicht retten, weil das Spiel nicht weiß, welches Wort für `{name}` eingesetzt wird.

**Formuliere darum herum**, statt eine Form zu wählen:

- neutral: `Bloqueado: {name}` · `{name} — bloqueado`
- geschlechtslos: `Sin desbloquear: {name}`
- oder das Genus in den Satz holen: `Falta desbloquear {name}`

Wo dir eine Zeile begegnet, die sich nicht neutral formulieren lässt: **`note` setzen.** Dann
splitten wir den Schlüssel im Code auf, statt dich einen Kompromiss schreiben zu lassen. Dasselbe
gilt für Artikel vor Platzhaltern (`el`/`la`, `un`/`una`, `del`/`de la`).

---

## 5. Markup, Sonderzeichen, Zahlen

### 5.1 Markup
- **Kein HTML, kein Rich-Text-Parser.** Die Strings sind tag-frei.
- **Ausnahme: die Archetyp-Leitfäden** (`guide.*`) nutzen `**Fettung**` in Markdown-Schreibweise.
  Die Sternchen **müssen erhalten bleiben**; die betonte Stelle darf im Spanischen an eine andere
  Satzposition wandern.
- Ein String nutzt `▸`-Aufzählungen und echte Zeilenumbrüche. Beides beibehalten.

### 5.2 Zeichen, die bleiben müssen
`×` (Malzeichen, **nie** `x`) · `−` (echtes Minus U+2212, **nie** Bindestrich) · `≥` `≤` `±` ·
`·` (Mittelpunkt als Trenner) · `→` `↔` `⇄` `⇧` · `–` (Halbgeviertstrich) ·
Emoji und Symbole (🔥 ⚡ ❄️ 🌿 ⚔️ ◆ ✶ ★ ⚓ ❖ 🏛 🏗 …) — sie sind Teil der Icon-Sprache.

### 5.3 Zeichen, die du BRAUCHST — und zwei, die du nicht benutzen darfst

Die Schriften sind geprüft (Glyphentabellen der ausgelieferten Dateien gelesen, nicht die
Deklaration). **Vorhanden und uneingeschränkt benutzbar:**
`á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ` sowie **`¿` und `¡`**.

> **Öffnende Frage- und Ausrufezeichen bitte setzen.** `¿Seguro?` · `¡VAMOS!` — sie sind im Zeichensatz
> und gehören zur korrekten Rechtschreibung. Kein Grund, sie wegzulassen.

**Nicht benutzen:**

| Zeichen | Warum | Stattdessen |
|---|---|---|
| `«` `»` | fehlen in der Schrift der Kartenzahlen und der Wortmarke | `“ ”` (§5.5) |
| `º` `ª` | dieselbe Lücke — Ordnungszahlen wie `1.º` brechen dort | ausschreiben: `primero`, `primera` |

### 5.4 Zahlen — **hier ändert sich nichts gegenüber dem Deutschen**

Anders als beim Englischen: neutrales Spanisch trennt **wie Deutsch**.

| | Deutsch (Quelle) | Spanisch (Ziel) | (Englisch, zum Vergleich) |
|---|---|---|---|
| Dezimaltrenner | Komma: `×1,25` | **Komma: `×1,25`** | Punkt: `×1.25` |
| Tausendertrenner | Punkt: `+1.200` | **Punkt: `+1.200`** | Komma: `+1,200` |
| Prozent | `+40 %` (mit Leerzeichen) | **`+40 %` (mit Leerzeichen)** | `+40%` |
| Tagesdatum | `24.12.` | **`24/12`** | `12/24` |

Das Zahlformat macht der Code, nicht du — es steht hier, damit du es beim Prüfen wiedererkennst.
Das **Datum** ist der einzige Wert, der weder dem Deutschen noch dem Englischen folgt.

> ⚠️ **Große Zahlen: Vorsicht, Faktor 1000.** Spanisch benutzt die **lange Skala**. Drei Schlüssel
> (`format.short.*`) kürzen große Score-Zahlen ab, und die naheliegende Übersetzung wäre falsch:
>
> | Wert | DE | EN | **ES — richtig** | ES — falsch |
> |---|---|---|---|---|
> | 10⁶ | `{n} Mio.` | `{n}M` | **`{n} M`** | — |
> | 10⁹ | `{n} Mrd.` | `{n}B` | **`{n} mil M`** | ~~`{n} B`~~ (das wäre 10¹²) |
> | 10¹² | `{n} Bio.` | `{n}T` | **`{n} B`** | ~~`{n} T`~~ |
>
> Bitte genau so, oder sag in `note`, wenn dir eine bessere Kurzform einfällt.

### 5.5 Anführungszeichen
Deutsch `„…“` → Spanisch `“…”` (typografisch, U+201C/U+201D), **nicht** `«…»` (§5.3) und nicht
`"…"`. Ein Test prüft das je Katalog.

---

## 6. Platz- und Darstellungs-Grenzen

**Spanisch läuft länger als Deutsch und Englisch.** Wo eine Zeichenkette in eine feste Fläche muss,
trägt die CSV eine Zahl in `limit`. Die Spalte ist in **30 Zeilen** gefüllt, mit zwei Herkünften,
die jeweils in `note` stehen:

| Herkunft | Bedeutung | Zeilen |
|---|---|---|
| `hart` | Der Code erzwingt sie, ein Test hält sie fest. **Nicht verhandelbar.** | 8 (`formation.*.abbr`, je genau 1 Zeichen) |
| `gemessen` | Länge des **längsten Geschwisters** derselben Familie. Die Geschwister teilen sich eine Fläche, also fasst die Fläche nachweislich schon den längsten von ihnen. | 22 |

> **`gemessen` ist eine untere Schranke der echten Kapazität, keine exakte.** Wer sie einhält, ist
> sicher. Wer sie um ein, zwei Zeichen reißt, ist nicht automatisch falsch — dann bitte `note`
> setzen, statt den Text zu verbiegen. **Wir ändern lieber das Layout als den Text.**
>
> **Das passiert dir gleich beim ersten Eintrag, und das ist in Ordnung.** Die Farbnamen
> (`suit.*.name`) tragen `limit = 6`, gemessen an „Yellow". Spanisch heißt Gelb **`Amarillo`** —
> acht Zeichen. Verbieg das nicht zu „Amar." und such kein kürzeres Wort: schreib `Amarillo`, setz
> `note`, und wir messen die Kachel nach. Genau dafür ist die Spalte da.

**Eine leere `limit`-Spalte heißt NICHT „unbegrenzt".** Sie heißt: für diese Zeile ist heute keine
Grenze belegt. Die übrigen engen Stellen misst ein eigener Layout-Durchgang, wenn dein Text da ist.
Wo dir beim Übersetzen auffällt, dass etwas ersichtlich in eine Kachel oder einen Chip muss und
lang wird — **`note` setzen.** Das ist die wertvollste Rückmeldung, die du geben kannst.

**GROSSBUCHSTABEN per CSS** an rund 70 Stellen (Header, Badges, Sieg-/Niederlage-Banner, die
Score-Ansagen aus §3.6, Eyebrows). Die CSV zeigt die Normalschreibung. Spanische Wörter sind in
Großschrift oft breiter als erwartet — bei Bannern und Ansagen kurz halten.

**Monospace-Raster:** Fast alles ist Monospace gesetzt, es gibt also keine „schmalen" Wörter. **Bei
zwei gleichwertigen Übersetzungen die kürzere nehmen.**

---

## 7. Die Glossar-Wortformen (`glossary.*.match`) — **kein Anzeigetext**

Diese Zeilen sind **keine sichtbaren Strings**. Ein Renderer durchsucht **jede** Beschreibung im
Spiel nach diesen Wortformen und **fettet sie automatisch** — ein Tap darauf öffnet die Erklärung.
Die Listen enthalten deutsche Flexionen, mit `|` getrennt:

```
glossary.stich.match     → Stich | Stiche
glossary.bersten.match   → Bersten | bricht | brechen | Berst-Schwelle | Berst-Faktor
```

**Für Spanisch sind diese Listen komplett NEU zu erstellen — nicht zu übersetzen.** Gebraucht wird
je Begriff die Menge aller Formen, die in deinen **fertigen spanischen** Beschreibungen vorkommen:
Singular, Plural, Femininum/Maskulinum, Verbformen, Komposita.

```
glossary.bersten.match → estallido | estallidos | estalla | estallar | umbral de estallido
```

- Fehlt eine Form, greift die Fettung nicht.
- Ist eine Form zu generisch, fettet sie zu viel.
- **Bitte erst ganz am Schluss anlegen**, aus dem fertigen Textkorpus heraus.

Zwei Tests messen das Ergebnis, es wird also nicht nach Gefühl beurteilt.

---

## 8. Nicht übersetzen

| Was | Warum |
|---|---|
| **54 Musiktitel** (`status = n/a`) | Eigennamen, bereits englisch: *Midnight Drive, Neon Drift, Event Horizon* … |
| **Deck- und Pack-Namen**, soweit Eigenname | Marken-Set, überwiegend schon englisch: Kitsune, Ronin, Seraph, Beryll, Scarab, Eldritch, Prisma, Biolumen … |
| **Ausnahme: beschreibende Deck-Namen** | *Sparfuchs, Königspfau, Schwarzes Loch, Roter Oni* wirken unübersetzt als Fremdkörper. Bitte übersetzen und in `note` begründen. |
| **Die vier Element-Decks** | tragen bewusst die Archetyp-Namen → mit §3.4 übersetzen (Fuego / Hielo / Rayo / Planta). Sie **müssen** exakt so heißen wie die Archetypen; ein Test erzwingt es. |
| **Effekt-Namen der Kosmetik** | *Aurora, Supernova, Prisma* … Produktnamen im Shop. Übersetzen, aber **als Set konsistent halten**. |

---

## 9. Was gegenüber dem englischen Paket anders ist

Falls du das englische Paket kennst oder danebenlegst: es beschreibt einen **älteren Stand** des
Projekts. Vier Aussagen darin gelten nicht mehr.

| Damals (EN-Paket, 15.08.2026) | Heute |
|---|---|
| „Es gibt kein Loc-System, alle Strings stehen inline im Code." | Es gibt eins. Alle Texte laufen über einen Katalog, die CSV ist eine **erzeugte Ansicht** davon. |
| Kategorien `ui` · `item` · `tutorial` · `ability` · `achievement` · `store` · `system` | Nur noch `i18n` · `building` · `system` (§2). |
| „Plurale sind handkodierte Ternäre." | Schlüsselpaare `…_one`/`…_other` (§4.3). |
| „290 Zeilen tragen eine Längenangabe." | Das stimmte nicht — die Spalte war leer. Jetzt sind es 30, alle belegt (§6). |

Dazu **2 800 statt 2 238 Zeilen**: der Zuwachs kommt größtenteils aus der Tutorial-Sektion, die
seither ausgeliefert wurde.

---

## 10. Rücklieferung und Quellstand

### Was zurückkommt

Dieselbe CSV, **unverändert in `id`, `category`, `de`, `en_ref`**, gefüllt in `es`, mit `status`
(`done` / `question`) und Anmerkungen in `note`.

Zusätzlich willkommen:

- die Begriffe aus §3, bei denen du **abgewichen** bist, als Liste;
- Stellen, an denen der deutsche Satzbau eine spanische Wortstellung verhindert (dann bauen wir den
  String im Code um);
- Stellen, an denen `limit` nicht einzuhalten ist (dann ändern wir das Layout, nicht den Text);
- Stellen mit **Genus-Problem** (§4.4);
- die neu erstellten `match`-Wortformen (§7) als letzter Schritt.

**Fragen bitte je Zeile in `note`, nicht gesammelt** — dann lassen sie sich direkt neben dem
Quelltext beantworten.

### Der eingefrorene Quellstand

Diese Lieferung wurde erzeugt aus dem Stand

```
d9763883bb5e1a2d5433d33f4de1121bb9da0cf9
```

Das ist die einzige Möglichkeit, später **Drift** zu erkennen: welche deutschen Zeichenketten sich
seit deiner Lieferung geändert haben und deshalb nachübersetzt werden müssen. Zwei Befehle
beantworten das, wenn deine Übersetzung zurückkommt:

```bash
git log --oneline d9763883bb5e1a2d5433d33f4de1121bb9da0cf9..HEAD -- src/i18n/
```

```bash
npm run loc:export && git diff -- docs/localization/strings_es.csv
```

Der zweite ist der wichtigere: er erzeugt die CSV neu und zeigt **genau die Zeilen**, deren deutsche
Seite sich seither bewegt hat. Die ausgelieferte Datei liegt dafür im Repository — wann sie zuletzt
erzeugt wurde, sagt

```bash
git log -1 --format=%H -- docs/localization/strings_es.csv
```

Solange diese drei Befehle laufen, kann niemand die Frage „worauf bezieht sich diese Übersetzung
eigentlich" falsch beantworten.
