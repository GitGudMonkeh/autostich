/* #skillart — Embleme der Skill-Wahl (Desktop ab 1400 px).
   -------------------------------------------------------------------------------------------------
   Drei Sorten Prüfung, bewusst getrennt:
   1. Die ZUORDNUNG wird nachgerechnet: `artIdFromFile` ist rein, also wird sie mit den echten
      Dateinamen gefüttert. Die Verbindung Bild ↔ Skill hängt allein am Dateinamen — genau deshalb
      muss sie geprüft werden, statt sich darauf zu verlassen, dass sie „offensichtlich" stimmt.
   2. Die VOLLSTÄNDIGKEIT je Archetyp: jeder Blitz-Skill hat sein Emblem, und es gibt keine Datei
      ohne Skill. Ein neuer Blitz-Skill fällt damit hier auf, nicht am Bildschirm.
   3. Die VERDRAHTUNG als Quelltext-Ratsche über SkillSelect.jsx + index.css (das Projekt hat kein
      Component-Test-Setup, s. test/fx-panel.test.js). Beide Nähte fallen lautlos aus: ohne das
      `wide`-Gate lädt das Handy 21 Bilder, die es nie zeigt; ohne `mix-blend-mode: screen` steht um
      jedes Emblem ein schwarzer Kasten. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { artIdFromFile } from "../src/ui/skillArt.js";
import { SKILL_DEFS } from "../src/game/skills.js";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const dir = (p) => readdirSync(new URL(`../src/${p}`, import.meta.url));
const jsx = src("ui/SkillSelect.jsx");
const css = src("index.css");

describe("#skillart — Zuordnung über den Dateinamen", () => {
  it("trennt ID und Lesehilfe an der Schreibweise, nicht an der Position", () => {
    expect(artIdFromFile("SK_LIGHTNING_01_blitzableiter.webp")).toBe("SK_LIGHTNING_01");
    // Die legendären IDs tragen einen Buchstaben im letzten Segment — über die Position (drittes
    // Segment) ginge das noch gut, über „alles vor dem ersten Kleinbuchstaben" auch. Beides muss.
    expect(artIdFromFile("SK_LIGHTNING_L01_donnergott.webp")).toBe("SK_LIGHTNING_L01");
    expect(artIdFromFile("SK_LIGHTNING_12_breitenbeschleuniger.webp")).toBe("SK_LIGHTNING_12");
  });

  it("gibt null zurück, statt aus einem Fremdnamen eine ID zu erfinden", () => {
    expect(artIdFromFile("README.md")).toBeNull();
    expect(artIdFromFile("blitzableiter.webp")).toBeNull();
    expect(artIdFromFile("SK_LIGHTNING_01.webp")).toBeNull(); // ohne Lesehilfe — Muster nicht erfüllt
  });
});

describe("#skillart — Vollständigkeit", () => {
  const files = dir("assets/skills/lightning").filter((f) => f.endsWith(".webp"));
  const haveIds = new Set(files.map(artIdFromFile));
  const lightningIds = Object.values(SKILL_DEFS)
    .filter((s) => s.archetype === "lightning")
    .map((s) => s.id);

  it("kennt überhaupt Blitz-Skills (sonst wäre der Test still grün)", () => {
    expect(lightningIds.length).toBeGreaterThanOrEqual(21);
  });

  it("jeder Blitz-Skill hat ein Emblem", () => {
    const fehlt = lightningIds.filter((id) => !haveIds.has(id));
    expect(fehlt, `ohne Emblem: ${fehlt.join(", ")}`).toEqual([]);
  });

  it("jedes Emblem gehört zu einem Skill — keine Leiche im Ordner", () => {
    const alle = new Set(Object.values(SKILL_DEFS).map((s) => s.id));
    const verwaist = [...haveIds].filter((id) => !alle.has(id));
    expect(verwaist, `ohne Skill: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jeder Dateiname erfüllt das Muster (kein stiller Ausfall über null)", () => {
    expect(files.filter((f) => artIdFromFile(f) === null)).toEqual([]);
  });
});

describe("#skillart — Verdrahtung", () => {
  it("das Emblem hängt am `wide`-Gate, nicht an CSS", () => {
    // Ohne diese Zeile rendert das <img> auch am Handy — der Browser lädt dann 21 Bilder für eine
    // Ansicht, die sie gar nicht zeigt.
    expect(jsx).toContain("const art = wide ? skillArt(id) : null;");
  });

  it("die Karte ohne Emblem behält ihren Baum (Handy bleibt unberührt)", () => {
    // Der Zweig ohne Bild darf KEINEN zusätzlichen Behälter einziehen, sonst verschiebt sich die
    // Geometrie der Handy-Fassung, die niemand angefasst hat.
    expect(jsx).toMatch(/\) : \(<>\{badges\}\{title\}<\/>\)\}/);
  });

  it("das Bild trägt die Klasse, die den schwarzen Grund verschwinden lässt", () => {
    expect(jsx).toContain('className="sk-em"');
    const regel = css.slice(css.indexOf(".sk-em {"), css.indexOf(".sk-em {") + 200);
    expect(regel).toContain("mix-blend-mode: screen");
    expect(regel).toContain("width: 64px");
  });

  it("das Emblem ist für Screenreader unsichtbar — der Skillname steht daneben", () => {
    expect(jsx).toContain('alt="" aria-hidden="true"');
  });
});

describe("#skillart — kein Emblem als data-URI im Bundle", () => {
  /* Vites Standardgrenze (4 kB) hätte fünf der 21 Blitz-Embleme ins JS inline gezogen — gemessen im
     Produktionsbuild. Damit lädt sie JEDES Handy bei jedem Seitenaufruf mit, obwohl sie erst ab 1400 px
     gerendert werden. Der `wide`-Gate oben wäre also zur Hälfte ausgehebelt, ohne dass man es sieht. */
  it("die Grenze schaltet für Skill-Embleme auf „nie inlinen“, sonst bleibt sie unangetastet", async () => {
    const mod = await import("../vite.config.js");
    const limit = mod.default({ command: "build" }).build.assetsInlineLimit;
    expect(typeof limit).toBe("function");
    expect(limit("/repo/src/assets/skills/lightning/SK_LIGHTNING_01_blitzableiter.webp")).toBe(false);
    expect(limit("C:\\repo\\src\\assets\\skills\\fire\\SK_FIRE_01_glut.webp")).toBe(false);
    // Alles andere entscheidet Vite weiter selbst — `undefined` heißt genau das.
    expect(limit("/repo/src/assets/cards/decks_player/deck_blitz/front.webp")).toBeUndefined();
  });
});
