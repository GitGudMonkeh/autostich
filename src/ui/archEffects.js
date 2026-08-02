// #UI: Menschlich lesbare Architekt-Gebäude-Effekte AN EINER POSITION — für die Kartendetail-Anzeige (CardDetail),
// wenn man in der Kartenübersicht/Aufstellung eine Karte antippt. Bündelt die drei Effektarten, die auf die Karte
// an dieser Position wirken: Wert-Boost (value-Gebäude), Score-Effekt (score-Gebäude) und den Struktur-Faktor
// (Häuserzeile/Spalte/Diagonale). Nutzt die ECHTE Engine-Rechnung (precomputeArchitect + architectValueBonus),
// gespiegelt wie das Overlay → kein Drift. Reine Formatierung; die Zahlen kommen aus dem Precompute.
import { architectValueBonus, tierFactor } from "../game/architect.js";
import { suitName } from "../game/constants.js";

const fmt = (x) => x.toFixed(2).replace(".", ",");

// `fam`/`tier` optional (für Formations-Gebäude, die NICHT über pre.value/score laufen, sondern über die
// Formationserkennung architectFormSpec). Wortlaut der Formations-Rollen gespiegelt aus ArchitectScreen.famEff
// (driftsicher aus architect.js), damit Detail-Anzeige und Bauplan-Tooltip dieselbe Sprache sprechen.
export function architectEffectStrings(pre, pos, card, fam = null, tier = 1) {
  const out = [];
  const vb = card ? architectValueBonus(pre, pos, card) : 0; // Wert-Boost (konditional wie in der Engine)
  if (vb > 0) out.push(`+${vb} Stichwert`);
  const sc = pre && pre.score && pre.score[pos];
  if (sc) {
    switch (sc.kind) {
      case "flat":      out.push(`+${sc.amount} Score`); if (sc.mult) out.push(`×${fmt(sc.mult)} Score`); break; // #Pool tierKick (Zollhaus IV)
      case "mult":      out.push(`×${fmt(sc.factor)} Score`); break;
      case "streak":    out.push(`+${sc.amount} Score je Serienpunkt`); break;
      case "crit":      out.push(`+${sc.amount} Score bei Crit`); break;
      case "color":     out.push(`+${sc.amount} Score bei ${suitName(sc.colorChoice)}`); break;
      case "milestone": out.push(`+${sc.amount} Score alle ${sc.every} Siege`); break;
      case "target":    out.push(`+${sc.amount} Score`); break;
      default: break;
    }
  }
  // Formations-Gebäude: Rolle in der Formationserkennung ausformulieren (kein pre-Wert/-Score).
  if (fam && fam.category === "formation" && fam.base) {
    const base = fam.base;
    switch (base.kind) {
      case "joker":           out.push(`Formations-Joker (${(base.types || []).join("/")})`); break;
      case "transparentFarb": out.push("Farbblock-Transparenz"); break;
      case "bind":            out.push("Treppen-Bindeglied (±Span)"); break;
      case "crossSeg":        out.push("öffnet die Segmentgrenze"); break;
      case "anker":           out.push(`jede Zelle = Anker ×${fmt(tierFactor(base.factor, tier))}`); break;
      case "formMult":        out.push(`Formationen hier ×${fmt(base.factor)}`); break;
      default: break;
    }
  }
  const sf = pre && pre.segFactor && pre.segFactor[pos];
  if (sf && sf > 1.0001) out.push(`Struktur ×${fmt(sf)}`); // Zeile/Spalte/Diagonale
  return out;
}
