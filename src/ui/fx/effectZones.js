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

/* CubeMatrixField-Platzierung (empirisch getunt, im Spiel justierbar — hier zentral, nicht im Effekt verstreut).
   Der Effekt setzt seine Boden-Naht (baseY) bei 0.60·H; `yBias` verschiebt sie um yBias·H (POSITIV = höher auf dem
   Schirm, NEGATIV = tiefer, da baseY = 0.60·H − yBias·H). Wichtig: der Effekt zeichnet seinen Boden zusätzlich UNTER
   baseY (Projektion) → ein direktes Koppeln an zone.y (82/86 %) saß VIEL zu tief (Feedback). Darum leichte Werte.
   `depthScale` < 1 = flacheres Feld. `riseBase` > 1 = etwas Ruhe-Höhe der Türme (Präsenz auch ohne Musik). */
export const cubeMatrixZoneProps = (isMobile) => (isMobile
  ? { yBias: -0.08, depthScale: 0.9, riseBase: 1.15 }
  : { yBias: -0.05, depthScale: 0.9, riseBase: 1.15 });
