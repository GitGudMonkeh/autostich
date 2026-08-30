# Pitch

**Status: live — 2026-08-28.** The wording is owner-approved; changing it is an owner decision, not
an editing pass.

The one-sentence description of the game, for people and for websites — a press reply, a store page,
a forum post, a Discord topic, the line under a trailer.

**This is not player-visible text and does not belong in the i18n catalogs.** Nothing in the game
renders it. The catalogs are for strings the UI shows; a key nobody calls fails the dead-entry guard
in `test/i18n-guards.test.js`. When the pitch is needed inside the game one day, that is a new
decision about where it appears, not a copy of this file.

---

## English — canonical

> A card game about who stands next to whom: put the right cards side by side for fifty rounds, and
> your skills turn a polite little line-up into an engine that scores high enough to unlock tracks
> most players never hear.

## Deutsch

> Ein Kartenspiel darüber, wer neben wem steht: Stell 50 Durchläufe lang die richtigen Karten
> nebeneinander, und deine Skills machen aus einer braven kleinen Reihe eine Engine, die hoch genug
> punktet, um Tracks freizuschalten, die kaum jemand hört.

## Español

> Un juego de cartas sobre quién va al lado de quién: coloca las cartas correctas una junto a otra
> durante cincuenta ciclos y tus habilidades convertirán una fila modesta en un motor que puntúa lo
> bastante alto como para desbloquear pistas que casi nadie llega a escuchar.

## 简体中文

> 一款关于「谁挨着谁」的卡牌游戏：连续五十轮把合适的牌摆在一起，你的技能就会把一排规规矩矩的牌变成一台
> 计分引擎，分数高到足以解锁大多数玩家从未听过的曲目。

---

## What the sentence is claiming

Each clause is a real mechanic, which is why the pitch survives contact with the game:

| Clause | Mechanic |
| --- | --- |
| *who stands next to whom* | The player order is persistent across the run; `formations.js` scores neighbours — repetition, colour block, staircase, alternation — and overlapping formations multiply on top. |
| *fifty rounds* | `MAX_CYCLES = 50`. The run has a fixed length; there is no losing. |
| *your skills* | Skill rounds, `SKILL_SLOTS` held at once, drawn from the archetypes. Deliberately not a number and not "elemental" — later skills need not carry an element. |
| *an engine* | Formation multipliers, skills and architect buildings compound into the score formula in `engine.js`; building it is the game. |
| *tracks most players never hear* | The soundtrack tier escalates with the score (`TIER_MIN` in `src/ui/music.js`); the top tier only starts playing far up the scale. |

The last clause is the one that can go stale: it is a promise about a score threshold. Re-check it
against `TIER_MIN` before using the pitch somewhere durable, and note that the sentence deliberately
names no number, so a balance change does not invalidate it.

## Shorter cuts

Where a field has a character limit (store short descriptions are usually capped around 300):

> A card game you can't lose, only out-build: arrange forty cards for fifty rounds until your skills
> score high enough to unlock tracks most players never hear.

> Put the right cards side by side for fifty rounds, and your skills turn a polite little line-up
> into a scoring engine.

## Genre line

For a field that wants a genre rather than a sentence — a distributor form, a store category, a
press kit:

- **Game:** roguelite autobattler card game.
- **Soundtrack:** synthwave and outrun, escalating into darksynth and phonk. Where a platform only
  offers a fixed list (Spotify's upload form via a distributor, for instance), the entry is
  **Electronic** / **Dance-Electronic**; synthwave is not a selectable primary genre there.
