import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES } from "../src/game/glacier.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)
const FROSTBUND_BUFF = EIS.frostbund[0].buff; // Normal-Stufe: ein Szenario ohne Stufenkarte hält sie

// Eis-Neudesign Phase 3.2d — Frostbund (Frostgriff, Duo): bricht ein Gletscher, bufft er seine NICHT-Eis-Nachbarn
// (2. Archetyp) mit +Stichwert im nächsten Durchlauf. Eigener-Karten-Buff (pending → active).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("Frostbund — Markierung beim Bruch", () => {
  it("bufft die Nicht-Eis-Nachbarn eines brechenden Gletschers (pending)", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), glacierRoles: [ROLES.FROSTBUND] }), noCrit);
    expect(s.glacierBuffPending["F1"]).toBe(FROSTBUND_BUFF); // pos1 (rechts) — Nicht-Eis-Nachbar
    expect(s.glacierBuffPending["F5"]).toBe(FROSTBUND_BUFF); // pos5 (unten) — Nicht-Eis-Nachbar
  });
  /* §5.18: ALLE Nachbarn, auch die gefrorenen. Vorher waren im dichten Cluster alle Nachbarn Gletscher — genau dort,
     wo Kaskade, Kollision und die Geometrien hinwollen, war Frostbund also tot. Die Duo-Fantasie bleibt heil: im
     Mischbuild trifft er weiter die Karten des zweiten Archetyps. */
  it("Gletscher-Nachbarn werden ebenfalls gebufft", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0, 1), glacierMass: withMass([[0, 12]]), glacierRoles: [ROLES.FROSTBUND] }), noCrit);
    expect(s.glacierBuffPending["F1"]).toBe(FROSTBUND_BUFF); // pos1 ist selbst Gletscher — zählt jetzt mit
    expect(s.glacierBuffPending["F5"]).toBe(FROSTBUND_BUFF);
  });
});

describe("Frostbund — Wirkung", () => {
  it("gebuffte Nachbarkarte kämpft mit +Stichwert und gewinnt sonst-verlorene Stiche", () => {
    const s = resolveTrick(scen({ oppDeck: oppOf(13), glacierBuffActive: { F0: FROSTBUND_BUFF } }), noCrit); // pos0: 12 + Buff schlägt 13
    expect(s.lastTrick.result).toBe("win");
  });
  it("ohne Buff verliert dieselbe Karte", () => {
    const s = resolveTrick(scen({ oppDeck: oppOf(13) }), noCrit); // 12 vs 13
    expect(s.lastTrick.result).toBe("loss");
  });
});
