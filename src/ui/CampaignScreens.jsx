/* Kampagne — die Vollbild-Panels einer Kampagnen-Kette (docs/kampagne.md §11).

   CampaignOverview  wo stehe ich in den vier Läufen, welcher Boss kommt, was halte ich
   CampaignBoss      die Bossmechanik am Lauf-Start (ohne Aufträge steht sie allein)
   CampaignTally     die Auswertung am Laufende: Score, Aufträge, Stufensumme, Rarität
   CampaignPick      drei Rewards liegen aus, einer wird genommen
   CampaignUnlock    die neue Freischaltung im Goldrahmen
   CampaignLost      was bleibt, was weg ist
   CampaignWon       Ebene abgeschlossen

   Alle rendern nur in einem Lauf, der über den Kampagnen-Knopf gestartet wurde; App.jsx gatet sie
   auf state.campaign.

   Hausregel des Owners (2026-09-22): keine Mini-Beschreibungen, keine Gedankenstriche in
   Spielertexten. Was die Regel erklärt, steht im Dokument. */

import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx";
import { PHASE_ACCENTS, phaseCard, ActionButton, DECK_BORDER } from "./modalStyle.jsx";
import { t } from "../i18n/index.js";
import * as CP from "../game/campaign.js";
import { bossName, bossText, isEndBoss, unlockName, unlockText, axisName, rewardName, rewardText, tierColor, tierLabel, mio } from "./campaignText.js";

const GOLD = PHASE_ACCENTS.gold.c;
const RED = PHASE_ACCENTS.red.c;
const GREEN = PHASE_ACCENTS.green.c;
const VIOLET = PHASE_ACCENTS.violet.c;
const MUTED = "#6e6e7a";

/* Die Schale portalt selbst, nicht ihre sieben Aufrufer: EIN Vollbild-Kasten, EINE Naht.
   Warum überhaupt: overlayPortal.jsx, Wächter: test/overlay-nesting.test.js. */
const Shell = ({ accent = "gold", children }) => overlayPortal(
  <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(10,10,14,0.82)" }}>
    <div className="w-full max-w-3xl rounded-2xl p-6" style={phaseCard(PHASE_ACCENTS[accent] || PHASE_ACCENTS.gold)}>
      {children}
    </div>
  </div>
);

const Head = ({ children, color }) => (
  <div className="ty-screen-title text-micro opacity-60" style={color ? { color, opacity: 1 } : undefined}>{children}</div>
);

/* Ein Reward-Chip. Dieselbe Form überall, damit ein Stück in der Übersicht, im Spielpanel und auf
   dem Siegschirm gleich aussieht. */
export const RewardChip = ({ id, tier, axis = null, onClick = null }) => {
  const col = tierColor(tier);
  const Tag = onClick ? "button" : "span";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick || undefined}
         title={rewardText(id, tier, axis)}
         className="ty-badge inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-meta"
         style={{ border: `1px solid ${col}`, color: col, background: "rgba(255,255,255,0.03)" }}>
      {rewardName(id)} {["I", "II", "III", "IV", "V"][tier - 1] || ""}
    </Tag>
  );
};

/* ---- Die Leisten-Kachel IM Lauf. Bewusst dieselbe Form wie die Auftrags-Kachel daneben
   (ContractPhase.jsx): zugeklappt Boss und Schwelle, aufgeklappt die Mechanik und was man hält.
   Sie rendert sich selbst weg, wenn der Lauf keine Kampagne trägt. ---- */
export function CampaignTile({ state }) {
  const [open, setOpen] = useState(false);
  const c = state && state.campaign;
  if (!c) return null;
  const run = c.run || 1;
  const boss = CP.bossFor(c, run);
  const threshold = CP.thresholdWith(c, run);
  const score = state.score || 0;
  const reached = score >= threshold;
  const held = Object.entries(c.held || {});
  const col = isEndBoss(boss) ? VIOLET : RED;
  return (
    <div className="rounded-lg min-w-0" style={{ background: "#141419", border: `1px solid ${DECK_BORDER}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} data-sfx="none"
        className="w-full text-left px-2.5 py-1.5 min-w-0" style={{ background: "transparent" }}
        aria-expanded={open} title={bossText(boss)}>
        <div className="text-micro uppercase tracking-wide opacity-50 truncate flex items-center gap-1">
          <span className="inline-block w-2 text-center" aria-hidden="true">{open ? "▾" : "▸"}</span>
          {t("campaign.rail.label", { n: run, runs: CP.RUNS_PER_LEVEL })} · {bossName(boss)}
        </div>
        <div className="ty-num font-bold text-body-lg leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
             style={{ color: reached ? GREEN : col }}>
          {t("campaign.threshold", { n: mio(score) })}
          <span className="text-micro opacity-45 ml-1">{t("campaign.over.need", { n: mio(threshold) })}</span>
        </div>
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-1 border-t" style={{ borderColor: DECK_BORDER }}>
          <div className="text-body opacity-80 leading-snug">{bossText(boss)}</div>
          {held.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {held.map(([id, tier]) => <RewardChip key={id} id={id} tier={tier} axis={(c.axes || {})[id]} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Übersicht: der Einstieg in eine laufende oder frische Kampagne ---- */
export function CampaignOverview({ campaign, unlocked = [], onStart, onGiveUp }) {
  const c = campaign || CP.emptyCampaign();
  const held = Object.entries(c.held || {});
  const run = c.run || 1;
  return (
    <Shell accent="gold">
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <Head>{t("start.campaign")}</Head>
          <h2 className="ty-title text-head font-bold mt-1">{t("campaign.title", { level: c.level || 1 })}</h2>
        </div>
        {held.length > 0 && (
          <div className="text-right">
            <Head>{t("campaign.held")}</Head>
            <div className="flex flex-wrap justify-end gap-1.5 mt-1.5">
              {held.map(([id, tier]) => <RewardChip key={id} id={id} tier={tier} axis={(c.axes || {})[id]} />)}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {Array.from({ length: CP.RUNS_PER_LEVEL }, (_, i) => {
          const n = i + 1;
          const done = n < run;
          const now = n === run;
          const boss = CP.bossFor(c, n);
          const col = done ? GREEN : now ? GOLD : isEndBoss(boss) ? VIOLET : MUTED;
          return (
            <div key={n} className="rounded-xl p-3 flex flex-col gap-2"
                 style={{ border: `${now ? 2 : 1}px solid ${col}55`, background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-meta opacity-70">{t("campaign.run", { n })}</span>
                {done && <span style={{ color: GREEN }}>✓</span>}
                {now && <span className="ty-badge text-micro" style={{ color: GOLD }}>{t("campaign.now")}</span>}
                {!done && !now && isEndBoss(boss) && (
                  <span className="ty-badge text-micro" style={{ color: VIOLET }}>{t("campaign.boss.end")}</span>
                )}
              </div>
              <div className="ty-num text-body-lg" style={{ color: done ? GREEN : undefined }}>
                {t("campaign.threshold", { n: mio(CP.thresholdWith(c, n)) })}
              </div>
              <div className="text-meta" style={{ color: col }}>{bossName(boss)}</div>
              {done && (c.scores || [])[i] != null && (
                <div className="ty-num-sm text-micro" style={{ color: GREEN }}>{t("campaign.reached", { n: mio(c.scores[i]) })}</div>
              )}
            </div>
          );
        })}
      </div>

      <UnlockLadder unlocked={unlocked} />

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={onGiveUp} className="text-meta opacity-60 hover:opacity-100">{t("campaign.giveUp")}</button>
        <div className="flex-1" />
        <ActionButton kind="primary" onClick={onStart}>{t("campaign.start", { n: run })}</ActionButton>
      </div>
    </Shell>
  );
}

export const UnlockLadder = ({ unlocked = [] }) => (
  <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
    <div className="flex items-baseline gap-2 mb-2">
      <Head>{t("campaign.unlocks")}</Head>
      <span className="ty-num-sm ml-auto text-meta" style={{ color: GOLD }}>
        {t("campaign.unlocks.count", { n: unlocked.length, max: CP.UNLOCK_IDS.length })}
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {CP.UNLOCK_IDS.map((id) => {
        const on = unlocked.includes(id);
        return (
          <span key={id} className="flex-1 min-w-[6rem] rounded-lg px-2 py-1.5 text-center text-meta"
                style={{ border: `1px ${on ? "solid" : "dashed"} ${on ? `${GOLD}99` : "rgba(255,255,255,0.12)"}`,
                         color: on ? GOLD : "#5f5f6a" }}>
            {on ? "✓ " : ""}{unlockName(id)}
          </span>
        );
      })}
    </div>
  </div>
);

/* ---- Bossblock am Lauf-Start. Ohne Aufträge steht er allein, sonst über der Auftragswahl. ---- */
export function CampaignBoss({ campaign, run = null, inline = false, onStart = null }) {
  const c = campaign || CP.emptyCampaign();
  const n = run || c.run || 1;
  const boss = CP.bossFor(c, n);
  if (!boss) return null;
  const end = isEndBoss(boss);
  const col = end ? VIOLET : RED;
  const block = (
    <div className="rounded-xl p-4" style={{ border: `1px solid ${col}77`, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="ty-badge rounded px-2 py-0.5 text-micro" style={{ background: col, color: "#14120c" }}>
          {t(end ? "campaign.boss.end" : "campaign.boss.mid")}
        </span>
        <span className="ty-title text-body-lg font-bold" style={{ color: col }}>{bossName(boss)}</span>
        <span className="ml-auto text-meta opacity-70">
          {t("campaign.run", { n })} · {t("campaign.threshold", { n: mio(CP.thresholdWith(c, n)) })}
        </span>
      </div>
      <p className="mt-2.5 text-body opacity-90">{bossText(boss)}</p>
    </div>
  );
  if (inline) return block;
  return (
    <Shell accent={end ? "violet" : "red"}>
      {block}
      <div className="flex justify-end mt-5">
        <ActionButton kind="primary" onClick={onStart}>{t("campaign.start", { n })}</ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Auswertung: Score, Aufträge, Stufensumme, erreichte Rarität ---- */
export function CampaignTally({ campaign, score = 0, onPick }) {
  const c = campaign || CP.emptyCampaign();
  const p = c.pending || {};
  const threshold = p.threshold || CP.thresholdWith(c);
  const tier = p.tier || 1;
  const mult = score >= threshold * 3 ? 3 : score >= threshold * 2 ? 2 : 1;
  const tasks = Math.min(CP.MAX_CONTRACTS_PER_RUN, p.contracts || 0);
  /* Die Marken 2× und 3× stehen von Anfang an auf der Leiste, damit beim Hochzählen sichtbar ist,
     worauf es zuläuft, statt es erst hinterher zu erfahren. */
  const pct = Math.max(0, Math.min(100, (score / (threshold * 3)) * 100));
  return (
    <Shell accent="gold">
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <h2 className="ty-title text-title font-bold flex-1" style={{ color: GREEN }}>
          {t("campaign.over.passed", { n: c.run || 1 })}
        </h2>
        <div className="text-right">
          <Head>{t("campaign.over.score")}</Head>
          <div className="ty-num text-head">{t("campaign.threshold", { n: mio(score) })}</div>
        </div>
      </div>

      <div className="rounded-xl p-4 pt-8 mb-4" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="relative h-3 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="absolute left-0 top-0 h-3 rounded-full"
               style={{ width: `${pct}%`, background: `linear-gradient(90deg,${GREEN},#5a8ade)` }} />
          {[1, 2, 3].map((m) => (
            <div key={m} className="ty-num-sm absolute -top-7 text-micro whitespace-nowrap"
                 style={{ left: `${(m / 3) * 100}%`, transform: m === 3 ? "translateX(-88%)" : "translateX(-50%)",
                          color: m === 1 ? GREEN : m <= mult ? "#5a8ade" : MUTED }}>
              {/* Alle drei Marken tragen die Einheit. Ohne sie stand da „Schwelle 10 · 2× 20 · 3× 30",
                  und eine nackte 20 neben einem Endscore in Millionen liest sich als gar nichts. */}
              {m === 1 ? t("campaign.over.mark", { n: t("campaign.threshold", { n: mio(threshold) }) })
                       : `${m}× ${t("campaign.threshold", { n: mio(threshold * m) })}`}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <Cell label={t("campaign.over.tasks")} value={`${p.contracts || 0}`} color={GREEN}
              sub={t("campaign.over.stepsGain", { count: tasks, n: tasks })} />
        <Cell label={t("campaign.over.mult")} value={`${mult}×`} color="#5a8ade"
              sub={mult < 3 ? t("campaign.over.multMissed", { n: mult + 1 })
                            : t("campaign.over.stepsGain", { count: 2, n: 2 })} />
        <Cell label={t("campaign.over.steps")} value={`${p.steps || 0}`} color="#e8e8ea" sub="" />
      </div>

      <div className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
           style={{ border: `2px solid ${tierColor(tier)}`, background: "rgba(255,255,255,0.02)" }}>
        <div className="flex-1">
          <Head>{t("campaign.over.rarity")}</Head>
          <div className="ty-title text-title font-bold mt-0.5" style={{ color: tierColor(tier) }}>
            {tierLabel(tier)}
          </div>
        </div>
        {tier >= CP.MAX_TIER_L1 && (
          <span className="rounded-lg px-3 py-1.5 text-meta"
                style={{ border: "1px dashed rgba(255,255,255,0.18)", color: MUTED }}>
            {t("campaign.over.capped")}
          </span>
        )}
        <ActionButton kind="primary" onClick={onPick}>{t("campaign.over.pick")}</ActionButton>
      </div>
    </Shell>
  );
}

const Cell = ({ label, value, sub, color }) => (
  <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
    <Head>{label}</Head>
    <div className="ty-num text-title mt-1.5" style={{ color }}>{value}</div>
    {sub && <div className="text-micro mt-1" style={{ color }}>{sub}</div>}
  </div>
);

/* ---- Auslage: drei liegen aus, einer wird genommen ---- */
export function CampaignPick({ campaign, offers = [], onTake }) {
  const c = campaign || CP.emptyCampaign();
  const held = c.held || {};
  const tier = (offers[0] || {}).tier || 1;
  return (
    <Shell accent="gold">
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <h2 className="ty-title text-title font-bold">{t("campaign.pick.title", { n: (c.run || 1) + 1 })}</h2>
          <div className="text-meta opacity-70 mt-1">{t("campaign.pick.lasts")}</div>
        </div>
        <span className="ty-badge rounded-lg px-3 py-1.5 text-meta"
              style={{ border: `1px solid ${tierColor(tier)}`, color: tierColor(tier) }}>
          {tierLabel(tier)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {offers.map((o) => (
          <button key={o.id} type="button" onClick={() => onTake(o)}
                  className="text-left rounded-xl p-4 flex flex-col gap-2.5"
                  style={{ border: `2px solid ${tierColor(o.tier)}`, background: "rgba(255,255,255,0.02)" }}>
            <div className="ty-title text-body-lg font-bold">{rewardName(o.id)}</div>
            {o.axis && (
              <div className="rounded-lg px-2.5 py-1.5 text-meta" style={{ background: "rgba(255,255,255,0.05)" }}>
                {t("campaign.pick.axis", { axis: axisName(o.axis) })}
              </div>
            )}
            <div className="text-body opacity-90 flex-1">{rewardText(o.id, o.tier, o.axis)}</div>
            <div className="text-micro pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: o.upgrade ? GOLD : MUTED }}>
              {o.upgrade
                ? `▲ ${t("campaign.pick.upgrade")} · ${t("campaign.pick.holding", { rarity: tierLabel(held[o.id]), value: CP.rewardValue(o.id, held[o.id]) })}`
                : t("campaign.pick.new")}
            </div>
          </button>
        ))}
      </div>
    </Shell>
  );
}

/* ---- Freischaltung im Goldrahmen ---- */
export function CampaignUnlock({ id, unlocked = [], nextRun = 2, onNext }) {
  return (
    <Shell accent="gold">
      <div className="rounded-2xl p-6 mb-4" style={{ border: `3px solid ${GOLD}`, background: "rgba(212,166,58,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,transparent,${GOLD})` }} />
          <span className="ty-screen-title text-micro" style={{ color: GOLD }}>{t("campaign.unlock.title")}</span>
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,${GOLD},transparent)` }} />
        </div>
        <div className="ty-title text-head font-bold text-center">{unlockName(id)}</div>
        <p className="text-body text-center mt-2 opacity-85">{unlockText(id)}</p>
      </div>
      <UnlockLadder unlocked={unlocked} />
      <div className="flex justify-end mt-5">
        <ActionButton kind="primary" onClick={onNext}>{t("campaign.unlock.next", { n: nextRun })}</ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Niederlage. Links steht, was BLEIBT, nicht was weg ist. ---- */
export function CampaignLost({ campaign, score = 0, unlocked = [], onAgain, onMenu }) {
  const c = campaign || CP.emptyCampaign();
  const held = Object.keys(c.held || {});
  const run = c.run || 1;
  return (
    <Shell accent="red">
      <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${RED}66` }}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1">
            <Head color={RED}>{t("campaign.over.failed", { n: run })}</Head>
            <h2 className="ty-title text-title font-bold mt-1">{t("campaign.lost.title")}</h2>
          </div>
          <div className="text-right">
            <div className="ty-num text-title" style={{ color: RED }}>{t("campaign.threshold", { n: mio(score) })}</div>
            <div className="text-meta opacity-70">{t("campaign.over.need", { n: mio(CP.thresholdWith(c, run)) })}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: `2px solid ${GOLD}`, background: "rgba(212,166,58,0.05)" }}>
          <Head color={GOLD}>{t("campaign.lost.keep")}</Head>
          <div className="flex flex-col gap-2">
            {unlocked.map((id) => (
              <div key={id} className="rounded-lg px-3 py-2 text-body"
                   style={{ border: `1px solid ${GOLD}66`, color: GOLD }}>✓ {unlockName(id)}</div>
            ))}
          </div>
          <div className="text-meta mt-auto pt-2" style={{ borderTop: "1px solid rgba(212,166,58,0.2)", color: "#a08a4a" }}>
            {t("campaign.lost.open", { n: CP.UNLOCK_IDS.length - unlocked.length, max: CP.UNLOCK_IDS.length })}
          </div>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <Head>{t("campaign.lost.lose")}</Head>
          <div className="flex flex-col gap-2">
            {held.map((id) => (
              <div key={id} className="rounded-lg px-3 py-2 text-body line-through opacity-50"
                   style={{ border: "1px solid rgba(255,255,255,0.08)" }}>{rewardName(id)}</div>
            ))}
          </div>
          <div className="text-meta mt-auto pt-2 opacity-50" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {t("campaign.lost.wins", { count: run - 1, n: run - 1 })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={onMenu} className="text-meta opacity-60 hover:opacity-100">{t("campaign.lost.menu")}</button>
        <div className="flex-1" />
        <ActionButton kind="primary" onClick={onAgain}>{t("campaign.lost.again")}</ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Sieg: der einzige Ort, an dem die nächste Ebene auftaucht ----
   Der Block „Ebene N+1 freigeschaltet" hängt an CP.hasLevel und nicht am Entwurf: Ebene 2 ist
   geplant, aber nicht gebaut, und ein Siegschirm, der sie ankündigt, verspricht dem Spieler einen
   Bildschirm, den es nicht gibt. Sobald LEVELS auf 2 geht, erscheint er von selbst. */
export function CampaignWon({ campaign, unlocked = [], onNext }) {
  const c = campaign || CP.emptyCampaign();
  const level = c.level ?? 1;   // `?? `, nicht `|| `: 0 ist eine Ebene, kein fehlender Wert
  const next = CP.hasLevel(level + 1);
  return (
    <Shell accent="gold">
      <div className="text-center mb-5">
        <div className="ty-screen-title text-micro" style={{ color: GOLD }}>
          {t("campaign.won.fallen", { boss: bossName(CP.END_BOSS.id) })}
        </div>
        <h2 className="ty-title text-figure font-bold mt-2">{t("campaign.won.title", { level })}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {(c.scores || []).map((s, i) => (
          <div key={i} className="rounded-xl p-3" style={{ border: "1px solid rgba(90,184,122,0.3)" }}>
            <div className="text-meta opacity-60">{t("campaign.run", { n: i + 1 })}</div>
            <div className="ty-num text-body-lg mt-1" style={{ color: GREEN }}>{t("campaign.threshold", { n: mio(s) })}</div>
            <div className="text-micro opacity-50">{bossName(CP.bossFor(c, i + 1))}</div>
          </div>
        ))}
      </div>

      {next && (
        <div className="rounded-xl p-4 mb-4" style={{ border: `3px solid ${GOLD}`, background: "rgba(212,166,58,0.06)" }}>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,transparent,${GOLD})` }} />
            <span className="ty-screen-title text-micro" style={{ color: GOLD }}>{t("campaign.won.next", { level: level + 1 })}</span>
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,${GOLD},transparent)` }} />
          </div>
          <div className="flex gap-2.5 mt-3 flex-wrap">
            {[t("campaign.won.harder"), t("campaign.won.newUnlocks"), t("campaign.won.newBosses")].map((s) => (
              <div key={s} className="flex-1 min-w-[7rem] rounded-lg p-2.5 text-center text-body"
                   style={{ background: "rgba(212,166,58,0.08)", color: "#e0d4b4" }}>{s}</div>
            ))}
          </div>
        </div>
      )}

      <UnlockLadder unlocked={unlocked} />

      <div className="flex justify-end mt-5">
        <ActionButton kind="primary" onClick={onNext}>
          {next ? t("campaign.won.begin", { level: level + 1 }) : t("campaign.lost.menu")}
        </ActionButton>
      </div>
    </Shell>
  );
}
