/* Zwischenaufgaben — the overlays of a contract run (docs/zwischenaufgaben.md).

   ContractOffer  three tasks, three different steps, one is taken and the other two expire.
   ContractLoot   three pieces once the task is done, no reroll.

   Both render only in a run started through the "Aufträge" button; App.jsx gates them on
   state.contractsEnabled. They sit at z-30 like the other full-screen phases, so they cover the rail
   and the top bar the same way the formation overlay does. */

import { useState } from "react";
import { PHASE_ACCENTS, phaseCard, PhaseHairline, DECK_BORDER, ActionButton } from "./modalStyle.jsx";
import { overlayPortal } from "./overlayPortal.jsx"; // Pflicht für jedes Vollbild-Overlay (test/overlay-nesting.test.js)
import { t } from "../i18n/index.js";
import { TIER_META } from "../game/rarity.js";
import { skillDef } from "../i18n/labels.js"; // übersetzter Skill-Name, EINE Quelle
import { LEGENDARY_GOLD } from "./indicators/vocab.js"; // EINE Quelle für das Legendär-Gold (test/legendary-gold.test.js)
import * as CT from "../game/contracts.js";

/* One colour ramp for both overlays: the rarity colours of the game, plus the ONE legendary gold.
   The step of a task and the tier of a piece are the SAME ladder, so they must read the same. */
export const tierColor = (tier) =>
  (tier >= CT.TIER_LEGENDARY ? LEGENDARY_GOLD : (TIER_META[tier] || {}).color || "#8a8a95");

const STEP_TIER = CT.STEP_TIER;

/* The sentence the player reads, with the rung filled in and the rolled variant named. */
export function contractText(contract) {
  if (!contract) return "";
  const variant = contract.variantId
    ? t(`contract.${CT.TASK_BY_ID[contract.taskId]?.variantKey === "category" ? "category" : "formation"}.${contract.variantId}`)
    : "";
  return t(`contract.task.${contract.taskId}.text`, { n: contract.rung, variant });
}

export const contractName = (contract) => (contract ? t(`contract.task.${contract.taskId}.name`) : "");

/* The text of one piece of loot. A legendary has no tier, so it carries its own single sentence. */
export const lootName = (piece) =>
  piece.kind === "legendary" ? t(`contract.leg.${piece.id}.name`) : t(`contract.loot.${piece.id}.name`);
export const lootText = (piece) =>
  piece.kind === "legendary" ? t(`contract.leg.${piece.id}.text`) : t(`contract.loot.${piece.id}.t${piece.tier}`);

function Overlay({ children }) {
  return overlayPortal(
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="relative w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card"
        style={phaseCard(PHASE_ACCENTS.ice)}>
        <PhaseHairline />
        {children}
      </div>
    </div>
  );
}

function Head({ title, sub, note = null }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-title-6 font-bold mt-1">{title}</h2>
      <p className="text-body-5 opacity-60 mt-1 max-w-xl mx-auto leading-snug">{sub}</p>
      {note && <p className="text-meta-1 opacity-45 mt-1">{note}</p>}
    </div>
  );
}

/* A card of either overlay. `tone` carries the rarity; the ladder is the one recurring object, so
   the step chip of an offer and the rarity chip of a piece are built the same way. */
function PickCard({ tone, chip, title, body, cta, onPick }) {
  return (
    <button type="button" onClick={onPick}
      className="text-left rounded-xl p-4 flex flex-col gap-2 transition-all hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
      style={{ background: "#141419", border: `1px solid ${tone}55` }}>
      <span className="text-micro-3 uppercase tracking-wide font-bold self-start px-2 py-0.5 rounded"
        style={{ color: tone, background: `${tone}1f`, border: `1px solid ${tone}66` }}>{chip}</span>
      <span className="ty-title text-body-lg-5 font-bold leading-tight">{title}</span>
      <span className="text-body-5 opacity-75 leading-snug flex-1">{body}</span>
      <span className="text-meta-1 font-bold self-end" style={{ color: tone }}>{cta} →</span>
    </button>
  );
}

/* --- Angebot: drei Aufsteller ---------------------------------------------------------------- */

export function ContractOffer({ offers = [], windowId = 1, onPick }) {
  const win = CT.WINDOWS.find((w) => w.id === windowId) || CT.WINDOWS[0];
  return (
    <Overlay>
      <Head title={t("contract.offer.title")} sub={t("contract.offer.sub")}
        note={t("contract.offer.window", { from: win.from, to: win.to })} />
      <div className="grid gap-3 sm:grid-cols-3">
        {offers.map((o) => {
          const tone = tierColor(STEP_TIER[o.step]);
          const band = CT.STEP_BAND[o.step] || [];
          return (
            <PickCard key={`${o.taskId}-${o.step}`} tone={tone}
              chip={t(`contract.step.${o.step}`)}
              title={contractName(o)}
              body={<>
                {contractText(o)}
                <span className="block mt-2 text-meta-1 opacity-60">
                  {t("contract.offer.band", { a: CT.tierLabel(band[0]), b: CT.tierLabel(band[1]) })}
                </span>
              </>}
              cta={t("contract.offer.take")}
              onPick={() => onPick && onPick(o)} />
          );
        })}
      </div>
    </Overlay>
  );
}

/* --- Beute: drei Stücke ------------------------------------------------------------------------ */

export function ContractLoot({ pieces = [], onPick }) {
  return (
    <Overlay>
      <Head title={t("contract.loot.title")} sub={t("contract.loot.sub")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {pieces.map((p) => {
          const tone = tierColor(p.tier);
          return (
            <PickCard key={`${p.id}-${p.tier}`} tone={tone}
              chip={CT.tierLabel(p.tier)}
              title={lootName(p)}
              body={lootText(p)}
              cta={t("contract.loot.take")}
              onPick={() => onPick && onPick(p)} />
          );
        })}
      </div>
    </Overlay>
  );
}

/* --- Vollendung: der eine Skill, der episch wird ------------------------------------------------
   Das einzige Beutestück mit einer eigenen Wahl. „Ein gehaltener Skill DEINER WAHL" — also ein
   Schritt, kein Automatismus. Legendäre Skills stehen nicht zur Wahl: sie tragen keine Stufe. */

export function ContractSkillPick({ skills = [], skillTiers = {}, rest = 0, onPick }) {
  return (
    <Overlay>
      <Head title={t("contract.skillpick.title")}
        sub={rest > 0 ? t("contract.skillpick.sub", { n: rest }) : t("contract.skillpick.sub.only")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {skills.map((id) => {
          const def = skillDef(id);
          const cur = skillTiers[id] ?? 0;
          return (
            <PickCard key={id} tone={tierColor(CT.TIER_LEGENDARY)}
              chip={t("contract.skillpick.from", { tier: CT.tierLabel(cur + 1) })}
              title={(def && def.name) || id}
              body={(def && def.desc) || ""}
              cta={t("contract.skillpick.take")}
              onPick={() => onPick && onPick(id)} />
          );
        })}
      </div>
    </Overlay>
  );
}

/* --- Durchlass: welche Segmentgrenzen aufgehen --------------------------------------------------
   Anders als die übrigen Auswahlen sind hier MEHRERE Klicks nötig, und die Anzeige muss zeigen, was
   schon offen ist — egal woher (Perk-Familie, Spalier, Pfeiler oder ein früherer Durchlass). Ohne das
   gibt jemand eine Wahl für eine Tür aus, die längst offen steht (Owner, 2026-09-15). */

export function ContractBorderPick({ borders = [], count = 1, onPick }) {
  const [chosen, setChosen] = useState([]);
  const frei = borders.filter((b) => !b.open);
  const need = Math.min(count, frei.length);
  const toggle = (g) => setChosen((c) =>
    c.includes(g) ? c.filter((x) => x !== g) : (c.length >= need ? c : [...c, g]));
  return (
    <Overlay>
      <Head title={t("contract.borderpick.title")}
        sub={t("contract.borderpick.sub", { n: need })}
        note={t("contract.borderpick.chosen", { n: chosen.length, of: need })} />
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))" }}>
        {borders.map((b) => {
          const active = chosen.includes(b.g);
          const tone = b.open ? "#5ab87a" : active ? "#a855f7" : "#8a8a95";
          return (
            <button key={b.g} type="button" disabled={b.open}
              onClick={b.open ? undefined : () => toggle(b.g)}
              className="rounded-lg px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed"
              style={{ background: "#141419", border: `1px solid ${tone}${active || b.open ? "aa" : "44"}`,
                       opacity: b.open ? 0.6 : 1 }}>
              {/* Grenze g liegt zwischen Position (g+1)·5 und der darauf folgenden. */}
              <div className="text-micro-3 uppercase tracking-wide opacity-50">
                {t("contract.borderpick.between", { a: (b.g + 1) * 5, b: (b.g + 1) * 5 + 1 })}
              </div>
              <div className="font-bold text-body-5" style={{ color: tone }}>
                {b.open ? t("contract.borderpick.already") : active ? t("contract.borderpick.picked") : t("contract.borderpick.closed")}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <ActionButton kind="primary" disabled={chosen.length !== need}
          onClick={chosen.length === need ? () => onPick && onPick(chosen) : undefined}>
          {t("contract.borderpick.confirm")}
        </ActionButton>
      </div>
    </Overlay>
  );
}

/* --- Der laufende Stand ------------------------------------------------------------------------
   Eine Kachel im Muster der StatusRail und eine Zeile für die Overlays, die sie zudecken. Beide
   lesen dieselbe Funktion — die Zahl kann zwischen den zwei Orten nicht auseinanderlaufen. */

export function contractReadout(state) {
  const c = state && state.contracts;
  const active = c && c.active;
  if (!active) return null;
  const value = CT.readValue(state, active);
  const target = active.target || 0;
  const left = CT.cyclesLeft((state.cycle || 0) + 1, active);
  return { active, value, target, left, done: value >= target, tone: tierColor(STEP_TIER[active.step]) };
}

export function ContractTile({ state }) {
  const r = contractReadout(state);
  if (!r) return null;
  return (
    <div className="rounded-lg px-2.5 py-1.5 min-w-0" style={{ background: "#141419", border: `1px solid ${DECK_BORDER}` }}>
      <div className="text-micro-3 uppercase tracking-wide opacity-50 truncate">
        {t("contract.rail.label")} · {contractName(r.active)}
      </div>
      <div className="font-bold text-body-lg-5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ color: r.done ? "#5ab87a" : r.tone }}>
        {r.value}<span className="opacity-45">/{r.target}</span>
        <span className="text-meta-1 opacity-45 ml-1">
          {r.done ? t("contract.done") : t("contract.left", { count: r.left, n: r.left })}
        </span>
      </div>
    </div>
  );
}

/* Eine Zeile für Aufstell- und Architekt-Overlay. Sie decken Leiste und Kopfleiste zu, und dahinter
   werden sechs der fünfzehn Aufgaben entschieden (docs/zwischenaufgaben.md §4.3). */
export function ContractLine({ state, className = "" }) {
  const r = contractReadout(state);
  if (!r) return null;
  return (
    <div className={`flex items-center gap-2 text-body-5 ${className}`}>
      <span className="text-micro-3 uppercase tracking-wide opacity-50">{t("contract.rail.label")}</span>
      <span className="font-bold">{contractName(r.active)}</span>
      <span className="font-bold" style={{ color: r.done ? "#5ab87a" : r.tone }}>
        {r.value}<span className="opacity-45">/{r.target}</span>
      </span>
      <span className="text-meta-1 opacity-45">
        {r.done ? t("contract.done") : t("contract.left", { count: r.left, n: r.left })}
      </span>
    </div>
  );
}
