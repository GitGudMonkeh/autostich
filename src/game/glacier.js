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
// §5.18 (Owner): eine VIERTE Schwelle über der Berst-Schwelle. Gebrochen wird weiter ab BURST_AT (12) — die 18
// erreicht nur, wer in EINEM Durchlauf über die Schwelle hinausschießt. Damit lohnt Anhäufen erstmals über 12.
/* §5.29 (Owner: „1." — die Leiter nach oben öffnen): über der vierten Schwelle ging es bisher nicht weiter, und
   damit war ANSAMMELN nicht bezahlbar. Gemessen (§5.28 D): ein Drei-Gletscher-Build sitzt mit Ø 17,6 Masse schon an
   der obersten Sprosse und wandelt jede weitere Masse nur noch linear, während ein Zwölfer mit 11,3 unter der
   Berst-Schwelle sitzt und dieselbe Masse doppelt zahlt. Genau deshalb half das Boden-Einkommen den vielen mehr als
   den wenigen. Die Fortsetzung hält den Rhythmus der bestehenden Leiter bei: Schwellen ×1,5, Wucht ×1,45 je Sprosse. */
export const THRESHOLDS = [4, 8, 12, 18, 27, 40, 60];  // Schwellen-Stufen; Stufe = #Schwellen ≤ Masse (0..7)
export const TIER_MULT = [0, 1, 1.5, 2.2, 3.2, 4.6, 6.7, 9.7]; // überlineare Wucht je Stufe (Stufe 0 bricht nicht)
// Globaler Burst-Skalierer: die Gletscher SIND der Hauptscore (nicht das Deck) — einzelne, massive Hits. Frequenz bleibt
// (kein schnelleres Bersten), nur die Wucht je Bruch. §5.5: der weiche Deckel je Einzelbruch ist gestrichen (§1 der
// Doku: keine Deckel, lieber niedrigere Werte). Er hatte die ganze Fraktion flach gemacht — in der Großen Fläche kamen
// 49 % des Bruchs an, und ein Verstärker mit nominal +18 % brachte +2,2 %. Statt seiner steht die Grundzahl tiefer.
// §5.6: seit die Geo-Formen nicht mehr stapeln, ist die Kurve flacher und die Grundzahl darf wieder höher stehen.
// §5.18 neu tariert: 250 → 150 (F2/F3 hoben den Bruch selbst und multiplizierten die Legendären mit).
// §5.21 nachtariert: 150 → 105 (der Kettenbruch sammelt Masse in die vierte Schwelle, statt sie zu verbrennen).
// §5.23 nachtariert: 105 → 75. Zwei Posten: der gestrichene Kettenbruch war ein Fallen-Skill (gemessen Lift 0,68), und
// die Fraktion stand ohne ihn schon auf 1,15× Feuer; das Eisbeben legt darauf. Gemessen 75 → Median-Parität 1,01×.
// §5.24 nachtariert: 75 → 64. Derselbe Posten wie zuvor: der Eiswall zahlt jetzt in JEDEM Eis-Bau statt nur im
// Reihen-Bau, das hebt den Boden der Fraktion (1,00× → 1,16×). Gemessen 64 → Median-Parität 1,00×.
// §5.25 nachtariert: 64 → 60. Das Einfrieren nimmt jetzt die höchsten Gegnerkarten; die Stichquote steigt 59,6 → 62 %,
// und ein gewonnener Gletscher-Stich zahlt den vollen Sieg-Stack (glacierWinMult). Gemessen 60 → Parität 1,01×.
// §5.27 nachtariert: 60 → 30. Der offene Zug (s. FIRN_DRAW) verdoppelt das Masse-Einkommen der Fraktion — jeder Punkt
// Schnee kommt jetzt an, statt mit 1 je Durchlauf zu tröpfeln. Ohne Nachtarierung stand Eis bei 1,97× Feuer.
// (Gemessen 28 → 0,97×; der Owner nimmt die rundere 30, die im Band bleibt.)
// §8 nachtariert: 30 → 24 (Boden-Einkommen). §5.29 erneut: 24 → 20, weil die offene Leiter und das höhere
// Boden-Einkommen den Motor noch einmal heben. Ziel ist der Stand VOR der Runde (Eis mono 6,73M im Cross-Lauf über
// 400–500 Läufe): die Runde soll die FORM ändern, nicht die Höhe. Parität ist eine eigene Owner-Entscheidung.
/* §7.71/§7.72 (Owner-Idee, dann „wir nehmen 80"): 20 → 80. Die Parität ist damit zur Owner-Entscheidung geworden,
   die §5.29 sich noch offengehalten hat. Der Sweep (§7.71, `--only cross`, 8.000 Läufe je Wert) zeigt, dass dieser
   Regler nicht nur die HÖHE von Eis bewegt, sondern seine ANSTECKUNG: 20/40/60/100 → Eis 6,4/10,2/13,9/21,7 Mio
   und Bl+Ei 0,40/0,51/0,63/0,82× · Fe+Ei 0,83/1,09/1,33/1,80× · Ei+Pf 0,65/0,79/0,92/1,09×. Damit ist die
   Diagnose aus §8 korrigiert: Eis war nicht ansteckend, weil man im Mischbau zu wenige Eis-Skills hält, sondern
   weil ein Gletscher eine BRETTPOSITION kostet und zu wenig dafür zahlte — jede Eis-Position war ein Downgrade.
   80 statt 100, damit der Playtest in beide Richtungen tarieren kann (Owner). Eis skaliert unterlinear (×5 am
   Regler gibt ×3,4), es sättigt an den Masse-Schwellen — wer weiter hebt, stößt an die Decke statt an den Preis.
   2026-09-12 (Owner: „burst_scale runter auf 60"): 80 → 60, und genau dafür war die Reserve nach oben und unten
   gedacht. Anlass sind die zwei Eis-Buffs desselben Tages (Schneetreiben, Packeis), die den ZUFALLSSPIELER um
   41 % gehoben haben — derselbe Befund wie §7.72 B, weil Gletscher unabhängig vom Rest des Builds zahlen. Der
   Regler ist der eine Griff, der die ganze Fraktion gleichmäßig senkt, statt einen frisch reparierten Skill
   wieder totzuschneiden (die Lehre aus §7.66). Der Sweep oben bleibt gültig, 60 steht darin. UNGEMESSEN in der
   neuen Kombination: der Sweep lief vor beiden Buffs. */
export const BURST_SCALE = envNum("SIM_GLACIER_BURST_SCALE", 60);
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
// (Der Ablehn-Gletscher ab vier gehaltenen Eis-Skills ist gestrichen, Owner §5.33: sein Zweck war der Ausgleich für
// volle Skill-Slots, und die gibt es seit dem exp-Skill-Rework nicht mehr. Gletscher kommen nur noch aus Eis-Picks.)
// §5.5 (Owner-Frage): Wie viele Karten friert EIN Eis-Skill-Pick fest? Bisher genau eine — der Verdacht ist, dass die
// Fraktion daran hängt, weil ein Cluster über 7 Picks nie dicht wird. Regler, damit 1–3 messbar sind.
export const GLACIER_PER_PICK = envNum("SIM_GLACIER_PER_PICK", 1);
// §5.13 (Owner-Entscheid a): Ewiges Schild friert je Eis-Pick SO VIELE Felder — es bringt das breite Brett mit, auf
// das seine drei Wirkungen warten. §5.12 hat gemessen, dass alle drei erst ab drei Gletschern zahlen, das gemischte
// Angebot aber im Schnitt 1,83 stellt. Sweep unter dem Deckel: 2 → +2 %, 3 → +17 %, 4 → +25 %, 5 → +42 %.
// §5.14 (Owner): 3 je Pick, dafür hebt das Schild GLACIER_MAX auf — die Grenze sind dann die freien Felder.
// Gilt für den Pick; der Ablehn-Gletscher bleibt bei einem, ist aber ebenfalls ungedeckelt.
export const SCHILD_PER_PICK = envNum("SIM_GLACIER_SCHILD_PER_PICK", 3);
// §5.19: wie viele Nachbarn das Schild einem Gletscher höchstens zurechnet. 8 = voll umschlossen, die Obergrenze, die
// ein Gletscher auf dem Brett überhaupt erreichen kann (Eisbrücke-Nachbarschaft). Ohne Deckel war die Kaskade
// quadratisch in der Feldgröße — s. precomputeGlacier.
export const SCHILD_NEIGHBORS = envNum("SIM_GLACIER_SCHILD_NEIGHBORS", 8);
// Optionaler Deckel auf die GESAMTZAHL der Gletscher (0 = keiner). Nicht der gestrichene Score-Deckel aus §5.5, sondern
// eine Grenze für das Brett: ein Voll-Mono-Eis-Build soll nicht die ganze Aufstellung einfrieren können.
export const GLACIER_MAX = envNum("SIM_GLACIER_MAX", 12); // §5.5: 12 lässt die Große Fläche (3×3, neun Gletscher) zu und hält drei Felder Luft
export const EISWALL_MIN = 3;                  // Eiswall (§5.24): ab dieser Kettenlänge zahlt die Wand — davor nichts
export const KASKADE_PER_NEIGHBOR = 0.25;      // Berst-Faktor = 1 + 0,25 × Gletscher-Nachbarn (Dichte)
export const KOLLISION_MULT = 1.5;             // Treffer auf Gletscher-Nachbarn (anteilig, docs §2.3)
export const EWIGER_FROST = 1;                 // Fraktions-Passiv: bedingungsloser Masse-Tick je Durchlauf (docs §2.6)
export const WIN_MASS = 1;                     // Baseline: Sieg eines Gletschers → +Masse (docs §2.2)
export const TOP = THRESHOLDS[THRESHOLDS.length - 1]; // höchste Stufe (18)
// Berst-Kadenz (docs §2.3, „einzelne massive Hits"): ein Gletscher HÄLT & wächst, bis er die höchste Schwelle erreicht,
// dann bricht er gewaltig (volle Stufe) und kalbt zurück. Selten + eskalierend statt häufig+klein.
// §5.18: die Berst-Schwelle ist NICHT mehr die höchste Stufe — sie bleibt bei 12, während die Leiter bis 18 reicht.
export const BURST_AT = THRESHOLDS[2];          // natürliche Berst-Schwelle (12)
// §5.18 (Owner): nach dem Bruch bleibt der ÜBERSCHUSS liegen (Masse − BURST_AT) statt auf null zu fallen. Damit ist der
// alte Überlauf-Score gestorben: er zahlte 1 Punkt je Masse neben einem Bruch, der mit BURST_SCALE rechnet — genau diese
// Masse trägt jetzt in den nächsten Durchlauf. Ein Ventil statt zwei.
// #386 Firn-Boden-Reserve: der auf offenem Boden angesammelte Firn (firnStack) ist die RESERVE eines Feldes. Wird ein Feld
// gefroren, startet der Gletscher LEER (Masse 0) und zieht zum Rundenstart aus seiner Reserve wieder auf FIRN_REFILL_TARGET
// auf — nur die Differenz zur selbst-erzeugten Masse. Ziel ist die BERST-Schwelle, nicht die höchste: sonst bekäme ein
// frisch gefrorenes Feld die vierte Stufe geschenkt. Die Reserve ist ungedeckelt und leert sich Runde für Runde.
export const FIRN_REFILL_TARGET = BURST_AT;     // Runden-Start-Nachschub-Ziel: volle Masse (12)
// §5.18: der Zug ist FUNDAMENT, nicht mehr Eiszeit-Mechanik — jedes offene Feld gibt so viel Reserve an den nächsten
// Gletscher ab. Ohne ihn zahlte Schnee nur, wenn genau dieses Feld später einfriert (gemessen 65 % totes Kapital, §5.17).
// §5.26 gemessen (Sweep 1 / 2 / 4 / alles): die 1 bremst NICHT die Firn-Skills — Schneetreiben blieb auf jeder Stufe
// negativ, Dauerfrost erreichte bestenfalls null. Was der offene Zug hebt, ist die EISZEIT (+59 % → +153 %), die jedes
// freie Feld flutet und dann leersaugt.
// §5.27 (Owner): der Deckel FÄLLT trotzdem — „es ist scheiße, dass wir mehr generieren als nutzen können". Jedes Feld
// gibt seine ganze Reserve ab; nichts liegt mehr ungenutzt herum. Dass die Eiszeit dadurch aus dem Band läuft, ist
// nach dem Grundsatz des Owners IHR Problem: Skills haben Vorrang, Legendäre werden um sie herum tariert.
// Der Regler bleibt für Diagnose-Sweeps (endlicher Wert = Deckel je Feld und Durchlauf, 0 = Zug ganz aus).
export const FIRN_DRAW = envNum("SIM_GLACIER_FIRN_DRAW", Infinity);
// §8 (Bestandsaufnahme): das Fraktions-Einkommen kommt jetzt zur Hälfte vom BRETT statt vom Gletscher. Jedes offene
// Feld friert je Durchlauf so viel Reserve an; der ZUG trägt sie zu den Gletschern. Der Punkt ist die ZAHL: das Brett
// stellt (40 − Gletscher) Felder, ist also fast konstant, während der Gletscher-Sockel (EWIGER_FROST + Siegmasse)
// linear mit den Picks wächst. Genau daran hing die Ansteckung — ein Misch-Build mit drei Picks bekam 18 % des
// Mono-Motors, und jede Kombination mit Eis fiel auf 0,43–0,63× derselben Kombination ohne Eis.
// Sonde `sim/probes/eis-kurve.mjs`, Anteil eines Drei-Gletscher-Builds am Mono-Motor: 0 → 18 %, 0,25 → 44 %,
// 0,35 → 52 %, 0,5 → 66 %, 0,75 → 74 %. Ab 0,75 kippt die Kurve (mehr Gletscher werden SCHLECHTER, weil jedes
// gefrorene Feld dem Brett eine Quelle nimmt). 0,35 hält Mono bei rund dem Doppelten eines Drei-Gletscher-Splashs.
// §5.29 nachgezogen: 0,35 → 0,6. Erst mit der offenen Leiter zahlt sich das Boden-Einkommen für WENIGE Gletscher aus —
// vorher saßen sie mit Ø 17,6 Masse an der obersten Sprosse fest. Anteil eines Drei-Gletscher-Builds am Zwölfer,
// gemessen am reinen Gletscher-Score: Leiter bis 18 → 0,27 · offene Leiter mit 0,35 → 0,38 · mit 0,6 → 0,59 ·
// mit 1,0 → 0,68. Ab 1,0 bläht sich der ganze Motor auf (Mono +47 %), ohne die Form noch viel zu verbessern.
export const FIRN_GROUND = envNum("SIM_GLACIER_FIRN_GROUND", 0.6);
// Deckel auf den LIEGENBLEIBENDEN Überschuss (nicht auf die Bruchmasse — der Deckel je Einzelbruch bleibt gestrichen,
// §5.5). Ohne ihn hat die Masse gar keine Decke mehr: ein ausgebautes Cluster gewinnt je Durchlauf mehr als der Bruch
// abzieht, und die Masse steigt unbegrenzt. 0 = kein Deckel.
export const KEEP_MAX = envNum("SIM_GLACIER_KEEP_MAX", 6);

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
  const eisbebenPer = opts.eisbebenPer || 0;            // Eisbeben: Nachbeben-Anteil je Punkt Masse über der Schwelle
  const eisbebenSturz = !!opts.eisbebenSturz;           // Episch: das Nachbeben zählt dem Gletschersturz als eigener Bruch
  const eiswallPer = opts.eiswallPer || 0;              // Eiswall: Zuschlag je Gletscher über EISWALL_MIN−1 in der geraden Kette
  const gletschersturzPer = opts.gletschersturzPer || 0; // Amp ∝ Bruch-Zahl
  const formFactor = opts.formFactor || null;           // 2D-Geometrie-Formationen: Burst-Faktor je Feld (docs §9)
  const grosseLawine = !!opts.grosseLawine;             // Legendär: ALLES bricht (Schwellen ignoriert)
  const ewigesSchild = !!opts.ewigesSchild;             // Legendär: das ganze Feld gilt als EIN Übergletscher (Kaskade = volle Feldgröße)
  const eiszeitPer = opts.eiszeitBurstPer || 0;         // Legendär Eiszeit: Bruch × offene Nachbarn (Spiegel der Kaskade)
  const burstAt = opts.burstAt ?? BURST_AT;             // natürliche Berst-Schwelle
  const keepMax = opts.keepMax ?? KEEP_MAX;             // Deckel auf den liegenbleibenden Überschuss (0 = keiner)
  const tOf = (m) => { let t = 0; for (const th of thresholds) if (m >= th) t++; return t; };

  const payout = new Array(N_POS).fill(0);
  const resetMass = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);

  // Vorbereitung: Masse und natürliche Stufe je Gletscher. §5.18: KEIN Deckel mehr auf der Bruchmasse und kein
  // Überlauf-Score — die Masse über der Berst-Schwelle geht in die Wucht und bleibt danach liegen (s. resetMass unten).
  const mNow = new Array(N_POS).fill(0);
  let totalG = 0;
  for (let p = 0; p < N_POS; p++) {
    if (!isG(p)) continue;
    totalG++;
    mNow[p] = resetMass[p] || 0;
  }

  // Breaker bestimmen: NATÜRLICH bricht nur, wer die Berst-Schwelle erreicht hat (halten & wachsen, dann gewaltig).
  // Große Lawine zwingt ALLE (auch nicht-reife), Kettenbruch flutet auf angrenzende Gletscher.
  const isBreaker = new Array(N_POS).fill(false), forced = new Array(N_POS).fill(false);
  for (let p = 0; p < N_POS; p++) if (isG(p)) {
    if (mNow[p] >= burstAt) { isBreaker[p] = true; }
    else if (grosseLawine) { isBreaker[p] = true; forced[p] = true; } // Große Lawine: auch unreife brechen
  }
  /* Eisbeben (§5.23, Owner) — auf dem Platz des gestrichenen Kettenbruchs: der Bruch bebt NACH. Je Punkt Masse ÜBER
     der Berst-Schwelle zählt er `eisbebenPer` zusätzlich; Episch zählt das Nachbeben dem Gletschersturz als eigener
     Bruch. Kein Nachbar wird angefasst und kein Bruch verschwindet — beides hatte der Kettenbruch getan, und beides
     misst schlecht (§5.22): eine Kette, die jede Runde dieselben Nachbarn nullt, lässt sie nie reifen, und ein
     eingesammelter Bruch verliert den vollen Sieg-Stack seines eigenen Stichs. Das Eisbeben liegt deshalb ganz auf
     dem Stich, der ohnehin auszahlt, und belohnt genau die vierte Schwelle, die §5.18 geschaffen hat. */
  /* Eiswall (§5.24, Owner-Route A): nicht mehr „volle Reihe oder nichts", sondern die LÄNGE der geraden Kette, in der
     ein Gletscher steht — ab EISWALL_MIN zahlt sie, jeder weitere Gletscher zahlt mehr. Zwei gemessene Ursachen dafür
     (§5.24): das Alles-oder-nichts-Tor (5 von 12 Gletschern in einer Reihe, davor null) und die Anti-Synergie — die
     Reihe ist die DÜNNSTE Form, während Kaskade, Kollision, Packeis und Verzahnung alle Dichte bezahlen. Als eigener
     Skill-Faktor statt als fünfte Geometrie-Form, sonst schluckt ihn die „stärkste Form zählt"-Regel im dichten Bau. */
  const wallRun = eiswallPer > 0 ? eiswallRuns(locked) : null;
  const wallFactor = (p) => (wallRun && wallRun[p] >= EISWALL_MIN ? 1 + eiswallPer * (wallRun[p] - (EISWALL_MIN - 1)) : 1);
  const bebt = (p) => isBreaker[p] && !forced[p] && mNow[p] > burstAt;
  let breakCount = 0;
  for (let p = 0; p < N_POS; p++) if (isBreaker[p]) breakCount += (eisbebenSturz && bebt(p)) ? 2 : 1;
  const sturzFactor = 1 + gletschersturzPer * breakCount; // Gletschersturz: je mehr brechen, desto stärker JEDER Bruch

  // Bruch-Scores + Teil-Reset.
  const breaks = [];
  for (let p = 0; p < N_POS; p++) {
    if (!isG(p)) continue;
    if (!isBreaker[p]) { resetMass[p] = mNow[p]; continue; } // kein Bruch: die Masse bleibt stehen
    const effMass = mNow[p];
    // Große Lawine bricht ALLES auf voller Stufe (echter Finisher); sonst die Stufe der Masse.
    const effTier = grosseLawine ? (tierMult.length - 1) : (forced[p] ? Math.max(1, tOf(effMass)) : tOf(effMass));
    const nb = neighborFn(p);
    // Ewiges Schild: das ganze Feld gilt als angrenzend — aber GEDECKELT (§5.19). Die Kaskade gibt +25 % je Nachbar
    // und war für höchstens 4 (mit Eisbrücke 8) gebaut; „alle anderen" fütterte sie bei 40 Gletschern mit 39, also
    // ×10,75, und der Feld-Score wuchs im QUADRAT der Feldgröße. Der Deckel ist der voll umschlossene Gletscher.
    const gN = ewigesSchild ? Math.min(SCHILD_NEIGHBORS, Math.max(0, totalG - 1)) : nb.reduce((t, n) => t + (isG(n) ? wOf(p, n) : 0), 0);
    const berstFaktor = 1 + kaskade * gN;               // Kaskade (Dichte)
    const kollFrac = ewigesSchild ? 1 : (nb.length ? gN / nb.length : 0);
    const kollFaktor = 1 + (kollision - 1) * kollFrac;  // Kollision (anteilig)
    const geoFactor = formFactor ? (formFactor[p] || 1) : 1; // 2D-Geometrie (Block/Kreuz/Linie/Fläche)
    // Eiszeit (§5.16): je offenem Nachbarfeld mehr Wucht — gegenläufig zur Kaskade, die gefrorene Nachbarn zählt.
    // Dieselbe Gewichtung wie dort (`wOf`), damit gN und oN exakte Komplemente sind: eine Diagonale, die der Dichte
    // nur anteilig zählt, zählt der Eiszeit auch nur anteilig. Sonst zahlte die Eisbrücke der Eiszeit doppelt.
    const oN = nb.reduce((t, n) => t + (isG(n) ? 0 : wOf(p, n)), 0);
    const eisFaktor = eiszeitPer ? 1 + eiszeitPer * oN : 1;
    let burst = effMass * tierMult[effTier] * berstFaktor * kollFaktor * sturzFactor * geoFactor * eisFaktor * wallFactor(p) * BURST_SCALE;
    if (grosseLawine) burst *= GROSSE_LAWINE_MULT;        // Lawinen-Takt: Verstärker je erzwungenem Bruch
    // Eisbeben: das Nachbeben. Stetig statt mit hartem Tor — bei genau der Berst-Schwelle ist es null und wächst mit
    // jedem Punkt darüber. Ein Tor hätte den Skill früh tot gemacht (die Abbruchkante misst auf Normal Lift 0,04).
    const nachbeben = bebt(p) ? burst * eisbebenPer * (mNow[p] - burstAt) : 0;
    payout[p] += burst + nachbeben;
    // §5.18: abgekalbt wird die Berst-Schwelle, der Überschuss bleibt liegen. Die Große Lawine bricht auch unreife
    // Gletscher — dort ist die Differenz negativ und der Boden ist die 0.
    const keep = Math.max(0, effMass - burstAt);
    resetMass[p] = keepMax > 0 ? Math.min(keepMax, keep) : keep;
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

/* Ewiges Schild (Legendär, docs §7): das GESAMTE Feld poolt als ein Übergletscher — alle Gletscher teilen sich
   dieselbe Masse, unabhängig von Nachbarschaft.

   §5.19: DURCHSCHNITT statt Maximum. Das Maximum hob jede Runde alle auf den Stand des stärksten Feldes und ERSCHUF
   dabei Masse: 30 Gletscher, einer auf 18, der Rest auf 2 → alle auf 18, also 480 Masse je Durchlauf aus dem Nichts.
   Nebenwirkung war, dass danach ALLE jede Runde brachen statt nur der eine. Der Durchschnitt verteilt dieselbe Masse,
   statt sie zu drucken — und trifft die Fantasie besser: EIN Gletscher hat EINE Masse, nicht 30 Kopien des besten. */
export function uebergletscherPool(mass, locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  const gs = []; for (let p = 0; p < N_POS; p++) if (isG(p)) gs.push(p);
  if (gs.length < 2) return out;
  const avg = gs.reduce((t, p) => t + (out[p] || 0), 0) / gs.length;
  for (const p of gs) out[p] = avg;                      // eine Masse für das ganze Feld (Summe bleibt erhalten)
  return out;
}

/* Der ZUG (§5.17, ab §5.18 Fundament): JEDES offene Feld gibt bis zu `draw` seiner Boden-Reserve an den NÄCHSTEN
   Gletscher ab — einmal, nicht an jeden, also wird nichts doppelt gezahlt; bei gleichem Abstand entscheidet die
   Position. Bis §5.18 gehörte der Zug allein der Eiszeit, und ohne sie hatte die Reserve überhaupt keinen Ausgang
   außer „dieses Feld friert später ein" (gemessen 65 % totes Kapital). Jetzt teilen sich Schneetreiben (nahe
   Quelle), Dauerfrost (ferne Quelle) und die Eiszeit (Flut) eine Währung, die immer ankommt. */
export const chebyshev = (a, b) => Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));

export function firnDrawTick(firn, mass, locked, draw = FIRN_DRAW) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const f = Array.isArray(firn) ? firn.slice() : new Array(N_POS).fill(0);
  const m = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  const gs = []; for (let p = 0; p < N_POS; p++) if (isG(p)) gs.push(p);
  if (gs.length && draw > 0) for (let p = 0; p < N_POS; p++) {
    if (!(f[p] > 0)) continue;
    const take = Math.min(draw, f[p]);
    /* §8: auch die Reserve UNTER einem Gletscher fließt ab — in ihn selbst. Vorher blieb sie liegen, sobald der
       Rundenstart-Nachschub sie nicht mehr abrief; mit dem Boden-Einkommen steht die Masse ohnehin über
       FIRN_REFILL_TARGET, der Nachschub zieht dann 0, und der vergrabene Schnee wäre für immer totes Kapital —
       genau der Zustand, den §5.27 abgeschafft hat („nichts generieren, das wir nicht nutzen können"). */
    if (isG(p)) { m[p] = (m[p] || 0) + take; f[p] -= take; continue; }
    /* §8: ANTEILIG statt „der Nächste nimmt alles". Die alte Regel verhungerte im dichten Bau genau die Gletscher, für
       die der Spieler baut: bei zwölf im Cluster bekamen SECHS gar nichts, während ein Randgletscher 19 von 28 Punkten
       zog — kein Feld ist je zu einem inneren Gletscher am nächsten. Jetzt teilt jedes Feld seine Abgabe auf ALLE
       Gletscher, Gewicht 1/Abstand: der nächste bekommt am meisten, keiner geht leer aus, die Lage bleibt relevant.
       Nebenwirkung, die den Ausschlag gab: erst damit wird die Auszahlung über die Gletscherzahl monoton (Sonde). */
    let tot = 0;
    const w = gs.map((g) => { const v = 1 / Math.max(1, chebyshev(p, g)); tot += v; return v; });
    gs.forEach((g, i) => { m[g] = (m[g] || 0) + take * w[i] / tot; });
    f[p] -= take;
  }
  return { firn: f, mass: m };
}

/* Der BODEN friert (Fraktions-Passiv, zweite Hälfte — §8). Jedes offene Feld legt `amount` in seine Reserve; der ZUG
   oben trägt sie weiter. Die Eiszeit ist derselbe Griff mit ihrer eigenen, größeren Zahl. */
export function firnGroundTick(firn, locked, amount = FIRN_GROUND) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const f = Array.isArray(firn) ? firn.slice() : new Array(N_POS).fill(0);
  if (amount > 0) for (let p = 0; p < N_POS; p++) if (!isG(p)) f[p] = (f[p] || 0) + amount;
  return f;
}

// Eiszeit (Legendär, docs §7) — §5.15, Owner-Variante a: sie friert NICHTS mehr ein, sondern flutet die Boden-Reserve
// jedes ungefrorenen Felds. Damit will sie freie Felder, wo das Ewige Schild gefrorene will (§5.14: gemeinsam froren
// sie sonst das ganze Brett ein, Faktor 106). §5.18: der Zug oben ist nicht mehr ihrer — sie füttert ihn nur am stärksten.
// §5.27 (Owner-Grundsatz „Skills haben Vorrang vor Legendären"): 3 → 1. Die Eiszeit flutet JEDES freie Feld und war
// damit der größte Gewinner des offenen Zugs — gemessen trug sie den Schwanz, nicht den Median (Mean 4,08× → 2,76×
// Feuer allein durch diese Zahl, Median unverändert 1,9×). Sie zieht nach, damit die Skills den offenen Zug behalten.
export const EISZEIT_FLOOD = envNum("SIM_GLACIER_EISZEIT_FLOOD", 1);
// §5.16: ihre zweite Auszahlung — der SPIEGEL der Dichte-Kaskade. Die Kaskade multipliziert den Bruch mit den
// GEFRORENEN Nachbarn (KASKADE_PER_NEIGHBOR), die Eiszeit mit den OFFENEN.
// Sweep §5.16: 0,25 → −4 %, 0,5 → −1 %, 1 → +13 %, 2 → +30 %. Bei 2 sitzt die Eiszeit im Band der übrigen elf.
export const EISZEIT_BURST_PER = envNum("SIM_GLACIER_EISZEIT_BURST", 2);
export function eiszeitFlood(firn, locked, base = EISZEIT_FLOOD) { return firnGroundTick(firn, locked, base); }

/* Packeis (docs §4) — §5.31 (Owner: „bau aber vllt noch einen für duo oder Triplett um"): am Durchlauf-Ende +Masse je
   OFFENEM Nachbarfeld statt je Gletscher-Nachbar. Er war der reinste Mono-Skill der Fraktion (gemessen +24 % mono,
   −8 %/−8 % im Mix) — vier Skills sagten „bau dicht", keiner sagte etwas anderes. Als Kante zwischen Eis und offenem
   Wasser trägt er den Namen weiter, und ein dünn gebauter Eis-Anteil bekommt neben Dauerfrost eine zweite Quelle. */
/* Owner-Runde 2026-09-12: Reichweite statt Satz. Packeis war das Schlusslicht der vier Einkommen (6 Gletscher
   verteilt: 10/15/20/30 gegen Dauerfrost 34/68/68/102), und der Grund war ein DECKEL, den nur es hatte: ein
   Gletscher grenzt an höchstens vier Felder, also stand sein Einkommen bei 12 geballten Gletschern auf demselben
   Wert wie bei sechs. Verzahnung wächst quadratisch mit dem Cluster, Dauerfrost mit dem ganzen Brett. Die Leiter
   bleibt deshalb unangetastet, gezählt wird jetzt im UMKREIS (Chebyshev) — dieselbe Bandgrenze, die Dauerfrost
   schon benutzt. Eisbrücke bleibt gekoppelt: sie schiebt den Umkreis auf 3, weil ein Umkreis 2 die Diagonalen
   ohnehin enthält und die alte Kopplung (4 → 8 Nachbarn) sonst ersatzlos verfallen wäre. */
export const PACKEIS_RADIUS = envNum("SIM_GLACIER_PACKEIS_RADIUS", 2);
export const PACKEIS_RADIUS_BRIDGE = envNum("SIM_GLACIER_PACKEIS_RADIUS_BRIDGE", 3);
export function packeisTick(mass, locked, radius = PACKEIS_RADIUS, per = 0) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = Array.isArray(mass) ? mass.slice() : new Array(N_POS).fill(0);
  for (let g = 0; g < N_POS; g++) if (isG(g)) {
    let offen = 0;
    for (let p = 0; p < N_POS; p++) if (!isG(p) && chebyshev(g, p) <= radius) offen++;
    if (offen) out[g] = (out[g] || 0) + per * offen;
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
   Runaway der Fraktion saß hier, nicht in der Grundzahl. Immer an, wenn Gletscher aktiv. (Der Eiswall ist seit §5.24
   KEINE Form mehr, sondern ein eigener Skill-Faktor auf der Kettenlänge — er fasst diese Tabelle nicht mehr an.) */
export const GEO_BLOCK = 1.15;    // 2×2-Quadrat (Dichte-Sockel)
export const GEO_KREUZ = 1.25;    // Zentrum + 4 orthogonale (Kollisions-Knoten)
export const GEO_LINIE = 1.30;    // volle Reihe (5) oder Spalte (8)
export const GEO_FLAECHE = 1.50;  // gefülltes 3×3 (Endgame-Mega-Cluster)

// Detail-Variante (für UI: Karten-Badge, Formationsbeschreibung, HUD-Multiplikator): liefert
//   { factor:[40] (wie glacierGeometry), forms:[{type,factor,positions}] (aktive benannte Formen), formPos:Set<pos> }.
export function glacierFormations(locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const f = new Array(N_POS).fill(1);
  const forms = [], formPos = new Set();
  const addForm = (type, factor, positions) => { forms.push({ type, factor, positions }); for (const p of positions) { f[p] = Math.max(f[p], factor); formPos.add(p); } };
  // Linie: volle Reihe (5 Spalten)
  for (let r = 0; r < 8; r++) { let full = true; for (let c = 0; c < 5; c++) if (!isG(posOf(r, c))) { full = false; break; } if (full) addForm("linie", GEO_LINIE, Array.from({ length: 5 }, (_, c) => posOf(r, c))); }
  // Linie: volle Spalte (8 Zeilen)
  for (let c = 0; c < 5; c++) { let full = true; for (let r = 0; r < 8; r++) if (!isG(posOf(r, c))) { full = false; break; } if (full) addForm("linie", GEO_LINIE, Array.from({ length: 8 }, (_, r) => posOf(r, c))); }
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
/* Eiswall (§5.24): je Feld die Länge der längsten UNUNTERBROCHENEN geraden Kette aus Gletschern, in der es steht —
   waagerecht oder senkrecht, die längere von beiden. 0 für Felder ohne Gletscher. Ein 3×3-Klotz liefert damit überall
   3, eine volle Reihe 5, eine volle Spalte 8; die Wand zahlt also auch im dichten Bau, statt nur im Reihen-Bau. */
export function eiswallRuns(locked) {
  const isG = (p) => (locked instanceof Set ? locked.has(p) : !!(locked && locked[p]));
  const out = new Array(N_POS).fill(0);
  const scan = (cells) => {              // eine Zeile oder Spalte als Positionsliste: Läufe abgreifen und eintragen
    let start = 0;
    for (let i = 0; i <= cells.length; i++) {
      if (i < cells.length && isG(cells[i])) continue;
      const len = i - start;
      if (len > 0) for (let k = start; k < i; k++) out[cells[k]] = Math.max(out[cells[k]], len);
      start = i + 1;
    }
  };
  for (let r = 0; r < 8; r++) scan(Array.from({ length: 5 }, (_, c) => posOf(r, c)));
  for (let c = 0; c < 5; c++) scan(Array.from({ length: 8 }, (_, r) => posOf(r, c)));
  return out;
}

// Engine-Pfad (Burst-Faktor je Feld): nur das Faktor-Array.
export const glacierGeometry = (locked) => glacierFormations(locked).factor;
// Anzeigenamen der 2D-Gletscher-Formen (UI).
export const GLACIER_FORM_LABEL = { block: "Block", kreuz: "Kreuz", linie: "Linie", flaeche: "Große Fläche" };

/* ---- Rollen-Schlüssel (docs §4) — die Engine gattert über sie, die ZAHLEN je Stufe liefert factions/ice.js. */
export const ROLES = {
  GLETSCHERZUNGE: "G_GLETSCHERZUNGE", // §5.18: die Zunge schiebt sich vor — Masse wird Kampfwert (ersetzt Rissbildung)
  ABBRUCHKANTE: "G_ABBRUCHKANTE", // belohnt hohe Stufen noch steiler (Riesen)
  ANFRIEREN: "G_ANFRIEREN",       // Firn: Sieg → +Masse extra; Formations-Sieg → doppelt
  SCHNEETREIBEN: "G_SCHNEETREIBEN", // Firn: Verwehung — Sieg verweht Firn in die Boden-Reserve des Nachbarfelds (#386: nur offener Boden, nie unter einen Gletscher)
  DAUERFROST: "G_DAUERFROST",     // Firn: offener Boden friert am tiefsten — passiver Frost in die Boden-Reserve (fern; #386 firnStack)
  SPROEDBRUCH: "G_SPROEDBRUCH",   // §5.18: sprödes Eis — Masse wird Crit-Chance (ersetzt Eispanzer)
  PACKEIS: "G_PACKEIS",           // Eisschild: Gletscher mit vielen Gletscher-Nachbarn → Bonus-Masse (belohnt die Mitte)
  VERZAHNUNG: "G_VERZAHNUNG",     // Eisschild: je größer das Cluster, desto schneller wächst jeder Gletscher (Runaway-Kandidat)
  EISBRUECKE: "G_EISBRUECKE",     // Eisschild: erweitert „angrenzend" um die 4 Diagonalen (8-Nachbarschaft)
  EISBEBEN: "G_EISBEBEN",         // §5.23: der Bruch bebt nach — je Punkt Masse über der Schwelle mehr (ersetzt Kettenbruch)
  GLETSCHERSTURZ: "G_GLETSCHERSTURZ", // Lawine: je mehr Gletscher im Durchlauf brechen, desto stärker jeder Bruch
  EISWALL: "G_EISWALL",           // §5.24: gerade Kette ab EISWALL_MIN → Zuschlag je Gletscher darüber (ersetzt den Linien-Hebel)
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
  const n = Math.max(0, count);
  const offen = neighbors4(pos).filter((p) => !isG(p));
  if (offen.length) return offen.slice(0, n);
  /* Rückfall: ein ganz eingeschlossener Gletscher sät ins nächstgelegene offene Feld statt gar nicht. Ohne den
     stirbt Schneetreiben genau im dichten Cluster, für den die Fraktion gebaut ist — bei zwölf geballten Gletschern
     haben nur fünf überhaupt einen offenen 4-Nachbarn. Deterministisch: Chebyshev, bei Gleichstand der kleinere
     Index. Greift nur bei NULL offenen Nachbarn, nicht als Auffüllung eines teilweise verbauten Kranzes. */
  const frei = [];
  for (let p = 0; p < N_POS; p++) if (p !== pos && !isG(p)) frei.push(p);
  frei.sort((a, b) => chebyshev(pos, a) - chebyshev(pos, b) || a - b);
  return frei.slice(0, n);
}

// Dauerfrost (docs §4 Firn): am Durchlauf-ENDE frosten UNGEFRORENE Felder nach ABSTAND zum nächsten Gletscher
// (King-Move/Chebyshev): Abstand ≤ 2 → NEAR, Abstand ≥ 3 (oder gar kein Gletscher) → FAR. §5.18: der Null-Ring um
// jeden Gletscher ist gefallen — er würgte Dauerfrost genau dort ab, wo ein dichtes Cluster steht, und mit dem Zug
// (firnDrawTick) ist naher Boden jetzt die BESSERE Quelle, nicht die tote. #386: schreibt in die Firn-Boden-RESERVE
// (firnStack), nie unter einen Gletscher — die Engine reicht das firnStack-Array herein.
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
      if (cd < dist) { dist = cd; if (dist <= 2) break; } // ab hier steht das Band (NEAR) fest
    }
    const add = dist <= 2 ? near : far;
    if (add > 0) out[p] = (out[p] || 0) + add;
  }
  return out;
}
