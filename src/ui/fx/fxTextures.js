import { Texture } from "pixi.js";

/* #fx-helfer — Pixi-Texturen, die mehrere Effekte gleich bauen.

   Getrennt von `fxMath.js`, weil DIESE Datei `pixi.js` importiert: die reinen Canvas-Effekte
   (BlackholeFx, ScorchFx, CardEdgeGlow, MossGrow, FrostIce, CubeMatrixField) dürfen Pixi nicht
   in ihren Graphen ziehen, sonst hängt der bewusst async gehaltene Pixi-Chunk wieder am Entry.
   Wer nur `lerp` braucht, importiert also aus fxMath.js und bleibt Pixi-frei. */

/* Weiche weiße Radial-Textur (Kern → Halo), gedacht zum Tönen pro Sprite (`sprite.tint`).
   `stops` ist eine Liste [offset, alpha] wie bei `addColorStop`, die Farbe ist immer Weiß —
   getönt wird erst am Sprite, damit EINE Textur für alle Farbvarianten reicht.

   `size` ist die Kantenlänge der quadratischen Textur. Sie war vorher in jeder Datei eine eigene
   Konstante und lief dabei auseinander: die fünf Gottgleich-Prunks backen mit 128 (große,
   bildschirmfüllende Sprites), FireHead und das Sternenfeld mit 64 (viele kleine Partikel, wo
   128 nur Füllrate kostet). Deshalb Parameter statt Konstante — der Unterschied ist gewollt. */
export function makeRadial(stops, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  cx.fillStyle = g;
  cx.fillRect(0, 0, size, size);
  return Texture.from(c);
}
