import { PerkList, SkillList } from "./BuildSummary.jsx";
import { FIRST_SKILL_CYCLE } from "../game/constants.js";
import { DECK_BORDER } from "./modalStyle.jsx"; // #356: deck-getönter neutraler Struktur-Rahmen
import { t } from "../i18n/index.js";
import { archetypeOf } from "../game/skills.js"; // #skillheim: Skill -> Archetyp (Registerwahrheit)

/* Build-Übersicht unter dem Battlefield: links die gewählten Perks, rechts die Skills
   (Blitz-Archetyp). Beide anklickbar → Beschreibung. Deck-Histogramm sitzt als eigener
   „Chronik"-Block ganz unten (#28). */
/* #skillheim: `hideSkillArchs` nennt die Archetypen, deren Skills ab 1280 px in ihrer eigenen Spur der
   Instrumentenbank stehen (dort erklären sie den Balken darüber). Hier fallen sie dann weg — doppelt gezeigt
   wären sie nur Rauschen. Ohne die Liste (Handy, lg) zeigt das Panel wie bisher alle. */
export function BuildPanel({ perks, skills = [], familyTiers = {}, zins, heat = null, hideSkillArchs = null }) {
  const shownSkills = hideSkillArchs && hideSkillArchs.length
    ? (skills || []).filter((id) => !hideSkillArchs.includes(archetypeOf(id)))
    : skills;
  // `lv` statt `t`: der Parameter würde sonst den i18n-Leser `t` in dieser Funktion verdecken.
  const famCount = Object.values(familyTiers).filter((lv) => lv > 0).length;
  return (
    <div className="rounded-xl p-4 as-panel as-panel-deck" style={{ background: "linear-gradient(180deg,#1b1a24,#141019)", border: `1px solid ${DECK_BORDER}` }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            {t("build.perks.head", { count: perks.length + famCount })}
          </div>
          <PerkList perks={perks} familyTiers={familyTiers} zins={zins} empty={t("build.perks.emptyRun")} />
        </div>
        {/* #skillheim: Stehen ALLE gehaltenen Skills schon in ihren Fraktions-Spuren, entfällt die Spalte ganz —
            eine Überschrift „Skills — 0" mit dem Hinweis „ab Durchlauf 1 wählbar" wäre dort schlicht gelogen.
            Solange auch nur einer heimatlos ist (sein Panel steht gerade nicht), bleibt die Spalte. */}
        {!(hideSkillArchs && hideSkillArchs.length && shownSkills.length === 0) && (
          <div className="sm:border-l sm:pl-4" style={{ borderColor: DECK_BORDER }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              {t("build.skills.head", { count: shownSkills.length })}
            </div>
            <SkillList skills={shownSkills} heat={heat} empty={t("build.skills.emptyRun", { cycle: FIRST_SKILL_CYCLE })} />
          </div>
        )}
      </div>
    </div>
  );
}
