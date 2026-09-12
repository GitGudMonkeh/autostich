/* #131: Rundenscore + %-Differenz zur Vorrunde — kleiner gemeinsamer Chip für ALLE Entscheidungs-Panels
   (Stat · Perk · Skill · Formation · Shop), damit die Info überall identisch aussieht. Liest die vom
   Reducer/Engine getrackten Felder (state.lastCycleScore / prevCycleScore) — keine eigene Rechenlogik im UI.
   Rendert nichts, solange noch kein Durchlauf abgeschlossen ist (Start-Panel → lastCycleScore == null). */
import { fmtScore } from "./format.js";
import { t } from "../i18n/index.js"; // #sprache
import { CoinAmount } from "./CoinMark.jsx"; // Münz-Ökonomie (§4): die Auszahlung des Durchlaufs sichtbar machen

/* Münz-Auszahlung des eben beendeten Durchlaufs (docs/muenz-oekonomie.md §4): „N Formationen → +M". Sie
   steht NEBEN dem Rundenscore, weil beide dasselbe beantworten — was der Durchlauf gebracht hat — und
   weil der Chip damit ohne eigene Verdrahtung auf allen Entscheidungs-Panels erscheint.
   Die Zahl nennt die AUFSTELLUNG, nicht die Siege: seit die Einnahme an den Formationen hängt, ist das
   die Größe, die der Spieler beeinflusst hat — und die Zeile ist der schnellste Weg, das zu lernen. */
function CoinPayoutChip({ state }) {
  const paid = state.lastCycleCoins;
  if (paid == null) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-body-5"
      style={{ background: "#20202a", border: "1px solid #33333e" }} title={t("coins.payout.title")}>
      <span className="opacity-55 uppercase tracking-wide text-meta-1">{t("coins.payout.label", { n: state.lastCycleForms ?? 0 })}</span>
      <CoinAmount n={paid} dim={paid === 0} className="font-bold" />
    </span>
  );
}

export function RoundScoreBadge({ state = {}, className = "" }) {
  const last = state.lastCycleScore;
  if (last == null) return null; // vor dem ersten abgeschlossenen Durchlauf: kein Rundenscore vorhanden
  const prev = state.prevCycleScore;
  const scoreStr = fmtScore(last);
  // %-Differenz nur mit sinnvoller Vorrunde: erste Runde (prev == null) oder Vorrunde mit 0 Punkten → keine Angabe.
  const hasDiff = prev != null && prev !== 0;
  const pct = hasDiff ? Math.round(((last - prev) / prev) * 100) : 0;
  // (Nulllage zuerst — hält die Zeile frei von der Folge „> … <", die der i18n-Textgreifer sonst greift.)
  const diffColor = pct === 0 ? "#8a8a92" : (pct > 0 ? "#5ab87a" : "#e0605a");
  const diffSign = pct === 0 ? "±" : (pct > 0 ? "+" : "−");
  const diffStr = t("roundscore.diff", { sign: diffSign, pct: Math.abs(pct) });
  return (
    /* Zwei Chips in einer Zeile, umbrechend: auf 390 px stehen Rundenscore und Auszahlung untereinander,
       ab da nebeneinander. `className` bleibt am ÄUSSEREN Element — die Aufrufer setzen darüber ihre
       Randabstände (lv-score), und die Chips selbst sollen davon nichts merken. */
    <span className={`inline-flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-body-5"
        style={{ background: "#20202a", border: "1px solid #33333e" }}>
        <span className="opacity-55 uppercase tracking-wide text-meta-1">{t("roundscore.label")}</span>
        <span className="font-bold ty-num" style={{ color: "#d4a63a" }}>{scoreStr}</span>
        {hasDiff
          ? <span className="font-bold" title={t("roundscore.diff.title")} style={{ color: diffColor }}>{diffStr}</span>
          : <span className="opacity-45" title={t("roundscore.noPrev.title")}>{prev == null ? t("roundscore.firstCycle") : "—"}</span>}
      </span>
      <CoinPayoutChip state={state} />
    </span>
  );
}
