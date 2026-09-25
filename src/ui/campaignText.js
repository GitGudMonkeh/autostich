/* Kampagne — die EINE Quelle für Namen und Texte der Kampagnen-Stücke.

   Bewusst neben den Panels statt in ihnen: Boss und Freischaltung tauchen an mehreren Stellen auf
   (Stufen-Start, Spielpanel-Leiste, Übersicht, Sieg, verfehlte Stufe), und ein zweiter Ort für
   denselben Text driftet. Dieselbe Rolle, die `labels.js` für Skills spielt. */

import { t } from "../i18n/index.js";
import * as CP from "../game/campaign.js";

export const bossName = (id) => (id ? t(`campaign.boss.${id}`) : "");
export const bossText = (id) => (id ? t(`campaign.boss.${id}.text`) : "");
export const isEndBoss = (id) => CP.isEndBoss(id);

export const unlockName = (id) => (id ? t(`campaign.unlock.${id}`) : "");
export const unlockText = (id) => (id ? t(`campaign.unlock.${id}.text`) : "");

/* Millionen mit einer Nachkommastelle, wie sie überall in der Kampagne stehen (5 / 10 / 25 / 50 /
   100). Kein Tausenderpunkt-Mix: die Schwellen sind runde Millionen, die Endscores nicht. */
export const mio = (n) => {
  const x = (n || 0) / 1e6;
  return x >= 10 || Number.isInteger(x) ? String(Math.round(x)) : x.toFixed(1).replace(".", ",");
};
