import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import {
  SECTIONS, BEAT_KINDS, LESSON_KINDS, allKeys, beatKey, lessonHeight, lessonKind, lessonBudget,
  totalLessons, LESSON_BUDGET_PX, RUNDE_BUDGET_PX, SHELL_CEILING_PX,
} from "../src/ui/tutorial-sections/catalog.js";

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
     Proberunden brechen sie bewusst — sie haben mehrere Blöcke und teils zwei bewegliche Teile.
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

  it("eine Karten-Lektion bleibt bei höchstens einem Bild oder Probierfeld", () => {
    for (const s of SECTIONS) for (const l of s.lessons) {
      if (lessonKind(l) !== "karte") continue;
      const kinds = l.beats.map((b) => b.kind);
      expect(kinds.filter((k) => k === "bild" || k === "probierfeld").length,
        `${s.id}/${l.id}: ${kinds.join(" · ")} — eine Karte trägt höchstens einen beweglichen Teil`)
        .toBeLessThanOrEqual(1);
    }
  });

  /* Eine Proberunde heisst so, weil man etwas TUT. Eine ohne beweglichen Teil ist eine Karte, die
     ihr Budget missbraucht — das ist genau der Weg, auf dem ein gehobenes Budget still zum neuen
     Normalmass wird. */
  it("eine Proberunde hat mindestens einen beweglichen Teil", () => {
    for (const s of SECTIONS) for (const l of s.lessons) {
      if (lessonKind(l) !== "runde") continue;
      const beweglich = l.beats.filter((b) => b.kind === "probierfeld").length;
      expect(beweglich, `${s.id}/${l.id} ist als Runde geführt, hat aber kein Probierfeld`)
        .toBeGreaterThanOrEqual(1);
    }
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
  /* Deutsch ist die Budget-Sprache: sie ist die längere von beiden. Passt Deutsch, passt Englisch. */
  const heightDe = (s, l) => lessonHeight(s, l, (k) => de[k] ?? "");

  it("keine Lektion überschreitet das Budget ihrer Art", () => {
    const over = [];
    for (const s of SECTIONS) for (const l of s.lessons) {
      const h = Math.round(heightDe(s, l)), b = lessonBudget(l);
      if (h > b) over.push(`${s.id}/${l.id} (${lessonKind(l)}): ${h} px > ${b} px`);
    }
    expect(over, `Über Budget:\n  ${over.join("\n  ")}`).toEqual([]);
  });

  it("das Karten-Budget liegt unter der gemessenen Decke der Schale", () => {
    // 638 px ist gemessen (92dvh minus Kopf und Fuß bei 390 × 844). Eine Karte scrollt nicht.
    expect(LESSON_BUDGET_PX).toBeLessThan(SHELL_CEILING_PX);
  });

  /* Das Runden-Budget liegt ÜBER der Decke — eine Proberunde scrollt, und das ist der Unterschied
     zur Karte. Was es nicht darf, ist beliebig werden: eineinhalb Schalenhöhen heisst einmal
     weiterschieben. Diese Grenze steht hier, damit ein späteres Anheben eine sichtbare Änderung
     ist und keine stille. */
  it("das Runden-Budget sind genau eineinhalb Schalenhöhen, aufgerundet", () => {
    expect(RUNDE_BUDGET_PX).toBeGreaterThan(SHELL_CEILING_PX);
    expect(RUNDE_BUDGET_PX).toBeLessThanOrEqual(Math.ceil(SHELL_CEILING_PX * 1.5 / 10) * 10);
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

  it("Gegenprobe: auch das Runden-Budget ist zu reißen", () => {
    const fake = { id: "x", art: "runde",
      beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "board" },
              { kind: "merk" }, { kind: "tabelle", rows: 8 }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(1400), [beatKey(sec, fake, 2)]: "W".repeat(600),
                   [beatKey(sec, fake, 4)]: "kurz" };
    const h = lessonHeight(sec, fake, (k) => lang[k] ?? "");
    expect(lessonBudget(fake), "die Fake-Runde bekommt gar nicht das Runden-Budget").toBe(RUNDE_BUDGET_PX);
    expect(h, "das Modell hält eine 2000-Zeichen-Runde für budgetkonform").toBeGreaterThan(RUNDE_BUDGET_PX);
  });

  /* Und die Umkehrung: eine kurze Runde muss DURCHkommen. Ohne diese Probe wäre ein Modell, das
     alles reißen lässt, ebenso „grün" wie eines, das rechnet. */
  it("Gegenprobe: eine knappe Runde bleibt im Budget", () => {
    const fake = { id: "x", art: "runde",
      beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "streak" }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(120), [beatKey(sec, fake, 2)]: "W".repeat(80) };
    expect(lessonHeight(sec, fake, (k) => lang[k] ?? "")).toBeLessThan(RUNDE_BUDGET_PX);
  });
});

describe("Tutorial-Sektionen · Terminologie", () => {
  /* text-style-guide.md §1e RESERVIERT das Wort Formation für Karten-Formationen. Die Geometrie des
     Architekten heisst Struktur und Distrikt. Der Bruch ist schon einmal passiert: die Probierfelder
     teilten sich anfangs die Beschriftung des Formations-Felds, und das Gebaeude-Brett trug damit
     „ein Segment" und „keine Formation". Ein Auge findet das einmal; ein Waechter jedes Mal. */
  /* EINE begruendete Ausnahme, und sie steht als Liste da statt als Sonderzweig im Code — damit sie
     sichtbar bleibt und der Test unten verlangen kann, dass es sie noch GIBT. Sakralbauten wirken
     wirklich auf KARTEN-Formationen (architect.js:13 — "formation: biegt computeFormations fuer
     abgedeckte Positionen"). Dort ist das Wort richtig; verboten ist es als Name fuer die Geometrie
     des Bretts, die Struktur und Distrikt heisst. */
  const FORMATION_OK = ["tut.architekt.sorten.0"];

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
