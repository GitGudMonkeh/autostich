/* #menu-rework M1 — read the panel vocabulary out of index.css, and resolve a value through it.
   ============================================================================

   WHY A GUARD NEEDS THIS. Several guards compute rather than restate: they import a constant or a
   function from modalStyle.jsx, call it, and assert on the value that comes back. That is the strong
   form, and M1 would have broken it — the functions return `var(--el-halo)` now, so a regex looking
   for `rgba(224,85,85` finds nothing and the guard fails while the invariant it protects is
   perfectly intact.

   The weak repair is to assert the token NAME. That trades a check of what the card looks like for a
   check of what it is spelled, and it would pass with the token defined as `none`.

   The repair here is to follow the reference. `themeTokens()` reads the vocabulary block; `resolve()`
   substitutes until nothing is left to substitute. A guard then asserts on real numbers again, and
   gains something on top: if a token is missing from the block, or has been defined somewhere it
   cannot be read, the substitution stops and the assertion fails. One instrument, two regressions
   caught.

   THE THEME BLOCK ONLY, and that restriction is load-bearing. Custom properties are also declared on
   selectors and inside media queries — `.cz-stage` redefines `--sf-head` on purpose. Reading the
   whole file into one map would let the LAST such declaration win and quietly resolve every guard
   against the workshop's local override. */

/* Comments out first, always: a source-text guard that can be satisfied by prose in a comment is a
   guard that passes for the wrong reason, and this repository has paid for that before. */
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

export function themeTokens(cssSrc) {
  const bare = strip(cssSrc);
  const at = bare.indexOf("@theme");
  if (at < 0) return {};
  let depth = 0, start = bare.indexOf("{", at), end = -1;
  for (let j = start; j < bare.length; j++) {
    if (bare[j] === "{") depth++;
    else if (bare[j] === "}" && --depth === 0) { end = j; break; }
  }
  if (end < 0) return {};
  const map = {};
  for (const m of bare.slice(start + 1, end).matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

/* One var() reference, with an optional fallback that itself contains no parentheses — which covers
   every reference in this vocabulary, including `var(--ac-rgb, 155, 130, 240)` where the fallback is
   three comma-separated numbers rather than one value. */
const VAR = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,([^()]*))?\)/g;

export function resolve(value, map, depth = 0) {
  if (depth > 12) return String(value);   /* a cycle in the vocabulary, not an input to trust */
  let changed = false;
  const out = String(value).replace(VAR, (whole, name, fallback) => {
    if (map[name] !== undefined) { changed = true; return map[name]; }
    if (fallback !== undefined) { changed = true; return fallback.trim(); }
    return whole;   /* unknown and no fallback: leave it standing so the guard can see it */
  });
  return changed ? resolve(out, map, depth + 1) : out;
}

/* A style object as modalStyle.jsx returns it, with every var() resolved. Custom properties the
   object sets ITSELF win over the theme block — which is the whole mechanism the accent tokens use:
   `--ac-rgb` is set on the element, and --ed-accent/--el-halo/--sf-cone read it from there. */
export function resolveStyle(style, themeMap) {
  const map = { ...themeMap };
  for (const [k, v] of Object.entries(style)) if (k.startsWith("--")) map[k] = String(v);
  const out = {};
  for (const [k, v] of Object.entries(style)) out[k] = resolve(v, map);
  return out;
}
