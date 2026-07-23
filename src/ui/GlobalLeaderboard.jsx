import { useEffect, useState } from "react";
import { leaderboardConfigured, fetchGlobalTop } from "../game/leaderboard.js";

/* Globaler Highscore (#14): additiv UNTER dem lokalen Block. Holt Top-N selbst und
   degradiert lautlos — fehlende Config blendet den Block ganz aus, offline/Fehler zeigt
   einen dezenten Hinweis. Der lokale Block (beim Aufrufer) bleibt immer unberührt.

   mine        — der eigene, gerade gepostete Lauf → wird in der Liste hervorgehoben.
   reloadToken — neu laden, sobald er sich ändert (nach dem Submit, damit der eigene
                 Lauf enthalten ist).
   framed      — eigener Panel-Rahmen (StartScreen). Ohne: schlichte Sektion (Game-Over). */
export function GlobalLeaderboard({ limit = 10, mine = null, reloadToken = 0, framed = false }) {
  const [rows, setRows] = useState(null);   // null = lädt · [] = leer · [...] = Daten
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setError(false);
    setRows(null);
    fetchGlobalTop(limit)
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [limit, reloadToken]);

  if (!leaderboardConfigured) return null; // ohne Config: Block entfällt komplett

  // Eigenen Lauf genau einmal hervorheben (erste Übereinstimmung).
  let flagged = false;
  const isMine = (r) => {
    if (flagged || !mine || !mine.name) return false;
    const hit = r.name === mine.name && r.score === mine.score
      && r.tricks === mine.tricks && r.cycles === mine.cycles;
    if (hit) flagged = true;
    return hit;
  };

  const body = (
    <>
      <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Global — Top {limit}</div>
      {error ? (
        <div className="text-xs opacity-40 text-center py-3">Global nicht verfügbar.</div>
      ) : rows === null ? (
        <div className="text-xs opacity-40 text-center py-3">Lädt globale Bestenliste …</div>
      ) : rows.length === 0 ? (
        <div className="text-xs opacity-40 text-center py-3">Noch keine globalen Einträge — sei die/der Erste.</div>
      ) : (
        <div className="grid gap-1">
          {rows.map((r, i) => {
            const mineRow = isMine(r);
            return (
              <div key={i} className="flex items-center gap-2 text-sm px-2 py-1 rounded"
                style={{ background: mineRow ? "#5ab87a22" : "#20202a",
                  border: `1px solid ${mineRow ? "#5ab87a66" : "transparent"}` }}>
                <span className="opacity-50 w-6 shrink-0">#{i + 1}</span>
                <span className="flex-1 truncate" style={{ color: mineRow ? "#5ab87a" : "#e8e8ea" }}>
                  {r.name || "—"}{mineRow && <span className="opacity-60 text-xs"> · du</span>}
                </span>
                <span className="font-bold shrink-0" style={{ color: "#d4a63a" }}>{r.score.toLocaleString("de-DE")}</span>
                <span className="opacity-40 text-xs shrink-0">{r.cycles ?? 0} R · {r.tricks}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return framed ? (
    <div className="w-full max-w-sm rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      {body}
    </div>
  ) : (
    <div className="mt-5">{body}</div>
  );
}
