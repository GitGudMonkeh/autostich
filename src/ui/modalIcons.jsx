/* #menu-rework M9 — the drawn characters of the three small modals.
   ============================================================================

   GEZEICHNET STATT GETIPPT, and it is the same repair `optionsBits.jsx` made for the options rows,
   for the same measured reason: a text glyph hangs on the font cut. The options set records that its
   `☾` read as a "C" under a fallback font; here it is `🖫` and `♔` in the welcome screen and
   `✕ ☁ ➤ ⓘ ⊘` in the reporter — seven characters that both design documents ask to be drawn.

   OWNER-APPROVED, 2026-08-25, and that approval is the reason this file exists at all. The house rule
   reserves new characters for the owner and the M9 contract lists new icons as a non-goal; the two
   design documents ask for them anyway. Raised rather than taken, exactly as `OptIcon`'s own set was —
   that approval stands as MENU-14 in its finding table, this one as **M9-F06**.

   WHY A SECOND FILE AND NOT SEVEN MORE PATHS IN `optionsBits.jsx`. That file belongs to the options
   screen, which M1 migrated and which this contract lists under *must not change*; a shared component
   is not M9's to edit. So the set is duplicated in SHAPE and not in CODE: same 16-px grid, same
   `viewBox`, same 1.4 stroke, same `currentColor`, same `aria-hidden`. Nothing here overrides or
   re-styles the options set, and no third variant is introduced.

   **This is a seam, and it is named rather than hidden: two icon sets with one drawing convention
   should be one set.** Neither file's owner can merge them alone — recorded as **M9-F07** for whoever
   owns both. */

/* One path each, no fills. Drawn on the same grid as `OptIcon`'s so the two sets sit at the same
   optical weight when a screen shows both — the reporter does, in its run row. */
const PATHS = {
  /* ✕ — the close control. Tighter than `optionsBits`' `mult` cross on purpose: this one sits beside
     a word in a button, not alone in a row, and the full-width X read as a multiplication sign. */
  close: "M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6",
  /* ☁ — the run reference. What travels with the report. */
  cloud: "M4.7 12.1h6.4a2.85 2.85 0 00.36-5.67A4.05 4.05 0 004 7.6a2.75 2.75 0 00.7 4.5z",
  /* ➤ — send. An arrow rather than a paper plane: the row already reads left-to-right and the arrow
     is the same idiom `telemetry` and `float` already use for direction. */
  send: "M2.8 8h9.4M8.7 4.3L12.6 8l-3.9 3.7",
  /* ⓘ — the detail hint. Circle, stem, and a separate dot, so the dot keeps its round cap. */
  info: "M8 1.7a6.3 6.3 0 100 12.6 6.3 6.3 0 000-12.6M8 7.5v3.6M8 4.8v.01",
  /* ⊘ — too short to send. The same circle as `info` with the bar through it, so the pair reads as
     one family: the hint and its refusal. */
  block: "M8 1.7a6.3 6.3 0 100 12.6 6.3 6.3 0 000-12.6M3.55 3.55l8.9 8.9",
  /* 🖫 — save. A floppy: shutter above, label below, clipped corner top-right. */
  save: "M3.4 2.7h7.1l2.5 2.5v8.1a.9.9 0 01-.9.9H3.4a.9.9 0 01-.9-.9V3.6a.9.9 0 01.9-.9zM5.5 2.7v3.5h4.9V2.7M5.5 14.2v-3.7h5v3.7",
  /* ♔ — the rank mark of the preview row. The same crown the glossary uses for the leaderboard. */
  crown: "M2.5 5.5l2.5 2.7L8 3.7l3 4.5 2.5-2.7v6.1a.9.9 0 01-.9.9H3.4a.9.9 0 01-.9-.9zM2.5 13.3h11",
};

/* No `title` and `aria-hidden`, for the reason `OptIcon` states: every one of these sits beside its own
   label, so a title would read the same words to a screen reader twice and tell a mouse nothing. The
   one character that does NOT have a visible label — the close button's — sits inside a button whose
   text is `common.close`, so it is labelled too. */
export function ModalIcon({ name, className = "" }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 16 16" className={`mi-svg ${className}`} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

