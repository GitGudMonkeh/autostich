import * as C from "../constants.js";
import { SKILL_DEFS, TIER_EPIC, isLegendarySkill } from "../skills.js";

/* ============================================================
   FEUER — Fraktionsmodul (exp skill rework, docs/skill-rework.md §4). Reine Logik: kein React, kein Math.random.

   Passiv (§4.2): Siege ab HEAT_MIN_MARGIN Vorsprung geben (Vorsprung − HEAT_MARGIN_OFFSET) × HEAT_PER_POINT Hitze,
   linear ohne Knie; Niederlagen kühlen HEAT_LOSS flach. Je 10 % gehaltener Hitze +HEAT_MULT_PER_10 Score als eigener
   Faktor im Multiplikator-Stack (heatMult). Leiste 0–HEAT_MAX, mit Weißglut bis WEISSGLUT_HEAT_MAX. Kein Feuer-Score,
   kein Direkt-Score, keine Asche, keine Abhängigkeit von der Zahl gehaltener Feuer-Skills.

   Die 14 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `fireParam`; die vier Legendären haben keine Stufe und hängen an ihrer ID. Alle Übergänge sind immutabel.
   Hitze-Tore („ab X % Hitze") lesen die Hitze NACH dem Gewinn des Siegs und VOR dem Verbrauch (Feuerlinie-Kosten); der
   Hitze-Multiplikator eines Siegs liest dieselbe Größe. Zustands-Boni (Klinge, Feuerwalze) lesen die Hitze vor dem Stich.
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul, Engine und Tests.
export const F = Object.freeze({ // 01: Feuerlinie ersetzt Glut (§7.23)
  FEUERLINIE: "SK_FIRE_01", ZUNDER: "SK_FIRE_02", FEUERSTURM: "SK_FIRE_03", GLUTBETT: "SK_FIRE_04", RUECKZUENDUNG: "SK_FIRE_05",
  KLINGE: "SK_FIRE_06", WEISSGLUT: "SK_FIRE_07", BRANDSCHNEISE: "SK_FIRE_08", VERBRENNUNG: "SK_FIRE_09", // 08: Brandschneise ersetzt Feuerwalze (§7.27)
  SCHMELZPUNKT: "SK_FIRE_12", BRANDMAL: "SK_FIRE_13", LAUFFEUER: "SK_FIRE_14", // SK_FIRE_11 Flächenbrand: gestrichen (§7.16)
  SCHMIEDE: "SK_FIRE_15", GLUTSTAHL: "SK_FIRE_16",
  SONNENKERN: "SK_FIRE_L01", EWIGE_GLUT: "SK_FIRE_L02", SONNENZORN: "SK_FIRE_L03", // L02: Ewige Glut ersetzt Phönixfeuer (§7.21); L04 Damaststahl gestrichen (§6.11, Owner: drei je Fraktion)
});

/* Frischer Hitze-Substate — inaktiv; der erste Feuer-Skill aktiviert ihn (Reducer). value = Hitze (0..max, auch mit
   Nachkommastellen), peak = höchste je erreichte Hitze (Sonnenzorn, Ewige Glut), lastLossDeficit = Rückstand der letzten
   Niederlage (Rückzündung), emberMult = dauerhafte Rampe der Ewigen Glut auf den Hitze-Multiplikator, bedFloor =
   wie weit Glutbetts Boden über seiner Stufe liegt (§6.24, wächst über den Lauf), lanes/laneWins =
   Brandschneise (§7.27: die Schnitte der letzten Durchläufe, neuester zuerst / die Siege des laufenden Durchlaufs). */
export function initHeat() {
  return { active: false, value: 0, max: C.HEAT_MAX, peak: 0, lastLossDeficit: 0, emberMult: 0, bedFloor: 0, lanes: [], laneWins: [] };
}

/* Glutbetts wirksamer Boden: die Schwelle der Stufe plus das, was der Boden über den Lauf gewachsen ist (§6.24).
   0 ohne den Skill und auf Episch (dort kühlt nichts, ein Boden wäre bedeutungslos). Nie über die Leiste hinaus. */
export function glutbettFloor(heat, skills, skillTiers) {
  if (fireParam(skills, skillTiers, F.GLUTBETT, "noCool")) return 0;
  const base = fireParam(skills, skillTiers, F.GLUTBETT, "floor");
  if (base == null) return 0;
  return Math.min(heat?.max || C.HEAT_MAX, base + (heat?.bedFloor || 0));
}

const held = (skills, id) => (skills || []).includes(id);
export const hasSonnenkern   = (skills) => held(skills, F.SONNENKERN);
export const hasEwigeGlut    = (skills) => held(skills, F.EWIGE_GLUT);
export const hasSonnenzorn   = (skills) => held(skills, F.SONNENZORN);

// Leistenlänge des Builds: Weißglut verlängert die Leiste auf WEISSGLUT_HEAT_MAX.
export const heatMaxFor = (skills) => (held(skills, F.WEISSGLUT) ? C.WEISSGLUT_HEAT_MAX : C.HEAT_MAX);

// Wirksame Stufe eines gehaltenen Feuer-Skills (gewürfelte Stufe, Normal ohne Eintrag); null für Legendäre und
// nicht gehaltene Skills. Feuer kennt keinen Stufen-Heber wie Hochspannung bei Blitz.
export function fireTier(skills, skillTiers, id) {
  if (!held(skills, id) || isLegendarySkill(id)) return null;
  const base = Number.isInteger(skillTiers?.[id]) ? skillTiers[id] : 0;
  return Math.min(TIER_EPIC, Math.max(0, base));
}

// Kennwert eines gehaltenen Skills auf seiner Stufe; undefined, wenn der Skill nicht gehalten wird oder die Zeile den
// Schlüssel nicht kennt (die Aufrufer prüfen mit `== null`).
export function fireParam(skills, skillTiers, id, key) {
  const tier = fireTier(skills, skillTiers, id);
  if (tier == null) return undefined;
  const row = SKILL_DEFS[id]?.tiers?.[tier];
  return row ? row[key] : undefined;
}

// Leiste an den Build angleichen (Weißglut gewählt oder ersetzt): max folgt dem Build, die Hitze wird geklemmt.
export function syncHeatMax(heat, skills) {
  if (!heat || !heat.active) return heat;
  const max = heatMaxFor(skills);
  if (heat.max === max) return heat;
  return { ...heat, max, value: Math.min(max, heat.value || 0) };
}

/* Hitzegewinn eines gewonnenen Stichs (Prozentpunkte): Passiv (Vorsprung − Offset, ab Mindest-Vorsprung), + Zunder je
   Sieg. Verbrennung Episch (§7.22): ein Sieg ab dem Vorsprung der Stufe zählt seine Hitze ×mult. Sonnenzorn (L,
   §7.20): liegt die Hitze vor dem Sieg unter der Spitze, zählt der Gewinn ×SONNENZORN_HEAT_MULT (der Zorn holt die
   Spitze zurück). (Feuersturm gibt seit §7.17 keine Hitze mehr — er ist Serie zu Score; Rückzündung seit §7.22 auch
   nicht — sie ist der Takt, rueckzuendungMult; Glut, der Kaltstart-Verstärker, ist seit §7.23 gestrichen.) */
export function heatGainOnWin(skills, skillTiers, { margin = 0, heatValue = 0, heatPeak = 0 } = {}) {
  let g = 0;
  if (margin >= C.HEAT_MIN_MARGIN) g += (margin - C.HEAT_MARGIN_OFFSET) * C.HEAT_PER_POINT;
  g += fireParam(skills, skillTiers, F.ZUNDER, "heat") || 0;
  const vMin = fireParam(skills, skillTiers, F.VERBRENNUNG, "minMargin");
  if (fireParam(skills, skillTiers, F.VERBRENNUNG, "heatToo") && vMin != null && margin >= vMin) g *= fireParam(skills, skillTiers, F.VERBRENNUNG, "mult") || 1;
  if (hasSonnenzorn(skills) && (heatValue || 0) < (heatPeak || 0)) g *= C.SONNENZORN_HEAT_MULT;
  return g;
}

/* Feuerlinie (§7.23, Owner; Platz von Glut): ein Sieg in einer Formation zählt +perPoint je Punkt Kampfwert der
   Siegkarte (Episch: je Formation an der Siegposition, `formCount`), ein Faktor im Feuer-Stack. Er zündet nur, wenn
   die Hitze nach dem Gewinn des Siegs (`heldHeat`, wie alle Hitze-Tore) die Kosten der Stufe deckt; fireOnWin zieht
   sie dann ab. 1 sonst — ohne Formation, ohne Hitze, ohne den Skill. */
export function feuerlinieMult(skills, skillTiers, { value = 0, formCount = 0, heldHeat = 0 } = {}) {
  const per = fireParam(skills, skillTiers, F.FEUERLINIE, "perPoint");
  if (!per || (formCount || 0) < 1 || (heldHeat || 0) < (fireParam(skills, skillTiers, F.FEUERLINIE, "cost") || 0)) return 1;
  const forms = fireParam(skills, skillTiers, F.FEUERLINIE, "perFormation") ? formCount : 1;
  return 1 + Math.max(0, value || 0) * per * forms;
}

/* Hitze-Multiplikator (eigener Faktor im Score-Stack): je volle 10 % Hitze +HEAT_MULT_PER_10; über HEAT_MAX (nur mit
   Weißglut) je 10 % die Steigung der Stufe. Sonnenzorn rechnet mit der Spitze statt der aktuellen Hitze und zählt
   den Passiv-Anteil doppelt (SONNENZORN_MULT_PER_10) — §7.19: über die ganze Spitze bis WEISSGLUT_HEAT_MAX, nicht nur
   bis 100 (die Weißglut-Steigung kommt weiter obendrauf). Ewige Glut (L, §7.21): `ember` = die dauerhafte Rampe aus
   heißen Rundenenden (heat.emberMult), additiv im selben Faktor, nur solange der Skill gehalten wird. 1 ohne Hitze. */
export function heatMult(skills, skillTiers, value = 0, peak = 0, ember = 0) {
  const zorn = hasSonnenzorn(skills);
  const h = Math.max(0, zorn ? Math.max(peak || 0, value || 0) : (value || 0));
  const per10 = zorn ? C.SONNENZORN_MULT_PER_10 : C.HEAT_MULT_PER_10;
  let m = 1 + Math.floor(Math.min(h, zorn ? C.WEISSGLUT_HEAT_MAX : C.HEAT_MAX) / 10 + 1e-9) * per10;
  const over = fireParam(skills, skillTiers, F.WEISSGLUT, "multPer10");
  if (over && h > C.HEAT_MAX) m += Math.floor((Math.min(h, C.WEISSGLUT_HEAT_MAX) - C.HEAT_MAX) / 10 + 1e-9) * over;
  if (hasEwigeGlut(skills)) m += Math.max(0, ember || 0);
  return m;
}

// Verbrennung: ein Sieg ab dem Vorsprung der Stufe zählt ×mult (Faktor im Score-Stack). 1 sonst.
export function verbrennungMult(skills, skillTiers, margin = 0) {
  const min = fireParam(skills, skillTiers, F.VERBRENNUNG, "minMargin");
  if (min == null || margin < min) return 1;
  return fireParam(skills, skillTiers, F.VERBRENNUNG, "mult") || 1;
}

// Rückzündung (§7.24, Takt): jeder N. Sieg in Folge zündet und zählt ×mult (Faktor im Score-Stack neben Hitze-
// Multiplikator, Verbrennung, Feuersturm und Feuerlinie). `streak` = Serie NACH diesem Sieg, wie bei Feuersturm. 1 sonst.
// (§7.22 war der Konter nach einer Niederlage — ab der Laufmitte gibt es keine Niederlagen mehr, der Skill war tot.)
export function rueckzuendungMult(skills, skillTiers, streak = 0) {
  const every = fireParam(skills, skillTiers, F.RUECKZUENDUNG, "every");
  if (!every || streak < every || streak % every !== 0) return 1;
  return fireParam(skills, skillTiers, F.RUECKZUENDUNG, "mult") || 1;
}

/* Feuersturm (§7.17, Owner): Serie zu Score — bei voller Leiste (Episch schon ab `minHeat`) zählt jeder Serienpunkt
   +multPerStreak auf den Stich, ein Faktor im Score-Stack neben Hitze-Multiplikator und Verbrennung. Liest die Hitze
   nach dem Gewinn wie die anderen Hitze-Tore; `max` ist die Leistenlänge des Builds (100, mit Weißglut 200). 1 sonst. */
export function feuersturmMult(skills, skillTiers, value = 0, max = C.HEAT_MAX, streak = 0) {
  const per = fireParam(skills, skillTiers, F.FEUERSTURM, "multPerStreak");
  if (!per) return 1;
  const gate = fireParam(skills, skillTiers, F.FEUERSTURM, "minHeat") ?? max;
  if ((value || 0) < gate) return 1;
  return 1 + Math.max(0, streak) * per;
}

/* Brandschneise (§7.27, Owner, Bauform a; Platz der Feuerwalze): die `width` Siege mit dem größten Vorsprung eines
   Durchlaufs schlagen eine Schneise — im nächsten Durchlauf zählt ein Sieg auf diesen Positionen ×mult. Die Menge ist
   strukturell knapp (N von 40 Positionen, 8–15 % der Stiche) statt historisch („schon einmal gewonnen" ist ab
   Durchlauf 41 immer wahr, gemessen in §7.27) und wandert jeden Durchlauf. `heat.lanes` hält die Schnitte, neuester
   zuerst; nur Episch liest zwei (`hold`). Gibt die Positionen der laufenden Schneise zurück, [] ohne den Skill. */
export function schneiseLane(skills, skillTiers, heat) {
  if (!fireParam(skills, skillTiers, F.BRANDSCHNEISE, "mult") || !heat || !Array.isArray(heat.lanes)) return [];
  const hold = fireParam(skills, skillTiers, F.BRANDSCHNEISE, "hold") || 1;
  const out = [];
  for (const cut of heat.lanes.slice(0, hold)) for (const p of cut) if (!out.includes(p)) out.push(p);
  return out;
}

// Faktor der Brandschneise auf diesen Stich (Faktor im Feuer-Stack): mult auf einer Position der Schneise, sonst 1.
export function schneiseMult(skills, skillTiers, heat, pos = -1) {
  const mult = fireParam(skills, skillTiers, F.BRANDSCHNEISE, "mult");
  if (!mult || pos < 0) return 1;
  return schneiseLane(skills, skillTiers, heat).includes(pos) ? mult : 1;
}

/* Kampfwert-Bonus der gespielten Karte (Zustand vor dem Stich): Glühende Klinge (+Wert je Hitze-Schritt),
   Rückzündung Episch (§7.24: die zündende Karte — wäre dieser Stich der N. Sieg in Folge, kämpft sie mit +Wert;
   `winStreak` = Serie VOR dem Stich). (Feuerwalze ist seit §7.27 gestrichen — dieselbe Achse wie die Klinge.)

   §7.32 (Owner): die Klinge liest die PASSIV-Leiste (HEAT_MAX), nie die von Weißglut verlängerte. Sie ist der einzige
   Feuer-Skill, der den Motor am EINGANG füttert — +Wert hebt den Vorsprung, der Vorsprung ist das Hitze-Einkommen —
   und Weißglut verdoppelte ausgerechnet diese Rückkopplung (Episch +5 → +10 Wert). Mit dem Deckel bei HEAT_MAX
   entkoppeln sich die zwei stärksten Feuer-Skills; die Rückkopplung bleibt, nur halb so lang. */
export function fireValueBonus(heat, skills, skillTiers, { winStreak = 0 } = {}) {
  if (!heat || !heat.active) return 0;
  const value = heat.value || 0;
  let v = 0;
  const step = fireParam(skills, skillTiers, F.KLINGE, "perHeat");
  if (step) v += Math.floor(Math.min(value, C.HEAT_MAX) / step + 1e-9) * (fireParam(skills, skillTiers, F.KLINGE, "value") || 1);
  const rz = fireParam(skills, skillTiers, F.RUECKZUENDUNG, "value");
  const every = fireParam(skills, skillTiers, F.RUECKZUENDUNG, "every");
  if (rz && every && ((winStreak || 0) + 1) % every === 0) v += rz;
  return v;
}

/* Sieg: Hitzegewinn, Schmelzpunkt (Überlauf-Wandler), Glutstahl, Sonnenkern-Score, Brände, Feuerlinie (Faktor und
   Hitzekosten). `held` = Hitze nach dem Gewinn — daran hängen die Hitze-Tore dieses Siegs und der Hitze-Multiplikator.
   `valueOver` = Kampfwert der Siegkarte über ihrem Grundwert (alle Quellen); `value` =
   ihr ganzer Kampfwert, `formCount` = aktive Formationen an der Siegposition (beides Feuerlinie), `pos` = die Position
   des Siegs (Brandschneise, §7.27 — nur mit dem Skill gemerkt). Gibt { heat, held, flat, melted, brands, lineMult }
   zurück; melted = gewandelte Hitzepunkte, brands = [{ id, value }] für die NÄCHSTE Runde, lineMult = der
   Feuerlinie-Faktor dieses Siegs (1 ohne). */
export function fireOnWin(heat, skills, skillTiers, { margin = 0, valueOver = 0, value: cardValue = 0, formCount = 0,
  pos = -1, card = null, forged = {}, brandOnOpp = 0, oppId = null, oppIndex = -1, oppDeck = null } = {}) {
  const gain = heatGainOnWin(skills, skillTiers, { margin, heatValue: heat.value || 0, heatPeak: heat.peak || 0 });
  const max = heat.max || C.HEAT_MAX;
  const raw = (heat.value || 0) + gain;
  let value = Math.min(max, raw);
  const heldHeat = value;
  let flat = 0, melted = 0;
  // Feuerlinie (§7.23): der Faktor liest die Hitze nach dem Gewinn; zündet er, verbrennt der Sieg die Kosten der Stufe
  // (nach dem Schmelzpunkt-Überlauf oben — die Leiste bleibt voll, der nächste Gewinn füllt die Lücke wieder auf).
  const lineMult = feuerlinieMult(skills, skillTiers, { value: cardValue, formCount, heldHeat });
  if (lineMult > 1) value = Math.max(0, value - (fireParam(skills, skillTiers, F.FEUERLINIE, "cost") || 0));
  // Schmelzpunkt (§7.16, Owner): der Überlauf-Wandler — die Hitze, die ein Sieg nicht mehr auf die Leiste bringt (100,
  // mit Weißglut 200), wird Basis-Score je Punkt; die Leiste bleibt voll, verbrannt wird nichts (der Brand kostete Klinge,
  // Siegquote und Serie, 7.13). Episch: die Kühlung einer Niederlage bei voller Leiste ist vorgemerkt (meltPending) und
  // zahlt mit diesem Sieg.
  const spp = fireParam(skills, skillTiers, F.SCHMELZPUNKT, "perPoint");
  let meltPending = heat.meltPending || 0;
  if (spp) {
    melted = Math.max(0, raw - max) + meltPending;
    flat += melted * spp;
    meltPending = 0;
  }
  // Glutstahl: Basis-Score je Punkt Kampfwert über dem Grundwert der Siegkarte (Episch: Schmiedewert doppelt).
  const gp = fireParam(skills, skillTiers, F.GLUTSTAHL, "perPoint");
  if (gp) {
    let over = Math.max(0, valueOver || 0);
    if (fireParam(skills, skillTiers, F.GLUTSTAHL, "forgedDouble") && card) over += (forged && forged[card.id]) || 0;
    flat += over * gp;
  }
  // Sonnenkern: Sieg gegen eine gebrandmarkte Karte zahlt je Brandpunkt auf ihr.
  if (hasSonnenkern(skills) && brandOnOpp > 0) flat += brandOnOpp * C.SONNENKERN_SCORE_PER_BRAND;
  // Brände für die nächste Runde: Brandmal (geschlagene Karte), Lauffeuer (Nachbarn im Gegnerdeck, ohne Wrap),
  // Sonnenkern (geschlagene Karte). Quellen addieren sich; die Engine summiert je Karte.
  const brands = [];
  const bm = fireParam(skills, skillTiers, F.BRANDMAL, "minHeat");
  if (bm != null && heldHeat >= bm && oppId != null) brands.push({ id: oppId, value: fireParam(skills, skillTiers, F.BRANDMAL, "value") || 0 });
  const lf = fireParam(skills, skillTiers, F.LAUFFEUER, "minHeat");
  if (lf != null && heldHeat >= lf && Array.isArray(oppDeck) && oppIndex >= 0) {
    const reach = fireParam(skills, skillTiers, F.LAUFFEUER, "reach") || 1;
    const v = fireParam(skills, skillTiers, F.LAUFFEUER, "value") || 0;
    for (let d = 1; d <= reach; d++) for (const nb of [oppIndex - d, oppIndex + d])
      if (nb >= 0 && nb < oppDeck.length) brands.push({ id: oppDeck[nb].id, value: v });
  }
  if (hasSonnenkern(skills) && oppId != null) brands.push({ id: oppId, value: C.SONNENKERN_BRAND });
  // Brandschneise: der Sieg wird mit seinem Vorsprung gemerkt; welche daraus die Schneise werden, entscheidet erst das
  // Durchlaufende (fireCycleEnd). Ohne den Skill bleibt die Liste leer — kein Zustand, den niemand liest.
  let laneWins = heat.laneWins || [];
  if (fireParam(skills, skillTiers, F.BRANDSCHNEISE, "width") != null && pos >= 0) laneWins = [...laneWins, { p: pos, m: margin }];
  const peak = Math.max(heat.peak || 0, heldHeat, value);
  return { heat: { ...heat, value, peak, meltPending, laneWins }, held: heldHeat, flat: Math.round(flat), melted, brands, lineMult };
}

/* Niederlage: kühlt HEAT_LOSS flach, Glutbett hält einen Boden (Episch: keine Kühlung); Ewige Glut (L, §7.21) lässt
   die Hitze nie unter EWIGE_GLUT_FLOOR_FRAC der Spitze fallen — ein Boden, der nur hält, nie hebt. Schmelzpunkt Episch
   merkt die Kühlung bei voller Leiste vor (meltPending, zahlt beim nächsten Sieg). Brandmal Episch brandmarkt die
   Gegnerkarte, die gewonnen hat (Tor auf der Hitze vor der Niederlage). Gibt { heat, brands } zurück. */
export function fireOnLoss(heat, skills, skillTiers, { deficit = 0, oppId = null } = {}) {
  const max = heat.max || C.HEAT_MAX;
  const before = heat.value || 0;
  let value = before;
  /* Glutbett (§6.24, Owner): der Boden hält die Kühlung — und er STEIGT, wenn er einen Sturz wirklich abfängt.
     „Abfangen" heißt: die Hitze lag darüber und die Kühlung hätte sie darunter gedrückt. Liegt sie schon unten,
     passiert nichts; der Spieler muss erst wieder hochheizen. So kann der Boden nicht davonlaufen, und der Skill
     belohnt genau seinen Rhythmus: hochkommen, runtergeschlagen werden, das Bett wird dicker. */
  let bedFloor = heat.bedFloor || 0;
  if (!fireParam(skills, skillTiers, F.GLUTBETT, "noCool")) {
    const floor = glutbettFloor(heat, skills, skillTiers);
    const caught = before > floor && before - C.HEAT_LOSS < floor;
    value = before <= floor ? before : Math.max(floor, before - C.HEAT_LOSS);
    if (caught) bedFloor += fireParam(skills, skillTiers, F.GLUTBETT, "rise") || 0;
  }
  if (hasEwigeGlut(skills)) value = Math.max(value, Math.min(before, (heat.peak || 0) * C.EWIGE_GLUT_FLOOR_FRAC));
  const lossHeat = fireParam(skills, skillTiers, F.ZUNDER, "lossHeat"); // §7.22 Zunder Episch-Extra: auch Niederlagen heizen
  if (lossHeat) value = Math.min(max, value + lossHeat);
  let meltPending = heat.meltPending || 0;
  if (fireParam(skills, skillTiers, F.SCHMELZPUNKT, "lossPays") && before >= max && value < before) meltPending += before - value;
  const brands = [];
  const bm = fireParam(skills, skillTiers, F.BRANDMAL, "minHeat");
  if (fireParam(skills, skillTiers, F.BRANDMAL, "onLoss") && bm != null && before >= bm && oppId != null)
    brands.push({ id: oppId, value: fireParam(skills, skillTiers, F.BRANDMAL, "value") || 0 });
  return { heat: { ...heat, value, peak: Math.max(heat.peak || 0, value), lastLossDeficit: Math.max(0, deficit), meltPending, bedFloor }, brands };
}

/* Rundenende: Schmiede (§7.14: ohne Preis, die Hitze ist nur die Schwelle der Stufe — liegt sie an, erhält die niedrigste
   Karte dauerhaft +FORGE_VALUE, Episch die zwei niedrigsten), Ewige
   Glut (L, §7.21: endet die Runde mit voller Leiste, wächst die Rampe emberMult um EWIGE_GLUT_MULT_PER_ROUND, ohne
   Deckel), Brandschneise (§7.27: der neue Schnitt aus den größten Vorsprüngen des Durchlaufs).
   Niedrigste Karte deterministisch: kleinster Wert, dann kleinste id.
   Gibt { heat, deck, forged, forgedIds } zurück. */
export function fireCycleEnd(heat, skills, skillTiers, deck, forged = {}) {
  if (!heat || !heat.active) return { heat, deck, forged, forgedIds: [] };
  let value = heat.value || 0;
  let d = deck;
  const f = { ...forged };
  const forgedIds = [];
  const forgeLowest = (exclude) => {
    let low = null;
    for (const c of d) {
      if (exclude.includes(c.id)) continue;
      if (!low || c.value < low.value || (c.value === low.value && c.id < low.id)) low = c;
    }
    if (!low) return;
    d = d.map((c) => (c.id === low.id ? { ...c, value: c.value + C.FORGE_VALUE } : c));
    f[low.id] = (f[low.id] || 0) + C.FORGE_VALUE;
    forgedIds.push(low.id);
  };
  const minHeat = fireParam(skills, skillTiers, F.SCHMIEDE, "minHeat");
  if (minHeat != null && value >= minHeat) {
    const n = fireParam(skills, skillTiers, F.SCHMIEDE, "cards") || 1;
    const done = [];
    for (let k = 0; k < n; k++) { forgeLowest(done); if (forgedIds.length > done.length) done.push(forgedIds[forgedIds.length - 1]); }
  }
  /* §7.34: die Rampe zählt die volle PASSIV-Leiste (HEAT_MAX), nicht die des Builds. Mit Weißglut (mono 98 % gehalten)
     stand das Tor bei 200 statt 100 — die Rampe tickte fast nie, und das Legendäre maß −0 %. Derselbe Fehler wie bei
     der Klinge in §7.32: Weißglut verschob eine Schwelle, die nichts mit ihm zu tun hat. */
  let emberMult = heat.emberMult || 0;
  if (hasEwigeGlut(skills) && value >= C.HEAT_MAX) emberMult += C.EWIGE_GLUT_MULT_PER_ROUND;
  /* Brandschneise (§7.27): der Schnitt dieses Durchlaufs sind die `width` Siege mit dem größten Vorsprung — bei
     gleichem Vorsprung die kleinere Position (Determinismus §9). `lanes` hält die zwei jüngsten Schnitte, mehr liest
     keine Stufe; ohne den Skill bleibt nichts liegen (ein Wiedererwerb fängt bei leerer Schneise an). */
  const wins = heat.laneWins || [];
  let lanes = heat.lanes || [];
  const width = fireParam(skills, skillTiers, F.BRANDSCHNEISE, "width");
  if (width != null) {
    const cut = [...wins].sort((a, b) => (b.m - a.m) || (a.p - b.p)).slice(0, width).map((w) => w.p).sort((a, b) => a - b);
    lanes = [cut, ...lanes].slice(0, 2);
  } else if (lanes.length) lanes = [];
  return { heat: { ...heat, value, emberMult, lanes, laneWins: wins.length ? [] : wins }, deck: d, forged: f, forgedIds };
}

// Brand-Wechsel am Rundenende: normal ersetzen die neuen Brände die alten; mit Sonnenkern stapeln sie sich darauf.
export function nextBrandActive(skills, active = {}, pending = {}) {
  if (!hasSonnenkern(skills)) return { ...pending };
  const out = { ...active };
  for (const id of Object.keys(pending)) out[id] = (out[id] || 0) + pending[id];
  return out;
}
