import { fmtScore } from "./format.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { RunTimer } from "./RunTimer.jsx";
import { DECK_BORDER } from "./modalStyle.jsx"; // #356: deck-getönter neutraler Struktur-Rahmen

/* Gameplay-Neu-Aufbau (docs/gameplay-redesign.md, Phase 1): die schwebende Kompakt-Leiste — die „Vitalwerte" des Laufs
   in einer oben klebenden Karte, samt Ablauf-Steuerung (Pause/Tempo/Karten). Ersetzt die früheren Kopf-Stat-Zellen.
   Rein präsentational — Score/Mult/Serie/Runde/Zeit werden fertig berechnet hereingereicht (kein Drift).

   #UI-Layout: zwei Zeilen. Oben Steuerung + Runde + Zeit (Sekundärwerte, rechts neben dem Karten-Icon). Unten der
   Score über die volle Breite (Platz bis 999.999.999, nie abgeschnitten) mit Serie und Mult rechts daneben. */

/* #kante: Tempo-/Pause-Schalter in der Kanten-Familie — gewählt trägt seinen Ton an der Kante statt als
   gefüllter Fläche. Das HUD ist der einzige Ort, den man in JEDEM Lauf dauernd sieht; hier zahlt Ruhe am
   meisten, und eine gefüllte Taste neben der laufenden Score-Zahl zog bisher den Blick. */
function Pill({ active, onClick, tone = "#8a7de0", title, children }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`${active ? "as-edge" : "as-edge-neutral"} as-edge-thin text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap`}
      style={active ? { "--c": tone } : undefined}>
      {children}
    </button>
  );
}

// Sekundärwert-Zelle (Zeile 1: Runde/Zeit) — kompakt, kleiner als die Score-Nachbarn.
function MiniCell({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col justify-center px-2 leading-none ${className}`} style={{ textAlign: "right" }}>
      <span className="text-[9px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{label}</span>
      <span className="ty-num mt-0.5 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", fontSize: 15 }}>{children}</span>
    </div>
  );
}

// Nachbar-Zelle des Scores (Zeile 2: Serie/Mult) — rechtsbündig, feste Grundschrift.
function Cell({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col justify-center gap-1 px-2.5 py-2 ${className}`} style={{ textAlign: "right" }}>
      <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{label}</span>
      <span className="ty-num leading-none whitespace-nowrap"
        style={{ fontVariantNumeric: "tabular-nums", fontSize: 18 }}>{children}</span>
    </div>
  );
}

export function StatusBar({
  score, ghost = {}, mult, timeStr, getElapsed = null, timerTicking = false, paused, winStreak = 0, bestStreak = 0,
  cycle = 0, totalCycles = 1,
  onTogglePause, speedMult = 1, onSpeed, onChronik, deckBack, className = "",
  // #buehne: Ab 1400 px ziehen Musik und Meilensteinbalken IN die Leiste — sie sind dort, wo man sie
  // sucht, und der Lauf spart zwei eigene Reihen. Der Umzug ist DOM (App.jsx entscheidet per useIsWide),
  // nicht Anordnung: zwei gerenderte Musikleisten wären zwei Fokus-Ziele und zwei Abo-Punkte am Player.
  // Unterhalb bleiben beide null → die Leiste ist dann exakt die von heute.
  music = null, milestone = null,
}) {
  const fmtMult = (x) => fmtNum(x.toFixed(2));
  const cyc = Math.min(cycle + 1, totalCycles);
  return (
    <div className={`sticky top-0 z-20 -mx-1 ${className}`} data-tut="bf-status">
      <div className="as-statusbar flex flex-col rounded-xl overflow-hidden as-panel as-panel-deck"
        style={{ background: "linear-gradient(180deg,#1b1a24f2,#141019f2)", border: `1px solid ${DECK_BORDER}`, backdropFilter: "blur(6px)", boxShadow: "0 8px 20px -8px #000" }}>

        {/* Zeile 1: Ablauf-Steuerung (Pause · Tempo · Karten) — links; Runde + Zeit rechts neben dem Karten-Icon.
            `sb-row1`/`sb-row2` sind ab 1400 px keine Boxen mehr (display: contents): die Zellen werden dann
            direkte Felder EINER Leiste. `sb-ctl` hält die vier Ablauf-Knöpfe dabei als Gruppe zusammen. */}
        <div className="sb-row1 flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderBottom: `1px solid ${DECK_BORDER}` }}>
          <div className="sb-ctl flex items-center gap-1.5">
            {/* Pause/Weiter — dauerhaft violett getönt, bei Pause gefüllt (Layout-Akzent, kein ablenkendes Orange). */}
            <button type="button" onClick={onTogglePause} title={t(paused ? "hud.resume" : "hud.pause")}
              className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
              style={paused
                ? { background: "#8a7de0", color: "#141419", border: "1px solid #8a7de0" }
                : { background: "#8a7de022", color: "#8a7de0", border: "1px solid #8a7de066" }}>
              {paused ? "▶" : "⏸"}
            </button>
            <Pill active={speedMult === 2} onClick={() => onSpeed(2)} title={t("hud.speed.x2")}>×2</Pill>
            <Pill active={speedMult === 4} onClick={() => onSpeed(4)} title={t("hud.speed.x4")}>×4</Pill>
            <Pill active={speedMult === 5} onClick={() => onSpeed(5)} title={t("hud.speed.max")}>{t("hud.speed.max.label")}</Pill>
          </div>
          {music}
          {onChronik && (
            <button type="button" onClick={onChronik} title={t("hud.cards.title")}
              className="sb-chronik as-edge-neutral as-edge-thin flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg transition-all hover:brightness-125 whitespace-nowrap">
              {deckBack
                ? <img src={deckBack} alt="" draggable="false" className="h-4 w-auto rounded-[2px] object-cover" style={{ border: "1px solid #ffffff22" }} />
                : <span>🎴</span>}
              <span className="hidden sm:inline">{t("hud.cards")}</span>
            </button>
          )}
          {/* Runde (nur der Durchlauf, keine Karten-Angabe mehr) + Zeit — rechts neben dem Karten-Icon. */}
          <div className="sb-mini ml-auto flex items-stretch">
            <MiniCell label={t("hud.cycle")}><span>{cyc}<span className="text-[10px] opacity-45">/{totalCycles}</span></span></MiniCell>
            <MiniCell label={t("hud.time")} className="border-l border-[color:var(--deck-border)]">
              {/* #perf A1: selbst-tickender Timer-Leaf statt App-weitem 250-ms-Tick; Fallback = statischer timeStr. */}
              {getElapsed
                ? <RunTimer getElapsed={getElapsed} ticking={timerTicking} paused={paused} />
                : <span>{timeStr}{paused ? " ⏸" : ""}</span>}
            </MiniCell>
          </div>
        </div>

        {/* Zeile 2: Score = wichtigster Wert, volle Breite (Platz bis 999.999.999, nie abgeschnitten). Das Rekord-Delta
            steht in der Label-Zeile darüber, damit die große Zahl beim Wachsen nicht verrutscht. Serie + Mult rechts. */}
        <div className="sb-row2 flex items-stretch">
          <div className="sb-score flex-1 flex flex-col justify-center gap-1 px-3.5 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{t("hud.score")}</span>
              {ghost.hasGhost && (ghost.passed
                ? <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "#8a7de0" }}>{t("hud.record")}</span>
                : ghost.delta != null
                  ? <span className="text-[10px] font-bold whitespace-nowrap tabular-nums" style={{ color: ghost.delta >= 0 ? "#5ab87a" : "#e0605a" }}>{ghost.delta >= 0 ? "▲ +" : "▼ "}{fmtScore(ghost.delta)}</span>
                  : null)}
            </div>
            {/* #: Bei sehr großen Zahlen (>100 Mio · 9+ Stellen) die Score-Schrift etwas verkleinern, damit die Zeile
                zusammen mit hoher Serie (z. B. 1000×) nicht rechts über den Rahmen hinausläuft. */}
            <span className="ty-num leading-none whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", fontSize: score >= 1000000000 ? 19 : score >= 100000000 ? 21 : 25, color: "#d4a63a" }}>{fmtScore(score)}</span>
          </div>
          {/* Serie — kann in den Tausenderbereich gehen; rechtsbündig neben dem Score. */}
          <Cell label={t("hud.streak")} className="sb-streak border-l border-[color:var(--deck-border)]">
            <span style={{ color: winStreak >= 3 ? "#e0605a" : "#e8e8ea" }}>{winStreak > 0 ? `${winStreak}×` : "–"}</span>
            <span className="text-[9px] opacity-45 ml-1">{t("hud.streak.best", { n: bestStreak })}</span>
          </Cell>
          {/* Mult — ganz rechts. */}
          <Cell label={t("hud.mult")} className="sb-mult border-l border-[color:var(--deck-border)]">
            <span className={mult?.shakeClass || ""}>
              <span key={mult?.pulseKey} className="inline-block rounded px-1.5 py-0.5 ty-num"
                style={{ fontVariantNumeric: "tabular-nums", fontSize: 18,
                         background: mult?.hot ? `${mult.color}22` : "#ffffff0f",
                         color: mult?.hot ? mult.color : "#8a8a92",
                         animation: mult?.pulseKey > 0 ? "as-multpulse 420ms ease-out" : undefined }}>
                ×{fmtMult(mult?.value ?? 1)}
              </span>
            </span>
          </Cell>
        </div>
        {milestone}
      </div>
    </div>
  );
}
