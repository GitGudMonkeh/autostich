import { GlacierFormLegend } from "./GlacierFormLegend.jsx";
import FormIcon from "./FormIcon.jsx";
import { formationLabel, formationAbbr } from "./formationLabels.js"; // Namen/Kuerzel: EINE Quelle (Sprachpruefung A12)
import { archFamily, archCatDef } from "../i18n/labels.js"; // #sprache: Gebäudename zur Anzeigezeit
import { t } from "../i18n/index.js";

// #UI: Geteilte Bausteine für Aufstellphase UND Chronik (eine Quelle → keine getrennte Pflege).
const TIER_ROMAN = ["", "I", "II", "III", "IV"];

// Formations-Legende: Typ → Erkennungsregel. Name und Kürzel kommen aus FORMATION_TYPES (kein zweites Register),
// hier steht nur der erklärende Halbsatz. Reihenfolge = Anzeigereihenfolge.
const FORMATION_LEGEND = [
  ["wiederholung",   "≥2 gleiche Werte nebeneinander (×1,25 / ×1,50 / ×1,80, dann +0,40 je weitere)"],
  ["farbblock",      "≥3 Karten gleicher Farbe (ab ×1,35, +0,20 je weitere)"],
  ["treppe",         "≥3 streng steigende Werte, Schritt ≤4 (ab ×1,35, +0,20 je weitere)"],
  ["wechsel",        "≥3 im Zick-Zack, Nachbardifferenz ≥4 (ab ×1,40, +0,20 je weitere)"],
  ["anker",          "eine einzelne Position zählt als Formation (Faktor je Quelle)"],
  ["nachhall",       "der Faktor einer endenden Formation wirkt auf die nächste Karte nach"],
  ["formationskern", "dein gewählter Formationstyp bekommt einen Zusatzfaktor"],
  ["grenzbonus",     "eine Formation läuft über eine Segmentgrenze und zahlt zusätzlich ×1,25"],
];

/* Gebäude-Liste „🏗 Deine Gebäude": antippen lässt den Gebäude-Rahmen am Brett cyan leuchten (inspectBid) — und
   umgekehrt markiert das Antippen einer Karte im Gebäude den Eintrag. Geteilt von FormationPhase & ChronikOverview.
   `onInspect(nextBid)` bekommt die neue Auswahl (oder null); der Aufrufer blendet dabei die Gebäude ein (showArch). */
export function ArchBuildingList({ buildings = [], cover = null, inspectBid = null, onInspect }) {
  if (!buildings.length) return null;
  return (
    <div className="rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
      <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 Deine Gebäude ({buildings.length})</div>
      <div className="text-[10px] opacity-45 mb-1.5">{t("archpanels.tapHint")}</div>
      <div className="grid gap-1">
        {buildings.map((b) => {
          const fam = archFamily(b.familyId); if (!fam) return null;
          const anchor = Math.min(...b.footprint);
          const eff = cover?.[anchor]?.effects?.join(" · ") || "";
          const meta = archCatDef(fam.category) || {};
          const on = inspectBid === b.id;
          return (
            <button key={b.id} id={`arch-bld-${b.id}`} onClick={() => onInspect?.(on ? null : b.id)}
              className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug flex flex-col gap-0.5 transition-all"
              style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                <b>{fam.name}</b>
                <span className="opacity-55">{fam.legendary ? "Legendär" : `Stufe ${TIER_ROMAN[b.tier] || b.tier}`}</span>
              </span>
              {eff && <span className="opacity-75">{eff}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Referenz-Legende „Formationen & Rahmenfarben" — die ausführliche Fassung aus der Aufstellphase, jetzt geteilt mit der
   Chronik (statt einer eigenen Kurzfassung), damit beide dieselbe Erklärung zeigen. Eis-Legende hängt automatisch dran. */
export function FormationLegend({ state = {}, className = "" }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium">
        {/* Sprachprüfung A11/A12: aus FORMATION_TYPES generiert — vorher fehlten Nachhall/Kern/Grenzbonus in der
            Legende, obwohl die Karten-Badges sie zeigen, und der Anker stand mit einem festen Faktor da (×1,25),
            den er nur in einer von mehreren Quellen hat. */}
        {FORMATION_LEGEND.map(([type, rule]) => (
          <div key={type}>
            <b style={{ color: "#8be0a8" }}>{formationAbbr(type)}</b>{" "}
            <span style={{ color: "#6fc48f" }}>{formationLabel(type)}</span> — {rule}
          </div>
        ))}
        <div style={{ color: "#d4a63a" }}>{t("archpanels.roleLegend")}</div>
        <div style={{ color: "#d4a63a" }}>⧉ Überlappung — mehr Formationen = mehr Multiplikator: 2 ×1,5 · 3 ×2 · 4 ×3</div>
        <div style={{ color: "#9a9aa4" }}>Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr Rahmen = mehr Multi · gestrichelt = ohne Multiplikator</div>
      </div>
      <GlacierFormLegend state={state} />
    </div>
  );
}
