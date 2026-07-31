import { suitColor, ION_MAX_STACKS, ION_SCORE_PER_STACK, ICE_LAYER_MAX } from "../game/constants.js";
import { FrostOverlay } from "./FrostOverlay.jsx";

// Eis (#210): Schicht-Eck-Kristalle — dezenter, gestapelter Hinweis „diese Karte ist geschichtet" (bewusst KEINE
// Zahl auf der Karte). Mehr Schichten → mehr Kristalle; ab dem wirksamen Deckel (ICE_LAYER_MAX) leuchten obenauf
// Überlauf-Kristalle heller = Überlauf-Tiefe (die Nahrung der Eis-Legendären). Sitzt in der durch den Ion-Umzug
// (#208) freigeräumten unteren linken Ecke (vocab.CORNER.frostLayers). Farben inline wie im übrigen Card-Stil.
const CRYSTAL = "#8fcfe6", CRYSTAL_OVER = "#e6f7ff"; // gedämpfter Schicht-Kristall · heller Überlauf-Kristall
function FrostLayerCrystals({ layers }) {
  const n = layers || 0;
  if (n <= 0) return null;
  const eff = Math.min(n, ICE_LAYER_MAX);            // wirksame Schichten (gedeckelt)
  const over = Math.max(0, n - ICE_LAYER_MAX);       // Überlauf-Tiefe
  const basePips = Math.min(5, Math.max(1, Math.ceil(eff / 2.5))); // 1..5 gedämpfte Kristalle (grobe Tiefe)
  const overPips = over > 0 ? Math.min(2, Math.ceil(over / 6)) : 0; // 0..2 helle Überlauf-Kristalle obenauf
  const pips = [];
  for (let i = 0; i < basePips; i++) pips.push(false);
  for (let i = 0; i < overPips; i++) pips.push(true);
  return (
    // flex-col-reverse: der erste (gedämpfte) Kristall sitzt unten, die hellen Überlauf-Kristalle stapeln sich obenauf.
    <div className="absolute bottom-1 left-1 flex flex-col-reverse items-center leading-none" style={{ gap: 1 }}
      title={`Geschichtet — ${n} Schicht${n === 1 ? "" : "en"}${over > 0 ? ` · Überlauf +${over}` : ""}`}>
      {pips.map((isOver, i) => (
        <span key={i} style={{
          fontSize: 9,
          color: isOver ? CRYSTAL_OVER : CRYSTAL,
          opacity: isOver ? 0.9 : 0.55,
          textShadow: isOver ? "0 0 5px #bfe9f7" : "0 0 3px #8fcfe688",
        }}>◆</span>
      ))}
    </div>
  );
}

/* Eine Karte. Die große Zahl = effektiver Kampfwert dieses Stichs (= value + stichBonus),
   damit sie immer zum Stich-Ausgang passt.
     value      = dauerhafter Kartenwert (inkl. Kat.-A-Mods)
     baseRank   = Ursprungswert → dauerhafter Boost = value − baseRank (violett „+X")
     stichBonus = temporärer Bonus dieses Stichs (Kat.-B-Perks, rot) */
export function Card({ suit, value, baseRank = null, stichBonus = 0, dim = false, glow = null, ionStacks = 0, frozen = false, frostAnimated = false, frostbitten = false, green = false, forged = 0, branded = 0, frostLayers = 0, allyColor = null, frontImage = null }) {
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
  // Pflanze (v0): grüne (reife) Karte → grüner Innensaum + Flächen-Schein; markiert Karten des Farbblocks (kollisionsfrei mit Ion-Ring, da inset).
  const greenGlow = green ? "inset 0 0 0 1px #5ab87a88, inset 0 0 16px #5ab87a55" : null;
  // Feuer (#206): geschmiedete EIGENE Karte glüht von INNEN (Inset-Bloom) — KEIN Ring, KEIN äußerer Halo (der 2px-Ring ist der Ionisierung vorbehalten).
  const forgedGlow = forged > 0 ? "inset 0 0 18px #f0a83a5e, inset 0 0 7px #f0b74a4a" : null;
  // Feuer (#206): gebrandmarkte GEGNERkarte „verkohlt von unten" — warmer, GERICHTETER Char-Saum (Inset von unten), klar vom kalten Frostbiss abgesetzt.
  const brandGlow = branded > 0 ? "inset 0 -17px 16px -8px #e0714a88, inset 0 -3px 6px -2px #f0a83a66" : null;
  return (
    <div
      className="as-card as-card-holo relative rounded-xl overflow-hidden flex flex-col items-center justify-center select-none transition-all"
      style={{
        width: 104, height: 144,
        backgroundColor: HOLO_BASE, backgroundImage: bgImage, backgroundSize: bgSize, backgroundRepeat: bgRepeat,
        opacity: dim ? 0.35 : 1,
        // Ion-Rahmen (blau) zuerst → liegt oben; Gewinn-/Verlust-Glow (#135) & Frostbiss darunter; Holo-Saum zuletzt. Frost = eigener Layer.
        // Glow REIN blur-basiert (kein 0-Blur-Ring mehr) → weicher, kantenloser Rand statt harter Kontur am Kartenrand.
        boxShadow: [ionRing, glow ? `0 0 11px 1px ${glow}88, 0 0 34px ${glow}55` : null, frostbiteGlow, greenGlow, forgedGlow, brandGlow, ambientEdge].filter(Boolean).join(", "),
      }}
    >
      {/* #136/#210 Eis-Schimmer: Frost-Kanten-Layer (Ecken + Inset-Rim + optional Sweep) über der eingefrorenen Karte — hinter Text/Markern, Mitte frei. */}
      {frozen && <FrostOverlay animated={frostAnimated} radius="0.75rem" />}
      {/* Eis (#210): Schicht-Eck-Kristalle unten-links (nur eingefrorene, geschichtete Karten) — grobes „geschichtet", keine Zahl. */}
      {frozen && frostLayers > 0 && <FrostLayerCrystals layers={frostLayers} />}
      {permBoost > 0 && (
        <div className="absolute top-1.5 right-2 text-[11px] font-bold px-1 rounded"
          style={{ color: "#8a7de0", background: "#8a7de022" }}
          title={`Dauerhaft +${permBoost} (Basis ${baseRank})`}>
          +{permBoost}
        </div>
      )}
      {/* Feuer (#206): Schmiede-Amboss + Betrag (Gold) — oben rechts, unter dem Dauerwert-Badge gestapelt (CORNER.forge). */}
      {forged > 0 && (
        <div className="absolute right-2 text-[10px] font-bold px-1 rounded leading-none"
          style={{ top: permBoost > 0 ? 24 : 6, color: "#f0b74a", background: "#f0b74a22", textShadow: "0 0 5px #f0a83a88" }}
          title={`Geschmiedet +${forged} Wert (dauerhaft)`}>
          ⚒+{forged}
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
      {/* Pflanze (v0): grünes Blatt oben links markiert eine reife/grüne Karte (Teil des Farbblocks, dauerhaft). */}
      {green && (
        <div className="absolute top-1 left-1 text-[13px] leading-none" style={{ color: "#86e0a0", textShadow: "0 0 5px #5ab87a" }} title="Grün (reif) — Teil des Farbblocks">🌿</div>
      )}
      {/* Feuer (#206): Brandmarke auf der GEGNERkarte — warmes −N oben links (versetzt zu 🌿) + Flamme unten rechts (links neben ❄). Warm/orange → „Feuer, nicht Eis". */}
      {branded > 0 && (
        <>
          <div className="absolute top-1 text-[10px] font-bold px-1 rounded leading-none"
            style={{ left: green ? 22 : 4, color: "#f7c48a", background: "#e0714a33", textShadow: "0 0 5px #e0714a" }}
            title={`Gebrandmarkt −${branded} Wert`}>−{branded}</div>
          <div className="absolute bottom-1 text-[13px] leading-none"
            style={{ right: frostbitten ? 20 : 4, color: "#f0a83a", textShadow: "0 0 6px #e0714a" }}
            title={`Gebrandmarkt −${branded} Wert`}>🔥</div>
        </>
      )}
      {/* Ionisierung (#208): Pip-Track MITTIG auf der oberen Rahmenkante (gefüllt = Stapel, max ION_MAX_STACKS). Der
          2px-Ionisierungs-Ring (oben) glüht bei VOLL zusätzlich auf. Damit ist die frühere untere linke Ecke geräumt
          (für Eis/Pflanze reserviert, vocab.CORNER). Mittig platziert → kollisionsfrei mit 🌿/−N (links) und +X/⚒ (rechts). */}
      {ionStacks > 0 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 leading-none"
          title={`Ionisiert ${ionStacks}/${ION_MAX_STACKS} — +${ionStacks * ION_SCORE_PER_STACK} Score bei Sieg${ionFull ? " · VOLL IONISIERT" : ""}`}>
          {Array.from({ length: ION_MAX_STACKS }, (_, i) => {
            const on = i < ionStacks;
            return (
              <span key={i} className="rounded-full transition-all" style={{
                width: 6, height: 3,
                background: on ? "#5ec8f0" : "#5ec8f024",
                boxShadow: on ? (ionFull ? "0 0 5px #5ec8f0" : "0 0 3px #5ec8f0aa") : undefined,
              }} />
            );
          })}
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
