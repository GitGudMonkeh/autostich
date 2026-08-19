import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #up-ruhe (19.08.2026) — Baum, Leitfaden und Glossar im Desktop-Ton.

   Dritter Screen nach der Liste in CLAUDE.md („Desktop-Umbau: die Entscheidungsregeln"). Der Schalter ist
   derselbe wie in der Werkstatt (`as-ring-quiet`) — genau deshalb braucht es hier eine Ratsche: ein Panel,
   das den Modifikator beim nächsten Umbau verliert, holt sich still den laufenden Ring zurück und sieht
   für sich genommen weiter richtig aus.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

describe("#up-ruhe — alle sechs Desktop-Panels stehen still", () => {
  it("Baum, Leitfaden und Glossar tragen den Modifikator", () => {
    const panels = [
      ["src/ui/UpgradeScreen.jsx", ["up-nav", "up-page"]],
      ["src/ui/GuideOverlay.jsx", ["gd-nav", "gd-page"]],
      ["src/ui/Glossary.jsx", ["gl-nav", "gl-page"]],
    ];
    for (const [f, keys] of panels) {
      const src = read(f);
      for (const k of keys)
        expect(src, `${f}: ${k} ohne as-ring-quiet`).toMatch(new RegExp(`${k} as-ring as-ring-quiet`));
    }
  });

  it("der Zweig-Pfad unter 1400 px bleibt bewusst OHNE Modifikator", () => {
    /* `.up-branch` wird nur gerendert, wenn `wide` false ist (eigener Renderpfad, s. UpgradeScreen.jsx).
       Ein Modifikator, dessen Regeln im 1400er Block stehen, täte dort nichts — ihn trotzdem zu setzen
       wäre eine Zeile, die etwas verspricht und nichts hält. */
    const up = read("src/ui/UpgradeScreen.jsx");
    expect(up).toMatch(/up-branch as-ring\$\{/);
    expect(up, "der Zweig-Pfad hat den Modifikator bekommen").not.toMatch(/up-branch as-ring as-ring-quiet/);
  });
});

describe("#up-ruhe — der Schein nach außen fällt, die Aussage bleibt", () => {
  it("die aktive Navigationszeile behält den Anlauf nach innen", () => {
    /* Der Halo NACH AUSSEN geht, der Anlauf nach innen bleibt — er ist die Aussage „hier bist du".
       Beides zu entfernen nähme der Spalte ihren Zustand. */
    const r = deskBlock.match(/\.up-navrow\.is-on\s*\{[^}]*box-shadow:([^;]*);/g) || [];
    const letzte = r[r.length - 1] || "";
    expect(letzte, ".up-navrow.is-on-Regel nicht mehr gefunden").toBeTruthy();
    expect(letzte, "der Anlauf nach innen ist mit weggefallen").toMatch(/inset/);
    expect(letzte.split("box-shadow:")[1], "der Halo nach außen ist zurück")
      .not.toMatch(/,\s*0 0 \d+px/);
  });

  it("der gewählte Knoten und die gewählte Legendär-Phase leuchten nicht mehr nach außen", () => {
    expect(deskBlock).toMatch(/\.up-vnode\.is-sel\s*\{[^}]*box-shadow:\s*inset[^;]*;\s*\}/);
    /* Die Regel steht ZWEIMAL im Block (alte Fassung, dann die leise) — die LETZTE gewinnt, also wird
       auch die letzte geprüft. Auf die erste zu schauen hieße, den Rückfall zu übersehen. */
    const alle = [...deskBlock.matchAll(/\.up-navpassive\.is-sel\s*\{([^}]*)\}/g)];
    expect(alle.length, ".up-navpassive.is-sel nicht mehr gefunden").toBeGreaterThan(0);
    const pas = alle[alle.length - 1][1];
    expect(pas, "der 2-px-Ring ist zurück").toMatch(/box-shadow:\s*none/);
    expect(pas, "ohne Fläche ist die Auswahl gar nicht mehr zu sehen").toMatch(/background:/);
  });

  it("die Kopf-Werkzeuge sind Text-Knöpfe", () => {
    expect(deskBlock).toMatch(/\.up-actions > \*\s*\{[^}]*background:\s*none\s*!important/);
    /* Das Klickziel darf dabei NICHT schrumpfen — die 44 px sind aus dem Desktop-Pass hergeleitet und
       stehen in einer eigenen, früheren Regel. */
    expect(deskBlock).toMatch(/\.up-actions > \*\s*\{[^}]*padding:\s*11px 18px\s*!important/);
  });

  it("die Auswertung besteht aus flachen Kacheln mit Haarlinie", () => {
    expect(deskBlock).toMatch(/\.up-stat,\s*\.up-dropbox\s*\{[^}]*border:\s*1px solid/);
  });

  it("alles hängt am 1400er Block — die Handy-Fassung darf sich nicht bewegen", () => {
    const basis = css.slice(0, css.indexOf("@media (min-width: 1400px) {"));
    for (const k of ["up-navrow", "up-vnode", "up-stat", "up-actions"])
      expect(basis, `${k} steht in der Basis und trifft damit auch das Handy`).not.toMatch(new RegExp(`\\.${k}[\\s.,{]`));
  });
});
