import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES,
  packState, packPrice, packUnlock, canBuyPack, buyPack, hasBattlefield,
  GLOBAL_FX, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { startPrunk } from "./prunkFx.js";
import { SliceFx, BlackholeFieldFx, LaserGridFx, BurnBeamFx, BurnBeamPersist, OverloadFx, DisperseFx, FieldFxLayer } from "./Battlefield.jsx";
import { Card } from "./Card.jsx";
import { suitColor } from "../game/constants.js";
import { clamp } from "../game/deck.js"; // #: Serien-Kopplung des Brennstrahl-Loops (leiser Start → lauter/heißer)
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
// #307/#Shop-Reorg: eigene Kategorien. „Packs" = Standard + Kauf-Packs, nach DP-Preis aufsteigend (billig oben, teuer
// unten; Standard immer zuoberst). „Challenges" = die freischaltbaren cond-Packs (#303), eigene Kategorie ganz separat.
const PACKS_TAB = [STD_PACK, ...THEMES.filter((t) => t.kind === "buy").slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))];
const CHALLENGES_TAB = THEMES.filter((t) => t.kind === "cond");
// #: Aktives (gerade ausgerüstetes) Pack immer nach vorn — direkt hinter „Standard" (falls in der Liste), sonst ganz
// vorn (Challenges haben kein Standard). Reine Umsortierung; Preise/Reihenfolge der übrigen bleiben.
function orderPacks(list, deckId) {
  const active = list.find((pk) => pk.kind !== "std" && pk.deckId === deckId);
  if (!active) return list;
  const rest = list.filter((pk) => pk !== active);
  const stdFirst = rest[0] && rest[0].kind === "std";
  rest.splice(stdFirst ? 1 : 0, 0, active); // hinter Standard bzw. ganz vorn
  return rest;
}

/* Synthetische „Klinge"-Kachel: der Standard-Sieg-Finisher — immer im Besitz (kein Kauf), aber wählbar UND
   vorschaubar wie die anderen Finisher. Wird der Sieg-Finisher-Gruppe vorangestellt (analog „Gottgleich · Standard"). */
const KLINGE = { key: "klinge", name: "Klinge", group: "finisher", preview: "klinge", alwaysOwned: true,
  desc: "Gegnerkarte wird beim Sieg zerschnitten — der Standard-Finisher (immer verfügbar)." };

/* Synthetische „Gottgleich · Standard"-Kachel (kein Kauf, immer aktiv) — nur zum Vergleichen des Gottgleich-
   Siegs OHNE Prunk. Wird in der Gottgleich-Gruppe als reine Vorschau-Zeile geführt. */
const GOTT_STANDARD = { key: "gottStandard", name: "Gottgleich · Standard", group: "gott", alwaysOwned: true, preview: "gottStandard",
  desc: "Gottgleicher Sieg OHNE Prunk-Effekt — die Basis zum Vergleichen (Standard-Auswahl, kein Kauf)." };

// Effekt-Gruppen des „Effekte"-Tabs. mode: "toggle" (frei kombinierbar) | "finisher" (Einfachauswahl, exklusiv,
// inkl. „Klinge" als Default). Grid-Tunnel wurde entfernt → keine Ambience-Gruppe mehr.
const FX_GROUPS = [
  { key: "anim",     title: "Karten-Animationen", hint: "einmal kaufen · für alle Packs", mode: "toggle" },
  { key: "field",    title: "Battlefield-Ambiente", hint: "nur eins aktiv",               mode: "field" }, // #306
  { key: "finisher", title: "Sieg-Finisher",      hint: "nur einer aktiv",                mode: "finisher" },
  // #: Krit-Gruppe (Shatter) entfernt — Krit-Finisher-Animationen raus.
  { key: "gott",     title: "Gottgleich-Prunk",   hint: "nur einer aktiv",                mode: "gott" }, // exklusiv
];
/* #306 Synthetische „Kein Feld-Effekt"-Kachel (immer verfügbar, kein Kauf): der Aus-Zustand der einfach-exklusiven
   Battlefield-Ambiente-Gruppe — wählbar wie „Klinge" beim Finisher. */
const FIELD_NONE = { key: "none", name: "Kein Feld-Effekt", group: "field", preview: "none", alwaysOwned: true,
  desc: "Kein Battlefield-Ambiente — nur das Battlefield-Bild (immer verfügbar)." };
// Items einer Gruppe (in Detail-Reihenfolge): GLOBAL_FX der Gruppe nach DP-Preis aufsteigend (billig oben, teuer unten);
// der synthetische „Standard"/„Kein …"/„Klinge"-Default wird vorangestellt (Gratis-Aus-Zustand).
const fxGroupItems = (group) => {
  const list = GLOBAL_FX.filter((f) => f.group === group).slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  if (group === "gott") return [GOTT_STANDARD, ...list];
  if (group === "finisher") return [KLINGE, ...list]; // „Klinge" (Default) voran
  if (group === "field") return [FIELD_NONE, ...list]; // „Kein Feld-Effekt" (Default) voran
  return list;
};

/* Sieg-Finisher sind untereinander exklusiv (genau EINER aktiv). Zentrale Wahrheit für Auswahl UND Anzeige,
   damit In-Übersicht (Radio) und Detail-Fenster nie auseinanderlaufen. „klinge" = alle Flags aus. */
const finisherFlags = (key) => ({ fxLaserSlice: key === "laserSlice", fxBlackhole: key === "blackhole",
  fxLasergrid: key === "lasergrid", fxBurnBeam: key === "burnBeam", fxOverload: key === "overload", fxDisperse: key === "disperse" });
const finisherSelOf = (options) => options?.fxBlackhole ? "blackhole" : options?.fxLasergrid ? "lasergrid"
  : options?.fxBurnBeam ? "burnBeam" : options?.fxOverload ? "overload" : options?.fxDisperse ? "disperse"
  : options?.fxLaserSlice ? "laserSlice" : "klinge";
/* #306 Battlefield-Ambiente einfach-exklusiv (genau EINS aktiv, oder „none"). Datengetrieben aus der „field"-Gruppe:
   fieldFxFlags(key) schreibt alle Feld-Optionen in einem Rutsch (genau eine true, „none" = alle false). */
const FIELD_FX = GLOBAL_FX.filter((f) => f.group === "field");
const fieldFxFlags = (key) => Object.fromEntries(FIELD_FX.map((f) => [f.option, f.key === key]));
const fieldFxSelOf = (options) => { for (const f of FIELD_FX) if (options?.[f.option]) return f.key; return "none"; };
/* Gottgleich-Prunk einfach-exklusiv (genau EINER aktiv, oder „gottStandard" = kein Prunk). Datengetrieben aus der
   „gott"-Gruppe: gottFlags(key) schreibt alle Prunk-Optionen in einem Rutsch (genau eine true, „gottStandard" = alle false). */
const GOTT_FX = GLOBAL_FX.filter((f) => f.group === "gott");
const gottFlags = (key) => Object.fromEntries(GOTT_FX.map((f) => [f.option, f.key === key]));
const gottSelOf = (options) => { for (const f of GOTT_FX) if (options?.[f.option]) return f.key; return "gottStandard"; };

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
/* #fx-floater: horizontal wischbare Kategorie-Reihen ohne sichtbaren Scrollbalken. */
.ws-hscroll::-webkit-scrollbar{display:none}
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
function PrunkCanvas({ variant, loop = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    return startPrunk(ref.current, {
      fireworks: variant === "fireworks", goldRain: variant === "goldRain", prismaWave: variant === "prismaWave",
      color: "#35e0ff", originX: 0.5, originY: 0.58, loop });
  }, [variant, loop]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

/* #294 Gottgleich-Vorschau: spielt das ECHTE Ereignis im Loop nach (Karten-Pop + Aura-Flare + goldene
   „GOTTGLEICH ×7"-Groß-Ansage) und legt den jeweiligen Prunk-Effekt darüber. variant "standard" zeigt den
   Basis-Look ohne Prunk → direkter Vergleich. compact = kleine Kachel (leichte CSS-Partikel); groß = Canvas-Wucht. */
const GOTT_CYCLE_MS = 3400;  // Länge eines Vorschau-Zyklus (= Dauer der ws-gott-*-Animationen)
const GOTT_POP_MS = 272;     // „Pop"-Moment: 8 % von 3,4 s (Karten-Hit) → hier fällt der Bass hin
function GottgleichPreview({ variant, compact = false }) {
  const bf = battlefieldAssets(SHOWCASE_BF);
  const cardImg = deckAssets("default").back;
  const hasPrunk = variant !== "standard";
  // #: Drift-Fix. Zuvor liefen die CSS-Animationen (3,4 s infinite), der Prunk-Canvas (interner Loop 2,25 s) und der
  // Bass-setInterval auf DREI verschiedenen Uhren → nach dem ersten Zyklus liefen sie auseinander (Animation vor dem
  // Puls/Bass). Jetzt treibt EIN Zyklus-Zähler alles: die Animationen + der Prunk werden je Zyklus über key={cycle} neu
  // gestartet, der Bass fällt je Zyklus exakt auf den Pop-Moment → Animation, Puls und Bass bleiben dauerhaft synchron.
  const [cycle, setCycle] = useState(0);
  const [burst, setBurst] = useState(0); // zählt die „Pops" → Prunk-Canvas zündet je Pop (deckungsgleich mit Bass)
  useEffect(() => {
    if (compact) return undefined; // Kachel-Vorschau: schlichte Endlos-CSS ohne Ton (kein Sync nötig)
    const id = setInterval(() => setCycle((c) => c + 1), GOTT_CYCLE_MS);
    return () => clearInterval(id);
  }, [compact]);
  useEffect(() => {
    if (compact) return undefined;
    // Auf den Pop (272 ms in den Zyklus) den Prunk zünden. #: Bass entfernt (nur „Schwarzes Loch" hat Bass) — Vorschau = In-Game.
    const t = setTimeout(() => { setBurst((b) => b + 1); }, GOTT_POP_MS);
    return () => clearTimeout(t);
  }, [cycle, compact]);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Sieg-Aura (grün→gold) — key={cycle} startet sie je Zyklus synchron neu (nur große Vorschau; compact bleibt bei 0). */}
      <div key={`au${cycle}`} className="ws-gott-aura absolute" style={{ left: "50%", top: "56%", width: "72%", aspectRatio: "1", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,166,58,.55), rgba(90,184,122,.28) 46%, transparent 70%)" }} />
      {/* Gewinnerkarte, ploppt an */}
      <div key={`po${cycle}`} className="ws-gott-pop absolute" style={{ left: "50%", top: "58%", width: compact ? "34%" : "20%", aspectRatio: CARD_RATIO }}>
        <img src={cardImg} alt="" className="absolute inset-0 w-full h-full object-contain rounded" />
      </div>
      {/* Prunk-Overlay: große Vorschau zündet je Pop 1× (loop=false + key={burst} → deckungsgleich mit Bass), Kachel = leichte CSS-Partikel. */}
      {hasPrunk && (compact ? <PrunkParticles variant={variant} /> : (burst > 0 && <PrunkCanvas key={`pr${burst}`} variant={variant} loop={false} />))}
      {/* Goldene Groß-Ansage */}
      <div key={`an${cycle}`} className="ws-gott-ann absolute font-extrabold" style={{ left: "50%", top: "30%", whiteSpace: "nowrap",
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
      // #: Überladung weicher (Lowpass + Attack/Release), damit der Blitz-Sound nicht „hart" wirkt — auch in der Vorschau.
      if (variant === "overload") audio.play(sfx, { gain: 0.95, soft: 6000, attack: 0.006, release: 0.06 });
      else audio.play(sfx, { gain: variant === "klinge" ? 1.0 : 1.05 });
      // #: Bass-Impact für Überladung/Zerstäubung entfernt (nur „Schwarzes Loch" hat Bass) — Vorschau = In-Game.
    }, FIN_DELAY);
    return () => clearTimeout(id);
  }, [tick, variant]);
  const suitCol = suitColor(DEMO_SUIT);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  const seed = tick * 3 + 1;
  const dTier = (tick % 4) + 1; // #300 Vorschau durchläuft die Wertdifferenz-Stufen 1→4 (zeigt die Intensitäts-Eskalation)
  let fx = null;
  if (variant === "laser") fx = <SliceFx cardEl={cardEl} color={suitCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} tier={2} scale={1} laser />;
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
      {/* #300: Diff-gekoppelte Finisher — Stufe (1→4) einblenden, damit die Eskalation in der Vorschau lesbar ist. */}
      {(variant === "overload" || variant === "disperse") && (
        <div className="absolute top-1.5 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold font-pixel"
          style={{ background: "#0c0c10cc", border: "1px solid #2a2836", color: "#cfccda" }}>
          Stufe {dTier}/4
        </div>
      )}
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
    // #: LÄNGERE Serie in der Vorschau, damit die Eskalation sichtbar wird: 1..11 Siege (Strahl lit, Intensität +
    // Funkendichte steigen; ab ~Sieg 9 am Maximum → kurz gehalten) · 12 Niederlage (Strahl zieht sich zurück) · 13/14 Pause.
    let c = 0;
    const id = setInterval(() => {
      c = (c + 1) % 15;
      if (c >= 1 && c <= 11) {
        const streak = c * 1.4; // wächst sichtbar über mehr Stufen; sK deckelt bei 12 → oberste Siege halten den vollen Strahl
        setDormant(false);
        setPulse({ id: ++seqRef.current, kind: "win", streak });
        const bid = seqRef.current;
        setBursts((b) => [...b, { id: bid, streak }].slice(-2));
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== bid)), 1000);
      } else if (c === 12) { setPulse({ id: ++seqRef.current, kind: "loss" }); setDormant(true); }
    }, 820);
    return () => clearInterval(id);
  }, []);
  // #302b/#307: Brennstrahl-Loop-Bett an die Lit-Phase (Sieg-Puls) koppeln — IDENTISCH zu In-Game (Battlefield.jsx):
  // der Ton startet erst mit dem herabfahrenden Strahl (erster Sieg), nicht schon beim Öffnen der Vorschau, und stoppt
  // beim Serienabbruch. So läuft kein Laser-Sound, bevor der Laser sichtbar ist. Leiser Start → mit der Serie lauter/heißer.
  useEffect(() => {
    const lit = !dormant && pulse && pulse.kind === "win";
    if (lit) {
      const sK = clamp((pulse.streak || 0) / 12, 0, 1);
      const g = 0.3 + sK * 0.6;
      const r = 1 + sK * 0.28;
      if (!burnLoopRef.current) burnLoopRef.current = audio.loop("fx_burnbeam", { gain: g, rate: r, loopStart: 0.1, loopEnd: 0.8 });
      else { audio.setLoopGain(burnLoopRef.current, g); audio.setLoopRate(burnLoopRef.current, r); }
    } else if (burnLoopRef.current) {
      audio.stopLoop(burnLoopRef.current); burnLoopRef.current = null;
    }
  }, [dormant, pulse]);
  useEffect(() => () => {
    if (burnLoopRef.current) { audio.stopLoop(burnLoopRef.current, { fade: 0.05 }); burnLoopRef.current = null; }
  }, []);
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
  // #: Loch-Ton-Bett identisch zu In-Game (leiser Start → Anschwellen mit dem Wachstum → hörbarer Bass-Kollaps beim Serienabbruch).
  useBlackholeSfx(!dormant, pulse);
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
  if (fx.preview === "frameGlow" || fx.preview === "holoSwipe" || fx.preview === "auroraVeil" || fx.preview === "glitch") {
    return (
      <div className="w-full h-full grid place-items-center overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
        <CardPreview deckId="default" a1={DEMO_C} fx={fx.preview} className="max-h-full" style={{ height: "94%" }} />
      </div>
    );
  }
  // #306 Battlefield-Ambiente (inkl. Hologrid + „Kein Feld-Effekt"): echte In-Game-Komponente (FieldFxLayer) über dem BF-Bild.
  if (["hologrid", "starfield", "aurora", "embers", "scanline", "vignette", "none"].includes(fx.preview)) return <FieldFxPreview effect={fx.preview} />;
  if (["fireworks", "goldRain", "prismaWave"].includes(fx.preview)) return <GottgleichPreview variant={fx.preview} />;
  if (fx.preview === "gottStandard") return <GottgleichPreview variant="standard" />;
  if (fx.preview === "blackhole") return <BlackholePreview />;
  if (fx.preview === "burnbeam") return <BurnBeamPreview />;
  if (["laser", "klinge", "lasergrid", "overload", "disperse"].includes(fx.preview)) return <FinisherScene variant={fx.preview} />;
  // Fallback (kein bekannter Vorschautyp): schlichte Battlefield-Szene.
  const bf = battlefieldAssets(SHOWCASE_BF);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
    </div>
  );
}

// #306 Battlefield-Ambiente-Vorschau: das echte BF-Bild (aktuell gespielte Version) + der ECHTE In-Game-Layer
// (FieldFxLayer) in der Demo-Deckfarbe. Ein Intervall bumpt sweepId → periodische „Stich"-Reaktion wie im Spiel.
// „none" zeigt nur das BF-Bild. Vorschau = In-Game (dieselbe Komponente, kein Drift).
// #: Glutfunken sind an den Lauf-Score gekoppelt → die Vorschau rampt einen Demo-Score durch mehrere Stufen und blendet
// eine Score-Anzeige ein, damit man sieht, wie die Fontänen bei welchem Score aussehen (mehr/höher je Score, bis 500k).
const EMBER_DEMO_SCORES = [40000, 150000, 320000, 500000];
function FieldFxPreview({ effect }) {
  const bf = battlefieldAssets(SHOWCASE_BF);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const [sweep, setSweep] = useState(1);
  const [emberStep, setEmberStep] = useState(0);
  useEffect(() => {
    if (effect === "none") return undefined;
    // #: Glutfunken — Score-Wechsel UND Funkenstoß aus EINEM Timer, sonst zeigt der Puls (1,5s) eine andere Stufe als
    // das Score-Label (2,4s). Beide zusammen bumpen → der Stoß spiegelt immer den gerade angezeigten Score. Andere
    // Effekte: nur der periodische Sweep-Puls.
    const isEmbers = effect === "embers";
    const id = setInterval(() => {
      setSweep((s) => s + 1);
      if (isEmbers) setEmberStep((s) => (s + 1) % EMBER_DEMO_SCORES.length);
    }, isEmbers ? 2000 : 1500);
    return () => clearInterval(id);
  }, [effect]);
  const demoScore = effect === "embers" ? EMBER_DEMO_SCORES[emberStep] : 0;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {effect !== "none" && <FieldFxLayer effect={effect} color={DEMO_C} color2="#b06bff" sweepId={sweep} sweepDur={1100} reduced={false} win score={demoScore} />}
      {effect === "embers" && (
        <div className="absolute right-2 bottom-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1.5"
          style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: "#ffd7b0" }}>
          <span className="opacity-70">Score</span> {demoScore.toLocaleString("de-DE")}
        </div>
      )}
    </div>
  );
}

// Karten-Vorschau: illustrierte Karte (Front = Rahmen, Back = Cover), vollständig (object-contain) + optionaler
// Effekt. Frame Glow = pulsierender Schein am Kartenrand; Holo Swipe = wandernder Glanz-Streifen.
function CardPreview({ deckId, a1, fx, face = "back", className = "", style }) {
  const img = deckAssets(deckId)[face] || deckAssets(deckId).back;
  const glow = fx === "frameGlow";
  // #309 Demo-Farben für Aurora-Schleier (Deck-Haupt- + Kontrastfarbe).
  const a2 = "#ff5ad6";
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", "--a1": a1, animation: glow ? "ws-frameglow 2s ease-in-out infinite" : undefined, ...style }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
      {fx === "holoSwipe" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute" style={{ top: "-60%", left: 0, width: "40%", height: "220%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.28),rgba(120,220,255,.16),transparent)",
            animation: "ws-swipe 2.6s ease-in-out infinite" }} />
        </div>
      )}
      {fx === "auroraVeil" && (
        <div aria-hidden="true" className="as-aurora-drift absolute inset-0 rounded-lg pointer-events-none" style={{
          mixBlendMode: "screen", opacity: 0.55, filter: "blur(8px)",
          backgroundImage: `radial-gradient(58% 44% at 30% 33%, ${a1}cc, transparent 70%), radial-gradient(54% 40% at 72% 66%, ${a2}bb, transparent 70%), radial-gradient(48% 50% at 50% 84%, ${a1}88, transparent 76%)` }} />
      )}
      {fx === "glitch" && (
        <div aria-hidden="true" className="as-glitch-wrap absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          {/* Chromatische Aberration: zwei versetzte Magenta/Cyan-Klone des Kartenmotivs (contain, wie das <img>). */}
          <div className="as-glitch-chroma-a absolute inset-0" style={{ backgroundImage: `url(${img})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#ff2bd6", backgroundBlendMode: "multiply", mixBlendMode: "screen" }} />
          <div className="as-glitch-chroma-b absolute inset-0" style={{ backgroundImage: `url(${img})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#20e5ff", backgroundBlendMode: "multiply", mixBlendMode: "screen" }} />
          <span className="as-glitch-bar" style={{ top: "24%", background: "linear-gradient(90deg,transparent,#ff2bd6,transparent)", filter: "drop-shadow(0 0 3px #ff2bd6)", animationDelay: "-0.2s" }} />
          <span className="as-glitch-bar" style={{ top: "52%", background: "linear-gradient(90deg,transparent,#20e5ff,transparent)", filter: "drop-shadow(0 0 3px #20e5ff)", animationDelay: "-1.7s" }} />
          <span className="as-glitch-bar" style={{ top: "76%", background: `linear-gradient(90deg,transparent,${a1},transparent)`, filter: `drop-shadow(0 0 3px ${a1})`, animationDelay: "-3.1s" }} />
          <div className="as-glitch-scan" />
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
  // #perf C3: Der Shop rendert ein Raster aus ~15–20 Deck-Thumbnails. `loading="lazy"` lädt nur die sichtbaren Kacheln
  // (Off-Screen erst beim Scrollen) → deutlich weniger Bytes beim Öffnen der Kollektion auf Mobile; `decoding="async"`
  // hält das Bild-Decoding vom Main-Thread. Rein additive Attribute → kein visueller/Desktop-Unterschied.
  return <img src={img} alt="" loading="lazy" decoding="async" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

/* ============================ Haupt-Screen ============================ */
export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  const p = profile || {};
  const [tab, setTab] = useState("packs");           // "packs" | "challenges" | "fx"
  const [packOv, setPackOv] = useState(null);        // offene Pack-Detailansicht: { cat, idx } | null
  const [packSel, setPackSel] = useState("back");   // "back" | "front" | "bg" — Cover (Rücken) zuerst, dann Front
  const deckId = options?.deckId || "default";
  // #Shop-Reorg: Detail navigiert innerhalb seiner Kategorie; aktives Pack steht nach Standard vorn (orderPacks).
  const catList = (cat) => orderPacks(cat === "challenges" ? CHALLENGES_TAB : PACKS_TAB, deckId);
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const dpBal = Math.max(0, Math.floor(Number(p.deckPoints) || 0)); // #299 Deckpunkte — Währung der Packs

  // #fx-floater: Höhe des Sticky-Kopfs messen → die Effekt-Vorschau klebt exakt darunter (mitlaufender Floater, kein Überlappen).
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(116); // Startwert ≈ Kopfhöhe, vermeidet 1-Frame-Sprung vor der Messung
  useEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const measure = () => setHeadH(el.offsetHeight || 0);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [tab]);

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };
  const activate = (pack) => onChoose(hasBattlefield(pack) ? { deckId: pack.deckId, battlefieldId: pack.bfId } : { deckId: pack.deckId });

  const openPack = (cat, i) => { setPackOv({ cat, idx: i }); setPackSel("back"); };
  const stepPack = (d) => { setPackOv((o) => (o ? { ...o, idx: (o.idx + d + catList(o.cat).length) % catList(o.cat).length } : o)); setPackSel("back"); };

  // Ist ein Kauffenster offen, wird der Shop-Hintergrund NICHT mitgescrollt (kein Scroll-Durchgriff auf iOS).
  const anyOverlay = !!packOv;

  return (
    <div className={`fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 ${anyOverlay ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{FX_CSS}</style>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Kopf */}
        <div ref={headRef} className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Deck-Werkstatt</h2>
            <div className="flex items-center gap-2">
              {/* DP = Werkstatt-Währung (Packs UND Effekte, #307); SP-Guthaben nur zur Info (Upgrade-Baum). */}
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #4a3f6e", color: "#b9a9f2" }}>{dpBal} DP</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Tab-Umschalter: Packs · Challenges · Effekte */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["packs", "Packs"], ["challenges", "Challenges"], ["fx", "Effekte"]].map(([m, label]) => (
              <button key={m} onClick={() => setTab(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-extrabold transition-colors"
                style={{ background: tab === m ? "#9b82f0" : "transparent", color: tab === m ? "#141419" : "#9a97ab" }}>{label}</button>
            ))}
          </div>
        </div>

        {tab === "packs" ? <PacksView p={p} deckId={deckId} list={catList("packs")} cat="packs" onOpen={openPack} />
          : tab === "challenges" ? <PacksView p={p} deckId={deckId} list={catList("challenges")} cat="challenges" onOpen={openPack} />
          : <FxView p={p} options={options} onChoose={onChoose} onBuyFx={(fx) => buy((pf) => buyGlobalFx(pf, fx))} stickyTop={headH} />}
      </div>

      {/* Kauffenster via Portal an document.body: der Shop-Root trägt backdrop-filter und ist damit der
          Containing-Block für `position:fixed` — das Portal löst das Overlay heraus → echtes Vollbild-Overlay. */}
      {packOv && createPortal(
        <PackDetail pack={catList(packOv.cat)[packOv.idx]} idx={packOv.idx} count={catList(packOv.cat).length} p={p} dpBal={dpBal}
          deckId={deckId} sel={packSel} setSel={setPackSel} onStep={stepPack} onClose={() => setPackOv(null)}
          onActivate={activate} onBuy={(pack) => { buy((pf) => buyPack(pf, pack)); activate(pack); }} />,
        document.body)}
    </div>
  );
}

/* ============================ Packs- / Challenges-Tab ============================ */
// #Shop-Reorg: geteilte Ansicht für „Packs" (Kauf-Packs, nach DP-Preis sortiert) und „Challenges" (freischaltbare
// cond-Packs). `list` kommt vorsortiert rein; die Reihenfolge bleibt (kein erneutes Sortieren) → billig oben, teuer unten.
function PacksView({ p, deckId, list, cat, onOpen }) {
  const challenge = cat === "challenges";
  const [filter, setFilter] = useState("alle");
  const chips = challenge ? [["alle", "Alle"], ["besitz", "Frei"], ["gesperrt", "Gesperrt"]] : [["alle", "Alle"], ["besitz", "Besitz"], ["kaufbar", "Kaufbar"]];
  const stateOf = (pack) => (pack.kind === "std" ? "own" : packState(p, pack));
  const shown = list.filter((pack) => {
    const s = stateOf(pack);
    if (filter === "besitz") return s === "own";
    if (filter === "kaufbar") return s === "buy";
    if (filter === "gesperrt") return s === "lock";
    return true;
  });

  return (
    <>
      <div className="flex gap-1.5 mt-3 flex-wrap">
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors"
            style={{ background: filter === k ? "#26c6e6" : "#14131c", color: filter === k ? "#08181c" : "#9a97ab", border: `1px solid ${filter === k ? "#26c6e6" : "#2a2836"}` }}>{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {shown.map((pack) => {
          const gi = list.indexOf(pack);
          const s = stateOf(pack);
          const active = deckId === pack.deckId;
          // Ausgegraut = noch nicht im Besitz (kaufbar ODER gesperrt) — einheitlich wie die Challenges. Nur besessene/aktive Packs bleiben farbig.
          const owned = s === "own";
          const badge = active ? ["AKTIV", "#123a25", "#54e08a", "#2f7a4f"]
            : s === "buy" ? [`${packPrice(pack)} DP`, "#211f2e", "#b9a9f2", "#4a3f6e"]
            : s === "lock" ? ["🔒", "#1c1b24", "#9a97ab", "#2e2d38"]
            : null;
          const sub = active ? ["aktiv", "#54e08a"]
            : s === "own" ? ["tippen → Details", "#9a97ab"]
            : s === "buy" ? ["kaufbar", "#f2c14a"]
            : [packUnlock(p, pack).label, "#6d6a80"];
          return (
            <button key={pack.id} type="button" onClick={() => onOpen(cat, gi)}
              className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
              style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}`, boxShadow: active ? "0 0 0 1px #54e08a55, 0 0 16px #54e08a22" : undefined }}>
              <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                <DeckThumb deckId={pack.deckId} className="absolute inset-0 w-full h-full" style={{ filter: owned ? undefined : "grayscale(.7) brightness(.5)" }} />
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

      {shown.length === 0 && (
        <div className="text-center text-[12px] py-6" style={{ color: "#6d6a80" }}>Nichts in dieser Ansicht.</div>
      )}

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        {challenge
          ? <>Ein <b>Challenge-Deck</b> wird über eine Herausforderung <b>freigeschaltet</b> (kein Kauf). Tippe es an → Vorschau + Freischalt-Bedingung; sobald erfüllt, aktivierst du es direkt.</>
          : <>Ein <b>Pack</b> bündelt Karte (Front + Back) und Battlefield. Tippe ein Pack an → Detail-Ansicht mit Vorschau; <b>Kaufen aktiviert das Pack direkt</b>.</>}
      </p>
    </>
  );
}

/* Pack-Detailansicht (Portal): Vorschau (Karte vorne/hinten/Hintergrund), ‹ ›/Swipe zwischen Packs, Kaufen/Aktivieren. */
function PackDetail({ pack, idx, count, p, dpBal, deckId, sel, setSel, onStep, onClose, onActivate, onBuy }) {
  const touch = useRef(0);
  const hasBf = hasBattlefield(pack);
  const segs = hasBf ? [["back", "Karte hinten"], ["front", "Karte vorne"], ["bg", "Hintergrund"]]
                     : [["back", "Karte hinten"], ["front", "Karte vorne"]];
  const activeSel = (sel === "bg" && !hasBf) ? "back" : sel;

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

/* ============================ Effekte-Tab (#fx-floater) ============================ */
/* Variante „Bühne + Liste": eine große, ECHTE In-Game-Vorschau klebt als Floater direkt unter dem Sticky-Kopf
   (top = gemessene Kopfhöhe) und läuft beim Scrollen mit — so bleibt sie sichtbar, egal wie viele Kategorien
   darunter kommen. Je Gruppe eine horizontal wischbare Reihe kompakter Chips (kleine Live-Vorschau + Kurzname +
   Status-Marker). Tippen wählt den Effekt → der Floater zeigt ihn groß und bietet die passende Aktion (Kaufen /
   An-Aus / Als Finisher·Ambiente wählen). Kein separates Kauffenster mehr — der Floater IST Vorschau und Kauf. */
function FxView({ p, options, onChoose, onBuyFx, stickyTop = 0 }) {
  const finisherSel = finisherSelOf(options);
  const fieldSel = fieldFxSelOf(options);
  const gottSel = gottSelOf(options);
  // Auswahl-Status des Floaters: { group, key }. Default = erster Effekt der ersten Gruppe (Karten-Animationen).
  const [sel, setSel] = useState(() => { const g = FX_GROUPS[0]; return { group: g.key, key: fxGroupItems(g.key)[0].key }; });
  const selGroup = FX_GROUPS.find((g) => g.key === sel.group) || FX_GROUPS[0];
  const selItems = fxGroupItems(selGroup.key);
  const selFx = selItems.find((f) => f.key === sel.key) || selItems[0];

  // Ist ein Effekt in seiner Gruppe „aktiv"? (Toggle an / als Finisher·Ambiente gewählt). Zentrale Wahrheit → Chip-Marker + Floater-Aktion.
  const isActive = (g, fx) => g.mode === "finisher" ? finisherSel === fx.key
    : g.mode === "field" ? fieldSel === fx.key
    : g.mode === "gott" ? gottSel === fx.key
    : fx.standard ? false : !!options?.[fx.option];

  return (
    <>
      {/* Mitlaufende Vorschau-Bühne (sticky unter dem Kopf). */}
      <FxFloater fx={selFx} group={selGroup} p={p} active={isActive(selGroup, selFx)}
        onChoose={onChoose} onBuyFx={onBuyFx} stickyTop={stickyTop} />

      {/* Kategorien als horizontal wischbare Reihen. */}
      <div className="mt-3">
        {FX_GROUPS.map((g) => {
          const items = fxGroupItems(g.key);
          return (
            <div key={g.key} className="mb-1.5">
              <div className={EYEBROW} style={{ color: "#9a97ab" }}>
                {g.title}
                <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
                <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{g.hint}</span>
              </div>
              <div className="ws-hscroll flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1"
                style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                {items.map((fx) => (
                  <FxChip key={fx.key} fx={fx}
                    selected={sel.group === g.key && sel.key === fx.key}
                    owned={fx.standard || fx.alwaysOwned || globalFxOwned(p, fx)}
                    active={isActive(g, fx)}
                    onPick={() => setSel({ group: g.key, key: fx.key })}
                    onToggle={() => {
                      // Doppeltippen schaltet um: aktiv → abwählen, im Besitz & inaktiv → auswählen/aktivieren.
                      if (fx.standard) return;                                        // Standard ist immer aktiv
                      const on = isActive(g, fx);
                      if (!on && !(fx.alwaysOwned || globalFxOwned(p, fx))) return;   // nicht im Besitz → erst kaufen (Floater)
                      if (g.mode === "finisher") onChoose(finisherFlags(on ? "none" : fx.key));
                      else if (g.mode === "field") onChoose(fieldFxFlags(on ? "none" : fx.key));
                      else if (g.mode === "gott") onChoose(gottFlags(on ? "gottStandard" : fx.key));
                      else onChoose({ [fx.option]: !on });
                    }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] mt-2 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Effekte sind <b>global</b> — einmal gekauft, für alle Packs. Tippe einen Effekt → er läuft oben groß; dort <b>kaufen</b> bzw. <b>an/aus</b> (Finisher &amp; Ambiente: auswählen). <b>Doppeltippen</b> schaltet einen Effekt direkt um (auswählen bzw. abwählen).
      </p>
    </>
  );
}

/* #fx-floater: die große Vorschau-Bühne, die unter dem Sticky-Kopf klebt. Zeigt den gewählten Effekt als ECHTE
   In-Game-Vorschau (GlobalFxScenePreview, key={fx.key} → sauberer Remount beim Wechsel, keine hängenden Loops) +
   Gruppen-/Namensschild + die kontextabhängige Aktion (Logik/Optik wie zuvor das Kauffenster). */
function FxFloater({ fx, group, p, active, onChoose, onBuyFx, stickyTop }) {
  const owned = fx.standard || fx.alwaysOwned || globalFxOwned(p, fx);
  const canBuy = !fx.standard && !fx.alwaysOwned && canBuyGlobalFx(p, fx);
  const price = globalFxPrice(fx);
  const dpBal = Math.max(0, Math.floor(Number(p?.deckPoints) || 0));
  const actBtn = "w-full rounded-xl font-extrabold text-[12.5px] py-2.5";
  const onStyle = { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" };
  const offStyle = { background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" };

  let action;
  if (fx.standard) {
    action = <div className="w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ background: "#1c2433", color: "#7fb4ff", border: "1px solid #33507a" }}>Standard — immer aktiv, kein Kauf nötig</div>;
  } else if (!owned) {
    action = (
      <button onClick={() => { if (canBuy) onBuyFx(fx); }} disabled={!canBuy}
        className={`${actBtn} transition-opacity`}
        style={{ background: canBuy ? "#d4a63a" : "#3a2f12", color: "#141419", boxShadow: canBuy ? "0 0 16px rgba(212,166,58,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
        Kaufen · {price} DP{!canBuy && dpBal < price ? " (zu wenig DP)" : ""}
      </button>
    );
  } else if (group.mode === "finisher") {
    action = <button onClick={() => onChoose(finisherFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Finisher wählen"}</button>;
  } else if (group.mode === "field") {
    action = <button onClick={() => onChoose(fieldFxFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Ambiente wählen"}</button>;
  } else if (group.mode === "gott") {
    action = <button onClick={() => onChoose(gottFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Prunk wählen"}</button>;
  } else {
    action = <button onClick={() => onChoose({ [fx.option]: !active })} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ An — tippen zum Ausschalten" : "Einschalten"}</button>;
  }

  return (
    <div className="sticky z-[15] -mx-5 sm:-mx-6 px-5 sm:px-6 pt-2 pb-2.5" style={{ top: stickyTop, background: STICKY_HEAD_BG, borderBottom: "1px solid #23222e" }}>
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: "clamp(146px, 22vh, 208px)", border: "1px solid #34324a", boxShadow: "0 0 22px -10px #35e0ff66" }}>
        <GlobalFxScenePreview key={fx.key} fx={fx} />
        {/* Gruppen-Schild oben links */}
        <span className="absolute left-2 top-2 text-[9px] font-extrabold tracking-[0.1em] uppercase px-2 py-0.5 rounded-md"
          style={{ background: "#0b0a16aa", border: "1px solid #ffffff1f", color: "#cbd3ff" }}>{group.title}</span>
        {/* Status-Schild oben rechts: aktiv (grün) bzw. Preis (gold) bei noch nicht gekauft. */}
        {active
          ? <span className="absolute right-2 top-2 text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-md" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>AKTIV</span>
          : !owned ? <span className="absolute right-2 top-2 text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-md" style={{ background: "#2e2410", color: "#f2c14a", border: "1px solid #6b5320" }}>{price} DP</span> : null}
        {/* Name unten links */}
        <span className="absolute left-2.5 bottom-2 text-[15px] font-extrabold" style={{ textShadow: "0 1px 8px #000, 0 0 3px #000" }}>{fx.name}</span>
      </div>
      <div className="text-[10.5px] leading-snug mt-1.5 mb-2 text-center" style={{ color: "#9a97ab", minHeight: 26 }}>{fx.desc}</div>
      {action}
    </div>
  );
}

/* #fx-floater/Text-Chips: Signatur-Farbe je Effekt (linker Farbbalken). Meist Deckfarben-Cyan; ein paar Effekte tragen
   ihre eigene Identitätsfarbe (Feuer/Gold/Blitz/Aurora/Prisma), damit die Reihe auf einen Blick lesbar ist. Key = preview. */
const FX_TINT = {
  frameGlow: "#35e0ff", holoSwipe: "#35e0ff", auroraVeil: "#c86bff", glitch: "#35e0ff",
  none: "#4a4857", hologrid: "#35e0ff", starfield: "#7fb4ff", aurora: "#54e08a",
  embers: "#ff7a2f", scanline: "#35e0ff", vignette: "#c86bff",
  klinge: "#35e0ff", laser: "#35e0ff", lasergrid: "#35e0ff", disperse: "#8fd8ff",
  overload: "#9b82f0", burnbeam: "#ff7a2f", blackhole: "#35e0ff",
  gottStandard: "#7fb4ff", fireworks: "#ff5ad6", goldRain: "#f2c14a", prismaWave: "#c86bff",
};

/* #fx-floater: Text-Chip einer Kategorie-Reihe (horizontal wischbar) — KEIN Grafik-Icon. Linker Signatur-Farbbalken
   + Name + Status (aktiv = grün · kaufbar = Preis gold · sonst „im Besitz"). Die echte Optik zeigt der Floater oben;
   der Chip ist ein reiner Wähler. Tippen wählt den Effekt. */
function FxChip({ fx, selected, owned, active, onPick, onToggle }) {
  const tint = FX_TINT[fx.preview] || "#35e0ff";
  const status = active ? { c: "#54e08a", label: "aktiv", dot: "#54e08a" }
    : !owned ? { c: "#f2c14a", label: `${globalFxPrice(fx)} DP`, dot: "#f2c14a" }
    : { c: "#6d6a80", label: "im Besitz", dot: null };
  // #: Doppel-TIPP/-Klick SCHALTET UM (aktiv→abwählen · im Besitz→auswählen). onDoubleClick (dblclick) feuert auf Touch
  // NICHT → eigene Zeitmessung: zwei Klicks/Tipps innerhalb 320 ms = Doppel (Maus UND Handy). Einzelklick wählt (onPick).
  const lastTap = useRef(0);
  const handleTap = () => {
    onPick();
    const now = Date.now();
    if (now - lastTap.current < 320) { lastTap.current = 0; onToggle && onToggle(); }
    else lastTap.current = now;
  };
  return (
    <button type="button" onClick={handleTap} title={active ? "Doppeltippen: abwählen" : owned ? "Doppeltippen: auswählen" : undefined}
      className="shrink-0 relative overflow-hidden rounded-xl text-left transition-transform active:scale-95 flex flex-col justify-center"
      style={{ minWidth: 106, maxWidth: 138, padding: "9px 11px 9px 13px", scrollSnapAlign: "start",
        background: selected ? "#211f2e" : "#14131c",
        border: `1px solid ${selected ? "#9b82f0" : "#2a2836"}`,
        boxShadow: selected ? "0 0 0 1px #9b82f0, 0 0 14px #9b82f022" : undefined }}>
      {/* Signatur-Farbbalken links — nicht besessene Effekte ausgegraut (wie die Pack-Kacheln): Balken entfärbt, Name gemutet. */}
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: owned ? tint : "#3f3d4a", boxShadow: owned ? `0 0 8px ${tint}66` : undefined }} />
      <span className="block text-[11.5px] font-extrabold leading-tight" style={{ color: selected ? "#e8e6ff" : owned ? "#e3e1ec" : "#7d7a8b",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 27 }}>{fx.name}</span>
      <span className="flex items-center gap-1.5 mt-1 text-[9.5px] font-bold" style={{ color: status.c }}>
        {status.dot && <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: status.dot, boxShadow: `0 0 6px ${status.dot}` }} />}
        {status.label}
      </span>
    </button>
  );
}
