/* #229 N7: Frischer 32-bit-Lauf-Seed. Bewusst im UI-Layer (nicht in game/rng.js) — Math.random gehört NICHT in
   den deterministischen Game-Core. Wird in App.jsx beim Start eines Laufs gewürfelt und in den State gelegt;
   der Reducer/die Engine bleiben rein und leiten allen Zufall aus diesem Seed ab (Determinismus-Invariante). */
export function randomSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}

/* #205 Challenger Mode — Seed teilen. Kopiert Text in die Zwischenablage: bevorzugt die async Clipboard-API
   (nur in sicheren Kontexten), sonst ein execCommand("copy")-Fallback über ein unsichtbares Textfeld
   (ältere/restriktive Browser). Gibt true bei Erfolg zurück; wirft nie. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* auf Fallback ausweichen */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}
