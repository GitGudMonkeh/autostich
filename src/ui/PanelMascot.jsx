/* #130: Gemeinsames Charakter-Maskottchen für die Entscheidungs-Panels (Stat/Skill/Shop).
   Zwei Darstellungen aus DEMSELBEN (animierten) GIF — die Peek-/Avatar-Logik liegt hier an einer Stelle,
   damit alle drei Panels konsistent bleiben:

   - variant="peek"  (Desktop, ab sm): das GIF schaut über die Oberkante des Panels hervor; der untere Teil
     verschwindet hinter der opaken Karte. Wird ABSOLUT im nicht scrollenden `relative`-Wrapper platziert
     (nicht in der `overflow-y-auto`-Karte, die es sonst oben abschneiden würde) und liegt per z-index HINTER
     der Karte (die Karte bekommt `relative z-10`).
   - variant="avatar" (Mobil, unter sm): kleiner runder Avatar neben der Überschrift, per `object-fit: cover`
     auf den Kopf zugeschnitten (`objectPosition` je Charakter). Kostet keinen vertikalen Extra-Platz → kein
     zusätzliches Scrollen auf dem Handy.

   Rendert nichts ohne `src`. Das GIF ist `pointer-events-none` + `aria-hidden` → blockiert keine Klicks/Taps.
   Feintuning je Charakter über die Props (Peek-Höhe/Überlappung/Versatz bzw. Avatar-Größe/Ausschnitt). */
export function PanelMascot({
  src,
  variant = "peek",
  accent = "#8a7de0",
  // Peek-Feintuning (Desktop):
  peekMaxH = 150,   // maximale Höhe des Peek-GIFs in px
  overlap = 26,     // wie viele px unten hinter der Karte verschwinden (kleiner = Figur sitzt höher)
  offsetX = 0,      // horizontaler Versatz gegenüber der Mitte
  shadow = true,    // dezenter Drop-Shadow für Tiefe
  // Avatar-Feintuning (Mobil):
  avatarSize = 64,   // #170 (FB-9): max. Größe, die auf den kleinsten Breiten (320px) in ALLEN Panels sauber
                     //   passt (Formation-Textblock ~88px, Shop-Header 80px, zentrierte Panels wachsen nur mittig)
                     //   — mit Sicherheitsabstand; spürbar größer als der alte 46px-Avatar.
  avatarObjectPosition = "center top",
}) {
  if (!src) return null;

  if (variant === "avatar") {
    return (
      <img
        src={src} alt="" aria-hidden
        className="sm:hidden rounded-full object-cover shrink-0"
        style={{
          width: avatarSize, height: avatarSize,
          objectPosition: avatarObjectPosition,
          border: `1px solid ${accent}55`,
          background: "#0000001a",
        }}
      />
    );
  }

  // Peek (Desktop): unten hinter der (opaken, z-10) Karte, oben frei sichtbar. `bottom: calc(100% - overlap)`
  // verankert die Unterkante des GIFs `overlap` px unter der Wrapper-Oberkante — unabhängig von der GIF-Höhe.
  return (
    <img
      src={src} alt="" aria-hidden
      className="hidden sm:block absolute left-1/2 z-0 pointer-events-none select-none"
      style={{
        bottom: `calc(100% - ${overlap}px)`,
        transform: `translateX(calc(-50% + ${offsetX}px))`,
        maxHeight: peekMaxH,
        width: "auto",
        filter: shadow ? `drop-shadow(0 6px 10px ${accent}55)` : undefined,
      }}
    />
  );
}
