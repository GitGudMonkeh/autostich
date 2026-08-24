import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
/* #menu-rework MH2. `node:vm` is what makes the two page-side sources testable AS SOURCES: they are
   strings handed to a browser, so the honest way to check them is to execute them in a realm that is
   not this one and see what they do to it. `node:http` serves the two dist/ fixtures item 2 needs.
   Both ship with the runtime — the survey's tooling is dependency-free on purpose. */
import { createContext, runInContext } from "node:vm";
import { createServer } from "node:http";
import { fetchStubSource, freezeClockSource, runCountSource, FROZEN_MS } from "../scripts/survey-stub.mjs";
import { distBundle, servedBundle, verdict, entryOf, assertServesDist } from "../scripts/survey-bundle.mjs";

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

/* ============================================================================
   #menu-rework MH2 — THREE MORE WAYS THE INSTRUMENT LIED, one guard each.

   Same sentence as MH1, applied three times over: a check that asks whether something is PRESENT
   will eventually pass on the wrong thing. Ask whether it is the RIGHT thing.

     item 1  the survey posted real rows into `autostich_scores`. `publishRun` asked "is this a
             preview build?" where it should have asked "is this a real player?" — and the survey
             measures the production build on purpose, so the answer was always yes and the write
             was always real.
     item 2  `ensureServer()` asked "does something answer on 5181?" where it should have asked
             "does it serve MY bundle?" (M3-F09).
     item 3  the run count accumulated across cells and was neither reported nor subtractable (§8.12).

   ALL THREE ARE BEHAVIOURAL. The write barrier is executed in a sandbox and asked to let a POST
   through; the bundle check is run against real HTTP servers, one honest and one stale; the run
   counter is executed against a fake storage. None of them matches source text for its own sake —
   `testing.md`: guards verify relationships. The two structural assertions that do exist are about
   WHERE the sources are installed, which is a relationship a sandbox cannot see and which is the
   whole of M8's warning: an init script is worthless if it is installed after the module graph runs.

   Counter-checked 2026-08-25 — each seam broken deliberately, one at a time, and the guard confirmed
   red before restoring. Recorded in measurements/MH2.md.
   ============================================================================ */

describe("#menu-rework MH2 item 1 — the fetch stub is a WRITE barrier, not a read fixture", () => {
  /* Install the stub into a fresh realm with a recording `fetch` underneath it, and ask what still
     gets through. `real` is the network; anything that reaches it in these tests would have reached
     Supabase in a survey run. */
  function install({ champions = true } = {}) {
    const reached = [];
    const real = (input, init) => {
      reached.push({ url: typeof input === "string" ? input : (input && input.url), method: (init && init.method) || "GET" });
      return Promise.resolve(new Response("the real network", { status: 200 }));
    };
    const window = { fetch: real };
    const ctx = createContext({ window, Response });
    runInContext(fetchStubSource({ champions }), ctx);
    return { window, reached };
  }

  const REST = "https://uhuwgzhllnigcucmhclf.supabase.co/rest/v1/autostich_scores";

  it("a POST — the insert `publishRun` makes — never reaches the network", async () => {
    /* THE ONE THAT MATTERS. Three workers and the planner ran the survey against the live table, and
       this is the assertion that says it cannot happen again. It is written against the METHOD and
       not against the URL shape, because the plausible future regression is someone adding a
       `if (method === "GET")` fast path to "only stub reads". */
    const { window, reached } = install();
    const res = await window.fetch(REST, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ name: "SURVEY", score: 1234, level: 4, tricks: 9, cycles: 4 }),
    });
    expect(reached, "the insert left the browser — this is the live-write defect, back").toEqual([]);
    expect(res.status).toBe(200);
    const saved = await res.json();
    expect(Array.isArray(saved), "publishRun reads saved[0].id off this — it must stay an array").toBe(true);
  });

  it("and neither does a GET, whatever query it carries", async () => {
    const { window, reached } = install();
    for (const q of ["?select=*&order=score.desc&limit=20", "?board=eq.meister&limit=20", "?seed=eq.4000021&limit=1"]) {
      const res = await window.fetch(REST + q);
      expect(res.status).toBe(200);
      expect(await res.json(), `empty answer for ${q}`).not.toEqual([]);
    }
    expect(reached).toEqual([]);
  });

  it("everything that is NOT the score table still goes to the real network", () => {
    /* The other half of the barrier, and it is load-bearing: a blanket interceptor would swallow the
       bundle, the fonts and the media, and the survey would measure a blank page very reliably. */
    const { window, reached } = install();
    window.fetch("http://localhost:5181/autostich/assets/index-DCpqlujg.js");
    window.fetch("http://localhost:5181/autostich/media/deck.webp");
    expect(reached.map((r) => r.url)).toEqual([
      "http://localhost:5181/autostich/assets/index-DCpqlujg.js",
      "http://localhost:5181/autostich/media/deck.webp",
    ]);
  });

  it("the board it answers with is fixed — same bytes twice, so the row count cannot follow the network (TYPO-08)", async () => {
    const a = install(), b = install();
    const one = await (await a.window.fetch(REST + "?limit=20")).text();
    const two = await (await b.window.fetch(REST + "?limit=20")).text();
    expect(one).toBe(two);
    expect(JSON.parse(one)).toHaveLength(20);
  });

  it("the clock is pinned — and `performance.now()` deliberately is not", () => {
    /* MENU-30. Freezing the monotonic clock too would hang React's scheduler: a still screen and a
       hung one look identical in a screenshot, so the distinction is asserted rather than trusted. */
    const ctx = createContext({ window: {} });
    runInContext(freezeClockSource(), ctx);
    const now = runInContext("[window.Date.now(), new window.Date().getTime(), new window.Date(0).getTime()]", ctx);
    expect(now[0]).toBe(FROZEN_MS);
    expect(now[1], "`new Date()` reads the constructor path, which currentWeek() uses").toBe(FROZEN_MS);
    expect(now[2], "an explicit argument must still build that date").toBe(0);
    expect(freezeClockSource(), "a frozen monotonic clock is a hung scheduler, not a still screen")
      .not.toMatch(/performance/);
  });

  it("the survey installs BOTH before the module graph runs, not after the page loads", () => {
    /* The relationship a sandbox cannot see, and M8's whole warning: `leaderboard.js` reads
       `import.meta.env` at module scope, so a stub installed with `evaluate()` after a `goto()` has
       already missed the first fetch — and the first fetch is the one that seeds the board. Asserted
       on the CDP method, which is the thing that carries the ordering guarantee. */
    const src = read("scripts/viewport-survey.mjs");
    const inits = [...src.matchAll(/Page\.addScriptToEvaluateOnNewDocument", \{ source: (\w+)\(\)/g)].map((m) => m[1]);
    expect(inits, "both sources must be INIT scripts").toContain("fetchStubSource");
    expect(inits, "both sources must be INIT scripts").toContain("freezeClockSource");
    /* And they must be registered before the matrix loop starts, or the ordering guarantee is
       decorative. Anchored on the loop and not on the first `goto(` in the file: `measure()` is
       DEFINED above main and CALLED from inside it, so a position comparison against its own `goto`
       compares source order to execution order and answers the wrong question — which is how this
       assertion first read, and it failed for that reason rather than for a defect. */
    const install = src.indexOf("addScriptToEvaluateOnNewDocument");
    const loop = src.indexOf("for (const lang of langs)");
    expect(install, "an init script registered after the navigation loop has already missed a page")
      .toBeGreaterThan(0);
    expect(install).toBeLessThan(loop);
  });
});

describe("#menu-rework MH2 item 2 — the survey refuses a server that is not serving its bundle (M3-F09)", () => {
  /* Run against REAL http servers rather than a mocked fetch: the failure this replaces was a stale
     `vite preview` on a shared worktree, and a mock of `fetch` cannot be stale in the way a server is.
     Two servers, one honest and one holding an abandoned build, and the check must tell them apart. */
  const ORIGIN_BASE = "/autostich/";
  let dir, dist, servers = [];

  /* A minimal dist/: index.html naming a content-hashed entry chunk, and that chunk on disk. */
  function makeDist(tag) {
    const d = mkdtempSync(join(tmpdir(), "mh2-dist-"));
    mkdirSync(join(d, "assets"));
    const entry = `index-${tag}.js`;
    writeFileSync(join(d, "assets", entry), `/* build ${tag} */ console.log(${JSON.stringify(tag)});`);
    writeFileSync(join(d, "index.html"),
      `<!doctype html><html><head><script type="module" crossorigin src="${ORIGIN_BASE}assets/${entry}"></script></head><body></body></html>`);
    return d;
  }

  /* Serve a directory the way `vite preview --base` does, including the SPA fallback that answers a
     MISSING asset with index.html and status 200 — the exact behaviour that made a wrong `--base`
     look like a slow page rather than a broken one. */
  function serve(fromDir) {
    const srv = createServer((req, res) => {
      const path = req.url.split("?")[0];
      const rel = path.startsWith(ORIGIN_BASE) ? path.slice(ORIGIN_BASE.length) : path.replace(/^\//, "");
      const file = join(fromDir, rel || "index.html");
      if (rel && rel !== "index.html" && existsSync(file)) {
        res.writeHead(200, { "content-type": "text/javascript" });
        res.end(readFileSync(file));
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(readFileSync(join(fromDir, "index.html")));
    });
    return new Promise((r) => srv.listen(0, "127.0.0.1", () => {
      servers.push(srv);
      r(`http://127.0.0.1:${srv.address().port}`);
    }));
  }

  beforeAll(() => { dir = makeDist("AAAAAAAA"); dist = distBundle(dir); });
  afterAll(() => { for (const s of servers) s.close(); rmSync(dir, { recursive: true, force: true }); });

  it("reads the entry chunk out of index.html and hashes what is actually on disk", () => {
    expect(dist.href).toBe("/autostich/assets/index-AAAAAAAA.js");
    expect(dist.entry).toMatch(/^[0-9a-f]{16}$/);
    expect(entryOf("<html><body>no script here</body></html>"), "a document with no entry is not a build").toBe(null);
  });

  it("the honest server passes", async () => {
    const origin = await serve(dir);
    await expect(assertServesDist(origin, dir)).resolves.toMatchObject({ ok: true });
  });

  it("A STALE SERVER IS REFUSED — the same shape, a different build, and it must not be reused", async () => {
    /* M3-F09 itself. The stale directory is a complete, valid, serving build; only its bytes differ.
       `serverAlive()` was satisfied by exactly this, and the survey measured it in silence. */
    const stale = makeDist("BBBBBBBB");
    const origin = await serve(stale);
    await expect(assertServesDist(origin, dir)).rejects.toThrow(/not serving this dist/);
    const v = verdict(dist, await servedBundle(origin, dist));
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" "), "the refusal must name what mismatched, not just that something did")
      .toMatch(/index\.html differs/);
    rmSync(stale, { recursive: true, force: true });
  });

  it("and so is the SPA fallback answering 200 for an asset that is not there", async () => {
    /* The `--base` failure, and the one a status check can never catch: every asset comes back 200
       with the index document in it. Named on its own, because "the hashes differ" is a true and
       useless way to report it. */
    const half = makeDist("AAAAAAAA");
    rmSync(join(half, "assets", "index-AAAAAAAA.js"));   /* index.html intact, chunk gone */
    const origin = await serve(half);
    const v = verdict(dist, await servedBundle(origin, dist));
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/SPA fallback/);
    rmSync(half, { recursive: true, force: true });
  });

  it("the survey checks it before the first cell AND after the last", () => {
    /* The mid-run rebuild M3 lost three runs to: `vite preview` serves dist/ from disk, so a build
       landing mid-survey swaps the bundle underneath it and the matrix becomes a blend of two states
       that never existed together. One check at startup cannot see that; two can. */
    const src = read("scripts/viewport-survey.mjs");
    expect([...src.matchAll(/assertServesDist\(/g)].length,
      "before the run and after the last cell — a single check cannot see a mid-run rebuild")
      .toBeGreaterThanOrEqual(3);
    expect(src, "an inherited server must be verified, not trusted because it answers")
      .toMatch(/inherited server/);
  });
});

describe("#menu-rework MH2 item 3 — the accumulated run count is written into every cell (§8.12)", () => {
  /* The number itself is trivial. What is guarded is that it is READ rather than derived: the cells
     are not independent, `victory` writes a run and nothing clears it, so a reader of one matrix
     cannot otherwise tell a known accumulation from a regression. */
  function count(stored) {
    const store = new Map(stored === undefined ? [] : [["as_runhistory", stored]]);
    const ctx = createContext({ localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null) } });
    return runInContext(runCountSource(), ctx);
  }

  it("it reports what the history actually holds", () => {
    expect(count(undefined), "a fresh session is zero, not missing").toBe(0);
    expect(count(JSON.stringify([]))).toBe(0);
    expect(count(JSON.stringify([{ s: 1 }, { s: 2 }, { s: 3 }]))).toBe(3);
    expect(count(JSON.stringify(new Array(9).fill({}))), "the tenth cell of a full run").toBe(9);
  });

  it("an unreadable history is -1 and NOT 0 — a missing number must not read as an empty one", () => {
    expect(count("{not json")).toBe(-1);
    expect(count(JSON.stringify({ nope: true })), "an object is not a history").toBe(-1);
  });

  it("it reads the key the application writes, so it cannot drift away from it", () => {
    /* `recordRun` (storage.js:410) -> `saveRunHistory` (398) -> `as_runhistory`. A counter reading a
       key of its own invention would report 0 for ever, green and wrong. */
    expect(runCountSource()).toContain("as_runhistory");
    expect(read("src/game/storage.js"), "the key moved; the counter did not").toContain('k("as_runhistory")');
  });

  it("and the survey records it per cell — at entry and at capture, because `victory` differs between them", () => {
    const src = read("scripts/viewport-survey.mjs");
    expect(src).toMatch(/runs = \{ entry: runsAtEntry, capture: await evaluate\(c, runCountSource\(\)\) \}/);
    expect(src, "the cell written into matrix.json must carry it").toMatch(/reached: true, trace, settled, runs,/);
  });
});
