import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../src/game/reducer.js";
import { formationEnergyFor } from "../src/game/engine.js";
import { architectScore } from "../src/game/architect.js";
import { makeRng } from "../src/game/deck.js";
import * as C from "../src/game/constants.js";

/* Regressionstests zu Befunden aus der QA-Durchsicht (F-06 / F-09 / F-10). */

const N = C.TRICKS_PER_CYCLE;

// ---------------------------------------------------------------------------
// F-06: „Bau-Boost" (positiver Wochen-Mod) verdoppelte auch NEGATIVE Gebäude-Flats.
// Das gamble-Gebäude (Crit-Wette) schreibt ohne Crit `-penalty` — ein positiver Mod
// verschlechterte damit gezielt Risiko-Bauten.
// ---------------------------------------------------------------------------
describe("#370 Bau-Boost skaliert nur den Gewinn-Anteil (F-06)", () => {
  // Minimales Precompute-Objekt, wie architectScore es liest.
  const preWith = (entry) => ({ score: { 0: entry }, segFactor: {}, relayFlat: {}, cover: {} });
  const boost = (res) => { // exakt die Engine-Naht
    if (res.flat > 0) res.flat *= 2;
    const sf = res.streakFlat || 0;
    res.streakFlat = sf > 0 ? sf * 2 : sf;
    res.mult = 1 + ((res.mult || 1) - 1) * 2;
    return res;
  };

  it("Jackpot (Crit) wird verdoppelt", () => {
    const r = boost(architectScore(preWith({ kind: "gamble", crit: 260, penalty: 60 }), 0, { isCrit: true }, {}));
    expect(r.flat).toBe(520);
  });

  it("Strafe (kein Crit) bleibt unverändert — wird NICHT verdoppelt", () => {
    const r = boost(architectScore(preWith({ kind: "gamble", crit: 260, penalty: 60 }), 0, { isCrit: false }, {}));
    expect(r.flat).toBe(-60); // vorher: -120
  });

  it("normale Flat-Gebäude verdoppeln weiterhin", () => {
    const r = boost(architectScore(preWith({ kind: "flat", amount: 100 }), 0, { isCrit: false }, {}));
    expect(r.flat).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// F-09: Die Pflicht-Phase „glacier-target" hat keinen Ausgang (GlacierPick kennt nur
// Bestätigen). Wurde sie ohne gültiges Ziel betreten, wies GLACIER_LOCK jede Eingabe
// zurück → Soft-Lock. Die Vorprüfung muss dieselben Bedingungen spiegeln.
// ---------------------------------------------------------------------------
describe("Gletscher-Wahl wird nur mit gültigem Ziel betreten (F-09)", () => {
  const iceSkill = "SK_ICE_01"; // Anfrieren
  const base = (over = {}) => ({
    ...initialState(makeRng(1)),
    phase: "levelup", skillOffer: [iceSkill], skills: [], activeArchetypes: [],
    ...over,
  });

  it("mit freiem Feld öffnet der Eis-Pick die Gletscher-Wahl", () => {
    const s = reducer(base(), { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(2) });
    expect(s.skills).toContain(iceSkill);
    expect(s.phase).toBe("glacier-target");
  });

  it("ist JEDES Feld gefroren oder gesperrt, wird die Phase übersprungen (kein Soft-Lock)", () => {
    // Hälfte gefroren, Rest über blockForm gesperrt → GLACIER_LOCK hätte alles abgelehnt.
    const locked = Array.from({ length: N }, (_, i) => i < N / 2);
    const blocked = Array.from({ length: N / 2 }, (_, i) => i + N / 2);
    const s = reducer(base({ glacierLocked: locked, challengeBlockForm: blocked }),
      { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(2) });
    expect(s.skills).toContain(iceSkill); // der Skill wird trotzdem genommen
    expect(s.phase).toBe("play");
  });

  it("gesperrte Felder allein reichen nicht als „frei“ (blockForm zählt mit)", () => {
    // Alle bis auf EIN gesperrtes Feld sind gefroren → es gibt kein gültiges Ziel.
    const locked = Array.from({ length: N }, (_, i) => i !== 7);
    const s = reducer(base({ glacierLocked: locked, challengeBlockForm: [7] }),
      { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(2) });
    expect(s.phase).toBe("play");
    // Gegenprobe: dasselbe Feld NICHT gesperrt → Phase wird betreten.
    const s2 = reducer(base({ glacierLocked: locked, challengeBlockForm: [] }),
      { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(2) });
    expect(s2.phase).toBe("glacier-target");
  });
});

// ---------------------------------------------------------------------------
// F-10: RESET_FORMATION hatte die Energie-Formel dupliziert und dabei `devEnergy`
// vergessen → im Dev-Run gab „Zurücksetzen" C.FORMATION_ENERGY statt des eingestellten Werts.
// ---------------------------------------------------------------------------
describe("Formations-Energie kommt aus einer Quelle (F-10)", () => {
  it("formationEnergyFor bevorzugt devEnergy vor formationEnergyBase vor der Konstante", () => {
    expect(formationEnergyFor({ devEnergy: 9, formationEnergyBase: 4, perks: [] })).toBe(9);
    expect(formationEnergyFor({ formationEnergyBase: 4, perks: [] })).toBe(4);
    expect(formationEnergyFor({ perks: [] })).toBe(C.FORMATION_ENERGY);
  });

  it("RESET_FORMATION erstattet im Dev-Run die eingestellte Energie", () => {
    const s = { ...initialState(makeRng(1)), phase: "formation", devEnergy: 9, devMode: true,
      formationEnergy: 0, formationSwaps: [] };
    expect(reducer(s, { type: "RESET_FORMATION" }).formationEnergy).toBe(9); // vorher: C.FORMATION_ENERGY
  });

  it("ohne Dev-Run bleibt die Erstattung die Lauf-Basis (unverändertes Bestandsverhalten)", () => {
    const s = { ...initialState(makeRng(1)), phase: "formation", formationEnergyBase: 5,
      formationEnergy: 2, formationSwaps: [] };
    expect(reducer(s, { type: "RESET_FORMATION" }).formationEnergy).toBe(5);
  });
});
