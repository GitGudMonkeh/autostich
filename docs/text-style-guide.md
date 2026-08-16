# Text-Style-Guide (alle spieler-sichtbaren Texte)

Festgezurrt für #212, überarbeitet nach der Sprachprüfung 2026-08-15
(`docs/localization/sprachpruefung_pixi_2026-08-15.md`).
Ziel: **einfach**, **einheitlich**, **erklärbar** — und **kein Text↔Code-Drift**.

Gilt für **jeden** Text, den ein Spieler sieht: die Register in `src/game/`
(`skills.js`, `perks.js`, `families.js`, `architect.js`, `glossary.js`, `cosmetics.js`, `themes.js`,
`weekMods.js`, `progression.js`) **und** die Oberfläche (`src/App.jsx`, `src/ui/*.jsx`, `src/ui/guides.js`).

---

## 0. Die drei Grundregeln

1. **Ein Begriff = ein Wort.** Dieselbe Sache heißt überall gleich (§1).
2. **Ein Wort = eine Bedeutung.** Kein Wort bezeichnet zwei Mechaniken (§1b) — das Glossar fettet
   Begriffe automatisch und zeigt genau **eine** Erklärung.
3. **Was an einem Skill/Perk hängt, wird auch so gesagt.** Skill-gebundene Effekte nie als
   Grundeigenschaft des Archetyps formulieren (§3).

---

## 1. Kanonische Begriffe (eine Schreibweise, überall gleich)

Diese Begriffe sind im **Glossar** (`src/game/glossary.js`) erklärt — die *einzige* Quelle für die
Kurzerklärungen, aus `constants.js`/`glacier.js`/`rarity.js` gespeist und im Spiel abrufbar.

### 1a. Grundbegriffe

| Kanonisch | NICHT verwenden | Bedeutung (Kurz) |
|---|---|---|
| **Stich** | — | ein Kartenduell |
| **Durchlauf** | Runde* | 40 Stiche = das Deck einmal durch (*HUD kürzt „Durchl.") |
| **Lauf** | Run | ein ganzes Spiel (`MAX_CYCLES` Durchläufe) |
| **Position** | Feld, Slot | fester Platz 1–40 in der Ziehreihenfolge (daran hängen Perks/Anker/Gebäude) |
| **Segment** | — | Block aus 5 Positionen |
| **Kartenwert** | Dauerwert | bleibender Wert einer Karte |
| **Stichwert** | temp Wert | Wertbonus nur für diesen Stich |
| **Kampfwert** | — | Kartenwert + alle Stichwert-Boni |
| **Serie** | Streak, Siegesserie* | Siege in Folge (*„Siegesserie" als Familienname ok) |
| **Serienpunkt** | — | die Zähleinheit der Serie (ein Sieg in Folge) |
| **Score** | Punkte* | die Ziel-Metrik (*„Punkte" nur als Kategoriename und im Idiom „zahlt Punkte") |
| **Direkt-Score** | Flat, Flat-Score | Score ohne Serien-/Crit-/Formations-Multiplikator |
| **Crit** | Kritischer Treffer* | Sieg mit Crit-Multiplikator (*Langform ok im Fließtext) |
| **Rarität** | Seltenheit, Seltenheitsstufe | Normal · Selten · Sehr selten · Rar (Namen aus `TIER_META`) |
| **Archetyp** | Fraktion | Feuer · Blitz · Eis · Pflanze |
| **Neuwurf (Reroll)** | — | Angebot neu würfeln |

### 1b. Formationen & Aufstellung

| Kanonisch | NICHT verwenden | Bedeutung (Kurz) |
|---|---|---|
| **Formation** | Muster | Wiederholung/Treppe/Farbblock/Wechsel (Namen aus `FORMATION_LABELS`) |
| **Eis-Formation** | Formation (allein) | geometrische Form aus Gletschern auf dem Brett |
| **Anker** | — | Einzelposition zählt als Formation (Faktor **je Quelle**, nicht fix ×1,25) |
| **Aufstellungsphase** | Formationsphase, Aufstellphase | die Tausch-Phase zwischen zwei Durchläufen |
| **Formations-Energie** | Aufstell-Energie, Tausch-Energie | das Tausch-Budget dieser Phase |
| **Multiplikator** / **Faktor** | Multi | — |

### 1c. Archetypen

| Kanonisch | NICHT verwenden | Bedeutung (Kurz) |
|---|---|---|
| **Hitze** | Wärme | Feuer-Leiste 0–100 % |
| **Glutdividende** | — | automatischer Direkt-Score je Feuer-Sieg ∝ gehaltener Hitze |
| **Weißglut** | — | **Hitze**-Überlauf über 100 % → Score (Skill) |
| **Ascheglut** | Weißglut(-Überlauf) | **Asche**-Überlauf über die Schmiede-Kapazität → Score |
| **Asche** · **Brandmal** · **Schmieden** | — | Feuer-Schmiede-Kette |
| **Ladung** | Charge | Blitz-Akku |
| **Ionisierung** / **Stapel** | Ionis.* | Blitz-Kartenmarkierung (*Abk. nur im Flavor-Nachsatz) |
| **Kaskade** | — | Ereignis zündet Ereignis — **bei Blitz und bei Eis** |
| **Masse** | Tiefe, Schicht | Eis-Ansammelwert auf dem Brettfeld |
| **Gletscher** | Frostkarte | auf ihr Brettfeld festgefrorene Karte |
| **Firn** / **Firn-Reserve** | — | Boden-Vorrat, der einen Gletscher nachfüllt |
| **Bersten** (Subst.) / **bricht**, **brechen** (Verb) | birst, Burst | der Eis-Payoff-Event |
| **Berst-Score** | Burst-Score, Score-Burst | der Score eines Bruchs |
| **Schwelle** | Stufe | die Masse-Marken 4 / 8 / 12 (siehe §1e) |
| **Wachstum** · **Setzling** · **Grün (reif)** | — | Pflanze |
| **Wurzeln** · **Blüte** · **Trimmen** | Pivot, Payoff | Pflanze-Payoffs |
| **Ausläufer / Kolonisieren** | — | Pflanze markiert Gegnerkarten grün |
| **Konsument** | — | Skill, der eine Ressource für einen Effekt verbraucht |
| **Verstärker** | — | Skill, der ohne seinen Basis-Skill nichts tut (`enabler`) |
| **Bekenntnis** | Commitment | Anteil der Skill-Slots eines Archetyps |

### 1d. Architekt & Meta

| Kanonisch | NICHT verwenden | Bedeutung (Kurz) |
|---|---|---|
| **Baufeld** | Bauplätze, Bau-Felder | das Kontingent belegbarer Zellen |
| **Zelle** (abgedeckt/belegt) | — | eine einzelne Brettposition |
| **Struktur** | Struktur-Kombi | vollendete Zeile/Spalte/Diagonale |
| **Distrikt** | — | angrenzende gleich-kategorige Gebäude |
| **Gebäude-Boost** | — | die **Summe** aus Struktur- und Distrikt-Faktoren (HUD-Kachel) |
| **Stichpunkte (SP)** | — | Währung des Upgrade-Baums |
| **Deckpunkte (DP)** | — | Währung der Deck-Werkstatt (rein kosmetisch) |
| **Upgrade-Baum** | Meisterrang, Meister-Liga | der laufübergreifende Fortschritt |
| **Ranglisten-Lauf** | Meister-Lauf | der wöchentliche Wettbewerbsmodus |
| **Legendär-Phase** | R29 | die Runde, in der der legendäre Skill kommt (`LEG_PHASE_CYCLE`) |

### 1e. Wörter, die NICHT mehrfach belegt werden dürfen

| Wort | Reserviert für | Für das andere nimm |
|---|---|---|
| **Stufe** | Familien-/Gebäude-Stufe I–IV | Gletscher: **Schwelle** · Zinssatz: **Prozentpunkte** · Farbserie: **Farbserie** |
| **Ladung** | Blitz-Akku | aufgestauter Score: **Speicher** / **Aufstauung** |
| **Punkte** | (nur Kategoriename) | Score: **Score** · Prozent: **Prozentpunkte** |
| **Weißglut** | Hitze-Überlauf | Asche-Überlauf: **Ascheglut** |
| **Formation** | Karten-Formation | Gletscher-Geometrie: **Eis-Formation** |

---

## 2. Zahlenformat

- **Dezimal-Komma**: `×1,5`, `+0,20 Faktor`, `1,08` — nie `1.5`. Gilt **auch** für berechnete
  Faktoren (`toFixed(2).replace(".", ",")`, siehe `fmtFactor` in `architect.js`).
- **Multiplikator**: `×1,25` (Malzeichen ×, kein `x`/`X`/`*`) — auch auf Buttons (`×2`, `×4`).
- **Prozent**: `+40 %` (mit Leerzeichen). Additive Crit-Chance ebenfalls in **Prozent**
  (`+6 % Crit-Chance`), **nicht** „pp".
  **Ausnahme:** Wo gegen die 100-%-Schwelle gerechnet wird, bleibt **„Prozentpunkte"**
  ausgeschrieben (`je 10 Prozentpunkte über 100 %`) — „je 10 % über 100 %" wäre unlesbar.
- **Wert/Score**: `+5 Wert`, `−2 Wert` (echtes Minus −, kein Bindestrich), `+100 Score`.
  Die Einheit gehört auf **jede** Stufe einer Familie, nicht nur auf die ersten drei.
- **Tausender**: `+1.200`, `+400.000` (Punkt als Tausendertrenner — der einzige zulässige Punkt in
  Zahlen). Jedes Register hat dafür einen `grp()`-Helfer; benutze ihn.
- **Schwellen**: `ab 40 %`, `≥3`, `≤2`.

---

## 3. Satzbau

- **Kurz & aktiv**: ein bis zwei Sätze. Kein langer Passiv-Absatz.
- **Bedingung → Wirkung** in dieser Reihenfolge: „Ab 80 % Hitze verbrennt der nächste Sieg …",
  „Gewinnt eine grüne Karte, sät sie beide Nachbarn …".
- **Voraussetzungen nennen.** Hängt ein Effekt an einem Skill, steht der Skill im Satz:
  „**Mit Glühender Klinge** schaltet hohe Hitze Schwellen-Boni frei", nicht „Hohe Hitze macht deine
  Karten stärker". Das gilt besonders in den Leitfäden (`src/ui/guides.js`), die sonst
  skill-gebundene Effekte als Grundeigenschaft des Archetyps verkaufen.
- **Verstärker markieren.** Skills mit `enabler` beginnen mit „Verstärker: …".
- **Kein Selbstbezug.** Ein Perk/Skill/eine Familie nennt im eigenen Beschreibungstext nicht den
  eigenen Namen — der steht bereits als Überschrift darüber.
- **Konsistente Struktur je Familien-Stufe**: gleicher Satz, nur Zahl/Bedingung skaliert
  (siehe `MUSTER_DESC` in `families.js` — 20 Familien teilen je EIN Template). Bricht die letzte
  Stufe aus dem Muster aus, ist das ein Fehler, kein Feature.
- **Keine Pfeil-/Balancing-Notation** im Spielertext (`Wechsel ab 3 → 2 Karten · Diff ≥4 → ≥2`).
- **Flavor** (Motor-Name, Mnemonik) höchstens als kurzer Nachsatz nach dem Mechanik-Satz.
- **Keine Dev-/Sim-Sprache**: keine Ticket-Nummern (`#288`), keine Variablennamen (`±Span`,
  `Feldtiefe`), keine Kürzel ohne Einführung (`R29`, `pp`, `Diff`), keine Anglizismen, wo es ein
  deutsches Wort gibt (Burst, Pivot, Payoff, Board, triggern, self-feeding).

---

## 4. Kein Text↔Code-Drift

- **Zahlen, die eine Konstante spiegeln, werden interpoliert**, nicht doppelt gepflegt.
  Muster: Template-Literal + `de(x)` (Komma) / `pct(x)` (Prozent) / `grp(x)` (Tausender).
- **Aufzählungen aus dem Register erzeugen**, nicht im Text pflegen — sonst laufen sie auseinander
  (die trimmbaren Skills standen zweimal von Hand da und waren beide Male unvollständig):
  `trimmableSkillNames()`, `TIER_META`, `FORMATION_LABELS`, `LEG_PHASE_CYCLE`.
- **Einen Text an EINER Stelle bauen.** Der Gebäude-Effekttext hatte drei Implementierungen
  (Spiel, Kartendetail, Core-DB) mit drei Wortlauten; jetzt: `familyEffectText` in `architect.js`.
- Beim Rework eines Effekts die alte Beschreibung nicht stehen lassen — sie ist die häufigste
  Drift-Quelle. Wird ein **System** entfernt, müssen auch die Glossareinträge weg, die es erklären.
- Rein qualitative Formulierungen („großer Direkt-Score", „superlinear") sind ok, wenn keine
  konkrete Zahl behauptet wird — in den Leitfäden sogar erwünscht (sie sollen nicht bei jedem
  Balancing-Pass nachgezogen werden müssen).

---

## 5. Prüfen

```bash
node scripts/export-strings.mjs     # alle Spielertexte → docs/localization/strings_de_pixi_*.csv
```

Der Export zieht die Datentexte aus den echten Registern und löst die Zahlen auf. Ein Diff der CSV
zeigt nach jeder Änderung, was sich am **sichtbaren** Text geändert hat — inklusive der Stellen, die
man beim Ändern einer Konstante nicht auf dem Schirm hatte.

Commit-Checkliste (aus `docs/desc-check.md`):

- [ ] Effekt geändert → Beschreibung geprüft/aktualisiert?
- [ ] Genannte Zahlen aus der Konstante bezogen (nicht hartkodiert)?
- [ ] Neuer Begriff → in §1 eingetragen und im Glossar erklärt?
- [ ] `npm test` grün?
