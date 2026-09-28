import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { buildSkillDoors, rerollDoorSkills, archetypeOf, isLegendarySkill, SKILL_DEFS, SKILL_LIST, TIER_EPIC } from "../src/game/skills.js";
import { SKILL_DOORS, SKILL_DOOR_SIZE, SKILL_DOOR_FACTIONS, SKILL_OFFER_ARCHETYPES, TRICKS_PER_CYCLE } from "../src/game/constants.js";
import { GLOSSARY } from "../src/game/glossary.js";
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
  it("Konstanten: 2 Türen à 3 Skills aus ≤ 2 Fraktionen; der exp-Pool sind alle fünf Fraktionen", () => {
    expect(SKILL_DOORS).toBe(2);
    expect(SKILL_DOOR_SIZE).toBe(3);
    expect(SKILL_DOOR_FACTIONS).toBe(2);
    // §5.4: Eis hat Stufen und ist dazugekommen · 2026-09-27 (Owner): Prisma kommt ins Angebot (haltungen-fraktion.md §3.2)
    expect([...SKILL_OFFER_ARCHETYPES].sort()).toEqual(["fire", "ice", "lightning", "plant", "stance"]);
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

/* ============================================================================
   Gehaltene Fraktionen: Zusicherung und Sperre (Owner 2026-09-28)

   Zwei Regeln, die zusammen den Deckbau tragen. Jede GEHALTENE Fraktion steht mit mindestens einem
   Skill im Angebot — über beide Türen gerechnet, weil vier Fraktionen nie auf eine Tür passen. Und ab
   drei gehaltenen zieht das Angebot nur noch aus ihnen; die vierte kommt über den bezahlten Fokus-Ruf.
   ============================================================================ */
const ALL5 = [...SKILL_OFFER_ARCHETYPES];
// Ein Skill je Fraktion, damit ein Stand „hält diese Fraktionen" ohne den halben Pool zu belegen.
const einSkillJe = (archs) => archs.map((a) => SKILL_LIST.find((s) => s.archetype === a && !s.legendary).id);

describe("Türen · gehaltene Fraktionen", () => {
  it("jede gehaltene Fraktion steht in JEDEM Angebot, von einer bis vier", () => {
    for (let n = 1; n <= 4; n++) {
      const archs = ALL5.slice(0, n);
      for (let seed = 1; seed <= 40; seed++) {
        const doors = doorsAt(seed, einSkillJe(archs), archs);
        const imAngebot = archsOf(doors.flatMap((d) => d.skills));
        for (const a of archs) expect(imAngebot, `n=${n} seed=${seed}: ${a} fehlt`).toContain(a);
      }
    }
  });

  it("vier gehaltene gehen über zwei Türen genau auf: je Tür zwei, keine Tür über ihrer Grenze", () => {
    const archs = ALL5.slice(0, 4);
    for (let seed = 1; seed <= 40; seed++) {
      const doors = doorsAt(seed, einSkillJe(archs), archs);
      expect(doors).toHaveLength(SKILL_DOORS);
      for (const d of doors) expect(archsOf(d.skills).size).toBeLessThanOrEqual(SKILL_DOOR_FACTIONS);
      expect(archsOf(doors.flatMap((d) => d.skills))).toEqual(new Set(archs));
    }
  });

  it("ab DREI gehaltenen ist das Angebot zu; bei ZWEI kommt weiter Fremdes dazu", () => {
    const drei = ALL5.slice(0, 3);
    for (let seed = 1; seed <= 40; seed++) {
      const zu = doorsAt(seed, einSkillJe(drei), drei).flatMap((d) => d.skills);
      for (const id of zu) expect(drei, `seed=${seed}: ${archetypeOf(id)} ist fremd`).toContain(archetypeOf(id));
    }
    /* Die Gegenprobe zur Sperre: bei zwei gehaltenen muss noch etwas Fremdes durchkommen, sonst läge
       die Grenze in Wahrheit bei zwei und der Test darüber wäre trotzdem grün. */
    const zwei = ALL5.slice(0, 2);
    const fremd = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      for (const id of doorsAt(seed, einSkillJe(zwei), zwei).flatMap((d) => d.skills)) {
        if (!zwei.includes(archetypeOf(id))) fremd.add(archetypeOf(id));
      }
    }
    expect(fremd.size, "bei zwei gehaltenen darf eine dritte Fraktion erscheinen").toBeGreaterThan(0);
  });

  it("ohne gehaltene Fraktion zieht das Erstangebot frei aus der ganzen Welt", () => {
    const gesehen = new Set();
    for (let seed = 1; seed <= 60; seed++) for (const id of doorsAt(seed).flatMap((d) => d.skills)) gesehen.add(archetypeOf(id));
    expect(gesehen).toEqual(new Set(ALL5));
  });

  it("mehr Zusicherungen als Plätze: eine fällt weg, keine Tür wird überladen", () => {
    /* Nur über die Dev-Run-Regeln erreichbar (maxArchetypes bis fünf): fünf gehaltene Fraktionen, aber
       zwei Türen à höchstens zwei. Vier passen, die fünfte nicht — und dann muss sie wegfallen, statt
       eine Tür über ihre Fraktionsgrenze zu schieben. Sonst zeigte eine Tür drei Symbole aus drei
       Fraktionen, was die Türregel selbst bricht. */
    for (let seed = 1; seed <= 30; seed++) {
      const doors = doorsAt(seed, einSkillJe(ALL5), ALL5, { maxArchetypes: ALL5.length });
      for (const d of doors) expect(archsOf(d.skills).size, `seed=${seed}: Tür überladen`).toBeLessThanOrEqual(SKILL_DOOR_FACTIONS);
      expect(archsOf(doors.flatMap((d) => d.skills)).size, `seed=${seed}`).toBe(SKILL_DOORS * SKILL_DOOR_FACTIONS);
    }
  });

  it("eine leergespielte Fraktion sichert nichts zu und wirft nichts um", () => {
    // Feuer ist komplett gehalten, Blitz nicht: Blitz muss stehen, Feuer kann gar nicht mehr.
    const feuerAlle = SKILL_LIST.filter((s) => s.archetype === "fire").map((s) => s.id);
    const owned = [...feuerAlle, ...einSkillJe(["lightning"])];
    for (let seed = 1; seed <= 30; seed++) {
      const doors = doorsAt(seed, owned, ["fire", "lightning"]);
      const imAngebot = archsOf(doors.flatMap((d) => d.skills));
      expect(imAngebot, `seed=${seed}`).toContain("lightning");
      expect(imAngebot, "Feuer hat nichts mehr").not.toContain("fire");
    }
  });

  it("im ECHTEN Lauf gemessen, nicht am gesetzten Feld", () => {
    /* Ein gebauter Stand beweist nur den Baustein. Hier läuft ein Lauf: START_RUN, Stich für Stich,
       in jeder Skill-Phase wird wirklich eine Tür geöffnet und ein Skill genommen — und geprüft wird
       an dem, was `state.skillDoors` danach trägt. */
    const weiter = (s) => {
      let g = 0;
      while (g++ < 2000 && s.phase !== "gameover" && !(s.phase === "levelup" && s.skillDoors)) {
        if (s.phase !== "play") s = { ...s, phase: "play" };   // Perk-/Aufstell-/Architektphase überspringen
        s = resolveTrick(s, makeRng(g));
      }
      return s;
    };
    let s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), seed: 2026 });
    let maxGehalten = 0;
    for (let phase = 0; phase < 12 && s.skillDoors; phase++) {
      const held = s.activeArchetypes || [];
      const imAngebot = archsOf(s.skillDoors.flatMap((d) => d.skills));
      for (const a of held) expect(imAngebot, `Phase ${phase}: ${a} gehalten, aber nicht angeboten`).toContain(a);
      if (held.length >= 3) for (const a of imAngebot) expect(held, `Phase ${phase}: ${a} ist fremd`).toContain(a);
      maxGehalten = Math.max(maxGehalten, held.length);
      // Breit bauen: die Tür mit den meisten noch nicht gehaltenen Fraktionen, darin ein neuer Skill.
      const rang = (d) => d.skills.filter((id) => !held.includes(archetypeOf(id))).length;
      const idx = s.skillDoors.map((d, i) => i).sort((a, b) => rang(s.skillDoors[b]) - rang(s.skillDoors[a]))[0];
      const opened = reducer(s, { type: "CHOOSE_DOOR", index: idx });
      const neu = opened.skillOffer.find((id) => !held.includes(archetypeOf(id))) || opened.skillOffer[0];
      s = weiter(reducer(opened, { type: "PICK_SKILL", skillId: neu, rng: makeRng(phase + 50) }));
    }
    expect(maxGehalten, "der Lauf hat die Sperre nie erreicht, der Test prüft dann zu wenig").toBeGreaterThanOrEqual(3);
  });
});

describe("Fokus-Ruf · der einzige Weg zur vierten Fraktion", () => {
  // Ein zusammenhängender Stand: die Türen sind für GENAU diese gehaltenen Fraktionen gewürfelt,
  // sonst zeigte der Startwurf noch die ganze Welt und die Sperre wäre nicht die, die geprüft wird.
  const mitMuenzen = (archs, coins = 20) => {
    const s0 = reducer(menuState(), { type: "START_RUN", rng: makeRng(3), seed: 99 });
    const owned = einSkillJe(archs);
    return { ...s0, coins, skills: owned, activeArchetypes: archs,
             skillDoors: buildSkillDoors(owned, archs, makeRng(7), makeRng(8)) };
  };

  it("holt bei DREI gehaltenen die vierte, die das Angebot selbst nicht mehr zeigt", () => {
    const drei = ALL5.slice(0, 3);
    const vierte = ALL5[3];
    const s = mitMuenzen(drei);
    expect(archsOf(s.skillDoors.flatMap((d) => d.skills))).not.toContain(vierte); // gesperrt …
    const r = reducer(s, { type: "CALL_FOCUS", arch: vierte });
    expect(r.skillDoors).toHaveLength(s.skillDoors.length + 1);                    // … der Ruf kommt trotzdem durch
    expect(archsOf(r.skillDoors[r.skillDoors.length - 1].skills)).toEqual(new Set([vierte]));
    expect(r.coins).toBe(s.coins - 10);
  });

  it("bei VIER gehaltenen nur noch die gehaltenen, und der Fehlruf kostet nichts", () => {
    const vier = ALL5.slice(0, 4);
    const s = mitMuenzen(vier);
    expect(reducer(s, { type: "CALL_FOCUS", arch: ALL5[4] }), "die fünfte ginge über die Obergrenze").toBe(s);
    const ok = reducer(s, { type: "CALL_FOCUS", arch: vier[0] });
    expect(ok.skillDoors).toHaveLength(s.skillDoors.length + 1);
    expect(ok.coins).toBe(s.coins - 10);
  });

  it("ruft nie aus einer Fraktion, die dieser Lauf gar nicht führt", () => {
    const s = { ...mitMuenzen(["fire"]), unlockedArchetypes: ["fire", "lightning"] };
    expect(reducer(s, { type: "CALL_FOCUS", arch: "ice" }), "Eis ist in diesem Lauf nicht freigeschaltet").toBe(s);
    expect(reducer(s, { type: "CALL_FOCUS", arch: "lightning" }).skillDoors).toHaveLength(s.skillDoors.length + 1);
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
  /* Owner 2026-09-08: der Neuwurf gilt jetzt auf BEIDEN Stufen. Auf der Türstufe würfelt er die Türen, nach
     dem Öffnen die drei Skills dahinter — dieselbe Ressource, dieselbe Preistreppe. Vorher war er vor den
     Türen ein No-Op; diese Zusicherung ist mit der Regel gefallen und steht jetzt als eigener Test darunter. */
  it("Neuwurf würfelt die drei Skills der geöffneten Tür neu — gleiche Symbole, neue Skills und Stufen — und kostet Münzen", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(3), seed: 99 });
    /* Gratis-Neuwürfe gibt es seit dem Owner-Entscheid 2026-09-08 nicht mehr (BASE_REROLLS 0): der Neuwurf ist
       eine Ausgabe der Münz-Ökonomie. Ein Lauf startet also ohne Token UND ohne Münzen — das Konto wird hier
       gesetzt, sonst wäre jeder Aufruf ein No-Op und der Test prüfte nichts. */
    const opened = { ...reducer(s, { type: "CHOOSE_DOOR", index: 0 }), coins: 30 };
    expect(opened.skillOfferArchs).toEqual(opened.skillOffer.map(archetypeOf));
    const r = reducer(opened, { type: "REROLL_SKILL", rng });
    expect(r.skillDoors).toBeNull();
    expect(r.skillOffer).toHaveLength(opened.skillOffer.length);
    expect(r.skillOffer.map(archetypeOf)).toEqual(opened.skillOfferArchs); // dieselben Fraktionssymbole je Platz
    expect(r.skillOffer.some((id) => opened.skillOffer.includes(id))).toBe(false); // neue Skills (Pool groß genug)
    expect(new Set(r.skillOffer).size).toBe(r.skillOffer.length);
    for (const id of r.skillOffer) expect(isLegendarySkill(id) ? !(id in r.skillOfferTiers) : Number.isInteger(r.skillOfferTiers[id])).toBe(true);
    expect(r.coins).toBe(27);        // Grundpreis 3 …
    expect(r.coinRerolls).toBe(1);
    expect(r.offerRerolls).toBe(1);
    // Gehaltene Skills kommen nicht zurück; ein zweiter Neuwurf würfelt wieder anders — und kostet mehr.
    expect(r.skillOffer.some((id) => r.skills.includes(id))).toBe(false);
    const r2 = reducer(r, { type: "REROLL_SKILL", rng });
    expect(r2.skillOffer).not.toEqual(r.skillOffer);
    expect(r2.coins).toBe(21);       // … dann 6: die Preistreppe verdoppelt je Kauf in derselben Phase
    const broke = { ...opened, rerollsSkill: 0, coins: 0 };
    expect(reducer(broke, { type: "REROLL_SKILL", rng })).toEqual(broke); // weder Token noch Münzen → No-Op
    // Ablehnen und Pick räumen die Symbole mit auf.
    expect(reducer(r, { type: "DECLINE_SKILL", rng }).skillOfferArchs).toBeNull();
    expect(reducer(r, { type: "PICK_SKILL", skillId: r.skillOffer[0], rng }).skillOfferArchs).toBeNull();
  });
  it("auf der TÜRSTUFE würfelt derselbe Neuwurf die Türen — gleiche Ressource, gerufene Tür bleibt", () => {
    const s0 = reducer(menuState(), { type: "START_RUN", rng: makeRng(3), seed: 99 });
    expect(s0.skillDoors).toHaveLength(2);
    const s = { ...s0, coins: 30 };                               // ein Lauf startet ohne Token und ohne Münzen
    const r = reducer(s, { type: "REROLL_SKILL", rng });
    expect(r.skillOffer).toBeNull();                              // immer noch die Türstufe
    expect(r.skillDoors).toHaveLength(2);
    expect(r.skillDoors.map((d) => d.skills)).not.toEqual(s.skillDoors.map((d) => d.skills));
    expect(r.coins).toBe(27);                                     // dieselbe Preistreppe wie im Angebot
    expect(r.coinRerolls).toBe(1);
    expect(r.offerRerolls).toBe(1);
    // Ohne Token UND ohne Münzen bleibt er wirkungslos.
    const broke = { ...s0, rerollsSkill: 0, coins: 0 };
    expect(reducer(broke, { type: "REROLL_SKILL", rng })).toBe(broke);
    // Der Grundpreis ist 3 — und NIE der Legendär-Preis: was hinter einer Tür liegt, ist verdeckt.
    const paid = reducer({ ...s0, rerollsSkill: 0, coins: 10 }, { type: "REROLL_SKILL", rng });
    expect(paid.coins).toBe(7);
    expect(paid.coinRerolls).toBe(1);
    // Eine gerufene Tür ist einzeln bezahlt und überlebt den Neuwurf.
    const called = reducer({ ...s0, coins: 20 }, { type: "CALL_FOCUS", arch: "ice" });
    expect(called.skillDoors).toHaveLength(3);
    const afterR = reducer(called, { type: "REROLL_SKILL", rng });
    expect(afterR.skillDoors).toHaveLength(3);
    expect(afterR.skillDoors.filter((d) => d.called)).toEqual(called.skillDoors.filter((d) => d.called));
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
    const RATE = ["SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_05"]; // §7.23: SK_FIRE_01 ist Feuerlinie, kein Verstärker mehr
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
    expect(tiered).toHaveLength(30); // 15 Blitz (§7.69: Potenzial) + 15 Feuer (§7.70: Brandherd)
    for (const s of tiered) {
      expect(Array.isArray(s.descTiers) && s.descTiers.length === 4, s.id).toBe(true);
      for (const text of s.descTiers) expect(typeof text === "string" && text.length > 0, s.id).toBe(true);
      expect(s.desc).toBe(s.descTiers[0]);
      /* §7.63: VIER verschiedene Texte, nicht bloß mehr als einer. Ein Stufenschritt, der den Text nicht ändert,
         ist ein Schritt, für den der Spieler zahlt und nichts bekommt. Beim Kürzen der Streuung wäre genau das
         passiert (Leiter 1/1/2/3 mit einem Anhang nur auf Episch → Normal und Selten wortgleich); gemessen halten
         alle 58 gestuften Skills die schärfere Bedingung bereits. */
      expect(new Set(s.descTiers).size, `${s.id}: zwei Stufen mit demselben Text`).toBe(4);
      for (const text of s.descTiers) expect(text, `${s.id}: keine Leiter im Stufentext`).not.toMatch(/\bSelten\b|\bEpisch\b|Sehr selten/);
    }
    for (const s of SKILL_LIST.filter((x) => x.legendary)) expect(s.descTiers).toBeUndefined();
  });

  /* Owner-Regel: kein Strich als SATZZEICHEN in spieler-sichtbarem Text — er hängt einen Halbsatz an, statt
     einen Satz zu bilden, und genau das macht Kartentexte lang. Bis-Striche bleiben erlaubt und sind hier
     die Mehrheit („Werte 1–10", „Stufe I–IV"): unterschieden wird über die Leerzeichen, nicht über das
     Zeichen. Gilt für alle 70 Skills und das Glossar, das seine Texte in dieselben Karten schreibt. */
  it("kein Gedankenstrich in Skill- und Glossartexten (Bis-Striche wie 1–10 bleiben)", () => {
    const SATZSTRICH = /\s[—–-]\s/;
    const treffer = [];
    for (const s of SKILL_LIST)
      for (const [i, t] of (s.descTiers || [s.desc]).entries())
        if (SATZSTRICH.test(t)) treffer.push(`${s.id}[${i}]`);
    for (const [id, e] of Object.entries(GLOSSARY))
      for (const f of ["label", "text"]) if (e[f] && SATZSTRICH.test(e[f])) treffer.push(`glossary.${id}.${f}`);
    expect(treffer, `Strich als Satzzeichen: ${treffer.join(", ")}`).toEqual([]);
  });
  it("Episch-Extras stehen nur im Episch-Text", () => {
    /* §7.68 (Owner): „Sieg ohne Crit" gehört jetzt dem Lichtbogen — auf ALLEN vier Stufen, denn er ist der
       Kaltstart der Fraktion und nicht mehr ein Anhang am Crit-Skill. Der Blitzableiter darf das Wort nirgends
       mehr führen, sonst steht die Zeile wieder doppelt. Sein Episch-Extra ist der höhere Satz je Takt-Crit. */
    for (const t of SKILL_DEFS.SK_LIGHTNING_01.descTiers) expect(t).not.toContain("ohne Crit");
    expect(SKILL_DEFS.SK_LIGHTNING_01.descTiers[3]).toContain("+2 Ladung zusätzlich");
    expect(SKILL_DEFS.SK_LIGHTNING_01.descTiers[2]).toContain("+1 Ladung zusätzlich");
    for (const t of SKILL_DEFS.SK_LIGHTNING_04.descTiers) expect(t).toContain("Sieg ohne Crit gibt +1 Ladung");
    expect(SKILL_DEFS.SK_LIGHTNING_04.descTiers[3]).toContain("Bis zum ersten Crit eines Durchlaufs sind es +2");
    for (const i of [0, 1, 2]) expect(SKILL_DEFS.SK_LIGHTNING_04.descTiers[i]).not.toContain("Bis zum ersten Crit");
    /* §7.61: die Zündspannung hat ebenfalls kein Episch-Extra — sie hat DERSELBE Satz auf allen vier Stufen, nur
       die Zahlen wandern. Der Wächter hält den Bau des Textes fest (beide Hälften in jeder Stufe, sonst wäre eine
       davon still weggefallen) und dass das Wort „Serie" nicht zurückkommt: der alte Skill hing daran, und genau
       das war der Konstruktionsfehler (§7.55 B, die Serie ist ein Spätindikator). */
    for (const t of SKILL_DEFS.SK_LIGHTNING_07.descTiers) {
      expect(t).toMatch(/^Gewinnst du mit einer Karte, gibt sie \+[\d,]+ % Crit-Chance auf den Stich, je Stapel auf ihr [\d,]+ % weniger\. Jeder ihrer Stapel gibt dafür \+\d+ Basis-Score\.$/);
      expect(t).not.toContain("Serie");
    }
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
    // §5.3: Eis hat jetzt ebenfalls vier Stufen — die Episch-Zeile ist ein anderer Text als Normal.
    expect(skillDef("SK_ICE_01", 3).desc).toBe(SKILL_DEFS.SK_ICE_01.descTiers[3]);
    expect(skillDef("SK_ICE_01", 3).desc).not.toBe(SKILL_DEFS.SK_ICE_01.desc);
  });
});
