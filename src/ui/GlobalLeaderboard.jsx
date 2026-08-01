import { useEffect, useState } from "react";
import { leaderboardConfigured, fetchGlobalTop, fetchMasterTop } from "../game/leaderboard.js";
import { ARCHETYPE_META, decodeArchetypes } from "../game/skills.js";
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
  // #217/#201 P8-C: finale Aufstellung (nur bei Meister-Läufen befüllt) → RunDetail zeigt sie NUR für die eigene
  // Zeile (Anti-Copy #205 blendet sie bei anonymized aus).
  deckSnapshot: r.deck_snapshot,
  // #205: Seed → RunDetail zeigt den (kopierbaren, nachspielbaren) SeedChip. Kein Anti-Copy-Thema (Seed ist die
  // Herausforderung, kein Build-Detail).
  seed: r.seed ?? null, seedCode: r.seed != null ? formatSeed(r.seed) : null,
});

/* Globaler Highscore (#14): additiv UNTER dem lokalen Block. Holt Top-N selbst und
   degradiert lautlos — fehlende Config blendet den Block ganz aus, offline/Fehler zeigt
   einen dezenten Hinweis. Der lokale Block (beim Aufrufer) bleibt immer unberührt.

   mine        — der eigene, gerade gepostete Lauf → wird in der Liste hervorgehoben.
   reloadToken — neu laden, sobald er sich ändert (nach dem Submit, damit der eigene
                 Lauf enthalten ist).
   framed      — eigener Panel-Rahmen (StartScreen). Ohne: schlichte Sektion (Game-Over).
   masterGrade — #217: gesetzt (0..10) → zeigt das Master-Board GENAU dieses Rangs (fetchMasterTop) statt des
                 normalen Boards. Die Rang-Auswahl passiert außen (LeaderboardScreen). */
export function GlobalLeaderboard({ limit = 10, mine = null, reloadToken = 0, framed = false, masterGrade = null, onPlaySeed = null }) {
  const [rows, setRows] = useState(null);   // null = lädt · [] = leer · [...] = Daten
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null); // #169 FB-8: gewählte Zeile → RunDetail-Overlay
  const isMaster = masterGrade != null;

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setError(false);
    setRows(null);
    (isMaster ? fetchMasterTop(masterGrade, limit) : fetchGlobalTop(limit))
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [limit, reloadToken, masterGrade]);

  if (!leaderboardConfigured) return null; // ohne Config: Block entfällt komplett

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
      <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">{isMaster ? "Master" : "Global"} — Top {limit}</div>
      {error ? (
        <div className="text-xs opacity-40 text-center py-3">Global nicht verfügbar.</div>
      ) : rows === null ? (
        <div className="text-xs opacity-40 text-center py-3">Lädt globale Bestenliste …</div>
      ) : rows.length === 0 ? (
        <div className="text-xs opacity-40 text-center py-3">{isMaster ? "Noch keine Einträge auf diesem Rang." : "Noch keine globalen Einträge — sei die/der Erste."}</div>
      ) : (
        <div className="grid gap-1">
          {rows.map((r, i) => {
            const mineRow = isMine(r);
            const icons = archetypeIcons(r.archetypes); // #139: ein Icon je Skill (leer bei Alt-Einträgen)
            return (
              // #169 FB-8: Zeile klickbar → Detailansicht (RunStats). Alt-Einträge degradieren.
              <button key={i} onClick={() => setDetail({ entry: toRunEntry(r), rank: i + 1, anonymized: !mineRow })} title="Details anzeigen"
                className="flex items-center gap-2 text-sm px-2 py-1 rounded text-left w-full transition-all hover:brightness-125"
                style={{ background: mineRow ? "#5ab87a22" : "#20202a",
                  border: `1px solid ${mineRow ? "#5ab87a66" : "transparent"}` }}>
                <span className="opacity-50 w-6 shrink-0">#{i + 1}</span>
                <span className="flex-1 truncate" style={{ color: mineRow ? "#5ab87a" : "#e8e8ea" }}>
                  {r.name || "—"}{mineRow && <span className="opacity-60 text-xs"> · du</span>}
                </span>
                {icons.length > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0 text-xs leading-none">
                    {icons.map((m, k) => <span key={k} title={m.label}>{m.icon}</span>)}
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
