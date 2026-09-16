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
import { LEGENDARY_GOLD, STEP_BRONZE, STEP_SILVER, STEP_GOLD } from "./indicators/vocab.js"; // EINE Quelle für das Legendär-Gold (test/legendary-gold.test.js) und die Stufenfarben
import * as CT from "../game/contracts.js";
import * as C from "../game/constants.js"; // BOARD_POSITIONS: „jede Position" statt „40 Positionen"

/* Die BEUTE liest die Raritätsfarben des Spiels, plus das eine Legendär-Gold. */
export const tierColor = (tier) =>
  (tier >= CT.TIER_LEGENDARY ? LEGENDARY_GOLD : (TIER_META[tier] || {}).color || "#8a8a95");

/* Die AUFGABENSTUFE liest seit 2026-09-16 (Owner) eine eigene Leiter: Bronze, Silber, Gold. Vorher
   trug sie dieselben Raritätsfarben wie die Beute — was die zwei Leitern verwechselbar machte,
   obwohl die Stufe die Arbeit meint und die Rarität die Bezahlung. */
export const stepColor = (step) =>
  ({ leicht: STEP_BRONZE, mittel: STEP_SILVER, schwer: STEP_GOLD })[step] || STEP_BRONZE;

/* The sentence the player reads, with the rung filled in and the rolled variant named. */
export function contractText(contract) {
  if (!contract) return "";
  const variant = contract.variantId
    ? t(`contract.${CT.TASK_BY_ID[contract.taskId]?.variantKey === "category" ? "category" : "formation"}.${contract.variantId}`)
    : "";
  /* Wechselt die Stufe den Zähler (Durchmarsch schwer), wechselt auch der Satz — sonst stünde dort
     „Gewinne 5 Stiche", wo fünf makellose DURCHLÄUFE gemeint sind. */
  const measure = CT.measureFor(contract.taskId, contract.step);
  const key = measure === contract.taskId ? "text" : measure;
  return t(`contract.task.${contract.taskId}.${key}`,
    { n: contract.rung, count: contract.rung, variant, streak: CT.streakOf(contract) });
}

/* Der zweite Satz der schweren Stufe. Null, wo die Stufe keine Zusatzbedingung trägt. */
export function contractExtraText(contract) {
  const e = contract && contract.extra;
  if (!e) return "";
  if (e.noSuitStreak != null) return t("contract.extra.noSuitStreak", { n: e.noSuitStreak });
  if (e.positions >= C.BOARD_POSITIONS) return t("contract.extra.allPositions", { min: e.min });
  return t("contract.extra.positions", { n: e.positions, count: e.positions, min: e.min });
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

// `sub` ist optional: das Angebot erklärt sich über seine drei Karten, die Beute braucht den Satz.
function Head({ title, sub = null, note = null }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-title-6 font-bold mt-1">{title}</h2>
      {sub && <p className="text-body-5 opacity-60 mt-1 max-w-xl mx-auto leading-snug">{sub}</p>}
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
  /* Immer Leicht, Mittel, Schwer in dieser Reihenfolge (Owner, 2026-09-16). Ausgelost wird in
     zufälliger Folge; unsortiert stünde die Schwere mal links, mal rechts, und man müsste die drei
     Karten jedes Mal neu lesen, statt an ihrer Stelle zu wissen, was dort steht. */
  const sortiert = [...offers].sort((a, b) => CT.STEPS.indexOf(a.step) - CT.STEPS.indexOf(b.step));
  return (
    <Overlay>
      <Head title={t("contract.offer.title")}
        note={t("contract.offer.window", { from: win.from, to: win.to })} />
      <div className="grid gap-3 sm:grid-cols-3">
        {sortiert.map((o) => {
          const tone = stepColor(o.step);
          const band = CT.STEP_BAND[o.step] || [];
          return (
            <PickCard key={`${o.taskId}-${o.step}`} tone={tone}
              chip={t(`contract.step.${o.step}`)}
              title={contractName(o)}
              body={<>
                {contractText(o)}
                {/* Die schwere Stufe hat zwei Bedingungen. Beide müssen VOR dem Annehmen zu lesen
                    sein — sonst nimmt man eine Aufgabe an, deren halbe Hälfte man nicht kennt. */}
                {o.extra && <span className="block mt-1">{contractExtraText(o)}</span>}
                <span className="block mt-2 text-meta-1 opacity-60">
                  {t("contract.offer.band", { a: CT.tierLabel(band[0]), b: CT.tierLabel(band[1]) })}
                  {o.step === CT.LEGENDARY_STEP && ` · ${t("contract.offer.legendary")}`}
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
  const live = CT.readLive(state, active);
  const best = CT.readBest(state, active);
  const target = active.target || 0;
  const left = CT.cyclesLeft((state.cycle || 0) + 1, active);
  /* `peak` sagt, ob zwei Zahlen nötig sind: bei einem Spitzen-Zähler fällt der laufende Wert an der
     Durchlaufgrenze zurück, der beste nicht. Nur eine Zahl zu zeigen hieße, entweder den Rückfall zu
     verstecken oder den Fortschritt. */
  return { active, live, best, target, left, done: best >= target,
           peak: CT.hasPeak(active) && best > live, tone: stepColor(active.step),
           /* Die Zusatzbedingung hat einen eigenen Zustand: sie hält gerade oder nicht. Ohne diese
              Anzeige sähe der Spieler seinen Zähler am Ziel stehen und bekäme trotzdem nichts. */
           extra: active.extra ? contractExtraText(active) : "",
           extraOk: active.extra ? CT.extraHolds(state, active) : true };
}

/* Die Zahlen als EIN Fragment — Kachel und Overlay-Zeile lesen dasselbe, damit sie nicht auseinanderlaufen. */
function Zahlen({ r }) {
  return (
    <>
      {r.live}<span className="opacity-45">/{r.target}</span>
      {r.peak && <span className="text-meta-1 opacity-45 ml-1">{t("contract.best", { n: r.best })}</span>}
    </>
  );
}

/* Der Zustand der Zusatzbedingung. Ohne ihn stünde der Hauptzähler auf dem Ziel und der Auftrag
   wäre trotzdem offen — ein Rätsel, das der Spieler nicht lösen kann. Farbe statt Symbol, weil das
   Vokabular der Leiste keine neuen Glyphen kennt. */
function ExtraMark({ r }) {
  return (
    <span className="text-meta-1 ml-1" style={{ color: r.extraOk ? "#5ab87a" : undefined }}
      title={r.extra}>
      {r.extraOk ? t("contract.extra.ok") : t("contract.extra.open")}
    </span>
  );
}

/* Abgerechnet wird erst am Fensterende (§3.7), darum sind „erfüllt" und „noch N Durchläufe" kein
   Entweder-oder mehr: der Stand ist sicher, die Beute wartet trotzdem. Beides zu zeigen ist der
   einzige Weg, dem Spieler zu sagen, dass er nichts mehr tun muss und trotzdem noch nichts bekommt. */
function statusLabel(r) {
  const left = t("contract.left", { count: r.left, n: r.left });
  if (!r.done) return left;
  return r.left > 0 ? `${t("contract.done")} · ${left}` : t("contract.done");
}

/* Die Kachel zeigt nur den STAND — „Reinheit 1/4" sagt nicht, was zu tun ist, und bei Reinheit und
   Quartier fehlt damit sogar der gewürfelte Typ, also die halbe Aufgabe. Ein Klick klappt den Satz
   auf, den der Spieler beim Annehmen gelesen hat (Owner, 2026-09-15). Zugeklappt, weil die Leiste
   eng ist; der Zustand hält, solange ein Auftrag läuft. */
export function ContractTile({ state }) {
  const [open, setOpen] = useState(false);
  const r = contractReadout(state);
  if (!r) return null;
  const band = CT.STEP_BAND[r.active.step] || [];
  return (
    <div className="rounded-lg min-w-0" style={{ background: "#141419", border: `1px solid ${DECK_BORDER}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} data-sfx="none"
        className="w-full text-left px-2.5 py-1.5 min-w-0" style={{ background: "transparent" }}
        aria-expanded={open} title={contractText(r.active)}>
        <div className="text-micro-3 uppercase tracking-wide opacity-50 truncate flex items-center gap-1">
          <span className="inline-block w-2 text-center" aria-hidden="true">{open ? "▾" : "▸"}</span>
          {t("contract.rail.label")} · {contractName(r.active)}
        </div>
        <div className="font-bold text-body-lg-5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ color: r.done ? "#5ab87a" : r.tone }}>
          <Zahlen r={r} />
          <span className="text-meta-1 opacity-45 ml-1">{statusLabel(r)}</span>
          {r.extra && <ExtraMark r={r} />}
        </div>
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-1 border-t" style={{ borderColor: DECK_BORDER }}>
          <div className="text-body-5 opacity-80 leading-snug">{contractText(r.active)}</div>
          {r.extra && <div className="text-body-5 opacity-80 leading-snug mt-1">{r.extra}</div>}
          <div className="text-meta-1 opacity-50 mt-1">
            {t(`contract.step.${r.active.step}`)} · {t("contract.offer.band", { a: CT.tierLabel(band[0]), b: CT.tierLabel(band[1]) })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Eine Zeile für Aufstell- und Architekt-Overlay. Sie decken Leiste und Kopfleiste zu, und dahinter
   werden sechs der vierzehn Aufgaben entschieden (docs/zwischenaufgaben.md §4.3). */
export function ContractLine({ state, className = "" }) {
  const [open, setOpen] = useState(false);
  const r = contractReadout(state);
  if (!r) return null;
  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((v) => !v)} data-sfx="none"
        className="flex items-center gap-2 text-body-5 text-left w-full" style={{ background: "transparent" }}
        aria-expanded={open} title={contractText(r.active)}>
        <span className="inline-block w-2 text-center opacity-50" aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span className="text-micro-3 uppercase tracking-wide opacity-50">{t("contract.rail.label")}</span>
        <span className="font-bold">{contractName(r.active)}</span>
        <span className="font-bold" style={{ color: r.done ? "#5ab87a" : r.tone }}>
          <Zahlen r={r} />
        </span>
        <span className="text-meta-1 opacity-45">{statusLabel(r)}</span>
        {r.extra && <ExtraMark r={r} />}
      </button>
      {open && <div className="text-body-5 opacity-80 leading-snug mt-1 pl-4">{contractText(r.active)}</div>}
    </div>
  );
}
