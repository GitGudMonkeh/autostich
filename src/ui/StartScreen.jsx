import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { RunDetail } from "./RunDetail.jsx";
import logoGroup from "../assets/mascots/logo-group.png";
import { MuteButton } from "./MuteButton.jsx";
import { loadSeenGuide, saveSeenGuide } from "../game/storage.js";
import { fmtScore } from "./format.js";

/* Startbildschirm (#4): Einstieg mit „Neuer Run", Anleitung (#12) und lokaler Bestenliste. */
export function StartScreen({ onStart, highscores, best, onOptions, onStats, onCustomize, muted, onToggleMute, username = "", onEditName, myEntry = null, pubToken = 0 }) {
  const [showGuide, setShowGuide] = useState(false);
  const [detail, setDetail] = useState(null); // #169 FB-8: gewählter lokaler Lauf → RunDetail-Overlay

  // Beim allerersten Start die Anleitung einmal automatisch zeigen (#12).
  useEffect(() => {
    if (!loadSeenGuide()) setShowGuide(true);
  }, []);
  const closeGuide = () => {
    setShowGuide(false);
    saveSeenGuide();
  };

  return (
    <div className="relative grid gap-5 justify-items-center content-start py-10">
      {/* #133: Schnell-Mute jederzeit sichtbar oben rechts — togglet dasselbe options.muted wie die Optionen. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-0 right-0" />}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-pixel crt-title as-wordmark-hero">
          AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
        </h1>
        <p className="text-sm opacity-45 mt-1">Roguelite-Autobattler-Stechspiel · Prototyp</p>
      </div>

      {/* #134: Maskottchen-Gruppenbild als dekoratives Start-Logo (ersetzt das alte CardLogo). Rein optisch,
          Seitenverhältnis erhalten (Portrait), feste Höhe passend zum bisherigen Logo-Bereich. */}
      <img src={logoGroup} alt="" aria-hidden
        className="pointer-events-none select-none w-auto"
        style={{ maxHeight: 140, filter: "drop-shadow(0 5px 16px rgba(138,125,224,0.35))" }} />

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onStart}
          className="px-8 py-3 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#5ab87a", color: "#141419" }}
        >
          ▶ Neuer Run
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-6 py-3 rounded-xl text-lg font-semibold transition-all"
          style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
        >
          Anleitung
        </button>
        {onStats && (
          <button
            onClick={onStats}
            className="px-6 py-3 rounded-xl text-lg font-semibold transition-all"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            Statistiken
          </button>
        )}
        {onCustomize && (
          <button
            onClick={onCustomize}
            className="px-6 py-3 rounded-xl text-lg font-semibold transition-all"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            Deck
          </button>
        )}
        {onOptions && (
          <button
            onClick={onOptions}
            aria-label="Optionen"
            className="px-6 py-3 rounded-xl text-lg font-semibold transition-all"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            Optionen
          </button>
        )}
      </div>

      {/* Lokaler Nickname (#14) — jederzeit editierbar; hängt an globalen Einträgen. */}
      {onEditName && (
        <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity">
          {username
            ? <>Angemeldet als <b style={{ color: "#5ab87a" }}>{username}</b> · Name ändern</>
            : <>Namen festlegen für den globalen Highscore</>}
        </button>
      )}

      <div className="w-full max-w-sm rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide opacity-50">Deine Läufe</span>
          <span className="text-sm font-bold" style={{ color: "#d4a63a" }}>
            Rekord {fmtScore(best)}
          </span>
        </div>
        {highscores.length === 0 ? (
          <div className="text-sm opacity-40 text-center py-3">Noch keine Läufe — leg los.</div>
        ) : (
          <div className="grid gap-1">
            {highscores.map((h, i) => (
              // #169 FB-8: Zeile klickbar → Detailansicht mit dem vollen Run-Rückblick (RunStats).
              <button key={i} onClick={() => setDetail({ entry: h, rank: i + 1 })} title="Details anzeigen"
                className="flex justify-between items-center text-sm px-2 py-1 rounded text-left transition-all hover:brightness-125"
                style={{ background: "#20202a" }}>
                <span className="opacity-50">#{i + 1}</span>
                <span className="font-bold" style={{ color: "#d4a63a" }}>{fmtScore(h.score)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Globaler Highscore (#14) — additiv unter dem lokalen Block; blendet sich ohne
          Config/offline lautlos aus. Der lokale Block oben bleibt immer sichtbar. */}
      <GlobalLeaderboard framed mine={myEntry} reloadToken={pubToken} />

      {showGuide && <AnleitungModal onClose={closeGuide} />}
      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} />}
    </div>
  );
}
