/* ============================================================
   GLOSSAR-ZUGRIFF + AUTO-FETTUNG — sprachfähig (#sprache).

   Das Problem, das diese Datei löst: `tokenizeGlossary` in glossary.js verdichtete die Wortformen
   EINMAL beim Modul-Laden zu einer Regex. Damit hing die Fettung an der Sprache, die beim Import
   zufällig aktiv war — ein Sprachwechsel hätte sie nicht mitbekommen. Hier wird die Regex je
   Sprache gebaut und gecacht (zwei Sprachen = zwei Regexe, danach nichts mehr zu tun).

   Warum nicht in glossary.js? `de.js` importiert glossary.js, ein `import { t }` dort wäre ein
   Zyklus (de.js → glossary.js → i18n/index.js → de.js). Gleiche Trennung wie bei buildingText.js:
   Register bleibt Blatt, alles Übersetzende liegt eine Schicht darüber.
   ============================================================ */
import { t, getLocale, catalog } from "./index.js";
import { GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_GROUPS } from "../game/glossary.js";

/* ---- Einträge ---- */
export function glossaryEntry(id) {
  const e = GLOSSARY[id];
  if (!e) return null;
  return { ...e, id, label: t(`glossary.${id}.label`), text: t(`glossary.${id}.text`) };
}
// Flache Liste MIT id (fürs Overlay). Funktion, nicht Konstante — sonst fröre die Sprache ein.
export const glossaryEntries = () => Object.keys(GLOSSARY).map(glossaryEntry);

export const glossaryCategories = () =>
  GLOSSARY_CATEGORIES.map((c) => ({ ...c, label: t(`glossary.cat.${c.id}`), hint: t(`glossary.cathint.${c.id}`) }));
export const glossaryGroups = () =>
  Object.fromEntries(Object.entries(GLOSSARY_GROUPS).map(([k, g]) => [k, { ...g, label: t(`glossary.group.${k}`) }]));

/* ---- Auto-Fettung ----
   Formen (aus dem `match`-Eintrag des Katalogs) werden je Sprache zu EINER Regex verdichtet,
   längste zuerst → „Crit-Multiplikator" schlägt „Crit". Die Grenzen schließen Buchstaben, Ziffern
   und Bindestriche aus, damit nichts INNERHALB eines Wortes trifft. */
const _cache = new Map();

function formsRegex(locale) {
  if (_cache.has(locale)) return _cache.get(locale);
  const cat = catalog(locale);
  const forms = [];
  for (const key of Object.keys(GLOSSARY)) {
    const raw = cat[`glossary.${key}.match`];
    if (raw) forms.push(...String(raw).split("|").filter(Boolean));
    else forms.push(t(`glossary.${key}.label`, null, locale));
  }
  const uniq = [...new Set(forms)].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /* #zh-hans: Die Wortgrenze gilt je Wortform, nicht mehr um die ganze Alternation.
     Grund, gemessen: Han-Zeichen sind `\p{L}`. Eine chinesische Wortform steht im Fließtext
     IMMER zwischen anderen Han-Zeichen, also verbot die Grenze praktisch jeden Treffer — die
     Fettung griff 42 mal, wo der Wächter über 198 erwartet. Chinesisch kennt keine Wortgrenze;
     das Wort selbst IST die Grenze.

     Für Deutsch, Englisch und Spanisch ändert sich nichts: dort ist jede Wortform lateinisch und
     bekommt genau dieselben Lookarounds wie vorher, nur eine Ebene tiefer geschrieben. Das ist
     eine Verallgemeinerung über N Sprachen, keine Aufweichung — eine lateinische Form wird
     weiterhin nicht mitten in einem längeren Wort gefunden. */
  const CJK = /[㐀-䶿一-鿿豈-﫿]/;
  const zweig = (f) => (CJK.test(f)
    ? esc(f)
    : "(?<![\\p{L}\\p{N}\\-])" + esc(f) + "(?![\\p{L}\\p{N}\\-])");
  const re = uniq.length
    ? new RegExp("(?:" + uniq.map(zweig).join("|") + ")", "gu")
    : null;
  _cache.set(locale, re);
  return re;
}

/* Zerlegt `text` in Teile { text, bold } — bold=true für Glossar-Wortformen.
   Verlustfrei: die Teile aneinandergehängt ergeben wieder exakt den Eingabetext. */
export function tokenizeGlossary(text, locale) {
  if (!text) return [];
  const re = formsRegex(locale || getLocale());
  if (!re) return [{ text, bold: false }];
  const out = [];
  let last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[0], bold: true });
    last = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;   // Schutz gegen Nulllängen-Match
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}
