// #UI: Menschlich lesbare Architekt-Gebäude-Effekte AN EINER POSITION — für die Kartendetail-Anzeige (CardDetail),
// wenn man in der Kartenübersicht/Aufstellung eine Karte antippt. Bündelt die drei Effektarten, die auf die Karte
// an dieser Position wirken: Wert-Boost (value-Gebäude), Score-Effekt (score-Gebäude) und den Struktur-Faktor
// (Häuserzeile/Spalte/Diagonale). Nutzt die ECHTE Engine-Rechnung (precomputeArchitect + architectValueBonus),
// gespiegelt wie das Overlay → kein Drift. Reine Formatierung; die Zahlen kommen aus dem Precompute.
//
// Sprachprüfung A13: Die Formations-Rollen (Joker/Bindeglied/Anker/…) kommen jetzt aus `familyEffectText`
// (src/game/architect.js) — derselbe Wortlaut wie im Architekt-Bildschirm und in der Core-DB. Vorher stand hier
// eine dritte, abweichende Fassung, u. a. mit dem Entwickler-Kürzel „(±Span)" im Spielertext.
import { architectValueBonus, familyEffectText } from "../game/architect.js";
import { suitName } from "../game/constants.js";

const fmt = (x) => x.toFixed(2).replace(".", ",");

// `fam`/`tier` optional (für Formations-Gebäude, die NICHT über pre.value/score laufen, sondern über die
// Formationserkennung architectFormSpec).
export function architectEffectStrings(pre, pos, card, fam = null, tier = 1, alliance = []) {
  const out = [];
  const vb = card ? architectValueBonus(pre, pos, card, alliance) : 0; // #289: Wert-Boost grün-/allianz-bewusst (wie Engine)
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
      case "gamble":    out.push(`+${sc.crit} Score bei Crit, sonst −${sc.penalty} Score`); break; // #Pool Batch 4: Crit-Wette
      default: break;
    }
  }
  // Formations-Gebäude: die Rolle in der Formationserkennung im Wortlaut der geteilten Quelle.
  if (fam && fam.category === "formation") {
    const s = familyEffectText(fam, fam.legendary ? "legendary" : tier);
    if (s) out.push(s);
  }
  const rf = pre && pre.relayFlat && pre.relayFlat[pos]; // #Pool Batch 3: eingestaffelter Score (Laufgang von links)
  if (rf > 0) out.push(`+${rf} Score (Staffel)`);
  const sf = pre && pre.segFactor && pre.segFactor[pos];
  if (sf && sf > 1.0001) out.push(`Struktur ×${fmt(sf)}`); // Zeile/Spalte/Diagonale
  return out;
}
