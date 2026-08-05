# Design-Doc: Eis-Neudesign — „Gletscher, Bersten & Kaskade" (Entwurf v0)

> Status: **Entwurf zur gemeinsamen Abstimmung.** Reihenfolge: (1) dieses Design (Vision → Kategorien → Rollen → Mechanik), (2) dünne Linien auffüllen, (3) Legendäre, (4) ganz zuletzt Zahlen.
> **NEU-Design, kein Rework** — alte Eis-Skills bewusst ignoriert. Diese Arbeit **ersetzt Issue #288** (das schließen wir danach).
> Ziel-Branch: `balancing`.

---

## 1 · Vision

**Eis = die räumliche Cluster-Fraktion.** Du baust ein **dichtes Gletscherfeld** und löst eine **Kaskade** aus.

Eine Ressource (**Masse**), ein Payoff (**Bersten**), eine Fähigkeit (**Cluster bauen**). Bewusst **simpler als Pflanze**.

**Sauberer Kontrast zur Pflanze:**
- **Pflanze wächst nach innen** (Tiefe — Wert pro Karte hoch, positions-agnostisch).
- **Eis wächst nach außen** (Fläche — Gletscher sammeln an → bersten → wirken auf die Nachbarn). Räumliche/AoE-Identität statt Pro-Karte-Achse.

**Begriffe (festgezurrt):**
- **Masse** — der Ansammel-Wert je Karte (nicht „tief/Tiefe" — das verwechselt man mit dem Kartenwert).
- **Gletscher** — **jede Frostkarte IST ein Gletscher** (mit Masse). Ein großer heißt **mächtiger Gletscher**.
- **Bersten** — der Payoff-Event (nicht „Kalben"): ein Gletscher **birst** in seine Nachbarn.
- Glaziologie-Check: Gletscher **wachsen** durch Akkumulation → korrekte Richtung für eine Ansammel-Mechanik (ein Eisberg bräche ab, ist kein Vorstadium).

---

## 2 · Das Fundament (Baseline-Eis, immer an)

Was ein Gletscher **ohne Skills** tut — die 12 Rollen sind nur Modifikatoren darauf.

1. **Masse** — jede Frostkarte hat einen Masse-Zähler (nur steigend). Baseline: **Sieg → +Masse**.
2. **Bersten** — zum **Durchlauf-Anfang** birst jeder Gletscher **ab einer Masse-Schwelle** in seine **4 Nachbarn**.
3. **Kaskade** — die Wucht des Berstens skaliert mit der **Zahl angrenzender Gletscher** (dichtes Feld = stärker).
4. **Kollision** — trifft das Bersten einen Nachbarn, der **selbst Gletscher** ist → Bonus/Krit statt „ins Leere".

**Nachbarschaft = 4 orthogonale (links / rechts / oben / unten)** auf dem 8×5-Brett.

### Kern-Entscheidungen (festgezurrt)
- **A — Was gibt das Bersten? → A1: Direkt-Score.** Auflage: **muss gut skalieren** (sonst fehlen die Punkte im Late-Game). Deshalb in die *Form* gebaut: **Burst-Score = Masse × Cluster × Kaskade** — alles Größen, die den ganzen Lauf **mitwachsen**. *(Offener Hebel: ob er zusätzlich am Multiplikator-Stack mitfährt → am Sim entscheiden. Die Form garantiert schon das Mitwachsen.)*
- **B — Masse nach dem Bersten? → B1: Teil-Reset.** Gletscher verliert einen Teil seiner Masse, baut wieder auf → **Lade-Entlade-Puls**, selbst-bremsend.
- **Design-Prinzip:** ein Eis-Skill darf **„Verlieren" nicht bedeutungslos** machen (kein „Gletscher können nicht verlieren"-Zustand).
- **Deckel/Leitplanken:** bewusst **noch nicht** — erst wenn das Design steht, dann Balance.

---

## 3 · Die vier Kategorien (Linien) & ihre Fantasien

Pipeline **Aufbauen → Verbinden → Bersten**, plus eine Kontroll-Achse quer dazu.

| Linie | Fantasie | Rolle im Build |
|---|---|---|
| **1 · Firn** | „Das ewige Anwachsen" — Schnee presst sich unerbittlich zu Eis. | **Masse-Motor** (Fundament jedes Eis-Builds) |
| **2 · Eisschild** | „Das verbundene Feld" — Gletscher verschmelzen, Nachbarschaft ist Macht. | **Cluster/Dichte** (der Skill-Ausdruck, freie Aufstellung) |
| **3 · Lawine** | „Der Zusammenbruch" — das Eis birst und reißt das Feld mit. | **Payoff** (Kaskade/Krit) |
| **4 · Frostgriff** | „Die Starre" — die Kälte greift nach außen. | **Kontrolle & Duo** (Quer-Achse) |

---

## 4 · Die 12 Rollen (Mechanik — noch ohne Zahlen)

Regel = **Bedingung → Effekt**.

### Linie 1 · Firn — Masse-Motor
- **Anfrieren** — Sieg → **mehr Masse**; Formations-Sieg → **extra**. *(zündet das Fundament, der Grundmotor — Aufbau über Siege UND Formationen)*
- **Schneetreiben (Verwehung)** — gewinnt ein Gletscher, **verweht** er einen Teil Masse auf einen **Nachbarn**. *(sät das Feld nach außen; nur Siege verwehen → Verlust bleibt relevant; distinct von Anfrieren = nach innen)*
- **Uraltes Eis** — Start mit **vorgeformter Masse** auf einigen Karten. *(Seed → Feld läuft früher an)*

### Linie 2 · Eisschild — Cluster/Dichte
- **Verschmelzen** — angrenzende Gletscher **poolen ihre Masse** (der Große zieht die Nachbarn hoch). *(macht dichte Felder gleichmäßig mächtig)*
- **Packeis** — ein Gletscher mit **vielen Gletscher-Nachbarn** bekommt Bonus-Masse/-Burst. *(belohnt die Mitte des Feldes)*
- **Eisbrücke** — erweitert, was **„angrenzend"** zählt (Diagonale / über eine Lücke). *(verbindet zersplitterte Felder zu einem Cluster)*

### Linie 3 · Lawine — Bersten/Kaskade
- **Abbruchkante** — Burst-Score **skaliert steiler mit der Masse** des Gletschers. *(Größe = Wucht, belohnt Einzelriesen)*
- **Kettenbruch** — das Bersten **triggert angrenzende Gletscher, selbst zu bersten** → die echte Kaskade rollt durchs Feld. *(der Payoff-Verstärker)*
- **Zermalmen** — Kollision (Burst trifft Gletscher) → **Krit auf den Burst-Score**. *(Dichte gibt Krit)*

### Linie 4 · Frostgriff — Kontrolle/Duo
- **Einfrieren** — birst ein Gletscher auf eine **Gegnerkarte**, verliert diese ihren **nächsten Stich garantiert**. *(harte Kontrolle nach außen)*
- **Frostbund** — birst ein Gletscher auf einen **Nicht-Eis-Nachbarn** (dein 2. Archetyp) → **bufft ihn** (offensiv, Score). *(Duo-Enabler)*
- **Eispanzer** — eine **Niederlage auf einer Nachbarkarte ist folgenlos** (bricht keine Serie, füttert kein Gegner-On-Win). *(räumlicher Schutz: schwache/Utility-Karten neben Gletscher parken; defensiv, abgegrenzt von Frostbund)*

---

## 5 · Synergien

- **Firn füttert alles** — ohne Masse kein Burst.
- **Eisschild = Multiplikator-Linie:** Verschmelzen/Packeis/Eisbrücke bauen große, dichte Cluster → davon leben **Kaskade (Kettenbruch)** und **Krit (Zermalmen)**. Herz des „Breite"-Builds.
- **Abbruchkante = Gegenpol:** wenige **Riesen** statt breitem Feld → alternativer Eis-Build (Tiefe im Einzelgletscher statt Fläche).
- **Schneetreiben** baut Cluster **aktiv** auf (sät nach außen), Eisschild belohnt sie → greifen ineinander.
- **Frostgriff** hängt quer: dieselbe Berst-Energie nach außen — Einfrieren (Tempo), Frostbund (Duo), Eispanzer (Consistency).

---

## 6 · Build-Möglichkeiten

- **Mono „Lawine":** all-in aufs dichte Gletscherfeld — die Kaskade IST der ganze Score.
- **Riesen (Abbruchkante):** wenige, sehr mächtige Gletscher — Tiefe statt Breite.
- **Duo-Support (Frostbund):** Seed-Gletscher, deren Bersten die Nachbarn des 2. Archetyps buffen — Eis als räumlicher Verstärker.
- **Positionier-Puzzle:** weil frei platziert wird, ist Eis die „ordne das Brett optimal an"-Fraktion — Skill-Ausdruck komplett im Layout.

---

## 7 · Offene Punkte (nächste Schritte)

1. **Dünne Linien auffüllen** (~5 Zusatzrollen) — Gefühl: **Lawine** (Haupt-Payoff) und **Eisschild** (Dichte lebt von Varianten). Firn/Frostgriff mit je 3 vermutlich rund. Ziel-Größe ~17 normal (wie Feuer).
2. **Legendäre** (~4, je Linie eine Capstone-Version der Fantasie):
   - Firn → *„Eiszeit"* (das ganze Brett friert / Masse explodiert)
   - Eisschild → *„Ewiges Schild"* (das gesamte Feld = ein zusammenhängender Übergletscher)
   - Lawine → *„Große Lawine"* (brettweites Ketten-Bersten auf einen Schlag)
   - Frostgriff → *„Erstarrung"* (der Gegner friert komplett ein)
3. **Zahlen** — ganz zuletzt (Sim-tunebar).
4. **2D-Formationen** — für später: Formationen, die die 4 Richtungen (Brett-Adjazenz) ansprechen, nicht nur die 1D-Reihe.
5. **#288 (Trimmen) schließen**, sobald dieses Design es ablöst.
6. **Deckel/Runaway-Leitplanken** — bewusst aufgeschoben bis das Design steht (Eis-Historie: alte 300-Mio-Mono-Explosion → Kaskade wird später einen harten Deckel brauchen).
