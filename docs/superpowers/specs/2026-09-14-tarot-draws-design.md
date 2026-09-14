# C2b Tarot: three new draws and two reading options

Date: 2026-09-14. Status: design, awaiting Glenn's review.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C2.
Sibling: `docs/superpowers/specs/2026-09-13-tarot-reference-design.md` (C2a, shipped).

## Purpose

C2a gave every card an entry that stands on its own. This finishes C2 by adding ways to draw:
a single card held against a question, a seven-card relationship spread, a thirteen-card year
ahead, and two options that change how a deal is made.

## What C2a already built that this uses

`tarot-reference.js` and its 78 entries, the voice gate at `tests/tarot-voice.test.cjs`, and the
Card reference tab. None of them change here. The reference entries are not shown in a spread,
which continues to render the reading copy; the two bodies of text stay separate, and the test
that keeps them apart stays in force.

## Decisions

| Decision | Choice | Source |
|---|---|---|
| The one-card draw states no yes, no no, and no lean | It presents what the question looks like from here | Glenn, 2026-09-14 |
| Year-ahead starts the month after the reading | Not the birth month, not January | Glenn, 2026-09-14 |
| Options apply to spreads and the new draw, not the daily card | The daily card keeps its date-seeded behaviour | Glenn, 2026-09-14 |
| The one-card draw is a spread, not a room | No new journal kind, no migration, no backend change | This spec, see Architecture |
| New spread copy is not given an invented lineage | Both new multi-card spreads are modern arrangements and say so | This spec |

### Why the lean was dropped

The program spec specified a yes/no draw stating an upright or reversed lean. Reversals in this
codebase are one in five, so an orientation-based lean would have said "leans toward" about
eighty per cent of the time. That is a loaded coin presented as a reading, and no amount of
careful wording around it makes the mechanism honest. Raising the reversal rate to even odds for
this one draw would have been honest and would have made the feature an explicit coin flip, which
is the one thing this site's voice most consistently refuses.

So the draw keeps its shape and loses its verdict: one card, an optional clarifier, and the
reader's question held against them.

## Architecture

### The one-card draw is a spread, not a room

Without a lean, the draw is mechanically a two-position deal: a card, and a clarifier the reader
may or may not turn over. The existing spread machinery already deals every card at once and
reveals progressively, so this needs no new code path.

**This removes the entire server side of C2b.** The program spec assigned it the journal kind
`tarot-yesno`, which does not exist in `server/ishtar/readings/kinds.py` and would have required
a fifth migration and a two-stage deploy with the backend first. But a saved spread already
records which spread it was, in its `layout` field, alongside `kind: 'tarot-spread'`. A one-card
draw saves as an ordinary tarot spread whose layout is `question`.

**The `tarot-yesno` kind is withdrawn.** A kind string is permanent in the database, and
`tarot-yesno` would have been a lasting, misleading name for a draw that answers nothing. Nothing
in `kinds.py`, `rooms.js`, the migrations or the Django app changes in this sub-project. C2b is a
purely static release.

### Three new spreads

All three are added to the `spreads` table in `tarot-readings.js`, in the existing shape:
`{name, subtitle, shape, description, tradition, pairs, advice, outcome, positions}`, with each
position built by the existing `position(name, short, x, y, lens, question, role)` helper.

**One card and a question** — `question`, two positions.

| # | Position | Short |
|---|---|---|
| 1 | The card | Your card |
| 2 | A clarifier | Clarifier |

The second position is dealt with the first and revealed only if the reader asks for it. The page
says so, because a reader who never turns it over should know a card was set aside rather than
drawn later. `advice: 0`, `outcome: 1`, one pair joining them.

**Relationship** — `relationship`, seven positions, dealt into two facing columns with the
connection between them.

| # | Position | Short |
|---|---|---|
| 1 | You in this | You |
| 2 | The other person in this | Them |
| 3 | The connection itself | Between |
| 4 | What helps it | Helps |
| 5 | What strains it | Strains |
| 6 | An approach to try | Advice |
| 7 | Where it tends | Tendency |

`advice: 5`, `outcome: 6`. Positions two and five carry the standing constraint that a card
cannot report another person's private thoughts, which the Celtic Cross's environment position
already states and which matters more here than anywhere else in the deck.

**Year ahead** — `year`, thirteen positions: the year's theme at the centre, twelve months in a
wheel around it.

Position one is the theme, so the reveal begins at the centre. Positions two through thirteen are
the twelve months beginning with the month after the reading, running clockwise from the top.
`advice: 0`, `outcome: 12`.

**The year spread is the only one whose meaning depends on when it was dealt, so it adds one
field to the payload.** `deal` returns `{id, question, focus, cards}` today. For this spread it
also returns `dealtAt`, the local date key of the deal, and the month labels are computed from
that rather than from the clock at render time. Without it a reading saved in March and reopened
in September would silently relabel every card.

This has three consequences the implementation must handle together:

- `validDraw` must accept `dealtAt` when the spread is `year` and require it there, while
  continuing to accept the existing three spreads that do not carry it. A missing `dealtAt` on a
  year draw is invalid, not merely unlabelled.
- `loadSpread` must carry `dealtAt` through into the replayed spread, since it is what the
  labels are drawn from.
- The daily card payload already stores a `date`, so a date in a payload is an established
  pattern here rather than a new one.

### Sourcing, stated honestly

The Celtic Cross cites Waite's *Pictorial Key*; the Horseshoe says conventions vary and names the
variation used. Neither new multi-card spread has a canonical source, because both are modern
arrangements. Their `tradition` lines say that plainly rather than inventing a lineage. The
one-card draw is not a tradition at all and its line says what it is: a single card held against
a question, with a second card available if the first does not land.

### Two options

`deal` currently takes `(id, cards, randomInt, question, focus)`. It gains one further argument,
an options object, rather than two more positional parameters:

```
deal(id, cards, randomInt, question, focus, {reversals = true, majorsOnly = false} = {})
```

- **Reversals**, default on at the existing one in five. Off makes every dealt card upright.
- **Major Arcana only**, default off. On restricts the pool to card indices 0 to 21, which are
  already exactly the Major Arcana, so the stored indices stay globally correct and no saved
  payload needs a schema thought.

Both are page-only state with no storage, matching the program spec. Neither touches the daily
card, which stays seeded by date so that today's card is the same card all day and does not move
when a toggle is flicked.

The smallest pool a spread can be dealt from is twenty-two, and the largest spread is thirteen, so
Major-only never starves a deal. The existing guard in `deal` that refuses an incomplete deck
stays as it is.

### Layout

Each spread's `shape` selects a CSS class, `tarot-layout-<shape>`, which sets the layout's
aspect ratio and card width; positions are placed by the `--x` and `--y` percentages they carry.
Three new blocks are added, one per spread. The year wheel is the widest and relies on the
existing horizontal scroll and Enlarge control, which already serve the Celtic Cross.

The dealing animation staggers by 110ms per card, so thirteen cards take about 1.4 seconds to
land. Reduced motion already disables the stagger, so nothing further is needed.

### Saved readings

A reading saved from a new spread cannot be replayed by an older cached copy of the page:
`validDraw` rejects an unknown spread id and the room shows its existing "cannot be replayed"
message. That is the behaviour the foundation spec chose for exactly this case, not a new problem.

Replay itself is unaffected by the options, since a saved payload carries the card indices and
orientations that were actually dealt.

## Testing

Extending `tests/tarot-readings.test.cjs`, which already covers the three existing spreads:

- Each new spread deals its exact position count, without replacement, with valid orientations,
  and reaches every card across many seeds.
- Position geometry: the relationship spread's two columns face each other and the connection sits
  between them; the year wheel's twelve months are equidistant from the centre and run clockwise
  from the top; the theme is at the centre.
- `advice` and `outcome` are in range for every spread, including the three existing ones.
- Reversals off yields no reversed card across many seeds, where the default yields both.
- Major-only yields no card index above 21 across many seeds, and still fills a thirteen-card
  spread.
- Options default to the existing behaviour when the argument is omitted, so the three existing
  spreads deal exactly as they did.
- `validDraw` accepts a draw from each new spread and rejects one whose card count does not match.
- `validDraw` rejects a year draw with no `dealtAt`, and still accepts celtic, horseshoe and
  three draws that have none. The second half matters more than the first: it is what stops this
  change invalidating every reading already saved.
- The year spread's month labels come from the stored `dealtAt`, not from today. The test pins
  this by building a draw dated in one month and asserting the labels of another.

`tests/tarot-voice.test.cjs` extends over the new spread copy: descriptions, tradition lines,
position lenses and questions.

Browser verification: each new spread deals, reveals in order and by position button, and enlarges;
the year wheel shows twelve month labels starting with next month; the options change what is
dealt; saving and reopening a reading from each new spread round-trips; the layout holds at 390px
and 1400px.

## Files

| File | Change |
|---|---|
| `tarot-readings.js` | Modify. Three spreads, the options argument to `deal`. |
| `tarot-readings.css` | Modify. Three layout blocks. |
| `tarot.js` | Modify. Options controls, passing them to `deal`, month labels for the year wheel. |
| `tarot/index.html` | Modify. Three spread options, the two toggles, cache keys. |
| `tests/tarot-readings.test.cjs` | Modify. |
| `tests/tarot-voice.test.cjs` | Modify. |
| `docs/FULL-READINGS.md` | Modify. The three new layouts and the two options. |
| `docs/deployment.md` | Modify at deploy time. |

## Out of scope

Custom user-defined spreads, deck creation and card-of-the-day notifications, all of which the
program spec puts outside C2. Any change to the Django app, the journal kinds, or `rooms.js`.
Showing reference entries inside a spread reading.

## Constraints

Part E of the program spec binds unchanged: no new dependencies, pure UMD engines tested under
`node --test`, an About disclosure naming conventions and sources, a copy test for forbidden
phrasing, keyboard operable and reduced-motion respecting, verified at 390px and 1400px, cache
keys bumped on every changed file, docs updated, and commits ending with the co-author line.
