import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #go-ruhe (19.08.2026) — der Siegesbildschirm im Desktop-Ton.

   Fünfter Screen nach der Liste in CLAUDE.md („Desktop-Umbau: die Entscheidungsregeln"), gebaut wie
   #st-ruhe davor. Vier Nähte brauchen eine Ratsche, weil sie alle still reißen — der Screen sieht
   danach für sich genommen weiter richtig aus, nur eben nicht mehr wie seine vier Nachbarn:

   · `as-ring-quiet` an den Panels — verliert eines den Modifikator, holt es sich den laufenden Ring
     zurück (dieselbe Begründung wie in #up-ruhe und #st-ruhe).
   · `.go-box` an den `MENU_PANEL`-Kästen — die Konstante wird INLINE gesetzt; ohne `!important` an
     Fläche und Rahmen bliebe die Regel wirkungslos, ohne dass im Quelltext etwas fehlt.
   · die Kennzahlenreihe im Kopf ist DESKTOP-ONLY (`wide`) — fällt die Bedingung weg, trägt das Handy
     plötzlich vier beschriftete Werte neben einer 40-px-Zahl.
   · das Bestleistungs-Panel hängt an `prevBests`, dem Schnappschuss VOR `recordRun`. Wird er aus
     App.jsx entfernt oder nach der Wertung genommen, zeigt jede Zeile „Neu" — und zwar plausibel
     genug, dass es niemandem auffällt.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const go = read("src/ui/GameOver.jsx");
const app = read("src/App.jsx");
const storage = read("src/game/storage.js");
// Kommentarfreie Fassung: die Begründungen nennen die alten Werte absichtlich beim Namen.
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, "");
const goBare = go.replace(/\/\*[\s\S]*?\*\//g, "");
const deskBlock = (src) => {
  const at = src.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = src.indexOf("{", at); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(at, j + 1);
  }
  return "";
};
const desk = deskBlock(cssBare);
const radius = (sel) => {
  const alle = desk.match(new RegExp(`(^|,)\\s*${sel}\\s*(,[^{}]*)?\\{[^}]*border-radius:\\s*[\\d.]+px`, "gm")) || [];
  const m = alle.length ? alle[alle.length - 1].match(/border-radius:\s*([\d.]+)px/) : null;
  return m ? Number(m[1]) : null;
};

describe("#go-ruhe — der Ring steht still", () => {
  it("jedes Panel des Screens trägt den Modifikator", () => {
    /* Verdienst · Bestleistungen · Herkunft · Build · Kennzahlen · Aufstellung. Ein `as-ring` ohne
       `as-ring-quiet` wäre das einzige wandernde Band auf einem sonst stillen Screen. */
    const ringe = goBare.match(/className="go-[a-z]+ as-ring[^"]*"/g) || [];
    expect(ringe.length, "Zahl der Ring-Panels hat sich geändert").toBe(6);
    for (const r of ringe) expect(r, `Panel ohne as-ring-quiet: ${r}`).toMatch(/\bas-ring-quiet\b/);
  });

  it("jedes Ring-Panel bringt sein Maskenkind mit", () => {
    /* #perf-ring: `.as-ring` allein malt nichts — der Rahmen entsteht erst durch `.as-ring-run`. */
    expect((go.match(/className="as-ring-run"/g) || []).length).toBe(6);
  });
});

describe("#go-ruhe — EINE Kachelform für alles im Panel", () => {
  it("die MENU_PANEL-Kästen tragen die gemeinsame Klasse", () => {
    const kaesten = go.match(/<div[^>]*style=\{\{?\s*\.{0,3}\s*MENU_PANEL/g) || [];
    expect(kaesten.length, "Zahl der MENU_PANEL-Kästen hat sich geändert").toBeGreaterThan(0);
    for (const k of kaesten) expect(k, `Kasten ohne go-box: ${k}`).toMatch(/\bgo-box\b/);
  });

  it("Kästen stehen auf demselben Radius wie die Baum-Kacheln", () => {
    const baum = radius("\\.up-vnode");
    expect(baum, "der Radius der Baum-Kacheln ist nicht mehr auffindbar").toBe(6);
    expect(radius("\\.go-card \\.go-box"), ".go-box läuft mit einem anderen Radius").toBe(baum);
    expect(radius("\\.go-bestrow"), ".go-bestrow läuft mit einem anderen Radius").toBe(baum);
  });

  it("die Panels behalten ihre 14 px — sie sind der Rahmen, nicht der Inhalt", () => {
    expect(radius("\\.go-layout")).toBe(14);
  });

  it("die flache Fassung schlägt das INLINE gesetzte MENU_PANEL", () => {
    const box = desk.match(/\.go-card \.go-box\s*\{[^}]*\}/)[0];
    for (const prop of ["background", "border"])
      expect(box, `${prop} ohne !important — MENU_PANEL steht inline und gewänne`)
        .toMatch(new RegExp(`${prop}:[^;]*!important`));
  });

  it("Kästen MIT Farbkante behalten sie (#kante)", () => {
    /* Die Sammelregel setzt `border` mit `!important` und überschriebe damit auch die inline
       gesetzte `borderLeft` der Motor-Kennzahlen. `--gob` holt den Ton zurück. */
    expect(desk).toMatch(/\.go-card \.go-box\.go-box-c\s*\{[^}]*border-left:[^;]*var\(--gob/);
    expect(go, "die Motor-Kachel reicht ihren Kantenton nicht durch").toMatch(/"--gob":\s*m\.color/);
  });
});

describe("#go-ruhe — die zwei Aktionen tragen die Kachelform", () => {
  it("Fläche, Rahmen und Schein der Kanten-Knöpfe fallen", () => {
    const btn = desk.match(/\.go-actions > button\s*\{[^}]*\}/)[0];
    for (const prop of ["background", "border", "box-shadow"])
      expect(btn, `${prop} ohne !important — as-edge-strong steht als Klasse und gewänne`)
        .toMatch(new RegExp(`${prop}:[^;]*!important`));
  });

  it("unterschieden wird allein über die Schriftfarbe", () => {
    /* Gold heißt auf diesem Schirm „deine Bestmarke" (#kante am Rekord-Chip) und trägt das auch
       ohne gefüllte Fläche. „Neuer Lauf" ist immer der LETZTE Knopf — „Menü" hängt an `onMenu`. */
    expect(desk).toMatch(/\.go-actions > button:last-child\s*\{\s*color:\s*#d4a63a/);
  });
});

describe("#go-ruhe — die Kennzahlenreihe im Kopf ist Desktop-only", () => {
  it("die Handy-Fassung steht als eigener Zweig daneben", () => {
    /* Die Reihe ersetzt die 55-%-opake Zeile NUR ab 1400 px; am Handy bleibt die kompakte Zeile.
       Ohne die Verzweigung stünden vier beschriftete Werte neben einer 40-px-Zahl. */
    expect(goBare).toMatch(/\{wide \? \(\s*<div className="go-kpi">/);
    expect(goBare, "die kompakte Handy-Zeile ist verschwunden").toMatch(/text-xs opacity-55 mt-2 flex items-center justify-center/);
  });

  it("die Reihe steht nur im Desktop-Block", () => {
    expect(desk, ".go-kpi fehlt im Desktop-Block").toMatch(/\.go-kpi\s*\{/);
    expect(cssBare.replace(desk, ""), ".go-kpi steht auch außerhalb — das trifft das Handy").not.toMatch(/\.go-kpi\s*\{/);
  });
});

describe("#go-ruhe — Bestleistungen vergleichen gegen den Stand VOR dem Lauf", () => {
  it("der Schnappschuss entsteht aus prevProfile, nicht aus dem frischen Profil", () => {
    /* `recordRun` überschreibt das Profil, bevor der Endscreen rendert. Käme der Vergleichswert von
       dort, wäre er immer schon gleich hoch wie der Lauf — jede Zeile hieße „Neu". */
    expect(app).toMatch(/setPrevBests\(\{[^}]*prevProfile\.bestScore/);
    expect(app, "prevBests erreicht den Endscreen nicht").toMatch(/prevBests=\{prevBests\}/);
  });

  it("das Panel bleibt ohne Schnappschuss weg statt falsch zu rechnen", () => {
    expect(goBare).toMatch(/\{wide && prevBests &&/);
  });

  it("der beste Einzelstich ist ein PROFIL-Rekord, kein Listenwert", () => {
    /* Er stand bis hierher nur je Lauf in der Highscore-Liste (Top 20). Ohne den Profilwert
       verglichen die Bestleistungen gegen die Liste statt gegen die eigene Bestmarke. */
    expect(storage, "bestTrickScore fehlt im DEFAULT_PROFILE").toMatch(/bestTrickScore:\s*0,/);
    expect(storage, "bestTrickScore wird beim Werten nicht fortgeschrieben")
      .toMatch(/bestTrickScore:\s*Math\.max\(n0\(p\.bestTrickScore\), n0\(record\.bestTrickScore\)\)/);
  });
});

describe("#go-ruhe — der Stich-Graph sitzt am Fuß der Spalte", () => {
  it("die Spalte wird auf die Höhe des Bretts gezogen", () => {
    /* Ohne `stretch` steht die Spalte auf `start` (Raster-Vorgabe) und `margin-top: auto` hat
       nichts zu verteilen — der Graph bliebe, wo er war. */
    expect(desk).toMatch(/\.go-side\s*\{[^}]*align-self:\s*stretch/);
  });

  it("nur MIT Gebäudeliste — sonst wäre das Loch nur oben statt unten", () => {
    expect(desk).toMatch(/\.go-blist ~ \.go-ticks\s*\{[^}]*margin-top:\s*auto/);
  });
});

describe("#go-ruhe — was ausdrücklich NICHT angefasst ist", () => {
  it("die Kanten-Familie behält ihre Kante, nur der Radius zieht mit", () => {
    /* Regel 5: die Linkskante ist ein projektweites Signal (#kante). Der Desktop-Block darf die
       SP-/DP-Kacheln eckiger machen, aber ihre `--c` nicht überschreiben. */
    expect(desk).toMatch(/\.go-earn \.as-edge-card,[\s\S]{0,200}?border-radius:\s*6px/);
    expect(desk, "der Desktop-Block färbt die Kante um").not.toMatch(/\.go-earn[^{]*\{[^}]*--c:/);
  });

  it("der blaue Rahmen der Gebäudeliste bleibt — er gehört dem Architekten", () => {
    const blist = desk.match(/\.go-blist\s*\{[^}]*\}/g) || [];
    for (const r of blist) expect(r, "der Desktop-Block überschreibt den Architekt-Rahmen").not.toMatch(/border(-color)?:/);
  });
});
