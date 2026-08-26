# skill-text-pass — the ledger

The running record of the five co-authoring rounds. **Everything settled goes in here in full
wording**, German and English, plus the source form with its interpolated constants — so the
edit can be applied cold, from this file alone, without the conversation.

- Baseline: `dev` = `c25e4c50`, measured 2026-08-25, right after `task/text-voice-pass` landed.
- Word counts are on the RESOLVED text (constants interpolated, bullet marks stripped).
- Status: `offen` · `vorgeschlagen` · `abgestimmt` · `unverändert` (deliberate, with a reason).
- Files: `src/game/skills.js` (`SKILL_DEFS[*].desc`, German source) ·
  `src/i18n/enSkills.js` (`ability.<ID>.desc`) · `src/i18n/de.js` + `en.js` (`skill.passive.*`).

---

## Blitz — 21 skills

| # | ID | Name | DE | EN | Status |
|---|---|---|---|---|---|
| 1 | SK_LIGHTNING_01 | Blitzableiter | 20 → 14 | 24 → 15 | abgestimmt |
| 2 | SK_LIGHTNING_08 | Statische Aufladung | 14 → 13 | 20 → 14 | abgestimmt |
| 3 | SK_LIGHTNING_05 | Reststrom | 10 → 9 | 12 → 11 | abgestimmt |
| 4 | SK_LIGHTNING_06 | Gewitterfront | 22 → 10 | 21 → 10 | abgestimmt |
| 5 | SK_LIGHTNING_10 | Entladung | 9 | 12 | unverändert |
| 6 | SK_LIGHTNING_02 | Ionisierung | 36 | 39 | unverändert |
| 7 | SK_LIGHTNING_07 | Ladungsserie | 12 | 13 | unverändert |
| 8 | SK_LIGHTNING_03 | Kettenblitz | 7 | 7 | unverändert |
| 9 | SK_LIGHTNING_12 | Breitenbeschleuniger | 30 → 21 | 41 → 30 | abgestimmt |
| 10 | SK_LIGHTNING_11 | Blitzfänger | 25 → 16 | 33 → 20 | abgestimmt |
| 11 | SK_LIGHTNING_09 | Kurzschluss | 24 → 12 | 24 → 13 | abgestimmt |
| 12 | SK_LIGHTNING_13 | Spannungsstau | 24 → 20 | 24 → 20 | abgestimmt |
| 13 | SK_LIGHTNING_14 | Überschlag | 37 → 26 | 40 → 30 | abgestimmt |
| 14 | SK_LIGHTNING_04 | Überspannung | 12 | 13 | unverändert |
| 15 | SK_LIGHTNING_15 | Blitzschlag | 8 | 10 → 10 | abgestimmt |
| 16 | SK_LIGHTNING_16 | Dauerstrom | 24 → 24 | 29 → 29 | abgestimmt |
| 17 | SK_LIGHTNING_17 | Serienschutz | 22 → 17 | 23 → 21 | abgestimmt |
| 18 | SK_LIGHTNING_L01 | Donnergott [L] | 15 → 13 | 15 → 12 | abgestimmt |
| 19 | SK_LIGHTNING_L02 | Doppelentladung [L] | 39 → 30 | 48 → 38 | abgestimmt |
| 20 | SK_LIGHTNING_L03 | Flächenionisation [L] | 43 → 28 | 52 → 37 | abgestimmt |
| 21 | SK_LIGHTNING_L04 | Durchschlag [L] | 16 → 14 | 20 → 17 | abgestimmt |

**Blitz complete.** Baseline DE 449 → 352 words (−22 %), longest 43 → 30.
4 of 21 untouched, 1 the same length by design, 16 shorter. No text lost a claim.

---

## Blitz · Gruppe 1 — Linie Ladung — ABGESTIMMT

### 1 · SK_LIGHTNING_01 Blitzableiter

**DE alt (20)**
> Jeder Crit erzeugt +1 zusätzliche Ladung (über die Grund-Ladung des Archetyps hinaus); zudem gibt jeder volle Ladungsverbrauch +1 Ladung zurück.

**DE neu (14)**
> Jeder Crit erzeugt +1 Ladung zusätzlich. Jeder volle Ladungsverbrauch gibt +1 Ladung zurück.

    desc: `Jeder Crit erzeugt +1 Ladung zusätzlich. Jeder volle Ladungsverbrauch gibt +${C.BLITZABLEITER_CONSUME_CHARGE} Ladung zurück.`,

**EN alt (24)**
> Every crit generates +1 extra charge (on top of the archetype's base charge); on top of that, every full charge consumption returns +1 charge.

**EN neu (15)**
> Every crit generates +1 extra charge. Every full charge consumption returns +1 charge.

    "ability.SK_LIGHTNING_01.desc": `Every crit generates +1 extra charge. Every full charge consumption returns +${C.BLITZABLEITER_CONSUME_CHARGE} charge.`,

The parenthesis said what "zusätzlich" / "extra" already says. Both claims stand: the charge is on
top of the archetype's base, and a full consumption returns one.
**Booking required:** `hyphen ability.SK_LIGHTNING_01.desc de 1->0` — `Grund-Ladung` leaves with
the parenthesis. Not compound damage; the compound itself is gone. Numbers unchanged (1, 1).

### 2 · SK_LIGHTNING_08 Statische Aufladung

**DE alt (14)**
> Jeder Sieg ohne Crit erzeugt +1 Ladung; zusätzlich gibt jeder volle Ladungsverbrauch +40 Direkt-Score.

**DE neu (13)**
> Jeder Sieg ohne Crit erzeugt +1 Ladung. Jeder volle Ladungsverbrauch gibt +40 Direkt-Score.

    desc: `Jeder Sieg ohne Crit erzeugt +${C.STATIC_CHARGE} Ladung. Jeder volle Ladungsverbrauch gibt +${C.CONSUME_SCORE} Direkt-Score.`,

**EN alt (20)**
> Every win without a crit generates +1 charge; on top of that, every full charge consumption gives +40 direct score.

**EN neu (14)**
> Every win without a crit generates +1 charge. Every full charge consumption gives +40 direct score.

    "ability.SK_LIGHTNING_08.desc": `Every win without a crit generates +${C.STATIC_CHARGE} charge. Every full charge consumption gives +${C.CONSUME_SCORE} direct score.`,

German gains one word, English six — "on top of that" is pure connective tissue. Nothing booked.

### 3 · SK_LIGHTNING_05 Reststrom

**DE alt (10)**
> Nach jedem vollen Ladungsverbrauch bleiben 4 Ladungen erhalten (statt 0).

**DE neu (9)**
> Nach jedem vollen Ladungsverbrauch bleiben 4 Ladungen statt 0.

    desc: `Nach jedem vollen Ladungsverbrauch bleiben ${C.REST_CHARGE_FLOOR} Ladungen statt 0.`,

**EN alt (12)**
> After every full charge consumption, 4 charge is kept (instead of 0).

**EN neu (11)**
> After every full charge consumption, 4 charge is kept instead of 0.

    "ability.SK_LIGHTNING_05.desc": `After every full charge consumption, ${C.REST_CHARGE_FLOOR} charge is kept instead of 0.`,

One word. "statt 0" is load-bearing — it is the whole skill — so it comes OUT of the parenthesis
rather than out of the text. The pattern for every cap and exception parenthesis in this pass.
**Left alone deliberately:** English treats *charge* as uncountable throughout the register
("+3 charge", "returns +1 charge"), so "4 charge is kept" is consistent even though it reads stiff.
Changing it is a register-wide decision, not a single-text one. Raised, not taken.

### 4 · SK_LIGHTNING_06 Gewitterfront

**DE alt (22)**
> Jeder volle Ladungsverbrauch gibt dauerhaft +1 % Crit-Chance (bis +50 %). Der Überschuss über 100 % fließt über Überschlag zurück in Ladung.

**DE neu (10)**
> Jeder volle Ladungsverbrauch gibt dauerhaft +1 % Crit-Chance (bis +50 %).

    desc: `Jeder volle Ladungsverbrauch gibt dauerhaft +${pct(C.STORM_CRIT_STEP)} % Crit-Chance (bis +${pct(C.STORM_CRIT_CAP)} %).`,

**EN alt (21)**
> Every full charge consumption permanently grants +1% crit chance (up to +50%). Anything above 100% flows back into charge via arc-over.

**EN neu (10)**
> Every full charge consumption permanently grants +1% crit chance (up to +50%).

    "ability.SK_LIGHTNING_06.desc": `Every full charge consumption permanently grants +${pct(C.STORM_CRIT_STEP)}% crit chance (up to +${pct(C.STORM_CRIT_CAP)}%).`,

The second sentence described **Überschlag**, not this skill, and Überschlag states it in its own
text. Biggest single cut of the group (12 words).
**Booking required:** the `100` leaves with the sentence, and check 3 (number drift) has **no**
keep-file escape kind. See *Machine check* below.

### 5 · SK_LIGHTNING_10 Entladung — UNVERÄNDERT

**DE (9)** · **EN (12)**
> Jeder volle Ladungsverbrauch gibt dauerhaft +0,1× Crit-Multiplikator (bis +1×).

> Every full charge consumption permanently grants +0.1× crit multiplier (up to +1×).

Already the target shape: condition, effect, cap, done. Left as the reference the rest of the line
is written against.

---

## Blitz · Gruppe 2 — Konsumenten & Ionisierung — ABGESTIMMT

Three of six left as they are. The owner's read — "Blitz war der letzte Rework, viele passen
schon" — holds up against the corpus.

### 6 · SK_LIGHTNING_02 Ionisierung — UNVERÄNDERT (36 / 39)

    Bei voller Ladung: 2 ungespielte Karten ionisieren.

    ▸ Sieg mit ionisierter Karte: +12 Score je Stapel.
    ▸ Jeder Stapel im Deck: +2 % Crit-Chance feldweit (max +18 %).
    ▸ Sind ~85 % der Karten ionisiert: alle Karten +1 Wert.

**The exception the acceptance criterion asks to be written down.** 36 words, the longest
non-legendary in Blitz, and deliberately not shortened. Four effects stand as four lines instead
of one sentence chain, which is why it reads faster than texts half its length. It has already
been through one shortening pass (see the `#skilltext-ion` comment in `skills.js`, which records
what was removed and why). Every remaining word carries: *ungespielte* (only unplayed cards),
*feldweit* (the crit chance is not limited to the ionized card), *je Stapel* (it scales).

### 7 · SK_LIGHTNING_07 Ladungsserie — UNVERÄNDERT (12 / 13)

> Jeder Serienpunkt gibt +2 % Crit-Chance (bis +30 %). Verbraucht keine Ladung.

"Verbraucht keine Ladung" is a real claim: it sets this apart from the consumers.

### 8 · SK_LIGHTNING_03 Kettenblitz — UNVERÄNDERT (7 / 7)

> Verstärker: Jede Ionisierung erfasst +2 weitere Karten.

Already the target shape, and the "Verstärker:" opener is the §3 marker for `enabler` skills.

### 9 · SK_LIGHTNING_12 Breitenbeschleuniger

**DE alt (30)**
> Gewinnt eine ionisierte Karte, springt ein Ionisierungsstapel bevorzugt auf eine noch nicht ionisierte Karte (0 Stapel) und treibt die Breite Richtung Voll-Ionisierung. Gibt es keine, auf den nächsten nicht-vollen Nachfolger.

**DE neu (21)**
> Gewinnt eine ionisierte Karte, springt ein Ionisierungsstapel auf eine noch nicht ionisierte Karte. Gibt es keine, auf den nächsten nicht-vollen Nachfolger.

    desc: "Gewinnt eine ionisierte Karte, springt ein Ionisierungsstapel auf eine noch nicht ionisierte Karte. Gibt es keine, auf den nächsten nicht-vollen Nachfolger.",

**EN alt (41)**
> When an ionized card wins, an ionization stack preferentially jumps to a card that is not ionized yet (0 stacks) and pushes breadth towards full ionization. If there is none, it goes to the next card that is not yet full.

**EN neu (30)**
> When an ionized card wins, an ionization stack jumps to a card that is not ionized yet; if there is none, to the next card that is not yet full.

    "ability.SK_LIGHTNING_12.desc": "When an ionized card wins, an ionization stack jumps to a card that is not ionized yet; if there is none, to the next card that is not yet full.",

Three things left: `(0 Stapel)` restated "noch nicht ionisiert"; "treibt die Breite Richtung
Voll-Ionisierung" was commentary, not a claim; and *bevorzugt* / *preferentially* is redundant once
the fallback is stated — "to X, otherwise to Y" **is** the preference.
Note: this entry is a plain string, not a template literal — no constant is at risk.
**Booking required:** the `0` leaves with the parenthesis (de and en).

### 10 · SK_LIGHTNING_11 Blitzfänger

**DE alt (25)**
> Trifft eine Ionisierung eine bereits volle Karte (5 Stapel), verpufft sie normalerweise. Stattdessen gibt sie jetzt +2 Stichwert (nur beim nächsten Auftauchen) und +1 Ladung.

**DE neu (16)**
> Trifft eine Ionisierung eine volle Karte: +2 Stichwert beim nächsten Auftauchen dieser Karte und +1 Ladung.

    desc: `Trifft eine Ionisierung eine volle Karte: +${C.BLITZFAENGER_VALUE} Stichwert beim nächsten Auftauchen dieser Karte und +1 Ladung.`,

**EN alt (33)**
> When an ionization hits a card that is already full (5 stacks), it normally fizzles. Instead it now gives +2 trick value (only the next time that card comes up) and +1 charge.

**EN neu (20)**
> When an ionization hits a full card: +2 trick value the next time that card comes up, and +1 charge.

    "ability.SK_LIGHTNING_11.desc": `When an ionization hits a full card: +${C.BLITZFAENGER_VALUE} trick value the next time that card comes up, and +1 charge.`,

**Owner's call: the fizzling goes.** The text set up a normal behaviour only to revoke it in the
next sentence; the skill's effect is the whole content. `(5 Stapel)` restated "volle Karte", and
the second parenthesis was a real **condition**, so it came out of the parenthesis, not out of the
text. Landed on the same shape as Kurzschluss below — condition, colon, effects.
**Booking required:** the `5` leaves with the parenthesis (de and en).

### 11 · SK_LIGHTNING_09 Kurzschluss

**DE alt (24)**
> Gewinnst du mit einer voll ionisierten Karte (5 Stapel), kurzschließt sie: +250 Score und +3 Ladung: bei jedem Sieg, ohne die Stapel zu verlieren.

**DE neu (12)**
> Gewinnst du mit einer voll ionisierten Karte: +250 Score und +3 Ladung.

    desc: `Gewinnst du mit einer voll ionisierten Karte: +${C.KURZSCHLUSS_SCORE} Score und +${C.KURZSCHLUSS_CHARGE} Ladung.`,

**EN alt (24)**
> When you win with a fully ionized card (5 stacks), it short-circuits: +250 score and +3 charge: on every win, without losing the stacks.

**EN neu (13)**
> When you win with a fully ionized card: +250 score and +3 charge.

    "ability.SK_LIGHTNING_09.desc": `When you win with a fully ionized card: +${C.KURZSCHLUSS_SCORE} score and +${C.KURZSCHLUSS_CHARGE} charge.`,

Three faults in one line, all gone with the shortening: the **double colon** (the dash pass turned
an em-dash into a second colon in a sentence that already had one), the **self-reference**
("kurzschließt" is the skill's own name as a verb, forbidden by §3), and `(5 Stapel)` restating
"voll ionisierten".
**Owner's call: "bei jedem Sieg" goes** — "Gewinnst du mit …" already states it.
**Owner's call: "ohne die Stapel zu verlieren" goes too — and it was a stale claim.** Verified in
`src/game/engine.js:1001` before cutting: *"Ionisierte Siegkarte: +1 Stapel (voll bleibt voll —
kein Reset mehr). … Stapel bleiben (Payoff statt Sättigung entladen)"*. Stacks are never consumed
on a win, for any card, with or without this skill. The clause was reassuring the reader against a
saturation-discharge mechanic that no longer exists — a `docs/desc-check.md` finding, not a
shortening. Nothing Kurzschluss actually does is lost.
**Booking required:** the `5` leaves with the parenthesis (de and en).

**Gruppe 2 in Zahlen:** 134 → 102 DE, 148 → 111 EN, three of six untouched.

---

## Blitz · Gruppe 3 — der Rest der Nicht-Legendären — ABGESTIMMT

### 12 · SK_LIGHTNING_13 Spannungsstau

**DE alt (24)**
> Jeder Sieg ohne Crit gibt +5 % Crit-Chance für den nächsten Sieg (bis +50 %); ein Crit entlädt den Stau und setzt ihn zurück.

**DE neu (20)**
> Jeder Sieg ohne Crit gibt +5 % Crit-Chance für den nächsten Sieg (bis +50 %). Ein Crit setzt sie zurück.

    desc: `Jeder Sieg ohne Crit gibt +${pct(C.SPANNUNGSSTAU_STEP)} % Crit-Chance für den nächsten Sieg (bis +${pct(C.SPANNUNGSSTAU_CAP)} %). Ein Crit setzt sie zurück.`,

**EN alt (24)**
> Every win without a crit grants +5% crit chance for the next win (up to +50%); a crit releases the buildup and resets it.

**EN neu (20)**
> Every win without a crit grants +5% crit chance for the next win (up to +50%). A crit resets it.

    "ability.SK_LIGHTNING_13.desc": `Every win without a crit grants +${pct(C.SPANNUNGSSTAU_STEP)}% crit chance for the next win (up to +${pct(C.SPANNUNGSSTAU_CAP)}%). A crit resets it.`,

"entlädt den Stau und setzt ihn zurück" said one event twice. **Owner's call: the word *Stau* goes
too.** The pronoun follows it — "ihn" had no antecedent left once the masculine noun was gone, so
it becomes "sie" (Crit-Chance, feminine). Grammar, not a choice; recorded so it is not read as a
liberty. Numbers unchanged.

### 13 · SK_LIGHTNING_14 Überschlag — variant A, owner's choice

**DE alt (37)**
> Crit-Chance über 100 % verfällt nicht: sie wird bei jedem Sieg in Ladung umgewandelt: je 10 Prozentpunkte über 100 % gibt es +1 Ladung. Sind ~85 % der Karten voll ionisiert (Voll-Tiefe), reichen 5 Prozentpunkte je Ladung.

**DE neu (26)**
> Crit-Chance über 100 % wird bei jedem Sieg in Ladung umgewandelt: je 10 Prozentpunkte +1 Ladung. Sind ~85 % der Karten voll ionisiert, reichen 5 Prozentpunkte.

    desc: `Crit-Chance über 100 % wird bei jedem Sieg in Ladung umgewandelt: je ${C.UEBERSCHLAG_PP_PER_CHARGE} Prozentpunkte +1 Ladung. Sind ~${pct(C.ION_SAT_DEPTH_FRAC)} % der Karten voll ionisiert, reichen ${C.UEBERSCHLAG_DEPTH_PP_PER_CHARGE} Prozentpunkte.`,

**EN alt (40)**
> Crit chance above 100% is not wasted: it converts into charge on every win: every 10 percentage points above 100% give +1 charge. Once ~85% of the cards are fully ionized (full depth), 5 percentage points per charge are enough.

**EN neu (30)**
> Crit chance above 100% converts into charge on every win: every 10 percentage points give +1 charge. Once ~85% of the cards are fully ionized, 5 percentage points are enough.

    "ability.SK_LIGHTNING_14.desc": `Crit chance above 100% converts into charge on every win: every ${C.UEBERSCHLAG_PP_PER_CHARGE} percentage points give +1 charge. Once ~${pct(C.ION_SAT_DEPTH_FRAC)}% of the cards are fully ionized, ${C.UEBERSCHLAG_DEPTH_PP_PER_CHARGE} percentage points are enough.`,

The second colon was the dash pass turning an em-dash into one in a sentence that already carried
a colon. **The owner was offered two variants and chose A**, the one that also drops "verfällt
nicht" / "is not wasted". Recorded because it interacts with Gewitterfront (#4), whose foreign
sentence was cut on the grounds that Überschlag states the same thing: after A, the explicit
reassurance exists nowhere. What remains — "wird … in Ladung umgewandelt" — still says where the
excess goes, so no claim is lost; only the reassuring framing is.
Also gone: `(Voll-Tiefe)` / `(full depth)`, a term gloss, and the repeated "über 100 %" in the
rate clause, which the opening already established.
**Bookings required:** `num` de/en (one of the two `100`s), `hyphen … de 2->1` (`Voll-Tiefe`).

### 14 · SK_LIGHTNING_04 Überspannung — UNVERÄNDERT (12 / 13)

> Ein Crit auf oder direkt neben einer ionisierten Karte erzeugt +3 Ladung.

### 15 · SK_LIGHTNING_15 Blitzschlag — German unchanged (8), English grammar fix (10)

> Jeder Crit ionisiert die gewonnene Karte (+1 Stapel).

**EN alt** "Every crit ionizes the card it won with (+1 stack**s**)." → **EN neu** "… (+1 stack)."

    "ability.SK_LIGHTNING_15.desc": `Every crit ionizes the card it won with (+${C.BLITZSCHLAG_STACKS} stack).`,

The parenthesis is the quantity, not decoration, and stays. Only the English number agreement was
wrong. **Caveat worth knowing:** the noun is now hardcoded singular against an interpolated
constant. Correct at `BLITZSCHLAG_STACKS = 1`; if that constant is ever raised, the noun has to
follow. The same was true in reverse before this fix.

### 16 · SK_LIGHTNING_16 Dauerstrom — not shorter, deliberately

**DE alt (24)**
> Jeder Sieg in Folge gibt +1 Ladung je 3 Serienpunkte (höchstens +3/Sieg). Jeder volle Verbrauch gibt zudem dauerhaft +2 % Crit-Chance (bis +40 %).

**DE neu (24)**
> Jeder Sieg in Folge gibt +1 Ladung je 3 Serienpunkte (höchstens +3/Sieg). Jeder volle Ladungsverbrauch gibt dauerhaft +2 % Crit-Chance (bis +40 %).

    desc: `Jeder Sieg in Folge gibt +1 Ladung je ${C.DAUERSTROM_PER_STREAK} Serienpunkte (höchstens +${C.DAUERSTROM_MAX}/Sieg). Jeder volle Ladungsverbrauch gibt dauerhaft +${pct(C.DAUERSTROM_CONSUME_CRIT)} % Crit-Chance (bis +${pct(C.DAUERSTROM_CRIT_CAP)} %).`,

**EN (29 → 29)**
> Every win in a row grants +1 charge per 3 streak points (at most +3 per win). Every full charge consumption permanently grants +2% crit chance (up to +40%).

    "ability.SK_LIGHTNING_16.desc": `Every win in a row grants +1 charge per ${C.DAUERSTROM_PER_STREAK} streak points (at most +${C.DAUERSTROM_MAX} per win). Every full charge consumption permanently grants +${pct(C.DAUERSTROM_CONSUME_CRIT)}% crit chance (up to +${pct(C.DAUERSTROM_CRIT_CAP)}%).`,

**An exception for the acceptance criterion: same length before and after.** "zudem" / "also" came
out, but "Jeder volle Verbrauch" became "Jeder volle Ladungsverbrauch" to restore the shared stem
the owner ruled on in Gruppe 1. A consistency fix that happens to cost exactly what the connective
tissue paid back. Recorded as a wash, not claimed as a shortening.

### 17 · SK_LIGHTNING_17 Serienschutz

**DE alt (22)**
> Verlierst du einen Stich, während du mindestens die halbe Ladung (50 %) hast, bricht deine Serie nicht; dafür wird diese Ladung verbraucht.

**DE neu (18)**
> Verlierst du einen Stich mit mindestens 50 % Ladung, bricht deine Serie nicht. Diese Ladung wird dafür verbraucht.

    desc: `Verlierst du einen Stich mit mindestens ${pct(C.SERIENSCHUTZ_COST_FRAC)} % Ladung, bricht deine Serie nicht. Diese Ladung wird dafür verbraucht.`,

**EN alt (23)**
> If you lose a trick while holding at least half your charge (50%), your streak does not break; that charge is consumed instead.

**EN neu (21)**
> If you lose a trick while holding at least 50% charge, your streak does not break. That charge is consumed instead.

    "ability.SK_LIGHTNING_17.desc": `If you lose a trick while holding at least ${pct(C.SERIENSCHUTZ_COST_FRAC)}% charge, your streak does not break. That charge is consumed instead.`,

**Self-corrected before landing.** The first draft dropped "(50 %)" as a restatement of "die halbe
Ladung" and kept the prose — which would have replaced an interpolated constant with a hardcoded
claim. Raise `SERIENSCHUTZ_COST_FRAC` to 0.4 and "halbe Ladung" becomes a lie: precisely the §4
drift check 3 exists to catch. Inverted instead: the prose goes, the constant stays. Two words
worse than the draft, no booking needed at all, and the text cannot drift.
**Not every parenthesised figure is a restatement.** Where the words around it are prose *for* the
constant, the parenthesis is the only thing keeping the line honest.

---

## Blitz · Gruppe 4 — die vier Legendären — ABGESTIMMT

### 18 · SK_LIGHTNING_L01 Donnergott

**DE alt (15)**
> Konsumenten lösen schon bei 70 % Ladung aus (öfter entladen) und geben dauerhaft +0,4× Crit-Multiplikator.

**DE neu (13)**
> Konsumenten lösen schon bei 70 % Ladung aus und geben dauerhaft +0,4× Crit-Multiplikator.

    desc: `Konsumenten lösen schon bei ${pct(C.DONNERGOTT_THRESHOLD_FRAC)} % Ladung aus und geben dauerhaft +${de(C.THUNDER_CRIT_MULT)}× Crit-Multiplikator.`,

**EN alt (15)** → **EN neu (12)**
> Consumers already trigger at 70% charge and permanently grant +0.4× crit multiplier.

    "ability.SK_LIGHTNING_L01.desc": `Consumers already trigger at ${pct(C.DONNERGOTT_THRESHOLD_FRAC)}% charge and permanently grant +${num(C.THUNDER_CRIT_MULT)}× crit multiplier.`,

"(öfter entladen)" was the consequence of the lower threshold, not a second effect — "schon bei"
already carries it. Numbers unchanged.

### 19 · SK_LIGHTNING_L02 Doppelentladung

**DE alt (39)**
> Bei vollem Ladungsverbrauch ionisiert der Konsument 3× so viele Karten. Zusätzlich gibt jeder Sieg mit einer ionisierten Karte +40 Score je Ionisierungsstapel auf dem Feld (bis 120 Stapel); der Score-Anteil skaliert mit dem Blitz-Bekenntnis (voll bei reinem Blitz).

**DE neu (30)**
> Bei vollem Ladungsverbrauch ionisiert der Konsument 3× so viele Karten. Jeder Sieg mit einer ionisierten Karte gibt +40 Score je Ionisierungsstapel im Feld (bis 120), anteilig zu deinen gehaltenen Blitz-Skills.

    desc: `Bei vollem Ladungsverbrauch ionisiert der Konsument ${C.DOPPELENTLADUNG_FACTOR}× so viele Karten. Jeder Sieg mit einer ionisierten Karte gibt +${C.DOPPELENT_DIRECT} Score je Ionisierungsstapel im Feld (bis ${C.DOPPELENT_FIELD_CAP}), anteilig zu deinen gehaltenen Blitz-Skills.`,

**EN alt (48)** → **EN neu (38)**
> On a full charge consumption, the consumer ionizes 3× as many cards. Every win with an ionized card gives +40 score per ionization stack on the field (up to 120), in proportion to the lightning skills you hold.

    "ability.SK_LIGHTNING_L02.desc": `On a full charge consumption, the consumer ionizes ${C.DOPPELENTLADUNG_FACTOR}× as many cards. Every win with an ionized card gives +${C.DOPPELENT_DIRECT} score per ionization stack on the field (up to ${C.DOPPELENT_FIELD_CAP}), in proportion to the lightning skills you hold.`,

### 20 · SK_LIGHTNING_L03 Flächenionisation

**DE alt (43)**
> Gewinnst du mit einer ionisierten Karte, bekommen beide ungespielten Nachbarkarten je +1 Ionisierungsstapel. Zusätzlich gibt jeder Sieg mit einer ionisierten Karte +130 Score je ionisierter Karte auf dem Feld (bis 30 Karten); der Score-Anteil skaliert mit dem Blitz-Bekenntnis (voll bei reinem Blitz).

**DE neu (28)**
> Gewinnst du mit einer ionisierten Karte, bekommen beide ungespielten Nachbarkarten je +1 Ionisierungsstapel, dazu +130 Score je ionisierter Karte im Feld (bis 30), anteilig zu deinen gehaltenen Blitz-Skills.

    desc: `Gewinnst du mit einer ionisierten Karte, bekommen beide ungespielten Nachbarkarten je +1 Ionisierungsstapel, dazu +${C.FLAECHENION_DIRECT} Score je ionisierter Karte im Feld (bis ${C.FLAECHENION_FIELD_CAP}), anteilig zu deinen gehaltenen Blitz-Skills.`,

**EN alt (52)** → **EN neu (37)**
> When you win with an ionized card, both unplayed neighbour cards each get +1 ionization stack, plus +130 score per ionized card on the field (up to 30), in proportion to the lightning skills you hold.

    "ability.SK_LIGHTNING_L03.desc": `When you win with an ionized card, both unplayed neighbour cards each get +1 ionization stack, plus +${C.FLAECHENION_DIRECT} score per ionized card on the field (up to ${C.FLAECHENION_FIELD_CAP}), in proportion to the lightning skills you hold.`,

**The condition was stated twice** — "Gewinnst du mit einer ionisierten Karte" and "jeder Sieg mit
einer ionisierten Karte" are the same case. Named once, both effects hung off it. That is the
whole 15-word saving; the commitment clause below cost 3 back.

#### The commitment clause — the one place this round nearly changed a rule

The owner first called *"Der Score-Anteil folgt deinem Blitz-Bekenntnis, voll bei reinem Blitz"*
fluff and asked for it out of both texts. Checked before cutting — `engine.js:868–874`:

    const lightCommit = commitScale(activeLightningCount(skills));
    lightDirect += Math.min(nIon, C.FLAECHENION_FIELD_CAP) * C.FLAECHENION_DIRECT * lightCommit;

with `commitScale = (n) => Math.pow(Math.min(1, n / C.SKILL_SLOTS), C.COMMIT_EXP)` — linear,
`SKILL_SLOTS = 6`, `COMMIT_EXP = 1`:

| held lightning skills | share | Flächenionisation actually pays |
|---|---|---|
| 1 | 17 % | **22**, not 130 |
| 2 | 33 % | 43 |
| 3 | 50 % | **65** |
| 4 | 67 % | 87 |
| 6 (pure lightning) | 100 % | 130 |

Dropping it would leave the text claiming +130 for a build that receives 22 — a silent rule
change, which decision 2 of the contract forbids. Tabled instead as a three-word tail, which the
owner took. **The wording is the owner's**: *Bekenntnis* out, the held skills named directly.

**Two consequences, reported not acted on:**

1. **§1c lists *Bekenntnis* as canonical** ("Anteil der Skill-Slots eines Archetyps", NOT
   *Commitment*). Replacing it with plain wording is exactly what H3 warns against. Booked here as
   a deliberate, owner-made exception: the term was opaque at the point of use, and naming the
   held skills is closer to what the code actually counts.
2. **The glossary entry is now orphaned.** `glossary.js:211` defines `bekenntnis` with
   `match: ["Bekenntnis", "Blitz-Bekenntnis", "Feuer-Bekenntnis"]`, and a repo-wide grep finds
   *Blitz-Bekenntnis* in player text **only** in these two descriptions — no fire text uses its
   variant. After this round the entry has nothing left to bold. Glossary texts belong to
   `text-voice-pass` per the contract's non-goals, so nothing was touched; flagged for whoever
   owns that decision.

### 21 · SK_LIGHTNING_L04 Durchschlag

**DE alt (16)**
> Gewinnt eine voll ionisierte Karte (5 Stapel) mit Crit, gibt sie dauerhaft +0,18× Crit-Multiplikator (bis +2×).

**DE neu (14)**
> Gewinnt eine voll ionisierte Karte mit Crit, gibt sie dauerhaft +0,18× Crit-Multiplikator (bis +2×).

    desc: `Gewinnt eine voll ionisierte Karte mit Crit, gibt sie dauerhaft +${de(C.DURCHSCHLAG_CRIT_MULT)}× Crit-Multiplikator (bis +${de(C.DURCHSCHLAG_MULT_CAP)}×).`,

**EN alt (20)** → **EN neu (17)**
> When a fully ionized card wins with a crit, it permanently grants +0.18× crit multiplier (up to +2×).

    "ability.SK_LIGHTNING_L04.desc": `When a fully ionized card wins with a crit, it permanently grants +${num(C.DURCHSCHLAG_CRIT_MULT)}× crit multiplier (up to +${num(C.DURCHSCHLAG_MULT_CAP)}×).`,

Third instance of `(5 Stapel)` restating "voll ionisiert", same booking as Blitzfänger and
Kurzschluss.

**Gruppe 4 in Zahlen:** 113 → 85 DE, 135 → 104 EN.

---

# Decisions as they are made

Recorded in the owner's terms so later rounds lean on them instead of re-deciding.

**Runde Blitz, Gruppe 1 (Linie Ladung)** — all five accepted as tabled.

- **Der Stamm bleibt.** Five Blitz skills open with "Jeder volle Ladungsverbrauch". That is
  recognition, not redundancy — do not vary it apart, in this or any later round.
- **Ein Skill wirbt nicht mit der Wirkung eines anderen.** Gewitterfront's second sentence was
  about Überschlag. §3 read backwards: what hangs on a skill is said at that skill.
- **Bedingung raus aus der Klammer, nicht raus aus dem Text.** Reststrom keeps "statt 0" as a
  sentence part. Applies to all 24 cap and 3 exception parentheses in the corpus.
- **Blitz war der letzte Rework.** The owner expects less to do here than in the other three
  archetypes. `unverändert` is a normal outcome in this round, not an evasion.
- **No rulebook.** The owner declined an up-front target-form ruleset; the shape is settled text
  by text, and these notes are the record of what was settled, not a spec to apply mechanically.

**Runde Blitz, Gruppe 2 (Konsumenten & Ionisierung)** — three of six left untouched, two shortened
further than tabled on the owner's call.

- **Kein Aufbau-und-Widerruf.** Blitzfänger described the normal behaviour ("verpufft sie") only to
  revoke it in the next sentence. The effect is the content; the baseline it deviates from is not.
- **Was die Bedingung schon sagt, sagt die Wirkung nicht nochmal.** Kurzschluss lost "bei jedem
  Sieg" because "Gewinnst du mit einer voll ionisierten Karte" already states it.
- **Bedingung · Doppelpunkt · Wirkungen** is now the settled shape for skills that fire on a
  situation and pay out more than one thing — Blitzfänger and Kurzschluss both landed on it, and
  it is worth reaching for first in the later rounds. Arrived at by writing, not decreed up front.
- **Die Aufzählung darf bleiben, wo sie trägt.** Ionisierung stays at 36 words because four effects
  as four lines beat one sentence chain. Length alone is not the defect.

**Runde Blitz, Gruppe 3 (der Rest der Nicht-Legendären).**

- **Nicht jede Klammer mit Zahl ist eine Wiederholung.** Serienschutz's "(50 %)" was the
  interpolated constant, and "die halbe Ladung" was the prose describing it. Dropping the
  parenthesis and keeping the prose would have hardcoded a tuning value in words. Rule of thumb
  earned here: before cutting a figure, ask which of the two — figure or words — is the one
  fed by `constants.js`. Cut the other one.
- **Zwei Zusicherungen desselben Sachverhalts sind eine zu viel.** Gewitterfront's foreign sentence
  and Überschlag's "verfällt nicht" both said the excess is not lost. Both are gone now; what the
  excess *becomes* is still stated, at Überschlag, where it belongs.
- **Ein Konsistenzfix darf Wörter kosten.** Dauerstrom came out exactly as long as it went in
  because the shared stem was restored. Booked as a wash, not dressed up as a shortening.
- **Verify before cutting a clause that sounds like a guarantee.** "ohne die Stapel zu verlieren"
  read like a differentiator and was a leftover from a removed mechanic — `engine.js` settled it in
  one grep. Applies to every "nicht", "ohne" and "statt" clause in the remaining three rounds.

**Runde Blitz, Gruppe 4 (die Legendären).**

- **Dieselbe Bedingung steht einmal.** Flächenionisation named its trigger twice and paid 15 words
  for it. Where two effects share a condition, name it once and hang both off it — the biggest
  single saving in the whole archetype.
- **Ein Skalierungsfaktor ist kein Fluff.** The commitment clause looked like flourish and was the
  difference between 130 and 22. Any clause that qualifies a printed number gets checked against
  the engine before it is cut, not after.
- **Drei Wörter statt zehn schlägt null statt zehn.** When a claim is real but overwritten,
  the move is to compress it into the sentence that carries the number, not to drop it and not to
  leave it as its own sentence.
- **Kanonische Begriffe sind nicht unantastbar — aber ihr Wegfall wird gebucht.** *Bekenntnis*
  (§1c) gave way to naming the held skills, on the owner's call. Recorded with its consequence
  (an orphaned glossary entry) rather than quietly absorbed.

---

# Machine check — and the one thing it cannot record

`scripts/text-voice-check.mjs` landed with the gate and is reused as-is (no second checker).
Run: `npm run loc:export && node scripts/text-voice-check.mjs --baseline <branch point>`.

| check | escape hatch | this pass |
|---|---|---|
| 1 · no unlisted em-dash | `dash <key> <lang>` | not expected to fire |
| 2 · compound count per key | `hyphen <key> <lang> a->b` | fires where a compound leaves with a parenthesis |
| 3 · number multiset per key | **none** | fires wherever a numeric restatement is dropped |

Check 3 is the H1 guard and must stay strict against baking a constant into prose. But this pass
legitimately removes numbers that only restated something the same sentence already said
(`(5 Stapel)` after "voll ionisiert", the `100 %` in Gewitterfront's foreign sentence).
**Needed: a third entry kind in `docs/localization/text-voice-keep.txt`** —
`num <key> <lang> <a>-><b> <reason>` — plus the matching branch in the script. Alternative
considered and rejected: loosening check 3 to a subset test (every number in the new text must
have existed in the old). It would pass silently for a genuine drift where a constant is replaced
by a different constant that happens to appear elsewhere in the line.

## Bookings so far

    hyphen  ability.SK_LIGHTNING_01.desc  de  1->0   Grund-Ladung leaves with the parenthesis it
                                                     stood in; the compound is gone, not broken.
    num     ability.SK_LIGHTNING_06.desc  de  -100   the 100 % belonged to a sentence about
    num     ability.SK_LIGHTNING_06.desc  en  -100   Überschlag, which states it in its own text.
    num     ability.SK_LIGHTNING_12.desc  de  -0     "(0 Stapel)" only restated "noch nicht
    num     ability.SK_LIGHTNING_12.desc  en  -0     ionisiert" in the same clause.
    num     ability.SK_LIGHTNING_11.desc  de  -5     "(5 Stapel)" only restated "volle Karte"
    num     ability.SK_LIGHTNING_11.desc  en  -5     in the same clause.
    num     ability.SK_LIGHTNING_09.desc  de  -5     "(5 Stapel)" only restated "voll ionisierten"
    num     ability.SK_LIGHTNING_09.desc  en  -5     in the same clause.
    num     ability.SK_LIGHTNING_14.desc  de  -100   the rate clause repeated "über 100 %", which
    num     ability.SK_LIGHTNING_14.desc  en  -100   the opening of the same sentence establishes.
    hyphen  ability.SK_LIGHTNING_14.desc  de  2->1   "(Voll-Tiefe)" was a term gloss; the compound
                                                     is gone, not broken. EN had no hyphen there.
    num     ability.SK_LIGHTNING_L04.desc de  -5     "(5 Stapel)" only restated "voll ionisierte"
    num     ability.SK_LIGHTNING_L04.desc en  -5     in the same clause.
    hyphen  ability.SK_LIGHTNING_L02.desc de  ?->?   "Blitz-Bekenntnis" replaced by "gehaltenen
    hyphen  ability.SK_LIGHTNING_L03.desc de  ?->?   Blitz-Skills" — one compound out, one in;
                                                     recount against the CSV before booking.

Blitz needs 12 `num` and 4 `hyphen` bookings in total. Eleven of the twelve `num` entries are the
same case — a parenthesis spelling out as a figure what the words beside it already said. The
twelfth (Überschlag) is a repeated "über 100 %" inside one sentence. Nothing was removed that a
reader could not still derive, and no constant was baked into prose; Serienschutz was inverted
specifically to avoid that (see #17).

Every `num` booking so far is the same case: a parenthesis that spelled out, as a figure, what the
words right next to it already said. None of them removes a number the reader could not still
derive, and none of them bakes a constant into prose — which is what check 3 exists to catch.

---

# Defects found while reading, not introduced here

- **SK_LIGHTNING_09 and SK_LIGHTNING_14 — double colon.** The dash pass replaced an em-dash with a
  colon in a sentence that already carried one: "kurzschließt sie: +250 Score und +3 Ladung: bei
  jedem Sieg" and "verfällt nicht: sie wird … umgewandelt: je 10 Prozentpunkte". Both read as a
  typo. Repaired inside this round's rewrite; noted here so it is not read as collateral.
- **SK_LIGHTNING_09 — self-reference.** "kurzschließt sie" is the skill's own name (Kurzschluss)
  as a verb, which §3 forbids. Handled in the rewrite.

---

# Eis — 21 skills

Measured at the same baseline. Ice is the densest archetype: fewest parentheses (9) but the three
longest texts in the game. This is where H6 of the contract lives.

| # | ID | Name | DE | EN | Status |
|---|---|---|---|---|---|
| 1 | SK_ICE_01 | Anfrieren | 14 → 11 | 17 → 12 | abgestimmt |
| 2 | SK_ICE_02 | Schneetreiben | 46 → 35 | 60 → 42 | abgestimmt |
| 3 | SK_ICE_03 | Dauerfrost | 47 → 42 | 51 → 47 | abgestimmt |
| 4 | SK_ICE_04 | Verdichtung | 28 → 22 | 36 → 30 | abgestimmt |
| 5 | SK_ICE_05 | Verschmelzen | 15 → 13 | 22 → 19 | abgestimmt |
| 6 | SK_ICE_06 | Packeis | 9 | 10 | unverändert |
| 7 | SK_ICE_07 | Eisbrücke | 20 → 18 | 20 → 18 | abgestimmt |
| 8 | SK_ICE_08 | Eiswall | 17 → 15 | 20 → 18 | abgestimmt |
| 9 | SK_ICE_09 | Verzahnung | 12 | 13 | unverändert |
| 10 | SK_ICE_10 | Abbruchkante | 18 → 19 | 21 → 22 | abgestimmt |
| 11 | SK_ICE_11 | Kettenbruch | 17 → 15 | 22 → 16 | abgestimmt |
| 12 | SK_ICE_12 | Zermalmen | 13 | 17 | unverändert |
| 13 | SK_ICE_13 | Rissbildung | 11 → 9 | 12 → 10 | abgestimmt |
| 14 | SK_ICE_14 | Gletschersturz | 16 → 13 | 16 → 13 | abgestimmt |
| 15 | SK_ICE_15 | Einfrieren | 13 | 17 | unverändert |
| 16 | SK_ICE_16 | Frostbund | 22 → 18 | 26 → 22 | abgestimmt |
| 17 | SK_ICE_17 | Eispanzer | 17 → 16 | 19 → 17 | abgestimmt |
| 18 | SK_ICE_L01 | Eiszeit [L] | 30 → 27 | 33 → 30 | abgestimmt |
| 19 | SK_ICE_L02 | Ewiges Schild [L] | 51 → 36 | 53 → 38 | abgestimmt |
| 20 | SK_ICE_L03 | Große Lawine [L] | 39 → 25 | 39 → 25 | abgestimmt |
| 21 | SK_ICE_L04 | Erstarrung [L] | 29 → 24 | 36 → 28 | abgestimmt |

Eis baseline DE 484 words · longest 51 (Ewiges Schild), then 47 (Dauerfrost) and 46 (Schneetreiben).
Note: these are 1–2 words below the figures in the task contract — the dash pass moved them
between the contract being written and this round starting.

**Eis complete.** 484 → 405 DE (−16 %), longest 51 → 36. 4 of 21 untouched, 1 deliberately longer
(Abbruchkante), 16 shorter. Dauerfrost is the H6 case: 47 → 42 and no further without structure.

---

## Eis · Gruppe 1 — Masse-Aufbau — ABGESTIMMT

### 1 · SK_ICE_01 Anfrieren

**DE alt (14)** → **DE neu (11)**
> Ein Gletscher-Sieg gibt +1 Masse extra; siegt der Gletscher in einer Formation, zusätzlich +2.

> Ein Gletscher-Sieg gibt +1 Masse extra, in einer Formation zusätzlich +2.

    desc: `Ein Gletscher-Sieg gibt +${G_ANFRIEREN_WIN} Masse extra, in einer Formation zusätzlich +${G_ANFRIEREN_FORM}.`,

**EN alt (17)** → **EN neu (12)**
> A glacier win gives +1 extra mass, +2 more inside a formation.

    "ability.SK_ICE_01.desc": `A glacier win gives +${G_ANFRIEREN_WIN} extra mass, +${G_ANFRIEREN_FORM} more inside a formation.`,

### 2 · SK_ICE_02 Schneetreiben

**DE alt (46)**
> Gewinnt ein Gletscher, sät er +2 Firn in die Boden-Reserve eines angrenzenden offenen Feldes: zusätzlich, ohne eigene Masse abzugeben; nur bei 0 eigener Masse gibt er stattdessen seine Sieg-Masse ab. Nur offener Boden (nie unter einen Gletscher), nur die 4 direkten Nachbarn, Eisbrücke zählt hier nicht.

**DE neu (35)** — written with **Schnee**, see the rename section
> Gewinnt ein Gletscher, sät er +2 Schnee in die Boden-Reserve eines der 4 angrenzenden offenen Felder, ohne eigene Masse abzugeben. Nur bei 0 eigener Masse gibt er stattdessen seine Sieg-Masse ab. Eisbrücke erweitert das nicht.

    desc: `Gewinnt ein Gletscher, sät er +${G_SCHNEETREIBEN_SEED} Schnee in die Boden-Reserve eines der 4 angrenzenden offenen Felder, ohne eigene Masse abzugeben. Nur bei 0 eigener Masse gibt er stattdessen seine Sieg-Masse ab. Eisbrücke erweitert das nicht.`,

**EN alt (60)** → **EN neu (42)**
> When a glacier wins, it seeds +2 snow into the ground reserve of one of the 4 adjacent open cells, keeping its own mass. Only a glacier at 0 mass gives up its win mass instead. Ice bridge does not extend this.

    "ability.SK_ICE_02.desc": `When a glacier wins, it seeds +${G_SCHNEETREIBEN_SEED} snow into the ground reserve of one of the 4 adjacent open cells, keeping its own mass. Only a glacier at 0 mass gives up its win mass instead. Ice bridge does not extend this.`,

Six claims, all six verified against `glacier.js:356` ("ADDITIV +Masse aufs Nachbarfeld (Gletscher
behält seine Sieg-Masse); nur bei 0 eigener Masse gibt er stattdessen die Sieg-Masse ab") and kept.
The entire third sentence was restatement: "offenes Feld" **is** open ground, "(nie unter einen
Gletscher)" **is** what open means, and "die 4 direkten Nachbarn" moved forward into the first
clause. "zusätzlich" is carried by "ohne eigene Masse abzugeben".
**No booking:** the numbers 2 / 4 / 0 all survive. The single largest saving in the archetype.

### 3 · SK_ICE_03 Dauerfrost — the one that barely moves

**DE alt (47)**
> Jeden Durchlauf frostet offener Boden zu: ungefrorene Felder sammeln Firn in ihrer Boden-Reserve nach Abstand zum nächsten Gletscher: +1 bei 2 Feldern Abstand, +2 ab 3. Die 8 Felder direkt um einen Gletscher bleiben leer. Die Reserve füllt einen später hier gefrorenen Gletscher zum Durchlauf-Beginn wieder auf.

**DE neu (42)** — written with **Schnee**, see the rename section
> Jeden Durchlauf sammeln ungefrorene Felder Schnee in ihrer Boden-Reserve: +1 bei 2 Feldern Abstand zum nächsten Gletscher, +2 ab 3. Die 8 Felder direkt um einen Gletscher bleiben leer. Friert hier später ein Gletscher ein, füllt die Reserve ihn zum Durchlauf-Beginn auf.

    desc: `Jeden Durchlauf sammeln ungefrorene Felder Schnee in ihrer Boden-Reserve: +1 bei ${G_DAUERFROST_NEAR} Feldern Abstand zum nächsten Gletscher, +${G_DAUERFROST_FAR} ab 3. Die 8 Felder direkt um einen Gletscher bleiben leer. Friert hier später ein Gletscher ein, füllt die Reserve ihn zum Durchlauf-Beginn auf.`,

**EN alt (51)** → **EN neu (47)**
> Every cycle, unfrozen cells collect snow in their ground reserve: +1 at 2 cells' distance from the nearest glacier, +2 from 3. The 8 cells directly around a glacier stay empty. If a glacier later freezes here, the reserve refills it at the start of the cycle.

**H6 lives here.** 47 → 42 is an honest, small win, recorded as such rather than dressed up. The
opening was a headline that restated the sentence following it — and carried the round's third
double colon. What remains is four claims, three of them numeric, none removable: the per-cycle
accrual, the two distance bands, the dead 8-cell ring, and the later refill. **Wording alone does
not get this text near the Blitz yardstick, and no structural change is in scope.**

### 4 · SK_ICE_04 Verdichtung — a canonical-term fix, not just a shortening

**DE alt (28)**
> Erhöht ein Gebäude die Kartenstärke einer Gletscher-Karte, wird dieser Wert-Bonus nicht ausgespielt (die Karte kämpft ohne ihn), sondern in Masse getankt: +0,25 Masse je Punkt. Score-Gebäude bleiben unberührt.

**DE neu (22)**
> Erhöht ein Gebäude den Kampfwert einer Gletscher-Karte, wird dieser Bonus nicht ausgespielt, sondern in Masse umgewandelt: +0,25 Masse je Punkt. Score-Gebäude bleiben unberührt.

    desc: `Erhöht ein Gebäude den Kampfwert einer Gletscher-Karte, wird dieser Bonus nicht ausgespielt, sondern in Masse umgewandelt: +${de(G_VERDICHTUNG_RATE)} Masse je Punkt. Score-Gebäude bleiben unberührt.`,

**EN alt (36)** → **EN neu (30)**
> If a building raises the combat value of a glacier card, that bonus is not played out but converted into mass instead: +0.25 mass per point. Score buildings are untouched.

    "ability.SK_ICE_04.desc": `If a building raises the combat value of a glacier card, that bonus is not played out but converted into mass instead: +${num(G_VERDICHTUNG_RATE)} mass per point. Score buildings are untouched.`,

**"Kartenstärke" appears exactly once in the entire player-facing text** — here. §1a knows
*Kartenwert*, *Stichwert*, *Kampfwert* and nothing else. `engine.js:357–371` settles which one:
`architectValue` feeds `pValue`, the per-trick combat total, so it is **Kampfwert** / *combat
value* (the term `skill.passive.fire` already uses in both languages). "getankt" is not register
either; "umgewandelt" says the same thing plainly. The parenthesis "(die Karte kämpft ohne ihn)"
restated "nicht ausgespielt" — verified equivalent at `engine.js:367`
(`architectValueEff = verdichtung ? 0 : architectValue`).

### 5 · SK_ICE_05 Verschmelzen

**DE alt (15)** → **DE neu (13)**
> Zu Durchlauf-Beginn heben angrenzende Gletscher einander auf den Masse-Durchschnitt ihres Clusters, nur anhebend, nie fallend.

> Zu Durchlauf-Beginn heben angrenzende Gletscher einander auf den Masse-Durchschnitt ihres Clusters, nie fallend.

**EN alt (22)** → **EN neu (19)**
> At the start of a cycle, adjacent glaciers lift each other to the average mass of their cluster, never dropping.

"heben … auf" already carries the direction; "nie fallend" is the claim and stays.

**Gruppe 1 in Zahlen:** 150 → 123 DE, 186 → 150 EN.

---

## Eis · Gruppe 2 — Geometrie & erster Bruch — ABGESTIMMT

### 6 · SK_ICE_06 Packeis — UNVERÄNDERT (9 / 10)
### 9 · SK_ICE_09 Verzahnung — UNVERÄNDERT (12 / 13)

> Jeden Durchlauf gewinnt ein Gletscher +0,5 Masse je Gletscher-Nachbar.

> Jeden Durchlauf gewinnt jeder Gletscher +0,25 Masse je Gletscher im verbundenen Cluster.

The two share the stem "Jeden Durchlauf gewinnt … +X Masse je …", the ice equivalent of the Blitz
charge line. Kept identical on the same reasoning as Gruppe 1 of Blitz.

### 7 · SK_ICE_07 Eisbrücke

**DE alt (20)** → **DE neu (18)**
> Zählt auch die vier Diagonalen als angrenzend (8-Nachbarschaft): verbindet zersplitterte Felder zu einem Cluster (wirkt auf Bruch, Kollision und Cluster-Größe).

> Zählt auch die vier Diagonalen als angrenzend: zersplitterte Felder werden zu einem Cluster, für Bruch, Kollision und Cluster-Größe.

**EN alt (20)** → **EN neu (18)**
> Counts the four diagonals as adjacent too: scattered cells become one cluster, for bursts, collisions and cluster size.

"(8-Nachbarschaft)" said what "auch die vier Diagonalen als angrenzend" says. The second
parenthesis is a real scope claim and stays — without the brackets.
**Booking required:** `num` (the `8`) and `hyphen … de` (the compound `8-Nachbarschaft`), both de
and en for the number.
**Noted in passing:** this text wrote "8-Nachbarschaft", Frostbund (#16) writes "8er-Nachbarschaft"
— two spellings of one term, a §1 defect. After this cut the term survives only at Frostbund, so
the inconsistency resolves itself rather than needing a second edit.

### 8 · SK_ICE_08 Eiswall

**DE alt (17)** → **DE neu (15)**
> Eine komplett gefrorene Reihe oder Spalte (die Linien-Formation) verstärkt das Bersten aller ihrer Gletscher: ×1,6 statt ×1,3.

> Eine komplett gefrorene Reihe oder Spalte verstärkt das Bersten aller ihrer Gletscher: ×1,6 statt ×1,3.

    desc: `Eine komplett gefrorene Reihe oder Spalte verstärkt das Bersten aller ihrer Gletscher: ×${de(G_EISWALL_LINIE)} statt ×${de(G_GEO_LINIE)}.`,

**EN alt (20)** → **EN neu (18)**
> A fully frozen row or column strengthens the burst of all its glaciers: ×1.6 instead of ×1.3.

**Checked rather than guessed.** The open question was whether "(die Linien-Formation)" bridges the
skill text to something the board displays. It does not: `glacier.js:294` defines
`GLACIER_FORM_LABEL = { … linie: "Linie" … }` — the UI shows **"Linie"**, not "Linien-Formation" —
and `de.js:605` explains `glacierlegend.linie` as *"volle Reihe (5) oder Spalte (8)"*, the same
words this text opens with. The parenthesis carried a name the interface never uses, and restated
the legend. Cut.

### 10 · SK_ICE_10 Abbruchkante — LONGER, deliberately, owner's choice

**DE alt (18)** → **DE neu (19)**
> Höhere Masse-Schwellen bersten steiler: Wucht ×1,8 / ×3 an der 2. / 3. Schwelle (statt ×1,5 / ×2,2).

> Höhere Masse-Schwellen bersten steiler: Wucht ×1,8 statt ×1,5 an der 2. Schwelle, ×3 statt ×2,2 an der 3.

**EN alt (21)** → **EN neu (22)**
> Higher mass thresholds burst more steeply: force ×1.8 instead of ×1.5 at the 2nd threshold, ×3 instead of ×2.2 at the 3rd.

**An exception for the acceptance criterion: one word longer, on purpose.** The old line held four
numbers in two slash-lists the reader has to zip together pairwise — the shape §3 bans as
"Pfeil-/Balancing-Notation". Unzipped, each threshold states its own before and after. The owner
was shown both and chose the longer one. Length is the proxy; being understood on first reading is
the goal, and here they point in opposite directions.

**Gruppe 2 in Zahlen:** 76 → 73 DE, 84 → 81 EN. Two untouched, one deliberately longer.

---

## Eis · Gruppe 3 — Bruch & Nachwirkung — ABGESTIMMT

### 12 · SK_ICE_12 Zermalmen — UNVERÄNDERT (13 / 17)
### 15 · SK_ICE_15 Einfrieren — UNVERÄNDERT (13 / 17)

> Trifft ein Bruch einen Gletscher-Nachbarn, zählt die Kollision stärker: Faktor ×2 statt ×1,5.

> Bricht ein Gletscher auf eine Gegnerkarte, verliert diese ihren Stich im nächsten Durchlauf.

### 11 · SK_ICE_11 Kettenbruch — 17 → 15 (EN 22 → 16)

> Bricht ein Gletscher, brechen angrenzende Gletscher sofort mit, auch ohne ihre Schwelle erreicht zu haben.

> When a glacier bursts, adjacent glaciers burst with it immediately, even without reaching their threshold.

"zwingt er … , sofort mitzubrechen" became one verb instead of a verb plus a subordinate clause.

### 13 · SK_ICE_13 Rissbildung — 11 → 9 (EN 12 → 10)

**alt** > Instabiles Eis: ein Gletscher bricht schon ab 6 Masse (statt 12).
**neu** > Ein Gletscher bricht schon ab 6 Masse statt 12.

    desc: `Ein Gletscher bricht schon ab ${G_RISSBILDUNG_BURST} Masse statt ${G_THRESHOLDS[2]}.`,

"Instabiles Eis:" was flavour as an **opener**; §3 permits flavour only as a short note *after* the
mechanical sentence. Offered back to the owner as a trailing note, not taken.

### 14 · SK_ICE_14 Gletschersturz — 16 → 13 (EN 16 → 13)

**alt** > Je mehr Gletscher im selben Durchlauf brechen, desto stärker jeder Bruch: +5 % je brechendem Gletscher.
**neu** > Jeder Bruch wird +5 % stärker je Gletscher, der im selben Durchlauf bricht.

The first clause was the prose version of the second. The figure states it more precisely than the
comparative did, so the comparative goes.

### 16 · SK_ICE_16 Frostbund — 22 → 18 (EN 26 → 22) — and a term corrected against the code

**alt** > Bricht ein Gletscher, werden seine Nicht-Eis-Nachbarn verstärkt: +3 Stichwert im nächsten Durchlauf. Mit Eisbrücke reicht der Buff auf die 8er-Nachbarschaft (inkl. Diagonalen).
**neu** > Bricht ein Gletscher, bekommen seine Nicht-Gletscher-Nachbarn +3 Stichwert im nächsten Durchlauf. Mit Eisbrücke gilt das für die 8er-Nachbarschaft.

    desc: `Bricht ein Gletscher, bekommen seine Nicht-Gletscher-Nachbarn +${G_FROSTBUND_BUFF} Stichwert im nächsten Durchlauf. Mit Eisbrücke gilt das für die 8er-Nachbarschaft.`,

**neu EN** > When a glacier bursts, its non-glacier neighbours get +3 trick value in the next cycle. With ice bridge, this applies to the 8-neighbourhood.

Three things: "(inkl. Diagonalen)" restated "8er-Nachbarschaft"; "werden verstärkt: +3 Stichwert"
said one thing in two clauses; and **"Buff" is an anglicism §3 bans** where a German word exists.
**Owner's call — "Nicht-Eis" → "Nicht-Gletscher" — is a correctness fix, not a preference.**
`engine.js:1197` already carries the owner's wording in its own comment ("bufft er seine
NICHT-Gletscher-Nachbarn") and the condition is literally `if (!glacierLocked[nb])` — not a glacier.
The player text and `glacier.js:315` both said "Nicht-Eis". Hyphen count is unchanged (2 → 2), so
no booking.

### 17 · SK_ICE_17 Eispanzer — 17 → 16 (EN 19 → 17)

**alt** > Eine Niederlage neben einem Gletscher bricht deine Serie nicht und füttert stattdessen +1 Masse je angrenzendem Gletscher.
**neu** > Eine Niederlage neben einem Gletscher bricht deine Serie nicht und gibt +1 Masse je angrenzendem Gletscher.

**Owner's call: "sondern" → "und"**, and it is the more accurate word. "sondern" asserts a
substitution; mechanically both things happen — the streak survives *and* the mass is paid.
"füttert" was register that appears nowhere else in the game.

**Gruppe 3 in Zahlen:** 109 → 97 DE, 129 → 112 EN. Two untouched.

---

## Eis · Gruppe 4 — die vier Legendären — ABGESTIMMT

### 18 · SK_ICE_L01 Eiszeit — 30 → 27 (EN 33 → 30)

**alt** > Jeden Durchlauf: +3 Firn in die Boden-Reserve jedes ungefrorenen Felds, dann friert das reservestärkste davon zum Gletscher ein (startet leer, füllt sich aus seiner Reserve nach), bis zu 16 Gletscher.

**neu** > Jeden Durchlauf +3 Schnee in die Boden-Reserve jedes ungefrorenen Felds. Das reservestärkste friert dann zum Gletscher ein und füllt sich aus seiner Reserve. Bis zu 16 Gletscher.

    desc: `Jeden Durchlauf +${de(G_EISZEIT_FLOOD)} Schnee in die Boden-Reserve jedes ungefrorenen Felds. Das reservestärkste friert dann zum Gletscher ein und füllt sich aus seiner Reserve. Bis zu ${G_EISZEIT_MAX} Gletscher.`,

**neu EN** > Every cycle, +3 snow into the ground reserve of every unfrozen cell. The one with the largest reserve then freezes into a glacier and refills from its reserve. Up to 16 glaciers.

Variant B kept "startet leer" explicitly at 29 words; the owner took A. "füllt sich aus seiner
Reserve" implies the glacier starts from that reserve and nothing else, so no claim is lost —
only the explicit statement of the starting value.

### 19 · SK_ICE_L02 Ewiges Schild — 51 → 36 (EN 53 → 38) — the largest single cut in the pass

**alt (51)**
> Das ganze Feld wird zu EINEM Übergletscher. Jeden Durchlauf ziehen alle deine Gletscher auf die Masse des stärksten hoch und bekommen +3 Masse obendrauf (nie fallend). Beim Bruch gilt jeder Gletscher als Nachbar aller anderen: volle Kaskade und Kollision, egal wo sie liegen. Anordnung wird bedeutungslos, nur die stärkste Masse zählt.

**neu (36)** — owner chose variant A, mechanics only
> Jeden Durchlauf ziehen alle deine Gletscher auf die Masse des stärksten hoch, nie fallend, und bekommen +3 Masse obendrauf. Beim Bruch gilt jeder Gletscher als Nachbar aller anderen: volle Kaskade und Kollision, egal wo sie liegen.

    desc: `Jeden Durchlauf ziehen alle deine Gletscher auf die Masse des stärksten hoch, nie fallend, und bekommen +${G_SCHILD_BONUS} Masse obendrauf. Beim Bruch gilt jeder Gletscher als Nachbar aller anderen: volle Kaskade und Kollision, egal wo sie liegen.`,

**neu EN (38)**
> Every cycle, all your glaciers rise to the mass of the strongest, never dropping, and gain +3 mass on top. On a burst, every glacier counts as a neighbour of every other: full cascade and collision, wherever they sit.

Sentences 1 and 4 were both frames around the same two claims: sentence 4 is the *consequence* of
sentences 2 and 3, sentence 1 their metaphor — and "Übergletscher" is a word that exists nowhere
else in the game. Variant B offered the image back as a closing flavour line (§3 permits flavour
there) at 43 words; the owner took A. "jeder Gletscher als Nachbar aller anderen" carries the
image mechanically.

### 20 · SK_ICE_L03 Große Lawine — 39 → 25 (EN 39 → 25)

**alt** > … massiv verstärkt. **Bis dahin lohnt sich Horten: mehr Gletscher, mehr Masse = ein umso gewaltigerer Schlag.**

**neu** > Im letzten Durchlauf brechen ALLE deine Gletscher auf einen Schlag, auch die noch nicht vollen, jeder mit der Wucht der höchsten Schwelle und massiv verstärkt.

The second sentence was pure strategy advice carrying no claim of its own — and contained an `=`
used as an arithmetic sign in running text, which §3 rules out. "ALLE" stays in capitals: it is
deliberate emphasis on the payoff, and the parallel to "EINEM" in Ewiges Schild is now gone, so it
is the only one left.

### 21 · SK_ICE_L04 Erstarrung — 29 → 24 (EN 36 → 28)

**alt** > **Der Gegner erstarrt:** jede vom Bruch getroffene Gegnerkarte verliert ihren Stich, und der Bruch greift über die vier Nachbarn hinaus weiter ins Gegnerfeld. **Dazu** zählt jeder Bruch ×3 Score.

**neu** > Jede vom Bruch getroffene Gegnerkarte verliert ihren Stich, und der Bruch greift über die vier Nachbarn hinaus ins Gegnerfeld. Jeder Bruch zählt ×3 Score.

"Der Gegner **erstarrt**" is the skill's own name (Erstarrung) as a verb — the same §3 breach as
"kurzschließt" at Kurzschluss in the Blitz round. Second instance of the same fault in the corpus;
worth checking for deliberately in the two remaining archetypes.

**Gruppe 4 in Zahlen:** 149 → 112 DE, 161 → 121 EN.

---

# Firn → Schnee — DECIDED, and this round already writes it

The owner asked for *Firn* to be replaced by a more common word, glossary included. The word is
**Schnee** (EN **snow**). A repo-wide grep finds no other use of "Schnee" outside the skill name
*Schneetreiben*, so there is no §1e double-loading — and the resonance is right, since Schneetreiben
is the skill that seeds it.

**Owner's decision: the rename runs as its own task, BEFORE this pass lands.** Therefore the three
ice texts that mention the resource — Schneetreiben, Dauerfrost, Eiszeit — are written out here
with **Schnee** already, not with Firn. The worker brief is
`worker-firn-to-schnee.md`, alongside this file.

**The store keeps its own name.** Today three names circle one idea: *Firn* (substance),
*Firn-Boden* (a cell holding it), and *Firn-Reserve* **and** *Boden-Reserve* for the same store.
Settled: substance **Schnee**, store **Boden-Reserve** everywhere, *Firn-Reserve* gone. That is why
the texts below read "+2 Schnee in die Boden-Reserve" and not "in die Schnee-Reserve", which would
say snow twice.

**What the rename does not touch, and why the blast radius below is misleading.** Code identifiers
(`firnStack`, `firnMass`, `FIRN_*`, `glacier-firn.test.js`) are not player text. Neither are the
i18n **key names** `bar.ice.firnGround`, `bar.ice.firnReserve`, `arch.firn.title` — only their
values change. Holding both of those still reduces the job to 25 player-visible strings in 9 files,
of which exactly one lives under `src/ui/` (two hardcoded tooltips in `CardGrid.jsx`, which are a
finding of their own: hardcoded German in JSX, exactly what the i18n ratchet at
`test/i18n-guards.test.js:511` exists to prevent).

**The raw blast radius, before that separation:**

| where | occurrences | whose |
|---|---|---|
| `skills.js`, `enSkills.js`, `de.js`, `en.js` | 17 | **this round** |
| `glossary.js`, `enGlossary.js` | 7 | `text-voice-pass` — an explicit non-goal here |
| `src/ui/**`, 9 files | 39 | **the tripwire: "Berührt der Diff `src/ui/**` — anhalten"** |
| `docs/text-style-guide.md` §1c | 2 | the rulebook itself |
| `test/**` | 37 | identifiers, harmless |

Most `src/ui` hits are identifiers (`firnStack`, `firnMass`, `isFirn`) and comments, which a
player-facing rename does not need to touch. But three are player-visible and would have to move:

- `src/ui/CardGrid.jsx:193` and `:200` — hardcoded German `title` tooltips, not i18n at all
  ("Firn-Boden · Reserve …"). A separate finding: the i18n ratchet exists precisely against these.
- `src/ui/ArchitectScreen.jsx:839` — renders `t("arch.firn.title")`, whose **key name** would want
  to move with the term.
- `src/ui/guides.js` — 2 further occurrences.

**Sequencing.** The rename task runs first; this pass then rewrites the same three lines. The two
edits touch identical lines and do not conflict — whichever lands second simply carries the final
wording. If the rename slips, these three texts are the only thing to re-check before merging.

---

# Feuer — 21 skills

| # | ID | Name | DE | EN | Status |
|---|---|---|---|---|---|
| 1 | SK_FIRE_01 | Glut | 10 → 8 | 11 → 9 | abgestimmt |
| 2 | SK_FIRE_02 | Zunder | 10 | 10 | unverändert |
| 3 | SK_FIRE_03 | Feuersturm | 16 → 16 | 16 → 16 | abgestimmt |
| 4 | SK_FIRE_04 | Glutbett | 13 | 13 | unverändert |
| 5 | SK_FIRE_05 | Rückzündung | 18 | 22 | unverändert |
| 6 | SK_FIRE_06 | Glühende Klinge | 36 → 34 | 35 → 33 | abgestimmt |
| 7 | SK_FIRE_07 | Weißglut | 41 → 37 | 38 → 34 | abgestimmt |
| 8 | SK_FIRE_08 | Feuerwalze | 21 → 20 | 22 → 21 | abgestimmt |
| 9 | SK_FIRE_09 | Verbrennung | 12 → 10 | 14 → 12 | abgestimmt |
| 10 | SK_FIRE_10 | Funkenflug | 34 → 33 | 39 → 36 | abgestimmt |
| 11 | SK_FIRE_11 | Flächenbrand | 29 → 27 | 29 → 27 | abgestimmt |
| 12 | SK_FIRE_12 | Schmelzpunkt | 29 → 26 | 31 → 28 | abgestimmt |
| 13 | SK_FIRE_13 | Brandmal | 11 | 12 | unverändert |
| 14 | SK_FIRE_14 | Lauffeuer | 13 | 13 | unverändert |
| 15 | SK_FIRE_15 | Ascheschmiede | 40 → 31 | 51 → 38 | abgestimmt |
| 16 | SK_FIRE_16 | Glutstahl | 11 | 12 | unverändert |
| 17 | SK_FIRE_17 | Schmelzofen | 20 → 18 | 18 → 17 | abgestimmt |
| 18 | SK_FIRE_L01 | Sonnenkern [L] | 42 → 41 | 48 → 46 | abgestimmt |
| 19 | SK_FIRE_L02 | Phönixfeuer [L] | 26 | 27 | unverändert |
| 20 | SK_FIRE_L03 | Sonnenzorn [L] | 31 → 32 | 37 → 36 | abgestimmt |
| 21 | SK_FIRE_L04 | Damaststahl [L] | 29 → 35 | 35 → 38 | abgestimmt |

**Feuer complete.** 492 → 470 DE (**−4,5 %**) — by far the smallest gain of the three rounds so far
(Blitz −22 %, Eis −16 %), and the honest reason is that fire was already tight: 12 parentheses
across 21 texts against Blitz's 18, and its long texts are long because they carry many claims,
not because they ramble. 6 of 21 untouched, 3 deliberately longer (Sonnenzorn, Damaststahl, and
Damaststahl again in English), 12 shorter.

## Feuer — the entries worth keeping the wording of

### 1 · SK_FIRE_01 Glut — 10 → 8

**alt** > Siege mit Kampfwert-Vorsprung geben +50 % mehr Hitze (Hitzegewinn ×1,5).
**neu** > Siege mit Kampfwert-Vorsprung geben +50 % mehr Hitze.

    desc: `Siege mit Kampfwert-Vorsprung geben +${pct(C.EMBER_MULT - 1)} % mehr Hitze.`,

The source was `+${pct(C.EMBER_MULT - 1)} % … (Hitzegewinn ×${de(C.EMBER_MULT)})` — **one constant
printed twice**, once as a percentage above 1, once as the raw factor. The parenthesis carried no
second fact and the interpolation survives. **Booking:** `num` de/en, the `1,5` leaves.

### 6 · SK_FIRE_06 Glühende Klinge — 36 → 34, and a missing claim reported

**neu** > Alle deine Karten bekommen Stichwert nach Hitze: +1 ab 40 %, +2 ab 70 %, +3 bei 100 %. Die oberen beiden verlangen im laufenden Segment zusätzlich einen Sieg mit 8 bzw. 12 Kampfwert-Vorsprung.

**Reported, not acted on — a `desc-check.md` finding.** `de.js:217` (`bar.fire.badge.glow.title`)
describes the same skill in the HUD and carries **one claim more**: *"bleibt ein Segment ohne,
fällst du zurück."* The skill description never mentions that the upper steps decay. Adding it
would lengthen the text and write a rule into a text family this round only shortens, so it is
raised rather than taken.

### 7 · SK_FIRE_07 Weißglut — 41 → 37

**neu** > Hitze über 100 % staut sich als Überhitzung auf, bis 150 %; je höher sie steht, desto weniger kommt an. Jeder Punkt gibt +2 % Feuer-Score. Sie baut 2 Punkte je Stich ab, 5 bei einer Niederlage.

Four claims, all kept. "vom Überschuss" and "auf deinen" were the only slack.

### 10 · SK_FIRE_10 Funkenflug — 34 → 33

**alt** > … Ein Sieg mit ≥8 Vorsprung schüttet ihn aus und leert ihn; eine Niederlage halbiert ihn.
**neu** > Jeder Sieg unter 8 Kampfwert-Vorsprung legt das 2-fache seines Feuer-Scores plus 60 in einen Speicher, +20 je weiterem Feuer-Skill. Ein Sieg ab 8 Vorsprung zahlt ihn als Score aus, eine Niederlage halbiert ihn.

**Owner's call: make the payout's destination explicit.** Verified at `engine.js:517`:
`sparkPayout = heat.sparkStore; fireFlat += sparkPayout; heat = { …, sparkStore: 0 }` — so the
store **is** emptied ("und leert ihn" was genuinely redundant) and the payout goes into `fireFlat`
→ `scoreBase`, riding the full multiplier stack. It is therefore plain **Score**, NOT
*Direkt-Score*, which §1a defines as score bypassing the streak/crit/formation multipliers. Calling
it Direkt-Score would have been wrong. "≥8" became "ab 8" to match every other fire text.

### 11 · SK_FIRE_11 · 12 · SK_FIRE_12 — the worked examples stay

> Ab 80 % Hitze brennt der nächste Sieg bis auf 40 % herunter: +20 Score je verbranntem Hitzepunkt, +17 je weiterem Feuer-Skill (mit 6 Feuer-Skills ≈ +6.300).

> Jeder Sieg verbrennt 4 % Hitze: 10 Score je verbranntem Punkt, +6 je gehaltenem Prozent Hitze (bei voller Leiste 2.440 je Sieg). Niederlagen kosten keine Hitze.

**Owner's decision: keep them.** These are the only two texts in the game that show what the skill
actually pays at a plausible build, and that is the most decision-useful thing on the card.
**A proposal of mine was measured and dropped:** promoting the example to its own sentence
("Mit 6 Feuer-Skills sind das ≈ +6.300.") made *both* texts **longer** than baseline. Kept as
parentheses instead, and the slack found elsewhere — "deine Hitze" is redundant after "Ab 80 %
Hitze", and "je Prozent Hitze, die du dabei hältst" became "je gehaltenem Prozent Hitze". Both
texts end up shorter **with** the examples than my alternative was without them.

### 15 · SK_FIRE_15 Ascheschmiede — 40 → 31

**alt** > … +2.000 Score je 20 Asche. **(Schmelzofen senkt die Asche-Kosten ab 50 % Hitze.)**
**neu** > Am Ende jedes Durchlaufs erhält jeweils deine niedrigste Karte dauerhaft +3 Kartenwert, solange du ≥20 Asche hast. Ist die Schmiede voll, verglüht weitere Asche als Ascheglut: +2.000 Score je 20 Asche.

The parenthesised sentence described **Schmelzofen**, which states it in its own text — the
Gewitterfront case for the third time. "jeweils" stays: it is what says the *current* lowest card
is picked each time, not the same one repeatedly. **Booking:** `num` de/en, the `50` leaves.

### 18 · SK_FIRE_L01 Sonnenkern — 42 → 41, an honest non-result

> Jeder Sieg gegen eine gebrandmarkte Gegnerkarte gibt +100 Score je Brand darauf. Endet ein Durchlauf mit ≥60 % Hitze, stapeln sich deine Brände statt sich zu erneuern (bis 4 je Karte), und deine Karten unter Wert 9 bekommen dauerhaft +2 Kartenwert.

Three claims, five numbers, and "statt sich zu erneuern" is load-bearing — brands normally refresh.
The fire counterpart to Dauerfrost: an exception recorded with its number, not a win.

### 20 · SK_FIRE_L03 Sonnenzorn — 31 → 32, owner chose variant B

**alt** > … +1 % je Prozent bis 100 % **(→ ×2)**, und +3 % je Punkt Überhitzung darüber (mit Weißglut bis ×3,5).
**neu** > Dein gesamter Sieg-Score wird mit deinem höchsten je erreichten Hitzestand multipliziert: +1 % je Prozent bis 100 %, also bis ×2, und +3 % je Punkt Überhitzung darüber, mit Weißglut bis ×3,5.

`(→ ×2)` is the arrow notation §3 bans outright. Variant A dropped the ×2 as trivially derivable
(28 words); the owner kept it as prose (32). One word longer than baseline — an exception, and a
consistent one: the owner keeps derived figures where they help the reader decide.
"mit Weißglut bis ×3,5" stays in both variants — a genuine conditional cap, not another skill's
effect being advertised.

### 21 · SK_FIRE_L04 Damaststahl — 29 → 35, longer on purpose

**alt (29)** > Schmiedet **ohne Asche** jeden Durchlauf deine niedrigste Karte (+3 Wert, bis 10 Karten). Geschmiedete Karten kämpfen mit +5 Wert. Jeder Sieg gibt +14 Score je Punkt **Gesamt-Schmiedewert**. **Kein Ascheverbrauch.**

**neu (35)** > Schmiedet jeden Durchlauf deine niedrigste Karte ohne Asche (+3 Wert, bis 10 Karten). Geschmiedete Karten kämpfen mit +5 Wert. Jeder Sieg gibt +14 Score je Punkt geschmiedetem Wert im Deck. Eine Schmiedung sind 3 Punkte.

    desc: `Schmiedet jeden Durchlauf deine niedrigste Karte ohne Asche (+${C.FORGE_VALUE} Wert, bis ${C.DAMASCUS_MAX_FORGED} Karten). Geschmiedete Karten kämpfen mit +${C.DAMASCUS_COMBAT} Wert. Jeder Sieg gibt +${C.DAMASCUS_PER_VALUE} Score je Punkt geschmiedetem Wert im Deck. Eine Schmiedung sind ${C.FORGE_VALUE} Punkte.`,

**EN (35 → 38)**
> Forges your lowest card every cycle without ash (+3 value, up to 10 cards). Forged cards fight with +5 value. Every win gives +14 score per point of forged value in your deck. One forging is 3 points.

Two things happened here. "ohne Asche" and "Kein Ascheverbrauch." were the same claim opening and
closing the text — that one is free. Then the owner asked what "Gesamt-Schmiedewert" actually
counts, which turned out to be the right question.

Verified at `engine.js:534` (`totalForged = Object.values(forged).reduce(…)`) and `:1358` /
`:1380` (`newForged[id] += C.FORGE_VALUE`, `FORGE_VALUE = 3`): the payout is **per point of forged
value summed over every card in the deck**, on every win, regardless of which card won.

| state | points | score per win |
|---|---|---|
| 1 card, forged once | 3 | 42 |
| 3 cards, once each | 9 | 126 |
| 10 cards (the `DAMASCUS_MAX_FORGED` ceiling) | 30 | 420 |

That is exactly what separates it from Glutstahl (#16), which counts only the *winning card's*
forged value — and "Gesamt-Schmiedewert" hid the difference behind a compound. "im Deck" is now
the word doing that work. Three variants were tabled; the owner took the middle one, which spends
five words spelling out the unit ("Eine Schmiedung sind 3 Punkte") rather than the eight a full
worked example would have cost. The `3` is interpolated from `C.FORGE_VALUE`, not typed.

**Noted:** this text writes "+3 Wert" where Ascheschmiede writes "+3 Kartenwert" for the same
forge mechanic. Two spellings, one thing.

---

# Pflanze — 21 skills

| # | ID | Name | DE | EN | Status |
|---|---|---|---|---|---|
| 1 | SK_PLANT_02 | Wurzeltiefe | 23 | 27 | unverändert |
| 2 | SK_PLANT_03 | Pfahlwurzel | 19 → 13 | 22 → 14 | abgestimmt |
| 3 | SK_PLANT_04 | Jahresringe | 16 | 20 | unverändert |
| 4 | SK_PLANT_05 | Aussaat | 22 | 24 | unverändert |
| 5 | SK_PLANT_06 | Flugsamen | 22 | 27 | unverändert |
| 6 | SK_PLANT_07 | Setzlingsbeet | 22 | 27 | unverändert |
| 7 | SK_PLANT_08 | Zäher Halm | 22 | 24 | unverändert |
| 8 | SK_PLANT_09 | Ranken | 11 | 12 | unverändert |
| 9 | SK_PLANT_10 | Blüte | 18 | 21 | unverändert |
| 10 | SK_PLANT_11 | Blütezeit | 10 | 11 | unverändert |
| 11 | SK_PLANT_12 | Photosynthese | 9 | 10 | unverändert |
| 12 | SK_PLANT_13 | Blätterdach | 22 → 21 | 28 → 27 | abgestimmt |
| 13 | SK_PLANT_14 | Überwucherung | 16 → 14 | 19 → 17 | abgestimmt |
| 14 | SK_PLANT_18 | Kernholz | 30 → 29 | 36 → 34 | abgestimmt |
| 15 | SK_PLANT_15 | Ausläufer | 28 | 31 | unverändert |
| 16 | SK_PLANT_16 | Rhizom | 22 | 27 | unverändert |
| 17 | SK_PLANT_17 | Erntedank | 12 | 13 | unverändert |
| 18 | SK_PLANT_L01 | Weltenbaum [L] | 36 → 34 | 45 → 42 | abgestimmt |
| 19 | SK_PLANT_L02 | Mutterbaum [L] | 29 → 31 | 39 → 40 | abgestimmt |
| 20 | SK_PLANT_L03 | Baumreihe [L] | 42 → 35 | 48 → 41 | abgestimmt |
| 21 | SK_PLANT_L04 | Ewiger Frühling [L] | 25 | 29 | unverändert |

**Pflanze complete.** 456 → 439 DE (**−3,7 %**), the smallest of the four. 12 of 21 untouched,
1 deliberately longer (Mutterbaum), 8 shorter. The reason is structural and worth stating plainly:
**60 of those 456 words are one clause repeated six times**, and it cannot be shortened because it
is a real claim at each of those six skills.

## Pflanze — the entries worth keeping the wording of

### The Trimmen clause — six copies, hoisted, clarified, and broken onto its own line

**alt (10)** > Trimmen: beim Ersetzen dauerhaft +20 % Wurzel-/Blüten-Score (bis +150 %).
**neu (12)** > Trimmen: beim Ersetzen **des Skills** dauerhaft +20 % Wurzel-/Blüten-Score (bis +150 %).

    const TRIMMEN = `Trimmen: beim Ersetzen des Skills dauerhaft +${pct(C.TRIM_STEP)} % Wurzel-/Blüten-Score (bis +${pct(C.TRIM_CAP)} %).`;
    // EN, replacing the existing PRUNE:
    const PRUNE = `Pruning: replacing the skill permanently grants +${pct(C.TRIM_STEP)}% root/bloom score (up to +${pct(C.TRIM_CAP)}%).`;

Appears identically in Aussaat, Flugsamen, Setzlingsbeet, Zäher Halm, Ausläufer and Rhizom —
more than an eighth of the archetype. It stays: at each of those six skills it is that skill's own
claim, not a cross-reference. **Owner's call: "beim Ersetzen" → "beim Ersetzen des Skills"**, which
costs 2 words × 6 and answers the question the clause left open — replacing *what*. Verified at
`engine.js:133`: `trimCount` counts **ersetzte Wachstums-Skills**, so it is this skill being
swapped out that pays.

**Where it lives.** `enSkills.js:33` already holds it once as `const PRUNE`; the German register
does not. Hoisting it to a matching `const TRIMMEN` in `skills.js` is §4 verbatim ("Einen Text an
EINER Stelle bauen"). A code-shape choice, decided not asked — the English side already made it.

**On its own line, and already bold.** The owner asked for *Trimmen* bold with a line break before
it. Half of that is done today and was simply invisible: `Trimmen` is a glossary term
(`glossary.js:291`, `match: ["Trimmen", "Trimmung", "Trimmungen", "getrimmt"]`) and the skill
description renders through `<GlossaryText text={s.desc} />` (`SkillSelect.jsx:386`, `:499`), which
wraps glossary terms in `<strong className="gloss-term">`. It has always been bold; it just did not
read that way glued to the end of a paragraph.

The break is a plain `\n` in the string — `GlossaryText` sets `whitespace-pre-line`, and
SK_LIGHTNING_02 already relies on this. **No `src/ui` change, so the tripwire stays clear.**

    desc: `Gewinnt eine grüne Karte, sät sie beide Nachbarn: +${C.AUSSAAT_GROWTH} Wachstum je Seite.
    ${TRIMMEN}`,

renders as

> Gewinnt eine grüne Karte, sät sie beide Nachbarn: +1 Wachstum je Seite.
> **Trimmen**: beim Ersetzen des Skills dauerhaft +20 % Wurzel-/Blüten-Score (bis +150 %).

One `\n`, not two. SK_LIGHTNING_02 uses a blank line, but it carries three bullet rows; for a
single trailing clause the blank line is too much air. Applies to all six.

### 2 · SK_PLANT_03 Pfahlwurzel — 19 → 13

**alt** > Verstärker: die Wurzel-Basis (15) ×2, wenn die grüne Karte in einer Formation gewinnt **(Jahresringe und der Feld-Bonus bleiben unberührt)**.
**neu** > Verstärker: Die Wurzel-Basis (15) ×2, wenn die grüne Karte in einer Formation gewinnt.

**Owner's call, checked before cutting.** `engine.js:586`:
`root = C.WURZELTIEFE_SCORE * (hasPfahlwurzel && inFormation ? C.PFAHLWURZEL_MULT : 1)` — Jahresringe
and the field bonus are added on the following lines, after the doubling. The exclusion was true,
and entirely implied by naming **the base** as the thing that doubles. A sentence explaining the
scope the previous clause had already set.

### 20 · SK_PLANT_L03 Baumreihe — 42 → 35, the worst parenthesis in the corpus

**alt** > … steigt der Faktor auf ihre Stiche **(ab 2 ×1,3, je weitere +0,15, bis ×2)**, egal wo sie liegen, jede darf zugleich lokal eine andere Formation **füttern**.
**neu** > Voll ausgewachsene grüne Karten (Wert 11) bilden eine positionsfreie Wiederholung, egal wo sie liegen: ab 2 solchen Karten ×1,3 auf ihre Stiche, je weitere +0,15, bis ×2. Jede darf zugleich in einer anderen Formation zählen.

An entire scaling table inside one parenthesis — the single most compressed spot in all 84 texts.
**Owner's call: "füttern" goes** ("das ist kein Essen"). It stood in exactly two player-facing
strings — here and Eispanzer, where it was already replaced this round — so the word now leaves
the game's vocabulary entirely. Everything else that greps for it is code comments.

### 18 · L01 Weltenbaum 36 → 34 · 19 · L02 Mutterbaum 29 → **31**

> Am Ende jedes Durchlaufs wächst der ganze Wald: +1 Wachstum je 5 grüne Karten im Feld. Jeder grüne Sieg gibt +6,5 Score je Wachstum über dem Wert-Deckel, summiert über alle grünen Karten (bis 600).

> Mit Wurzeltiefe: Ist deine höchstgewachsene Karte am Zug, verdoppelt sie ihren Wurzel-Score. Jeder grüne Sieg gibt +68 Score je Wachstum deines tiefsten Baums über dem Wert-Deckel (bis 60), auch ohne Wurzeltiefe.

**Owner's call: the coined term goes.** "Überlauf-Wachstum" appeared in these two texts only —
glossed in Weltenbaum ("(Wachstum über dem Wert-Deckel)"), unexplained in Mutterbaum. Replacing the
term with its meaning removes both the coinage and the gloss.
**Mutterbaum ends up two words longer, and that is the price.** Recorded as an exception: one term
fewer in the game costs two words in one text. Same trade the owner made at Blitz with *Bekenntnis*.

### 14 · SK_PLANT_18 Kernholz — 30 → 29

**alt** > … (max. +150 bei einer von Wert 1 auf 11 gewachsenen Karte). Karten gewinnen Wert nur bei **Mono-Pflanze**.
**neu** > Jeder Sieg einer grünen Karte gibt +15 Score je Kartenwert-Punkt über ihrem Startwert (max. +150 von Wert 1 auf 11). Karten gewinnen Wert nur, solange du nur Pflanzen-Skills hältst.

**Owner's call: no "Mono-Pflanze".** The plant passive already states the identical condition as
"Solange du nur Pflanzen-Skills hältst" — one condition had two names. Aligning costs 4 words
against the shortest possible version (30 → 25 would have kept the compound), and the worked
example paid them back by dropping "bei einer … gewachsenen Karte" for "von Wert 1 auf 11".

### Checked and left alone

- **Blüte** (#9) — "blüht sie" is not the self-reference §3 bans. *Blüte* is canonical vocabulary
  (§1c: Wurzeln · Blüte · Trimmen) shared with Blütezeit, the same case as *brandmarkt* at
  Brandmal, and unlike *kurzschließt* / *erstarrt*, which were names doing duty as verbs.
- **Ewiger Frühling** (#21) — "(effektiv bis 60)" is a derived figure (40 × 1,5), the same kind the
  owner deliberately kept at Sonnenzorn. Left in for consistency with that decision.

---

# Die vier Passives — ABGESTIMMT

`skill.passive.*` in `src/i18n/de.js:516–519` and the mirrored keys in `en.js`. Blitz at 16 words
is the yardstick, not an invented target.

**The owner reframed the goal for this round, and it applies backwards over the whole pass:**
*"es geht nicht nur darum zu kürzen. Hauptziel ist es in einfacher Sprache verständlicher zu
machen."* The passives are where the two come apart — the plant passive ends up **longer** and is
plainly better. Word count is the evidence, not the aim.

| | DE alt | DE neu | what actually changed |
|---|---|---|---|
| Blitz | 16 | 16 | nothing — the yardstick |
| Feuer | 44 | 37 | 3 sentences → 4, one ambiguity resolved |
| Eis | 65 | 57 | 2 sentences → 3; 2 dashes, 2 parens, 1 semicolon gone |
| Pflanze | 46 | **48** | 2 parens and a colon-list gone; one spelling instead of two |
| | 171 | 158 | **9 sentences → 13** |

### Blitz — unchanged (16 / 22)

> Der erste Blitz-Skill gibt +6 % Crit-Chance, jeder weitere +4 %. Dazu +0,15× Crit-Multiplikator je Blitz-Skill.

### Feuer — 44 → 37 (EN 51 → 43)

**alt** > Jeder Sieg mit mindestens 4 Kampfwert-Vorsprung heizt die Hitze um 6 % auf und gibt +40 Feuer-Score; je größer der Vorsprung, desto mehr. Niederlagen kühlen die Hitze um 25 % ab (plus Wert-Rückstand, bis 40). Jeder weitere Feuer-Skill gibt +8 Feuer-Score je Vorsprungspunkt.

**neu** > Siege ab {margin} Kampfwert-Vorsprung geben +{heat} % Hitze und +{score} Feuer-Score. Je größer der Vorsprung, desto mehr von beidem. Niederlagen kosten {cool} % Hitze, plus deinen Wert-Rückstand, höchstens {coolMax}. Jeder weitere Feuer-Skill gibt +{perSkill} Feuer-Score je Vorsprungspunkt.

**neu EN** > Wins from {margin} combat-value margin give +{heat}% heat and +{score} fire score. The bigger the margin, the more of both. Losses cost {cool}% heat, plus your value deficit, at most {coolMax}. Every further fire skill gives +{perSkill} fire score per point of margin.

**"von beidem" answers a question the old text left open**, and it was worth checking rather than
assuming: `heatGainFor` computes `marginHeatPoints(margin) * HEAT_PER_POINT` and `fireScoreFor`
computes `over * base + base * √K * √over` (`skills.js`). The margin genuinely scales **both** the
heat and the fire score, so the trailing "je größer der Vorsprung, desto mehr" was true of both and
said so of neither.

### Eis — 65 → 57 (EN 70 → 61). The worst text in the game, and length was not its problem.

**alt** > Jeder Eis-Skill friert eine eigene Karte als Gletscher fest — sie wird starr (in keiner künftigen Aufstellung mehr verschiebbar), sammelt dafür aber jeden Durchlauf Masse und bricht schließlich gewaltig über ihre Nachbarn. Jeder Pick friert einen neuen Gletscher (auch ein Tausch bei vollen Slots); ab 3 gehaltenen Eis-Skills friert selbst das Ablehnen eines Angebots noch einen — so kannst du mehr Gletscher haben als Skill-Slots.

**neu** > Jeder Eis-Skill friert eine deiner Karten als Gletscher fest, auch wenn du bei vollen Skill-Slots tauschst. Sie lässt sich dann in keiner Aufstellung mehr verschieben, sammelt dafür jeden Durchlauf Masse und bricht schließlich über ihre Nachbarn. Ab {declineFrom} gehaltenen Eis-Skills friert sogar das Ablehnen eines Angebots einen Gletscher ein, du kannst also mehr Gletscher haben als Skill-Slots.

**neu EN** > Every ice skill freezes one of your cards as a glacier, including a swap when your skill slots are full. It can no longer be moved in any order phase, but gathers mass every cycle and eventually bursts over its neighbours. From {declineFrom} ice skills held, even declining an offer freezes a glacier, so you can hold more glaciers than skill slots.

Out: **two em-dashes, two parentheses, one semicolon** — two runaway sentences become three.
"starr (in keiner künftigen Aufstellung mehr verschiebbar)" said one thing twice, so the meaning
stays and the word goes. **"Pick" is an anglicism** §3 rules out where German exists; folding the
swap case into the first sentence removes the need for it entirely. "Slots" → **"Skill-Slots"**,
the spelling §1a now prescribes (added to the style guide during this pass).

**Noted:** the old text still carried two em-dashes, which means `task/text-voice-pass` never
reached the passives — it was merged after batch 1. Not this round's problem, but it is why the
dashes were still here to remove.

### Pflanze — 46 → 48, longer and better

**alt** > Jeder Sieg gibt der Karte bis zu +1 Wachstum (volles Tempo ab 3 **Pflanze**-Skills). Ab 5 Wachstum wird die Karte grün. Solange du nur **Pflanzen**-Skills hältst: je 4 Wachstum +1 Kartenwert (bis 11, danach ist sie voll ausgewachsen), ab 4 Pflanzen-Skills auch bei jeder 2. Niederlage.

**neu** > Jeder Sieg gibt der Karte bis zu +1 Wachstum, volles Tempo ab {ref} Pflanzen-Skills. Ab {green} Wachstum wird sie grün. Hältst du nur Pflanzen-Skills, gibt je {perValue} Wachstum +1 Kartenwert, bis {cap}; dann ist sie voll ausgewachsen. Ab {minSkills} Pflanzen-Skills wächst sie dabei auch bei jeder {everyLoss}. Niederlage.

**neu EN** > Every win gives the card up to +1 growth, at full pace from {ref} plant skills. From {green} growth it turns green. If you hold only plant skills, every {perValue} growth gives +1 card value, up to {cap}; then it is fully grown. From {minSkills} plant skills it also grows on every {everyLoss} loss.

Both parentheses and the colon-list are gone, and **"Pflanze-Skills" and "Pflanzen-Skills" stood
side by side in the same text** — now one spelling.

**"dabei" is load-bearing and was nearly lost.** Splitting the loss clause into a free-standing
sentence reads better but would have dropped the mono condition. `engine.js:1149` requires
**both**: `plantPassiveActive(skills) && plantSkillCount(skills) >= C.WURZELSCHLAG_LOSS_MIN_SKILLS`.
And `plantPassiveActive = isMonoPlant || (C.PLANT_PASSIVE_MIN_SKILLS > 0 && …)` with
`PLANT_PASSIVE_MIN_SKILLS = 0` — the second branch is dead code, so it *is* mono-only, and the old
text's "Solange du nur Pflanzen-Skills hältst" was accurate. "dabei" keeps the loss clause under
that condition.

---

# Where this stands

**All five rounds are agreed. Nothing is written to the repository yet** — `task/skill-text-pass`
does not exist, and this ledger plus `worker-firn-to-schnee.md` live in the session scratchpad.

| round | DE before | DE after | | longest |
|---|---|---|---|---|
| Blitz | 449 | **351** | −21,8 % | 43 → 36 |
| Eis | 484 | **405** | −16,3 % | 51 → 42 |
| Feuer | 492 | **471** | −4,3 % | 42 → 41 |
| Pflanze | 456 | **452** | −0,9 % | 42 → 35 |
| **84 skills** | **1881** | **1679** | **−10,7 %** | 51 → 42 |
| 4 passives | 171 | **158** | −7,6 % | 65 → 57 |
| **88 texts** | **2052** | **1837** | **−10,5 %** | |

Longest text in the game: **51 → 42** (Ewiges Schild 51 → 36 gave the crown to Dauerfrost at 42).
Texts carrying a parenthesis: **54 → 32**.

**These are measured on the applied code**, by importing the registers and counting the resolved
text. The per-text figures in the tables above were hand-counted during the rounds and are ±1 in a
handful of places; where the two disagree, the measured total here is the one that counts.

**Exceptions, each with its number and reason** (the acceptance criterion's ledger):
Abbruchkante 18→19 · Sonnenzorn 31→32 · Damaststahl 29→35 (EN 35→38) · Mutterbaum 29→31 ·
Pflanze-Passiv 46→48 · Dauerstrom 24→24 · Feuersturm 16→16 · plus 26 texts left unverändert.
Dauerfrost (47→42) and Sonnenkern (42→41) are the H6 cases: wording alone does not get them near
the Blitz yardstick, and no structural change was in scope.

**To land it:** `/create-task skill-text-pass B --pixels`, then this ledger moves to
`docs/workstreams/skill-text-pass/`, the 88 texts go into `skills.js` / `enSkills.js` / `de.js` /
`en.js`, `text-voice-keep.txt` gains the `num` entry kind plus the bookings listed above, and
`npm test && npm run loc:export && node scripts/text-voice-check.mjs --baseline <branch point>`
produces the proof.
