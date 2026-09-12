import * as C from "../constants.js";
import { SKILL_DEFS, isLegendarySkill, boostedTier } from "../skills.js";

/* ============================================================
   PFLANZE — Fraktionsmodul (exp skill rework, docs/skill-rework.md §6). Reine Logik: kein React, kein Math.random.

   Passiv „Wachstum" (§6.2): Wachstum liegt JE KARTE (state.growth[card.id]) und fällt nie. Ein Sieg gibt der Siegkarte
   PLANT_GROWTH_WIN, dazu PLANT_GROWTH_PER_FORMATION je Formation an ihrer Position — gemessen wird nicht, *ob* sie
   gewonnen hat, sondern *wie gut sie steht*. Ab PLANT_GREEN_THRESHOLD ist die Karte grün, ab PLANT_BLOOM_THRESHOLD
   blühend; beide Zustände sind in die Karte gebacken (card.green / card.bloom), damit Formations-Engine, Anzeige und
   Engine dieselbe Quelle lesen. Grün ist eine FARBE („G", formations.js) — kein Kraftzuwachs, kein Kartenwert.
   Blühend trägt den Score: ein Sieg mit einer blühenden Karte gibt PLANT_BLOOM_SCORE_PER_GREEN Basis-Score je grüner
   Karte in ihren Formationen. Kein Direkt-Score, kein eigener Multiplikator, kein Griff ins Gegnerdeck.

   „Formation" heißt in dieser Fraktion überall dasselbe: ein echter Lauf an der Position — Wiederholung, Farbblock,
   Treppe oder Wechsel, also genau die Einträge, die `computeFormations` mit `members` versieht. Anker, Nachhall,
   Formationskern und Grenzbonus sind Meta-Faktoren und zählen hier nicht mit; nur benachbarte Karten in einem Muster.

   Die 15 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `plantParam`; die drei Legendären haben keine Stufe und hängen an ihrer ID. Vier Skills (Spalier, Wildwuchs, Lücke,
   Überwucherung) und zwei Legendäre (Baumreihe, Wurzelgeflecht) ändern die ERKENNUNG statt Score zu addieren — ihre
   Mechanik steht in formations.js und liest von hier nur die Kennwerte. Alle Übergänge sind immutabel.
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul, Engine, Formations-Engine und Tests.
// (§6.7: die alten Plätze SK_PLANT_02 Wurzeltiefe und SK_PLANT_18 Kernholz sind mit der Wertachse gestrichen.)
export const P = Object.freeze({
  // Wachstum
  AUSSAAT: "SK_PLANT_05", RANKEN: "SK_PLANT_09", SETZLINGSBEET: "SK_PLANT_07", LICHTUNG: "SK_PLANT_12", ZAEHER_HALM: "SK_PLANT_08",
  // Erkennung und Formations-Faktor (Mechanik in formations.js) — §6.26: Dickicht und Verwachsung greifen den
  // Faktor selbst an, Spalier und Wildwuchs bleiben Erkennungshebel.
  SPALIER: "SK_PLANT_03", WILDWUCHS: "SK_PLANT_06", DICKICHT: "SK_PLANT_15", VERWACHSUNG: "SK_PLANT_14",
  // Score aus grünen Formationen
  BLAETTERDACH: "SK_PLANT_13", RANKGERUEST: "SK_PLANT_16", HECKE: "SK_PLANT_10", WINDUNG: "SK_PLANT_11", JAHRESRINGE: "SK_PLANT_04",
  // Kombination
  BLUETENLESE: "SK_PLANT_17",
  // Legendäre (§6.11, Owner: drei je Fraktion — je eine Achse: Multiplikator, Dichte, Zielbild)
  WURZELGEFLECHT: "SK_PLANT_L02", BAUMREIHE: "SK_PLANT_L03", EWIGER_FRUEHLING: "SK_PLANT_L04",
});

// Welcher Score-Skill liest welchen Formationstyp (§6.7: je Formationstyp einer).
export const SCORE_BY_TYPE = Object.freeze({
  farbblock: P.BLAETTERDACH, treppe: P.RANKGERUEST, wiederholung: P.HECKE, wechsel: P.WINDUNG,
});

const held = (skills, id) => (skills || []).includes(id);
export const hasBaumreihe       = (skills) => held(skills, P.BAUMREIHE);
export const hasWurzelgeflecht   = (skills) => held(skills, P.WURZELGEFLECHT);
export const hasEwigerFruehling = (skills) => held(skills, P.EWIGER_FRUEHLING);

// Wirksame Stufe eines gehaltenen Pflanzen-Skills (gewürfelte Stufe, Normal ohne Eintrag); null für Legendäre und
// nicht gehaltene Skills.
export function plantTier(skills, skillTiers, id) {
  if (!held(skills, id) || isLegendarySkill(id)) return null;
  const base = Number.isInteger(skillTiers?.[id]) ? skillTiers[id] : 0;
  return boostedTier(skills, base); // §7.39: Hochspannung hebt jede Fraktion, nicht mehr nur Blitz
}

// Kennwert eines gehaltenen Skills auf seiner Stufe; undefined, wenn der Skill nicht gehalten wird oder die Zeile den
// Schlüssel nicht kennt (die Aufrufer prüfen mit `== null`).
export function plantParam(skills, skillTiers, id, key) {
  const tier = plantTier(skills, skillTiers, id);
  if (tier == null) return undefined;
  const row = SKILL_DEFS[id]?.tiers?.[tier];
  return row ? row[key] : undefined;
}

/* ---- Zustände: grau → grün → blühend. Einzige Quelle der Schwellen. ---- */
export const isGreen = (growth) => (growth || 0) >= C.PLANT_GREEN_THRESHOLD;
export const isBloom = (growth) => (growth || 0) >= C.PLANT_BLOOM_THRESHOLD;
// Zustand einer Karte für Anzeige und Tests: "grey" | "green" | "bloom".
export const plantStage = (growth) => (isBloom(growth) ? "bloom" : isGreen(growth) ? "green" : "grey");
export const greenCount = (deck) => (deck || []).filter((c) => c.green).length;
export const bloomCount = (deck) => (deck || []).filter((c) => c.bloom).length;
/* Das Zielbild des Ewigen Frühlings: der Anteil grüner Karten im Feld deckt EWIGER_FRUEHLING_GREEN_FRAC (1 = jede
   Karte grün). Der Regler (§6.12) ist die Größe des Legendären, nicht seine Mechanik. */
export const fullGreen = (deck) => (deck || []).length > 0
  && greenCount(deck) >= Math.ceil(deck.length * C.EWIGER_FRUEHLING_GREEN_FRAC - 1e-9);

/* Ewiger Frühling (L, §6.5): deckt das Feld das Zielbild, sind ALLE Karten blühend — der Zustand wird gebacken wie
   jeder andere (er kann nicht wieder verschwinden, Grün fällt nie). Gibt das Deck unverändert zurück, wenn nichts
   zu tun ist. */
export function bloomAllIfFullGreen(skills, deck) {
  if (!hasEwigerFruehling(skills) || !fullGreen(deck) || deck.every((c) => c.bloom)) return deck;
  return deck.map((c) => (c.bloom ? c : { ...c, bloom: true }));
}

/* Die Formationen an einer Position, die für die Pflanze zählen: die echten Läufe (mit `members`), nicht die
   Meta-Faktoren. `plantFormCount` ist die Zahl, die das Wachstum liest. */
export const plantFormations = (posForm) => (posForm?.formations || []).filter((f) => Array.isArray(f.members));
export const plantFormCount = (posForm) => plantFormations(posForm).length;
/* §6.29 (Owner): Formationen, die Basis-Score zahlen — alle außer den `scoreless` markierten. Bisher gibt es genau
   eine: die Baumreihe. Sie hält bis zu vierzig blühende Karten, und Hecke wie Blüte-Passiv zahlen JE MITGLIED; damit
   lief der Multiplikator-Legendäre über die Dichte-Achse des Wurzelgeflechts und maß mono +1079 %, das Doppelte des
   nächsten Legendären. Multiplikator, Formationszahl und Wachstum bleiben ihr — nur der Score je Karte nicht. */
export const plantScoreFormations = (posForm) => plantFormations(posForm).filter((f) => !f.scoreless);

/* Blühgewicht einer Karte (§6.20, Owner-Variante B): WIE VIELE grüne Karten sie in einer Formation zählt.
   Grau 0 · grün 1 · blühend PLANT_BLOOM_WEIGHT, +1 je PLANT_BLOOM_WEIGHT_PER_GROWTH Wachstum über der Blüh-Schwelle.
   Das Gewicht gehört der KARTE — jeder Zähler grüner Karten liest es, die Score-Skills bleiben deshalb einzeilig. */
export function greenWeight(card, growth = 0) {
  if (!card || !card.green) return 0;
  if (!card.bloom) return 1;
  const over = Math.max(0, growth - C.PLANT_BLOOM_THRESHOLD);
  return C.PLANT_BLOOM_WEIGHT + Math.floor(over / C.PLANT_BLOOM_WEIGHT_PER_GROWTH);
}

/* Grüne Karten in den Formationen einer Position, gewichtet — jede Karte höchstens einmal, auch wenn sie in mehreren
   Läufen der Position liegt. `cardAt(pos)` liefert die Karte an einer Position der Ziehreihenfolge (Engine:
   deck[playerOrder[p]]), `growthOf(id)` ihr Wachstum. Die Mitglieder stammen aus der Formations-Berechnung des
   Durchlaufbeginns, die Zustände aus dem aktuellen Deck: eine Karte, die mitten im Durchlauf grün wird, zählt sofort
   mit, die Läufe selbst wandern erst zum nächsten Durchlauf. */
export function formationGreenCount(posForm, cardAt, growthOf = () => 0) {
  const seen = new Set();
  let n = 0;
  for (const f of plantScoreFormations(posForm)) for (const p of f.members) {
    if (seen.has(p)) continue;
    seen.add(p);
    const c = cardAt(p);
    if (c) n += greenWeight(c, growthOf(c.id));
  }
  return n;
}

/* Wachstum eines Siegs für die Siegkarte: Passiv-Satz + Satz je Formation an ihrer Position. Lichtung legt auf einen
   Formations-Sieg `extra` drauf (Episch je Formation statt einmal). `formCount` = plantFormCount(posForm). */
export function growthOnWin(skills, skillTiers, { formCount = 0 } = {}) {
  const forms = Math.max(0, formCount);
  let g = C.PLANT_GROWTH_WIN + forms * C.PLANT_GROWTH_PER_FORMATION;
  const extra = plantParam(skills, skillTiers, P.LICHTUNG, "extra");
  if (extra && forms > 0) g += plantParam(skills, skillTiers, P.LICHTUNG, "perFormation") ? extra * forms : extra;
  return g;
}

/* Wachstum eintragen (immutabel) und die Kartenzustände nachziehen. `gains` = [{ id, amount }] — mehrere Quellen eines
   Stichs kommen in EINEM Aufruf, damit der Deck-Durchlauf einmal passiert. Gibt { growth, deck, total, becameGreen }
   zurück; `becameGreen` sind die Karten-IDs, die in diesem Aufruf die Grün-Schwelle überschritten haben (Ranken liest sie). */
export function applyGrowth(growth, deck, gains) {
  const list = (gains || []).filter((g) => g && g.id != null && g.amount > 0);
  if (!list.length) return { growth, deck, total: 0, becameGreen: [] };
  const next = { ...growth };
  const becameGreen = [], becameBloom = [];
  let total = 0;
  for (const { id, amount } of list) {
    const before = next[id] || 0;
    const after = before + amount;
    next[id] = after;
    total += amount;
    if (!isGreen(before) && isGreen(after)) becameGreen.push(id);
    if (!isBloom(before) && isBloom(after)) becameBloom.push(id);
  }
  let d = deck;
  if (becameGreen.length || becameBloom.length) {
    const g = new Set(becameGreen), b = new Set(becameBloom);
    d = deck.map((c) => (g.has(c.id) || b.has(c.id)
      ? { ...c, green: c.green || g.has(c.id), bloom: c.bloom || b.has(c.id) }
      : c));
  }
  return { growth: next, deck: d, total, becameGreen };
}

// Position → Karte, für die Nachbarschaft der Aussaat und die Formations-Mitglieder.
// (§6.26: die ID→Position-Karte ist mit der alten Ranken-Kette weggefallen.)
const cardAtOf = (deck, order) => (p) => (p >= 0 && p < order.length ? deck[order[p]] : null);

/* Ranken (§6.26, Vorlage: der gestrichene Ausläufer SK_PLANT_15 alt): ein Sieg mit einer GRÜNEN Karte rankt in die
   geschlagene Gegnerkarte — liegen dort schon Ranken, wird sie stattdessen GEERNTET: die Siegkarte wächst um `growth`,
   und die Ranken sind verbraucht. Episch berankt beim Ernten die Nachbarn der geernteten Gegnerkarte.

   Zwei Entscheidungen, die der Skill trägt: die Ernte geht an die SIEGKARTE (Wachstum auf Karten, die nicht gewinnen,
   zahlt nicht — der Grund, aus dem Ranken vorher tot war), und die Ernte VERBRAUCHT die Ranken. Ohne den Verbrauch
   wiederholte sich der Fehler der Feuerwalze (§7.27): ab der Laufmitte ist jede Gegnerkarte einmal geschlagen, und
   der Skill wäre ein bedingungsloses „+N Wachstum je Sieg". So bleibt die Knappheit strukturell.

   `tendrils` ist der Lauf-Zustand je Gegnerkarten-id (wie brandActive). Rein und immutabel. */
export function plantOnTendril(growth, deck, skills, skillTiers,
  { tendrils = {}, cardId = null, oppCardId = null, oppNeighborIds = [] } = {}) {
  const step = plantParam(skills, skillTiers, P.RANKEN, "growth");
  if (!step || cardId == null || oppCardId == null) return { growth, deck, tendrils, grown: 0 };
  if (tendrils[oppCardId]) {
    const next = { ...tendrils };
    delete next[oppCardId];
    if (plantParam(skills, skillTiers, P.RANKEN, "neighbors")) for (const id of oppNeighborIds) if (id != null) next[id] = true;
    const r = applyGrowth(growth, deck, [{ id: cardId, amount: step }]);
    return { growth: r.growth, deck: bloomAllIfFullGreen(skills, r.deck), tendrils: next, grown: r.total };
  }
  const card = deck.find((c) => c.id === cardId);
  if (!card || !card.green) return { growth, deck, tendrils, grown: 0 };
  return { growth, deck, tendrils: { ...tendrils, [oppCardId]: true }, grown: 0 };
}

/* Score aus grünen Formationen (§6.8): je Formationstyp ein Skill, der Satz gilt je grüner Karte in der Formation an
   der Siegposition (Episch: blühende Karten zählen doppelt). Voraussetzung ist eine grüne Siegkarte — „ein Sieg in
   einem grünen Farbblock" ist der Sieg einer grünen Karte in einem Lauf dieses Typs. Dazu Jahresringe (Tiefe der
   Siegkarte, kein Formationsbezug). Gibt den Basis-Score zurück. */
function formationScore(skills, skillTiers, { card, posForm, cardAt, growth = 0, growthOf = () => 0 }) {
  let flat = 0;
  if (card && card.green) {
    for (const f of plantScoreFormations(posForm)) {
      const id = SCORE_BY_TYPE[f.type];
      const rate = id ? plantParam(skills, skillTiers, id, "score") : undefined;
      if (!rate) continue;
      // §6.20: gezählt wird das Blühgewicht der Karten — die Regel steht im Passiv, nicht im Skill.
      let n = 0;
      for (const p of f.members) { const c = cardAt(p); n += greenWeight(c, c ? growthOf(c.id) : 0); }
      flat += n * rate;
    }
  }
  const ring = plantParam(skills, skillTiers, P.JAHRESRINGE, "score");
  if (ring) {
    const per = plantParam(skills, skillTiers, P.JAHRESRINGE, "per") || 10;
    // Episch: Wachstum über der Blüh-Schwelle zählt doppelt.
    const eff = growth + (plantParam(skills, skillTiers, P.JAHRESRINGE, "overDouble") ? Math.max(0, growth - C.PLANT_BLOOM_THRESHOLD) : 0);
    flat += Math.floor(eff / per) * ring;
  }
  return flat;
}

// Blütenlese (§6.8): ein Sieg in einer REIN grünen Formation zahlt einmal und lässt alle Karten darin wachsen.
function bluetenlese(skills, skillTiers, { posForm, cardAt }) {
  const score = plantParam(skills, skillTiers, P.BLUETENLESE, "score");
  if (!score) return { flat: 0, gains: [] };
  const step = plantParam(skills, skillTiers, P.BLUETENLESE, "growth") || 0;
  const seen = new Set();
  let any = false;
  for (const f of plantScoreFormations(posForm)) {
    if (!f.members.every((p) => { const c = cardAt(p); return c && c.green; })) continue;
    any = true;
    for (const p of f.members) { const c = cardAt(p); if (c) seen.add(c.id); }
  }
  if (!any) return { flat: 0, gains: [] };
  return { flat: score, gains: step ? [...seen].map((id) => ({ id, amount: step })) : [] };
}

/* Ewiger Frühling (L, §6.13, Owner): blühende Karten kämpfen mit +EWIGER_FRUEHLING_BLOOM_VALUE Wert. Der einzige
   Wert-Hebel der Fraktion — ihre 15 Skills sind Wachstum, Basis-Score und Erkennung, keiner macht eine Karte stärker.
   Er hängt am Zustand, nicht am vollgrünen Feld: er zahlt ab der ersten blühenden Karte. 0 ohne den Skill. */
export const plantValueBonus = (skills, card) =>
  (hasEwigerFruehling(skills) && card && card.bloom ? C.EWIGER_FRUEHLING_BLOOM_VALUE : 0);

/* Ewiger Frühling, zweite Hälfte (L, §6.15, Owner): gewinnt eine blühende Karte, zählt der Stich +FORM_MULT je
   aktiver Formation an ihrer Position — der einzige MULTIPLIKATOR der Fraktion (Wachstum, Basis-Score und Erkennung
   sind die anderen drei Achsen). Ohne Formation, ohne Blüte oder ohne den Skill: 1. */
export function plantFormMult(skills, card, posForm) {
  if (!hasEwigerFruehling(skills) || !card || !card.bloom) return 1;
  return 1 + plantFormCount(posForm) * C.EWIGER_FRUEHLING_FORM_MULT;
}

/* Sieg: Wachstum (Passiv, Aussaat, Ranken, Blütenlese), die Zustandswechsel und der Basis-Score (Passiv-Blüte,
   Score-Skills). `pos` = Position der Siegkarte in der Ziehreihenfolge, `order` = playerOrder, `posForm` = ihr
   Formations-Eintrag. Reihenfolge: erst wachsen, dann werten — der Sieg, der eine Karte über eine Schwelle hebt,
   zahlt schon in seinem eigenen Stich. Gibt { growth, deck, flat, grown } zurück. */
export function plantOnWin(growth, deck, skills, skillTiers, { pos = -1, order = [], posForm = null, cardId = null } = {}) {
  let g = growth, d = deck, grown = 0;
  const gain = (arr) => { const r = applyGrowth(g, d, arr); g = r.growth; d = r.deck; grown += r.total; return r.becameGreen; };
  const at = () => cardAtOf(d, order);
  const before = cardId != null ? d.find((c) => c.id === cardId) : null;
  const formCount = plantFormCount(posForm);
  // 1. Passiv + Aussaat (Aussaat liest den Zustand VOR dem Sieg: „gewinnt eine grüne Karte").
  const gains = [];
  if (cardId != null) gains.push({ id: cardId, amount: growthOnWin(skills, skillTiers, { formCount }) });
  const sow = plantParam(skills, skillTiers, P.AUSSAAT, "growth");
  if (sow && before && before.green && pos >= 0) {
    const second = plantParam(skills, skillTiers, P.AUSSAAT, "second") || 0;
    const cardAt = at();
    for (const dir of [-1, 1]) {
      const n1 = cardAt(pos + dir), n2 = cardAt(pos + 2 * dir);
      if (n1) gains.push({ id: n1.id, amount: sow });
      if (second && n2) gains.push({ id: n2.id, amount: second });
    }
  }
  gain(gains);
  // 2. Blütenlese: Score und Wachstum aus einer rein grünen Formation.
  const lese = bluetenlese(skills, skillTiers, { posForm, cardAt: at() });
  if (lese.gains.length) gain(lese.gains);
  // (§6.26: Ranken hängt nicht mehr am Reifemoment — es greift ins Gegnerdeck, plantOnTendril, von der Engine gerufen.)
  d = bloomAllIfFullGreen(skills, d);
  // 4. Score: Passiv-Blüte + Score-Skills, beides auf dem Stand NACH dem Wachstum.
  const card = cardId != null ? d.find((c) => c.id === cardId) : null;
  const cardAt = cardAtOf(d, order);
  let flat = lese.flat;
  const growthOf = (id) => g[id] || 0;
  if (card && card.bloom) flat += formationGreenCount(posForm, cardAt, growthOf) * C.PLANT_BLOOM_SCORE_PER_GREEN;
  flat += formationScore(skills, skillTiers, { card, posForm, cardAt, growth: g[cardId] || 0, growthOf });
  return { growth: g, deck: d, flat: Math.round(flat), grown };
}

/* (§6.26: Lücke ist mit dem Dickicht gestrichen — mit ihr der `gapped`-Weg, über den ihr Episch die übersprungenen
   Karten wachsen ließ. Das Dickicht fasst kein Wachstum an, es hebt den Faktor des grünen Farbblocks.) */

/* Niederlage: nur Zäher Halm (§6.26) — die verlierende Karte wächst trotzdem, unabhängig von ihrem Zustand
   (die Grau-Schranke ist mit §6.26 gefallen). Episch legt das Formations-Wachstum drauf, das ein Sieg an dieser
   Position gegeben hätte — die einzige Achse, über die Wachstum auf einer nicht-siegenden Karte zahlt.
   Sonst gibt eine Niederlage nichts. */
export function plantOnLoss(growth, deck, skills, skillTiers, { cardId = null, posForm = null } = {}) {
  if (cardId == null) return { growth, deck, grown: 0 };
  const card = deck.find((c) => c.id === cardId);
  if (!card) return { growth, deck, grown: 0 };
  let amount = plantParam(skills, skillTiers, P.ZAEHER_HALM, "growth") || 0;
  if (!amount) return { growth, deck, grown: 0 };
  if (plantParam(skills, skillTiers, P.ZAEHER_HALM, "perFormation")) amount += plantFormCount(posForm) * C.PLANT_GROWTH_PER_FORMATION;
  const r = applyGrowth(growth, deck, [{ id: cardId, amount }]);
  return { growth: r.growth, deck: bloomAllIfFullGreen(skills, r.deck), grown: r.total };
}

// (§6.11: der Weltenbaum ist gestrichen — eine reine Wachstums-Rampe am Durchlaufende ohne eigene Auszahlung. Damit
//  hat die Fraktion keinen Durchlaufende-Haken mehr.)

/* Der Fraktions-Kaltstart (unten, greenSuitGains) hat mit §6.26 die Kaltstart-Rolle des Setzlingsbeets übernommen —
   und stärker, weil er die zehn grünen Karten gleich über die Grün-Schwelle hebt. */
/* Kaltstart der FRAKTION (Owner 2026-09-08): sobald die Pflanze steht, sind die zehn GRÜNEN Karten des
   Decks grün — mit genau dem Wachstum, das dafür nötig ist, keines mehr. Die eigene Farbe ist gewachsen,
   der Rest muss es sich verdienen.

   Warum es das braucht: Grün beginnt bei PLANT_GREEN_THRESHOLD Wachstum, und das dauert. Gemessen über
   zwölf Läufe erschien die erste grüne Karte erst in Durchlauf 10–16 von 50 — bis dahin lagen alle Hebel,
   die auf Grün lesen (Spalier, Blütenlese, Blätterdach, Rankgerüst, der Blüte-Score), tot im Build. Ein
   Skill, der die erste Hälfte des Laufs nichts tut, ist kein Skill, sondern eine Wette.

   Nur ANHEBEN, nie senken: eine Karte, die schon über der Schwelle steht, bleibt, wo sie ist — der
   Kaltstart gibt einen Boden, er setzt keinen Wert. Läuft über `applyGrowth` wie jeder andere Zuwachs,
   damit die Karten ihr `green`-Flag auf demselben Weg bekommen. */
export const GREEN_SUIT = "G";

export function greenSuitGains(deck = [], growth = {}) {
  const out = [];
  for (const c of deck || []) {
    if (!c || c.suit !== GREEN_SUIT) continue;
    const have = (growth || {})[c.id] || 0;
    if (have < C.PLANT_GREEN_THRESHOLD) out.push({ id: c.id, amount: C.PLANT_GREEN_THRESHOLD - have });
  }
  return out;
}

/* Setzlingsbeet (§6.26): das Beet ist das Segment mit den meisten grünen Karten; seine Karten wachsen am Ende jedes
   Durchlaufs, Episch wächst jedes Segment. Ein Segment ist die Einheit, in der Formationen entstehen — die Karten
   wachsen also als Gruppe, die zusammen in einer Formation steht und als Mitläufer zählt. Das ist der einzige
   Ausgang, über den Wachstum auf einer nicht-siegenden Karte zahlt (§6.26). Gleichstand: das vordere Segment. */
export function beetGains(skills, skillTiers, { order = [], deck = [], segmentSize = 5 } = {}) {
  const step = plantParam(skills, skillTiers, P.SETZLINGSBEET, "growth");
  if (!step) return [];
  const segs = [];
  for (let s = 0; s * segmentSize < order.length; s++) {
    const seg = [];
    for (let p = s * segmentSize; p < (s + 1) * segmentSize && p < order.length; p++) if (deck[order[p]]) seg.push(deck[order[p]]);
    if (seg.length) segs.push(seg);
  }
  if (!segs.length) return [];
  const chosen = plantParam(skills, skillTiers, P.SETZLINGSBEET, "allSegments")
    ? segs
    : [segs.reduce((best, cur) => (greenCount(cur) > greenCount(best) ? cur : best), segs[0])];
  return chosen.flatMap((seg) => seg.map((c) => ({ id: c.id, amount: step })));
}
