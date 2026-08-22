/* #cornerart — corner ornaments for the two selection card heads on the desktop (from 1280 px).
   -------------------------------------------------------------------------------------------------
   FIVE IMAGES, TEN PLACEMENTS. One ornament per archetype plus one for the perk panel; each is shown
   TWICE in a head, the right copy mirrored with `transform: scaleX(-1)` (`.co-corner-r` in
   index.css). Five files rather than ten, because a card head is symmetric and the masters were drawn
   for exactly that — `docs/art/corners/README.md` settled it when the art was made.

   THE ORNAMENT IS INFORMATION, NOT DECORATION. It changes with the active faction tab, so the head
   says "you are on Lightning" in the same breath as the tab row does. That is why the binding below
   is to the ARCHETYPE KEY and not to a display name: `archMeta(arch).label` is „Blitz"/"Lightning"
   depending on the run's language, and hanging an image on it would make the picture disappear on an
   English run — the same trap `perkArt.js` calls out for perk categories.

   As in `skillArt.js` and `perkArt.js`, the binding is the FILENAME, not a list typed out here.

   PER-FACTION OPACITY IS A DISPLAY VALUE, AND THAT IS THE ONE THING MOST WORTH READING TWICE.
   The other Phase-2 lots carry their light alignment BAKED INTO THE PIXELS (`PERKCAT_LIGHT` and
   `LEGENDARY_LIGHT` in scripts/skill-art-build.py). This lot does not, and the difference is not an
   oversight: `docs/art/corners/README.md` solved the alignment as a per-faction DECKKRAFT, explicitly
   on the model of `BATTLEFIELD_VEIL` in `cosmeticAssets.js`, which caps a too-bright battlefield by
   scaling the veil's alpha at display time and never touches a file. So the corners bake at light
   1.0 and are dimmed here.

   Doing BOTH would be the quiet failure: the set would be corrected twice, once in the pixels and
   once in the CSS, and would render at roughly a hundredth of the intended brightness — dark enough
   to look like a missing image rather than like a bug. `test/corner-art.test.js` holds the two apart.

   Black ground, not transparency: shown with `mix-blend-mode: screen` (`.co-corner`), which makes
   black disappear by itself and lays the glow onto the card additively. The bloom is BAKED INTO THE
   FILES, never a runtime CSS filter — this is the screen that already costs 271–417 ms at
   `phase:levelup` mount, and a filter here would be raster work on exactly that mount.

   Cost: `import.meta.glob` with `?url` + `eager` yields only URL strings, not image data. The bytes
   are fetched when an <img> actually renders, and it only renders from 1280 px (gate in
   SkillSelect.jsx and PerkSelect.jsx). No phone loads a single one of these. */

const FILES = import.meta.glob("../assets/corners/*.webp", { eager: true, query: "?url", import: "default" });

/* „corner_lightning.webp" → „lightning". The key is the all-lowercase stem after the fixed prefix,
   which is the shape of both `ARCHETYPE_ORDER` (src/game/skills.js) and the one extra „perk" panel
   key. Lowercase-anchored for the same reason the other two parsers are: without it a stray
   „corner_Lightning.webp" would silently yield a second, different key and the ornament would hang
   on an archetype that does not exist. */
export function cornerArtIdFromFile(name) {
  const m = /^corner_([a-z][a-z0-9-]*)\.webp$/.exec(name);
  return m ? m[1] : null;
}

const ART = {};
for (const path of Object.keys(FILES)) {
  const id = cornerArtIdFromFile(path.slice(path.lastIndexOf("/") + 1));
  if (id) ART[id] = FILES[path];
}

/* The one NON-ARCHETYPE key. The perk selection is not a faction: it has a single identity colour
   (`PHASE_ACCENTS.red`) and therefore one ornament that changes with nothing, and its motif is made
   rather than grown — filigree, against four natural forces. Named here so the screen does not have
   to spell the string.

   THE LEGENDARY PHASE HAS NO KEY OF ITS OWN, and that was decided rather than overlooked. A gold
   variant of this filigree was built and shown at the visual gate on 2026-08-22 (Q9) and rejected:
   that screen speaks the SKILL screen's language — same tab row, same skill emblems on the cards —
   so it takes the faction ornament of its active tab, exactly as `SkillSelect` does. What makes it
   legendary is the title and the card's gold frame, not a second voice in the head. */
export const CORNER_PERK = "perk";

/** The filigree key — the one that needs the inward offset and the earlier mask. A predicate rather
    than a bare comparison because the CSS class (`.co-corner-fil`) names the concept, not the perk
    screen, and the two must stay in step if the set ever grows again. */
export const isFiligree = (key) => key === CORNER_PERK;

/* Per-faction display opacity, from the measurement in `docs/art/corners/README.md` — NOT re-derived.
   Each was solved so that all five carry the same perceived light: the luminous area of the masters
   spans 7.4 % (perk filigree, all line) to 17.6 % (plant, because vines ARE dense), and these factors
   are what flattens that. Plant is the outlier on purpose; the table regulates the display rather
   than bending the artwork.

   Keyed by the SAME key the file is, so a new corner file needs its entry here and
   `test/corner-art.test.js` fails in both directions if the two ever drift apart. */
export const CORNER_OPACITY = {
  lightning: 0.110,  // measured 10.9 % luminous area
  fire:      0.100,  // 12.0 %
  ice:       0.092,  // 13.0 %
  plant:     0.064,  // 18.6 % — the dense one, and deliberately still the dimmest on screen
  [CORNER_PERK]: 0.156,  // 7.7 % — the thinnest of the set, so it carries the highest opacity
};

/* THE LEVEL, as opposed to the BALANCE — two decisions that must not share a knob.

   The table above is the measured balance BETWEEN the lots and is not to be touched; it is what
   makes all six read as one family (spread measured at 1.27-fold as shown). How loud that family is
   as a whole is a separate question, it is a design decision, and it belongs to the owner.

   Set to 3 at the V3 visual gate on 2026-08-22. At 1.0 the verdict was "gut platziert, aber zu
   transparent, man kann sie kaum erkennen", judged against a four-level comparison at identical game
   state (visual/V3-gain-options.png in this task's workstream folder). 4x was rejected in the same
   pass: the filigree corner starts reading as a frame rather than as a corner.

   ONE knob deliberately, rather than six edited numbers — moving the level must not be ABLE to
   disturb the balance. The guard checks the RATIOS rather than the absolute values, so that stays
   true whatever the level becomes. */
export const CORNER_GAIN = 3;

/** URL of one corner ornament by key (an archetype, or `CORNER_PERK`) — `null` if there is none. */
export const cornerArt = (key) => (key && ART[key]) || null;

/** Measured balance factor of one ornament, BEFORE the level. Falls back to the perk value only for
    a key that has a file but no factor, which `test/corner-art.test.js` forbids from existing. */
export const cornerBalance = (key) => CORNER_OPACITY[key] ?? CORNER_OPACITY[CORNER_PERK];

/** The opacity actually put on the element: measured balance times the owner's level. */
export const cornerOpacity = (key) => cornerBalance(key) * CORNER_GAIN;
