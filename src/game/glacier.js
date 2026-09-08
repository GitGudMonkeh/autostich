/* Eis-Neudesign — Fundament ("Gletscher, Brechen & Kaskade"). Reine, deterministische Kern-Logik.
   NEU-Design, isoliert vom bestehenden Eis-Archetyp (skills.js/engine.js Ice-Block) — gegatet später über
   activeArchetypes "ice". Design-Referenz: docs/eis-rework.md.

   Mentalmodell (docs §2): Masse liegt auf dem BRETTFELD (Firn-Boden), nicht auf der Karte. Ein Gletscher ist ein
   festgefrorenes Feld. Zum Durchlauf-Anfang wird der ganze Bruch auf dem statischen Brett vorab gerechnet
   (Snapshot, analog precomputeArchitect) und dann pro Stich ausgezahlt.

   Hier stehen nur die Zahlen, die OHNE Skill gelten (Schwellen, Kaskade, Kollision, Passiv, Legendäre). Alles, was ein
   Skill verstellt, kommt als Parameter herein — seine Stufenleiter steht in skills.js (EIS), gelesen von factions/ice.js.
   ⚠ ZAHLEN SIND PLATZHALTER — die endgültigen Werte fallen am Sim/Playtest (docs §2.3, §8). */

import { N_POS, rowOf, colOf, posOf } from "./architect.js"; // Brett-Geometrie 8×5, Single Source
import { envNum } from "./constants.js";                     // Sim-übersteuerbare Grundzahl (Sweep ohne Code-Änderung)

/* ---- TUNING-Block (Platzhalter, Sim-tunebar) ------------------------------------------------------ */
export const THRESHOLDS = [4, 8, 12];          // Schwellen-Stufen; Stufe = #Schwellen ≤ Masse (0..3)
export const TIER_MULT = [0, 1, 1.5, 2.2];     // überlineare Wucht je Stufe (Stufe 0 bricht nicht)
// Globaler Burst-Skalierer: die Gletscher SIND der Hauptscore (nicht das Deck) — einzelne, massive Hits. Frequenz bleibt
// (kein schnelleres Bersten), nur die Wucht je Bruch. §5.5: der weiche Deckel je Einzelbruch ist gestrichen (§1 der
// Doku: keine Deckel, lieber niedrigere Werte). Er hatte die ganze Fraktion flach gemacht — in der Großen Fläche kamen
// 49 % des Bruchs an, und ein Verstärker mit nominal +18 % brachte +2,2 %. Statt seiner steht die Grundzahl tiefer.
// §5.6: seit die Geo-Formen nicht mehr stapeln, ist die Kurve flacher und die Grundzahl darf wieder höher stehen.
export const BURST_SCALE = envNum("SIM_GLACIER_BURST_SCALE", 250); // §5.6 neu tariert: 170 → 250, weil die Geometrie nicht mehr stapelt (Eis 6,58M gegen Feuer 6,42M)
// Große Lawine (§5.8, Owner): feuert nicht mehr einmal am Laufende, sondern im TAKT — jeden GROSSE_LAWINE_EVERY-ten
// Durchlauf bricht das ganze Feld auf einen Schlag, jeder Gletscher mit der Wucht der höchsten Schwelle. Damit ist sie
// den ganzen Lauf über sichtbar, und sie synchronisiert das Feld: Kaskade, Kollision und Gletschersturz greifen
// gleichzeitig. Der Preis ist die niedrigere Masse je Bruch, weil niemand mehr bis 12 wächst.
export const GROSSE_LAWINE_EVERY = envNum("SIM_GLACIER_LAWINE_EVERY", 5);
// Verstärker je Lawinen-Bruch. §5.9 gemessen und korrigiert: die Senkung auf ×2 („sie feuert fünfmal statt einmal")
// war ein Denkfehler — der erzwungene Bruch ERSETZT einen Bruch, der ohnehin gekommen wäre, der Verstärker ist also
// keine Prämie je Auslösung, sondern die Entschädigung für die niedrigere Masse. Sweep: ×2 → −8 %, ×6 → +13 %,
// ×10 → +29 %. ×10 ist der beste gemessene Wert; das Band der übrigen elf beginnt bei +34 %.
export const GROSSE_LAWINE_MULT = envNum("SIM_GLACIER_LAWINE_MULT", 10);
// Ablehn-Gletscher (Sim-tunebar): ab so vielen gehaltenen Eis-Skills friert auch das Ablehnen eines Skill-Angebots einen
// Gletscher (statt nur der Skill-Pick/Tausch). Entkoppelt „mehr Gletscher" vom Tauschen guter Skills.
export const DECLINE_MIN_SKILLS = 4;
// §5.5 (Owner-Frage): Wie viele Karten friert EIN Eis-Skill-Pick fest? Bisher genau eine — der Verdacht ist, dass die
// Fraktion daran hängt, weil ein Cluster über 7 Picks nie dicht wird. Regler, damit 1–3 messbar sind.
export const GLACIER_PER_PICK = envNum("SIM_GLACIER_PER_PICK", 1);
// §5.13 (Owner-Entscheid a): Ewiges Schild friert je Eis-Pick SO VIELE Felder — es bringt das breite Brett mit, auf
// das seine drei Wirkungen warten. §5.12 hat gemessen, dass alle drei erst ab drei Gletschern zahlen, das gemischte
// Angebot aber im Schnitt 1,83 stellt. Sweep: 2 → +2 %, 3 → +17 %, 4 → +25 %, 5 → +42 %. Bei 4 füllen drei Eis-Picks
// das Brett auf genau GLACIER_MAX. Gilt nur für den Pick, nicht für den Ablehn-Gletscher.
export const SCHILD_PER_PICK = envNum("SIM_GLACIER_SCHILD_PER_PICK", 4);
// Optionaler Deckel auf die GESAMTZAHL der Gletscher (0 = keiner). Nicht der gestrichene Score-Deckel aus §5.5, sondern
// eine Grenze für das Brett: ein Voll-Mono-Eis-Build soll nicht die ganze Aufstellung einfrieren können.
export const GLACIER_MAX = envNum("SIM_GLACIER_MAX", 12); // §5.5: 12 lässt die Große Fläche (3×3, neun Gletscher) zu und hält drei Felder Luft
export const KASKADE_PER_NEIGHBOR = 0.25;      // Berst-Faktor = 1 + 0,25 × Gletscher-Nachbarn (Dichte)
export const KOLLISION_MULT = 1.5;             // Treffer auf Gletscher-Nachbarn (anteilig, docs §2.3)
export const EWIGER_FROST = 1;                 // Fraktions-Passiv: bedingungsloser Masse-Tick je Durchlauf (docs §2.6)
export const WIN_MASS = 1;                     // Baseline: Sieg eines Gletschers → +Masse (docs §2.2)
export const TOP = THRESHOLDS[THRESHOLDS.length - 1]; // höchste Stufe (Überlauf-Grenze)
// Berst-Kadenz (docs §2.3, „einzelne massive Hits"): ein Gletscher HÄLT & wächst, bis er die höchste Schwelle erreicht,
// dann bricht er gewaltig (volle Stufe) und kalbt zurück. Selten + eskalierend statt häufig+klein.
export const BURST_AT = TOP;                    // natürliche Berst-Schwelle = höchste Stufe (12)
export const RESET_TO = 0;                      // nach dem Bruch abgekalbt → baut wieder von unten auf
// #386 Firn-Boden-Reserve: der auf offenem Boden angesammelte Firn (firnStack) ist die RESERVE eines Feldes. Wird ein Feld
// gefroren, startet der Gletscher LEER (Masse 0) und zieht zum Rundenstart aus seiner Reserve wieder auf FIRN_REFILL_TARGET
// (=TOP, volle Masse) auf — nur die Differenz zur selbst-erzeugten Masse. Die Reserve ist ungedeckelt und leert sich Runde
// für Runde, bis sie leer ist. Trennung von glacierMass (Gletscher-Eigenmasse) und firnStack (Boden-Reserve).
export const FIRN_REFILL_TARGET = TOP;          // Runden-Start-Nachschub-Ziel: volle Masse (12)

/* ---- Geometrie: 4 orthogonale Nachbarn (links/rechts/oben/unten) auf dem 8×5-Brett ---------------- */
export function neighbors4(p) {
  const r = rowOf(p), c = colOf(p), out = [];
  if (r > 0) out.push(posOf(r - 1, c));                 // oben
  if (r < 7) out.push(posOf(r + 1, c));                 // unten
  if (c > 0) out.push(posOf(r, c - 1));                 // links
  if (c < 4) out.push(posOf(r, c + 1));                 // rechts
  return out;
}

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
  // Eisbrücke (§5.2): die Diagonale zählt nur ANTEILIG als Nachbar — das Gewicht ist die Stufenleiter des Skills.
  // Ohne Eisbrücke ist neighborFn die 4er-Liste, dort ist nie eine Diagonale dabei und das Gewicht bleibt wirkungslos.
  const diagWeight = opts.diagWeight ?? 1;
  const wOf = (p, n) => (rowOf(p) !== rowOf(n) && colOf(p) !== colOf(n) ? diagWeight : 1);
  const kettenbruchDepth = opts.kettenbruchDepth || 0;  // Kettenbruch: wie viele Schritte die Kette weiterläuft (0 = aus)
  const gletschersturzPer = opts.gletschersturzPer || 0; // Amp ∝ Bruch-Zahl
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
  if (kettenbruchDepth > 0) {
    // Breitensuche statt Flut: die Kette läuft nur `kettenbruchDepth` Schritte weit (Stufenleiter §5.2).
    let front = queue.slice();
    for (let step = 0; step < kettenbruchDepth && front.length; step++) {
      const next = [];
      for (const q of front) for (const n of neighborFn(q)) if (isG(n) && !isBreaker[n]) { isBreaker[n] = true; forced[n] = true; next.push(n); }
      front = next;
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
    // Große Lawine bricht ALLES auf voller Stufe (echter Finisher); Kettenbruch-erzwungene mind. Stufe 1; sonst natürliche Stufe.
    const effTier = grosseLawine ? (tierMult.length - 1) : (forced[p] ? Math.max(1, natTier[p]) : natTier[p]);
    const nb = neighborFn(p);
    const gN = ewigesSchild ? Math.max(0, totalG - 1) : nb.reduce((t, n) => t + (isG(n) ? wOf(p, n) : 0), 0); // Ewiges Schild: ganzes Feld gilt als angrenzend
    const berstFaktor = 1 + kaskade * gN;               // Kaskade (Dichte)
    const kollFrac = ewigesSchild ? 1 : (nb.length ? gN / nb.length : 0);
    const kollFaktor = 1 + (kollision - 1) * kollFrac;  // Kollision (anteilig)
    const geoFactor = formFactor ? (formFactor[p] || 1) : 1; // 2D-Geometrie (Block/Kreuz/Linie/Fläche)
    let burst = mCap[p] * tierMult[effTier] * berstFaktor * kollFaktor * sturzFactor * geoFactor * BURST_SCALE;
    if (grosseLawine) burst *= GROSSE_LAWINE_MULT;        // Lawinen-Takt: Verstärker je erzwungenem Bruch
    payout[p] += burst;
    resetMass[p] = RESET_TO;                             // abgekalbt: baut wieder von unten auf (selten + gewaltig)
    breaks.push({ pos: p, tier: effTier, burst, glacierNeighbors: gN, forced: forced[p] });
  }
  return { payout, resetMass, breaks, grosseLawine }; // grosseLawine: dieser Durchlauf ist der Große-Lawine-Finisher (HUD zeigt „Lawine")
}

/* ---- Cluster/Dichte — Nachbar-/Cluster-Infrastruktur (docs §4 Eisschild) ------------------------- */
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

// Ewiges Schild (Legendär, docs §7): das GESAMTE Feld poolt als ein Übergletscher — alle Gletscher aufs MAXIMUM heben
// (nie fallend), unabhängig von Nachbarschaft. (§5.8: der frühere additive Feld-Bonus obendrauf ist gestrichen — die
// Masse ist beim Bruch auf die höchste Schwelle gedeckelt, alles darüber verfiel als Überlauf zu fast nichts. An seine
// Stelle tritt der Formations-Anteil in der Engine: das ganze Feld erbt die stärkste Gletscher-Formation des Bretts.)
export function uebergletscherPool(mass, locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  const gs = []; for (let p = 0; p < N_POS; p++) if (isG(p)) gs.push(p);
  if (gs.length < 2) return out;
  const mx = gs.reduce((m, p) => Math.max(m, out[p] || 0), 0);
  for (const p of gs) out[p] = Math.max(out[p] || 0, mx); // aufs Max heben, nie fallend
  return out;
}

// Eiszeit (Legendär, docs §7): Dauerfrost im Overdrive — am Durchlauf-Ende flutet das GANZE Brett (alle ungefrorenen
// Felder, flach, ohne Nachbar-Dämpfung), und das höchste ungefrorene Feld friert zum Gletscher ein (Karten frieren nach
// und nach über die Restrunden). Gibt { mass, locked } zurück. ⚠ Flutrate Platzhalter.
// #386: `mass` ist die Firn-Boden-RESERVE (firnStack) — die Flut füllt die Reserve offener Felder, die Auto-Freeze-Wahl
// liest die höchste Reserve. Der neu gefrorene Gletscher startet mit Masse 0 (in glacierMass, hier nicht berührt) und
// zieht ab dem nächsten Rundenstart aus seiner Reserve auf.
export const EISZEIT_FLOOD = envNum("SIM_GLACIER_EISZEIT_FLOOD", 3);
// §5.5: der Runaway-Deckel auf die Gletscherzahl ist gestrichen (§1: keine Deckel). Die Eiszeit kriecht jetzt bis ans
// Brettende weiter; der Regler ist die Flutrate, nicht eine Obergrenze.
export function eiszeitTick(mass, locked, base = EISZEIT_FLOOD, maxGlaciers = Infinity, blocked = []) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const isBlocked = (p) => (blocked instanceof Set ? blocked.has(p) : Array.isArray(blocked) && blocked.includes(p)); // #301 C3: nie einfrierbar
  const m = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  let count = 0;
  for (let p = 0; p < N_POS; p++) { if (isG(p)) count++; else m[p] = (m[p] || 0) + base; } // brettweite Flut + Gletscher zählen
  let newLocked = locked;
  if (count < maxGlaciers) { // Auto-Freeze nur unter dem Deckel: das höchste offene Feld friert ein
    let best = -1, bestV = -Infinity;
    for (let p = 0; p < N_POS; p++) if (!isG(p) && !isBlocked(p) && (m[p] || 0) > bestV) { bestV = m[p] || 0; best = p; } // #301: gesperrte Zellen überspringen
    if (best >= 0) {
      if (locked instanceof Set) { newLocked = new Set(locked); newLocked.add(best); }
      else { newLocked = (locked ? locked.slice() : new Array(N_POS).fill(false)); newLocked[best] = true; }
    }
  }
  return { mass: m, locked: newLocked };
}

// Packeis (docs §4): am Durchlauf-Ende +Masse je Gletscher-Nachbar — belohnt die Mitte des Feldes.
export function packeisTick(mass, locked, neighborFn = neighbors4, per = 0) {
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
export function verzahnungTick(mass, locked, neighborFn = neighbors4, per = 0) {
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (const cl of glacierClusters(locked, neighborFn)) {
    const gain = per * cl.length;
    for (const p of cl) out[p] = (out[p] || 0) + gain;
  }
  return out;
}

/* ---- 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7 & §9) --------------------------------
   Erkennt geometrische Formen aus GEFRORENEN Gletschern und gibt einen Burst-Faktor je Feld zurück. Überlappende
   Formen stapeln NICHT: die stärkste zählt (§5.6). Vorher multiplizierten sie sich, und weil ein dichtes Feld viele
   Formen zugleich erfüllt, wuchs der Feld-Bruch von 4 auf 16 Gletscher um das 23-fache statt um das 8-fache — der
   Runaway der Fraktion saß hier, nicht in der Grundzahl. Immer an, wenn Gletscher aktiv. Eiswall hebt die „Linie". */
export const GEO_BLOCK = 1.15;    // 2×2-Quadrat (Dichte-Sockel)
export const GEO_KREUZ = 1.25;    // Zentrum + 4 orthogonale (Kollisions-Knoten)
export const GEO_LINIE = 1.30;    // volle Reihe (5) oder Spalte (8)
export const GEO_FLAECHE = 1.50;  // gefülltes 3×3 (Endgame-Mega-Cluster)

// Detail-Variante (für UI: Karten-Badge, Formationsbeschreibung, HUD-Multiplikator): liefert
//   { factor:[40] (wie glacierGeometry), forms:[{type,factor,positions}] (aktive benannte Formen), formPos:Set<pos> }.
export function glacierFormations(locked, opts = {}) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const f = new Array(N_POS).fill(1);
  const forms = [], formPos = new Set();
  const addForm = (type, factor, positions) => { forms.push({ type, factor, positions }); for (const p of positions) { f[p] = Math.max(f[p], factor); formPos.add(p); } };
  const linieFactor = opts.eiswallLinie || GEO_LINIE;
  // Linie: volle Reihe (5 Spalten)
  for (let r = 0; r < 8; r++) { let full = true; for (let c = 0; c < 5; c++) if (!isG(posOf(r, c))) { full = false; break; } if (full) addForm("linie", linieFactor, Array.from({ length: 5 }, (_, c) => posOf(r, c))); }
  // Linie: volle Spalte (8 Zeilen)
  for (let c = 0; c < 5; c++) { let full = true; for (let r = 0; r < 8; r++) if (!isG(posOf(r, c))) { full = false; break; } if (full) addForm("linie", linieFactor, Array.from({ length: 8 }, (_, r) => posOf(r, c))); }
  // Block: gefülltes 2×2
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++)
    if (isG(posOf(r, c)) && isG(posOf(r, c + 1)) && isG(posOf(r + 1, c)) && isG(posOf(r + 1, c + 1)))
      addForm("block", GEO_BLOCK, [posOf(r, c), posOf(r, c + 1), posOf(r + 1, c), posOf(r + 1, c + 1)]);
  // Kreuz: Zentrum + 4 orthogonale Nachbarn
  for (let r = 1; r < 7; r++) for (let c = 1; c < 4; c++) {
    const ctr = posOf(r, c);
    if (isG(ctr) && isG(posOf(r - 1, c)) && isG(posOf(r + 1, c)) && isG(posOf(r, c - 1)) && isG(posOf(r, c + 1)))
      addForm("kreuz", GEO_KREUZ, [ctr, posOf(r - 1, c), posOf(r + 1, c), posOf(r, c - 1), posOf(r, c + 1)]);
  }
  // Große Fläche: gefülltes 3×3
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    let full = true;
    for (let dr = 0; dr < 3 && full; dr++) for (let dc = 0; dc < 3; dc++) if (!isG(posOf(r + dr, c + dc))) { full = false; break; }
    if (full) { const ps = []; for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) ps.push(posOf(r + dr, c + dc)); addForm("flaeche", GEO_FLAECHE, ps); }
  }
  return { factor: f, forms, formPos };
}
// Engine-Pfad (Burst-Faktor je Feld): nur das Faktor-Array.
export const glacierGeometry = (locked, opts = {}) => glacierFormations(locked, opts).factor;
// Anzeigenamen der 2D-Gletscher-Formen (UI).
export const GLACIER_FORM_LABEL = { block: "Block", kreuz: "Kreuz", linie: "Linie", flaeche: "Große Fläche" };

/* ---- Rollen-Schlüssel (docs §4) — die Engine gattert über sie, die ZAHLEN je Stufe liefert factions/ice.js. */
export const ROLES = {
  RISSBILDUNG: "G_RISSBILDUNG",   // instabiles Eis: erste Schwelle runter → bricht früh & oft
  ABBRUCHKANTE: "G_ABBRUCHKANTE", // belohnt hohe Stufen noch steiler (Riesen)
  ANFRIEREN: "G_ANFRIEREN",       // Firn: Sieg → +Masse extra; Formations-Sieg → doppelt
  SCHNEETREIBEN: "G_SCHNEETREIBEN", // Firn: Verwehung — Sieg verweht Firn in die Boden-Reserve des Nachbarfelds (#386: nur offener Boden, nie unter einen Gletscher)
  DAUERFROST: "G_DAUERFROST",     // Firn: offener Boden friert am tiefsten — passiver Frost in die Boden-Reserve (fern; #386 firnStack)
  EISPANZER: "G_EISPANZER",       // Frostgriff: Niederlage neben Gletscher folgenlos + füttert Masse (der Gletscher frisst, was zerbricht)
  PACKEIS: "G_PACKEIS",           // Eisschild: Gletscher mit vielen Gletscher-Nachbarn → Bonus-Masse (belohnt die Mitte)
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
};


/* ---- Ewiger Frost: bedingungsloser Masse-Tick je Durchlauf (Fraktions-Passiv, docs §2.6) ----------
   Am Durchlauf-ENDE anzuwenden (nach Auszahlung), auf jeden Gletscher. Klein gehalten (Sockel, nicht Motor). */
export function ewigerFrostTick(mass, locked, amount = EWIGER_FROST) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) if (isG(p)) out[p] = (out[p] || 0) + amount;
  return out;
}

/* ---- Masse-Quellen (docs §4 Firn) ---------------------------------------------------------------- */
// Schneetreiben (Verwehung, docs §4): Zielfeld für die Verwehung — ein NICHT-Gletscher-Nachbarfeld (offener Boden, wo Firn
// als Reserve gesät wird). Deterministisch (niedrigster Index in der neighbors4-Reihenfolge). null, wenn keine Nachbarn ODER
// alle Nachbarn Gletscher sind. #386: Firn wird NIE unter einen Gletscher gesät → kein Gletscher-Fallback mehr.
export function driftTargets(pos, locked, count = 1) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  return neighbors4(pos).filter((p) => !isG(p)).slice(0, Math.max(0, count));
}

// Dauerfrost (docs §4 Firn): am Durchlauf-ENDE frosten UNGEFRORENE Felder nach ABSTAND zum nächsten Gletscher
// (King-Move/Chebyshev, weil „die 8 direkt um einen Gletscher"): Abstand 1 (der 8er-Ring) → 0, Abstand 2 → NEAR,
// Abstand ≥3 (oder gar kein Gletscher) → FAR. Bewusst einfache Bänder statt Bruch-Skalierung. #386: schreibt in die
// Firn-Boden-RESERVE (firnStack), nie unter einen Gletscher — die Engine reicht das firnStack-Array herein.
export function dauerfrostTick(mass, locked, near = 0, far = 0) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const glaciers = [];
  for (let p = 0; p < N_POS; p++) if (isG(p)) glaciers.push(p);
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let p = 0; p < N_POS; p++) {
    if (isG(p)) continue;                                 // nur ungefrorene Felder (Gletscher laden über Anfrieren/Ewiger Frost)
    let dist = Infinity;
    for (const g of glaciers) {
      const cd = Math.max(Math.abs(rowOf(p) - rowOf(g)), Math.abs(colOf(p) - colOf(g)));
      if (cd < dist) { dist = cd; if (dist <= 1) break; }
    }
    const add = dist <= 1 ? 0 : (dist === 2 ? near : far);
    if (add > 0) out[p] = (out[p] || 0) + add;
  }
  return out;
}
