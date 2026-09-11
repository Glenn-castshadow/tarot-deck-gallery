# Numerology completion: Life arcs, Two paths, Chaldean names

Date: 2026-09-11. Branch: numerology-completion. Author: Claude, working unattended on
Glenn's instruction "finish the numerology and Chinese traditions section" (2026-09-11).
Glenn approved the split into two sub-projects (numerology first, then Chinese traditions)
by asking for the work to run unattended. Every convention below is attributed.

## Goal

Close the three numerology items still open on the site's feature list: Pinnacles and
Challenges, numerology compatibility, and Chaldean name numerology. All three live in the
existing numerology studio (`numerology-engine.js`, `numerology.js`, `numerology.css`), keep
its voice ("symbolic practice for reflection, not measurement or prediction"), and keep its
data rule (birth dates and names stay in page memory; nothing new is stored or sent).

| Constraint | Source |
|---|---|
| Original interpretive copy only; sources cited for calculation methods, never for prose | Codebase convention (docs/NUMEROLOGY.md) |
| No compatibility score, ranking or verdict for two people | Codebase convention (synastry: "These are not compatibility scores") |
| Nothing new persisted; second person's date and any name stay in page memory | Codebase convention (docs/NUMEROLOGY.md "Interaction and data") |
| Pure engine testable in Node, UI attached separately, state survives re-attach | Codebase structure |
| Cache-bust `?v=` keys bumped on every changed JS/CSS file | Codebase convention (index.html) |
| Open-source libraries only, and none are needed here | Glenn's global rule; my judgement that no library applies |

## Studio layout after this work

Tabs: **Birth numbers · Life arcs · Personal cycles · Name reading · Two paths · Lo Shu**.
Six tabs: the desktop grid becomes `repeat(6, minmax(0,1fr))` at wide widths and
`repeat(3, …)` between 700px and 1000px; the existing 2-column phone rule stays. (Mine.)

State keys added to the page-memory state object and preserved across re-attach:
`arc` (selected pinnacle 0–3), `arcView` ('pinnacle'|'challenge'),
`nameSystem` ('pythagorean'|'chaldean'), `partnerDate` (ISO string or ''),
`partnerRead` (boolean), `pairView` ('a'|'b'|'together').

## 1. Life arcs: Pinnacles and Challenges

### Conventions (mine, following the modern Pythagorean method the studio already uses)

Let `m`, `d`, `y` be the birth month, day and year each reduced to a single digit 1–9.
Master intermediate values are reduced to their root for this arithmetic (a 22nd day
contributes 4), because differences of master numbers have no conventional meaning and
pinnacle sums are traditionally formed from single digits.

- Pinnacle 1 = reduce(m + d), Pinnacle 2 = reduce(d + y), Pinnacle 3 = reduce(P1 + P2),
  Pinnacle 4 = reduce(m + y). `reduce` keeps 11, 22 and 33 (`keepMasters = true`).
  P3 is formed from the *values* of P1 and P2, masters included (an 11 stays 11 in the sum).
- Challenge 1 = |m − d|, Challenge 2 = |d − y|, Challenge 3 = |C1 − C2|, Challenge 4 = |m − y|.
  Results are 0–8; 0 is a legitimate challenge with its own text, not an error.
- Period boundaries: the first pinnacle runs from birth through age
  `36 − root(LifePath)` (root reduces 11/22/33 to 2/4/6). The second and third each last
  nine years; the fourth runs for the rest of life. Challenges share the same four periods.
- A period is expressed in ages and in calendar years (`birthYear + age`). "Current" is
  determined from the reader's age at their most recent birthday on the local date, using
  the same `localToday()` the cycles tab uses. No period is highlighted for dates before
  birth; all four remain explorable at any age.

Reference for the method (calculation only): Hans Decoz's published pinnacle and challenge
descriptions at worldnumerology.com. Any worked example in tests is hand-derived from the
rules above and says so.

### Engine API

`arcs(birth)` returns
`{components:{month,day,year}, pinnacles:[{index, number:reduceResult, fromAge, toAge|null, fromYear, toYear|null, calculation:string}], challenges:[{index, number:int 0..8, fromAge, toAge|null, fromYear, toYear|null, calculation:string}], firstPeriodEnd:int}`.
`currentArc(arcs, todayISO)` returns the index 0–3 of the period containing the reader's
current age, or -1 before the birth date. Both are pure and throw `RangeError` on bad input.

### UI

The tab shows a four-column timeline (one column per period, stacked on phones) with the
pinnacle number, the challenge number, the age range and the years. The current period is
marked "now". Below, a pressed-state toggle switches the reading between *Pinnacle* and
*Challenge* for the selected period. Pinnacle readings reuse the existing `themes` prose
with a new one-sentence `arcLens` per number (1–9, 11, 22, 33) explaining how the theme reads
as a life chapter. Challenge readings use new original prose for 0–8: title, keywords, a
paragraph, and a prompt. Each reading shows its calculation trail as the other tabs do.

## 2. Two paths: numerology for two people

### Conventions (mine)

The reader enters a second person's birth date (page-only, `type=date`, min 0001-01-01,
max today). The engine computes both people's Life Path, Birth Day and Attitude with the
existing `birthday()` function. The pairing commentary is composed, not scored, from:

- Each Life Path's **relating style**: new original prose for 1–9, 11, 22, 33 describing
  how that number tends to enter a relationship of any kind (title, paragraph, prompt).
- **Concord**: the traditional Pythagorean grouping of Life Paths into three concords,
  {1, 5, 7} mind, {2, 4, 8} practical, {3, 6, 9} expressive, evaluated on roots. Two numbers
  in the same concord get the "shared ground" note; different concords get the "different
  languages" note. Master numbers are placed by root and the copy says so.
- **Same number**: a specific note when both roots match.
- **The pair's own number**: reduce(LifePath A value + LifePath B value), masters kept,
  read through the existing `themes` prose with a one-line "as a pair" lens.
- **Cycle alignment**: both people's current Personal Year (calendar-year method) shown side
  by side with a short note when they match, are adjacent, or are far apart.

Nothing produces a percentage, rating, verdict or advice to pursue or avoid a relationship.
The section wording is "two people", never "partners" alone.

### Engine API

`pair(birthA, birthB, todayISO)` returns
`{a:{path,birthDay,attitude,year}, b:{…}, concord:{a:string, b:string, same:boolean}, sameRoot:boolean, pairNumber:reduceResult, yearRelation:'same'|'adjacent'|'apart'}`.
Pure; throws `RangeError` on bad input.

### UI

A small form (date input plus "Compare paths" button) and a three-way pressed-state
selector: *Your path · Their path · Together*. The two single views show the relating
style for that person; *Together* shows concord, same-number, pair number and cycle
alignment notes. The tab header states that the other person's date stays on this page.
Resubmitting the reader's own birthday keeps the second date (state is preserved as elsewhere).

## 3. Chaldean name reading

### Conventions (mine, following the Chaldean table as published by Cheiro)

Letter values: A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7.
No letter is 9. Chaldean practice reads the name a person actually uses day to day, and the
UI says so, while still accepting any spelling.

- The **compound number** is the unreduced sum of all letter values, shown as the primary
  result together with its single-digit **root** (plain digit sum, no master numbers:
  Chaldean has no 11/22/33 convention, and the UI says so).
- Compound numbers 10–52 each have original prose (title, keywords, paragraph, prompt).
  A compound above 52 is reduced once by digit sum; if that lands in 10–52 it is read as
  that compound, otherwise as its single digit. Compound numbers 1–9 read as the single digit.
- Each word of the name also gets its own compound and root, listed in a table.
- Vowel/consonant splits and the Y choices are Pythagorean features and are hidden when the
  Chaldean system is selected. Expression, Soul Urge, Personality and Maturity cards are
  replaced by a single *Name number* card plus the per-word table.

Reference (table only): Cheiro, *Cheiro's Book of Numbers*, as reproduced widely; no prose
is taken from it.

### Engine API

`nameProfile(name, yVowels, birth)` gains an optional fourth argument
`system = 'pythagorean' | 'chaldean'`. With `'chaldean'` it returns
`{status:'ready', system:'chaldean', normalized, letters:[{letter,value,word}], compound:int, reading:{compound:int, root:int, readAs:int}, words:[{word, compound, root}]}`.
`normalizeName` is unchanged. The existing Pythagorean shape is unchanged (default).

### UI

A pressed-state pair *Pythagorean · Chaldean* above the name form. Switching systems
recalculates an already-read name immediately. Chaldean results show the compound number
large, the root small, the reading for `readAs`, the letter-by-letter trail, and the word
table. The methods footnote gains the Chaldean table and the "name you use" convention.

## Data and privacy

No new storage keys. No network. The second person's date and any name exist only in the
studio's page state. The consent banner text and cookie-policy.html need no change because
nothing optional is written.

## Error handling

- Engine functions throw `RangeError` with a human sentence; the UI shows it in the tab's
  `role="status"` element, as the cycles tab does.
- Second-person dates before year 1, after today, or malformed show a validation message;
  nothing renders until valid.
- Chaldean rejects the same unsupported characters as Pythagorean, via `normalizeName`.

## Testing

`tests/numerology.test.cjs` grows by roughly nine tests:

1. Pinnacle and challenge arithmetic on a hand-derived date, including a 0 challenge and a
   master-number pinnacle formed from P1 + P2.
2. Period boundaries for Life Paths 1, 9 and 11 (first period ends at 35, 27 and 34).
3. `currentArc` before birth, in each of the four periods, and exactly on a boundary birthday.
4. Pair concords for same-concord, cross-concord and same-root cases; master numbers placed
   by root; pair number keeps masters.
5. Personal Year relation same/adjacent/apart, including the 9→1 wrap counted as adjacent.
6. Chaldean letter table sums for a name with every letter A–Z; a word table.
7. Compound reduction above 52 landing inside and outside 10–52.
8. Chaldean hides masters (a sum of 11 reads as compound 11, root 2, no master flag).
9. Invalid inputs throw for every new function.

Browser checks (manual, recorded in docs/NUMEROLOGY.md): six tabs at 1400px and 390px,
timeline stacking, current-period marker, system toggle recalculating an open name,
second-person validation, state preserved after a birthday resubmit, keyboard focus staying
on the pressed control.

## Documentation

docs/NUMEROLOGY.md gains three convention sections mirroring the ones above, the new state
keys, and the test list.

## Out of scope

- Saving numerology readings to the account journal (no numerology reading is saveable today).
- Any relationship "score", or a second person's name reading.
- Chaldean birth-date readings (Chaldean is applied to names only here).
