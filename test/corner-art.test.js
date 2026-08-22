/* #cornerart — corner ornaments of the three selection card heads (desktop, from 1280 px).
   -------------------------------------------------------------------------------------------------
   Built on the pattern of test/skill-art.test.js and test/perk-art.test.js, with THREE kinds of check
   those two do not have, because this lot has three properties they do not:

   1. The MAPPING is recomputed — the parser gets real filenames. Image ↔ key hangs on the filename.
   2. COMPLETENESS in both directions: every archetype and the perk panel has an ornament, and no
      file belongs to nothing.
   3. THE ZONE IS A CROSS-FILE NUMBER. The check with the most teeth. The bloom radius is baked by
      dividing an authored CSS length by the zone WIDTH (`scripts/skill-art-build.py`, `strip_w=300`),
      and the zone width is declared a second time in `src/index.css` as `.co-corner { width: … }`.
      If those drift apart, every corner file ships a bloom computed for a width it is not drawn at —
      and nothing else in the suite would notice, because each file alone still says something true.
   4. THE BAKE/DISPLAY SEPARATION. The other Phase-2 lots bake their light alignment INTO the pixels;
      this one carries it as a display opacity instead. Doing both would dim the set roughly
      hundredfold and read as a missing image rather than as a bug.
   5. LEVEL AGAINST BALANCE. `CORNER_OPACITY` is the measured balance BETWEEN the lots; `CORNER_GAIN`
      is the owner's single loudness decision. The guard therefore checks the RATIOS rather than the
      absolute opacities, so the level can move without anything here having to be rewritten — and so
      that a change which quietly edits ONE lot's factor still fails.
   6. The WIRING as a source-text ratchet over CardCorners.jsx, the three screens and index.css (the
      project has no component-test setup, see test/fx-panel.test.js).

   On 6, explicitly: a source-text ratchet checks the spelling, not the picture. That the ornament
   LOOKS right is not something this file can know — that is the V3 visual gate
   (docs/engineering/task-lifecycle.md §8). Green here means the seam is there, not that it sits well.

   LANGUAGE: this file is English while its three sibling art tests are German. `AGENTS.md`
   (*Language policy*) puts new engineering material, test descriptions included, in English; the
   German siblings are the older spelling and are deliberately left as written rather than translated.
   The `#cornerart` marker, not the language, is what ties the family together. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { cornerArtIdFromFile, cornerArt, cornerOpacity, cornerBalance, isFiligree,
         CORNER_OPACITY, CORNER_GAIN, CORNER_PERK } from "../src/ui/cornerArt.js";
import { ARCHETYPE_ORDER } from "../src/game/skills.js";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = src("index.css");
const skillJsx = src("ui/SkillSelect.jsx");
const perkJsx = src("ui/PerkSelect.jsx");
const legJsx = src("ui/LegendarySelect.jsx");
const cornersJsx = src("ui/CardCorners.jsx");
const buildPy = readFileSync(new URL("../scripts/skill-art-build.py", import.meta.url), "utf8");

const FILES = readdirSync(new URL("../src/assets/corners", import.meta.url));
const MASTERS = readdirSync(new URL("../docs/art/corners", import.meta.url)).filter((f) => f.endsWith(".webp"));
const KEYS = [...ARCHETYPE_ORDER, CORNER_PERK];

/* A rule body, isolated. Every CSS assertion reads THIS and not the whole stylesheet — a match
   anywhere in a 5000-line file would also match a comment that merely mentions the property, which
   is the failure mode `AGENTS.md` warns about under the ratchet hazard. */
const ruleBody = (selector) => {
  const i = css.indexOf(`\n${selector} {`);
  expect(i, `no rule "${selector}" in index.css`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};
const coCorner = ruleBody(".co-corner");
const coFil = ruleBody(".co-corner-fil");
const cornersLot = buildPy.slice(buildPy.indexOf('LOTS["corners"] = Lot('));
/* The corners lot declaration, bracketed by BALANCING parentheses rather than by looking for a
   closing token. An earlier version searched for "})" — correct only while the lot happened to end
   with a dict argument, and when that argument was dropped the slice ran on for hundreds of lines
   and swallowed a `light=` from an unrelated lot. A guard that silently widens its own scope is
   worse than no guard: it stays green for the wrong reason. */
const cornersDecl = (() => {
  const open = cornersLot.indexOf("(");
  let depth = 0;
  for (let i = open; i < cornersLot.length; i++) {
    if (cornersLot[i] === "(") depth++;
    else if (cornersLot[i] === ")" && --depth === 0) return cornersLot.slice(0, i + 1);
  }
  throw new Error("unbalanced corners lot declaration in skill-art-build.py");
})();

/* Minimal lossy-WebP dimension read. The delivery files are plain `VP8 ` (checked below), so the
   canvas size is the two 14-bit little-endian words after the `9d 01 2a` start code. Written out
   rather than pulled from a dependency because the ONE thing it has to prove is that the 3:2 masters
   did not ship squashed into a square — review finding B1 of the audit task, and the reason
   `Lot.size` names the long edge at all. */
function webpSize(name) {
  const b = readFileSync(new URL(`../src/assets/corners/${name}`, import.meta.url));
  expect(b.slice(0, 4).toString("ascii"), `${name} is not a RIFF container`).toBe("RIFF");
  expect(b.slice(8, 12).toString("ascii"), `${name} is not WEBP`).toBe("WEBP");
  expect(b.slice(12, 16).toString("ascii"), `${name} is not a plain lossy VP8 chunk`).toBe("VP8 ");
  expect(b.slice(23, 26).toString("hex"), `${name} has no VP8 start code`).toBe("9d012a");
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

describe("#cornerart — mapping through the filename", () => {
  it("reads the key out of the filename", () => {
    expect(cornerArtIdFromFile("corner_lightning.webp")).toBe("lightning");
    expect(cornerArtIdFromFile("corner_perk.webp")).toBe("perk");
  });

  it("invents no key from a foreign name", () => {
    // An uppercase stem would yield a SECOND key for the same faction and the binding would split.
    expect(cornerArtIdFromFile("corner_Lightning.webp")).toBeNull();
    expect(cornerArtIdFromFile("corner_.webp")).toBeNull();
    expect(cornerArtIdFromFile("corner_lightning.png")).toBeNull();
    expect(cornerArtIdFromFile("perkcat_A_deck.webp")).toBeNull();
    expect(cornerArtIdFromFile("SK_LIGHTNING_L01_donnergott.webp")).toBeNull();
  });
});

describe("#cornerart — completeness of the lot", () => {
  it("knows archetypes at all (otherwise the suite would be silently green)", () => {
    expect(ARCHETYPE_ORDER.length).toBe(4);
    expect(KEYS.length).toBe(5);
  });

  it("every archetype and the perk panel has an ornament", () => {
    for (const k of KEYS) expect(cornerArt(k), `no ornament for ${k}`).toBeTruthy();
  });

  it("every ornament file belongs to a key — no corpse in the folder", () => {
    for (const f of FILES) {
      expect(KEYS, `${f} maps to no known key`).toContain(cornerArtIdFromFile(f));
    }
  });

  it("every filename matches the pattern (no silent drop through null)", () => {
    for (const f of FILES) expect(cornerArtIdFromFile(f), `${f} does not match`).not.toBeNull();
  });

  it("exactly ONE file per key — a second would overwrite the binding silently", () => {
    for (const k of KEYS) {
      expect(FILES.filter((f) => cornerArtIdFromFile(f) === k).length, `not exactly one file for ${k}`).toBe(1);
    }
  });

  it("an unknown key shows NO image rather than a foreign one", () => {
    expect(cornerArt("nosuchfaction")).toBeNull();
    expect(cornerArt(undefined)).toBeNull();
    expect(cornerArt("")).toBeNull();
  });

  it("ships at the masters' 3:2, not squashed into a square", () => {
    for (const f of FILES) {
      const { w, h } = webpSize(f);
      expect(w, `${f} is not 600 px on the long edge`).toBe(600);
      expect(h, `${f} is not 400 px on the short edge`).toBe(400);
      expect(w / h, `${f} lost the 3:2 aspect`).toBeCloseTo(1536 / 1024, 5);
    }
  });
});

describe("#cornerart — one delivery per master, and nothing invented", () => {
  /* A gold variant of the perk filigree was derived at bake time for the legendary phase, and was
     dropped at the visual gate (Q9, 2026-08-22) when that screen took the faction ornament instead.
     The machinery went with it rather than staying as a feature with no caller — so the lot is back
     to a plain one-file-per-master shape, and this says so rather than leaving it implied. */
  it("ships exactly one delivery per drawn master", () => {
    expect(MASTERS.length, "the lot has five drawn masters").toBe(5);
    expect(FILES.length).toBe(MASTERS.length);
    for (const m of MASTERS) expect(FILES, `no delivery for ${m}`).toContain(m);
  });

  it("declares no derived deliveries — the bake has no recolour step left", () => {
    expect(cornersDecl).not.toMatch(/derived=/);
    expect(buildPy, "recolour() has no caller and must not linger").not.toMatch(/def recolour\(/);
  });
});

describe("#cornerart — level and balance are two different decisions", () => {
  it("has a factor for every file, and no factor without a file", () => {
    expect(Object.keys(CORNER_OPACITY).sort()).toEqual([...KEYS].sort());
  });

  it("carries the balance docs/art/corners/README.md measured", () => {
    expect(CORNER_OPACITY.lightning).toBeCloseTo(0.110, 5);
    expect(CORNER_OPACITY.fire).toBeCloseTo(0.100, 5);
    expect(CORNER_OPACITY.ice).toBeCloseTo(0.092, 5);
    expect(CORNER_OPACITY.plant).toBeCloseTo(0.064, 5);
    expect(CORNER_OPACITY[CORNER_PERK]).toBeCloseTo(0.156, 5);
  });

  /* THE POINT OF THE SPLIT. Whatever the level is, the ratios between the lots must be the measured
     ones. A change that "brightens plant a bit" edits one factor and silently breaks the alignment
     the README solved; this catches it while leaving the level free to move. */
  it("the ratios between the lots survive the level, whatever it is set to", () => {
    for (const k of KEYS) {
      expect(cornerOpacity(k) / cornerOpacity(CORNER_PERK),
        `${k}'s ratio to perk moved`).toBeCloseTo(CORNER_OPACITY[k] / CORNER_OPACITY[CORNER_PERK], 9);
      expect(cornerOpacity(k)).toBeCloseTo(cornerBalance(k) * CORNER_GAIN, 9);
    }
  });

  it("the level is one positive knob, and it is the only thing between balance and display", () => {
    expect(typeof CORNER_GAIN).toBe("number");
    expect(CORNER_GAIN).toBeGreaterThan(0);
    // No lot may end up fully opaque — these are veils over a card, not a background image.
    for (const k of KEYS) expect(cornerOpacity(k), `${k} is not a veil any more`).toBeLessThan(1);
  });

  /* A RATCHET ON AN OWNER DECISION, and deliberately a blunt one.

     The counter-check found this gap rather than predicted it: setting the level back to 1 broke
     nothing, because every other assertion here is about ratios and is level-independent. That is
     right for the ratios and wrong for the level — at 1 the ornaments are invisible, which is the
     exact state the V3 gate rejected on 2026-08-22, and it would have come back silently.

     So the decided value is pinned. Changing the level is legitimate and expected; changing it
     without noticing is not. A future change to this number should edit this line too, and bring
     its own V3 round — which is the friction this test exists to create. */
  it("carries the level the owner decided at V3, not one that drifted back", () => {
    expect(CORNER_GAIN, "the V3 level was 3 — change this line WITH the decision, not after it").toBe(3);
  });

  it("plant stays the dimmest and perk the brightest — the shape of the alignment", () => {
    const vals = KEYS.map((k) => cornerBalance(k));
    expect(Math.min(...vals)).toBeCloseTo(CORNER_OPACITY.plant, 5);
    expect(Math.max(...vals)).toBeCloseTo(CORNER_OPACITY[CORNER_PERK], 5);
  });

  /* THE HUNDREDFOLD TRAP. If somebody later "completes" the lot by adding a light table to the build
     script, the set is corrected twice — once in the pixels, once in the CSS — and renders at about
     1 % of the intended brightness. That reads as a missing image, not as a bug, so it is guarded. */
  it("the corners lot bakes at light 1.0 — the alignment lives in CSS, not in the pixels", () => {
    expect(cornersDecl, "the corners lot must not carry a baked light table").not.toMatch(/light\s*=/);
    expect(cornersDecl).toMatch(/strip_w=300\b/);
  });
});

describe("#cornerart — the zone is ONE number, declared twice and compared", () => {
  const strip_w = Number(/strip_w=(\d+)/.exec(cornersLot)[1]);
  const strip_h = Number(/strip_h=(\d+)/.exec(cornersLot)[1]);

  it("the CSS width IS the width the bloom radius was divided by", () => {
    const cssW = Number(/width:\s*(\d+)px/.exec(coCorner)[1]);
    expect(cssW, `index.css draws the ornament at ${cssW} px, the bake divided by ${strip_w}`).toBe(strip_w);
  });

  it("the CSS height IS the zone height the lot records", () => {
    expect(Number(/height:\s*(\d+)px/.exec(coCorner)[1])).toBe(strip_h);
  });

  /* The head is not a fixed height — it grows with a round score or a bonus hint, and the sticky
     action bar moves with it. The narrowest head measured live is 77 px (the skill card in round 1,
     visual/V1-measurements.json). The mask therefore has to be FULLY transparent before that, or the
     opaque sticky bar cuts a straight line across a still-glowing ornament. */
  const NARROWEST_HEAD_PX = 77;
  it("the mask is finished before the narrowest measured head band", () => {
    const h = Number(/height:\s*(\d+)px/.exec(coCorner)[1]);
    const end = Number(/mask-image:\s*linear-gradient\(180deg,\s*#000\s*\d+%,\s*transparent\s*(\d+)%/.exec(coCorner)[1]);
    expect(h * (end / 100), `fade ends at ${h * end / 100} px, the head can be ${NARROWEST_HEAD_PX} px`)
      .toBeLessThanOrEqual(NARROWEST_HEAD_PX);
  });

  it("the filigree mask starts AND ends earlier than the organic one — its outflow is abrupt", () => {
    const stops = (body) => {
      const m = /mask-image:\s*linear-gradient\(180deg,\s*#000\s*(\d+)%,\s*transparent\s*(\d+)%/.exec(body);
      return { start: Number(m[1]), end: Number(m[2]) };
    };
    const f = stops(coCorner);
    const p = stops(coFil);
    expect(p.start).toBeLessThan(f.start);
    expect(p.end).toBeLessThan(f.end);
  });

  it("the filigree corner is set INWARD so it is not a third parallel line", () => {
    // The card already carries a 1 px accent frame and the 3 px PhaseHairline in the same colour.
    expect(coFil).toMatch(/top:\s*[1-9]\d*px/);
    expect(coFil).toMatch(/left:\s*[1-9]\d*px/);
    expect(ruleBody(".co-corner-fil.co-corner-r")).toMatch(/right:\s*[1-9]\d*px/);
  });
});

describe("#cornerart — no runtime bloom", () => {
  it("no filter and no blur on any corner rule — the bloom is baked into the files", () => {
    for (const [name, body] of [[".co-corner", coCorner], [".co-corner-fil", coFil]]) {
      expect(body, `${name} must not filter at runtime`).not.toMatch(/filter:/);
      expect(body, `${name} must not blur at runtime`).not.toMatch(/blur\(/);
    }
  });

  it("the gold is baked too, never a runtime hue-rotate", () => {
    expect(coCorner).not.toMatch(/hue-rotate/);
    expect(coFil).not.toMatch(/hue-rotate/);
    expect(cornersJsx).not.toMatch(/filter/);
  });

  it("is shown with screen blending against the black ground, as the emblems are", () => {
    expect(coCorner).toMatch(/mix-blend-mode:\s*screen/);
  });
});

describe("#cornerart — wiring", () => {
  const screens = [["SkillSelect", skillJsx], ["PerkSelect", perkJsx], ["LegendarySelect", legJsx]];

  it("all three heads come from ONE component, so they cannot drift apart", () => {
    for (const [name, jsx] of screens) {
      expect(jsx, `${name} does not use the shared component`)
        .toMatch(/import \{ CardCorners \} from "\.\/CardCorners\.jsx"/);
    }
  });

  it("renders exactly two ornaments, the second of them mirrored", () => {
    expect((cornersJsx.match(/<img /g) || []).length, "a head has exactly two corners").toBe(2);
    expect(cornersJsx).toMatch(/co-corner-r/);
    expect(ruleBody(".co-corner-r")).toMatch(/scaleX\(-1\)/);
  });

  it("the mirrored copy is anchored to the RIGHT edge, or it would sit a zone-width away", () => {
    const r = ruleBody(".co-corner-r");
    expect(r).toMatch(/right:\s*0/);
    expect(r).toMatch(/left:\s*auto/);
  });

  it("the skill head binds to the ACTIVE TAB, not to a fixed accent", () => {
    expect(skillJsx).toMatch(/<CardCorners artKey=\{curG\.arch\}/);
  });

  it("the perk head binds to the perk key, and takes it from the module", () => {
    expect(perkJsx).toMatch(/<CardCorners artKey=\{CORNER_PERK\}/);
    expect(perkJsx).toMatch(/import \{ CORNER_PERK \} from "\.\/cornerArt\.js"/);
  });

  /* The legendary phase binds like the SKILL screen, not like the perk screen. A gold phase ornament
     was built and rejected at the visual gate (Q9, 2026-08-22): that screen already carries the skill
     tab row and the skill emblems, so the corner speaks the same language. Guarded in both
     directions — it must follow the tab, and it must not have acquired a fixed key of its own. */
  it("the legendary head follows its tab, exactly as the skill head does", () => {
    expect(legJsx).toMatch(/<CardCorners artKey=\{curG\.arch\}/);
    expect(legJsx).not.toMatch(/CORNER_LEGENDARY/);
  });

  it("the archetype binding is the KEY, never the translated label", () => {
    // `archMeta(arch).label` is „Blitz"/„Lightning" — an ornament hung on it vanishes on an English run.
    expect(skillJsx).not.toMatch(/<CardCorners artKey=\{[^}]*\.label/);
    expect(skillJsx).not.toMatch(/<CardCorners artKey=\{[^}]*meta\./);
  });

  it("the filigree case is DERIVED from the key, not passed as a prop", () => {
    expect(cornersJsx).toMatch(/isFiligree\(artKey\)/);
    expect(cornersJsx).not.toMatch(/function CardCorners\(\{[^}]*(perk|filigree)[^}]*\}\)/);
  });

  it("isFiligree covers the perk corner and nothing else", () => {
    expect(isFiligree(CORNER_PERK)).toBe(true);
    for (const a of ARCHETYPE_ORDER) expect(isFiligree(a), `${a} is not filigree`).toBe(false);
    expect(isFiligree("legendary"), "the dropped gold key must not come back silently").toBe(false);
  });

  it("the desktop gate is in JSX on ALL THREE screens, not in CSS", () => {
    expect(skillJsx).toMatch(/\{wide && curG && <CardCorners/);
    expect(perkJsx).toMatch(/\{inWings && <CardCorners/);
    expect(legJsx).toMatch(/\{wide && curG && <CardCorners/);
    // No media query may render or hide the ornaments — a CSS gate still puts the <img> in the DOM.
    expect(coCorner).not.toMatch(/@media/);
  });

  it("the head is lifted above the ornaments on every screen", () => {
    for (const [name, jsx] of screens) {
      expect(jsx, `${name} head is not lifted`).toMatch(/className="co-head text-center/);
    }
    expect(ruleBody(".co-head")).toMatch(/position:\s*relative/);
  });

  it("the ornaments are decorative to a screen reader — the head already says it in words", () => {
    expect((cornersJsx.match(/aria-hidden="true"/g) || []).length).toBe(2);
    expect((cornersJsx.match(/alt=""/g) || []).length).toBe(2);
    expect(coCorner).toMatch(/pointer-events:\s*none/);
  });
});
