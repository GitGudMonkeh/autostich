# Autostich V2 — Umbauplan (Deck-Aufstellung & Perk-Rework)

**Status:** Arbeits-/Nordstern-Dokument für den Umbau auf `Autostich_Test`.
**Quelle:** `autostich_deckaufstellung_perk_rework_spec1.md` (Upload).
**Branch:** `Autostich_Test` — **kein Merge nach `main`** (ausdrückliche Anweisung).

---

## 0. Quellenpriorität (was gilt, wenn sich die Spec widerspricht)

Die Spec hat zwei Ebenen. **§22 („Vereinfachter 40-Runden-Prototyp") hat Vorrang vor allem, was ihm widerspricht** — so steht es wörtlich in §22. Damit ist:

- **§22 = der Bauauftrag.** Die reicheren Positions-Payoff-Varianten der Perks aus §9–13 werden **nicht** gebaut.
- **§22.6 = die Wahrheit für den Perk-Pool.** Jeder Perk macht *eine* Sache (§22.5); Formations-Payoffs gehören dem **globalen Formations-System**, nicht den einzelnen Perks.
- Für Bestand/IDs/Seltenheiten gilt der **aktuelle Code** als Wahrheit; für neue Designrichtung (Aufstellung, Formationen, Score-Stapelung) diese Spec.

---

## 1. Die sechs gelockten Grundsatz-Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Perk-Wahrheit | **§22.6** — vereinfachter Pool, jeder Perk *eine* Sache. Positions-Payoffs sind global, nicht am Perk. Keep it simple. |
| 2 | Start-Reihenfolge des Spielerdecks | **Ein Seed-Shuffle beim Run-Start** (deterministisch über `mulberry32`). Kein vorsortiertes Deck. |
| 3 | Formationen & Segmentgrenzen | **Segment = Arena.** Basis-Formationen enden an Segmentgrenzen (max Länge 5). **E9** hebt das auf. |
| 4 | Leben & Run-Ende | **Leben/Schaden/Heilung/Schild restlos raus.** Run endet nach **Durchlauf 40**. Geist & Highscore laufen über den **Score** weiter. **„Aufgeben"-Button (END_RUN) bleibt.** |
| 5 | Run-Länge / Pacing | **1600 Stiche nach Spec** (40×40). Tempo ist **score-neutral** → Speed-Stufen 1×–4× großzügig auslegen. Feinjustierung per Playtest. |
| 6 | Arbeitsweise | **Plan-Doc im Repo** (dieses Dokument). **Phasenweise**, Spiel bleibt nach jeder Phase spielbar, `npm test` immer grün. **Kein Notion.** |

---

## 2. Ist → Soll (Überblick)

### Fliegt raus
- **Leben-System komplett:** `life/maxLife/shield`, Verlust-Zweig in `engine.js`, Tod bei `life<=0`, `lifeDrainAt`, `DMG_PER_LOSS`, alle Heil-/Rüstungs-/Schild-Hooks.
- **Tempo als Build-Achse:** `speedPct`, E-Tempo-Perks (alt), `tempoScoreMult`, alle Tempo-Score-Kopplungen. Speed nur noch als reiner Abspiel-Regler 1×–4×.
- **C-Kategorie (Leben)** und **E-Kategorie (Tempo)** in ihrer *jetzigen* Bedeutung.
- **Seltenheits-Tier „rare"** im Prototyp: §22.4 → alle A–E sind **normal**, nur **L1–L11 legendär** (bestehende Legendär-Gewichtung bleibt).

### Kommt neu dazu
- **Persistente Spieler-Reihenfolge:** Spielerdeck wird **nicht mehr pro Durchlauf gemischt**. Reihenfolge bleibt bis zur nächsten Formationsphase. **Nur das Gegnerdeck** mischt weiter pro Durchlauf.
- **Formationsphase** (Deck-Umordnung, 4 Energie, 1 Energie/Tausch, Undo).
- **Formations-Scoring** (Wiederholung/Farbblock/Treppe/Wechsel/Anker) als reine Funktion → Positions-Multiplikator, den die Engine bei Sieg anwendet.
- **Stat-System** (4 Stats, 1 aus 4 je Stat-Runde). **Crit-Basis 2× → 1,5×.**
- **Fester Entscheidungszyklus** `round % 6` → Stat/Perk/Formation/Stat/Perk/Skill.

### Bleibt (fast) unverändert
- **Skills / Blitz-Archetyp** — §22.10 = jetziges Verhalten (4 Slots, ersetzen/verwerfen, verwerfen→Perk).
- **Ionisierung** — hängt an Karten-`id`, wandert beim Umordnen automatisch mit.
- **Kartenmodell** `{id, suit, baseRank, value}`, `makeRng`, Stichauflösung inkl. Gleichstand, Chronik, Leaderboard/Geist (score-basiert).

---

## 3. Entscheidungszyklus (§22.2)

Durchläufe 0–39, Entscheidung **vor** dem jeweiligen Durchlauf:

| `round % 6` | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Typ | Stat | Perk | Formation | Stat | Perk | Skill |

Summen über den Run: **14 Stat · 13 Perk · 7 Formation · 6 Skill.** Nach Durchlauf 39 endet der Run sofort.
Erste Formationsphase = vor Durchlauf 2 (dritter Durchlauf). Durchläufe 0 & 1 laufen mit dem Seed-Shuffle.

---

## 4. Phasenplan

Jede Phase: lauffähiger Build + grüne Tests am Ende. Reihenfolge ist dependency-getrieben (Formations-Engine vor C-Rollen/E-Werkzeugen).

### Phase 1 — Fundament strippen ✅ ERLEDIGT
- Leben/Schaden/Heilung/Schild/Tod aus `engine.js`, `reducer.js`, State entfernt.
- Run-Ende = `cycle >= MAX_CYCLES` (40). `END_RUN` bleibt.
- **Persistente Spieler-Reihenfolge:** Shuffle beim Run-Start, danach kein Re-Shuffle mehr für den Spieler; nur das Gegnerdeck mischt pro Durchlauf.
- Tempo-Score-Kopplung raus; `flipMs = BASE_FLIP_MS / speedMult` — Speed ist reiner Anzeige-Regler.
- UI-Sweep: Leben/Tempo-Anzeigen aus `App.jsx`, `StatusRail.jsx`, `Battlefield.jsx`, `PerkSelect.jsx` entfernt.
- Tests: `engine.test.js`/`reducer.test.js` neu; `perks.test.js`/`skills.test.js` unverändert grün. **162/162 grün.** Im Browser verifiziert (Run läuft, kein Tod, Durchlauf 1/40).

**Bewusste Abweichungen vom ursprünglichen Plan:**
1. **Crit-Basis 2 → 1,5 verschoben in Phase 2** (dort baut der Crit-Mult-Stat darauf auf; bündelt alle Crit-Zahlen-Änderungen in einem Schritt). Aktuell noch 2×.
2. **`constants.js` Perk-Konstanten NICHT entfernt** — `perks.js` referenziert sie noch (unveränderter Pool bis Phase 5). Cleanup kommt mit dem Perk-Rewrite. Nur `MAX_CYCLES` ergänzt.
3. **Offene Kleinigkeit:** Speed-Regler zeigt aktuell nur 2×/3× — 4× (und ggf. höher, weil score-neutral) für Phase 6 UI-Feinschliff vormerken (Q5: großzügig).
4. **Zwischenstand-Kosmetik:** C-/E-/einige L-Perks sind aktuell inert (ihre Leben/Tempo-Hooks werden nicht mehr aufgerufen) — beabsichtigt, wird in Phase 5 (§22.6) neu geschrieben.

### Phase 2 — Entscheidungszyklus + Stat-System
- `round % 6`-Fahrplan im Reducer/Engine (ersetzt „jede 3. Runde Skill, sonst Perk").
- Neue Pick-Phase **Stat**: immer alle 4 Stats angeboten, 1 gewählt.
- Stat-State + Score-Formel-Anbindung (siehe §5-Detailfragen).
- **Ergebnis:** Stat-Picks funktionieren, Zyklus fährt den Fahrplan.

### Phase 3 — Formations-Engine (pure, ohne UI)
- Reine Funktion `computeFormations(order, deck, unlocks) → perPosition[{ mult, formations[] }]`.
- Basis-Formationen **innerhalb Segmenten** (Arena): Wiederholung, Farbblock, Treppe, Wechsel.
- Anker nur via E7/E8; Segment als Container ohne eigenen Mult.
- Engine wendet Positions-Mult **bei Sieg** an (Reihenfolge nach §22 / §15).
- **Ergebnis:** Formationen scoren korrekt; volle Testabdeckung der Multiplikator-Tabellen.

### Phase 4 — Formationsphase-UI
- Neuer Screen: 40 Karten in 8 Segmenten, aktuelle Reihenfolge, 4 Energie, beliebiger Tausch = 1 Energie, Undo vor Bestätigung, E10 = 5. Gratis-Tausch.
- Live-Neuberechnung der Formationen nach jedem Tausch, Marker + Tooltips.
- Bestätigte Reihenfolge persistiert. Start-Button-Summary (Energie/Formationen/Max-Mult).
- **Ergebnis:** Spieler baut sein Deck aktiv; Ionisierung wandert korrekt mit.

### Phase 5 — Perk-Pool-Rewrite (§22.6) in Wellen
Reihenfolge: **A → B → D → C-Rollen → E-Werkzeuge → L.** (C/E hängen an Phase 3/4.)
- IDs bleiben, Semantik nach §22.6-Tabellen. Neue Engine-/Reducer-Hooks für Rollen & Werkzeuge.
- Perks mit manueller Kartenauswahl: Zielauswahl direkt nach Perk-Wahl, danach fix.
- Jede Welle mit Tests; §21 verlangt zeilenweisen Abgleich aller 70 Perks.
- **Ergebnis:** vollständiger neuer Pool, alle 70 IDs migriert.

### Phase 6 — UI-Feinschliff & Feedback
- Float-Feedback im Durchlauf (`WIEDERHOLUNG ×1,60`, `FORMATION ×12`, Peak ab ×6/×12).
- Rollen-Labels auf Karten; Chronik-Kartenübersicht mit Rollen-/Marker-Detailansicht.
- Ergebnisanzeige großer Treffer (Basis → Flats → Serien-/global → Formation → Crit).
- Letzte Leben-UI-Reste raus, Speed-Stufen-Regler.
- **Ergebnis:** Prototyp vollständig gemäß §22.

---

## 5. Offene Detail-Fragen je Phase (werden beim Bauen geklärt)

**Phase 2 (Stats):**
- Stapeln die Stat-Picks **additiv**? (Annahme: ja — Crit-Chance +2 pp/Pick, Crit-Mult +0,1×/Pick additiv auf Basis 1,5; Formations-Stat +5 pp/Pick, **max 1× pro Stich**; Serien-Stat +0,5 %/Pick × aktueller Serienpunkt.)
- Genaue Position der Stat-Faktoren in der Score-Formel (§15).

**Phase 3 (Formations-Engine):**
- **Wechsel:** Nachbardifferenz `|a−b| ≥ 6` (Basiswert). E5 senkt Mindestlänge auf 2, Diff bleibt ≥6.
- **Positions-Index im Lauf:** Wiederholung 1.→—, 2.→×1,30, 3.→×1,60, 4.+→×2,00. Farbblock/Treppe/Wechsel: 1.&2.→—, 3.→Basis, je weitere +0,15×.
- **Stapelung mehrerer Formationen auf einer Karte:** Produkt der Pro-Karte-Mults.
- Formations-Mult greift **nur bei Sieg** der jeweiligen Karte.
- Formationen aus **dauerhaftem** Wert; temporäre Boni ändern keine Formation; Berechnung zu Durchlauf-Beginn, stabil.

**Phase 4 (Formations-UI):**
- Undo-Granularität (Stack vs. „alles zurück"). Warnungen (Energie übrig / unbestätigt / starke Formation aufgelöst) blockieren nicht.

**Phase 5 (Perks):** siehe Migrations-Notizen §6.

---

## 6. Perk-Migration — Kategorien-Wechsel & neue Hooks

Vollständige Ziel-Definitionen: **§22.6 der Spec.** Hier nur, was sich *strukturell* ändert:

- **A (Kartenwerte):** bleibt „dauerhafte Wertmods", aber **neue Zahlen** (A1 +4 statt +6; A5/A6/A7/A8 angepasst). Meist über bestehendes `onPick`.
- **B (Reihenfolge):** teils Überlappung, teils neu (B6 „Knappe Kiste" = Wiederholung +2 statt Margin-Score; B10 = „+3 wenn Wert > Vorgänger"). Braucht Zugriff auf Nachbar-/Vorgänger-Werte.
- **C (jetzt Kartenrollen, komplett neu):** Vorhut/Triumph/Leibwache/Staffelläufer/Anführer/Finisher/Überlebensvorteil/Joker/Opfergabe/Bindeglied. **Neue Hooks:** manuelle Kartenauswahl, Rollen-Marker an Karten-`id`, positions-/nachbar-abhängige Boni, Joker/Bindeglied greifen in die **Formationserkennung** ein (→ Phase 3).
- **D (jetzt reiner Flat-Score):** alle additiv. Zahlen nach §22.6 (D1 +75 bei Formation, D2 +25/Serienpunkt max +250, …). Großteils über bestehendes `scoreFlat`.
- **E (jetzt Formationswerkzeuge, komplett neu):** biegen die **Formationserkennung** (Schrittmacher/Farbbrücke/Sanfter Anstieg/Großer Schritt/Pendelwerk/Drehzahl) oder schalten Anker frei (E7/E8) bzw. Segment-Crossing (E9) / Extra-Tausch (E10). **Hängen komplett an Phase 3/4.**
- **L (legendär, ohne Leben):** neu ohne Leben-Kosten. Positions-/Rollen-Payoffs (L3 Pos 36–40 +5, L7 höchste Karte je Segment +5, L11 Pos 40 wiederholt Pos-20-Temp-Effekte, …). Teils neue Reducer-States.

**§21-Pflicht:** vor Abschluss alle 70 Perks zeilenweise Code ↔ §22.6 abgleichen; nichts erfinden, nichts still entfernen.

---

## 7. Determinismus-Invariante (unverändert kritisch)

- `game/` bleibt rein: kein `Math.random`/`Date`. Zufall kommt als Action-Payload/`rng`.
- **Spieler-Reihenfolge:** ein `rng`-Zug beim Run-Start (Seed-Shuffle), danach nur durch Formations-Bestätigung geändert (kein `rng`).
- **Gegner-Reihenfolge:** ein `rng`-Zug je Durchlauf.
- Perk-Zufallsziele (A4/A5/A9/L1/L5/L9…) und Crit-Würfe verbrauchen `rng` nur, wenn tatsächlich gebraucht → keine rng-Drift zwischen Builds.
- Volle Test-Suite bleibt seedbar & grün (Akzeptanzkriterium §19).
