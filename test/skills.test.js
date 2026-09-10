import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, skillSum, buildSkillOffer, BLITZ_TIERS,
  rollTier, rollSkillOfferTiers, tierOf, SKILL_TIER_COUNT, TIER_NORMAL, TIER_EPIC,
  isLegendarySkill, archetypeOf,
  offerArchetypes, archetypesWithSkills, decodeArchetypes } from "../src/game/skills.js";
import { MAX_ARCHETYPES, SKILL_TIER_WEIGHTS, SKILL_LEGENDARY_PER_SLOT } from "../src/game/constants.js";

const LR = "SK_LIGHTNING_01";
const ALL = Object.keys(SKILL_DEFS);
// Anteil → Prozenttext, wie `pctS` in skills.js (0,06 → „6", 0,045 → „4,5").
const pctText = (x) => String(Math.round(x * 10000) / 100).replace(".", ",");

describe("skills — Blitz-Registry (exp skill rework)", () => {
  it("17 Blitz-Skills: 14 normale mit vier Stufenzeilen + 3 Legendäre ohne Stufe, alle archetype=lightning", () => {
    const light = Object.values(SKILL_DEFS).filter((s) => s.archetype === "lightning");
    expect(light).toHaveLength(17); // §7.19: 14 normale (Überschlag gestrichen, Owner-Untergrenze 14) + 3 Legendäre (§6.11, Owner)
    const normal = light.filter((s) => !s.legendary), leg = light.filter((s) => s.legendary);
    expect(normal).toHaveLength(14);
    expect(SKILL_DEFS.SK_LIGHTNING_14).toBeUndefined();           // §7.19: Überschlag gestrichen
    expect(leg).toHaveLength(3);
    expect(SKILL_DEFS.SK_LIGHTNING_L01, "Donnergott gestrichen (gemessen +30 %, das schwächste der vier)").toBeUndefined();
    for (const s of normal) expect(Array.isArray(s.tiers) && s.tiers.length === SKILL_TIER_COUNT, `${s.id} ohne Stufentabelle`).toBe(true);
    for (const s of leg) expect(s.tiers).toBeUndefined();
    expect(SKILL_DEFS[LR].tiers).toBe(BLITZ_TIERS.ableiter);
    expect(SKILL_DEFS.SK_LIGHTNING_L03.name).toBe("Hochspannung"); // ersetzt Flächenionisation
    expect(SKILL_DEFS.SK_LIGHTNING_02.name).toBe("Ionenfeld");    // §7.18: neu auf dem Platz der alten Ionisierung (die ist das Passiv)
    expect(SKILL_DEFS.SK_LIGHTNING_12.name).toBe("Vorentladung"); // §7.18: neu auf dem Platz des gestrichenen Breitenbeschleunigers
    expect(SKILL_DEFS.SK_LIGHTNING_08).toBeUndefined();           // §7.18: Statische Aufladung in Blitzableiter aufgegangen
    expect(SKILL_DEFS.SK_LIGHTNING_16).toBeUndefined();           // §7.18: Dauerstrom in Blitzableiter aufgegangen
    expect(archetypeOf(LR)).toBe("lightning");
  });
  it("Stufentabellen: Schwellen fallen, Raten steigen mit der Stufe (Leiter aus docs/skill-rework.md §3.5)", () => {
    const desc = (rows, key) => rows.every((r, i) => i === 0 || r[key] <= rows[i - 1][key]);
    const asc = (rows, key) => rows.every((r, i) => i === 0 || r[key] >= rows[i - 1][key]);
    for (const k of ["faenger", "kurzschluss"]) expect(desc(BLITZ_TIERS[k], "minStacks"), k).toBe(true);
    expect(desc(BLITZ_TIERS.blitzschlag, "critEvery")).toBe(true);
    expect(desc(BLITZ_TIERS.vorentladung, "minStreak")).toBe(true); // §7.18
    expect(asc(BLITZ_TIERS.faenger, "value")).toBe(true);           // §7.18: ohne Schwelle, der Wert steigt
    expect(asc(BLITZ_TIERS.lichtbogen, "critPerStack")).toBe(true); // §7.28: Ionisierung zu Crit-Chance, der Satz je Stapel steigt
    expect(BLITZ_TIERS.ueberspannung).toBeUndefined();               // §7.28: Überspannung gestrichen
    expect(asc(BLITZ_TIERS.ionenfeld, "value")).toBe(true);         // §7.19
    expect(asc(BLITZ_TIERS.ionenfeld, "tricks")).toBe(true);        // §7.18
    /* §7.59: auf SK_LIGHTNING_17 steht die Streuung, der Serienschutz ist gestrichen. Die Leiter ist die ZAHL DER
       KARTEN (Breite), und der Wächter hält zugleich fest, dass die Zeile nichts von einer Niederlage weiß: `cost`
       und `perRound` waren der Preis und der Deckel des alten Skills, und die Owner-Regel §7.31 verbietet den
       Auslöser. Kommen sie zurück, ist der Niederlagen-Skill zurück. */
    expect(BLITZ_TIERS.serienschutz).toBeUndefined();
    expect(asc(BLITZ_TIERS.streuung, "cards")).toBe(true);
    expect(BLITZ_TIERS.streuung.every((r) => r.cost === undefined && r.perRound === undefined && r.frac === undefined)).toBe(true);
    expect(BLITZ_TIERS.streuung.at(-1).freshStacks).toBeGreaterThan(1); // Episch-Extra nur auf der letzten Stufe
    expect(BLITZ_TIERS.streuung.slice(0, -1).every((r) => r.freshStacks === undefined)).toBe(true);
    expect(asc(BLITZ_TIERS.reststrom, "floor")).toBe(true);
    expect(asc(BLITZ_TIERS.gewitter, "critPerBar")).toBe(true);
    // §7.42: Entladung ist von der Crit-Multiplikator-Achse auf den Basis-Score gewechselt — die Leiter ist jetzt
    // `scorePerBar`, und `multPerBar` darf auf KEINER Stufe zurückkommen (sonst stünden wieder vier Skills auf einer Achse).
    expect(asc(BLITZ_TIERS.entladung, "scorePerBar")).toBe(true);
    expect(BLITZ_TIERS.entladung.every((r) => r.multPerBar === undefined && r.fillDouble === undefined)).toBe(true);
    // §7.30: die Ladungsserie zahlt in Ladung, ihre Leiter ist die fallende Schwelle (und trägt keinen Crit-Satz mehr).
    expect(desc(BLITZ_TIERS.serie, "chargeFromStreak")).toBe(true);
    expect(BLITZ_TIERS.serie.every((r) => r.critPerStreak === undefined)).toBe(true);
    // §7.51 (Owner): das Spannungsfeld zahlt auf die Crit-CHANCE je ionisierter Karte. Die zwei fruehren Lesarten
    // duerfen NICHT zurueckkommen: "perStack" war die Tiefe (§7.43) und "perCard" der eigene Score-Faktor (§7.47) —
    // beide haengten an einer zweiten Multiplikator-Achse, die Blitz gar nicht braucht (§7.46 C).
    expect(asc(BLITZ_TIERS.feld, "critPerForm")).toBe(true);
    expect(BLITZ_TIERS.feld.every((r) => r.step === undefined && r.critKeep === undefined && r.perStack === undefined && r.perCard === undefined && r.critPerCard === undefined)).toBe(true);
    expect(BLITZ_TIERS.stau).toBeUndefined();
    expect(BLITZ_TIERS.feld[3].feedLowest).toBe(1); // §7.47: der Episch-Anhang hängt an der letzten Stufe der Leiter
    expect(asc(BLITZ_TIERS.kette, "extra")).toBe(true); // §7.18: Tiefe
  });
  it("Beschreibungen interpolieren die Tabellen (kein Drift zwischen Regel und Text)", () => {
    expect(SKILL_DEFS.SK_LIGHTNING_11.desc).toContain(`+${BLITZ_TIERS.faenger[0].value} Wert`);
    expect(SKILL_DEFS.SK_LIGHTNING_02.descTiers[3]).toContain(`${BLITZ_TIERS.ionenfeld[3].tricks} Stiche`);
    expect(SKILL_DEFS.SK_LIGHTNING_12.desc).toContain(`Ab Serie ${BLITZ_TIERS.vorentladung[0].minStreak}`);
    expect(SKILL_DEFS.SK_LIGHTNING_05.desc).toContain(`bei ${BLITZ_TIERS.reststrom[0].floor} statt 0`);
    expect(SKILL_DEFS.SK_LIGHTNING_06.desc).toContain("+0,5");
    expect(SKILL_DEFS.SK_LIGHTNING_13.descTiers[3]).toContain(`+${pctText(BLITZ_TIERS.feld[3].critPerForm)} % Crit-Chance`);
  });
  it("skillSum summiert einen Hook über die gehaltenen Skills (fehlender Hook → 0)", () => {
    expect(skillSum([], "scoreFlatOnCrit", {})).toBe(0);
    expect(skillSum([LR], "healOnWin", {})).toBe(0);
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
    const r = rollSkillOfferTiers(five, ["SK_LIGHTNING_L02"], makeRng(4), 1); // 2 Legendäre frei, 5 Plätze
    expect(r.offer).toHaveLength(5);
    expect(new Set(r.offer).size).toBe(5);
    expect(r.offer).not.toContain("SK_LIGHTNING_L02");            // gehalten → nie erneut
    expect(r.offer.filter(isLegendarySkill)).toHaveLength(2);     // Pool leer nach dem zweiten Treffer (§6.11: drei je Fraktion)
    expect(Object.keys(r.tiers)).toHaveLength(3);                 // die drei normal gebliebenen Plätze
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

// exp skill rework: die Konsument-Garantie des Angebots ist mit der Verbraucher-Regel entfallen — Blitz kennt keine
// Konsumenten mehr (die Leiste ionisiert selbst), Feuer trägt seinen Payoff im Passiv (Hitze-Multiplikator). Kein
// Skill trägt mehr einen Effekt-Marker dafür; das Angebot zieht rein aus dem Pool (die Feuer-Seite in fire-rework.test.js).
describe("buildSkillOffer — keine Konsument-Garantie mehr (exp)", () => {
  it("kein Skill trägt mehr einen Konsumenten-Marker (heatConsumer / onFullCharge)", () => {
    expect(Object.values(SKILL_DEFS).some((s) => s.heatConsumer || s.onFullCharge)).toBe(false);
  });
  it("Erst-Angebot (leeres activeArchetypes) bleibt deterministisch — kein rng-Drift", () => {
    expect(buildSkillOffer([], [], makeRng(1), 6)).toEqual(buildSkillOffer([], [], makeRng(1), 6));
  });
  it("Erst-Angebot: 3+3+3+3-Balance über alle vier Archetypen, auch mit dem (inerten) Legendär-Parameter", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const off = buildSkillOffer([], [], makeRng(seed), 12, 1);
      expect(off).toHaveLength(12);
      const byArch = {};
      for (const id of off) byArch[archetypeOf(id)] = (byArch[archetypeOf(id)] || 0) + 1;
      const counts = Object.values(byArch);
      expect(counts).toHaveLength(4); // alle 4 Archetypen, je 3
      expect(counts.every((c) => c === 3)).toBe(true);
    }
  });
});

// (exp skill rework: Ionisierung, Ladung und die Blitz-Prädikate leben in src/game/factions/lightning.js —
//  getestet in test/lightning-rework.test.js.)

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

/* §7.45 (Owner: „überall bei dem Skill auch die neue Rarität anzeigen, Skillauswahl, Panels usw."). Die Anzeige darf
   die GEWÜRFELTE Stufe nicht mehr lesen — sonst steht mit Hochspannung „SELTEN" an einem Skill, der wie Episch
   wirkt, und der Kartentext beschreibt die falschen Zahlen. Der Wächter prüft die Verdrahtung im Quelltext, weil
   genau dort der Rückfall passiert: ein `tierOf` schleicht sich beim nächsten Umbau zurück in eine Anzeige.
   Die EINE erlaubte Ausnahme ist der Aufwert-Screen: dort bezahlt man den Wurf, nicht die Wirkung. */
describe("Anzeige-Stufe: keine Oberfläche liest die gewürfelte Stufe, außer dem Aufwert-Screen (§7.45)", () => {
  const read = (rel) => readFileSync(fileURLToPath(new URL(`../src/ui/${rel}`, import.meta.url)), "utf8");
  const SURFACES = ["HeldSkills.jsx", "SkillSelect.jsx", "BuildSummary.jsx", "RunDetail.jsx", "RunStats.jsx"];
  it("die fünf Oberflächen lesen effectiveTierOf, keine davon tierOf", () => {
    for (const f of SURFACES) {
      const src = read(f);
      expect(src, f).toContain("effectiveTierOf");
      expect(src.match(/(?<!effective)\btierOf\b/), f).toBeNull();
    }
  });
  it("der Aufwert-Screen bleibt auf der gewürfelten Stufe — dort ist sie der Preis", () => {
    const src = read("SkillUpgrade.jsx");
    expect(src).toContain("tierOf(state, id)");
    expect(src).not.toContain("effectiveTierOf");
  });
});
