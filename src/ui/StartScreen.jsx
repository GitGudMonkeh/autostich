import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { MuteButton } from "./MuteButton.jsx";
import { loadSeenGuide, saveSeenGuide } from "../game/storage.js";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { fmtScore } from "./format.js";
import logo from "../assets/logo.png";
import { GlossaryPanel } from "./Glossary.jsx";

/* Startbildschirm (#4): Redesign „Richtung A — zentriert & entschlackt" (aus dem Startmenü-Redesign).
   Der Inhalt wird vertikal zentriert (füllt die frühere untere Leere) und bekommt eine klare Rangfolge:
   Wortmarke → zwei prominente Startmodi → demotierte Seed-Zeile → Sekundär-Navigation als ruhige
   Chip-Reihe (statt fünf gleich breiter Balken) → schlanker Rekord-Fuß. Die volle Score-Liste
   (deine Läufe + global) liegt weiterhin hinter „Bestenliste" (LeaderboardScreen, #217). */
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

  // Sekundär-Navigation als ruhige Chip-Reihe — kompakter Pillen-Stil (dunkel, sekundär), einheitlich.
  const chipCls = "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all hover:-translate-y-0.5";
  const chipSty = { background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" };

  return (
    <div className="relative flex flex-col items-center gap-6 pt-8 pb-10">
      {/* #133: Schnell-Mute jederzeit sichtbar oben rechts — togglet dasselbe options.muted wie die Optionen. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-0 right-0" />}
      {/* Glossar jederzeit erreichbar — oben links (die obere rechte Ecke belegt der Mute-Knopf). */}
      <GlossaryPanel className="absolute top-0 left-0" />

      {/* Wortmarke */}
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
        <p className="text-xs opacity-45 mt-1">Roguelite-Autobattler-Stechspiel · Prototyp</p>
      </div>

      {/* Element-Logo unter der Wortmarke — die vier Fraktionen (Feuer/Blitz/Pflanze/Eis) um den Stern.
          Das PNG hat einen dunkelgrauen Hintergrund (nicht transparent) → mix-blend-mode:screen lässt ihn ins dunkle
          Menü verschwinden (Dunkles wird transparent, die Elemente glühen); die radiale Maske glättet die Kanten. */}
      <img src={logo} alt="Autostich" draggable="false"
        className="w-32 h-32 object-contain"
        style={{ mixBlendMode: "screen",
                 WebkitMaskImage: "radial-gradient(circle, #000 66%, transparent 95%)",
                 maskImage: "radial-gradient(circle, #000 66%, transparent 95%)" }} />

      {/* Startmodi (Blickfang) + demotierte Seed-Zeile darunter. */}
      <div className="w-full max-w-xs flex flex-col gap-2.5">
        <button onClick={onStart}
          className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#5ab87a", color: "#141419" }}>
          Normaler Run
        </button>
        {onMasterRun && (
          <button onClick={onMasterRun}
            className="relative w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "#8a7de0", color: "#141419" }}>
            Meister Run
            <span className="absolute top-1.5 right-2 px-1 rounded text-[9px] font-bold font-pixel leading-tight"
              style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 6px rgba(212,166,58,.6)" }} aria-label="experimentell">exp</span>
          </button>
        )}

        {/* #205: Seed einfügen & spielen — bewusst unter die Startmodi demotiert (ruhiger, sekundärer Stil,
            damit das Nischen-Feature nicht mehr gleichberechtigt in der ersten Zeile steht). */}
        {onPlaySeed && (
          <div className="mt-0.5">
            <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
              <input
                value={seedInput}
                onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
                placeholder="Seed einfügen & spielen …"
                aria-label="Seed einfügen und spielen"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono tracking-wide"
                style={{ background: "#141419", border: `1px solid ${seedError ? "#e06a6a" : "#2a2a33"}`, color: "#cfcfd6" }}
              />
              <button type="submit" disabled={!seedInput.trim()}
                className="shrink-0 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
                ↻ Spielen
              </button>
            </form>
            {seedError && <div className="text-xs mt-1" style={{ color: "#e06a6a" }}>Kein gültiger Seed — prüf den Code und versuch es erneut.</div>}
          </div>
        )}
      </div>

      {/* Sekundär-Navigation — ruhige Chip-Reihe statt fünf gleich breiter Balken. */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs sm:max-w-md">
        {onLeaderboard && <button onClick={onLeaderboard} className={chipCls} style={chipSty}>Bestenliste</button>}
        {onStats && <button onClick={onStats} className={chipCls} style={chipSty}>Statistiken</button>}
        {onCustomize && <button onClick={onCustomize} className={chipCls} style={chipSty}>Deck</button>}
        {onOptions && <button onClick={onOptions} aria-label="Optionen" className={chipCls} style={chipSty}>Optionen</button>}
        <button onClick={() => setShowGuide(true)} className={chipCls} style={chipSty}>Anleitung</button>
      </div>

      {/* Rekord-Fuß — schlank & zentriert; die volle Liste (deine Läufe + global) liegt hinter „Bestenliste". */}
      <div className="w-full max-w-xs flex flex-col items-center gap-2">
        <button onClick={onLeaderboard || undefined} disabled={!onLeaderboard}
          className="w-full rounded-xl px-4 py-2.5 as-panel flex items-center justify-between gap-3 text-left transition-all enabled:hover:-translate-y-0.5 disabled:cursor-default"
          style={{ background: "#17171c", border: "1px solid #26262e" }}>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] uppercase tracking-wide opacity-50 shrink-0">Rekord</span>
            <span className="text-lg font-bold truncate" style={{ color: "#d4a63a" }}>{fmtScore(best)}</span>
          </span>
          {highscores.length > 0 ? (
            <span className="text-[12px] opacity-55 shrink-0">
              {highscores.length} {highscores.length === 1 ? "Lauf" : "Läufe"}{onLeaderboard ? " ›" : ""}
            </span>
          ) : (
            <span className="text-[12px] opacity-40 shrink-0">Noch keine Läufe</span>
          )}
        </button>

        {/* Lokaler Nickname (#14). */}
        {onEditName && (
          <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1">
            {username
              ? <>Angemeldet als <b style={{ color: "#5ab87a" }}>{username}</b> · Name ändern</>
              : <>Namen festlegen für den globalen Highscore</>}
          </button>
        )}
      </div>

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
