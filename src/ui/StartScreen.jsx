import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";

/* Startbildschirm (#4): Einstieg mit „Neuer Run", Anleitung (#12) und lokaler Bestenliste. */
export function StartScreen({ onStart, highscores, best }) {
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
    <div className="grid gap-5 justify-items-center py-10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
        </h1>
        <p className="text-sm opacity-45 mt-1">Roguelite-Autobattler-Stechspiel · Prototyp</p>
      </div>

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
      </div>

      <div className="w-full max-w-sm rounded-xl p-4" style={{ background: "#17171c", border: "1px solid #26262e" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide opacity-50">Highscore</span>
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
                <span className="opacity-50 text-xs">Lvl {h.level} · {h.tricks} Stiche</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
