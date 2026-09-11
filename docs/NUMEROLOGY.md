# Numerology studio

The former Numbers & Lo Shu birthday perspective is now **Numerology**, with
six views: Birth numbers, Life arcs, Personal cycles, Name reading (Pythagorean
or Chaldean), Two paths, and the existing Lo Shu study. A birth date is
sufficient; birth time and location are not used here. The visual design
continues the celestial atlas's ink, gold and teal palette.

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
- **Life arcs (Pinnacles and Challenges)** first reduce the birth month, day and
  year to single digits (`m`, `d`, `y`; an 11/22/33 day or year contributes its
  root). Pinnacle 1 = reduce(m + d), Pinnacle 2 = reduce(d + y), Pinnacle 3 =
  reduce(Pinnacle 1 + Pinnacle 2), Pinnacle 4 = reduce(m + y); each reduction
  keeps 11, 22 and 33, and Pinnacle 3 is formed from Pinnacle 1 and 2's values
  with any master included. Challenge 1 = |m − d|, Challenge 2 = |d − y|,
  Challenge 3 = |Challenge 1 − Challenge 2|, Challenge 4 = |m − y|; results run
  0–8, and 0 is a legitimate challenge with its own reading, not an error. The
  first period runs from birth through age 36 minus the Life Path root (11/22/33
  reduce to 2/4/6 for this subtraction only); the second and third periods each
  last nine years; the fourth runs for the rest of life. Challenges share the
  same four periods. The current period is the one containing the reader's age
  at their most recent birthday on the local date; no period is highlighted
  before birth, though all four remain explorable at any age. Reference
  (calculation only): Hans Decoz's published pinnacle and challenge method at
  worldnumerology.com.
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
- **Chaldean** is a second name-value system, chosen as an alternative to
  Pythagorean within Name reading. Its letter values are A1 B2 C3 D4 E5 F8 G3
  H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7; no letter is 9. The
  compound number is the unreduced sum of all letter values, shown with its
  single-digit root — a plain digit sum, since Chaldean has no 11/22/33
  convention and the UI says so. Compounds 1–9 read as the single digit;
  compounds 10–52 each have their own original prose; a compound above 52 is
  reduced once by digit sum and then read as that value if it lands in 10–52,
  or as its single digit otherwise. Each word of the name also gets its own
  compound and root, listed in a table. Vowel/consonant splits and the Y
  choices are Pythagorean-only and are hidden under Chaldean. Chaldean
  practice traditionally reads the name a person actually uses day to day,
  and the UI says so, while still accepting any spelling. Reference (table
  only): Cheiro, *Cheiro's Book of Numbers*, as reproduced widely; no prose is
  taken from it.
- **Two paths** takes a second person's birth date, held only in page memory,
  and computes their Life Path, Birth Day and Attitude with the same
  `birthday()` function used for the reader. Concord groups Life Paths by root
  into three traditional Pythagorean sets — {1, 5, 7} mind, {2, 4, 8} practical,
  {3, 6, 9} expressive — with a "shared ground" note for a shared concord, a
  "different languages" note across concords, and its own note when both roots
  match. Master numbers are placed by root (11/22/33 → 2/4/6). The pair's own
  number is reduce(Life Path A's value + Life Path B's value), keeping masters,
  read through the existing theme prose with an "as a pair" lens. Cycle
  alignment compares both people's current Personal Year (calendar-year
  method): the years are "same" at distance 0, "adjacent" at distance 1
  (including the 9→1 wrap, a distance of 8), and "apart" otherwise. No
  percentage, rating, verdict, or advice to pursue or avoid a relationship is
  produced; the section speaks of "two people", never "partners" alone.
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

The page-memory state object also holds `arc` (the selected life-arc period,
0–3), `arcView` ('pinnacle' or 'challenge'), `nameSystem` ('pythagorean' or
'chaldean'), `partnerDate` (the second person's birth date, or '' when none
has been entered), `partnerRead` (whether that comparison has been submitted),
and `pairView` ('a', 'b' or 'together'). All six survive a birthday resubmit
the same way the earlier state keys do. The second person's date is never
saved to storage or transmitted, exactly like the reader's own name: it exists
only in page memory until the tab or page closes.

The Numerology tab can also be opened with `#birthday-numbers`. Keyboard users
can select every number, year, month and Lo Shu cell. Focus remains on the
selected control after updating a report. Native hidden panels, labeled inputs,
pressed-state buttons and short status regions support assistive technology.

## Verification

Run `node --test tests/*.test.cjs`: 138 tests pass, 0 fail. Of those,
`node --test tests/numerology.test.cjs` runs 16 numerology tests covering
published worked examples, master-number differences, strict dates, invalid
inputs, calendar-year rollover, full year/month consistency, leap-day clamping,
independent name sums, per-Y choices, empty groups, transliteration and
unsupported-character handling, plus six added for this work:
pinnacle/challenge arithmetic hand-derived from single-digit components
(including a 0 challenge and a master-number Pinnacle 3), the first-period
boundary for several Life Paths, `currentArc` across periods and at a boundary
birthday, two-path concords/same-root/pair-number/personal-year-relation cases,
the Chaldean letter table with per-word compounds and no master numbers, and
Chaldean compound copy coverage for 10–52.

Browser checks cover the birth reports and calculation traces, year/month/day
navigation, invalid dates, name edits and per-Y changes, existing Lo Shu selection,
state preservation after a birthday edit, keyboard focus, and phone/desktop layout.

Additional browser checks performed for Life arcs, Two paths and Chaldean name
reading (by DOM inspection, since the browser pane's screenshots rendered
blank in this environment):

- **Life arcs**: all four periods render, the current period is marked "now",
  the Pinnacle/Challenge toggle switches the reading, each reading's
  calculation trail is shown, keyboard focus lands on the selected control,
  the timeline stacks at 390px, and the tab grid shows two columns at 390px
  and three columns at 900px.
- **Two paths**: submitting a second date renders the comparison, all three
  views (Your path, Their path, Together) render, an invalid or future date
  produces the validation sentence, no score or percentage wording appears
  anywhere in the tab, and the layout fits at 390px.
- **Name reading**: switching from Pythagorean to Chaldean recalculates an
  already-open name reading without resubmitting the form, the Y fieldset is
  hidden under Chaldean and restored on switching back to Pythagorean, the
  per-word compound table renders, and the layout fits at 390px.
