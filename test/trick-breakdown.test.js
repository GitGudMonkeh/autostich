import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";

/* Stich-Aufschlüsselung (§17) — die Faktorenkette unter dem Feld (src/ui/TrickBreakdown.jsx).
   Die Zeile rechnet NICHTS selbst, sie liest `lastTrick.breakdown`. Diese Tests sichern die Naht:

     1. Der Breakdown trägt die Felder, aus denen die Kette gebaut wird — inklusive der beiden
        (streakFlat / sunwrathMult), die erst dafür dazugekommen sind. Ohne sie blieb bei einem
        Sonnenzorn- oder Reihenhaus-Build ein unerklärter Rest stehen.
     2. Bei einem schlichten Sieg (keine Direkt-Dividenden, kein Serien-Flat) geht die angezeigte
        Gleichung EXAKT auf: Basis × Serie × Perks × Form × Crit = Summe. Kippt die Engine den
        Score-Stack um, wird das hier rot statt still falsch angezeigt zu werden.
     3. Die Anzeige ist verdrahtet und abschaltbar (Quelltext-Ratsche, analog privacy.test.js) —
        Schalter in den Optionen, Prop-Durchreichung, Default sichtbar.

   Es gibt keine DOM-Testumgebung (vitest läuft `environment: "node"`), deshalb prüft Punkt 3 den
   Quelltext statt gerenderter Knoten. */

const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const noCrit = () => 0.99; // rng-Wert über jeder Crit-Chance → nie kritisch
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: [], ...over,
});

// Exakt die Zusammenfassung, die TrickBreakdown anzeigt (fünf Glieder statt neun Faktoren).
const chainOf = (b) => Math.max(0, (b.base || 0) + (b.flats || 0))
  * (b.streakMult || 1)
  * ((b.perkMult || 1) * (b.sunwrathMult || 1) * (b.architectMult || 1))
  * ((b.formMult || 1) * (b.afterglowMult || 1) * (b.coreMult || 1))
  * (b.critMult || 1);

describe("Stich-Aufschlüsselung · Engine-Daten", () => {
  it("ein Sieg liefert alle Glieder der Kette (inkl. streakFlat/sunwrathMult)", () => {
    const b = resolveTrick(scen(), noCrit).lastTrick.breakdown;
    for (const k of ["base", "flats", "streakFlat", "streakMult", "perkMult", "sunwrathMult",
                     "formMult", "afterglowMult", "coreMult", "architectMult", "critMult", "total"])
      expect(b[k], `breakdown.${k} fehlt — die Kette könnte den Score nicht mehr erklären`).toBeTypeOf("number");
  });

  it("ohne Direkt-Anteile geht Basis × Serie × Perks × Form × Crit = Summe exakt auf", () => {
    const b = resolveTrick(scen(), noCrit).lastTrick.breakdown;
    const direct = (b.fireDirect || 0) + (b.lightDirect || 0) + (b.plantDirect || 0)
                 + (b.perkDirect || 0) + (b.glacierDirect || 0);
    expect(direct, "Szenario ohne Archetypen/Legendäre sollte keine Direkt-Dividenden zahlen").toBe(0);
    expect(b.streakFlat, "ohne Architekt kein Serien-Flat").toBe(0);
    expect(chainOf(b)).toBeCloseTo(b.total, 6);
  });

  it("bei Niederlage/Gleichstand gibt es keinen Breakdown (die Zeile bleibt leer)", () => {
    const s = resolveTrick(scen({ oppDeck: oppOf(99) }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.lastTrick.breakdown).toBeNull();
  });
});

describe("Stich-Aufschlüsselung · Anzeige verdrahtet und abschaltbar", () => {
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

  it("Battlefield rendert die Zeile und respektiert hideBreakdown", () => {
    const src = read("src/ui/Battlefield.jsx");
    expect(src).toMatch(/import \{ TrickBreakdown \}/);
    expect(src, "die Zeile muss am Schalter hängen").toMatch(/!hideBreakdown && <TrickBreakdown/);
    expect(src, "feste Höhe — sonst springen die Karten, genau wie bei der alten Fassung")
      .toMatch(/h-5[^>]*>\s*\{!hideBreakdown/);
  });

  it("App reicht die Option durch, die Optionen haben den Schalter, Default ist sichtbar", () => {
    expect(read("src/App.jsx")).toMatch(/hideBreakdown=\{options\.hideBreakdown\}/);
    expect(read("src/ui/OptionsModal.jsx")).toMatch(/hideBreakdown: !options\.hideBreakdown/);
    expect(read("src/game/storage.js"), "Default AN = Flag false").toMatch(/hideBreakdown: false/);
  });

  /* #boden-zeile: Läuft ein BODEN-Effekt, steht die Aufschlüsselung mobil ÜBER den Karten. Der Boden beginnt
     bei 86 % der Panelhöhe (gemessen 298 px auf dem 358×347-Handybrett) — die Zeile lag mit 302–322 px genau
     darin und war über Würfeln/Brandung nicht mehr zu lesen.
     Vier Dinge hält der Wächter fest, alle vier sind unsichtbar kaputtzumachen: (1) es gibt EINEN Zeilen-Block,
     der umgehängt wird — kein zweiter Nachbau, der driften könnte; (2) er hängt oben WIE unten an derselben
     Variable, steht also nie doppelt oder gar nicht; (3) die Sieg/Niederlage-Ansage wandert NICHT mit — sie
     bleibt unter den Karten, wo sie war; (4) nur mobil und nur bei den zwei Boden-Effekten. */
  it("Boden-Effekt stellt nur die Aufschlüsselung mobil über die Karten", () => {
    const src = read("src/ui/Battlefield.jsx");
    expect(src, "Breite kommt aus derselben Quelle wie die Zonen-Wahl").toMatch(/MOBILE_MQ.*from ".\/fx\/effectZones\.js"/);

    const boden = src.match(/const bodenFx = ([^;]+);/);
    expect(boden, "bodenFx muss es geben").toBeTruthy();
    expect(boden[1]).toMatch(/"cubematrix"/);
    expect(boden[1]).toMatch(/"neonsurf"/);
    expect(boden[1], "Aurora ist ein Himmels-Effekt, kein Boden").not.toMatch(/aurora/i);
    expect(boden[1], "Sternenfeld/Komet sind Finisher, kein Dauerbild").not.toMatch(/starfield|embers/i);

    expect(src, "nur mobil UND nur bei Boden-Effekt")
      .toMatch(/const ketteOben = useMediaQuery\(MOBILE_MQ\) && bodenFx;/);

    // EIN Block, zwei Einhängepunkte — nicht zwei Fassungen der Zeile.
    expect(src.match(/const kette = \(/g) || [], "die Zeile darf nur EINMAL gebaut werden").toHaveLength(1);
    const oben = src.indexOf("{ketteOben && kette}");
    // #buehne: Die Kartenreihe trägt seit dem Desktop-Pass die Klasse `bf-cards` (index.css klemmt sie
    // ab 1280 px auf die Bühnenhöhe); die Abstände darin bleiben am `ketteOben`-Zweig (#boden-effekt).
    const karten = src.indexOf("`bf-cards relative z-10 ${ketteOben");
    const unten = src.indexOf("{!ketteOben && kette}");
    expect(oben, "oberer Einhängepunkt fehlt").toBeGreaterThan(-1);
    expect(unten, "unterer Einhängepunkt fehlt").toBeGreaterThan(-1);
    expect(oben, "der obere Block muss VOR der Kartenreihe stehen").toBeLessThan(karten);
    expect(unten, "der untere Block muss NACH der Kartenreihe stehen").toBeGreaterThan(karten);

    // Die Ansage bleibt, wo sie war: genau EINE Renderstelle, und die liegt hinter den Karten.
    const ansageAlle = [...src.matchAll(/className=\{`bf-result relative z-10 h-8 \$\{ketteOben \? "mt-\d+" : "mt-\d+"\} flex/g)].map((m) => m.index);
    expect(ansageAlle, "die Ansage darf nur EINMAL gerendert werden").toHaveLength(1);
    expect(ansageAlle[0], "die Ansage bleibt unter den Karten").toBeGreaterThan(karten);
    const ketteBlock = src.slice(src.indexOf("const kette = ("), src.indexOf("{ketteOben && kette}"));
    expect(ketteBlock, "die Ansage gehört NICHT in den wandernden Block").not.toMatch(/hideFloatWinLose/);

    /* Die drei Abstände werden UMVERTEILT, nicht gekürzt — sonst schrumpft das Panel, und weil das
       Effekt-Band ein PROZENTSATZ der Panelhöhe ist, wandert der Boden dann einfach mit nach oben und die
       Karten sind ihm genauso nah wie vorher. Beide Seiten müssen also dieselbe Summe ergeben. */
    const paare = [...src.matchAll(/ketteOben \? "(-?)mt-(\d+)" : "(-?)mt-(\d+)"/g)]
      .map((m) => [Number(m[1] + m[2]), Number(m[3] + m[4])]);
    expect(paare, "erwartet drei umschaltende Abstände: Zeile · Kartenreihe · Ansage").toHaveLength(3);
    const summe = (i) => paare.reduce((a, p) => a + p[i], 0);
    expect(summe(0), `Abstände oben ${summe(0)} ≠ unten ${summe(1)} — die Panelhöhe würde springen`)
      .toBe(summe(1));
  });

  it("alle Texte der Zeile stehen in BEIDEN Katalogen", () => {
    const keys = ["bf.bd.base", "bf.bd.streak", "bf.bd.perks", "bf.bd.form", "bf.bd.crit",
                  "bf.bd.direct", "bf.bd.total", "bf.bd.aria",
                  "options.breakdown.title", "options.breakdown.desc"];
    for (const k of keys) { expect(de[k], `${k} fehlt in de.js`).toBeTruthy(); expect(en[k], `${k} fehlt in en.js`).toBeTruthy(); }
  });
});
