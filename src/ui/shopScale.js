/* #shop-skalieren — Breitenfaktor der Pack-Vorschau in der Deck-Werkstatt (ab 1400 px).
   -------------------------------------------------------------------------------------------------
   Rein, ohne React (wie `previewScale.js` / `packSort.js`) — der Wächter rechnet die Regel NACH, statt
   Schreibweisen zu vergleichen.

   Die drei Vorschaubilder (Karte hinten · Karte vorne · Spielfeld) sind BREITEN-getrieben: sie tragen
   ein `aspect-ratio` und leiten ihre Höhe aus der Spaltenbreite ab. Genau deshalb ist der Breitenfaktor
   der richtige Griff und nicht die Höhe: schrumpft man die HÖHE (Flex), bleibt der Kasten breit und das
   Bild steht mittig darin — die Bilder stehen dann nicht mehr bündig unter ihren Beschriftungen und die
   drei Kanten laufen auseinander (am Gerät gemeldet: „auf der Laptop-Auflösung sind die Karten- und
   Hintergrundbilder nicht mehr ausgerichtet"). Über die BREITE schrumpft der ganze Block gleichmäßig —
   die Laptop-Fassung ist damit eine echte Verkleinerung der Desktop-Fassung, keine zweite Anordnung.

   Gemessen wird an der ungeschrumpften Fassung (Faktor 1):
     `bildHoehe`  = Höhe der Bilder, die mit der Breite skalieren. Das Kartenpaar steht NEBENeinander
                    und zählt deshalb EINMAL: Kartenhöhe + Spielfeldhöhe.
     `ueberhang`  = `scrollHeight - clientHeight` des Scrollers, also was nicht ins Panel passt.
   Gesucht ist der Faktor f mit `f · bildHoehe = bildHoehe − ueberhang` — Beschriftungen, Abstände und
   der Aktivieren-Knopf kürzen sich dabei heraus, weil sie NICHT mit der Breite skalieren. */

/* Untergrenze: darunter wäre die Vorschau keine Vorschau mehr. Wird sie erreicht, bleibt der Scroller
   des Panels als Ventil (er ist genau dafür stehengeblieben). Realistisch nie nötig — auf dem flachsten
   sinnvollen Desktop-Fenster (1400 x 700) liegt der Faktor bei rund 0,62. */
export const SHOT_F_MIN = 0.45;

export function shotFactor(bildHoehe, ueberhang) {
  // Kein Bild gemessen (Vorschau noch nicht im Layout) oder nichts zu tun → unverändert.
  if (!(bildHoehe > 0) || !(ueberhang > 0)) return 1;
  const f = 1 - ueberhang / bildHoehe;
  return Math.max(SHOT_F_MIN, Math.min(1, f));
}
