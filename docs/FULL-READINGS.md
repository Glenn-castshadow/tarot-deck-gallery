# Full tarot readings

The reading room offers a stable daily card and three full spreads, using all
78 cards in each of the four illustrated decks. Cards are shuffled without
replacement using the application's existing crypto-backed random integer
function. Each has a one-in-five chance of being reversed, matching the existing
reading behavior. This probability is a product convention, not a historical rule.

## Layouts

- **Celtic Cross (10)**: present, crossing influence, crown/conscious aim,
  foundation, past, near future, self, environment, hopes/fears, possible outcome.
  The first six form the cross; the final four form a staff read bottom to top.
  Card two physically crosses card one. It retains its independently drawn
  orientation, explicitly stated in the reading. No separate significator is drawn.
- **Horseshoe (7)**: past, present, hidden influences, obstacle, outside influences,
  advice, possible outcome, dealt left to right into a U. Horseshoe conventions
  vary; this particular sequence is stated in the on-page layout guide.
- **Past, Present & Possibility (3)**: a horizontal line, preserving the former
  three-card option inside the expanded full reading.
- **The Relationship spread (7)**: you, the other person, the connection between
  you, what helps it, what strains it, an approach to try, and where it tends.
  This is a modern arrangement rather than an inherited one — seven-card
  relationship layouts vary from reader to reader and none is canonical, so
  this particular order is not attributed to anyone; it is stated on the page
  itself, in the on-page layout guide. It reads any bond, not only a romantic
  one: family, friendship, work, or a relationship with something that is not
  a person.
- **The Year Ahead (13)**: a theme at the centre, then one card for each of the
  twelve months that follow, arranged in a wheel. Like the Relationship
  spread, this is a modern arrangement with no canonical source; twelve-month
  wheels are common in contemporary practice but no particular order among
  them is authoritative, so this one is stated on the page rather than
  attributed to anyone. The wheel starts with the month **after** the reading,
  so it always covers the year in front of the reader rather than the one
  already under way. The date the reading was dealt on is stored with the
  saved draw (`dealtAt`, a `YYYY-MM-DD` key) specifically so that a reading
  reopened later still labels its twelve positions with the months it was
  originally dealt for, not the months relative to whenever it happens to be
  reopened.
- **One card and a question (1, with a clarifier)**: a single card held
  against a question, with a second card dealt beside it in the same moment
  as a clarifier if the first does not land. This layout offers no answer and
  no lean, and says so directly in its own on-page copy. It does not report a
  yes, a no, or which way a card's orientation points a question: reversals
  in this codebase are one in five (see below), so an orientation-based lean
  would have read "leans toward" a given answer about eighty per cent of the
  time — a loaded coin presented as a reading. `tests/tarot-voice.test.cjs`
  enforces this with a phrase list of its own, separate from the general
  outcome-phrase gate, because the risk in a one-card draw is a verdict
  rather than a forecast.

The Celtic Cross follows the position order in A. E. Waite, *The Pictorial Key
to the Tarot*, Part III §7 (1910, public domain):
https://sacred-texts.com/tarot/pkt/pkt0307.htm.
The modern Horseshoe variation is described at
https://tarot-spreads.com/seven-card-horseshoe-tarot-spread/.
The Relationship spread and the Year Ahead wheel are original arrangements
for this site: no source is claimed for either, and their position orders
are documented only on the page itself and above.
Future positions are possibilities for reflection, not factual predictions.

## Options

Two checkboxes sit above the deal controls: "Include reversed cards" and
"Major Arcana only". Both are page-only state — read live from the checkbox
at the moment of dealing (`dealOptions()` in `tarot.js`) — and neither is
written to storage. Changing either takes effect on the **next** deal; it does
not alter a spread already on the table. Unchecking "Include reversed cards"
deals every card upright; checking "Major Arcana only" narrows the shuffled
pool to the 22 Major Arcana before dealing.

The daily card is deliberately unaffected by either toggle: it is seeded from
the calendar date rather than dealt from the shuffled pool (see "Reading and
interaction" below), so there is no per-deal draw for an option to apply to.

## Reading and interaction

The optional question and focus are captured when dealing. Editing them affects
the next deal; switching spread immediately deals the selected layout with the
current inputs. Neither the question nor the full spread is persisted or sent to
a service. Deck switching preserves card identities, orientation and revealed
positions. The daily card keeps its existing date-based storage behavior.

Cards deal face down with a stagger and flip independently. A revealed card
opens the existing large-art viewer. Reveal next and Reveal all support reading
in order. Numbered position buttons reveal and navigate to their interpretation.
The complete arrangement is preserved on narrow screens, with an enlarge option
that enables horizontal scrolling. Position buttons provide larger touch targets.
Reduced motion disables the dealing and flipping transitions and staggered reveal.
Stale reveal timers are ignored after a new deal or a rerender.

The report contains each revealed card's orientation, original meaning, position
lens, and two reflection questions. Paired interpretations appear only when both
cards are open. Once all cards are revealed, the report adds suit/Major Arcana
patterns, reversal context, a focus lens and three practical reflection steps.
All interpretation text is authored locally, not generated by an external AI
service. Minor Arcana now have 56 distinct sets of upright, reversed and prompt
copy rather than generic rank/suit combinations. The same meanings are used in
daily, full reading and card-detail views.

## Card reference

Alongside the reading room, `/tarot/` also offers a "Card reference" tab: 78 standalone entries,
one per card, documented in `docs/TAROT-REFERENCE.md`. Those entries are separate from the reading
copy documented above, and deliberately so — a test enforces that no reference entry shares more
than two four-word runs with its own card's `upright`/`reversed` text. The reading copy above is
written for a card sitting in a spread position, interpreted through that position's lens and a
reader's question; the reference is what the card means taken entirely on its own, independent of
any position, question or spread. See `docs/TAROT-REFERENCE.md` for its sources and derivations.

## Verification

`node --test tests/*.test.cjs` is **456 tests passing** at the time of writing.
Reading-specific coverage includes: correct full-deck draws, traditional
position geometry, no unrevealed content in reports, complete report counts
and connections, safe question rendering, distinct minor-card text, a year
draw requiring and carrying its deal date, and the voice gate — which scans
every spread's description, tradition, and position lens/question (proved to
reach the three newest spreads by injecting a forbidden phrase into the Year
Ahead's description and watching the gate name it) plus a phrase list of its
own for the one-card draw's narrower risk, a verdict rather than a forecast.
Browser verification covers all spreads, single/batch reveals, artwork modal,
deck changes, new deals, mobile layout and enlargement, and the daily card.
