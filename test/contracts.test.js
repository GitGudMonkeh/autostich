import { describe, it, expect } from "vitest";
import * as CT from "../src/game/contracts.js";
import { DECISION_SCHEDULE } from "../src/game/constants.js";
import * as C from "../src/game/constants.js";
import { reducer } from "../src/game/reducer.js";
import { SKILL_LIST, isLegendarySkill, buildSkillDoors } from "../src/game/skills.js";
import { computeFormations, openBorderInfo, FORMATION_TYPES, countBuiltFormations } from "../src/game/formations.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { stepColor, tierColor, contractReadout, lootName, lootText } from "../src/ui/ContractPhase.jsx";
import { rerollOffer, rerollPrice, REROLL_CAP } from "../src/game/coins.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEGENDARY_GOLD, STEP_BRONZE, STEP_SILVER, STEP_GOLD } from "../src/ui/indicators/vocab.js";
import de from "../src/i18n/de.js";

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
  it("vierzehn Aufgaben, 61 Beutestücke (14 Familien × 4 + 5 Legendäre)", () => {
    expect(CT.TASKS.length, "Strähne gestrichen (Owner, 2026-09-16)").toBe(14);
    expect(CT.LOOT_FAMILIES.length).toBe(14);
    expect(CT.LEGENDARIES.length).toBe(5);
    expect(CT.LOOT_FAMILIES.length * 4 + CT.LEGENDARIES.length).toBe(61);
    for (const f of CT.LOOT_FAMILIES) expect(f.effects.length, f.id).toBe(4);
  });

  it("jede Familie und jedes Legendäre trägt eine EIGENE id", () => {
    const ids = [...CT.LOOT_FAMILIES.map((f) => f.id), ...CT.LEGENDARIES.map((l) => l.id)];
    expect(new Set(ids).size, "doppelte id im Katalog").toBe(ids.length);
  });

  it("jede Leiter steigt streng — eine höhere Stufe verlangt nie weniger", () => {
    /* Gemessen wird der Anstieg INNERHALB EINES MASSES. Wo eine Stufe den Zähler wechselt
       (Durchmarsch schwer zählt Durchläufe statt Stiche), sind die Zahlen nicht vergleichbar —
       dort endet die Leiter, statt dass der Wächter gelockert wird. Eine Stufe, die die Aufgabe
       gar nicht anbietet, trägt `null` und beendet die Leiter ebenso. */
    const ladders = [];
    for (const task of CT.TASKS) {
      if (task.rungs) ladders.push([task.id, task]);
      for (const v of task.variants || []) if (v.rungs) ladders.push([`${task.id}/${v.id}`, task, v]);
    }
    for (const [name, task, variant] of ladders) {
      const rungs = (variant && variant.rungs) || task.rungs;
      expect(rungs.length, name).toBe(3);
      for (let i = 1; i < rungs.length; i++) {
        const step = CT.STEPS[i], prev = CT.STEPS[i - 1];
        if (rungs[i] == null || rungs[i - 1] == null) continue;                 // Stufe wird nicht angeboten
        if (CT.measureFor(task.id, step) !== CT.measureFor(task.id, prev)) continue;  // anderer Zähler
        expect(rungs[i], `${name} Stufe ${i + 1} fordert WENIGER`).toBeGreaterThanOrEqual(rungs[i - 1]);
        /* Gleich viel ist nur erlaubt, wenn die höhere Stufe stattdessen eine Zusatzbedingung
           trägt — Vollbrett bleibt bei 40 und verlangt obendrein Dichte. Sonst wäre die Stufe
           umsonst teurer bezahlt. */
        if (rungs[i] === rungs[i - 1]) {
          const zusatz = CT.extraFor(task.id, step, variant && variant.id);
          expect(zusatz, `${name} Stufe ${i + 1}: gleiche Sprosse ohne Zusatzbedingung`).toBeTruthy();
        }
      }
    }
  });

  it("eine Stufe ohne Sprosse wird auch nicht angeboten", () => {
    // Langbau hat kein Leicht: fünf Karten sind die Segmentwand, alles darunter ist geschenkt.
    for (const task of CT.TASKS) {
      for (const [i, step] of CT.STEPS.entries()) {
        const hat = (task.rungs || [])[i] != null
          || (task.variants || []).some((v) => (v.rungs || [])[i] != null);
        expect(CT.offersStep(task.id, step), `${task.id}/${step}`).toBe(hat);
      }
    }
    expect(CT.offersStep("langbau", "leicht")).toBe(false);
    expect(CT.stepsOf("langbau")).toEqual(["mittel", "schwer"]);
  });

  it("Reinheit: die vier Owner-Leitern auf dem KARTEN-Maß (2026-09-16)", () => {
    const leitern = {
      farbblock:    [20, 30, 40],
      wiederholung: [20, 30, 34],
      treppe:       [20, 26, 32],
      wechsel:      [20, 26, 32],
    };
    for (const [variant, L] of Object.entries(leitern)) {
      expect(CT.STEPS.map((st) => CT.rungFor("reinheit", st, variant)), variant).toEqual(L);
    }
    // Karten, nicht Formationen: die oberste Farbblock-Stufe ist das ganze Brett, plus Zusatz.
    expect(CT.rungFor("reinheit", "schwer", "farbblock")).toBe(40);
    expect(CT.extraFor("reinheit", "schwer", "farbblock")).toEqual({ positions: 40, min: 2 });
    expect(CT.extraFor("reinheit", "schwer", "treppe"), "nur Farbblock trägt den Zusatz").toBe(null);
  });

  it("Reinheit misst KARTEN — eine Position in drei Läufen desselben Typs zählt EINMAL", () => {
    /* Sonst wäre es wieder ein Läufe-Maß mit anderem Namen, und genau dessen grobe Körnung
       (2 bis 8 mögliche Werte) war der Grund für den Wechsel. */
    const perPosition = [
      { formations: [{ type: "farbblock", ordinal: 1 }, { type: "farbblock", ordinal: 2 }, { type: "farbblock", ordinal: 3 }] },
      { formations: [{ type: "farbblock", ordinal: 1 }] },
      { formations: [{ type: "treppe", ordinal: 1 }] },
      { formations: [{ type: "formationskern", ordinal: 1 }] },   // Architektur, keine gebaute Formation
      { formations: [] },
    ];
    expect(CT.cardsInType(perPosition, "farbblock")).toBe(2);
    expect(CT.cardsInType(perPosition, "treppe")).toBe(1);
    expect(CT.cardsInType(perPosition, "wechsel")).toBe(0);
  });

  it("Brecher zählt zehn Stiche, die Leiter ist die Schwelle", () => {
    for (const step of CT.STEPS) expect(CT.targetFor("brecher", step)).toBe(10);
    expect(CT.rungFor("brecher", "leicht")).toBe(10);
    expect(CT.rungFor("brecher", "schwer")).toBe(20);
  });

  it("drei Stufen, und sehrschwer gibt es nicht mehr", () => {
    expect(CT.STEPS).toEqual(["leicht", "mittel", "schwer"]);
    expect(CT.STEPS.length, "so viele Stufen wie Angebote — jedes zeigt genau eine").toBe(CT.OFFERS_PER_WINDOW);
    for (const step of CT.STEPS) expect(CT.STEP_BAND[step], step).toHaveLength(2);
    expect(CT.STEP_BAND.leicht).toEqual([1, 2]);
    expect(CT.STEP_BAND.mittel).toEqual([2, 3]);
    expect(CT.STEP_BAND.schwer).toEqual([3, 4]);
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
        const erlaubt = step === CT.LEGENDARY_STEP ? [...band, CT.TIER_LEGENDARY] : band;
        for (const p of loot) expect(erlaubt, `${step} → ${p.id}@${p.tier}`).toContain(p.tier);
      }
    }
  });

  it("Legendäres hat genau EINEN Zugang: die obere Hälfte der schweren Stufe", () => {
    for (const step of CT.STEPS) {
      if (step === CT.LEGENDARY_STEP) continue;
      for (let seed = 1; seed <= 40; seed++) {
        for (const p of CT.rollLoot(seeded(seed * 13), step)) {
          expect(p.tier, `${step} darf nichts Legendäres tragen`).toBeLessThan(CT.TIER_LEGENDARY);
        }
      }
    }
  });

  it("JEDE Auslage trägt mindestens ein Stück der oberen Rarität (Owner, 2026-09-17)", () => {
    /* Vorher würfelte jedes Stück für sich 70/30, und in rund einem Drittel der Fälle kam dreimal
       die untere heraus — eine mittlere Aufgabe zahlte dann dreimal Selten, obwohl ihr Band Selten
       ODER Sehr selten verspricht. Das Band war eine Aussage über die Ziehung, nicht über die Auslage. */
    for (const step of CT.STEPS) {
      const band = CT.STEP_BAND[step];
      for (let seed = 1; seed <= 120; seed++) {
        const loot = CT.rollLoot(seeded(seed * 31), step);
        expect(loot.length, `${step}/${seed}`).toBe(3);
        expect(loot.some((p) => p.tier >= band[1]), `${step}/${seed}: keine obere Rarität dabei`).toBe(true);
      }
    }
  });

  it("Legendäres ersetzt einen UNTEREN Platz, nie die Garantie", () => {
    /* Owner, 2026-09-17: „ersetzt aber eines der niedrigeren Angebote (sehr selten)". Die Episch-
       Garantie darf es also nicht kosten — sonst wäre ein Legendäres unterm Strich ein Rückschritt. */
    const band = CT.STEP_BAND.schwer;
    let mitLeg = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const loot = CT.rollLoot(seeded(seed * 13 + 5), "schwer");
      const legs = loot.filter((p) => p.tier >= CT.TIER_LEGENDARY);
      expect(legs.length, `seed ${seed}: höchstens ein Legendäres`).toBeLessThanOrEqual(1);
      if (!legs.length) continue;
      mitLeg += 1;
      expect(loot.some((p) => p.tier === band[1]), `seed ${seed}: Garantie überlebt das Legendäre`).toBe(true);
    }
    expect(mitLeg, "und es kommt überhaupt vor").toBeGreaterThan(0);
  });

  it("die Raten JE AUSLAGE — Garantie immer, Legendäres selten", () => {
    /* Gemessen an `rollTiers`, dem Weg, den `rollLoot` wirklich geht. Die frühere Fassung maß
       `rollTier` je Stück — eine Funktion, die es seit der Garantie-Regel nicht mehr gibt und die
       am Ende nur noch sich selbst geprüft hätte. Zwei freie Plätze zu 70/30, dazu die
       Legendär-Chance auf einen UNTEREN Platz (Owner, 2026-09-15/17). */
    const rng = seeded(4711);
    const N = 4000;
    let mitOben = 0, mitLeg = 0, unten = 0, plaetze = 0;
    for (let i = 0; i < N; i++) {
      const t = CT.rollTiers("schwer", rng);
      expect(t.length).toBe(3);
      if (t.includes(4)) mitOben += 1;
      if (t.includes(CT.TIER_LEGENDARY)) mitLeg += 1;
      unten += t.filter((x) => x === 3).length;
      plaetze += 3;
    }
    expect(mitOben / N, "die Episch-Garantie hält ausnahmslos").toBe(1);
    const legPct = (mitLeg / N) * 100;
    expect(legPct, "Legendär je Auslage").toBeGreaterThan(22);
    expect(legPct, "Legendär je Auslage").toBeLessThan(34);
    // Sehr selten bleibt ein guter Teil der beiden freien Plätze, sonst kippte das Band nach oben.
    expect(unten / plaetze, "Sehr selten je Platz").toBeGreaterThan(0.3);
  });

  it("die leichten Bänder tragen nie ein Legendäres, auch mit der Garantie nicht", () => {
    for (const step of ["leicht", "mittel"]) {
      const rng = seeded(99);
      for (let i = 0; i < 500; i++) {
        for (const tier of CT.rollTiers(step, rng)) {
          expect(tier, `${step} darf nichts Legendäres tragen`).toBeLessThan(CT.TIER_LEGENDARY);
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

describe("Aufträge · die Beute wirkt wirklich — jede Naht einzeln", () => {
  /* Jeder Zugriff nimmt den Wert, den das Spiel OHNE Aufträge nähme, und gibt den zurück, der gilt.
     Deshalb wird jeder hier zweimal geprüft: einmal ohne Auftragslauf (Eingabe kommt unverändert
     zurück) und einmal mit dem Segen. Der erste Fall ist die eigentliche Zusage. */
  const withBoons = (boons, extra = {}) => ({ contractsEnabled: true, contractBoons: boons, cycle: 0, ...extra });
  const plain = (extra = {}) => ({ contractsEnabled: false, contractBoons: null, cycle: 0, ...extra });

  it("ohne Auftragslauf gibt JEDER Zugriff seinen Eingabewert unverändert zurück", () => {
    const s = plain();
    expect(CT.coinsPerCycleWith(s, 5)).toBe(5);
    expect(CT.formationEnergyWith(s, 4)).toBe(4);
    expect(CT.unspentEnergyWith(s, 3)).toBe(3);
    expect(CT.forfeitWith(s, 12)).toBe(12);
    expect(CT.rerollPriceWith(s, 6)).toBe(6);
    expect(CT.perksOfferedWith(s, 3)).toBe(3);
    expect(CT.perkFloorWith(s, 1)).toBe(1);
    expect(CT.perkLegendaryWith(s, 0.03)).toBe(0.03);
    expect(CT.skillDoorsWith(s, 2)).toBe(2);
    expect(CT.skillLegendaryWith(s, 0.035)).toBe(0.035);
    expect(CT.liftSkillTiers(s, [0, 1, 2])).toEqual([0, 1, 2]);
    expect(CT.coinsPerPhase(s)).toBe(0);
    expect(CT.freeRerollPhases(s)).toBe(null);
    expect(CT.legendaryPerkForce(s)).toBe(0);
  });

  it("Münzrecht zahlt je Durchlauf und läuft mit `cycles` aus", () => {
    const befristet = withBoons({ income: { per: 1, until: 15 } });
    expect(CT.coinsPerCycleWith(befristet, 5, 15)).toBe(6);
    expect(CT.coinsPerCycleWith(befristet, 5, 16)).toBe(5);   // abgelaufen
    expect(CT.coinsPerCycleWith(withBoons({ income: { per: 4, until: null } }), 5, 49)).toBe(9); // bis Laufende
  });

  it("Freizug hebt die Energie, Stufe IV verdoppelt die übrige", () => {
    expect(CT.formationEnergyWith(withBoons({ energy: { plus: 2, until: null } }), 4)).toBe(6);
    expect(CT.unspentEnergyWith(withBoons({ unspentMult: 2 }), 3)).toBe(6);
  });

  it("Ablass rundet ab — die Familie zahlt keine Bruchmünze", () => {
    expect(CT.forfeitWith(withBoons({ forfeitMult: 1.5 }), 12)).toBe(18);
    expect(CT.forfeitWith(withBoons({ forfeitMult: 2.5 }), 6)).toBe(15);
    expect(CT.forfeitWith(withBoons({ forfeitMult: 1.5 }), 5)).toBe(7);   // 7,5 → 7
  });

  it("Freilos IV senkt den legendären Neuwurf auf den NORMALEN Preis, ohne sich mit Nachlass zu multiplizieren", () => {
    const s = withBoons({ legendaryRerollNormalPrice: true });
    expect(CT.rerollPriceWith(s, 60, true, 12)).toBe(12);
    // Mit Nachlass zusammen: erst der normale Grundpreis, DANN der Rabatt — nicht beides auf 60.
    const beide = withBoons({ legendaryRerollNormalPrice: true, rerollScale: 0.5 });
    expect(CT.rerollPriceWith(beide, 60, true, 12)).toBe(6);
  });

  it("Auslage und Beschau heben Zahl und Boden, nie nach unten", () => {
    expect(CT.perksOfferedWith(withBoons({ perksOffered: 4 }), 3)).toBe(4);
    expect(CT.perksOfferedWith(withBoons({ perksOffered: 4 }), 5)).toBe(5);  // ein höherer Bestand bleibt
    expect(CT.perkFloorWith(withBoons({ perkFloor: 3 }), 1)).toBe(3);
    expect(CT.perkFloorWith(withBoons({ perkFloor: 2 }), 3)).toBe(3);
  });

  it("Freibrief öffnet die dritte Tür, befristet und bis zum Laufende", () => {
    expect(CT.skillDoorsWith(withBoons({ thirdDoor: 4 }), 2, 3)).toBe(3);
    expect(CT.skillDoorsWith(withBoons({ thirdDoor: 4 }), 2, 9)).toBe(2);   // abgelaufen
    expect(CT.skillDoorsWith(withBoons({ thirdDoor: "run" }), 2, 49)).toBe(3);
  });

  it("Veredelung hebt die Stufen des Angebots und respektiert den Deckel", () => {
    const phasen = withBoons({ offerLift: { steps: 1, until: 8 } });
    expect(CT.liftSkillTiers(phasen, [0, 1, 3], 4)).toEqual([1, 2, 3]);   // 3 ist Episch, der Deckel
    expect(CT.liftSkillTiers(phasen, [0, 1, 3], 12)).toEqual([0, 1, 3]);  // abgelaufen
    // „alles unter Sehr selten steigt um eine" — Sehr selten selbst bleibt.
    expect(CT.liftSkillTiers(withBoons({ offerLiftBelow: 3 }), [0, 1, 2, 3])).toEqual([1, 2, 2, 3]);
    // Legendäre tragen keine Stufe und dürfen nicht angefasst werden.
    expect(CT.liftSkillTiers(phasen, [0, "L"], 4)).toEqual([1, "L"]);
  });

  it("Nachlass rundet ab und nie unter eine Münze — auch als Zugriff", () => {
    expect(CT.rerollPriceWith(withBoons({ rerollScale: 0.25 }), 3)).toBe(1);
    expect(CT.rerollPriceWith(withBoons({ rerollScale: 0 }), 12)).toBe(0);
  });
});

describe("Aufträge · Sofortwirkungen greifen beim Nehmen", () => {
  const base = { contractsEnabled: true, contractBoons: {}, coins: 0, cycle: 0,
    skills: ["a", "b", "c"], skillTiers: { a: 0, b: 2, c: 3 } };

  it("Lehrbrief hebt die am weitesten ausgebauten Skills zuerst und deckelt bei Episch", () => {
    const p = CT.applyLoot(base, { kind: "family", id: "lehrbrief", tier: 2, effect: { skillUp: 2, steps: 1 } });
    // c steht schon auf 3 (Episch) und ist damit nicht mehr ausbaubar → b und a steigen.
    expect(p.skillTiers).toEqual({ a: 1, b: 3, c: 3 });
  });

  it("Vollendung WÄHLT nicht selbst — sie stellt die Auswahl", () => {
    const s = { ...base, skillTiers: { a: 0, b: 2, c: 1 } };
    const p = CT.applyLoot(s, { kind: "legendary", id: "vollendung", tier: 5, effect: { skillToEpic: 1, skillUpRest: 1 } });
    expect(p.skillTiers, "Vollendung darf beim Nehmen nichts an den Stufen ändern").toBeUndefined();
    expect(p.pendingSkillPick).toEqual({ rest: 1 });
  });

  it("die getroffene Wahl macht GENAU den gewählten episch, die übrigen steigen", () => {
    const s = { ...base, skillTiers: { a: 0, b: 2, c: 1 } };
    const p = CT.applySkillPick(s, "a", 1);
    expect(p.skillTiers.a).toBe(3);   // der GEWÄHLTE, nicht der am weitesten ausgebaute
    expect(p.skillTiers.b).toBe(3);
    expect(p.skillTiers.c).toBe(2);
  });

  it("ein Skill, den der Lauf nicht hält, wird abgewiesen", () => {
    expect(CT.applySkillPick(base, "gibtsnicht", 1)).toBe(null);
  });

  it("Aufstockung hebt gebaute Gebäude, Legendäre ohne Stufe bleiben unberührt", () => {
    const s = { ...base, architect: { buildings: [{ tier: 1 }, { tier: 3 }, { tier: "legendary" }] } };
    const p = CT.applyLoot(s, { kind: "family", id: "aufstockung", tier: 1, effect: { upgradeBuildings: 1 } });
    expect(p.architect.buildings.map((b) => b.tier)).toEqual([1, 4, "legendary"]);
  });

  it("Stadtrecht nimmt dem Baufeld den Deckel", () => {
    const s = { ...base, architect: { maxCover: 24, buildings: [] } };
    const p = CT.applyLoot(s, { kind: "legendary", id: "stadtrecht", tier: 5, effect: { coverUncapped: true } });
    expect(p.architect.maxCover).toBe(Infinity);
  });
});

describe("Aufträge · legendäre Skills tragen keine Stufe", () => {
  /* Sie stehen in `state.skills` wie jeder andere, aber UPGRADE_SKILL weist sie ab. Jede Hebung der
     Beute muss sie deshalb ausdrücklich überspringen — sonst erfindet Lehrbrief für ein Legendäres
     eine Stufe, die es nicht gibt. Der Test nimmt eine ECHTE legendäre id aus dem Katalog. */
  const legendary = SKILL_LIST.map((x) => x.id).find((id) => isLegendarySkill(id));
  const normal = SKILL_LIST.map((x) => x.id).filter((id) => !isLegendarySkill(id)).slice(0, 2);

  it("der Katalog hat überhaupt ein legendäres — sonst prüft dieser Test nichts", () => {
    expect(legendary, "kein legendärer Skill im Katalog").toBeTruthy();
  });

  it("upgradableSkills lässt Legendäre draußen", () => {
    const s = { skills: [...normal, legendary], skillTiers: {} };
    expect(CT.upgradableSkills(s)).toEqual(normal);
  });

  it("Lehrbrief hebt kein legendäres, auch wenn es das einzige gehaltene ist", () => {
    const s = { contractsEnabled: true, contractBoons: {}, skills: [legendary], skillTiers: {} };
    const p = CT.applyLoot(s, { kind: "family", id: "lehrbrief", tier: 1, effect: { skillUp: 1, steps: 1 } });
    expect(p.skillTiers).toEqual({});
  });

  it("Vollendung stellt keine Auswahl, wenn nur Legendäre gehalten werden — sonst käme niemand heraus", () => {
    const s = { contractsEnabled: true, contractBoons: {}, skills: [legendary], skillTiers: {} };
    const p = CT.applyLoot(s, { kind: "legendary", id: "vollendung", tier: 5, effect: { skillToEpic: 1, skillUpRest: 1 } });
    expect(p.pendingSkillPick).toBe(null);
    expect(CT.applySkillPick(s, legendary, 1)).toBe(null);
  });
});

describe("Aufträge · Durchlass öffnet Segmentgrenzen", () => {
  const run = (boons = {}) => ({ contractsEnabled: true, contractBoons: boons, cycle: 0 });

  it("sieben innere Grenzen bei acht Segmenten — die letzte Position hat keine hinter sich", () => {
    expect(CT.BORDER_COUNT).toBe(7);
    expect(CT.ALL_BORDERS).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("Stufe I würfelt SOFORT eine Grenze, ohne Auswahl", () => {
    const p = CT.applyLoot(run(), { kind: "family", id: "durchlass", tier: 1, effect: { openBorders: 1, random: true } }, seeded(5));
    expect(p.pendingBorderPick, "Stufe I stellt keine Auswahl").toBeUndefined();
    expect(p.contractBoons.openBorders.length).toBe(1);
    expect(CT.ALL_BORDERS).toContain(p.contractBoons.openBorders[0]);
  });

  it("Stufe I würfelt nur unter den noch GESCHLOSSENEN — sonst verpufft sie", () => {
    const fast = run({ openBorders: [0, 1, 2, 3, 4, 5] });   // nur Grenze 6 ist noch zu
    const p = CT.applyLoot(fast, { kind: "family", id: "durchlass", tier: 1, effect: { openBorders: 1, random: true } }, seeded(9));
    expect(p.contractBoons.openBorders.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("ab Stufe II stellt sie eine Auswahl, mit der Anzahl der Stufe", () => {
    for (const [tier, n] of [[2, 1], [3, 2], [4, 4]]) {
      const eff = CT.LOOT_BY_ID.durchlass.effects[tier - 1];
      const p = CT.applyLoot(run(), { kind: "family", id: "durchlass", tier, effect: eff }, seeded(1));
      expect(p.pendingBorderPick, `Stufe ${tier}`).toEqual({ count: n });
      expect(p.contractBoons.openBorders, "beim Nehmen geht noch keine auf").toBeUndefined();
    }
  });

  it("die Auswahl zeigt schon offene Grenzen an und weist sie ab", () => {
    const s = run({ openBorders: [2] });
    const zeile = CT.borderPickState(s, new Set([0]));        // 0 aus einer anderen Quelle, 2 aus der Beute
    expect(zeile.filter((b) => b.open).map((b) => b.g)).toEqual([0, 2]);
    // Eine offene Grenze zu wählen darf nichts kosten und nichts tun.
    expect(CT.applyBorderPick(s, [0], new Set([0]))).toBe(null);
    expect(CT.applyBorderPick(s, [3], new Set([0])).contractBoons.openBorders.slice().sort()).toEqual([2, 3]);
  });

  it("Schleifung öffnet alle und lässt nichts mehr zu wählen", () => {
    const p = CT.applyLoot(run(), { kind: "legendary", id: "schleifung", tier: 5, effect: { openBorders: "all" } });
    expect(p.contractBoons.openBorders).toBe("all");
    expect(CT.openBordersOf({ ...run(), contractBoons: p.contractBoons }).size).toBe(7);
    expect(CT.applyBorderPick({ ...run(), contractBoons: p.contractBoons }, [1]), "nichts mehr offen zu machen").toBe(null);
  });

  it("ohne Auftragslauf sind keine Grenzen offen", () => {
    expect(CT.openBordersOf({ contractsEnabled: false, contractBoons: { openBorders: [1, 2] } })).toBe(null);
  });
});

describe("Aufträge · eine offene Grenze trägt die Formation wirklich über den Block", () => {
  /* Der wichtigste Test dieser Beute: sie ist nur etwas wert, wenn computeFormations sie LIEST.
     Aufbau: zehn gleiche Karten, also eine Wiederholung über die Grenze zwischen Position 5 und 6.
     Ohne offene Grenze endet der Lauf bei fünf, mit offener Grenze läuft er durch. */
  const deck = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, suit: "R", value: 7 }));
  const order = deck.map((_, i) => i);
  const längste = (forms) => {
    let max = 0;
    for (const p of forms) for (const f of p.formations || []) {
      if (FORMATION_TYPES.includes(f.type) && f.ordinal > max) max = f.ordinal;
    }
    return max;
  };

  it("zu: der Lauf endet am Segment; offen: er läuft weiter", () => {
    const zu = computeFormations(order, deck, {}, [], [], [], {}, null, null, null);
    expect(längste(zu), "ohne offene Grenze endet die Formation bei fünf").toBe(5);
    const offen = computeFormations(order, deck, {}, [], [], [], {}, null, null, new Set([0]));
    expect(längste(offen), "mit offener Grenze 0 läuft sie über alle zehn").toBe(10);
  });

  it("die FALSCHE Grenze hilft nicht", () => {
    const forms = computeFormations(order, deck, {}, [], [], [], {}, null, null, new Set([3]));
    expect(längste(forms)).toBe(5);
  });

  it("openBorderInfo meldet die Beute-Grenze als offen und nennt ihre Quelle", () => {
    const info = openBorderInfo(order, deck, [], {}, {}, null, new Set([1]));
    expect(info.isOpen(1)).toBe(true);
    expect(info.isOpen(0)).toBe(false);
    expect(info.active).toBe(true);
    expect(info.loot.has(1), "die Quelle bleibt unterscheidbar").toBe(true);
  });
});

describe("Aufträge · laufender Wert und Spitzenwert sind ZWEI Zahlen", () => {
  /* Im Playtest stand Sperrfeuer dauerhaft auf „1/4": die Anzeige zeigte nur das Maximum, und das
     fällt nie. Der laufende Wert muss jeden Durchlauf neu hochzählen und bei Nichterreichen wieder
     auf null gehen (Owner, 2026-09-15). */
  const sperrfeuer = { taskId: "sperrfeuer", step: "sehrschwer", rung: 5, target: 5 };

  it("Sperrfeuer: laufend zählt je Durchlauf hoch, die Spitze bleibt stehen", () => {
    const state = (tally) => ({ contractsEnabled: true, contractTally: tally, formations: [] });
    // Zwei volle Segmente im laufenden Durchlauf, drei war der beste bisher.
    const s = state({ ...CT.emptyTally(), segments: 2, bestSegments: 3 });
    expect(CT.readLive(s, sperrfeuer), "laufend").toBe(2);
    expect(CT.readBest(s, sperrfeuer), "Spitze").toBe(3);

    // Durchlaufwechsel: der laufende Wert fällt auf null, die Spitze nicht.
    const nach = CT.tallyCycleEnd(s.contractTally, { cycleWins: 0, formations: [] });
    expect(nach.segments, "laufend zurück auf 0").toBe(0);
    expect(nach.bestSegments, "die Spitze bleibt").toBe(3);
  });

  it("erfüllt wird über die SPITZE, nicht über den laufenden Wert", () => {
    const s = { contractsEnabled: true, formations: [], contractTally: { ...CT.emptyTally(), segments: 0, bestSegments: 5 } };
    expect(CT.readLive(s, sperrfeuer)).toBe(0);
    expect(CT.isFulfilled(s, sperrfeuer), "einmal erreicht bleibt erreicht").toBe(true);
  });

  it("nur Spitzen-Zähler brauchen zwei Zahlen", () => {
    expect(CT.hasPeak({ taskId: "sperrfeuer" })).toBe(true);
    expect(CT.hasPeak({ taskId: "durchmarsch" })).toBe(true);
    expect(CT.hasPeak({ taskId: "fussvolk" }), "Summe läuft nie zurück").toBe(false);
    expect(CT.hasPeak({ taskId: "saeckel" }), "Zustand auch nicht").toBe(false);
  });

  it("bei Summe und Zustand sind beide Zahlen gleich", () => {
    const s = { contractsEnabled: true, coins: 77, formations: [], contractTally: { ...CT.emptyTally(), lowWins: 12 } };
    for (const c of [{ taskId: "saeckel" }, { taskId: "fussvolk" }]) {
      expect(CT.readLive(s, c)).toBe(CT.readBest(s, c));
    }
  });
});

describe("Aufträge · der Aufgabentext nennt den gewürfelten Parameter", () => {
  /* Die Kachel zeigt nur „Reinheit 1/4". Welcher FORMATIONSTYP gewürfelt wurde, steht allein im
     Aufgabentext — ohne ihn fehlt die halbe Aufgabe. Genau das ist im Playtest aufgefallen
     (Owner, 2026-09-15), deshalb hängt hier ein Wächter: wer einen Parameter würfelt, muss ihn im
     Satz auch einsetzen, und wer keinen würfelt, darf keinen Platzhalter tragen. */
  /* ALLE Sätze, die eine Aufgabe zeigen kann: der Grundtext (oder seine Pluralformen, wo die Stufe
     die Zahl beugt) plus die Sätze der Stufen, die den Zähler wechseln. Ein Wächter, der nur
     `.text` liest, übersieht seit dem Umbau auf drei Stufen die Hälfte davon. */
  const saetzeVon = (task) => {
    const keys = [];
    const sammle = (base) => {
      if (de[base]) keys.push(base);
      for (const suf of ["_one", "_other"]) if (de[base + suf]) keys.push(base + suf);
    };
    sammle(`contract.task.${task.id}.text`);
    for (const m of Object.values(task.measure || {})) sammle(`contract.task.${task.id}.${m}`);
    return keys.map((k) => [k, de[k]]);
  };

  it("jede Aufgabe hat mindestens einen Satz, und jede Stufe findet ihren", () => {
    for (const task of CT.TASKS) {
      expect(saetzeVon(task).length, `Text fehlt: ${task.id}`).toBeGreaterThan(0);
      for (const step of CT.stepsOf(task.id)) {
        const m = CT.measureFor(task.id, step);
        const base = `contract.task.${task.id}.${m === task.id ? "text" : m}`;
        const da = de[base] || de[`${base}_one`] || de[`${base}_other`];
        expect(da, `${task.id}/${step}: kein Satz unter ${base}`).toBeTruthy();
      }
    }
  });

  it("genau die Aufgaben mit `variants` tragen {variant} im deutschen Text", () => {
    for (const task of CT.TASKS) {
      for (const [key, text] of saetzeVon(task)) {
        expect(text.includes("{variant}"), `${key}: {variant} im Text`).toBe(!!task.variants);
      }
    }
  });

  it("jede Zusatzbedingung im Katalog hat ihren Satz", () => {
    const alle = [];
    for (const task of CT.TASKS) {
      for (const step of CT.stepsOf(task.id)) {
        alle.push(CT.extraFor(task.id, step));
        for (const v of task.variants || []) alle.push(CT.extraFor(task.id, step, v.id));
      }
    }
    const mit = alle.filter(Boolean);
    expect(mit.length, "der Katalog trägt Zusatzbedingungen").toBeGreaterThan(0);
    for (const e of mit) {
      const key = e.noSuitStreak != null ? "contract.extra.noSuitStreak"
        : e.positions >= 40 ? "contract.extra.allPositions" : "contract.extra.positions_other";
      expect(de[key], `fehlender Satz: ${key}`).toBeTruthy();
    }
  });

  it("jede gewürfelte Variante hat einen übersetzten Namen", () => {
    for (const task of CT.TASKS) {
      for (const v of task.variants || []) {
        const key = `contract.${task.variantKey === "category" ? "category" : "formation"}.${v.id}`;
        expect(de[key], `fehlender Name: ${key}`).toBeTruthy();
      }
    }
  });

  it("kein Aufgabentext behauptet „in einer Aufstellung\" — die Aufstellung steht über den ganzen Lauf", () => {
    /* Sie wird je Aufstellphase verfeinert, nicht neu gebaut. Der Zusatz las sich wie ein Sprint in
       einer Phase (Owner, 2026-09-15). */
    for (const task of CT.TASKS) {
      for (const [key, text] of saetzeVon(task)) expect(text, key).not.toContain("in einer Aufstellung");
    }
  });

  it("jeder Satz nennt seine Schwelle — als {n} oder, wo die Leiter Farben zählt, als {streak}", () => {
    /* Farbtreue auf Leicht sagt „eine Farbe" nicht, sie meint es: dort ist die Serienlänge die
       Schwelle. Der Wächter verlangt deshalb EINE Zahl im Satz, nicht ausgerechnet {n}. */
    for (const task of CT.TASKS) {
      for (const [key, text] of saetzeVon(task)) {
        expect(text.includes("{n}") || text.includes("{streak}"), `${key}: keine Zahl im Satz`).toBe(true);
      }
    }
  });
});

describe("Aufträge · gegen Wiederholung (§3.6)", () => {
  it("Regel 1: gewürfelte Parameter machen aus 14 Definitionen 17 Angebote und 50 Karten", () => {
    const distinct = CT.TASKS.reduce((n, t) => n + (t.variants ? t.variants.length : 1), 0);
    expect(CT.TASKS.length).toBe(14);
    // Seit 2026-09-16 würfelt nur noch Reinheit einen Parameter — Quartier lässt den Spieler wählen.
    expect(distinct, "Reinheit würfelt vier Typen, sonst niemand").toBe(17);
    /* Nicht distinct × Stufen: Langbau bietet nur zwei der drei an, also 16 × 3 + 2. */
    const karten = CT.TASKS.reduce((n, t) =>
      n + (t.variants ? t.variants.length : 1) * CT.stepsOf(t.id).length, 0);
    expect(karten).toBe(50);
  });

  it("Regel 1: Farbtreue würfelt KEINE Farbe — die Serie zählt, egal in welcher", () => {
    expect(CT.TASK_BY_ID.farbtreue.variants).toBeUndefined();
  });

  it("Regel 2: ALLE drei Aufsteller sind verbraucht, nicht nur der angenommene", () => {
    /* Sonst zeigt Fenster 2 genau die zwei, die man eben hat verfallen lassen — und „kein Angebot
       zweimal in einem Lauf" wäre nur für den angenommenen wahr. */
    const s = reducer(undefined, { type: "START_RUN", rng: seeded(11), architect: true, seed: 3, contracts: true });
    const gezeigt = s.contracts.offers.map((o) => o.taskId);
    expect(s.contracts.usedTasks.slice().sort()).toEqual(gezeigt.slice().sort());
    const nach = reducer(s, { type: "PICK_CONTRACT", taskId: gezeigt[0], step: s.contracts.offers[0].step });
    expect(nach.contracts.usedTasks.slice().sort(), "annehmen ändert die Sperre nicht").toEqual(gezeigt.slice().sort());
  });

  it("Regel 2: der Pool trägt die zweite Runde — 15 minus 3 lässt genug übrig", () => {
    expect(CT.TASKS.length - CT.OFFERS_PER_WINDOW).toBeGreaterThanOrEqual(CT.OFFERS_PER_WINDOW);
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

  it("Vollendung führt über den Reducer zur Auswahl und dann zur Wirkung", () => {
    const s = start({ contracts: true });
    const piece = { kind: "legendary", id: "vollendung", tier: 5, effect: { skillToEpic: 1, skillUpRest: 1 } };
    const armed = { ...s, skills: ["s1", "s2"], skillTiers: { s1: 0, s2: 1 },
      contracts: { ...s.contracts, pendingLoot: [piece] } };
    const chosen = reducer(armed, { type: "PICK_LOOT", lootId: "vollendung", tier: 5 });
    expect(chosen.contracts.pendingSkillPick).toEqual({ rest: 1 });
    expect(chosen.skillTiers, "beim Nehmen ändert sich noch nichts").toEqual({ s1: 0, s2: 1 });
    const done = reducer(chosen, { type: "PICK_CONTRACT_SKILL", skillId: "s1" });
    expect(done.skillTiers).toEqual({ s1: 3, s2: 2 });
    expect(done.contracts.pendingSkillPick).toBe(null);
  });

  it("die Skill-Wahl tut im normalen Lauf NICHTS", () => {
    const s = start();
    expect(reducer(s, { type: "PICK_CONTRACT_SKILL", skillId: "s1" })).toBe(s);
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

describe("Aufträge · die vier neuen Maße (2026-09-16)", () => {
  const trick2 = (p, o, result = "win") => ({ result, pValue: p, oValue: o, pCard: { suit: "R", value: p } });

  it("Durchmarsch schwer zählt SERIEN makelloser Durchläufe, ein Fehler setzt zurück", () => {
    const c = { taskId: "durchmarsch", step: "schwer", rung: 5, target: 5 };
    expect(CT.measureFor("durchmarsch", "schwer"), "eigener Zähler").toBe("perfectRun");
    expect(CT.measureFor("durchmarsch", "leicht"), "sonst der alte").toBe("durchmarsch");
    let t = CT.emptyTally();
    const alle = C.BOARD_POSITIONS;
    t = CT.tallyCycleEnd(t, { cycleWins: alle, formations: [] }, c);
    t = CT.tallyCycleEnd(t, { cycleWins: alle, formations: [] }, c);
    expect(t.perfectRun, "zwei makellose in Folge").toBe(2);
    t = CT.tallyCycleEnd(t, { cycleWins: alle - 1, formations: [] }, c);
    expect(t.perfectRun, "ein verlorener Stich kippt die Serie").toBe(0);
    expect(t.bestPerfectRun, "die Spitze bleibt").toBe(2);
    expect(CT.readBest({ contractsEnabled: true, contractTally: t, formations: [] }, c)).toBe(2);
  });

  it("Farbtreue zählt FARBEN, die die Serie geschafft haben — nicht die Serienlänge", () => {
    const c = { taskId: "farbtreue", step: "mittel", rung: 2, target: 2 };
    expect(CT.streakOf(c)).toBe(10);
    let t = CT.emptyTally();
    const serie = (suit, n, ab) => {
      for (let i = 0; i < n; i++) t = CT.tallyTrick(t, { result: "win", pValue: 5, pCard: { suit, value: 5 } }, { trickNo: ab + i });
    };
    serie("R", 10, 1);
    const s = () => ({ contractsEnabled: true, contractTally: t, formations: [] });
    expect(CT.readLive(s(), c), "eine Farbe durch").toBe(1);
    serie("B", 9, 21);
    expect(CT.readLive(s(), c), "neun reichen nicht").toBe(1);
    serie("G", 10, 41);
    expect(CT.readLive(s(), c), "zweite Farbe durch").toBe(2);
    expect(CT.isFulfilled(s(), c)).toBe(true);
  });

  it("Aufmarsch misst den ECHTEN Kampfwert-Vorsprung, samt Brand auf der Gegnerkarte", () => {
    /* Der Playtest-Befund: gemessen wurde Kartenwert, also fielen Brand, Glühende Klinge und
       Gebäude-Stichwert unter den Tisch. pValue/oValue tragen sie alle. */
    const c = { taskId: "aufmarsch", step: "leicht", rung: 60, target: 60 };
    let t = CT.emptyTally();
    for (let i = 1; i <= 4; i++) t = CT.tallyTrick(t, trick2(20, 5), { trickNo: i });   // 15 Vorsprung je Stich
    expect(t.cycleMargin).toBe(60);
    const s = { contractsEnabled: true, contractTally: t, formations: [] };
    expect(CT.readLive(s, c)).toBe(60);
    expect(CT.isFulfilled(s, c)).toBe(true);
    // Durchlaufwechsel: der laufende Wert fällt, die Spitze bleibt.
    const nach = CT.tallyCycleEnd(t, { cycleWins: 0, formations: [] }, c);
    expect(nach.cycleMargin).toBe(0);
    expect(nach.bestMargin).toBe(60);
    expect(CT.readBest({ ...s, contractTally: nach }, c)).toBe(60);
  });

  it("Quartier zählt 21 Reihen — waagerecht, senkrecht UND diagonal", () => {
    expect(CT.BUILD_LINES.length, "8 Zeilen + 5 Spalten + 8 Diagonalen").toBe(21);
    const laengen = CT.BUILD_LINES.map((l) => l.length).sort((a, b) => a - b);
    expect(laengen.filter((n) => n === 5).length, "Zeilen und Diagonalen").toBe(16);
    expect(laengen.filter((n) => n === 8).length, "Spalten").toBe(5);
    for (const line of CT.BUILD_LINES) expect(new Set(line).size, "keine Zelle doppelt").toBe(line.length);

    // Eine volle SPALTE zählt jetzt — vorher zählten nur Zeilen.
    const spalte = CT.BUILD_LINES.find((l) => l.length === 8);
    const bau = (footprint, familyId = "A_STUETZE") => ({ architectEnabled: true, formations: [],
      architect: { buildings: [{ familyId, footprint }] } });
    const c = { taskId: "quartier", step: "leicht", rung: 1, target: 1 };
    expect(CT.readLive(bau(spalte), c), "volle Spalte").toBe(1);
    expect(CT.readLive(bau(spalte.slice(0, 7)), c), "eine Zelle fehlt").toBe(0);
  });

  it("Quartier gibt keine Kategorie mehr vor — gezählt wird die beste (Owner, 2026-09-16)", () => {
    /* Vorher würfelte der Aufsteller die Kategorie, und zwei der drei erreichten gemessen nie mehr
       als eine volle Reihe. Jetzt zählt, welche Kategorie der Spieler selbst voll bekommt. */
    expect(CT.TASK_BY_ID.quartier.variants, "kein Wurf mehr").toBeUndefined();
    expect(CT.TASK_BY_ID.quartier.variantKey).toBeUndefined();
    const c = { taskId: "quartier", step: "leicht", rung: 1, target: 1 };
    const zeile = CT.BUILD_LINES[0];
    // A_STUETZE ist Kategorie „value" — dieselbe Reihe zählt, ohne dass der Auftrag sie nennt.
    const gebaut = { architectEnabled: true, formations: [],
      architect: { buildings: [{ familyId: "A_STUETZE", footprint: zeile }] } };
    expect(CT.readLive(gebaut, c)).toBe(1);
    // Und der Aufgabentext nennt keinen Parameter mehr.
    expect(de["contract.task.quartier.text"]).not.toContain("{variant}");
  });
});

describe("Aufträge · die Stufenfarben sind Bronze, Silber, Gold (2026-09-16)", () => {
  /* Die Stufe meint die ARBEIT, die Rarität die BEZAHLUNG. Bis 2026-09-16 trugen beide dieselben
     Farben; jetzt hat die Stufe eine eigene Leiter. Der Wächter hält zwei Dinge fest: die drei sind
     unterscheidbar, und Gold ist DAS Gold des Spiels und kein zweiter Ton daneben. */
  it("drei Stufen, drei verschiedene Farben, alle aus dem gemeinsamen Vokabular", () => {
    const farben = CT.STEPS.map(stepColor);
    expect(new Set(farben).size, "keine Stufe teilt ihre Farbe").toBe(3);
    expect(farben).toEqual([STEP_BRONZE, STEP_SILVER, STEP_GOLD]);
  });

  it("das Gold der schweren Stufe ist das EINE Gold, kein zweiter Ton", () => {
    expect(STEP_GOLD).toBe(LEGENDARY_GOLD);
  });

  it("die Stufenfarbe ist von der Beutefarbe getrennt", () => {
    // Sonst wäre die Trennung nur behauptet: Mittel zahlt Selten, darf aber nicht so aussehen.
    expect(stepColor("mittel")).not.toBe(tierColor(CT.STEP_TIER.mittel));
    expect(stepColor("leicht")).not.toBe(tierColor(CT.STEP_TIER.leicht));
  });
});

describe("Aufträge · Gedränge zählt Formationen je Position (Owner, 2026-09-22)", () => {
  const brett = (belegung) => Array.from({ length: C.BOARD_POSITIONS }, (_, i) => ({
    formations: (belegung[i] || []).map((type, k) => ({ type, ordinal: k + 1 })),
  }));
  const c = { taskId: "gedraenge", step: "leicht", rung: 40, target: 40, extra: null };

  it("die Leiter ist 40 · 50 · 70 auf dem Paar-Maß, ohne Zusatz auf Schwer", () => {
    expect(CT.TASK_BY_ID.gedraenge.rungs).toEqual([40, 50, 70]);
    // Das Paar-Maß misst die Dichte selbst: jede Position in zwei Formationen wären schon 80 Paare.
    for (const step of CT.STEPS) expect(CT.extraFor("gedraenge", step), step).toBe(null);
  });

  it("eine Position in drei Formationen zählt drei; Kerne, Anker und Architekt zählen nicht", () => {
    const forms = brett({ 0: ["farbblock", "treppe", "wechsel"], 1: ["farbblock"], 2: ["formationskern", "architekt"] });
    expect(CT.formationPairs(forms)).toBe(4);
    expect(CT.readLive({ contractsEnabled: true, formations: forms, contractTally: CT.emptyTally() }, c)).toBe(4);
    expect(CT.formationPairs([])).toBe(0);
    expect(CT.formationPairs(null)).toBe(0);
  });

  it("segmentunabhängig: ein Lauf über die Grenze zählt so viel wie die zwei, die er verschmilzt", () => {
    /* Zehn Positionen in EINEM Farbblock (Grenze offen) gegen zweimal fünf (Grenze zu). Distinkt
       ist das 1 gegen 2 — genau der Nachteil, den offene Grenzen dem alten Maß eintrugen. Paare
       sind es 10 gegen 10. */
    const lang = Array.from({ length: C.BOARD_POSITIONS }, (_, i) => ({
      formations: i < 10 ? [{ type: "farbblock", ordinal: i + 1 }] : [] }));
    const kurz = Array.from({ length: C.BOARD_POSITIONS }, (_, i) => ({
      formations: i < 10 ? [{ type: "farbblock", ordinal: (i % 5) + 1 }] : [] }));
    expect(countBuiltFormations(lang)).toBe(1);
    expect(countBuiltFormations(kurz)).toBe(2);
    expect(CT.formationPairs(lang)).toBe(10);
    expect(CT.formationPairs(kurz)).toBe(10);
  });

  it("die Spitze friert die Paare am Durchlaufende ein", () => {
    const forms = brett(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i, ["farbblock", "treppe"]])));
    const state = { contractsEnabled: true, formations: forms, contractTally: CT.emptyTally() };
    expect(CT.readLive(state, c)).toBe(40);
    const t = CT.tallyCycleEnd(state.contractTally, state, c);
    expect(t.bestForms).toBe(40);
    // Die nächste Aufstellung ist leer, der Bestwert bleibt und erfüllt Leicht.
    expect(CT.readBest({ ...state, formations: [], contractTally: t }, c)).toBe(40);
  });
});

describe("Aufträge · die Zusatzbedingung der schweren Stufe", () => {
  const formen = (n, tiefe) => Array.from({ length: C.BOARD_POSITIONS }, (_, i) => ({
    formations: i < n ? Array.from({ length: tiefe }, (_, k) => ({ type: "farbblock", ordinal: k + 1 })) : [],
  }));

  it("ein Durchlauf ohne die Zusatzbedingung zählt nicht, auch wenn der Hauptzähler steht", () => {
    const c = { taskId: "reinheit", variantId: "farbblock", step: "schwer", rung: 40, target: 40,
      extra: CT.extraFor("reinheit", "schwer", "farbblock") };
    expect(c.extra).toEqual({ positions: 40, min: 2 });
    // Alle 40 Positionen, aber nur EINE Formation je Position → Zusatz hält nicht.
    const duenn = { contractsEnabled: true, formations: formen(40, 1), contractTally: CT.emptyTally() };
    expect(CT.extraHolds(duenn, c), "eine Formation je Position reicht nicht").toBe(false);
    const nach = CT.tallyCycleEnd(duenn.contractTally, duenn, c);
    expect(nach.bestGated, "der Durchlauf wird nicht gezählt").toBe(0);
    expect(CT.readBest({ ...duenn, contractTally: nach }, c), "und gilt auch nicht als erfüllt").toBe(0);

    // Dasselbe Brett mit zwei Formationen je Position → Zusatz hält, der Durchlauf zählt.
    const dicht = { contractsEnabled: true, formations: formen(40, 2), contractTally: CT.emptyTally() };
    expect(CT.extraHolds(dicht, c)).toBe(true);
    const gut = CT.tallyCycleEnd(dicht.contractTally, dicht, c);
    expect(gut.bestGated).toBeGreaterThan(0);
  });

  it("Buntspiels Zusatz VERBIETET etwas: keine Farbserie länger als drei", () => {
    const c = { taskId: "buntspiel", step: "schwer", rung: 8, target: 8,
      extra: CT.extraFor("buntspiel", "schwer") };
    expect(c.extra).toEqual({ noSuitStreak: 3 });
    const leer = { contractsEnabled: true, formations: [] };
    expect(CT.extraHolds(leer, c, 3), "drei sind erlaubt").toBe(true);
    expect(CT.extraHolds(leer, c, 4), "vier nicht mehr").toBe(false);
  });

  it("die Zusatzbedingung steht am Angebot, nicht erst im laufenden Auftrag", () => {
    let gesehen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const o of CT.rollOffers(seeded(seed))) {
        expect(o.extra || null, `${o.taskId}/${o.step}`).toEqual(CT.extraFor(o.taskId, o.step, o.variantId));
        if (o.extra) gesehen += 1;
      }
    }
    expect(gesehen, "in 60 Auslagen taucht mindestens eine auf").toBeGreaterThan(0);
  });

  it("Langbau wird nie auf Leicht ausgelegt", () => {
    for (let seed = 1; seed <= 120; seed++) {
      for (const o of CT.rollOffers(seeded(seed))) {
        expect(CT.offersStep(o.taskId, o.step), `${o.taskId} darf ${o.step} nicht`).toBe(true);
        expect(o.rung, `${o.taskId}/${o.step} ohne Sprosse`).not.toBe(null);
      }
    }
  });
});

describe("Aufträge · abgerechnet wird erst am Fensterende (§3.7)", () => {
  /* Owner, 2026-09-15 („Lesart A"): die Beute kommt nach der letzten Runde des Fensters, nicht in
     dem Moment, in dem der Zähler die Schwelle reißt. Vorher zahlte eine früh erfüllte leichte
     Aufgabe fast das ganze Fenster mit, eine spät erfüllte schwere nur ein paar Runden.

     Geprüft an echten Läufen, nicht an einem gestellten Zustand: der Treiber beantwortet zusätzlich
     die vier Auftrags-Overlays — sie hängen nicht an `phase`, die Policy sieht sie also gar nicht.
     Er nimmt bewusst die LEICHTESTE der drei Aufgaben, damit früh erfüllt wird und die Verzögerung
     überhaupt messbar ist. */
  const ENDEN = CT.WINDOWS.map((w) => w.to);   // 16 und 32

  function auftragslauf(seed) {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, architect: true, contracts: true });
    const beuteBei = [];        // Durchläufe, in denen Beute auflag
    const erfuelltOhne = new Set(); // Durchläufe, in denen erfüllt war und trotzdem nichts kam
    let guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error(`kein Fortschritt (seed ${seed}, phase ${s.phase})`);
      const c = s.contracts || {};
      if ((c.pendingLoot || []).length) {
        beuteBei.push(s.cycle);
        const p = c.pendingLoot[0];
        s = reducer(s, { type: "PICK_LOOT", lootId: p.id, tier: p.tier, rng });
        continue;
      }
      if (c.pendingBorderPick) { s = reducer(s, { type: "PICK_CONTRACT_BORDER", borders: CT.ALL_BORDERS }); continue; }
      if (c.pendingSkillPick) { s = reducer(s, { type: "PICK_CONTRACT_SKILL", skillId: CT.upgradableSkills(s)[0] }); continue; }
      if ((c.offers || []).length) {
        const o = c.offers.find((x) => x.step === "leicht") || c.offers[0];
        s = reducer(s, { type: "PICK_CONTRACT", taskId: o.taskId, step: o.step });
        continue;
      }
      if (c.active && CT.isFulfilled(s, c.active)) erfuelltOhne.add(s.cycle);
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return { beuteBei, erfuelltOhne: [...erfuelltOhne].sort((a, b) => a - b) };
  }

  it("Beute liegt NIE mitten im Fenster auf — nur nach D16 und nach D32", () => {
    for (const seed of [1, 2]) {
      const { beuteBei } = auftragslauf(seed);
      for (const d of beuteBei) expect(ENDEN, `seed ${seed}: Auszahlung im Durchlauf ${d}`).toContain(d);
    }
  }, 30_000);

  it("ein früh erfüllter Auftrag läuft weiter und wartet auf das Fensterende", () => {
    // Seed 1 erfüllt im ERSTEN Durchlauf und wird trotzdem erst nach D16 bezahlt.
    const { beuteBei, erfuelltOhne } = auftragslauf(1);
    expect(erfuelltOhne.length, "erfüllt, aber noch nicht bezahlt").toBeGreaterThan(0);
    expect(beuteBei, "genau eine Auszahlung, am Fensterende").toEqual([16]);
    expect(Math.max(...erfuelltOhne), "die Wartezeit reicht bis an die Grenze").toBe(15);
  }, 30_000);
});

describe("Aufträge · Nachlass wirkt auch am KNOPF, nicht nur im Reducer (2026-09-17)", () => {
  /* Playtest-Befund: der legendäre Neuwurf stand auf 30, obwohl Nachlass III ihn auf ein Viertel
     senkt. Ursache war nicht die Beute, sondern zwei Rechenwege: der Reducer legte `rerollPriceWith`
     über den Preis, der Knopf rief `coins.rerollOffer` roh. Damit sah der Spieler den vollen Preis
     UND konnte den Wurf nicht auslösen, weil `can` gegen den vollen Preis prüfte — Nachlass war für
     ALLE Neuwürfe wirkungslos, nicht nur für legendäre. */
  const mitNachlass = (scale, coins) => ({ contractsEnabled: true, coins, coinRerolls: 0,
    contractBoons: { rerollScale: scale }, offerRerolls: 0 });

  it("der normale Neuwurf wird billiger — und zwar sichtbar", () => {
    const roh = rerollOffer({ coins: 100, coinRerolls: 0 }, 0, false);
    const mit = CT.rerollOfferWith(mitNachlass(0.25, 100), 0, false);
    expect(mit.nextPrice, "ein Viertel, abgerundet, nie unter 1").toBe(Math.max(1, Math.floor(roh.nextPrice * 0.25)));
    expect(mit.price).toBe(mit.nextPrice);
  });

  it("der LEGENDÄRE Neuwurf ebenso — genau der Fall aus dem Playtest", () => {
    const roh = rerollOffer({ coins: 24, coinRerolls: 1 }, 0, true);
    expect(roh.nextPrice, "ungesenkt 30, und mit 24 Münzen nicht bezahlbar").toBe(30);
    expect(roh.can).toBe(false);
    const mit = CT.rerollOfferWith({ ...mitNachlass(0.25, 24), coinRerolls: 1 }, 0, true);
    expect(mit.nextPrice).toBe(7);
    expect(mit.can, "mit 24 Münzen jetzt bezahlbar").toBe(true);
  });

  it("Knopf und Reducer nehmen denselben Preis", () => {
    const s = { ...mitNachlass(0.5, 200), coinRerolls: 2 };
    for (const leg of [false, true]) {
      const knopf = CT.rerollOfferWith(s, 0, leg).nextPrice;
      const reducer = CT.rerollPriceWith(s, rerollPrice(s.coinRerolls, leg), leg, rerollPrice(s.coinRerolls, false));
      expect(knopf, `legendary=${leg}`).toBe(reducer);
    }
  });

  it("gratis bleibt gratis, gedeckelt bleibt gedeckelt", () => {
    expect(CT.rerollOfferWith(mitNachlass(0.25, 100), 2, false).price, "Gratis-Wurf kostet nichts").toBe(0);
    const voll = { ...mitNachlass(0.25, 100), offerRerolls: REROLL_CAP };
    expect(CT.rerollOfferWith(voll, 0, false).capped, "der Deckel steht vor dem Preis").toBe(true);
  });

  it("ohne Auftragslauf ändert sich gar nichts", () => {
    const s = { coins: 100, coinRerolls: 1, offerRerolls: 0 };
    expect(CT.rerollOfferWith(s, 0, true)).toEqual(rerollOffer(s, 0, true));
  });

  it("KEINE Anzeigestelle rechnet den Neuwurf-Preis an der Tür vorbei", () => {
    /* Der eigentliche Wächter. Die Zahlen oben halten nur, solange die UI durch `rerollOfferWith`
       geht — der Fehler entstand ja nicht in der Rechnung, sondern daran, dass eine Datei die
       ungesenkte nahm. Gesucht wird der IMPORT, nicht ein Vorkommen im Text, damit der Wächter
       nicht auf dem Kommentar anschlägt, der ihn begründet. */
    const uiDir = fileURLToPath(new URL("../src/ui/", import.meta.url));
    const walk = (dir) => readdirSync(dir).flatMap((f) => {
      const p = `${dir}/${f}`;
      return statSync(p).isDirectory() ? walk(p) : (/\.jsx?$/.test(f) ? [p] : []);
    });
    const suender = walk(uiDir).filter((p) => {
      const src = readFileSync(p, "utf8");
      return /import\s*\{[^}]*\brerollOffer\b[^}]*\}\s*from\s*["'][^"']*coins\.js["']/.test(src);
    });
    expect(suender, `rerollOffer statt rerollOfferWith: ${suender.join(", ")}`).toEqual([]);
  });
});

describe("Aufträge · die genommene Beute ist im Lauf nachlesbar (2026-09-17)", () => {
  /* Man sah ein Stück einmal beim Nehmen und danach nie wieder, obwohl es weiterwirkt. Der Bestand
     merkt sich nur `{ id, tier }` — Name und Wirkung müssen sich daraus lesen lassen, sonst zeigt
     die Leiste leere Schlüssel. */
  it("Name und Wirkung lesen sich aus dem Bestand, auch beim Legendären", () => {
    for (const fam of CT.LOOT_FAMILIES) {
      for (let tier = 1; tier <= 4; tier++) {
        const eintrag = { id: fam.id, tier };            // genau die Form aus contracts.taken
        expect(lootName(eintrag), `${fam.id}@${tier} Name`).toBeTruthy();
        expect(lootName(eintrag)).not.toContain("contract.");
        expect(lootText(eintrag), `${fam.id}@${tier} Text`).toBeTruthy();
        expect(lootText(eintrag)).not.toContain("contract.");
      }
    }
    for (const leg of CT.LEGENDARIES) {
      const eintrag = { id: leg.id, tier: CT.TIER_LEGENDARY };
      expect(lootName(eintrag), `${leg.id} Name`).not.toContain("contract.");
      expect(lootText(eintrag), `${leg.id} Text`).not.toContain("contract.");
    }
  });

  it("PICK_LOOT schreibt genau diese Form in den Bestand", () => {
    const s = reducer(undefined, { type: "START_RUN", rng: seeded(42), architect: true, seed: 7, contracts: true });
    const stueck = CT.rollLoot(seeded(3), "leicht")[0];
    const armed = { ...s, contracts: { ...s.contracts, pendingLoot: [stueck] } };
    const nach = reducer(armed, { type: "PICK_LOOT", lootId: stueck.id, tier: stueck.tier });
    expect(nach.contracts.taken).toEqual([{ id: stueck.id, tier: stueck.tier }]);
    expect(lootName(nach.contracts.taken[0])).toBe(lootName(stueck));
    expect(lootText(nach.contracts.taken[0])).toBe(lootText(stueck));
  });
});

describe("Aufträge · jede Aufgabe fängt bei null an (2026-09-17)", () => {
  /* Playtest-Befund: Fußvolk stand bei D17 schon auf 113 von 200, ohne einen Stich dafür. Die
     Strichliste lief über den ganzen Lauf weiter, also erbte Fenster 2 das Ergebnis von Fenster 1. */
  it("PICK_CONTRACT leert die Strichliste", () => {
    const s = reducer(undefined, { type: "START_RUN", rng: seeded(11), architect: true, seed: 3, contracts: true });
    const voll = { ...s, contractTally: { ...CT.emptyTally(), lowWins: 113, overThreshold: 40, bestSegments: 4 } };
    const o = voll.contracts.offers[0];
    const nach = reducer(voll, { type: "PICK_CONTRACT", taskId: o.taskId, step: o.step });
    expect(nach.contractTally).toEqual(CT.emptyTally());
    expect(CT.readLive(nach, { taskId: "fussvolk", step: "schwer" }), "Fußvolk bei null").toBe(0);
  });
});

describe("Aufträge · ein erfüllter Auftrag fällt in der Anzeige nicht zurück (2026-09-17)", () => {
  /* Buntspiel zeigte im nächsten Durchlauf wieder „2/7 best 7". Die 2 liest sich wie ein Rückschritt,
     obwohl nichts mehr zu tun ist — bis zur Auszahlung steht jetzt 7/7. */
  const s = (segments, best) => ({ contractsEnabled: true, formations: [], cycle: 4,
    contractTally: { ...CT.emptyTally(), segments, bestSegments: best },
    contracts: { active: { taskId: "sperrfeuer", step: "leicht", rung: 3, target: 3, windowId: 1 } } });

  it("erfüllt zeigt den erfüllenden Wert, nicht den laufenden", () => {
    const r = contractReadout(s(1, 3));
    expect(r.done).toBe(true);
    expect(r.live, "3/3 statt 1/3").toBe(3);
    expect(r.peak, "und keine zweite Zahl mehr daneben").toBe(false);
  });

  it("unerfüllt zeigt weiter beide Zahlen", () => {
    const r = contractReadout(s(1, 2));
    expect(r.done).toBe(false);
    expect(r.live).toBe(1);
    expect(r.peak).toBe(true);
  });
});

describe("Aufträge · JEDES der 61 Beutestücke wirkt messbar (Audit 2026-09-17)", () => {
  /* Der Wächter, den es früher hätte geben müssen. Bis hierher stand im Dokument „die Beute wirkt
     vollständig, jede Wirkung hat ihre Lesestelle" — geprüft war aber nur, dass der SCHLÜSSEL
     geschrieben wird. Veredelung schrieb ihn und wirkte trotzdem nie, weil die Türen ihre Stufen als
     Objekt halten und der Heber auf `Array.isArray` prüfte. Hier läuft jedes Stück durch den echten
     `PICK_LOOT` und wird an der Stelle nachgemessen, an der es wirken soll. */
  const doors = [{ skills: ["SK_FIRE_01"], tiers: { SK_FIRE_01: 0 } }];  // die Form, die das Spiel baut
  const basis = () => {
    const s = reducer(undefined, { type: "START_RUN", rng: seeded(7), architect: true, seed: 3, contracts: true });
    return { ...s, contractsEnabled: true, contractBoons: {}, coins: 500, cycle: 8,
      skills: ["SK_FIRE_01"], skillTiers: { SK_FIRE_01: 0 },
      architectEnabled: true,
      architect: { ...(s.architect || {}), maxCover: 24,
        buildings: [{ familyId: "A_STUETZE", tier: 1, footprint: [0, 1] }] },
      contracts: { ...(s.contracts || {}), pendingLoot: null, pendingSkillPick: null, pendingBorderPick: null, taken: [] } };
  };

  // Je Effekt-Schlüssel die Messung: [nachher, vorher] — nachher MUSS größer sein.
  const MESSER = {
    coins: (a, b) => [b.coins, a.coins],
    income: (a, b) => [CT.coinsPerCycleWith(b, 5, 8), CT.coinsPerCycleWith(a, 5, 8)],
    forfeitMult: (a, b) => [CT.forfeitWith(b, 12), CT.forfeitWith(a, 12)],
    energy: (a, b) => [CT.formationEnergyWith(b, 4, 8), CT.formationEnergyWith(a, 4, 8)],
    unspentMult: (a, b) => [CT.unspentEnergyWith(b, 3), CT.unspentEnergyWith(a, 3)],
    openBorders: (a, b) => [(CT.openBordersOf(b) || new Set()).size + (b.contracts?.pendingBorderPick ? 99 : 0),
                            (CT.openBordersOf(a) || new Set()).size],
    cover: (a, b) => [b.architect?.maxCover ?? 0, a.architect?.maxCover ?? 0],
    coverUncapped: (a, b) => [b.architect?.maxCover ?? 0, a.architect?.maxCover ?? 0],
    upgradeBuildings: (a, b) => [(b.architect?.buildings || []).reduce((n, x) => n + (x.tier || 0), 0),
                                 (a.architect?.buildings || []).reduce((n, x) => n + (x.tier || 0), 0)],
    skillUp: (a, b) => [Object.values(b.skillTiers || {}).reduce((n, x) => n + x, 0),
                        Object.values(a.skillTiers || {}).reduce((n, x) => n + x, 0)],
    skillToEpic: (a, b) => [b.contracts?.pendingSkillPick ? 1 : 0, a.contracts?.pendingSkillPick ? 1 : 0],
    thirdDoor: (a, b) => [CT.skillDoorsWith(b, 2, 8), CT.skillDoorsWith(a, 2, 8)],
    highTierChance: (a, b) => [CT.skillLegendaryWith(b, 0.035), CT.skillLegendaryWith(a, 0.035)],
    offerLift: (a, b) => [CT.liftDoorTiers(b, doors, 8)[0].tiers.SK_FIRE_01, doors[0].tiers.SK_FIRE_01],
    offerLiftBelow: (a, b) => [CT.liftDoorTiers(b, doors, 8)[0].tiers.SK_FIRE_01, doors[0].tiers.SK_FIRE_01],
    perksOffered: (a, b) => [CT.perksOfferedWith(b, 3), CT.perksOfferedWith(a, 3)],
    perkFloor: (a, b) => [CT.perkFloorWith(b, 1), CT.perkFloorWith(a, 1)],
    legendaryChance: (a, b) => [CT.perkLegendaryWith(b, 0.07), CT.perkLegendaryWith(a, 0.07)],
    freeRerolls: (a, b) => [b.rerollsSkill || 0, a.rerollsSkill || 0],
    freeRerollPerPhase: (a, b) => [(CT.freeRerollPhases(b) || []).length, (CT.freeRerollPhases(a) || []).length],
    legendaryRerollNormalPrice: (a, b) => [-CT.rerollOfferWith(b, 0, true).nextPrice, -CT.rerollOfferWith(a, 0, true).nextPrice],
    rerollScale: (a, b) => [-CT.rerollOfferWith(b, 0, false).nextPrice, -CT.rerollOfferWith(a, 0, false).nextPrice],
    legendaryPerkPick: (a, b) => [CT.legendaryPerkForce(b), CT.legendaryPerkForce(a)],
    coinsPerPhase: (a, b) => [CT.coinsPerPhase(b), CT.coinsPerPhase(a)],
    // Parameter, kein eigener Effekt — sie modulieren einen der obigen.
    steps: null, cycles: null, phases: null, random: null, skillUpRest: null,
  };

  const alleStuecke = [
    ...CT.LOOT_FAMILIES.flatMap((f) => [1, 2, 3, 4].map((tier) =>
      ({ name: `${f.id} ${tier}`, kind: "family", id: f.id, category: f.category, tier, effect: f.effects[tier - 1] }))),
    ...CT.LEGENDARIES.map((l) => ({ name: l.id, kind: "legendary", id: l.id, tier: CT.TIER_LEGENDARY, effect: l.effect })),
  ];

  it("der Katalog trägt 61 Stücke", () => {
    expect(alleStuecke.length).toBe(61);
  });

  it.each(alleStuecke)("$name wirkt", (st) => {
    const vor = { ...basis() };
    vor.contracts = { ...vor.contracts, pendingLoot: [st] };
    const nach = reducer(vor, { type: "PICK_LOOT", lootId: st.id, tier: st.tier, rng: seeded(3) });
    expect(nach, "PICK_LOOT wirkungslos").not.toBe(vor);
    for (const [k, v] of Object.entries(st.effect || {})) {
      expect(k in MESSER, `unbekannter Effekt-Schlüssel ${k} — Messung fehlt`).toBe(true);
      if (!MESSER[k]) continue;
      const [neu, alt] = MESSER[k](vor, nach);
      expect(neu, `${k} (${JSON.stringify(v)}): ${alt} → ${neu}`).toBeGreaterThan(alt);
    }
  });
});

describe("Aufträge · Veredelung hebt die Stufen der TÜREN (2026-09-17)", () => {
  /* Der Fehler, den das Audit gefunden hat. Die Türen halten ihre Stufen als Objekt je Skill-id,
     der Heber prüfte auf `Array.isArray` — Veredelung war auf allen vier Stufen wirkungslos. Die
     alten Tests trafen ihn nicht, weil sie den Helfer mit ARRAYS fütterten, also mit einer Form,
     die das Spiel an dieser Stelle gar nicht baut. */
  const mit = (boons) => ({ contractsEnabled: true, contractBoons: boons, cycle: 4 });

  it("die Objektform der Türen wird gehoben, nicht nur die Arrayform", () => {
    const doors = [{ skills: ["A", "B"], tiers: { A: 0, B: 2 } }];
    const s = mit({ offerLift: { steps: 1, until: 12 } });
    expect(CT.liftDoorTiers(s, doors, 4)[0].tiers).toEqual({ A: 1, B: 3 });
    // und die flache Arrayform weiter auch
    expect(CT.liftSkillTiers(s, [0, 2], 4)).toEqual([1, 3]);
  });

  it("die gewürfelten Türen kommen als Objekt — genau die Form, die der Heber sehen muss", () => {
    const gebaut = buildSkillDoors(["SK_FIRE_01"], ["fire"], seeded(5), seeded(6), {});
    expect(gebaut.length, "der Aufbau liefert Türen").toBeGreaterThan(0);
    for (const d of gebaut) {
      expect(Array.isArray(d.tiers), "Türen halten ein OBJEKT, kein Array").toBe(false);
      expect(typeof d.tiers).toBe("object");
    }
    const s = mit({ offerLiftBelow: 4 });
    const gehoben = CT.liftDoorTiers(s, gebaut, 4);
    const summe = (ds) => ds.reduce((n, d) => n + Object.values(d.tiers).filter(Number.isInteger).reduce((m, t) => m + t, 0), 0);
    expect(summe(gehoben), "gehoben ist höher als gewürfelt").toBeGreaterThan(summe(gebaut));
  });

  it("Legendäre in einer Tür tragen keine Stufe und werden nicht gehoben", () => {
    const doors = [{ skills: ["A", "L"], tiers: { A: 0, L: null } }];
    const s = mit({ offerLift: { steps: 1, until: 12 } });
    expect(CT.liftDoorTiers(s, doors, 4)[0].tiers).toEqual({ A: 1, L: null });
  });
});

describe("Aufträge · befristete Beute sagt, wie lange sie noch wirkt", () => {
  /* Freibrief I und II laufen ab, III und IV nicht. Ohne die Zahl kann der Spieler nicht
     unterscheiden, ob ein Stück abgelaufen ist oder nie gewirkt hat. */
  const nachNehmen = (id, tier, cycle = 8) => {
    const s = { contractsEnabled: true, contractBoons: {}, cycle, architect: {}, skillTiers: {}, skills: [] };
    const fam = CT.LOOT_BY_ID[id];
    const patch = CT.applyLoot(s, { id, tier, effect: fam.effects[tier - 1] }, seeded(1));
    return { ...s, ...patch };
  };

  it("Freibrief I und II sind befristet, III und IV laufen bis zum Laufende", () => {
    expect(CT.lootCyclesLeft(nachNehmen("freibrief", 1), { id: "freibrief", tier: 1 }, 8)).toBe(4);
    expect(CT.lootCyclesLeft(nachNehmen("freibrief", 2), { id: "freibrief", tier: 2 }, 8)).toBe(12);
    expect(CT.lootCyclesLeft(nachNehmen("freibrief", 3), { id: "freibrief", tier: 3 }, 8), "dauerhaft").toBe(null);
    expect(CT.lootCyclesLeft(nachNehmen("freibrief", 4), { id: "freibrief", tier: 4 }, 8)).toBe(null);
  });

  it("abgelaufen heißt 0, und dann zählt die Wirkung auch nicht mehr", () => {
    const s = nachNehmen("freibrief", 1, 8);           // gültig bis Durchlauf 12
    expect(CT.lootCyclesLeft(s, { id: "freibrief", tier: 1 }, 20)).toBe(0);
    expect(CT.skillDoorsWith(s, 2, 10), "innerhalb der Frist").toBe(3);
    expect(CT.skillDoorsWith(s, 2, 20), "danach").toBe(2);
  });

  it("Münzrecht I und Freizug I ebenso, ihre höheren Stufen nicht", () => {
    expect(CT.lootCyclesLeft(nachNehmen("muenzrecht", 1), { id: "muenzrecht", tier: 1 }, 8)).toBe(15);
    expect(CT.lootCyclesLeft(nachNehmen("muenzrecht", 2), { id: "muenzrecht", tier: 2 }, 8)).toBe(null);
    expect(CT.lootCyclesLeft(nachNehmen("freizug", 1), { id: "freizug", tier: 1 }, 8)).toBe(5);
    expect(CT.lootCyclesLeft(nachNehmen("freizug", 2), { id: "freizug", tier: 2 }, 8)).toBe(null);
  });
});

describe("Aufträge · eine Grenzwahl ohne Ziel darf nicht stehen bleiben", () => {
  /* Durchlass ab Stufe II stellt eine Auswahl. Steht schon alles offen, hat sie kein Ziel —
     bestätigen ließe sie sich nicht, und das Overlay bliebe bis zum Laufende auf dem Bildschirm.
     Zwei Wege dorthin, deshalb zwei Sperren: Schleifung liegt im Beute-Zustand selbst, fremde
     Quellen (Perk, Spalier, Pfeiler) sieht erst der Reducer. */
  const armed = (boons) => ({ contractsEnabled: true, contractBoons: boons, playerOrder: [], deck: [],
    skills: [], skillTiers: {}, familyTiers: {}, contracts: { pendingBorderPick: { count: 2 } } });

  it("nach Schleifung stellt Durchlass gar keine Wahl mehr", () => {
    const piece = { kind: "family", id: "durchlass", category: "aufstellung", tier: 3, effect: { openBorders: 2 } };
    const lauf = (boons) => ({ contractsEnabled: true, contractBoons: boons });
    const nachSchleifung = CT.applyLoot(lauf({ openBorders: "all" }), piece, seeded(5));
    expect(nachSchleifung.pendingBorderPick, "kein Ziel → keine Wahl").toBeUndefined();
    // Gegenprobe: mit freien Grenzen steht die Wahl sehr wohl.
    expect(CT.applyLoot(lauf({}), piece, seeded(5)).pendingBorderPick).toEqual({ count: 2 });
  });

  it("sind alle sieben Grenzen offen, räumt der Reducer die Wahl ab", () => {
    const s = armed({ openBorders: CT.ALL_BORDERS });
    const after = reducer(s, { type: "PICK_CONTRACT_BORDER", borders: CT.ALL_BORDERS });
    expect(after.contracts.pendingBorderPick, "abgeräumt statt festgefahren").toBe(null);
  });

  it("eine leere Eingabe bei freien Grenzen bleibt ein No-Op", () => {
    const s = armed({});
    expect(reducer(s, { type: "PICK_CONTRACT_BORDER", borders: [] })).toBe(s);
  });
});
