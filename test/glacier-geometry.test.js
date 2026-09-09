import { describe, it, expect } from "vitest";
import { glacierGeometry, precomputeGlacier, eiswallRuns, EISWALL_MIN, ROLES, GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE } from "../src/game/glacier.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js";
import { iceSnapshotOpts, iceTuning } from "../src/game/factions/ice.js";
import { posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 4 — 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7/§9) + Eiswall.
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };

describe("glacierGeometry — Formen erkennen", () => {
  it("keine Form → alle Faktoren 1", () => {
    expect(glacierGeometry(lockAt(0)).every((x) => x === 1)).toBe(true);
  });
  it("Block (2×2) → GEO_BLOCK auf den vier Feldern", () => {
    const f = glacierGeometry(lockAt(0, 1, 5, 6)); // posOf(0,0/0,1/1,0/1,1)
    for (const p of [0, 1, 5, 6]) expect(f[p]).toBeCloseTo(GEO_BLOCK);
    expect(f[2]).toBe(1);
  });
  it("Kreuz (Zentrum + 4 orthogonale) → GEO_KREUZ im Zentrum", () => {
    const c = posOf(1, 1);
    const f = glacierGeometry(lockAt(c, posOf(0, 1), posOf(2, 1), posOf(1, 0), posOf(1, 2)));
    expect(f[c]).toBeCloseTo(GEO_KREUZ);
  });
  /* §5.24: der Eiswall hebt die Linie NICHT mehr — er ist ein eigener Faktor auf der Kettenlänge geworden. Der Wächter
     hält die Entkopplung fest: keine Snapshot-Option darf diese Tabelle noch verstellen. */
  it("Linie: volle Reihe → GEO_LINIE, und keine Option hebt sie", () => {
    const row = lockAt(0, 1, 2, 3, 4);
    expect(glacierGeometry(row)[0]).toBeCloseTo(GEO_LINIE);
    expect(glacierGeometry(row, iceSnapshotOpts([ROLES.EISWALL]))[0]).toBeCloseTo(GEO_LINIE);
  });
  it("Linie: volle Spalte (8 Zeilen) → GEO_LINIE", () => {
    const col = lockAt(0, 5, 10, 15, 20, 25, 30, 35); // col 0, alle 8 Zeilen
    expect(glacierGeometry(col)[0]).toBeCloseTo(GEO_LINIE);
  });
  it("Große Fläche (3×3) → GEO_FLAECHE; überlappende Formen stapeln NICHT (§5.6: die stärkste zählt)", () => {
    const cells = [0, 1, 2, 5, 6, 7, 10, 11, 12];
    const f = glacierGeometry(lockAt(...cells));
    for (const p of cells) expect(f[p]).toBeGreaterThan(1);
    // Das Zentrum liegt in Fläche, Kreuz und vier Blöcken zugleich. Früher multiplizierte sich das; jetzt zählt die
    // stärkste Form — und keine Zelle kommt über den größten Einzelfaktor hinaus.
    expect(f[posOf(1, 1)]).toBeCloseTo(GEO_FLAECHE);
    const strongest = Math.max(GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE);
    for (const p of cells) expect(f[p]).toBeLessThanOrEqual(strongest);
  });
});

/* §5.24 (Owner-Route A): der Eiswall liest die LÄNGE der geraden Kette statt „volle Reihe oder nichts". Die beiden
   gemessenen Ursachen des alten Hebels (−8 %, Haltequote 38 %) waren das Alles-oder-nichts-Tor und die Anti-Synergie:
   die Reihe ist die dünnste Form, während Kaskade, Kollision, Packeis und Verzahnung Dichte bezahlen. */
describe("Eiswall — die Kettenlänge zahlt, nicht die volle Reihe", () => {
  const per = EIS.eiswall[0].per;
  const mass = (ps) => { const m = new Array(40).fill(0); for (const p of ps) m[p] = 12; return m; };
  const wallOpts = (tier = 0) => iceSnapshotOpts([ROLES.EISWALL], iceTuning([ROLES.EISWALL], { [ROLES.EISWALL]: tier }));
  // Verhältnis der Auszahlung mit zu ohne Wand — alle übrigen Faktoren sind in beiden Läufen identisch und kürzen sich.
  const lift = (ps, p, tier = 0) =>
    precomputeGlacier(mass(ps), new Set(ps), wallOpts(tier)).payout[p] / precomputeGlacier(mass(ps), new Set(ps)).payout[p];

  it("eiswallRuns: die längere von waagerecht und senkrecht, 0 ohne Gletscher", () => {
    const runs = eiswallRuns(new Set([0, 1, 2, posOf(1, 0), posOf(2, 0)])); // Reihe 0 dreilang, Spalte 0 dreilang
    expect(runs[0]).toBe(3);
    expect(runs[posOf(1, 0)]).toBe(3);   // senkrecht gezählt
    expect(runs[posOf(3, 0)]).toBe(0);   // kein Gletscher
    expect(eiswallRuns(new Set([0, 2])).every((x) => x <= 1)).toBe(true); // Lücke unterbricht die Kette
  });

  it("eine Kette aus zwei zahlt nichts, ab drei zahlt sie", () => {
    expect(EISWALL_MIN).toBe(3);
    expect(lift([0, 1], 0)).toBeCloseTo(1, 6);
    expect(lift([0, 1, 2], 0)).toBeCloseTo(1 + per, 6);      // Länge 3 → ein Gletscher über zwei
  });

  it("je länger die Kette, desto mehr — die volle Reihe ist die Spitze", () => {
    expect(lift([0, 1, 2, 3], 0)).toBeCloseTo(1 + 2 * per, 6);
    expect(lift([0, 1, 2, 3, 4], 0)).toBeCloseTo(1 + 3 * per, 6);
  });

  /* Der Kern der Route: der dichte Bau ENTHÄLT Ketten. Ein 3×3-Klotz liefert in jeder Zeile und Spalte eine Drei —
     die Wand hilft damit auch dem Build, der sie früher ausgeschlossen hat. */
  it("auch der 3×3-Klotz zahlt — die Wand schließt den dichten Bau nicht mehr aus", () => {
    const klotz = [0, 1, 2, 5, 6, 7, 10, 11, 12];
    for (const p of [0, posOf(1, 1), 12]) expect(lift(klotz, p)).toBeCloseTo(1 + per, 6);
  });

  it("die Stufe hebt den Zuschlag", () => {
    expect(lift([0, 1, 2, 3, 4], 0, 3)).toBeGreaterThan(lift([0, 1, 2, 3, 4], 0, 0));
  });
});
