/* ============================================================
   ARCHITEKT-EFFEKTTEXTE — EIN Generator für beide Sprachen (#sprache).

   Vorgeschichte: Der Wortlaut lag dreimal im Code, in drei auseinandergelaufenen Fassungen
   (Architekt-Bildschirm, Kartendetail, Core-DB). Die Sprachprüfung hat sie zu `familyEffectText`
   in architect.js zusammengeführt. Für die Übersetzung wandert die Funktion jetzt eine Schicht
   höher: die SATZBAUSTEINE stehen im Katalog (`building.eff.*`, `building.kick.*`), die
   Zahlen-Helfer (tierNum/tierFactor/bindSpanFor) bleiben im Spiel-Layer.

   Warum hier und nicht in architect.js? Ein `import { t }` dort wäre ein Zyklus:
   architect.js → i18n/index.js → de.js → families.js → architect.js.

   Damit gibt es weiterhin GENAU EINEN Wortlaut je Sprache — 41 Familien × bis zu 4 Stufen wären
   sonst über 100 fast identische Katalogeinträge, die einzeln veralten könnten.
   ============================================================ */
import { t, fmtNum } from "./index.js";
import { formationName } from "./labels.js";
import { tierNum, tierFactor, bindSpanFor } from "../game/architect.js";
import { ARCH_STREAK_CAP } from "../game/constants.js";

/* Faktor mit zwei Nachkommastellen, im Zahlformat der aktiven Sprache (1,10 vs. 1.10).

   Bis 26.08.2026 fragte diese Stelle `getLocale() === SOURCE_LOCALE` — also „bin ich Deutsch",
   nicht „welches Dezimalzeichen gilt hier". Mit einer dritten Sprache ist das nicht mehr dasselbe:
   Spanisch wäre in den englischen Zweig gefallen und hätte ×1.10 statt ×1,10 gezeigt. Das war die
   VIERTE Sprachweiche im Code und die einzige außerhalb von index.js — gefunden wurde sie bei der
   Vorbereitung der dritten Sprache, nicht von einem Wächter (die Gebäude-Effekttexte sind erzeugt,
   keine Katalogeinträge, also sieht keine Paritätsprüfung sie).

   `fmtNum` liest die Formattabelle statt eine Sprache zu raten. Die zwei Nachkommastellen kommen
   weiterhin von `toFixed(2)`, weil `fmtNum` allein die Null wegkürzte (×1,40 → ×1,4) und die
   Faktoren sich dann nicht mehr als Reihe lesen. Dasselbe Muster wie `archEffects.js:26`. */
const factor = (x) => fmtNum(x.toFixed(2));

const ROMAN_TIER = { 1: "I", 2: "II", 3: "III", 4: "IV" };

// Joker-Typen als AUSGESCHRIEBENE Namen (nie die rohen Schlüssel), inkl. des per tierKick dazukommenden Typs.
function jokerTypeNames(fam, tier) {
  const types = [...((fam.base && fam.base.types) || [])];
  const k = fam.tierKick;
  if (k && k.addType && (tier === "legendary" || (typeof tier === "number" && tier >= k.at))) types.push(k.addType);
  return types.map(formationName).join("/");
}

export function buildingEffect(fam, tier = 1) {
  if (!fam || !fam.base) return "";
  const base = fam.base, tr = tier, nz = (v) => tierNum(v, tr);
  const isValue = fam.category === "value";
  let s;
  switch (base.kind) {
    case "flat":       s = isValue ? t("building.eff.flat.value", { n: nz(base.value) }) : t("building.eff.flat.score", { n: nz(base.score) }); break;
    case "lowValue":   s = t("building.eff.lowValue", { n: nz(base.value) }); break;
    case "color":      s = isValue ? t("building.eff.color.value", { n: nz(base.value) }) : t("building.eff.color.score", { n: nz(base.score) }); break;
    case "target": {
      const which = t(fam.target === "highest" ? "building.eff.target.highest" : "building.eff.target.lowest");
      s = t(isValue ? "building.eff.target.value" : "building.eff.target.score",
        { which, n: nz(isValue ? base.value : base.score) });
      break;
    }
    case "streak":     s = t("building.eff.streak", { n: nz(base.score), cap: ARCH_STREAK_CAP }); break;
    case "crit":       s = t("building.eff.crit", { n: nz(base.score) }); break;
    case "milestone": {
      const every = (fam.tierKick && fam.tierKick.every && typeof tr === "number" && tr >= fam.tierKick.at)
        ? fam.tierKick.every : base.every;
      s = t("building.eff.milestone", { every, n: nz(base.score) });
      break;
    }
    case "mult":       s = t("building.eff.mult", { f: factor(base.factor) }); break;
    case "neighbor":   s = t(isValue ? "building.eff.neighbor.value" : "building.eff.neighbor.score",
                            { n: nz(isValue ? base.value : base.score), cap: base.cap }); break;
    case "compound":   s = t("building.eff.compound", { n: nz(base.score) }); break;
    case "segment": {
      const half = t(base.half === "early" ? "building.eff.segment.early" : "building.eff.segment.late");
      s = t(isValue ? "building.eff.segment.value" : "building.eff.segment.score",
        { half, n: nz(isValue ? base.value : base.score) });
      break;
    }
    case "relay":      s = t(base.both ? "building.eff.relay.both" : "building.eff.relay.right", { n: nz(base.score) }); break;
    case "gamble":     s = t("building.eff.gamble", { n: nz(base.score), penalty: base.penalty }); break;
    case "joker":      s = t("building.eff.joker", { types: jokerTypeNames(fam, tr) }); break;
    case "transparentFarb": s = t("building.eff.transparentFarb"); break;
    case "bind":       s = t("building.eff.bind", { span: bindSpanFor(tr) }); break;
    case "crossSeg":   s = t("building.eff.crossSeg"); break;
    case "anker":      s = t("building.eff.anker", { f: factor(tierFactor(base.factor, tr)) }); break;
    case "formMult":   s = t("building.eff.formMult", { f: factor(base.factor) }); break;
    default:           s = ""; break;
  }
  // tierKick: ab Stufe `at` zündet ein QUALITATIVER Zusatz (nicht nur die skalierte Zahl) → sonst als Vorschau markiert.
  if (fam.tierKick && s) {
    const k = fam.tierKick, on = tier === "legendary" || (typeof tr === "number" && tr >= k.at);
    let kick = "";
    if (k.mult) kick = t("building.kick.mult", { f: factor(k.mult) });
    else if (k.critFlatMult) kick = t("building.kick.critFlatMult", { n: k.critFlatMult });
    else if (k.streakDoubleFrom) kick = t("building.kick.streakDoubleFrom", { n: k.streakDoubleFrom });
    else if (k.addType) kick = t("building.kick.addType", { type: formationName(k.addType) });
    else if (k.ankerValue) kick = t("building.kick.ankerValue", { n: k.ankerValue });
    if (kick && !(k.addType && on)) {
      s = on ? t("building.kick.active", { base: s, kick })
             : t("building.kick.preview", { base: s, kick, tier: ROMAN_TIER[k.at] || k.at });
    }
  }
  return s;
}
