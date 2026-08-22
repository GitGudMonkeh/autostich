/* #perkart — emblems for the perk selection on the desktop (from 1400 px).
   -------------------------------------------------------------------------------------------------
   TWO POPULATIONS SHARE ONE SCREEN, and that is the whole design of this module.

   A regular perk — one of the 73 `FAMILY_LIST` entries — gets the emblem of its CATEGORY, not one of
   its own. Seven images for 73 offers. The alternative was measured and rejected in
   `docs/art/perkcats/README.md`: one image per family per tier is ~130 pictures, for a distinction
   the tile already carries in its name, its badge and its rarity edge.

   A legendary perk gets its OWN emblem. There are 21 of them, they are build-defining, and they are
   the one place on this screen where the picture is worth an image each.

   The two therefore resolve out of two separate maps, and `perkArt` has no path from one to the
   other. That is deliberate and is what `test/perk-art.test.js` counter-checks: a fallback would be
   invisible in code review and immediately wrong on screen — a regular Score perk wearing the
   Henker's axe, or a legendary quietly wearing the generic category emblem it is supposed to
   outrank. A missing emblem shows NO emblem; it never shows the other population's.

   As in `skillArt.js`, the binding is the FILENAME, not a list typed out here — a new legendary perk
   gets its emblem by the file being named after its ID. The two id parsers are separate on purpose:
   the perk-category files carry a `perkcat_` prefix and a single-letter key, the legendary files
   carry the registry ID first, and one regex over both would have to be loose enough to mistake them
   for each other. Sharing a parser with `skillArt.js` was also available and was NOT taken: extracting
   anything across the skill and perk screens is `icons-corners`' decision, and that task has not run.

   Black ground, not transparency: the emblems are shown with `mix-blend-mode: screen` (`.pk-strip` in
   index.css), which makes black disappear by itself and lays the glow onto the tile additively, the
   same arithmetic as the rest of the FX stack. The bloom is BAKED INTO THE FILES
   (`scripts/skill-art-build.py`), never a runtime CSS filter — this is the screen that already costs
   271–417 ms at `phase:levelup` mount, and a filter here would be raster work on exactly that mount.

   Cost: `import.meta.glob` with `?url` + `eager` yields only URL strings (a few hundred bytes), not
   image data. The bytes are fetched when an <img> actually renders, and it only renders from 1400 px
   (gate in PerkSelect.jsx). No phone loads a single one of these. */

const CAT_FILES = import.meta.glob("../assets/perkcats/*.webp", { eager: true, query: "?url", import: "default" });
const LEG_FILES = import.meta.glob("../assets/legendaries/*.webp", { eager: true, query: "?url", import: "default" });

/* „perkcat_A_deck.webp" → „A". The key is the single capital between the fixed prefix and the
   lowercase reading aid, which is exactly the shape of `CATEGORIES` in src/game/perks.js. The reading
   aid must start with a LOWERCASE letter for the same reason it must in skillArt.js: without that
   anchor „perkcat_A_DECK.webp" or „perkcat_AB.webp" would silently yield a key, and the emblem would
   hang on a category that does not exist. */
export function perkCatArtIdFromFile(name) {
  const m = /^perkcat_([A-Z])_[a-z][a-z0-9-]*\.webp$/.exec(name);
  return m ? m[1] : null;
}

/* „L_ZINS_zinseszins.webp" → „L_ZINS", „L4_kritische-masse.webp" → „L4". The capital-letter part is
   the registry ID from PERK_DEFS, the rest the lowercase reading aid; the split is by SPELLING, not
   by position, because the legendary IDs have no fixed segment count — `L2` and `L_BRENN` are both
   real. Same rule and same trap as `artIdFromFile` in skillArt.js, deliberately not shared with it. */
export function legendaryArtIdFromFile(name) {
  const m = /^([A-Z][A-Z0-9_]*[A-Z0-9])_[a-z][a-z0-9-]*\.webp$/.exec(name);
  return m ? m[1] : null;
}

/* Filename → id → URL. Two files resolving to the SAME id would silently collapse here, the later
   one winning; that case is not defended against at runtime because it is a repository mistake, not
   a state the application can be in with a correct checkout. It is caught in `test/perk-art.test.js`
   ("genau EINE Datei je …"), which counts rather than de-duplicates — a guard that reduced the
   filenames to a set could not see it, and for a while did not. */
const build = (files, idOf) => {
  const out = {};
  for (const path of Object.keys(files)) {
    const id = idOf(path.slice(path.lastIndexOf("/") + 1));
    if (id) out[id] = files[path];
  }
  return out;
};

const CAT_ART = build(CAT_FILES, perkCatArtIdFromFile);
const LEG_ART = build(LEG_FILES, legendaryArtIdFromFile);

/** Emblem of one perk CATEGORY key (A/B/C/D/E/P/S) — `null` if there is none. */
export const perkCatArt = (catKey) => CAT_ART[catKey] || null;

/** Emblem of one LEGENDARY perk, by its PERK_DEFS id — `null` if there is none. */
export const legendaryPerkArt = (perkId) => LEG_ART[perkId] || null;

/* The one resolver the screen calls, taking the offer's display model (`offerView` in PerkSelect).

   The branch is on the POPULATION, not on what happens to be available: a legendary asks the
   legendary map and stops there, everything else asks the category map and stops there. Neither
   consults the other, so a gap can only ever produce a missing emblem, never a wrong one. */
export function perkArt(view) {
  if (!view) return null;
  if (!view.isFamily && view.leg) return legendaryPerkArt(view.entry);
  return perkCatArt(view.catKey);
}
