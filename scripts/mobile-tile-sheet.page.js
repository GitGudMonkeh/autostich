/* mobile-tile-design, part 1 — the browser half of the variant sheet.
   =================================================================================================

   WHAT THIS IS FOR. Below 640 px the three selection screens show no emblem and no ornament at all
   (SkillSelect.jsx:456, PerkSelect.jsx:121, LegendarySelect.jsx:176). This page puts the two
   candidate designs — D1: a banner behind the tile head, and a fixed emblem in the tile's top-right
   corner — onto real tiles at the MEASURED phone width, so the owner can choose one.

   THE WIDTH IS AN INPUT, NOT AN OUTCOME. The runner passes the tile width measured in the running
   application (deliverable M, visual/M-tile-widths.json) and this page sets it explicitly. That is
   the opposite of what `icon-contact-sheet.page.js` does, and deliberately: that sheet could let the
   desktop card produce its own width because the desktop layout was already what shipped. Here the
   layout does not exist yet, so a sheet that derived its own width would be showing a design at a
   width the app never renders. The value is read BACK afterwards (`probe()`) and printed into the
   sidecar next to the measurement, so the two are compared rather than assumed equal.

   Because the width is set rather than inherited, the sheet does not depend on the viewport at all —
   no `sm:` utility is used here — and the runner is free to make the window whatever size the images
   need. Every height media query in src/index.css is gated on `min-width: 1280px`, so none of them
   reaches this markup either. Checked, not assumed.

   D4 — NOTHING MAY CHANGE SIZE. Neither variant adds padding and neither is in the text flow. The
   control column exists so that claim is checkable rather than assertable: `probe()` reports every
   tile's box and its computed type sizes, and control and variant must agree to the pixel.

   WHAT IS DELIBERATELY NOT REPRODUCED, for the reason the contact sheet gives:
     · `.as-legendary` — the animated gold frame. Its keyframes are not gated by
       `prefers-reduced-motion`, so two runs of the same sheet would differ. It sits AROUND the tile
       and cannot move an emblem.
     · `.as-edge-card.is-sel` — the selected wash, so every tile is lit identically.
   Tailwind utilities from the real markup are restated as plain CSS below: this page is outside
   Tailwind's content scan, so `p-3` and friends would generate nothing. They are chrome, not
   geometry, and they are the one place this sheet copies the application. */

import "../src/index.css";
import { ARCHETYPE_META } from "../src/game/skills.js";
import { PERK_LIST, RARITY_META, isLegendary } from "../src/game/perks.js";
import { FAMILY_LIST } from "../src/game/families.js";
import { TIER_META, romanOf } from "../src/game/rarity.js";
import { PHASE_ACCENTS, phaseCard } from "../src/ui/modalStyle.jsx";
import { skillList, familyDef, perkCat, perkDef, rarityLabel } from "../src/i18n/labels.js";
import { t, setLocale } from "../src/i18n/index.js";
import { skillArt } from "../src/ui/skillArt.js";
import { perkCatArt, legendaryPerkArt } from "../src/ui/perkArt.js";
import { cornerArt, cornerOpacity, isFiligree, CORNER_PERK } from "../src/ui/cornerArt.js";

const ARCH = "lightning";           // one faction stands in; the ornament binds to the tab, not the sheet
const LEG_GOLD = "#d4a63a";

/* ------------------------------------------------------------------ the variants (the proposal)

   The only CSS this workstream proposes. It is injected here rather than added to `src/index.css`
   because part 1 must not touch `src/` — the contract's tripwire. Whatever survives the visual gate
   moves into a `@media (max-width: 639.98px)` block in part 2, unchanged.

   BANNER. The desktop banner is not an overlay: `.sk-offer-art` adds `padding-top: 176px` and pushes
   the text down. D4 forbids that, so the mobile banner sits BEHIND the badge row and the name and is
   masked out before the description — the move `.co-head` already makes in the card head. No padding,
   no box changed.

   THE CAP IS LOAD-BEARING, not a refinement. Measured (deliverable M): the emblem box runs from
   245 px at a 320 px phone to 564 px at 639 px, a spread of 2.3x. Uncapped, the baked 16 css-px bloom
   would render at ~33 css-px at the top of the band. 320 px is the cap on the sheet — the narrowest
   width in the band, so the banner is the same size on every phone.

   CORNER. Fixed size, anchored top right, out of the flow, in the space the badge row leaves. The
   mask dissolves it toward the text so it does not end on a square edge. Paint order: the emblem sits
   UNDER the badges, because badges carry text. */
const VARIANT_CSS = `
.mt-tile { position: relative; overflow: hidden; }
.mt-tile > *:not(img) { position: relative; }   /* lift the text above the artwork — as .co-head does */

.mt-v-banner .mt-art {
  position: absolute; top: 0; left: 0; right: 0; margin-inline: auto;
  width: 100%; max-width: var(--mt-banner-max, 320px);
  height: var(--mt-banner-h, 92px);
  object-fit: cover; object-position: center 25%;
  mix-blend-mode: screen; pointer-events: none; z-index: 0;
  -webkit-mask-image: linear-gradient(180deg, #000 50%, transparent);
  mask-image: linear-gradient(180deg, #000 50%, transparent);
}

.mt-v-corner .mt-art,
.mt-v-corner-bleed .mt-art {
  position: absolute; z-index: 0;
  top: var(--mt-corner-inset, 0px); right: var(--mt-corner-inset, 0px);
  width: var(--mt-corner-size, 88px); height: var(--mt-corner-size, 88px);
  object-fit: cover; object-position: center 25%;
  mix-blend-mode: screen; pointer-events: none;
  /* The fade toward the tile's centre. Two stops, both settable from the column, because V3 asked for
     „weniger ausfaden zur Mitte" and „less" is a word, not a value — the sheet shows several and the
     owner points at one. The default pair is what was shown at the gate. */
  -webkit-mask-image: radial-gradient(120% 120% at 100% 0%,
    #000 var(--mt-fade-solid, 42%), transparent var(--mt-fade-end, 80%));
  mask-image: radial-gradient(120% 120% at 100% 0%,
    #000 var(--mt-fade-solid, 42%), transparent var(--mt-fade-end, 80%));
}
/* The bleeding sub-variant — the harder case for the tile's overflow, so it is on the sheet too.
   It shares the block above rather than extending it through a second class on the column: the first
   version set only these two custom properties, the positioning rule never matched, and the emblem
   fell back into the text flow and grew every tile by 297 px. The D4 check caught it on the first
   run, which is the whole reason that check is numeric and not a look at the picture. */
.mt-v-corner-bleed .mt-art { --mt-corner-inset: -16px; --mt-corner-size: 112px; }

/* D5 — one ornament per head, not the mirrored pair. Two 300 px copies on a 356 px head overlap and
   ADD light through screen blending. Measured (M): a single copy fits from a 334 px viewport upward,
   so the ornament keeps its baked 300 px and the bake's strip_w stays the CSS width. */
.mt-head .co-corner-r { display: none; }

/* ------------------------------------------------------------- sheet chrome (restated, not geometry) */
body { background: #0f0f14; margin: 0; }
.mt-sheet { display: flex; gap: 20px; align-items: flex-start; padding: 20px; width: max-content; }
.mt-col { display: flex; flex-direction: column; gap: 8px; }
.mt-label { font: 600 12px/1.4 var(--font-sans); letter-spacing: .08em; text-transform: uppercase;
            color: #9a9aa6; }
.mt-sub { font: 400 11px/1.4 var(--font-sans); color: #6a6a76; margin-top: -6px; }
.mt-card { border-radius: 16px; }
.mt-card-pad-16 { padding: 16px 16px 24px; }                       /* px-4 pb-6 — skill, legendary */
.mt-card-pad-24 { padding: 24px; }                                 /* p-6 — perk */
.mt-head { position: relative; text-align: center; margin-bottom: 4px; }
.mt-eyebrow { font: 600 12px/1.4 var(--font-sans); letter-spacing: .1em; text-transform: uppercase; }
.mt-title { font: 600 20px/1.3 var(--font-sans); margin-top: 4px; color: #e8e8ea; }
.mt-grid { display: grid; grid-template-columns: minmax(0, 1fr); margin-top: 16px; }
.mt-grid-8 { gap: 8px; }                                           /* gap-2 — skill, legendary */
.mt-grid-10 { gap: 10px; }                                         /* gap-2.5 — perk */
.mt-tile { border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
           text-align: left; }                                     /* rounded-xl / p-3 / gap-1.5 */
.mt-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.mt-badge { font: 700 10px/1.4 var(--font-sans); letter-spacing: .03em; padding: 2px 6px; border-radius: 4px; }
.mt-name { font: 600 15px/1.3 var(--font-sans); }
.mt-desc { font: 400 13px/1.35 var(--font-sans); opacity: .75; white-space: pre-line; color: #e8e8ea; }
`;

/* ------------------------------------------------------------------------------- the sample tiles

   Data-driven, never hand-picked, so new content changes the sheet instead of quietly invalidating
   it. Each screen contributes the two cases that decide the two variants:

     · FULLEST BADGE ROW — the corner variant's failure case. The badge row is what eats the free
       top-right corner, and „oben rechts, da ist am meisten Platz" is exactly the assumption a
       three-badge tile breaks.
     · LONGEST DESCRIPTION — the banner's failure case. The mask has to be finished before the text
       that runs furthest. */

const longestBy = (list, of) => list.reduce((a, b) => ((of(b) || "").length > (of(a) || "").length ? b : a));

function skillTiles(legendaryOnly) {
  const all = skillList().filter((s) => s.archetype === ARCH && (legendaryOnly ? s.legendary : true));
  const meta = ARCHETYPE_META[ARCH];
  const badgesOf = (s) => [
    { text: meta.label.toUpperCase(), color: meta.color },
    ...(s.heatConsumer || s.onFullCharge ? [{ text: t("skill.badge.consumer"), color: "#d4a63a" }] : []),
    ...(s.legendary ? [{ text: t("skill.badge.legendary"), color: "#e0b845" }] : []),
  ];
  /* The fullest row this screen can produce, found rather than assumed: sort by badge count, then by
     name length, so the pick is stable across runs and languages. */
  const maxBadges = all.slice().sort((a, b) =>
    badgesOf(b).length - badgesOf(a).length || (b.name || "").length - (a.name || "").length)[0];
  const longest = longestBy(all, (s) => s.desc);
  const mk = (s, kind) => ({
    kind, id: s.id, badges: badgesOf(s), name: s.name, desc: s.desc,
    nameColor: s.legendary ? "#e0b845" : meta.color,
    accent: s.legendary ? "#e0b845" : "#8a8a95",
    art: skillArt(s.id),
  });
  /* On some screens and in some languages the same skill wins both. Fall back to the longest of the
     REST rather than collapsing to a single tile: the sheet's job is to show the two cases that break
     the two variants, and one tile cannot show two cases. */
  const second = maxBadges.id === longest.id
    ? longestBy(all.filter((s) => s.id !== maxBadges.id), (s) => s.desc)
    : longest;
  return [mk(maxBadges, "maxBadges"), mk(second, "longestDesc")];
}

function perkTiles() {
  /* A FAMILY offer carrying category + tier + upgrade — three badges, the fullest a perk tile has.
     `held > 0` is what produces the upgrade badge in PerkSelect's `offerView`, so it is forced here
     rather than waited for. The emblem is the CATEGORY's, exactly as `perkArt` resolves it. */
  const fam = familyDef(longestBy(FAMILY_LIST, (f) => (f.tiers && f.tiers[2] && f.tiers[2].desc) || "").id);
  const tier = 3, held = 2;
  const tm = TIER_META[tier] || { color: "#8a8a95" };
  const cat = perkCat(fam.cat);
  const familyTile = {
    kind: "maxBadges", id: `${fam.id}:${tier}`,
    badges: [
      { text: cat.name, color: cat.color },
      { text: rarityLabel(tier), color: tm.color },
      { text: t("perk.upgrade", { from: romanOf(held), to: romanOf(tier) }), color: tm.color },
    ],
    name: `${fam.name} ${romanOf(tier)}`, desc: (fam.tiers[tier] || {}).desc || "",
    nameColor: tm.color, accent: tm.color, art: perkCatArt(fam.cat),
  };

  /* A LEGENDARY perk — its own emblem, and the longest description on this screen. Resolved through
     the registry's own `isLegendary`, never a typed-out id list: `perkArt` resolves the two
     populations out of two separate maps and has no path from one to the other, and a sheet that
     invented its own membership test could show a regular perk wearing a legendary emblem — the
     exact defect `perkArt.js` says it exists to prevent. */
  const legs = PERK_LIST.filter((p) => isLegendary(p.id)).map((p) => perkDef(p.id)).filter(Boolean);
  const leg = longestBy(legs, (p) => p.desc);
  const legTile = {
    kind: "longestDesc", id: leg.id,
    badges: [
      { text: perkCat(leg.cat).name, color: perkCat(leg.cat).color },
      { text: RARITY_META.legendary.badge, color: LEG_GOLD },
    ],
    name: leg.label, desc: leg.desc, nameColor: LEG_GOLD, accent: LEG_GOLD,
    art: legendaryPerkArt(leg.id),
  };
  return [familyTile, legTile];
}

/* --------------------------------------------------------------------------------------- markup */

const el = (tag, cls, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) Object.assign(n.style, style);
  return n;
};

/* One tile. `art` is null in the control column: without it NEITHER the element NOR any class is
   added, so the control is exactly what the phone renders today — which is what makes the D4
   comparison meaningful rather than decorative. */
function tile(spec, { withArt, tileWidth }) {
  const t0 = el("button", "lv-offercard as-edge-card mt-tile");
  t0.style.setProperty("--c", spec.accent);
  t0.style.width = `${tileWidth}px`;
  t0.dataset.kind = spec.kind;
  t0.dataset.id = spec.id;
  if (withArt && spec.art) {
    const img = el("img", "mt-art");
    img.src = spec.art; img.alt = ""; img.setAttribute("aria-hidden", "true"); img.decoding = "async";
    t0.append(img);
  }
  const row = el("div", "mt-badges");
  for (const b of spec.badges) {
    const s = el("span", "mt-badge", { background: `${b.color}22`, color: b.color,
                                       border: `1px solid ${b.color}88` });
    s.textContent = b.text;
    row.append(s);
  }
  const n = el("div", "lv-cardname mt-name", { color: spec.nameColor });
  n.textContent = spec.name;
  const d = el("div", "mt-desc");
  d.textContent = spec.desc;
  t0.append(row, n, d);
  return t0;
}

/* One card head with its single ornament (D5). `artKey` follows the active tab on the skill and
   legendary screens and is `CORNER_PERK` on the perk screen — the same binding the app uses, taken
   from the same module, so a renamed key breaks the sheet instead of silently showing nothing. */
function head(artKey, eyebrow, title, accent, withArt) {
  const h = el("div", "co-head mt-head");
  const src = withArt ? cornerArt(artKey) : null;
  if (src) {
    for (const extra of ["", " co-corner-r"]) {
      const img = el("img", `co-corner${isFiligree(artKey) ? " co-corner-fil" : ""}${extra}`);
      img.src = src; img.alt = ""; img.setAttribute("aria-hidden", "true");
      img.style.setProperty("--co-o", cornerOpacity(artKey));
      h.append(img);
    }
  }
  const e = el("div", "mt-eyebrow", { color: accent }); e.textContent = eyebrow;
  const ti = el("div", "mt-title");                     ti.textContent = title;
  h.append(e, ti);
  return h;
}

/* The three screens, each with the card chrome it actually wears. `phaseCard` is imported rather
   than restated: it is what the emblem is screened ONTO, and a hand-copied gradient would be a
   second definition of the card's own look. */
const SCREENS = {
  skill: () => ({
    accent: ARCHETYPE_META[ARCH].color, pad: "mt-card-pad-16", gap: "mt-grid-8",
    cornerKey: ARCH, eyebrow: t("skill.eyebrow", { cycle: 1, held: 0, slots: 6 }), title: t("skill.title"),
    tiles: skillTiles(false),
  }),
  perk: () => ({
    accent: PHASE_ACCENTS.red.c, pad: "mt-card-pad-24", gap: "mt-grid-10",
    cornerKey: CORNER_PERK, eyebrow: t("perk.start"), title: t("perk.title"),
    tiles: perkTiles(),
  }),
  legendary: () => ({
    accent: ARCHETYPE_META[ARCH].color, pad: "mt-card-pad-16", gap: "mt-grid-8",
    cornerKey: ARCH, eyebrow: t("leg.eyebrow"), title: t("leg.title"),
    tiles: skillTiles(true),
  }),
};

function column({ screen, variant, tileWidth, cardWidth, label, sub, vars }) {
  const s = SCREENS[screen]();
  const withArt = variant !== "none";
  const col = el("div", `mt-col${withArt ? ` mt-v-${variant}` : ""}`);
  for (const [k, v] of Object.entries(vars || {})) col.style.setProperty(k, v);
  col.dataset.variant = variant;
  col.dataset.screen = screen;
  const lab = el("div", "mt-label"); lab.textContent = label;
  col.append(lab);
  if (sub) { const sb = el("div", "mt-sub"); sb.textContent = sub; col.append(sb); }

  const card = el("div", `overlay-card mt-card ${s.pad}`, { width: `${cardWidth}px` });
  Object.assign(card.style, phaseCard({ c: s.accent, rgb: hexToRgb(s.accent) }));
  card.append(head(s.cornerKey, s.eyebrow, s.title, s.accent, withArt));
  const grid = el("div", `mt-grid ${s.gap}`);
  for (const spec of s.tiles) grid.append(tile(spec, { withArt, tileWidth }));
  card.append(grid);
  col.append(card);
  return col;
}

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/* --------------------------------------------------------------------------------- read back

   Every number the sheet is judged on comes out of the DOM after layout, never from the constants
   above. Two things per tile: the box and the type sizes (D4's claim), and the emblem's rendered
   size (what part 2's bloom arithmetic divides by). */
function probe() {
  const r2 = (n) => Math.round(n * 100) / 100;
  const tiles = [...document.querySelectorAll(".mt-tile")].map((t0) => {
    const r = t0.getBoundingClientRect();
    const art = t0.querySelector(".mt-art");
    const ar = art && art.getBoundingClientRect();
    const cs = (sel) => { const n = t0.querySelector(sel); return n ? getComputedStyle(n).fontSize : null; };
    return {
      screen: t0.closest("[data-screen]").dataset.screen,
      variant: t0.closest("[data-variant]").dataset.variant,
      kind: t0.dataset.kind, id: t0.dataset.id,
      box: { w: r2(r.width), h: r2(r.height) },
      paddingBoxWidth: r2(t0.clientWidth),
      type: { badge: cs(".mt-badge"), name: cs(".mt-name"), desc: cs(".mt-desc") },
      art: ar ? { w: r2(ar.width), h: r2(ar.height),
                  blend: getComputedStyle(art).mixBlendMode,
                  objectPosition: getComputedStyle(art).objectPosition,
                  filter: getComputedStyle(art).filter,
                  src: (art.getAttribute("src") || "").split("/").pop() } : null,
    };
  });
  const ornaments = [...document.querySelectorAll(".co-corner")].map((o) => {
    const r = o.getBoundingClientRect();
    return { side: o.classList.contains("co-corner-r") ? "right" : "left",
             visible: getComputedStyle(o).display !== "none",
             w: r2(r.width), h: r2(r.height) };
  });
  const sheet = document.querySelector(".mt-sheet").getBoundingClientRect();
  return { sheet: { w: r2(sheet.width), h: r2(sheet.height) }, tiles, ornaments,
           dpr: devicePixelRatio };
}

/* --------------------------------------------------------------------------------------- build */

let styleEl = null;

async function build(cfg) {
  /* The locale is SET, never inherited. `DEFAULT_LOCALE` in src/i18n/index.js is „en", and the app
     picks German through its own options plumbing, which this page does not run — the first sheets
     came out English for exactly that reason. Tile height depends on text length and the two
     languages differ, so which one is on the sheet is part of what is being judged. */
  setLocale(cfg.lang || "de");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.textContent = VARIANT_CSS;
    document.head.append(styleEl);
  }
  const root = document.querySelector("#mt-root");
  root.replaceChildren();
  const sheet = el("div", "mt-sheet");
  for (const c of cfg.columns) sheet.append(column(c));
  root.append(sheet);

  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll("img")].map((i) =>
    (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
  return probe();
}

window.__mtSheet = { build, probe };

/* Opened by hand: render something rather than a blank page. The runner always passes its own
   columns, so this default cannot affect a committed image. */
if (!window.__MT_DRIVEN) {
  window.addEventListener("load", () => build({ lang: "de", columns: [
    { screen: "perk", variant: "none",   tileWidth: 308, cardWidth: 356, label: "control (today)" },
    { screen: "perk", variant: "banner", tileWidth: 308, cardWidth: 356, label: "banner" },
    { screen: "perk", variant: "corner", tileWidth: 308, cardWidth: 356, label: "corner emblem" },
  ] }));
}
