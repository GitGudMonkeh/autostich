/* #308 ZENTRALE Fraktions-Icon-Quelle. EIN Asset-Map + eine Komponente für alle vier Fraktionen (Feuer/Eis/Blitz/
   Pflanze) — ersetzt die bisher gemischte Darstellung (Emoji 🔥/🌿/⚡ + Alt-Asset glacier.webp). Jede View rendert
   die Fraktion über <FactionIcon type="fire|ice|lightning|plant" /> bzw. FACTION_ICON_SRC[type]; neue Views erben
   automatisch. Assets sind quadratisch/transparent (src/ui/assets/factions/*.svg) — der Neon-Glow kommt per CSS
   drop-shadow in der Fraktionsfarbe (wie es Eis bisher machte), im Icon selbst steckt keiner.

   PLATZHALTER: die vier SVG-Glyphen sind aufbereitete Platzhalter. Zum Austausch gegen die finale Pixel-Art einfach
   die vier Dateien unter src/ui/assets/factions/ ersetzen (gleiche Namen) — KEIN Code-Wechsel nötig. */
import fireIcon from "./assets/factions/fire.svg";
import iceIcon from "./assets/factions/ice.svg";
import lightningIcon from "./assets/factions/lightning.svg";
import plantIcon from "./assets/factions/plant.svg";

// Fraktions-id (fire|ice|lightning|plant) → Bild-URL. Auch direkt nutzbar (z. B. als <img src={FACTION_ICON_SRC.fire}>).
export const FACTION_ICON_SRC = { fire: fireIcon, ice: iceIcon, lightning: lightningIcon, plant: plantIcon };
// Glow-Farbe je Fraktion (Neon-drop-shadow) — an die HIT_STYLE-Farben angelehnt.
export const FACTION_GLOW = { fire: "#e0714a", ice: "#5ec8f0", lightning: "#cf9bff", plant: "#5ab87a" };

/* Fraktions-Icon. `type` = Fraktions-id; `size` = px (quadratisch); `glow` = Neon-Schein an/aus (default an).
   Robust: unbekannte Fraktion → null (rendert nichts). `title` setzt Tooltip + alt (Barrierefreiheit). */
export function FactionIcon({ type, size = 14, glow = true, className = "", style, title }) {
  const src = FACTION_ICON_SRC[type];
  if (!src) return null;
  return (
    <img src={src} alt={title || type} title={title} width={size} height={size} draggable={false} aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: "inline-block", objectFit: "contain", verticalAlign: "text-bottom",
        filter: glow ? `drop-shadow(0 0 3px ${FACTION_GLOW[type]}bb)` : undefined, ...style }} />
  );
}
