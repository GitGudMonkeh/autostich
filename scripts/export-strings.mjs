#!/usr/bin/env node
/* Loc-Export: sammelt ALLE spieler-sichtbaren Texte in eine CSV (Schema wie docs/localization/strings_de.csv).
   Drei Quellen:
     1) DATENTEXTE — die echten Register aus src/game/* werden importiert und die RESOLVETEN Endtexte
        rausgeschrieben (kein Abtippen, keine Text↔Code-Drift).
     2) MUSIKTITEL — src/ui/music.js. Eigennamen (und bereits englisch): sie werden nicht übersetzt
        und stehen mit status „n/a" in der CSV. Die frühere HEURISTIK über src/App.jsx + src/ui/*.jsx
        ist entfallen: seit alle UI-Dateien migriert sind, fand sie nur noch Katalog-SCHLÜSSEL und
        Code-Reste. Was neu in die JSX rutscht, fängt jetzt die Ratsche im Guard-Test ab.
     3) I18N-KATALOG (#sprache) — src/i18n/de.js + en.js. Diese Zeilen bringen die englische Spalte
        bereits mit (status „done"). Das ist die Zielform: die CSV ist eine ERZEUGTE ANSICHT des
        Katalogs, kein zweiter handgepflegter Textbestand. Quelle bleibt IMMER der Code.
   Aufruf: node scripts/export-strings.mjs [--ui-candidates]
   Rein lesend. */
import { writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";

import { ARCHITECT_FAMILIES, TIER_INERT_KINDS } from "../src/game/architect.js";
import { buildingEffect } from "../src/i18n/buildingText.js";
import { setLocale, SOURCE_LOCALE, LOCALE_IDS, READY_LOCALE_IDS, catalog } from "../src/i18n/index.js";
import { SUIT_ORDER, suitName } from "../src/game/constants.js";

/* #es-locale: EINE Datei je ZIELSPRACHE statt einer Spalte mehr in einer breiten CSV.

   Der Grund ist nicht Geschmack: `status` und `note` gehören per Definition zu EINER Zielsprache.
   Eine gemeinsame Datei bräuchte `status_en` und `status_es`, bräche das Schema, das
   test/loc-csv.test.js festhält, und gäbe jedem Übersetzer die Spalten aller anderen mit.

   Die englische Datei behält ihren Namen — die Ratsche, docs/localization/i18n.md und das
   Übersetzerpaket zeigen alle darauf, und eine 520-KB-Umbenennung kauft nichts. */
const CAT = Object.fromEntries(LOCALE_IDS.map((id) => [id, catalog(id)]));
const CAT_DE = CAT[SOURCE_LOCALE];
const TARGETS = LOCALE_IDS.filter((id) => id !== SOURCE_LOCALE);
const OUT_NAME = { en: "strings_de_pixi_2026-08-15.csv" };          // historisch gewachsen
const csvName = (loc) => OUT_NAME[loc] || `strings_${loc}.csv`;
// Eine unfertige Sprache lässt sich nicht rendern: `setLocale` weist sie ab (und das soll sie).
const canRender = (loc) => READY_LOCALE_IDS.includes(loc);

/* ============ Längenschranken ============
   H3 der Planung: die Spalte `limit` existierte im Schema und war in ALLEN 2800 Zeilen leer,
   während das englische Übersetzerpaket dem Übersetzer 290 gefüllte Zeilen versprach. Ein
   Übersetzer, der die Grenze nicht kennt, liefert korrekten Text, der abgeschnitten wird — und
   das fällt erst im Layout-Durchgang auf, also am teuersten Punkt.

   Hier stehen nur Grenzen, die BELEGT sind. Zwei Herkünfte, beide im `note`-Feld vermerkt:

     hart      — der Code erzwingt sie und ein Test hält sie fest (die Formations-Kürzel sitzen
                 als EIN Zeichen auf der Karte; i18n-guards.test.js prüft genau das).
     gemessen  — die Zeichenkette sitzt in einer festen Fläche. Die Schranke ist die Länge des
                 LÄNGSTEN GESCHWISTERS derselben Familie über alle fertigen Sprachen.

                 Warum das Geschwister und nicht der eigene Eintrag: die Geschwister teilen sich
                 EINE Fläche (alle vier Archetyp-Namen erscheinen in derselben Chip-Zelle), also
                 fasst die Fläche nachweislich schon den längsten von ihnen. Der erste Anlauf nahm
                 hier den eigenen Eintrag und schrieb `archetype.ice.label` ein `limit=3` vor —
                 „Eis"/„Ice" sind kurz, „Hielo" hat fünf Zeichen, und keine spanische Übersetzung
                 hätte diese Schranke je einhalten können. Eine geratene Schranke ist schlimmer als
                 keine, und eine zu enge ist eine geratene.

                 Die Zahl ist eine UNTERE Schranke der echten Kapazität: was den längsten heutigen
                 Eintrag darstellt, stellt auch alles Kürzere dar. Sie ist damit sicher, nicht exakt.
                 Gegenprobe zur Methode: für `suit.*.name` liefert sie 6 — genau den Wert, den der
                 alte Export dort hart gesetzt hatte, ohne dass er hier abgeschrieben wurde.

   Was NICHT hier steht, bekommt bewusst keine Zahl. Eine geratene Schranke ist schlimmer als
   keine: sie lässt einen Übersetzer kürzen, wo er nicht müsste. Die übrigen engen Stellen misst
   der Layout-Durchgang, wenn es spanischen Text gibt. */
const LIMIT_HARD = [
  { re: /^formation\..+\.abbr$/, value: 1, why: "Badge auf der Karte — genau ein Zeichen, paarweise verschieden" },
];
const LIMIT_MEASURED = [
  { re: /^suit\..+\.name$/,       why: "Farbname im Chip" },
  { re: /^archetype\..+\.label$/, why: "Archetyp-Name im Chip" },
  { re: /^archcat\..+\.label$/,   why: "Bau-Kategorie im Chip" },
  { re: /^rarity\.tier\d\.label$/, why: "Raritäts-Chip" },
  { re: /^perkcat\..+\.name$/,    why: "Perk-Kategorie im Chip" },
];

// Längster Eintrag der Familie über alle fertigen Sprachen — einmal je Familie, nicht je Schlüssel.
const FAMILY_MAX = new Map(LIMIT_MEASURED.map((r) => {
  const ids = Object.keys(CAT_DE).filter((k) => r.re.test(k));
  const lens = ids.flatMap((k) => READY_LOCALE_IDS.map((l) => String(CAT[l][k] ?? "").length));
  return [r, Math.max(0, ...lens)];
}));

function limitFor(id) {
  for (const r of LIMIT_HARD) if (r.re.test(id)) return { limit: String(r.value), note: `hart — ${r.why}` };
  for (const r of LIMIT_MEASURED) {
    if (!r.re.test(id)) continue;
    const max = FAMILY_MAX.get(r);
    if (max) return { limit: String(max), note: `gemessen (längstes Geschwister, ${READY_LOCALE_IDS.join("/")}) — ${r.why}` };
  }
  return null;
}


const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const OUT = resolve(ROOT, "docs/localization");
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

/* Eine Zeile trägt jetzt EINE Quellsprache und eine Abbildung Zielsprache → Text (`t`), statt
   einer festen `en`-Spalte. Geschrieben wird daraus je Zielsprache eine eigene Datei. */
const rows = [];
const push = (id, category, de, context, limit = "", note = "") => {
  if (de == null) return;
  const s = String(de).trim();
  if (!s) return;
  rows.push({ id, category, de: s, t: {}, context, limit, note });
};

/* ============ 1 · Skills + Archetypen ============
   (Migriert — beide kommen unten aus dem i18n-Katalog, samt englischer Spalte.) */

/* ============ 2 · Perks + Perk-Kategorien ============
   (Migriert — beide kommen unten aus dem i18n-Katalog, samt englischer Spalte.) */

/* ============ 3 · Perk-Familien ============
   (Migriert — Namen und alle vier Stufentexte kommen unten aus dem i18n-Katalog.) */

/* ============ 4 · Architekt-Gebäude ============
   Die NAMEN kommen aus dem i18n-Katalog (unten). Die EFFEKTTEXTE werden erzeugt
   (src/i18n/buildingText.js) — 41 Familien × bis zu 4 Stufen wären als Katalogeinträge über 100
   fast identische Sätze. Hier werden sie deshalb in BEIDEN Sprachen gerendert und als fertige
   Zeilen ausgegeben: der Übersetzer sieht den echten In-Game-Wortlaut, ohne dass daraus ein
   zweiter Pflegeort wird. */
const effIn = (loc, fam, tier) => { setLocale(loc); return buildingEffect(fam, tier); };
// Je Zielsprache rendern — aber nur, wo sie fertig ist. Eine unfertige Sprache würde sonst den
// englischen Rückfall in ihre eigene Spalte schreiben, und das sähe aus wie eine Übersetzung.
const pushEff = (id, deText, fam, tier, context) => {
  if (!deText) return;
  const t = {};
  for (const loc of TARGETS) t[loc] = canRender(loc) ? effIn(loc, fam, tier) : "";
  rows.push({ id, category: "building", de: deText, t, context, limit: "",
    note: "erzeugt aus src/i18n/buildingText.js" });
};

for (const fam of Object.values(ARCHITECT_FAMILIES)) {
  if (fam.legendary) {
    pushEff(`building.${fam.id}.legendary.eff`, effIn(SOURCE_LOCALE, fam, "legendary"), fam, "legendary",
      `Architekt-Gebäude „${fam.name}" — Effekt (legendär)`);
  } else {
    const inert = TIER_INERT_KINDS.has(fam.base && fam.base.kind);
    const maxTier = inert ? (fam.tierKick ? fam.tierKick.at : 1) : 4;
    const seen = new Set();
    for (let t = 1; t <= maxTier; t++) {
      const deText = effIn(SOURCE_LOCALE, fam, t);
      if (!deText || seen.has(deText)) continue;
      seen.add(deText);
      pushEff(`building.${fam.id}.tier${t}.eff`, deText, fam, t,
        `Architekt-Gebäude „${fam.name}" — Effekt Stufe ${ROMAN[t]}`);
    }
  }
}
setLocale(SOURCE_LOCALE); // für alles Weitere wieder Deutsch

/* ============ 5 · Glossar ============
   (Migriert — Labels, Texte UND die `match`-Wortformen kommen unten aus dem i18n-Katalog.
   Die Wortformen sind kein Anzeigetext: sie steuern die Auto-Fettung und wurden für Englisch
   NEU GESCHRIEBEN, nicht übersetzt.) */

/* ============ 6 · Rarität / Stufen ============
   (Migriert — die Namen kommen unten aus dem i18n-Katalog, samt englischer Spalte.) */

/* ============ 7 · Farben ============
   (Formationsnamen sind migriert und kommen unten aus dem i18n-Katalog.) */
for (const s of SUIT_ORDER) push(`ui.suit.${s}.name`, "ui", suitName(s), "Kartenfarbe", "6");

/* ============ 8 · Kosmetik ============
   (Migriert — EIN Name je Set plus die globalen Effekte kommen unten aus dem i18n-Katalog.
   Spielfeld- und Paketname leiten sich im Register vom Decknamen ab, es gibt also nichts
   Zusätzliches zu übersetzen.) */

/* ============ 9 · Wochen-Modifikatoren ============
   (Migriert — Namen und {v}-Beschreibungen kommen unten aus dem i18n-Katalog.) */

/* ============ 10 · Fortschrittsbaum (Upgrades) ============
   (Migriert — Knoten- und Zweig-Texte kommen unten aus dem i18n-Katalog.) */

/* ============ 11 · Freischalt-Bedingungen (Kosmetik) ============
   (Migriert — `unlockProgress` liefert nur noch kind/vars, der Satz steht als `unlock.*` im Katalog.) */

/* ============ 12 · Archetyp-Leitfäden ============
   (Migriert — alle vier Leitfäden kommen unten aus dem i18n-Katalog. Die Schlüssel entstehen aus
   EINEM Baum-Durchlauf über GUIDES, siehe src/i18n/guideWalk.js.) */

/* ============ 13 · Bau-Kategorien ============
   (Formationsnamen, Kürzel UND Bau-Kategorien sind migriert — sie kommen unten aus dem Katalog.) */

/* ============ 14 · Musiktitel ============
   `music.js` liefert ausschließlich MUSIKTITEL. Die sind Eigennamen (und bereits englisch) —
   sie werden nicht übersetzt und sollen die Restliste nicht aufblähen. Deshalb markiert, nicht
   migriert: status „n/a" heißt „bewusst einsprachig", nicht „noch offen". */
for (const r of uiRows()) {
  const isTrack = /ui\/music\.js/.test(r.context || "");
  if (isTrack) {
    // Eigenname: in JEDER Zielsprache derselbe Text, und `status` bleibt „n/a" statt „done".
    rows.push({ id: r.id, category: "system", de: r.de, t: Object.fromEntries(TARGETS.map((l) => [l, r.de])),
      context: "Musiktitel — Eigenname, wird NICHT übersetzt", limit: "", status: "n/a", note: "do-not-translate" });
  } else {
    push(r.id, r.category, r.de, r.context, r.limit, r.note);
  }
}

/* ============ 15 · i18n-Katalog (#sprache) ============
   Migrierte Texte kommen NICHT mehr aus der Heuristik, sondern direkt aus src/i18n/. Sie bringen
   ihre englische Spalte schon mit (status „done") — die CSV ist damit das, was sie sein soll:
   eine ERZEUGTE Ansicht des Katalogs, kein zweiter, handgepflegter Textbestand.
   Sobald eine Datei migriert ist, wandern ihre Zeilen automatisch von „new" nach „done". */
for (const key of Object.keys(CAT_DE)) {
  const deText = String(CAT_DE[key] ?? "").trim();
  if (!deText) continue;
  const lim = limitFor(key);
  rows.push({
    id: key, category: "i18n", de: deText,
    t: Object.fromEntries(TARGETS.map((l) => [l, String(CAT[l][key] ?? "").trim()])),
    context: "i18n-Katalog (src/i18n) — über t() aufgelöst",
    limit: lim ? lim.limit : "", note: lim ? lim.note : "",
  });
}

/* ============ CSV schreiben ============ */
/* Doppelte austreiben: was schon im Katalog steht, darf nicht zusätzlich als heuristisch
   gefischte `ui.*`-Zeile auftauchen — sonst übersetzt jemand denselben Satz zweimal. */
const CATALOG_TEXTS = new Set(Object.values(CAT_DE).map((s) => String(s).trim()));
const deduped = rows.filter((r) => r.category === "i18n" || !CATALOG_TEXTS.has(r.de));
rows.length = 0; rows.push(...deduped);

const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
rows.sort((a, b) => (a.category + a.id).localeCompare(b.category + b.id, SOURCE_LOCALE));

/* Spaltenschema je Zielsprache. Die Zielspalte heißt IMMER wie die Sprach-ID — für `en` ergibt
   das exakt das bisherige Schema, das test/loc-csv.test.js festhält, unverändert.

   `en_ref` kommt nur bei den ÜBRIGEN Sprachen dazu, und nur als REFERENZ: übersetzt wird aus dem
   Deutschen (Entscheidung des Owners), Englisch steht daneben, weil dort eine Mehrdeutigkeit des
   Deutschen schon einmal aufgelöst wurde. Wo beide sich widersprechen, gilt Deutsch, und der
   Übersetzer vermerkt es in `note`. */
const headFor = (loc) => loc === "en"
  ? ["id", "category", "de", "en", "context", "limit", "status", "note"]
  : ["id", "category", "de", loc, "en_ref", "context", "limit", "status", "note"];

for (const loc of TARGETS) {
  const head = headFor(loc);
  const line = (r) => {
    const text = r.t[loc] ?? "";
    const cell = {
      id: r.id, category: r.category, de: r.de, [loc]: text, en_ref: r.t.en ?? "",
      context: r.context, limit: r.limit, note: r.note,
      // „n/a" heißt „bewusst einsprachig" und darf nicht zu „done" werden, nur weil Text dasteht.
      status: r.status === "n/a" ? "n/a" : (text ? "done" : "new"),
    };
    return head.map((h) => q(cell[h])).join(",");
  };
  const csv = [head.map(q).join(",")].concat(rows.map(line)).join("\r\n") + "\r\n";
  writeFileSync(join(OUT, csvName(loc)), csv, "utf8");
  const offen = rows.filter((r) => r.status !== "n/a" && !(r.t[loc] ?? "")).length;
  const mitLimit = rows.filter((r) => r.limit).length;
  console.error(`DATA [${loc}]: ${rows.length} Zeilen (${offen} offen, ${mitLimit} mit Längenschranke) → docs/localization/${csvName(loc)}`);
}

/* ============ UI-Texte (kuratiert) ============
   Heuristik + Filterlisten. Ergibt die `ui.*`/`store.*`/`system.*`-Zeilen der CSV. Bewusst KEIN
   Loc-System im Code (alle Strings inline) — dieser Export ist die Zusammenführung. */
function uiRows() {
  // Nur noch die Musiktitel: alle JSX-Dateien sind migriert und kommen über den Katalog (Quelle 3).
  const SRC = [
    ["src/ui/music.js", "ui", "Musiktitel"],
  ];
  const GERMAN = /[A-ZÄÖÜ][a-zäöüß]{2,}|[a-zäöüß]{3,}\s|ä|ö|ü|ß/;
  const CSSY = /\b(text|font|rounded|w|h|p[xytblr]?|m[xytblr]?|gap|flex|grid|bg|border|top|left|right|bottom|z|min|max|inline|block|leading|tracking|uppercase|shrink|truncate|tabular|overflow|sticky|absolute|relative|order|col|row|as|sm|md|lg|opacity|hover|transition|cursor|select|pointer|space|items|justify|self|ring|shadow|backdrop)-/;
  // Code-Reste aussortieren. WICHTIG: runde Klammern NICHT pauschal verwerfen — deutsche UI-Texte benutzen sie
  // ständig („Grün (reif)", „Gletscher-Formationen (2D)"). Verworfen wird nur, was nach Code aussieht:
  // Aufruf-Muster `name(`, unbalancierte Klammern, Zuweisungen/Operatoren.
  const FRAGMENT = /[{};=<>|&]|=>|\?\s|\s\?|^[·,.:]|^\d+\s*[?:]|[A-Za-z_$]\(/;
  const unbalanced = (t) => {
    let d = 0;
    for (const ch of t) { if (ch === "(") d++; else if (ch === ")") d--; if (d < 0) return true; }
    return d !== 0;
  };
  const DROP = new Set([
    "Helvetica Neue", "Georgia, serif", "MacIntel", "ArrowLeft", "ArrowRight", "Escape", "ActionBar",
    "RunStats", "fx:hologridSlice", "perk2Leg", "perk2Reroll",
  ]);
  const out = [];
  const used = new Set();
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").slice(0, 6).join("-") || "text";
  for (const [rel, category, context] of SRC) {
    const p = resolve(ROOT, rel);
    let src; try { src = readFileSync(p, "utf8"); } catch { continue; }
    const comp = rel.split("/").pop().replace(/\.jsx?$/, "").toLowerCase();
    const lines = src.split("\n");
    const seen = new Set();
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const cands = [];
      for (const m of line.matchAll(/"([^"\\\n]{2,})"|'([^'\\\n]{2,})'|`([^`\\\n]{2,})`/g)) cands.push(m[1] ?? m[2] ?? m[3]);
      for (const m of line.matchAll(/>\s*([^<>{}\n][^<>{}\n]{1,})\s*</g)) cands.push(m[1]);
      // Label-Fragmente, die DIREKT an einer Interpolation kleben — „Stich {pos} / {len}", „Knoten · {x}".
      // Ohne diese Muster fehlten ~50 sichtbare Texte im Export (u. a. der Stich-Zähler auf dem Spielfeld).
      for (const m of line.matchAll(/>\s*([^<>{}\n]{2,}?)\s*\{|\}\s*([^<>{}\n]{2,}?)\s*<|\}\s*([^<>{}\n]{2,}?)\s*\{/g)) {
        cands.push(m[1] ?? m[2] ?? m[3]);
      }
      for (const c of cands) {
        const s = (c || "").trim();
        if (s.length < 2 || seen.has(s) || DROP.has(s)) continue;
        if (/\b(catch|const|return|else|of|current|null|undefined|typeof)\b/.test(s)) continue;  // Code-Reste
        if (/^[)([\],.:|&?]+$|^[)(]|[)(]$/.test(s)) continue;
        if (!GERMAN.test(s) && !/^[A-Z]/.test(s)) continue;   // Musiktitel sind englisch, aber Großbuchstabe am Anfang
        if (CSSY.test(s) || FRAGMENT.test(s) || unbalanced(s)) continue;
        if (!/\s/.test(s) && /^[a-z][A-Za-z0-9_]*$/.test(s)) continue;  // camelCase-/Enum-Bezeichner
        if (/^L\d+$/.test(s)) continue;
        if (/#[0-9a-fA-F]{3,8}\b|\b(solid|dashed|dotted|inset|ease-out|ease-in|linear)\b/.test(s)) continue; // CSS-Werte
        if (/^[MmLlHhVvCcSsQqTtAaZz][\d\s.,-]/.test(s)) continue;                                            // SVG-Pfade                                  // interne Perk-IDs (L5, L11 …)
        if (/^(?:https?:|\/|\.\/|\.\.\/|#[0-9a-f]{3,8}$)/i.test(s)) continue;
        if (/\d(?:px|rem|em|vh|vw|dvh|deg|ms|fr)\b/.test(s)) continue;                                   // CSS-Maße
        if (/\b(?:sm|md|lg|xl|hover|focus|group|dark):/.test(s)) continue;                            // Tailwind-Varianten
        seen.add(s);
        let id = `${category === "store" ? "store" : category === "system" ? "system" : category === "tutorial" ? "tutorial" : category === "achievement" ? "achievement" : "ui"}.${comp}.${slug(s)}`;
        let n = 2; while (used.has(id)) id = `${id.replace(/-\d+$/, "")}-${n++}`;
        used.add(id);
        const note = comp === "music" ? "Eigenname (Musiktitel) — nicht übersetzen" : "";
        out.push({ id, category, de: s, context: `${context} — ${rel}:${i + 1}`, limit: "", note });
      }
    });
  }
  return out;
}

/* ============ UI-Kandidaten (Heuristik, Rohliste) ============ */
if (process.argv.includes("--ui-candidates")) {
  let files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(p)) files.push(p);
    }
  };
  walk(resolve(ROOT, "src/ui"));
  files.push(resolve(ROOT, "src/App.jsx"));
  files = files.filter((p) => !p.includes("/ui/fx/"));  // reine WebGL-/Shader-Quellen, kein Spielertext
  files.sort();

  const GERMAN = /[A-ZÄÖÜ][a-zäöüß]{2,}|[a-zäöüß]{3,}\s|ä|ö|ü|ß/;
  const CODEY = /^(?:[a-z0-9_-]+|[a-z]+([A-Z][a-z]*)+|#[0-9a-fA-F]{3,8}|[\d.,%\s+×–—-]+|rgba?\(.*|var\(--.*|.*\b(px|rem|em|vh|vw|deg|ms)\b.*)$/;
  const NOISE = /[;{}=]|\b(vec[234]|float|uniform|attribute|precision|gl_|const |return |function |import |export |style|className|transform|translate|linear-gradient|radial-gradient|cubic-bezier|inset|solid|blur|opacity|flex|grid|absolute|relative|center|monospace|nowrap|pointer|hidden|scroll|butt|round|bevel|miter)\b/;
  const out = [];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;                  // Kommentarzeilen raus
      const cands = [];
      for (const m of line.matchAll(/"([^"\\\n]{2,})"|'([^'\\\n]{2,})'|`([^`\\\n]{2,})`/g)) cands.push(m[1] ?? m[2] ?? m[3]);
      for (const m of line.matchAll(/>\s*([^<>{}\n][^<>{}\n]{1,})\s*</g)) cands.push(m[1]);
      for (const c of cands) {
        const s = c.trim();
        if (!s || s.length < 2) continue;
        if (!GERMAN.test(s)) continue;
        if (CODEY.test(s)) continue;
        if (NOISE.test(s)) continue;
        if (/^(?:https?:|\/|\.\/|\.\.\/)/.test(s)) continue;
        out.push(`${relative(ROOT, p)}:${i + 1}\t${s}`);
      }
    });
  }
  writeFileSync(join(OUT, "_ui_candidates.tsv"), [...new Set(out)].join("\n") + "\n", "utf8");
  console.error(`UI-Kandidaten: ${new Set(out).size} → docs/localization/_ui_candidates.tsv`);
}
