/* ============================================================
   LEITFADEN-WALKER — bewusst OHNE `t`, damit `de.js` ihn importieren darf.

   `de.js` erzeugt seine Leitfaden-Schlüssel hieraus; `guideText.js` benutzt denselben Walker zum
   Zurücklesen. Läge beides in einer Datei, entstünde ein Zyklus (de.js → guideText → index.js →
   de.js) — deshalb die Trennung: reiner Baum-Durchlauf hier, Auflösung eine Ebene darüber.
   ============================================================ */
import { GUIDES } from "../ui/guides.js";

/* Felder, die zwar Strings enthalten, aber KEIN Anzeigetext sind — Farben, Icons, Zuordnungen.
   Sie würden sonst als „unübersetzt" in den Katalog wandern und die Guards zumüllen. */
const NON_TEXT = new Set(["color", "faction", "glyph", "id", "key", "arch", "icon"]);

// Rekursiv: ruft `fn(pfad, wert)` für jeden Anzeigetext und setzt dessen Rückgabe wieder ein.
export function walkGuide(node, path, fn) {
  if (typeof node === "string") return fn(path, node);
  if (Array.isArray(node)) return node.map((v, i) => walkGuide(v, `${path}.${i}`, fn));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = NON_TEXT.has(k) ? v : walkGuide(v, path ? `${path}.${k}` : k, fn);
    }
    return out;
  }
  return node;
}

// Flache Schlüssel→Text-Karte aller Leitfäden (für den deutschen Katalog).
export function guideStrings() {
  const out = {};
  for (const [arch, g] of Object.entries(GUIDES)) {
    walkGuide(g, `guide.${arch}`, (key, value) => { out[key] = value; return value; });
  }
  return out;
}
