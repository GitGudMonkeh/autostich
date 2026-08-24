import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import {
  SECTIONS, BEAT_KINDS, allKeys, beatKey, lessonHeight, totalLessons,
  LESSON_BUDGET_PX, SHELL_CEILING_PX,
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

  it("es gibt genau vier Takt-Arten — eine fünfte braucht erst einen Eintrag im Design-Dokument", () => {
    const used = new Set(SECTIONS.flatMap((s) => s.lessons.flatMap((l) => l.beats.map((b) => b.kind))));
    for (const k of used) expect(BEAT_KINDS, `unbekannte Takt-Art „${k}"`).toContain(k);
  });

  it("eine Lektion ist DREI Takte: ein Satz, ein Bild oder Probierfeld, ein Tipp", () => {
    for (const s of SECTIONS) for (const l of s.lessons) {
      const kinds = l.beats.map((b) => b.kind);
      const where = `${s.id}/${l.id}: ${kinds.join(" · ")}`;
      expect(kinds.filter((k) => k === "tip").length, `${where} — genau ein Tipp`).toBe(1);
      expect(kinds[kinds.length - 1], `${where} — der Tipp steht am Ende`).toBe("tip");
      expect(kinds.filter((k) => k === "bild" || k === "probierfeld").length,
        `${where} — höchstens ein Bild ODER ein Probierfeld`).toBeLessThanOrEqual(1);
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

  it("keine Lektion überschreitet das Budget", () => {
    const over = [];
    for (const s of SECTIONS) for (const l of s.lessons) {
      const h = Math.round(heightDe(s, l));
      if (h > LESSON_BUDGET_PX) over.push(`${s.id}/${l.id}: ${h} px > ${LESSON_BUDGET_PX} px — das sind zwei Lektionen`);
    }
    expect(over, `Über Budget:\n  ${over.join("\n  ")}`).toEqual([]);
  });

  it("das Budget liegt unter der gemessenen Decke der Schale", () => {
    // 638 px ist gemessen (92dvh minus Kopf und Fuß bei 390 × 844). Ein Budget darüber wäre sinnlos.
    expect(LESSON_BUDGET_PX).toBeLessThan(SHELL_CEILING_PX);
  });

  /* GEGENPROBE, eingebaut statt einmalig von Hand gefahren (testing.md §5): ein Wächter, der nur grün
     ist, ist kein Beweis. Ein künstlich überlanger Satz MUSS das Budget reißen — sonst rechnet das
     Modell nicht, sondern nickt. */
  it("Gegenprobe: eine überlange Lektion reißt das Budget", () => {
    const fake = { id: "x", beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "formation" }, { kind: "tip" }] };
    const sec = { id: "y" };
    const lang = { [beatKey(sec, fake, 0)]: "W".repeat(1200), [beatKey(sec, fake, 1)]: "", [beatKey(sec, fake, 2)]: "kurz" };
    const h = lessonHeight(sec, fake, (k) => lang[k] ?? "");
    expect(h, "das Modell hält eine 1200-Zeichen-Lektion für budgetkonform").toBeGreaterThan(LESSON_BUDGET_PX);
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
