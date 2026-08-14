import { describe, it, expect } from "vitest";
import { fmtScore, fmtScoreShort } from "../src/ui/format.js";

/* #347/6: Grenzwert-Logik der Score-Formatierer — floort (nicht rundet), de-DE-Tausenderpunkte, Mio/Mrd/Bio-Schwellen. */

describe("fmtScore (voller Score, FLOOR + de-DE)", () => {
  it("schneidet Nachkommastellen ab (FLOOR, nicht round) und setzt de-DE-Tausenderpunkte", () => {
    expect(fmtScore(1234)).toBe("1.234");
    expect(fmtScore(1234.9)).toBe("1.234");   // floor, nicht 1.235
    expect(fmtScore(999)).toBe("999");
    expect(fmtScore(1_000_000)).toBe("1.000.000");
  });
  it("fängt fehlende/legacy-Werte ab (null/undefined/NaN → 0)", () => {
    expect(fmtScore(null)).toBe("0");
    expect(fmtScore(undefined)).toBe("0");
    expect(fmtScore(NaN)).toBe("0");
    expect(fmtScore("abc")).toBe("0");
  });
});

describe("fmtScoreShort (kompakt, Mio/Mrd/Bio)", () => {
  it("unter 1 Mio. voll ausgeschrieben (de-DE)", () => {
    expect(fmtScoreShort(999_999)).toBe("999.999");
    expect(fmtScoreShort(0)).toBe("0");
    expect(fmtScoreShort(12_345)).toBe("12.345");
  });
  it("Schwellen Mio./Mrd./Bio. mit max. 1 Nachkommastelle (de-DE Komma)", () => {
    expect(fmtScoreShort(1_000_000)).toBe("1 Mio.");
    expect(fmtScoreShort(1_234_567)).toBe("1,2 Mio.");
    expect(fmtScoreShort(2_500_000)).toBe("2,5 Mio.");
    expect(fmtScoreShort(1_000_000_000)).toBe("1 Mrd.");
    expect(fmtScoreShort(1_000_000_000_000)).toBe("1 Bio.");
  });
  it("floort vor dem Abkürzen und trägt das Vorzeichen", () => {
    expect(fmtScoreShort(1_999_999.9)).toBe("2 Mio.");   // 1.9999999 Mio → floor auf 1999999 → /1e6 = 1,999999 → 1 Nachk. = 2
    expect(fmtScoreShort(-1_500_000)).toBe("-1,5 Mio.");
  });
});
