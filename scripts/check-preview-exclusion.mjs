#!/usr/bin/env node
/* #400 — proves on the BUILT ARTEFACT that the test-viewport harness is absent from a production
   build. Run it with:

     node scripts/check-preview-exclusion.mjs

   Why this is not a Vitest guard: the suite reads source text and can show that the switch sits
   behind `import.meta.env.VITE_PREVIEW === "1"` and that the gate really controls the render
   (test/test-viewport.test.js does both). It cannot show that Vite substitutes the value, that the
   minifier folds the branch away, and that Rollup then drops the module and its chunk. Only a build
   can show that, and only a build is what actually ships.

   THE POINT OF THE DESIGN — the positive control. The script builds TWICE and requires every marker
   to be PRESENT in the preview build and ABSENT in the production build. A marker that is missing
   from both would make this check structurally incapable of failing, and it would then be read as
   proof (docs/engineering/testing.md §5). So that case is a hard error here, not a pass.

   THE MARKER TRAP, measured 21.08.2026 and recorded so nobody repeats it: the i18n catalogs are NOT
   gated — they ship whole in every build. `options.testvp.*` therefore occurs eight times in a
   production bundle. Any catalog key is a useless marker. The markers below are string literals that
   exist only inside the gated modules and survive minification unchanged. */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Present in preview, absent in main. All three are literals of the harness modules; none of them
   occurs anywhere else in the bundle (verified in both directions by the run below). */
const MARKERS = [
  { needle: "TestViewportHarness", why: "the harness module and its emitted chunk" },
  { needle: "content-box", why: "the frame's box model — the two pixels the harness depends on" },
  { needle: "max-content", why: "the shell that lets an oversized frame scroll instead of clipping" },
];

/* Counter-marker: this one MUST be in both. It documents the trap in executable form — if a future
   reader reaches for a catalog key as a marker, this line already says why that fails. */
const CATALOG_MARKER = "options.testvp.";

/* Vite's own JS entry, run with this Node — deliberately not `npm run build`:
     · `npm` is `npm.cmd` on Windows, and Node 24 refuses to spawn a `.cmd` without a shell;
     · `shell: true` would concatenate rather than escape the arguments (Node DEP0190), and the temp
       path below is generated.
   A plain .js file spawned with `process.execPath` has neither problem on either platform. */
const VITE_BIN = join(ROOT, "node_modules", "vite", "bin", "vite.js");

function build(outDir, preview) {
  execFileSync(process.execPath, [VITE_BIN, "build", "--outDir", outDir, "--emptyOutDir"], {
    cwd: ROOT,
    stdio: "pipe",
    env: preview ? { ...process.env, VITE_PREVIEW: "1" } : withoutPreview(process.env),
  });
}

function withoutPreview(env) {
  const e = { ...env };
  delete e.VITE_PREVIEW;
  return e;
}

function bundleText(outDir) {
  const dir = join(outDir, "assets");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n")
    // The chunk file names carry the module name and are part of the evidence.
    + "\n" + readdirSync(dir).join("\n");
}

if (!existsSync(VITE_BIN)) {
  // The most common cause of an inexplicable failure in a fresh worktree — say so plainly.
  /* MH3: `writeSync` and not `console.error`. This bail MUST stop the script — everything below
     assumes a working vite — so the exit call stays, and the message is therefore written straight
     to fd 2 rather than queued on a stream that `process.exit()` would discard. Nothing has been
     printed before this point, so there is nothing else in flight to lose. */
  writeSync(2, `vite not found at ${VITE_BIN} — run \`npm ci\` in this worktree first.\n`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "autostich-vp-"));
const mainDir = join(tmp, "main");
const previewDir = join(tmp, "preview");
const fail = [];

try {
  process.stdout.write("building production variant … ");
  build(mainDir, false);
  process.stdout.write("ok\nbuilding preview variant … ");
  build(previewDir, true);
  process.stdout.write("ok\n\n");

  const main = bundleText(mainDir);
  const preview = bundleText(previewDir);

  for (const { needle, why } of MARKERS) {
    const inMain = main.includes(needle);
    const inPreview = preview.includes(needle);
    if (!inPreview) {
      fail.push(`USELESS MARKER: "${needle}" is missing from the PREVIEW build too (${why}). `
        + "This check could never have failed. Pick a marker that the gated code actually emits.");
    } else if (inMain) {
      fail.push(`LEAK: "${needle}" is present in the PRODUCTION build (${why}).`);
    }
    console.log(`${inMain ? "LEAK  " : "absent"}  main   ·  ${inPreview ? "present" : "MISSING"}  preview   ${needle}`);
  }

  if (!main.includes(CATALOG_MARKER) || !preview.includes(CATALOG_MARKER)) {
    fail.push(`The catalog counter-marker "${CATALOG_MARKER}" is no longer in both builds. `
      + "Either the i18n keys were renamed, or the catalogs became gated — check which, and update "
      + "the trap note at the top of this file. Do not just delete this assertion.");
  } else {
    console.log(`present main  ·  present preview   ${CATALOG_MARKER} (expected — catalogs are never gated)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/* MH3 — THE `else` IS LOAD-BEARING, and it is why this site could not be converted mechanically.
   `process.exit()` here was doing two jobs: reporting the failure AND skipping the OK line below it.
   Dropping the exit call for `process.exitCode` alone would let a FAILED run print that it passed —
   the loop above has already written its per-marker lines to stdout, so the exit had to go. */
if (fail.length) {
  console.error("\n#400 preview exclusion FAILED:\n  " + fail.join("\n  "));
  process.exitCode = 1;
} else {
  console.log("\n#400 preview exclusion OK — the harness is not in the production build.");
}
