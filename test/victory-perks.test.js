import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FAMILY_DEFS } from "../src/game/families.js";
import { familyDef } from "../src/i18n/labels.js";
import { COL_STAGES } from "../src/game/leaderboard.js";

/* ============================================================
   VICTORY-SCREEN — die Perk-Zeile zeigt jetzt auch die FAMILIEN

   Der Endscreen übergab `RunBuildChips` nur `state.perks`. Das ist seit dem Rarität-Umbau (#167) aber der
   KLEINERE Teil dessen, was ein Spieler in einem Lauf wählt: die alten Kategorie-A-Perks sind zu FAMILIEN
   geworden und stehen als Stufen-Map in `state.familyTiers`, nicht als Einträge in `perks`. Wer einen Lauf
   beendete, sah deshalb eine Handvoll flacher Perks und seine Legendären — und vermisste den Rest zu Recht.

   Diese Datei ist eine QUELLTEXT-RATSCHE (das Projekt hat kein Component-Test-Setup) plus die eine Sache,
   die sich hier wirklich rechnen lässt: dass die Auflösung Familie+Stufe → Anzeigetext überhaupt trägt.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const gameover = read("src/ui/GameOver.jsx");
const stats = read("src/ui/RunStats.jsx");

describe("Victory-Screen · Familien-Perks", () => {
  it("GameOver reicht die Familien-Stufen an die Build-Chips durch", () => {
    expect(gameover).toMatch(/<RunBuildChips entry=\{\{[^}]*families: state\.familyTiers/);
    // Die Build-Sektion muss auch dann erscheinen, wenn ein Lauf AUSSCHLIESSLICH Familien genommen hat
    // (kein flacher Perk, keine Skills) — sonst bliebe genau der Fall unsichtbar, um den es hier geht.
    expect(gameover).toMatch(/Object\.values\(state\.familyTiers \|\| \{\}\)\.some\(\(tier\) => tier > 0\)/);
  });

  it("RunBuildChips rendert die Familien als eigene Chips (Stufenfarbe + römische Stufe)", () => {
    expect(stats).toMatch(/families\.map\(/);
    expect(stats).toMatch(/romanOf\(f\.tier\)/);
    expect(stats).toMatch(/tierMeta\(f\.tier\)/);
    // Die Zeile bekommt eine Überschrift mit Gesamtzahl — flache Perks + Familien.
    expect(stats).toMatch(/const perkTotal = \(perks \? perks\.length : 0\) \+ families\.length/);
    expect(stats).toMatch(/t\("runstats\.perks", \{ n: perkTotal \}\)/);
  });

  it("die Perk-Zeile erscheint auch ohne einen einzigen flachen Perk", () => {
    // showPerks darf nicht mehr allein an `perks` hängen: ein Lauf kann 20 Familien und 0 flache Perks haben.
    expect(stats).toMatch(/const showPerks = !anonymized && \(\(perks !== null && perks\.length > 0\) \|\| families\.length > 0\)/);
    // …und die Anonymisierung fremder Läufe (#205) muss die Familien mitnehmen, nicht nur die flachen Perks.
    expect(stats).toMatch(/const showPerks = !anonymized/);
  });

  it("Familie + Stufe lösen zu Name und Stufentext auf (die Naht hinter den Chips)", () => {
    for (const id of Object.keys(FAMILY_DEFS)) {
      const f = familyDef(id);
      expect(f, `familyDef(${id})`).toBeTruthy();
      expect(typeof f.name).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
      for (const tier of [1, 2, 3, 4]) {
        if (!f.tiers[tier]) continue;
        expect(typeof f.tiers[tier].desc, `${id} Stufe ${tier}`).toBe("string");
      }
    }
    expect(familyDef("GIBT_ES_NICHT")).toBeFalsy(); // unbekannte ID fällt aus der Chip-Liste, statt zu crashen
  });

  /* Warum die Bestenlisten-Detailansicht (RunDetail) die Familien NICHT zeigt und das kein Versehen ist:
     die Board-Zeile speichert `perks` und `skills`, aber keine Familien-Spalte. Solange das so ist, hat
     RunDetail die Daten schlicht nicht. Fällt dieser Test, ist eine Spalte dazugekommen — dann ist die
     Detailansicht nachzuziehen, statt den Test anzupassen. */
  it("die Board-Zeile kennt (noch) keine Familien-Spalte — deshalb bleibt RunDetail unverändert", () => {
    const cols = COL_STAGES.join(",");
    expect(cols).not.toMatch(/famil/i);
  });
});
