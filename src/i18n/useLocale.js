/* React-Anschluss an den i18n-Kern. Bewusst getrennt von index.js, damit der Kern
   React-frei bleibt und auch aus src/game/ importiert werden darf. */
import { useEffect, useState, useCallback } from "react";
import { getLocale, setLocale, subscribeLocale, t } from "./index.js";

/* useLocale() → [locale, setLocale]
   Der Rückgabewert `t` ist bewusst NICHT hier gebunden: `t` importiert man direkt.
   Die Komponente rendert trotzdem neu, weil `locale` sich ändert — genau ein Signal,
   kein Provider-Baum, keine doppelte Wahrheit. */
export function useLocale() {
  const [locale, set] = useState(getLocale);
  useEffect(() => subscribeLocale(set), []);
  const change = useCallback((id) => { setLocale(id); }, []);
  return [locale, change];
}

/* useT() — für Komponenten, die nur übersetzen und beim Sprachwechsel neu rendern sollen.
   Gibt eine bei jedem Sprachwechsel neue Funktionsidentität zurück (memo-freundlich). */
export function useT() {
  const [locale] = useLocale();
  return useCallback((key, vars) => t(key, vars, locale), [locale]);
}
