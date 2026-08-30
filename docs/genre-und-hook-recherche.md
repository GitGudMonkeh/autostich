# Genre- und Hook-Recherche — Meta-Layer für Autostich

> **Zweck:** Zwei Fragen des Owners beantworten.
> **(A)** Welche Genres/Themes im Roguelike-Deckbuilder sind noch unbesetzt — und trägt das einen
> interessanten Meta-Layer als Progression?
> **(B)** Was ist der Hook für „noch einen Lauf"? Warum will ich besser werden, was will ich
> erreichen, wo will ich hin, wen will ich besiegen — und welche Genre-Vertreter machen das am
> stärksten, warum und wie?
>
> **Status:** Recherche, 2026-08-30. **Kein Beschluss, keine Umsetzung.** Die Empfehlungen in §B5
> sind Vorschläge; was gebaut wird, entscheidet der Owner.
>
> **Belegtiefe:** Aussagen über Autostich sind am Code gemessen (Datei/Konstante genannt).
> Aussagen über den Markt sind recherchiert (Quellen am Ende) oder als *abgeleitet* markiert.
> `store.steampowered.com` war über den Netz-Proxy dieser Session nicht erreichbar — Angaben zu
> Steam-Seiten stammen aus Presse- und Suchzusammenfassungen, nicht von der Produktseite selbst.

---

## 0 · Die kurze Antwort

**Zu A:** Es gibt freie Themes, aber *Theme ist nicht das Problem*. Der Markt ist mechanisch
gesättigt (Publisher haben in zwölf Monaten rund 250 Roguelike-Deckbuilder gesichtet), und eine
Theme-Umlackierung ist die billigste und deshalb wertloseste Differenzierung. Autostichs echte
Nische ist nicht das Element-Quartett — die ist die *auto-aufgelöste Stich-Mechanik mit
Nachbarschafts-Formationen*. Diese Nische ist real und fast leer. Seit August 2026 hat sie einen
sichtbaren Nachbarn: **Overtrick**. Der spielt Stiche *mit* Spielerentscheidung; Autostich ohne.
Das ist ein Unterschied, kein Konflikt.

**Zu B:** Der Hook fehlt nicht, weil ein Meta-System fehlt. Autostich hat mehr Meta-Systeme als die
meisten Wettbewerber (SP-Baum, DP-Werkstatt, Wochen-Rangliste mit 19 Modifikatoren, Challenger-Seeds,
globale Bestenliste, Geist, Soundtrack-Stufen). Der Hook fehlt, weil **ein Lauf kein Urteil hat**.

Bei `MAX_CYCLES = 50` ohne Tod endet jeder Lauf gleich: er endet. Es gibt kein Bestanden und kein
Gescheitert, nur eine Zahl. Und ab Kartenwert 11 (`VALUE_CAP = null`, Gegner-Maximum 10) ist der
Stich-Ausgang deterministisch — die zweite Laufhälfte hat strukturell keine Spannung mehr.

> **Ein Lauf ohne Urteil erzeugt keinen Wunsch nach dem nächsten.**
> Das ist die Diagnose. Alles Weitere folgt daraus.

Die Empfehlung ist deshalb **kein neues System**, sondern vier Umdeutungen von Daten, die es schon
gibt: ein **Soll** pro Lauf (Urteil), ein **benannter Rivale** statt des anonymen Geistes (Gegner),
eine **gezeichnete Route** statt der unsichtbaren Musikstufen (Ziel), eine **Vitrine** mit sichtbar
leeren Plätzen (Grund). Details in §B5.

---

# Teil A — Genres und Themes

## A1 · Marktlage 2026

| Befund | Quelle |
| --- | --- |
| Publisher haben in ~12 Monaten rund **250** Roguelike-Deckbuilder gesichtet; die Genre-Zugehörigkeit erschwert die Finanzierung inzwischen eher, als sie zu erleichtern | ingamenews (05/2026) |
| **Slay the Spire 2**: 3 Mio. Verkäufe in der ersten Woche, 5,3 Mio. bis Ende März, >108 Mio. USD allein auf Steam | Suchzusammenfassung |
| Die Fachpresse beschreibt „tägliche Pressemitteilungen über noch einen Roguelike-Deckbuilder, die meist dasselbe machen wie alle anderen" | PC Gamer |

**Konsequenz für uns:** Der Marktzugang läuft nicht mehr über „Deckbuilder mit X-Theme". Er läuft
über eine Mechanik, die man in einem Satz erzählen kann und die es noch nicht gibt. Autostich hat so
einen Satz bereits (`docs/pitch.md`: *ein Kartenspiel darüber, wer neben wem steht*). Das ist der
Vermögenswert — nicht Feuer/Blitz/Eis/Pflanze.

## A2 · Was besetzt ist

Diese Felder sind vergeben; hier hineinzugehen heißt, gegen einen bekannten Titel anzutreten.

| Feld | Besetzt durch |
| --- | --- |
| Dark-Fantasy-Dungeon | Slay the Spire (+ 2), Knock on the Coffin Lid, Vault of the Void, Roguebook, Across the Obelisk |
| Sci-Fi / Weltraum | Cobalt Core, StarVaders (2025, Pengonauts) |
| Glücksspiel / Casino / Poker | Balatro, Dungeons & Degenerate Gamblers, Luck be a Landlord, Ballionaire |
| Börse / Schulden / Finanzen | SlotsNStocks (Ende 2026) — **frisch besetzt, war bis 2025 noch frei** |
| Meta-Horror / vierte Wand | Inscryption |
| Niedliche Tiere / Autobattler | Super Auto Pets, Wildfrost |
| Piraten | Pirates Outlaws |
| Actionfilm / Agenten | Fights in Tight Spaces |
| **Elementar-Magie (Feuer/Eis/Blitz/Natur)** | **das meistbenutzte Skin des Genres überhaupt** |

Die letzte Zeile ist unbequem und gehört trotzdem in den Bericht: Autostichs aktuelles Theme ist das
generischste im Feld. Das ist kein Fehler — es ist eine ungenutzte Gelegenheit, denn die Mechanik
darunter ist es gerade nicht.

## A3 · Was frei ist

Bewertet nach: *ist es frei?* und *trägt es einen Meta-Layer?* — die zweite Spalte ist die
eigentlich interessante, weil sie die Frage des Owners beantwortet.

| Theme | Wie frei | Trägt es Meta-Progression? | Anmerkung |
| --- | --- | --- | --- |
| **Stich-Spiel als Kampfverb** | sehr frei, jetzt 1 Nachbar | ja — Ligen, Turniere, Ränge sind der Fiktion eingebaut | siehe A4 |
| **Handwerk / Manufaktur** (Schneiderei, Schmiede, Buchbinderei) | fast leer | **sehr stark** — die Werkstatt *ist* die persistente Basis | „Auto**stich**" liest sich im Englischen als *auto-stitch*; das Skin liegt buchstäblich im Namen |
| **Nicht-kämpferischer Konflikt** (Verhandlung, Gericht, Debatte) | fast leer seit Griftlands (2021) | mittel | Selten, weil Schaden ein lesbares Feedback ist und ein Argument nicht — lösbares Designproblem, keine Sackgasse |
| **Bürokratie / Verwaltung** | leer | mittel | *Papers, Please* hat bewiesen, dass die Fantasie trägt; kein Deckbuilder besetzt sie |
| **Musik / Ensemble / Setlist** | dünn | **sehr stark** — eine Diskografie ist ein Sammel-Raster | Autostich koppelt seine Score-Leiter **bereits** an Soundtrack-Stufen (`TIER_MIN` in `src/ui/music.js`) |
| **Sport / Liga-Saison** | leer im Deckbuilder | **sehr stark** — Tabelle, Saison und Rivalen *sind* der Meta-Layer | Das strukturell interessanteste Feld für unsere Frage |
| **Ökologie / Kultivierung** | dünn | stark — ein Ökosystem wächst sichtbar | Aufbauen statt Töten |
| **Nicht-westliche Mythologien** (slawisch, baltisch, westafrikanisch, andin) | frei | schwach | Reines Skin, keine Struktur |
| **Historische Epochen** (Weimar, Segelschiffszeit, Reformation) | dünn | mittel | Overtrick zeigt mit den 1920ern, dass es funktioniert |

## A4 · Die eigene Nische — und der neue Nachbar

**Overtrick** (Entwickler *celloloops*, Publisher *2 Left Thumbs*, Steam-Release August 2026) ist ein
Stich-Deckbuilder auf Bridge-Basis: man überspielt Rivalen, kauft Sonderfähigkeiten und beeindruckt
die Gesellschaft der 1920er Jahre. Roguelite-Struktur, handgezeichneter Stil.

> *Belegstatus: aus Presseberichterstattung und Suchzusammenfassungen. Die Steam-Produktseite war
> aus dieser Session nicht abrufbar; Mechanik-Details sind nicht am Produkt verifiziert.*

**Was das für Autostich heißt — und was nicht.**

Es heißt *nicht*, dass die Nische weg ist. Der entscheidende Unterschied steht in unserer eigenen
Kernidee (README §1): Autostich ist ein **Stechspiel ohne Spielerentscheidung im Kampf**. Overtrick
lässt den Spieler Karten ausspielen; Autostich lässt ihn *die Reihenfolge bauen* und schaut dann zu.
Das sind zwei verschiedene Spiele im selben Regalfach:

| | Overtrick | Autostich |
| --- | --- | --- |
| Wer spielt den Stich? | der Spieler | die Automatik |
| Wo liegt die Entscheidung? | im Stich | **zwischen** den Durchläufen |
| Verwandt mit | Bridge, Skat | Autobattler, Engine-Building |
| Scheiterbar? | vermutlich ja | **nein** (`MAX_CYCLES`, kein Tod) |

Es heißt aber sehr wohl: **das Fenster ist nicht mehr unbegrenzt offen**, und wenn jemand nach einem
Vergleichstitel fragt, gibt es ab jetzt einen. Beobachten, nicht hetzen.

## A5 · Fazit A

**Ja, es gibt freie Themes — aber ein Theme ist kein Meta-Layer.**

Ein Theme beantwortet „wie sieht es aus". Ein Meta-Layer beantwortet „warum komme ich wieder".
Die Tabelle in A3 zeigt, dass die stärksten freien Felder genau die sind, deren Fiktion eine
Fortschrittsstruktur *mitbringt* — Werkstatt, Diskografie, Liga-Saison. Das ist der brauchbare Teil
des Befunds:

> Ein Theme trägt einen Meta-Layer dann, wenn die Fiktion selbst schon eine Leiter, eine Sammlung
> oder einen Gegner enthält. „Elementar-Magie" enthält nichts davon. „Saison mit Tabelle" enthält
> alles davon.

Deshalb geht Teil B nicht über Themes, sondern über Struktur.

---

# Teil B — Der Hook

## B1 · Die Diagnose

Der Owner fragt: *warum will ich besser werden, was will ich erreichen, wo will ich hin, wen will
ich besiegen.* Vier Fragen — und Autostich beantwortet derzeit keine davon, aus einem einzigen
strukturellen Grund.

**Am Code gemessen:**

1. `MAX_CYCLES = 50`, kein Leben, kein Tod (README §1). Jeder Lauf endet identisch: er ist vorbei.
2. Score ist die *einzige* Ziel-Metrik (README §12), und Score hat keine Schwelle.
3. `VALUE_CAP = null`, Gegner-Maximum 10 → **ab Kartenwert 11 gewinnt jeder Stich sicher.** Die
   zweite Laufhälfte ist mechanisch entschieden, bevor sie gespielt wird.

Aus 1 und 2 folgt: **der Lauf fällt kein Urteil.** Aus 3 folgt: **er baut in der zweiten Hälfte keine
Spannung mehr auf.** Ein Spieler, der 50 Durchläufe zusieht und am Ende eine Zahl bekommt, die weder
bestanden noch durchgefallen bedeutet, hat nichts, wogegen er antreten könnte — auch nicht gegen
sich selbst.

Genau deshalb fühlt sich „höherer Highscore" nicht wie ein Hook an. Ein Score *ist* kein Ziel.
Ein Score wird erst dann zum Ziel, wenn ihm etwas gegenübersteht: eine Schwelle, ein Gegner oder ein
anderer Mensch. Balatro hat alle drei (Ante-Schwelle, Blind mit Gesicht und Namen, Ranglisten).
Autostich hat den Score nackt.

## B2 · Die acht Hook-Archetypen

Das ist die Antwort auf „welche Genre-Vertreter haben den größten Hook, warum und wie". Sortiert
nach Zugkraft, nicht nach Bekanntheit.

### 1. Narrativer Tropfen — *der stärkste, der teuerste*

**Vertreter:** Hades, Inscryption, Griftlands, Cult of the Lamb.
**Was der Spieler jagt:** neue Szenen.
**Warum es zieht:** Es ist der einzige Hook, bei dem ein **gescheiterter** Lauf trotzdem bezahlt.
Hades gibt nach jedem Tod neue Dialogzeilen; die *Fated List of Minor Prophecies* und die
Beziehungen über Nektar/Ambrosia laufen unabhängig vom Erfolg weiter. Man verliert nie umsonst.
**Kosten:** sehr hoch — das ist Schreib- und Vertonungsarbeit, nicht Systemarbeit.
**Für Autostich:** nicht empfohlen. Falsches Kosten-Profil für ein Solo-Projekt.

### 2. Benannter Gegner — *die direkteste Antwort auf „wen besiege ich"*

**Vertreter:** Hades (Hades selbst), Slay the Spire (das Herz), Sport-Titel mit Erzrivalen.
**Was der Spieler jagt:** ein Gesicht.
**Warum es zieht:** Ein Gegner mit Namen macht aus einer Zahl eine Auseinandersetzung. „Ante 8
schaffen" ist eine Aufgabe; „den Kerl da schlagen" ist ein Motiv. Menschen mobilisieren gegen
Personen deutlich zuverlässiger als gegen Metriken.
**Kosten:** niedrig, wenn die Zahlen schon existieren — der Gegner ist Anzeige plus Schwelle.
**Für Autostich:** **hoch relevant.** Es gibt aktuell buchstäblich keinen Gegner — die Gegenseite ist
ein anonymer Kartenwert ≤10. Siehe P2.

### 3. Sammel-Raster — *der zuverlässigste „nur noch einer"*

**Vertreter:** Balatro (Joker-Sammelalbum), Binding of Isaac, Vampire Survivors.
**Was der Spieler jagt:** leere Plätze.
**Warum es zieht:** Fortschritt wird **sichtbar und körnig**. In Balatro werden Joker und Voucher
durch konkrete Aufgaben freigeschaltet; auch ein verlorener Lauf schiebt oft etwas weiter — genau
das erklärt das „noch ein Lauf"-Phänomen. Ein leeres Feld im Raster ist eine offene Schleife, und
offene Schleifen schließen Menschen ungern.
**Kosten:** gering, wenn die Freischaltbedingungen schon existieren.
**Sättigt:** ja — wenn das Raster voll ist, ist der Hook weg.
**Für Autostich:** **sofort verfügbar.** `src/game/cosmetics.js` hat bereits ein reichhaltiges
Bedingungssystem (`completedGames`, `streak`, `score`, `noRerollRun`, `monoArchetypeRun`,
`allMonoArchetypes`, `allArchetypesRun`, `gottgleichRun`, `championWeek`). Was fehlt, ist die
**Vitrine**, die die verschlossenen Plätze zeigt. Siehe P4.

### 4. Schwierigkeits-Leiter

**Vertreter:** Slay the Spire (Ascension 0–20), Balatro (8 Stakes **pro Deck**), Hades (Pact of
Punishment / Heat), Monster Train (Covenant), Dead Cells (Boss Cells).
**Was der Spieler jagt:** die nächste Sprosse.
**Warum es zieht:** Legibilität. Man weiß immer genau, wo man steht und was als Nächstes kommt.
Balatro multipliziert das geschickt: Stakes × Decks ergibt ein zweidimensionales Raster statt einer
Linie. Hades' Pact ist die reifste Form — die Schwierigkeit ist **modular und vom Spieler
zusammengestellt**, und sie zahlt in Währung und Freischaltungen aus, statt bloß Härtetest zu sein.
**Sättigt:** stark. Nur eine kleine Minderheit erreicht je die Spitze (A20 gilt in der Community als
Hunderte-Stunden-Ziel; die exakte Steam-Quote war hier nicht abrufbar — *abgeleitet, nicht gemessen*).
**Für Autostich:** teilweise vorhanden — die Wochen-Modifikatoren sind Härte, aber sie sind
*gewürfelt*, nicht *gewählt*. Hades' Lehre wäre: den Spieler die Härte selbst zusammenstellen lassen
und dafür bezahlen.

### 5. Wachsende Welt / Basis

**Vertreter:** Wildfrost (Snowdell), Loop Hero, Cult of the Lamb, Darkest Dungeon, Rogue Legacy.
**Was der Spieler jagt:** einen Ort, der sich verändert.
**Warum es zieht:** In Wildfrost baut man zwischen den Läufen die Stadt wieder auf; neue Läden geben
neue Karten, Stämme, Gegenstände. Der Lauf zahlt in etwas ein, das man **sieht**, und das ist über
Sitzungsgrenzen hinweg stärker als eine Statistik, weil man es wiedererkennt.
**Kosten:** hoch (Artwork, Zustände, UI).
**Für Autostich:** interessant im Zusammenspiel mit dem Handwerks-Theme aus A3, aber teuer.

### 6. Kombinatorische Neugier

**Vertreter:** Monster Train (Fraktions-Paare), Slay the Spire (Charaktere), Across the Obelisk.
**Was der Spieler jagt:** die Kombination, die er noch nicht probiert hat.
**Warum es zieht:** Der Hook skaliert multiplikativ mit dem Inhalt, ohne dass neuer Inhalt nötig ist.
**Für Autostich:** **schon da und unterausgespielt.** Vier Archetypen ergeben sechs Paare und elf
nicht-triviale Kombinationen; `cosmetics.js` kennt bereits `monoArchetypeRun` und
`allArchetypesRun`. Das ist ein fertiger Aufgabenraum, der nur benannt werden muss.

### 7. Score und Rangliste

**Vertreter:** Balatro (Endlos), Tages- und Wochen-Seeds überall im Genre.
**Was der Spieler jagt:** eine größere Zahl — *aber nur, wenn ihr etwas gegenübersteht.*
**Warum es zieht (und wann nicht):** Ein Score ohne Vergleichsziel ist der schwächste Hook des
Feldes. Mit Vergleichsziel ist er einer der stärksten. Die Rangliste liefert das Ziel: Spieler sehen
den Abstand nach oben, und der Abstand ist das Motiv. Kleine Ranglisten binden dabei besser als
große — in einer Untersuchung hielt ausgerechnet die **Top-5**-Rangliste den höchsten Spieleranteil.
**Für Autostich:** genau der Ist-Zustand — und die lokale Bestenliste ist bereits Top 5
(`as_highscores`), was zufällig die belegt beste Größe ist.

### 8. Asynchrones PvP

**Vertreter:** Super Auto Pets, The Bazaar, Backpack Battles.
**Was der Spieler jagt:** andere Menschen.
**Warum es zieht:** Der **einzige Hook, der nie sättigt**, weil der Inhalt von anderen Spielern
nachwächst. Ohne Zeitdruck gespielt, im eigenen Tempo.
**Kosten:** hoch — braucht Population und Matchmaking.
**Für Autostich:** die Wochen-Rangliste ist bereits die abgeschwächte Form davon. Sie ist der
strategisch wertvollste Besitz des Spiels, weil sie als einzige nicht satt wird.

### Zusammenfassung

| Archetyp | Zugkraft | Kosten | Sättigt | Autostich |
| --- | --- | --- | --- | --- |
| Narrativer Tropfen | sehr hoch | sehr hoch | ja | nicht empfohlen |
| **Benannter Gegner** | **hoch** | **niedrig** | nein | **fehlt vollständig** |
| **Sammel-Raster** | **hoch** | **niedrig** | ja | **Daten da, Anzeige fehlt** |
| Schwierigkeits-Leiter | mittelhoch | mittel | stark | teilweise (gewürfelt statt gewählt) |
| Wachsende Basis | hoch | hoch | langsam | nicht vorhanden |
| Kombinatorische Neugier | mittel | sehr niedrig | nein | vorhanden, unbenannt |
| Score / Rangliste | niedrig **allein**, hoch **mit Gegenüber** | niedrig | nein | Ist-Zustand, ohne Gegenüber |
| Asynchrones PvP | sehr hoch | hoch | **nie** | Wochenmodus als Vorstufe |

## B3 · Die vier Fragen, direkt beantwortet

| Frage des Owners | Was sie in Wahrheit verlangt | Was Autostich heute liefert |
| --- | --- | --- |
| *Warum will ich besser werden?* | Etwas, das vorenthalten wird **und sichtbar ist** | Freischaltungen existieren, sind aber nicht als leere Plätze zu sehen |
| *Was will ich erreichen?* | Eine **benannte Schwelle**, keine größere Zahl | nichts — Score hat keine Schwelle |
| *Wo will ich hin?* | Ein **gezeichnetes** Ziel, kein berechnetes | Musikstufen (`TIER_MIN`) — vorhanden, aber unsichtbar |
| *Wen will ich besiegen?* | Ein **Gesicht mit Namen** | nichts — die Gegenseite ist ein anonymer Wert ≤10 |

Drei der vier Antworten liegen bereits im Code. Sie sind nur nicht adressiert.

## B4 · Inventur — was schon da ist

| System | Datei | Hook-Archetyp | Zustand |
| --- | --- | --- | --- |
| SP-Upgrade-Baum | `progression.js` | Machtrampe | vollständig — aber Machtrampe ist *kein* Hook, sondern eine Belohnung |
| DP-Werkstatt (kosmetisch) | `cosmetics.js` | Sammel-Raster | Bedingungen reich, **Vitrine fehlt** |
| Wochen-Rangliste, 19 Modifikatoren | `weekMods.js`, `weeklySeed.js` | PvP-Vorstufe + Leiter | wirksam verdrahtet (`reducer.js`, `engine.js`) |
| Challenger-Seeds | `weeklySeed.js` | Vergleich | vorhanden |
| Globale Bestenliste | `leaderboard.js` (Supabase) | Rangliste | vorhanden |
| Lokale Top 5 | `storage.js` | Rangliste | vorhanden — **Top 5 ist die belegt bindungsstärkste Größe** |
| Geist des Rekordlaufs | `as_ghost`, `GHOST_STEP = 13` | *fast* ein benannter Gegner | **Trajektorie da, Gegner fehlt** |
| Soundtrack-Stufen | `TIER_MIN` in `src/ui/music.js` | *fast* eine Route | **Ziel da, Karte fehlt** |

Das ist die eigentliche Pointe der Inventur: **es fehlt kein System.** Es fehlen drei Beschriftungen
und ein Urteil.

## B5 · Empfehlung

Nach Verhältnis Wirkung/Aufwand sortiert. Alle vier deuten vorhandene Daten um; keiner führt eine
neue Währung, einen neuen Baum oder einen neuen Lauf-Modus ein.

### P1 — „Das Soll": ein Urteil pro Lauf

Jeder Lauf bekommt **vor dem Start** eine Zielpunktzahl. Am Ende steht nicht nur eine Zahl, sondern
*bestanden* oder *nicht bestanden*.

Das ist die kleinste denkbare Änderung mit der größten Wirkung, weil sie die Diagnose aus B1 direkt
adressiert: sie gibt dem Lauf ein Urteil, ohne ihm einen Tod zu geben. Herkunft des Solls (Vorschlag,
nicht Beschluss): aus dem Wochen-Seed, aus dem gewählten Archetyp-Paar, oder aus dem eigenen
Median — nicht aus dem eigenen Rekord, sonst bestraft es gute Läufe.

*Beantwortet: „was will ich erreichen".*

### P2 — „Die Rivalen": aus dem Geist wird ein Gegner

Der Geist speichert bereits die Score-Trajektorie des Rekordlaufs in Schritten von 13 Stichen. Das
ist technisch ein Gegner — er hat nur keinen Namen, kein Gesicht und keine Absicht.

Vorschlag: eine kleine Riege benannter Rivalen mit je einer eigenen Trajektorie und einem eigenen
Soll, aufsteigend. Man besiegt sie der Reihe nach, und der letzte ist schwer. Der eigene Rekordgeist
bleibt daneben bestehen.

Das ist der Hook-Archetyp mit dem besten Kosten-Wirkungs-Verhältnis im ganzen Feld (B2 §2), und die
Datenstruktur dafür existiert.

*Beantwortet: „wen will ich besiegen".*

### P3 — „Die Route": das Ziel sichtbar machen

Die Soundtrack-Stufen sind bereits eine Score-Leiter mit einer echten, begehrenswerten Belohnung —
und der Pitch verkauft sie ausdrücklich (*„Tracks, die kaum jemand hört"*). Sie sind nur nirgends
gezeichnet.

Vorschlag: die Score-Skala als sichtbare Strecke mit den Tracks als Stationen, inklusive der noch
nicht erreichten. Man sieht, wo man ist und was als Nächstes kommt.

*Beantwortet: „wo will ich hin".*

### P4 — „Die Vitrine": die leeren Plätze zeigen

`cosmetics.js` kennt zehn Freischaltarten. Ein Spieler, der die Bedingung nicht sieht, kann sie nicht
verfolgen — ein Sammel-Raster wirkt nur, wenn die Lücken sichtbar sind (B2 §3).

Vorschlag: das Deck-/Skin-Raster zeigt alle Plätze, verschlossene ausgegraut mit ihrer Bedingung
im Klartext. Das macht nebenbei die kombinatorische Neugier aus B2 §6 sichtbar — „alle vier
Fraktionen in einem Lauf" ist eine Aufgabe, sobald sie irgendwo steht.

*Beantwortet: „warum will ich besser werden".*

### Reihenfolge

**P1 zuerst, dann P2.** Diese beiden zusammen erzeugen den Hook; P3 und P4 verstärken ihn. P1 allein
wirkt bereits, P2 ohne P1 nur halb (ein Rivale ohne Schwelle ist wieder nur eine Zahl).

## B6 · Was nicht zu tun ist

- **Keine dritte Währung.** SP und DP reichen. Eine weitere Währung erzeugt Verwaltung, keinen Sog.
- **Den Upgrade-Baum nicht verlängern.** Eine Machtrampe belohnt Wiederkommen, sie *verursacht* es
  nicht. Wer schon nicht wiederkommt, wird von mehr Knoten nicht überzeugt.
- **Nicht die Score-Decke anheben.** Größere Zahlen lösen kein Zahlenproblem.
- **Das Theme nicht wechseln, um ein freies Feld aus A3 zu besetzen.** Ein Theme repariert keinen
  Hook (A5). Falls das Element-Quartett später umgedeutet wird, dann als eigene Entscheidung mit
  eigenem Anlass — nicht als Hook-Reparatur.

## B7 · Risiko

`docs/pitch.md` verkauft ausdrücklich: *„A card game you can't lose, only out-build."* P1 steht dazu
in Spannung, und das ist bewusst zu adressieren.

Die Auflösung: **ein Soll ist ein Urteil, kein Verlustzustand.** Der Lauf läuft weiter über alle 50
Durchläufe, der Score zählt weiter, nichts bricht ab. Am Ende steht zusätzlich, ob das Soll erreicht
wurde. Wer es verfehlt, hat trotzdem einen vollständigen Lauf gespielt und SP/DP verdient — genau
das Muster, mit dem Balatro auch aus verlorenen Läufen noch Fortschritt zahlt.

Formuliert man es so, bleibt der Pitch wahr. Formuliert man es als Scheitern, ist er es nicht mehr.
Das ist eine Produktentscheidung und gehört dem Owner.

---

## Offene Punkte

- **Overtrick ist nicht am Produkt verifiziert.** Steam war aus dieser Session nicht erreichbar.
  Vor einer Positionierungsentscheidung sollte jemand das Spiel tatsächlich ansehen.
- **Die A20-Abschlussquote ist abgeleitet, nicht gemessen.** Die Aussage „Schwierigkeits-Leitern
  sättigen stark" stützt sich auf Community-Diskussion, nicht auf die Steam-Statistik.
- **Der Kopfkommentar in `src/game/weekMods.js` ist veraltet**: er kündigt die Wirkung der
  Modifikatoren für „Phase 3" an, obwohl `reducer.js` und `engine.js` sie bereits auswerten.
  Kleinigkeit, aber sie führt beim Lesen in die Irre.

## Quellen

- [Gaming News: Why Publishers Are Avoiding Roguelike Deckbuilders in 2026 — ingamenews](https://www.ingamenews.com/2026/05/gaming-news-why-publishers-are-avoiding.html)
- [Every game is a roguelike deckbuilder now — PC Gamer](https://www.pcgamer.com/games/roguelike/every-game-is-a-roguelike-deckbuilder-now-but-ive-finally-found-a-few-that-have-stopped-me-being-a-hater/)
- [Overtrick — COGconnected](https://cogconnected.com/2026/08/overtrick-launches-on-steam-putting-a-roguelike-twist-on-classic-card-games/) · [Games Press](https://www.gamespress.com/A-trick-taking-deckbuilder-with-style)
- [Stakes — Balatro Wiki](https://balatrogame.fandom.com/wiki/Stakes)
- [Mirror of Night](https://hades.fandom.com/wiki/Mirror_of_Night) · [Pact of Punishment — Hades Wiki](https://hades.fandom.com/wiki/Pact_of_Punishment)
- [Underworld Unfolded: How Hades Balances Narrative and Gameplay (Uppsala universitet)](https://uu.diva-portal.org/smash/get/diva2:1965991/FULLTEXT01.pdf)
- [Wildfrost — Progression loop outside of runs](https://steamcommunity.com/app/1811990/discussions/0/6620894968767703516/) · [TheSixthAxis Review](https://www.thesixthaxis.com/2023/04/11/wildfrost-review-a-hot-new-card-game/)
- [How to Design Leaderboards for Your Mobile Game — Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/leaderboards)
- [Leaderboard Effects on Player Performance in a Citizen Science Game (arXiv)](https://arxiv.org/pdf/1707.03704)
- [StarVaders — Wikipedia](https://en.wikipedia.org/wiki/StarVaders) · [Dungeons & Degenerate Gamblers — Wikipedia](https://en.wikipedia.org/wiki/Dungeons_%26_Degenerate_Gamblers)
- [Roguelike Deckbuilders — Rogueliker](https://rogueliker.com/roguelike-deckbuilders/)
- [Ascend 20 — TrueAchievements](https://www.trueachievements.com/a280165/ascend-20-achievement)
