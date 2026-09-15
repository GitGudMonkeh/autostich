import { describe, it, expect } from "vitest";
import * as CT from "../src/game/contracts.js";
import { DECISION_SCHEDULE } from "../src/game/constants.js";
import { reducer } from "../src/game/reducer.js";

/* ============================================================
   ZWISCHENAUFGABEN (Aufträge) — docs/zwischenaufgaben.md

   Zwei Sorten Prüfung, und die Unterscheidung ist der Punkt:

     1. Das SYSTEM tut, was das Planungsdokument sagt — Fenster, Bänder, Leitern, Katalogumfang.
     2. Der NORMALE LAUF bleibt unberührt. Das ist die eigentliche Zusage an den Owner: das
        Feature wird getestet, ohne dass der laufende Betrieb sie mitträgt. Ein Lauf ohne den
        Knopf darf keinen einzigen Zustand dieses Systems anfassen.
   ============================================================ */

const seeded = (n = 1) => { let s = n; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; };

describe("Aufträge · die Fenster liegen auf vollen Entscheidungsblöcken", () => {
  /* Der Owner hat 16 und 32 genau deshalb gewählt. Die Zahlen stehen im Dokument, aber der Grund
     lebt in DECISION_SCHEDULE — verschiebt sich der Block, muss das hier auffallen und nicht im
     Playtest. */
  it("D16 und D32 sind jeweils die letzte Runde eines Blocks, jedes Fenster sind vier volle", () => {
    for (const w of CT.WINDOWS) {
      const kinds = DECISION_SCHEDULE.slice(w.from - 1, w.to);
      expect(kinds.length, `Fenster ${w.id}`).toBe(16);
      for (const kind of ["skill", "perk", "formation", "shop"]) {
        expect(kinds.filter((k) => k === kind).length, `${kind} in Fenster ${w.id}`).toBe(4);
      }
      expect(DECISION_SCHEDULE[w.to - 1], `letzte Runde von Fenster ${w.id}`).toBe("shop");
    }
  });

  it("windowFor trifft die Grenzen und lässt alles danach frei", () => {
    expect(CT.windowFor(1).id).toBe(1);
    expect(CT.windowFor(16).id).toBe(1);
    expect(CT.windowFor(17).id).toBe(2);
    expect(CT.windowFor(32).id).toBe(2);
    expect(CT.windowFor(33)).toBe(null);
  });
});

describe("Aufträge · Katalog und Leitern", () => {
  it("fünfzehn Aufgaben, 56 Beutestücke (13 Familien × 4 + 4 Legendäre)", () => {
    expect(CT.TASKS.length).toBe(15);
    expect(CT.LOOT_FAMILIES.length).toBe(13);
    expect(CT.LEGENDARIES.length).toBe(4);
    expect(CT.LOOT_FAMILIES.length * 4 + CT.LEGENDARIES.length).toBe(56);
    for (const f of CT.LOOT_FAMILIES) expect(f.effects.length, f.id).toBe(4);
  });

  it("jede Leiter steigt streng — eine höhere Stufe verlangt nie weniger", () => {
    const ladders = [];
    for (const task of CT.TASKS) {
      if (task.rungs) ladders.push([task.id, task.rungs]);
      for (const v of task.variants || []) if (v.rungs) ladders.push([`${task.id}/${v.id}`, v.rungs]);
    }
    for (const [name, rungs] of ladders) {
      expect(rungs.length, name).toBe(4);
      for (let i = 1; i < rungs.length; i++) expect(rungs[i], `${name} Stufe ${i + 1}`).toBeGreaterThan(rungs[i - 1]);
    }
  });

  it("Reinheit: eine Leiterform, vier Startwerte 2·3·4·5 (Owner 2026-09-15)", () => {
    const starts = { farbblock: 2, wiederholung: 3, treppe: 4, wechsel: 5 };
    for (const [variant, start] of Object.entries(starts)) {
      expect(CT.rungFor("reinheit", "leicht", variant), variant).toBe(start);
      // N · N+1 · N+2 · N+3 — vier aufeinanderfolgende Zahlen, sonst ist es nicht EINE Form.
      expect(CT.STEPS.map((s) => CT.rungFor("reinheit", s, variant)), variant).toEqual([0, 1, 2, 3].map((i) => start + i));
    }
  });

  it("Brecher zählt zehn Stiche, die Leiter ist die Schwelle", () => {
    for (const step of CT.STEPS) expect(CT.targetFor("brecher", step)).toBe(10);
    expect(CT.rungFor("brecher", "leicht")).toBe(10);
    expect(CT.rungFor("brecher", "sehrschwer")).toBe(20);
  });
});

describe("Aufträge · Angebot und Beute", () => {
  it("drei Aufsteller tragen immer drei VERSCHIEDENE Stufen", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const offers = CT.rollOffers(seeded(seed));
      expect(offers.length).toBe(3);
      expect(new Set(offers.map((o) => o.step)).size, `Seed ${seed}`).toBe(3);
      expect(new Set(offers.map((o) => o.taskId)).size, `Seed ${seed}`).toBe(3);
    }
  });

  it("Fenster 2 zieht keine Aufgabe aus Fenster 1", () => {
    const used = ["reinheit", "saeckel", "brecher"];
    for (let seed = 1; seed <= 30; seed++) {
      for (const o of CT.rollOffers(seeded(seed), used)) expect(used).not.toContain(o.taskId);
    }
  });

  it("die Beute bleibt im Band der Stufe, keine Kategorie doppelt", () => {
    for (const step of CT.STEPS) {
      const band = CT.STEP_BAND[step];
      for (let seed = 1; seed <= 30; seed++) {
        const loot = CT.rollLoot(seeded(seed * 7), step);
        expect(loot.length, `${step}/${seed}`).toBe(3);
        const cats = loot.filter((p) => p.category).map((p) => p.category);
        expect(new Set(cats).size, `${step}/${seed} Kategorien`).toBe(cats.length);
        for (const p of loot) expect(band, `${step} → ${p.id}@${p.tier}`).toContain(p.tier);
      }
    }
  });

  it("Legendäres hat genau EINEN Zugang: die obere Hälfte der vierten Stufe", () => {
    for (const step of CT.STEPS) {
      if (step === "sehrschwer") continue;
      for (let seed = 1; seed <= 40; seed++) {
        for (const p of CT.rollLoot(seeded(seed * 13), step)) {
          expect(p.tier, `${step} darf nichts Legendäres tragen`).toBeLessThan(CT.TIER_LEGENDARY);
        }
      }
    }
  });
});

describe("Aufträge · die Strichliste", () => {
  const trick = (suit, value, result = "win", green = false) => ({ result, pValue: value, pCard: { suit, value, green } });

  it("Sperrfeuer zählt nur volle Fünferblöcke, ein Verlust darin kippt das Segment", () => {
    let t = CT.emptyTally();
    for (let i = 1; i <= 5; i++) t = CT.tallyTrick(t, trick("R", 5), { trickNo: i });
    expect(t.segments).toBe(1);
    // Zweites Segment mit einem Verlust in der Mitte → zählt nicht.
    for (let i = 6; i <= 10; i++) t = CT.tallyTrick(t, trick("R", 5, i === 8 ? "loss" : "win"), { trickNo: i });
    expect(t.segments).toBe(1);
  });

  it("Buntspiel zählt die GRUNDFARBE, auch wenn die Karte grün gefärbt ist", () => {
    let t = CT.emptyTally();
    // Eine grün gefärbte Rot-Karte bleibt für Buntspiel Rot — sonst wäre die Aufgabe für Pflanze unmöglich.
    t = CT.tallyTrick(t, trick("R", 5, "win", true), { trickNo: 1 });
    expect(t.suitWins.R).toBe(1);
    expect(t.suitWins.G).toBeUndefined();
  });

  it("Farbtreue nutzt dagegen die WIRKFARBE — grün bricht die Rot-Serie", () => {
    let t = CT.emptyTally();
    t = CT.tallyTrick(t, trick("R", 5), { trickNo: 1 });
    t = CT.tallyTrick(t, trick("R", 5), { trickNo: 2 });
    expect(t.bestSuitStreak).toBe(2);
    t = CT.tallyTrick(t, trick("R", 5, "win", true), { trickNo: 3 }); // grün gefärbt → andere Wirkfarbe
    expect(t.suitStreak).toBe(1);
    expect(t.bestSuitStreak).toBe(2);
  });

  it("Brecher zählt nur über der Schwelle, Fußvolk nur Grundwert 4 oder weniger", () => {
    let t = CT.emptyTally();
    t = CT.tallyTrick(t, trick("R", 12), { trickNo: 1, threshold: 10 });
    t = CT.tallyTrick(t, trick("R", 9), { trickNo: 2, threshold: 10 });
    t = CT.tallyTrick(t, trick("R", 3), { trickNo: 3, threshold: 10 });
    expect(t.overThreshold).toBe(1);
    expect(t.lowWins).toBe(1);
  });

  it("ein verlorener Stich zählt nirgends", () => {
    let t = CT.emptyTally();
    t = CT.tallyTrick(t, trick("R", 20, "loss"), { trickNo: 1, threshold: 5 });
    expect(t.overThreshold).toBe(0);
    expect(t.lowWins).toBe(0);
    expect(t.bestSuitStreak).toBe(0);
  });
});

describe("Aufträge · Nachlass rundet ab und nie unter eine Münze", () => {
  /* Aufgerundet hätte ein Viertel Nachlass den ersten Neuwurf unverändert gelassen (3 → 2,25 → 3);
     abgerundet ohne Mindestpreis wäre er bei drei Vierteln gratis. */
  it("die Preistreppe 3 · 6 · 12 unter den vier Stufen", () => {
    const at = (scale) => [3, 6, 12].map((b) => CT.contractRerollPrice(b, { rerollScale: scale }));
    expect(at(0.75)).toEqual([2, 4, 9]);
    expect(at(0.5)).toEqual([1, 3, 6]);
    expect(at(0.25)).toEqual([1, 1, 3]);
    expect(at(0)).toEqual([0, 0, 0]);
  });
});

describe("Aufträge · der normale Lauf bleibt unberührt", () => {
  const start = (extra = {}) => reducer(undefined, { type: "START_RUN", rng: seeded(42), architect: true, seed: 7, ...extra });

  it("ohne den Knopf trägt der Lauf KEINEN Auftragszustand", () => {
    const s = start();
    expect(s.contractsEnabled).toBe(false);
    expect(s.contracts).toBe(null);
    expect(s.contractTally).toBe(null);
    expect(s.contractBoons).toBe(null);
  });

  it("mit dem Knopf liegt sofort ein Angebot aus Fenster 1 aus", () => {
    const s = start({ contracts: true });
    expect(s.contractsEnabled).toBe(true);
    expect(s.contracts.windowId).toBe(1);
    expect(s.contracts.offers.length).toBe(3);
    expect(s.contracts.active).toBe(null);
  });

  it("die beiden Aktionen tun im normalen Lauf NICHTS", () => {
    const s = start();
    expect(reducer(s, { type: "PICK_CONTRACT", taskId: "saeckel", step: "leicht" })).toBe(s);
    expect(reducer(s, { type: "PICK_LOOT", lootId: "zehrgeld", tier: 1 })).toBe(s);
  });

  it("annehmen setzt den Auftrag und lässt die anderen zwei verfallen", () => {
    const s = start({ contracts: true });
    const chosen = s.contracts.offers[1];
    const after = reducer(s, { type: "PICK_CONTRACT", taskId: chosen.taskId, step: chosen.step });
    expect(after.contracts.active.taskId).toBe(chosen.taskId);
    expect(after.contracts.offers).toEqual([]);
    expect(after.contracts.usedTasks).toContain(chosen.taskId);
  });

  it("ein Beutestück wirkt und verbraucht die Auslage", () => {
    const s = start({ contracts: true });
    const withLoot = { ...s, contracts: { ...s.contracts, pendingLoot: CT.rollLoot(seeded(3), "leicht") } };
    const piece = withLoot.contracts.pendingLoot.find((p) => p.id === "zehrgeld")
      || { kind: "family", id: "zehrgeld", category: "muenze", tier: 1, effect: { coins: 15 } };
    const armed = { ...withLoot, contracts: { ...withLoot.contracts, pendingLoot: [piece] } };
    const after = reducer(armed, { type: "PICK_LOOT", lootId: piece.id, tier: piece.tier });
    expect(after.contracts.pendingLoot).toBe(null);
    expect(after.contracts.taken.length).toBe(1);
    if (piece.id === "zehrgeld") expect(after.coins).toBe((armed.coins || 0) + 15);
  });
});
