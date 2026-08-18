import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* #engines — Node-Version an EINER Stelle festhalten.

   Die fünf Workflows pinnen `node-version: 22`, package.json sagte dazu bisher nichts. Wer das Projekt
   lokal auf einer anderen Version fährt, bekam keinerlei Hinweis — und der Unterschied fällt erst auf,
   wenn etwas kaputtgeht, was auf 22 lief. Das `engines`-Feld ist jetzt die Ansage; npm warnt beim
   Installieren, ohne jemanden auszusperren (kein `engine-strict`).

   Der Bereich ist nicht gegriffen, sondern der SCHNITT dessen, was die Toolchain selbst verlangt:
   vitest 4 fordert `^20 || ^22 || >=24` (ungerade Node-Linien sind bewusst ausgenommen — sie bekommen
   keine LTS-Pflege), vite 6 `^18 || ^20 || >=22`. Der engere von beiden gewinnt.

   Dieser Test hält die drei Orte zusammen: das Feld, die Workflows und die Toolchain. Zieht ein
   Dependency-Update den Boden hoch, wird er rot statt dass die Angabe still veraltet. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/* Winziger Prüfer für die Form `^X.Y.Z || >=X.Y.Z` — nur so viel semver, wie hier gebraucht wird.
   Bewusst keine neue Abhängigkeit für vier Zeilen Vergleich. */
function erlaubt(range, major) {
  return range.split("||").map((s) => s.trim()).some((teil) => {
    const m = teil.match(/^([\^>=]*)\s*(\d+)/);
    if (!m) return false;
    const [, op, maj] = m;
    return op.startsWith("^") ? Number(maj) === major : Number(maj) <= major;
  });
}

const wfDir = join(ROOT, ".github/workflows");
const workflows = readdirSync(wfDir).filter((f) => f.endsWith(".yml"));
const ciVersionen = workflows.flatMap((f) => {
  const t = readFileSync(join(wfDir, f), "utf8");
  return [...t.matchAll(/node-version:\s*["']?(\d+)/g)].map((m) => [f, Number(m[1])]);
});

describe("Node-Version · engines", () => {
  it("package.json nennt überhaupt einen Bereich", () => {
    expect(pkg.engines?.node, "engines.node fehlt").toBeTruthy();
  });

  it("jeder Workflow fährt eine Version, die der Bereich erlaubt", () => {
    expect(ciVersionen.length, "kein Workflow pinnt node-version").toBeGreaterThan(0);
    const daneben = ciVersionen
      .filter(([, v]) => !erlaubt(pkg.engines.node, v))
      .map(([f, v]) => `${f}: node ${v} passt nicht zu "${pkg.engines.node}"`);
    expect(daneben).toEqual([]);
  });

  it("der Bereich ist nicht weiter als das, was die Toolchain selbst verlangt", () => {
    // vitest ist derzeit der engste Boden. Hebt ein Update ihn an, muss engines mitziehen.
    const tool = JSON.parse(readFileSync(join(ROOT, "node_modules/vitest/package.json"), "utf8"));
    const toolMin = Math.min(...tool.engines.node.split("||").map((s) => Number(s.match(/\d+/)[0])));
    const eigMin = Math.min(...pkg.engines.node.split("||").map((s) => Number(s.match(/\d+/)[0])));
    expect(
      eigMin,
      `vitest verlangt mindestens Node ${toolMin}, engines.node lässt ${eigMin} zu — bitte anheben.`,
    ).toBeGreaterThanOrEqual(toolMin);
  });

  it("die laufende Node-Version erfüllt den Bereich (sonst ist dieser Testlauf selbst nicht aussagekräftig)", () => {
    expect(erlaubt(pkg.engines.node, Number(process.versions.node.split(".")[0]))).toBe(true);
  });
});
