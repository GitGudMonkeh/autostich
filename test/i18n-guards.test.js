import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { t, fmtNum, fmtPct, LOCALE_IDS, setLocale, getLocale, interpolate,
  SOURCE_LOCALE, DEFAULT_LOCALE } from "../src/i18n/index.js";
import { tokenizeGlossary } from "../src/i18n/glossaryText.js";

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
    "formation.wechsel.abbr", // Wechsel/Zigzag → beide Z
    "formation.anker.abbr",   // Anker/Anchor  → beide A
    "perkcat.A.name",         // „Deck" ist in beiden Sprachen dasselbe Wort
    "perkcat.D.name",         // „Score" bleibt Score (§3.1)
    "perkcat.D.desc",         // dito
    "perkcat.E.name",         // „Form" — Chip-Kurzform, in beiden Sprachen identisch
    "perk.L_ECHO.label",      // „Echo" ist in beiden Sprachen dasselbe Wort
    // Familiennamen, die als Fremdwort schon englisch sind:
    "family.B_MOMENTUM.name",   // Momentum
    "family.B_INITIATIVE.name", // Initiative
    "family.C_TRIUMPH.name",    // Triumph
    "family.C_FINISHER.name",   // Finisher
    "building.kick.active",     // reine Struktur: „{base} · {kick}" — kein übersetzbarer Text
    "branch.deck.name",         // „Decks" ist in beiden Sprachen dasselbe Wort
    // Glossar-Begriffe, die im Englischen genauso heißen (Fremdwort oder Fachbegriff):
    "glossary.crit.label", "glossary.deck.label", "glossary.position.label",
    "glossary.segment.label", "glossary.formation.label", "glossary.cluster.label",
    "glossary.perk.label",
    // Leitfaden-Schlagwörter, die als Fremdwort schon englisch sind:
    "guide.lightning.pillars.0.name", "guide.lightning.loop.nodes.0",  // Crit
    "guide.lightning.principle.0.tag", "guide.fire.principle.1.tag",   // Mono · Payoff
    "guide.ice.principle.1.tag", "guide.plant.principle.1.tag",        // Position · Mono
  ]);

  /* Eigennamen-KLASSEN statt 18 Einzeleinträge: Kosmetik-Set-Namen und Effekt-Namen sind
     überwiegend Eigennamen (Kitsune, Ronin, Seraph, Aurora, Supernova) und lauten in beiden
     Sprachen gleich. Der Preis dieser Ausnahme: eine vergessene Kosmetik-Übersetzung fällt hier
     nicht auf. Deshalb prüft der Test darunter positiv nach, dass die beschreibenden Namen
     (allen voran die vier Archetyp-Decks) tatsächlich übersetzt sind. */
  const SAME_OK_CLASS = /^(cosmetic\..+\.name|cosmetic\.bf\.suffix|fx\..+\.name)$/;

  it("englische Texte unterscheiden sich vom deutschen Original", () => {
    const same = KEYS_DE.filter((k) => k in en && de[k] === en[k] && !SAME_OK.has(k) && !SAME_OK_CLASS.test(k));
    expect(same, `Unübersetzt (oder in SAME_OK eintragen, wenn das Wort wirklich identisch ist):\n  ${same.join("\n  ")}`).toEqual([]);
  });

  /* Gegenprobe zur Eigennamen-Klasse: Kosmetik-Namen, die etwas BESCHREIBEN statt zu benennen,
     müssen übersetzt sein. Die vier Archetyp-Decks tragen zusätzlich exakt die Archetyp-Namen —
     sie SIND diese Decks, ein Auseinanderlaufen wäre für Spieler direkt verwirrend. */
  it("beschreibende Kosmetik-Namen sind übersetzt, Archetyp-Decks tragen ihre Archetyp-Namen", () => {
    for (const [arch, deckId] of [["lightning", "deck_blitz"], ["fire", "deck_feuer"],
      ["ice", "deck_eis"], ["plant", "deck_pflanze"]]) {
      expect(en[`cosmetic.${deckId}.name`], `${deckId} muss wie der Archetyp heißen`)
        .toBe(en[`archetype.${arch}.label`]);
    }
    for (const k of ["cosmetic.deck_kosmos.name", "cosmetic.deck_oni.name", "cosmetic.deck_drache.name",
      "cosmetic.deck_serie1500.name", "cosmetic.deck_sparfuchs.name", "cosmetic.deck_sonne.name"]) {
      expect(en[k], `${k} beschreibt etwas und muss übersetzt sein`).not.toBe(de[k]);
    }
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
  /* Deutsch schreibt 1.234,5 — Englisch 1,234.5. Beide Sprachen benutzen BEIDE Zeichen, nur in
     vertauschten Rollen; ein nacktes /\d,\d/ träfe deshalb auch den englischen Tausendertrenner
     („12,000"). Unterscheidungsmerkmal: ein Tausenderblock hat GENAU drei Ziffern. Alles andere
     hinter dem Trennzeichen ist ein Dezimalteil — und damit in der falschen Sprache. */
  const DE_DECIMAL_IN_EN = /\d,(\d{1,2}(?!\d)|\d{4,})/;
  const EN_DECIMAL_IN_DE = /\d\.(\d{1,2}(?!\d)|\d{4,})/;

  it("englische Texte enthalten keine deutschen Dezimalkommas", () => {
    const bad = KEYS_EN.filter((k) => DE_DECIMAL_IN_EN.test(en[k]));
    expect(bad, `Deutsches Dezimalkomma in en.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("deutsche Texte enthalten keine englischen Dezimalpunkte", () => {
    // Ausgenommen: Auslassungspunkte, Aufzählungspunkte („2. / 3. Schwelle") und Kürzel wie „p95".
    const bad = KEYS_DE.filter((k) => EN_DECIMAL_IN_DE.test(de[k]));
    expect(bad, `Englischer Dezimalpunkt in de.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  /* DER wichtigste Wächter für die Registertexte: beide Sprachen müssen DIESELBEN Zahlen nennen.
     Die englischen Skill-Texte interpolieren zwar dieselben Konstanten wie die deutschen, aber
     nichts erzwingt das — jemand könnte eine Zahl abtippen, und beim nächsten Balancing liefe sie
     still weg. Hier fliegt genau das auf: Zahlmengen extrahieren, Trennzeichen normalisieren,
     vergleichen. Schlägt fehl, sobald eine Zahl in einer Sprache fehlt, zu viel ist oder abweicht. */
  const numbersOf = (text, loc) => {
    const grouped = loc === "de" ? /(\d)\.(\d{3})(?!\d)/g : /(\d),(\d{3})(?!\d)/g;
    let s = String(text);
    for (let i = 0; i < 3; i++) s = s.replace(grouped, "$1$2");   // 1.234.567 → mehrfach zusammenziehen
    if (loc === "de") s = s.replace(/(\d),(\d)/g, "$1.$2");       // Dezimal-Komma → Punkt
    return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((a, b) => a - b);
  };

  /* Ausnahmen: NUR wo eine Zahl im Englischen ausgeschrieben besser ist als als Ziffer.
     Jeder Eintrag braucht eine Begründung — die Liste soll klein bleiben, sonst entwertet sie
     den Wächter. Ein „das passt schon" ist keine Begründung. */
  const NUM_OK = new Map([
    ["ability.SK_FIRE_L02.desc", "de „1×/Durchlauf“ → en „once per cycle“; „1× per cycle“ wäre steifes Englisch"],
    ["glossary.rankedrun.text", "de „Platz 1“ → en „first place“; „place 1“ liest sich im Englischen falsch"],
  ]);

  it("beide Sprachen nennen dieselben Zahlen", () => {
    const bad = [];
    for (const k of KEYS_DE) {
      if (!(k in en) || NUM_OK.has(k)) continue;
      const a = numbersOf(de[k], "de"), b = numbersOf(en[k], "en");
      if (a.length !== b.length || a.some((n, i) => n !== b[i])) {
        bad.push(`${k}\n     de: [${a.join(", ")}]\n     en: [${b.join(", ")}]`);
      }
    }
    expect(bad, `Zahlen laufen zwischen den Sprachen auseinander:\n  ${bad.join("\n  ")}`).toEqual([]);
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
    // „Formationsphase"/„Formations-Energie" bilden auf „order phase"/„order energy" ab (Freigabe §3.2)
    // und dürfen deshalb NICHT „formation" verlangen — die eigenen Regeln dafür stehen darüber.
    { de: /\bFormation(?!sphase|s-Energie|senergie)/i, ok: /\bformation/i, never: null,      name: "Formation → formation" },
    { de: /\bMultiplikator\b/i, ok: /\bmultiplier\b/i, never: null,                   name: "Multiplikator → multiplier" },
    // Freigabe 15.08.2026: die drei entschiedenen Klangfragen + die deutsche Umbenennung.
    { de: /Aufstellungsphase/i, ok: /\border phase\b/i, never: /\blayout\b/i,          name: "Aufstellungsphase → order phase (nie „layout“)" },
    { de: /Formations-Energie/i, ok: /\border energy\b/i, never: /\blayout\b/i,        name: "Formations-Energie → order energy" },
    { de: /\bZiehreihenfolge\b/i, ok: /\bdraw order\b/i, never: null,                  name: "Ziehreihenfolge → draw order" },
    { de: /\bEpisch\b/,        ok: /\bepic\b/i,       never: /\blegendary\b/i,        name: "Episch → Epic (nie „legendary“ — das ist eine eigene Achse)" },
    { de: /Deck-Werkstatt/i,   ok: /deck workshop/i,  never: null,                     name: "Deck-Werkstatt → deck workshop" },
    { de: /Stichpunkte?\b/i,   ok: /\bTrick Points?\b|\bTP\b/,  never: /\bSP\b/,        name: "Stichpunkte → Trick Points (TP, nie SP)" },
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

  /* Die Score-Ansagen sind eingefroren (Übersetzerpaket §3.6, Freigabe 15.08.2026). Sie stehen
     heute noch als BIG_SCORE_TIERS in Battlefield.jsx und wandern bei deren Migration in den
     Katalog — dieser Test hält die Zuordnung fest, damit sie den Umzug unverändert übersteht.
     „STRONG" ist bewusst NICHT die unterste Stufe: die Kette muss hörbar steigern. */
  it("die Score-Ansagen halten die freigegebene Eskalationskette", () => {
    const CHAIN = [["Stark", "FIERCE"], ["Brutal", "BRUTAL"], ["Irre", "INSANE"], ["Gottgleich", "GODLIKE"],
      ["Lawine", "AVALANCHE"], ["Gönn dir", "LET’S GO!"]];
    // Geprüft werden nur Texte, die ÜBER die Ansagen reden — erkennbar daran, dass sie mindestens
    // eine Stufe in Versalien nennen. Ohne diese Einschränkung schlüge das Adverb „stark" in
    // beliebigen Sätzen an („entlastet schwache Geräte stark").
    const isAbout = (s) => CHAIN.some(([, enWord]) => s.includes(enWord.replace("!", "")));
    const bad = [];
    for (const k of KEYS_DE) {
      if (!(k in en) || !isAbout(en[k])) continue;
      for (const [deWord, enWord] of CHAIN) {
        if (!new RegExp(`\\b${deWord}\\b`).test(de[k])) continue;   // case-sensitiv: die Ansage ist ein Name
        if (!en[k].includes(enWord)) bad.push(`${k}: „${deWord}" → muss „${enWord}" sein\n     en: ${en[k]}`);
      }
    }
    expect(bad, `Score-Ansage weicht von der Freigabe ab:\n  ${bad.join("\n  ")}`).toEqual([]);
    expect(CHAIN.map((c) => c[1])).not.toContain("STRONG");
  });
});

describe("i18n · Längenschranken", () => {
  /* Die Formations-Badges sitzen als EIN Zeichen auf der Karte. Zwei Zeichen sprengen das Layout,
     zwei gleiche Zeichen machen zwei Formationen ununterscheidbar. Gilt in JEDER Sprache. */
  it("Formations-Kürzel sind je genau ein Zeichen und paarweise verschieden", () => {
    for (const [name, cat] of [["de", de], ["en", en]]) {
      const abbrs = Object.entries(cat).filter(([k]) => /^formation\..+\.abbr$/.test(k));
      expect(abbrs.length, `${name}: keine Kürzel im Katalog`).toBeGreaterThan(0);
      const bad = abbrs.filter(([, v]) => [...v].length !== 1);
      expect(bad, `${name}: Kürzel mit ≠1 Zeichen → ${bad.map(([k, v]) => `${k}="${v}"`).join(", ")}`).toEqual([]);
      const vals = abbrs.map(([, v]) => v);
      expect(new Set(vals).size, `${name}: Kürzel kollidieren → ${vals.join(" ")}`).toBe(vals.length);
    }
  });

  /* Die Raritätsleiter darf im Englischen NICHT auf „Legendary" enden: legendär ist bei uns eine
     eigene Achse (Übersetzerpaket §3.5, genre-terminologie.md §3). */
  it("die englische Raritätsleiter endet auf Epic, nicht Legendary", () => {
    expect([1, 2, 3, 4].map((n) => en[`rarity.tier${n}.label`]))
      .toEqual(["Common", "Uncommon", "Rare", "Epic"]);
  });

  /* enMeta.js hält „Rare"/„Epic" als eigene Konstanten (en.js importiert die Datei → kein Zugriff
     auf die Leiter). Dieser Test ist die Naht: benennt jemand die Leiter um, fliegt es hier auf. */
  it("Texte, die Raritätsnamen einsetzen, benutzen dieselben Wörter wie die Leiter", () => {
    for (const k of ["weekmod.perkCap.desc", "weekmod.perkBlessing.desc", "node.tier3.detail", "node.tier4.detail"]) {
      const tier = /tier3/.test(k) ? 3 : /tier4/.test(k) ? 4 : null;
      const need = tier ? [en[`rarity.tier${tier}.label`]] : [en["rarity.tier3.label"], en["rarity.tier4.label"]];
      for (const w of need) expect(en[k], `${k} muss „${w}" nennen`).toContain(w);
    }
  });
});

describe("i18n · Glossar-Wortformen", () => {
  /* Die `match`-Listen sind KEIN Anzeigetext — sie steuern die Auto-Fettung in jeder Beschreibung.
     Für Englisch wurden sie neu geschrieben (Plurale, Verbformen), nicht übersetzt. Zwei Dinge
     müssen stimmen, sonst fettet das Spiel still falsch oder gar nicht. */
  const forms = (cat) => Object.entries(cat)
    .filter(([k]) => /^glossary\..+\.match$/.test(k))
    .map(([k, v]) => [k, String(v).split("|").filter(Boolean)]);

  it("jeder Eintrag hat mindestens eine Wortform, keine leer, keine doppelt", () => {
    for (const [name, cat] of [["de", de], ["en", en]]) {
      const all = forms(cat);
      expect(all.length, `${name}: keine Wortformen im Katalog`).toBeGreaterThan(0);
      const bad = all.filter(([, list]) => !list.length || list.some((f) => f !== f.trim() || !f));
      expect(bad.map(([k]) => k), `${name}: leere/ungetrimmte Wortform`).toEqual([]);
      const dupes = all.filter(([, list]) => new Set(list).size !== list.length);
      expect(dupes.map(([k]) => k), `${name}: Wortform doppelt im selben Eintrag`).toEqual([]);
    }
  });

  it("die Auto-Fettung ist in beiden Sprachen verlustfrei", () => {
    const before = getLocale();
    for (const [name, cat] of [["de", de], ["en", en]]) {
      setLocale(name);
      const texts = Object.entries(cat)
        .filter(([k]) => /^(ability|family|perk)\..*\.(desc|text)$/.test(k))
        .map(([, v]) => v);
      let hits = 0;
      for (const text of texts) {
        const parts = tokenizeGlossary(text);
        expect(parts.map((p) => p.text).join(""), `${name}: Tokenizer verändert den Text`).toBe(text);
        hits += parts.filter((p) => p.bold).length;
      }
      // Greift die Fettung überhaupt? Ohne diese Schranke könnte eine kaputte EN-Wortformliste
      // unbemerkt NULL Treffer liefern — der Roundtrip allein würde das nicht merken.
      expect(hits, `${name}: die Auto-Fettung greift praktisch nicht`).toBeGreaterThan(texts.length / 2);
    }
    setLocale(before);
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
    expect(setLocale("de")).toBe("de");
    expect(setLocale("klingonisch")).toBe(DEFAULT_LOCALE);   // Rückfall statt kaputter UI
    setLocale(before);
    expect(LOCALE_IDS).toEqual(["de", "en"]);
  });

  /* Zwei Standards, die gern verwechselt werden — der Test hält sie auseinander:
     Geschrieben wird auf Deutsch (Quellsprache, immer vollständig → Rückfall bei fehlendem
     Schlüssel), ausgeliefert wird an neue Spieler auf Englisch (Produktentscheidung). */
  it("Quellsprache ist Deutsch, Auslieferungs-Standard ist Englisch", () => {
    expect(SOURCE_LOCALE).toBe("de");
    expect(DEFAULT_LOCALE).toBe("en");
    // Ein Schlüssel, den es nur auf Deutsch gäbe, fiele auf Deutsch zurück — nie auf den Schlüssel.
    expect(t("common.close", null, "de")).toBe("Schließen");
    expect(t("common.close", null, "en")).toBe("Close");
  });
});

describe("i18n · Ratsche gegen neue deutsche Inline-Texte", () => {
  /* Migrierte Dateien holen ihre Texte AUSSCHLIESSLICH über t(). Diese Liste wächst mit jeder
     migrierten Datei und schrumpft nie — so kann eine schon zweisprachige Ansicht nicht durch
     einen schnellen Zugang wieder einsprachig werden. Neue Dateien hier eintragen, sobald sie
     migriert sind. */
  const MIGRATED = ["src/ui/OptionsModal.jsx", "src/ui/StartScreen.jsx", "src/ui/UsernameModal.jsx"];

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
    // src/i18n gehört dazu: labels.js baut die Register-Schlüssel dynamisch zusammen.
    const roots = ["src", "src/ui", "src/game", "src/i18n"];
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
      /* Dynamisch zusammengesetzte Schlüssel erkennen. Die Einsetzstelle kann auf JEDER Ebene
         liegen: `options.rfx.${v}` (hinten) genauso wie `formation.${type}.label` (in der Mitte).
         Deshalb jedes Präfix von links prüfen, nicht nur das längste. */
      const parts = base.split(".");
      for (let i = 1; i <= parts.length; i++) {
        if (src.includes("`" + parts.slice(0, i).join(".") + ".")) return false;
      }
      return true;
    });
    expect(unused, `Toter Katalog-Eintrag (nirgends per t() gerufen):\n  ${unused.join("\n  ")}`).toEqual([]);
  });
});
