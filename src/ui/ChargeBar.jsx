import { Fragment } from "react";
import { chargeConsumerOf } from "../game/skills.js";
import { IndicatorPanel } from "./indicators/panelKit.jsx";
import { LIGHTNING, CASCADE, CASCADE_BRIGHT } from "./indicators/vocab.js";

// ⚡ Blitz-Motor (Blitz-Archetyp) — eigener Block zwischen Battlefield und Build-Panel. Nur sichtbar, sobald ein
// Blitz-Skill aktiv ist (lightning.active). Zeigt (#220, Aufräumung von #208):
//   • Ladung          das Segment-Maximum (LIGHTNING_MAX_CHARGE, Donnergott 15) — Cyan, glüht bei VOLL.
//   • Serienkette      die selbst-nährende Kette = SERIE (winStreak): das EINZIGE Blitz-Konto, das bei Niederlage
//                     reißt und bei 0 neu zählt (Ladung/Ionisierung/Stau bestehen weiter) → violett-elektrische,
//                     VERBUNDENE Glieder + „×N" über die sichtbare Länge hinaus. Kein Verfalls-Balken (bewusst).
//   • Blitz-Intensität  Ladung + Serie + Crit-Chance auf einen Blick (Formel #220); ⚡-Overcharge ab 100 % Crit.
// Rein anzeige-seitig: liest state.lightning + state.skills + state.winStreak + die (ungeklemmte) Crit-Chance,
// keine Engine-Logik hier. Die Motor-Stationen-Reihe und das Donnergott-Badge aus #208 sind bewusst entfallen
// (überluden das Panel; Donnergott zeigt sich ohnehin über das größere Ladungs-Maximum + Score).
const CONSUMER_LABEL = { ionize: "Ionisierung", protectStreak: "Geladene Serie" };
const CHAIN_VISIBLE = 8;   // sichtbare Kettenglieder; darüber zählt „×N" weiter (winStreak ist ungedeckelt)
const STREAK_FULL = 10;    // Serien-Länge, ab der der Serien-Anteil der Intensität voll (100 %) zählt

// Serienkette → Segment-Kette: VERBUNDENE Glieder (gefüllt = Serienstufen), leading edge glüht. Reißt bei 0 (Niederlage).
function StreakChain({ streak }) {
  const filled = Math.min(streak, CHAIN_VISIBLE);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">🔗 Serienkette{streak > 0 && <span style={{ color: CASCADE_BRIGHT }}> · hält</span>}</span>
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

export function ChargeBar({ lightning, skills = [], winStreak = 0, critChance = 0 }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  const full = charge >= maxCharge;
  const consumer = CONSUMER_LABEL[chargeConsumerOf(skills)]; // aktiver Konsument oder undefined
  const streak = winStreak || 0;

  // Blitz-Intensität (#220): ohne Donnergott bei voller Ladung + Serie ≥ 10 + hoher Crit-Chance auf 100 % erreichbar.
  //   0,40·(Ladung/Max) + 0,40·min(Serie/10, 1) + 0,20·min(CritChance, 1), gedeckelt auf 1.
  // Overcharge: sobald die (ungeklemmte) Crit-Chance ≥ 100 % ist (Crits garantiert), zeigt der Balken „⚡ Überladen"
  //   (voll + darüber hinaus) — passt zu Überschlag (Crit > 100 % → Ladung).
  const critClamped = Math.min(Math.max(critChance, 0), 1);
  const overcharge = critChance >= 1;
  const intensity = Math.min(1,
    0.40 * (maxCharge > 0 ? charge / maxCharge : 0)
    + 0.40 * Math.min(streak / STREAK_FULL, 1)
    + 0.20 * critClamped);
  const intensityPct = Math.round(intensity * 100);

  return (
    <IndicatorPanel className="grid gap-3">
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

      {/* Serienkette (SERIE): reißt bei Niederlage, zählt bei 0 neu; kein Verfalls-Balken. */}
      <StreakChain streak={streak} />

      {/* Blitz-Intensität — Ladung + Serie + Crit-Chance auf einen Blick; ⚡ Overcharge ab 100 % Crit. */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Blitz-Intensität</span>
          <span className="font-bold tabular-nums" style={{ color: overcharge ? CASCADE_BRIGHT : (intensityPct >= 66 ? CASCADE_BRIGHT : LIGHTNING) }}>
            {overcharge ? "⚡ Überladen" : `${intensityPct}%`}
          </span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height: 8 }}>
          <div className="h-full rounded-full transition-all" style={{
            width: overcharge ? "100%" : `${intensityPct}%`,
            background: overcharge
              ? `linear-gradient(90deg, ${CASCADE}, ${CASCADE_BRIGHT}, #ffffff)`
              : `linear-gradient(90deg, ${LIGHTNING}, ${CASCADE}, ${CASCADE_BRIGHT})`,
            boxShadow: overcharge ? `0 0 8px ${CASCADE_BRIGHT}` : undefined,
          }} />
        </div>
      </div>

      {consumer ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: `${LIGHTNING}22`, color: LIGHTNING, border: `1px solid ${LIGHTNING}66` }}>
            Konsument: {consumer}
          </span>
        </div>
      ) : full ? (
        // #223: volle Ladung ohne Konsument ist komplett inert (alle Reaktoren hängen an `consumed`) → dezenter
        // Awareness-Hinweis. Die Garantie (#191) BIETET einen Konsumenten an, erzwingt ihn aber bewusst nicht.
        <div className="text-[11px] leading-snug rounded px-2 py-1.5"
          style={{ background: `${LIGHTNING}14`, color: LIGHTNING, border: `1px solid ${LIGHTNING}44` }}>
          ⚡ Voll — ohne Konsument verpufft die Ladung. Wähle <b>Ionisierung</b> oder <b>Geladene Serie</b>.
        </div>
      ) : null}
    </IndicatorPanel>
  );
}
