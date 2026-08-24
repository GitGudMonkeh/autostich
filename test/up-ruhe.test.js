import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";
import { resolve, themeTokens } from "./cssTokens.js";

/* ============================================================
   #up-ruhe (19.08.2026) — Baum, Leitfaden und Glossar im Desktop-Ton.

   Dritter Screen nach der Liste in docs/engineering/conventions.md („Entscheidungsregeln"). Der Schalter ist
   derselbe wie in der Werkstatt (`as-ring-quiet`) — genau deshalb braucht es hier eine Ratsche: ein Panel,
   das den Modifikator beim nächsten Umbau verliert, holt sich still den laufenden Ring zurück und sieht
   für sich genommen weiter richtig aus.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
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

  it("der Zweig-Pfad unter 1280 px bleibt bewusst OHNE Modifikator", () => {
    /* `.up-branch` wird nur gerendert, wenn `wide` false ist (eigener Renderpfad, s. UpgradeScreen.jsx).
       Ein Modifikator, dessen Regeln im 1280er Block stehen, täte dort nichts — ihn trotzdem zu setzen
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
    /* #menu-rework M3 — hier stand die Prüfung auf `.up-navpassive.is-sel`, und das war der
       MECHANISMUS: das Kärtchen der Legendär-Phase hatte einen Auswahl-Zustand, weil man es antippen
       musste, um seine Erklärung woanders erscheinen zu lassen. Es trägt seinen Zustand jetzt selbst
       und hat deshalb GAR KEINEN Auswahl-Zustand mehr; die alte Regel wäre eine Zusicherung über ein
       Element, das es nicht gibt.
       Die Zusicherung selbst ist unverändert und gilt für den Nachfolger: KEIN SCHEIN NACH AUSSEN.
       Sie steht als „enthält keinen Schatten außer inset" statt als „enthält box-shadow: none" — die
       zweite Form geht auf, sobald jemand eine zweite Regel danebenstellt, und genau daran sind in
       diesem Durchgang fünf Befunde entstanden. */
    const legRules = [...deskBlock.matchAll(/(^|[\s,])(\.up-leg[a-z-]*(?:\.[a-z-]+)?)\s*\{([^}]*)\}/g)];
    expect(legRules.length, ".up-leg nicht gefunden — trägt das Kärtchen keine Regeln mehr?").toBeGreaterThan(0);
    for (const [, , sel, body] of legRules) {
      const schatten = [...body.matchAll(/box-shadow:\s*([^;]+)/g)].map((m) => m[1].trim());
      for (const sch of schatten)
        expect(sch, `${sel}: Schein nach außen ist zurück`).toMatch(/^(none|inset\b)/);
    }
    /* Und die Gegenprobe zum Verschwinden: der Auswahl-Zustand darf nicht durch die Hintertür
       zurückkommen — im Kärtchen steht kein `is-sel` mehr. */
    expect(read("src/ui/UpgradeScreen.jsx"), "das Kärtchen hat wieder einen Auswahl-Zustand")
      .not.toMatch(/up-leg[^"`]*is-sel/);
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

  it("alles hängt am 1280er Block — die Handy-Fassung darf sich nicht bewegen", () => {
    const basis = css.slice(0, css.indexOf(DESKTOP_BLOCK_AT));
    for (const k of ["up-navrow", "up-vnode", "up-stat", "up-actions"])
      expect(basis, `${k} steht in der Basis und trifft damit auch das Handy`).not.toMatch(new RegExp(`\\.${k}[\\s.,{]`));
  });
});

describe("#up-form — eine Kachelform, gleiche Reihen, eigene Legendär-Reihe", () => {
  it("alle Kacheln tragen denselben Radius wie die Perk-/Skill-Angebote (6 px)", () => {
    const r = deskBlock.match(/\.up-vnode,[^{]*\{([^}]*)\}/);
    expect(r, "die Sammelregel der Kachelform fehlt").toBeTruthy();
    /* #menu-rework M3 — dieselbe Behandlung, die der `#eckig`-Zwilling weiter unten seit M2a hat:
       die 6 wird weiter geprüft, ihre Schreibweise nicht mehr vorgeschrieben. Die Aussage dieses
       Wächters ist „EIN Radius für alle Kacheln, über EINE Regel", nicht „dort stehen die Zeichen
       6px" — seit der Baum das Vokabular liest, nennt die Regel den Schritt beim Namen. Aufgelöst
       durch den @theme-Block muss trotzdem 6 px herauskommen; fehlt der Schritt oder steht er auf
       einem anderen Wert, endet die Ersetzung woanders und der Wächter fällt. */
    const radius = resolve((r[1].match(/border-radius:\s*([^;]+);/) || [])[1] || "", themeTokens(css));
    expect(radius, `der Sammelradius ist nicht mehr 6 px: ${radius}`).toMatch(/\b6px\b/);
    for (const k of ["up-navrow", "up-leg", "up-skill", "up-stat", "gd-navrow", "gl-navrow"])
      expect(r[0], `${k} fehlt in der Sammelregel`).toMatch(new RegExp(`\\.${k}[,\\s]`));
    /* Die PANELS behalten ihre 14 px — sie sind der Rahmen, nicht der Inhalt. Auch hier aufgelöst
       statt abgelesen: das Panel liest seit M3 `--rd-lg`, und 14 px ist genau, was dieser Schritt
       ist. Die Zusicherung „Panel und Inhalt tragen VERSCHIEDENE Radien" bleibt damit prüfbar. */
    const rdPage = resolve(
      (deskBlock.match(/\.up-page\s*\{[^}]*?border-radius:\s*([^;]+);/) || [])[1] || "", themeTokens(css));
    expect(rdPage, `der Panel-Radius ist nicht mehr 14 px: ${rdPage}`).toMatch(/\b14px\b/);
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

  it("#lv-anker: die Griffe stehen fest — gedeckelte Kartenmitte, keine nackte Pixelzahl", () => {
    /* Drei Fassungen, drei Meldungen: an die Rasterhöhe geheftet hingen die Griffe unter der Karte
       (#lv-griff), auf die Kartenmitte gesetzt wanderten sie mit jedem Angebot — und seit die
       gehaltenen Skills als Klappfeld IN der Karte stehen, wandern sie, während der Spieler zusieht
       (gemessen 103 px beim Zuklappen).

       Beides zugleich geht nicht: feste Oberkante (#lv-fest) plus angebotsabhängige Höhe heißt, dass
       die Mitte wandern MUSS. Der Deckel ist die Auflösung — er liegt auf der Mitte der KLEINSTEN
       Karte, also ist der Griff dort exakt mittig und steht auf jeder größeren still.

       Der Wächter RECHNET das nach, statt die Zahl zu vergleichen: der Deckel darf die halbe kleinste
       Karte nicht überschreiten, sonst wandert der Griff wieder. */
    const KLEINSTE_KARTE = 381; // gemessen (Skill/Feuer, nichts gehalten) über 1536 · 1920 · 2047 px
    expect(deskBlock).toMatch(/\.lv-cardwrap\s*\{[^}]*align-self:\s*start/);
    expect(deskBlock, "der Kasten ist wieder auf die Rasterhöhe gestreckt")
      .not.toMatch(/\.lv-cardwrap\s*\{[^}]*align-self:\s*stretch/);
    expect(deskBlock, "ohne feste Rasterhöhe wandert die Oberkante der Karte wieder")
      .toMatch(/\.lv-rig\s*\{[^}]*min-height:\s*var\(--lv-h\)/);

    const m = deskBlock.match(/\.lv-grip\s*\{[^}]*top:\s*min\(50%,\s*var\(--lv-grip-y,\s*(\d+)px\)\)/);
    expect(m, "die gedeckelte Mitte ist weg — entweder nackte 50 % (wandert) oder feste Zahl (kann herausragen)")
      .toBeTruthy();
    expect(Number(m[1]), "der Deckel liegt über der halben kleinsten Karte — der Griff wandert wieder")
      .toBeLessThanOrEqual(Math.floor(KLEINSTE_KARTE / 2));
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
    /* #menu-rework M2a — die 6 wird weiter geprüft, ihre Schreibweise nicht mehr vorgeschrieben.
       Die Aussage dieses Wächters ist „ein Radius für alle, über EINE Regel", nicht „dort stehen die
       Zeichen 6px": seit der Vokabular-Umstellung nennt die Regel den Schritt `--rd-sm` beim Namen.
       Aufgelöst durch den @theme-Block muss trotzdem 6 px herauskommen — fehlt das Token oder steht
       es auf einem anderen Wert, endet die Ersetzung woanders und der Wächter fällt. */
    const radius = resolve((r[1].match(/border-radius:\s*([^;]+);/) || [])[1] || "", themeTokens(css));
    expect(radius, `der Sammelradius ist nicht mehr 6 px: ${radius}`).toMatch(/\b6px\b/);
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
