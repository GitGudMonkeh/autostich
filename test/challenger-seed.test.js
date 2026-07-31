import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { STAT_IDS } from "../src/game/stats.js";

/* #205 Challenger Mode — seedbare Runs (Schicht A).
   Kern-Invarianten der adressierten Sub-Ströme:
   (a) Reproduzierbarkeit: gleicher Seed + gleiche Picks → bit-identischer End-State (Replay/Nachspielen).
   (b) Build-Unabhängigkeit: der Start-Deal und die Angebots-Slots sind adressiert (seed,cycle,kind) —
       ein anderer (früher) Build verschiebt sie NICHT; sie weichen nur ab, wo die Pools sich unterscheiden.
   (c) Der Seed steuert den Deal, NICHT der als action.rng injizierte rng (der ist im Seed-Pfad inert). */

// Kompakter Voll-Run-Treiber mit gesetztem Seed (Shop-Pfad wie im Sim; randomPolicy deckt alle Phasen ab).
// `policySeed` steuert die (deterministischen) Entscheidungen der Policy, `seed` die Spiel-Glückslandschaft.
function runSeeded(seed, policySeed) {
  const rng = makeRng(policySeed);
  const policy = randomPolicy();
  let s = reducer(null, { type: "START_RUN", rng, seed });
  let guard = 0;
  while (s.phase !== "gameover") {
    if (++guard > 2_000_000) throw new Error(`guard bei Phase ${s.phase}`);
    if (s.phase === "play") s = reducer(s, { type: "RESOLVE_TRICK", rng });
    else s = reducer(s, policy.act(s, rng));
  }
  return s;
}

// Fingerprint der für einen Replay-Vergleich relevanten End-State-Felder.
const fp = (s) => JSON.stringify({
  score: s.score, cycles: s.cycle, tricks: s.trickNo, wins: s.wins, losses: s.losses, ties: s.ties,
  crits: s.crits, bestStreak: s.bestStreak, perks: s.perks, skills: s.skills,
  playerOrder: s.playerOrder, deck: s.deck.map((c) => c.value),
});

describe("#205 (a) Reproduzierbarkeit — gleicher Seed + gleiche Picks → bit-identisch", () => {
  it("zwei Voll-Runs mit gleichem Seed + gleicher Policy sind identisch", () => {
    expect(fp(runSeeded(0x51EED01, 42))).toBe(fp(runSeeded(0x51EED01, 42)));
  });
  it("anderer Seed → anderer Lauf (Score weicht ab)", () => {
    const a = runSeeded(0x51EED01, 42);
    const b = runSeeded(0x51EED02, 42);
    expect(a.score).not.toBe(b.score);
  });
});

// Spielt Durchlauf 1 (Stat-Pick + alle Stiche) und liefert das FRISCHE Perk-Angebot vor Durchlauf 2
// (DECISION_SCHEDULE[1] === "perk"). Der Stat-Pick (statIdx) macht die beiden Builds ab Zug 1 verschieden.
function firstPerkOffer(seed, statIdx) {
  const rng = makeRng(1); // Policy-rng irrelevant — Picks sind hier fest vorgegeben
  let s = reducer(null, { type: "START_RUN", rng, seed });
  s = reducer(s, { type: "PICK_STAT", statId: STAT_IDS[statIdx], rng });
  let guard = 0;
  while (s.phase === "play") { if (++guard > 100000) throw new Error("kein Perk-Angebot"); s = reducer(s, { type: "RESOLVE_TRICK", rng }); }
  expect(s.phase).toBe("levelup");
  return s.offer;
}

describe("#205 (b) Build-Unabhängigkeit — adressierte Slots", () => {
  it("Start-Deal ist identisch bei gleichem Seed, egal welcher action.rng injiziert wird", () => {
    const s1 = reducer(null, { type: "START_RUN", seed: 42, rng: () => 0.1 });
    const s2 = reducer(null, { type: "START_RUN", seed: 42, rng: () => 0.9 });
    expect(s1.playerOrder).toEqual(s2.playerOrder);
    expect(s1.oppOrder).toEqual(s2.oppOrder);
    expect(s1.seed).toBe(42);
  });
  it("Start-Deal weicht bei anderem Seed ab", () => {
    const s1 = reducer(null, { type: "START_RUN", seed: 1, rng: Math.random });
    const s2 = reducer(null, { type: "START_RUN", seed: 2, rng: Math.random });
    expect(s1.oppOrder).not.toEqual(s2.oppOrder);
  });
  it("erstes Perk-Angebot ist gleich, obwohl die Builds unterschiedlich starten (Slot adressiert, Pool gleich)", () => {
    expect(firstPerkOffer(777, 3)).toEqual(firstPerkOffer(777, 0));
  });
  it("erstes Perk-Angebot weicht bei anderem Seed ab", () => {
    expect(firstPerkOffer(778, 0)).not.toEqual(firstPerkOffer(777, 0));
  });
});

describe("#205 (c) Sim/Alt-Verhalten unberührt — seed == null nutzt action.rng", () => {
  it("ohne seed bleibt seed null (unseeded Pfad, Sim byte-identisch)", () => {
    const s = reducer(null, { type: "START_RUN", rng: Math.random });
    expect(s.seed).toBe(null);
    expect(s.offerRerolls).toBe(0);
  });
});
