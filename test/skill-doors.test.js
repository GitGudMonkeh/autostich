import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { buildSkillDoors, rerollDoorSkills, archetypeOf, isLegendarySkill, SKILL_DEFS, SKILL_LIST, TIER_EPIC } from "../src/game/skills.js";
import { SKILL_DOORS, SKILL_DOOR_SIZE, SKILL_DOOR_FACTIONS, SKILL_OFFER_ARCHETYPES, TRICKS_PER_CYCLE } from "../src/game/constants.js";
import { skillDef } from "../src/i18n/labels.js";
import de from "../src/i18n/de.js";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";
import { factionPolicy } from "../sim/policies/faction.js";
import { fixedPolicy } from "../sim/policies/fixed.js";

/* exp skill rework — das Türen-Angebot (docs/skill-rework.md §1, §7.7): zwei Türen mit je drei Fraktionssymbolen
   (drei Skills aus höchstens zwei Fraktionen, Wiederholung erlaubt), Stufen mit der Tür gewürfelt und erst nach dem
   Öffnen sichtbar; danach das Drei-Karten-Angebot, einer wird genommen. Dazu die Stufentexte: ein Text je Stufe. */
const ALL4 = ["lightning", "fire", "ice", "plant"];
const archsOf = (ids) => new Set(ids.map(archetypeOf));
const doorsAt = (seed, owned = [], active = [], opts = {}) => buildSkillDoors(owned, active, makeRng(seed), makeRng(seed + 1000), opts);

describe("buildSkillDoors — zwei Türen, drei Skills, höchstens zwei Fraktionen", () => {
  it("Konstanten: 2 Türen à 3 Skills aus ≤ 2 Fraktionen; der exp-Pool ist Feuer und Blitz", () => {
    expect(SKILL_DOORS).toBe(2);
    expect(SKILL_DOOR_SIZE).toBe(3);
    expect(SKILL_DOOR_FACTIONS).toBe(2);
    expect([...SKILL_OFFER_ARCHETYPES].sort()).toEqual(["fire", "lightning"]);
  });
  it("Form: je Tür `skills` (distinkt, ungehalten, aus dem Pool) und `tiers` (0..3 je normalem Skill); Türen sind disjunkt", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const doors = doorsAt(seed);
      expect(doors).toHaveLength(SKILL_DOORS);
      const all = doors.flatMap((d) => d.skills);
      expect(new Set(all).size).toBe(all.length); // kein Skill auf beiden Türen
      for (const d of doors) {
        expect(d.skills).toHaveLength(SKILL_DOOR_SIZE);
        expect(archsOf(d.skills).size).toBeLessThanOrEqual(SKILL_DOOR_FACTIONS);
        for (const id of d.skills) {
          expect(SKILL_OFFER_ARCHETYPES).toContain(archetypeOf(id));
          expect(isLegendarySkill(id) ? !(id in d.tiers) : Number.isInteger(d.tiers[id]) && d.tiers[id] >= 0 && d.tiers[id] <= TIER_EPIC).toBe(true);
        }
      }
    }
  });
  it("Wiederholung erlaubt: über viele Seeds gibt es Türen mit einer und Türen mit zwei Fraktionen", () => {
    const sizes = new Set();
    for (let seed = 1; seed <= 80; seed++) for (const d of doorsAt(seed)) sizes.add(archsOf(d.skills).size);
    expect(sizes).toEqual(new Set([1, 2]));
  });
  it("deterministisch bei festem Seed; verschiedene Seeds ziehen verschieden", () => {
    expect(doorsAt(5)).toEqual(doorsAt(5));
    expect(new Set(Array.from({ length: 8 }, (_, s) => JSON.stringify(doorsAt(s + 1)))).size).toBeGreaterThan(1);
  });
  it("gehaltene Skills stehen nie hinter einer Tür; ein Legendär kommt nur ungehalten und nur einmal", () => {
    const owned = ["SK_FIRE_01", "SK_FIRE_L01", "SK_LIGHTNING_07"];
    for (let seed = 1; seed <= 60; seed++) {
      const all = doorsAt(seed, owned, ["fire", "lightning"], { legendaryChance: 0.5 }).flatMap((d) => d.skills);
      expect(all.some((id) => owned.includes(id))).toBe(false);
      expect(new Set(all).size).toBe(all.length);
    }
    // Chance 1: jeder Platz ein Legendär derselben Fraktion, solange der Pool reicht — kein Legendär doppelt.
    const legs = doorsAt(3, [], [], { legendaryChance: 1 }).flatMap((d) => d.skills).filter(isLegendarySkill);
    expect(new Set(legs).size).toBe(legs.length);
    expect(legs.length).toBeGreaterThan(0);
  });
  it("Allowlist: `unlockedArchetypes` ersetzt den Pool (Eis bleibt für die Sim erreichbar); Archetyp-Deckel hält aktive Fraktionen", () => {
    const ice = doorsAt(2, [], [], { unlockedArchetypes: ["ice"] });
    expect(ice.flatMap((d) => d.skills).every((id) => archetypeOf(id) === "ice")).toBe(true);
    const all4 = new Set();
    for (let seed = 1; seed <= 40; seed++) for (const id of doorsAt(seed, [], [], { unlockedArchetypes: ALL4 }).flatMap((d) => d.skills)) all4.add(archetypeOf(id));
    expect(all4).toEqual(new Set(ALL4));
    // maxArchetypes 1 mit Feuer aktiv → nur Feuer hinter den Türen.
    for (let seed = 1; seed <= 20; seed++) {
      const fireOnly = doorsAt(seed, ["SK_FIRE_01"], ["fire"], { maxArchetypes: 1 });
      expect(fireOnly.flatMap((d) => d.skills).every((id) => archetypeOf(id) === "fire")).toBe(true);
    }
  });
  it("erschöpfter Pool: kürzere Türen, dann keine (Perk-Fallback im Reducer)", () => {
    const pool = SKILL_LIST.filter((s) => SKILL_OFFER_ARCHETYPES.includes(s.archetype) && !s.legendary).map((s) => s.id);
    const owned = pool.slice(0, pool.length - 4); // 4 normale Skills übrig
    const doors = doorsAt(1, owned, ["fire", "lightning"], { legendaryChance: 0 });
    expect(doors.flatMap((d) => d.skills)).toHaveLength(4);
    expect(doorsAt(1, [...pool, ...SKILL_LIST.filter((s) => s.legendary).map((s) => s.id)])).toEqual([]);
    expect(doorsAt(1, pool, [], { legendaryChance: 0 })).toEqual([]);
  });
});

describe("Reducer — Türstufe, CHOOSE_DOOR, Angebot", () => {
  const rng = makeRng(7);
  it("START_RUN öffnet die Türstufe: skillDoors gesetzt, skillOffer null; CHOOSE_DOOR macht die Tür zum Angebot samt Stufen", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1) });
    expect(s.phase).toBe("levelup");
    expect(s.skillDoors).toHaveLength(2);
    expect(s.skillOffer).toBeNull();
    expect(reducer(s, { type: "CHOOSE_DOOR", index: 5 })).toBe(s); // ungültiger Index → No-Op
    const opened = reducer(s, { type: "CHOOSE_DOOR", index: 1 });
    expect(opened.skillOffer).toEqual(s.skillDoors[1].skills);
    expect(opened.skillOfferTiers).toEqual(s.skillDoors[1].tiers);
    expect(opened.skillDoors).toBeNull();
    expect(opened.phase).toBe("levelup");
    expect(reducer(opened, { type: "CHOOSE_DOOR", index: 0 })).toBe(opened); // keine Türen mehr → No-Op
    // Der Pick trägt die Stufe der Tür in den Bestand.
    const id = opened.skillOffer.find((x) => !isLegendarySkill(x));
    const picked = reducer(opened, { type: "PICK_SKILL", skillId: id, rng });
    expect(picked.skills).toEqual([id]);
    expect(picked.skillTiers[id]).toBe(opened.skillOfferTiers[id]);
    expect(picked.skillOffer).toBeNull();
    expect(picked.skillDoors).toBeNull();
  });
  it("PICK_SKILL braucht ein geöffnetes Angebot — vor den Türen ist er ein No-Op", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(2) });
    expect(reducer(s, { type: "PICK_SKILL", skillId: s.skillDoors[0].skills[0], rng })).toBe(s);
  });
  it("Neuwurf würfelt die drei Skills der geöffneten Tür neu — gleiche Symbole, neue Skills und Stufen — und kostet ein Token; vor den Türen ist er ein No-Op", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(3), seed: 99 });
    expect(reducer(s, { type: "REROLL_SKILL", rng })).toBe(s); // vor den Türen kein Neuwurf
    const opened = reducer(s, { type: "CHOOSE_DOOR", index: 0 });
    expect(opened.skillOfferArchs).toEqual(opened.skillOffer.map(archetypeOf));
    const r = reducer(opened, { type: "REROLL_SKILL", rng });
    expect(r.skillDoors).toBeNull();
    expect(r.skillOffer).toHaveLength(opened.skillOffer.length);
    expect(r.skillOffer.map(archetypeOf)).toEqual(opened.skillOfferArchs); // dieselben Fraktionssymbole je Platz
    expect(r.skillOffer.some((id) => opened.skillOffer.includes(id))).toBe(false); // neue Skills (Pool groß genug)
    expect(new Set(r.skillOffer).size).toBe(r.skillOffer.length);
    for (const id of r.skillOffer) expect(isLegendarySkill(id) ? !(id in r.skillOfferTiers) : Number.isInteger(r.skillOfferTiers[id])).toBe(true);
    expect(r.rerollsSkill).toBe(opened.rerollsSkill - 1);
    expect(r.offerRerolls).toBe(1);
    // Gehaltene Skills kommen nicht zurück; ein zweiter Neuwurf würfelt wieder anders.
    expect(r.skillOffer.some((id) => r.skills.includes(id))).toBe(false);
    const r2 = reducer(r, { type: "REROLL_SKILL", rng });
    expect(r2.skillOffer).not.toEqual(r.skillOffer);
    expect(reducer({ ...opened, rerollsSkill: 0 }, { type: "REROLL_SKILL", rng })).toEqual({ ...opened, rerollsSkill: 0 }); // kein Token → No-Op
    // Ablehnen und Pick räumen die Symbole mit auf.
    expect(reducer(r, { type: "DECLINE_SKILL", rng }).skillOfferArchs).toBeNull();
    expect(reducer(r, { type: "PICK_SKILL", skillId: r.skillOffer[0], rng }).skillOfferArchs).toBeNull();
  });
  it("rerollDoorSkills: erschöpfte Fraktion → die aktuellen Skills kommen zurück, ganz leer → kein Angebot", () => {
    const firePool = SKILL_LIST.filter((s) => s.archetype === "fire" && !s.legendary).map((s) => s.id);
    const current = firePool.slice(0, 3);
    const owned = firePool.slice(3); // nur die drei aktuellen sind noch frei
    const r = rerollDoorSkills(["fire", "fire", "fire"], owned, current, makeRng(1), makeRng(2), { legendaryChance: 0 });
    expect([...r.offer].sort()).toEqual([...current].sort());
    expect(rerollDoorSkills(["fire"], firePool, [], makeRng(1), makeRng(2), { legendaryChance: 0 })).toEqual({ offer: [], tiers: {} });
  });
  it("Ablehnen vor den Türen → Perk-Angebot (nie verschwendet); Türen und Angebot sind danach leer", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(4) });
    const d = reducer(s, { type: "DECLINE_SKILL", rng });
    expect(d.skillDoors).toBeNull();
    expect(d.skillOffer).toBeNull();
    expect(d.offer && d.offer.length).toBeGreaterThan(0);
  });
  it("Dev-Run mit Voll-Katalog zeigt weiter das flache Angebot (keine Türen)", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), dev: { rounds: 40, schedule: [], cover: 10, energy: 4 } });
    expect(s.devMode).toBe(true);
    expect(s.skillDoors).toBeNull();
    expect(s.skillOffer.length).toBe(Object.keys(SKILL_DEFS).length);
  });
  it("seed-adressiert: gleicher Seed → gleiche Türen, unabhängig vom injizierten rng", () => {
    const a = reducer(menuState(), { type: "START_RUN", rng: () => 0.1, seed: 4711 });
    const b = reducer(menuState(), { type: "START_RUN", rng: () => 0.9, seed: 4711 });
    expect(a.skillDoors).toEqual(b.skillDoors);
    expect(reducer(menuState(), { type: "START_RUN", rng: () => 0.1, seed: 4712 }).skillDoors).not.toEqual(a.skillDoors);
  });
  it("Engine: das Rundenende einer Skill-Phase stellt zwei Türen; der Türwurf hängt am adressierten Strom", () => {
    const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
    const identity = () => Array.from({ length: 40 }, (_, i) => i);
    const base = () => ({ ...initialState(makeRng(1), 555), deck: constDeck(10), oppDeck: constDeck(1), playerOrder: identity(), oppOrder: identity(),
      devSchedule: ["skill", "skill", "perk"], maxCycles: 3 });
    let s = base();
    for (let k = 0; k < TRICKS_PER_CYCLE; k++) { if (s.phase !== "play") s = { ...s, phase: "play" }; s = resolveTrick(s, makeRng(9)); }
    expect(s.phase).toBe("levelup");
    expect(s.skillDoors).toHaveLength(2);
    expect(s.skillOffer).toBeNull();
    let t = base();
    for (let k = 0; k < TRICKS_PER_CYCLE; k++) { if (t.phase !== "play") t = { ...t, phase: "play" }; t = resolveTrick(t, makeRng(3)); }
    expect(t.skillDoors).toEqual(s.skillDoors); // Seed adressiert, nicht der Stich-rng
  });
});

describe("Sim — jede Policy geht durch die Türstufe", () => {
  it("random / faction / fixed spielen einen ganzen Lauf; die Fraktions-Policy hält nur ihre Fraktion", () => {
    const r = runOne(11, randomPolicy());
    expect(r.build.skills.length).toBeGreaterThan(0);
    const f = runOne(11, factionPolicy("lightning", { architectGreedy: false }));
    expect(f.build.skills.every((id) => archetypeOf(id) === "lightning")).toBe(true);
    expect(f.build.skills.length).toBeGreaterThan(3);
    const x = runOne(11, fixedPolicy(["SK_FIRE_06", "SK_LIGHTNING_07"]));
    expect(x.build.skills.length).toBeGreaterThan(0);
    expect(runOne(11, fixedPolicy(["SK_FIRE_06"])).score).toBe(runOne(11, fixedPolicy(["SK_FIRE_06"])).score); // deterministisch
  });
  it("fixedPolicy exclude: die genannten Skills werden nie gehalten (Motor-Diagnose „ohne Verstärker“)", () => {
    const RATE = ["SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_05"];
    for (const seed of [1, 2, 3]) {
      const r = runOne(seed, fixedPolicy(["SK_FIRE_06", "SK_FIRE_07"], { exclude: RATE }), null, null, { archetypes: ["fire"] });
      expect(r.build.skills.length).toBeGreaterThan(3);
      expect(r.build.skills.some((id) => RATE.includes(id))).toBe(false);
    }
  });
});

describe("Stufentexte — ein Text je Stufe (descTiers, ability.<id>.desc.<t>, skillDef(id, tier))", () => {
  const tiered = SKILL_LIST.filter((s) => !s.legendary && ["fire", "lightning"].includes(s.archetype));
  it("jeder Blitz- und Feuer-Skill trägt vier Stufentexte; `desc` ist der Normal-Text; Legendäre haben keine", () => {
    expect(tiered).toHaveLength(30);
    for (const s of tiered) {
      expect(Array.isArray(s.descTiers) && s.descTiers.length === 4, s.id).toBe(true);
      for (const text of s.descTiers) expect(typeof text === "string" && text.length > 0, s.id).toBe(true);
      expect(s.desc).toBe(s.descTiers[0]);
      expect(new Set(s.descTiers).size, `${s.id}: Stufen ohne Unterschied im Text`).toBeGreaterThan(1);
      for (const text of s.descTiers) expect(text, `${s.id}: keine Leiter im Stufentext`).not.toMatch(/\bSelten\b|\bEpisch\b|Sehr selten/);
    }
    for (const s of SKILL_LIST.filter((x) => x.legendary)) expect(s.descTiers).toBeUndefined();
  });
  it("Episch-Extras stehen nur im Episch-Text", () => {
    expect(SKILL_DEFS.SK_LIGHTNING_01.descTiers[3]).toContain("Ladung über der Leiste bleibt erhalten");
    expect(SKILL_DEFS.SK_LIGHTNING_01.descTiers[2]).not.toContain("bleibt erhalten");
    expect(SKILL_DEFS.SK_LIGHTNING_07.descTiers[3]).toContain("Ab Serie 8 gibt jeder Sieg +1 Ladung");
    expect(SKILL_DEFS.SK_LIGHTNING_07.descTiers[0]).not.toContain("Ab Serie");
    expect(SKILL_DEFS.SK_FIRE_04.descTiers[3]).toBe("Niederlagen kühlen die Hitze nicht.");
    expect(SKILL_DEFS.SK_FIRE_16.descTiers[3]).toContain("Schmiedewert zählt doppelt");
    expect(SKILL_DEFS.SK_FIRE_16.descTiers[1]).not.toContain("Schmiedewert");
  });
  it("Katalog: ability.<id>.desc.<t> für jede Stufe; skillDef(id, tier) liefert genau diesen Text, ohne Stufe den Normal-Text", () => {
    for (const s of tiered) {
      for (let t = 0; t < 4; t++) {
        expect(de[`ability.${s.id}.desc.${t}`]).toBe(s.descTiers[t]);
        expect(skillDef(s.id, t).desc).toBe(s.descTiers[t]);
      }
      expect(skillDef(s.id).desc).toBe(s.descTiers[0]);
      expect(skillDef(s.id, null).desc).toBe(s.descTiers[0]);
    }
    expect(de["ability.SK_FIRE_L01.desc.0"]).toBeUndefined();
    expect(skillDef("SK_FIRE_L01", 2).desc).toBe(SKILL_DEFS.SK_FIRE_L01.desc); // Legendär: immer der eine Text
    expect(skillDef("SK_ICE_01", 3).desc).toBe(SKILL_DEFS.SK_ICE_01.desc);     // Eis: noch ohne Stufen → Normal-Text
  });
});
