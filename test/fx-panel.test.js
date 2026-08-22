/* #fx-panel + #vorschau-brett — der Effekte-Reiter der Deck-Werkstatt ab 1280 px.
   -------------------------------------------------------------------------------------------------
   Zwei Sorten Prüfung, bewusst getrennt:
   1. Der MASSSTAB wird nachgerechnet (previewScale.js ist rein, ohne React) — das ist die Aussage,
      um die es inhaltlich geht: die Karte nimmt in der Vorschau denselben Anteil ein wie auf dem Brett.
   2. Die VERDRAHTUNG als Quelltext-Ratsche über CustomizeScreen.jsx + index.css. Das Projekt hat kein
      Component-Test-Setup (s. test/global-board.test.js, test/guide-desktop.test.js) — geprüft wird
      deshalb, dass die vier Nähte überhaupt noch da sind, die den Umbau tragen. Jede von ihnen fällt
      lautlos aus, wenn jemand sie kürzt: das Loch käme zurück, die Handy-Fassung bräche, oder das
      Panel liefe unten aus dem Scroller. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BOARD_W, BOARD_H, CARD_H, BOARD_RATIO_CSS, sceneScale, kartenAnteil } from "../src/ui/fx/previewScale.js";
import { DESKTOP_AT } from "./desktopBreakpoint.js";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const jsx = src("ui/CustomizeScreen.jsx");
const css = src("index.css");
// Nur der 1280er-Block — sonst prüfte man Regeln, die am Handy stehen.
const desktop = css.slice(css.indexOf(DESKTOP_AT));

describe("#vorschau-brett — der Maßstab, nachgerechnet", () => {
  it("die Karte hat in der Vorschau denselben Anteil wie auf dem Brett (jede Desktop-Breite)", () => {
    // 41,5 % — gemessen im laufenden Spiel: Karte 144 px auf einem 668 × 347 großen Brett.
    const imSpiel = CARD_H / BOARD_H;
    for (const w of [BOARD_W, 724, 860, 1244, 1600, 2400]) {
      expect(kartenAnteil(w), `Rahmenbreite ${w}`).toBeCloseTo(imSpiel, 6);
    }
  });

  it("der Maßstab vergrößert nur — die Handy-Fassung bleibt bei 1:1", () => {
    // Gemessene Rahmenbreiten am Handy: 324 px (390er Viewport). Ohne den Deckel ergäbe die reine
    // Regel dort 0,49 und damit eine 70-px-Karte statt der bisherigen 144.
    expect(sceneScale(324)).toBe(1);
    expect(sceneScale(BOARD_W - 1)).toBe(1);
    expect(sceneScale(BOARD_W)).toBe(1);
    expect(sceneScale(1244)).toBeCloseTo(1244 / BOARD_W, 6);
  });

  it("unbrauchbare Messwerte fallen auf 1:1 zurück statt die Szene zu zerlegen", () => {
    // Vor der ersten ResizeObserver-Meldung steht die Breite auf 0.
    for (const bad of [0, -5, NaN, null, undefined, "breit"]) expect(sceneScale(bad)).toBe(1);
  });

  it("das Brettverhältnis ist 1,93:1 — NICHT die 2,5:1 des Spielfeld-Bildes", () => {
    // Das Brett schneidet das 1600 × 640-JPG bereits zu. Eine Vorschau im Bildformat zeigt einen
    // Ausschnitt, den es im Spiel nirgends gibt.
    expect(BOARD_W / BOARD_H).toBeCloseTo(1.925, 3);
    expect(BOARD_W / BOARD_H).not.toBeCloseTo(2.5, 1);
  });
});

describe("#vorschau-brett — die Zahlen stehen nur an EINER Stelle", () => {
  it("index.css liest das Verhältnis als Variable, statt es abzutippen", () => {
    expect(desktop).toMatch(/\.cz-fxpreview\s*\{[^}]*aspect-ratio:\s*var\(--bf-ratio\)/);
    // Gegenprobe: keine hart notierte Brett-Zahl im Stylesheet.
    expect(desktop).not.toMatch(new RegExp(`aspect-ratio:\\s*${BOARD_W}`));
  });

  it("CustomizeScreen setzt --bf-ratio aus dem Modul und misst den Rahmen mit einem ResizeObserver", () => {
    expect(jsx).toMatch(/"--bf-ratio":\s*BOARD_RATIO_CSS/);
    expect(jsx).toMatch(/new ResizeObserver/);
    // Der Maßstab kommt aus der GEMESSENEN Breite, nicht aus einer Media-Query.
    expect(jsx).toMatch(/SceneScaleCtx\.Provider\s+value=\{sceneScale\(previewW\)\}/);
    expect(BOARD_RATIO_CSS).toBe(`${BOARD_W} / ${BOARD_H}`);
  });

  it("keine Szene setzt ihren Karten-Slot mehr als Literal", () => {
    // Sechs Szenen trugen `width: 104, height: 144` je einzeln — die Maßstabsfrage wäre damit
    // sechsmal zu beantworten gewesen. Jetzt geht alles über CardSlot bzw. den Kontext.
    expect(jsx).not.toMatch(/width:\s*104,\s*height:\s*144/);
    expect((jsx.match(/<CardSlot/g) || []).length).toBeGreaterThanOrEqual(6);
  });
});

describe("#fx-panel — zwei Panels, beide enden am Inhalt", () => {
  it("Bühne und Liste sind eigene Panels und strecken sich NICHT auf Rasterhöhe", () => {
    // Ohne `align-self: start` stünden rechts wieder 568 px leeres Panel unter fünf Zeilen
    // (69 % der Spalte, gemessen auf 1920 × 1080).
    const regel = desktop.match(/\.cz-stage,\s*\.cz-fxside\s*\{([^}]*)\}/);
    expect(regel, ".cz-stage/.cz-fxside-Regel fehlt").toBeTruthy();
    expect(regel[1]).toMatch(/align-self:\s*start/);
    expect(regel[1]).toMatch(/border-radius:\s*14px/);
    expect(regel[1]).toMatch(/background:\s*linear-gradient/);
  });

  it("die Spaltenbreite ist dieselbe 520 wie beim Pack-Detail — und die schmale Spur steht LINKS", () => {
    // Die Aufteilung stimmte längst — es fehlte nur die Fassung. Läuft eine der beiden Zahlen weg,
    // stehen die zwei Reiter wieder unterschiedlich breit nebeneinander.
    // #panelseite: die 520er Spur ist seit 18.08.2026 die ERSTE. Alle anderen gerahmten Screens setzen
    // ihre schmale Spalte links; dreht eine der beiden Zeilen zurück, stehen die Reiter der Werkstatt
    // wieder spiegelverkehrt zueinander — und einer davon gegen den Rest des Menüs.
    const fx = desktop.match(/\.cz-mainscroll:has\(\.cz-stage\)\s*\{([^}]*)\}/);
    const pack = desktop.match(/\.cz-split\s*\{([^}]*)\}/);
    expect(fx, "Effekte-Raster fehlt").toBeTruthy();
    expect(pack, "Pakete-Raster fehlt").toBeTruthy();
    expect(fx[1]).toMatch(/grid-template-columns:\s*520px\s*minmax\(0,\s*1fr\)/);
    expect(pack[1]).toMatch(/grid-template-columns:\s*520px\s*minmax\(0,\s*1fr\)/);
  });

  it("#panelseite — die schmale Spalte steht in Spur 1, und BEIDE Kinder nennen ihre Zeile", () => {
    // `grid-row: 1` ist Pflicht, nicht Zierde: die Auto-Platzierung arbeitet vorwärts. Der Katalog steht
    // im DOM zuerst und belegt Spur 2; die Detailspalte will danach in Spur 1 — das liegt hinter dem
    // Cursor, also legt das Raster eine zweite ZEILE an und das Detail rutscht unter den Katalog.
    // Genau so gemessen, bevor die Zeilen hier standen.
    expect(desktop).toMatch(/\.cz-main\s*\{[^}]*grid-column:\s*2;\s*grid-row:\s*1/);
    expect(desktop).toMatch(/\.cz-side\s*\{[^}]*grid-column:\s*1;\s*grid-row:\s*1/);
    expect(desktop).toMatch(/\.cz-stage\s*\{[^}]*grid-column:\s*2/);
    expect(desktop).toMatch(/\.cz-fxside\s*\{\s*grid-column:\s*1;\s*\}/);
    // Ohne Detailspalte gibt es nur EINE Spur — sonst erfände `.cz-main { grid-column: 2 }` eine zweite.
    expect(desktop).toMatch(/\.cz-split:not\(:has\(\.cz-side\)\)\s*>\s*\.cz-main\s*\{[^}]*grid-column:\s*1/);
  });

  it("der Wrapper gibt seine Panel-Optik ab — sonst läge ein dritter Rahmen um beide", () => {
    expect(desktop).toMatch(/\.cz-main:has\(\.cz-stage\)\s*\{[^}]*background:\s*none/);
    expect(desktop).toMatch(/\.cz-main:has\(\.cz-stage\)\s*>\s*\.as-ring-run\s*\{[^}]*display:\s*none/);
  });

  it("die Bühne neutralisiert ihr inline gesetztes `top`", () => {
    // FALLE, die beim Bau zugeschnappt ist: die Vorgängerfassung stand auf `position: static` und
    // `static` IGNORIERT das inline gesetzte `top` (der Sticky-Abstand unter dem Kopf, 135 px).
    // `relative` — nötig, damit der Ring an der Bühne sitzt — tut das nicht: ohne `top: auto` rutschte
    // das Panel um 135 px nach unten und lief unten aus dem Scroller (gemessen: 62 px auf 1536 × 791).
    const regel = desktop.match(/\.cz-stage\s*\{([^}]*)\}/);
    expect(regel, ".cz-stage-Regel fehlt").toBeTruthy();
    expect(regel[1]).toMatch(/position:\s*relative\s*!important/);
    expect(regel[1]).toMatch(/top:\s*auto\s*!important/);
  });
});

describe("#fx-panel — die Handy-Fassung bleibt unberührt", () => {
  it("`cz-fxside` ist unterhalb 1280 px nur eine Klammer", () => {
    // Ohne `display: contents` bekäme die Handy-Fassung eine zusätzliche Box um Liste und Fußnote.
    // Nachgemessen wurde beides: Geometrie an sechs Messpunkten identisch, drei von vier Reitern
    // bitidentisch (der vierte weicht nur um das laufende Pixi-Bild ab).
    const basis = css.slice(0, css.indexOf(DESKTOP_AT));
    expect(basis).toMatch(/\.cz-fxside[^{]*\{\s*display:\s*contents/);
  });

  it("die Kategorie-Reiter werden EINMAL gebaut und an einer von zwei Stellen gerendert", () => {
    // Zwei gerenderte Reiterzeilen (eine per CSS versteckt) hieße zwei Fokus-Reihenfolgen im Baum.
    expect((jsx.match(/className="cz-fxcats/g) || []).length).toBe(1);
    expect(jsx).toMatch(/\{!wide && cats\}/);
    expect(jsx).toMatch(/\{wide && cats\}/);
  });
});
