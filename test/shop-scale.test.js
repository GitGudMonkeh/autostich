/* #shop-skalieren + #shop-luft — die Pack-Vorschau der Deck-Werkstatt ab 1400 px (19.08.2026).
   -------------------------------------------------------------------------------------------------
   Gemessen im Produktionsbuild (Playwright, echte Komponente): der Inhalt der Detailspalte braucht
   662 px. Auf 1920 × 1080 und 1723 × 1030 hat er sie — dort passte es. Auf 1536 × 791 stehen ihm 558
   zur Verfügung, also 104 px Überhang: Kartenrückseite, Spielfeld und der Aktivieren-Knopf standen nie
   zusammen im Bild.

   Geschrumpft wird über die BREITE des ganzen Vorschau-Blocks. Der erste Anlauf schrumpfte die HÖHEN
   (Flexbox + `min-height: 0`) — dabei bleibt der Kasten breit und das Bild steht mittig darin, und
   genau das kam vom Gerät zurück: „auf der Laptop-Auflösung sind die Karten- und Hintergrundbilder
   nicht mehr ausgerichtet". Die Bilder leiten ihre Höhe aus der Breite ab (`aspect-ratio`), also ist
   der Breitenfaktor die einzige Schrumpfung, bei der die flache Fassung eine echte VERKLEINERUNG der
   hohen bleibt. Nachgemessen: Beschriftungen und Bilder stehen auf 1920 × 1080 · 1723 × 1030 ·
   1536 × 791 · 1400 × 760 · 1400 × 700 auf derselben Kante, Überhang überall 0.

   Zwei Sorten Prüfung, bewusst getrennt:
   1. Die RECHNUNG wird nachgerechnet (`shopScale.js` ist rein, ohne React).
   2. Die VERDRAHTUNG als Quelltext-Ratsche über CustomizeScreen.jsx + index.css — das Projekt hat kein
      Component-Test-Setup (s. test/fx-panel.test.js, test/guide-desktop.test.js). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shotFactor, SHOT_F_MIN } from "../src/ui/shopScale.js";

/* Zeilenenden beim Lesen vereinheitlichen (Gürtel und Hosenträger): Seit .gitattributes (`* text=auto eol=lf`)
   liegt der Quelltext auch auf Windows mit LF in der Arbeitskopie. Eine Arbeitskopie, die davor ausgecheckt
   wurde, hat aber noch CRLF — und die Ratsche unten greift ÜBER einen Zeilenumbruch, findet dann nichts und
   meldet einen Umbau, den es nie gab. Das Normalisieren hier kostet nichts und macht den Test unabhängig
   davon, wann und mit welcher Git-Einstellung jemand ausgecheckt hat. */
const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const jsx = src("ui/CustomizeScreen.jsx");
const css = src("index.css");
// Nur der 1400er-Block — sonst prüfte man Regeln, die am Handy stehen.
const desktop = css.slice(css.indexOf("@media (min-width: 1400px)"));
// Ohne die Begründungen: die Kommentare nennen die verworfene Fassung absichtlich beim Namen (dieselbe
// Falle wie beim `as-ring`-Zähler in #fx-panel und beim `ATTACK:`-Greifer in #cube-takt).
const desktopBlank = desktop.replace(/\/\*[\s\S]*?\*\//g, "");

describe("#shop-skalieren — der Breitenfaktor, nachgerechnet", () => {
  it("passt alles, bleibt die Vorschau unangetastet", () => {
    expect(shotFactor(527, 0)).toBe(1);     // gemessen 1920 × 1080: kein Überhang
    expect(shotFactor(527, -20)).toBe(1);   // Panel endet am Inhalt → negative „Überhänge" sind kein Auftrag
  });

  it("der Faktor nimmt dem Bild GENAU den Überhang ab", () => {
    // 527 px Bildhöhe (Karte 331 + Spielfeld 196, gemessen), 104 px Überhang (1536 × 791).
    const f = shotFactor(527, 104);
    expect(f).toBeCloseTo(1 - 104 / 527, 10);
    expect(527 * f).toBeCloseTo(527 - 104, 6);   // die Kernaussage: danach passt es auf den Pixel
  });

  it("Beschriftungen und Abstände kürzen sich heraus — deshalb zählt NUR die Bildhöhe", () => {
    // Die Formel kennt weder Überschriften noch den Aktivieren-Knopf: was nicht mit der Breite skaliert,
    // steht auf beiden Seiten der Gleichung und fällt weg. Sonst bräuchte sie eine Liste der festen
    // Posten — und die wäre bei jedem neuen Element in der Spalte still falsch.
    for (const [h, u] of [[527, 104], [300, 50], [1000, 1]]) {
      expect(shotFactor(h, u)).toBeCloseTo((h - u) / h, 10);
    }
  });

  it("es gibt eine Untergrenze, und darüber übernimmt der Scroller", () => {
    expect(shotFactor(200, 190)).toBe(SHOT_F_MIN);
    expect(SHOT_F_MIN).toBeGreaterThan(0);
    expect(SHOT_F_MIN).toBeLessThan(1);
  });

  it("unbrauchbare Messwerte lassen die Vorschau in Ruhe, statt sie zu zerlegen", () => {
    // Vor dem ersten Layout steht die Bildhöhe auf 0.
    for (const bad of [0, -5, NaN, null, undefined, "hoch"]) expect(shotFactor(bad, 104)).toBe(1);
    for (const bad of [NaN, null, undefined, "viel"]) expect(shotFactor(527, bad)).toBe(1);
  });
});

describe("#shop-skalieren — die Verdrahtung", () => {
  it("der Faktor sitzt an EINEM Wrapper um alle drei Bilder", () => {
    // Getrennte Faktoren je Bild wären wieder drei Maßstäbe statt einem — genau der Fehler, den die
    // Höhen-Schrumpfung hatte.
    expect(jsx).toContain('ref={shotWrapRef} className="cz-shotwrap"');
    expect(jsx).toMatch(/shotF < 1 \? \{ width: `\$\{\(shotF \* 100\)/);
    expect(jsx).toMatch(/import \{ shotFactor \} from "\.\/shopScale\.js"/);
  });

  it("gemessen wird an der UNGESCHRUMPFTEN Fassung — sonst läuft der Faktor mit jedem Durchgang weiter runter", () => {
    const eff = jsx.slice(jsx.indexOf("useLayoutEffect(() => {\n    const body = shotBodyRef.current"));
    const rumpf = eff.slice(0, eff.indexOf("}, ["));
    expect(rumpf).toContain('wrap.style.width = "100%"');
    // Mit sichtbarer Leiste misst man eine schmalere Spalte; der Faktor liesse danach ein paar Pixel
    // überstehen und die Leiste käme zurück.
    expect(rumpf).toContain('body.style.overflowY = "hidden"');
    // Und beides wird wieder zurückgestellt, bevor React neu rendert.
    expect(rumpf).toContain("wrap.style.width = breiteVorher");
    expect(rumpf).toContain("body.style.overflowY = ueberlaufVorher");
  });

  it("die Messung liegt VOR dem Zeichnen (useLayoutEffect), nicht danach", () => {
    // Mit `useEffect` sähe man den ungeschrumpften Zwischenzustand aufblitzen.
    expect(jsx).toMatch(/useLayoutEffect\(\(\) => \{\s*const body = shotBodyRef\.current/);
  });

  it("das Kartenpaar zählt EINMAL in die Höhe — es steht nebeneinander", () => {
    expect(jsx).toContain('wrap.querySelector(".cz-shots .cz-shotimg")');
    expect(jsx).toContain('wrap.querySelector(".cz-shotbg .cz-shotimg")');
  });

  it("`overflow-y: auto` bleibt als VENTIL stehen (Untergrenze erreicht)", () => {
    expect(jsx).toContain('inline ? "flex-1 min-h-0 overflow-y-auto" : ""');
  });

  it("die verworfene Höhen-Schrumpfung ist WEG und darf nicht zurückkommen", () => {
    // Gegenprobe zur gemeldeten Regression: `min-height: 0` an den Bildkästen liesse den Kasten breit
    // und das Bild mittig darin stehen — die Beschriftungen stünden wieder neben ihren Bildern.
    expect(desktopBlank).not.toMatch(/\.cz-shotimg\s*\{[^}]*min-height/);
    expect(desktopBlank).not.toMatch(/\.cz-shots\s*\{[^}]*minmax\(0,\s*1fr\)/);
    expect(desktopBlank).not.toMatch(/\.cz-shotimg\s*>\s*img\s*\{[^}]*object-fit/);
  });

  it("der geschrumpfte Block steht mittig in der Spalte", () => {
    expect(desktopBlank).toMatch(/\.cz-shotwrap\s*\{[^}]*margin-inline:\s*auto/);
  });
});

describe("#shop-luft — Reiter und Panels stoßen nicht mehr aufeinander", () => {
  it("der Kopf trägt die Luft unter den Reitern (gemessen 8 → 18 px)", () => {
    // Sie hängt am KOPF und nicht als `margin-top` am Raster: der Kopf ist sticky, sein Polster gehört
    // zu ihm und fährt beim Scrollen mit.
    const kopf = desktopBlank.slice(desktopBlank.indexOf(".cz-head {"));
    const m = kopf.slice(0, kopf.indexOf("}")).match(/padding-bottom:\s*(\d+)px/);
    expect(m, "`.cz-head` hat kein padding-bottom mehr — Naht gefunden?").toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(16);
  });
});
