/* DER FELD-BODEN — fix im Code verankert. Die EINE Fläche, auf der ALLE Boden-Effekte sitzen
   (Cube-Matrix jetzt, Sternenregen/Komet & künftige später). Zweck: Backgrounds lassen genau
   diese Fläche frei, und jeder Effekt sitzt automatisch gleich, weil er DIESE Werte konsumiert
   statt eigene zu erfinden. Single source of truth — hier ändern = überall geändert.

   Zwei Sichten auf denselben Boden:
     • EFFECT_ZONES  = die sichtbare Boden-Fläche (Band) panel-/bild-relativ in % — für Backgrounds
                       (Fläche frei halten) und für Effekte, die einen Container/Trapez positionieren.
     • FLOOR_FRONT_AT_BOTTOM + floorEffectPlacement() = die Platzierung für Effekte, die ihren Boden
                       per 3D-Projektion zeichnen (wie CubeMatrixField): vordere Kante bündig am Rahmen.

     x/y/w/h = Bounding-Box des Bodens (%) — volle Breite, unteres Band.
     persp   = seitlicher Einzug der HINTEREN Kante je Seite (%) → Verjüngung nach hinten (3D-Boden). */
export const EFFECT_ZONES = {
  desktop: { x: 0, y: 82, w: 100, h: 18, persp: 26 },
  mobile:  { x: 0, y: 86, w: 100, h: 14, persp: 22 },
};

// = Breakpoint der <picture>-Auswahl in Battlefield.jsx (mobile ≤ 640px) → gleiche Grenze für die Zonen-Wahl.
export const MOBILE_MQ = "(max-width: 640px)";

// Container-Sicht: Boden-Band als Rechteck (%) für ein bestimmtes Viewport (Effekte, die einen Layer positionieren).
export const pickEffectZone = (isMobile) => (isMobile ? EFFECT_ZONES.mobile : EFFECT_ZONES.desktop);

/* Projektions-Sicht: Wo die VORDERSTE (nächste) Bodenreihe sitzt, als Bruchteil der Panel-Höhe.
   1.0 = bündig am unteren Rahmen, <1.0 = etwas höher (0.94 = ~6 % über dem Rahmen). Höhenunabhängig — der
   Effekt rechnet seinen konstanten px-Front-Offset selbst raus. DIES ist der eine, fest hinterlegte
   Platzierungswert: einmal hier einstellen → alle Boden-Effekte übernehmen ihn (kein Handanlegen pro Effekt). */
export const FLOOR_FRONT_AT_BOTTOM = 0.97;

/* Platzierung für JEDEN Boden-Effekt, der (wie CubeMatrixField) seinen Boden per 3D-Projektion zeichnet.
   Neuer Boden-Effekt → dieses Objekt durchreichen (nicht selbst hart kodieren), dann sitzt er automatisch
   auf demselben Boden wie alle anderen. */
export const floorEffectPlacement = () => ({ floorBottom: FLOOR_FRONT_AT_BOTTOM });
