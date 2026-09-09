import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, ROLES } from "../src/game/glacier.js";
import { iceSnapshotOpts } from "../src/game/factions/ice.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)


// Eis-Neudesign Phase 3.2 Gruppe A — Snapshot-Modifikatoren (Rissbildung/Abbruchkante). §5.2: Zermalmen gestrichen.
// Getrieben über state.glacierRoles (noch nicht im Skill-Angebots-Pool → kein 5.-Archetyp-Leak). Werte Platzhalter.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("iceSnapshotOpts — Rollen und Stufe → Snapshot-opts", () => {
  it("baut opts nur für aktive Rollen, komponiert additiv", () => {
    expect(iceSnapshotOpts([])).toEqual({});
    expect(iceSnapshotOpts([ROLES.KETTENBRUCH]).kettenbruchDepth).toBe(EIS.kettenbruch[0].depth);
    const all = iceSnapshotOpts([ROLES.KETTENBRUCH, ROLES.ABBRUCHKANTE]);
    expect(all).toHaveProperty("kettenbruchDepth");
    expect(all).toHaveProperty("tierMult");
  });
  // §5.18: Rissbildung ist gestrichen, mit ihr die einzige Quelle für `burstAt` — gebrochen wird immer bei BURST_AT.
  it("keine Rolle senkt mehr die Berst-Schwelle", () => {
    for (const role of Object.values(ROLES)) expect(iceSnapshotOpts([role])).not.toHaveProperty("burstAt");
  });
});

/* §5.18 — Gletscherzunge ersetzt Rissbildung auf SK_ICE_13: Masse wird Kampfwert. Der Hebel ist der Grund, warum Eis
   überhaupt Stiche gewinnen kann; der Bruch bekommt den vollen Sieg-Stack nur bei einem Sieg. */
describe("Gletscherzunge — Masse wird Kampfwert", () => {
  it("gewinnt einen Stich, den dieselbe Karte ohne sie verliert", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;   // Normal: 12 / 6 = +2 Wert
    const opp = oppOf(13);                              // Kartenwert an pos0 ist 12 → ohne Zunge zu wenig
    const ohne = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp }), noCrit);
    const mit = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(ohne.lastTrick.result).toBe("loss");
    expect(mit.lastTrick.result).toBe("win");
    expect(mit.lastTrick.pValue - ohne.lastTrick.pValue).toBe(2); // genau der Satz der Stufe
  });

  /* Die Naht, die beim Bauen zuerst falsch war: der Bruch-Abfall wird dem Feld VOR der Wertberechnung abgezogen. Wer
     den laufenden Akkumulator liest, lässt den Gletscher ausgerechnet in seiner Bruchrunde mit +0 kämpfen — und das ist
     die Runde, in der ein Sieg am meisten wert ist, weil der volle Sieg-Stack auf den Bruch geht. */
  it("liest die Masse DIESES Durchlaufs, auch wenn der Gletscher im selben Stich birst", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;   // birst in diesem Stich (Berst-Schwelle)
    const opp = oppOf(13);
    const s = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0); // er ist wirklich gebrochen
    expect(s.lastTrick.result).toBe("win");                         // und hat trotzdem mit +2 gekämpft
  });

  it("ohne Masse kein Bonus — der Skill hängt an der Ressource, nicht am Besitz", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const ohne = resolveTrick(scen({ glacierLocked }), noCrit);
    const mit = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(mit.lastTrick.pValue).toBe(ohne.lastTrick.pValue);
  });
});

describe("Abbruchkante — steilere Stufen", () => {
  it("höhere Stufe zahlt mit Abbruchkante mehr als ohne", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12; // Stufe 3
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const abb = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.ABBRUCHKANTE] }), noCrit);
    expect(abb.lastTrick.breakdown.glacierDirect).toBeGreaterThan(base.lastTrick.breakdown.glacierDirect);
  });
});

describe("Abbruchkante — die vierte Schwelle", () => {
  // §5.18: die Leiter hat eine vierte Zeile bekommt, weil es eine vierte Schwelle gibt. Der Wächter hält fest, dass
  // die Rolle sie auch WEITERREICHT — eine Tabelle mit t4, die im Snapshot nicht ankommt, wäre stumm.
  it("reicht auch die Wucht der vierten Schwelle in den Snapshot", () => {
    const { tierMult } = iceSnapshotOpts([ROLES.ABBRUCHKANTE]);
    expect(tierMult).toHaveLength(5);
    expect(tierMult[4]).toBe(EIS.abbruchkante[0].t4);
    const m = zeros(); m[0] = 18;
    const { breaks } = precomputeGlacier(m, new Set([0]), iceSnapshotOpts([ROLES.ABBRUCHKANTE]));
    expect(breaks[0].tier).toBe(4);
  });
});
