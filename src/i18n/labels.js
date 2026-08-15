/* ============================================================
   REGISTER-ETIKETTEN — die Brücke zwischen den Daten-Registern (src/game/*) und dem Katalog.

   Die Register bleiben die Quelle der DEUTSCHEN Texte; `de.js` erzeugt seine Einträge daraus
   (kein abgetippter Zweittext, kein Drift). `en.js` schreibt die Übersetzung. Hier sitzen die
   Leser, die die UI benutzt — sie lösen zur ANZEIGEZEIT auf, damit ein Sprachwechsel greift.

   Warum eine eigene Datei und nicht direkt in rarity.js/constants.js?
   Weil `de.js` genau diese Register importiert. Ein `import { t }` in rarity.js wäre ein Zyklus
   (de.js → rarity.js → i18n/index.js → de.js). Die Register bleiben deshalb Blätter; alles, was
   übersetzt, liegt eine Schicht darüber.

   Migrationsstand: Rarität · Formationstypen · Skills + Archetypen · Perks + Perk-Kategorien ·
   Perk-Familien · Architekt-Gebäude · Upgrade-Knoten · Wochen-Mods · Glossar · Kosmetik.
   Offen sind nur noch die restlichen UI-Dateien (Inline-Strings in src/ui/*.jsx, src/App.jsx) —
   solange sie fehlen, zeigen sie in beiden Sprachen Deutsch (sichtbar, nicht still).
   ============================================================ */
import { t } from "./index.js";
import { SKILL_DEFS, SKILL_LIST, ARCHETYPE_META } from "../game/skills.js";
import { PERK_DEFS, CATEGORIES as PERK_CATS } from "../game/perks.js";
import { familyDef as rawFamilyDef, layoutFamilies as rawLayoutFamilies } from "../game/families.js";
import { ARCHITECT_FAMILIES } from "../game/architect.js";
import { NODES, BRANCHES } from "../game/progression.js";
import { WEEK_MODS } from "../game/weekMods.js";
import { DECK_DEFS, BATTLEFIELD_DEFS } from "../game/cosmetics.js";
import { THEME_DEFS, GLOBAL_FX } from "../game/themes.js";

/* ---- Rarität (TIER_META) ---- */
// Sichtbarer Name einer Raritätsstufe: „Sehr selten" / „Rare".
export const rarityLabel = (tier) => t(`rarity.tier${tier}.label`);

/* ---- Formationstypen (FORMATION_LABELS) ---- */
// Ausgeschriebener Name. Fallback bleibt der rohe Typ — t() gibt bei unbekanntem Schlüssel den
// Schlüssel zurück, deshalb hier explizit auf den Typ zurückfallen (lesbarer als „formation.x.label").
export const formationName = (type) => {
  const key = `formation.${type}.label`;
  const s = t(key);
  return s === key ? type : s;
};

// Badge-Kürzel: HARTE Schranke von genau einem Zeichen, auch in Übersetzungen
// (DE W·F·T·Z·A·N·K·G → EN R·B·S·Z·A·E·C·X). Der Guard prüft Länge und Kollisionsfreiheit.
export const formationAbbr = (type) => {
  const key = `formation.${type}.abbr`;
  const s = t(key);
  return s === key ? "" : s;
};

/* ---- Skills + Archetypen (SKILL_DEFS / ARCHETYPE_META) ----
   Die Leser geben die REGISTER-EINTRÄGE zurück, nur mit übersetztem Namen/Text. Dadurch bleiben
   alle übrigen Felder (archetype, enabler, trimGrowth, Hook-Funktionen …) unverändert nutzbar und
   die Aufrufstellen ändern sich minimal: `SKILL_DEFS[id]` → `skillDef(id)`.
   Unbekannte ID → null (wie der direkte Registerzugriff auch). */
export function skillDef(id) {
  const d = SKILL_DEFS[id];
  if (!d) return null;
  return { ...d, name: t(`ability.${id}.name`), desc: t(`ability.${id}.desc`) };
}
// Ganze Liste, übersetzt. Funktion statt Konstante: ein Modul-Level-Array fröre die Sprache ein.
export const skillList = () => SKILL_LIST.map((s) => skillDef(s.id));

export function archMeta(key) {
  const m = ARCHETYPE_META[key];
  if (!m) return null;
  return { ...m, label: t(`archetype.${key}.label`) };
}
export const archetypeLabel = (key) => t(`archetype.${key}.label`);

/* ---- Perks + Perk-Kategorien (PERK_DEFS / CATEGORIES) ----
   Gleiches Muster wie skillDef: Register-Eintrag mit übersetztem Label/Text, alle übrigen
   Felder (cat, rarity, Hook-Funktionen, Marker wie `zinseszins`) bleiben unverändert. */
export function perkDef(id) {
  const d = PERK_DEFS[id];
  if (!d) return null;
  return { ...d, label: t(`perk.${id}.label`), desc: t(`perk.${id}.desc`) };
}

export function perkCat(key) {
  const c = PERK_CATS[key];
  if (!c) return null;
  return { ...c, name: t(`perkcat.${key}.name`), desc: t(`perkcat.${key}.desc`) };
}

/* ---- Perk-Familien (FAMILY_DEFS) ----
   Die Stufen-Texte hängen in `tiers[1..4].desc`. Übersetzt wird der ganze Baum auf einmal, damit
   `fam.tiers[t].desc` an den Aufrufstellen unverändert funktioniert. */
export function familyDef(id) {
  const f = rawFamilyDef(id);
  if (!f) return null;
  const tiers = {};
  for (const [tr, def] of Object.entries(f.tiers || {})) {
    tiers[tr] = def && def.desc != null ? { ...def, desc: t(`family.${f.id}.tier${tr}.desc`) } : def;
  }
  return { ...f, name: t(`family.${f.id}.name`), tiers };
}

// Aufstellphasen-Familien (LayoutPerks) — dieselbe Übersetzung, gleiche Reihenfolge.
export const layoutFamilies = (...args) => rawLayoutFamilies(...args).map((f) => familyDef(f.id) || f);

/* ---- Architekt-Gebäude (ARCHITECT_FAMILIES) ----
   Nur der NAME kommt aus dem Katalog; der Effekttext wird erzeugt (src/i18n/buildingText.js). */
export function archFamily(id) {
  const f = ARCHITECT_FAMILIES[id];
  if (!f) return null;
  return { ...f, name: t(`building.${id}.name`) };
}

/* ---- Upgrade-Baum (NODES / BRANCHES) ---- */
export const nodeList = () => NODES.map((n) => ({
  ...n, label: t(`node.${n.id}.label`), detail: n.detail ? t(`node.${n.id}.detail`) : n.detail,
}));
export const nodeDef = (id) => {
  const n = NODES.find((x) => x.id === id);
  if (!n) return null;
  return { ...n, label: t(`node.${id}.label`), detail: n.detail ? t(`node.${id}.detail`) : n.detail };
};
export const branchList = () => BRANCHES.map((b) => ({
  ...b, name: t(`branch.${b.key}.name`), desc: t(`branch.${b.key}.desc`),
}));

/* ---- Wochen-Modifikatoren (WEEK_MODS) ----
   `desc` bleibt eine FUNKTION der gewürfelten Stärke — der Katalog trägt sie als {v}-Vorlage. */
export const weekModList = () => WEEK_MODS.map((m) => ({
  ...m, name: t(`weekmod.${m.id}.name`), desc: (v) => t(`weekmod.${m.id}.desc`, { v }),
}));
export const weekModDef = (id) => weekModList().find((m) => m.id === id) || null;

/* ---- Kosmetik (DECK_DEFS / BATTLEFIELD_DEFS / THEME_DEFS / GLOBAL_FX) ----
   EIN Name je Set: Spielfeld = Deckname + Suffix, Paket = Deckname. Genauso wie im Register,
   nur eben übersetzt — sonst gäbe es die alte Dreifach-Pflege auf der englischen Seite wieder. */
const deckIdOfBf = (bfId) => (bfId === "default" ? "default" : `deck_${bfId.replace(/^bf_/, "")}`);

export const deckDef = (id) => {
  const d = DECK_DEFS[id];
  return d ? { ...d, name: t(`cosmetic.${id}.name`) } : null;
};
export const battlefieldDef = (id) => {
  const b = BATTLEFIELD_DEFS[id];
  if (!b) return null;
  const base = t(`cosmetic.${deckIdOfBf(id)}.name`);
  return { ...b, name: id === "default" ? base : `${base}${t("cosmetic.bf.suffix")}` };
};
export const themeDef = (id) => {
  const th = THEME_DEFS[id];
  return th ? { ...th, name: t(`cosmetic.${th.deckId}.name`) } : null;
};
export const globalFxList = () => GLOBAL_FX.map((f) => ({
  ...f, name: t(`fx.${f.key}.name`), desc: f.desc ? t(`fx.${f.key}.desc`) : f.desc,
}));
export const globalFxDef = (key) => globalFxList().find((f) => f.key === key) || null;
