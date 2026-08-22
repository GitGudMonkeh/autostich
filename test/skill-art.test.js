/* #skillart — Embleme der Skill-Wahl (Desktop ab 1280 px).
   -------------------------------------------------------------------------------------------------
   Drei Sorten Prüfung, bewusst getrennt:
   1. Die ZUORDNUNG wird nachgerechnet: `artIdFromFile` ist rein, also wird sie mit den echten
      Dateinamen gefüttert. Die Verbindung Bild ↔ Skill hängt allein am Dateinamen — genau deshalb
      muss sie geprüft werden, statt sich darauf zu verlassen, dass sie „offensichtlich" stimmt.
   2. COMPLETENESS per archetype: every skill has an emblem, and every file belongs to a skill.
      A new or missing skill-art file fails here instead of first appearing as a broken card.
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

const analyzeLot = (files, skillIds) => {
  const expectedIds = new Set(skillIds);
  const parsed = files.map((file) => ({ file, id: artIdFromFile(file) }));
  const counts = new Map();

  for (const { id } of parsed) {
    if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return {
    missing: skillIds.filter((id) => !counts.has(id)),
    misplaced: parsed
      .filter(({ id }) => id !== null && !expectedIds.has(id))
      .map(({ file }) => file),
    invalid: parsed.filter(({ id }) => id === null).map(({ file }) => file),
    duplicateIds: [...counts]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  };
};

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
  const archetypes = ["lightning", "fire", "ice", "plant"];

  it("rejects a registered foreign-archetype ID in the wrong lot", () => {
    const report = analyzeLot(
      ["SK_FIRE_01_glut.webp", "SK_ICE_01_anfrieren.webp"],
      ["SK_FIRE_01"],
    );

    expect(report.misplaced).toEqual(["SK_ICE_01_anfrieren.webp"]);
  });

  it("rejects two filenames that parse to the same registered ID", () => {
    const report = analyzeLot(
      ["SK_FIRE_01_glut.webp", "SK_FIRE_01_andere-lesehilfe.webp"],
      ["SK_FIRE_01"],
    );

    expect(report.duplicateIds).toEqual(["SK_FIRE_01"]);
  });

  for (const archetype of archetypes) {
    describe(archetype, () => {
      const files = dir(`assets/skills/${archetype}`).filter((f) => f.endsWith(".webp"));
      const skillIds = Object.values(SKILL_DEFS)
        .filter((s) => s.archetype === archetype)
        .map((s) => s.id);
      const report = analyzeLot(files, skillIds);

      it("retains the established registry baseline so the check cannot pass vacuously", () => {
        expect(skillIds.length).toBeGreaterThanOrEqual(21);
      });

      it("has one delivery emblem for every registered skill", () => {
        expect(report.missing, `missing emblems: ${report.missing.join(", ")}`).toEqual([]);
      });

      it("contains no registered emblem from another archetype", () => {
        expect(
          report.misplaced,
          `misplaced emblems: ${report.misplaced.join(", ")}`,
        ).toEqual([]);
      });

      it("round-trips every delivery filename through the live parser", () => {
        expect(report.invalid, `invalid filenames: ${report.invalid.join(", ")}`).toEqual([]);
      });

      it("contains no duplicate delivery ID", () => {
        expect(
          report.duplicateIds,
          `duplicate delivery IDs: ${report.duplicateIds.join(", ")}`,
        ).toEqual([]);
      });
    });
  }
});

describe("#skillart — Verdrahtung", () => {
  it("das Emblem hängt am `wide`-Gate, nicht an CSS", () => {
    // Ohne diese Zeile rendert das <img> auch am Handy — der Browser lädt dann 21 Bilder für eine
    // Ansicht, die sie gar nicht zeigt.
    expect(jsx).toContain("const art = wide ? skillArt(id) : null;");
  });

  it("die Karte ohne Bild behält ihren Baum (Handy bleibt unberührt)", () => {
    // Ohne Bild wird weder ein Element noch eine Klasse hinzugefügt: `art` schaltet BEIDES.
    expect(jsx).toContain('${art ? " sk-offer-art" : ""}');
    expect(jsx).toContain("{art && <img");
  });

  it("der Streifen trägt die Klasse, die den schwarzen Grund verschwinden lässt", () => {
    expect(jsx).toContain('className="sk-strip"');
    const regel = css.slice(css.indexOf(".sk-strip {"), css.indexOf(".sk-strip {") + 420);
    expect(regel).toContain("mix-blend-mode: screen");
    expect(regel).toContain("height: 210px");          // am Regler gewählte Zonenhöhe
    expect(regel).toContain("object-fit: cover");      // „füllend"
    expect(regel).toContain("mask-image: linear-gradient(180deg, #000 62%, transparent)");
  });

  it("der Text steht ÜBER dem Streifen, nicht darunter", () => {
    // Absolut Positioniertes malt über nicht-positionierten Fluss-Inhalt. Ohne diese Regel liegt die
    // Beschreibung unter dem Bild — und man sieht es nur bei Motiven, die unten hell sind.
    expect(css).toContain(".sk-offer-art > *:not(img) { position: relative; }");
    const regel = css.slice(css.indexOf(".sk-offer-art {"), css.indexOf(".sk-offer-art {") + 220);
    expect(regel).toContain("overflow: hidden");
    expect(regel).toContain("padding-top: 176px");
  });

  it("das Emblem ist für Screenreader unsichtbar — der Skillname steht daneben", () => {
    expect(jsx).toContain('alt="" aria-hidden="true"');
  });
});

describe("#skillart — der Bloom ist gebacken, nicht gerechnet", () => {
  it("die Auslieferung entsteht aus den Mastern über das Skript, mit den gewählten Werten", () => {
    const build = readFileSync(new URL("../scripts/skill-art-build.py", import.meta.url), "utf8");
    // Am Gerät gewählt (19.08.2026). Ändert sich einer der Werte, muss das Bild neu gebacken werden —
    // deshalb stehen sie hier, nicht nur im Skript.
    expect(build).toContain("BLOOM_CSS = 16");
    expect(build).toContain("BLOOM_STRENGTH = 0.70");
    expect(build).toContain("BLOOM_SAT = 2.00");
    // Der Radius gilt für die ANZEIGE (277 px breit) und muss auf die Dateigröße umgerechnet werden.
    expect(build).toContain("BLOOM_CSS * SIZE / STRIP_W");
  });

  it("das Bild bringt sein Leuchten mit — im Stylesheet steht KEIN Filter auf dem Streifen", () => {
    const regel = css.slice(css.indexOf(".sk-strip {"), css.indexOf(".sk-strip {") + 420);
    expect(regel).not.toContain("filter:");
    expect(regel).not.toContain("blur(");
  });
});

describe("#skillart — kein Emblem als data-URI im Bundle", () => {
  /* Vites Standardgrenze (4 kB) hätte fünf der 21 Blitz-Embleme ins JS inline gezogen — gemessen im
     Produktionsbuild. Damit lädt sie JEDES Handy bei jedem Seitenaufruf mit, obwohl sie erst ab 1280 px
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
