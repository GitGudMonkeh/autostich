// Geteilte Panel-Primitive für die Fraktions-Indikatoren (AP3 #206 — „Gerüst zuerst").
// Vereinheitlicht den bisher überall inline wiederholten Panel-Look (#17171c / #26262e) und
// liefert eine kompakte Zähler-Zelle für Sekundär-Akkus (Asche/Schmieden; später Blitz/Eis/Pflanze).

import { PANEL_CARD } from "../modalStyle.jsx";
import { fmtNum } from "../../i18n/index.js"; // #sprache: Trennzeichen folgen der Sprache
import { archetypeOf } from "../../game/skills.js"; // #skillheim: Skill -> Archetyp (Registerwahrheit)
import { skillDef } from "../../i18n/labels.js";    // #sprache: übersetzter Skill-Name

// Alle Fraktions-/Indikator-Panels teilen die gemeinsame In-Run-Schale (Verlaufsfläche + Rahmen).
export const PANEL_STYLE = PANEL_CARD;

// Gerahmtes Indikator-Panel (wie HeatBar/ChargeBar/CrystalBar es tragen).
export function IndicatorPanel({ children, className = "" }) {
  return (
    <div className={`rounded-xl p-3 as-panel ${className}`} style={PANEL_STYLE}>
      {children}
    </div>
  );
}

// Gameplay-Neu-Aufbau Phase 3: einklappbare Fraktions-„Headline". Immer sichtbar: Icon · Name · Zustands-Chip
// (der „gleich knallt's"-Blick, glüht wenn `stateOn`) · Chevron. Das Detail (children) klappt auf/zu — so wird aus
// vier großen Bars je eine schlanke Zeile, deren Tiefe on demand kommt. Kollaps-Zustand hält der Aufrufer (Optionen).
// `ambient` (box-shadow-String) + `ambientPulse` (Klassenname) tragen das Archetyp-Eigen-Ambiente, das von der
// Battlefield-Fläche zu den Fraktions-Panels gewandert ist (#deckshop): eine an die Ressource gekoppelte Innen-Aura
// (Feuer warm / Blitz blau→violett), als eigene Ebene HINTER dem Inhalt (Puls beeinflusst den Text nicht).
export function FactionShell({ icon, name, color, stateText, stateOn = false, collapsed = false, onToggle, ambient = null, ambientPulse = null, className = "", footer = null, children }) {
  return (
    // isolation:isolate → eigener Stacking-Context, damit die negative-z Ambient-Ebene HINTER den Inhalt fällt,
    // ohne dass der Inhalt (oder ein absoluter Kind-Effekt wie ChargeBars as-blitz-pulse) positioniert werden muss.
    <div className={`rounded-xl p-3 as-panel as-panel-fac relative overflow-hidden ${className}`}
      style={{ ...PANEL_STYLE, border: `1px solid ${color}33`, isolation: "isolate", "--fac": color }}>
      {ambient && (
        <div aria-hidden="true" className={`absolute inset-0 rounded-xl pointer-events-none${ambientPulse ? ` ${ambientPulse}` : ""}`}
          style={{ zIndex: -1, boxShadow: ambient }} />
      )}
      <button type="button" onClick={onToggle} data-sfx="none" aria-expanded={!collapsed}
        className="w-full flex items-center gap-2 text-left">
        <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden="true">{icon}</span>
        <span className="font-bold text-sm" style={{ color }}>{name}</span>
        {stateText && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap"
            style={{ background: stateOn ? `${color}22` : "#20202a", color: stateOn ? color : "#8a8a92",
                     border: `1px solid ${stateOn ? `${color}66` : "#33333e"}` }}>{stateText}</span>
        )}
        <span className="flex-1 h-px" style={{ background: `${color}22`, minWidth: 6 }} />
        <span className="text-[11px] shrink-0" aria-hidden="true"
          style={{ color: "#6d7288", display: "inline-block", transition: "transform .15s", transform: collapsed ? "none" : "rotate(90deg)" }}>▸</span>
      </button>
      {!collapsed && <div className="fac-body grid gap-3 mt-2.5">{children}</div>}
      {/* #skillheim: Der Fuß trägt die gehaltenen Skills DIESES Archetyps (ab 1400 px, s. panelSkills unten).
          Er sitzt bewusst unter dem Detail und mit `mt-auto` am unteren Rand der Spur: in der Bank sind alle
          Spuren gleich hoch, so stehen die Skill-Zeilen aller Archetypen auf einer Linie. */}
      {footer}
    </div>
  );
}

/* #skillheim: Die Skills eines Archetyps als Chip-Zeile — die Zuordnung kommt aus dem Register
   (`archetypeOf`), sie ist also nicht erfunden, sondern die, nach der auch das Angebot gebaut wird.
   Gibt null zurück, wenn dieser Archetyp keinen Skill hält: eine leere Überschrift wäre nur Rauschen. */
export function PanelSkills({ skills = [], arch, color = "#e8e8ea" }) {
  const mine = (skills || []).filter((id) => archetypeOf(id) === arch);
  if (!mine.length) return null;
  return (
    <div className="mt-auto pt-2.5">
      <div className="flex flex-wrap gap-1.5 border-t pt-2" style={{ borderColor: `${color}22` }}>
        {mine.map((id) => (
          <span key={id} className="text-[10px] font-semibold rounded px-1.5 py-1 whitespace-nowrap"
            style={{ background: `${color}14`, color, border: `1px solid ${color}3a` }}>
            {skillDef(id).name}
          </span>
        ))}
      </div>
    </div>
  );
}

// #270.2 Ertrag-Meter: der Eigen-Score eines Archetyps, aufgeschlüsselt nach seinen NAMENTLICHEN Fantasien (Kanälen).
// „Auf einen Blick, wie mein Motor läuft": ein gestapelter Anteils-Balken zeigt, WELCHE Fantasie gerade trägt, die
// Summe die Größenordnung. NUR aktive Kanäle (value > 0) erscheinen — leere Fantasien bleiben aus (kein überfülltes
// Panel). Gibt null zurück, solange der Archetyp noch nichts eingespielt hat. `channels`: [{ label, value, color }].
const nfmt = (n) => fmtNum(Math.round(n));
export function YieldMeter({ title, channels = [], accent = "#e8e8ea" }) {
  const active = channels.filter((c) => c.value > 0);
  const total = active.reduce((t, c) => t + c.value, 0);
  if (total <= 0) return null;
  const single = active.length === 1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1.5">
        <span className="opacity-60">{title}</span>
        <span className="font-bold tabular-nums" style={{ color: accent }}>~{nfmt(total)}</span>
      </div>
      {/* Gestapelter Anteils-Balken — Segmentbreite = Anteil des Kanals am Eigen-Score (nur bei ≥2 Kanälen aussagekräftig).
          Jeder aktive Kanal bekommt eine MINDESTBREITE (Sichtbarkeit kleiner Kanäle wie Weißglut); der Boden wird den
          großen Segmenten anteilig abgezogen, Summe bleibt 100 %. Der WAHRE Anteil steht exakt im Tooltip + der Legende. */}
      {!single && (() => {
        const MIN_SEG = 0.06; // 6 % Mindestbreite je Kanal
        const floor = active.length * MIN_SEG < 1 ? MIN_SEG : 0; // Schutz bei sehr vielen Kanälen (dann kein Boden)
        const pctOf = (c) => (floor + (c.value / total) * (1 - active.length * floor)) * 100;
        return (
          <div className="flex w-full rounded-sm overflow-hidden" style={{ height: 10, background: "#26262e" }}>
            {active.map((c) => (
              <div key={c.label} title={`${c.label}: ${nfmt(c.value)} (${Math.round((100 * c.value) / total)} %)${c.hint ? ` — ${c.hint}` : ""}`}
                style={{ width: `${pctOf(c)}%`, background: c.color }} />
            ))}
          </div>
        );
      })()}
      {/* Legende: nur aktive Kanäle, Punkt + Name + Zahl. */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px]">
        {active.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-1" title={c.hint || undefined}>
            <span className="w-[8px] h-[8px] rounded-[2px] shrink-0" style={{ background: c.color }} />
            <span className="opacity-65">{c.label}</span>
            <b className="tabular-nums" style={{ color: c.color }}>{nfmt(c.value)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// Kompakte Zähler-Zelle: Icon + Zahl (+ optionales Label). Für Sekundär-Ressourcen, die als
// simpler hochzählender Wert dargestellt werden (kein Balken). `glow` = weicher Innen-/Icon-Schein.
export function CounterCell({ icon, value, label, color, glow = false, dim = false, title }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" title={title}
      style={{
        background: `${color}14`,
        border: `1px solid ${color}${dim ? "2a" : "55"}`,
        boxShadow: glow && !dim ? `inset 0 0 10px ${color}40` : undefined,
        opacity: dim ? 0.55 : 1,
      }}>
      <span className="leading-none flex items-center"
        style={{ filter: glow && !dim ? `drop-shadow(0 0 4px ${color})` : undefined }}>
        {icon}
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-bold text-sm tabular-nums" style={{ color }}>{value}</span>
        {label && <span className="text-[9px] opacity-55 mt-0.5 whitespace-nowrap">{label}</span>}
      </span>
    </div>
  );
}
