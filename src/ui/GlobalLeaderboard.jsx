import { useEffect, useState } from "react";
import { leaderboardConfigured, fetchGlobalTop, fetchBoardTop } from "../game/leaderboard.js";
import { ARCHETYPE_META, decodeArchetypes } from "../game/skills.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { RunDetail } from "./RunDetail.jsx";
import { fmtScore } from "./format.js";
import { formatSeed } from "../game/rng.js"; // #205: Seed der Board-Zeile → SeedChip/Nachspielen in RunDetail

// Gespeicherte Archetyp-Kodierung ("fire,ice") → Icon-Meta in fester Reihenfolge Blitz→Feuer→Eis (#139).
// Alt-Einträge ohne Wert ergeben einfach keine Icons.
const archetypeIcons = (value) => decodeArchetypes(value).map((a) => ARCHETYPE_META[a]);

// #169 FB-8: DB-Zeile (snake_case; perks/skills als kompakte ID-Liste) → normalisierter RunStats-Eintrag.
// Alt-/pre-Migration-Zeilen liefern die Zusatzfelder nicht → RunStats zeigt „–" bzw. blendet leere Blöcke aus.
const toRunEntry = (r) => ({
  name: r.name, score: r.score,
  bestStreak: r.best_streak,
  perks: r.perks !== undefined ? (r.perks || "").split(",").filter(Boolean) : undefined,
  skills: r.skills !== undefined ? (r.skills || "").split(",").filter(Boolean) : undefined,
  maxFormations: r.max_formations, formationScore: r.formation_score,
  crits: r.crits, wins: r.wins, critBonusScore: r.crit_bonus_score, bestTrickScore: r.best_trick_score,
  tricks: r.tricks, // Victory-Redesign: Winrate-Nenner (Siege / gespielte Stiche) auch in der globalen Detailansicht
  // #217/#201 P8-C: finale Aufstellung (nur bei Meister-Läufen befüllt) → RunDetail zeigt sie NUR für die eigene
  // Zeile (Anti-Copy #205 blendet sie bei anonymized aus).
  deckSnapshot: r.deck_snapshot,
  // #205: Seed → RunDetail zeigt den (kopierbaren, nachspielbaren) SeedChip. Kein Anti-Copy-Thema (Seed ist die
  // Herausforderung, kein Build-Detail).
  // #241: seed ist bigint → kommt als String aus der REST-API → als Zahl casten, sonst zeigt SeedChip nichts
  // (formatSeed toleriert Strings) UND startRun ignoriert den Seed (akzeptiert nur typeof number) → Nachspielen kaputt.
  seed: r.seed != null ? Number(r.seed) : null, seedCode: r.seed != null ? formatSeed(Number(r.seed)) : null,
});

/* Globaler Highscore (#14): additiv UNTER dem lokalen Block. Holt Top-N selbst und
   degradiert lautlos — fehlende Config blendet den Block ganz aus, offline/Fehler zeigt
   einen dezenten Hinweis. Der lokale Block (beim Aufrufer) bleibt immer unberührt.

   mine        — der eigene, gerade gepostete Lauf → wird in der Liste hervorgehoben.
   reloadToken — neu laden, sobald er sich ändert (nach dem Submit, damit der eigene
                 Lauf enthalten ist).
   framed      — eigener Panel-Rahmen (StartScreen). Ohne: schlichte Sektion (Game-Over).
   board       — §7: gesetzt ('standard'|'meister') → getrenntes Ranglisten-Board (fetchBoardTop) statt des
                 ungefilterten Global-Boards (fetchGlobalTop, alle Läufe). */
export function GlobalLeaderboard({ limit = 10, mine = null, reloadToken = 0, framed = false, board = null, seed = null, hideHeader = false, onPlaySeed = null }) {
  const [rows, setRows] = useState(null);   // null = lädt · [] = leer · [...] = Daten
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null); // #169 FB-8: gewählte Zeile → RunDetail-Overlay

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setError(false);
    setRows(null);
    (board ? fetchBoardTop(board, limit, seed) : fetchGlobalTop(limit))
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
   
  }, [limit, reloadToken, board, seed]);

  if (!leaderboardConfigured) return null; // ohne Config: Block entfällt komplett

  const boardLabel = board === "standard" ? "Standard" : board === "meister" ? "Rangliste" : "Global"; // #370: Wochen-Ranked (Board-String bleibt "meister")

  // Eigenen Lauf genau einmal hervorheben (erste Übereinstimmung).
  // #229 N2: bevorzugt per eindeutiger id (das Board vergibt sie, publishRun reicht sie in myEntry nach) → trifft
  // nie eine gleichnamige Fremd-Zeile. Fallback auf die name+score-Heuristik nur, wenn keine id vorliegt
  // (z. B. Preview-Build schreibt nie → kein eigener Eintrag im Board, dann ist der Fallback ohnehin folgenlos).
  let flagged = false;
  const isMine = (r) => {
    if (flagged || !mine) return false;
    const hit = mine.id != null
      ? r.id === mine.id
      : (!!mine.name && r.name === mine.name && r.score === mine.score
          && r.tricks === mine.tricks && r.cycles === mine.cycles);
    if (hit) flagged = true;
    return hit;
  };

  const body = (
    <>
      {!hideHeader && <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">{boardLabel} — Top {limit}</div>}
      {error ? (
        <div className="text-xs opacity-40 text-center py-3">{boardLabel} nicht verfügbar.</div>
      ) : rows === null ? (
        <div className="text-xs opacity-40 text-center py-3">Lädt Bestenliste …</div>
      ) : rows.length === 0 ? (
        <div className="text-xs opacity-40 text-center py-3">Noch keine Einträge — sei die/der Erste.</div>
      ) : (
        <div className="grid gap-1">
          {rows.map((r, i) => {
            const mineRow = isMine(r);
            const icons = archetypeIcons(r.archetypes); // #139: ein Icon je Skill (leer bei Alt-Einträgen)
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null; // Medaillen für die Top 3
            return (
              // #169 FB-8: Zeile klickbar → Detailansicht (RunStats). Alt-Einträge degradieren.
              <button key={r.id ?? `${r.name}:${r.score}:${r.tricks}:${r.cycles}`} onClick={() => setDetail({ entry: toRunEntry(r), rank: i + 1, anonymized: !mineRow })} title="Details anzeigen"
                className="flex items-center gap-2 text-sm px-2 py-1 rounded text-left w-full transition-all hover:brightness-125"
                style={{ background: mineRow ? "#5ab87a22" : "#20202a",
                  border: `1px solid ${mineRow ? "#5ab87a66" : "transparent"}` }}>
                <span className="w-6 shrink-0 text-center tabular-nums" style={medal ? { fontSize: "14px" } : { opacity: 0.5 }}>{medal || `#${i + 1}`}</span>
                <span className="flex-1 truncate" style={{ color: mineRow ? "#5ab87a" : "#e8e8ea" }}>
                  {r.name || "—"}{mineRow && <span className="opacity-60 text-xs"> · du</span>}
                </span>
                {icons.length > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0 text-xs leading-none">
                    {icons.map((m, k) => <FactionIcon key={k} type={m.key} size={12} title={m.label} />)}
                  </span>
                )}
                <span className="font-bold shrink-0" style={{ color: "#d4a63a" }}>{fmtScore(r.score)}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <>
      {framed ? (
        <div className="w-full max-w-sm rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
          {body}
        </div>
      ) : (
        <div className="mt-5">{body}</div>
      )}
      {/* #205 Anti-Copy: fremde Board-Läufe anonymisiert (nur Kennzahlen/Icons/Score, keine Perks/Skills/Aufstellung). */}
      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} anonymized={detail.anonymized} onPlaySeed={onPlaySeed} />}
    </>
  );
}
