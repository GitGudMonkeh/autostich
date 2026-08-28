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
import { createContext, useContext } from "react";
import { t } from "../../i18n/index.js";
import { MODAL_CARD, ModalHairline } from "../modalStyle.jsx";
import { overlayPortal } from "../overlayPortal.jsx";
import { HINT_DEFS } from "./hintScript.js";

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

/* One banner. `hint` = { id, def, vars } resolved by the provider. */
export function HintBanner({ hint, onClose, onMore }) {
  const { def, vars } = hint;
  return (
    <div className="rounded-lg px-3 py-2.5 mb-2"
      style={{ background: "rgba(15,15,21,0.72)", border: "1px solid rgba(150,150,170,0.12)" }}
      role="note" data-hint={hint.id}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-meta-3 uppercase tracking-[0.14em]" style={{ color: TUT_ACCENT }}>
          {def.eyebrow === "suggest" ? t("hint.eyebrow.suggest") : t("hint.eyebrow")}
        </div>
        <CloseX onClick={onClose} />
      </div>
      <div className="text-body-5 leading-relaxed mt-1" style={{ color: "#cfcfd8" }}>
        {t(def.bodyKey, vars)}
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
            {t(def.bodyKey, vars)}
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

/* Resolve an id into what the components consume. Kept here (not in useHints) so a screen test
   can render a banner from an id alone. */
export function resolveHint(id, ctx) {
  const def = HINT_DEFS[id];
  if (!def) return null;
  return { id, def, vars: def.vars ? def.vars(ctx) : undefined };
}
