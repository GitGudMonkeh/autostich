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

/* Zone → CubeMatrixField-Platzierung. Der Effekt setzt seine Boden-Naht (baseY) bei 0.60·H (NEIGUNG+FELD_HOEHE);
   `yBias` hebt sie um yBias·H an (baseY = 0.60·H − yBias·H). Damit die Naht auf die HINTERE Kante unseres Bands
   (zone.y) rückt, gilt: yBias = 0.60 − zone.y/100 (Desktop ≈ −0.22, Mobile ≈ −0.26 → Feld wandert nach unten ins
   Band). `depthScale` < 1 macht das Feld flacher (weniger tiefe Reihen), damit es als Band liest statt tief in die
   Szene zu laufen. Erste, im Spiel fein justierbare Näherung — hier zentral tunen, nicht im Effekt verstreut. */
export const cubeMatrixZoneProps = (isMobile) => {
  const z = pickEffectZone(isMobile);
  return {
    yBias: +(0.60 - z.y / 100).toFixed(3),
    depthScale: 0.85,
  };
};
