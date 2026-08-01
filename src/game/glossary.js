import * as C from "./constants.js";

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

// Akzentfarben (hartkodiert, damit das Glossar NUR von constants.js abhängt — kein Import-Zyklus).
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

// ---- Kategorien (Anzeige-Reihenfolge im Overlay) ----
export const GLOSSARY_CATEGORIES = [
  { id: "grund", label: "Grundbegriffe",      color: CLR.grund },
  { id: "deck",  label: "Deck & Karten",      color: CLR.deck },
  { id: "form",  label: "Formationen",        color: CLR.neutral },
  { id: "frak",  label: "Archetypen",         color: CLR.lightning },
  { id: "stat",  label: "Werte · Stats",      color: CLR.grund },
  { id: "perk",  label: "Perks & Rarität",    color: CLR.perk },
  { id: "arch",  label: "Der Architekt",      color: CLR.arch },
  { id: "meta",  label: "Fortschritt & Meta", color: CLR.meta },
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
    text: "Ein kompletter Durchgang durchs 40-Karten-Deck (40 Stiche). Danach mischt der Gegner neu und eine Entscheidung steht an.",
    match: ["Durchlauf", "Durchläufe", "Deck-Durchlauf"] },
  aufstellung: { category: "grund", label: "Aufstellungsphase", icon: "↔", color: CLR.grund,
    text: "Zwischen zwei Durchläufen stellst du deine Kartenreihenfolge um — jeder Tausch kostet Formations-Energie.",
    match: ["Aufstellungsphase", "Aufstellung"] },
  streak: { category: "grund", label: "Siegesserie (Serie)", icon: "📈", color: CLR.lightning,
    text: "Siege in Folge (Siegesserie). Der Serien-Multiplikator und viele Skills wachsen mit ihr; eine Niederlage setzt sie zurück.",
    match: ["Siegesserie", "Serie", "Serien"] },
  kampfwert: { category: "grund", label: "Kampfwert", icon: "◆", color: CLR.grund,
    text: "Der effektive Wert einer Karte im Stich: Kartenwert plus alle Stichwert-Boni. Der höhere gewinnt.",
    match: ["Kampfwert"] },
  crit: { category: "grund", label: "Crit", icon: "⚡", color: CLR.lightning,
    text: `Kritischer Treffer: der Sieg zählt mit dem Crit-Multiplikator (Basis ×${de(C.CRIT_BASE_MULT)}). Crit-Chance kommt aus dem Crit-Stat und aus Blitz-Skills.`,
    match: ["Crit", "Crits", "kritischer Treffer", "kritischen Treffer"] },
  breakdown: { category: "grund", label: "Score-Aufschlüsselung", icon: "∑", color: CLR.grund,
    text: "Die Punktkette eines Siegs: Basis × Serie × Perk-Mult × Formation × Crit — jeder Faktor wird einzeln ausgewiesen.",
    match: ["Score-Aufschlüsselung", "Aufschlüsselung"] },
  gleichstand: { category: "grund", label: "Gleichstand", icon: "=", color: CLR.grund,
    text: "Gleiche Kampfwerte im Stich — normalerweise ohne Sieg (kein Score).",
    match: ["Gleichstand"] },
  geist: { category: "grund", label: "Geist / Rekord", icon: "👻", color: CLR.grund,
    text: "Dein gespeicherter Bestlauf als Vergleich — sein Score-Stand blitzt alle paar Stiche als Messlatte auf.",
    match: ["Geist", "Rekord"] },
  reroll: { category: "grund", label: "Neuwurf (Reroll)", icon: "🎲", color: CLR.grund,
    text: `Würfelt ein Perk- oder Skill-Angebot komplett neu. Geteilter Vorrat je Lauf (Start ${C.BASE_REROLLS}); Meisterränge geben mehr. Ersetzt die alte Münzökonomie.`,
    match: ["Neuwurf", "Neuwürfe", "Reroll"] },

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
  segment: { category: "deck", label: "Segment", icon: "▦", color: CLR.deck,
    text: "Ein Block aus 5 Positionen. Basis-Formationen sind segmentgebunden — ein Lauf endet an jeder Segmentgrenze.",
    match: ["Segment", "Segmente", "Segmentgrenze", "Segmentgrenzen"] },

  /* ============ 3 · Formationen ============ */
  formation: { category: "form", label: "Formation", icon: "🔷", color: CLR.neutral,
    text: "Ein erkanntes Muster benachbarter Karten (Wiederholung, Treppe, Farbblock, Wechsel). Ein Sieg in einer Formation zählt mit einem Formations-Faktor.",
    match: ["Formation", "Formationen"] },
  wiederholung: { category: "form", label: "Wiederholung", icon: "🔷", color: CLR.neutral,
    text: "≥2 gleiche Werte nebeneinander. 2. Karte ×1,25, 3. ×1,50, 4. ×1,80, danach je +0,40.",
    match: ["Wiederholung"] },
  farbblock: { category: "form", label: "Farbblock", icon: "🔷", color: CLR.neutral,
    text: "≥3 Karten gleicher Farbe. Ab der 3. ×1,35, je weitere +0,20.",
    match: ["Farbblock", "Farbblöcke"] },
  treppe: { category: "form", label: "Treppe", icon: "🔷", color: CLR.neutral,
    text: "≥3 streng steigende Werte (Schritt ≤4). Ab der 3. ×1,35, je weitere +0,20.",
    match: ["Treppe", "Treppen"] },
  wechsel: { category: "form", label: "Wechsel", icon: "🔷", color: CLR.neutral,
    text: "≥3 im Zick-Zack (Nachbardifferenz ≥4). Ab der 3. ×1,40, je weitere +0,20.",
    match: ["Wechsel"] },
  anker: { category: "form", label: "Anker", icon: "⚓", color: CLR.neutral,
    text: `Eine einzelne Position zählt als aktive Formation (×${de(C.ANCHOR_FORM_FACTOR)}). Aus einem Eisanker oder dem Architekten. Höchstens ein Anker je Position.`,
    match: ["Anker"] },
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
    text: "Läuft eine Formation über eine Segmentgrenze hinweg, geben ihre Karten zusätzlich ×1,25 Punkte. Kommt vom Perk Segmentarbeit (Stufe IV).",
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
    text: "Eine Karte darf für eine Treppe im Wert abweichen (Spannweite je Stufe ±1 / ±2 / frei).",
    match: ["Bindeglied"] },
  formenergie: { category: "form", label: "Formations-Energie", icon: "⚡", color: CLR.neutral,
    text: `Das Tausch-Budget der Aufstellungsphase (${C.FORMATION_ENERGY} je Phase). Jeder Tausch zweier Karten kostet 1.`,
    match: ["Formations-Energie", "Tausch", "Tausche"] },

  /* ============ 4 · Archetypen — Allgemein ============ */
  archetyp: { category: "frak", group: "gen", label: "Archetyp", icon: "✦", color: CLR.lightning,
    text: `Eine Skill-Familie mit eigener Identität (Feuer · Blitz · Eis · Pflanze). Der erste Skill schaltet sie frei; bis zu ${C.MAX_ARCHETYPES} mischbar.`,
    match: ["Archetyp", "Archetypen", "Fraktion", "Fraktionen"] },
  skillslot: { category: "frak", group: "gen", label: "Skill-Slot", icon: "▭", color: CLR.lightning,
    text: `Du hältst höchstens ${C.SKILL_SLOTS} Skills gleichzeitig. Ist der Vorrat voll, ersetzt ein neuer einen alten.`,
    match: ["Skill-Slot", "Skill-Slots", "Slots"] },
  skillrunde: { category: "frak", group: "gen", label: "Skill-Runde", icon: "◷", color: CLR.lightning,
    text: `Zu festen Zeitpunkten im Lauf (erstmals Runde ${C.FIRST_SKILL_CYCLE}) bietet dir eine Runde Skills statt eines Perks — ${C.SKILLS_OFFERED} Skills zur Auswahl, alle 4 Archetypen dabei.`,
    match: ["Skill-Runde", "Skill-Runden"] },
  consume: { category: "frak", group: "gen", label: "Konsument", icon: "⊗", color: CLR.lightning,
    text: "Ein Skill, der eine angesammelte Ressource für einen starken Effekt verbraucht: Feuer verbrennt Hitze, Blitz verbraucht Ladung. Feuer-Hitze-Konsumenten sind kombinierbar (mehrere gleichzeitig erlaubt); von den Blitz-Ladungs-Konsumenten gilt höchstens einer gleichzeitig — ein zweiter ersetzt ihn.",
    match: ["Konsument", "Konsumenten", "Hitze-Konsument"] },
  legskill: { category: "frak", group: "gen", label: "Legendärer Skill", icon: "★", color: CLR.gold,
    text: "Eine seltene, besonders mächtige Skill-Stufe (mit ★ markiert). Ab Meisterrang V gibt es einen garantierten Legendär.",
    match: ["Legendärer Skill", "legendäre Skills"] },

  /* ============ 4 · Feuer ============ */
  heat: { category: "frak", group: "fire", label: "Hitze", icon: "🔥", color: CLR.fire,
    text: `Siege mit klarem Wertvorsprung heizen die Hitzeleiste (0–100 %) auf und geben Feuer-Score = (Vorsprung − ${C.FIRE_MARGIN_OFFSET}) × ${C.FIRE_SCORE_BASE} (+${C.FIRE_SCORE_PER_SKILL} je weiterem Feuer-Skill); klare Niederlagen kühlen sie ab.`,
    match: ["Hitze", "Hitzeleiste"] },
  glutdividende: { category: "frak", group: "fire", label: "Glutdividende", icon: "🔥", color: CLR.fire,
    text: "Zusätzliche Punkte bei jedem Feuer-Sieg, die direkt zählen (ohne Serie/Crit/Formation zu durchlaufen). Je mehr Hitze du hältst, desto mehr — bis zu einem Deckel. Stark im frühen Spiel.",
    match: ["Glutdividende"] },
  brand: { category: "frak", group: "fire", label: "Brandmal", icon: "🔥", color: CLR.fire,
    text: `Eine gebrandmarkte Gegnerkarte verliert Wert; jeder Brand gibt +${C.BRAND_ASH} Asche — Rohstoff der Feuer-Schmiede, und gehaltene Asche gibt zusätzlich kleinen Score je Feuer-Sieg.`,
    match: ["Brandmal", "Brand", "Brände", "gebrandmarkte"] },
  ash: { category: "frak", group: "fire", label: "Asche", icon: "🔥", color: CLR.fire,
    text: `Rohstoff der Feuer-Schmiede: Brände geben +${C.BRAND_ASH} Asche. Die Ascheschmiede verbraucht ${C.FORGE_COST} Asche je Schmiedung (+${C.FORGE_VALUE} Kartenwert); Damaststahl lässt sie nie verfallen. Gehaltene Asche gibt zusätzlich kleinen Score je Feuer-Sieg.`,
    match: ["Asche"] },
  forge: { category: "frak", group: "fire", label: "Schmieden", icon: "⚒", color: CLR.fire,
    text: `Asche wird zu dauerhaftem Kartenwert (Ascheschmiede: ${C.FORGE_COST} Asche → +${C.FORGE_VALUE} Wert auf die niedrigste Karte).`,
    match: ["Schmieden", "geschmiedet", "Schmiede", "Ascheschmiede"] },

  /* ============ 4 · Blitz ============ */
  charge: { category: "frak", group: "lightning", label: "Ladung", icon: "⚡", color: CLR.lightning,
    text: `Crits erzeugen Ladung (max ${C.LIGHTNING_MAX_CHARGE}). Bei voller Ladung lösen Blitz-Konsumenten ihren Effekt aus und verbrauchen sie.`,
    match: ["Ladung", "Ladungen"] },
  ionize: { category: "frak", group: "lightning", label: "Ionisierung", icon: "⚡", color: CLR.lightning,
    text: `Dauerhafte Kartenmarkierung: eine ionisierte Karte gibt bei Sieg +${C.ION_SCORE_PER_STACK} Score je Stapel und erhält danach +1 Stapel (max ${C.ION_MAX_STACKS}).`,
    match: ["Ionisierung", "ionisierte", "ionisierten", "ionisiert"] },
  kaskade: { category: "frak", group: "lightning", label: "Kaskade", icon: "🔗", color: CLR.lightning,
    text: "Ein Crit auf oder neben einer ionisierten Karte erzeugt zusätzliche Ladung — so lösen Treffer weitere Treffer aus.",
    match: ["Kaskade"] },

  /* ============ 4 · Eis ============ */
  freeze: { category: "frak", group: "ice", label: "Eingefroren", icon: "❄️", color: CLR.ice,
    text: `Eis friert eigene Karten dauerhaft ein (blau): ${C.ICE_BASE_FREEZE} beim ersten Eis-Skill, +1 je weiterem (Frostgriff: +${C.FROST_GRIP_BONUS}). Frostkarten sammeln Schichten (Dauerwert), helfen beim Bilden von Formationen und dürfen 1× je Aufstellungsphase kostenlos getauscht werden.`,
    match: ["Eingefroren", "Frost", "Frostkarte", "Frostkarten"] },
  frosttausch: { category: "frak", group: "ice", label: "Frosttausch", icon: "❄️", color: CLR.ice,
    text: "Der kostenlose Tausch einer Frostkarte in der Aufstellungsphase — meißelt Formationen, ohne Energie zu kosten.",
    match: ["Frosttausch", "Frosttausche"] },
  schichten: { category: "frak", group: "ice", label: "Schichten", icon: "❖", color: CLR.ice,
    text: `Eine Frostkarte sammelt Schichten. Jede Schicht gibt ihr +1 dauerhaften Kartenwert (bis ${C.ICE_LAYER_MAX}). Schichten gehen nie verloren. Nur legendäre Eis-Skills nutzen Schichten über ${C.ICE_LAYER_MAX} hinaus — für Extra-Punkte.`,
    match: ["Schichten", "Schicht"] },
  bank: { category: "frak", group: "ice", label: "Bank (Ablage)", icon: "❄️", color: CLR.ice,
    text: "Machst du einen kostenlosen Frosttausch nicht, wird er stattdessen in eine Schicht umgewandelt — so wachsen deine Karten auch ohne zu tauschen.",
    match: ["Bank", "Ablage", "banken", "bankt"] },
  eisanker: { category: "frak", group: "ice", label: "Eisanker", icon: "❄️", color: CLR.ice,
    text: `Eine Frostkarte zählt allein auf ihrem Platz als Formation (×${de(C.EISANKER_FACTOR)} Punkte) und bekommt dabei sicher eine Schicht dazu — auch wenn keine echte Formation entsteht.`,
    match: ["Eisanker"] },

  /* ============ 4 · Pflanze ============ */
  growth: { category: "frak", group: "plant", label: "Wachstum", icon: "🌿", color: CLR.plant,
    text: `Eigene Karten wachsen bei Siegen (nur steigend) — umso schneller, je mehr Pflanze-Skills du hältst (volles Tempo ab ${C.PLANT_GROWTH_SKILL_REF} Skills, darunter anteilig). Ab ${C.PLANT_GREEN_THRESHOLD} Wachstum wird eine Karte dauerhaft grün (reif).`,
    match: ["Wachstum"] },
  green: { category: "frak", group: "plant", label: "Grün (Reife)", icon: "🌿", color: CLR.plant,
    text: `Grüne Karten sind dauerhaft und bilden einen gemeinsamen Farbblock — je größer der Block, desto mehr Score. Grün ist Farbe, nicht Kraft; Kartenwert wächst nur über Wurzeln (Deckel ${C.PLANT_VALUE_CAP}).`,
    match: ["Grün", "grüne", "grünen", "grüner", "Reife", "reif"] },
  wurzeln: { category: "frak", group: "plant", label: "Wurzeln", icon: "🌿", color: CLR.plant,
    text: `Der einzige Weg, den Kartenwert grüner Karten zu erhöhen (bis zum Deckel ${C.PLANT_VALUE_CAP}). Ist der Deckel erreicht, geben weitere Wurzeln stattdessen Punkte.`,
    match: ["Wurzeln", "Wurzeln-Score"] },
  colonize: { category: "frak", group: "plant", label: "Kolonisieren / Ausläufer", icon: "🌿", color: CLR.plant,
    text: "Markiert gegnerische Karten grün (Ausläufer/Rhizom). Besiegst du eine kolonisierte Karte, erntest du Wachstum.",
    match: ["Kolonisieren", "kolonisierte", "Ausläufer"] },
  overgrowth: { category: "frak", group: "plant", label: "Überwucherung", icon: "🌿", color: CLR.plant,
    text: `Ist das Feld ≥${Math.round(C.UEBERWUCHERUNG_FIELD * 100)} % grün, werden alle Farbblöcke stärker (+${de(C.UEBERWUCHERUNG_FACTOR)} Faktor) und Blüte zählt doppelt.`,
    match: ["Überwucherung"] },
  eternalSpring: { category: "frak", group: "plant", label: "Ewiger Frühling", icon: "🌿", color: CLR.plant,
    text: `Farbblock zählt Grün schon ab ${C.EWIGER_FRUEHLING_FARBBLOCK} Karten und Überwucherung schon ab ${Math.round(C.EWIGER_FRUEHLING_FIELD * 100)} % Feld. Je größer dein ewig-grünes Feld, desto mehr Punkte zahlt jeder grüne Sieg direkt.`,
    match: ["Ewiger Frühling"] },

  /* ============ 5 · Werte · Stats ============ */
  st_critChance: { category: "stat", label: "Crit-Chance", icon: "▲", color: CLR.grund,
    text: `+${pct(C.STAT_CRIT_CHANCE_STEP)} Prozentpunkte Crit-Chance je Pick. Ungedeckelt — Überschuss über 100 % kann Blitz weiterverwerten.`,
    match: ["Crit-Chance"] },
  st_critMult: { category: "stat", label: "Crit-Multiplikator", icon: "▲", color: CLR.grund,
    text: `+${de(C.STAT_CRIT_MULT_STEP)}× Crit-Multiplikator je Pick (auf Basis ${de(C.CRIT_BASE_MULT)}×).`,
    match: ["Crit-Multiplikator"] },
  st_formMult: { category: "stat", label: "Formations-Multiplikator", icon: "▲", color: CLR.grund,
    text: `+${pct(C.STAT_FORM_MULT_STEP)} % Score je aktiver Formation an der Siegposition (mehrere gleichzeitige Formationen stapeln).`,
    match: ["Formations-Multiplikator", "Formations-Mult"] },
  st_streakMult: { category: "stat", label: "Serien-Multiplikator", icon: "▲", color: CLR.grund,
    text: `+${pct(C.STAT_STREAK_MULT_STEP)} % Score je aktuellem Serienpunkt (bis +${pct(C.STREAK_STAT_CAP)} %).`,
    match: ["Serien-Multiplikator", "Serien-Mult"] },

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
    text: "Normal · Ungewöhnlich · Selten · Rar — die vier Familien-Stufen, farblich markiert (grau/grün/blau/lila).",
    match: ["Rarität", "Ungewöhnlich"] },
  legendaer: { category: "perk", label: "Legendär", icon: "★", color: CLR.gold,
    text: "Ein mächtiger Effekt mit Nachteil, außerhalb des Stufen-Systems — eigener Wurf, goldener Rahmen, höchstens einer je Angebot.",
    match: ["Legendär", "Legendäre", "legendäres", "Legendaries"] },
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
    text: "Ein platziertes Bauwerk. Es bufft die Karte, die auf seiner Position im Stich steht — überlappt nie mit anderen.",
    match: ["Gebäude"] },
  baufeld: { category: "arch", label: "Baufeld (Deckel)", icon: "▧", color: CLR.arch,
    text: "Die begrenzte Zahl belegbarer Brettzellen. Die Knappheit macht das Platzieren zur Entscheidung (Meisterränge heben den Deckel).",
    match: ["Baufeld"] },
  baukat: { category: "arch", label: "Bau-Kategorien", icon: "◧", color: CLR.arch,
    text: "Drei Effekt-Arten: Wert (Tragwerk, +Stichwert) · Punkte (Handelsbau, +Score) · Formation (Sakralbau, biegt die Erkennung).",
    match: ["Bau-Kategorien"] },
  struktur: { category: "arch", label: "Struktur-Boni", icon: "✶", color: CLR.arch,
    text: "Eine vollständig bebaute Zeile, Spalte oder Diagonale gibt einen Multiplikator; sie stapeln multiplikativ.",
    match: ["Struktur-Boni", "Struktur", "Struktur-Kombi"] },
  aufruesten: { category: "arch", label: "Aufrüsten", icon: "⇧", color: CLR.arch,
    text: "Ein bestehendes Gebäude um +1 Stufe erhöhen statt neu zu bauen (Legendäre haben keine Stufen).",
    match: ["Aufrüsten", "Ausbauen"] },
  versetzen: { category: "arch", label: "Versetzen", icon: "⇄", color: CLR.arch,
    text: "Ein bestehendes Gebäude auf dem Brett verschieben oder drehen (eigene Phase nach dem Bauen).",
    match: ["Versetzen"] },

  /* ============ 8 · Fortschritt & Meta ============ */
  meisterrang: { category: "meta", label: "Meisterrang", icon: "🏅", color: CLR.meta,
    text: "Laufübergreifende Stufe (Meister I–V), freigeschaltet über deinen besten Einzel-Score (5/10/15/25/50 Mio.). Bringt dauerhafte Belohnungen.",
    match: ["Meisterrang", "Meisterränge", "Rang", "Ränge"] },
  meisterlauf: { category: "meta", label: "Meister-Lauf", icon: "🎖", color: CLR.meta,
    text: "Ein Lauf auf gewähltem Rang. Nur Meister-Läufe zählen für die Rang-Leiter und schalten frei; normale Läufe nicht.",
    match: ["Meister-Lauf", "Meister-Läufe", "Meister Run"] },
  grossmeister: { category: "meta", label: "Großmeister", icon: "👑", color: CLR.meta,
    text: "Fünf Stufen über Meister V — eskalierende Schwierigkeit (mitwachsender Gegner), aber KEINE neuen Belohnungen. Ziel bleibt 50 Mio.",
    match: ["Großmeister"] },
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
    text: "Aufteilung deines Scores auf Formationen / Crits / Übrige — zeigt, woher dein Build seine Punkte zieht.",
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

// Alle Einträge als flache Liste MIT id (für das Overlay). Reihenfolge = Definitionsreihenfolge (nach Kategorie).
export function glossaryEntries() {
  return Object.entries(GLOSSARY).map(([id, e]) => ({ id, ...e }));
}

/* ---- Auto-Fett: jede Glossar-Wortform in einem Beschreibungstext markieren ----
   Formen (label + match) werden EINMAL zu einer Regex verdichtet (längste zuerst → „Crit-Multiplikator"
   schlägt „Crit"). Grenzen schließen Buchstaben/Ziffern/Bindestrich aus → keine Treffer INNERHALB von Wörtern.
   Rein (kein React) → in glossary.test.js unit-getestet; die UI (GlossaryText) rendert die Teile nur fett,
   NICHT klickbar (bewusst: die Auswahlkarten sind ganzflächig klickbar). */
const _forms = [];
for (const e of Object.values(GLOSSARY)) for (const f of (e.match || [e.label])) _forms.push(f);
const _uniqForms = [...new Set(_forms)].sort((a, b) => b.length - a.length);
const _esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const _RE = new RegExp("(?<![\\p{L}\\p{N}\\-])(?:" + _uniqForms.map(_esc).join("|") + ")(?![\\p{L}\\p{N}\\-])", "gu");

// Zerlegt `text` in Teile { text, bold } — bold=true für Glossar-Wortformen. Leerer/kein Text → [].
export function tokenizeGlossary(text) {
  if (!text) return [];
  const out = [];
  let last = 0, m;
  _RE.lastIndex = 0;
  while ((m = _RE.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[0], bold: true });
    last = m.index + m[0].length;
    if (_RE.lastIndex === m.index) _RE.lastIndex++; // Schutz gegen Nulllängen-Match (keine hier, aber sicher)
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}
