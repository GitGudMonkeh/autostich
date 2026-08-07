# Text-Style-Guide (Beschreibungen: Perks · Skills · Familien · Shop · Stats)

Festgezurrt für #212. Ziel: **einfach**, **einheitlich**, **erklärbar** — und **kein Text↔Code-Drift**.
Gilt für alle Spieler-sichtbaren Beschreibungstexte in `src/game/` (`skills.js`, `perks.js`,
`families.js`, `shopFamilies.js`, `stats.js`).

## 1. Kanonische Begriffe (eine Schreibweise, überall gleich)

Diese Begriffe sind im **Glossar** (`src/game/glossary.js`) erklärt — die *einzige* Quelle für
die Kurzerklärungen, aus `constants.js` gespeist und im Spiel abrufbar (SkillSelect-Header,
gehaltene Skills, Build-Ansicht).

| Kanonisch | NICHT verwenden | Bedeutung (Kurz) |
|---|---|---|
| **Hitze** | Wärme | Feuer-Leiste 0–100 % |
| **Serie** | Streak, Siegesserie* | Siege in Folge (*„Siegesserie" als Familienname ok) |
| **Ladung** | Charge | Blitz-Akku (max 10) |
| **Ionisierung** | Ionis.** | Blitz-Kartenmarkierung (*Abk. „Ionis." nur im Flavor-Nachsatz) |
| **Crit** | Kritischer Treffer* | Sieg mit Crit-Multiplikator (*Langform ok im Fließtext) |
| **Formation** | Muster | Wiederholung/Treppe/Farbblock/Wechsel |
| **Anker** | — | Positions-Verstärker (×-Faktor je Sieg) |
| **Masse** | Tiefe, Schicht | Eis-Ansammelwert auf dem Brettfeld (Gletscher) |
| **Gletscher** | Frostkarte, eingefrorene Karte | auf ihr Brettfeld festgefrorene Karte |
| **Bersten** (Subst.) / **bricht**, **brechen** (Verb) | birst, bersten (als Verb) | der Eis-Payoff-Event (Gletscher bricht über seine Nachbarn) |
| **Asche** | — | Feuer-Schmiede-Rohstoff |
| **Brandmal** | — | −Wert-Markierung auf Gegnerkarte |
| **Wachstum** | — | Pflanze, nur steigend |
| **Grün / Reife** | — | dauerhafte grüne (reife) Karte |
| **Farbblock** | — | zusammenhängende grüne/gleichfarbige Gruppe |
| **Ausläufer / Kolonisieren** | — | Pflanze markiert Gegnerkarten grün |
| **Wert** | Kartenwert* | Kartenstärke (*Langform nur wo nötig) |
| **temporärer Wert** | temp Wert | Wert nur diesen Durchlauf |
| **Score** / **Flat-Score** | — | Punkte / *flach-additive* Punkte („Punkte" ok als Kategoriename und im Idiom „zahlt Punkte") |

## 2. Zahlenformat

- **Dezimal-Komma**: `×1,5`, `+0,20 Faktor`, `1,08` — nie `1.5`.
- **Multiplikator**: `×1,25` (Malzeichen ×, kein `x`/`*`).
- **Prozent**: `+40 %` (mit Leerzeichen). Crit-**Chance** additiv → `+8 % Crit-Chance`;
  Shop-Anker-Chance additiv → `+40 Prozentpunkte`.
- **Wert/Score**: `+5 Wert`, `−2 Wert` (echtes Minus −, kein Bindestrich), `+100 Score`.
- **Tausender**: `+1.200` (Punkt als Tausendertrenner — der einzige zulässige Punkt in Zahlen).
- **Schwellen**: `ab 40 %`, `≥3`, `≤2`.

## 3. Satzbau

- **Kurz & aktiv**: ein bis zwei Sätze. Kein langer Passiv-Absatz.
- **Bedingung → Wirkung** in dieser Reihenfolge: „Ab 80 % Hitze verbrennt der nächste Sieg …",
  „Gewinnt eine grüne Karte, sät sie beide Nachbarn …".
- **Konsistente Struktur je Familien-Stufe**: gleicher Satz, nur Zahl/Bedingung skaliert
  (siehe `MUSTER_DESC` in `families.js` — 20 Familien teilen je EIN Template).
- **Flavor** (Motor-Name, Mnemonik) höchstens als kurzer Nachsatz nach dem Mechanik-Satz.
- **Keine Dev-/Sim-Sprache** im Spielertext (kein „(im Sim: …)", keine Flag-Namen).

## 4. Kein Text↔Code-Drift

- Zahlen, die eine Konstante spiegeln, werden **aus `constants.js` interpoliert**, nicht doppelt
  gepflegt. Muster: Template-Literal + `de(x)` (Komma) / `pp(x)` (Prozentpunkte) —
  siehe `stats.js`, `glossary.js`, die Legendär-Perks in `perks.js` und die driftgefährdeten
  Skill-Descs in `skills.js`.
- Beim Balancing wird nur die Konstante gedreht — der Text zieht automatisch nach.
- Rein qualitative Formulierungen („großer Flat-Score", „superlinear") sind ok, wenn keine
  konkrete Zahl behauptet wird.
