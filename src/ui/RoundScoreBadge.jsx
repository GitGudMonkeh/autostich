/* #131: Rundenscore + %-Differenz zur Vorrunde — kleiner gemeinsamer Chip für ALLE Entscheidungs-Panels
   (Stat · Perk · Skill · Formation · Shop), damit die Info überall identisch aussieht. Liest die vom
   Reducer/Engine getrackten Felder (state.lastCycleScore / prevCycleScore) — keine eigene Rechenlogik im UI.
   Rendert nichts, solange noch kein Durchlauf abgeschlossen ist (Start-Panel → lastCycleScore == null). */
import { fmtScore } from "./format.js";
import { t } from "../i18n/index.js"; // #sprache

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
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${className}`}
      style={{ background: "#20202a", border: "1px solid #33333e" }}>
      <span className="opacity-55 uppercase tracking-wide text-[10px]">{t("roundscore.label")}</span>
      <span className="font-bold ty-num" style={{ color: "#d4a63a" }}>{scoreStr}</span>
      {hasDiff
        ? <span className="font-bold" title={t("roundscore.diff.title")} style={{ color: diffColor }}>{diffStr}</span>
        : <span className="opacity-45" title={t("roundscore.noPrev.title")}>{prev == null ? t("roundscore.firstCycle") : "—"}</span>}
    </span>
  );
}
