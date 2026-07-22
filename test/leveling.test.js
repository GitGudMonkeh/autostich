import { describe, it, expect } from "vitest";
import { xpToNext, XP_CURVE } from "../src/game/leveling.js";

describe("Leveling", () => {
  it("liest die Kurve für Level 1..10", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(5)).toBe(240);
    expect(xpToNext(10)).toBe(750);
    expect(XP_CURVE).toHaveLength(10);
  });

  it("extrapoliert linear über die Tabelle hinaus (+200 je Stufe, #61)", () => {
    expect(xpToNext(11)).toBe(950);   // 750 + 1×200
    expect(xpToNext(20)).toBe(2750);  // 750 + 10×200
    expect(xpToNext(21)).toBe(2950);
    expect(xpToNext(22)).toBeGreaterThan(xpToNext(21));
  });

  it("clamped Level < 1 auf die erste Stufe", () => {
    expect(xpToNext(0)).toBe(100);
  });
});
