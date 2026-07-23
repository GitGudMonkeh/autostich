import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { CardLogo } from "./CardLogo.jsx";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";

/* Startbildschirm (#4): Einstieg mit „Neuer Run", Anleitung (#12) und lokaler Bestenliste. */
export function StartScreen({ onStart, highscores, best, onOptions, username = "", onEditName, myEntry = null, pubToken = 0 }) {
  const [showGuide, setShowGuide] = useState(false);

  // Beim allerersten Start die Anleitung einmal automatisch zeigen (#12).
  useEffect(() => {
    try { if (!localStorage.getItem("as_seen_guide")) setShowGuide(true); } catch (e) {}
  }, []);
  const closeGuide = () => {
    setShowGuide(false);
    try { localStorage.setItem("as_seen_guide", "1"); } catch (e) {}
  };

  return (
    <div className="grid gap-5 justify-items-center content-start py-10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-pixel crt-title as-wordmark-hero">
          AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
        </h1>
        <p className="text-sm opacity-45 mt-1">Roguelite-Autobattler-Stechspiel · Prototyp</p>
      </div>

      {/* Dekoratives Karten-Logo (#45) — rein optisch, unter dem CRT-Skin mit stärkerem Neon-Glow. */}
      <CardLogo />

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
        {onOptions && (
          <button
            onClick={onOptions}
            aria-label="Optionen"
            className="px-6 py-3 rounded-xl text-lg font-semibold transition-all"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            ⚙ Optionen
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
            Rekord {best.toLocaleString("de-DE")}
          </span>
        </div>
        {highscores.length === 0 ? (
          <div className="text-sm opacity-40 text-center py-3">Noch keine Läufe — leg los.</div>
        ) : (
          <div className="grid gap-1">
            {highscores.map((h, i) => (
              <div key={i} className="flex justify-between text-sm px-2 py-1 rounded" style={{ background: "#20202a" }}>
                <span className="opacity-50">#{i + 1}</span>
                <span className="font-bold" style={{ color: "#d4a63a" }}>{h.score.toLocaleString("de-DE")}</span>
                <span className="opacity-50 text-xs">{h.cycles ?? 0} Runden · {h.tricks} Stiche</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Globaler Highscore (#14) — additiv unter dem lokalen Block; blendet sich ohne
          Config/offline lautlos aus. Der lokale Block oben bleibt immer sichtbar. */}
      <GlobalLeaderboard framed mine={myEntry} reloadToken={pubToken} />

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
