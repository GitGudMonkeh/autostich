import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OptionsModal } from "../src/ui/OptionsModal.jsx";
import { setLocale, SOURCE_LOCALE, READY_LOCALE_IDS } from "../src/i18n/index.js";
// exp: English is inactive on the playground (LOCALES in index.js) — the English render-checks sleep until it is ready again.
const EN_OFF = !READY_LOCALE_IDS.includes("en");
import { readFileSync } from "node:fs";
import { DEFAULT_OPTIONS } from "../src/game/storage.js";
import { DESKTOP_AT } from "./desktopBreakpoint.js";

/* #395: Das Optionen-Overlay ist in vier Sektionen mit klebender Überschrift gegliedert.
   Der Test hält die REIHENFOLGE und die Zuordnung fest — beides ist im Issue festgelegt und
   wäre beim nächsten Umbau sonst still verschiebbar. Gerendert wird statisch (kein Layout),
   geprüft wird deshalb die Dokument-Reihenfolge, nicht die Optik. */
const html = () => renderToStaticMarkup(
  createElement(OptionsModal, { options: { ...DEFAULT_OPTIONS }, onChange: () => {}, onClose: () => {} }),
);
const orderOf = (s, ...needles) => needles.map((n) => s.indexOf(n));
const ascending = (xs) => xs.every((v, i) => v >= 0 && (i === 0 || v > xs[i - 1]));

describe("Optionen-Overlay — Sektionen (#395)", () => {
  beforeEach(() => setLocale(SOURCE_LOCALE));

  it("rendert die vier Sektionen in der festgelegten DOM-Reihenfolge", () => {
    const s = html();
    // Auf die ÜBERSCHRIFTEN ankern (…</h3>): die Chip-Marken tragen dieselben Wörter und stehen weiter oben.
    expect(ascending(orderOf(s, "Allgemein</h3>", "Grafik &amp; Leistung</h3>", "Ton</h3>", "HUD &amp; Text</h3>"))).toBe(true);
  });

  /* #optionen-redesign: Ab 1280 px steht „Ton" ÜBER „Grafik & Leistung". Das macht `order` im
     Stylesheet und NICHT das DOM — die schmale Fassung ist abgenommen und bleibt Zeile für Zeile,
     wie sie war. Genau diese Trennung hält der Test darüber (DOM unverändert) zusammen mit dem hier
     (die Umkehr existiert, und sie existiert im Stylesheet). Fiele einer von beiden weg, wäre die
     Reihenfolge wieder an einer Stelle, an der sie das Handy mitzieht. */
  it("die Umkehr Ton/Grafik steht im Stylesheet, nicht im DOM", () => {
    const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
    const desk = css.slice(css.indexOf(DESKTOP_AT));
    const ton = desk.match(/\.op-col2 > \.op-sec\[data-sec="sound"\]\s*\{([^}]*)\}/);
    const gfx = desk.match(/\.op-col2 > \.op-sec\[data-sec="graphics"\]\s*\{([^}]*)\}/);
    expect(ton, "die order-Regel fuer die Ton-Sektion fehlt").toBeTruthy();
    expect(gfx, "die order-Regel fuer die Grafik-Sektion fehlt").toBeTruthy();
    const n = (m) => Number((m[1].match(/order:\s*(\d+)/) || [])[1]);
    expect(n(ton), "Ton steht am Desktop nicht mehr oben").toBeLessThan(n(gfx));
  });

  it("jede Einstellung sitzt in ihrer Sektion (Zuordnung aus dem Issue)", () => {
    const s = html();
    // Sprache + Haptik unter „Allgemein", vor der Grafik-Sektion. exp: die Sprachzeile rendert nur,
    // solange es eine Wahl gibt (READY_LOCALES > 1) — mit einer aktiven Sprache fehlt sie im DOM.
    const [general, haptik, graphics] = orderOf(s, "Allgemein</h3>", "Haptik", "Grafik &amp; Leistung</h3>");
    expect(general).toBeLessThan(haptik);
    expect(haptik).toBeLessThan(graphics);
    if (READY_LOCALE_IDS.length > 1) {
      const [, sprache] = orderOf(s, "Allgemein</h3>", "Sprache");
      expect(general).toBeLessThan(sprache);
      expect(sprache).toBeLessThan(haptik);
    } else {
      expect(s).not.toContain("Sprache");
    }
    /* Ton-Sektion trägt die drei Ton-Zeilen, danach erst „HUD & Text". Angekert wird auf die
       Effekt-Lautstärke statt auf die erste Zeile: die heißt seit #optionen-redesign „Ton" und damit
       genauso wie ihre Sektion — ein Anker, der beides trifft, prüft nichts. */
    const [ton, sfx, hud, zahlen] = orderOf(s, "Ton</h3>", "Effekt-Lautstärke", "HUD &amp; Text</h3>", "Zahlengröße");
    expect(ton).toBeLessThan(sfx);
    expect(sfx).toBeLessThan(hud);
    expect(hud).toBeLessThan(zahlen);
  });

  it("Sprung-Chips: eine Marke je Sektion, die erste ist aktiv", () => {
    const s = html();
    expect((s.match(/as-chip /g) || []).length).toBe(4);
    expect((s.match(/as-chip-on/g) || []).length).toBe(1); // nur „Allgemein" beim Öffnen
    expect(s).toContain("Grafik<"); // Chip nutzt die KURZE Marke, nicht den Sektionstitel
  });

  it("die Überschriften kleben (sticky top-0) — sonst verlöre man beim Scrollen den Bereich", () => {
    const s = html();
    expect((s.match(/sticky top-0/g) || []).length).toBe(4);
  });

  it.skipIf(EN_OFF)("englisch: dieselbe Struktur, übersetzte Marken", () => {
    setLocale("en");
    const s = html();
    expect(ascending(orderOf(s, "General</h3>", "Graphics &amp; performance</h3>", "Sound</h3>", "HUD &amp; Text</h3>"))).toBe(true);
    setLocale(SOURCE_LOCALE);
  });
});
