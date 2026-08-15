/* ============================================================
   UPGRADES / PROGRESSION-BAUM — laufübergreifende Meta-Progression über Stichpunkte (SP).

   #369 KOMPLETT-REWORK: der alte 4-Ast-Baum (bau/auf/rar/mei, 13 Knoten) ist ERSETZT durch zwei Zweige —
   DECKS (je Archetyp „Deck spielbar › Leg I › Leg II") und ALLGEMEIN (Baufeld/Energie/Rarität/Drop/2.-Perk).
   Das Archetyp-/Rarität-/Legendär-Gating hängt jetzt am BAUM (nicht mehr am Onboarding, #316).

   PUR & node-testbar (Analogon zu rarity.js): hält NUR die Knoten-Defs (data-driven),
   die Kauf-/Voraussetzungs-/Gate-/Respec-Logik und die Effekt-Ableitungen. KEINE UI-/Asset-Importe,
   KEINE localStorage-Zugriffe, KEIN RNG/Date — die Persistenz lebt in storage.js (Profil), die
   Anwendung im reducer, die Anzeige in der UI. So bleibt das Modul in `environment: "node"` prüfbar
   und deterministisch.

   Profil-Shape: { stichPoints, stichSpent, nodes: { [nodeId]: 1 } }  (Level 1 = gekauft).
   ============================================================ */

import { TIER_META } from "./rarity.js"; // Raritäts-Namen: EINE Quelle (rarity.js ist ein Blatt → kein Zyklus)

// SIM-/Balance-Haken wie in constants.js: per ENV übersteuerbar, Default = aktueller Wert → in der App
// (kein `process`) immer der Default. Erlaubt reproduzierbares Tuning ohne Code-Edit.
const envNum = (name, def) => {
  const v = (typeof process !== "undefined" && process.env) ? process.env[name] : undefined;
  const n = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
};

/* ---- Start-Zustand (frisches Profil, nichts investiert) — #369 §1 -----------------------------
   Die „Böden", auf denen der Tree aufsetzt (Normal-Lauf mit Profil). Sim/Standard/Dev nutzen weiter
   die Engine-Konstanten (C.ARCH_MAX_COVER / C.FORMATION_ENERGY) → byte-identische Baseline. */
export const COVER_FLOOR  = envNum("PROG_COVER_FLOOR", 20);   // Baufeld-Start (20 → max 24 über den Baum)
export const ENERGY_FLOOR = envNum("PROG_ENERGY_FLOOR", 3);   // Formations-Energie-Start (3 → max 5 über den Baum)
export const RARITY_TIER_BASE = 2;                            // Start: nur Normal + Selten (grau/grün)
export const REROLL_BASE  = envNum("PROG_REROLL_BASE", 1);    // Rerolls je Phase-Typ (Perk/Gebäude/Skill) im Normal-Lauf

// Von Beginn an spielbare Archetypen (#369 §1: nur Feuer + Blitz). Eis/Pflanze kommen über Deck-Knoten.
export const ARCHETYPES_BASE = ["lightning", "fire"];

// Legendär-Perk-Chance-Multiplikator je Drop-Stufe (#369 §4, [TUNING]): der „Legendär"-Knoten schaltet die
// Perk-Legendär-Schicht an (Basis ×1 ≈ 3 %), jede Drop-Stufe hebt sie bis ~×3.3 (≈ 10 % bei Drop IV).
export const LEG_MULT_PER_SHIFT = envNum("PROG_LEG_MULT_PER_SHIFT", 0.583);
// Erzwungene Legendär-Perks in der generellen Legendär-Phase (2. Perk-Phase, #369 §5b): ein voller Legendär-Satz.
export const LEG_PERK2_FORCE = envNum("PROG_LEG_PERK2_FORCE", 3);

/* ---- Knoten-Defs (data-driven) ------------------------------------------------------------
   Feld  prereq = Vorgänger-Knoten in der Kette (null = Kettenkopf).
   Effekt-Felder (je Knoten eine Teilmenge):
     arch        Archetyp-Schlüssel (Deck-Knoten; steuert das Fraktions-Icon in der UI)
     deckUnlock  Archetyp wird spielbar
     legLevel    Legendär-Kandidaten-Stufe dieses Archetyps (1 → 1 Kandidat, 2 → 2)
     cover       +Baufeld-Zellen · energy +Formations-Energie
     maxTier     hebt die anbietbare Max-Rarität auf diesen Wert (3 = Sehr selten, 4 = Rar)
     legLayer    schaltet die Legendär-Perk-Schicht an
     shift       Drop-Raten-Stufe (1..4)
     flag        "deckReroll" | "perk2Leg" | "perk2Reroll"
     placeholder „Bald verfügbar" (nie kaufbar)
     gate        Sonder-Freischaltung (z. B. { type: "anyLeg" }) */
export const NODES = [
  /* ===== DECK-Zweig (45 SP) — Reiter „Decks" ===== */
  // Feuer/Blitz: Deck von Beginn an frei → nur die Legendär-Kette.
  { id: "fireLeg1",  branch: "deck", arch: "fire",      label: "Legendär I",  detail: "1 Feuer-Kandidat in der Legendär-Phase",  cost: 3, prereq: null,       legLevel: 1 },
  { id: "fireLeg2",  branch: "deck", arch: "fire",      label: "Legendär II", detail: "2 Feuer-Kandidaten",                       cost: 5, prereq: "fireLeg1", legLevel: 2 },
  { id: "boltLeg1",  branch: "deck", arch: "lightning", label: "Legendär I",  detail: "1 Blitz-Kandidat in der Legendär-Phase",  cost: 3, prereq: null,       legLevel: 1 },
  { id: "boltLeg2",  branch: "deck", arch: "lightning", label: "Legendär II", detail: "2 Blitz-Kandidaten",                       cost: 5, prereq: "boltLeg1", legLevel: 2 },
  // Eis: erst Deck freischalten, dann die Legendär-Kette.
  { id: "iceDeck",   branch: "deck", arch: "ice",       label: "Eis-Deck",    detail: "Eis-Archetyp spielbar",                    cost: 4, prereq: null,       deckUnlock: "ice" },
  { id: "iceLeg1",   branch: "deck", arch: "ice",       label: "Legendär I",  detail: "1 Eis-Kandidat in der Legendär-Phase",    cost: 3, prereq: "iceDeck",  legLevel: 1 },
  { id: "iceLeg2",   branch: "deck", arch: "ice",       label: "Legendär II", detail: "2 Eis-Kandidaten",                         cost: 5, prereq: "iceLeg1",  legLevel: 2 },
  // Pflanze: analog.
  { id: "plantDeck", branch: "deck", arch: "plant",     label: "Pflanze-Deck",detail: "Pflanze-Archetyp spielbar",               cost: 4, prereq: null,        deckUnlock: "plant" },
  { id: "plantLeg1", branch: "deck", arch: "plant",     label: "Legendär I",  detail: "1 Pflanze-Kandidat in der Legendär-Phase",cost: 3, prereq: "plantDeck", legLevel: 1 },
  { id: "plantLeg2", branch: "deck", arch: "plant",     label: "Legendär II", detail: "2 Pflanze-Kandidaten",                     cost: 5, prereq: "plantLeg1", legLevel: 2 },
  // Reroll für die Archetyp-Legendär-Phase — unabhängig, sobald irgendein Leg I frei ist.
  { id: "deckReroll",branch: "deck", label: "Reroll · Legendär-Phase", detail: "+1 Reroll in der Archetyp-Legendär-Phase", cost: 5, prereq: null, gate: { type: "anyLeg" }, flag: "deckReroll" },
  // Platzhalter — kein Effekt, nie kaufbar.
  { id: "synLeg",    branch: "deck", label: "Synergie-Legendäre", detail: "Bald verfügbar", cost: 0, prereq: null, placeholder: true },

  /* ===== ALLGEMEIN-Zweig (92 SP) — Reiter „Allgemein" ===== */
  // Baufeld 20 → 24 (Zellen).
  { id: "cover1", branch: "gen", label: "Baufeld I",   detail: "Baufeld 20 → 21 Zellen", cost: 2, prereq: null,     cover: 1 },
  { id: "cover2", branch: "gen", label: "Baufeld II",  detail: "Baufeld 21 → 22 Zellen", cost: 4, prereq: "cover1", cover: 1 },
  { id: "cover3", branch: "gen", label: "Baufeld III", detail: "Baufeld 22 → 24 Zellen", cost: 6, prereq: "cover2", cover: 2 },
  // Formations-Energie 3 → 5.
  { id: "energy1", branch: "gen", label: "Energie I",  detail: "Formations-Energie 3 → 4", cost: 2, prereq: null,      energy: 1 },
  { id: "energy2", branch: "gen", label: "Energie II", detail: "Formations-Energie 4 → 5", cost: 4, prereq: "energy1", energy: 1 },
  // Rarität-Rahmen: Stufe III → Stufe IV → Legendär-Schicht. Namen aus TIER_META (EINE Quelle) —
  // vorher standen sie hier abgetippt und wären beim Umbenennen „Rar" → „Episch" auseinandergelaufen.
  { id: "tier3",    branch: "gen", label: TIER_META[3].label, detail: `Rarität ${TIER_META[3].label} (blau) freischalten`, cost: 2, prereq: null,     maxTier: 3 },
  { id: "tier4",    branch: "gen", label: TIER_META[4].label, detail: `Rarität ${TIER_META[4].label} (lila) freischalten`, cost: 3, prereq: "tier3",  maxTier: 4 },
  { id: "legLayer", branch: "gen", label: "Legendär",    detail: "Legendär-Perk-Schicht (gold) an",         cost: 4, prereq: "tier4",  legLayer: true },
  // Drop-Raten — nach „Legendär", dann sequenziell.
  { id: "drop1", branch: "gen", label: "Drop-Rate I",   detail: "hochwertigere Perks & Gebäude", cost: 5,  prereq: "legLayer", shift: 1 },
  { id: "drop2", branch: "gen", label: "Drop-Rate II",  detail: "hochwertigere Perks & Gebäude", cost: 8,  prereq: "drop1",    shift: 2 },
  { id: "drop3", branch: "gen", label: "Drop-Rate III", detail: "hochwertigere Perks & Gebäude", cost: 12, prereq: "drop2",    shift: 3 },
  { id: "drop4", branch: "gen", label: "Drop-Rate IV",  detail: "hochwertigere Perks & Gebäude", cost: 24, prereq: "drop3",    shift: 4 },
  // 2. Perk-Phase → generelle Legendär-Phase, + eigener Reroll.
  { id: "perk2Leg",    branch: "gen", label: "2. Perk → Legendär", detail: "2. Perk-Phase wird generelle Legendär-Phase", cost: 10, prereq: "legLayer",  flag: "perk2Leg" },
  { id: "perk2Reroll", branch: "gen", label: "Reroll · 2. Perk-Phase", detail: "+1 Reroll in der generellen Legendär-Phase", cost: 6, prereq: "perk2Leg", flag: "perk2Reroll" },
  /* Reroll-Basis 1 → 3. Wirkt auf ALLE DREI Angebots-Pools zugleich (Perk · Gebäude · Skill) — deshalb
     bewusst teurer als die phasenspezifischen Rerolls darüber, die nur EINE Phase betreffen. */
  { id: "reroll1", branch: "gen", label: "Reroll I",  detail: "+1 Reroll je Angebot (Perk · Gebäude · Skill)", cost: 4, prereq: null,      reroll: 1 },
  { id: "reroll2", branch: "gen", label: "Reroll II", detail: "+1 Reroll je Angebot (Perk · Gebäude · Skill)", cost: 8, prereq: "reroll1", reroll: 1 },
];

// Zweig-Metadaten (Reihenfolge + Anzeige). Farben/Icons leben in der UI; hier nur strukturelle Namen.
export const BRANCHES = [
  { key: "deck", name: "Decks",     desc: "Archetypen & Legendäre" },
  { key: "gen",  name: "Allgemein", desc: "Baufeld · Energie · Rarität · Drops" },
];

export const NODE_BY_ID = NODES.reduce((m, n) => { m[n.id] = n; return m; }, {});
export const NODE_IDS = NODES.map((n) => n.id);

// Kaufbare Knoten (ohne Platzhalter) — Basis für Kosten/Fortschritt/„komplett".
export const BUYABLE_NODES = NODES.filter((n) => !n.placeholder);
export const BUYABLE_IDS = BUYABLE_NODES.map((n) => n.id);
export const DECK_IDS = NODES.filter((n) => n.branch === "deck" && !n.placeholder).map((n) => n.id);
export const GEN_IDS  = NODES.filter((n) => n.branch === "gen").map((n) => n.id);
// Σ SP über alle kaufbaren Knoten (= 137) und Knotenzahl (= 25).
export const TOTAL_COST = BUYABLE_NODES.reduce((s, n) => s + n.cost, 0);
export const TOTAL_NODES = BUYABLE_NODES.length;

// Legendär-Ketten je Archetyp (Stufe 1/2) — Quelle der Zähl-Map für die Archetyp-Legendär-Phase.
export const LEG_NODES_BY_ARCH = NODES.reduce((m, n) => {
  if (n.legLevel && n.arch) { (m[n.arch] = m[n.arch] || []).push(n); }
  return m;
}, {});

/* ---- Profil-Helfer ------------------------------------------------------------------------ */

// Sicheres Lesen: gilt ein Knoten als gekauft? (Level 1 = gekauft; alles Wahre zählt.)
export const owns = (profile, id) => !!(profile && profile.nodes && profile.nodes[id]);

// #370 Ranked-Freischaltung: alle vier Archetypen freigeschaltet (Blitz/Feuer = Basis · Eis/Pflanze via Deck-Knoten)
//   UND mit jedem ≥1 ABGESCHLOSSENER Lauf (archetypeRunsCompleted aus storage.recordRun). Upgrade-Tree ist egal.
export const RANKED_ARCHETYPES = [...new Set([...ARCHETYPES_BASE, ...NODES.filter((n) => n.deckUnlock).map((n) => n.deckUnlock)])];
export function rankedUnlocked(profile) {
  const p = profile || {};
  if (!NODES.every((n) => !n.deckUnlock || owns(p, n.id))) return false; // alle Deck-Freischalt-Knoten gekauft
  const runs = p.archetypeRunsCompleted || {};
  return RANKED_ARCHETYPES.every((a) => (Number(runs[a]) || 0) >= 1);
}

// Frisches Profil (kein RNG/Date). sp = Startguthaben (default 0).
export const emptyProfile = (sp = 0) => ({ stichPoints: Math.max(0, Math.floor(Number(sp) || 0)), stichSpent: 0, nodes: {} });

// SP-Guthaben robust lesen.
const points = (profile) => Math.max(0, Math.floor(Number(profile && profile.stichPoints) || 0));

/* ---- Gates & Voraussetzungen -------------------------------------------------------------- */

// Ist irgendein Leg-I-Knoten gekauft? (Meta-Gate: existiert die Archetyp-Legendär-Phase / der Deck-Reroll?)
export const anyLegOwned = (profile) => Object.values(LEG_NODES_BY_ARCH).some((arr) => arr.some((n) => n.legLevel === 1 && owns(profile, n.id)));

// Erfüllt der Knoten sein Sonder-Gate? (Knoten ohne Gate → true.)
export function gateMet(profile, node) {
  const g = node && node.gate;
  if (!g) return true;
  if (g.type === "anyLeg") return anyLegOwned(profile);
  return true;
}

// Vorgänger in der Kette gekauft? (Kettenkopf → true.)
export const prereqMet = (profile, node) => !node.prereq || owns(profile, node.prereq);

/* ---- nodeEffects — die vom Reducer/UI konsumierten Ableitungen ----------------------------
   Frisches/leeres Profil = beweisbares No-op (alle Boni 0/false, maxTier = Basis, nur Feuer+Blitz frei). */
export function nodeEffects(profile) {
  let treeCoverBonus = 0;     // +Baufeld-Zellen (0..4)
  let treeEnergyBonus = 0;    // +Formations-Energie (0..2)
  let treeRerollBonus = 0;    // +Rerolls je Angebots-Pool (0..2, Perk/Gebäude/Skill gemeinsam)
  let treeRareShift = 0;      // Drop-Raten-Stufe (0..4)
  let maxTier = RARITY_TIER_BASE; // anbietbare Max-Rarität (2..4)
  let legendaryLayer = false; // Legendär-Perk-Schicht an?
  const unlockedSet = new Set(ARCHETYPES_BASE);
  const legCountByArch = {};  // Archetyp → Legendär-Kandidaten (max gekaufte Stufe: 1 oder 2)
  const flags = { deckReroll: false, perk2Leg: false, perk2Reroll: false };
  for (const n of NODES) {
    if (n.placeholder || !owns(profile, n.id)) continue;
    if (n.cover) treeCoverBonus += n.cover;
    if (n.energy) treeEnergyBonus += n.energy;
    if (n.reroll) treeRerollBonus += n.reroll;
    if (n.shift) treeRareShift = Math.max(treeRareShift, n.shift);
    if (n.maxTier) maxTier = Math.max(maxTier, n.maxTier);
    if (n.legLayer) legendaryLayer = true;
    if (n.deckUnlock) unlockedSet.add(n.deckUnlock);
    if (n.legLevel && n.arch) legCountByArch[n.arch] = Math.max(legCountByArch[n.arch] || 0, n.legLevel);
    if (n.flag) flags[n.flag] = true;
  }
  // Legendär-Perk-Multiplikator (#369 §4): 0 ohne Schicht, sonst ×(1 + Drop-Stufe·Schritt).
  const legMult = legendaryLayer ? 1 + treeRareShift * LEG_MULT_PER_SHIFT : 0;
  const archLegPhaseOn = Object.values(legCountByArch).some((c) => c > 0);
  return {
    treeCoverBonus, treeEnergyBonus, treeRerollBonus, treeRareShift, maxTier, legendaryLayer, legMult,
    unlockedArchetypes: [...unlockedSet], legCountByArch, archLegPhaseOn,
    legPerkPhaseOn: flags.perk2Leg, rerollDeckLeg: flags.deckReroll ? 1 : 0, rerollPerk2: flags.perk2Reroll ? 1 : 0,
  };
}

/* ---- Einzel-Ableiter (Reducer-Nähte, alle profil-basiert) --------------------------------- */

// Allowlist der im Lauf anbietbaren Archetypen — aus dem Baum (#369, früher Onboarding).
export const unlockedArchetypes = (profile) => nodeEffects(profile).unlockedArchetypes;
// Rarität-Obergrenze — aus dem Baum (2 = Normal+Selten, 3 = +Sehr selten, 4 = +Rar).
export const maxRarityTier = (profile) => nodeEffects(profile).maxTier;
// Existiert die Archetyp-Legendär-Phase? (irgendein Leg I gekauft.) Name wg. Reducer-Naht beibehalten.
export const legendaryPhaseUnlocked = (profile) => nodeEffects(profile).archLegPhaseOn;
// Zähl-Map je Archetyp für die Legendär-Phase (Pool = alle freigeschalteten, unabhängig vom Build).
export const legCountByArch = (profile) => nodeEffects(profile).legCountByArch;
export const treeCoverBonus = (profile) => nodeEffects(profile).treeCoverBonus;
export const treeEnergyBonus = (profile) => nodeEffects(profile).treeEnergyBonus;
export const treeRareShift = (profile) => nodeEffects(profile).treeRareShift;

/* Reroll-Basis je Pool (#369 §6): 1 im Normal-Lauf mit Profil, + je 1 aus den beiden Baum-Knoten
   (reroll1/reroll2) → max 3. Die beiden Legendär-Phasen-Rerolls bleiben phasenspezifisch
   (rerollDeckLeg/rerollPerk2) und zählen hier NICHT mit.
   Ranked bleibt unberührt: dort ist effProfile null, der Reducer nimmt dann C.BASE_REROLLS. */
export const rerollBase = (profile) => REROLL_BASE + nodeEffects(profile).treeRerollBonus;

// Erzwungene Legendär-Perks in der generellen Legendär-Phase (2. Perk-Phase). Nimmt das nodeEffects-Objekt (kann null).
export const legPerk2Force = (eff) => (eff && eff.legPerkPhaseOn ? LEG_PERK2_FORCE : 0);

/* ---- Kauf-Zustand & -Aktionen ------------------------------------------------------------- */

// Fein aufgelöster Knoten-Zustand (spiegelt die UI): owned / lock (Platzhalter) / lock-prev / lock-gate /
// lock-sp / buy. Rein & deterministisch → UI und Tests nutzen dieselbe Wahrheit.
export function nodeState(profile, id) {
  const n = NODE_BY_ID[id];
  if (!n) return "unknown";
  if (n.placeholder) return "placeholder";
  if (owns(profile, id)) return "owned";
  if (!prereqMet(profile, n)) return "lock-prev";
  if (!gateMet(profile, n)) return "lock-gate";
  if (points(profile) < n.cost) return "lock-sp";
  return "buy";
}

// Kaufbar? (nicht gekauft, Vorgänger + Gate erfüllt, genug SP.)
export const canBuy = (profile, id) => nodeState(profile, id) === "buy";

// Kauf → NEUES Profil (SP abziehen, in stichSpent buchen, Knoten auf Level 1). Nicht kaufbar → No-op.
export function buyNode(profile, id) {
  if (!canBuy(profile, id)) return profile;
  const n = NODE_BY_ID[id];
  const next = {
    ...profile,
    stichPoints: points(profile) - n.cost,
    stichSpent: (Math.max(0, Math.floor(Number(profile && profile.stichSpent) || 0))) + n.cost,
    nodes: { ...(profile && profile.nodes), [id]: 1 },
  };
  // #299: mit dem LETZTEN Knoten ist der Baum komplett → die übrigen SP werden zu DP (SP sind danach nutzlos).
  if (!treeComplete(profile) && treeComplete(next)) {
    const leftover = points(next);
    return { ...next, stichPoints: 0, deckPoints: Math.max(0, Math.floor(Number(next.deckPoints) || 0)) + leftover };
  }
  return next;
}

// Respec → NEUES Profil: erstattet EXAKT die Kosten aller aktuell gekauften Knoten aufs Guthaben,
// leert nodes und setzt stichSpent auf 0. Rechnet aus den Knoten (robust gegen stichSpent-Drift).
export function respec(profile) {
  const refund = BUYABLE_NODES.reduce((s, n) => (owns(profile, n.id) ? s + n.cost : s), 0);
  return { ...profile, stichPoints: points(profile) + refund, stichSpent: 0, nodes: {} };
}

// Baum komplett? (alle kaufbaren Knoten gekauft → Meister-Liga frei.)
export const treeComplete = (profile) => BUYABLE_IDS.every((id) => owns(profile, id));

// Anzahl gekaufter (kaufbarer) Knoten (für die „X / N"-Leiste).
export const ownedCount = (profile) => BUYABLE_IDS.reduce((c, id) => (owns(profile, id) ? c + 1 : c), 0);

/* ============================================================
   SP-ÖKONOMIE & ONBOARDING — Ernte pro Lauf (docs/progression-decisions.md §4–§6).

   #369: die SP-Ökonomie (SP_PER_RUN / SP_MILESTONES / SP_LOYALTY_*) bleibt UNVERÄNDERT — nur der Tree-Inhalt
   und die Reducer-Nähte ändern sich. Onboarding ist seit #316 auf 6/6 fixiert (die Funktionen bleiben für den
   Victory-Rollup erhalten, laufen aber inert). REINE Regeln (kein RNG/Date/localStorage).
   ============================================================ */

export const ONBOARDING_LINKS = 6; // Länge der (inerten) Onboarding-Kette; Profile starten bei 6/6 (#316).

// Onboarding-Status: liest profile.onboarding (>=6 → true); fehlt das Feld → true (Vorschau-/Default-Verhalten).
export const onboardingDone = (profile) => {
  if (profile && Object.prototype.hasOwnProperty.call(profile, "onboarding")) {
    return (Number(profile.onboarding) || 0) >= ONBOARDING_LINKS;
  }
  return true;
};

// Belohnungs-Deskriptoren der (inerten) Onboarding-Glieder — bleiben für den Victory-Rollup/StartScreen erhalten.
export const ONBOARDING_ARCH_UNLOCK = { plant: 2, ice: 4 };
export const ONBOARDING_RARITY_UNLOCK = { 3: 3, 5: 4 };

// SP-Quellen (envNum-tunebar). Grundstock je abgeschlossenem SP-Lauf + kumulative Score-Meilensteine +
// Treue-Drip je N SP-Läufe. Defaults = docs §6: +1/Lauf; +1/+1/+1/+2 bei 25/50/75/100 Mio; +5 je 10.
export const SP_PER_RUN = envNum("PROG_SP_PER_RUN", 1);
export const SP_MILESTONES = [
  { at: envNum("PROG_SP_MS0_AT", 10_000_000),  sp: envNum("PROG_SP_MS0_SP", 1) },
  { at: envNum("PROG_SP_MS1_AT", 25_000_000),  sp: envNum("PROG_SP_MS1_SP", 1) },
  { at: envNum("PROG_SP_MS2_AT", 50_000_000),  sp: envNum("PROG_SP_MS2_SP", 1) },
  { at: envNum("PROG_SP_MS3_AT", 75_000_000),  sp: envNum("PROG_SP_MS3_SP", 1) },
  { at: envNum("PROG_SP_MS4_AT", 100_000_000), sp: envNum("PROG_SP_MS4_SP", 2) },
];
/* Willkommensbonus: EINMALIG nach dem ersten ABGESCHLOSSENEN Lauf. Ein frisches Profil startet mit
   0 SP (#316) — die ersten Baum-Knoten wären damit weit weg, obwohl der Baum das ist, was einen
   zweiten Lauf attraktiv macht.
   Bewusst an „abgeschlossen" gekoppelt, nicht an „gestartet" — sonst holt man ihn mit Abbrechen ab.

   Ausgezahlt wird in DECKPUNKTEN, nicht in Stichpunkten. Grund: ein frisches Profil startet schon mit
   START_DECK_POINTS (50) DP, der Bonus verdoppelt also eine Währung, mit der der Spieler sofort etwas
   anfangen kann (ein Pack in der Werkstatt) — während 50 SP den Upgrade-Baum auf einen Schlag halb
   durchgekauft hätten und der ersten Stunde ihre Progression genommen hätten. */
export const WELCOME_DP = envNum("PROG_WELCOME_DP", 50);

export const SP_LOYALTY_EVERY = envNum("PROG_SP_LOYALTY_EVERY", 10);
export const SP_LOYALTY_SP    = envNum("PROG_SP_LOYALTY_SP", 5);

const num0 = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v) || 0);

// Onboarding-Fortschritt nach einem Lauf: ein NATÜRLICH abgeschlossener Lauf (record.completed) rückt genau ein
// Glied vor, gedeckelt bei ONBOARDING_LINKS (6). Vorzeitiges Beenden zählt nicht. (Inert bei Start 6/6.)
export function onboardingAfter(current, record) {
  const cur = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(num0(current))));
  return (record && record.completed === true && cur < ONBOARDING_LINKS) ? cur + 1 : cur;
}

// Kumulative Score-Meilenstein-SP eines Laufs (jede überschrittene Schwelle addiert ihre SP;
// 100 Mio → 1+1+1+1+2 = 6, 60 Mio → 1+1+1 = 3 (10/25/50), < 10 Mio → 0).
export function spMilestones(score) {
  const s = num0(score);
  return SP_MILESTONES.reduce((sum, m) => (s >= m.at ? sum + m.sp : sum), 0);
}

// Score-Meilenstein-Balken (docs §6) — reine Anzeige-Ableitung. Liefert erreichte Meilensteine, die NICHT-LINEARE
// Balken-Füllung (jeder Meilenstein = 1/N der Leiste; innerhalb des Segments proportional), kumulative SP + nächstes Ziel.
export function milestoneBarState(score) {
  const s = num0(score);
  const total = SP_MILESTONES.length;
  const reached = SP_MILESTONES.reduce((k, m) => (s >= m.at ? k + 1 : k), 0);
  const atMax = reached >= total;
  let fill;
  if (atMax) fill = 1;
  else {
    const prev = reached === 0 ? 0 : SP_MILESTONES[reached - 1].at;
    const next = SP_MILESTONES[reached].at;
    const frac = next > prev ? (s - prev) / (next - prev) : 0;
    fill = (reached + Math.max(0, Math.min(1, frac))) / total;
  }
  return { reached, total, fill, atMax, spSoFar: spMilestones(s), next: atMax ? null : SP_MILESTONES[reached] };
}

// Zählt der Lauf für die SP-Ökonomie? Nur ein abgeschlossener Lauf NACH vollendetem Onboarding (Start 6/6 → immer).
export const isSpRun = (record, onboardingBefore) =>
  !!record && record.completed === true && num0(onboardingBefore) >= ONBOARDING_LINKS;

// SP-Ertrag eines Laufs. onboardingBefore = Onboarding-Stand VOR dem Lauf; spRunsBefore = Anzahl bisheriger SP-Läufe.
export function spForRun(record, onboardingBefore, spRunsBefore) {
  if (!isSpRun(record, onboardingBefore)) return 0;
  let sp = SP_PER_RUN + spMilestones(record.score);
  const c = num0(spRunsBefore) + 1;
  if (SP_LOYALTY_EVERY > 0 && c % SP_LOYALTY_EVERY === 0) sp += SP_LOYALTY_SP;
  return sp;
}

/* ============================================================
   DP-ÖKONOMIE (Deckpunkte) — zweite Währung neben SP (#299). Unverändert (#369).
   ============================================================ */
// Score-abhängige DP eines Laufs = die GLEICHE Anzahl wie die SP-Meilensteine (spMilestones), statt der früheren
//   linearen, ungedeckelten Formel floor(score/DP_PER_SCORE). Der flache Grundstock (RUN_COMPLETE_DP = 5 je
//   abgeschlossenem Nicht-Ranked-Lauf) kommt separat in storage.js dazu → Normal-Lauf = 5 + spMilestones (gedeckelt).
// treeComplete = ganzer Baum gekauft. Onboarding-/vorzeitige Läufe → 0.
export function dpForRun(record, onboardingBefore, treeComplete, spRunsBefore) {
  if (!isSpRun(record, onboardingBefore)) return 0;
  let dp = spMilestones(record.score); // gleiche Anzahl DP wie die SP-Meilensteine
  // Bei vollem Baum sind SP nutzlos → die RESTLICHE SP-Ökonomie (Grundstock + Treue; die Meilensteine sind oben
  //   schon als DP gezählt → hier abziehen, kein Doppelzählen) fließt zusätzlich als DP.
  if (treeComplete) dp += spForRun(record, onboardingBefore, spRunsBefore) - spMilestones(record.score);
  return dp;
}

// Tatsächlich gutgeschriebene SP eines Laufs: die SP-Ökonomie — ABER 0, sobald der Baum komplett ist.
export function spCreditForRun(record, onboardingBefore, treeComplete, spRunsBefore) {
  return treeComplete ? 0 : spForRun(record, onboardingBefore, spRunsBefore);
}

/* #299/#304 Onboarding-Freischalt-Diff fürs Victory-Banner — bleibt für die Rollup-Rückgabe von recordRun erhalten
   (inert bei Start 6/6). null = Glied ohne eigene Belohnung. Rein & testbar. */
export function onboardingRewardAt(link) {
  const l = Math.floor(num0(link));
  for (const [arch, ln] of Object.entries(ONBOARDING_ARCH_UNLOCK)) if (Number(ln) === l) return { type: "archetype", key: arch };
  for (const [ln, tier] of Object.entries(ONBOARDING_RARITY_UNLOCK)) if (Number(ln) === l) return { type: "rarity", tier: Number(tier) };
  if (l >= ONBOARDING_LINKS) return { type: "onboardingDone", target: "workshop" };
  return null;
}
export function nextOnboardingReward(after) {
  const a = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(num0(after))));
  for (let l = a + 1; l <= ONBOARDING_LINKS; l++) { const r = onboardingRewardAt(l); if (r) return { link: l, reward: r }; }
  return null;
}
export function onboardingUnlocks(before, after) {
  const b = Math.max(0, Math.floor(num0(before)));
  const a = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(num0(after))));
  const items = [];
  for (const [arch, link] of Object.entries(ONBOARDING_ARCH_UNLOCK)) items.push({ link: Number(link), type: "archetype", key: arch });
  for (const [link, tier] of Object.entries(ONBOARDING_RARITY_UNLOCK)) items.push({ link: Number(link), type: "rarity", tier });
  items.push({ link: ONBOARDING_LINKS, type: "onboardingDone", target: "workshop" });
  return items.filter((it) => b < it.link && a >= it.link).sort((x, y) => x.link - y.link);
}

/* ============================================================
   TEST-/DEV-CHEATS — geheime Seed-Codes.

   REIN: nur Profil-Transformation + Code-Erkennung. "unlock" = ganzer Baum frei; "reset" = Profil wipen
   (storage.js); "onboarding" = nur das (inerte) Onboarding-Feld + kleine Gutschrift.
   ============================================================ */
export const UNLOCK_SP_CUSHION = envNum("PROG_UNLOCK_SP_CUSHION", 500);
export const SECRET_SEEDS = { unlock: "unlock", reset: "reset", onboarding: "onboarding" };

// Erkennt einen geheimen Code → "unlock" | "reset" | "onboarding" | null (case-insensitiv, getrimmt).
export function matchSecretSeed(input) {
  const s = String(input == null ? "" : input).trim().toLowerCase();
  if (s === SECRET_SEEDS.unlock) return "unlock";
  if (s === SECRET_SEEDS.reset) return "reset";
  if (s === SECRET_SEEDS.onboarding) return "onboarding";
  return null;
}

// `unlock`: NEUES Profil — alle kaufbaren Knoten gekauft (stichSpent = TOTAL_COST) plus SP-Polster. Onboarding 6/6.
export function unlockAllProfile(profile) {
  // #370 Rangliste mitfreischalten: rankedUnlocked verlangt je Archetyp ≥1 abgeschlossenen Lauf. Der „unlock"-Code
  // stellt für jeden RANKED_ARCHETYPES eine 1 sicher (bestehende, höhere Zähler bleiben erhalten) → Ranked sofort frei.
  const runs = { ...(profile && profile.archetypeRunsCompleted) };
  for (const a of RANKED_ARCHETYPES) runs[a] = Math.max(1, Number(runs[a]) || 0);
  return {
    ...profile,
    onboarding: ONBOARDING_LINKS,
    nodes: Object.fromEntries(BUYABLE_IDS.map((id) => [id, 1])),
    stichSpent: TOTAL_COST,
    stichPoints: UNLOCK_SP_CUSHION,
    archetypeRunsCompleted: runs,
  };
}

// `onboarding` (Test-Code): NUR das Onboarding-Feld (6/6) + 10 SP + 50 DP; kein Baum. Rein additiv.
export function skipOnboardingProfile(profile) {
  const num = (x) => Math.max(0, Math.floor(Number(x) || 0));
  return {
    ...profile,
    onboarding: ONBOARDING_LINKS,
    stichPoints: num(profile && profile.stichPoints) + 10,
    deckPoints: num(profile && profile.deckPoints) + 50,
  };
}
