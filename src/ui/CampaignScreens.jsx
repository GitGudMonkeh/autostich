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
/* Nicht das #6e6e7a der übrigen Panels: auf der Kartenfläche kommt es auf 3,6:1 und die
   Kleinschrift dieser Schirme steht bei 9 px. Dieser Ton liegt bei 5,4:1 (Mobil-Pass 2026-09-25). */
const MUTED = "#8f8f9c";

/* Die Schale portalt selbst, nicht ihre Aufrufer: EIN Vollbild-Kasten, EINE Naht.
   Warum überhaupt: overlayPortal.jsx, Wächter: test/overlay-nesting.test.js.

   `max-h-[95dvh] overflow-y-auto` trugen ALLE anderen Overlays des Spiels und diese eine nicht.
   Gerechnet kommt die Leiter auf rund 600 px, und auf einem Handy bleiben nach der Browserleiste
   etwa 660: es passte knapp und schnitt auf einem kleineren Gerät ab, ohne Weg zum Scrollen.
   Die Innenkante ist auf dem Handy 16 px und erst ab `sm` 24 — bei 390 px Breite frassen 24 plus
   der Aussenrand sonst 80 px der Zeile. */
const Shell = ({ accent = "gold", children }) => overlayPortal(
  <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(10,10,14,0.82)" }}>
    <div className="w-full max-w-3xl rounded-2xl p-4 sm:p-6 max-h-[95dvh] overflow-y-auto"
         style={phaseCard(PHASE_ACCENTS[accent] || PHASE_ACCENTS.gold)}>
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

/* ---- Die Leiter selbst (Owner-Entscheid „B", Mobil-Pass 2026-09-25).

   Eine geschaffte oder kommende Stufe ist eine schmale Sprosse an einer durchgehenden Linie; die
   AKTUELLE ist eine Karte mit der Schwelle gross und dem Startknopf darin. Der Grund ist die
   Handybreite: entschieden wird über genau eine Stufe, und zwischen fünf gleich grossen Zeilen
   stand sie gleichberechtigt.

   Auf einer kommenden Sprosse treffen ZWEI Sorten Information aufeinander, und sie sind optisch
   getrennt statt mit einem Punkt verbunden (Owner-Entscheid „c"): die Boss-ART ist ein Platzhalter
   für den verdeckten Namen und steht klein und grau, die BELOHNUNG ist das Ziel der Stufe und steht
   in Gold. Verbunden gelesen ergab „Miniboss · Sehr selten" einen Namen, den es nicht gibt.

   `final` ist der Siegschirm: dort ist jede Sprosse geschafft, also steht rechts nur noch der
   erreichte Score (ein „/ Schwelle" zeigt ein Ziel, das hinter einem liegt — dieselbe Regel wie in
   der Schwellen-Leiste oben), und der Endboss behält sein Violett, statt im Grün der vier davor zu
   verschwinden. ---- */
const CHIP_INK = "#141018";   // eine dunkle Tinte für alle drei Chipfarben statt drei Sondertönen

/* „Belohnung: <Name>", Name in Gold. Der Satz wird am PLATZHALTER geteilt, nicht mit
   `{ name: "" }` abgeschnitten: so darf `{name}` im Katalog auch mitten im Satz stehen, ohne dass
   die zweite Hälfte still verschwindet. Ohne Variablen gibt `t()` die Vorlage unverändert zurück. */
const Grants = ({ id }) => {
  const [pre, post = ""] = t("campaign.boss.grants").split("{name}");
  return <>{pre}<span style={{ color: GOLD, fontWeight: 500 }}>{unlockName(id)}</span>{post}</>;
};

const Rung = ({ rung, state, score = null, line, final = false }) => {
  const done = state === "done";
  const end = isEndBoss(rung.boss);
  const col = done ? (final && end ? VIOLET : GREEN) : end ? VIOLET : MUTED;
  return (
    <div className="relative flex items-center gap-3 py-1">
      <span className="ty-num text-meta flex-none w-6 h-6 rounded-full flex items-center justify-center"
            style={done ? { background: col, color: CHIP_INK, boxShadow: `0 0 0 4px ${line}` }
                        : { border: `1px solid ${col}77`, color: col, background: line }}>
        {rung.step}
      </span>
      {done ? (
        <span className="flex-1 min-w-0 text-meta truncate" style={{ color: final ? "#b9b9c4" : col }}>
          {bossName(rung.boss)}
        </span>
      ) : (
        <span className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
          <span className="text-micro flex-none" style={{ color: col }}>
            {t(end ? "campaign.boss.kind.end" : "campaign.boss.kind.mid")}
          </span>
          <span className="text-meta truncate" style={{ color: GOLD }}>{unlockName(rung.unlock)}</span>
        </span>
      )}
      <span className={`ty-num-sm flex-none ${final ? "text-body-lg font-bold" : "text-meta"}`} style={{ color: col }}>
        {!done || score == null ? t("campaign.threshold", { n: mio(rung.threshold) })
          : final ? t("campaign.threshold", { n: mio(score) })
                  : t("campaign.bar.progress", { a: mio(score), b: mio(rung.threshold) })}
      </span>
    </div>
  );
};

export function Ladder({ campaign, onStart = null }) {
  const c = campaign || CP.emptyCampaign();
  const step = c.step || 1;
  const scores = c.scores || [];
  const final = !!c.done;
  /* Der Ton, auf dem die Stufenzahlen sitzen. Die Linie läuft HINTER ihnen durch, also braucht die
     Zahl einen deckenden Ring in der Kartenfarbe, sonst läuft die Linie mitten durch die Ziffer. */
  const line = "#17151d";
  return (
    <div className="relative flex flex-col gap-1 mb-4">
      <div className="absolute left-3 top-4 bottom-4 w-0.5 -translate-x-1/2"
           style={{ background: final
             ? `linear-gradient(180deg, ${GREEN}, ${GREEN} 78%, ${VIOLET})`
             : `linear-gradient(180deg, ${GREEN}, ${GOLD} 45%, rgba(255,255,255,0.10) 62%, ${VIOLET}88)` }} />
      {CP.LADDER.map((rung) => {
        const done = rung.step < step || (rung.step === step && final);
        const now = rung.step === step && !final;
        if (!now) {
          return <Rung key={rung.step} rung={rung} state={done ? "done" : "open"} final={final}
                       score={done ? scores[rung.step - 1] ?? null : null} line={line} />;
        }
        return (
          <div key={rung.step} className="relative my-2 p-4 rounded-2xl flex flex-col gap-3"
               style={{ border: `2px solid ${GOLD}9e`, background: `linear-gradient(180deg, ${GOLD}24, ${GOLD}0a)` }}>
            <div className="flex items-start gap-3">
              <span className="ty-num text-meta flex-none w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: GOLD, color: CHIP_INK }}>{rung.step}</span>
              <div className="min-w-0 flex-1">
                <Head color={GOLD}>
                  {t(isEndBoss(rung.boss) ? "campaign.boss.kind.end" : "campaign.boss.kind.mid")}
                </Head>
                <div className="ty-num text-figure font-bold leading-none mt-1" style={{ color: "#f0d79a" }}>
                  {t("campaign.threshold", { n: mio(rung.threshold) })}
                </div>
              </div>
            </div>
            <div className="text-body"><Grants id={rung.unlock} /></div>
            {onStart && (
              <ActionButton kind="primary" onClick={onStart} className="w-full">
                {t("campaign.start", { n: rung.step })}
              </ActionButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Übersicht: die ganze Leiter auf einmal.

   Der Startknopf steht NUR in der Karte der aktuellen Stufe, nicht noch einmal im Fuß: zwei gleich
   beschriftete Knöpfe auf einem Handyschirm sind keine zwei Angebote, sondern eine Rückfrage. ---- */
export function CampaignOverview({ campaign, onStart, onGiveUp, onReset = null }) {
  const c = campaign || CP.emptyCampaign();
  const step = c.step || 1;
  const [armed, setArmed] = useState(null); // null | "giveUp" | "reset"
  return (
    <Shell accent="gold">
      <div className="mb-4">
        <Head>{t("start.campaign")}</Head>
        <h2 className="ty-title text-head font-bold mt-1">{t("campaign.title", { n: step, max: CP.STEPS })}</h2>
      </div>

      <Ladder campaign={c} onStart={() => { setArmed(null); onStart(); }} />

      <div className="flex items-center gap-5 mt-5 flex-wrap">
        <KillButton armed={armed === "giveUp"} onArm={() => setArmed("giveUp")} onFire={onGiveUp}
          label={t("campaign.giveUp")} sure={t("campaign.giveUp.sure")} color={RED} />
        {/* Testknopf: setzt die Leiter auf Stufe 1 zurück, samt Freischaltungen. */}
        {onReset && (
          <KillButton armed={armed === "reset"} onArm={() => setArmed("reset")} onFire={onReset}
            label={t("campaign.reset")} sure={t("campaign.reset.sure")} color={RED} />
        )}
      </div>
    </Shell>
  );
}

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
    /* Die Kopfzeile trägt NUR Sorte und Stufe/Schwelle; der Name steht als eigene Zeile darunter.
       Nebeneinander umbrach „ENDBOSS · Der Denkmalpfleger · Stufe 1 · 5 Mio" auf 390 px in drei
       Zeilen, und das Wichtigste stand dann in der Mitte. */
    <div className="rounded-xl p-4 flex flex-col gap-2.5" style={{ border: `1px solid ${col}77`, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2.5">
        <span className="ty-badge rounded px-2 py-0.5 text-micro flex-none" style={{ background: col, color: CHIP_INK }}>
          {t(end ? "campaign.boss.end" : "campaign.boss.mid")}
        </span>
        <span className="ty-num-sm ml-auto text-meta opacity-70 whitespace-nowrap">
          {t("campaign.step", { n })} · {t("campaign.threshold", { n: mio(rung.threshold) })}
        </span>
      </div>
      <h2 className="ty-title text-head font-bold leading-tight" style={{ color: col }}>{bossName(boss)}</h2>
      <p className="text-body opacity-90">{bossText(boss)}</p>
      <div className="h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
      {/* Wofür man spielt, direkt unter dem, wogegen man spielt. */}
      <div className="text-body"><Grants id={rung.unlock} /></div>
    </div>
  );
  if (inline) return block;
  return (
    <Shell accent={end ? "violet" : "red"}>
      {block}
      <div className="flex flex-col sm:flex-row sm:justify-end mt-4">
        <ActionButton kind="primary" onClick={onStart} className="w-full sm:w-auto">
          {t("campaign.start", { n })}
        </ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Freischaltung im Goldrahmen.

   Nur die EINE neue Freischaltung, keine Übersicht der schon vergebenen darunter (Owner
   2026-09-25): was man bereits hat, sieht man im Spiel, und auf dem Belohnungsschirm zieht eine
   Liste den Blick von dem weg, wofür man gerade gespielt hat. ---- */
export function CampaignUnlock({ id, nextStep = 2, onNext }) {
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
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <ActionButton kind="primary" onClick={onNext} className="w-full sm:w-auto">
          {t("campaign.unlock.next", { n: nextStep })}
        </ActionButton>
      </div>
    </Shell>
  );
}

/* ---- Stufe verfehlt. Die Kampagne ist NICHT vorbei: dieselbe Stufe wird wiederholt, die
   Freischaltungen bleiben (Owner 2026-09-25). Deshalb steht hier auch kein „das ist weg".

   Die Leiste unter der Zahl ist dieselbe Rechnung wie die Schwellen-Leiste im Lauf, nur eingefroren:
   wer knapp danebenlag, sieht das hier, und die nackte Zahl allein sagt es nicht. ---- */
export function CampaignFailed({ campaign, score = 0, onAgain, onMenu, onReset = null }) {
  const c = campaign || CP.emptyCampaign();
  const step = c.step || 1;
  const [armed, setArmed] = useState(false);
  const p = CP.thresholdProgress(c, score, step);
  return (
    <Shell accent="red">
      <div className="rounded-xl p-4 mb-4 flex flex-col gap-3" style={{ border: `1px solid ${RED}66` }}>
        <div>
          <Head color={RED}>{t("campaign.over.failed", { n: step })}</Head>
          <h2 className="ty-title text-title font-bold mt-1">{t("campaign.failed.title", { n: step })}</h2>
        </div>
        <div className="flex items-end gap-2.5 flex-wrap">
          <span className="ty-num text-figure font-bold leading-none" style={{ color: RED }}>
            {t("campaign.threshold", { n: mio(score) })}
          </span>
          <span className="ty-num-sm text-meta pb-0.5 opacity-70">
            {t("campaign.over.need", { n: mio(CP.thresholdFor(c, step)) })}
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#26262f" }}>
          <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: RED }} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end">
        <ActionButton kind="primary" onClick={onAgain} className="w-full sm:w-auto">
          {t("campaign.failed.again", { n: step })}
        </ActionButton>
      </div>

      <div className="flex items-center gap-5 mt-4">
        {onReset && (
          <KillButton armed={armed} onArm={() => setArmed(true)} onFire={onReset}
            label={t("campaign.reset")} sure={t("campaign.reset.sure")} color={RED} />
        )}
        <div className="flex-1" />
        <button type="button" onClick={onMenu} className="text-meta opacity-60 hover:opacity-100">{t("campaign.failed.menu")}</button>
      </div>
    </Shell>
  );
}

/* ---- Die Leiter ist durch. Weiter geht es erst, wenn Stufe 6 gebaut ist — der Schirm kündigt
   deshalb nichts an, was der Spieler danach nicht vorfindet.

   DIESELBE Leiter wie auf der Übersicht, nur im Endzustand (`campaign.done`), statt eines zweiten
   Rasters aus Kacheln: es ist derselbe Weg, den man fünfmal angesehen hat, und auf 390 px waren
   fünf Kacheln zwei Spalten mit einem Waisenkind. ---- */
export function CampaignWon({ campaign, onNext }) {
  const c = campaign || CP.emptyCampaign();
  return (
    <Shell accent="gold">
      <div className="text-center mb-5">
        <div className="ty-screen-title text-micro" style={{ color: GOLD }}>
          {t("campaign.won.fallen", { boss: bossName(CP.LADDER[CP.STEPS - 1].boss) })}
        </div>
        <h2 className="ty-title text-figure font-bold mt-2 leading-tight">{t("campaign.won.title")}</h2>
      </div>

      <Ladder campaign={{ ...c, done: true }} />

      <div className="flex flex-col sm:flex-row sm:justify-end mt-5">
        <ActionButton kind="primary" onClick={onNext} className="w-full sm:w-auto">
          {t("campaign.failed.menu")}
        </ActionButton>
      </div>
    </Shell>
  );
}
