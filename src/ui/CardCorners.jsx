import { cornerArt, cornerOpacity, isFiligree } from "./cornerArt.js";

/* #cornerart — the two corner ornaments of one selection card head.
   -------------------------------------------------------------------------------------------------
   ONE COMPONENT FOR BOTH SCREENS, and that is the shape of this task's answer to the unification
   question the contract left open. `.sk-strip` and `.pk-strip` stay two families because their zones
   are genuinely two zones; the corner zone is ONE zone, measured identically on the skill card and
   the perk card, so it gets one component and one CSS family. Sharing is asserted where it is true
   and declined where it is not, rather than applied as a style.

   THREE SCREENS. `artKey` is an ARCHETYPE key on the skill selection AND on the legendary phase —
   on both it follows the active tab, which is what makes the ornament information rather than
   decoration — and `CORNER_PERK` on the perk selection, which has one identity colour and therefore
   nothing to change with.

   The legendary phase deliberately takes the SAME binding as the skill screen rather than a phase
   ornament of its own: a gold variant was built and shown at the visual gate on 2026-08-22 (Q9) and
   rejected. That screen already speaks the skill screen's language — same tab row, same skill
   emblems on the cards — so it says the same thing in the corner too.

   Whether a head gets the filigree treatment (offset inward, mask starting earlier) is DERIVED from
   the key through `isFiligree`, never passed as a second prop: two inputs that must agree are two
   inputs that can disagree, and the disagreement would be a filigree corner rendered flush against
   the card's accent frame — the exact defect `docs/art/corners/README.md` warns about.

   No desktop gate in here. Both callers already hold `useIsWide()` for their own layout and pass the
   decision down, for the reason `PerkSelect.jsx` gives at its emblem: a second hook for the same
   media query is a second thing to keep in step. A missing image renders nothing at all.

   Both copies are `aria-hidden` with an empty `alt`: the ornament repeats what the active tab already
   says in text, so announcing it a third time is noise. */
export function CardCorners({ artKey }) {
  const src = cornerArt(artKey);
  if (!src) return null;
  const cls = `co-corner${isFiligree(artKey) ? " co-corner-fil" : ""}`;
  const style = { "--co-o": cornerOpacity(artKey) };
  return (
    <>
      <img src={src} alt="" aria-hidden="true" className={cls} style={style} loading="lazy" decoding="async" />
      <img src={src} alt="" aria-hidden="true" className={`${cls} co-corner-r`} style={style} loading="lazy" decoding="async" />
    </>
  );
}
