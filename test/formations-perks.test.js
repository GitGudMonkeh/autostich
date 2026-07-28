import { describe, it, expect } from "vitest";
import { computeFormations } from "../src/game/formations.js";
import { formationEnergyBonus, FAMILY_DEFS } from "../src/game/families.js";
import { reducer, initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

/* ============================================================
   #179 — Aus dem Shop migrierte Formations-Familien, jetzt Perk-Kat.-E (families.js).
   Deckt das Verhalten ab, das früher die Shop-Formationsitem-Tests (shop.test.js/shop-families.test.js)
   über shop.permanentEffects prüften — jetzt über state.familyTiers (+ roles bei Ziel-Familien).
   computeFormations-Signatur: (order, deck, roles, perks, skills, anchors, pe, familyTiers).
   ============================================================ */

const card = (id, value, suit) => ({ id, value, suit, baseRank: value, frozen: false });
const ord = (n) => Array.from({ length: n }, (_, i) => i);
const facOf = (out, pos, type) => { const f = out[pos].formations.find((x) => x.type === type); return f ? f.factor : null; };
const hasType = (out, pos, type) => out[pos].formations.some((x) => x.type === type);
// familyTiers als 8. Argument bespielen (roles = 3., Rest Defaults).
const withFam = (order, deck, familyTiers, roles = {}) => computeFormations(order, deck, roles, [], [], [], familyTiers);
const rng = makeRng(1);

describe("#179 E_STRONG_REP (Verstärkte Wiederholung) — Wiederholungsfaktoren", () => {
  // Drei gleiche Werte, verschiedene Farben → reine Wiederholung (kein Farbblock/Treppe).
  const deck = [card("a", 5, "R"), card("b", 5, "B"), card("c", 5, "G")];
  it("Basis: 2. Karte ×1,25, 3. Karte ×1,50", () => {
    const base = computeFormations(ord(3), deck);
    expect(facOf(base, 1, "wiederholung")).toBeCloseTo(1.25);
    expect(facOf(base, 2, "wiederholung")).toBeCloseTo(1.50);
  });
  it("Stufe II: 2. Karte ×1,35 (repSecond 0,10)", () => {
    expect(facOf(withFam(ord(3), deck, { E_STRONG_REP: 2 }), 1, "wiederholung")).toBeCloseTo(1.35);
  });
  it("Stufe III: 3. Karte +0,10 → ×1,60", () => {
    expect(facOf(withFam(ord(3), deck, { E_STRONG_REP: 3 }), 2, "wiederholung")).toBeCloseTo(1.60);
  });
  it("Stufe IV: alle Wiederholungsfaktoren ×1,20", () => {
    const t4 = withFam(ord(3), deck, { E_STRONG_REP: 4 });
    expect(facOf(t4, 1, "wiederholung")).toBeCloseTo((1.25 + 0.10) * 1.20);
    expect(facOf(t4, 2, "wiederholung")).toBeCloseTo((1.50 + 0.10) * 1.20);
  });
});

describe("#179 E_AFTERGLOW (Nachhall) — Ende-Faktor auf die Folgekarte", () => {
  const repDeck = [card("a", 5, "R"), card("b", 5, "B"), card("c", 3, "G")];        // Wiederholung 0-1, pos2 bare
  const fbDeck = [card("a", 5, "R"), card("b", 3, "R"), card("c", 9, "R"), card("d", 2, "B")]; // Farbblock 0-2, pos3 bare
  it("Stufe I: Cap ×1,20 und NUR Wiederholungen (Farbblock erzeugt keinen Nachhall)", () => {
    const t1 = withFam(ord(3), repDeck, { E_AFTERGLOW: 1 });
    expect(hasType(t1, 2, "nachhall")).toBe(true);
    expect(facOf(t1, 2, "nachhall")).toBeCloseTo(1.20);
    expect(hasType(withFam(ord(4), fbDeck, { E_AFTERGLOW: 1 }), 3, "nachhall")).toBe(false); // repsOnly
  });
  it("Stufe II: alle Formationen, Cap ×1,25 (Farbblock 1,35 → gekappt 1,25)", () => {
    expect(facOf(withFam(ord(4), fbDeck, { E_AFTERGLOW: 2 }), 3, "nachhall")).toBeCloseTo(1.25);
  });
  it("Stufe IV: hält für die nächsten zwei Karten (hold 2)", () => {
    const deck4 = [card("a", 5, "R"), card("b", 5, "B"), card("c", 3, "G"), card("d", 4, "Y")]; // Wdh 0-1, pos2+3 bare
    const t4 = withFam(ord(4), deck4, { E_AFTERGLOW: 4 });
    expect(hasType(t4, 2, "nachhall")).toBe(true);
    expect(hasType(t4, 3, "nachhall")).toBe(true); // hold 2 → auch die übernächste Karte
  });
});

describe("#179 E_COLOR_ALLIANCE (Farballianz) — Farben zählen als eine", () => {
  it("Stufe I: zwei verlinkte Farben bilden zusammen einen Farbblock (roles)", () => {
    const deck = [card("a", 5, "R"), card("b", 3, "B"), card("c", 9, "R")]; // R,B,R → ohne Allianz kein Block
    expect(hasType(computeFormations(ord(3), deck), 0, "farbblock")).toBe(false);
    const on = withFam(ord(3), deck, { E_COLOR_ALLIANCE: 1 }, { E_COLOR_ALLIANCE: ["R", "B"] });
    expect(hasType(on, 0, "farbblock")).toBe(true);
  });
  it("Stufe IV (pairs): R+B verschmelzen, R+G (andere Allianz) NICHT", () => {
    const rolesPairs = { E_COLOR_ALLIANCE: ["R", "B", "G", "Y"] }, ft = { E_COLOR_ALLIANCE: 4 };
    const deckRB = [card("a", 5, "R"), card("b", 3, "B"), card("c", 9, "R")];
    const deckRG = [card("a", 5, "R"), card("b", 3, "G"), card("c", 9, "R")]; // R,G in verschiedenen Paaren
    expect(hasType(withFam(ord(3), deckRB, ft, rolesPairs), 0, "farbblock")).toBe(true);
    expect(hasType(withFam(ord(3), deckRG, ft, rolesPairs), 0, "farbblock")).toBe(false);
  });
});

describe("#179 E_CORE (Formationskern) — Zusatzfaktor auf gewählten Typ", () => {
  const deck = [card("a", 5, "R"), card("b", 3, "R"), card("c", 9, "R")]; // Farbblock
  it("Faktor je Stufe (1,15 … 1,50) auf Positionen des gewählten Typs", () => {
    expect(computeFormations(ord(3), deck)[0].coreFactor).toBeCloseTo(1);
    const roles = { E_CORE: ["farbblock"] };
    expect(withFam(ord(3), deck, { E_CORE: 1 }, roles)[0].coreFactor).toBeCloseTo(1.15);
    expect(withFam(ord(3), deck, { E_CORE: 4 }, roles)[0].coreFactor).toBeCloseTo(1.50);
    expect(hasType(withFam(ord(3), deck, { E_CORE: 1 }, roles), 0, "formationskern")).toBe(true);
  });
  it("anderer gewählter Typ → kein Kern auf dem Farbblock", () => {
    expect(hasType(withFam(ord(3), deck, { E_CORE: 1 }, { E_CORE: ["treppe"] }), 0, "formationskern")).toBe(false);
  });
});

describe("#179 E_SEGMENT IV (Segmentarbeit) — Grenz-Bonus (eigener Effekt statt totem Rang)", () => {
  it("IV: segmentüberschreitende Formation gibt zusätzlich ×1,25 — III (nur Grenzen offen) nicht", () => {
    // 7× Rot, Werte non-monoton & ohne Gleichstand → NUR ein Farbblock (kein Treppe/Wechsel/Wdh), der über die
    // Grenze zwischen Pos 5 und 6 (Segment 0 → 1) läuft. Bei offenen Grenzen (III+IV) spannt er alle 7 Positionen.
    const deck = [card("a", 5, "R"), card("b", 3, "R"), card("c", 6, "R"), card("d", 4, "R"), card("e", 7, "R"), card("f", 5, "R"), card("g", 8, "R")];
    const t3 = withFam(ord(7), deck, { E_SEGMENT: 3 });
    const t4 = withFam(ord(7), deck, { E_SEGMENT: 4 });
    expect(hasType(t3, 5, "farbblock")).toBe(true);
    expect(hasType(t3, 5, "grenzbonus")).toBe(false);   // III: kein Bonus (war früher = IV)
    expect(hasType(t4, 5, "grenzbonus")).toBe(true);    // IV: Grenz-Bonus-Marker
    expect(t4[5].mult).toBeCloseTo(t3[5].mult * 1.25);  // IV = III × 1,25
  });
  it("IV: rein segment-interne Formation bekommt KEINEN Grenz-Bonus", () => {
    const deck = [card("a", 5, "R"), card("b", 3, "R"), card("c", 6, "R"), card("d", 4, "B"), card("e", 7, "B")]; // Farbblock 1–3 bleibt in Segment 0
    const t4 = withFam(ord(5), deck, { E_SEGMENT: 4 });
    expect(hasType(t4, 0, "farbblock")).toBe(true);
    expect(hasType(t4, 0, "grenzbonus")).toBe(false);
  });
});

describe("#179 E_TUNING (Feinjustierung) — Formationsenergie je Stufe", () => {
  it("Energiebonus je Stufe; Stufe I nur jede zweite (gerade) Phase", () => {
    expect(formationEnergyBonus({}, 0)).toBe(0);
    expect(formationEnergyBonus({ E_TUNING: 1 }, 0)).toBe(1); // gerader Durchlauf
    expect(formationEnergyBonus({ E_TUNING: 1 }, 1)).toBe(0); // ungerade → §10 everySecond
    expect(formationEnergyBonus({ E_TUNING: 2 }, 1)).toBe(1);
    expect(formationEnergyBonus({ E_TUNING: 3 }, 0)).toBe(2);
    expect(formationEnergyBonus({ E_TUNING: 4 }, 0)).toBe(3);
  });
});

describe("#179 Perk-Ziel-Fluss der migrierten Familien (Reducer)", () => {
  const levelup = (offerEntry) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: [offerEntry] });

  it("Farballianz: PICK_FAMILY → Farb-Ziel → CONFIRM setzt familyTiers + roles (gewählte Farben)", () => {
    let s = reducer(levelup({ familyId: "E_COLOR_ALLIANCE", tier: 1 }), { type: "PICK_FAMILY", familyId: "E_COLOR_ALLIANCE", tier: 1, rng });
    expect(s.phase).toBe("family-target");
    expect(s.familyTarget).toMatchObject({ familyId: "E_COLOR_ALLIANCE", kind: "suits", need: 2 });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "R" });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "B" });
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.phase).toBe("play");
    expect(s.familyTiers.E_COLOR_ALLIANCE).toBe(1);
    expect(s.roles.E_COLOR_ALLIANCE).toEqual(["R", "B"]);
  });

  it("Formationskern: PICK_FAMILY → Typ-Ziel → CONFIRM setzt familyTiers + roles (gewählter Typ)", () => {
    let s = reducer(levelup({ familyId: "E_CORE", tier: 4 }), { type: "PICK_FAMILY", familyId: "E_CORE", tier: 4, rng });
    expect(s.phase).toBe("family-target");
    expect(s.familyTarget).toMatchObject({ familyId: "E_CORE", kind: "formationType", need: 1 });
    expect(reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng }).phase).toBe("family-target"); // ohne Ziel → bleibt offen
    s = reducer(s, { type: "FAMILY_TARGET_FORMATION_TYPE", formationType: "treppe" });
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.phase).toBe("play");
    expect(s.familyTiers.E_CORE).toBe(4);
    expect(s.roles.E_CORE).toEqual(["treppe"]);
  });

  it("Feinjustierung (ziel-los): PICK_FAMILY wendet direkt an", () => {
    const s = reducer(levelup({ familyId: "E_TUNING", tier: 3 }), { type: "PICK_FAMILY", familyId: "E_TUNING", tier: 3, rng });
    expect(s.phase).toBe("play");
    expect(s.familyTiers.E_TUNING).toBe(3);
    expect(FAMILY_DEFS.E_TUNING.tiers[3].energyBonus).toBe(2);
  });
});
