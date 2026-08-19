import { useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { archetypeOf, ARCHETYPE_ORDER } from "../game/skills.js";
import { ArchIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionButton } from "./modalStyle.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { LevelupRig } from "./LevelupWings.jsx"; // #lv-fluegel: Deck links, Kennzahlen rechts (ab 1400 px)
import { HeldSkills } from "./HeldSkills.jsx";   // gehaltene Skills — geteilt mit Skill- und Perk-Auswahl
import { skillArt } from "./skillArt.js";        // #skillart: Emblem je Skill (nur ab 1400 px gerendert)
import { useIsWide } from "./useIsWide.js";
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

/* #272 Legendär-Phase (Runde 29, build-defining): fixer 7. Slot, kein Tausch. Angebotsgröße skaliert mit
   der Build-Breite. Ablehnen → stattdessen normale Skill-Wahl (nie „verschwendet").
   Der Pool ist seit #369 §5a NICHT mehr auf die aktiven Fraktionen beschränkt, sondern umfasst alle
   freigeschalteten Archetypen — `buildLegendaryOffer` in engine.js entscheidet das, hier wird nur
   angezeigt, was kommt.

   #leg-gleich (19.08.2026): Dieser Screen läuft jetzt in derselben Bauform wie die Skill-Auswahl —
   Flügel, Reiterzeile, Archetyp-getönte Schale, Embleme, gehaltene Skills unten. Er war der letzte
   Auswahl-Screen mit eigener Bildsprache, und weil er direkt zwischen zwei Skill-Runden liegt, fiel
   genau das auf: dieselbe Handlung („nimm einen Skill"), zwei verschiedene Bildschirme.

   Was NICHT mitzieht, ist die Farbe der KARTEN: sie behalten den goldenen Funkelrahmen (`as-legendary`),
   und Augenbraue wie Titel bleiben gold. Die SCHALE trägt die Fraktionsfarbe wie drüben — der Rahmen
   sagt „wo bin ich", das Gold sagt „das hier ist die einmalige Wahl". Zwei Achsen ohne Konkurrenz,
   dieselbe Begründung wie am Rahmen der Skill-Auswahl. */
const GOLD = "#d4a63a";
const ac = (id) => archMeta(archetypeOf(id)) || { label: t("leg.fallbackLabel"), icon: "★", color: GOLD };

export function LegendarySelect({ offer = [], onPick, onDecline, onReroll = null, skills = [], state = {},
                                  options = {}, onOption = null, currentTraj = [], recordTraj = [], best = 0 }) {
  const legs = offer.map((id) => skillDef(id)).filter(Boolean);
  const rerollsLeg = state.rerollsLeg || 0; // M1: dedizierter R29-Reroll-Token
  const wide = useIsWide();

  /* Swipe-Pager je Archetyp — dieselbe Bedienung wie die Skill-Auswahl (SkillSelect §Pager).
     Ohne ihn stand hier eine lange Liste, in der die Fraktionen nur am Chip zu unterscheiden waren.
     Eine Seite je Archetyp, Ring (modulo), Pfeiltasten und Wischen; ab 1400 px stattdessen die
     Reiterzeile (#sk-reiter) — derselbe Zustand, nur eine zweite Darstellung. */
  const [pageState, setPageState] = useState(null);
  const tx = useRef(0);
  const dir = useRef(1);

  const groups = ARCHETYPE_ORDER
    .map((arch) => ({ arch, meta: archMeta(arch), list: legs.filter((s) => archetypeOf(s.id) === arch) }))
    .filter((g) => g.list.length);
  const nPages = groups.length;
  const page = nPages > 0 ? (((Number(pageState) || 0) % nPages) + nPages) % nPages : 0;
  const curG = groups[page];
  const prevG = nPages > 1 ? groups[(page - 1 + nPages) % nPages] : null;
  const nextG = nPages > 1 ? groups[(page + 1) % nPages] : null;
  const go = (d) => { dir.current = d < 0 ? -1 : 1; setPageState(nPages > 0 ? (((page + d) % nPages) + nPages) % nPages : 0); };
  const goTo = (i) => { dir.current = i > page ? 1 : (i < page ? -1 : dir.current); setPageState(i); };

  /* #kante: Die Schale trägt die Farbe des GEZEIGTEN Archetyps und wechselt beim Blättern mit —
     wortgleich zur Skill-Auswahl; `phaseCard` erwartet den Ton zusätzlich als "r,g,b". */
  const archAccent = curG
    ? { c: curG.meta.color, rgb: [1, 3, 5].map((i) => parseInt(curG.meta.color.slice(i, i + 2), 16)).join(",") }
    : PHASE_ACCENTS.gold;

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <LevelupRig accent={archAccent.c} state={state} deck={state.deck || []} options={options} onOption={onOption}
                  currentTraj={currentTraj} recordTraj={recordTraj} best={best}>
        {/* Maße wie in der Skill-Auswahl: unterhalb 1400 px eine FESTE Höhe (sonst springt die zentrierte
            Karte beim Archetyp-Wechsel in Position und Größe), darüber nur ein Deckel — dort bestimmen die
            Flügel die Höhe und der Rahmen darf am Inhalt enden. */}
        <div className="relative w-full rounded-2xl px-4 pb-6 overflow-y-auto overlay-card"
          style={{ ...phaseCard(archAccent, undefined, { quiet: wide }),
                   height: wide ? undefined : "min(92dvh, 760px)",
                   maxHeight: wide ? "min(92dvh, 760px)" : undefined }}>
          <PhaseHairline accent={archAccent} />
          <GlossaryPanel className="absolute top-3 right-3 z-10" />

          <div className="text-center mb-1 pt-6">
            <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>{t("leg.eyebrow")}</div>
            <h2 className="text-xl font-bold mt-1" style={{ color: GOLD }}>{t("leg.title")}</h2>
            {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
          </div>
          {/* #leg-gleich: Der Intro-Absatz ist RAUS. Er behauptete, das Angebot komme „nur aus Fraktionen,
              in denen du schon aktive Skills hast" — seit #369 §5a stimmt das nicht mehr (der Pool sind alle
              freigeschalteten Archetypen). Ein Hinweistext, der etwas Falsches sagt, ist schlimmer als keiner. */}

          <div className="flex flex-wrap items-stretch gap-2 mt-3">
            {onReroll && rerollsLeg > 0 && (
              <ActionButton kind="reroll" flex className="sk-actbtn lv-actbtn lv-actbtn-reroll" onClick={onReroll}>
                {t("leg.reroll")} <span className="opacity-70">({rerollsLeg})</span>
              </ActionButton>
            )}
            <ActionButton kind="decline" flex className="sk-actbtn lv-actbtn" onClick={onDecline}>{t("leg.decline")}</ActionButton>
          </div>

          {/* #sk-reiter: ab 1400 px die Reiterzeile statt des Pagers. `repeat(n,1fr)` statt fester Vier —
              `groups` filtert leere Fraktionen weg, es können 1–4 sein. */}
          {wide && nPages > 0 && curG && (
            <div className="sk-tabs mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${nPages}, minmax(0,1fr))` }}>
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
                      <span className="ml-auto text-[11px] opacity-45 tabular-nums">{g.list.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Archetyp-Navi unterhalb 1400 px: aktueller Typ mittig, Nachbarn links/rechts im Endlos-Ring. */}
          {!wide && nPages > 1 && curG && (
            <div className="mt-2">
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
                <button type="button" onClick={() => go(-1)}
                  className="flex items-center gap-1.5 min-w-0 text-left transition-all hover:brightness-125" title={t("skill.nav.prev")}>
                  <span className="font-bold text-lg leading-none" style={{ color: "#9aa0b4" }}>‹</span>
                  {prevG && <><ArchIcon meta={prevG.meta} size={14} /><span className="truncate text-[11px]" style={{ color: "#6d7288" }}>{prevG.meta.label}</span></>}
                </button>
                <span className="inline-flex items-center gap-1.5 font-bold text-sm px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ color: curG.meta.color, background: `${curG.meta.color}1f`, border: `1px solid ${curG.meta.color}55` }}>
                  <ArchIcon meta={curG.meta} size={14} /> {curG.meta.label}
                </span>
                <button type="button" onClick={() => go(1)}
                  className="flex items-center justify-end gap-1.5 min-w-0 text-right transition-all hover:brightness-125" title={t("skill.nav.next")}>
                  {nextG && <><span className="truncate text-[11px]" style={{ color: "#6d7288" }}>{nextG.meta.label}</span><ArchIcon meta={nextG.meta} size={14} /></>}
                  <span className="font-bold text-lg leading-none" style={{ color: "#9aa0b4" }}>›</span>
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {groups.map((g, i) => (
                  <button key={g.arch} type="button" onClick={() => goTo(i)} title={g.meta.label}
                    className="h-1.5 rounded-full transition-all" style={{ width: i === page ? 22 : 16, background: i === page ? g.meta.color : "#31313c" }} />
                ))}
              </div>
            </div>
          )}

          {curG && (
            <div tabIndex={0} className="outline-none mt-3"
              onKeyDown={(e) => { if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { go(1); e.preventDefault(); } }}
              onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - tx.current; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1); }}>
              {/* `gridAutoRows: 1fr` zieht ALLE Karten auf die Höhe der längsten — eine Playtest-Korrektur
                  (vorher hing die Höhe je Karte am Text und die Reihe wirkte zerrissen). Das ist KEIN Bruch
                  mit der Skill-Auswahl: die macht es ab 1400 px genauso (`.sk-offers` in index.css setzt dort
                  `grid-auto-rows: 1fr` + `align-items: stretch`). */}
              <div key={curG.arch} className="sk-offers grid gap-2 sm:grid-cols-2" style={{ gridAutoRows: "1fr",
                animation: `${dir.current < 0 ? "as-page-in-left" : "as-page-in-right"} .26s cubic-bezier(.22,.61,.36,1)` }}>
                {curG.list.map((s) => {
                  const meta = ac(s.id);
                  /* #skillart: Kopfstreifen NUR ab 1400 px — am Handy nähme die Bildzone den halben
                     Bildschirm. Das Gate sitzt im JSX, der Browser lädt die Bilder dort also gar nicht erst.
                     Die vier legendären Blitz-Embleme liegen bereits vor (SK_LIGHTNING_L01…L04); die übrigen
                     Fraktionen bekommen ihre, sobald sie gezeichnet sind — bis dahin gibt `skillArt` `null`
                     zurück und die Karte sieht aus wie ohne Bild. */
                  const art = wide ? skillArt(s.id) : null;
                  return (
                    /* #kante: Legendäre Wahl — Kanten-Karte MIT dem animierten Goldrahmen (`as-legendary`).
                       Der einzige Ort außer den Freischaltungen im Endscreen, wo beides zusammenkommt:
                       hier wählt man nur einmal pro Lauf, und das darf man sehen. */
                    <button key={s.id} onClick={() => onPick(s.id)}
                      className={`lv-offercard as-edge-card is-sel as-legendary${art ? " sk-offer-art" : ""} text-left rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:-translate-y-0.5`}
                      style={{ "--c": GOLD }}>
                      {/* Der Streifen liegt ABSOLUT über dem Kartenkopf und schiebt nichts — die Zeilen
                          darunter stehen an derselben Stelle wie ohne Bild, nur tiefer (`.sk-offer-art`). */}
                      {art && <img src={art} alt="" aria-hidden="true" className="sk-strip" loading="lazy" decoding="async" />}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}88` }}>
                          <ArchIcon meta={meta} size={12} /> {meta.label.toUpperCase()}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>
                          {t("skill.badge.legendary")}
                        </span>
                      </div>
                      <div className="lv-cardname font-bold text-[15px]" style={{ color: GOLD }}>{s.name}</div>
                      <div className="text-sm opacity-75 leading-snug whitespace-pre-line"><GlossaryText text={s.desc} /></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gehaltene Skills mit voller Beschreibung — dieselbe geteilte Liste wie in Skill- und Perk-Wahl.
              Gerade HIER zählt sie: die legendäre Wahl belegt den 7. Slot dauerhaft, man entscheidet sie
              gegen den Build, den man schon hat. */}
          <HeldSkills skills={skills} state={state} />
        </div>
      </LevelupRig>
    </div>
  ));
}
