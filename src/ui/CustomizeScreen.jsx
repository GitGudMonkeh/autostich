import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked, unlockProgress, resolveSkinId } from "../game/cosmetics.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { fmtScore } from "./format.js";

/* #190 — Kollektion: Deck- & Battlefield-Skins wählen (rein kosmetisch). ALLE Skins sind immer sichtbar;
   gesperrte werden ausgegraut mit Klartext-Bedingung + Fortschritt gezeigt (nichts wird versteckt). Nur
   freigeschaltete sind wählbar; Auswahl schreibt sofort in die Optionen (kein Bestätigen). */

// Fortschritts-Zusatz je Bedingungsart (kind aus def.unlock). Countable → Balken; Flags → nur der Bedingungstext.
function progressDetail(kind, p) {
  switch (kind) {
    case "games":  return { bar: true,  text: `${p.cur} / ${p.target} Läufe` };
    case "streak": return { bar: true,  text: `beste Serie bisher: ${p.cur}` };
    case "score":  return { bar: true,  text: `bester Score bisher: ${fmtScore(p.cur)}` };
    default:       return { bar: false, text: "" }; // noBuyRun / monoStatRun (Flag-Challenges)
  }
}

function SkinTile({ name, image, unlocked, active, prog, kind, aspect, fit, onSelect }) {
  const detail = unlocked ? null : progressDetail(kind, prog);
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={unlocked ? onSelect : undefined}
      aria-pressed={active}
      className="relative rounded-lg overflow-hidden text-left transition-all"
      style={{
        border: active ? "2px solid #5ab87a" : "1px solid #33333e",
        background: "#0f0f14",
        cursor: unlocked ? "pointer" : "default",
        boxShadow: active ? "0 0 0 2px #5ab87a55" : undefined,
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: aspect, background: "#0c0c10" }}>
        {image ? (
          <img src={image} alt="" loading="lazy"
            className={`w-full h-full ${fit}`}
            style={{ filter: unlocked ? undefined : "grayscale(1) brightness(0.45)" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs opacity-40">Standard</div>
        )}

        {active && (
          <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "#5ab87a", color: "#141419" }}>Aktiv</span>
        )}

        {!unlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center"
            style={{ background: "rgba(10,10,14,0.62)" }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <span className="text-[11px] leading-snug opacity-90">{prog.label}</span>
            {detail && detail.text && <span className="text-[10px] opacity-65">{detail.text}</span>}
            {detail && detail.bar && (
              <div className="h-1 w-4/5 rounded-full overflow-hidden mt-0.5" style={{ background: "#20202a" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((prog.cur / prog.target) * 100)}%`, background: "#8a7de0" }} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <span className="text-xs font-semibold truncate block">{name}</span>
      </div>
    </button>
  );
}

export function CustomizeScreen({ options, profile, onChoose, onClose }) {
  useEscape(onClose);
  const p = profile || {};
  const deckId = options?.deckId || "default";
  const bfId = options?.battlefieldId || "default";
  // #195: „Aktiv"-Markierung gegen die AUFGELÖSTE Skin-id (resolveSkinId fällt auf "default" zurück, wenn der
  // gespeicherte Skin nicht existiert/gesperrt ist) — sonst würde ein gesperrter gespeicherter Skin zugleich als
  // „🔒 gesperrt" UND „Aktiv" erscheinen, während real Default rendert.
  const activeDeckId = resolveSkinId(DECK_DEFS, deckId, p);
  const activeBfId = resolveSkinId(BATTLEFIELD_DEFS, bfId, p);

  const decks = Object.values(DECK_DEFS);
  const battlefields = Object.values(BATTLEFIELD_DEFS);

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Deck &amp; Battlefield</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>
        <p className="text-[11px] opacity-45 mt-1">Rein kosmetisch — kein Einfluss aufs Spiel. Gesperrte schaltest du über Läufe &amp; Challenges frei.</p>

        {/* Decks */}
        <div className="mt-5">
          <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8a7de0" }}>Decks</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {decks.map((def) => {
              const unlocked = isUnlocked(def, p);
              return (
                <SkinTile key={def.id} name={def.name} image={deckAssets(def.id).back}
                  unlocked={unlocked} active={activeDeckId === def.id} prog={unlockProgress(def, p)}
                  kind={def.unlock?.kind} aspect="3 / 4" fit="object-contain"
                  onSelect={() => onChoose({ deckId: def.id })} />
              );
            })}
          </div>
        </div>

        {/* Battlefields */}
        <div className="mt-5">
          <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8a7de0" }}>Battlefields</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {battlefields.map((def) => {
              const unlocked = isUnlocked(def, p);
              const assets = battlefieldAssets(def.id);
              return (
                <SkinTile key={def.id} name={def.name} image={assets ? assets.desktop : null}
                  unlocked={unlocked} active={activeBfId === def.id} prog={unlockProgress(def, p)}
                  kind={def.unlock?.kind} aspect="16 / 9" fit="object-cover"
                  onSelect={() => onChoose({ battlefieldId: def.id })} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
