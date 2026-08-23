import { useState } from "react";
import { weekModList } from "../i18n/labels.js"; // #sprache: Wochen-Mods zur Anzeigezeit
import { t } from "../i18n/index.js";
import { DECK_BORDER } from "./modalStyle.jsx"; // #356 deck-getönter Struktur-Rahmen (wie BuildPanel)

/* #381/#385 Gemeinsame Wochen-Modifikatoren-Anzeige (Ranked-Screen UND Battlefield-Panel).
   Anklickbare Chips (nur Name, in Vorzeichen-Farbe; #385 ohne Icon); Klick klappt die Beschreibung (m.text) auf.
   Datenmodell: { id, sign, name, effect, text } — aus pickWeekMods (Lauf) bzw. dem Katalog (Regeln). */

export const MOD_POS = "#5fce86", MOD_NEG = "#ef6f68";

// Gerollte Lauf-Mods (aus pickWeekMods, ROHE deutsche name/text) → i18n-Anzeige über die id. Der rohe
// Mod trägt den seed-gerollten Wert `mag`; der wird in die übersetzte Beschreibung eingesetzt. Ohne das
// zeigten Rangliste/Battlefield-Panel die deutschen Namen/Texte, auch wenn die App auf EN steht.
export function pickedDisplayMods(picked) {
  const cat = Object.fromEntries(weekModList().map((m) => [m.id, m]));
  return (picked || []).map((p) => {
    const w = cat[p.id];
    return { id: p.id, sign: p.sign, effect: p.effect, pair: p.pair,
             name: w ? w.name : p.name, text: w ? w.desc(p.mag) : p.text };
  });
}

// Katalog (Regeln-Reiter) als Anzeige-Mods: text aus desc(min) + Range-/Paar-Hinweis.
export function catalogDisplayMods() {
  return weekModList().map((m) => ({
    id: m.id, sign: m.sign, name: m.name, effect: m.effect, pair: !!m.pair,
    text: m.desc(m.range ? m.range[0] : undefined) + (m.range ? t("weekmods.range", { from: m.range[0], to: m.range[1] }) : ""),
  }));
}

// Ein Chip + (bei offen) das Beschreibungs-Panel darunter. `mods` = Array {id, sign, name, effect, text}.
export function WeekModChips({ mods, size = "md" }) {
  const [open, setOpen] = useState(null);
  if (!mods || !mods.length) return null;
  const pos = mods.filter((m) => m.sign === "pos");
  const neg = mods.filter((m) => m.sign === "neg");
  const openMod = mods.find((m) => m.id === open) || null;
  const pad = size === "sm" ? "px-2 py-0.5 text-meta-3" : "px-2.5 py-1 text-body-1";
  const chip = (m) => {
    const c = m.sign === "pos" ? MOD_POS : MOD_NEG;
    const active = open === m.id;
    return (
      <button key={m.id} type="button" onClick={() => setOpen(active ? null : m.id)}
        className={`inline-flex items-center rounded-full font-semibold transition-all hover:-translate-y-0.5 ${pad}`}
        style={{ background: active ? `${c}33` : "#1a1922", color: c, outline: active ? `1px solid ${c}` : `1px solid ${c}66` }}>
        {m.name}
      </button>
    );
  };
  return (
    <div>
      {pos.length > 0 && <div className="flex flex-wrap gap-1.5">{pos.map(chip)}</div>}
      {pos.length > 0 && neg.length > 0 && <div className="h-px my-1.5" style={{ background: "#2a2833" }} />}
      {neg.length > 0 && <div className="flex flex-wrap gap-1.5">{neg.map(chip)}</div>}
      {openMod && (
        <div className="mt-2 rounded-lg p-2.5 text-body-1 leading-snug"
          style={{ background: "#17161f", border: `1px solid ${(openMod.sign === "pos" ? MOD_POS : MOD_NEG)}44` }}>
          <b style={{ color: openMod.sign === "pos" ? MOD_POS : MOD_NEG }}>{openMod.name}</b>
          <span className="opacity-80"> — {openMod.text}</span>
        </div>
      )}
    </div>
  );
}

// Panel-Fassung fürs Battlefield (Teil 3): as-panel-Rahmen + Abschnitts-Kopf, darunter die Chips. Nur mit aktiven Mods.
export function WeekModPanel({ mods, className = "" }) {
  if (!mods || !mods.length) return null;
  return (
    <div className={`rounded-xl p-4 as-panel as-panel-deck ${className}`}
      style={{ background: "linear-gradient(180deg,#1b1a24,#141019)", border: `1px solid ${DECK_BORDER}` }}>
      <div className="text-meta-3 uppercase tracking-wide opacity-50 mb-2">{t("weekmods.title")}</div>
      <WeekModChips mods={mods} />
    </div>
  );
}
