/* EFFEKT-ZONEN — der „Boden", auf dem die 3D-Feld-Effekte (Cube-Matrix, Sternenregen/Komet, …) sitzen.
   Panel-/bild-relativ in Prozent, getrennt für Desktop und Mobile. BEWUSST eine EINZIGE Zone für ALLE
   Effekte (Wunsch: simpel + fix): so lassen wir die Fläche in jedem Background frei und die Effekte
   sitzen immer gleich. Neue Backgrounds werden genau auf dieses Band ausgelegt.

     x/y/w/h = Bounding-Box des Bodens (bild-relativ, %) — volle Breite, unteres Band.
     persp   = seitlicher Einzug der HINTEREN Kante je Seite (%) → Verjüngung nach hinten (3D-Boden).

   Ermittelt im Zonen-Tool (bild-relativ auf 1600×640 Desktop / 1080×810 Mobile). Single source of truth:
   Effekte konsumieren diese Werte, statt sie einzeln hart zu kodieren. */
export const EFFECT_ZONES = {
  desktop: { x: 0, y: 82, w: 100, h: 18, persp: 26 },
  mobile:  { x: 0, y: 86, w: 100, h: 14, persp: 22 },
};

// = Breakpoint der <picture>-Auswahl in Battlefield.jsx (mobile ≤ 640px) → gleiche Grenze für die Zonen-Wahl.
export const MOBILE_MQ = "(max-width: 640px)";

export const pickEffectZone = (isMobile) => (isMobile ? EFFECT_ZONES.mobile : EFFECT_ZONES.desktop);

/* CubeMatrixField-Platzierung (zentral hier, nicht im Effekt verstreut). NUR die Platzierung — Turm-Höhe/Tiefe bleiben
   auf den Effekt-Defaults (die waren gut). `floorBottom` (0..1) dockt die VORDERSTE Bodenreihe fix an die Panel-Höhe
   an: 1.0 = Front bündig mit dem unteren Rahmen, höhenunabhängig (der Effekt rechnet den konstanten px-Front-Offset
   selbst raus). Feinschliff der Bündigkeit hier (z. B. 0.98 = minimal höher). */
export const cubeMatrixZoneProps = () => ({ floorBottom: 1.0 });
