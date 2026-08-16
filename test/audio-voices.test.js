/* STIMMEN-DECKEL — lange Swells dürfen nicht gestohlen werden.

   Playtest: „der Supernova-Sound spielt im Schwarzloch-Showcase nicht bis zum Ende". Ursache war der
   Überlauf-Schutz in audio.js: bei mehr als SFX_MAX_VOICES gleichzeitigen One-Shots flog immer die
   ÄLTESTE Stimme raus. fx_supernova ist ein ~11-s-Swell und damit zwangsläufig die älteste, während
   nebenher Kartendreher und Treffer durchlaufen — er wurde also fast immer als Erster abgeschnitten.

   Geprüft wird die Auswahlregel als solche (welche Stimme fällt?), nicht Web Audio: die API gibt es
   in node nicht, und die Regel ist das, was hier schiefging. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../src/ui/audio.js", import.meta.url), "utf8");

/* Dieselbe Auswahl wie in audio.js: älteste OPFERBARE Stimme (nicht geschützt, nicht die neue). */
function stealOrder(voices, fresh, cap) {
  const pool = voices.slice();
  const gone = [];
  while (pool.length > cap) {
    const idx = pool.findIndex((x) => x !== fresh && !x.keep);
    if (idx < 0) break;
    gone.push(pool.splice(idx, 1)[0].name);
  }
  return { gone, left: pool.map((v) => v.name) };
}

describe("audio · Stimmen-Deckel", () => {
  it("der Swell ist in audio.js wirklich geschützt", () => {
    // fx_supernova MUSS geschützt sein; weitere ~11-s-Swells (z. B. fx_holocube) dürfen dazukommen.
    expect(SRC).toMatch(/SFX_KEEP\s*=\s*new Set\(\[[^\]]*"fx_supernova"[^\]]*\]\)/);
    // Die Auswahl darf nicht wieder auf „einfach die vorderste" zurückfallen.
    expect(SRC).not.toMatch(/while \(voices\.length > SFX_MAX_VOICES\) \{\s*const old = voices\.shift\(\)/);
  });

  it("opfert die älteste NICHT geschützte Stimme, nicht den Swell", () => {
    const nova = { name: "fx_supernova", keep: true };
    const fresh = { name: "cardflip", keep: false };
    const voices = [nova, { name: "hit1" }, { name: "hit2" }, fresh];
    const { gone, left } = stealOrder(voices, fresh, 3);
    expect(gone).toEqual(["hit1"]);          // die älteste opferbare
    expect(left).toContain("fx_supernova");  // der Swell bleibt
  });

  it("ohne Schutz wäre genau der Swell gefallen (der alte Fehler)", () => {
    const nova = { name: "fx_supernova", keep: false };   // wie vorher: nicht geschützt
    const fresh = { name: "cardflip", keep: false };
    const { gone } = stealOrder([nova, { name: "hit1" }, { name: "hit2" }, fresh], fresh, 3);
    expect(gone).toEqual(["fx_supernova"]);
  });

  it("nur geschützte Stimmen übrig → gar kein Diebstahl statt Endlosschleife", () => {
    const fresh = { name: "cardflip", keep: false };
    const voices = [{ name: "fx_supernova", keep: true }, { name: "fx_supernova", keep: true }, fresh];
    const { gone, left } = stealOrder(voices, fresh, 1);
    expect(gone).toEqual([]);       // nichts opferbar → Pool läuft kurz über
    expect(left).toHaveLength(3);   // aber die Schleife endet
  });

  it("die gerade gestartete Stimme wird nie gestohlen", () => {
    const fresh = { name: "cardflip", keep: false };
    const { gone } = stealOrder([fresh], fresh, 0);
    expect(gone).toEqual([]);
  });
});
