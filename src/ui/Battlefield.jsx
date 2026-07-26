import { useState, useEffect, useRef } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE, suitColor } from "../game/constants.js";
import { linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { audio } from "./audio.js";
import swordicon from "../assets/icons/swordicon.png"; // (#42) Vite bundelt & hasht -> subpfad-sicher

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};
const CRIT_COLOR = "#e879f9";

// #68: vier Streuzonen — gleiche Float-Typen dicht beieinander, verschiedene getrennt. Basis-Lage je Zone.
const FLOAT_ZONES = {
  score:     { left: "7%",  top: "38%" },  // Score-Gewinn (linke Seite, über der Spielerkarte)
  crit:      { left: "50%", top: "2%"  },  // Crit-Text (oben mittig)
  formation: { right: "6%", top: "62%" },  // Formations-Multiplikator (unten rechts)
};
// #105: gestufter Groß-Score-Float — Arcade-Leiter (GREAT→BRUTAL→INSANE→GODLIKE) auf den gewonnenen
// Einzelstich-Score. Höchste erfüllte Stufe gewinnt; oberste bewusst hoch (500k) → „GOTTGLEICH" bleibt selten.
const BIG_SCORE_TIERS = [
  { min: 500000, text: "GOTTGLEICH" },
  { min: 150000, text: "IRRE" },
  { min: 50000,  text: "BRUTAL" },
  { min: 10000,  text: "STARK" },
];
const bigScoreLabel = (g) => { for (const s of BIG_SCORE_TIERS) if (g > s.min) return s.text; return null; };
const JITTER_X = 14, JITTER_Y = 10; // moderate Streuung (px); Panel ist overflow-hidden, nichts läuft raus
const FORM_LINGER_MS = 1500; // Formations-Float bleibt ~1,5 s länger stehen (über den nächsten Stich hinaus) und klingt dann aus
// #110: Karten-Aufdeck-Sound — DEZENTE Turbo-Kopplung der Abspielrate (leicht justierbar). Rate>1 = kürzer/schneller.
const CARDFLIP_RATE_REF = 700;  // ms-Referenz: unter diesem Stich-Takt wird der Sound schneller (bei ~1× bleibt Rate 1)
const CARDFLIP_RATE_CAP = 1.6;  // Deckel bewusst niedrig → bei MAX-Turbo bleibt ein leichtes Überlappen („MG"), wie gewünscht
// Ergebnisabhängige Flip-Lautstärke (tunable): Sieg laut & erkennbar, Niederlage deutlich leiser → klarer
// hörbarer Kontrast Sieg↔Niederlage. Effektiv = Gain × SFX-Lautstärke (Default 0,4 → Sieg 0,6 · Niederlage 0,08).
const CARDFLIP_GAIN = { win: 1.5, win_tie: 1.5, tie: 0.6, loss: 0.2 };
// Deterministischer Jitter aus einem Integer-Seed (kein Math.random im Render, #68) → [-amp, +amp].
const fjitter = (seed, amp) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5; return +(((s - Math.floor(s)) * 2 - 1) * amp).toFixed(1); };

// Respektiert die OS-Einstellung „reduzierte Bewegung" (#15/#19).
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter (ragt nur nach außen).
   `overlay` = entkoppelter Layer im Karten-Slot (z. B. Niederlage-Ghosts), der NICHT pro Stich remountet
   (steht nach `children`, also im selben `relative`-Slot, aber außerhalb des trickNo-gekeyten Karten-Wrappers). */
function Side({ label, remaining, dealFrom, children, overlay = null }) {
  const dir = dealFrom === "left" ? -1 : 1;
  const behind = Math.min(3, Math.max(0, remaining - 1));
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="text-[11px] uppercase tracking-wide opacity-55">{label}</div>
      <div className="relative" style={{ width: 104, height: 144 }}>
        {Array.from({ length: behind }, (_, i) => (
          <div key={i} className="absolute top-0" style={{ left: dir * (i + 1) * 3 }}>
            <CardBack label="" />
          </div>
        ))}
        {children}
        {overlay}
      </div>
      <div className="text-[11px] opacity-55">Deck: {remaining}</div>
    </div>
  );
}

/* #177 Klingenschnitt: Overlay über der Verliererkarte (fixe 104×144-Box). Rendert zwei clip-path-Klone der
   Karte (Ober-/Unterteil entlang −24°), eine aus der Mitte wachsende Schnittlinie in Suit-Farbe und ~18 Funken
   (≈40 % weiß / 60 % Suit-Farbe, ein paar „Konfetti"-Rechtecke). Deterministisch aus `seed` (kein Math.random
   im Render, #68). Alle Dauern kommen an den Flip-Takt gekoppelt rein → kein Überlaufen in den nächsten Stich.
   Elemente entfernen sich mit dem Karten-Remount des nächsten Stichs (key nach trickNo) → kein Stapeln. */
function SliceFx({ cardEl, color, halvesDur, cutDur, sparkDur, seed, delay = 0 }) {
  const N = 18;
  const sparks = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2 + fjitter(seed * 3 + i * 7, 0.55); // gleichmäßiger Kranz + leichter Jitter
    const rad = 46 + Math.abs(fjitter(seed * 5 + i * 13, 70));           // 46..116 px (nach außen gewichtet)
    return {
      i,
      dx: (Math.cos(ang) * rad).toFixed(1),
      dy: (Math.sin(ang) * rad).toFixed(1),
      white: i % 5 < 2,        // ~40 % weiß, Rest Suit-Farbe
      confetti: i % 6 === 0,   // ~3 kleine Konfetti-Rechtecke in Suit-Farbe
    };
  });
  const ease = "cubic-bezier(0.3, 0.7, 0.3, 1)";
  // `delay` (ms) + fill-mode `both`: der Ghost floatet erst (Drift), dann setzt der Schnitt ein — während der
  // Wartezeit zeigen die Hälften den 0 %-Zustand (Karte ganz), Schnittlinie/Funken bleiben unsichtbar.
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Zwei Hälften — Klone der Verliererkarte, entlang der −24°-Schnittkante geteilt (die Polygone tilen die Karte). */}
      <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 100% 34%, 0 66%)",
        animation: `as-slice-top ${halvesDur}ms ${ease} ${delay}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
      <div className="absolute inset-0" style={{ clipPath: "polygon(0 66%, 100% 34%, 100% 100%, 0 100%)",
        animation: `as-slice-bottom ${halvesDur}ms ${ease} ${delay}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
      {/* Schnittlinie: wächst per scaleX aus der Mitte, Länge ≈ Kartenbreite + 16 px, Glow (2×). */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 120, height: 3, marginLeft: -60, marginTop: -1.5,
        background: color, borderRadius: 2, transformOrigin: "center", boxShadow: `0 0 6px ${color}, 0 0 14px ${color}aa`,
        animation: `as-cut-line ${cutDur}ms ease-out ${delay}ms both` }} />
      {/* Funken aus dem Schnittzentrum. */}
      {sparks.map((s) => (
        <div key={s.i} style={{
          position: "absolute", left: "50%", top: "50%",
          width: s.confetti ? 6 : 4, height: s.confetti ? 3 : 4, borderRadius: s.confetti ? 1 : "50%",
          background: s.white ? "#ffffff" : color, boxShadow: `0 0 5px ${s.white ? "#ffffff" : color}`,
          "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
          animation: `as-spark ${sparkDur}ms ease-out ${delay}ms both`, willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

/* #177+: Niederlage-Ghost-Pool. Bei einer Niederlage wird die Spielerkarte in-place ausgeblendet und stattdessen
   ein entkoppelter Klon in diesem Layer (im Spieler-Kartenslot, absolute inset-0) gerendert: erst kurz nach oben
   floaten (as-loss-drift), dann per SliceFx-`delay` schneiden. Weil der Pool NICHT pro Stich remountet, überlappt
   der Ghost bei hohem Turbo/vielen Siegen mit der Karte des nächsten Stichs. Ghosts entfernen sich nach ihrer
   Lebensdauer selbst (gedeckelter Pool). */
function LossGhostLayer({ ghosts }) {
  return (
    <>
      {ghosts.map((g) => (
        <div key={g.id} className="absolute inset-0 pointer-events-none" aria-hidden="true"
          style={{ animation: `as-loss-drift ${g.drift + g.halves}ms cubic-bezier(0.2, 0.6, 0.3, 1) forwards`, willChange: "transform" }}>
          <SliceFx delay={g.drift} color={g.color} halvesDur={g.halves} cutDur={g.cut} sparkDur={g.spark} seed={g.seed}
            cardEl={<Card suit={g.suit} value={g.value} baseRank={g.baseRank} stichBonus={g.stichBonus}
              ionStacks={g.ionStacks} frozen={g.frozen} frostAnimated allyColor={g.allyColor} />} />
        </div>
      ))}
    </>
  );
}

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, flipMs = 1000, pe = {}, heat = null, lightning = null, frozen = 0 }) {
  const reduced = usePrefersReducedMotion();
  const t = lastTrick;
  // F4 Farballianz (#125): Partnerfarbe einer Kartenfarbe → diagonaler Split auf der Karte (rein kosmetisch).
  const allyColorFor = (suit) => { const a = linkedPartnerOf(pe, suit); return a ? suitColor(a) : null; };
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  const isCrit = !!(t && t.isCrit);
  const critColor = CRIT_COLOR;
  const banner = t
    ? (isCrit ? { text: "GEWONNEN · KRITISCH", color: CRIT_COLOR } : BANNER[t.result])
    : null;

  // Effektdauern an den Flip-Takt koppeln; unter reduzierter Bewegung Animationen weglassen
  // (Element bleibt statisch sichtbar statt zu Ende-Opacity 0 zu springen).
  const anim = clamp(flipMs * 0.5, 120, 450);
  // #135: Ergebnis-Puls-Dauer an den Flip-Takt gekoppelt (wie die übrigen „Juice"-Animationen).
  const pulseDur = clamp(flipMs * 0.7, 300, 700);
  const fx = (a) => (reduced ? undefined : a);
  // #95: einheitliche Float-Dauer für Score- UND Formations-Float (letzterer war zuvor kürzer).
  const floatDur = clamp(flipMs * 0.7, 360, 760) + 1300;
  // #95: Float-Größe skaliert mit dem Gewinn — klein bleibt lesbar (20 px), groß gedeckelt (52 px).
  const floatSize = (v) => Math.round(clamp(20 + 9 * Math.log10(Math.max(1, v) / 40), 20, 52));

  // Karten „dealen" nur noch rein — der zusätzliche Pop-Bounce der Gewinnerkarte ist
  // raus (Wunsch: ruhiger). Der Score-/Schaden-Float über der Karte bleibt erhalten.
  const dealStyle = (dealName) => ({ animation: `${dealName} ${anim}ms ease-out` });
  // #135: nach außen wegpulsende Ergebnis-Welle HINTER der Karte (Sieg grün / Niederlage rot / Crit lila &
  // kräftiger). Separates Element → die statischen Karten-Glows (Ion/Frost/Wert) bleiben unberührt. Kein Puls
  // bei reduzierter Bewegung. Liegt als erstes (absolutes) Kind hinter der Karte, die (position:relative) darüber malt.
  const resultPulse = (color, crit) => (!reduced && color) ? (
    <div className="as-result-pulse absolute inset-0" aria-hidden="true"
      style={{ "--pulse-color": color, "--pulse-dur": `${pulseDur}ms`, ...(crit ? { "--pulse-scale": 1.55 } : null) }} />
  ) : null;

  // #177 Klingenschnitt-Timings — an den Flip-Takt gekoppelt (wie das übrige Juice), gedeckelt, damit der Effekt
  // den nächsten Stich nicht verzögert/überläuft. Bei sehr hohem Turbo (winziger flipMs) oder reduzierter Bewegung
  // wird der Slice gar nicht gerendert → Fallback aufs bestehende Ergebnis-Juice (Puls/Glow/Banner).
  const sliceOn  = !reduced && !!t && (win || lost) && flipMs > 170;
  const sHalves  = clamp(flipMs * 0.55, 150, 600);   // Hälften gleiten/rotieren/fallen/faden (~600 ms @1×)
  const sCut     = clamp(flipMs * 0.13, 55, 130);    // Schnittlinie wächst (~120 ms) & fadet
  const sSpark   = clamp(flipMs * 0.5, 150, 520);    // Funken (~500 ms)
  const sWinner  = clamp(flipMs * 0.5, 170, 520);    // Sieger-Ankippen (~500 ms)
  const sDrift   = clamp(flipMs * 0.3, 90, 260);     // Niederlage-Ghost floatet erst kurz (~260 ms @1×), dann Schnitt
  // Suit-Farbe der GESCHNITTENEN (Verlierer-)Karte → Schnittlinie + Funken. Sieg: Gegnerkarte · Niederlage: Spielerkarte.
  const loserColor = sliceOn ? suitColor(win ? t.oCard.suit : t.pCard.suit) : null;
  // Sieg: Gegnerkarte wird in-place geschnitten, Spielerkarte kippt an. Niederlage: Spielerkarte wird NICHT in-place
  // geschnitten, sondern als entkoppelter Ghost (floaten → schneiden, überlappt bei Turbo, s. lossGhosts unten) —
  // in-place bleibt sie nur unsichtbarer Platzhalter; Gegnerkarte (Sieger) kippt an.
  const lossGhost    = sliceOn && lost;   // Spielerkarte verliert → entkoppelter Drift-+-Slice-Ghost
  const oppSliced    = sliceOn && win;    // Gegnerkarte verliert → in-place geschnitten
  const playerWinner = sliceOn && win;    // Spielerkarte gewinnt → kippt an
  const oppWinner    = sliceOn && lost;   // Gegnerkarte gewinnt → kippt an
  const winnerTilt = (dur) => ({ animation: `as-slice-winner ${dur}ms ease-out`, willChange: "transform" });

  // Kartenelemente einmal bauen — als sichtbare Karte, als (unsichtbarer) Größen-Platzhalter unter dem Slice und
  // als Klon-Quelle in SliceFx wiederverwendbar (Elemente sind unveränderliche Beschreibungen → mehrfach nutzbar).
  const pCardEl = t && (
    <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
          stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null}
          ionStacks={t.pCard.ionStacks || 0} frozen={t.pFrozen} frostAnimated allyColor={allyColorFor(t.pCard.suit)} />
  );
  const oCardEl = t && (
    <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null}
          frostbitten={t.oFrostbitten} allyColor={allyColorFor(t.oCard.suit)} />
  );

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={lossGhost ? undefined : dealStyle("as-deal-left")}>
      {resultPulse(win ? (isCrit ? critColor : "#5ab87a") : null, isCrit)}
      {lossGhost ? (
        <div style={{ opacity: 0 }} aria-hidden="true">{pCardEl}</div>   /* in-place unsichtbar — der entkoppelte Ghost (Side-overlay) floatet + schneidet */
      ) : playerWinner ? (
        <div style={winnerTilt(sWinner)}>{pCardEl}</div>   /* Sieger kippt an */
      ) : pCardEl}
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={oppSliced ? undefined : dealStyle("as-deal-right")}>
      {resultPulse(lost ? "#e0605a" : null, false)}
      {oppSliced ? (
        <>
          <div style={{ opacity: 0 }} aria-hidden="true">{oCardEl}</div>{/* hält die 104×144-Box */}
          <SliceFx cardEl={oCardEl} color={loserColor} halvesDur={sHalves} cutDur={sCut} sparkDur={sSpark} seed={t.trickNo * 3 + 1} />
        </>
      ) : oppWinner ? (
        <div style={winnerTilt(sWinner)}>{oCardEl}</div>   /* Sieger kippt an */
      ) : oCardEl}
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const critMultStr = t ? (Number.isInteger(t.critMultiplier) ? t.critMultiplier : Math.round(t.critMultiplier * 100) / 100) : 2;

  // Formations-Feedback (§17): benannte Formation + Multiplikator; Peak-Styling ab ×6 / ×12.
  const FORM_NAME = { wiederholung: "WIEDERHOLUNG", farbblock: "FARBBLOCK", treppe: "TREPPE", wechsel: "WECHSEL", anker: "ANKER", nachhall: "NACHHALL", formationskern: "KERN" };
  const formMult = t ? (t.formationMult || 1) : 1;
  const showFormation = win && t && formMult > 1.001;
  const activeForms = t ? (t.formations || []).filter((f) => f.factor > 1) : [];
  const formLabel = activeForms.length === 1 ? FORM_NAME[activeForms[0].type] : "FORMATION";
  const formationStr = formMult.toFixed(2).replace(".", ",");
  const formPeak = formMult >= 12 ? 2 : formMult >= 6 ? 1 : 0; // 0 normal · 1 verstärkt · 2 Peak
  // #128: Float-Farbe = Rahmenfarbe der Übersicht — Tier nach Formations-Anzahl (formationBorder, kein Drift).
  const formColor = formationBorder({ mult: formMult, formations: (t && t.formations) || [] }).color || "#5ab87a";
  // #105: großes „Wow"-Wort mittig ab hohem Einzelstich-Score (nur bei Sieg). Höchste erfüllte Stufe.
  const bigScore = win && t && t.gained > 0 ? bigScoreLabel(t.gained) : null;

  // Ergebnis-Aufschlüsselung (§17): kompakte Faktorenkette (Basis → Flats → Serie → Perks → Formation → Crit)
  // aus der Engine-breakdown — exakt die Faktoren der Score-Formel (kein Drift). Nur bei nennenswerten Treffern.
  const bd = win && t ? t.breakdown : null;
  const nq = (x) => x.toFixed(2).replace(".", ",");
  const chain = [];
  if (bd) {
    chain.push({ main: `${bd.base}`, label: "Basis", c: "#c8c8ce" });
    if (bd.flats > 0.5)        chain.push({ main: `+${Math.round(bd.flats)}`, label: "Flats", c: "#5ab87a" });
    if (bd.streakMult > 1.001) chain.push({ main: `×${nq(bd.streakMult)}`, label: "Serie", c: "#5a8ade" });
    if (bd.perkMult > 1.001)   chain.push({ main: `×${nq(bd.perkMult)}`, label: "Perks", c: "#8a7de0" });
    if (bd.formMult > 1.001)   chain.push({ main: `×${nq(bd.formMult)}`, label: "Form", c: "#5ab87a" });
    if ((bd.afterglowMult || 1) > 1.001) chain.push({ main: `×${nq(bd.afterglowMult)}`, label: "Nachhall", c: "#5ab87a" });
    if ((bd.coreMult || 1) > 1.001)      chain.push({ main: `×${nq(bd.coreMult)}`, label: "Kern", c: "#d4a63a" });
    if (bd.critMult > 1.001)   chain.push({ main: `×${nq(bd.critMult)}`, label: "Crit", c: critColor });
  }
  // Panel nur zeigen, wenn mehr als eine kleine Serie im Spiel ist (Flats/Perks/Formation/Crit oder Serie ≥ +10 %).
  const showBreakdown = !!bd && (bd.flats > 0.5 || bd.perkMult > 1.001 || bd.formMult > 1.001 || (bd.afterglowMult || 1) > 1.001 || (bd.coreMult || 1) > 1.001 || bd.critMult > 1.001 || bd.streakMult >= 1.10);

  // #49: aufsteigende Zahlen (Score-Gewinn & Lebensverlust) ~1 s länger + Überlappen erlaubt.
  // Statt eines je Stich ersetzten Einzel-Elements ein kleiner Pool — jeder Float lebt unabhängig
  // und entfernt sich nach seiner Dauer selbst, sodass aufeinanderfolgende Floats überlappen.
  const [floats, setFloats] = useState([]);
  const seenTrick = useRef(-1);
  const floatTimers = useRef([]);
  useEffect(() => () => floatTimers.current.forEach(clearTimeout), []); // Timer bei Unmount aufräumen
  useEffect(() => {
    if (!t) { seenTrick.current = -1; setFloats([]); return; }      // Menü/neuer Lauf → Pool leeren
    if (t.trickNo === seenTrick.current) return;
    seenTrick.current = t.trickNo;
    // #110: Karten-Aufdeck-Sound je Stich — startet zeitgleich mit der Flip-Animation (Ergebnis steht bei RESOLVE_TRICK
    // bereits fest → kein Nachhinken). Rate steigt dezent mit dem Turbo (kürzerer flipMs → höhere Rate, gedeckelt).
    audio.play("cardflip", { rate: Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs)), gain: CARDFLIP_GAIN[t.result] ?? 1 });
    const w = t.result === "win" || t.result === "win_tie";
    const dur = floatDur; // #68/#95: lange Float-Dauer, geteilt mit dem Formations-Float
    const critC = t.isCrit ? CRIT_COLOR : "#d4a63a";
    const entries = [];
    // V2: nur noch der Score-Gewinn floatet (Leben/Schaden entfernt).
    if (w && t.gained > 0)
      entries.push({ id: `s${t.trickNo}`, zone: "score", dur, seed: t.trickNo * 2, value: t.gained,
                     text: `+${Math.round(t.gained * 10) / 10}`, color: critC });
    if (!entries.length) return;
    setFloats((cur) => [...cur, ...entries].slice(-6)); // Pool gedeckelt — kein unbegrenztes Stapeln
    const ids = entries.map((e) => e.id);
    const tm = setTimeout(() => setFloats((cur) => cur.filter((f) => !ids.includes(f.id))), dur);
    floatTimers.current.push(tm);
  }, [t?.trickNo]);

  // #177+: Niederlage-Ghost-Pool — entkoppelt vom Stich-Takt (wie der Score-Float-Pool), damit die geschnittene
  // Spielerkarte erst hochfloatet, dann zerschneidet und bei hohem Turbo/vielen Siegen mit dem nächsten Stich
  // überlappt. Jeder Ghost hält die Timings/Kartendaten SEINES Stichs fest und entfernt sich nach seiner Dauer.
  const [lossGhosts, setLossGhosts] = useState([]);
  const ghostTimers = useRef([]);
  useEffect(() => () => ghostTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setLossGhosts([]); return; }        // Menü/neuer Lauf → Pool leeren
    if (!(sliceOn && lost)) return;                // nur bei einer echten (animierten) Niederlage spawnen
    const ghost = {
      id: `g${t.trickNo}`, color: suitColor(t.pCard.suit), seed: t.trickNo * 2 + 7,
      drift: sDrift, halves: sHalves, cut: sCut, spark: sSpark,
      suit: t.pCard.suit, value: t.pCard.value, baseRank: t.pCard.baseRank, stichBonus: t.pValue - t.pCard.value,
      ionStacks: t.pCard.ionStacks || 0, frozen: t.pFrozen, allyColor: allyColorFor(t.pCard.suit),
    };
    setLossGhosts((cur) => [...cur, ghost].slice(-4)); // Pool gedeckelt
    const tm = setTimeout(() => setLossGhosts((cur) => cur.filter((g) => g.id !== ghost.id)), sDrift + sHalves + 80);
    ghostTimers.current.push(tm);
  }, [t?.trickNo]);

  // Formations-Float: soll ~1,5 s LÄNGER stehen bleiben als sein Stich, dann sanft ausklingen. Deshalb vom aktuellen
  // Stich entkoppelt in eigenem State. Ein Formations-Sieg setzt ihn (Phase „aktiv" = hält bei Opacity 1); sobald ein
  // Folgestich ihn nicht mehr zeigt, klingt er über FORM_LINGER_MS aus und wird entfernt. In Pause (kein Folgestich)
  // bleibt er stehen. `key` = Stich-Nr. → derselbe Float bleibt beim Ausklang erhalten (kein Remount/Neustart).
  const [formFloat, setFormFloat] = useState(null);
  const formOutTimer = useRef(null);
  useEffect(() => () => clearTimeout(formOutTimer.current), []);
  useEffect(() => {
    if (!t) { setFormFloat(null); return; }
    if (showFormation) setFormFloat({ key: t.trickNo, label: formLabel, mult: formationStr, color: formColor, peak: formPeak });
  }, [t?.trickNo, showFormation, formLabel, formationStr, formColor, formPeak]);
  // „Verlässt gerade": der Float gehört zu einem früheren Stich als dem aktuell gezeigten Formations-Sieg.
  const formLeaving = !!formFloat && formFloat.key !== (t ? t.trickNo : null);
  useEffect(() => {
    clearTimeout(formOutTimer.current);
    if (formLeaving) formOutTimer.current = setTimeout(() => setFormFloat(null), FORM_LINGER_MS); // nach dem Ausklang entfernen
  }, [formLeaving, formFloat?.key]);

  // --- Archetyp-Ambiente hinter den Karten (#142 Feuer / #143 Blitz / #144 Eis), rein kosmetisch ---
  // Werte kommen aus dem State; ohne aktiven Archetyp bleibt alles unsichtbar (0 → kein Effekt).
  const heatRatio  = heat?.active ? clamp((heat.value || 0) / (heat.max || 100), 0, 1) : 0;
  const charge     = lightning?.active ? (lightning.charge || 0) : 0;
  const maxCharge  = lightning?.maxCharge || 10;
  const chargeR    = clamp(charge / maxCharge, 0, 1);
  const lightOn    = !!lightning?.active && charge >= 2;   // Blitz-Rahmen erst ab Ladung 2 (#143)
  const chargeFull = lightOn && charge >= maxCharge;
  const frostN     = clamp(Math.round(frozen || 0), 0, 5);
  const frostOn    = frostN >= 2;                          // Eis-Rahmen ab 2 Karten, Maximum bei 5 (#144)
  const frostF     = frostOn ? (frostN - 1) / 4 : 0;       // Stufen-Meter: 2→0,25 · 3→0,5 · 4→0,75 · 5→1,0
  // Panel-Rand: bei aktivem Blitz elektrisch blau (voll: violett), sonst Standard.
  const panelBorder = chargeFull ? "1px solid rgba(138,125,224,0.75)"
    : lightOn ? `1px solid rgba(94,200,240,${(0.35 + 0.5 * chargeR).toFixed(2)})`
    : "1px solid #26262e";
  // Äußerer Bloom als panel-eigenes box-shadow (NICHT vom overflow-hidden geklippt): Feuer bei hoher Hitze,
  // Blitz ab Ladung 2 (+ violetter Bloom bei voll). Leer → CRT-Skin-Glow bleibt unangetastet.
  const outerParts = [];
  if (heatRatio >= 0.55) outerParts.push(`0 0 ${Math.round(18 * heatRatio)}px ${Math.round(4 * heatRatio)}px rgba(224,113,74,${(0.22 * heatRatio).toFixed(2)})`);
  if (lightOn)           outerParts.push(`0 0 ${Math.round(12 + 24 * chargeR)}px ${Math.round(chargeR * 4)}px rgba(94,200,240,${(0.14 + 0.34 * chargeR).toFixed(2)})`);
  if (chargeFull)        outerParts.push("0 0 44px 8px rgba(138,125,224,0.32)");
  const outerGlow = outerParts.length ? outerParts.join(", ") : undefined;

  return (
    <div className="rounded-xl p-6 overflow-hidden as-panel relative" style={{ background: "#17171c", border: panelBorder, boxShadow: outerGlow }}>
      {/* Feuer-Glut (#142): warmer Radial-Verlauf von unten + innerer Glow, Deckkraft = Hitze-Verhältnis.
          Puls ab ~90 %. Liegt zuunterst (z-0), hinter Eis und Karten. */}
      {heatRatio > 0.001 && (
        <div aria-hidden="true"
          className={`absolute inset-0 rounded-xl pointer-events-none${heatRatio >= 0.9 && !reduced ? " as-heat-pulse" : ""}`}
          style={{ zIndex: 0, opacity: heatRatio,
                   background: "radial-gradient(135% 95% at 50% 122%, #f0a83a55 0%, #e0714a44 34%, transparent 68%)",
                   boxShadow: "inset 0 -28px 66px -10px #e0714a99, inset 0 0 54px #e0714a2e" }} />
      )}
      {/* Eis-Frost (#144): weicher Frost-Rand (Inset-Glow als Stufen-Meter) + super-soft geblurrte Ecken.
          Über der Feuer-Glut (z-1), unter den Karten. Schimmer bei 5. */}
      {frostOn && (
        <div aria-hidden="true"
          className={`absolute inset-0 rounded-xl pointer-events-none${frostN >= 5 && !reduced ? " as-frost-pulse" : ""}`}
          style={{ zIndex: 1, boxShadow: `inset 0 0 ${Math.round(6 + 26 * frostF)}px ${Math.round(1 + 7 * frostF)}px rgba(191,233,247,${(0.2 + 0.55 * frostF).toFixed(2)})` }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none"
            style={{ opacity: 0.35 + 0.55 * frostF }}>
            <defs><filter id="as-frostblur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5.5" /></filter></defs>
            <g fill="#dff3fb" filter="url(#as-frostblur)">
              <polygon points="0,0 48,0 30,11 41,21 22,27 11,41 0,31" />
              <polygon points="200,0 152,0 171,10 159,21 181,26 191,41 200,32" />
              <polygon points="0,120 45,120 28,109 43,99 21,94 9,81 0,90" />
              <polygon points="200,120 155,120 173,110 157,99 183,95 192,82 200,91" />
            </g>
          </svg>
        </div>
      )}
      {/* Blitz-Rahmen (#143): innerer blauer Glow, Intensität = Ladung (ab 2). Voll → violetter Akzent + Puls. */}
      {lightOn && (
        <div aria-hidden="true"
          className={`absolute inset-0 rounded-xl pointer-events-none${chargeFull && !reduced ? " as-charge-pulse" : ""}`}
          style={{ zIndex: 2, boxShadow: `inset 0 0 ${Math.round(8 + 22 * chargeR)}px ${Math.round(1 + 5 * chargeR)}px rgba(94,200,240,${(0.16 + 0.5 * chargeR).toFixed(2)})${chargeFull ? ", inset 0 0 40px 6px rgba(138,125,224,0.42)" : ""}` }} />
      )}
      {/* Ein Blitz ⚡ oben mittig am Rahmen (#143), Glow steigt mit der Ladung; voll → Puls + „VOLL GELADEN". */}
      {lightOn && (
        <div aria-hidden="true"
          className={`absolute pointer-events-none${chargeFull && !reduced ? " as-charge-pulse" : ""}`}
          style={{ left: "50%", top: 3, transform: "translateX(-50%)", zIndex: 3, fontSize: 20, lineHeight: 1,
                   opacity: 0.5 + 0.5 * chargeR,
                   filter: `drop-shadow(0 0 ${Math.round(4 + 8 * chargeR)}px #5ec8f0)${chargeFull ? " drop-shadow(0 0 10px #8a7de0)" : ""}` }}>
          ⚡
          {chargeFull && (
            <div className="font-pixel-dense" style={{ position: "absolute", top: 21, left: "50%", transform: "translateX(-50%)", fontSize: 8, letterSpacing: 1, whiteSpace: "nowrap", color: "#bfe9f7" }}>VOLL GELADEN</div>
          )}
        </div>
      )}
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-Text (#33) — bei reduzierter Bewegung statisch „… ×N". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: `calc(${FLOAT_ZONES.crit.left} + ${fjitter(t.trickNo * 5 + 2, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.crit.top} + ${fjitter(t.trickNo * 5 + 9, JITTER_Y)}px)`,
                     fontSize: 26, color: critColor, textShadow: `0 0 12px ${critColor}aa`,
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900) + 1000}ms ease-out forwards`) }}>
            KRITISCH{reduced ? ` ×${critMultStr}` : "!"}
          </div>
        )}

        <Side label="Du" remaining={remaining} dealFrom="left"
              overlay={lossGhosts.length ? <LossGhostLayer ghosts={lossGhosts} /> : null}>{playerCard}</Side>

        <img src={swordicon} alt="vs" width={46} height={46} draggable="false"
             className="crt-vs-icon shrink-0 select-none" style={{ imageRendering: "pixelated" }} />

        <Side label="Gegner" remaining={remaining} dealFrom="right">{oppCard}</Side>

        {/* Aufsteigende Zahlen (#49/#68): je Typ eigene Streuzone (Score links / Leben rechts) mit
            kleinem, deterministischem Jitter aus trickNo → gleiche Typen dicht, verschiedene getrennt,
            aufeinanderfolgende überlappen nur leicht statt exakt zu stapeln. Pool gedeckelt. */}
        {floats.map((f) => {
          const z = FLOAT_ZONES[f.zone];
          const dx = fjitter(f.seed, JITTER_X), dy = fjitter(f.seed * 1.7 + 3, JITTER_Y);
          const pos = { top: `calc(${z.top} + ${dy}px)` };
          if (z.left != null)  pos.left  = `calc(${z.left} + ${dx}px)`;
          if (z.right != null) pos.right = `calc(${z.right} + ${dx}px)`;
          return (
            <div key={f.id} className="pointer-events-none absolute font-bold whitespace-nowrap"
              style={{ ...pos, color: f.color, fontSize: floatSize(f.value || 0), lineHeight: 1,
                       animation: fx(`as-float ${f.dur}ms ease-out forwards`) }}>
              {f.text}
            </div>
          );
        })}
        {/* Benanntes Formations-Feedback (§17): unten rechts, eigene Bahn; Peak-Styling ab ×6/×12.
            Aus formFloat (stich-entkoppelt): aktiv → as-combo-hold (hält); beim Verlassen → as-combo-out
            (klingt über FORM_LINGER_MS aus) → bleibt so ~1,5 s länger stehen als sein Stich. */}
        {formFloat && (
          <div key={`form${formFloat.key}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ right: `calc(${FLOAT_ZONES.formation.right} + ${fjitter(formFloat.key * 4 + 5, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.formation.top} + ${fjitter(formFloat.key * 4 + 11, JITTER_Y)}px)`,
                     fontSize: formFloat.peak === 2 ? 26 : formFloat.peak === 1 ? 21 : 17,
                     color: formFloat.color,
                     textShadow: `0 0 ${formFloat.peak === 2 ? 16 : formFloat.peak === 1 ? 12 : 10}px ${formFloat.color}${formFloat.peak ? "cc" : "88"}`,
                     animation: fx(formLeaving
                       ? `as-combo-out ${FORM_LINGER_MS}ms ease-out forwards`
                       : `as-combo-hold ${floatDur}ms ease-out forwards`) }}>
            {formFloat.peak === 2 && "★ "}{formFloat.label} ×{formFloat.mult}
          </div>
        )}
        {/* Gestufter Groß-Score-Float (#105): großes Wort mittig, Legendär-Gold, etwas kürzer als die Floats. */}
        {bigScore && (
          <div key={`big${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: "50%", top: "28%", fontSize: 42, color: "#d4a63a", textShadow: "0 0 18px #d4a63aaa",
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${Math.max(700, floatDur - 600)}ms ease-out forwards`) }}>
            {bigScore}
          </div>
        )}
      </div>

      <div className="relative z-10 h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <span className="text-lg font-bold tracking-wide font-pixel as-banner" style={{ color: banner.color }}>{banner.text}</span>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>

      {/* Treffer-Aufschlüsselung (§17): Faktorenkette des letzten nennenswerten Siegs. Feste Höhe → kein Layout-Sprung. */}
      <div className="relative z-10 h-6 mt-1 flex items-center justify-center gap-2 text-[13px] flex-wrap font-pixel-dense">
        {showBreakdown && (
          <>
            {chain.map((s, i) => (
              <span key={i} className="whitespace-nowrap" style={{ color: s.c }}>
                <span className="font-semibold">{s.main}</span>
                <span className="opacity-45 ml-1">{s.label}</span>
              </span>
            ))}
            <span className="opacity-25">=</span>
            <span className="font-bold" style={{ color: isCrit ? critColor : "#e8e8ea" }}>{Math.round(bd.total).toLocaleString("de-DE")}</span>
          </>
        )}
      </div>
    </div>
  );
}
