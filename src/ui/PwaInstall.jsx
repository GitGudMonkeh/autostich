import { useEffect, useState } from "react";
import { t } from "../i18n/index.js"; // #sprache

// Kleiner „Installieren"-Link (PWA · Zum Startbildschirm). Android/Desktop: löst das native Install-Prompt aus
// (nur sichtbar, wenn der Browser die App als installierbar meldet). iOS: zeigt eine Kurzanleitung (Apple erlaubt
// kein programmatisches Prompt). Ausgeblendet, sobald die App installiert ist / im Standalone-Modus läuft.
const AM = "#f2a83a"; // Amber (Logo rechts) — passend zum StartScreen-Schema

function isStandalone() {
  if (typeof window === "undefined") return false;
  return !!(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
}
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState(typeof window !== "undefined" ? window.__installPrompt || null : null);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosHint, setIosHint] = useState(false);
  useEffect(() => {
    const onAvail = () => setPrompt(window.__installPrompt || null);
    const onBip = (e) => { e.preventDefault(); window.__installPrompt = e; setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("pwa-installable", onAvail);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("pwa-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onAvail);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("pwa-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  const ios = isIOS();
  if (!prompt && !ios) return null; // kein Prompt (Android/Desktop) & kein iOS → Installieren nicht anbieten

  const onClick = async () => {
    if (prompt) {
      prompt.prompt();
      try { await prompt.userChoice; } catch { /* ignore */ }
      window.__installPrompt = null;
      setPrompt(null);
    } else {
      setIosHint((v) => !v);
    }
  };

  return (
    <div className="text-xs text-center">
      <button onClick={onClick} className="opacity-70 hover:opacity-100 transition-opacity px-1 inline-flex items-center gap-1 font-medium"
        style={{ color: AM }} title={t("pwa.title")}>
        <span aria-hidden>📲</span> {t("pwa.install")}
      </button>
      {iosHint && (
        <div className="mt-1 text-[11px] opacity-60 leading-snug max-w-xs mx-auto">
          {t("pwa.ios")}
        </div>
      )}
    </div>
  );
}
