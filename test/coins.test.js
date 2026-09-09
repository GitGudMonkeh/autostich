/* Münz-Ökonomie (docs/muenz-oekonomie.md) — Einnahme und Auszahlungs-Naht.

   Die Tabelle in §2.2 ist der Vertrag, nicht die Formel: sie wird hier Zeile für Zeile geprüft, damit ein
   Tuning-Schritt an Sockel, Schrittweite oder Deckel sichtbar wird statt still durchzurutschen.
   Die zweite Gruppe prüft die NAHT — dass die Auszahlung die AUFSTELLUNG zählt und nicht die Siege, und
   dass der Filter greift: `formationskern`/`anker` liegen im selben Array und sind keine gebaute
   Formation. Ohne Filter liegt die Einnahme gemessen rund ein Drittel zu hoch. */
import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { coinsForFormations, COIN_CYCLE_BASE, COIN_FORM_PER, COIN_FORM_CAP, COIN_START, rerollPrice, rerollOffer,
         energyPrice, energyBuy, ENERGY_MAX_BUYS, coverPrice, coverBuy, COVER_CELLS,
         upgradePrice, MAX_SKILL_TIER, familyUpgradeBuy, MAX_FAMILY_TIER,
         unspentEnergyCoins, FORFEIT_SKILL, FORFEIT_PERK, FORFEIT_BUILD } from "../src/game/coins.js";
import { countBuiltFormations } from "../src/game/formations.js";
import { FAMILY_DEFS } from "../src/game/families.js";
import { isLegendarySkill, archetypeOf } from "../src/game/skills.js";
import { maxChargeFor } from "../src/game/factions/lightning.js";
import { tierTextDiff } from "../src/ui/SkillUpgrade.jsx";
import { TRICKS_PER_CYCLE } from "../src/game/constants.js";

const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scenario = (pVal, oVal, over = {}) => ({
  ...initialState(makeRng(1)),
  deck: constDeck(pVal), oppDeck: constDeck(oVal),
  playerOrder: identity(), oppOrder: identity(),
  ...over,
});
const rng = makeRng(9);

describe("Münz-Einnahme (§2.2)", () => {
  it("die Tabelle aus §2.2 — Sockel 2, je acht Formationen eine Münze, Deckel bei 6", () => {
    // Genau die Zeilen des Plans. Ändert jemand Sockel, Schritt oder Deckel, fällt DIESER Test, nicht
    // erst der Playtest. 18 Formationen sind der gemessene Median → 4 Münzen.
    expect([0, 8, 16, 18, 24, 32, 40, 80].map(coinsForFormations)).toEqual([2, 3, 4, 4, 5, 6, 6, 6]);
  });

  it("der Sockel zahlt auch ohne jede Formation, und nichts wird negativ", () => {
    expect(coinsForFormations(0)).toBe(COIN_CYCLE_BASE);
    expect(coinsForFormations(-5)).toBe(COIN_CYCLE_BASE);
    expect(coinsForFormations(COIN_FORM_PER - 1)).toBe(COIN_CYCLE_BASE); // erst der volle Schritt zahlt
    expect(coinsForFormations(COIN_FORM_PER)).toBe(COIN_CYCLE_BASE + 1);
  });

  it("der Deckel bindet — ein randvolles Brett zahlt nicht mehr als das Maximum", () => {
    // Gemessen: bis 145 Positions×Formations-Paare, bei mittlerer Länge 3,3 also ~48 distinkte.
    // Ungedeckelt wären das 8 Münzen statt 6 (§2.5).
    expect(coinsForFormations(48)).toBe(COIN_CYCLE_BASE + COIN_FORM_CAP);
    expect(coinsForFormations(999)).toBe(COIN_CYCLE_BASE + COIN_FORM_CAP);
  });
});

describe("Gebaute Formationen zählen (§2.2)", () => {
  const pos = (...types) => ({ mult: 1, formations: types.map((type) => ({ type, ordinal: 1 })) });

  it("zählt je Formation einmal, nicht je Position", () => {
    // Dieselbe Formation über drei Positionen: ordinal 1 nur am Anfang.
    const board = [
      { mult: 1, formations: [{ type: "treppe", ordinal: 1 }] },
      { mult: 1, formations: [{ type: "treppe", ordinal: 2 }] },
      { mult: 1, formations: [{ type: "treppe", ordinal: 3 }] },
    ];
    expect(countBuiltFormations(board)).toBe(1);
  });

  it("filtert Architektur und Anker heraus — sie sind keine gebaute Formation", () => {
    const board = [pos("wiederholung", "formationskern", "anker"), pos("farbblock")];
    expect(countBuiltFormations(board)).toBe(2); // nur Wiederholung + Farbblock
  });

  it("alle vier echten Typen zählen", () => {
    expect(countBuiltFormations([pos("wiederholung"), pos("farbblock"), pos("treppe"), pos("wechsel")])).toBe(4);
  });

  it("leeres oder fehlendes Brett zählt null", () => {
    expect(countBuiltFormations([])).toBe(0);
    expect(countBuiltFormations(null)).toBe(0);
  });
});

describe("Auszahlung am Durchlaufende (§2.2, Naht)", () => {
  // Ein Brett mit n gebauten Formationen: n Positionen, je eine Formation mit ordinal 1.
  const boardWith = (n) => Array.from({ length: 40 }, (_, i) =>
    (i < n ? { mult: 1, formations: [{ type: "wiederholung", ordinal: 1 }] } : { mult: 1, formations: [] }));
  // Schlussstich eines Durchlaufs (pos = TRICKS_PER_CYCLE − 1); dort fällt die Auszahlung.
  const endOfCycle = (forms, over = {}) =>
    resolveTrick(scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, formations: boardWith(forms), ...over }), rng);

  it("zahlt aus der AUFSTELLUNG dieses Durchlaufs, nicht aus den Siegen", () => {
    const s = endOfCycle(18, { cycleWins: 39 }); // 18 Formationen (Median) trotz fast perfekter Siegzahl
    expect(s.lastCycleForms).toBe(18);
    expect(s.lastCycleCoins).toBe(4);
    expect(s.coins).toBe(COIN_START + 4);
  });

  it("die Siegzahl ändert die Einnahme nicht", () => {
    expect(endOfCycle(18, { cycleWins: 5 }).lastCycleCoins).toBe(endOfCycle(18, { cycleWins: 39 }).lastCycleCoins);
  });

  it("der Kontostand summiert über die Durchläufe", () => {
    const first = endOfCycle(18);                          // +4
    const second = endOfCycle(32, { coins: first.coins });  // +6, der Deckel
    expect(second.lastCycleCoins).toBe(6);
    expect(second.coins).toBe(COIN_START + 4 + 6);
  });

  it("ein leeres Brett zahlt den Sockel, nie null", () => {
    const s = endOfCycle(0, { coins: 7 });
    expect(s.lastCycleCoins).toBe(COIN_CYCLE_BASE);
    expect(s.coins).toBe(7 + COIN_CYCLE_BASE);
  });

  it("mitten im Durchlauf wird nicht ausgezahlt", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 5, formations: boardWith(18) }), rng);
    expect(s.coins).toBe(COIN_START);
    expect(s.lastCycleCoins).toBe(null);
  });

  it("Startbetrag (§2.1): ein frischer Lauf beginnt mit dem Sockel in der Kasse", () => {
    expect(initialState(makeRng(1)).coins).toBe(COIN_START);
  });
});

/* ---- Verzicht zahlt (§2.3) ----------------------------------------------------------------------
   Die zweite Einnahmeart, und die einzige, die der Spieler selbst auslöst. Geprüft wird jede der vier
   Quellen an ihrer Naht im Reducer — die Beträge stehen im Plan und sind Owner-Entscheide, also fällt
   ein Tuning-Schritt hier auf und nicht erst im Playtest. */
describe("Verzicht zahlt (§2.3)", () => {
  const atSkill = (over = {}) => ({
    ...initialState(makeRng(1), 7),
    phase: "levelup",
    skillOffer: ["SK_FIRE_01", "SK_LIGHTNING_01", "SK_FIRE_02"],
    skillOfferTiers: { SK_FIRE_01: 0, SK_LIGHTNING_01: 0, SK_FIRE_02: 0 },
    skillOfferArchs: ["fire", "lightning", "fire"],
    ...over,
  });
  const atPerk = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "levelup", offer: ["P_A_01"], ...over });
  const inFormation = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "formation", formationEnergy: 3, ...over });
  const inArchitect = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "architect",
    architect: { buildings: [], offers: [], actedMain: false, winCounters: {}, phaseHistory: [], phaseAnchor: {} }, ...over });

  it("einen Skill ablehnen bringt 12", () => {
    const s = reducer(atSkill({ coins: 5 }), { type: "DECLINE_SKILL", rng: Math.random });
    expect(s.coins).toBe(17);
    expect(s.coinGain).toMatchObject({ n: FORFEIT_SKILL, source: "skill" });
  });

  it("auch der abgelehnte Meisterhand-Bonus zahlt — der Slot bleibt leer, der Verzicht ist derselbe", () => {
    // Der Bonus nimmt einen eigenen Ausgang im Reducer (kein Perk-Ersatz). Eine Zahlung, die an einem
    // der fünf Ausgänge fehlte, wäre für den Spieler nicht erklärbar.
    const s = reducer(atSkill({ coins: 0, skillOfferBonus: true }), { type: "DECLINE_SKILL", rng: Math.random });
    expect(s.coins).toBe(FORFEIT_SKILL);
    expect(s.skillOfferBonus).toBe(false);
  });

  it("einen Perk ablehnen bringt 6 — halb so viel wie ein Skill", () => {
    const s = reducer(atPerk({ coins: 5 }), { type: "DECLINE_PERK" });
    expect(s.coins).toBe(11);
    expect(FORFEIT_PERK * 2).toBe(FORFEIT_SKILL);
  });

  it("je übrige Formations-Energie eine Münze", () => {
    const s = reducer(inFormation({ coins: 0, formationEnergy: 3 }), { type: "CONFIRM_FORMATION" });
    expect(s.coins).toBe(3);
    expect(s.formationEnergy).toBe(0);
  });

  it("GEKAUFTE Energie zahlt nicht zurück — sonst wäre der Kauf ein Rabatt auf die Erstattung", () => {
    // Gekauft 2 für 3+6 Münzen, keine davon verbraucht: erstattet wird nur, was über die gekaufte
    // hinaus übrig bleibt. Sonst kauft man für 3 und bekommt 1 zurück.
    expect(unspentEnergyCoins(5, 2)).toBe(3);
    expect(unspentEnergyCoins(2, 2)).toBe(0);
    expect(unspentEnergyCoins(1, 2)).toBe(0);   // mehr verbraucht als Basis — nie negativ
    const s = reducer(inFormation({ coins: 0, formationEnergy: 5, coinEnergy: 2 }), { type: "CONFIRM_FORMATION" });
    expect(s.coins).toBe(3);
  });

  it("wer alle Energie verbraucht, bekommt nichts — und der Zustand bleibt derselbe Gegenstand", () => {
    const s = reducer(inFormation({ coins: 4, formationEnergy: 0 }), { type: "CONFIRM_FORMATION" });
    expect(s.coins).toBe(4);
    expect(s.coinGain).toBe(null);
  });

  it("eine Architekt-Phase ohne Gebäude und ohne Aufwertung bringt 6", () => {
    const s = reducer(inArchitect({ coins: 1 }), { type: "ARCHITECT_DONE" });
    expect(s.coins).toBe(1 + FORFEIT_BUILD);
  });

  it("wer gebaut oder ausgebaut hat, bekommt nichts — `actedMain` ist die Bedingung", () => {
    const acted = inArchitect({ coins: 1 });
    const s = reducer({ ...acted, architect: { ...acted.architect, actedMain: true } }, { type: "ARCHITECT_DONE" });
    expect(s.coins).toBe(1);
  });

  it("Versetzen und Abreißen kosten keinen Bauplan — die Phase zahlt trotzdem aus", () => {
    // Beide setzen `actedMain` bewusst nicht: sie ordnen um, sie verbrauchen nichts.
    const moved = inArchitect({ coins: 0 });
    const s = reducer({ ...moved, architect: { ...moved.architect, moved: true } }, { type: "ARCHITECT_DONE" });
    expect(s.coins).toBe(FORFEIT_BUILD);
  });

  it("`seq` zählt hoch, damit zweimal derselbe Betrag zwei Ereignisse sind", () => {
    // Ohne die laufende Nummer bliebe die Anzeige beim zweiten gleichen Betrag stumm — der React-`key`
    // sähe keinen Unterschied und startete das Aufblitzen nicht neu.
    const first = reducer(atPerk({ coins: 0 }), { type: "DECLINE_PERK" });
    const second = reducer(atPerk({ coins: first.coins, coinGain: first.coinGain }), { type: "DECLINE_PERK" });
    expect(second.coinGain.n).toBe(first.coinGain.n);
    expect(second.coinGain.seq).toBe(first.coinGain.seq + 1);
  });
});

describe("Neuwurf-Preistreppe (§3.1)", () => {
  it("zwei Grundpreise, EIN Zähler — Verdopplung je Kauf der Phase", () => {
    expect([0, 1, 2, 3].map((n) => rerollPrice(n, false))).toEqual([3, 6, 12, 24]);
    expect([0, 1, 2, 3].map((n) => rerollPrice(n, true))).toEqual([15, 30, 60, 120]);
  });

  it("Mischen ist nicht billiger als Durchhalten: nach einem normalen Kauf kostet der legendäre 30", () => {
    // Der Zähler ist gemeinsam, der Grundpreis kommt aus der Art. Wer erst normal (3) würfelt und dann
    // legendär, zahlt beim zweiten Kauf 30 — nicht wieder den Grundpreis 15.
    expect(rerollPrice(1, true)).toBe(30);
    expect(rerollPrice(1, true)).toBeGreaterThan(rerollPrice(0, true));
  });

  it("solange Gratis-Neuwürfe da sind, ist der Neuwurf gratis und NICHT der Legendär-Wurf", () => {
    // Die Legendär-Garantie hängt am Kauf, nicht am Angebot — sonst zöge der Gratis-Pool sie mit.
    const r = rerollOffer({ coins: 0, coinRerolls: 0 }, 2, true);
    expect(r).toMatchObject({ free: true, tokens: 2, price: 0, legendary: false, can: true });
  });

  /* Owner-Playtest 2026-09-08: die Preise waren gebaut, aber unsichtbar — mit zwei Gratis-Würfen je Lauf
     und Pool zeigte der Knopf die ersten beiden Male nur die Anzahl. Deshalb trägt `rerollOffer` jetzt
     IMMER den Preis des nächsten BEZAHLTEN Wurfs, auch solange gratis gewürfelt wird. */
  it("der Preis des nächsten bezahlten Wurfs steht auch dann fest, wenn noch gratis gewürfelt wird", () => {
    const free = rerollOffer({ coins: 0, coinRerolls: 0 }, 2, false);
    expect(free.price).toBe(0);        // DIESER Klick kostet nichts …
    expect(free.nextPrice).toBe(3);    // … der nächste bezahlte kostet 3
  });

  it("die Vorschau rechnet mit der Legendär-Basis, wenn ein Legendäres im Angebot liegt", () => {
    // Sonst verspräche der Knopf 3, wo beim ersten Kauf 15 fällig werden.
    expect(rerollOffer({ coins: 0, coinRerolls: 0 }, 2, true).nextPrice).toBe(15);
    // Die Treppe steckt auch in der Vorschau: nach einem Kauf zeigt sie den nächsten Schritt.
    expect(rerollOffer({ coins: 0, coinRerolls: 1 }, 1, false).nextPrice).toBe(6);
  });

  it("ohne Münzen ist der Kauf sichtbar, aber nicht auslösbar", () => {
    expect(rerollOffer({ coins: 2, coinRerolls: 0 }, 0, false)).toMatchObject({ free: false, price: 3, can: false });
    expect(rerollOffer({ coins: 3, coinRerolls: 0 }, 0, false)).toMatchObject({ free: false, price: 3, can: true });
  });
});

describe("Neuwurf-Kauf im Reducer (§3.1)", () => {
  // Skill-Phase mit geöffneter Tür und leerem Gratis-Pool: der Neuwurf ist jetzt käuflich.
  const atOffer = (over = {}) => ({
    ...initialState(makeRng(1), 7),
    phase: "levelup", rerollsSkill: 0,
    skillOffer: ["SK_FIRE_01", "SK_LIGHTNING_01", "SK_FIRE_02"],
    skillOfferTiers: { SK_FIRE_01: 0, SK_LIGHTNING_01: 0, SK_FIRE_02: 0 },
    skillOfferArchs: ["fire", "lightning", "fire"],
    ...over,
  });

  it("der Kauf zieht den Preis ab und schiebt die Treppe eine Stufe hoch", () => {
    const s1 = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(s1.coins).toBe(27);          // 30 − 3
    expect(s1.coinRerolls).toBe(1);
    const s2 = reducer(s1, { type: "REROLL_SKILL" });
    expect(s2.coins).toBe(21);          // 27 − 6
    expect(s2.coinRerolls).toBe(2);
  });

  it("die Gratis-Pools bleiben unberührt — der Kauf legt seinen Neuwurf auf denselben Weg", () => {
    const s = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(s.rerollsSkill).toBe(0);
    const free = reducer(atOffer({ coins: 30, rerollsSkill: 2 }), { type: "REROLL_SKILL" });
    expect(free.rerollsSkill).toBe(1);  // erst der Pool …
    expect(free.coins).toBe(30);        // … und der kostet nichts
    expect(free.coinRerolls).toBe(0);
  });

  it("ohne genug Münzen passiert nichts", () => {
    const before = atOffer({ coins: 2 });
    expect(reducer(before, { type: "REROLL_SKILL" })).toBe(before);
  });

  it("der gekaufte Legendär-Neuwurf kostet 15 und bringt wieder ein Legendäres — ein anderes", () => {
    const withLeg = atOffer({ coins: 40, skillOffer: ["SK_FIRE_L01", "SK_LIGHTNING_01", "SK_FIRE_02"],
      skillOfferTiers: { SK_LIGHTNING_01: 0, SK_FIRE_02: 0 } });
    const s = reducer(withLeg, { type: "REROLL_SKILL" });
    expect(s.coins).toBe(25);                                        // 40 − 15, nicht − 3
    expect(s.skillOffer.some(isLegendarySkill)).toBe(true);          // Garantie
    expect(s.skillOffer).not.toContain("SK_FIRE_L01");               // nicht dasselbe wie das gezeigte
  });

  it("die Treppe läuft je Phase — ein neuer Durchlauf setzt sie zurück", () => {
    const spent = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(spent.coinRerolls).toBe(1);
    const nextPhase = resolveTrick({ ...scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, coinRerolls: spent.coinRerolls }) }, rng);
    expect(nextPhase.coinRerolls).toBe(0);
  });
});

/* ---- Energie (§3.2) und Baufeld (§3.4) ---------------------------------------------------------- */
describe("Energie in der Aufstellphase (§3.2)", () => {
  const inFormation = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "formation", formationEnergy: 4, ...over });

  it("Preis 3 dann 6, höchstens zwei Käufe je Phase", () => {
    expect([0, 1].map(energyPrice)).toEqual([3, 6]);
    expect(ENERGY_MAX_BUYS).toBe(2);
    expect(energyBuy({ coins: 99, coinEnergy: 2 }).soldOut).toBe(true);
  });

  it("der Kauf hebt die LAUFENDE Energie, nicht die Basis", () => {
    const s = reducer(inFormation({ coins: 20 }), { type: "BUY_ENERGY" });
    expect(s.formationEnergy).toBe(5);
    expect(s.coins).toBe(17);
    expect(s.coinEnergy).toBe(1);
    // Die Basis bleibt unberührt — ein Kauf hier darf die nächste Aufstellphase nicht mitfinanzieren.
    expect(s.formationEnergyBase).toBe(inFormation().formationEnergyBase);
  });

  it("nach zwei Käufen ist Schluss, auch mit vollem Konto", () => {
    let s = reducer(inFormation({ coins: 99 }), { type: "BUY_ENERGY" });
    s = reducer(s, { type: "BUY_ENERGY" });
    expect(s.formationEnergy).toBe(6);
    expect(s.coins).toBe(90);                    // 99 − 3 − 6
    expect(reducer(s, { type: "BUY_ENERGY" })).toBe(s);
  });

  it("gekaufte Energie überlebt das Zurücksetzen — bezahlt ist bezahlt", () => {
    const bought = reducer(inFormation({ coins: 20 }), { type: "BUY_ENERGY" });
    const reset = reducer({ ...bought, formationSwaps: [] }, { type: "RESET_FORMATION" });
    expect(reset.formationEnergy).toBe(5);       // volle Basis 4 + der gekaufte Tausch
  });

  it("sie verfällt aber mit der Phase", () => {
    const next = resolveTrick(scenario(12, 0, { pos: 3, coinEnergy: 2 }), rng);
    expect(next.coinEnergy).toBe(0);
  });
});

describe("Baufeld-Zellen (§3.4)", () => {
  const inArchitect = (over = {}) => {
    const s = initialState(makeRng(1), 7);
    return { ...s, phase: "architect", ...over };
  };

  it("Preis 20 dann 40, genau zweimal je Lauf", () => {
    expect([0, 1].map(coverPrice)).toEqual([20, 40]);
    expect(coverBuy({ coins: 999, coverBuys: 2 }).soldOut).toBe(true);
  });

  it("der Kauf hebt maxCover dauerhaft und leert den Vorrat", () => {
    const start = inArchitect({ coins: 100 });
    const base = start.architect.maxCover;
    const s1 = reducer(start, { type: "BUY_COVER" });
    expect(s1.architect.maxCover).toBe(base + COVER_CELLS);
    expect(s1.coins).toBe(80);
    expect(coverBuy(s1).left).toBe(1);
    const s2 = reducer(s1, { type: "BUY_COVER" });
    expect(s2.architect.maxCover).toBe(base + 2 * COVER_CELLS);
    expect(s2.coins).toBe(40);                   // 80 − 40
    expect(reducer(s2, { type: "BUY_COVER" })).toBe(s2); // ausverkauft
  });

  it("der Vorrat zählt den LAUF, nicht die Phase — ein Durchlauf setzt ihn nicht zurück", () => {
    const after = resolveTrick(scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, coverBuys: 1 }), rng);
    expect(after.coverBuys).toBe(1);
  });

  it("ohne genug Münzen passiert nichts", () => {
    const poor = inArchitect({ coins: 19 });
    expect(reducer(poor, { type: "BUY_COVER" })).toBe(poor);
  });
});

/* ---- Fokus rufen (§3.3) und Skill aufwerten (§3.5) ---------------------------------------------- */
describe("Fokus rufen (§3.3)", () => {
  const atDoors = (over = {}) => {
    const s = initialState(makeRng(1), 7);
    return { ...s, phase: "levelup", skillOffer: null,
      skillDoors: [{ skills: ["SK_FIRE_01", "SK_FIRE_02", "SK_LIGHTNING_01"], tiers: {} },
                   { skills: ["SK_LIGHTNING_02", "SK_FIRE_03", "SK_LIGHTNING_03"], tiers: {} }],
      ...over };
  };

  it("öffnet eine DRITTE Tür — die zwei gewürfelten bleiben", () => {
    const s = reducer(atDoors({ coins: 20 }), { type: "CALL_FOCUS", arch: "ice" });
    expect(s.skillDoors).toHaveLength(3);
    expect(s.skillDoors[0]).toEqual(atDoors().skillDoors[0]);   // unverändert
    expect(s.skillDoors[1]).toEqual(atDoors().skillDoors[1]);
    expect(s.coins).toBe(15);                                   // fester Preis 5
    expect(s.focusCalled).toBe(true);
  });

  it("die gerufene Tür trägt drei Skills der GERUFENEN Fraktion, mit gewürfelten Stufen", () => {
    const s = reducer(atDoors({ coins: 20 }), { type: "CALL_FOCUS", arch: "ice" });
    const called = s.skillDoors[2];
    expect(called.called).toBe(true);
    expect(called.skills.length).toBeGreaterThan(0);
    for (const id of called.skills) expect(archetypeOf(id)).toBe("ice");
    // Gerufen wird die Fraktion, nicht die Qualität: jeder nicht-legendäre Platz trägt eine Stufe.
    for (const id of called.skills) if (!isLegendarySkill(id)) expect(Number.isInteger(called.tiers[id])).toBe(true);
  });

  it("einmal je Phase, und ohne Münzen gar nicht", () => {
    const once = reducer(atDoors({ coins: 20 }), { type: "CALL_FOCUS", arch: "ice" });
    expect(reducer(once, { type: "CALL_FOCUS", arch: "fire" })).toBe(once);
    const poor = atDoors({ coins: 4 });
    expect(reducer(poor, { type: "CALL_FOCUS", arch: "ice" })).toBe(poor);
  });

  it("nach dem Öffnen einer Tür gibt es keinen Ruf mehr (die Türstufe ist vorbei)", () => {
    const called = reducer(atDoors({ coins: 20 }), { type: "CALL_FOCUS", arch: "ice" });
    const opened = reducer(called, { type: "CHOOSE_DOOR", index: 2 });
    expect(opened.skillOffer).toEqual(called.skillDoors[2].skills);
    expect(reducer(opened, { type: "CALL_FOCUS", arch: "fire" })).toBe(opened);
  });

  it("der Ruf gilt je Phase — ein neuer Durchlauf gibt ihn zurück", () => {
    const next = resolveTrick(scenario(12, 0, { pos: 3, focusCalled: true }), rng);
    expect(next.focusCalled).toBe(false);
  });
});

describe("Skill aufwerten (§3.5)", () => {
  const holding = (over = {}) => {
    const s = initialState(makeRng(1), 7);
    return { ...s, phase: "levelup", skills: ["SK_LIGHTNING_01"], skillTiers: { SK_LIGHTNING_01: 0 },
      activeArchetypes: ["lightning"], lightning: { ...s.lightning, active: true }, ...over };
  };

  it("Preis nach ZIELSTUFE: 12 / 25 / 40, egal in welcher Reihenfolge man geht", () => {
    expect([1, 2, 3].map(upgradePrice)).toEqual([12, 25, 40]);
    // Normal ganz auf Episch kostet die Summe — über die Hälfte des Laufeinkommens (~130).
    expect(12 + 25 + 40).toBe(77);
  });

  it("hebt genau eine Stufe und zieht den Preis der Zielstufe ab", () => {
    const s = reducer(holding({ coins: 100 }), { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_01" });
    expect(s.skillTiers.SK_LIGHTNING_01).toBe(1);
    expect(s.coins).toBe(88);
  });

  it("mehrfach je Phase, auch mehrfach auf demselben Skill", () => {
    let s = holding({ coins: 100 });
    for (let i = 0; i < 3; i++) s = reducer(s, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_01" });
    expect(s.skillTiers.SK_LIGHTNING_01).toBe(MAX_SKILL_TIER);
    expect(s.coins).toBe(100 - 77);
    expect(reducer(s, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_01" })).toBe(s); // höchste Stufe
  });

  it("kostet KEINEN Skill-Zug — das Angebot bleibt stehen", () => {
    const before = holding({ coins: 100, skillOffer: ["SK_FIRE_01"], skillOfferTiers: { SK_FIRE_01: 0 } });
    const s = reducer(before, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_01" });
    expect(s.skillOffer).toEqual(["SK_FIRE_01"]);
    expect(s.phase).toBe("levelup");
  });

  it("die abgeleiteten Werte wandern mit — sonst wertet man die Anzeige auf, nicht das Spiel", () => {
    /* Reststrom (SK_LIGHTNING_05) senkt auf Episch die Ladungsleiste von 10 auf 9 — der einzige Skill, dessen
       STUFE `maxChargeFor` verstellt, und damit die schärfste Probe: wer im Reducer nur skillTiers schreibt und
       lightning.maxCharge stehen lässt, kommt hier nicht durch. */
    let s = holding({ coins: 100, skills: ["SK_LIGHTNING_05"], skillTiers: { SK_LIGHTNING_05: 0 } });
    expect(s.lightning.maxCharge ?? maxChargeFor(s.skills, s.skillTiers)).toBe(10);
    for (let i = 0; i < 3; i++) s = reducer(s, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_05" });
    expect(s.skillTiers.SK_LIGHTNING_05).toBe(MAX_SKILL_TIER);
    expect(s.lightning.maxCharge).toBe(9);
    expect(s.lightning.maxCharge).toBe(maxChargeFor(s.skills, s.skillTiers));
  });

  it("nur gehaltene, nicht-legendäre Skills; ohne Münzen passiert nichts", () => {
    const notHeld = holding({ coins: 100 });
    expect(reducer(notHeld, { type: "UPGRADE_SKILL", skillId: "SK_FIRE_01" })).toBe(notHeld);
    // Legendäre stehen auf keiner Stufenleiter — sie sind nicht aufwertbar, auch nicht mit vollem Konto.
    const leg = holding({ coins: 100, skills: ["SK_LIGHTNING_L02"], skillTiers: {} });
    expect(isLegendarySkill("SK_LIGHTNING_L02")).toBe(true); // Gegenprobe: die id ist wirklich legendär
    expect(reducer(leg, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_L02" })).toBe(leg);
    const poor = holding({ coins: 11 });
    expect(reducer(poor, { type: "UPGRADE_SKILL", skillId: "SK_LIGHTNING_01" })).toBe(poor);
  });
});

/* Perk aufwerten (Owner 2026-09-08: „genauso wie Skills, gleiche Kosten, gleiches Layout").

   Die Stufen gab es schon — neu ist der zweite Weg auf die Leiter: gegen Münzen statt gegen ein Angebot.
   Diese Gruppe hält die zwei Dinge fest, die dabei schiefgehen können: der Stufen-VERSATZ (Familien zählen
   ab 1, Skills ab 0 — ein Fehler dort verschiebt die ganze Preisleiter um eine Stufe) und die RÜCKKEHR aus
   der Ziel-Auswahl, die beim Pick ins Spiel führt und hier zum Angebot zurückführen muss. */
describe("Perk aufwerten — dieselbe Leiter, ab Rang 1 gezählt", () => {
  // Eine Familie ohne jede Ziel-Auswahl und eine mit Karten-Ziel, aus den echten Definitionen gegriffen:
  // hart notierte ids wären genau die Sorte Wissen, die beim nächsten Familien-Umbau still falsch wird.
  const plain = Object.values(FAMILY_DEFS).find((f) => Object.values(f.tiers).every((t) => !t.pickTarget));
  const withTarget = Object.values(FAMILY_DEFS).find((f) => f.tiers[2] && f.tiers[2].pickTarget && f.tiers[2].pickTarget.cards);
  const holdingFam = (id, tier, over = {}) => ({ ...initialState(makeRng(1), 7), phase: "levelup", familyTiers: { [id]: tier }, ...over });

  it("Rang 1 ist Skill-Stufe 0: 12 / 25 / 40, und Rang 4 ist Schluss", () => {
    expect([1, 2, 3].map((r) => familyUpgradeBuy({ coins: 999 }, r).price)).toEqual([12, 25, 40]);
    expect([1, 2, 3].map((r) => familyUpgradeBuy({ coins: 999 }, r).next)).toEqual([2, 3, 4]);
    expect(familyUpgradeBuy({ coins: 999 }, MAX_FAMILY_TIER).maxed).toBe(true);
    // Dieselbe Leiter wie beim Skill, nur um eins versetzt — nicht zwei Leitern nebeneinander.
    expect([1, 2, 3].map((r) => familyUpgradeBuy({ coins: 999 }, r).price)).toEqual([1, 2, 3].map(upgradePrice));
  });

  it("hebt genau eine Stufe, zieht den Preis ab und lässt das Perk-Angebot stehen", () => {
    const before = holdingFam(plain.id, 1, { coins: 100, offer: [{ familyId: plain.id, tier: 3 }] });
    const s = reducer(before, { type: "UPGRADE_FAMILY", familyId: plain.id });
    expect(s.familyTiers[plain.id]).toBe(2);
    expect(s.coins).toBe(88);
    expect(s.offer).toEqual(before.offer);   // der Perk-Zug der Phase bleibt unberührt
    expect(s.phase).toBe("levelup");
  });

  it("mehrfach je Phase bis Rang 4, dann ist Schluss", () => {
    let s = holdingFam(plain.id, 1, { coins: 100 });
    for (let i = 0; i < 3; i++) s = reducer(s, { type: "UPGRADE_FAMILY", familyId: plain.id });
    expect(s.familyTiers[plain.id]).toBe(MAX_FAMILY_TIER);
    expect(s.coins).toBe(100 - 77);
    expect(reducer(s, { type: "UPGRADE_FAMILY", familyId: plain.id })).toBe(s);
  });

  it("nur GEHALTENE Familien, und ohne Münzen passiert nichts", () => {
    const notHeld = holdingFam(plain.id, 0, { coins: 100 });
    expect(reducer(notHeld, { type: "UPGRADE_FAMILY", familyId: plain.id })).toBe(notHeld); // Rang 0 = nicht besessen
    const poor = holdingFam(plain.id, 1, { coins: 11 });
    expect(reducer(poor, { type: "UPGRADE_FAMILY", familyId: plain.id })).toBe(poor);
    const bogus = holdingFam(plain.id, 1, { coins: 100 });
    expect(reducer(bogus, { type: "UPGRADE_FAMILY", familyId: "GIBT_ES_NICHT" })).toBe(bogus);
  });

  it("eine Stufe mit Ziel führt in die Auswahl und KOMMT ZURÜCK — bezahlt wird erst dort", () => {
    const before = holdingFam(withTarget.id, 1, { coins: 100, offer: [{ familyId: plain.id, tier: 1 }] });
    const picking = reducer(before, { type: "UPGRADE_FAMILY", familyId: withTarget.id });
    expect(picking.phase).toBe("family-target");
    expect(picking.familyTarget.need).toBeGreaterThan(0);
    expect(picking.coins).toBe(100);                       // noch nichts abgebucht
    expect(picking.offer).toEqual(before.offer);           // das Angebot wartet, anders als beim Pick
    let s = picking;
    for (const c of s.deck.slice(0, picking.familyTarget.need)) s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: c.id });
    const done = reducer(s, { type: "FAMILY_TARGET_CONFIRM" });
    expect(done.phase).toBe("levelup");                    // zurück zum Angebot, NICHT ins Spiel
    expect(done.familyTiers[withTarget.id]).toBe(2);
    expect(done.coins).toBe(88);                           // erst jetzt bezahlt
    expect(done.familyTarget).toBeNull();
  });

  it("der PICK geht weiterhin ins Spiel — die Rückkehr gilt nur der Aufwertung", () => {
    /* Gegenprobe zur Zeile darüber: ohne sie könnte die Rückkehr-Adresse versehentlich für jeden
       Ziel-Flow gelten, und ein normaler Perk-Pick bliebe im Angebot hängen. */
    const s0 = { ...initialState(makeRng(1), 7), phase: "levelup", offer: [{ familyId: withTarget.id, tier: 1 }] };
    const t1 = withTarget.tiers[1].pickTarget
      ? reducer(s0, { type: "PICK_FAMILY", familyId: withTarget.id, tier: 1 })
      : null;
    if (t1 && t1.phase === "family-target") {
      let s = t1;
      for (const c of s.deck.slice(0, t1.familyTarget.need)) s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: c.id });
      expect(reducer(s, { type: "FAMILY_TARGET_CONFIRM" }).phase).toBe("play");
    } else {
      expect(reducer(s0, { type: "PICK_FAMILY", familyId: withTarget.id, tier: 1 }).phase).toBe("play");
    }
  });
});

describe("Stufen-Textvergleich (§3.5, Anzeige)", () => {
  it("hebt genau das geänderte Stück heraus, Rahmen bleibt stehen", () => {
    const d = tierTextDiff("Jeder Sieg gibt +2 % Hitze, auch ein knapper.",
                           "Jeder Sieg gibt +3 % Hitze, auch ein knapper.");
    expect(d.before).toBe("Jeder Sieg gibt");
    expect(d.removed).toBe("+2");
    expect(d.added).toBe("+3");
    expect(d.after).toBe("% Hitze, auch ein knapper.");
  });

  it("ein angehängter Satz ist reiner Zuwachs — nichts wird durchgestrichen", () => {
    const d = tierTextDiff("Jeder Sieg gibt +5 % Hitze.",
                           "Jeder Sieg gibt +5 % Hitze. Auch jede Niederlage gibt +2 % Hitze.");
    expect(d.removed).toBe("");
    expect(d.added).toBe("Auch jede Niederlage gibt +2 % Hitze.");
  });

  it("ohne Gemeinsamkeiten stehen schlicht beide Fassungen da", () => {
    const d = tierTextDiff("Alt und anders", "Voellig neu geschrieben");
    expect(d.before).toBe("");
    expect(d.after).toBe("");
    expect(d.removed).toBe("Alt und anders");
    expect(d.added).toBe("Voellig neu geschrieben");
  });

  it("gleiche Texte ergeben keine Änderung", () => {
    const d = tierTextDiff("Gleich", "Gleich");
    expect(d.removed).toBe("");
    expect(d.added).toBe("");
  });
});
