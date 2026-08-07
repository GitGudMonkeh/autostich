// Eis-Neudesign: gemeinsame Gletscher-Props fürs geteilte CardGrid (Marker + Masse + „G"-Badge), gegatet auf aktives Eis.
// So zeigen ALLE Board-Ansichten (Aufstellung, Architekt, Perk-/Ziel-Auswahl, Chronik, Gameover) Gletscher/Firn-Boden konsistent.
export function glacierGridProps(state = {}) {
  const ice = (state.activeArchetypes || []).includes("ice");
  if (!ice || !state.glacierLocked) return {};
  const glacierPos = new Set(state.glacierLocked.map((v, i) => (v ? i : -1)).filter((i) => i >= 0));
  return { glacierPos, glacierMassByPos: state.glacierMass || [] };
}
