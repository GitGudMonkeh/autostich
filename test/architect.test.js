import { describe, it, expect } from "vitest";
import {
  ARCHITECT_FAMILIES, familyDef, shapeRotations, enumeratePlacements, isValidFootprint, occupiedCells,
  nextRotationFootprint, currentRotationIndex, ROWS, COLS,
  buildArchitectOffer, initialArchitect, precomputeArchitect, architectValueBonus, architectScore,
  architectFormSpec, summarizeArchitect, tierNum, upgradeInfo, bindSpanFor, MAX_TIER,
  ARCHITECT_OFFER, HAEUSERZEILE_FACTOR,
  posOf, rowOf, colOf, N_POS,
  districtFactorMap, boardFactorMap, DISTRICT_BONUS, DISTRICT_CAP,
} from "../src/game/architect.js";
import { ARCH_STREAK_CAP } from "../src/game/constants.js";
import { archFamily } from "../src/i18n/labels.js"; // UI-Anzeige-Resolver (i18n-Name) — muss jedes Angebot auflösen
import { computeFormations } from "../src/game/formations.js";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Fake-Deck: 40 Karten, Wert/Farbe per Callback (order = Identität, damit position == deck-Index).
function fakeDeck(valOf = () => 5, suitOf = () => "R") {
  return Array.from({ length: N_POS }, (_, i) => ({ id: `c${i}`, value: valOf(i), suit: suitOf(i) }));
}
const idOrder = Array.from({ length: N_POS }, (_, i) => i);
const B = (familyId, footprint, tier = 1, extra = {}) => ({ id: 1, familyId, tier, footprint: [...footprint].sort((a, b) => a - b), colorChoice: null, ...extra });

describe("Architekt — Geometrie & Platzierung", () => {
  it("Positions-Mapping ist 8×5 (row*5+col)", () => {
    expect(posOf(0, 0)).toBe(0);
    expect(posOf(7, 4)).toBe(39);
    expect(rowOf(12)).toBe(2); expect(colOf(12)).toBe(2);
  });

  it("Rotation: line4 hat eine horizontale UND eine vertikale Lage", () => {
    const rots = shapeRotations("line4");
    expect(rots.length).toBe(2);
    const horiz = rots.some((cells) => cells.every(([r]) => r === 0));
    const vert = rots.some((cells) => cells.every(([, c]) => c === 0));
    expect(horiz).toBe(true); expect(vert).toBe(true);
  });

  it("zeile rotiert nicht (nur eine Lage, ganze Zeile)", () => {
    expect(shapeRotations("zeile").length).toBe(1);
  });

  it("enumeratePlacements bleibt im Gitter und überlappt nicht", () => {
    const occ = [B("A_STUETZE", [0, 1])];
    const places = enumeratePlacements("domino", occ);
    for (const fp of places) {
      for (const p of fp) expect(p).toBeGreaterThanOrEqual(0), expect(p).toBeLessThan(N_POS);
      expect(fp.some((p) => p === 0 || p === 1)).toBe(false); // keine belegte Zelle
    }
    // Domino wickelt nie über den Zeilenrand (col 4 → col 0 der nächsten Zeile).
    expect(places.some((fp) => fp.includes(4) && fp.includes(5))).toBe(false);
  });

  it("isValidFootprint akzeptiert echte Platzierungen und lehnt Überlappung/Form-Bruch ab", () => {
    expect(isValidFootprint("domino", [0, 1], [])).toBe(true);
    expect(isValidFootprint("domino", [0, 1], [B("A_STUETZE", [1, 2])])).toBe(false); // Overlap an 1
    expect(isValidFootprint("domino", [0, 2], [])).toBe(false);                       // keine gültige Domino-Form
    expect(isValidFootprint("domino", [4, 5], [])).toBe(false);                       // Zeilen-Wrap
  });

  it("occupiedCells sammelt alle Footprint-Zellen", () => {
    expect(occupiedCells([B("A_STUETZE", [0, 1]), { footprint: [10, 11] }]).size).toBe(4);
  });
});

describe("Architekt — Rotation (#266: kein No-Op am Brettrand)", () => {
  const sameSet = (a, b) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;

  it("dreht ein T am rechten Rand auf freiem Brett in eine ECHTE andere Lage", () => {
    // T (tetro_t) an der rechten Wand, Stiel nach links — exakt der gemeldete Fall.
    const fp = [24, 28, 29, 34]; // (4,4)(5,3)(5,4)(6,4)
    expect(isValidFootprint("tetro_t", fp, [])).toBe(true);
    const rot = nextRotationFootprint("tetro_t", fp, []);
    expect(rot).not.toBeNull();
    expect(sameSet(rot, fp)).toBe(false);                    // nicht derselbe Footprint (kein No-Op)
    expect(isValidFootprint("tetro_t", rot, [])).toBe(true); // gültige, in-Gitter-Platzierung
  });

  it("liefert null (statt eines No-Op-Footprints), wenn keine andere Lage brettweit passt", () => {
    const fp = [24, 28, 29, 34];
    const occAll = [];
    for (let p = 0; p < ROWS * COLS; p++) if (!fp.includes(p)) occAll.push(p);
    const others = [{ id: 9, footprint: occAll }]; // ganzes Brett belegt außer dem T selbst
    expect(nextRotationFootprint("tetro_t", fp, others)).toBeNull();
  });

  it("bevorzugt die in-place/nächstgelegene Lage (kleine Verschiebung, kein Teleport)", () => {
    const fp = [24, 28, 29, 34]; // rechte Wand
    const rot = nextRotationFootprint("tetro_t", fp, []);
    // nächstgelegene Lage bleibt im selben Zeilenband (Zeilen 4–6), verschiebt nur wenige Spalten nach links.
    const rows = rot.map((p) => Math.floor(p / COLS));
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...rows)).toBeLessThanOrEqual(6);
  });

  it("dreht ein waagerechtes 1×4 am unteren Rand hochkant (Original #239)", () => {
    const fp = [35, 36, 37, 38]; // unterste Zeile (7), Spalten 0–3
    expect(currentRotationIndex("line4", fp)).toBeDefined();
    const rot = nextRotationFootprint("line4", fp, []);
    expect(rot).not.toBeNull();
    const cols = rot.map((p) => p % COLS);
    expect(new Set(cols).size).toBe(1);                       // vertikale Lage (eine Spalte)
    expect(rot.every((p) => p >= 0 && p < ROWS * COLS)).toBe(true);
  });

  it("nicht drehbare Formen (single/block2x2/zeile) liefern null", () => {
    expect(nextRotationFootprint("single", [12], [])).toBeNull();
    expect(nextRotationFootprint("block2x2", [0, 1, 5, 6], [])).toBeNull();
  });
});

describe("Architekt — Angebot (deterministisch)", () => {
  it("gleicher Seed → identisches Angebot; ARCHITECT_OFFER Baupläne; keine doppelte Familie", () => {
    const a = initialArchitect();
    const o1 = buildArchitectOffer(a, makeRng(42));
    const o2 = buildArchitectOffer(a, makeRng(42));
    expect(o1).toEqual(o2);
    expect(o1.length).toBe(ARCHITECT_OFFER);
    expect(new Set(o1.map((o) => o.familyId)).size).toBe(o1.length);
  });

  // #regression 1fa6778: ArchitectScreen löst jeden Bauplan über den i18n-Resolver (archFamily) auf und
  // `return null`t bei fehlender Familie → wird der FALSCHE Resolver benutzt (labels.familyDef = Perk-Familien),
  // ist jede Karte null und das Bauplan-Grid komplett leer. Wächter: archFamily MUSS jedes Angebot auflösen.
  it("#regression: der i18n-Anzeige-Resolver löst JEDES Angebot auf (sonst leeres Bauplan-Grid)", () => {
    for (let s = 0; s < 120; s++) {
      for (const o of buildArchitectOffer(initialArchitect(), makeRng(s))) {
        const fam = archFamily(o.familyId);
        expect(fam, `archFamily(${o.familyId}) darf nicht null sein`).toBeTruthy();
        expect(fam.name, `${o.familyId} braucht einen Namen`).toBeTruthy();
      }
    }
  });

  it("höchstens EIN legendäres Angebot", () => {
    let maxLeg = 0;
    for (let s = 0; s < 200; s++) {
      const off = buildArchitectOffer(initialArchitect(), makeRng(s));
      maxLeg = Math.max(maxLeg, off.filter((o) => o.legendary).length);
    }
    expect(maxLeg).toBeLessThanOrEqual(1);
  });

  it("T2 (#229/#Pool, Runde 6): tierValue-Leiter hebt das Stufen-Pinning — jede Familie darf Stufen > 1 tragen", () => {
    // Vor Runde 6 wurden stufen-inerte Familien (joker/transparentFarb/crossSeg) im Angebot auf Stufe 1 gepinnt
    // (bzw. mit Kick auf ≤ at), weil Aufrüsten dort ein No-op war. Mit der tierValue-Leiter zählt jede Stufe →
    // das Pinning entfällt. Wächter: jede früher gepinnte Familie taucht über die Seeds auch mit Stufe > 1 auf,
    // und KEIN Angebot einer Nicht-Legendär-Familie liegt über MAX_TIER.
    const INERT = new Set(["joker", "transparentFarb", "crossSeg"]);
    const seenHighTier = new Set();
    for (let s = 0; s < 300; s++) {
      for (const o of buildArchitectOffer(initialArchitect(), makeRng(s))) {
        if (o.legendary) continue;
        const fam = familyDef(o.familyId);
        expect(o.tier).toBeLessThanOrEqual(MAX_TIER);
        if (INERT.has(fam?.base?.kind) && o.tier > 1) seenHighTier.add(fam.id);
      }
    }
    for (const fam of Object.values(ARCHITECT_FAMILIES)) {
      if (fam.legendary || !INERT.has(fam.base && fam.base.kind)) continue;
      expect(seenHighTier.has(fam.id), `${fam.id} muss auch mit Stufe > 1 angeboten werden`).toBe(true);
    }
  });

  it("Runde 6 (X4): upgradeInfo — Leiter-Familien sind bis Stufe IV aufwertbar, IV meldet `max`", () => {
    for (const id of ["A_ARKADE", "A_FRIES", "A_GEWOELBE", "A_PFEILER", "A_KLAMMER", "A_KREUZGANG"]) {
      const fam = ARCHITECT_FAMILIES[id];
      for (let t = 1; t < MAX_TIER; t++) expect(upgradeInfo(fam, t).can, `${id} Stufe ${t}`).toBe(true);
      expect(upgradeInfo(fam, MAX_TIER)).toEqual({ can: false, reason: "max" });
    }
  });
});

describe("Architekt — value-Effekte (Precompute + Anwendung)", () => {
  it("flat (Stützbalken): alle abgedeckten +N, stufen-skaliert", () => {
    const deck = fakeDeck();
    const pre = precomputeArchitect({ buildings: [B("A_STUETZE", [0, 1], 3)] }, idOrder, deck);
    const amt = tierNum(ARCHITECT_FAMILIES.A_STUETZE.base.value, 3);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(amt);
    expect(architectValueBonus(pre, 1, deck[1])).toBe(amt);
    expect(architectValueBonus(pre, 2, deck[2])).toBe(0); // nicht abgedeckt
  });

  it("lowValue (Rampe): nur bei Kartenwert ≤ Schwelle", () => {
    const deck = fakeDeck((i) => (i === 0 ? 3 : 9));
    const pre = precomputeArchitect({ buildings: [B("A_RAMPE", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_RAMPE.base.value, 1)); // Wert 3 ≤ 5
    expect(architectValueBonus(pre, 1, deck[1])).toBe(0);             // Wert 9 > 5
  });

  it("color (Buntglas): nur bei passender Farbe (colorChoice)", () => {
    const deck = fakeDeck(() => 5, (i) => (i === 0 ? "R" : "B"));
    const pre = precomputeArchitect({ buildings: [B("A_BUNTGLAS", [0, 1, 2, 3], 1, { colorChoice: "R" })] }, idOrder, deck);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_BUNTGLAS.base.value, 1)); // R == choice
    expect(architectValueBonus(pre, 1, deck[1])).toBe(0);             // B != choice
  });

  it("color (Buntglas) + Pflanze: grüne Karte zählt als Farbe G, nicht als Ursprungsfarbe", () => {
    // Bug: der Architekt matchte die URSPRUNGSFARBE. Grün (card.green) überschreibt die Farbe zu „G" (wie im Farbblock),
    // also bufft ein G-Gebäude die sichtbar grüne Karte — und ein Ursprungsfarb-Gebäude bufft sie nicht mehr.
    const deck = fakeDeck(() => 5, (i) => (i === 2 ? "G" : "R")); // pos0/1 = R, pos2 = native G
    const amt = tierNum(ARCHITECT_FAMILIES.A_BUNTGLAS.base.value, 1);
    const g = precomputeArchitect({ buildings: [B("A_BUNTGLAS", [0, 1, 2, 3], 1, { colorChoice: "G" })] }, idOrder, deck);
    expect(architectValueBonus(g, 0, deck[0])).toBe(0);                          // R, nicht grün → kein G-Buff
    expect(architectValueBonus(g, 1, { ...deck[1], green: true })).toBe(amt);    // ursprünglich R, aber grün → als G gebufft (der Fix)
    expect(architectValueBonus(g, 2, deck[2])).toBe(amt);                        // native G-Karte
    // Umkehrung: ein R-Gebäude bufft die jetzt grüne (ursprünglich R) Karte NICHT mehr.
    const r = precomputeArchitect({ buildings: [B("A_BUNTGLAS", [0, 1], 1, { colorChoice: "R" })] }, idOrder, deck);
    expect(architectValueBonus(r, 0, { ...deck[0], green: true })).toBe(0);      // grün → nicht mehr R
    expect(architectValueBonus(r, 0, deck[0])).toBe(amt);                        // nicht grün → weiterhin R
  });

  it("target highest/lowest: Effekt liegt nur auf der Ziel-Position", () => {
    const deck = fakeDeck((i) => [2, 9, 4, 7][i] ?? 0); // Werte an 0..3
    const hi = precomputeArchitect({ buildings: [B("A_FIRST", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(hi, 1, deck[1])).toBe(tierNum(ARCHITECT_FAMILIES.A_FIRST.base.value, 1)); // 9 = höchste
    expect(architectValueBonus(hi, 3, deck[3])).toBe(0);
    const lo = precomputeArchitect({ buildings: [B("A_SOCKEL", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(lo, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_SOCKEL.base.value, 1)); // 2 = niedrigste
  });
});

describe("Architekt — score-Effekte", () => {
  const deck = fakeDeck(() => 5, () => "R");
  it("flat (Zollhaus): +N bei Sieg", () => {
    const pre = precomputeArchitect({ buildings: [B("A_ZOLLHAUS", [0, 1], 2)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 3, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_ZOLLHAUS.base.score, 2));
  });
  it("streak (Reihenhaus): +N × Serie im eigenen streakFlat-Kanal (nicht im flat → kein Doppel-Dip)", () => {
    const pre = precomputeArchitect({ buildings: [B("A_REIHENHAUS", [0, 1, 2, 3], 1)] }, idOrder, deck);
    const res = architectScore(pre, 0, { isCrit: false, serieStreak: 4, suit: "R" }, {});
    expect(res.streakFlat).toBe(tierNum(ARCHITECT_FAMILIES.A_REIHENHAUS.base.score, 1) * 4);
    expect(res.flat).toBe(0); // Serien-Score läuft NICHT über flat (der bekäme sonst den globalen Serien-Mult obendrauf)
  });
  it("streak (Reihenhaus): Serie ist bei ARCH_STREAK_CAP gedeckelt (kein Runaway)", () => {
    // Tier 3 → streakDoubleFrom aktiv (×2 ab Serie 4). Über dem Cap darf der streakFlat nicht weiterwachsen.
    const pre = precomputeArchitect({ buildings: [B("A_REIHENHAUS", [0, 1, 2, 3], 3)] }, idOrder, deck);
    const amt = tierNum(ARCHITECT_FAMILIES.A_REIHENHAUS.base.score, 3);
    const atCap = architectScore(pre, 0, { isCrit: false, serieStreak: ARCH_STREAK_CAP, suit: "R" }, {}).streakFlat;
    const overCap = architectScore(pre, 0, { isCrit: false, serieStreak: 262, suit: "R" }, {}).streakFlat;
    expect(atCap).toBe(amt * ARCH_STREAK_CAP * 2);
    expect(overCap).toBe(atCap); // Serie 262 zahlt nicht mehr als der Deckel
  });
  it("crit (Zinne): nur bei Crit", () => {
    const pre = precomputeArchitect({ buildings: [B("A_ZINNE", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: true, serieStreak: 1, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_ZINNE.base.score, 1));
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(0);
  });
  it("mult (Schatzkammer, legendär): ×Faktor auf Siege", () => {
    const pre = precomputeArchitect({ buildings: [B("A_SCHATZ", [0, 1, 2, 3], "legendary")] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(ARCHITECT_FAMILIES.A_SCHATZ.base.factor);
  });
  it("milestone (Meilenstein): jeder 5. Sieg zahlt", () => {
    const pre = precomputeArchitect({ buildings: [B("A_MEILENSTEIN", [0, 1, 5, 6], 1)] }, idOrder, deck);
    const r4 = architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, { 1: 4 }); // next = 5 → zahlt
    expect(r4.flat).toBe(tierNum(ARCHITECT_FAMILIES.A_MEILENSTEIN.base.score, 1)); expect(r4.bump).toBe(1);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, { 1: 0 }).flat).toBe(0); // next = 1
  });
  it("segment (Vorwerk, #Pool): zahlt nur in der frühen Segment-Hälfte (Zeilen 0..3)", () => {
    const pre = precomputeArchitect({ buildings: [B("A_VORWERK", [0, 25], 1)] }, idOrder, deck); // Pos 0 = Zeile 0 (früh), Pos 25 = Zeile 5 (spät)
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_VORWERK.base.score, 1));
    expect(architectScore(pre, 25, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(0); // späte Hälfte → kein Effekt
  });
  it("relay (Laufgang, #Pool): reicht den Score an das Feld rechts jeder Zelle weiter; am Gebäude selbst 0", () => {
    const pre = precomputeArchitect({ buildings: [B("A_LAUFGANG", [0, 6, 12], 1)] }, idOrder, deck);
    const amt = tierNum(ARCHITECT_FAMILIES.A_LAUFGANG.base.score, 1);
    for (const p of [1, 7, 13]) expect(architectScore(pre, p, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(amt);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(0);
  });
  it("gamble (Losbude, #Pool): Crit → Jackpot, Sieg ohne Crit → Abzug", () => {
    const pre = precomputeArchitect({ buildings: [B("A_LOSBUDE", [0, 1], 1)] }, idOrder, deck);
    const jackpot = tierNum(ARCHITECT_FAMILIES.A_LOSBUDE.base.score, 1), penalty = ARCHITECT_FAMILIES.A_LOSBUDE.base.penalty;
    expect(architectScore(pre, 0, { isCrit: true,  serieStreak: 1, suit: "R" }, {}).flat).toBe(jackpot);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(-penalty);
  });
  it("gamble Jackpot skaliert mit der Stufe, der Abzug bleibt fix", () => {
    const pre = precomputeArchitect({ buildings: [B("A_WETTHALLE", [0, 2, 10, 12], 3)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: true,  serieStreak: 1, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_WETTHALLE.base.score, 3));
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(-ARCHITECT_FAMILIES.A_WETTHALLE.base.penalty); // Abzug tier-unabhängig
  });
  it("Häuserzeile: volle Segment-Zeile → ×Faktor auf Siege im Segment", () => {
    const pre = precomputeArchitect({ buildings: [B("A_STUETZE", [0, 1, 2, 3, 4], 1)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(HAEUSERZEILE_FACTOR);
    expect(architectScore(pre, 10, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(1); // andere Zeile
  });
});

describe("Architekt — formation-Direktiven & computeFormations", () => {
  it("architectFormSpec sammelt Joker/Bind/CrossSeg/Anker/FormMult", () => {
    const deck = fakeDeck();
    const spec = architectFormSpec({ buildings: [
      B("A_KLAMMER", [0, 1]), B("A_KREUZGANG", [10, 15, 16], 3), B("A_PFEILER", [0, 5, 10, 15]),
      B("A_GRUNDSTEIN", [20, 21, 25, 26]), B("A_KATHEDRALE", [30, 31, 32, 33, 34], "legendary"),
    ] }, idOrder, deck);
    expect(spec.jokerF.has(0)).toBe(true);        // Klammer → Farbblock-Joker
    expect(spec.bind[10]).toBe(3);                // Kreuzgang Stufe 3 → Span 3 (Runde 6: ±1/±2/±3)
    expect(spec.crossSeg.has(0)).toBe(true);      // Pfeiler → Zeile 0 offen (rowOf(0))
    expect(spec.anker[20]).toBeGreaterThan(1);    // Grundstein → Anker-Faktor
    expect(spec.formMult[30]).toBe(ARCHITECT_FAMILIES.A_KATHEDRALE.base.factor); // Kathedrale → ×Faktor
  });

  it("Grundstein macht abgedeckte Positionen zu Ankern (Formation)", () => {
    const deck = fakeDeck(() => 5, (i) => ["R", "B", "G", "Y"][i % 4]); // bewusst keine natürliche Formation
    const architect = { buildings: [B("A_GRUNDSTEIN", [0, 1, 5, 6], 1)] };
    const forms = computeFormations(idOrder, deck, {}, [], [], [], {}, architect);
    expect(forms[0].formations.some((f) => f.type === "anker")).toBe(true);
    expect(forms[0].mult).toBeGreaterThan(1);
  });

  it("Klammer (Farbblock-Joker) überbrückt eine fremde Farbe zum Farbblock", () => {
    // Zeile 0: R, B, R, R, R → ohne Joker Farbblock nur 2..4; mit Joker auf Position 1 läuft 0..4.
    const deck = fakeDeck(() => 5, (i) => (i === 1 ? "B" : "R"));
    const withJoker = computeFormations(idOrder, deck, {}, [], [], [], {}, { buildings: [B("A_KLAMMER", [1, 2], 1)] });
    const without = computeFormations(idOrder, deck, {}, [], [], [], {});
    const inFarbblock = (forms, p) => (forms[p].formations || []).some((f) => f.type === "farbblock");
    expect(inFarbblock(without, 0)).toBe(false);  // Position 0 (R) hängt ohne Joker nicht am Farbblock (B-Lücke bei 1)
    expect(inFarbblock(withJoker, 0)).toBe(true);  // Joker verbindet 0 über die B-Lücke mit 2..4
  });
});

describe("Architekt — Runde 6: jede Aufwertung trägt (X1–X3)", () => {
  it("X1: tierNum ist streng monoton — Basis 1 wird 1/2/3/4, Basen ≥ 2 bleiben unverändert", () => {
    expect([1, 2, 3, 4].map((t) => tierNum(1, t))).toEqual([1, 2, 3, 4]);   // vorher 1/2/2/3 (II→III tot)
    expect([1, 2, 3, 4].map((t) => tierNum(2, t))).toEqual([2, 3, 4, 6]);   // wie bisher
    expect([1, 2, 3, 4].map((t) => tierNum(35, t))).toEqual([35, 53, 77, 109]); // wie bisher (Zollhaus)
    for (const base of [1, 2, 3, 9, 20, 35, 40, 50, 65, 70, 80, 90, 130, 160, 200, 260]) {
      for (let t = 2; t <= MAX_TIER; t++) expect(tierNum(base, t)).toBeGreaterThan(tierNum(base, t - 1));
    }
  });

  it("X3: die tierValue-Leiter legt flachen Stichwert auf die Zellen der Formations-Gebäude", () => {
    const deck = fakeDeck();
    const at = (tier) => {
      const pre = precomputeArchitect({ buildings: [B("A_ARKADE", [0, 1], tier)] }, idOrder, deck);
      return architectValueBonus(pre, 0, deck[0]);
    };
    expect(at(1)).toBe(0); expect(at(2)).toBe(1); expect(at(3)).toBe(1); expect(at(4)).toBe(2);
    // Pfeiler steigt jede Stufe (1/2/3), Kreuzgang erst auf IV (+2).
    const pfeiler = precomputeArchitect({ buildings: [B("A_PFEILER", [0, 5, 10, 15], 3)] }, idOrder, deck);
    expect(architectValueBonus(pfeiler, 5, deck[5])).toBe(2);
    const kreuz3 = precomputeArchitect({ buildings: [B("A_KREUZGANG", [10, 15, 16], 3)] }, idOrder, deck);
    const kreuz4 = precomputeArchitect({ buildings: [B("A_KREUZGANG", [10, 15, 16], 4)] }, idOrder, deck);
    expect(architectValueBonus(kreuz3, 10, deck[10])).toBe(0);
    expect(architectValueBonus(kreuz4, 10, deck[10])).toBe(2);
  });

  it("X3: Arkade III wird zum Farbblock-Joker (Kick), bleibt darunter transparent", () => {
    const deck = fakeDeck();
    const s1 = architectFormSpec({ buildings: [B("A_ARKADE", [0, 1], 1)] }, idOrder, deck);
    const s3 = architectFormSpec({ buildings: [B("A_ARKADE", [0, 1], 3)] }, idOrder, deck);
    expect(s1.transparentFarb.has(0)).toBe(true); expect(s1.jokerF.has(0)).toBe(false);
    expect(s3.transparentFarb.has(0)).toBe(true); expect(s3.jokerF.has(0)).toBe(true);
  });

  it("X3: Fries/Gewölbe III schalten den Joker-Typ Farbblock dazu", () => {
    const deck = fakeDeck();
    for (const id of ["A_FRIES", "A_GEWOELBE"]) {
      const fp = id === "A_FRIES" ? [0, 1, 5, 6] : [0, 1, 2, 6];
      const lo = architectFormSpec({ buildings: [B(id, fp, 2)] }, idOrder, deck);
      const hi = architectFormSpec({ buildings: [B(id, fp, 3)] }, idOrder, deck);
      expect(lo.jokerF.has(0), `${id} Stufe 2 ohne Farbblock-Joker`).toBe(false);
      expect(hi.jokerF.has(0), `${id} Stufe 3 mit Farbblock-Joker`).toBe(true);
      expect(hi.jokerW.has(0), `${id} behält Wiederholung`).toBe(true);
    }
  });

  it("X3: bindSpanFor ist ±1/±2/±3 ohne tote Stufe bis III", () => {
    expect([1, 2, 3, 4].map(bindSpanFor)).toEqual([1, 2, 3, 3]);
  });
});

describe("Architekt — Reducer-Aktionen", () => {
  const start = () => reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true });
  // Zustand künstlich in die Architekt-Phase mit Angebot bringen.
  function inArchitectPhase() {
    const s = start();
    const offers = [{ familyId: "A_STUETZE", tier: 2, used: false }, { familyId: "A_ZINNE", tier: 1, used: false }, { familyId: "A_KLAMMER", tier: 1, used: false }];
    return { ...s, phase: "architect", architect: { ...s.architect, offers } };
  }

  it("BUILD errichtet, verbraucht die Hauptaktion und den Bauplan", () => {
    const s = inArchitectPhase();
    const s2 = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    expect(s2.architect.buildings.length).toBe(1);
    expect(s2.architect.buildings[0].tier).toBe(2);
    expect(s2.architect.actedMain).toBe(true);
    // zweite Hauptaktion wird abgelehnt (EXKLUSIV)
    const s3 = reducer(s2, { type: "ARCHITECT_BUILD", familyId: "A_ZINNE", tier: 1, footprint: [10, 11, 12, 13] });
    expect(s3).toBe(s2);
  });

  it("BUILD lehnt ungültige Platzierung ab", () => {
    const s = inArchitectPhase();
    expect(reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 2] })).toBe(s); // keine Domino
  });

  it("colorLocked-Familie braucht eine Farbe", () => {
    const s = { ...inArchitectPhase(), architect: { ...inArchitectPhase().architect, offers: [{ familyId: "A_BUNTGLAS", tier: 1, used: false }] } };
    expect(reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_BUNTGLAS", tier: 1, footprint: [0, 1, 2, 11] })).toBe(s); // ohne colorChoice → abgelehnt
  });

  it("UPGRADE hebt die Stufe; legendär/Max wird abgelehnt", () => {
    let s = inArchitectPhase();
    s = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = s.architect.buildings[0].id;
    // frische Phase simulieren (actedMain zurück)
    s = { ...s, architect: { ...s.architect, actedMain: false } };
    const up = reducer(s, { type: "ARCHITECT_UPGRADE", buildingId: id });
    expect(up.architect.buildings[0].tier).toBe(3);
    expect(up.architect.actedMain).toBe(true);
  });

  it("MOVE beliebig oft (#224.10); DEMOLISH unbegrenzt; DONE → play", () => {
    let s = inArchitectPhase();
    s = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = s.architect.buildings[0].id;
    const moved = reducer(s, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 11] });
    expect(moved.architect.buildings[0].footprint).toEqual([10, 11]);
    const moved2 = reducer(moved, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [20, 21] }); // 2. Move JETZT erlaubt
    expect(moved2.architect.buildings[0].footprint).toEqual([20, 21]);
    expect(reducer(moved2, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 12] })).toBe(moved2); // ungültige Domino-Form abgelehnt
    const demo = reducer(moved2, { type: "ARCHITECT_DEMOLISH", buildingId: id });
    expect(demo.architect.buildings.length).toBe(0);
    expect(reducer(demo, { type: "ARCHITECT_DONE" }).phase).toBe("play");
  });

  // #361 (+ Folge) „↶ Rückgängig" / „Zurücksetzen": NUR Verschiebungen sind umkehrbar; ein gebautes Gebäude bleibt.
  it("UNDO nimmt NUR die letzte Verschiebung zurück; ein gebautes Gebäude bleibt liegen", () => {
    const s = inArchitectPhase();
    const built = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    expect(built.architect.buildings.length).toBe(1);
    expect((built.architect.phaseHistory || []).length).toBe(0);             // Bau erzeugt KEINEN Undo-Schritt
    expect(reducer(built, { type: "ARCHITECT_UNDO" })).toBe(built);          // ohne Verschiebung → No-Op (Gebäude bleibt)
    const id = built.architect.buildings[0].id;
    const moved = reducer(built, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 11] });
    expect(moved.architect.buildings[0].footprint).toEqual([10, 11]);
    expect(moved.architect.phaseHistory.length).toBe(1);
    const undone = reducer(moved, { type: "ARCHITECT_UNDO" });
    expect(undone.architect.buildings.length).toBe(1);                       // Gebäude bleibt
    expect(undone.architect.buildings[0].footprint).toEqual([0, 1]);         // nur der Fußabdruck geht zurück
    expect(undone.architect.actedMain).toBe(true);                           // Hauptaktion bleibt verbraucht
    expect(reducer(undone, { type: "ARCHITECT_UNDO" })).toBe(undone);        // leerer Stapel → No-Op
  });

  it("UNDO geht Verschiebung für Verschiebung zurück; das Gebäude bleibt durchweg bestehen", () => {
    const s = inArchitectPhase();
    const built = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = built.architect.buildings[0].id;
    const m1 = reducer(built, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 11] });
    const m2 = reducer(m1, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [20, 21] });
    expect(m2.architect.buildings[0].footprint).toEqual([20, 21]);
    const u1 = reducer(m2, { type: "ARCHITECT_UNDO" });
    expect(u1.architect.buildings[0].footprint).toEqual([10, 11]);
    expect(u1.architect.buildings.length).toBe(1);
    const u2 = reducer(u1, { type: "ARCHITECT_UNDO" });
    expect(u2.architect.buildings[0].footprint).toEqual([0, 1]);
    expect(u2.architect.buildings.length).toBe(1);
  });

  it("RESET setzt alle Verschiebungen auf die Ausgangslage zurück; die Gebäude bleiben (kein Abriss)", () => {
    const s = inArchitectPhase();
    const built = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = built.architect.buildings[0].id;
    const moved = reducer(built, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [20, 21] });
    const reset = reducer(moved, { type: "ARCHITECT_RESET" });
    expect(reset.architect.buildings.length).toBe(1);                        // Gebäude bleibt
    expect(reset.architect.buildings[0].footprint).toEqual([0, 1]);          // zurück auf die Anker-/Bau-Lage
    expect(reset.architect.actedMain).toBe(true);                            // Hauptaktion bleibt verbraucht
    expect(reset.architect.phaseHistory.length).toBe(0);
  });

  it("Eine Verschiebung legt einen Undo-Schritt an; DONE verwirft die transienten Undo-Daten", () => {
    const s = inArchitectPhase();
    const built = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = built.architect.buildings[0].id;
    const moved = reducer(built, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 11] });
    expect(moved.architect.phaseHistory.length).toBe(1);
    const done = reducer(moved, { type: "ARCHITECT_DONE" });
    expect(done.phase).toBe("play");
    expect(done.architect.phaseHistory).toEqual([]);
    expect(done.architect.phaseAnchor).toBe(null);
  });
});

describe("Architekt — Voll-Run", () => {
  it("Determinismus: gleicher Seed + Architekt → identischer Score", () => {
    const p = () => randomPolicy({ architectGreedy: true });
    const a = runOne(7, p(), null, null, { architect: true });
    const b = runOne(7, p(), null, null, { architect: true });
    expect(a.score).toBe(b.score);
    expect(a.fingerprint).toEqual(b.fingerprint);
    expect(a.architect).not.toBeNull();
    expect(a.architect.buildings).toBeGreaterThan(0);
  });

  it("Architekt AUS entspricht Voll-Run ohne Architekt-Telemetrie", () => {
    const off = runOne(7, randomPolicy(), null, null, { architect: false });
    expect(off.architect).toBeNull();
    expect(off.score).toBeGreaterThan(0);
  });

  it("summarizeArchitect meldet plausible Abdeckung/Kategorien", () => {
    const a = { buildings: [B("A_STUETZE", [0, 1]), { id: 2, familyId: "A_ZINNE", tier: 3, footprint: [10, 11, 12, 16] }] };
    const sum = summarizeArchitect(a);
    expect(sum.buildings).toBe(2);
    expect(sum.byCategory.value).toBe(1);
    expect(sum.byCategory.score).toBe(1);
    expect(sum.coverage).toBeCloseTo(6 / N_POS);
  });
});

describe("#283 Distrikt-Bonus (gleiche Kategorie aneinander)", () => {
  const V = (id, footprint) => ({ id, familyId: "A_STUETZE", footprint });   // value/domino-Familie als Kategorie-Träger
  const S = (id, footprint) => ({ id, familyId: "A_ZOLLHAUS", footprint });   // score-Familie

  it("zwei gleich-kategorige Gebäude aneinander → Faktor 1+BONUS auf beide", () => {
    const df = districtFactorMap([V(1, [posOf(0, 0), posOf(0, 1)]), V(2, [posOf(1, 0), posOf(1, 1)])]); // vertikal benachbart
    for (const p of [posOf(0, 0), posOf(0, 1), posOf(1, 0), posOf(1, 1)]) expect(df[p]).toBeCloseTo(1 + DISTRICT_BONUS);
    expect(df[posOf(4, 4)]).toBe(1); // unbeteiligt
  });

  it("nicht benachbart → kein Distrikt-Faktor", () => {
    const df = districtFactorMap([V(1, [posOf(0, 0)]), V(2, [posOf(6, 4)])]);
    expect(df[posOf(0, 0)]).toBe(1);
    expect(df[posOf(6, 4)]).toBe(1);
  });

  it("benachbart aber VERSCHIEDENE Kategorie → kein Distrikt-Faktor", () => {
    const df = districtFactorMap([V(1, [posOf(0, 0)]), S(2, [posOf(1, 0)])]); // value neben score
    expect(df[posOf(0, 0)]).toBe(1);
    expect(df[posOf(1, 0)]).toBe(1);
  });

  it("mehr Nachbarn als DISTRICT_CAP → gedeckelt", () => {
    const center = V(0, [posOf(2, 2)]);
    const around = [V(1, [posOf(1, 2)]), V(2, [posOf(3, 2)]), V(3, [posOf(2, 1)]), V(4, [posOf(2, 3)])]; // 4 gleich-kat. Nachbarn
    const df = districtFactorMap([center, ...around]);
    expect(df[posOf(2, 2)]).toBeCloseTo(1 + DISTRICT_BONUS * DISTRICT_CAP); // 4 → auf CAP (3) gedeckelt
  });

  it("boardFactorMap = Struktur × Distrikt", () => {
    // Volle Segment-Zeile aus zwei gleich-kategorigen Gebäuden (Struktur-Zeile UND Distrikt-Nachbarschaft).
    const row = [V(1, [posOf(0, 0), posOf(0, 1), posOf(0, 2)]), V(2, [posOf(0, 3), posOf(0, 4)])];
    const bf = boardFactorMap(row);
    // Zeile komplett → HAEUSERZEILE_FACTOR; benachbart gleiche Kategorie → × (1+BONUS).
    expect(bf[posOf(0, 0)]).toBeCloseTo(HAEUSERZEILE_FACTOR * (1 + DISTRICT_BONUS));
  });
});
