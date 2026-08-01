import { describe, it, expect } from "vitest";
import { randomSeed } from "../src/ui/seedShare.js";

// #229 N7: randomSeed lebt jetzt im UI-Layer (raus aus dem deterministischen game/-Core). Nutzt Math.random →
// nicht auf Determinismus testbar, aber die Wertebereich-Invariante (uint32) muss halten.
describe("#229 N7 — randomSeed (UI-Layer)", () => {
  it("liefert eine uint32-Ganzzahl in [0, 2^32)", () => {
    for (let i = 0; i < 200; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(0x100000000);
      expect(s >>> 0).toBe(s); // bereits uint32-normalisiert
    }
  });
});
