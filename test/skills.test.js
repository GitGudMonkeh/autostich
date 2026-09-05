import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, skillSum, initLightning, lightningCritRaw, addCharge, buildSkillOffer,
  rollTier, rollSkillOfferTiers, tierOf, SKILL_TIER_COUNT, TIER_NORMAL, TIER_EPIC,
  isLegendarySkill, archetypeOf,
  offerArchetypes, archetypesWithSkills, decodeArchetypes,
  ionScoreFor, ionCritChance, consumesCharge, ionizeCountFor, consumeCharge, ionizeCards,
  hasIonize, hasSeriesCrit, hasStorm, chargeFloorFor } from "../src/game/skills.js";
import { LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_MAX_CHARGE, MAX_ARCHETYPES,
  ION_SCORE_PER_STACK, ION_CRIT_PP_PER_STACK, ION_CRIT_STACK_CAP, REST_CHARGE_FLOOR,
  SKILL_TIER_WEIGHTS, SKILL_LEGENDARY_PER_SLOT } from "../src/game/constants.js";

const LR = "SK_LIGHTNING_01";
const ALL = Object.keys(SKILL_DEFS);
const active = (over = {}) => ({ active: true, charge: 0, maxCharge: LIGHTNING_MAX_CHARGE, ...over });

describe("skills — Blitz-Registry", () => {
  it("Blitzableiter: Hooks (critChance/chargeOnCrit) + archetype (scoreFlatOnCrit im Rework gestrippt)", () => {
    expect(SKILL_DEFS[LR].critChance()).toBeCloseTo(LIGHTNING_CRIT_PER_SKILL);
    expect(SKILL_DEFS[LR].chargeOnCrit()).toBe(1);
    expect(SKILL_DEFS[LR].scoreFlatOnCrit).toBeUndefined();
    expect(archetypeOf(LR)).toBe("lightning");
  });
  it("skillSum summiert einen Hook über die gehaltenen Skills (fehlender Hook → 0)", () => {
    expect(skillSum([LR], "chargeOnCrit", {})).toBe(1);
    expect(skillSum([], "chargeOnCrit", {})).toBe(0);
    expect(skillSum([LR], "healOnWin", {})).toBe(0);
  });
});

describe("lightningCritRaw — Crit-Basis (Abschnitt 2a)", () => {
  it("0, solange der Archetyp inaktiv ist", () => {
    expect(lightningCritRaw(null, [])).toBe(0);
    expect(lightningCritRaw(initLightning(), [LR])).toBe(0); // active:false
  });
  it("Sockel + je Skill, wenn aktiv", () => {
    expect(lightningCritRaw(active(), [])).toBeCloseTo(LIGHTNING_CRIT_BASE);                              // nur Sockel
    expect(lightningCritRaw(active(), [LR])).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL); // Sockel + 1× pro-Skill
  });
});

describe("addCharge — gedeckelt & immutabel", () => {
  it("no-op, solange inaktiv", () => {
    expect(addCharge(initLightning(), 3).charge).toBe(0);
    expect(addCharge(null, 3)).toBe(null);
  });
  it("erhöht und deckelt auf maxCharge", () => {
    expect(addCharge(active({ charge: 5 }), 2).charge).toBe(7);
    expect(addCharge(active({ charge: 9 }), 5).charge).toBe(LIGHTNING_MAX_CHARGE);
  });
  it("lässt das Original unverändert", () => {
    const l = active({ charge: 3 });
    addCharge(l, 2);
    expect(l.charge).toBe(3);
  });
});

describe("archetypesWithSkills / offerArchetypes (4 Archetypen, Cap = MAX_ARCHETYPES)", () => {
  const ALL4 = ["lightning", "fire", "ice", "plant"];
  it("F3: alle vier Fraktionen haben Skills; alles owned → keiner", () => {
    expect(archetypesWithSkills([])).toEqual(ALL4); // Reihenfolge = ARCHETYPE_ORDER (4. Fraktion Pflanze)
    expect(archetypesWithSkills(ALL)).toEqual([]);
  });
  it("0 aktiv → ALLE verfügbaren Archetypen (bis MAX_ARCHETYPES = 4)", () => {
    expect(offerArchetypes([], ["lightning"], makeRng(3))).toEqual(["lightning"]); // nur 1 verfügbar
    expect(new Set(offerArchetypes([], ALL4, makeRng(3)))).toEqual(new Set(ALL4)); // alle 4 → 3+3+3+3
  });
  it("Cap: nie mehr als MAX_ARCHETYPES, auch bei mehr verfügbaren (synthetisch)", () => {
    expect(MAX_ARCHETYPES).toBe(4); // Live-Default (ENV SIM_MAX_ARCHETYPES übersteuerbar)
    const many = ["a", "b", "c", "d", "e", "f"]; // 6 synthetische Archetypen > Cap
    expect(offerArchetypes([], many, makeRng(3))).toHaveLength(MAX_ARCHETYPES);
    expect(offerArchetypes(["a", "b", "c", "d", "e"], many, makeRng(3))).toHaveLength(MAX_ARCHETYPES); // 5 aktiv → auf 4 gekappt
  });
  it("1–3 aktiv → aktive + zufällige übrige, aufgefüllt bis 4", () => {
    const r1 = offerArchetypes(["lightning"], ALL4, makeRng(3));
    expect(r1).toContain("lightning");
    expect(new Set(r1)).toEqual(new Set(ALL4)); // 1 aktiv → alle 4
    const r3 = offerArchetypes(["lightning", "fire", "ice"], ALL4, makeRng(3));
    expect(new Set(r3)).toEqual(new Set(ALL4)); // 3 aktiv → +Pflanze = alle 4
  });
  it("4 aktiv → genau die vier aktiven (keine neue Fraktion mehr)", () => {
    expect(new Set(offerArchetypes(ALL4, ALL4, makeRng(3)))).toEqual(new Set(ALL4));
    // nur VERFÜGBARE aktive zählen: aktiv+erschöpft (alles owned) fällt raus
    expect(offerArchetypes(["lightning", "fire"], ["fire"], makeRng(3))).toEqual(["fire"]);
  });
});

describe("buildSkillOffer (3+3+3+3 über alle 4 Archetypen)", () => {
  it("liefert count distinkte, nicht-gehaltene Skills, deterministisch bei festem Seed", () => {
    const off = buildSkillOffer([], [], makeRng(1), 6);
    expect(off).toEqual(buildSkillOffer([], [], makeRng(1), 6));
    expect(off).toHaveLength(6);
    expect(new Set(off).size).toBe(6);
    expect(off.every((id) => SKILL_DEFS[id])).toBe(true);
    const archs = new Set(off.map(archetypeOf));
    expect(archs.size).toBe(4); // MAX_ARCHETYPES = 4 → alle 4 Archetypen vertreten (count 6 / 4 = je 1 + 2 Fill)
    for (const a of archs) expect(["lightning", "fire", "ice", "plant"]).toContain(a);
    // #156: verschiedene Seeds → (meist) verschiedenes Angebot — der Seed treibt die Auswahl wirklich.
    const offers = Array.from({ length: 8 }, (_, s) => buildSkillOffer([], [], makeRng(s + 1), 6).join(","));
    expect(new Set(offers).size).toBeGreaterThan(1);
  });
  it("bereits gehaltene werden nicht erneut angeboten; leerer Pool → []", () => {
    expect(buildSkillOffer([LR], [], makeRng(1), 4)).not.toContain(LR);
    expect(buildSkillOffer(ALL, [], makeRng(1), 4)).toEqual([]);
  });

  // ---- #272 / exp: der Zug selbst liefert NIE Legendäre — sie kommen als fünfte Stufe aus rollSkillOfferTiers ----
  it("ohne Legendär-Chance (0) == Default (kein rng-Drift)", () => {
    expect(buildSkillOffer([], [], makeRng(1), 6, 0)).toEqual(buildSkillOffer([], [], makeRng(1), 6));
  });
  it("#272: bietet NIE einen Legendär an — auch mit Chance 1 und Garantie", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const [chance, guar] of [[0, false], [0.5, false], [1, false], [1, true]]) {
        const off = buildSkillOffer([], [], makeRng(seed), 12, chance, guar);
        expect(off.some(isLegendarySkill)).toBe(false);
      }
    }
  });
  it("#272: 3+3+3+3-Archetyp-Balance bleibt (12 normale Skills, keine Legendäre)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const off = buildSkillOffer([], [], makeRng(seed), 12, 1, true);
      expect(off).toHaveLength(12);
      const byArch = {};
      for (const id of off) byArch[archetypeOf(id)] = (byArch[archetypeOf(id)] || 0) + 1;
      const counts = Object.values(byArch);
      expect(counts).toHaveLength(4);
      expect(counts.every((c) => c === 3)).toBe(true);
    }
  });
  it("bietet NIE einen gehaltenen Skill an und nie ein Duplikat (Invariante, #118)", () => {
    for (const owned of [[], [LR], ALL.slice(0, 5), ALL.slice(0, 20)]) {
      for (let seed = 1; seed <= 30; seed++) {
        const off = buildSkillOffer(owned, ["lightning", "fire"], makeRng(seed), 6, 0.5);
        expect(off.some((id) => owned.includes(id))).toBe(false); // nie ein gehaltener Skill
        expect(new Set(off).size).toBe(off.length);               // nie ein Duplikat
      }
    }
  });
});

// exp skill rework (docs/skill-rework.md §1, §7): jeder Angebotsplatz würfelt seine Stufe (Normal/Selten/Sehr selten/
// Episch) — davor die Legendär-Chance, die den Platz durch einen ungehaltenen Legendär derselben Fraktion ersetzt.
// Die alte Legendär-Phase (#272, buildLegendaryOffer) ist entfernt.
describe("Stufenwurf — rollTier / rollSkillOfferTiers / tierOf (exp skill rework)", () => {
  const W = [62, 25, 10, 3];
  it("Konstanten: vier Stufen, Gewichte fallend, Legendär-Chance je Platz klein aber > 0", () => {
    expect(SKILL_TIER_COUNT).toBe(4);
    expect(SKILL_TIER_WEIGHTS).toHaveLength(SKILL_TIER_COUNT);
    for (let i = 1; i < SKILL_TIER_WEIGHTS.length; i++) expect(SKILL_TIER_WEIGHTS[i]).toBeLessThan(SKILL_TIER_WEIGHTS[i - 1]);
    expect(SKILL_LEGENDARY_PER_SLOT).toBeGreaterThan(0);
    expect(SKILL_LEGENDARY_PER_SLOT).toBeLessThan(0.1);
    expect(TIER_NORMAL).toBe(0);
    expect(TIER_EPIC).toBe(SKILL_TIER_COUNT - 1);
  });
  it("rollTier: genau EIN rng-Aufruf, Stufe nach kumulierten Gewichten (Randwerte inklusive)", () => {
    expect(rollTier(() => 0, W)).toBe(0);
    expect(rollTier(() => 0.619, W)).toBe(0);   // 61,9 < 62
    expect(rollTier(() => 0.62, W)).toBe(1);
    expect(rollTier(() => 0.869, W)).toBe(1);   // 86,9 < 87
    expect(rollTier(() => 0.87, W)).toBe(2);
    expect(rollTier(() => 0.969, W)).toBe(2);   // 96,9 < 97
    expect(rollTier(() => 0.97, W)).toBe(3);
    expect(rollTier(() => 0.999999, W)).toBe(3);
    let calls = 0;
    rollTier(() => { calls++; return 0.5; });
    expect(calls).toBe(1);
  });
  it("Verteilung folgt SKILL_TIER_WEIGHTS (20 000 Würfe, ±2 Prozentpunkte)", () => {
    const rng = makeRng(7), n = 20000, hist = new Array(SKILL_TIER_COUNT).fill(0);
    for (let i = 0; i < n; i++) hist[rollTier(rng)]++;
    const total = SKILL_TIER_WEIGHTS.reduce((a, b) => a + b, 0);
    for (let k = 0; k < SKILL_TIER_COUNT; k++) expect(Math.abs(hist[k] / n - SKILL_TIER_WEIGHTS[k] / total)).toBeLessThan(0.02);
  });
  it("Chance 0: Angebot unverändert, jeder normale Skill bekommt eine Stufe 0..3, deterministisch bei festem Seed", () => {
    const off = buildSkillOffer([], [], makeRng(1), 12);
    const a = rollSkillOfferTiers(off, [], makeRng(3), 0);
    expect(a).toEqual(rollSkillOfferTiers(off, [], makeRng(3), 0));
    expect(a.offer).toEqual(off);
    expect(Object.keys(a.tiers).sort()).toEqual([...off].sort());
    for (const id of off) expect(a.tiers[id]).toBeGreaterThanOrEqual(0);
    for (const id of off) expect(a.tiers[id]).toBeLessThanOrEqual(TIER_EPIC);
    // Verschiedene Seeds → (meist) verschiedene Stufen — der Seed treibt den Wurf wirklich.
    const rolls = Array.from({ length: 8 }, (_, s) => JSON.stringify(rollSkillOfferTiers(off, [], makeRng(s + 1), 0).tiers));
    expect(new Set(rolls).size).toBeGreaterThan(1);
  });
  it("Chance 1: jeder Platz wird ein ungehaltener Legendär DERSELBEN Fraktion, keine Duplikate, keine Stufe", () => {
    const off = buildSkillOffer([], [], makeRng(2), 12); // 3+3+3+3 → je Fraktion 3 der 4 Legendären
    const r = rollSkillOfferTiers(off, [], makeRng(5), 1);
    expect(r.offer).toHaveLength(12);
    expect(new Set(r.offer).size).toBe(12);
    expect(r.offer.every(isLegendarySkill)).toBe(true);
    for (let i = 0; i < off.length; i++) expect(archetypeOf(r.offer[i])).toBe(archetypeOf(off[i]));
    expect(r.tiers).toEqual({});
  });
  it("Legendär-Pool erschöpft (gehaltene + schon im Angebot) → der Platz bleibt normal und bekommt eine Stufe", () => {
    const five = ["SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06"];
    const r = rollSkillOfferTiers(five, ["SK_LIGHTNING_L01"], makeRng(4), 1); // 3 Legendäre frei, 5 Plätze
    expect(r.offer).toHaveLength(5);
    expect(new Set(r.offer).size).toBe(5);
    expect(r.offer).not.toContain("SK_LIGHTNING_L01");            // gehalten → nie erneut
    expect(r.offer.filter(isLegendarySkill)).toHaveLength(3);     // Pool leer nach dem dritten Treffer
    expect(Object.keys(r.tiers)).toHaveLength(2);                 // die zwei normal gebliebenen Plätze
    for (const id of Object.keys(r.tiers)) expect(isLegendarySkill(id)).toBe(false);
  });
  it("ein schon legendärer Eintrag (Dev-Katalog) wird nicht angefasst und blockiert seinen Legendär für den Rest", () => {
    const r = rollSkillOfferTiers(["SK_FIRE_L01", "SK_FIRE_01"], [], makeRng(1), 1);
    expect(r.offer[0]).toBe("SK_FIRE_L01");
    expect(isLegendarySkill(r.offer[1])).toBe(true);
    expect(r.offer[1]).not.toBe("SK_FIRE_L01");
    expect(r.tiers).toEqual({});
  });
  it("Invariante über viele Seeds (Live-Chance): nie ein gehaltener Skill, nie ein Duplikat, Legendäre nur ungehalten", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const owned = ["SK_FIRE_01", "SK_FIRE_L02", "SK_ICE_L01"];
      const off = buildSkillOffer(owned, ["fire", "ice"], makeRng(seed), 12);
      const r = rollSkillOfferTiers(off, owned, makeRng(seed + 100));
      expect(r.offer).toHaveLength(off.length);
      expect(new Set(r.offer).size).toBe(r.offer.length);
      expect(r.offer.some((id) => owned.includes(id))).toBe(false);
      for (const id of r.offer) expect(isLegendarySkill(id) ? !(id in r.tiers) : Number.isInteger(r.tiers[id])).toBe(true);
    }
  });
  it("tierOf: Stufe aus state.skillTiers, Normal ohne Eintrag (ältere Snapshots), null für Legendäre", () => {
    const st = { skillTiers: { SK_FIRE_01: 2 } };
    expect(tierOf(st, "SK_FIRE_01")).toBe(2);
    expect(tierOf(st, "SK_FIRE_02")).toBe(TIER_NORMAL);
    expect(tierOf({}, "SK_FIRE_01")).toBe(TIER_NORMAL);
    expect(tierOf(null, "SK_FIRE_01")).toBe(TIER_NORMAL);
    expect(tierOf(st, "SK_FIRE_L01")).toBeNull();
  });
});

// Konsument-Garantie: aktive Feuer-/Blitz-Builds ohne gehaltenen Konsumenten bekommen garantiert einen angeboten,
// solange man keinen aktiv hat — sonst kann der Build nie „zünden" (Nutzer-Wunsch: sonst frustrierend).
describe("buildSkillOffer — Konsument-Garantie (aktive Feuer/Blitz-Builds)", () => {
  const isFireConsumer   = (id) => !!SKILL_DEFS[id]?.heatConsumer;  // Flächenbrand/Schmelzpunkt
  const isChargeConsumer = (id) => !!SKILL_DEFS[id]?.onFullCharge;  // Ionisierung
  it("aktiver Feuer-Build ohne Hitze-Konsument → garantiert ein Hitze-Konsument im Angebot", () => {
    for (let seed = 1; seed <= 40; seed++)
      expect(buildSkillOffer(["SK_FIRE_01"], ["fire"], makeRng(seed), 6).some(isFireConsumer)).toBe(true);
  });
  it("aktiver Blitz-Build ohne Ladungs-Konsument → garantiert ein Ladungs-Konsument im Angebot", () => {
    for (let seed = 1; seed <= 40; seed++)
      expect(buildSkillOffer(["SK_LIGHTNING_01"], ["lightning"], makeRng(seed), 6).some(isChargeConsumer)).toBe(true);
  });
  it("beide aktiv & ohne Konsument → beide Typen garantiert, auch bei erzwungenem Legendär-Roll", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const off = buildSkillOffer(["SK_FIRE_01", "SK_LIGHTNING_01"], ["fire", "lightning"], makeRng(seed), 6, 1);
      expect(off.some(isFireConsumer)).toBe(true);
      expect(off.some(isChargeConsumer)).toBe(true);
    }
  });
  it("hält man bereits einen Konsumenten, wird KEINER erzwungen (Angebot kann konsumentenfrei sein)", () => {
    // Ionisierung (Ladungs-Konsument) gehalten → über viele Seeds gibt es mind. ein Angebot ganz OHNE Konsument.
    const anyClean = Array.from({ length: 30 }, (_, s) =>
      buildSkillOffer(["SK_LIGHTNING_02"], ["lightning"], makeRng(s + 1), 6)
    ).some((off) => !off.some(isChargeConsumer));
    expect(anyClean).toBe(true);
  });
  it("#223 Kontrolle Feuer: hält man einen Hitze-Konsumenten → KEINER erzwungen (symmetrisch zu Blitz)", () => {
    // Flächenbrand (Hitze-Konsument) gehalten → über viele Seeds gibt es mind. ein Angebot ganz OHNE Hitze-Konsument.
    const anyClean = Array.from({ length: 30 }, (_, s) =>
      buildSkillOffer(["SK_FIRE_11"], ["fire"], makeRng(s + 1), 6)
    ).some((off) => !off.some(isFireConsumer));
    expect(anyClean).toBe(true);
  });
  it("Erst-Angebot (leeres activeArchetypes) bleibt deterministisch — kein rng-Drift", () => {
    expect(buildSkillOffer([], [], makeRng(1), 6)).toEqual(buildSkillOffer([], [], makeRng(1), 6));
  });
  // #191: schon beim ERSTEN Skill-Angebot (noch kein Archetyp aktiv) mind. EINEN Konsumenten insgesamt.
  it("#191 Erst-Angebot ohne aktiven Archetyp → garantiert mind. EIN Konsument (Feuer ODER Blitz)", () => {
    const isConsumer = (id) => isFireConsumer(id) || isChargeConsumer(id);
    for (let seed = 1; seed <= 40; seed++)
      expect(buildSkillOffer([], [], makeRng(seed), 6).some(isConsumer)).toBe(true);
  });
  // #223: das Erst-Angebot enthält IMMER alle 4 Archetypen → JEDER Konsumenten-Archetyp (Feuer & Blitz) muss seinen
  // Konsumenten zeigen, nicht nur der erste in chosen-Reihenfolge — sonst „verpufft" der Blitz-Ladungsaufbau ohne
  // sichtbaren Blitz-Konsumenten (Nutzer-Befund). Gilt bei count 6 (je 1 + Fill) wie 12 (3+3+3+3) und mit Legendär-Roll.
  it("#223 Erst-Angebot garantiert BEIDE Konsumenten-Archetypen — Feuer UND Blitz", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const [count, chance] of [[6, 0], [12, 0], [12, 1]]) {
        const off = buildSkillOffer([], [], makeRng(seed), count, chance);
        expect(off.some(isFireConsumer)).toBe(true);
        expect(off.some(isChargeConsumer)).toBe(true);
      }
    }
  });
  it("#191 Erst-Angebot: Konsument-Garantie hält auch bei erzwungenem Legendär-Roll + 3+3+3+3-Balance", () => {
    const isConsumer = (id) => isFireConsumer(id) || isChargeConsumer(id);
    for (let seed = 1; seed <= 40; seed++) {
      const off = buildSkillOffer([], [], makeRng(seed), 12, 1); // Legendär erzwungen
      expect(off.some(isConsumer)).toBe(true);
      expect(off).toHaveLength(12);
      const byArch = {};
      for (const id of off) byArch[archetypeOf(id)] = (byArch[archetypeOf(id)] || 0) + 1;
      const counts = Object.values(byArch);
      expect(counts).toHaveLength(4); // alle 4 Archetypen, je 3
      expect(counts.every((c) => c === 3)).toBe(true);
    }
  });
});

describe("Ionisierung — Helfer (Stufe B)", () => {
  const I = "SK_LIGHTNING_02", K = "SK_LIGHTNING_03";
  const mkDeck = (stacks) => stacks.map((s, i) => ({ id: `c${i}`, suit: "R", baseRank: 1, value: 1, ...(s ? { ionStacks: s } : {}) }));

  it("ionScoreFor: +ION_SCORE_PER_STACK je Stapel (0 ohne / null)", () => {
    expect(ionScoreFor({ ionStacks: 3 })).toBe(3 * ION_SCORE_PER_STACK);
    expect(ionScoreFor({ ionStacks: 0 })).toBe(0);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
  });
  it("ionCritChance (#271): Σ Feldstapel × pp, gedeckelt; 0 ohne Stapel", () => {
    expect(ionCritChance(mkDeck([3, 2, 0, 5]))).toBeCloseTo(10 * ION_CRIT_PP_PER_STACK, 10); // Σ 10
    expect(ionCritChance(mkDeck([0, 0, 0]))).toBe(0);
    expect(ionCritChance([])).toBe(0);
    expect(ionCritChance(undefined)).toBe(0);
    // Deckel: Σ über dem Cap zählt nur bis zum Cap.
    const many = mkDeck(Array(30).fill(5)); // Σ 150 ≫ Cap
    expect(ionCritChance(many)).toBeCloseTo(ION_CRIT_STACK_CAP * ION_CRIT_PP_PER_STACK, 10);
  });
  it("consumesCharge nur mit Ionisierung; ionizeCountFor = 2 (+2 mit Kettenblitz)", () => {
    expect(consumesCharge([I])).toBe(true);
    expect(consumesCharge([K])).toBe(false);   // Kettenblitz allein ist kein Verbraucher
    expect(consumesCharge([])).toBe(false);
    expect(ionizeCountFor([I])).toBe(2);
    expect(ionizeCountFor([I, K])).toBe(4);
  });
  it("consumeCharge setzt auf den Boden (Default 0, Stufe C: Reststrom)", () => {
    expect(consumeCharge(active({ charge: 10 })).charge).toBe(0);
    expect(consumeCharge(active({ charge: 10 }), 3).charge).toBe(3);
  });
  it("ionizeCards: count distinkte ungespielte Karten je +1 (immutabel)", () => {
    const deck = mkDeck([0, 0, 0, 0, 0]);
    const out = ionizeCards(deck, [1, 2, 3, 4], 2, makeRng(1));
    const bumped = out.filter((c) => (c.ionStacks || 0) > 0);
    expect(bumped).toHaveLength(2);
    expect(bumped.every((c) => c.ionStacks === 1)).toBe(true);
    expect(deck.every((c) => !c.ionStacks)).toBe(true); // Original unverändert
  });
  it("ionizeCards Fallback: zu wenige ungespielte Karten → Rest auf bereits ionisierte", () => {
    const deck = mkDeck([2, 0, 0]); // c0 schon ionisiert, nur c1 ungespielt
    const out = ionizeCards(deck, [1], 3, makeRng(1));
    const total = out.reduce((s, c) => s + (c.ionStacks || 0), 0);
    expect(total).toBe(2 + 3); // 3 Stapel verteilt, nichts verloren
  });
});

describe("Reaktoren + Ladungsserie — Helfer (Stufe C)", () => {
  const R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07", I = "SK_LIGHTNING_02";
  it("Verbraucher-Prädikate: nur Ionisierung ist Verbraucher; Ladungsserie speist die Crit-Maschine", () => {
    expect(hasIonize([I])).toBe(true);
    expect(hasSeriesCrit([S])).toBe(true);    // Ladungsserie: Serie → Crit-Chance
    expect(hasSeriesCrit([I])).toBe(false);
    expect(consumesCharge([S])).toBe(false);  // Ladungsserie verbraucht KEINE Ladung mehr (Rework v0)
    expect(consumesCharge([I])).toBe(true);   // Ionisierung verbraucht
    expect(consumesCharge([R])).toBe(false);  // Reststrom ist Reaktor, kein Verbraucher
  });
  it("chargeFloorFor: Reststrom setzt den Ladungsboden, sonst 0", () => {
    expect(chargeFloorFor([R])).toBe(REST_CHARGE_FLOOR);
    expect(chargeFloorFor([])).toBe(0);
  });
  it("hasStorm nur mit Gewitterfront", () => {
    expect(hasStorm([G])).toBe(true);
    expect(hasStorm([R])).toBe(false);
  });
  it("lightningCritRaw addiert den Gewitterfront-Bonus (stormCritBonus)", () => {
    const l = { active: true, charge: 0, maxCharge: 10, stormCritBonus: 0.08 };
    expect(lightningCritRaw(l, [G])).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL + 0.08); // Sockel + Skill-critChance + Storm(0,08)
  });
});

describe("decodeArchetypes — Board-Icons (#139)", () => {
  it("leerer/undefinierter Wert → []", () => {
    expect(decodeArchetypes("")).toEqual([]);
    expect(decodeArchetypes(null)).toEqual([]);
    expect(decodeArchetypes(undefined)).toEqual([]);
  });
  it("bekannte Keys immer in fester Reihenfolge Blitz→Feuer→Eis (unabhängig vom Input)", () => {
    expect(decodeArchetypes("ice,fire")).toEqual(["fire", "ice"]);
    expect(decodeArchetypes("fire,lightning")).toEqual(["lightning", "fire"]);
    expect(decodeArchetypes("lightning")).toEqual(["lightning"]);
  });
  it("ein Eintrag pro Skill → Wiederholung bleibt erhalten (ein Icon je Skill)", () => {
    expect(decodeArchetypes("fire,fire,fire,fire")).toEqual(["fire", "fire", "fire", "fire"]); // 4 Feuer
    expect(decodeArchetypes("fire,ice,fire,ice")).toEqual(["fire", "fire", "ice", "ice"]);     // 2 Feuer + 2 Eis, gruppiert
    expect(decodeArchetypes("ice,lightning,fire")).toEqual(["lightning", "fire", "ice"]);       // je 1, feste Reihenfolge
  });
  it("unbekannte Tokens werden ignoriert (Zählung bleibt korrekt)", () => {
    expect(decodeArchetypes("fire,water,fire,ice")).toEqual(["fire", "fire", "ice"]);
    expect(decodeArchetypes("bogus")).toEqual([]);
  });
});

describe("buildSkillOffer — max. 3 Skills pro Archetyp (#Onboarding-Fix)", () => {
  const rng = makeRng(7);
  const countPerArch = (offer) => offer.reduce((m, id) => { const a = archetypeOf(id); m[a] = (m[a] || 0) + 1; return m; }, {});
  it("wenige freigeschaltete Archetypen: nie mehr als 3 desselben Archetyps (statt 6)", () => {
    // count 12, aber nur 2 Archetypen freigeschaltet → früher 6 je Archetyp; jetzt gedeckelt auf 3.
    const offer = buildSkillOffer([], [], rng, 12, 0, false, ["lightning", "ice"]);
    const per = countPerArch(offer);
    for (const a of Object.keys(per)) expect(per[a]).toBeLessThanOrEqual(3);
  });
  it("alle 4 Archetypen, count 12 → weiterhin 3 je Archetyp (unverändert)", () => {
    const offer = buildSkillOffer([], [], makeRng(3), 12, 0, false, null);
    const per = countPerArch(offer);
    for (const a of Object.keys(per)) expect(per[a]).toBeLessThanOrEqual(3);
  });
  it("Mono (1 Archetyp) → höchstens 3 statt count", () => {
    const offer = buildSkillOffer([], [], makeRng(9), 12, 0, false, ["lightning"]);
    expect(offer.length).toBeLessThanOrEqual(3);
  });
});
