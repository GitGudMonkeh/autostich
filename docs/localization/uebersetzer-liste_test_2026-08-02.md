# Übersetzer-Liste — neue & geänderte Beschreibungen (Test-Stand 2026-08-02)

**Quelle:** Branch `Autostich_Test` (die spielbare Test-Seite `/autostich/test/`), gemessen gegen `main`.
**Umfang:** alle heute auf test abgearbeiteten Issues (#252–#262) + der neue **Architekt-Pool** (Batches 1–5) + neue legendäre Perks.
**Zweck:** saubere DE-Formulierung vor der EN-Übersetzung. Gilt als Ergänzung zu `strings_de_BEGLEITINFO.md` — dieselben Regeln (Zahlenformat, Platzhalter, zusammengesetzte Sätze, Match-Listen fürs Auto-Fetten).

> ✅ **Delta-CSV liegt bei:** `strings_de_delta_test_2026-08-02.csv` (86 Zeilen, gleiches 8-Spalten-Format wie `strings_de.csv`, UTF-8 ohne BOM, CRLF).
> Enthält alle heute **neuen/geänderten/entfernten** Zeilen, die noch nicht im Haupt-Export stehen: neue Perk-Familien, neue legendäre Perks, neue Architekt-Baupläne (`item.architect.*`), neue Bau-/Kartendetail-Readouts (`store.architectscreen.eff-*`/`kick-*`, `ui.archeffects.*`) und die neuen UI-Texte (#252/#254/#261/#262 + Skill-Warnung). Die Datentexte (`item.*`) sind **drift-frei per Node-Import** aus den echten Registern gezogen (Zahlen resolvet); die UI-Zeilen byte-treu aus dem Quelltext.
> **Im Haupt-`strings_de.csv` bereits aktualisiert:** nur die Skill-Zeilen (`ability.SK_*`, #258). Die Delta-Zeilen beim nächsten Master-Sync in `strings_de.csv` einmergen (sortiert nach `category` → `id`).
>
> **Zwei Wortlaut-Konflikte im Delta markiert (bitte beim DE-Glattziehen entscheiden):**
> 1. **„Score" vs. „Punkte":** die neuen Readouts sagen (wie der Code) **„Score"**; die bestehenden `store.architectscreen.eff-*` / `ui.archeffects.*`-Zeilen im Haupt-Export sagen noch **„Punkte"**. Bitte den ganzen Block auf **eine** Schreibweise vereinheitlichen.
> 2. **„banken" → „ablagern":** #258 ersetzt in den Eis-Skills „banken" durch „lagert … ab". Der Glossar-Eintrag `bank` und seine `match`-Formen sind entsprechend nachzuziehen (siehe Teil B).

---

## Teil A — Beschreibungstexte (neu / geändert)

### A0. Übersicht: welche Issue hat Textarbeit?

| Issue / Feature | Textarbeit? | Bereich |
|---|---|---|
| **#252** Score-Quellen-Balken im StatusRail | **ja** (2 neue Überschriften) | UI |
| **#253** Statblock skaliert bei hohen Scores | nein (nur Layout) | — |
| **#254** Abbruch-Rückfrage friert den Lauf ein | **ja** (neuer Dialog) | UI |
| **#255** Gebäuderahmen über Segmentgrenzen | nein | — |
| **#258** Skill-Beschreibungen mit konkreten Zahlen | **ja** (viele Skills umformuliert) | Daten (Skills) |
| **#259** Mobile-Performance / Memoisierung | nein | — |
| **#260** Lauf-Timer läuft weiter | nein | — |
| **#261** Architekt: perk-artige Auswahl + Aufwerten klickbar | **ja** (Hilfetexte + Buttons) | UI |
| **#262** Drehen-Button ausgrauen | **ja** (Button + Tooltip) | UI |
| Skill-Ersetzen-Warnung (letzter Archetyp-Skill) | **ja** (neuer Warntext, ersetzt alten) | UI |
| **Architekt-Pool** (Batches 1–5, ohne Issue-Nr.) | **ja, viel** | Daten (Gebäude/Perks) |

---

### A1. Skill-Beschreibungen mit konkreten Zahlen (#258) — *bereits im CSV*

Die vagen Formulierungen wurden durch konkrete Zahlen ersetzt (Zahlen kommen aus `constants.js`, im CSV resolvet).
Für den Übersetzer: nur **Glattziehen**, keine neue Mechanik. Alle Zeilen liegen unter `ability.SK_*.desc`.

| ID | vorher | nachher (aktuell) |
|---|---|---|
| `ability.SK_LIGHTNING_03.desc` | „…werden zusätzliche Karten ionisiert (Breite)." | „…werden **+2 weitere** Karten ionisiert (Breite)." |
| `ability.SK_LIGHTNING_05.desc` | „…bleibt ein Ladungsboden erhalten." | „…bleiben **3 Ladung** als Boden erhalten (statt 0)." |
| `ability.SK_LIGHTNING_13.desc` | „…erhöht die Crit-Chance des nächsten Siegs…" | „…gibt **+5 pp** Crit-Chance für den nächsten Sieg (bis **+50 pp**)…" |
| `ability.SK_LIGHTNING_16.desc` | „…gibt Ladung, skaliert mit der Serienlänge…" | „…gibt **+1 Ladung je 3 Serienpunkte** (höchstens **+3/Sieg**)…" |
| `ability.SK_LIGHTNING_17.desc` | „Bei Serienschwellen ionisiert es Karten…" | „Bei **jeder 5. Serienstufe** werden **2 Karten** ionisiert…" |
| `ability.SK_LIGHTNING_L02.desc` | „…feuert der Konsument mehrfach…" | „…feuert der Konsument **3-fach (3× Ionisierungs-Anzahl)**…: **+16 je Stapel** im Feld (gedeckelt **120**…)" |
| `ability.SK_ICE_03.desc` | „…ungenutzte banken Schicht-Fortschritt." | „…jeder ungenutzte Tausch lagert **+1 Schicht** ab." |
| `ability.SK_ICE_07.desc` | „…bankt sie trotzdem Schicht-Fortschritt…" | „…lagert sie trotzdem **+1 Schicht** ab…" |
| `ability.SK_ICE_09.desc` | „…banken doppelten Fortschritt…" | „…lagern die **2-fache Schicht** ab (**+2 statt +1**)…" |
| `ability.SK_ICE_10.desc` | „Je tiefer die Schichten…, desto höher ihr Formationsfaktor…" | „Je Schicht **+5 % Formationsfaktor** (wirksam bis **12 Schichten**)…" |
| `ability.SK_ICE_11.desc` | „Übersteigt die Summe aller Schichten eine Schwelle…" | „Ab **20 Schichten** insgesamt … erhalten alle Frostkarten **+2 Stichwert**…" |
| `ability.SK_ICE_16.desc` | „…banken ihre direkten … Nachbarn Schicht-Fortschritt." | „…lagern ihre direkten (gefrorenen) Nachbarn **je +1 Schicht** ab." |
| `ability.SK_ICE_17.desc` | „…lagert sie mehrere Schichten auf einmal ab…" | „…lagert sie **+2 Schichten** auf einmal ab…" |
| `ability.SK_ICE_L04.desc` | „Schaltet vertikale Formationen frei…" | „…**je zusätzliche Frostkarte in der Spalte +55 % Formationsfaktor.**" |
| `ability.SK_PLANT_15.desc` | „…erntest du +Wachstum." | „…erntest du **+2 Wachstum**." |
| `ability.SK_PLANT_16.desc` | „…Kolonisiert aggressiver … und beim Ernten den Gegner-Nachbarn mit." | „**Beim Ernten wird ein ebenfalls kolonisierter Gegner-Nachbar mitgeerntet — +2 Wachstum extra.**" |

> **Wichtig für DE-Konsistenz:** Diese Umschreibungen führen „Wortlaut-Wechsel" ein: **banken → ablagern/„… lagert X Schicht(en) ab"**. Der alte Begriff **Bank (Ablage)** steht noch im Glossar (`bank`). Bitte gegenlesen, ob „banken" jetzt überall raus soll (dann Glossar-Match anpassen — siehe Teil B).

---

### A2. Architekt-Pool — neue Gebäude-Baupläne (Batches 1–4)

Neue Bau-Mechaniken. **Name** + **Effekt-Readout** sind je spielerseitig sichtbar. Die Readouts werden aus Bausteinen erzeugt (`famEff` in `ArchitectScreen.jsx`), Zahlen kommen aus der Bauplan-Definition (`architect.js`). Behandle sie als **Satzbausteine**, nicht als feste Sätze.

**Neue Gebäude-Namen (`name`):**

| id | Name | Kategorie | Mechanik (neu) |
|---|---|---|---|
| `A_ZUNFTV` | **Zunftviertel** | Wert | Nachbarschaft (Distrikt) |
| `A_WEHRGANG` | **Wehrgang** | Wert | Lage (frühe Segmente) |
| `A_MARKT` | **Marktplatz** | Score | Nachbarschaft |
| `A_SPEICHER` | **Speicherstadt** | Score | Ballung (vollendete Strukturen) |
| `A_VORWERK` | **Vorwerk** | Score | Lage (frühe Segmente) |
| `A_LAUFGANG` | **Laufgang** | Score | Staffel (weiterreichen) |
| `A_LOSBUDE` | **Losbude** | Score | Risiko (Crit-Wette) |
| `A_WETTHALLE` | **Wetthalle** | Score | Risiko (Crit-Wette) |

**Neue Effekt-Readout-Bausteine (`ui.architectscreen.eff-*`):**

| Mechanik (`kind`) | Readout-Text (Wert-Variante / Score-Variante) |
|---|---|
| `neighbor` | „**+{n} Stichwert je Nachbargebäude (max {cap})**" / „**Sieg +{n} Score je Nachbargebäude (max {cap})**" |
| `compound` | „**Sieg +{n} Score je vollendeter Struktur**" |
| `segment` | „**frühe Segmente +{n} Stichwert/Score**" bzw. „**späte Segmente …**" |
| `relay` | „**reicht +{n} Score ans Feld rechts weiter**" (bzw. legendär: „**strahlt +{n} Score in beide Nachbarfelder**") |
| `gamble` | „**Crit-Sieg +{n} Score · Sieg ohne Crit −{penalty}**" |

**Zusätzlicher Score-Aufschlüsselungs-Text (`src/ui/archEffects.js`, Victory-Breakdown):**
- `gamble`: „**+{crit} Score bei Crit, sonst −{penalty}**"
- `relay`: „**+{n} Score (Staffel)**"

---

### A3. Architekt-Pool — Stufen-Kicker (`tierKick`)

Beim **Aufwerten** zündet ab einer bestimmten Stufe ein **qualitativer Zusatz** (nicht nur eine größere Zahl). Sichtbar im Aufwert-Readout: aktiv → als Nachsatz mit „ · ", noch nicht erreicht → als Vorschau „(Stufe {at}: …)".

Neue Readout-Bausteine (`ui.architectscreen.kick-*`):

| Kicker | Text |
|---|---|
| `mult` (Zollhaus IV) | „**zusätzlich ×{mult} Score**" |
| `critFlatMult` (Kontor IV) | „**Crit zählt {n}×**" |
| `streakDoubleFrom` (Reihenhaus III) | „**ab Serie {n} doppelt**" |
| `every` (Meilenstein IV) | „**Meilenstein jetzt alle {n} Siege**" |
| `addType` (Klammer III) | „**+ zweiter Joker-Typ**" |
| `ankerValue` (Grundstein III) | „**+{n} Stichwert je Ankerzelle**" |
| Vorschau-Rahmen | aktiv: „**{Basis-Readout} · {Kicker}**" · Vorschau: „**{Basis-Readout} (Stufe {at}: {Kicker})**" |

> Bitte prüfen, ob die exakten Kicker-Formulierungen im Code (`famEff`, ca. Zeile 512–522 in `ArchitectScreen.jsx`) mit obiger Tabelle deckungsgleich sind — ich habe sie zur Übersicht leicht normalisiert.

---

### A4. Architekt-Pool — legendäre Gebäude (Batch 5)

Neue Namen (`name`), Effekte laufen über die Mechaniken aus A2 (kommen ohne Stufen, „fertig stark"):

| id | Name | Effekt |
|---|---|---|
| `A_LEUCHTTURM` | **Leuchtturm** | Staffel in **beide** Nachbarfelder |
| `A_RATHAUS` | **Rathaus** | Nachbarschaft, großer Deckel („Distrikt-Hauptstadt") |
| `A_SPIELBANK` | **Spielbank** | Risiko, größter Jackpot |
| `A_STERNWARTE` | **Sternwarte** | Ballung (+Score je vollendeter Struktur) |
| `A_ZWINGER` | **Zwinger** | Wert-Distrikt (Nachbarschaft), große Fläche |

---

### A5. Neue Perk-Familien (`families.js`)

Vollständige Beschreibungstexte (die Stufen-Texte werden je Stufe angezeigt). Zahlen sind hier **Literale im Code** (keine Konstante) — als Zahl übernehmen.

**`D_BEBAUUNG` — „Dichte Bebauung"** (Score-Familie, nur mit Architekt)
- I: „Jeder Sieg: **+4 Score je abgedeckter Position** (max +100)."
- II: „Jeder Sieg: **+6** Score je abgedeckter Position (max +160)."
- III: „Jeder Sieg: **+9** Score je abgedeckter Position (max +240)."
- IV: „Jeder Sieg: **+12** Score je abgedeckter Position (max +360)."

**`B_FINALE` — „Starkes Finale"** (Spiegel zu „Auftakt"; Template `MUSTER_DESC`)
- „Die **letzten {n} Karten** jedes Durchlaufs: je **+{wert} Stichwert**." (Stufen: 2/2 · 3/3 · 4/4 · 5/5)

**`A_HIGH_STRONG` — „Starke Karten werden stärker"** (Spiegel zu „…werden stärker" von unten; Template)
- „Alle ursprünglichen **{gruppe}**: dauerhaft **+{wert} Kartenwert**." (Stufen: 6er/1 · 7er/2 · 8er/3 · „9er und 10er"/4)

**`C_ECKPFEILER` — „Eckpfeiler"** (Formation)
- I: „Wähle 1 Karte: **liegt sie in ≥1 Formation, +3 Stichwert**."
- II: „Wähle 2 Karten: **in ≥1 Formation, +4 Stichwert**."
- III: „Wähle 3 Karten: **in ≥1 Formation, +5 Stichwert**."
- IV: „Wähle 4 Karten: **in ≥1 Formation +6; liegt die Karte in ≥2 Formationen, +9 Stichwert**."

**`C_ECKSTEIN` — „Eckstein"** (Gebäude-Perk, nur mit Architekt)
- I: „Wähle 1 Karte: **liegt sie unter einem Gebäude, +3 Stichwert**."
- II: „Wähle 2 Karten: **unter einem Gebäude, +4 Stichwert**."
- III: „Wähle 3 Karten: **unter einem Gebäude, +5 Stichwert**."
- IV: „Wähle 4 Karten: **unter einem Gebäude +6; unter einer vollendeten Struktur +9 Stichwert**."

---

### A6. Neue legendäre Perks (`perks.js`)

Zahlen kommen aus `constants.js` → **vor EN tokenisieren** (siehe Teil C).

**`L_MONO` — „Monochrom"** (Kategorie D, legendär)
> „Jeder Sieg in einer **Farbserie** zählt ×(1 + **{step} %** je Folgesieg derselben Farbe, höchstens **+{cap} %**). Ein Farbwechsel oder eine Niederlage setzt die Farbserie zurück."
> (aktuelle Werte: +15 % je Folgesieg, max +150 %)

**`L_RICHT` — „Richtfest"** (Kategorie E, legendär, nur mit Architekt)
> „Am Ende jedes Durchlaufs: je **vollendeter Gebäude-Struktur** (volle Zeile, Spalte oder Diagonale) **+{step} dauerhafter Score**. Der aufgestapelte Bonus wird jeden Durchlauf ausgezahlt (flach, kein Multiplikator)."
> (aktueller Wert: +250)

**`L_BAUH` — „Bauhütte"** (Kategorie E, legendär, nur mit Architekt)
> „Sofort: das **Baufeld** des Architekten wächst dauerhaft um **{n} Zellen** — du kannst mehr Gebäude platzieren."
> (aktueller Wert: 8)

---

### A7. UI-Texte (neu / geändert)

**#254 — Abbruch-Rückfrage** (`App.jsx`), 4 neue Strings:
- Titel: „**Lauf wirklich abbrechen?**"
- Text: „**Der Fortschritt dieses Laufs geht verloren.**"
- Button 1: „**Weiterspielen**"
- Button 2: „**Beenden**"

**#252 — Score-Quellen-Balken im StatusRail** (`RunStats.jsx`/`RunGraphs.jsx`), 2 einklappbare Überschriften:
- „**Woraus kommt der Score**"
- „**Score-Verlauf**"
(Die Balken-Labels „Form.-Score", „Geb.-Score", „Crit-Bonus", „Bester Stich" sind unverändert — bereits im CSV.)

**#262 — Drehen-Button ausgrauen** (`ArchitectScreen.jsx`):
- aktiver Button: „**⟳ Drehen**" (unverändert)
- deaktiviert (neu): „**⟳ Nicht drehbar**"
- Tooltip / Badge (neu): „**Diese Form lässt sich nicht drehen (belegt eine ganze Segment-Zeile bzw. ist symmetrisch).**" · Karten-Badge: „**nicht drehbar**"

**#261 — Architekt: perk-artige Auswahl + klickbares Aufwerten** (`ArchitectScreen.jsx`). Geänderte/neue Buttons & Hilfetexte:
- Bestätigen-Button (geändert): „**✓ Bestätigen · Durchlauf starten**" (vorher: „Fortfahren →")
- Aufwerten-Karte (4. Karte im Auswahlfenster): Titel „**Aufwerten**" · Unterzeile „**ein Gebäude +1 Stufe**" (bei nichts ausbaubar: „**· nichts ausbaubar**")
- „Kein Platz"-Badge (geändert): „**kein Platz → ersetzen**"
- Ersetzen-Hilfetext *(zusammengesetzt mit `<b>`)*: „**Kein Platz** für „{bauplanName}". Welches Gebäude soll ersetzt werden? Wähle es unten — es wird am Brett hervorgehoben; abgerissen wird erst nach Bestätigen."
- Aufwerten-Hilfetext *(zusammengesetzt)*: „**Aufwerten:** wähle unten ein Gebäude (oder tippe es am Brett an) — es wird gold markiert, du siehst aktuellen und nächsten Effekt und bestätigst unten. Nicht aufwertbare (Legendär/No-op-Effekt/max) sind ausgegraut."
- Platzieren-Hilfetext *(zusammengesetzt)*: „**Platzieren & Verschieben:** zieh Gebäude am Brett an ihren Platz (Griff überall, **⟳ Drehen** oben) — beliebig oft. Unten **Bestätigen** startet den Durchlauf."
- „Nichts bauen"-Button: „**Nichts bauen · Fortfahren →**"

**Skill-Ersetzen-Warnung** (`SkillSelect.jsx`) — **ersetzt** den alten langen Hinweis:
- neuer Warntext *(zusammengesetzt, mit Platzhaltern)*: „**⚠ Letzter {archetyp}-Skill: {verlusttext}. Bereits aufgewerteter Kartenwert bleibt.**" (der letzte Satz nur bei „baked"-Archetypen)
- die vier `{verlusttext}`-Bausteine (`ARCH_LOSS`):
  - Pflanze: „**alle grünen Karten & das Wachstum gehen verloren**"
  - Eis: „**Frostkarten tauen auf, alle Schichten gehen verloren**"
  - Feuer: „**Hitze & Asche gehen verloren**"
  - Blitz: „**die Ladung geht verloren**"
- **Entfernt** (Alt-Text, bitte aus dem CSV nehmen): der lange Absatz „Gegner-Schwächungen (Frost/Brand/Ausläufer) werden zurückgesetzt … Eigene aufgewertete Karten … bleiben erhalten."

> **Zusammengesetzte Sätze:** Die mit *(zusammengesetzt)* markierten Hilfetexte stehen im JSX aus mehreren `<b>`-Fragmenten. Nach der Regel aus der Begleitinfo (§3b) vor der EN-Übersetzung zu je **einem** String mit Platzhalter statt inline-`<b>` umbauen.

---

## Teil B — Glossar-Erweiterung (`src/game/glossary.js`)

Das Glossar wurde heute **nicht** angefasst — die neuen Begriffe fehlen also alle. Zwei Dinge sind je Begriff nötig:
1. ein **Erklär-Eintrag** (`label` + `text`, ggf. `constant`), und
2. eine **`match`-Liste deutscher Flexionen** (sonst greift die Auto-Fettung `tokenizeGlossary` in den Beschreibungen nicht).

### B1. Neue Einträge (empfohlen: Kategorie `arch`, außer wo anders vermerkt)

| Begriff (Vorschlag `label`) | Kommt vor in | Kurz-Erklärung (Rohentwurf, bitte glätten) | `match`-Formen |
|---|---|---|---|
| **Nachbargebäude / Distrikt** | Zunftviertel, Marktplatz, Rathaus, Zwinger | Ein Gebäude, das orthogonal an ein anderes angrenzt. „Distrikt"-Baupläne zahlen je Nachbargebäude (bis zu einem Deckel) — belohnt dichtes Bauen. | `Nachbargebäude`, `Distrikt`, `Distrikte` |
| **Vollendete Struktur / Ballung** | Speicherstadt, Sternwarte, Richtfest, Eckstein IV | Eine komplett von Gebäuden abgedeckte Zeile, Spalte oder Diagonale. „Ballungs"-Baupläne zahlen je vollendeter Struktur. | `vollendete Struktur`, `vollendeter Struktur`, `vollendete Strukturen` |
| **Staffel (weiterreichen)** | Laufgang, Leuchtturm | Das Gebäude gibt seinen Score an das/die Nachbarfeld(er) weiter — der Effekt wirkt versetzt, nicht auf der eigenen Zelle. | `Staffel`, `Staffeln` |
| **Lage (Segment-Hälfte)** | Wehrgang, Vorwerk | Der Effekt zählt nur in den frühen (bzw. späten) Segmenten des Bretts — die Platzierung entscheidet. | `frühe Segmente`, `späte Segmente`, `Segment-Hälfte` |
| **Risiko / Crit-Wette** | Losbude, Wetthalle, Spielbank | Wette auf den Crit: Sieg **mit** Crit → Jackpot, Sieg **ohne** Crit → Abzug (nie unter 0). Aufwerten hebt nur den Jackpot. | `Crit-Wette`, `Wette`, `Wetten`, `Jackpot` |
| **Stufen-Kicker** | alle Handels-/Sakralbauten mit `tierKick` | Manche Gebäude schalten beim Aufwerten ab einer Stufe einen **qualitativen Zusatz** frei (nicht nur eine größere Zahl). | `Stufen-Kicker`, `Kicker` |
| **Abgedeckte Position / Gebäude-Overlay** | Dichte Bebauung, Eckstein | Eine Brettzelle, die unter einem platzierten Gebäude liegt. „Eckstein"/„Dichte Bebauung" belohnen Karten bzw. Siege je abgedeckter Position. | `abgedeckte Position`, `abgedeckter Position`, `unter einem Gebäude` |
| **Farbserie** *(Kategorie `frak`/gen oder `deck`)* | Monochrom (`L_MONO`) | Aufeinanderfolgende Siege **derselben** Kartenfarbe. Ein Farbwechsel oder eine Niederlage setzt sie zurück (Pendant zur normalen Serie, nur farbgebunden). | `Farbserie`, `Farbserien` |

### B2. Ergänzungen an bestehenden Einträgen

- **`struktur`** („Struktur-Boni"): heute kommt der neue Begriff **„vollendete Struktur"** hinzu (Zählung statt nur Faktor). Entweder dort ergänzen oder als eigenen Eintrag (B1) führen; `match` um `Struktur`, `Strukturen` erweitern, falls noch nicht enthalten.
- **`baufeld`** („Baufeld / Deckel"): „Bauhütte" hebt den Deckel — Erklärtext um den Satz „kann durch Perks (Bauhütte) wachsen" ergänzen.
- **`anker`**: „Grundstein III" (Kicker `ankerValue`) legt jetzt zusätzlich einen **Stichwert je Ankerzelle** — im Anker-Text als Sonderfall erwähnenswert.
- **`bank` / „banken"**: Durch #258 wird in den Skill-Texten fast überall **„banken"** durch **„ablagern / lagert … ab"** ersetzt. Entscheiden, ob der Eintrag `bank` (Label „Bank (Ablage)") umbenannt wird und die `match`-Liste `banken`/`bankt` durch `ablagern`/`lagert ab` ersetzt wird — sonst fettet das Glossar tote Wortformen.

### B3. Hinweis für die EN-Pflege
Alle `match`-Listen sind **deutsche** Flexionen. Bei der EN-Übersetzung müssen die Wortform-Listen der neuen Begriffe (B1) **neu** gepflegt werden (siehe Begleitinfo §2), sonst greift die Auto-Fettung im Englischen nicht.

---

## Teil C — Neue Build-Konstanten (vor EN tokenisieren)

Ergänzung zu **Anhang A** der Begleitinfo. Diese Zahlen stehen im Text **resolvet** und sollten vor der EN-Übersetzung zu Platzhaltern werden (sonst friert die Übersetzung die aktuellen Balance-Werte ein).

| Konstante | aktueller Wert | Verwendung |
|---|---|---|
| `MONOCHROM_STEP` | 0,15 (→ 15 %) | Monochrom |
| `MONOCHROM_CAP` | 1,5 (→ 150 %) | Monochrom |
| `RICHTFEST_STEP` | 250 | Richtfest |
| `BAUHUETTE_COVER` | 8 | Bauhütte |
| `REST_CHARGE_FLOOR` | 3 | SK_LIGHTNING_05 |
| `KETTENBLITZ_COUNT` | 2 | SK_LIGHTNING_03 |
| `SPANNUNGSSTAU_STEP` / `_CAP` | 0,05 / 0,50 (→ 5 / 50 pp) | SK_LIGHTNING_13 |
| `DAUERSTROM_PER_STREAK` / `_MAX` | 3 / 3 | SK_LIGHTNING_16 |
| `WETTERLEUCHTEN_THRESHOLD` / `_COUNT` | 5 / 2 | SK_LIGHTNING_17 |
| `DOPPELENTLADUNG_FACTOR` | 3 | SK_LIGHTNING_L02 |
| `ICE_UNUSED_SWAP_LAYER` | 1 | SK_ICE_03/09 |
| `VERDICHTUNG_FACTOR` | 2 | SK_ICE_09 |
| `KAELTERESERVE_LAYER` | 1 | SK_ICE_07 |
| `EISDRUCK_STEP` / `ICE_LAYER_MAX` | 0,05 / 12 | SK_ICE_10 |
| `KRISTALLINE_THRESHOLD` / `_VALUE` | 20 / 2 | SK_ICE_11 |
| `EISBLUETE_LAYER` | 1 | SK_ICE_16 |
| `VERSCHRAENKUNG_LAYERS` | 2 | SK_ICE_17 |
| `ARCHITEKT_STEP` | 0,55 (→ 55 %) | SK_ICE_L04 |
| `AUSLAEUFER_HARVEST` | 2 | SK_PLANT_15/16 |

**Zusätzlich – Gebäude-Zahlen:** Die Zahlen in den Architekt-Effekt-Readouts (A2/A4) sind **Literale in der Bauplan-Definition** (`architect.js`), keine `constants.js`-Werte. Fürs Glattziehen als Zahl übernehmen; falls die Readouts später tokenisiert werden, kommen die Tokens `{n}`, `{cap}`, `{penalty}`, `{crit}` hinzu.

---

*Erstellt 2026-08-02 aus dem Diff `main..Autostich_Test`. Bei Unklarheiten zu einer Einzelzeile: die „Quelle der Wahrheit" ist die jeweils genannte Code-Datei — kein Text↔Code-Drift.*
