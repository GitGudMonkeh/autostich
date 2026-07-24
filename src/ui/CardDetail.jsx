import { useState, useEffect } from "react";
import { suitName, suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";

// Anzeigenamen der Formationstypen (lang) für die Detailzeile.
const FORM_NAME = { wiederholung: "Wiederholung", farbblock: "Farbblock", treppe: "Treppe", wechsel: "Wechsel", anker: "Anker" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Detailanzeige einer angetippten Karte (Issue #95, Punkt 5): Rolle(n) und alle aktiven
   Modifikatoren. Wird unter der Kachelfläche in Chronik-Übersicht UND Formationsphase genutzt.
   Rollen-Chips sind anklickbar → klappen die Perk-Beschreibung auf (touch-tauglich, plus Hover-Titel). */
export function CardDetail({ card, pos, posForm, roles }) {
  const [openRole, setOpenRole] = useState(null); // aktuell aufgeklappte Rolle (perkId)
  useEffect(() => { setOpenRole(null); }, [card?.id]); // Karte gewechselt → Beschreibung schließen

  if (!card) {
    return <div className="text-xs opacity-40 py-1.5">Karte antippen für Rolle & Modifikatoren …</div>;
  }
  const col = suitColor(card.suit);
  const permBoost = card.baseRank != null ? card.value - card.baseRank : 0;
  const forms = (posForm && posForm.formations) || [];
  const ion = card.ionStacks || 0;
  const roleEntries = Object.entries(roles || {})
    .filter(([, ids]) => (ids || []).includes(card.id))
    .map(([pid]) => ({ pid, label: PERK_DEFS[pid]?.label || pid, desc: PERK_DEFS[pid]?.desc || "" }));

  const Chip = ({ children, c }) => (
    <span className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: (c || "#8a8a92") + "22", color: c || "#c8c8ce" }}>{children}</span>
  );

  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#1b1b22", border: "1px solid #2c2c36" }}>
      <div className="flex items-center gap-2 mb-1.5">
        {pos != null && <span className="opacity-40 tabular-nums">#{pos + 1}</span>}
        <span className="font-bold text-sm" style={{ color: col }}>{suitName(card.suit)} {card.value}</span>
        {permBoost > 0 && <span style={{ color: "#8a7de0" }}>Ursprung {card.baseRank} (+{permBoost} dauerhaft)</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="opacity-45">Rollen:</span>
        {roleEntries.length
          ? roleEntries.map((r) => {
              const open = openRole === r.pid;
              return (
                <button key={r.pid} onClick={() => setOpenRole(open ? null : r.pid)} title={r.desc}
                  className="px-1.5 py-0.5 rounded text-[11px] transition-all cursor-pointer"
                  style={{ background: open ? "#d4a63a44" : "#d4a63a22", color: "#d4a63a",
                           border: `1px solid ${open ? "#d4a63a99" : "transparent"}` }}>
                  {r.label} <span className="opacity-60">{open ? "▾" : "▸"}</span>
                </button>
              );
            })
          : <span className="opacity-40">keine</span>}
      </div>
      {openRole && (
        <div className="text-[11px] mt-1 px-2 py-1 rounded leading-snug" style={{ background: "#d4a63a12", color: "#e8e0c8" }}>
          {PERK_DEFS[openRole]?.desc}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 items-center mt-1">
        <span className="opacity-45">Formationen:</span>
        {forms.length
          ? forms.map((f, i) => (
              <Chip key={i} c={f.factor > 1 ? "#5ab87a" : "#8a8a92"}>
                {FORM_NAME[f.type] || f.type}{f.factor > 1 ? ` ×${fmt(f.factor)}` : " (Mitglied)"}
              </Chip>
            ))
          : <span className="opacity-40">keine</span>}
      </div>
      {ion > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="opacity-45">Ionisierung:</span>
          <Chip c="#5ec8f0">⚡ {ion}/4 · +{ion * 25} Score</Chip>
        </div>
      )}
    </div>
  );
}
