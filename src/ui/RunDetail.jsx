import { useEscape } from "./useEscape.js";
import { RunStats } from "./RunStats.jsx";
import { CardGrid } from "./CardGrid.jsx"; // #201.8 Stufe B: finale Aufstellung aus dem Snapshot (schreibgeschützt)
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: Seed kopieren / nachspielen
import { fmtScore } from "./format.js";

/* #169 FB-8: Detailansicht eines Bestenlisten-Eintrags (lokal ODER global) — Overlay über der Liste, zeigt
   denselben Statblock wie der eigene Victory-Screen (RunStats). Escape/Klick-außen schließt. `entry` ist bereits
   normalisiert (perks/skills als ID-Arrays; global-Strings dekodieren die Aufrufer). Alt-/pre-Migration-Einträge
   liefern nur einen Teil der Felder → RunStats zeigt „–" bzw. blendet leere Blöcke aus. */
/* #205: `anonymized` (fremder Board-Eintrag) blendet Build-Blöcke aus — Perk-/Skill-Chips (via RunStats) UND
   die finale Aufstellung — sodass fremde Runs nicht 1:1 nachbaubar sind (nur Kennzahlen/Icons/Score/Seed).
   Eigene/lokale Läufe bleiben voll. `onPlaySeed` (optional) macht den Seed-Chip nachspielbar. */
export function RunDetail({ entry, rank = null, onClose, anonymized = false, onPlaySeed = null }) {
  useEscape(onClose);
  if (!entry) return null;
  const name = entry.name;
  const score = typeof entry.score === "number" ? entry.score : 0;
  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10dd", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Lauf-Details{rank != null ? ` · #${rank}` : ""}</div>
            {name && <div className="text-lg font-bold mt-0.5 truncate">{name}</div>}
          </div>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>
        <div className="text-center my-3">
          <div className="text-4xl font-bold" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-xs opacity-50 mt-0.5">Score</div>
          {/* #205: Seed dieses Laufs — kopieren & (optional) nachspielen. Alt-Läufe ohne Seed zeigen nichts. */}
          {entry.seedCode && (
            <div className="flex justify-center mt-2">
              <SeedChip code={entry.seedCode} onReplay={onPlaySeed ? () => onPlaySeed(entry.seed) : null} />
            </div>
          )}
        </div>
        <RunStats entry={entry} anonymized={anonymized} />
        {/* #201.8 Stufe B: finale Deck-Aufstellung, sofern der Lauf einen Snapshot hat (nur eigene/lokale Läufe;
            alte Einträge & globale Fremd-Läufe haben keinen → Abschnitt wird ausgeblendet). #205: bei anonymized aus. */}
        {!anonymized && entry.deckSnapshot?.cards?.length > 0 && (
          <details className="mt-4 rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">Finale Aufstellung ansehen</summary>
            <div className="p-3 pt-0">
              <CardGrid cards={entry.deckSnapshot.cards} formations={entry.deckSnapshot.formations || []} quietTiles />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
