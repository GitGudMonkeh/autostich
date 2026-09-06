import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, FEUER_TIERS, buildSkillOffer, archetypeOf } from "../src/game/skills.js";
import { F, initHeat, heatMaxFor, syncHeatMax, fireTier, fireParam, heatGainOnWin, heatMult, verbrennungMult, feuersturmMult,
  fireValueBonus, damascusCombat, fireOnWin, fireOnLoss, fireCycleEnd, nextBrandActive } from "../src/game/factions/fire.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

/* Feuer (exp skill rework, docs/skill-rework.md §4): Roster, Stufenleitern, das reine Modul und die Engine-Nähte.
   Die Ids stehen hier wörtlich (Registry-Coverage-Gate); die Zahlen kommen aus den Stufentabellen, nicht abgetippt. */
const FIRE_IDS = [
  "SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_04", "SK_FIRE_05", "SK_FIRE_06", "SK_FIRE_07", "SK_FIRE_08",
  "SK_FIRE_09", "SK_FIRE_12", "SK_FIRE_13", "SK_FIRE_14", "SK_FIRE_15", "SK_FIRE_16",
  "SK_FIRE_L01", "SK_FIRE_L02", "SK_FIRE_L03", "SK_FIRE_L04",
];
const T = FEUER_TIERS;

// Engine-Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1, Serie 1 → streakBaseMult(1)).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const heat = (over = {}) => ({ ...initHeat(), active: true, ...over });
const noCrit = () => 0.99;
const B = C.SCORE_PER_WIN;
const playCycle = (s) => { let g = 0; while (s.cycle === 0 && g++ < 100) s = resolveTrick(s, noCrit); return s; };
// Passiv-Hitze eines Sieges mit Vorsprung m (§7.10: Offset 1, Kühlung 6 — die Tests rechnen aus den Konstanten, nicht aus Zahlen).
const G = (m) => (m >= C.HEAT_MIN_MARGIN ? (m - C.HEAT_MARGIN_OFFSET) * C.HEAT_PER_POINT : 0);

describe("Feuer — Roster und Stufenleitern", () => {
  it("18 Feuer-Skills: 14 normale mit vier Stufen + 4 Legendäre ohne Stufe; Funkenflug, Schmelzofen und Flächenbrand sind weg", () => {
    const fire = Object.values(SKILL_DEFS).filter((s) => s.archetype === "fire");
    expect(fire).toHaveLength(18);
    expect(SKILL_DEFS.SK_FIRE_11).toBeUndefined(); // §7.16: Flächenbrand gestrichen (Owner-Untergrenze: 14 je Fraktion)
    expect(fire.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of FIRE_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("fire");
      expect(typeof SKILL_DEFS[id].desc).toBe("string");
      if (SKILL_DEFS[id].legendary) expect(SKILL_DEFS[id].tiers).toBeUndefined();
      else expect(SKILL_DEFS[id].tiers).toHaveLength(4);
    }
    expect(SKILL_DEFS.SK_FIRE_10).toBeUndefined();
    expect(SKILL_DEFS.SK_FIRE_17).toBeUndefined();
    // Keine Verstärker-Bindung und keine Effekt-Flags mehr — die Mechanik liest nur die Tabellen.
    for (const s of fire) { expect(s.enabler).toBeUndefined(); expect(s.heatConsumer).toBeUndefined(); }
    expect(SKILL_DEFS.SK_FIRE_15.name).toBe("Schmiede");
  });
  it("Leitern sind monoton: Sätze steigen, Schwellen und Preise sinken mit der Stufe", () => {
    const up = (rows, k) => rows.every((r, i) => i === 0 || r[k] > rows[i - 1][k]);
    const down = (rows, k) => rows.every((r, i) => i === 0 || r[k] < rows[i - 1][k]);
    expect(up(T.glut, "below")).toBe(true); // §7.12: Kaltstart-Schwelle steigt mit der Stufe
    expect(up(T.zunder, "heat")).toBe(true);
    expect(up(T.feuersturm, "multPerStreak")).toBe(true); // §7.17: Serie zu Score
    expect(T.feuersturm[3].minHeat).toBe(90); // Episch-Extra: schon ab 90 % Hitze statt voller Leiste (§7.18: war 80)
    for (const r of T.feuersturm) expect(r.perStreak).toBeUndefined(); // keine Hitze mehr
    expect(up(T.glutbett.slice(0, 3), "floor")).toBe(true);
    expect(T.glutbett[3].noCool).toBe(true);
    expect(up(T.rueckzuendung, "perDeficit")).toBe(true);
    expect(down(T.klinge, "perHeat")).toBe(true);
    expect(up(T.weissglut, "multPer10")).toBe(true);
    expect(down(T.feuerwalze, "minHeat")).toBe(true);
    expect(down(T.verbrennung, "minMargin")).toBe(true);
    expect(T.glut[3].halfCool).toBe(true); // §7.16: Episch-Extra — unter der Schwelle kühlen Niederlagen nur halb
    expect(T.flaechenbrand).toBeUndefined(); // §7.16: Flächenbrand gestrichen
    expect(up(T.schmelzpunkt, "perPoint")).toBe(true);
    for (const r of T.schmelzpunkt) { expect(r.burn).toBeUndefined(); expect(r.keep).toBeUndefined(); } // §7.16: der Wandler verbrennt nichts
    expect(T.schmelzpunkt[3].lossPays).toBe(true);
    expect(down(T.brandmal, "minHeat")).toBe(true);
    expect(down(T.lauffeuer, "minHeat")).toBe(true);
    expect(down(T.schmiede, "minHeat")).toBe(true); // §7.14: die Schwelle sinkt mit der Stufe, ein Preis fällt nicht mehr an
    for (const r of T.schmiede) expect(r.cost).toBeUndefined();
    expect(up(T.glutstahl, "perPoint")).toBe(true);
  });
  it("ein Text je Stufe aus denselben Tabellen: `desc` ist der Normal-Text, `descTiers[t]` nennt nur SEINE Stufe", () => {
    expect(SKILL_DEFS.SK_FIRE_01.desc).toBe(SKILL_DEFS.SK_FIRE_01.descTiers[0]);
    expect(SKILL_DEFS.SK_FIRE_01.desc).toContain(`unter ${T.glut[0].below} %`);
    expect(SKILL_DEFS.SK_FIRE_02.descTiers[3]).toContain(`+${T.zunder[3].heat} %`);
    expect(SKILL_DEFS.SK_FIRE_02.descTiers[0]).not.toContain(`+${T.zunder[3].heat} %`);
    expect(SKILL_DEFS.SK_FIRE_09.desc).toContain(`ab ${T.verbrennung[0].minMargin}`);
    expect(SKILL_DEFS.SK_FIRE_15.descTiers[3]).toContain(`ab ${T.schmiede[3].minHeat} % Hitze`);
    expect(SKILL_DEFS.SK_FIRE_15.descTiers[0]).not.toContain("kostet"); // §7.14: ohne Preis
    expect(SKILL_DEFS.SK_FIRE_15.descTiers[3]).toContain(`${T.schmiede[3].cards} niedrigsten Karten`); // das Episch-Extra nur dort
    expect(SKILL_DEFS.SK_FIRE_15.descTiers[2]).not.toContain("niedrigsten Karten");
    expect(SKILL_DEFS.SK_FIRE_L03.desc).toContain(`+${Math.round(C.SONNENZORN_MULT_PER_10 * 100)} %`);
    expect(SKILL_DEFS.SK_FIRE_L03.descTiers).toBeUndefined(); // Legendäre haben keine Stufe
    // Keine Leiter mehr im Text: kein Stufenname steht in einem Stufentext (die Stufe zeigt das Badge).
    for (const id of FIRE_IDS) for (const text of SKILL_DEFS[id].descTiers || []) expect(text, id).not.toMatch(/Selten|Episch|Sehr selten/);
  });
});

describe("Feuer — Modul (reine Übergänge)", () => {
  const st = (m) => m; // skillTiers-Map
  it("Leiste: 100, mit Weißglut 200; syncHeatMax klemmt beim Ersetzen", () => {
    expect(heatMaxFor([])).toBe(C.HEAT_MAX);
    expect(heatMaxFor([F.WEISSGLUT])).toBe(C.WEISSGLUT_HEAT_MAX);
    expect(initHeat()).toMatchObject({ active: false, value: 0, max: C.HEAT_MAX, peak: 0 });
    const h = syncHeatMax(heat({ value: 150, max: 200 }), []);
    expect(h.max).toBe(100); expect(h.value).toBe(100);
    expect(syncHeatMax(heat({ value: 10 }), [F.WEISSGLUT]).max).toBe(200);
    expect(syncHeatMax(null, [F.WEISSGLUT])).toBe(null);
  });
  it("fireTier/fireParam: gewürfelte Stufe, Normal ohne Eintrag, nichts für Legendäre und Ungehaltene", () => {
    expect(fireTier([F.GLUT], {}, F.GLUT)).toBe(0);
    expect(fireTier([F.GLUT], { [F.GLUT]: 2 }, F.GLUT)).toBe(2);
    expect(fireTier([F.SONNENKERN], {}, F.SONNENKERN)).toBe(null);
    expect(fireParam([], {}, F.GLUT, "below")).toBeUndefined();
    expect(fireParam([F.GLUT], { [F.GLUT]: 3 }, F.GLUT, "below")).toBe(T.glut[3].below);
  });
  it("heatGainOnWin: Passiv ab Vorsprung 3, Glut, Zunder, Rückzündung — Feuersturm gibt keine Hitze mehr (§7.17)", () => {
    expect(heatGainOnWin([], {}, { margin: 2 })).toBe(0);
    expect(heatGainOnWin([], {}, { margin: 6 })).toBe(G(6));
    expect(G(6)).toBe(6 - C.HEAT_MARGIN_OFFSET);
    // Glut (§7.12): unter der Schwelle der Stufe zählt der ganze Gewinn ×2 — an der Schwelle nicht mehr; auch Zunder zählt mit.
    expect(heatGainOnWin([F.GLUT], st({ [F.GLUT]: 1 }), { margin: 6, heatValue: T.glut[1].below - 1 })).toBe(G(6) * T.glut[1].mult);
    expect(heatGainOnWin([F.GLUT], st({ [F.GLUT]: 1 }), { margin: 6, heatValue: T.glut[1].below })).toBe(G(6));
    expect(heatGainOnWin([F.GLUT], st({ [F.GLUT]: 3 }), { margin: 6, heatValue: 70 })).toBe(G(6) * T.glut[3].mult);
    expect(heatGainOnWin([F.GLUT, F.ZUNDER], st({}), { margin: 1, heatValue: 0 })).toBe(T.zunder[0].heat * T.glut[0].mult);
    expect(heatGainOnWin([F.ZUNDER], st({ [F.ZUNDER]: 1 }), { margin: 1 })).toBe(T.zunder[1].heat);     // auch knapp
    expect(heatGainOnWin([F.FEUERSTURM], st({ [F.FEUERSTURM]: 1 }), { margin: 1, streak: 3 })).toBe(0);
    expect(heatGainOnWin([F.RUECKZUENDUNG], st({ [F.RUECKZUENDUNG]: 1 }), { margin: 1, lastResult: "loss", lastLossDeficit: 4 })).toBe(4 * T.rueckzuendung[1].perDeficit);
    expect(heatGainOnWin([F.RUECKZUENDUNG], st({ [F.RUECKZUENDUNG]: 1 }), { margin: 1, lastResult: "win", lastLossDeficit: 4 })).toBe(0);
  });
  it("heatMult: je volle 10 % +2 %, über 100 nur mit Weißglut, Sonnenzorn mit Spitze und doppelt", () => {
    expect(heatMult([], {}, 0)).toBe(1);
    expect(heatMult([], {}, 55)).toBeCloseTo(1 + 5 * C.HEAT_MULT_PER_10);
    expect(heatMult([], {}, 100)).toBeCloseTo(1 + 10 * C.HEAT_MULT_PER_10);
    expect(heatMult([], {}, 150)).toBeCloseTo(1 + 10 * C.HEAT_MULT_PER_10);                         // ohne Weißglut gedeckelt
    expect(heatMult([F.WEISSGLUT], {}, 150)).toBeCloseTo(1 + 10 * C.HEAT_MULT_PER_10 + 5 * T.weissglut[0].multPer10);
    expect(heatMult([F.WEISSGLUT], { [F.WEISSGLUT]: 3 }, 200)).toBeCloseTo(1 + 10 * C.HEAT_MULT_PER_10 + 10 * T.weissglut[3].multPer10);
    expect(heatMult([F.SONNENZORN], {}, 30, 100)).toBeCloseTo(1 + 10 * C.SONNENZORN_MULT_PER_10);    // Spitze statt aktuell
    expect(heatMult([F.SONNENZORN, F.WEISSGLUT], { [F.WEISSGLUT]: 1 }, 0, 200)).toBeCloseTo(1 + 10 * C.SONNENZORN_MULT_PER_10 + 10 * T.weissglut[1].multPer10);
  });
  it("feuersturmMult (§7.17): bei voller Leiste +Satz je Serienpunkt, Episch schon ab 80 % Hitze; unter dem Tor und ohne Serie 1", () => {
    expect(feuersturmMult([], {}, 100, 100, 10)).toBe(1);
    expect(feuersturmMult([F.FEUERSTURM], {}, 99, 100, 10)).toBe(1);
    expect(feuersturmMult([F.FEUERSTURM], {}, 100, 100, 10)).toBeCloseTo(1 + 10 * T.feuersturm[0].multPerStreak);
    expect(feuersturmMult([F.FEUERSTURM], { [F.FEUERSTURM]: 2 }, 100, 100, 30)).toBeCloseTo(1 + 30 * T.feuersturm[2].multPerStreak);
    expect(feuersturmMult([F.FEUERSTURM], {}, 100, 200, 10)).toBe(1); // mit Weißglut ist voll erst 200
    expect(feuersturmMult([F.FEUERSTURM], {}, 200, 200, 10)).toBeCloseTo(1 + 10 * T.feuersturm[0].multPerStreak);
    expect(feuersturmMult([F.FEUERSTURM], { [F.FEUERSTURM]: 3 }, T.feuersturm[3].minHeat, 200, 10)).toBeCloseTo(1 + 10 * T.feuersturm[3].multPerStreak); // Episch ab der Schwelle
    expect(feuersturmMult([F.FEUERSTURM], { [F.FEUERSTURM]: 3 }, T.feuersturm[3].minHeat - 1, 200, 10)).toBe(1);
    expect(feuersturmMult([F.FEUERSTURM], {}, 100, 100, 0)).toBe(1);
  });
  it("verbrennungMult: ×1,5 ab dem Vorsprung der Stufe", () => {
    expect(verbrennungMult([], {}, 20)).toBe(1);
    expect(verbrennungMult([F.VERBRENNUNG], {}, T.verbrennung[0].minMargin - 1)).toBe(1);
    expect(verbrennungMult([F.VERBRENNUNG], {}, T.verbrennung[0].minMargin)).toBe(T.verbrennung[0].mult);
    expect(verbrennungMult([F.VERBRENNUNG], { [F.VERBRENNUNG]: 3 }, T.verbrennung[3].minMargin)).toBe(T.verbrennung[3].mult);
  });
  it("fireValueBonus: Klinge je Schritt, Feuerwalze nach Sieg (Episch auch nach Niederlage), Rückzündung Episch", () => {
    expect(fireValueBonus(heat({ value: 80 }), [F.KLINGE], {}, {})).toBe(2);
    expect(fireValueBonus(heat({ value: 100 }), [F.KLINGE], { [F.KLINGE]: 3 }, {})).toBe(5);
    expect(fireValueBonus(heat({ value: 200 }), [F.KLINGE], { [F.KLINGE]: 3 }, {})).toBe(10);              // ohne Deckel
    expect(fireValueBonus(heat({ value: 80 }), [F.FEUERWALZE], {}, { lastResult: "win" })).toBe(T.feuerwalze[0].value);
    expect(fireValueBonus(heat({ value: 79 }), [F.FEUERWALZE], {}, { lastResult: "win" })).toBe(0);
    expect(fireValueBonus(heat({ value: 80 }), [F.FEUERWALZE], {}, { lastResult: "loss" })).toBe(0);
    expect(fireValueBonus(heat({ value: 20 }), [F.FEUERWALZE], { [F.FEUERWALZE]: 3 }, { lastResult: "loss" })).toBe(T.feuerwalze[3].value);
    expect(fireValueBonus(heat({ value: 0 }), [F.RUECKZUENDUNG], { [F.RUECKZUENDUNG]: 3 }, { lastResult: "loss" })).toBe(T.rueckzuendung[3].value);
    expect(fireValueBonus(heat({ value: 0 }), [F.RUECKZUENDUNG], {}, { lastResult: "loss" })).toBe(0);
    expect(fireValueBonus(null, [F.KLINGE], {}, {})).toBe(0);
  });
  it("damascusCombat: Schmiedewert zählt im Kampf doppelt, nur mit Damaststahl", () => {
    expect(damascusCombat([F.DAMASTSTAHL], { X0: 6 }, { id: "X0" })).toBe(6);
    expect(damascusCombat([], { X0: 6 }, { id: "X0" })).toBe(0);
    expect(damascusCombat([F.DAMASTSTAHL], {}, { id: "X0" })).toBe(0);
  });
  it("fireOnWin (§7.16, Überlauf-Wandler): Schmelzpunkt wandelt die Hitze über der Leiste in Basis-Score, die Leiste bleibt voll; unter voll nichts; Episch zahlt die vorgemerkte Kühlung", () => {
    // Nicht voll: der Gewinn geht auf die Leiste, nichts wird gewandelt.
    const warm = fireOnWin(heat({ value: 50 }), [F.SCHMELZPUNKT], { [F.SCHMELZPUNKT]: 1 }, { margin: 6 });
    expect(warm.heat.value).toBe(50 + G(6)); expect(warm.flat).toBe(0); expect(warm.melted).toBe(0);
    // Voll (100 der 100er-Leiste): der Gewinn (Vorsprung 6) passt nicht mehr auf die Leiste und zahlt je Punkt; die Leiste bleibt bei 100.
    const full = fireOnWin(heat({ value: 100 }), [F.SCHMELZPUNKT], { [F.SCHMELZPUNKT]: 1 }, { margin: 6 });
    expect(full.held).toBe(100); expect(full.heat.value).toBe(100); expect(full.melted).toBe(G(6)); expect(full.flat).toBe(G(6) * T.schmelzpunkt[1].perPoint);
    // Knapp unter voll: nur der Teil über der Leiste zählt.
    const edge = fireOnWin(heat({ value: 98 }), [F.SCHMELZPUNKT], {}, { margin: 6 });
    expect(98 + G(6)).toBeGreaterThan(100);
    expect(edge.heat.value).toBe(100); expect(edge.melted).toBe(98 + G(6) - 100);
    // Ohne Hitzegewinn (Vorsprung unter der Mindestmarke) gibt es auch bei voller Leiste nichts zu wandeln.
    expect(fireOnWin(heat({ value: 100 }), [F.SCHMELZPUNKT], {}, { margin: 1 }).flat).toBe(0);
    // Mit Weißglut ist die Leiste erst bei 200 voll.
    expect(fireOnWin(heat({ value: 100, max: 200 }), [F.SCHMELZPUNKT, F.WEISSGLUT], {}, { margin: 6 }).melted).toBe(0);
    expect(fireOnWin(heat({ value: 200, max: 200 }), [F.SCHMELZPUNKT, F.WEISSGLUT], {}, { margin: 6 }).melted).toBe(G(6));
    // Episch: die vorgemerkte Kühlung (meltPending) zahlt mit dem nächsten Sieg und ist danach verbraucht.
    const e = fireOnWin(heat({ value: 94, meltPending: C.HEAT_LOSS }), [F.SCHMELZPUNKT], { [F.SCHMELZPUNKT]: 3 }, { margin: 1 });
    expect(e.melted).toBe(C.HEAT_LOSS); expect(e.flat).toBe(C.HEAT_LOSS * T.schmelzpunkt[3].perPoint); expect(e.heat.meltPending).toBe(0);
    // Ohne Schmelzpunkt bleibt eine Vormerkung liegen und zahlt nichts.
    expect(fireOnWin(heat({ value: 94, meltPending: 6 }), [F.KLINGE], {}, { margin: 1 }).flat).toBe(0);
  });
  it("fireOnWin: Phönix zündet neu, Glutstahl je Punkt über dem Grundwert (Episch Schmiedewert doppelt), Sonnenkern je Brandpunkt", () => {
    // Phönix: Hitze auf 0 zündet mit dem Sieg neu.
    const ph = fireOnWin(heat({ value: 0 }), [F.PHOENIXFEUER], {}, { margin: 1 });
    expect(ph.heat.value).toBe(C.PHOENIX_REIGNITE);
    expect(fireOnWin(heat({ value: 10 }), [F.GLUTSTAHL], {}, { margin: 1, valueOver: 3, card: { id: "X0" } }).flat).toBe(3 * T.glutstahl[0].perPoint);
    expect(fireOnWin(heat({ value: 10 }), [F.GLUTSTAHL], { [F.GLUTSTAHL]: 3 }, { margin: 1, valueOver: 3, card: { id: "X0" }, forged: { X0: 3 } }).flat).toBe(6 * T.glutstahl[3].perPoint);
    const sk = fireOnWin(heat({ value: 10 }), [F.SONNENKERN], {}, { margin: 1, brandOnOpp: 3, oppId: "O5" });
    expect(sk.flat).toBe(3 * C.SONNENKERN_SCORE_PER_BRAND);
    expect(sk.brands).toEqual([{ id: "O5", value: C.SONNENKERN_BRAND }]);
  });
  it("fireOnWin: Brandmal und Lauffeuer setzen Brände ab der Hitze-Schwelle (Nachbarn im Gegnerdeck, Episch Reichweite 2)", () => {
    const oppDeck = constDeck(5);
    const ctx = { margin: 1, oppId: "X5", oppIndex: 5, oppDeck };
    expect(fireOnWin(heat({ value: 79 }), [F.BRANDMAL], {}, ctx).brands).toEqual([]);
    expect(fireOnWin(heat({ value: 80 }), [F.BRANDMAL], {}, ctx).brands).toEqual([{ id: "X5", value: T.brandmal[0].value }]);
    expect(fireOnWin(heat({ value: 80 }), [F.LAUFFEUER], {}, ctx).brands).toEqual([{ id: "X4", value: 1 }, { id: "X6", value: 1 }]);
    expect(fireOnWin(heat({ value: 80 }), [F.LAUFFEUER], { [F.LAUFFEUER]: 3 }, ctx).brands.map((b) => b.id)).toEqual(["X4", "X6", "X3", "X7"]);
    expect(fireOnWin(heat({ value: 80 }), [F.LAUFFEUER], {}, { ...ctx, oppId: "X0", oppIndex: 0 }).brands).toEqual([{ id: "X1", value: 1 }]); // kein Wrap
    // Brandmal + Lauffeuer + Sonnenkern: drei Quellen, die Engine summiert je Karte.
    expect(fireOnWin(heat({ value: 80 }), [F.BRANDMAL, F.LAUFFEUER, F.SONNENKERN], {}, ctx).brands).toHaveLength(4);
  });
  it("fireOnLoss: −2 flach, Glutbett-Boden (Episch keine Kühlung), Phönix heizt, Brandmal Episch brandmarkt den Sieger", () => {
    expect(fireOnLoss(heat({ value: 50 }), [], {}, { deficit: 7 }).heat).toMatchObject({ value: 50 - C.HEAT_LOSS, lastLossDeficit: 7 });
    expect(fireOnLoss(heat({ value: 1 }), [], {}, { deficit: 1 }).heat.value).toBe(0);
    expect(fireOnLoss(heat({ value: 41 }), [F.GLUTBETT], {}, { deficit: 1 }).heat.value).toBe(T.glutbett[0].floor);
    expect(fireOnLoss(heat({ value: 30 }), [F.GLUTBETT], {}, { deficit: 1 }).heat.value).toBe(30);   // unter dem Boden: nichts
    expect(fireOnLoss(heat({ value: 95 }), [F.GLUTBETT], { [F.GLUTBETT]: 3 }, { deficit: 9 }).heat.value).toBe(95);
    expect(fireOnLoss(heat({ value: 10 }), [F.PHOENIXFEUER], {}, { deficit: 3 }).heat.value).toBe(10 + 3 * C.PHOENIX_LOSS_HEAT);
    expect(fireOnLoss(heat({ value: 20 }), [F.BRANDMAL], { [F.BRANDMAL]: 3 }, { deficit: 3, oppId: "O1" }).brands).toEqual([{ id: "O1", value: T.brandmal[3].value }]);
    expect(fireOnLoss(heat({ value: 20 }), [F.BRANDMAL], {}, { deficit: 3, oppId: "O1" }).brands).toEqual([]);
    // §7.16 Glut Episch: unter der Kaltstart-Schwelle kühlen Niederlagen nur halb, darüber voll; Normal ohne Extra.
    expect(fireOnLoss(heat({ value: 50 }), [F.GLUT], { [F.GLUT]: 3 }, { deficit: 1 }).heat.value).toBe(50 - C.HEAT_LOSS / 2);
    expect(fireOnLoss(heat({ value: T.glut[3].below + 5 }), [F.GLUT], { [F.GLUT]: 3 }, { deficit: 1 }).heat.value).toBe(T.glut[3].below + 5 - C.HEAT_LOSS);
    expect(fireOnLoss(heat({ value: 50 }), [F.GLUT], {}, { deficit: 1 }).heat.value).toBe(50 - C.HEAT_LOSS);
    // §7.16 Schmelzpunkt Episch: die Kühlung bei voller Leiste ist vorgemerkt (zahlt beim nächsten Sieg); unter voll und auf Normal nicht.
    expect(fireOnLoss(heat({ value: 100 }), [F.SCHMELZPUNKT], { [F.SCHMELZPUNKT]: 3 }, { deficit: 1 }).heat.meltPending).toBe(C.HEAT_LOSS);
    expect(fireOnLoss(heat({ value: 99 }), [F.SCHMELZPUNKT], { [F.SCHMELZPUNKT]: 3 }, { deficit: 1 }).heat.meltPending).toBe(0);
    expect(fireOnLoss(heat({ value: 100 }), [F.SCHMELZPUNKT], {}, { deficit: 1 }).heat.meltPending).toBe(0);
  });
  it("fireCycleEnd (§7.14, Schwelle ohne Preis): Schmiede hebt die niedrigste Karte ab der Schwelle der Stufe (Episch zwei), die Hitze bleibt, Damaststahl ohne Schwelle, Phönix danach", () => {
    const deck = constDeck(5).map((c, i) => (i === 3 ? { ...c, value: 2 } : i === 7 ? { ...c, value: 3 } : c));
    const min = T.schmiede[0].minHeat;
    const r = fireCycleEnd(heat({ value: min }), [F.SCHMIEDE], {}, deck, {});
    expect(r.heat.value).toBe(min); expect(r.forgedIds).toEqual(["X3"]); expect(r.forged).toEqual({ X3: C.FORGE_VALUE }); // kein Preis
    expect(r.deck.find((c) => c.id === "X3").value).toBe(2 + C.FORGE_VALUE);
    expect(fireCycleEnd(heat({ value: min - 1 }), [F.SCHMIEDE], {}, deck, {}).forgedIds).toEqual([]); // unter der Schwelle → keine Schmiedung
    expect(fireCycleEnd(heat({ value: min, max: 200 }), [F.SCHMIEDE, F.WEISSGLUT], {}, deck, {}).forgedIds).toEqual(["X3"]); // die Schwelle liest die Hitze, nicht die Leistenlänge
    const e = fireCycleEnd(heat({ value: T.schmiede[3].minHeat }), [F.SCHMIEDE], { [F.SCHMIEDE]: 3 }, deck, {});
    expect(e.heat.value).toBe(T.schmiede[3].minHeat); expect(e.forgedIds).toEqual(["X3", "X7"]); // die zwei niedrigsten, verschieden
    expect(fireCycleEnd(heat({ value: T.schmiede[3].minHeat - 1 }), [F.SCHMIEDE], { [F.SCHMIEDE]: 3 }, deck, {}).forgedIds).toEqual([]);
    const d = fireCycleEnd(heat({ value: 0 }), [F.DAMASTSTAHL], {}, deck, { X3: 3 });
    expect(d.forgedIds).toEqual(["X3"]); expect(d.forged).toEqual({ X3: 6 });
    expect(fireCycleEnd(heat({ value: 0 }), [F.PHOENIXFEUER], {}, deck, {}).heat.value).toBe(C.PHOENIX_REIGNITE);
    expect(fireCycleEnd(null, [F.SCHMIEDE], {}, deck, {}).deck).toBe(deck);
  });
  it("nextBrandActive: Brände erneuern sich je Runde, mit Sonnenkern stapeln sie", () => {
    expect(nextBrandActive([], { A: 2, B: 1 }, { A: 2 })).toEqual({ A: 2 });
    expect(nextBrandActive([F.SONNENKERN], { A: 2, B: 1 }, { A: 2, C: 1 })).toEqual({ A: 4, B: 1, C: 1 });
  });
});

describe("Feuer — Engine-Integration", () => {
  it("Passiv: Sieg mit Vorsprung 6 gibt (6 − Offset) Hitze, der Hitze-Multiplikator ist ein eigener Faktor auf den Stich", () => {
    const cold = resolveTrick(scen(12, 6, { skills: [F.VERBRENNUNG], heat: heat({ value: 0 }) }), noCrit);
    expect(cold.lastTrick.result).toBe("win");
    expect(cold.heat.value).toBe(G(6));
    const warm = resolveTrick(scen(12, 6, { skills: [F.VERBRENNUNG], heat: heat({ value: 60 }) }), noCrit);
    expect(warm.heat.value).toBe(60 + G(6));
    // gelesen wird die Hitze nach dem Gewinn (60 + Gewinn → sechs volle Zehner), gegen den kalten Lauf (unter 10 → keiner).
    expect(G(6)).toBeLessThan(10);
    expect(warm.lastTrick.scoreGain / cold.lastTrick.scoreGain).toBeCloseTo(heatMult([], {}, 60 + G(6)), 6);
    expect(warm.lastTrick.breakdown.fireMult).toBeCloseTo(heatMult([], {}, 60 + G(6)), 6);
    expect(warm.fireHeat).toBeGreaterThan(0);
    expect(warm.fireBase).toBe(0); // kein Feuer-Score im Passiv
  });
  it("Stufe aus state.skillTiers: Glut Episch verdoppelt die Hitze aus Siegen unter 80 %, darüber nicht", () => {
    const cold = resolveTrick(scen(12, 6, { skills: [F.GLUT], skillTiers: { [F.GLUT]: 3 }, heat: heat({ value: 0 }) }), noCrit);
    expect(cold.heat.value).toBe(G(6) * T.glut[3].mult);
    const hot = resolveTrick(scen(12, 6, { skills: [F.GLUT], skillTiers: { [F.GLUT]: 3 }, heat: heat({ value: T.glut[3].below }) }), noCrit);
    expect(hot.heat.value).toBe(T.glut[3].below + G(6));
    const normal = resolveTrick(scen(12, 6, { skills: [F.GLUT], heat: heat({ value: T.glut[0].below }) }), noCrit); // Normal: ab 40 nicht mehr
    expect(normal.heat.value).toBe(T.glut[0].below + G(6));
  });
  it("Niederlage kühlt −2 und merkt den Rückstand; Phönixfeuer heizt stattdessen", () => {
    const s = resolveTrick(scen(2, 9, { skills: [F.GLUT], heat: heat({ value: 50 }) }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.heat.value).toBe(50 - C.HEAT_LOSS);
    expect(s.heat.lastLossDeficit).toBe(7);
    const ph = resolveTrick(scen(2, 9, { skills: [F.PHOENIXFEUER], heat: heat({ value: 50 }) }), noCrit);
    expect(ph.heat.value).toBe(50 + 7 * C.PHOENIX_LOSS_HEAT);
  });
  it("Verbrennung: ein Sieg ab dem Vorsprung der Stufe zählt ×1,5 — im selben Faktor wie der Hitze-Multiplikator", () => {
    const big = resolveTrick(scen(14, 6, { skills: [F.VERBRENNUNG], heat: heat({ value: 0 }) }), noCrit);   // Vorsprung 8
    const small = resolveTrick(scen(13, 6, { skills: [F.VERBRENNUNG], heat: heat({ value: 0 }) }), noCrit); // Vorsprung 7
    expect(big.lastTrick.breakdown.fireMult).toBeCloseTo(T.verbrennung[0].mult * heatMult([], {}, 6), 6);
    expect(small.lastTrick.breakdown.fireMult).toBeCloseTo(heatMult([], {}, 5), 6);
  });
  it("Feuersturm in der Engine (§7.17): bei voller Leiste steht die Serie nach dem Sieg im Feuer-Faktor, darunter nicht", () => {
    // winStreak 5 vor dem Stich → Serie 6 nach dem Sieg (die Engine liest die effektive Serie NACH dem Sieg, wie der Serien-Mult).
    const full = resolveTrick(scen(12, 6, { skills: [F.FEUERSTURM], heat: heat({ value: 100 }), winStreak: 5 }), noCrit);
    expect(full.lastTrick.breakdown.fireMult).toBeCloseTo(heatMult([], {}, 100) * (1 + 6 * T.feuersturm[0].multPerStreak), 6);
    expect(full.heat.value).toBe(100); // Feuersturm gibt keine Hitze mehr
    const warm = resolveTrick(scen(12, 6, { skills: [F.FEUERSTURM], heat: heat({ value: 90 }), winStreak: 5 }), noCrit);
    expect(warm.lastTrick.breakdown.fireMult).toBeCloseTo(heatMult([], {}, 90 + G(6)), 6);
    expect(warm.heat.value).toBe(90 + G(6));
  });
  it("Schmelzpunkt in der Engine (§7.16): bei voller Leiste steht der Überschuss in der multiplizierten Basis, die Leiste bleibt voll; unter voll nichts; die Niederlage kühlt", () => {
    const s = resolveTrick(scen(12, 6, { skills: [F.SCHMELZPUNKT], heat: heat({ value: 100 }) }), noCrit);
    expect(s.heat.value).toBe(100);
    const melted = G(6) * T.schmelzpunkt[0].perPoint;
    expect(s.lastTrick.breakdown.flats).toBe(melted);
    expect(s.fireBase).toBe(melted);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + melted) * s.lastTrick.breakdown.streakMult * heatMult([], {}, 100), 4);
    const warm = resolveTrick(scen(12, 6, { skills: [F.SCHMELZPUNKT], heat: heat({ value: 50 }) }), noCrit);
    expect(warm.heat.value).toBe(50 + G(6)); expect(warm.fireBase).toBe(0);
    const lost = resolveTrick(scen(2, 9, { skills: [F.SCHMELZPUNKT], heat: heat({ value: 100 }) }), noCrit);
    expect(lost.heat.value).toBe(100 - C.HEAT_LOSS);
    // Episch: die Kühlung der Niederlage bei voller Leiste zahlt mit dem nächsten Sieg (Vormerkung → Basis).
    const lostE = resolveTrick(scen(2, 9, { skills: [F.SCHMELZPUNKT], skillTiers: { [F.SCHMELZPUNKT]: 3 }, heat: heat({ value: 100 }) }), noCrit);
    expect(lostE.heat.meltPending).toBe(C.HEAT_LOSS);
    const paid = resolveTrick(scen(12, 6, { skills: [F.SCHMELZPUNKT], skillTiers: { [F.SCHMELZPUNKT]: 3 }, heat: heat({ value: 100 - C.HEAT_LOSS, meltPending: C.HEAT_LOSS }) }), noCrit);
    expect(paid.lastTrick.breakdown.flats).toBe(C.HEAT_LOSS * T.schmelzpunkt[3].perPoint); expect(paid.heat.meltPending).toBe(0);
  });
  it("Glühende Klinge und Feuerwalze heben den Kampfwert; Rückzündung Episch nach einer Niederlage", () => {
    const k = resolveTrick(scen(5, 6, { skills: [F.KLINGE], skillTiers: { [F.KLINGE]: 1 }, heat: heat({ value: 60 }) }), noCrit);
    expect(k.lastTrick.pValue).toBe(5 + 2);
    expect(k.lastTrick.result).toBe("win");
    const fw = resolveTrick(scen(5, 6, { skills: [F.FEUERWALZE], heat: heat({ value: 80 }), lastResult: "win" }), noCrit);
    expect(fw.lastTrick.pValue).toBe(5 + T.feuerwalze[0].value);
    const rz = resolveTrick(scen(5, 6, { skills: [F.RUECKZUENDUNG], skillTiers: { [F.RUECKZUENDUNG]: 3 }, heat: heat({ value: 0 }), lastResult: "loss" }), noCrit);
    expect(rz.lastTrick.pValue).toBe(5 + T.rueckzuendung[3].value);
  });
  it("Glutstahl zahlt je Punkt Kampfwert über dem Grundwert, egal woher (hier: Klinge)", () => {
    const s = resolveTrick(scen(12, 6, { skills: [F.GLUTSTAHL, F.KLINGE], heat: heat({ value: 80 }) }), noCrit);
    expect(s.lastTrick.pValue).toBe(14);
    expect(s.lastTrick.breakdown.flats).toBe(2 * T.glutstahl[0].perPoint);
  });
  it("Brandmal: der Brand wird am Rundenende aktiv und senkt den Gegnerwert in der nächsten Runde", () => {
    const s = resolveTrick(scen(12, 6, { skills: [F.BRANDMAL], heat: heat({ value: 80 }) }), noCrit);
    expect(s.brandPending[s.lastTrick.oCard.id]).toBe(T.brandmal[0].value);
    expect(s.brandTotal).toBe(1);
    const done = playCycle(scen(12, 6, { skills: [F.BRANDMAL], heat: heat({ value: 80 }) }));
    expect(done.cycle).toBe(1);
    expect(Object.values(done.brandActive).every((v) => v === T.brandmal[0].value)).toBe(true);
    expect(done.brandPending).toEqual({});
    const next = resolveTrick({ ...done, phase: "play" }, noCrit); // das Rundenende öffnet eine Entscheidungsphase — für den nächsten Stich überspringen
    expect(next.lastTrick.oValue).toBe(6 - T.brandmal[0].value);
  });
  it("Sonnenkern: Brände stapeln sich über die Runden und zahlen je Brandpunkt", () => {
    const done = playCycle(scen(12, 6, { skills: [F.SONNENKERN], heat: heat({ value: 0 }), brandActive: { X0: 1 } }));
    expect(done.brandActive.X0).toBe(2);                           // alter Brand bleibt, neuer kommt drauf
    const s = resolveTrick(scen(12, 6, { skills: [F.SONNENKERN], heat: heat({ value: 0 }), brandActive: { X0: 3 } }), noCrit);
    expect(s.lastTrick.oValue).toBe(3);
    expect(s.lastTrick.breakdown.flats).toBe(3 * C.SONNENKERN_SCORE_PER_BRAND);
  });
  it("Schmiede am Rundenende ab der Schwelle: die Hitze bleibt, die niedrigste Karte wird dauerhaft stärker", () => {
    const done = playCycle(scen(12, 6, { skills: [F.SCHMIEDE, F.GLUTBETT], skillTiers: { [F.GLUTBETT]: 3 }, heat: heat({ value: 40 }) }));
    // 40 Siege mit Vorsprung 6 → voll (100), über der Schwelle 80; die Schmiedung kostet nichts → 100 bleiben, X0 (die niedrigste, kleinste id) +3.
    expect(done.heat.value).toBe(100);
    expect(done.forged).toEqual({ X0: C.FORGE_VALUE });
    expect(done.deck.find((c) => c.id === "X0").value).toBe(12 + C.FORGE_VALUE);
  });
  it("Damaststahl: geschmiedete Karten kämpfen mit doppeltem Schmiedewert, der Basis-Score bleibt beim echten Wert", () => {
    const deck = constDeck(5).map((c) => (c.id === "X0" ? { ...c, value: 8 } : c)); // X0 geschmiedet: 5 + 3
    const with_ = resolveTrick(scen(5, 10, { deck, skills: [F.DAMASTSTAHL], heat: heat({ value: 0 }), forged: { X0: 3 } }), noCrit);
    expect(with_.lastTrick.pValue).toBe(11); expect(with_.lastTrick.result).toBe("win");
    const without = resolveTrick(scen(5, 10, { deck, skills: [F.GLUT], heat: heat({ value: 0 }), forged: { X0: 3 } }), noCrit);
    expect(without.lastTrick.pValue).toBe(8); expect(without.lastTrick.result).toBe("loss");
    expect(playCycle(scen(12, 6, { skills: [F.DAMASTSTAHL], heat: heat({ value: 0 }) })).forged).toEqual({ X0: C.FORGE_VALUE });
  });
  it("Weißglut: die Engine gleicht die Leiste an den Build an (200) und der Multiplikator läuft über 100 weiter", () => {
    const s = resolveTrick(scen(12, 6, { skills: [F.WEISSGLUT], heat: heat({ value: 150 }) }), noCrit); // max noch 100 im Snapshot
    expect(s.heat.max).toBe(C.WEISSGLUT_HEAT_MAX);
    expect(s.heat.value).toBe(150 + G(6));
    expect(s.lastTrick.breakdown.fireMult).toBeCloseTo(heatMult([F.WEISSGLUT], {}, 150 + G(6)), 6);
    const back = resolveTrick(scen(12, 6, { skills: [F.GLUT], heat: heat({ value: 150, max: 200 }) }), noCrit); // Weißglut ersetzt
    expect(back.heat.max).toBe(C.HEAT_MAX);
    expect(back.heat.value).toBe(C.HEAT_MAX);
  });
  it("Sonnenzorn rechnet mit der Spitze: nach dem Verbrauch bleibt der Multiplikator stehen", () => {
    const s = resolveTrick(scen(12, 6, { skills: [F.SONNENZORN], heat: heat({ value: 20, peak: 100 }) }), noCrit);
    expect(s.lastTrick.breakdown.fireMult).toBeCloseTo(1 + 10 * C.SONNENZORN_MULT_PER_10, 6);
  });
  it("Treffer-Identität „fire“ bei voller Leiste (100 %)", () => {
    expect(resolveTrick(scen(12, 6, { skills: [F.GLUT], heat: heat({ value: 100 }) }), noCrit).lastTrick.hitTypes).toContain("fire");
    expect(resolveTrick(scen(12, 6, { skills: [F.GLUT], heat: heat({ value: 99 }) }), noCrit).lastTrick.hitTypes).not.toContain("fire");
  });
});

describe("Feuer — Reducer und Angebot", () => {
  const rng = makeRng(3);
  const pick = (st, id, replaceId) => reducer(st, { type: "PICK_SKILL", skillId: id, replaceId, rng });
  const base = (over) => ({ ...initialState(makeRng(1)), phase: "levelup", ...over });
  it("der erste Feuer-Skill aktiviert die Hitze (Leiste 100); Weißglut hebt sie auf 200 und ihr Ersatz senkt sie zurück", () => {
    const s1 = pick(base({ skillOffer: [F.GLUT], skillOfferTiers: { [F.GLUT]: 2 } }), F.GLUT);
    expect(s1.heat).toMatchObject({ active: true, value: 0, max: C.HEAT_MAX });
    expect(s1.skillTiers[F.GLUT]).toBe(2);
    const s2 = pick({ ...s1, phase: "levelup", skillOffer: [F.WEISSGLUT], skillOfferTiers: {}, heat: { ...s1.heat, value: 90 } }, F.WEISSGLUT);
    expect(s2.heat.max).toBe(C.WEISSGLUT_HEAT_MAX);
    const s3 = pick({ ...s2, phase: "levelup", skillOffer: [F.ZUNDER], skillOfferTiers: {}, heat: { ...s2.heat, value: 180 } }, F.ZUNDER, F.WEISSGLUT);
    expect(s3.skills).not.toContain(F.WEISSGLUT);
    expect(s3.heat.max).toBe(C.HEAT_MAX); expect(s3.heat.value).toBe(C.HEAT_MAX);
  });
  it("fällt der letzte Feuer-Skill, gehen Hitze, Brände und der Schmiede-Zähler; der Schmiedewert bleibt in der Karte", () => {
    const s1 = pick(base({ skillOffer: [F.GLUT], skillOfferTiers: {} }), F.GLUT);
    const forgedDeck = s1.deck.map((c, i) => (i === 0 ? { ...c, value: c.value + 3 } : c));
    const s2 = pick({ ...s1, phase: "levelup", skillOffer: ["SK_ICE_01"], skillOfferTiers: {}, deck: forgedDeck, forged: { [forgedDeck[0].id]: 3 }, brandActive: { A: 2 }, brandPending: { B: 1 } }, "SK_ICE_01", F.GLUT);
    expect(s2.skills).not.toContain(F.GLUT);
    expect(s2.heat).toBe(null);
    expect(s2.forged).toEqual({}); expect(s2.brandActive).toEqual({}); expect(s2.brandPending).toEqual({});
    expect(s2.deck[0].value).toBe(forgedDeck[0].value);
  });
  it("kein Konsument wird mehr im Angebot erzwungen — ein aktiver Feuer-Build sieht auch Angebote ganz ohne Konsument", () => {
    const isConsumer = (id) => !!(SKILL_DEFS[id].keywords || []).includes("consume");
    const clean = Array.from({ length: 40 }, (_, s) => buildSkillOffer([F.GLUT], ["fire"], makeRng(s + 1), 6))
      .filter((off) => off.some((id) => archetypeOf(id) === "fire") && !off.some(isConsumer));
    expect(clean.length).toBeGreaterThan(0);
  });
});
