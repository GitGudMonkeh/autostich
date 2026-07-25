# Beschreibungen ↔ Code (Desc-Check) — Konvention (#120)

Perk-/Skill-/Item-/Stat-**Beschreibungen** (`desc` / `description`) sind Spielertext und driften
leicht vom tatsächlichen Verhalten ab (V2-Umbau, #93 Archetypen, #107 Shop, #115 L2/L6 …).

## Regel (Check-on-Change)

**Bei jeder Änderung an Perks / Skills / Items / Stats wird die zugehörige Beschreibung im
selben Commit mitgeprüft und ggf. aktualisiert.** Das gilt für die Definition **und** die
Anzeige, die sie rendert.

Konkret betroffen:

- **Definitionen:** `src/game/perks.js` (`PERK_DEFS[*].desc`), `src/game/skills.js`
  (`SKILL_DEFS[*].desc`), `src/game/shop.js` (`SHOP_ITEM_DEFS[*].description`),
  `src/game/stats.js` (Stat-Beschreibungen).
- **Anzeigen:** `BuildPanel`, `CardDetail`, `PerkSelect`, `SkillSelect`, `ShopScreen`,
  `StatSelect`, `LayoutPerks`.

## Praxis

- **Zahlen aus `constants.js` beziehen**, nicht doppelt hartkodieren. Wo ein Text eine
  Tuning-Zahl nennt, den Wert per Template-String aus der Konstante ziehen (Beispiel:
  `SkillSelect` `KEYWORD_INFO.heat`/`freeze` bauen den Text aus `FIRE_SCORE_BASE`,
  `ICE_BASE_FREEZE`, … → kein Drift). So bleibt Text ↔ Code automatisch synchron.
- Ändert sich eine Konstante, prüfen, ob eine Beschreibung sie nennt.
- Beim Rework eines Effekts die alte Beschreibung nicht stehen lassen — sie ist die häufigste
  Drift-Quelle (siehe #115 L2/L6, D-Perks, Archetyp-Skills).

## Commit-Checkliste (kurz)

- [ ] Effekt geändert → Beschreibung geprüft/aktualisiert?
- [ ] Genannte Zahlen aus der Konstante bezogen (nicht hartkodiert)?
- [ ] `npm test` grün?

## Perspektive

Langfristig übernimmt eine **generierte Referenz** (Analogon zu TrickLadder #6) die
strukturierten Teile automatisch; bis dahin gilt diese manuelle Regel.
