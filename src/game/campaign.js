/* ============================================================
   KAMPAGNE — die Leiter (Spec: docs/kampagne.md)

   Eine Kampagne ist eine LEITER aus Stufen. Jede Stufe ist EIN Lauf gegen eine Schwelle, bewacht
   von einem festen Boss. Wer die Schwelle reisst, steigt auf und bekommt die Freischaltung dieser
   Stufe; wer sie verfehlt, wiederholt dieselbe Stufe — die Freischaltungen bleiben (Owner
   2026-09-25).

   Das loest die Kette aus vier Laeufen ab, die im Playtest nicht getragen hat: dort kostete ein
   verfehlter Lauf den ganzen Durchgang, und die Rewards dazwischen waren ein zweites System neben
   den Freischaltungen. Beides ist weg. Es gibt nur noch die Leiter.

   Zwei Lebensdauern, und sie sind nicht zu verwechseln:
   - Freischaltungen  haengen an der erreichten Stufe  → ergeben sich aus `step`
   - Kampagne         die Leiter selbst                → eigener Speicherplatz

   Dieses Modul ist rein: kein React, kein Speicher, kein Zufall ausser durch ein injiziertes rng.
   Der Reducer haelt den State; alles hier nimmt ihn und gibt einen Wert zurueck.
   ============================================================ */

// ---- Die Leiter --------------------------------------------------------------------------

/* Stufe, Boss, Schwelle und Freischaltung stehen in EINER Zeile. Drei getrennte Tabellen waren die
   Vorfassung, und sie sind genau dort auseinandergelaufen, wo man es am spaetesten merkt: ein Boss
   ohne die Muenzen, die sein Effekt braucht. Die Freischaltung gehoert dem ABSCHLUSS der Stufe —
   wer Stufe 2 schafft, spielt Stufe 3 mit Muenzen. */
export const LADDER = [
  { step: 1, boss: "denkmalpfleger", threshold: 5_000_000,   unlock: "plantDeck" },
  { step: 2, boss: "schliesser",     threshold: 10_000_000,  unlock: "coins" },
  { step: 3, boss: "bremser",        threshold: 25_000_000,  unlock: "contracts" },
  { step: 4, boss: "schmarotzer",    threshold: 50_000_000,  unlock: "rarityRare" },
  { step: 5, boss: "konter",         threshold: 100_000_000, unlock: "iceDeck" },
];

/* Wie viele Stufen es GIBT, nicht wie viele geplant sind. Stufe 6 steht in docs/kampagne.md, gebaut
   sind fuenf — und der Siegschirm darf nichts ankuendigen, was der Spieler danach nicht vorfindet. */
export const STEPS = LADDER.length;
export const hasStep = (step) => step >= 1 && step <= STEPS;
export const rungFor = (step) => LADDER[Math.max(0, Math.min(STEPS - 1, (step || 1) - 1))];

// ---- Freischaltungen ---------------------------------------------------------------------

/* Sie ergeben sich aus der Stufe und werden nirgends zusaetzlich gezaehlt. Ein eigener Zaehler war
   in der Kettenfassung noetig, weil die Kampagne bei einem verfehlten Lauf von vorn begann und die
   Freischaltungen sie ueberleben mussten. Die Leiter faellt nicht zurueck, also gibt es nichts mehr
   zu ueberleben — und keine zweite Zahl, die von der ersten abweichen kann. */
export const UNLOCK_IDS = LADDER.map((l) => l.unlock);

/* Gezaehlt wird, was GESCHAFFT ist, nicht wo man steht. Ueber die Stufe abgeleitet faellt die
   letzte Freischaltung unter den Tisch: Stufe 5 ist die letzte, sie ruecht beim Bestehen nicht
   weiter, und `step` saehe danach aus wie davor. `scores` traegt je bestandener Stufe ihren
   Endscore — ein verfehlter Lauf schreibt nichts hinein, also ist die Laenge genau die Zahl der
   geschafften Stufen. */
export const clearedOf = (campaign) => ((campaign || {}).scores || []).length;
export const unlocksFor = (cleared = 0) => UNLOCK_IDS.slice(0, Math.max(0, Math.min(STEPS, cleared || 0)));
export const unlocksOf = (campaign) => unlocksFor(clearedOf(campaign));
/* Was die AKTUELLE Stufe einbringt, wenn man sie besteht — der Bossblock nennt sie vorher. */
export const nextUnlock = (step = 1) => (hasStep(step) ? rungFor(step).unlock : null);
export const hasUnlock = (unlocked, id) => (unlocked || []).includes(id);

/* Stufe 1 startet mit Blitz und Feuer; Pflanze und Eis kommen ueber die Leiter. */
export const START_DECKS = ["lightning", "fire"];
export const DECK_UNLOCKS = { plantDeck: "plant", iceDeck: "ice" };
export function decksFor(unlocked = []) {
  const decks = [...START_DECKS];
  for (const [id, deck] of Object.entries(DECK_UNLOCKS)) if (hasUnlock(unlocked, id)) decks.push(deck);
  return decks;
}

/* Vor der Raritaets-Freischaltung enden die Angebote bei „Selten" (Stufe 2). Skills, Perks und
   Gebaeude lesen alle diese eine Decke. Legendaere haengen an Stufe IV und bleiben damit ueber die
   ganze gebaute Leiter gesperrt. */
export const START_MAX_TIER = 2;
export const RARE_MAX_TIER = 3;
export const maxTierFor = (unlocked = []) => (hasUnlock(unlocked, "rarityRare") ? RARE_MAX_TIER : START_MAX_TIER);

export const coinsEnabled = (unlocked = []) => hasUnlock(unlocked, "coins");
export const contractsEnabled = (unlocked = []) => hasUnlock(unlocked, "contracts");

// ---- Bosse -------------------------------------------------------------------------------

/* Fest je Stufe, nicht mehr gezogen: die Leiter soll lernbar sein, und ein gezogener Boss macht
   dieselbe Stufe mal leicht und mal schwer. Der Wucherer steht ohne Stufe im Katalog — er ist
   gebaut und wartet auf Stufe 6 (Owner 2026-09-25). */
export const BOSSES = [
  { id: "denkmalpfleger", effect: { blockCells: 6 } },
  { id: "schliesser", effect: { lockSegment: 1 } },
  { id: "bremser", effect: { energyMinus: 2 } },
  { id: "wucherer", effect: { priceLadder: 3 }, requires: "coins" },
  { id: "schmarotzer", effect: { perkUpkeep: 2 }, requires: "coins" },
  { id: "konter", effect: { counterPerWin: 1 } },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

/* Welche Bosse gebaut, aber (noch) auf keiner Stufe sind. Kein Spielwert — der Test zaehlt damit
   nach, dass kein Boss versehentlich aus der Leiter faellt. */
export const UNUSED_BOSSES = BOSSES.filter((b) => !LADDER.some((l) => l.boss === b.id)).map((b) => b.id);

export const bossFor = (campaign, step = null) => rungFor(step ?? (campaign || {}).step ?? 1).boss;
export const isEndBoss = (id) => id === LADDER[STEPS - 1].boss;

// ---- Kampagnen-Stand ---------------------------------------------------------------------

/* Alles, was eine Kampagne ist: auf welcher Stufe sie steht, was auf den geschafften Stufen
   erreicht wurde, und ob die Leiter durch ist. Kein `held`, keine `axes`, kein `pending` — die
   Rewards zwischen den Laeufen gibt es nicht mehr. */
export const emptyCampaign = () => ({ step: 1, scores: [], done: false });

export const startCampaign = () => emptyCampaign();

export const thresholdFor = (campaign, step = null) => rungFor(step ?? (campaign || {}).step ?? 1).threshold;

export const isCleared = (campaign, score = 0, step = null) => score >= thresholdFor(campaign, step);

/* Der Stand zur Schwelle, live und als EINE Rechnung. Die Leiste fuellt sich EINMAL: die frueheren
   2×/3×-Marken massen die Raritaet des Rewards am Laufende, und den gibt es nicht mehr. Ueber der
   Schwelle bleibt sie voll stehen — mehr Score hilft, zaehlt aber nicht weiter. */
export function thresholdProgress(campaign, score = 0, step = null) {
  const target = thresholdFor(campaign, step);
  if (!(target > 0)) return { pct: 0, target: 0, full: false };
  const pct = Math.max(0, Math.min(100, (score / target) * 100));
  return { pct, target, full: score >= target };
}

/* Ein abgeschlossener Lauf. Die Schwelle gerissen: eine Stufe hoch, die Freischaltung dieser Stufe
   ist ab jetzt offen. Verfehlt: die Stufe bleibt stehen und wird wiederholt (Owner 2026-09-25) —
   deshalb gibt es kein `lost` mehr, das die Kampagne beendet, sondern nur `cleared` je Lauf.

   `scores` traegt je geschaffter Stufe ihren Endscore, in Stufenreihenfolge. Ein verfehlter Lauf
   schreibt nichts hinein: sonst staende in der Uebersicht ein Score neben einer Stufe, die noch
   offen ist. */
export function settleStep(campaign, { score = 0 } = {}) {
  const c = campaign || emptyCampaign();
  const step = c.step || 1;
  const cleared = score >= thresholdFor(c, step);
  if (!cleared) return { ...c, cleared: false, lastScore: score };
  const last = step >= STEPS;
  return {
    ...c,
    cleared: true,
    lastScore: score,
    scores: [...(c.scores || []).slice(0, step - 1), score],
    step: last ? step : step + 1,
    done: last,
  };
}

// ---- Tueren: Grundwert rein, Kampagnenwert raus -------------------------------------------

/* Dieselbe Form wie die Auftrags-Segen (`xWith(state, base)`): ein Lauf ohne Kampagne zahlt einen
   Feldzugriff und bekommt seine eigene Zahl zurueck. Die Lehre aus dem Beute-Audit gilt weiter —
   sie aendern eine ZAHL, also muss ein Test die Zahl pruefen und nie, dass ein Feld gesetzt wurde. */

const bossEffect = (state) => {
  const c = state && state.campaign;
  return c ? ((BOSS_BY_ID[bossFor(c, c.step)] || {}).effect || {}) : {};
};

/* Die reduzierte Muenz-Oekonomie (Owner 2026-09-25): EINE Muenze je Durchlauf, und die Aufstellung
   zahlt nicht mit. Der Grundwert des Aufrufers (Sockel plus Formationen) wird also nicht angepasst,
   sondern ERSETZT — sonst haette die Kampagne dieselbe Kurve wie ein freier Lauf, nur flacher.
   Ohne freigeschaltete Oekonomie gibt es gar nichts.

   Der Auftrags-Segen (Muenzrecht) addiert HINTERHER und bleibt damit wirksam: er ist im Lauf
   verdient, nicht vom Aufbau geschenkt. Deshalb steht diese Tuer im Motor INNEN und die des
   Auftrags aussen. */
export const CAMPAIGN_COINS_PER_CYCLE = 1;
export function cycleCoinsWith(state, base = 0) {
  if (!state || !state.campaign) return base;
  return state.coinsEnabled === false ? 0 : CAMPAIGN_COINS_PER_CYCLE;
}

/* Der Verzicht skaliert mit (Owner 2026-09-25). Bei einer Muenze je Durchlauf waere ein einziges
   abgelehntes Skill-Angebot zwoelf Durchlaeufe wert, und die Reduktion verpuffte an der Stelle, an
   der der Spieler sie am leichtesten umgeht. Uebrige Aufstell-Energie zahlt gar nichts mehr: vier
   Energie waeren sonst mehr als der ganze Durchlauf. */
export const CAMPAIGN_FORFEIT = { skill: 3, perk: 2, build: 2, energy: 0 };
export function forfeitWith(state, kind, base = 0) {
  if (!state || !state.campaign) return base;
  if (state.coinsEnabled === false) return 0;
  const v = CAMPAIGN_FORFEIT[kind];
  return v == null ? base : v;
}

/* Der Konter legt auf JEDE Gegnerkarte nach, so viel wie die laufende Siegesserie lang ist. */
export function enemyValueWith(state, base = 0, counterStack = 0) {
  const per = bossEffect(state).counterPerWin || 0;
  return Math.max(0, base + per * Math.max(0, counterStack));
}

export const counterBonus = (state) =>
  (bossEffect(state).counterPerWin || 0) * Math.max(0, (state && state.counterStack) || 0);

/* Der Wucherer verdreifacht statt zu verdoppeln. Er sitzt an der Treppe selbst (coins.js
   `rerollPrice`), nicht an einem fertigen Preis — daraus liesse sich die Stufenzahl nicht
   zurueckrechnen, und der legendaere Neuwurf hat eine eigene Basis. */
export const priceLadderWith = (state, base = 2) => bossEffect(state).priceLadder || base;

/* Schmarotzer: je zwei gehaltene Perks kostet eine Muenze je Durchlauf, ZUGUNSTEN DES SPIELERS
   gerundet (Owner 2026-09-22) — drei Perks kosten eine, nicht zwei. Nie mehr, als auf dem Konto
   liegt, und ohne Muenzen gar nichts: deshalb steht der Boss erst hinter der Muenz-Freischaltung. */
export function upkeepWith(state, perkCount = 0) {
  const per = bossEffect(state).perkUpkeep || 0;
  if (!per || !state || state.coinsEnabled === false) return 0;
  return Math.min(state.coins || 0, Math.floor(Math.max(0, perkCount) / per));
}

/* Der Schliesser setzt vor JEDER Aufstellphase eines der acht Segmente fest, jedes Mal zufaellig
   gezogen (Owner 2026-09-22). Bewusst ein eigenes Feld statt `challengeBlockForm`: das gehoert dem
   ganzen Lauf (Wochen-Modifikatoren), diese Sperre wechselt mit der Phase. */
export const SEGMENT_SIZE = 5;
export function drawLockedSegment(state, rng = Math.random, segments = 8) {
  if (!bossEffect(state).lockSegment) return null;
  return Math.floor(rng() * segments) % segments;
}
export const segmentLocked = (state, i) => {
  const seg = state && state.lockedSegment;
  return seg != null && seg >= 0 && Math.floor(i / SEGMENT_SIZE) === seg;
};
/* Dieselbe Sperre als Positionsliste — die Aufstellung zeichnet sie mit dem Mittel, das sie fuer
   gesperrte Zellen schon hat (#301 C3), statt ein zweites Sperr-Bild zu erfinden. Eine Quelle fuer
   beides: was der Reducer beim Tausch ablehnt, ist genau das, was hier grau wird. */
export function lockedPositions(state, positions = 40) {
  const seg = state && state.lockedSegment;
  if (seg == null || seg < 0) return [];
  const out = [];
  for (let i = seg * SEGMENT_SIZE; i < Math.min(positions, (seg + 1) * SEGMENT_SIZE); i++) out.push(i);
  return out;
}

// ---- Womit eine Stufe startet -------------------------------------------------------------

/* Alles, was die Kampagne VOR dem ersten Stich entscheidet, an einer Stelle: welche Decks im Pool
   liegen, wie hoch die Angebote wuerfeln duerfen, ob es Muenzen und Auftraege ueberhaupt gibt, und
   die zwei Brett-Wirkungen, die ein Boss verschiebt (Aufstell-Energie, Baufeld).

   Bewusst rein und ohne Reducer: es nimmt die Grundwerte, die der Aufrufer schon hat, und gibt
   Ueberschreibungen zurueck. Ein Lauf ohne Kampagne ruft es nie. Wirkungen, die erst IM Lauf
   beissen — das festgesetzte Segment, der Unterhalt, der Konter-Aufschlag — stehen nicht hier,
   sie haengen im Motor. */
export function runSetup(campaign, unlocked = [], { energy = 4, cover = 24, coins = 3, positions = 40, rng = Math.random } = {}) {
  const c = campaign || emptyCampaign();
  const eff = (BOSS_BY_ID[bossFor(c, c.step)] || {}).effect || {};

  const withCoins = coinsEnabled(unlocked);
  const out = {
    archetypes: decksFor(unlocked),
    rareCap: maxTierFor(unlocked),
    contracts: contractsEnabled(unlocked),
    coinsEnabled: withCoins,
    /* Ohne Muenzen gibt es auch kein Startkapital — sonst staende eine Zahl da, die nichts kauft. */
    coins: withCoins ? coins : 0,
    energy: Math.max(0, energy - (eff.energyMinus || 0)),
    cover: Math.min(positions, cover),
    blockCells: [],
    priceLadder: eff.priceLadder || null,   // Wucherer; null = die normale Treppe
    threshold: thresholdFor(c),
  };

  /* Denkmalpfleger zieht seine sechs Zellen ZUFAELLIG (Owner 2026-09-22) und legt sie auf dieselbe
     Naht, die die Wochen-Modifikatoren schon benutzen. */
  if (eff.blockCells) {
    const free = Array.from({ length: positions }, (_, i) => i);
    for (let n = 0; n < eff.blockCells && free.length; n++) {
      out.blockCells.push(free.splice(Math.floor(rng() * free.length) % free.length, 1)[0]);
    }
  }
  return out;
}
