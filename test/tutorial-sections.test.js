import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import {
  SECTIONS, BEAT_KINDS, LESSON_KINDS, allKeys, beatKey, beatLabelKey, lessonHeight, lessonKind, lessonBudget,
  totalLessons, LESSON_BUDGET_PX, VOLL_BUDGET_PX, SHELL_CEILING_PX,
} from "../src/ui/tutorial-sections/catalog.js";
import { MEASURE_VARS } from "../src/ui/tutorial-sections/vars.js";

/* ============================================================
   TUTORIAL-SEKTIONEN — die Wächter der Schale (#tutorial-sections T1).

   Der teuerste stille Fehler dieses Features wäre eine Lektion, die auf dem Telefon über ihren Kasten
   läuft: der Tipp — das Fazit — verschwindet dann hinter dem nicht scrollenden Fuß, während
   „Weiter" daneben leuchtet. Genau das ist in der Planungsrunde gemessen worden
   (docs/workstreams/tutorial-sections/tutorial-plan/evidence/long-390x844.png), und genau davor
   schützt das Budget hier.

   WAS DIESE DATEI KANN UND WAS NICHT. Vitest läuft in `environment: "node"` — es gibt keinen Browser
   und keine Pixel. Das Budget ist deshalb ein MODELL über den Textlängen, kalibriert an echten
   Messungen (Rechnung und Kalibriertabelle stehen in catalog.js). Es fängt die Klasse „diese Lektion
   ist zu lang" zuverlässig ab; es ersetzt NICHT die V1-V4-Messung je Task. Wer beides verwechselt,
   hält ein Modell für einen Beweis.
   ============================================================ */

const SRC = (p) => readFileSync(new URL(`../src/ui/tutorial-sections/${p}`, import.meta.url), "utf8");

describe("Tutorial-Sektionen · Katalog", () => {
  it("jede Sektions- und Lektions-id ist eindeutig (sie bildet den Schlüssel)", () => {
    const secIds = SECTIONS.map((s) => s.id);
    expect(new Set(secIds).size, `doppelte Sektions-id: ${secIds}`).toBe(secIds.length);
    for (const s of SECTIONS) {
      const ids = s.lessons.map((l) => l.id);
      expect(new Set(ids).size, `doppelte Lektions-id in ${s.id}: ${ids}`).toBe(ids.length);
    }
  });

  it("jede Takt-Art steht in BEAT_KINDS — eine neue braucht erst einen Eintrag im Design-Dokument", () => {
    const used = new Set(SECTIONS.flatMap((s) => s.lessons.flatMap((l) => l.beats.map((b) => b.kind))));
    for (const k of used) expect(BEAT_KINDS, `unbekannte Takt-Art „${k}"`).toContain(k);
  });

  it("jede Lektion trägt eine bekannte Art", () => {
    for (const s of SECTIONS) for (const l of s.lessons)
      expect(LESSON_KINDS, `${s.id}/${l.id}: unbekannte Art „${lessonKind(l)}"`).toContain(lessonKind(l));
  });

  /* Die Form je Art. Der erste Bau kannte nur eine: „Satz, Bild oder Probierfeld, Tipp". Die
     vollen Lektionen brechen sie bewusst — sie haben mehrere Blöcke und teils zwei bewegliche Teile.
     Was BEIDE Arten teilen, ist der Abschluss: der Tipp steht am Ende, genau einmal. Das ist die
     Regel, die den ursprünglichen Fehler verhindert (der Tipp verschwindet, „Weiter" leuchtet),
     und sie gilt unverändert weiter. */
  it("jede Lektion endet mit genau einem Tipp", () => {
    for (const s of SECTIONS) for (const l of s.lessons) {
      const kinds = l.beats.map((b) => b.kind);
      const where = `${s.id}/${l.id}: ${kinds.join(" · ")}`;
      expect(kinds.filter((k) => k === "tip").length, `${where} — genau ein Tipp`).toBe(1);
      expect(kinds[kinds.length - 1], `${where} — der Tipp steht am Ende`).toBe("tip");
    }
  });

  it("eine kurze Lektion bleibt bei höchstens einem Bild oder Probierfeld", () => {
    for (const s of SECTIONS) for (const l of s.lessons) {
      if (lessonKind(l) !== "kurz") continue;
      const kinds = l.beats.map((b) => b.kind);
      expect(kinds.filter((k) => k === "bild" || k === "probierfeld").length,
        `${s.id}/${l.id}: ${kinds.join(" · ")} — eine kurze Lektion trägt höchstens einen beweglichen Teil`)
        .toBeLessThanOrEqual(1);
    }
  });

  /* Der Beschriftungs-Schlüssel eines Kastens hängt an `label: true`, nicht an der Takt-Art. Beide
     Richtungen können schiefgehen, und beide bleiben ohne diesen Wächter still: fehlt der Schlüssel,
     zeigt der Kasten seinen Rohschlüssel als Überschrift; steht er ohne `label: true` im Katalog,
     ist er ein toter Eintrag, den der i18n-Wächter später als verwaist meldet. */
  it("nur ein Kasten mit label verlangt einen Beschriftungs-Schlüssel", () => {
    const keys = new Set(allKeys());
    for (const s of SECTIONS) for (const l of s.lessons) {
      l.beats.forEach((b, i) => {
        const lk = beatLabelKey(s, l, i);
        const soll = b.kind === "block" && !!b.label;
        expect(keys.has(lk), soll
          ? `${s.id}/${l.id} Takt ${i} trägt label, aber ${lk} fehlt in allKeys()`
          : `${s.id}/${l.id} Takt ${i} trägt kein label, aber ${lk} steht in allKeys()`).toBe(soll);
        if (soll) {
          expect(de[lk], `${lk} fehlt in de.js`).toBeTruthy();
          expect(en[lk], `${lk} fehlt in en.js`).toBeTruthy();
        }
      });
    }
  });

  /* DIESER WÄCHTER HAT EINEN ECHTEN FEHLER GEFUNDEN, nicht einen gedachten.

     `regeln` stand in BEAT_KINDS, hatte ein Höhenmodell, einen §11-Eintrag und wurde von einer
     Lektion benutzt — aber die Schale kannte keinen Zweig dafür. Der Takt fiel durch bis zu
     `PROBES[b.probe]`, das war `undefined`, und die Lektion rendert den Block einfach NICHT. Kein
     Fehler, keine rote Zeile, nur ein fehlender Absatz, den erst ein Mensch am Telefon bemerkt.

     Eine Art ohne Zeichner ist deshalb schlimmer als eine fehlende Art: sie sieht im Katalog aus
     wie Inhalt und ist keiner. */
  it("jede Takt-Art hat einen Zweig in der Schale", () => {
    const shell = SRC("TutorialSections.jsx");
    for (const k of BEAT_KINDS) {
      if (k === "bild" || k === "probierfeld") continue;   // die beiden gehen über PROBES
      expect(shell, `die Schale zeichnet „${k}" nicht — der Takt fiele still aus der Lektion`)
        .toMatch(new RegExp(`b\\.kind === "${k}"`));
    }
  });

  /* AUCH DIESER WÄCHTER HAT EINEN ECHTEN FEHLER GEFUNDEN.

     Die Runden lesen ihre Wörter aus einem `labels`-Objekt, das die Schale zusammenstellt. Fünf
     davon — `wins`, `undo`, `reset`, `energy`, `cardValue` — standen in beats.jsx und waren in der
     Schale nicht verdrahtet. Das Ergebnis ist kein Fehler und keine rote Zeile, sondern das Wort
     „undefined" auf einem Knopf.

     Beide Enden werden geprüft: was beats.jsx liest, muss die Schale liefern, und was die Schale
     liefert, muss in beiden Katalogen stehen. */
  it("jedes Wort, das eine Runde liest, wird von der Schale geliefert", () => {
    const probes = SRC("beats.jsx");
    const shell = SRC("TutorialSections.jsx");
    // `L` ist in beats.jsx durchgehend der Name des labels-Objekts.
    const gelesen = new Set([...probes.matchAll(/\bL\.(\w+)/g)].map((m) => m[1]));
    gelesen.delete("length");   // Array-Eigenschaft, kein Wort
    const geliefert = new Map([...shell.matchAll(/(\w+):\s*t\("(tut\.[df]\.\w+)"\)/g)].map((m) => [m[1], m[2]]));
    for (const name of gelesen) {
      expect(geliefert.has(name), `beats.jsx liest L.${name}, die Schale liefert es nicht — auf dem Schirm steht „undefined"`).toBe(true);
      const key = geliefert.get(name);
      expect(de[key], `${key} fehlt in de.js`).toBeTruthy();
      expect(en[key], `${key} fehlt in en.js`).toBeTruthy();
    }
  });

  /* DER DRITTE WÄCHTER AUS EINEM ECHTEN FEHLER.

     `beats.jsx` importierte `ARCH_CAT` aus `game/architect.js`. Dort steht es nicht — es liegt in
     `ui/indicators/vocab.js`. Weder `npm run lint` noch `npm test` noch `npm run build` haben das
     gemeldet: ESLint löst Modul-Exporte nicht auf, die Tests lasen beats.jsx nur als TEXT, und der
     Build hat den toten Bezeichner wegoptimiert. Erst der Browser warf
     „does not provide an export named ARCH_CAT" — und zwar beim Laden der GANZEN Seite, nicht nur
     des Tutorials. Der Startbildschirm war leer.

     Der Wächter lädt das Modul wirklich. Ein kaputter Import wirft dann hier statt beim Spieler. */
  it("jeder benannte Import der Sektion existiert wirklich", async () => {
    /* NUR EIN LADEN REICHT NICHT. Der erste Versuch dieses Wächters importierte beats.jsx und
       prüfte die Bausteine — und war grün, obwohl der Import kaputt war: Vitest löst über esbuild
       auf und erzwingt benannte Exporte nicht so streng wie der Browser. Ein Wächter, der den
       Fehler nicht fängt, für den er geschrieben wurde, ist schlimmer als keiner.

       Geprüft wird deshalb NAMENTLICH: jeder `import { a, b } from "..."` wird gegen die
       tatsächlichen Exporte des Zielmoduls gehalten. */
    const fehlt = [];
    for (const datei of ["beats.jsx", "TutorialSections.jsx", "catalog.js", "vars.js"]) {
      const src = SRC(datei);
      for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)) {
        if (!m[2].startsWith(".")) continue;   // Pakete wie "react" prüft npm, nicht dieser Wächter
        const namen = m[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
        const ziel = await import(new URL(`../src/ui/tutorial-sections/${m[2]}`, import.meta.url).href);
        for (const n of namen) {
          if (!(n in ziel)) fehlt.push(`${datei}: „${n}" gibt es in ${m[2]} nicht`);
        }
      }
    }
    expect(fehlt, `Kaputte Importe — im Browser bleibt die Seite leer:\n  ${fehlt.join("\n  ")}`).toEqual([]);
  });

  it("jeder Baustein in PROBES ist eine Komponente", async () => {
    const mod = await import("../src/ui/tutorial-sections/beats.jsx");
    expect(Object.keys(mod.PROBES).length, "PROBES ist leer").toBeGreaterThan(0);
    for (const [name, komp] of Object.entries(mod.PROBES)) {
      expect(typeof komp, `PROBES.${name} ist keine Komponente`).toBe("function");
    }
  });

  /* Der Archetyp-Schlüssel einer Sektion muss AUFLÖSBAR sein. Ein Tippfehler gäbe kein `undefined`
     auf dem Schirm, sondern gar keine Farbe — die Sektion sähe aus wie jede andere, und niemand
     bemerkte, dass die Einfärbung fehlt. Genau die Sorte Fehler, die ein Auge nicht findet.

     Umgekehrt gilt: die vier Archetyp-Sektionen MÜSSEN einen tragen. Ohne diese Richtung wäre der
     Wächter grün, sobald jemand den Schlüssel einfach löscht. */
  it("jede Archetyp-Sektion nennt einen Archetyp, den das Spiel kennt", async () => {
    const { ARCHETYPE_META } = await import("../src/game/skills.js");
    const mitArch = SECTIONS.filter((s) => s.arch);
    for (const s of mitArch) {
      expect(ARCHETYPE_META[s.arch], `Sektion ${s.id}: „${s.arch}" ist kein Archetyp des Spiels`).toBeTruthy();
      expect(ARCHETYPE_META[s.arch].color, `Archetyp ${s.arch} hat keine Farbe`).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(mitArch.map((s) => s.id).sort(), "die vier Archetyp-Sektionen tragen ihren Archetyp")
      .toEqual(["blitz", "eis", "feuer", "pflanze"]);
  });

  it("jeder Probierfeld-/Bild-Takt nennt einen Baustein, den beats.jsx auch kennt", () => {
    const probes = SRC("beats.jsx");
    for (const s of SECTIONS) for (const l of s.lessons) for (const b of l.beats) {
      if (b.kind !== "probierfeld" && b.kind !== "bild") continue;
      expect(b.probe, `${s.id}/${l.id}: ${b.kind} ohne probe-Namen`).toBeTruthy();
      expect(probes, `PROBES kennt „${b.probe}" nicht`).toMatch(new RegExp(`\\b${b.probe}\\s*:`));
    }
  });

  it("der Katalog trägt keinen Anzeigetext — nur Schlüssel und Daten", () => {
    const src = SRC("catalog.js");
    // Kein `t`, kein React: die Sprache darf nicht beim Laden einfrieren.
    expect(src, "catalog.js importiert i18n — die Sprache fröre beim Laden ein").not.toMatch(/from "\.\..*i18n/);
    expect(src, "catalog.js importiert React").not.toMatch(/from "react"/);
    /* Ein Anzeigetext wäre ein String mit einem Leerzeichen zwischen Wörtern im DATENteil. Geprüft wird
       nur der Code — die Kommentare oben erklären das Schema und dürfen Sätze enthalten. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const strings = [...code.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    const prose = strings.filter((s) => /\p{L}\s\p{L}/u.test(s));
    expect(prose, `Anzeigetext im Katalog — gehört nach de.js/en.js:\n  ${prose.join("\n  ")}`).toEqual([]);
  });
});

describe("Tutorial-Sektionen · Texte", () => {
  it("jeder Schlüssel des Katalogs steht in BEIDEN Katalogen", () => {
    const missing = [];
    for (const k of allKeys()) {
      if (!(k in de)) missing.push(`de: ${k}`);
      if (!(k in en)) missing.push(`en: ${k}`);
    }
    expect(missing, `Fehlende Texte:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  /* Übernommen aus dem zurückgebauten test/tutorial.test.js:105 — die Regel überlebt das Feature, für
     das sie geschrieben wurde. text-style-guide.md §4: eine Zahl, die eine Konstante spiegelt, wird
     interpoliert. Ein abgetipptes „50 Durchläufe" ist beim nächsten Balancing still falsch. */
  it("kein Lektionstext nennt eine Zahl direkt — nur Platzhalter", () => {
    const bad = [];
    for (const [lang, cat] of [["de", de], ["en", en]]) {
      for (const k of allKeys()) {
        const ohnePlatzhalter = String(cat[k] ?? "").replace(/\{\w+\}/g, "");
        if (/\d/.test(ohnePlatzhalter)) bad.push(`${lang} ${k}: „${cat[k]}"`);
      }
    }
    expect(bad, `Zahl im Text — gehört als Platzhalter aus der Konstante:\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});

describe("Tutorial-Sektionen · das Höhenbudget", () => {
  /* Deutsch ist die Budget-Sprache: sie ist die längere von beiden. Passt Deutsch, passt Englisch.

     GEMESSEN WIRD DER AUFGELÖSTE TEXT, nicht der rohe. „{skillsOffered}" sind 15 Zeichen, auf dem
     Schirm steht die Zahl mit zweien. Über eine Lektion mit vierzehn Platzhaltern waren das drei
     Zeilen zu viel — das Modell hätte eine Lektion gerissen, die der Leser nie so sieht. Ein
     Wächter, der etwas anderes misst als der Leser sieht, misst das Falsche. */
  const fuellen = (text) => String(text).replace(/\{(\w+)\}/g,
    (m, k) => (k in MEASURE_VARS ? String(MEASURE_VARS[k]) : m));
  const heightDe = (s, l) => lessonHeight(s, l, (k) => fuellen(de[k] ?? ""));

  /* Die Gegenprobe dazu: ein Platzhalter, den niemand füllt, bleibt als Text stehen. Ohne diesen
     Wächter rechnete ein Tippfehler im Namen die Lektion still größer und wäre nur daran zu
     erkennen, dass auf dem Schirm „{skillsOfferd}" steht. */
  it("jeder Platzhalter in einem Lektionstext hat einen Wert", () => {
    const offen = [];
    for (const k of allKeys()) {
      // `offered` wird je Lektion gesetzt, nicht global — siehe OFFERED in TutorialSections.jsx.
      for (const m of fuellen(de[k] ?? "").matchAll(/\{(\w+)\}/g)) {
        if (m[1] !== "offered") offen.push(`${k}: {${m[1]}}`);
      }
    }
    expect(offen, `Platzhalter ohne Wert in vars.js:\n  ${offen.join("\n  ")}`).toEqual([]);
  });

  it("keine Lektion überschreitet das Budget ihrer Art", () => {
    const over = [];
    for (const s of SECTIONS) for (const l of s.lessons) {
      const h = Math.round(heightDe(s, l)), b = lessonBudget(l);
      if (h > b) over.push(`${s.id}/${l.id} (${lessonKind(l)}): ${h} px > ${b} px`);
    }
    expect(over, `Über Budget:\n  ${over.join("\n  ")}`).toEqual([]);
  });

  /* DIE UMKEHRREGEL — was „voll" davon abhält, ein Freibrief zu werden.

     Die erste Fassung band das höhere Budget an einen beweglichen Teil: wer etwas TUT, darf länger
     sein. GEMESSEN am Entwurf ist das falsch — Beweglichkeit und Höhe sind unkorreliert, die
     längste Lektion überhaupt ist ein reiner Lesetext, und die Regel hätte rund zehn freigegebene
     Schirme ins 400er Budget gezwungen, das sie um 140 bis 960 px verfehlen.

     Statt der Beweglichkeit greift die Richtung, die die Daten hergeben: wer eine Lektion auf
     „voll" setzt, die auch in 400 px passt, hat sie falsch eingeordnet. Das erlaubt „voll" für
     jede Lektion, die es braucht, und für keine, die es nicht braucht — ohne von den Autoren zu
     verlangen, still gewordene Erklärschirme künstlich beweglich zu machen. */
  it("was ins kleine Budget passt, ist auch als kurz geführt", () => {
    const falsch = [];
    for (const s of SECTIONS) for (const l of s.lessons) {
      if (lessonKind(l) !== "voll") continue;
      const h = Math.round(heightDe(s, l));
      if (h <= LESSON_BUDGET_PX) falsch.push(`${s.id}/${l.id}: ${h} px — das ist „kurz"`);
    }
    expect(falsch, `Als „voll" geführt, passt aber ins kleine Budget:\n  ${falsch.join("\n  ")}`).toEqual([]);
  });

  /* GEGENPROBE zur Umkehrregel. Solange keine Lektion „voll" trägt, läuft die Regel oben durch
     eine leere Schleife und ist grün, ohne etwas geprüft zu haben — genau die Sorte Wächter, die
     erst auffällt, wenn sie gebraucht wird und schweigt. Hier steht der Fall, den sie fangen muss. */
  it("Gegenprobe: eine kurze Lektion, die als voll geführt wird, ist erkennbar", () => {
    const fake = { id: "x", art: "voll", beats: [{ kind: "satz" }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "Kurz.", [beatKey(sec, fake, 1)]: "Auch kurz." };
    const h = lessonHeight(sec, fake, (k) => lang[k] ?? "");
    expect(lessonKind(fake)).toBe("voll");
    expect(h, `die Fake-Lektion misst ${h} px und wäre gar nicht kurz`).toBeLessThanOrEqual(LESSON_BUDGET_PX);
  });

  it("das kurze Budget liegt unter der gemessenen Decke der Schale", () => {
    // 638 px ist gemessen (92dvh minus Kopf und Fuß bei 390 × 844). Eine kurze Lektion scrollt nicht.
    expect(LESSON_BUDGET_PX).toBeLessThan(SHELL_CEILING_PX);
  });

  /* Das volle Budget liegt ÜBER der Decke — eine volle Lektion scrollt, und das ist der Unterschied
     zur kurzen. Was es nicht darf, ist beliebig werden: eineinhalb Schalenhöhen heisst einmal
     weiterschieben. Diese Grenze steht hier, damit ein späteres Anheben eine sichtbare Änderung
     ist und keine stille. */
  it("das volle Budget sind genau eineinhalb Schalenhöhen, aufgerundet", () => {
    expect(VOLL_BUDGET_PX).toBeGreaterThan(SHELL_CEILING_PX);
    expect(VOLL_BUDGET_PX).toBeLessThanOrEqual(Math.ceil(SHELL_CEILING_PX * 1.5 / 10) * 10);
  });

  /* GEGENPROBE, eingebaut statt einmalig von Hand gefahren (testing.md §5): ein Wächter, der nur grün
     ist, ist kein Beweis. Ein künstlich überlanger Satz MUSS das Budget reißen — sonst rechnet das
     Modell nicht, sondern nickt. Es braucht sie ZWEIMAL: das höhere Budget ohne eigene Gegenprobe
     wäre genau die Stelle, an der ein Modell unbemerkt aufhört zu rechnen. */
  it("Gegenprobe: eine überlange Lektion reißt das Budget", () => {
    const fake = { id: "x", beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "formation" }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(1200), [beatKey(sec, fake, 1)]: "", [beatKey(sec, fake, 2)]: "kurz" };
    const h = lessonHeight(sec, fake, (k) => lang[k] ?? "");
    expect(h, "das Modell hält eine 1200-Zeichen-Lektion für budgetkonform").toBeGreaterThan(LESSON_BUDGET_PX);
  });

  it("Gegenprobe: auch das volle Budget ist zu reißen", () => {
    const fake = { id: "x", art: "voll",
      beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "board" },
              { kind: "merk" }, { kind: "tabelle", rows: 8 }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(1400), [beatKey(sec, fake, 2)]: "W".repeat(600),
                   [beatKey(sec, fake, 4)]: "kurz" };
    const h = lessonHeight(sec, fake, (k) => lang[k] ?? "");
    expect(lessonBudget(fake), "die Fake-Lektion bekommt gar nicht das volle Budget").toBe(VOLL_BUDGET_PX);
    expect(h, "das Modell hält eine 2000-Zeichen-Lektion für budgetkonform").toBeGreaterThan(VOLL_BUDGET_PX);
  });

  /* Und die Umkehrung: eine knappe volle Lektion muss DURCHkommen. Ohne diese Probe wäre ein Modell, das
     alles reißen lässt, ebenso „grün" wie eines, das rechnet. */
  it("Gegenprobe: eine knappe volle Lektion bleibt im Budget", () => {
    const fake = { id: "x", art: "voll",
      beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "streak" }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(120), [beatKey(sec, fake, 2)]: "W".repeat(80) };
    expect(lessonHeight(sec, fake, (k) => lang[k] ?? "")).toBeLessThan(VOLL_BUDGET_PX);
  });
});

describe("Tutorial-Sektionen · Terminologie", () => {
  /* text-style-guide.md §1e RESERVIERT das Wort Formation für Karten-Formationen. Die Geometrie des
     Architekten heisst Struktur und Distrikt. Der Bruch ist schon einmal passiert: die Probierfelder
     teilten sich anfangs die Beschriftung des Formations-Felds, und das Gebaeude-Brett trug damit
     „ein Segment" und „keine Formation". Ein Auge findet das einmal; ein Waechter jedes Mal. */
  /* Die Ausnahmeliste ist LEER, und das ist ein Ergebnis, kein Versehen. Sie trug
     `tut.architekt.sorten.0`: die Lektion „Sorten" sprach von Sakralbauten, die wirklich auf
     KARTEN-Formationen wirken (architect.js:13). Der freigegebene Entwurf hat diese Lektion nicht
     mehr, also ist die Ausnahme verwaist — und der Wächter darunter hat genau das gemeldet.
     Eine verwaiste Ausnahme weicht die Regel still auf; sie steht deshalb hier als Liste und nicht
     als Sonderzweig im Code, damit ein Test ihre Berechtigung nachhalten kann. */
  const FORMATION_OK = [];

  it("kein Architekt-Text benutzt das Wort Formation fuer Brett-Geometrie", () => {
    const bad = [];
    for (const [lang, cat] of [["de", de], ["en", en]]) {
      for (const k of Object.keys(cat)) {
        if (!k.startsWith("tut.architekt.") && !k.startsWith("tut.probe.board.")) continue;
        if (FORMATION_OK.includes(k)) continue;
        if (/formation/i.test(String(cat[k]))) bad.push(lang + " " + k + ": " + cat[k]);
      }
    }
    expect(bad, "Formation ist fuer Karten-Formationen reserviert. Architekt: Struktur, Distrikt.").toEqual([]);
  });

  /* Eine verwaiste Ausnahme ist genauso ein Fehler wie eine fehlende — sie wuerde die Regel still
     aufweichen. Dasselbe Prinzip wie in test/overlay-nesting.test.js. */
  it("haelt die Ausnahmeliste ehrlich", () => {
    for (const k of FORMATION_OK) {
      expect(de[k], `verwaiste Ausnahme ${k} — bitte streichen`).toBeTruthy();
      expect(/formation/i.test(String(de[k])), `${k} sagt gar nicht mehr Formation — Ausnahme streichen`).toBe(true);
    }
  });

  /* Gegenprobe eingebaut: findet der Waechter die Schluessel ueberhaupt? Ohne diese Zeile waere er
     still gruen, sobald sich das Praefix aendert — die teuerste Art, kaputtzugehen. */
  it("findet die Architekt-Texte ueberhaupt", () => {
    expect(Object.keys(de).filter((k) => k.startsWith("tut.architekt.")).length).toBeGreaterThan(10);
  });
});

describe("Tutorial-Sektionen · Schale", () => {
  it("das Overlay hängt am Portal — Pflicht für jedes fixed-inset-0-Element", () => {
    const src = SRC("TutorialSections.jsx");
    expect(src, "overlayPortal fehlt — siehe src/ui/overlayPortal.jsx").toMatch(/overlayPortal\(/);
  });

  it("die Karte ist zentriert, nicht oben angeschlagen", () => {
    /* Gemessen: eine Drei-Takt-Lektion ist 524 px hoch. Oben angeschlagen lägen 308 px Schwarz
       darunter. `items-center` löst beide Fälle — eine Karte am 92dvh-Deckel steht damit ohnehin oben. */
    expect(SRC("TutorialSections.jsx")).toMatch(/items-center/);
  });

  it("die Schale ist geliehen, nicht erfunden", () => {
    const src = SRC("TutorialSections.jsx");
    for (const part of ["MODAL_CARD", "ActionButton", "STICKY_HEAD_BG", "92dvh"]) {
      expect(src, `${part} fehlt — die Schale soll die des Glossars sein`).toContain(part);
    }
  });

  it("das Probierfeld ruft die echte Funktion, statt sie nachzubauen", () => {
    const src = SRC("beats.jsx");
    expect(src, "computeFormations wird nicht aufgerufen").toMatch(/computeFormations\(/);
    expect(src, "der Formationsname muss aus dem Register kommen").toMatch(/formationName\(/);
    /* GEGEN DEN KOMMENTAR GEPRÜFT, nicht mit ihm. Die erste Fassung dieser Zusicherung wurde von der
       Erklärzeile in beats.jsx rot gemacht, die das verbotene Muster als GEGENbeispiel zitiert —
       genau der Fehler, den AGENTS.md unter „Some guards have historically matched their own
       explanatory comments" führt. Also erst die Kommentare weg, dann prüfen. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code, "Dezimaltrennzeichen je Sprache — fmtNum statt toFixed().replace()")
      .not.toMatch(/replace\(["']\.["'],\s*["'],["']\)/);
    expect(code, "fmtNum fehlt").toMatch(/fmtNum\(/);
  });
});

describe("Tutorial-Sektionen · Umfang", () => {
  it("T1 liefert die Schale, nicht die Inhalte", () => {
    // Zwei Platzhalter-Lektionen sind Gerüst; T3-T8 ersetzen sie. Schlägt das hier fehl, hat ein
    // Inhalts-Task in T1s Datei geschrieben statt in seine eigene.
    expect(totalLessons()).toBeGreaterThan(0);
  });
});
