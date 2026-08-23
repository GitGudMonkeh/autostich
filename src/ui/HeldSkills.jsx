import { ArchIcon } from "./FactionIcon.jsx";
import { GlossaryText } from "./Glossary.jsx";
import { CollapsibleField } from "./CollapsibleField.jsx"; // #UI: geteiltes Klappfeld (Perk-Auswahl, Chronik)
import { archetypeOf, isLegendarySkill } from "../game/skills.js";
import { SKILL_SLOTS } from "../game/constants.js";
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

/* GEHALTENE SKILLS — die Liste dessen, was der Lauf schon trägt, mit voller Beschreibung.

   Sie stand bis 19.08.2026 nur in der Skill-Auswahl. Beim Perk gilt aber dieselbe Frage: „Was habe ich
   eigentlich, und passt das dazu?" — ein Perk, der Ladung verbraucht, ist ohne Blitz-Skill eine andere
   Entscheidung. Deshalb steht die Liste jetzt auf BEIDEN Auswahl-Bildschirmen, und weil sie dort dieselbe
   sein soll, steht sie hier: eine Quelle, kein zweites Abschreiben.

   Ein-/ausklappbar über das geteilte `CollapsibleField` (dieselbe Bauform wie „Deck-Stärke" und
   „Dein Build" darunter) — offen als Standard, weil die Liste die Wahl begründet und nicht sucht.
   #held-merken: Reicht der Aufrufer `open`/`onToggle` herein, merkt er den Zustand (Perk- und
   Skill-Wahl tun das über `options.lvHeld`); ohne die beiden hält das Feld ihn wie bisher selbst.
   NEUTRAL gehalten (grau), damit die Zeilen nicht wie ein wählbares Angebot aussehen. */

// Archetyp-Meta eines Skills (Theming) — Fallback neutral, wie in der Skill-Auswahl.
const ac = (id) => archMeta(archetypeOf(id)) || { label: t("skill.arch.none"), icon: "•", color: "#8a8a95" };

export function HeldSkills({ skills = [], state = {}, className = "mt-5", open = null, onToggle = null }) {
  const held = skills.map((id) => skillDef(id)).filter(Boolean);
  if (!held.length) return null;
  /* Dieselbe Zählung wie in der Skill-Auswahl: Der legendäre Skill bringt seinen eigenen Slot mit,
     die Anzeige nennt deshalb `slots + legendär` (sonst stünde „7 / 6"). */
  const slotsShown = (state.skillSlots || SKILL_SLOTS) + skills.filter(isLegendarySkill).length;
  return (
    <CollapsibleField title={t("skill.held", { held: held.length, slots: slotsShown })} className={className}
      open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-2">
        {held.map((s) => (
          <div key={s.id} className="text-body-5 px-2.5 py-2 rounded leading-snug"
            style={{ background: "#1c1c22", border: "1px solid #33333e" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <ArchIcon meta={ac(s.id)} size={13} />
              <b style={{ color: "#c8c8d0" }}>{s.name}</b>
              <span className="opacity-40 text-meta-3">{t("skill.heldBadge")}</span>
            </div>
            <div className="opacity-70 leading-snug whitespace-pre-line" style={{ color: "#cfcad8" }}><GlossaryText text={s.desc} /></div>
          </div>
        ))}
      </div>
    </CollapsibleField>
  );
}
