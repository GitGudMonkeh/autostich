/* #136 / #210 Eis-Schimmer: Frost als KANTEN-/ECK-Treatment über einer eingefrorenen Karte. Rein kosmetisch, liegt als
   eigener absoluter Layer über der Karte → konfliktfrei mit Ion-Rahmen und Gewinn-/Verlust-Glow (das sind box-shadows
   der Karte selbst).

   #210 (AP3): der frühere Vollflächen-Tint kollidierte mit der Feuer-Innenglut (eine Karte kann „gefroren UND
   geschmiedet" sein). Neu: der Frost sitzt an den ECKEN + als dünner Innenrand (Inset-Rim), die MITTE bleibt frei →
   Frost = Kante, Feuer = Glut in der Mitte, beides auf derselben Karte lesbar. Bausteine:
   - Ecken-Höfe: vier kühle Radial-Verläufe in den Ecken (reichen bewusst nicht bis zur Mitte).
   - Inset-Rim: hauchdünner eisiger Innenrand + weicher Innenglanz (kein Vollflächen-Blau).
   - Raureif-Körnung: feine eisfarbene Turbulenz (feTurbulence), screen-geblendet, an den Rand maskiert (Mitte frei).
   - Sweep-Shine: schmaler, schräger Glanzstreif (nur `animated` = aktive Battlefield-Karte).

   Kontext-Regel (#136): `animated` NUR auf der aktiven Battlefield-Karte. Das Aufstellungs-Board rendert ohne Sweep
   (bis zu 40 Karten → sonst Flackern). `prefers-reduced-motion` schaltet den Sweep global ab (index.css). */
export function FrostOverlay({ animated = false, radius = "0.75rem" }) {
  // Rand-Maske: hält Körnung/Sweep an den Kanten, lässt die Mitte frei (Feuer-Glut-Koexistenz).
  const edgeMask = "radial-gradient(ellipse 78% 70% at 50% 50%, transparent 52%, #000 100%)";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: radius }} aria-hidden="true">
      {/* Eisige Ecken-Höfe + dünner Inset-Rim — Mitte bleibt frei. */}
      <div className="absolute inset-0" style={{
        background: [
          "radial-gradient(58% 44% at 0% 0%, rgba(206,240,252,0.34), transparent 72%)",
          "radial-gradient(58% 44% at 100% 0%, rgba(206,240,252,0.34), transparent 72%)",
          "radial-gradient(58% 44% at 0% 100%, rgba(178,222,244,0.28), transparent 72%)",
          "radial-gradient(58% 44% at 100% 100%, rgba(178,222,244,0.28), transparent 72%)",
        ].join(", "),
        boxShadow: "inset 0 0 0 1px rgba(206,240,252,0.34), inset 0 0 12px rgba(159,220,240,0.30), inset 0 1px 6px rgba(255,255,255,0.14)",
      }} />
      {/* Raureif-Körnung — an den Rand maskiert (Mitte frei). */}
      <div className="absolute inset-0 as-frost-grain" style={{ mixBlendMode: "screen", opacity: 0.13, WebkitMaskImage: edgeMask, maskImage: edgeMask }} />
      {/* Sweep-Shine — nur aktive Karte (schmaler Glanz, screen-geblendet). */}
      {animated && <div className="absolute inset-0 as-frost-sweep" style={{ mixBlendMode: "screen" }} />}
    </div>
  );
}
