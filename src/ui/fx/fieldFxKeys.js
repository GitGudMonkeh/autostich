/* Feld-Effekte, die der Pixi-Emitter (PixiStage) übernimmt. Bewusst PIXI-FREI: von Battlefield.jsx importierbar,
   ohne pixi.js in den main-Bundle zu ziehen (Battlefield lebt im Haupt-Chunk!). Wächst mit jedem portierten
   Effekt und muss zur Factory-Registry in PixiStage.jsx passen. */
export const PIXI_FIELD_KEYS = ["embers", "starfield"];
