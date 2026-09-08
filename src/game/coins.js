/* Münz-Ökonomie (docs/muenz-oekonomie.md) — die laufinterne Währung. Reine, deterministische Kernlogik:
   Einnahme je Durchlauf und die Preistreppen der Ausgabeflächen. Kein State, keine UI, kein Zufall.

   Mentalmodell: die Einnahme hängt an der SIEGZAHL, nicht am Score. Der Score wächst über einen Lauf um
   Faktor hundert, die Siegzahl ist je Durchlauf hart gedeckelt — die Ökonomie kann deshalb nicht
   explodieren. Die Preistreppen laufen je PHASE und werden in der nächsten auf den Grundpreis
   zurückgesetzt: Sparen bringt Reichweite, nicht Höhe.

   ⚠ Alle Zahlen sind Startwerte der ersten Fassung und über die Sim tunebar (envNum) — gesetzt genug zum
   Bauen, nicht gesetzt genug zum Verteidigen. Ändert sich die Einnahme, müssen die Preise mitwandern. */

import { envNum } from "./constants.js";

/* ---- Einnahme (§2) ------------------------------------------------------------------------------- */
// Schwelle und Schrittweite: floor((Siege − THRESHOLD) / PER). Die Schwelle erzeugt die Spreizung — die
// Siegzahl steigt über den Lauf nur um Faktor ~1,7 (24 → 40), durch die Schwelle werden daraus Faktor 5
// bei den Münzen. Früh knapp, spät reichlich, ohne die Kopplung an den Score.
export const COIN_WIN_THRESHOLD = envNum("SIM_COIN_THRESHOLD", 20);
export const COIN_WIN_PER = envNum("SIM_COIN_PER_WINS", 4);

export const coinsForWins = (wins) => Math.max(0, Math.floor(((wins || 0) - COIN_WIN_THRESHOLD) / COIN_WIN_PER));
