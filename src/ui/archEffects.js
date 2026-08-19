// #UI: Menschlich lesbare Architekt-Gebäude-Effekte AN EINER POSITION — für die Kartendetail-Anzeige (CardDetail),
// wenn man in der Kartenübersicht/Aufstellung eine Karte antippt. Bündelt die drei Effektarten, die auf die Karte
// an dieser Position wirken: Wert-Boost (value-Gebäude), Score-Effekt (score-Gebäude) und den Struktur-Faktor
// (Häuserzeile/Spalte/Diagonale). Nutzt die ECHTE Engine-Rechnung (precomputeArchitect + architectValueBonus),
// gespiegelt wie das Overlay → kein Drift. Reine Formatierung; die Zahlen kommen aus dem Precompute.
//
// Sprachprüfung A13: Die Formations-Rollen (Joker/Bindeglied/Anker/…) kommen jetzt aus `familyEffectText`
// (src/game/architect.js) — derselbe Wortlaut wie im Architekt-Bildschirm und in der Core-DB. Vorher stand hier
// eine dritte, abweichende Fassung, u. a. mit dem Entwickler-Kürzel „(±Span)" im Spielertext.
//
// #arch-eff (19.08.2026) — MIGRIERT. Bis dahin baute diese Datei ihre zehn Sätze aus deutschen Vorlagen
// zusammen (`+${vb} Stichwert`, `+${sc.amount} Score bei ${suit}`, …); im englischen Build stand damit überall
// Deutsch, wo die Liste erscheint: Aufstellungsphase, Chronik, Endscreen und der Level-up-Flügel.
// Die i18n-Ratsche konnte es nicht sehen — ihr Greifer fischt JSX-Textknoten und Text-Props, keine
// Template-Literale in einer Hilfsdatei (dieselbe Lücke wie bei #formlegend).
// Der Wortlaut ist aus dem bestehenden `building.eff.*`-Block und `arch.cell.struct` ÜBERNOMMEN, nicht neu
// erfunden — derselbe Effekt darf nicht zweimal verschieden heißen.
import { architectValueBonus } from "../game/architect.js";
import { buildingEffect } from "../i18n/buildingText.js"; // #sprache: EIN Generator, beide Sprachen
import { suitLabel } from "../i18n/labels.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache

/* Zwei Nachkommastellen über `toFixed(2)`, dann durch `fmtNum` — genau wie `dfmt2` in ArchPanels.jsx:
   `fmtNum` allein kürzt die Nullen weg (×1,40 würde zu ×1,4) und die Faktoren lesen sich nicht mehr als Reihe.
   Das Dezimalzeichen kommt damit aus der Sprache statt aus einem hart gesetzten Komma. */
const fmt = (x) => fmtNum(x.toFixed(2));

// `fam`/`tier` optional (für Formations-Gebäude, die NICHT über pre.value/score laufen, sondern über die
// Formationserkennung architectFormSpec).
export function architectEffectStrings(pre, pos, card, fam = null, tier = 1, alliance = []) {
  const out = [];
  const vb = card ? architectValueBonus(pre, pos, card, alliance) : 0; // #289: Wert-Boost grün-/allianz-bewusst (wie Engine)
  if (vb > 0) out.push(t("arch.eff.value", { n: vb }));
  const sc = pre && pre.score && pre.score[pos];
  if (sc) {
    switch (sc.kind) {
      case "flat":      out.push(t("arch.eff.score", { n: sc.amount })); if (sc.mult) out.push(t("arch.eff.scoreMult", { f: fmt(sc.mult) })); break; // #Pool tierKick (Zollhaus IV)
      case "mult":      out.push(t("arch.eff.scoreMult", { f: fmt(sc.factor) })); break;
      case "streak":    out.push(t("arch.eff.streak", { n: sc.amount })); break;
      case "crit":      out.push(t("arch.eff.crit", { n: sc.amount })); break;
      case "color":     out.push(t("arch.eff.color", { n: sc.amount, suit: suitLabel(sc.colorChoice) })); break;
      case "milestone": out.push(t("arch.eff.milestone", { n: sc.amount, every: sc.every })); break;
      case "target":    out.push(t("arch.eff.score", { n: sc.amount })); break;
      case "gamble":    out.push(t("arch.eff.gamble", { crit: sc.crit, penalty: sc.penalty })); break; // #Pool Batch 4: Crit-Wette
      default: break;
    }
  }
  // Formations-Gebäude: die Rolle in der Formationserkennung im Wortlaut der geteilten Quelle.
  if (fam && fam.category === "formation") {
    const s = buildingEffect(fam, fam.legendary ? "legendary" : tier);
    if (s) out.push(s);
  }
  const rf = pre && pre.relayFlat && pre.relayFlat[pos]; // #Pool Batch 3: eingestaffelter Score (Laufgang von links)
  if (rf > 0) out.push(t("arch.eff.relay", { n: rf }));
  const sf = pre && pre.segFactor && pre.segFactor[pos];
  if (sf && sf > 1.0001) out.push(t("arch.eff.struct", { f: fmt(sf) })); // Zeile/Spalte/Diagonale
  return out;
}
