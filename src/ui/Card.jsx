import { memo } from "react";
import { suitColor, ION_MAX_STACKS, ION_SCORE_PER_STACK, PLANT_GREEN_THRESHOLD, PLANT_VALUE_CAP } from "../game/constants.js";
import { plantNumberColor, PLANT, PLANT_RIPE } from "./indicators/vocab.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { t, fmtNum } from "../i18n/index.js"; // #health-check F1: Badges/Tooltips über den Katalog

/* Eine Karte. Die große Zahl = effektiver Kampfwert dieses Stichs (= value + stichBonus),
   damit sie immer zum Stich-Ausgang passt.
     value      = dauerhafter Kartenwert (inkl. Kat.-A-Mods)
     baseRank   = Ursprungswert → dauerhafter Boost = value − baseRank (violett „+X")
     stichBonus = temporärer Bonus dieses Stichs (Kat.-B-Perks, weiß — rot war auf der Karte schwer lesbar, Review-Runde 2026-08-28) */
// #259: reiner Präsentations-Leaf mit teuren Bild-Layern → React.memo überspringt Re-Render bei unveränderten
// (primitiven) Props. Beim Auto-Play/Timer-Takt rendern nur die tatsächlich wechselnden Karten neu, nicht alle.
function CardView({ suit, value, baseRank = null, stichBonus = 0, dim = false, glow = null, ionStacks = 0, green = false, forged = 0, branded = 0, growth = 0, colonized = 0, allyColors = null, frontImage = null }) {
  const color = suitColor(suit);
  // Holo-Front (#178): rahmenlose „Hologramm"-Oberfläche in Kartenfarbe — Punktraster + diagonaler
  // Energiestrahl + farbiger Kern-Schein, statt des früheren harten 2px-Rahmens. Zahl bleibt groß & mittig.
  // Skin-Front (#180): liegt ein `frontImage` (Pixel-Art-Rahmen) an, ersetzt es die Holo-Gradienten als
  // Karten-Hintergrund; Zahl & alle Marker bleiben darüber, der Rahmen liefert die Kante (kein Holo-Saum).
  const HOLO_BASE = "#131318";
  const skinned = !!frontImage;
  const layers = [];
  /* F4 Farballianz (#125): Partnerfarben als diagonaler Hauch in der unteren Hälfte (rein
     kosmetisch). Seit der Review-Runde 2026-08-28: ALLE Partner der Allianz-Gruppe als Bänder
     (2 Partner = zwei, 3 = drei), Deckkraft von 14 auf 20 Prozent angehoben. */
  const allies = Array.isArray(allyColors) ? allyColors.filter(Boolean) : (allyColors ? [allyColors] : []);
  if (allies.length) {
    const span = 50 / allies.length;
    const stops = allies.map((c, i) => {
      const from = 50 + i * span, to = 50 + (i + 1) * span;
      return `${c}33 ${(from + (i ? 1 : 2)).toFixed(0)}%, ${c}33 ${to.toFixed(0)}%`;
    }).join(", ");
    layers.push({ img: `linear-gradient(135deg, transparent 50%, ${stops})`, size: "cover", repeat: "no-repeat" });
  }
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
  // Ionisierung: BLAUER Rahmen (#5ec8f0) → sofort erkennbar.
  // Kräftiger bei „voll". Wird mit einem etwaigen Gewinn-/Verlust-Glow LAYERED (bleibt also immer sichtbar).
  const ionFull = ionStacks >= ION_MAX_STACKS;
  const ionRing = ionStacks > 0 ? `0 0 0 2px #5ec8f0, 0 0 ${ionFull ? 12 : 9}px #5ec8f0${ionFull ? "aa" : "77"}` : null;
  // Pflanze (v0): grüne (reife) Karte → grüner Innensaum + Flächen-Schein; markiert Karten des Farbblocks (kollisionsfrei mit Ion-Ring, da inset).
  const greenGlow = green ? "inset 0 0 0 1px #5ab87a88, inset 0 0 16px #5ab87a55" : null;
  // Feuer (#206): geschmiedete EIGENE Karte glüht von INNEN (Inset-Bloom) — KEIN Ring, KEIN äußerer Halo (der 2px-Ring ist der Ionisierung vorbehalten).
  const forgedGlow = forged > 0 ? "inset 0 0 18px #f0a83a5e, inset 0 0 7px #f0b74a4a" : null;
  // Feuer (#206): gebrandmarkte GEGNERkarte „verkohlt von unten" — warmer, GERICHTETER Char-Saum (Inset von unten), klar vom kalten Frostbiss abgesetzt.
  const brandGlow = branded > 0 ? "inset 0 -17px 16px -8px #e0714a88, inset 0 -3px 6px -2px #f0a83a66" : null;
  // Pflanze (#211): kolonisierte GEGNERkarte (Ausläufer) — grüne Ranke wächst vom LINKEN Rand herein (gerichteter Inset von
  // links), organisch/grün → klar von Brand (warm, von unten) und Frostbiss (kalt, ❄) abgesetzt. Marker + Ernte-Tag folgen unten.
  const colonizedGlow = colonized > 0 ? "inset 15px 0 16px -8px #5ab87a99, inset 3px 0 6px -2px #86e0a066" : null;
  // Pflanze (#211): Kartenzahl ergrünt mit dem Wachstum (Suit-Farbe → Grün) und leuchtet intensiv grün ab Reife; voll
  // ausgewachsen am hellsten. `pt` = null → keine Pflanzen-Wirkung (normale Suit-Farbe). Wachstumsring (unten-rechts) nur
  // solange die Karte wächst und NICHT reif ist (bei Reife übernimmt die grüne Zahl + 🌿 das Signal).
  const pt = plantNumberColor(color, growth, green, value);
  const numColor = pt ? pt.color : color;
  // Neon-Tube-Zahl (#UI): mehrschichtiger Neon-Glow in Suit-/Pflanzenfarbe. Die Ziffer selbst ist hohl (transparente
  // Füllung + farbige Kontur, siehe render), der Glow gibt die Leucht-Röhren-Optik. Pflanze moduliert die Stärke über pt.glow.
  // #ios-glow: Der Glow steht NICHT mehr inline als `text-shadow`, sondern als drop-shadow-Kette in index.css
  // (`.card-num`) — Begründung dort. Hier bleiben nur Farbe und Stärke, damit der Mobil-Deckel der CSS-Regel
  // greifen kann; inline gesetzt hätte er ihn (wie bisher) überstimmt.
  const numGlow = pt
    ? { "--num-glow-c": pt.color, "--num-glow-c2": `${pt.color}${pt.ripe ? "aa" : "66"}`, "--num-glow-s": 1 + 0.6 * pt.glow }
    : { "--num-glow-c": color, "--num-glow-c2": `${color}99`, "--num-glow-s": 1 };
  // Pflanze (#277): ZWEISTUFIGER Wachstumsring — Stufe 1 Setzling→Grün (grau→grün, growth/Schwelle), Stufe 2 Grün→
  // Ausgewachsen (heller, value/Deckel). Bleibt sichtbar, bis die Karte ausgewachsen ist (dann trägt die hellste
  // grüne Zahl das „fertig"-Signal). So sieht man je Karte, wie weit sie ist UND wann sie voll auswächst.
  const fullyGrown = green && value >= PLANT_VALUE_CAP;
  const growingStage2 = green && !fullyGrown;                        // grün, aber noch nicht am Wert-Deckel
  const showGrowthRing = (!green && (growth || 0) > 0) || growingStage2;
  const ringPct = growingStage2
    ? Math.min(100, (value / PLANT_VALUE_CAP) * 100)
    : Math.min(100, ((growth || 0) / PLANT_GREEN_THRESHOLD) * 100);
  const ringColor = growingStage2 ? PLANT_RIPE : PLANT;             // Stufe 2 heller abgesetzt
  const ringTitle = growingStage2
    ? t("card.ring.grown", { value, cap: PLANT_VALUE_CAP })
    : t("card.ring.ripening", { growth: fmtNum(Math.round((growth || 0) * 10) / 10), cap: PLANT_GREEN_THRESHOLD });
  return (
    <div
      className="as-card as-card-holo relative rounded-xl overflow-hidden flex flex-col items-center justify-center select-none transition-all"
      style={{
        width: 104, height: 144,
        backgroundColor: HOLO_BASE, backgroundImage: bgImage, backgroundSize: bgSize, backgroundRepeat: bgRepeat,
        opacity: dim ? 0.35 : 1,
        // Ion-Rahmen (blau) zuerst → liegt oben; Gewinn-/Verlust-Glow (#135) darunter; Holo-Saum zuletzt.
        // Glow REIN blur-basiert (kein 0-Blur-Ring mehr) → weicher, kantenloser Rand statt harter Kontur am Kartenrand.
        boxShadow: [ionRing, glow ? `0 0 11px 1px ${glow}88, 0 0 34px ${glow}55` : null, greenGlow, forgedGlow, brandGlow, colonizedGlow, ambientEdge].filter(Boolean).join(", "),
      }}
    >
      {permBoost > 0 && (
        <div className="absolute top-1.5 right-2 text-meta-3 font-bold px-1 rounded"
          style={{ color: "#8a7de0", background: "#8a7de022" }}
          title={t("card.perm.title", { n: permBoost, base: baseRank })}>
          +{permBoost}
        </div>
      )}
      {/* Feuer (#206): Schmiede-Amboss + Betrag (Gold) — oben rechts, unter dem Dauerwert-Badge gestapelt (CORNER.forge). */}
      {forged > 0 && (
        <div className="absolute right-2 text-meta-1 font-bold px-1 rounded leading-none"
          style={{ top: permBoost > 0 ? 24 : 6, color: "#f0b74a", background: "#f0b74a22", textShadow: "0 0 5px #f0a83a88" }}
          title={t("card.forged.title", { n: forged })}>
          ⚒+{forged}
        </div>
      )}
      {/* Zahl (z-2). */}
      <div className="text-display-3 font-bold card-num" style={{ position: "relative", zIndex: 2, color: numColor, WebkitTextFillColor: "transparent", WebkitTextStroke: `2px ${numColor}`, ...numGlow, fontFamily: '"Orbitron", "Helvetica Neue", Arial, sans-serif', fontWeight: 900, fontSize: "calc(2rem * 1.2)", lineHeight: 1 }}>{effective}</div>
      {/* Pflanze (#277): zweistufiger Wachstumsring unten-rechts — Stufe 1 grau→grün (Reife), Stufe 2 heller (Wert-Deckel/
          ausgewachsen). Ausgeblendet erst, wenn die Karte ausgewachsen ist. Sitzt in vocab.CORNER.growthRing. */}
      {showGrowthRing && (
        <div className="absolute bottom-1 right-1 rounded-full" title={ringTitle}
          style={{ width: 16, height: 16, background: `conic-gradient(${ringColor} ${ringPct}%, #ffffff1f ${ringPct}%)`,
                   border: `1px solid ${ringColor}66`, boxShadow: `0 0 4px ${ringColor}55` }}>
          <div className="absolute rounded-full" style={{ inset: 3, background: HOLO_BASE }} />
        </div>
      )}
      {/* Pflanze (#211): Ausläufer-Marker auf der kolonisierten GEGNERkarte — grüne Ranke am linken Rand + „Ernte +N".
          Grün/organisch, klar abgesetzt von Brand (warm) und Frostbiss (❄). Vertikal zentriert → kollidiert weder mit
          🌿-reif (top-left) noch mit ❖-Schichten (bottom-left) noch mit der zentrierten Zahl. */}
      {colonized > 0 && (
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none"
          title={t("card.colonized.title", { n: colonized })}>
          <FactionIcon type="plant" size={15} />
          <span className="text-micro-3 font-bold mt-0.5" style={{ color: "#86e0a0" }}>+{colonized}</span>
        </div>
      )}
      {/* Pflanze (v0): grünes Blatt oben links markiert eine reife/grüne Karte (Teil des Farbblocks, dauerhaft). */}
      {green && (
        <div className="absolute top-1 left-1 leading-none" title={t("card.green.title")}><FactionIcon type="plant" size={15} /></div>
      )}
      {/* Feuer (#206): Brandmarke auf der GEGNERkarte — warmes −N oben links (versetzt zu 🌿) + Flamme unten rechts. Warm/orange → „Feuer, nicht Eis". */}
      {branded > 0 && (
        <>
          <div className="absolute top-1 text-meta-1 font-bold px-1 rounded leading-none"
            style={{ left: green ? 22 : 4, color: "#f7c48a", background: "#e0714a33", textShadow: "0 0 5px #e0714a" }}
            title={t("card.branded.title", { n: branded })}>−{branded}</div>
          <div className="absolute bottom-1 leading-none" style={{ right: 4 }}
            title={t("card.branded.title", { n: branded })}><FactionIcon type="fire" size={15} /></div>
        </>
      )}
      {/* Ionisierung (#208): Pip-Track MITTIG auf der oberen Rahmenkante (gefüllt = Stapel, max ION_MAX_STACKS). Der
          2px-Ionisierungs-Ring (oben) glüht bei VOLL zusätzlich auf. Damit ist die frühere untere linke Ecke geräumt
          (für Eis/Pflanze reserviert, vocab.CORNER). Mittig platziert → kollisionsfrei mit 🌿/−N (links) und +X/⚒ (rechts). */}
      {ionStacks > 0 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 leading-none"
          title={t(ionFull ? "card.ion.titleFull" : "card.ion.title", { n: ionStacks, max: ION_MAX_STACKS, score: ionStacks * ION_SCORE_PER_STACK })}>
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
      <div className="absolute bottom-1.5 flex flex-col items-center leading-tight text-meta-1">
        {permBoost > 0 && <span className="opacity-55">{t("card.base", { base: baseRank })}</span>}
        {stichBonus > 0 && <span style={{ color: "#f2f2f6" }}>{t("card.trickBonus", { n: stichBonus })}</span>}
      </div>
    </div>
  );
}

function CardBackView({ label = "?", image = null }) {
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
      className="rounded-xl border-2 border-dashed flex items-center justify-center text-head-3 opacity-40"
      style={{ width: 104, height: 144, borderColor: "#3a3a44", background: "#17171c" }}
    >
      {label}
    </div>
  );
}

export const Card = memo(CardView);
export const CardBack = memo(CardBackView);
