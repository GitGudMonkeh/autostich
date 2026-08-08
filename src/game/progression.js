/* ============================================================
   UPGRADES / PROGRESSION-BAUM — laufübergreifende Meta-Progression über Stichpunkte (SP).

   PUR & node-testbar (Analogon zu mastery.js/rarity.js): hält NUR die Knoten-Defs (data-driven),
   die Kauf-/Voraussetzungs-/Gate-/Respec-Logik und die Effekt-Ableitungen. KEINE UI-/Asset-Importe,
   KEINE localStorage-Zugriffe, KEIN RNG/Date — die Persistenz lebt in storage.js (Profil), die
   Anwendung im reducer, die Anzeige in der UI. So bleibt das Modul in `environment: "node"` prüfbar
   und deterministisch.

   Source of Truth der Knotendaten: src/ui/UpgradeScreen.jsx (hier gespiegelt), Design: docs/
   progression-decisions.md. 13 Knoten, 4 Äste (Sequenzen I→II→III), Gesamt 134 SP; Nicht-Meister-
   Knoten Σ 68 SP. Master-Rang ist entfernt — die alten Auto-Rewards werden hier zu wählbaren Knoten.

   Profil-Shape: { stichPoints, stichSpent, nodes: { [nodeId]: 1 } }  (Level 1 = gekauft).
   ============================================================ */

// SIM-/Balance-Haken wie in constants.js: per ENV übersteuerbar, Default = aktueller Wert → in der App
// (kein `process`) immer der Default. Erlaubt reproduzierbares Tuning der Gate-Schwellen ohne Code-Edit.
const envNum = (name, def) => {
  const v = (typeof process !== "undefined" && process.env) ? process.env[name] : undefined;
  const n = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
};

// Meister-Gate-Schwellen als Anteil der Nicht-Meister-SP (25 % / 50 % / 75 %). Tunebar; resolved
// gegen NONMEISTER_TOTAL → 17 / 34 / 51 SP bei Default-Baum. Siehe docs/progression-decisions.md §.
export const GATE_PCT_M2 = envNum("PROG_GATE_PCT_M2", 0.25);
export const GATE_PCT_M3 = envNum("PROG_GATE_PCT_M3", 0.50);
export const GATE_PCT_M4 = envNum("PROG_GATE_PCT_M4", 0.75);

/* ---- Knoten-Defs (data-driven, exakt UpgradeScreen.jsx) -----------------------------------
   Feld  prereq = Vorgänger-Knoten in der Ast-Sequenz (null = erster). Äste sind unabhängig.
   Feld  cover  = Baufeld-Zellen-Zuwachs des Knotens (nur Baufeld-Ast). Feld gate = Meister-Gate. */
export const NODES = [
  // 🏗 Baufeld — Bau-Ökonomie (Zellen 24→28). cover summiert zu treeCoverBonus 0..4.
  { id: "B1", branch: "bau", roman: "I",   label: "+1 Zelle",    detail: "24 → 25", cost: 2,  prereq: null, cover: 1 },
  { id: "B2", branch: "bau", roman: "II",  label: "+1 Zelle",    detail: "25 → 26", cost: 5,  prereq: "B1", cover: 1 },
  { id: "B3", branch: "bau", roman: "III", label: "+2 Zellen",   detail: "26 → 28", cost: 9,  prereq: "B2", cover: 2 },
  // 🎬 Auftakt — Rerolls (+1 je Phase je Knoten). Anzahl gekaufter Knoten = treeRerollBonus 0..2.
  { id: "A1", branch: "auf", roman: "I",   label: "Reroll II",   detail: "+1 / Phase", cost: 6,  prereq: null },
  { id: "A2", branch: "auf", roman: "II",  label: "Reroll III",  detail: "+1 / Phase", cost: 12, prereq: "A1" },
  // ✨ Rarität — Angebots-Qualität (RareShift-Stufe = höchster gekaufter Rang, 0..3).
  { id: "R1", branch: "rar", roman: "I",   label: "Seltenheit",  detail: "bessere Chancen", cost: 6,  prereq: null, shift: 1 },
  { id: "R2", branch: "rar", roman: "II",  label: "Seltenheit",  detail: "bessere Chancen", cost: 10, prereq: "R1", shift: 2 },
  { id: "R3", branch: "rar", roman: "III", label: "Seltenheit",  detail: "bessere Chancen", cost: 18, prereq: "R2", shift: 3 },
  // 👑 Meister — Legendäre / Prestige. Zusätzlich zur Sequenz greifen die Gates (onb/pct/all).
  { id: "M1", branch: "mei", roman: "I",   label: "Reroll f. Leg.-Slot", detail: "Runde 29",        cost: 4,  prereq: null, flag: "legSlotReroll",       gate: { type: "onb" } },
  { id: "M2", branch: "mei", roman: "II",  label: "2 Leg. je Archetyp",  detail: "Skill-Slot",      cost: 9,  prereq: "M1", flag: "legTwoPerArch",       gate: { type: "pct", pct: GATE_PCT_M2 } },
  { id: "M3", branch: "mei", roman: "III", label: "Leg. Drop-Rate ×2",   detail: "Perks & Gebäude", cost: 13, prereq: "M2", flag: "legDropDouble",       gate: { type: "pct", pct: GATE_PCT_M3 } },
  { id: "M4", branch: "mei", roman: "IV",  label: "Garant. Leg.-Perk",   detail: "2. Perk-Phase",   cost: 18, prereq: "M3", flag: "legGuaranteedPerk2",  gate: { type: "pct", pct: GATE_PCT_M4 } },
  { id: "M5", branch: "mei", roman: "V",   label: "Wahl aus 3 Leg.",     detail: "2. Perk-Phase",   cost: 22, prereq: "M4", flag: "legChoose3Perk2",     gate: { type: "all" } },
];

// Ast-Metadaten (Reihenfolge + Anzeige). Farben/Emoji leben in der UI; hier nur strukturelle Namen.
export const BRANCHES = [
  { key: "bau", name: "Baufeld", desc: "Bau-Ökonomie" },
  { key: "auf", name: "Auftakt", desc: "Rerolls" },
  { key: "rar", name: "Rarität", desc: "Angebots-Qualität" },
  { key: "mei", name: "Meister", desc: "Legendäre / Prestige" },
];

export const NODE_BY_ID = NODES.reduce((m, n) => { m[n.id] = n; return m; }, {});
export const NODE_IDS = NODES.map((n) => n.id);

// Nicht-Meister-Knoten (Baufeld/Auftakt/Rarität) — Basis für Gate-Prozente und Deckung.
export const NONMEISTER_IDS = NODES.filter((n) => n.branch !== "mei").map((n) => n.id);
export const MEISTER_IDS = NODES.filter((n) => n.branch === "mei").map((n) => n.id);
// Σ SP über alle Nicht-Meister-Knoten (= 68 im Default-Baum) und Gesamtsumme (= 134).
export const NONMEISTER_TOTAL = NONMEISTER_IDS.reduce((s, id) => s + NODE_BY_ID[id].cost, 0);
export const TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);
export const TOTAL_NODES = NODES.length;

/* ---- Profil-Helfer ------------------------------------------------------------------------ */

// Sicheres Lesen: gilt ein Knoten als gekauft? (Level 1 = gekauft; alles Wahre zählt.)
export const owns = (profile, id) => !!(profile && profile.nodes && profile.nodes[id]);

// Frisches Profil (kein RNG/Date). sp = Startguthaben (default 0).
export const emptyProfile = (sp = 0) => ({ stichPoints: Math.max(0, Math.floor(Number(sp) || 0)), stichSpent: 0, nodes: {} });

// SP-Guthaben robust lesen.
const points = (profile) => Math.max(0, Math.floor(Number(profile && profile.stichPoints) || 0));

/* ---- Abgeleitete Größen ------------------------------------------------------------------- */

// In Nicht-Meister-Knoten investierte SP (Basis der Meister-pct-Gates).
export function nonMeisterSpent(profile) {
  return NONMEISTER_IDS.reduce((s, id) => (owns(profile, id) ? s + NODE_BY_ID[id].cost : s), 0);
}

// Aufgelöste SP-Schwelle eines pct-Gates (aufgerundet gegen NONMEISTER_TOTAL). Bei Default 17/34/51.
export const gateNeed = (node) => Math.ceil((node && node.gate && node.gate.pct ? node.gate.pct : 0) * NONMEISTER_TOTAL);

// Onboarding-Status. Schritt 1: als erfüllt angenommen; liest optional profile.onboarding, wenn später
// gesetzt (>=6 Glieder → true). Fehlt das Feld → true (Vorschau-/Default-Verhalten).
export const onboardingDone = (profile) => {
  if (profile && Object.prototype.hasOwnProperty.call(profile, "onboarding")) {
    return (Number(profile.onboarding) || 0) >= ONBOARDING_LINKS;
  }
  return true;
};
export const ONBOARDING_LINKS = 6; // Länge der Onboarding-Kette (docs §4); Feld folgt in Schritt 2.

// Erfüllt der Knoten sein Gate? (Nicht-Meister-Knoten haben keins → true.)
export function gateMet(profile, node) {
  const g = node && node.gate;
  if (!g) return true;
  if (g.type === "onb") return onboardingDone(profile);
  if (g.type === "pct") return nonMeisterSpent(profile) >= gateNeed(node);
  if (g.type === "all") return NONMEISTER_IDS.every((id) => owns(profile, id)) && ["M1", "M2", "M3", "M4"].every((id) => owns(profile, id));
  return true;
}

// Vorgänger in der Ast-Sequenz gekauft? (Erster Knoten → true.)
export const prereqMet = (profile, node) => !node.prereq || owns(profile, node.prereq);

/* ---- nodeEffects — die vom Reducer/UI konsumierten Ableitungen ----------------------------
   Frisches/leeres Profil = beweisbares No-op: Cover 0, Reroll 0, RareShift 0, alle Flags false. */
export function nodeEffects(profile) {
  let treeCoverBonus = 0;
  let treeRerollBonus = 0;
  let treeRareShift = 0;
  const flags = {
    legSlotReroll: false,
    legTwoPerArch: false,
    legDropDouble: false,
    legGuaranteedPerk2: false,
    legChoose3Perk2: false,
  };
  for (const n of NODES) {
    if (!owns(profile, n.id)) continue;
    if (n.branch === "bau") treeCoverBonus += n.cover || 0;
    else if (n.branch === "auf") treeRerollBonus += 1;
    else if (n.branch === "rar") treeRareShift = Math.max(treeRareShift, n.shift || 0);
    else if (n.branch === "mei" && n.flag) flags[n.flag] = true;
  }
  return { treeCoverBonus, treeRerollBonus, treeRareShift, ...flags };
}

// Einzel-Ableiter (spiegeln die Reducer-Nähte treeX(profile), analog masteryX(grade)).
export const treeCoverBonus = (profile) => nodeEffects(profile).treeCoverBonus;
export const treeRerollBonus = (profile) => nodeEffects(profile).treeRerollBonus;
export const treeRareShift = (profile) => nodeEffects(profile).treeRareShift;

/* ---- Kauf-Zustand & -Aktionen ------------------------------------------------------------- */

// Fein aufgelöster Knoten-Zustand (spiegelt UpgradeScreen.stateOf): owned / lock-prev / lock-gate /
// lock-sp / buy. Rein & deterministisch → sowohl UI als auch Tests nutzen dieselbe Wahrheit.
export function nodeState(profile, id) {
  const n = NODE_BY_ID[id];
  if (!n) return "unknown";
  if (owns(profile, id)) return "owned";
  if (!prereqMet(profile, n)) return "lock-prev";
  if (!gateMet(profile, n)) return "lock-gate";
  if (points(profile) < n.cost) return "lock-sp";
  return "buy";
}

// Kaufbar? (nicht gekauft, Vorgänger + Gate erfüllt, genug SP.)
export const canBuy = (profile, id) => nodeState(profile, id) === "buy";

// Kauf → NEUES Profil (SP abziehen, in stichSpent buchen, Knoten auf Level 1). Nicht kaufbar → Eingabe
// unverändert zurück (No-op, keine Mutation).
export function buyNode(profile, id) {
  if (!canBuy(profile, id)) return profile;
  const n = NODE_BY_ID[id];
  return {
    ...profile,
    stichPoints: points(profile) - n.cost,
    stichSpent: (Math.max(0, Math.floor(Number(profile && profile.stichSpent) || 0))) + n.cost,
    nodes: { ...(profile && profile.nodes), [id]: 1 },
  };
}

// Respec → NEUES Profil: erstattet EXAKT die Kosten aller aktuell gekauften Knoten aufs Guthaben,
// leert nodes und setzt stichSpent auf 0. Rechnet aus den Knoten (robust gegen stichSpent-Drift).
export function respec(profile) {
  const refund = NODES.reduce((s, n) => (owns(profile, n.id) ? s + n.cost : s), 0);
  return { ...profile, stichPoints: points(profile) + refund, stichSpent: 0, nodes: {} };
}

// Baum komplett? (alle 13 Knoten gekauft → schaltet Meister-Liga frei.)
export const treeComplete = (profile) => NODE_IDS.every((id) => owns(profile, id));

// Anzahl gekaufter Knoten (für die „X / 13"-Leiste).
export const ownedCount = (profile) => NODE_IDS.reduce((c, id) => (owns(profile, id) ? c + 1 : c), 0);

/* ============================================================
   SP-ÖKONOMIE & ONBOARDING — Ernte pro Lauf (docs/progression-decisions.md §4–§6).

   REINE Regeln (kein RNG/Date/localStorage); storage.recordRun importiert und wendet sie an — exakt das
   Muster mastery.advanceGrade ↔ storage. Der Sim läuft profil-los → diese Regeln berühren die Engine-
   Baseline NICHT (keine neuen RNG-Ströme, keine Reducer-Naht).
   ============================================================ */

// SP-Quellen (envNum-tunebar). Grundstock je abgeschlossenem SP-Lauf + kumulative Score-Meilensteine +
// Treue-Drip je N SP-Läufe. Defaults = docs §6: +1/Lauf; +1/+1/+1/+2 bei 25/50/75/100 Mio; +5 je 10.
export const SP_PER_RUN = envNum("PROG_SP_PER_RUN", 1);
export const SP_MILESTONES = [
  { at: envNum("PROG_SP_MS1_AT", 25_000_000),  sp: envNum("PROG_SP_MS1_SP", 1) },
  { at: envNum("PROG_SP_MS2_AT", 50_000_000),  sp: envNum("PROG_SP_MS2_SP", 1) },
  { at: envNum("PROG_SP_MS3_AT", 75_000_000),  sp: envNum("PROG_SP_MS3_SP", 1) },
  { at: envNum("PROG_SP_MS4_AT", 100_000_000), sp: envNum("PROG_SP_MS4_SP", 2) },
];
export const SP_LOYALTY_EVERY = envNum("PROG_SP_LOYALTY_EVERY", 10);
export const SP_LOYALTY_SP    = envNum("PROG_SP_LOYALTY_SP", 5);

const num0 = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v) || 0);

// Onboarding-Fortschritt nach einem Lauf (docs §4): ein NATÜRLICH abgeschlossener Lauf (record.completed)
// rückt genau ein Glied vor, gedeckelt bei ONBOARDING_LINKS (6). Vorzeitiges Beenden zählt nicht.
export function onboardingAfter(current, record) {
  const cur = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(num0(current))));
  return (record && record.completed === true && cur < ONBOARDING_LINKS) ? cur + 1 : cur;
}

// Kumulative Score-Meilenstein-SP eines Laufs (jede überschrittene Schwelle addiert ihre SP;
// 100 Mio → 1+1+1+2 = 5, 60 Mio → 1+1 = 2, < 25 Mio → 0).
export function spMilestones(score) {
  const s = num0(score);
  return SP_MILESTONES.reduce((sum, m) => (s >= m.at ? sum + m.sp : sum), 0);
}

// Zählt der Lauf für die SP-Ökonomie? Nur ein abgeschlossener Lauf NACH vollendetem Onboarding (docs §5:
// die Leiste „kippt" erst bei 6/6 in den SP-Modus, davor ist die Upgrades-Kachel gesperrt → keine SP).
export const isSpRun = (record, onboardingBefore) =>
  !!record && record.completed === true && num0(onboardingBefore) >= ONBOARDING_LINKS;

// SP-Ertrag eines Laufs. onboardingBefore = Onboarding-Stand VOR dem Lauf; spRunsBefore = Anzahl bisheriger
// SP-Läufe (Basis des Treue-Drips). Onboarding-Läufe & vorzeitig beendete Läufe → 0.
export function spForRun(record, onboardingBefore, spRunsBefore) {
  if (!isSpRun(record, onboardingBefore)) return 0;
  let sp = SP_PER_RUN + spMilestones(record.score);
  const c = num0(spRunsBefore) + 1;
  if (SP_LOYALTY_EVERY > 0 && c % SP_LOYALTY_EVERY === 0) sp += SP_LOYALTY_SP;
  return sp;
}

/* ============================================================
   TEST-/DEV-CHEATS — geheime Seed-Codes (schnelles Onboarding-Testen zu zweit).

   REIN: nur Profil-Transformation + Code-Erkennung. Der Live-/Sim-Build wird NICHT berührt — die UI fängt
   die Codes nur im Preview-Build ab (sonst ließe sich per `unlock`/treeComplete die Meister-Liga aushebeln)
   und storage/App wenden das Ergebnis an. Alles-freigeschaltet leitet sich aus onboarding + nodes ab —
   KEINE separaten „unlocked"-Flags (dieselbe Wahrheit, die Reducer/Onboarding-Gates in Schritt 3/4 lesen).
   ============================================================ */

// SP-Polster, das `unlock` gutschreibt, damit man nach einem Respec (Erstattung = TOTAL_COST) bequem den
// Kauf-/Gate-Flow durchtesten kann. envNum-tunebar.
export const UNLOCK_SP_CUSHION = envNum("PROG_UNLOCK_SP_CUSHION", 500);

// Geheime Seed-Codes (Kleinbuchstaben, exakt) — in der UI VOR parseSeed abgefangen (beide würden sonst als
// gültige Seeds durchgehen). "unlock" = skippen & alles frei; "reset" = ganzes Profil wipen (in storage.js).
export const SECRET_SEEDS = { unlock: "unlock", reset: "reset" };

// Erkennt einen geheimen Code in der Seed-Eingabe → "unlock" | "reset" | null (case-insensitiv, getrimmt).
export function matchSecretSeed(input) {
  const s = String(input == null ? "" : input).trim().toLowerCase();
  if (s === SECRET_SEEDS.unlock) return "unlock";
  if (s === SECRET_SEEDS.reset) return "reset";
  return null;
}

// `unlock`: NEUES Profil — Onboarding fertig (6/6), alle 13 Knoten gekauft (stichSpent = TOTAL_COST) plus
// SP-Polster. Übrige Profil-Felder (Stats/Flags/Cosmetics) bleiben unangetastet.
export function unlockAllProfile(profile) {
  return {
    ...profile,
    onboarding: ONBOARDING_LINKS,
    nodes: Object.fromEntries(NODE_IDS.map((id) => [id, 1])),
    stichSpent: TOTAL_COST,
    stichPoints: UNLOCK_SP_CUSHION,
  };
}
