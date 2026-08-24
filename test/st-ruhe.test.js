import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";
import { inlineValueOf, overridesInline } from "./inlineOverride.js";
import { resolve, themeTokens } from "./cssTokens.js";

/* ============================================================
   #st-ruhe (19.08.2026) — die Statistik im Desktop-Ton.

   Vierter Screen nach der Liste in docs/engineering/conventions.md („Entscheidungsregeln"). Information und
   Anordnung sind ausdrücklich unangetastet geblieben; geändert wurde nur, wie laut der Screen spricht.
   Zwei Nähte brauchen deshalb eine Ratsche:
   · `as-ring-quiet` an fünf Panels — verliert eines den Modifikator, holt es sich still den laufenden
     Ring zurück und sieht für sich genommen weiter richtig aus (dieselbe Begründung wie in #up-ruhe).
   · die acht `MENU_PANEL`-Kästen und ihre gemeinsame Klasse `.st-box` — die Konstante wird INLINE
     gesetzt; wird sie an der Regel nicht neutralisiert, bliebe die flache Fassung wirkungslos, ohne
     dass im Quelltext etwas fehlt. (#menu-rework M1: WIE sie neutralisiert wird, steht nicht mehr
     hier fest — s. inlineOverride.js.)
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const stats = read("src/ui/StatsScreen.jsx");
const modal = read("src/ui/modalStyle.jsx");
// Kommentarfreie Fassung: die Begründungen unten nennen die alten Werte absichtlich beim Namen.
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, "");
const deskBlock = (src) => {
  const at = src.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = src.indexOf("{", at); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(at, j + 1);
  }
  return "";
};
const desk = deskBlock(cssBare);

describe("#st-ruhe — der Ring steht still", () => {
  it("die Panel-Klammer trägt den Modifikator", () => {
    expect(stats, "st-sec ohne as-ring-quiet").toMatch(/\bst-sec as-ring as-ring-quiet\b/);
  });

  it("es gibt genau EINE Panel-Klammer — der Modifikator kann keine vergessen", () => {
    /* Alle fünf Sektionen laufen durch `<Section>`; ein zweiter, handgeschriebener `st-sec` im JSX
       hätte den Modifikator nicht und stünde als einziger mit laufendem Ring da. */
    expect((stats.match(/className="st-sec[\s"]/g) || []).length).toBe(1);
  });
});

describe("#st-ruhe — EINE Kachelform für alles im Panel", () => {
  /* Die LETZTE Regel gewinnt: `.up-vnode` steht im Desktop-Block zweimal (eigene Regel, dann die
     Sammelregel von #up-form). Ein Test, der die erste liest, misst den Wert von vor dem Umbau. */
  /* #menu-rework M3 — der Radius wird AUFGELOEST, nicht abgelesen. Seit der Baum auf das
     Panel-Vokabular umgestellt ist, steht an `.up-vnode` `var(--rd-sm)`, und die alte Ablesung
     (`[\d.]+px`) lieferte `null` — der Waechter fiel, waehrend die Zusicherung, die er schuetzt
     („dieselbe Kachelform wie im Baum"), voellig intakt war. Genau der Fall, fuer den
     test/cssTokens.js geschrieben wurde: der Referenz folgen statt den Token-NAMEN zu pruefen.
     Der Waechter rechnet damit weiter mit echten Zahlen und faengt zusaetzlich den Fall ab, dass
     der Schritt aus dem `@theme`-Block verschwindet. */
  const radius = (sel) => {
    const alle = desk.match(new RegExp(`(^|,)\\s*${sel}\\s*(,[^{}]*)?\\{[^}]*border-radius:\\s*[^;}]+`, "gm")) || [];
    if (!alle.length) return null;
    const roh = alle[alle.length - 1].match(/border-radius:\s*([^;}]+)/);
    if (!roh) return null;
    const m = resolve(roh[1].trim(), themeTokens(css)).match(/([\d.]+)px/);
    return m ? Number(m[1]) : null;
  };

  it("der Screen enthält KEINEN MENU_PANEL-Kasten außer solchen mit `st-box`", () => {
    /* Jeder `MENU_PANEL`-Kasten muss `st-box` tragen, sonst steht einer gefüllt zwischen den flachen.

       #menu-rework M7 — ALS „ENTHÄLT KEIN X AUSSER Y" GESCHRIEBEN, NICHT ALS ZAHL. Die alte Fassung
       nagelte die Zahl auf acht fest, und das ist die Bauart, aus der in dieser Runde sechs Befunde
       entstanden sind: sie fragt, ob die VORGESEHENE Form da ist, statt ob eine fremde fehlt. Ein
       neunter Kasten MIT `st-box` ist völlig richtig und ließ sie trotzdem fallen; ein achter OHNE
       wäre der Fehler, den sie meint. Die Zahl trug nichts bei, was die Schleife nicht schon prüft —
       außer der Gegenprobe, dass der Ausdruck überhaupt noch etwas findet, und die steht jetzt als
       eigene Zeile da. */
    const kaesten = stats.match(/<div[^>]*style=\{MENU_PANEL\}/g) || [];
    expect(kaesten.length, "kein MENU_PANEL-Kasten mehr gefunden — der Ausdruck greift ins Leere")
      .toBeGreaterThan(0);
    for (const k of kaesten) expect(k, `Kasten ohne st-box: ${k}`).toMatch(/\bst-box\b/);
  });

  it("Kästen, Rekordlauf und Lauf-Zeilen stehen auf demselben Radius wie die Baum-Kacheln", () => {
    const baum = radius("\\.up-vnode");
    expect(baum, "der Radius der Baum-Kacheln ist nicht mehr auffindbar").toBe(6);
    for (const sel of ["\\.st-box", '\\.st-sec\\[data-sec="best"\\] button', '\\.st-sec\\[data-sec="runs"\\] button'])
      expect(radius(sel), `${sel} läuft mit einem anderen Radius`).toBe(baum);
  });

  it("die Panels behalten ihre 14 px — sie sind der Rahmen, nicht der Inhalt", () => {
    expect(radius("\\.st-sec")).toBe(14);
  });

  it("Fläche und Rahmen stehen EINMAL an .st-box, nicht zusätzlich an der KPI-Regel", () => {
    /* Sonst hätte der Screen wieder zwei Fassungen derselben Kachel — genau die Doppelpflege, die
       Regel 2 verbietet. Die KPI-Regel darf nur noch KPI-Eigenes setzen (Polster, Ausrichtung). */
    const kpi = desk.match(/\.st-kpis > div\s*\{[^}]*\}/)[0];
    expect(kpi).not.toMatch(/background|border|border-radius|box-shadow/);
  });

  it("die flache Fassung schlägt das INLINE gesetzte MENU_PANEL", () => {
    /* #menu-rework M1 — geprüft wird die INVARIANTE, nicht der Mechanismus. Dieselbe Bauart wie in
       go-ruhe; die Begründung steht einmal, in test/inlineOverride.js. */
    const box = desk.match(/\.st-box\s*\{[^}]*\}/)[0];
    for (const prop of ["background", "border"]) {
      const inline = inlineValueOf(modal, "MENU_PANEL", prop);
      expect(inline, `MENU_PANEL setzt ${prop} nicht mehr inline — dann prüft dieser Test nichts`).toBeTruthy();
      expect(overridesInline(box, prop, inline),
        `${prop} wird an .st-box nicht neutralisiert — MENU_PANEL steht inline (${inline}) und `
        + `gewänne. Nötig ist entweder !important, oder die Regel definiert die Variable um, die der `
        + `Inline-Wert liest.`).toBeTruthy();
    }
  });
});

describe("#st-ruhe — Schließen ist ein Werkzeug, kein Angebot", () => {
  it("der Knopf wird flach wie die Kopfzeile des Baums", () => {
    const st = desk.match(/\.st-close\s*\{[^}]*\}/g).pop();
    for (const prop of ["background", "border", "box-shadow"])
      expect(st, `${prop} steht noch am Schließen-Knopf`).toMatch(new RegExp(`${prop}:\\s*(none|0)\\s*!important`));
  });

  it("das Klickziel bleibt — die Polsterung ist unangetastet", () => {
    /* Flach heißt leiser, nicht kleiner: die 11/18 px stehen in einer eigenen, früheren Regel. */
    expect(desk).toMatch(/\.st-close,[^{]*\{[^}]*padding:\s*11px 18px/);
  });
});

describe("#st-ruhe — was ausdrücklich NICHT angefasst ist", () => {
  it("das Gold der Kanten-Familie bleibt das einzige Farbsignal des Screens", () => {
    /* Regel 5: die Linkskante ist projektweites Signal. Nur der RADIUS der zwei Knöpfe zieht mit —
       ihre `--c` (Gold beim Rekord, neutral sonst) darf der Desktop-Block nicht überschreiben. */
    expect(stats).toMatch(/as-edge-card[^"]*"\s*\n?\s*style=\{\{\s*"--c":\s*"#d4a63a"/);
    expect(desk, "der Desktop-Block färbt die Kante um").not.toMatch(/\.st-sec[^{]*\{[^}]*--c:/);
  });
});
