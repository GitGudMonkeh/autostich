// Wie hängt die Eis-Auszahlung an der ZAHL der Gletscher — und woran lässt sich das drehen?
//
// Die Bestandsaufnahme (§8) hat gemessen, dass jede Kombination mit Eis auf 0,43–0,63× fällt, weil der freie Spieler
// von 13,0 Eis-Skills (mono) auf 1,7–3,1 (Tripel) herunterfällt und JEDER Pick genau EINEN Gletscher friert. Diese
// Sonde rechnet den Motor ohne Kartenspiel durch: nur die Masse-Ökonomie eines Durchlaufs, exakt in der Reihenfolge
// der Engine (Nachschub → Snapshot → Siegmasse → Ewiger Frost → Boden-Einkommen → ZUG), über G = 1..12 Gletscher.
//
// Vier Hebel, einzeln und kombiniert:
//   EINKOMMEN     je Gletscher (Ewiger Frost + Siegmasse) gegen je offenem Feld (Boden) — das Brett liefert
//                 (40 − G) Felder, ist also fast KONSTANT in G, während das Gletscher-Einkommen linear mitwächst.
//   VERTEILUNG    der ZUG gibt heute an den NÄCHSTEN Gletscher; im dichten Cluster bekommen 6 von 12 gar nichts.
//                 Alternativen: gleicher Anteil für alle, oder an den mit der wenigsten Masse.
//   LEITER        heute [4, 8, 12, 18] → ×[0, 1, 1.5, 2.2, 3.2]; oberhalb 18 wächst nur noch die Masse linear.
//                 Verlängert man sie, lohnt sich ANSAMMELN — die Voraussetzung für „einer bricht stark".
//   TRIGGER       heute bricht ein Gletscher, sobald er 12 erreicht. Wer sammeln will, braucht einen anderen Auslöser.
//
//   node sim/probes/eis-kurve.mjs            alle Tabellen
//   node sim/probes/eis-kurve.mjs --tabelle B    nur eine (A|B|C|D)
//
// Ausgabe bleibt deutsch: die Tabellen wandern nach docs/skill-rework.md, das Dokument des Owners.
import { precomputeGlacier, THRESHOLDS, TIER_MULT, BURST_AT, KEEP_MAX, EWIGER_FROST, WIN_MASS,
  FIRN_REFILL_TARGET } from "../../src/game/glacier.js";
import { N_POS, rowOf, colOf } from "../../src/game/architect.js";

const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def; };
const ONLY = String(arg("--tabelle", "")).toUpperCase();
const CYCLES = Number(arg("--durchlaeufe", 45));   // ein Lauf hat ~45 Durchläufe
const WINRATE = Number(arg("--siegquote", 0.6));   // gemessene Eis-Siegquote (§8: 59–64 %)
const GS = [1, 2, 3, 4, 6, 8, 12];

const sum = (a) => a.reduce((t, v) => t + v, 0);

/* ---- Bretter: dasselbe Feld, einmal so dicht wie möglich und einmal so verstreut wie möglich. Der Spieler baut
   in der Sim dicht (die Fraktions-Policy zielt auf das 3×3-Cluster), aber ein Misch-Build mit zwei Picks hat gar
   keine Wahl — deshalb zählt beides. */
const CLUSTER = [0, 1, 5, 6, 2, 7, 10, 11, 12, 3, 8, 13];
const SCATTER = [0, 4, 20, 24, 10, 14, 30, 34, 2, 12, 22, 32];
const boardOf = (ps) => { const l = new Array(N_POS).fill(false); for (const p of ps) l[p] = true; return l; };

/* ---- Die drei Verteilungsregeln für den ZUG ------------------------------------------------------- */
const cheb = (a, b) => Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));
const RULES = {
  // heute (firnDrawTick): jedes offene Feld an den NÄCHSTEN Gletscher, Gleichstand an den niedrigsten Index.
  nah(firn, mass, gs) {
    for (let p = 0; p < N_POS; p++) {
      if (!(firn[p] > 0) || gs.includes(p)) continue;
      let best = gs[0], bd = Infinity;
      for (const g of gs) { const d = cheb(p, g); if (d < bd) { bd = d; best = g; } }
      mass[best] += firn[p]; firn[p] = 0;
    }
  },
  // alle Gletscher in gleicher Entfernung teilen sich das Feld (kein Gleichstand-Gewinner mehr).
  geteilt(firn, mass, gs) {
    for (let p = 0; p < N_POS; p++) {
      if (!(firn[p] > 0) || gs.includes(p)) continue;
      let bd = Infinity;
      for (const g of gs) { const d = cheb(p, g); if (d < bd) bd = d; }
      const near = gs.filter((g) => cheb(p, g) === bd);
      for (const g of near) mass[g] += firn[p] / near.length;
      firn[p] = 0;
    }
  },
  // an den hungrigsten: das Feld füttert den Gletscher mit der geringsten Masse (Entfernung als Gleichstand-Regel).
  hungrig(firn, mass, gs) {
    for (let p = 0; p < N_POS; p++) {
      if (!(firn[p] > 0) || gs.includes(p)) continue;
      let best = gs[0];
      for (const g of gs) if (mass[g] < mass[best] || (mass[g] === mass[best] && cheb(p, g) < cheb(p, best))) best = g;
      mass[best] += firn[p]; firn[p] = 0;
    }
  },
  // anteilig nach Nähe: jedes Feld teilt seine Reserve auf ALLE Gletscher, Gewicht 1/Abstand. Niemand verhungert,
  // die Lage bleibt aber relevant — ein Gletscher am Rand des freien Bretts bekommt mehr als einer im Inneren.
  anteilig(firn, mass, gs) {
    for (let p = 0; p < N_POS; p++) {
      if (!(firn[p] > 0) || gs.includes(p)) continue;
      const w = gs.map((g) => 1 / Math.max(1, cheb(p, g)));
      const tot = w.reduce((t, v) => t + v, 0);
      gs.forEach((g, i) => { mass[g] += firn[p] * w[i] / tot; });
      firn[p] = 0;
    }
  },
  // gleich: die ganze Boden-Reserve ist EIN Vorrat und teilt sich gleichmäßig auf alle Gletscher (Lage egal).
  gleich(firn, mass, gs) {
    let pool = 0;
    for (let p = 0; p < N_POS; p++) if (!gs.includes(p) && firn[p] > 0) { pool += firn[p]; firn[p] = 0; }
    if (pool > 0) for (const g of gs) mass[g] += pool / gs.length;
  },
};

/* ---- Die Berst-Trigger. „heute" ist die Schwelle 12; die anderen erlauben ANSAMMELN. ---------------- */
const TRIGGERS = {
  heute: { burstAt: BURST_AT },                    // bricht ab Masse 12
  spitze: { burstAt: THRESHOLDS[THRESHOLDS.length - 1] }, // bricht erst an der obersten Schwelle (18)
  hoch24: { burstAt: 24 },                         // bricht erst weit oben — wer wenig Gletscher hat, kommt trotzdem hin
  hoch32: { burstAt: 32 },
  takt3: { burstAt: BURST_AT, every: 3 },          // hält zwei Durchläufe, im dritten bricht alles Reife
  takt4: { burstAt: BURST_AT, every: 4 },
};

/* ---- Leitern. Verlängert man sie, zahlt Ansammeln über 18 hinaus weiter. --------------------------- */
const LADDERS = {
  heute: { thresholds: THRESHOLDS, tierMult: TIER_MULT },
  // dieselben Stufen, oben weitergeführt — jede Sprosse legt wieder gut ein Drittel drauf, wie 12 → 18.
  lang: { thresholds: [4, 8, 12, 18, 26, 36, 50], tierMult: [0, 1, 1.5, 2.2, 3.2, 4.4, 5.8, 7.4] },
  // enger gestufte Fortsetzung: die Sprossen liegen so dicht, dass angesammelte Masse sie auch erreicht.
  dicht: { thresholds: [4, 8, 12, 18, 24, 30, 38, 48], tierMult: [0, 1, 1.5, 2.2, 3.2, 4.2, 5.2, 6.4, 7.8] },
};

/* ---- Ein Lauf der Masse-Ökonomie. Reihenfolge exakt wie engine.js (Zeilen 232–268 und 962–980). ---- */
function laufen(locked, { perGlacier, boardPerField, rule = "nah", ladder = "heute", trigger = "heute",
  keepMax = KEEP_MAX, cycles = CYCLES } = {}) {
  const gs = []; for (let p = 0; p < N_POS; p++) if (locked[p]) gs.push(p);
  const mass = new Array(N_POS).fill(0);
  const firn = new Array(N_POS).fill(0);
  const L = LADDERS[ladder], T = TRIGGERS[trigger];
  let payout = 0, bursts = 0, burstMass = 0;
  for (let c = 0; c < cycles; c++) {
    // Rundenanfang: Nachschub aus der eigenen Boden-Reserve auf FIRN_REFILL_TARGET, dann der Snapshot.
    for (const g of gs) {
      const draw = Math.max(0, Math.min(FIRN_REFILL_TARGET - mass[g], firn[g]));
      if (draw > 0) { mass[g] += draw; firn[g] -= draw; }
    }
    // Takt-Trigger: in den Zwischen-Durchläufen wird nicht gebrochen (Schwelle unerreichbar hoch).
    const halten = T.every ? (c + 1) % T.every !== 0 : false;
    const snap = precomputeGlacier(mass, locked, { thresholds: L.thresholds, tierMult: L.tierMult,
      burstAt: halten ? Infinity : T.burstAt, keepMax });
    payout += sum(snap.payout);
    for (const b of snap.breaks) { bursts++; burstMass += mass[b.pos]; }
    for (let p = 0; p < N_POS; p++) mass[p] = snap.resetMass[p];
    // Während der Runde: Siegmasse auf jeden Gletscher, der seinen Stich gewinnt.
    for (const g of gs) mass[g] += WIN_MASS * WINRATE;
    // Rundenende: Ewiger Frost (+ was der Skill-Sockel liefert), Boden-Einkommen, dann der ZUG.
    for (const g of gs) mass[g] += perGlacier;
    if (boardPerField > 0) for (let p = 0; p < N_POS; p++) if (!locked[p]) firn[p] += boardPerField;
    RULES[rule](firn, mass, gs);
  }
  return { payout: payout / cycles, bursts: bursts / cycles, massJeBruch: bursts ? burstMass / bursts : 0 };
}

/* ---- Ausgabe --------------------------------------------------------------------------------------- */
const kopf = (t, s) => { console.log(`\n=== ${t} ===`); if (s) console.log(`  ${s}`); };

// Das heutige Einkommen: Ewiger Frost (1) je Durchlauf; die Siegmasse steckt schon in `laufen`.
const HEUTE = { perGlacier: EWIGER_FROST, boardPerField: 0 };
// Referenz: was Mono (G=12, dicht) heute je Durchlauf auszahlt. Alle Varianten werden darauf normiert, denn die
// Frage ist nicht „wie viel mehr", sondern „wie verteilt sich dieselbe Mono-Stärke über die Gletscherzahl".
const MONO_HEUTE = laufen(boardOf(CLUSTER), HEUTE).payout;

/* Jede Variante in ZWEI Zahlen, die die Entscheidung tragen:
     Anteil je G  — Auszahlung ÷ Auszahlung bei G=12, in Prozent. Heute steht G=3 bei 18 %.
     Regler       — die BURST_SCALE, mit der Mono (G=12) genau dort bliebe, wo es heute steht. */
function tabelle(title, sub, variants, board = CLUSTER) {
  kopf(title, sub);
  console.log(`  ${"Variante".padEnd(32)} ${GS.map((g) => `G=${g}`.padStart(6)).join("")}   Regler`);
  for (const [name, opts] of variants) {
    const row = GS.map((g) => laufen(boardOf(board.slice(0, g)), opts).payout);
    const mono = row[GS.indexOf(12)];
    const regler = 30 * MONO_HEUTE / mono;
    console.log(`  ${name.padEnd(32)} ${row.map((v) => `${Math.round(v / mono * 100)}%`.padStart(6)).join("")}   ${regler.toFixed(1).padStart(6)}`);
  }
}

if (!ONLY || ONLY === "A") {
  tabelle("A · Wo das Einkommen herkommt (dicht gebaut, ZUG wie heute)",
    "Das Brett liefert (40−G) Felder — fast konstant in G; der Gletscher-Sockel wächst linear mit G.",
    [
      ["heute (1 je Gletscher, 0 Boden)", HEUTE],
      ["1 Gl. + 0,25 Boden", { perGlacier: 1, boardPerField: 0.25 }],
      ["1 Gl. + 0,5 Boden", { perGlacier: 1, boardPerField: 0.5 }],
      ["0,75 Gl. + 0,5 Boden", { perGlacier: 0.75, boardPerField: 0.5 }],
      ["0,5 Gl. + 0,5 Boden", { perGlacier: 0.5, boardPerField: 0.5 }],
      ["0,5 Gl. + 1 Boden", { perGlacier: 0.5, boardPerField: 1 }],
      ["0 Gl. + 1 Boden", { perGlacier: 0, boardPerField: 1 }],
    ]);
}

if (!ONLY || ONLY === "B") {
  tabelle("B · Was die Verteilungsregel des ZUGs ändert (1 Gl. + 0,5 Boden, dicht gebaut)",
    "Heute bekommt im dichten Cluster ein Randgletscher fast alles und die inneren gar nichts.",
    [
      ["nah (heute)", { perGlacier: 1, boardPerField: 0.5, rule: "nah" }],
      ["geteilt (gleicher Abstand teilt)", { perGlacier: 1, boardPerField: 0.5, rule: "geteilt" }],
      ["anteilig (Gewicht 1/Abstand)", { perGlacier: 1, boardPerField: 0.5, rule: "anteilig" }],
      ["gleich (ein Vorrat, gleich geteilt)", { perGlacier: 1, boardPerField: 0.5, rule: "gleich" }],
      ["hungrig (an den mit am wenigsten)", { perGlacier: 1, boardPerField: 0.5, rule: "hungrig" }],
    ]);
  kopf("B2 · Masse je Gletscher nach einem Durchlauf (G=12, dicht, 1 Boden)", "");
  for (const rule of ["nah", "geteilt", "anteilig", "gleich", "hungrig"]) {
    const locked = boardOf(CLUSTER), gs = CLUSTER.slice().sort((a, b) => a - b);
    const mass = new Array(N_POS).fill(0), firn = new Array(N_POS).fill(0);
    for (let p = 0; p < N_POS; p++) if (!locked[p]) firn[p] = 1;
    RULES[rule](firn, mass, gs);
    const v = gs.map((p) => mass[p]);
    console.log(`  ${rule.padEnd(9)} ${v.map((x) => x.toFixed(1).padStart(5)).join(" ")}   leer: ${v.filter((x) => x === 0).length}/12`);
  }
}

// Der Kandidat aus A und B, auf dem C und D aufsetzen.
const BASIS = { perGlacier: 1, boardPerField: 0.5, rule: "anteilig" };

if (!ONLY || ONLY === "C") {
  tabelle("C · Sammeln statt verteilen: Leiter und Trigger (1 Gl. + 0,5 Boden, anteilig)",
    "Heute bricht ein Gletscher bei 12 — ansammeln ist gar nicht möglich, und über 18 zahlt die Leiter nicht mehr.",
    [
      ["Leiter heute · Trigger heute", BASIS],
      ["Leiter lang  · Trigger heute", { ...BASIS, ladder: "lang" }],
      ["Leiter dicht · Trigger heute", { ...BASIS, ladder: "dicht" }],
      ["Leiter dicht · Schwelle 18", { ...BASIS, ladder: "dicht", trigger: "spitze" }],
      ["Leiter dicht · Schwelle 24 · Rest 12", { ...BASIS, ladder: "dicht", trigger: "hoch24", keepMax: 12 }],
      ["Leiter dicht · Schwelle 32 · Rest 16", { ...BASIS, ladder: "dicht", trigger: "hoch32", keepMax: 16 }],
      ["Leiter dicht · Takt 3", { ...BASIS, ladder: "dicht", trigger: "takt3" }],
      ["Leiter dicht · Takt 4", { ...BASIS, ladder: "dicht", trigger: "takt4" }],
    ]);
}

if (!ONLY || ONLY === "E") {
  tabelle("E · Feinsweep des Boden-Anteils (ZUG anteilig, Leiter und Trigger wie heute)",
    "Der eine Regler, der die Kurve macht. Der Gletscher-Sockel bleibt bei 1 (Ewiger Frost).",
    [
      ["0 Boden (heute)", { perGlacier: 1, boardPerField: 0, rule: "anteilig" }],
      ["0,15 Boden", { perGlacier: 1, boardPerField: 0.15, rule: "anteilig" }],
      ["0,25 Boden", { perGlacier: 1, boardPerField: 0.25, rule: "anteilig" }],
      ["0,35 Boden", { perGlacier: 1, boardPerField: 0.35, rule: "anteilig" }],
      ["0,5 Boden", { perGlacier: 1, boardPerField: 0.5, rule: "anteilig" }],
      ["0,75 Boden", { perGlacier: 1, boardPerField: 0.75, rule: "anteilig" }],
      ["1 Boden", { perGlacier: 1, boardPerField: 1, rule: "anteilig" }],
    ]);
}

if (!ONLY || ONLY === "D") {
  const variants = [
    ["heute", HEUTE],
    ["Basis (1 Gl. + 0,5 Boden, anteilig)", BASIS],
    ["Basis + Leiter dicht", { ...BASIS, ladder: "dicht" }],
    ["Basis + Schwelle 24 · Rest 12", { ...BASIS, ladder: "dicht", trigger: "hoch24", keepMax: 12 }],
    ["Basis + Takt 3", { ...BASIS, ladder: "dicht", trigger: "takt3" }],
  ];
  kopf("D · Dicht gegen verstreut — was ein Misch-Build ohne Bauplatz überhaupt erreichen kann",
    "Ein Splash mit zwei bis drei Picks kann nicht dicht bauen. Werte: dicht ÷ verstreut.");
  console.log(`  ${"Variante".padEnd(38)} ${GS.map((g) => `G=${g}`.padStart(7)).join("")}`);
  for (const [name, opts] of variants) {
    const row = GS.map((g) => laufen(boardOf(CLUSTER.slice(0, g)), opts).payout / laufen(boardOf(SCATTER.slice(0, g)), opts).payout);
    console.log(`  ${name.padEnd(38)} ${row.map((v) => `${v.toFixed(2)}×`.padStart(7)).join("")}`);
  }

  kopf("D2 · Brüche je Durchlauf und Masse je Bruch (dicht) — viele klein gegen einer stark", "");
  console.log(`  ${"Variante".padEnd(38)} ${"G=2".padStart(14)} ${"G=3".padStart(14)} ${"G=12".padStart(14)}`);
  for (const [name, opts] of variants) {
    const cell = (g) => { const r = laufen(boardOf(CLUSTER.slice(0, g)), opts); return `${r.bursts.toFixed(2)} / ${r.massJeBruch.toFixed(0)}`; };
    console.log(`  ${name.padEnd(38)} ${cell(2).padStart(14)} ${cell(3).padStart(14)} ${cell(12).padStart(14)}`);
  }
}
