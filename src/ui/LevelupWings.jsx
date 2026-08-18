import { useIsWide } from "./useIsWide.js";
import { FormationPanel } from "./FormationPanel.jsx";
import { DeckStrength } from "./BuildSummary.jsx";
import { StatusRail } from "./StatusRail.jsx";
import { t } from "../i18n/index.js"; // #sprache

/* ============================================================
   #lv-fluegel — die Level-up-Karte bekommt ab 1400 px zwei ausklappbare Seitenleisten.

   Perk- und Skill-Wahl bleiben, was sie sind: eine KARTE ÜBER DEM BRETT, kein gerahmter Vollbild-Screen
   (bewusste Ausnahme vom Desktop-Pass — die anderen Screens ersetzen den Hub, diese hier unterbrechen
   einen laufenden Stich). Was auf dem Desktop fehlte, war nicht Rahmen, sondern PLATZ: der Spieler
   entscheidet über einen Perk, ohne sein Deck oder seine Multiplikatoren zu sehen, und beides lag
   direkt hinter dem Overlay.

   LINKS  = das eigene Deck: `FormationPanel` (Kartenraster + aktive Formationen + 🏗-Gebäude-Toggle,
            alles bereits vorhanden) und `DeckStrength`.
   RECHTS = `StatusRail` — dieselbe Komponente, die im Spiel rechts neben dem Brett steht. Kein
            Nachbau: sonst driften die Kennzahlen im Overlay von denen auf dem Brett weg.

   DREI REGELN, die den Entwurf tragen:

   1. **Die Karte rührt sich nicht.** Ein- und Ausklappen ändert weder Breite noch Position der Karte —
      die Flügel wachsen nach AUSSEN. Sonst bräche das Angebot mitten in der Entscheidung neu um.
   2. **Nichts wird verdeckt.** Die Flügel sind GESCHWISTER der Karte in einem Drei-Spuren-Raster
      (1fr · 924px · 1fr), keine Überlagerung — sie können per Konstruktion nichts überdecken. Wird das
      Fenster knapp, schrumpfen sie mit ihrer Spur (`max-width: 100%`), statt über die Karte zu laufen.
      Die 22-px-Bahn für die Griffe hält `.lv-cardwrap` als eigenen Rand frei; auch der Griff liegt also
      neben dem Text, nicht darauf. Die Mittelspur ist FEST, damit die Karte in allen vier Zuständen
      auf denselben Pixeln steht (gemessen — mit `auto` schrumpfte sie beim Zuklappen auf 784 px).
   3. **Unterhalb 1400 px gibt es das alles nicht.** `.lv-rig` ist dort `display: contents`, die Flügel
      und die Griffe werden gar nicht erst gerendert (`wide`-Gate). Die Handy-Fassung bleibt Knoten für
      Knoten dieselbe — sie ist gegen ein 390-px-Gerät abgestimmt und darf sich nicht bewegen.

   Der Zustand hängt in den OPTIONEN (`lvWingDeck` / `lvWingStats`), nicht im Komponenten-State: die
   Karte wird bei jedem Level-up neu gemountet, ein `useState` wäre also bei jeder Wahl wieder auf
   Default. Denselben Weg geht `lastSkillArch` schon (SkillSelect → onOption → changeOptions →
   saveOptions). BEIDE Schlüssel brauchen einen Eintrag in `DEFAULT_OPTIONS` — der
   `{...DEFAULT_OPTIONS, ...o}`-Merge in `loadOptions` schriebe sie sonst nie zurück.
   ============================================================ */

export const WING_DECK = "lvWingDeck";
export const WING_STATS = "lvWingStats";

/* Liegt das Deck gerade im linken Flügel? Die Karte fragt das, um ihre EIGENEN Deck-Klappfelder
   (Deck-Stärke, Formationen) dann wegzulassen — sonst stünden dieselben Daten zweimal im Bild, 20 cm
   nebeneinander. Zugeklappt kommen sie zurück; der Flügel ersetzt sie, er verdrängt sie nicht. */
export function deckWingOpen(options = {}, wide = false) {
  return wide && (options[WING_DECK] ?? true);
}

/* Der Griff an der Kartenkante. Zugeklappt zeigt der Pfeil nach AUSSEN („da ist mehr"), aufgeklappt
   nach INNEN („zumachen") — und trägt dann zusätzlich senkrecht den Namen dessen, was man gerade sieht.
   Ohne Beschriftung ist ein Pfeil am Rand nur ein Pfeil: man klickt ihn einmal aus Neugier und nie wieder. */
function Grip({ side, open, label, onClick, color }) {
  const arrow = side === "l" ? (open ? "›" : "‹") : (open ? "‹" : "›");
  return (
    <button type="button" onClick={onClick} aria-expanded={open} data-sfx="none"
      title={t(open ? "lv.wing.collapse" : "lv.wing.expand", { what: label })}
      aria-label={t(open ? "lv.wing.collapse" : "lv.wing.expand", { what: label })}
      className={`lv-grip lv-grip-${side} transition-all hover:brightness-125`}
      style={{ color, borderColor: `${color}6b`, background: open ? `${color}1f` : undefined }}>
      <span aria-hidden="true">{arrow}</span>
      {open && <span className="lv-grip-lbl" aria-hidden="true">{label}</span>}
    </button>
  );
}

export function LevelupRig({ accent = "#9b82f0", state = {}, deck = [], options = {}, onOption,
                             currentTraj = [], recordTraj = [], best = 0, children }) {
  const wide = useIsWide();
  // `?? true` ist der Default für Bestandsprofile, die den Schlüssel noch nicht kennen — die Leisten sind
  // der Grund für die breite Fassung, zugeklappt wäre der Desktop wieder so arm wie vorher.
  const deckOpen = wide && (options[WING_DECK] ?? true);
  const statsOpen = wide && (options[WING_STATS] ?? true);
  const flip = (key, on) => onOption && onOption({ [key]: !on });
  return (
    <div className="lv-rig">
      {deckOpen && (
        <aside className="lv-wing lv-wing-l" style={{ borderColor: `${accent}4d` }}>
          <FormationPanel state={state} />
          <div className="lv-wing-sep" style={{ background: `${accent}2e` }} />
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">{t("perk.deckStrength")}</div>
          <DeckStrength deck={deck} />
        </aside>
      )}

      <div className="lv-cardwrap w-full max-w-3xl">
        {wide && <Grip side="l" open={deckOpen} color={accent} label={t("lv.wing.deck")}
                       onClick={() => flip(WING_DECK, deckOpen)} />}
        {wide && <Grip side="r" open={statsOpen} color={accent} label={t("lv.wing.stats")}
                       onClick={() => flip(WING_STATS, statsOpen)} />}
        {children}
      </div>

      {statsOpen && (
        <aside className="lv-wing lv-wing-r" style={{ borderColor: `${accent}4d` }}>
          <StatusRail state={state} currentTraj={currentTraj} recordTraj={recordTraj}
                      options={options} onOption={onOption} best={best} />
        </aside>
      )}
    </div>
  );
}
