/* mobile-tile-design, part 1 — the browser half of the variant sheet.        DRAFT — NEVER EXECUTED.
   =================================================================================================
   Written before the task worktree existed, so nothing here has been run, and every number marked
   `TUNE` is a starting value chosen at the desk rather than at the device. Adapt against
   `scripts/icon-contact-sheet.page.js` where the two disagree: that one has been run.

   WHAT THIS IS FOR. Below 640 px the three selection screens show no emblem and no ornament at all
   (SkillSelect.jsx:456, PerkSelect.jsx:121, LegendarySelect.jsx:176). This page puts the two
   candidate designs — D1: banner behind the head, and a fixed emblem in the tile's top-right corner
   — onto the real tiles at the real phone width, so the owner can choose one.

   THE ONE RULE THIS FILE OBEYS, inherited from the contact sheet: the geometry is not written here.
   The tiles are the real markup and the browser applies `src/index.css` to them, so the card wash,
   the rarity edge and the ornament zone come from the stylesheet the game ships. What IS written
   here is the two variants, because they do not exist yet — that is the whole point of the sheet.
   Everything written here is read BACK out of the DOM afterwards and printed into the sidecar.

   THE VIEWPORT IS THE MEASUREMENT INSTRUMENT. Tailwind's `sm:` responds to the viewport, not to a
   container, so a 390 px column inside a wide window would render the 640 px layout at 390 px and
   lie. The runner therefore sets a real device width per capture and this page renders one column.

   D4 — NOTHING MAY CHANGE SIZE. Neither variant adds padding, and neither is in the text flow. The
   control row (`none`) exists so the claim is checkable rather than assertable: `probe()` reports
   each tile's box and its computed type sizes, and control and variant must agree to the pixel.

   WHAT IS DELIBERATELY NOT REPRODUCED, for the reason the contact sheet gives:
     · `.as-legendary` — the animated gold frame. Its keyframes are not gated by
       `prefers-reduced-motion`, so two runs of the same sheet would differ. It sits AROUND the tile
       and cannot move an emblem.
     · `.as-edge-card.is-sel` — the selected wash, so every tile is lit identically.
   Tailwind utilities from the real markup are restated as plain CSS below: this page is outside
   Tailwind's content scan, so `p-3` and friends would generate nothing. They are chrome, not
   geometry, and they are the one place this sheet copies the application. */

import "../src/index.css";
import { SKILL_LIST, ARCHETYPE_META, ARCHETYPE_ORDER } from "../src/game/skills.js";
import { PERK_LIST, CATEGORIES, isLegendary } from "../src/game/perks.js";
import { TIER_META } from "../src/game/rarity.js";
import { skillArt } from "../src/ui/skillArt.js";
import { perkCatArt, legendaryPerkArt } from "../src/ui/perkArt.js";
import { cornerArt, cornerOpacity, isFiligree, CORNER_PERK } from "../src/ui/cornerArt.js";

/* ------------------------------------------------------------------ variant styles (the proposal)

   The only CSS this workstream is actually proposing. It is injected here rather than added to
   `src/index.css` because part 1 must not touch `src/` — see the contract's tripwire. Whatever
   survives the visual gate moves into a `@media (max-width: 639.98px)` block in part 2, unchanged.

   BANNER. The desktop banner is not an overlay: `.sk-offer-art` adds `padding-top: 176px` and pushes
   the text down. D4 forbids that, so the mobile banner sits BEHIND the badge row and the name and is
   masked out before the description — the move `.co-head` already makes in the card head. No padding,
   no box changed. `left/right: 0` plus `margin-inline: auto` centres it under its own cap: without
   the cap the emblem would grow with the viewport, and at 639 px it would render ~554 px wide and
   turn the baked 16 css-px bloom into 33.

   CORNER. Fixed size, anchored top right, out of the flow. A negative inset lets it bleed off the
   corner; the mask dissolves it toward the text so it does not end on a square edge. Paint order is
   the assumption recorded in the contract: the emblem sits UNDER the badges, because badges carry
   text. */
const VARIANT_CSS = `
.mt-tile { position: relative; overflow: hidden; }
.mt-tile > *:not(img) { position: relative; }   /* lift the text above the artwork — as .co-head does */

.mt-v-banner .mt-art {
  position: absolute; top: 0; left: 0; right: 0; margin-inline: auto;
  width: 100%; max-width: var(--mt-banner-max, 300px);   /* TUNE — cap, see above */
  height: var(--mt-banner-h, 96px);                       /* TUNE */
  object-fit: cover; object-position: center 25%;         /* TUNE — the anchor is part 2's question */
  mix-blend-mode: screen; pointer-events: none; z-index: 0;
  -webkit-mask-image: linear-gradient(180deg, #000 52%, transparent);
  mask-image: linear-gradient(180deg, #000 52%, transparent);
}

.mt-v-corner .mt-art {
  position: absolute; z-index: 0;
  top: var(--mt-corner-inset, 0px); right: var(--mt-corner-inset, 0px);
  width: var(--mt-corner-size, 84px); height: var(--mt-corner-size, 84px);  /* TUNE */
  object-fit: cover; object-position: center 25%;
  mix-blend-mode: screen; pointer-events: none;
  -webkit-mask-image: radial-gradient(120% 120% at 100% 0%, #000 42%, transparent 80%);
  mask-image: radial-gradient(120% 120% at 100% 0%, #000 42%, transparent 80%);
}
/* The bleeding sub-variant. Both go on the sheet if the capture budget allows; if only one does, this
   one, because it is the harder case for the tile's overflow. */
.mt-v-corner-bleed .mt-art { --mt-corner-inset: -14px; --mt-corner-size: 104px; }

/* D5 — one ornament per head below 640 px, not the mirrored pair. Two 300 px copies on a 358 px head
   overlap by ~242 px and ADD light through screen blending. Hiding the mirrored copy rather than
   resizing the zone has a consequence worth stating: a single ornament still fits at its baked 300 px
   from a viewport of 332 px upward (300 + the card's 32 px of page padding), so the mobile head needs
   NO zone of its own and the bake's strip_w stays the CSS width — `test/corner-art.test.js` keeps
   holding. Below 332 px it overhangs; that is what the 320 px capture is for. */
.mt-head .co-corner-r { display: none; }

/* ------------------------------------------------------------- sheet chrome (restated, not geometry) */
.mt-sheet { background: #141419; padding: 0; margin: 0; }
.mt-row-label { font: 600 11px/1.4 var(--font-sans); letter-spacing: .08em; text-transform: uppercase;
                color: #8a8a95; padding: 14px 16px 6px; }
.mt-card { border-radius: 16px; padding: 24px; margin: 0 16px 8px; }        /* rounded-2xl / p-6 */
.mt-card-skill { padding-left: 16px; padding-right: 16px; }                 /* px-4 on the skill card */
.mt-head { position: relative; text-align: center; margin-bottom: 4px; }
.mt-eyebrow { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.mt-title { font-size: 20px; font-weight: 600; margin-top: 4px; }
.mt-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin-top: 16px; }
.mt-tile { border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
           text-align: left; }                                             /* rounded-xl / p-3 / gap-1.5 */
.mt-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.mt-badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; padding: 2px 6px; border-radius: 4px; }
.mt-name { font-size: 15px; font-weight: 600; }
.mt-desc { font-size: 13px; line-height: 1.35; opacity: .75; white-space: pre-line; }
`;

/* --------------------------------------------------------------------------------- the sample tiles

   Data-driven, never hand-picked: each screen contributes its DECISIVE case plus one ordinary tile.

   For the corner variant the decisive case is the FULLEST BADGE ROW, because the badge row is what
   eats the free top-right corner — that is the failure mode the owner's „oben rechts, da ist am
   meisten Platz" excludes by assumption. For the banner it is the LONGEST DESCRIPTION, which the
   mask has to clear. Both are computed from the shipped registries, so new content changes the sheet
   instead of quietly invalidating it. */

const longest = (list, of) => list.reduce((a, b) => ((of(b) || "").length > (of(a) || "").length ? b : a));

function perkSamples() {
  const fams = PERK_LIST.filter((p) => p && p.familyId);
  return [
    /* Three badges: category + tier + upgrade. `held > 0` is what makes the upgrade badge appear
       (PerkSelect.jsx, offerView), so it is forced here rather than waited for. */
    { kind: "maxBadges", entry: fams[0], tier: 3, held: 2 },
    { kind: "longestDesc", entry: longest(fams, (p) => p.desc), tier: 2, held: 0 },
  ];
}

function skillSamples(arch) {
  const list = SKILL_LIST.filter((s) => s.arch === arch);
  return [
    /* Faction + consumer + legendary is the fullest row a skill tile can carry. */
    { kind: "maxBadges", def: list.find((s) => s.legendary && (s.heatConsumer || s.onFullCharge)) || list[0] },
    { kind: "longestDesc", def: longest(list, (s) => s.desc) },
  ];
}

/* ---------------------------------------------------------------------------------------- markup */

const el = (tag, cls, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) Object.assign(n.style, style);
  return n;
};

/* One tile. `art` is null for the control row: without it NEITHER the element NOR any class is added,
   so the control is byte-identical to what the phone renders today — which is what makes the D4
   comparison meaningful rather than decorative. */
function tile({ accent, badges, name, nameColor, desc, art }) {
  const t = el("button", "lv-offercard as-edge-card mt-tile");
  t.style.setProperty("--c", accent);
  if (art) {
    const img = el("img", "mt-art");
    img.src = art; img.alt = ""; img.setAttribute("aria-hidden", "true"); img.decoding = "async";
    t.append(img);
  }
  const row = el("div", "mt-badges");
  for (const b of badges) {
    const s = el("span", "mt-badge", { background: `${b.color}22`, color: b.color,
                                       border: `1px solid ${b.color}88` });
    s.textContent = b.text;
    row.append(s);
  }
  const n = el("div", "lv-cardname mt-name", { color: nameColor });
  n.textContent = name;
  const d = el("div", "mt-desc");
  d.textContent = desc;
  t.append(row, n, d);
  return t;
}

/* One card head, with its single ornament (D5). `artKey` follows the active tab on the skill and
   legendary screens and is CORNER_PERK on the perk screen — the same binding the app uses, taken from
   the same module, so a renamed key breaks the sheet instead of silently showing nothing. */
function head({ artKey, eyebrow, title, accent }) {
  const h = el("div", "co-head mt-head");
  const src = cornerArt(artKey);
  if (src) {
    for (const extra of ["", " co-corner-r"]) {
      const img = el("img", `co-corner${isFiligree(artKey) ? " co-corner-fil" : ""}${extra}`);
      img.src = src; img.alt = ""; img.setAttribute("aria-hidden", "true");
      img.style.setProperty("--co-o", cornerOpacity(artKey));
      h.append(img);
    }
  }
  const e = el("div", "mt-eyebrow", { color: accent }); e.textContent = eyebrow;
  const t = el("div", "mt-title");                      t.textContent = title;
  h.append(e, t);
  return h;
}

/* ------------------------------------------------------------------------------------- read back

   Every number this sheet is judged on is measured out of the DOM after layout, never taken from the
   constants above. Two things are recorded per tile: the box (D4's claim) and the emblem's rendered
   width (the number part 2's bloom arithmetic divides by, and the reason H3 exists). */
function probe(root) {
  const out = [];
  for (const t of root.querySelectorAll(".mt-tile")) {
    const r = t.getBoundingClientRect();
    const art = t.querySelector(".mt-art");
    const ar = art && art.getBoundingClientRect();
    const cs = (sel) => { const n = t.querySelector(sel); return n ? getComputedStyle(n).fontSize : null; };
    out.push({
      variant: t.closest("[data-variant]")?.dataset.variant ?? "none",
      screen: t.closest("[data-screen]")?.dataset.screen ?? null,
      kind: t.dataset.kind ?? null,
      tile: { w: r.width, h: r.height },
      art: ar ? { w: ar.width, h: ar.height } : null,
      type: { badge: cs(".mt-badge"), name: cs(".mt-name"), desc: cs(".mt-desc") },
    });
  }
  return { viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio }, tiles: out };
}

/* ----------------------------------------------------------------------------------------- build

   One sheet = one screen at one viewport width, showing the control and both variants stacked. They
   are stacked rather than split across images on purpose: a variant is judged against the tile it
   replaces, and a comparison that needs two files open is a comparison nobody makes. */
export function build({ screen, variants = ["none", "banner", "corner"] }) {
  document.adoptedStyleSheets = [Object.assign(new CSSStyleSheet(), { }) ];
  const style = document.createElement("style");
  style.textContent = VARIANT_CSS;
  document.head.append(style);

  const root = document.querySelector("#mt-root");
  root.className = "mt-sheet";
  root.replaceChildren();

  for (const v of variants) {
    const sec = el("section", v === "none" ? "" : `mt-v-${v}`);
    sec.dataset.variant = v;
    sec.dataset.screen = screen;
    const label = el("div", "mt-row-label");
    label.textContent = `${screen} — ${v === "none" ? "control (today)" : v}`;
    sec.append(label, card(screen, v !== "none"));
    root.append(sec);
  }
  return root;
}

/* TODO(worktree): `card()` builds the real card chrome per screen — `phaseCard`/`PHASE_ACCENTS` from
   ../src/ui/modalStyle.jsx give the wash the emblem is screened ONTO, and importing them is what keeps
   this sheet from restating a gradient. Left unwritten here rather than guessed: it is the one part
   that wants the running dev server to iterate against, and a plausible-looking guess in it would read
   as a decision nobody made. */

export { probe, perkSamples, skillSamples, tile, head, ARCHETYPE_META, ARCHETYPE_ORDER, CATEGORIES,
         TIER_META, skillArt, perkCatArt, legendaryPerkArt, CORNER_PERK, isLegendary };
