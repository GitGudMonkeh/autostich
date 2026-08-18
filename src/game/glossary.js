import * as C from "./constants.js";
import { TIER_META } from "./rarity.js";                 // Raritäts-Namen: EINE Quelle (kein „Ungewöhnlich" mehr)
import { trimmableSkillNames } from "./skills.js";       // trimmbare Skills: aus dem Register, nicht im Text gepflegt
// Eis-Neudesign: die Gletscher-Tuning-Zahlen leben in glacier.js (Single Source, Sim-tunebar) — direkt ziehen, damit
// die Eis-Glossartexte driftfrei mitlaufen. Kein Import-Zyklus (glacier.js → architect.js, keins importiert glossary.js).
import { WIN_MASS as G_WIN_MASS, EWIGER_FROST as G_EWIGER_FROST, THRESHOLDS as G_THRESHOLDS,
  KASKADE_PER_NEIGHBOR as G_KASKADE, GEO_BLOCK as G_BLOCK, GEO_KREUZ as G_KREUZ, GEO_LINIE as G_LINIE,
  GEO_FLAECHE as G_FLAECHE } from "./glacier.js";

/* ============================================================
   GLOSSAR — die EINZIGE Quelle für die Erklärungen der Spielbegriffe (#212 / #201 P1+P9 / Glossar-Rework).
   Zuvor lag `KEYWORD_INFO` inline in SkillSelect.jsx und war nur dort + nur bei aktuellem Angebot sichtbar.
   Jetzt zentral, aus constants.js gespeist (kein Text↔Code-Drift) und von überall abrufbar: das ⓘ auf jedem
   Auswahlpanel öffnet das durchsuchbare, kategorisierte Glossar; die Skill-Detailansicht nutzt es weiter (glossaryKeywords).

   Struktur: GLOSSARY[id] = { category, group?, label, icon, color, text, match? }.
   - `id`  = stabiler Schlüssel. Die 14 Archetyp-Tokens (charge/heat/freeze/…) BLEIBEN als ids erhalten, damit
             `GLOSSARY[token]` und glossaryKeywords() (SkillSelect) unverändert funktionieren.
   - `category`/`group` = Einsortierung fürs Overlay (GLOSSARY_CATEGORIES / GLOSSARY_GROUPS).
   - `match` = Wortformen (inkl. deutscher Flexionen + Alt-Bezeichnungen wie „Dauerwert"), die in Beschreibungen
             FETT markiert werden (tokenizeGlossary). Ohne `match` wird `label` verwendet.

   Aufgenommen werden nur „spezielle" Spielwörter & Sonderregeln — KEINE einzelnen Perks/Skills. Generische Tokens
   (value/score) haben bewusst keinen Eintrag.

   Ton/Format folgen dem Style-Guide (docs/text-style-guide.md): kurze Sätze, Bedingung → Wirkung, Dezimal-Komma,
   Tuning-Zahlen aus den Konstanten interpoliert. Rework-Stand: Shop raus (Architekt), 4 Stats, 4 Archetypen.
   ============================================================ */

// Deutsche Zahlformatierung (1.5 → „1,5") — Dezimal-Komma, keine doppelte Zahlpflege.
const de = (x) => String(x).replace(".", ",");
// Prozent(punkte) als ganze Zahl (0,07 → 7).
const pct = (x) => Math.round(x * 100);
// Tausendertrenner (2000 → „2.000").
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// Aus den Registern gezogene Aufzählungen (kein Text↔Code-Drift).
const TRIMMABLE_NAMES = trimmableSkillNames();
const RARITY_NAMES = Object.values(TIER_META).map((t) => t.label).join(" · ");

// Akzentfarben (hartkodiert, damit das Glossar NICHT von skills.js/ARCHETYPE_META abhängt — das gäbe einen Import-Zyklus).
// Archetyp-Farben identisch zu ARCHETYPE_META; Formation ist archetypübergreifend → neutrales Blau.
const CLR = {
  lightning: "#8a7de0", fire: "#e0714a", ice: "#5ec8f0", plant: "#5ab87a",
  neutral: "#5a8ade",   // Formationen (archetypübergreifend)
  grund: "#7f89ad",     // Grundbegriffe / Stats (gedämpftes Blaugrau)
  deck: "#c2a24a",      // Deck & Karten (gedämpftes Gold)
  perk: "#a48ad0",      // Perks / Familien
  gold: "#d4a63a",      // Legendär
  arch: "#d1652f",      // Der Architekt
  meta: "#5aa3a0",      // Fortschritt & Meta
};

/* ---- Kategorien (Anzeige-Reihenfolge im Overlay) ----
   `hint` ist ein Einzeiler, der die Kategorie einordnet. Auf dem Handy wird er nicht gezeigt (die
   Chip-Leiste hat dafür keinen Platz), auf dem Desktop trägt ihn der Seitenkopf neben dem Titel —
   dieselbe Stelle, an der der Leitfaden den Archetyp-Untertitel zeigt. Er gehört ins REGISTER und
   nicht in die UI, weil er ein Text ÜBER die Kategorie ist, kein Text der Oberfläche. */
export const GLOSSARY_CATEGORIES = [
  { id: "grund", label: "Grundbegriffe",      color: CLR.grund,   hint: "Stich, Serie, Kampfwert — die Vokabeln jedes Laufs." },
  { id: "deck",  label: "Deck & Karten",      color: CLR.deck,    hint: "Woraus dein Deck besteht und wie es gelesen wird." },
  { id: "form",  label: "Formationen",        color: CLR.neutral, hint: "Muster in der Kartenreihenfolge und was sie zahlen." },
  { id: "frak",  label: "Archetypen",         color: CLR.lightning, hint: "Die vier Ressourcen — nach Fraktion gruppiert." },
  { id: "praez", label: "Präzision · Crit",   color: CLR.lightning, hint: "Woher Crit-Chance und Crit-Multiplikator kommen." },
  { id: "perk",  label: "Perks & Rarität",    color: CLR.perk,    hint: "Familien, Stufen, Raritäten, Legendäre." },
  { id: "arch",  label: "Der Architekt",      color: CLR.arch,    hint: "Bauphase, Brett, Gebäude, Struktur." },
  { id: "meta",  label: "Fortschritt & Meta", color: CLR.meta,    hint: "Was über den einzelnen Lauf hinaus zählt." },
];
// ---- Untergruppen (nur Kategorie „frak"), feste Reihenfolge ----
export const GLOSSARY_GROUPS = {
  gen:       { label: "Allgemein", icon: "✦" },
  fire:      { label: "Feuer",     icon: "🔥" },
  lightning: { label: "Blitz",     icon: "⚡" },
  ice:       { label: "Eis",       icon: "❄️" },
  plant:     { label: "Pflanze",   icon: "🌿" },
};

export const GLOSSARY = {
  /* ============ 1 · Grundbegriffe ============ */
  stich: { category: "grund", label: "Stich", icon: "⚔️", color: CLR.grund,
    text: "Ein einzelnes Kartenduell — deine Karte gegen die Gegnerkarte; der höhere Kampfwert gewinnt.",
    match: ["Stich", "Stiche"] },
  durchlauf: { category: "grund", label: "Durchlauf", icon: "🔄", color: CLR.grund,
    text: "Alle 40 Karten des Decks einmal durchgespielt (40 Stiche). Danach mischt der Gegner neu und eine Entscheidung steht an.",
    match: ["Durchlauf", "Durchläufe", "Durchlaufs", "Durchläufen", "Deck-Durchlauf"] },
  aufstellung: { category: "grund", label: "Aufstellungsphase", icon: "↔", color: CLR.grund,
    text: "Zwischen zwei Durchläufen stellst du deine Kartenreihenfolge um — jeder Tausch kostet Formations-Energie.",
    match: ["Aufstellungsphase", "Aufstellung"] },
  streak: { category: "grund", label: "Siegesserie (Serie)", icon: "📈", color: CLR.lightning,
    text: "Siege in Folge (Siegesserie). Der Serien-Multiplikator und viele Skills wachsen mit ihr; eine Niederlage setzt sie zurück.",
    match: ["Siegesserie", "Serie", "Serien"] },
  wertvorsprung: { category: "grund", label: "Wertvorsprung", icon: "⚔️", color: CLR.fire,
    text: "Der Abstand zwischen deinem Kampfwert und dem der Gegnerkarte. Nicht ob du gewinnst zählt für Feuer, sondern wie klar: Hitze und Feuer-Score wachsen mit dem Vorsprung.",
    match: ["Wertvorsprung", "Vorsprung", "Wertabstand"] },
  kampfwert: { category: "grund", label: "Kampfwert", icon: "◆", color: CLR.grund,
    text: "Der effektive Wert einer Karte im Stich: Kartenwert plus alle Stichwert-Boni. Der höhere gewinnt.",
    match: ["Kampfwert"] },
  crit: { category: "grund", label: "Crit", icon: "⚡", color: CLR.lightning,
    text: `Kritischer Treffer: der Sieg zählt mit dem Crit-Multiplikator (Basis ×${de(C.CRIT_BASE_MULT)}). Der Basis-Crit ist 0 — Crit-Chance kommt aus den Präzision-Familien und aus Blitz-Skills. Jeder Blitz-Skill hebt zudem den Crit-Multiplikator um +${de(C.LIGHTNING_CRIT_MULT_PER_SKILL)}×.`,
    match: ["Crit", "Crits", "kritischer Treffer", "kritischen Treffer"] },
  gleichstand: { category: "grund", label: "Gleichstand", icon: "=", color: CLR.grund,
    text: "Gleiche Kampfwerte im Stich — normalerweise ohne Sieg (kein Score).",
    match: ["Gleichstand"] },
  geist: { category: "grund", label: "Geist / Rekord", icon: "👻", color: CLR.grund,
    text: "Dein gespeicherter Bestlauf als Vergleich — sein Score-Stand blitzt alle paar Stiche als Messlatte auf.",
    match: ["Geist", "Rekord"] },
  reroll: { category: "grund", label: "Neuwurf (Reroll)", icon: "🎲", color: CLR.grund,
    text: `Würfelt ein Angebot komplett neu. Drei getrennte Vorräte je Lauf — Perks · Gebäude · Skills, nicht untereinander teilbar, kein Nachschub. Der Upgrade-Baum hebt sie; im Ranglisten-Lauf sind es fest ${C.BASE_REROLLS} je Vorrat.`,
    match: ["Neuwurf", "Neuwürfe", "Reroll", "Rerolls"] },
  serienpunkt: { category: "grund", label: "Serienpunkt", icon: "📈", color: CLR.lightning,
    text: "Die Zähleinheit der Siegesserie: jeder Sieg in Folge ist ein Serienpunkt. Effekte, die „je Serienpunkt“ zahlen, skalieren also mit der Länge deiner aktuellen Serie.",
    match: ["Serienpunkt", "Serienpunkte", "Serienpunkten"] },
  farbserie: { category: "grund", label: "Farbserie", icon: "🎨", color: CLR.deck,
    text: "Aufeinanderfolgende Siege derselben Kartenfarbe. Ein Farbwechsel oder eine Niederlage setzt sie zurück. Pflanzen-grüne Karten zählen dabei als Grün. Speist u. a. den Perk Monochrom und die Familie Farbrausch.",
    match: ["Farbserie", "Farbserien"] },
  direktscore: { category: "grund", label: "Direkt-Score", icon: "＋", color: CLR.grund,
    text: "Score, der direkt zählt — ohne durch Serie, Crit oder Formation multipliziert zu werden. Wirkt flach und sofort, oft stark im frühen Spiel.",
    match: ["Direkt-Score"] },

  /* ============ 2 · Deck & Karten ============ */
  deck: { category: "deck", label: "Deck", icon: "🃏", color: CLR.deck,
    text: "40 Karten = 4 Farben × Werte 1–10. Dein Deck ist durch Perks/Architekt veränderbar; der Gegner mischt je Durchlauf neu.",
    match: ["Deck"] },
  farbe: { category: "deck", label: "Farbe", icon: "🎨", color: CLR.deck,
    text: "Rot, Blau, Grün, Gelb. Relevant vor allem für Farbblock-Formationen.",
    match: ["Farbe", "Farben"] },
  kartenwert: { category: "deck", label: "Kartenwert", icon: "◆", color: CLR.deck,
    text: "Der bleibende Grundwert einer Karte — durch Perks, Schmieden, Schichten oder den Architekten dauerhaft veränderbar.",
    match: ["Kartenwert", "Dauerwert"] },
  stichwert: { category: "deck", label: "Stichwert", icon: "◇", color: CLR.deck,
    text: "Ein Wertbonus nur für den aktuellen Stich (verfällt danach wieder). Zusammen mit dem Kartenwert ergibt er den Kampfwert.",
    match: ["Stichwert", "temporärer Wert", "temp Wert"] },
  ziehreihenfolge: { category: "deck", label: "Ziehreihenfolge", icon: "⋮", color: CLR.deck,
    text: "Die feste Reihenfolge, in der deine Karten gespielt werden — bleibt über Durchläufe stabil (nur der Gegner mischt).",
    match: ["Ziehreihenfolge", "Kartenreihenfolge"] },
  position: { category: "deck", label: "Position", icon: "№", color: CLR.deck,
    text: `Der feste Platz einer Karte in der Ziehreihenfolge (1–${C.TRICKS_PER_CYCLE}). Viele Perks, Anker und Gebäude hängen an der Position, nicht an der Karte — wer dort liegt, bekommt den Effekt. Nicht zu verwechseln mit dem Stich-Zähler, der nur sagt, wie weit der Durchlauf ist.`,
    match: ["Position", "Positionen", "Segmentposition", "Segmentpositionen"] },
  segment: { category: "deck", label: "Segment", icon: "▦", color: CLR.deck,
    text: "Ein Block aus 5 Positionen. Basis-Formationen sind segmentgebunden — ein Lauf endet an jeder Segmentgrenze.",
    match: ["Segment", "Segmente", "Segments", "Segmentgrenze", "Segmentgrenzen"] },

  /* ============ 3 · Formationen ============ */
  formation: { category: "form", label: "Formation", icon: "🔷", color: CLR.neutral,
    text: "Ein erkanntes Muster benachbarter Karten in deiner Ziehreihenfolge (Wiederholung, Treppe, Farbblock, Wechsel). Ein Sieg in einer Formation zählt mit einem Formations-Faktor. Nicht zu verwechseln mit den Eis-Formationen, die aus Gletschern auf dem Brett entstehen.",
    match: ["Formation", "Formationen"] },
  wiederholung: { category: "form", label: "Wiederholung", icon: "🔷", color: CLR.neutral,
    text: "≥2 gleiche Werte nebeneinander. 2. Karte ×1,25, 3. ×1,50, 4. ×1,80, danach je +0,40.",
    match: ["Wiederholung", "Wiederholungen"] },
  farbblock: { category: "form", label: "Farbblock", icon: "🔷", color: CLR.neutral,
    text: "≥3 Karten gleicher Farbe. Ab der 3. ×1,35, je weitere +0,20.",
    match: ["Farbblock", "Farbblöcke", "Farbblocks"] },
  treppe: { category: "form", label: "Treppe", icon: "🔷", color: CLR.neutral,
    text: "≥3 streng steigende Werte (Schritt ≤4). Ab der 3. ×1,35, je weitere +0,20.",
    match: ["Treppe", "Treppen"] },
  wechsel: { category: "form", label: "Wechsel", icon: "🔷", color: CLR.neutral,
    text: "≥3 im Zick-Zack (Nachbardifferenz ≥4). Ab der 3. ×1,40, je weitere +0,20.",
    match: ["Wechsel"] },
  anker: { category: "form", label: "Anker", icon: "⚓", color: CLR.neutral,
    text: "Eine einzelne Position zählt als aktive Formation (Faktor je Quelle). Kommt aus den Anker-Familien oder vom Architekt-Gebäude Grundstein. Höchstens ein Anker je Position. Grundstein legt ab Stufe III zusätzlich Stichwert auf jede Ankerzelle.",
    match: ["Anker", "Ankerzelle", "Ankerzellen"] },
  ueberlappung: { category: "form", label: "Überlappung", icon: "✜", color: CLR.neutral,
    text: "Steckt eine Karte in mehreren Formationen, wird ihr Faktor zusätzlich multipliziert: 2 → ×1,5 · 3 → ×2 · 4 → ×3.",
    match: ["Überlappung"] },
  nachhall: { category: "form", label: "Nachhall", icon: "〜", color: CLR.neutral,
    text: "Endet eine Formation, überträgt sich ihr Formations-Faktor noch einmal auf die direkt nächste Karte — der Bonus wirkt nach.",
    match: ["Nachhall"] },
  formationskern: { category: "form", label: "Formationskern", icon: "❖", color: CLR.neutral,
    text: "Ein von dir gewählter Formationstyp bekommt auf all seinen aktiven Formationen einen Zusatzfaktor.",
    match: ["Formationskern"] },
  grenzbonus: { category: "form", label: "Grenzbonus", icon: "⇥", color: CLR.neutral,
    text: "Läuft eine Formation über eine Segmentgrenze hinweg, geben ihre Karten zusätzlich ×1,25 Score. Kommt vom Perk Segmentarbeit (Stufe IV).",
    match: ["Grenzbonus"] },
  farballianz: { category: "form", label: "Farballianz", icon: "⧉", color: CLR.neutral,
    text: "Von dir verbundene Farben zählen für Farbblöcke als dieselbe Farbe.",
    match: ["Farballianz", "Allianz"] },
  farbtransparenz: { category: "form", label: "Farbblock-Transparenz", icon: "🔷", color: CLR.neutral,
    text: "Eine so markierte Karte unterbricht einen Farbblock nicht: der Block läuft über sie hinweg, als wäre sie nicht da (sie selbst zählt aber nicht mit). Kommt vom Architekt-Gebäude Arkade.",
    match: ["Farbblock-Transparenz"] },
  joker: { category: "form", label: "Joker", icon: "★", color: CLR.neutral,
    text: "Eine Karte darf bei der Erkennung den benötigten Wert oder die Farbe annehmen. Bildet allein keine Formation.",
    match: ["Joker"] },
  bindeglied: { category: "form", label: "Bindeglied", icon: "∿", color: CLR.neutral,
    text: "Eine Karte darf für eine Treppe im Wert abweichen. Perk-Familie Bindeglied: I/II ±1 · III um 1 oder 2 · IV jeder Wert zwischen den Nachbarn. Architekt-Gebäude Kreuzgang: ±1, ab Stufe III ±2.",
    match: ["Bindeglied"] },
  formenergie: { category: "form", label: "Formations-Energie", icon: "⚡", color: CLR.neutral,
    text: `Das Tausch-Budget der Aufstellungsphase (${C.FORMATION_ENERGY} je Phase). Jeder Tausch zweier Karten kostet 1.`,
    match: ["Formations-Energie", "Tausch", "Tausche"] },

  /* ============ 4 · Archetypen — Allgemein ============ */
  archetyp: { category: "frak", group: "gen", label: "Archetyp", icon: "✦", color: CLR.lightning,
    text: `Eine Skill-Familie mit eigener Identität (Feuer · Blitz · Eis · Pflanze). Der erste Skill schaltet sie frei; bis zu ${C.MAX_ARCHETYPES} mischbar.`,
    match: ["Archetyp", "Archetypen", "Archetyps", "Fraktion", "Fraktionen"] },
  skillslot: { category: "frak", group: "gen", label: "Skill-Slot", icon: "▭", color: CLR.lightning,
    text: `Du hältst höchstens ${C.SKILL_SLOTS} Skills gleichzeitig. Ist der Vorrat voll, ersetzt ein neuer einen alten. Der legendäre Skill aus der Legendär-Phase belegt einen zusätzlichen, festen Slot.`,
    match: ["Skill-Slot", "Skill-Slots", "Slots"] },
  skillrunde: { category: "frak", group: "gen", label: "Skill-Durchlauf", icon: "◷", color: CLR.lightning,
    text: `Zu festen Zeitpunkten im Lauf (erstmals Durchlauf ${C.FIRST_SKILL_CYCLE}) wählst du Skills statt eines Perks — ${C.SKILLS_OFFERED} Skills zur Auswahl, alle 4 Archetypen dabei.`,
    match: ["Skill-Durchlauf", "Skill-Durchläufe"] },
  consume: { category: "frak", group: "gen", label: "Konsument", icon: "⊗", color: CLR.lightning,
    text: "Ein Skill, der eine angesammelte Ressource für einen starken Effekt verbraucht — Feuer verbrennt Hitze, Blitz verbraucht Ladung. Mehrere Feuer-Konsumenten wirken gleichzeitig; von den Blitz-Konsumenten immer nur einer, ein neuer ersetzt den alten.",
    match: ["Konsument", "Konsumenten", "Hitze-Konsument"] },
  legskill: { category: "frak", group: "gen", label: "Legendärer Skill", icon: "★", color: CLR.gold,
    text: `Eine seltene, besonders mächtige Skill-Stufe (mit ★ markiert). Legendäre Skills kommen ausschließlich aus der Legendär-Phase (Durchlauf ${C.LEG_PHASE_CYCLE}) — welche Archetypen dort antreten, entscheidet der Upgrade-Baum.`,
    match: ["Legendärer Skill", "legendäre Skills"] },
  ueberlauf: { category: "frak", group: "gen", label: "Überlauf", icon: "≈", color: CLR.gold,
    text: `Sammelt eine Karte mehr an, als ihr normaler Nutzen verwertet — Wachstum über dem Wert-Deckel ${C.PLANT_VALUE_CAP}, Hitze über 100 % —, sonst wäre er verschwendet. Feuer (Weißglut) staut ihn als Überhitzung auf; die Legendären (Weltenbaum/Mutterbaum) verwandeln den großen Rest.`,
    match: ["Überlauf", "Überlauf-Wachstum"] },
  bekenntnis: { category: "frak", group: "gen", label: "Bekenntnis", icon: "✦", color: CLR.lightning,
    text: "Wie stark du dich einem Archetyp verschrieben hast: der Anteil deiner Skill-Slots, den seine Skills belegen. Viele Effekte — vor allem Legendäre — zahlen anteilig danach, voll erst bei reinem Deck.",
    match: ["Bekenntnis", "Blitz-Bekenntnis", "Feuer-Bekenntnis"] },

  /* ============ 4 · Feuer ============ */
  heat: { category: "frak", group: "fire", label: "Hitze", icon: "🔥", color: CLR.fire,
    text: `Siege mit klarem Wertvorsprung heizen die Hitzeleiste (0–100 %) auf und geben Feuer-Score = (Vorsprung − ${C.FIRE_MARGIN_OFFSET}) × ${C.FIRE_SCORE_BASE} (+${C.FIRE_SCORE_PER_SKILL} je weiterem Feuer-Skill). Großer Vorsprung zahlt weiter, ohne Deckel — mit abnehmendem Zuwachs; klare Niederlagen kühlen ab.`,
    match: ["Hitze", "Hitzeleiste"] },
  glutdividende: { category: "frak", group: "fire", label: "Glutdividende", icon: "🔥", color: CLR.fire,
    text: "Zusätzlicher Score bei jedem Feuer-Sieg, der direkt zählt (ohne Serie/Crit/Formation zu durchlaufen). Je mehr Hitze du hältst, desto mehr — bis zu einem Deckel. Stark im frühen Spiel.",
    match: ["Glutdividende"] },
  brand: { category: "frak", group: "fire", label: "Brandmal", icon: "🔥", color: CLR.fire,
    text: `Eine gebrandmarkte Gegnerkarte verliert Wert; jeder Brand gibt +${C.BRAND_ASH} Asche — der Rohstoff der Feuer-Schmiede.`,
    match: ["Brandmal", "Brand", "Brände", "gebrandmarkte"] },
  ash: { category: "frak", group: "fire", label: "Asche", icon: "🔥", color: CLR.fire,
    text: `Rohstoff der Feuer-Schmiede: Brände geben +${C.BRAND_ASH} Asche. Die Ascheschmiede verbraucht ${C.FORGE_COST} Asche je Schmiedung (+${C.FORGE_VALUE} Kartenwert); ist die Schmiede voll, verglüht restliche Asche als Ascheglut zu Score.`,
    match: ["Asche"] },
  // Zwei getrennte Überlauf-Pfade, die früher beide „Weißglut" hießen (Sprachprüfung B1): HITZE über 100 %
  // (Skill Weißglut) und ASCHE über die Schmiede-Kapazität (Ascheglut). Ein Wort = eine Bedeutung.
  whiteheat: { category: "frak", group: "fire", label: "Weißglut", icon: "🔥", color: CLR.fire,
    text: `Der Hitze-Überlauf: Ist die Hitzeleiste voll, staut sich jeder weitere Hitzegewinn als Überhitzung auf (bis ${C.HEAT_MAX + C.OVERHEAT_MAX} %) — je heißer, desto weniger davon kommt an. Jeder Punkt Überhitzung gibt +${Math.round(C.OVERHEAT_SCORE_STEP * 100)} % auf deinen gesamten Feuer-Score und baut sich je Stich wieder ab. Braucht den Skill Weißglut.`,
    match: ["Weißglut", "Überhitzung"] },
  ashglow: { category: "frak", group: "fire", label: "Ascheglut", icon: "🔥", color: CLR.fire,
    text: `Der Asche-Überlauf: Ist die Schmiede-Kapazität voll, wird restliche Asche am Durchlauf-Ende in Score-Häppchen verbrannt (+${grp(C.FORGE_OVERFLOW_SCORE)} Score je ${C.FORGE_COST} Asche) — Asche wird so jeden Durchlauf vollständig ausgegeben, kein toter Haufen mehr.`,
    match: ["Ascheglut"] },
  forge: { category: "frak", group: "fire", label: "Schmieden", icon: "⚒", color: CLR.fire,
    text: `Asche wird zu dauerhaftem Kartenwert (Ascheschmiede: ${C.FORGE_COST} Asche → +${C.FORGE_VALUE} Wert auf die niedrigste Karte).`,
    match: ["Schmieden", "geschmiedet", "Schmiede", "Ascheschmiede"] },

  /* ============ 4 · Blitz ============ */
  charge: { category: "frak", group: "lightning", label: "Ladung", icon: "⚡", color: CLR.lightning,
    text: `Crits erzeugen Ladung (max ${C.LIGHTNING_MAX_CHARGE}). Bei voller Ladung lösen Blitz-Konsumenten ihren Effekt aus und verbrauchen sie.`,
    match: ["Ladung", "Ladungen"] },
  ionize: { category: "frak", group: "lightning", label: "Ionisierung", icon: "⚡", color: CLR.lightning,
    text: `Dauerhafte Kartenmarkierung: eine ionisierte Karte gibt bei Sieg +${C.ION_SCORE_PER_STACK} Score je Stapel und erhält danach +1 Stapel (max ${C.ION_MAX_STACKS}). Zusätzlich lädt das ionisierte Feld die Luft auf: jeder Ionisierungsstapel im Deck hebt die Crit-Chance JEDER Siegkarte um +${pct(C.ION_CRIT_PP_PER_STACK)} % (feldweit, bis +${pct(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK)} %). Wie viele Karten je Ladungsverbrauch ionisieren, wächst mit dem Archetyp: +${C.ION_SPEED_PER_SKILL} je Blitz-Skill über ${C.ION_SPEED_MIN_SKILLS}.`,
    match: ["Ionisierung", "ionisierte", "ionisierten", "ionisiert"] },
  stapel: { category: "frak", group: "lightning", label: "Stapel (Ionisierung)", icon: "▤", color: CLR.lightning,
    text: `Eine Ionisierungs-Aufladung auf einer einzelnen Karte (höchstens ${C.ION_MAX_STACKS} je Karte). Jeder Stapel gibt bei Sieg mit der Karte +${C.ION_SCORE_PER_STACK} Score und hebt zusätzlich feldweit die Crit-Chance (siehe Ionisierung). Eine Karte mit ${C.ION_MAX_STACKS} Stapeln ist voll ionisiert und schaltet Sondereffekte frei (u. a. Kurzschluss, Durchschlag).`,
    match: ["Ionisierungsstapel", "Ionisierungsstapeln", "Stapel", "Stapeln"] },
  kaskade: { category: "frak", group: "gen", label: "Kaskade", icon: "🔗", color: CLR.lightning,
    text: "Ein Ereignis zündet das nächste. Bei Blitz: ein Crit auf oder neben einer ionisierten Karte erzeugt zusätzliche Ladung. Bei Eis: ein berstender Gletscher reißt seine Nachbarn mit, sodass eine Bruchwelle durchs Cluster läuft.",
    match: ["Kaskade", "Kaskaden"] },

  /* ============ 4 · Eis ============ */
  glacier: { category: "frak", group: "ice", label: "Gletscher", icon: "❄️", color: CLR.ice,
    text: `Eis ist der Gletscher-Archetyp: du frierst eine Karte auf ihrem Brettfeld fest — ab dann ist sie starr (in keiner künftigen Aufstellung mehr verschiebbar), sammelt dafür aber Masse an. Genug Masse, und der Gletscher bricht über seine Nachbarn.`,
    match: ["Gletscher", "Gletschern"] },
  masse: { category: "frak", group: "ice", label: "Masse", icon: "❄️", color: CLR.ice,
    text: `Die Eis-Ressource: Masse liegt auf dem Brettfeld. Jeder Gletscher gewinnt jeden Durchlauf +${de(G_EWIGER_FROST)} Masse — bedingungslos, ob Sieg oder Niederlage; ein Sieg bringt +${de(G_WIN_MASS)} Masse zusätzlich.`,
    match: ["Masse"] },
  bersten: { category: "frak", group: "ice", label: "Bersten", icon: "❄️", color: CLR.ice,
    text: `Erreicht ein Gletscher ${G_THRESHOLDS[G_THRESHOLDS.length - 1]} Masse, bricht er: Berst-Score aus Masse × Wucht der erreichten Schwelle (Schwellen ${G_THRESHOLDS.join(" / ")}), verstärkt um +${pct(G_KASKADE)} % je angrenzendem Gletscher und Kollision, wenn der Bruch einen Gletscher-Nachbarn trifft. Danach fällt er auf 0 ab und füllt sich zum Durchlauf-Beginn aus seiner Firn-Reserve wieder auf.`,
    match: ["Bersten", "bricht", "brechen", "Bruch", "Brüche", "Bruchs", "brechendem", "Berst-Score", "Berst-Schwelle"] },
  cluster: { category: "frak", group: "ice", label: "Cluster", icon: "🔗", color: CLR.ice,
    text: "Eine Gruppe direkt aneinandergrenzender Gletscher. Viele Eis-Skills messen die Cluster-Größe (z. B. Verschmelzen, Verzahnung); Eisbrücke zählt auch die Diagonalen dazu.",
    match: ["Cluster", "Clusters", "Clustern"] },
  eisformation: { category: "frak", group: "ice", label: "Gletscher-Formationen", icon: "❄️", color: CLR.ice,
    text: `Eis ist das einzige Deck mit Gletscher-Formationen: geometrische Formen aus festgefrorenen Gletschern verstärken deren Bersten — Block = 2×2 (4 Gletscher, ×${de(G_BLOCK)}), Kreuz = Zentrum + 4 Nachbarn (5, ×${de(G_KREUZ)}), Linie = volle Reihe (5) oder Spalte (8) (×${de(G_LINIE)}), Große Fläche = 3×3 (9, ×${de(G_FLAECHE)}). Überlappende Formen stapeln.`,
    match: ["Gletscher-Formationen", "Gletscher-Formation", "Eis-Formationen", "Eis-Formation"] },
  // id `freeze` bleibt als Backcompat-Token erhalten (glossary.test.js), umgewidmet auf „Firn-Boden".
  freeze: { category: "frak", group: "ice", label: "Firn-Boden", icon: "❄️", color: CLR.ice,
    text: `Firn liegt als Reserve auf dem Brettfeld (Firn-Boden), getrennt von der Gletschermasse. Frierst du einen Gletscher auf ein aufgeladenes Feld, wird der angesammelte Firn zu seiner Reserve; der Gletscher startet leer und zieht daraus jeden Durchlauf wieder auf volle ${G_THRESHOLDS[G_THRESHOLDS.length - 1]} Masse nach (nur die Differenz, nie darüber), bis die Reserve leer ist. Offenen Boden laden Dauerfrost, Schneetreiben und Eiszeit auf — nie unter einen Gletscher.`,
    match: ["Firn-Boden", "Firn"] },

  /* ============ 4 · Pflanze ============ */
  growth: { category: "frak", group: "plant", label: "Wachstum", icon: "🌿", color: CLR.plant,
    text: `Eigene Karten wachsen bei Siegen (nur steigend) — umso schneller, je mehr Pflanze-Skills du hältst (volles Tempo ab ${C.PLANT_GROWTH_SKILL_REF} Skills, darunter anteilig). Ab ${C.PLANT_GREEN_THRESHOLD} Wachstum wird eine Karte dauerhaft grün (reif); darunter ist sie ein Setzling.`,
    match: ["Wachstum"] },
  setzling: { category: "frak", group: "plant", label: "Setzling", icon: "🌱", color: CLR.plant,
    text: `Eine Karte, die schon wächst, aber noch nicht reif ist (Wachstum unter ${C.PLANT_GREEN_THRESHOLD}). Ein Setzling zählt noch NICHT zum grünen Farbblock — erst ab ${C.PLANT_GREEN_THRESHOLD} Wachstum wird er grün (reif). Setzlingsbeet gibt der niedrigsten Karte je Segment +${C.SETZLINGSBEET_GROWTH} Wachstum Vorsprung.`,
    match: ["Setzling", "Setzlinge", "Setzlingen"] },
  green: { category: "frak", group: "plant", label: "Grün (reif)", icon: "🌿", color: CLR.plant,
    text: `Grüne Karten sind dauerhaft und bilden einen gemeinsamen Farbblock — je größer der Block, desto mehr Score. Der Farbblock-Multiplikator für grüne Karten wird auf max. ×1,35 gedeckelt.`,
    match: ["Grün", "grüne", "grünen", "grüner", "Reife", "reif"] },
  wurzeln: { category: "frak", group: "plant", label: "Wurzeln", icon: "🌿", color: CLR.plant,
    text: `Solange du nur Pflanzen-Skills hältst, machen grüne Siege die Karte wertvoller: je ${C.WURZELSCHLAG_PER_GROWTH} Wachstum +1 Kartenwert (bis ${C.PLANT_VALUE_CAP}), ab ${C.WURZELSCHLAG_LOSS_MIN_SKILLS} Skills auch bei jeder ${C.WURZELSCHLAG_LOSS_EVERY}. Niederlage. Das Wachstum bleibt dabei erhalten und zählt weiter für Wurzel-Score und die Legendären.`,
    match: ["Wurzeln", "Wurzel-Score", "Wurzeln-Score"] },
  bluete: { category: "frak", group: "plant", label: "Blüte", icon: "🌸", color: CLR.plant,
    text: `Ein Grün-Payoff: Siegt eine grüne Karte mit grünen Nachbarn, gibt sie +${C.BLUETE_SCORE} Blüte-Score je grüner Karte im Segment (Blütezeit ×${C.BLUETEZEIT_MULT} in Formation, Überwucherung nochmals ×2).`,
    match: ["Blüte", "Blüte-Score", "Blütezeit"] },
  trimmen: { category: "frak", group: "plant", label: "Trimmen", icon: "✂", color: CLR.plant,
    text: `Der Wendepunkt vom Wachsen zum Ernten: ersetzt du einen Wachstums-Skill (${TRIMMABLE_NAMES}), zählt das als Trimmung → dauerhaft +${pct(C.TRIM_STEP)} % Wurzel- & Blüten-Score, je mehr Trimmungen desto höher (bis +${pct(C.TRIM_CAP)} %). Die Wachstums-Skills sterben so nicht, sie veredeln die Ernte.`,
    match: ["Trimmen", "Trimmung", "Trimmungen", "getrimmt"] },
  colonize: { category: "frak", group: "plant", label: "Kolonisieren / Ausläufer", icon: "🌿", color: CLR.plant,
    text: "Markiert gegnerische Karten grün (Ausläufer/Rhizom). Besiegst du eine kolonisierte Karte, erntest du Wachstum.",
    match: ["Kolonisieren", "kolonisierte", "Ausläufer"] },
  overgrowth: { category: "frak", group: "plant", label: "Überwucherung", icon: "🌿", color: CLR.plant,
    text: `Ist das Feld ≥${Math.round(C.UEBERWUCHERUNG_FIELD * 100)} % grün, werden alle Farbblöcke stärker (+${de(C.UEBERWUCHERUNG_FACTOR)} Faktor) und Blüte zählt doppelt.`,
    match: ["Überwucherung"] },
  eternalSpring: { category: "frak", group: "plant", label: "Ewiger Frühling", icon: "🌿", color: CLR.plant,
    text: `Farbblock zählt Grün schon ab ${C.EWIGER_FRUEHLING_FARBBLOCK} Karten und Überwucherung schon ab ${Math.round(C.EWIGER_FRUEHLING_FIELD * 100)} % Feld. Je größer dein ewig-grünes Feld, desto mehr Score zahlt jeder grüne Sieg direkt.`,
    match: ["Ewiger Frühling"] },

  /* ============ 5 · Präzision · Crit (#267) ============ */
  praez_intro: { category: "praez", label: "Präzision", icon: "◎", color: CLR.lightning,
    text: `Crit als Perk-Kategorie. Der Basis-Crit ist 0 — für Nicht-Blitz-Builds kommt Crit-Chance/-Schaden aus den fünf RNG-gegateten Präzision-Familien (kein Legendär). Blitz bleibt der verlässliche, selbst-generierte Crit-Archetyp; Präzision ist additiv obendrauf.`,
    match: ["Präzision"] },
  praez_sharp: { category: "praez", label: "Schärfe", icon: "▲", color: CLR.lightning,
    text: `Flat +Crit-Chance auf alle Karten (${pct(C.PRECISION_SHARP_PP[0])}/${pct(C.PRECISION_SHARP_PP[1])}/${pct(C.PRECISION_SHARP_PP[2])}/${pct(C.PRECISION_SHARP_PP[3])} % je Stufe). Der Grund-Crit-Motor.`,
    match: ["Schärfe", "Crit-Chance"] },
  praez_force: { category: "praez", label: "Wucht", icon: "▲", color: CLR.lightning,
    text: `+Crit-Multiplikator auf Basis ${de(C.CRIT_BASE_MULT)}× (+${de(C.PRECISION_FORCE_MULT[0])}/${de(C.PRECISION_FORCE_MULT[1])}/${de(C.PRECISION_FORCE_MULT[2])}/${de(C.PRECISION_FORCE_MULT[3])}× je Stufe).`,
    match: ["Wucht", "Crit-Multiplikator"] },
  praez_aim: { category: "praez", label: "Zielsicherheit", icon: "▲", color: CLR.lightning,
    text: `+${pct(C.PRECISION_AIM_PP)} % Crit-Chance auf hohe Karten; die Schwelle weitet sich je Stufe (Wert ≥ ${C.PRECISION_AIM_THRESH[0]}/${C.PRECISION_AIM_THRESH[1]}/${C.PRECISION_AIM_THRESH[2]}/${C.PRECISION_AIM_THRESH[3]}).`,
    match: ["Zielsicherheit"] },
  praez_lens: { category: "praez", label: "Brennglas", icon: "▲", color: CLR.lightning,
    text: `+Crit-Chance je gleichzeitiger Formation ab der zweiten an der Siegposition (${pct(C.PRECISION_LENS_PP[0])}/${pct(C.PRECISION_LENS_PP[1])}/${pct(C.PRECISION_LENS_PP[2])}/${pct(C.PRECISION_LENS_PP[3])} % je Formation, max ${C.PRECISION_LENS_CAP} extra). Belohnt Formations-Tiefe.`,
    match: ["Brennglas"] },
  praez_color: { category: "praez", label: "Farbfokus", icon: "▲", color: CLR.lightning,
    text: `Wähle eine Farbe → +Crit-Chance auf diese Farbe (${pct(C.PRECISION_COLOR_PP[0])}/${pct(C.PRECISION_COLOR_PP[1])}/${pct(C.PRECISION_COLOR_PP[2])} %); Stufe IV gibt stattdessen eine ZWEITE wählbare Farbe (beide +${pct(C.PRECISION_COLOR_PP[3])} %).`,
    match: ["Farbfokus"] },

  /* ============ 6 · Perks & Rarität ============ */
  perk: { category: "perk", label: "Perk", icon: "✦", color: CLR.perk,
    text: "Ein wählbarer, dauerhafter Effekt. Jeder Perk ist pro Lauf nur einmal wählbar.",
    match: ["Perk", "Perks"] },
  familie: { category: "perk", label: "Familie", icon: "❏", color: CLR.perk,
    text: "Ein Perk oder Bau als aufwertbare Einheit mit bis zu vier Stufen (I–IV). Du wertest ihn Stufe für Stufe auf.",
    match: ["Familie", "Familien"] },
  stufe: { category: "perk", label: "Stufe I–IV", icon: "❏", color: CLR.perk,
    text: "Der Rang einer Familie. Höhere Stufen sind stärker und werden seltener angeboten; Stufe IV schließt die Familie ab.",
    match: ["Stufe", "Stufen"] },
  raritaet: { category: "perk", label: "Rarität", icon: "◈", color: CLR.perk,
    text: `${RARITY_NAMES} — die vier Familien-Stufen, farblich markiert.`,
    match: ["Rarität", "Raritäten"] },
  legendaer: { category: "perk", label: "Legendär", icon: "★", color: CLR.gold,
    text: "Ein mächtiger Effekt mit Nachteil, außerhalb des Stufen-Systems — eigener Wurf, goldener Rahmen, höchstens einer je Angebot.",
    match: ["Legendär", "Legendäre", "Legendärer", "legendäres", "legendären", "Legendaries"] },
  upgradetyp: { category: "perk", label: "Aufwertungs-Typen", icon: "⇧", color: CLR.perk,
    text: "Wie eine Familie beim Aufwerten wirkt: Regelersetzung (nur höchste Stufe zählt) · Kumulativ (jede Stufe wirkt einmalig) · Rolle (Ziel behält Rolle, Zahlen steigen).",
    match: ["Regelersetzung", "Kumulativ"] },
  kategorien: { category: "perk", label: "Kategorien A–E", icon: "⁙", color: CLR.perk,
    text: "Die fünf Perk-Sorten: A Deck · B Stich · C Rolle · D Score · E Form (Formationswerkzeuge).",
    match: ["Kategorien"] },
  opfergabe: { category: "perk", label: "Opfergabe", icon: "⁙", color: CLR.perk,
    text: "Eine gewählte Karte verliert dauerhaft Wert, ihr direkter Nachfolger gewinnt ihn.",
    match: ["Opfergabe"] },

  /* ============ 7 · Der Architekt ============ */
  bauphase: { category: "arch", label: "Bauphase / Der Architekt", icon: "🏛", color: CLR.arch,
    text: "Der Architekt ersetzt den Shop: statt zu kaufen legst du geometrische Gebäude als Overlay aufs Kartenbrett. Kein Geld, keine Münzen.",
    match: ["Bauphase", "Architekt", "Architekten"] },
  brett: { category: "arch", label: "Brett (8×5)", icon: "▦", color: CLR.arch,
    text: "Deine 40 Deckpositionen als 8 Zeilen × 5 Spalten. Formationen laufen weiter auf der 1D-Reihenfolge.",
    match: ["Brett"] },
  polyomino: { category: "arch", label: "Polyomino / Form", icon: "▚", color: CLR.arch,
    text: "Die Zellenform eines Gebäudes (Tetris-artig), in mehreren Drehlagen platzierbar.",
    match: ["Polyomino", "Polyominoes"] },
  bauplan: { category: "arch", label: "Bauplan", icon: "🗎", color: CLR.arch,
    text: "Ein Angebots-Eintrag, aus dem du ein Gebäude errichtest. 3 Baupläne je Bauphase.",
    match: ["Bauplan", "Baupläne"] },
  gebaeude: { category: "arch", label: "Gebäude", icon: "🏢", color: CLR.arch,
    text: "Ein platziertes Gebäude. Es bufft die Karte, die auf seiner Position im Stich steht — überlappt nie mit anderen.",
    match: ["Gebäude"] },
  baufeld: { category: "arch", label: "Baufeld (Deckel)", icon: "▧", color: CLR.arch,
    text: "Die begrenzte Zahl belegbarer Brettzellen. Die Knappheit macht das Platzieren zur Entscheidung (der Upgrade-Baum und der Perk Bauhütte heben den Deckel).",
    match: ["Baufeld"] },
  baukat: { category: "arch", label: "Bau-Kategorien", icon: "◧", color: CLR.arch,
    text: "Drei Effekt-Arten: Wert (Tragwerk, +Stichwert) · Score (Handelsbau, +Score) · Formation (Sakralbau, biegt die Erkennung).",
    match: ["Bau-Kategorien"] },
  struktur: { category: "arch", label: "Struktur", icon: "✶", color: CLR.arch,
    text: "Eine vollständig bebaute Zeile, Spalte oder Diagonale (eine vollendete Struktur) gibt einen Multiplikator; sie stapeln multiplikativ. Manche Gebäude (Speicherstadt, Sternwarte) zahlen zusätzlich je vollendeter Struktur. Zusammen mit den Distrikt-Faktoren ergibt das den Gebäude-Boost, den die Bauphase oben anzeigt.",
    match: ["Struktur-Boni", "vollendete Struktur", "vollendeter Struktur", "vollendete Strukturen", "Struktur", "Strukturen", "Struktur-Kombi"] },
  distrikt: { category: "arch", label: "Nachbargebäude / Distrikt", icon: "🏘", color: CLR.arch,
    text: "Ein Gebäude, das orthogonal an ein anderes angrenzt. Distrikt-Baupläne (z. B. Zunftviertel, Marktplatz) zahlen je Nachbargebäude, bis zu einem Deckel — sie belohnen dichtes Bauen.",
    match: ["Nachbargebäude", "Distrikt", "Distrikte"] },
  staffel: { category: "arch", label: "Staffel", icon: "⇒", color: CLR.arch,
    text: "Ein Gebäude reicht seinen Score an das Nachbarfeld weiter — der Effekt wirkt versetzt, nicht auf der eigenen Zelle (z. B. Laufgang, Leuchtturm).",
    match: ["Staffel", "Staffeln"] },
  lage: { category: "arch", label: "Lage", icon: "◫", color: CLR.arch,
    text: "Manche Gebäude wirken nur in den frühen oder nur in den späten Segmenten des Bretts — die Platzierung entscheidet (z. B. Wehrgang, Vorwerk).",
    match: ["Lage"] },
  critwette: { category: "arch", label: "Crit-Wette", icon: "🎯", color: CLR.arch,
    text: "Eine Wette auf den Crit: Sieg mit Crit zahlt den Jackpot, Sieg ohne Crit kostet Abzug (nie unter 0). Aufwerten hebt nur den Jackpot, nicht den Abzug (z. B. Losbude, Spielbank).",
    match: ["Crit-Wette", "Wette", "Wetten", "Jackpot"] },
  kicker: { category: "arch", label: "Stufen-Kicker", icon: "⇧", color: CLR.arch,
    text: "Manche Gebäude schalten beim Aufwerten ab einer bestimmten Stufe einen zusätzlichen Effekt frei — nicht nur eine größere Zahl.",
    match: ["Stufen-Kicker", "Kicker"] },
  abgedecktezelle: { category: "arch", label: "Abgedeckte Zelle", icon: "▨", color: CLR.arch,
    text: "Eine Brettzelle, die unter einem platzierten Gebäude liegt. Dichte Bebauung zahlt Score je abgedeckter Zelle; Eckstein gibt seiner Rollenkarte Stichwert, solange sie unter einem Gebäude liegt.",
    match: ["abgedeckte Zelle", "abgedeckter Zelle", "abgedeckte Zellen", "unter einem Gebäude"] },
  aufruesten: { category: "arch", label: "Aufwerten", icon: "⇧", color: CLR.arch,
    text: "Ein bestehendes Gebäude um +1 Stufe erhöhen statt neu zu bauen (Legendäre haben keine Stufen).",
    match: ["Aufwerten", "Ausbauen"] },
  versetzen: { category: "arch", label: "Versetzen", icon: "⇄", color: CLR.arch,
    text: "Ein bestehendes Gebäude auf dem Brett verschieben oder drehen (eigene Phase nach dem Bauen).",
    match: ["Versetzen"] },

  /* ============ 8 · Fortschritt & Meta ============ */
  // (Sprachprüfung A6) Meisterrang/Meister-Lauf/Großmeister ersatzlos entfernt — das System gibt es nicht mehr.
  // An seine Stelle treten Upgrade-Baum (SP/DP) und der Ranglisten-Wochenmodus.
  stichpunkte: { category: "meta", label: "Stichpunkte (SP)", icon: "◆", color: CLR.meta,
    text: "Die Währung des Upgrade-Baums. Du verdienst sie laufübergreifend und gibst sie für Knoten aus, die deine künftigen Läufe dauerhaft stärken.",
    match: ["Stichpunkt", "Stichpunkte", "SP"] },
  deckpunkte: { category: "meta", label: "Deckpunkte (DP)", icon: "🎴", color: CLR.meta,
    text: "Die Währung der Deck-Werkstatt — rein kosmetisch. Damit kaufst du Karten-/Spielfeld-Pakete und Effekte; auf das Gameplay wirken sie nicht.",
    match: ["Deckpunkt", "Deckpunkte", "DP"] },
  upgradebaum: { category: "meta", label: "Upgrade-Baum", icon: "🌳", color: CLR.meta,
    text: "Der laufübergreifende Fortschritt: Für Stichpunkte kaufst du Knoten, die neue Archetypen, höhere Raritäten, mehr Baufeld, mehr Formations-Energie, bessere Drop-Raten und die Legendär-Phasen freischalten. Im Ranglisten-Lauf hat er keine Wirkung.",
    match: ["Upgrade-Baum", "Upgrades"] },
  rankedrun: { category: "meta", label: "Ranglisten-Lauf", icon: "🏆", color: CLR.meta,
    text: "Der wöchentliche Wettbewerbs-Modus: alle spielen denselben Seed unter derselben, baum-unabhängigen Baseline. Nur abgeschlossene Läufe zählen; am Wochenende wandert Platz 1 ins Challenger-Archiv.",
    match: ["Ranglisten-Lauf", "Ranglisten-Läufe", "Wochen-Rangliste"] },
  weekmod: { category: "meta", label: "Wochen-Modifikator", icon: "🎲", color: CLR.meta,
    text: "Drei bis fünf Regeländerungen, die jede Woche neu gewürfelt werden und für alle gleich gelten (mindestens zwei positive, mindestens eine negative). Sie hängen am Wochen-Seed, nicht an deinem Profil.",
    match: ["Wochen-Modifikator", "Wochen-Modifikatoren", "Modifikator", "Modifikatoren"] },
  chronik: { category: "meta", label: "Chronik", icon: "📜", color: CLR.meta,
    text: "Lesende Übersicht aller 40 Karten des Laufs in aktueller Reihenfolge, mit Formations-, Rollen- und Ankermarkern.",
    match: ["Chronik"] },
  bestenliste: { category: "meta", label: "Bestenliste", icon: "🏆", color: CLR.meta,
    text: "Deine lokalen Läufe plus die globale Rangliste.",
    match: ["Bestenliste"] },
  challenger: { category: "meta", label: "Challenger / Seed", icon: "🔁", color: CLR.meta,
    text: "Teile einen Lauf über seinen Seed (kurzer Code); andere spielen exakt dieselben Karten nach und vergleichen den Score.",
    match: ["Challenger", "Seed", "Nachspielen"] },
  statshub: { category: "meta", label: "Statistik-Hub", icon: "📊", color: CLR.meta,
    text: "Aggregierte Statistiken deiner Läufe: Bestscore, Ø-Score, beste Serie, Archetyp-Nutzung u. a.",
    match: ["Statistik-Hub", "Statistiken"] },
  scoreherkunft: { category: "meta", label: "Score-Herkunft", icon: "▤", color: CLR.meta,
    text: "Aufteilung deines Scores auf Formationen / Crits / Übrige — zeigt, woher dein Build seinen Score zieht.",
    match: ["Score-Herkunft"] },
  kosmetik: { category: "meta", label: "Kosmetik / Deck", icon: "🎴", color: CLR.meta,
    text: "Rein kosmetische Freischaltungen (Kartenrücken, Spielfeld-Skins) ohne Gameplay-Effekt — z. B. Rang-Decks.",
    match: ["Kosmetik"] },
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

/* #sprache: `glossaryEntries` und `tokenizeGlossary` sind nach src/i18n/glossaryText.js gewandert.
   Grund: die Auto-Fettung verdichtete die Wortformen EINMAL beim Modul-Laden zu einer Regex — damit
   hing sie an der Sprache, die beim Import zufällig aktiv war. Dort wird sie jetzt je Sprache
   gebaut und gecacht. Ein `import { t }` an dieser Stelle wäre ein Zyklus (de.js → glossary.js →
   i18n → de.js), deshalb liegt beides eine Schicht darüber. Dieses Register bleibt ein Blatt. */
