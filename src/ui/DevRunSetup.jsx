import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { N_POS } from "../game/architect.js";
import { buildSchedule } from "../game/constants.js";
import { RULE_LIMITS, DEFAULT_RULES } from "../game/rules.js";
import { useEscape } from "./useEscape.js"; // #350: Esc/Zurück schließt (Konsistenz mit den anderen Overlays)
import { ActionButton } from "./modalStyle.jsx";
import { t } from "../i18n/index.js"; // #sprache
import { loadDevRunLast, saveDevRunLast, loadDevRunPresets, saveDevRunPresets, upsertDevRunPreset, removeDevRunPreset } from "../game/storage.js";
import { DECISION_TOKENS, PLAN_TOKENS, MIN_ROUNDS, MAX_ROUNDS, distribute,
  normalizeConfig, toDevAction } from "./devRunConfig.js";

/* Dev-Run-Setup — ein frei konfigurierbarer Lauf zum Testen. exp: der Regel-Spielplatz für den Kernloop.
   Rundenzahl, Angebotstypen und Pro-Runde-Plan, Regeln je Lauf (Skills je Fraktion,
   Fraktionen, Slots, Perks), Voll-Katalog als Schalter, Baupunkte/Energie, Presets (lokal gespeichert).
   Rein UI: die Config lebt als Daten in devRunConfig.js; hier wird sie nur bearbeitet und via onStart gereicht. */

const COLOR = { skill: "#8a7de0", perk: "#5ab87a", formation: "#5a8ade", shop: "#e0605a" };
const RULE_KEYS = ["skillsPerArch", "maxArchetypes", "skillSlots", "perksOffered"];
const label = (tk) => t(`dev.run.type.${tk}`);

export function DevRunSetup({ onStart, onClose }) {
  useEscape(onClose); // #350: Escape schließt das Fenster
  const [cfg, setCfg] = useState(() => normalizeConfig(loadDevRunLast())); // zuletzt benutzte Config, sonst Standard
  const [presets, setPresets] = useState(() => loadDevRunPresets());
  const [presetName, setPresetName] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const { rounds, enabled, schedule, cover, energy, fullCatalog, rules } = cfg;
  // Jede Änderung läuft durch normalizeConfig: Plan auf die Rundenzahl bringen, abgewählte Typen ersetzen, Regeln klemmen.
  const update = (patch) => setCfg((prev) => normalizeConfig({ ...prev, ...patch }));

  const enabledOrdered = DECISION_TOKENS.filter((tk) => enabled.includes(tk));

  // Typ an-/abwählen. Mind. ein Plan-Typ bleibt aktiv. (exp skill rework: keine Legendär-Phase mehr im Plan.)
  const toggleType = (tk) => {
    const next = enabled.includes(tk) ? enabled.filter((x) => x !== tk) : [...enabled, tk];
    if (!PLAN_TOKENS.some((x) => next.includes(x))) return;
    update({ enabled: next });
  };
  const evenDistribute = () => update({ schedule: distribute(rounds, enabled) });
  const standardPlan = () => update({ schedule: buildSchedule(rounds) });
  const setRound = (i, tk) => update({ schedule: schedule.map((x, j) => (j === i ? tk : x)) });
  const setRule = (key, raw) => update({ rules: { ...rules, [key]: raw } });
  const counts = DECISION_TOKENS.map((tk) => ({ tk, n: schedule.filter((x) => x === tk).length })).filter((c) => c.n > 0);

  const savePreset = () => {
    const next = upsertDevRunPreset(presets, presetName, cfg);
    if (next === presets) return;
    setPresets(saveDevRunPresets(next));
    setPresetName("");
  };
  const loadPreset = (p) => setCfg(normalizeConfig(p.cfg));
  const deletePreset = (name) => setPresets(saveDevRunPresets(removeDevRunPreset(presets, name)));

  const start = () => { saveDevRunLast(cfg); onStart(toDevAction(cfg)); };

  const panel = { background: "#17171c", border: "1px solid #26262e" };
  const box = { background: "#141419", border: "1px solid #26262e" };
  const field = { background: "#0f0f13", border: "1px solid #30303a", color: "#e8e8ea" };
  const plainBtn = { background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" };
  const chip = (active, color) => ({
    background: active ? `${color}26` : "#1c1c22",
    border: `1px solid ${active ? color : "#30303a"}`,
    color: active ? color : "#8a8a92",
  });

  return overlayPortal((
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-lg my-6 rounded-2xl px-5 pb-5 flex flex-col gap-4 as-panel" style={panel} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit ✕ STICKY → beim Scrollen der Konfiguration oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        <div className="sticky top-0 z-20 -mx-5 px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: "#17171c" }}>
          <div>
            <h2 className="text-title-5 font-bold ty-display" style={{ color: "#d4a63a" }}>{t("dev.run.title")}</h2>
            <p className="text-body-5 opacity-55">{t("dev.run.sub")}</p>
          </div>
          <ActionButton kind="secondary" onClick={onClose}>{t("common.close")}</ActionButton>
        </div>

        {/* Rundenzahl */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={box}>
          <div className="flex items-center justify-between">
            <span className="text-body-lg-5 font-semibold">{t("dev.run.cycles")}</span>
            <input type="number" min={MIN_ROUNDS} max={MAX_ROUNDS} value={rounds}
              onChange={(e) => update({ rounds: e.target.value })}
              className="w-16 text-right px-2 py-1 rounded text-body-lg-5 ty-num" style={field} />
          </div>
          <input type="range" min={MIN_ROUNDS} max={MAX_ROUNDS} value={rounds} onChange={(e) => update({ rounds: e.target.value })} className="w-full" />
          <div className="text-meta-3 opacity-45">{MIN_ROUNDS}–{MAX_ROUNDS} {t("dev.run.cycles")}</div>
        </div>

        {/* Master-Auswahl der Typen */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={box}>
          <span className="text-body-lg-5 font-semibold">{t("dev.run.offerTypes")}</span>
          <div className="flex flex-wrap gap-2">
            {DECISION_TOKENS.map((tk) => (
              <button key={tk} onClick={() => toggleType(tk)}
                className="px-3 py-1.5 rounded-full text-body-lg-5 font-medium transition-all"
                style={chip(enabled.includes(tk), COLOR[tk])}>
                {enabled.includes(tk) ? "✓ " : ""}{label(tk)}
              </button>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <button onClick={evenDistribute}
              className="px-3.5 py-1.5 rounded-lg text-body-lg-5 font-semibold transition-all hover:-translate-y-0.5" style={plainBtn}>
              {t("dev.run.distribute")}
            </button>
            <button onClick={standardPlan}
              className="px-3.5 py-1.5 rounded-lg text-body-lg-5 font-semibold transition-all hover:-translate-y-0.5" style={plainBtn}>
              {t("dev.run.standardPlan")}
            </button>
          </div>
          {/* Verteilungs-Zusammenfassung */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-meta-3 mt-0.5">
            {counts.map((c) => (
              <span key={c.tk} style={{ color: COLOR[c.tk] }}>{label(c.tk)}: <b>{c.n}</b></span>
            ))}
          </div>
        </div>

        {/* Pro-Runde-Plan (aufklappbar) */}
        <div className="rounded-xl overflow-hidden" style={box}>
          <button onClick={() => setShowPlan((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-body-lg-5 font-semibold">
            <span>{t("dev.run.plan")}</span>
            <span className="opacity-60">{showPlan ? `▲ ${t("dev.run.collapse")}` : `▼ ${t("dev.run.expand")}`}</span>
          </button>
          {showPlan && (
            <div className="max-h-72 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
              {schedule.map((tk, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-meta-3 opacity-45 text-right ty-num">R{i + 1}</span>
                  <div className="flex flex-wrap gap-1">
                    {enabledOrdered.map((token) => (
                      <button key={token} onClick={() => setRound(i, token)}
                        className="px-2 py-0.5 rounded text-meta-3 font-medium transition-all"
                        style={chip(tk === token, COLOR[token])}>
                        {label(token)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Regeln je Lauf (exp) — Slider über die Grenzen aus rules.js; der Wert in Klammern ist der Standard */}
        <div className="rounded-xl p-3 flex flex-col gap-3" style={box}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-body-lg-5 font-semibold">{t("dev.run.rules")}</span>
              <p className="text-meta-3 opacity-45">{t("dev.run.rulesSub")}</p>
            </div>
            <button onClick={() => update({ rules: { ...DEFAULT_RULES } })}
              className="shrink-0 px-3 py-1.5 rounded-lg text-body-5 font-semibold transition-all hover:-translate-y-0.5" style={plainBtn}>
              {t("dev.run.defaultRules")}
            </button>
          </div>
          {RULE_KEYS.map((key) => {
            const [lo, hi] = RULE_LIMITS[key];
            const changed = rules[key] !== DEFAULT_RULES[key];
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-body-lg-5">
                  <span className="font-semibold">{t(`dev.run.rule.${key}`)}</span>
                  <span className="ty-num" style={{ color: changed ? "#d4a63a" : "#8a7de0" }}>
                    {rules[key]}{changed ? ` (${DEFAULT_RULES[key]})` : ""}
                  </span>
                </div>
                <input type="range" min={lo} max={hi} value={rules[key]} onChange={(e) => setRule(key, e.target.value)} className="w-full" />
              </div>
            );
          })}
          <button onClick={() => update({ fullCatalog: !fullCatalog })}
            className="self-start px-3 py-1.5 rounded-full text-body-lg-5 font-medium transition-all"
            style={chip(fullCatalog, "#d4a63a")}>
            {fullCatalog ? "✓ " : ""}{t("dev.run.fullCatalog")}
          </button>
        </div>

        {/* Startressourcen */}
        <div className="rounded-xl p-3 flex flex-col gap-3" style={box}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-body-lg-5">
              <span className="font-semibold">{t("dev.run.cover")}</span>
              <span className="ty-num" style={{ color: "#e0605a" }}>{cover} / {N_POS}</span>
            </div>
            <input type="range" min={0} max={N_POS} value={cover} onChange={(e) => update({ cover: e.target.value })} className="w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-body-lg-5">
              <span className="font-semibold">{t("dev.run.energy")}</span>
              <span className="ty-num" style={{ color: "#5a8ade" }}>{energy}</span>
            </div>
            <input type="range" min={0} max={N_POS} value={energy} onChange={(e) => update({ energy: e.target.value })} className="w-full" />
          </div>
        </div>

        {/* Presets (lokal, Namespace des Builds) — Name antippen lädt, „Löschen" entfernt */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={box}>
          <span className="text-body-lg-5 font-semibold">{t("dev.run.presets")}</span>
          {presets.length ? (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <span key={p.name} className="inline-flex items-stretch rounded-full overflow-hidden" style={{ border: "1px solid #30303a" }}>
                  <button onClick={() => loadPreset(p)} className="px-3 py-1.5 text-body-lg-5 font-medium" style={{ background: "#1c1c22", color: "#e8e8ea" }}>
                    {p.name}
                  </button>
                  <button onClick={() => deletePreset(p.name)} className="px-2.5 py-1.5 text-meta-3 font-medium"
                    style={{ background: "#20202a", color: "#8a8a92", borderLeft: "1px solid #30303a" }}>
                    {t("dev.run.presetDelete")}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-meta-3 opacity-45">{t("dev.run.presetsEmpty")}</p>
          )}
          <div className="flex gap-2">
            <input type="text" value={presetName} maxLength={24} placeholder={t("dev.run.presetName")}
              onChange={(e) => setPresetName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePreset(); }}
              className="flex-1 min-w-0 px-2 py-1 rounded text-body-lg-5" style={field} />
            <button onClick={savePreset} disabled={!presetName.trim()}
              className="px-3.5 py-1.5 rounded-lg text-body-lg-5 font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40" style={plainBtn}>
              {t("dev.run.presetSave")}
            </button>
          </div>
        </div>

        <button onClick={start}
          className="w-full px-5 py-3 rounded-lg text-body-lg-6 font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#d4a63a", color: "#141419" }}>
          {t("dev.run.start", { n: rounds })}
        </button>
      </div>
    </div>
  ));
}
