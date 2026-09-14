# C2a Tarot: the card reference

Date: 2026-09-13. Status: design, awaiting Glenn's review.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C2.

## Purpose

Give every one of the 78 cards a standalone reference entry: a paragraph that stands apart from
any spread position, and the traditional attributions a reader studying the deck would want.
Today the only way to read what a card means is to draw it, and the text that appears is written
for the position it landed in.

This is the first half of C2. The yes/no draw, the reversal and Major-only options, and the two
new spreads are C2b and are out of scope here (Glenn, 2026-09-13).

## What already exists

The program spec describes building a browsable index of all 78 cards, filtered by arcana and
suit, showing each card in the chosen deck's art. **That surface already shipped.** The "Explore
deck" tab in the reading room renders every card in a grid with filters for Major Arcana and each
of the four suits, a search box, and a card-back filter. Selecting a card opens a detail dialog
with the large artwork, the keywords, the upright and reversed text, previous and next navigation
through the filtered set, and a deck switcher labelled "Same card, another deck".

Two consequences for this spec:

1. This sub-project adds depth to an existing surface. It does not build a new one.
2. The program spec's "a link to the same card in every archive deck that has it" **cannot be
   built and is withdrawn.** The 32 archive decks hold one representative front image and one
   back image each, not 78 cards; `tarot-decks/README.md` states this directly. Only the four
   playable decks have every card, and the detail dialog's deck switcher already moves between
   them. There is nothing further to link.

## Decisions

| Decision | Choice | Source |
|---|---|---|
| Reference copy | New standalone paragraph per card, all 78 | Glenn, 2026-09-13 |
| Attributions | Golden Dawn, cited and named as one tradition | Glenn, 2026-09-13 |
| Copy production | Written in batches by dispatched subagents, reviewed per batch | Glenn, 2026-09-13 |
| Sub-project split | Reference first; draws and spreads follow as C2b | Glenn, 2026-09-13 |
| Existing card data is not consolidated | Majors stay in `birth-lore.js`, minor text in `tarot-readings.js` | This spec, see Architecture |
| Cross-deck archive links | Withdrawn, not buildable | This spec, see What already exists |
| No new journal kind | A reference is not a reading | This spec |

## Architecture

### One new data module

`tarot-reference.js`, a pure UMD module exporting the global `TarotReference`. It holds the 78
reference paragraphs keyed by the canonical card index, and derives the attributions. It has no
DOM knowledge and is tested under `node --test`.

```
TarotReference.entry(index)        -> { reference, attribution }
TarotReference.attribution(index)  -> { line, kind, sign, ruler, element, letter }
TarotReference.slug(index)         -> 'the-star' | 'two-of-cups'
TarotReference.indexForSlug(slug)  -> 0..77 | -1
```

`attribution.line` is the rendered phrase, such as "Mars in Aries" or "Water of Fire". `kind` is
one of `decan`, `ace`, `court` or `major`, and says which of the other fields are populated:
`decan` carries `sign` and `ruler`, `ace` and `court` carry `element`, `major` carries `letter`
plus whichever of `sign`, `ruler` or `element` that card takes.

The canonical index is the one the card images already use: 0 to 21 are the Major Arcana in
order, 22 to 77 are the minors grouped Wands, Cups, Swords, Pentacles, each Ace through King.
This order is fixed by `deck-art/ishtar-insights/manifest.csv` and by every deck's `cards/NN.jpg`
filenames, so the reference is keyed to the same thing the art is.

**The existing card data is deliberately left where it is.** Card fields are currently assembled
from three files: the majors in `birth-lore.js`, the minor scaffolding in `tarot.js`, and the
per-minor text in `tarot-readings.js`. The program spec's parenthetical suggested consolidating
them into `tarot-data.js`. That is a refactor of the files the reading engine depends on, with
420 passing tests riding on it, and it buys this feature nothing: the reference layer is additive
and keyed independently. Consolidation stays available as its own change if a later sub-project
needs it.

### Attributions are derived, not transcribed

The Golden Dawn assigns the 36 pip cards, the 2 through 10 of each suit, to the 36 decans of the
zodiac. The decan rulers run in Chaldean order beginning with Mars at 0 Aries. **That sequence
already exists in this codebase**, as `faceOrder` in `classical-engine.js`, where it serves the
essential dignity of face and is already covered by the horary tests.

So the 36 pip attributions are generated rather than typed:

- Sign index `i` runs 0 (Aries) through 11 (Pisces).
- The suit is the sign's element: fire gives Wands, water Cups, air Swords, earth Pentacles.
- The rank base is `2 + 3 * (i % 3)`, and the sign's three decans take that rank, the next, and
  the one after.
- The decan ruler is `faceOrder[(i * 3 + decan) % 7]`.

Run during this design, the four lines above produce all 36 pip attributions, every one distinct
and every one matching the traditional table: Mars in Aries for the Two of Wands, Mercury in
Taurus for the Five of Pentacles, Venus in Cancer for the Two of Cups, Saturn in Leo for the Five
of Wands, Moon in Libra for the Two of Swords, Mars in Pisces for the Ten of Cups.

Deriving rather than transcribing removes 36 opportunities for a typo. It does not by itself
prove the result correct, so **the test carries the literal expected table for all 36** and
compares against it. A derivation checked only against itself proves nothing; the expected values
are the pin.

The remaining attributions are small fixed tables:

- **Aces** take the root of their element, not a decan.
- **Courts** take the element-of-element reading in common use with Waite's deck: King is fire,
  Queen water, Knight air, Page earth, each of its own suit's element, so the Queen of Wands is
  water of fire. The About disclosure states plainly that this is the Waite-adapted form, and
  that the Golden Dawn's own court structure of Knight, Queen, Prince and Princess does not map
  one to one onto Waite's King, Queen, Knight and Page.
- **Majors** take a planet, a sign or an element, with the Hebrew letter.

### The Strength and Justice order must be named

The majors follow Waite's numbering, with Strength at VIII attributed to Leo and Justice at XI
attributed to Libra. The older Marseille order reverses the two numbers and carries no
astrological attribution. The site ships four decks built on Waite's order, so Waite's order is
the one used, and the About disclosure says so rather than leaving a reader to assume theirs is
the only arrangement. The Crowley variant that exchanges the attributions of The Star and The
Emperor is noted as existing and not adopted.

### Reference copy must not describe one deck's artwork

The site ships four original decks whose imagery differs. A reference paragraph that describes
what is drawn on a card is wrong for at least three of them. Entries describe what the card
holds, not what any deck pictures. This is a hard constraint on every copy batch.

### Surface changes

- The "Explore deck" tab is renamed **Card reference**, and its header copy changes from
  deck-centric to card-centric. The card-back filter and the deck name stay.
- The card detail dialog gains the reference paragraph and an attribution line, above the
  existing upright and reversed text. The reflection prompt, which the card data already carries
  and the dialog does not currently show, is added.
- An About disclosure names the Golden Dawn as the source, cites it, and states the Waite
  ordering.
- A card has a URL. `/tarot/?card=<slug>` opens the reference with that card's detail showing.
  Slugs come from the card name: `the-star`, `two-of-cups`. This is a separate parameter from the
  existing `?reading=`, which `rooms.js` owns.

### Nothing is saved

A reference entry is not a reading. No new journal kind, no change to `kinds.py` or `rooms.js`,
no new payload. `tarot-yesno` arrives with C2b.

## The voice test

There is currently no forbidden-phrase test over tarot copy. The pattern exists only for the sky
section. Adding 78 entries without one would ship them unchecked.

**The sky list cannot be reused.** Run against today's tarot copy it produces four hits and every
one is a false positive:

| Phrase | Where it occurs | Why it is correct |
|---|---|---|
| fortune | Wheel of Fortune | the card's name |
| luck | "instead of waiting for luck to do it" | the sentence rejects luck |
| the answer is | "The answer is taking shape beneath the noise" | it answers nothing |
| you will | "Decide what you will try and when you will stop" | it instructs the reader about a choice of theirs |

Zero true positives against four false ones. A test in that state is switched off by the first
person it blocks, and the new entries then ship unchecked anyway.

The tarot test therefore targets the actual failure, which is prediction and verdict. The rule is
mechanical: a list of explicit multi-word phrases, not a bare word list, chosen so that a
reader's own action never matches.

- Prediction of events outside the reader's control: `you will meet`, `you will receive`,
  `you will find`, `you will be given`, `is going to happen`, `will happen to you`.
- Verdict: `the answer is yes`, `the answer is no`, `means yes`, `means no`, `definitely will`,
  `certainly will`.
- Card names are exempt by construction: the scan skips each card's `name` field, and allowlists
  the literal string `Wheel of Fortune` wherever it appears in prose.

Phrasing that instructs the reader about a choice of theirs, such as "decide what you will try",
matches none of these, because every listed phrase names an outcome rather than an action. That
is why the list is phrases rather than the words `will` or `answer`.

The test covers the new reference copy and the existing reading copy together. If it flags
existing text, the finding is reported rather than silently exempted.

## Testing

`tests/tarot-reference.test.cjs`:

- All 78 indices have an entry, and no index outside 0 to 77 does.
- Every reference paragraph is distinct from every other, and distinct from that card's own
  upright and reversed text, so an entry cannot be a paraphrase of the reading copy.
- Paragraph length is bounded at both ends.
- The 36 pip attributions match a literal expected table written out in the test.
- The derived decan rulers agree with `classical-engine.js`'s `faceRuler` for all 36, which the
  test can require directly since both run under Node.
- Courts, aces and majors match their expected tables, including Strength at VIII with Leo and
  Justice at XI with Libra.
- Slugs round-trip: every index produces a slug, and every slug resolves back to its index.

`tests/tarot-voice.test.cjs`: the scan described above, over the 78 reference paragraphs and the
existing reading copy.

Browser verification: the reference tab lists 78 cards, each filter shows its stated count, a card
opens with its reference paragraph and attribution, the deck switcher keeps the reference text
while changing the art, `?card=the-star` opens The Star directly, the layout holds at 390px and
1400px, and no console error originates from the new module.

## Work breakdown

Copy is written in five batches, each its own task with its own review for voice and for sameness
across cards:

| Batch | Cards | Indices |
|---|---|---|
| 1 | The 22 Major Arcana | 0 to 21 |
| 2 | Wands, Ace through King | 22 to 35 |
| 3 | Cups, Ace through King | 36 to 49 |
| 4 | Swords, Ace through King | 50 to 63 |
| 5 | Pentacles, Ace through King | 64 to 77 |

The module, the attribution derivation, the tests and the surface changes come before the copy, so
each batch lands against a working reference and a passing voice test.

## Files

| File | Change |
|---|---|
| `tarot-reference.js` | Create. Entries, attributions, slugs. |
| `tarot.js` | Modify. Reference and attribution in the detail dialog, tab rename, `?card=` handling. |
| `tarot-readings.css` | Modify. Styles for the reference block and the About disclosure. |
| `tarot/index.html` | Modify. New script tag, tab label, About disclosure, cache keys. |
| `tests/tarot-reference.test.cjs` | Create. |
| `tests/tarot-voice.test.cjs` | Create. Covers new and existing tarot copy. |
| `docs/TAROT-REFERENCE.md` | Create. Conventions, sources, the Waite ordering note. |
| `docs/SITE-STRUCTURE.md` | Modify. Script order for `/tarot/`. |
| `docs/deployment.md` | Modify at deploy time. |

## Out of scope

Yes/no and clarifier draws, the reversal and Major-only options, the Relationship and Year-ahead
spreads: all C2b. Consolidating the existing card data into one module. Per-card art from the
archive decks, which do not have it. Custom spreads, deck creation and notifications, which the
program spec puts out of scope for C2 entirely.

## Constraints

Part E of the program spec binds this sub-project unchanged: no new dependencies, pure UMD engines
tested under `node --test`, an About disclosure naming conventions and sources, a copy test for
forbidden phrasing, keyboard operable and reduced-motion respecting, verified at 390px and 1400px,
cache keys bumped on every changed file, docs updated, and commits ending with the co-author line.
