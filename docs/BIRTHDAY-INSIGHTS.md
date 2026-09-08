# Birthday insights

The birthday room has three perspectives: the existing Western sky portrait with expanded reflection prompts, a Chinese zodiac portrait, and an interactive Lo Shu number study. All calculations run in the browser. The existing `arcana-birthday-profile-v1` localStorage entry holds the date and optional time/place; these inputs are not sent to a service.

## Calendar conventions

- Parse the entered Gregorian civil date at UTC noon to avoid local time-zone date shifts. Reject impossible dates. The form prevents future birthdays.
- Convert dates from 1901–2100 using the browser's `Intl.DateTimeFormat` Chinese calendar. Read `relatedYear`, not `year`. If Chinese-calendar support is unavailable or the result is incomplete, show an unavailable message; Western and number views still work.
- Use **Lunar New Year** as the animal-year boundary. A January/February birthday can belong to the previous lunar year. This follows the Hong Kong Observatory's calendar convention, not the Li Chun boundary used by many astrology practitioners. See [HKO: year changeover](https://www.weather.gov.hk/en/education/astronomy-and-time/time-service/00506-what-year-is-it-today.html).
- Derive the year stem and branch from the repeating 60-year cycle, anchored on 1984 Jia-Zi. Show the stem's phase (Wood, Fire, Earth, Metal, Water) and yin/yang. These are year associations, not a BaZi Day Master or a full personal element balance. [HKO: stems, branches and hours](https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm), [animal sequence](https://www.hko.gov.hk/en/gts/time/12animals.htm), [Joey Yap: ten-stem terminology](https://joeyyap.com/dlll267/Joey%20Yap%27s%20Meet%20The%2010%20Stems_.pdf).
- Optional birth time selects its two-hour branch association using the entered clock time. Zi/Rat spans 23:00–01:00. There is no solar-time, timezone, birthplace, day-pillar or hour-stem calculation.
- Lunar month names come from the browser's English calendar implementation; the `bis` leap-month suffix is displayed as “(leap)”. Calendar implementations can differ in edge cases; this is not an astronomical ephemeris.
- Western sun-sign ranges and decans remain approximate. The existing moon-phase function estimates an average lunar cycle, and the wheel is symbolic. No exact natal positions are implied.

## Number conventions

The Lo Shu arrangement is `4 9 2 / 3 5 7 / 8 1 6`. Every row, column and main diagonal totals 15. See [Wolfram MathWorld](https://mathworld.wolfram.com/LoShu.html).

Counting digits from `YYYYMMDD` is explicitly presented as a **modern birthday overlay**, not an ancient Chinese personality system. Zero is counted but has no square cell. Each cell shows its frequency, including zero occurrences, and remains selectable. Repeated and absent digits have no assigned strength, weakness or fortune score.

The “birth-date root” adds every digit, then repeatedly adds the result's digits until 1–9 remains. It also reduces 11, 22 and 33. This is a transparent digit-reduction exercise; it is not labelled a traditional Chinese life-path calculation.

Cultural notes distinguish number wordplay from original journal prompts. Four, six and eight draw on [Open University: Chinese number culture](https://www.open.edu/openlearn/languages/chinese-the-tip-your-tongue-culture-behind-the-numbers); nine draws on [China Heritage: Counting Up to Nine](https://chinaheritage.net/journal/counting-up-to-nine/). Other cells explain mathematical relationships within the square. Meanings vary by language and community. Animal, phase and number prompts are original reflective writing, not predictions or diagnostic personality claims.

## Verification

Run `node --test tests/birthday-insights.test.cjs` and syntax-check `app.js` and `birthday-insights.js`. Boundary fixtures reference HKO's [2024 almanac](https://www.hko.gov.hk/en/gts/astron2024/files/HKO_almanac_2024.pdf), [2020 calendar](https://www.hko.gov.hk/en/publica/calendar/files/Cal_2020.pdf), and [1901–2100 conversion tables](https://www.hko.gov.hk/en/gts/time/conversion.htm).

Browser checks should cover all three perspectives, a January/February year boundary, optional time, selecting a Lo Shu number, resubmitting a different date while a perspective is open, and desktop/mobile layout. Confirm existing card draws, large-card viewing and deck comparison still work. Birthday view buttons and Lo Shu cells use native buttons with `aria-pressed`; inactive panels use `hidden`. Number details update without replacing the focused cell.
