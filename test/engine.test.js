import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { SKILL_DEFS } from "../src/game/skills.js";
import { MAX_CYCLES, FORMATION_ENERGY, TRICKS_PER_CYCLE, DECISION_SCHEDULE, STREAK_STAT_CAP, SCORE_PER_WIN, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL,
  HENKER_MULT, HENKER_ZONE_START, BRENNPUNKT_MULT, VABANQUE_SCORE, VABANQUE_TRICKS, VABANQUE_MAX_PAYOUTS, PATT_MARGIN, ZINSESZINS_STEP, ECHO_FACTOR, SAMMLER_STEP, UNAUFHALTSAM_VALUE } from "../src/game/constants.js";
import { computeFormations } from "../src/game/formations.js";
import { STAT_IDS, statStreakFactor } from "../src/game/stats.js";
import { streakBaseMult } from "../src/game/perks.js";
import { initialShop } from "../src/game/shop.js";

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
const flatDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
// Gleiche Farbe (R), aber abwechselnde Werte → Farbserie zählt, ohne Wiederholung/Farbblock (bei ≤2 Karten).
const sameSuitDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `S${i}`, suit: "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));

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
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng); // erzwungener Crit → critMult > 1
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

  it("Crit multipliziert den vollen scoreBeforeCrit mit der Basis 1,5", () => {
    // statCritChance 1 → garantierter Crit (verbraucht rng). scoreBeforeCrit = Basis×1,02, ×1,5 mit Crit.
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * 1.5);
    expect(s.lastTrick.critBonus).toBeCloseTo(B * 1.02 * 0.5);
  });

  it("Niederlagen und Gleichstände lösen keinen Crit aus", () => {
    const loss = resolveTrick(scenario(0, 12, { statCritChance: 1 }), rng);
    expect(loss.lastTrick.isCrit).toBe(false);
    expect(loss.crits).toBe(0);
    const tie = resolveTrick(scenario(5, 5, { statCritChance: 1 }), rng);
    expect(tie.lastTrick.isCrit).toBe(false);
  });

  it("statCritChance 1 erzwingt einen Crit bei jedem Sieg; 0 nie", () => {
    expect(resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng).lastTrick.isCrit).toBe(true);
    expect(resolveTrick(scenario(12, 0, { statCritChance: 0 }), () => 0.99).lastTrick.isCrit).toBe(false);
  });

  it("crits, critBonusScore und bestTrickScore werden geführt", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(B * 1.02 * 0.5); // Crit-Bonus = Basis×1,02×0,5
    expect(s.bestTrickScore).toBeCloseTo(B * 1.02 * 1.5);
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
    expect(cm(9)).toBeCloseTo(1.5);                          // Serie 10 → rawCrit 0,5 < 1 → nur Basis 1,5
    expect(cm(29)).toBeCloseTo(2.0);                         // Serie 30 → rawCrit 1,5 → +0,5 → 2,0
    expect(cm(49)).toBeCloseTo(2.5);                         // Serie 50 → rawCrit 2,5 → +1,0 (Cap) → 2,5
    expect(cm(6, { statCritChance: 0.7 })).toBeCloseTo(1.55); // total-aware: Serie 7 → 0,35 + 0,70 = 1,05 → +0,05
  });
  it("L4 Kritische Masse: Crit gibt der Karte dauerhaft +1 (max +4)", () => {
    const deck = [{ id: "a", suit: "R", baseRank: 5, value: 5 }];
    const opp = [{ id: "o", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0], oppOrder: [0], perks: ["L4"], statCritChance: 1 };
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
    expect(DECISION_SCHEDULE[5]).toBe("formation"); // Sanity: cycle 4 → 5 löst die Formationsphase aus (60-Plan)
    const anchors = [{ type: "formation", position: 0 }];
    const shop = { coins: 0, anchors };
    const s = resolveTrick(scenario(5, 0, { cycle: 4, pos: TRICKS_PER_CYCLE - 1, shop }), makeRng(2));
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
    expect(resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng).critFollowArmed).toBe(true);
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
  // D17 Farbserie / D18 Volles Haus als Familien (D_SUIT_STREAK / D_FULL_HOUSE) — Score-Tests in families-engine.test.js.
  it("Volles-Haus-Fenster: recentResults hält die letzten 4 Ergebnisse", () => {
    expect(resolveTrick(scenario(12, 0, { recentResults: ["loss", "win", "tie", "win"] }), rng).recentResults).toEqual(["win", "tie", "win", "win"]);
  });
});

describe("Serien-/Crit-Rares — Engine (#71 Phase 2e)", () => {
  // B10 Überzahl als Familie B_SUPERIOR (Vergleich Dauerwert vs. Vorgänger) — Tests in families.test.js.
  it("Familie D_OVERCRIT: +Crit-Flat, wenn die Roh-Crit-Chance über 100 % liegt (rawCrit im critCtx)", () => {
    // D_OVERCRIT III: jeder Überschuss-Crit (rawCrit > 1) gibt +500. statCritChance 1,5 → rawCrit 1,5, Crit garantiert.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_OVERCRIT: 3 }, statCritChance: 1.5 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo((B + 500) * 1.02);
    // rawCrit genau 1 (nicht >1) → kein Bonus.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_OVERCRIT: 3 }, statCritChance: 1 }), rng).lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
  });
});

describe("Legendär-Perks Durchlauf-Ende & Formationsvielfalt (Legendär-Perks-Rework #203)", () => {
  it("L_ZINS Zinseszins: positive Durchlauf-Bilanz stapelt eine flache Dauer-Dividende (am Durchlauf-Ende)", () => {
    // 40. Stich (pos 39) als Sieg, Bilanz positiv (mehr Siege als Niederlagen) → zinsBonus += Step, dem Schlussstich gutgeschrieben.
    const s = resolveTrick(scenario(12, 0, { perks: ["L_ZINS"], pos: 39, cycleWins: 25, cycleLosses: 10, zinsBonus: 0 }), rng);
    expect(s.cycle).toBe(1);                                  // Durchlauf-Ende
    expect(s.zinsBonus).toBe(ZINSESZINS_STEP);                // eine Stufe gestapelt
    expect(s.cycleWins).toBe(0);                              // Bilanz für den nächsten Durchlauf zurückgesetzt
    expect(s.lastTrick.gained).toBeGreaterThan(B);           // Stich-Score + Dividende (Score-Rekonziliation)
    // Negative Bilanz → keine neue Stufe (der bestehende Bonus wird aber weiter ausgezahlt).
    const neg = resolveTrick(scenario(12, 0, { perks: ["L_ZINS"], pos: 39, cycleWins: 5, cycleLosses: 20, zinsBonus: ZINSESZINS_STEP }), rng);
    expect(neg.zinsBonus).toBe(ZINSESZINS_STEP);             // NICHT weiter gestapelt
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
    // scoreBase = Basis × streakBaseMult(1)=1,02, ×1,5 (Crit-Basis). Blitzableiter gibt NUR Ladung.
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, skills: [LR], lightning: lit() }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(2);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.02);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * 1.5);
  });

  it("ohne Crit: keine Ladung, kein Crit-Flat", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), () => 0.99);
    expect(s.lastTrick.isCrit).toBe(false);
    expect(s.lightning.charge).toBe(0);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02); // Basis × 1,02, kein +50
  });

  it("Ladung deckelt bei maxCharge (10)", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, skills: [LR], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(10);
  });

  it("inaktiver Archetyp: Crit erzeugt keine Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng); // lightning default inaktiv
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0); // inaktiv → keine Ladung
  });

  it("Entscheidungszyklus (§22.2): Perk/Formation/Stat/Skill je nach Durchlauf; leerer Skill-Pool → Perk", () => {
    // Nach dem Durchlauf mit cycle C ist die Entscheidung DECISION_SCHEDULE[C+1] (Shop-Spec §2.2, fester 60-Plan).
    const ALL = Object.keys(SKILL_DEFS); // alle Skills (Blitz + Feuer …) → leerer Pool erzwingt den Perk-Fallback

    const perkRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 0 }), rng); // → cycle 1 = perk
    expect(perkRound.phase).toBe("levelup");
    expect(perkRound.offer).toHaveLength(3);
    expect(perkRound.skillOffer).toBeNull();
    expect(perkRound.statOffer).toBeNull();

    const statRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 1 }), rng); // → cycle 2 = stat
    expect(statRound.phase).toBe("levelup");
    expect(statRound.statOffer).toEqual(STAT_IDS);
    expect(statRound.offer).toBeNull();
    expect(statRound.skillOffer).toBeNull();

    const shopRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 2 }), rng); // → cycle 3 = shop (Shop-Spec §2.2)
    expect(shopRound.phase).toBe("shop");
    expect(shopRound.offer).toBeNull();
    expect(shopRound.statOffer).toBeNull();
    expect(shopRound.skillOffer).toBeNull();

    const formationRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 4 }), rng); // → cycle 5 = formation
    expect(formationRound.phase).toBe("formation");
    expect(formationRound.formationEnergy).toBe(FORMATION_ENERGY);
    expect(formationRound.offer).toBeNull();
    expect(formationRound.skillOffer).toBeNull();
    expect(formationRound.statOffer).toBeNull();

    const skillRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 5 }), rng); // → cycle 6 = skill
    expect(skillRound.phase).toBe("levelup");
    expect(skillRound.skillOffer).toHaveLength(12); // SKILLS_OFFERED 12 (3+3+3+3 über alle 4 Archetypen)
    expect(skillRound.offer).toBeNull();
    expect(skillRound.statOffer).toBeNull();

    // Skill-Runde mit vollem Skill-Besitz → Fallback auf Perk-Angebot (Runde nicht verschwendet).
    const owned = resolveTrick(scenario(12, 0, { pos: 39, cycle: 5, skills: ALL }), rng);
    expect(owned.skillOffer).toBeNull();
    expect(owned.offer).toHaveLength(3);
  });
});

describe("Stat-System — Engine (V2 §22.3)", () => {
  it("Crit-Chance-Stat: statCritChance hebt die Crit-Chance additiv", () => {
    // 3 Picks → +6 pp. Ohne Crit-Perk sonst 0 → 6 %.
    expect(resolveTrick(scenario(12, 0, { statCritChance: 0.06 }), () => 0.99).lastTrick.critChance).toBeCloseTo(0.06);
  });
  it("Crit-Mult-Stat: hebt den Crit-Faktor auf 1,5 + Stat", () => {
    // statCritMult 0,4 → Basis-Crit 1,9; statCritChance 1 garantiert den Crit.
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, statCritMult: 0.4 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(1.9);
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.02 * 1.9); // scoreBeforeCrit Basis×1,02 × 1,9
  });
  it("Serien-Stat: statStreakMult pro Serienpunkt multipliziert den Stichscore", () => {
    // statStreakMult 0,01 × Serie 1 → Faktor 1,01. Basis × 1,02(#39) × 1,01.
    expect(resolveTrick(scenario(12, 0, { statStreakMult: 0.01 }), rng).lastTrick.gained).toBeCloseTo(B * 1.02 * 1.01);
    // Serie 4 (winStreak 3 → 4): streakBaseMult(4)=1,08 × Faktor (1 + 0,01×4)=1,04.
    expect(resolveTrick(scenario(12, 0, { statStreakMult: 0.01, winStreak: 3 }), rng).lastTrick.gained)
      .toBeCloseTo(B * 1.08 * 1.04);
  });
  it("Serien-Stat ist bei STREAK_STAT_CAP gedeckelt (#153: Runaway-Schutz greift auch in der Engine)", () => {
    // Serie 11 (winStreak 10 → 11), großer Serien-Stat: 0,5 × 11 = 5,5 → auf STREAK_STAT_CAP gedeckelt.
    const serie = 11;
    const gained = resolveTrick(scenario(12, 0, { statStreakMult: 0.5, winStreak: 10 }), rng).lastTrick.gained;
    expect(gained).toBeCloseTo(B * streakBaseMult(serie) * statStreakFactor(0.5, serie));
    expect(gained).toBeCloseTo(B * streakBaseMult(serie) * (1 + STREAK_STAT_CAP));
    // Ohne den Cap wäre der Faktor (1 + 5,5) → der Cap senkt den Score echt.
    expect(gained).toBeLessThan(B * streakBaseMult(serie) * (1 + 0.5 * serie));
  });
  it("Formations-Stat: greift nur bei aktiver Formation (§22.3)", () => {
    // Ohne Formation (erste Karte) kein Effekt …
    expect(resolveTrick(scenario(12, 0, { statFormMult: 0.15 }), rng).lastTrick.gained).toBeCloseTo(B * 1.02);
    // … mit Formation (2. Karte eines Wiederholungs-Paars) wirkt +15 % zusätzlich zur Wiederholung ×1,25.
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], statFormMult: 0.15 };
    s = resolveTrick(s, rng); // pos0: keine Formation
    s = resolveTrick(s, rng); // pos1: Wiederholung ×1,25 + Formations-Stat ×1,15
    expect(s.lastTrick.gained).toBeCloseTo(B * 1.04 * 1.25 * 1.15);
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
    // statCritChance 1 → beide Stiche critten; geprüft wird pos1 (Wiederholung ×1,25).
    let s = base({ statCritChance: 1 });
    s = resolveTrick(s, rng); // pos0
    s = resolveTrick(s, rng); // pos1: Formation ×1,25, dann Crit ×1,5
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(B * 1.04 * 1.25);      // Formation IN der Basis
    expect(s.lastTrick.scoreGain).toBeCloseTo(B * 1.04 * 1.25 * 1.5);      // Crit ×1,5 danach
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

  it("ionScore der gespielten Karte fließt in die multiplizierte Basis (+25/Stapel)", () => {
    // 2 Stapel → +50: (Basis+50) × streakBaseMult(1)=1,02 (kein Crit).
    const s = resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + 50) * 1.02);
  });

  it("Sieg mit ionisierter Karte erhöht deren Stapel (+1, max 5 — #165 Skills-Spec §5.1)", () => {
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(3);
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 5), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(5); // Deckel jetzt bei 5
  });

  it("Überspannung: Crit mit ionisierter Karte gibt +3 Zusatzladung (1 Basis + 1 Blitzableiter + 3)", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,deck: ionDeck(12, 1), playerOrder: identity(),
      skills: ["SK_LIGHTNING_01", U], lightning: lit() }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(5);
  });

  it("Volle Ladung + Ionisierung: ungespielte Karten werden ionisiert, Ladung verbraucht", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: ["SK_LIGHTNING_01", I], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2);
  });
});

describe("Reaktoren + Geladene Serie — Engine (Stufe C)", () => {
  const LR = "SK_LIGHTNING_01", I = "SK_LIGHTNING_02", R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, ...over });

  it("Reststrom: Verbrauch lässt Ladung auf 3 statt 0 fallen", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, R], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(3);
  });

  it("Gewitterfront: je Verbrauch +2 pp Crit dauerhaft (Cap 20 pp), danach +100 Score für 3 Siege", () => {
    const step = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, G], lightning: lit({ charge: 9 }) }), rng);
    expect(step.lightning.stormCritBonus).toBeCloseTo(0.02);
    const capped = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, G], lightning: lit({ charge: 9, stormCritBonus: 0.20 }) }), rng);
    expect(capped.lightning.stormScoreWinsRemaining).toBe(3);
  });

  it("Gewitterfront-Score: aktiver Stack gibt +100 in die Basis und wird je Sieg abgebaut", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR, G], lightning: lit({ stormScoreWinsRemaining: 2 }) }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + 100) * 1.02); // (Basis+100) × streakBaseMult(1)=1,02
    expect(s.lightning.stormScoreWinsRemaining).toBe(1);
  });

  it("Geladene Serie: volle Ladung setzt den Serien-Rahmen und verbraucht die Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.armed).toBe(true);
    expect(s.lightning.charge).toBe(0);
  });

  it("Geladene Serie: eine Niederlage bei gesetztem Rahmen bewahrt die Serie, bleibt sonst normal", () => {
    const s = resolveTrick(scenario(0, 12, { skills: [S], lightning: lit({ armed: true }), winStreak: 5 }), rng);
    expect(s.losses).toBe(1);
    expect(s.winStreak).toBe(5);            // Siegesserie geschützt
    expect(s.lightning.armed).toBe(false);  // Rahmen eingelöst
    expect(s.lastResult).toBe("loss");
  });

  it("Priorität: Geladene Serie setzt den Rahmen VOR Ionisierung; bei gesetztem Rahmen greift Ionisierung", () => {
    const first = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S, I], lightning: lit({ charge: 9 }) }), rng);
    expect(first.lightning.armed).toBe(true);
    expect(first.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(0); // Rahmen zuerst, keine Ionisierung

    const second = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S, I], lightning: lit({ charge: 9, armed: true }) }), rng);
    expect(second.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2); // Rahmen gesetzt → jetzt ionisieren
  });
});

// Kartenrollen (Kat. C: Vorhut/Staffelläufer/Triumph/Leibwache/Anführer/Finisher/Überlebensvorteil) sind zu
// Familien migriert (#167) — die Engine-Verdrahtung ist in test/families-engine.test.js („Kategorie C") geprüft.

describe("Formationswerkzeuge — Engine (V2 §22.6 E)", () => {
  it("E10 Feinjustierung: die Formationsphase startet mit +1 Energie", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 4, perks: ["E10"] }), rng); // → cycle 5 (Formation, 60-Plan)
    expect(s.phase).toBe("formation");
    expect(s.formationEnergy).toBe(FORMATION_ENERGY + 1);
  });
});

describe("Zeitsegment × positionsgebundener Effekt: pos ≠ actualPos (#157)", () => {
  // Unter einem Zeitsegment weicht der Stich-Index `pos` von der Deckposition `actualPos` ab. Bislang lief JEDER
  // positionsgebundene Test OHNE Zeitsegment (pos === actualPos), d. h. die Divergenz wurde strukturell nie
  // ausgelöst. L_HENK „Henker" (garantierter Crit ab actualPos ≥ HENKER_ZONE_START) ist positionsgebunden → es MUSS
  // actualPos (Deckposition) lesen, nicht den Stich-Index. Zeitsegment 6 wiederholt die Deckpositionen 30–34 als Stiche
  // 35–39; die echten Positionen 35–39 rutschen auf die Stiche 40–44 → an Stich 35 gilt pos ≥ 35, aber actualPos < 35.
  const seg6 = { ...initialShop(), timeSegmentIndex: 6, timeSegmentTier: 4 };
  const critAt = (pos, shop) => resolveTrick(scenario(12, 0, { pos, perks: ["L_HENK"], shop }), () => 0.99).lastTrick.isCrit; // rng 0.99 → nur Henker erzwingt

  it("ohne Zeitsegment gilt pos === actualPos (Henker erzwingt Crit ab Position 36)", () => {
    expect(critAt(HENKER_ZONE_START - 1, initialShop())).toBe(false); // actualPos 34 < 35 → kein erzwungener Crit
    expect(critAt(HENKER_ZONE_START, initialShop())).toBe(true);      // actualPos 35 → erzwungener Crit
  });
  it("mit Zeitsegment liest Henker actualPos, NICHT den Stich-Index (pinnt die actualPos-Regel, vgl. #145)", () => {
    expect(critAt(35, seg6)).toBe(false); // Stich 35 = Wiederholung von Deckpos 30 → actualPos 30 < 35 → KEIN Crit …
    expect(critAt(40, seg6)).toBe(true);  // … Stich 40 = echte Deckpos 35 → actualPos 35 → erzwungener Crit.
    // Ein pos-statt-actualPos-Bug gäbe an Stich 35 (pos ≥ 35) fälschlich einen Crit.
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
