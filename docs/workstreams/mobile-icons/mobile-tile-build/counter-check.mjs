/* Counter-check every guard this task rewrote: break the protected seam, prove the guard fails,
   restore. A guard that is merely green is not evidence (testing.md §5). */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = "C:/Code/Autostich-worktrees/mobile-tile-build";

const CASES = [
  { guard: "viewport-1280 §3 — the phone counter-edge is derived, not typed",
    file: "src/ui/useIsWide.js", from: "export const PHONE_MAX = 639.98;", to: "export const PHONE_MAX = 599.98;",
    test: "test/viewport-1280.test.js" },
  { guard: "viewport-1280 §3 — a stray fractional max-width is caught",
    file: "src/index.css", from: "@media (max-width: 639.98px) {", to: "@media (max-width: 611.98px) {",
    test: "test/viewport-1280.test.js" },
  { guard: "skill-art — the phone gate exists",
    file: "src/ui/SkillSelect.jsx", from: "const art = (wide || phone) ? skillArt(id) : null;",
    to: "const art = wide ? skillArt(id) : null;", test: "test/skill-art.test.js" },
  { guard: "skill-art — the phone gate is not a negation",
    file: "src/ui/SkillSelect.jsx", from: "const art = (wide || phone) ? skillArt(id) : null;",
    to: "const art = (wide || !wide) ? skillArt(id) : null;", test: "test/skill-art.test.js" },
  { guard: "skill-art — art switches element AND class",
    file: "src/ui/SkillSelect.jsx", from: '${art ? (wide ? " sk-offer-art" : " mc-tile") : ""}',
    to: '${art ? " sk-offer-art" : ""}', test: "test/skill-art.test.js" },
  { guard: "perk-art — the phone gate exists",
    file: "src/ui/PerkSelect.jsx", from: "const art = (inWings || onPhone) ? perkArt(v) : null;",
    to: "const art = inWings ? perkArt(v) : null;", test: "test/perk-art.test.js" },
  { guard: "perk-art — the desktop strip class survives beside the phone one",
    file: "src/ui/PerkSelect.jsx", from: "className={inWings ? `pk-strip${",
    to: "className={onPhone ? `pk-strip${", test: "test/perk-art.test.js" },
  { guard: "leg-gleich — the legendary screen does not fall behind the skill screen",
    file: "src/ui/LegendarySelect.jsx", from: "const art = (wide || phone) ? skillArt(s.id) : null;",
    to: "const art = wide ? skillArt(s.id) : null;", test: "test/leg-gleich.test.js" },
  { guard: "corner-art — the phone shows ONE ornament",
    file: "src/index.css", from: "  .co-corner-r { display: none; }", to: "  /* removed for the counter-check */",
    test: "test/corner-art.test.js" },
  { guard: "corner-art — the phone must not re-declare the ornament zone",
    file: "src/index.css", from: "  .co-corner-r { display: none; }",
    to: "  .co-corner-r { display: none; }\n  .co-corner { width: 140px; }", test: "test/corner-art.test.js" },
  { guard: "corner-art — all three screens carry the two-query gate",
    file: "src/ui/PerkSelect.jsx", from: "{(inWings || onPhone) && <CardCorners artKey={CORNER_PERK} />}",
    to: "{inWings && <CardCorners artKey={CORNER_PERK} />}", test: "test/corner-art.test.js" },
];

const results = [];
for (const c of CASES) {
  const p = join(ROOT, c.file);
  const original = readFileSync(p, "utf8");
  if (!original.includes(c.from)) {
    results.push({ ...c, verdict: "SETUP FAILED — seam text not found" });
    continue;
  }
  writeFileSync(p, original.replace(c.from, c.to), "utf8");
  let failed = false, note = "";
  try {
    execFileSync("npx", ["vitest", "run", c.test], { cwd: ROOT, stdio: "pipe", shell: true });
  } catch (e) {
    failed = true;
    note = String(e.stdout || "").split("\n").filter((l) => /FAIL|AssertionError/.test(l))[0] || "";
  } finally {
    writeFileSync(p, original, "utf8");
  }
  results.push({ guard: c.guard, seam: `${c.file}: ${c.from.slice(0, 60)}`,
                 verdict: failed ? "caught" : "MISSED — the guard stayed green", note: note.trim().slice(0, 120) });
  console.log(`${failed ? "caught " : "MISSED "} ${c.guard}`);
}

writeFileSync(join(ROOT, "docs/workstreams/mobile-icons/mobile-tile-build/visual/counter-checks.json"),
  JSON.stringify({ note: "Each rewritten guard, with the seam that was broken to prove it fails. "
    + "A guard that is merely green is not evidence (testing.md §5).", results }, null, 2));
console.log(`\n${results.filter((r) => r.verdict === "caught").length}/${results.length} caught`);
