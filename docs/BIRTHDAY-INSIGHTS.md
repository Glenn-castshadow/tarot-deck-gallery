# Birthday insights

The birthday room's three perspectives now live on their own pages: the Western sky portrait with expanded reflection prompts on `/charts/`, a Chinese zodiac portrait on `/eastern/`, and the Lo Shu number study, now one view among six in the numerology studio, on `/numerology/`. All calculations run in the browser. The existing `arcana-birthday-profile-v1` localStorage entry holds the date and optional time/place; these inputs are not sent to a service.

## Celestial atlas and city suggestions

The sky portrait now uses a circular vector zodiac wheel, enlarged sign typography and a blue, gold and teal palette. Opening the wheel launches an accessible dialog with 100–300% zoom, fit-to-view, scrolling/panning, and twelve selectable signs. Selecting another sign changes the guide's detail panel; it does not change the birthday or its highlighted sun sign. With birth time and location, this now opens the calculated natal chart. Without those inputs the symbolic guide remains available. See [natal methods and validation](NATAL-CHART.md) and [solar returns, lunar returns and progressions](CHART-IN-TIME.md).

Birthplace suggestions use a same-origin GeoNames index and run entirely in the browser. The index loads on demand, supports accents and alternate names, and labels city, region and country. Keyboard users can choose with arrows/Enter and dismiss with Escape. Unlisted places can be entered manually. Selected locations add a `placeLocation` object to the existing profile, holding the GeoNames ID, label, coordinates and IANA timezone for the natal chart. Editing the text discards that selection. See [city data provenance and rebuilding](../assets/cities/README.md).

## Calendar conventions

- Parse the entered Gregorian civil date at UTC noon to avoid local time-zone date shifts. Reject impossible dates. The form prevents future birthdays.
- Convert dates from 1901–2100 using the browser's `Intl.DateTimeFormat` Chinese calendar. Read `relatedYear`, not `year`. If Chinese-calendar support is unavailable or the result is incomplete, show an unavailable message; Western and number views still work.
- Use **Lunar New Year** as the animal-year boundary. A January/February birthday can belong to the previous lunar year. This follows the Hong Kong Observatory's calendar convention, not the Li Chun boundary used by many astrology practitioners. See [HKO: year changeover](https://www.weather.gov.hk/en/education/astronomy-and-time/time-service/00506-what-year-is-it-today.html).
- Derive the year stem and branch from the repeating 60-year cycle, anchored on 1984 Jia-Zi. Show the stem's phase (Wood, Fire, Earth, Metal, Water) and yin/yang. These are year associations, not a BaZi Day Master or a full personal element balance. [HKO: stems, branches and hours](https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm), [animal sequence](https://www.hko.gov.hk/en/gts/time/12animals.htm), [Joey Yap: ten-stem terminology](https://joeyyap.com/dlll267/Joey%20Yap%27s%20Meet%20The%2010%20Stems_.pdf).
- Optional birth time selects its two-hour branch association using the entered clock time. Zi/Rat spans 23:00–01:00. There is no solar-time, timezone, birthplace, day-pillar or hour-stem calculation.
- Lunar month names come from the browser's English calendar implementation; the `bis` leap-month suffix is displayed as “(leap)”. Calendar implementations can differ in edge cases; this is not an astronomical ephemeris.
- Without complete natal inputs, Western sun-sign ranges and decans remain approximate, with an average lunar-cycle estimate. Complete natal inputs use calculated solar longitude, lunar phase and natal positions instead.

## Animal-year relations

Under the Chinese zodiac portrait on `/eastern/`, `chinese-year.js` relates a chosen year's
animal to the reader's own birth animal, using the same **lunar-year, Lunar New Year boundary**
as the portrait above, not the Li Chun boundary the BaZi pillars use. The default year is the
lunar year in effect today, from the same `BirthdayInsights.chineseProfile` formatter; a year
selector (number input plus step buttons) runs from 1901 to 2100.

Both branches are placed on the traditional twelve-branch cycle and checked against eight
relations. A pair can carry more than one relation — 寅 Tiger and 亥 Pig are both a six harmony
and a destruction — and every relation that applies is shown, always in this order:

| Relation | Hanzi | Rule (branch indices 0–11, 子 Zi to 亥 Hai) |
|---|---|---|
| Same animal | 本命年 | The chosen year's animal is the birth animal |
| Trine | 三合 | Four or eight places apart around the cycle |
| Six harmony | 六合 | One of six fixed pairs: 子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未 |
| Clash | 六沖 | Exactly six places apart |
| Harm | 六害 | One of six fixed pairs: 子未, 丑午, 寅巳, 卯辰, 申亥, 酉戌 |
| Punishment | 刑 | Two distinct animals within 寅巳申 or 丑戌未, or the pair 子卯 |
| Self-punishment | 自刑 | The chosen year repeats the birth animal, and it is 辰, 午, 酉 or 亥 |
| Destruction | 破 | One of six fixed pairs: 子酉, 卯午, 巳申, 寅亥, 丑辰, 未戌 |

When none of the eight apply, the page says the tradition names no relation for that pair — it
never calls a year lucky or unlucky. Each relation's copy is original reflective writing framed
as traditional association, with no fortune, luck or predictive language.

## Number conventions

The number perspective now includes an expanded Pythagorean numerology studio.
See [NUMEROLOGY.md](NUMEROLOGY.md) for its birth, name and cycle conventions.
The Lo Shu study below is preserved as a separate view inside that studio.

The Lo Shu arrangement is `4 9 2 / 3 5 7 / 8 1 6`. Every row, column and main diagonal totals 15. See [Wolfram MathWorld](https://mathworld.wolfram.com/LoShu.html).

Counting digits from `YYYYMMDD` is explicitly presented as a **modern birthday overlay**, not an ancient Chinese personality system. Zero is counted but has no square cell. Each cell shows its frequency, including zero occurrences, and remains selectable. Repeated and absent digits have no assigned strength, weakness or fortune score.

The “birth-date root” adds every digit, then repeatedly adds the result's digits until 1–9 remains. It also reduces 11, 22 and 33. This is a transparent digit-reduction exercise; it is not labelled a traditional Chinese life-path calculation.

Cultural notes distinguish number wordplay from original journal prompts. Four, six and eight draw on [Open University: Chinese number culture](https://www.open.edu/openlearn/languages/chinese-the-tip-your-tongue-culture-behind-the-numbers); nine draws on [China Heritage: Counting Up to Nine](https://chinaheritage.net/journal/counting-up-to-nine/). Other cells explain mathematical relationships within the square. Meanings vary by language and community. Animal, phase and number prompts are original reflective writing, not predictions or diagnostic personality claims.

## Verification

Run `node --test tests/birthday-insights.test.cjs tests/birthplace-search.test.cjs tests/natal-engine.test.cjs tests/chinese-year.test.cjs` (7 tests in `chinese-year.test.cjs`) and syntax-check `app.js`, `birthday-insights.js`, `birthplace-search.js`, `natal-engine.js`, `natal-chart.js`, `sky-chart.js`, `chinese-year.js` and `chinese-room.js`. Boundary fixtures reference HKO's [2024 almanac](https://www.hko.gov.hk/en/gts/astron2024/files/HKO_almanac_2024.pdf), [2020 calendar](https://www.hko.gov.hk/en/publica/calendar/files/Cal_2020.pdf), and [1901–2100 conversion tables](https://www.hko.gov.hk/en/gts/time/conversion.htm).

Browser checks should cover all three perspectives, a January/February year boundary, optional time, selecting a Lo Shu number, resubmitting a different date while a perspective is open, and desktop/mobile layout. Confirm existing card draws, large-card viewing and deck comparison still work. Birthday view buttons and Lo Shu cells use native buttons with `aria-pressed`; inactive panels use `hidden`. Number details update without replacing the focused cell.

For the atlas, check opening/closing the modal, keyboard sign selection, zoom limits and fit, plus focus return and mobile overflow. City checks include delayed loading, keyboard/pointer selection, Escape, stale searches after focus moves, no results, manual entry, and restoring/editing a selected place.
