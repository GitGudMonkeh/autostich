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
import es from "./es.js";
import zhHans from "./zhHans.js";

/* `ready` trennt ANGEMELDET von AUSLIEFERBAR — und das ist keine Aufweichung der Parität,
   sondern ihr Schalter. Eine Sprache steht hier, sobald der Code sie kennt (Export, Wächter,
   Formatierer); sie wird dem Spieler erst angeboten, wenn ihr Katalog VOLLSTÄNDIG ist. Der
   Guard-Test dreht die Richtung um: verlangende Prüfungen laufen über die fertigen Sprachen,
   verbietende über ALLE — und eine Ratsche macht die Suite rot, sobald ein `ready: false`-Katalog
   vollständig ist („setz ready: true"). Damit kann die Ausnahme nicht stillschweigend bleiben.

   `via` ist die Rückfallkette VOR der Quellsprache. Ohne sie sähe ein spanischer Spieler bei
   einem fehlenden Schlüssel Deutsch (SOURCE_LOCALE), nicht Englisch. */
export const LOCALES = [
  { id: "de", label: "Deutsch",  short: "DE", ready: true },
  { id: "en", label: "English",  short: "EN", ready: true },
  { id: "es", label: "Español",  short: "ES", ready: true,  via: ["en"] },  // #es-locale
  /* #zh-hans: ANGEMELDET, nicht auslieferbar. Der Katalog ist ein Fixture aus der
     Muster-Übersetzung (111 von allen Schlüsseln) und existiert, damit die CJK-Typografie an
     echtem chinesischem Text statt an lateinischem Platzhalter entworfen werden kann.
     `ready: false` ist genau der Schalter dafür: `setLocale` nimmt die Sprache nicht an, die
     UI bietet sie nicht an, und die verlangenden Paritätsprüfungen laufen an ihr vorbei —
     während die verbietenden weiter greifen. Kein `via`: ein fehlender Schlüssel soll sichtbar
     auf Deutsch zurückfallen, damit im Entwurf sofort auffällt, was Fixture ist und was nicht.
     Vollständig wird der Katalog erst mit dem Vollauftrag; die Ratsche unten verlangt dann
     `ready: true`. Siehe docs/workstreams/zh-hans/zh-hans-sample/task-contract.md. */
  { id: "zh-Hans", label: "简体中文", short: "ZH", ready: false },
];
export const LOCALE_IDS = LOCALES.map((l) => l.id);
// Was die UI anbietet und was `setLocale` annimmt. Nie LOCALE_IDS dafür benutzen.
export const READY_LOCALES = LOCALES.filter((l) => l.ready);
export const READY_LOCALE_IDS = READY_LOCALES.map((l) => l.id);

/* ZWEI verschiedene „Standards" — bewusst getrennt, sie werden gern verwechselt:
   - SOURCE_LOCALE = die Sprache, in der die Texte GESCHRIEBEN werden. Ihr Katalog ist immer
     vollständig, deshalb ist sie der Rückfall für einen fehlenden Schlüssel.
   - DEFAULT_LOCALE = die Sprache, die ein NEUER Spieler bekommt, solange er nichts gewählt hat.
   Die Browsersprache wird bewusst NICHT befragt: Englisch ist gesetzt (Produktentscheidung),
   und beim ersten Start wählt der Spieler ohnehin selbst (Namens-Dialog). */
export const SOURCE_LOCALE = "de";
export const DEFAULT_LOCALE = "en";

const CATALOGS = { de, en, es, "zh-Hans": zhHans };

/* Rückfallkette je Sprache: erst `via`, dann die Quellsprache. Die eigene Sprache fliegt raus
   (sie ist schon gescheitert), Doppelte ebenso — `de` behält damit eine LEERE Kette. */
const FALLBACK = Object.fromEntries(LOCALES.map((l) => [
  l.id,
  [...(l.via || []), SOURCE_LOCALE].filter((id, i, all) => id !== l.id && all.indexOf(id) === i),
]));

/* ---- Zustand ------------------------------------------------
   Bewusst Modul-Zustand (kein React-Context): `t()` wird auch aus reinen Modulen
   (src/game/, Formatierer, Tests) gerufen, die keinen Provider sehen. Die UI abonniert
   über subscribe() und rendert bei Wechsel neu. */
let current = DEFAULT_LOCALE;
const listeners = new Set();

export function getLocale() { return current; }

// Wechsel anwenden und die Abonnenten wecken. Geteilt, damit es genau EINE Stelle gibt, an der
// `current` sich bewegt — welche Sprache überhaupt zulässig ist, entscheiden die Aufrufer.
function applyLocale(next) {
  if (next === current) return current;
  current = next;
  for (const fn of [...listeners]) { try { fn(next); } catch (e) {} }
  return current;
}

/* Gesetzt NUR von setPreviewLocale, und die geht ausschließlich im Vorschau-Build. In jedem
   ausgelieferten Build ist dieser Wert konstant `null`, und setLocale verhält sich Zeile für
   Zeile wie vorher. */
let previewPin = null;

// READY_LOCALE_IDS, nicht LOCALE_IDS: eine angemeldete, aber unfertige Sprache ist für den
// Spieler nicht wählbar — auch nicht über ein altes `options.lang` aus dem localStorage.
export function setLocale(id) {
  /* Solange die Vorschau eine Sprache gepinnt hat, gewinnt sie. Ohne das überschriebe der
     Sprach-Effekt der App (App.jsx, `setLocale(options.lang)`) das Pin beim Mount sofort
     wieder mit `en` — die Vorschau wäre genau einen Frame lang chinesisch. */
  if (previewPin) return current;
  return applyLocale(READY_LOCALE_IDS.includes(id) ? id : DEFAULT_LOCALE);
}

/* #zh-hans: der Vorschau-Zweig darf eine ANGEMELDETE, aber unfertige Sprache setzen — sonst
   lässt sich CJK-Typografie nur an lateinischem Platzhaltertext entwerfen, und genau das ist
   der Fehler, den die Gestaltungsrunde vermeiden soll.

   Bewusst eine eigene Funktion und keine Aufweichung von `setLocale`: dessen Zusage ist, dass
   ein Spieler eine unfertige Sprache nie zu sehen bekommt. Ein zusätzliches Schlupfloch dort
   hätte diese Zusage still kassiert; hier steht sie unangetastet daneben.

   Das Tor ist `VITE_PREVIEW`. In jedem anderen Build gibt die Funktion `current` unverändert
   zurück, ohne die Abonnenten zu wecken. `import.meta.env` wird defensiv gelesen, weil dieses
   Modul auch aus reinem Node läuft (scripts/export-strings.mjs). */
export function setPreviewLocale(id) {
  const env = typeof import.meta !== "undefined" ? import.meta.env : null;
  if (!env || env.VITE_PREVIEW !== "1") return current;
  if (!id) { previewPin = null; return current; }        // ohne Argument: Pin lösen
  if (!LOCALE_IDS.includes(id)) return current;
  previewPin = id;
  return applyLocale(id);
}

export function subscribeLocale(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
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
// über die Rückfallkette — ein fehlendes Wort darf nie den Bildschirm sprengen.
function missing(key, locale) {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    console.warn(`[i18n] fehlender Schlüssel „${key}" (${locale})`);
  }
}

/* Plural nach i18next-Konvention: `key_one` / `key_other`, gewählt über die Variable `count`.
   Bewusst minimal — Deutsch, Englisch UND Spanisch haben alle drei genau zwei Formen, und zwar
   mit derselben Grenze (CLDR: `one` nur bei genau 1). Gemessen mit Intl.PluralRules, nicht
   angenommen. Sprachen mit mehr Formen (pl, ru) bräuchten hier Intl.PluralRules selbst; der
   Aufrufer bliebe derselbe.

   Was diese Stelle NICHT kann und auch mit einer Bibliothek nicht könnte: Genus-Kongruenz mit
   einem eingesetzten Wort („{n} bloqueado" vs. „bloqueada"). Das ist im Spanischen die eigentliche
   Falle, und sie wird im Übersetzerpaket als Formulierungsregel gelöst, nicht hier. */
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
  const cat = CATALOGS[loc] || CATALOGS[SOURCE_LOCALE];
  let raw = resolveKey(cat, key, vars);
  if (raw == null) {
    missing(key, loc);
    // Kette statt Sprung: `es` fällt auf Englisch, erst danach auf die Quellsprache. Ein
    // direkter Sprung auf SOURCE_LOCALE zeigte einem spanischen Spieler DEUTSCH.
    for (const alt of FALLBACK[loc] || [SOURCE_LOCALE]) {
      raw = resolveKey(CATALOGS[alt] || {}, key, vars);
      if (raw != null) break;
    }
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
   EINE Tabelle, eine Zeile je Sprache. Bis 26.08.2026 waren das drei Fallunterscheidungen an
   drei Stellen (`SEP`, `fmtPct`, `fmtDayMonth`) plus eine VIERTE, versteckte in buildingText.js,
   die `getLocale() === SOURCE_LOCALE` fragte — die hätte Spanisch still in den englischen Zweig
   fallen lassen (×1.10 statt ×1,10). Genau deshalb steht das jetzt als Tabelle: eine neue Sprache
   ist eine ZEILE, kein weiterer Zweig, und der Wächter liest dieselbe Tabelle wie der Formatierer,
   kann ihr also nicht widersprechen.

   Bewusst NICHT über `Intl`/`toLocaleDateString`: deren Ausgabe hängt an der Browser-Sprache,
   nicht an der im Spiel gewählten, und sie verschiebt sich zwischen ICU-Versionen — die
   Quelltext-Ratschen würden dann aus Gründen rot, die nichts mit dem Code zu tun haben.

   Die `es`-Zeile ist gemessen, nicht geraten (Intl als REFERENZ befragt, nicht als Implementierung):
   neutrales `es` liefert 1.234.567,25 · „7 %" · 24/12 — Trennzeichen wie Deutsch, Datum wie keins
   von beiden. Bei `es-419` wären die ersten beiden auf die englische Form gekippt; dass die
   Sprach-ID `es` heißt, entscheidet also auch das Zahlformat. */
const FMT = {
  de: { dec: ",", grp: ".", pct: "{n} %", day: "{dd}.{mm}." },
  en: { dec: ".", grp: ",", pct: "{n}%",  day: "{mm}/{dd}" },
  es: { dec: ",", grp: ".", pct: "{n} %", day: "{dd}/{mm}" },
  /* #zh-hans: Ziffern bleiben westlich, Tausender wie im Englischen, Prozent OHNE
     Leerzeichen (die deutsche Form hat ein schmales, die chinesische keines). Der Tag
     traegt seine Einheiten mit: 12月24日, nicht 24/12. */
  "zh-Hans": { dec: ".", grp: ",", pct: "{n}%",  day: "{mm}月{dd}日" },
};

// Für Wächter und Export: dieselbe Tabelle, die die Formatierer benutzen. NICHT für die UI.
export function numberFormat(locale) { return FMT[locale || current] || FMT[SOURCE_LOCALE]; }

export function fmtNum(x, locale) {
  const s = numberFormat(locale);
  const [int, frac] = String(x).split(".");
  const grouped = int.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, s.grp);
  const sign = int.startsWith("-") ? "-" : "";
  return sign + grouped + (frac ? s.dec + frac : "");
}

// Prozent als ganze Zahl inkl. Zeichen (0.07 → „7 %" / „7%").
// Deutsch und Spanisch setzen ein Leerzeichen vor das Zeichen, Englisch nicht.
export function fmtPct(x, locale) {
  return numberFormat(locale).pct.replace("{n}", Math.round(x * 100));
}

// Kurzes Tagesdatum. Drei verschiedene Formen: de „24.12." · en „12/24" · es „24/12".
export function fmtDayMonth(ts, locale) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return numberFormat(locale).day.replace("{dd}", dd).replace("{mm}", mm);
}
