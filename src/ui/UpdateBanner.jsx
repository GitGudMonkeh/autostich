import { useEffect, useState } from "react";
import { useT } from "../i18n/useLocale.js";
import { BUILD_SHA, BUILD_NUM } from "./version.js";

/* #update — „Neue Version verfügbar"-Hinweis (Variante A).

   Autostich ist eine SPA: wer den Tab offen lässt, führt den geladenen Bundle weiter aus, bis er neu lädt.
   Ein neuer Deploy greift sonst erst beim manuellen Refresh. Dieser Hinweis schließt die Lücke, OHNE
   ungefragt neu zu laden (ein Reload mitten im Lauf könnte einen angefangenen Lauf verwerfen).

   Prinzip: Die App kennt ihren EIGENEN Build-Stempel (version.js, zur Bauzeit eingebacken). Sie pollt in
   Intervallen + beim Zurückkehren zum Tab die frisch deployte `version.json` (vite.config.js) und vergleicht.
   Weicht die Server-Kennung ab → dezente Leiste mit „Neu laden". Der Spieler entscheidet. */

// Kennung des LAUFENDEN Builds. Fehlt sie (Dev-Build ohne CI-Stempel), bleibt die Prüfung aus.
const CURRENT = BUILD_SHA || BUILD_NUM || null;
const CHECK_MS = 5 * 60 * 1000; // alle 5 Minuten

function useUpdateAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    // Nur im echten Build (nicht im Dev-Server) und nur mit eigener Build-Kennung — sonst gäbe es nichts zu vergleichen.
    if (!import.meta.env.PROD || !CURRENT) return undefined;
    let stopped = false;
    const url = `${import.meta.env.BASE_URL}version.json`;
    const check = async () => {
      if (stopped) return;
      try {
        // `no-store` + Cache-Buster: der Browser-HTTP-Cache darf hier nie eine alte Kennung liefern.
        const res = await fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        const latest = j.sha || j.build || null;
        if (latest && latest !== CURRENT && !stopped) setAvailable(true);
      } catch (e) { /* offline / Blocker → einfach nichts tun, nächster Tick versucht es erneut */ }
    };
    const id = setInterval(check, CHECK_MS);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    check(); // einmal beim Start (gleich nach Laden = identisch → kein Fehlalarm)
    return () => { stopped = true; clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return available;
}

export function UpdateBanner() {
  const t = useT();
  const available = useUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);
  if (!available || dismissed) return null;
  return (
    <div className="fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl px-3.5 py-2.5"
        style={{ background: "#1b1b24", border: "1px solid #3a3a48", boxShadow: "0 6px 24px -8px #000" }}>
        <span className="text-sm font-bold" style={{ color: "#c9c0f0" }}>{t("update.available")}</span>
        <button type="button" onClick={() => window.location.reload()}
          className="text-sm font-bold rounded-lg px-3 py-1.5 transition-all"
          style={{ background: "#d4a63a", color: "#141419" }}>
          {t("update.reload")}
        </button>
        <button type="button" onClick={() => setDismissed(true)} aria-label={t("update.dismiss")}
          className="text-lg leading-none opacity-55 hover:opacity-90 transition-opacity px-1">×</button>
      </div>
    </div>
  );
}

export default UpdateBanner;
