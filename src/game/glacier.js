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
// Globaler Burst-Skalierer: die Gletscher SIND der Hauptscore (nicht das Deck) — einzelne, massive Hits. Frequenz bleibt
// (kein schnelleres Bersten), nur die Wucht je Bruch. Am Sim kalibriert, damit der Gletscher-Ertrag das Deck dominiert.
export const BURST_SCALE = 600;
export const KASKADE_PER_NEIGHBOR = 0.25;      // Berst-Faktor = 1 + 0,25 × Gletscher-Nachbarn (Dichte)
export const KOLLISION_MULT = 1.5;             // Treffer auf Gletscher-Nachbarn (anteilig, docs §2.3)
export const EWIGER_FROST = 1;                 // Fraktions-Passiv: bedingungsloser Masse-Tick je Durchlauf (docs §2.6)
export const WIN_MASS = 1;                     // Baseline: Sieg eines Gletschers → +Masse (docs §2.2)
export const GLETSCHERSTURZ_PER = 0.05;        // Gletschersturz: +5 % je gleichzeitig brechendem Gletscher (Amp)
export const TOP = THRESHOLDS[THRESHOLDS.length - 1]; // höchste Stufe (Überlauf-Grenze)
// Berst-Kadenz (docs §2.3, „einzelne massive Hits"): ein Gletscher HÄLT & wächst, bis er die höchste Schwelle erreicht,
// dann bricht er gewaltig (volle Stufe) und kalbt zurück. Selten + eskalierend statt häufig+klein.
export const BURST_AT = TOP;                    // natürliche Berst-Schwelle = höchste Stufe (12)
export const RESET_TO = 0;                      // nach dem Bruch abgekalbt → baut wieder von unten auf
export const RISSBILDUNG_BURST = 6;            // Rissbildung: bricht schon bei niedriger Masse (Tempo-Gegenpol, kleine häufige Brüche)

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
  const neighborFn = opts.neighborFn || neighbors4;     // Eisbrücke → 8-Nachbarschaft (Kaskade/Kollision/Kette)
  const kettenbruch = !!opts.kettenbruch;               // Bruch zwingt Nachbar-Gletscher mitzubrechen
  const gletschersturzPer = opts.gletschersturz ? (opts.gletschersturzPer ?? GLETSCHERSTURZ_PER) : 0; // Amp ∝ Bruch-Zahl
  const formFactor = opts.formFactor || null;           // 2D-Geometrie-Formationen: Burst-Faktor je Feld (docs §9)
  const grosseLawine = !!opts.grosseLawine;             // Legendär: ALLES bricht (Schwellen ignoriert)
  const ewigesSchild = !!opts.ewigesSchild;             // Legendär: das ganze Feld gilt als EIN Übergletscher (Kaskade = volle Feldgröße)
  const burstAt = opts.burstAt ?? BURST_AT;             // natürliche Berst-Schwelle (Rissbildung senkt sie)
  const tOf = (m) => { let t = 0; for (const th of thresholds) if (m >= th) t++; return t; };
  const top = thresholds[thresholds.length - 1];

  const payout = new Array(N_POS).fill(0);
  const resetMass = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);

  // Vorbereitung: Überlauf auszahlen, Masse deckeln, natürliche Stufe je Gletscher.
  const mCap = new Array(N_POS).fill(0), natTier = new Array(N_POS).fill(0);
  let totalG = 0;
  for (let p = 0; p < N_POS; p++) {
    if (!isG(p)) continue;
    totalG++;
    const m0 = resetMass[p] || 0;
    const ov = Math.max(0, m0 - top);
    if (ov > 0) payout[p] += ov;                        // Überlauf → Score (jede Runde)
    mCap[p] = m0 - ov;
    natTier[p] = tOf(mCap[p]);
  }

  // Breaker bestimmen: NATÜRLICH bricht nur, wer die Berst-Schwelle erreicht hat (halten & wachsen, dann gewaltig).
  // Große Lawine zwingt ALLE (auch nicht-reife), Kettenbruch flutet auf angrenzende Gletscher.
  const isBreaker = new Array(N_POS).fill(false), forced = new Array(N_POS).fill(false), queue = [];
  for (let p = 0; p < N_POS; p++) if (isG(p)) {
    if (mCap[p] >= burstAt) { isBreaker[p] = true; queue.push(p); }
    else if (grosseLawine) { isBreaker[p] = true; forced[p] = true; } // Große Lawine: auch unreife brechen
  }
  if (kettenbruch) {
    while (queue.length) {
      const q = queue.pop();
      for (const n of neighborFn(q)) if (isG(n) && !isBreaker[n]) { isBreaker[n] = true; forced[n] = true; queue.push(n); }
    }
  }
  let breakCount = 0;
  for (let p = 0; p < N_POS; p++) if (isBreaker[p]) breakCount++;
  const sturzFactor = 1 + gletschersturzPer * breakCount; // Gletschersturz: je mehr brechen, desto stärker JEDER Bruch

  // Bruch-Scores + Teil-Reset.
  const breaks = [];
  for (let p = 0; p < N_POS; p++) {
    if (!isG(p)) continue;
    if (!isBreaker[p]) { resetMass[p] = mCap[p]; continue; } // kein Bruch: gedeckelte Masse bleibt
    const effTier = forced[p] ? Math.max(1, natTier[p]) : natTier[p]; // Kettenbruch: erzwungene brechen mind. auf Stufe 1
    const nb = neighborFn(p);
    const gN = ewigesSchild ? Math.max(0, totalG - 1) : nb.filter(isG).length; // Ewiges Schild: ganzes Feld gilt als angrenzend
    const berstFaktor = 1 + kaskade * gN;               // Kaskade (Dichte)
    const kollFrac = ewigesSchild ? 1 : (nb.length ? gN / nb.length : 0);
    const kollFaktor = 1 + (kollision - 1) * kollFrac;  // Kollision (anteilig)
    const geoFactor = formFactor ? (formFactor[p] || 1) : 1; // 2D-Geometrie (Block/Kreuz/Linie/Fläche)
    const burst = mCap[p] * tierMult[effTier] * berstFaktor * kollFaktor * sturzFactor * geoFactor * BURST_SCALE;
    payout[p] += burst;
    resetMass[p] = RESET_TO;                             // abgekalbt: baut wieder von unten auf (selten + gewaltig)
    breaks.push({ pos: p, tier: effTier, burst, glacierNeighbors: gN, forced: forced[p] });
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

// Ewiges Schild (Legendär, docs §7): das GESAMTE Feld poolt als ein Übergletscher — alle Gletscher auf den globalen
// Durchschnitt heben (nie fallend), unabhängig von Nachbarschaft.
export function uebergletscherPool(mass, locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  const gs = []; for (let p = 0; p < N_POS; p++) if (isG(p)) gs.push(p);
  if (gs.length < 2) return out;
  const avg = gs.reduce((s, p) => s + (out[p] || 0), 0) / gs.length;
  for (const p of gs) if ((out[p] || 0) < avg) out[p] = avg;
  return out;
}

// Eiszeit (Legendär, docs §7): Dauerfrost im Overdrive — am Durchlauf-Ende flutet das GANZE Brett (alle ungefrorenen
// Felder, flach, ohne Nachbar-Dämpfung), und das höchste ungefrorene Feld friert zum Gletscher ein (Karten frieren nach
// und nach über die Restrunden). Gibt { mass, locked } zurück. ⚠ Flutrate Platzhalter.
export const EISZEIT_FLOOD = 3;
export function eiszeitTick(mass, locked, base = EISZEIT_FLOOD) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const m = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) if (!isG(p)) m[p] = (m[p] || 0) + base; // brettweite Flut
  let best = -1, bestV = -Infinity;
  for (let p = 0; p < N_POS; p++) if (!isG(p) && (m[p] || 0) > bestV) { bestV = m[p] || 0; best = p; }
  let newLocked = locked;
  if (best >= 0) {
    if (locked instanceof Set) { newLocked = new Set(locked); newLocked.add(best); }
    else { newLocked = (locked ? locked.slice() : new Array(N_POS).fill(false)); newLocked[best] = true; }
  }
  return { mass: m, locked: newLocked };
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

/* ---- 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7 & §9) --------------------------------
   Erkennt geometrische Formen aus GEFRORENEN Gletschern und gibt einen Burst-Faktor je Feld zurück (überlappende
   Formen stapeln multiplikativ). Immer an, wenn Gletscher aktiv. Eiswall verstärkt die „Linie". ⚠ Werte Platzhalter. */
export const GEO_BLOCK = 1.15;    // 2×2-Quadrat (Dichte-Sockel)
export const GEO_KREUZ = 1.25;    // Zentrum + 4 orthogonale (Kollisions-Knoten)
export const GEO_LINIE = 1.30;    // volle Reihe (5) oder Spalte (8)
export const GEO_FLAECHE = 1.50;  // gefülltes 3×3 (Endgame-Mega-Cluster)
export const EISWALL_LINIE = 1.60; // Eiswall hebt die Linie an

export function glacierGeometry(locked, opts = {}) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const f = new Array(N_POS).fill(1);
  const mark = (p, factor) => { f[p] *= factor; };
  const linieFactor = opts.eiswall ? EISWALL_LINIE : GEO_LINIE;
  // Linie: volle Reihe (5 Spalten)
  for (let r = 0; r < 8; r++) { let full = true; for (let c = 0; c < 5; c++) if (!isG(posOf(r, c))) { full = false; break; } if (full) for (let c = 0; c < 5; c++) mark(posOf(r, c), linieFactor); }
  // Linie: volle Spalte (8 Zeilen)
  for (let c = 0; c < 5; c++) { let full = true; for (let r = 0; r < 8; r++) if (!isG(posOf(r, c))) { full = false; break; } if (full) for (let r = 0; r < 8; r++) mark(posOf(r, c), linieFactor); }
  // Block: gefülltes 2×2
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++)
    if (isG(posOf(r, c)) && isG(posOf(r, c + 1)) && isG(posOf(r + 1, c)) && isG(posOf(r + 1, c + 1)))
      for (const p of [posOf(r, c), posOf(r, c + 1), posOf(r + 1, c), posOf(r + 1, c + 1)]) mark(p, GEO_BLOCK);
  // Kreuz: Zentrum + 4 orthogonale Nachbarn
  for (let r = 1; r < 7; r++) for (let c = 1; c < 4; c++) {
    const ctr = posOf(r, c);
    if (isG(ctr) && isG(posOf(r - 1, c)) && isG(posOf(r + 1, c)) && isG(posOf(r, c - 1)) && isG(posOf(r, c + 1)))
      for (const p of [ctr, posOf(r - 1, c), posOf(r + 1, c), posOf(r, c - 1), posOf(r, c + 1)]) mark(p, GEO_KREUZ);
  }
  // Große Fläche: gefülltes 3×3
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    let full = true;
    for (let dr = 0; dr < 3 && full; dr++) for (let dc = 0; dc < 3; dc++) if (!isG(posOf(r + dr, c + dc))) { full = false; break; }
    if (full) for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) mark(posOf(r + dr, c + dc), GEO_FLAECHE);
  }
  return f;
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
  KETTENBRUCH: "G_KETTENBRUCH",   // Lawine: Bruch zwingt angrenzende Gletscher mitzubrechen (die echte Kaskade)
  GLETSCHERSTURZ: "G_GLETSCHERSTURZ", // Lawine: je mehr Gletscher im Durchlauf brechen, desto stärker jeder Bruch
  EISWALL: "G_EISWALL",           // Eisschild: komplett gefrorene Reihe/Spalte (die „Linie") → verstärkt alle ihre Gletscher
  EINFRIEREN: "G_EINFRIEREN",     // Frostgriff: bricht ein Gletscher, verliert die getroffene Gegnerkarte ihren nächsten Stich garantiert
  FROSTBUND: "G_FROSTBUND",       // Frostgriff: bricht ein Gletscher auf einen Nicht-Eis-Nachbarn (2. Archetyp) → bufft ihn (+Stichwert)
  VERDICHTUNG: "G_VERDICHTUNG",   // Firn: der Gebäude-Wertbonus auf einem Gletscher wird nicht ausgespielt, sondern in Masse getankt
  // Legendäre (Capstones, docs §7):
  L_LAWINE: "G_L_LAWINE",         // Große Lawine: ein Snapshot, in dem ALLES bricht (Schwellen ignoriert, volle Stufe)
  L_SCHILD: "G_L_SCHILD",         // Ewiges Schild: das ganze zusammenhängende Feld zählt als EIN Übergletscher
  L_EISZEIT: "G_L_EISZEIT",       // Eiszeit: Dauerfrost im Overdrive — das Brett flutet, Karten frieren nach und nach ein
  L_ERSTARRUNG: "G_L_ERSTARRUNG", // Erstarrung: jede vom Bruch getroffene Gegnerkarte verliert ihren Stich; Reichweite +1 ins Gegnerfeld
};
export const FROSTBUND_BUFF = 3;  // Frostbund: Wert-Buff auf die getroffene Nicht-Eis-Nachbarkarte (nächster Durchlauf)
export const VERDICHTUNG_RATE = 0.25; // Verdichtung: je 4 Gebäude-Bonuswert → +1 Masse (docs §4 Firn)
export const ZERMALMEN_KOLLISION = 2;                   // Kollision 1,5→2
export const ABBRUCHKANTE_TIER_MULT = [0, 1, 1.8, 3.0]; // steiler als Baseline [0,1,1.5,2.2]

// Baut das opts-Objekt für precomputeGlacier aus den aktiven Rollen (Gruppe A). Mehrere Rollen komponieren additiv.
export function glacierOpts(roles = []) {
  const has = (r) => roles.includes(r);
  const opts = {};
  if (has(ROLES.RISSBILDUNG)) opts.burstAt = RISSBILDUNG_BURST;   // bricht schon bei niedriger Masse (Tempo)
  if (has(ROLES.ABBRUCHKANTE)) opts.tierMult = ABBRUCHKANTE_TIER_MULT;
  if (has(ROLES.ZERMALMEN)) opts.kollisionMult = ZERMALMEN_KOLLISION;
  if (has(ROLES.EISBRUECKE)) opts.neighborFn = neighbors8;   // Kaskade/Kollision/Kette über 8-Nachbarschaft
  if (has(ROLES.KETTENBRUCH)) opts.kettenbruch = true;
  if (has(ROLES.GLETSCHERSTURZ)) opts.gletschersturz = true;
  if (has(ROLES.L_LAWINE)) opts.grosseLawine = true;         // Legendär: alles bricht
  if (has(ROLES.L_SCHILD)) opts.ewigesSchild = true;         // Legendär: Übergletscher
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
