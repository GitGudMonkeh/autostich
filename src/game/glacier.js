/* Eis-Neudesign — Fundament ("Gletscher, Brechen & Kaskade"). Reine, deterministische Kern-Logik.
   NEU-Design, isoliert vom bestehenden Eis-Archetyp (skills.js/engine.js Ice-Block) — gegatet später über
   activeArchetypes "glacier". Design-Referenz: docs/eis-rework.md.

   Mentalmodell (docs §2): Masse liegt auf dem BRETTFELD (Firn-Boden), nicht auf der Karte. Ein Gletscher ist ein
   festgefrorenes Feld. Zum Durchlauf-Anfang wird der ganze Bruch auf dem statischen Brett vorab gerechnet
   (Snapshot, analog precomputeArchitect) und dann pro Stich ausgezahlt.

   ⚠ ZAHLEN SIND PLATZHALTER — die endgültigen Werte fallen am Sim/Playtest (docs §2.3, §8). Struktur & Relationen
   stehen, die Konstanten sind bewusst zentral & leicht editierbar. */

import { N_POS, rowOf, colOf, posOf } from "./architect.js"; // Brett-Geometrie 8×5, Single Source

/* ---- TUNING-Block (Platzhalter, Sim-tunebar) ------------------------------------------------------ */
export const THRESHOLDS = [4, 8, 12];          // Schwellen-Stufen; Stufe = #Schwellen ≤ Masse (0..3)
export const TIER_MULT = [0, 1, 1.5, 2.2];     // überlineare Wucht je Stufe (Stufe 0 bricht nicht)
export const KASKADE_PER_NEIGHBOR = 0.25;      // Berst-Faktor = 1 + 0,25 × Gletscher-Nachbarn (Dichte)
export const KOLLISION_MULT = 1.5;             // Treffer auf Gletscher-Nachbarn (anteilig, docs §2.3)
export const EWIGER_FROST = 1;                 // Fraktions-Passiv: bedingungsloser Masse-Tick je Durchlauf (docs §2.6)
export const WIN_MASS = 1;                     // Baseline: Sieg eines Gletschers → +Masse (docs §2.2)
export const TOP = THRESHOLDS[THRESHOLDS.length - 1]; // höchste Stufe (Überlauf-Grenze)

/* ---- Geometrie: 4 orthogonale Nachbarn (links/rechts/oben/unten) auf dem 8×5-Brett ---------------- */
export function neighbors4(p) {
  const r = rowOf(p), c = colOf(p), out = [];
  if (r > 0) out.push(posOf(r - 1, c));                 // oben
  if (r < 7) out.push(posOf(r + 1, c));                 // unten
  if (c > 0) out.push(posOf(r, c - 1));                 // links
  if (c < 4) out.push(posOf(r, c + 1));                 // rechts
  return out;
}

/* ---- Masse → Stufe / Reset / Überlauf ------------------------------------------------------------- */
// Stufe = Anzahl erreichter Schwellen (Masse 3→0, 4→1, 8→2, 12→3).
export const tierOf = (mass) => {
  let t = 0;
  for (const th of THRESHOLDS) if (mass >= th) t++;
  return t;
};
// Teil-Reset nach dem Bruch: eine Stufe runter (12→8, 8→4, 4→0). docs §2.3.
export const dropAfterBreak = (tier) => (tier >= 2 ? THRESHOLDS[tier - 2] : 0);
// Überlauf über die höchste Stufe → wird jede Runde als Score ausgeschüttet, nicht gehortet. docs §2.3.
export const overflowOf = (mass) => Math.max(0, mass - TOP);

/* ---- Snapshot: der ganze Bruch auf dem statischen Brett (docs §2.4, Phase A) ----------------------
   @param mass   length-40: Masse je Brettfeld (Firn-Boden)
   @param locked Set<number> ODER length-40 bool: welche Felder sind gefrorene Gletscher
   @param opts   Rollen-Modifikatoren (Phase 3), überschreiben die Tuning-Defaults
   @returns { payout, resetMass, breaks }
     payout[40]     — Burst-Score + Überlauf je Feld (pro Stich auszuzahlen)
     resetMass[40]  — Masse nach Teil-Reset (Basis, auf die diesen Durchlauf Siege/Ticks addieren)
     breaks[]       — {pos, tier, burst, glacierNeighbors} je gebrochenem Gletscher (Debug/Rollen) */
export function precomputeGlacier(mass, locked, opts = {}) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const thresholds = opts.thresholds || THRESHOLDS;
  const tierMult = opts.tierMult || TIER_MULT;
  const kaskade = opts.kaskadePerNeighbor ?? KASKADE_PER_NEIGHBOR;
  const kollision = opts.kollisionMult ?? KOLLISION_MULT;
  const tOf = (m) => { let t = 0; for (const th of thresholds) if (m >= th) t++; return t; };
  const top = thresholds[thresholds.length - 1];

  const payout = new Array(N_POS).fill(0);
  const resetMass = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  const breaks = [];

  for (let p = 0; p < N_POS; p++) {
    if (!isG(p)) continue;
    const m0 = resetMass[p] || 0;
    const ov = Math.max(0, m0 - top);
    if (ov > 0) payout[p] += ov;                        // Überlauf → Score (jede Runde)
    const mCap = m0 - ov;                               // gedeckelt auf höchste Stufe
    const tier = tOf(mCap);
    if (tier < 1) { resetMass[p] = mCap; continue; }    // unter erster Schwelle: kein Bruch, Masse bleibt

    const nb = neighbors4(p);
    const gN = nb.filter(isG).length;                   // angrenzende Gletscher
    const berstFaktor = 1 + kaskade * gN;               // Kaskade (Dichte)
    const kollFrac = nb.length ? gN / nb.length : 0;    // Anteil der Nachbarrichtungen, die Gletscher treffen
    const kollFaktor = 1 + (kollision - 1) * kollFrac;  // Kollision (anteilig, docs §2.3)
    const burst = mCap * tierMult[tier] * berstFaktor * kollFaktor;

    payout[p] += burst;
    resetMass[p] = tier >= 2 ? thresholds[tier - 2] : 0; // Teil-Reset: eine Stufe runter (respektiert opts.thresholds)
    breaks.push({ pos: p, tier, burst, glacierNeighbors: gN });
  }
  return { payout, resetMass, breaks };
}

/* ---- Rollen-Gruppe C: Cluster/Dichte — Nachbar-/Cluster-Infrastruktur (docs §4 Eisschild) --------- */
export const PACKEIS_PER_NEIGHBOR = 0.5;   // Packeis: +Masse/Durchlauf je Gletscher-Nachbar
export const VERZAHNUNG_PER = 0.25;        // Verzahnung: +Masse/Durchlauf je Gletscher im verbundenen Cluster (skaliert mit Größe)

// 8-Nachbarschaft (Eisbrücke): 4 orthogonal + 4 diagonal.
export function neighbors8(p) {
  const r = rowOf(p), c = colOf(p), out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 5) out.push(posOf(nr, nc));
  }
  return out;
}
// Aktive Nachbarschaftsfunktion: mit Eisbrücke die 8er, sonst die 4er.
export const glacierNeighborFn = (roles = []) => (roles.includes(ROLES.EISBRUECKE) ? neighbors8 : neighbors4);

// Cluster-Erkennung (Flood-Fill über verbundene Gletscher via aktiver Nachbarschaft) → Array von Clustern (je Array von pos).
export function glacierClusters(locked, neighborFn = neighbors4) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const seen = new Set(), clusters = [];
  for (let p = 0; p < N_POS; p++) {
    if (!isG(p) || seen.has(p)) continue;
    const stack = [p], cl = []; seen.add(p);
    while (stack.length) {
      const q = stack.pop(); cl.push(q);
      for (const n of neighborFn(q)) if (isG(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    clusters.push(cl);
  }
  return clusters;
}

// Verschmelzen (docs §4): zu Durchlauf-Beginn heben angrenzende Gletscher einander auf den Cluster-Durchschnitt — NIE fallend.
export function verschmelzenPool(mass, locked, neighborFn = neighbors4) {
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (const cl of glacierClusters(locked, neighborFn)) {
    if (cl.length < 2) continue;
    const avg = cl.reduce((s, p) => s + (out[p] || 0), 0) / cl.length;
    for (const p of cl) if ((out[p] || 0) < avg) out[p] = avg; // nur anheben
  }
  return out;
}

// Packeis (docs §4): am Durchlauf-Ende +Masse je Gletscher-Nachbar — belohnt die Mitte des Feldes.
export function packeisTick(mass, locked, neighborFn = neighbors4, per = PACKEIS_PER_NEIGHBOR) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) if (isG(p)) {
    const gN = neighborFn(p).filter(isG).length;
    if (gN) out[p] = (out[p] || 0) + per * gN;
  }
  return out;
}

// Verzahnung (docs §4): am Durchlauf-Ende gewinnt jeder Gletscher Masse ∝ seiner Cluster-Größe — großes Cluster füttert sich
// schneller (Runaway-Kandidat, später deckeln).
export function verzahnungTick(mass, locked, neighborFn = neighbors4, per = VERZAHNUNG_PER) {
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (const cl of glacierClusters(locked, neighborFn)) {
    const gain = per * cl.length;
    for (const p of cl) out[p] = (out[p] || 0) + gain;
  }
  return out;
}

/* ---- Rollen → Snapshot-opts (Gruppe A, docs §4 Lawine) -------------------------------------------
   Rollen als Skills sind noch nicht im Angebots-Pool (kein 5.-Archetyp-Leak); getrieben über state.glacierRoles.
   ⚠ Werte Platzhalter. */
export const ROLES = {
  RISSBILDUNG: "G_RISSBILDUNG",   // instabiles Eis: erste Schwelle runter → bricht früh & oft
  ZERMALMEN: "G_ZERMALMEN",       // Kollision (Treffer auf Gletscher-Nachbarn) → Krit
  ABBRUCHKANTE: "G_ABBRUCHKANTE", // belohnt hohe Stufen noch steiler (Riesen)
  ANFRIEREN: "G_ANFRIEREN",       // Firn: Sieg → +Masse extra; Formations-Sieg → doppelt
  SCHNEETREIBEN: "G_SCHNEETREIBEN", // Firn: Verwehung — Sieg verweht Masse aufs Nachbarfeld (Boden säen, nah)
  DAUERFROST: "G_DAUERFROST",     // Firn: offener Boden friert am tiefsten — passiver Boden-Frost (fern)
  EISPANZER: "G_EISPANZER",       // Frostgriff: Niederlage neben Gletscher folgenlos + füttert Masse (der Gletscher frisst, was zerbricht)
  PACKEIS: "G_PACKEIS",           // Eisschild: Gletscher mit vielen Gletscher-Nachbarn → Bonus-Masse (belohnt die Mitte)
  VERSCHMELZEN: "G_VERSCHMELZEN", // Eisschild: angrenzende Gletscher poolen → jeder auf den Cluster-Durchschnitt (nie fallend)
  VERZAHNUNG: "G_VERZAHNUNG",     // Eisschild: je größer das Cluster, desto schneller wächst jeder Gletscher (Runaway-Kandidat)
  EISBRUECKE: "G_EISBRUECKE",     // Eisschild: erweitert „angrenzend" um die 4 Diagonalen (8-Nachbarschaft)
};
export const RISSBILDUNG_THRESHOLDS = [2, 8, 12];       // erste Schwelle 4→2
export const ZERMALMEN_KOLLISION = 2;                   // Kollision 1,5→2
export const ABBRUCHKANTE_TIER_MULT = [0, 1, 1.8, 3.0]; // steiler als Baseline [0,1,1.5,2.2]

// Baut das opts-Objekt für precomputeGlacier aus den aktiven Rollen (Gruppe A). Mehrere Rollen komponieren additiv.
export function glacierOpts(roles = []) {
  const has = (r) => roles.includes(r);
  const opts = {};
  if (has(ROLES.RISSBILDUNG)) opts.thresholds = RISSBILDUNG_THRESHOLDS;
  if (has(ROLES.ABBRUCHKANTE)) opts.tierMult = ABBRUCHKANTE_TIER_MULT;
  if (has(ROLES.ZERMALMEN)) opts.kollisionMult = ZERMALMEN_KOLLISION;
  return opts;
}

/* ---- Ewiger Frost: bedingungsloser Masse-Tick je Durchlauf (Fraktions-Passiv, docs §2.6) ----------
   Am Durchlauf-ENDE anzuwenden (nach Auszahlung), auf jeden Gletscher. Klein gehalten (Sockel, nicht Motor). */
export function ewigerFrostTick(mass, locked, amount = EWIGER_FROST) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) if (isG(p)) out[p] = (out[p] || 0) + amount;
  return out;
}

/* ---- Rollen-Gruppe B: Masse-Quellen (docs §4 Firn) ----------------------------------------------- */
export const ANFRIEREN_WIN = 1;        // Sieg → +Masse extra (zusätzlich zur Baseline WIN_MASS)
export const ANFRIEREN_FORM = 2;       // Formations-Sieg → doppelt anfrieren (extra oben drauf)
export const SCHNEETREIBEN_DRIFT = 1;  // Verwehung: Masse vom Gletscher auf ein Nachbarfeld
export const DAUERFROST_BASE = 1;      // offener Boden: +Masse/Durchlauf auf Feld OHNE Gletscher-Nachbarn (skaliert runter)
export const EISPANZER_MASS = 1;       // Eispanzer: abgeschirmte Nachbar-Niederlage → +Masse je angrenzendem Gletscher

// Schneetreiben (Verwehung, docs §4): Zielfeld für die Verwehung — bevorzugt ein NICHT-Gletscher-Nachbarfeld (Boden säen),
// sonst irgendein Nachbar. Deterministisch (niedrigster Index in der neighbors4-Reihenfolge). null, wenn keine Nachbarn.
export function driftTarget(pos, locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const nb = neighbors4(pos);
  const open = nb.filter((p) => !isG(p));
  if (open.length) return open[0];
  return nb.length ? nb[0] : null;
}

// Dauerfrost (docs §4 Firn, „offener Boden friert am tiefsten"): am Durchlauf-ENDE sammeln UNGEFRORENE Felder Masse —
// aber gedämpft durch Gletscher-Nachbarn (0 Nachbarn = voller Frost, ganz von Gletschern umgeben = 0). Nur Firn-Boden.
export function dauerfrostTick(mass, locked, base = DAUERFROST_BASE) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) {
    if (isG(p)) continue;                                 // nur ungefrorene Felder (Gletscher laden über Anfrieren/Ewiger Frost)
    const nb = neighbors4(p);
    const gN = nb.filter(isG).length;
    const openness = nb.length ? Math.max(0, 1 - gN / nb.length) : 1; // je mehr Gletscher-Nachbarn, desto weniger Boden-Frost
    if (openness > 0) out[p] = (out[p] || 0) + base * openness;
  }
  return out;
}
