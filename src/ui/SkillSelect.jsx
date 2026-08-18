import { useState, useRef } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { PANEL_BG, phaseCard, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { ARCHETYPE_ORDER, archetypeOf, marginHeatPoints, isLegendarySkill } from "../game/skills.js";
import { FactionIcon, ArchIcon, FACTION_ICON_SRC } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { SKILL_SLOTS, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_CRIT_MULT_PER_SKILL,
         PLANT_GROWTH_SKILL_REF, PLANT_GREEN_THRESHOLD, WURZELSCHLAG_PER_GROWTH, PLANT_VALUE_CAP,
         WURZELSCHLAG_LOSS_MIN_SKILLS, WURZELSCHLAG_LOSS_EVERY,
         FIRE_MARGIN_OFFSET, FIRE_SCORE_BASE, FIRE_SCORE_PER_SKILL, FIRE_SCORE_SQRT_K,
         HEAT_MIN_MARGIN, HEAT_PER_POINT, HEAT_LOSS_MAX, HEAT_LOSS_PCT } from "../game/constants.js";
import { DECLINE_MIN_SKILLS as G_DECLINE_MIN_SKILLS } from "../game/glacier.js"; // Eis-Neudesign: Ablehn-Gletscher-Schwelle für den Passiv-Text

import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { GuideOverlay } from "./GuideOverlay.jsx";
import { FormationPanel } from "./FormationPanel.jsx";
import { LevelupRig } from "./LevelupWings.jsx"; // #lv-fluegel: Deck links, Kennzahlen rechts (ab 1400 px)
import { useIsWide } from "./useIsWide.js";      // #sk-reiter: Reiterzeile statt Pager — DOM, nicht Anordnung
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { glossaryEntry } from "../i18n/glossaryText.js"; // #sprache: Glossartext zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js";

// Archetyp-Meta eines Skills (Theming) — Fallback neutral (#93 F0).
const ac = (id) => archMeta(archetypeOf(id)) || { label: t("skill.arch.none"), icon: "•", color: "#8a8a95" };

// #238b: Was verschwindet, wenn der LETZTE Skill eines Archetyps abgelegt wird (Wahrheit: reducer.js stillActive-Pfad).
// Bereits in die Karten gebackener Wert (geschmiedet/gewachsen) bleibt erhalten → Zusatz nur bei Feuer/Pflanze.
const ARCH_LOSS = {
  plant:     { key: "skill.loss.plant", baked: true },
  ice:       { key: "skill.loss.ice", baked: false },
  fire:      { key: "skill.loss.fire", baked: true },
  lightning: { key: "skill.loss.lightning", baked: false },
};

const SOCKET_PCT = Math.round(LIGHTNING_CRIT_BASE * 100);         // einmaliger Aktivierungs-Sockel (5 %)
const PER_SKILL_PCT = Math.round(LIGHTNING_CRIT_PER_SKILL * 100); // je Blitz-Skill (8 %)
const FIRST_CRIT_PCT = SOCKET_PCT + PER_SKILL_PCT;               // Crit-Chance nach dem ERSTEN Blitz-Skill (Sockel + 1×)
const PER_SKILL_MULT = () => fmtNum(LIGHTNING_CRIT_MULT_PER_SKILL); // +Crit-Multiplikator je Blitz-Skill (0,1)
// Feuer-Passive: konkrete Zahlen (erster Feuer-Skill). Score = lineare Linie + √-Bonus; Hitze = marginHeatPoints (√-Schwanz).
const fireScoreAt = (m) => Math.round((m - FIRE_MARGIN_OFFSET) * FIRE_SCORE_BASE + FIRE_SCORE_BASE * FIRE_SCORE_SQRT_K * Math.sqrt(m - FIRE_MARGIN_OFFSET));
const fireHeatAt  = (m) => Math.round(marginHeatPoints(m) * HEAT_PER_POINT);
const FIRE_MIN_HEAT = fireHeatAt(HEAT_MIN_MARGIN);         // Hitze bei Mindest-Vorsprung
const FIRE_MIN_SCORE = fireScoreAt(HEAT_MIN_MARGIN);       // Score bei Mindest-Vorsprung
const FIRE_LOSS_PCT = Math.round(HEAT_LOSS_PCT * 100);     // Abkühl-Anteil der aktuellen Hitze je Niederlage
// Kuratierte Schlüsselbegriffe je Archetyp-Passive — der Aufklapper zeigt AUSSCHLIESSLICH diese als kleine Unterkategorien
// (Icon + Begriff + Kurztext aus dem Glossar), damit alle vier Passive gleich schön lesbar sind statt einer Textwand.
const PASSIVE_KEYWORDS = {
  lightning: ["charge", "ionize"],
  fire:      ["glutdividende", "ash"],
  ice:       ["masse", "bersten", "eisformation"],
  plant:     ["green"],
};

// Blitz-Akzent: violett/elektrisch (dieselbe Deck-/Archetyp-Farbe wie im HUD).
const LIGHT = "#8a7de0";

// Kleine Glossar-Liste (label — text) für einen Satz Schlüsselbegriffe. Wiederverwendet für den
// Archetyp-Passiv-Aufklapper (#201 P9) UND die Detailansicht gehaltener Skills (#201 P1).
function KeywordGlossary({ tokens }) {
  if (!tokens.length) return null;
  return (
    <div className="grid gap-1.5 mt-2">
      {tokens.map((k) => (
        <div key={k} className="text-xs leading-snug">
          <span className="font-bold inline-flex items-center gap-1" style={{ color: glossaryEntry(k).color }}>{FACTION_ICON_SRC[glossaryEntry(k).group] ? <FactionIcon type={glossaryEntry(k).group} size={12} /> : glossaryEntry(k).icon} {glossaryEntry(k).label}</span>
          <span className="opacity-70"> — {glossaryEntry(k).text}</span>
        </div>
      ))}
    </div>
  );
}

/* Skill-Auswahl (docs/blitz-archetyp.md, Abschnitt 7): erscheint zu festen Zeitpunkten (DECISION_SCHEDULE, erstmals Runde 7) STATT eines Perks.
   Seltene, regelverändernde Motoren. Ablehnen → stattdessen ein Perk (Runde nie verschwendet).
   Bei vollen Slots: neuen Skill wählen → dann den zu ersetzenden Skill antippen (übergibt replaceId).
   #201 P9: Angebot bleibt kompakt (nur Name + Kurztext). Die ausführliche Passiv-Beschreibung des
   Archetyps (inkl. Schlüsselbegriffe) klappt per Tap/Klick auf den Archetyp-Header auf. */
export function SkillSelect({ offer, onPick, onDecline, onReroll, skills = [], state = {}, options = {}, onOption,
                              currentTraj = [], recordTraj = [], best = 0 }) {
  const wide = useIsWide();
  // #lv-fluegel: ab 1400 px lebt das Formationsfeld im linken Flügel (Breite, nicht Flügel-Zustand — s. PerkSelect).
  const held = skills.map((id) => skillDef(id)).filter(Boolean);
  // Neuwurf (#263): eigener Skill-Reroll-Pool (2 je Lauf), kein Free-Reroll mehr.
  const rerollTokens = state.rerollsSkill || 0;
  const canReroll = !!onReroll && rerollTokens > 0;
  const slots = state.skillSlots || SKILL_SLOTS; // #370 Skill-Fülle / Meisterhand: erhöhtes Slot-Limit (sonst Basis)
  /* #272: Der legendäre Skill sitzt in einem EIGENEN, festen Slot — er zählt nicht gegen `slots` und kann nie
     ersetzt werden. Die Zählung hier muss dieselbe sein wie im Reducer (PICK_SKILL: `normalCount`), sonst laufen
     UI und Regel auseinander. Genau das war der Meisterhand-Bug: `skills.length` schloss den Legendär mit ein,
     also galten 6 normale + 1 legendärer Skill schon bei 7 Slots als „voll" — der gewonnene Slot war über die
     Oberfläche nicht erreichbar, und der einzige Ausweg (Ersetzen-Fenster) tauschte nur, statt hinzuzufügen. */
  const legendaryHeld = skills.filter(isLegendarySkill).length;
  const normalHeld = skills.length - legendaryHeld;
  const full = normalHeld >= slots;
  // Anzeige: der Legendär bringt seinen eigenen Slot mit → „7 / 7" statt „7 / 6", nach Meisterhand „7 / 8".
  const slotsShown = slots + legendaryHeld;
  const [pending, setPending] = useState(null); // bei vollen Slots gewählter neuer Skill — wartet auf Ersetzungsziel
  const devMode = !!state.devMode;                  // Dev-Run: Reroll aus, „Runde überspringen"
  // Meisterhand: diese Skill-Wahl kommt aus dem eben genommenen Perk, nicht aus dem Rundenplan (Reducer:
  // PICK_PERK). Sie braucht deshalb einen eigenen Ablehnen-Text — „Ablehnen → Perk" wäre hier eine Lüge.
  const bonusOffer = !!state.skillOfferBonus;
  const [pendingConsumer, setPendingConsumer] = useState(null); // #93: Konsumenten-Ersatzdialog { id, replace, type }
  // Swipe-Pager (#12): die Archetyp-Kategorien sind horizontale Seiten; `page` = aktuelle Seite, `tx` merkt den Touch-Start.
  // Startwert null → die Startseite folgt dem zuletzt gewählten Skill-Typ (options.lastSkillArch); erst ein Swipe setzt eine Zahl.
  const [pageState, setPageState] = useState(null);
  const tx = useRef(0);
  const dir = useRef(1); // Richtung des letzten Seitenwechsels (−1 zurück / +1 vor) → steuert die Slide-in-Animation
  const [guideArch, setGuideArch] = useState(null); // offener Leitfaden (Archetyp) — vom i-Chip geöffnet, direkt auf der passenden Seite
  const [openForms, setOpenForms] = useState(false); // Aufstellfeld (Formations-Panel) unten — einklappbar, default zu (#UI)

  // Passiv-Beschreibung je Archetyp — EIN Text, unabhängig davon, ob es der freischaltende oder ein weiterer Pick ist.
  // Beschreibt NUR die Passive (Deck-Mechanik lebt in der Deck-Erklärung). Ergänzt im Aufklapper durch die Glossar-Einträge.
  const unlockLine = (arch) => {
    switch (arch) {
      case "lightning":
        return t("skill.passive.lightning", { first: FIRST_CRIT_PCT, each: PER_SKILL_PCT, mult: PER_SKILL_MULT() });
      case "fire":
        return t("skill.passive.fire", { margin: HEAT_MIN_MARGIN, heat: FIRE_MIN_HEAT, score: FIRE_MIN_SCORE,
          cool: FIRE_LOSS_PCT, coolMax: HEAT_LOSS_MAX, perSkill: FIRE_SCORE_PER_SKILL });
      case "ice":
        return t("skill.passive.ice", { declineFrom: G_DECLINE_MIN_SKILLS });
      case "plant":
        return t("skill.passive.plant", { ref: PLANT_GROWTH_SKILL_REF, green: PLANT_GREEN_THRESHOLD,
          perValue: WURZELSCHLAG_PER_GROWTH, cap: PLANT_VALUE_CAP, minSkills: WURZELSCHLAG_LOSS_MIN_SKILLS,
          everyLoss: WURZELSCHLAG_LOSS_EVERY });
      default: return "";
    }
  };

  // Angebot nach Archetyp gruppieren (feste Reihenfolge). #93 F0: 2+2 …; jetzt bis zu 4 Fraktionen im Angebot.
  // #118: defensiver Guard — ein bereits gehaltener Skill erscheint NIE als Angebots-Karte (selbst bei inkonsistentem State).
  const groups = ARCHETYPE_ORDER
    .map((arch) => ({ arch, meta: archMeta(arch), ids: offer.filter((id) => archetypeOf(id) === arch && !skills.includes(id)) }))
    .filter((g) => g.ids.length);
  const showFormations = groups.some((g) => g.arch === "ice") || (skills || []).some((id) => archetypeOf(id) === "ice"); // #161 FB-1: Formations-Panel bei Eis-Relevanz

  // Swipe-Pager (#12): eine Seite je angebotenem Archetyp. Endlos-Swipe (#UI): der Index läuft im Kreis (modulo),
  // ans Ende geswipt geht es vorne weiter — die Nachbar-Anzeige (‹ … › + Punkte) folgt dem Ring, zeigt also immer
  // korrekt, was als Nächstes kommt. `page` ist stets normalisiert (Angebot kann sich durch Neuwurf ändern).
  const nPages = groups.length;
  // #UI: Startseite = die Kategorie des zuletzt gewählten Skills (falls sie im Angebot ist), sonst die erste.
  const savedIdx = groups.findIndex((g) => g.arch === options.lastSkillArch);
  const initPage = savedIdx >= 0 ? savedIdx : 0;
  const page = nPages > 0 ? (pageState == null ? initPage : (((pageState % nPages) + nPages) % nPages)) : 0;
  const curG = groups[page];
  const prevG = nPages > 1 ? groups[(page - 1 + nPages) % nPages] : null;
  const nextG = nPages > 1 ? groups[(page + 1) % nPages] : null;
  /* Passiv-Beschreibung: der Zustand liegt in den OPTIONEN, nicht im Komponenten-State — die Skill-Wahl wird
     je Phase neu gemountet, ein `useState` wäre also in JEDER Skill-Phase wieder zu und müsste jedes Mal neu
     zugeklappt werden. Derselbe Weg wie `lastSkillArch`/`lvWing*`. Default ZU. Bewusst EIN Schalter für alle
     Fraktionen statt einer je Archetyp: „aufgeklappt lassen" ist eine Lesegewohnheit, keine Eigenschaft der
     gerade gezeigten Fraktion — beim Blättern soll er nicht wieder zufallen. */
  const detailOpen = !!curG && !!options.lvPassive;
  /* #kante: Der Rahmen der Auswahl trägt die Farbe des GEZEIGTEN Archetyps statt eines festen Violett — beim
     Blättern durch die Fraktionen wechselt er mit. Zusammen mit den Karten (die ihre Seltenheit tragen)
     ergibt das zwei Achsen ohne Konkurrenz: der Rahmen sagt „wo bin ich", die Karten „wie gut ist das".
     phaseCard erwartet den Ton zusätzlich als "r,g,b" für seine rgba()-Schichten. */
  const archAccent = curG
    ? { c: curG.meta.color, rgb: [1, 3, 5].map((i) => parseInt(curG.meta.color.slice(i, i + 2), 16)).join(",") }
    : PHASE_ACCENTS.violet;
  const groupKws = curG ? (PASSIVE_KEYWORDS[curG.arch] || []) : [];
  const go = (d) => { dir.current = d < 0 ? -1 : 1; setPageState(nPages > 0 ? (((page + d) % nPages) + nPages) % nPages : 0); };
  const goTo = (i) => { dir.current = i > page ? 1 : (i < page ? -1 : dir.current); setPageState(i); };

  // Konsumenten-Typ eines Skills (#93): Hitze („heat") / Ladung („charge") / kein Konsument (null).
  const consumerTypeOf = (id) => (skillDef(id)?.heatConsumer ? "heat" : skillDef(id)?.onFullCharge ? "charge" : null);
  const CONSUMER_LABEL = { get heat() { return t("skill.consumer.heat"); }, get charge() { return t("skill.consumer.charge"); } };

  // Freier Slot → direkt wählen. Volle Slots → neuen Skill vormerken → Ersetzen-Fenster (#234).
  // #234: Nur Blitz-LADUNGS-Konsumenten sind exklusiv (max 1) → Ersatzdialog beim zweiten. Feuer-HITZE-Konsumenten
  // dürfen mehrere gleichzeitig (heben sich nicht auf) → wie normale Skills behandeln.
  // #UI: gewählten Skill übernehmen UND seinen Archetyp merken, damit die nächste Skill-Auswahl auf dieser Seite startet.
  const pick = (id, replaceId) => { onOption?.({ lastSkillArch: archetypeOf(id) }); onPick(id, replaceId); };

  const clickSkill = (id) => {
    if (consumerTypeOf(id) === "charge" && !skills.includes(id)) {
      const existing = skills.find((s) => consumerTypeOf(s) === "charge");
      if (existing && existing !== id) {
        setPendingConsumer((cur) => (cur && cur.id === id ? null : { id, replace: existing, type: "charge" }));
        return;
      }
    }
    if (!full) { pick(id); return; }
    setPending((cur) => (cur === id ? null : id)); // volle Slots → Ersetzen-Fenster öffnet über `pending`
  };

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <LevelupRig accent={archAccent.c} state={state} deck={state.deck || []} options={options} onOption={onOption}
                  currentTraj={currentTraj} recordTraj={recordTraj} best={best}>
        {/* FESTE Höhe (wie Bestenliste/Werkstatt) statt max-height: sonst sprang die zentrierte Karte beim
            Archetyp-Wechsel in Position UND Größe, weil jede Archetyp-Seite unterschiedlich hoch ist. Jetzt
            bleibt die Karte konstant, nur der Inhalt darunter scrollt. */}
        <div className="relative w-full rounded-2xl px-4 pb-6 overflow-y-auto overlay-card" style={{ ...phaseCard(archAccent), height: "min(92dvh, 760px)" }}>
        <PhaseHairline />
        <GlossaryPanel className="absolute top-3 right-3 z-10" />
        <div className="text-center mb-1 pt-6">
          <div className="text-xs uppercase tracking-widest" data-tut="skill-slots" style={{ color: LIGHT }}>{t("skill.eyebrow", { cycle: (state.cycle || 0) + 1, held: skills.length, slots: slotsShown })}</div>
          <h2 className="text-xl font-bold mt-1">{t("skill.title")}</h2>
          {/* Ohne diesen Satz steht mitten in einer PERK-Runde plötzlich eine Skill-Wahl — der Spieler sucht
              sonst den Fehler bei sich. */}
          {bonusOffer && (
            <div className="mt-2 mx-auto max-w-md rounded-lg px-3 py-1.5 text-xs" style={{ background: "#d4a63a14", border: "1px solid #d4a63a55", color: "#e8dcb8" }}>
              {t("skill.bonus.hint")}
            </div>
          )}
          {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
        </div>

        {/* Reroll + Ablehnen: direkt unter dem Kopf, nebeneinander & STICKY → schweben beim Scrollen mit, damit man
            zum Neuwürfeln/Ablehnen nicht ans Ende der Skill-Liste scrollen muss. Voller Hintergrund maskiert durchscrollende Karten. */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-1.5 pb-2 mb-1" style={{ background: PANEL_BG }}>
          <div className="flex items-stretch gap-2">
            {/* #kante: gleiche Optik wie die zentrale ActionButton-Leiste (index.css) — Reroll ist das Ziel
                (Gold, voller Anlauf), Ablehnen der Ausweg (neutral, ohne Farbsignal). */}
            {!devMode && canReroll && (
              <button onClick={onReroll}
                className="as-edge-strong flex-1 text-xs px-3 py-2 rounded-lg font-bold transition-all hover:brightness-110"
                style={{ "--c": "#d4a63a" }}>
                {t("skill.reroll", { n: rerollTokens })}
              </button>
            )}
            <button onClick={onDecline}
              className="as-edge-neutral flex-1 text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80">
              {t(devMode ? "skill.skipCycle" : bonusOffer ? "skill.declinePlain" : "skill.decline")}
            </button>
          </div>

          {/* #sk-reiter — ab 1400 px steht statt des Pagers eine REITERZEILE: alle angebotenen Fraktionen
              nebeneinander. Der Zustand ist derselbe (`page`/`goTo`),
              es ist nur eine zweite Darstellung desselben Pagers — kein neuer State, keine zweite Wahrheit.
              Bewusst ein `wide`-Zweig statt zweier gerenderter Navigationen: zwei Bedienelemente für dieselbe
              Sache hießen zwei Tab-Reihenfolgen und zwei Ziele für den Tutorial-Mark.
              `repeat(n,1fr)` statt fester Vier — `groups` filtert leere Fraktionen weg, es können 1–4 sein.
              Die Reiter zeigten anfangs die drei Skillnamen als Vorschau — bewusst wieder entfernt: der
              längste Fall (Blitz) braucht 58 Zeichen DE / 60 EN auf ~181 px Textbreite, wäre also zweizeilig,
              und die Zeile war vor allem Unruhe. Wer wissen will, was drin liegt, klickt den Reiter an. */}
          {wide && nPages > 0 && curG && (
            <div className="sk-tabs mt-2 grid gap-2" data-tut="skill-offer"
                 style={{ gridTemplateColumns: `repeat(${nPages}, minmax(0,1fr))` }}>
              {groups.map((g, i) => {
                const on = i === page;
                return (
                  <button key={g.arch} type="button" onClick={() => goTo(i)}
                    className="sk-tab text-left rounded-xl px-3 py-2.5 transition-all hover:brightness-125"
                    aria-current={on ? "true" : undefined}
                    style={{ "--c": g.meta.color, borderColor: on ? `${g.meta.color}8a` : "#ffffff29",
                             borderBottomColor: on ? g.meta.color : "transparent",
                             background: on ? `linear-gradient(180deg,${g.meta.color}22,#12121a 72%)` : undefined,
                             boxShadow: on ? `0 0 18px -10px ${g.meta.color}` : undefined }}>
                    <div className="flex items-center gap-1.5">
                      <ArchIcon meta={g.meta} size={14} />
                      <span className="text-[13px] font-bold uppercase tracking-wide truncate"
                            style={{ color: on ? g.meta.color : "#adadbc" }}>{g.meta.label}</span>
                      <span className="ml-auto text-[11px] opacity-45 tabular-nums">{g.ids.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Archetyp-Navi (Indikator): aktueller Typ mittig (mit i-Chip → passender Leitfaden), Nachbarn links/rechts
              im Endlos-Ring, Punkte für die Position (#12/#UI). */}
          {!wide && nPages > 0 && curG && (
            <div className="mt-2" data-tut="skill-offer">
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
                {nPages > 1 ? (
                  <button type="button" onClick={() => go(-1)}
                    className="flex items-center gap-1.5 min-w-0 text-left transition-all hover:brightness-125" title={t("skill.nav.prev")}>
                    <span className="font-bold text-lg leading-none" style={{ color: "#9aa0b4" }}>‹</span>
                    {prevG && <><ArchIcon meta={prevG.meta} size={14} /><span className="truncate text-[11px]" style={{ color: "#6d7288" }}>{prevG.meta.label}</span></>}
                  </button>
                ) : <span />}
                <span className="inline-flex items-center gap-1.5 font-bold text-sm px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ color: curG.meta.color, background: `${curG.meta.color}1f`, border: `1px solid ${curG.meta.color}55` }}>
                  <ArchIcon meta={curG.meta} size={14} /> {curG.meta.label}
                  {/* i im Kreis → öffnet den Leitfaden direkt auf der Seite dieses Archetyps (#UI). */}
                  <button type="button" onClick={() => setGuideArch(curG.arch)}
                    title={t("skill.guide.title", { arch: curG.meta.label })} aria-label={t("skill.guide.aria", { arch: curG.meta.label })}
                    className="inline-grid place-items-center rounded-full leading-none transition-all hover:brightness-125"
                    style={{ width: 16, height: 16, fontSize: 10, fontStyle: "italic", fontFamily: "Georgia, serif",
                             color: curG.meta.color, background: `${curG.meta.color}22`, border: `1px solid ${curG.meta.color}99` }}>i</button>
                </span>
                {nPages > 1 ? (
                  <button type="button" onClick={() => go(1)}
                    className="flex items-center justify-end gap-1.5 min-w-0 text-right transition-all hover:brightness-125" title={t("skill.nav.next")}>
                    {nextG && <><span className="truncate text-[11px]" style={{ color: "#6d7288" }}>{nextG.meta.label}</span><ArchIcon meta={nextG.meta} size={14} /></>}
                    <span className="font-bold text-lg leading-none" style={{ color: "#9aa0b4" }}>›</span>
                  </button>
                ) : <span />}
              </div>
              {nPages > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  {groups.map((g, i) => (
                    <button key={g.arch} type="button" onClick={() => goTo(i)} title={g.meta.label}
                      className="h-1.5 rounded-full transition-all" style={{ width: i === page ? 22 : 16, background: i === page ? g.meta.color : "#31313c" }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Konsumenten-Ersatzdialog (#93): zweiter Konsument desselben Typs ersetzt den bestehenden. */}
        {pendingConsumer && (
          <div className="mt-3 rounded-lg px-3 py-3 text-xs leading-snug" style={{ background: "#d4a63a1a", border: "1px solid #d4a63a66", color: "#e8dcb8" }}>
            <div className="mb-2">
              {t("skill.consumer.pre", { kind: CONSUMER_LABEL[pendingConsumer.type] })}{" "}
              <b style={{ color: ac(pendingConsumer.replace).color }}>{skillDef(pendingConsumer.replace)?.name}</b>.{" "}
              <b style={{ color: ac(pendingConsumer.id).color }}>{skillDef(pendingConsumer.id)?.name}</b>{" "}
              {t("skill.consumer.post", { kind: CONSUMER_LABEL[pendingConsumer.type] })}
            </div>
            <div className="flex gap-2">
              {/* #kante: Bestätigen als starker Kanten-Knopf, Abbrechen neutral. */}
              <button onClick={() => { pick(pendingConsumer.id, pendingConsumer.replace); setPendingConsumer(null); }}
                className="as-edge-strong as-edge-thin px-3 py-1.5 rounded font-bold transition-all hover:brightness-110"
                style={{ "--c": "#d4a63a" }}>{t("skill.replace")}</button>
              <button onClick={() => setPendingConsumer(null)}
                className="as-edge-neutral as-edge-thin px-3 py-1.5 rounded transition-all hover:opacity-80">{t("skill.cancel")}</button>
            </div>
          </div>
        )}

        {/* Bei vollen Slots: Hinweis, dass beim Wählen ein Ersetzen-Fenster erscheint (#234). */}
        {full && !pending && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#d4a63a14", border: "1px solid #d4a63a55", color: "#e8dcb8" }}>
            {t("skill.slotsFull.hint", { slots: slotsShown })}
          </div>
        )}

        {/* #234: Ersetzen-Fenster bei vollen Slots — zeigt alle gehaltenen Skills MIT Beschreibung; gilt für ALLE Archetypen. */}
        {full && pending && overlayPortal(
          <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
            <div className="relative w-full max-w-md rounded-2xl p-5 max-h-[88dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.violet)}>
              <PhaseHairline />
              <div className="text-center mb-3">
                <div className="text-xs uppercase tracking-widest" style={{ color: "#d4a63a" }}>{t("skill.slotsFull")}</div>
                <h3 className="text-lg font-bold mt-1">{t("skill.replace.which")}</h3>
                <p className="text-xs opacity-65 mt-1">
                  {t("skill.replace.new")} <b style={{ color: ac(pending).color }}><ArchIcon meta={ac(pending)} size={13} /> {skillDef(pending)?.name}</b>. {t("skill.replace.tap")}
                </p>
              </div>
              <div className="grid gap-2">
                {/* #272: Der legendäre Skill ist NICHT ersetzbar — der Reducer weist ein solches replaceId ab.
                    Er stand hier trotzdem in der Liste: ein Tipp darauf schloss das Fenster und tat nichts. */}
                {held.filter((s) => !s.legendary).map((s) => {
                  const arch = archetypeOf(s.id);
                  // #238b: Ersetzt man DIESEN Skill, wird sein Archetyp nur dann deaktiviert, wenn er der letzte
                  // seiner Art ist UND der NEUE Skill (pending) nicht selbst denselben Archetyp hat (dann bleibt er aktiv).
                  const deactivates = !!arch && ARCH_LOSS[arch] && archetypeOf(pending) !== arch
                    && held.filter((h) => archetypeOf(h.id) === arch).length === 1;
                  return (
                  /* #kante: Ersetzen-Liste — die Kante warnt. Rot, wenn dieser Tausch die letzte Karte einer
                     Fraktion abgibt und damit deren Passiv abschaltet; sonst die Fraktionsfarbe des Skills. */
                  <button key={s.id} onClick={() => { pick(pending, s.id); setPending(null); }}
                    className={`as-edge-card${deactivates ? " is-sel" : ""} text-left rounded-xl p-3 flex flex-col gap-1 transition-all hover:brightness-110`}
                    style={{ "--c": deactivates ? "#d1462f" : ac(s.id).color }}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: `${ac(s.id).color}22`, color: ac(s.id).color, border: `1px solid ${ac(s.id).color}88` }}><ArchIcon meta={ac(s.id)} size={11} /> {ac(s.id).label.toUpperCase()}</span>
                      {(s.heatConsumer || s.onFullCharge) && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: "#d4a63a22", color: "#d4a63a", border: "1px solid #d4a63a88" }}>{t("skill.badge.consumer")}</span>}
                      {s.legendary && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>{t("skill.badge.legendary")}</span>}
                    </div>
                    <div className="font-bold text-sm" style={{ color: ac(s.id).color }}>{s.name}</div>
                    <div className="text-xs opacity-75 leading-snug whitespace-pre-line"><GlossaryText text={s.desc} /></div>
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: "#e0605a" }}>{t("skill.replace.this")}</div>
                    {/* #238b: gezielte Warnung — nur wenn dieses Ersetzen den letzten Skill des Archetyps entfernt. */}
                    {deactivates && (
                      <div className="mt-1 rounded px-2 py-1 text-[10px] font-bold leading-snug" style={{ background: "#3a1518", border: "1px solid #d1462f66", color: "#f0a898" }}>
                        {t("skill.lastOfArch", { arch: ac(s.id).label, loss: t(ARCH_LOSS[arch].key) })}{ARCH_LOSS[arch].baked ? t("skill.lastOfArch.baked") : ""}
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
              <button onClick={() => setPending(null)} className="as-edge-neutral w-full mt-3 rounded-lg py-2 text-sm font-bold">{t("skill.cancel")}</button>
            </div>
          </div>
        )}

        {/* #12/#UI: Archetypen als Swipe-Seiten. Es wird NUR die aktuelle Seite gerendert → die Höhe passt sich dem Inhalt
            an (keine tote Leerfläche mehr durch die höchste Seite) und der Endlos-Wrap ist trivial. Wischen (Touch) ·
            Chevrons/Punkte · ◀▶-Pfeiltasten wechseln die Seite; die neue Seite gleitet aus der Swipe-Richtung herein. */}
        {nPages > 0 && curG && (
          <div className="mt-4 overflow-hidden" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { go(1); e.preventDefault(); } }}
            onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - tx.current; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1); }}>
            <div key={page} className="px-0.5"
              style={{ animation: `${dir.current < 0 ? "as-page-in-left" : "as-page-in-right"} .26s cubic-bezier(.22,.61,.36,1)` }}>
              {/* Passiv-Beschreibung — einklappbar (am Handy default zu, ab 1400 px offen).
                  Die Zeile ist ein Flex-Behälter, weil der Leitfaden-Chip daneben ein EIGENER Knopf sein muss —
                  verschachtelte <button> sind ungültiges HTML. Am Handy hat sie genau ein Kind (`flex-1`), das
                  vorher `w-full` war: gleiche Breite, gleicher Abstand, gleiche Geometrie. */}
              <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => onOption?.({ lvPassive: !detailOpen })}
                className="flex-1 min-w-0 flex items-center gap-2 text-left" aria-expanded={detailOpen}
                title={t(detailOpen ? "skill.passive.collapse" : "skill.passive.expand", { arch: curG.meta.label })}>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: curG.meta.color }}><ArchIcon meta={curG.meta} size={12} /> {t("skill.passive.head", { arch: curG.meta.label })}</span>
                <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all hover:brightness-125"
                  style={{ color: curG.meta.color, background: `${curG.meta.color}14`, border: `1px solid ${curG.meta.color}3a` }}>
                  <span className="transition-transform" style={{ display: "inline-block", transform: detailOpen ? "rotate(90deg)" : "none" }}>▸</span>
                  {t(detailOpen ? "skill.less" : "skill.more")}
                </span>
                <div className="flex-1 h-px" style={{ background: `${curG.meta.color}33` }} />
              </button>
              {/* Der i-Chip saß am Pager-Badge — das gibt es ab 1400 px nicht mehr. Ohne diesen Ersatz wäre der
                  Archetyp-Leitfaden auf dem Desktop von der Skill-Wahl aus gar nicht mehr erreichbar. */}
              {wide && (
                <button type="button" onClick={() => setGuideArch(curG.arch)}
                  title={t("skill.guide.title", { arch: curG.meta.label })} aria-label={t("skill.guide.aria", { arch: curG.meta.label })}
                  className="shrink-0 inline-grid place-items-center rounded-full leading-none transition-all hover:brightness-125"
                  style={{ width: 18, height: 18, fontSize: 11, fontStyle: "italic", fontFamily: "Georgia, serif",
                           color: curG.meta.color, background: `${curG.meta.color}22`, border: `1px solid ${curG.meta.color}99` }}>i</button>
              )}
              </div>
              {detailOpen && (
                <div className="mb-3 rounded-lg px-3 py-2 text-xs leading-snug"
                  style={{ background: `${curG.meta.color}14`, border: `1px solid ${curG.meta.color}44` }}>
                  <div className="opacity-90">{unlockLine(curG.arch)}</div>
                  <KeywordGlossary tokens={groupKws} />
                </div>
              )}
              {/* Karten hängen an ihrer eigenen Inhaltshöhe (`items-start`, kein `gridAutoRows:1fr`/`h-full`).
                  Vorher zog `1fr` alle Karten auf die Höhe der GRÖSSTEN — kurze Skills bekamen viel Leerraum
                  darunter (Playtest-Beschwerde). Jetzt sitzt jede Karte eng an ihrem Text. */}
              <div className="sk-offers grid sm:grid-cols-2 gap-2 items-start">
                {curG.ids.map((id) => {
                  const s = skillDef(id);
                  const sel = pending === id;
                  const col = curG.meta.color;
                  return (
                    /* #kante: Karte in der Optik „Kante statt Fläche" (index.css .as-edge-card). Anders als beim
                       Perk-Angebot trägt die Kante hier die SELTENHEIT, nicht die Fraktion: man blättert die
                       Fraktionen einzeln durch, alle Karten einer Ansicht haben also dieselbe Fraktionsfarbe —
                       als Kante würde sie nichts unterscheiden. Legendär (Gold) sticht damit sofort heraus.
                       Die Fraktion steht weiterhin im Badge und in der Überschrift. */
                    <button key={id} onClick={() => clickSkill(id)}
                      className={`as-edge-card${sel ? " is-sel" : ""} text-left rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:-translate-y-0.5${s.legendary ? " as-legendary" : ""}`}
                      style={{ "--c": s.legendary ? "#e0b845" : "#8a8a95" }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${col}22`, color: col, border: `1px solid ${col}88` }}>
                          <ArchIcon meta={curG.meta} size={12} /> {curG.meta.label.toUpperCase()}
                        </span>
                        {(s.heatConsumer || s.onFullCharge) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#d4a63a22", color: "#d4a63a", border: "1px solid #d4a63a88" }}>
                            {t("skill.badge.consumer")}
                          </span>
                        )}
                        {s.legendary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>
                            {t("skill.badge.legendary")}
                          </span>
                        )}
                        {sel && <span className="text-[10px] font-bold" style={{ color: col }}>{t("skill.selected")}</span>}
                      </div>
                      <div className="font-bold text-[15px]" style={{ color: col }}>{s.name}</div>
                      {/* #387: volle Beschreibung — auch für Legendäre (kein erster-Satz-Zuschnitt mehr); umbricht per whitespace-pre-line. */}
                      <div className="text-sm opacity-75 leading-snug whitespace-pre-line"><GlossaryText text={s.desc} /></div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {held.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              {t("skill.held", { held: held.length, slots: slotsShown })}
            </div>
            {/* #201 P1 / #UI: gehaltene Skills zeigen ihre Beschreibung DIREKT (kein Antippen mehr) — man kann seinen
                Build auf einen Blick lesen. NEUTRAL (grau), damit sie nicht wie ein wählbares Angebot wirken. */}
            <div className="flex flex-col gap-2">
              {held.map((s) => (
                <div key={s.id} className="text-xs px-2.5 py-2 rounded leading-snug"
                  style={{ background: "#1c1c22", border: "1px solid #33333e" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArchIcon meta={ac(s.id)} size={13} />
                    <b style={{ color: "#c8c8d0" }}>{s.name}</b>
                    <span className="opacity-40 text-[11px]">{t("skill.heldBadge")}</span>
                  </div>
                  <div className="opacity-70 leading-snug whitespace-pre-line" style={{ color: "#cfcad8" }}><GlossaryText text={s.desc} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* #161 FB-1 / #UI: bei Eis-Relevanz die aktiven Formationen zeigen — Einfrieren biegt die Formationserkennung.
            Einklappbar (default zu), damit das Aufstellfeld nicht dauerhaft Platz frisst. */}
        {showFormations && !wide && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <button type="button" onClick={() => setOpenForms((o) => !o)} aria-expanded={openForms}
              className="w-full flex items-center gap-2 text-left" title={t(openForms ? "skill.forms.collapse" : "skill.forms.expand")}>
              <span className="text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1" style={{ color: "#7fd4f0" }}><FactionIcon type="ice" size={12} /> {t("skill.forms.head")}</span>
              <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all hover:brightness-125"
                style={{ color: "#7fd4f0", background: "#7fd4f014", border: "1px solid #7fd4f03a" }}>
                <span className="transition-transform" style={{ display: "inline-block", transform: openForms ? "rotate(90deg)" : "none" }}>▸</span>
                {t(openForms ? "skill.less" : "skill.more")}
              </span>
              <div className="flex-1 h-px" style={{ background: "#7fd4f033" }} />
            </button>
            {openForms && <div className="mt-3"><FormationPanel state={state} title={t("skill.forms.iceTitle")} /></div>}
          </div>
        )}
        </div>
      </LevelupRig>
      {/* Leitfaden-Overlay — vom i-Chip geöffnet, direkt auf der Seite des jeweiligen Archetyps (#UI). */}
      {guideArch && <GuideOverlay onClose={() => setGuideArch(null)} initial={guideArch} />}
    </div>
  ));
}
