import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #perf-holo2 — Auflösung und Linienbreite gehören ZUSAMMEN.

   Die Regel, die dieser Wächter festnagelt: Ein Prunk darf seine `resolution` auf lite senken (Fill geht
   quadratisch, das ist der einzige Hebel mit zweistelligem Gewinn) — aber jede Linie, die danach dünner
   als rund 1,8 GERÄTE-Pixel läge, braucht ihren Breiten-Ausgleich mit. Ohne den tauscht man Fill gegen
   Aliasing statt gegen nichts.

   Warum das ein Test sein muss und kein Kommentar: die zwei Zahlen stehen in DERSELBEN Datei, aber ~130
   Zeilen auseinander (Zeichenschleife oben, `app.init` unten). Dreht jemand nur eine davon zurück, ist das
   Ergebnis nicht „wie vorher", sondern schlechter als beide Zustände: bei res 1,25 mit ausgeglichener
   Breite sind die Linien zu fett, bei res 1,0 ohne Ausgleich zu dünn. Genau diese Kopplung ist unsichtbar,
   solange man nur eine Datei liest.

   Geprüft wird der Quelltext, weil die Werte in Pixi-Aufrufen stecken und `pixi.js` in vitest (node, kein
   WebGL) nicht ladbar ist — dieselbe Trennung wie bei gott-timing.js / starfieldBudget.js.
   ============================================================ */

const fx = (f) => readFileSync(new URL(`../src/ui/fx/${f}`, import.meta.url), "utf8");

describe("#perf-holo2 — gesenkte Auflösung ist an den Breiten-Ausgleich gekoppelt", () => {
  it("Holo-Würfel: res 1,0 UND Kernlinie 1,9 auf lite", () => {
    const src = fx("HoloCubePixi.jsx");
    expect(src, "resLite fehlt — dann ist die 1,9 eine Verbreiterung statt eines Ausgleichs")
      .toMatch(/gottAppOptions\(\{[^)]*resLite: 1\.0/);
    // 1,9 × 1,0 = 1,90 Geräte-px gegen vorher 1,5 × 1,25 = 1,875 → dieselbe Linie.
    expect(src).toMatch(/coreW = s\.lite \? 1\.9 :/);
  });

  it("Laser-Fächer: res 1,0 UND Kernlinie × 1,25 auf lite", () => {
    const src = fx("LaserFaecherPixi.jsx");
    expect(src).toMatch(/gottAppOptions\(\{[^)]*resLite: 1\.0/);
    // Der Faktor stellt exakt die bisherige Geräte-Breite wieder her (1,58 × 1,25 = 1,98).
    expect(src).toMatch(/const coreW = Math\.max\(1, diag \* 0\.0032\) \* \(s\.lite \? 1\.25 : 1\);/);
    expect(src, "die Breite muss über coreW laufen, nicht wieder inline im stroke()")
      .toMatch(/cores\.stroke\(\{ width: coreW,/);
  });

  it("Prisma-Kaskade: res 1,0, aber BEWUSST ohne Ausgleich", () => {
    const src = fx("PrismaKaskadePixi.jsx");
    expect(src).toMatch(/gottAppOptions\(\{[^)]*resLite: 1\.0/);
    /* Die Ringe sind THICK×H ≈ 6,8 CSS-px breit und liegen damit auch bei res 1,0 weit über der Grenze.
       Ein Faktor hier wäre keine Kompensation, sondern eine sichtbare Look-Änderung — der Test hält
       fest, dass das Fehlen eine ENTSCHEIDUNG ist und kein Vergessen. */
    expect(src).toMatch(/const thick = Math\.max\(1, TUNE\.THICK \* H\);/);
    expect(src).not.toMatch(/thick[^;]*s\.lite \?/);
  });

  it("Sonnen-Puls ist als einziger Prunk noch nicht umgestellt", () => {
    /* Kein Fehler, sondern der offene Rest: der Effekt wurde in dieser Runde nicht angefasst. Fällt der
       Test rot, hat jemand ihn umgestellt — dann gehört hier eine Zeile hin, die sagt, ob seine dünnsten
       Linien einen Ausgleich brauchten. */
    expect(fx("SonnenPulsPixi.jsx")).not.toMatch(/resLite/);
  });
});
