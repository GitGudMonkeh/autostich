import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #deck-mobil — Deck-Hintergrund im Handy-Hub, als Quelltext-Ratsche.

   Geprüft wird eine NAHT, keine Optik: der Schleier-Deckel für zu helle Spielfelder verteilt sich über
   drei Dateien — die Werte stehen in `cosmeticAssets.js`, skaliert wird in `index.css` über `--vk`, und
   gesetzt wird die Variable in `StartScreen.jsx`. Fällt eines der drei Glieder bei einem Umbau weg,
   kompiliert alles weiter und der Deckel wirkt einfach nicht mehr — genau die Sorte Fehler, die man
   erst am Gerät und Monate später bemerkt.

   Bewusst über den Quelltext statt über Importe: `cosmeticAssets.js` zieht ~120 Bilddateien, die in
   einer Node-Testumgebung nichts zu suchen haben (dieselbe Trennung wie zwischen `game/cosmetics.js`
   und `ui/cosmeticAssets.js`).
   ============================================================ */

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const assets = read("ui/cosmeticAssets.js");
const css    = read("index.css");
const start  = read("ui/StartScreen.jsx");

// Einträge der Deckel-Liste: { id: faktor }
const veilEntries = (() => {
  const block = assets.match(/const BATTLEFIELD_VEIL = \{([\s\S]*?)\};/);
  if (!block) return null;
  return [...block[1].matchAll(/(bf_\w+)\s*:\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]);
})();

describe("#deck-mobil — Schleier-Deckel für zu helle Spielfelder", () => {
  it("die Deckel-Liste existiert und nennt nur echte Spielfelder", () => {
    expect(veilEntries, "BATTLEFIELD_VEIL nicht mehr gefunden").toBeTruthy();
    expect(veilEntries.length).toBeGreaterThan(0);
    for (const [id] of veilEntries) {
      // Ein Tippfehler oder ein umbenanntes Spielfeld würde sonst still zum Faktor 1 zurückfallen.
      expect(assets, `${id} steht in BATTLEFIELD_VEIL, aber nicht in BATTLEFIELD_ASSETS`)
        .toMatch(new RegExp(`${id}:\\s*\\{\\s*desktop:`));
    }
  });

  it("jeder Faktor deckelt nach OBEN (> 1)", () => {
    // Die Liste ist ein Deckel, keine Normalisierung: dunkle Spielfelder bleiben dunkel. Ein Wert ≤ 1
    // wäre entweder wirkungslos oder würde ein Bild AUFHELLEN — beides ist nicht die Absicht.
    for (const [id, k] of veilEntries) {
      expect(k, `${id} hat Faktor ${k} — die Liste begrenzt nur nach oben`).toBeGreaterThan(1);
      expect(k, `${id} hat Faktor ${k} — jenseits von 3 deckt der Schleier das Bild komplett zu`).toBeLessThan(3);
    }
  });

  it("der Schleier ist über `--vk` skalierbar und deckelt die Alpha bei 1", () => {
    const rule = css.match(/\.as-hub-bg-veil \{[\s\S]*?\n\}/);
    expect(rule, ".as-hub-bg-veil nicht mehr gefunden").toBeTruthy();
    expect(rule[0], "der Verlauf liest --vk nicht mehr").toContain("var(--vk)");
    // Ohne min() ergäbe ein großzügiger Faktor Alpha > 1 — je nach Engine ungültig oder geklemmt.
    expect(rule[0].match(/min\(1,/g) || [], "jede Stützstelle braucht den min(1, …)-Deckel")
      .toHaveLength(4);
  });

  it("StartScreen setzt --vk aus der Deckel-Liste", () => {
    expect(start).toContain("battlefieldVeil");
    expect(start, "--vk wird nicht mehr am Schleier gesetzt").toMatch(/"--vk":\s*battlefieldVeil\(bfId\)/);
  });

  it("der Handy-Hintergrund bleibt mobil-only und liest das Hochformat-Bild", () => {
    // Desktop hat sein eigenes Layout (Bodenband mit `battlefield.desktop`) — die beiden dürfen nicht
    // gleichzeitig laufen, sonst liegen zwei Bilder übereinander.
    expect(start).toMatch(/as-hub-bg[^"]*min-\[1400px\]:hidden/);
    expect(start).toContain("battlefield.mobile");
    expect(start, "das Desktop-Bodenband ist verschwunden").toMatch(/hidden min-\[1400px\]:block[\s\S]*?battlefield\.desktop/);
  });
});
