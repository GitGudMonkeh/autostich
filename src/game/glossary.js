import * as C from "./constants.js";

/* ============================================================
   GLOSSAR — die EINZIGE Quelle für die Erklärungen der Spielbegriffe (#212 / #201 P1+P9).
   Zuvor lag `KEYWORD_INFO` inline in SkillSelect.jsx und war nur dort + nur bei aktuellem
   Angebot sichtbar. Jetzt zentral, aus constants.js gespeist (kein Text↔Code-Drift) und von
   überall abrufbar: Skill-Auswahl (Angebot + gehaltene Skills) und Build-Ansicht.

   Struktur: GLOSSARY[token] = { label, icon, color, text }.
   `token` = ein Eintrag aus skill.keywords (charge/heat/freeze/…). Nur „spezielle" Spielwörter
   haben einen Eintrag; generische Tokens (value/score) werden bewusst NICHT gelistet — sie sind
   im Beschreibungstext selbst erklärt und würden das Glossar nur verrauschen.

   Ton/Format folgen dem Style-Guide (docs/text-style-guide.md): kurze Sätze, Bedingung → Wirkung,
   Dezimal-Komma, Zahlen aus den Konstanten interpoliert.
   ============================================================ */

// Deutsche Zahlformatierung (1.5 → „1,5") — Dezimal-Komma, keine doppelte Zahlpflege.
const de = (x) => String(x).replace(".", ",");

// Fraktions-Akzentfarben (identisch zu ARCHETYPE_META in skills.js; hier hartkodiert, damit das Glossar
// nur von constants.js abhängt — kein Import-Zyklus). Formation ist fraktionsübergreifend → neutrales Blau.
const CLR = { lightning: "#8a7de0", fire: "#e0714a", ice: "#5ec8f0", plant: "#5ab87a", neutral: "#5a8ade" };

export const GLOSSARY = {
  // ---- Blitz (⚡) — vier Währungen (Crit · Ladung · Ionisierung · Serie) + Kaskade ----
  crit: { label: "Crit", icon: "⚡", color: CLR.lightning,
    text: `Kritischer Treffer: der Sieg zählt mit dem Crit-Multiplikator (Basis ×${de(C.CRIT_BASE_MULT)}). Crit-Chance kommt aus dem Crit-Stat und aus Blitz-Skills.` },
  charge: { label: "Ladung", icon: "⚡", color: CLR.lightning,
    text: `Crits erzeugen Ladung (max ${C.LIGHTNING_MAX_CHARGE}). Bei voller Ladung lösen Blitz-Konsumenten ihren Effekt aus und verbrauchen sie.` },
  ionize: { label: "Ionisierung", icon: "⚡", color: CLR.lightning,
    text: `Dauerhafte Kartenmarkierung: eine ionisierte Karte gibt bei Sieg +${C.ION_SCORE_PER_STACK} Score je Stapel und erhält danach +1 Stapel (max ${C.ION_MAX_STACKS}).` },
  streak: { label: "Serie", icon: "⚡", color: CLR.lightning,
    text: "Siege in Folge (Siegesserie). Der Serien-Multiplikator und viele Skills wachsen mit ihr; eine Niederlage setzt sie zurück." },

  // ---- Feuer (🔥) — Hitzeleiste 0–100 % belohnt totale Überlegenheit ----
  heat: { label: "Hitze", icon: "🔥", color: CLR.fire,
    text: `Siege mit klarem Wertvorsprung heizen die Hitzeleiste (0–100 %) auf und geben Feuer-Score = (Vorsprung − ${C.FIRE_MARGIN_OFFSET}) × ${C.FIRE_SCORE_BASE} (+${C.FIRE_SCORE_PER_SKILL} je weiterem Feuer-Skill); klare Niederlagen kühlen sie ab.` },
  consume: { label: "Hitze-Konsument", icon: "🔥", color: CLR.fire,
    text: "Verbraucht angesammelte Hitze für einen starken Effekt. Höchstens ein Konsument gleichzeitig — ein zweiter ersetzt den bestehenden." },
  brand: { label: "Brandmal", icon: "🔥", color: CLR.fire,
    text: `Eine gebrandmarkte Gegnerkarte verliert Wert; jeder Brand gibt +${C.BRAND_ASH} Asche — Rohstoff der Feuer-Schmiede, und gehaltene Asche gibt zusätzlich kleinen Score je Feuer-Sieg.` },
  ash: { label: "Asche", icon: "🔥", color: CLR.fire,
    text: `Rohstoff der Feuer-Schmiede: Brände geben +${C.BRAND_ASH} Asche. Die Ascheschmiede verbraucht ${C.FORGE_COST} Asche je Schmiedung (+${C.FORGE_VALUE} Dauerwert); Damaststahl lässt sie nie verfallen. Gehaltene Asche gibt zusätzlich kleinen Score je Feuer-Sieg.` },
  forge: { label: "Schmieden", icon: "🔥", color: CLR.fire,
    text: `Asche wird zu dauerhaftem Kartenwert (Ascheschmiede: ${C.FORGE_COST} Asche → +${C.FORGE_VALUE} Wert auf die niedrigste Karte).` },

  // ---- Eis (❄️) — Gletscher: Architektur × Permanenz ----
  freeze: { label: "Eingefroren", icon: "❄️", color: CLR.ice,
    text: `Eis friert eigene Karten dauerhaft ein (blau): ${C.ICE_BASE_FREEZE} beim ersten Eis-Skill, +1 je weiterem (Frostgriff: +${C.FROST_GRIP_BONUS}). Frostkarten biegen Formationen, lagern Schichten ab und dürfen 1× je Aufstellungsphase kostenlos getauscht werden.` },
  formation: { label: "Formation", icon: "🔷", color: CLR.neutral,
    text: "Ein erkanntes Muster benachbarter Karten (Wiederholung, Treppe, Farbblock, Wechsel). Ein Sieg in einer Formation zählt mit einem Formations-Faktor." },

  // ---- Pflanze (🌿) — Wachstum → Reife (grün) → Farbblock → Score ----
  growth: { label: "Wachstum", icon: "🌿", color: CLR.plant,
    text: `Eigene Karten wachsen bei Siegen (nur steigend) — umso schneller, je mehr Pflanze-Skills du hältst (volles Tempo ab ${C.PLANT_GROWTH_SKILL_REF} Skills, darunter anteilig). Ab ${C.PLANT_GREEN_THRESHOLD} Wachstum wird eine Karte dauerhaft grün (reif).` },
  green: { label: "Grün (Reife)", icon: "🌿", color: CLR.plant,
    text: `Grüne Karten sind dauerhaft und bilden einen gemeinsamen Farbblock — je größer der Block, desto mehr Score. Grün ist Farbe, nicht Kraft; Wert wächst nur über Wurzeln (Deckel ${C.PLANT_VALUE_CAP}).` },
  colonize: { label: "Kolonisieren", icon: "🌿", color: CLR.plant,
    text: "Markiert gegnerische Karten grün (Ausläufer/Rhizom). Besiegst du eine kolonisierte Karte, erntest du Wachstum." },
};

// Ist ein Token im Glossar erklärt? (Filter für die Keyword-Chips — generische Tokens fallen raus.)
export const isGlossaryTerm = (token) => Object.prototype.hasOwnProperty.call(GLOSSARY, token);

// Eindeutige, im Glossar erklärte Schlüsselbegriffe einer Skill-Menge (Reihenfolge = Erstauftreten).
// `skillDefs` wird injiziert (SKILL_DEFS), damit das Glossar nicht von skills.js abhängt (kein Zyklus).
export function glossaryKeywords(ids = [], skillDefs = {}) {
  const seen = new Set(), out = [];
  for (const id of ids) {
    for (const k of skillDefs[id]?.keywords || []) {
      if (isGlossaryTerm(k) && !seen.has(k)) { seen.add(k); out.push(k); }
    }
  }
  return out;
}
