# Autostich — sample translation order, German → Simplified Chinese

**This is a sample, not the full order.** 115 strings out of 2,639. It exists so the typography for
Chinese can be designed against real text instead of against a guess, and it is deliberately the
smallest set that still touches every place where the design can break.

The full order follows once the design round on this sample is closed. Nothing here is thrown away:
these 115 strings are part of the full catalogue and their translations carry over.

## 1. The frozen source

| Field | Value |
| --- | --- |
| Source commit | `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Source language | German. Translate from German, not from English. |
| Target language | Simplified Chinese, `zh-Hans` |
| File | `sample-order.csv` |

The commit is the only way to tell later whether the source drifted while the translation was in
flight. Quote it in the delivery.

An English column exists in the product and is **not** in this file on purpose. English is a
translation too; translating a translation compounds its choices. Where a German string is ambiguous,
ask rather than consult the English.

## 2. The CSV

Columns: `id`, `category`, `de`, `zh-Hans`, `context`, `limit`, `status`, `note`.

**Fill `zh-Hans`. Change nothing else.** `id` is the key the product looks the string up by; a changed
id is a lost string.

- `context` says why the string is in the sample — which typography role it sits in, or which extreme
  it represents. It is not part of the text.
- `note` carries the German length in characters. It is information, not a target.
- `limit` is empty throughout. No string in this sample has a recorded width limit. Where you judge a
  translation to be at risk of not fitting, say so in the delivery rather than shortening on your own
  — the layout is still being designed, and a translation trimmed to a width that then changes is
  wasted twice.

## 3. What the strings are

| Group | n | What it is |
| --- | --- | --- |
| Longest descriptions | 14 | Full paragraphs — glossary entries, skill and perk descriptions, the privacy text. The longest is 586 characters. |
| One tutorial lesson | 14 | Contiguous running prose, in reading order. |
| Eyebrows | 13 | Small labels set above a readout. In German they are set in capitals with wide letter-spacing; in Chinese neither applies. See §5. |
| Small labels and counters | 13 | The smallest text in the product. |
| Panel and section titles | 8 | Headings. |
| Everything else | 53 | The longest and shortest string of each remaining typography role. |

## 4. Terminology

The canonical German → English term list in
`docs/localization/uebersetzerpaket_pixi_2026-08-15.md` §3 is the reference for **what each term
means**, not for how it should read in Chinese. Use it to understand the source; choose the Chinese
term yourself.

**Be consistent within the sample and record your choices.** A short glossary of the terms you
settled on, delivered with the CSV, is worth more than any instruction here — it becomes the binding
list for the full order.

Do not translate: `Autostich` (the product name), placeholder names in braces, and the notation for
resources where it appears as a code (`SP`, `DP`, `TP`).

## 5. Punctuation, spacing and numbers — what applies

The style guide in `docs/text-style-guide.md` was written for Latin script. For Chinese the following
replaces it, and it is stated here so that it is not decided string by string:

- **Full-width punctuation** throughout: `，。：；？！（）「」`. Do not mix half-width `,.:;?!()` into
  Chinese sentences.
- **No space between Chinese characters and Latin letters or digits.** The product does not insert
  one, and adding it by hand makes spacing inconsistent across strings.
- **Numbers stay Western digits** (`1,234`, `2.25`). Chinese groups thousands as English does; the
  product formats them, so leave numeric placeholders alone.
- **Percent has no space**: `7%`, not `7 %`. The German form has a thin space; the Chinese form does
  not.
- **No line-break hints.** No manual line breaks, no soft hyphens, no leading or trailing spaces.
  Chinese breaks between characters and the product handles it.
- **Ellipsis** as `……` where the German uses `…`.

## 6. Placeholders and markup

`{name}`, `{count}`, `{total}` and the like are substituted at runtime. **Copy them exactly**,
including the braces and the spelling inside them. They may move within the sentence — Chinese word
order differs — but every placeholder present in the German must be present in the Chinese, and none
may be added.

`**bold**` marks emphasis and must survive. Emoji and symbols (`⭐`, `·`, `→`) are part of the string;
keep them where they are.

## 7. Delivery

Return `sample-order.csv` with the `zh-Hans` column filled, plus:

1. the terminology list you settled on,
2. any string you judge at risk of not fitting, with the id,
3. anything in the German that was ambiguous, with the id and what you assumed,
4. the source commit above, quoted back.

Do not return a reformatted CSV, a spreadsheet export with changed quoting, or a file with the row
order changed. The row order is the merge key check.
