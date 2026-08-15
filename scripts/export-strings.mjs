#!/usr/bin/env node
/* Loc-Export: sammelt ALLE spieler-sichtbaren Texte in eine CSV (Schema wie docs/localization/strings_de.csv).
   Drei Quellen:
     1) DATENTEXTE — die echten Register aus src/game/* werden importiert und die RESOLVETEN Endtexte
        rausgeschrieben (kein Abtippen, keine Text↔Code-Drift).
     2) UI-TEXTE — heuristisch aus src/App.jsx + src/ui/*.jsx gezogen (JSX-Textknoten, Text-Props,
        String-Literale). Kandidatenliste, danach kuratiert. Schrumpft mit jeder migrierten Datei.
     3) I18N-KATALOG (#sprache) — src/i18n/de.js + en.js. Diese Zeilen bringen die englische Spalte
        bereits mit (status „done"). Das ist die Zielform: die CSV ist eine ERZEUGTE ANSICHT des
        Katalogs, kein zweiter handgepflegter Textbestand. Quelle bleibt IMMER der Code.
   Aufruf: node scripts/export-strings.mjs [--ui-candidates]
   Rein lesend. */
import { writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";

import { ARCHETYPE_META } from "../src/game/skills.js";   // nur noch für die Leitfaden-Kontextspalte
import { PERK_DEFS, CATEGORIES as PERK_CATS } from "../src/game/perks.js";
import { ARCHITECT_FAMILIES, TIER_INERT_KINDS } from "../src/game/architect.js";
import { buildingEffect } from "../src/i18n/buildingText.js";
import { setLocale, SOURCE_LOCALE } from "../src/i18n/index.js";
import { TIER_META } from "../src/game/rarity.js";
import CAT_DE from "../src/i18n/de.js";
import CAT_EN from "../src/i18n/en.js";
import { SUIT_ORDER, suitName } from "../src/game/constants.js";
import { unlockProgress, MONO_CHALLENGE_N } from "../src/game/cosmetics.js";
import { ARCH_CAT } from "../src/ui/indicators/vocab.js";

// Freischalt-Bedingungen: je `kind` EIN Muster-Def, damit unlockProgress seinen Klartext-Label liefert.
const UNLOCK_SAMPLES = {
  none:               { unlock: null },
  games:              { unlock: { kind: "games", n: 10 } },
  streak:             { unlock: { kind: "streak", n: 300 } },
  score:              { unlock: { kind: "score", n: 1000000 } },
  noRerollRun:        { unlock: { kind: "noRerollRun" } },
  monoArchetypeRun:   { unlock: { kind: "monoArchetypeRun", archetype: "fire", n: MONO_CHALLENGE_N } },
  allMonoArchetypes:  { unlock: { kind: "allMonoArchetypes", n: MONO_CHALLENGE_N } },
  allArchetypesRun:   { unlock: { kind: "allArchetypesRun" } },
  gottgleichRun:      { unlock: { kind: "gottgleichRun" } },
  meisterNoReroll:    { unlock: { kind: "meisterNoReroll" } },
  championWeek:       { unlock: { kind: "championWeek" } },
  buy:                { unlock: { kind: "buy", ownKey: "pack:x" } },
  onboardingDone:     { unlock: { kind: "onboardingDone" } },
};

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const OUT = resolve(ROOT, "docs/localization");
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

const rows = [];
const push = (id, category, de, context, limit = "", note = "") => {
  if (de == null) return;
  const s = String(de).trim();
  if (!s) return;
  rows.push({ id, category, de: s, en: "", context, limit, status: "new", note });
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
const pushEff = (id, deText, enText, context) => {
  if (!deText) return;
  rows.push({ id, category: "building", de: deText, en: enText, context, limit: "", status: "done", note: "erzeugt aus src/i18n/buildingText.js" });
};

for (const fam of Object.values(ARCHITECT_FAMILIES)) {
  if (fam.legendary) {
    pushEff(`building.${fam.id}.legendary.eff`, effIn("de", fam, "legendary"), effIn("en", fam, "legendary"),
      `Architekt-Gebäude „${fam.name}" — Effekt (legendär)`);
  } else {
    const inert = TIER_INERT_KINDS.has(fam.base && fam.base.kind);
    const maxTier = inert ? (fam.tierKick ? fam.tierKick.at : 1) : 4;
    const seen = new Set();
    for (let t = 1; t <= maxTier; t++) {
      const deText = effIn("de", fam, t);
      if (!deText || seen.has(deText)) continue;
      seen.add(deText);
      pushEff(`building.${fam.id}.tier${t}.eff`, deText, effIn("en", fam, t),
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

/* ============ 11 · Freischalt-Bedingungen (Kosmetik) ============ */
for (const [key, def] of Object.entries(UNLOCK_SAMPLES)) {
  const l = unlockProgress(def, {}).label;
  push(`item.unlock.${key}.label`, "item", l, `Freischalt-Bedingung (Kosmetik) — Kind „${key}"`, "", def.note || "");
}

/* ============ 12 · Archetyp-Leitfäden ============
   (Migriert — alle vier Leitfäden kommen unten aus dem i18n-Katalog. Die Schlüssel entstehen aus
   EINEM Baum-Durchlauf über GUIDES, siehe src/i18n/guideWalk.js.) */

/* ============ 13 · Bau-Kategorien ============
   (Formationsnamen + Kürzel sind migriert und kommen unten aus dem i18n-Katalog.) */
for (const [k, v] of Object.entries(ARCH_CAT)) {
  push(`ui.archcat.${k}.label`, "ui", v.label, "Architekt — Bau-Kategorie (Chip)", "10");
}

/* ============ 14 · Kuratierte UI-Texte ============
   `music.js` liefert ausschließlich MUSIKTITEL. Die sind Eigennamen (und bereits englisch) —
   sie werden nicht übersetzt und sollen die Restliste nicht aufblähen. Deshalb markiert, nicht
   migriert: status „n/a" heißt „bewusst einsprachig", nicht „noch offen". */
for (const r of uiRows()) {
  const isTrack = /ui\/music\.js/.test(r.context || "");
  if (isTrack) {
    rows.push({ id: r.id, category: "system", de: r.de, en: r.de,
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
  rows.push({
    id: key, category: "i18n", de: deText, en: String(CAT_EN[key] ?? "").trim(),
    context: "i18n-Katalog (src/i18n) — über t() aufgelöst",
    limit: "", status: CAT_EN[key] ? "done" : "new", note: "",
  });
}

/* ============ CSV schreiben ============ */
/* Doppelte austreiben: was schon im Katalog steht, darf nicht zusätzlich als heuristisch
   gefischte `ui.*`-Zeile auftauchen — sonst übersetzt jemand denselben Satz zweimal. */
const CATALOG_TEXTS = new Set(Object.values(CAT_DE).map((s) => String(s).trim()));
const deduped = rows.filter((r) => r.category === "i18n" || !CATALOG_TEXTS.has(r.de));
rows.length = 0; rows.push(...deduped);

const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
rows.sort((a, b) => (a.category + a.id).localeCompare(b.category + b.id, "de"));
const head = ["id", "category", "de", "en", "context", "limit", "status", "note"];
const csv = [head.map(q).join(",")].concat(rows.map((r) => head.map((h) => q(r[h])).join(","))).join("\r\n") + "\r\n";
writeFileSync(join(OUT, "strings_de_pixi_2026-08-15.csv"), csv, "utf8");
console.error(`DATA: ${rows.length} Zeilen → docs/localization/strings_de_pixi_2026-08-15.csv`);

/* ============ UI-Texte (kuratiert) ============
   Heuristik + Filterlisten. Ergibt die `ui.*`/`store.*`/`system.*`-Zeilen der CSV. Bewusst KEIN
   Loc-System im Code (alle Strings inline) — dieser Export ist die Zusammenführung. */
function uiRows() {
  const SRC = [
    ["src/App.jsx", "ui", "Rahmen · Header · Pause-/Neustart-Dialoge"],
    ["src/ui/ArchPanels.jsx", "store", "Architekt — Gebäude-/Legenden-Panels"],
    ["src/ui/ArchitectScreen.jsx", "store", "Der Architekt (Bauphase)"],
    ["src/ui/Battlefield.jsx", "ui", "Spielfeld — Stich-Ausgang, Ansagen"],
    ["src/ui/BuildPanel.jsx", "ui", "Build-Panel"],
    ["src/ui/BuildSummary.jsx", "ui", "Build-Zusammenfassung"],
    ["src/ui/Card.jsx", "ui", "Karte"],
    ["src/ui/CardDetail.jsx", "ui", "Kartendetail"],
    ["src/ui/CardGrid.jsx", "ui", "Kartenraster / Brett"],
    ["src/ui/ChargeBar.jsx", "ui", "Blitz-HUD (Ladung/Ionisierung)"],
    ["src/ui/ChronikOverview.jsx", "ui", "Chronik (Kartenübersicht)"],
    ["src/ui/Controls.jsx", "ui", "Steuerleiste"],
    ["src/ui/CustomizeScreen.jsx", "ui", "Deck-Werkstatt (Kosmetik)"],
    ["src/ui/DeckDetail.jsx", "ui", "Deck-Detailansicht"],
    ["src/ui/FamilyTargetSelect.jsx", "ui", "Ziel-Auswahl (Familien-Perks)"],
    ["src/ui/FormationPanel.jsx", "ui", "Formations-Panel"],
    ["src/ui/FormationPhase.jsx", "ui", "Aufstellungsphase"],
    ["src/ui/GameOver.jsx", "achievement", "Endbildschirm"],
    ["src/ui/GlacierBar.jsx", "ui", "Eis-HUD (Gletscher)"],
    ["src/ui/GlacierFormLegend.jsx", "ui", "Legende Gletscher-Formationen"],
    ["src/ui/GlacierPick.jsx", "ui", "Gletscher-Auswahl"],
    ["src/ui/GlobalLeaderboard.jsx", "achievement", "Globale Bestenliste"],
    ["src/ui/Glossary.jsx", "tutorial", "Glossar-Overlay (Rahmen)"],
    ["src/ui/GuideOverlay.jsx", "tutorial", "Leitfaden-Overlay (Rahmen)"],
    ["src/ui/HeatBar.jsx", "ui", "Feuer-HUD (Hitze/Asche)"],
    ["src/ui/LayoutPerks.jsx", "ui", "Aufstellungshilfe"],
    ["src/ui/LeaderboardScreen.jsx", "achievement", "Bestenliste / Wochen-Rangliste"],
    ["src/ui/LegendarySelect.jsx", "ui", "Legendär-Phase (Runde 29)"],
    ["src/ui/MusicBar.jsx", "ui", "Musikleiste"],
    ["src/ui/MuteButton.jsx", "ui", "Ton-Schalter"],
    ["src/ui/OptionsModal.jsx", "ui", "Optionen"],
    ["src/ui/PerkSelect.jsx", "ui", "Perk-Auswahl"],
    ["src/ui/PlantBar.jsx", "ui", "Pflanze-HUD (Wachstum)"],
    ["src/ui/PwaInstall.jsx", "system", "App-Installation"],
    ["src/ui/RoundScoreBadge.jsx", "ui", "Durchlauf-Score-Badge"],
    ["src/ui/RunDetail.jsx", "achievement", "Lauf-Detailansicht"],
    ["src/ui/RunGraphs.jsx", "achievement", "Lauf-Diagramme"],
    ["src/ui/RunLoader.jsx", "system", "Ladeanzeige"],
    ["src/ui/RunStats.jsx", "achievement", "Lauf-Kennzahlen"],
    ["src/ui/ScoreMilestoneBar.jsx", "achievement", "Score-Meilensteine"],
    ["src/ui/SeedChip.jsx", "system", "Seed-Chip (teilen/nachspielen)"],
    ["src/ui/SkillSelect.jsx", "ui", "Skill-Auswahl"],
    ["src/ui/Sparkline.jsx", "ui", "Verlaufs-Miniatur"],
    ["src/ui/StartScreen.jsx", "ui", "Startbildschirm"],
    ["src/ui/StatsScreen.jsx", "achievement", "Statistik-Hub"],
    ["src/ui/StatusBar.jsx", "ui", "Statusleiste (HUD)"],
    ["src/ui/StatusRail.jsx", "ui", "Status-Schiene (Seiten-HUD)"],
    ["src/ui/TargetSelect.jsx", "ui", "Karten-Zielauswahl"],
    ["src/ui/UpgradeScreen.jsx", "achievement", "Upgrade-Baum"],
    ["src/ui/UsernameModal.jsx", "system", "Namenswahl"],
    ["src/ui/WeekMods.jsx", "ui", "Wochen-Modifikatoren (Anzeige)"],
    ["src/ui/archEffects.js", "store", "Architekt — Effekt-Bausteine (Kartendetail)"],
    ["src/ui/format.js", "ui", "Zahlformat (Kurz-Einheiten)"],
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
        if (/^[)(\[\],.:|&?]+$|^[)(]|[)(]$/.test(s)) continue;
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
