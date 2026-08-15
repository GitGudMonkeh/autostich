import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { t, fmtNum, fmtPct, LOCALE_IDS, setLocale, getLocale, interpolate } from "../src/i18n/index.js";

/* ============================================================
   I18N-GUARDS — dieselbe Idee wie registry-guards.test.js: Meta-Tests, die AUTOMATISCH
   über den Katalog laufen und mit jedem neuen Schlüssel mitwachsen, statt eine Handliste
   zu pflegen. Sie fangen die Fehlerklassen ab, die ein zweisprachiges Spiel still einführt:

     1. Schlüssel-Parität   — ein Text existiert nur auf Deutsch → englische Spieler sehen Deutsch.
     2. Platzhalter-Parität — {score} fehlt in der Übersetzung → die Zahl verschwindet spurlos.
     3. Vergessene Übersetzung — der englische Eintrag ist Wort für Wort der deutsche.
     4. Zahlformat          — deutsche Dezimal-Kommas im englischen Katalog (und umgekehrt).
     5. Plural-Paare        — `…_one` ohne `…_other` (oder umgekehrt) → falsche Form.
     6. Terminologie        — eine deutsche Vokabel muss auf GENAU eine englische abbilden
                              (docs/localization/uebersetzerpaket_pixi_2026-08-15.md §3).
     7. Ratsche             — in schon migrierten Dateien darf kein neuer deutscher Inline-Text
                              in der JSX auftauchen. Die Liste der migrierten Dateien wächst;
                              sie schrumpft nie.

   Wichtig für zukünftige Zugänge: neue Anzeigetexte gehören IMMER in beide Kataloge.
   Ein einsprachiger Zugang macht die Suite (und damit den Deploy) rot.
   ============================================================ */

const KEYS_DE = Object.keys(de);
const KEYS_EN = Object.keys(en);
const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (s) => new Set([...String(s).matchAll(PLACEHOLDER)].map((m) => m[1]));

describe("i18n · Katalog-Parität", () => {
  it("beide Kataloge kennen exakt dieselben Schlüssel", () => {
    const onlyDe = KEYS_DE.filter((k) => !(k in en));
    const onlyEn = KEYS_EN.filter((k) => !(k in de));
    expect(onlyDe, `Nur in de.js — englische Spieler sehen Deutsch:\n  ${onlyDe.join("\n  ")}`).toEqual([]);
    expect(onlyEn, `Nur in en.js — verwaiste Übersetzung:\n  ${onlyEn.join("\n  ")}`).toEqual([]);
  });

  it("jeder Schlüssel hat auf beiden Seiten dieselben Platzhalter", () => {
    const bad = [];
    for (const k of KEYS_DE) {
      if (!(k in en)) continue;
      const a = placeholders(de[k]), b = placeholders(en[k]);
      const missing = [...a].filter((p) => !b.has(p));
      const extra = [...b].filter((p) => !a.has(p));
      if (missing.length || extra.length) {
        bad.push(`${k}: en fehlt {${missing.join("},{")}}${extra.length ? ` · en hat zusätzlich {${extra.join("},{")}}` : ""}`);
      }
    }
    expect(bad, `Platzhalter-Bruch — die Variable würde im Text fehlen:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("kein Katalogtext ist leer", () => {
    const empty = [...KEYS_DE, ...KEYS_EN].filter((k) => !String((k in de ? de[k] : en[k]) ?? "").trim());
    expect(empty).toEqual([]);
  });

  /* Wörter, die in beiden Sprachen identisch sind (Eigennamen, Kürzel, Marken, reine Symbolzeilen).
     Nur DIESE dürfen unübersetzt bleiben — alles andere ist eine vergessene Übersetzung. */
  const SAME_OK = new Set([
    "start.logo.alt",        // Wortmarke
    "start.onb.reroll",      // „Reroll" ist im Deutschen bereits das englische Wort
    "options.rfx.mobile",    // Zustandsname, in beiden Sprachen „Mobile"
    "options.float.score.title", // „↳ Score" — Score bleibt Score (Begriffstabelle §3.1)
    "start.progress.onboarding", // „Onboarding" ist im Deutschen der etablierte Begriff (§3.5)
    "start.progress.links",  // reine Zahlenzeile „{done} / {total}"
    "common.cur.dp",         // DP = Deckpunkte / Deck Points
    "start.tile.upgrades",   // „Upgrades" ist im Deutschen der etablierte Begriff (§3.5)
  ]);

  it("englische Texte unterscheiden sich vom deutschen Original", () => {
    const same = KEYS_DE.filter((k) => k in en && de[k] === en[k] && !SAME_OK.has(k));
    expect(same, `Unübersetzt (oder in SAME_OK eintragen, wenn das Wort wirklich identisch ist):\n  ${same.join("\n  ")}`).toEqual([]);
  });

  it("Plural-Schlüssel treten immer als _one/_other-Paar auf", () => {
    for (const [name, cat] of [["de", de], ["en", en]]) {
      const keys = Object.keys(cat);
      const lonely = keys.filter((k) => {
        if (k.endsWith("_one")) return !keys.includes(k.slice(0, -4) + "_other");
        if (k.endsWith("_other")) return !keys.includes(k.slice(0, -6) + "_one");
        return false;
      });
      expect(lonely, `${name}: unvollständiges Plural-Paar → ${lonely.join(", ")}`).toEqual([]);
    }
  });
});

describe("i18n · Zahl- und Satzformate", () => {
  /* Deutsch schreibt 1.234,5 — Englisch 1,234.5. Ein deutsches Dezimalkomma im englischen
     Katalog („2,25×") liest sich für englische Spieler als Zweitausendzweihundertfünfzig. */
  it("englische Texte enthalten keine deutschen Dezimalkommas", () => {
    const bad = KEYS_EN.filter((k) => /\d,\d/.test(en[k]));
    expect(bad, `Deutsches Dezimalkomma in en.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("deutsche Texte enthalten keine englischen Dezimalpunkte", () => {
    // Ausgenommen: Auslassungspunkte, Versions-/Aufzählungspunkte und Prozentsätze wie „p95".
    const bad = KEYS_DE.filter((k) => /\d\.\d/.test(de[k]));
    expect(bad, `Englischer Dezimalpunkt in de.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("deutsche Anführungszeichen sind typografisch („…“), englische kurvig (“…”)", () => {
    const badDe = KEYS_DE.filter((k) => /[“”](?![^„]*„)/.test(de[k]) && !/„/.test(de[k]));
    expect(badDe, `de.js benutzt englische Anführungszeichen:\n  ${badDe.join("\n  ")}`).toEqual([]);
    const badEn = KEYS_EN.filter((k) => /„/.test(en[k]));
    expect(badEn, `en.js benutzt deutsche Anführungszeichen:\n  ${badEn.join("\n  ")}`).toEqual([]);
  });

  it("fmtNum/fmtPct formatieren je Sprache korrekt", () => {
    expect(fmtNum(1234567, "de")).toBe("1.234.567");
    expect(fmtNum(1234567, "en")).toBe("1,234,567");
    expect(fmtNum(2.25, "de")).toBe("2,25");
    expect(fmtNum(2.25, "en")).toBe("2.25");
    expect(fmtNum(-1234.5, "de")).toBe("-1.234,5");
    expect(fmtPct(0.07, "de")).toBe("7 %");
    expect(fmtPct(0.07, "en")).toBe("7%");
  });
});

describe("i18n · Terminologie", () => {
  /* Begriffstabelle aus dem Übersetzerpaket §3: EINE deutsche Vokabel → GENAU EINE englische.
     Geprüft wird die Richtung, die im Spiel weh tut: taucht das deutsche Wort in einem
     Schlüssel auf, muss der englische Text die kanonische Entsprechung benutzen — und nie
     ein verbotenes Synonym. */
  const TERMS = [
    { de: /\bDurchlauf\b/i,   ok: /\bcycle/i,        never: /\bround\b/i,            name: "Durchlauf → cycle (nie „round“)" },
    { de: /\bStich(e|en)?\b/, ok: /\btrick/i,        never: /\bround\b/i,            name: "Stich → trick (nie „round“)" },
    { de: /\bLäufe?\b/,       ok: /\bruns?\b/i,      never: null,                     name: "Lauf → run" },
    { de: /\bSeed\b/i,        ok: /\bseed\b/i,       never: null,                     name: "Seed → seed" },
    { de: /\bRarität\b/i,     ok: /\brarity\b/i,     never: null,                     name: "Rarität → rarity" },
    { de: /\bRangliste\b/i,   ok: /rank(ed|ing)\b/i, never: null,                     name: "Rangliste → ranked/ranking" },
    { de: /\bBestenliste\b/i, ok: /\bleaderboard\b/i, never: null,                    name: "Bestenliste → leaderboard" },
    { de: /\bWerkstatt\b/i,   ok: /\bworkshop\b/i,   never: null,                     name: "Werkstatt → workshop" },
    { de: /\bFormation/i,     ok: /\bformation/i,    never: null,                     name: "Formation → formation" },
    { de: /\bMultiplikator\b/i, ok: /\bmultiplier\b/i, never: null,                   name: "Multiplikator → multiplier" },
  ];

  it("kanonische Begriffe werden durchgängig verwendet", () => {
    const bad = [];
    for (const term of TERMS) {
      for (const k of KEYS_DE) {
        if (!(k in en) || !term.de.test(de[k])) continue;
        if (!term.ok.test(en[k])) bad.push(`${k} — ${term.name}\n     de: ${de[k]}\n     en: ${en[k]}`);
        else if (term.never && term.never.test(en[k])) bad.push(`${k} — verbotenes Synonym (${term.name})\n     en: ${en[k]}`);
      }
    }
    expect(bad, `Begriffsbruch gegen das Übersetzerpaket §3:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("Stichpunkte heißen im Englischen TP (Trick Points), nicht SP", () => {
    expect(de["common.cur.sp"]).toBe("SP");
    expect(en["common.cur.sp"]).toBe("TP");
  });
});

describe("i18n · Auflösung", () => {
  it("t() interpoliert, respektiert die Sprache und fällt nie auf „undefined“ zurück", () => {
    expect(t("start.resume.sub", { cycle: 3, total: 50, score: "1.000" }, "de")).toBe("Durchlauf 3/50 · Score 1.000");
    expect(t("start.resume.sub", { cycle: 3, total: 50, score: "1,000" }, "en")).toBe("Cycle 3/50 · Score 1,000");
    expect(t("gibt.es.nicht")).toBe("gibt.es.nicht");                 // Schlüssel statt „undefined"
    expect(interpolate("a {x} b", {})).toBe("a {x} b");               // fehlende Variable bleibt sichtbar
  });

  it("t() wählt die Plural-Form über `count`", () => {
    expect(t("start.tile.lock", { count: 1 }, "de")).toBe("🔒 noch 1 Lauf");
    expect(t("start.tile.lock", { count: 3 }, "de")).toBe("🔒 noch 3 Läufe");
    expect(t("start.tile.lock", { count: 1 }, "en")).toBe("🔒 1 more run");
    expect(t("start.tile.lock", { count: 3 }, "en")).toBe("🔒 3 more runs");
  });

  it("setLocale akzeptiert nur bekannte Sprachen", () => {
    const before = getLocale();
    expect(setLocale("en")).toBe("en");
    expect(setLocale("klingonisch")).toBe("de");   // Rückfall statt kaputter UI
    setLocale(before);
    expect(LOCALE_IDS).toEqual(["de", "en"]);
  });
});

describe("i18n · Ratsche gegen neue deutsche Inline-Texte", () => {
  /* Migrierte Dateien holen ihre Texte AUSSCHLIESSLICH über t(). Diese Liste wächst mit jeder
     migrierten Datei und schrumpft nie — so kann eine schon zweisprachige Ansicht nicht durch
     einen schnellen Zugang wieder einsprachig werden. Neue Dateien hier eintragen, sobald sie
     migriert sind. */
  const MIGRATED = ["src/ui/OptionsModal.jsx", "src/ui/StartScreen.jsx"];

  /* In einer migrierten Datei steht KEIN Wort mehr als Literal — egal welcher Sprache. Deshalb
     wird nicht auf „deutsch aussehend" geprüft (das ließe „Normaler Lauf" durch, kein Umlaut),
     sondern auf „enthält überhaupt ein Wort". Symbole, Pfeile, Ziffern und einzelne Buchstaben
     (das „v" vor der Versionsnummer) bleiben erlaubt. */
  const HAS_WORD = /[A-Za-zÄÖÜäöüß]{3,}/;
  // Der Greifer >…< fischt zwangsläufig auch Code auf (das „>" eines Pfeils bis zum nächsten „<").
  // Alles mit Code-Zeichen fliegt raus — echter Anzeigetext enthält keine Klammern/Semikola/Gleichheitszeichen.
  const CODEISH = /[;=(){}[\]]|=>/;

  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  it("migrierte Dateien enthalten keinen fest verdrahteten Anzeigetext mehr", () => {
    const bad = [];
    for (const file of MIGRATED) {
      const src = stripComments(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
      // JSX-Textknoten: >…< sowie deutsche String-Literale in Text-Props (title/placeholder/aria-label/alt).
      const found = new Set();
      for (const m of src.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) found.add(m[1]);
      for (const m of src.matchAll(/(?:title|placeholder|aria-label|alt|label)=\{?"([^"]+)"/g)) found.add(m[1]);
      for (const s of found) {
        if (HAS_WORD.test(s) && !CODEISH.test(s)) bad.push(`${file}: „${s.trim()}“`);
      }
    }
    expect(bad, `Fest verdrahteter Text in migrierter Datei — gehört in de.js/en.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("die Ratschen-Liste zeigt nur auf existierende, i18n-nutzende Dateien", () => {
    for (const file of MIGRATED) {
      const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(src, `${file} steht in MIGRATED, importiert aber kein i18n`).toMatch(/from "\.\.\/i18n\//);
    }
  });
});

describe("i18n · Abdeckung wächst mit", () => {
  it("jeder Katalog-Schlüssel wird auch irgendwo benutzt", () => {
    // Quelltext einmal einlesen (App + alle UI-Dateien + i18n-Konsumenten in src/game).
    const roots = ["src", "src/ui", "src/game"];
    let src = "";
    for (const dir of roots) {
      for (const f of readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
        if (!f.isFile() || !/\.(js|jsx)$/.test(f.name)) continue;
        src += readFileSync(new URL(`../${dir}/${f.name}`, import.meta.url), "utf8") + "\n";
      }
    }
    const unused = KEYS_DE.filter((k) => {
      const base = k.replace(/_(one|other)$/, "");
      if (src.includes(`"${base}"`) || src.includes(`'${base}'`)) return false;
      // Dynamisch zusammengesetzte Schlüssel (`options.rfx.${v}`) über ihr Präfix erkennen.
      const prefix = base.slice(0, base.lastIndexOf(".") + 1);
      return !src.includes("`" + prefix);
    });
    expect(unused, `Toter Katalog-Eintrag (nirgends per t() gerufen):\n  ${unused.join("\n  ")}`).toEqual([]);
  });
});
