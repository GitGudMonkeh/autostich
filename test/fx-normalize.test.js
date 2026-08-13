import { describe, it, expect } from "vitest";
import { normalizeFxOptions } from "../src/game/storage.js";

/* #331 Einfachauswahl-Migration: Hintergrund-Effekte (Aurora/Würfel-Matrix/Glutfunken/Komet) und Karten-Animationen
   (Neonrahmen/Holo-Sweep/Glitch) sind jetzt einfach-exklusiv. Alt-Stände mit mehreren gleichzeitig an werden auf GENAU
   EINEN reduziert (feste Priorität = Reihenfolge), Rest aus. „Leuchten" (fxDeckGlow) bleibt frei kombinierbar. */
describe("#331 normalizeFxOptions — Einfachauswahl erzwingen", () => {
  it("reduziert mehrere gleichzeitige Hintergrund-Effekte auf einen (Priorität: Aurora zuerst)", () => {
    const o = normalizeFxOptions({ fxAurora: true, fxCubeMatrix: true, fxEmbers: true, fxStarfield: true });
    expect(o.fxAurora).toBe(true);
    expect(o.fxCubeMatrix).toBe(false);
    expect(o.fxEmbers).toBe(false);
    expect(o.fxStarfield).toBe(false);
  });

  it("Aurora + Glutfunken gleichzeitig (alter Zwei-Slot-Zustand) → nur Aurora bleibt", () => {
    const o = normalizeFxOptions({ fxAurora: true, fxEmbers: true });
    expect(o.fxAurora).toBe(true);
    expect(o.fxEmbers).toBe(false);
  });

  it("ohne Aurora greift die nächste Priorität (Würfel-Matrix vor Glutfunken/Komet)", () => {
    const o = normalizeFxOptions({ fxCubeMatrix: true, fxEmbers: true, fxStarfield: true });
    expect(o.fxCubeMatrix).toBe(true);
    expect(o.fxEmbers).toBe(false);
    expect(o.fxStarfield).toBe(false);
  });

  it("reduziert mehrere gleichzeitige Karten-Animationen auf eine (Priorität: Neonrahmen zuerst)", () => {
    const o = normalizeFxOptions({ fxEdgeGlow: true, fxHolo: true, fxGlitch: true });
    expect(o.fxEdgeGlow).toBe(true);
    expect(o.fxHolo).toBe(false);
    expect(o.fxGlitch).toBe(false);
  });

  it("Leuchten (fxDeckGlow) bleibt frei kombinierbar — unberührt neben einem Hintergrund-Effekt", () => {
    const o = normalizeFxOptions({ fxAurora: true, fxDeckGlow: true });
    expect(o.fxAurora).toBe(true);
    expect(o.fxDeckGlow).toBe(true);
  });

  it("gültige Einzelauswahl bleibt unverändert; nichts an bleibt nichts an", () => {
    expect(normalizeFxOptions({ fxEmbers: true }).fxEmbers).toBe(true);
    const off = normalizeFxOptions({ fxAurora: false, fxEmbers: false, fxEdgeGlow: false });
    expect(off.fxAurora).toBe(false);
    expect(off.fxEmbers).toBe(false);
    expect(off.fxEdgeGlow).toBe(false);
  });
});
