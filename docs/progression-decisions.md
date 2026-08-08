# Progression-System — Beschluss-Stand (Umsetzungs-Referenz)

> **Zweck:** Verbindlicher, versionierter Stand der Design-Entscheidungen für die Umsetzung des
> Progression-Systems auf `Autostich_Test`. Ergänzt/überschreibt das ausführliche Design-Doc.
> **Master-Design (ausführlich):** Google-Doc „Autostich · Progression-Tree, Spine, Onboarding & Start-Screen"
> (doc-id `12leHpMHaZw18JhLD0UsF6Lng53kAP42__U4xGyKTx10`) sowie `docs/progression-tree.md` (v0-Export).
> Bei Widerspruch gilt **dieses Dokument** für die konkreten Zahlen/Namen der Umsetzung.
>
> Stand: 2026-08-08 · Session-Beschlüsse.

---

## 1 · Namen (final)

| Begriff | Bedeutung | Ersetzt |
|---|---|---|
| **Stichpunkte (SP)** | Meta-Währung. Läufe verdienen SP, SP kauft Upgrades. | „Konstruktionspunkte / KP" |
| **Upgrades** | Die Meta-Progression (Knoten-Baum). Schlicht so benannt — kein Thema-Name. | „Werkstatt / Reißbrett / Baum" |
| **Fortschritt** | Beschriftung der Hauptscreen-Leiste (Onboarding-Fortschritt bzw. SP-Drip). | — |

Storage-Felder (Profil): `stichPoints` (Guthaben), `stichSpent` (ausgegeben, für Respec/Anzeige),
`nodes: { [nodeId]: level }`.

---

## 2 · Master-Rang — entfernt

Der `masteryGrade`/Meister-Rang wird **komplett entfernt** (nicht „gefaltet"). Die heutigen Auto-Rewards
(Reroll/Cover/RareShift/LegendMult/Legendär-Garantie) werden zu **wählbaren SP-Upgrades**. Ein System statt zwei.

---

## 3 · Slots & Archetypen

- Die **3-von-4-Slot-Mechanik ist komplett gestrichen.** Kein Slot-Konzept, keine „3 von 4"-Auswahl.
- Das **3-Slot-Vorbereitungsmenü (§8 des Master-Docs) entfällt.** „Normales Spiel" startet direkt.
- Archetypen werden im **Onboarding weiterhin nacheinander freigeschaltet** (siehe §4). Startzustand:
  **Blitz ⚡ + Feuer 🔥 verfügbar**, Eis ❄ + Pflanze 🌿 gesperrt (ausgegraut/🔒 mit Freischalt-Runde).
- Freigeschaltete Archetypen sind alle frei nutzbar wie heute (**kein Cap, keine Auswahlbegrenzung**).
- **Legendär-Slot (R29):** je **1 legendärer Skill pro im Lauf aktivem Archetyp** (bis zu 4).

---

## 4 · Onboarding-Kette (6 Glieder)

Vorrücken = **einen Lauf bis zum Victory-Screen abschließen** (natürlicher Abschluss). Vorzeitiges Beenden
zählt nicht. Keine Highscore-Vorgaben. Ein Glied pro abgeschlossenem Lauf. Läuft **vor** der SP-/Upgrade-Ökonomie.

| # (abgeschl. Läufe) | Freischaltung |
|---|---|
| 1 | Reroll (Basis 1 pro Phase) |
| 2 | + Pflanze 🌿 (Archetyp) |
| 3 | Rarität +1 (nächste Stufe) |
| 4 | + Eis ❄ (Archetyp) |
| 5 | Rarität +1 (übernächste Stufe) |
| 6 | Legendär-Capstone (R29-Slot aktiv) |

(Reihenfolge bewusst abwechselnd Archetyp/Rarität; Runden am Playtest justierbar. Der alte „+3. Slot"-Schritt
ist entfallen, danach Rarität ↔ Eis getauscht für gleichmäßigere Verteilung.)

Profil-Feld: weiteste erreichte Onboarding-Stufe (0..6).

---

## 5 · Hauptscreen-Leiste — ein Element, zwei Leben

- **Während Onboarding:** Fortschritts-Leiste **„Fortschritt X/6"**, zeigt die **nächste Freischaltung** als
  Vorschau. Die **„Upgrades"-Kachel** ist 🔒 gesperrt mit Countdown **„noch N Läufe"**. Bei 6/6 → Kachel frei
  (Puls-Badge), Leiste kippt in den SP-Modus.
- **Nach Onboarding:** dieselbe Leiste = **kumulativer SP-Drip**: je **10 abgeschlossene Läufe → +5 SP**
  (kein consecutive Streak — Abbrechen bestraft nicht; nutzt die bestehende `completed`-Logik).

---

## 6 · SP-Quellen (Hybrid A)

- **+1 SP** je abgeschlossenem Lauf (Grundstock).
- **Score-Meilensteine** des Laufs: **+1** bei 25 Mio · **+1** bei 50 Mio · **+1** bei 75 Mio · **+2** bei 100 Mio.
- **+5 SP** je 10 abgeschlossene Läufe (Treue-Drip, siehe §5).
- (Kein Rang-Aufstiegs-Schub mehr — Rang ist entfernt.)
- Über dem Battlefield ein Balken, der den Score trackt und an jedem Meilenstein die Farbe wechselt;
  Skalierung **nicht linear**, proportional zum Erreichen der Meilensteine.

Alle Werte sim-/tunebar (envNum-Konstanten).

---

## 7 · Bestenlisten — zwei-stufig

- **Normaler Run** (kein Leaderboard-Zwang) + **Button „Ranglisten-Run"** mit zwei Varianten:
  - **Standard:** Lauf wie aktuell (50 Runden, feste Spine, 2 Rerolls je Phase, normale Drop-Rates nach
    Onboarding, alle freigeschalteten Archetypen, Legendär R29). Eigenes Leaderboard.
  - **Meister:** freigeschaltet, wenn **alle Upgrades gekauft** sind; spielt mit **allen Upgrades aktiv**.
    Eigenes, unabhängiges Leaderboard.

---

## 8 · Spine — FIX (ändert sich nicht)

50 Zyklen, `DECISION_SCHEDULE` unverändert. **Über Progression skaliert NUR Baufeld-Größe + Rerolls.**
Reroll-Ökonomie: **Basis 1 pro Phase** (aus Onboarding) + **2 Upgrade-Knoten je +1** (Sequenz) → max 3,
use-it-or-lose-it, getrennt für Skill/Perk/Architekt.

---

## 9 · Code-Seams (Umsetzung, kein Engine-Umbau)

Tree-Boni ersetzen an denselben Reducer-Nähten die alten `masteryX(grade)`-Aufrufe durch `treeX(profile)`
(feste Zahlen aus dem Profil, deterministisch, keine neuen RNG-Ströme):

| Seam | heute | neu |
|---|---|---|
| Baufeld-Deckel | `masteryCoverBonus(grade)` — `reducer.js:196` | `treeCoverBonus(profile)` |
| Rerolls (Skill/Perk/Arch) | `masteryRerollBonus(grade)` — `reducer.js:204–206` | Basis 1 + `treeRerollBonus(profile)` |
| RareShift | `masteryRareShift` — `reducer.js:309/547/603` | `treeRareShift(profile)` (Meisterschafts-Knoten) |
| LegendMult | `masteryLegendMult` — `reducer.js:547/616`, `engine.js:1243` | `treeLegendMult(profile)` |

- Neues, pures Modul **`src/game/progression.js`** (Analogon zu `mastery.js`): Knoten-Defs (data-driven),
  `nodeEffects(profile)`-Ableiter, Kauf-/Voraussetzungs-/Respec-Logik. Node-testbar, deterministisch.
- **`storage.js`:** Profil-Felder (§1) + Migration (`PROFILE_SCHEMA_VERSION` erhöhen + Block) + SP-Vergabe in
  `recordRun` + Onboarding-Feld. Sim läuft profil-los (Baseline unberührt).

---

## 10 · Umsetzungs-Reihenfolge

1. `progression.js` (Knoten-Defs + `nodeEffects` + Kauf/Voraussetzung/Respec) + Tests. **Anker zuerst:
   Baufeld 3× +4** (maxCover 24 → 28 → 32 → 36, Deckel < 40).
2. `storage.js`: Profil-Felder + Migration + SP-Vergabe + Onboarding-Feld.
3. Reducer-Seams umlegen (§9), Master-Rang-Reste entfernen.
4. Onboarding-Gates (Archetypen/Rarität/Reroll/Legendär) + direkter Start ohne Slot-Menü.
5. UI: Upgrade-Screen, Start-Screen-Hub, SP-Anzeige, „Fortschritt"-Leiste, Score-Meilenstein-Balken.
6. Leaderboard zwei-stufig (Standard/Meister).
7. Tests + Sim-Gegenprobe „max ausgebautes Profil".

---

## Offen / später (unverändert vom Master-Doc)

- Genaue SP-Kosten je Upgrade + Onboarding-Rundenzahlen am Playtest justieren.
- Start-Screen-Detaildesign (geparkt).
- Deck-Freischaltung als weiterer SP-Sink (später im Detail).
