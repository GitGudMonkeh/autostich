/* Perk-Verkauf (docs/muenz-oekonomie.md §3.6) — Preis und RÜCKBAU.

   Der Preis ist die leichte Hälfte: er hängt an derselben Leiter wie die Aufwertung, und ein Test hält
   fest, dass es eine Leiter bleibt und nicht zwei nebeneinander.

   Der Rückbau ist die schwere. Die Owner-Regel lautet „was man aufbaut, behält man — alles andere wird
   zurückgebaut", und jede Perk-Art baut anders zurück: Werte-Familien gar nicht (sie werden live
   gelesen), Rollen über `roles`, Deck-Perks über gespeicherte Differenzen, und drei Legendäre über je
   eine eigene Regel. Geprüft wird deshalb je Art ein Vertreter — und die beiden Sperren, die verhindern,
   dass ein Verkauf etwas mitreißt, das nicht zum Verkauf stand. */
import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { sellPrice, investedFor, perkSellPrice, sellables, deckDeltaOf, undoDeckDelta,
         SELL_FLOOR, SELL_LEGENDARY, BLOCK_COVER, BLOCK_SLOTS } from "../src/game/perkSale.js";
import { UPGRADE_PRICES } from "../src/game/coins.js";
import * as C from "../src/game/constants.js";

const fresh = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "levelup", ...over });
const valueOf = (s, id) => s.deck.find((c) => c.id === id).value;

describe("Verkaufserlös (§3.6)", () => {
  it("die Tabelle aus §3.6 — 3 · 6 · 18 · 38, legendär 50", () => {
    expect([1, 2, 3, 4].map(sellPrice)).toEqual([3, 6, 18, 38]);
    expect(perkSellPrice("L_UMV")).toBe(SELL_LEGENDARY);
  });

  it("EINE Leiter, nicht zwei: der Erlös ist die halbe Aufwert-Investition", () => {
    // Wer UPGRADE_PRICES anfasst, verschiebt Kauf und Verkauf zugleich — genau so ist es gewollt.
    expect([1, 2, 3, 4].map(investedFor)).toEqual([0, UPGRADE_PRICES[1], UPGRADE_PRICES[1] + UPGRADE_PRICES[2],
      UPGRADE_PRICES[1] + UPGRADE_PRICES[2] + UPGRADE_PRICES[3]]);
    for (const tier of [2, 3, 4]) expect(sellPrice(tier)).toBe(Math.floor(investedFor(tier) / 2));
  });

  it("der Sockel macht Stufe I überhaupt verkäuflich — nach der Formel wäre sie 0 wert", () => {
    expect(investedFor(1)).toBe(0);
    expect(sellPrice(1)).toBe(SELL_FLOOR);
  });
});

describe("Was verkäuflich ist (§3.6)", () => {
  it("gehaltene Familien ab Rang 1 und gehaltene Perks — sonst nichts", () => {
    const s = fresh({ familyTiers: { A_WEAK_STRONG: 2, B_SUPERIOR: 0 }, perks: ["L_MONO"] });
    const list = sellables(s);
    expect(list.map((e) => e.id).sort()).toEqual(["A_WEAK_STRONG", "L_MONO"]);
    expect(list.find((e) => e.id === "A_WEAK_STRONG")).toMatchObject({ kind: "family", tier: 2, price: 6 });
    expect(list.find((e) => e.id === "L_MONO")).toMatchObject({ kind: "perk", price: SELL_LEGENDARY });
  });

  it("was man nicht hält, lässt sich nicht verkaufen", () => {
    const before = fresh({ coins: 0, perks: [] });
    expect(reducer(before, { type: "SELL_PERK", kind: "perk", id: "L_MONO" })).toBe(before);
  });
});

describe("Rückbau: Werte- und Rollen-Perks (§3.6)", () => {
  it("eine Werte-Familie verschwindet einfach — ihre Zahlen werden ohnehin live gelesen", () => {
    const s = reducer(fresh({ coins: 0, familyTiers: { B_SUPERIOR: 3 } }),
      { type: "SELL_PERK", kind: "family", id: "B_SUPERIOR" });
    expect(s.familyTiers.B_SUPERIOR).toBeUndefined();
    expect(s.coins).toBe(18);
  });

  it("ein Rollen-Ziel fällt mit seinem Perk — sonst bliebe die Farbe verbündet ohne die Regel dahinter", () => {
    const s = reducer(fresh({ coins: 0, familyTiers: { E_COLOR_ALLIANCE: 2 }, roles: { E_COLOR_ALLIANCE: ["R", "B"] } }),
      { type: "SELL_PERK", kind: "family", id: "E_COLOR_ALLIANCE" });
    expect(s.roles.E_COLOR_ALLIANCE).toBeUndefined();
    expect(s.familyTiers.E_COLOR_ALLIANCE).toBeUndefined();
  });
});

describe("Rückbau: Deck-Perks über gespeicherte Differenzen (§3.6)", () => {
  /* Nicht die Regel nachspielen, sondern die Differenz abziehen: 14 der Deck-Effekte würfeln, eine
     zweite Anwendung gäbe andere Werte. Der Vertreter hier würfelt nicht (A_WEAK_STRONG Stufe 1 hebt
     jede ursprüngliche 5) — nur so ist das Ergebnis überhaupt prüfbar; gemerkt wird trotzdem die
     tatsächliche Differenz, nicht die Regel. */
  const withOffer = (familyId, tier) => fresh({ coins: 0, offer: [{ familyId, tier }] });

  it("was der Pick am Deck getan hat, nimmt der Verkauf zurück — Karte für Karte", () => {
    const before = withOffer("A_WEAK_STRONG", 1);
    const picked = reducer(before, { type: "PICK_FAMILY", familyId: "A_WEAK_STRONG", tier: 1 });
    const bumped = picked.deck.filter((c) => c.baseRank === 5);
    expect(bumped.length).toBeGreaterThan(0);
    for (const c of bumped) expect(c.value).toBe(valueOf(before, c.id) + 1);
    expect(Object.keys(picked.deckDeltas.A_WEAK_STRONG).length).toBe(bumped.length);

    const sold = reducer({ ...picked, phase: "levelup" }, { type: "SELL_PERK", kind: "family", id: "A_WEAK_STRONG" });
    for (const c of bumped) expect(valueOf(sold, c.id)).toBe(valueOf(before, c.id));
    expect(sold.deckDeltas.A_WEAK_STRONG).toBeUndefined();
  });

  it("die Stufen summieren sich — Stufe 2 kommt zu Stufe 1 dazu, sie ersetzt sie nicht", () => {
    const before = withOffer("A_WEAK_STRONG", 1);
    const t1 = reducer(before, { type: "PICK_FAMILY", familyId: "A_WEAK_STRONG", tier: 1 });
    const t2 = reducer({ ...t1, phase: "levelup", coins: 100 }, { type: "UPGRADE_FAMILY", familyId: "A_WEAK_STRONG" });
    const sold = reducer({ ...t2, phase: "levelup" }, { type: "SELL_PERK", kind: "family", id: "A_WEAK_STRONG" });
    // Nach dem Verkauf steht wieder das Ausgangsdeck — beide Stufen sind abgezogen, nicht nur die letzte.
    for (const c of before.deck) expect(valueOf(sold, c.id)).toBe(c.value);
  });

  it("die Differenz trägt die Klemmung: was nicht fallen konnte, steigt beim Verkauf auch nicht", () => {
    // Opfergang senkt jede Karte, klemmt aber bei 1. Eine Karte, die schon auf 1 stand, hat 0 bekommen —
    // und bekommt beim Verkauf auch 0 zurück. Ohne Differenzspeicher stünde sie danach zu hoch.
    const deck = initialState(makeRng(1), 7).deck.map((c, i) => ({ ...c, value: i === 0 ? 1 : 9 }));
    const before = fresh({ coins: 0, deck, offer: ["L_OPFER"] });
    const picked = reducer(before, { type: "PICK_PERK", perkId: "L_OPFER" });
    expect(valueOf(picked, deck[0].id)).toBe(1);                     // geklemmt, nicht gesunken
    expect(picked.deckDeltas.L_OPFER[deck[0].id]).toBeUndefined();   // also auch nichts gemerkt
    const sold = reducer({ ...picked, phase: "levelup" }, { type: "SELL_PERK", kind: "perk", id: "L_OPFER" });
    expect(valueOf(sold, deck[0].id)).toBe(1);
    expect(valueOf(sold, deck[1].id)).toBe(9);                       // die ungeklemmte ist genau zurück
  });

  it("`deckDeltaOf` merkt nur echte Unterschiede, `undoDeckDelta` klemmt bei 0", () => {
    const a = [{ id: "x", value: 4 }, { id: "y", value: 2 }];
    expect(deckDeltaOf(a, a)).toBe(null);                            // Referenzgleichheit → kein Eingriff
    expect(deckDeltaOf(a, [{ id: "x", value: 6 }, { id: "y", value: 2 }])).toEqual({ x: 2 });
    expect(undoDeckDelta(a, { x: 9 })).toEqual([{ id: "x", value: 0 }, { id: "y", value: 2 }]);
  });
});

describe("Rückbau: die drei Sonderfälle (§3.6)", () => {
  it("Zinseszins — das Kapital fließt als Score aus, der Perk ist weg", () => {
    // Es weiter zu verzinsen wäre falsch (der Perk ist weg), es einzuziehen auch (der Spieler hat es
    // erspielt). Also: einmal auszahlen.
    const s = reducer(fresh({ coins: 0, score: 500, perks: ["L_ZINS"], zinsCapital: 320 }),
      { type: "SELL_PERK", kind: "perk", id: "L_ZINS" });
    expect(s.score).toBe(820);
    expect(s.zinsCapital).toBe(0);
    expect(s.perks).not.toContain("L_ZINS");
    expect(s.coins).toBe(SELL_LEGENDARY);
  });

  it("Bauhütte — der Deckel geht zurück", () => {
    const arch = { buildings: [], offers: [], actedMain: false, maxCover: 24 + C.BAUHUETTE_COVER, winCounters: {} };
    const s = reducer(fresh({ coins: 0, perks: ["L_BAUH"], architectEnabled: true, architect: arch }),
      { type: "SELL_PERK", kind: "perk", id: "L_BAUH" });
    expect(s.architect.maxCover).toBe(24);
  });

  it("Bauhütte gesperrt, solange mehr Zellen belegt sind, als ohne sie erlaubt wären", () => {
    // Sonst stünden Gebäude auf Zellen, die es nicht mehr gibt. Blockieren ist ehrlicher, als eines
    // abzureißen, das der Spieler nicht zum Verkauf gestellt hat.
    const footprint = Array.from({ length: 30 }, (_, i) => i);
    const arch = { buildings: [{ id: 1, familyId: "X", tier: 1, footprint }], offers: [], actedMain: false,
      maxCover: 24 + C.BAUHUETTE_COVER, winCounters: {} };
    const before = fresh({ coins: 0, perks: ["L_BAUH"], architectEnabled: true, architect: arch });
    expect(sellables(before).find((e) => e.id === "L_BAUH").blocked).toBe(BLOCK_COVER);
    expect(reducer(before, { type: "SELL_PERK", kind: "perk", id: "L_BAUH" })).toBe(before);
  });

  it("Meisterhand — der Slot geht zurück UND der über sie gewählte Skill mit ihm", () => {
    const before = fresh({ coins: 0, perks: ["L_MEIS"], meisterSkill: "SK_FIRE_01",
      skills: ["SK_FIRE_01"], skillTiers: { SK_FIRE_01: 2 }, activeArchetypes: ["fire"],
      skillSlots: C.SKILL_SLOTS + C.MEISTERHAND_SLOTS });
    const s = reducer(before, { type: "SELL_PERK", kind: "perk", id: "L_MEIS" });
    expect(s.skills).not.toContain("SK_FIRE_01");
    expect(s.skillTiers.SK_FIRE_01).toBeUndefined();   // die dort investierte Aufwertung ist mit weg
    expect(s.skillSlots).toBe(C.SKILL_SLOTS);
    expect(s.meisterSkill).toBe(null);
    expect(s.activeArchetypes).toEqual([]);            // letzter Feuer-Skill weg → Archetyp aus
    expect(s.heat).toBe(null);                         // und keine Geister-Leiste
  });

  it("Meisterhand gesperrt, wenn ihr Slot inzwischen regulär gefüllt ist", () => {
    // Abgelehnt und später von einer normalen Skill-Phase gefüllt: der Bestand passt dann nicht mehr
    // unter die alte Grenze. Ein Verkauf müsste einen fremden Skill mitreißen — also nicht.
    const skills = Array.from({ length: C.SKILL_SLOTS + C.MEISTERHAND_SLOTS }, (_, i) => `SK_FIRE_0${i + 1}`);
    const before = fresh({ coins: 0, perks: ["L_MEIS"], meisterSkill: null, skills,
      skillSlots: C.SKILL_SLOTS + C.MEISTERHAND_SLOTS });
    expect(sellables(before).find((e) => e.id === "L_MEIS").blocked).toBe(BLOCK_SLOTS);
    expect(reducer(before, { type: "SELL_PERK", kind: "perk", id: "L_MEIS" })).toBe(before);
  });
});

describe("Was man aufbaut, behält man (§3.6)", () => {
  it("Wachstum und geschmiedete Werte überleben den Verkauf eines anderen Perks", () => {
    // Erspieltes liegt nicht in `card.value` und gehört keinem Perk — der Rückbau fasst es nicht an.
    const before = fresh({ coins: 0, perks: ["L_MONO"], growth: { C1: 3 }, forged: { C2: 4 } });
    const s = reducer(before, { type: "SELL_PERK", kind: "perk", id: "L_MONO" });
    expect(s.growth).toEqual({ C1: 3 });
    expect(s.forged).toEqual({ C2: 4 });
  });

  it("der Erlös blitzt auf wie jede andere Gutschrift", () => {
    const s = reducer(fresh({ coins: 4, perks: ["L_MONO"] }), { type: "SELL_PERK", kind: "perk", id: "L_MONO" });
    expect(s.coins).toBe(4 + SELL_LEGENDARY);
    expect(s.coinGain).toMatchObject({ n: SELL_LEGENDARY, source: "sell" });
  });
});
