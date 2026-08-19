/* #308 ZENTRALE Fraktions-Icon-Quelle. EIN Asset-Map + eine Komponente für alle vier Fraktionen (Feuer/Eis/Blitz/
   Pflanze) — ersetzt die bisher gemischte Darstellung (Emoji 🔥/🌿/⚡ + Alt-Asset glacier.webp). Jede View rendert
   die Fraktion über <FactionIcon type="fire|ice|lightning|plant" /> bzw. FACTION_ICON_SRC[type]; neue Views erben
   automatisch. Assets sind quadratisch und transparent (src/ui/assets/factions/*.webp).

   #icons (17.08.2026) — die vier SVG-Platzhalter sind gegen die finale Zeichnung getauscht. Zwei Dinge, die man
   dabei wissen muss:

   1. DER SCHEIN STECKT JETZT IM BILD, nicht mehr im CSS. Die Platzhalter waren flache Glyphen ohne Leuchten,
      deshalb legte die Komponente per `drop-shadow` einen Neon-Schein in der Fraktionsfarbe darunter. Die neue
      Zeichnung bringt ihren eigenen mit — beides zusammen ist ein Schein auf einem Schein, und der frisst genau
      die Konturen, die das Icon bei 11–15 px noch unterscheidbar machen. Nachgestellt und Größe für Größe
      verglichen (8/11/13/15/20/28 px, 1× und 3×): ohne den CSS-Schein ist jede Größe schärfer, bei 28 px liegen
      Welten dazwischen. `glow` ist deshalb standardmäßig AUS und bleibt nur als Schalter für flache Icons stehen,
      falls je wieder welche kommen. FACTION_GLOW ist davon unberührt — die Farben werden anderswo als
      Fraktions-Akzent gelesen (Upgrade-Baum, Deck-Detail).

   2. AUSTAUSCH bleibt ein reiner Dateitausch: vier Dateien unter src/ui/assets/factions/ ersetzen (gleiche Namen,
      gleiche Endung). Nur ein FORMATwechsel kostet vier Zeilen — die Importe darunter tragen die Endung.
      Quelle war ein Blatt mit vier Motiven; das Zerlegen lief über die zusammenhängenden Flächen im Alphakanal
      und nicht über ein 2×2-Raster (die Motive sind verschieden hoch, ein Raster hätte der Flamme die Spitze
      abgeschnitten). 128 px Kantenlänge: die größte Verwendung ist 28 px, mal 3 für dichte Displays = 84 px. */
import fireIcon from "./assets/factions/fire.webp";
import iceIcon from "./assets/factions/ice.webp";
import lightningIcon from "./assets/factions/lightning.webp";
import plantIcon from "./assets/factions/plant.webp";
import glacierIcon from "./assets/glacier.webp";

// Fraktions-id (fire|ice|lightning|plant) → Bild-URL. Auch direkt nutzbar (z. B. als <img src={FACTION_ICON_SRC.fire}>).
export const FACTION_ICON_SRC = { fire: fireIcon, ice: iceIcon, lightning: lightningIcon, plant: plantIcon };
// Glossar-Einträge, die ein EIGENES Bild statt des Fraktions-Icons tragen (`img`-Feld im Register).
export const GLOSSARY_IMG_SRC = { glacier: glacierIcon };
// Glow-Farbe je Fraktion (Neon-drop-shadow) — an die HIT_STYLE-Farben angelehnt.
export const FACTION_GLOW = { fire: "#e0714a", ice: "#5ec8f0", lightning: "#cf9bff", plant: "#5ab87a" };

/* Fraktions-Icon. `type` = Fraktions-id; `size` = px (quadratisch); `glow` = zusätzlicher CSS-Neon-Schein
   (default AUS — die Zeichnung bringt ihren eigenen mit, Begründung im Dateikopf).
   Robust: unbekannte Fraktion → null (rendert nichts). `title` setzt Tooltip + alt (Barrierefreiheit). */
export function FactionIcon({ type, size = 14, glow = false, className = "", style, title }) {
  const src = FACTION_ICON_SRC[type];
  if (!src) return null;
  return (
    <img src={src} alt={title || type} title={title} width={size} height={size} draggable={false} aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: "inline-block", objectFit: "contain", verticalAlign: "text-bottom",
        filter: glow ? `drop-shadow(0 0 3px ${FACTION_GLOW[type]}bb)` : undefined, ...style }} />
  );
}

/* Icon eines Meta-Objekts (ARCHETYPE_META o. ä.): ist `meta.key` eine der vier Fraktionen → zentrales <FactionIcon>;
   sonst (z. B. Legendär ★, generischer Skill •) fällt es auf das eigene `meta.icon`-Glyph zurück (das sind KEINE
   Fraktions-Icons und bleiben wie gehabt). So ersetzt der Sweep nur echte Fraktions-Identitäts-Icons. */
export function ArchIcon({ meta, size = 14, glow = false, className = "", style, title }) {
  if (!meta) return null;
  if (FACTION_ICON_SRC[meta.key]) return <FactionIcon type={meta.key} size={size} glow={glow} className={className} style={style} title={title || meta.label} />;
  return <span className={className} style={style} title={title || meta.label}>{meta.icon}</span>;
}

/* Icon eines GLOSSAR-Eintrags — EINE Auflösung für alle Anzeigestellen (Overlay, Skill-Auswahl, Build-Übersicht),
   die vorher dieselbe Ternär-Kette dreimal kopiert trugen. Reihenfolge, absteigend spezifisch:
     1. `img` — der Eintrag bringt ein eigenes Bild mit (bisher nur der Gletscher; das detaillierte Bild aus
        dem Panel-Hero, das der Fraktions-Sweep #308 sonst gegen das generische Eis-Icon getauscht hatte).
     2. Fraktions-`group` — die 25 Archetyp-Einträge tragen das Icon ihrer Fraktion, wie die Skills auch.
     3. `icon` — der Text-Glyph. Für alle übrigen Kategorien der reguläre Fall.
   `textClass` trägt die Schriftgröße des Glyphen (die Aufrufer sind unterschiedlich dicht), `size` die des Bildes. */
export function GlossaryIcon({ e, size = 14, textClass = "", className = "", style }) {
  if (!e) return null;
  const img = GLOSSARY_IMG_SRC[e.img];
  if (img) return (
    <img src={img} alt={e.label || ""} width={size} height={size} draggable={false} aria-hidden={true} className={className}
      style={{ display: "inline-block", objectFit: "contain", verticalAlign: "text-bottom", ...style }} />
  );
  if (FACTION_ICON_SRC[e.group]) return <FactionIcon type={e.group} size={size} className={className} style={style} />;
  return <span className={`${className} ${textClass}`.trim()} style={style}>{e.icon}</span>;
}
