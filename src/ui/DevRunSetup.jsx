import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { N_POS, MAX_COVER } from "../game/architect.js";
import { FORMATION_ENERGY } from "../game/constants.js";
import { useEscape } from "./useEscape.js"; // #350: Esc/Zurück schließt (Konsistenz mit den anderen Overlays)
import { ActionButton } from "./modalStyle.jsx";
import { t } from "../i18n/index.js"; // #sprache

/* Dev-Run-Setup (Test-Layout, nur Preview-Build) — ein frei konfigurierbarer Lauf zum Testen.
   Phase 1: Rundenzahl (20–100), Master-Auswahl der Angebotstypen, Gleichverteilung, Pro-Runde-Plan (aufklappbar),
   Baupunkte (Baufeld/maxCover) und {t("dev.run.energy")}. Die freie Perk-/Skill-/Bau-Auswahl im Lauf folgt in Phase 2.
   Rein UI: baut eine dev-Config { rounds, schedule, cover, energy } und reicht sie via onStart nach oben. */

// Die vier Entscheidungstypen (#267: „Stat" entfernt). `token` = interner Plan-Wert (Engine/Reducer), `label` = Anzeige.
const TYPES = [
  { token: "skill",     label: "Skill",       color: "#8a7de0" },
  { token: "perk",      label: "Perk",        color: "#5ab87a" },
  { token: "formation", label: "Aufstellung", color: "#5a8ade" },
  { token: "shop",      label: "Architekt",   color: "#e0605a" },
];
const LABEL = Object.fromEntries(TYPES.map((t) => [t.token, t.label]));
const COLOR = Object.fromEntries(TYPES.map((t) => [t.token, t.color]));

const MIN_ROUNDS = 20, MAX_ROUNDS = 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Gleichverteilung: die aktiven Typen reihum über n Runden legen (gleichmäßig verschränkt, kein Cluster).
function distribute(n, enabledTokens) {
  const pool = TYPES.map((t) => t.token).filter((tk) => enabledTokens.includes(tk));
  if (!pool.length) return Array.from({ length: n }, () => "perk");
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

export function DevRunSetup({ onStart, onClose }) {
  useEscape(onClose); // #350: Escape schließt das Fenster
  const [rounds, setRounds] = useState(40);
  const [enabled, setEnabled] = useState(["skill", "perk", "formation", "shop"]); // Stats default aus (Test-Layout)
  const [schedule, setSchedule] = useState(() => distribute(40, ["skill", "perk", "formation", "shop"]));
  const [cover, setCover] = useState(MAX_COVER);
  const [energy, setEnergy] = useState(FORMATION_ENERGY);
  const [showPlan, setShowPlan] = useState(false);

  const enabledOrdered = TYPES.map((t) => t.token).filter((tk) => enabled.includes(tk));

  // Rundenzahl ändern → Plan auf die neue Länge bringen (bestehende Runden behalten, neue reihum auffüllen).
  const changeRounds = (raw) => {
    const n = clamp(Math.floor(Number(raw) || 0), MIN_ROUNDS, MAX_ROUNDS);
    setRounds(n);
    setSchedule((prev) => {
      const fill = distribute(n, enabledOrdered);
      return Array.from({ length: n }, (_, i) => (i < prev.length ? prev[i] : fill[i]));
    });
  };

  // Typ an-/abwählen. Mind. einer muss aktiv bleiben. Beim Abwählen: bisher so belegte Plan-Runden auf den
  // ersten noch aktiven Typ umbiegen (sonst stünde ein deaktivierter Typ weiter im Plan).
  const toggleType = (token) => {
    setEnabled((prev) => {
      const next = prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token];
      if (!next.length) return prev; // nie alle aus
      const stillOrdered = TYPES.map((t) => t.token).filter((tk) => next.includes(tk));
      const fallback = stillOrdered[0];
      setSchedule((sch) => sch.map((tk) => (next.includes(tk) ? tk : fallback)));
      return next;
    });
  };

  const evenDistribute = () => setSchedule(distribute(rounds, enabledOrdered));
  const setRound = (i, token) => setSchedule((sch) => sch.map((tk, j) => (j === i ? token : tk)));

  const counts = TYPES.map((t) => ({ ...t, n: schedule.filter((tk) => tk === t.token).length })).filter((t) => t.n > 0);

  const start = () => onStart({ rounds, schedule: schedule.slice(0, rounds), cover, energy });

  const panel = { background: "#17171c", border: "1px solid #26262e" };
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
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#141419", border: "1px solid #26262e" }}>
          <div className="flex items-center justify-between">
            <span className="text-body-lg-5 font-semibold">{t("dev.run.cycles")}</span>
            <input type="number" min={MIN_ROUNDS} max={MAX_ROUNDS} value={rounds}
              onChange={(e) => changeRounds(e.target.value)}
              className="w-16 text-right px-2 py-1 rounded text-body-lg-5 ty-num"
              style={{ background: "#0f0f13", border: "1px solid #30303a", color: "#e8e8ea" }} />
          </div>
          <input type="range" min={MIN_ROUNDS} max={MAX_ROUNDS} value={rounds} onChange={(e) => changeRounds(e.target.value)} className="w-full" />
          <div className="text-meta-3 opacity-45">{MIN_ROUNDS}–{MAX_ROUNDS} {t("dev.run.cycles")}</div>
        </div>

        {/* Master-Auswahl der Typen */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#141419", border: "1px solid #26262e" }}>
          <span className="text-body-lg-5 font-semibold">{t("dev.run.offerTypes")}</span>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.token} onClick={() => toggleType(t.token)}
                className="px-3 py-1.5 rounded-full text-body-lg-5 font-medium transition-all"
                style={chip(enabled.includes(t.token), t.color)}>
                {enabled.includes(t.token) ? "✓ " : ""}{t.label}
              </button>
            ))}
          </div>
          <button onClick={evenDistribute}
            className="mt-1 self-start px-3.5 py-1.5 rounded-lg text-body-lg-5 font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
            {t("dev.run.distribute")}
          </button>
          {/* Verteilungs-Zusammenfassung */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-meta-3 mt-0.5">
            {counts.map((c) => (
              <span key={c.token} style={{ color: c.color }}>{c.label}: <b>{c.n}</b></span>
            ))}
          </div>
        </div>

        {/* Pro-Runde-Plan (aufklappbar) */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #26262e" }}>
          <button onClick={() => setShowPlan((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-body-lg-5 font-semibold">
            <span>{t("dev.run.plan")}</span>
            <span className="opacity-60">{showPlan ? "▲ einklappen" : "▼ aufklappen"}</span>
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
                        {LABEL[token]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Startressourcen */}
        <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-body-lg-5">
              <span className="font-semibold">Baupunkte (Baufeld)</span>
              <span className="ty-num" style={{ color: "#e0605a" }}>{cover} / {N_POS}</span>
            </div>
            <input type="range" min={0} max={N_POS} value={cover} onChange={(e) => setCover(clamp(Math.floor(Number(e.target.value) || 0), 0, N_POS))} className="w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-body-lg-5">
              <span className="font-semibold">{t("dev.run.energy")}</span>
              <span className="ty-num" style={{ color: "#5a8ade" }}>{energy}</span>
            </div>
            <input type="range" min={0} max={N_POS} value={energy} onChange={(e) => setEnergy(clamp(Math.floor(Number(e.target.value) || 0), 0, N_POS))} className="w-full" />
          </div>
        </div>

        <button onClick={start}
          className="w-full px-5 py-3 rounded-lg text-body-lg-6 font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#d4a63a", color: "#141419" }}>
          Dev Run starten ({rounds} Runden)
        </button>
      </div>
    </div>
  ));
}
