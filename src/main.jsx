import { createRoot } from "react-dom/client";
import { Autostich } from "./App.jsx";
import "./index.css";

// PWA: Das Install-Prompt-Event (`beforeinstallprompt`) kann VOR dem React-Mount feuern → früh einfangen und global
// ablegen, damit der „Installieren"-Button es später auslösen kann. `appinstalled` räumt wieder auf.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__installPrompt = e;
    window.dispatchEvent(new Event("pwa-installable"));
  });
  window.addEventListener("appinstalled", () => {
    window.__installPrompt = null;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

createRoot(document.getElementById("root")).render(<Autostich />);
