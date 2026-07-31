// #UI: Menschlich lesbare Architekt-Gebäude-Effekte AN EINER POSITION — für die Kartendetail-Anzeige (CardDetail),
// wenn man in der Kartenübersicht/Aufstellung eine Karte antippt. Bündelt die drei Effektarten, die auf die Karte
// an dieser Position wirken: Wert-Boost (value-Gebäude), Score-Effekt (score-Gebäude) und den Struktur-Faktor
// (Häuserzeile/Spalte/Diagonale). Nutzt die ECHTE Engine-Rechnung (precomputeArchitect + architectValueBonus),
// gespiegelt wie das Overlay → kein Drift. Reine Formatierung; die Zahlen kommen aus dem Precompute.
import { architectValueBonus } from "../game/architect.js";
import { suitName } from "../game/constants.js";

const fmt = (x) => x.toFixed(2).replace(".", ",");

export function architectEffectStrings(pre, pos, card) {
  const out = [];
  const vb = card ? architectValueBonus(pre, pos, card) : 0; // Wert-Boost (konditional wie in der Engine)
  if (vb > 0) out.push(`+${vb} Wert`);
  const sc = pre && pre.score && pre.score[pos];
  if (sc) {
    switch (sc.kind) {
      case "flat":      out.push(`+${sc.amount} Punkte`); break;
      case "mult":      out.push(`×${fmt(sc.factor)} Punkte`); break;
      case "streak":    out.push(`+${sc.amount} Punkte je Serienpunkt`); break;
      case "crit":      out.push(`+${sc.amount} Punkte bei Crit`); break;
      case "color":     out.push(`+${sc.amount} Punkte bei ${suitName(sc.colorChoice)}`); break;
      case "milestone": out.push(`+${sc.amount} Punkte alle ${sc.every} Siege`); break;
      case "target":    out.push(`+${sc.amount} Punkte`); break;
      default: break;
    }
  }
  const sf = pre && pre.segFactor && pre.segFactor[pos];
  if (sf && sf > 1.0001) out.push(`Struktur ×${fmt(sf)}`); // Zeile/Spalte/Diagonale
  return out;
}
