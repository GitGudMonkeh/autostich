import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================
   #rd-ruhe (19.08.2026) — die Lauf-Details im Desktop-Ton.

   Sechster Screen nach der Liste in docs/engineering/conventions.md. Er ist derselbe Screen wie der
   Siegesbildschirm, nur aus einer anderen Herkunft (gespeicherte Zeile statt laufendes Spiel) — er MUSS
   deshalb dieselbe Fassung tragen. Genau das prüft dieser Wächter rechnend: die Werte werden gegen
   `.st-box` (#st-ruhe) und `.go-box` (#go-ruhe) verglichen, statt sie hier noch einmal abzutippen.

   Zweite Naht: `RunStats.jsx` wird von Victory, Chronik UND Lauf-Details geteilt. Jede Regel muss auf
   `.rd-card` eingegrenzt bleiben, sonst zieht der Ton dieses Screens die anderen beiden mit.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const rd = read("src/ui/RunDetail.jsx");
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
/* Ein Selektor kann mehrfach vorkommen (Sammelregel für den Radius, eigene Regel für die Fläche) —
   gesucht ist die Regel, die die gefragte Eigenschaft wirklich SETZT, und zwar die letzte davon. */
const regeln = (sel) => [...deskBlock.matchAll(new RegExp(`(^|,)\\s*${sel}[^{}]*\\{([^}]*)\\}`, "gm"))].map((m) => m[2]);
const wert = (sel, prop) => {
  const treffer = regeln(sel).filter((b) => new RegExp(`(^|;|\\s)${prop}:`).test(b));
  if (!treffer.length) return null;
  const m = treffer[treffer.length - 1].match(new RegExp(`(?:^|;|\\s)${prop}:\\s*([^;]+);`));
  return m ? m[1].replace(/\s*!important/, "").trim() : null;
};
const regel = (sel) => regeln(sel)[0] ?? null;

describe("#rd-ruhe — die vier Ringe stehen still", () => {
  it("jedes Panel trägt den Modifikator", () => {
    for (const k of ["rd-c1", "rd-c2", "rd-c3", "rd-c4"])
      expect(rd, `${k} ohne as-ring-quiet`).toMatch(new RegExp(`${k} as-ring as-ring-quiet`));
  });

  it("es bleibt kein Panel mit laufendem Ring übrig", () => {
    /* Klasse und Band sind ein Paar (#perf-ring): jedes `as-ring` in dieser Datei muss den
       Modifikator tragen, sonst wandert ausgerechnet eines der vier weiter. */
    const ohne = [...rd.matchAll(/as-ring(?!-)(?! as-ring-quiet)/g)];
    expect(ohne.length, "ein Panel hat den Modifikator nicht").toBe(0);
  });
});

describe("#rd-ruhe — dieselbe Kachelform wie in Statistik und Victory", () => {
  it("Fläche und Rahmen sind Wert für Wert die von .st-box", () => {
    expect(wert("\\.st-box", "background"), ".st-box nicht mehr gefunden").toBeTruthy();
    expect(wert("\\.rd-card \\.rs-cell", "background"), "andere Fläche als in der Statistik")
      .toBe(wert("\\.st-box", "background"));
    expect(wert("\\.rd-card \\.rs-cell", "border"), "anderer Rahmen als in der Statistik")
      .toBe(wert("\\.st-box", "border"));
  });

  it("Radius 6 innen, 14 am Panel", () => {
    expect(wert("\\.rd-card \\.rs-cell", "border-radius")).toBe("6px");
    expect(wert("\\.rd-c1, \\.rd-c2, \\.rd-c3, \\.rd-c4", "border-radius")).toBe("14px");
  });

  it("Chips und Gebäude-Einträge ziehen mit", () => {
    expect(deskBlock).toMatch(/\.rd-card \.rs-chips > \*, \.rd-card \.rd-blist button \{ border-radius: 6px; \}/);
  });
});

describe("#rd-ruhe — was der Ton NICHT anfassen darf", () => {
  it("jede Regel ist auf DIESEN Screen eingegrenzt — RunStats teilen sich drei Screens", () => {
    /* Ohne die Eingrenzung nähme dieser Screen Victory und Chronik mit, die ihre eigene Fassung haben.

       #menu-rework M7 — die Zusicherung ist „auf DIESEN Screen eingegrenzt", und die alte Fassung
       nannte dafür EINEN Träger: `.rd-card`. Das ist derselbe Fehler wie bei MENU-38, nur kleiner —
       eine Grenze, die nach ihrem sichtbarsten Träger gezogen wird, trifft irgendwann etwas, das
       genauso dazugehört. `.rd-c1 .rs-cell` grenzt exakt so scharf ein wie `.rd-card .rs-cell`: die
       vier Panel-Haken gibt es nur in diesem Screen. Geprüft wird deshalb der PRÄFIX. */
    for (const klasse of ["rs-cell", "rs-tree", "rs-note", "rd-blist"])
      for (const m of css.matchAll(new RegExp(`([^{}\\n]*\\.${klasse}[^{}]*)\\{`, "g")))
        expect(m[1], `\\.${klasse} ohne Screen-Eingrenzung: ${m[1].trim().slice(0, 70)}`).toMatch(/\.rd-|\.go-/);
  });

  it("die Gebäudeliste behält ihren blauen Rahmen (Architekt-Signal)", () => {
    /* Nur die FLÄCHE gibt sie ab — dieselbe Entscheidung wie an `.go-blist`. */
    const b = regel("\\.rd-card \\.rs-cell, \\.rd-card \\.rs-tree, \\.rd-card \\.rs-note, \\.rd-card \\.rd-blist");
    expect(b, "die Sammelregel ist nicht mehr auffindbar").toBeTruthy();
    expect(b, "der blaue Rahmen der Gebäudeliste ist mit abgeräumt").not.toMatch(/(^|[^-])border:/);
  });

  it("das Brett der finalen Aufstellung bleibt farbig", () => {
    /* Wert, Score und Formation sind die AUSSAGE des Panels (Regel 6) — nur seine Kacheln stehen
       ohnehin schon leise (`quietTiles`). */
    expect(rd).toMatch(/quietTiles/);
    expect(deskBlock, "der Desktop-Ton greift in die Kartenrahmen ein").not.toMatch(/\.rd-c3 \.cg-card|\.rd-card \.cg-card/);
  });
});

describe("#rd-ruhe — Schließen ist ein Werkzeug am Rand", () => {
  it("flach wie in Baum und Statistik, aber gleich groß", () => {
    const flach = regel("\\.rd-close");  // nur die Existenz — die drei Eigenschaften prüft die Schleife
    for (const p of ["background", "border", "box-shadow"])
      expect(deskBlock, `${p} steht noch am Schließen-Knopf`).toMatch(new RegExp(`\\.rd-close \\{[^}]*${p}:\\s*(none|0)\\s*!important`));
    expect(flach).toBeTruthy();
    expect(deskBlock, "das Klickziel ist geschrumpft").toMatch(/\.rd-close \{[^}]*padding: 11px 18px/);
  });
});

/* ============================================================
   #brett-luft (19.08.2026) — die Gebäude-/Legendenzeile bekommt auf dem Desktop Luft zum Brett.

   Die Zeile ist GETEILT (Aufstellungsphase · Chronik · Victory · Lauf-Details), es gibt also genau eine
   Stelle, an der der Abstand steht — und genau eine, an der er verloren gehen kann. Am Handy bleibt er
   bei den abgestimmten 8 px, deshalb steht die Regel im Desktop-Block.
   ============================================================ */
describe("#brett-luft — Abstand zwischen Legendenzeile und Brett", () => {
  it("die Zeile trägt den Haken und ihre Handy-Klasse", () => {
    const src = read("src/ui/ArchPanels.jsx");
    expect(src, "der Haken fehlt — die Desktop-Regel greift ins Leere").toMatch(/className="arch-toggle /);
    expect(src, "die Handy-Fassung hat ihren Abstand verloren").toMatch(/className="arch-toggle[^"]*\bmb-2\b/);
  });

  it("auf dem Desktop ist der Abstand größer als am Handy", () => {
    const m = deskBlock.match(/\.arch-toggle \{[^}]*margin-bottom:\s*(\d+)px/);
    expect(m, "die Desktop-Regel fehlt").toBeTruthy();
    expect(Number(m[1]), "der Desktop-Abstand ist nicht größer als die 8 px der Handy-Fassung")
      .toBeGreaterThan(8);
  });
});
