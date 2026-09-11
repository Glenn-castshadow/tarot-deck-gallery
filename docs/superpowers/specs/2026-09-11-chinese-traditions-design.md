# Chinese traditions completion: deeper BaZi, luck pillars, I Ching

Date: 2026-09-11. Branch: chinese-traditions. Author: Claude, working unattended on Glenn's
instruction "finish the numerology and Chinese traditions section" (2026-09-11); Glenn asked
for the work to run unattended, which I take as approval of the two-sub-project split. This is
the second sub-project. Every convention below is attributed.

## Goal

Close the Chinese-traditions items still open on the site's feature list: deeper BaZi
interpretation (hidden stems, Ten Gods), luck cycles (大運, luck pillars), and the I Ching.
The first two extend the Four Pillars tab in the celestial extras section
(`celestial-extras-engine.js`, `celestial-extras.js`, `celestial-extras.css`). The I Ching is
a casting practice, so it becomes the fifth mode of the Cards & divination room
(`divination-data.js`, `divination-engine.js`, `divination-art.js`, `divination.js`,
`divination.css`), and, because divination readings can be saved to the account journal, it
also needs one new reading kind in the Django service.

| Constraint | Source |
|---|---|
| Symbolic reflection, not prediction; "traditionally associated with" framing; no strength, fortune or luck scores | Codebase voice (BaZi conventions in docs/EXTENDED-ATLAS.md; divination notes) |
| Original interpretive copy; sources cited for calculation methods and traditional tables only | Codebase convention |
| BaZi conventions already fixed: Li Chun year, Jie months at 30° solar-longitude steps, day rolls at 23:00, civil-clock double hours | Codebase (docs/EXTENDED-ATLAS.md "BaZi conventions") |
| Independent fixtures for BaZi arithmetic come from lunar_python in a throwaway venv, never shipped | Codebase (tools/build_atlas_fixtures.py) |
| Nothing new persisted client-side; the luck-pillar counting choice and any cast stay in page memory | Codebase convention |
| Cache-bust `?v=` keys bumped on every changed JS/CSS file | Codebase convention |
| Open-source only; Astronomy Engine (already vendored) provides `SearchSunLongitude` for Jie instants; no new dependency | Glenn's global rule; my judgement |
| Saved-reading kinds are validated server-side from `Reading.KINDS`; a new kind needs a model change, a migration and a test | Codebase (server/ishtar/readings) |

## Part A: Four Pillars, deepened

### A1. Hidden stems (藏干)

Each earthly branch carries one to three hidden heavenly stems, in the standard order
principal, middle, residual (mine: the table as published in the Hong Kong Observatory
material and every mainstream BaZi reference; this is a fixed traditional table, not a
calculation):

| Branch | Hidden stems |
|---|---|
| 子 Zi | 癸 |
| 丑 Chou | 己 癸 辛 |
| 寅 Yin | 甲 丙 戊 |
| 卯 Mao | 乙 |
| 辰 Chen | 戊 乙 癸 |
| 巳 Si | 丙 庚 戊 |
| 午 Wu | 丁 己 |
| 未 Wei | 己 丁 乙 |
| 申 Shen | 庚 壬 戊 |
| 酉 You | 辛 |
| 戌 Xu | 戊 辛 丁 |
| 亥 Hai | 壬 甲 |

Stems are indexed 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9; even index is yang, odd is yin;
phases Wood (0,1), Fire (2,3), Earth (4,5), Metal (6,7), Water (8,9). The engine already holds
`stems` and `branches`; the hidden-stem table is added beside them as branch index → stem indices.

### A2. Ten Gods (十神)

Every stem other than the Day Master itself is named by its relation to the Day Master
(mine: the standard derivation). With the generating cycle Wood→Fire→Earth→Metal→Water→Wood and
the controlling cycle Wood→Earth→Water→Fire→Metal→Wood:

| Relation to Day Master | Same polarity | Opposite polarity |
|---|---|---|
| Same phase | 比肩 Bǐ Jiān · Friend | 劫財 Jié Cái · Rob Wealth |
| Day Master produces it | 食神 Shí Shén · Eating God | 傷官 Shāng Guān · Hurting Officer |
| Day Master controls it | 偏財 Piān Cái · Indirect Wealth | 正財 Zhèng Cái · Direct Wealth |
| It controls the Day Master | 七殺 Qī Shā · Seven Killings | 正官 Zhèng Guān · Direct Officer |
| It produces the Day Master | 偏印 Piān Yìn · Indirect Resource | 正印 Zhèng Yìn · Direct Resource |

The traditional English names are kept (they are how readers will look them up) and each god
gets an original two-sentence reflective description plus a prompt, in the site's voice: what
the relationship is traditionally associated with, framed as a question, never as a verdict on
wealth, career or health. The Day Master's own stem is labelled "Day Master", not a god.

The engine reports the god of the three visible non-day stems and of every hidden stem of all
four branches (the day branch included). The UI shows, per selected pillar, the visible stem
with its god and the hidden stems with theirs, principal first.

### A3. Phase counts, two views

The existing meter chart ("visible eight") stays as the default. A pressed-state toggle adds
a second view, "with hidden stems", which counts the four visible stems plus every hidden stem
of the four branches (4 + 4 to 12 characters; the denominator is shown). Both views remain
counts; the copy keeps saying they are not a strength or balance score. (Mine: counting all
hidden stems rather than principal-only, because the principal-only count is identical to the
visible-eight view and would add nothing.)

### A4. Luck pillars (大運)

Conventions (mine, following the standard method as implemented by lunar_python, which is the
independent fixture source):

- **Direction.** Forward when the year stem is yang and the reader counts as male, or the year
  stem is yin and the reader counts as female; backward otherwise.
- **Start.** Forward: the interval from the birth instant to the next Jie boundary (the next
  multiple of 30° from 315° in apparent solar longitude, found with Astronomy Engine's
  `SearchSunLongitude` over the same longitude expression the month pillar uses). Backward: the
  interval from the previous Jie boundary to the birth instant. Three days count as one year,
  one day as four months; the result is reported in whole years and months (total months =
  floor(days × 4), matching lunar_python, so the start is expressed as "age Y years M months").
- **Sequence.** Ten pillars of ten years each, stepping the month pillar forward or backward
  through the sexagenary cycle (stem and branch advance together). Each pillar shows its
  characters, pinyin, phases, its start age and the calendar year it begins (birth year +
  start age, months ignored for the year label), and the Ten God of its stem. The pillar
  containing the reader's current age (from `localToday()`) is marked "now".
- **Input.** Tradition keys the direction to the sex recorded at birth. The site stores no
  such datum, so the Four Pillars tab gains a page-only select, "Count luck pillars as", with
  options *Show both directions* (default), *Male, traditional counting*, *Female, traditional
  counting*. With the default, two rows are rendered, each labelled by the convention that
  produces it ("Forward · traditional counting for a male born in a yang year or a female born
  in a yin year"). The choice lives in the component's page state only.
- Sample charts (the existing "Try sample charts" toggle) get luck pillars too.

### A5. Engine API (`celestial-extras-engine.js`)

- `bazi(chart)` result gains: `hidden:[[stemIdx,…]×4]` (per pillar, hidden stem indices of
  its branch), `gods:{stems:[godKey|null ×4], hidden:[[godKey,…]×4]}`, `phasesHidden:{Wood,…}`
  with `hiddenTotal:int`, and `yangYear:boolean`.
- `tenGod(dayStemIdx, stemIdx)` → god key (`'friend'|'robWealth'|'eatingGod'|'hurtingOfficer'|
  'indirectWealth'|'directWealth'|'sevenKillings'|'directOfficer'|'indirectResource'|
  'directResource'`). The same stem as the Day Master is `friend`; the Day Master's own pillar
  position is excluded by the caller (`gods.stems[2]` is `null`). `tenGod` is pure and exported.
- `luckPillars(chart, sex)` with `sex` `'male'|'female'` →
  `{status, direction:'forward'|'backward', startAge:{years,months}, startDays:number, boundary:{longitude, date}, pillars:[{index, stemIndex, branchIndex, characters, stem, branch, fromAge, fromYear, god}]}`
  or `{status:'missing', message}` when the chart is not ready.
- `gods` table export: key → `{hanzi, pinyin, english}`.
- `jieBoundary(date, direction)` → `{longitude, date}`: the next (or previous) Jie instant.

### A6. Tests

- New `tools/build_bazi_fixtures.py` (lunar_python only; venv instructions in the docstring)
  writes `tests/fixtures/bazi-reference.json`: for each of the twelve existing BaZi births plus
  four more chosen to cover both directions and a birth within an hour of a Jie: the four
  pillars, the hidden stems of each branch (`getYearHideGan()` etc.), the Ten God of each
  visible stem (`getYearShiShenGan()` etc.) and of each hidden stem (`get…ShiShenZhi()`), and for
  each sex the luck-pillar direction, start (year/month/day from `getYun(gender, 1)`), and the
  first five pillars' characters (`getDaYun()[1..5]`; index 0 is the pre-luck period in
  lunar_python).
- New `tests/bazi.test.cjs`: hidden-stem table matches the fixture for every branch that
  appears; Ten Gods match for every visible and hidden stem; luck-pillar direction and the
  five characters match for both sexes; the start age matches lunar_python's to within one
  month (Jie instants from two ephemerides differ by minutes; the tolerance and the reason are
  written into the test); `tenGod` is exhaustively checked for all 10×10 stem pairs against the
  table above; `phasesHidden` totals equal 4 + the number of hidden stems; `luckPillars` on a
  non-ready chart returns `missing`.
- Existing 12 Four Pillars cases keep passing unchanged.

### A7. UI

In the Four Pillars view, below the existing pillar buttons:

- The pillar reading (already present, selected pillar) gains a "Stems in this pillar" list:
  visible stem → god (or "Day Master"), then each hidden stem → god, each with hanzi, pinyin,
  phase and polarity. Selecting a god name reveals its description and prompt in a small
  aside (one god open at a time, pressed state).
- The phase chart gains the visible/hidden toggle (A3).
- A new "Luck pillars" block: the select (A4), a horizontal timeline of ten pillars per row
  (two rows when "both"), the current pillar marked, and a methods paragraph stating the
  direction rule, the 3-days-per-year conversion, the boundary used and its date. The block
  scrolls horizontally inside its own container on phones rather than widening the page.

## Part B: I Ching as a fifth divination practice

### B1. Data (`divination-data.js`)

- `hexagrams`: 64 entries in King Wen order, `{id:0..63, number:1..64, name:pinyin with tone
  marks, character, gloss:string (an original three-to-five-word English gloss, not the Wilhelm
  or Legge titles), symbol:six-character line string bottom-up with '1' yang and '0' yin,
  keyword, meaning (original, 75+ characters), prompt (ends with ?)}`. The line strings are
  fixed by the plan (the standard table; a structural test enforces the King Wen pairing rule:
  for odd n, hexagram n+1 is n turned upside down, except when that is the same figure, in
  which case it is n with every line flipped).
- `trigrams`: 8 entries `{name, character, image, symbol:three lines bottom-up}`: 乾 Qián
  111 Heaven, 兌 Duì 110 Lake, 離 Lí 101 Fire, 震 Zhèn 100 Thunder, 巽 Xùn 011 Wind, 坎 Kǎn 010
  Water, 艮 Gèn 001 Mountain, 坤 Kūn 000 Earth.
- `linePositions`: six original one-paragraph reflections on what a changing line at each
  position (bottom to top) traditionally draws attention to: the beginning, the inner
  position, the threshold between inner and outer, the entry into the outer, the position of
  authority, the end and excess.

Copy voice: the traditional hexagram names are public; every gloss, meaning, prompt and
position text is original and framed as reflection. Sources cited for the table: the King Wen
sequence and trigram attributions (a standard reference such as the Unicode Yijing Hexagram
Symbols chart, which fixes both the order and the line patterns).

### B2. Engine (`divination-engine.js`)

- `castLine(method, random)` → 6, 7, 8 or 9. `'coins'`: three coins, each `2 + random(2)`
  (tails 2, heads 3), summed. `'yarrow'`: `random(16)` mapped to 6 (0), 7 (1–5), 8 (6–12),
  9 (13–15), i.e. the 1/16, 5/16, 7/16, 3/16 yarrow probabilities. `random` defaults to the
  existing `randomInt`.
- `castHexagram(method, random)` → six line values bottom-up.
- `readLines(values)` → `{primary:hexagramIndex, changing:[positions 0..5], relating:hexagramIndex|null, primarySymbol, relatingSymbol|null}`; throws on anything but six values in 6–9. 7 and 9 are yang, 6 and 8 are yin; 6 and 9 are changing; the relating hexagram flips every changing line.
- `loadLines(values)` → a sanitised copy or `null` (mirrors `loadIds`).
- A `hexagramIndex(symbol)` lookup built once from the data.

### B3. Art (`divination-art.js`)

`DivinationArt.hexagram(values, {changing:true})` returns an inline SVG of six lines drawn
bottom-up (yang solid, yin broken), with changing lines marked by the traditional small circle
(old yang) or cross (old yin) beside the line; `DivinationArt.hexagramFromSymbol(symbol)` draws a plain figure for the library and the relating hexagram. No raster art; the I Ching mode does not use `assets/divination-v2` at all and the back-of-card fan uses the seal glyph instead of an image.

### B4. UI (`divination.js`, `divination.css`)

- Fifth tab `iching`: name "I Ching", tag "64 hexagrams · coins or yarrow", title and intro
  original. Header copy becomes "Five ways to listen closely." The mobile disclosure subtitle
  gains "· I Ching".
- Controls: the shared question field; a "Casting method" select (Three coins / Yarrow-stalk
  probabilities); the cast button "Cast the hexagram". A `<details>` "Cast with your own coins"
  offers six line buttons (bottom to top) cycling 7 → 8 → 9 → 6 with spoken labels ("Line 1:
  young yang. Change."), and a checkbox "Use the lines below" that makes the cast button read
  those values instead of drawing.
- Output: the hexagram figure with changing lines marked; name, character, number and gloss;
  its two trigrams named with their images ("Water over Thunder"); the meaning and prompt; then
  one section per changing line (position text combined with the line number) and, when there
  are changing lines, the relating hexagram drawn beside the primary one under the heading
  "Where this may be moving", with its own gloss, meaning and prompt. When no line changes, a
  sentence says the figure stands as it is.
- Library: all 64 figures as SVG buttons with number and name; the study card shows
  character, gloss, trigrams, meaning, prompt.
- Save to journal: `currentDraw()` returns `{kind:'iching', deck:'', layout:method, question,
  focus:'', payload:{lines:[…6 values]}}`; `loadDraw` validates through `loadLines` and
  restores the method from `layout` when it is one of the three.

### B5. Server (`server/ishtar/readings`)

`Reading.KINDS` gains `('iching', 'I Ching')`; migration `0002_reading_kind_iching`; the view
already derives its allowed set from the model. A test posts an `iching` reading and reads it
back. `account.js` `kindLabel` gains `iching: 'I Ching'`. Deploying the service is Glenn's
morning step (documented in docs/deployment.md as a pending note); until then a signed-in
reader who saves an I Ching reading sees the existing "Unknown reading kind." message from the
live server, which is acceptable for the hours between merge and deploy. (Mine.)

### B6. Tests

- `tests/divination.test.cjs`: 64 unique names and line strings; King Wen pairing rule for all
  32 pairs; every hexagram's lower and upper three lines match a trigram; hexagram 1 is
  111111, 2 is 000000, 63 is 101010, 64 is 010101, 11 is 111000, 12 is 000111; `castLine`
  distributions with an injected sequence (coins: 2+2+2 → 6, 3+3+3 → 9; yarrow: each bucket
  boundary); `readLines` for no change, one change, all lines changing (1 → 2), and rejection
  of bad input; `loadLines` sanitising; prose constraints (meaning length, prompt ends `?`,
  gloss word count 3–5) for hexagrams and the six position texts.
- Django: one new test for the kind.
- Browser: cast with both methods, manual lines, changing-line rendering, relating hexagram,
  library, save control visible when signed in (unverifiable overnight; recorded as not done),
  390px layout with no page overflow.

## Documentation

- docs/EXTENDED-ATLAS.md "BaZi conventions" gains hidden stems, Ten Gods, the two phase views
  and the luck-pillar method with the direction rule and 3-days-per-year conversion; validation
  section lists the new fixture tool and tests.
- docs/DIVINATION.md gains the I Ching section: data shape, casting methods and probabilities,
  changing-line and relating-hexagram rules, art, journal payload, tests.
- docs/deployment.md gains a pending note: the next deploy must include the Django migration
  and a service restart, plus the rekeyed frontend files.

## Out of scope

- Zi-hour (23:00–00:59) hour-pillar variants, true-solar-time correction, or any change to the
  existing day/hour conventions.
- BaZi "strength", "favourable element" or annual (流年) analysis.
- I Ching line texts (爻辭) per hexagram: 384 original passages are beyond this pass; the six
  position reflections combine with the hexagram reading instead, and the docs say so.
- Deploying the Django migration or the frontend (Glenn's morning step).
