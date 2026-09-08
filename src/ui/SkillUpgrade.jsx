/* Aufwertphase (docs/muenz-oekonomie.md §3.5) — die gehaltenen Skills, je einer mit seiner NÄCHSTEN Stufe
   und dem, was sie bringt. Erreicht über den Aufwerten-Knopf im Angebots-Screen; der Skill-Zug der Phase
   bleibt davon unberührt, bezahlt wird nur mit Münzen.

   Mehrere Aufwertungen je Phase sind erlaubt, auch mehrfach auf demselben Skill — nach einer Aufwertung
   bleibt man deshalb im Bildschirm, und der Skill steht sofort wieder da, mit dem Preis seiner nächsten
   Stufe. Der Abbruch („Zurück zur Skill-Wahl") ist folgenlos. */

import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx";
import { phaseCard, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { ArchIcon } from "./FactionIcon.jsx";
import { SkillTierBadge } from "./HeldSkills.jsx";
import { CoinAmount } from "./CoinMark.jsx";
import { GlossaryText } from "./Glossary.jsx";
import { archetypeOf, isLegendarySkill, tierOf } from "../game/skills.js";
import { upgradeBuy } from "../game/coins.js";
import { skillDef, archMeta } from "../i18n/labels.js";
import { t } from "../i18n/index.js";

/* Was ändert sich am Text zwischen zwei Stufen? Beide Fassungen beschreiben dieselbe Fähigkeit und
   unterscheiden sich meist in einer Zahl, manchmal um einen angehängten Satz. Gemeinsamer Anfang und
   gemeinsames Ende bleiben also stehen; nur das Stück dazwischen ist die Änderung — alt durchgestrichen,
   neu hervorgehoben. Reine Funktion auf Wort-Ebene, damit sie prüfbar ist.

   Bewusst KEIN Zeichen-Diff: der zerlegte deutsche Text („+2" → „+3") ergibt sonst Fetzen wie „+" und
   „2|3". Wörter sind die Einheit, in der man den Unterschied liest. Ist gar nichts gemeinsam (ein Text
   wurde neu geschrieben), fällt `before`/`after` weg und es stehen schlicht beide Fassungen da. */
export function tierTextDiff(oldText = "", newText = "") {
  const a = String(oldText).split(/(\s+)/), b = String(newText).split(/(\s+)/);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const trim = (s) => s.join("").replace(/^\s+|\s+$/g, "");
  return {
    before: trim(a.slice(0, head)),
    removed: trim(a.slice(head, a.length - tail)),
    added: trim(b.slice(head, b.length - tail)),
    after: trim(a.slice(a.length - tail)),
  };
}

function TierArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5c5c68" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function UpgradeRow({ id, state, coins, onUpgrade, justRaised }) {
  const tier = tierOf(state, id);
  const buy = upgradeBuy({ coins }, tier);
  const am = archMeta(archetypeOf(id)) || { color: "#8a8a95" };
  const cur = skillDef(id, tier);
  const next = buy.maxed ? null : skillDef(id, buy.next);
  const d = next ? tierTextDiff(cur?.desc || "", next.desc || "") : null;
  return (
    <button type="button" disabled={buy.maxed || !buy.can}
      onClick={buy.maxed || !buy.can ? undefined : () => onUpgrade(id)}
      className="su-row as-edge-card text-left rounded-xl p-3 flex flex-col gap-2 transition-all disabled:cursor-not-allowed"
      /* Drei Zustände, drei Helligkeiten: bezahlbar (voll), zu teuer (gedämpft — der Kauf ist zu sehen, aber
         nicht auszulösen), höchste Stufe (am blassesten, hier endet die Leiter). Ohne den mittleren Schritt
         sieht ein Skill, für den das Geld nicht reicht, aus wie einer, den man gleich nehmen kann. */
      style={{ "--c": buy.maxed ? "#3a3850" : am.color, opacity: buy.maxed ? 0.42 : (buy.can ? 1 : 0.62) }}>
      <div className="flex items-center gap-2 flex-wrap">
        <ArchIcon meta={am} size={13} />
        <span className="font-bold text-body-lg-5">{cur?.name}</span>
        {/* Nach einer Aufwertung bleibt der Skill in der Liste; die Marke sagt, was gerade passiert ist —
            sonst sieht man nur, dass sich Preis und Stufe geändert haben, und sucht den Grund. */}
        {justRaised === id && (
          <span className="text-meta-1 font-bold inline-flex items-center gap-1" style={{ color: "#4ade80" }}>✓ {t("upgrade.justRaised")}</span>
        )}
        <span className="ml-auto">
          {buy.maxed
            ? <span className="text-meta-1" style={{ color: "#71717c" }}>{t("upgrade.maxTier")}</span>
            : <span className="inline-flex items-center rounded-lg px-2.5 py-1"
                style={{ background: "linear-gradient(180deg,#2a2410,#1d1a12)", border: "1px solid #d4a63a66" }}>
                <CoinAmount n={buy.price} size={11} dim={!buy.can} />
              </span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SkillTierBadge tier={tier} />
        {!buy.maxed && <><TierArrow /><SkillTierBadge tier={buy.next} /></>}
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

export function SkillUpgrade({ state = {}, onUpgrade, onClose }) {
  const [justRaised, setJustRaised] = useState(null);
  const coins = state.coins || 0;
  // Legendäre tragen keine Stufe und stehen deshalb gar nicht erst in der Liste — ein ausgegrauter
  // „Höchste Stufe"-Eintrag wäre eine Auskunft über eine Leiter, auf der sie nie standen.
  const ids = (state.skills || []).filter((id) => !isLegendarySkill(id));
  const raise = (id) => { setJustRaised(id); onUpgrade?.(id); };
  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-5 max-h-[92dvh] overflow-y-auto overlay-card"
        style={phaseCard(PHASE_ACCENTS.violet)}>
        <PhaseHairline />
        <div className="text-center mb-3">
          <div className="text-body-5 uppercase tracking-widest" style={{ color: "#8a7de0" }}>{t("upgrade.eyebrow")}</div>
          <h2 className="text-title-6 font-bold mt-1">{t("upgrade.title")}</h2>
          <p className="text-body-5 opacity-60 mt-1">{t("upgrade.hint")}</p>
        </div>
        {ids.length === 0
          ? <div className="text-body-5 opacity-60 text-center py-6">{t("upgrade.empty")}</div>
          : <div className="grid gap-2">
              {ids.map((id) => (
                <UpgradeRow key={id} id={id} state={state} coins={coins} onUpgrade={raise} justRaised={justRaised} />
              ))}
            </div>}
        <button onClick={onClose} className="as-edge-neutral w-full mt-4 rounded-lg py-2 text-body-lg-5 font-bold">
          {t("upgrade.back")}
        </button>
      </div>
    </div>
  ));
}
