import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { SKILL_DEFS } from "../src/game/skills.js";
import { MAX_CYCLES, FORMATION_ENERGY, TRICKS_PER_CYCLE, DECISION_SCHEDULE, SCORE_PER_WIN, CRIT_BASE_MULT, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_CRIT_MULT_PER_SKILL,
  HENKER_MULT, HENKER_ZONE_START, BRENNPUNKT_MULT, VABANQUE_SCORE, VABANQUE_TRICKS, VABANQUE_MAX_PAYOUTS, PATT_MARGIN, ECHO_FACTOR, SAMMLER_STEP, UNAUFHALTSAM_VALUE,
  ZINS_DEPOSIT, ZINS_RATE_START, ZINS_RATE_STEP, ZINS_RATE_MAX, ZINS_CRASH_KEEP,
  SERIESCRIT_STEP, CONSUME_SCORE, BLITZABLEITER_CONSUME_CHARGE, DAUERSTROM_CONSUME_CRIT, ION_SCORE_PER_STACK,
  REST_CHARGE_FLOOR, STORM_CRIT_STEP, ENTLADUNG_MULT_STEP, ENTLADUNG_MULT_CAP } from "../src/game/constants.js";
import { computeFormations } from "../src/game/formations.js";
import { streakBaseMult, isLegendary, zinsHurdle } from "../src/game/perks.js";
import { precomputeArchitect } from "../src/game/architect.js";

// --- Test-Helfer: konstante Decks, damit Ausgänge deterministisch erzwingbar sind ---
// Farben zyklisch (R/B/G/Y) → gleicher Wert bildet nur eine Wiederholung (1 Formation), KEINEN Farbblock,
// damit der Überlappungsbonus (#95) die wertbasierten Score-Tests nicht verfälscht.
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
// #158: Springt `over.pos` auf > 0, laufen die Stiche mit state.formations aus initialState (die Engine rechnet
// Formationen nur bei pos === 0 neu) — für die Score-/Positions-Tests hier gewollt (keine Formation soll stören).
// Wer eine Formation an einer bestimmten Position braucht, muss sie in `over.formations` explizit mitliefern.
function scenario(pVal, oVal, over = {}) {
  return {
    ...initialState(makeRng(1)),
    deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(),
    ...over,
  };
}
const rng = makeRng(9);
const B = SCORE_PER_WIN; // Basis-relativ: erwartete Scores skalieren mit der Sieg-Basis (Pacing-Pass 100→400)

// Formationsneutrales Spielerdeck (Werte 12/11 abwechselnd, Farbe R/B abwechselnd): gewinnt immer gegen
// Wert 0, bildet aber über die Positionen KEINE Formation → isoliert Score-Mechaniken in Multi-Stich-Tests.
// Gleiche Farbe (R), aber abwechselnde Werte → Farbserie zählt, ohne Wiederholung/Farbblock (bei ≤2 Karten).
// #267: der entfernte Crit-Stat wird als reine Crit-CHANCE-Quelle über den Blitz-Spannungsstau ersetzt. Ein blank
// aktiver Blitz OHNE Skills/ionisierte Karten trägt exakt 0,05 (Sockel) + stauBonus zur rawCrit bei — sonst NICHTS
// (kein Score, kein Crit-Mult, keine Ladung). litCrit(V) hebt die rawCrit damit auf genau V → Drop-in für den alten
// additiven statCritChance:V (der Kritwurf bleibt rng()<V; makeRng-Wert <1 ⇒ V≥1 crittet garantiert).
const litCrit = (v = 1) => ({ active: true, charge: 0, maxCharge: 10, stauBonus: v - 0.05 });

describe("resolveTrick — Grundausgänge (V2: ohne Leben)", () => {
  it("Sieg: +Score, +Sieg, Initiative Spieler", () => {
    const s = resolveTrick(scenario(12, 0), rng);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(0);
    expect(s.score).toBeCloseTo(B * 1.02); // Basis × streakBaseMult(1)=1,02 (#39)
    expect(s.winStreak).toBe(1);
    expect(s.lastResult).toBe("win");
    expect(s.initiative).toBe("player");
  });

  it("Niederlage: kein Schaden mehr, Serie reißt, Initiative Gegner", () => {
    const s = resolveTrick(scenario(0, 12, { winStreak: 4 }), rng);
    expect(s.losses).toBe(1);
    expect(s.winStreak).toBe(0);
    expect(s.lastResult).toBe("loss");
    expect(s.initiative).toBe("opp");
    expect(s.score).toBe(0);
  });

  it("Gleichstand: kein Score, Initiative unverändert", () => {
    const s = resolveTrick(scenario(5, 5, { initiative: "player" }), rng);
    expect(s.ties).toBe(1);
    expect(s.score).toBe(0);
    expect(s.initiative).toBe("player");
  });

  it("lastTrick.breakdown: Basis 100 und die Faktoren multiplizieren exakt auf gained (§17)", () => {
    const s = resolveTrick(scenario(12, 0, { lightning: litCrit(1) }), rng); // erzwungener Crit → critMult > 1
    const b = s.lastTrick.breakdown;
    expect(b.base).toBe(B);
    expect(b.critMult).toBeGreaterThan(1);
    expect((b.base + b.flats) * b.streakMult * b.perkMult * b.formMult * b.critMult + (b.fireDirect || 0) + (b.iceDirect || 0) + (b.lightDirect || 0) + (b.plantDirect || 0)).toBeCloseTo(b.total); // + Glut-/Eis-/Blitz-/Pflanze-Dividende (direkt, am Stack vorbei)
    expect(b.total).toBeCloseTo(s.lastTrick.gained);
  });
  it("lastTrick.breakdown ist null bei Niederlage/Gleichstand", () => {
    expect(resolveTrick(scenario(0, 12), rng).lastTrick.breakdown).toBe(null);
    expect(resolveTrick(scenario(5, 5), rng).lastTrick.breakdown).toBe(null);
  });

  // Treffer-Identitäten (nur Anzeige): Feuer (100 % Hitze), Pflanze (voll gewachsene grüne Karte), Blitz (5-Stapel-Ion).
  // Mehrere zugleich möglich → als Liste geführt.
  describe("lastTrick.hitTypes — Score-Float-Identitäten (mehrfach möglich)", () => {
    const greenDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `G${i}`, suit: "G", baseRank: v, value: v, green: true }));
    const ionDeck = (v, stacks) => Array.from({ length: 40 }, (_, i) => ({ id: `I${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v, ionStacks: stacks }));
    it("Feuer: Sieg bei voller Hitze (100 %)", () => {
      const s = resolveTrick(scenario(12, 0, { heat: { active: true, value: 100, max: 100 } }), rng);
      expect(s.lastTrick.hitTypes).toEqual(["fire"]);
    });
    it("Pflanze: Sieg mit voll ausgewachsener grüner Karte (Wert am Deckel)", () => {
      const s = resolveTrick(scenario(0, 0, { deck: greenDeck(11), oppDeck: constDeck(0) }), rng);
      expect(s.lastTrick.result).toMatch(/^win/);
      expect(s.lastTrick.hitTypes).toEqual(["plant"]);
    });
    it("Blitz: Sieg mit voll ionisierter Karte (5 Stapel)", () => {
      const s = resolveTrick(scenario(0, 0, { deck: ionDeck(12, 5), oppDeck: constDeck(0) }), rng);
      expect(s.lastTrick.hitTypes).toEqual(["lightning"]);
    });
    it("Eis: Sieg eines Gletschers (Siegkarte auf festgefrorenem Gletscher-Feld)", () => {
      const lockedAt0 = Array.from({ length: 40 }, (_, i) => i === 0);
      const s = resolveTrick(scenario(12, 0, { activeArchetypes: ["ice"], glacierLocked: lockedAt0, glacierMass: Array(40).fill(0), glacierRoles: [] }), rng);
      expect(s.lastTrick.hitTypes).toEqual(["ice"]);
      // Sieg auf einem NICHT-Gletscher-Feld trägt kein Eis
      const s2 = resolveTrick(scenario(12, 0, { activeArchetypes: ["ice"], glacierLocked: Array(40).fill(false), glacierMass: Array(40).fill(0), glacierRoles: [] }), rng);
      expect(s2.lastTrick.hitTypes).toEqual([]);
    });
    it("normaler Sieg ohne Auslöser → leer; unter den Schwellen auch leer", () => {
      expect(resolveTrick(scenario(12, 0), rng).lastTrick.hitTypes).toEqual([]);
      expect(resolveTrick(scenario(0, 0, { deck: greenDeck(10), oppDeck: constDeck(0) }), rng).lastTrick.hitTypes).toEqual([]); // grün, aber unter dem Deckel (10 < 11)
      expect(resolveTrick(scenario(0, 0, { deck: ionDeck(12, 4), oppDeck: constDeck(0) }), rng).lastTrick.hitTypes).toEqual([]); // 4 < 5 Stapel
    });
    it("Niederlage trägt nie eine Treffer-Identität", () => {
      expect(resolveTrick(scenario(0, 12, { heat: { active: true, value: 100, max: 100 } }), rng).lastTrick.hitTypes).toEqual([]);
    });
    it("mehrere zugleich: voll gewachsene grüne, voll ionisierte Karte bei voller Hitze → alle drei", () => {
      const deck = Array.from({ length: 40 }, (_, i) => ({ id: `M${i}`, suit: "G", baseRank: 11, value: 11, green: true, ionStacks: 5 }));
      const s = resolveTrick(scenario(0, 0, { deck, oppDeck: constDeck(0), heat: { active: true, value: 100, max: 100 } }), rng);
      expect(s.lastTrick.hitTypes).toEqual(["fire", "plant", "lightning"]);
    });
  });

  it("wins + losses + ties == trickNo (nichts geht verloren)", () => {
    let s = initialState(makeRng(42));
    for (let i = 0; i < 60 && s.phase !== "gameover"; i++) {
      if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null, skillOffer: null, statOffer: null }; continue; }
      if (s.phase === "formation") { s = { ...s, phase: "play" }; continue; }
      s = resolveTrick(s, makeRng(100 + i));
    }
    expect(s.wins + s.losses + s.ties).toBe(s.trickNo);
  });

  it("bestStreak hält die längste Serie, auch nach einem Serienabbruch (#8)", () => {
    const deck = [12, 12, 12, 0].map((v, i) => ({ id: `p${i}`, suit: "R", baseRank: v, value: v }));
    const opp  = [0, 0, 0, 12].map((v, i) => ({ id: `o${i}`, suit: "R", baseRank: v, value: v }));
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3] };
    for (let i = 0; i < 4; i++) s = resolveTrick(s, rng); // Sieg, Sieg, Sieg, Niederlage
    expect(s.wins).toBe(3);
    expect(s.winStreak).toBe(0);   // letzter Stich verloren
    expect(s.bestStreak).toBe(3);  // Serie bleibt gemerkt
  });
});

// D-Score-Perks sind zu Familien migriert (#167) — die Engine-Integration testet test/families-engine.test.js
// (u. a. D_FORMATION_BONUS mit Formations-Mult und D_STREAK über mehrere Stiche).

describe("resolveTrick — Crit & globale Score-Formel (ohne Tempo)", () => {
  it("additive Boni (Familie D_TENTH_WIN) fließen in die Basis und werden mitmultipliziert", () => {
    // 10. Sieg → D_TENTH_WIN II +800: (Basis+800)×streakBaseMult(1)=1,02
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_TENTH_WIN: 2 }, wins: 9 }), rng);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo((B + 800) * 1.02);
  });

  it("Crit multipliziert den vollen scoreBeforeCrit mit dem Basis-Crit-Multiplikator", () => {
    // Crit-Chance 1 (Blitz-Stau) → garantierter Crit (verbraucht rng). scoreBeforeCrit = Basis×1,02, ×CRIT_BASE_MULT mit Crit.
    const s = resolveTrick(scenario(12, 0, { lightning: litCrit(1) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * CRIT_BASE_MULT);
    expect(s.lastTrick.critBonus).toBeCloseTo(B * 1.02 * (CRIT_BASE_MULT - 1));
  });

  it("Niederlagen und Gleichstände lösen keinen Crit aus", () => {
    const loss = resolveTrick(scenario(0, 12, { lightning: litCrit(1) }), rng);
    expect(loss.lastTrick.isCrit).toBe(false);
    expect(loss.crits).toBe(0);
    const tie = resolveTrick(scenario(5, 5, { lightning: litCrit(1) }), rng);
    expect(tie.lastTrick.isCrit).toBe(false);
  });

  it("eine Crit-Chance-Quelle (Crit-Chance 1) erzwingt einen Crit bei jedem Sieg; ohne Quelle nie", () => {
    expect(resolveTrick(scenario(12, 0, { lightning: litCrit(1) }), rng).lastTrick.isCrit).toBe(true);
    expect(resolveTrick(scenario(12, 0), () => 0.99).lastTrick.isCrit).toBe(false); // keine Crit-Quelle → rawCrit 0
  });

  it("crits, critBonusScore und bestTrickScore werden geführt", () => {
    const s = resolveTrick(scenario(12, 0, { lightning: litCrit(1) }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(B * 1.02 * (CRIT_BASE_MULT - 1)); // Crit-Bonus = Basis×1,02×0,5
    expect(s.bestTrickScore).toBeCloseTo(B * 1.02 * CRIT_BASE_MULT);
  });
});

describe("Legendäre Perks — Engine-Integration (V2 §22.6 L)", () => {
  it("L2 Unaufhaltsam: flach +UNAUFHALTSAM_VALUE solange die Serie läuft (kein Wert-Snowball), 0 ohne Serie (#115)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["L2"], winStreak: 3 }), rng).lastTrick.pValue).toBe(12 + UNAUFHALTSAM_VALUE);
    expect(resolveTrick(scenario(12, 0, { perks: ["L2"], winStreak: 9 }), rng).lastTrick.pValue).toBe(12 + UNAUFHALTSAM_VALUE); // flach — kein Snowball
    expect(resolveTrick(scenario(12, 0, { perks: ["L2"], winStreak: 0 }), rng).lastTrick.pValue).toBe(12);                      // Serie 0 → kein Bonus
  });
  it("L6 Raserei: +5 % Crit-Chance je Serienpunkt, KEIN Wertbonus mehr (#115)", () => {
    const t = (ws) => resolveTrick(scenario(12, 0, { perks: ["L6"], winStreak: ws }), rng).lastTrick;
    expect(t(3).pValue).toBe(12);              // entsnowballt: kein cardBonus mehr
    expect(t(4).critChance).toBeCloseTo(0.25); // Serie 5 (post-win) → 0,25
    expect(t(24).critChance).toBeCloseTo(1);   // Serie 25 → 1,25, geklemmt auf 1
  });
  it("L6 Raserei: Gesamt-Crit-Überschuss über 100 % wird additiv zu Crit-Schaden (max +100 %, total-aware) (#115)", () => {
    const cm = (ws, over = {}) => resolveTrick(scenario(12, 0, { perks: ["L6"], winStreak: ws, ...over }), rng).lastTrick.critMultiplier;
    expect(cm(9)).toBeCloseTo(CRIT_BASE_MULT);               // Serie 10 → rawCrit 0,5 < 1 → nur Basis
    expect(cm(29)).toBeCloseTo(CRIT_BASE_MULT + 0.5);        // Serie 30 → rawCrit 1,5 → +0,5
    expect(cm(49)).toBeCloseTo(CRIT_BASE_MULT + 1.0);        // Serie 50 → rawCrit 2,5 → +1,0 (Cap)
    expect(cm(6, { lightning: litCrit(0.7) })).toBeCloseTo(CRIT_BASE_MULT + 0.05); // total-aware: Serie 7 → 0,35 + 0,70 = 1,05 → +0,05
  });
  it("L4 Kritische Masse: Crit gibt der Karte dauerhaft +1 (max +4)", () => {
    const deck = [{ id: "a", suit: "R", baseRank: 5, value: 5 }];
    const opp = [{ id: "o", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0], oppOrder: [0], perks: ["L4"], lightning: litCrit(1) };
    s = resolveTrick(s, rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.deck[0].value).toBe(6); // 5 +1
    expect(s.l4Boost.a).toBe(1);
    // Deckel: schon +4 → kein weiterer Zuwachs.
    const capped = resolveTrick({ ...s, l4Boost: { a: 4 }, deck: [{ id: "a", suit: "R", baseRank: 9, value: 9 }], playerOrder: [0], pos: 0 }, rng);
    expect(capped.deck[0].value).toBe(9);
  });
  it("L_HENK Henker: Segment-Finale (Pos 36–40) erzwingt Crit UND verdoppelt den Stich (#203)", () => {
    const end = resolveTrick(scenario(12, 0, { perks: ["L_HENK"], pos: HENKER_ZONE_START + 1 }), () => 0.99); // rng 0.99, 0 Crit-Chance
    expect(end.lastTrick.isCrit).toBe(true);                                          // garantierter Crit trotz 0 Chance
    expect(end.lastTrick.scoreBeforeCrit).toBeCloseTo(B * streakBaseMult(1) * HENKER_MULT); // ×2 im Score-Stack
    const early = resolveTrick(scenario(12, 0, { perks: ["L_HENK"], pos: 10 }), () => 0.99); // außerhalb der Zone
    expect(early.lastTrick.isCrit).toBe(false);
    expect(early.lastTrick.scoreBeforeCrit).toBeCloseTo(B * streakBaseMult(1));       // kein ×2
  });
  it("L_BRENN Brennpunkt: Sieg in ≥3 gleichzeitigen Formationen verdoppelt den Stich (#203)", () => {
    const forms = identity().map(() => ({ mult: 1, formations: [] }));
    forms[5] = { mult: 2, baseMult: 2, formations: [{ type: "treppe", factor: 1.5 }, { type: "wiederholung", factor: 1.3 }, { type: "farbblock", factor: 1.2 }] };
    forms[6] = { mult: 1.5, baseMult: 1.5, formations: [{ type: "treppe", factor: 1.5 }, { type: "wiederholung", factor: 1.3 }] };
    const withB = resolveTrick(scenario(12, 0, { perks: ["L_BRENN"], pos: 5, formations: forms }), rng).lastTrick;
    const noB   = resolveTrick(scenario(12, 0, { pos: 5, formations: forms }), rng).lastTrick;
    expect(withB.scoreBeforeCrit).toBeCloseTo(noB.scoreBeforeCrit * BRENNPUNKT_MULT); // Tiefe 3 → ×2
    const two   = resolveTrick(scenario(12, 0, { perks: ["L_BRENN"], pos: 6, formations: forms }), rng).lastTrick;
    const twoNo = resolveTrick(scenario(12, 0, { pos: 6, formations: forms }), rng).lastTrick;
    expect(two.scoreBeforeCrit).toBeCloseTo(twoNo.scoreBeforeCrit);                   // nur 2 Formationen → kein Brennpunkt
  });
  it("L_PATT Patt: eine Niederlage um ≤ PATT_MARGIN Wert zählt als Sieg (#203)", () => {
    const win = resolveTrick(scenario(12 - PATT_MARGIN, 12, { perks: ["L_PATT"] }), rng); // Rückstand = Marge → Sieg
    expect(win.lastTrick.result).toBe("win");
    expect(win.wins).toBe(1);
    const loss = resolveTrick(scenario(12 - PATT_MARGIN - 1, 12, { perks: ["L_PATT"] }), rng); // Rückstand > Marge → Niederlage
    expect(loss.lastTrick.result).toBe("loss");
    const noPatt = resolveTrick(scenario(12 - PATT_MARGIN, 12, {}), rng);              // ohne Patt → Niederlage
    expect(noPatt.lastTrick.result).toBe("loss");
  });
  it("L_VAB Vabanque: erste VABANQUE_TRICKS Stiche eines Durchlaufs in Folge → +VABANQUE_SCORE, je Lauf gedeckelt (#203)", () => {
    // TRICKS-ter Stich (pos = TRICKS−1) als TRICKS-ter Sieg in Folge (cycleWins TRICKS−1 → TRICKS) → Payout + Zähler hoch.
    const paid = resolveTrick(scenario(12, 0, { perks: ["L_VAB"], pos: VABANQUE_TRICKS - 1, cycleWins: VABANQUE_TRICKS - 1, vabanquePaid: 0 }), rng);
    expect(paid.lastTrick.breakdown.perkDirect).toBe(VABANQUE_SCORE);
    expect(paid.vabanquePaid).toBe(1);
    // Serie vorher gerissen (cycleWins < TRICKS am TRICKS-ten Stich) → kein Payout.
    const voided = resolveTrick(scenario(12, 0, { perks: ["L_VAB"], pos: VABANQUE_TRICKS - 1, cycleWins: VABANQUE_TRICKS - 2, vabanquePaid: 0 }), rng);
    expect(voided.lastTrick.breakdown.perkDirect).toBe(0);
    // Lauf-Deckel erreicht → kein weiterer Payout trotz erfüllter Eröffnung (Anti-Front-Load-Exploit).
    const capped = resolveTrick(scenario(12, 0, { perks: ["L_VAB"], pos: VABANQUE_TRICKS - 1, cycleWins: VABANQUE_TRICKS - 1, vabanquePaid: VABANQUE_MAX_PAYOUTS }), rng);
    expect(capped.lastTrick.breakdown.perkDirect).toBe(0);
  });
});

describe("rollCrit", () => {
  it("0 % (oder ≤0) löst nie aus", () => {
    expect(rollCrit(0, false, () => 0)).toBe(false);
  });
  it("garantiert überschreibt den Wurf", () => {
    expect(rollCrit(0, true, () => 0.99)).toBe(true);
  });
  it("100 % löst immer aus; Chance wird bei 100 % gedeckelt", () => {
    expect(rollCrit(1, false, () => 0.9999)).toBe(true);
    expect(rollCrit(1.5, false, () => 0.99)).toBe(true); // >1 → auf 1 gedeckelt
  });
  it("würfelt gegen die Chance", () => {
    expect(rollCrit(0.3, false, () => 0.2)).toBe(true);
    expect(rollCrit(0.3, false, () => 0.5)).toBe(false);
  });
  it("#229 N8: wirft ohne injizierte rng (kein stiller Math.random-Fallback)", () => {
    expect(() => rollCrit(0.5, false)).toThrow(/rng muss injiziert werden/);
  });
});

describe("resolveTrick — rng-Pflicht (#229 N8)", () => {
  it("wirft im Play ohne injizierte rng, bleibt aber außerhalb Play ein rng-freies No-op", () => {
    expect(() => resolveTrick(scenario(12, 0))).toThrow(/rng muss injiziert werden/); // play → rng nötig
    const notPlay = { ...scenario(12, 0), phase: "levelup" };
    expect(resolveTrick(notPlay)).toBe(notPlay); // Nicht-Play → No-op ohne rng
  });
});

describe("resolveTrick — Durchlauf-Ende & persistente Reihenfolge (V2)", () => {
  it("Durchlauf-Ende (40 Stiche): cycle++, pos 0, Perk-Angebot → levelup", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.pos).toBe(0);            // neu gemischt (Gegner) + pos zurück
    expect(s.phase).toBe("levelup");  // Perk-Auswahl nach der Runde
    expect(s.offer).toHaveLength(3);
  });

  it("Spieler-Reihenfolge bleibt persistent; nur das Gegnerdeck wird neu gemischt (§22.1)", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39 }), makeRng(3));
    expect(s.playerOrder).toEqual(identity());                          // persistent — kein Re-Shuffle
    expect(s.oppOrder).not.toEqual(identity());                        // Gegner neu gemischt
    expect([...s.oppOrder].sort((a, b) => a - b)).toEqual(identity()); // … aber eine Permutation
  });

  it("#98: temporäre Positions-Boni (Relay-Queue) bluten nicht in den nächsten Durchlauf", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, successorQueue: [2, 2] }), rng);
    expect(s.cycle).toBe(1);
    expect(s.successorQueue).toEqual([]); // am Durchlauf-Ende geleert → Position 1 des Folgedurchlaufs erbt nichts
  });

  it("Run-Ende nach MAX_CYCLES Durchläufen → gameover, kein Angebot (der letzte Sieg zählt noch)", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: MAX_CYCLES - 1, score: 5000 }), rng);
    expect(s.cycle).toBe(MAX_CYCLES);
    expect(s.phase).toBe("gameover");
    expect(s.offer).toBeNull();
    expect(s.score).toBeCloseTo(5000 + B * 1.02); // 5000 + Basis × 1,02
  });

  it("ist deterministisch bei gleichem Seed", () => {
    const run = (seed) => {
      let s = initialState(makeRng(seed));
      for (let i = 0; i < 40; i++) {
        if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null, skillOffer: null, statOffer: null }; continue; }
        if (s.phase === "formation") { s = { ...s, phase: "play" }; continue; }
        if (s.phase === "gameover") break;
        s = resolveTrick(s, makeRng(seed * 1000 + i));
      }
      return s.score;
    };
    expect(run(5)).toBe(run(5));
    // #156: gleicher-Seed-Gleichheit allein bestünde auch ein konstanter Stub — der Seed muss die Ausgabe TREIBEN.
    expect(new Set([run(5), run(6), run(7), run(11)]).size).toBeGreaterThan(1);
  });

  it("#137: Formationsphasen-Eintritt rechnet mit shop.permanentEffects + anchors (nicht erst nach dem ersten Tausch)", () => {
    // constDeck(5): Wert 5 überall → in jedem Segment eine Wiederholung. Formationsanker (A5) auf Pos 0 +
    // Formationskern (regeländernder Shop-Effekt). Vor dem Fix wurden beide beim Eintritt ignoriert (Default []/{}).
    expect(DECISION_SCHEDULE[2]).toBe("formation"); // Sanity: cycle 1 → 2 löst die Formationsphase aus (#267 45-Plan)
    const anchors = [{ type: "formation", position: 0 }];
    const shop = { coins: 0, anchors };
    const s = resolveTrick(scenario(5, 0, { cycle: 1, pos: TRICKS_PER_CYCLE - 1, shop }), makeRng(2));
    expect(s.phase).toBe("formation");
    // Beim Eintritt gerenderte Formationen == vollständige Berechnung (mit anchors + familyTiers), NICHT die argument-lose.
    expect(s.formations).toEqual(computeFormations(s.playerOrder, s.deck, s.roles, s.perks, s.skills, anchors, s.familyTiers));
    // Konkret: der Formationsanker auf Pos 0 ist SOFORT da (regressierte vorher bis zum ersten Tausch).
    expect(s.formations[0].formations.some((f) => f.type === "anker")).toBe(true);
  });
});

describe("Historie-Rares — Engine (#71 Phase 2b)", () => {
  // B8 Revanche als Familie B_REVENGE (inkl. III Zwei-Karten-Queue) — Tests in families-engine.test.js.
  it("lastWinValue wird nach einem Sieg auf den Siegwert gesetzt (Basis für Familie D_PRECISION)", () => {
    expect(resolveTrick(scenario(9, 0), rng).lastWinValue).toBe(9);
  });
  // D12 Präzision / D13 Wechselspiel als Familien (D_PRECISION / D_INTERPLAY) — Tests in families-engine.test.js.
});

describe("Crit-Historie-Rares — Engine (#71 Phase 2c)", () => {
  const never = () => 0.99; // Crit-Wurf schlägt nie an → Zustandsübergänge isoliert testbar

  it("critFollowArmed: ein Crit rüstet, ein Sieg ohne Crit entrüstet", () => {
    expect(resolveTrick(scenario(12, 0, { lightning: litCrit(1) }), rng).critFollowArmed).toBe(true);
    expect(resolveTrick(scenario(12, 0, { critFollowArmed: true }), never).critFollowArmed).toBe(false);
  });
  // D14 Crit-Folge / D15 Fehlzündung / D16 Schwachstellenanalyse als Familien (D_CRIT_FOLLOW / D_MISFIRE /
  // D_WEAKNESS) inkl. Stufen-Parameter — Tests in families-engine.test.js.
});

describe("Historie-Rares — Engine (#71 Phase 2f)", () => {
  const mk = (arr, suit = "R") => arr.map((v, i) => ({ id: `${suit}${i}`, suit, baseRank: v, value: v }));

  // B9 Perfekte Folge als Familie B_PERFECT (Treppen-Ordinal) — Tests in families.test.js/families-engine.test.js.
  it("Farbserie-Zähler (Engine): gleiche Farbe zählt hoch, Farbwechsel beginnt bei 1, Niederlage bricht", () => {
    // winSuit/winSuitStreak sind Engine-Zustand (Basis für Familie D_SUIT_STREAK), unabhängig von einem Perk.
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }, { id: "c", suit: "B", baseRank: 12, value: 12 }];
    const opp = mk([0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2], oppOrder: [0, 1, 2] };
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(2); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); expect(s.winSuit).toBe("B"); // Farbwechsel
    expect(resolveTrick(scenario(0, 12, { winSuit: "R", winSuitStreak: 3 }), rng).winSuitStreak).toBe(0); // Niederlage bricht
  });

  it("Farbserie + Pflanze-Grün: pflanzen-grüne Karten verschiedener Originalfarben halten die Serie als „G\"", () => {
    const deck = [
      { id: "a", suit: "R", baseRank: 12, value: 12, green: true },
      { id: "b", suit: "B", baseRank: 12, value: 12, green: true }, // andere Originalfarbe, aber grün
      { id: "c", suit: "Y", baseRank: 12, value: 12 },              // nicht grün → Farbwechsel
    ];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: mk([0, 0, 0]), playerOrder: [0, 1, 2], oppOrder: [0, 1, 2] };
    s = resolveTrick(s, rng); expect(s.winSuit).toBe("G"); expect(s.winSuitStreak).toBe(1); // grüne R → „G"
    s = resolveTrick(s, rng); expect(s.winSuit).toBe("G"); expect(s.winSuitStreak).toBe(2); // grüne B → Serie HÄLT (beide „G")
    s = resolveTrick(s, rng); expect(s.winSuit).toBe("Y"); expect(s.winSuitStreak).toBe(1); // nicht-grüne Y → Farbwechsel
  });
  // D17 Farbserie / D18 Volles Haus als Familien (D_SUIT_STREAK / D_FULL_HOUSE) — Score-Tests in families-engine.test.js.
  it("Volles-Haus-Fenster: recentResults hält die letzten 4 Ergebnisse", () => {
    expect(resolveTrick(scenario(12, 0, { recentResults: ["loss", "win", "tie", "win"] }), rng).recentResults).toEqual(["win", "tie", "win", "win"]);
  });
});

describe("Serien-/Crit-Rares — Engine (#71 Phase 2e)", () => {
  // B10 Überzahl als Familie B_SUPERIOR (Vergleich Dauerwert vs. Vorgänger) — Tests in families.test.js.
  it("Familie D_OVERCRIT: +Crit-Flat, wenn die Roh-Crit-Chance über 100 % liegt (rawCrit im critCtx)", () => {
    // D_OVERCRIT III: jeder Überschuss-Crit (rawCrit > 1) gibt +500. Crit-Chance 1,5 (Blitz-Stau) → rawCrit 1,5, Crit garantiert.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_OVERCRIT: 3 }, lightning: litCrit(1.5) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo((B + 500) * 1.02);
    // rawCrit genau 1 (nicht >1) → kein Bonus.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_OVERCRIT: 3 }, lightning: litCrit(1) }), rng).lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
  });
});

describe("Legendär-Perks Durchlauf-Ende & Formationsvielfalt (Legendär-Perks-Rework #203)", () => {
  it("L_ZINS Bank: jeder Sieg zahlt einen Anteil des Stich-Scores aufs Kapital ein (Kapital ist KEIN Score)", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["L_ZINS"], pos: 5, zinsCapital: 0 }), rng);
    expect(s.zinsCapital).toBeCloseTo(s.lastTrick.gained * ZINS_DEPOSIT); // Einlage = Anteil des VOLLEN Stich-Scores
    expect(s.score).toBeCloseTo(s.lastTrick.gained);                      // … und schlägt selbst nicht auf den Score durch
    // Niederlage zahlt nicht ein.
    const loss = resolveTrick(scenario(0, 12, { perks: ["L_ZINS"], pos: 5, zinsCapital: 500 }), rng);
    expect(loss.zinsCapital).toBe(500);
  });
  it("L_ZINS Bank: Hürde genommen → Kapital × Zinssatz ausgezahlt, Satz steigt eine Stufe (Deckel greift)", () => {
    const hurdle = zinsHurdle(); // 65 % von 40 Stichen = 26 Siege
    // Schlussstich (pos 39) als Sieg; cycleWins zählt diesen Sieg mit → hurdle−1 vorher reicht exakt.
    const s = resolveTrick(scenario(12, 0, { perks: ["L_ZINS"], pos: 39, cycleWins: hurdle - 1, zinsCapital: 100000, zinsRate: ZINS_RATE_START, score: 0 }), rng);
    expect(s.cycle).toBe(1);                                            // Durchlauf-Ende
    // lastTrick.scoreGain trägt am Durchlauf-Ende bereits die Auszahlung (Ledger-Rekonziliation) → den reinen
    // Stich-Score aus dem Kapital zurückrechnen: Kapital = Vorher + Stich-Score × Einlagesatz.
    const trickScore = (s.zinsCapital - 100000) / ZINS_DEPOSIT;
    expect(s.zinsCapital).toBeCloseTo(100000 + trickScore * ZINS_DEPOSIT); // Kapital bleibt liegen (nur die Zinsen fließen ab)
    expect(s.score).toBeCloseTo(trickScore + s.zinsCapital * ZINS_RATE_START); // Stich + Zinsen
    expect(s.zinsRate).toBeCloseTo(ZINS_RATE_START + ZINS_RATE_STEP);   // Satz eine Stufe hoch
    expect(s.cycleWins).toBe(0);                                        // Bilanz für den nächsten Durchlauf zurückgesetzt
    // Deckel: ein Satz am Maximum steigt nicht weiter.
    const capped = resolveTrick(scenario(12, 0, { perks: ["L_ZINS"], pos: 39, cycleWins: hurdle - 1, zinsCapital: 1000, zinsRate: ZINS_RATE_MAX }), rng);
    expect(capped.zinsRate).toBeCloseTo(ZINS_RATE_MAX);
  });
  it("L_ZINS Bank: Hürde verfehlt → Crash (Kapital schrumpft, Satz fällt eine Stufe, keine Auszahlung)", () => {
    const s = resolveTrick(scenario(0, 12, { perks: ["L_ZINS"], pos: 39, cycleWins: 5, zinsCapital: 100000, zinsRate: ZINS_RATE_START + 3 * ZINS_RATE_STEP, score: 0 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.score).toBe(0);                                            // keine Auszahlung
    expect(s.zinsCapital).toBeCloseTo(100000 * ZINS_CRASH_KEEP);        // Kapital gecrasht
    expect(s.zinsRate).toBeCloseTo(ZINS_RATE_START + 2 * ZINS_RATE_STEP); // Satz eine Stufe zurück
    // Der Satz fällt nie unter den Startwert.
    const floor = resolveTrick(scenario(0, 12, { perks: ["L_ZINS"], pos: 39, cycleWins: 5, zinsRate: ZINS_RATE_START }), rng);
    expect(floor.zinsRate).toBeCloseTo(ZINS_RATE_START);
  });
  it("L_ECHO Echo: am Durchlauf-Ende wird der beste Stich des Durchlaufs nochmal gutgeschrieben (auch bei Schluss-Niederlage)", () => {
    const s = resolveTrick(scenario(0, 12, { perks: ["L_ECHO"], pos: 39, cycleBestTrick: 5000, score: 100000 }), rng); // Schlussstich Niederlage
    expect(s.cycle).toBe(1);
    expect(s.score).toBeCloseTo(100000 + 5000 * ECHO_FACTOR); // Echo = bester Stich × Faktor
    expect(s.cycleBestTrick).toBe(0);                         // zurückgesetzt
    expect(s.lastTrick.gained).toBeCloseTo(5000 * ECHO_FACTOR); // dem (verlorenen) Schlussstich gutgeschrieben
  });
  it("L_SAMM Sammler: +Formations-Mult je distinct gesammelter Formationsart (Stand VOR dem Sieg)", () => {
    const forms = identity().map(() => ({ mult: 1, formations: [] }));
    forms[5] = { mult: 1.5, baseMult: 1.5, formations: [{ type: "farbblock", factor: 1.5 }] };
    // schon 2 Arten gesammelt → formMult × (1 + 2 × SAMMLER_STEP)
    const s = resolveTrick(scenario(12, 0, { perks: ["L_SAMM"], pos: 5, formations: forms, sammlerTypes: ["treppe", "wiederholung"] }), rng).lastTrick;
    const base = resolveTrick(scenario(12, 0, { pos: 5, formations: forms }), rng).lastTrick;
    expect(s.scoreBeforeCrit).toBeCloseTo(base.scoreBeforeCrit * (1 + 2 * SAMMLER_STEP));
    // der eigene Sieg nimmt seine Formationsart in den Durchlauf-Satz auf (für die FOLGENDEN Siege).
    const s2 = resolveTrick(scenario(12, 0, { perks: ["L_SAMM"], pos: 5, formations: forms, sammlerTypes: [] }), rng);
    expect(s2.sammlerTypes).toContain("farbblock");
  });
});

describe("Blitz-Archetyp — Engine (Stufe A)", () => {
  const LR = "SK_LIGHTNING_01";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, ...over });

  it("Crit-Basis: aktiver Blitz + 1 Skill → Sockel + 1× pro-Skill-Crit", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), rng);
    expect(s.lastTrick.critChance).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL);
  });

  it("Crit mit Blitzableiter: +2 Ladung (Basis 1 + Skill 1), kein Crit-Flat mehr (+50 im Rework gestrippt)", () => {
    // scoreBase = Basis × streakBaseMult(1)=1,02, ×Crit-Mult. Blitzableiter gibt NUR Ladung;
    // als 1 gehaltener Blitz-Skill hebt er den Crit-Mult um +LIGHTNING_CRIT_MULT_PER_SKILL.
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), () => 0); // Crit aus den Blitz-Skills selbst (rng 0)
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(2);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * (CRIT_BASE_MULT + LIGHTNING_CRIT_MULT_PER_SKILL));
  });

  it("ohne Crit: keine Ladung, kein Crit-Flat", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), () => 0.99);
    expect(s.lastTrick.isCrit).toBe(false);
    expect(s.lightning.charge).toBe(0);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02); // Basis × 1,02, kein +50
  });

  it("Ladung deckelt bei maxCharge (10)", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lightning.charge).toBe(10);
  });

  it("inaktiver Archetyp: Crit erzeugt keine Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { familyTiers: { P_SHARPNESS: 4 } }), () => 0); // Crit aus Präzision; lightning default inaktiv
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0); // inaktiv → keine Ladung
  });

  it("Entscheidungszyklus (§22.2, #267 45-Plan): Perk/Formation/Architekt/Skill je nach Durchlauf; leerer Skill-Pool → Perk", () => {
    // Nach dem Durchlauf mit cycle C ist die Entscheidung DECISION_SCHEDULE[C+1] (fester 45-Plan, Stat-Phase entfernt).
    const ALL = Object.keys(SKILL_DEFS); // alle Skills (Blitz + Feuer …) → leerer Pool erzwingt den Perk-Fallback

    const perkRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 0 }), rng); // → cycle 1 = perk
    expect(perkRound.phase).toBe("levelup");
    expect(perkRound.offer).toHaveLength(3);
    expect(perkRound.skillOffer).toBeNull();

    const formationRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 1 }), rng); // → cycle 2 = formation
    expect(formationRound.phase).toBe("formation");
    expect(formationRound.formationEnergy).toBe(FORMATION_ENERGY);
    expect(formationRound.offer).toBeNull();
    expect(formationRound.skillOffer).toBeNull();

    const shopRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 2 }), rng); // → cycle 3 = Architekt-Slot; ohne Architekt (Sim-Baseline) → direkt play
    expect(shopRound.phase).toBe("play");
    expect(shopRound.offer).toBeNull();
    expect(shopRound.skillOffer).toBeNull();

    const skillRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 3 }), rng); // → cycle 4 = skill
    expect(skillRound.phase).toBe("levelup");
    expect(skillRound.skillOffer).toHaveLength(12); // SKILLS_OFFERED 12 (3+3+3+3 über alle 4 Archetypen)
    expect(skillRound.offer).toBeNull();

    // Skill-Runde mit vollem Skill-Besitz → Fallback auf Perk-Angebot (Runde nicht verschwendet).
    const owned = resolveTrick(scenario(12, 0, { pos: 39, cycle: 3, skills: ALL }), rng);
    expect(owned.skillOffer).toBeNull();
    expect(owned.offer).toHaveLength(3);
  });
});

// #267: die Stat-Phase (Crit-Chance/-Mult/Formations-/Serien-Stat) ist ENTFERNT. Crit-Chance & Crit-Mult kommen jetzt
// aus der Perk-Familie „Präzision" (P_*) bzw. aus Blitz; die Serien-/Formations-BASIS (streakBaseMult, Formationsfaktoren)
// bleibt und ist in „Formations-Engine — Integration" bzw. den Serien-Tests abgedeckt. Der reine Stat-BOOSTER ist weg.
describe("Crit-Chance/-Mult über Blitz & Präzision — Engine (#267, Stat-Ersatz)", () => {
  it("Crit-Chance additiv: Präzision-Schärfe UND der Blitz-Stau heben die Crit-Chance flach (Basis-Crit 0)", () => {
    // P_SHARPNESS I → +0,06 pp flat auf ALLE Karten → critChance 0,06 (rng 0,99 → kein realer Crit, nur ablesen).
    expect(resolveTrick(scenario(12, 0, { familyTiers: { P_SHARPNESS: 1 } }), () => 0.99).lastTrick.critChance).toBeCloseTo(0.06);
    // Gleiche Anhebung über den Blitz-Spannungsstau als additiver Stat-Ersatz: Sockel 0,05 + 0,01 → 0,06.
    expect(resolveTrick(scenario(12, 0, { lightning: { active: true, charge: 0, maxCharge: 10, stauBonus: 0.01 } }), () => 0.99).lastTrick.critChance).toBeCloseTo(0.06);
  });
  it("Crit-Mult: Präzision-Wucht hebt den Crit-Faktor auf Basis + Bonus (P_FORCE II → Basis + 0,40)", () => {
    // P_FORCE II → +0,40× auf den Basis-Crit-Mult; Crit über den Blitz-Stau (rawCrit 1) garantiert.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { P_FORCE: 2 }, lightning: litCrit(1) }), rng);
    const expected = CRIT_BASE_MULT + 0.40;
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(expected);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * expected); // scoreBeforeCrit Basis×1,02 × Crit-Faktor
  });
});

describe("Formations-Engine — Integration (V2 §22.7)", () => {
  const pairDeck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
  const zeroOpp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
  const base = (over = {}) => ({ ...initialState(makeRng(1)), deck: pairDeck, oppDeck: zeroOpp, playerOrder: [0, 1], oppOrder: [0, 1], ...over });

  it("Sieg auf einer Formations-Position bekommt den Multiplikator (Wiederholung 2. Karte ×1,25)", () => {
    let s = base();
    s = resolveTrick(s, rng); expect(s.lastTrick.formationMult).toBe(1);   // pos0 = 1. Karte, kein Bonus
    s = resolveTrick(s, rng);
    expect(s.lastTrick.formationMult).toBeCloseTo(1.25);                    // pos1 = 2. Karte
    expect(s.lastTrick.gained).toBeCloseTo(B * 1.04 * 1.25);              // Basis × streakBaseMult(2) × 1,25
  });

  it("Crit multipliziert NACH dem Formations-Multiplikator (§7.3)", () => {
    // Crit-Chance 1 (Blitz-Stau) → beide Stiche critten; geprüft wird pos1 (Wiederholung ×1,25).
    let s = base({ lightning: litCrit(1) });
    s = resolveTrick(s, rng); // pos0
    s = resolveTrick(s, rng); // pos1: Formation ×1,25, dann Crit ×1,5
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.04 * 1.25);      // Formation IN der Basis
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.04 * 1.25 * CRIT_BASE_MULT);      // Crit ×1,5 danach
  });

  it("Formationen werden persistent im State gehalten (je Durchlauf berechnet)", () => {
    const s = resolveTrick(base(), rng); // pos0 → berechnet formations für den Durchlauf
    expect(Array.isArray(s.formations)).toBe(true);
    expect(s.formations[1].mult).toBeCloseTo(1.25);
  });

  it("#161 FB-2: verfolgt Peak-Formationen und Score-Anteil aus Formationen", () => {
    let s = base();
    s = resolveTrick(s, rng); // pos0: Layout steht → maxFormations gesampelt; kein Formations-Mult
    expect(s.maxFormations).toBe(1);          // eine aktive Formation (Wiederholung) im Layout
    expect(s.formationScore).toBeCloseTo(0);
    s = resolveTrick(s, rng); // pos1: Sieg mit Wiederholung ×1,25 (gained = Basis × 1,04 × 1,25)
    // Anteil aus Formationen = gained × (1 − 1/1,25) = gained × 0,2.
    expect(s.formationScore).toBeCloseTo(B * 1.04 * 1.25 * (1 - 1 / 1.25));
  });
});

describe("Ionisierung — Engine (Stufe B)", () => {
  const I = "SK_LIGHTNING_02", U = "SK_LIGHTNING_04";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, ...over });
  // constDeck mit stabilen ids; die gespielte Karte (pos 0) trägt `stacks` Ionisierungsstapel.
  const ionDeck = (v, stacks) => constDeck(v).map((c, i) => (i === 0 ? { ...c, id: "P0", ionStacks: stacks } : { ...c, id: `P${i}` }));

  it("ionScore der gespielten Karte fließt in die multiplizierte Basis (+ION_SCORE_PER_STACK/Stapel)", () => {
    // 2 Stapel → +2×Flat: (Basis + 2×Flat) × streakBaseMult(1)=1,02 (kein Crit; rng 0,99 > die +2 pp Feld-Crit).
    const s = resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + 2 * ION_SCORE_PER_STACK) * 1.02);
  });

  it("Sieg mit ionisierter Karte erhöht deren Stapel (+1, max 5 — #165 Skills-Spec §5.1)", () => {
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(3);
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 5), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(5); // Deckel jetzt bei 5
  });

  it("Überspannung: Crit mit ionisierter Karte gibt +3 Zusatzladung (1 Basis + 1 Blitzableiter + 3)", () => {
    const s = resolveTrick(scenario(12, 0, { deck: ionDeck(12, 1), playerOrder: identity(),
      skills: ["SK_LIGHTNING_01", U], lightning: lit() }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(5);
  });

  it("Volle Ladung + Ionisierung: ungespielte Karten werden ionisiert, Ladung verbraucht", () => {
    // Nur Ionisierung (kein Blitzableiter) → sauberer Verbrauch bis auf den Boden (0).
    const s = resolveTrick(scenario(12, 0, { skills: [I], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus dem Blitz-Skill (rng 0)
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2);
  });
});

describe("Reaktoren + Ladungsserie + On-Consume-Passives — Engine (Rework v0)", () => {
  const LR = "SK_LIGHTNING_01", I = "SK_LIGHTNING_02", R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07",
        ST = "SK_LIGHTNING_08", DA = "SK_LIGHTNING_16", D10 = "SK_LIGHTNING_10", SS = "SK_LIGHTNING_17", TG = "SK_LIGHTNING_L01";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, stormCritBonus: 0, dauerstromCritBonus: 0, ...over });

  it("Reststrom: Verbrauch lässt Ladung auf den Boden fallen (statt 0)", () => {
    // Kein Blitzableiter → isolierter Reststrom-Boden; Blitzableiter würde +1 obendrauf geben (eigener Test).
    const s = resolveTrick(scenario(12, 0, { skills: [I, R], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lightning.charge).toBe(REST_CHARGE_FLOOR);
  });

  it("Gewitterfront (v0.5): je Verbrauch +Crit-Momentum, UNCAPPED (kein Score-Fallback mehr)", () => {
    const step = resolveTrick(scenario(12, 0, { skills: [LR, I, G], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(step.lightning.stormCritBonus).toBeCloseTo(STORM_CRIT_STEP);
    // Über dem alten Cap (0,20) rampt es einfach weiter — kein Umschalten auf Score.
    const high = resolveTrick(scenario(12, 0, { skills: [LR, I, G], lightning: lit({ charge: 9, stormCritBonus: 0.50 }) }), () => 0);
    expect(high.lightning.stormCritBonus).toBeCloseTo(0.50 + STORM_CRIT_STEP);
  });

  it("Entladung (v0.5): je Verbrauch +Crit-Mult-Momentum, dauerhaft (weicher Cap)", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR, I, D10], lightning: lit({ charge: 9 }) }), () => 0);
    expect(s.lightning.entladungMult).toBeCloseTo(ENTLADUNG_MULT_STEP);
    const capped = resolveTrick(scenario(12, 0, { skills: [LR, I, D10], lightning: lit({ charge: 9, entladungMult: ENTLADUNG_MULT_CAP }) }), () => 0);
    expect(capped.lightning.entladungMult).toBeCloseTo(ENTLADUNG_MULT_CAP); // Deckel hält
  });

  it("Serienschutz (v0.5): Niederlage mit ≥ halber Ladung hält die Serie und verbraucht die Ladung", () => {
    // Niederlage (0<12), Serie 4 vorher, Ladung 8 ≥ halbe (5) → Serie hält, 5 Ladung weg.
    const held = resolveTrick(scenario(0, 12, { skills: [SS], winStreak: 4, lightning: lit({ charge: 8 }) }), () => 0);
    expect(held.lastTrick.result).toBe("loss");
    expect(held.winStreak).toBe(4);                 // Serie gehalten
    expect(held.lightning.charge).toBe(8 - Math.ceil(10 * 0.5)); // halbe Max-Ladung verbraucht → 3
    // Zu wenig Ladung (4 < 5) → Serie bricht normal, Ladung unberührt.
    const broke = resolveTrick(scenario(0, 12, { skills: [SS], winStreak: 4, lightning: lit({ charge: 4 }) }), () => 0);
    expect(broke.winStreak).toBe(0);
    expect(broke.lightning.charge).toBe(4);
  });

  it("Donnergott-Turbo (v0.5): Konsument löst schon bei 70 % Ladung aus (statt voll)", () => {
    // maxCharge 10 → Schwelle ceil(7)=7. Ladung 6 + Blitz-Crit (+1) = 7 → Verbrauch feuert (Ionisierung), Ladung fällt auf Boden.
    const turbo = resolveTrick(scenario(12, 0, { skills: [I, TG], lightning: lit({ charge: 6 }) }), () => 0);
    expect(turbo.lightning.charge).toBeLessThan(6);       // Verbrauch ausgelöst → auf Boden gefallen
    expect(turbo.deck.some((c) => (c.ionStacks || 0) > 0)).toBe(true); // ionisiert
    // Ohne Donnergott feuert 7 < 10 nicht.
    const noFire = resolveTrick(scenario(12, 0, { skills: [I], lightning: lit({ charge: 6 }) }), () => 0);
    expect(noFire.lightning.charge).toBe(7);
  });

  it("Ladungsserie: ist KEIN Verbraucher — volle Ladung ohne Ionisierung parkt (kein Verbrauch)", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR, S], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lightning.charge).toBe(10);   // voll → parkt, kein Konsument
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(0); // nichts ionisiert
  });

  it("Ladungsserie: eine Niederlage setzt die Serie normal zurück (kein Schutz mehr)", () => {
    const s = resolveTrick(scenario(0, 12, { skills: [S], lightning: lit(), winStreak: 5 }), rng);
    expect(s.losses).toBe(1);
    expect(s.winStreak).toBe(0);            // kein Rahmen → Serie reißt
    expect(s.lastResult).toBe("loss");
  });

  it("On-Consume: Blitzableiter gibt bei jedem vollen Verbrauch +1 Ladung zurück (über den Boden)", () => {
    // [LR, I]: Crit → +2 Ladung (Basis +1, Blitzableiter +1) → voll (10) → Ionisierung verbraucht (Boden 0) → Blitzableiter +1.
    const s = resolveTrick(scenario(12, 0, { skills: [LR, I], lightning: lit({ charge: 8 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0).length).toBeGreaterThan(0); // verbraucht → ionisiert
    expect(s.lightning.charge).toBe(BLITZABLEITER_CONSUME_CHARGE);                   // 0 (Boden) + 1 zurück
  });

  it("On-Consume: Dauerstrom rampt je vollem Verbrauch die Crit-Chance dauerhaft (dauerstromCritBonus)", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [I, DA], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lightning.dauerstromCritBonus).toBeCloseTo(DAUERSTROM_CONSUME_CRIT, 6);
  });

  it("On-Consume: Statische Aufladung gibt bei jedem vollen Verbrauch +CONSUME_SCORE Flat-Score", () => {
    // Beide Builds halten 2 Blitz-Skills → identischer Crit-Mult (je +LIGHTNING_CRIT_MULT_PER_SKILL/Skill).
    // Serienschutz (SS) ist auf einem gewonnenen Crit-Stich wirkungslos → isoliert CONSUME_SCORE sauber.
    const withSt = resolveTrick(scenario(12, 0, { skills: [I, ST], lightning: lit({ charge: 9 }) }), () => 0); // Crit aus den Blitz-Skills (rng 0)
    const without = resolveTrick(scenario(12, 0, { skills: [I, SS], lightning: lit({ charge: 9 }) }), () => 0);
    expect(withSt.lastTrick.scoreGain - without.lastTrick.scoreGain).toBeCloseTo(CONSUME_SCORE, 6);
  });

  it("Ladungsserie: die Serie speist die Crit-Chance (steigt je Serienpunkt, Cap +30 pp)", () => {
    const base = LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL;
    // Sieg → serieStreak = winStreak+1; Ladungsserie addiert serieStreak·STEP (Cap) auf die Crit-Chance.
    const lo = resolveTrick(scenario(12, 0, { skills: [S], lightning: lit(), winStreak: 0 }), rng);
    const hi = resolveTrick(scenario(12, 0, { skills: [S], lightning: lit(), winStreak: 4 }), rng);
    expect(lo.lastTrick.critChance).toBeCloseTo(base + 1 * SERIESCRIT_STEP, 6);
    expect(hi.lastTrick.critChance).toBeCloseTo(base + 5 * SERIESCRIT_STEP, 6);
    // Ohne Ladungsserie ignoriert die Engine die Serie für die Crit-Chance.
    const noSeries = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit(), winStreak: 4 }), rng);
    expect(noSeries.lastTrick.critChance).toBeCloseTo(base, 6);
  });
});

// Kartenrollen (Kat. C: Vorhut/Staffelläufer/Triumph/Leibwache/Anführer/Finisher/Überlebensvorteil) sind zu
// Familien migriert (#167) — die Engine-Verdrahtung ist in test/families-engine.test.js („Kategorie C") geprüft.

describe("Formationswerkzeuge — Engine (V2 §22.6 E)", () => {
  it("E10 Feinjustierung: die Formationsphase startet mit +1 Energie", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 1, perks: ["E10"] }), rng); // → cycle 2 (Formation, #267 45-Plan)
    expect(s.phase).toBe("formation");
    expect(s.formationEnergy).toBe(FORMATION_ENERGY + 1);
  });
});

describe("resolveTrick — Nicht-play früher Rückgabezweig (#158)", () => {
  it("außerhalb der play-Phase bleibt der State unverändert (identische Referenz)", () => {
    const menu = { ...scenario(12, 0), phase: "menu" };
    expect(resolveTrick(menu, rng)).toBe(menu);
    const over = { ...scenario(12, 0), phase: "gameover" };
    expect(resolveTrick(over, rng)).toBe(over);
  });
});

describe("#370 Wochen-Mods: Karten-Wert (nur im Ranked-Lauf gesetzt)", () => {
  it("Starke Karten (+mag Spielerwert) dreht einen knappen Stich zum Sieg", () => {
    expect(resolveTrick(scenario(5, 7), rng).lastResult).toBe("loss");
    expect(resolveTrick(scenario(5, 7, { weekMods: [{ effect: "cardValue", mag: 3 }] }), rng).lastResult).toBe("win");
  });
  it("Stärkere Gegner (+mag Gegnerwert) dreht einen knappen Sieg zur Niederlage", () => {
    expect(resolveTrick(scenario(9, 7), rng).lastResult).toBe("win");
    expect(resolveTrick(scenario(9, 7, { weekMods: [{ effect: "enemyValue", mag: 3 }] }), rng).lastResult).toBe("loss");
  });
  it("ohne Wochen-Mods (Normal-/Sim-Lauf) unverändert", () => {
    expect(resolveTrick(scenario(8, 7, { weekMods: [] }), rng).lastResult).toBe("win");
    expect(resolveTrick(scenario(8, 7), rng).lastResult).toBe("win");
  });
});

describe("#370 Wochen-Mods: Angebots-Umfang (Perk-/Skill-Verknappung, nur Ranked)", () => {
  // Treibt einen frischen Lauf durch die Zyklen und fängt das ERSTE Perk- und Skill-Angebot der Engine ab.
  function firstOffers(weekMods) {
    let s = { ...initialState(makeRng(7)), weekMods };
    let perkOffer = null, skillOffer = null;
    for (let i = 0; i < 1500 && s.phase !== "gameover" && (!perkOffer || !skillOffer); i++) {
      if (s.phase === "levelup") {
        if (s.offer && !perkOffer) perkOffer = s.offer;
        if (s.skillOffer && !skillOffer) skillOffer = s.skillOffer;
        s = { ...s, phase: "play", offer: null, skillOffer: null, legendaryOffer: null, statOffer: null };
        continue;
      }
      if (s.phase === "formation" || s.phase === "architect" || s.phase === "legendary") { s = { ...s, phase: "play" }; continue; }
      s = resolveTrick(s, makeRng(100 + i));
    }
    return { perkOffer, skillOffer };
  }
  it("ohne Mods volles Angebot; mit Verknappung Perk=1 und Skill ≤4 (1/Fraktion)", () => {
    const base = firstOffers([]);
    expect(base.perkOffer && base.perkOffer.length).toBeGreaterThan(1);   // Default 3
    expect(base.skillOffer && base.skillOffer.length).toBeGreaterThan(4); // Default 12 (3/Fraktion)
    const scarce = firstOffers([{ effect: "scarcePerks" }, { effect: "scarceSkills" }]);
    expect(scarce.perkOffer.length).toBe(1);
    expect(scarce.skillOffer.length).toBeLessThanOrEqual(4);
  });
});

describe("#370 Wochen-Mods: Formations-Boost (nur Ranked)", () => {
  // gained bei Sieg an pos 5, nur die Formation an pos 5 variiert → alle übrigen Score-Faktoren konstant (K).
  const g = (formations, wm = []) => resolveTrick(scenario(12, 0, { pos: 5, formations, weekMods: wm }), rng).lastTrick.gained;
  const neutralForms = () => identity().map(() => ({ mult: 1, baseMult: 1, formations: [] }));
  it("verdoppelt den Formations-BONUS (Überschuss über 1); neutraler Sieg unberührt", () => {
    const forms = neutralForms();
    forms[5] = { mult: 2, baseMult: 2, formations: [{ type: "treppe", factor: 2 }] }; // formMult 2 → Bonus = K
    const neutral = g(neutralForms());                       // formMult 1 → gained = K
    const withForm = g(forms);                               // formMult 2 → gained = 2K
    const boosted  = g(forms, [{ effect: "formBoost" }]);    // formMult 1+(2-1)*2 = 3 → gained = 3K
    expect(withForm).toBeGreaterThan(neutral);
    expect(boosted - neutral).toBeCloseTo((withForm - neutral) * 2); // Bonus exakt verdoppelt
    expect(g(neutralForms(), [{ effect: "formBoost" }])).toBeCloseTo(neutral); // formMult 1 → kein Bonus, unberührt
  });
});

describe("#370 Wochen-Mods: Bau-Boost (Architekt-Gebäude, nur Ranked)", () => {
  it("verdoppelt den Gebäude-Bonus (Flat + Mult); ohne Gebäude ohne Wirkung", () => {
    // Zollhaus (Flat auf Sieg) + Schatzkammer (×Mult) decken pos 5 → beide Kanäle aktiv.
    const pre = precomputeArchitect({ buildings: [
      { id: 1, familyId: "A_ZOLLHAUS", tier: 3, footprint: [4, 5], colorChoice: null },
      { id: 2, familyId: "A_SCHATZ", tier: "legendary", footprint: [4, 5, 6, 7], colorChoice: null },
    ] }, identity(), constDeck(12));
    const withArch = (wm) => resolveTrick(scenario(12, 0, { pos: 5, architectEnabled: true, architect: { winCounters: {}, buildings: [] }, architectPre: pre, weekMods: wm }), rng).lastTrick.gained;
    expect(withArch([{ effect: "buildBoost" }])).toBeGreaterThan(withArch([])); // Gebäude-Bonus verdoppelt
    // Ohne Architekt: Bau-Boost darf nichts ändern (flat 0, mult 1 bleiben nach Verdopplung 0/1).
    const noArchBase    = resolveTrick(scenario(12, 0, { pos: 5 }), rng).lastTrick.gained;
    const noArchBoosted = resolveTrick(scenario(12, 0, { pos: 5, weekMods: [{ effect: "buildBoost" }] }), rng).lastTrick.gained;
    expect(noArchBoosted).toBe(noArchBase);
  });
});

describe("#381 Wochen-Mods: Legendär-Takt (legTakt, nur Ranked)", () => {
  const legCount = (offer) => (Array.isArray(offer) ? offer.filter((e) => typeof e === "string" && isLegendary(e)).length : 0);
  it("jede mag-te PERK-PHASE bietet 3 legendäre Perks", () => {
    // Perk-Phasen liegen bei cycle 1,5,9 (perkPhaseAt = 1,2,3). mag 3 → pp 3 (cycle 9) ist Takt-Phase.
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 8, weekMods: [{ effect: "legTakt", mag: 3 }] }), rng);
    expect(s.phase).toBe("levelup");
    expect(legCount(s.offer)).toBe(3); // alle 3 Angebots-Slots legendär
  });
  it("Nicht-Takt-Perk-Phase bleibt normal (< 3 Legendäre)", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 0, weekMods: [{ effect: "legTakt", mag: 3 }] }), rng); // cycle 1 = perkPhaseAt 1
    expect(s.phase).toBe("levelup");
    expect(legCount(s.offer)).toBeLessThan(3);
  });
  it("wandelt keine Nicht-Perk-Runde mehr um (Plan[3] = shop bleibt shop, keine Perk-Phase)", () => {
    // cycle 2 + pos 39 → cycle 3 = shop (perkPhaseAt 0). Früher machte legTakt daraus eine Perk-Runde — jetzt nicht mehr.
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 2, weekMods: [{ effect: "legTakt", mag: 3 }] }), rng);
    expect(s.phase).not.toBe("levelup");
  });
});

describe("#370 Wochen-Mods: Deck-Shuffle (deckShuffle, nur Ranked)", () => {
  const sorted = (a) => [...a].sort((x, y) => x - y);
  it("mischt vor der Aufstellphase die Karten-Anordnung neu (gleiche Menge, andere Reihenfolge)", () => {
    // cycle 1 + pos 39 → cycle 2; Plan[2] = "formation".
    const before = scenario(12, 0, { pos: 39, cycle: 1, weekMods: [{ effect: "deckShuffle" }] });
    const s = resolveTrick(before, rng);
    expect(s.phase).toBe("formation");
    expect(s.playerOrder).not.toEqual(before.playerOrder);
    expect(sorted(s.playerOrder)).toEqual(sorted(before.playerOrder)); // echte Permutation, keine Karte verloren
  });
  it("ohne Mod bleibt die Anordnung persistent", () => {
    const before = scenario(12, 0, { pos: 39, cycle: 1 });
    const s = resolveTrick(before, rng);
    expect(s.phase).toBe("formation");
    expect(s.playerOrder).toEqual(before.playerOrder);
  });
});
