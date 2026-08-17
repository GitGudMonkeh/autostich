import { useRef, useState } from "react";
import { archetypeOf, ARCHETYPE_ORDER } from "../game/skills.js";
import { ArchIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

// #272 Legendär-Phase (Runde 29, build-defining): Legendäre NUR aus aktiven Fraktionen → fixer 7. Slot (kein Tausch).
// Angebotsgröße skaliert mit der Build-Breite (Mono 3 · Duo 2/Fraktion=4 · Trio 2/Fraktion=6).
// Ablehnen → stattdessen normale Skill-Wahl (nie „verschwendet"). Gold-Theming wie die Legendär-Rarität sonst.
const GOLD = "#d4a63a";
const ac = (id) => archMeta(archetypeOf(id)) || { label: t("leg.fallbackLabel"), icon: "★", color: GOLD };

export function LegendarySelect({ offer = [], onPick, onDecline, onReroll = null, state = {} }) {
  const legs = offer.map((id) => skillDef(id)).filter(Boolean);
  const rerollsLeg = state.rerollsLeg || 0; // M1: dedizierter R29-Reroll-Token

  /* Swipe-Pager je Archetyp — dieselbe Bedienung wie die Skill-Auswahl (SkillSelect §Pager).
     Seit die Phase bis zu drei Fraktionen anbietet (Trio = 6 Karten), stand hier sonst eine lange
     Liste, in der die Fraktionen nur am Chip zu unterscheiden waren. Eine Seite je Archetyp, Ring
     (modulo) wie drüben, Pfeiltasten und Wischen. */
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

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl">
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.gold)}>
          <PhaseHairline />
          <GlossaryPanel className="absolute top-3 right-3 z-10" />
          {/* Kopf im Muster der beiden Schwester-Panels (PerkSelect/SkillSelect): zentriert, Eyebrow `text-xs`,
              Überschrift `text-xl`, Rundenscore darunter. Vorher war diese Karte die einzige mit linksbündigem
              Kopf, einer Stufe größerer Überschrift und schmalerer Karte (max-w-2xl) — auf dem Handy las sich das
              zusammen mit dem langen Intro wie „reingezoomt", obwohl nichts skaliert war. */}
          <div className="text-center mb-1">
            <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>{t("leg.eyebrow")}</div>
            <h2 className="text-xl font-bold mt-1" style={{ color: GOLD }}>{t("leg.title")}</h2>
            {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
          </div>
          {/* Das Intro bleibt — es trägt die einzige Warnung, dass die Wahl unumkehrbar ist. Aber in der Dichte
              der übrigen Nebentexte (text-xs) statt als sechszeiliger text-sm-Block über dem halben Panel. */}
          <p className="text-xs opacity-70 mt-3 mb-1 leading-snug">
            {t("leg.intro.a")} <b>{t("leg.intro.slot")}</b> {t("leg.intro.b")} <b>{t("leg.intro.final")}</b>{t("leg.intro.c")}
          </p>
          <ActionBar pad={6}>
            {onReroll && rerollsLeg > 0 && <ActionButton kind="reroll" flex onClick={onReroll}>{t("leg.reroll")} <span className="opacity-70">({rerollsLeg})</span></ActionButton>}
            <ActionButton kind="decline" flex onClick={onDecline}>{t("leg.decline")}</ActionButton>
          </ActionBar>

          {/* Archetyp-Navi wie in der Skill-Auswahl: Nachbarn links/rechts im Endlos-Ring + Punkte. */}
          {nPages > 1 && curG && (
            <div className="mb-3">
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
            <div tabIndex={0} className="outline-none"
              onKeyDown={(e) => { if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { go(1); e.preventDefault(); } }}
              onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - tx.current; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1); }}>
              {/* `gridAutoRows: 1fr` zieht ALLE Karten auf die Höhe der längsten — vorher hing die Höhe
                  je Karte am Beschreibungstext, und die Reihe wirkte zerrissen (Playtest). Content-agnostisch:
                  ein neuer, längerer Legendär-Text verschiebt die Zeile mit, statt sie zu sprengen. */}
              <div key={curG.arch} className="grid gap-3 sm:grid-cols-2" style={{ gridAutoRows: "1fr",
                animation: `${dir.current < 0 ? "as-page-in-left" : "as-page-in-right"} .26s cubic-bezier(.22,.61,.36,1)` }}>
                {curG.list.map((s) => {
                  const meta = ac(s.id);
                  return (
                    /* #kante: Legendäre Wahl — Kanten-Karte MIT Schein UND dem animierten Goldrahmen
                       (`as-legendary`). Der einzige Ort außer den Freischaltungen im Endscreen, wo beides
                       zusammenkommt: hier wählt man nur einmal pro Lauf, und das darf man sehen. */
                    <button key={s.id} onClick={() => onPick(s.id)}
                      className="as-edge-card is-sel as-legendary text-left rounded-xl p-4 transition-all hover:brightness-110 flex flex-col gap-2"
                      style={{ "--c": GOLD }}>
                      <div className="flex items-center gap-2">
                        <ArchIcon meta={meta} size={18} />
                        <span className="font-bold text-lg leading-tight" style={{ color: GOLD }}>{s.name}</span>
                        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
                          style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}66` }}>{meta.label}</span>
                      </div>
                      <div className="text-sm leading-snug opacity-90 whitespace-pre-line"><GlossaryText text={s.desc} /></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
