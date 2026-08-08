import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { RunStats } from "./RunStats.jsx";
import { CardGrid } from "./CardGrid.jsx"; // #201.8 Stufe B: finale Aufstellung aus dem Snapshot (schreibgeschützt)
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: Seed kopieren / nachspielen
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { fmtScore } from "./format.js";
import { familyDef as archFamily } from "../game/architect.js"; // Gebäude-Liste (Name/Form/Stufe) in den Lauf-Details
import { ARCH_CAT } from "./indicators/vocab.js";
import FormIcon from "./FormIcon.jsx";

/* #169 FB-8: Detailansicht eines Bestenlisten-Eintrags (lokal ODER global) — Overlay über der Liste, zeigt
   denselben Statblock wie der eigene Victory-Screen (RunStats). Escape/Klick-außen schließt. `entry` ist bereits
   normalisiert (perks/skills als ID-Arrays; global-Strings dekodieren die Aufrufer). Alt-/pre-Migration-Einträge
   liefern nur einen Teil der Felder → RunStats zeigt „–" bzw. blendet leere Blöcke aus. */
/* #205: `anonymized` (fremder Board-Eintrag) blendet Build-Blöcke aus — Perk-/Skill-Chips (via RunStats) UND
   die finale Aufstellung — sodass fremde Runs nicht 1:1 nachbaubar sind (nur Kennzahlen/Icons/Score/Seed).
   Eigene/lokale Läufe bleiben voll. `onPlaySeed` (optional) macht den Seed-Chip nachspielbar. */
export function RunDetail({ entry, rank = null, onClose, anonymized = false, onPlaySeed = null }) {
  useEscape(onClose);
  const [showArch, setShowArch] = useState(true);     // Gebäude-Overlay auf dem Brett an/aus (wie im Victory-Screen)
  const [inspectBid, setInspectBid] = useState(null); // Liste ↔ Brett: angetipptes Gebäude glüht am Grid
  if (!entry) return null;
  const name = entry.name;
  const score = typeof entry.score === "number" ? entry.score : 0;
  // Architekt-Gebäude aus dem Snapshot (nur neue Läufe haben sie mitgespeichert → sonst kein Gebäude-Block).
  const snap = entry.deckSnapshot || null;
  const archCover = snap && snap.architectCover ? snap.architectCover : null;
  const archBuildings = snap && Array.isArray(snap.buildings) ? snap.buildings : [];
  const hasArch = archBuildings.length > 0 && !!archCover;
  return (
    <div className="fixed inset-0 overlay-root z-50 flex items-center justify-center p-4"
      style={{ background: "#0c0c10", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl px-6 pb-6 max-h-[90dvh] overflow-y-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → bleibt beim Scrollen oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-6 pb-4 flex items-start justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
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
              {/* Architekt-Gebäude auf dem Brett ein-/ausblenden (Toggle + Kategorie-Legende) — wie im Victory-Screen. */}
              {hasArch && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">
                  <button onClick={() => setShowArch((v) => !v)} className="px-2 py-1 rounded-lg font-bold"
                    style={showArch ? { background: `${ARCH_CAT.value.color}22`, border: `1px solid ${ARCH_CAT.value.color}`, color: "#cfe3f5" }
                                    : { background: "#20202a", border: "1px solid #3a3a46", color: "#8a8a92" }}>
                    🏗 Gebäude {showArch ? "an" : "aus"}
                  </button>
                  {showArch && Object.entries(ARCH_CAT).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1 opacity-80" style={{ color: "#aab4c4" }}>
                      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color }} />{v.label}
                    </span>
                  ))}
                </div>
              )}
              <CardGrid cards={entry.deckSnapshot.cards} formations={entry.deckSnapshot.formations || []}
                architectCover={hasArch && showArch ? archCover : null}
                glowBid={hasArch && showArch ? inspectBid : null} quietTiles />

              {/* Gebäude-Liste: welche Gebäude auf welcher Stufe. Antippen lässt den Rahmen am Brett cyan leuchten. */}
              {hasArch && (
                <div className="mt-3 rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
                  <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 Gebäude ({archBuildings.length})</div>
                  <div className="text-[10px] opacity-45 mb-1.5">Antippen zeigt am Brett, wo es liegt.</div>
                  <div className="grid gap-1">
                    {archBuildings.map((b) => {
                      const fam = archFamily(b.familyId); if (!fam) return null;
                      const anchor = Math.min(...b.footprint);
                      const eff = archCover?.[anchor]?.effects?.join(" · ") || "";
                      const meta = ARCH_CAT?.[fam.category] || {};
                      const on = inspectBid === b.id;
                      return (
                        <button key={b.id} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug flex flex-col gap-0.5 transition-all"
                          style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                            <b>{fam.name}</b>
                            <span className="opacity-55">{fam.legendary ? "Legendär" : `Stufe ${["", "I", "II", "III", "IV"][b.tier] || b.tier}`}</span>
                          </span>
                          {eff && <span className="opacity-75">{eff}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
