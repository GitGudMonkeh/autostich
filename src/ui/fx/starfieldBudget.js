/* BUDGETS für den Meteor (Sternenfeld) — die drei Deckel gegen die Turbo-/Late-Game-Spitze auf dem Handy.

   Warum eine eigene, Pixi-freie Datei — wie schon bei gottTiming.js/supernovaTiming.js: `starfieldPixi.js`
   importiert `pixi.js` im Modulkopf und ist damit in vitest (node, kein WebGL) nicht befragbar. Die Entscheidungen
   hier sind aber reine Arithmetik, und genau die will man prüfen können, ohne ein Gerät anzufassen.

   Das Problem, das sie lösen: die Kosten des Meteors sind MULTIPLIKATIV über drei Achsen, die im späten Lauf bei
   MAX-Turbo alle gleichzeitig ihr Maximum erreichen —
     1) Größe: `TIER_SIZE[4]` = 3 gegen 1,2 bei „Stark" ist 6,25× Fläche (Fill geht quadratisch),
     2) Gleichzeitigkeit: der Flug dauerte fest 1 s, während bei MAX alle ~350 ms ein Stich kommt → 3 Kometen,
     3) Auflösung: die Sample-Zahl je Schweif blieb konstant, egal wie lang die Bahn ist.
   Aus den Konstanten gerechnet (Panel ~360×340, lite = DPR 1,4 + 30 fps): 0,3 Mpx/s im Ruhezustand gegen
   5,0 Mpx/s bei Turbo + Gottgleich, also das 17-Fache. Maßstab ist die Fill-Rate, weil der Prunk-Messstand
   (CLAUDE.md #perf) belegt hat, dass die Kosten fast nur an „Canvas-Pixel pro Sekunde" hängen, kaum am Bildinhalt.

   ALLE drei Deckel greifen nur auf `lite` — Desktop bleibt unangetastet (Entscheidung des Users). Und alle drei
   greifen nur bei Überlappung bzw. hohem Tempo: ein einzelner Meteor im Normalspiel sieht aus wie vorher. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* 1) Flugdauer folgt dem STICH-TAKT — der eigentliche Turbo-Deckel und der einzige, der keine Qualität kostet:
   der Meteor spielt seinen vollen Bogen samt Einschlag, nur schneller. Genau so koppeln `scorchSpeed`/`fxScale`
   im Battlefield schon ans Tempo. Höchstens DOPPELTE Geschwindigkeit (User-Vorgabe) — der Bogen soll auch bei
   MAX noch als Flug lesbar bleiben, nicht als Blitz. Bei 1× (1750 ms) bleibt es bei der vollen Sekunde; ab 2×
   (875 ms) endet der Meteor genau mit seinem eigenen Stich, überlebt ihn also nie — die Überlappung entsteht gar
   nicht erst, statt später weggedeckelt zu werden. Ab 4× greift der Boden bei halber Dauer, und die
   Gleichzeitigkeit bei MAX fällt von 3 auf 2.
   Ohne `sweepDur` (Showcase, Altaufruf) gilt die volle Dauer — NICHT die Hälfte. */
export const MAX_SPEEDUP = 2;
export function cometLifeS(lite, sweepDurMs, fullS) {
  if (!lite || !(sweepDurMs > 0)) return fullS;
  return clamp(sweepDurMs / 1000, fullS / MAX_SPEEDUP, fullS);
}

/* 2) Schweif-Budget statt fester Sample-Zahl je Komet — der Deckel für „viele gleichzeitig".
   Gedeckelt wird die FRAME-Summe, nicht die Anzahl der Kometen: keiner wird unterschlagen, alle spielen ihren
   Bogen aus. Der JÜNGSTE Komet (der gerade gewonnene Stich, und der einzige, den man im Turbo wirklich verfolgt)
   behält die volle Auflösung; die älteren, schon am Ausfaden, teilen sich den Rest.
   TRAIL_MIN ist kein Geschmackswert: bei Tier 4 ist die Bahn ~500 px lang und das dünnste Sample am Schweifende
   ~12 px breit — unter ~16 Samples wird der Abstand größer als das Sample und der Streak zerfällt in Perlen. */
export const TRAIL_BUDGET_LITE = 80; // Samples je Frame über ALLE Kometen (vorher bis 4 × 48 = 192)
export const TRAIL_MIN = 16;
export function trailSamples(lite, count, nFull) {
  const older = lite ? count - 1 : 0;
  if (older <= 0) return { nFull, nOld: nFull };
  return { nFull, nOld: clamp(Math.round((TRAIL_BUDGET_LITE - nFull) / older), TRAIL_MIN, nFull) };
}

/* 3) Funken-Budget. Der bestehende `LITE_SPARK`-Faktor deckelt den EINZELNEN Einschlag, nicht ihre Stapelung:
   bei MAX-Turbo kommt alle ~350 ms einer, die Funken leben aber ~0,9 s → es hängen dauerhaft rund 160 Stück in
   der Luft, jede mit hypot/atan2/sin je Frame. Deshalb ein WEICHER Deckel am Füllstand statt eines harten
   Abschneidens: je voller das Budget, desto sparsamer der nächste Spray — aber nie unter SPARK_MIN_FRAC, sonst
   käme ein Einschlag ganz ohne Funken heraus, was schlimmer aussieht als ein dünnerer.
   Der Regelkreis pendelt sich bei Gottgleich/MAX auf ~24 Funken je Einschlag und ~65 gleichzeitig ein. */
export const SPARK_BUDGET_LITE = 110;
export const SPARK_MIN_FRAC = 0.3;
export function sparkScale(lite, liveSparks) {
  if (!lite) return 1;
  return clamp(1 - liveSparks / SPARK_BUDGET_LITE, SPARK_MIN_FRAC, 1);
}
