import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { MuteButton } from "./MuteButton.jsx";
import { loadSeenGuide, saveSeenGuide } from "../game/storage.js";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { fmtScore } from "./format.js";

/* Startbildschirm (#4): Seed-Paste-Leiste oben (#205), darunter #227 Variante B — linke gleichbreite Button-Spalte
   (ohne Icons, gestapelt: Normaler Run · Meister Run · Bestenliste · Statistiken · Deck · Optionen · Anleitung) +
   rechts ein ruhiger Rekord-Block. Die volle Score-Liste (deine Läufe + global) liegt hinter „Bestenliste" (#217). */
export function StartScreen({ onStart, onPlaySeed = null, onMasterRun = null, highscores, best, onOptions, onStats, onCustomize, onLeaderboard = null, muted, onToggleMute, username = "", onEditName }) {
  const [showGuide, setShowGuide] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const tryPlaySeed = () => {
    const s = parseSeed(seedInput);
    if (s == null) { setSeedError(true); return; }
    setSeedError(false);
    onPlaySeed(s);
  };

  // Beim allerersten Start die Anleitung einmal automatisch zeigen (#12).
  useEffect(() => {
    if (!loadSeenGuide()) setShowGuide(true);
  }, []);
  const closeGuide = () => {
    setShowGuide(false);
    saveSeenGuide();
  };

  // #227 Variante B: gleichbreite, gestapelte Buttons ohne Icons — sekundärer Stil (dunkel), einheitliche Höhe/Breite.
  const secCls = "w-full px-5 py-2 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5";
  const secSty = { background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" };

  return (
    <div className="relative grid gap-3 justify-items-center content-start py-5">
      {/* #133: Schnell-Mute jederzeit sichtbar oben rechts — togglet dasselbe options.muted wie die Optionen. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-0 right-0" />}
      <div className="text-center">
        <div className="relative inline-block">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-pixel crt-title as-wordmark-hero">
            AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
          </h1>
          {/* Versions-Banner unten rechts am Logo — gleicher Gold-Stil wie der TESTBRANCH-Marker (App.jsx). */}
          <span
            className="absolute -bottom-2 -right-5 px-1.5 py-0.5 rounded text-[10px] font-bold font-pixel tracking-wide"
            style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 8px rgba(212,166,58,.6)", pointerEvents: "none" }}
            aria-hidden="true"
          >
            v0.3
          </span>
        </div>
        <p className="text-xs opacity-45 mt-0.5">Roguelite-Autobattler-Stechspiel · Prototyp</p>
      </div>

      {/* #205: Seed einfügen & spielen — Challenge annehmen, ohne den Statistik-Hub zu öffnen. */}
      {onPlaySeed && (
        <div className="w-full max-w-xs sm:max-w-sm">
          <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
            <input
              value={seedInput}
              onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
              placeholder="Seed einfügen & spielen …"
              aria-label="Seed einfügen und spielen"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono tracking-wide"
              style={{ background: "#141419", border: `1px solid ${seedError ? "#e06a6a" : "#30303a"}`, color: "#e8e8ea" }}
            />
            <button type="submit" disabled={!seedInput.trim()}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "#8a7de0", color: "#141419" }}>
              ↻ Spielen
            </button>
          </form>
          {seedError && <div className="text-xs mt-1" style={{ color: "#e06a6a" }}>Kein gültiger Seed — prüf den Code und versuch es erneut.</div>}
        </div>
      )}

      {/* #227 Variante B: linke gleichbreite Button-Spalte (ohne Icons, gestapelt) + rechts ruhiger Rekord-Block.
          Die volle Score-Liste (deine Läufe + global) lebt hinter dem „Bestenliste"-Button (LeaderboardScreen, #217). */}
      <div className="w-full max-w-xs sm:max-w-2xl grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_240px] items-start">
        {/* Links: gleichbreite, gestapelte Buttons */}
        <div className="grid gap-1.5">
          <button onClick={onStart}
            className="w-full px-5 py-2 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "#5ab87a", color: "#141419" }}>
            Normaler Run
          </button>
          {onMasterRun && (
            <button onClick={onMasterRun}
              className="relative w-full px-5 py-2 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
              style={{ background: "#8a7de0", color: "#141419" }}>
              Meister Run
              <span className="absolute top-1.5 right-2 px-1 rounded text-[9px] font-bold font-pixel leading-tight"
                style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 6px rgba(212,166,58,.6)" }} aria-label="experimentell">exp</span>
            </button>
          )}
          {onLeaderboard && (
            <button onClick={onLeaderboard} className={secCls} style={secSty}>Bestenliste <span className="opacity-45">›</span></button>
          )}
          {onStats && <button onClick={onStats} className={secCls} style={secSty}>Statistiken</button>}
          {onCustomize && <button onClick={onCustomize} className={secCls} style={secSty}>Deck</button>}
          {onOptions && <button onClick={onOptions} aria-label="Optionen" className={secCls} style={secSty}>Optionen</button>}
          <button onClick={() => setShowGuide(true)} className={secCls} style={secSty}>Anleitung</button>

          {/* Lokaler Nickname (#14) — unter dem Button-Stack. */}
          {onEditName && (
            <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity mt-1 text-left px-1">
              {username
                ? <>Angemeldet als <b style={{ color: "#5ab87a" }}>{username}</b> · Name ändern</>
                : <>Namen festlegen für den globalen Highscore</>}
            </button>
          )}
        </div>

        {/* Rechts: ruhiger Rekord-Block. Die volle Liste liegt hinter „Bestenliste"; der „Neueste Challenges"-Ticker
            folgt mit dem globalen Board (Schicht B, /test). */}
        <div className="w-full rounded-xl p-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
          <div className="text-[11px] uppercase tracking-wide opacity-50">Rekord</div>
          <div className="text-xl font-bold mt-0.5" style={{ color: "#d4a63a" }}>{fmtScore(best)}</div>
          {highscores.length > 0 ? (
            <button onClick={onLeaderboard || undefined} disabled={!onLeaderboard}
              className="text-[12px] opacity-55 hover:opacity-90 transition-opacity mt-2 text-left disabled:hover:opacity-55">
              {highscores.length} {highscores.length === 1 ? "Lauf" : "Läufe"}{onLeaderboard ? " · alle ansehen ›" : ""}
            </button>
          ) : (
            <div className="text-[12px] opacity-40 mt-2">Noch keine Läufe — leg los.</div>
          )}
        </div>
      </div>

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
