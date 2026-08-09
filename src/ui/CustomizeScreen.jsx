import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES, ELEMENT_DEFS, ELEMENT_BY_KEY, FX_KEYS, FX_OPTION_KEY,
  elementState, elementPrice, elementUnlock, elementOwned, themeState,
  buyAllInfo, sharedUnlock, canBuyElement, buyElement, buyAllForTheme,
  GLOBAL_FX, GLOBAL_FX_COST, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { startPrunk } from "./prunkFx.js";
import { SliceFx, ExplosionFx, BlackholeFx } from "./Battlefield.jsx";
import { Card } from "./Card.jsx";
import { suitColor } from "../game/constants.js";

/* Anzeige-Liste der Kategorie „Effekte": die kaufbaren GLOBAL_FX + eine synthetische „Standard"-Kachel
   (Gottgleicher Sieg OHNE Prunk) — immer aktiv, kein Kauf, nur zum Vergleichen. Wird direkt vor die
   Gottgleich-Prunk-Effekte eingefügt, damit man Standard ↔ Feuerwerk/Goldregen/Prisma nebeneinander sieht. */
const GOTT_STANDARD = { key: "gottStandard", name: "Gottgleich · Standard", group: "gott", standard: true, preview: "gottStandard",
  desc: "So sieht ein Gottgleicher Sieg OHNE gekaufte Prunk-Effekte aus — die Basis zum Vergleichen (immer aktiv)." };
const EFFEKTE_LIST = (() => {
  const arr = [...GLOBAL_FX];
  const i = arr.findIndex((f) => f.group === "gott");
  arr.splice(i < 0 ? arr.length : i, 0, GOTT_STANDARD);
  return arr;
})();

/* #deckshop — DECK-WERKSTATT: Themes (Deck · Battlefield · Animationen) einzeln kaufen & mischen.
   Zwei Modi: „Meine Sammlung" (Besessenes an/aus, Deck & Battlefield mischbar) und „Vorschau · Alle"
   (Kachel-Galerie → Kauffenster mit Element-Vorschau & Einzelkauf). Kauf spendet SP (onProfileChange),
   Aktiv-Wahl/Animations-Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Echtes Seitenverhältnis der Deck-Bilder (1066×1476) → object-contain zeigt die Karte vollständig
// (kein Anschnitt oben/unten), der bemalte Neon-Rahmen bleibt intakt und der Frame-Glow sitzt bündig.
const CARD_RATIO = "1066 / 1476";

// Gleiche Schwelle wie das In-Run-Battlefield (<picture media="(max-width: 640px)">): so zeigt die
// Vorschau exakt die Version (mobile/desktop), mit der gerade auch gespielt wird.
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);
  return m;
}

// Einmalig injizierte Keyframes für die Element-Vorschauen (Frame Glow / Holo Swipe / Hologrid).
const FX_CSS = `
@keyframes ws-frameglow{0%,100%{box-shadow:0 0 10px -2px var(--a1),inset 0 0 14px -8px var(--a1)}50%{box-shadow:0 0 26px 2px var(--a1),inset 0 0 22px -4px var(--a1)}}
@keyframes ws-swipe{0%{transform:translateX(-120%) rotate(18deg)}55%,100%{transform:translateX(320%) rotate(18deg)}}
@keyframes ws-sweep{0%{bottom:-4%;opacity:0}18%{opacity:1}70%{opacity:1}100%{bottom:106%;opacity:0}}
.ws-sweep{animation:ws-sweep 2.9s ease-in-out infinite}
@keyframes ws-laserpulse{0%,100%{opacity:.5}50%{opacity:1}}
.ws-laserpulse{animation:ws-laserpulse 1.4s ease-in-out infinite}
@keyframes ws-shard{0%{transform:translate(0,0) scale(1);opacity:0}16%{opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(.35);opacity:0}}
.ws-shard{animation:ws-shard 1.3s ease-out infinite}
/* #293 Schwarzes Loch: Karte implodiert spiralig, Akkretions-Partikel fallen einwärts. */
@keyframes ws-bh-implode{0%{transform:scale(1) rotate(0deg);opacity:1}55%{opacity:1}80%{transform:scale(.05) rotate(500deg);opacity:0}100%{transform:scale(.05) rotate(500deg);opacity:0}}
.ws-bh-implode{animation:ws-bh-implode 2.6s ease-in infinite}
@keyframes ws-bh-spiral{0%{transform:rotate(var(--a0)) translateX(var(--r0)) rotate(calc(-1*var(--a0)));opacity:0}12%{opacity:1}46%{transform:rotate(calc(var(--a0) + var(--spin))) translateX(var(--rEnd,0px)) rotate(calc(-1*var(--a0) - var(--spin)));opacity:1}62%{opacity:.5}78%{opacity:1}100%{transform:rotate(calc(var(--a0) + var(--spin) + 120deg)) translateX(var(--rEnd,0px)) rotate(calc(-1*var(--a0) - var(--spin) - 120deg));opacity:0}}
.ws-bh-spiral{animation:ws-bh-spiral 2.6s cubic-bezier(.55,0,.9,.35) infinite}
@keyframes ws-bh-core{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}20%{transform:translate(-50%,-50%) scale(1);opacity:1}70%{opacity:1}88%{transform:translate(-50%,-50%) scale(.02);opacity:0}100%{opacity:0}}
.ws-bh-core{animation:ws-bh-core 2.6s ease-in infinite}
/* #294 Feuerwerk: radiale Partikel aus einem Zündpunkt. --dx/--dy = Flugvektor. */
@keyframes ws-fw{0%{transform:translate(0,0) scale(.6);opacity:0}8%{opacity:1}70%{opacity:.85}100%{transform:translate(var(--dx),calc(var(--dy) + 14px)) scale(1);opacity:0}}
.ws-fw{animation:ws-fw 1.7s ease-out infinite}
/* #294 Weißgold-Regen: Funken fallen von oben, leichtes Twinkle über die Deckkraft. */
@keyframes ws-rain{0%{transform:translateY(-20%);opacity:0}8%{opacity:1}85%{opacity:1}100%{transform:translateY(360%);opacity:0}}
.ws-rain{animation:ws-rain 2.2s linear infinite}
/* #294 Prisma-Welle: Regenbogen-Ring expandiert vom Zentrum. */
@keyframes ws-wave{0%{transform:translate(-50%,-50%) scale(.05);opacity:0}14%{opacity:1}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
.ws-wave{animation:ws-wave 2.6s ease-out infinite}
/* #294 Gottgleich-Event-Loop (Vorschau spielt das echte Ereignis nach): Aura-Flare + Karten-Pop + goldene
   Groß-Ansage, ~3.4s Zyklus. Die Prunk-Partikel laufen darüber. */
@keyframes ws-gott-aura{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}12%{opacity:.9}42%{opacity:.5}72%{opacity:.14}100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)}}
.ws-gott-aura{animation:ws-gott-aura 3.4s ease-out infinite}
@keyframes ws-gott-pop{0%{transform:translate(-50%,-50%) scale(.86);filter:brightness(.8)}8%{transform:translate(-50%,-50%) scale(1.08);filter:brightness(1.6)}20%{transform:translate(-50%,-50%) scale(1);filter:brightness(1.15)}100%{transform:translate(-50%,-50%) scale(1);filter:brightness(1)}}
.ws-gott-pop{animation:ws-gott-pop 3.4s ease-out infinite}
@keyframes ws-gott-ann{0%,3%{opacity:0;transform:translate(-50%,-50%) scale(.55)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.14)}22%{transform:translate(-50%,-50%) scale(1)}62%{opacity:1}82%{opacity:0;transform:translate(-50%,-50%) scale(1.05)}100%{opacity:0}}
.ws-gott-ann{animation:ws-gott-ann 3.4s ease-out infinite}
`;

// Demo-Scherben für die kleine Kachel-Vorschau (Richtung + Farbe; Krit-Palette warm/weiß).
const SHATTER_SHARDS = [
  { x: "-16px", y: "-12px", c: "#ffd36a" }, { x: "15px", y: "-14px", c: "#ff8a4d" }, { x: "18px", y: "9px", c: "#ffffff" },
  { x: "-14px", y: "13px", c: "#ff6a4d" }, { x: "7px", y: "18px", c: "#ffd36a" }, { x: "-7px", y: "-18px", c: "#ffffff" },
];

// #293/#294 Demo-Daten der kleinen Kachel-Vorschauen (deterministisch, kein Math.random im Render).
const BH_SPIRAL = Array.from({ length: 11 }, (_, i) => ({
  a0: `${(i / 11) * 360 + (i % 3) * 17}deg`, r0: `${28 + (i % 4) * 9}px`, spin: `${240 + (i % 3) * 80}deg`,
  dl: `${(i / 11) * 0.9}s`, w: 3 + (i % 3), white: i % 4 === 0,
}));
const FW_BURSTS = [
  { cx: "26%", cy: "28%", dl: 0 }, { cx: "62%", cy: "22%", dl: 0.5 }, { cx: "44%", cy: "40%", dl: 1.0 }, { cx: "78%", cy: "36%", dl: 0.75 },
].map((b) => ({ ...b, parts: Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2; return { dx: `${(Math.cos(a) * 34).toFixed(0)}px`, dy: `${(Math.sin(a) * 34).toFixed(0)}px`, white: i % 4 === 0 };
}) }));
const RAIN_DROPS = Array.from({ length: 20 }, (_, i) => ({
  x: `${((i * 53) % 100)}%`, dl: `${((i * 37) % 100) / 100 * 2.2}s`, w: 2 + (i % 3),
  c: ["#fff0b0", "#ffd873", "#ffffff", "#ffc978"][i % 4], dur: `${1.8 + (i % 4) * 0.2}s`,
}));
const PRISMA_RING = "conic-gradient(from 0deg,#ff4d4d,#ffa53a,#ffe14d,#54e08a,#35e0ff,#5a8ade,#9b82f0,#ff4dcb,#ff4d4d)";

// Overlay-Partikel eines Gottgleich-Prunk-Effekts (über der Szene) — dieselben Demo-Daten wie sonst.
function PrunkParticles({ variant, LC = "#35e0ff" }) {
  if (variant === "fireworks") return FW_BURSTS.map((b, bi) => (
    <div key={bi} className="absolute" style={{ left: b.cx, top: b.cy, width: 0, height: 0 }}>
      {b.parts.map((pt, i) => (
        <div key={i} className="ws-fw absolute" style={{ left: 0, top: 0, width: 4, height: 4, marginLeft: -2, marginTop: -2, borderRadius: "50%",
          background: pt.white ? "#ffffff" : LC, boxShadow: `0 0 7px ${pt.white ? "#ffffff" : LC}`, "--dx": pt.dx, "--dy": pt.dy, animationDelay: `${b.dl}s` }} />
      ))}
    </div>
  ));
  if (variant === "goldRain") return RAIN_DROPS.map((d, i) => (
    <div key={i} className="ws-rain absolute" style={{ left: d.x, top: "-6%", width: d.w, height: d.w * 2.4, borderRadius: 1,
      background: d.c, boxShadow: `0 0 6px ${d.c}`, animationDelay: d.dl, animationDuration: d.dur }} />
  ));
  if (variant === "prismaWave") return [0, 1].map((r) => (
    <div key={r} className="ws-wave absolute" style={{ left: "50%", top: "50%", width: "70%", aspectRatio: "1", borderRadius: "50%",
      background: PRISMA_RING, animationDelay: `${r * 0.7}s`,
      WebkitMaskImage: "radial-gradient(circle, transparent 56%, #000 60%, #000 70%, transparent 74%)",
      maskImage: "radial-gradient(circle, transparent 56%, #000 60%, #000 70%, transparent 74%)" }} />
  ));
  return null; // "standard" → keine Prunk-Partikel
}

/* Canvas-Overlay = dieselbe In-Game-Wucht (startPrunk) im Loop. NUR für die große Vorschau (ein Canvas, nur
   solange das Fenster offen ist) — die kleinen Kacheln bleiben auf der leichten CSS-Variante (kein Dauer-rAF im Grid). */
function PrunkCanvas({ variant }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    return startPrunk(ref.current, {
      fireworks: variant === "fireworks", goldRain: variant === "goldRain", prismaWave: variant === "prismaWave",
      color: "#35e0ff", originX: 0.5, originY: 0.58, loop: true });
  }, [variant]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

/* #294 Gottgleich-Vorschau: spielt das ECHTE Ereignis im Loop nach (Karten-Pop + Aura-Flare + goldene
   „GOTTGLEICH ×7"-Groß-Ansage) und legt den jeweiligen Prunk-Effekt darüber. variant "standard" zeigt den
   Basis-Look ohne Prunk → direkter Vergleich. compact = kleine Kachel (leichte CSS-Partikel); groß = Canvas-Wucht. */
function GottgleichPreview({ variant, compact = false }) {
  const bf = battlefieldAssets("bf_kaiju");
  const cardImg = deckAssets("default").back;
  const hasPrunk = variant !== "standard";
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Sieg-Aura (grün→gold) */}
      <div className="ws-gott-aura absolute" style={{ left: "50%", top: "56%", width: "72%", aspectRatio: "1", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,166,58,.55), rgba(90,184,122,.28) 46%, transparent 70%)" }} />
      {/* Gewinnerkarte, ploppt an */}
      <div className="ws-gott-pop absolute" style={{ left: "50%", top: "58%", width: compact ? "34%" : "20%", aspectRatio: CARD_RATIO }}>
        <img src={cardImg} alt="" className="absolute inset-0 w-full h-full object-contain rounded" />
      </div>
      {/* Prunk-Overlay: große Vorschau = volle Canvas-Wucht, Kachel = leichte CSS-Partikel. */}
      {hasPrunk && (compact ? <PrunkParticles variant={variant} /> : <PrunkCanvas variant={variant} />)}
      {/* Goldene Groß-Ansage */}
      <div className="ws-gott-ann absolute font-extrabold" style={{ left: "50%", top: "30%", whiteSpace: "nowrap",
        fontSize: compact ? 13 : 22, letterSpacing: ".06em",
        backgroundImage: "linear-gradient(180deg,#fff0b0,#ffd873 45%,#d4a63a)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        filter: "drop-shadow(0 0 10px rgba(212,166,58,.6))" }}>
        GOTTGLEICH<span style={{ color: "#e879f9", WebkitTextFillColor: "#e879f9" }}> ×7</span>
      </div>
    </div>
  );
}

/* Karten-Finisher-Vorschau: die ECHTEN In-Game-Komponenten (SliceFx/ExplosionFx/BlackholeFx) an einer Demo-Karte
   im Loop — Vorschau = In-Game (keine separate Engine, kein Drift). Die Demo-Karte trägt die echte Neon-Zahl &
   Holo-Optik wie im Spiel. Wird per `tick`/Remount neu gespielt; Demo-Dauern (fester Takt) sind gut sichtbar. */
const DEMO_SUIT = "B"; // blau — Effektfarbe = suitColor (wie in-game die Gegner-Suit-Farbe)
const FIN_DELAY = 460, FIN_HALVES = 950, FIN_CUT = 130, FIN_SPARK = 950, FIN_HOLE = 460, FIN_HOLESTAR = 950;
function FinisherScene({ variant }) {
  const [tick, setTick] = useState(0);
  const bf = battlefieldAssets("bf_kaiju");
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400); // Loop: Karte erscheint → wird zerstört → Pause
    return () => clearInterval(id);
  }, []);
  const suitCol = suitColor(DEMO_SUIT);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  const seed = tick * 3 + 1;
  let fx = null;
  if (variant === "laser") fx = <SliceFx cardEl={cardEl} color={suitCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} tier={2} scale={1} laser />;
  else if (variant === "shatter") fx = <ExplosionFx cardEl={cardEl} color="#e879f9" cardDur={FIN_HALVES} burstDur={FIN_SPARK} flashDur={200} seed={seed} delay={FIN_DELAY} intensity={0.6} tier={3} scale={1} />;
  else fx = <BlackholeFx cardEl={cardEl} color={suitCol} cardDur={FIN_HOLE} starDur={FIN_HOLESTAR} seed={seed} delay={FIN_DELAY} intensity={0.5} scale={1} streak={15} />;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Demo-Karte im echten 104×144-Slot, zentriert; die Finisher-Komponente rendert die Karte + Effekt darin. */}
      <div className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
        <div key={tick} className="absolute inset-0">{fx}</div>
      </div>
    </div>
  );
}

// Battlefield-Szenen-Vorschau eines globalen Effekts im Kauffenster — läuft im Loop.
function GlobalFxScenePreview({ fx }) {
  // Gottgleich-Effekte (inkl. Standard) spielen das komplette Ereignis nach.
  if (["fireworks", "goldRain", "prismaWave"].includes(fx.preview)) return <GottgleichPreview variant={fx.preview} />;
  if (fx.preview === "gottStandard") return <GottgleichPreview variant="standard" />;
  // Karten-Finisher: Canvas-Vorschau (wie Gottgleich).
  if (["laser", "shatter", "blackhole"].includes(fx.preview)) return <FinisherScene variant={fx.preview} />;
  // Fallback (kein bekannter Vorschautyp): schlichte Battlefield-Szene.
  const bf = battlefieldAssets("bf_kaiju");
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
    </div>
  );
}

// Karten-Vorschau: illustrierter Deck-Rücken (Motiv), vollständig (object-contain) + optionaler Effekt.
// Frame Glow = pulsierender Schein am Kartenrand (liegt bündig, egal wie der bemalte Rahmen sitzt).
function CardPreview({ deckId, a1, fx, className = "" }) {
  const img = deckAssets(deckId).back;
  const glow = fx === "frameGlow";
  return (
    <div className={`relative rounded-lg ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", "--a1": a1, animation: glow ? "ws-frameglow 2s ease-in-out infinite" : undefined }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
      {fx === "holoSwipe" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute" style={{ top: "-60%", left: 0, width: "40%", height: "220%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.28),rgba(120,220,255,.16),transparent)",
            animation: "ws-swipe 2.6s ease-in-out infinite" }} />
        </div>
      )}
    </div>
  );
}

// Battlefield-Vorschau: echtes BF-Bild in der AKTUELL gespielten Version (mobile/desktop, gleiche 640px-
// Schwelle wie im Spiel) + optionales Hologrid-Gitter in der Deck-Hauptfarbe (a1). showVersion blendet ein
// kleines Label ein, welche Version man gerade sieht.
function BfPreview({ bfId, a1, fx, className = "", showVersion = false }) {
  const bf = battlefieldAssets(bfId);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
      {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 grid place-items-center text-xs opacity-40">Kein Battlefield</div>}
      {showVersion && bf && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: "#0b0a16cc", border: "1px solid #34333f", color: "#9a97ab" }}>{isMobile ? "MOBILE" : "DESKTOP"}</span>
      )}
      {fx === "hologrid" && (
        // Ruhiges Gitter + durchfahrende Leucht-Linie (wie im Spiel je Stich; hier als Endlos-Demo).
        <div className="absolute pointer-events-none" style={{
          left: "-20%", right: "-20%", bottom: 0, height: "48%",
          transform: "perspective(140px) rotateX(60deg)", transformOrigin: "bottom" }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(${a1} 1px,transparent 1px),linear-gradient(90deg,${a1} 1px,transparent 1px)`,
            backgroundSize: "16px 16px", opacity: 0.26 }} />
          <div className="ws-sweep absolute left-0 right-0" style={{ height: 7,
            background: `linear-gradient(90deg,transparent,${a1} 15%,#ffffff 50%,${a1} 85%,transparent)`,
            boxShadow: `0 0 20px 4px ${a1}, 0 0 52px 12px ${a1}, 0 0 6px 2px #ffffff` }} />
        </div>
      )}
    </div>
  );
}

// Großes Vorschaufeld im Kauffenster — schaltet je nach gewähltem Element (Karte/BF/Animation).
// Wird in einer festen Höhe zentriert (BuyOverlay), damit der Rahmen beim Wechsel Karte↔BF nicht springt.
function BigPreview({ theme, sel }) {
  if (sel === "bf" || sel === "hologrid") return <BfPreview bfId={theme.bfId} a1={theme.a1} fx={sel === "hologrid" ? "hologrid" : null} className="w-full" showVersion />;
  const fx = sel === "frameGlow" || sel === "holoSwipe" ? sel : null;
  return (
    <div className="flex justify-center">
      <CardPreview deckId={theme.deckId} a1={theme.a1} fx={fx} className="h-[248px] max-h-[46vh]" />
    </div>
  );
}

// Kleine Deck-Rücken-Miniatur (für Sammlungs-Zeilen & Kacheln). object-contain → nie angeschnitten
// (der schwarze Kartengrund verschmilzt mit dem Panel-Hintergrund, Letterboxing bleibt unsichtbar).
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  return <img src={img} alt="" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

// Radio-Punkt (Aktiv-Wahl).
function Radio({ on }) {
  return (
    <span className="relative shrink-0 rounded-full" style={{ width: 20, height: 20, border: `2px solid ${on ? "#54e08a" : "#44424f"}` }}>
      {on && <span className="absolute rounded-full" style={{ inset: 3, background: "#54e08a" }} />}
    </span>
  );
}

// Umschalter (Animationen an/aus).
function Switch({ on, disabled }) {
  return (
    <span className="relative shrink-0 rounded-full transition-colors" style={{
      width: 42, height: 23, background: disabled ? "#26262c" : on ? "#54e08a" : "#33323f", opacity: disabled ? 0.5 : 1 }}>
      <span className="absolute rounded-full transition-all" style={{ top: 2, left: on ? 21 : 2, width: 19, height: 19, background: "#f2f2f6" }} />
    </span>
  );
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

// Ein-/ausklappbare Kategorie-Überschrift in „Verfügbare Decks" (Standard: offen). Klick auf den Kopf klappt zu/auf.
function FoldSection({ title, hint, open, onToggle, children }) {
  return (
    <>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2 text-left" style={{ color: "#9a97ab" }}>
        {title}
        <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
        {hint && <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{hint}</span>}
        <span className="text-[11px] shrink-0" aria-hidden="true" style={{ color: "#6d7288", transition: "transform .15s", transform: open ? "rotate(90deg)" : "none" }}>›</span>
      </button>
      {open && children}
    </>
  );
}

export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  const p = profile || {};
  const [mode, setMode] = useState("mine");   // "mine" | "prev"
  const [ov, setOv] = useState(null);          // Theme-Kauffenster: { list: theme[], idx } | null (kategorie-lokal)
  const [ovFxIdx, setOvFxIdx] = useState(-1);  // Effekt-Kauffenster: Index in EFFEKTE_LIST (-1 = zu)
  const stepFx = (d) => setOvFxIdx((i) => (i + d + EFFEKTE_LIST.length) % EFFEKTE_LIST.length);
  const [sel, setSel] = useState("deck");      // gewähltes Element im Kauffenster
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));

  const deckId = options?.deckId || "default";
  const bfId = options?.battlefieldId || "default";
  const activeTheme = THEMES.find((t) => t.deckId === deckId) || null; // Theme des aktiven Decks (für Animationen)

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };

  // Sammlungs-Listen: Themes, deren Deck bzw. Battlefield im Besitz ist.
  const ownedDeckThemes = THEMES.filter((t) => t.els.includes("deck") && elementOwned(p, t, "deck"));
  const ownedBfThemes   = THEMES.filter((t) => t.els.includes("bf")   && elementOwned(p, t, "bf"));

  const openOv = (list, idx) => { setOv({ list, idx }); setSel(ELEMENT_DEFS[0].key); };
  const stepOv = (d) => { setOv((o) => (o ? { ...o, idx: (o.idx + d + o.list.length) % o.list.length } : o)); setSel("deck"); };
  const ovTheme = ov ? ov.list[ov.idx] : null;
  // Ist ein Kauffenster offen (Theme oder Effekt), wird der Shop-Hintergrund NICHT mitgescrollt (kein Scroll-
  // Durchgriff/„-chaining" auf iOS) — das Overlay scrollt nur sich selbst. Gilt für alle Kategorien gleich.
  const anyOverlay = !!ov || ovFxIdx >= 0;

  return (
    <div className={`fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 ${anyOverlay ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{FX_CSS}</style>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Kopf */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Deck-Werkstatt</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Modus-Umschalter */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["mine", "Verfügbare Decks"], ["prev", "Vorschau · Alle"]].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-extrabold transition-colors"
                style={{ background: mode === m ? "#9b82f0" : "transparent", color: mode === m ? "#141419" : "#9a97ab" }}>{label}</button>
            ))}
          </div>
        </div>

        {mode === "mine" ? (
          <MineView p={p} deckId={deckId} bfId={bfId} activeTheme={activeTheme} options={options}
            ownedDeckThemes={ownedDeckThemes} ownedBfThemes={ownedBfThemes} onChoose={onChoose} onBrowse={() => setMode("prev")} />
        ) : (
          <PreviewView p={p} onOpen={openOv} onOpenFx={(fx) => setOvFxIdx(EFFEKTE_LIST.indexOf(fx))} />
        )}
      </div>

      {/* Kauffenster via Portal an document.body: der Shop-Root trägt backdrop-filter und ist damit der
          Containing-Block für `position:fixed` — genestet würde das Overlay am (gescrollten) Shop kleben statt am
          Viewport. Das Portal löst es heraus → echtes Vollbild-Overlay, egal wie weit gescrollt ist. */}
      {ov && ovTheme && createPortal(
        <BuyOverlay theme={ovTheme} list={ov.list} idx={ov.idx} p={p} sel={sel} setSel={setSel} spBal={spBal}
          deckId={deckId} bfId={bfId} options={options} onChoose={onChoose}
          onStep={stepOv} onClose={() => setOv(null)}
          onBuy={(el) => buy((pf) => buyElement(pf, ovTheme, el))}
          onBuyAll={() => buy((pf) => buyAllForTheme(pf, ovTheme))} />,
        document.body)}

      {ovFxIdx >= 0 && createPortal(
        <GlobalFxOverlay fx={EFFEKTE_LIST[ovFxIdx]} idx={ovFxIdx} count={EFFEKTE_LIST.length} p={p} spBal={spBal}
          onStep={stepFx} onClose={() => setOvFxIdx(-1)}
          onBuy={() => { const fx = EFFEKTE_LIST[ovFxIdx]; if (!fx.standard) buy((pf) => buyGlobalFx(pf, fx)); }} />,
        document.body)}
    </div>
  );
}

/* ---- „Meine Sammlung" ---- */
function MineView({ p, deckId, bfId, activeTheme, options, ownedDeckThemes, ownedBfThemes, onChoose, onBrowse }) {
  const fxOwnedActive = (fx) => activeTheme && activeTheme.els.includes(fx) && elementOwned(p, activeTheme, fx);
  const ownedGlobalFx = GLOBAL_FX.filter((fx) => globalFxOwned(p, fx));
  const isMobile = useIsMobile();
  const accent = activeTheme?.a1 || "#8a7de0";
  const stdThumb = <span className="shrink-0" style={{ width: 34, height: 44, borderRadius: 6, background: "#171622", border: "1px solid #2a2836" }} />;
  // Kategorien ein-/ausklappbar. Zustand in den Optionen gemerkt (fehlt = offen) → beim ersten Mal offen, danach
  // bleibt die Einstellung, mit der man die Werkstatt verlassen hat.
  const FOLD_KEY = { deck: "wsFoldDeck", bf: "wsFoldBf", anim: "wsFoldAnim", fx: "wsFoldFx" };
  const open = { deck: options?.wsFoldDeck !== false, bf: options?.wsFoldBf !== false, anim: options?.wsFoldAnim !== false, fx: options?.wsFoldFx !== false };
  const toggle = (k) => onChoose({ [FOLD_KEY[k]]: !open[k] });
  return (
    <>
      <p className="text-[11px] opacity-45 mt-2 leading-snug">
        Nur <b>Gekauftes/Freigeschaltetes</b> erscheint hier. Karte &amp; Battlefield sind über Themes hinweg <b>mischbar</b> (nur je eins aktiv); Animationen einzeln zuschaltbar.
      </p>

      {/* Kartendeck */}
      <FoldSection title="Kartendeck" hint="nur eins aktiv" open={open.deck} onToggle={() => toggle("deck")}>
        <div className="flex flex-col gap-2">
          <SelectRow active={deckId === "default"} onClick={() => onChoose({ deckId: "default" })}
            thumb={stdThumb} title="Standard" sub="Grund-Deck" />
          {ownedDeckThemes.map((t) => (
            <SelectRow key={t.id} active={deckId === t.deckId} onClick={() => onChoose({ deckId: t.deckId })}
              thumb={<DeckThumb deckId={t.deckId} className="rounded-md" style={{ width: 34, height: 44 }} />}
              title={t.name} sub="Karte Front + Back" />
          ))}
        </div>
      </FoldSection>

      {/* Battlefield */}
      <FoldSection title="Battlefield" hint="nur eins aktiv" open={open.bf} onToggle={() => toggle("bf")}>
        <div className="flex flex-col gap-2">
          <SelectRow active={bfId === "default"} onClick={() => onChoose({ battlefieldId: "default" })}
            thumb={stdThumb} title="Standard" sub="Schlichter Grund" />
          {ownedBfThemes.map((t) => {
            const a = battlefieldAssets(t.bfId);
            return (
              <SelectRow key={t.id} active={bfId === t.bfId} onClick={() => onChoose({ battlefieldId: t.bfId })}
                thumb={<img src={isMobile ? a?.mobile : a?.desktop} alt="" className="object-cover rounded-md" style={{ width: 34, height: 44 }} />}
                title={t.name} sub={`Neon-Szene · ${isMobile ? "Mobile" : "Desktop"}`} />
            );
          })}
        </div>
      </FoldSection>

      {/* Animationen (global an/aus, an das aktive Theme gebunden) */}
      <FoldSection title="Animationen" hint="frei kombinierbar" open={open.anim} onToggle={() => toggle("anim")}>
        <div className="flex flex-col gap-2">
          {FX_KEYS.map((fx) => {
            const def = ELEMENT_BY_KEY[fx];
            const owned = fxOwnedActive(fx);
            const on = owned && !!options?.[FX_OPTION_KEY[fx]];
            return (
              <button key={fx} type="button" disabled={!owned}
                onClick={owned ? () => onChoose({ [FX_OPTION_KEY[fx]]: !on }) : undefined}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-left" style={{ background: "#14131c", border: "1px solid #2a2836", cursor: owned ? "pointer" : "default", opacity: owned ? 1 : 0.55 }}>
                <span className="shrink-0 rounded-md" style={{ width: 30, height: 30, background: owned ? `${accent}22` : "#171622", border: `1px solid ${owned ? `${accent}66` : "#2a2836"}` }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-extrabold">{def.name}</span>
                  <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{owned ? def.desc : "Im aktiven Theme nicht im Besitz"}</span>
                </span>
                <Switch on={on} disabled={!owned} />
              </button>
            );
          })}
        </div>
      </FoldSection>

      {/* Effekte (global gekaufte Effekte, laufweit — hier an/aus) */}
      {ownedGlobalFx.length > 0 && (
        <FoldSection title="Effekte" hint="global · laufweit" open={open.fx} onToggle={() => toggle("fx")}>
          <div className="flex flex-col gap-2">
            {ownedGlobalFx.map((fx) => {
              const on = !!options?.[fx.option];
              return (
                <button key={fx.key} type="button" onClick={() => onChoose({ [fx.option]: !on })}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-left" style={{ background: "#14131c", border: "1px solid #2a2836" }}>
                  <span className="shrink-0 rounded-md" style={{ width: 30, height: 30, background: "#35e0ff22", border: "1px solid #35e0ff66" }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-extrabold">{fx.name}</span>
                    <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{fx.desc}</span>
                  </span>
                  <Switch on={on} disabled={false} />
                </button>
              );
            })}
          </div>
        </FoldSection>
      )}

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Animationen gehören zu den kaufbaren Themes und wirken auf das <b>aktive</b> Deck/Battlefield; globale Effekte laufweit.
        Fehlt dir etwas? <button onClick={onBrowse} className="underline font-semibold" style={{ color: "#26c6e6" }}>Alle Themes ansehen →</button>
      </p>
    </>
  );
}

function SelectRow({ active, onClick, thumb, title, sub }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
      style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}` }}>
      <span className="shrink-0 overflow-hidden">{thumb}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-extrabold truncate">{title}</span>
        <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{sub}</span>
      </span>
      <Radio on={active} />
    </button>
  );
}

// Kachel-Vorschau eines globalen Effekts (klein, im Effekte-Grid). Zeigt den Effekt-Charakter über einer Demo-Karte.
function GlobalFxPreview({ fx }) {
  const LC = "#35e0ff"; // Demo-Farbe (in-game = Deck-/Suit-Farbe)
  const p = fx.preview;
  // Gottgleich-Effekte (inkl. Standard) zeigen das Ereignis in kompakter Form.
  if (["fireworks", "goldRain", "prismaWave"].includes(p)) return <GottgleichPreview variant={p} compact />;
  if (p === "gottStandard") return <GottgleichPreview variant="standard" compact />;
  return (
    <>
      <img src={deckAssets("default").back} alt="" className="absolute inset-0 w-full h-full object-contain" />
      {p === "shatter" && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 ws-laserpulse" style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.5), transparent 55%)" }} />
          {SHATTER_SHARDS.map((s, i) => (
            <span key={i} className="ws-shard absolute" style={{ left: "50%", top: "50%", width: 6, height: 6, marginLeft: -3, marginTop: -3,
              background: s.c, boxShadow: `0 0 6px ${s.c}`, borderRadius: 1, "--sx": s.x, "--sy": s.y }} />
          ))}
        </div>
      )}
      {p === "laser" && (
        <div className="absolute pointer-events-none ws-laserpulse" style={{ left: "-12%", right: "-12%", top: "48%", height: 2, transform: "rotate(-20deg)",
          background: `linear-gradient(90deg,transparent,${LC} 15%,#ffffff 50%,${LC} 85%,transparent)`,
          boxShadow: `0 0 8px 2px ${LC}, 0 0 20px 5px ${LC}` }} />
      )}
      {p === "blackhole" && (
        <div className="absolute inset-0 pointer-events-none grid place-items-center">
          <div className="ws-bh-core" style={{ position: "relative", width: 20, height: 20, borderRadius: "50%",
            background: "radial-gradient(circle,#05050a 42%,transparent 72%)", border: `1.5px solid ${LC}`,
            boxShadow: `0 0 10px 2px ${LC}, inset 0 0 8px 1px ${LC}` }} />
          {BH_SPIRAL.slice(0, 7).map((s, i) => (
            <div key={i} className="ws-bh-spiral absolute" style={{ left: "50%", top: "50%", width: 0, height: 0,
              "--a0": s.a0, "--r0": "22px", "--spin": s.spin, animationDelay: s.dl }}>
              <div style={{ position: "absolute", left: -1.5, top: -1.5, width: 3, height: 3, borderRadius: "50%",
                background: s.white ? "#ffffff" : LC, boxShadow: `0 0 5px ${s.white ? "#ffffff" : LC}` }} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* Kauffenster eines globalen Effekts (analog zum Theme-Kauffenster): großes Preview + Kauf. Aktivieren
   passiert danach unter „Verfügbare Decks". */
function GlobalFxOverlay({ fx, idx, count, p, spBal, onStep, onClose, onBuy }) {
  const owned = fx.standard || globalFxOwned(p, fx);
  const canBuy = !fx.standard && canBuyGlobalFx(p, fx);
  const touch = useRef(0);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (count > 1 && Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{fx.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>
          {/* Battlefield-Szene im Loop → zeigt, wie der Effekt im Spiel aussieht. ‹ › / Wischen zwischen Effekten. */}
          <div className="flex items-center gap-2">
            {count > 1 && <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>}
            <div className="flex-1 min-w-0 py-1">
              <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
                <GlobalFxScenePreview fx={fx} />
              </div>
            </div>
            {count > 1 && <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>}
          </div>
          {count > 1 && (
            <div className="flex gap-1.5 justify-center mt-2">
              {Array.from({ length: count }).map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
            </div>
          )}
          <div className="text-center text-[11px] mt-2 leading-snug" style={{ color: "#9a97ab", minHeight: 32 }}>{fx.desc}</div>
          <div className="mt-2.5">
            {fx.standard ? (
              <div className="w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ background: "#1c2433", color: "#7fb4ff", border: "1px solid #33507a" }}>
                Standard — immer aktiv, kein Kauf nötig
              </div>
            ) : owned ? (
              <div className="w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>
                ✓ Im Besitz — unter „Verfügbare Decks" an/aus
              </div>
            ) : (
              <button onClick={onBuy} disabled={!canBuy}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5 transition-opacity"
                style={{ background: canBuy ? "linear-gradient(90deg,#f2c14a,#ffb84d)" : "#3a2f12", color: "#141419",
                  boxShadow: canBuy ? "0 0 16px rgba(242,193,74,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
                Kaufen · {GLOBAL_FX_COST} SP{!canBuy && spBal < GLOBAL_FX_COST ? " (zu wenig SP)" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- „Vorschau · Alle": Kategorien (Packs · Challenges · Effekte), durchwischbar ----
   Packs = mit SP kaufbare Theme-Bündel; Challenges = über Läufe/Challenges freischaltbare Themes;
   Effekte = globale Effekte (einmal gekauft, laufweit — z. B. Laser-Schnitt der Gegnerkarten). */
const PREVIEW_CATS = [
  { k: "packs",      label: "Packs",      filter: (t) => t.kind === "buy",  empty: null },
  { k: "challenges", label: "Challenges", filter: (t) => t.kind === "cond", empty: null },
  { k: "effekte",    label: "Effekte",    filter: () => false,              empty: null },
];

function PreviewView({ p, onOpen, onOpenFx }) {
  const [cat, setCat] = useState(0);
  const touch = useRef(0);
  const move = (d) => setCat((c) => Math.min(PREVIEW_CATS.length - 1, Math.max(0, c + d)));
  const active = PREVIEW_CATS[cat];
  const isEffekte = active.k === "effekte";
  const list = THEMES.filter(active.filter);

  return (
    <div onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1); }}>
      {/* Kategorie-Tabs (wischbar) */}
      <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
        {PREVIEW_CATS.map((c, i) => (
          <button key={c.k} onClick={() => setCat(i)} className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-colors"
            style={{ background: i === cat ? "#26c6e6" : "#14131c", color: i === cat ? "#08181c" : "#9a97ab", border: `1px solid ${i === cat ? "#26c6e6" : "#2a2836"}` }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className={EYEBROW} style={{ color: "#9a97ab" }}>{active.label}
        <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
        <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{cat === 0 ? "tippen → Elemente einzeln kaufen" : cat === 1 ? "tippen → Freischaltung ansehen" : "global · einmal kaufen"}</span>
      </div>

      {/* Feste Mindesthöhe ~ Packs-Höhe → kein spürbarer Größensprung beim Wechsel Packs↔Effekte. */}
      <div style={{ minHeight: 460 }}>
      {isEffekte ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {EFFEKTE_LIST.map((fx) => {
            const owned = fx.standard || globalFxOwned(p, fx);
            const badge = fx.standard ? ["STANDARD", "#1c2433", "#7fb4ff", "#33507a"]
              : owned ? ["KOMPLETT", "#123a25", "#54e08a", "#2f7a4f"] : ["KAUFBAR", "#2e2410", "#f2c14a", "#6b5320"];
            const sub = fx.standard ? ["immer aktiv · Vergleich", "#7fb4ff"] : owned ? ["im Besitz", "#54e08a"] : ["global · kaufbar", "#f2c14a"];
            return (
              <button key={fx.key} type="button" onClick={() => onOpenFx(fx)} className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#14131c", border: "1px solid #2a2836" }}>
                <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                  <GlobalFxPreview fx={fx} />
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>
                </div>
                <div className="px-2 py-1.5">
                  <span className="text-[12px] font-extrabold truncate block">{fx.name}</span>
                  <span className="text-[10px]" style={{ color: sub[1] }}>{sub[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : list.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {list.map((t, i) => {
            const s = themeState(p, t);
            const locked = s === "lock";
            const badge = s === "own" ? ["KOMPLETT", "#123a25", "#54e08a", "#2f7a4f"]
              : s === "mix" ? ["TEILS", "#251a2e", "#ff4dcb", "#5a3a63"]
              : s === "buy" ? ["KAUFBAR", "#2e2410", "#f2c14a", "#6b5320"]
              : ["GESPERRT", "#1c1b24", "#9a97ab", "#2e2d38"];
            const state = s === "own" ? ["alle Elemente", "#54e08a"] : s === "mix" ? ["teils im Besitz", "#54e08a"]
              : s === "buy" ? ["Elemente kaufbar", "#f2c14a"] : ["freischaltbar", "#6d6a80"];
            return (
              <button key={t.id} type="button" onClick={() => onOpen(list, i)} className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#14131c", border: "1px solid #2a2836" }}>
                <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                  <DeckThumb deckId={t.deckId} className="absolute inset-0 w-full h-full" style={{ filter: locked ? "grayscale(.7) brightness(.5)" : undefined }} />
                  {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
                </div>
                <div className="px-2 py-1.5">
                  <span className="text-[12px] font-extrabold truncate block">{t.name}</span>
                  <span className="text-[10px]" style={{ color: state[1] }}>{state[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid place-items-center text-center rounded-2xl py-12 px-6" style={{ background: "#131219", border: "1px dashed #2e2d38" }}>
          <div className="text-[13px] font-extrabold">{active.label} — noch leer</div>
          <div className="text-[11px] mt-1 leading-snug" style={{ color: "#9a97ab", maxWidth: 260 }}>
            {active.empty} kommen bald einzeln in den Shop. Bis dahin bekommst du sie als Teil der <b>Packs</b>.
          </div>
        </div>
      )}
      </div>

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        {cat === 0
          ? <>Ein <b>Pack</b> bündelt Karte · Battlefield · Animationen. Im Kauffenster hat jedes Element eine eigene Vorschau &amp; einen eigenen Kauf.</>
          : cat === 1
          ? <>Challenge-Themes schalten alle Elemente <b>auf einmal</b> frei — tippe ein Theme an, um die Bedingung zu sehen.</>
          : <><b>Globale</b> Effekte: einmal gekauft, laufweit wirksam (kein Per-Theme). Der Laser-Schnitt ersetzt die Klinge auf Gegnerkarten in deren Farbe.</>}
      </p>
    </div>
  );
}

/* Besessenes Element im Kauffenster: direkt anlegen/aktivieren statt nur „Besitz".
   Deck/Battlefield = Radio (nur eins aktiv) → „Anlegen" / „✓ Aktiv"; Animationen = An/Aus-Toggle (Option). */
function OwnedAction({ el, theme, deckId, bfId, options, onChoose }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const btn = "text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors";
  if (el === "deck" || el === "bf") {
    const active = el === "deck" ? deckId === theme.deckId : bfId === theme.bfId;
    if (active) return <span className={btn} style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>✓ Aktiv</span>;
    const apply = () => onChoose(el === "deck" ? { deckId: theme.deckId } : { battlefieldId: theme.bfId });
    return <button type="button" onClick={stop(apply)} className={btn} style={{ background: "#211d33", color: "#b9a9f2", border: "1px solid #4a3f6e" }}>Anlegen</button>;
  }
  // Animation (frameGlow/holoSwipe/hologrid): globaler An/Aus-Toggle (wirkt auf das aktive Deck-Theme).
  const key = FX_OPTION_KEY[el];
  const on = !!options?.[key];
  return (
    <button type="button" onClick={stop(() => onChoose({ [key]: !on }))} className={btn}
      style={on ? { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" } : { background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
      {on ? "✓ An" : "Aus"}
    </button>
  );
}

/* ---- Kauffenster (Element-Ebene) ---- */
function BuyOverlay({ theme, list, idx, p, sel, setSel, spBal, deckId, bfId, options, onChoose, onStep, onClose, onBuy, onBuyAll }) {
  const shared = sharedUnlock(p, theme);        // Challenge → gemeinsame Freischalt-Beschreibung (statt Preisen)
  const isChallenge = !!shared;
  const info = buyAllInfo(p, theme);
  const ed = ELEMENT_BY_KEY[sel];
  const touch = useRef(0);
  // Feste Größe: Element-Liste auf die höchste Element-Zahl der Kategorie auffüllen (Platzhalter-Zeilen),
  // damit der Rahmen beim Wischen zwischen Themes nicht springt.
  const maxEls = Math.max(1, ...list.map((t) => t.els.length));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{theme.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          {/* Großes Element-Preview mit ‹ › — feste Höhe (Karte↔BF springt nicht) */}
          <div className="flex items-center gap-2" style={{ height: 252 }}>
            <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
            <div className="flex-1 min-w-0 h-full flex items-center justify-center"><BigPreview theme={theme} sel={sel} /></div>
            <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
          </div>
          <div className="text-center text-[10.5px] mt-2 flex items-center justify-center" style={{ color: "#9a97ab", minHeight: 28 }}>
            <span>Vorschau: <b style={{ color: "#26c6e6" }}>{ed.name}</b> — {ed.desc}</span>
          </div>
          <div className="flex gap-1.5 justify-center my-2">
            {list.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
          </div>

          {/* Aktions-Zone (feste Mindesthöhe): Challenge-Freischaltung ODER „Alles kaufen" ODER leer */}
          <div style={{ minHeight: 64 }} className="mb-2.5">
            {isChallenge ? (
              <div className="flex gap-2.5 items-start rounded-xl px-3 py-2.5 h-full" style={{ background: "#1a1622", border: "1px dashed #4a3a5a" }}>
                <span className="shrink-0 mt-0.5 rounded" style={{ width: 12, height: 12, background: "#ff4dcb", boxShadow: "0 0 6px #ff4dcb" }} />
                <span className="text-[11.5px] leading-relaxed" style={{ color: "#cdbce4" }}>
                  <b style={{ color: "#ff4dcb" }}>Challenge-Freischaltung</b> — schaltet das ganze Theme <b>auf einmal</b> frei.<br />
                  <span className="font-extrabold" style={{ color: "#fff" }}>{shared.label}</span>
                  {shared.target > 1 && <span className="opacity-70"> · Fortschritt {shared.cur} / {shared.target}</span>}
                </span>
              </div>
            ) : info.remainingCount > 0 ? (
              <button onClick={onBuyAll} disabled={spBal < info.cost}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5 transition-opacity"
                style={{ background: spBal < info.cost ? "#3a2f12" : "linear-gradient(90deg,#f2c14a,#ffb84d)", color: "#141419",
                  boxShadow: spBal < info.cost ? undefined : "0 0 16px rgba(242,193,74,.3)", opacity: spBal < info.cost ? 0.6 : 1, cursor: spBal < info.cost ? "not-allowed" : "pointer" }}>
                Alles kaufen · {info.cost} SP{info.ownedCount > 0 && <small className="font-semibold opacity-75"> ({info.ownedCount} schon im Besitz)</small>}
              </button>
            ) : (
              <div className="grid place-items-center h-full text-[11px]" style={{ color: "#6d6a80" }}>Alle Elemente im Besitz</div>
            )}
          </div>

          {/* Element-Liste (auf maxEls aufgefüllt → stabile Höhe) */}
          <div className="text-[10px] font-extrabold tracking-[0.12em] uppercase mb-1.5" style={{ color: "#9a97ab" }}>
            {isChallenge ? "Enthaltene Elemente" : info.remainingCount === 0 ? "Elemente" : "Elemente — einzeln kaufbar · je 1 SP"}
          </div>
          <div className="flex flex-col gap-1.5">
            {theme.els.map((el) => {
              const def = ELEMENT_BY_KEY[el];
              const st = elementState(p, theme, el);
              const price = elementPrice(theme, el);
              const selected = el === sel;
              return (
                <button key={el} type="button" onClick={() => setSel(el)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors min-h-[40px]"
                  style={{ background: selected ? "#1c1830" : "#141320", border: `1px solid ${selected ? "#9b82f0" : "#2a2836"}` }}>
                  <span className="shrink-0 rounded-md" style={{ width: 22, height: 22, background: `${theme.a1}22`, border: `1px solid ${theme.a1}66` }} />
                  <span className="flex-1 text-[12px] font-bold truncate">{def.name}</span>
                  {st === "own" ? (
                    <OwnedAction el={el} theme={theme} deckId={deckId} bfId={bfId} options={options} onChoose={onChoose} />
                  ) : st === "lock" ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
                      {isChallenge ? "im Paket" : elementUnlock(p, theme, el).label}
                    </span>
                  ) : (
                    <button type="button" disabled={!canBuyElement(p, theme, el)} onClick={(e) => { e.stopPropagation(); onBuy(el); }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-opacity"
                      style={{ background: canBuyElement(p, theme, el) ? "#f2c14a" : "#3a2f12", color: "#141419", opacity: canBuyElement(p, theme, el) ? 1 : 0.6, cursor: canBuyElement(p, theme, el) ? "pointer" : "not-allowed" }}>
                      Kaufen · {price}
                    </button>
                  )}
                </button>
              );
            })}
            {Array.from({ length: Math.max(0, maxEls - theme.els.length) }).map((_, i) => (
              <div key={`sp${i}`} className="min-h-[40px] rounded-xl" aria-hidden="true" style={{ border: "1px solid transparent" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
