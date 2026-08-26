import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { reducer, initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { archetypeOf } from "../src/game/skills.js";

/* #372b — der Archetyp-Effekt muss vorgewärmt sein, BEVOR seine erste Karte kommt.

   Der gemeldete Fehler: die erste ausgewachsene Pflanzen-Karte hängt beim Umdrehen. Ursache war keine
   fehlende Vorwärmung, sondern ihr ZEITPUNKT — und der lässt sich hier nachrechnen statt vermuten:

     1. `PICK_SKILL` setzt `activeArchetypes` UND `phase: "play"` im selben Dispatch. Der Vorwärm-Effekt
        in App.jsx läuft danach zwar, steigt aber über seine erste Zeile aus („nie mitten im Stichspiel").
        Der eben gewählte Archetyp fiel damit durch.
     2. EIS fiel nie durch — sein Pick geht auf `glacier-target`, also in eine Nicht-Spiel-Phase.
        Genau deshalb sah der Fehler wie ein reines Pflanzen-Problem aus.

   Punkt 1 und 2 sind Reducer-Verhalten und werden unten GERECHNET. Die Verdrahtung in App.jsx ist eine
   Quelltext-Ratsche (kein Component-Test-Setup, s. test/fx-panel.test.js). */

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

const scen = (offer, over = {}) => ({
  ...initialState(makeRng(1)),
  phase: "levelup", skillOffer: offer, skills: [], activeArchetypes: [], ...over,
});

describe("#372b — warum der Pick zu spät kommt", () => {
  it("ein Pflanzen-Pick landet SOFORT in der Spielphase — dort wärmt der Effekt bewusst nichts", () => {
    const id = "SK_PLANT_02";
    expect(archetypeOf(id)).toBe("plant");
    const next = reducer(scen([id]), { type: "PICK_SKILL", skillId: id, rng: () => 0.5 });
    expect(next.activeArchetypes, "der Archetyp ist ab jetzt aktiv").toContain("plant");
    expect(next.phase, "und die Phase ist im selben Dispatch schon wieder play").toBe("play");
  });

  it("der Effekt hält an seiner Regel fest: in der Spielphase wird nicht vorgewärmt", () => {
    // Diese Zeile ist der Grund für die Lücke UND die Regel, die bleiben soll (#372: ein Aufbau im
    // Idle-Slot mitten in den Animationsframes hat mehrere Frames blockiert).
    expect(app).toContain('if (!arch.length || state.phase === "play") return undefined;');
  });
});

describe("#372c — der Ladebildschirm wärmt vor, nicht der Lauf", () => {
  const loader = readFileSync(new URL("../src/ui/RunLoader.jsx", import.meta.url), "utf8");

  it("der Run-Start-Ladebalken bekommt die Vorwärm-Aufgaben mit", () => {
    expect(app).toContain("<RunLoader images={pendingRun} tasks={fxWarmTasks()}");
  });

  it("gewärmt werden die FREIGESCHALTETEN Archetypen — der Angebots-Pool ist genau darauf begrenzt", () => {
    expect(app).toContain("return unlockedArchetypes(profile)");
    expect(app).toContain("fxPrewarmedRef.current.add(a); return FX_PREWARM[a](opts);");
  });

  it("eine Aufgabe zählt erst, wenn sie FERTIG ist — sonst läuft der Balken dem Aufbau davon", () => {
    /* Ein Vorwärmen ist Import PLUS teurer Aufbau. Zählte schon der Anstoß, könnte der Ladebalken
       durchlaufen, während der Aufbau noch aussteht — und der landete dann doch im Spiel. */
    expect(loader).toContain("p.catch(() => {}).then(() => { if (cancelled) return; bump(); idle(step, { timeout: 1000 }); });");
  });

  it("die Aufgaben zählen in dieselbe Summe wie die Bilder", () => {
    // Sonst steht der Balken bei den Vorwärm-Aufgaben und der Spieler sieht einen hängenden Ladebildschirm.
    expect(loader).toMatch(/const total = Math\.max\(1, \[\.\.\.new Set\(images\.filter\(Boolean\)\)\]\.length \+ \(tasks \|\| \[\]\)\.filter\(Boolean\)\.length\);/);
    expect(loader).toContain("const total = urls.length + jobs.length;");
  });

  it("ein hängendes Vorwärmen hält keinen Lauf auf", () => {
    // `maxWait` deckelt den ganzen Ladebildschirm — der Deckel galt schon für Bilder und gilt jetzt auch hier.
    expect(loader).toContain("const safety = setTimeout(() => { if (!cancelled) { cancelled = true; onReady(); } }, maxWait);");
  });
});

describe("#372b — das Angebot bleibt das Netz", () => {
  it("die angebotenen Archetypen zählen mit, nicht nur die aktiven", () => {
    expect(app).toContain("const offeredArchs = (state.skillOffer || []).map(archetypeOf).filter(Boolean).join(\",\");");
    expect(app).toMatch(/const arch = \[\.\.\.new Set\(\[\.\.\.\(state\.activeArchetypes \|\| \[\]\), \.\.\./);
  });

  it("das Angebot steht in den Abhängigkeiten — sonst liefe der Effekt nie darauf", () => {
    expect(app).toMatch(/\}, \[state\.activeArchetypes, state\.phase, offeredArchs\]\);/);
  });

  it("das Skill-Angebot ist eine Nicht-Spiel-Phase, die Wärmung liegt also VOR dem Pick", () => {
    // Ohne diese Zuordnung wäre die Wärmung wieder im Stichspiel — genau das, was #372 verbietet.
    expect(app).toContain('{state.phase === "levelup" && state.skillOffer && (');
  });
});
