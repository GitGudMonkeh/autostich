import { useState, useEffect } from "react";
import { AnleitungModal } from "./AnleitungModal.jsx";
import { MuteButton } from "./MuteButton.jsx";
import { loadSeenGuide, saveSeenGuide } from "../game/storage.js";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import logo from "../assets/logo-wordmark.png";
import { GlossaryPanel } from "./Glossary.jsx";
import { VERSION_FULL, APP_VERSION } from "./version.js"; // #250: Versions-/Build-Stempel unten

/* Startbildschirm — Hub-Redesign (Progression-System, Design-Doc docs/progression-decisions.md).
   Farbsystem aus dem Neon-Logo abgeleitet (Verlauf Cyan → Violett → Amber): Cyan = Start/SP/Energie,
   Violett = Marke/Upgrades, Amber/Gold = Prestige/Ranglisten. Ambient-Glow hinter dem Logo spiegelt
   denselben Dreiklang. Nur 2 laute CTAs (Normal cyan · Rangliste gold), Rest ruhig.

   HINWEIS: Progression-Backend (SP, Upgrades, Ranglisten-Modi) ist noch NICHT gebaut. Bonus-Leiste,
   Upgrades-Card und Ranglisten-Gabel laufen mit festen Platzhalter-Werten (mit „Vorschau"-Markierung),
   damit Layout/Feel im echten Build sichtbar sind. Nur auf Autostich_Test. */

// Logo-Farben (aus dem Wortmarken-Verlauf gesampelt) — Rollen folgen dem Logo-Verlauf links→rechts:
const CY = "#26c6e6";   // Logo links (Cyan) — Start / Normaler Lauf
const BLUE = "#5a8ade";  // Logo-Übergang Cyan→Violett
const VI = "#9b82f0";   // Logo Mitte (Violett) — Ranglisten
const AM = "#f2a83a";   // Logo rechts (Amber/Gold) — Upgrades / SP-Währung
const SP = AM;          // Stichpunkte = Upgrade-Währung → Gold

// Platzhalter-Progressionsstand (Vorschau, bis Backend steht).
const STUB = {
  sp: 14,
  buyable: 3,
  bonusRuns: 7, bonusGoal: 10, // Bonus-Stichpunkte-Drip: je 10 Läufe +5 SP
  owned: 4, total: 13,
  meisterUnlocked: false,      // wird true, sobald alle Upgrades gekauft sind → Meister-Liga frei
  branches: [
    { name: "Baufeld", own: 1, buy: 1, total: 3, col: CY },
    { name: "Auftakt", own: 1, buy: 1, total: 2, col: BLUE },
    { name: "Rarität", own: 1, buy: 0, total: 3, col: VI },
    { name: "Meister", own: 1, buy: 1, total: 5, col: AM },
  ],
};

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onMasterRun = null, onDevRun = null, highscores, best, onOptions, onStats, onCustomize, onLeaderboard = null, onUpgrades = null, muted, onToggleMute, username = "", onEditName }) {
  const [showGuide, setShowGuide] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [normalOpen, setNormalOpen] = useState(false);
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

  // Farb-Hierarchie: nur EINE gefüllte Primär-Aktion, der Rest als Outline (weniger Farbwände, luftiger).
  // Läuft ein Run → „Fortsetzen" ist die helle Primär-Aktion, „Normaler Lauf" wird zum Cyan-Outline.
  const hasResume = !!(onResume && resume);
  // „Normaler Lauf" im ruhigeren Auftakt-Blau (dunkler als das helle Resume-Cyan).
  const normalFill  = { background: BLUE, color: "#0b1220", boxShadow: "0 0 12px rgba(90,138,222,.3)" };
  const normalGhost = { background: "#12151f", border: `1px solid ${BLUE}88`, color: "#93b4f2" };
  const normalStyle = hasResume ? normalGhost : normalFill;

  return (
    <div className="relative isolate flex flex-col items-center gap-6 pt-8 pb-10">
      {/* Ambient-Glow hinter dem Logo — spiegelt den Logo-Verlauf (Cyan links · Violett Mitte · Amber rechts).
          Verankert die ganze Kopfzone farblich im Logo, ohne laute Flächen. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[360px] -z-10"
        style={{ background:
          "radial-gradient(320px 170px at 28% 30%, rgba(38,198,230,.17), transparent 70%)," +
          "radial-gradient(320px 180px at 50% 24%, rgba(155,130,240,.18), transparent 70%)," +
          "radial-gradient(320px 170px at 72% 30%, rgba(242,168,58,.14), transparent 70%)" }} />

      {/* #133: Schnell-Mute jederzeit sichtbar oben rechts — togglet dasselbe options.muted wie die Optionen. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-0 right-0" />}
      {/* Glossar jederzeit erreichbar — oben links (die obere rechte Ecke belegt der Mute-Knopf). */}
      <GlossaryPanel className="absolute top-0 left-0" />

      {/* Neon-Wortmarke (ersetzt Text-Logo + altes Element-PNG). Echter Alpha-Kanal (dunkel → transparent),
          daher kein Rechteck-Rahmen mehr — blendet sauber auf jeden Grund (auch CRT-Skin). */}
      <div className="relative inline-block mt-1">
        <img src={logo} alt="AUTOSTICH" draggable="false"
          className="w-full max-w-[340px] h-auto select-none" />
        {/* Versions-Banner unten rechts an der Marke — Gold/Amber aus dem Logo. */}
        <span
          className="absolute -bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-pixel tracking-wide"
          style={{ background: AM, color: "#141419", boxShadow: "0 0 8px rgba(242,168,58,.6)", pointerEvents: "none" }}
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
          <span className="text-[12.5px] font-semibold opacity-90" style={{ color: SP }}>💠 Bonus-SP · nächste +5</span>
          <span className="text-[11.5px] opacity-55 font-mono tabular-nums">{STUB.bonusRuns} / {STUB.bonusGoal} Läufe</span>
        </div>
        <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "#0e0e13", border: "1px solid #26262e" }}>
          <div className="h-full rounded-full" style={{ width: `${STUB.bonusRuns / STUB.bonusGoal * 100}%`, background: `linear-gradient(90deg,#b87d1f,${SP})`, boxShadow: `0 0 8px rgba(242,168,58,.5)` }} />
        </div>
      </div>

      {/* Play-Gruppe — Fortsetzen + Normaler Lauf. Normaler Lauf klappt Normal (+ Dev Run) und das
          Seed-Feld auf → weniger Dauer-sichtbares im Haupt-Stapel. */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="w-full px-5 py-4 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight"
            style={{ background: "#5fe0f7", color: "#052730", boxShadow: "0 0 20px rgba(95,224,247,.65)" }}>
            <span className="text-[19px]">▶ Lauf fortsetzen</span>
            <span className="text-[11px] font-mono font-semibold opacity-80">
              Durchlauf {Math.min((resume.cycle || 0) + 1, resume.totalCycles)}/{resume.totalCycles} · Score {Math.round(resume.score || 0).toLocaleString("de-DE")}{resume.masterRun ? ` · Meister ${resume.grade || 0}` : ""}
            </span>
          </button>
        )}

        {/* Normaler Lauf — Aufklapper: Normal (+ Dev Run im Preview) + Seed-Feld. Gefüllt, wenn kein
            Resume läuft (= Held); mit Resume ruhiger Cyan-Outline. */}
        <button onClick={() => setNormalOpen((o) => !o)}
          className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          style={normalStyle}>
          Normaler Lauf
          <span className="text-[13px] transition-transform" style={{ transform: normalOpen ? "rotate(90deg)" : "none" }}>›</span>
        </button>
        {normalOpen && (
          <div className="flex flex-col gap-2.5">
            <div className={onDevRun ? "grid grid-cols-2 gap-2.5" : ""}>
              <button onClick={onStart}
                className="w-full rounded-lg px-4 py-3 text-[15px] font-extrabold transition-all hover:-translate-y-0.5"
                style={{ background: "#12151f", border: `1px solid ${BLUE}88`, color: "#93b4f2" }}>Normal</button>
              {onDevRun && (
                <button onClick={onDevRun}
                  className="rounded-lg px-4 py-3 text-[15px] font-extrabold transition-all hover:-translate-y-0.5"
                  style={{ background: "#1c1a14", border: `1px solid ${AM}66`, color: AM }}>⚙ Dev Run</button>
              )}
            </div>
            {/* #205: Seed einfügen — jetzt im Normaler-Lauf-Aufklapper unter Normal/Dev. */}
            {onPlaySeed && (
              <div>
                <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
                  <input
                    value={seedInput}
                    onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
                    placeholder="Seed einfügen"
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
        )}
      </div>

      {/* Ranglisten-Gruppe — eigener Block (Weißraum trennt „mein Spiel" vom Wettbewerb). Ruhiger
          Violett-Outline statt Vollfläche → Farbe sparsam, nur eine gefüllte Aktion oben. */}
      {onMasterRun && (
        <div className="w-full max-w-sm flex flex-col gap-2.5">
          <button onClick={() => setRankedOpen((o) => !o)}
            className="relative w-full px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ background: "#181425", border: `1px solid ${VI}66`, color: VI }}>
            Ranglisten-Lauf
            <span className="text-[13px] transition-transform" style={{ transform: rankedOpen ? "rotate(90deg)" : "none" }}>›</span>
            <span className="absolute top-1.5 right-2 px-1 rounded text-[9px] font-bold font-pixel leading-tight"
              style={{ background: "#241d3a", color: VI }} aria-label="Vorschau">exp</span>
          </button>
          {rankedOpen && (
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={onMasterRun}
                className="rounded-lg p-3 text-left flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                style={{ background: "#1c1c23", border: "1px solid #30303a" }}>
                <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Seed der Woche</span>
                <span className="text-[14px] font-extrabold" style={{ color: CY }}>Standard</span>
                <span className="text-[11px] leading-snug opacity-60">Upgrades ignoriert — Basiswerte für alle.</span>
              </button>
              {STUB.meisterUnlocked ? (
                <button onClick={onMasterRun}
                  className="rounded-lg p-3 text-left flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                  style={{ background: "#1c1c23", border: `1px solid ${AM}55` }}>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Seed der Woche</span>
                  <span className="text-[14px] font-extrabold" style={{ color: AM }}>Meister</span>
                  <span className="text-[11px] leading-snug opacity-60">Alle Upgrades aktiv.</span>
                </button>
              ) : (
                <div className="relative rounded-lg p-3 text-left flex flex-col gap-1 opacity-70 cursor-default"
                  style={{ background: "#1c1c23", border: "1px solid #30303a" }} title="Frei, sobald alle Upgrades gekauft sind">
                  <span className="absolute top-2.5 right-2.5 text-[12px] opacity-70">🔒</span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Seed der Woche</span>
                  <span className="text-[14px] font-extrabold" style={{ color: AM }}>Meister</span>
                  <span className="text-[11px] leading-snug opacity-60">Alle Upgrades nötig.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upgrades-Card (Vorschau) — SP-Guthaben, Äste als Kreise, Öffnen. Kern des künftigen Hubs.
          Dünne Logo-Verlaufs-Haarlinie oben bindet die Card an die Wortmarke. */}
      <div className="w-full max-w-sm rounded-2xl relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#1b1a24,#161620)", border: "1px solid #2c2a3a" }}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${CY}, ${VI}, ${AM})`, opacity: .85 }} />
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-2">
              <b className="text-[14.5px] tracking-tight">Upgrades</b>
              <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ background: "#26262e", color: "#a6a6b0" }}>Vorschau</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                style={{ background: "transparent", border: `1px solid ${AM}66`, color: AM }}>{STUB.buyable} kaufbar</span>
              <span className="flex items-baseline gap-1">
                <span className="text-[19px] font-extrabold tabular-nums" style={{ color: SP, textShadow: "0 0 12px rgba(242,168,58,.45)" }}>{STUB.sp}</span>
                <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: SP }}>SP</span>
              </span>
            </div>
          </div>

          {/* Äste: nur Name + Kreise (gekauft / kaufbar / gesperrt), keine Icons. Farben = Logo-Verlauf. */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {STUB.branches.map((b) => (
              <div key={b.name} className="rounded-lg px-1.5 py-2.5 flex flex-col items-center gap-2"
                style={{ background: "#12121a", border: "1px solid #26262e" }}>
                <span className="flex gap-1">
                  {Array.from({ length: b.total }).map((_, i) => {
                    const owned = i < b.own;
                    const buy = i >= b.own && i < b.own + b.buy;
                    return (
                      <i key={i} className="w-2 h-2 rounded-full"
                        style={owned
                          ? { background: b.col, border: `1px solid ${b.col}`, boxShadow: `0 0 6px ${b.col}` }
                          : buy
                            ? { background: "transparent", border: `1px solid ${SP}`, boxShadow: `0 0 5px rgba(242,168,58,.6)` }
                            : { background: "#2a2a33", border: "1px solid #3a3a45" }} />
                    );
                  })}
                </span>
                <span className="text-[10px] font-bold tracking-tight opacity-60">{b.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-[11.5px] opacity-60 tabular-nums"><b className="opacity-95">{STUB.owned} / {STUB.total}</b> · Meister-Liga bei {STUB.total}/{STUB.total}</span>
            <button onClick={onUpgrades || undefined}
              className="border-none font-extrabold text-[12.5px] px-3 py-2 rounded-lg cursor-pointer transition-transform hover:-translate-y-0.5 flex items-center gap-1.5"
              style={{ background: AM, color: "#141419" }} title="Upgrade-Screen (Vorschau)">
              Öffnen <span>›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sekundär-Navigation — ruhige Chip-Reihe statt fünf gleich breiter Balken. */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs sm:max-w-md">
        {onLeaderboard && <button onClick={onLeaderboard} className={chipCls} style={chipSty}>Bestenliste</button>}
        {onStats && <button onClick={onStats} className={chipCls} style={chipSty}>Statistiken</button>}
        {onCustomize && <button onClick={onCustomize} className={chipCls} style={chipSty}>Deck</button>}
        {onOptions && <button onClick={onOptions} aria-label="Optionen" className={chipCls} style={chipSty}>Optionen</button>}
        <button onClick={() => setShowGuide(true)} className={chipCls} style={chipSty}>Anleitung</button>
      </div>

      {/* Lokaler Nickname (#14). */}
      {onEditName && (
        <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1">
          {username
            ? <>Angemeldet als <b style={{ color: CY }}>{username}</b> · Name ändern</>
            : <>Namen festlegen für den globalen Highscore</>}
        </button>
      )}

      {/* #250 Versions-/Build-Stempel unten — nach jedem Push sichtbar, ob er gelandet ist (+ Umgebung + kurze SHA). */}
      <div className="text-[10px] font-mono opacity-40 tracking-wide select-text" title="Version · Umgebung · Commit">{VERSION_FULL}</div>

      {showGuide && <AnleitungModal onClose={closeGuide} />}
    </div>
  );
}
