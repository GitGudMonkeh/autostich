import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx"; // #362 einheitliche Aktionsleiste oben

/* Optionen-Overlay (#41): erreichbar aus dem Menü UND im laufenden Run (dort pausiert
   der Lauf, solange offen). Bewusst erweiterbar — künftig Sound, Tempo-Default etc.
   Erste Option: der CRT-/Pixel-Skin-Toggle. */

/* Ein/Aus-Schalter im Stil der übrigen UI. */
function Toggle({ on, onClick }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative rounded-full transition-all shrink-0"
      style={{
        width: 46, height: 26,
        background: on ? "#d4a63a" : "#30303a",
        border: `1px solid ${on ? "#d4a63a" : "#3a3a44"}`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full transition-all"
        style={{
          width: 20, height: 20, background: "#f2f2f4",
          transform: "translateY(-50%)",
          left: on ? 22 : 2,
        }}
      />
    </button>
  );
}

/* 3-Wege-Auswahl (z. B. Auto/An/Aus) im Stil der übrigen UI. */
function Segmented({ value, options, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid #3a3a44" }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} role="radio" aria-checked={on} onClick={() => onChange(o.v)}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: on ? "#d4a63a" : "#25252e", color: on ? "#141419" : "#c8c8d0" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Eine Options-Zeile: Titel + Beschreibung links, Steuerung rechts. `stack` (#363) → Text OBEN, Steuerung darunter
   (voll-breit) — für Zeilen mit breiter Steuerung + langem Text (z. B. „Effekte reduziert"), damit auf schmalen
   Breiten weder Text noch die Knöpfe gequetscht werden. */
function Row({ title, desc, children, stack = false }) {
  return (
    <div className={`rounded-lg p-3 ${stack ? "flex flex-col gap-2.5" : "flex items-center gap-3"}`} style={{ background: "#20202a" }}>
      <div className="flex-1">
        <div className="font-bold text-sm">{title}</div>
        {desc && <div className="text-sm opacity-70 leading-snug">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

/* #363 „Effekte reduziert" — 3 Zustände mit je eigener, kurzer Beschreibung (statt eines überladenen Satzes).
   Wird dynamisch die Beschreibung des GEWÄHLTEN Zustands gezeigt. */
const RFX_OPTIONS = [
  { v: "aus", label: "Aus" },       // full
  { v: "mobile", label: "Mobile" }, // balanced/lite
  { v: "an", label: "An" },         // minimal
];
const RFX_DESC = {
  aus: "Volle Effekte.",
  mobile: "Ausgewogen: Karten-Flip, Hintergrund, Glow & Finisher bleiben; Screen-Shake, Funken-Fontänen, Blur & Sweeps aus. Schont schwächere Geräte.",
  an: "Alle Effekte minimal — maximal ruhig, entlastet schwache Geräte stark.",
};

export function OptionsModal({ options, onChange, onClose }) {
  useEscape(onClose); // #58: Escape schließt (Backdrop unten)
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel flex flex-col" style={MODAL_CARD}>
        <ModalHairline />
        <div className="p-6 overflow-y-auto">
        {/* #362 Aktionsleiste OBEN (sticky) — „Schließen" rechts, einheitlich. */}
        <ActionBar pad={6} bg={STICKY_HEAD_BG}>
          <span className="flex-1" />
          <ActionButton kind="secondary" onClick={onClose}>Schließen</ActionButton>
        </ActionBar>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Optionen</div>
          <h2 className="text-xl font-bold mt-1">Einstellungen</h2>
        </div>

        <div className="grid gap-2.5">
          {/* Retro-Skin (CRT) ist jetzt der feste Look des Spiels — immer an, kein Toggle mehr. */}
          {/* #110 Sound: Mute-Toggle + Lautstärke-Slider (persistiert über die Optionen). */}
          <Row title="Ton stumm" desc="Schaltet alle Klick- und Spiel-Sounds ab.">
            <Toggle on={!!options.muted} onClick={() => onChange({ muted: !options.muted })} />
          </Row>
          <Row title="Effekt-Lautstärke" desc="Lautstärke der Klick-/Spiel-Sounds (SFX).">
            <input type="range" min="0" max="1" step="0.05" value={options.sfxVol ?? 0.4}
              disabled={!!options.muted}
              onChange={(e) => onChange({ sfxVol: Number(e.target.value) })}
              aria-label="SFX-Lautstärke"
              style={{ width: 120, accentColor: "#5ab87a", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #111 Musik: eigener Lautstärke-Slider (Default 0,2). */}
          <Row title="Musik-Lautstärke" desc="Lautstärke der Hintergrundmusik.">
            <input type="range" min="0" max="1" step="0.05" value={options.musicVol ?? 0.2}
              disabled={!!options.muted}
              onChange={(e) => onChange({ musicVol: Number(e.target.value) })}
              aria-label="Musik-Lautstärke"
              style={{ width: 120, accentColor: "#8a7de0", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #363: Effekte reduziert — 3 Zustände (Aus/Mobile/An). Text OBEN, Segmented darunter (stack) → kein Quetschen
              auf schmalen Breiten. Beschreibung wechselt mit dem gewählten Zustand. Handy-Default „Mobile", Desktop „Aus". */}
          <Row stack title="Effekte reduziert" desc={RFX_DESC[options.reducedFx] || RFX_DESC.aus}>
            <Segmented value={RFX_DESC[options.reducedFx] ? options.reducedFx : "aus"}
              options={RFX_OPTIONS}
              onChange={(v) => onChange({ reducedFx: v })} />
          </Row>
          {/* #207: Haptik — kurzes Vibrations-Feedback bei Bestätigungen. Wirkt nur auf Touch-Geräten (Handy); System-„reduzierte Bewegung“ schaltet sie ohnehin ab. */}
          <Row title="Haptik (Vibration)" desc="Kurzes Vibrieren bei Bestätigungen. Nur auf Touch-Geräten (Handy) spürbar; System-Einstellung „reduzierte Bewegung“ wird respektiert.">
            <Toggle on={options.haptics !== false} onClick={() => onChange({ haptics: options.haptics === false })} />
          </Row>
          {/* #telemetrie: anonyme Lauf-Daten (Beta-Playtest) — Default an, hier abschaltbar. Bewusst mit klarer
              Ansage, WAS gesendet wird und was nicht, statt einer nichtssagenden „Diagnosedaten"-Formel. */}
          <Row title="Anonyme Spieldaten senden"
            desc="Sendet nach jedem Lauf Score, gewählte Perks/Skills/Gebäude und den Fortschritt — anonym und ohne Namen. Hilft beim Balancing. Aus = es wird nichts gesendet.">
            <Toggle on={options.telemetry !== false} onClick={() => onChange({ telemetry: options.telemetry === false })} />
          </Row>
          {/* Perf-HUD — NUR im Preview-/Testbranch-Build sichtbar (in „main“ ausgeblendet). Steuert das
              FPS/Report-Overlay: aus = kein Overlay UND keine Aufzeichnung (Recorder mountet erst bei „an“). */}
          {import.meta.env.VITE_PREVIEW === "1" && (
            <Row title="FPS-Zähler & Report" desc="Blendet oben rechts FPS · p95 · Jank ein und zeichnet Perf-Daten auf (⧉ Report → Konsole + Zwischenablage). Nur im Testbranch. Aus = keine Anzeige und keine Messung.">
              <Toggle on={!!options.perfHud} onClick={() => onChange({ perfHud: !options.perfHud })} />
            </Row>
          )}
          {/* #389 Floating-Text: Master-Schalter + drei Einzel-Schalter (Score · Multiplier · Win/Lose). „An" = sichtbar
              (Flag false). Master spiegelt „alle sichtbar" und setzt beim Umschalten alle drei zugleich. Score/Werte
              zählen unabhängig weiter — nur die aufsteigenden Popups verschwinden. Die großen Ansagen (Stark/Brutal/
              Irre/Gottgleich) sind bewusst NICHT ausblendbar und bleiben immer sichtbar. */}
          <Row title="Floating-Text anzeigen" desc="Aufsteigende Zahlen/Texte über dem Feld. Master-Schalter für alle drei unten. Die großen Ansagen (Stark/Brutal/Irre/Gottgleich) bleiben immer sichtbar.">
            <Toggle
              on={!(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose)}
              onClick={() => {
                const anyVisible = !(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose);
                const hide = anyVisible; // etwas sichtbar → alles ausblenden; sonst alles einblenden
                onChange({ hideFloatScore: hide, hideFloatMult: hide, hideFloatWinLose: hide });
              }} />
          </Row>
          <div className="flex flex-col gap-2.5 pl-3 ml-1" style={{ borderLeft: "2px solid #8a7de044" }}>
            <Row title="↳ Score" desc="Aufsteigende Punktzahlen bei gewonnenen Stichen.">
              <Toggle on={!options.hideFloatScore} onClick={() => onChange({ hideFloatScore: !options.hideFloatScore })} />
            </Row>
            <Row title="↳ Multiplikator" desc="„Kritisch!“- und Formations-Text (Multiplikator-Boni).">
              <Toggle on={!options.hideFloatMult} onClick={() => onChange({ hideFloatMult: !options.hideFloatMult })} />
            </Row>
            <Row title="↳ Sieg / Niederlage" desc="Gewonnen/Verloren-Text am Stich-Ausgang.">
              <Toggle on={!options.hideFloatWinLose} onClick={() => onChange({ hideFloatWinLose: !options.hideFloatWinLose })} />
            </Row>
          </div>
        </div>

        <div className="rounded-lg p-3 mt-3 text-xs text-center leading-snug" style={{ background: "#8a7de022", color: "#c9c0f0" }}>
          Weitere Optionen (Tempo-Default …) folgen hier.
        </div>

        </div>
      </div>
    </div>
  );
}
