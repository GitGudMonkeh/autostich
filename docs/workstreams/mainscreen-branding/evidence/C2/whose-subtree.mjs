#!/usr/bin/env node
/* #mainscreen-branding C2 — whose subtree is `0/0/2/0/5/0`?
   ============================================================================

   THE GATE'S WORDING AND THIS SCREEN'S SHAPE DISAGREE, and the disagreement has to be settled with a
   measurement rather than with a paragraph. The gate says *every surface but `hub` at zero deltas*.
   But **the hub's DOM stands behind every menu overlay** — the survey navigates from the hub and the
   overlays render on top of it — so a node ADDED to the hub shifts the structural path of everything
   after it in eleven surfaces at once, without any of those eleven screens having changed.

   That is what the comparator reports: 2750 deltas and 1600 unmatched nodes, all of them under one
   path prefix, and **zero** on the five in-run surfaces, where the run replaces the hub.

   This file answers the one question that turns that from an excuse into evidence: **is that prefix
   the hub?** It walks the path in the live page, on a surface that is NOT the hub, and prints what it
   finds. Nothing is inferred from the shape of the numbers. */

import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate }
  from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:5181${BASE}`;
const PREFIX = "0/0/2/0/5/0";

const conn = await launch({ port: 9342 });
try {
  await conn.send("Page.enable");
  await conn.send("Runtime.enable");
  await reduceMotion(conn);
  await seedRandom(conn);
  await suppressInstallPrompt(conn);
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  await setViewport(conn, { width: 1920, height: 1080, deviceScaleFactor: 1 });
  await goto(conn, ORIGIN, { settleMs: 400 });
  await evaluate(conn, `(() => { localStorage.setItem("as_options", JSON.stringify({ lang: "de",
    muted: true, telemetry: false, reducedFx: "an", testViewport: null }));
    localStorage.setItem("as_username", "SURVEY"); return true; })()`);
  await goto(conn, ORIGIN, { settleMs: 1600 });
  /* Open OPTIONS — a surface the diff reports deltas on and that this commit does not touch. */
  await evaluate(conn, `(() => { const b = Array.from(document.querySelectorAll("button, a[role=button]"))
    .find((e) => (e.textContent || "").trim().toLowerCase().startsWith("optionen"));
    if (!b) throw new Error("no options button"); b.click(); return true; })()`);
  await new Promise((r) => setTimeout(r, 1200));
  const out = await evaluate(conn, `(() => {
    const walk = (path) => {
      let n = document.body;
      const trail = [{ step: "body", tag: "BODY", cls: "" }];
      for (const i of path.split("/").map(Number)) {
        n = n.children[i];
        if (!n) return { trail, missing: true };
        trail.push({ step: i, tag: n.tagName, cls: (n.getAttribute("class") || "").slice(0, 80) });
      }
      return { trail, missing: false,
        childCount: n.children.length,
        children: Array.prototype.slice.call(n.children).map((c, i) =>
          ({ i, tag: c.tagName, cls: (c.getAttribute("class") || "").slice(0, 60) })) };
    };
    return { onSurface: !!document.querySelector(".op-head, .as-ring-run"),
      hubStillMounted: !!document.querySelector(".hub-root"),
      prefix: walk(${JSON.stringify(PREFIX)}) };
  })()`);
  process.stdout.write(`  options open: ${out.onSurface} · hub still in the DOM behind it: ${out.hubStillMounted}\n\n`);
  process.stdout.write(`  walking ${PREFIX}\n`);
  for (const t of out.prefix.trail) process.stdout.write(`    ${String(t.step).padStart(4)}  ${t.tag}  ${t.cls}\n`);
  process.stdout.write(`\n  its ${out.prefix.childCount} children — the list whose indices shifted:\n`);
  for (const c of out.prefix.children) process.stdout.write(`    ${String(c.i).padStart(4)}  ${c.tag}  ${c.cls}\n`);
} finally {
  await conn.close();
}
