// 🏆 Bestenliste — drei Reiter (#385: „Meine Runs" raus, die eigenen Läufe stehen in der Statistik):
//  · Diese Woche — WOCHEN-Ranked: alle spielen den Seed der Woche; das Board zeigt die aktuelle Woche
//                  (board=meister + seed=Wochen-Seed). Teilnahme frei bei allen Decks + je ≥1 Lauf, ansehen jederzeit.
//  · Challenger  — Hall of Champions: Platz 1 jeder abgelaufenen Woche (1 pro Woche).
//  · Regeln      — Modus-Baseline + voller Modifikator-Katalog + Ausschluss-Paare.
import { useState, useMemo, useEffect } from "react";
import { RankIcon } from "./RankIcon.jsx"; // #pokal-eins: Ranglisten-Zeichen, geteilt mit dem Startbildschirm
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { useTabSwipe } from "./useSwipeTabs.js"; // Reiterwechsel per Swipe (nur Funktion, keine Optik)
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { fmtScore } from "./format.js";
import { leaderboardConfigured, fetchBoardTop } from "../game/leaderboard.js";
import { currentWeek, pastWeeks, msUntilWeekEnd } from "../game/weeklySeed.js";
import { formatSeed } from "../game/rng.js";
import { rankedUnlocked } from "../game/progression.js";
import { BASE_REROLLS, LEG_PHASE_CYCLE } from "../game/constants.js"; // Baseline-Zahlen aus dem Code, nicht im Text gepflegt
import { WEEK_MOD_BY_ID, WEEK_MOD_PAIRS, pickWeekMods } from "../game/weekMods.js"; // #370 Wochen-Modifikatoren
import { WeekModChips, catalogDisplayMods, pickedDisplayMods, MOD_POS, MOD_NEG } from "./WeekMods.jsx"; // #381 gemeinsame Chip-Anzeige
import { MODAL_CARD, ModalHairline, ActionButton } from "./modalStyle.jsx";
import { t as tr } from "../i18n/index.js"; // #sprache (tr = Alias: `t` ist hier lokal der Reiter)

const TOP_N = 20;
const CHAMP_WEEKS = 10; // so viele abgelaufene Wochen zeigen wir im Champions-Archiv
const GOLD = "#d4a63a";  // Champion-Score (Wert-Signal, bleibt)
/* #deckui: Generische UI-Chrome (Reiter-Akzent, Wochen-Box, „Spielen"-Button) zieht die aktive DECKFARBE. Fallback =
   alter Ton, wenn kein Deck aktiv. BEWUSST NICHT getönt: Wochen-Mod-Chips (grün/rot = pos/neg), Champion-Medaillen,
   Rang-Medaillen — die tragen Bedeutung. Vars kaskadieren von .app-root (auch außerhalb eines Laufs gesetzt). */
const UI1 = "var(--deck-a1, #9b82f0)";
const deckMix = (pct) => `color-mix(in srgb, var(--deck-a1, #9b82f0) ${pct}%, transparent)`;
/* Reiter-Akzent (aktiver Zustand) → alle auf Deckfarbe (nur der aktive Reiter zeigt ihn, einer zur Zeit).

   #global ZWEI REITERSÄTZE, ein Bildschirm. Die beiden Hub-Einstiege wollten dasselbe Fenster für zwei
   verschiedene Aufgaben — bis hierher öffneten sie es sogar identisch:
     mode="ranked"  Ranglisten-Knopf: hier SPIELT man. Woche mit Seed, Modifikatoren, Spielen-Knopf, Regeln.
                    Unverändert gegenüber vorher.
     mode="board"   Kachel „Bestenliste": hier SCHAUT man NACH. Global (allzeit, alle Casual-Läufe) ·
                    Woche (nur die Platzierung) · Challenger. Kein Spielen-Knopf, keine Regeln — beides
                    liegt einen Klick weiter beim Ranglisten-Knopf, wo es hingehört.
   Der Wochen-Reiter behält in BEIDEN Sätzen die id "meister" — sie ist zugleich der Board-String der
   Datenbank und der Wert, den App.jsx als `initialTab` hereinreicht. */
/* `subKey` erscheint NUR ab 1280 px als Zweitzeile der Navigationsspalte (unter 1280 px sind es Reiter, dort
   ist kein Platz). „week" ist der Sonderfall: die Zeile ist dynamisch und kommt aus `board.weekLabel`. */
const TABS_RANKED = [
  { id: "meister",    labelKey: "board.tab.week",       subKey: "week",                    accent: UI1 },
  { id: "champions",  labelKey: "board.tab.challenger", subKey: "board.nav.champions.sub", accent: UI1, icon: true },
  { id: "regeln",     labelKey: "board.tab.rules",      subKey: "board.nav.rules.sub",     accent: UI1 },
];
const TABS_BOARD = [
  { id: "global",     labelKey: "board.tab.global",     subKey: "board.nav.global.sub",    accent: UI1 },
  // Kurzform „Woche": vier Zeichen weniger als „Diese Woche" — bei drei gleich breiten Reitern auf einem
  // 390-px-Handy bricht die lange Fassung neben „Challenger" um.
  { id: "meister",    labelKey: "board.tab.weekShort",  subKey: "week",                    accent: UI1 },
  { id: "champions",  labelKey: "board.tab.challenger", subKey: "board.nav.champions.sub", accent: UI1, icon: true },
];
// #385 Regeln-Reiter — jeder Modifikator VOLL AUSGESCHRIEBEN in einem eigenen Rahmen (keine Chips), getrennt nach
//   positiv/negativ; darunter die Ausschluss-Paare.
function ModBox({ m }) {
  const c = m.sign === "pos" ? MOD_POS : MOD_NEG;
  /* #lb-premium: Der Spannenwert steht in fast jedem Modifikator-Text am Ende in Klammern („… +1 Wert (1–3)").
     Genau danach sucht man beim Vergleichen, deshalb zieht die breite Fassung ihn nach rechts an den Rand.
     Rein darstellend: greift die Klammer nicht, bleibt der Text unangetastet. */
  const spanne = /\s*\((\d+(?:\s*[–—-]\s*\d+)?)\)\s*$/.exec(m.text);
  const text = spanne ? m.text.slice(0, spanne.index) : m.text;
  return (
    <div className="lb-mod rounded-lg px-3 py-2" style={{ background: "#17161f", border: `1px solid ${c}44`, "--c": c }}>
      <span className="lb-modicon as-deskonly" aria-hidden="true">{m.sign === "pos" ? "✚" : "⊘"}</span>
      <div className="lb-modtext">
        <div className="text-[12.5px] font-bold" style={{ color: c }}>{m.name}</div>
        <div className="text-[11.5px] opacity-80 leading-snug mt-0.5">{text}</div>
      </div>
      {spanne && <span className="lb-modspan as-deskonly ty-num-sm">{spanne[1]}</span>}
    </div>
  );
}
function RegelnPanel() {
  const catalog = catalogDisplayMods();
  const pos = catalog.filter((m) => m.sign === "pos");
  const neg = catalog.filter((m) => m.sign === "neg");
  const head = "text-[10px] font-bold uppercase tracking-wider";
  /* #desktop: Ab 1280 px stehen positive und negative Modifikatoren NEBENEINANDER (links/rechts) statt
     untereinander — die Liste ist 19 Kästen lang und war sonst eine Rolle. Die Klassen sind unter 1280 px
     tote Haken; die Reihenfolge im DOM bleibt die der Handy-Fassung. */
  return (
    <div className="rg-root text-[12px] leading-relaxed">
      <p className="rg-intro opacity-75 mb-3">{tr("board.rules.intro", { rerolls: BASE_REROLLS, legCycle: LEG_PHASE_CYCLE })}</p>
      <div className={`rg-h rg-h-pos ${head} mb-1.5`} style={{ color: MOD_POS }}>{tr("board.rules.pos")}</div>
      <div className="rg-pos grid gap-1.5">{pos.map((m) => <ModBox key={m.id} m={m} />)}</div>
      <div className={`rg-h rg-h-neg ${head} mt-3 mb-1.5`} style={{ color: MOD_NEG }}>{tr("board.rules.neg")}</div>
      <div className="rg-neg grid gap-1.5">{neg.map((m) => <ModBox key={m.id} m={m} />)}</div>
      <div className={`rg-h rg-h-pairs ${head} mt-3 mb-1.5 opacity-60`}>{tr("board.rules.pairs")}</div>
      <div className="rg-pairs grid gap-1 text-[11.5px] opacity-75">
        {WEEK_MOD_PAIRS.map((p) => (
          <div key={p.key}><b style={{ color: MOD_POS }}>{WEEK_MOD_BY_ID[p.pos].name}</b> ↔ <b style={{ color: MOD_NEG }}>{WEEK_MOD_BY_ID[p.neg].name}</b></div>
        ))}
      </div>
    </div>
  );
}

// Restzeit bis zum Wochen-Reset kompakt: „3t 5h 12m 40s".
function fmtCountdown(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return tr("board.countdown", { d, h, m, s });
}

// Seed-Code hübsch mit Trenner (4-3): „A7F39K2" → „A7F3-9K2".
const prettySeed = (seed) => { const c = formatSeed(seed); return `${c.slice(0, 4)}-${c.slice(4)}`; };

// Hall of Champions — je abgelaufener Woche der Platz 1 des Meister-Wochen-Seeds (client-seitig aus dem Board berechnet).
function ChampionsList({ reloadToken, username, onChampionWeeks }) {
  const [champs, setChamps] = useState(null); // null = lädt · [] = leer · [...] = Daten

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setChamps(null);
    const weeks = pastWeeks(new Date(), CHAMP_WEEKS);
    Promise.all(weeks.map((w) =>
      fetchBoardTop("meister", 1, w.seed)
        .then((rows) => (rows && rows[0] ? { ...w, name: rows[0].name, score: rows[0].score } : null))
        .catch(() => null)
    )).then((res) => {
      if (!alive) return;
      const list = res.filter(Boolean);
      setChamps(list);
      /* Freischalt-Trigger der gestuften Ranglisten-Decks: eigene Wochensiege zählen. Grundlage ist
         GENAU dieselbe Zeile, die das Archiv anzeigt (Platz 1 der abgelaufenen Woche) — der Abgleich
         läuft über den Anzeigenamen, weil das Board keine Spieler-id kennt. Der Zähler im Profil ist
         monoton, ein zu kurzes Fenster oder ein fehlgeschlagener Abruf nimmt also nichts weg. */
      const me = (username || "").trim();
      if (!me) return;
      const wins = list.filter((c) => (c.name || "").trim() === me).length;
      if (wins > 0) onChampionWeeks?.(wins);
    });
    return () => { alive = false; };
  }, [reloadToken, username, onChampionWeeks]);

  if (!leaderboardConfigured) return <div className="text-sm opacity-40 text-center py-6">{tr("board.champions.unavailable")}</div>;
  return (
    <>
      <div className="text-[11px] opacity-55 leading-relaxed mb-3">
        {tr("board.champions.intro")}
      </div>
      {champs === null ? (
        <div className="text-xs opacity-40 text-center py-3">{tr("board.champions.loading")}</div>
      ) : champs.length === 0 ? (
        <div className="text-xs opacity-40 text-center py-6">{tr("board.champions.empty")}</div>
      ) : (
        <div className="grid gap-1">
          {champs.map((c) => (
            <div key={`${c.year}-${c.week}`} className="flex items-center gap-2.5 text-sm px-2.5 py-1.5 rounded-lg"
              style={{ background: "#20202a", border: `1px solid ${deckMix(20)}` }}>
              <RankIcon className="as-rank-icon text-[15px]" />
              <span className="flex-1 min-w-0 truncate font-semibold">
                {c.name || "—"}<span className="text-[10px] opacity-45 ml-1.5">{c.labelShort}</span>
              </span>
              <span className="font-bold shrink-0 tabular-nums" style={{ color: GOLD }}>{fmtScore(c.score)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, onPlaySeed = null, onPlayRanked = null, profile = null, initialTab = "meister", username = "", onChampionWeeks = null, mode = "ranked" }) {
  useEscape(onClose);
  const boardMode = mode === "board";                 // #global: Nachschlage-Ansicht statt Spiel-Einstieg
  const TABS = boardMode ? TABS_BOARD : TABS_RANKED;
  // #385 Default-Reiter „Diese Woche" (meister); im Nachschlage-Modus führt „Global".
  const fallbackTab = boardMode ? "global" : "meister";
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : fallbackTab);
  const tabSwipe = useTabSwipe(TABS.map((t) => t.id), tab, setTab); // horizontaler Swipe → Reiterwechsel
  const [now, setNow] = useState(() => Date.now()); // Live-Ticker für den Wochen-Countdown

  // Sekundentakt nur, solange der Meister-Reiter offen ist (Countdown live).
  useEffect(() => {
    if (tab !== "meister") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);

  const week = useMemo(() => currentWeek(new Date(now)), [now]);
  const weekMods = useMemo(() => pickWeekMods(week.seed), [week.seed]); // #370 Wochen-Modifikatoren (seed-deterministisch)
  const canPlayRanked = rankedUnlocked(profile || {}); // #370: frei bei allen Decks + je ≥1 abgeschlossenem Lauf

  return overlayPortal((
    <div className="lb-root fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* #385 FESTE Kartenhöhe (nicht nur maxHeight) → das Fenster bleibt beim Tab-Wechsel gleich groß & an gleicher
          Stelle; nur die innere Liste scrollt. */}
      <div className="lb-card w-full max-w-lg rounded-2xl overlay-card as-panel as-panel-deck flex flex-col overflow-hidden"
        style={{ ...MODAL_CARD, height: "min(88vh, 760px)" }} onClick={(e) => e.stopPropagation()} {...tabSwipe}>
        <ModalHairline />
        <div className="lb-body p-5 sm:p-6 flex flex-col min-h-0 flex-1">
          <div className="lb-head flex items-center justify-between gap-3 mb-4 shrink-0">
            {/* #pokal-eins: der Pokal steht als VEKTOR im Markup, nicht mehr als 🏆 im Text. Grund wie am
                Ranglisten-Knopf (RankIcon.jsx): ein Emoji bringt seine eigene Farbe mit und steht quer zu
                einem Panel, das seine Töne aus dem aktiven Deck zieht. Nebeneffekt am Reiter unten: das
                Emoji zwang dort einen Umbruch und machte den Challenger-Reiter höher als seine Nachbarn. */}
            <h2 className="text-lg font-extrabold flex items-center gap-2"><RankIcon />{tr("board.title")}</h2>
            <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>{tr("common.close")}</ActionButton>
          </div>

          {/* #385 Reiter im Shop-/Upgrades-Stil: gleich breit (flex-1), aktiv = Akzentfarbe auf dunklem Grund. */}
          {/* #desktop: Ab 1280 px wird aus der Reiterzeile eine Navigationsspalte (wie im Upgrade-Baum) —
              dieselben Knöpfe, dieselbe Reihenfolge, nur untereinander und mit Zweitzeile. */}
          <div className="lb-tabs as-ring as-ring-quiet flex gap-1.5 mb-4 shrink-0" role="tablist">
            <i className="as-ring-run" aria-hidden="true" />
            {TABS.map(({ id, labelKey, subKey, accent, icon }) => {
              const on = tab === id;
              return (
                /* #kante: Signal an der Unterkante wie in Werkstatt und Upgrades — bei waagerechten
                   Reiterzeilen die passende Kante. Inaktive sind reiner Text, ohne Kasten. */
                <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                  className="flex-1 text-[13px] font-semibold tracking-wide px-3 pt-2 pb-1.5 rounded-t-md transition-all"
                  style={on
                    ? { color: "#fff", borderBottom: `2px solid ${accent}`,
                        background: `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${accent} 14%, transparent))` }
                    : { color: "#8a8a95", borderBottom: "2px solid transparent", background: "transparent" }}>
                  <span className="lb-tab-l flex items-center justify-center gap-1.5">{icon && <RankIcon />}{tr(labelKey)}</span>
                  <span className="lb-tab-s hidden dt:block">
                    {subKey === "week" ? tr("board.weekLabel", { week: week.week, year: week.year }) : tr(subKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* #lb-rahmen: Panel wie im Upgrade-Baum (`.up-page`) — Ring aussen, Scroller INNEN. Läge beides am
              selben Element, liefe die untere Ringkante beim Scrollen mitten durch die Liste (der Rahmen sitzt
              mit `inset: 0` im Inhaltsfluss). Der Wächter zählt die Klassennamen im Quelltext — deshalb steht
              hier keiner ausgeschrieben. Unterhalb 1280 px ist der Scroll-Wrapper `display: contents`, dort
              scrollt weiter das Panel selbst — die Handy-Fassung bleibt unverändert. */}
          <div className="lb-page as-ring as-ring-quiet rounded-xl p-4 flex-1 min-h-0 overflow-y-auto" style={{ background: "#141419", border: "1px solid #26262e" }}>
            <i className="as-ring-run" aria-hidden="true" />
            <div className="lb-pagescroll">
            {/* #global Allzeit-Board: alle CASUAL-Läufe (die Abfrage filtert Ranglisten-Zeilen weg), Baum-Pille an.
                Kein `board`-Prop → fetchGlobalTop statt fetchBoardTop. */}
            {tab === "global" && (
              leaderboardConfigured
                ? <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} onPlaySeed={onPlaySeed} showTree />
                : <div className="text-sm opacity-40 text-center py-8">{tr("board.unavailable")}</div>
            )}

            {tab === "meister" && (
              leaderboardConfigured ? (
                <>
                  {/* Kopf: aktuelle Woche + Live-Countdown bis Reset (So 23:59 UTC). */}
                  <div className="lb-weekhead flex items-baseline justify-between gap-2 mb-2.5">
                    <span className="lb-weektitle text-[14px] font-extrabold" style={{ color: UI1 }}>{tr("board.weekLabel", { week: week.week, year: week.year })}</span>
                    <span className="lb-weekcount text-[11px] opacity-60 tabular-nums">{tr("board.resetIn", { time: fmtCountdown(msUntilWeekEnd(new Date(now))) })}</span>
                  </div>
                  {/* #lb-premium: Drei Kontext-Kacheln — was diesen Lauf ausmacht, in einem Blick. Sie stehen NUR
                      im Wochen-Reiter (dort fällt die Entscheidung mitzuspielen) und nur ab 1280 px; darunter
                      trägt der Regeln-Reiter dieselbe Auskunft im Fließtext. */}
                  {!boardMode && (
                    <div className="lb-ctx as-deskonly">
                      {[["⌗", "seed"], ["⚖", "base"], ["♔", "arch"]].map(([g, k]) => (
                        <div key={k} className="lb-ctxtile">
                          <span className="lb-ctxicon" aria-hidden="true">{g}</span>
                          <span><b>{tr(`board.ctx.${k}.t`)}</b><i>{tr(`board.ctx.${k}.s`)}</i></span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* #global Nachschlage-Modus: nur die Platzierung. Seed, Modifikatoren und der Spielen-Knopf
                      stehen beim Ranglisten-Knopf im Menü — ein Weg zum Spielen, nicht zwei. */}
                  {boardMode && (
                    <div className="text-[11px] opacity-45 leading-snug mb-3">{tr("board.week.viewOnly")}</div>
                  )}
                  {/* #desktop — Klammer um das „Cockpit" (Seed · Spielen · Modifikatoren). Ab 1280 px steht es als
                      eigene Spalte NEBEN der Liste; unter 1280 px ist die Klammer `display: contents` und ändert nichts. */}
                  {!boardMode && (<div className="lb-cockpit">
                  {/* Seed der Woche + Spielen (bzw. gesperrt bis 13/13). #deckui: Box/Chip/Button in Deckfarbe. */}
                  <div className="rounded-xl px-3.5 py-3 mb-3" style={{ background: "linear-gradient(180deg,#17161f,#131218)", border: `1px solid ${deckMix(30)}` }}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="lb-seedlabel text-[9.5px] font-bold uppercase tracking-wider opacity-55">{tr("board.weekSeed")}</span>
                      <span className="lb-seed font-mono font-bold text-[15px] px-2.5 py-0.5 rounded tracking-wider" style={{ color: UI1, background: "#1c1b24", border: `1px solid ${deckMix(45)}` }}>{prettySeed(week.seed)}</span>
                    </div>
                    {/* #kante: war als einziger Knopf hier noch die volle Deckfarbe mit dunkler Schrift — die
                        Fassung von vor „Kante statt Fläche". Er ist das Ziel dieses Screens, also trägt er
                        dieselbe Kante wie der Start-Knopf im Menü (`as-cta-primary`: Deckfarbe links, dunkler
                        Grund, leiser Schein). Die Farbe kommt aus `--deck-a1`, das App.jsx zusätzlich auf
                        `:root` spiegelt — sie greift also auch hier im Body-Portal. */}
                    {canPlayRanked && (
                      <button onClick={onPlayRanked || undefined}
                        className="as-cta-primary w-full mt-3 rounded-lg font-extrabold text-[13px] px-4 py-2.5 cursor-pointer transition-transform hover:-translate-y-0.5">{tr("board.play")}</button>
                    )}
                    {!canPlayRanked && (
                      <div className="text-[11px] font-semibold mt-2 flex items-center gap-1.5" style={{ color: "#c9b98a" }}>
                        {tr("board.locked")}
                      </div>
                    )}
                  </div>
                  {/* #370/#381 Aktive Wochen-Modifikatoren (für alle gleich, seed-deterministisch).
                      Zwei Darstellungen, eine Quelle (`pickedDisplayMods`): am Handy die anklickbaren Chips,
                      ab 1280 px dieselben Modifikatoren AUSGESCHRIEBEN in den Kästen des Regeln-Reiters. Auf
                      420 px Spaltenbreite passt der volle Text — dann ist die Kurzform überflüssig, und man
                      muss für „was heißt Knapper Bau?" nicht mehr in den Regeln nachsehen. */}
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">{tr("board.weekMods")}</div>
                  <div className="mb-3 dt:hidden"><WeekModChips mods={pickedDisplayMods(weekMods)} /></div>
                  <div className="lb-modlist mb-3 hidden dt:grid gap-1.5">
                    {pickedDisplayMods(weekMods).map((m) => <ModBox key={m.id} m={m} />)}
                  </div>
                  </div>)}
                  <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} board="meister" seed={week.seed} onPlaySeed={onPlaySeed} hideHeader />
                </>
              ) : <div className="text-sm opacity-40 text-center py-8">{tr("board.unavailable")}</div>
            )}

            {tab === "champions" && <ChampionsList reloadToken={reloadToken} username={username} onChampionWeeks={onChampionWeeks} />}

            {tab === "regeln" && <RegelnPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  ));
}
