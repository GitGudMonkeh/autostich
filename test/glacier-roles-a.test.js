import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, ROLES, BURST_AT, THRESHOLDS, TIER_MULT, KEEP_MAX } from "../src/game/glacier.js";
import { iceSnapshotOpts, iceTuning } from "../src/game/factions/ice.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)


// Eis-Neudesign Phase 3.2 Gruppe A — Snapshot-Modifikatoren (Rissbildung/Abbruchkante). §5.2: Zermalmen gestrichen.
// Getrieben über state.glacierRoles (noch nicht im Skill-Angebots-Pool → kein 5.-Archetyp-Leak). Werte Platzhalter.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("iceSnapshotOpts — Rollen und Stufe → Snapshot-opts", () => {
  it("baut opts nur für aktive Rollen, komponiert additiv", () => {
    expect(iceSnapshotOpts([])).toEqual({});
    expect(iceSnapshotOpts([ROLES.EISBEBEN]).eisbebenPer).toBe(EIS.eisbeben[0].per);
    const all = iceSnapshotOpts([ROLES.EISBEBEN, ROLES.ABBRUCHKANTE]);
    expect(all).toHaveProperty("eisbebenPer");
    expect(all).toHaveProperty("burstAt");
  });
  /* §5.31: die Abbruchkante ist die EINZIGE Quelle für `burstAt` — und sie HEBT die Schwelle (sammeln), sie senkt sie
     nie. §5.18 hatte mit der Rissbildung die letzte senkende Quelle gestrichen; das muss so bleiben, sonst bricht ein
     Gletscher früher als sein Text sagt. */
  it("nur die Abbruchkante setzt die Berst-Schwelle — und sie hebt sie", () => {
    for (const role of Object.values(ROLES)) {
      const opts = iceSnapshotOpts([role]);
      if (role === ROLES.ABBRUCHKANTE) expect(opts.burstAt).toBeGreaterThan(BURST_AT);
      else expect(opts).not.toHaveProperty("burstAt");
    }
    // und jede Stufe hebt weiter als die davor
    for (let t = 1; t < EIS.abbruchkante.length; t++) expect(EIS.abbruchkante[t].at).toBeGreaterThan(EIS.abbruchkante[t - 1].at);
  });
});

/* §5.18 — Gletscherzunge ersetzt Rissbildung auf SK_ICE_13: Masse wird Kampfwert. Der Hebel ist der Grund, warum Eis
   überhaupt Stiche gewinnen kann; der Bruch bekommt den vollen Sieg-Stack nur bei einem Sieg. */
describe("Gletscherzunge — Masse wird Kampfwert", () => {
  it("gewinnt einen Stich, den dieselbe Karte ohne sie verliert", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;   // Normal: 12 / 6 = +2 Wert
    const opp = oppOf(13);                              // Kartenwert an pos0 ist 12 → ohne Zunge zu wenig
    const ohne = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp }), noCrit);
    const mit = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(ohne.lastTrick.result).toBe("loss");
    expect(mit.lastTrick.result).toBe("win");
    expect(mit.lastTrick.pValue - ohne.lastTrick.pValue).toBe(2); // genau der Satz der Stufe
  });

  /* Die Naht, die beim Bauen zuerst falsch war: der Bruch-Abfall wird dem Feld VOR der Wertberechnung abgezogen. Wer
     den laufenden Akkumulator liest, lässt den Gletscher ausgerechnet in seiner Bruchrunde mit +0 kämpfen — und das ist
     die Runde, in der ein Sieg am meisten wert ist, weil der volle Sieg-Stack auf den Bruch geht. */
  it("liest die Masse DIESES Durchlaufs, auch wenn der Gletscher im selben Stich birst", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;   // birst in diesem Stich (Berst-Schwelle)
    const opp = oppOf(13);
    const s = resolveTrick(scen({ glacierLocked, glacierMass, oppDeck: opp, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0); // er ist wirklich gebrochen
    expect(s.lastTrick.result).toBe("win");                         // und hat trotzdem mit +2 gekämpft
  });

  it("ohne Masse kein Bonus — der Skill hängt an der Ressource, nicht am Besitz", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const ohne = resolveTrick(scen({ glacierLocked }), noCrit);
    const mit = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.GLETSCHERZUNGE] }), noCrit);
    expect(mit.lastTrick.pValue).toBe(ohne.lastTrick.pValue);
  });
});

/* §5.31: die Abbruchkante hebt die BERST-SCHWELLE, statt die Stufenwucht ein wenig anzuheben. Der Handel ist:
   seltener bersten, dafür auf einer höheren Sprosse. Die drei Wächter halten beide Seiten des Handels fest. */
describe("Abbruchkante — der Gletscher sammelt", () => {
  const at0 = EIS.abbruchkante[0].at;

  it("hält, wo er ohne sie schon bräche", () => {
    const m = zeros(); m[0] = BURST_AT;                 // genau an der normalen Schwelle
    expect(precomputeGlacier(m, new Set([0]), {}).breaks).toHaveLength(1);
    expect(precomputeGlacier(m, new Set([0]), iceSnapshotOpts([ROLES.ABBRUCHKANTE])).breaks).toHaveLength(0);
  });

  it("birst an der eigenen Schwelle — und zahlt dort mehr als ein normaler Bruch", () => {
    const m = zeros(); m[0] = at0;
    const abb = precomputeGlacier(m, new Set([0]), iceSnapshotOpts([ROLES.ABBRUCHKANTE]));
    const mNorm = zeros(); mNorm[0] = BURST_AT;
    const norm = precomputeGlacier(mNorm, new Set([0]), {});
    expect(abb.breaks).toHaveLength(1);
    expect(abb.payout[0]).toBeGreaterThan(norm.payout[0]);
    expect(abb.breaks[0].tier).toBeGreaterThan(norm.breaks[0].tier); // die höhere Sprosse ist der Gegenwert
  });

  /* §5.32: der Wächter zu einem gemessenen Fehler. Der erste Wurf legte die Schwellen ZWISCHEN die Sprossen der
     Leiter (24 zählt noch zur vierten wie 18, 38 noch zur fünften wie 30). Dann kostet die höhere Stufe Wartezeit,
     ohne Wucht zu bringen: Stufe 2 zahlte weniger als gar kein Skill, Episch weniger als Stufe 3 — der gierige
     Spieler ließ ihn fallen (Haltequote 68 % → 20 %). Beide Bedingungen müssen gelten, nicht nur eine. */
  it("jede Schwelle liegt AUF einer Sprosse, und die Auszahlung steigt mit der Stufe", () => {
    const tOf = (m) => THRESHOLDS.filter((t) => m >= t).length;
    // Auszahlung je Durchlauf und Punkt Einkommen: Masse × Wucht ÷ Kletterzeit von KEEP_MAX auf die Schwelle.
    const proRunde = (B) => B * TIER_MULT[tOf(B)] / (B - KEEP_MAX);
    for (const r of EIS.abbruchkante) expect(THRESHOLDS).toContain(r.at);
    expect(proRunde(EIS.abbruchkante[0].at)).toBeGreaterThan(proRunde(BURST_AT)); // Normal lohnt gegen „kein Skill"
    for (let t = 1; t < EIS.abbruchkante.length; t++)
      expect(proRunde(EIS.abbruchkante[t].at)).toBeGreaterThan(proRunde(EIS.abbruchkante[t - 1].at));
  });

  it("die Stufe des Skills verschiebt die Schwelle weiter nach oben", () => {
    const hoch = iceSnapshotOpts([ROLES.ABBRUCHKANTE], iceTuning([ROLES.ABBRUCHKANTE], { [ROLES.ABBRUCHKANTE]: 3 }));
    expect(hoch.burstAt).toBe(EIS.abbruchkante[3].at);
    const m = zeros(); m[0] = at0;                      // reicht für Normal, nicht für Episch
    expect(precomputeGlacier(m, new Set([0]), hoch).breaks).toHaveLength(0);
  });
});
