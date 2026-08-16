import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OptionsModal } from "../src/ui/OptionsModal.jsx";
import { setLocale, SOURCE_LOCALE } from "../src/i18n/index.js";
import { DEFAULT_OPTIONS } from "../src/game/storage.js";

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

  it("rendert die vier Sektionen in der festgelegten Reihenfolge", () => {
    const s = html();
    // Auf die ÜBERSCHRIFTEN ankern (…</h3>): die Chip-Marken tragen dieselben Wörter und stehen weiter oben.
    expect(ascending(orderOf(s, "Allgemein</h3>", "Grafik &amp; Leistung</h3>", "Ton</h3>", "Anzeige</h3>"))).toBe(true);
  });

  it("jede Einstellung sitzt in ihrer Sektion (Zuordnung aus dem Issue)", () => {
    const s = html();
    // Sprache + Haptik unter „Allgemein", vor der Grafik-Sektion.
    const [general, sprache, haptik, graphics] = orderOf(s, "Allgemein</h3>", "Sprache", "Haptik", "Grafik &amp; Leistung</h3>");
    expect(general).toBeLessThan(sprache);
    expect(sprache).toBeLessThan(haptik);
    expect(haptik).toBeLessThan(graphics);
    // Ton-Sektion trägt die drei Ton-Zeilen, danach erst „Anzeige".
    const [ton, stumm, anzeige, zahlen] = orderOf(s, "Ton</h3>", "Ton stumm", "Anzeige</h3>", "Zahlengröße");
    expect(ton).toBeLessThan(stumm);
    expect(stumm).toBeLessThan(anzeige);
    expect(anzeige).toBeLessThan(zahlen);
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

  it("englisch: dieselbe Struktur, übersetzte Marken", () => {
    setLocale("en");
    const s = html();
    expect(ascending(orderOf(s, "General</h3>", "Graphics &amp; performance</h3>", "Sound</h3>", "Display</h3>"))).toBe(true);
    setLocale(SOURCE_LOCALE);
  });
});
