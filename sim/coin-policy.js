/* Münz-Ausgaben für die Sim (docs/muenz-oekonomie.md).

   Warum es das gibt: ein Lauf verdient rund 190 Münzen, und die Sim gab bis hierher exakt 0 davon aus —
   alle neun Ausgabe-Aktionen des Reducers kamen in `sim/` nicht vor. Die Münzen verfallen am Laufende (§2),
   ein Restguthaben ist also keine Ersparnis, sondern Abfall. Gemessen wurde die Ökonomie damit an einem
   Spieler, der sie nie betritt — während `coins.js` im eigenen Kopf um Sim-Tuning ihrer Zahlen bittet.

   OPT-IN (`buyCoins`), damit aufgezeichnete Baselines ihre Bedeutung behalten.

   Bewusst NUR vier der neun Flächen. Neuwurf, Fokus rufen und Perk verkaufen hängen daran, was die
   AUFRUFENDE Policy vom aktuellen Angebot hält — eine generische Fassung davon würde den Helfer messen
   statt die Fläche, was in diesem Zweig schon zweimal passiert ist (blinder Formations-Solver, blinde
   Zielwahl). Sie bleiben offen, bis die Policy ihre Präferenz hereinreicht. */
import { energyBuy, coverBuy, upgradeBuy, familyUpgradeBuy, MAX_SKILL_TIER } from "../src/game/coins.js";
import { isLegendarySkill } from "../src/game/skills.js";
import { familyDef } from "../src/game/families.js"; // PERK-Familien — architect.js exportiert denselben Namen für Gebäude
import { greedyFormationStep } from "./formation.js";

/* `reserve` = Münzen, die Baufeld und Energie NICHT antasten dürfen. Gemessen (n=80, gepaart): Skill
   aufwerten allein +92 %, Baufeld allein +16 %, alle vier zusammen nur +64 % — die Flächen konkurrieren um
   dieselbe Börse, und Baufeld/Energie werden früher im Lauf fällig als die Aufwertungen. Ohne Reserve
   verhungert die stärkste Fläche an der schwächeren. Der Wert ist ein Tuning-Parameter, kein Naturgesetz. */
export const ALL_BUYS = { energy: true, cover: true, upgradeSkill: true, upgradeFamily: true, reserve: 40 };

/* Lohnt in DIESER Aufstellphase noch ein Tausch? Der Reducer ist pur und `SWAP_CARDS` rng-frei, also
   beantwortet eine Kopie mit einer Energie die Frage exakt, statt sie zu schätzen. Nötig, weil übrige
   Energie 1 Münze zurückzahlt, gekaufte aber nicht (coins.js, unspentEnergyCoins): ein Kauf ohne nutzbaren
   Tausch ist ein echter Verlust, kein Nullsummenspiel. */
const swapStillPays = (s) => greedyFormationStep({ ...s, formationEnergy: 1 }).type === "SWAP_CARDS";

// Billigster nächster Schritt zuerst — dieselbe Regel, nach der die Aufwert-Bildschirme sortieren
// (coins.js, upgradeSortKey): breit aufwerten, bevor einzelne Einträge in die Tiefe gehen.
function cheapestSkillUpgrade(s) {
  let best = null;
  for (const id of s.skills || []) {
    if (isLegendarySkill(id)) continue;                       // Legendäre tragen keine Stufe
    const tier = (s.skillTiers || {})[id] ?? 0;
    if (tier >= MAX_SKILL_TIER) continue;
    const buy = upgradeBuy(s, tier);
    if (!buy.maxed && buy.can && (!best || buy.price < best.price)) best = { id, price: buy.price };
  }
  return best;
}
function cheapestFamilyUpgrade(s) {
  let best = null;
  for (const [familyId, tier] of Object.entries(s.familyTiers || {})) {
    if (!tier || tier < 1 || !familyDef(familyId)) continue;  // 0 = nicht besessen
    const buy = familyUpgradeBuy(s, tier);
    if (!buy.maxed && buy.can && (!best || buy.price < best.price)) best = { familyId, price: buy.price };
  }
  return best;
}

/* Eine Ausgabe-Action für den aktuellen State — oder null, dann entscheidet die Policy normal weiter.
   Jede zurückgegebene Action MUSS greifen: der Treiber bricht ab, wenn eine Action den State nicht ändert,
   deshalb prüft jeder Zweig Bezahlbarkeit und Vorrat über dieselben Helfer wie der Reducer. */
export function coinStep(s, rng, buys = ALL_BUYS) {
  if (!s || !buys) return null;
  const reserve = buys.reserve || 0;
  const affordable = (buy) => buy.can && (s.coins || 0) - buy.price >= reserve; // Reserve bleibt den Aufwertungen
  switch (s.phase) {
    case "formation": {
      // Nur bei leerer Energie fragen: solange noch welche da ist, tauscht der Solver ohnehin weiter.
      const buy = energyBuy(s);
      if (buys.energy && (s.formationEnergy || 0) === 0 && affordable(buy) && swapStillPays(s)) {
        return { type: "BUY_ENERGY" };
      }
      return null;
    }
    case "architect":
      // Baufeld ist die einzige Ausgabe mit DAUERHAFTER Wirkung; die Treppe (20 → 40) deckelt sie selbst.
      if (buys.cover && affordable(coverBuy(s))) return { type: "BUY_COVER" };
      return null;
    case "levelup": {
      if (buys.upgradeSkill) { const u = cheapestSkillUpgrade(s); if (u) return { type: "UPGRADE_SKILL", skillId: u.id }; }
      if (buys.upgradeFamily) { const u = cheapestFamilyUpgrade(s); if (u) return { type: "UPGRADE_FAMILY", familyId: u.familyId, rng }; }
      return null;
    }
    default:
      return null;
  }
}

/* Als WRAPPER statt als Zweig in randomPolicy: die Ausgabeflächen liegen in `levelup`, `architect` und
   `formation`, und genau die bedienen fixed/faction/greedy/ucb teils selbst — ein Zweig in der Baseline
   erreichte sie gar nicht. So komponiert der Kauf mit jeder Policy, und wer ihn nicht anschaltet, bekommt
   Byte für Byte das alte Verhalten. `buys` wählt einzelne Flächen, damit die Messung sie isolieren kann. */
export const withCoins = (policy, buys = ALL_BUYS) => ({
  name: `${policy.name}+coins`,
  act: (s, rng, mem) => coinStep(s, rng, buys) || policy.act(s, rng, mem),
});
