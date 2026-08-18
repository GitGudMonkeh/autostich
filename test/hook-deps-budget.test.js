import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* #hooks — Ratsche für die Ausnahmen von `react-hooks/exhaustive-deps`.

   44 Stück stehen im Quellbaum. Das ist keine Nachlässigkeit: sie sind fast alle bewusst gesetzt und
   im Repo-Idiom begründet (`-- <Grund> — #292 geprüft`), meist um einen Effekt an einer SIGNATUR
   (`archSig`, `flashSig`) oder an einem AUSLÖSER (`trickNo`, `pack.id`, `dragPrev`) zu keyen statt an
   allem, was er liest. Ohne eine Ratsche kennt so eine Zahl aber nur eine Richtung — jede neue Regel
   wird beim Draufschreiben zur Gewohnheit, und irgendwann steht die Ausnahme da, die WIRKLICH ein
   Stale-Closure verdeckt.

   Deshalb ein Budget JE DATEI statt einer Gesamtsumme: nur so fällt auf, wenn eine Datei ohne bisher
   eine bekommt, während anderswo eine wegfällt. Die Zahlen dürfen nur SINKEN.

   Wird der Test rot:
     · zu viele → die neue Ausnahme begründen und prüfen, ob sie wirklich nötig ist. Meist lässt sich
       der Dep stabilisieren (useCallback, Signatur-String, Ref-Spiegel) statt die Regel abzuschalten.
     · zu wenige → Glückwunsch, das Budget hier senken (oder die Zeile ganz löschen, wenn 0).
     · neue Datei → Eintrag hinzufügen, aber erst nachdem die Ausnahme jemand angeschaut hat. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

// Stand 18.08.2026. Nur nach unten korrigieren.
const BUDGET = {
  "src/App.jsx": 4,
  "src/ui/ArchitectScreen.jsx": 13,
  "src/ui/Battlefield.jsx": 8,
  "src/ui/CardGrid.jsx": 1,
  "src/ui/ChronikOverview.jsx": 3,
  "src/ui/CustomizeScreen.jsx": 1,
  "src/ui/FormationPhase.jsx": 6,
  "src/ui/Glossary.jsx": 2,
  "src/ui/RunLoader.jsx": 1,
  "src/ui/fx/FireHead.jsx": 1,
  "src/ui/fx/HoloCubePixi.jsx": 1,
  "src/ui/fx/PixiStage.jsx": 1,
  "src/ui/fx/PrismaKaskadePixi.jsx": 1,
  "src/ui/fx/SupernovaPixi.jsx": 1,
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e)) out.push(p);
  }
  return out;
}

const ist = {};
for (const p of walk(SRC)) {
  const n = readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => l.includes("eslint-disable") && l.includes("react-hooks/exhaustive-deps")).length;
  if (n) ist[relative(ROOT, p).replace(/\\/g, "/")] = n;
}

describe("Hook-Deps · Ausnahmen-Budget", () => {
  it("keine Datei überschreitet ihr Budget, und keine neue kommt unbemerkt dazu", () => {
    const zuViel = Object.entries(ist)
      .filter(([f, n]) => n > (BUDGET[f] ?? 0))
      .map(([f, n]) => `${f}: ${n} statt ${BUDGET[f] ?? 0}`);
    expect(
      zuViel,
      "Neue exhaustive-deps-Ausnahme(n). Bitte erst prüfen, ob sich der Dep stabilisieren lässt "
      + "(useCallback · Signatur-String · Ref-Spiegel), bevor das Budget in test/hook-deps-budget.test.js steigt.",
    ).toEqual([]);
  });

  it("das Budget ist nicht veraltet — gesunkene Zahlen werden festgeschrieben", () => {
    const zuHoch = Object.entries(BUDGET)
      .filter(([f, n]) => (ist[f] ?? 0) < n)
      .map(([f, n]) => `${f}: nur noch ${ist[f] ?? 0} statt ${n}`);
    expect(
      zuHoch,
      "Ausnahmen sind weggefallen — bitte das Budget in test/hook-deps-budget.test.js entsprechend senken, "
      + "sonst hält die Ratsche den alten, zu großzügigen Stand fest.",
    ).toEqual([]);
  });

  it("jede Ausnahme trägt eine Begründung in ihrer Nähe", () => {
    // Repo-Idiom: entweder `-- <Grund>` hinter dem Regelnamen, oder ein Kommentarblock unmittelbar davor.
    // Eine Ausnahme ohne jede Notiz ist die, die später niemand mehr einordnen kann.
    const blank = [];
    for (const f of Object.keys(ist)) {
      const L = readFileSync(join(ROOT, f), "utf8").split("\n");
      L.forEach((l, i) => {
        if (!(l.includes("eslint-disable") && l.includes("react-hooks/exhaustive-deps"))) return;
        const eigen = l.split("react-hooks/exhaustive-deps")[1].trim();
        const davor = (L[i - 1] || "").trim();
        const nah = L.slice(Math.max(0, i - 6), i).some((x) => x.trim().startsWith("//"));
        if (!eigen && !davor.startsWith("//") && !nah) blank.push(`${f}:${i + 1}`);
      });
    }
    expect(blank, `Ausnahme ohne Begründung: ${blank.join(", ")}`).toEqual([]);
  });
});
