// Stat-Strategie-Policy (Stat-Wert-Diagnose). Erzwingt eine STAT-Fokus-Strategie über einer beliebigen
// Build-Basis-Policy: bei jeder Stat-Runde wird der Ziel-Stat gewählt, alle anderen Phasen (Skills/Perks/
// Shop/Formation) laufen über die Basis (Random ODER eine factionPolicy als Build-Kontext). So lässt sich
// der Marginalwert jedes Stats KONDITIONAL messen — universeller Auto-Pick vs. echte Spezialisierung.
//
//   statPolicy("critChance")                      → immer Crit-Chance, sonst Random-Build
//   statPolicy("crit-pair", factionPolicy("lightning")) → Crit-Chance/Mult balanciert, im Blitz-Kontext
import { randomPolicy } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import * as C from "../../src/game/constants.js";

// Aktiv-Spiel-Wrapper: legt Formations-Solver + Ziel-Shop über eine Build-Basis (sonst delegiert es).
// Nötig, um Formation-/Shop-Stats FAIR zu messen — bei naiver Basis (CONFIRM_FORMATION, kein Zielkauf)
// feuern Formationen selten und Einkommen hat nichts zu kaufen → beide Stats systematisch unterbewertet.
export function activePolicy(base = randomPolicy(), { solveFormations = true, buyShop = true } = {}) {
  return {
    name: `active(${base.name})`,
    act(s, rng, mem) {
      if (s.phase === "formation" && solveFormations) return greedyFormationStep(s);
      return base.act(s, rng, mem);
    },
  };
}

const STEP = { critChance: C.STAT_CRIT_CHANCE_STEP, critMult: C.STAT_CRIT_MULT_STEP, formMult: C.STAT_FORM_MULT_STEP, streakMult: C.STAT_STREAK_MULT_STEP };
const FIELD = { critChance: "statCritChance", critMult: "statCritMult", formMult: "statFormMult", streakMult: "statStreakMult" };
const heldCount = (s, id) => Math.round((s[FIELD[id]] || 0) / STEP[id]);

export function statPolicy(strategy, base = randomPolicy()) {
  return {
    name: `stat:${strategy}${base.name === "random" ? "" : "/" + base.name}`,
    act(s, rng, mem) {
      if (s.phase === "levelup" && s.statOffer) {
        const offer = s.statOffer;
        let id;
        if (strategy === "random") {
          id = offer[Math.floor(rng() * offer.length)];
        } else if (strategy.startsWith("not:")) {
          // Leave-one-out: balanciert (random) über ALLE Stats AUSSER dem genannten → misst, wie sehr er fehlt.
          const ex = strategy.slice(4);
          const pool = offer.filter((o) => o !== ex);
          id = pool[Math.floor(rng() * pool.length)];
        } else if (strategy === "crit-pair") {
          // Balanciert Crit-Chance & Crit-Mult (das Crit-ENGINE als Spezialisierung, nicht ein Stat solo).
          id = heldCount(s, "critChance") <= heldCount(s, "critMult") ? "critChance" : "critMult";
        } else {
          id = offer.includes(strategy) ? strategy : offer[0];
        }
        return { type: "PICK_STAT", statId: id };
      }
      return base.act(s, rng, mem);
    },
  };
}
