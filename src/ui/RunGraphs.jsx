import { fmtScore, fmtScoreShort } from "./format.js";
/* #menu-rework M7 — DIESE DATEI IST GETEILT, UND DAS ENTSCHEIDET, WAS HIER PASSIEREN DARF.

   Gemessen wird sie ausserdem gerendert von: der Siegesbildschirm
   (`GameOver.jsx`, drei Fundstellen) und die live laufende StatusRail (`ScoreSourceBar`).

   Sie wird deshalb WERTETREU umgestellt und NICHT umgestaltet: Literal zu `var(--token)`, null
   berechnetes Delta, und jeder Schritt unten ist derselbe Wert, den er ersetzt — `#141419` IST
   `--sf-ground`, `#2a2a34` IST `--ed-quiet`. Was KEINEN Schritt hat, bleibt stehen und wird gezaehlt
   statt gepraegt; die Begruendungen stehen an den Fundstellen und in `measurements/M7.md`.

   Der Beweis dafuer ist die Maschinen-Haelfte des Auftrags: `run-stage` muss null Deltas zeigen.
   Bewegt eine dieser Zeilen die Laufbuehne um einen Pixel, war die Umstellung nicht wertetreu. */

import { t as tr, fmtPct } from "../i18n/index.js"; // #sprache (tr = Alias: `t` ist hier lokal der Stich)

/* #251: Zwei Lauf-Auswertungen aus dem Live-state (nur der aktuelle Lauf — kein Storage nötig):
   (1) Verhältnis-Balken „woraus kommt der Score" — Formation / Gebäude / Serie / Crit / Sonstige.
   (2) Durchlauf-Graph — Score je Stich, je Durchlauf EIGENE Reihe + EIGENE Skala („Reset je Durchlauf"),
       Siege grün, Nicht-Siege rot. Datenquelle: state.trickLog[cycle] = [{gained, won}, …] + die Score-Anteil-
       Summen (formationScore/buildingScore/streakScore/critBonusScore) aus der Engine.
   Hinweis: die Score-Quellen greifen multiplikativ ineinander → die Aufteilung ist eine Näherung (sequentiell
   geklemmt, Rest = „Sonstige"), konsistent mit der bestehenden Score-Herkunft (runStats.js). */

// Reihenfolge = Attributions-Priorität (wie runStats: Formation → Crit → Gebäude) + Serie, dann Rest.
const SRC = [
  { key: "formation", labelKey: "graphs.src.formation", color: "#5a8ade", src: "formationScore" },
  { key: "crit",      labelKey: "graphs.src.crit",      color: "#8a7de0", src: "critBonusScore" },
  { key: "building",  labelKey: "graphs.src.building",   color: "#d1652f", src: "buildingScore" },
  { key: "serie",     labelKey: "graphs.src.serie",     color: "#5ab87a", src: "streakScore" },
  { key: "rest",      labelKey: "graphs.src.rest",  color: "#6b6b76", src: null },
];

const WIN = "#5ab87a", LOSS = "#c0504a";

/* Victory-Redesign: FRAKTIONS-Score-Herkunft. Priorität: erst die Eigen-Score-Kanäle je Fraktion (was die Engine
   direkt der Fraktion gutschreibt), dann die generischen Multiplikator-Quellen (Formation/Crit/Serie/Gebäude), Rest
   = Sonstige. Wie sourceShares sequentiell gegen den Gesamtscore geklemmt (die Kanäle greifen multiplikativ ineinander
   → die Aufteilung ist bewusst eine Näherung, priorisiert aber die für Spieler wichtigste Frage: „welche Fraktion?"). */
const FACTION_SRC = [
  { key: "glacier",   labelKey: "graphs.src.glacier", color: "#5ec8f0", srcs: ["glacierYield"] },
  { key: "plant",     labelKey: "graphs.src.plant",   color: "#69cf59", srcs: ["plantRoot", "plantBloom", "plantHarvest"] },
  { key: "light",     labelKey: "graphs.src.light",     color: "#8a7de0", srcs: ["lightYield"] },
  { key: "fire",      labelKey: "graphs.src.fire",      color: "#ff7a3c", srcs: ["fireBase", "fireWhite"] },
  { key: "formation", labelKey: "graphs.src.formation",        color: "#5a8ade", srcs: ["formationScore"] },
  { key: "crit",      labelKey: "graphs.src.crit",       color: "#b47cff", srcs: ["critBonusScore"] },
  { key: "serie",     labelKey: "graphs.src.serie",            color: "#e0b34a", srcs: ["streakScore"] },
  { key: "building",  labelKey: "graphs.src.building",          color: "#8f93a6", srcs: ["buildingScore"] },
  { key: "rest",      labelKey: "graphs.src.rest",         color: "#6b6b76", srcs: null },
];
export function factionShares(state) {
  const score = Math.max(0, Math.floor(state.score || 0));
  const c0 = (x) => Math.max(0, Math.round(x || 0));
  let rem = score;
  const rows = [];
  for (const s of FACTION_SRC) {
    let v;
    if (s.srcs == null) { v = Math.max(0, rem); rem = 0; }
    else { const raw = s.srcs.reduce((a, k) => a + c0(state[k]), 0); v = Math.min(rem, raw); rem -= v; }
    // Label erst hier auflösen — so bekommen ALLE Aufrufer (Victory, Stats) den übersetzten Namen.
    if (v > 0) rows.push({ ...s, label: tr(s.labelKey), value: v });
  }
  rows.sort((a, b) => b.value - a.value);
  return { score, rows };
}

/* Victory-Redesign: „Score-Herkunft" nach Fraktion — gestapelter Balken + Rangliste (absolute Werte + %). */
export function ScoreHerkunft({ state }) {
  const { score, rows } = factionShares(state);
  /* Kein Score (sofort beendeter Lauf): der Block bleibt STEHEN und zeigt Null — vorher gab er `null` zurück,
     und weil sein Panel im Victory-Screen trotzdem gerendert wird, stand dort ein leerer Kasten mit Rahmen.
     „Das Design bleibt, die Werte sind halt 0" ist die Regel; ein Screen, der bei einem kurzen Lauf anders
     GEBAUT ist als bei einem langen, liest sich als Fehler. */
  if (!score || !rows.length) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-meta-3 uppercase tracking-wide opacity-50">{tr("rail.scoreSource")}</span>
          <span className="text-meta-3 font-mono opacity-40">Σ {fmtScoreShort(0)}</span>
        </div>
        {/* Die Kante ist `--ed-quiet` — wertgleich. Der GRUND eines Graphen hat keinen Schritt:
            `--sf-sunken` liegt 8/6/12 daneben und ist heller, wo dieser dunkler sein muss als jedes
            Panel. Gezaehlt statt gepraegt (M7-G1), erste Sichtung. */}
        <div className="w-full h-[13px] rounded" style={{ background: "#0c0d14", border: "1px solid var(--ed-quiet)" }} />
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-meta-3 uppercase tracking-wide opacity-50">{tr("rail.scoreSource")}</span>
        <span className="text-meta-3 font-mono opacity-40" title={fmtScore(score)}>Σ {fmtScoreShort(score)}</span>
      </div>
      <div className="flex w-full h-[13px] rounded overflow-hidden" style={{ background: "#0c0d14", border: "1px solid var(--ed-quiet)" }}>
        {rows.map((r) => (
          <div key={r.key} title={`${r.label}: ${fmtScore(r.value)} (${fmtPct(r.value / score)})`} style={{ width: `${(r.value / score) * 100}%`, background: r.color }} />
        ))}
      </div>
      <div className="flex flex-col gap-0.5 mt-3">
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ gridTemplateColumns: "11px 1fr auto" }}>
            <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: r.color }} />
            <span className="text-body-3 font-medium truncate">{r.label}</span>
            <span className="text-right whitespace-nowrap" title={fmtScore(r.value)}>
              <b className="font-mono tabular-nums text-body-3" style={{ color: r.color }}>{fmtScoreShort(r.value)}</b>
              <span className="font-mono text-meta-3 opacity-40 ml-1.5">{fmtPct(r.value / score)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function sourceShares(state) {
  const score = Math.max(0, Math.floor(state.score || 0));
  const c0 = (x) => Math.max(0, Math.round(x || 0));
  let rem = score;
  const out = {};
  for (const s of SRC) {
    if (s.src == null) { out[s.key] = Math.max(0, rem); rem = 0; break; }
    const t = Math.min(rem, c0(state[s.src]));
    out[s.key] = t; rem -= t;
  }
  return { score, ...out };
}

/* #252: Reiner Verhältnis-Balken + %-Legende — GETEILT zwischen Victory-Screen (RunGraphs) und der Live-StatusRail.
   `showTitle` blendet die „Woraus kommt der Score"-Überschrift ein (Victory: an; StatusRail: aus, dort liefert der
   einklappbare Panel-Kopf den Titel). Gibt null zurück, solange noch kein Score da ist. */
export function ScoreSourceBar({ state, showTitle = true }) {
  const sh = sourceShares(state);
  if (!sh.score) return null;
  const total = sh.score || 1;
  return (
    <div>
      {showTitle && <div className="text-meta-3 uppercase tracking-wide opacity-50 mb-2">{tr("rail.scoreSource")}</div>}
      {/* `--sf-ground` und `--ed-quiet` sind WERTGLEICH: `#141419` und `#2a2a34` SIND die Schritte. */}
      <div className="flex w-full h-4 rounded overflow-hidden" style={{ background: "var(--sf-ground)", border: "1px solid var(--ed-quiet)" }}>
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return <div key={s.key} title={`${tr(s.labelKey)}: ${fmtScore(v)} (${fmtPct(v / total)})`} style={{ width: `${(v / total) * 100}%`, background: s.color }} />; })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-meta-1 font-mono">
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="w-[9px] h-[9px] rounded-[2px]" style={{ background: s.color }} />{tr(s.labelKey)} <b>{fmtPct(v / total)}</b>
            </span>
          ); })}
      </div>
    </div>
  );
}

/* `open` klappt den Durchlauf-Graph beim Rendern auf. Der Victory-Screen lässt ihn zu (der Screen ist ohnehin
   lang), die Lauf-Details öffnen ihn auf dem Desktop: dort ist der Graph der INHALT eines eigenen Panels — ein
   zugeklapptes `details` wäre eine Überschrift, hinter der die halbe Spalte leer bliebe. */
export function RunGraphs({ state, sourceBar = true, open = false }) {
  const sh = sourceShares(state);
  const log = Array.isArray(state.trickLog) ? state.trickLog : [];
  const hasGraph = log.some((c) => c && c.length);
  // Bezugsgroesse des Anteilsbalkens (#graph-gold): die Summe ALLER Durchlaeufe, nicht state.score —
  // der Graph soll sich auf das beziehen, was in ihm steht.
  const runScore = log.reduce((a, c) => a + (c || []).reduce((b, t) => b + (t.gained || 0), 0), 0);
  /* #stiche-breite: Der laengste Durchlauf gibt die Bahnbreite vor, alle anderen bekommen ihren Anteil
     daran. Ohne das streckt `flex-1` JEDE Zeile auf die volle Breite — ein Durchlauf mit einem einzigen
     Stich wurde damit zu EINEM Balken ueber die ganze Zeile (im Spiel gesehen: C12, 716 Punkte, ein Stich).
     Nebenwirkung, und der eigentliche Gewinn: die Balken sind ueber alle Zeilen gleich breit, die
     Zeilenlaenge sagt damit etwas (wie viele Stiche der Durchlauf hatte). Als CSS-Variable, weil die
     Breite nur ab 1280 px greift — am Handy bleibt es bei `flex-1`. Uebergeben wird die ZAHL, nicht der
     Anteil: der einzelne Balken rechnet sich daraus seinen Bruchteil der Bahn aus (s. index.css), und
     damit stimmt die Breite auch, wenn die Bahn selbst noch die Restbreite der Zeile fuellt. */
  const maxTricks = Math.max(1, ...log.map((c) => (c || []).length));
  if ((!sourceBar || !sh.score) && !hasGraph) return null;

  return (
    <div className="mt-5">
      {/* (1) Verhältnis-Balken: woraus kommt der Score (geteilte Komponente, auch live in der StatusRail #252).
             Im Victory-Redesign ersetzt der Fraktions-Breakdown (ScoreHerkunft) diesen generischen Balken → sourceBar={false}. */}
      {sourceBar && <ScoreSourceBar state={state} showTitle />}

      {/* (2) Durchlauf-Graph: Score je Stich, je Durchlauf getrennt (eigene Skala = „Reset je Durchlauf"). */}
      {hasGraph && (
        <details className="rg-perTrick mt-4 rounded-xl overflow-hidden" open={open} style={{ background: "var(--sf-ground)", border: "1px solid var(--ed-quiet)" }}>
          <summary className="cursor-pointer select-none px-3 py-2 text-meta-3 uppercase tracking-wide opacity-70">{tr("graphs.perTrick.open")}</summary>
          <div className="p-3 pt-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 text-meta-1 font-mono opacity-55 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: WIN }} />{tr("graphs.win")}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: LOSS }} />{tr("graphs.noWin")}</span>
              <span className="opacity-70">{tr("graphs.scaleHint")}</span>
            </div>
            {log.map((tricks, ci) => {
              if (!tricks || !tricks.length) return null;
              const cmax = Math.max(1, ...tricks.map((t) => t.gained || 0));
              const cycleScore = tricks.reduce((a, t) => a + (t.gained || 0), 0);
              return (
                <div key={ci} className="rg-row flex items-center gap-2">
                  <span className="rg-cyc text-micro-3 font-mono opacity-45 w-7 shrink-0 text-right">{tr("graphs.cycleAbbr", { n: ci + 1 })}</span>
                  <div className="rg-bars flex items-end gap-[1px] h-7 flex-1 min-w-0" style={{ "--rg-max": maxTricks }} title={tr("graphs.cycle.title", { n: ci + 1, score: fmtScore(cycleScore) })}>
                    {tricks.map((t, i) => {
                      const h = Math.max(6, Math.round(((t.gained || 0) / cmax) * 100));
                      return (
                        <div key={i} title={tr("graphs.trick.title", { n: i + 1, score: fmtScore(t.gained || 0), result: tr(t.won ? "graphs.win" : "graphs.noWin") })}
                          className={`rg-bar ${t.won ? "rg-w" : "rg-l"} flex-1 rounded-t-[1px]`} style={{ height: `${h}%`, minWidth: 1, background: t.won ? WIN : LOSS, opacity: t.won ? 1 : 0.55 }} />
                      );
                    })}
                  </div>
                  <span className="rg-cycsum text-micro-3 font-mono opacity-45 w-14 shrink-0 text-right tabular-nums truncate" title={fmtScore(cycleScore)}>
                    {/* #graph-gold: Anteil dieses Durchlaufs am Gesamtscore als Flaeche HINTER der Zahl.
                        Jede Zeile hat ihre eigene Skala (cmax je Durchlauf) — ein Balken in D1 und ein gleich
                        hoher in D9 bedeuten damit voellig verschiedene Punktzahlen (gemessen an einem echten
                        Lauf: Faktor 35). Der Hinweistext sagt das, steht aber klein ueber neun Zeilen, die
                        gleich aussehen. Die Flaeche traegt die zweite Lesart nach: Form INNERHALB des
                        Durchlaufs oben, Gewicht IM Lauf hier. Nur ab 1280 px sichtbar. */}
                    <i className="rg-share" aria-hidden="true" style={{ width: `${runScore > 0 ? Math.round((cycleScore / runScore) * 100) : 0}%` }} />
                    <b className="rg-cycnum">{fmtScoreShort(cycleScore)}</b>
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
