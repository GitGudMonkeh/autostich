import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES,
  packState, packPrice, packUnlock, canBuyPack, buyPack, hasBattlefield,
  GLOBAL_FX, GLOBAL_FX_COST, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { startPrunk } from "./prunkFx.js";
import { SliceFx, ExplosionFx, BlackholeFieldFx, LaserGridFx, BurnBeamFx, BurnBeamPersist, OverloadFx, DisperseFx } from "./Battlefield.jsx";
import { Card } from "./Card.jsx";
import { suitColor } from "../game/constants.js";
import { audio } from "./audio.js"; // #302b: Showcase-Panel spielt den passenden Finisher-Sound mit
import { useBlackholeSfx } from "./finisherSfx.js"; // #298: Loch-Ton-Bett mit Hüllkurve (leiser Start → Anschwellen → schneller Kollaps), identisch zu In-Game

// Standard-Backdrop für alle Effekt-/Finisher-Showcases: das Genesis-Battlefield (bf_onboarding), einheitlich neutral.
const SHOWCASE_BF = "bf_onboarding";

/* #deckshop — DECK-WERKSTATT (schlankes Modell): zwei Kategorien.
   • PACKS   = Karte (Front + Back) + Battlefield als EIN Kauf. Tap → Detail-Ansicht mit Vorschau
     (Karte vorne / Karte hinten / Hintergrund umschaltbar, ‹ ›/Swipe zwischen Packs). Kaufen aktiviert das
     Pack direkt (setzt deckId UND battlefieldId zusammen).
   • EFFEKTE = alle globalen Effekte, einzeln kaufbar (Karten-Animationen · Sieg-Finisher · Krit · Gottgleich-
     Prunk). Nicht-gekauft → „Vorschau · Preis"-Zeile öffnet ein Kauffenster mit echter In-Game-Vorschau;
     gekauft wird nur dort. In der Übersicht danach togglen (bzw. Finisher auswählen).
   Kauf spendet SP (onProfileChange); Aktiv-Wahl/Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Echtes Seitenverhältnis der Deck-Bilder (1066×1476) → object-contain zeigt die Karte vollständig
// (kein Anschnitt oben/unten), der bemalte Neon-Rahmen bleibt intakt und der Frame-Glow sitzt bündig.
const CARD_RATIO = "1066 / 1476";
// Demo-Farbe der Effekt-Vorschauen (in-game = Deck-/Suit-Farbe).
const DEMO_C = "#35e0ff";

// „Standard"-Pack (UI-seitig): aktiviert wieder das Grund-Deck/-Battlefield. kind:"std" → immer im Besitz.
const STD_PACK = { id: "default", name: "Standard", kind: "std", a1: "#8a7de0", deckId: "default", bfId: "default", els: ["deck", "bf"] };
const PACK_LIST = [STD_PACK, ...THEMES];

/* Synthetische „Klinge"-Kachel: der Standard-Sieg-Finisher — immer im Besitz (kein Kauf), aber wählbar UND
   vorschaubar wie die anderen Finisher. Wird der Sieg-Finisher-Gruppe vorangestellt (analog „Gottgleich · Standard"). */
const KLINGE = { key: "klinge", name: "Klinge", group: "finisher", preview: "klinge", alwaysOwned: true,
  desc: "Gegnerkarte wird beim Sieg zerschnitten — der Standard-Finisher (immer verfügbar)." };

/* Synthetische „Gottgleich · Standard"-Kachel (kein Kauf, immer aktiv) — nur zum Vergleichen des Gottgleich-
   Siegs OHNE Prunk. Wird in der Gottgleich-Gruppe als reine Vorschau-Zeile geführt. */
const GOTT_STANDARD = { key: "gottStandard", name: "Gottgleich · Standard", group: "gott", standard: true, preview: "gottStandard",
  desc: "So sieht ein Gottgleicher Sieg OHNE gekaufte Prunk-Effekte aus — die Basis zum Vergleichen (immer aktiv)." };

// Effekt-Gruppen des „Effekte"-Tabs. mode: "toggle" (frei kombinierbar) | "finisher" (Einfachauswahl, exklusiv,
// inkl. „Klinge" als Default). Grid-Tunnel wurde entfernt → keine Ambience-Gruppe mehr.
const FX_GROUPS = [
  { key: "anim",     title: "Karten-Animationen", hint: "einmal kaufen · für alle Packs", mode: "toggle" },
  { key: "finisher", title: "Sieg-Finisher",      hint: "nur einer aktiv",                mode: "finisher" },
  { key: "crit",     title: "Krit-Treffer",       hint: "frei kombinierbar",              mode: "toggle" },
  { key: "gott",     title: "Gottgleich-Prunk",   hint: "frei kombinierbar",              mode: "toggle" },
];
// Items einer Gruppe (in Detail-Reihenfolge): GLOBAL_FX der Gruppe; die Gottgleich-Gruppe führt „Standard" voran.
const fxGroupItems = (group) => {
  const list = GLOBAL_FX.filter((f) => f.group === group);
  if (group === "gott") return [GOTT_STANDARD, ...list];
  if (group === "finisher") return [KLINGE, ...list]; // „Klinge" (Default) voran
  return list;
};

/* Sieg-Finisher sind untereinander exklusiv (genau EINER aktiv). Zentrale Wahrheit für Auswahl UND Anzeige,
   damit In-Übersicht (Radio) und Detail-Fenster nie auseinanderlaufen. „klinge" = alle Flags aus. */
const finisherFlags = (key) => ({ fxLaserSlice: key === "laserSlice", fxBlackhole: key === "blackhole",
  fxLasergrid: key === "lasergrid", fxBurnBeam: key === "burnBeam", fxOverload: key === "overload", fxDisperse: key === "disperse" });
const finisherSelOf = (options) => options?.fxBlackhole ? "blackhole" : options?.fxLasergrid ? "lasergrid"
  : options?.fxBurnBeam ? "burnBeam" : options?.fxOverload ? "overload" : options?.fxDisperse ? "disperse"
  : options?.fxLaserSlice ? "laserSlice" : "klinge";

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

// Einmalig injizierte Keyframes für die Vorschauen (Frame Glow / Holo Swipe / Hologrid + Gottgleich-Event-Loop).
const FX_CSS = `
@keyframes ws-frameglow{0%,100%{box-shadow:0 0 10px -2px var(--a1),inset 0 0 14px -8px var(--a1)}50%{box-shadow:0 0 26px 2px var(--a1),inset 0 0 22px -4px var(--a1)}}
@keyframes ws-swipe{0%{transform:translateX(-120%) rotate(18deg)}55%,100%{transform:translateX(320%) rotate(18deg)}}
@keyframes ws-sweep{0%{bottom:-4%;opacity:0}18%{opacity:1}70%{opacity:1}100%{bottom:106%;opacity:0}}
.ws-sweep{animation:ws-sweep 2.9s ease-in-out infinite}
/* #294 Feuerwerk: radiale Partikel aus einem Zündpunkt. --dx/--dy = Flugvektor. */
@keyframes ws-fw{0%{transform:translate(0,0) scale(.6);opacity:0}8%{opacity:1}70%{opacity:.85}100%{transform:translate(var(--dx),calc(var(--dy) + 14px)) scale(1);opacity:0}}
.ws-fw{animation:ws-fw 1.7s ease-out infinite}
/* #294 Weißgold-Regen: Funken fallen von oben. */
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

// #294 Demo-Daten der leichten CSS-Prunk-Partikel (deterministisch, kein Math.random im Render).
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

// Overlay-Partikel eines Gottgleich-Prunk-Effekts (leichte CSS-Variante, für kompakte Vorschauen).
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
   solange das Fenster offen ist). */
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
  const bf = battlefieldAssets(SHOWCASE_BF);
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

/* Karten-Finisher-Vorschau: die ECHTEN In-Game-Komponenten (SliceFx/ExplosionFx) an einer Demo-Karte
   im Loop — Vorschau = In-Game (keine separate Engine, kein Drift). */
const DEMO_SUIT = "B"; // blau — Effektfarbe = suitColor (wie in-game die Gegner-Suit-Farbe)
const FIN_DELAY = 460, FIN_HALVES = 950, FIN_CUT = 130, FIN_SPARK = 950, FIN_LINE = 220;
// #302b Showcase-Sound je One-Shot-Finisher (persistente Loop-Effekte Burn/Blackhole laufen separat als Loop-Bett).
const FIN_SFX = { klinge: "fx_blade", laser: "fx_laser", lasergrid: "fx_laser", overload: "fx_lightning", disperse: "fx_atomize" }; // shatter: (kein eigener SFX)
function FinisherScene({ variant }) {
  const [tick, setTick] = useState(0);
  const bf = battlefieldAssets(SHOWCASE_BF);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400); // Loop: Karte erscheint → wird zerstört → Pause
    return () => clearInterval(id);
  }, []);
  // Sound synchron zum Einschlag (≈ FIN_DELAY nach jedem Remount) mitspielen; respektiert Mute/Volume via audio-System.
  useEffect(() => {
    const sfx = FIN_SFX[variant];
    if (!sfx) return undefined;
    const id = setTimeout(() => {
      audio.play(sfx, { gain: variant === "klinge" ? 1.0 : 1.05 });
      // #300: Überladung/Zerstäubung bekommen — wie in-game — den tiefen Impact-Layer (fx_bass) dazu.
      if (variant === "overload") audio.play("fx_bass", { gain: 0.5, bass: 3 });
      else if (variant === "disperse") audio.play("fx_bass", { rate: 1.1, gain: 0.32, bass: 2 });
    }, FIN_DELAY);
    return () => clearTimeout(id);
  }, [tick, variant]);
  const suitCol = suitColor(DEMO_SUIT);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  const seed = tick * 3 + 1;
  const dTier = (tick % 4) + 1; // #300 Vorschau durchläuft die Wertdifferenz-Stufen 1→4 (zeigt die Intensitäts-Eskalation)
  let fx = null;
  if (variant === "laser") fx = <SliceFx cardEl={cardEl} color={suitCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} tier={2} scale={1} laser />;
  else if (variant === "shatter") fx = <ExplosionFx cardEl={cardEl} color="#e879f9" cardDur={FIN_HALVES} burstDur={FIN_SPARK} flashDur={200} seed={seed} delay={FIN_DELAY} intensity={0.6} tier={3} scale={1} />;
  else if (variant === "lasergrid") fx = <LaserGridFx cardEl={cardEl} color={suitCol} diceDur={FIN_HALVES} lineDur={FIN_LINE} seed={seed} delay={FIN_DELAY} intensity={0.5} tier={1} scale={1} />;
  else if (variant === "overload") fx = <OverloadFx cardEl={cardEl} color={suitCol} flipMs={1200} seed={seed} delay={FIN_DELAY} tier={dTier} scale={1} />;
  else if (variant === "disperse") fx = <DisperseFx cardEl={cardEl} color={suitCol} flipMs={1200} seed={seed} delay={FIN_DELAY} tier={dTier} scale={1} />;
  else fx = <SliceFx cardEl={cardEl} color={suitCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} tier={2} scale={1} />; // klinge (Default)
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

/* #295 Brennstrahl-Vorschau: der PERSISTENTE Strahl (BurnBeamPersist) über einem synthetischen Serien-Loop — der Laser
   fährt beim ersten „Sieg" herab, bleibt über die Serie lit und wird intensiver, je Sieg ein Einschlag-Burst (BurnBeamFx:
   Loch/Funken/Verblassen); die „Niederlage" zieht den Strahl zurück. Zeigt das persistente Verhalten wie das Schwarze Loch. */
function BurnBeamPreview() {
  const panelRef = useRef(null), oppRef = useRef(null);
  const [pulse, setPulse] = useState(null);
  const [bursts, setBursts] = useState([]);
  const [dormant, setDormant] = useState(true);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const suitCol = suitColor(DEMO_SUIT);
  const seqRef = useRef(0);
  const burnLoopRef = useRef(null);
  useEffect(() => {
    // 1..7 Siege (Strahl lit, Intensität + Funkendichte steigen) · 8 Niederlage (Strahl zieht sich zurück) · 9/10 Pause.
    let c = 0;
    const id = setInterval(() => {
      c = (c + 1) % 11;
      if (c >= 1 && c <= 7) {
        const streak = c * 1.8;
        setDormant(false);
        setPulse({ id: ++seqRef.current, kind: "win", streak });
        const bid = seqRef.current;
        setBursts((b) => [...b, { id: bid, streak }].slice(-2));
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== bid)), 1000);
      } else if (c === 8) { setPulse({ id: ++seqRef.current, kind: "loss" }); setDormant(true); }
    }, 780);
    return () => clearInterval(id);
  }, []);
  // #302b/#307: Brennstrahl-Loop-Bett an die Lit-Phase (Sieg-Puls) koppeln — IDENTISCH zu In-Game (Battlefield.jsx):
  // der Ton startet erst mit dem herabfahrenden Strahl (erster Sieg), nicht schon beim Öffnen der Vorschau, und stoppt
  // beim Serienabbruch. So läuft kein Laser-Sound, bevor der Laser sichtbar ist.
  useEffect(() => {
    const lit = pulse && pulse.kind === "win";
    if (lit) {
      if (!burnLoopRef.current) burnLoopRef.current = audio.loop("fx_burnbeam", { gain: 0.5, bass: 3, loopStart: 0.1, loopEnd: 0.8 });
    } else if (burnLoopRef.current) {
      audio.stopLoop(burnLoopRef.current); burnLoopRef.current = null;
    }
  }, [pulse]);
  useEffect(() => () => { if (burnLoopRef.current) { audio.stopLoop(burnLoopRef.current, { fade: 0.1 }); burnLoopRef.current = null; } }, []);
  const demoCard = () => <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16", isolation: "isolate" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Gegner-Demokarte etwas unterhalb der Mitte (Strahl hat Platz, von der Stage-Oberkante herabzufahren). */}
      <div ref={oppRef} className="absolute" style={{ left: "50%", top: "58%", width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
        <div className="absolute inset-0" style={{ opacity: dormant ? 1 : 0, transition: "opacity 160ms" }}>{demoCard()}</div>
      </div>
      {/* Einschlag-Burst je Sieg (Loch/Funken/Verblassen) an der Kartenposition. */}
      {bursts.map((bt) => (
        <div key={bt.id} className="absolute" style={{ left: "50%", top: "58%", width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
          <BurnBeamFx cardEl={demoCard()} color={suitCol} flipMs={1500} seed={bt.id * 3 + 1} delay={40} intensity={0.5} scale={1} streak={bt.streak} />
        </div>
      ))}
      <BurnBeamPersist active pulse={pulse} color={suitCol} scale={1} panelRef={panelRef} oppRef={oppRef} reduced={false} />
    </div>
  );
}

/* #296 Schwarzes-Loch-Vorschau: die ECHTE In-Game-Komponente (BlackholeFieldFx) mit einem SYNTHETISCHEN Serien-Loop
   (mehrere „Siege" hintereinander → Loch wächst + saugt Karten ein, dann Serienabbruch → Kollaps, danach Reset).
   Vorschau = In-Game (dieselbe Komponente, kein Drift). */
function BlackholePreview() {
  const panelRef = useRef(null), oppRef = useRef(null);
  const [pulse, setPulse] = useState(null);
  const [dormant, setDormant] = useState(true);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const suitCol = suitColor(DEMO_SUIT);
  useEffect(() => {
    // Synthetischer Serien-Loop: 1..8 Siege (Loch wächst + saugt Karten ein; der Serien-Mult klettert ÜBER ×2.0 →
    // ab dann Zittern + Rand-Farbpuls sichtbar) · 9 Niederlage = Serienabbruch → Kollaps (Flash + Schockwelle) ·
    // 10 dormant · 11/12 Pause. Genau das In-Game-Serien-Verhalten (dieselbe Komponente, kein Drift).
    let c = 0, seq = 0;
    const id = setInterval(() => {
      c = (c + 1) % 12;
      if (c >= 1 && c <= 8) { setDormant(false); setPulse({ id: ++seq, kind: "win", num: 2 + ((c * 3) % 9), col: suitCol, mult: 1 + c * 0.35 }); }
      else if (c === 9) setPulse({ id: ++seq, kind: "loss" }); // Serienabbruch → Kollaps
      else if (c === 10) setDormant(true);
    }, 600);
    return () => clearInterval(id);
  }, [suitCol]);
  // #298: Loch-Ton-Bett mit Hüllkurve, an denselben synthetischen Puls gekoppelt wie das Visual — leiser Start,
  // Anschwellen über die Serie, schneller Kollaps. Identisch zu In-Game (geteilter Hook, kein Drift). Ersetzt das
  // frühere #302b-Festpegel-Bett fürs Schwarze Loch (Burn/One-Shots bleiben unverändert).
  useBlackholeSfx(true, pulse);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16", isolation: "isolate" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Ursprung des Sogs = Gegner-Demokarte (rechts der Mitte). Während der Serie „verschwindet" sie ins Loch
          (der Flyer im Canvas zeigt den Sog); in der Pause liegt sie wieder ruhig da. */}
      <div ref={oppRef} className="absolute" style={{ left: "68%", top: "50%", width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
        <div className="absolute inset-0" style={{ opacity: dormant ? 1 : 0, transition: "opacity 120ms" }}>
          <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />
        </div>
      </div>
      <BlackholeFieldFx active pulse={pulse} color={suitCol} scale={1} panelRef={panelRef} oppRef={oppRef} reduced={false} />
    </div>
  );
}

// Große In-Game-Vorschau eines Effekts im Kauffenster. Karten-Animationen → Karte/BF-Demo; Finisher/Krit →
// echte In-Game-Komponente; Gottgleich (inkl. Standard) → das komplette Ereignis nachgespielt.
function GlobalFxScenePreview({ fx }) {
  if (fx.preview === "frameGlow" || fx.preview === "holoSwipe") {
    return (
      <div className="w-full h-full grid place-items-center overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
        <CardPreview deckId="default" a1={DEMO_C} fx={fx.preview} className="max-h-full" style={{ height: "94%" }} />
      </div>
    );
  }
  if (fx.preview === "hologrid") return <BfPreview bfId={SHOWCASE_BF} a1={DEMO_C} fx="hologrid" className="w-full h-full" />;
  if (["fireworks", "goldRain", "prismaWave"].includes(fx.preview)) return <GottgleichPreview variant={fx.preview} />;
  if (fx.preview === "gottStandard") return <GottgleichPreview variant="standard" />;
  if (fx.preview === "blackhole") return <BlackholePreview />;
  if (fx.preview === "burnbeam") return <BurnBeamPreview />;
  if (["laser", "shatter", "klinge", "lasergrid", "overload", "disperse"].includes(fx.preview)) return <FinisherScene variant={fx.preview} />;
  // Fallback (kein bekannter Vorschautyp): schlichte Battlefield-Szene.
  const bf = battlefieldAssets(SHOWCASE_BF);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
    </div>
  );
}

// Karten-Vorschau: illustrierte Karte (Front = Rahmen, Back = Cover), vollständig (object-contain) + optionaler
// Effekt. Frame Glow = pulsierender Schein am Kartenrand; Holo Swipe = wandernder Glanz-Streifen.
function CardPreview({ deckId, a1, fx, face = "back", className = "", style }) {
  const img = deckAssets(deckId)[face] || deckAssets(deckId).back;
  const glow = fx === "frameGlow";
  return (
    <div className={`relative rounded-lg ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", "--a1": a1, animation: glow ? "ws-frameglow 2s ease-in-out infinite" : undefined, ...style }}>
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

// Kleine Deck-Rücken-Miniatur (für Pack-Kacheln). object-contain → nie angeschnitten.
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  return <img src={img} alt="" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

// Radio-Punkt (Einfachauswahl).
function Radio({ on }) {
  return (
    <span className="relative shrink-0 rounded-full" style={{ width: 20, height: 20, border: `2px solid ${on ? "#54e08a" : "#44424f"}` }}>
      {on && <span className="absolute rounded-full" style={{ inset: 3, background: "#54e08a" }} />}
    </span>
  );
}

// Umschalter (Effekt an/aus).
function Switch({ on }) {
  return (
    <span className="relative shrink-0 rounded-full transition-colors" style={{ width: 42, height: 23, background: on ? "#54e08a" : "#33323f" }}>
      <span className="absolute rounded-full transition-all" style={{ top: 2, left: on ? 21 : 2, width: 19, height: 19, background: "#f2f2f6" }} />
    </span>
  );
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

/* ============================ Haupt-Screen ============================ */
export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  const p = profile || {};
  const [tab, setTab] = useState("packs");           // "packs" | "fx"
  const [packIdx, setPackIdx] = useState(-1);        // offene Pack-Detailansicht (-1 = zu)
  const [packSel, setPackSel] = useState("front");   // "front" | "back" | "bg"
  const [fxOv, setFxOv] = useState(null);            // offenes Effekt-Kauffenster: { group, idx } | null
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const dpBal = Math.max(0, Math.floor(Number(p.deckPoints) || 0)); // #299 Deckpunkte — Währung der Packs

  const deckId = options?.deckId || "default";

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };
  const activate = (pack) => onChoose(hasBattlefield(pack) ? { deckId: pack.deckId, battlefieldId: pack.bfId } : { deckId: pack.deckId });

  const openPack = (i) => { setPackIdx(i); setPackSel("front"); };
  const stepPack = (d) => { setPackIdx((i) => (i + d + PACK_LIST.length) % PACK_LIST.length); setPackSel("front"); };
  const stepFx = (d) => setFxOv((o) => { if (!o) return o; const list = fxGroupItems(o.group); return { ...o, idx: (o.idx + d + list.length) % list.length }; });

  // Ist ein Kauffenster offen, wird der Shop-Hintergrund NICHT mitgescrollt (kein Scroll-Durchgriff auf iOS).
  const anyOverlay = packIdx >= 0 || !!fxOv;

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
              {/* DP = Pack-Währung (#299), SP = Effekt-Währung. */}
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #4a3f6e", color: "#b9a9f2" }}>{dpBal} DP</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Tab-Umschalter: Packs · Effekte */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["packs", "Packs"], ["fx", "Effekte"]].map(([m, label]) => (
              <button key={m} onClick={() => setTab(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-extrabold transition-colors"
                style={{ background: tab === m ? "#9b82f0" : "transparent", color: tab === m ? "#141419" : "#9a97ab" }}>{label}</button>
            ))}
          </div>
        </div>

        {tab === "packs"
          ? <PacksView p={p} deckId={deckId} onOpen={openPack} />
          : <FxView p={p} options={options} onChoose={onChoose} onOpenFx={(group, idx) => setFxOv({ group, idx })} />}
      </div>

      {/* Kauffenster via Portal an document.body: der Shop-Root trägt backdrop-filter und ist damit der
          Containing-Block für `position:fixed` — das Portal löst das Overlay heraus → echtes Vollbild-Overlay. */}
      {packIdx >= 0 && createPortal(
        <PackDetail pack={PACK_LIST[packIdx]} idx={packIdx} count={PACK_LIST.length} p={p} dpBal={dpBal}
          deckId={deckId} sel={packSel} setSel={setPackSel} onStep={stepPack} onClose={() => setPackIdx(-1)}
          onActivate={activate} onBuy={(pack) => { buy((pf) => buyPack(pf, pack)); activate(pack); }} />,
        document.body)}

      {fxOv && createPortal(
        <FxDetail group={fxOv.group} idx={fxOv.idx} p={p} spBal={spBal} options={options}
          onChoose={onChoose} onStep={stepFx} onClose={() => setFxOv(null)}
          onBuy={(fx) => buy((pf) => buyGlobalFx(pf, fx))} />,
        document.body)}
    </div>
  );
}

/* ============================ Packs-Tab ============================ */
function PacksView({ p, deckId, onOpen }) {
  const [filter, setFilter] = useState("alle"); // alle | besitz | kaufbar
  const chips = [["alle", "Alle"], ["besitz", "Besitz"], ["kaufbar", "Kaufbar"]];
  const stateOf = (pack) => (pack.kind === "std" ? "own" : packState(p, pack));
  // #299 Reihenfolge: Standard (Prisma) Pos 1, aktives Pack Pos 2, Rest danach (stabil).
  const rank = (pack) => (pack.kind === "std" ? 0 : deckId === pack.deckId ? 1 : 2);
  const list = PACK_LIST.filter((pack) => {
    if (filter === "besitz") return stateOf(pack) === "own";
    if (filter === "kaufbar") return stateOf(pack) === "buy";
    return true;
  }).slice().sort((a, b) => rank(a) - rank(b));

  return (
    <>
      <div className="flex gap-1.5 mt-3 flex-wrap">
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors"
            style={{ background: filter === k ? "#26c6e6" : "#14131c", color: filter === k ? "#08181c" : "#9a97ab", border: `1px solid ${filter === k ? "#26c6e6" : "#2a2836"}` }}>{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {list.map((pack) => {
          const gi = PACK_LIST.indexOf(pack);
          const s = stateOf(pack);
          const active = deckId === pack.deckId;
          const locked = s === "lock";
          const badge = active ? ["AKTIV", "#123a25", "#54e08a", "#2f7a4f"]
            : s === "buy" ? [`${packPrice(pack)} DP`, "#211f2e", "#b9a9f2", "#4a3f6e"]
            : s === "lock" ? ["🔒", "#1c1b24", "#9a97ab", "#2e2d38"]
            : null;
          const sub = active ? ["aktiv", "#54e08a"]
            : s === "own" ? ["tippen → Details", "#9a97ab"]
            : s === "buy" ? ["kaufbar", "#f2c14a"]
            : [packUnlock(p, pack).label, "#6d6a80"];
          return (
            <button key={pack.id} type="button" onClick={() => onOpen(gi)}
              className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
              style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}`, boxShadow: active ? "0 0 0 1px #54e08a55, 0 0 16px #54e08a22" : undefined }}>
              <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                <DeckThumb deckId={pack.deckId} className="absolute inset-0 w-full h-full" style={{ filter: locked ? "grayscale(.7) brightness(.5)" : undefined }} />
                {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
              </div>
              <div className="px-2 py-1.5">
                <span className="text-[12px] font-extrabold truncate block">{pack.name}</span>
                <span className="text-[10px] truncate block" style={{ color: sub[1] }}>{sub[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Ein <b>Pack</b> bündelt Karte (Front + Back) und Battlefield. Tippe ein Pack an → Detail-Ansicht mit Vorschau; <b>Kaufen aktiviert das Pack direkt</b>.
      </p>
    </>
  );
}

/* Pack-Detailansicht (Portal): Vorschau (Karte vorne/hinten/Hintergrund), ‹ ›/Swipe zwischen Packs, Kaufen/Aktivieren. */
function PackDetail({ pack, idx, count, p, dpBal, deckId, sel, setSel, onStep, onClose, onActivate, onBuy }) {
  const touch = useRef(0);
  const hasBf = hasBattlefield(pack);
  const segs = hasBf ? [["front", "Karte vorne"], ["back", "Karte hinten"], ["bg", "Hintergrund"]]
                     : [["front", "Karte vorne"], ["back", "Karte hinten"]];
  const activeSel = (sel === "bg" && !hasBf) ? "front" : sel;

  const s = pack.kind === "std" ? "own" : packState(p, pack);
  const active = deckId === pack.deckId;
  const price = packPrice(pack);
  const canBuy = pack.kind === "buy" && canBuyPack(p, pack);
  const unlock = pack.kind === "cond" ? packUnlock(p, pack) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{pack.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          {/* Großes Preview mit ‹ › — feste Höhe (Karte↔BF springt nicht) */}
          <div className="flex items-center gap-2" style={{ height: 252 }}>
            <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
            <div className="flex-1 min-w-0 h-full flex items-center justify-center">
              {activeSel === "bg"
                ? <BfPreview bfId={pack.bfId} a1={pack.a1} className="w-full" showVersion />
                : <CardPreview deckId={pack.deckId} a1={pack.a1} face={activeSel} className="h-[248px] max-h-[46vh]" />}
            </div>
            <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
          </div>

          {/* Umschalter Karte vorne / hinten / Hintergrund */}
          <div className="flex gap-1.5 justify-center mt-2.5">
            {segs.map(([k, label]) => (
              <button key={k} onClick={() => setSel(k)} className="flex-1 max-w-[120px] py-1.5 rounded-lg text-[11px] font-extrabold transition-colors"
                style={{ background: activeSel === k ? "#211f2e" : "#14131c", border: `1px solid ${activeSel === k ? "#9b82f0" : "#2a2836"}`, color: activeSel === k ? "#e8e6ff" : "#9a97ab" }}>{label}</button>
            ))}
          </div>

          <div className="flex gap-1.5 justify-center my-2.5">
            {Array.from({ length: count }).map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
          </div>

          {/* Aktion */}
          {active ? (
            <div className="w-full rounded-xl font-extrabold text-[13px] py-3 text-center" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>Aktiv ✓</div>
          ) : s === "own" ? (
            <button onClick={() => { onActivate(pack); onClose(); }} className="w-full rounded-xl font-extrabold text-[13px] py-3"
              style={{ background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" }}>Aktivieren</button>
          ) : s === "buy" ? (
            <button onClick={() => { if (canBuy) { onBuy(pack); onClose(); } }} disabled={!canBuy}
              className="w-full rounded-xl font-extrabold text-[13px] py-3 transition-opacity"
              style={{ background: canBuy ? "#d4a63a" : "#3a2f12", color: "#141419",
                boxShadow: canBuy ? "0 0 16px rgba(212,166,58,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
              Kaufen · {price} DP{!canBuy && dpBal < price ? " (zu wenig DP)" : ""}
            </button>
          ) : (
            <div className="w-full rounded-xl font-extrabold text-[12px] py-3 text-center leading-snug" style={{ background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
              🔒 Freischalten: {unlock.label}
              {unlock.target > 1 && <span className="opacity-70"> · {unlock.cur} / {unlock.target}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Effekte-Tab ============================ */
function FxView({ p, options, onChoose, onOpenFx }) {
  // Aktueller Finisher (exklusiv): Blackhole > Lasergitter > Brennstrahl > Laser-Schnitt > Klinge (Default).
  const finisherSel = finisherSelOf(options);
  const selectFinisher = (key) => onChoose(finisherFlags(key));

  return (
    <>
      {FX_GROUPS.map((g) => {
        const items = fxGroupItems(g.key);
        return (
          <div key={g.key} className="mb-2">
            <div className={EYEBROW} style={{ color: "#9a97ab" }}>
              {g.title}
              <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
              <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{g.hint}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((fx, i) => {
                const owned = fx.standard || fx.alwaysOwned || globalFxOwned(p, fx);
                const open = () => onOpenFx(g.key, i);
                let control;
                if (fx.standard) {
                  // Gottgleich · Standard: reine Vorschau-Zeile (kein Kauf/Toggle).
                  control = <PreviewPill label="Vorschau ›" onClick={open} />;
                } else if (!owned) {
                  // Noch nicht gekauft → Preis-Pill öffnet das Kauffenster (mit Vorschau).
                  control = <PreviewPill label={`Vorschau · ${GLOBAL_FX_COST} SP ›`} buy onClick={open} />;
                } else if (g.mode === "finisher") {
                  // Exklusiv-Auswahl (Radio) — eigenes Tap-Ziel, öffnet NICHT die Vorschau.
                  control = <ControlBtn label="Als Finisher wählen" onClick={() => selectFinisher(fx.key)}><Radio on={finisherSel === fx.key} /></ControlBtn>;
                } else {
                  // Kombinierbar (Toggle) — eigenes Tap-Ziel.
                  const on = !!options?.[fx.option];
                  control = <ControlBtn label="An/Aus" onClick={() => onChoose({ [fx.option]: !on })}><Switch on={on} /></ControlBtn>;
                }
                return <FxRow key={fx.key} fx={fx} owned={owned} control={control} onOpen={open} />;
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] mt-3 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Effekte sind <b>global</b> — einmal gekauft, für alle Packs. Noch nicht gekauft? Tippe die Zeile für <b>Vorschau &amp; Kauf</b>; danach hier an/aus (Finisher: auswählen).
      </p>
    </>
  );
}

/* Effekt-Zeile (#297): links läuft die Mini-Live-Vorschau (Effekt-Identität, kein Emoji-Icon), Text daneben.
   Der Zeilenkörper ist ein eigenes Tap-Ziel (= anschauen: Vorschau bzw. Kauffenster); der Schalter/Radio/Preis
   rechts ist ein SEPARATES Element daneben (= schalten/auswählen bzw. Kauf) → klare Gesten-Trennung ohne
   verschachtelte Buttons. */
function FxRow({ fx, owned = false, control, onOpen }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "#14131c", border: "1px solid #2a2836" }}>
      <button type="button" onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left transition-colors">
        <MiniFx preview={fx.preview} />
        <span className="flex-1 min-w-0">
          <span className="block text-[12.5px] font-extrabold truncate">{fx.name}</span>
          <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{owned ? fx.desc : <><span style={{ color: "#f2c14a" }}>kaufbar</span> · {fx.desc}</>}</span>
        </span>
      </button>
      {control}
    </div>
  );
}

// Preis-/Vorschau-Pill (öffnet das Detail-/Kauffenster). buy=true → Kauf-Farbgebung (violett), sonst blau.
function PreviewPill({ label, buy = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap"
      style={buy ? { background: "#211f2e", color: "#b9a9f2", border: "1px solid #4a3f6e" } : { background: "#1c2433", color: "#7fb4ff", border: "1px solid #33507a" }}>
      {label}
    </button>
  );
}

// Schalt-Tap-Ziel für Switch/Radio (eigenes Element neben dem Zeilenkörper → öffnet nicht die Vorschau).
function ControlBtn({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="shrink-0 grid place-items-center rounded-lg" style={{ padding: 2 }}>
      {children}
    </button>
  );
}

/* Mini-Live-Vorschau (#297): kleiner, dauerhaft loopender Ableger der Effekt-Identität — ersetzt das frühere
   Emoji-Icon. GPU-günstig (nur transform/opacity/box-shadow/background-position, Klassen "as-mini-" und "as-deck-");
   ruht automatisch unter der globalen reduced-motion-Regel (index.css). Farbe = Demo-Deckfarbe (bzw. Effektfarbe). */
function MiniFx({ preview }) {
  const C = preview === "goldRain" ? "#f2c14a" : DEMO_C;
  const box = (inner) => (
    <span className="shrink-0 relative overflow-hidden grid place-items-center rounded-lg"
      style={{ width: 34, height: 34, border: "1px solid #2a2836", background: "#0b0a16", "--mc": C }}>
      {inner}
    </span>
  );
  const slash = (top, ang, col, delay) => (
    <span key={ang} className="as-mini-slash absolute" style={{ left: 0, top, width: "150%", marginLeft: "-25%", height: 2,
      background: `linear-gradient(90deg,transparent,${col},transparent)`, "--a": ang, animationDelay: delay }} />
  );
  const ring = (col, size, l, t, delay) => (
    <span key={`${col}${delay}`} className="as-mini-ring absolute" style={{ left: l, top: t, width: size, height: size,
      borderRadius: "50%", border: `1.5px solid ${col}`, animationDelay: delay }} />
  );
  switch (preview) {
    case "frameGlow":
    case "gottStandard":
      // Karten-Silhouette mit atmendem Rahmen-Glow (nutzt den vorhandenen Deck-Frameglow-Keyframe).
      return box(<span className="as-deck-frameglow" style={{ width: 15, height: 21, borderRadius: 3, background: "#141826", "--deck-a1": C }} />);
    case "holoSwipe":
      // Karte mit diagonal wanderndem Glanz (Deck-Swipe-Keyframe).
      return box(
        <span className="relative overflow-hidden" style={{ width: 15, height: 21, borderRadius: 3, background: "#141826", border: `1px solid ${C}55` }}>
          <span className="as-deck-swipe absolute" style={{ left: 0, top: "-20%", width: 5, height: "140%", background: `linear-gradient(90deg,transparent,${C},transparent)` }} />
        </span>
      );
    case "hologrid":
      // Perspektiv-Gitter + heller Puls, der nach hinten läuft.
      return box(
        <>
          <span className="as-mini-grid absolute inset-0" style={{ backgroundImage: `linear-gradient(${C}40 1px,transparent 1px),linear-gradient(90deg,${C}40 1px,transparent 1px)`, backgroundSize: "8px 8px" }} />
          <span className="as-mini-rise absolute" style={{ left: "8%", right: "8%", height: 2, background: C, boxShadow: `0 0 6px ${C}` }} />
        </>
      );
    case "klinge":
      return box(slash("50%", "-32deg", C, "0s"));
    case "laser":
      // Ein Laser aus wechselnder Richtung übers Feld.
      return box(slash("50%", "-28deg", C, "0s"));
    case "lasergrid":
      // Kartensilhouette mit pulsierendem Neon-Raster (3×3) — deutet das Dicing an.
      return box(<span className="as-mini-core absolute" style={{ inset: 6, borderRadius: 2, "--mc": C,
        backgroundImage: `linear-gradient(${C}66 1px,transparent 1px),linear-gradient(90deg,${C}66 1px,transparent 1px)`, backgroundSize: "7px 7px" }} />);
    case "burnbeam":
      // Strahl fährt herab + glühendes Ember-Loch in der Mitte.
      return box(
        <>
          <span className="as-mini-fall absolute" style={{ left: "50%", top: 0, width: 2, height: 15, marginLeft: -1, borderRadius: 2, background: "linear-gradient(#ffffff,#ff7a2f)", boxShadow: "0 0 5px #ff7a2f" }} />
          <span className="as-mini-core" style={{ width: 9, height: 9, borderRadius: "50%", background: "radial-gradient(circle,#05050a 45%,#ff7a2f 70%,transparent 82%)", "--mc": "#ff7a2f" }} />
        </>
      );
    case "blackhole":
      // Dunkle Scheibe mit atmendem Rand-Glow (kein nach außen laufender Puls) + zwei Orbs auf Umlaufbahn.
      return box(
        <span className="relative grid place-items-center" style={{ width: "100%", height: "100%" }}>
          <span className="as-mini-core absolute" style={{ left: "50%", top: "50%", width: 19, height: 19, borderRadius: "50%",
            background: "radial-gradient(circle,#04040a 55%,transparent 74%)", transform: "translate(-50%,-50%)", "--mc": C }} />
          <span className="as-mini-orbit absolute" style={{ left: "50%", top: "50%", width: 24, height: 24, marginLeft: -12, marginTop: -12 }}>
            <span className="absolute" style={{ left: "50%", top: 0, width: 3, height: 3, borderRadius: "50%", background: C, boxShadow: `0 0 5px ${C}`, transform: "translateX(-50%)" }} />
            <span className="absolute" style={{ left: "50%", bottom: 0, width: 2, height: 2, borderRadius: "50%", background: "#ffffff", transform: "translateX(-50%)" }} />
          </span>
        </span>
      );
    case "shatter":
      // Zerberstende Scherben: nach außen fliegender Ring + Kern-Blitz.
      return box(<>{ring("#e879f9", 20, "50%", "50%", "0s")}<span className="as-mini-core" style={{ width: 6, height: 6, borderRadius: "50%", background: "#e879f9", "--mc": "#e879f9" }} /></>);
    case "fireworks":
      return box(<>{ring(C, 16, "44%", "46%", "0s")}{ring("#f2c14a", 13, "60%", "58%", "-.8s")}</>);
    case "prismaWave":
      // Konzentrische Prisma-Ringe.
      return box(<>{ring("#26c6e6", 22, "50%", "50%", "0s")}{ring("#9b82f0", 22, "50%", "50%", "-.55s")}{ring("#f2a83a", 22, "50%", "50%", "-1.1s")}</>);
    case "goldRain":
      // Fallende Goldstreifen.
      return box(
        <>
          {[["20%", "0s"], ["44%", "-.5s"], ["66%", "-.9s"], ["84%", "-1.3s"]].map(([l, d]) => (
            <span key={l} className="as-mini-fall absolute" style={{ left: l, top: 0, width: 2, height: 11, borderRadius: 2, background: "linear-gradient(#f2c14a,transparent)", boxShadow: "0 0 4px #f2c14a", animationDelay: d }} />
          ))}
        </>
      );
    case "overload":
      // Gezackter Blitz fährt herab + heller Einschlag-Kern.
      return box(
        <>
          <span className="as-mini-fall absolute" style={{ left: "50%", top: 0, width: 5, height: 22, marginLeft: -2.5,
            background: `linear-gradient(#ffffff,${C})`, boxShadow: `0 0 6px ${C}`,
            clipPath: "polygon(42% 0,60% 0,46% 42%,68% 42%,34% 100%,50% 52%,30% 52%)" }} />
          <span className="as-mini-core" style={{ width: 8, height: 8, borderRadius: "50%", background: `radial-gradient(circle,#ffffff,${C} 60%,transparent)`, "--mc": C }} />
        </>
      );
    case "disperse":
      // Karte zerstäubt: Kern + auseinanderstiebende Partikel.
      return box(
        <>
          {ring(C, 20, "50%", "50%", "0s")}
          <span className="as-mini-core" style={{ width: 5, height: 5, borderRadius: "50%", background: C, "--mc": C }} />
          {[["30%", "30%", "0s"], ["66%", "38%", "-.4s"], ["42%", "66%", "-.8s"], ["62%", "62%", "-1.2s"]].map(([l, t, d]) => (
            <span key={l + t} className="as-mini-core absolute" style={{ left: l, top: t, width: 3, height: 3, borderRadius: "50%", background: "#ffffff", "--mc": C, animationDelay: d }} />
          ))}
        </>
      );
    default:
      return box(<span className="as-mini-core" style={{ width: 8, height: 8, borderRadius: "50%", background: C, "--mc": C }} />);
  }
}

/* Effekt-Kauffenster (Portal): echte In-Game-Vorschau + Kaufen (nur hier). ‹ ›/Swipe wechselt innerhalb der Gruppe. */
function FxDetail({ group, idx, p, spBal, options, onChoose, onStep, onClose, onBuy }) {
  const items = fxGroupItems(group);
  const fx = items[idx];
  const touch = useRef(0);
  const owned = fx.alwaysOwned || (!fx.standard && globalFxOwned(p, fx));
  const canBuy = !fx.standard && !fx.alwaysOwned && canBuyGlobalFx(p, fx);
  const isFinisher = group === "finisher";
  const finisherSel = finisherSelOf(options);
  const on = !fx.standard && !!options?.[fx.option];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (items.length > 1 && Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{fx.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 1 && <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>}
            <div className="flex-1 min-w-0 py-1">
              <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
                <GlobalFxScenePreview fx={fx} />
              </div>
            </div>
            {items.length > 1 && <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>}
          </div>

          {items.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-2">
              {items.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
            </div>
          )}

          <div className="text-center text-[11px] mt-2 leading-snug" style={{ color: "#9a97ab", minHeight: 32 }}>{fx.desc}</div>

          <div className="mt-2.5">
            {fx.standard ? (
              <div className="w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ background: "#1c2433", color: "#7fb4ff", border: "1px solid #33507a" }}>
                Standard — immer aktiv, kein Kauf nötig
              </div>
            ) : !owned ? (
              <button onClick={() => { if (canBuy) { onBuy(fx); onClose(); } }} disabled={!canBuy}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5 transition-opacity"
                style={{ background: canBuy ? "#d4a63a" : "#3a2f12", color: "#141419",
                  boxShadow: canBuy ? "0 0 16px rgba(212,166,58,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
                Kaufen · {GLOBAL_FX_COST} SP{!canBuy && spBal < GLOBAL_FX_COST ? " (zu wenig SP)" : ""}
              </button>
            ) : isFinisher ? (
              <button onClick={() => onChoose(finisherFlags(fx.key))}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5"
                style={finisherSel === fx.key
                  ? { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }
                  : { background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" }}>
                {finisherSel === fx.key ? "✓ Ausgewählt" : "Als Finisher wählen"}
              </button>
            ) : (
              <button onClick={() => onChoose({ [fx.option]: !on })}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5"
                style={on ? { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" } : { background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" }}>
                {on ? "✓ An — tippen zum Ausschalten" : "Einschalten"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
