import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { firnDrawTick, eiszeitFlood, precomputeGlacier, ROLES, EISZEIT_FLOOD, EISZEIT_BURST_PER } from "../src/game/glacier.js";
import { iceSnapshotOpts } from "../src/game/factions/ice.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 5 (L2) — Legendär Eiszeit (Flut + Auto-Lock). §5.2: Erstarrung gestrichen; die
// Gegner-Reichweite lebt als Stufenleiter von Einfrieren weiter (test/glacier-einfrieren.test.js).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(N_POS).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const noCrit = () => 0.99;
const mid = posOf(1, 1); // Innenfeld mit vier Nachbarn
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

/* §5.18: der ZUG ist Fundament geworden. Er gehörte bis dahin allein der Eiszeit — und ohne sie hatte die Reserve
   überhaupt keinen Ausgang außer „dieses Feld friert später ein" (gemessen 65 % totes Kapital, §5.17). Jetzt teilen
   sich Schneetreiben, Dauerfrost und die Eiszeit eine Währung, die immer ankommt. */
/* §8: der Zug verteilt ANTEILIG statt „der Nächste nimmt alles". Die alte Regel verhungerte im dichten Bau die
   Gletscher, für die der Spieler baut — bei zwölf im Cluster bekamen sechs gar nichts. */
describe("Firn-Zug — jedes offene Feld speist ALLE Gletscher, nach Nähe gewichtet", () => {
  it("ein einzelner Gletscher zieht vom GANZEN Brett, auch von fernen Feldern", () => {
    const reserve = new Array(40).fill(3);
    // 40, nicht 39: seit §8 nimmt der Gletscher auch die Reserve unter sich selbst auf.
    expect(firnDrawTick(reserve, zeros(), lockAt(0)).mass[0]).toBeCloseTo(40 * 3, 6);
    // Der Punkt des Schritts: vorher endete der Zug am Ring, und Dauerfrost (Abstand ≥ 2) kam nie an.
    const fern = new Array(40).fill(0);
    fern[39] = 3;                           // maximal weit von pos0 entfernt
    expect(firnDrawTick(fern, zeros(), lockAt(0)).mass[0]).toBeCloseTo(3, 6);
  });

  it("§8: ein Feld teilt auf ALLE — der nähere bekommt mehr, keiner geht leer aus", () => {
    const reserve = new Array(40).fill(0);
    reserve[1] = 12;                        // pos1 liegt zwischen pos0 und pos2, gleich weit
    const { mass } = firnDrawTick(reserve, zeros(), lockAt(0, 2));
    expect(mass[0] + mass[2]).toBeCloseTo(12, 6);
    expect(mass[0]).toBeCloseTo(mass[2], 6); // gleicher Abstand → gleicher Anteil
    // Nähe zählt weiter, aber nicht mehr alles-oder-nichts: pos1 grenzt an pos0 (Abstand 1), pos30 liegt 6 weit.
    const r2 = new Array(40).fill(0); r2[1] = 12;
    const m2 = firnDrawTick(r2, zeros(), lockAt(0, 30)).mass;
    expect(m2[0] + m2[30]).toBeCloseTo(12, 6); // nichts geht verloren
    expect(m2[30]).toBeGreaterThan(0);         // vorher exakt 0 — genau das war der Fehler
    expect(m2[0] / m2[30]).toBeCloseTo(6, 6);  // Gewicht 1/Abstand, also 6:1
  });

  it("§8: im dichten Cluster geht KEIN Gletscher mehr leer aus", () => {
    const cluster = [0, 1, 2, 5, 6, 7, 10, 11, 12]; // das 3×3, auf das die Eis-Policy baut
    const firn = new Array(40).fill(0);
    for (let p = 0; p < 40; p++) if (!cluster.includes(p)) firn[p] = 1;
    const { mass } = firnDrawTick(firn, zeros(), lockAt(...cluster));
    expect(cluster.every((p) => mass[p] > 0)).toBe(true);
    expect(cluster.reduce((t, p) => t + mass[p], 0)).toBeCloseTo(40 - cluster.length, 6); // Summe bleibt erhalten
  });

  it("§8: die Reserve UNTER einem Gletscher fließt in ihn selbst, statt liegenzubleiben", () => {
    const reserve = new Array(40).fill(0);
    reserve[0] = 30;                        // vergrabener Schnee auf dem Gletscher-Feld
    const { firn, mass } = firnDrawTick(reserve, zeros(), lockAt(0));
    expect(mass[0]).toBe(30);
    expect(firn[0]).toBe(0);
  });

  it("ohne Gletscher bleibt die Reserve liegen", () => {
    const reserve = new Array(40).fill(3);
    const { firn, mass } = firnDrawTick(reserve, zeros(), falses());
    expect(firn).toEqual(reserve);
    expect(mass.every((v) => v === 0)).toBe(true);
  });
});

describe("Eiszeit — die Flut (§5.15)", () => {
  it("flutet jedes ungefrorene Feld und friert dabei nichts ein", () => {
    const firn = eiszeitFlood(zeros(), lockAt(0));
    expect(firn[39]).toBe(EISZEIT_FLOOD);
    expect(firn[0]).toBe(0);                // unter dem Gletscher wird nicht geflutet
  });
});

describe("Eiszeit — Berstkraft aus offenem Boden (§5.16)", () => {
  it("der Bruch skaliert mit den OFFENEN Nachbarn — der Spiegel der Dichte-Kaskade", () => {
    const mass = new Array(40).fill(0); mass[mid] = 12;
    const opts = iceSnapshotOpts([ROLES.L_EISZEIT]);
    const frei = precomputeGlacier(mass, new Set([mid]), opts).payout[mid];       // vier offene Nachbarn
    const plain = precomputeGlacier(mass, new Set([mid]), {}).payout[mid];
    expect(frei / plain).toBeCloseTo(1 + 4 * EISZEIT_BURST_PER, 5);
    // Ecke pos0: nur zwei Nachbarn, also nur zwei Viertel Wucht.
    const eckMass = new Array(40).fill(0); eckMass[0] = 12;
    const ecke = precomputeGlacier(eckMass, new Set([0]), opts).payout[0];
    expect(ecke / precomputeGlacier(eckMass, new Set([0]), {}).payout[0]).toBeCloseTo(1 + 2 * EISZEIT_BURST_PER, 5);
  });

  it("auf vollem Brett gibt die Eiszeit nichts — die exakte Umkehrung des Ewigen Schilds", () => {
    const all = new Set(); for (let p = 0; p < 40; p++) all.add(p);
    const mass = new Array(40).fill(12);
    const mit = precomputeGlacier(mass, all, iceSnapshotOpts([ROLES.L_EISZEIT])).payout[mid];
    const ohne = precomputeGlacier(mass, all, {}).payout[mid];
    expect(mit).toBe(ohne);
  });
});

describe("Eiszeit — Engine", () => {
  it("über einen Durchlauf: Reserve geflutet, Masse gewachsen, kein Feld eingefroren", () => {
    const s = runCycle(scen({ glacierLocked: lockAt(0), glacierRoles: [ROLES.L_EISZEIT], oppDeck: oppOf(99) }));
    /* §5.27: mit offenem Zug bleibt am Durchlauf-Ende KEINE Reserve stehen — sie ist im selben Durchlauf beim
       Gletscher angekommen. Die Flut ist deshalb nicht mehr am firnStack zu sehen, sondern nur noch an der Masse;
       genau das ist der Punkt des Owners („nichts generieren, das wir nicht nutzen"). */
    expect(s.firnStack[39]).toBe(0);
    expect(s.glacierLocked.filter(Boolean).length).toBe(1); // §5.15: die Eiszeit friert nichts mehr ein
    const ohne = runCycle(scen({ glacierLocked: lockAt(0), glacierRoles: [], oppDeck: oppOf(99) }));
    expect(s.glacierMass[0]).toBeGreaterThan(ohne.glacierMass[0]); // der Zug aus dem Boden schlägt bis in die Masse durch
  });
});
