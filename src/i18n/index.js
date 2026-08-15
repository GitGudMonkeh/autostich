/* ============================================================
   I18N-KERN — die EINZIGE Auflösungsstelle für Anzeigetexte (#sprache).

   Warum überhaupt eine Schicht, wo doch alle Texte schon in Registern liegen?
   Die Sprachprüfung (docs/localization/sprachpruefung_pixi_2026-08-15.md) hat gezeigt:
   handgepflegte Texte driften still von der Mechanik weg („Meisterrang", „Ungewöhnlich",
   die 4-von-6-Trimmliste). Ein zweiter Sprachstand verdoppelt dieses Risiko — deshalb ist
   der Katalog IM CODE die Quelle und das Übersetzer-Dokument eine ERZEUGTE Ansicht
   (scripts/export-strings.mjs). Genau so machen es Unity (String Tables), Unreal (.po),
   Godot (CSV) und i18next: Schlüssel + Katalog, Dokument nur als Export.

   Warum JS-Module und nicht de.json/en.json?
   Weil die Tuning-Zahlen (MAX_CYCLES, SCORE_PER_WIN, CRIT_BASE_MULT …) per Template-Literal
   aus constants.js/glacier.js interpoliert werden. In JSON müssten sie als tote Literale
   einfrieren — genau der Drift, den wir gerade beseitigt haben. JS-Kataloge behalten den
   Live-Bezug UND bleiben schlüsselbasiert (Parität testbar, TMS-Export via CSV).

   Reinheit: diese Datei ist React-frei und darf auch aus src/game/ importiert werden.
   Der React-Anschluss liegt in useLocale.js.
   ============================================================ */
import de from "./de.js";
import en from "./en.js";

export const LOCALES = [
  { id: "de", label: "Deutsch",  short: "DE" },
  { id: "en", label: "English",  short: "EN" },
];
export const LOCALE_IDS = LOCALES.map((l) => l.id);
export const DEFAULT_LOCALE = "de";

const CATALOGS = { de, en };

/* ---- Zustand ------------------------------------------------
   Bewusst Modul-Zustand (kein React-Context): `t()` wird auch aus reinen Modulen
   (src/game/, Formatierer, Tests) gerufen, die keinen Provider sehen. Die UI abonniert
   über subscribe() und rendert bei Wechsel neu. */
let current = DEFAULT_LOCALE;
const listeners = new Set();

export function getLocale() { return current; }

export function setLocale(id) {
  const next = LOCALE_IDS.includes(id) ? id : DEFAULT_LOCALE;
  if (next === current) return current;
  current = next;
  for (const fn of [...listeners]) { try { fn(next); } catch (e) {} }
  return current;
}

export function subscribeLocale(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Sprache aus dem Browser raten (nur als Default, bevor die Optionen geladen sind).
   Alles außer explizit unterstützten Sprachen fällt auf Deutsch zurück. */
export function detectLocale() {
  try {
    const langs = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
    for (const raw of langs) {
      const base = String(raw || "").toLowerCase().split("-")[0];
      if (LOCALE_IDS.includes(base)) return base;
    }
  } catch (e) {}
  return DEFAULT_LOCALE;
}

/* ---- Auflösung ---------------------------------------------- */

// Platzhalter: {name}. Fehlende Variablen bleiben sichtbar stehen ({name}) statt „undefined" —
// das fällt im Playtest sofort auf, statt sich als leere Lücke zu tarnen.
const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(tpl, vars) {
  if (!vars) return tpl;
  return tpl.replace(PLACEHOLDER, (m, key) => (key in vars ? String(vars[key]) : m));
}

// Fehlende Schlüssel: in Dev laut (damit sie beim Bauen auffallen), in Produktion still
// mit Deutsch-Rückfall — ein fehlendes englisches Wort darf nie den Bildschirm sprengen.
function missing(key, locale) {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    console.warn(`[i18n] fehlender Schlüssel „${key}" (${locale})`);
  }
}

/* Plural nach i18next-Konvention: `key_one` / `key_other`, gewählt über die Variable `count`.
   Bewusst minimal — Deutsch und Englisch haben beide genau zwei Formen. Sprachen mit mehr
   Formen (pl, ru) bräuchten hier Intl.PluralRules; der Aufrufer bleibt derselbe. */
function resolveKey(cat, key, vars) {
  if (vars && typeof vars.count === "number") {
    const suffix = vars.count === 1 ? "_one" : "_other";
    if (cat[key + suffix] != null) return cat[key + suffix];
  }
  return cat[key];
}

/* t(key, vars) — der einzige Weg, an einen Anzeigetext zu kommen.
   `locale`-Override nur für Tests/Export; die App ruft immer ohne. */
export function t(key, vars, locale) {
  const loc = locale || current;
  const cat = CATALOGS[loc] || CATALOGS[DEFAULT_LOCALE];
  let raw = resolveKey(cat, key, vars);
  if (raw == null) {
    missing(key, loc);
    raw = resolveKey(CATALOGS[DEFAULT_LOCALE], key, vars);
  }
  if (raw == null) return key;              // letzter Rückfall: der Schlüssel selbst, nie „undefined"
  return interpolate(raw, vars);
}

// Prüfen, ob ein Schlüssel existiert (für optionale Texte, z. B. Tutorial-Schritte ohne Hinweis).
export function hasKey(key, locale) {
  const cat = CATALOGS[locale || current] || {};
  return cat[key] != null || cat[key + "_one"] != null;
}

// Roher Katalog — nur für Guards/Export, NICHT für die UI.
export function catalog(locale) { return CATALOGS[locale] || {}; }

/* ---- Zahlformate --------------------------------------------
   Deutsch: Dezimal-Komma, Tausenderpunkt (1.234,5). Englisch: Punkt/Komma (1,234.5).
   Bislang lagen dafür Helfer (`de`, `grp`) in jedem Register einzeln — die bleiben dort
   als deutsche Formatierer, aber alles, was durch die i18n-Schicht läuft, nimmt diese hier. */
const SEP = {
  de: { dec: ",", grp: "." },
  en: { dec: ".", grp: "," },
};

export function fmtNum(x, locale) {
  const s = SEP[locale || current] || SEP.de;
  const [int, frac] = String(x).split(".");
  const grouped = int.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, s.grp);
  const sign = int.startsWith("-") ? "-" : "";
  return sign + grouped + (frac ? s.dec + frac : "");
}

// Prozent als ganze Zahl inkl. Zeichen (0.07 → „7 %" / „7%").
// Im Deutschen steht ein schmales Leerzeichen vor dem Zeichen, im Englischen keines.
export function fmtPct(x, locale) {
  const loc = locale || current;
  const n = Math.round(x * 100);
  return loc === "de" ? `${n} %` : `${n}%`;
}
