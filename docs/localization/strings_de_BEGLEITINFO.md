# Begleitinfo zum deutschen String-Export — *Autostich*

**Quelle:** Branch `Autostich_Test` (das spielbare Spiel, deployt nach `/autostich/test/`), Commit `244816a`.
**Nicht** der Sim-/Balance-Branch `test/sim` — „/test" meint die spielbare Test-Seite.
**Umfang:** `strings_de.csv` = **1 504 Zeilen** (826 Datentexte + 678 UI-Texte).

> **Aktualisiert (Commit 244816a, #231–#236):** gegenüber der Erstlieferung (85921f7) 17 Zeilen geändert, 7 neu, 1 entfernt.
> — 12 Glossar-Erklärtexte umformuliert (`tutorial.glossary.*`); neue Konstante `C.FIRST_SKILL_CYCLE = 7`.
> — Architekt: neuer zweistufiger Abriss (Markieren → Bestätigen, #235) → 4 neue `store.architectscreen.demolish-*`; „Kein Platz"-Meldung + Zell-Tooltip (Upgrade-Vorschau #232) angepasst.
> — Skill-Auswahl: neuer Ersetzen-Dialog (#234) → 3 neue `ui.skillselect.replace-modal-*`; alter „tippe unten"-Hinweis entfernt; Voll-Slots-Text geändert.
> — BuildPanel: „ab Runde 3" → „ab Runde {n}" (aus `FIRST_SKILL_CYCLE`).
**Format:** UTF-8 **ohne BOM**, RFC-4180 (alle Felder gequotet, `""`-Escape), CRLF, sortiert nach `category` → `id`, nichts dedupliziert. Roundtrip-geprüft: jede Zeile hat exakt 8 Spalten.

---

## Methodik (warum du dem `de`-Feld trauen kannst)

- **Datentexte** (Skills, Perks, Familien, Glossar, Stats, Kosmetik, Meisterränge, Architekt-Baupläne, Formations-/Farb-/Fraktionsnamen) habe ich per Node die echten Code-Register **importieren** lassen und die **resolveten Endtexte** rausgeschrieben — kein Abtippen, keine Text↔Code-Drift.
- **UI-Texte** (`src/App.jsx` + ~40 `src/ui/*.jsx`) sind byte-treu aus dem Quelltext gezogen; Betonungs-Fragmente wurden zu lesbaren Sätzen zusammengeführt (siehe Punkt 3), tote Enum-Keys/CSS/Kommentare aussortiert.

---

## Entscheidungen, die du gegenlesen solltest

1. **String-IDs neu eingeführt.** Bisher gab es **kein** Loc-System — alle Texte stehen inline im Code. Schema `kategorie.objekt.feld`. Wo das Spiel stabile Keys hat, stecken sie in der ID: `ability.SK_FIRE_01.name`, `item.family.D_STREAK.tier2.desc`, `tutorial.glossary.stich.text`, `item.perk.L2.label`. UI ohne Key: `ui.<komponente>.<slug>` (Komponente = Dateiname klein).

2. **Kategorien** auf deinen Fixsatz gemappt. `enemy`, `biome`, `dialogue` bleiben **leer** — das Spiel hat keine benannten Gegner, Biome oder Dialoge (es ist ein Karten-Duell gegen einen anonymen Gegner). Verteilung:

   | category | Zeilen | Inhalt |
   |---|---|---|
   | `ui` | 486 | gesamte Oberfläche: Buttons, Labels, Header, HUD-Balken, Phasen, Indikatoren, Fraktions-/Stat-/Formations-/Farbnamen |
   | `item` | 395 | Perk-Familien (4 Stufen), legendäre Perks, Architekt-Baupläne, Deck-/Spielfeld-Kosmetik |
   | `tutorial` | 190 | Glossar-Erklärtexte + Anleitung |
   | `ability` | 168 | Archetyp-Skills (Feuer/Blitz/Eis/Pflanze), Name + Beschreibung |
   | `achievement` | 167 | Meisterränge/Belohnungen, Bestenliste, Chronik, Statistik-Hub, Freischaltungen |
   | `store` | 83 | „Der Architekt" (Bau-/Angebotsphase — der Shop-Ersatz) |
   | `system` | 15 | Seed/Speichern/Laden/Fehler/Teilen/Verbindung |

3. **⚠️ Zahlen in Datentexten sind resolvet — der einzige Punkt, wo ich vom „Platzhalter literal lassen" abgewichen bin.** Viele Beschreibungen holen ihre Zahlen zur Buildzeit aus Balance-**Konstanten** (`+${C.FORGE_VALUE} Kartenwert` → „+2 Kartenwert"). Im CSV steht die **fertige Zahl** — das, was der Spieler sieht, und gut lesbar fürs Glattziehen. Das sind echte Build-Konstanten, keine Laufzeit-Variablen; deshalb die Ausnahme. **Vor** der EN-Übersetzung sollten diese 52 Konstanten (Punkt 1b / Anhang) zu echten Platzhaltern werden — sonst frieren wir mit der Übersetzung die aktuellen Balance-Zahlen im Text ein (genau die Drift, die der Code heute vermeidet).

4. **Echte Laufzeit-Variablen sind tokenisiert:** `${score}` → `{score}`, `${masteryGradeLabel(g)}` → `{rangLabel}` usw. (77 Tokens, Punkt 1a).

5. **Inline-Betonung normalisiert.** Sätze, die im JSX um `<b>`/`<span>` herum aus mehreren Textknoten zusammengesetzt sind, habe ich zu **einem** lesbaren Satz zusammengezogen (Tags raus). Das sind die „zusammengesetzten Sätze" — Liste in Punkt 3.

---

## 1. Variablen / Platzhalter

### 1a. Laufzeit-Variablen (79) in UI-Texten — Syntax `{name}`

Ursprünglich JS-Template-Interpolationen `${…}`. **79 Tokens, fast alle Zahlen** (Werte, Faktoren, Prozente, Zähler). Häufigste:
`{n}`(41×), `{wert}`(22×), `{faktor}`(13×), `{runde}`(5×), `{gebaeude}`(5×), `{punkte}`(5×), `{stufe}`(4×), `{schwelle}`(4×).

**Diese Tokens sind KEINE reinen Zahlen** (Typ beachten):
- `{name}` = Spielername (frei) · `{deckName}` = Deck-Name · `{skillName}`,`{skillA}`,`{skillB}` = Skill-Namen · `{konsument}`,`{konsumTyp}` = Konsumenten-Skill · `{ankerTyp}`,`{rolle}`,`{typen}` = Spielbegriffe · `{zieleffekt}` = Kurzeffekt der nächsten Bauplan-Stufe (Architekt-Tooltip)
- `{rangLabel}` = z. B. „Rang III" / „Großmeister II" · `{rangRomanisch}`,`{vonRang}`,`{zuRang}` = Rang-Ziffer · `{archetyp}` = Fraktion
- `{farbe}`,`{farbwahl}` = Kartenfarbe (Rot/Blau/Grün/Gelb) · `{glossartext}` = eingebetteter Glossar-Satz · `{titel}` = Musiktitel
- `{plural}` = **Wortendungs-Ternär** (z. B. „" vs. „en"/„s") — siehe Punkt 4 · `{gehalten}`,`{gewählt}`,`{zustand}`,`{status}`,`{aktuell}`,`{gebunden}` = Zustands-/Statuswörter · `{suche}` = Sucheingabe · `{label}`,`{effekt}`,`{einheit}` = generische Textbausteine

Vollständige Frequenzliste in **Anhang B**. Der `context` jeder CSV-Zeile nennt in der Regel schon, was das Token bedeutet (Feld `Var.:`).

### 1b. Build-Konstanten (53) in Datentexten — im CSV bereits als Zahl resolvet

Diese Zahlen kommen zur Buildzeit aus `src/game/constants.js`. Deutsche Formatierung via Helfer `de()` (Dezimalkomma). **Vor EN-Übersetzung tokenisieren.** Vollständige Tabelle in **Anhang A**. Verteilung der interpolierten Texte: Glossar 25, Perks 9, Skills 8, Stats 4.

---

## 2. Erlaubte Tags / Markup

- **Es gibt keine In-String-Markup-Sprache.** Kein `dangerouslySetInnerHTML`, kein Rich-Text-Parser, kein `<color=…>`/`<b>` **im String**. (Stack: React 18 + Vite + Tailwind — sonst nichts.)
- **Betonung ist strukturell** über JSX-Elemente (`<b>`, `<span style>`), nicht im Text. Für Loc heißt das: die Strings selbst sind tag-frei; die Betonung müsste beim Umbau als eigene Struktur/Platzhalter erhalten bleiben (siehe Punkt 3).
- **Glossar-Auto-Fettung:** Der Renderer `tokenizeGlossary` fettet in Beschreibungen automatisch jedes Wort, das in den `match`-Wortformen eines Glossarbegriffs steht (z. B. „Stich/Stiche", „Ladung"). Die `match`-Listen sind **deutsche Flexionen** (in `src/game/glossary.js`, **nicht** im CSV). ➜ Bei EN müssen diese Wortform-Listen neu gepflegt werden, sonst greift die Fettung nicht.
- **Zeichen, die im Text erhalten bleiben müssen:** deutsche Anführungszeichen „ ", Multiplikations-`×` (nicht „x"), Mittelpunkt `·`, Pfeile `→ ↔`, `≥`, Halbgeviertstrich `–`, Emoji/Symbole (🔥 ⚡ ❄️ 🌿 ⚔ ◆ ✶ …). Vereinzelt HTML-Entities `&amp;` / `&nbsp;` (rendern als „&" / Leerzeichen) — byte-treu belassen.

---

## 3. Zusammengesetzte Sätze (String-Konkatenation)

Zwei Muster:

**(a) Interpolierte Werte mitten im Satz** — 154 CSV-Zeilen enthalten mindestens ein `{token}`. Unkritisch, solange die Übersetzung die Wortstellung frei wählen darf (DE-Satzbau ≠ EN — nicht auf feste Reihenfolge verlassen).

**(b) Um `<b>`/`<span>` gestückelte Sätze** — 10 Stellen standen im JSX als **mehrere** Textknoten und wurden im CSV zu einem Satz zusammengezogen. **Diese vor der Übersetzung im Code zu je einem String (mit Platzhalter statt inline-`<b>`) umbauen:**

| id (im CSV) | Quelle |
|---|---|
| `system.statsscreen.seeds-empty` | StatsScreen.jsx:149 |
| `achievement.statsscreen.mastery-hint` | StatsScreen.jsx:205 |
| `achievement.statsscreen.grandmaster-hint` | StatsScreen.jsx:263 |
| `achievement.statsscreen.elemental-basis` | StatsScreen.jsx:401 |
| `achievement.chronikoverview.frame-legend` | ChronikOverview.jsx:155 |
| `achievement.masterrunselect.pick-rank` | MasterRunSelect.jsx:41 |
| `achievement.masterrunselect.cumulative-hint` | MasterRunSelect.jsx:127 |
| `ui.skillselect.replace-modal-intro` | SkillSelect.jsx:153 |
| `achievement.startscreen.logged-in` | StartScreen.jsx:145 |
| `ui.chargebar.full-hint` | ChargeBar.jsx:129 |

**Zusätzlich – Architekt-Effekt-Readouts** (`src/ui/archEffects.js`): komplett aus Bausteinen zusammengesetzt (`+{n} Punkte`, `×{faktor} Punkte`, `+{n} Punkte je Serienpunkt`, `+{n} Punkte bei {farbe}`, `+{n} Punkte alle {n} Siege` …). Sie werden je Bauplan kombiniert — beim Übersetzen als Satzbausteine behandeln, nicht als feste Sätze.

---

## 4. Plural / Zahlen

- **Kein ICU MessageFormat, keine Smart Strings, keine i18n-Bibliothek, kein `Intl.PluralRules`/`Intl.NumberFormat`.** Reines React ohne Loc-Layer.
- **Plurale = handkodierte Ternäre**, z. B. `Schicht${n===1?"":"en"}`, `Perk${n===1?"":"s"}`, `Karte`/`Karten`, `Lauf`/`Läufe`, `höchste`/`niedrigste`, `einklappen`/`ausklappen`. Im CSV als `{plural}` markiert bzw. beide Formen als eigene Zeilen. ➜ Wenn wir das anfassen, brauchen wir eine echte Plural-Lösung (spätestens für EN).
- **Zahlen:** deutsches **Dezimalkomma** via Helfer `de(x) = String(x).replace(".", ",")` → „1,5" statt „1.5"; Prozent via `pct()`/`pp()`. Tausendertrennung via `grp()` (Kosmetik/Format). ➜ Für EN auf Punkt-Dezimal umstellen.

---

## 5. Hardcodierte Texte

- **Alle sichtbaren Strings sind hardcodiert** — es existiert keine Loc-Tabelle. Dieser Export ist die erste Zusammenführung überhaupt.
- **Quellen der Wahrheit:** `src/game/{skills,perks,families,glossary,stats,constants,cosmetics,mastery,architect}.js`, `src/ui/formationLabels.js`, `src/ui/indicators/vocab.js`, `src/App.jsx` + ~40 `src/ui/*.jsx`.
- **Einzige sichtbare Nicht-JS-Quelle:** `index.html` → `<title>Autostich — Prototyp</title>` (im Export als `ui.meta.page-title`).
- **Bewusst NICHT im Export:** reine Logik-/Debug-Strings, `console.warn`, `localStorage`-Keys, Action-Types (`"perk"`,`"skill"`,`"formation"` als Enum-Werte), CSS-Klassen, toter Code (per Grep bestätigt, z. B. `TIER_LABEL`/`targetLabel` in ChronikOverview).

---

## 6. Text in Grafiken

- **`src/assets/logo.png`** — die „Autostich"-Wortmarke als **Bild** (Startbildschirm, `alt="Autostich"`). Der In-Game-Header (App.jsx) rendert „AUTO/STICH" dagegen als DOM-Text. Bei Titel-Lokalisierung bräuchte das Logo eine eigene Version — der Markenname bleibt aber vermutlich „Autostich".
- **Deck-Rücken** (`src/assets/cards/decks_player/*/back.png`, `front.png`) und **Spielfeld-Hintergründe** (`src/assets/battlefields/*/desktop.jpg`, `mobile.jpg`): Kunst-Assets. Enthalten nach jetzigem Stand **keine funktionalen UI-Strings** — die Deck-/Feld-**Namen** sind DOM-Text und im Export. Falls in der Kunst künstlerischer Text steckt, separat behandeln.
- Musik-/Sound-Dateien: nur Dateinamen, nicht sichtbar. Die Musik-**Titel** sind DOM-Text (im Export, als Eigennamen markiert — „evtl. nicht übersetzen").

---

## 7. UI-Constraints

- **GROSSBUCHSTABEN:** ~70 Stellen rendern via CSS `uppercase` (Header, Badges, Banner „GEWONNEN/VERLOREN/GLEICHSTAND", Eyebrows, Groß-Score-Ansagen „STARK/BRUTAL/IRRE/GOTTGLEICH"). Deutsche Komposita + Umlaute in Großschrift werden lang/breit → Umbruch/Abschneiden im Blick behalten. Der CSV-Text ist die Original-Schreibung; die Großschrift macht CSS.
- **Fonts:** Pixel-/Retro-Fonts **„Press Start 2P"** (Kartenzahlen, Wortmarke/Banner/Header) und **„VT323"**; Body = System-Monospace. ✅ **cmap von Press Start 2P geprüft:** `Ä ä Ö ö Ü ü ß é „ " × –` sind **alle** enthalten → kein Tofu fürs Deutsche. (Für spätere Sprachen mit weiteren Akzenten / Nicht-Latein die Glyphenabdeckung erneut prüfen — die Pixel-Fonts sind vermutlich Latin-only.)
- **Feste Breiten / kurze Slots:** Ein-Zeichen-Formations-Badges (`W F T Z A N K G` — `limit = 1`), schmale Chips (Stat-Kurzwerte `blurb`, Tempo-Buttons `X2/X4/MAX`), Formations-Kürzel auf Karten. Diese Slots sind hart — Übersetzung muss die Länge halten (im CSV via `limit`-Spalte markiert, wo bekannt).
- **Monospace-Grid:** Weil vieles Monospace ist, kostet jedes längere Wort direkt Breite; die Kartenzahl-Font ist bereits extra kleiner skaliert (Press Start 2P ist breit).

---

## Rücklieferung

Ich liefere dieselbe CSV zurück, nur die geänderten Zeilen (DE-Vereinheitlichung) + offene Fragen in der `note`-Spalte. EN beginnt erst, wenn das Deutsche steht.

---

## Anhang A — Build-Konstanten in Datentexten (53)

Aktueller Wert (deutsch formatiert) und Anzahl Verwendungen in Anzeigetexten. Diese Zahlen stehen im CSV **resolvet**; vor EN-Übersetzung zu Platzhaltern machen.

| Konstante | aktueller Wert | Verwendungen |
|---|---|---|
| `C.ANCHOR_FORM_FACTOR` | 1,25 | 1 |
| `C.BASE_REROLLS` | 2 | 1 |
| `C.BLITZFAENGER_VALUE` | 2 | 1 |
| `C.BRAND_ASH` | 1 | 3 |
| `C.BRAND_VALUE` | 1 | 1 |
| `C.BRENNPUNKT_MIN_FORMS` | 3 | 1 |
| `C.BRENNPUNKT_MULT` | 2,5 | 1 |
| `C.CRIT_BASE_MULT` | 1,5 | 3 |
| `C.CRYSTAL_OFFSET` | 1 | 1 |
| `C.ECHO_FACTOR` | 1,6 | 1 |
| `C.EISANKER_FACTOR` | 1,25 | 1 |
| `C.EWIGER_FRUEHLING_FARBBLOCK` | 2 | 1 |
| `C.EWIGER_FRUEHLING_FIELD` | 0,25 | 1 |
| `C.FIRE_MARGIN_OFFSET` | 2 | 1 |
| `C.FIRE_SCORE_BASE` | 25 | 1 |
| `C.FIRE_SCORE_PER_SKILL` | 5 | 1 |
| `C.FIRST_SKILL_CYCLE` | 7 | 1 |
| `C.FORGE_COST` | 5 | 3 |
| `C.FORGE_VALUE` | 2 | 3 |
| `C.FORMATION_ENERGY` | 4 | 1 |
| `C.FROST_GRIP_BONUS` | 2 | 1 |
| `C.GLUTSTAHL_PER_VALUE` | 12 | 1 |
| `C.HENKER_MULT` | 2 | 1 |
| `C.HENKER_ZONE_START` | 35 | 1 |
| `C.ICE_BASE_FREEZE` | 2 | 1 |
| `C.ICE_LAYER_MAX` | 12 | 1 |
| `C.ION_MAX_STACKS` | 5 | 1 |
| `C.ION_SCORE_PER_STACK` | 25 | 1 |
| `C.KRITMASSE_VALUE` | 3 | 1 |
| `C.LIGHTNING_MAX_CHARGE` | 10 | 1 |
| `C.MAX_ARCHETYPES` | 4 | 1 |
| `C.PATT_MARGIN` | 2 | 1 |
| `C.PERMAFROST_LAYER_BONUS` | 2 | 1 |
| `C.PHOTOSYNTHESE_MULT` | 1,08 | 1 |
| `C.PLANT_GREEN_THRESHOLD` | 8 | 1 |
| `C.PLANT_GROWTH_SKILL_REF` | 3 | 1 |
| `C.PLANT_VALUE_CAP` | 11 | 2 |
| `C.RASEREI_CRIT_STEP` | 0,05 | 1 |
| `C.SAMMLER_MAX` | 5 | 1 |
| `C.SAMMLER_STEP` | 0,15 | 1 |
| `C.SKILLS_OFFERED` | 12 | 1 |
| `C.SKILL_SLOTS` | 6 | 1 |
| `C.STAT_CRIT_CHANCE_STEP` | 0,07 | 4 |
| `C.STAT_CRIT_MULT_STEP` | 0,25 | 4 |
| `C.STAT_FORM_MULT_STEP` | 0,05 | 4 |
| `C.STAT_STREAK_MULT_STEP` | 0,02 | 4 |
| `C.STREAK_STAT_CAP` | 1,75 | 2 |
| `C.UEBERWUCHERUNG_FACTOR` | 0,2 | 1 |
| `C.UEBERWUCHERUNG_FIELD` | 0,66 | 1 |
| `C.UNAUFHALTSAM_VALUE` | 3 | 1 |
| `C.VABANQUE_MAX_PAYOUTS` | 3 | 1 |
| `C.VABANQUE_TRICKS` | 5 | 1 |
| `C.WURZELSCHLAG_PER_GROWTH` | 4 | 1 |

## Anhang B — Laufzeit-Tokens (79), nach Häufigkeit

`{n}`(41), `{wert}`(22), `{faktor}`(13), `{runde}`(5), `{gebaeude}`(5), `{punkte}`(5), `{stufe}`(4), `{schwelle}`(4), `{pct}`(3), `{mult}`(3), `{farbe}`(3), `{boost}`(3), `{basis}`(3), `{max}`(3), `{score}`(3), `{plural}`(3), `{maxSlots}`(3), `{prozent}`(3), `{ziel}`(2), `{typen}`(2), `{count}`(2), `{over}`(2), `{wachstum}`(2), `{deckName}`(2), `{rolle}`(2), `{rangRomanisch}`(2), `{rangLabel}`(2), `{jeSkill}`(2), `{vollTempoAb}`(2), `{gehalten}`(2), `{konsumTyp}`(2), `{übrig}`(2), `{gewählt}`(2), `{benötigt}`(2), `{effekt}`(1), `{zielstufe}`(1), `{zieleffekt}`(1), `{betrag}`(1), `{einheit}`(1), `{segmentgroesse}`(1), `{gesamt}`(1), `{spalte}`(1), `{status}`(1), `{position}`(1), `{deckLen}`(1), `{ankerTyp}`(1), `{segA}`(1), `{segB}`(1), `{ion}`(1), `{flat}`(1), `{schichten}`(1), `{kartenwert}`(1), `{deckel}`(1), `{wurzeln}`(1), `{label}`(1), `{min}`(1), `{belegt}`(1), `{maxLadung}`(1), `{critBasis}`(1), `{sockel}`(1), `{grünAb}`(1), `{skillA}`(1), `{skillB}`(1), `{archetyp}`(1), `{zustand}`(1), `{skillName}`(1), `{vonRang}`(1), `{zuRang}`(1), `{gebunden}`(1), `{farbwahl}`(1), `{name}`(1), `{aktuell}`(1), `{suche}`(1), `{maxDurchläufe}`(1), `{t}`(1), `{glossartext}`(1), `{konsument}`(1), `{titel}`(1), `{m}`(1)
