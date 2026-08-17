/* GOTTGLEICH-PRUNK — Zeitachse der fünf Effekte, getrennt von den Effekten selbst.

   Warum eine eigene Datei (gleiche Begründung wie supernovaTiming.js): die Aufrufer brauchen die ZEITEN,
   nicht den Effekt. Ein statischer Import aus SonnenPulsPixi & Co. zöge Pixi in den Haupt-Bundle — genau
   das vermeiden Battlefield.jsx und CustomizeScreen.jsx mit ihren lazy Imports. Diese Datei ist Pixi-frei.

   WOFÜR: Die Prunks haben sehr unterschiedliche Eigenlaufzeiten (1,15 s bis 2,11 s) und liefen in-game
   ungestreckt, also mit Tempo 1. Im Playtest war das Urteil „bei 4×/MAX sieht man die kaum" — nicht weil der
   Effekt turbo-gekoppelt wäre (er ist es nicht: Battlefield übergab schlicht kein `speed`, und der Prunk läuft
   seit jeher in Echtzeit), sondern weil eine 1,15-s-Animation im dichten Turbo-Trubel schlicht untergeht.

   Da der Prunk ohnehin höchstens alle 30 s spielt (GOTT_FX_COOLDOWN_MS), ist Länge hier billig. Also bekommen
   ALLE fünf dieselbe In-Game-Spieldauer — der Sonnen-Puls hört damit auf, der kurze Ausreißer zu sein.

   ACHTUNG Drift: GOTT_BASE_S muss zu LIFE/TAIL im jeweiligen Effekt passen. Weil die TUNE-Blöcke dort nicht
   exportiert sind (Pixi-Import!), sichert das eine Quelltext-Ratsche ab: test/gott-timing.test.js liest die
   Effektdateien und rechnet die Basiszeit nach. Wer an einem TUNE dreht, wird dort rot. */

import { SUPERNOVA_LIFE, SUPERNOVA_CHARGE, SUPERNOVA_TAIL, SUPERNOVA_IMPACT_S } from "./supernovaTiming.js";

// Eigenlaufzeit je Prunk bei Tempo 1 (LIFE + TAIL; Prisma zusätzlich die Wellen-Staffelung).
export const GOTT_BASE_S = {
  sonnenPuls:    0.9 + 0.25,                    // LIFE 0,9  + TAIL 0,25
  laserFaecher:  1.0 + 0.2,                     // LIFE 1,0  + TAIL 0,2
  prismaKaskade: (5 - 1) * 0.34 + 0.6 + 0.15,   // (WAVES−1)·STAGGER + LIFE 0,6 + TAIL 0,15
  holoCube:      1.7 + 0.1,                     // LIFE 1,7  + TAIL 0,1
  supernova:     SUPERNOVA_LIFE + SUPERNOVA_TAIL, // direkt aus supernovaTiming.js (dort schon Pixi-frei exportiert)
};

/* Ziel-Spieldauer in-game. 2,4 s ≈ die Länge, auf die der Showcase die Prunks ohnehin streckt (dort 2,5 s) —
   lang genug, dass die Choreografie im Turbo-Trubel ankommt, und immer noch kürzer als der Cooldown um
   Größenordnungen. Nach oben ist Luft; die Grenze ist das Spielgefühl, nicht die Technik. [TUNING] */
export const GOTT_INGAME_S = 2.4;

/* Supernova läuft länger als die anderen — und die Länge ist HERGELEITET, nicht geraten.
   In-game ist der Swell-Vorlauf ohnehin auf 0 geklemmt (supernovaTiming.js: „ab einem Impuls-Offset von 0,3 steht
   der Vorlauf dort auf 0"), der Ton startet also mit dem Effekt. Damit entscheidet allein die STRECKUNG, wann der
   Detonationsblitz fällt — und ob er auf dem großen Impuls des Swells sitzt. Aus
       Blitzzeitpunkt = (LIFE · CHARGE) / speed  =!  SUPERNOVA_IMPACT_S
   folgt genau ein Tempo, und daraus genau eine Spieldauer (≈ 3,37 s). Bei den vorherigen 2,4 s lag der Blitz
   0,144 s VOR dem Impuls; jetzt fallen beide zusammen.
   Wer GOTT_INGAME_S ändert, ändert diesen Wert NICHT mit — er hängt an der Tonspur, nicht am Spielgefühl. */
const SUPERNOVA_SYNC_SPEED = (SUPERNOVA_LIFE * SUPERNOVA_CHARGE) / SUPERNOVA_IMPACT_S;
export const GOTT_INGAME_OVERRIDE = {
  supernova: (SUPERNOVA_LIFE + SUPERNOVA_TAIL) / SUPERNOVA_SYNC_SPEED,
};

// Ziel-Spieldauer eines Prunks: Sonderfall (s. o.), sonst der gemeinsame Wert.
export const gottTargetFor = (key) => GOTT_INGAME_OVERRIDE[key] ?? GOTT_INGAME_S;

/* Abspieltempo für einen Prunk: < 1 streckt ihn. Der längste Prunk (Prisma, 2,11 s) wird dadurch kaum
   angefasst, der kürzeste (Sonnen-Puls, 1,15 s) gut verdoppelt. Deckel bei 1 — schneller als seine Eigenzeit
   soll kein Prunk laufen, auch wenn jemand GOTT_INGAME_S unter eine Basiszeit dreht. */
export function gottSpeedFor(key) {
  const base = GOTT_BASE_S[key], target = gottTargetFor(key);
  if (!base || !(target > 0)) return 1;
  return Math.min(1, base / target);
}
