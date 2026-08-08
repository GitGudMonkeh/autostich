import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { MuteButton } from "./MuteButton.jsx";
import { loadSeenGuide, saveSeenGuide } from "../game/storage.js";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { fmtScore } from "./format.js";
import logo from "../assets/logo-wordmark.png";
import { GlossaryPanel } from "./Glossary.jsx";
import { VERSION_FULL, APP_VERSION } from "./version.js"; // #250: Versions-/Build-Stempel unten

/* Startbildschirm — Hub-Redesign (Progression-System, Design-Doc docs/progression-decisions.md).
   Der Start-Screen wird zum Hub: Neon-Wortmarke → Bonus-Stichpunkte-Leiste → Startmodi (Normaler
   Lauf · Ranglisten-Lauf mit Standard/Meister-Gabel) → Progression-Hub-Card (SP-Guthaben, Baum-
   Vorschau, Öffnen) → demotierte Seed-Zeile → Sekundär-Chips → Rekord-Fuß.

   HINWEIS: Progression-Backend (SP, Upgrade-Baum, Ranglisten-Modi) ist noch NICHT gebaut. Die
   Bonus-Leiste, die Progression-Card und die Ranglisten-Gabel laufen hier mit festen
   Platzhalter-Werten (mit „Vorschau"-Markierung), damit Layout/Feel im echten Build sichtbar sind.
   Verdrahtet wird nach dem Mockup-Schritt. */

// SP-Währungsfarbe (Stichpunkte) — eigene Cyan-Identität, getrennt von Gold (Score) und Lila (Marke).
const SP = "#48cfe0";
const BRAND = "#8a7de0";

// Platzhalter-Progressionsstand (Vorschau, bis Backend steht).
const STUB = {
  sp: 14,
  buyable: 3,
  bonusRuns: 7, bonusGoal: 10, // Bonus-Stichpunkte-Drip: je 10 Läufe +5 SP
  treeOwned: 4, treeTotal: 13,
  branches: [
    { icon: "🏗", name: "Baufeld", own: 1, buy: 1, total: 3, col: "#d4a63a" },
    { icon: "🎬", name: "Auftakt", own: 1, buy: 1, total: 2, col: "#5ab87a" },
    { icon: "✨", name: "Rarität", own: 1, buy: 0, total: 3, col: "#5a8ade" },
    { icon: "👑", name: "Meister", own: 1, buy: 1, total: 5, col: "#a855f7" },
  ],
};

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onMasterRun = null, onDevRun = null, highscores, best, onOptions, onStats, onCustomize, onLeaderboard = null, muted, onToggleMute, username = "", onEditName }) {
  const [showGuide, setShowGuide] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [rankedOpen, setRankedOpen] = useState(false);
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
    <div className="relative flex flex-col items-center gap-5 pt-8 pb-10">
      {/* #133: Schnell-Mute jederzeit sichtbar oben rechts — togglet dasselbe options.muted wie die Optionen. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-0 right-0" />}
      {/* Glossar jederzeit erreichbar — oben links (die obere rechte Ecke belegt der Mute-Knopf). */}
      <GlossaryPanel className="absolute top-0 left-0" />

      {/* Neon-Wortmarke (ersetzt Text-Logo + altes Element-PNG). Schwarzer Bild-Hintergrund verschwindet
          per mix-blend-mode:screen ins dunkle Menü; die Neon-Kanten glühen additiv auf den Grund. */}
      <div className="relative inline-block mt-1">
        <img src={logo} alt="AUTOSTICH" draggable="false"
          className="w-full max-w-[340px] h-auto select-none"
          style={{ mixBlendMode: "screen" }} />
        {/* Versions-Banner unten rechts an der Marke — gleicher Gold-Stil wie der TESTBRANCH-Marker (App.jsx). */}
        <span
          className="absolute -bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-pixel tracking-wide"
          style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 8px rgba(212,166,58,.6)", pointerEvents: "none" }}
          aria-hidden="true"
        >
          v{APP_VERSION}
        </span>
      </div>
      <p className="text-xs opacity-45 -mt-2">Roguelite-Autobattler-Stechspiel · Prototyp</p>

      {/* Bonus-Stichpunkte-Leiste (Vorschau) — je 10 abgeschlossene Läufe → +5 SP. */}
      <div className="w-full max-w-sm rounded-xl px-4 py-3 flex flex-col gap-2"
        style={{ background: "#17171c", border: "1px solid #26262e" }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] font-semibold opacity-85" style={{ color: SP }}>💠 Bonus Stichpunkte · nächste +5 SP</span>
          <span className="text-[11.5px] opacity-55 font-mono tabular-nums">{STUB.bonusRuns} / {STUB.bonusGoal} Läufe</span>
        </div>
        <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "#0e0e13", border: "1px solid #26262e" }}>
          <div className="h-full rounded-full" style={{ width: `${STUB.bonusRuns / STUB.bonusGoal * 100}%`, background: `linear-gradient(90deg,#3aa7b8,${SP})` }} />
        </div>
      </div>

      {/* Startmodi (Blickfang) */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {/* Resume (#Auto-Save): gespeicherter laufender Run → prominent oben. Erscheint nur, wenn ein Snapshot vorliegt. */}
        {onResume && resume && (
          <button onClick={onResume}
            className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight"
            style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 10px rgba(212,166,58,.45)" }}>
            <span>▶ Lauf fortsetzen</span>
            <span className="text-[11px] font-mono font-semibold opacity-80">
              Durchlauf {Math.min((resume.cycle || 0) + 1, resume.totalCycles)}/{resume.totalCycles} · Score {Math.round(resume.score || 0).toLocaleString("de-DE")}{resume.masterRun ? ` · Meister ${resume.grade || 0}` : ""}
            </span>
          </button>
        )}
        <button onClick={onStart}
          className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#5ab87a", color: "#141419" }}>
          Normaler Lauf
        </button>

        {/* Ranglisten-Lauf — gabelt in Standard / Meister (Vorschau: Standard nutzt den bestehenden
            Meister-Run-Einstieg als Platzhalter, Meister ist bis zum Vollausbau gesperrt). */}
        {onMasterRun && (
          <>
            <button onClick={() => setRankedOpen((o) => !o)}
              className="relative w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              style={{ background: BRAND, color: "#141419" }}>
              🏆 Ranglisten-Lauf
              <span className="text-[13px] transition-transform" style={{ transform: rankedOpen ? "rotate(90deg)" : "none" }}>›</span>
              <span className="absolute top-1.5 right-2 px-1 rounded text-[9px] font-bold font-pixel leading-tight"
                style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 6px rgba(212,166,58,.6)" }} aria-label="Vorschau">exp</span>
            </button>
            {rankedOpen && (
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={onMasterRun}
                  className="rounded-lg p-3 text-left flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                  style={{ background: "#1c1c23", border: "1px solid #30303a" }}>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Seed der Woche</span>
                  <span className="text-[14px] font-extrabold" style={{ color: "#cdc6f4" }}>Standard</span>
                  <span className="text-[11px] leading-snug opacity-60">Baum ignoriert — Basiswerte für alle.</span>
                </button>
                <div
                  className="relative rounded-lg p-3 text-left flex flex-col gap-1 opacity-70 cursor-default"
                  style={{ background: "#1c1c23", border: "1px solid #30303a" }} title="Frei bei komplettem Baum">
                  <span className="absolute top-2.5 right-2.5 text-[12px] opacity-70">🔒</span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Seed der Woche</span>
                  <span className="text-[14px] font-extrabold" style={{ color: "#d4a63a" }}>Meister</span>
                  <span className="text-[11px] leading-snug opacity-60">Voll-Baum als Norm. Frei bei komplettem Baum.</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dev Run (Test-Layout, nur Preview-Build) — frei konfigurierbarer Testlauf. Gold-Stil wie der Preview-Marker. */}
        {onDevRun && (
          <button onClick={onDevRun}
            className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "#d4a63a", color: "#141419" }}>
            ⚙ Dev Run
          </button>
        )}
      </div>

      {/* Progression-Hub-Card (Vorschau) — SP-Guthaben, Baum-Fortschritt, Öffnen. Kern des künftigen Hubs. */}
      <div className="w-full max-w-sm rounded-2xl p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#1b1a24,#161620)", border: "1px solid #2c2a3a" }}>
        <div className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">🌳</span>
            <b className="text-[14.5px] tracking-tight">Upgrades</b>
            <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: "#26262e", color: "#a6a6b0" }}>Vorschau</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-full"
              style={{ background: SP, color: "#141419" }}>{STUB.buyable} kaufbar</span>
            <span className="flex items-baseline gap-1">
              <span className="text-[19px] font-extrabold tabular-nums" style={{ color: SP, textShadow: "0 0 12px rgba(72,207,224,.4)" }}>{STUB.sp}</span>
              <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: SP }}>SP</span>
            </span>
          </div>
        </div>

        {/* Mini-Baum-Vorschau: 4 Äste mit gekauft / kaufbar / gesperrt-Punkten. */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {STUB.branches.map((b) => (
            <div key={b.name} className="rounded-lg px-1.5 py-2 flex flex-col items-center gap-1.5"
              style={{ background: "#12121a", border: "1px solid #26262e" }}>
              <span className="text-[15px]">{b.icon}</span>
              <span className="flex gap-1">
                {Array.from({ length: b.total }).map((_, i) => {
                  const owned = i < b.own;
                  const buy = i >= b.own && i < b.own + b.buy;
                  return (
                    <i key={i} className="w-2 h-2 rounded-full"
                      style={owned
                        ? { background: b.col, border: `1px solid ${b.col}`, boxShadow: `0 0 6px ${b.col}` }
                        : buy
                          ? { background: "transparent", border: `1px solid ${SP}`, boxShadow: `0 0 5px rgba(72,207,224,.6)` }
                          : { background: "#2a2a33", border: "1px solid #3a3a45" }} />
                  );
                })}
              </span>
              <span className="text-[9px] font-bold tracking-tight opacity-50">{b.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-[11.5px] opacity-60 tabular-nums">Baum <b className="opacity-95">{STUB.treeOwned} / {STUB.treeTotal}</b> · Meister-Liga bei {STUB.treeTotal}/{STUB.treeTotal}</span>
          <button
            className="border-none font-extrabold text-[12.5px] px-3 py-2 rounded-lg cursor-pointer transition-transform hover:-translate-y-0.5 flex items-center gap-1.5"
            style={{ background: BRAND, color: "#141419" }} title="Upgrade-Screen — folgt mit dem Progression-Backend">
            Öffnen <span>›</span>
          </button>
        </div>
      </div>

      {/* #205: Seed einfügen & spielen — bewusst unter die Startmodi demotiert (ruhiger, sekundärer Stil). */}
      {onPlaySeed && (
        <div className="w-full max-w-sm">
          <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
            <input
              value={seedInput}
              onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
              placeholder="Seed einfügen & frei spielen …"
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

      {/* Sekundär-Navigation — ruhige Chip-Reihe statt fünf gleich breiter Balken. */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs sm:max-w-md">
        {onLeaderboard && <button onClick={onLeaderboard} className={chipCls} style={chipSty}>Bestenliste</button>}
        {onStats && <button onClick={onStats} className={chipCls} style={chipSty}>Statistiken</button>}
        {onCustomize && <button onClick={onCustomize} className={chipCls} style={chipSty}>Deck</button>}
        {onOptions && <button onClick={onOptions} aria-label="Optionen" className={chipCls} style={chipSty}>Optionen</button>}
        <button onClick={() => setShowGuide(true)} className={chipCls} style={chipSty}>Anleitung</button>
      </div>

      {/* Rekord-Fuß — schlank & zentriert; die volle Liste (deine Läufe + global) liegt hinter „Bestenliste". */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2">
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

      {/* #250 Versions-/Build-Stempel unten — nach jedem Push sichtbar, ob er gelandet ist (+ Umgebung + kurze SHA). */}
      <div className="text-[10px] font-mono opacity-40 tracking-wide select-text" title="Version · Umgebung · Commit">{VERSION_FULL}</div>

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
