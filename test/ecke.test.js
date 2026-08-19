import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #ecke (19.08.2026) — Glossar und Ton oben links, in JEDEM Menü.

   Ein globales Paar über allen Menü-Overlays statt sieben Einbauten. Drei Nähte gehen still kaputt und
   brauchen deshalb eine Ratsche:

     1. Die BAHN. Die Menü-Köpfe setzen ihren Titel ganz links; ohne Polster läge er unter den Knöpfen.
        Das Polster hängt am KOPF (nicht an der Wurzel — die verschmälerte den ganzen Screen, und Baum,
        Leitfaden und Glossar sind auf flachen Fenstern auf 0 px Überlauf ausgemessen).
     2. Der MARKER. Ohne `data-corner-tools` stünde der Titel der Bestenliste auch dann eingerückt da,
        wenn man sie vom Endscreen aus öffnet — dort gibt es das Paar nicht.
     3. Die GRENZE, ab der das Polster entfällt. Sie ist gerechnet (Kartendeckel + 2 × rechte Kante des
        Paars); eine geratene Zahl ließe das Paar über dem Titel liegen, ohne dass etwas rot wird.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const app = read("src/App.jsx");
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
// Alles außerhalb des Desktop-Blocks — dort darf die Handy-Fassung nichts abbekommen.
const basis = css.replace(deskBlock, "");

const HEADS = [".up-head", ".cz-head", ".st-head", ".lb-head", ".gd-head", ".gl-head", ".op-head"];

describe("#ecke — das Paar hängt am Menü, nicht am Lauf", () => {
  it("App rendert es nur in der Menü-Phase", () => {
    expect(app).toMatch(/state\.phase === "menu" && \(\s*\n?\s*<CornerTools/);
  });

  it("der Marker am <html> folgt derselben Bedingung", () => {
    const eff = app.match(/if \(state\.phase === "menu"\) el\.setAttribute\("data-corner-tools"[\s\S]{0,140}?\}, \[state\.phase\]\);/);
    expect(eff, "Marker-Effekt nicht mehr gefunden").toBeTruthy();
    expect(eff[0], "der Marker wird nie wieder abgeräumt").toMatch(/removeAttribute\("data-corner-tools"\)/);
  });

  it("beide Knöpfe stehen im Paar, Glossar links", () => {
    const c = read("src/ui/CornerTools.jsx");
    expect(c.indexOf("GlossaryPanel")).toBeLessThan(c.indexOf("MuteButton muted"));
  });
});

describe("#ecke — die Handy-Fassung bleibt unberührt", () => {
  it("unterhalb 1400 px ist das Paar aus dem Layout", () => {
    expect(basis).toMatch(/\.as-corner \{ display: none; \}/);
  });

  it("die Platzierung steht ausschließlich im Desktop-Block", () => {
    expect(deskBlock).toMatch(/\.as-corner \{[^}]*position: fixed/);
    expect(basis, "eine Positionsregel außerhalb des Desktop-Blocks").not.toMatch(/\.as-corner \{[^}]*position:/);
  });

  it("der Mute-Knopf des Hubs weicht nur ab 1400 px", () => {
    /* Sonst stünden zwei Knöpfe für dieselbe Handlung nebeneinander — bzw. am Handy gar keiner.
       Gegen den KOMMENTARFREIEN Quelltext geprüft: die Begründung im JSX nennt die Klasse selbst
       (dieselbe Falle wie beim `as-ring`-Zähler in #fx-panel). */
    const hub = read("src/ui/StartScreen.jsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(hub, "der Hub-Knopf trägt den Haken nicht mehr").toMatch(/className="as-mute-hub /);
    expect(deskBlock).toMatch(/\.as-mute-hub \{ display: none !important; \}/);
    expect(basis, "am Handy ist der Mute-Knopf des Hubs verschwunden").not.toMatch(/\.as-mute-hub/);
  });
});

describe("#ecke — die Bahn für das Paar", () => {
  it("alle sieben Menü-Köpfe halten Platz frei, und zwar am KOPF", () => {
    const regel = deskBlock.match(/:root\[data-corner-tools\][^{]*\{[^}]*padding-left: var\(--as-corner-lane[^}]*\}/);
    expect(regel, "die Bahn-Regel fehlt").toBeTruthy();
    for (const h of HEADS)
      expect(regel[0], `${h} hält keinen Platz frei`).toContain(h);
    /* Gegenprobe: an der WURZEL würde dasselbe Polster den ganzen Screen verschmälern — Baum, Leitfaden
       und Glossar sind auf flachen Fenstern auf 0 px Überlauf ausgemessen (#flach, #desktop-leitfaden). */
    expect(css, "die Bahn liegt an einer Screen-Wurzel statt am Kopf")
      .not.toMatch(/:root\[data-corner-tools\][^{]*\.(up|cz|st|lb|gd|gl|op)-root/);
  });

  it("die Bahn ist an den Marker gebunden", () => {
    for (const m of css.matchAll(/^\s*(--as-corner-lane: \d+px)/gm)) {
      const zeile = css.slice(0, m.index).split("\n").pop() + m[1];
      expect(zeile, "eine Bahn ohne Marker-Bindung").toBeTruthy();
    }
    // Jede Zuweisung der Bahn steht in einem Selektor mit dem Marker.
    for (const r of css.matchAll(/([^{}]*)\{[^{}]*--as-corner-lane:\s*\d+px/g))
      expect(r[1], `Bahn ohne Marker: ${r[1].trim().slice(0, 80)}`).toMatch(/data-corner-tools/);
  });

  it("die Grenzen sind GERECHNET, nicht geraten", () => {
    /* Die Karte beginnt bei `pad + (Fensterbreite − 2·pad − Deckel) / 2`; das Paar endet bei
       `left + 2 · Knopfbreite + Abstand`. Das Polster darf frühestens dort entfallen, wo die
       Kartenkante rechts vom Paar liegt: Grenze ≥ Deckel + 2 · rechte Kante des Paars. */
    const left = Number(deskBlock.match(/\.as-corner \{[^}]*left: (\d+)px/)[1]);
    const gap = Number(deskBlock.match(/\.as-corner \{[^}]*gap: (\d+)px/)[1]);
    const w = Number(deskBlock.match(/\.as-corner > \.as-corner-btn \{[^}]*width: (\d+)px/)[1]);
    const rechts = left + 2 * w + gap;

    const grenze = (sel) => {
      for (const m of css.matchAll(/@media \(min-width: 1400px\) and \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g))
        if (m[2].includes(sel) && m[2].includes("--as-corner-lane")) return Number(m[1]);
      return null;
    };
    const deckel = (sel) => Number(css.match(new RegExp(`\\${sel} \\{[^}]*width: min\\((\\d+)px, 100%\\)`))[1]);

    for (const [kopf, karte] of [[".up-head", ".up-card"], [".op-head", ".op-card"]]) {
      const g = grenze(kopf), d = deckel(karte);
      expect(g, `keine Grenze für ${kopf}`).toBeTruthy();
      expect(g, `${kopf}: die Grenze liegt zu tief — das Paar läge über dem Titel`).toBeGreaterThanOrEqual(d + 2 * rechts);
    }
  });
});
