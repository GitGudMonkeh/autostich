import { describe, it, expect } from "vitest";
import {
  FAMILY_DEFS, FAMILY_LIST, familyDef, familyCategory,
  activeTierDef, activeTierDefs, familySumHook, familyProdHook,
} from "../src/game/families.js";
import { UPGRADE_TYPES } from "../src/game/rarity.js";
import { buildDeck, makeRng } from "../src/game/deck.js";

describe("Familien-Registry — Struktur", () => {
  it("jede Familie hat id/cat/name/upgradeType und vier Stufen mit Beschreibung", () => {
    for (const fam of FAMILY_LIST) {
      expect(fam.id).toBeTruthy();
      expect(["A", "B", "C", "D", "E"]).toContain(fam.cat);
      expect(fam.name).toBeTruthy();
      expect(Object.values(UPGRADE_TYPES)).toContain(fam.upgradeType);
      for (const t of [1, 2, 3, 4]) {
        expect(fam.tiers[t]).toBeTruthy();
        expect(typeof fam.tiers[t].desc).toBe("string");
        expect(fam.tiers[t].desc.length).toBeGreaterThan(0);
      }
    }
  });
  it("Kategorie D vollständig (19 Familien, alle Regelersetzung)", () => {
    const d = FAMILY_LIST.filter((f) => f.cat === "D");
    expect(d).toHaveLength(19);
    for (const f of d) expect(f.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
  });
  it("Kategorie B vollständig (10 Familien, alle Regelersetzung)", () => {
    const b = FAMILY_LIST.filter((f) => f.cat === "B");
    expect(b).toHaveLength(10);
    for (const f of b) expect(f.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
  });
  it("Kategorie A vollständig (10 Familien, alle Kumulativ, jede Stufe mit onPick)", () => {
    const a = FAMILY_LIST.filter((f) => f.cat === "A");
    expect(a).toHaveLength(10);
    for (const f of a) {
      expect(f.upgradeType).toBe(UPGRADE_TYPES.CUMULATIVE);
      for (const t of [1, 2, 3, 4]) expect(typeof f.tiers[t].onPick).toBe("function");
    }
  });
  it("Kategorie C vollständig (10 Familien: 8 ROLE, 1 REPLACEMENT, 1 CUMULATIVE)", () => {
    const c = FAMILY_LIST.filter((f) => f.cat === "C");
    expect(c).toHaveLength(10);
    const byType = (t) => c.filter((f) => f.upgradeType === t).map((f) => f.id);
    expect(byType(UPGRADE_TYPES.ROLE)).toHaveLength(8);
    expect(byType(UPGRADE_TYPES.REPLACEMENT)).toEqual(["C_SURVIVOR"]);
    expect(byType(UPGRADE_TYPES.CUMULATIVE)).toEqual(["C_SACRIFICE"]);
    // ROLE/CUMULATIVE-Stufen tragen pickTarget.cards; REPLACEMENT (C_SURVIVOR) trägt kein Ziel.
    for (const f of c) for (const t of [1, 2, 3, 4]) {
      if (f.upgradeType === UPGRADE_TYPES.REPLACEMENT) expect(f.tiers[t].pickTarget).toBeUndefined();
      else expect(f.tiers[t].pickTarget.cards).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Kategorie A — Kumulative Deck-Stufen (Spec §3.2 A)", () => {
  // Frisches Deck: 40 Karten, value === baseRank (1..10 × R/B/G/Y). deltas = Wertänderung je Position.
  const deltas = (before, after) => after.map((c, i) => c.value - before[i].value);
  const nChanged = (before, after) => deltas(before, after).filter((d) => d !== 0).length;

  it("A_WEAK_STRONG: ursprüngliche Wertgruppen abwärts (5→+1, 4→+2, 3→+3, 1&2→+4)", () => {
    const t = FAMILY_DEFS.A_WEAK_STRONG.tiers;
    const grp = (tier, base) => t[tier].onPick(buildDeck()).filter((c) => c.baseRank === base).map((c) => c.value);
    expect(grp(1, 5)).toEqual([6, 6, 6, 6]); // 5 → +1
    expect(grp(2, 4)).toEqual([6, 6, 6, 6]); // 4 → +2
    expect(grp(3, 3)).toEqual([6, 6, 6, 6]); // 3 → +3
    expect(grp(4, 1)).toEqual([5, 5, 5, 5]); // 1 → +4
    expect(grp(4, 2)).toEqual([6, 6, 6, 6]); // 2 → +4
    // Nachbargruppen bleiben unberührt (Stufe I fasst nur die 5er an).
    expect(t[1].onPick(buildDeck()).filter((c) => c.baseRank !== 5).every((c) => c.value === c.baseRank)).toBe(true);
  });

  it("A_EVEN: I vier zufällige Gerade; II 2er&8er; III 4er&6er; IV alle Geraden je +1", () => {
    const t = FAMILY_DEFS.A_EVEN.tiers; const d = buildDeck();
    const i = t[1].onPick(d, makeRng(3));
    expect(nChanged(d, i)).toBe(4);
    expect(deltas(d, i).every((x) => x === 0 || x === 1)).toBe(true);
    expect(i.every((c, k) => deltas(d, i)[k] === 0 || c.baseRank % 2 === 0)).toBe(true); // nur gerade betroffen
    expect(t[2].onPick(d).filter((c) => c.baseRank === 2 || c.baseRank === 8).every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(t[2].onPick(d).filter((c) => c.baseRank !== 2 && c.baseRank !== 8).every((c) => c.value === c.baseRank)).toBe(true);
    expect(t[3].onPick(d).filter((c) => c.baseRank === 4 || c.baseRank === 6).every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(t[4].onPick(d).filter((c) => c.baseRank % 2 === 0).every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(t[4].onPick(d).filter((c) => c.baseRank % 2 === 1).every((c) => c.value === c.baseRank)).toBe(true);
  });

  it("A_ODD: I vier zufällige Ungerade; II 3er&7er; III 1er&9er; IV alle Ungeraden je +1", () => {
    const t = FAMILY_DEFS.A_ODD.tiers; const d = buildDeck();
    const i = t[1].onPick(d, makeRng(3));
    expect(nChanged(d, i)).toBe(4);
    expect(i.every((c, k) => deltas(d, i)[k] === 0 || c.baseRank % 2 === 1)).toBe(true);
    expect(t[2].onPick(d).filter((c) => c.baseRank === 3 || c.baseRank === 7).every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(t[3].onPick(d).filter((c) => c.baseRank === 1 || c.baseRank === 9).every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(t[4].onPick(d).filter((c) => c.baseRank % 2 === 1).every((c) => c.value === c.baseRank + 1)).toBe(true);
  });

  it("A_SUIT_BOOST: I zufällige Farbe 4 Karten; II zufällige Farbe alle; III/IV gewählte Farbe", () => {
    const t = FAMILY_DEFS.A_SUIT_BOOST.tiers; const d = buildDeck();
    const i = t[1].onPick(d, makeRng(2));
    expect(nChanged(d, i)).toBe(4);
    expect(new Set(i.filter((c, k) => deltas(d, i)[k] !== 0).map((c) => c.suit)).size).toBe(1); // dieselbe Farbe
    expect(nChanged(d, t[2].onPick(d, makeRng(2)))).toBe(10); // alle 10 einer Farbe
    const iii = t[3].onPick(d, makeRng(0), { suits: ["R"] });
    expect(iii.filter((c) => c.suit === "R").every((c) => c.value === c.baseRank + 1)).toBe(true);
    expect(iii.filter((c) => c.suit !== "R").every((c) => c.value === c.baseRank)).toBe(true);
    expect(t[4].onPick(d, makeRng(0), { suits: ["B"] }).filter((c) => c.suit === "B").every((c) => c.value === c.baseRank + 2)).toBe(true);
    expect(t[3].onPick(d, makeRng(0), null)).toBe(d); // ohne Ziel-Flow → No-Op (identische Referenz)
  });

  it("A_SMALL_BIG: zufällige ursprüngliche 1–3er (2/3/4 Karten), IV alle zwölf", () => {
    const t = FAMILY_DEFS.A_SMALL_BIG.tiers; const d = buildDeck();
    expect(nChanged(d, t[1].onPick(d, makeRng(4)))).toBe(2);
    expect(nChanged(d, t[2].onPick(d, makeRng(4)))).toBe(3);
    expect(nChanged(d, t[3].onPick(d, makeRng(4)))).toBe(4);
    const i = t[1].onPick(d, makeRng(4));
    expect(i.every((c, k) => deltas(d, i)[k] === 0 || (c.baseRank >= 1 && c.baseRank <= 3))).toBe(true); // nur 1–3er
    expect(deltas(d, i).every((x) => x === 0 || x === 3)).toBe(true);                                    // +3
    const iv = t[4].onPick(d);
    expect(iv.filter((c) => c.baseRank <= 3)).toHaveLength(12);
    expect(iv.filter((c) => c.baseRank <= 3).every((c) => c.value === c.baseRank + 3)).toBe(true);
  });

  it("A_MIDRANGE: zufällige aktuelle 4–7er (3/5), III alle 4–7, IV alle 3–8", () => {
    const t = FAMILY_DEFS.A_MIDRANGE.tiers; const d = buildDeck();
    expect(nChanged(d, t[1].onPick(d, makeRng(1)))).toBe(3);
    expect(nChanged(d, t[2].onPick(d, makeRng(1)))).toBe(5);
    expect(nChanged(d, t[3].onPick(d))).toBe(16); // baseRank 4..7 → 4 Werte × 4 Farben
    expect(t[3].onPick(d).filter((c) => c.value !== c.baseRank).every((c) => c.baseRank >= 4 && c.baseRank <= 7)).toBe(true);
    expect(nChanged(d, t[4].onPick(d))).toBe(24); // baseRank 3..8 → 6 Werte × 4 Farben
  });

  it("A_TOP / A_BOTTOM: N höchste bzw. niedrigste je +delta (Rangliste über aktuellen Wert)", () => {
    const d = buildDeck();
    const top = FAMILY_DEFS.A_TOP.tiers, bot = FAMILY_DEFS.A_BOTTOM.tiers;
    const t1 = top[1].onPick(d);
    expect(nChanged(d, t1)).toBe(2);
    expect(deltas(d, t1).filter((x) => x !== 0).every((x) => x === 2)).toBe(true);
    expect(t1.filter((c, k) => deltas(d, t1)[k] !== 0).every((c) => c.baseRank === 10)).toBe(true); // Höchste
    expect(nChanged(d, top[4].onPick(d))).toBe(5);
    const b1 = bot[1].onPick(d);
    expect(nChanged(d, b1)).toBe(2);
    expect(deltas(d, b1).filter((x) => x !== 0).every((x) => x === 3)).toBe(true);
    expect(b1.filter((c, k) => deltas(d, b1)[k] !== 0).every((c) => c.baseRank === 1)).toBe(true); // Niedrigste
    expect(nChanged(d, bot[4].onPick(d))).toBe(5);
  });

  it("A_SUIT_DUEL: Gewinnerfarbe hoch / Verliererfarbe −1; III/IV gewählt", () => {
    const t = FAMILY_DEFS.A_SUIT_DUEL.tiers; const d = buildDeck();
    const i = t[1].onPick(d, makeRng(2));
    const up = new Set(i.filter((c, k) => deltas(d, i)[k] === 1).map((c) => c.suit));
    const down = new Set(i.filter((c, k) => deltas(d, i)[k] === -1).map((c) => c.suit));
    expect(up.size).toBe(1); expect(down.size).toBe(1);
    expect([...up][0]).not.toBe([...down][0]); // zwei verschiedene Farben
    const iii = t[3].onPick(d, makeRng(1), { suits: ["R"] });
    expect(iii.filter((c) => c.suit === "R").every((c) => c.value === c.baseRank + 3)).toBe(true);
    const dl = new Set(iii.filter((c) => c.value - c.baseRank === -1).map((c) => c.suit));
    expect(dl.size).toBe(1); expect(dl.has("R")).toBe(false); // Verlierer ≠ Gewinner
    const iv = t[4].onPick(d, makeRng(0), { suits: ["R", "G"] });
    expect(iv.filter((c) => c.suit === "R").every((c) => c.value === c.baseRank + 4)).toBe(true);
    expect(iv.filter((c) => c.suit === "G").every((c) => c.value === Math.max(0, c.baseRank - 1))).toBe(true);
    expect(t[4].onPick(d, makeRng(0), null)).toBe(d); // ohne Ziel-Flow → No-Op
  });

  it("A_CONDENSE: Schwellen über Häufigkeit je aktuellem Wert (III ≥3, IV ≥2)", () => {
    const t = FAMILY_DEFS.A_CONDENSE.tiers;
    const d = [1, 1, 2, 2, 2, 3].map((v, i) => ({ id: `c${i}`, suit: "R", baseRank: v, value: v })); // Wert1×2, Wert2×3, Wert3×1
    expect(deltas(d, t[3].onPick(d))).toEqual([0, 0, 1, 1, 1, 0]); // nur Wert2 (≥3)
    expect(deltas(d, t[4].onPick(d))).toEqual([1, 1, 1, 1, 1, 0]); // Wert1 & Wert2 (≥2)
    const i = t[1].onPick(d, makeRng(7));
    expect(nChanged(d, i)).toBe(2);
    expect(deltas(d, i)[5]).toBe(0); // Wert3 (einzeln) nie betroffen
  });
});

describe("Kategorie C — Rollen/Stufeneffekte (Spec §3.2 C)", () => {
  it("C_VANGUARD: isRole & Position 1–5 (IV 1–10), Bonus 2/3/4/4, Ziele 1/2/3/4", () => {
    const f = FAMILY_DEFS.C_VANGUARD.tiers;
    const ctx = (pos) => ({ isRole: (id) => id === "C_VANGUARD", posInCycle: pos });
    expect([1, 2, 3, 4].map((t) => f[t].cardBonus(ctx(4)))).toEqual([2, 3, 4, 4]);
    expect(f[1].cardBonus(ctx(5))).toBe(0);   // Position 6 → außerhalb 1–5
    expect(f[4].cardBonus(ctx(9))).toBe(4);   // IV bis Position 10
    expect(f[4].cardBonus(ctx(10))).toBe(0);
    expect(f[1].cardBonus({ isRole: () => false, posInCycle: 0 })).toBe(0); // keine Rolle
    expect([1, 2, 3, 4].map((t) => f[t].pickTarget.cards)).toEqual([1, 2, 3, 4]);
  });
  it("C_TRIUMPH: triumphActive → 2/2/3/4; triumph-Marker je Stufe", () => {
    const f = FAMILY_DEFS.C_TRIUMPH.tiers;
    expect([1, 2, 3, 4].map((t) => f[t].cardBonus({ triumphActive: true }))).toEqual([2, 2, 3, 4]);
    expect(f[4].cardBonus({ triumphActive: false })).toBe(0);
    expect([1, 2, 3, 4].every((t) => f[t].triumph === true)).toBe(true);
    expect([1, 2, 3, 4].map((t) => f[t].pickTarget.cards)).toEqual([1, 2, 3, 4]);
  });
  it("C_GUARD: Vorgänger-Niederlage → 3/4/5; IV auch zweiter Vorgänger → 6", () => {
    const f = FAMILY_DEFS.C_GUARD.tiers;
    const r = (over) => ({ isRole: (id) => id === "C_GUARD", ...over });
    expect([1, 2, 3].map((t) => f[t].cardBonus(r({ lastResult: "loss" })))).toEqual([3, 4, 5]);
    expect(f[1].cardBonus(r({ lastResult: "win" }))).toBe(0);
    expect(f[4].cardBonus(r({ lastResult: "win", secondLastResult: "loss" }))).toBe(6); // einer der zwei
    expect(f[4].cardBonus(r({ lastResult: "win", secondLastResult: "win" }))).toBe(0);
  });
  it("C_RELAY / C_LEADER: relay/relayBonus + Ziele je Stufe", () => {
    const r = FAMILY_DEFS.C_RELAY.tiers, l = FAMILY_DEFS.C_LEADER.tiers;
    expect([1, 2, 3, 4].map((t) => [r[t].relay, r[t].relayBonus])).toEqual([[1, 2], [1, 2], [1, 3], [2, 3]]);
    expect([1, 2, 3, 4].map((t) => r[t].pickTarget.cards)).toEqual([1, 2, 3, 4]);
    expect(r[1].cardBonus).toBeUndefined(); // reiner relay, kein cardBonus
    expect([1, 2, 3, 4].map((t) => [l[t].relay, l[t].relayBonus])).toEqual([[1, 2], [2, 2], [2, 3], [3, 4]]);
    expect([1, 2, 3, 4].map((t) => l[t].pickTarget.cards)).toEqual([1, 1, 2, 2]);
  });
  it("C_FINISHER: letzte Segmentposition (IV letzte zwei), Bonus 3/4/5/5", () => {
    const f = FAMILY_DEFS.C_FINISHER.tiers;
    const r = (pos) => ({ isRole: (id) => id === "C_FINISHER", posInCycle: pos });
    expect(f[1].cardBonus(r(4))).toBe(3);   // pos 5 → %5===4
    expect(f[1].cardBonus(r(3))).toBe(0);
    expect(f[3].cardBonus(r(9))).toBe(5);   // pos 10 → %5===4
    expect(f[4].cardBonus(r(3))).toBe(5);   // letzte zwei: %5===3
    expect(f[4].cardBonus(r(4))).toBe(5);
    expect(f[4].cardBonus(r(2))).toBe(0);
  });
  it("C_SURVIVOR: REPLACEMENT, segmentLowRank/segmentIndex (I erste 4 Segmente, III/IV zwei Tiefste)", () => {
    expect(FAMILY_DEFS.C_SURVIVOR.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
    const f = FAMILY_DEFS.C_SURVIVOR.tiers;
    expect(f[1].pickTarget).toBeUndefined();
    expect(f[1].cardBonus({ segmentIndex: 3, segmentLowRank: 0 })).toBe(2); // Segment <4, tiefste
    expect(f[1].cardBonus({ segmentIndex: 4, segmentLowRank: 0 })).toBe(0); // Segment >=4
    expect(f[2].cardBonus({ segmentIndex: 7, segmentLowRank: 0 })).toBe(2); // jedes Segment
    expect(f[2].cardBonus({ segmentLowRank: 1 })).toBe(0);                  // nur tiefste
    expect(f[3].cardBonus({ segmentLowRank: 1 })).toBe(3);                  // zwei tiefste
    expect(f[4].cardBonus({ segmentLowRank: 1 })).toBe(5);
    expect(f[4].cardBonus({ segmentLowRank: 2 })).toBe(0);
    expect([1, 2, 3, 4].every((t) => f[t].segmentLow === true)).toBe(true);
  });
  it("C_JOKER / C_BRIDGE: Formations-Marker + Modus/Span je Stufe", () => {
    const j = FAMILY_DEFS.C_JOKER.tiers, b = FAMILY_DEFS.C_BRIDGE.tiers;
    expect([1, 2, 3, 4].map((t) => j[t].jokerMode)).toEqual(["pred", "pred", "predOrSucc", "free"]);
    expect([1, 2, 3, 4].every((t) => j[t].jokerRole === true)).toBe(true);
    expect([1, 2, 3, 4].map((t) => b[t].bridgeSpan)).toEqual([1, 1, 2, 99]);
    expect([1, 2, 3, 4].every((t) => b[t].bridgeRole === true)).toBe(true);
    expect([1, 2, 3, 4].map((t) => j[t].pickTarget.cards)).toEqual([1, 2, 3, 4]);
  });
  it("C_SACRIFICE: CUMULATIVE, onPick opfert Karte(n) & bufft Nachfolger (order = playerOrder)", () => {
    expect(FAMILY_DEFS.C_SACRIFICE.upgradeType).toBe(UPGRADE_TYPES.CUMULATIVE);
    const f = FAMILY_DEFS.C_SACRIFICE.tiers;
    const deck = ["a", "b", "c"].map((id) => ({ id, suit: "R", baseRank: 5, value: 5 }));
    // I: Opfer a (−2), direkter Nachfolger b (+3); c unberührt.
    expect(f[1].onPick(deck, null, { cards: ["a"], order: [0, 1, 2] }).map((c) => c.value)).toEqual([3, 8, 5]);
    // IV: zwei Karten je −3, ihr Nachfolger je +7. a→b (+7); c letzte → kein Nachfolger.
    expect(f[4].onPick(deck, null, { cards: ["a", "c"], order: [0, 1, 2] }).map((c) => c.value)).toEqual([2, 12, 2]);
    expect(f[1].onPick(deck, null, { cards: ["a"] })).toBe(deck); // ohne order → No-Op
  });
});

describe("Kategorie B — Stufeneffekte (Spec §3.2 B)", () => {
  it("Gegenangriff: nach Niederlage +3/+5/+7/+10", () => {
    const f = FAMILY_DEFS.B_COUNTER.tiers;
    expect([1, 2, 3, 4].map((t) => f[t].cardBonus({ lostLastTrick: true }))).toEqual([3, 5, 7, 10]);
    expect(f[4].cardBonus({ lostLastTrick: false })).toBe(0);
  });
  it("Momentum: nur direkt nächste Karte; I braucht Serie 4, II–IV genau 3 (Spec §3.3)", () => {
    const f = FAMILY_DEFS.B_MOMENTUM.tiers;
    expect(f[1].cardBonus({ winStreak: 4 })).toBe(4);
    expect(f[1].cardBonus({ winStreak: 3 })).toBe(0);
    expect(f[2].cardBonus({ winStreak: 3 })).toBe(5);
    expect(f[2].cardBonus({ winStreak: 2 })).toBe(0); // kein Trigger nach nur 2 Siegen
    expect(f[4].cardBonus({ winStreak: 4 })).toBe(0); // genau 3, nicht mehr
  });
  it("Starker Auftakt: erste n Karten je +n", () => {
    const f = FAMILY_DEFS.B_OPENING.tiers;
    expect(f[1].cardBonus({ posInCycle: 1 })).toBe(2);
    expect(f[1].cardBonus({ posInCycle: 2 })).toBe(0);
    expect(f[4].cardBonus({ posInCycle: 4 })).toBe(5);
    expect(f[4].cardBonus({ posInCycle: 5 })).toBe(0);
  });
  it("Zehnter Schlag: Positionsraster verdichtet sich (20/40 → jede 5.)", () => {
    const f = FAMILY_DEFS.B_TENTH_STRIKE.tiers;
    expect(f[1].cardBonus({ posInCycle: 19 })).toBe(6); // Pos 20
    expect(f[1].cardBonus({ posInCycle: 9 })).toBe(0);  // Pos 10 (noch nicht)
    expect(f[2].cardBonus({ posInCycle: 9 })).toBe(6);  // Pos 10
    expect(f[3].cardBonus({ posInCycle: 4 })).toBe(6);  // Pos 5
    expect(f[4].cardBonus({ posInCycle: 4 })).toBe(8);  // Pos 5, +8
  });
  it("Knappe Kiste: I/II nur Wiederholung, III/IV jede Formation", () => {
    const f = FAMILY_DEFS.B_TIGHT.tiers;
    const rep = { posForm: { mult: 1.3, formations: [{ type: "wiederholung" }] } };
    const treppe = { posForm: { mult: 1.35, formations: [{ type: "treppe" }] } };
    expect(f[2].cardBonus(rep)).toBe(2);
    expect(f[2].cardBonus(treppe)).toBe(0);           // nur Wiederholung
    expect(f[3].cardBonus(treppe)).toBe(2);           // jede Formation (mult > 1)
    expect(f[4].cardBonus({ posForm: { mult: 1, formations: [] } })).toBe(0);
  });
  it("Durchbruch: sinceWin-Schwelle sinkt 6→3, Bonus steigt", () => {
    const f = FAMILY_DEFS.B_BREAKTHROUGH.tiers;
    expect(f[1].cardBonus({ sinceWin: 6 })).toBe(7);
    expect(f[1].cardBonus({ sinceWin: 5 })).toBe(0);
    expect(f[4].cardBonus({ sinceWin: 3 })).toBe(15);
  });
  it("Revanche: I/II/IV cardBonus, III markiert revengeTwoCard (kein cardBonus)", () => {
    const f = FAMILY_DEFS.B_REVENGE.tiers;
    expect(f[2].cardBonus({ lossStreak: 2 })).toBe(7);
    expect(f[4].cardBonus({ lossStreak: 1 })).toBe(8);
    expect(f[3].cardBonus).toBeUndefined();
    expect(f[3].revengeTwoCard).toEqual({ losses: 2, bonus: 6, count: 2 });
  });
  it("Perfekte Folge: Treppen-Ordinal → Bonus je Stufe", () => {
    const f = FAMILY_DEFS.B_PERFECT.tiers;
    const stair = (ord) => ({ posForm: { formations: [{ type: "treppe", ordinal: ord }] } });
    expect([1, 2, 3].map((o) => f[2].cardBonus(stair(o)))).toEqual([1, 2, 3]);
    expect(f[2].cardBonus(stair(5))).toBe(4);   // ab der 4. Karte konstant der Cap
    expect(f[1].cardBonus(stair(2))).toBe(0);   // I: erst ab der 3. Karte
    expect(f[1].cardBonus(stair(3))).toBe(1);
    expect(f[4].cardBonus(stair(1))).toBe(3);
    expect(f[4].cardBonus({ posForm: { formations: [{ type: "wiederholung", ordinal: 2 }] } })).toBe(0); // keine Treppe
  });
  it("Überzahl: Vergleich Dauerwert (pValueBase) vs. Vorgänger je Stufe", () => {
    const f = FAMILY_DEFS.B_SUPERIOR.tiers;
    expect(f[1].cardBonus({ predValue: 5, pValueBase: 7 })).toBe(2); // ≥2 höher
    expect(f[1].cardBonus({ predValue: 5, pValueBase: 6 })).toBe(0); // nur 1 höher
    expect(f[2].cardBonus({ predValue: 5, pValueBase: 6 })).toBe(3); // höher
    expect(f[3].cardBonus({ predValue: 5, pValueBase: 5 })).toBe(3); // nicht niedriger
    expect(f[4].cardBonus({ predValue: 5, pValueBase: 8 })).toBe(5); // höher → +5
    expect(f[4].cardBonus({ predValue: 5, pValueBase: 5 })).toBe(2); // gleich → +2
    expect(f[2].cardBonus({ predValue: null, pValueBase: 9 })).toBe(0); // kein Vorgänger
  });
  it("Initiative: tieArmLosses je Stufe; IV zusätzlich +2 nach Niederlage", () => {
    const f = FAMILY_DEFS.B_INITIATIVE.tiers;
    expect([1, 2, 3, 4].map((t) => f[t].tieArmLosses)).toEqual([2, 1, 1, 1]);
    expect(f[4].cardBonus({ lostLastTrick: true })).toBe(2);
    expect(f[1].cardBonus).toBeUndefined();
  });
});

describe("Kategorie D — Stufeneffekte (Spec §3.2 D)", () => {
  it("Punktebonus: Formation-Sieg 50/100/175/300", () => {
    const f = FAMILY_DEFS.D_FORMATION_BONUS.tiers;
    expect([1, 2, 3, 4].map((t) => f[t].scoreFlat({ hasFormation: true }))).toEqual([50, 100, 175, 300]);
    expect(f[4].scoreFlat({ hasFormation: false })).toBe(0);
  });
  it("Hohe Karten: Schwelle sinkt 9→6, Auszahlung steigt", () => {
    const f = FAMILY_DEFS.D_HIGH.tiers;
    expect(f[1].scoreFlat({ winValue: 9 })).toBe(100);
    expect(f[1].scoreFlat({ winValue: 8 })).toBe(0);
    expect(f[4].scoreFlat({ winValue: 6 })).toBe(350);
    expect(f[4].scoreFlat({ winValue: 5 })).toBe(0);
  });
  it("Siegesserie: Schritt × Serienpunkt, gedeckelt", () => {
    const f = FAMILY_DEFS.D_STREAK.tiers;
    expect(f[1].scoreFlat({ winStreak: 3 })).toBe(45);   // 15×3
    expect(f[1].scoreFlat({ winStreak: 20 })).toBe(150); // Cap
    expect(f[4].scoreFlat({ winStreak: 4 })).toBe(200);  // 50×4
  });
  it("Übermacht: Vorsprung-Schwelle sinkt 10→4", () => {
    const f = FAMILY_DEFS.D_OVERPOWER.tiers;
    expect(f[1].scoreFlat({ margin: 10 })).toBe(300);
    expect(f[1].scoreFlat({ margin: 9 })).toBe(0);
    expect(f[4].scoreFlat({ margin: 4 })).toBe(750);
  });
  it("Präzision: I/II exakt gleich, III/IV auch ±1", () => {
    const f = FAMILY_DEFS.D_PRECISION.tiers;
    expect(f[1].scoreFlat({ winValue: 5, lastWinValue: 5 })).toBe(250);
    expect(f[1].scoreFlat({ winValue: 5, lastWinValue: 6 })).toBe(0);   // ±1 zählt noch nicht
    expect(f[3].scoreFlat({ winValue: 5, lastWinValue: 6 })).toBe(550); // ±1 zählt
    expect(f[4].scoreFlat({ winValue: 5, lastWinValue: 7 })).toBe(0);   // ±2 nicht
  });
  it("Zehnter Sieg: Zähler-Intervall sinkt 12→5", () => {
    const f = FAMILY_DEFS.D_TENTH_WIN.tiers;
    expect(f[1].scoreFlat({ wins: 12 })).toBe(600);
    expect(f[1].scoreFlat({ wins: 11 })).toBe(0);
    expect(f[4].scoreFlat({ wins: 5 })).toBe(1000);
  });
  it("Crit-Familien nutzen scoreFlatOnCrit (nicht scoreFlat)", () => {
    expect(FAMILY_DEFS.D_CRIT_SCORE.tiers[2].scoreFlatOnCrit()).toBe(175);
    expect(FAMILY_DEFS.D_CRIT_SCORE.tiers[2].scoreFlat).toBeUndefined();
    expect(FAMILY_DEFS.D_OVERCRIT.tiers[2].scoreFlatOnCrit({ rawCrit: 1.2 })).toBe(300);
  });
});

describe("Resolver — Regelersetzung (nur höchste Stufe aktiv)", () => {
  it("activeTierDef liefert die Def der gehaltenen Stufe", () => {
    expect(activeTierDef("D_HIGH", 3)).toBe(FAMILY_DEFS.D_HIGH.tiers[3]);
    expect(activeTierDef("D_HIGH", 0)).toBeNull();
    expect(activeTierDef("UNBEKANNT", 2)).toBeNull();
  });
  it("familySumHook summiert genau die aktive Stufe je Familie (kein Doppel-Trigger)", () => {
    // D_HIGH auf Rang 2 (Schwelle ≥8/+150) — Rang 1 darf NICHT zusätzlich zählen.
    expect(familySumHook({ D_HIGH: 2 }, "scoreFlat", { winValue: 8 })).toBe(150);
    expect(familySumHook({ D_HIGH: 2 }, "scoreFlat", { winValue: 7 })).toBe(0);
    // Zwei Familien gleichzeitig: additive Summe ihrer aktiven Stufen.
    expect(familySumHook({ D_HIGH: 4, D_OVERPOWER: 2 }, "scoreFlat", { winValue: 6, margin: 8 })).toBe(350 + 400);
  });
  it("activeTierDefs liefert eine Def je gehaltener Familie", () => {
    expect(activeTierDefs({ D_HIGH: 1, D_STREAK: 4 })).toHaveLength(2);
    expect(activeTierDefs({})).toHaveLength(0);
  });
  it("familyProdHook default 1 ohne scoreMult-Familien", () => {
    expect(familyProdHook({ D_HIGH: 2 }, "scoreMult", {})).toBe(1);
  });
});
