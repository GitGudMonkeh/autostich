# Briefing: Incentive & Progression — Prompt für eine Design-Session

> **Zweck:** Ein selbsttragendes Briefing, das in einen Claude-Chat **ohne Repo-Zugriff** kopiert
> werden kann, um Designrichtungen für Anreiz und Progression zu planen.
> **Quelle der Zahlen:** `README.md`, `src/game/*`, `docs/pitch.md`, `docs/genre-und-hook-recherche.md`.
> **Pflege:** Wenn sich Konstanten ändern, ist dieses Briefing veraltet — es ist eine Momentaufnahme
> vom 2026-08-30, keine zweite Quelle der Wahrheit. Bei Widerspruch gilt der Code.

Alles ab der Trennlinie ist der Prompt.

---

Du hilfst mir, Designrichtungen für **Anreiz und Progression** in meinem Spiel zu entwickeln.
Du hast keinen Zugriff auf den Code — alles, was du brauchst, steht hier.

Lies erst alles, dann arbeite den Auftrag am Ende ab.

## 1 · Was Autostich ist

Ein **Roguelite-Autobattler-Stechspiel** im Browser (Vite + React + Pixi, Deploy auf GitHub Pages).
Prototyp, Version 0.3. Ich entwickle allein, mit KI-Agenten als Umsetzer.

Der Pitch, den ich benutze:

> Ein Kartenspiel darüber, wer neben wem steht: Stell 50 Durchläufe lang die richtigen Karten
> nebeneinander, und deine Skills machen aus einer braven kleinen Reihe eine Engine, die hoch genug
> punktet, um Tracks freizuschalten, die kaum jemand hört.

Die Pointe: **es gibt keine Spielerentscheidung im Kampf.** Du entscheidest nicht, welche Karte du
spielst. Du baust *zwischen* den Durchläufen und schaust dann zu.

## 2 · Wie ein Lauf funktioniert

**Karten.** 40 Karten = 4 Farben (Rot/Blau/Grün/Gelb) × Werte 1–10. Beide Seiten haben je ein eigenes
40er-Deck.

**Der Stich.** Beide Seiten decken automatisch die nächste Karte auf. **Die höhere Zahl gewinnt.**
Gleichstand gibt nichts. Nur ein Sieg gibt Score. Farbe ist im reinen Wertvergleich kosmetisch — sie
wird erst über Formationen und Archetypen mechanisch relevant.

**Der Durchlauf.** 40 Stiche = 1 Durchlauf. Ein Lauf hat **fest 50 Durchläufe** — also **2000 Stiche**.
Danach Game Over. **Es gibt kein Leben, keinen Tod, kein Scheitern.** Der Lauf endet, weil er zu Ende
ist, nicht weil man verloren hat.

**Die persistente Reihenfolge.** Deine Kartenreihenfolge bleibt über den ganzen Lauf bestehen — sie
ist das Objekt, das du baust. Nur das *Gegnerdeck* wird pro Durchlauf neu gemischt.

**Die Entscheidungen.** Nach jedem Durchlauf steht genau **eine** Entscheidung an, nach festem Plan
über die 50 Durchläufe verteilt:

- **13 × Perk** — aus 3 Angeboten wählen. Perks sind Familien in 4 Stufen (Normal · Selten · Sehr
  selten · Rar), dazu flache legendäre Perks.
- **13 × Aufstellung** — Karten in der Reihenfolge tauschen. 3–5 Energie pro Phase, ein Tausch kostet 1.
- **13 × Architekt** — Gebäude auf einem 8×5-Baufeld platzieren und drehen. Keine Münzen, keine
  Preise; die Begrenzung ist der Platz (20–24 nutzbare Zellen).
- **10 × Skill** — aus 12 Angeboten (3 je Archetyp) wählen, bis zu 6 gleichzeitig halten.
- **1 × Legendär** — in Durchlauf 29, belegt einen fixen 7. Slot.

**Wie Score entsteht.** Nur bei Sieg, multiplikativ:

```
Score = 400
      × Siegesserien-Multiplikator      (+2 % je Serienpunkt, gedeckelt bei +150 %)
      × Perk-Multiplikatoren
      × Formations-Multiplikator         (der Kern des Spiels, siehe unten)
      × Architekt-Faktoren               (volle Zeile/Spalte/Diagonale stapeln multiplikativ)
      + Flats (Anker, Feuer-Score, Ionisierung, Gebäude-Flats)
      × Crit                             (Basis-Crit ist 0; kommt aus Präzision-Perks und Blitz)
```

**Formationen — das ist das eigentliche Spiel.** Aus der Nachbarschaft in Segmenten à 5 Karten
entsteht je Position ein Multiplikator:

- **Wiederholung** (≥2 gleiche Werte): ×1,25 → ×1,50 → ×1,80, dann je +0,40, kein Cap
- **Farbblock** (≥3 gleiche Farbe): ab der 3. ×1,35, je weitere +0,20
- **Treppe** (≥3 streng steigend): ab der 3. ×1,35, je weitere +0,20
- **Wechsel** (≥3 Zick-Zack): ab der 3. ×1,40, je weitere +0,20
- **Anker**: eine einzelne Position zählt als Formation
- **Überlappung**: steckt eine Karte in mehreren Formationen, multipliziert das zusätzlich —
  2 Formationen ×1,5 · 3 ×2 · 4 ×3

**Die vier Archetypen** (Skills, frei mischbar):

- **⚡ Blitz** — Ladung sammeln, Karten ionisieren, der verlässliche Crit-Archetyp
- **🔥 Feuer** — Hitzeleiste, belohnt totale Überlegenheit; Konsumenten tauschen Hitze gegen Boni
- **❄ Eis** — friert Karten als „Gletscher" fest; die sammeln Masse und **bersten** über ihre Nachbarn
- **🌿 Pflanze** — Siege lassen Karten wachsen, ab einer Schwelle werden sie dauerhaft grün und
  bilden einen gemeinsamen Farbblock

**Wichtige mechanische Eigenheit:** Kartenwerte dürfen **über 10 hinaus** wachsen (kein Cap), das
Gegnermaximum ist 10. **Ab Kartenwert 11 gewinnt eine Karte jeden Stich sicher.**

## 3 · Wie lange ein Lauf dauert

Basis-Takt 1,75 s je Stich, mit Anzeige-Geschwindigkeit 1× bis 4× (rein kosmetisch, score-neutral).

- 2000 Stiche × 1,75 s ≈ **58 Minuten** bei 1×
- bei 4× ≈ **15 Minuten**, plus 50 Entscheidungen

**Realistisch also 20–70 Minuten pro Lauf.** Das ist wichtig: „noch ein Lauf" ist hier eine deutlich
größere Bitte an den Spieler als bei einem 25-Minuten-Roguelite. Jede Anreiz-Idee muss zu dieser
Sitzungslänge passen.

## 4 · Was es an Meta-Progression schon gibt

Nichts davon muss erfunden werden — das läuft bereits:

| System | Zustand |
| --- | --- |
| **SP-Upgrade-Baum**, laufübergreifend | Zwei Zweige: *Decks* (Eis/Pflanze freischalten, je Archetyp zwei Legendär-Stufen) und *Allgemein* (Baufeld 20→24, Formations-Energie 3→5, Rarität-Deckel, Drop-Raten, zweite Perk-Phase). Vollständig. |
| **DP-Werkstatt**, rein kosmetisch | Deck- und Battlefield-Skins. Zehn Freischaltarten existieren bereits: *n Läufe beendet, Serie, Bestscore, Lauf ohne Reroll, n Mono-Fraktions-Läufe, alle vier Mono-Decks, ein Lauf mit allen vier Fraktionen, erster GOTTGLEICH-Stich, n× Platz 1 einer Wochenrangliste, Onboarding beendet.* |
| **Wochen-Rangliste** | Eigener Modus. 19 Modifikatoren, davon 3–5 pro Woche gewürfelt (mind. 2 positive, mind. 1 negativer), aus dem Wochen-Seed für alle Spieler identisch. Beispiele: „Gegnerkarten +2 Wert", „Nur 12 Baufeld-Zellen", „Kein Reroll", „Doppel-Legendär", „Energie-Flut", „Formations-Boni ×2". Voll wirksam. |
| **Challenger-Seeds** | Vorhanden. |
| **Globale Bestenliste** | Supabase, Top-N lesen und veröffentlichen. Kein Account-System, nur ein Benutzername. |
| **Lokale Bestenliste** | Top 5. |
| **Geist des Rekordlaufs** | Speichert die Score-Trajektorie des besten Laufs (Stützstelle alle 13 Stiche) — man sieht während des Laufs, ob man vor oder hinter dem eigenen Rekord liegt. |
| **Soundtrack-Stufen** | Die Musik eskaliert mit dem Score (Synthwave → Darksynth/Phonk). Die oberste Stufe startet erst weit oben auf der Skala. Das ist die Belohnung, die der Pitch verkauft — sie ist im Spiel aber nirgends *sichtbar* angekündigt. |

## 5 · Meine Diagnose (aus einer Recherche, die ich schon gemacht habe)

Ich habe den Markt und die Hook-Mechaniken des Genres untersucht. Das Ergebnis:

**Es fehlt kein Meta-System.** Ich habe mehr davon als die meisten Wettbewerber. Der Hook fehlt aus
einem strukturellen Grund:

> **Ein Lauf fällt kein Urteil.**
> 50 Durchläufe ohne Tod enden immer gleich: sie enden. Es gibt kein Bestanden und kein Gescheitert,
> nur eine Zahl. Und ab Kartenwert 11 ist der Stich-Ausgang deterministisch — die zweite Laufhälfte
> baut strukturell keine Spannung mehr auf.

Ein Score *ist* kein Ziel. Ein Score wird erst zum Ziel, wenn ihm etwas gegenübersteht: eine
Schwelle, ein Gegner oder ein anderer Mensch. Balatro hat alle drei. Ich habe den Score nackt.

Die vier Fragen, die ich beantworten will, und was das Spiel heute liefert:

| Frage | Was sie verlangt | Ist-Zustand |
| --- | --- | --- |
| Warum will ich besser werden? | Etwas Vorenthaltenes, das **sichtbar** ist | Freischaltungen existieren, aber die leeren Plätze sieht niemand |
| Was will ich erreichen? | Eine **benannte Schwelle** | nichts — Score hat keine Schwelle |
| Wo will ich hin? | Ein **gezeichnetes** Ziel | Musikstufen vorhanden, aber unsichtbar |
| Wen will ich besiegen? | Ein **Gesicht mit Namen** | nichts — die Gegenseite ist ein anonymer Wert ≤10 |

**Die Hook-Archetypen des Genres**, nach Kosten-Wirkung sortiert, mit meiner Einschätzung:

| Archetyp | Vertreter | Zugkraft | Kosten | Sättigt | Bei mir |
| --- | --- | --- | --- | --- | --- |
| Narrativer Tropfen | Hades, Inscryption, Griftlands | sehr hoch | sehr hoch | ja | zu teuer für Solo |
| **Benannter Gegner** | Hades, StS (das Herz) | hoch | niedrig | nein | **fehlt vollständig** |
| **Sammel-Raster** | Balatro (Joker-Album), Isaac | hoch | niedrig | ja | **Daten da, Anzeige fehlt** |
| Schwierigkeits-Leiter | StS Ascension, Balatro Stakes, Hades Pact | mittelhoch | mittel | stark | teils — aber *gewürfelt*, nicht *gewählt* |
| Wachsende Basis | Wildfrost, Loop Hero, Cult of the Lamb | hoch | hoch | langsam | nicht vorhanden |
| Kombinatorische Neugier | Monster Train Fraktionspaare | mittel | sehr niedrig | nein | vorhanden, aber unbenannt |
| Score / Rangliste | Balatro Endlos, Daily Seeds | niedrig **allein**, hoch **mit Gegenüber** | niedrig | nein | Ist-Zustand, ohne Gegenüber |
| Asynchrones PvP | Super Auto Pets, The Bazaar | sehr hoch | hoch | **nie** | Wochenmodus als Vorstufe |

Zwei Lehren, die ich mitnehme: Hades' *Pact of Punishment* ist die reifste Form der
Schwierigkeits-Leiter, weil der Spieler die Härte **selbst zusammenstellt** und dafür **bezahlt
wird**. Und Balatro zahlt auch aus **verlorenen** Läufen noch Fortschritt aus — deshalb funktioniert
dort „noch ein Lauf".

**Vier Richtungen, die ich mir selbst schon notiert habe** (als Ausgangspunkt, nicht als Beschluss):

1. **„Das Soll"** — jeder Lauf bekommt vor dem Start eine Zielpunktzahl. Am Ende steht *bestanden*
   oder *nicht bestanden*. Gibt dem Lauf ein Urteil, ohne ihm einen Tod zu geben.
2. **„Die Rivalen"** — aus dem anonymen Rekord-Geist wird eine Riege benannter Gegner mit je eigener
   Trajektorie und eigenem Soll, aufsteigend.
3. **„Die Route"** — die Score-Skala als sichtbare Strecke mit den Soundtrack-Stufen als Stationen,
   inklusive der noch nicht erreichten.
4. **„Die Vitrine"** — das Skin-Raster zeigt alle Plätze, verschlossene ausgegraut mit ihrer
   Bedingung im Klartext.

## 6 · Randbedingungen

- **Solo-Entwickler** mit KI-Agenten. Kein Team, kein Budget für Vertonung oder viel neues Artwork.
- **Jeder Spielertext kostet ×4** — die UI läuft in Deutsch, Englisch, Spanisch und vereinfachtem
  Chinesisch über Lokalisierungs-Kataloge.
- **Kein Account-System**, kein echtes PvP-Matchmaking. Was es gibt: `localStorage` und eine
  Supabase-Tabelle mit Benutzernamen.
- **Läuft im Browser**, auch mobil. Sitzungen können unterbrochen werden.
- **Der Pitch verspricht ausdrücklich: „ein Kartenspiel, das man nicht verlieren kann."** Alles, was
  Scheitern einführt, steht dazu in Spannung und muss das bewusst auflösen.
- **Score ist aktuell die einzige Ziel-Metrik.**
- **Ein Lauf dauert 20–70 Minuten** (siehe §3). Das ist die härteste Randbedingung.

## 7 · Dein Auftrag

Entwickle **3 bis 5 klar unterscheidbare Designrichtungen** für Anreiz und Progression. Nicht eine
Empfehlung mit Varianten — echte Alternativen, die verschiedene Wetten eingehen.

Je Richtung:

- **Ein Satz**, der sie beschreibt, und ein Name, den ich benutzen kann.
- **Welchen Hook-Archetyp** aus der Tabelle sie bedient — und welche der vier Fragen aus §5 sie
  beantwortet und welche nicht. Eine Richtung, die alle vier beantwortet, ist verdächtig.
- **Was der Spieler konkret tut**, das er heute nicht tut.
- **Was sie an System braucht** — und was sie aus dem wiederverwenden kann, was ich laut §4 schon habe.
- **Aufwand** grob (klein / mittel / groß) und **wo das Risiko liegt.**
- **Wie sie mit der 20–70-Minuten-Laufzeit umgeht.** Richtungen, die viele kurze Läufe voraussetzen,
  funktionieren bei mir nicht ohne Weiteres.
- **Wie sie zum „man kann nicht verlieren"-Versprechen steht.**

Dann:

- **Sag mir, welche du empfiehlst und warum**, mit einer klaren Begründung statt einer Abwägung.
- **Widersprich meiner Diagnose in §5, wenn du sie für falsch hältst.** Ich habe sie selbst
  aufgestellt und will sie geprüft haben, nicht bestätigt. Besonders die These „ein Lauf ohne Urteil
  hat keinen Hook" — wenn es Gegenbeispiele gibt (Spiele, die ohne Scheiterzustand binden), nenne sie.
- Wenn dir eine Angabe fehlt, die deine Antwort verändern würde, **frag zuerst**, statt zu raten.

Was ich **nicht** will: eine dritte Währung, eine Verlängerung des bestehenden Upgrade-Baums, eine
höhere Score-Decke, oder einen Theme-Wechsel als Anreiz-Reparatur. Falls du eines davon trotzdem für
richtig hältst, begründe es ausdrücklich gegen diesen Absatz.
