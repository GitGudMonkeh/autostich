import { suitName, suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";

// Anzeigenamen der Formationstypen (lang) für die Detailzeile.
const FORM_NAME = { wiederholung: "Wiederholung", farbblock: "Farbblock", treppe: "Treppe", wechsel: "Wechsel", anker: "Anker" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Detailanzeige einer angetippten Karte (Issue #95, Punkt 5): Rolle(n) und alle aktiven
   Modifikatoren. Wird unter der Kachelfläche in Chronik-Übersicht UND Formationsphase genutzt. */
export function CardDetail({ card, pos, posForm, roles }) {
  if (!card) {
    return <div className="text-xs opacity-40 py-1.5">Karte antippen für Rolle & Modifikatoren …</div>;
  }
  const col = suitColor(card.suit);
  const permBoost = card.baseRank != null ? card.value - card.baseRank : 0;
  const forms = (posForm && posForm.formations) || [];
  const ion = card.ionStacks || 0;
  const roleLabels = Object.entries(roles || {})
    .filter(([, ids]) => (ids || []).includes(card.id))
    .map(([pid]) => PERK_DEFS[pid]?.label || pid);

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
        {roleLabels.length ? roleLabels.map((l, i) => <Chip key={i} c="#d4a63a">{l}</Chip>) : <span className="opacity-40">keine</span>}
      </div>
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
