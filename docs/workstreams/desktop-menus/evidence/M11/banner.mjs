#!/usr/bin/env node
/* #menu-rework M11 — the fifth surface, and the one that needs a different build to exist at all.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M11/banner.mjs --dist <dir> --out <dir> [--shots <dir>]

   `UpdateBanner` CANNOT RENDER IN THE BUILD THE REST OF THIS WORKSTREAM MEASURES, and that is a
   property of the component rather than of the harness. `useUpdateAvailable()` returns early unless
   BOTH hold: `import.meta.env.PROD`, and a build stamp — `CURRENT = BUILD_SHA || BUILD_NUM || null`,
   injected from `VITE_BUILD_SHA` / `VITE_BUILD_NUM` at build time by CI. A local `npm run build`
   sets neither, so `CURRENT` is null, the poll never starts, and the banner is unreachable no matter
   what the page does. `dialogs.mjs` measured `.up-banner` at zero in all sixteen of its cells for
   exactly that reason, and a record that stopped there would be reporting the harness's limit as the
   component's behaviour.

   SO THIS ONE IS MEASURED AGAINST A STAMPED BUILD, on its own port, and the record says so. Two
   things are supplied that the canonical build does not have:

     1. A BUILD STAMP. `VITE_BUILD_SHA` is set for this build only. Nothing else about the source
        differs — same commit, same config — so the surface under measurement is the same surface.
     2. A SERVER THAT CLAIMS TO BE NEWER. `version.json` is answered locally with a different sha,
        the way `survey-stub.mjs` answers the leaderboard: `leaderboardConfigured` stays true there,
        and here `import.meta.env.PROD` stays true and every code path is the real one. Without it
        the poll runs and correctly finds nothing to report.

   THE PREDICATE IS *CONTAINS NO X OTHER THAN Y*, like the other four: exactly one `.up-banner`, and
   the hub behind it (`.as-hub-tile` present), and no run dialog beside it — a banner measured over
   the wrong screen would be a different box in the same class.

   THE PROBE IS `dialogs.mjs`'s scoped one, imported rather than copied: same twelve properties,
   paths counted from the banner. Cells stay in the survey's shape, so `scripts/surface-delta.mjs`
   compares before and after with no special case. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { freezeClockSource, FROZEN_MS } from "../../../../../scripts/survey-stub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const PORT = 5182;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : fallback;
};
const DIST = arg("--dist", join(ROOT, "dist"));
const OUT = arg("--out", join(HERE, "banner"));
const SHOT_DIR = arg("--shots", null);

const BASE = (() => {
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const HOST = `http://localhost:${PORT}`;
const ORIGIN = `${HOST}${BASE}`;

const CELLS = [["de", 1280, 720], ["de", 1920, 1080], ["en", 1280, 720], ["en", 1920, 1080]];

/* The stamp this build actually carries, read out of its own bundle rather than assumed — if the
   env var did not reach the build, the banner cannot appear and the run must say that instead of
   timing out with no reason. */
const STAMP = (() => {
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*\/assets\/[^"]+)"/);
  if (!m) return null;
  const js = readFileSync(join(DIST, m[1].replace(BASE, "")), "utf8");
  const hit = js.match(/"m11-stamp-[a-z0-9]+"/);
  return hit ? hit[0].replace(/"/g, "") : null;
})();

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  const proc = spawn(process.execPath,
    [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE, "--outDir", DIST],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) {
      process.stdout.write("  serving " + DIST + " on " + PORT + "\n");
      return { stop: async () => { proc.kill(); await sleep(300); } };
    }
    await sleep(200);
  }
  proc.kill();
  throw new Error("vite preview did not come up on " + PORT);
}

/* A server that claims to be newer. Installed before the module graph runs, the way the leaderboard
   stub is: the app's own `check()` does the comparing, so the code path under measurement is real. */
const VERSION_STUB = "(() => {\n"
  + "  const real = window.fetch;\n"
  + "  window.fetch = function (input, init) {\n"
  + "    const url = String((input && input.url) || input || '');\n"
  + "    if (url.indexOf('version.json') >= 0) {\n"
  + "      return Promise.resolve(new Response(JSON.stringify({ sha: 'a-newer-build', build: '999' }),\n"
  + "        { status: 200, headers: { 'content-type': 'application/json' } }));\n"
  + "    }\n"
  + "    return real.apply(window, arguments);\n"
  + "  };\n"
  + "  return 1;\n"
  + "})()";

const seedScript = (lang) => "(() => {\n"
  + "  localStorage.setItem(\"as_reset_epoch\", \"2026-08-16-test-neustart\");\n"
  + "  localStorage.setItem(\"as_options\", " + JSON.stringify(JSON.stringify(
      { lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null })) + ");\n"
  + "  localStorage.setItem(\"as_username\", \"M11\");\n"
  + "  localStorage.removeItem(\"as_activerun\");\n"
  + "  return 1;\n"
  + "})()";

const VERDICT = "(() => {\n"
  + "  const n = (s) => document.querySelectorAll(s).length;\n"
  + "  const vis = (s) => Array.prototype.slice.call(document.querySelectorAll(s))\n"
  + "    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;\n"
  + "  return { upBanner: n('.up-banner'), hubTile: vis('.as-hub-tile'),\n"
  + "           rcWide: n('.rc-wide'), rcNarrow: n('.rc-narrow') };\n"
  + "})()";

const scopedProbeSource = (rootExpr) => "(() => {\n"
  + "  const d = document;\n"
  + "  const root = " + rootExpr + ";\n"
  + "  if (!root) return { surface: [], tokens: {}, rootFound: false };\n"
  + "  const r2 = (n) => Math.round(n * 100) / 100;\n"
  + "  const pathOf = (node) => {\n"
  + "    const parts = [];\n"
  + "    let n = node;\n"
  + "    while (n && n !== root) {\n"
  + "      const p = n.parentElement;\n"
  + "      if (!p) break;\n"
  + "      parts.push(Array.prototype.indexOf.call(p.children, n));\n"
  + "      n = p;\n"
  + "    }\n"
  + "    return parts.reverse().join('/') + ':' + node.tagName;\n"
  + "  };\n"
  + "  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];\n"
  + "  const four = (cs, pre, post) => SIDES.map((s) => cs[pre + s + (post || '')]).join(' ');\n"
  + "  const read = (e) => {\n"
  + "    const cs = getComputedStyle(e);\n"
  + "    const b = e.getBoundingClientRect();\n"
  + "    return { p: pathOf(e), bg: cs.backgroundColor, bi: cs.backgroundImage,\n"
  + "      bo: cs.backgroundOrigin + '|' + cs.backgroundClip + '|' + cs.backgroundSize,\n"
  + "      bc: four(cs, 'border', 'Color'), bw: four(cs, 'border', 'Width'), bs: four(cs, 'border', 'Style'),\n"
  + "      rd: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '),\n"
  + "      sh: cs.boxShadow, pd: four(cs, 'padding'),\n"
  + "      ol: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,\n"
  + "      op: cs.opacity, cl: cs.color,\n"
  + "      box: [r2(b.width), r2(b.height)] };\n"
  + "  };\n"
  + "  const paints = (r) =>\n"
  + "    (r.bg && r.bg !== 'rgba(0, 0, 0, 0)' && r.bg !== 'transparent')\n"
  + "    || (r.bi && r.bi !== 'none') || (r.sh && r.sh !== 'none')\n"
  + "    || r.bw !== '0px 0px 0px 0px' || r.rd !== '0px 0px 0px 0px' || r.pd !== '0px 0px 0px 0px'\n"
  + "    || (r.ol && r.ol.indexOf('none') === -1);\n"
  + "  const out = [];\n"
  + "  const all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));\n"
  + "  for (const e of all) {\n"
  + "    const cs = getComputedStyle(e);\n"
  + "    if (cs.display === 'none' || cs.visibility === 'hidden') continue;\n"
  + "    const r = read(e);\n"
  + "    if (paints(r)) out.push(r);\n"
  + "  }\n"
  + "  const TOKENS = ['--rd-sm', '--rd-md', '--el-flat', '--ed-quiet', '--sf-head'];\n"
  + "  const rootCs = getComputedStyle(d.documentElement);\n"
  + "  const tokens = {};\n"
  + "  for (const t of TOKENS) { const v = rootCs.getPropertyValue(t).trim(); if (v) tokens[t] = v; }\n"
  + "  return { surface: out, tokens: tokens, rootFound: true };\n"
  + "})()";

mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const c = await launch();
const matrix = { generated: null, base: BASE, dist: DIST, stamp: STAMP,
                 frozen: new Date(FROZEN_MS).toISOString(),
                 sizes: [...new Set(CELLS.map(([, w, h]) => w + "x" + h))],
                 langs: [...new Set(CELLS.map(([l]) => l))], cells: {} };
let unreached = 0;

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: VERSION_STUB });
  process.stdout.write("  clock pinned · version.json answered locally as a newer build\n");

  for (const [lang, w, h] of CELLS) {
    const size = w + "x" + h;
    const key = lang + "/" + size + "/update-banner";
    let cell;
    try {
      await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
      await goto(c, ORIGIN, { settleMs: 400 });
      await evaluate(c, seedScript(lang));
      await goto(c, ORIGIN, { settleMs: 1400 });

      let verdict = null;
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        verdict = await evaluate(c, VERDICT);
        if (verdict.upBanner >= 1) break;
        await sleep(300);
      }
      const wrong = (verdict && verdict.upBanner === 1 && verdict.hubTile > 0
                     && verdict.rcWide === 0 && verdict.rcNarrow === 0)
        ? null
        : "expected exactly one .up-banner on the hub and no run dialog beside it, got "
          + JSON.stringify(verdict);
      if (wrong) {
        unreached++;
        cell = { reached: false, why: wrong, verdict };
        process.stdout.write("    " + lang + " · " + size + "  NOT REACHED — " + wrong + "\n");
      } else {
        const probe = await evaluate(c, scopedProbeSource("document.querySelector('.up-banner')"));
        cell = Object.assign({ reached: true, verdict }, probe);
        process.stdout.write("    " + lang + " · " + size + "  ok · " + probe.surface.length
          + " painted nodes · radius " + probe.surface[0].rd.split(" ")[0]
          + " · shadow " + probe.surface[0].sh + "\n");
        if (SHOT_DIR) {
          mkdirSync(SHOT_DIR, { recursive: true });
          const png = await screenshot(c, null, { format: "png" });
          const file = join(SHOT_DIR, lang + "__" + size + "__update-banner.png");
          writeFileSync(file, Buffer.from(png, "base64"));
          cell.shot = file;
        }
      }
    } catch (err) {
      unreached++;
      cell = { reached: false, why: String((err && err.message) || err) };
      process.stdout.write("    " + lang + " · " + size + "  FAILED — " + cell.why + "\n");
    }
    matrix.cells[key] = cell;
  }
} finally {
  await c.close();
  await server.stop();
}

matrix.generated = new Date(FROZEN_MS).toISOString();
writeFileSync(join(OUT, "matrix.json"), JSON.stringify(matrix, null, 1));
process.stdout.write("  " + Object.keys(matrix.cells).length + " cells, " + unreached
  + " unreached -> " + join(OUT, "matrix.json") + "\n");
if (unreached) process.exitCode = 1;
