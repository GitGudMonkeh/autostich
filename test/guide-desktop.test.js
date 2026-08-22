import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================
   #desktop — Leitfaden als gerahmter Screen ab 1280 px, als Quelltext-Ratsche.

   Geprüft wird eine NAHT über zwei Dateien, keine Optik. Der Desktop-Leitfaden hat KEINEN eigenen
   Renderpfad: `GuideOverlay.jsx` setzt dieselben Klammern (`gd-desk` / `gd-page` / `gd-cols` / `gd-col`)
   in JEDER Breite, und `index.css` entscheidet, ob sie Boxen sind oder `display: contents`. Das ist
   billig und robust — aber es hat drei Sollbruchstellen, die alle stumm kaputtgehen:

     1. Fällt `display: contents` in der Basis weg, bekommt die HANDY-Fassung plötzlich vier zusätzliche
        Boxen im Fluss. Nichts wirft einen Fehler, das Layout rutscht nur.
     2. Wird das Spaltenraster nicht mehr unter `.gd-page` gehängt, greift es auch in der
        Deck-Detailansicht — die zeigt dieselbe `GuideBody` in einer schmalen Spalte und bekäme dort
        drei Spalten à 100 px.
     3. Dreht jemand nur EINE der drei `--gs`-Stufen, passt die Seite auf dem einen Fenster und läuft
        auf dem anderen über. Die Stufen sind gemessen (s. Kommentarblock in index.css), nicht geraten.

   Ebenfalls festgenagelt: das Ventil. Der Rumpf ist auf dem Desktop `overflow: hidden` — ohne den
   inneren Scroller am Spaltenbereich würde Überlauf ABGESCHNITTEN statt zu scrollen.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = read("index.css");
const jsx = read("ui/GuideOverlay.jsx");

// Der Block `@media (min-width: 1280px) { … }`, in dem der ganze Desktop-Pass steht.
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  if (at < 0) return null;
  let depth = 0, i = css.indexOf("{", at);
  for (let j = i; j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return null;
})();

describe("#desktop — Leitfaden ab 1280 px", () => {
  it("die vier Klammern sind unterhalb von 1280 px `display: contents`", () => {
    // Die Regel muss AUSSERHALB des Desktop-Blocks stehen, sonst gilt sie dort nicht, wo sie zählt.
    const base = deskBlock ? css.replace(deskBlock, "") : css;
    const rule = base.match(/^\.gd-desk,\s*\.gd-page,\s*\.gd-cols,\s*\.gd-col\s*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für die gd-Klammern nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
  });

  it("GuideBody setzt genau drei Spalten-Klammern in einem gd-cols", () => {
    expect(jsx).toMatch(/className="gd-cols"/);
    const cols = jsx.match(/className="gd-col"/g) || [];
    expect(cols.length, "GuideBody soll genau drei gd-col-Klammern haben").toBe(3);
  });

  it("das Spaltenraster hängt an .gd-page (sonst trifft es die Deck-Detailansicht)", () => {
    expect(deskBlock, "Desktop-Block nicht mehr gefunden").toBeTruthy();
    // Jede Regel, die gd-cols/gd-col zu echten Boxen macht, muss den .gd-page-Vorfahren nennen.
    for (const m of deskBlock.matchAll(/^\s*([^{}\n]*\.gd-col[s]?[^{}\n]*)\{/gm)) {
      expect(m[1], `Regel ohne .gd-page-Bindung: ${m[1].trim()}`).toMatch(/\.gd-page\s/);
    }
  });

  it("der Spaltenbereich scrollt innen — Überlauf darf nicht abgeschnitten werden", () => {
    // Der Rumpf klemmt (wie in der Werkstatt), das Ventil sitzt eine Ebene tiefer.
    expect(deskBlock).toMatch(/\.gd-scroll\s*\{[^}]*overflow:\s*hidden/);
    expect(deskBlock).toMatch(/\.gd-page \.gd-cols\s*\{[^}]*overflow-y:\s*auto/);
  });

  /* #viewport-1280 / V1280-03 — UMGEDREHT, NICHT GELÖSCHT.

     Bis 2026-08-22 sicherte dieser Wächter vier gemessene --gs-Schrumpfstufen an ihren jeweiligen
     Fensterbedingungen. Die Stufen sind entfernt: der Leitfaden war die einzige Fläche im Survey,
     die Text verkleinert, um nicht scrollen zu müssen — bei 1280 auf 8,61 px, bei 1600×900 fiel
     "Kernidee" von 13,2 auf 9,9 px. Der Eigentümer hat den Handel umgedreht (V1280-03).

     Der Wächter sichert jetzt die GEGENTEILIGE Zusicherung, damit die Stufen nicht unbemerkt
     zurückkommen und die Seite ihr Ventil behält. Eine Ratsche weniger wäre der falsche Schluss
     gewesen — die Stelle ist genauso schützenswert wie vorher, nur mit umgekehrtem Vorzeichen. */
  it("der Leitfaden schrumpft KEINEN Text mehr — --gs ist neutral und die Seite scrollt", () => {
    const stufen = [...css.matchAll(/--gs:\s*([\d.]+)/g)].map((m) => m[1]);
    expect(stufen.length, "--gs muss genau einmal definiert sein, s. .gd-page").toBe(1);
    expect(stufen[0], "--gs darf nicht mehr verkleinern").toBe("1");

    // Das Ventil, das die Schrumpfung ersetzt: die Seite selbst scrollt innen.
    const seite = deskBlock.match(/\.gd-page \{([^}]*)\}/);
    expect(seite, ".gd-page-Regel nicht mehr gefunden").toBeTruthy();
    expect(seite[1], "die Seite braucht ein eigenes Ventil").toMatch(/overflow-y:\s*auto/);
    expect(seite[1], "ohne min-height: 0 kann ein Flex-Kind gar nicht überlaufen").toMatch(/min-height:\s*0/);
    expect(seite[1], "Scrollen darf nicht auf die Seite dahinter durchschlagen").toMatch(/overscroll-behavior:\s*contain/);
    expect(seite[1], "align-self: start ließ die Seite am Inhalt enden — dann läuft sie nie über")
      .not.toMatch(/align-self:\s*start/);
  });

  it("der Untertitel im Seitenkopf bricht um, statt abgeschnitten zu werden", () => {
    // Der Blitz-Untertitel ist mit 913 px der längste und passte auf schmalen Fenstern knapp nicht.
    // Feste Kopfhöhe, damit der Wechsel zwischen ein- und zweizeiligen Archetypen nichts verschiebt.
    expect(deskBlock).toMatch(/\.gd-page-hint \{[^}]*-webkit-line-clamp:\s*2/);
    expect(deskBlock).not.toMatch(/\.gd-page-hint \{[^}]*white-space:\s*nowrap/);
    expect(deskBlock).toMatch(/\.gd-page-h \{[^}]*min-height/);
  });

  it("die Körper-Maße hängen alle am Maßstab statt an festen Pixeln", () => {
    // Sonst wächst beim Drehen an --gs die Schrift, aber nicht ihr Polster.
    const scaled = [...deskBlock.matchAll(/\.gd-page \.gd-(\w+)[^{]*\{[^}]*calc\([\d.]+px \* var\(--gs\)\)/g)];
    expect(scaled.length, "zu wenige am Maßstab hängende Regeln — steht da noch eine feste Größe?")
      .toBeGreaterThanOrEqual(12);
  });

  it("die Navigationsspalte endet an ihrem Inhalt (wie .up-nav im Baum)", () => {
    expect(deskBlock).toMatch(/\.gd-nav\s*\{[^}]*align-self:\s*start/);
  });

  it("der Leitfaden-Knopf im Baum öffnet den gerahmten Screen, nicht die Deck-Detailansicht", () => {
    // Bis 18.08.2026 landete man auf DeckDetail/Reiter „Leitfaden" — derselbe Inhalt im schmalen
    // Modal, während dieser Screen praktisch unerreichbar war (nur Skill-Auswahl im Lauf + GameOver).
    const up = readFileSync(new URL("../src/ui/UpgradeScreen.jsx", import.meta.url), "utf8");
    expect(up).toMatch(/import \{ GuideOverlay \}/);
    expect(up).toMatch(/className="up-page-guide"/);
    expect(up).toMatch(/onClick=\{\(\) => setGuideArch\(page\)\}/);
    expect(up).toMatch(/\{guideArch && <GuideOverlay initial=\{guideArch\}/);
    // Escape muss den Leitfaden vor dem Baum schließen — sonst nimmt EIN Tastendruck beide mit.
    expect(up).toMatch(/useEscape\(guideArch \?/);
  });

  it("die Archetyp-Spalte erscheint erst oberhalb des Bruchpunkts", () => {
    // `useIsWide` ist der einzige Ort, an dem der Bruchpunkt in JS steht — ohne ihn stünde die
    // Spalte auch am Handy im DOM (und die Reiterzeile daneben).
    expect(jsx).toMatch(/import \{ useIsWide \}/);
    expect(jsx).toMatch(/\{wide && \(/);
    expect(jsx).toMatch(/className="gd-nav as-ring\b/);
  });
});
