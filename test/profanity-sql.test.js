import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildSql, OUT_FILE } from "../scripts/gen-profanity-sql.mjs";
import { PATTERNS, MAX_USERNAME } from "../src/game/profanity.js";
import { BANNED_SUBSTRING, BANNED_WORD, ALLOW } from "../src/game/profanityWords.js";

/* ============================================================
   #174 — Abnahmekriterium 4: „Client- und Server-Wortliste sind konsistent."

   Eine Zusage, die niemand prüft, ist keine. Der Server-Guard liegt als eingecheckte
   .sql-Datei im Repo (er muss von Hand im Supabase-Editor eingespielt werden — im Repo
   liegt bewusst kein Service-Key), und genau deshalb kann er still veralten: jemand
   ergänzt ein Wort in profanityWords.js, vergisst `npm run gen:profanity-sql`, und ab da
   blockt das Spiel etwas, das die Datenbank durchwinkt.

   Dieser Test macht daraus einen roten Build statt einer stillen Lücke.
   ============================================================ */

const FILE = readFileSync(OUT_FILE, "utf8");

describe("profanity-sql · Client und Server-Guard driften nicht auseinander", () => {
  it("die eingecheckte .sql-Datei entspricht exakt dem aktuellen Generator-Stand", () => {
    expect(FILE, "docs/username-profanity-guard.sql ist veraltet — bitte `npm run gen:profanity-sql` laufen lassen").toBe(buildSql());
  });

  it("jedes gesperrte Wort steht als Suchmuster auch im SQL", () => {
    const missing = [...PATTERNS.substring, ...PATTERNS.word].filter((p) => !FILE.includes(`'${p}'`));
    expect(missing, `Muster fehlen im Server-Guard: ${missing.join(", ")}`).toEqual([]);
  });

  it("jeder Whitelist-Eintrag steht wörtlich auch im SQL", () => {
    const missing = PATTERNS.allow.filter((w) => !FILE.includes(`'${w}'`));
    expect(missing, `Whitelist-Einträge fehlen im Server-Guard: ${missing.join(", ")}`).toEqual([]);
  });

  it("der Server kennt keine Wörter, die der Client nicht kennt", () => {
    const inSql = [...FILE.matchAll(/^\s{4}'([^']+)',?$/gm)].map((m) => m[1]);
    const known = new Set([...PATTERNS.substring, ...PATTERNS.word, ...PATTERNS.allow]);
    const extra = inSql.filter((w) => !known.has(w));
    expect(extra, `Nur im SQL, nicht im Client: ${extra.join(", ")}`).toEqual([]);
  });

  it("die Listen sind vollständig übertragen (keine stille Kürzung)", () => {
    const inSql = [...FILE.matchAll(/^\s{4}'([^']+)',?$/gm)].map((m) => m[1]);
    expect(new Set(inSql).size).toBe(PATTERNS.substring.length + PATTERNS.word.length + PATTERNS.allow.length);
    expect(BANNED_SUBSTRING.length + BANNED_WORD.length + ALLOW.length).toBeGreaterThan(0);
  });

  it("die Längengrenze ist dieselbe", () => {
    expect(FILE).toContain(`> ${MAX_USERNAME} then return false`);
  });

  it("der Trigger hängt am richtigen Tisch und feuert vor dem Insert", () => {
    expect(FILE).toMatch(/before insert on public\.autostich_scores/);
    expect(FILE).toMatch(/for each row execute function public\.check_username_clean\(\)/);
  });

  it("das Einspielen ist idempotent — kein `create table`, kein Datenverlust", () => {
    expect(FILE).toContain("drop trigger if exists");
    expect(FILE).not.toMatch(/\b(drop|truncate|delete\s+from)\s+table\b/i);
    expect(FILE).not.toMatch(/\bcreate\s+table\b/i);
  });
});
