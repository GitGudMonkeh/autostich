import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEGENDARY_GOLD } from "../src/ui/indicators/vocab.js";
import { RARITY_META } from "../src/game/perks.js";

/* ============================================================================
   EIN GOLD FÜR „LEGENDÄR" (Owner 2026-09-14: „gold zusammenlegen und einheitlich machen").

   VORHER trug dieselbe Seltenheitsstufe drei Töne: Perks #d4a63a, Skills #e0b845, Gebäude #c8962f.
   Kein Kommentar war falsch, keine Stelle war für sich ein Fehler — jedes Teilsystem hatte sein
   eigenes Gold hingeschrieben, und niemand sah je zwei davon nebeneinander. Bis auf EINE Stelle:
   die legendäre Skill-Karte trägt den animierten Ring aus `.as-legendary` (#d4a63a) UND ihre eigene
   Kante (#e0b845), einen Pixel auseinander.

   DER WÄCHTER PRÜFT ZWEI DINGE, und das zweite ist das wichtigere:
     1. die drei Deklarationen desselben Werts stimmen überein (JS-Konstante, CSS-Token, Perk-Registry),
     2. keine Anzeigestelle schreibt daneben ein EIGENES Gold hin.

   (2) ist der Punkt: (1) allein hält nichts, weil der Drift nie durch Ändern der Konstante entsteht,
   sondern durch ein neues Literal in einer neuen Datei. Geprüft wird deshalb der Farbton jedes Hex-
   Literals, das in einer Zeile mit „legendary/legendär" steht — Grautöne als Nicht-Legendär-Zweig
   eines Ternärs sind erlaubt, ein zweites Gold ist es nicht.
   ============================================================================ */

const src = fileURLToPath(new URL("../src/", import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = `${dir}/${f}`;
  return statSync(p).isDirectory() ? walk(p) : (/\.jsx?$/.test(f) ? [p] : []);
});

/* Kommentare raus, BEVOR gesucht wird — sonst schlägt der Wächter auf der Erklärung an, die ihn begründet
   (die alten Töne stehen in vocab.js als Prosa). Zeilenweise, damit Zeilennummern erhalten bleiben; `//`
   nur, wenn kein `:` davor steht, sonst stirbt jedes `https://`. Die Grenze ist bekannt und reicht hier:
   ein `//` in einem String wäre ein falscher Treffer, in src/ui gibt es keinen. */
const ohneKommentar = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .split("\n").map((z) => z.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");

// Farbton 33..58 Grad, satt und hell genug = Gold/Bernstein. Dieselbe Rechnung, mit der die drei Töne
// gefunden wurden; sie trennt Gold von den Grau-Fallbacks (gesättigt 0) und von Rot/Grün der Fraktionen.
function istGold(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn || mx <= 120 || (mx - mn) / mx <= 0.45) return false;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6)
        : mx === g ? 60 * ((b - r) / (mx - mn) + 2)
                   : 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360;
  return h >= 33 && h <= 58;
}

describe("Legendär-Gold: eine Farbe, drei Deklarationen, keine vierte", () => {
  it("JS-Konstante, CSS-Token und Perk-Registry tragen denselben Wert", () => {
    const css = readFileSync(fileURLToPath(new URL("../src/index.css", import.meta.url)), "utf8");
    const token = (css.match(/--ac-gold:\s*(#[0-9a-fA-F]{6})/) || [])[1];
    expect(token, "--ac-gold fehlt in index.css").toBeTruthy();
    expect(token.toLowerCase(), "--ac-gold weicht von LEGENDARY_GOLD ab").toBe(LEGENDARY_GOLD.toLowerCase());
    expect(RARITY_META.legendary.color.toLowerCase(), "RARITY_META.legendary weicht ab").toBe(LEGENDARY_GOLD.toLowerCase());
  });

  it("keine Anzeigestelle malt „legendär“ mit einem eigenen Gold", () => {
    const treffer = [];
    for (const datei of walk(`${src}ui`)) {
      for (const [i, zeile] of ohneKommentar(readFileSync(datei, "utf8")).split("\n").entries()) {
        if (!/legendary|legendär/i.test(zeile)) continue;
        for (const hex of zeile.match(/#[0-9a-fA-F]{6}/g) || []) {
          if (!istGold(hex)) continue;                                  // Grau/Fraktionsfarbe im Nicht-Legendär-Zweig
          if (hex.toLowerCase() === LEGENDARY_GOLD.toLowerCase()) continue; // richtiger Wert, nur nicht benannt
          treffer.push(`${datei.slice(src.length)}:${i + 1}  ${hex}`);
        }
      }
    }
    expect(treffer, `zweites Gold für dieselbe Seltenheit:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("die drei alten Töne stehen nirgends mehr an einer Legendär-Stelle", () => {
    const alt = ["#e0b845", "#c8962f"]; // Skill-Gold und Gebäude-Gold vor der Zusammenlegung
    const drin = [];
    for (const datei of walk(`${src}ui`)) {
      const s = ohneKommentar(readFileSync(datei, "utf8")).toLowerCase();
      for (const a of alt) if (s.includes(a)) drin.push(`${datei.slice(src.length)} → ${a}`);
    }
    expect(drin, `alter Goldton zurück:\n${drin.join("\n")}`).toEqual([]);
  });

  /* Die dritte Schicht, und sie schließt eine echte Lücke der zweiten: `const rim = leg ? … : c` trägt das
     Wort „legendär" gar nicht, ein neues Literal DORT bliebe unsichtbar. Wer Seltenheit anzeigt, benennt
     sie deshalb — die Liste ist die der Oberflächen, die es tun. Eine WEITERE Oberfläche kommt hier dazu,
     sie ersetzt keine: neue Anzeigen sind der Weg, auf dem der Drift zurückkommt. */
  it("jede Seltenheits-Oberfläche benennt das Gold, statt es hinzuschreiben", () => {
    const FLAECHEN = ["BuildSummary.jsx", "HeldSkills.jsx", "SkillSelect.jsx", "ArchitectScreen.jsx",
      "CardGrid.jsx", "CardDetail.jsx", "PerkSell.jsx", "PerkSelect.jsx", "DevPerkCatalog.jsx",
      "RunDetail.jsx", "GameOver.jsx", "RunStats.jsx"];
    for (const f of FLAECHEN) {
      const s = readFileSync(fileURLToPath(new URL(`../src/ui/${f}`, import.meta.url)), "utf8");
      expect(s, `${f} zeigt Seltenheit, importiert LEGENDARY_GOLD aber nicht`).toContain("LEGENDARY_GOLD");
    }
  });
});
