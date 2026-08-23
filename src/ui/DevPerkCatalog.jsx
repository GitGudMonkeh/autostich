import { useState } from "react";
import { CATEGORIES, PERK_DEFS } from "../game/perks.js";

import { tierMeta, romanOf } from "../game/rarity.js";
import { familyDef, rarityLabel } from "../i18n/labels.js"; // #sprache
import { t } from "../i18n/index.js"; // #sprache

/* Dev-Run-Perk-Katalog (Test-Layout, nur Preview): statt des Zufallsangebots der KOMPLETTE Perk-Katalog,
   nach Kategorie (A–E + Legendär) aufklappbar. Klick auf eine Familie → Stufe I–IV wählen → onPick({familyId,tier}).
   Flache Legendäre → onPick(perkId). `offer` ist der Voll-Katalog (devCatalog.fullPerkOffer): Familien als
   {familyId,tier}, Legendäre als id-String. Wir zeigen nur, was wirklich im Angebot (also pickbar) ist. */
const CAT_ORDER = ["A", "B", "C", "D", "E"];
const LEG_GOLD = "#d4a63a";

export function DevPerkCatalog({ offer = [], onPick, onDecline }) {
  const [openCat, setOpenCat] = useState("A");        // eine offene Kategorie (Akkordeon)
  const [openFam, setOpenFam] = useState(null);       // aufgeklappte Familie (Stufen sichtbar)

  // Angebot aufschlüsseln: Familien → verfügbare Stufen; flache Legendäre → id-Liste.
  const famTiers = {};
  const legs = [];
  for (const e of offer) {
    if (e && typeof e === "object" && e.familyId) (famTiers[e.familyId] ||= []).push(e.tier);
    else if (typeof e === "string") legs.push(e);
  }
  const famIdsByCat = {};
  for (const fid of Object.keys(famTiers)) {
    const fam = familyDef(fid); if (!fam) continue;
    (famIdsByCat[fam.cat] ||= []).push(fid);
  }

  const sections = CAT_ORDER
    .map((c) => ({ key: c, meta: CATEGORIES[c], fids: (famIdsByCat[c] || []) }))
    .filter((s) => s.fids.length);
  const hasLegs = legs.length > 0;

  const Header = ({ open, onClick, color, label, count }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-body-lg-5 font-bold transition-all"
      style={{ background: open ? `${color}1f` : "#1c1c22", border: `1px solid ${open ? color : "#30303a"}`, color: open ? color : "#c8c8d0" }}>
      <span>{label} <span className="opacity-55 font-normal">· {count}</span></span>
      <span className="opacity-70">{open ? "▲" : "▼"}</span>
    </button>
  );

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="text-body-5 opacity-55">Voll-Katalog (Dev): Kategorie aufklappen → Familie wählen → Stufe klicken.</div>
      {sections.map((s) => (
        <div key={s.key} className="flex flex-col gap-1.5">
          <Header open={openCat === s.key} onClick={() => setOpenCat(openCat === s.key ? null : s.key)}
            color={s.meta.color} label={s.meta.name} count={s.fids.length} />
          {openCat === s.key && (
            <div className="flex flex-col gap-1.5 pl-1">
              {s.fids.map((fid) => {
                const fam = familyDef(fid);
                const tiers = [...new Set(famTiers[fid])].sort((a, b) => a - b);
                const open = openFam === fid;
                // Beschreibung schon auf der Familien-Ebene (repräsentativ: niedrigste Stufe) — erst beim Aufklappen die Stufen.
                const repDesc = (fam.tiers[tiers[0]] || {}).desc || "";
                return (
                  <div key={fid} className="rounded-lg" style={{ background: "#17171c", border: "1px solid #26262e" }}>
                    <button onClick={() => setOpenFam(open ? null : fid)}
                      className="w-full flex items-start justify-between gap-2 px-3 py-2 text-left">
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-body-lg-5" style={{ color: s.meta.color }}>{fam.name}</span>
                        {repDesc && <span className="text-meta-3 opacity-60 leading-snug">{repDesc}</span>}
                      </span>
                      <span className="text-meta-3 opacity-50 shrink-0 mt-0.5 whitespace-nowrap">{open ? "▲ Stufe" : "▼ Stufe"}</span>
                    </button>
                    {open && (
                      <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                        {tiers.map((t) => {
                          const tm = tierMeta(t) || { color: "#8a8a95" };
                          return (
                            <button key={t} onClick={() => onPick({ familyId: fid, tier: t })}
                              title={(fam.tiers[t] || {}).desc || ""}
                              className="px-2.5 py-1 rounded text-body-5 font-bold transition-all hover:-translate-y-0.5"
                              style={{ background: `${tm.color}1f`, color: tm.color, border: `1px solid ${tm.color}88` }}>
                              {romanOf(t)} · {rarityLabel(t)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {hasLegs && (
        <div className="flex flex-col gap-1.5">
          <Header open={openCat === "L"} onClick={() => setOpenCat(openCat === "L" ? null : "L")}
            color={LEG_GOLD} label={t("dev.legendary")} count={legs.length} />
          {openCat === "L" && (
            <div className="grid sm:grid-cols-2 gap-2 pl-1">
              {legs.map((id) => {
                const p = PERK_DEFS[id]; if (!p) return null;
                return (
                  <button key={id} onClick={() => onPick(id)}
                    className="text-left rounded-lg p-3 flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                    style={{ background: "#20202a", border: `1px solid ${LEG_GOLD}88` }}>
                    <div className="font-bold text-body-lg-5" style={{ color: LEG_GOLD }}>{p.label}</div>
                    <div className="text-meta-3 opacity-70 leading-snug">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {onDecline && (
        <button onClick={onDecline} className="self-center mt-2 text-body-5 px-4 py-2 rounded-lg font-bold transition-all hover:brightness-110"
          style={{ background: "#20202a", color: "#9a9aa4", border: "1px solid #3a3a44" }}>
          {t("skill.skipCycle")}
        </button>
      )}
    </div>
  );
}
