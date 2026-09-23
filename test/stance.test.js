import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, HALTUNG_TIERS } from "../src/game/skills.js";
import { initStance, S, STANCE_SUITS, stanceTier, stanceParam, ringsNow, ringCount, minDuration,
  stanceLift, stanceCrit, grundrauschenCritMult, stanceScoreMult, genugtuungScore, redEchoes, verankerungMult, greenEchoes, rueckhaltValue, extendStance,
  noteCrit, uebertragMult, stauungOn, notePeak, tickPeak, cashPeak,
  stanceTick, stanceOverlapOpts, stanceFormKeyOf, barLength, einklangDuration, stanceLevelMult,
  anklangScore, extTotal, kehrtwendeStreak, kehrtwendeStreakStep } from "../src/game/factions/stance.js";
import { streakBaseMult } from "../src/game/perks.js";
import { resolveTrick } from "../src/game/engine.js";
import { computeFormations, overlapFactor, OVERLAP_BONUS } from "../src/game/formations.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

/* HALTUNGEN — Arbeitstitel „Prisma" (docs/haltungen-fraktion.md). Erst die reinen Übergänge des Moduls, dann jeder
   Skill einmal durch resolveTrick. Konstante Decks (Spieler 12 gegen 0 = Sieg, 0 gegen 12 = Niederlage, gleich =
   Gleichstand), rng 0 = Crit sobald Chance > 0, rng 0,99 = nie. playerOrder = Identität.
   Die Farben liegen im Deck als R,B,G,Y im Wechsel — `suitDeck` baut stattdessen ein einfarbiges Deck, weil der
   Haltungswechsel an der GRUNDFARBE hängt und nur so gezielt auslösbar ist. */
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const suitDeck = (v, suit) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit, baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
/* Zehn Positionen = zwei Segmente mit je genau EINER Formation: die Wiederholung 7/7 auf 3 und 4 (am rechten Rand
   von Segment 0) und 3/3 auf 5 und 6 (am linken Rand von Segment 1). Sie liegen Rücken an Rücken an der Grenze —
   genau die Stelle, an der sich Segmentbindung und Übergriff zeigen. Die übrigen Werte bilden bewusst nichts:
   keine Treppe (Schritt > 4 oder fallend), kein Wechsel (mindestens ein Schritt unter der Zickzack-Schwelle),
   keine weitere Gleichheit; die Farben wechseln ohnehin je Position. */
const B10 = [1, 5, 2, 7, 7, 3, 3, 1, 2, 9];
const board10 = () => B10.map((v, i) => ({ id: `Y${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const order10 = () => Array.from({ length: 10 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
/* Zähler, Nachklang und Laufzeit werden GEMISCHT, nicht ersetzt: `st({ counts: { B: 4 } })` soll die anderen drei
   Farben auf 0 stehen lassen und nicht auf undefined — sonst testet man am Ende die Nachsicht der Leser. */
const st = (over = {}) => {
  const base = initStance();
  return { ...base, active: true, ...over,
    counts: { ...base.counts, ...(over.counts || {}) },
    ring: { ...base.ring, ...(over.ring || {}) },
    ranFor: { ...base.ranFor, ...(over.ranFor || {}) } };
};
const noCrit = () => 0.99, zero = () => 0;
const T = HALTUNG_TIERS;
const B = C.SCORE_PER_WIN;
// Ein Lauf-Zustand, in dem die Fraktion wirklich läuft: activeArchetypes trägt sie, der Substate ist aktiv.
const run = (stance, over = {}) => scen(12, 0, { activeArchetypes: ["stance"], stance, ...over });

/* Roster mit LITERALEN IDs — das Coverage-Gate in registry-guards.test.js sucht jede Skill-ID als Text in den Tests. */
const STANCE_IDS = [
  "SK_STANCE_01", "SK_STANCE_02", "SK_STANCE_03", "SK_STANCE_04", "SK_STANCE_05",
  "SK_STANCE_06", "SK_STANCE_07", "SK_STANCE_08", "SK_STANCE_09", "SK_STANCE_10",
  "SK_STANCE_11", "SK_STANCE_12", "SK_STANCE_13", "SK_STANCE_14", "SK_STANCE_15",
];

describe("Haltungen — Registry und Stufen", () => {
  it("S nennt genau die registrierten Skills (15, noch keine Legendären)", () => {
    const ids = Object.values(S);
    expect(ids).toHaveLength(15);
    expect([...ids].sort()).toEqual([...STANCE_IDS].sort());
    for (const id of ids) expect(SKILL_DEFS[id]?.archetype, id).toBe("stance");
    expect(Object.values(SKILL_DEFS).filter((s) => s.archetype === "stance").map((s) => s.id).sort()).toEqual([...STANCE_IDS].sort());
    // Owner-Plan: die drei Legendären werden erst entworfen, wenn die Sim Zahlen gegen die anderen Decks hat.
    expect(Object.values(SKILL_DEFS).filter((s) => s.archetype === "stance" && s.legendary)).toHaveLength(0);
  });
  it("keine zwei Stufen eines Skills sind gleich (skill-rework.md §1) und jede hat einen eigenen Text", () => {
    for (const id of STANCE_IDS) {
      const rows = SKILL_DEFS[id].tiers;
      expect(rows, id).toHaveLength(4);
      const seen = rows.map((r) => JSON.stringify(r));
      expect(new Set(seen).size, `${id}: zwei Stufen identisch`).toBe(4);
      expect(new Set(SKILL_DEFS[id].descTiers).size, `${id}: zwei Stufentexte identisch`).toBe(4);
    }
  });
  it("stanceTier / stanceParam: nicht gehalten → null/undefined, ohne Eintrag Normal, sonst die gewürfelte Stufe", () => {
    expect(stanceTier([], {}, S.MITKLANG)).toBeNull();
    expect(stanceTier([S.MITKLANG], {}, S.MITKLANG)).toBe(0);
    expect(stanceTier([S.MITKLANG], { [S.MITKLANG]: 2 }, S.MITKLANG)).toBe(2);
    expect(stanceParam([], {}, S.MITKLANG, "perStance")).toBeUndefined();
    expect(stanceParam([S.MITKLANG], { [S.MITKLANG]: 3 }, S.MITKLANG, "perStance")).toBe(T.mitklang[3].perStance);
  });
});

describe("Haltungen — der Mechanismus (§2)", () => {
  it("inert, solange die Fraktion nicht steht: jeder Leser gibt seinen Neutralwert", () => {
    const off = initStance();
    expect(off.active).toBe(false);
    for (const s of STANCE_SUITS) expect(ringsNow(off, s)).toBe(false);
    expect(ringCount(off)).toBe(0);
    expect(stanceLift(off)).toBe(0);
    expect(stanceCrit(off, [S.GRUNDRAUSCHEN], {})).toBe(0);
    expect(stanceScoreMult(off, [], {})).toBe(1);
    expect(stanceLevelMult(off)).toBe(1);
  });
  it("der Lauf startet in Rot mit Zähler 0; die aktive Haltung klingt immer, die anderen nicht", () => {
    const s = st();
    expect(s.stance).toBe(C.STANCE_START);
    expect(s.counts).toEqual({ R: 0, B: 0, G: 0, Y: 0 });
    expect(ringsNow(s, "R")).toBe(true);
    for (const c of ["B", "G", "Y"]) expect(ringsNow(s, c)).toBe(false);
    expect(ringCount(s)).toBe(1);
  });
  it("fünf gewonnene Stiche einer Farbe wechseln die Haltung; nur diese Farbe fällt zurück", () => {
    let s = st({ counts: { R: 0, B: 4, G: 3, Y: 1 } });
    s = stanceTick(s, [], {}, { wonSuit: "B" }).stance;
    expect(s.stance).toBe("B");
    expect(s.counts.B).toBe(0);
    expect(s.counts.G).toBe(3); // die anderen drei zählen weiter
    expect(s.counts.Y).toBe(1);
    expect(s.switches).toBe(1);
  });
  it("die fünf müssen nicht aufeinanderfolgen — verlorene Stiche dazwischen ändern nichts", () => {
    let s = st();
    for (let i = 0; i < C.STANCE_THRESHOLD; i++) {
      s = stanceTick(s, [], {}, { wonSuit: null }).stance;   // Niederlage
      s = stanceTick(s, [], {}, { wonSuit: "G" }).stance;    // Sieg in Grün
    }
    expect(s.stance).toBe("G");
  });
  it("die abgelöste Haltung wirkt in die neue hinein — volle Mindestdauer, volle Stärke, egal wie lange sie lief", () => {
    // Rot ist seit dem Laufbeginn aktiv, also lange. Trotzdem bekommt es beim Wechsel den vollen Nachklang:
    // er beginnt AM WECHSEL, nicht beim Auslösen (Owner).
    let s = st({ counts: { B: C.STANCE_THRESHOLD - 1 }, ranFor: { R: 40 } });
    s = stanceTick(s, [], {}, { wonSuit: "B" }).stance;
    expect(s.stance).toBe("B");
    expect(s.ring.R).toBe(C.STANCE_MIN_DURATION);
    expect(ringsNow(s, "R")).toBe(true);                     // Rot wirkt weiter
    expect(stanceLift(s)).toBe(1);                           // und zwar auf voller Stärke
    expect(stanceCrit(s, [], {})).toBe(C.STANCE_CRIT);       // Blau trägt dazu
    expect(ringCount(s)).toBe(2);
    // Nach der Mindestdauer ist Rot still.
    for (let i = 0; i < C.STANCE_MIN_DURATION; i++) s = stanceTick(s, [], {}, {}).stance;
    expect(ringsNow(s, "R")).toBe(false);
    expect(ringCount(s)).toBe(1);
  });
  it("JEDER Wechsel erzeugt Überlappung — dichte Wechsel stapeln sie (§2)", () => {
    let s = st({ counts: { B: C.STANCE_THRESHOLD - 1, G: C.STANCE_THRESHOLD - 1 } });
    s = stanceTick(s, [], {}, { wonSuit: "B" }).stance;      // Wechsel 1 → Blau, Rot klingt nach
    expect(ringCount(s)).toBe(2);
    s = stanceTick(s, [], {}, { wonSuit: "G" }).stance;      // Wechsel 2 → Grün, Blau UND Rot klingen
    expect(s.stance).toBe("G");
    expect(ringsNow(s, "B")).toBe(true);
    expect(ringsNow(s, "R")).toBe(true);
    expect(ringCount(s)).toBe(3);
    // ... und es läuft der Reihe nach aus: Rot war zuerst dran und verstummt zuerst, ein Stich vor Blau.
    s = stanceTick(s, [], {}, {}).stance;
    expect(ringCount(s)).toBe(3);                            // Rot hat noch einen Stich
    s = stanceTick(s, [], {}, {}).stance;
    expect(ringsNow(s, "R")).toBe(false);
    expect(ringsNow(s, "B")).toBe(true);
    s = stanceTick(s, [], {}, {}).stance;
    expect(ringCount(s)).toBe(1);                            // nur noch die aktive Haltung
  });
  it("Selbst-Auslösen hält nur den Zähler unten — kein Wechsel, kein Nachklang (Owner)", () => {
    const s = st({ counts: { R: C.STANCE_THRESHOLD - 1 }, carried: ["R"] });
    const r = stanceTick(s, [], {}, { wonSuit: "R" });
    expect(r.switched).toBe(false);
    expect(r.stance.stance).toBe("R");
    expect(r.stance.switches).toBe(0);
    expect(r.stance.counts.R).toBe(0);                        // Zähler gedeckelt: fällt zurück
    // Kein Nachklang: die Haltung ist ohnehin aktiv, es gibt nichts zu überbrücken. Der Nachklang entsteht
    // ausschließlich beim WECHSEL.
    expect(r.stance.ring.R).toBe(0);
    expect(ringsNow(r.stance, "R")).toBe(true);               // aktiv, also klingend
    expect(ringCount(r.stance)).toBe(1);
  });
  it("der Zähler ist gedeckelt — die aktive Farbe steht nie hoch, das Pendeln ist an der Wurzel aus", () => {
    let s = st();
    for (let i = 0; i < 40; i++) s = stanceTick(s, [], {}, { wonSuit: "R" }).stance;
    expect(s.counts.R).toBeLessThan(C.STANCE_THRESHOLD);
    expect(s.switches).toBe(0);                               // dieselbe Farbe wechselt nie auf sich selbst
  });
});

describe("Haltungen — die vier Passive (§3)", () => {
  it("Rot: Niederlage → Gleichstand, Gleichstand → Sieg; ohne Rot nichts", () => {
    const red = st();
    expect(stanceLift(red)).toBe(1);
    const loss = resolveTrick(run(red, { deck: constDeck(0), oppDeck: constDeck(12) }), noCrit);
    expect(loss.lastTrick.result).toBe("tie");               // die Niederlage ist gerutscht
    expect(loss.losses).toBe(0);
    const tie = resolveTrick(run(red, { deck: constDeck(6), oppDeck: constDeck(6) }), noCrit);
    expect(tie.lastTrick.result).toBe("win_tie");            // der Gleichstand ist ein Sieg
    expect(tie.wins).toBe(1);
    // Ohne klingendes Rot bleibt alles, wie es war.
    const blue = st({ stance: "B" });
    expect(stanceLift(blue)).toBe(0);
    expect(resolveTrick(run(blue, { deck: constDeck(0), oppDeck: constDeck(12) }), noCrit).losses).toBe(1);
  });
  it("Blau: durchgehende Crit-Chance, additiv — und Rot zahlt sie nicht", () => {
    expect(stanceCrit(st({ stance: "B" }), [], {})).toBe(C.STANCE_CRIT);
    expect(stanceCrit(st(), [], {})).toBe(0);
    const s = resolveTrick(run(st({ stance: "B" }), { skills: [] }), noCrit);
    expect(s.lastTrick.critChance).toBeCloseTo(C.STANCE_CRIT, 6);
    // Und sie landet auch: derselbe Stich mit einem Wurf unter der Chance crittet, ohne Blau nicht.
    expect(resolveTrick(run(st({ stance: "B" })), zero).lastTrick.isCrit).toBe(true);
    expect(resolveTrick(run(st()), zero).lastTrick.isCrit).toBe(false);
  });
  it("Gelb: glatter Multiplikator auf den Sieg-Score, nur solange Gelb klingt", () => {
    expect(stanceScoreMult(st({ stance: "Y" }), [], {})).toBeCloseTo(C.STANCE_SCORE_MULT, 6);
    expect(stanceScoreMult(st(), [], {})).toBe(1);
    const y = resolveTrick(run(st({ stance: "Y" })), noCrit);
    const r = resolveTrick(run(st()), noCrit);
    expect(y.lastTrick.breakdown.stanceMult).toBeCloseTo(C.STANCE_SCORE_MULT, 6);
    expect(r.lastTrick.breakdown.stanceMult).toBe(1);
    expect(y.lastTrick.gained).toBeCloseTo(r.lastTrick.gained * C.STANCE_SCORE_MULT, 6);
    // Der Faktor sitzt im PRODUKT, nicht in der Basis — beide Stiche starten bei SCORE_PER_WIN, ohne Flat.
    expect(r.lastTrick.breakdown.base).toBe(B);
    expect(y.lastTrick.breakdown.base).toBe(B);
    expect(y.lastTrick.breakdown.flats).toBe(0);
  });
  it("Grün: die Nachbarkarte INNERHALB des Segments erbt eine Überlappungs-Stufe", () => {
    // Zwei Segmente, EINE Formation: die Wiederholung 7/7 auf 3 und 4, am Rand von Segment 0. Alle übrigen Werte
    // sind so gewählt, dass sie nichts bilden (kein Lauf, kein Zickzack, keine Gleichheit) — sonst misst man das
    // Abfärben gegen ein Brett, das selbst schon voller Formationen steckt.
    const plain = computeFormations(order10(), board10());
    const green = computeFormations(order10(), board10(), {}, [], [], [], {}, null, null, null, { bleed: 1 });
    expect(plain[3].formations).toHaveLength(1);
    expect(plain[5].formations).toHaveLength(1);
    // 3 und 4 färben sich gegenseitig an: eine Formation + eine geerbte Stufe = Überlappung ×1,5.
    expect(green[3].mult).toBeCloseTo(plain[3].mult * OVERLAP_BONUS[2], 6);
    expect(green[4].mult).toBeCloseTo(plain[4].mult * OVERLAP_BONUS[2], 6);
    // Die Segmentbindung hält: 4 und 5 liegen nebeneinander, aber in verschiedenen Segmenten — sie erben je nur
    // von ihrem eigenen Nachbarn, nicht voneinander. Beide stehen deshalb auf zwei Stufen, nicht auf drei.
    expect(green[5].mult).toBeCloseTo(plain[5].mult * OVERLAP_BONUS[2], 6);
    // Gegenprobe, dass die Bindung eine echte Klausel ist: fällt sie (Übergriff öffnet alle Grenzen), erben 4 und 5
    // über die Naht hinweg und stehen auf drei Stufen. 3 liegt mitten im Segment und ändert sich dadurch nicht.
    const over = computeFormations(order10(), board10(), {}, [], [], [], {}, null, null, null, { bleed: 1, allBorders: true });
    expect(over[4].mult).toBeCloseTo(plain[4].mult * OVERLAP_BONUS[3], 6);
    expect(over[5].mult).toBeCloseTo(plain[5].mult * OVERLAP_BONUS[3], 6);
    expect(over[3].mult).toBe(green[3].mult);
  });
  it("das Abfärben tut auf einer formationslosen Karte nichts — der Bonus beginnt erst bei zwei (§3)", () => {
    expect(overlapFactor(0)).toBe(1);
    expect(overlapFactor(1)).toBe(1);
    expect(overlapFactor(2)).toBe(OVERLAP_BONUS[2]);
    expect(overlapFactor(4)).toBe(OVERLAP_BONUS[4]);
    // Über der Decke von vier läuft die Leiter linear weiter (Startwert, §5.4).
    expect(overlapFactor(5)).toBeCloseTo(OVERLAP_BONUS[4] + C.STANCE_OVERLAP_OVER, 6);
    expect(overlapFactor(7)).toBeCloseTo(OVERLAP_BONUS[4] + 3 * C.STANCE_OVERLAP_OVER, 6);
  });
  it("die Grundwerte skalieren NICHT mit der Zahl gehaltener Skills (Owner)", () => {
    const many = [S.MITKLANG, S.BEHARRLICHKEIT, S.ANKLANG, S.RUNDE, S.GENUGTUUNG];
    expect(stanceCrit(st({ stance: "B" }), many, {})).toBe(stanceCrit(st({ stance: "B" }), [], {}));
    expect(stanceLift(st())).toBe(stanceLift(st()));
  });
});

describe("Haltungen — Score-Linie (gelb)", () => {
  it("SK_STANCE_01 Stauung: der größte Sieg der gelben Haltung zahlt am Ende noch einmal, mit der Laufzeit skaliert", () => {
    const skills = [S.STAUUNG], tiers = {}, rate = T.stauung[0].peak;
    const s0 = st({ stance: "Y" });
    expect(stauungOn(s0, skills, tiers)).toBe(true);
    expect(stauungOn(st(), skills, tiers)).toBe(false);        // Rot klingt, nicht Gelb
    expect(stauungOn(s0, [], tiers)).toBe(false);              // ohne den Skill passiert nichts
    // Nur die SPITZE zählt, die Summe interessiert nicht: der kleinere Stich lässt sie stehen.
    let s = notePeak(notePeak(s0, 700), 300);
    expect(s.peakBest).toBe(700);
    // Ohne Laufzeit zahlt sie nichts — die Dauer IST der Hebel.
    expect(cashPeak(s, skills, tiers).payout).toBe(0);
    for (let i = 0; i < 6; i++) s = tickPeak(s);
    expect(s.peakTicks).toBe(6);
    const d = cashPeak(s, skills, tiers);
    expect(d.payout).toBeCloseTo(700 * rate * 6, 6);
    expect(d.stance.peakBest).toBe(0);                         // beide Zähler fallen mit der Auszahlung
    expect(d.stance.peakTicks).toBe(0);
    expect(T.stauung.map((r) => r.peak)).toEqual([0.10, 0.15, 0.20, 0.30]);
    expect(cashPeak(s, skills, { [S.STAUUNG]: 3 }).payout).toBeCloseTo(700 * T.stauung[3].peak * 6, 6);
  });
  it("Stauung bunkert NICHT mehr (§5.3): der Sieg zahlt normal, gemerkt wird nur die Spitze", () => {
    const skills = [S.STAUUNG];
    const bare = resolveTrick(run(st({ stance: "Y" })), noCrit);
    const held = resolveTrick(run(st({ stance: "Y" }), { skills }), noCrit);
    expect(held.lastTrick.gained).toBe(bare.lastTrick.gained); // derselbe Stich, derselbe Score
    expect(held.score).toBe(bare.score);
    expect(held.stance.peakBest).toBe(held.lastTrick.gained);  // … nur gemerkt
    expect(held.stance).not.toHaveProperty("bank");            // der Stau selbst ist weg
    // Die Laufzeit zählt auch auf einer NIEDERLAGE hoch, sie verlängert die Haltung genauso.
    const lost = resolveTrick(run(st({ stance: "Y" }), { deck: constDeck(0), oppDeck: constDeck(12), skills }), noCrit);
    expect(lost.lastTrick.result).toBe("loss");
    expect(lost.stance.peakTicks).toBe(1);
    expect(lost.stance.peakBest).toBe(0);
  });
  it("SK_STANCE_02 Beharrlichkeit: der Multiplikator wächst je Stich Laufzeit — Campen zahlt", () => {
    const skills = [S.BEHARRLICHKEIT], per = T.beharrlichkeit[0].perTrick;
    const s0 = st({ stance: "Y", ranFor: { R: 0, B: 0, G: 0, Y: 10 } });
    expect(stanceScoreMult(s0, skills, {})).toBeCloseTo(C.STANCE_SCORE_MULT + 10 * per, 6);
    // Ohne klingendes Gelb tut der Skill nichts.
    expect(stanceScoreMult(st({ ranFor: { R: 0, B: 0, G: 0, Y: 10 } }), skills, {})).toBe(1);
  });
  it("SK_STANCE_03 Mitklang: der Multiplikator zählt je ZUSÄTZLICH klingender Haltung — Tanzen zahlt", () => {
    const skills = [S.MITKLANG], per = T.mitklang[0].perStance;
    const alone = st({ stance: "Y" });
    expect(stanceScoreMult(alone, skills, {})).toBeCloseTo(C.STANCE_SCORE_MULT, 6); // eine klingt → kein Zuschlag
    const three = st({ stance: "Y", ring: { R: 2, B: 1, G: 0, Y: 0 } });
    expect(ringCount(three)).toBe(3);
    expect(stanceScoreMult(three, skills, {})).toBeCloseTo(C.STANCE_SCORE_MULT + 2 * per, 6);
  });
  it("Beharrlichkeit und Mitklang sind ein Spiegelpaar: im Block-Build zahlt die eine, im bunten die andere", () => {
    const block = st({ stance: "Y", ranFor: { R: 0, B: 0, G: 0, Y: 20 } });                 // lange allein
    const bunt = st({ stance: "Y", ring: { R: 2, B: 2, G: 2, Y: 0 }, ranFor: { R: 0, B: 0, G: 0, Y: 1 } });
    expect(stanceScoreMult(block, [S.BEHARRLICHKEIT], {})).toBeGreaterThan(stanceScoreMult(bunt, [S.BEHARRLICHKEIT], {}));
    expect(stanceScoreMult(bunt, [S.MITKLANG], {})).toBeGreaterThan(stanceScoreMult(block, [S.MITKLANG], {}));
  });
});

describe("Haltungen — Crit-Linie (blau)", () => {
  it("SK_STANCE_04 Grundrauschen: Crit-Chance AUSSERHALB der blauen Haltung — der Anti-Leerlauf-Skill (§4.1)", () => {
    const skills = [S.GRUNDRAUSCHEN];
    expect(stanceCrit(st(), skills, {})).toBe(T.grundrauschen[0].crit);          // Rot klingt → Grundrauschen
    expect(stanceCrit(st({ stance: "B" }), skills, {})).toBe(C.STANCE_CRIT);     // Blau klingt → das Passiv, nicht beides
    expect(stanceCrit(st({ stance: "B" }), skills, {})).toBeGreaterThan(T.grundrauschen[3].crit);
    /* Episch trägt zusätzlich einen Crit-MULTIPLIKATOR, unter derselben Bedingung: nur außerhalb von Blau (§5.3).
       Er und Übertrags Rampe schließen sich damit gegenseitig aus — die eine wirkt drinnen, der andere draußen. */
    const epic = { [S.GRUNDRAUSCHEN]: 3 };
    expect(T.grundrauschen.slice(0, 3).some((r) => r.critMult)).toBe(false); // keine der drei unteren Stufen
    expect(grundrauschenCritMult(st(), skills, epic)).toBe(T.grundrauschen[3].critMult);
    expect(grundrauschenCritMult(st({ stance: "B" }), skills, epic)).toBe(0);   // Blau klingt → nichts
    expect(grundrauschenCritMult(st({ stance: "R", ring: { B: 2 } }), skills, epic)).toBe(0); // auch im Nachklang nicht
    expect(grundrauschenCritMult(st(), skills, {})).toBe(0);                    // Normal: kein Multiplikator
    expect(grundrauschenCritMult(st(), [], epic)).toBe(0);
    // In der Engine, außerhalb von Blau: Normal crittet schon (die Chance reicht), trägt aber keinen
    // Multiplikator — Episch legt genau seinen Zuschlag drauf.
    const low = resolveTrick(run(st(), { skills }), zero);
    const high = resolveTrick(run(st(), { skills, skillTiers: epic }), zero);
    expect(low.lastTrick.isCrit).toBe(true);
    expect(high.lastTrick.isCrit).toBe(true);
    expect(low.lastTrick.breakdown.critMult).toBeCloseTo(C.CRIT_BASE_MULT, 6);
    expect(high.lastTrick.breakdown.critMult).toBeCloseTo(C.CRIT_BASE_MULT + T.grundrauschen[3].critMult, 6);
  });
  it("SK_STANCE_05 Übertrag: jeder Crit der blauen Haltung hebt den Crit-MULTIPLIKATOR weiter (§5.3)", () => {
    const skills = [S.UEBERTRAG], step = T.uebertrag[0].step;
    // Die Rampe zählt nur, solange Blau klingt.
    expect(noteCrit(st({ stance: "B" })).critRamp).toBe(1);
    expect(noteCrit(st()).critRamp).toBe(0);                    // Rot klingt, nicht Blau
    expect(uebertragMult(st({ stance: "B", critRamp: 3 }), skills, {})).toBeCloseTo(3 * step, 6);
    expect(uebertragMult(st({ stance: "B", critRamp: 3 }), skills, { [S.UEBERTRAG]: 3 })).toBeCloseTo(3 * T.uebertrag[3].step, 6);
    expect(uebertragMult(st({ stance: "B", critRamp: 3 }), [], {})).toBe(0);
    expect(uebertragMult(st({ stance: "B" }), skills, {})).toBe(0); // ohne Crit keine Rampe
    // Gezahlt wird nur, solange Blau KLINGT — im Nachklang ja, danach nicht. Die Prüfung steht eigenständig in
    // uebertragMult und hängt nicht daran, dass stanceTick die Rampe aufräumt (zwei verschiedene Regeln).
    expect(uebertragMult(st({ stance: "R", ring: { B: 2 }, critRamp: 3 }), skills, {})).toBeCloseTo(3 * step, 6);
    expect(uebertragMult(st({ stance: "R", critRamp: 3 }), skills, {})).toBe(0);
    // Sie erzwingt KEINEN Crit mehr — das war die alte Fassung.
    expect(resolveTrick(run(st({ stance: "B", critRamp: 2 }), { skills }), noCrit).lastTrick.isCrit).toBe(false);
    // In der Engine: derselbe Crit, einmal mit und einmal ohne stehende Rampe.
    const flat = resolveTrick(run(st({ stance: "B" }), { skills }), zero);
    const ramped = resolveTrick(run(st({ stance: "B", critRamp: 3 }), { skills }), zero);
    expect(flat.lastTrick.isCrit).toBe(true);
    expect(ramped.lastTrick.breakdown.critMult - flat.lastTrick.breakdown.critMult).toBeCloseTo(3 * step, 6);
    // Der auslösende Crit zahlt noch mit dem ALTEN Stand; gezählt wird danach.
    expect(flat.lastTrick.breakdown.critMult).toBeCloseTo(C.CRIT_BASE_MULT, 6);
    expect(flat.stance.critRamp).toBe(1);
  });
  it("Übertrags Rampe fällt, sobald Blau verklungen ist", () => {
    let s = st({ stance: "B", critRamp: 4, counts: { G: C.STANCE_THRESHOLD - 1 } });
    s = stanceTick(s, [], {}, { wonSuit: "G" }).stance;
    expect(ringsNow(s, "B")).toBe(true);
    expect(s.critRamp).toBe(4);                                 // der Nachklang trägt sie noch
    for (let i = 0; i < C.STANCE_MIN_DURATION + 1; i++) s = stanceTick(s, [], {}, {}).stance;
    expect(ringsNow(s, "B")).toBe(false);
    expect(s.critRamp).toBe(0);
  });
  it("SK_STANCE_06 Schwungrad: jeder Crit verlängert die laufende Haltung — der Deckel IST der Stufenwert", () => {
    const skills = [S.SCHWUNGRAD];
    let s = st({ stance: "B" });
    const max = T.schwungrad[0].max;
    for (let i = 0; i < max + 3; i++) s = extendStance(s, skills, {}, "crit");
    expect(s.ext.crit).toBe(max);                              // das Budget deckelt, keine Sonderregel
    expect(s.ring.B).toBe(0);                                  // noch nichts auf dem Nachklang — er wird erst beim Wechsel gelegt
    // Die Verlängerung wird bei der ABLÖSUNG eingelöst: sie kommt auf die Mindestdauer obendrauf.
    const after = stanceTick({ ...s, counts: { ...s.counts, G: C.STANCE_THRESHOLD - 1 } }, [], {}, { wonSuit: "G" }).stance;
    expect(after.stance).toBe("G");
    expect(after.ring.B).toBe(C.STANCE_MIN_DURATION + max);
    expect(ringsNow(after, "B")).toBe(true);
    expect(extTotal(after)).toBe(0);                           // Budget für die neue Haltung frisch
    // Ohne den Skill verpufft nichts, weil nichts gesammelt wird.
    expect(extTotal(extendStance(st({ stance: "B" }), [], {}, "crit"))).toBe(0);
  });
  it("die beiden Verlängerer haben GETRENNTE Budgets — beide episch sind die 18 aus §6.5, nicht 10", () => {
    const skills = [S.SCHWUNGRAD, S.KEHRTWENDE];
    const epic = { [S.SCHWUNGRAD]: 3, [S.KEHRTWENDE]: 3 };
    const sMax = T.schwungrad[3].max, kMax = T.kehrtwende[3].max;
    let s = st({ stance: "B" });
    for (let i = 0; i < sMax + kMax + 6; i++) {
      s = extendStance(s, skills, epic, "crit");
      s = extendStance(s, skills, epic, "slid");
    }
    expect(s.ext.crit).toBe(sMax);
    expect(s.ext.slid).toBe(kMax);
    expect(extTotal(s)).toBe(sMax + kMax);
    // Gegenprobe gegen den alten Defekt (EIN Zähler, je gegen den eigenen Deckel geprüft): der lieferte den
    // größeren der beiden Deckel statt ihrer Summe.
    expect(extTotal(s)).toBeGreaterThan(Math.max(sMax, kMax));
    // Und die Summe ist es auch, die bei der Ablösung auf den Nachklang kommt.
    const after = stanceTick({ ...s, counts: { ...s.counts, G: C.STANCE_THRESHOLD - 1 } }, skills, epic, { wonSuit: "G" }).stance;
    expect(after.ring.B).toBe(minDuration(skills, epic) + sMax + kMax);
    // Der Deckel der einen Quelle sperrt die andere nicht: ein volles Schwungrad lässt Kehrtwende weiterzählen.
    let only = st({ stance: "B" });
    for (let i = 0; i < sMax + 3; i++) only = extendStance(only, skills, epic, "crit");
    expect(extendStance(only, skills, epic, "slid").ext.slid).toBe(1);
  });
});

describe("Haltungen — Überlappungs-Linie (grün)", () => {
  it("SK_STANCE_07 Doppelbindung hebt die ANZAHL, nicht den Wert — der einzige Weg über die ×3-Decke", () => {
    const opts = stanceOverlapOpts(st({ stance: "G" }), [S.DOPPELBINDUNG], { [S.DOPPELBINDUNG]: 3 });
    expect(opts.doubleBind).toBe(T.doppelbindung[3].types);
    // Ohne den Skill bleibt die Zahl 0 (keine Doppelzählung).
    expect(stanceOverlapOpts(st({ stance: "G" }), [], {}).doubleBind).toBe(0);
    const deck = constDeck(3).map((c, i) => ({ ...c, value: i < 2 ? 7 : i, baseRank: i < 2 ? 7 : i }));
    const one = computeFormations(identity(), deck, {}, [], [], [], {}, null, null, null, { bleed: 1 });
    const two = computeFormations(identity(), deck, {}, [], [], [], {}, null, null, null, { bleed: 1, doubleBind: 4 });
    expect(two[0].mult).toBeGreaterThan(one[0].mult);
  });
  it("SK_STANCE_08 Übergriff öffnet ALLE Grenzen, solange Grün klingt — gestaffelt ist der Zuschlag", () => {
    const opts = stanceOverlapOpts(st({ stance: "G" }), [S.UEBERGRIFF], {});
    expect(opts.allBorders).toBe(true);
    expect(opts.overlapPlus).toBe(T.uebergriff[0].bonus);
    // Ohne den Skill bleiben die Grenzen zu und der Zuschlag bei 0 — die Geste hängt an keiner Stufe, der Zuschlag schon.
    const bare = stanceOverlapOpts(st({ stance: "G" }), [], {});
    expect(bare.allBorders).toBe(false);
    expect(bare.overlapPlus).toBe(0);
    expect(stanceOverlapOpts(st({ stance: "G" }), [S.UEBERGRIFF], { [S.UEBERGRIFF]: 3 }).overlapPlus).toBe(T.uebergriff[3].bonus);
    /* Das Abfärben über die Naht: auf board10 liegen zwei Wiederholungen Rücken an Rücken an Grenze 0 (3/4 und 5/6).
       Ohne Übergriff färbt 4 nicht auf 5 und 5 nicht auf 4 — beide stehen auf Stufe 2. Mit Übergriff auf Stufe 3. */
    const shut = computeFormations(order10(), board10(), {}, [], [], [], {}, null, null, null, { bleed: 1 });
    const open = computeFormations(order10(), board10(), {}, [], [], [], {}, null, null, null, { bleed: 1, allBorders: true });
    for (const k of [4, 5]) expect(open[k].mult / shut[k].mult).toBeCloseTo(overlapFactor(3) / overlapFactor(2));
    // Die Positionen, die ohnehin im Segment bleiben, ändern sich nicht: Übergriff wirkt genau an der Naht.
    for (const k of [3, 6]) expect(open[k].mult).toBeCloseTo(shut[k].mult);
    // Der Zuschlag liegt ABSOLUT auf dem Überlappungsfaktor — dieselbe Achse wie Pflanzes Verwachsung.
    const plus = computeFormations(order10(), board10(), {}, [], [], [], {}, null, null, null, { bleed: 1, overlapPlus: 0.5 });
    expect(plus[3].mult / shut[3].mult).toBeCloseTo((overlapFactor(2) + 0.5) / overlapFactor(2));
  });
  it("SK_STANCE_09 Verankerung: im NACHKLANG von Grün ein Zuschlag je Formation an der Siegposition (§5.3)", () => {
    const skills = [S.VERANKERUNG], rate = T.verankerung[0].perForm;
    const active = st({ stance: "G" });
    const echo = st({ stance: "R", ring: { G: 2 } });
    expect(greenEchoes(active)).toBe(false);
    expect(greenEchoes(echo)).toBe(true);
    expect(verankerungMult(active, skills, {}, 3)).toBe(1);      // aktiv zahlt sie NICHT
    expect(verankerungMult(echo, skills, {}, 3)).toBeCloseTo(1 + 3 * rate, 6);
    expect(verankerungMult(echo, skills, {}, 0)).toBe(1);        // keine Formation → nichts
    expect(verankerungMult(echo, [], {}, 3)).toBe(1);
    expect(verankerungMult(echo, skills, { [S.VERANKERUNG]: 3 }, 3)).toBeCloseTo(1 + 3 * T.verankerung[3].perForm, 6);
    // Sie ändert KEINE Geometrie mehr: die Überlappungs-Optionen kennen sie nicht.
    expect(Object.keys(stanceOverlapOpts(st({ stance: "G" }), skills, {}))).not.toContain("anchor");
  });
  it("Verankerung in der Engine: derselbe Stich, einmal mit klingendem grünem Nachklang und einmal ohne", () => {
    /* Position 4 ist die ZWEITE Karte der Wiederholung 7/7 und damit die einzige dort, die eine ZAHLENDE Formation
       trägt (die erste Karte eines Laufs hat Faktor 1). Genau die zählt `activeFormationCount` — dieselbe Zahl, die
       der Stich anzeigt und die Brennpunkt/Feuerlinie lesen; Verankerung liest bewusst keine andere. */
    const skills = [S.VERANKERUNG], rate = T.verankerung[0].perForm;
    const board = { deck: board10(), oppDeck: constDeck(0), playerOrder: order10(), oppOrder: order10(), pos: 4 };
    const bare = resolveTrick(run(st({ stance: "R", ring: { G: 2 } }), board), noCrit);
    const held = resolveTrick(run(st({ stance: "R", ring: { G: 2 } }), { ...board, skills }), noCrit);
    const forms = bare.lastTrick.breakdown.formBase;
    expect(forms).toBeGreaterThan(1);                            // die Position trägt wirklich eine Formation
    expect(held.lastTrick.breakdown.stanceMult / bare.lastTrick.breakdown.stanceMult).toBeCloseTo(1 + rate, 6);
    expect(held.lastTrick.gained).toBeGreaterThan(bare.lastTrick.gained);
    // Grün AKTIV statt im Nachklang: derselbe Stich zahlt den Zuschlag nicht.
    const green = resolveTrick(run(st({ stance: "G" }), { ...board, skills }), noCrit);
    const greenBare = resolveTrick(run(st({ stance: "G" }), board), noCrit);
    expect(green.lastTrick.breakdown.stanceMult).toBeCloseTo(greenBare.lastTrick.breakdown.stanceMult, 6);
  });
});

describe("Haltungen — Ergebnis-Linie (rot)", () => {
  it("SK_STANCE_10 Genugtuung sammelt in der roten Haltung und zahlt im NACHKLANG (§5.3)", () => {
    const skills = [S.GENUGTUUNG], rate = T.genugtuung[0].score;
    // Zwei Phasen: Rot aktiv → gezählt, aber nichts gezahlt. Rot nur noch im Nachklang → jeder Stich zahlt.
    const active = st({ stance: "R", turns: 3 });
    const echo = st({ stance: "B", ring: { R: 2 }, turns: 3 });
    expect(redEchoes(active)).toBe(false);
    expect(redEchoes(echo)).toBe(true);
    expect(genugtuungScore(active, skills, {})).toBe(0);       // aktiv zahlt sie NICHT
    expect(genugtuungScore(echo, skills, {})).toBe(3 * rate);
    expect(genugtuungScore(echo, skills, { [S.GENUGTUUNG]: 3 })).toBe(3 * T.genugtuung[3].score);
    expect(genugtuungScore(echo, [], {})).toBe(0);
    expect(genugtuungScore(st({ stance: "B", ring: { R: 2 }, turns: 0 }), skills, {})).toBe(0); // nichts gedreht
    // In der Engine: der gerutschte Stich zählt hoch und zahlt selbst noch nichts …
    const one = resolveTrick(run(st(), { deck: constDeck(6), oppDeck: constDeck(6), skills }), noCrit);
    expect(one.lastTrick.result).toBe("win_tie");
    expect(one.stance.turns).toBe(1);
    expect(one.stanceBase).toBe(0);
    // … und im Nachklang zahlt jeder Stich, auch einer, der gar nichts dreht.
    const paid = resolveTrick(run(st({ stance: "B", ring: { R: 2 }, turns: 4 }), { skills }), noCrit);
    expect(paid.lastTrick.result).toBe("win");
    expect(paid.stanceBase).toBe(4 * rate);
    expect(paid.lastTrick.breakdown.flats).toBeGreaterThanOrEqual(4 * rate);
  });
  it("Genugtuungs Zähler überlebt die Ablösung und fällt erst, wenn Rot verklungen ist", () => {
    // Die Ablösung DARF ihn nicht löschen — der Nachklang, der ihn auszahlt, kommt ja erst danach.
    let s = st({ stance: "R", turns: 5, counts: { B: C.STANCE_THRESHOLD - 1 } });
    s = stanceTick(s, [], {}, { wonSuit: "B" }).stance;
    expect(s.stance).toBe("B");
    expect(ringsNow(s, "R")).toBe(true);
    expect(s.turns).toBe(5);
    for (let i = 0; i < C.STANCE_MIN_DURATION + 1; i++) s = stanceTick(s, [], {}, {}).stance;
    expect(ringsNow(s, "R")).toBe(false);
    expect(s.turns).toBe(0);
  });
  it("SK_STANCE_11 Rückhalt: nach einem gerutschten Stich kämpft die nächste Karte mit mehr Wert", () => {
    const skills = [S.RUECKHALT];
    expect(rueckhaltValue(skills, {})).toBe(T.rueckhalt[0].value);
    expect(rueckhaltValue(skills, { [S.RUECKHALT]: 3 })).toBe(T.rueckhalt[3].value);
    expect(rueckhaltValue([], {})).toBe(0);
    // Ein Rückstand von genau dem Bonus kippt den Stich.
    const gap = T.rueckhalt[0].value;
    const armed = st({ slid: true });
    const s = resolveTrick(run(armed, { deck: constDeck(5), oppDeck: constDeck(5 + gap), skills }), noCrit);
    expect(s.lastTrick.pValue).toBe(5 + gap);
    expect(s.lastTrick.result).toBe("win_tie");                // gleichauf, und Rot hebt den Gleichstand
  });
  it("SK_STANCE_12 Kehrtwende: ein gerutschter Stich verlängert, mit eigenem Budget ÜBER dem des Schwungrads", () => {
    const skills = [S.KEHRTWENDE];
    let s = st();
    const max = T.kehrtwende[0].max;
    expect(max).toBeGreaterThan(T.schwungrad[0].max);          // niedrigere Rate → größerer Deckel (§6.5)
    for (let i = 0; i < max + 3; i++) s = extendStance(s, skills, {}, "slid");
    expect(s.ext.slid).toBe(max);
    // In der Engine sammelt der gerutschte Stich die Verlängerung; eingelöst wird sie bei der Ablösung.
    const one = resolveTrick(run(st(), { deck: constDeck(0), oppDeck: constDeck(12), skills }), noCrit);
    expect(one.lastTrick.result).toBe("tie");
    expect(one.stance.ext.slid).toBe(1);
    // Die zweite Hälfte (§5.3, Owner): derselbe Stich gibt Serienpunkte. Er ist eine Niederlage, die auf
    // Gleichstand gehoben wurde — ohne den Skill rührt sich die Serie dort gar nicht.
    expect(kehrtwendeStreak(skills, {})).toBe(T.kehrtwende[0].streak);
    expect(kehrtwendeStreak(skills, { [S.KEHRTWENDE]: 3 })).toBe(T.kehrtwende[3].streak);
    expect(kehrtwendeStreak([], {})).toBe(0);
    const bare = resolveTrick(run(st(), { deck: constDeck(0), oppDeck: constDeck(12), winStreak: 4 }), noCrit);
    expect(bare.winStreak).toBe(4);                            // Gleichstand allein bewegt die Serie nicht
    const lifted = resolveTrick(run(st(), { deck: constDeck(0), oppDeck: constDeck(12), winStreak: 4, skills }), noCrit);
    expect(lifted.winStreak).toBe(4 + T.kehrtwende[0].streak);
    expect(lifted.bestStreak).toBeGreaterThanOrEqual(lifted.winStreak);
    // Auch der gerutschte SIEG zahlt — dort zusätzlich zu seinem eigenen Serienpunkt.
    const slidWin = resolveTrick(run(st(), { deck: constDeck(5), oppDeck: constDeck(5), winStreak: 4, skills }), noCrit);
    expect(slidWin.lastTrick.result).toBe("win_tie");
    expect(slidWin.winStreak).toBe(4 + 1 + T.kehrtwende[0].streak);
    // Rot muss klingen, sonst rutscht nichts und die Serie bleibt, wo sie ist.
    const noRed = resolveTrick(run(st({ stance: "B" }), { deck: constDeck(0), oppDeck: constDeck(12), winStreak: 4, skills }), noCrit);
    expect(noRed.lastTrick.result).toBe("loss");
    expect(noRed.winStreak).toBe(0);
    /* Die dritte Zahl, nur EPISCH: der Satz des Serien-Multiplikators steigt, solange Rot klingt. Der Satz, nicht
       das Ergebnis — der Deckel bleibt stehen, Episch erreicht ihn nur früher. */
    const epic = { [S.KEHRTWENDE]: 3 };
    const step = T.kehrtwende[3].streakStep;
    expect(T.kehrtwende.slice(0, 3).some((r) => r.streakStep)).toBe(false); // keine der drei unteren Stufen
    expect(kehrtwendeStreakStep(st(), skills, epic)).toBe(step);
    expect(kehrtwendeStreakStep(st(), skills, {})).toBe(0);                 // Normal: kein Zusatz
    expect(kehrtwendeStreakStep(st({ stance: "B" }), skills, epic)).toBe(0); // Rot klingt nicht → nichts
    const below = 25, atCap = Math.ceil(C.STREAK_BASE_CAP / C.STREAK_BASE_STEP);
    expect(streakBaseMult(below, step)).toBeGreaterThan(streakBaseMult(below));
    expect(streakBaseMult(atCap, step)).toBe(streakBaseMult(atCap));        // über dem Deckel identisch
    // In der Engine: derselbe Sieg, einmal mit und einmal ohne den epischen Zusatz.
    const plain = resolveTrick(run(st(), { winStreak: below, skills }), noCrit);
    const boost = resolveTrick(run(st(), { winStreak: below, skills, skillTiers: epic }), noCrit);
    expect(plain.lastTrick.breakdown.streakMult).toBeCloseTo(streakBaseMult(below + 1), 6);
    expect(boost.lastTrick.breakdown.streakMult).toBeCloseTo(streakBaseMult(below + 1, step), 6);
    expect(boost.lastTrick.gained).toBeGreaterThan(plain.lastTrick.gained);
    const handover = stanceTick({ ...one.stance, counts: { ...one.stance.counts, Y: C.STANCE_THRESHOLD - 1 } }, skills, {}, { wonSuit: "Y" }).stance;
    expect(handover.stance).toBe("Y");
    expect(handover.ring.R).toBe(C.STANCE_MIN_DURATION + 1);   // Mindestdauer plus die eine gesammelte Verlängerung
    expect(ringsNow(handover, "R")).toBe(true);
  });
});

describe("Haltungen — Rotation (wirkt über alle)", () => {
  it("SK_STANCE_13 Anklang zahlt Basis-Score in den Stichen NACH dem Wechsel — aufgefrischt, nicht gestapelt", () => {
    const skills = [S.ANKLANG], rate = T.anklang[0].score, dur = T.anklang[0].duration;
    expect(anklangScore(st(), skills, {})).toBe(0);                 // ohne Wechsel kein Fenster
    expect(anklangScore(st({ echo: 2 }), [], {})).toBe(0);          // ohne den Skill nichts
    expect(anklangScore(st({ echo: 2 }), skills, {})).toBe(rate);
    // Der Wechsel öffnet das Fenster in voller Länge; es zählt Stich für Stich herunter.
    let s = stanceTick(st({ counts: { B: C.STANCE_THRESHOLD - 1 } }), skills, {}, { wonSuit: "B" }).stance;
    expect(s.echo).toBe(dur);
    for (let i = 1; i <= dur; i++) { expect(anklangScore(s, skills, {}), `Stich ${i}`).toBe(rate); s = stanceTick(s, skills, {}, {}).stance; }
    expect(s.echo).toBe(0);
    expect(anklangScore(s, skills, {})).toBe(0);
    // Ein zweiter Wechsel frischt auf, er stapelt nicht — der Satz je Stich bleibt derselbe.
    const again = stanceTick({ ...s, echo: 2, counts: { ...s.counts, G: C.STANCE_THRESHOLD - 1 } }, skills, {}, { wonSuit: "G" }).stance;
    expect(again.echo).toBe(dur);
    expect(anklangScore(again, skills, {})).toBe(rate);
    // Und in der Engine landet es als Flat in der multiplizierten Basis.
    const w = resolveTrick(run(st({ echo: 3 }), { skills }), noCrit);
    expect(w.lastTrick.breakdown.flats).toBe(rate);
    expect(w.stanceBase).toBe(rate);
    // Die Decke ist Dauer × Satz — erreichbar nur mit lauter Siegen, Basis-Score gibt es sonst nicht.
    expect(T.anklang[3].duration * T.anklang[3].score).toBe(800);
    const lost = resolveTrick(run(st({ echo: 3 }), { skills, deck: constDeck(0), oppDeck: constDeck(12) }), noCrit);
    expect(lost.stanceBase).toBe(0);
  });
  it("SK_STANCE_13 Anklang: die Mindestdauer steigt, und die Haltung klingt entsprechend länger nach", () => {
    expect(minDuration([], {})).toBe(C.STANCE_MIN_DURATION);
    expect(minDuration([S.ANKLANG], {})).toBe(T.anklang[0].duration);
    expect(minDuration([S.ANKLANG], { [S.ANKLANG]: 3 })).toBe(T.anklang[3].duration);
    const skills = [S.ANKLANG];
    let s = st({ counts: { B: C.STANCE_THRESHOLD - 1, G: C.STANCE_THRESHOLD - 1 } });
    s = stanceTick(s, skills, {}, { wonSuit: "B" }).stance;
    expect(s.ring.R).toBe(T.anklang[0].duration);              // Rot klingt länger nach als ohne den Skill
    s = stanceTick(s, skills, {}, { wonSuit: "G" }).stance;
    expect(s.ring.B).toBe(T.anklang[0].duration);
    expect(ringsNow(s, "B")).toBe(true);
    expect(ringCount(s)).toBe(3);                              // Rot klingt dank der längeren Dauer noch mit
  });
  it("SK_STANCE_14 Runde verkürzt die Leiste — und Episch verlängert den Einklang", () => {
    expect(barLength([], {})).toBe(C.STANCE_BAR);                     // ohne den Skill die volle Länge
    for (let tier = 0; tier < 4; tier++) {
      expect(barLength([S.RUNDE], { [S.RUNDE]: tier }), `Stufe ${tier}`).toBe(T.runde[tier].bar);
      expect(T.runde[tier].bar, `Stufe ${tier}`).toBeLessThan(C.STANCE_BAR); // jede Stufe ist eine Verbesserung
    }
    expect(einklangDuration([], {})).toBe(C.STANCE_EINKLANG);
    // Das Episch-Extra hängt am Moment: ist der abgeschaltet (Ablations-Haken), gibt es nichts zu verlängern.
    expect(einklangDuration([S.RUNDE], { [S.RUNDE]: 3 }))
      .toBe(C.STANCE_EINKLANG > 0 ? C.STANCE_EINKLANG + T.runde[3].einklangPlus : 0);
    // Und sie wirkt: mit dem Skill ist die Leiste nach weniger Wechseln voll.
    const fill = (skills, tiers) => {
      let s = st(), n = 0;
      while (s.einklang === 0 && n < 100) {
        const c = STANCE_SUITS[(n + 1) % 4];
        s = stanceTick({ ...s, counts: { ...s.counts, [c]: s.threshold - 1 } }, skills, tiers, { wonSuit: c }).stance;
        n += 1;
      }
      return n;
    };
    expect(fill([], {})).toBe(C.STANCE_BAR);
    expect(fill([S.RUNDE], { [S.RUNDE]: 3 })).toBe(T.runde[3].bar);
  });
  it("SK_STANCE_15 Beschleunigung: jeder Wechsel senkt die Schwelle, bis auf den Boden — und der ist nie 1 (§6.7)", () => {
    const skills = [S.BESCHLEUNIGUNG];
    for (let t = 0; t < 4; t++) expect(T.beschleunigung[t].floor, `Stufe ${t}`).toBeGreaterThanOrEqual(2);
    let s = st();
    const { step, floor } = T.beschleunigung[0];
    for (let i = 0; i < 10; i++) {
      const c = STANCE_SUITS[(i + 1) % 4];
      s = stanceTick({ ...s, counts: { ...s.counts, [c]: s.threshold - 1 } }, skills, {}, { wonSuit: c }).stance;
    }
    expect(s.threshold).toBe(floor);
    expect(step).toBeGreaterThan(0);
    // Ein Selbst-Auslösen senkt NICHTS — nur echte Wechsel zählen (Owner).
    const self = stanceTick({ ...st(), counts: { R: C.STANCE_THRESHOLD - 1 } }, skills, {}, { wonSuit: "R" }).stance;
    expect(self.threshold).toBe(C.STANCE_THRESHOLD);
  });
});

describe("Haltungen — die Leiste und die Stufe (§3.1)", () => {
  it("jeder ECHTE Wechsel füllt die Leiste, ein Selbst-Auslösen nicht", () => {
    let s = st({ counts: { B: C.STANCE_THRESHOLD - 1 } });
    s = stanceTick(s, [], {}, { wonSuit: "B" }).stance;
    expect(s.bar).toBe(1);
    // Selbst-Auslösen: Zähler fällt, Leiste nicht.
    s = stanceTick({ ...s, counts: { ...s.counts, B: C.STANCE_THRESHOLD - 1 } }, [], {}, { wonSuit: "B" }).stance;
    expect(s.bar).toBe(1);
    expect(s.switches).toBe(1);
  });
  it("volle Leiste: EINKLANG — alle vier klingen gleichzeitig — und die Stufe steigt dauerhaft", () => {
    let s = st();
    for (let i = 0; i < C.STANCE_BAR; i++) {
      const c = STANCE_SUITS[(i + 1) % 4];
      s = stanceTick({ ...s, counts: { ...s.counts, [c]: s.threshold - 1 } }, [], {}, { wonSuit: c }).stance;
    }
    // Die Leiste und die Stufe gelten immer — auch wenn der Moment abgeschaltet ist (Ablations-Haken §6.13).
    expect(s.einklang).toBe(1);
    expect(s.level).toBe(1);
    expect(s.bar).toBe(0);                                   // Leiste auf null, von vorn
    if (C.STANCE_EINKLANG > 0) {
      expect(ringCount(s)).toBe(4);                          // alle vier klingen
      for (const c of STANCE_SUITS) expect(ringsNow(s, c), c).toBe(true);
    }
    // Alles klingt aus, die Stufe bleibt. Lang genug für Einklang UND den gewöhnlichen Nachklang der Wechsel,
    // damit der Abbau nicht vom Ablations-Haken abhängt.
    for (let i = 0; i < Math.max(C.STANCE_EINKLANG, C.STANCE_MIN_DURATION) + 1; i++) s = stanceTick(s, [], {}, {}).stance;
    expect(ringCount(s)).toBe(1);
    expect(s.level).toBe(1);
  });
  it("der Einklang verkürzt keinen längeren Nachklang — er hebt nur an", () => {
    // Blau klingt noch 20 Stiche (ein Verlängerer hat zugelegt). Die Leiste steht kurz vor voll; der nächste
    // Wechsel geht auf Grün, löst den Einklang aus — und Blau behält seine 19, statt auf die Einklang-Dauer
    // gekürzt zu werden. Rot dagegen, das gerade abgelöst wird, steht danach mindestens auf der Einklang-Dauer.
    const s0 = st({ ring: { B: 20 }, bar: C.STANCE_BAR - 1, counts: { G: C.STANCE_THRESHOLD - 1 } });
    const s = stanceTick(s0, [], {}, { wonSuit: "G" }).stance;
    expect(s.einklang).toBe(1);
    expect(s.stance).toBe("G");
    expect(s.ring.B).toBe(19);                                     // abgebaut, nicht gekappt — immer
    expect(s.ring.R).toBeGreaterThanOrEqual(einklangDuration([], {}));
    expect(s.ring.Y).toBe(einklangDuration([], {}));               // hatte nichts: Einklang-Dauer, sonst 0
    expect(ringCount(s)).toBe(C.STANCE_EINKLANG > 0 ? 4 : 3);      // ohne Moment klingt Gelb nicht mit
  });
  it("die Stufe ist ein glatter Multiplikator auf JEDEN Stich — auch ohne klingendes Gelb", () => {
    expect(stanceLevelMult(st({ level: 0 }))).toBe(1);
    expect(stanceLevelMult(st({ level: 10 }))).toBeCloseTo(1 + 10 * C.STANCE_STEP, 9);
    // Rot klingt, Gelb nicht — die Stufe zahlt trotzdem.
    expect(stanceScoreMult(st({ level: 10 }), [], {})).toBeCloseTo(1 + 10 * C.STANCE_STEP, 9);
    // Mit klingendem Gelb multipliziert sie auf dessen Faktor.
    expect(stanceScoreMult(st({ stance: "Y", level: 10 }), [], {}))
      .toBeCloseTo(C.STANCE_SCORE_MULT * (1 + 10 * C.STANCE_STEP), 9);
    // In der Engine landet sie im Stich.
    const s = resolveTrick(run(st({ level: 20 })), noCrit);
    expect(s.lastTrick.breakdown.stanceMult).toBeCloseTo(1 + 20 * C.STANCE_STEP, 9);
  });
  it("der Einklang ist abschaltbar, die Stufe bleibt — der Messhaken für die Ablation (§6.13)", () => {
    // Der Haken hängt an der Konstante; hier wird nur geprüft, dass die Leseregel ihn sauber trennt:
    // Dauer 0 heißt kein Moment, aber die Leiste läuft und die Stufe steigt weiter.
    expect(einklangDuration([S.RUNDE], { [S.RUNDE]: 3 }))
      .toBe(C.STANCE_EINKLANG > 0 ? C.STANCE_EINKLANG + T.runde[3].einklangPlus : 0);
    // Und das Episch-Extra hängt mit ab: „+2 Stiche" auf einen Moment der Länge null wäre ein Rechenfehler.
    if (C.STANCE_EINKLANG === 0) expect(einklangDuration([S.RUNDE], { [S.RUNDE]: 3 })).toBe(0);
  });
  it("Leiste, Stufe und der Spitzen-Zuschlag kennen keine Durchlauf-Grenze", () => {
    /* Seit Stauung nicht mehr bunkert, hat die Fraktion am Durchlauf-Ende gar keinen Haken mehr — nichts wird
       zwangsweise ausgezahlt und nichts zurückgesetzt. Die Gegenprobe steht hier, damit ein wieder eingebauter
       Haken auffällt: ein ganzer Durchlauf über die Grenze hinweg lässt alle drei Zahlen stehen. */
    const s = st({ bar: 3, level: 7, stance: "Y", peakBest: 900, peakTicks: 4 });
    const last = run(s, { skills: [S.STAUUNG], pos: C.TRICKS_PER_CYCLE - 1, cycle: 1 });
    const out = resolveTrick(last, noCrit);
    expect(out.cycle).toBe(2);                                 // der Durchlauf ist wirklich zu Ende gegangen
    expect(out.pos).toBe(0);
    expect(out.stance.bar).toBe(3);
    expect(out.stance.level).toBe(7);
    expect(out.stance.peakTicks).toBe(5);                      // läuft weiter, statt am Durchlauf-Ende auszuzahlen
    expect(out.stance.peakBest).toBeGreaterThanOrEqual(900);
  });
});

describe("Haltungen — Engine-Integration", () => {
  it("die GRUNDFARBE zählt, nie die effektive — Pflanzen-Grün würgt die Rotation sonst ab (§2.2)", () => {
    // Ein rotes Deck, dessen Karten alle pflanzen-grün sind: über die effektive Farbe zählte alles als „G".
    const deck = suitDeck(12, "R").map((c) => ({ ...c, green: true }));
    const s0 = run(st({ counts: { R: C.STANCE_THRESHOLD - 1 } }), { deck, oppDeck: suitDeck(0, "B") });
    const s = resolveTrick(s0, noCrit);
    expect(s.stance.counts.R).toBe(0);      // Rot hat ausgelöst — die Grundfarbe, obwohl die Karte grün ist
    expect(s.stance.counts.G).toBe(0);      // und Grün hat nichts gezählt
    // Gegenprobe: ein rotes Deck OHNE Grün verhält sich genauso — die Färbung ist für die Rotation unsichtbar.
    const bare = resolveTrick(run(st({ counts: { R: C.STANCE_THRESHOLD - 1 } }), { deck: suitDeck(12, "R"), oppDeck: suitDeck(0, "B") }), noCrit);
    expect(bare.stance.counts).toEqual(s.stance.counts);
  });
  it("ein Haltungswechsel liest das Brett neu, wenn er die Geometrie ändert — und sonst nicht", () => {
    expect(stanceFormKeyOf(null)).toBe("");
    const green = stanceOverlapOpts(st({ stance: "G" }), [], {});
    expect(stanceFormKeyOf(green)).not.toBe("");
    // Zwei Haltungen ohne Grün ergeben denselben Schlüssel → kein Neurechnen.
    expect(stanceFormKeyOf(stanceOverlapOpts(st(), [], {}))).toBe(stanceFormKeyOf(stanceOverlapOpts(st({ stance: "B" }), [], {})));
  });
  it("ein voller Lauf mit der Fraktion kommt durch, rotiert und bleibt deterministisch", async () => {
    const { runOne } = await import("../sim/run.js");
    const { factionPolicy } = await import("../sim/policies/faction.js");
    const a = runOne(11, factionPolicy("stance"), null, null, { archetypes: ["stance"] });
    const b = runOne(11, factionPolicy("stance"), null, null, { archetypes: ["stance"] });
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThan(0);
    expect(a.tricks).toBe(C.MAX_CYCLES * C.TRICKS_PER_CYCLE);
    expect(a.build.archetypes).toEqual(["stance"]);
  }, 30_000);
  it("ohne die Fraktion ist jede Naht ein No-op — der Score bleibt, was er ohne sie war", () => {
    const plain = resolveTrick(scen(12, 0), noCrit);
    expect(plain.lastTrick.breakdown.stanceMult).toBe(1);
    expect(plain.stance.active).toBe(false);
    expect(plain.stanceBase).toBe(0);
    // Die Formations-Engine ohne Haltungs-Optionen rechnet Position für Position dasselbe.
    const deck = constDeck(3).map((c, i) => ({ ...c, value: i < 2 ? 7 : i, baseRank: i < 2 ? 7 : i }));
    expect(computeFormations(identity(), deck, {}, [], [], [], {}, null, null, null, null).map((p) => p.mult))
      .toEqual(computeFormations(identity(), deck).map((p) => p.mult));
  });
});
