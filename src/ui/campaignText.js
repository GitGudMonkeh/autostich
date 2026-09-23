/* Kampagne — die EINE Quelle für Namen, Texte und Farben der Kampagnen-Stücke.

   Bewusst neben den Panels statt in ihnen: Boss, Reward und Freischaltung tauchen an mehreren
   Stellen auf (Lauf-Start, Spielpanel-Leiste, Auswertung, Auslage, Sieg, Niederlage), und ein
   zweiter Ort für denselben Text driftet. Dieselbe Rolle, die `labels.js` für Skills spielt. */

import { t } from "../i18n/index.js";
import { TIER_META } from "../game/rarity.js";
import { PHASE_ACCENTS } from "./modalStyle.jsx";
import * as CP from "../game/campaign.js";

/* Die drei Durchgänge der Schwellen-Leiste, in der Reihenfolge, in der sie laufen. KEINE neuen
   Farben: Grün ist der Ton eines bestandenen Laufs, Blau der der 2×-Marke auf der Auswertung,
   Gold ist --ac-gold. Sie stehen hier und nicht an den zwei Zeichenstellen, weil Leiste und
   Auswertung nebeneinander gelesen werden — zwei Listen driften genau dort auseinander, wo es
   auffällt. `#5a8ade` ist ein Literal, weil es keinen Token dafür gibt; PHASE_ACCENTS.blue ist
   ein anderes, dunkleres Blau. */
export const PASS_COLORS = [PHASE_ACCENTS.green.c, "#5a8ade", PHASE_ACCENTS.gold.c];

/* Raritätsfarben des Spiels — Ebene 1 kommt nie über „Sehr selten" hinaus, aber die Leiter steht
   vollständig hier, damit spätere Ebenen nichts nachziehen müssen. */
export const tierColor = (tier) => (TIER_META[tier] || {}).color || "#8a8a95";
export const tierLabel = (tier) => (TIER_META[tier] || {}).label || "";

export const bossName = (id) => (id ? t(`campaign.boss.${id}`) : "");
export const bossText = (id) => (id ? t(`campaign.boss.${id}.text`) : "");
export const isEndBoss = (id) => id === CP.END_BOSS.id;

export const unlockName = (id) => (id ? t(`campaign.unlock.${id}`) : "");
export const unlockText = (id) => (id ? t(`campaign.unlock.${id}.text`) : "");

export const axisName = (axis) => (axis ? t(`campaign.axis.${axis}`) : "");

export const rewardName = (id) => (id ? t(`campaign.reward.${id}`) : "");

/* Der Wirkungstext trägt die Zahl der jeweiligen Stufe. `{v}` kommt aus dem Katalog, `{axis}` nur
   beim Feldzeichen — dessen Achse ist ausgewürfelt und steht im Angebot, nicht in der Wahl. */
export function rewardText(id, tier, axis = null) {
  if (!id) return "";
  const v = CP.rewardValue(id, tier);
  return t(`campaign.reward.${id}.text`, { v: v == null ? "" : v, axis: axisName(axis) });
}

/* Millionen mit einer Nachkommastelle, wie sie überall in der Kampagne stehen (5 / 10 / 15 / 25).
   Kein Tausenderpunkt-Mix: die Schwellen sind runde Millionen, die Endscores nicht. */
export const mio = (n) => {
  const x = (n || 0) / 1e6;
  return x >= 10 || Number.isInteger(x) ? String(Math.round(x)) : x.toFixed(1).replace(".", ",");
};
