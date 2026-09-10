import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, BLITZ_TIERS, effectiveTierOf, tierIsLifted } from "../src/game/skills.js";
import { initLightning, L, maxChargeFor, effectiveTier, lightParam, lightningCritChance, lightningCritMult, overcritMult,
  blitzfaengerValue, ionenfeldValue, fieldTick, ionScoreFor, ionCritMultFor, chargeGainOnWin, critFillsBar, blitzschlagStacks,
  formationStacks, litFormationCards, feldFeed, lightningOnLoss, fillBar, lightningCycleEnd } from "../src/game/factions/lightning.js";
import { resolveTrick } from "../src/game/engine.js";
import { computeFormations } from "../src/game/formations.js";
import { initialState } from "../src/game/reducer.js";
import { fireTier, F } from "../src/game/factions/fire.js";
import { plantTier, P } from "../src/game/factions/plant.js";
import { iceRoleTiers } from "../src/game/factions/ice.js";
import { makeRng } from "../src/game/deck.js";

/* Blitz — exp skill rework (docs/skill-rework.md §3): Passiv, 14 Skills mit vier Stufen (§7.19), 4 Legendäre. Erst die reinen
   Übergänge des Moduls, dann jeder Skill einmal durch resolveTrick. Konstante Decks (Spieler 12 gegen 0 = Sieg,
   0 gegen 12 = Niederlage), rng 0 = Crit sobald Chance > 0, rng 0,99 = nie. playerOrder = Identität: Position 0 spielt
   Deck-Index 0, die „nächste Karte in der Reihenfolge" ist Deck-Index 1. */
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const light = (over = {}) => ({ ...initLightning(), active: true, ...over });
const withStacks = (v, idx, stacks) => constDeck(v).map((c, i) => (i === idx ? { ...c, ionStacks: stacks } : c));
const noCrit = () => 0.99, zero = () => 0;
const B = C.SCORE_PER_WIN;
const T = BLITZ_TIERS;
const M = C.CRIT_BASE_MULT;

/* Roster mit LITERALEN IDs — das Coverage-Gate in registry-guards.test.js sucht jede Skill-ID als Text in den Tests. */
const LIGHTNING_IDS = [ // §7.18: 08 (Statische Aufladung) und 16 (Dauerstrom) in Blitzableiter aufgegangen; 02 Ionenfeld und 12 Vorentladung neu; §7.19: 14 (Überschlag) gestrichen
  "SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06", "SK_LIGHTNING_07",
  "SK_LIGHTNING_09", "SK_LIGHTNING_10", "SK_LIGHTNING_11", "SK_LIGHTNING_12", "SK_LIGHTNING_13",
  "SK_LIGHTNING_15", "SK_LIGHTNING_17",
  "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04",
];

describe("Blitz-Modul — Stufen und Kennwerte", () => {
  it("L nennt genau die registrierten Blitz-Skills (14 + 3 Legendäre)", () => {
    const ids = Object.values(L);
    // §6.11 (Owner): drei Legendäre je Fraktion — Donnergott (L01) ist als schwächstes gestrichen.
    expect(ids).toHaveLength(17);
    expect([...ids].sort()).toEqual([...LIGHTNING_IDS].sort());
    for (const id of ids) expect(SKILL_DEFS[id]?.archetype, id).toBe("lightning");
    expect(Object.values(SKILL_DEFS).filter((s) => s.archetype === "lightning").map((s) => s.id).sort()).toEqual([...LIGHTNING_IDS].sort());
  });
  it("effectiveTier: nicht gehalten/Legendär → null; ohne Eintrag Normal; Hochspannung hebt um HOCHSPANNUNG_STEPS, Episch ist das Ende", () => {
    expect(effectiveTier([], {}, L.ABLEITER)).toBeNull();
    expect(effectiveTier([L.RESONANZ], {}, L.RESONANZ)).toBeNull();
    expect(effectiveTier([L.ABLEITER], {}, L.ABLEITER)).toBe(0);
    expect(effectiveTier([L.ABLEITER], { [L.ABLEITER]: 2 }, L.ABLEITER)).toBe(2);
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], { [L.ABLEITER]: 2 }, L.ABLEITER)).toBe(Math.min(3, 2 + C.HOCHSPANNUNG_STEPS));
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], { [L.ABLEITER]: 3 }, L.ABLEITER)).toBe(3); // Episch bleibt Episch
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], {}, L.ABLEITER)).toBe(Math.min(3, C.HOCHSPANNUNG_STEPS));
  });

  /* §7.45 (Owner: „überall bei dem Skill auch die neue Rarität anzeigen"). Bis dahin las die Anzeige `tierOf`, also
     die GEWÜRFELTE Stufe: mit Hochspannung stand „SELTEN" an einem Skill, der wie Episch wirkt, und der Kartentext
     beschrieb die Selten-Zahlen — die Beschreibung log. `effectiveTierOf` ist die Quelle, die die Anzeige teilt;
     geprüft wird, dass sie mit der Stufenfunktion der Engine übereinstimmt und dass der TEXT mitwandert. */
  it("effectiveTierOf: die Anzeige-Stufe folgt derselben Leiter wie der Motor, und der Skilltext wandert mit", () => {
    const rolled = { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 1 } };
    const boosted = { skills: [L.ABLEITER, L.HOCHSPANNUNG], skillTiers: { [L.ABLEITER]: 1 } };
    const up = Math.min(3, 1 + C.HOCHSPANNUNG_STEPS);
    expect(effectiveTierOf(rolled, L.ABLEITER)).toBe(1);
    expect(effectiveTierOf(boosted, L.ABLEITER)).toBe(up);
    // dieselbe Zahl wie der Motor rechnet — sonst zeigt die Leiste etwas anderes an, als der Stich zahlt
    expect(effectiveTierOf(boosted, L.ABLEITER)).toBe(effectiveTier(boosted.skills, boosted.skillTiers, L.ABLEITER));
    // der Text folgt der Stufe: die Anzeige greift descTiers mit der WIRKSAMEN Stufe, nicht mit der gewürfelten
    const tiersOf = SKILL_DEFS[L.ABLEITER].descTiers;
    expect(tiersOf[effectiveTierOf(boosted, L.ABLEITER)]).toBe(tiersOf[up]);
    expect(tiersOf[effectiveTierOf(boosted, L.ABLEITER)]).not.toBe(tiersOf[effectiveTierOf(rolled, L.ABLEITER)]);
    // die Marke: gehoben ja, gewürfelt nein, Episch bleibt Episch (die Leiter endet), Legendäre haben keine Stufe
    expect(tierIsLifted(boosted, L.ABLEITER)).toBe(true);
    expect(tierIsLifted(rolled, L.ABLEITER)).toBe(false);
    expect(tierIsLifted({ skills: [L.ABLEITER, L.HOCHSPANNUNG], skillTiers: { [L.ABLEITER]: 3 } }, L.ABLEITER)).toBe(false);
    expect(effectiveTierOf(boosted, L.HOCHSPANNUNG)).toBeNull();
    expect(tierIsLifted(boosted, L.HOCHSPANNUNG)).toBe(false);
  });

  /* §7.39 (Owner): Hochspannung hebt JEDE Fraktion, nicht mehr nur Blitz. §7.38 hatte gemessen, dass keine Zahl den
     Skill ins Band bringt — die Stufenleiter ist nur vier lang, +2 sättigt sie für fast jeden Wurf (1 → +8 %,
     2 → +428 %, 3 → +520 %). Aus dem Mono-Verstärker wurde deshalb ein Misch-Legendäres: +1 Stufe für alle.
     Der Wächter prüft alle vier Fraktionen über ihre EIGENE Stufenfunktion — der Hebel sitzt in skills.js, aber
     jedes Modul muss ihn auch wirklich lesen. */
  it("Hochspannung hebt die Stufe in JEDER Fraktion, nicht nur bei Blitz (§7.39)", () => {
    const step = C.HOCHSPANNUNG_STEPS;
    const up = (t) => Math.min(3, t + step);
    // Blitz
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], { [L.ABLEITER]: 1 }, L.ABLEITER)).toBe(up(1));
    // Feuer
    expect(fireTier([F.ZUNDER], { [F.ZUNDER]: 1 }, F.ZUNDER)).toBe(1);
    expect(fireTier([F.ZUNDER, L.HOCHSPANNUNG], { [F.ZUNDER]: 1 }, F.ZUNDER)).toBe(up(1));
    // Pflanze
    expect(plantTier([P.AUSSAAT], { [P.AUSSAAT]: 1 }, P.AUSSAAT)).toBe(1);
    expect(plantTier([P.AUSSAAT, L.HOCHSPANNUNG], { [P.AUSSAAT]: 1 }, P.AUSSAAT)).toBe(up(1));
    // Eis — die Stufe wird je ROLLE geseedet, der Hebel muss dort sitzen
    const iceId = Object.keys(SKILL_DEFS).find((id) => SKILL_DEFS[id].archetype === "ice" && SKILL_DEFS[id].role);
    const role = SKILL_DEFS[iceId].role;
    expect(iceRoleTiers([iceId], { [iceId]: 1 })[role]).toBe(1);
    expect(iceRoleTiers([iceId, L.HOCHSPANNUNG], { [iceId]: 1 })[role]).toBe(up(1));
    // Episch bleibt in jeder Fraktion das Ende der Leiter
    expect(fireTier([F.ZUNDER, L.HOCHSPANNUNG], { [F.ZUNDER]: 3 }, F.ZUNDER)).toBe(3);
    expect(plantTier([P.AUSSAAT, L.HOCHSPANNUNG], { [P.AUSSAAT]: 3 }, P.AUSSAAT)).toBe(3);
    expect(iceRoleTiers([iceId, L.HOCHSPANNUNG], { [iceId]: 3 })[role]).toBe(3);
  });
  it("lightParam liest die Zeile der wirksamen Stufe; unbekannter Schlüssel / nicht gehalten → undefined", () => {
    expect(lightParam([L.RESTSTROM], {}, L.RESTSTROM, "floor")).toBe(T.reststrom[0].floor);
    expect(lightParam([L.RESTSTROM], { [L.RESTSTROM]: 3 }, L.RESTSTROM, "floor")).toBe(T.reststrom[3].floor);
    expect(lightParam([L.RESTSTROM], {}, L.RESTSTROM, "nope")).toBeUndefined();
    expect(lightParam([], {}, L.RESTSTROM, "floor")).toBeUndefined();
  });
  it("maxChargeFor: Leiste 10, mit Reststrom Episch 9 (§7.22 Extra)", () => {
    expect(maxChargeFor([])).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM], { [L.RESTSTROM]: 3 })).toBe(T.reststrom[3].bar);
    expect(T.reststrom[3].bar).toBeLessThan(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM], { [L.RESTSTROM]: 2 })).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM, L.HOCHSPANNUNG], { [L.RESTSTROM]: 2 })).toBe(T.reststrom[3].bar); // Hochspannung hebt auf Episch
  });
  /* §7.30: das Passiv ist ein SOCKEL (sobald aktiv, einmal) plus ein Satz JE gehaltenem Skill. `SOCK` steht in jeder
     Zeile ausgeschrieben, damit ein späterer Umbau nicht still eine der beiden Hälften in die andere schieben kann —
     genau das prüfen die ersten drei Zeilen: der Sockel bleibt gleich, der Satz wächst mit der Zahl der Skills. */
  it("lightningCritChance: Sockel einmal + Satz je Blitz-Skill (auch Legendäre), Gewitterfront-Rampe additiv; die Serie zählt hier nicht mehr (§7.30)", () => {
    const SOCK = C.LIGHTNING_CRIT_SOCKET;
    expect(lightningCritChance(initLightning(), [L.ABLEITER], {})).toBe(0); // inaktiv: auch kein Sockel
    expect(lightningCritChance(light(), [], {})).toBeCloseTo(SOCK, 9);      // aktiv ohne Skill: nur der Sockel
    expect(lightningCritChance(light(), [L.ABLEITER, L.RESTSTROM], {})).toBeCloseTo(SOCK + 2 * C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light(), [L.RESONANZ], {})).toBeCloseTo(SOCK + C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light({ stormCritBonus: 0.2 }), [], {})).toBeCloseTo(SOCK + 0.2, 9);
    // §7.30: die Ladungsserie zahlt in Ladung, nicht in Chance — die Serie hebt die Crit-Chance nicht mehr, egal wie lang.
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], {}, 40)).toBeCloseTo(SOCK + C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 3 }, 200)).toBeCloseTo(SOCK + C.LIGHTNING_CRIT_PER_SKILL, 9);
  });
  it("lightningCritMult: Gewitterfront-Rampe + Vorentladung ab der Serie (§7.19: Überschlag gestrichen; §7.43: kein Stau mehr)", () => {
    expect(lightningCritMult(initLightning(), [L.RESONANZ], {})).toBe(0);
    expect(lightningCritMult(light({ entladungMult: 0.3 }), [L.RESONANZ], {})).toBeCloseTo(0.3, 9);
    const vMin = T.vorentladung[0].minStreak;
    expect(lightningCritMult(light(), [L.VORENTLADUNG], {}, vMin)).toBeCloseTo(vMin * T.vorentladung[0].multPerStreak, 9);
    expect(lightningCritMult(light(), [L.VORENTLADUNG], {}, vMin - 1)).toBe(0);
    expect(lightningCritMult(light(), [L.VORENTLADUNG], { [L.VORENTLADUNG]: 3 }, 10)).toBeCloseTo(10 * T.vorentladung[3].multPerStreak, 9);
    expect(lightningCritMult(light(), [], {}, 10)).toBe(0); // ohne Vorentladung zählt die Serie hier nicht
    expect(L.UEBERSCHLAG).toBeUndefined(); expect(T.ueberschlag).toBeUndefined(); // §7.19
  });
  it("Systemregel overcritMult: je Prozentpunkt über 100 % OVERCRIT_MULT_PER_PP, darunter 0", () => {
    expect(overcritMult(0.8)).toBe(0);
    expect(overcritMult(1)).toBe(0);
    expect(overcritMult(1.5)).toBeCloseTo(50 * C.OVERCRIT_MULT_PER_PP, 9);
    expect(C.OVERCRIT_MULT_PER_PP).toBeGreaterThan(0);
    /* §7.44 (Owner): der Satz ist 0,03 — die alte Schranke (100 Punkte heben höchstens ein Achtel des Deckels)
       ist damit gefallen und wird hier NICHT aufgeweicht, sondern durch die Aussage ersetzt, die noch stimmt.
       Der Grund für den alten Wert war „die Regel darf nicht selbst zur Crit-Quelle werden"; seit §7.42 dämpft
       der weiche Deckel den Überschuss über dem Knick ohnehin auf ein Fünftel, und genau dort sitzen die Builds,
       die über 100 % Chance bauen. Was weiter gelten MUSS:
       (a) am Knick ist ein Punkt ÜBER 100 % weniger wert als ein Punkt darunter — sonst lohnt es sich, die
           Chance absichtlich zu überschießen, statt sie zu erreichen (ein Punkt darunter wandelt 1 % der Stiche
           von ×1 auf ×M, bringt also (M−1)/100),
       (b) die Regel allein bleibt unter dem Knick: 100 Punkte darüber heben den Multiplikator um weniger als
           den Deckel selbst. */
    expect(C.OVERCRIT_MULT_PER_PP).toBeLessThan((C.CRIT_MULT_CAP - 1) / 100);
    expect(100 * C.OVERCRIT_MULT_PER_PP).toBeLessThan(C.CRIT_MULT_CAP);
  });
  it("blitzfaengerValue / ionScoreFor: Schwellen fallen mit der Stufe, Kurzschluss zählt Stapel ab Schwelle doppelt", () => {
    for (let t = 0; t < 4; t++) {
      const min = T.faenger[t].minStacks;
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min })).toBe(T.faenger[t].value + (T.faenger[t].perStack || 0) * min);
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min - 1 })).toBe(0);
    }
    expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: 3 }, { ionStacks: 5 })).toBe(T.faenger[3].value + 5 * T.faenger[3].perStack); // §7.22 Episch-Extra: +1 je Stapel
    expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: 2 }, { ionStacks: 5 })).toBe(T.faenger[2].value);
    expect(blitzfaengerValue([], {}, { ionStacks: 99 })).toBe(0);
    expect(T.faenger.every((r) => r.minStacks === 1)).toBe(true); // §7.18: ohne Schwelle — jede ionisierte Karte
    expect(ionScoreFor({ ionStacks: 3 })).toBe(3 * C.ION_SCORE_PER_STACK);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
    const min = T.kurzschluss[0].minStacks;
    expect(ionScoreFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBe(min * C.ION_SCORE_PER_STACK * T.kurzschluss[0].factor);
    expect(ionScoreFor({ ionStacks: min - 1 }, [L.KURZSCHLUSS], {})).toBe((min - 1) * C.ION_SCORE_PER_STACK);
  });
  it("ionenfeldValue / fieldTick (§7.18): +Wert der Stufe, solange das Feld trägt; der Tick zählt je Stich herunter", () => {
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [L.IONENFELD], {})).toBe(T.ionenfeld[0].value);
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [L.IONENFELD], { [L.IONENFELD]: 3 })).toBe(T.ionenfeld[3].value);
    expect(ionenfeldValue(light({ fieldLeft: 0 }), [L.IONENFELD], {})).toBe(0);
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [], {})).toBe(0);
    expect(ionenfeldValue(initLightning(), [L.IONENFELD], {})).toBe(0);
    expect(fieldTick(light({ fieldLeft: 2 })).fieldLeft).toBe(1);
    const l = light({ fieldLeft: 0 });
    expect(fieldTick(l)).toBe(l);
  });
});

describe("Blitz-Modul — Ladung, Leiste, Niederlage (reine Übergänge)", () => {
  it("chargeGainOnWin: Crit +1 Passiv; Blitzableiter Normal jeder 2. Crit, Sehr selten jeder; Überspannung (§7.24) macht den Überschuss über dem Deckel zu Ladung; immutabel", () => {
    const l = light();
    const a = chargeGainOnWin(l, [], {}, { isCrit: true });
    expect(a.gain).toBe(1); expect(a.next.critCount).toBe(1); expect(l.critCount).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(1);                          // 1. Crit: noch nichts extra
    expect(chargeGainOnWin(light({ critCount: 1 }), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(2);          // 2. Crit: +1
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 2 }, { isCrit: true }).gain).toBe(2);        // Sehr selten: jeder Crit
    // §7.28: der Überschuss über dem Deckel gibt KEINE Ladung mehr (Überspannung gestrichen) — die Ladung kennt nur
    // noch Crit, Blitzableiter und Ladungsserie Episch. Der Lichtbogen auf ihrem Platz zahlt auf die Crit-Chance.
    expect(T.ueberspannung).toBeUndefined(); expect(L.UEBERSPANNUNG).toBeUndefined();
    expect(chargeGainOnWin(light(), [L.LICHTBOGEN], {}, { isCrit: true }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.LICHTBOGEN], { [L.LICHTBOGEN]: 3 }, { isCrit: false }).gain).toBe(0);
  });
  it("chargeGainOnWin ohne Crit (§7.18): Blitzableiter Episch +1 je Sieg ohne Crit, darunter nichts; Ladungsserie ab ihrer Schwelle (§7.30)", () => {
    expect(chargeGainOnWin(light(), [L.ABLEITER], {}, { isCrit: false }).gain).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 2 }, { isCrit: false }).gain).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 3 }, { isCrit: false }).gain).toBe(T.ableiter[3].noCritCharge);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 3 }, { isCrit: true }).gain).toBe(2); // Crit: Passiv + jeder Crit
    // §7.30: die Ladung aus der Serie ist der ganze Skill, nicht mehr ein Episch-Extra — sie greift auf JEDER Stufe,
    // sobald die Serie die Schwelle der Stufe erreicht, und einen Punkt darunter nicht.
    for (const tier of [0, 1, 2, 3]) {
      const at = T.serie[tier].chargeFromStreak;
      expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: tier }, { isCrit: false, streak: at }).gain).toBe(1);
      expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: tier }, { isCrit: false, streak: at - 1 }).gain).toBe(0);
    }
  });
  it("critFillsBar: Vorschau auf denselben Gewinn wie der echte Crit", () => {
    expect(critFillsBar(light({ charge: 9 }), [], {})).toBe(true);
    expect(critFillsBar(light({ charge: 8 }), [], {})).toBe(false);
    expect(critFillsBar(light({ charge: 8 }), [L.ABLEITER], { [L.ABLEITER]: 2 })).toBe(true); // +1 Passiv +1 Blitzableiter (Sehr selten: jeder Crit)
    expect(critFillsBar(initLightning(), [], {})).toBe(false);
  });
  it("blitzschlagStacks: jeder N. Crit (Zähler nach dem Crit), Doppelentladung 2 Stapel", () => {
    const n = T.blitzschlag[0].critEvery;
    expect(blitzschlagStacks(light({ critCount: n }), [L.BLITZSCHLAG], {})).toBe(T.blitzschlag[0].stacks);
    expect(blitzschlagStacks(light({ critCount: n - 1 }), [L.BLITZSCHLAG], {})).toBe(0);
    expect(blitzschlagStacks(light({ critCount: 2 }), [L.BLITZSCHLAG, L.DOPPELENTLADUNG], { [L.BLITZSCHLAG]: 3 })).toBe(T.blitzschlag[3].stacks * C.DOPPELENTLADUNG_STACKS); // §7.18: Episch zwei Stapel, Doppelentladung verdoppelt
    expect(blitzschlagStacks(light({ critCount: 5 }), [], {})).toBe(0);
  });
  /* Spannungsfeld (§7.51) — die Vereinigung ist der Kern: eine Karte, die in mehreren Formationen der Position
     hängt, darf NUR EINMAL zählen, sonst zahlt sie mehrfach für sich selbst. Der Wächter überlappt deshalb zwei
     Formationen absichtlich. */
  it("formationStacks: jede Karte genau einmal über alle Formationen der Position, die gespielte eingeschlossen; ohne Partner leer", () => {
    const stacks = { 0: 2, 1: 1, 2: 3, 5: 4 };
    const cardAt = (k) => ({ ionStacks: stacks[k] || 0 });
    const two = { formations: [{ members: [0, 1, 2] }, { members: [1, 2, 5] }] }; // 2 steht in beiden
    expect(formationStacks({ ionStacks: 1 }, two, 1, cardAt).map((m) => m.slot)).toEqual([1, 0, 2, 5]);
    expect(formationStacks({ ionStacks: 1 }, { formations: [] }, 1, cardAt)).toEqual([]); // ohne Formation kein Feld
    expect(formationStacks({ ionStacks: 1 }, { formations: [{ members: [] }] }, 1, cardAt)).toEqual([]); // Meta-Faktoren haben keine Mitglieder
  });
  /* §7.51: der Kennwert ist die ZAHL der leuchtenden Karten, nicht ihre Tiefe. Der Wächter vergleicht deshalb
     dieselben Karten flach und hundertfach tiefer — die Zahl darf sich nicht bewegen. Bewegt sie sich, ist eine
     Tiefen-Lesart zurück, und mit ihr die zweite Multiplikator-Achse aus §7.46 C. */
  it("litFormationCards: zählt die ionisierten Karten der Formation, unabhängig von ihrer Tiefe", () => {
    const at = (s) => (k) => ({ ionStacks: s[k] || 0 });
    const form = { formations: [{ members: [0, 1, 2] }] };
    const card = { ionStacks: 1 };
    expect(litFormationCards(card, form, 1, at({ 0: 2, 1: 1, 2: 3 }))).toBe(3);
    expect(litFormationCards(card, form, 1, at({ 0: 200, 1: 1, 2: 300 }))).toBe(3); // Tiefe bewegt die Zahl nicht
    expect(litFormationCards(card, form, 1, at({ 0: 2, 1: 1, 2: 0 }))).toBe(2);     // eine dunkle Karte zählt nicht
    expect(litFormationCards({ ionStacks: 0 }, form, 1, at({}))).toBe(0);
    expect(litFormationCards(card, { formations: [] }, 1, at({ 0: 2 }))).toBe(0);   // ohne Formation kein Feld
  });
  it("lightningCritChance (§7.51): das Spannungsfeld gibt Crit-Chance je ionisierter Karte; ohne Formation nichts", () => {
    const per = (t) => T.feld[t].critPerCard;
    const base = lightningCritChance(light(), [L.SPANNUNGSFELD], {}, 0, null, 0);
    expect(lightningCritChance(light(), [L.SPANNUNGSFELD], {}, 0, null, 3)).toBeCloseTo(base + 3 * per(0), 9);
    expect(lightningCritChance(light(), [L.SPANNUNGSFELD], { [L.SPANNUNGSFELD]: 3 }, 0, null, 3)).toBeCloseTo(base + 3 * per(3), 9);
    expect(lightningCritChance(light(), [L.KETTENBLITZ], {}, 0, null, 3)).toBeCloseTo(base, 9); // ohne den Skill kein Beitrag
    expect(lightningCritChance(initLightning(), [L.SPANNUNGSFELD], {}, 0, null, 3)).toBe(0);    // inaktiv gar nichts
  });
  it("feldFeed (Episch): die Karte mit den WENIGSTEN Stapeln der Formation, Gleichstand die vordere Position; erst ab Episch", () => {
    const stacks = { 0: 2, 1: 1, 2: 3, 3: 1 };
    const cardAt = (k) => ({ ionStacks: stacks[k] || 0 });
    const form = { formations: [{ members: [0, 1, 2, 3] }] };
    const card = { ionStacks: 1 };
    const epic = { [L.SPANNUNGSFELD]: 3 };
    expect(feldFeed(light(), [L.SPANNUNGSFELD], epic, card, form, 1, cardAt)).toEqual({ slot: 1, stacks: T.feld[3].feedLowest }); // 1 und 3 haben je 1 → die vordere
    expect(feldFeed(light(), [L.SPANNUNGSFELD], epic, { ionStacks: 9 }, form, 1, cardAt).slot).toBe(3); // die Siegkarte ist nicht mehr die dünnste
    expect(feldFeed(light(), [L.SPANNUNGSFELD], {}, card, form, 1, cardAt)).toBe(null); // Normal hat den Anhang nicht
    expect(feldFeed(light(), [L.SPANNUNGSFELD], epic, card, { formations: [] }, 1, cardAt)).toBe(null);
  });
  /* §7.30: fester Preis statt eines Anteils der Leiste, und ein DECKEL je Durchlauf. Der Deckel ist der Kern des
     Umbaus (die Kadenz war das Problem, nicht der Preis), deshalb prüft der Test ihn ausdrücklich: die (perRound+1).
     Auslösung im selben Durchlauf hält NICHT mehr, obwohl die Ladung reicht. */
  it("lightningOnLoss: Serienschutz kostet den festen Preis der Stufe und greift höchstens perRound-mal je Durchlauf", () => {
    const { cost: cost0, perRound: per0 } = T.serienschutz[0];
    const held = lightningOnLoss(light({ charge: cost0 + 1 }), [L.SERIENSCHUTZ], {});
    expect(held.streakHeld).toBe(true); expect(held.lightning.charge).toBe(1); expect(held.lightning.serienschutzCount).toBe(1);
    expect(held.lightning.serienschutzRound).toBe(1);
    const broke = lightningOnLoss(light({ charge: cost0 - 1 }), [L.SERIENSCHUTZ], {});
    expect(broke.streakHeld).toBe(false); expect(broke.lightning.charge).toBe(cost0 - 1);
    // Deckel: mit voller Ladung, aber perRound schon verbraucht, hält die Serie nicht mehr — und kostet auch nichts.
    const capped = lightningOnLoss(light({ charge: 10, serienschutzRound: per0 }), [L.SERIENSCHUTZ], {});
    expect(capped.streakHeld).toBe(false); expect(capped.lightning.charge).toBe(10);
    // Episch greift öfter im selben Durchlauf: dieselbe Lage hält dort noch.
    const epic = lightningOnLoss(light({ charge: 10, serienschutzRound: per0 }), [L.SERIENSCHUTZ], { [L.SERIENSCHUTZ]: 3 });
    expect(epic.streakHeld).toBe(true); expect(epic.lightning.charge).toBe(10 - T.serienschutz[3].cost);
    expect(lightningOnLoss(light({ charge: 9 }), [L.SERIENSCHUTZ], {}, { alreadyHeld: true }).lightning.charge).toBe(9); // Serienanker hält schon → keine Kosten
    expect(lightningOnLoss(light({ charge: 4 }), [L.ABLEITER], { [L.ABLEITER]: 3 }).lightning.charge).toBe(4); // §7.18: keine Niederlagen-Ladung mehr
    expect(lightningOnLoss(initLightning(), [L.SERIENSCHUTZ], {}).streakHeld).toBe(false);
    // §7.22 Kurzschluss Episch-Extra: verliert eine Karte ab der Schwelle, ist ihr doppelter Stapel-Score vorgemerkt; darunter und auf Normal nicht.
    const ksMin = T.kurzschluss[3].minStacks;
    const bank = lightningOnLoss(light(), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin } }).lightning.stackBank;
    expect(bank).toBe(ksMin * C.ION_SCORE_PER_STACK * T.kurzschluss[3].factor);
    expect(lightningOnLoss(light({ stackBank: bank }), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin } }).lightning.stackBank).toBe(2 * bank); // stapelt sich
    expect(lightningOnLoss(light(), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin - 1 } }).lightning.stackBank || 0).toBe(0);
    expect(lightningOnLoss(light(), [L.KURZSCHLUSS], {}, { card: { ionStacks: 9 } }).lightning.stackBank || 0).toBe(0);
  });
  it("fillBar: nur bei voller Leiste; nächste Karte +1 Stapel, Leiste auf Boden, bars +1, immutabel; Wrap ans Deck-Ende", () => {
    const deck = constDeck(5), order = identity();
    const none = fillBar(light({ charge: 9 }), [], {}, deck, order, 0);
    expect(none.filled).toBe(false); expect(none.deck).toBe(deck);
    const f = fillBar(light({ charge: 10 }), [], {}, deck, order, 0);
    expect(f.filled).toBe(true); expect(f.stacks).toBe(1); expect(f.targets).toEqual([1]);
    expect(f.deck[1].ionStacks).toBe(1); expect(f.deck[0].ionStacks || 0).toBe(0);
    expect(f.lightning.charge).toBe(0); expect(f.lightning.bars).toBe(1);
    expect(deck[1].ionStacks).toBeUndefined(); // Original unverändert
    expect(fillBar(light({ charge: 10 }), [], {}, deck, order, 39).targets).toEqual([0]);
  });
  it("fillBar: Reststrom-Boden, Blitzableiter-Rückgabe, Überschuss verfällt (§7.18 auch auf Episch); Rampen ohne Deckel", () => {
    const deck = constDeck(5), order = identity();
    expect(fillBar(light({ charge: 10 }), [L.RESTSTROM], { [L.RESTSTROM]: 1 }, deck, order, 0).lightning.charge).toBe(T.reststrom[1].floor);
    expect(fillBar(light({ charge: 10 }), [L.ABLEITER, L.RESTSTROM], { [L.ABLEITER]: 2, [L.RESTSTROM]: 0 }, deck, order, 0).lightning.charge)
      .toBe(T.reststrom[0].floor + T.ableiter[2].back);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 3 }, deck, order, 0).lightning.charge).toBe(T.ableiter[3].back);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 2 }, deck, order, 0).lightning.charge).toBe(T.ableiter[2].back); // Überschuss verfällt
    const ramps = fillBar(light({ charge: 10, stormCritBonus: 0.5, entladungScore: 2 }), [L.GEWITTERFRONT, L.ENTLADUNG], {}, deck, order, 0).lightning;
    expect(ramps.stormCritBonus).toBeCloseTo(0.5 + T.gewitter[0].critPerBar, 9);
    // §7.42: Entladungs Rampe ist Basis-Score, nicht mehr Crit-Multiplikator — der Multiplikator-Kanal gehört jetzt
    // allein der Gewitterfront (Episch-Anhang), und Entladung fasst ihn nicht mehr an.
    expect(ramps.entladungScore).toBeCloseTo(2 + T.entladung[0].scorePerBar, 9);
    expect(ramps.entladungMult).toBe(0);
    // §7.22 Episch-Extras: Gewitterfront Episch rampt auch den Crit-Multiplikator; Reststrom Episch macht die Leiste bei 9 voll.
    expect(fillBar(light({ charge: 10 }), [L.GEWITTERFRONT], { [L.GEWITTERFRONT]: 3 }, deck, order, 0).lightning.entladungMult).toBeCloseTo(T.gewitter[3].multPerBar, 9);
    expect(fillBar(light({ charge: 10 }), [L.GEWITTERFRONT], { [L.GEWITTERFRONT]: 2 }, deck, order, 0).lightning.entladungMult).toBe(0);
    expect(fillBar(light({ charge: T.reststrom[3].bar }), [L.RESTSTROM], { [L.RESTSTROM]: 3 }, deck, order, 0).filled).toBe(true);
    expect(fillBar(light({ charge: T.reststrom[3].bar }), [L.RESTSTROM], { [L.RESTSTROM]: 2 }, deck, order, 0).filled).toBe(false);
  });
  it("fillBar: Kettenblitz vertieft (§7.18 Tiefe, §7.19 jede Leiste: die Karte mit den meisten Stapeln +Stapel der Stufe), Überspannung backt den Dauerwert, Doppelentladung 2 Stapel, Ionenfeld lädt das Feld", () => {
    const deck = constDeck(5), order = identity();
    expect(T.kette.every((r) => r.barEvery === 1)).toBe(true); // §7.19: jede Leiste, auch Normal
    const first = fillBar(light({ charge: 10, bars: 0 }), [L.KETTENBLITZ], {}, deck, order, 0); // schon die 1. Leiste: +Stapel auf die tiefste (die eben ionisierte)
    expect(first.stacks).toBe(1 + T.kette[0].extra); expect(first.deck[1].ionStacks).toBe(1 + T.kette[0].extra); expect(first.targets).toEqual([1]);
    const deepDeck = withStacks(5, 7, 3); // Karte 7 ist die tiefste → sie bekommt die Stapel der Stufe, die nächste Karte nur ihren einen
    const deep = fillBar(light({ charge: 10 }), [L.KETTENBLITZ], { [L.KETTENBLITZ]: 3 }, deepDeck, order, 0); // Episch (§7.22): die zweittiefste — hier die eben ionisierte — bekommt +1
    expect(deep.deck[1].ionStacks).toBe(1 + T.kette[3].second); expect(deep.deck[7].ionStacks).toBe(3 + T.kette[3].extra); expect(deep.stacks).toBe(1 + T.kette[3].extra + T.kette[3].second);
    expect(deep.targets).toEqual([1, 7]);
    const deepX = fillBar(light({ charge: 10 }), [L.KETTENBLITZ], { [L.KETTENBLITZ]: 2 }, deepDeck, order, 0); // Sehr selten: kein zweiter Empfänger
    expect(deepX.deck[1].ionStacks).toBe(1); expect(deepX.stacks).toBe(1 + T.kette[2].extra);
    expect(deepDeck[7].ionStacks).toBe(3); // Original unverändert
    // §7.24 (Owner): der Dauerwert je Leiste ist Passiv (ION_VALUE_PER_BAR), nicht mehr Überspannung — die ionisierte Karte trägt ihn, egal welche Skills.
    const uv = fillBar(light({ charge: 10 }), [L.UEBERSPANNUNG], { [L.UEBERSPANNUNG]: 3 }, deck, order, 0);
    expect(uv.deck[1].value).toBe(5 + C.ION_VALUE_PER_BAR); expect(uv.deck[1].ionStacks).toBe(1); expect(uv.deck[0].value).toBe(5);
    expect(fillBar(light({ charge: 10 }), [], {}, deck, order, 0).deck[1].value).toBe(5 + C.ION_VALUE_PER_BAR); // auch ohne Skill
    expect(C.ION_VALUE_PER_BAR).toBeGreaterThan(0);
    expect(deck[1].value).toBe(5); // Original unverändert
    const dbl = fillBar(light({ charge: 10 }), [L.DOPPELENTLADUNG], {}, deck, order, 0);
    expect(dbl.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    expect(fillBar(light({ charge: 10 }), [L.IONENFELD], {}, deck, order, 0).lightning.fieldLeft).toBe(T.ionenfeld[0].tricks);
    expect(fillBar(light({ charge: 10 }), [L.IONENFELD], { [L.IONENFELD]: 3 }, deck, order, 0).lightning.fieldLeft).toBe(T.ionenfeld[3].tricks);
    expect(fillBar(light({ charge: 10, fieldLeft: 2 }), [], {}, deck, order, 0).lightning.fieldLeft).toBe(2); // ohne Ionenfeld unberührt
  });
  it("lightningCycleEnd: der Serienschutz-Deckel füllt sich je Durchlauf wieder auf (§7.30)", () => {
    expect(lightningCycleEnd(light({ serienschutzRound: 2 })).serienschutzRound).toBe(0);
    const l = light();
    expect(lightningCycleEnd(l)).toBe(l);
    expect(lightningCycleEnd(null)).toBeNull();
  });
});

describe("Blitz — Engine-Integration (resolveTrick)", () => {
  it("Blitzfänger (§7.18): eine ionisierte Karte kämpft mit +Wert der Stufe (Selten +2) und gewinnt den knappen Stich; ohne Stapel nicht", () => {
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER], skillTiers: { [L.BLITZFAENGER]: 1 }, lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    expect(win.lastTrick.pValue).toBe(10 + T.faenger[1].value);
    const loss = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 0), skills: [L.BLITZFAENGER], skillTiers: { [L.BLITZFAENGER]: 1 }, lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
  });
  it("Kurzschluss: Stapel der Siegkarte zählen ab Schwelle doppelt — in der Basis", () => {
    const min = T.kurzschluss[0].minStacks;
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, min), skills: [L.KURZSCHLUSS], lightning: light() }), noCrit);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + min * C.ION_SCORE_PER_STACK * 2) * 1.02, 6);
    expect(s.lightYield).toBeCloseTo(min * C.ION_SCORE_PER_STACK * 2, 6);
  });
  it("Kurzschluss Episch (§7.22): die verlorene Karte ab Schwelle merkt ihren doppelten Stapel-Score vor, der nächste Sieg zahlt ihn in die Basis", () => {
    const tiers = { [L.KURZSCHLUSS]: 3 }, min = T.kurzschluss[3].minStacks;
    const loss = resolveTrick(scen(0, 12, { deck: withStacks(0, 0, min), skills: [L.KURZSCHLUSS], skillTiers: tiers, lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
    const bank = min * C.ION_SCORE_PER_STACK * T.kurzschluss[3].factor;
    expect(loss.lightning.stackBank).toBe(bank);
    const win = resolveTrick(scen(12, 0, { skills: [L.KURZSCHLUSS], skillTiers: tiers, lightning: light({ stackBank: bank }) }), noCrit);
    expect(win.lastTrick.scoreGain).toBeCloseTo((B + bank) * 1.02, 6);
    expect(win.lightning.stackBank).toBe(0);
    expect(win.lightYield).toBeCloseTo(bank, 6);
  });
  it("Lichtbogen (§7.28): die Stapel der gespielten Karte geben Crit-Chance auf diesen Stich, im Modul und in der Engine", () => {
    const card = { id: "X0", ionStacks: 4 };
    const passive = (n) => C.LIGHTNING_CRIT_SOCKET + n * C.LIGHTNING_CRIT_PER_SKILL; // §7.30: Sockel + Satz je Skill
    const base = passive(1); // ein gehaltener Blitz-Skill
    expect(lightningCritChance(light(), [L.LICHTBOGEN], {}, 0, card)).toBeCloseTo(base + 4 * T.lichtbogen[0].critPerStack, 9);
    expect(lightningCritChance(light(), [L.LICHTBOGEN], { [L.LICHTBOGEN]: 3 }, 0, card)).toBeCloseTo(base + 4 * T.lichtbogen[3].critPerStack, 9);
    expect(lightningCritChance(light(), [L.LICHTBOGEN], {}, 0, null)).toBeCloseTo(base, 9);   // ohne Karte nur das Passiv
    expect(lightningCritChance(light(), [L.KETTENBLITZ], {}, 0, card)).toBeCloseTo(base, 9);  // ohne den Skill nichts
    expect(lightningCritChance(light(), [L.LICHTBOGEN], {}, 0, { id: "X1" })).toBeCloseTo(base, 9); // Karte ohne Stapel
    // Kurzschluss zählt die Stapel ab seiner Schwelle doppelt — hier dieselbe Zählung wie beim Stapel-Score.
    const deep = { id: "X0", ionStacks: T.kurzschluss[0].minStacks };
    expect(lightningCritChance(light(), [L.LICHTBOGEN, L.KURZSCHLUSS], {}, 0, deep))
      .toBeCloseTo(passive(2) + 2 * deep.ionStacks * T.lichtbogen[0].critPerStack, 9);
    // Engine: die Chance des Stichs trägt die Stapel der gespielten Karte (Position 0).
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 10 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [L.LICHTBOGEN], deck, lightning: light() }), noCrit);
    expect(s.lastTrick.critChance).toBeCloseTo(base + 10 * T.lichtbogen[0].critPerStack, 6);
    const ohne = resolveTrick(scen(12, 0, { skills: [L.LICHTBOGEN], lightning: light() }), noCrit); // Karte ohne Stapel
    expect(ohne.lastTrick.critChance).toBeCloseTo(base, 6);
  });
  it("Reststrom Selten + Blitzableiter Sehr selten: volle Leiste → Boden 3 + 1 zurück", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER, L.RESTSTROM], skillTiers: { [L.ABLEITER]: 2, [L.RESTSTROM]: 1 }, lightning: light({ charge: 8 }) }), zero);
    expect(s.lightning.bars).toBe(1);
    expect(s.lightning.charge).toBe(T.reststrom[1].floor + T.ableiter[2].back);
  });
  it("Blitzableiter Episch (§7.18): jeder Sieg ohne Crit gibt +1 Ladung; Überschuss über der Leiste verfällt", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 3 }, lightning: light() }), noCrit);
    expect(s.lightning.charge).toBe(T.ableiter[3].noCritCharge);
    const over = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 3 }, lightning: light({ charge: 9 }) }), zero); // 9 + 2 = 11 → voll, der Rest verfällt
    expect(over.lightning.bars).toBe(1);
    expect(over.lightning.charge).toBe(T.ableiter[3].back);
  });
  it("Gewitterfront / Entladung: jede volle Leiste rampt dauerhaft, ohne Deckel", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.GEWITTERFRONT, L.ENTLADUNG], lightning: light({ charge: 9, stormCritBonus: 0.9, entladungScore: 3 }) }), zero);
    expect(s.lightning.stormCritBonus).toBeCloseTo(0.9 + T.gewitter[0].critPerBar, 9);
    expect(s.lightning.entladungScore).toBeCloseTo(3 + T.entladung[0].scorePerBar, 9);
  });
  /* §7.42 (Owner): Entladungs Episch-Extra ist mit ihr auf die Score-Achse gewandert — vorher verdoppelte es den
     Crit-Multiplikator des Leisten-füllenden Crits, jetzt zählt die RAMPE bei einem Crit doppelt. Der Wächter hält
     beide Seiten: die Verdopplung wirkt, und sie fasst den Multiplikator nicht mehr an. */
  it("Entladung Episch: die Rampe zählt bei einem Crit doppelt, der Crit-Multiplikator bleibt unberührt", () => {
    const ramp = 40;
    const base = { skills: [L.ENTLADUNG], skillTiers: { [L.ENTLADUNG]: 3 } };
    const crit = resolveTrick(scen(12, 0, { ...base, lightning: light({ charge: 5, entladungScore: ramp }) }), zero);
    const kein = resolveTrick(scen(12, 0, { ...base, lightning: light({ charge: 5, entladungScore: ramp }) }), noCrit);
    expect(crit.lastTrick.isCrit).toBe(true);
    expect(kein.lastTrick.isCrit).toBe(false);
    expect(crit.lastTrick.breakdown.flats - kein.lastTrick.breakdown.flats).toBe(ramp); // einmal Rampe extra
    expect(crit.lastTrick.critMultiplier).toBeCloseTo(M, 6);                            // und KEIN Multiplikator-Griff
    // Ohne Episch zahlt die Rampe auch im Crit nur einfach.
    const norm = resolveTrick(scen(12, 0, { skills: [L.ENTLADUNG], lightning: light({ charge: 5, entladungScore: ramp }) }), zero);
    expect(norm.lastTrick.breakdown.flats).toBe(kein.lastTrick.breakdown.flats);
  });
  it("Ladungsserie (§7.30): Ladung ab der Schwelle der Stufe, KEINE Crit-Chance mehr", () => {
    // Serie 4 (also 5 nach dem Sieg) liegt unter Normal-Schwelle 16 → keine Ladung, und die Chance ist reines Passiv.
    const s = resolveTrick(scen(12, 0, { skills: [L.LADUNGSSERIE], lightning: light(), winStreak: 4 }), noCrit);
    expect(s.lastTrick.critChance).toBeCloseTo(C.LIGHTNING_CRIT_SOCKET + C.LIGHTNING_CRIT_PER_SKILL, 6);
    expect(s.lightning.charge).toBe(0);
    // Serie über der Schwelle: +1 Ladung, die Chance bleibt dieselbe (der Skill zahlt nicht mehr auf sie).
    const long = resolveTrick(scen(12, 0, { skills: [L.LADUNGSSERIE], lightning: light(), winStreak: T.serie[0].chargeFromStreak }), noCrit);
    expect(long.lightning.charge).toBe(1);
    expect(long.lastTrick.critChance).toBeCloseTo(C.LIGHTNING_CRIT_SOCKET + C.LIGHTNING_CRIT_PER_SKILL, 6);
  });
  it("Ionenfeld (§7.18): die volle Leiste lädt das Feld, die nächsten Stiche kämpfen alle Karten mit +Wert, danach nicht mehr", () => {
    const charged = resolveTrick(scen(12, 0, { skills: [L.IONENFELD], lightning: light({ charge: 9 }) }), zero);
    expect(charged.lightning.bars).toBe(1); expect(charged.lightning.fieldLeft).toBe(T.ionenfeld[0].tricks); // der ladende Stich zählt nicht mit
    const win = resolveTrick(scen(10, 11, { skills: [L.IONENFELD], lightning: light({ fieldLeft: 1 }) }), noCrit);
    expect(win.lastTrick.result).toBe("win"); expect(win.lastTrick.pValue).toBe(10 + T.ionenfeld[0].value); expect(win.lightning.fieldLeft).toBe(0);
    const gone = resolveTrick({ ...win, phase: "play" }, noCrit); // das Feld ist verbraucht
    expect(gone.lastTrick.result).toBe("loss");
  });
  it("Vorentladung (§7.18): ab der Serie der Stufe +Crit-Multiplikator je Serienpunkt (Serie nach dem Sieg)", () => {
    const min = T.vorentladung[0].minStreak;
    const on = resolveTrick(scen(12, 0, { skills: [L.VORENTLADUNG], lightning: light(), winStreak: min - 1 }), zero); // Serie nach dem Sieg = min
    expect(on.lastTrick.isCrit).toBe(true);
    expect(on.lastTrick.critMultiplier).toBeCloseTo(M + min * T.vorentladung[0].multPerStreak, 6);
    const off = resolveTrick(scen(12, 0, { skills: [L.VORENTLADUNG], lightning: light(), winStreak: min - 2 }), zero);
    expect(off.lastTrick.critMultiplier).toBeCloseTo(M, 6);
  });
  it("Kettenblitz Selten (§7.18): jede volle Leiste ionisiert die nächste Karte UND vertieft die tiefste", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 5, 2), skills: [L.KETTENBLITZ], skillTiers: { [L.KETTENBLITZ]: 1 }, lightning: light({ charge: 9 }) }), zero);
    expect(s.deck[1].ionStacks).toBe(1); expect(s.deck[5].ionStacks).toBe(2 + T.kette[1].extra); expect(s.deck[2].ionStacks || 0).toBe(0);
    expect(s.ionTotal).toBe(1 + T.kette[1].extra);
  });
  it("Blitzschlag Episch: jeder 2. Crit ionisiert die Siegkarte (§7.18: zwei Stapel)", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light({ critCount: 1 }) }), zero);
    expect(s.deck[0].ionStacks).toBe(T.blitzschlag[3].stacks);
    const first = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light() }), zero);
    expect(first.deck[0].ionStacks || 0).toBe(0);
  });
  /* §7.51 (Owner): "lass den blitz mult raus. Blitz nutzt schon crit als mult". Die Fraktion hat KEINEN eigenen
     Faktor im Score-Produkt — ihre Multiplikator-Achse IST der Crit-Multiplikator, den jeder Stapel über
     ION_CRIT_MULT_PER_STACK speist. §7.43 hatte daneben einen zweiten gestellt (`lightMult`), und zwei Achsen an
     derselben Ressource ergaben das kubische Wachstum aus §7.46 C. Der Wächter hält beide Hälften fest: keine
     zweite Achse im Breakdown, und die Stapel zahlen weiterhin in den Crit-Multiplikator. */
  it("Blitz hat keinen eigenen Faktor im Score-Produkt (§7.51) — der Crit-Multiplikator ist seine Achse", () => {
    const forms = computeFormations(identity(), constDeck(12));
    const deck = constDeck(12).map((c, i) => ({ ...c, ionStacks: { 0: 2, 1: 4, 2: 3, 4: 1 }[i] || 0 }));
    const s = resolveTrick(scen(12, 0, { pos: 1, deck, formations: forms, lightning: light(), skills: [L.KETTENBLITZ] }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    // Kein Blitz-Multiplikator im Breakdown: weder unter dem alten Namen noch unter einem neuen neben den anderen.
    expect(s.lastTrick.breakdown.lightMult).toBeUndefined();
    expect(Object.keys(s.lastTrick.breakdown).filter((k) => /Mult$/.test(k)).sort())
      .toEqual(["afterglowMult", "architectMult", "coreMult", "critMult", "fireMult", "formMult", "perkMult", "plantMult", "streakMult", "strikeMult"]);
    // Die Achse, die Blitz WIRKLICH hat: jeder Stapel der Siegkarte hebt den Crit-Multiplikator.
    const crit = resolveTrick(scen(12, 0, { pos: 1, deck, formations: forms, lightning: light(), skills: [L.KETTENBLITZ] }), zero);
    expect(crit.lastTrick.isCrit).toBe(true);
    expect(crit.lastTrick.critMultiplier).toBeGreaterThan(C.CRIT_BASE_MULT);
  });
  it("Überschuss über 100 %: nur noch die Systemregel (klein) hebt den Crit-Multiplikator — Überschlag ist gestrichen (§7.19)", () => {
    // §7.30: ein aktiver Blitz trägt den Sockel auch ohne Skill, der Überschuss ist also Sockel + Rampe − 100 %.
    const rule = resolveTrick(scen(12, 0, { lightning: light({ stormCritBonus: 1.5 }) }), zero); // Gewitterfront-Rampe als synthetische Quelle
    expect(rule.lastTrick.isCrit).toBe(true);
    expect(rule.lastTrick.critMultiplier).toBeCloseTo(M + Math.round((C.LIGHTNING_CRIT_SOCKET + 1.5 - 1) * 100) * C.OVERCRIT_MULT_PER_PP, 6);
    const pp = Math.round((C.LIGHTNING_CRIT_SOCKET + C.LIGHTNING_CRIT_PER_SKILL + 1.5 - 1) * 100); // Sockel + ein Blitz-Skill + 1,5 → Punkte über 100
    const withSkill = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], lightning: light({ stormCritBonus: 1.5 }) }), zero);
    expect(withSkill.lastTrick.critMultiplier).toBeCloseTo(M + pp * C.OVERCRIT_MULT_PER_PP, 6); // kein Skill-Term mehr auf dem Überschuss
  });
  it("Serienschutz: die Niederlage kostet den festen Preis und hält die Serie; der Deckel je Durchlauf bindet, das Durchlauf-Ende hebt ihn auf (§7.30)", () => {
    const { cost, perRound } = T.serienschutz[0];
    const held = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: cost + 1 }) }), noCrit);
    expect(held.lastTrick.result).toBe("loss");
    expect(held.winStreak).toBe(4);
    expect(held.lightning.charge).toBe(1);
    expect(held.lightning.serienschutzRound).toBe(1); // eine von perRound Auslösungen verbraucht
    const broke = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: cost - 1 }) }), noCrit);
    expect(broke.winStreak).toBe(0);
    // Zweite Niederlage im selben Durchlauf: Ladung genug, Deckel voll → die Serie bricht und nichts wird bezahlt.
    // (Ladung 9, nicht 10 — bei voller Leiste zündete sie und die Ladung wäre ohnehin weg.)
    const capped = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: 9, serienschutzRound: perRound }) }), noCrit);
    expect(capped.winStreak).toBe(0);
    expect(capped.lightning.charge).toBe(9);
    // Der letzte Stich eines Durchlaufs setzt den Deckel zurück (lightningCycleEnd über die Engine).
    const endOfRound = resolveTrick(scen(0, 12, { pos: 39, skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: cost + 1, serienschutzRound: perRound }) }), noCrit);
    expect(endOfRound.lightning.serienschutzRound).toBe(0);
  });
  it("volle Leiste zündet auch auf einer Niederlage (Ladung, die ein Stich über der Leiste hinterlässt)", () => {
    const s = resolveTrick(scen(0, 12, { skills: [L.ABLEITER], lightning: light({ charge: 10 }) }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.lightning.charge).toBe(0);
    expect(s.lightning.bars).toBe(1);
    expect(s.deck[1].ionStacks).toBe(1);
  });
  it("Doppelentladung: 2 Stapel je Ionisierung; Crit mit ionisierter Karte zählt den Stich doppelt", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 1), skills: [L.DOPPELENTLADUNG], lightning: light({ charge: 9 }) }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.breakdown.strikeMult).toBe(C.DOPPELENTLADUNG_STRIKE);
    // §7.12: der eine Stapel der Siegkarte hebt auch den Crit-Multiplikator (+ION_CRIT_MULT_PER_STACK).
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + C.ION_SCORE_PER_STACK) * 1.02 * (M + C.ION_CRIT_MULT_PER_STACK) * C.DOPPELENTLADUNG_STRIKE, 6);
    expect(s.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    const plain = resolveTrick(scen(12, 0, { skills: [L.DOPPELENTLADUNG], lightning: light() }), zero); // nicht ionisiert → kein Doppelschlag
    expect(plain.lastTrick.breakdown.strikeMult).toBe(1);
  });
  it("Stapel der Siegkarte heben den Crit-Multiplikator (§7.12): +ION_CRIT_MULT_PER_STACK je Stapel, Kurzschluss zählt ab der Schwelle doppelt", () => {
    // Ein Blitz-Skill, damit die Crit-Chance > 0 ist (rng 0 → Crit); Blitzableiter selbst rührt den Multiplikator nicht an.
    const three = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 3), skills: [L.ABLEITER], lightning: light() }), zero);
    expect(three.lastTrick.isCrit).toBe(true);
    expect(three.lastTrick.critMultiplier).toBeCloseTo(M + 3 * C.ION_CRIT_MULT_PER_STACK, 6);
    expect(three.lastTrick.scoreGain).toBeCloseTo((B + 3 * C.ION_SCORE_PER_STACK) * 1.02 * (M + 3 * C.ION_CRIT_MULT_PER_STACK), 6);
    const none = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], lightning: light() }), zero);
    expect(none.lastTrick.critMultiplier).toBeCloseTo(M, 6);
    expect(ionCritMultFor({ ionStacks: 3 })).toBeCloseTo(3 * C.ION_CRIT_MULT_PER_STACK, 9);
    expect(ionCritMultFor({ ionStacks: 0 })).toBe(0);
    const min = T.kurzschluss[0].minStacks;
    expect(ionCritMultFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBeCloseTo(min * T.kurzschluss[0].factor * C.ION_CRIT_MULT_PER_STACK, 9);
    expect(ionScoreFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBe(min * T.kurzschluss[0].factor * C.ION_SCORE_PER_STACK); // dieselbe Zählung
  });
  it("Hochspannung: gehaltene Blitz-Skills wirken um HOCHSPANNUNG_STEPS höher (Blitzfänger Normal kämpft mit dem Wert der gehobenen Stufe)", () => {
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER, L.HOCHSPANNUNG], lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    const lifted = T.faenger[Math.min(3, C.HOCHSPANNUNG_STEPS)];
    expect(win.lastTrick.pValue).toBe(10 + lifted.value + (lifted.perStack || 0) * 1); // eine Ionisierung auf der Karte
    const plain = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER], lightning: light() }), noCrit);
    expect(plain.lastTrick.pValue).toBe(10 + T.faenger[0].value);
    expect(plain.lastTrick.result).not.toBe("win");
  });
  it("Resonanz (§7.25, ersetzt Durchschlag): die Karten einer Formation teilen ihre Stapel — die Siegkarte kämpft mit der Summe (Stapel-Score, Crit-Multiplikator je Stapel, Blitzfänger); ohne Formation nur die eigenen", () => {
    expect(SKILL_DEFS.SK_LIGHTNING_L04.name).toBe("Resonanz");
    // constDeck: gleiche Werte → Wiederholungs-Läufe je Segment (Positionen 0–4, 5–9, …); computeFormations liefert die Mitglieder.
    const forms = computeFormations(identity(), constDeck(12));
    expect(forms[1].formations.find((f) => f.type === "wiederholung").members).toEqual([0, 1, 2, 3, 4]);
    expect(forms[7].formations.find((f) => f.type === "wiederholung").members).toEqual([5, 6, 7, 8, 9]);
    // Stapel auf den Nachbarn im Segment (0: 2, 2: 3, 4: 1) und auf einer Karte außerhalb (7: 5); gespielt wird Position 1 (eigene 1).
    const deck = constDeck(12).map((c, i) => ({ ...c, ionStacks: { 0: 2, 1: 1, 2: 3, 4: 1, 7: 5 }[i] || 0 }));
    const pooled = 1 + Math.floor((2 + 3 + 1) * C.RESONANZ_SHARE); // eigene Stapel plus der Anteil der anderen Mitglieder, abgerundet (Stapel sind ganz)
    const at1 = (over) => scen(12, 0, { pos: 1, deck, formations: forms, lightning: light(), ...over }); // pos 1: die Engine liest state.formations
    const r = resolveTrick(at1({ skills: [L.RESONANZ] }), noCrit);
    expect(r.lastTrick.result).toBe("win");
    expect(r.lightYield).toBe(pooled * C.ION_SCORE_PER_STACK);
    expect(r.deck[1].ionStacks).toBe(1); // die echte Karte behält ihre Stapel
    expect(resolveTrick(at1({ skills: [L.KETTENBLITZ] }), noCrit).lightYield).toBe(1 * C.ION_SCORE_PER_STACK); // ohne Resonanz nur die eigenen
    const crit = resolveTrick(at1({ skills: [L.RESONANZ] }), zero);
    expect(crit.lastTrick.isCrit).toBe(true);
    expect(crit.lastTrick.critMultiplier).toBeCloseTo(C.CRIT_BASE_MULT + pooled * C.ION_CRIT_MULT_PER_STACK, 9);
    const bf = resolveTrick(at1({ skills: [L.RESONANZ, L.BLITZFAENGER], skillTiers: { [L.BLITZFAENGER]: 3 } }), noCrit); // Episch: +1 je Stapel — mit der Summe
    expect(bf.lastTrick.pValue).toBe(12 + T.faenger[3].value + T.faenger[3].perStack * pooled);
    // Ohne Formation nur die eigenen Stapel: Werte 5/7 im Wechsel bilden keinen Lauf (Wechsel braucht Abstand 4).
    const loose = constDeck(12).map((c, i) => ({ ...c, value: i % 2 ? 7 : 5, baseRank: i % 2 ? 7 : 5, ionStacks: i === 1 ? 1 : 2 }));
    const looseForms = computeFormations(identity(), loose);
    expect(looseForms[1].formations).toEqual([]);
    const l = resolveTrick(scen(7, 0, { pos: 1, deck: loose, formations: looseForms, skills: [L.RESONANZ], lightning: light() }), noCrit);
    expect(l.lastTrick.result).toBe("win");
    expect(l.lightYield).toBe(1 * C.ION_SCORE_PER_STACK);
    // Durchschlag gibt es nicht mehr: eine Niederlage bleibt eine Niederlage, auch mit Crit-Wurf 0.
    const loss = resolveTrick(scen(0, 12, { skills: [L.RESONANZ], lightning: light(), winStreak: 3 }), zero);
    expect(loss.lastTrick.result).toBe("loss"); expect(loss.winStreak).toBe(0); expect(loss.lastTrick.durchschlag).toBeUndefined();
  });
  it("kein Direkt-Score aus Blitz: lightDirect bleibt 0", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 9), skills: [L.KURZSCHLUSS, L.DOPPELENTLADUNG], lightning: light() }), zero);
    expect(s.lastTrick.breakdown.lightDirect).toBe(0);
  });
});
