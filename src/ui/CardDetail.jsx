import { useState, useEffect } from "react";
import { suitName, suitColor, ION_MAX_STACKS, ION_SCORE_PER_STACK, ION_CRIT_PP_PER_STACK, ICE_LAYER_MAX,
         PLANT_GREEN_THRESHOLD, PLANT_VALUE_CAP, WURZELSCHLAG_PER_GROWTH } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { familyDef } from "../game/families.js";
import { layerValue, layerScore } from "../game/skills.js";
import { PLANT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { formationLabel } from "./formationLabels.js";
import { formationBorder } from "./formationStyle.js"; // Rahmenfarbe = Anzahl Formationen (grau/grün/blau/lila/gold), wie die Kacheln

const fmt = (x) => x.toFixed(2).replace(".", ",");
// #UI: Wachstum/Überlauf sind durch das Skill-Gating gebrochen (z. B. 4,333…) → auf EINE Nachkommastelle runden.
const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");

/* Detailanzeige einer angetippten Karte (Issue #95, Punkt 5): Rolle(n) und alle aktiven
   Modifikatoren. Wird unter der Kachelfläche in Chronik-Übersicht UND Formationsphase genutzt.
   Rollen-Chips sind anklickbar → klappen die Perk-Beschreibung auf (touch-tauglich, plus Hover-Titel). */
export function CardDetail({ card, pos, posForm, roles, familyTiers = {}, frostReadout = false, frostLayers = 0, frostGletscher = false,
                            plantReadout = false, plantGrowth = 0, plantRoots = 0, plantPfahl = false, forgedValue = 0, arch = null }) {
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
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#1b1b22", border: `1.5px solid ${formationBorder(posForm).color || "#5a6672"}` }}>
      <div className="flex items-center gap-2 mb-1.5">
        {pos != null && <span className="opacity-40 tabular-nums">#{pos + 1}</span>}
        <span className="font-bold text-sm" style={{ color: col }}>{suitName(card.suit)} {card.value}</span>
        {permBoost > 0 && <span style={{ color: "#8a7de0" }}>Ursprung {card.baseRank} (+{permBoost} Kartenwert)</span>}
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
          {/* #271: jeder Stapel hebt die Crit-Chance des ganzen Decks (feldweit) — hier der Beitrag dieser Karte. */}
          <Chip c="#8a7de0">+{Math.round(ion * ION_CRIT_PP_PER_STACK * 100)} pp Feld-Crit</Chip>
        </div>
      )}
      {/* Eis (#210): Schicht-Werte einer eingefrorenen Karte — nur in der Aufstellung (frostReadout). Hier stehen die
          konkreten Zahlen, die die Eck-Kristalle auf der Karte bewusst NICHT zeigen: Schichten, Dauerwert (Gletscher =
          superlinear n(n+1)/2, sonst linear), Flat je Frost-Sieg (gedeckelt ≤12) und die Überlauf-Tiefe (Nahrung der Legendären). */}
      {frostReadout && card.frozen && (() => {
        const val = layerValue(frostLayers);
        const scorePerWin = layerScore(frostLayers); // #269: dreieckiger Direkt-Score je Frost-Sieg (der Payoff-Motor)
        const over = Math.max(0, frostLayers - ICE_LAYER_MAX);
        return (
          <div className="flex flex-wrap gap-1.5 items-center mt-1">
            <span className="opacity-45">❄ Schichten:</span>
            <Chip c="#8fcfe6">{frostLayers}</Chip>
            {val > 0 && <Chip c="#8fcfe6">+{val} Stichwert</Chip>}
            {scorePerWin > 0 && <Chip c="#8fcfe6">~{scorePerWin.toLocaleString("de-DE")} Score/Frost-Sieg</Chip>}
            {over > 0 && <Chip c="#e6f7ff">Überlauf {over}</Chip>}
            {/* #219.2 (korrigiert): Der Schicht-Wert ist ein STICHWERT — er wird bei jedem Frost-Sieg auf den Stich
                addiert (iceValueBonus in engine.js: pValue), NICHT dauerhaft in den Kartenwert geschrieben. */}
            {val > 0 && (
              <div className="w-full text-[10px] opacity-55 leading-snug mt-0.5">
                Stichwert = aus {frostLayers} Eisschicht{frostLayers === 1 ? "" : "en"}: jeder Frost-Sieg zählt +{val} auf den Stichwert (nicht dauerhaft im Kartenwert {card.value}).
              </div>
            )}
          </div>
        );
      })()}
      {/* Pflanze (#211): Wachstums-/Reife-Werte in der Aufstellung — Zustand, Wachstum, Wert (bis Deckel), Wurzeln-Score
          je Sieg (Wurzeltiefe + Jahresringe, Pfahlwurzel ×2 in Formation) und die Überlauf-Tiefe (Wachstum über dem, was
          Wurzelschlag zum Wert-Deckel braucht = Nahrung der Pflanze-Legendären). Nur für Pflanzen-Karten (reif ODER wachsend). */}
      {plantReadout && (card.green || plantGrowth > 0) && (() => {
        const ripe = !!card.green;
        const full = ripe && card.value >= PLANT_VALUE_CAP;
        const stateLabel = full ? "Ausgewachsen" : ripe ? "Grün (reif)" : "Setzling";
        const stateCol = full ? PLANT_FULL : ripe ? PLANT_RIPE : "#9aa4a0";
        const need = Math.max(0, PLANT_VALUE_CAP - card.value) * WURZELSCHLAG_PER_GROWTH; // Wachstum bis zum Wert-Deckel
        const overflow = ripe ? Math.max(0, plantGrowth - need) : 0;                      // „alter Wald" (Direkt-Score der Legendären)
        return (
          <div className="flex flex-wrap gap-1.5 items-center mt-1">
            <span className="opacity-45">🌿 Pflanze:</span>
            <Chip c={stateCol}>{stateLabel}</Chip>
            <Chip c={PLANT}>Wachstum {fmt1(plantGrowth)}{ripe ? "" : ` / ${PLANT_GREEN_THRESHOLD}`}</Chip>
            <Chip c={PLANT}>Kartenwert {card.value} / {PLANT_VALUE_CAP}</Chip>
            {ripe && plantRoots > 0 && <Chip c={PLANT}>+{plantRoots} Wurzel-Score/Sieg{plantPfahl ? " (×2 Form.)" : ""}</Chip>}
            {overflow > 0 && <Chip c={PLANT_FULL}>Überlauf {fmt1(overflow)}</Chip>}
          </div>
        );
      })()}
      {/* Feuer (#218): geschmiedeter Dauerwert dieser Karte (state.forged) — der einzige per-Karte-Feuerzustand des
          Spielerdecks (Brand liegt auf Gegnerkarten, Hitze/Asche/Weißglut sind global). ⚒ wie der Karten-Indikator (#206). */}
      {forgedValue > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="opacity-45">🔥 Feuer:</span>
          <Chip c="#e0714a">⚒ Geschmiedet +{forgedValue} Kartenwert</Chip>
        </div>
      )}
      {/* #UI: Architekt-Gebäude, das auf diese Position (Karte) wirkt — Name + die konkreten Effekte an dieser Zelle
          (Wert-Boost · Score-Effekt · Struktur-Faktor). Speist sich aus architectCover (Chronik/Aufstellung). */}
      {arch && (
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="opacity-45">🏗 Gebäude:</span>
          <Chip c={arch.legendary ? "#d4a63a" : arch.color}>{arch.name}{arch.legendary ? " ★" : arch.tier ? ` · Stufe ${arch.tier}` : ""}</Chip>
          {(arch.effects || []).map((e, i) => (
            <Chip key={i} c={arch.legendary ? "#d4a63a" : arch.color}>{e}</Chip>
          ))}
          {(arch.effects || []).length === 0 && <span className="opacity-40">keine direkte Wirkung an dieser Karte</span>}
        </div>
      )}
    </div>
  );
}
