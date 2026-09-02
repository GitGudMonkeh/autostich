import { rarityOf, RARITY_META, totalCritChanceRaw, hasCritPerk, baseScoreMultFor, zinsReadout } from "../game/perks.js";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { phaseCard, phasePanel, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx";
import { hasCritFamily } from "../game/families.js";
import { perkPhaseAt, LEG_PERK2_PHASE, DECISION_SCHEDULE } from "../game/constants.js"; // Legendär-Perk-Phase erkennen → eigener Reroll-Pool
import { tierMeta, romanOf, familyTierOf } from "../game/rarity.js";
import { familyDef, perkCat, perkDef, rarityLabel } from "../i18n/labels.js"; // #sprache: Raritätsname zur Anzeigezeit
import { t as tr, fmtNum } from "../i18n/index.js"; // tr = Alias: `t` ist hier lokal die Stufe
import { PerkList, DeckStrength } from "./BuildSummary.jsx";
import { DevPerkCatalog } from "./DevPerkCatalog.jsx"; // Dev-Run: Voll-Katalog statt Zufallsangebot
import { FormationPanel } from "./FormationPanel.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { CollapsibleField } from "./CollapsibleField.jsx"; // #UI: geteiltes klappbares Feld (auch in der Chronik)
import { HeldSkills } from "./HeldSkills.jsx"; // gehaltene Skills — dieselbe Liste wie in der Skill-Auswahl
import { useIsWide, useIsPhone } from "./useIsWide.js";
import { LevelupRig } from "./LevelupWings.jsx"; // #lv-fluegel: Deck links, Kennzahlen rechts (ab 1280 px)
import { perkArt } from "./perkArt.js"; // #perkart: Kategorie-Emblem bzw. eigenes Emblem (nur ab 1280 px gerendert)
import { CardCorners } from "./CardCorners.jsx"; // #cornerart: Eck-Ornamente im Kartenkopf
import { CORNER_PERK } from "./cornerArt.js";

// Legendär-Akzent: durchgehend gold (Rahmen, Ring, Badge, Titel) — Teil des Grau/Grün/Gold-Schemas (#71).
const LEG_GOLD = "#d4a63a";
const fmtMult = (x) => fmtNum(x.toFixed(2));

/* Ein Angebotseintrag → einheitliches Anzeige-Modell (Rarität #167 §8). Familie {familyId,tier} zeigt den
   Familiennamen mit römischer Stufe, die Stufenfarbe (grau/grün/blau/lila) und — bei bereits gehaltener
   niedrigerer Stufe — ein Upgrade-Badge mit „gehaltener Rang → Zielrang". Flacher Perk-String bleibt wie #71. */
function offerView(entry, familyTiers = {}) {
  if (entry && typeof entry === "object" && entry.familyId) {
    const fam = familyDef(entry.familyId);
    const t = entry.tier;
    const tm = tierMeta(t) || { color: "#8a8a95" };
    const held = familyTierOf(familyTiers, entry.familyId); // 0 = neu, sonst gehaltener Rang
    return {
      /* #perkart: `catKey` is the raw CATEGORIES key next to the already-localized `cat`. The emblem
         binds to the key, never to the display name — `cat.name` is „Deck"/„Trick" depending on the
         language, and hanging an image on it would make the picture disappear on an English run. */
      key: `${entry.familyId}:${t}`, entry, isFamily: true, cat: perkCat(fam.cat), catKey: fam.cat,
      accent: tm.color, tierLabel: rarityLabel(t), tier: t, held, upgrade: held > 0,
      name: `${fam.name} ${romanOf(t)}`, desc: (fam.tiers[t] || {}).desc || "",
      glow: t >= 3, // Selten/Rar erhalten einen dezenten Farbschein
    };
  }
  const p = perkDef(entry);
  const rar = rarityOf(entry);
  const rm = RARITY_META[rar];
  return { key: entry, entry, isFamily: false, cat: perkCat(p.cat), catKey: p.cat, accent: rm.color, rar, rm,
           leg: rar === "legendary", name: p.label, desc: p.desc };
}

/* Level-Up-Auswahl (§7.8): pausiert das Spiel, bietet PERKS_OFFERED Optionen.
   Zeigt zusätzlich den Build-Kontext (aktive Perks + Deck-Histogramm, #22) und die Kern-Stats (#40). */
export function PerkSelect({ offer, onPick, onReroll, onDecline, perks = [], deck = [], state = {},
                             options = {}, onOption, currentTraj = [], recordTraj = [], best = 0 }) {
  // Neuwurf (#263): eigener Perk-Reroll-Pool (2 je Lauf), kein Free-Reroll mehr. In der Legendär-Perk-Phase
  // zählt NUR der dedizierte Token (rerollsPerk2) — sonst zeigte die UI den allgemeinen Pool (bis 3).
  /* #lv-fluegel: Ab 1280 px zeigt die Karte KEINE Kontext-Klappfelder mehr — Deck-Stärke, Formationen und
     Build sind in den Flügeln zu Hause. Gebunden an die BREITE, nicht an den Auf-/Zu-Zustand der Flügel:
     „lebt nur noch im Reiter" heißt, dass die Karte sie auch bei zugeklapptem Flügel nicht zurückholt —
     sonst wäre der Griff kein Schalter, sondern nur eine zweite Anordnung derselben Inhalte. */
  const inWings = useIsWide();
  const onPhone = useIsPhone();   // #mobil-emblem — unter 640 px, NICHT die Verneinung von `inWings`
  const inLegPerkPhase = perkPhaseAt(state.devSchedule || DECISION_SCHEDULE, state.cycle) === LEG_PERK2_PHASE;
  const rerollTokens = inLegPerkPhase ? (state.rerollsPerk2 || 0) : (state.rerollsPerk || 0);
  const canReroll = !!onReroll && rerollTokens > 0;
  // Kern-Stats — dieselben Helfer/Kontexte wie die StatusRail → kein Drift (#40).
  const { winStreak = 0, wins = 0, trickNo = 0, pos = 0, crits = 0, lightning } = state;
  // Crit inkl. Blitz-Basis (lightning) + Präzision-Familien — dieselbe geteilte Quelle wie Engine/StatusRail (kein Drift).
  // #181: ungeklemmt anzeigen (Gesamt-Crit kann > 100 % sein → speist L6 „Raserei" / Familie D „Überschusskrit").
  const critRaw = totalCritChanceRaw(state);
  const critPct = Math.round(Math.max(0, critRaw) * 100);
  const scoreMult = baseScoreMultFor(perks, { winStreak, wins, trickNo, pos });
  const showCrit = hasCritPerk(perks) || hasCritFamily(state.familyTiers) || crits > 0 || !!(lightning && lightning.active);
  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <LevelupRig accent={PHASE_ACCENTS.red.c} state={state} deck={deck} options={options} onOption={onOption}
                  currentTraj={currentTraj} recordTraj={recordTraj} best={best}>
        {/* #lv-ruhe: ab 1280 px die leise Fassung derselben Karte (schwächerer Rahmen, kein farbiger Schein) —
            dieselbe Entscheidung wie an den Werkstatt-Panels (#cz-ruhe). Am Handy bleibt der kräftige Rahmen:
            dort steht die Karte auf einem kleinen Schirm über dem Brett und braucht die Ablösung. */}
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.red, undefined, { quiet: inWings })}>
        <PhaseHairline accent={PHASE_ACCENTS.red} />
        {/* #cornerart: EINE Ecke, weil die Perk-Wahl EINE Identitätsfarbe hat — hier wechselt nichts
            mit einem Reiter, es gibt keinen. Sie ist dieselbe Familie wie drüben, nur mit dem
            Perk-Schlüssel; das Nach-innen-Versetzen und die frühere Maske hängen an ihm. */}
        {(inWings || onPhone) && <CardCorners artKey={CORNER_PERK} />}
        <GlossaryPanel className="absolute top-3 right-3 z-10" />
        <div className="co-head text-center mb-1">
          <div className="text-body-5 uppercase tracking-widest" style={{ color: PHASE_ACCENTS.red.c }}>
            {(state.perks || []).length === 0 ? tr("perk.start") : tr("perk.cycle", { cycle: (state.cycle || 0) + 1 })}
          </div>
          <h2 className="text-title-6 font-bold mt-1">{tr("perk.title")}</h2>
          {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} className="lv-score" /></div>}
        </div>

        {!state.devMode && (onDecline || canReroll) && (
          <ActionBar pad={6}>
            {canReroll && <ActionButton kind="reroll" flex className="lv-actbtn lv-actbtn-reroll" onClick={onReroll}>{tr("perk.reroll", { n: rerollTokens })}</ActionButton>}
            {onDecline && <ActionButton kind="decline" flex className="lv-actbtn" onClick={onDecline}>{tr("perk.declineAll")}</ActionButton>}
          </ActionBar>
        )}

        {/* Kern-Stats (#40): dezent, damit die Perk-Auswahl die primäre Aktion bleibt. */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-body-5 mt-3">
          {showCrit && <span><span className="opacity-50">{tr("perk.stat.crit")} </span><span style={{ color: "#e879f9" }}>{critPct}%</span></span>}
          <span><span className="opacity-50">{tr("perk.stat.scoreMult")} </span><span style={{ color: "#d4a63a" }}>×{fmtMult(scoreMult)}</span></span>
        </div>

        {state.devMode ? (
          <DevPerkCatalog offer={offer} onPick={onPick} onDecline={onDecline} />
        ) : (
        <div className="grid sm:grid-cols-3 gap-2.5 mt-4">
          {offer.map((entry) => {
            const v = offerView(entry, state.familyTiers);
            const cat = v.cat;
            /* #perkart: the emblem hangs on the SAME 1280 px desktop breakpoint the wings use, and the
               gate is here in JSX rather than in CSS on purpose. A CSS-only gate would still put the
               <img> in the DOM, so a phone would fetch three images to hide them. `inWings` already
               holds `useIsWide()`; a second hook for the same query would be a second thing to keep
               in step with index.css. */
            const art = (inWings || onPhone) ? perkArt(v) : null;
            return (
              <button
                key={v.key}
                onClick={() => onPick(v.entry)}
                /* #kante: Karte in der Optik „Kante statt Fläche" (index.css .as-edge-card). Die Kante trägt die
                   SELTENHEIT — dieselbe Leiter wie bei den Skills: grau · grün · blau · lila, Gold für legendär.
                   `v.accent` liefert sie für beide Angebotsarten (Familie = Stufenfarbe aus TIER_META, flacher
                   Perk = Raritätsfarbe aus RARITY_META). Die Kategorie bleibt im Badge oben — sie sagt, WAS der
                   Perk anfasst, die Kante sagt, WIE GUT er ist, und das ist die Achse, nach der man sortiert.
                   Hohe Stufen bekommen zusätzlich einen dezenten Halo in derselben Farbe. */
                className={`lv-offercard as-edge-card${art ? (inWings ? " pk-offer-art" : " mc-tile") : ""} text-left rounded-xl p-3 h-full flex flex-col gap-1.5 transition-all hover:-translate-y-0.5${(!v.isFamily && v.leg) ? " as-legendary" : ""}`}
                style={{ "--c": v.accent,
                         // Legendär (flach): animierter Gold-Rahmen über .as-legendary (#201.3) → dort KEIN eigener Schein.
                         boxShadow: (!v.isFamily && v.leg) ? undefined
                                  : (v.isFamily ? v.glow : v.rar === "rare") ? `0 0 14px -6px ${v.accent}` : undefined }}
              >
                {/* #perkart: without an emblem NEITHER the element NOR the class is added — `art`
                    switches both, so the tile without a picture keeps exactly the tree it had before
                    this task and the phone layout is untouched. The badges and the name stay where
                    they were, only lower (the padding lives in `.pk-offer-art`).
                    `pk-strip-mid` is for the legendaries only: their motifs are composed centred, the
                    category ones in the upper two thirds — measurement and reasoning at the rule in
                    index.css. Same condition as the gold frame above, so that „legendary" is not
                    defined a second time here. */}
                {art && <img src={art} alt="" aria-hidden="true" loading="lazy" decoding="async"
                             className={inWings ? `pk-strip${(!v.isFamily && v.leg) ? " pk-strip-mid" : ""}` : "mc-emblem"} />}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${cat.color}22`, color: cat.color }}>
                    {cat.name}
                  </span>
                  {v.isFamily ? (
                    <>
                      {/* Stufen-Badge (Seltenheit der Zielstufe) in der Stufenfarbe. */}
                      <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide"
                        style={{ background: `${v.accent}1f`, color: v.accent, border: `1px solid ${v.accent}88` }}>
                        {v.tierLabel}
                      </span>
                      {v.upgrade && (
                        <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${v.accent}14`, color: v.accent, border: `1px dashed ${v.accent}88` }}>
                          {tr("perk.upgrade", { from: romanOf(v.held), to: romanOf(v.tier) })}
                        </span>
                      )}
                    </>
                  ) : (
                    v.rm.badge && (
                      <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide"
                        style={{ background: `${v.rm.color}1f`, color: v.rm.color, border: `1px solid ${v.rm.color}88` }}>
                        {v.rm.badge}
                      </span>
                    )
                  )}
                </div>
                <div className="lv-cardname font-bold" style={{ color: (!v.isFamily && v.leg) ? LEG_GOLD : v.isFamily ? v.accent : cat.color }}>{v.name}</div>
                <div className="text-body-3 opacity-75 leading-snug"><GlossaryText text={v.desc} /></div>
              </button>
            );
          })}
        </div>
        )}

        {!state.devMode && (
        <div className="text-center text-body-5 opacity-40 mt-3">
          {tr("perk.onceHint")}
        </div>
        )}

        {/* Was der Lauf schon trägt. Ein Perk, der Ladung verbraucht, ist ohne Blitz-Skill eine andere
            Entscheidung — die Liste beantwortet genau diese Frage und steht deshalb auf BEIDEN
            Auswahl-Bildschirmen (eine Quelle: HeldSkills.jsx). */}
        <HeldSkills skills={state.skills || []} state={state} className="mt-4"
          open={options.lvHeld ?? true} onToggle={(v) => onOption?.({ lvHeld: v })} />

        {/* Build-Kontext (#22) — sekundär, hilft bei der gezielten Wahl (Synergien, Lücken). Einklappbare Panels wie in
            Skill-Auswahl/Aufstellphase, damit die Perk-Wahl die primäre Aktion bleibt. */}
        {/* Reihenfolge: Deck-Stärke oben, dann Formationen, „Dein Build" ganz unten — alle als klappbare Felder. */}
        <div className="mt-4">
          {/* Deck-Stärke und Formationen NUR, solange der linke Flügel sie nicht schon zeigt (#lv-fluegel). */}
          {!inWings && (
            <CollapsibleField title={tr("perk.deckStrength")}>
              <DeckStrength deck={deck} />
            </CollapsibleField>
          )}
          {/* #161 FB-1: aktive Formationen als Kontext (v. a. für Deck-/Formations-Perks) — mit 🏗 Gebäude-Toggle. */}
          {!inWings && (
            <div className="mt-3 rounded-xl px-3 py-3" style={phasePanel(PHASE_ACCENTS.red)}>
              <FormationPanel state={state} title={tr("perk.formations")} collapsible defaultOpen={false} />
            </div>
          )}
          {!inWings && (
            <CollapsibleField title={(() => { const n = perks.length + Object.values(state.familyTiers || {}).filter((lv) => lv > 0).length;
              return tr("perk.build", { count: n }); })()} defaultOpen={false}>
              <PerkList perks={perks} familyTiers={state.familyTiers} zins={zinsReadout(state)} empty={tr("perk.build.empty")} />
            </CollapsibleField>
          )}
        </div>
        </div>
      </LevelupRig>
    </div>
  ));
}
