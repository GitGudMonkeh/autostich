import { chargeConsumerOf, hasThunderGod } from "../game/skills.js";
import { THUNDER_CRIT_MULT } from "../game/constants.js";

// ⚡ Ladung (Blitz-Archetyp) — eigener Block zwischen Battlefield und Build-Panel.
// Lädt in maxCharge Segmenten (Stufe A: 10, Donnergott 15), hellblau. Nur sichtbar, sobald ein
// Blitz-Skill aktiv ist (docs/blitz-archetyp.md, Abschnitt 1).
const LIGHT_BLUE = "#5ec8f0";
const VIOLET = "#8a7de0";
// Label des aktiven Ladungs-Konsumenten (#93 F2: max 1).
const CONSUMER_LABEL = { ionize: "Ionisierung", protectStreak: "Geladene Serie" };

export function ChargeBar({ lightning, skills = [] }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  const full = charge >= maxCharge;
  const consumer = CONSUMER_LABEL[chargeConsumerOf(skills)]; // aktiver Konsument oder undefined
  const thunder = hasThunderGod(skills);
  return (
    <div className="rounded-xl p-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">⚡ Ladung{full && <span style={{ color: LIGHT_BLUE }}> · VOLL GELADEN</span>}</span>
        <span className="font-bold" style={{ color: LIGHT_BLUE }}>{charge} / {maxCharge}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: maxCharge }, (_, i) => {
          const on = i < charge;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: 12,
                background: on ? LIGHT_BLUE : "#26262e",
                boxShadow: on && full ? `0 0 7px ${LIGHT_BLUE}` : undefined,
              }}
            />
          );
        })}
      </div>
      {(consumer || thunder) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {consumer && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${LIGHT_BLUE}22`, color: LIGHT_BLUE, border: `1px solid ${LIGHT_BLUE}66` }}>
              Konsument: {consumer}
            </span>
          )}
          {thunder && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${VIOLET}22`, color: VIOLET, border: `1px solid ${VIOLET}66` }}>
              Donnergott +{THUNDER_CRIT_MULT.toFixed(1).replace(".", ",")}× Crit
            </span>
          )}
        </div>
      )}
    </div>
  );
}
