/* #menu-rework M1 — "does the desktop rule actually beat the inline constant?", COMPUTED.
   ============================================================================

   THE INVARIANT these guards protect was never "!important is present". It is: at this element, on
   the desktop, the FLAT variant's value is what the browser uses — not the value modalStyle.jsx sets
   inline. Until M1 there was exactly one way to state that, because an inline literal beats every
   stylesheet rule, so the guards asserted the mechanism and named the reason in their message.

   There are two ways now, and the second is the better one. The constants emit `var(--token)`, so a
   rule can win by REDEFINING THE TOKEN on the element: the inline declaration reads the variable
   there and picks up the new value, with the cascade intact and no `!important` anywhere. Measured,
   three cases, planning report 2.1.

   So this helper recomputes instead of restating. It reads what the constant actually emits for the
   property — following it into modalStyle.jsx rather than hard-coding it here — and accepts either
   way of neutralising it. It still fails when NEITHER is present, which is the regression the guard
   exists to catch and the one its counter-check proves.

   DELIBERATELY NOT A CHECK FOR `var(...)`. A guard that demanded the token form would assert the new
   mechanism exactly as narrowly as the old one asserted `!important`, and the next worker who
   legitimately needs `!important` for a border WIDTH or STYLE — which no colour variable can reach —
   would have to weaken it to get their work in. That is how a ratchet turns into an obstacle.

   TYPO-12 is the reason this reads the source rather than naming the value: a guard that covers one
   spelling of a thing is a guard that is wrong the first time someone uses the other one. */

/* What `MODAL_CARD`/`MENU_PANEL`/... set for one CSS property, as written in modalStyle.jsx.
   Returns the string the JSX assigns, or null when the constant no longer sets that property at all
   — which is itself worth failing on, and the callers do. */
export function inlineValueOf(jsxSrc, constName, prop) {
  const decl = jsxSrc.match(new RegExp(`export const ${constName} = \\{([\\s\\S]*?)\\n\\};`));
  if (!decl) return null;
  const hit = decl[1].match(new RegExp(`\\b${prop}:\\s*("(?:[^"\\\\]|\\\\.)*")`));
  return hit ? JSON.parse(hit[1]) : null;
}

/* Every custom property a value reads. `1px solid var(--ed-strong)` -> ["--ed-strong"]. */
export function tokensIn(value) {
  return [...String(value || "").matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]);
}

/* Does `rule` neutralise the inline value of `prop`? Returns HOW, so a failing message can say what
   was looked for, or null when nothing does. `rule` is one CSS rule body, comments already stripped
   — a comment that mentions a property must not be able to satisfy a guard (repository hazard:
   source-text ratchets have matched their own explanations before). */
export function overridesInline(rule, prop, inlineValue) {
  if (new RegExp(`(^|[;{\\s])${prop}\\s*:[^;]*!important`).test(rule)) return "!important";
  for (const token of tokensIn(inlineValue)) {
    if (new RegExp(`(^|[;{\\s])${token}\\s*:`).test(rule)) return `redefines ${token}`;
  }
  return null;
}
