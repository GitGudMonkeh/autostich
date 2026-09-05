import { ArchIcon } from "./FactionIcon.jsx";
import { GlossaryText } from "./Glossary.jsx";
import { CollapsibleField } from "./CollapsibleField.jsx"; // #UI: geteiltes Klappfeld (Perk-Auswahl, Chronik)
import { archetypeOf, isLegendarySkill, tierOf } from "../game/skills.js";
import { SKILL_SLOT_LIMIT } from "../game/constants.js";
import { tierColor } from "../game/rarity.js"; // exp skill rework: die vier Skill-Stufen tragen die Farben der Raritätsleiter I–IV
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

/* exp skill rework (docs/skill-rework.md §1): Farbe und Badge einer Skill-Stufe (0 Normal … 3 Episch). Die Farben
   sind die der Raritätsleiter I–IV (rarity.js), damit „Selten" überall dieselbe Farbe hat; der Text kommt aus dem
   Katalog. Legendäre haben keine Stufe (tier null) und tragen ihr eigenes Gold-Badge. Geteilt mit der Skill-Auswahl,
   damit Angebot und Bestand dieselbe Stufe gleich zeigen — eine Quelle, kein zweites Abschreiben. */
export const skillTierColor = (tier) => tierColor((tier ?? 0) + 1);
export function SkillTierBadge({ tier, className = "text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide" }) {
  if (tier == null) return null;
  const col = skillTierColor(tier);
  return (
    <span className={className} style={{ background: `${col}22`, color: col, border: `1px solid ${col}88` }}>
      {t(`skill.tier.${tier}`).toUpperCase()}
    </span>
  );
}

export function HeldSkills({ skills = [], state = {}, className = "mt-5", open = null, onToggle = null }) {
  const held = skills.map((id) => skillDef(id)).filter(Boolean);
  if (!held.length) return null;
  /* Dieselbe Zählung wie in der Skill-Auswahl: Der legendäre Skill bringt seinen eigenen Slot mit,
     die Anzeige nennt deshalb `slots + legendär` (sonst stünde „7 / 6"). exp: Slots sind standardmäßig
     unbegrenzt (SKILL_SLOT_LIMIT) — dann zählt der Titel nur, was gehalten wird. */
  const rawSlots = state.skillSlots || SKILL_SLOT_LIMIT;
  const unlimited = rawSlots >= SKILL_SLOT_LIMIT;
  const slotsShown = rawSlots + skills.filter(isLegendarySkill).length;
  return (
    <CollapsibleField title={unlimited ? t("skill.held.free", { held: held.length }) : t("skill.held", { held: held.length, slots: slotsShown })}
      className={className} open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-2">
        {held.map((s) => (
          <div key={s.id} className="text-body-5 px-2.5 py-2 rounded leading-snug"
            style={{ background: "#1c1c22", border: "1px solid #33333e" }}>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <ArchIcon meta={ac(s.id)} size={13} />
              <b style={{ color: "#c8c8d0" }}>{s.name}</b>
              <SkillTierBadge tier={tierOf(state, s.id)} className="text-meta-3 px-1 py-px rounded font-bold tracking-wide" />
              {s.legendary && (
                <span className="text-meta-3 px-1 py-px rounded font-bold tracking-wide"
                  style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>{t("skill.badge.legendary")}</span>
              )}
              <span className="opacity-40 text-meta-3">{t("skill.heldBadge")}</span>
            </div>
            <div className="opacity-70 leading-snug whitespace-pre-line" style={{ color: "#cfcad8" }}><GlossaryText text={s.desc} /></div>
          </div>
        ))}
      </div>
    </CollapsibleField>
  );
}
