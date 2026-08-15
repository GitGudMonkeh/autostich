// Eis-Neudesign: gemeinsame Gletscher-Props fürs geteilte CardGrid (Marker + Masse + „G"-Badge), gegatet auf aktives Eis.
// So zeigen ALLE Board-Ansichten (Aufstellung, Architekt, Perk-/Ziel-Auswahl, Chronik, Gameover) Gletscher/Firn-Boden konsistent.
export function glacierGridProps(state = {}) {
  // #301 C3: gesperrte Aufstell-Zellen (rote Querbalken) auf ALLEN Boards zeigen — unabhängig vom Eis-Archetyp.
  const locked = (state.challengeBlockForm && state.challengeBlockForm.length) ? { lockedPos: state.challengeBlockForm } : {};
  const ice = (state.activeArchetypes || []).includes("ice");
  if (!ice || !state.glacierLocked) return locked;
  const glacierPos = new Set(state.glacierLocked.map((v, i) => (v ? i : -1)).filter((i) => i >= 0));
  return { ...locked, glacierPos, glacierMassByPos: state.glacierMass || [], firnStackByPos: state.firnStack || [] }; // #386 Firn-Boden-Reserve
}
