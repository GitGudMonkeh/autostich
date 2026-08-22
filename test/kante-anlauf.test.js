import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================
   #kante-anlauf (19.08.2026) — der Farbanlauf der Auswahlkarten, nur auf dem Desktop leiser.

   Die Kanten-Karte (#kante) lässt ihre Signaturfarbe von der linken Kante in die Fläche auslaufen. EINE
   Karte liest sich damit richtig; der Desktop zeigt aber Rudel davon — 27 Knoten im Baum, 18 Kacheln in
   der Werkstatt, drei Angebote plus gehaltene Skills in der Level-up-Karte — und in der Summe wird aus
   dem Signal eine Farbwolke. An DREI Screens kam dieselbe Beobachtung auf; jedes Mal wurde sie bewusst
   nicht einzeln behoben, weil der Anlauf projektweites Signal ist. Hier ist er EINMAL an der Familie
   geändert, und nur ab 1280 px.

   Die Ratsche hält zwei Dinge fest, die beide still kippen können: dass es EINE Definition bleibt
   (keine zweite Regel im Desktop-Block), und dass die Handy-Werte die Rückfälle sind.
   ============================================================ */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
const basis = css.slice(0, css.indexOf(DESKTOP_BLOCK_AT));

describe("#kante-anlauf — ein Knopf, zwei Breiten", () => {
  it("die Handy-Werte stehen als Rückfall IN der Regel — ohne Variable rechnet sie wie vorher", () => {
    /* Es gibt MEHRERE `.as-edge-card`-Regeln (die geteilte Kante der Familie, die Fläche, `is-sel`,
       `is-locked`). Gesucht ist die mit der FLÄCHE — sonst prüft der Wächter die Rahmenregel und ist
       still grün. Deshalb über alle Treffer und den mit `background:` nehmen. */
    const flaeche = [...basis.matchAll(/\.as-edge-card\s*\{([^}]*)\}/g)].map((m) => m[1]).find((b) => /background:/.test(b));
    expect(flaeche, "die Flächen-Regel der Kanten-Karte nicht mehr gefunden").toBeTruthy();
    expect(flaeche, "die Mischung ist wieder eine feste Zahl").toMatch(/var\(--edge-wash,\s*14%\)/);
    expect(flaeche, "der Auslauf ist wieder eine feste Zahl").toMatch(/var\(--edge-wash-w,\s*42%\)/);
    const sel = basis.match(/\.as-edge-card\.is-sel\s*\{([^}]*)\}/);
    expect(sel[1]).toMatch(/var\(--edge-wash-sel,\s*24%\)/);
    expect(sel[1]).toMatch(/var\(--edge-wash-sel-w,\s*46%\)/);
  });

  it("der Desktop setzt NUR die Variablen — keine zweite Fassung der Regel", () => {
    for (const v of ["--edge-wash", "--edge-wash-w", "--edge-wash-sel", "--edge-wash-sel-w"])
      expect(deskBlock, `${v} wird auf dem Desktop nicht gesetzt`).toMatch(new RegExp(`${v}:\\s*\\d+%`));
    /* Eine eigene `.as-edge-card`-Regel im Desktop-Block wäre die Spaltung der Familie, vor der die
       Datei überall warnt — und der Grund, warum der Umbau überhaupt über Variablen läuft. */
    expect(deskBlock, "die Familie ist im Desktop-Block noch einmal definiert")
      .not.toMatch(/\.as-edge-card\s*(\.is-sel\s*)?\{[^}]*background:/);
  });

  it("der Desktop-Anlauf ist wirklich leiser, nicht nur anders", () => {
    /* Gerechnet statt verglichen: beide Achsen müssen KLEINER sein als der Handy-Rückfall. Ein Zahlendreher
       (26 statt 62) fiele sonst nicht auf — die Regel sähe weiter „geändert" aus. */
    const num = (block, name, fallback) => {
      const m = block.match(new RegExp(`${name}:\\s*(\\d+)%`));
      return m ? Number(m[1]) : fallback;
    };
    expect(num(deskBlock, "--edge-wash")).toBeLessThan(14);
    expect(num(deskBlock, "--edge-wash-w")).toBeLessThan(42);
    expect(num(deskBlock, "--edge-wash-sel")).toBeLessThan(24);
    expect(num(deskBlock, "--edge-wash-sel-w")).toBeLessThan(46);
  });

  it("die KANTE selbst bleibt unberührt — sie ist das Signal, der Anlauf war ihr Nachhall", () => {
    expect(basis).toMatch(/border-left:\s*4px solid color-mix\(in srgb, var\(--c, #8a8a95\) 80%, transparent\)/);
    /* Auf dem Desktop darf die KANTEN-KARTE ihre Kante nicht neu setzen. Andere Bausteine (Navigationszeilen,
       Kacheln) dürfen dort sehr wohl eigene Kanten haben — deshalb wird gezielt auf die Familie geprüft. */
    const kartenRegeln = [...deskBlock.matchAll(/\.as-edge-card[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join(" ");
    expect(kartenRegeln, "die Kantenbreite/-farbe wird auf dem Desktop verstellt").not.toMatch(/border-left:/);
  });

  it("die Knöpfe der Familie (`as-edge`, `as-edge-strong`) sind NICHT mitgezogen", () => {
    /* Sie tragen ihren Anlauf als Handlungs-Vorrang, und die Screens stellen sie ohnehin je Fall flach
       (`lv-actbtn`, `cz-actbtn`, `up-actions`). Sie hier mitzunehmen hieße, denselben Griff zweimal zu tun. */
    for (const k of ["--edge-wash", "--edge-wash-w"]) {
      const at = basis.indexOf(".as-edge {");
      const bis = basis.indexOf(".as-edge-neutral");
      expect(basis.slice(at, bis), `${k} steht jetzt auch an den Knöpfen`).not.toMatch(new RegExp(k));
    }
  });
});
