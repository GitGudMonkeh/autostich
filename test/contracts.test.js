import { describe, it, expect } from "vitest";
import * as CT from "../src/game/contracts.js";
import { DECISION_SCHEDULE } from "../src/game/constants.js";
import { reducer } from "../src/game/reducer.js";
import { SKILL_LIST, isLegendarySkill } from "../src/game/skills.js";
import { computeFormations, openBorderInfo, FORMATION_TYPES } from "../src/game/formations.js";
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
  it("fünfzehn Aufgaben, 61 Beutestücke (14 Familien × 4 + 5 Legendäre)", () => {
    expect(CT.TASKS.length).toBe(15);
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

describe("Aufträge · der Aufgabentext nennt den gewürfelten Parameter", () => {
  /* Die Kachel zeigt nur „Reinheit 1/4". Welcher FORMATIONSTYP gewürfelt wurde, steht allein im
     Aufgabentext — ohne ihn fehlt die halbe Aufgabe. Genau das ist im Playtest aufgefallen
     (Owner, 2026-09-15), deshalb hängt hier ein Wächter: wer einen Parameter würfelt, muss ihn im
     Satz auch einsetzen, und wer keinen würfelt, darf keinen Platzhalter tragen. */
  it("genau die Aufgaben mit `variants` tragen {variant} im deutschen Text", () => {
    for (const task of CT.TASKS) {
      const text = de[`contract.task.${task.id}.text`];
      expect(text, `Text fehlt: ${task.id}`).toBeTruthy();
      expect(text.includes("{variant}"), `${task.id}: {variant} im Text`).toBe(!!task.variants);
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

  it("jede Aufgabe trägt {n} — ohne die Zahl steht keine Schwelle im Satz", () => {
    for (const task of CT.TASKS) {
      expect(de[`contract.task.${task.id}.text`].includes("{n}"), task.id).toBe(true);
    }
  });
});

describe("Aufträge · gegen Wiederholung (§3.6)", () => {
  it("Regel 1: gewürfelte Parameter machen aus 15 Definitionen 20 Angebote und 80 Karten", () => {
    const distinct = CT.TASKS.reduce((n, t) => n + (t.variants ? t.variants.length : 1), 0);
    expect(CT.TASKS.length).toBe(15);
    expect(distinct, "Reinheit würfelt vier Typen, Quartier drei Kategorien").toBe(20);
    expect(distinct * CT.STEPS.length).toBe(80);
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
