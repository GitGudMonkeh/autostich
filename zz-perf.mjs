/* Perf-A/B: was kostet was auf dem Handy?
   ============================================================================
   Der Report des Owners sagt WAS ruckelt, nicht WOVON. Diese Messung dreht je einen Effekt ab und
   faehrt dieselbe Strecke — anders bekommt man nur eine Vermutung, die teuer aussieht.

   ECHTE HANDY-BEDINGUNGEN, nicht bloss ein schmales Fenster: `mobile: true` plus Touch-Emulation,
   damit `(pointer: coarse)` wirklich matcht. Daran haengen `isCoarse()` und die halbe Drosselung im
   Effekt-Code — ein 390er Fenster mit Desktop-Zeiger misst den Desktop-Pfad und beweist nichts.

   EIGENER SAMPLER statt des App-Recorders: der liegt nicht auf `window`, und ihn dafuer zu
   exportieren hiesse, fuer eine Messung Produktionscode anzufassen. Gemessen werden Frame-ABSTAENDE,
   also genau das, woraus der Report des Owners seine Perzentile bildet. */
import { launch, seedRandom, suppressInstallPrompt, goto, evaluate, sleep } from "./scripts/cdp.mjs";

const ORIGIN = "http://localhost:5191/autostich/";
const PLAY_MS = Number(process.argv[2] || 45000);
const CPU = Number(process.argv[3] || 4);   // 1 = aus; ein Handy-SoC liegt grob bei 4-6x

const CASES = [
  { id: "alle an",     fx: { cubes: true,  glitch: true,  fin: "klinge" } },
  { id: "ohne Cubes",  fx: { cubes: false, glitch: true,  fin: "klinge" } },
  { id: "ohne Glitch", fx: { cubes: true,  glitch: false, fin: "klinge" } },
  { id: "ohne Klinge", fx: { cubes: true,  glitch: true,  fin: "standard" } },
  { id: "keiner",      fx: { cubes: false, glitch: false, fin: "standard" } },
];

const opts = (fx) => JSON.stringify({
  lang: "de", muted: true, telemetry: false, reducedFx: "mobile", perfHud: false,
  testViewport: null, haptics: false,
  fxCubeMatrix: fx.cubes, fxCubeMatrixWire: true, fxCubeMatrixSun: true, fxCubeMatrixDeck: true,
  fxGlitch: fx.glitch, fxEdgeGlow: false, fxHolo: false,
  fxAurora: false, fxNeonsurf: false, fxStarfield: false,
  finisher: fx.fin,
});

const SAMPLER = `(() => {
  if (window.__s) window.__s.stop();
  const d = []; let last = 0, raf = 0, on = true;
  const tick = (t) => { if (!on) return; if (last) d.push(t - last); last = t; raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  window.__s = { stop: () => { on = false; cancelAnimationFrame(raf); }, read: () => d };
  return 1;
})()`;

const READ = `(() => {
  window.__s.stop();
  const d = window.__s.read().slice().sort((a, b) => a - b);
  if (!d.length) return null;
  const q = (p) => +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1);
  const sum = d.reduce((a, b) => a + b, 0);
  return {
    frames: d.length, spanS: +(sum / 1000).toFixed(1), fps: +(d.length / (sum / 1000)).toFixed(1),
    p50: q(0.5), p95: q(0.95), p99: q(0.99), worst: +d[d.length - 1].toFixed(1),
    over20: d.filter((x) => x > 20).length, over33: d.filter((x) => x > 33).length,
  };
})()`;

const c = await launch();
const rows = [];
try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844,
  });
  await c.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (CPU > 1) await c.send("Emulation.setCPUThrottlingRate", { rate: CPU });

  for (const cs of CASES) {
    await goto(c, ORIGIN, { settleMs: 500 });
    await evaluate(c, `(() => { localStorage.setItem("as_options", ${JSON.stringify(opts(cs.fx))});
      localStorage.setItem("as_username", "PERF"); localStorage.removeItem("as_activerun"); return 1; })()`);
    await goto(c, ORIGIN, { settleMs: 1400 });

    const coarse = await evaluate(c, `matchMedia("(pointer: coarse)").matches`);
    await evaluate(c, `(() => { const b=[...document.querySelectorAll("button")].find(x=>/Lauf beginnen|Start run|Weiter/i.test(x.textContent||"")); if(b) b.click(); return 1; })()`);
    await sleep(2600);
    await evaluate(c, `(() => { const b=document.querySelector(".sk-offers button"); if(b) b.click(); return 1; })()`);
    await sleep(1800);
    await evaluate(c, `(() => { const m=[...document.querySelectorAll("button")].find(x=>(x.textContent||"").trim()==="MAX"); if(m) m.click(); return 1; })()`);
    await sleep(2000);

    const inRun = await evaluate(c, `!!document.querySelector(".rn-shell")`);
    /* Erst jetzt sampeln: das Mounten der ersten Phase gehoert nicht in die Dauerlast. */
    await evaluate(c, SAMPLER);
    await sleep(PLAY_MS);
    const r = await evaluate(c, READ);
    rows.push({ id: cs.id, coarse, inRun, ...r });
    console.log(`  ${cs.id.padEnd(12)} coarse=${coarse} inRun=${inRun}  ${r ? `${r.fps} fps  p50 ${r.p50}  p95 ${r.p95}  >33ms: ${r.over33}` : "kein Sample"}`);
  }
} finally { await c.close(); }

console.log("\n" + "".padEnd(78, "-"));
console.log("Fall          fps    p50    p95    p99   worst   >20ms   >33ms");
for (const r of rows) {
  if (!r.frames) { console.log(`${r.id.padEnd(12)}  (kein Sample)`); continue; }
  console.log(`${r.id.padEnd(12)} ${String(r.fps).padStart(5)} ${String(r.p50).padStart(6)} ${String(r.p95).padStart(6)} ${String(r.p99).padStart(6)} ${String(r.worst).padStart(7)} ${String(r.over20).padStart(7)} ${String(r.over33).padStart(7)}`);
}
const base = rows.find((r) => r.id === "alle an");
if (base && base.frames) {
  console.log("\nGewinn gegenueber \"alle an\":");
  for (const r of rows.slice(1)) {
    if (!r.frames) continue;
    console.log(`  ${r.id.padEnd(12)} ${(r.fps - base.fps >= 0 ? "+" : "")}${(r.fps - base.fps).toFixed(1)} fps   p95 ${(r.p95 - base.p95).toFixed(1)} ms`);
  }
}
