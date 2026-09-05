import * as C from "../constants.js";
import { SKILL_DEFS, TIER_EPIC, isLegendarySkill } from "../skills.js";

/* ============================================================
   FEUER — Fraktionsmodul (exp skill rework, docs/skill-rework.md §4). Reine Logik: kein React, kein Math.random.

   Passiv (§4.2): Siege ab HEAT_MIN_MARGIN Vorsprung geben (Vorsprung − HEAT_MARGIN_OFFSET) × HEAT_PER_POINT Hitze,
   linear ohne Knie; Niederlagen kühlen HEAT_LOSS flach. Je 10 % gehaltener Hitze +HEAT_MULT_PER_10 Score als eigener
   Faktor im Multiplikator-Stack (heatMult). Leiste 0–HEAT_MAX, mit Weißglut bis WEISSGLUT_HEAT_MAX. Kein Feuer-Score,
   kein Direkt-Score, keine Asche, keine Abhängigkeit von der Zahl gehaltener Feuer-Skills.

   Die 15 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `fireParam`; die vier Legendären haben keine Stufe und hängen an ihrer ID. Alle Übergänge sind immutabel.
   Hitze-Tore („ab X % Hitze") lesen die Hitze NACH dem Gewinn des Siegs und VOR dem Verbrauch (Konsumenten); der
   Hitze-Multiplikator eines Siegs liest dieselbe Größe. Zustands-Boni (Klinge, Feuerwalze) lesen die Hitze vor dem Stich.
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul, Engine und Tests.
export const F = Object.freeze({
  GLUT: "SK_FIRE_01", ZUNDER: "SK_FIRE_02", FEUERSTURM: "SK_FIRE_03", GLUTBETT: "SK_FIRE_04", RUECKZUENDUNG: "SK_FIRE_05",
  KLINGE: "SK_FIRE_06", WEISSGLUT: "SK_FIRE_07", FEUERWALZE: "SK_FIRE_08", VERBRENNUNG: "SK_FIRE_09",
  FLAECHENBRAND: "SK_FIRE_11", SCHMELZPUNKT: "SK_FIRE_12", BRANDMAL: "SK_FIRE_13", LAUFFEUER: "SK_FIRE_14",
  SCHMIEDE: "SK_FIRE_15", GLUTSTAHL: "SK_FIRE_16",
  SONNENKERN: "SK_FIRE_L01", PHOENIXFEUER: "SK_FIRE_L02", SONNENZORN: "SK_FIRE_L03", DAMASTSTAHL: "SK_FIRE_L04",
});

/* Frischer Hitze-Substate — inaktiv; der erste Feuer-Skill aktiviert ihn (Reducer). value = Hitze (0..max, auch mit
   Nachkommastellen), peak = höchste je erreichte Hitze (Sonnenzorn), lastLossDeficit = Rückstand der letzten Niederlage
   (Rückzündung). */
export function initHeat() {
  return { active: false, value: 0, max: C.HEAT_MAX, peak: 0, lastLossDeficit: 0 };
}

const held = (skills, id) => (skills || []).includes(id);
export const hasSonnenkern   = (skills) => held(skills, F.SONNENKERN);
export const hasPhoenixfeuer = (skills) => held(skills, F.PHOENIXFEUER);
export const hasSonnenzorn   = (skills) => held(skills, F.SONNENZORN);
export const hasDamaststahl  = (skills) => held(skills, F.DAMASTSTAHL);

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

/* Hitzegewinn eines gewonnenen Stichs (Prozentpunkte): Passiv (Vorsprung − Offset, ab Mindest-Vorsprung) × Glut,
   + Zunder je Sieg, + Feuersturm je Serienpunkt (Serie NACH diesem Sieg), + Rückzündung je Punkt Rückstand der
   letzten Niederlage, wenn der Vorstich verloren war. */
export function heatGainOnWin(skills, skillTiers, { margin = 0, streak = 0, lastResult = null, lastLossDeficit = 0 } = {}) {
  let g = 0;
  if (margin >= C.HEAT_MIN_MARGIN) {
    let base = (margin - C.HEAT_MARGIN_OFFSET) * C.HEAT_PER_POINT;
    const gm = fireParam(skills, skillTiers, F.GLUT, "heatMult");
    if (gm) base *= gm;
    g += base;
  }
  g += fireParam(skills, skillTiers, F.ZUNDER, "heat") || 0;
  const ps = fireParam(skills, skillTiers, F.FEUERSTURM, "perStreak");
  if (ps) g += ps * Math.max(0, streak);
  const pd = fireParam(skills, skillTiers, F.RUECKZUENDUNG, "perDeficit");
  if (pd && lastResult === "loss") g += pd * Math.max(0, lastLossDeficit);
  return g;
}

/* Hitze-Multiplikator (eigener Faktor im Score-Stack): je volle 10 % Hitze +HEAT_MULT_PER_10; über HEAT_MAX (nur mit
   Weißglut) je 10 % die Steigung der Stufe. Sonnenzorn rechnet mit der Spitze statt der aktuellen Hitze und zählt
   den Passiv-Anteil doppelt (SONNENZORN_MULT_PER_10). 1 ohne Hitze. */
export function heatMult(skills, skillTiers, value = 0, peak = 0) {
  const zorn = hasSonnenzorn(skills);
  const h = Math.max(0, zorn ? Math.max(peak || 0, value || 0) : (value || 0));
  const per10 = zorn ? C.SONNENZORN_MULT_PER_10 : C.HEAT_MULT_PER_10;
  let m = 1 + Math.floor(Math.min(h, C.HEAT_MAX) / 10 + 1e-9) * per10;
  const over = fireParam(skills, skillTiers, F.WEISSGLUT, "multPer10");
  if (over && h > C.HEAT_MAX) m += Math.floor((Math.min(h, C.WEISSGLUT_HEAT_MAX) - C.HEAT_MAX) / 10 + 1e-9) * over;
  return m;
}

// Verbrennung: ein Sieg ab dem Vorsprung der Stufe zählt ×mult (Faktor im Score-Stack). 1 sonst.
export function verbrennungMult(skills, skillTiers, margin = 0) {
  const min = fireParam(skills, skillTiers, F.VERBRENNUNG, "minMargin");
  if (min == null || margin < min) return 1;
  return fireParam(skills, skillTiers, F.VERBRENNUNG, "mult") || 1;
}

/* Kampfwert-Bonus der gespielten Karte (Zustand vor dem Stich): Glühende Klinge (+Wert je Hitze-Schritt, ohne Deckel),
   Feuerwalze (ab der Hitze-Schwelle nach einem Sieg, Episch auch nach einer Niederlage), Rückzündung Episch (+Wert nach
   einer Niederlage). */
export function fireValueBonus(heat, skills, skillTiers, { lastResult = null } = {}) {
  if (!heat || !heat.active) return 0;
  const value = heat.value || 0;
  let v = 0;
  const step = fireParam(skills, skillTiers, F.KLINGE, "perHeat");
  if (step) v += Math.floor(value / step + 1e-9) * (fireParam(skills, skillTiers, F.KLINGE, "value") || 1);
  const fwMin = fireParam(skills, skillTiers, F.FEUERWALZE, "minHeat");
  if (fwMin != null && value >= fwMin
      && (lastResult === "win" || (fireParam(skills, skillTiers, F.FEUERWALZE, "afterLoss") && lastResult === "loss")))
    v += fireParam(skills, skillTiers, F.FEUERWALZE, "value") || 0;
  const rz = fireParam(skills, skillTiers, F.RUECKZUENDUNG, "value");
  if (rz && lastResult === "loss") v += rz;
  return v;
}

// Damaststahl: geschmiedete Karten kämpfen mit doppeltem Schmiedewert — der Schmiedewert liegt schon im Kartenwert,
// hier kommt er ein zweites Mal auf den Kampfwert (nur der Vergleich, nicht die Basis).
export function damascusCombat(skills, forged, card) {
  if (!hasDamaststahl(skills)) return 0;
  return (forged && card && forged[card.id]) || 0;
}

/* Sieg: Hitzegewinn, Konsumenten (Schmelzpunkt-Tropf, Flächenbrand-Burst), Phönix-Neuzündung, Glutstahl, Sonnenkern-
   Score, Brände. `held` = Hitze nach dem Gewinn und vor dem Verbrauch — daran hängen die Hitze-Tore dieses Siegs und
   der Hitze-Multiplikator. `valueOver` = Kampfwert der Siegkarte über ihrem Grundwert (alle Quellen, ohne den Damast-
   Kampfbonus). Gibt { heat, held, flat, burned, brands } zurück; brands = [{ id, value }] für die NÄCHSTE Runde. */
export function fireOnWin(heat, skills, skillTiers, { margin = 0, streak = 0, lastResult = null, valueOver = 0, card = null,
  forged = {}, brandOnOpp = 0, oppId = null, oppIndex = -1, oppDeck = null } = {}) {
  const gain = heatGainOnWin(skills, skillTiers, { margin, streak, lastResult, lastLossDeficit: heat.lastLossDeficit || 0 });
  const max = heat.max || C.HEAT_MAX;
  let value = Math.min(max, (heat.value || 0) + gain);
  const heldHeat = value;
  let flat = 0, burned = 0;
  // Schmelzpunkt (Tropf): jeder Sieg verbrennt `burn` Punkte (höchstens was da ist), Episch gibt einen Teil zurück.
  const burn = fireParam(skills, skillTiers, F.SCHMELZPUNKT, "burn");
  if (burn) {
    const b = Math.min(value, burn);
    if (b > 0) {
      flat += b * (fireParam(skills, skillTiers, F.SCHMELZPUNKT, "perPoint") || 0);
      burned += b; value -= b;
      const refund = fireParam(skills, skillTiers, F.SCHMELZPUNKT, "refund") || 0;
      if (refund) value = Math.min(max, value + b * refund);
    }
  }
  // Flächenbrand (Burst): ab der Schwelle brennt dieser Sieg bis auf den Boden herunter (Episch bis 0).
  const fbMin = fireParam(skills, skillTiers, F.FLAECHENBRAND, "minHeat");
  if (fbMin != null && heldHeat >= fbMin) {
    const keep = fireParam(skills, skillTiers, F.FLAECHENBRAND, "keep") ?? 0;
    const b = Math.max(0, value - keep);
    if (b > 0) { flat += b * (fireParam(skills, skillTiers, F.FLAECHENBRAND, "perPoint") || 0); burned += b; value = keep; }
  }
  // Phönixfeuer: auf 0 verbrannte Hitze zündet neu — ohne Rundenlimit.
  if (hasPhoenixfeuer(skills) && value <= 0) value = Math.min(max, C.PHOENIX_REIGNITE);
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
  const peak = Math.max(heat.peak || 0, heldHeat, value);
  return { heat: { ...heat, value, peak }, held: heldHeat, flat: Math.round(flat), burned, brands };
}

/* Niederlage: Phönixfeuer heizt je Punkt Rückstand; sonst kühlt die Niederlage HEAT_LOSS flach, Glutbett hält einen
   Boden (Episch: keine Kühlung). Brandmal Episch brandmarkt die Gegnerkarte, die gewonnen hat (Tor auf der Hitze vor
   der Niederlage). Gibt { heat, brands } zurück. */
export function fireOnLoss(heat, skills, skillTiers, { deficit = 0, oppId = null } = {}) {
  const max = heat.max || C.HEAT_MAX;
  const before = heat.value || 0;
  let value = before;
  if (hasPhoenixfeuer(skills)) value = Math.min(max, before + Math.max(0, deficit) * C.PHOENIX_LOSS_HEAT);
  else if (!fireParam(skills, skillTiers, F.GLUTBETT, "noCool")) {
    const floor = fireParam(skills, skillTiers, F.GLUTBETT, "floor") ?? 0;
    value = before <= floor ? before : Math.max(floor, before - C.HEAT_LOSS);
  }
  const brands = [];
  const bm = fireParam(skills, skillTiers, F.BRANDMAL, "minHeat");
  if (fireParam(skills, skillTiers, F.BRANDMAL, "onLoss") && bm != null && before >= bm && oppId != null)
    brands.push({ id: oppId, value: fireParam(skills, skillTiers, F.BRANDMAL, "value") || 0 });
  return { heat: { ...heat, value, peak: Math.max(heat.peak || 0, value), lastLossDeficit: Math.max(0, deficit) }, brands };
}

/* Rundenende: Schmiede (liegt mindestens der Preis der Stufe an, kostet die Schmiedung ihn und die niedrigste Karte
   erhält dauerhaft +FORGE_VALUE; Episch schmiedet die zwei niedrigsten für denselben Preis), Damaststahl (die niedrigste
   Karte ohne Preis), danach Phönix-Neuzündung. Niedrigste Karte deterministisch: kleinster Wert, dann kleinste id.
   Gibt { heat, deck, forged, forgedIds } zurück. */
export function fireCycleEnd(heat, skills, skillTiers, deck, forged = {}) {
  if (!heat || !heat.active) return { heat, deck, forged, forgedIds: [] };
  const max = heat.max || C.HEAT_MAX;
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
  const cost = fireParam(skills, skillTiers, F.SCHMIEDE, "cost");
  if (cost != null && value >= cost) {
    value -= cost;
    const n = fireParam(skills, skillTiers, F.SCHMIEDE, "cards") || 1;
    const done = [];
    for (let k = 0; k < n; k++) { forgeLowest(done); if (forgedIds.length > done.length) done.push(forgedIds[forgedIds.length - 1]); }
  }
  if (hasDamaststahl(skills)) forgeLowest([]);
  if (hasPhoenixfeuer(skills) && value <= 0) value = Math.min(max, C.PHOENIX_REIGNITE);
  return { heat: { ...heat, value }, deck: d, forged: f, forgedIds };
}

// Brand-Wechsel am Rundenende: normal ersetzen die neuen Brände die alten; mit Sonnenkern stapeln sie sich darauf.
export function nextBrandActive(skills, active = {}, pending = {}) {
  if (!hasSonnenkern(skills)) return { ...pending };
  const out = { ...active };
  for (const id of Object.keys(pending)) out[id] = (out[id] || 0) + pending[id];
  return out;
}
