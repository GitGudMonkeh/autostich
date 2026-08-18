/* #vorschau-brett — Maßstab der Effekt-Vorschau in der Deck-Werkstatt.
   ---------------------------------------------------------------------------------------------
   Reine Zahlen + reine Funktionen, kein React: damit der Wächter (test/fx-panel.test.js) das
   Verhältnis nachrechnen kann, statt Quelltext zu vergleichen. Dieselbe Trennung wie bei
   `starfieldBudget.js`, `mobileTier.js` und `gottTiming.js`.

   DIE MESSUNG, aus der alles folgt (Battlefield-Panel `[data-tut="bf-board"]`, Produktionspfad):
     1920 × 1080 → 668 × 347 · 1536 × 791 → 668 × 347 · Handy 390 → 358 × 347.
   Auf dem Desktop ist das Brett also FEST — es sitzt in der 1fr-Spalte eines `[1fr_340px]`-Rasters
   mit gedeckelter Seitenbreite. Die Karte ist dort immer 104 × 144 (Card.jsx setzt beides fest),
   nimmt also 41,5 % der Bretthöhe ein.

   Daraus die zwei Regeln, die die Vorschau vorher BEIDE verfehlt hat:
   • Das Brett-Verhältnis ist 1,93 : 1 — nicht die 2,5 : 1 des Spielfeld-JPGs (1600 × 640). Das Brett
     schneidet das Bild bereits zu; eine Vorschau im BILDformat zeigt einen Ausschnitt, den es im Spiel
     nirgends gibt. Die alte Vorschau stand auf 1,62 : 1 (1246 × 767) — also weder das eine noch das andere.
   • Der Maßstab der Szene ist Vorschaubreite ÷ Brettbreite. Damit landet die Karte bei JEDER Breite
     wieder auf ihren 41,5 % (s. `kartenAnteil` unten — das ist eine Identität, kein Zufallstreffer).
     Ohne den Maßstab blieb sie bei 144 px stehen, während der Rahmen von 186 px (Handy) auf 767 px
     wuchs: gemessene Kartenfläche 24,9 % → 1,6 %. Der gekaufte Effekt war auf 1920 px anderthalb
     Prozent des Bildes, der Rest ein stehendes Spielfeld-JPG.

   Der Maßstab VERGRÖSSERT nur. Am Handy ist der Rahmen 324 px breit; die reine Regel ergäbe dort 0,49
   und damit eine 70-px-Karte. Die Handy-Fassung ist nicht Teil des Desktop-Passes und bleibt so
   pixelgleich (nachgemessen: 3 von 4 Reitern bitidentisch, der vierte weicht nur um das laufende
   Pixi-Bild ab). Wer den Deckel entfernt, ändert einen Bildschirm, den niemand angefasst hat. */

/** Brettmaße im Spiel (Desktop, gemessen — auf 1920 wie auf 1536 identisch). */
export const BOARD_W = 668;
export const BOARD_H = 347;

/** Kartenmaß — dieselben Zahlen, die `Card.jsx` fest setzt (in-game wie in der Vorschau). */
export const CARD_W = 104;
export const CARD_H = 144;

/* Als CSS-Wert an die Vorschau gereicht (`--bf-ratio`), damit index.css die Zahlen NICHT abtippt.
   Ein zweites Vorkommen wäre genau die Doppelpflege, an der schon die 30-Hz-Zeichenrate an fünf
   Stellen auseinandergelaufen ist (#perf-spend). */
export const BOARD_RATIO_CSS = `${BOARD_W} / ${BOARD_H}`;

/** Maßstab der Vorschau-Szene für eine gemessene Rahmenbreite. Vergrößert nur, nie kleiner als 1. */
export function sceneScale(previewW) {
  const w = Number(previewW);
  if (!Number.isFinite(w) || w <= 0) return 1;   // vor der ersten Messung / kaputter Wert → 1:1
  return Math.max(1, w / BOARD_W);
}

/* Anteil der Kartenhöhe an der Rahmenhöhe, wenn der Rahmen auf Brettverhältnis steht.
   Für jede Breite ab BOARD_W ist das exakt CARD_H / BOARD_H — genau das prüft der Wächter. */
export function kartenAnteil(previewW) {
  const w = Number(previewW);
  if (!Number.isFinite(w) || w <= 0) return 0;
  return (CARD_H * sceneScale(w)) / (w / (BOARD_W / BOARD_H));
}
