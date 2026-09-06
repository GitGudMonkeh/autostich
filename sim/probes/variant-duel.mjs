// Duell je Variante: eine Stufentabelle wird VOR dem Laden der Sim umgeschrieben (dieselbe Zeilen-Referenz wie
// SKILL_DEFS[*].tiers), dann --mode duel mit 100 Läufen. So lassen sich Kennwerte messen, ohne den Code anzufassen.
// VARIANT = Name aus `V` (Default aktuell); Konstanten dazu über SIM_*-Umgebungsvariablen. Neue Varianten: eine Zeile in `V`.
// Beispiel (§7.23): die Ladungsserie-Sätze ÷2, ÷4, ÷10 gegen den Stand davor.
import { BLITZ_TIERS as B, FEUER_TIERS as F } from "../../src/game/skills.js";
const V = {
  aktuell:       () => {},
  serieHalf:     () => { [0.5, 0.75, 1, 1.25].forEach((v, i) => { B.serie[i].critPerStreak = v / 100; }); },
  serieQuarter:  () => { [0.25, 0.5, 0.75, 1].forEach((v, i) => { B.serie[i].critPerStreak = v / 100; }); },
  feuerlinieKost5: () => { F.feuerlinie.forEach((r) => { r.cost = 5; }); },
};
const names = (process.env.VARIANT || "aktuell").split(",").map((s) => s.trim()).filter(Boolean);
for (const n of names) { if (!V[n]) { console.error(`unbekannte Variante ${n} — bekannt: ${Object.keys(V).join(", ")}`); process.exit(1); } V[n](); }
const env = Object.entries(process.env).filter(([k]) => k.startsWith("SIM_")).map(([k, v]) => `${k}=${v}`).join(" ");
console.log(`Variante ${names.join("+")}${env ? ` (${env})` : ""}`);
const { runDuel } = await import("../duel.js");
runDuel({ arg: (n, d) => (n === "--runs" ? String(process.env.RUNS || 100) : d), seed0: 1 });
