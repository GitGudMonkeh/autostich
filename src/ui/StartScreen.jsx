import { useState } from "react";
import { MuteButton } from "./MuteButton.jsx";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { currentWeek } from "../game/weeklySeed.js"; // #370: Wochennummer + Wochen-Seed für die Bonus-Anzeige
import { matchSecretSeed, ownedCount, nodeState, treeComplete, rankedUnlocked, NODES, TOTAL_NODES, ONBOARDING_LINKS, SP_LOYALTY_EVERY } from "../game/progression.js"; // Test-Codes + Hub-Progressionsanzeige
import { GlossaryPanel } from "./Glossary.jsx";
import { rarityLabel, deckDef, battlefieldDef, globalFxDef } from "../i18n/labels.js"; // Raritäts-/Kosmetik-/Effekt-Namen: EINE Quelle, übersetzt (Sprachprüfung C1)
import { VERSION_FULL } from "./version.js"; // #250: Versions-/Build-Stempel, seit 16.08.2026 direkt unter der Marke
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

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onSecretSeed = null, onRankedBoard = null, onOptions, onStats, onCustomize, onLeaderboard = null, onUpgrades = null, onTutorial = null, onFeedback = null, onPrivacy = null, tutorialDone = false, profile = null, muted, onToggleMute, username = "", onEditName,
  // #desktop — Zutaten für Status-Tafel und Deck-Hintergrund. Beide erscheinen erst ab 1400 px;
  // darunter bleiben die Props ungenutzt.
  deckId = null, bfId = null, deckBack = null, lastRun = null, battlefield = null,
  musicTitle = null, onMusicNext = null, activeFx = null }) {
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
  /* #370 Wochen-Anzeige an der Ranglisten-Kachel: Nummer der laufenden Woche + ob der Wochenbonus noch offen ist.
     Die Bonus-Regel steht in storage.js (recordRun): die ERSTE abgeschlossene Ranked-Runde je Woche zahlt
     +5 SP & +5 DP (bei vollem Baum +10 DP) und schreibt den Wochen-Seed nach `lastRankedWeekSeed`. Genau dieser
     Vergleich ist deshalb die ganze Wahrheit über „schon geholt oder nicht" — die Anzeige leitet sich davon ab
     und hat KEINEN eigenen Zähler, der auseinanderlaufen könnte.
     Ranked-Läufe starten auf dem Wochen-Seed (App.jsx startRankedRun), darum ist der Vergleich mit currentWeek()
     exakt und nicht nur ungefähr. Bewusst ohne useMemo: currentWeek() ist ein paar Rechenschritte, und so ist die
     Nummer über einen Wochenwechsel hinweg in einer langen Sitzung immer aktuell. */
  // #desktop — Namen für die Status-Tafel, einmal aufgelöst (beide Leser sind übersetzte Register).
  const deckName = deckId ? deckDef(deckId).name : "";
  const bfName = bfId ? battlefieldDef(bfId).name : "";
  /* Namen der ausgerüsteten Effekte. Zwei Register: Katalog-Effekte über `globalFxDef`, synthetische
     Sieg-Finisher über `fxsyn.<key>.name` (die haben bewusst keinen GLOBAL_FX-Eintrag). Aufgelöst wird
     hier und nicht in App.jsx, damit ein Sprachwechsel die Zeile neu rendert. */
  const fxNames = (activeFx || [])
    .map((f) => (f.syn ? t(`fxsyn.${f.key}.name`) : globalFxDef(f.key)?.name))
    .filter(Boolean);
  const week = currentWeek(new Date());
  const weekBonusOpen = (prof.lastRankedWeekSeed ?? null) !== week.seed;
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


  /* #trichter (Variante D): Breite IST die Rangordnung. Vorher lief jeder Block randlos von Kante zu Kante —
     damit war Breite als Signal verbraucht: nichts konnte wichtiger aussehen, weil alles schon das Maximum hatte.
     Jetzt drei Stufen, von oben nach unten enger. Das Auge läuft den Trichter von selbst nach unten, und es
     braucht dafür keine zusätzliche Farbe.

       lead  100 %  Bonus-Leiste · Tutorial-Angebot · Start-Knopf   — das Ziel, breiteste Stufe
       mid    94 %  Rangliste                                       — Angebot, aber nicht der Standardweg
       tail   88 %  Verwaltungs-Kacheln                             — nachschlagen, nicht spielen

     Die Chips und der Fuß darunter sind ohnehin inhaltsbreit und setzen den Trichter von selbst fort.

     Warum die Leiter bei 88 % endet und nicht tiefer: Die Kacheln sind zweispaltig, jede Stufe halbiert sich
     also im Text. Gemessen auf 375 px (iPhone SE) bricht ab 86 % die ÜBERSCHRIFT „Deck workshop" um — eine
     umbrechende Kachel-Überschrift liest sich als Fehler, nicht als Gestaltung, und kostete zusätzlich 22 px
     Höhe. 88 % ist die letzte Stufe, auf der beide Viewports sauber bleiben (390 px ganz, 375 px bis auf die
     zweizeilige Unterzeile „Global high scores", +3 px). Wer die Stufe vertiefen will, muss vorher an den
     Kacheltexten oder ihrem Innenabstand arbeiten — nicht an der Prozentzahl. */
  /* #desktop: Ab 1400 px trägt die BREITE die Rangordnung nicht mehr — dort steht der Trichter in einer
     eigenen Spalte, und Rangordnung entsteht über Größe, senkrechte Position und Leuchtkraft. Alle drei
     Bahnen laufen deshalb auf volle Spaltenbreite. Die abgemessenen Handy-Werte (100/94/88 %, gegen ein
     iPhone SE geprüft) bleiben unangetastet — die Desktop-Stufe überschreibt sie nur oberhalb. */
  const LANE_DESK = "min-[1400px]:w-full min-[1400px]:max-w-none";
  const LANE_LEAD = `w-full max-w-sm ${LANE_DESK}`;
  const LANE_MID  = `w-[94%] max-w-sm ${LANE_DESK}`;
  const LANE_TAIL = `w-[88%] max-w-sm ${LANE_DESK}`;

  /* Sekundär-Navigation als ruhige Chip-Reihe.
     #desktop: 17 px auf 44 px Höhe — damit erfüllen die Chips oberhalb von 1400 px die Mindest-Klickzielgröße.
     #kante: Seit 17.08.2026 in der Kanten-Familie (index.css) — eckig statt Pille, dünne neutrale Kante links,
     Grund und Rahmen exakt die der neutralen Knöpfe. Vorher war ihr Grund (#20202a) heller als der neue
     Standard, dadurch stachen sie hervor, obwohl sie der leiseste Rang der Seite sind. */
  const chipCls = "as-edge-neutral as-edge-thin px-3.5 py-1.5 min-[1400px]:px-5 min-[1400px]:py-[11px] rounded-lg text-sm min-[1400px]:text-[17px] font-medium transition-all hover:-translate-y-0.5";

  // Farb-Hierarchie: nur EINE gefüllte Primär-Aktion, der Rest als Outline (weniger Farbwände, luftiger).
  // Läuft ein Run → „Fortsetzen" ist die helle Primär-Aktion, „Normaler Lauf" wird zum Cyan-Outline.
  const hasResume = !!(onResume && resume);
  /* Cyan-Primär-Optik (hell, mit kräftigem Cyan-Glow) — geteilte Quelle für „Lauf fortsetzen" UND „Normaler
     Lauf", wenn dieser (ohne laufenden Run) selbst die Primär-Aktion ist → beide glühen identisch.
     #knopf-relief (F): war eine flache Fläche (#5fe0f7 + Glow). „Zu breit" war in Wahrheit „zu flach" — ein
     358 px breites Rechteck stört, eine 358 px breite TASTE nicht. Deshalb Licht von oben: Verlauf hell→dunkel,
     eine helle Kante an der Oberseite und ein dunkler Fuß unten. Maße bleiben unangetastet, nur die Form entsteht.
     #desktop: Die Werte sind nach index.css gewandert (`.as-cta-primary` / `.as-cta-ghost`). Grund: ab 1400 px
     ziehen die Knöpfe ihre Farbe aus dem aktiven Deck, und ein inline-style ließe sich davon nicht
     überschreiben. Auf dem Handy liefern die Klassen exakt dieselben Farben wie vorher. */
  const normalCls = hasResume ? "as-cta-ghost" : "as-cta-primary";

  /* #kopf-kompakt (16.08.2026): Der Startbildschirm brauchte auf einem iPhone 14 Pro 865 px bei 664 px
     Sichtfläche — man musste scrollen, um „Normaler Lauf" überhaupt zu sehen. Der Abstand lag über NEUN
     Lücken verteilt, jede für sich unauffällig; erst die Summe tat weh. Alles hier ist gemessen (Playwright
     gegen den Preview-Build), nicht geschätzt.

     Die beiden Schrauben sind bewusst getrennt:
     - `gap` = Luft ZWISCHEN den Knöpfen. Sie ist Gestaltung und wurde auf Wunsch wieder auf 10 px erhöht.
     - `pt/pb` = Polster der SEITE zum Rand. Das ist kein Rhythmus, sondern Rest — hier wurde geholt, was
       zum scrollfreien Bildschirm fehlte (5→2/3→0/1). Wer hier wieder auflockert, verliert genau das.

     Achtung, knappe Kante: mit pt-0/pb-1 landet die Seite auf einem 390×664-Viewport bei GENAU 664 px, also
     ohne Reserve. Kommt eine Zeile dazu, scrollt sie sofort wieder — dann nicht am Polster drehen (da ist
     nichts mehr), sondern an einem Baustein. */
  return (
    /* `hub-root`: der senkrechte Rhythmus der Desktop-Fassung steht in index.css, weil er von ZWEI
       Bedingungen abhängt (Breite ≥ 1400 UND Fensterhöhe) — als Tailwind-Variante wäre das nicht lesbar. */
    <div className="hub-root relative isolate flex flex-col items-center gap-2.5 pt-0 pb-1">
      {/* Ambient-Glow hinter der Wortmarke. Verankert die ganze Kopfzone farblich, ohne laute Flächen.
          #desktop: skaliert mit, sonst bliebe er auf 1920 px ein kleiner Fleck über einer breiten Bühne.
          #logo: Die drei Ellipsen stehen seit 17.08.2026 in index.css unter `.as-wm-glow` — bis 1400 px im
          Logo-Dreiklang (Cyan · Violett · Amber), darüber in den Deckfarben, genau wie die Marke selbst.
          Als Klasse statt inline, weil ein inline-style keine Media Query kennt.
          Der weiche Auslauf (Farbe → halb → 0) plus blur(30px) löst den Glow kantenlos in den Grund auf —
          ohne die Falloff-Kurve zeichnete sich die Rechteckkante der Fläche ab. */}
      <div aria-hidden="true" className="as-wm-glow pointer-events-none absolute inset-x-0 top-0 h-[380px] min-[1400px]:h-[620px] -z-10"
        style={{ filter: "blur(30px)" }} />

      {/* Ecken-Buttons als konsistentes Paar: Schnell-Mute oben LINKS, Glossar (Info) oben RECHTS — beide
          gleich gestylte dunkle Rounded-Pills, mit Rahmen-Inset (top-2 / left-2·right-2) statt in die Ecke gedrängt.
          Der Info-Button überschreibt den Kreis-Default (gloss-i-btn) auf denselben Pill-Look wie Mute. */}
      {/* #desktop — Deck-Hintergrund als BODENBAND (erst ab 1400 px).
          Bewusst kein Vollbild: die 40 Spielfelder sind 1600 × 640, also 2,5 : 1 — genau die Proportion
          dieses Fensters. Sie passen ohne Beschnitt hinein und werden nur 1,2× hochskaliert. Ein Vollbild
          bräuchte 1,69× und schnitte 29 % der Breite ab; nachgemessen im Entwurfsdokument, und genau
          deshalb bleiben die Bestandsbilder unangetastet.
          Oben ausgeblendet (Maske) → die Kopfzone bleibt dunkel, die Wortmarke steht frei. Darüber ein nach
          unten dichter werdender Schleier: er bringt 40 unterschiedlich helle Spielfelder gemeinsam unter
          die Kontrastforderung und ist die eine Stellschraube, falls ein Deck zu laut wird.
          `fixed` statt `absolute`: der Startbildschirm sitzt in einem auf 1520 px gedeckelten Container —
          absolut positioniert wäre das Band genauso breit und läge als Rechteck mitten im Bild statt als
          Hintergrund. Ein Hintergrund muss randlos laufen, und scrollen tut hier nichts. */}
      {battlefield && (
        <div aria-hidden="true" className="hidden min-[1400px]:block pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[768px]">
          <img src={battlefield.desktop} alt="" draggable="false"
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{ WebkitMaskImage: "linear-gradient(180deg,transparent 0%,#000 30%)", maskImage: "linear-gradient(180deg,transparent 0%,#000 30%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,rgba(20,20,25,0) 0%,rgba(17,17,22,.55) 45%,rgba(17,17,22,.82) 100%)" }} />
        </div>
      )}

      {/* #desktop: die beiden Ecken lösen sich vom 384-px-Stapel und rücken an die Kante der breiten Bühne. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="absolute top-2 left-2 min-[1400px]:top-0 min-[1400px]:left-0" />}
      <GlossaryPanel className="absolute top-2 right-2 min-[1400px]:top-0 min-[1400px]:right-0"
        style={{ width: "auto", height: "auto", borderRadius: "0.5rem", padding: "0.375rem 0.75rem",
          background: "#20202a", border: "1px solid #30303a", color: "#b3a8ff",
          fontFamily: "inherit", fontStyle: "normal", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1 }} />

      {/* #desktop — ab hier das Spaltenpaar: links spielen, rechts der Stand. Unterhalb von 1400 px sind
          `hub-pair`/`hub-play`/`hub-stand` per `display: contents` reine Klammern ohne eigene Box, die
          Flex-Spalte darüber ordnet also weiterhin alle Bausteine direkt — Handy-Reihenfolge unverändert. */}
      <div className="hub-pair">
      <div className="hub-play">
      {/* #logo — Wortmarke als Text (Orbitron) statt logo-wordmark.png: das PNG hatte eine feste Palette und
          stand damit quer zu jeder Deckfarbe, seit der Desktop-Pass den Hub aus dem aktiven Deck einfärbt.
          Look, Größe und Verlauf stehen in index.css unter `.as-wordmark`. Der Text kommt weiter aus dem
          i18n-Katalog — der Key hieß zu PNG-Zeiten „alt", trägt jetzt die sichtbare Marke (in beiden
          Sprachen „AUTOSTICH", deshalb in der SAME_OK-Liste der i18n-Guards). */}
      <h1 className="as-wordmark select-none">{t("start.logo.alt")}</h1>
      {/* #250 Versions-/Build-Stempel — steht seit 16.08.2026 HIER statt ganz unten. Vorher trug diese Zeile
          den Untertitel („Roguelite-Autobattler-Stechspiel · Prototyp"); der erklärte niemandem etwas, der das
          Spiel ohnehin schon offen hat, und der Stempel war unter Nickname, PWA-Link und Datenschutz-Zeile
          faktisch unsichtbar. Genau ihn braucht man aber am häufigsten: nach jedem Push die Frage „ist mein
          Stand drauf?". Direkt unter der Marke ist er ohne Scrollen lesbar.

          Das goldene v-Banner an der Wortmarke ist ersatzlos weg. Es saß als absolutes Overlay über der
          Unterkante der Marke, kostete den Kopf diesen Überhang — und nannte mit „v0.4" ohnehin nur den
          Anfang dessen, was der Stempel daneben vollständig trägt. Eine Zeile, eine Versionsangabe.

          #logo: Das frühere `-mt-3` ist raus. Es zog die Zeile in den transparenten Rand des PNG hinein;
          die Text-Wortmarke hat diesen Rand nicht, dort saß die Zeile dann auf der Unterkante der Marke.
          Höhe kostet das nichts — der Text baut ohnehin gut 30 px niedriger als das Bild. */}
      <div className="text-[10px] font-mono opacity-40 tracking-wide select-text mt-0.5 min-[1400px]:mt-1" title={t("start.version.title")}>{VERSION_FULL}</div>

      {/* Fortschritts-/Bonus-Leiste — ein Element, zwei Leben: Onboarding (bis 6/6), danach SP-Treue-Drip.
          Frosted-Glass: halbtransparenter Grund (das Kopf-Glühen blutet oben ins Panel → weicher Übergang statt
          harter Kante) + Hairline-Border + Backdrop-Blur (Text bleibt scharf). */}
      <div className={`${LANE_LEAD} rounded-xl px-4 py-2.5 min-[1400px]:px-5 min-[1400px]:py-3.5 flex flex-col gap-1.5 min-[1400px]:gap-2`}
        style={{ background: "rgba(23,23,28,0.5)", border: "1px solid rgba(150,150,170,0.10)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between gap-3">
          {onbDone ? (
            <span className="text-[12.5px] min-[1400px]:text-[17px] font-semibold opacity-90" style={{ color: SP }}>{t("start.progress.bonus", { cur: t(progLigaFree ? "common.cur.dp" : "common.cur.sp") })}</span>
          ) : (
            <span className="text-[12.5px] min-[1400px]:text-[17px] font-semibold opacity-90" style={{ color: VI }}>{t("start.progress.onboarding")}</span>
          )}
          <span className="text-[11.5px] min-[1400px]:text-[15px] opacity-55 font-mono tabular-nums">
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
        <div className={LANE_LEAD}>
          <button onClick={onTutorial}
            className="as-tut-btn w-full px-5 py-3 min-[1400px]:px-6 min-[1400px]:py-4 rounded-lg text-base font-bold min-[1400px]:font-medium transition-all hover:-translate-y-0.5 flex flex-col items-center min-[1400px]:items-start leading-tight">
            <span className="text-[17px] min-[1400px]:text-[21px]">{t("start.tutorial.offer")}</span>
            <span className="text-[11px] min-[1400px]:text-[14px] font-semibold opacity-75">{t("start.tutorial.offer.sub")}</span>
          </button>
        </div>
      )}

      {/* Play-Gruppe — Fortsetzen + Normaler Lauf. Normaler Lauf klappt Normal (+ Dev Run) und das
          Seed-Feld auf → weniger Dauer-sichtbares im Haupt-Stapel. */}
      <div className={`${LANE_LEAD} flex flex-col gap-2.5`}>
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="as-cta-primary w-full px-5 py-3 min-[1400px]:py-4 rounded-2xl text-base font-bold min-[1400px]:font-medium transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight">
            <span className="text-[19px] min-[1400px]:text-[24px]">{t("start.resume")}</span>
            <span className="text-[11px] min-[1400px]:text-[14px] font-mono font-semibold opacity-80">
              {t("start.resume.sub", {
                cycle: Math.min((resume.cycle || 0) + 1, resume.totalCycles),
                total: resume.totalCycles,
                score: fmtNum(Math.round(resume.score || 0)),
              })}
            </span>
          </button>
        )}

        {/* #382 „Normaler Lauf" startet direkt (kein Aufklapper mehr). Gefüllt ohne Resume (= Held), sonst Cyan-Outline.
            Volle Breite: der Knopf ist die oberste Stufe des Breiten-Trichters (LANE_LEAD, s. o.) — die Rangordnung
            trägt jetzt die Breite der BLÖCKE, der Knopf selbst muss dafür nichts abgeben.
            Das Relief (#knopf-relief) nimmt ihm das Flächenhafte, ohne dass etwas daneben stehen muss. */}
        <button onClick={onStart}
          className={`${normalCls} w-full px-5 py-3.5 min-[1400px]:py-5 rounded-2xl text-base min-[1400px]:text-[26px] font-bold min-[1400px]:font-medium transition-all hover:-translate-y-0.5 flex items-center justify-center`}>
          {t("start.normal")}
        </button>
        {/* #382 Seed-Zeile dauerhaft unter „Normaler Lauf": Seed einfügen + „↻ Spielen" (inkl. Test-Code-Pfad
            tryPlaySeed). Zwischenzeitlich hing sie an einem Satelliten-Knopf neben dem CTA — zurückgebaut: der
            Seed gehört unter den Knopf, zu dem er die Variante ist, nicht daneben. Radius eine Stufe unter dem
            CTA (xl statt 2xl), damit die Zeile sichtbar zweite Geige spielt. */}
        {onPlaySeed && (
          <div>
            <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
              <input
                value={seedInput}
                onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
                placeholder={t("start.seed.placeholder")}
                aria-label={t("start.seed.aria")}
                className="flex-1 min-w-0 px-3 py-2 min-[1400px]:px-4 min-[1400px]:py-3 rounded-xl text-sm min-[1400px]:text-[18px] font-mono tracking-wide"
                style={{ background: "#141419", border: `1px solid ${seedError ? "#e06a6a" : "#2a2a33"}`, color: "#cfcfd6" }}
              />
              <button type="submit" disabled={!seedInput.trim()}
                className="shrink-0 px-3.5 py-2 min-[1400px]:px-4 min-[1400px]:py-3 rounded-xl text-sm min-[1400px]:text-[18px] font-semibold min-[1400px]:font-medium transition-all disabled:opacity-40"
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
        <div className={`${LANE_MID} flex flex-col gap-2.5`}>
          <button onClick={onRankedBoard}
            className="as-ranked-btn relative w-full px-5 py-2.5 min-[1400px]:px-6 min-[1400px]:py-4 rounded-lg text-[14px] min-[1400px]:text-[20px] font-bold min-[1400px]:font-medium transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            title={t(rankedFree ? "start.ranked.open" : "start.ranked.locked")}>
            <span>{rankedFree ? "🏆" : <span className="opacity-70">🔒</span>} {t("start.ranked")}</span>
            {/* #370 Wochen-Ecke: Nummer der laufenden Woche, darunter der offene Wochenbonus.
                - `inset-y-0 justify-center` statt `top-1.5`: der Block ist jetzt zweizeilig und soll mittig zum
                  Knopf-Label stehen. Absolut positioniert → er kann den Knopf nicht höher machen.
                - `textShadow: none` hebt den CRT-Glow der .font-pixel-Regel (index.css) für DIESE Stelle auf.
                  Der Glow überstrahlt die dünnen Press-Start-2P-Striche; bei „Woche" allein ging das gerade noch,
                  mit einer Zahl dahinter wurde es unlesbar. Der Glow bleibt überall sonst unangetastet.
                - Die Bonus-Zeile läuft in der System-Mono, nicht im Pixel-Font: Press Start 2P ist rund doppelt so
                  breit und würde in die Knopf-Mitte hineinragen.
                - Ist der Bonus geholt, verschwindet die Zeile ersatzlos (kein „1/1"): eine Belohnung, die es diese
                  Woche nicht mehr gibt, soll nicht weiter Platz und Aufmerksamkeit binden. */}
            <span className="absolute inset-y-0 right-2 min-[1400px]:right-4 flex flex-col justify-center items-end gap-0.5 pointer-events-none"
              aria-label={t("start.ranked.badge.aria", { n: week.week })}>
              <span className="px-1 min-[1400px]:px-1.5 min-[1400px]:py-0.5 rounded text-[9px] min-[1400px]:text-[12px] font-bold font-pixel leading-tight"
                style={{ background: "#241d3a", color: VI, textShadow: "none" }}>
                {t("start.ranked.badge", { n: week.week })}
              </span>
              {/* #desktop: Auf breiten Bildschirmen entfällt die Bonus-Zeile am Knopf — die Status-Tafel
                  rechts zeigt denselben Stand ausführlicher (Woche · 0/1 · „Bonus noch offen"). Zweimal
                  dieselbe Information nebeneinander ist keine Betonung, nur Rauschen. Unterhalb von
                  1400 px gibt es die Tafel nicht, dort bleibt die Zeile die einzige Quelle. */}
              {weekBonusOpen && (
                <span className="text-[9px] min-[1400px]:hidden font-semibold leading-tight tabular-nums" style={{ color: `${VI}c0` }}>
                  {t("start.ranked.bonus", { have: 0, max: 1 })}
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Variante C — Verwaltungszone als ruhiges, einheitliches 2×2-Kachel-Grid (Werkstatt · Upgrades ·
          Bestenliste · Statistik). Statt vieler unterschiedlich lauter Blöcke: gleich große Kacheln, deren
          EINZIGES Farbsignal ein dünner Stripe an der linken Kachel-Seite ist. Die vier Stripes folgen in
          Lesereihenfolge (TL→TR→BL→BR) dem Logo-Verlauf CY → BLUE → VI → AM. Keine Icons — nur Titel, Stripe
          und (wo vorhanden) Kennzahl. Währungs-Zahlen (DP/SP) bleiben im Gold der Währung, unabhängig vom
          dekorativen Stripe. Gesperrt (Onboarding < 6/6): Kachel gedimmt + Countdown-Badge statt Kennzahl. */}
      {/* #desktop — Ende der Spiel-Spalte, Anfang der Stand-Spalte. */}
      </div>
      <div className="hub-stand">

      {/* #desktop — Status-Tafel. Erst ab 1400 px sichtbar (`hidden min-[1400px]:flex`), auf dem Handy also
          gar nicht im Layout. Sie beantwortet, was man vor dem Start wissen will: welches Deck aktiv ist,
          wie die Guthaben stehen, was die Woche noch hergibt und wie der letzte Lauf lief. Alle Werte
          stammen aus bereits vorhandenen Quellen — nichts davon wird hier neu berechnet. */}
      <div className="hidden min-[1400px]:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">
        <div className="font-pixel text-[10px] tracking-[.12em] opacity-45" style={{ textShadow: "none" }}>
          {t("start.board.title")}
        </div>
        <div className="flex items-center gap-4">
          {deckBack && (
            <img src={deckBack} alt="" draggable="false"
              className="w-[96px] h-auto rounded-lg select-none"
              style={{ border: "1px solid rgba(150,150,170,.25)", boxShadow: "0 6px 18px rgba(0,0,0,.55)" }} />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="text-[21px] font-bold truncate">{deckName}</div>
            {/* Die Spielfeld-Zeile erscheint NUR, wenn das Spielfeld nicht zum Deck gehört. Der Registername
                eines Spielfelds ist der Deckname plus Suffix („Biolumen · Battlefield") — im Normalfall stand
                hier also „Battlefield · Biolumen · Battlefield", dreimal dasselbe Wort für null Information.
                Sind Deck und Feld in der Werkstatt gemischt worden, sagt die Zeile dagegen etwas. */}
            {bfName && !bfName.startsWith(deckName) && (
              <div className="text-[14px] opacity-55 truncate">{t("start.board.field", { name: bfName })}</div>
            )}
            {/* Ausgerüstete Effekte, gleiche Zeilen-Optik wie das Spielfeld darüber. Ohne aktive Effekte
                entfällt die Zeile — „Effekte · —" wäre eine Zeile, die nichts sagt. */}
            {fxNames.length > 0 && (
              <div className="text-[14px] opacity-55 truncate" title={fxNames.join(" + ")}>
                {t("start.board.fx", { list: fxNames.join(" + ") })}
              </div>
            )}
            {/* #musik — Was gerade läuft, plus Weiterschalten. Sitzt hier und nicht als eigener Block, weil
                die Musik zum „Stand" gehört wie Deck und Spielfeld: alles, was der Screen gerade IST. */}
            {/* EIN gemeinsamer Rahmen um Titel und Knopf, und `self-start` statt voller Breite: Als
                gestreckte Zeile stand der Knopf ganz am Panelrand und las sich wie ein eigenes Element
                neben dem Titel. Zusammengefasst sind beide sichtbar EINE Sache — was läuft, und wie man
                weiterschaltet. Der Titel darf wachsen (`max-w`), der Kasten folgt ihm nur so weit. */}
            <div className="inline-flex self-start items-center gap-2 mt-1.5 min-w-0 max-w-full rounded-lg pl-2.5 pr-1 py-1"
              style={{ border: "1px solid rgba(150,150,170,.22)", background: "rgba(20,20,26,.45)" }}>
              <span className="text-[13px] opacity-40 shrink-0" aria-hidden="true">♪</span>
              <span className="text-[13px] opacity-60 truncate max-w-[260px]" title={musicTitle || undefined}>
                {musicTitle || "—"}
              </span>
              {onMusicNext && (
                <button onClick={onMusicNext} aria-label={t("music.next")}
                  title={musicTitle ? t("music.playing", { title: musicTitle }) : t("music.next")}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[13px] leading-none opacity-60 transition-all hover:opacity-100">
                  ⏭
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Vier Kennzahlen. Die Farben bleiben hier bewusst die BEDEUTUNGS-Farben (Gold = Währung,
            Violett = Rangliste, Cyan = Lauf) — die Tafel ist der Ort, an dem gelesen und nicht navigiert
            wird, und die Deckfarbe trägt hier ohnehin schon Rahmen, Schimmer und Kartenbild. */}
        <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden" style={{ background: "rgba(60,58,78,.5)", border: "1px solid rgba(60,58,78,.5)" }}>
          {[
            { k: t("start.board.sp"), v: progSp, c: SP, s: t("start.board.sp.sub", { done: progOwned, total: TOTAL_NODES }) },
            { k: t("start.board.dp"), v: progDp, c: AM, s: t("start.board.dp.sub") },
            /* Nur das Verhältnis als Kennzahl — das Wort „Bonus" stand vorher IN der großen Zahl und
               wiederholte damit, was die Unterzeile ohnehin sagt („Bonus noch offen"). Die Zeile darüber
               nennt die Woche, die darunter den Zustand; in der Mitte gehört die Zahl allein. */
            { k: t("start.board.week", { n: week.week }), v: t("start.board.week.val", { have: weekBonusOpen ? 0 : 1, max: 1 }), c: VI, s: t(weekBonusOpen ? "start.board.week.open" : "start.board.week.done") },
            { k: t("start.board.last"), v: lastRun ? fmtNum(Math.round(lastRun.score || 0)) : t("start.board.last.none"),
              c: CY, s: lastRun ? t("start.board.last.sub", { cycle: lastRun.cycles ?? 0 }) : t("start.board.last.none.sub") },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5 px-4 py-3.5" style={{ background: "rgba(22,22,32,.5)" }}>
              <span className="text-[13px] opacity-45">{s.k}</span>
              <span className="text-[30px] font-extrabold tabular-nums leading-none" style={{ color: s.c }}>{s.v}</span>
              <span className="text-[12px] opacity-40">{s.s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${LANE_TAIL} as-hub-list as-glass as-ring grid grid-cols-2 gap-2.5 min-[1400px]:grid-cols-1 min-[1400px]:gap-0`}>
        {/* Kachel-Basis: gleiche Höhe (justify-between), Stripe links absolut, keine Icons.
            #desktop: dieselben vier Ziele werden zur Liste — flex-row statt flex-col, kein eigener Rahmen
            je Kachel (Glas + Ring sitzen am Container), dafür ein Trenner (CSS `.as-hub-list`). Die Fläche
            kommt aus der Klasse `as-hub-tile` statt aus einem inline-style, sonst ließe sie sich oberhalb
            von 1400 px nicht auf Glas umstellen. */}
        {(() => { const tileCls = "as-hub-tile relative overflow-hidden rounded-xl text-left p-3 pl-4 min-h-[76px] flex flex-col justify-between transition-all hover:-translate-y-0.5"
            + " min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:gap-3 min-[1400px]:min-h-0 min-[1400px]:rounded-none min-[1400px]:py-4 min-[1400px]:pl-6 min-[1400px]:pr-5 min-[1400px]:hover:translate-y-0";
          const Stripe = ({ c, dim }) => (<span aria-hidden="true" className="as-hub-stripe absolute inset-y-0 left-0 w-[3px]"
            style={{ background: c, opacity: dim ? 0.45 : 1 }} />);
          const head = (t) => (<b className="text-[13.5px] min-[1400px]:text-[20px] tracking-tight">{t}</b>);
          const arrow = <span className="text-[13px] opacity-35 min-[1400px]:hidden">›</span>;
          // Nur Desktop: Untertitel je Eintrag + der Pfeil ganz rechts. `hidden` hält beide aus dem Handy-Flex heraus.
          const sub = (s) => (<span className="hidden min-[1400px]:block text-[13.5px] opacity-50 font-normal">{s}</span>);
          const arrowDesk = <span className="hidden min-[1400px]:block text-[20px] opacity-35">›</span>;
          const headBox = "flex items-center justify-between gap-1 min-[1400px]:flex-1 min-[1400px]:flex-col min-[1400px]:items-start min-[1400px]:gap-0.5";
          const lockBadge = (bg) => (<span className="self-start shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-pixel leading-tight whitespace-nowrap"
            style={{ background: bg, color: "#c9c9d2" }}>{t("start.tile.lock", { count: ONBOARDING_LINKS - onbStep })}</span>);
          return (<>
            {/* 1 · Upgrades (getauscht mit Deck-Werkstatt) — Stripe CY (Grid-Position TL, Logo-Verlauf bleibt). SP-Guthaben in Gold (bzw. „komplett"), „kaufbar"-Hinweis. Onboarding-Gate. */}
            {onbDone ? (
              <button onClick={onUpgrades || undefined} className={tileCls} title={t("start.tile.upgrades.title")}>
                <Stripe c={CY} />
                <div className={headBox}>
                  {head(t("start.tile.upgrades"))}
                  {progBuyable > 0
                    ? <span className="shrink-0 text-[9.5px] min-[1400px]:text-[12px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ border: `1px solid ${AM}66`, color: AM }}>{t("start.tile.upgrades.buyable", { n: progBuyable })}</span>
                    : arrow}
                  {sub(t("start.tile.upgrades.sub"))}
                </div>
                {progLigaFree ? (
                  <span className="text-[13px] min-[1400px]:text-[18px] font-extrabold" style={{ color: AM }}>{t("start.tile.upgrades.complete")}</span>
                ) : (
                  <span className="flex items-baseline gap-1">
                    <span className="as-hub-num text-[19px] min-[1400px]:text-[30px] font-extrabold tabular-nums">{progSp}</span>
                    <span className="as-hub-cur text-[10px] min-[1400px]:text-[14px] font-bold tracking-wider opacity-75">{t("common.cur.sp")}</span>
                    <span className="text-[10px] min-[1400px]:hidden opacity-45 tabular-nums ml-1">{progOwned}/{TOTAL_NODES}</span>
                  </span>
                )}
                {arrowDesk}
              </button>
            ) : (
              <div className={tileCls + " cursor-default opacity-60"} title={t("start.tile.upgrades.locked")}>
                <Stripe c={CY} dim />
                {head(t("start.tile.upgrades"))}
                {lockBadge("#20202a")}
              </div>
            )}

            {/* 2 · Deck-Werkstatt (getauscht mit Upgrades) — Stripe BLUE (Grid-Position TR, Logo-Verlauf bleibt). DP-Guthaben in Gold. Onboarding-Gate. */}
            {onCustomize && (onbDone ? (
              <button onClick={onCustomize} className={tileCls} title={t("start.tile.workshop")}>
                <Stripe c={BLUE} />
                <div className={headBox}>{head(t("start.tile.workshop"))}{arrow}{sub(t("start.tile.workshop.sub"))}</div>
                <span className="flex items-baseline gap-1">
                  <span className="as-hub-num text-[19px] min-[1400px]:text-[30px] font-extrabold tabular-nums">{progDp}</span>
                  <span className="as-hub-cur text-[10px] min-[1400px]:text-[14px] font-bold tracking-wider opacity-75">{t("common.cur.dp")}</span>
                </span>
                {arrowDesk}
              </button>
            ) : (
              <div className={tileCls + " cursor-default opacity-60"} title={t("start.tile.workshop.locked")}>
                <Stripe c={BLUE} dim />
                {head(t("start.tile.workshop"))}
                {lockBadge("#20202a")}
              </div>
            ))}

            {/* 3 · Bestenliste — Stripe VI (Violett = Wettbewerb/Rang, passt semantisch). */}
            {onLeaderboard && (
              <button onClick={onLeaderboard} className={tileCls} title={t("start.tile.leaderboard")}>
                <Stripe c={VI} />
                <div className={headBox}>{head(t("start.tile.leaderboard"))}{arrow}{sub(t("start.tile.leaderboard.sub"))}</div>
                <span className="text-[11px] min-[1400px]:hidden opacity-50">{t("start.tile.leaderboard.sub")}</span>
                {arrowDesk}
              </button>
            )}

            {/* 4 · Statistiken — Stripe AM (Logo-Ende). */}
            {onStats && (
              <button onClick={onStats} className={tileCls} title={t("start.tile.stats")}>
                <Stripe c={AM} />
                <div className={headBox}>{head(t("start.tile.stats"))}{arrow}{sub(t("start.tile.stats.sub"))}</div>
                <span className="text-[11px] min-[1400px]:hidden opacity-50">{t("start.tile.stats.sub")}</span>
                {arrowDesk}
              </button>
            )}
          </>); })()}
      </div>
      {/* #desktop — Ende der Stand-Spalte und damit des Spaltenpaars. */}
      </div>
      </div>

      {/* #desktop — Chips und Fußlinks laufen ab 1400 px als EIN Band über die volle Breite zusammen
          (Chips links, Nachschlage-Links rechts). Darunter bleiben es zwei gestapelte Blöcke wie bisher. */}
      <div className="hub-foot">

      {/* Optionen + Tutorial — zwei ruhige Chips unter dem Grid (kein eigener Grid-Platz nötig). Das Tutorial
          steht bewusst hier und nicht als fünfte Kachel: es ist jederzeit wiederholbar, aber kein Dauerziel.
          Feedback bekommt eine EIGENE Zeile darunter: die beiden oberen Chips führen ins Spiel, der
          Melder führt heraus. Nebeneinander lasen sich alle drei wie eine Reihe gleichrangiger Knöpfe. */}
      <div className="grid gap-2 justify-items-center min-[1400px]:grid-flow-col min-[1400px]:justify-items-start min-[1400px]:gap-3">
        <div className="flex items-center gap-2 min-[1400px]:gap-3">
          {onOptions && (
            <button onClick={onOptions} aria-label={t("start.options")} className={chipCls}>{t("start.options")}</button>
          )}
          {canTutorial && (
            <button onClick={onTutorial} aria-label={t("start.tutorial")} className={chipCls}>{t("start.tutorial")}</button>
          )}
        </div>
        {/* #396 Feedback-Melder — bewusst „Feedback" und nicht „Bug melden": sonst kommen nur Bugs
            und keine Ideen. Nur hier im Menü, nie im Lauf. Daneben das Discord-Icon (Community-Invite). */}
        <div className="flex items-center gap-2">
          {onFeedback && (
            <button onClick={onFeedback} aria-label={t("start.feedback")} className={chipCls}>{t("start.feedback")}</button>
          )}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
            aria-label={t("start.discord")} title={t("start.discord")}
            /* #kante: Der Discord-Knopf bleibt rund und behält sein Blurple — er trägt ein Logo, keinen Text,
               und ist damit kein Chip in der Reihe, sondern ein Ziel für sich. */
            className="as-edge-neutral p-2 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center justify-center"
            style={{ color: DISCORD_BLURPLE, borderLeftColor: "rgba(150,150,170,.18)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.419-2.157 2.419z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* #kopf-kompakt: Nickname, PWA-Link und Datenschutz standen als DREI eigene Zeilen untereinander —
          drei Textzeilen plus zwei Lücken für zusammen ein paar Wörter. Jetzt eine umbrechende Reihe.
          Inhaltlich ändert sich nichts: Es sind weiter dieselben ruhigen Fuß-Links, nur nebeneinander.
          (#14 Nickname · PWA „Zum Startbildschirm" · #datenschutz — der dauerhafte Einstieg zum Hinweis,
          bewusst im Fuß und nicht als Chip neben Feedback/Discord: die dort sind Angebote, das hier ist
          Nachschlagewerk. Die anderen beiden Einstiege sitzen dort, wo entschieden wird — Telemetrie-Zeile
          der Optionen und Namens-Dialog beim Erststart.) */}
      <div className="flex flex-wrap items-center justify-center min-[1400px]:justify-end gap-x-3 gap-y-1 min-[1400px]:gap-x-4">
        {onEditName && (
          <button onClick={onEditName} className="text-xs min-[1400px]:text-[14px] opacity-60 hover:opacity-100 transition-opacity">
            {username
              ? <>{t("start.name.signedIn")} <b style={{ color: CY }}>{username}</b> · {t("start.name.change")}</>
              : <>{t("start.name.set")}</>}
          </button>
        )}
        <PwaInstall />
        {onPrivacy && (
          <button onClick={onPrivacy} className="text-xs min-[1400px]:text-[14px] opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2">
            {t("privacy.link")}
          </button>
        )}
      </div>
      {/* #desktop — Ende des Fuß-Bandes. */}
      </div>
    </div>
  );
}
