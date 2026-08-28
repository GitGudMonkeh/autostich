/* ONBOARDING HINTS — the two visual forms (docs/tutorial-onboarding-design.md §5.1, mockups
   "Autostich Onboarding Mockups" boards 1 and 3–6).

   Banner: ONE quiet strip on a decision screen — the Zeile recipe (design-sprache §1: a neutral
   row inside a tinted panel, never a second tinted panel), an uppercase eyebrow in the tutorial
   accent, ✕, and the sentence. No pop-up in front of the real screen.

   Card: the centered blocking form — in this task only H1, the single blocking card the whole
   system allows. Modal shell + hairline like every hub modal (modalStyle.jsx).

   The "Mehr dazu ›" link renders ONLY when an onMore handler exists — T-O4 wires it to the
   Probierfeld deep link; until then the affordance simply is not there (contract: no dead
   controls). */
import { createContext, useContext, useEffect } from "react";
import { t } from "../../i18n/index.js";
import { MODAL_CARD, ModalHairline } from "../modalStyle.jsx";
import { overlayPortal } from "../overlayPortal.jsx";
import { HINT_DEFS, resolveAnchor, resolveBodyKey } from "./hintScript.js";

/* The tutorial voice's accent — the violet the guided run's eyebrow used. One constant, one
   place; deliberately NOT ARCHETYPE_META.lightning.color even though the value matches today:
   the tutorial voice must not change colour when an archetype is retuned. */
const TUT_ACCENT = "#8a7de0";

export const HintContext = createContext(null);

const CloseX = ({ onClick, size = 12 }) => (
  <button type="button" onClick={onClick} aria-label={t("hint.aria.close")}
    className="shrink-0 p-1.5 -m-1.5 transition-all hover:brightness-150">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9aa0b4"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </button>
);

/* Der Leucht-Rahmen der Tutorial-Stimme (Owner-Feedback aus dem ersten Playtest: die Tipps
   brauchen mehr Sichtbarkeit). Statisch — keine Animation, damit alle FX-Stufen ihn tragen. */
const TUT_GLOW = `0 0 0 1px ${TUT_ACCENT}59, 0 0 14px ${TUT_ACCENT}40`;

/* Referent-Markierung (Owner-Playtest 2026-08-28): solange eine Ereignis-Karte offen ist, wird
   das erklärte Feld (`data-hint-anchor`) in den Blick gescrollt und trägt den Tutorial-Glow.
   Inline-Styles mit Restore statt einer Klasse: die Elemente stylen ihre Schatten teils selbst,
   und der Effekt darf beim Schließen exakt den vorherigen Zustand hinterlassen. */
function useAnchorGlow(anchor) {
  useEffect(() => {
    if (!anchor) return;
    const el = document.querySelector(`[data-hint-anchor="${anchor}"]`);
    if (!el) return;
    const prev = { boxShadow: el.style.boxShadow, borderRadius: el.style.borderRadius };
    el.style.boxShadow = TUT_GLOW;
    if (!el.style.borderRadius) el.style.borderRadius = "10px";
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { /* alte Engines: ohne Scroll weiter */ }
    return () => { el.style.boxShadow = prev.boxShadow; el.style.borderRadius = prev.borderRadius; };
  }, [anchor]);
}

/* One banner. `hint` = { id, def, vars, bodyKey, anchor } resolved by the provider. */
export function HintBanner({ hint, onClose, onMore }) {
  const { def, vars } = hint;
  return (
    <div className="rounded-lg px-3 py-2.5 mb-2"
      style={{ background: "rgba(15,15,21,0.72)", border: `1px solid ${TUT_ACCENT}66`, boxShadow: TUT_GLOW }}
      role="note" data-hint={hint.id}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-meta-3 uppercase tracking-[0.14em]" style={{ color: TUT_ACCENT }}>
          {def.eyebrow === "suggest" ? t("hint.eyebrow.suggest") : t("hint.eyebrow")}
        </div>
        <CloseX onClick={onClose} />
      </div>
      <div className="text-body-5 leading-relaxed mt-1" style={{ color: "#cfcfd8" }}>
        {t(hint.bodyKey || def.bodyKey, vars)}
        {onMore && (
          <>
            {" "}
            <button type="button" onClick={onMore} className="whitespace-nowrap transition-all hover:brightness-125"
              style={{ color: "#26c6e6" }}>{t("hint.more")} ›</button>
          </>
        )}
      </div>
    </div>
  );
}

/* The slot a decision screen mounts under its header: one import, one line per screen. Renders
   nothing without a provider (tests, storybook-ish contexts) or when no hint is due. */
export function PhaseHintSlot({ screen }) {
  const ctl = useContext(HintContext);
  if (!ctl) return null;
  const hint = ctl.bannerFor(screen);
  if (!hint) return null;
  return <HintBanner hint={hint} onClose={() => ctl.dismiss(hint.id)}
    onMore={ctl.onMore ? () => ctl.onMore(hint) : null} />;
}

/* The H1 welcome card — grid place-items-center like the other centered dialogs (the guided
   run's playtest finding §15.1: horizontally AND vertically centered). Blocks the run beneath;
   the freeze itself is App's condition chain, fed by useHints. */
export function HintCardOverlay({ hint, onGo, onMore }) {
  if (!hint) return null;
  const { def, vars } = hint;
  return overlayPortal(
    <div className="fixed inset-0 overlay-root z-30 grid place-items-center p-4"
      style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}
      role="dialog" aria-modal="true" aria-label={t(def.titleKey, vars)} data-hint={hint.id}>
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={MODAL_CARD}>
        <ModalHairline />
        <div className="px-5 pb-5 pt-4 grid gap-3">
          <div className="text-meta-3 uppercase tracking-[0.14em]" style={{ color: TUT_ACCENT }}>{t("hint.eyebrow")}</div>
          <h2 className="text-title-6 font-bold">{t(def.titleKey, vars)}</h2>
          <div className="text-body-4 leading-relaxed whitespace-pre-line" style={{ color: "#cfcfd8" }}>
            {t(hint.bodyKey || def.bodyKey, vars)}
          </div>
          <button type="button" onClick={onGo}
            className="mt-1 w-full rounded-xl px-4 py-3 font-bold text-body-3 transition-all hover:brightness-110"
            style={{ background: "#26c6e6", color: "#06222a" }}>{t("hint.h1.go")}</button>
          {onMore && (
            <button type="button" onClick={onMore} className="text-body-5 transition-all hover:brightness-125"
              style={{ color: "#26c6e6" }}>{t("hint.more")} ›</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Die Ereignis-/UI-Hint-Karte im Stichspiel (T-O2, Mockup-Board 2): unten verankert, LEICHTER
   Scrim — das Ereignis, das sie benennt, bleibt sichtbar (der Referent ist der Spotlight, Papier
   §5.3). Der Lauf darunter ist über hints.freeze angehalten; „Weiter" lässt ihn weiterlaufen. */
export function EventHintCard({ hint, onGo, onMore }) {
  // Hook VOR dem Early-Return (rules-of-hooks); ohne Anker ist der Effekt ein No-op.
  useAnchorGlow(hint ? hint.anchor : null);
  if (!hint) return null;
  const { def, vars } = hint;
  return overlayPortal(
    <div className="fixed inset-0 overlay-root z-30 flex items-end justify-center p-4 pb-16"
      style={{ background: "#0c0c1066" }}
      role="dialog" aria-modal="true" aria-label={t("hint.eyebrow")} data-hint={hint.id}>
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ ...MODAL_CARD, boxShadow: TUT_GLOW }}>
        <ModalHairline />
        <div className="px-4 pb-4 pt-3 grid gap-2.5">
          <div className="text-meta-3 uppercase tracking-[0.14em]" style={{ color: TUT_ACCENT }}>{t("hint.eyebrow")}</div>
          <div className="text-body-4 leading-relaxed" style={{ color: "#e2e2e9" }}>
            {t(hint.bodyKey || def.bodyKey, vars)}
          </div>
          <div className="flex gap-2 mt-0.5">
            <button type="button" onClick={onGo}
              className="flex-1 rounded-xl px-4 py-2.5 font-bold text-body-4 transition-all hover:brightness-110"
              style={{ background: "#26c6e6", color: "#06222a" }}>{t("hint.btn.next")}</button>
            {onMore && (
              <button type="button" onClick={onMore}
                className="flex-1 rounded-xl px-4 py-2.5 text-body-4 transition-all hover:brightness-125"
                style={{ background: "rgba(15,15,21,0.72)", border: "1px solid rgba(150,150,170,0.12)", color: "#cfcfd8" }}>
                {t("hint.more")} ›</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Resolve an id into what the components consume. Kept here (not in useHints) so a screen test
   can render a banner from an id alone. bodyKey und anchor werden HIER aufgelöst (E5 wechselt
   beide mit dem Archetyp) — die Komponenten sehen nur noch Strings. */
export function resolveHint(id, ctx) {
  const def = HINT_DEFS[id];
  if (!def) return null;
  return { id, def, vars: def.vars ? def.vars(ctx) : undefined,
    bodyKey: resolveBodyKey(def, ctx), anchor: resolveAnchor(def, ctx) };
}
