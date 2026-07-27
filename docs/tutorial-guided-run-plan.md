# Autostich — Tutorial / Guided Run (Durchplanung)

> **Status:** Reine **Durchplanung** — kein Code. Nordstern-Doc für das Feature „Tutorial-Button mit geführtem Run".
> **Idee (Nutzer):** Ein **Tutorial-Button** startet einen **geführten Run**, der einem alles erklärt. **Vor jeder Phase** erscheint ein **Pop-up mit den Charakteren (Maskottchen)**, das erklärt, was man in der Phase macht, und **kurz die Panels erklärt**.

---

## 1. Ziel & Abgrenzung

- **Ziel:** Neue Spieler lernen den kompletten Loop nicht aus einem Textblock, sondern **im echten Spiel**, Schritt für Schritt, mit den Maskottchen als „Lehrern".
- **Abgrenzung zur bestehenden `AnleitungModal` (#12):** Die ist ein **statischer** 6-Kachel-Schnellstart. Das Tutorial ist **interaktiv** (geführter Run). Beide können koexistieren: Anleitung = „nachlesen", Tutorial = „machen". (Entscheidung §12.)
- **Keine `game/`-Änderung nötig:** Das Tutorial ist **reine UI/Overlay-Logik**. Der geführte Run ist ein normaler Run — nur mit festem Seed + Erklär-Overlay obendrauf. Der pure, deterministische `game/`-Layer bleibt unangetastet.

---

## 2. Kernkonzept

Zwei Erklär-Ebenen, genau wie vom Nutzer beschrieben:

1. **Phasen-Intro-Pop-up (blockierend):** Beim **ersten** Betreten jeder Phase erscheint ein Pop-up mit dem **Phasen-Maskottchen** + kurzer Erklärung „was mache ich hier". Bestätigen mit „Verstanden/Weiter".
2. **Panel-Coach-Marks (kurz):** Direkt danach werden **die relevanten Panels der Phase** kurz erklärt — Spotlight/Marker auf ein Panel + ein Satz. Steppbar (Weiter) oder auf einmal.

**Ablauf-Prinzip:** Die Pop-ups feuern beim **ersten Auftreten** jeder Phasenart (nicht in jedem Durchlauf). Sobald alle Phasenarten einmal erklärt wurden, verschwindet das Overlay und der Run läuft normal weiter (der Spieler kann ihn zu Ende spielen oder aufgeben).

**Warum das so gut passt:** `DECISION_SCHEDULE` beginnt mit **`stat, perk, formation, stat, shop, skill`** — d.h. **alle fünf Entscheidungs­phasen erscheinen schon in den ersten 6 Durchläufen**. Der Tutorial-Bogen ist also von Natur aus kurz, ohne dass wir den Run künstlich abschneiden müssen.

---

## 3. Der geführte Run: fester Seed

- Start über den Tutorial-Button dispatcht `START_RUN` mit **festem Seed** (`makeRng(TUTORIAL_SEED)`), statt `Math.random`. Der `game/`-Layer nimmt `rng` bereits als Action-Payload — **keine Änderung nötig**.
- **Wirkung:** Kartenreihenfolge, Angebote, Crits sind **deterministisch** → das Skript kann konkrete Dinge garantieren (im Kampf fällt ein Sieg/Crit; die erste Formationsphase zeigt eine echte Formation; der erste Shop hat bezahlbare Items).
- **Robustheit:** Die Erklärtexte bleiben **phasen-allgemein** („So funktioniert der Shop"), nicht angebots-spezifisch („kauf Item X"). So driftet das Tutorial nicht, wenn sich Angebote/Balance ändern. Der Seed sorgt nur dafür, dass **überhaupt** etwas Sehenswertes auftaucht.
- **Seed-Auswahl** = Autoren-Aufgabe: per Sim ein Seed finden, der einen „schönen" frühen Verlauf liefert (sichtbare Formation, ein Crit, bezahlbarer Shop). Als Konstante ablegen.

---

## 4. Phasen-Abdeckung & Charaktere

| Reihenfolge | Phase (State) | Maskottchen (Host) | „Was mache ich hier" (Kern) |
|---|---|---|---|
| 0 | Run-Start / `play` | Gruppenbild / Default | Ziel: **maximaler Score** über 44 Durchläufe, kein Leben/Tod. Der Autobattler spielt von selbst. |
| 1 | Kampf (`play`) | — (Battlefield) | Höhere Karte gewinnt, Gleichstand zählt nicht. Serie & Score wachsen. |
| 2 | Stat (`levelup`/`statOffer`) | `stat.gif` | Einen von fünf Stats dauerhaft wählen (Crit-Chance/-Mult, Formation, Serie, Einkommen). |
| 3 | Perk (`levelup`/`offer`) | `perk.gif` | Einen von 3 Perks (A–E + Legendär), einmal pro Lauf; alle ablehnen → Münze. |
| 4 | Formation (`formation`) | `formation.gif` | Deck-Aufstellung: Karten tauschen (Energie), Formationen bauen (multiplizieren Score). |
| 5 | Shop (`shop`) | `shop.gif` | Münzen ausgeben: Karten/Anker/Formationen/Planung, Preisstufen, Ziel-Auswahl. |
| 6 | Skill (`levelup`/`skillOffer`) | `skill.gif` | Archetyp-Skills (⚡Blitz/🔥Feuer/❄️Eis), 4 Slots; erster Skill aktiviert den Archetyp. |
| 7 | Ziel-Auswahl (`target`/`shop-target`) | passend | Wenn ein Perk/Item Karten braucht: N Karten antippen. |
| 8 | Game Over | Gruppenbild | Score, Aufschlüsselung, Build lesen. |

(Die Maskottchen sind schon da: `src/assets/mascots/{stat,perk,formation,shop,skill}.gif` + `logo-group.png`, heute via `PanelMascot.jsx` genutzt.)

---

## 5. Panel-Erklärungen (Coach-Marks) je Phase

- **Kampf:** `Battlefield` (zwei Decks, aufgedeckte Karten, Ergebnis-Banner) · `StatusRail` (Score, Serie, Durchlauf, Siege/Verluste, Geist-Delta) · `Controls` (Pause/Tempo/Nächster Stich).
- **Stat:** `StatSelect` (die 5 Stats + was sie tun) + Kern-Readout (Crit/Formation/Serie).
- **Perk:** `PerkSelect` (3 Karten, Kategorie-Farben, Legendär-Hervorhebung, „einmal pro Lauf", Ablehnen→Münze) · `BuildPanel` (wachsender Build + Deck-Histogramm).
- **Formation:** `FormationPhase` (40 Karten in 8 Segmenten, Energie, Live-Formationsmarker W/F/T/Z, Buttons) — hier auch die **Formationstypen** kurz erklären.
- **Shop:** `ShopScreen` (Münzstand, 4 Kategorien, Preisstufen, Kauf) · Ziel-/Reroll-Hinweis.
- **Skill:** `SkillSelect` (Archetyp-Gruppen, Slots, Ressourcenleiste Ladung/Hitze/Frost).
- **Ziel-Auswahl:** `TargetSelect`/`ShopTargetSelect` (N Karten wählen, Bestätigen).
- **Game Over:** `GameOver` (Score groß, Faktorenkette, Build-Liste).

---

## 6. Content-Skript (datengetrieben)

Der gesamte Text lebt in **einem** Modul (`src/ui/tutorial/tutorialScript.js`), auf Deutsch, leicht editierbar — analog zur Daten-Registry-Idee von `perks.js`.

```js
// Schema (Vorschlag)
{
  id: "phase-shop",
  trigger: { phase: "shop", firstOnly: true },   // feuert beim ersten Shop
  mascot: "shop",                                  // Host-Maskottchen
  title: "Der Shop",
  body: "Hier gibst du deine Münzen aus …",
  coachmarks: [
    { anchor: "shop-coins",      text: "Dein Münzstand." },
    { anchor: "shop-categories", text: "Vier Warengruppen …" },
    { anchor: "shop-buy",        text: "Antippen zum Kaufen." },
  ],
  placement: "auto",   // Pop-up-Position relativ zum Panel
}
```

- **Anker:** Panels bekommen `data-tut="shop-coins"`-Attribute; die Coach-Marks referenzieren diese IDs → Spotlight/Marker findet das Element responsiv.
- **Trigger-Arten:** `run-start`, `phase` (mit `firstOnly`), evtl. `result` (z. B. „erster Crit gefallen" → kurzer Hinweis).

---

## 7. Architektur / Code-Integration

Alles **UI-Layer**, kein `game/`-Eingriff:

- **Neu:**
  - `src/ui/tutorial/tutorialScript.js` — Inhalte (Daten).
  - `src/ui/tutorial/TutorialOverlay.jsx` — Maskottchen-Pop-up + Coach-Mark-Spotlight + Fortschritt/Skip.
  - `src/ui/tutorial/useTutorial.js` — State-Maschine: beobachtet `state.phase` (+ abgeleitete Entscheidungsart), zeigt den passenden Step beim **ersten** Auftreten, merkt gezeigte Steps.
  - `TUTORIAL_SEED` (Konstante) + `as_tutorial_done` (Persistenz).
- **Geändert (minimal):**
  - `App.jsx`: `onStartTutorial` → `START_RUN` mit `makeRng(TUTORIAL_SEED)` + `tutorialActive`-Flag; rendert `TutorialOverlay`, wenn aktiv.
  - `StartScreen.jsx`: neuer Button **„Tutorial"** neben „Neuer Run/Anleitung".
  - Panels bekommen `data-tut`-Anker (rein additiv, keine Logikänderung): `Battlefield`, `StatusRail`, `Controls`, `StatSelect`, `PerkSelect`, `BuildPanel`, `FormationPhase`, `ShopScreen`, `SkillSelect`, `TargetSelect`/`ShopTargetSelect`, `GameOver`.
- **Progression:** Pop-up dismissen → Phase normal spielen. **Keine harte Blockade** — nur erklären; die vorhandene Regel „ohne Auswahl geht’s nicht weiter" reicht als Führung. (Entscheidung §12: optional den empfohlenen Button hervorheben.)

---

## 8. Determinismus

- Seed-Zug **einmal** bei Run-Start (wie regulär). Kein `Math.random` im Tutorial-Kern-Flow.
- Da `DECISION_SCHEDULE` fix ist, ist die **Phasenreihenfolge** ohnehin deterministisch; der Seed pinnt nur den **Inhalt** (Karten/Angebote/Crits).

---

## 9. Persistenz & Wiederholbarkeit

- `as_tutorial_done` (localStorage, via `storage.js`) — analog zu `as_seen_guide`.
- **Wiederholbar:** Tutorial-Button ist immer sichtbar; Spieler können es erneut starten.
- **Erststart:** Statt (oder neben) der auto-öffnenden `AnleitungModal` bietet der Erststart „**Tutorial starten**" an (interaktiv) vs. „Kurz-Anleitung" (Text). Entscheidung §12.

---

## 10. UX-Details

- **Skip:** pro Step „Überspringen" + global „Tutorial beenden" (setzt `as_tutorial_done`).
- **Fortschritt:** kleine Anzeige „Schritt 3/8".
- **Mobil:** Pop-up als Bottom-Sheet; Coach-Mark-Marker repositionieren; Maskottchen kleiner (hängt an **FB-9**). `data-tut`-Anker müssen im Scroll-Container gefunden werden.
- **`prefers-reduced-motion`:** Spotlight-Animation aus (wie beim übrigen „Juice").
- **Nicht nerven:** Pop-ups nur beim **ersten** Auftreten; kurze Texte; jederzeit wegklickbar.

---

## 11. Implementierungs-Wellen (später, nicht jetzt)

Jede Welle lauffähig, Spiel bleibt spielbar:

- **W0 — Gerüst:** `tutorialActive`-Flag, geseedeter `START_RUN`, `TutorialOverlay`-Skelett, Step-Engine an `state.phase`, Persistenz, StartScreen-Button.
- **W1 — Phasen-Pop-up:** Maskottchen-Bubble je Phase + Weiter/Skip + Fortschritt.
- **W2 — Coach-Marks:** Spotlight/Marker-System + `data-tut`-Anker auf allen Panels; Panel-Erklärungen.
- **W3 — Inhalte:** alle Phasentexte final; Seed per Sim wählen (schöner Demo-Verlauf).
- **W4 — Politur:** Bottom-Sheet/Mobil, reduced-motion, Wiederholung, Erststart-Integration mit `AnleitungModal`, Text-Feinschliff.

---

## 12. Offene Entscheidungen (vor dem Bauen klären)

1. **Geführter Run:** fester Seed (empfohlen) — bestätigen. Alternativ Overlay auf normalem Zufallsrun.
2. **Führung:** nur erklären (empfohlen) oder den „empfohlenen" Button je Phase aktiv hervorheben/soft-gaten?
3. **Tutorial-Ende:** Nach allen erklärten Phasen den Run **normal weiterlaufen** lassen (empfohlen) oder mit „Du bist bereit!"-Screen früh beenden?
4. **Erststart:** Tutorial die auto-öffnende `AnleitungModal` **ersetzen** lassen, oder beide anbieten (empfohlen: beide)?
5. **Tiefe:** Sub-Phasen (Ziel-Auswahl, Game Over) auch mit Coach-Marks, oder nur die 5 Hauptphasen + Kampf?
6. **Text/Stimme:** haben die Maskottchen eigene „Stimmen"/Namen? Wer schreibt die finale Copy?

---

## 13. Aufwand & Risiko

- **Umfang:** mittel-groß, ~4 Wellen. **Kein Spiellogik-Risiko** (UI-only, `game/` unangetastet).
- **Hauptrisiko:** responsives Ankern der Coach-Marks (Scroll/Mobil) + „nicht nervig" halten (Skip/Kürze).
- **Synergien:** nutzt bestehende Maskottchen + `PanelMascot`; berührt **FB-9** (Mobil-Maskottchen); kann Texte aus `AnleitungModal` recyceln.
```
