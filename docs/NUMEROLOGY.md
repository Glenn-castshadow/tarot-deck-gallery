# Numerology studio

The former Numbers & Lo Shu birthday perspective is now **Numerology**, with
four views: Birth numbers, Personal cycles, Name reading, and the existing Lo Shu
study. A birth date is sufficient; birth time and location are not used here.
The visual design continues the celestial atlas's ink, gold and teal palette.

## Conventions

Numerology is presented as a symbolic reflective practice. The calculations are
reproducible conventions, not evidence of personality traits or predicted events.
All reading copy and prompts are original. Sources document the calculation
methods, not the app's reflective prose.

- **Life Path** reduces the birth month, day and year separately, preserving 11,
  22 and 33 at each stage. The three resulting numbers are summed and reduced
  with the same rule. Master results display their root too: 11/2, 22/4, 33/6.
  Worked reference: October 22, 1980 → 1 + 22 + 9 → 32 → 5, from
  [Numerology.com](https://www.numerology.com/articles/your-numerology-chart/life-path-number-meanings/).
- **Birth Day** retains the original day (1–31) and reads its reduced theme,
  preserving master numbers in the reduction. The app explicitly identifies
  this as a reduced interpretation, not a separate meaning for every compound day.
- **Attitude**, also called a Sun number in some systems, sums month and day
  and reduces to 1–9. See [Hans Decoz's Sun number convention](https://www.worldnumerology.com/numerology-sun-numbers/).
- **Personal Year** sums birth month + birth day + selected calendar year and
  reduces to 1–9. The birth year is not used. Personal Month adds the selected
  month to Personal Year; Personal Day adds the selected day to Personal Month.
  Master numbers are not retained. Years change January 1. Other schools may
  use birthday boundaries. References:
  [calendar year method](https://www.worldnumerology.com/personal-numerology-forecast/),
  [May 5, April 2021 worked example](https://www.worldnumerology.com/free-forecasts/monthly-numerology-forecast.html).
- The cycle explorer displays the 1–9 sequence containing the selected year and
  all twelve Personal Months. Month/year selection clamps the day to the last
  valid day (January 31 → February 28/29), never silently overflows into March.
  The UI supports dates from the entered birthday through December 31, 2100.
- **Name values** repeat 1–9 across A–Z. Expression uses all letters, Soul Urge
  (Heart's Desire) uses vowels, Personality uses consonants. This release uses
  whole-name/group sums before reduction, with 11/22/33 retained at the final
  reduction; it does not reduce individual name components before summing them.
  **Maturity** adds Life Path and Expression, retaining master numbers in the
  result. General convention reference:
  [Pythagorean chart methods](https://www.worldnumerology.com/do-your-own-reading/).
- Every Y defaults to consonant and has an individual vowel checkbox. Moving
  Y between groups changes Soul Urge and Personality, never Expression. The
  user chooses based on pronunciation. Empty vowel/consonant groups show an
  unavailable result, not a numerological zero or a missing human quality.
- Spaces, apostrophes, hyphens and periods separate words. Diacritics are stripped
  with NFKD; ß/ẞ, æ, œ, ø, ł, đ/ð and þ have explicit Latin transliterations.
  The exact normalized spelling and every letter value are displayed. Unsupported
  characters, digits or non-Latin scripts cause a clear validation message;
  they are never silently removed to create a partial reading.
- **Lo Shu** remains the existing Chinese cultural/mathematical study with a
  modern Gregorian birthday-digit overlay. Its digit root reduces master numbers
  and is explicitly distinct from Life Path. No strength/defect score is assigned
  to repeated or absent digits. See [BIRTHDAY-INSIGHTS.md](BIRTHDAY-INSIGHTS.md).

## Interaction and data

`numerology-engine.js` is pure and usable in Node tests; `numerology.js` attaches
the UI to the birthday numbers panel. A view, selected number, date and optional
name are held only in page memory. No name is saved to storage or transmitted.
Editing the name clears the previous reading; toggling a Y recalculates an open
reading. Resubmitting birthday details recreates the component with its page
state, updating all calculations (including Maturity). AbortController detaches
old listeners. Existing birthday storage behavior is unchanged.

The Numerology tab can also be opened with `#birthday-numbers`. Keyboard users
can select every number, year, month and Lo Shu cell. Focus remains on the
selected control after updating a report. Native hidden panels, labeled inputs,
pressed-state buttons and short status regions support assistive technology.

## Verification

Run `node --test tests/*.test.cjs`. Ten numerology tests cover published worked
examples, master-number differences, strict dates, invalid inputs, calendar-year
rollover, full year/month consistency, leap-day clamping, independent name sums,
per-Y choices, empty groups, transliteration and unsupported-character handling.

Browser checks cover the birth reports and calculation traces, year/month/day
navigation, invalid dates, name edits and per-Y changes, existing Lo Shu selection,
state preservation after a birthday edit, keyboard focus, and phone/desktop layout.
