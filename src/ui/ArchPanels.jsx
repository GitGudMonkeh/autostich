import { GlacierFormLegend } from "./GlacierFormLegend.jsx";
import FormIcon from "./FormIcon.jsx";
import { formationLabel, formationAbbr } from "./formationLabels.js"; // Namen/Kuerzel: EINE Quelle (Sprachpruefung A12)
import { archFamily, archCatDef, archCatList } from "../i18n/labels.js"; // #sprache: Gebäudename zur Anzeigezeit
import { ARCH_CAT } from "./indicators/vocab.js";
import { t, fmtNum } from "../i18n/index.js";
import { WIED_F2, WIED_F3, WIED_F4, WIED_STEP, ESKALATION_STEP, OVERLAP_BONUS,
  FARBBLOCK_BASE, TREPPE_BASE, WECHSEL_BASE, MAX_TREPPE_STEP, WECHSEL_MIN_DIFF } from "../game/formations.js";
import { FAMILY_DEFS } from "../game/families.js";

// #UI: Geteilte Bausteine für Aufstellphase UND Chronik (eine Quelle → keine getrennte Pflege).
const TIER_ROMAN = ["", "I", "II", "III", "IV"];

/* Formations-Legende: Typ → Erkennungsregel. Name und Kürzel kommen aus FORMATION_TYPES (kein zweites Register),
   der erklärende Halbsatz aus dem Katalog (`formlegend.<typ>`). Reihenfolge = Anzeigereihenfolge.
   #sprache: Die Sätze standen bis 18.08.2026 fest verdrahtet auf Deutsch hier — englische Spieler lasen mitten
   in einer sonst englischen Legende deutschen Fließtext. Die Ratsche in test/i18n-guards.test.js konnte das nicht
   sehen: ihr Greifer fischt JSX-Textknoten (>…<), nicht String-Literale in einer Konstanten-Tabelle.
   Die ZAHLEN bleiben in formations.js und werden je Sprache formatiert (wie in GlacierFormLegend) — der Katalog
   trägt nur Platzhalter, damit ein Balancing-Schritt die Legende nicht still zurücklässt. */
const dfmt = (x) => fmtNum(x);
// Die Faktoren-Leiter steht mit ZWEI Nachkommastellen (×1,25 / ×1,50 / ×1,80): sonst kürzt fmtNum die Nullen weg,
// und die Stufen lesen sich nicht mehr als eine Reihe. Überlappung/Grenzbonus bleiben bei der Kurzform.
const dfmt2 = (x) => fmtNum(x.toFixed(2));
const CROSS_BONUS = FAMILY_DEFS.E_SEGMENT?.tiers?.[4]?.crossBonus ?? 1.25; // Grenzbonus = Familienstufe E_SEGMENT IV
const formationRules = () => [
  ["wiederholung",   t("formlegend.wiederholung", { f2: dfmt2(WIED_F2), f3: dfmt2(WIED_F3), f4: dfmt2(WIED_F4), step: dfmt2(WIED_STEP) })],
  ["farbblock",      t("formlegend.farbblock", { base: dfmt2(FARBBLOCK_BASE), step: dfmt2(ESKALATION_STEP) })],
  ["treppe",         t("formlegend.treppe", { max: MAX_TREPPE_STEP, base: dfmt2(TREPPE_BASE), step: dfmt2(ESKALATION_STEP) })],
  ["wechsel",        t("formlegend.wechsel", { diff: WECHSEL_MIN_DIFF, base: dfmt2(WECHSEL_BASE), step: dfmt2(ESKALATION_STEP) })],
  ["anker",          t("formlegend.anker")],
  ["nachhall",       t("formlegend.nachhall")],
  ["formationskern", t("formlegend.formationskern")],
  ["grenzbonus",     t("formlegend.grenzbonus", { f: dfmt(CROSS_BONUS) })],
];

/* Gebäude-Umschalter „🏗 Gebäude an/aus" + Kategorie-Legende (#398). Stand vier Mal fast identisch im Code
   (Aufstellphase, Endscreen, Chronik, Lauf-Detail) — drei davon mit hartkodiert deutscher Beschriftung. Jetzt eine
   Quelle: Knopf UND Legende, durchgehend über t(). Der Aufrufer entscheidet weiter, OB er ihn zeigt (`hasArch`). */
export function ArchToggle({ on, onToggle }) {
  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">
      <button onClick={onToggle}
        className={`${on ? "as-edge" : "as-edge-neutral"} as-edge-thin px-2 py-1 rounded-lg font-bold`}
        style={on ? { "--c": ARCH_CAT.value.color } : undefined}>
        {t(on ? "form.arch.on" : "form.arch.off")}
      </button>
      {on && archCatList().map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 opacity-80" style={{ color: "#aab4c4" }}>
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color }} />{v.label}
        </span>
      ))}
    </div>
  );
}

/* Gebäude-Liste „🏗 Deine Gebäude": antippen lässt den Gebäude-Rahmen am Brett cyan leuchten (inspectBid) — und
   umgekehrt markiert das Antippen einer Karte im Gebäude den Eintrag. Geteilt von FormationPhase & ChronikOverview.
   `onInspect(nextBid)` bekommt die neue Auswahl (oder null); der Aufrufer blendet dabei die Gebäude ein (showArch). */
export function ArchBuildingList({ buildings = [], cover = null, inspectBid = null, onInspect, bare = false }) {
  if (!buildings.length) return null;
  /* `bare` lässt Kasten und Überschrift weg: im linken Flügel der Level-up-Karte (#lv-gebaeude) trägt der
     Ausklapp-Reiter beides bereits, ein eigener Rahmen darin wäre ein Panel im Panel. Die EINTRÄGE bleiben
     identisch — die Liste ist damit weiter eine Fassung, keine zweite. */
  const Schale = bare
    ? ({ children }) => <div>{children}</div>
    : ({ children }) => (
      <div className="rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
        <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 {t("arch.yourBuildings", { n: buildings.length })}</div>
        {children}
      </div>
    );
  return (
    <Schale>
      <div className="text-[10px] opacity-45 mb-1.5">{t("archpanels.tapHint")}</div>
      <div className="grid gap-1">
        {buildings.map((b) => {
          const fam = archFamily(b.familyId); if (!fam) return null;
          const anchor = Math.min(...b.footprint);
          const eff = cover?.[anchor]?.effects?.join(" · ") || "";
          const meta = archCatDef(fam.category) || {};
          const on = inspectBid === b.id;
          return (
            <button key={b.id} id={`arch-bld-${b.id}`} onClick={() => onInspect?.(on ? null : b.id)}
              className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] leading-snug flex flex-col gap-0.5 transition-all"
              style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                <b>{fam.name}</b>
                <span className="opacity-55">{fam.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: TIER_ROMAN[b.tier] || b.tier })}</span>
              </span>
              {eff && <span className="opacity-75">{eff}</span>}
            </button>
          );
        })}
      </div>
    </Schale>
  );
}

/* Referenz-Legende „Formationen & Rahmenfarben" — die ausführliche Fassung aus der Aufstellphase, jetzt geteilt mit der
   Chronik (statt einer eigenen Kurzfassung), damit beide dieselbe Erklärung zeigen. Eis-Legende hängt automatisch dran. */
export function FormationLegend({ state = {}, className = "" }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium">
        {/* Sprachprüfung A11/A12: aus FORMATION_TYPES generiert — vorher fehlten Nachhall/Kern/Grenzbonus in der
            Legende, obwohl die Karten-Badges sie zeigen, und der Anker stand mit einem festen Faktor da (×1,25),
            den er nur in einer von mehreren Quellen hat. */}
        {formationRules().map(([type, rule]) => (
          <div key={type}>
            <b style={{ color: "#8be0a8" }}>{formationAbbr(type)}</b>{" "}
            <span style={{ color: "#6fc48f" }}>{formationLabel(type)}</span> — {rule}
          </div>
        ))}
        <div style={{ color: "#d4a63a" }}>{t("archpanels.roleLegend")}</div>
        <div style={{ color: "#d4a63a" }}>{t("formlegend.overlap", { f2: dfmt(OVERLAP_BONUS[2]), f3: dfmt(OVERLAP_BONUS[3]), f4: dfmt(OVERLAP_BONUS[4]) })}</div>
        {/* Die vier Ziffern sind FARBIG (sie ZEIGEN die Rahmenfarbe) — deshalb steht der Satz in zwei Katalog-
            Schlüsseln statt in einem: eine Übersetzung mit Markup drin gäbe es sonst nur als HTML-String. */}
        <div style={{ color: "#9a9aa4" }}>{t("formlegend.frame")} (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — {t("formlegend.frame.hint")}</div>
      </div>
      <GlacierFormLegend state={state} />
    </div>
  );
}
