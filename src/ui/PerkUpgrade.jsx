/* Aufwertphase für PERKS (Owner 2026-09-08: „genauso wie Skills, gleiche Kosten, gleiches Layout").

   Der Zwilling von SkillUpgrade.jsx: die gehaltenen Perk-Familien, je eine mit ihrer NÄCHSTEN Stufe und
   dem, was sie bringt. Erreicht über den Aufwerten-Knopf im Perk-Angebot; der Perk-Zug der Phase bleibt
   unberührt, bezahlt wird nur mit Münzen. Mehrere Aufwertungen je Phase sind erlaubt, auch mehrfach auf
   derselben Familie — nach einer Aufwertung bleibt man deshalb im Bildschirm.

   ZWEI Unterschiede zum Skill-Zwilling, beide aus dem Datenmodell und nicht aus Geschmack:

   1. Familien zählen ihre Stufen ab 1 (0 = nicht besessen), Skills ab 0. Der Versatz lebt an EINER Stelle,
      `familyUpgradeBuy` in coins.js — hier wird nur gezählt, was der Reducer auch zählt.
   2. Manche Stufen fragen nach einem ZIEL (Farben, Karten, Formationstyp). Der Kauf führt dann in den
      vorhandenen Ziel-Picker und kommt danach hierher zurück; der Knopf sagt das vorher, sonst wäre der
      Sprung aus dem Bildschirm heraus eine Überraschung. */

import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx";
import { phaseCard, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { CoinAmount } from "./CoinMark.jsx";
import { tierTextDiff } from "./SkillUpgrade.jsx";   // eine Fassung des Stufen-Diffs, nicht zwei
import { GlossaryText } from "./Glossary.jsx";
import { tierMeta, romanOf, familyTierOf } from "../game/rarity.js";
import { familyUpgradeBuy } from "../game/coins.js";
import { familyDef, perkCat, rarityLabel } from "../i18n/labels.js";
import { t } from "../i18n/index.js";

function TierArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5c5c68" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function FamTierBadge({ tier }) {
  const tm = tierMeta(tier) || { color: "#8a8a95" };
  return (
    <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide"
      style={{ color: tm.color, background: `${tm.color}1f`, border: `1px solid ${tm.color}55` }}>
      {romanOf(tier)} · {rarityLabel(tier)}
    </span>
  );
}

/* Braucht die ZIELSTUFE eine Auswahl? Dieselbe Frage, die der Reducer stellt — hier nur, um es am Knopf
   anzukündigen. Bewusst die reine Definition und nicht der Reducer: die UI darf fragen, nicht entscheiden. */
function needsTarget(fam, roles, familyId, tier) {
  const pt = fam && fam.tiers[tier] && fam.tiers[tier].pickTarget;
  if (!pt) return false;
  if (pt.suits) return pt.suits < 4;                       // volle Farbwahl ist erzwungen → kein Picker
  if (pt.formationType) return true;
  const held = ((roles || {})[familyId] || []).length;
  return Math.max(0, (pt.cards || 0) - held) > 0;
}

function UpgradeRow({ familyId, state, coins, onUpgrade, justRaised }) {
  const tier = familyTierOf(state.familyTiers || {}, familyId);
  const buy = familyUpgradeBuy({ coins }, tier);
  const fam = familyDef(familyId);
  if (!fam) return null;
  const cat = perkCat(fam.cat);
  const cur = fam.tiers[tier] || {};
  const next = buy.maxed ? null : (fam.tiers[buy.next] || {});
  const d = next ? tierTextDiff(cur.desc || "", next.desc || "") : null;
  const tm = tierMeta(buy.maxed ? tier : buy.next) || { color: "#8a8a95" };
  const asks = !buy.maxed && needsTarget(fam, state.roles, familyId, buy.next);
  return (
    <button type="button" disabled={buy.maxed || !buy.can}
      onClick={buy.maxed || !buy.can ? undefined : () => onUpgrade(familyId)}
      className="pu-row as-edge-card text-left rounded-xl p-3 flex flex-col gap-2 transition-all disabled:cursor-not-allowed"
      /* Drei Zustände, drei Helligkeiten — wie beim Skill: bezahlbar (voll), zu teuer (gedämpft, der Kauf
         ist zu sehen aber nicht auszulösen), höchste Stufe (am blassesten). */
      style={{ "--c": buy.maxed ? "#3a3850" : tm.color, opacity: buy.maxed ? 0.42 : (buy.can ? 1 : 0.62) }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-body-lg-5">{fam.name}</span>
        {/* `perkCat` liefert das ganze Kategorie-Objekt (Name, Beschreibung, Farbe) — hier zählt der Name.
            Wer es direkt in den Baum schreibt, bekommt keinen Fehler beim Bauen, sondern eine leere Seite. */}
        {cat && <span className="text-meta-1 px-1.5 py-0.5 rounded" style={{ background: `${cat.color}22`, color: cat.color }}>{cat.name}</span>}
        {justRaised === familyId && (
          <span className="text-meta-1 font-bold inline-flex items-center gap-1" style={{ color: "#4ade80" }}>✓ {t("upgrade.justRaised")}</span>
        )}
        <span className="ml-auto">
          {buy.maxed
            ? <span className="text-meta-1" style={{ color: "#71717c" }}>{t("upgrade.maxTier")}</span>
            : <span className="inline-flex items-center rounded-lg px-2.5 py-1"
                style={{ background: "linear-gradient(180deg,#2a2410,#1d1a12)", border: "1px solid #d4a63a66" }}>
                <CoinAmount n={buy.price} size={11} dim={!buy.can} have={coins} />
              </span>}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <FamTierBadge tier={tier} />
        {!buy.maxed && <><TierArrow /><FamTierBadge tier={buy.next} /></>}
        {/* Der Sprung in die Ziel-Auswahl wird angekündigt, nicht überrascht. */}
        {asks && <span className="text-meta-1" style={{ color: "#8a7de0" }}>{t("upgrade.perk.picksTarget")}</span>}
      </div>
      {d && (
        <div className="text-body-5 leading-snug" style={{ color: "#a6a6b0" }}>
          {d.before && <GlossaryText text={`${d.before} `} />}
          {d.removed && <span style={{ color: "#71717c", textDecoration: "line-through" }}>{d.removed} </span>}
          {d.added && <span className="font-bold" style={{ color: "#e8e8ea" }}><GlossaryText text={d.added} /></span>}
          {d.after && <GlossaryText text={` ${d.after}`} />}
        </div>
      )}
    </button>
  );
}

export function PerkUpgrade({ state = {}, onUpgrade, onClose }) {
  const [justRaised, setJustRaised] = useState(null);
  const coins = state.coins || 0;
  // Nur GEHALTENE Familien (Rang ≥ 1). Flache Perks (PERK_DEFS) tragen keine Stufe und stehen deshalb gar
  // nicht erst in der Liste — ein ausgegrauter Eintrag wäre eine Auskunft über eine Leiter, auf der sie nie standen.
  const ids = Object.keys(state.familyTiers || {}).filter((id) => (state.familyTiers[id] || 0) >= 1 && familyDef(id));
  const raise = (id) => { setJustRaised(id); onUpgrade?.(id); };
  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-5 max-h-[92dvh] overflow-y-auto overlay-card"
        style={phaseCard(PHASE_ACCENTS.violet)}>
        <PhaseHairline />
        <div className="text-center mb-3">
          <div className="text-body-5 uppercase tracking-widest" style={{ color: "#8a7de0" }}>{t("upgrade.perk.eyebrow")}</div>
          <h2 className="text-title-6 font-bold mt-1">{t("upgrade.perk.title")}</h2>
          <p className="text-body-5 opacity-60 mt-1">{t("upgrade.hint")}</p>
        </div>
        {ids.length === 0
          ? <div className="text-body-5 opacity-60 text-center py-6">{t("upgrade.perk.empty")}</div>
          : <div className="grid gap-2">
              {ids.map((id) => (
                <UpgradeRow key={id} familyId={id} state={state} coins={coins} onUpgrade={raise} justRaised={justRaised} />
              ))}
            </div>}
        <button onClick={onClose} className="as-edge-neutral w-full mt-4 rounded-lg py-2 text-body-lg-5 font-bold">
          {t("upgrade.perk.back")}
        </button>
      </div>
    </div>
  ));
}
