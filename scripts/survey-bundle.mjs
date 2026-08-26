#!/usr/bin/env node
/* #menu-rework MH2 — does the server on 5181 serve the bundle this survey built?
   ============================================================================

     node scripts/survey-bundle.mjs          # check the running server against dist/, print, exit 0/1

   M3-F09, outstanding since the first harness task. `ensureServer()` asked whether SOMETHING answers
   on the port and reused it. A preview server left running by an earlier session — there was one, from
   01:02, on this shared worktree — serves an abandoned `dist/` and is otherwise indistinguishable from
   a fresh one. M3 lost its gate to exactly that, and the planner cleared the port by hand afterwards.

   THE SHAPE OF THE FIX IS THE SHAPE OF THE WHOLE CONTRACT. The old check asked *is something there*.
   This one asks *is it the right thing*, and it can only answer that by comparing bytes.

   WHY A SEPARATE MODULE and not a function inside `viewport-survey.mjs`: that file launches a browser
   at module scope, so importing it into a test starts Chrome. A guard that cannot import the thing it
   guards ends up matching source text instead of behaviour, which `testing.md` names as the failure
   mode to avoid. Everything here is pure enough to call from a test with two directories and no
   network — `sha()` and `entryOf()` take their input as arguments.

   NO NEW DEPENDENCY. `node:crypto` ships with the runtime; `cdp.mjs` is dependency-free on purpose and
   this file keeps that property.

   TWO DOCUMENTS ARE COMPARED, and each catches a failure the other cannot:

     index.html   — a stale server built from a different `dist/` names a different entry chunk here.
                    This is also the check that catches the `--base` mistake `ensureServer()` documents:
                    without `--base`, every asset request comes back as the SPA fallback with status
                    200, and the page merely looks slow.
     entry chunk  — the SPA fallback returns index.html for a MISSING asset, with status 200 and
                    `text/html`. Comparing the entry chunk's bytes catches a `dist/` that has been
                    half-replaced under a server that is still holding the old index.

   CHECKED TWICE PER RUN — before the first cell and after the last. A one-time check at startup cannot
   see `npm run build` land in the middle of a survey, which is the contamination M3's record describes
   at length: the early cells measure the old bundle, the late cells the new one, and the matrix is a
   blend of two states that never existed together. Green, plausible, and meaningless. */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);

/* The entry module's href, taken from index.html exactly as `viewport-survey.mjs` takes the base from
   it — same regex family, same document, so the two cannot disagree about which script is the entry. */
export function entryOf(html) {
  const m = html.match(/<script[^>]+src="([^"]*\/assets\/[^"]+\.js)"/);
  return m && m[1] ? m[1] : null;
}

/* What `dist/` currently holds: the two documents and their hashes. Pure — give it a directory. */
export function distBundle(distDir) {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) throw new Error(`no dist/index.html at ${distDir} — run \`npm run build\` first.`);
  const indexBytes = readFileSync(indexPath);
  const href = entryOf(indexBytes.toString("utf8"));
  if (!href) throw new Error("dist/index.html names no /assets/*.js entry script — is this a real build?");
  /* The href is server-absolute and carries the deploy base ("/autostich/assets/…"); on disk the file
     sits directly under dist/. Take the tail from `/assets/` so the base cannot make the paths miss. */
  const entryPath = join(distDir, href.slice(href.indexOf("/assets/")));
  if (!existsSync(entryPath)) throw new Error(`dist/index.html points at ${href}, which is not on disk`);
  const entryBytes = readFileSync(entryPath);
  return { href, index: sha(indexBytes), entry: sha(entryBytes),
           indexSize: indexBytes.length, entrySize: entryBytes.length };
}

/* What the server actually answers with. `origin` is the scheme+host+port only — the href already
   carries the base path, and joining a based origin to a based href is how you get "/autostich/autostich/". */
export async function servedBundle(origin, dist, { timeoutMs = 8000 } = {}) {
  const get = async (path) => {
    const res = await fetch(origin + path, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, type: (res.headers.get("content-type") || "").split(";")[0], sha: sha(buf), size: buf.length };
  };
  const basePath = dist.href.slice(0, dist.href.indexOf("assets/"));
  return { index: await get(basePath), entry: await get(dist.href) };
}

/* The verdict, as data rather than as a throw, so both callers — the survey and its guard — can
   decide what to do with it. `ok` is true only when BOTH documents match byte for byte. */
export function verdict(dist, served) {
  const reasons = [];
  if (served.index.status !== 200) reasons.push(`index.html answered ${served.index.status}`);
  if (served.entry.status !== 200) reasons.push(`${dist.href} answered ${served.entry.status}`);
  /* The SPA fallback's signature: a 200 that is HTML where JavaScript was asked for. Named separately
     because "the hashes differ" would be a true but useless way to report it. */
  if (served.entry.status === 200 && served.entry.type === "text/html") {
    reasons.push(`${dist.href} came back as text/html — the SPA fallback answered, so the asset is not there`
      + " (a preview server started without --base does this to every asset)");
  } else if (served.entry.sha !== dist.entry) {
    reasons.push(`entry chunk differs: dist ${dist.entry} (${dist.entrySize} B) vs served ${served.entry.sha} (${served.entry.size} B)`);
  }
  if (served.index.sha !== dist.index) {
    reasons.push(`index.html differs: dist ${dist.index} (${dist.indexSize} B) vs served ${served.index.sha} (${served.index.size} B)`);
  }
  return { ok: reasons.length === 0, reasons, dist, served };
}

/* The one call the survey makes. It THROWS on a mismatch and does not fall back to starting its own
   server: the port is held with --strictPort, so there is nothing to fall back to, and the operator is
   the only one who can decide whether the inherited server may be killed. Refused, not reused, and
   never worked around silently. */
export async function assertServesDist(origin, distDir, { when = "before the run" } = {}) {
  const dist = distBundle(distDir);
  const v = verdict(dist, await servedBundle(origin, dist));
  if (!v.ok) {
    throw new Error(
      `the server on ${origin} is not serving this dist/ (${when}):\n`
      + v.reasons.map((r) => `      - ${r}`).join("\n")
      + `\n    A survey that measures an inherited bundle produces evidence for a build nobody has.`
      + `\n    Stop the process holding the port, or rebuild, and start the survey again.`);
  }
  return v;
}

if (process.argv[1] && process.argv[1].endsWith("survey-bundle.mjs")) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const PORT = Number(process.argv[process.argv.indexOf("--port") + 1]) || 5181;
  const dist = distBundle(join(ROOT, "dist"));
  console.log(`dist/  index ${dist.index}  entry ${dist.entry}  (${dist.href})`);
  try {
    const v = verdict(dist, await servedBundle(`http://localhost:${PORT}`, dist));
    console.log(`served index ${v.served.index.sha}  entry ${v.served.entry.sha}  [${v.served.entry.type}]`);
    console.log(v.ok ? `OK — localhost:${PORT} serves this dist/` : `MISMATCH:\n  ` + v.reasons.join("\n  "));
    process.exit(v.ok ? 0 : 1);
  } catch (e) {
    console.log(`no answer on localhost:${PORT} — ${String(e && e.message || e)}`);
    process.exit(1);
  }
}
