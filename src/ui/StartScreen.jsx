import { useState } from "react";
import { MuteButton } from "./MuteButton.jsx";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { matchSecretSeed, ownedCount, nodeState, treeComplete, rankedUnlocked, NODES, TOTAL_NODES, ONBOARDING_LINKS, SP_LOYALTY_EVERY } from "../game/progression.js"; // Test-Codes + Hub-Progressionsanzeige
import logo from "../assets/logo-wordmark.png";
import { GlossaryPanel } from "./Glossary.jsx";
import { rarityLabel } from "../i18n/labels.js";      // Raritäts-Namen: EINE Quelle, übersetzt (Sprachprüfung C1)
import { VERSION_FULL, APP_VERSION } from "./version.js"; // #250: Versions-/Build-Stempel unten
import { PwaInstall } from "./PwaInstall.jsx"; // PWA · „Zum Startbildschirm" (Installieren-Link)
import { DISCORD_URL, DISCORD_BLURPLE } from "./links.js"; // #datenschutz: Invite jetzt geteilt (s. u.)
import { fmtNum } from "../i18n/index.js";
import { useT } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()

/* Startbildschirm — Hub-Redesign (Progression-System, Design-Doc docs/progression-decisions.md).
   Farbsystem aus dem Neon-Logo abgeleitet (Verlauf Cyan → Violett → Amber): Cyan = Start/SP/Energie,
   Violett = Marke/Upgrades, Amber/Gold = Prestige/Ranglisten. Ambient-Glow hinter dem Logo spiegelt
   denselben Dreiklang. Nur 2 laute CTAs (Normal cyan · Rangliste gold), Rest ruhig.

   HINWEIS: Progression-Backend (SP, Upgrades, Ranglisten-Modi) ist noch NICHT gebaut. Bonus-Leiste,
   Upgrades-Card und Ranglisten-Gabel laufen mit festen Platzhalter-Werten (mit „Vorschau"-Markierung),
   damit Layout/Feel im echten Build sichtbar sind. Nur auf Autostich_Test. */

// Discord-Einladung (Community). Als Konstante — kein Anzeigetext, gehört nicht in den i18n-Katalog.
// #datenschutz: liegt seit dem Hinweis-Overlay in ui/links.js, weil der Invite dort ein zweites Mal
// gebraucht wird (er ist der Kontaktweg). Eine URL an zwei Stellen driftet beim nächsten Wechsel.

// Logo-Farben (aus dem Wortmarken-Verlauf gesampelt) — Rollen folgen dem Logo-Verlauf links→rechts:
const CY = "#26c6e6";   // Logo links (Cyan) — Start / Normaler Lauf
const BLUE = "#5a8ade";  // Logo-Übergang Cyan→Violett
const VI = "#9b82f0";   // Logo Mitte (Violett) — Ranglisten
const AM = "#f2a83a";   // Logo rechts (Amber/Gold) — Upgrades / SP-Währung
const SP = AM;          // Stichpunkte = Upgrade-Währung → Gold

// (Schritt 4e) Onboarding-Kette (docs §4): Reward je Glied — Index i = Belohnung fürs Erreichen von Glied i+1.
// Nur Anzeige (nächste Freischaltung im Hub); die Wirkung sitzt in progression.js / reducer.
// Sprachprüfung C1/E3: Raritäts-Namen aus TIER_META (kein „Blau"/„Violett"), Legendär-Phase mit ausgeschriebenem
// Durchlauf statt der Chiffre „R29" — die Zahl kommt aus dem Entscheidungsplan (constants.js).
// #sprache: als Funktion, damit der Sprachwechsel greift — Name UND Raritätsstufe lösen zur Anzeigezeit auf.
const onbRewards = (t) => [
  t("start.onb.reroll"), t("start.onb.plant"), t("start.onb.rarity", { tier: rarityLabel(3) }),
  t("start.onb.ice"), t("start.onb.rarity", { tier: rarityLabel(4) }), t("start.onb.legendary"),
];

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onSecretSeed = null, onRankedBoard = null, onOptions, onStats, onCustomize, onLeaderboard = null, onUpgrades = null, onTutorial = null, onFeedback = null, onPrivacy = null, tutorialDone = false, profile = null, muted, onToggleMute, username = "", onEditName }) {
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [secretMsg, setSecretMsg] = useState("");
  const t = useT();
  const ONB_REWARDS = onbRewards(t);

  // Echte Progressionsanzeige aus dem Profil (progression.js). Leeres Profil = frischer Spieler.
  const prof = profile || {};
  const progSp = Math.max(0, Math.floor(Number(prof.stichPoints) || 0));
  const progDp = Math.max(0, Math.floor(Number(prof.deckPoints) || 0)); // #299/#301: Deck-Punkte-Guthaben (Werkstatt-Währung)
  const progOwned = ownedCount(prof);
  /* #tutorial-sichtbarkeit: Nur das LAUTE Angebot über „Normaler Lauf" verschwindet, sobald der Spieler seinen
     ersten (Best-)Lauf ABGESCHLOSSEN hat (hadCompletedRun kippt genau beim ersten completed-Lauf, nicht bei
     Abbrüchen) oder das Tutorial gesehen wurde — danach braucht der Einstieg keinen prominenten Platz mehr.
     Der ruhige Tutorial-CHIP unten neben „Optionen" BLEIBT dagegen dauerhaft (jederzeit wiederholbar), solange
     ein Tutorial-Handler existiert. Seit dem Onboarding-Rückbau (#316) ist das Tutorial die EINZIGE Führung. */
  const canTutorial = !!onTutorial;                                            // Chip unten: immer verfügbar
  const firstContact = canTutorial && !prof.hadCompletedRun && !tutorialDone;  // lautes Angebot: bis zum ersten abgeschlossenen Lauf
  const progBuyable = NODES.filter((n) => nodeState(prof, n.id) === "buy").length;
  const progLigaFree = treeComplete(prof);
  const onbStep = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(Number(prof.onboarding) || 0)));
  const onbDone = onbStep >= ONBOARDING_LINKS;
  // #299/#369 Hub-Gates: Werkstatt/Upgrades ab 6/6. #370 Rangliste frei, sobald alle Decks freigeschaltet + je ≥1 Lauf beendet.
  const rankedFree = rankedUnlocked(prof);
  const spRuns = Math.max(0, Math.floor(Number(prof.spRuns) || 0));
  const dripInto = SP_LOYALTY_EVERY > 0 ? (spRuns % SP_LOYALTY_EVERY) : 0; // Läufe seit letztem Treue-+5
  const tryPlaySeed = () => {
    // Test-Codes „unlock"/„reset" VOR parseSeed abfangen (beide würden sonst als gültiger Seed durchgehen).
    // onSecretSeed ist nur im Preview-Build gesetzt → im Live-Spiel sind die Codes wirkungslos.
    const secret = onSecretSeed && matchSecretSeed(seedInput);
    if (secret) {
      setSeedError(false); setSeedInput("");
      setSecretMsg(secret === "unlock" ? t("start.secret.unlock")
        : secret === "onboarding" ? t("start.secret.onboarding")
        : t("start.secret.reset"));
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
  // Cyan-Primär-Optik (hell, mit kräftigem Cyan-Glow) — geteilte Quelle für „Lauf fortsetzen" UND „Normaler Lauf",
  // wenn dieser (ohne laufenden Run) selbst die Primär-Aktion ist → beide glühen identisch (#).
  const cyanPrimary = { background: "#5fe0f7", color: "#052730", boxShadow: "0 0 20px rgba(95,224,247,.65)" };
  // Läuft ein Run, tritt „Normaler Lauf" hinter das helle „Fortsetzen" zurück → ruhiger Cyan/Blau-Outline (unverändert).
  const normalGhost = { background: "#12151f", border: `1px solid ${BLUE}88`, color: "#93b4f2" };
  const normalStyle = hasResume ? normalGhost : cyanPrimary;

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
        <img src={logo} alt={t("start.logo.alt")} draggable="false"
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
      <p className="text-xs opacity-45 -mt-1">{t("start.tagline")}</p>

      {/* Fortschritts-/Bonus-Leiste — ein Element, zwei Leben: Onboarding (bis 6/6), danach SP-Treue-Drip.
          Frosted-Glass: halbtransparenter Grund (das Kopf-Glühen blutet oben ins Panel → weicher Übergang statt
          harter Kante) + Hairline-Border + Backdrop-Blur (Text bleibt scharf). */}
      <div className="w-full max-w-sm rounded-xl px-4 py-2.5 flex flex-col gap-1.5"
        style={{ background: "rgba(23,23,28,0.5)", border: "1px solid rgba(150,150,170,0.10)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between gap-3">
          {onbDone ? (
            <span className="text-[12.5px] font-semibold opacity-90" style={{ color: SP }}>{t("start.progress.bonus", { cur: t(progLigaFree ? "common.cur.dp" : "common.cur.sp") })}</span>
          ) : (
            <span className="text-[12.5px] font-semibold opacity-90" style={{ color: VI }}>{t("start.progress.onboarding")}</span>
          )}
          <span className="text-[11.5px] opacity-55 font-mono tabular-nums">
            {onbDone ? t("start.progress.runs", { done: dripInto, total: SP_LOYALTY_EVERY })
                     : t("start.progress.links", { done: onbStep, total: ONBOARDING_LINKS })}
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
            <span className="opacity-50">{t("start.progress.next")}</span>
            <b style={{ color: VI }}>{ONB_REWARDS[onbStep]}</b>
          </div>
        )}
      </div>

      {/* Erstkontakt-Angebot: einmalig laut, solange kein Lauf beendet und das Tutorial nie gesehen wurde.
          Bewusst KEIN dritter Dauer-CTA — es verschwindet nach dem ersten beendeten Lauf bzw. sobald das
          Tutorial gesehen ist, und lebt danach nur noch als Chip neben „Optionen" (Plan §13.4). */}
      {firstContact && (
        <div className="w-full max-w-sm">
          <button onClick={onTutorial}
            className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight"
            style={{ background: "#1a1330", border: `1px solid ${VI}aa`, color: "#d9ccff", boxShadow: `0 0 20px -8px ${VI}` }}>
            <span className="text-[17px]">{t("start.tutorial.offer")}</span>
            <span className="text-[11px] font-semibold opacity-75">{t("start.tutorial.offer.sub")}</span>
          </button>
        </div>
      )}

      {/* Play-Gruppe — Fortsetzen + Normaler Lauf. Normaler Lauf klappt Normal (+ Dev Run) und das
          Seed-Feld auf → weniger Dauer-sichtbares im Haupt-Stapel. */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight"
            style={cyanPrimary}>
            <span className="text-[19px]">{t("start.resume")}</span>
            <span className="text-[11px] font-mono font-semibold opacity-80">
              {t("start.resume.sub", {
                cycle: Math.min((resume.cycle || 0) + 1, resume.totalCycles),
                total: resume.totalCycles,
                score: fmtNum(Math.round(resume.score || 0)),
              })}
            </span>
          </button>
        )}

        {/* #382 „Normaler Lauf" startet direkt (kein Aufklapper mehr). Gefüllt ohne Resume (= Held), sonst Cyan-Outline. */}
        <button onClick={onStart}
          className="w-full px-5 py-3 rounded-lg text-base font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center"
          style={normalStyle}>
          {t("start.normal")}
        </button>
        {/* #382 Seed-Chip dauerhaft unter „Normaler Lauf": Seed einfügen + „↻ Spielen" (inkl. Test-Code-Pfad tryPlaySeed). */}
        {onPlaySeed && (
          <div>
            <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
              <input
                value={seedInput}
                onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
                placeholder={t("start.seed.placeholder")}
                aria-label={t("start.seed.aria")}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono tracking-wide"
                style={{ background: "#141419", border: `1px solid ${seedError ? "#e06a6a" : "#2a2a33"}`, color: "#cfcfd6" }}
              />
              <button type="submit" disabled={!seedInput.trim()}
                className="shrink-0 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
                {t("start.seed.play")}
              </button>
            </form>
            {seedError && <div className="text-xs mt-1" style={{ color: "#e06a6a" }}>{t("start.seed.error")}</div>}
            {secretMsg && <div className="text-xs mt-1" style={{ color: "#6ad39f" }}>{secretMsg}</div>}
          </div>
        )}
      </div>

      {/* #370 Ranglisten-Gruppe — EIN Wochen-Ranked-Modus (ersetzt Standard/Meister): fixe faire Baseline, alle spielen
          den Wochen-Seed. Frei, sobald alle Decks freigeschaltet sind UND mit jedem ≥1 Lauf beendet wurde. */}
      {/* #370: EIN Einstieg „Rangliste" → öffnet die Übersicht (Reiter Diese Woche · Challenger · Regeln). Gespielt wird
          im Reiter „Diese Woche" (▶ Spielen, gegated). Der Einstieg ist IMMER offen (ansehen jederzeit); das Schloss
          signalisiert nur, dass Spielen noch gesperrt ist. */}
      {onRankedBoard && (
        <div className="w-full max-w-sm flex flex-col gap-2.5">
          <button onClick={onRankedBoard}
            className="relative w-full px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ background: "#181425", border: `1px solid ${VI}66`, color: VI }}
            title={t(rankedFree ? "start.ranked.open" : "start.ranked.locked")}>
            <span>{rankedFree ? "🏆" : <span className="opacity-70">🔒</span>} {t("start.ranked")}</span>
            <span className="absolute top-1.5 right-2 px-1 rounded text-[9px] font-bold font-pixel leading-tight"
              style={{ background: "#241d3a", color: VI }} aria-label={t("start.ranked.badge.aria")}>{t("start.ranked.badge")}</span>
          </button>
        </div>
      )}

      {/* Variante C — Verwaltungszone als ruhiges, einheitliches 2×2-Kachel-Grid (Werkstatt · Upgrades ·
          Bestenliste · Statistik). Statt vieler unterschiedlich lauter Blöcke: gleich große Kacheln, deren
          EINZIGES Farbsignal ein dünner Stripe an der linken Kachel-Seite ist. Die vier Stripes folgen in
          Lesereihenfolge (TL→TR→BL→BR) dem Logo-Verlauf CY → BLUE → VI → AM. Keine Icons — nur Titel, Stripe
          und (wo vorhanden) Kennzahl. Währungs-Zahlen (DP/SP) bleiben im Gold der Währung, unabhängig vom
          dekorativen Stripe. Gesperrt (Onboarding < 6/6): Kachel gedimmt + Countdown-Badge statt Kennzahl. */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-2.5">
        {/* Kachel-Basis: gleiche Höhe (justify-between), Stripe links absolut, keine Icons. */}
        {(() => { const tileCls = "relative overflow-hidden rounded-xl text-left p-3 pl-4 min-h-[76px] flex flex-col justify-between transition-all hover:-translate-y-0.5";
          const tileSty = { background: "linear-gradient(180deg,#1b1a24,#161620)", border: "1px solid #2c2a3a" };
          const Stripe = ({ c, dim }) => (<span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: c, opacity: dim ? 0.45 : 1 }} />);
          const head = (t) => (<b className="text-[13.5px] tracking-tight">{t}</b>);
          const arrow = <span className="text-[13px] opacity-35">›</span>;
          const lockBadge = (bg) => (<span className="self-start shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-pixel leading-tight whitespace-nowrap"
            style={{ background: bg, color: "#c9c9d2" }}>{t("start.tile.lock", { count: ONBOARDING_LINKS - onbStep })}</span>);
          return (<>
            {/* 1 · Upgrades (getauscht mit Deck-Werkstatt) — Stripe CY (Grid-Position TL, Logo-Verlauf bleibt). SP-Guthaben in Gold (bzw. „komplett"), „kaufbar"-Hinweis. Onboarding-Gate. */}
            {onbDone ? (
              <button onClick={onUpgrades || undefined} className={tileCls} style={tileSty} title={t("start.tile.upgrades.title")}>
                <Stripe c={CY} />
                <div className="flex items-center justify-between gap-1">
                  {head(t("start.tile.upgrades"))}
                  {progBuyable > 0
                    ? <span className="shrink-0 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ border: `1px solid ${AM}66`, color: AM }}>{t("start.tile.upgrades.buyable", { n: progBuyable })}</span>
                    : arrow}
                </div>
                {progLigaFree ? (
                  <span className="text-[13px] font-extrabold" style={{ color: AM }}>{t("start.tile.upgrades.complete")}</span>
                ) : (
                  <span className="flex items-baseline gap-1">
                    <span className="text-[19px] font-extrabold tabular-nums" style={{ color: SP, textShadow: "0 0 12px rgba(242,168,58,.45)" }}>{progSp}</span>
                    <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: SP }}>{t("common.cur.sp")}</span>
                    <span className="text-[10px] opacity-45 tabular-nums ml-1">{progOwned}/{TOTAL_NODES}</span>
                  </span>
                )}
              </button>
            ) : (
              <div className={tileCls + " cursor-default"} style={{ ...tileSty, opacity: 0.6 }} title={t("start.tile.upgrades.locked")}>
                <Stripe c={CY} dim />
                {head(t("start.tile.upgrades"))}
                {lockBadge("#20202a")}
              </div>
            )}

            {/* 2 · Deck-Werkstatt (getauscht mit Upgrades) — Stripe BLUE (Grid-Position TR, Logo-Verlauf bleibt). DP-Guthaben in Gold. Onboarding-Gate. */}
            {onCustomize && (onbDone ? (
              <button onClick={onCustomize} className={tileCls} style={tileSty} title={t("start.tile.workshop")}>
                <Stripe c={BLUE} />
                <div className="flex items-center justify-between gap-1">{head(t("start.tile.workshop"))}{arrow}</div>
                <span className="flex items-baseline gap-1">
                  <span className="text-[19px] font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.45)" }}>{progDp}</span>
                  <span className="text-[10px] font-bold tracking-wider opacity-75" style={{ color: AM }}>{t("common.cur.dp")}</span>
                </span>
              </button>
            ) : (
              <div className={tileCls + " cursor-default"} style={{ ...tileSty, opacity: 0.6 }} title={t("start.tile.workshop.locked")}>
                <Stripe c={BLUE} dim />
                {head(t("start.tile.workshop"))}
                {lockBadge("#20202a")}
              </div>
            ))}

            {/* 3 · Bestenliste — Stripe VI (Violett = Wettbewerb/Rang, passt semantisch). */}
            {onLeaderboard && (
              <button onClick={onLeaderboard} className={tileCls} style={tileSty} title={t("start.tile.leaderboard")}>
                <Stripe c={VI} />
                <div className="flex items-center justify-between gap-1">{head(t("start.tile.leaderboard"))}{arrow}</div>
                <span className="text-[11px] opacity-50">{t("start.tile.leaderboard.sub")}</span>
              </button>
            )}

            {/* 4 · Statistiken — Stripe AM (Logo-Ende). */}
            {onStats && (
              <button onClick={onStats} className={tileCls} style={tileSty} title={t("start.tile.stats")}>
                <Stripe c={AM} />
                <div className="flex items-center justify-between gap-1">{head(t("start.tile.stats"))}{arrow}</div>
                <span className="text-[11px] opacity-50">{t("start.tile.stats.sub")}</span>
              </button>
            )}
          </>); })()}
      </div>

      {/* Optionen + Tutorial — zwei ruhige Chips unter dem Grid (kein eigener Grid-Platz nötig). Das Tutorial
          steht bewusst hier und nicht als fünfte Kachel: es ist jederzeit wiederholbar, aber kein Dauerziel.
          Feedback bekommt eine EIGENE Zeile darunter: die beiden oberen Chips führen ins Spiel, der
          Melder führt heraus. Nebeneinander lasen sich alle drei wie eine Reihe gleichrangiger Knöpfe. */}
      <div className="grid gap-2 justify-items-center">
        <div className="flex items-center gap-2">
          {onOptions && (
            <button onClick={onOptions} aria-label={t("start.options")} className={chipCls} style={chipSty}>{t("start.options")}</button>
          )}
          {canTutorial && (
            <button onClick={onTutorial} aria-label={t("start.tutorial")} className={chipCls} style={chipSty}>{t("start.tutorial")}</button>
          )}
        </div>
        {/* #396 Feedback-Melder — bewusst „Feedback" und nicht „Bug melden": sonst kommen nur Bugs
            und keine Ideen. Nur hier im Menü, nie im Lauf. Daneben das Discord-Icon (Community-Invite). */}
        <div className="flex items-center gap-2">
          {onFeedback && (
            <button onClick={onFeedback} aria-label={t("start.feedback")} className={chipCls} style={chipSty}>{t("start.feedback")}</button>
          )}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
            aria-label={t("start.discord")} title={t("start.discord")}
            className="p-2 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center justify-center"
            style={{ ...chipSty, color: DISCORD_BLURPLE }}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.419-2.157 2.419z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Lokaler Nickname (#14). */}
      {onEditName && (
        <button onClick={onEditName} className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1">
          {username
            ? <>{t("start.name.signedIn")} <b style={{ color: CY }}>{username}</b> · {t("start.name.change")}</>
            : <>{t("start.name.set")}</>}
        </button>
      )}

      {/* PWA · „Zum Startbildschirm hinzufügen" — kleiner Link zwischen Nickname und Versionsstempel (nur wenn relevant). */}
      <PwaInstall />

      {/* #datenschutz — der DAUERHAFTE Einstieg zum Hinweis. Bewusst hier im Fuß und nicht als Chip neben
          Feedback/Discord: die beiden dort sind Angebote („mach mit"), das hier ist Nachschlagewerk. Wer
          es sucht, sucht ganz unten. Die anderen beiden Einstiege sitzen dort, wo entschieden wird —
          in der Telemetrie-Zeile der Optionen und im Namens-Dialog beim Erststart. */}
      {onPrivacy && (
        <button onClick={onPrivacy} className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1 underline underline-offset-2">
          {t("privacy.link")}
        </button>
      )}

      {/* #250 Versions-/Build-Stempel unten — nach jedem Push sichtbar, ob er gelandet ist (+ Umgebung + kurze SHA). */}
      <div className="text-[10px] font-mono opacity-40 tracking-wide select-text" title={t("start.version.title")}>{VERSION_FULL}</div>
    </div>
  );
}
