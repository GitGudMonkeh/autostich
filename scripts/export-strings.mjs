#!/usr/bin/env node
/* Loc-Export: sammelt ALLE spieler-sichtbaren Texte in eine CSV (Schema wie docs/localization/strings_de.csv).
   Zwei Quellen:
     1) DATENTEXTE — die echten Register aus src/game/* werden importiert und die RESOLVETEN Endtexte
        rausgeschrieben (kein Abtippen, keine Text↔Code-Drift).
     2) UI-TEXTE — heuristisch aus src/App.jsx + src/ui/*.jsx gezogen (JSX-Textknoten, Text-Props,
        String-Literale). Kandidatenliste, danach kuratiert.
   Aufruf: node scripts/export-strings.mjs [--ui-candidates]
   Rein lesend. */
import { writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";

import { SKILL_LIST, ARCHETYPE_META } from "../src/game/skills.js";
import { PERK_DEFS, CATEGORIES as PERK_CATS } from "../src/game/perks.js";
import { FAMILY_LIST } from "../src/game/families.js";
import { ARCHITECT_FAMILIES, TIER_INERT_KINDS, familyEffectText } from "../src/game/architect.js";
import { GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_GROUPS } from "../src/game/glossary.js";
import { TIER_META } from "../src/game/rarity.js";
import { DECK_DEFS, BATTLEFIELD_DEFS } from "../src/game/cosmetics.js";
import { GLOBAL_FX, THEME_DEFS } from "../src/game/themes.js";
import { WEEK_MODS } from "../src/game/weekMods.js";
import { NODES, BRANCHES } from "../src/game/progression.js";
import { FORMATION_TYPE_LABELS } from "../src/game/formations.js";
import { SUIT_ORDER, suitName } from "../src/game/constants.js";
import { unlockProgress, MONO_CHALLENGE_N } from "../src/game/cosmetics.js";
import { GUIDES } from "../src/ui/guides.js";
import { FORMATION_TYPES as UI_FORMATION_TYPES } from "../src/ui/formationLabels.js";
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

/* ============ 1 · Skills ============ */
for (const s of SKILL_LIST) {
  const meta = ARCHETYPE_META[s.archetype] || { label: s.archetype };
  const leg = s.legendary ? ", legendär" : "";
  push(`ability.${s.id}.name`, "ability", s.name, `Skill-Name (${meta.label}${leg}) — Skill-Auswahl/Detailkarte`);
  push(`ability.${s.id}.desc`, "ability", s.desc, `Skill-Beschreibung (${meta.label}${leg}) — Skill-Auswahl/Detailkarte`);
}
for (const [k, m] of Object.entries(ARCHETYPE_META)) {
  push(`ui.archetype.${k}.label`, "ui", m.label, "Archetyp-Name — HUD, Skill-Auswahl, Statistik", "12");
}

/* ============ 2 · Perks (flache Legendäre) ============ */
for (const p of Object.values(PERK_DEFS)) {
  if (p.offerable === false) continue;
  const cat = PERK_CATS[p.cat] || { name: p.cat };
  push(`item.perk.${p.id}.label`, "item", p.label, `Legendärer Perk — Name (Kategorie ${cat.name}) — Perk-Auswahl/Build`);
  push(`item.perk.${p.id}.desc`, "item", p.desc, `Legendärer Perk — Beschreibung (Kategorie ${cat.name})`);
}
for (const c of Object.values(PERK_CATS)) {
  push(`ui.perkcat.${c.key}.name`, "ui", c.name, "Perk-Kategorie — Kurzname auf dem Angebots-Chip", "10");
  push(`ui.perkcat.${c.key}.desc`, "ui", c.desc, "Perk-Kategorie — Untertitel");
}

/* ============ 3 · Perk-Familien (4 Stufen) ============ */
for (const f of FAMILY_LIST) {
  const cat = PERK_CATS[f.cat] || { name: f.cat };
  push(`item.family.${f.id}.name`, "item", f.name, `Perk-Familie — Name (Kategorie ${cat.name})`);
  for (let t = 1; t <= 4; t++) {
    const d = f.tiers?.[t]?.desc;
    if (d) push(`item.family.${f.id}.tier${t}.desc`, "item", d, `Perk-Familie „${f.name}" — Beschreibung Stufe ${ROMAN[t]}`);
  }
}

/* ============ 4 · Architekt-Gebäude ============ */
// Gebaeude-Effekttexte kommen aus der geteilten Quelle in src/game/architect.js (Sprachpruefung A13):
// dieselbe Funktion bedient Spiel, Kartendetail und Core-DB -> die CSV bildet garantiert den In-Game-Wortlaut ab.
const archEff = (fam, tier) => familyEffectText(fam, tier);

const ARCH_CAT_LABEL = { value: "Wert", score: "Score", formation: "Formation" };
for (const fam of Object.values(ARCHITECT_FAMILIES)) {
  const cat = ARCH_CAT_LABEL[fam.category] || fam.category;
  push(`item.building.${fam.id}.name`, "item", fam.name, `Architekt-Gebäude — Name (${cat}${fam.legendary ? ", legendär" : ""})`);
  if (fam.legendary) {
    push(`item.building.${fam.id}.legendary.eff`, "item", archEff(fam, "legendary"), `Architekt-Gebäude „${fam.name}" — Effekt (legendär)`);
  } else {
    const inert = TIER_INERT_KINDS.has(fam.base && fam.base.kind);
    const maxTier = inert ? (fam.tierKick ? fam.tierKick.at : 1) : 4;
    const seen = new Set();
    for (let t = 1; t <= maxTier; t++) {
      const s = archEff(fam, t);
      if (!s || seen.has(s)) continue;
      seen.add(s);
      push(`item.building.${fam.id}.tier${t}.eff`, "item", s, `Architekt-Gebäude „${fam.name}" — Effekt Stufe ${ROMAN[t]}`);
    }
  }
}

/* ============ 5 · Glossar ============ */
for (const c of GLOSSARY_CATEGORIES) push(`tutorial.glossary.cat.${c.id}`, "tutorial", c.label, "Glossar — Kategorieüberschrift", "22");
for (const [k, g] of Object.entries(GLOSSARY_GROUPS)) push(`tutorial.glossary.group.${k}`, "tutorial", g.label, "Glossar — Untergruppe (Archetypen)", "14");
for (const [id, e] of Object.entries(GLOSSARY)) {
  push(`tutorial.glossary.${id}.label`, "tutorial", e.label, "Glossar — Begriff (Überschrift)", "28");
  push(`tutorial.glossary.${id}.text`, "tutorial", e.text, `Glossar — Erklärung zu „${e.label}"`);
  if (e.match?.length) {
    push(`tutorial.glossary.${id}.match`, "tutorial", e.match.join(" | "),
      `KEINE Anzeige — Wortformen für die Auto-Fettung in Beschreibungen. Für EN neu pflegen (Flexionen!).`, "", "wortformen");
  }
}

/* ============ 6 · Rarität / Stufen ============ */
for (const t of Object.values(TIER_META)) {
  push(`ui.rarity.tier${t.tier}.label`, "ui", t.label, `Raritätsstufe ${ROMAN[t.tier]} — Chip auf Angebotskarten`, "12");
}

/* ============ 7 · Formationen & Farben ============ */
for (const [k, v] of Object.entries(FORMATION_TYPE_LABELS)) push(`ui.formation.${k}.label`, "ui", v, "Formationstyp — Name", "14");
for (const s of SUIT_ORDER) push(`ui.suit.${s}.name`, "ui", suitName(s), "Kartenfarbe", "6");

/* ============ 8 · Kosmetik (Decks / Spielfelder / FX / Packs) ============ */
for (const d of Object.values(DECK_DEFS)) {
  push(`item.deck.${d.id}.name`, "item", d.name, "Kartenrücken — Name (Kosmetik)");
  if (d.hint) push(`item.deck.${d.id}.hint`, "item", d.hint, `Kartenrücken „${d.name}" — Freischalt-Hinweis`);
}
for (const b of Object.values(BATTLEFIELD_DEFS)) {
  push(`item.battlefield.${b.id}.name`, "item", b.name, "Spielfeld-Skin — Name (Kosmetik)");
  if (b.hint) push(`item.battlefield.${b.id}.hint`, "item", b.hint, `Spielfeld „${b.name}" — Freischalt-Hinweis`);
}
for (const f of GLOBAL_FX) {
  push(`item.fx.${f.key}.label`, "item", f.label, "Globaler Effekt — Name (Kosmetik-Shop)");
  if (f.desc) push(`item.fx.${f.key}.desc`, "item", f.desc, `Globaler Effekt „${f.label}" — Beschreibung`);
}
for (const p of Object.values(THEME_DEFS)) {
  push(`item.pack.${p.id}.name`, "item", p.name, "Kosmetik-Paket — Name");
  if (p.desc) push(`item.pack.${p.id}.desc`, "item", p.desc, `Kosmetik-Paket „${p.name}" — Beschreibung`);
  if (p.hint) push(`item.pack.${p.id}.hint`, "item", p.hint, `Kosmetik-Paket „${p.name}" — Freischalt-Hinweis`);
}

/* ============ 9 · Wochen-Modifikatoren ============ */
for (const m of WEEK_MODS) {
  push(`item.weekmod.${m.id}.name`, "item", m.name, `Wochen-Modifikator — Name (${m.sign === "pos" ? "positiv" : "negativ"})`, "26");
  const d = typeof m.desc === "function" ? m.desc(m.range ? `{n}` : undefined) : m.desc;
  push(`item.weekmod.${m.id}.desc`, "item", d, `Wochen-Modifikator „${m.name}" — Wirkung${m.range ? ` · Var.: {n} = Stärke ${m.range[0]}–${m.range[1]}` : ""}`);
}

/* ============ 10 · Fortschrittsbaum (Upgrades) ============ */
for (const b of BRANCHES) {
  push(`achievement.branch.${b.key}.name`, "achievement", b.name, "Upgrade-Baum — Reiter/Astname", "12");
  push(`achievement.branch.${b.key}.desc`, "achievement", b.desc, `Upgrade-Ast „${b.name}" — Untertitel`);
}
for (const n of NODES) {
  push(`achievement.node.${n.id}.label`, "achievement", n.label, `Upgrade-Knoten — Name (Ast ${n.branch})`, "20");
  push(`achievement.node.${n.id}.detail`, "achievement", n.detail, `Upgrade-Knoten „${n.label}" — Wirkung (Tooltip/Detail)`);
}

/* ============ 11 · Freischalt-Bedingungen (Kosmetik) ============ */
for (const [key, def] of Object.entries(UNLOCK_SAMPLES)) {
  const l = unlockProgress(def, {}).label;
  push(`item.unlock.${key}.label`, "item", l, `Freischalt-Bedingung (Kosmetik) — Kind „${key}"`, "", def.note || "");
}

/* ============ 12 · Archetyp-Leitfäden (GuideOverlay) ============ */
for (const [arch, g] of Object.entries(GUIDES)) {
  const a = (ARCHETYPE_META[arch] || { label: arch }).label;
  const base = `tutorial.guide.${arch}`;
  push(`${base}.subtitle`, "tutorial", g.subtitle, `Leitfaden ${a} — Untertitel`);
  push(`${base}.kernidee`, "tutorial", g.kernidee, `Leitfaden ${a} — Kernidee (Fett-Markup **so**)`);
  push(`${base}.pillarsLabel`, "tutorial", g.pillarsLabel, `Leitfaden ${a} — Überschrift Säulen-Sektion`, "26");
  (g.pillars || []).forEach((p, i) => {
    push(`${base}.pillar${i + 1}.name`, "tutorial", p.name, `Leitfaden ${a} — Säule ${i + 1}: Name`, "18");
    if (p.sub) push(`${base}.pillar${i + 1}.sub`, "tutorial", p.sub, `Leitfaden ${a} — Säule ${i + 1}: Zusatz`, "12");
    push(`${base}.pillar${i + 1}.text`, "tutorial", p.text, `Leitfaden ${a} — Säule ${i + 1}: Text (Fett-Markup **so**)`);
  });
  (g.loop?.nodes || []).forEach((n, i) => push(`${base}.loop.node${i + 1}`, "tutorial", n, `Leitfaden ${a} — Kreislauf-Knoten ${i + 1} (Diagramm, sehr kurz)`, "14"));
  (g.loop?.center || []).forEach((n, i) => push(`${base}.loop.center${i + 1}`, "tutorial", n, `Leitfaden ${a} — Kreislauf-Mitte, Zeile ${i + 1}`, "14"));
  (g.loop?.steps || []).forEach((s, i) => push(`${base}.loop.step${i + 1}`, "tutorial", s, `Leitfaden ${a} — Kreislauf-Schritt ${i + 1} (Fett-Markup **so**)`));
  if (g.loop?.valve) push(`${base}.loop.valve`, "tutorial", g.loop.valve, `Leitfaden ${a} — „Ventil"-Absatz (Überlauf-Regel)`);
  if (g.status?.label) push(`${base}.status.label`, "tutorial", g.status.label, `Leitfaden ${a} — Überschrift Status-Sektion`, "26");
  (g.status?.bars || []).forEach((b, i) => {
    push(`${base}.status.bar${i + 1}.name`, "tutorial", b.name, `Leitfaden ${a} — Status-Leiste ${i + 1}: Name`, "18");
    if (b.payoff) push(`${base}.status.bar${i + 1}.payoff`, "tutorial", b.payoff, `Leitfaden ${a} — Status-Leiste ${i + 1}: Auszahlung`);
    (b.scale || []).forEach((s, j) => push(`${base}.status.bar${i + 1}.scale${j + 1}`, "tutorial", s, `Leitfaden ${a} — Status-Leiste ${i + 1}: Skalen-Marke ${j + 1}`, "16"));
  });
  (g.principle || []).forEach((p, i) => {
    push(`${base}.principle${i + 1}.tag`, "tutorial", p.tag, `Leitfaden ${a} — Prinzip ${i + 1}: Schlagwort`, "12");
    push(`${base}.principle${i + 1}.text`, "tutorial", p.text, `Leitfaden ${a} — Prinzip ${i + 1}: Text (Fett-Markup **so**)`);
  });
}

/* ============ 13 · Formations-Labels + Kürzel, Bau-Kategorien ============ */
for (const [k, v] of Object.entries(UI_FORMATION_TYPES)) {
  push(`ui.formationlabel.${k}.label`, "ui", v.label, "Formationstyp — Anzeigename (Battlefield/Kartendetail)", "14");
  push(`ui.formationlabel.${k}.abbr`, "ui", v.abbr, `Formationstyp „${v.label}" — EIN Zeichen fürs Karten-Badge`, "1", "harte Längenschranke: genau 1 Zeichen, paarweise verschieden");
}
for (const [k, v] of Object.entries(ARCH_CAT)) {
  push(`ui.archcat.${k}.label`, "ui", v.label, "Architekt — Bau-Kategorie (Chip)", "10");
}

/* ============ 14 · Kuratierte UI-Texte ============ */
for (const r of uiRows()) push(r.id, r.category, r.de, r.context, r.limit, r.note);

/* ============ CSV schreiben ============ */
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
