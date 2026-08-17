/* Feld-Effekte, die der Pixi-Emitter (PixiStage) übernimmt. Bewusst PIXI-FREI: von Battlefield.jsx importierbar,
   ohne pixi.js in den main-Bundle zu ziehen (Battlefield lebt im Haupt-Chunk!). Wächst mit jedem portierten
   Effekt und muss zur Factory-Registry in PixiStage.jsx passen. */
// #: Aurora ist kein Emitter-Effekt — sie läuft als Shader-Ebene im Feld-Kompositor (FieldCompositor.jsx).
export const PIXI_FIELD_KEYS = ["starfield"]; // #glutfunken-raus: embers entfernt
