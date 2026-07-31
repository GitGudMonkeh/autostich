import { useState, useEffect } from "react";
import { suitName, suitColor, ION_MAX_STACKS, ION_SCORE_PER_STACK, ICE_LAYER_MAX, ICE_ABLAGE_SCORE_PER_LAYER } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { familyDef } from "../game/families.js";
import { layerValue } from "../game/skills.js";
import { formationLabel } from "./formationLabels.js";

const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Detailanzeige einer angetippten Karte (Issue #95, Punkt 5): Rolle(n) und alle aktiven
   Modifikatoren. Wird unter der Kachelfläche in Chronik-Übersicht UND Formationsphase genutzt.
   Rollen-Chips sind anklickbar → klappen die Perk-Beschreibung auf (touch-tauglich, plus Hover-Titel). */
export function CardDetail({ card, pos, posForm, roles, familyTiers = {}, frostReadout = false, frostLayers = 0, frostGletscher = false }) {
  const [openRole, setOpenRole] = useState(null); // aktuell aufgeklappte Rolle (perkId)
  useEffect(() => { setOpenRole(null); }, [card?.id]); // Karte gewechselt → Beschreibung schließen

  if (!card) {
    return <div className="text-xs opacity-40 py-1.5">Karte antippen für Rolle & Modifikatoren …</div>;
  }
  const col = suitColor(card.suit);
  const permBoost = card.baseRank != null ? card.value - card.baseRank : 0;
  const forms = (posForm && posForm.formations) || [];
  const ion = card.ionStacks || 0;
  // Rollen-Chips: flacher Perk (PERK_DEFS) ODER Familie (FAMILY_DEFS, Kat. C) → Name + Beschreibung.
  // Familien-Beschreibung kommt aus der aktuell GEHALTENEN Stufe (familyTiers), sonst blieb der Text leer (#Leibwache-Bug).
  const roleEntries = Object.entries(roles || {})
    .filter(([, ids]) => (ids || []).includes(card.id))
    .map(([pid]) => {
      const fam = familyDef(pid);
      const famDesc = fam ? (fam.tiers[familyTiers[pid] || 1]?.desc || "") : "";
      return { pid, label: PERK_DEFS[pid]?.label || fam?.name || pid, desc: PERK_DEFS[pid]?.desc || famDesc };
    });

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
      {openRole && (() => {
        const desc = roleEntries.find((r) => r.pid === openRole)?.desc;
        return desc ? (
          <div className="text-[11px] mt-1 px-2 py-1 rounded leading-snug" style={{ background: "#d4a63a12", color: "#e8e0c8" }}>
            {desc}
          </div>
        ) : null;
      })()}
      <div className="flex flex-wrap gap-1.5 items-center mt-1">
        <span className="opacity-45">Formationen:</span>
        {forms.length
          ? forms.map((f, i) => (
              <Chip key={i} c={f.factor > 1 ? "#5ab87a" : "#8a8a92"}>
                {formationLabel(f.type)}{f.factor > 1 ? ` ×${fmt(f.factor)}` : " (Mitglied)"}
              </Chip>
            ))
          : <span className="opacity-40">keine</span>}
      </div>
      {ion > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="opacity-45">Ionisierung:</span>
          <Chip c="#5ec8f0">⚡ {ion}/{ION_MAX_STACKS} · +{ion * ION_SCORE_PER_STACK} Score</Chip>
        </div>
      )}
      {/* Eis (#210): Schicht-Werte einer eingefrorenen Karte — nur in der Aufstellung (frostReadout). Hier stehen die
          konkreten Zahlen, die die Eck-Kristalle auf der Karte bewusst NICHT zeigen: Schichten, Dauerwert (Gletscher =
          superlinear n(n+1)/2, sonst linear), Flat je Frost-Sieg (gedeckelt ≤12) und die Überlauf-Tiefe (Nahrung der Legendären). */}
      {frostReadout && card.frozen && (() => {
        const val = layerValue(frostLayers, frostGletscher);
        const flat = ICE_ABLAGE_SCORE_PER_LAYER * Math.min(frostLayers, ICE_LAYER_MAX);
        const over = Math.max(0, frostLayers - ICE_LAYER_MAX);
        return (
          <div className="flex flex-wrap gap-1.5 items-center mt-1">
            <span className="opacity-45">❄ Schichten:</span>
            <Chip c="#8fcfe6">{frostLayers}{frostGletscher ? " · Gletscher" : ""}</Chip>
            {val > 0 && <Chip c="#8fcfe6">+{val} Dauerwert</Chip>}
            {flat > 0 && <Chip c="#8fcfe6">+{flat} je Frost-Sieg</Chip>}
            {over > 0 && <Chip c="#e6f7ff">Überlauf {over}</Chip>}
          </div>
        );
      })()}
    </div>
  );
}
