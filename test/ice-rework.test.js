import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, EIS_TIERS as EIS } from "../src/game/skills.js";
import { ROLES, precomputeGlacier, eiszeitFlood, GLACIER_MAX, GLACIER_PER_PICK, SCHILD_PER_PICK } from "../src/game/glacier.js";
import { I, iceTuning, iceRoleTiers, iceSnapshotOpts } from "../src/game/factions/ice.js";
import { posOf } from "../src/game/architect.js";

/* Eis-Stufen (§5.3). Bis zu dieser Runde las die Eis-Mechanik globale Konstanten über die Rolle: eine an der Tür
   gewürfelte Stufe änderte NICHTS. Genau diese Naht wird hier geprüft — nicht, dass die Tabelle existiert, sondern
   dass ihre Zeilen bis in die Engine durchschlagen. Die Zahlen selbst stehen nirgends doppelt: jede Erwartung liest
   die Stufenzeile, die sie meint. */

const ICE_NORMAL = Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice" && !s.legendary);
const ICE_LEG = Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice" && s.legendary);

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
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], glacierRoleTiers: {}, ...over,
});
const at = (role, tier) => ({ glacierRoles: [role], glacierRoleTiers: { [role]: tier } });

describe("Eis-Stufen — die Tabelle", () => {
  it("15 normale Skills, jeder mit genau vier Stufen; drei Legendäre ohne", () => {
    expect(ICE_NORMAL).toHaveLength(15);
    expect(ICE_LEG).toHaveLength(3);
    for (const s of ICE_NORMAL) {
      expect(s.tiers, s.id).toHaveLength(4);
      expect(s.descTiers, s.id).toHaveLength(4);
    }
    for (const s of ICE_LEG) expect(s.descTiers, s.id).toBeUndefined();
  });

  it("keine zwei Stufen eines Skills tragen dieselben Werte (§1: Raritäten unterscheiden sich immer)", () => {
    for (const [key, rows] of Object.entries(EIS)) {
      const seen = rows.map((r) => JSON.stringify(r));
      expect(new Set(seen).size, `${key}: ${seen.join(" | ")}`).toBe(rows.length);
    }
  });

  it("ein Text je Stufe: `desc` ist der Normal-Text, keiner nennt seine Seltenheit", () => {
    for (const s of ICE_NORMAL) {
      expect(s.desc, s.id).toBe(s.descTiers[0]);
      expect(new Set(s.descTiers).size, s.id).toBe(4); // vier Stufen, vier verschiedene Sätze
      for (const text of s.descTiers) expect(text, s.id).not.toMatch(/Selten|Episch|Sehr selten/);
    }
  });

  it("jeder Skill hat einen Regler, der von Normal bis Episch wirklich anders steht", () => {
    for (const s of ICE_NORMAL) {
      const normal = iceTuning([s.role], { [s.role]: 0 });
      const episch = iceTuning([s.role], { [s.role]: 3 });
      expect(JSON.stringify(normal), s.id).not.toBe(JSON.stringify(episch));
    }
  });
});

describe("Eis-Stufen — die Stufe erreicht die Mechanik", () => {
  it("Anfrieren: Episch friert mehr Masse an als Normal", () => {
    const gl = lockAt(0);
    const n = resolveTrick(scen({ glacierLocked: gl, ...at(ROLES.ANFRIEREN, 0) }), noCrit);
    const e = resolveTrick(scen({ glacierLocked: gl, ...at(ROLES.ANFRIEREN, 3) }), noCrit);
    expect(e.glacierMass[0]).toBeGreaterThan(n.glacierMass[0]);
  });

  it("Schneetreiben: Episch sät in zwei Felder statt in eins", () => {
    const gl = lockAt(0); // offene Nachbarn von pos0: pos1 (rechts) und pos5 (unten)
    const n = resolveTrick(scen({ glacierLocked: gl, ...at(ROLES.SCHNEETREIBEN, 0) }), noCrit);
    const e = resolveTrick(scen({ glacierLocked: gl, ...at(ROLES.SCHNEETREIBEN, 3) }), noCrit);
    expect(n.firnStack.filter((x) => x > 0)).toHaveLength(1);
    expect(e.firnStack.filter((x) => x > 0)).toHaveLength(2);
  });

  it("Packeis und Verzahnung: die Stufe skaliert die Masse je Durchlauf", () => {
    const run = (role, tier) => {
      let s = scen({ glacierLocked: lockAt(0, 1), oppDeck: oppOf(99), ...at(role, tier) }); // alles verlieren
      for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit);
      return s.glacierMass[0];
    };
    expect(run(ROLES.PACKEIS, 3)).toBeGreaterThan(run(ROLES.PACKEIS, 0));
    expect(run(ROLES.VERZAHNUNG, 3)).toBeGreaterThan(run(ROLES.VERZAHNUNG, 0));
  });

  it("Gletscherzunge: die Stufe senkt die Masse je Wertpunkt, Episch reicht an die Nachbarn weiter", () => {
    const wert = (tier) => resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), ...at(ROLES.GLETSCHERZUNGE, tier) }), noCrit)
      .lastTrick.pValue;
    expect(wert(3)).toBeGreaterThan(wert(0));   // 12/2 gegen 12/6
    // Episch: die NACHBARKARTE (pos1, selbst kein Gletscher) bekommt die Hälfte — auf Normal gar nichts.
    const nachbar = (tier) => {
      let s = scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), ...at(ROLES.GLETSCHERZUNGE, tier) });
      s = resolveTrick(s, noCrit);              // pos0 (der Gletscher)
      return resolveTrick(s, noCrit).lastTrick.pValue; // pos1
    };
    expect(nachbar(3)).toBeGreaterThan(nachbar(0));
  });

  it("Eisbeben: die Stufe hebt das Nachbeben, und nur der Überschuss zählt", () => {
    const locked = new Set([0]);
    const nach = (tier, m) => precomputeGlacier(withMass([[0, m]]), locked,
      iceSnapshotOpts([ROLES.EISBEBEN], iceTuning([ROLES.EISBEBEN], { [ROLES.EISBEBEN]: tier }))).payout[0];
    const roh = (m) => precomputeGlacier(withMass([[0, m]]), locked).payout[0];
    expect(nach(3, 18)).toBeGreaterThan(nach(0, 18)); // Episch bebt stärker nach als Normal
    expect(nach(3, 12)).toBeCloseTo(roh(12), 6);      // genau auf der Schwelle: kein Überschuss, kein Beben
  });

  it("Eisbrücke: die Diagonale zählt nur anteilig, und die Stufe hebt den Anteil", () => {
    const d = posOf(1, 1);
    const mass = withMass([[0, 12], [d, 12]]);
    const burst = (tier) => precomputeGlacier(mass, new Set([0, d]),
      iceSnapshotOpts([ROLES.EISBRUECKE], iceTuning([ROLES.EISBRUECKE], { [ROLES.EISBRUECKE]: tier }))).payout[0];
    const plain = precomputeGlacier(mass, new Set([0, d])).payout[0]; // ohne Brücke: keine Nachbarschaft
    expect(burst(0)).toBeGreaterThan(plain);
    expect(burst(3)).toBeGreaterThan(burst(0));
  });

  it("Einfrieren: die Stufe entscheidet, wie viele Gegnerkarten der Bruch mitnimmt", () => {
    const mid = posOf(1, 1); // Innenfeld: vier Nachbarn, die Episch-Reichweite (5) passt hier ganz hinein
    const frozen = (tier) => {
      let s = scen({ glacierLocked: lockAt(mid), glacierMass: withMass([[mid, 12]]), ...at(ROLES.EINFRIEREN, tier) });
      for (let i = 0; i <= mid; i++) s = resolveTrick(s, noCrit);
      return Object.keys(s.frozenOppPending).length;
    };
    expect(frozen(0)).toBe(EIS.einfrieren[0].cards);
    expect(frozen(3)).toBe(EIS.einfrieren[3].cards);
    // §5.25: die Lage des Gletschers kostet keine Reichweite mehr. Vorher griff der Griff über die Nachbarfelder, und
    // die Ecke pos0 hatte davon nur zwei — die Episch-Stufe kam dort nie an. Jetzt zählt der Griff Karten, nicht Felder.
    let corner = scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), ...at(ROLES.EINFRIEREN, 3) });
    corner = resolveTrick(corner, noCrit);
    expect(Object.keys(corner.frozenOppPending)).toHaveLength(EIS.einfrieren[3].cards);
  });

  it("Eiswall: die Stufe hebt den Zuschlag auf die Kette", () => {
    const row = [0, 1, 2, 3, 4];
    const gm = zeros(); for (const p of row) gm[p] = 12;
    const burst = (tier) => resolveTrick(scen({ glacierMass: gm, glacierLocked: lockAt(...row), ...at(ROLES.EISWALL, tier) }), noCrit)
      .lastTrick.breakdown.glacierDirect;
    expect(burst(3)).toBeGreaterThan(burst(0));
  });

  it("Frostbund und Sprödbruch: die Stufe skaliert Buff und Crit-Chance", () => {
    const buff = (tier) => resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), ...at(ROLES.FROSTBUND, tier) }), noCrit)
      .glacierBuffPending.F1;
    expect(buff(3)).toBeGreaterThan(buff(0));
    // Sprödbruch: die Stufe hebt die Crit-Chance je Punkt Masse — derselbe Wurf trifft erst auf der höheren Stufe.
    const crit = (tier) => resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 10]]), ...at(ROLES.SPROEDBRUCH, tier) }), () => 0.1).crits;
    expect(crit(0)).toBe(0);   // 10 × 0,5 % = 5 %
    expect(crit(3)).toBe(1);   // 10 × 1,5 % = 15 %
  });

  it("Verdichtung, Dauerfrost, Abbruchkante, Gletschersturz: die Stufe steht in der Tuning-Zeile", () => {
    const t = (role, tier) => iceTuning([role], { [role]: tier });
    expect(t(ROLES.VERDICHTUNG, 3).verdichtungPer).toBeGreaterThan(t(ROLES.VERDICHTUNG, 0).verdichtungPer);
    expect(t(ROLES.DAUERFROST, 3).dauerfrostFar).toBeGreaterThan(t(ROLES.DAUERFROST, 0).dauerfrostFar);
    expect(t(ROLES.ABBRUCHKANTE, 3).abbruchTierMult[3]).toBeGreaterThan(t(ROLES.ABBRUCHKANTE, 0).abbruchTierMult[3]);
    expect(t(ROLES.GLETSCHERSTURZ, 3).gletschersturzPer).toBeGreaterThan(t(ROLES.GLETSCHERSTURZ, 0).gletschersturzPer);
  });
});

describe("Eis-Stufen — vom Pick bis in den State", () => {
  it("iceRoleTiers liest die gehaltene Stufe je Rolle; Legendäre und fremde Skills bleiben draußen", () => {
    const tiers = iceRoleTiers([I.ANFRIEREN, I.GROSSE_LAWINE, "SK_FIRE_01"], { [I.ANFRIEREN]: 2, "SK_FIRE_01": 3 });
    expect(tiers).toEqual({ [ROLES.ANFRIEREN]: 2 });
  });

  it("ohne Eintrag gilt Normal — ein Szenario, das nur Rollen setzt, liest die unterste Stufe", () => {
    expect(iceTuning([ROLES.ANFRIEREN], {}).anfrierenMass).toBe(EIS.anfrieren[0].mass);
  });

  it("ein Pick vergibt mehrere Gletscher: die Phase bleibt offen, bis sie aufgebraucht sind (§5.5)", () => {
    // GLACIER_PER_PICK steht per Default auf 1; der Zähler im State ist der Regler, deshalb hier direkt gesetzt.
    let s = { ...initialState(makeRng(1)), phase: "glacier-target", glacierPicksLeft: 3, activeArchetypes: ["ice"] };
    s = reducer(s, { type: "GLACIER_LOCK", pos: 0 });
    expect(s.phase).toBe("glacier-target");
    expect(s.glacierPicksLeft).toBe(2);
    s = reducer(s, { type: "GLACIER_LOCK", pos: 1 });
    s = reducer(s, { type: "GLACIER_LOCK", pos: 2 });
    expect(s.phase).toBe("play");
    expect(s.glacierLocked.filter(Boolean)).toHaveLength(3);
  });

  it("der Gesamt-Deckel begrenzt die Gletscherzahl (§5.5)", () => {
    const locked = new Array(40).fill(false);
    for (let i = 0; i < GLACIER_MAX; i++) locked[i] = true;
    const s = reducer({ ...initialState(makeRng(1)), phase: "glacier-target", glacierPicksLeft: 1, activeArchetypes: ["ice"], glacierLocked: locked },
      { type: "GLACIER_LOCK", pos: GLACIER_MAX + 1 });
    expect(s.glacierLocked.filter(Boolean)).toHaveLength(GLACIER_MAX); // abgelehnt, kein Gletscher mehr
  });

  it("Ewiges Schild hebt den Gesamt-Deckel auf — für jede Quelle, nicht nur für den eigenen Pick (§5.14)", () => {
    const locked = new Array(40).fill(false);
    for (let i = 0; i < GLACIER_MAX; i++) locked[i] = true;
    const voll = { ...initialState(makeRng(1)), phase: "glacier-target", glacierPicksLeft: 1, activeArchetypes: ["ice"], glacierLocked: locked };
    // Ohne Schild bleibt es beim Deckel (der Fall darüber), mit Schild friert dasselbe Feld ein.
    const s = reducer({ ...voll, glacierRoles: [ROLES.L_SCHILD] }, { type: "GLACIER_LOCK", pos: GLACIER_MAX + 1 });
    expect(s.glacierLocked.filter(Boolean)).toHaveLength(GLACIER_MAX + 1);
    // §5.15: die zweite Quelle gibt es nicht mehr — die Eiszeit friert nichts ein, also kann sie den aufgehobenen
    // Deckel auch nicht mehr füllen. Genau das nimmt dem Paar den Faktor-106-Verbund aus §5.14.
    const firn = new Array(40).fill(9);
    expect(eiszeitFlood(firn, locked)).toHaveLength(40);
    expect(locked.filter(Boolean)).toHaveLength(GLACIER_MAX); // die Flut fasst `locked` nicht mehr an
  });

  it("Ewiges Schild friert je Eis-Pick mehrere Felder statt einem — ab dem eigenen Pick (§5.13)", () => {
    const base = { ...initialState(makeRng(1)), phase: "levelup", skills: [], activeArchetypes: [] };
    const ohne = reducer({ ...base, skillOffer: [I.PACKEIS], skillOfferTiers: { [I.PACKEIS]: 0 } }, { type: "PICK_SKILL", skillId: I.PACKEIS });
    expect(ohne.glacierPicksLeft).toBe(GLACIER_PER_PICK);
    // Der Schild-Pick selbst zählt schon doppelt: glacierRoles ist der Stand NACH dem Pick.
    const mit = reducer({ ...base, skillOffer: [I.EWIGES_SCHILD] }, { type: "PICK_SKILL", skillId: I.EWIGES_SCHILD });
    expect(mit.glacierRoles).toContain(ROLES.L_SCHILD);
    expect(mit.glacierPicksLeft).toBe(SCHILD_PER_PICK);
    expect(SCHILD_PER_PICK).toBeGreaterThan(GLACIER_PER_PICK);
    // …und jeder weitere Eis-Pick danach ebenfalls.
    const danach = reducer({ ...mit, phase: "levelup", skillOffer: [I.PACKEIS], skillOfferTiers: { [I.PACKEIS]: 0 }, glacierPicksLeft: 0 }, { type: "PICK_SKILL", skillId: I.PACKEIS });
    expect(danach.glacierPicksLeft).toBe(SCHILD_PER_PICK);
  });

  it("PICK_SKILL legt die gewürfelte Stufe als Rollen-Stufe ab", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", skillOffer: [I.PACKEIS], skillOfferTiers: { [I.PACKEIS]: 2 }, skills: [], activeArchetypes: [] };
    const s1 = reducer(s0, { type: "PICK_SKILL", skillId: I.PACKEIS });
    expect(s1.glacierRoles).toContain(ROLES.PACKEIS);
    expect(s1.glacierRoleTiers[ROLES.PACKEIS]).toBe(2);
  });
});
