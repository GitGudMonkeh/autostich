import { describe, it, expect } from "vitest";
import {
  clamp, clamp01, lerp, easeOut, mix, mixRGB, lerpCol, clampRGB, satBoost,
  mulberry32, vhash, fbm, roundRectPath,
} from "../src/ui/fx/fxMath.js";

/* #fx-helfer — Wächter für die geteilten Effekt-Helfer.

   Die Helfer standen vorher in bis zu zehn Effektdateien kopiert. Beim Zusammenführen mussten
   zwei Schreibweisen aufeinandergelegt werden, die nur AUSSEHEN wie zwei Funktionen:
   `t * (2 - t)` und `1 - (1 - t)²` sind dieselbe Kurve, die beiden `mix`-Fassungen dagegen NICHT
   dasselbe (Tripel vs. Objekt). Genau diese beiden Punkte prüft der Test — plus die Radius-Klemme
   in `roundRectPath`, die in einer der vier Kopien fehlte und beim Zusammenführen dazukam.

   `src/ui/fx` ist ansonsten fast testfrei (Canvas/WebGL). Diese Datei ist bewusst pure Mathematik:
   sie braucht kein DOM und deckt den Teil ab, der überhaupt prüfbar ist. */

describe("fxMath · Begrenzen", () => {
  it("clamp hält den Wert im Intervall und verhält sich wie die Math.max/min-Schreibweise", () => {
    const alt = (v, a, b) => Math.max(a, Math.min(b, v));   // die zweite Fassung, die im Umlauf war
    for (const v of [-99, -1, 0, 0.5, 1, 7, 1e9, NaN]) {
      const neu = clamp(v, 0, 1);
      if (Number.isNaN(v)) expect(Number.isNaN(neu)).toBe(Number.isNaN(alt(v, 0, 1)));
      else expect(neu).toBe(alt(v, 0, 1));
    }
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it("clamp01 ist clamp auf 0..1", () => {
    for (const v of [-3, 0, 0.42, 1, 4]) expect(clamp01(v)).toBe(clamp(v, 0, 1));
  });
});

describe("fxMath · Interpolation", () => {
  it("lerp trifft die Ränder exakt und interpoliert linear", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerp(-4, 4, 0.5)).toBe(0);
  });

  it("easeOut ist dieselbe Kurve wie das früher lokal geschriebene t * (2 - t)", () => {
    // Der Punkt der Zusammenführung: BlackholeFx schrieb die Kurve ausmultipliziert.
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      expect(easeOut(t)).toBeCloseTo(t * (2 - t), 12);
    }
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });
});

describe("fxMath · Farben", () => {
  it("mix rechnet auf RGB-TRIPELN, mixRGB auf {r,g,b} — die beiden sind nicht austauschbar", () => {
    expect(mix([0, 0, 0], [255, 128, 64], 0.5)).toEqual([127.5, 64, 32]);
    expect(mixRGB({ r: 0, g: 0, b: 0 }, { r: 255, g: 128, b: 64 }, 0.5)).toEqual({ r: 127.5, g: 64, b: 32 });
    // Die Verwechslung soll auffallen und nicht still NaN durchreichen: ein Tripel hat kein .r.
    const falsch = mixRGB([0, 0, 0], [255, 128, 64], 0.5);
    expect(Number.isNaN(falsch.r)).toBe(true);
  });

  it("lerpCol interpoliert gepackte 0xRRGGBB-Werte und bleibt ganzzahlig", () => {
    expect(lerpCol(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpCol(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpCol(0x000000, 0xff8040, 0.5)).toBe(0x804020);   // 255/2→128, 128/2→64, 64/2→32
    // Ein Pixi-`tint` muss ganzzahlig sein — auch bei krummem t.
    for (const t of [0.13, 0.37, 0.66, 0.91]) expect(Number.isInteger(lerpCol(0x123456, 0xfedcba, t))).toBe(true);
  });

  it("clampRGB hält jeden Kanal in 0..255", () => {
    expect(clampRGB({ r: -20, g: 300, b: 128 })).toEqual({ r: 0, g: 255, b: 128 });
    expect(clampRGB({ r: 0, g: 255, b: 12 })).toEqual({ r: 0, g: 255, b: 12 });
  });

  it("satBoost spreizt um den Luma-Wert und lässt Grau unverändert", () => {
    const grau = { r: 128, g: 128, b: 128 };
    const s = satBoost(grau, 0.8);
    expect(s.r).toBeCloseTo(128, 6);
    expect(s.g).toBeCloseTo(128, 6);
    expect(s.b).toBeCloseTo(128, 6);
    // Eine gesättigte Farbe entfernt sich vom Grauwert — und bleibt dabei im gültigen Bereich.
    const bunt = satBoost({ r: 200, g: 100, b: 60 }, 0.5);
    expect(bunt.r).toBeGreaterThan(200);
    expect(bunt.b).toBeLessThan(60);
    for (const v of Object.values(bunt)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(255); }
  });
});

describe("fxMath · Zufall", () => {
  it("mulberry32 ist seedbar-deterministisch und liefert Werte in [0,1)", () => {
    const a = mulberry32(1234), b = mulberry32(1234), c = mulberry32(1235);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);                      // gleicher Seed → gleiche Folge
    expect(seqA).not.toEqual(Array.from({ length: 50 }, () => c()));
    for (const v of seqA) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    expect(new Set(seqA).size).toBeGreaterThan(45);  // keine kurze Schleife
  });

  it("vhash/fbm sind zustandslos: dieselbe Stelle liefert immer denselben Wert", () => {
    expect(vhash(3.5, -7.25)).toBe(vhash(3.5, -7.25));
    expect(fbm(12, 40)).toBe(fbm(12, 40));
    expect(vhash(3.5, -7.25)).not.toBe(vhash(3.6, -7.25));
    for (let x = 0; x < 30; x++) {
      expect(vhash(x, x * 2)).toBeGreaterThanOrEqual(0);
      expect(vhash(x, x * 2)).toBeLessThan(1);
      expect(fbm(x, x * 2)).toBeGreaterThanOrEqual(0);
      expect(fbm(x, x * 2)).toBeLessThan(1);
    }
  });
});

describe("fxMath · roundRectPath", () => {
  // Minimal-Attrappe: der Helfer zeichnet nicht, er legt nur einen Pfad an.
  const fakeCtx = () => {
    const calls = [];
    const rec = (name) => (...args) => calls.push([name, ...args]);
    return { calls, beginPath: rec("beginPath"), moveTo: rec("moveTo"), arcTo: rec("arcTo"), closePath: rec("closePath") };
  };

  it("legt einen geschlossenen Pfad aus vier Bögen an", () => {
    const ctx = fakeCtx();
    roundRectPath(ctx, 0, 0, 100, 60, 8);
    expect(ctx.calls[0][0]).toBe("beginPath");
    expect(ctx.calls.at(-1)[0]).toBe("closePath");
    expect(ctx.calls.filter((c) => c[0] === "arcTo")).toHaveLength(4);
    expect(ctx.calls.find((c) => c[0] === "moveTo")).toEqual(["moveTo", 8, 0]);
  });

  it("klemmt den Radius auf die halbe Kantenlänge — die Klemme fehlte in einer der zusammengeführten Kopien", () => {
    const ctx = fakeCtx();
    roundRectPath(ctx, 0, 0, 10, 4, 999);           // absurd großer Radius
    // Ohne Klemme liefe moveTo auf x + 999; erwartet ist die halbe kürzere Kante (4 / 2 = 2).
    expect(ctx.calls.find((c) => c[0] === "moveTo")).toEqual(["moveTo", 2, 0]);
    for (const c of ctx.calls.filter((x) => x[0] === "arcTo")) expect(c.at(-1)).toBe(2);
  });
});
