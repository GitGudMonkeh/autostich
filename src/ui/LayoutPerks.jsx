import { layoutPerks, rarityMeta } from "../game/perks.js";

import { tierColor, romanOf } from "../game/rarity.js";
import { layoutFamilies, perkDef } from "../i18n/labels.js"; // #sprache: Perks zur Anzeigezeit
import { t } from "../i18n/index.js";

/* Aufstellungshilfe (Issue #95 / #166): listet die gehaltenen Perks UND Familien, deren Wirkung von Position/
   Reihenfolge/Nachbarschaft oder Formations-Zugehörigkeit abhängt — damit man beim Aufstellen weiß, worauf es
   ankommt. Genutzt in Formationsphase UND Chronik-Kartenübersicht. */
export function LayoutPerks({ perks, familyTiers = {} }) {
  const ids = layoutPerks(perks);
  const fams = layoutFamilies(familyTiers); // Rarität #167: position-/formationsbezogene Familien (C/E + kuratierte B/D)
  if (!ids.length && !fams.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "#1b1b22", border: "1px solid #5ab87a55" }}>
      {/* #104: Panel als aktiv/informativ kennzeichnen — grüner Akzent (Aufstellungs-Kontext) statt grau-in-grau. */}
      <div className="text-meta-1 uppercase tracking-wide mb-1 font-semibold" style={{ color: "#5ab87a" }}>{t("layoutperks.title")}</div>
      <div className="grid gap-0.5">
        {fams.map((f) => (
          <div key={f.id} className="text-meta-3 leading-snug">
            <span className="font-bold" style={{ color: tierColor(f.tier) }}>{f.name} {romanOf(f.tier)}</span>
            <span className="opacity-55"> — {f.desc}</span>
          </div>
        ))}
        {ids.map((id) => (
          <div key={id} className="text-meta-3 leading-snug">
            <span className="font-bold" style={{ color: rarityMeta(id).color }}>{perkDef(id).label}</span>
            <span className="opacity-55"> — {perkDef(id).desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
