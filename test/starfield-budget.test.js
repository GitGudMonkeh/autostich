import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  cometLifeS, trailSamples, sparkScale, cometStride, cometSize,
  MAX_SPEEDUP, TRAIL_BUDGET_LITE, TRAIL_MIN, SPARK_BUDGET_LITE, SPARK_MIN_FRAC, SIZE_CAP_LITE,
} from "../src/ui/fx/starfieldBudget.js";

/* Wächter für die Meteor-Deckel (#perf-meteor).

   Warum geprüft wird: die Deckel sind bewusst UNSICHTBAR im Normalspiel — ein einzelner Meteor bei 1× sieht aus
   wie vorher. Genau deshalb merkt niemand, wenn sie beim nächsten Umbau still wegfallen; auffallen würde es erst
   im späten Lauf bei MAX-Turbo auf einem Handy, also dort, wo am seltensten jemand hinschaut. Die drei
   Entscheidungen sind reine Arithmetik und liegen deshalb Pixi-frei in starfieldBudget.js — der Emitter selbst
   importiert `pixi.js` im Kopf und ist in vitest (node, kein WebGL) nicht befragbar.

   Zusätzlich eine Quelltext-Ratsche auf starfieldPixi.js: sie kann nicht beweisen, dass richtig gerechnet wird,
   aber sie merkt, wenn die Naht verschwindet. */

const src = readFileSync(new URL("../src/ui/fx/starfieldPixi.js", import.meta.url), "utf8");
const FULL = 1;                       // TUNE.SHOOT_DUR
const FLIP = { x1: 1750, x2: 875, x4: 437, max: 350 }; // BASE_FLIP_MS / Speed → sweepDur (clamp 150..1800)

describe("#perf-meteor — Flugdauer folgt dem Stich-Takt", () => {
  it("lässt Desktop völlig unangetastet, egal wie schnell gespielt wird", () => {
    for (const ms of Object.values(FLIP)) expect(cometLifeS(false, ms, FULL)).toBe(FULL);
  });

  it("lässt 1× unangetastet und legt den Flug ab 2× genau auf die Stich-Dauer", () => {
    expect(cometLifeS(true, FLIP.x1, FULL)).toBe(FULL);
    /* Bei 2× sind das 0,875 s statt 1 s. Das ist gewollt und nicht bloß geduldet: der Meteor endet damit exakt
       mit seinem eigenen Stich, überlebt ihn also nie — die Überlappung entsteht gar nicht erst, statt später
       weggedeckelt zu werden. Sichtbar ist der Unterschied bei einem einzelnen Kometen nicht. */
    expect(cometLifeS(true, FLIP.x2, FULL)).toBeCloseTo(FLIP.x2 / 1000, 10);
    expect(cometLifeS(true, FLIP.x2, FULL)).toBeGreaterThan(FULL / MAX_SPEEDUP);
  });

  it("beschleunigt ab 4× — aber HÖCHSTENS auf das Doppelte (User-Vorgabe: Bogen bleibt als Flug lesbar)", () => {
    expect(cometLifeS(true, FLIP.x4, FULL)).toBe(FULL / MAX_SPEEDUP);
    expect(cometLifeS(true, FLIP.max, FULL)).toBe(FULL / MAX_SPEEDUP);
    // Auch ein absurd kurzer Takt darf nicht weiter drücken — sonst wird aus dem Meteor ein Blitz.
    expect(cometLifeS(true, 10, FULL)).toBe(FULL / MAX_SPEEDUP);
  });

  it("senkt damit die Gleichzeitigkeit bei MAX von 3 auf 2 Kometen", () => {
    // Das ist der eigentliche Zweck: Kometen gleichzeitig = ceil(Flugdauer / Stich-Abstand).
    const conc = (lifeS) => Math.ceil((lifeS * 1000) / FLIP.max);
    expect(conc(FULL)).toBe(3);
    expect(conc(cometLifeS(true, FLIP.max, FULL))).toBe(2);
  });

  it("nimmt ohne sweepDur die VOLLE Dauer, nicht die halbe (Showcase/Altaufruf)", () => {
    // Der Showcase ruft mit sweepDur=1100; ein Aufruf ganz ohne den Wert darf nicht versehentlich halbieren.
    expect(cometLifeS(true, 0, FULL)).toBe(FULL);
    expect(cometLifeS(true, undefined, FULL)).toBe(FULL);
    expect(cometLifeS(true, 1100, FULL)).toBe(FULL);
  });
});

describe("#perf-meteor — Schweif-Budget bei Überlappung", () => {
  const N_LITE = 48, N_FULL = 96;   // TRAIL_SAMPLES × (lite ? 0.5 : 1)

  it("lässt den EINZELNEN Meteor unangetastet — der Normalfall kostet nichts an Qualität", () => {
    expect(trailSamples(true, 1, N_LITE)).toEqual({ nFull: N_LITE, nOld: N_LITE });
  });

  it("greift auf Desktop gar nicht, egal wie viele fliegen", () => {
    for (const n of [1, 2, 3, 5]) expect(trailSamples(false, n, N_FULL)).toEqual({ nFull: N_FULL, nOld: N_FULL });
  });

  it("gibt dem jüngsten Kometen die volle Auflösung und dünnt nur die älteren", () => {
    const { nFull, nOld } = trailSamples(true, 3, N_LITE);
    expect(nFull).toBe(N_LITE);          // der gerade gewonnene Stich bleibt scharf
    expect(nOld).toBeLessThan(N_LITE);
  });

  it("deckelt die Frame-Summe spürbar unter dem alten Verhalten", () => {
    const sum = (count) => { const { nFull, nOld } = trailSamples(true, count, N_LITE); return nFull + nOld * (count - 1); };
    expect(sum(2)).toBeLessThanOrEqual(TRAIL_BUDGET_LITE);
    expect(sum(3)).toBeLessThanOrEqual(TRAIL_BUDGET_LITE);
    // Gegen das ALTE Verhalten (jeder Komet volle 48): bei zwei/drei Kometen deutlich weniger.
    expect(sum(2)).toBeLessThan(2 * N_LITE);
    expect(sum(3)).toBeLessThan(3 * N_LITE);
  });

  it("hält die Perlen-Grenze ein — nie unter TRAIL_MIN Samples je Schweif", () => {
    // Unter ~16 Samples wird der Sample-Abstand größer als der Sample-Durchmesser und der Streak zerfällt.
    for (const n of [2, 3, 4, 5, 9]) expect(trailSamples(true, n, N_LITE).nOld).toBeGreaterThanOrEqual(TRAIL_MIN);
  });
});

describe("#perf-meteor — Funken-Budget", () => {
  it("lässt Desktop und den ersten Einschlag voll ausspielen", () => {
    expect(sparkScale(false, 400)).toBe(1);
    expect(sparkScale(true, 0)).toBe(1);
  });

  it("wird sparsamer, je voller die Luft schon hängt (weicher Deckel, kein Abschneiden)", () => {
    expect(sparkScale(true, 40)).toBeLessThan(1);
    expect(sparkScale(true, 80)).toBeLessThan(sparkScale(true, 40));
  });

  it("kappt aber nie ganz — ein Einschlag ohne Funken sähe kaputt aus", () => {
    expect(sparkScale(true, 10_000)).toBe(SPARK_MIN_FRAC);
    expect(SPARK_MIN_FRAC).toBeGreaterThan(0);
  });

  it("pendelt sich bei Gottgleich/MAX deutlich unter dem alten Dauerstand ein", () => {
    /* Regelkreis: je Einschlag n = 60 × sparkScale(live); die Funken leben ~0,935 s, bei MAX kommt alle 0,35 s
       einer → live ≈ n × 2,67. Fixpunkt iterieren statt die Zahl abzutippen, damit der Test beim Nachdrehen der
       Budgets mitwandert und nur die AUSSAGE festhält: klar unter den ~160 von vorher. */
    let live = 0;
    for (let i = 0; i < 200; i++) live = 60 * sparkScale(true, live) * 2.67;
    expect(live).toBeLessThan(0.6 * 160);
    expect(live).toBeGreaterThan(30);              // aber auch nicht totgeregelt
    expect(live).toBeLessThanOrEqual(SPARK_BUDGET_LITE);
  });
});

describe("#perf-meteor — Verdrahtung im Emitter (Quelltext-Ratsche)", () => {
  it("benutzt alle drei Budgets aus starfieldBudget.js", () => {
    expect(src).toMatch(/from "\.\/starfieldBudget\.js"/);
    expect(src).toMatch(/cometLifeS\(params\.lite, sweepDur, TUNE\.SHOOT_DUR\)/);
    expect(src).toMatch(/trailSamples\(params\.lite, comets\.length/);
    expect(src).toMatch(/sparkScale\(params\.lite, liveSparks\)/);
  });

  it("reicht sweepDur bis in erupt durch — ohne den Wert greift der Turbo-Deckel nie", () => {
    expect(src).toMatch(/function erupt\(\{[^}]*sweepDur/);
    const stage = readFileSync(new URL("../src/ui/fx/PixiStage.jsx", import.meta.url), "utf8");
    expect(stage).toMatch(/erupt\(\{[^}]*sweepDur/);
  });

  it("zählt lebende Funken in beide Richtungen (sonst regelt das Budget ins Leere)", () => {
    expect(src).toMatch(/liveSparks\+\+/);
    expect(src).toMatch(/liveSparks--/);
    expect(src).toMatch(/liveSparks = 0/);   // reset() beim Effektwechsel
  });

  it("hält den Nebel-Backdrop auf lite aus", () => {
    /* Der teuerste Posten des ganzen Effekts und der einzige, der NICHT am Stich hängt: zwei Blobs à ~333 px
       decken zusammen ~1,25× die Panelfläche additiv ab, in jedem Frame — gerechnet ~9,0 Mpx/s gegen 5,0 beim
       Meteor auf seiner Spitze. Niedrigere Alpha hilft nicht, additiv wird jedes Fragment trotzdem gerechnet. */
    expect(src).toMatch(/if \(params\.lite\) \{ for \(const nb of nebSpr\) nb\.spr\.alpha = 0; \}/);
  });

  it("löst die Schweif-Farbe über die Tabelle statt je Sample je Frame", () => {
    expect(src).toMatch(/p\.tint = trailLut\[/);
    expect(src).not.toMatch(/p\.tint = rgbInt\(interpStops/);   // die alte, allozierende Fassung
  });
});

/* ============================================================
   Runde 2 (#perf-meteor2) — „noch weniger Meteoriten": Anzahl bei Turbo, Fläche im späten Lauf.
   Warum getrennt: Bei Turbo überlappen die Kometen, dort fällt einer weniger nicht auf. Im späten Lauf
   kommen sie einzeln und gehören sichtbar zum Stich — dort würde ein Weglassen als Fehler gelesen, deshalb
   schrumpft dort stattdessen der Riese.
   ============================================================ */
describe("#perf-meteor2 — Spawn-Takt (Turbo) und Größen-Deckel (spätes Spiel)", () => {
  const FULL = 1;   // TUNE.SHOOT_DUR

  it("Desktop bleibt unangetastet — beide Deckel greifen nur auf lite", () => {
    expect(cometStride(false, 0.35 * 1000, FULL)).toBe(1);
    expect(cometSize(false, 3)).toBe(3);
  });

  it("halbiert erst, wenn die Kometen sich überhaupt überlappen können", () => {
    /* Die Schwelle ist der BODEN von cometLifeS (fullS / MAX_SPEEDUP = 0,5 s), nicht der Punkt, an dem
       die Flugdauer zu folgen beginnt. Solange der Stich-Takt über dem Boden liegt, endet jeder Komet mit
       seinem eigenen Stich — es überlappt nichts, und Auslassen wäre reiner Verlust. */
    expect(cometStride(true, 1750, FULL)).toBe(1);   // 1x Tempo
    expect(cometStride(true, 875, FULL)).toBe(1);    // 2x — Komet endet mit seinem Stich
    expect(cometStride(true, 500, FULL)).toBe(1);    // exakt am Boden — immer noch keine Überlappung
    expect(cometStride(true, 499, FULL)).toBe(2);    // erster Takt, bei dem der Komet seinen Stich überlebt
    expect(cometStride(true, 350, FULL)).toBe(2);    // MAX
  });

  it("ohne bekannten Stich-Takt (Showcase/Altaufruf) feuert jeder Stich", () => {
    expect(cometStride(true, 0, FULL)).toBe(1);
    expect(cometStride(true, undefined, FULL)).toBe(1);
  });

  it("der Größen-Deckel trifft NUR den gottgleichen Riesen", () => {
    const TIER_SIZE = [0.5, 1.2, 1.5, 2, 3];   // Spiegel der Tabelle in starfieldPixi.js
    const capped = TIER_SIZE.map((v) => cometSize(true, v));
    expect(capped.slice(0, 4)).toEqual(TIER_SIZE.slice(0, 4));   // Schwach..Irre unberührt
    expect(capped[4]).toBe(SIZE_CAP_LITE);
    // Halbierte Fläche (Fill geht quadratisch) — das ist der Zweck der Zahl, nicht ihr Nebeneffekt.
    expect((SIZE_CAP_LITE / TIER_SIZE[4]) ** 2).toBeCloseTo(0.49, 2);
    // Die Tier-Leiter darf nicht umkippen: Gottgleich bleibt sichtbar größer als Irre.
    expect(SIZE_CAP_LITE).toBeGreaterThan(TIER_SIZE[3]);
  });

  it("der Zähler hängt am gewonnenen STICH, nicht am gespawnten Kometen", () => {
    // Zählte er die Kometen, verschöbe sich das Muster mit jedem Übersprungenen und die Halbierung liefe
    // aus dem Tritt (es käme mal jeder zweite, mal jeder dritte).
    expect(src).toMatch(/const seq = winSeq\+\+;/);
    expect(src).toMatch(/seq % 2 !== 0\) return;/);
    expect(src).toMatch(/winSeq = 0;/);   // reset() beim Effektwechsel
  });

  it("überspringt VOR der Zufalls-/Geometrierechnung", () => {
    // Sonst zöge ein übersprungener Meteor trotzdem seine Zufallszahlen — die Streuung der verbleibenden
    // Kometen würde sich mit dem Tempo verschieben, das Feld sähe bei Turbo anders aus.
    const body = src.slice(src.indexOf("function erupt("));
    expect(body.indexOf("cometStride(")).toBeLessThan(body.indexOf("const d = Math.random()"));
  });
});
