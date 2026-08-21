import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TEST_VIEWPORTS, TEST_VIEWPORT_OFF, HARNESS_PARAM, HARNESS_PARAM_OFF,
  findTestViewport, harnessSuppressed, harnessFrameSrc, activeTestViewport,
  optionValue, reloadAfterViewportChange,
} from "../src/ui/testViewport.js";

/* ============================================================
   #400 Test viewport — the preview-only viewport harness.

   Why the harness is an iframe and not a sized container: the desktop layout is dimensioned from the
   REAL viewport — `@media (min-width: 1400px)`, several `max-height` blocks, and the `100vw`/`100dvh`
   chain behind `--rn-w`/`--bf-w`. None of those can be scoped to a container, so a fixed-size box
   inside a large window keeps evaluating the large window. An iframe content box IS a viewport, so
   everything resolves by itself and the application needs no knowledge of the harness.

   What is guarded here, and in which of the two families (docs/engineering/testing.md §6):

     1. The table and the pure functions — computed, not transcribed. The four sizes are the single
        deliberate transcription in the whole feature; everything derived from them is recomputed.
     2. The preview gate, BEHAVIOURALLY: the options row is rendered with VITE_PREVIEW stubbed on and
        off, and must appear and vanish with it. That is stronger than any spelling check — it proves
        the gate actually controls the render. It does NOT prove the minifier drops the branch from a
        built artefact; nothing in a unit suite can. `scripts/check-preview-exclusion.mjs` does that,
        on `dist/`.
     3. The structural safety of the harness shell — no transform/filter/zoom family, no
        `fixed inset-0`, content-box sizing. COMMENT-STRIPPED, and that is mandatory here: the shell's
        own header comment names every forbidden property in order to explain why it carries none of
        them. A raw-text guard would match its own rationale (testing.md §7).
     4. That "off" still takes the boot path this repository has always taken.

   Counter-check performed 21.08.2026 — see the report accompanying T1. Each seam below was broken
   deliberately, one at a time, and the guard was confirmed to fail before being restored.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
/* The established idiom for "this value must be ABSENT" guards. Both files below carry rationale
   comments that name the forbidden spellings on purpose. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const harnessSrc = read("src/ui/TestViewportHarness.jsx");
const mainSrc = read("src/main.jsx");
const optionsSrc = read("src/ui/OptionsModal.jsx");

describe("#400 · die Größentabelle", () => {
  /* The ONE deliberate transcription of the feature. The four sizes are a product decision
     (task contract §7) and have to be written down a second time somewhere, or the guard would only
     ask the table whether it agrees with itself. Everything below this test recomputes.
     2560×1440 is a validation size, not a fourth layout tier. */
  it("führt genau die vier freigegebenen Größen", () => {
    expect(TEST_VIEWPORTS.map((v) => [v.w, v.h]))
      .toEqual([[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]]);
  });

  it("leitet id und Beschriftung aus den Maßen ab, statt sie ein zweites Mal zu führen", () => {
    // Eine id, die von ihren Maßen abweicht, wäre im gespeicherten Profil nicht mehr zu erkennen.
    for (const v of TEST_VIEWPORTS) {
      expect(v.id).toBe(`${v.w}x${v.h}`);
      expect(v.label).toBe(`${v.w} × ${v.h}`);
    }
  });

  it("die ids sind eindeutig", () => {
    expect(new Set(TEST_VIEWPORTS.map((v) => v.id)).size).toBe(TEST_VIEWPORTS.length);
  });
});

describe("#400 · die reinen Funktionen", () => {
  it("findTestViewport findet jede Größe und sonst nichts", () => {
    for (const v of TEST_VIEWPORTS) expect(findTestViewport(v.id)).toBe(v);
    for (const bad of [null, undefined, "", "0x0", "1280x721", "aus", TEST_VIEWPORT_OFF]) {
      expect(findTestViewport(bad), `${String(bad)} darf keine Größe sein`).toBeNull();
    }
  });

  it("optionValue schreibt nur bekannte Größen ins Profil, sonst null", () => {
    for (const v of TEST_VIEWPORTS) expect(optionValue(v.id)).toBe(v.id);
    // Kein drittes Zwischending: „aus" ist im Profil `null`, nicht der leere String.
    for (const bad of [TEST_VIEWPORT_OFF, "quatsch", undefined, null]) expect(optionValue(bad)).toBeNull();
  });

  it("harnessSuppressed erkennt genau das Dokument INNERHALB des Rahmens", () => {
    expect(harnessSuppressed(`?${HARNESS_PARAM}=${HARNESS_PARAM_OFF}`)).toBe(true);
    expect(harnessSuppressed(`?fxs=0.5&${HARNESS_PARAM}=${HARNESS_PARAM_OFF}`)).toBe(true);
    for (const s of ["", "?", "?fxs=0.5", `?${HARNESS_PARAM}=an`, undefined, null]) {
      expect(harnessSuppressed(s), `${String(s)} darf die App nicht unterdrücken`).toBe(false);
    }
  });

  it("harnessFrameSrc setzt die Rekursionsbremse und trägt die übrigen Parameter mit", () => {
    /* Die Bremse muss IMMER stehen — ohne sie baut die App im Rahmen den nächsten Rahmen.
       Und sie muss die übrigen Parameter behalten: `?fxs=` ist genau der Regler, den man dreht,
       während man auf einen festen Viewport schaut. Fiele er still weg, behauptete ein
       Bildschirmfoto, mit Standardauflösung entstanden zu sein. */
    const plain = new URLSearchParams(harnessFrameSrc("/", "").split("?")[1]);
    expect(plain.get(HARNESS_PARAM)).toBe(HARNESS_PARAM_OFF);

    const kept = new URLSearchParams(harnessFrameSrc("/autostich/", "?fxs=0.5&hz=30").split("?")[1]);
    expect(kept.get("fxs")).toBe("0.5");
    expect(kept.get("hz")).toBe("30");
    expect(kept.get(HARNESS_PARAM)).toBe(HARNESS_PARAM_OFF);

    // Ein bereits gesetztes vp wird überschrieben, nicht verdoppelt.
    const forced = harnessFrameSrc("/", `?${HARNESS_PARAM}=an`);
    expect(new URLSearchParams(forced.split("?")[1]).getAll(HARNESS_PARAM)).toEqual([HARNESS_PARAM_OFF]);

    expect(harnessFrameSrc("/autostich/", "").startsWith("/autostich/?")).toBe(true);
  });

  it("activeTestViewport ist die eine Boot-Entscheidung — und im Rahmen immer null", () => {
    const opts = { testViewport: "1600x900" };
    expect(activeTestViewport(opts, "")).toBe(findTestViewport("1600x900"));
    // Die Rekursionsbremse schlägt die gespeicherte Wahl. Ohne diese Zeile baut der Rahmen Rahmen.
    expect(activeTestViewport(opts, `?${HARNESS_PARAM}=${HARNESS_PARAM_OFF}`)).toBeNull();
    for (const o of [{}, null, undefined, { testViewport: null }, { testViewport: "0x0" }]) {
      expect(activeTestViewport(o, "")).toBeNull();
    }
  });
});

describe("#400 · das Umschalten lädt neu, aber nicht zu früh", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reloadAfterViewportChange lädt ERST nach dem React-Flush neu", () => {
    /* Kein Schreibweisen-Test, sondern das Verhalten: `onChange` schreibt über einen React-State-
       Updater, und der läuft erst beim Flush am Ende des Klick-Handlers. Ein sofortiges reload() käme
       davor — die gewählte Größe wäre nie gespeichert, und der Schalter sähe genau einmal pro
       Änderung kaputt aus. Deshalb muss der Aufruf die Task-Queue abwarten. */
    const reload = vi.fn();
    reloadAfterViewportChange({ location: { reload } });
    expect(reload, "reload lief SYNCHRON — die Wahl wäre noch nicht gespeichert").not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("lädt das OBERSTE Dokument neu, nicht den Rahmen, aus dem geklickt wurde", () => {
    /* Regression, am Gerät gefunden (21.08.2026): Die Zeile ist aus ZWEI Dokumenten erreichbar — aus
       der normalen App und aus der App IM Rahmen. Im zweiten Fall ist `window` der Iframe. Wer den
       neu lädt, lädt nur `?vp=off` neu; das Top-Dokument liest die Option nie erneut, und der Rahmen
       behält seine alte Größe. Folge: ab der ersten Wahl wirkt KEINE weitere mehr — auch „Aus" nicht,
       man kommt also nicht mehr heraus. Sichtbar wurde es als „jede Auflösung zeigt mobil", weil die
       zuerst gewählte Größe (1280) unter dem Bruchpunkt liegt und einfach stehen blieb.
       Beide Wächter davor waren blind: der eine reichte ein Fenster OHNE Rahmen herein, der andere
       setzte localStorage direkt statt zu klicken. */
    const topReload = vi.fn(), frameReload = vi.fn();
    const top = { location: { reload: topReload } };
    const frame = { location: { reload: frameReload }, top };
    reloadAfterViewportChange(frame);
    vi.runAllTimers();
    expect(topReload, "das oberste Dokument muss neu laden").toHaveBeenCalledTimes(1);
    expect(frameReload, "der Rahmen darf NICHT allein neu laden").not.toHaveBeenCalled();
  });

  it("im obersten Dokument ist `top` es selbst — dort ändert sich nichts", () => {
    const reload = vi.fn();
    const w = { location: { reload } };
    w.top = w; // wie im Browser, wenn kein Rahmen darum ist
    reloadAfterViewportChange(w);
    vi.runAllTimers();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("überlebt ein `top`, das nicht lesbar ist (cross-origin)", () => {
    // Kann hier nicht auftreten (same-origin), aber ein Wurf an dieser Stelle würde den Schalter
    // komplett tot machen — der Rückfall muss das eigene Fenster nehmen, statt zu sterben.
    const reload = vi.fn();
    const w = { location: { reload } };
    Object.defineProperty(w, "top", { get() { throw new Error("cross-origin"); } });
    expect(() => { reloadAfterViewportChange(w); vi.runAllTimers(); }).not.toThrow();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ohne Fenster passiert nichts (kein Absturz im statischen Render)", () => {
    expect(() => reloadAfterViewportChange(null)).not.toThrow();
  });
});

describe("#400 · der Rahmen trägt exakt die Maße der Tabelle", () => {
  /* Der Rahmen wird wirklich gerendert und nachgemessen, statt seine Zahlen im Test noch einmal
     abzutippen. Die Komponente liest `window` (Suchstring + Pixeldichte); die Node-Umgebung hat keins,
     also wird eins gestellt. */
  let TestViewportHarness;
  beforeAll(async () => {
    globalThis.window = { location: { search: "" }, devicePixelRatio: 2 };
    ({ TestViewportHarness } = await import("../src/ui/TestViewportHarness.jsx"));
  });
  afterAll(() => { delete globalThis.window; });

  it("jede Größe der Tabelle landet unverändert am iframe", () => {
    for (const v of TEST_VIEWPORTS) {
      const html = renderToStaticMarkup(createElement(TestViewportHarness, { vp: v }));
      expect(html, `${v.id}: width-Attribut`).toContain(`width="${v.w}"`);
      expect(html, `${v.id}: height-Attribut`).toContain(`height="${v.h}"`);
      expect(html, `${v.id}: width im Stil`).toMatch(new RegExp(`width:\\s*${v.w}px`));
      expect(html, `${v.id}: height im Stil`).toMatch(new RegExp(`height:\\s*${v.h}px`));
      expect(html, `${v.id}: Beschriftung`).toContain(v.label);
    }
  });

  it("der Rahmen misst content-box und hat KEINEN Rahmen im Layout", () => {
    /* Die zwei Pixel, die alles entwerten würden: index.css setzt `* { box-sizing: border-box }`
       global, und dieses Dokument lädt index.css wie jedes andere. Unter border-box ginge ein 1-px-
       Rand VON der angegebenen Größe ab — der simulierte Viewport wäre still 1278 statt 1280 px breit.
       Die sichtbare Haarlinie ist deshalb ein `outline`, das keinen Layout-Platz belegt. */
    const html = renderToStaticMarkup(createElement(TestViewportHarness, { vp: TEST_VIEWPORTS[0] }));
    expect(html).toMatch(/box-sizing:\s*content-box/);
    expect(html, "ein Rand im Layout verkleinert den simulierten Viewport").toMatch(/border:\s*0/);
    expect(html, "die Haarlinie muss ein outline sein").toMatch(/outline:/);
  });

  it("zeigt die Pixeldichte des Monitors an — sie wird NICHT simuliert", () => {
    // Ohne diese Zahl sagt kein Bildschirmfoto, bei welcher Pixeldichte es entstanden ist.
    const html = renderToStaticMarkup(createElement(TestViewportHarness, { vp: TEST_VIEWPORTS[0] }));
    expect(html).toMatch(/DPR\s*2/);
  });
});

describe("#400 · die Hülle kann Overlays nicht brechen", () => {
  const bare = stripComments(harnessSrc);

  it("trägt keine Eigenschaft, die einen Containing Block für `position: fixed` erzeugt", () => {
    /* #overlay-portal: `transform`, `filter`, `backdrop-filter`, `perspective`, `contain` und
       `will-change` darauf machen ein Element zum Containing Block für `position: fixed`-Nachfahren;
       `zoom` skaliert deren Koordinatensystem gleich mit (beides im Projekt gemessen). Die App läuft
       zwar in einem EIGENEN Dokument und wäre davon gar nicht betroffen — aber die Hülle ist die
       Stelle, an der jemand später „nur kurz" einen Blur ergänzt, und dann stimmt die Aussage nicht
       mehr, dass der Harness am Layout nichts ändert. */
    const verboten = [
      "transform", "filter", "backdropFilter", "backdrop-filter", "zoom",
      "perspective", "contain", "willChange", "will-change",
    ];
    const gefunden = verboten.filter((p) => new RegExp(`\\b${p}\\b`).test(bare));
    expect(gefunden, `verbotene Eigenschaft in der Harness-Hülle: ${gefunden.join(", ")}`).toEqual([]);
  });

  it("ist kein Vollbild-Overlay und umgeht den Portal-Helfer nicht", () => {
    /* ROH geprüft, nicht kommentarbereinigt — und der Unterschied zum Test darüber ist der ganze
       Punkt (testing.md §6): test/overlay-nesting.test.js liest den Quelltext MIT Kommentaren und
       verlangt für jede Fundstelle ein Portal. Ein Kommentar, der die Klassen nur ERWÄHNT, meldet
       diese Datei dort als unportaliertes Overlay. Genau das ist am 21.08.2026 passiert, als der
       Kopfkommentar dieser Hülle erklärte, dass sie die Klassen nicht benutzt.
       Dieser Wächter spiegelt deshalb die Semantik des anderen, statt eine mildere zu wählen — sonst
       zeigte er grün, während die Suite rot ist. Eine dritte Ausnahme in jener Liste wäre die stille
       Aufweichung, gegen die beide existieren. */
    expect(harnessSrc, "auch in einem Kommentar nicht — der andere Wächter liest roh")
      .not.toMatch(/fixed inset-0/);
    expect(harnessSrc).not.toMatch(/createPortal/);
  });

  it("rendert die App NICHT im äußeren Dokument", () => {
    // Zwei Instanzen wären zwei Spielstände, die sich gegenseitig über denselben localStorage schreiben.
    expect(bare).not.toMatch(/<Autostich/);
    expect(bare).not.toMatch(/from "\.\.\/App\.jsx"/);
  });
});

describe("#400 · das Preview-Gate", () => {
  const bareMain = stripComments(mainSrc);
  const bareOptions = stripComments(optionsSrc);
  const GATE = 'import.meta.env.VITE_PREVIEW === "1"';

  it("main.jsx entscheidet nur hinter dem Gate", () => {
    /* Quelltext-Ratsche, und das ist hier die ehrliche Wahl (testing.md §4): dass ein BUILD den Zweig
       entfernt, kann eine Unit-Suite nicht zeigen — das tut scripts/check-preview-exclusion.mjs am
       fertigen dist/. Geprüft wird die Verdrahtung: die Entscheidung hängt am Gate. */
    expect(bareMain).toMatch(
      new RegExp(GATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\?\\s*activeTestViewport\\("),
    );
    expect((bareMain.match(/activeTestViewport\(/g) || []).length,
      "activeTestViewport darf genau einmal gerufen werden — hinter dem Gate").toBe(1);
  });

  it("main.jsx importiert die Hülle NUR dynamisch", () => {
    /* Ein statischer Import zöge die Hülle in den Modulgraphen jedes Builds und ließe die Entfernung
       allein am Tree-Shaking hängen. Dynamisch, innerhalb eines Zweigs, der bei fehlendem
       VITE_PREVIEW statisch `false` ist, verschwindet sie mitsamt ihrem Chunk. */
    expect(bareMain, "statischer Import der Harness-Hülle").not.toMatch(/^import .*TestViewportHarness/m);
    /* Auf den MODULPFAD ankern, nicht auf den Namen: `mountTestViewportHarness` trägt ihn als
       Teilstring, und ein Zähler auf dem blanken Namen zählte den Aufruf mit. Jede Nennung des Moduls
       muss ein dynamisches `import(` sein. */
    const stellen = [...bareMain.matchAll(/TestViewportHarness\.jsx/g)].map((m) => m.index);
    expect(stellen.length, "die Hülle wird in main.jsx gar nicht mehr geladen").toBe(1);
    for (const i of stellen) {
      expect(bareMain.slice(Math.max(0, i - 20), i), "Modulpfad ohne dynamisches import(").toContain("import(");
    }
    expect(bareMain).toMatch(/import\("\.\/ui\/TestViewportHarness\.jsx"\)/);
  });

  it("„Aus“ nimmt weiterhin den bisherigen Boot-Pfad", () => {
    // Der else-Zweig ist die Zeile, die diese Datei immer hatte. Ändert sie sich, ändert sich das
    // Verhalten JEDES Produktionsbuilds — nicht nur das des Harness.
    expect(bareMain).toMatch(/else\s*\{\s*createRoot\(rootEl\)\.render\(<Autostich \/>\);\s*\}/);
  });

  it("OptionsModal.jsx hält alle Harness-Fundstellen INNERHALB des einen Gates", () => {
    /* Gerechnet, nicht geraten: der JSX-Ausdrucksbehälter des Gates wird über die Klammertiefe
       abgesteckt, und jede Fundstelle muss darin liegen. Eine Zeile, die aus dem Block herausrutscht,
       fällt damit auf — auch wenn sie im Text zufällig nach dem Gate steht. */
    const at = bareOptions.indexOf("{" + GATE);
    expect(at, "das Preview-Gate steht nicht mehr in OptionsModal.jsx").toBeGreaterThan(-1);
    expect((bareOptions.match(/import\.meta\.env\.VITE_PREVIEW/g) || []).length,
      "genau EIN Gate — ein zweites ist eine zweite Stelle zum Vergessen").toBe(1);

    let tiefe = 0, ende = -1;
    for (let i = at; i < bareOptions.length; i++) {
      if (bareOptions[i] === "{") tiefe++;
      else if (bareOptions[i] === "}" && --tiefe === 0) { ende = i; break; }
    }
    expect(ende, "der Gate-Block ist nicht geschlossen").toBeGreaterThan(at);

    for (const marke of ["options.testvp.title", "options.testvp.desc", "options.testvp.off",
      "TEST_VIEWPORTS", "TEST_VIEWPORT_OFF", "optionValue(", "reloadAfterViewportChange("]) {
      const alle = [...bareOptions.matchAll(new RegExp(marke.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))]
        .map((m) => m.index)
        // Die Import-Zeile am Kopf ist die eine erlaubte Fundstelle außerhalb.
        .filter((i) => !/^import .*testViewport\.js";$/m.test(bareOptions.slice(bareOptions.lastIndexOf("\n", i) + 1, bareOptions.indexOf("\n", i))));
      expect(alle.length, `${marke} kommt in OptionsModal.jsx gar nicht vor`).toBeGreaterThan(0);
      const draussen = alle.filter((i) => i < at || i > ende);
      expect(draussen, `${marke} steht AUSSERHALB des Preview-Gates`).toEqual([]);
    }
  });
});

describe("#400 · das Gate schaltet die Zeile wirklich", () => {
  /* Der stärkste Beweis, den eine Unit-Suite führen kann: das Optionen-Overlay wird zweimal
     gerendert, einmal mit gesetztem VITE_PREVIEW und einmal ohne, und die Zeile muss mit ihm
     erscheinen und verschwinden. Das ist Verhalten, keine Schreibweise — ein Gate, das dasteht, aber
     nichts steuert, fällt hier auf. Was es NICHT beweist: dass der Minifier den Zweig aus dem Build
     wirft. Dafür gibt es scripts/check-preview-exclusion.mjs. */
  let OptionsModal, DEFAULT_OPTIONS, setLocale, SOURCE_LOCALE;
  beforeAll(async () => {
    ({ OptionsModal } = await import("../src/ui/OptionsModal.jsx"));
    ({ DEFAULT_OPTIONS } = await import("../src/game/storage.js"));
    ({ setLocale, SOURCE_LOCALE } = await import("../src/i18n/index.js"));
  });
  afterEach(() => vi.unstubAllEnvs());

  const html = (options) => {
    setLocale(SOURCE_LOCALE);
    return renderToStaticMarkup(createElement(OptionsModal, {
      options: { ...DEFAULT_OPTIONS, ...options }, onChange: () => {}, onClose: () => {},
    }));
  };

  it("im Preview-Build steht die Zeile mit genau den Größen der Tabelle", () => {
    vi.stubEnv("VITE_PREVIEW", "1");
    const s = html();
    expect(s).toContain("Test-Viewport");
    // Aus + jede Größe, aus der Tabelle nachgerechnet statt abgetippt.
    for (const v of TEST_VIEWPORTS) expect(s, `${v.id} fehlt in der Auswahl`).toContain(v.label);
    expect(s).toContain("Aus");
  });

  it("die gespeicherte Größe ist die gewählte", () => {
    vi.stubEnv("VITE_PREVIEW", "1");
    const s = html({ testViewport: "1920x1080" });
    // `Segmented` setzt aria-checked; genau eine der fünf Marken darf gewählt sein.
    expect((s.match(/aria-checked="true"/g) || []).length).toBeGreaterThan(0);
    expect(s).toMatch(/aria-checked="true"[^>]*>1920 × 1080</);
  });

  it("ohne Preview-Build ist die Zeile vollständig weg", () => {
    vi.stubEnv("VITE_PREVIEW", "0");
    const s = html({ testViewport: "1920x1080" });
    expect(s, "der Titel steht im Produktions-Render").not.toContain("Test-Viewport");
    for (const v of TEST_VIEWPORTS) expect(s, `${v.label} steht im Produktions-Render`).not.toContain(v.label);
    // Auch die Perf-Zeile daneben bleibt weg — beide hängen an demselben einen Gate.
    expect(s).not.toContain("FPS-Zähler");
  });

  it("die vier Sektionen des Overlays bleiben unberührt (#395)", () => {
    // Die neue Zeile sitzt IN der Grafik-Sektion. Käme sie daneben zu liegen, zählte hier eine fünfte.
    vi.stubEnv("VITE_PREVIEW", "1");
    expect((html().match(/sticky top-0/g) || []).length).toBe(4);
  });
});
