import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* ============================================================
   #typo-system — the two-layer contract, as a guard.

   The system has two layers and they must not merge:

     .ty-*      roles   — family, weight, letter-spacing, numeric variant.  NO font-size.
     --text-*   tokens  — size, and the line-height paired with it.

   WHY A GUARD AT ALL. The split is not a preference, it is forced by the cascade. `index.css` sits
   AFTER `@import "tailwindcss"` and is therefore unlayered, so every rule in it beats every utility
   regardless of specificity. A `font-size` inside a `.ty-*` role would silently override the size
   token at every call site carrying that role — hundreds of them — and nothing would look broken
   until someone edited a token and watched nothing move. That is the failure this file exists to
   make loud.

   The roles predate the tokens by six days and went in with no guard of their own. This is it.

   These assertions read `src/**` as raw text, which makes them source-text ratchets in the sense of
   AGENTS.md. They are deliberately written to check RELATIONSHIPS (does this rule carry that
   property) rather than spellings, and they take care not to match their own comments — the sample
   strings below are built at runtime rather than written out, for exactly that reason.
   ============================================================ */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
/* Comments are stripped before any rule is scanned. Two reasons, and the second one bit during
   development: a comment sitting above a rule gets swallowed into the selector capture, and this
   file's own explanatory prose would otherwise be matchable by its own assertions — the failure mode
   AGENTS.md lists under the source-text ratchet hazard. */
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, "");

/* Every `.ty-…{ … }` rule body in the stylesheet, keyed by the selector that opened it.

   The first version of this anchored on the PREVIOUS rule's closing brace, and that was wrong in a
   way worth leaving a note about: the match consumed that brace, so two rules written back to back
   could never both be found — the scan silently returned half the stylesheet. It reported zero
   roles, which is the only reason it was noticed. Matching `selector { body }` without an anchor
   has no such gap, because the previous match ends exactly where the next selector begins. */
function tyRules() {
  const out = [];
  const re = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssBare))) {
    const selector = m[1].trim();
    if (/\.ty-[a-z-]+/.test(selector)) out.push({ selector, body: m[2] });
  }
  return out;
}

describe("#typo-system — roles carry no size", () => {
  it("finds the role rules at all (guards the guard)", () => {
    const rules = tyRules();
    expect(rules.length, "no .ty-* rule found — the selector scan is broken, not the stylesheet")
      .toBeGreaterThan(5);
  });

  it("no .ty-* rule declares a font-size", () => {
    const offenders = tyRules()
      .filter((r) => /(^|[\s;{])font-size\s*:/.test(r.body))
      .map((r) => r.selector);
    expect(offenders, `a role must not set a size — the cascade makes it beat every token: ${offenders.join(", ")}`)
      .toEqual([]);
  });

  it("the roles still carry what they are FOR — family and weight", () => {
    /* The complement of the rule above. Without it, "no font-size" could be satisfied by an empty
       role, and the guard would pass while the system quietly stopped existing. */
    const roles = tyRules().filter((r) => /^\.ty-[a-z-]+$/.test(r.selector));
    expect(roles.length).toBeGreaterThan(5);
    for (const r of roles) {
      expect(r.body, `${r.selector} carries neither family nor weight`)
        .toMatch(/font-family\s*:|font-weight\s*:/);
    }
  });
});

describe("#typo-system — the tokens stay reachable", () => {
  it("@theme is plain, not `inline`", () => {
    /* `@theme inline` substitutes token values into the utilities at build time. The utilities would
       still work; what would stop working is `var(--text-…)` in the stylesheet below, because the
       custom properties would no longer be emitted onto :root. Half the system would go dead
       silently. The string is assembled here so this comment cannot satisfy the assertion. */
    const bad = "@theme" + " inline";
    expect(css.includes(bad), "@theme inline would stop emitting the custom properties the stylesheet reads")
      .toBe(false);
  });

  it("every var(--text-…) the stylesheet reads is defined in @theme", () => {
    const theme = cssBare.slice(cssBare.indexOf("@theme"), cssBare.indexOf("\n}", cssBare.indexOf("@theme")));
    const defined = new Set([...theme.matchAll(/(--text-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = new Set([...cssBare.matchAll(/var\((--text-[a-z0-9-]+)/g)].map((m) => m[1]));
    const missing = [...used].filter((t) => !defined.has(t));
    expect(missing, `read but never defined: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("#typo-system — no bare size utility survives in the JSX", () => {
  /* Card marks and board counters are sized against artwork, not reading distance (planning report
     §5 item 6). They keep their own numbers and S2 must not collapse them onto a reading band. */
  const EXEMPT = ["src/ui/CardGrid.jsx", "src/ui/Battlefield.jsx"];

  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.jsx$/.test(e)) out.push(p);
    }
    return out;
  };

  it("no arbitrary text-[Npx] outside the named exemptions", () => {
    const root = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const bad = [];
    for (const f of walk(root)) {
      const rel = f.replace(/\\/g, "/").replace(/^.*?\/src\//, "src/");
      if (EXEMPT.includes(rel)) continue;
      const src = readFileSync(f, "utf8");
      /* Strip block and line comments first: prose that QUOTES an old class name is a historical
         record, not a call site. A codemod once rewrote such a sentence and turned it into a false
         statement about what the code used to be. */
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      const hits = code.match(/\btext-\[[0-9.]+px\]/g);
      if (hits) bad.push(`${rel}: ${hits.join(" ")}`);
    }
    expect(bad, `a size belongs in a token, not at the call site:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("no NAMED scale utility either — text-xs, text-sm, text-lg …", () => {
    /* Added during integration, after this guard let one through. It only ever checked
       `text-[Npx]`, so a `text-xs` arriving from another branch would have passed silently — and one
       nearly did: `dev` still carried `text-xs` in PerkSelect.jsx while this branch had migrated the
       same line, and it took a manual grep to confirm the merge had reconciled them. A guard that
       covers half the ways to write a size is a guard that will eventually be wrong.
       The named scale is worse than the arbitrary one in one respect: it also carries a line-height,
       so reintroducing it changes two things rather than one. */
    const root = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const bad = [];
    for (const f of walk(root)) {
      const rel = f.replace(/\\/g, "/").replace(/^.*?\/src\//, "src/");
      if (EXEMPT.includes(rel)) continue;
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      const hits = code.match(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g);
      if (hits) bad.push(`${rel}: ${[...new Set(hits)].join(" ")}`);
    }
    expect(bad, `the named scale is a call-site size too — reach for a role token:\n  ${bad.join("\n  ")}`)
      .toEqual([]);
  });

  it("the exemptions are real — they still carry their own sizes", () => {
    /* If these two files ever lose their arbitrary sizes, the exemption above is stale and silently
       weakens the check for everyone else. */
    for (const rel of EXEMPT) {
      const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      expect(src, `${rel} no longer needs its exemption — remove it from the guard`)
        .toMatch(/\btext-\[[0-9.]+px\]/);
    }
  });
});

describe("#typo-system — the stylesheet reads sizes through tokens", () => {
  it("no raw px font-size remains outside the computed exemptions", () => {
    const raw = [...cssBare.matchAll(/font-size:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((v) => !v.startsWith("var(--text-"))
      /* Fit-to-box and computed sizes are not scale steps and are exempt by contract. */
      .filter((v) => !/^(clamp\(|calc\(|max\(|var\(--wm-size)/.test(v));
    expect(raw, `these should read a token: ${raw.join(", ")}`).toEqual([]);
  });
});
