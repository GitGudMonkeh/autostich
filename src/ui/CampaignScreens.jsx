/* Kampagne — die Vollbild-Panels der Leiter (docs/kampagne.md).

   CampaignOverview  wo stehe ich auf der Leiter, welcher Boss kommt, was ist offen
   CampaignBoss      die Bossmechanik am Stufen-Start (ohne Auftraege steht sie allein)
   CampaignUnlock    die neue Freischaltung im Goldrahmen
   CampaignFailed    Stufe verfehlt, dieselbe noch einmal
   CampaignWon       die Leiter ist durch

   Alle rendern nur in einem Lauf, der über den Kampagnen-Knopf gestartet wurde; App.jsx gatet sie
   auf state.campaign.

   Hausregeln des Owners für Spielertexte: keine Mini-Beschreibungen, keine Gedankenstriche
   (2026-09-22), und eine Belohnung sagt nur, was sie BRINGT (2026-09-25). „Formationen zahlen
   nicht" nimmt dem Spieler etwas weg, von dem er nie wusste, dass es das gibt. Was die Regel
   vollständig erklärt, steht im Dokument. Ein BOSS-Text ist davon nicht betroffen: seine
   Einschränkung ist die Regel selbst, nicht ihr Fehlen. */

import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx";
import { PHASE_ACCENTS, phaseCard, ActionButton, DECK_BORDER } from "./modalStyle.jsx";
import { t } from "../i18n/index.js";
import * as CP from "../game/campaign.js";
import { bossName, bossText, isEndBoss, unlockName, unlockText, mio } from "./campaignText.js";

const GOLD = PHASE_ACCENTS.gold.c;
const RED = PHASE_ACCENTS.red.c;
const GREEN = PHASE_ACCENTS.green.c;
const VIOLET = PHASE_ACCENTS.violet.c;
const MUTED = "#6e6e7a";

/* Die Schale portalt selbst, nicht ihre Aufrufer: EIN Vollbild-Kasten, EINE Naht.
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

/* ---- Die Schwellen-Leiste. Sie sitzt im `milestone`-Slot der Vitalleiste, also direkt neben dem
   Score, den sie misst (ab 1280 px als 250-px-Zelle `.sb-ms`, darunter als volle Zeile unter der
   Score-Reihe). Beide Fassungen kommen aus DIESEM einen Element, die Leiste ist nur eine Zeile.

   Sie füllt sich EINMAL. Die früheren drei Durchgänge (2×/3×) massen die Rarität des Rewards am
   Laufende, und den gibt es seit dem Umbau auf die Leiter nicht mehr: über der Schwelle bleibt sie
   voll stehen, mehr Score hilft, zählt aber nicht weiter. ---- */
export function CampaignProgress({ state, className = "" }) {
  const c = state && state.campaign;
  if (!c) return null;
  const score = state.score || 0;
  const p = CP.thresholdProgress(c, score);
  const tone = p.full ? GREEN : GOLD;
  return (
    /* Die Zeilen tragen ihre Breite SELBST (`w-full`), statt sie von der Ausrichtung der Spalte zu
       erben. Der Grund ist gemessen, nicht vermutet: ab 1280 px setzt `.sb-ms` in index.css
       `display:flex; align-items:center` auf genau dieses Element. Die Leiste hat keine Eigenbreite,
       wurde damit auf der Querachse zentriert und maß 0 px. `items-stretch` dagegen hilft nicht —
       eine Tailwind-Utility liegt in einem `@layer` und verliert gegen die ungelayerte Regel, egal
       in welcher Reihenfolge sie steht. */
    <div className={`flex flex-col justify-center gap-1.5 px-2.5 py-2 w-full min-w-0 ${className}`}>
      <div className="flex w-full items-baseline gap-2 min-w-0">
        <span className="ty-screen-title text-micro truncate" style={{ color: tone }}>
          {p.full ? t("campaign.bar.cleared") : t("campaign.bar.threshold")}
        </span>
        {/* Über der Schwelle steht nur noch der Score: ein Ziel, das hinter einem liegt, als
            „31 / 30" zu zeigen, liest sich wie ein Fehler. */}
        <span className="ty-num-sm ml-auto text-micro whitespace-nowrap" style={{ color: tone }}>
          {p.full ? t("campaign.threshold", { n: mio(score) })
                  : t("campaign.bar.progress", { a: mio(score), b: mio(p.target) })}
        </span>
      </div>
      <div className="relative w-full h-[9px] rounded-full overflow-hidden"
           role="progressbar" aria-label={t("campaign.bar.threshold")}
           aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.pct)}
           style={{ background: "#26262f", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" }}>
        <div className="absolute left-0 top-0 bottom-0 rounded-full"
             style={{ width: `${p.pct}%`, background: tone, transition: "width 220ms ease-out" }} />
      </div>
    </div>
  );
}

/* ---- Die Leisten-Kachel IM Lauf. Bewusst dieselbe Form wie die Auftrags-Kachel daneben
   (ContractPhase.jsx): zugeklappt der Boss, aufgeklappt seine Mechanik.
   Sie rendert sich selbst weg, wenn der Lauf keine Kampagne trägt. ---- */
export function CampaignTile({ state }) {
  const [open, setOpen] = useState(false);
  const c = state && state.campaign;
  if (!c) return null;
  const step = c.step || 1;
  const boss = CP.bossFor(c, step);
  const col = isEndBoss(boss) ? VIOLET : RED;
  const counter = CP.counterBonus(state);   // Konter: was der nächste Gegner gerade obendrauf hat
  return (
    <div className="rounded-lg min-w-0" style={{ background: "#141419", border: `1px solid ${DECK_BORDER}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} data-sfx="none"
        className="w-full text-left px-2.5 py-1.5 min-w-0" style={{ background: "transparent" }}
        aria-expanded={open} title={bossText(boss)}>
        <div className="text-micro uppercase tracking-wide opacity-50 truncate flex items-center gap-1">
          <span className="inline-block w-2 text-center" aria-hidden="true">{open ? "▾" : "▸"}</span>
          {t("campaign.rail.label", { n: step, steps: CP.STEPS })}
        </div>
        {/* Der Score-Stand steht seit der Schwellen-Leiste NICHT mehr hier: er stünde sonst zweimal
            auf dem Schirm, und die Leiste sitzt am Score, wo man ohnehin hinsieht. */}
        <div className="ty-title font-bold text-body-lg leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
             style={{ color: col }}>
          {bossName(boss)}
        </div>
        {/* Der Konter-Aufschlag steht zugeklappt da: er ändert sich mit JEDEM Stich, und wer ihn erst
            nach dem Aufklappen sieht, sieht ihn nie zur richtigen Zeit. */}
        {counter > 0 && (
          <div className="ty-num-sm text-micro mt-0.5" style={{ color: VIOLET }}>
            {t("campaign.rail.counter", { n: counter })}
          </div>
        )}
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-1 border-t" style={{ borderColor: DECK_BORDER }}>
          <div className="text-body opacity-80 leading-snug">{bossText(boss)}</div>
        </div>
      )}
    </div>
  );
}

/* Zwei Knöpfe im Fuß der Übersicht, die etwas zerstören, und beide bestätigen sich SELBST statt
   über ein zweites Overlay: der erste Klick tauscht die Beschriftung, der zweite führt aus. Kein
   Ein-Tap-Verlust (dieselbe Linie wie #254), aber auch kein Dialog über einem Dialog.
   Ein Klick auf den einen nimmt dem anderen die Bestätigung wieder ab. */
const KillButton = ({ armed, onArm, onFire, label, sure, color }) => (
  <button type="button" onClick={armed ? onFire : onArm}
    className="text-meta hover:opacity-100 transition-opacity"
    style={armed ? { color, opacity: 1 } : { opacity: 0.6 }}>
    {armed ? sure : label}
  </button>
);

/* ---- Übersicht: die ganze Leiter auf einmal ---- */
export function CampaignOverview({ campaign, unlocked = [], onStart, onGiveUp, onReset = null }) {
  const c = campaign || CP.emptyCampaign();
  const step = c.step || 1;
  const [armed, setArmed] = useState(null); // null | "giveUp" | "reset"
  return (
    <Shell accent="gold">
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <Head>{t("start.campaign")}</Head>
          <h2 className="ty-title text-head font-bold mt-1">{t("campaign.title", { n: step, max: CP.STEPS })}</h2>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {CP.LADDER.map((rung) => {
          const done = rung.step < step || (rung.step === step && c.done);
          const now = rung.step === step && !c.done;
          /* Bosse stehen verdeckt, bis ihre Stufe geschafft ist (Owner 2026-09-23). Wer vorher weiß,
             was kommt, baut dagegen, statt sich anzupassen. Verdeckt steht die ART da: Miniboss
             oder Endboss. Die FREISCHALTUNG bleibt offen sichtbar, sie ist das Ziel der Stufe. */
          const col = done ? GREEN : now ? GOLD : isEndBoss(rung.boss) ? VIOLET : MUTED;
          return (
            <div key={rung.step} className="rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap"
                 style={{ border: `${now ? 2 : 1}px solid ${col}55`, background: "rgba(255,255,255,0.02)" }}>
              <span className="ty-num text-body-lg w-8 text-center" style={{ color: col }}>{rung.step}</span>
              <div className="min-w-0 flex-1">
                <div className="text-meta" style={{ color: col }}>
                  {done ? bossName(rung.boss) : t(isEndBoss(rung.boss) ? "campaign.boss.kind.end" : "campaign.boss.kind.mid")}
                </div>
                <div className="text-micro opacity-60">{unlockName(rung.unlock)}</div>
              </div>
              <div className="text-right">
                <div className="ty-num text-body-lg" style={{ color: done ? GREEN : undefined }}>
                  {t("campaign.threshold", { n: mio(rung.threshold) })}
                </div>
                {done && (c.scores || [])[rung.step - 1] != null && (
                  <div className="ty-num-sm text-micro" style={{ color: GREEN }}>
                    {t("campaign.reached", { n: mio(c.scores[rung.step - 1]) })}
                  </div>
                )}
              </div>
              {done && <span style={{ color: GREEN }}>✓</span>}
              {now && <span className="ty-badge text-micro" style={{ color: GOLD }}>{t("campaign.now")}</span>}
            </div>
          );
        })}
      </div>

      <UnlockLadder unlocked={unlocked} />

      <div className="flex items-center gap-4 mt-5 flex-wrap">
        <KillButton armed={armed === "giveUp"} onArm={() => setArmed("giveUp")} onFire={onGiveUp}
          label={t("campaign.giveUp")} sure={t("campaign.giveUp.sure")} color={RED} />
        {/* Testknopf: setzt die Leiter auf Stufe 1 zurück, samt Freischaltungen. */}
        {onReset && (
          <KillButton armed={armed === "reset"} onArm={() => setArmed("reset")} onFire={onReset}
            label={t("campaign.reset")} sure={t("campaign.reset.sure")} color={RED} />
        )}
        <div className="flex-1" />
        {!c.done && (
          <ActionButton kind="primary" onClick={() => { setArmed(null); onStart(); }}>
            {t("campaign.start", { n: step })}
          </ActionButton>
        )}
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

/* ---- Bossblock am Stufen-Start. Ohne Aufträge steht er allein, sonst über der Auftragswahl. ---- */
export function CampaignBoss({ campaign, step = null, inline = false, onStart = null }) {
  const c = campaign || CP.emptyCampaign();
  const n = step || c.step || 1;
  const rung = CP.rungFor(n);
  const boss = rung.boss;
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
          {t("campaign.step", { n })} · {t("campaign.threshold", { n: mio(rung.threshold) })}
        </span>
      </div>
      <p className="mt-2.5 text-body opacity-90">{bossText(boss)}</p>
      {/* Wofür man spielt, direkt unter dem, wogegen man spielt. */}
      <p className="mt-2 text-meta" style={{ color: GOLD }}>
        {t("campaign.boss.grants", { name: unlockName(rung.unlock) })}
      </p>
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

/* ---- Freischaltung im Goldrahmen ---- */
export function CampaignUnlock({ id, unlocked = [], nextStep = 2, onNext }) {
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
        <ActionButton kind="primary" onClick={onNext}>{t("campaign.unlock.next", { n: nextStep })}</ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Stufe verfehlt. Die Kampagne ist NICHT vorbei: dieselbe Stufe wird wiederholt, die
   Freischaltungen bleiben (Owner 2026-09-25). Deshalb steht hier auch kein „das ist weg". ---- */
export function CampaignFailed({ campaign, score = 0, onAgain, onMenu }) {
  const c = campaign || CP.emptyCampaign();
  const step = c.step || 1;
  return (
    <Shell accent="red">
      <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${RED}66` }}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1">
            <Head color={RED}>{t("campaign.over.failed", { n: step })}</Head>
            <h2 className="ty-title text-title font-bold mt-1">{t("campaign.failed.title", { n: step })}</h2>
          </div>
          <div className="text-right">
            <div className="ty-num text-title" style={{ color: RED }}>{t("campaign.threshold", { n: mio(score) })}</div>
            <div className="text-meta opacity-70">{t("campaign.over.need", { n: mio(CP.thresholdFor(c, step)) })}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={onMenu} className="text-meta opacity-60 hover:opacity-100">{t("campaign.failed.menu")}</button>
        <div className="flex-1" />
        <ActionButton kind="primary" onClick={onAgain}>{t("campaign.failed.again", { n: step })}</ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Die Leiter ist durch. Weiter geht es erst, wenn Stufe 6 gebaut ist — der Schirm kündigt
   deshalb nichts an, was der Spieler danach nicht vorfindet. ---- */
export function CampaignWon({ campaign, unlocked = [], onNext }) {
  const c = campaign || CP.emptyCampaign();
  return (
    <Shell accent="gold">
      <div className="text-center mb-5">
        <div className="ty-screen-title text-micro" style={{ color: GOLD }}>
          {t("campaign.won.fallen", { boss: bossName(CP.LADDER[CP.STEPS - 1].boss) })}
        </div>
        <h2 className="ty-title text-figure font-bold mt-2">{t("campaign.won.title")}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
        {CP.LADDER.map((rung, i) => (
          <div key={rung.step} className="rounded-xl p-3" style={{ border: "1px solid rgba(90,184,122,0.3)" }}>
            <div className="text-meta opacity-60">{t("campaign.step", { n: rung.step })}</div>
            <div className="ty-num text-body-lg mt-1" style={{ color: GREEN }}>
              {t("campaign.threshold", { n: mio((c.scores || [])[i] ?? rung.threshold) })}
            </div>
            <div className="text-micro opacity-50">{bossName(rung.boss)}</div>
          </div>
        ))}
      </div>

      <UnlockLadder unlocked={unlocked} />

      <div className="flex justify-end mt-5">
        <ActionButton kind="primary" onClick={onNext}>{t("campaign.failed.menu")}</ActionButton>
      </div>
    </Shell>
  );
}
