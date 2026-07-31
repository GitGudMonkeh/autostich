import { Fragment } from "react";
import { chargeConsumerOf, hasThunderGod,
  hasUeberspannung, hasBlitzschlag, hasUeberschlag, hasDauerstrom, hasKurzschluss,
  hasSpannungsstau, hasWetterleuchten, hasVoltageArc, hasStaticCharge } from "../game/skills.js";
import { THUNDER_CRIT_MULT, SPANNUNGSSTAU_CAP } from "../game/constants.js";
import { IndicatorPanel } from "./indicators/panelKit.jsx";
import { LIGHTNING, CASCADE, CASCADE_BRIGHT, THUNDER } from "./indicators/vocab.js";

// ⚡ Blitz-Motor (Blitz-Archetyp) — eigener Block zwischen Battlefield und Build-Panel. Nur sichtbar, sobald ein
// Blitz-Skill aktiv ist (lightning.active). Bündelt die „Maschine aus ineinandergreifenden Teilen" (#208):
//   • Motor-Reihe   Funke → Ladung → Kette → Serie → Donnergott — welche Teile aktuell greifen (Energie „fließt").
//   • Ladung        das bestehende Segment-Maximum (LIGHTNING_MAX_CHARGE, Donnergott 15) — Cyan.
//   • Kaskade-Kette  die selbst-nährende Kette = SERIE (winStreak): das EINZIGE Blitz-Konto, das bei Niederlage
//                    reißt und bei 0 neu zählt (Ladung/Ionisierung/Stau bestehen weiter) → violett-elektrische,
//                    VERBUNDENE Glieder + „×N" über die sichtbare Länge hinaus. Kein Verfalls-Balken (bewusst).
//   • Blitz-Intensität  Summen-Balken der Teile auf einen Blick (Gewichtung illustrativ, folgt später dem Score).
// Rein anzeige-seitig: liest state.lightning + state.skills + state.winStreak, keine Engine-Logik hier.
const CONSUMER_LABEL = { ionize: "Ionisierung", protectStreak: "Geladene Serie" };
const CHAIN_VISIBLE = 8; // sichtbare Kettenglieder; darüber zählt „×N" weiter (winStreak ist ungedeckelt)
const STREAK_INTENSITY_REF = 10; // Serien-Länge, ab der der Serien-Anteil der Intensität voll zählt (illustrativ)

const SERIE = "#5a8ade"; // Serien-Blau (identisch zur StatusRail-„Serie" → kein Drift)
const SPARK = "#f0d060"; // Funke: die Zündung (gold, abgesetzt vom Cyan/Violett der Ströme)

// Hält der Build eine der selbst-speisenden Kaskade-Verdrahtungen (Crit/Ionis./Serie → Ladung/Ionis.)? Dann „greift" die Kette.
function cascadeWired(skills) {
  return hasUeberspannung(skills) || hasBlitzschlag(skills) || hasUeberschlag(skills) || hasDauerstrom(skills)
      || hasKurzschluss(skills) || hasSpannungsstau(skills) || hasWetterleuchten(skills) || hasVoltageArc(skills)
      || hasStaticCharge(skills);
}

// Eine Motor-Station: Punkt (aktiv = Farbe + Schein, sonst matt) + winziges Label.
function MotorNode({ label, color, active }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 44 }}>
      <div className="rounded-full transition-all" style={{
        width: 12, height: 12,
        background: active ? color : "#26262e",
        border: `1.5px solid ${active ? color : "#3a3a44"}`,
        boxShadow: active ? `0 0 7px ${color}` : undefined,
      }} />
      <span className="text-[9px] leading-none text-center whitespace-nowrap"
        style={{ color: active ? color : "#6a6a72", fontWeight: active ? 700 : 400 }}>{label}</span>
    </div>
  );
}

// Verbinder zwischen zwei Stationen: fließt (bewegter Farbverlauf) NUR, wenn beide Enden greifen — sonst matt.
// Der Fluss ist eine reine CSS-Animation (as-motor-flow); unter „reduzierte Bewegung" friert sie global ein (statisch).
function MotorLink({ color, flowing }) {
  return (
    <div className={`flex-1 self-start rounded-full${flowing ? " as-motor-flow" : ""}`} style={{
      height: 3, marginTop: 4.5, minWidth: 10,
      ...(flowing
        ? { background: `linear-gradient(90deg, ${color}33 0%, ${color} 50%, ${color}33 100%)`, backgroundSize: "220% 100%" }
        : { background: "#26262e" }),
    }} />
  );
}

// Kaskade → Segment-Kette: VERBUNDENE Glieder (gefüllt = Serienstufen), leading edge glüht. Reißt bei 0 (Niederlage).
function CascadeChain({ streak }) {
  const filled = Math.min(streak, CHAIN_VISIBLE);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">🔗 Kaskade{streak > 0 && <span style={{ color: CASCADE_BRIGHT }}> · Kette hält</span>}</span>
        <span className="font-bold tabular-nums" style={{ color: streak > 0 ? CASCADE_BRIGHT : "#6a6a72" }}>
          {streak > 0 ? `×${streak}` : "gerissen"}
        </span>
      </div>
      <div className="flex items-center">
        {Array.from({ length: CHAIN_VISIBLE }, (_, i) => {
          const on = i < filled;
          const prevOn = i > 0 && i - 1 < filled;
          const leading = on && i === filled - 1; // wachsende Kante glüht heller
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div style={{ width: 5, height: 3, background: on && prevOn ? CASCADE : "#26262e" }} />
              )}
              <div className="flex-1 rounded transition-all" style={{
                height: 11,
                background: on ? (leading ? CASCADE_BRIGHT : CASCADE) : "#26262e",
                boxShadow: leading ? `0 0 7px ${CASCADE}` : undefined,
              }} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function ChargeBar({ lightning, skills = [], winStreak = 0 }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  const full = charge >= maxCharge;
  const consumer = CONSUMER_LABEL[chargeConsumerOf(skills)]; // aktiver Konsument oder undefined
  const thunder = hasThunderGod(skills);
  const wired = cascadeWired(skills);
  const streak = winStreak || 0;
  const stau = lightning.stauBonus || 0;

  // Motor-Stationen: Funke (Zündung/aktiv) → Ladung (charge>0) → Kette (Kaskade verdrahtet) → Serie (streak>0)
  // → Donnergott (nur wenn der legendäre Skill gehalten wird). Jede Station ist an ein ECHTES Feld gebunden.
  const nodes = [
    { key: "spark",   label: "Funke",   color: SPARK,     active: true },
    { key: "charge",  label: "Ladung",  color: LIGHTNING, active: charge > 0 },
    { key: "chain",   label: "Kette",   color: CASCADE,   active: wired },
    { key: "streak",  label: "Serie",   color: SERIE,     active: streak > 0 },
  ];
  if (thunder) nodes.push({ key: "thunder", label: "Donnergott", color: THUNDER, active: true });

  // Blitz-Intensität: gewichtete Summe der Teile (0..1). Gewichtung ILLUSTRATIV (folgt am Ende dem echten Score-
  // Beitrag, #208) — Ladung + Kaskade/Serie + Donnergott + Stau-Rampe auf einen Blick.
  const intensity = Math.min(1,
    0.34 * (maxCharge > 0 ? charge / maxCharge : 0)
    + 0.40 * Math.min(streak / STREAK_INTENSITY_REF, 1)
    + 0.16 * (thunder ? 1 : 0)
    + 0.10 * (SPANNUNGSSTAU_CAP > 0 ? Math.min(stau / SPANNUNGSSTAU_CAP, 1) : 0));
  const intensityPct = Math.round(intensity * 100);

  return (
    <IndicatorPanel className="grid gap-3">
      {/* Motor: welche Teile greifen; Energie fließt die aktiven Verbinder entlang. */}
      <div className="flex items-start">
        {nodes.map((n, i) => (
          <Fragment key={n.key}>
            {i > 0 && <MotorLink color={nodes[i - 1].color} flowing={nodes[i - 1].active && n.active} />}
            <MotorNode label={n.label} color={n.color} active={n.active} />
          </Fragment>
        ))}
      </div>

      {/* Ladung — Segment-Maximum (Cyan), glüht bei VOLL. */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="opacity-60">⚡ Ladung{full && <span style={{ color: LIGHTNING }}> · VOLL GELADEN</span>}</span>
          <span className="font-bold tabular-nums" style={{ color: LIGHTNING }}>{charge} / {maxCharge}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxCharge }, (_, i) => {
            const on = i < charge;
            return (
              <div key={i} className="flex-1 rounded-sm transition-all" style={{
                height: 12,
                background: on ? LIGHTNING : "#26262e",
                boxShadow: on && full ? `0 0 7px ${LIGHTNING}` : undefined,
              }} />
            );
          })}
        </div>
      </div>

      {/* Kaskade → Segment-Kette (SERIE): reißt bei Niederlage, zählt bei 0 neu; kein Verfalls-Balken. */}
      <CascadeChain streak={streak} />

      {/* Blitz-Intensität — Summe der Teile auf einen Blick. */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Blitz-Intensität</span>
          <span className="font-bold tabular-nums" style={{ color: intensityPct >= 66 ? CASCADE_BRIGHT : LIGHTNING }}>{intensityPct}%</span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height: 8 }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${intensityPct}%`,
            background: `linear-gradient(90deg, ${LIGHTNING}, ${CASCADE}, ${CASCADE_BRIGHT})`,
          }} />
        </div>
      </div>

      {(consumer || thunder) && (
        <div className="flex flex-wrap gap-1.5">
          {consumer && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${LIGHTNING}22`, color: LIGHTNING, border: `1px solid ${LIGHTNING}66` }}>
              Konsument: {consumer}
            </span>
          )}
          {thunder && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${THUNDER}22`, color: THUNDER, border: `1px solid ${THUNDER}66` }}>
              Donnergott +{THUNDER_CRIT_MULT.toFixed(1).replace(".", ",")}× Crit
            </span>
          )}
        </div>
      )}
    </IndicatorPanel>
  );
}
