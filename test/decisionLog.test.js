import { describe, it, expect } from "vitest";
import { decisionEntry, withDecisionLog, DECISION_LOG_CAP } from "../src/game/decisionLog.js";
import { reducer } from "../src/game/reducer.js";

/* #telemetrie: der Entscheidungs-Log ist die Balancing-Währung (Angebot ↔ Wahl). Zwei Dinge müssen halten:
   (1) er protokolliert NUR wirksame Entscheidungen — sonst zählen von Guards verworfene Klicks als „Wahl"
       und verfälschen jede Pickrate;
   (2) er lässt reducer.js unberührt — sonst wackelt die Determinismus-Invariante (#205). */

const prev = {
  cycle: 7, score: 1234.6, offerRerolls: 1,
  offer: ["P_A", "P_B", { familyId: "F_X", tier: 2 }],
  skillOffer: ["SK_A", "SK_B"],
  legendaryOffer: ["SK_LEG"],
  architect: { offers: [{ familyId: "AF_1", tier: 2, used: false }], buildings: [{ id: 3, familyId: "AF_9", tier: 1 }] },
};
const next = { ...prev, marker: 1 }; // irgendein veränderter State → Action war wirksam

describe("decisionEntry — Angebot ↔ Wahl", () => {
  it("Perk-Pick: Angebot flach als Strings, Familien-Stufe als fam:<id>:<tier>", () => {
    const e = decisionEntry(prev, { type: "PICK_PERK", perkId: "P_B" }, next);
    expect(e).toMatchObject({ c: 7, k: "perk", p: "P_B", r: 1 });
    expect(e.o).toEqual(["P_A", "P_B", "fam:F_X:2"]);
    expect(e.s).toBe(1235); // Score gerundet (bigint-Spalte duldet keine Floats)
  });

  it("Familien-Pick wird auf denselben Schlüssel abgebildet wie im Angebot", () => {
    const e = decisionEntry(prev, { type: "PICK_FAMILY", familyId: "F_X", tier: 2 }, next);
    expect(e.p).toBe("fam:F_X:2");
    expect(e.o).toContain("fam:F_X:2"); // Wahl muss im Angebot wiederfindbar sein → Pickrate rechenbar
  });

  it("Ablehnen ist eine Entscheidung: p = null, Angebot bleibt erhalten", () => {
    const e = decisionEntry(prev, { type: "DECLINE_SKILL" }, next);
    expect(e).toMatchObject({ k: "skill", p: null });
    expect(e.o).toEqual(["SK_A", "SK_B"]);
  });

  it("Skill-Tausch merkt sich den ersetzten Skill", () => {
    const e = decisionEntry(prev, { type: "PICK_SKILL", skillId: "SK_A", replaceId: "SK_OLD" }, next);
    expect(e).toMatchObject({ k: "skill", p: "SK_A", x: "SK_OLD" });
  });

  // exp skill rework: die Türwahl ist eine eigene Entscheidung (k: "door"); Ablehnen/Neuwurf VOR den Türen loggen die
  // Türen als Angebot (je Tür ein flacher String), das geöffnete Angebot danach wie zuvor die Skill-Liste.
  it("Türwahl: beide Türen als flache Strings, gewählt = Index; Ablehnen an der Tür loggt die Türen, der Neuwurf das geöffnete Angebot", () => {
    const doors = { ...prev, skillOffer: null, skillDoors: [{ skills: ["SK_A", "SK_B", "SK_C"], tiers: { SK_A: 2 } }, { skills: ["SK_D"], tiers: {} }] };
    const e = decisionEntry(doors, { type: "CHOOSE_DOOR", index: 1 }, { ...doors, marker: 1 });
    expect(e).toMatchObject({ c: 7, k: "door", p: "1" });
    expect(e.o).toEqual(["SK_A+SK_B+SK_C", "SK_D"]);
    expect(decisionEntry(doors, { type: "DECLINE_SKILL" }, { ...doors, marker: 1 })).toMatchObject({ k: "skill", p: null, o: ["SK_A+SK_B+SK_C", "SK_D"] });
    expect(decisionEntry(prev, { type: "REROLL_SKILL" }, next)).toMatchObject({ k: "reroll", w: "skill", o: ["SK_A", "SK_B"] }); // geöffnetes Angebot: die drei Skills
  });

  it("Reroll protokolliert das VERWORFENE Angebot samt Pool", () => {
    const e = decisionEntry(prev, { type: "REROLL_PERK" }, next);
    expect(e).toMatchObject({ k: "reroll", w: "perk", p: null });
    expect(e.o).toEqual(["P_A", "P_B", "fam:F_X:2"]);
  });

  it("Gebäude: Bauen aus dem Angebot, Ausbauen mit erreichter Stufe", () => {
    expect(decisionEntry(prev, { type: "ARCHITECT_BUILD", familyId: "AF_1", tier: 2 }, next))
      .toMatchObject({ k: "arch", o: ["fam:AF_1:2"], p: "AF_1:2" });
    expect(decisionEntry(prev, { type: "ARCHITECT_UPGRADE", buildingId: 3 }, next))
      .toMatchObject({ k: "archUp", p: "AF_9:2" });
  });

  it("Gletscher-Wahl: gefrorene Position", () => {
    expect(decisionEntry(prev, { type: "GLACIER_LOCK", pos: 17 }, next)).toMatchObject({ k: "glacier", p: "17" });
  });

  it("NO-OP (Reducer hat die Action per Guard verworfen) wird NICHT geloggt", () => {
    // Genau hier entsteht sonst der stille Datenfehler: ein Klick auf eine ungültige Wahl ändert den State
    // nicht — würde er trotzdem als Pick gezählt, wäre jede Pickrate zu hoch.
    expect(decisionEntry(prev, { type: "PICK_PERK", perkId: "P_B" }, prev)).toBeNull();
  });

  it("nicht entscheidungs-relevante Actions liefern nichts", () => {
    expect(decisionEntry(prev, { type: "RESOLVE_TRICK" }, next)).toBeNull();
    expect(decisionEntry(prev, { type: "SWAP_CARDS", a: 1, b: 2 }, next)).toBeNull();
  });
});

describe("withDecisionLog — Reducer-Dekorator", () => {
  const stub = (s, a) => (a.type === "NOOP" ? s : { ...s, n: (s.n || 0) + 1 });
  const wrapped = withDecisionLog(stub);

  it("hängt wirksame Entscheidungen an und lässt den Basis-Reducer unverändert durch", () => {
    const s0 = { cycle: 1, score: 0, offer: ["P_A"], decisionLog: [] };
    const s1 = wrapped(s0, { type: "PICK_PERK", perkId: "P_A" });
    expect(s1.n).toBe(1);                       // Basis-Reducer hat gearbeitet
    expect(s1.decisionLog).toHaveLength(1);
    expect(s1.decisionLog[0].p).toBe("P_A");
  });

  it("reicht den State bei irrelevanten Actions identisch (Referenz!) durch", () => {
    const s0 = { cycle: 1, score: 0, decisionLog: [] };
    const out = wrapped(s0, { type: "NOOP" });
    expect(out).toBe(s0); // keine neue Referenz → keine überflüssigen React-Re-Renders
  });

  it("START_RUN startet mit leerem Log (der neue Lauf erbt nichts vom alten)", () => {
    const s0 = { decisionLog: [{ k: "perk", p: "P_ALT" }] };
    expect(wrapped(s0, { type: "START_RUN" }).decisionLog).toEqual([]);
  });

  it("RESTORE_RUN behält den Log des wiederhergestellten Laufs", () => {
    const restored = { decisionLog: [{ k: "perk", p: "P_X" }] };
    const out = withDecisionLog(() => restored)({}, { type: "RESTORE_RUN" });
    expect(out.decisionLog).toEqual([{ k: "perk", p: "P_X" }]);
  });

  it("deckelt den Log (Resume-Snapshot darf nicht unbegrenzt wachsen)", () => {
    let s = { cycle: 0, score: 0, offer: ["P_A"], decisionLog: [] };
    for (let i = 0; i < DECISION_LOG_CAP + 25; i++) s = wrapped(s, { type: "PICK_PERK", perkId: "P_A" });
    expect(s.decisionLog).toHaveLength(DECISION_LOG_CAP);
  });

  it("verändert das Verhalten des ECHTEN Reducers nicht (Determinismus-Invariante)", () => {
    // Derselbe Seed → beide Wege müssen denselben Spielzustand liefern; der Wrapper darf ausschließlich
    // `decisionLog` ergänzen.
    const act = { type: "START_RUN", seed: 12345, rng: () => 0.5 };
    const bare = reducer({ phase: "menu" }, act);
    const { decisionLog, ...withLog } = withDecisionLog(reducer)({ phase: "menu" }, act);
    expect(decisionLog).toEqual([]);
    expect(withLog).toEqual(bare);
  });
});
