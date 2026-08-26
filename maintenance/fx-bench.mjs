/* FX-Messstand-Treiber (#perf). Spielt jeden Effekt einzeln im MOBILEN Pfad ab und protokolliert Frame-Abstände.
 *
 *   node maintenance/fx-bench.mjs                       # alle Effekte, 6 s je Effekt
 *   node maintenance/fx-bench.mjs --fx aurora --sec 10
 *   node maintenance/fx-bench.mjs --cpu 6               # stärker gedrosselt (schwächeres Gerät)
 *
 * VORAUSSETZUNG: `npm i -D playwright` (bewusst KEINE Abhängigkeit in package.json — sonst zöge jeder Install und
 * jede CI den Browser-Download nach, für ein Werkzeug, das nur beim Balancing gebraucht wird).
 *
 * WAS HIER MOBIL IST — beides nötig, keins allein reicht:
 *   hasTouch  → `pointer: coarse` greift, also laufen exakt die Mobile-Zweige (mobileTier.js, die coarse-Blöcke
 *               in den WebGL-Feldern, die lite-Pfade). Ohne das misst man den Desktop-Effekt.
 *   CPU-Drossel → ein Handy-Kern ist langsamer als der Testrechner. Die Drossel bildet das grob ab; sie trifft NUR
 *               die CPU, nicht die GPU. Fill-Rate-Effekte (die großen additiven Canvas) werden dadurch tendenziell
 *               UNTERSCHÄTZT. Das ist die wichtigste Einschränkung dieser Zahlen.
 *
 * OHNE GPU (Container/CI) rastert Chromium über SwiftShader in Software. Dann gilt: die Spalte „davon Skript" bleibt
 * gültig (Haupt-Thread-JS ist echtes JS), „CPU-Last" und die Frame-Abstände sind für ALLES fill-rate-lastige
 * WERTLOS — die WebGL-Felder und die Scheinwerfer sättigen dort garantiert, auf einem Handy mit echter GPU nicht.
 * Der Kopf der Ausgabe nennt den erkannten Renderer; steht dort SwiftShader, nur die Skript-Spalte auswerten.
 *
 * LESART: verglichen wird, nicht bewertet. p95 und der Anteil langer Frames sagen „ruckelt es", der Median sagt
 * „läuft es rund". Absolute Spielraten kommen hier nicht heraus — im Spiel laufen mehrere Effekte gleichzeitig.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const ALL = ["leer", "aurora", "neonsurf", "cubematrix", "cubelite", "cubespots", "cubespotsl", "frostice", "mossgrow"];
const list = (arg("--fx", null) || ALL.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const SEC = Number(arg("--sec", 6));
const CPU = Number(arg("--cpu", 4));
const PORT = Number(arg("--port", 5199));

const pct = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q))] : 0);

/* #health-check G3: vorher `spawn("npx", …, detached)` + Kill auf die Prozessgruppe (negative PID).
   Beides ist POSIX-only — auf Windows ist npx eine .cmd (Node 24 verweigert den Spawn ohne Shell) und
   process.kill(-pid) wirft. Wie scripts/check-preview-exclusion.mjs: Vites eigenen JS-Einstieg mit
   DIESEM Node starten — dann gibt es keinen Wrapper, das Kind IST Vite, und ein normales kill reicht
   auf beiden Plattformen. */
const VITE_BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [VITE_BIN, "--port", String(PORT), "--strictPort"], { stdio: ["ignore", "pipe", "pipe"] });
const stop = () => { try { server.kill("SIGTERM"); } catch { /* schon weg */ } };
process.on("exit", stop); process.on("SIGINT", () => { stop(); process.exit(1); });

// Auf „ready" warten statt blind zu schlafen — sonst misst man je nach Maschine mal einen kalten, mal einen warmen Start.
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error("Vite ist nicht hochgekommen")), 60000);
  server.stdout.on("data", (b) => { if (/ready in|Local:/i.test(String(b))) { clearTimeout(to); res(); } });
  server.stderr.on("data", (b) => process.stderr.write(b));
});

const { chromium } = await import("playwright");
/* Browser-Wahl: Bringt die Umgebung schon ein Chromium mit (Container-Image, `PLAYWRIGHT_BROWSERS_PATH`), nehmen wir
   das — die lokal ohne `--save` installierte Playwright-Version erwartet sonst eine andere Build-Nummer und schickt
   einen in `npx playwright install`. Fehlt es, lädt Playwright seinen eigenen. `--chrome <pfad>` sticht beides.
   `--enable-unsafe-swiftshader`: ohne GPU rastert Chromium WebGL in Software — siehe Lesart am Dateiende. */
const DEFAULT_EXE = "/opt/pw-browsers/chromium";
const EXE = arg("--chrome", process.env.FX_BENCH_CHROME || (existsSync(DEFAULT_EXE) ? DEFAULT_EXE : null));
const browser = await chromium.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 412, height: 800 }, deviceScaleFactor: 3 });

// Renderer EINMAL feststellen und ausweisen — SwiftShader (Software) macht die Fill-Rate-Spalten unbrauchbar.
const probe = await ctx.newPage();
const renderer = await probe.evaluate(() => {
  const g = document.createElement("canvas").getContext("webgl");
  const dbg = g && g.getExtension("WEBGL_debug_renderer_info");
  return g ? String(g.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : g.RENDERER)) : "kein WebGL";
});
await probe.close();
const swift = /swiftshader|software|llvmpipe/i.test(renderer);

console.log(`FX-Messstand · ${SEC} s je Effekt · CPU-Drossel ${CPU}× · 412×800 @ DPR 3 · pointer:coarse`);
console.log(`Renderer: ${renderer}`);
if (swift) console.log("⚠ SOFTWARE-RASTERIZER — nur die Spalte „davon Skript\" ist aussagekräftig. Alles Fill-Rate-lastige\n  (WebGL-Felder, Scheinwerfer) sättigt hier zwangsläufig und sagt nichts über ein Handy mit echter GPU.");
console.log("");
console.log(`${"Effekt".padEnd(12)}${"Median".padStart(8)}${"p95".padStart(9)}${"> 32 ms".padStart(10)}${"CPU-Last".padStart(11)}${"davon Skript".padStart(14)}`);

/* Zwei Zahlen, weil eine nicht reicht:
     rAF-Abstände  sagen „ruckelt es JETZT" — aber nur, wenn der Effekt den Thread bereits sättigt. Ein Effekt, der
                   3 ms je Frame kostet, sieht hier aus wie gar keiner: die Frames bleiben auf der Bildschirmrate.
     CPU-Last      (CDP `Performance.getMetrics`, TaskDuration je Sekunde) misst die ARBEIT, auch weit unterhalb der
                   Sättigung — und genau die addiert sich im Spiel, wo mehrere Effekte gleichzeitig laufen.
   Die Nullmessung „leer" ist die Grundlast des Messstands; interessant ist der ABSTAND dazu, nicht der Absolutwert. */
const metrics = async (cdp) => {
  const { metrics: m } = await cdp.send("Performance.getMetrics");
  const get = (n) => (m.find((x) => x.name === n)?.value ?? 0);
  return { task: get("TaskDuration"), script: get("ScriptDuration") };
};

const rows = [];
for (const fx of list) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await cdp.send("Performance.enable");
  await page.goto(`http://localhost:${PORT}/bench/fx.html?fx=${fx}`, { waitUntil: "load" });
  await page.waitForTimeout(1500);                 // Aufbau/Shader-Kompilierung nicht mitmessen
  await page.evaluate(() => window.__benchReset && window.__benchReset());
  const m0 = await metrics(cdp);
  await page.waitForTimeout(SEC * 1000);
  const m1 = await metrics(cdp);
  const frames = await page.evaluate(() => (window.__benchRead ? window.__benchRead() : []));
  /* Plausibilitätsprüfung statt Vertrauen: ein Effekt, dessen Canvas auf den Standardmaßen 300×150 steht, hat sich
     nie an seinen Host angepasst — er malt auf eine Briefmarke und meldet „kostet nichts". Das ist hier schon
     passiert (fehlendes App-Stylesheet, siehe bench/fx.jsx). Lieber eine Warnung als eine hübsche falsche Zahl. */
  const canvases = await page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => c.width + "×" + c.height));
  const suspect = fx !== "leer" && (canvases.length === 0 || canvases.every((s) => s === "300×150"));
  await page.close();

  const s = frames.slice().sort((a, b) => a - b);
  const longs = frames.filter((d) => d > 32).length;
  const row = {
    fx, median: pct(s, 0.5), p95: pct(s, 0.95), longPct: frames.length ? (longs / frames.length) * 100 : 0,
    cpu: ((m1.task - m0.task) / SEC) * 100, script: ((m1.script - m0.script) / SEC) * 100,
  };
  rows.push(row);
  console.log(`${fx.padEnd(12)}${row.median.toFixed(1).padStart(6)} ms${row.p95.toFixed(1).padStart(7)} ms${row.longPct.toFixed(1).padStart(9)}%${row.cpu.toFixed(1).padStart(10)}%${row.script.toFixed(1).padStart(13)}%${suspect ? "  ⚠ Canvas ungemessen (" + (canvases.join(",") || "keine") + ")" : ""}`);
}

// Abstand zur Nullmessung — das ist der eigentliche Preis des Effekts.
const base = rows.find((r) => r.fx === "leer");
if (base && rows.length > 1) {
  console.log(`\n${"Netto (− leer)".padEnd(12)}${"CPU-Last".padStart(11)}${"davon Skript".padStart(14)}`);
  for (const r of rows) if (r !== base) {
    console.log(`${r.fx.padEnd(12)}${(r.cpu - base.cpu).toFixed(1).padStart(10)}%${(r.script - base.script).toFixed(1).padStart(13)}%`);
  }
}

await browser.close();
stop();
console.log("\nLesart: „davon Skript\" = Haupt-Thread-JS, überall gültig. „CPU-Last\"/Frame-Abstände nur mit echter GPU");
console.log("aussagekräftig. Zum VERGLEICHEN gebaut (vorher/nachher, Effekt gegen Effekt), nicht als absolute Spielrate.");
