/* Auflösung der Archetyp-Leitfäden zur Anzeigezeit. Der Baum-Durchlauf selbst liegt in
   guideWalk.js (ohne `t`), damit `de.js` ihn ohne Zyklus benutzen kann. */
import { t } from "./index.js";
import { GUIDES } from "../ui/guides.js";
import { walkGuide } from "./guideWalk.js";

// Ein Leitfaden mit übersetzten Texten — Struktur identisch, damit GuideOverlay unverändert bleibt.
export function guideDef(arch) {
  const g = GUIDES[arch];
  if (!g) return null;
  return walkGuide(g, `guide.${arch}`, (key) => t(key));
}
