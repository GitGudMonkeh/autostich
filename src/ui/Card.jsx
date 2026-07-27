import { suitColor, suitName, ION_MAX_STACKS, ION_SCORE_PER_STACK } from "../game/constants.js";
import { FrostOverlay } from "./FrostOverlay.jsx";

/* Eine Karte. Die große Zahl = effektiver Kampfwert dieses Stichs (= value + stichBonus),
   damit sie immer zum Stich-Ausgang passt.
     value      = dauerhafter Kartenwert (inkl. Kat.-A-Mods)
     baseRank   = Ursprungswert → dauerhafter Boost = value − baseRank (violett „+X")
     stichBonus = temporärer Bonus dieses Stichs (Kat.-B-Perks, rot) */
export function Card({ suit, value, baseRank = null, stichBonus = 0, dim = false, glow = null, ionStacks = 0, frozen = false, frostAnimated = false, frostbitten = false, allyColor = null, frontImage = null }) {
  const color = suitColor(suit);
  // Holo-Front (#178): rahmenlose „Hologramm"-Oberfläche in Kartenfarbe — Punktraster + diagonaler
  // Energiestrahl + farbiger Kern-Schein, statt des früheren harten 2px-Rahmens. Zahl bleibt groß & mittig.
  // Skin-Front (#180): liegt ein `frontImage` (Pixel-Art-Rahmen) an, ersetzt es die Holo-Gradienten als
  // Karten-Hintergrund; Zahl & alle Marker bleiben darüber, der Rahmen liefert die Kante (kein Holo-Saum).
  const HOLO_BASE = "#131318";
  const skinned = !!frontImage;
  const layers = [];
  // F4 Farballianz (#125): Partnerfarbe als diagonaler Zweitfarben-Hauch in der unteren Hälfte (rein kosmetisch).
  if (allyColor) layers.push({ img: `linear-gradient(135deg, transparent 50%, ${allyColor}24 52%, ${allyColor}24 100%)`, size: "cover", repeat: "no-repeat" });
  if (skinned) {
    layers.push({ img: `url(${frontImage})`, size: "100% 100%", repeat: "no-repeat" }); // Pixel-Art-Rahmen füllt die Karte
  } else {
    layers.push({ img: `linear-gradient(122deg, transparent 41%, ${color}00 46%, ${color}55 50%, ${color}00 54%, transparent 59%)`, size: "cover", repeat: "no-repeat" }); // Energiestrahl
    layers.push({ img: `radial-gradient(${color}26 1px, transparent 1.7px)`, size: "7px 7px", repeat: "repeat" }); // Punktraster
    layers.push({ img: `radial-gradient(ellipse 130% 95% at 50% 34%, ${color}22 0%, transparent 66%)`, size: "cover", repeat: "no-repeat" }); // Kern-Schein
  }
  const bgImage  = layers.map((l) => l.img).join(", ");
  const bgSize   = layers.map((l) => l.size).join(", ");
  const bgRepeat = layers.map((l) => l.repeat).join(", ");
  // Weicher Neon-Saum statt Rahmen: hauchdünne 1px-Kante (Karte hebt sich vom dunklen BG ab) + Halo.
  // Beim Skin entfällt der Saum — der Rahmen im Bild ist die Kante.
  const ambientEdge = skinned ? null : `inset 0 0 0 1px ${color}3a, inset 0 0 13px ${color}12, 0 0 10px ${color}2e`;
  const permBoost = baseRank != null ? value - baseRank : 0;
  const effective = value + stichBonus;
  // Ionisierung: BLAUER Rahmen wie der Serien-Schutz (Geladene Serie, #5ec8f0) → sofort erkennbar.
  // Kräftiger bei „voll". Wird mit einem etwaigen Gewinn-/Verlust-Glow LAYERED (bleibt also immer sichtbar).
  const ionFull = ionStacks >= ION_MAX_STACKS;
  const ionRing = ionStacks > 0 ? `0 0 0 2px #5ec8f0, 0 0 ${ionFull ? 12 : 9}px #5ec8f0${ionFull ? "aa" : "77"}` : null;
  // Frost (#93 F3 / #136): der eisige Look kommt jetzt aus dem FrostOverlay-Layer (Tint + Körnung + optional
  // Sweep), nicht mehr aus einem box-shadow → mehr „eisig" und weiterhin konfliktfrei mit Ion-Ring/Glow.
  // Frostbiss (#126): feindlicher −3-Debuff auf einer Gegnerkarte → ROTER Innen-Schimmer (nicht blau wie eigener Frost).
  const frostbiteGlow = frostbitten ? "inset 0 0 14px #e0605a55" : null;
  return (
    <div
      className="as-card as-card-holo relative rounded-xl overflow-hidden flex flex-col items-center justify-center select-none transition-all"
      style={{
        width: 104, height: 144,
        backgroundColor: HOLO_BASE, backgroundImage: bgImage, backgroundSize: bgSize, backgroundRepeat: bgRepeat,
        opacity: dim ? 0.35 : 1,
        // Ion-Rahmen (blau) zuerst → liegt oben; Gewinn-/Verlust-Glow (#135) & Frostbiss darunter; Holo-Saum zuletzt. Frost = eigener Layer.
        boxShadow: [ionRing, glow ? `0 0 0 3.9px ${glow}77, 0 0 34px ${glow}66` : null, frostbiteGlow, ambientEdge].filter(Boolean).join(", "),
      }}
    >
      {/* #136 Eis-Schimmer: Frost-Layer (Tint + Körnung + optional Sweep) über der eingefrorenen Karte — hinter Text/Markern. */}
      {frozen && <FrostOverlay animated={frostAnimated} radius="0.75rem" />}
      <div className="absolute top-1.5 left-2 text-[10px] uppercase tracking-wide" style={{ color }}>
        {suitName(suit)}
      </div>
      {permBoost > 0 && (
        <div className="absolute top-1.5 right-2 text-[11px] font-bold px-1 rounded"
          style={{ color: "#8a7de0", background: "#8a7de022" }}
          title={`Dauerhaft +${permBoost} (Basis ${baseRank})`}>
          +{permBoost}
        </div>
      )}
      <div className="text-5xl font-bold card-num" style={{ color, textShadow: `0 0 12px ${color}77, 0 1px 3px #000c` }}>{effective}</div>
      {/* Frost (#93 F3): Schneeflocke unten rechts markiert eine eingefrorene EIGENE Karte (blau, überall sichtbar). */}
      {frozen && (
        <div className="absolute bottom-1 right-1 text-[13px] leading-none" style={{ color: "#bfe9f7", textShadow: "0 0 5px #7fd4f0" }} title="Eingefroren">❄</div>
      )}
      {/* Frostbiss (#126): frostgebissene GEGNERkarte — ROTES ❄, klar als feindlicher −3-Debuff (nicht wie eigener Frost). */}
      {frostbitten && (
        <div className="absolute bottom-1 right-1 text-[13px] leading-none" style={{ color: "#f0a09a", textShadow: "0 0 5px #e0605a" }} title="Frostbiss −3">❄</div>
      )}
      {/* Ionisierung: Blitze in der unteren linken Ecke, vertikal von unten nach oben gestapelt (Anzahl = Stapel, max ION_MAX_STACKS). */}
      {ionStacks > 0 && (
        <div className="absolute bottom-1 left-1 flex flex-col-reverse items-center leading-none"
          title={`Ionisiert ${ionStacks}/${ION_MAX_STACKS} — +${ionStacks * ION_SCORE_PER_STACK} Score bei Sieg${ionFull ? " · VOLL IONISIERT" : ""}`}>
          {Array.from({ length: ionStacks }, (_, i) => (
            <span key={i} className="text-[11px]" style={{ color: "#5ec8f0", textShadow: "0 0 4px #5ec8f0", marginTop: -1 }}>⚡</span>
          ))}
        </div>
      )}
      <div className="absolute bottom-1.5 flex flex-col items-center leading-tight text-[10px]">
        {permBoost > 0 && <span className="opacity-55">Basis {baseRank}</span>}
        {stichBonus > 0 && <span style={{ color: "#e0605a" }}>⚔ +{stichBonus} Stich</span>}
      </div>
    </div>
  );
}

export function CardBack({ label = "?", image = null }) {
  // Skin-Rücken (#180): liegt ein `image` an, zeigt der Stapel den Pixel-Art-Kartenrücken statt des
  // gestrichelten Platzhalters (gleiche 104×144-Box). Ohne Bild bleibt der neutrale Platzhalter.
  if (image) {
    return (
      <div
        className="rounded-xl overflow-hidden select-none"
        style={{ width: 104, height: 144, backgroundColor: "#0a0a0f", backgroundImage: `url(${image})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
        aria-hidden="true"
      />
    );
  }
  return (
    <div
      className="rounded-xl border-2 border-dashed flex items-center justify-center text-2xl opacity-40"
      style={{ width: 104, height: 144, borderColor: "#3a3a44", background: "#17171c" }}
    >
      {label}
    </div>
  );
}
