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
- **Karmic debt** marks a number whose reduction passes through 13, 14, 16 or
  19: the tradition's four karmic debt numbers. This page looks along each
  number's own reduction as this site computes it — Life Path from the sum of
  its month, day and year components, Birth Day from the day itself — so a
  component sum of 19, as in 1989-10-09 (month 1 + day 9 + year 9 = 19 → 10 →
  1), carries debt 19/1, and a Birth Day of 13 carries debt 13/4. Some
  numerologists instead check the unreduced sum of the whole date, so another
  source may find a debt here that this page does not, or the reverse. A
  debt block appears in Birth numbers only when Life Path or Birth Day
  carries one, reading the debt as a recurring question rather than a
  verdict.
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
- **Karmic debt, karmic lessons and hidden passion** extend the Pythagorean
  name reading. Karmic debt follows the rule above, checked along Expression,
  Soul Urge and Personality's own reduction from their letter totals: DI
  (D4 + I9 = 13 → 4) carries debt 13/4 for Expression. Karmic lessons are the
  digits 1–9 that no letter in the entered name carries at all. Hidden
  passion is the digit or digits carried by the most letters; when several
  digits tie for the most letters, every tied digit is shown with its count,
  and when no digit repeats (the highest count is one), a plain sentence
  replaces the passion copy instead of naming a value. All three are
  Pythagorean only — Chaldean assigns no letter to 9 and has no lesson
  tradition of its own — so switching to Chaldean replaces the section with a
  note that the Pythagorean system shows this name's debt, lessons and
  passion. These follow modern Pythagorean numerology; the studio footer's
  "Traditions, methods & sources" disclosure cites Hans Decoz's World
  Numerology pages on
  [karmic debt numbers](https://www.worldnumerology.com/numerology-karmic-debt-numbers/),
  [karmic lessons](https://www.worldnumerology.com/numerology-karmic-lessons/)
  and [hidden passion](https://www.worldnumerology.com/numerology-hidden-passion/).
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
name are held only in page memory. Neither the name nor a second person's
birth date reaches storage or leaves the page during ordinary browsing;
saving a reading to the journal is the one explicit action that transmits the
name (see "Saving a reading" below). Editing the name clears the previous
reading; toggling a Y recalculates an open reading. Resubmitting birthday
details recreates the component with its page state, updating all
calculations (including Maturity). AbortController detaches old listeners.
Existing birthday storage behavior is unchanged.

The page-memory state object also holds `arc` (the selected life-arc period,
0–3), `arcView` ('pinnacle' or 'challenge'), `nameSystem` ('pythagorean' or
'chaldean'), `partnerDate` (the second person's birth date, or '' when none
has been entered), `partnerRead` (whether that comparison has been submitted),
and `pairView` ('a', 'b' or 'together'). All six survive a birthday resubmit
the same way the earlier state keys do. Like the reader's own name, the
second person's date leaves page memory only when the reader saves the
reading (see "Saving a reading" below).

The Numerology studio can also be opened directly with `/numerology/#birthday-numbers`. Keyboard users
can select every number, year, month and Lo Shu cell. Focus remains on the
selected control after updating a report. Native hidden panels, labeled inputs,
pressed-state buttons and short status regions support assistive technology.

## Saving a reading

`numerology.js` registers a `numerology` room with `Rooms.register`, alongside
the `numerology` reading kind already defined server-side
(`server/ishtar/readings/kinds.py`). A save control sits under the studio's
footnote, labelled to open sign-in when the reader is signed out and to save
the reading when they are signed in.

`Numerology.snapshot(state, birth)` builds the journal entry from the
attached studio's own state (the room's `current()`). The payload always
holds the birth date, the open tab, and the view choices for every tab
(`core`, `period`, `arc`, `arcView`, `pairView`, `nameSystem`, `nameKind`),
plus the explored cycle date. When a name reading is open — the reader has
read a name and the studio can read it (`normalizeName` status `ready`, so a
blank name or one such as "R2D2" does not count) — the payload also holds
that name (capped at 120 characters) and its Y-vowel choices. When a partner
comparison has been read and its date parses, the payload holds the
partner's birth date too. A typed-but-unread name or an unsubmitted partner
date is never saved. The summary is always `Life Path N` (with its root for a
master number), with ` · name reading` appended when a name was saved; the
name itself never appears in the summary. The entry's `layout` is the open
tab's visible label ("Birth numbers", "Life arcs", "Personal cycles", "Name
reading", "Two paths" or "Lo Shu"); `restore` reads `payload.tab` and never
`layout`.

Before the reader saves, a note beside the save control
(`Numerology.render.saveNote`) says what saving stores beyond the birth date,
and is hidden when that is nothing. It is re-rendered whenever the name
reading or the partner comparison changes:

- name only: "Saving includes the name you entered. It is stored on our server
  with the reading."
- partner date only: "Saving includes the other person’s birth date you
  entered. It is stored on our server with the reading."
- both: "Saving includes the name and the other person’s birth date you
  entered. Both are stored on our server with the reading."

`Numerology.restore(payload)` reverses the snapshot for the room's `load()`.
It returns `null` for anything that is not an object, or whose birth date
does not parse. Otherwise it clamps every view choice to one of its allowed
values, falling back to the studio's own defaults for anything unrecognised,
caps a restored name at 120 characters, and keeps only the Y-vowel indices
that still fall inside that name. A restored partner date that does not
parse is dropped.

Opening a saved reading re-attaches the studio for the saved birth date and
view choices, with a status line above the studio reading "Showing a saved
reading for [date]. Your birth profile is unchanged." The saved reading stays
pinned — a birth-profile notification that repeats the same saved date is
ignored — until either the birth date genuinely changes or the reader
resubmits the birth-date form. Submitting the form is treated as a genuine
profile change even when the date is unchanged: a capture-phase `submit`
listener on `#birthday-form` releases the pin before the form's own handler
runs, so the profile notification that follows already sees it released. In
either case the studio returns to the reader's own state from before the
saved reading was opened, not to the saved reading's name or partner date.

## Verification

Run `node --test tests/*.test.cjs`: 529 tests pass, 0 fail. Of those,
`node --test tests/numerology.test.cjs` runs 27 numerology tests covering
published worked examples, master-number differences, strict dates, invalid
inputs, calendar-year rollover, full year/month consistency, leap-day clamping,
independent name sums, per-Y choices, empty groups, transliteration and
unsupported-character handling, pinnacle/challenge arithmetic hand-derived from
single-digit components (including a 0 challenge and a master-number Pinnacle
3), the first-period boundary for several Life Paths, `currentArc` across
periods and at a boundary birthday, two-path concords/same-root/pair-number/
personal-year-relation cases, the Chaldean letter table with per-word
compounds and no master numbers, and Chaldean compound copy coverage for
10–52, plus eleven added for karmic debt, lessons, hidden passion and saving:
debt found for a Birth Day of 13, 14, 16 or 19 and not for a non-debt day; a
hand-built Life Path 19/1 (1989-10-09) and a name total that passes through
13; lessons and hidden passion checked against hand-counted names, including
a two-way tie (ANNA) and a value carried by three letters (ELEANOR); Chaldean
name profiles returning `null` for letter counts, lessons and passion; every
karmic debt, lesson and passion copy entry present and free of predictive or
fatalist language; the birth and name karmic-debt, lessons and passion blocks
rendering only when there is something to show, and only under Pythagorean; a
snapshot/restore round trip preserving every saved field, including that an
unread name, an unreadable name ("R2D2") or an unsubmitted or unparseable
partner date is never saved and never reaches the summary, and that the
layout is each tab's visible label while `restore` reads `payload.tab`; the
save note's wording for a name, a partner date, both, and neither; the
rendered birth and name karmic blocks, the Chaldean note, all three save
notes and the saved-reading banner scanned for predictive or fatalist
language and straight apostrophes; `restore` rejecting a malformed birthday, clamping unknown tab
and view choices to their defaults, capping a restored name at 120
characters, and dropping Y indices beyond that name; and the saved-reading
pin state machine, including release on a birth-form resubmit.

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
