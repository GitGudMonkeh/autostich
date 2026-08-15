import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx"; // #362 einheitliche Aktionsleiste oben
import { LOCALES } from "../i18n/index.js";
import { useT, useLocale } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()

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
   Wird dynamisch die Beschreibung des GEWÄHLTEN Zustands gezeigt. Die Zustands-IDs bleiben deutsch
   („aus"/„mobile"/„an") — sie stehen so im gespeicherten Profil; übersetzt wird nur das Label. */
const RFX_VALUES = ["aus", "mobile", "an"];

export function OptionsModal({ options, onChange, onClose }) {
  useEscape(onClose); // #58: Escape schließt (Backdrop unten)
  const t = useT();
  const [locale, setLocaleId] = useLocale();
  const rfx = RFX_VALUES.includes(options.reducedFx) ? options.reducedFx : "aus";
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel flex flex-col" style={MODAL_CARD}>
        <ModalHairline />
        <div className="p-6 overflow-y-auto">
        {/* #362 Aktionsleiste OBEN (sticky) — „Schließen" rechts, einheitlich. */}
        <ActionBar pad={6} bg={STICKY_HEAD_BG}>
          <span className="flex-1" />
          <ActionButton kind="secondary" onClick={onClose}>{t("common.close")}</ActionButton>
        </ActionBar>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>{t("options.eyebrow")}</div>
          <h2 className="text-xl font-bold mt-1">{t("options.title")}</h2>
        </div>

        <div className="grid gap-2.5">
          {/* #sprache: Sprachwahl ganz oben. Die Labels der Sprachen stehen bewusst in ihrer EIGENEN Sprache
              („Deutsch"/„English") — wer die aktuelle Sprache nicht lesen kann, findet die eigene trotzdem. */}
          <Row title={t("options.language.title")} desc={t("options.language.desc")}>
            <Segmented value={locale}
              options={LOCALES.map((l) => ({ v: l.id, label: l.label }))}
              onChange={(v) => { setLocaleId(v); onChange({ lang: v }); }} />
          </Row>
          {/* Retro-Skin (CRT) ist jetzt der feste Look des Spiels — immer an, kein Toggle mehr. */}
          {/* #110 Sound: Mute-Toggle + Lautstärke-Slider (persistiert über die Optionen). */}
          <Row title={t("options.mute.title")} desc={t("options.mute.desc")}>
            <Toggle on={!!options.muted} onClick={() => onChange({ muted: !options.muted })} />
          </Row>
          <Row title={t("options.sfx.title")} desc={t("options.sfx.desc")}>
            <input type="range" min="0" max="1" step="0.05" value={options.sfxVol ?? 0.4}
              disabled={!!options.muted}
              onChange={(e) => onChange({ sfxVol: Number(e.target.value) })}
              aria-label={t("options.sfx.aria")}
              style={{ width: 120, accentColor: "#5ab87a", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #111 Musik: eigener Lautstärke-Slider (Default 0,2). */}
          <Row title={t("options.music.title")} desc={t("options.music.desc")}>
            <input type="range" min="0" max="1" step="0.05" value={options.musicVol ?? 0.2}
              disabled={!!options.muted}
              onChange={(e) => onChange({ musicVol: Number(e.target.value) })}
              aria-label={t("options.music.aria")}
              style={{ width: 120, accentColor: "#8a7de0", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #363: Effekte reduziert — 3 Zustände (Aus/Mobile/An). Text OBEN, Segmented darunter (stack) → kein Quetschen
              auf schmalen Breiten. Beschreibung wechselt mit dem gewählten Zustand. Handy-Default „Mobile", Desktop „Aus". */}
          <Row stack title={t("options.rfx.title")} desc={t(`options.rfx.desc.${rfx}`)}>
            <Segmented value={rfx}
              options={RFX_VALUES.map((v) => ({ v, label: t(`options.rfx.${v}`) }))}
              onChange={(v) => onChange({ reducedFx: v })} />
          </Row>
          {/* #207: Haptik — kurzes Vibrations-Feedback bei Bestätigungen. Wirkt nur auf Touch-Geräten (Handy); System-„reduzierte Bewegung“ schaltet sie ohnehin ab. */}
          <Row title={t("options.haptics.title")} desc={t("options.haptics.desc")}>
            <Toggle on={options.haptics !== false} onClick={() => onChange({ haptics: options.haptics === false })} />
          </Row>
          {/* Perf-HUD — NUR im Preview-/Testbranch-Build sichtbar (in „main“ ausgeblendet). Steuert das
              FPS/Report-Overlay: aus = kein Overlay UND keine Aufzeichnung (Recorder mountet erst bei „an“). */}
          {import.meta.env.VITE_PREVIEW === "1" && (
            <Row title={t("options.perfHud.title")} desc={t("options.perfHud.desc")}>
              <Toggle on={!!options.perfHud} onClick={() => onChange({ perfHud: !options.perfHud })} />
            </Row>
          )}
          {/* #389 Floating-Text: Master-Schalter + drei Einzel-Schalter (Score · Multiplier · Win/Lose). „An" = sichtbar
              (Flag false). Master spiegelt „alle sichtbar" und setzt beim Umschalten alle drei zugleich. Score/Werte
              zählen unabhängig weiter — nur die aufsteigenden Popups verschwinden. Die großen Ansagen (Stark/Brutal/
              Irre/Gottgleich) sind bewusst NICHT ausblendbar und bleiben immer sichtbar. */}
          <Row title={t("options.float.title")} desc={t("options.float.desc")}>
            <Toggle
              on={!(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose)}
              onClick={() => {
                const anyVisible = !(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose);
                const hide = anyVisible; // etwas sichtbar → alles ausblenden; sonst alles einblenden
                onChange({ hideFloatScore: hide, hideFloatMult: hide, hideFloatWinLose: hide });
              }} />
          </Row>
          <div className="flex flex-col gap-2.5 pl-3 ml-1" style={{ borderLeft: "2px solid #8a7de044" }}>
            <Row title={t("options.float.score.title")} desc={t("options.float.score.desc")}>
              <Toggle on={!options.hideFloatScore} onClick={() => onChange({ hideFloatScore: !options.hideFloatScore })} />
            </Row>
            <Row title={t("options.float.mult.title")} desc={t("options.float.mult.desc")}>
              <Toggle on={!options.hideFloatMult} onClick={() => onChange({ hideFloatMult: !options.hideFloatMult })} />
            </Row>
            <Row title={t("options.float.winlose.title")} desc={t("options.float.winlose.desc")}>
              <Toggle on={!options.hideFloatWinLose} onClick={() => onChange({ hideFloatWinLose: !options.hideFloatWinLose })} />
            </Row>
          </div>
        </div>

        <div className="rounded-lg p-3 mt-3 text-xs text-center leading-snug" style={{ background: "#8a7de022", color: "#c9c0f0" }}>
          {t("options.footer")}
        </div>

        </div>
      </div>
    </div>
  );
}
