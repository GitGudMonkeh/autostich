import { describe, it, expect } from "vitest";
import { createStageBlend, easeStage, STAGE_FADE_MS } from "../src/ui/fx/stageBlend.js";

/* #382 Stufen-Blende (Moos/Frost). Die eine Eigenschaft, an der alles hängt: die Gewichte addieren sich IMMER
   exakt zu 1. Nur dann ist der additive Draw (`lighter` auf frisch gelöschter Fläche) die echte Interpolation
   der Stufen-Bitmaps — und genau daran hing der alte Kreuz-Fade, bei dem der schon gewachsene Bewuchs mitten
   im Wechsel wegsackte. */

const sum = (ls) => ls.reduce((a, l) => a + l.w, 0);

describe("#382 Stufen-Blende", () => {
  it("startet hart auf der ersten Stufe (kein Aufblenden aus dem Nichts)", () => {
    const b = createStageBlend();
    b.to(3, 0);
    expect(b.base).toBe(3);
    expect(b.active).toBe(false);
    expect(b.weights(0)).toEqual([{ stage: 3, w: 1 }]);
  });

  it("blendet über die volle Dauer von alt auf neu, Summe der Gewichte bleibt 1", () => {
    const b = createStageBlend();
    b.set(1);
    b.to(2, 0);
    for (const t of [0, 60, 140, 280, 420, STAGE_FADE_MS - 1]) {
      const ls = b.weights(t);
      expect(sum(ls)).toBeCloseTo(1, 12);
      expect(ls.map((l) => l.stage)).toEqual([1, 2]);       // unterste Ebene zuerst
      expect(ls[1].w).toBeCloseTo(easeStage(t / STAGE_FADE_MS), 12);
    }
  });

  it("schmilzt die fertige Ebene in die Basis (danach wieder EIN Bitmap, kein Dauer-rAF)", () => {
    const b = createStageBlend();
    b.set(1); b.to(2, 0);
    expect(b.active).toBe(true);
    const ls = b.weights(STAGE_FADE_MS);
    expect(ls).toEqual([{ stage: 2, w: 1 }]);
    expect(b.base).toBe(2);
    expect(b.active).toBe(false);
  });

  it("stapelt eine zweite Stufe auf eine LAUFENDE Blende, statt sie abzuschneiden", () => {
    const b = createStageBlend();
    b.set(1);
    b.to(2, 0);
    b.to(3, 200);                                   // Zuwachs mitten in der ersten Blende
    const ls = b.weights(300);
    expect(ls.map((l) => l.stage)).toEqual([1, 2, 3]);
    expect(sum(ls)).toBeCloseTo(1, 12);
    expect(ls.every((l) => l.w >= 0)).toBe(true);
    // Nach Ablauf beider Blenden steht nur noch die letzte Stufe.
    expect(b.weights(200 + STAGE_FADE_MS)).toEqual([{ stage: 3, w: 1 }]);
  });

  it("blendet auch ABWÄRTS (Gletscher-Ausbruch / Moos-Reset schmilzt aus statt zu poppen)", () => {
    const b = createStageBlend();
    b.set(3);
    b.to(0, 0);
    const ls = b.weights(STAGE_FADE_MS / 2);
    expect(ls.map((l) => l.stage)).toEqual([3, 0]);
    expect(sum(ls)).toBeCloseTo(1, 12);
    expect(ls[0].w).toBeGreaterThan(0);             // die alte Stufe ist noch da → sie schmilzt
  });

  it("ignoriert ein Ziel, das schon Ziel ist (growth 3,2 → 3,4 löst keine Blende aus)", () => {
    const b = createStageBlend();
    b.set(2); b.to(3, 0); b.to(3, 100);
    expect(b.weights(100).length).toBe(2);
    expect(b.target).toBe(3);
  });

  it("set() bricht eine laufende Blende hart ab (reduzierte Bewegung, verdecktes Brett, Resize)", () => {
    const b = createStageBlend();
    b.set(1); b.to(2, 0); b.weights(100);
    b.set(b.target);
    expect(b.active).toBe(false);
    expect(b.weights(100)).toEqual([{ stage: 2, w: 1 }]);
  });
});
