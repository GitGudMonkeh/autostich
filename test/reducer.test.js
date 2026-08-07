import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
// (#267: STAT_IDS/stats.js entfernt — die Stat-Phase ist weg; Runde 1 ist ein Skill.)
import { computeFormations, formationPotential } from "../src/game/formations.js";
import { FORMATION_START_MIN, FORMATION_START_MAX } from "../src/game/constants.js";

const rng = makeRng(1);

describe("Reducer", () => {
  it("initialState: play-Phase, kein Leben mehr (V2), leerer Build (Basis-State)", () => {
    const s = initialState(makeRng(1));
    expect(s.phase).toBe("play");
    expect(s.life).toBeUndefined(); // V2: Leben restlos entfernt
    expect(s.perks).toEqual([]);
    expect(s.deck).toHaveLength(40);
  });

  it("Startdeck-Formations-Band (#Pass6): playerOrder-Potential liegt im Band, deterministisch", () => {
    for (const seed of [1, 2, 3, 7, 42, 123, 777]) {
      const s = initialState(makeRng(seed));
      const pot = formationPotential(s.playerOrder, s.deck);
      expect(pot).toBeGreaterThanOrEqual(FORMATION_START_MIN);
      expect(pot).toBeLessThanOrEqual(FORMATION_START_MAX);
    }
    // gleicher Seed → identische Anordnung (Rejection-Sampling bleibt deterministisch)
    expect(initialState(makeRng(5)).playerOrder).toEqual(initialState(makeRng(5)).playerOrder);
    // #156: verschiedene Seeds → (meist) verschiedene Anordnung — der Seed treibt das Sampling wirklich.
    const orders = new Set([5, 6, 7, 11].map((s) => initialState(makeRng(s)).playerOrder.join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  // Deck-Mods beim Pick (früher flache Kat.-A-Perks) sind zu KUMULATIVEN Familien migriert (#167) — der
  // Familien-Pick + Ziel-Fluss ist in test/families-engine.test.js geprüft; PICK_PERK verändert das Deck nicht mehr.
  it("PICK_PERK ignoriert Perks außerhalb des Angebots", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "L_VAB", rng })).toBe(s0); // nicht im Angebot → No-Op
  });

  it("L_UMV Umverteilung: PICK_PERK setzt alle Karten dauerhaft auf den Deck-Durchschnitt und geht direkt in play (#203)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV"] };
    const deckLen = s.deck.length;
    const avg = Math.round(s.deck.reduce((t, c) => t + c.value, 0) / deckLen);
    s = reducer(s, { type: "PICK_PERK", perkId: "L_UMV", rng: makeRng(1) });
    expect(s.phase).toBe("play");                             // kein Ziel-Schritt
    expect(s.perks).toEqual(["L_UMV"]);
    expect(s.deck.every((c) => c.value === avg)).toBe(true);  // alle Karten auf den Durchschnitt
    expect(s.deck).toHaveLength(deckLen);                     // KEINE Karte entfernt
  });

  it("RESET beginnt einen frischen Lauf mit Start-Pick = Skill (#267, Runde 1 Blind-Commit)", () => {
    const dirty = { ...initialState(makeRng(1)), score: 999, perks: ["L2", "L4"] };
    const fresh = reducer(dirty, { type: "RESET", rng });
    expect(fresh.score).toBe(0);
    expect(fresh.perks).toEqual([]);
    expect(fresh.phase).toBe("levelup"); // Start-Entscheidung (Runde 1) = Skill
    expect(Array.isArray(fresh.skillOffer)).toBe(true);
    expect(fresh.skillOffer.length).toBeGreaterThan(0);
    expect(fresh.offer).toBeNull();
  });

  it("START_RUN startet aus dem Menü einen frischen Lauf mit Start-Pick = Skill", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng });
    expect(s.phase).toBe("levelup");
    expect(Array.isArray(s.skillOffer)).toBe(true);
    expect(s.skillOffer.length).toBeGreaterThan(0);
    expect(s.offer).toBeNull();
    expect(s.trickNo).toBe(0);
    expect(s.perks).toEqual([]);
  });

  it("TO_MENU verlässt den Lauf zurück ins Menü", () => {
    expect(reducer(initialState(makeRng(1)), { type: "TO_MENU" }).phase).toBe("menu");
  });
});

describe("PICK_PERK — nach jeder Runde zurück in play (Neuer Loop)", () => {
  it("Wahl aus dem levelup-Angebot → play, offer null, Perk übernommen", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L2", rng }); // L2: cardBonus, kein needsTarget → direkt play
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
    expect(s1.perks).toEqual(["L2"]);
  });
});

describe("END_RUN — Beenden → Endscreen", () => {
  it("aus dem laufenden Spiel → gameover (Score/State bleiben für den Endscreen erhalten)", () => {
    const play = { ...initialState(makeRng(1)), score: 1234, trickNo: 50 };
    const r = reducer(play, { type: "END_RUN" });
    expect(r.phase).toBe("gameover");
    expect(r.score).toBe(1234);
    expect(r.trickNo).toBe(50);
  });
  it("aus Menü/gameover unberührt (kein Effekt)", () => {
    const menu = menuState();
    expect(reducer(menu, { type: "END_RUN" })).toBe(menu);
    const over = { ...initialState(makeRng(1)), phase: "gameover" };
    expect(reducer(over, { type: "END_RUN" })).toBe(over);
  });
});

// (#267: „Stat-Auswahl — PICK_STAT"-Suite entfernt — es gibt keine Stat-Phase mehr. Crit-Perks (Präzision-Familien)
//  laufen über den normalen PICK_FAMILY-Fluss und sind in families(-engine).test.js abgedeckt.)

describe("Skill-Auswahl — PICK_SKILL / DECLINE_SKILL (Stufe A)", () => {
  const LR = "SK_LIGHTNING_01";
  const skillState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: [LR], ...over });

  it("PICK_SKILL fügt den Skill hinzu, aktiviert den Blitz-Archetyp und kehrt in play zurück", () => {
    const s = reducer(skillState(), { type: "PICK_SKILL", skillId: LR, rng });
    expect(s.phase).toBe("play");
    expect(s.skillOffer).toBeNull();
    expect(s.skills).toEqual([LR]);
    expect(s.lightning.active).toBe(true);
    expect(s.activeArchetypes).toEqual(["lightning"]);
  });

  it("PICK_SKILL ignoriert Skills außerhalb des Angebots und bereits gehaltene", () => {
    const s0 = skillState();
    expect(reducer(s0, { type: "PICK_SKILL", skillId: "SK_UNKNOWN", rng })).toBe(s0);
    const held = skillState({ skills: [LR], lightning: { active: true, charge: 0, maxCharge: 10 } });
    expect(reducer(held, { type: "PICK_SKILL", skillId: LR, rng })).toBe(held);
  });

  it("PICK_SKILL bei vollen Slots: ohne replaceId no-op, mit gültigem Ziel wird ersetzt (#95)", () => {
    // SKILL_SLOTS = 6 (echtes Spiel): volle Slots = 6 gehaltene Skills. Nur 02 (Ionisierung) ist Konsument.
    const six = ["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06"];
    const NEW = "SK_LIGHTNING_10"; // Entladung — kein Konsument, kollidiert also nicht mit dem verbleibenden 02
    const full = skillState({ skills: six, skillOffer: [NEW], lightning: { active: true, charge: 0, maxCharge: 10 } });
    // ohne Ersetzungsziel → unverändert (das war der Bug: bei vollen Slots tat der Klick nichts)
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, rng })).toBe(full);
    // ungültiges Ziel (nicht gehalten) → unverändert
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_09", rng })).toBe(full);
    // gültiges Ziel → ersetzt genau diesen Slot, Reihenfolge bleibt, zurück in play
    const s = reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_04", rng });
    expect(s.skills).toEqual(["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", NEW, "SK_LIGHTNING_05", "SK_LIGHTNING_06"]);
    expect(s.phase).toBe("play");
  });

  it("#288 Trimmen: Ersetzen eines Wachstums-Skills erhöht trimCount; ein anderer Skill nicht", () => {
    const six = ["SK_PLANT_09", "SK_PLANT_02", "SK_PLANT_05", "SK_PLANT_10", "SK_PLANT_12", "SK_PLANT_13"]; // SK_PLANT_05 = Aussaat (trimmbar)
    const NEW = "SK_PLANT_14"; // Überwucherung — nicht gehalten, kein Enabler
    const base = skillState({ skills: six, skillOffer: [NEW], activeArchetypes: ["plant"] });
    // Wachstums-Skill (Aussaat) ersetzt → Trimmung
    expect(reducer(base, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_PLANT_05", rng }).trimCount).toBe(1);
    // Nicht-Wachstums-Skill (Wurzeltiefe) ersetzt → keine Trimmung
    expect(reducer(base, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_PLANT_02", rng }).trimCount || 0).toBe(0);
  });

  it("#234 PICK_SKILL erlaubt einen ZWEITEN Hitze-Konsumenten (Feuer nicht mehr exklusiv)", () => {
    // Flächenbrand (SK_FIRE_11, conflagration) schon gehalten; Schmelzpunkt (SK_FIRE_12, melt) im Angebot.
    const st = skillState({
      skills: ["SK_FIRE_11"], activeArchetypes: ["fire"],
      skillOffer: ["SK_FIRE_12"], heat: { active: true, value: 0, max: 100 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_FIRE_12", rng });
    expect(s.skills).toContain("SK_FIRE_11");
    expect(s.skills).toContain("SK_FIRE_12"); // beide Hitze-Konsumenten gleichzeitig gehalten
  });

  it("#234-Reshape v0: Ladungsserie ist KEIN Ladungs-Konsument mehr → frei neben Ionisierung wählbar", () => {
    // Rework v0: nur noch Ionisierung (SK_LIGHTNING_02) verbraucht Ladung; Ladungsserie (SK_LIGHTNING_07)
    // speist die Crit-Maschine und unterliegt keiner Konsument-Exklusivität → beide zusammen haltbar.
    const st = skillState({
      skills: ["SK_LIGHTNING_02"], activeArchetypes: ["lightning"],
      skillOffer: ["SK_LIGHTNING_07"], lightning: { active: true, charge: 0, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_07", rng });
    expect(s.skills).toContain("SK_LIGHTNING_07");
    expect(s.skills).toContain("SK_LIGHTNING_02"); // keine Exklusivität — Ladungsserie verbraucht nichts
  });

  it("PICK_SKILL erlaubt einen dritten Archetyp (Prototyp: Cap 3 aufgehoben)", () => {
    // Zwei Archetypen schon aktiv (mit gehaltenen Skills) → ein Blitz-Skill ist der dritte und jetzt WÄHLBAR.
    const twoActive = skillState({ skills: ["SK_FIRE_01", "SK_ICE_01"], activeArchetypes: ["fire", "ice"], skillOffer: [LR] });
    const s = reducer(twoActive, { type: "PICK_SKILL", skillId: LR, rng });
    expect(s.skills).toContain(LR);
    expect(s.activeArchetypes).toEqual(["fire", "ice", "lightning"]);
  });

  it("#140 letzter Feuer-Skill ersetzt → Hitzeleiste weg, Feuer deaktiviert (Blitz bleibt)", () => {
    const st = skillState({
      skills: ["SK_FIRE_01", "SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04"],
      skillOffer: ["SK_LIGHTNING_05"], activeArchetypes: ["fire", "lightning"],
      heat: { active: true, value: 60, max: 100 }, lightning: { active: true, charge: 4, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_05", replaceId: "SK_FIRE_01", rng });
    expect(s.skills).not.toContain("SK_FIRE_01");
    expect(s.heat).toBeNull();
    expect(s.activeArchetypes).toEqual(["lightning"]);
    expect(s.lightning.active).toBe(true);
  });

  it("#140 letzter Eis-Skill ersetzt → Eis deaktiviert (Gletscher-State + Blitzfänger-Temp geleert)", () => {
    const base = initialState(makeRng(1));
    const st = { ...base, phase: "levelup",
      skills: ["SK_ICE_01", "SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04"],
      skillOffer: ["SK_LIGHTNING_05"], activeArchetypes: ["ice", "lightning"],
      lightning: { active: true, charge: 2, maxCharge: 10 },
      iceTemp: { x: 3 }, glacierRoles: ["G_ANFRIEREN"] };
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_05", replaceId: "SK_ICE_01", rng });
    expect(s.skills).not.toContain("SK_ICE_01");
    expect(s.activeArchetypes).toEqual(["lightning"]);
    expect(s.iceTemp).toEqual({});         // Blitzfänger-Temp beim Eis-Deaktivieren geleert
    expect(s.glacierRoles).toEqual([]);    // Gletscher-Rollen weg
  });

  it("#140 letzter Blitz-Skill ersetzt → Ladungsleiste zurückgesetzt/inaktiv", () => {
    const st = skillState({
      skills: ["SK_LIGHTNING_01", "SK_ICE_01", "SK_ICE_03", "SK_ICE_04"],
      skillOffer: ["SK_ICE_05"], activeArchetypes: ["lightning", "ice"],
      lightning: { active: true, charge: 8, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_ICE_05", replaceId: "SK_LIGHTNING_01", rng });
    expect(s.skills).not.toContain("SK_LIGHTNING_01");
    expect(s.lightning.active).toBe(false);
    expect(s.lightning.charge).toBe(0);
    expect(s.activeArchetypes).toEqual(["ice"]);
  });

  it("#140 gleicher Archetyp ersetzt (nicht der letzte) → Leiste bleibt erhalten", () => {
    const st = skillState({
      skills: ["SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_ICE_01", "SK_ICE_03"],
      skillOffer: ["SK_LIGHTNING_04"], activeArchetypes: ["lightning", "ice"],
      lightning: { active: true, charge: 6, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_04", replaceId: "SK_LIGHTNING_03", rng });
    expect(s.lightning.active).toBe(true);
    expect(s.lightning.charge).toBe(6);
    expect(new Set(s.activeArchetypes)).toEqual(new Set(["lightning", "ice"]));
  });

  it("DECLINE_SKILL tauscht das Skill-Angebot gegen ein Perk-Angebot (Runde nicht verschwendet)", () => {
    const s = reducer(skillState(), { type: "DECLINE_SKILL", rng });
    expect(s.phase).toBe("levelup");
    expect(s.skillOffer).toBeNull();
    expect(s.offer).toHaveLength(3);
  });

  it("PICK_SKILL/DECLINE_SKILL sind außerhalb der Skill-Auswahl wirkungslos", () => {
    const play = initialState(makeRng(1)); // phase play, kein skillOffer
    expect(reducer(play, { type: "PICK_SKILL", skillId: LR, rng })).toBe(play);
    expect(reducer(play, { type: "DECLINE_SKILL", rng })).toBe(play);
  });
});

// Eis-Neudesign: Frostwahl/frost-select-Fluss entfernt — der neue Eis-Archetyp friert keine Karten mehr ein
// (Mechanik über Masse/Gletscher). PICK_SKILL eines Eis-Skills seedet stattdessen state.glacierRoles (siehe engine/glacier).
describe("Eis-Neudesign — PICK_SKILL seedet glacierRoles", () => {
  it("ein Eis-Skill aktiviert den Eis-Archetyp und trägt seine Rolle in glacierRoles", () => {
    const s = reducer({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: ["SK_ICE_01"] }, { type: "PICK_SKILL", skillId: "SK_ICE_01", rng });
    expect(s.phase).toBe("glacier-target"); // Eis-Skill-Pick öffnet die Gletscher-Wahl
    expect(s.activeArchetypes).toContain("ice");
    expect(s.glacierRoles).toContain("G_ANFRIEREN"); // SK_ICE_01 = Anfrieren
    expect(s.deck.some((c) => c.frozen)).toBe(false); // KEIN Einfrieren mehr
  });
});

describe("DECLINE_PERK — Perk-Angebot ablehnen (#138)", () => {
  const perkLevelup = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"], ...over });

  it("verwirft das Angebot und kehrt in play zurück", () => {
    const s = reducer(perkLevelup(), { type: "DECLINE_PERK" });
    expect(s.phase).toBe("play");
    expect(s.offer).toBeNull();
  });

  it("ist außerhalb der Perk-Auswahl wirkungslos (falsche Phase oder kein Angebot)", () => {
    const play = { ...initialState(makeRng(1)), phase: "play", offer: null };
    expect(reducer(play, { type: "DECLINE_PERK" })).toBe(play);
    const noOffer = { ...initialState(makeRng(1)), phase: "levelup", offer: null };
    expect(reducer(noOffer, { type: "DECLINE_PERK" })).toBe(noOffer);
  });

  it("funktioniert auch ohne shop-State", () => {
    const s = reducer(perkLevelup({ shop: undefined }), { type: "DECLINE_PERK" });
    expect(s.offer).toBeNull();
    expect(s.phase).toBe("play");
  });
});

describe("Formationsphase — SWAP/UNDO/RESET/CONFIRM (V2 §22.8)", () => {
  // 5 Karten (ein Segment). Werte 5,8,5,2,3 → ohne Formation; Tausch von Pos 1↔2 baut ein Wiederholungspaar (5,5).
  const deck = [
    { id: "a", suit: "R", baseRank: 5, value: 5 },
    { id: "b", suit: "B", baseRank: 8, value: 8 },
    { id: "c", suit: "G", baseRank: 5, value: 5 },
    { id: "d", suit: "Y", baseRank: 2, value: 2 },
    { id: "e", suit: "R", baseRank: 3, value: 3 },
  ];
  const formState = (over = {}) => ({
    ...initialState(makeRng(1)), phase: "formation", deck,
    playerOrder: [0, 1, 2, 3, 4], formationEnergy: 4, formationSwaps: [],
    formations: computeFormations([0, 1, 2, 3, 4], deck), ...over,
  });

  it("SWAP_CARDS tauscht, kostet 1 Energie, merkt den Tausch, berechnet Formationen neu", () => {
    const s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    expect(s.playerOrder).toEqual([0, 2, 1, 3, 4]);      // Werte jetzt 5,5,8,2,3
    expect(s.formationEnergy).toBe(3);
    expect(s.formationSwaps).toEqual([{ i: 1, j: 2, idA: "b", idB: "c" }]); // #201.4: getauschte Karten-IDs
    expect(s.formations[1].mult).toBeCloseTo(1.25);      // 2. Karte des neuen Wiederholungspaars
  });
  it("SWAP_CARDS ohne Energie oder mit i==j ist wirkungslos", () => {
    const noE = formState({ formationEnergy: 0 });
    expect(reducer(noE, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(noE);
    const s0 = formState();
    expect(reducer(s0, { type: "SWAP_CARDS", i: 2, j: 2 })).toBe(s0);
  });
  it("UNDO_SWAP macht den letzten Tausch rückgängig und erstattet Energie", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    s = reducer(s, { type: "UNDO_SWAP" });
    expect(s.playerOrder).toEqual([0, 1, 2, 3, 4]);
    expect(s.formationEnergy).toBe(4);
    expect(s.formationSwaps).toEqual([]);
  });
  it("RESET_FORMATION nimmt alle Tausche zurück und stellt die volle Energie her", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 0, j: 1 });
    s = reducer(s, { type: "SWAP_CARDS", i: 2, j: 3 });
    expect(s.formationEnergy).toBe(2);
    s = reducer(s, { type: "RESET_FORMATION" });
    expect(s.playerOrder).toEqual([0, 1, 2, 3, 4]);
    expect(s.formationEnergy).toBe(4);
    expect(s.formationSwaps).toEqual([]);
  });
  it("CONFIRM_FORMATION geht in play, die aufgestellte Reihenfolge bleibt", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    s = reducer(s, { type: "CONFIRM_FORMATION" });
    expect(s.phase).toBe("play");
    expect(s.playerOrder).toEqual([0, 2, 1, 3, 4]);
    expect(s.formationEnergy).toBe(0);
  });
  it("Aktionen außerhalb der Formationsphase sind wirkungslos", () => {
    const play = initialState(makeRng(1));
    expect(reducer(play, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(play);
    expect(reducer(play, { type: "CONFIRM_FORMATION" })).toBe(play);
  });
});

// Kat.-C-Rollen (inkl. C9 Opfergabe) sind zu Familien migriert (#167) → laufen über den Familien-Ziel-Fluss
// (FAMILY_TARGET_*, geprüft in families-engine.test.js). Die Ziel-Legendären (L1 Überladung / L9 Blutvertrag,
// needsTarget/permMod) sind im Legendär-Perks-Rework (#203) entfernt; der einzige deck-umformende Legendär ist jetzt
// Umverteilung (L_UMV, KEIN Ziel-Schritt, oben geprüft). Das flache CONFIRM_TARGET/needsTarget bleibt als (aktuell
// ungenutzte) Reducer-Infrastruktur für die spätere UI (TargetSelect) erhalten.

describe("RESOLVE_TRICK — Reducer-Dispatch (#158)", () => {
  it("dispatcht auf resolveTrick und reicht action.rng durch", () => {
    const play = initialState(makeRng(1)); // phase play
    // Bislang riefen alle Engine-Tests resolveTrick direkt auf; die Case-Verdrahtung + action.rng-Weitergabe im
    // Reducer war ungetestet. Gleiche Eingaben (frischer rng gleichen Seeds) → deep-gleiches Ergebnis.
    const viaReducer = reducer(play, { type: "RESOLVE_TRICK", rng: makeRng(3) });
    expect(viaReducer).toEqual(resolveTrick(play, makeRng(3)));
    expect(viaReducer.lastTrick).toBeTruthy();          // ein Stich wurde aufgelöst
    expect(viaReducer.trickNo).toBe((play.trickNo || 0) + 1);
  });
  it("außerhalb der play-Phase No-Op (resolveTrick gibt den State zurück)", () => {
    const menu = { ...initialState(makeRng(1)), phase: "menu" };
    expect(reducer(menu, { type: "RESOLVE_TRICK", rng })).toBe(menu);
  });
});

// (#267: „PICK_STAT — Formations-/Crit-Mult-Felder"-Suite entfernt — die Stat-Phase ist weg.)

// #261: ARCHITECT_RECOLOR — Buff-Farbe eines colorLocked-Gebäudes in der Arrange-Phase anpassen (wie MOVE, kein actedMain).
describe("ARCHITECT_RECOLOR (#261)", () => {
  const archState = (building) => ({
    phase: "architect", architectEnabled: true,
    architect: { buildings: [building], nextId: 2, offers: [], winCounters: {}, maxCover: 40 },
  });
  it("colorLocked-Gebäude bekommt die neue Buff-Farbe", () => {
    const s = reducer(archState({ id: 1, familyId: "A_BUNTGLAS", tier: 1, footprint: [0, 1, 2, 6], colorChoice: "R" }),
      { type: "ARCHITECT_RECOLOR", buildingId: 1, colorChoice: "B" });
    expect(s.architect.buildings[0].colorChoice).toBe("B");
  });
  it("ungültige Farbe → No-op (State unverändert)", () => {
    const st = archState({ id: 1, familyId: "A_BUNTGLAS", tier: 1, footprint: [0, 1, 2, 6], colorChoice: "R" });
    expect(reducer(st, { type: "ARCHITECT_RECOLOR", buildingId: 1, colorChoice: "X" })).toBe(st);
  });
  it("nicht-colorLocked-Gebäude → No-op", () => {
    const st = archState({ id: 1, familyId: "A_MEILENSTEIN", tier: 1, footprint: [0, 1, 5, 6], colorChoice: null });
    expect(reducer(st, { type: "ARCHITECT_RECOLOR", buildingId: 1, colorChoice: "B" })).toBe(st);
  });
  it("außerhalb der architect-Phase → No-op", () => {
    const st = { ...archState({ id: 1, familyId: "A_BUNTGLAS", tier: 1, footprint: [0], colorChoice: "R" }), phase: "play" };
    expect(reducer(st, { type: "ARCHITECT_RECOLOR", buildingId: 1, colorChoice: "B" })).toBe(st);
  });
});

// Drop über ein Gebäude → getroffene weichen aus/Swap: atomarer Mehrfach-Move, prüft die END-Lage.
describe("ARCHITECT_MOVE_MULTI (Drop-Swap)", () => {
  const twoState = () => ({
    phase: "architect", architectEnabled: true,
    architect: { buildings: [
      { id: 1, familyId: "A_MEILENSTEIN", tier: 1, footprint: [0, 1, 5, 6], colorChoice: null },
      { id: 2, familyId: "A_MEILENSTEIN", tier: 1, footprint: [2, 3, 7, 8], colorChoice: null },
    ], nextId: 3, offers: [], winCounters: {}, maxCover: 40 },
  });
  it("atomarer Swap zweier Gebäude (gültige End-Lage) → beide getauscht", () => {
    const s = reducer(twoState(), { type: "ARCHITECT_MOVE_MULTI", moves: [
      { buildingId: 1, footprint: [2, 3, 7, 8] },
      { buildingId: 2, footprint: [0, 1, 5, 6] },
    ] });
    expect(s.architect.buildings.find((b) => b.id === 1).footprint).toEqual([2, 3, 7, 8]);
    expect(s.architect.buildings.find((b) => b.id === 2).footprint).toEqual([0, 1, 5, 6]);
  });
  it("überlappende End-Lage → No-op (State unverändert)", () => {
    const st = twoState();
    expect(reducer(st, { type: "ARCHITECT_MOVE_MULTI", moves: [
      { buildingId: 1, footprint: [2, 3, 7, 8] },
      { buildingId: 2, footprint: [2, 3, 7, 8] },
    ] })).toBe(st);
  });
  it("außerhalb der architect-Phase → No-op", () => {
    const st = { ...twoState(), phase: "play" };
    expect(reducer(st, { type: "ARCHITECT_MOVE_MULTI", moves: [{ buildingId: 1, footprint: [2, 3, 7, 8] }] })).toBe(st);
  });
});

// #263: REROLL_ARCHITECT — Architekt-Bauplan-Angebot neu würfeln über den eigenen Gebäude-Reroll-Pool.
describe("REROLL_ARCHITECT (#263)", () => {
  const base = (over = {}) => ({
    phase: "architect", architectEnabled: true, seed: 12345, cycle: 0, offerRerolls: 0, masteryGrade: 0,
    rerollsArch: 2, rerollsUsed: 0,
    architect: { buildings: [], offers: [{ familyId: "seed", tier: 1, used: false }], actedMain: false, moved: false },
    ...over,
  });
  it("verbraucht 1 Gebäude-Reroll, zählt rerollsUsed + offerRerolls hoch, liefert ein neues Angebot", () => {
    const s = reducer(base(), { type: "REROLL_ARCHITECT", rng: Math.random });
    expect(s.rerollsArch).toBe(1);
    expect(s.rerollsUsed).toBe(1);
    expect(s.offerRerolls).toBe(1);
    expect(s.architect.offers.length).toBeGreaterThan(0);
  });
  it("deterministisch: gleicher Seed/Cycle/Index → identisches Angebot", () => {
    const a = reducer(base(), { type: "REROLL_ARCHITECT", rng: Math.random });
    const b = reducer(base(), { type: "REROLL_ARCHITECT", rng: Math.random });
    expect(a.architect.offers.map((o) => `${o.familyId}:${o.tier}`)).toEqual(b.architect.offers.map((o) => `${o.familyId}:${o.tier}`));
  });
  it("No-op ohne Gebäude-Reroll-Vorrat", () => {
    const st = base({ rerollsArch: 0 });
    expect(reducer(st, { type: "REROLL_ARCHITECT", rng: Math.random })).toBe(st);
  });
  it("No-op, wenn die Hauptaktion schon verbraucht ist (actedMain)", () => {
    const st = base({ architect: { buildings: [], offers: [], actedMain: true, moved: false } });
    expect(reducer(st, { type: "REROLL_ARCHITECT", rng: Math.random })).toBe(st);
  });
  it("No-op außerhalb der architect-Phase", () => {
    const st = base({ phase: "play" });
    expect(reducer(st, { type: "REROLL_ARCHITECT", rng: Math.random })).toBe(st);
  });
});

// RESTORE_RUN (Resume / Auto-Save): lädt einen gespeicherten laufenden Run-Snapshot zurück in den Reducer.
describe("RESTORE_RUN (Resume)", () => {
  const snap = { phase: "play", deck: [{ id: "R1", value: 5 }], cycle: 7, score: 4200, pos: 3 };
  it("ersetzt den (Menü-)State durch den gültigen Snapshot", () => {
    const s = reducer({ phase: "menu" }, { type: "RESTORE_RUN", state: snap });
    expect(s).toEqual(snap);
    expect(s.cycle).toBe(7);
  });
  it("ignoriert Snapshots ohne Deck (State unverändert)", () => {
    const cur = { phase: "menu" };
    expect(reducer(cur, { type: "RESTORE_RUN", state: { phase: "play", cycle: 1 } })).toBe(cur);
  });
  it("ignoriert Menü-/Gameover-Snapshots", () => {
    const cur = { phase: "menu" };
    expect(reducer(cur, { type: "RESTORE_RUN", state: { ...snap, phase: "menu" } })).toBe(cur);
    expect(reducer(cur, { type: "RESTORE_RUN", state: { ...snap, phase: "gameover" } })).toBe(cur);
  });
  it("ignoriert fehlenden Snapshot", () => {
    const cur = { phase: "menu" };
    expect(reducer(cur, { type: "RESTORE_RUN" })).toBe(cur);
  });
});
