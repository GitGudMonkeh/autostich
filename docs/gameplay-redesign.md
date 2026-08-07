# Gameplay-Screen — Neu-Aufbau (freigegebener Zielentwurf)

Status: **freigegeben, Umsetzung ausstehend.** Entwickelt auf `balancing`, gemergt nach `Autostich_Test`.
Mockup (Zielentwurf v2): https://claude.ai/code/artifact/ea47977c-4eb9-4724-a36c-ff4fa2235acb

## Ausgangsproblem
Die „Warum steigt mein Score"-Info war über drei Bildschirmregionen verstreut: **Mult** im Kopf,
**Serie/Formation/Gebäude/Crit** in der rechten StatusRail, **Fraktions-Motor** als große Bar unten links.
„Wo bin ich" war dreifach vorhanden (Kopf-Durchlauf, Rail-Deck-Position, „Deck: x/y" unterm Brett).
Vier große Fraktions-Bars stapelten sich vertikal.

## Zielstruktur (von oben nach unten)
1. **Kopf** — nur Wortmarke + Sekundär-Controls (Mute · Optionen · Beenden · Neustart). Reine Utility.
2. **Schwebende Kompakt-Leiste** (sticky oben, Blur/Schatten): links **▶/⏸ + Tempo (X2/X4/MAX) + 🎴 Karten**;
   dann kompakt **Score (+Δ zum Rekord) · Mult · Serie · Fortschritt (Durchlauf 3/5 + Karte 24/40 vereint) · Zeit**.
   Löst Kopf/Sidebar-Split und die dreifache Positionsanzeige auf.
3. **Battlefield — UNVERÄNDERT.** Komponente + Inhalt (Duell, Breakdown-Zeile, Banner) bleiben 1:1. Die
   Breakdown-Zeile erzählt die Motor-Story pro Stich bereits selbst → keine zusätzliche Score-Motor-Zeile am Brett.
4. **Fraktions-Headlines** — pro aktiver Fraktion EINE schlanke Zeile: Icon · Name · Kern-Bar (mit Schwellen) ·
   „gleich knallt's"-Status (z. B. ⚡ Voll geladen) · „Details ▸". Die ganze Tiefe (Histogramme, Sub-Counter,
   Legendär-Readouts) lebt hinter dem Ausklapper. Ersetzt die vier großen ChargeBar/HeatBar/PlantBar/GlacierBar.
5. **Sidebar (Referenz, ruhig):**
   - **Multiplikatoren** — Formation (Anzahl·%) · Gebäude % · Crit-Chance · Crit-Mult + Siege/Verluste/Quote
     (die bisherigen StatusRail-Kennzahlen, aufgeräumt gebündelt).
   - **Build** — Perks und Skills als GETRENNTE, beschriftete Gruppen (mit Anzahl), nicht gemischt.
   - **Analyse** — Bester Score + Score-Herkunft/Verlauf (eingeklappt).
   - **Master-Rang** schmal (nur Master-Läufe).

## Entscheidungen
- Sidebar bleibt (Desktop), aber nur noch Referenz/Analyse — der Score-Stand (Mult+Serie) wandert in die Leiste.
- Serie/Mult stehen NUR in der Leiste (keine Doppelung mit einer Motor-Zeile am Brett).
- „Bester Score" verlässt die prominente Kopfzeile → ruhige Analyse-Ecke (das Rekord-Δ in der Leiste sagt das Wichtige).
- Battlefield-Komponente wird nicht angefasst.

## Umsetzungsreihenfolge
1. Floating Kompakt-Leiste (Vitals + Pause/Tempo/Karten), sticky.
2. Sidebar-Umbau (Multiplikatoren-Bündel + getrennte Perks/Skills + Analyse eingeklappt).
3. Fraktions-Headlines (schlanke Zeile pro aktiver Fraktion, Details ausklappbar).

Mobil: gleiche Reihenfolge gestapelt, Leiste klebt oben.
