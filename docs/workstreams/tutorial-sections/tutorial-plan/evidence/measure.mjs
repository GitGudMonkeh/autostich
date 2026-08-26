/* Measure the tutorial-lesson prototype in the real production build at 390 x 844.
   Reproduces every geometry number in planning-report.md §1.4a.

     npm run build
     npx vite preview --port 5189 --strictPort --base /autostich/
     node docs/workstreams/tutorial-sections/tutorial-plan/evidence/measure.mjs

   THE --base IS MANDATORY. vite.config.js sets `base: command === "build" ? "/autostich/" : "/"`,
   and for `vite preview` the command is "serve" — so the built-in base does NOT apply. Without it
   every asset request falls through to the SPA fallback and returns index.html: 1391 bytes of HTML
   where 156 575 bytes of CSS belong. The page then mounts nothing and STILL screenshots as a
   plausible dark screen, which is how a full set of confident, worthless numbers gets produced.
   Hence the two guards below. Same trap as scripts/phone-proof.mjs:162.

   Dependency-free, through the repository's own CDP client. Paths are repo-relative — a hard-coded
   drive letter would not survive the Linux laptop or CI (AGENTS.md — Portable tooling). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");          // → repository root
const { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate, screenshot } =
  await import(pathToFileURL(join(ROOT, "scripts/cdp.mjs")).href);

const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });
const PROTO = readFileSync(join(HERE, "lesson.js"), "utf8");

const PORT = 5189;                                      // task-contract.md — Local workspace
const ORIGIN = `http://localhost:${PORT}/autostich/`;
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };  // scripts/phone-proof.mjs

/* Guard 1 — is the server serving the app, or the SPA fallback? */
const css = await fetch(new URL("assets/", ORIGIN)).catch(() => null);
const probe = await fetch(ORIGIN).then((r) => r.text()).catch(() => "");
const cssHref = probe.match(/href="([^"]*\.css)"/)?.[1];
if (cssHref) {
  const bytes = (await fetch(new URL(cssHref, ORIGIN.replace(/\/autostich\/$/, "/"))).then((r) => r.arrayBuffer())).byteLength;
  if (bytes < 50_000) {
    throw new Error(`stylesheet came back as ${bytes} bytes — that is the SPA fallback, not the CSS. `
      + `Start the server with --base /autostich/.`);
  }
}
void css;

const c = await launch({ port: 9391 });
await c.send("Page.enable");
await c.send("Runtime.enable");
await setViewport(c, PHONE);
await reduceMotion(c);
await seedRandom(c);
await suppressInstallPrompt(c);
await goto(c, ORIGIN, { settleMs: 2500 });

/* Guard 2 — did React actually mount? An empty page measures cleanly and means nothing. */
const mounted = await evaluate(c, `document.querySelectorAll("#root *").length`);
if (mounted < 50) throw new Error(`app did not mount (${mounted} nodes) — measurement would be meaningless`);
console.log("app mounted, nodes:", mounted);

const results = {};
for (const view of ["top", "mitte"]) {
  await evaluate(c, PROTO);
  await evaluate(c, `window.__proto(${JSON.stringify(view)}); "ok"`);
  await new Promise((r) => setTimeout(r, 350));
  results[view] = JSON.parse(await evaluate(c, `JSON.stringify(window.__measure())`));
  writeFileSync(join(OUT, `knackig-${view}-390x844.png`), Buffer.from(await screenshot(c), "base64"));
}
writeFileSync(join(OUT, "measurements.json"), JSON.stringify(results, null, 2));

for (const [k, v] of Object.entries(results)) {
  console.log(`\n=== ${k} ===`);
  console.log(`Karte ${v.card.w}x${v.card.h} = ${v.cardShareOfScreen}% des Schirms | Kopf ${v.head.h} | Fuss ${v.foot.h}`);
  console.log(`Inhalt ${v.contentH} px in ${v.visibleH} px | Ueberhang ${v.overflowPx} | vom Fuss verdeckt: ${v.beatsHiddenByFoot.join(",") || "nichts"}`);
  console.log(`Luft: oben ${v.airAbove} / unten ${v.airBelow} / gesamt ${v.airTotal}`);
  console.log(`Querlauf ${v.horizontalOverflow} | Tippziele <44: ${v.tapsUnder44.length}`);
  console.log("Takte:", v.beats.map((b) => `${b.kind} ${b.withMargins}px/${b.chars}Z`).join(" · "));
}
await c.close();
