import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/* ============================================================================
   #menu-rework MH1 — THE HARNESS TELLS THE TRUTH ABOUT ITSELF.

   Two guards, for the two ways a measuring tool lies without ever being wrong.

   1. IT TRUNCATES. `surface-delta.mjs` printed 200 of 410 deltas, and 40 of the unmatched nodes. The
      cap cut in the key's sort order, so what survived was a CONTIGUOUS SLICE of a sorted list —
      which is indistinguishable from a pattern. Read as complete it said "deltas only in German, a
      hole at 1920x1080": a finding that did not exist and that only re-aggregating caught (MENU-55).

   2. IT DOES NOT NAME ITS BLIND SPOT. The survey captures surfaces in their resting state; no cell
      renders a segment control selected, hovered, focused or disabled (MENU-56). A green gate that
      does not say so feigns coverage it never had.

   THE FIRST GUARD IS BEHAVIOURAL RATHER THAN A TEXT MATCH, and here that is the difference between a
   guard and a spelling check (testing.md — guards verify relationships). It builds two matrices whose
   delta count is well over both old caps, runs the real script, and demands every single delta back.
   A cap reintroduced for any reason at all fails it, whatever the source happens to look like.

   THE SECOND IS A SOURCE READ, because the subject IS prose: a sentence in a header and a line the
   script prints. Both halves are checked — the header where a maintainer looks, and the stdout line
   where a READER OF THE OUTPUT looks, which is the half MENU-56 actually asks for. The stdout half is
   taken from a real run, so it cannot pass on a sentence that sits in the source but never reaches
   a reader.

   Counter-checked 2026-08-24 — each seam broken deliberately, one at a time, and the guard confirmed
   red before restoring. Recorded in measurements/MH1.md.
   ============================================================================ */

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const DELTA = fileURLToPath(new URL("scripts/surface-delta.mjs", root));
const SURFACES_ONLY = "Surfaces only. Control states are not captured and are verified by hand.";

/* One probe row. `p` is the structural path; the twelve properties plus the box are what the gate
   compares, so a row differing in exactly one of them is exactly one delta. */
const row = (p, over = {}) => ({
  p, bg: "rgb(0, 0, 0)", bi: "none", bo: "none", bc: "rgb(1, 1, 1)", bw: "1px", bs: "solid",
  rd: "0px", sh: "none", pd: "0px", ol: "none", op: "1", cl: "rgb(2, 2, 2)",
  box: [0, 0, 10, 10], ...over,
});

/* Run the real script against two fixture directories and hand back stdout plus the exit code.
   Deltas make it exit 1, which is the CORRECT outcome — the gate failing is what we asked it for. */
function runDelta(cells) {
  const dir = mkdtempSync(join(tmpdir(), "mh1-delta-"));
  try {
    for (const [name, m] of [["before", cells.A], ["after", cells.B]]) {
      mkdirSync(join(dir, name));
      writeFileSync(join(dir, name, "matrix.json"), JSON.stringify(m));
    }
    try {
      return { out: execFileSync(process.execPath, [DELTA, join(dir, "before"), join(dir, "after")],
        { encoding: "utf8" }), code: 0 };
    } catch (e) {
      return { out: String(e.stdout || ""), code: e.status };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* Deltas spread over MANY cells and both ends of every axis. The spread is the point: a cap keeping
   the first 200 in key order drops a whole language and a whole size, which is precisely the shape of
   the finding MENU-55 nearly manufactured. */
const LANGS = ["de", "en"];
const SIZES = ["1280x720", "1920x1080"];
const SURF = ["hub", "options", "shop-fx", "stats", "upgrades", "victory"];
const PER_CELL = 12;

function matrices() {
  const A = { cells: {} }, B = { cells: {} };
  const expected = [];
  for (const lang of LANGS) for (const size of SIZES) for (const s of SURF) {
    const key = `${lang}/${size}/${s}`;
    const a = [], b = [];
    for (let i = 0; i < PER_CELL; i++) {
      const p = `body>div:nth-child(${i + 1})`;
      a.push(row(p));
      /* Exactly one property differs per node, so each node yields exactly one delta and the
         expected count is knowable without trusting the script that is under test. */
      const v = i + 1;   /* from 1, so node 0 differs too — at 0 it would equal `before` and be no delta */
      b.push(row(p, { bg: `rgb(${v}, ${v}, ${v})` }));
      expected.push({ key, p, to: `rgb(${v}, ${v}, ${v})` });
    }
    A.cells[key] = { reached: true, surface: a, tokens: {} };
    B.cells[key] = { reached: true, surface: b, tokens: {} };
  }
  return { A, B, expected };
}

describe("#menu-rework MH1 — surface-delta.mjs withholds nothing", () => {
  let out = "", code = 0, expected = [];

  beforeAll(() => {
    const { A, B, expected: exp } = matrices();
    expected = exp;
    ({ out, code } = runDelta({ A, B }));
  });

  it("the fixture is larger than both caps that used to be here — otherwise it proves nothing", () => {
    /* 288 deltas against the old cap of 200. A fixture UNDER the cap would pass whether or not the
       cap exists, which is the quiet way a guard like this becomes decoration. */
    expect(expected.length).toBeGreaterThan(200);
  });

  it("it fails, and it states how many it found", () => {
    expect(code).toBe(1);
    expect(out).toMatch(new RegExp(`${expected.length} computed delta\\(s\\)`));
  });

  it("EVERY delta reaches the output — not a slice of them", () => {
    const missing = expected.filter((d) => {
      const at = out.indexOf(`${d.key}\n      ${d.p}  bg\n`);
      return at < 0 || !out.slice(at, at + 200).includes(`after : ${d.to}`);
    });
    expect(missing.map((d) => `${d.key} ${d.p}`),
      "withheld silently — the defect MENU-55 nearly turned into a finding").toEqual([]);
  });

  it("no elision marker survives anywhere in the output", () => {
    /* The old shape was `… and N more`. Any spelling of it means a list stopped early. */
    expect(out).not.toMatch(/(?:…|\.\.\.)\s*and\s+\d+\s+more/);
  });

  it("every language, size and surface reaches the output — no axis is silently absent", () => {
    /* The exact false reading MENU-55 produced: a contiguous slice of a sorted list looks like a
       missing language or a missing size. Each axis value must appear on its own. */
    for (const lang of LANGS) expect(out, `language ${lang} absent`).toContain(`${lang}/`);
    for (const size of SIZES) expect(out, `size ${size} absent`).toContain(`/${size}/`);
    for (const s of SURF) expect(out, `surface ${s} absent`).toContain(`/${s}`);
  });

  it("the distribution is stated rather than left to the eye", () => {
    /* Printing all 288 in full is necessary and not sufficient: 288 lines are still read by eye, and
       an eye reading a long list infers a distribution. The census states it instead. */
    expect(out).toContain("distribution of the");
    for (const axis of ["by cell:", "by lang:", "by size:", "by surface:", "by property:"]) {
      expect(out, `census axis missing: ${axis}`).toContain(axis);
    }
    /* And it must be the REAL distribution, not a plausible-looking one. Two languages, two sizes,
       six surfaces, twelve nodes each: 144 per language, 144 per size, 48 per surface, all on `bg`. */
    expect(out).toMatch(/by lang:\s+(?:de=144\s+en=144|en=144\s+de=144)/);
    expect(out).toMatch(/by property:\s+bg=288/);
    expect(out).toMatch(/by surface:\s+(?:\S+=48\s*){6}/);
  });

  it("the output names its blind spot on a run that FAILED, too", () => {
    expect(out).toContain(SURFACES_ONLY);
  });
});

describe("#menu-rework MH1 — the unmatched-node list withholds nothing either", () => {
  /* THE SECOND CAP, and it is the one easy to forget. `realUnmatched` stopped at 40 with the same
     `… and N more` tail, on the same sorted order, with the same consequence: a node that stopped
     painting is a moved pixel, and forty of them printed out of sixty reads as "only these forty".
     Guarded separately because the delta fixture above produces no unmatched nodes at all — a guard
     that never exercises a list cannot notice a cap on it. */
  const EXTRA = 60;
  let out = "", code = 0;

  beforeAll(() => {
    /* `hub` deliberately: NOT one of the two pre-registered surfaces (leaderboard, victory), whose
       node set is allowed to differ. Those are counted apart and would never reach this list. */
    const key = "de/1280x720/hub";
    const a = [row("body>div")];
    const b = [row("body>div")];
    for (let i = 0; i < EXTRA; i++) b.push(row(`body>span:nth-child(${i + 1})`));
    ({ out, code } = runDelta({
      A: { cells: { [key]: { reached: true, surface: a, tokens: {} } } },
      B: { cells: { [key]: { reached: true, surface: b, tokens: {} } } },
    }));
  });

  it("the fixture is larger than the cap that used to be here", () => {
    expect(EXTRA).toBeGreaterThan(40);
  });

  it("it fails on them — an unmatched node outside H-c is a moved pixel", () => {
    expect(code).toBe(1);
    expect(out).toMatch(new RegExp(`${EXTRA} elsewhere`));
  });

  it("EVERY unmatched node reaches the output", () => {
    const missing = [];
    for (let i = 0; i < EXTRA; i++) {
      const p = `body>span:nth-child(${i + 1})`;
      if (!out.includes(`de/1280x720/hub  ${p}  (only in after)`)) missing.push(p);
    }
    expect(missing, "unmatched nodes withheld silently").toEqual([]);
  });

  it("and its distribution is stated too", () => {
    expect(out).toMatch(/by surface:\s+hub=60/);
    expect(out).toMatch(/by side:\s+only in after=60/);
  });
});

describe("#menu-rework MH1 — the green run names the blind spot as loudly as the red one", () => {
  it("zero deltas, exit 0, and the limitation still printed", () => {
    /* The case that matters most, and the easy one to get wrong: a gate that discloses its blind spot
       only when it fails reassures precisely when it is trusted. */
    const m = { cells: { "de/1280x720/hub": { reached: true, surface: [row("body>div")], tokens: {} } } };
    const { out, code } = runDelta({ A: m, B: JSON.parse(JSON.stringify(m)) });

    expect(code).toBe(0);
    expect(out).toContain("ZERO computed deltas");
    expect(out, "a green gate that hides its blind spot feigns coverage").toContain(SURFACES_ONLY);
  });
});

describe("#menu-rework MH1 — the survey says what it does not capture (MENU-56)", () => {
  it("viewport-survey.mjs carries the limitation in its header", () => {
    /* Where the maintainer looks. Matched on the load-bearing half of the sentence rather than on
       the whole paragraph, so rewording the rationale around it does not break the guard while
       deleting the statement itself still does. */
    const src = read("scripts/viewport-survey.mjs");
    expect(src.toLowerCase(), "the survey must say it captures surfaces and not control states")
      .toContain("control states are not captured");
    expect(src).toMatch(/surfaces only/i);
    expect(src, "MENU-56 is the finding this paragraph answers").toContain("MENU-56");
  });

  it("the sentence is a PRINTED line in surface-delta.mjs, not only prose", () => {
    /* The half that does the work. A limitation living in a header is read by whoever maintains the
       tool; MENU-56 asks for the one that reaches whoever reads the OUTPUT. Checked against the write
       calls specifically, so it cannot pass while sitting in a comment that nobody ever prints. */
    const src = read("scripts/surface-delta.mjs");
    const printed = [...src.matchAll(/out\.write\(`([^`]*)`/g)].map((m) => m[1]).join("\n");
    expect(printed, "the limitation is written down but never printed").toContain(SURFACES_ONLY);
  });
});
