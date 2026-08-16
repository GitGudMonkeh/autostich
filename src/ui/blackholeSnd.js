/* Pegel/Tonhöhe des Schwarzloch-Loop-Betts — EINE Quelle für Spiel und Werkstatt-Vorschau.

   Zwei Eingänge, die unabhängig voneinander laufen und sich deshalb nicht gegenseitig überschreiben
   dürfen (genau das passierte, als beide Callbacks direkt `setLoopGain` riefen):

     fill    0..1  Größe des Lochs (Level ÷ Maximum) — wächst mit jedem Sieg.
     shudder 0..1  das Vorbeben kurz vor dem Kollaps — ramp't unabhängig von der Größe hoch,
                   während das Loch längst am Maximum steht.

   Der Shudder geht QUADRATISCH ein, wie seine sichtbare Amplitude im Effekt (`amp = shudder² · 0.06`,
   BlackholeFx). So setzt das Hörbare zur selben Zeit ein wie das Sichtbare, statt schon beim ersten
   Zucken voll da zu sein.

   Rein und ohne Audio-Abhängigkeit → testbar ohne Web Audio. */
const clamp01 = (v) => (v > 1 ? 1 : v < 0 ? 0 : (Number(v) || 0));

// Basiswerte = der bisherige Zustand ohne Vorbeben (Gain 0,6→0,95 · Rate 0,96→1,06).
export const HOLE_SND = { gain0: 0.6, gainFill: 0.35, gainShudder: 0.15,
                          rate0: 0.96, rateFill: 0.10, rateShudder: 0.06 };

export function holeSound(fill = 0, shudder = 0) {
  const f = clamp01(fill), s = clamp01(shudder);
  return {
    gain: HOLE_SND.gain0 + HOLE_SND.gainFill * f + HOLE_SND.gainShudder * s * s,
    rate: HOLE_SND.rate0 + HOLE_SND.rateFill * f + HOLE_SND.rateShudder * s * s,
  };
}
