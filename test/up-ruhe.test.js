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

describe("#up-form — eine Kachelform, gleiche Reihen, eigene Legendär-Reihe", () => {
  it("alle Kacheln tragen denselben Radius wie die Perk-/Skill-Angebote (6 px)", () => {
    const r = deskBlock.match(/\.up-vnode,[^{]*\{([^}]*)\}/);
    expect(r, "die Sammelregel der Kachelform fehlt").toBeTruthy();
    expect(r[1]).toMatch(/border-radius:\s*6px/);
    for (const k of ["up-navrow", "up-navpassive", "up-skill", "up-stat", "gd-navrow", "gl-navrow"])
      expect(r[0], `${k} fehlt in der Sammelregel`).toMatch(new RegExp(`\\.${k}[,\\s]`));
    /* Die PANELS behalten ihre 14 px — sie sind der Rahmen, nicht der Inhalt. */
    expect(deskBlock).toMatch(/\.up-page\s*\{[^}]*border-radius:\s*14px/);
  });

  it("die Knoten einer Reihe sind gleich hoch (subgrid über alle sechs Spalten)", () => {
    /* Gemessen 1920×1080: Reihe 1 und 2 je 6 Kacheln à 96 px, Reihe 3 drei à 81 px — vorher liefen die
       Spalten unabhängig um. Die Reihenzahl steht als Variable, nicht als Zahl in drei Regeln. */
    expect(deskBlock).toMatch(/\.up-vgrid\s*\{[^}]*--up-rows:\s*\d+/);
    expect(deskBlock).toMatch(/\.up-vlane\s*\{[^}]*grid-template-rows:\s*subgrid/);
    expect(deskBlock).toMatch(/\.up-vchain\s*\{[^}]*grid-template-rows:\s*subgrid/);
    /* `align-items: start` am Raster würde die Spalten wieder auf Inhaltshöhe ziehen — dann hätte das
       subgrid Zeilen, die niemand füllt, und die Regel täte sichtbar nichts. */
    expect(deskBlock).toMatch(/\.up-vgrid\s*\{[^}]*align-items:\s*stretch/);
  });

  it("die Navigationsspalte hat keinen Farbanlauf mehr", () => {
    const alle = [...deskBlock.matchAll(/\.up-navrow\s*\{([^}]*)\}/g)];
    expect(alle[alle.length - 1][1], "der 90°-Anlauf ist zurück").not.toMatch(/linear-gradient/);
  });

  it("die legendären Skills stehen in einer eigenen Reihe, unter einer Trennlinie", () => {
    expect(deskBlock).toMatch(/\.up-skills-h\.is-leg\s*\{[^}]*border-top:\s*1px solid/);
    const g = deskBlock.match(/\.up-skillgrid\.is-leg\s*\{([^}]*)\}/);
    expect(g, "die Legendär-Reihe fehlt").toBeTruthy();
    expect(g[1], "die Spaltenzahl kommt nicht aus der Anzahl").toMatch(/repeat\(var\(--leg-cols/);
    expect(g[1], "auto-fill/auto-fit sind beide falsch (s. #rahmen-huelle)").not.toMatch(/auto-fi(ll|t)/);
    expect(read("src/ui/UpgradeScreen.jsx")).toMatch(/"--leg-cols": Math\.max\(1, leg\.length\)/);
  });
});

describe("#up-still + #up-griff — Auswertung ruhiger, Griffe fest", () => {
  const up = read("src/ui/UpgradeScreen.jsx");

  it("Balken ODER Wort, nie beides — und nur auf dem Desktop", () => {
    /* Ist die Achse voll, sagt ein 100-%-Balken nichts mehr; das Wort sagt es kürzer. Ist sie es nicht,
       zeigt der Balken auf einen Blick, wie weit noch fehlt. So trägt jede Kachel EIN Element unter der
       Zahl statt zweier. Am Handy bleibt der Balken: dort ist der Kasten die einzige Zusammenfassung und
       die vier Kacheln stehen gestapelt — der Balken hält die Reihe optisch zusammen. */
    expect(up).toMatch(/\{wide && x\.v >= x\.max/);
    expect(up).toMatch(/up-stat-max/);
    for (const cat of ["src/i18n/de.js", "src/i18n/en.js"])
      expect(read(cat), `upgrades.impact.maxed fehlt in ${cat}`).toMatch(/"upgrades\.impact\.maxed":/);
  });

  it("Balken und Wort nehmen EXAKT gleich viel Platz", () => {
    /* Sonst stehen in einem Kasten mit gemischten Achsen (Baufeld voll, Rerolls nicht) unterschiedlich
       hohe Kacheln nebeneinander. Gemessen 1920×1080: 87 px in beiden Zuständen. Deshalb EINE Regel für
       beide statt zweier eigener Abstände. */
    expect(deskBlock).toMatch(/\.up-stat > \.up-stat-b,\s*\.up-stat > \.up-stat-max\s*\{[^}]*min-height:[^}]*margin-top:/);
  });

  it("#lv-mitte: die Griffe sitzen auf der Kartenmitte, nicht auf der Rastermitte", () => {
    /* Die Griffe hängen mit `top: 50%` an `.lv-cardwrap`. Auf die Rasterhöhe GESTRECKT (die
       Vorgängerfassung) saßen sie bei 396 px, während die Kartenmitte je nach Angebot bei 222–289 px
       liegt — auf dem kürzesten Angebot ragten sie unter die Kartenkante hinaus. Der Kasten hört jetzt
       wieder an der Karte auf.
       Die feste Rasterhöhe bleibt: sie hält die OBERKANTE der Karte fest (#lv-fest), das ist eine andere
       Aufgabe als die Griffposition. Eine geratene Pixelzahl am Griff bleibt verboten. */
    expect(deskBlock).toMatch(/\.lv-cardwrap\s*\{[^}]*align-self:\s*start/);
    expect(deskBlock, "der Kasten ist wieder auf die Rasterhöhe gestreckt")
      .not.toMatch(/\.lv-cardwrap\s*\{[^}]*align-self:\s*stretch/);
    expect(deskBlock, "ohne feste Rasterhöhe wandert die Oberkante der Karte wieder").toMatch(/\.lv-rig\s*\{[^}]*min-height:\s*var\(--lv-h\)/);
    expect(deskBlock, "eine geratene Pixelzahl statt der Konstruktion").not.toMatch(/\.lv-grip\s*\{[^}]*top:\s*\d+px/);
  });

  it("die Update-Leiste folgt derselben Sprache (eckig, kein Schein)", () => {
    expect(deskBlock).toMatch(/\.up-banner\s*\{[^}]*border-radius:\s*6px/);
    expect(deskBlock).toMatch(/\.up-banner \.as-edge-strong\s*\{[^}]*box-shadow:\s*none/);
    expect(read("src/ui/UpdateBanner.jsx")).toMatch(/className="up-banner pointer-events-auto/);
  });
});

describe("#eckig + #up-untertitel — ein Radius für alle Knöpfe, kein abgeschnittener Untertitel", () => {
  it("ALLE Bestätigen-/Schließen-Knöpfe stehen auf 6 px, über EINE Regel", () => {
    /* `as-actbtn` ist der stabile Haken der ActionButton-Sorte — er trifft jeden dieser Knöpfe im Spiel
       auf einmal. Ohne ihn müsste die Klasse an dreißig Fundstellen einzeln stehen, und die nächste neue
       Fundstelle vergisst sie. */
    expect(read("src/ui/modalStyle.jsx"), "der Haken fehlt an der Sorte").toMatch(/ACTIONBTN_BASE = "as-actbtn /);
    const r = deskBlock.match(/\.as-actbtn,[\s\S]{0,180}?\{([^}]*)\}/);
    expect(r, "die Sammelregel des Radius fehlt").toBeTruthy();
    expect(r[1]).toMatch(/border-radius:\s*6px/);
    for (const k of ["up-close", "gd-close", "gl-close", "cz-close", "st-close"])
      expect(r[0], `${k} fehlt in der Sammelregel`).toMatch(new RegExp(`\\.${k}[,\\s]`));
    /* Der Endscreen baut seine drei Knöpfe von Hand (Menü, Neuer Lauf, „Bestätigen" der Freischalt-Karte)
       — sie tragen den Haken deshalb einzeln. */
    expect((read("src/ui/GameOver.jsx").match(/as-actbtn/g) || []).length).toBe(3);
  });

  it("der Archetyp-Untertitel bricht um statt abzuschneiden — und der Kopf trägt seine Höhe fest", () => {
    /* Gemessen 1920×1080, 1536×791 und 1400×950 über alle vier Fraktionen: nirgends gekürzt, Kopfreihe
       überall 41 px, das Raster darunter startet auf demselben y. Ohne die feste Höhe sprängen die
       Knotenspalten beim Archetyp-Wechsel (dieselbe Regel wie im Leitfaden, #desktop-leitfaden). */
    const h = deskBlock.match(/\.up-page-hint\s*\{([^}]*)\}[\s\S]*?\.up-page-hint\s*\{([^}]*)\}/);
    const letzte = h ? h[2] : (deskBlock.match(/\.up-page-hint\s*\{([^}]*)\}/) || [])[1];
    expect(letzte, ".up-page-hint-Regel nicht mehr gefunden").toBeTruthy();
    expect(letzte, "die Ellipse ist zurück").toMatch(/white-space:\s*normal/);
    expect(letzte).toMatch(/-webkit-line-clamp:\s*2/);
    expect(deskBlock).toMatch(/\.up-page-h\s*\{[^}]*min-height:\s*\d+px/);
  });
});
