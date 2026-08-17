import { useState, useRef, useMemo, useEffect } from "react";
import { PANEL_BG, phaseCard, phasePanel, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { summarizeFormations, SEGMENT_SIZE, openSegmentInfo } from "../game/formations.js";
import { allianceGroups } from "../game/families.js";
import { hasPfahlwurzel, plantRootScore, plantSkillCount } from "../game/skills.js";
import { architectCoverFor, structLitPosOf, distrLitPosOf } from "./architectCover.js";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { ArchBuildingList, FormationLegend, ArchToggle } from "./ArchPanels.jsx";
import { audio } from "./audio.js";
import { haptics } from "./haptics.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { skillDef } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

const GOLD = "#d4a63a"; // #201.2: einheitliche Bestätigen-/Aktionsfarbe
// Summe aller Formations-Stärken (Σ mult−1 über alle Positionen) — Basis für das reaktive Delta (#95.6).
const strengthOf = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);
// #UI: Formations-Stärke als Bonus in % (statt Σ-Summe) — Σ(mult−1)·100.
const pctOf = (x) => Math.round(x * 100);

// #UI Aufstellung-Redesign: einklappbare Sektion (Referenz-Legende / Details) — gleiches Muster wie der Passiv-Toggle
// in der Skill-Auswahl. Default zu, damit die Aufstellung nicht von Referenztexten zugestellt wird.
function FormCollapse({ label, chipWord, color = "#8a7de0", open, onToggle, children }) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-2 text-left" title={t(open ? "form.collapse.close" : "form.collapse.open", { label })}>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
        <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all hover:brightness-125"
          style={{ color, background: `${color}14`, border: `1px solid ${color}3a` }}>
          <span className="transition-transform" style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
          {open ? t("form.collapse.less") : (chipWord || t("form.collapse.more"))}
        </span>
        <div className="flex-1 h-px" style={{ background: `${color}33` }} />
      </button>
      {open && <div className="mt-2 grid gap-3 content-start">{children}</div>}
    </div>
  );
}

/* Welche Positionen sind durch den letzten Tausch STÄRKER geworden?

   Rein, damit die Regel testbar bleibt — sie ist die ganze Bedingung für das Aufleuchten. Verglichen
   werden die Faktoren JE POSITION, nicht die Gesamtsumme: nur so leuchten genau die Karten, die
   wirklich Teil der neuen/stärkeren Formation sind. Eine Karte, die durch den Tausch nur den Platz
   gewechselt hat, ohne stärker zu werden, bleibt dunkel.

   `eps` fängt Fließkomma-Rauschen ab (Faktoren entstehen aus Produkten, ×1,25 × ×1,2 …). */
export function gainedPositions(prev, cur, eps = 0.001) {
  const out = new Set();
  if (!prev || !cur || prev.length !== cur.length) return out;
  for (let i = 0; i < cur.length; i++) if (cur[i] > prev[i] + eps) out.add(i);
  return out;
}

/* Formationsphase (V2 §22.8): pausiert den Run und öffnet die Deck-Aufstellung.
   Zwei Karten antippen = Tausch (1 Energie). Formationen werden nach jedem Tausch live neu berechnet
   (kommt aus state.formations, vom Reducer gefüllt). Undo/Zurücksetzen erstatten Energie.
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
export function FormationPhase({ state, onSwap, onUndo, onReset, onConfirm, options = {}, onOption }) {
  const { playerOrder = [], deck = [], formations = [], formationEnergy = 0, formationSwaps = [] } = state;
  const [sel, setSel] = useState(null);
  // Eis-Neudesign: der Gletscher-Build friert Karten als Gletscher fest (starr). Marker/Masse am Brett + Freeze-Button.
  const iceActive = (state.activeArchetypes || []).includes("ice");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const glacierLocked = state.glacierLocked || [];
  const glacierMass = state.glacierMass || [];
  const firnStack = state.firnStack || []; // #386 Firn-Boden-Reserve
  const glacierPos = useMemo(() => { const s = new Set(); glacierLocked.forEach((v, i) => { if (v) s.add(i); }); return s; }, [glacierLocked]);
  // #301 C3: gesperrte Aufstell-Zellen — fixiert (nicht tauschbar). disabledPos greift Klick + Ausgrauen; die Karte zählt
  // aber normal für Formationen (Scoring unverändert). Als Array für stabile Memo-Dep.
  const chLockForm = state.challengeBlockForm || [];
  const chLockFormSet = useMemo(() => new Set(chLockForm), [chLockForm.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  // Architekt-Gebäude-Overlay (#202): zeigt in der Aufstellung, welche Positionen von welchem Gebäude gebufft werden —
  // die andere Seite der „platzieren (Architekt) → routen (Aufstellung)"-Schleife. Toggle-bar, Default an. Der Wert-Boost
  // je Zelle kommt aus der ECHTEN Engine (precomputeArchitect + architectValueBonus), spiegelt also die Sieg-Rechnung.
  // #278: Zustand über die Optionen gemerkt (wie showForms/collapse*) — „aus" bleibt aus, statt jedes Mal auf „an" zu springen.
  const [showArch, setShowArchState] = useState(options.archShowBuildings !== false);
  const setShowArch = (v) => { const nv = typeof v === "function" ? v(showArch) : v; setShowArchState(nv); onOption?.({ archShowBuildings: nv }); };
  const [inspectBid, setInspectBid] = useState(null); // inspiziertes Gebäude: Liste ↔ Brett (Rahmen glüht), gesetzt per Karten-Auswahl ODER Listen-Klick — wie in der Chronik
  const [openLegend, setOpenLegend] = useState(false);   // #UI Aufstellung-Redesign: Referenz-Legende (Formationen & Rahmenfarben) einklappbar, default zu
  const [openDetails, setOpenDetails] = useState(false);  // #UI Aufstellung-Redesign: Gebäude · Perks · Eis-Effekte einklappbar, default zu
  const architect = state.architect;
   
  const archBuildings = (state.architectEnabled && architect && architect.buildings) || [];
  const hasArch = archBuildings.length > 0;
  // Gehaltene Eis-Skills, die die Formationserkennung beeinflussen (Keyword „formation") → im Formationsfenster
  // sichtbar machen. Reuse der bestehenden desc-Texte aus SKILL_DEFS (kein Desc↔Code-Drift).
  const iceFormSkills = (state.skills || []).filter((id) => {
    const d = skillDef(id);
    return d && d.archetype === "ice" && (d.keywords || []).includes("formation");
  });

  const cards = playerOrder.map((di) => deck[di]);
  // #UI: Gebäude-Overlay (Abdeckung je Position) + Struktur-/Distrikt-Positionen aus der GETEILTEN Quelle
  // (architectCover.js — identisch in Chronik/Victory/Ziel-Auswahlen), damit alle Ansichten dieselbe Rechnung zeigen.
  // [#229 T7] weiter memoisiert, damit nicht bei jeder Kachel-Auswahl neu gerechnet wird.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  const architectCover = useMemo(() => (hasArch ? architectCoverFor(state) : null), [hasArch, architect, playerOrder, deck]);
  const structLitPos = useMemo(() => structLitPosOf(state), [hasArch, archBuildings]); // eslint-disable-line react-hooks/exhaustive-deps
  const distrLitPos = useMemo(() => distrLitPosOf(state), [hasArch, archBuildings]); // eslint-disable-line react-hooks/exhaustive-deps
  // Pflanze (#211): Klick-Detail-Readout nur, wenn ein Pflanzen-Skill gehalten wird (sonst irrelevant).
  const plantHeld = plantSkillCount(state.skills || []) > 0;

  const clickPos = (pos) => {
    if (chLockFormSet.has(pos)) { audio.play("denied"); haptics.denied(); return; } // #301 C3: fixierte Zelle — nicht wählbar/tauschbar
    if (sel === null) { setSel(pos); setInspectBid(architectCover ? (architectCover[pos]?.bid ?? null) : null); return; }  // erste Karte wählen — Gebäude-Rahmen leuchtet
    if (sel === pos) { setSel(null); setInspectBid(null); return; }  // Abwählen — still
    // #132: erfolgreicher Tausch klingt wie ein Kartendreh (cardflip), nicht wie ein Button-Klick.
    if (formationEnergy > 0) { onSwap(sel, pos); audio.play("cardflip", { gain: 0.9 }); }
    else { audio.play("denied"); haptics.denied(); } // #110/#207: Tausch ohne Energie → verwehrt-Sound + distinkte Haptik
    setSel(null); setInspectBid(null);
  };

  const { count } = summarizeFormations(formations);
  const hasSwaps = (formationSwaps || []).length > 0;
  // #201.4: Karten, die in einem Tausch dieser Phase beteiligt waren, dezent ausgrauen (folgt der KARTE via id,
  // nicht dem Slot → übersteht Weg-und-zurück-Tausch; Undo/Reset ziehen die ids automatisch mit).
  const swappedIds = new Set((state.formationSwaps || []).flatMap((s) => [s.idA, s.idB]).filter(Boolean));
  // #FB Segmentarbeit (E_SEGMENT): welche Segmentgrenzen sind offen? Speist den Verbinder im CardGrid + den Intro-Text.
  const segInfo = openSegmentInfo(state.familyTiers);

  /* Aufleuchten nach einem GEWINNBRINGENDEN Tausch: Positionen, deren Formations-Faktor gegenüber dem
     Zustand VOR dem Tausch gestiegen ist, blitzen einmal in ihrer Formationsfarbe auf.

     Verglichen wird der Faktor JE POSITION, nicht die Gesamtsumme: nur so leuchten genau die Karten,
     die wirklich Teil der neuen/stärkeren Formation sind. Eine Position, die durch den Tausch nur
     ihren Platz gewechselt hat, ohne stärker zu werden, bleibt dunkel.

     `formations` ist eine neue Array-Instanz je Reducer-Schritt; der Vergleich hängt deshalb an den
     WERTEN (Faktor je Position), nicht an der Referenz. Beim Phasenwechsel (state.cycle) wird der
     Merker verworfen, sonst leuchtete die erste Ansicht der nächsten Aufstellung fälschlich auf. */
  const [flash, setFlash] = useState({ key: 0, pos: null });
  const prevMults = useRef({ cycle: null, mults: null });
  const multSig = formations.map((pf) => (pf && pf.mult) || 1).join(",");
  useEffect(() => {
    const cur = formations.map((pf) => (pf && pf.mult) || 1);
    const prev = prevMults.current;
    const same = prev.cycle === state.cycle && prev.mults && prev.mults.length === cur.length;
    if (same) {
      const gained = gainedPositions(prev.mults, cur);
      if (gained.size) setFlash((f) => ({ key: f.key + 1, pos: gained }));
    }
    prevMults.current = { cycle: state.cycle, mults: cur };
  }, [multSig, state.cycle]); // eslint-disable-line react-hooks/exhaustive-deps -- `formations` wechselt die Referenz je Render; die Signatur ist die stabile Dep
  // Nach dem Blitzen wieder abräumen — sonst bliebe die Klasse hängen und ein späterer Tausch derselben
  // Karte könnte den Keyframe nicht erneut starten.
  useEffect(() => {
    if (!flash.pos) return undefined;
    const id = setTimeout(() => setFlash((f) => ({ ...f, pos: null })), 800);
    return () => clearTimeout(id);
  }, [flash.key, flash.pos]);

  // Reaktives Delta (#95.6): Σ Formations-Stärke jetzt vs. Ausgangszustand der Phase, live nach jedem Tausch.
  const curStrength = strengthOf(formations);
  // #159: Baseline an die Phasen-/Rundenidentität (state.cycle) binden statt an den Overlay-Remount. So wird sie
  // beim Rundenwechsel deterministisch neu gesetzt — auch wenn die Komponente über Phasen hinweg NICHT neu mountet.
  const baseStrength = useRef({ cycle: null, base: null });
  if (baseStrength.current.cycle !== state.cycle && formations.length)
    baseStrength.current = { cycle: state.cycle, base: curStrength };
  const base = baseStrength.current.base;
  const delta = base === null ? 0 : curStrength - base;
  const deltaStr = t("form.delta", { sign: delta >= 0 ? "+" : "−", pct: pctOf(Math.abs(delta)) });
  /* #UI: Δ-Tönung für den Fortfahren-Knopf (Live-Feedback beim Tauschen) — grün/rot/neutral.
     #kante: Seit der Knopf keine gefüllte Goldfläche mehr ist, sondern dunkel mit Goldkante, brauchen die
     drei Töne die HELLE Fassung; die alten dunklen Werte (#155e31/#8a1e1e) waren für Text AUF Gold gedacht
     und wären auf dunklem Grund kaum zu sehen.
     (Die Nulllage zuerst zu prüfen hält die Zeile frei von der Folge „> … <", die der
      i18n-Textgreifer sonst als JSX-Textknoten missversteht.) */
  const deltaOnGold = Math.abs(delta) <= 0.001 ? "#c8c8d0" : (delta > 0.001 ? "#5ab87a" : "#e0605a");

  // #201.5: Pro-Segment-Stärke + Verbesserungs-Highlight. Analog zur Gesamt-Baseline oben, aber je 5er-Segment:
  // jedes Segment zeigt seine eigene Formations-Stärke am Bereichs-Label; ein seit Phasenbeginn stärker gewordenes
  // Segment wird grün, ein schwächeres dezent rot getönt. Rein anzeige-seitig (CardGrid rendert das Tönen).
  const segCount = Math.ceil((formations.length || 0) / SEGMENT_SIZE);
  const segStrength = Array.from({ length: segCount }, (_, s) => strengthOf(formations.slice(s * SEGMENT_SIZE, (s + 1) * SEGMENT_SIZE)));
  const segBaseline = useRef({ cycle: null, base: [] });
  if (segBaseline.current.cycle !== state.cycle && formations.length)
    segBaseline.current = { cycle: state.cycle, base: segStrength.slice() };
  const segDelta = segStrength.map((v, s) => v - (segBaseline.current.base[s] ?? v));

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl">
        <div className="relative w-full rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card"
          style={phaseCard(PHASE_ACCENTS.green)}>
        <PhaseHairline />
        {/* Kopf (#UI Aufstellung-Redesign): Titel + Glossar, Durchlauf-Score direkt darunter. */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>{t("form.eyebrow", { cycle: (state.cycle || 0) + 1 })}</div>
            <h2 className="text-xl font-bold">{t("form.title")}</h2>
          </div>
          <div className="ml-auto shrink-0"><GlossaryPanel /></div>
        </div>
        {state.lastCycleScore != null && <div className="mt-2"><RoundScoreBadge state={state} /></div>}

        {/* Hero-Stat-Leiste: der Formations-Bonus ist das, was der Spieler durch Tauschen maximiert → groß in Gold.
            Energie & das live-Δ wandern auf den (immer sichtbaren) Fortfahren-Knopf → direktes Feedback bei jedem Tausch. */}
        <div className="flex items-stretch mt-3 rounded-xl overflow-hidden" style={phasePanel(PHASE_ACCENTS.green)}>
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{t("form.bonus")}</span>
            <span className="font-pixel-dense leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 26, color: "#d4a63a" }}>{t("form.bonus.value", { pct: pctOf(curStrength) })}</span>
          </div>
          <div className="flex flex-col justify-center gap-1 px-4 py-2.5 text-right border-l" style={{ borderColor: "rgba(90,184,122,.30)" }}>
            <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{t("form.count")}</span>
            <span className="font-pixel-dense leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 19 }}>{count}</span>
          </div>
        </div>
        {/* Sticky-Aktionsleiste (#161 FB-4): Aktionen bleiben oben erreichbar — bei 8 Segmenten kein Scrollen nötig.
            #UI-Redesign: entschlackt — Δ steht jetzt im Hero-Wert, der Fortfahren-Untertitel entfällt (Energie/Formationen
            stehen oben in der Leiste). */}
        <div className="sticky top-0 z-20 -mx-5 px-5 py-2.5 mt-3 mb-3 flex flex-col gap-2" data-tut="form-energy"
             style={{ background: PANEL_BG, borderBottom: "1px solid #2a2a34" }}>
          {/* Rückgängig + Zurücksetzen teilen sich die volle Breite. */}
          <div className="flex gap-2">
            {/* #kante: Beides sind Auswege — neutral, ohne Farbsignal. */}
            <button onClick={onUndo} disabled={!hasSwaps} className="as-edge-neutral as-edge-thin flex-1 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
              style={{ opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>{t("form.undo")}</button>
            <button onClick={onReset} disabled={!hasSwaps} className="as-edge-neutral as-edge-thin flex-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap"
              style={{ opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>{t("form.reset")}</button>
          </div>
          {/* Fortfahren voll-breit — trägt das Live-Feedback (Differenz seit Durchlaufbeginn + Restenergie), damit man es
              bei jedem Tausch direkt sieht (der Knopf klebt oben, im Gegensatz zum scrollenden Hero-Wert). */}
          {/* #kante: „Fortfahren" ist das Ziel dieser Phase — starker Kanten-Knopf, einziger mit Glow. */}
          <button onClick={onConfirm} className="as-edge-strong w-full px-4 py-2 rounded-lg font-bold transition-all hover:brightness-110 flex flex-col items-center leading-tight"
            style={{ "--c": GOLD }}>
            <span className="text-sm">{t("form.confirm")}</span>
            <span className="text-[11px] mt-0.5" title={t("form.confirm.title")}>
              <span className="font-bold" style={{ color: deltaOnGold }}>Δ {deltaStr}</span>
              <span style={{ opacity: 0.55 }}>{t("form.energyLeft", { n: formationEnergy })}</span>
            </span>
          </button>
        </div>
        <p className="text-xs opacity-55 mb-2">
          {t("form.hint.pre")} <b>{t("form.hint.within")}</b> {t("form.hint.post", { size: SEGMENT_SIZE })}
          {segInfo.active && (segInfo.all
            ? <> — <span style={{ color: "#8be0a8" }}><b>{t("form.segwork")}</b> {t("form.segwork.all")}</span></>
            : <> — <span style={{ color: "#8be0a8" }}><b>{t("form.segwork")}</b> {t("form.segwork.marked")}</span></>)}.
        </p>

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0" data-tut="form-board">
            {/* Architekt-Overlay-Steuerung (#202): welche Karten liegen unter welchem Gebäude? Toggle + Kategorie-Legende. */}
            {hasArch && <ArchToggle on={showArch} onToggle={() => setShowArch((v) => !v)} />}
            <CardGrid cards={cards} formations={formations} roles={state.roles} anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }} selectedPos={sel} onTilePick={clickPos} quietTiles openSegments={segInfo} swappedIds={swappedIds} disabledPos={chLockFormSet} lockedPos={chLockFormSet} segStrength={segStrength} segDelta={segDelta} flashPos={flash.pos} flashKey={flash.key} architectCover={hasArch && showArch ? architectCover : null} structPos={hasArch && showArch ? structLitPos : null} distrPos={hasArch && showArch ? distrLitPos : null} glowBid={hasArch && showArch ? inspectBid : null}
              glacierPos={iceActive ? glacierPos : null} glacierMassByPos={iceActive ? glacierMass : null} firnStackByPos={iceActive ? firnStack : null} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-5 md:mt-0 grid gap-3 content-start">
            <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} familyTiers={state.familyTiers}
              arch={sel != null && architectCover ? architectCover[sel] : null}
              plantReadout={plantHeld}
              plantGrowth={sel != null && cards[sel] ? (state.growth?.[cards[sel].id] || 0) : 0}
              plantRoots={sel != null && cards[sel] ? plantRootScore(state.skills || [], state.growth?.[cards[sel].id] || 0) : 0}
              plantPfahl={hasPfahlwurzel(state.skills || [])} />
            {/* #UI-Redesign: Referenz-Legende (Formationen & Rahmenfarben) einklappbar — default zu, damit die
                Aufstellung nicht von der 7-zeiligen Textwand zugestellt wird. Wer's kennt, sieht sie nie. */}
            {/* Wrapper trägt den Tutorial-Anker: FormCollapse reicht keine Fremd-Props durch. */}
            <div data-tut="form-legend">
              <FormCollapse label={t("form.legend")} chipWord={t("form.legend.chip")} color="#5ab87a"
                open={openLegend} onToggle={() => setOpenLegend((o) => !o)}>
                {/* #UI: geteilte Legende (ArchPanels) — dieselbe Erklärung in Aufstellphase & Chronik. */}
                <FormationLegend state={state} />
              </FormCollapse>
            </div>

            {/* #UI-Redesign: Gebäude · Perks · Eis-Effekte einklappbar — default zu; nur zeigen, wenn es überhaupt Inhalt gibt. */}
            {(hasArch || (state.perks || []).length > 0 || iceFormSkills.length > 0) && (
              <FormCollapse label={hasArch ? t("form.details.arch", { n: archBuildings.length }) : t("form.details.plain")} color="#8a7de0"
                open={openDetails} onToggle={() => setOpenDetails((o) => !o)}>
                {/* #UI: geteilte Gebäude-Liste (ArchPanels) — identisch in Aufstellphase & Chronik. */}
                {hasArch && (
                  <ArchBuildingList buildings={archBuildings} cover={architectCover} inspectBid={inspectBid}
                    onInspect={(nb) => { if (nb != null) setShowArch(true); setInspectBid(nb); }} />
                )}
                <LayoutPerks perks={state.perks} familyTiers={state.familyTiers} />
                {/* Gehaltene Eis-Effekte auf die Formationserkennung — nur wenn welche gehalten werden (desc aus SKILL_DEFS). */}
                {iceFormSkills.length > 0 && (
                  <div className="grid gap-0.5 text-xs sm:text-[13px] leading-snug font-medium pt-2 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
                    <div className="font-bold inline-flex items-center gap-1" style={{ color: "#7fd4f0" }}><FactionIcon type="ice" size={13} /> {t("form.iceEffects")}</div>
                    {iceFormSkills.map((id) => (
                      <div key={id}>
                        <b style={{ color: "#8be0f8" }}>{skillDef(id).name}</b>
                        <span> — <GlossaryText text={skillDef(id).desc} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </FormCollapse>
            )}
          </div>
        </div>

        {/* Aktionen liegen jetzt in der Sticky-Leiste oben (#161 FB-4). */}
        </div>
      </div>
    </div>
  );
}
