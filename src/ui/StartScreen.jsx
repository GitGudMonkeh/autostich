import { useState } from "react";
import { MuteButton } from "./MuteButton.jsx";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { matchSecretSeed, ownedCount, nodeState, treeComplete, owns, NODES, BRANCHES, TOTAL_NODES, ONBOARDING_LINKS, SP_LOYALTY_EVERY } from "../game/progression.js"; // Test-Codes + Hub-Progressionsanzeige
import logo from "../assets/logo-wordmark.png";
import { GlossaryPanel } from "./Glossary.jsx";
import { VERSION_FULL, APP_VERSION } from "./version.js"; // #250: Versions-/Build-Stempel unten
import { PwaInstall } from "./PwaInstall.jsx"; // PWA · „Zum Startbildschirm" (Installieren-Link)

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

// Zweig-Farben für die Hub-Progressionsanzeige (#369: Decks / Allgemein; Knotendaten aus progression.js).
const BR_COLOR = { deck: VI, gen: CY };

// (Schritt 4e) Onboarding-Kette (docs §4): Reward je Glied — Index i = Belohnung fürs Erreichen von Glied i+1.
// Nur Anzeige (nächste Freischaltung im Hub); die Wirkung sitzt in progression.js / reducer.
const ONB_REWARDS = ["Reroll +1", "Pflanze frei", "Rarität: Blau", "Eis frei", "Rarität: Violett", "Legendär ⭐ (R29)"];

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onSecretSeed = null, onStandardRun = null, onMeisterRun = null, onChallenge = null, onOptions, onStats, onCustomize, onLeaderboard = null, onUpgrades = null, profile = null, muted, onToggleMute, username = "", onEditName }) {
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [secretMsg, setSecretMsg] = useState("");
  const [normalOpen, setNormalOpen] = useState(false);
  const [rankedOpen, setRankedOpen] = useState(false);

  // Echte Progressionsanzeige aus dem Profil (progression.js). Leeres Profil = frischer Spieler.
  const prof = profile || {};
  const progSp = Math.max(0, Math.floor(Number(prof.stichPoints) || 0));
  const progDp = Math.max(0, Math.floor(Number(prof.deckPoints) || 0)); // #299/#301: Deck-Punkte-Guthaben (Werkstatt-Währung)
  const progOwned = ownedCount(prof);
  const progBuyable = NODES.filter((n) => nodeState(prof, n.id) === "buy").length;
  const progLigaFree = treeComplete(prof);
  const onbStep = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(Number(prof.onboarding) || 0)));
  const onbDone = onbStep >= ONBOARDING_LINKS;
  // #299/#369 Hub-Gates: Werkstatt/Upgrades ab 6/6; Rangliste normal ab freigeschalteter Legendär-Schicht
  // (legLayer = klarer Mid-Tree-Meilenstein), Meister ab vollem Baum.
  const ranglisteNormalFree = owns(prof, "legLayer");
  const spRuns = Math.max(0, Math.floor(Number(prof.spRuns) || 0));
  const dripInto = SP_LOYALTY_EVERY > 0 ? (spRuns % SP_LOYALTY_EVERY) : 0; // Läufe seit letztem Treue-+5
  const branchViews = BRANCHES.map((b) => ({
    name: b.name, col: BR_COLOR[b.key],
    states: NODES.filter((n) => n.branch === b.key && !n.placeholder).map((n) => nodeState(prof, n.id)),
  }));
  const tryPlaySeed = () => {
    // Test-Codes „unlock"/„reset" VOR parseSeed abfangen (beide würden sonst als gültiger Seed durchgehen).
    // onSecretSeed ist nur im Preview-Build gesetzt → im Live-Spiel sind die Codes wirkungslos.
    const secret = onSecretSeed && matchSecretSeed(seedInput);
    if (secret) {
      setSeedError(false); setSeedInput("");
      setSecretMsg(secret === "unlock" ? "🔓 Alles freigeschaltet."
        : secret === "onboarding" ? "⏭️ Onboarding übersprungen · +10 SP · +50 DP"
        : "🔄 Profil wird zurückgesetzt …");
      onSecretSeed(secret);
      return;
    }
    const s = parseSeed(seedInput);
    if (s == null) { setSeedError(true); return; }
    setSeedError(false); setSecretMsg("");
    onPlaySeed(s);
  };


  // Sekundär-Navigation als ruhige Chip-Reihe — kompakter Pillen-Stil (dunkel, sekundär), einheitlich.
  const chipCls = "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all hover:-translate-y-0.5";
  const chipSty = { background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" };

  // Farb-Hierarchie: nur EINE gefüllte Primär-Aktion, der Rest als Outline (weniger Farbwände, luftiger).
  // Läuft ein Run → „Fortsetzen" ist die helle Primär-Aktion, „Normaler Lauf" wird zum Cyan-Outline.
  const hasResume = !!(onResume && resume);
  // „Normaler Lauf": getönter Glas-Fill statt Vollblock — halbtransparentes Blau (lässt den Grund leicht
  // durchscheinen → weniger „Farbblock"), definierender Rand hält die Form, helle Schrift bleibt lesbar.
  const normalFill  = { background: "rgba(90,138,222,0.55)", border: "1px solid rgba(122,162,235,0.75)", color: "#eef4ff", boxShadow: "0 0 14px rgba(90,138,222,.2)" };
  const normalGhost = { background: "#12151f", border: `1px solid ${BLUE}88`, color: "#93b4f2" };
  const normalStyle = hasResume ? normalGhost : normalFill;

  return (
    <div className="relative isolate flex flex-col items-center gap-3.5 pt-5 pb-5">
      {/* Ambient-Glow hinter dem Logo — spiegelt den Logo-Verlauf (Cyan links · Violett Mitte · Amber rechts).
          Verankert die ganze Kopfzone farblich im Logo, ohne laute Flächen. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[380px] -z-10"
        style={{ filter: "blur(30px)", background:
          // Weicher Auslauf: sanfte Falloff-Kurve (Farbe → halb → 0) statt harter transparent-70%-Kante, plus
          // blur(30px) → der Glow löst sich komplett kantenlos auf, ganz weich in den dunklen Grund.
          "radial-gradient(400px 220px at 28% 30%, rgba(38,198,230,.16) 0%, rgba(38,198,230,.06) 45%, transparent 82%)," +
          "radial-gradient(400px 230px at 50% 24%, rgba(155,130,240,.17) 0%, rgba(155,130,240,.06) 45%, transparent 82%)," +
          "radial-gradient(400px 220px at 72% 30%, rgba(242,168,58,.13) 0%, rgba(242,168,58,.05) 45%, transparent 82%)" }} />

      {/* Ecken-Buttons als konsistentes Paar: Schnell-Mute oben LINKS, Glossar (Info) oben RECHTS — beide
          gleich gestylte dunkle Rounded-Pills, mit Rahmen-Inset (top-2 / left-2·right-2) statt in die Ecke gedrängt.
          Der Info-Button überschreibt den Kreis-Default (gloss-i-btn) auf denselben Pill-Look wie Mute. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-2 left-2" />}
      <GlossaryPanel className="absolute top-2 right-2"
        style={{ width: "auto", height: "auto", borderRadius: "0.5rem", padding: "0.375rem 0.75rem",
          background: "#20202a", border: "1px solid #30303a", color: "#b3a8ff",
          fontFamily: "inherit", fontStyle: "normal", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1 }} />

      {/* Neon-Wortmarke (ersetzt Text-Logo + altes Element-PNG). Echter Alpha-Kanal (dunkel → transparent),
          daher kein Rechteck-Rahmen mehr — blendet sauber auf jeden Grund (auch CRT-Skin). */}
      <div className="relative inline-block mt-1">
        <img src={logo} alt="AUTOSTICH" draggable="false"
          className="w-full max-w-[288px] h-auto select-none" />
        {/* Versions-Banner unten rechts an der Marke — Gold/Amber aus dem Logo. */}
        <span
          className="absolute -bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-pixel tracking-wide"
          style={{ background: AM, color: "#141419", boxShadow: "0 0 8px rgba(242,168,58,.6)", pointerEvents: "none" }}
          aria-hidden="true"
        >
          v{APP_VERSION}
        </span>
      </div>
      <p className="text-xs opacity-45 -mt-1">Roguelite-Autobattler-Stechspiel · Prototyp</p>

      {/* Fortschritts-/Bonus-Leiste — ein Element, zwei Leben: Onboarding (bis 6/6), danach SP-Treue-Drip.
          Frosted-Glass: halbtransparenter Grund (das Kopf-Glühen blutet oben ins Panel → weicher Übergang statt
          harter Kante) + Hairline-Border + Backdrop-Blur (Text bleibt scharf). */}
      <div className="w-full max-w-sm rounded-xl px-4 py-2.5 flex flex-col gap-1.5"
        style={{ background: "rgba(23,23,28,0.5)", border: "1px solid rgba(150,150,170,0.10)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between gap-3">
          {onbDone ? (
            <span className="text-[12.5px] font-semibold opacity-90" style={{ color: SP }}>💠 Bonus-{progLigaFree ? "DP" : "SP"} · nächste +5</span>
          ) : (
            <span className="text-[12.5px] font-semibold opacity-90" style={{ color: VI }}>🎓 Onboarding</span>
          )}
          <span className="text-[11.5px] opacity-55 font-mono tabular-nums">
            {onbDone ? `${dripInto} / ${SP_LOYALTY_EVERY} Läufe` : `${onbStep} / ${ONBOARDING_LINKS}`}
          </span>
        </div>
        <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "#0e0e13", border: "1px solid #26262e" }}>
          <div className="h-full rounded-full" style={onbDone
            ? { width: `${dripInto / SP_LOYALTY_EVERY * 100}%`, background: `linear-gradient(90deg,#b87d1f,${SP})`, boxShadow: `0 0 8px rgba(242,168,58,.5)` }
            : { width: `${onbStep / ONBOARDING_LINKS * 100}%`, background: `linear-gradient(90deg,#6a5fb0,${VI})`, boxShadow: `0 0 8px rgba(155,130,240,.5)` }} />
        </div>
        {/* (Schritt 4e) Nächste Freischaltung — nur während des Onboardings; danach übernimmt die SP-Drip-Zeile oben. */}
        {!onbDone && ONB_REWARDS[onbStep] && (
          <div className="flex items-center gap-1.5 text-[11px] -mb-0.5">
            <span className="opacity-50">Nächste Freischaltung:</span>
            <b style={{ color: VI }}>{ONB_REWARDS[onbStep]}</b>
          </div>
        )}
      </div>

      {/* Play-Gruppe — Fortsetzen + Normaler Lauf. Normaler Lauf klappt Normal (+ Dev Run) und das
          Seed-Feld auf → weniger Dauer-sichtbares im Haupt-Stapel. */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight"
            style={{ background: "#5fe0f7", color: "#052730", boxShadow: "0 0 20px rgba(95,224,247,.65)" }}>
            <span className="text-[19px]">▶ Lauf fortsetzen</span>
            <span className="text-[11px] font-mono font-semibold opacity-80">
              Durchlauf {Math.min((resume.cycle || 0) + 1, resume.totalCycles)}/{resume.totalCycles} · Score {Math.round(resume.score || 0).toLocaleString("de-DE")}
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
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={onStart}
                className="as-guide-glow w-full rounded-lg px-4 py-2.5 text-[15px] font-extrabold transition-all hover:-translate-y-0.5"
                style={{ background: "#0e1b22", border: "1px solid #5fe0f7", color: "#a8ecf7" }}>Normal</button>
              {/* #301 Challenges — erst nach komplettem Upgrade-Baum spielbar (treeComplete), sonst gesperrt.
                  Öffnet das Modifikator-Auswahl-Fenster (onChallenge). Ersetzt den Dev-Run-Button. */}
              {progLigaFree && onChallenge ? (
                <button onClick={onChallenge} aria-label="Challenges"
                  className="w-full rounded-lg px-4 py-2.5 text-[15px] font-extrabold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5"
                  style={{ background: "#1c1012", border: "1px solid #e05555", color: "#ff9a9a", boxShadow: "0 0 14px rgba(224,85,85,.35)" }}>
                  <span aria-hidden="true">⚔</span> Challenges
                </button>
              ) : (
                <button disabled aria-label="Challenges (gesperrt — kompletter Upgrade-Baum nötig)" title="Erst mit komplettem Upgrade-Baum"
                  className="w-full rounded-lg px-4 py-2.5 text-[15px] font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed"
                  style={{ background: "#1c1012", border: "1px solid #e0555566", color: "#e07a7a", opacity: 0.7 }}>
                  <span aria-hidden="true">🔒</span> Challenges
                </button>
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
                {secretMsg && <div className="text-xs mt-1" style={{ color: "#6ad39f" }}>{secretMsg}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ranglisten-Gruppe — eigener Block (Weißraum trennt „mein Spiel" vom Wettbewerb). Ruhiger
          Violett-Outline statt Vollfläche → Farbe sparsam, nur eine gefüllte Aktion oben. */}
      {(onStandardRun || onMeisterRun) && (
        <div className="w-full max-w-sm flex flex-col gap-2.5">
          {!ranglisteNormalFree ? (
            /* #299/#369: Rangliste-Normal erst ab freigeschalteter Legendär-Schicht (legLayer). */
            <div className="w-full px-4 py-2.5 rounded-lg text-[14px] font-bold flex items-center justify-between gap-2 opacity-80 cursor-default"
              style={{ background: "#161320", border: `1px solid ${VI}33`, color: VI }}
              title={onbDone ? "Rangliste wird ab freigeschalteter Legendär-Schicht frei" : "Ranglisten-Läufe werden nach Abschluss des Onboardings frei"}>
              <span className="flex items-center gap-2"><span className="opacity-70">🔒</span> Ranglisten-Lauf</span>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-pixel leading-tight whitespace-nowrap"
                style={{ background: "#241d3a", color: VI }}>
                {onbDone ? "ab Legendär" : `noch ${ONBOARDING_LINKS - onbStep} ${ONBOARDING_LINKS - onbStep === 1 ? "Lauf" : "Läufe"}`}
              </span>
            </div>
          ) : (
            <>
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
                  <button onClick={onStandardRun}
                    className="rounded-lg p-3 text-left flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                    style={{ background: "#1c1c23", border: "1px solid #30303a" }}>
                    <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Ranglisten-Lauf</span>
                    <span className="text-[14px] font-extrabold" style={{ color: CY }}>Standard</span>
                    <span className="text-[11px] leading-snug opacity-60">Upgrades ignoriert — feste Basiswerte für alle (2 Rerolls).</span>
                  </button>
                  {progLigaFree ? (
                    <button onClick={onMeisterRun}
                      className="rounded-lg p-3 text-left flex flex-col gap-1 transition-all hover:-translate-y-0.5"
                      style={{ background: "#1c1c23", border: `1px solid ${AM}55` }}>
                      <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Ranglisten-Lauf</span>
                      <span className="text-[14px] font-extrabold" style={{ color: AM }}>Meister</span>
                      <span className="text-[11px] leading-snug opacity-60">Voller Baum — alle Upgrades aktiv.</span>
                    </button>
                  ) : (
                    <div className="relative rounded-lg p-3 text-left flex flex-col gap-1 opacity-70 cursor-default"
                      style={{ background: "#1c1c23", border: "1px solid #30303a" }} title="Frei, sobald alle Upgrades gekauft sind">
                      <span className="absolute top-2.5 right-2.5 text-[12px] opacity-70">🔒</span>
                      <span className="text-[9.5px] font-bold uppercase tracking-wide opacity-45">Ranglisten-Lauf</span>
                      <span className="text-[14px] font-extrabold" style={{ color: AM }}>Meister</span>
                      <span className="text-[11px] leading-snug opacity-60">Alle Upgrades nötig.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Deck-Werkstatt — eigener Button zwischen Rangliste und Upgrades, im Amber des Logo-ENDES (rechts).
          #299 §1: während des Onboardings (< 6/6) gesperrt + ausgegraut mit Countdown, ab 6/6 frei. */}
      {onCustomize && (onbDone ? (
        <button onClick={onCustomize}
          className="w-full max-w-sm px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:-translate-y-0.5 flex items-center justify-between gap-2"
          style={{ background: "#1f1a10", border: `1px solid ${AM}66`, color: AM }}>
          <span>Deck-Werkstatt</span>
          {/* #301: DP-Guthaben am Button anzeigen — analog zur SP-Anzeige auf der Upgrades-Card. */}
          <span className="flex items-center gap-2">
            <span className="flex items-baseline gap-1">
              <span className="text-[17px] font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.45)" }}>{progDp}</span>
              <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: AM }}>DP</span>
            </span>
            <span className="text-[13px]">›</span>
          </span>
        </button>
      ) : (
        <div className="w-full max-w-sm px-4 py-2.5 rounded-lg text-[14px] font-bold flex items-center justify-between gap-2 opacity-70 cursor-default"
          style={{ background: "#1a160e", border: `1px solid ${AM}33`, color: AM }}
          title="Die Deck-Werkstatt wird nach Abschluss des Onboardings frei">
          <span className="flex items-center gap-2"><span className="opacity-70">🔒</span> Deck-Werkstatt</span>
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-pixel leading-tight whitespace-nowrap"
            style={{ background: "#2a2113", color: AM }}>
            noch {ONBOARDING_LINKS - onbStep} {ONBOARDING_LINKS - onbStep === 1 ? "Lauf" : "Läufe"}
          </span>
        </div>
      ))}

      {/* Upgrades-Card (Vorschau) — SP-Guthaben, Äste als Kreise, Öffnen. Kern des künftigen Hubs.
          Dünne Logo-Verlaufs-Haarlinie oben bindet die Card an die Wortmarke. */}
      <div className="w-full max-w-sm rounded-2xl relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#1b1a24,#161620)", border: "1px solid #2c2a3a", opacity: onbDone ? 1 : 0.6 }}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${CY}, ${VI}, ${AM})`, opacity: .85 }} />
        <div className="p-3">
          <div className="flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-2">
              <b className="text-[14.5px] tracking-tight">Upgrades</b>
              {!onbDone && <span className="text-[12px] opacity-70" title="Frei nach Abschluss des Onboardings" aria-label="gesperrt">🔒</span>}
            </div>
            <div className="flex items-center gap-2.5">
              {progBuyable > 0 && (
                <span className="inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                  style={{ background: "transparent", border: `1px solid ${AM}66`, color: AM }}>{progBuyable} kaufbar</span>
              )}
              {/* #299: bei komplettem Baum sind SP nutzlos (zu DP umgewandelt) → SP-Anzeige verschwindet, stattdessen „komplett". */}
              {progLigaFree ? (
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: "transparent", border: `1px solid ${AM}66`, color: AM }}>✓ komplett</span>
              ) : (
                <span className="flex items-baseline gap-1">
                  <span className="text-[19px] font-extrabold tabular-nums" style={{ color: SP, textShadow: "0 0 12px rgba(242,168,58,.45)" }}>{progSp}</span>
                  <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: SP }}>SP</span>
                </span>
              )}
            </div>
          </div>

          {/* Äste: nur Name + Kreise (gekauft / kaufbar / gesperrt), keine Icons. Farben = Logo-Verlauf. */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            {branchViews.map((b) => (
              <div key={b.name} className="rounded-lg px-1.5 py-2 flex flex-col items-center gap-1.5"
                style={{ background: "#12121a", border: "1px solid #26262e" }}>
                <span className="flex flex-wrap gap-1 justify-center">
                  {b.states.map((st, i) => (
                    <i key={i} className="w-2 h-2 rounded-full"
                      style={st === "owned"
                        ? { background: b.col, border: `1px solid ${b.col}`, boxShadow: `0 0 6px ${b.col}` }
                        : st === "buy"
                          ? { background: "transparent", border: `1px solid ${AM}`, boxShadow: `0 0 5px rgba(242,168,58,.6)` }
                          : { background: "#2a2a33", border: "1px solid #3a3a45" }} />
                  ))}
                </span>
                <span className="text-[10px] font-bold tracking-tight opacity-60">{b.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-2.5">
            <span className="text-[11.5px] opacity-60 tabular-nums"><b className="opacity-95">{progOwned} / {TOTAL_NODES}</b> · Meister-Liga {progLigaFree ? <b style={{ color: AM }}>frei</b> : `bei ${TOTAL_NODES}/${TOTAL_NODES}`}</span>
            {onbDone ? (
              <button onClick={onUpgrades || undefined}
                className="border-none font-extrabold text-[12.5px] px-3 py-2 rounded-lg cursor-pointer transition-transform hover:-translate-y-0.5 flex items-center gap-1.5"
                style={{ background: AM, color: "#141419" }} title="Upgrade-Screen (Vorschau)">
                Öffnen <span>›</span>
              </button>
            ) : (
              /* Gesperrt bis Onboarding-Ende — leicht ausgegraut + Lock + Countdown (wie der Ranglisten-Lock). */
              <span className="text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-default whitespace-nowrap"
                style={{ background: "#20202a", border: "1px solid #33333e", color: "#8a8a95" }}
                title="Frei nach Abschluss des Onboardings">
                🔒 noch {ONBOARDING_LINKS - onbStep} {ONBOARDING_LINKS - onbStep === 1 ? "Lauf" : "Läufe"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sekundär-Navigation — ruhige Chip-Reihe statt fünf gleich breiter Balken. */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs sm:max-w-md">
        {onLeaderboard && <button onClick={onLeaderboard} className={chipCls} style={chipSty}>Bestenliste</button>}
        {onStats && <button onClick={onStats} className={chipCls} style={chipSty}>Statistiken</button>}
        {onOptions && <button onClick={onOptions} aria-label="Optionen" className={chipCls} style={chipSty}>Optionen</button>}
      </div>

      {/* Lokaler Nickname (#14). */}
      {onEditName && (
        <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1">
          {username
            ? <>Angemeldet als <b style={{ color: CY }}>{username}</b> · Name ändern</>
            : <>Namen festlegen für den globalen Highscore</>}
        </button>
      )}

      {/* PWA · „Zum Startbildschirm hinzufügen" — kleiner Link zwischen Nickname und Versionsstempel (nur wenn relevant). */}
      <PwaInstall />

      {/* #250 Versions-/Build-Stempel unten — nach jedem Push sichtbar, ob er gelandet ist (+ Umgebung + kurze SHA). */}
      <div className="text-[10px] font-mono opacity-40 tracking-wide select-text" title="Version · Umgebung · Commit">{VERSION_FULL}</div>
    </div>
  );
}
