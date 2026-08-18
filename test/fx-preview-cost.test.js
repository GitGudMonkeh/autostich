/* #perf-shopdpr + #perf-shopmount — was die Effekt-Vorschau der Werkstatt kostet.
   -------------------------------------------------------------------------------------------------
   Die Werkstatt verlangte der GPU ein Vielfaches dessen ab, was das Spielen kostet — nicht wegen eines
   Fehlers, sondern weil sie das Brett VERGRÖSSERT zeigt und dabei zwei Dinge tat, die niemand
   entschieden hatte: sie rendert feiner als das Spiel selbst, und sie baute beim Durchklicken je Klick
   eine komplette Bühne auf.

   Zwei Sorten Prüfung, bewusst getrennt:
   1. Der DECKEL wird nachgerechnet (mobileTier.js ist rein, ohne React). Das ist die inhaltliche
      Aussage: die Vorschau rendert höchstens so fein wie das Brett im Spiel — eine Identität, keine
      Geschmacksfrage.
   2. Die VERDRAHTUNG als Quelltext-Ratsche. Beide Nähte fallen lautlos aus: ohne den Deckel wird nur
      der Lüfter lauter, ohne das Entprellen nur das Durchklicken zäh. */
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { DPR_CAP_DESKTOP, previewDprCap, setPreviewSceneScale, dprCap } from "../src/ui/fx/mobileTier.js";
import { BOARD_W, sceneScale } from "../src/ui/fx/previewScale.js";

const jsx = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");

afterEach(() => setPreviewSceneScale(0));   // Modul-Wert ist global — sonst färbt ein Test in den nächsten

describe("#perf-shopdpr — der Deckel ist hergeleitet, nicht geraten", () => {
  it("dreht die Vorschau auf die Gerätepixel-Dichte des Bretts zurück", () => {
    /* Ein Brett-Pixel belegt in der Vorschau `sceneScale` CSS-Pixel. Damit er dort so viele GERÄTE-
       Pixel bekommt wie im Spiel (`DPR_CAP_DESKTOP`), muss die Auflösung durch den Maßstab geteilt
       werden. Genau das ist die Formel — und deshalb ist das Produkt aus beidem der Deckel des Spiels. */
    for (const previewW of [1244, 860, 1000, 2000]) {
      const s = sceneScale(previewW);
      expect(previewDprCap(s) * s).toBeCloseTo(DPR_CAP_DESKTOP, 6);
    }
  });

  it("greift nur, wenn die Vorschau wirklich vergrößert — sonst gar nicht", () => {
    // Am Handy ist der Rahmen schmaler als das Brett; `sceneScale` deckelt dort auf 1 (vergrößert nur).
    expect(sceneScale(324)).toBe(1);
    expect(previewDprCap(sceneScale(324))).toBe(Infinity);
    expect(previewDprCap(0)).toBe(Infinity);
    expect(previewDprCap(NaN)).toBe(Infinity);
    // Genau auf Brettbreite: Maßstab 1 → kein Deckel (die Vorschau IST dann das Brett).
    expect(previewDprCap(sceneScale(BOARD_W))).toBe(Infinity);
  });

  it("dprCap nimmt den Deckel mit und lässt sich sauber zurücksetzen", () => {
    const ohne = dprCap(false);
    setPreviewSceneScale(sceneScale(1244));            // ~1,86 → Deckel ~1,07
    expect(dprCap(false)).toBeLessThanOrEqual(ohne);
    expect(dprCap(false)).toBeLessThanOrEqual(previewDprCap(sceneScale(1244)) + 1e-9);
    setPreviewSceneScale(0);
    expect(dprCap(false)).toBe(ohne);                  // Verlassen der Werkstatt stellt her, was war
  });

  it("ist in der Bühne verdrahtet — samt Aufräumen", () => {
    /* Der Wert ist modulweit. Bleibt er beim Verlassen stehen, rendert die nächste Bühne im Spiel zu
       grob — das sähe man erst viel später und nirgends in einem Test. */
    expect(jsx).toMatch(/import \{ setPreviewSceneScale \}/);
    expect(jsx).toMatch(/setPreviewSceneScale\(previewW > 0 \? sceneScale\(previewW\) : 0\)/);
    expect(jsx).toMatch(/return \(\) => setPreviewSceneScale\(0\)/);
  });
});

describe("#perf-shopmount — die Szene mountet erst, wenn die Auswahl steht", () => {
  it("hält die Verzögerung fest und hängt die Bühne daran", () => {
    /* Gemessen: fünf Klicks im 40-ms-Takt bauen 2 statt 5–6 Bühnen auf; bei 400 ms Abstand kommt
       weiter jede einzelne. Wer `sceneFx` gegen `fx` zurücktauscht, bekommt das alte Verhalten
       zurück, ohne dass irgendetwas rot wird. */
    expect(jsx).toMatch(/export const FX_MOUNT_DELAY_MS = 150;/);
    expect(jsx).toMatch(/const sceneFx = useSettled\(previewW > 0 \? fx : null, FX_MOUNT_DELAY_MS\)/);
    expect(jsx).toMatch(/\{sceneFx && <GlobalFxScenePreview key=\{sceneFx\.key\} fx=\{sceneFx\}/);
    // Der ERSTE Aufbau darf nicht warten — sonst steht beim Öffnen 150 ms lang eine leere Bühne.
    expect(jsx).toMatch(/if \(shown == null\) \{ setShown\(value\); return undefined; \}/);
  });

  it("lässt Name, Preis und Aktionsknopf an der sofortigen Auswahl", () => {
    // Die Chips und der Knopf hängen weiter an `fx`; nur die teure Bühne wartet.
    expect(jsx).toMatch(/<PanelChip corner="tl">\{fx\.name\}<\/PanelChip>/);
  });
});
