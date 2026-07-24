import { useState, useEffect, useRef } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE } from "../game/constants.js";
import swordicon from "../assets/icons/swordicon.png"; // (#42) Vite bundelt & hasht -> subpfad-sicher

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};
const CRIT_COLOR = "#e879f9";
const JACKPOT_COLOR = "#d4a63a"; // L5 „Jackpot" (#33): Gold statt Crit-Violett

// #68: vier Streuzonen — gleiche Float-Typen dicht beieinander, verschiedene getrennt. Basis-Lage je Zone.
const FLOAT_ZONES = {
  score:     { left: "7%",  top: "38%" },  // Score-Gewinn (linke Seite, über der Spielerkarte)
  crit:      { left: "50%", top: "2%"  },  // Crit-Text (oben mittig)
  formation: { right: "6%", top: "62%" },  // Formations-Multiplikator (unten rechts)
};
const JITTER_X = 14, JITTER_Y = 10; // moderate Streuung (px); Panel ist overflow-hidden, nichts läuft raus
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

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter (ragt nur nach außen). */
function Side({ label, remaining, dealFrom, children }) {
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
      </div>
      <div className="text-[11px] opacity-55">Deck: {remaining}</div>
    </div>
  );
}

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, flipMs = 1000 }) {
  const reduced = usePrefersReducedMotion();
  const t = lastTrick;
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  const isCrit = !!(t && t.isCrit);
  const jackpot = !!(t && t.jackpot); // L5: Crit ×4 (#33)
  const critColor = jackpot ? JACKPOT_COLOR : CRIT_COLOR;
  const banner = t
    ? (jackpot ? { text: "GEWONNEN · JACKPOT ×4", color: JACKPOT_COLOR }
       : isCrit ? { text: "GEWONNEN · KRITISCH", color: CRIT_COLOR }
       : BANNER[t.result])
    : null;

  // Effektdauern an den Flip-Takt koppeln; unter reduzierter Bewegung Animationen weglassen
  // (Element bleibt statisch sichtbar statt zu Ende-Opacity 0 zu springen).
  const anim = clamp(flipMs * 0.5, 120, 450);
  const fx = (a) => (reduced ? undefined : a);

  // Karten „dealen" nur noch rein — der zusätzliche Pop-Bounce der Gewinnerkarte ist
  // raus (Wunsch: ruhiger). Der Score-/Schaden-Float über der Karte bleibt erhalten.
  const dealStyle = (dealName) => ({ animation: `${dealName} ${anim}ms ease-out` });

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={dealStyle("as-deal-left")}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null}
            ionStacks={t.pCard.ionStacks || 0} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={dealStyle("as-deal-right")}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const critMultStr = t ? (Number.isInteger(t.critMultiplier) ? t.critMultiplier : Math.round(t.critMultiplier * 100) / 100) : 2;

  // Formations-Feedback (§17): benannte Formation + Multiplikator; Peak-Styling ab ×6 / ×12.
  const FORM_NAME = { wiederholung: "WIEDERHOLUNG", farbblock: "FARBBLOCK", treppe: "TREPPE", wechsel: "WECHSEL", anker: "ANKER" };
  const formMult = t ? (t.formationMult || 1) : 1;
  const showFormation = win && t && formMult > 1.001;
  const activeForms = t ? (t.formations || []).filter((f) => f.factor > 1) : [];
  const formLabel = activeForms.length === 1 ? FORM_NAME[activeForms[0].type] : "FORMATION";
  const formationStr = formMult.toFixed(2).replace(".", ",");
  const formPeak = formMult >= 12 ? 2 : formMult >= 6 ? 1 : 0; // 0 normal · 1 verstärkt · 2 Peak

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
    if (bd.critMult > 1.001)   chain.push({ main: `×${nq(bd.critMult)}`, label: jackpot ? "Jackpot" : "Crit", c: critColor });
  }
  // Panel nur zeigen, wenn mehr als eine kleine Serie im Spiel ist (Flats/Perks/Formation/Crit oder Serie ≥ +10 %).
  const showBreakdown = !!bd && (bd.flats > 0.5 || bd.perkMult > 1.001 || bd.formMult > 1.001 || bd.critMult > 1.001 || bd.streakMult >= 1.10);

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
    const w = t.result === "win" || t.result === "win_tie";
    const dur = clamp(flipMs * 0.7, 360, 760) + 1300; // #68: nochmals länger nach oben (aufbauend auf #49)
    const critC = t.isCrit ? (t.jackpot ? JACKPOT_COLOR : CRIT_COLOR) : "#d4a63a";
    const entries = [];
    // V2: nur noch der Score-Gewinn floatet (Leben/Schaden entfernt).
    if (w && t.gained > 0)
      entries.push({ id: `s${t.trickNo}`, zone: "score", dur, seed: t.trickNo * 2,
                     text: `+${Math.round(t.gained * 10) / 10}`, color: critC });
    if (!entries.length) return;
    setFloats((cur) => [...cur, ...entries].slice(-6)); // Pool gedeckelt — kein unbegrenztes Stapeln
    const ids = entries.map((e) => e.id);
    const tm = setTimeout(() => setFloats((cur) => cur.filter((f) => !ids.includes(f.id))), dur);
    floatTimers.current.push(tm);
  }, [t?.trickNo]);

  return (
    <div className="rounded-xl p-6 overflow-hidden as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-/JACKPOT-Text (#33) — bei reduzierter Bewegung statisch „… ×N". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: `calc(${FLOAT_ZONES.crit.left} + ${fjitter(t.trickNo * 5 + 2, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.crit.top} + ${fjitter(t.trickNo * 5 + 9, JITTER_Y)}px)`,
                     fontSize: 26, color: critColor, textShadow: `0 0 12px ${critColor}aa`,
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900)}ms ease-out forwards`) }}>
            {jackpot ? "JACKPOT" : "KRITISCH"}{reduced ? ` ×${critMultStr}` : "!"}
          </div>
        )}

        <Side label="Du" remaining={remaining} dealFrom="left">{playerCard}</Side>

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
            <div key={f.id} className="pointer-events-none absolute text-3xl font-bold whitespace-nowrap"
              style={{ ...pos, color: f.color, animation: fx(`as-float ${f.dur}ms ease-out forwards`) }}>
              {f.text}
            </div>
          );
        })}
        {/* Benanntes Formations-Feedback (§17): unten rechts, eigene Bahn; Peak-Styling ab ×6/×12. */}
        {showFormation && (
          <div key={`form${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ right: `calc(${FLOAT_ZONES.formation.right} + ${fjitter(t.trickNo * 4 + 5, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.formation.top} + ${fjitter(t.trickNo * 4 + 11, JITTER_Y)}px)`,
                     fontSize: formPeak === 2 ? 26 : formPeak === 1 ? 21 : 17,
                     color: formPeak ? "#d4a63a" : "#5ab87a",
                     textShadow: formPeak === 2 ? "0 0 16px #d4a63a" : formPeak === 1 ? "0 0 12px #d4a63aaa" : "0 0 10px #5ab87a88",
                     animation: fx(`as-combo ${clamp(flipMs * 0.85, 360, 820)}ms ease-out forwards`) }}>
            {formPeak === 2 && "★ "}{formLabel} ×{formationStr}
          </div>
        )}
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <span className="text-lg font-bold tracking-wide font-pixel as-banner" style={{ color: banner.color }}>{banner.text}</span>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>

      {/* Treffer-Aufschlüsselung (§17): Faktorenkette des letzten nennenswerten Siegs. Feste Höhe → kein Layout-Sprung. */}
      <div className="h-6 mt-1 flex items-center justify-center gap-2 text-[13px] flex-wrap font-pixel-dense">
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
