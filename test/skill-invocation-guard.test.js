import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* #skill-invocation — the three project skills must never fire on their own.

   `/create-task` creates branches and worktrees. `/cleanup-task` prints deletion commands.
   `/prepare-review` writes a handoff file. All three must run only when a human types them.

   In the command format that property was one line of frontmatter: `disable-model-invocation: true`.
   The files carried their own lock. When they moved to `.claude/skills/<name>/SKILL.md` — because the
   desktop app does not run project commands — the skill format had no such key, and the lock moved
   into `.claude/settings.json` as `skillOverrides`. It now lives in a different file from the thing it
   protects, which is exactly the arrangement that goes stale silently: add a fourth skill, forget the
   settings entry, and it is model-invocable with nobody noticing.

   This guard keeps the two files in step. It fails loudly on the realistic mistakes: a new skill with
   no override, a weakened override, or an override left behind after a skill was renamed. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = resolve(ROOT, ".claude/skills");
const SETTINGS = resolve(ROOT, ".claude/settings.json");
const REQUIRED = "user-invocable-only";

const skillNames = () =>
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(SKILLS_DIR, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();

const frontmatter = (name) => {
  const text = readFileSync(resolve(SKILLS_DIR, name, "SKILL.md"), "utf8");
  const block = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!block) return null;
  const fields = {};
  for (const line of block[1].split("\n")) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
};

const overrides = () => JSON.parse(readFileSync(SETTINGS, "utf8")).skillOverrides ?? {};

describe("#skill-invocation · project skills stay owner-invoked", () => {
  it("finds the skills it is meant to protect", () => {
    expect(skillNames().length).toBeGreaterThan(0);
  });

  it("every project skill is pinned to user-invocable-only", () => {
    const pinned = overrides();
    const unpinned = skillNames().filter((n) => pinned[n] !== REQUIRED);
    expect(unpinned).toEqual([]);
  });

  it("no override names a skill that no longer exists", () => {
    const present = new Set(skillNames());
    const stale = Object.keys(overrides()).filter((n) => !present.has(n));
    expect(stale).toEqual([]);
  });

  it("every skill declares the name it is addressed by", () => {
    const mismatched = skillNames().filter((n) => frontmatter(n)?.name !== n);
    expect(mismatched).toEqual([]);
  });
});
