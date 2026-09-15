# C4a Numerology depth: karmic debt, karmic lessons, hidden passion, and saving

Date: 2026-09-14. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C4.

## C4 is four sub-projects, and this is the first

| Sub-project | Features | Needs |
|---|---|---|
| **C4a, this spec** | Karmic debt, karmic lessons, hidden passion; numerology becomes saveable | The existing studio; the `numerology` kind already exists server-side |
| C4b | Lenormand Grand Tableau, geomantic house chart | Two new journal kinds, so a migration and a backend-first deploy |
| C4c | Playing-card cartomancy | A new kind, 52 vector cards and 52 pieces of original copy |
| C4d | I Ching line texts | 384 original paragraphs in eight batches |

C4a goes first because it needs no backend change. `kinds.py` already registers `numerology`, and
nothing calls `Rooms.register` for it.

## Decisions

Every decision here is mine. Glenn asked for C4 to be completed, which I read as the unattended
mode he set for C3. Each decision is recorded with its cost if wrong.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Karmic debt detection | 13, 14, 16 or 19 appearing anywhere in a number's reduction chain as this site computes it: Life Path from its component sum, Birth Day from the day, and Expression, Soul Urge and Personality from their letter totals | Some numerologists also check the unreduced full-date sum; a reader comparing sites may see a debt here that another site omits, or the reverse |
| Where debt is shown | Birth numbers for Life Path and Birth Day; Name reading for the three name numbers | None |
| Name-based extras | Pythagorean only. The Chaldean view says so, because Chaldean assigns no letter to 9 and has no lesson tradition of its own | A Chaldean reader sees no lessons |
| Karmic lessons | Digits 1–9 with no letter carrying that value in the entered name | None; this is the standard definition |
| Hidden passion | The digit or digits carried by the most letters, with ties all shown with their count | Some sources break ties; this site does not |
| Copy | Original reflective copy for the four debts, the nine lessons and the nine passions. "Karmic" is named as the tradition's word, never as a claim about past lives or deserved outcomes | None |
| What saves | Birth date, the reading's tab and view choices, and, when read, the name with its Y choices and system and the partner date | A reader who expects only the birth date to save also saves the name; the save note says so first |
| Summary | `Life Path N`, plus `· name reading` when a name was read. The name itself never appears in the summary | None |
| Opening a saved reading | The studio re-renders for the saved birth date and choices, with a line saying it is a saved reading and that the profile is unchanged. The next profile change returns the studio to the profile | A reader expecting the profile to change sees it unchanged |

### Karmic debt

```
debt(number) = the first value in number.steps that is 13, 14, 16 or 19, else none
```

`reduce` already records `steps`. Birth Day 13 gives `[13, 4]` and so carries debt 13/4. A Life
Path whose components sum to 19 gives `[19, 10, 1]` and carries debt 19/1. A name total of 67 gives
`[67, 13, 4]` and carries debt 13/4.

### Karmic lessons and hidden passion

Both use the Pythagorean letter values the name profile already carries.

```
counts[d]     = number of letters with value d, for d in 1..9
lessons       = [d for d in 1..9 if counts[d] == 0]
passion       = {digits: [d with counts[d] == max(counts)], count: max(counts)}
```

## Architecture

- **`numerology-engine.js`** gains `KARMIC_DEBTS`, `karmicDebt(result)`, `letterCounts(profile)`,
  `karmicLessons(profile)` and `hiddenPassion(profile)`. All are pure. Name functions return `null`
  for a Chaldean or not-ready profile.
- **`numerology.js`**:
  - Renders a karmic debt block in Birth numbers when a birth number carries one. Renders debts,
    lessons and passion in the Pythagorean name reading, with original copy.
  - Exports pure `snapshot(state, birth)` and `restore(payload)` for the journal payload.
  - Registers the `numerology` room: `current()` from the attached studio; `load()` re-attaches
    with the saved date and choices.
  - Adds a save control under the studio footnote, with a note that saving stores the name when a
    name reading is open.

## Testing

- **Engine** (`tests/numerology.test.cjs`):
  - Debt found for Birth Day 13, 14, 16 and 19, and not for 31.
  - A hand-built Life Path 19/1 (1989-10-09).
  - A name total that passes through 13.
  - Lessons and passion checked against hand-counted names, including a tie.
  - Chaldean profiles return `null`.
- **Snapshot and restore:**
  - A round trip preserves every saved field.
  - `restore` rejects a malformed birthday, clamps unknown tabs to defaults, caps the name at 120
    characters, drops Y indices beyond the name, and returns `null` for a non-object.
- **Copy:** every debt, lesson and passion entry exists and passes a scan for predictive and fatalist
  language (`punish`, `deserve`, `past life`, `curse`, `doomed`, `you will`, `luck`, `fortune`).

Browser verification:
- The Birth numbers block appears only for a debt birth date.
- The name reading shows lessons and passion in Pythagorean mode and a note in Chaldean mode.
- Save while signed out opens sign-in.
- `?reading=` opening restores the saved view.
- 390px and 1400px layouts hold.

## Files

| File | Change |
|---|---|
| `numerology-engine.js`, `numerology.js`, `numerology.css` (or the studio's stylesheet) | Modify |
| `numerology/index.html` | Modify: cache keys |
| `tests/numerology.test.cjs` | Modify |
| `tests/pages.test.cjs` | Modify if `numerology.js` gains a bare read of `Rooms` |
| `docs/NUMEROLOGY.md` | Modify |

## Out of scope

Karmic debt for Maturity, Attitude, pinnacles or cycles. Chaldean lessons. The second person's name.
Any backend change.

## Constraints

Part E of the program spec binds unchanged. The Save button's note says a saved name is stored on
the server, as the program spec requires.
