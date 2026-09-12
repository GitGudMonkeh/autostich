// Variant hook for a lightning passive SHAPE that is NOT built: a flat crit-chance socket that applies as soon as
// lightning is active, on top of the rate per held skill. It rewrites factions/lightning.js at load time, so nothing
// in src/ changes and the measurement can be run before the owner decides (docs/skill-rework.md §7.29 E).
//
//   SIM_LIGHTNING_CRIT_SOCKET=0.08 SIM_LIGHTNING_CRIT_PER_SKILL=0.03 \
//     node --import ./sim/probes/lightning-socket-hook.mjs sim/probes/blitz-ramp.mjs
//
// The file registers itself as a module hook on --import and exports the hook the loader thread then calls; the env
// guard keeps that second load from registering again. Without the variable it is a no-op (socket 0).
import { register } from "node:module";

if (!process.env.__LIGHTNING_SOCKET_HOOK) { process.env.__LIGHTNING_SOCKET_HOOK = "1"; register(import.meta.url); }

const NEEDLE = "let c = activeLightningCount(skills) * C.LIGHTNING_CRIT_PER_SKILL + (lightning.stormCritBonus || 0);";
const PATCH  = "let c = SOCKET_PP + activeLightningCount(skills) * C.LIGHTNING_CRIT_PER_SKILL + (lightning.stormCritBonus || 0);";

export async function load(url, context, nextLoad) {
  const r = await nextLoad(url, context);
  if (!url.endsWith("/src/game/factions/lightning.js")) return r;
  const src = r.source.toString();
  // Loud on drift: if lightningCritChance is rewritten, a silent no-op would measure the current state and look real.
  if (!src.includes(NEEDLE)) throw new Error("lightning-socket-hook: Anker in lightningCritChance nicht gefunden — die Messung wäre still der Ist-Stand");
  return { ...r, source: `const SOCKET_PP = Number(process.env.SIM_LIGHTNING_CRIT_SOCKET || 0);\n${src.replace(NEEDLE, PATCH)}` };
}
