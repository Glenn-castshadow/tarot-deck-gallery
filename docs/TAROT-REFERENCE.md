# The tarot card reference (`tarot-reference.js`)

The reading room's full spreads, daily card and the birth-lore integration all use 78 cards, and
`birth-lore.js`/`tarot.js`/`tarot-readings.js` carry the copy written for a card drawn into a
reading position. `tarot-reference.js` is a separate module: 78 standalone entries, one per card,
describing what a card means taken on its own, plus its traditional astrological or Hebrew-letter
attribution. It is pure data and arithmetic — no DOM, no reading logic — surfaced on-screen as the
"Card reference" tab in the deck explorer, and addressable per card with `?card=<slug>` (for
example `?card=the-star`). This document is the sources and derivations behind it; see
`docs/FULL-READINGS.md` for the reading copy it is deliberately separate from.

## The canonical index, and why it is fixed

Every card has a single index, 0-77: the 22 Major Arcana in order (0 The Fool through 21 The
World), then the 56 Minor Arcana grouped Wands, Cups, Swords, Pentacles, each suit Ace through
King (22-35 Wands, 36-49 Cups, 50-63 Swords, 64-77 Pentacles). `tarot-reference.js` builds this
straight from `MAJOR_NAMES`, `SUITS` and `RANKS` with no reordering.

This numbering is not a convention the module chose; it is fixed by two things outside the code:

- Every shipped deck's artwork files are named `cards/NN.jpg` by this same index, across all four
  decks (`deck-art/ishtar-insights`, `deck-art/light-minimal`, `deck-art/arts-and-crafts`,
  `deck-art/expressive-figures`).
- `deck-art/ishtar-insights/manifest.csv` lists all 78 cards by this index and name — index 08 is
  "Strength", index 11 is "Justice", index 22 is "Ace of Wands", and so on through index 77,
  "King of Pentacles".

Renumbering the module without renumbering every deck's files and the manifest would silently mismatch
artwork to meaning. A test in `tests/tarot-reference.test.cjs` pins `R.name(i)` against the real
78-card catalogue built at test time from `tarot.js` and `birth-lore.js` (the same runtime objects
the reading room itself uses), so the two cannot drift apart unnoticed.

Each card also has a URL slug (`R.slug`), a lower-cased, hyphenated form of its name, with a
reverse lookup (`R.indexForSlug`) used by the `?card=` parameter. Slugs are asserted to round-trip
back to their index for all 78 cards.

## What is derived, and what is transcribed

### The 36 pip attributions come from the Chaldean decan order

The Golden Dawn assigns each of the 36 numbered pip cards (Two through Ten of each suit) to one of
the 36 decans of the zodiac — each sign divided into three ten-degree spans, each ruled by a
planet. The rulers run in **Chaldean order** (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon)
starting from Mars at the first decan of Aries and cycling every seven decans across the wheel.
That sequence already exists in this repository as `faceOrder` in `classical-engine.js`, where it
serves Lilly's essential dignity of face for horary and natal work — `tarot-reference.js` does not
retranscribe it; it holds its own copy, `FACE_ORDER`, in the same order, and a test cross-checks
the two against each other (see below).

The module builds the whole table by walking the zodiac forward, sign by sign (`sign` 0-11, Aries
to Pisces) and decan by decan within each sign (`decan` 0-2):

- The **suit** is `SUIT_OF_ELEMENT[sign % 4]` — the sign's element's suit, so fire signs (Aries,
  Leo, Sagittarius) take Wands, earth signs Pentacles, air signs Swords, water signs Cups.
- The **rank base** is `2 + 3 * (sign % 3)` — it cycles 2, 5, 8 as `sign` advances, independently
  of the suit, so within each element's three signs the ranks run Two-Four, then Five-Seven, then
  Eight-Ten. Aries gives Wands Two through Four; Taurus gives Pentacles Five through Seven; Gemini
  gives Swords Eight through Ten; Cancer starts the cycle again at Cups Two through Four; and so
  on through all twelve signs.
- The **decan ruler** is `FACE_ORDER[(sign * 3 + decan) % 7]` — the same indexing
  `classical-engine.js`'s own `faceRuler` uses for essential dignity of face.

A derivation checked only against its own arithmetic proves nothing — it would pass just as
happily if the whole scheme were shifted by one decan. So `tests/tarot-reference.test.cjs` carries
the **literal traditional table** for all 36 pip cards, written out by hand from the Golden Dawn
attributions (card name, ruling planet, sign), and asserts the module's derived output against it
card by card. A second test cross-checks the same 36 rulers against `classical-engine.js`'s own
`faceRuler` function directly, so the two independent copies of the Chaldean order in this
codebase are proved to agree, not just internally consistent with themselves.

### Waite's numbering, not Marseille's, not Crowley's

The 22 Major Arcana carry a Hebrew letter and, for all but the three elemental cards (The Fool,
The Hanged Man, Judgement), either a planet or a zodiac sign, again the Golden Dawn's own
attributions. The ordering that pairs a number with a card is **A. E. Waite's**: Strength is the
eighth card and takes Leo; Justice is the eleventh and takes Libra. This is verified directly
against `deck-art/ishtar-insights/manifest.csv`, which lists index 08 as "Strength" and index 11
as "Justice".

Two other historical orderings exist and are deliberately not used:

- The older **Marseille** tradition swaps those two numbers — Justice is eighth and Strength
  eleventh — and gives neither card an astrological attribution at all.
- The variant associated with **Aleister Crowley** keeps Waite's numbering but exchanges the
  attributions of The Star and The Emperor (The Star takes Aries and The Emperor Aquarius). This
  site does not use it: `tarot-reference.js` and its tests both pin The Emperor to Hebrew letter
  Heh and Aries, and The Star to Tzaddi and Aquarius — Waite's assignment, not Crowley's.

Waite's order is used here because all four decks this site ships (`ishtar-insights`,
`light-minimal`, `arts-and-crafts`, `expressive-figures`) descend from Waite's structure: the
manifest's own numbering confirms it, and the reading room already builds all four decks' meanings
on the same 78-card system.

### The court attributions are Waite's element-of-element form

The sixteen court cards (Page, Knight, Queen, King of each suit) carry no decan. Their
attribution follows the form in common use with Waite's deck: each court rank stands for an
element, laid over its suit's own element —

- King: Fire
- Queen: Water
- Knight: Air
- Page: Earth

— so, for example, the King of Wands is "Fire of Fire" and the Queen of Pentacles is "Water of
Earth". This is a deliberate simplification of the Golden Dawn's own court structure, which uses
four different ranks — Knight, Queen, Prince and Princess — and does **not** map one to one onto
Waite's King, Queen, Knight and Page. The module follows Waite's four-rank form because that is
the form the shipped decks use; it does not attempt to reconcile it with the Golden Dawn's own
four-rank scheme.

### The Aces carry no decan, and no quadrant either

The four Aces sit outside the decan scheme entirely — there are 40 numbered pip cards in a
standard deck (Ace through Ten, four suits) but only 36 decans, because the Golden Dawn's Book T
instead gives each Ace rulership over a whole quadrant of the heavens, three signs wide. Each
Ace's line in this reference is simply "The root of the powers of \<element\>".

**This site does not name which quadrant belongs to which Ace.** An earlier draft of this
reference did, and got it wrong: it assigned the Ace of Cups's quadrant to the Ace of Swords. The
mapping could not be verified from inside this repository against a primary source, so rather than
risk repeating that error, no Ace entry or attribution names _which_ quadrant, a set of signs, or
a season. Saying that a quadrant exists is safe; enumerating it is not. This is recorded here
deliberately, because it is exactly the kind of correction a future contributor might otherwise
"fix" back into an error, having found a quadrant table somewhere and not noticed it was the
wrong one.

## Reference copy never describes any deck's artwork

Four decks ship with this site, and their imagery differs completely from one another — different
figures, settings, palettes and symbolic detail on every card. A sentence written to describe what
one deck's card shows ("the figure in the boat", "the tower struck by lightning in the
background") is simply wrong when read against any of the other three. So every reference entry
describes what the card **means**, never what any particular deck's artwork **shows**. This is the
opposite of how tarot is conventionally written about, where a card's meaning is very often
explained through a description of the Rider-Waite-Smith scene on its face; that convention
assumes one deck, and this site does not have one deck to assume. `tests/tarot-reference.test.cjs`
checks every entry in every batch against the pattern
`/the (figure|image|card) (in|at|shows|depicts)/i` and fails if it matches.

## The voice gate

Every reference entry, and the existing reading copy alongside it, is checked by
`tests/tarot-voice.test.cjs` for language that predicts an outcome or hands the reader a verdict —
the same concern the sky section's own gate (`tests/sky-calendar-text.test.cjs`) exists for. The
two gates do not share a phrase list, and that is deliberate rather than an oversight.

The sky calendar's list is `['you will', 'will happen', 'is going to', 'the answer is', 'luck',
'fortune']` — bare words and short fragments, which work for sky copy that never has reason to use
them any other way. Run against the tarot copy that already existed before this reference was
written, that list produces **four hits, and all four are correct text, not violations**:

- "Wheel of Fortune" — a card's own name.
- "instead of waiting for luck to do it" — a line that rejects relying on luck.
- "The answer is taking shape beneath the noise" — a line that answers nothing.
- "Decide what you will try and when you will stop" — an instruction about a choice the reader
  makes themselves, not a prediction made about them.

Zero of the sky list's phrases would have caught an actual forecast in tarot copy, and all four
would have flagged text that is fine. A phrase gate in that state is worse than no gate: it gets
switched off by the first person it blocks. So `tests/tarot-voice.test.cjs` uses its own list,
built instead from phrases that name an **outcome** — "you will meet", "you will receive", "is
going to happen", "the answer is yes", "your future holds", "fated to", and so on — never bare
words like "will" or "luck" on their own.

**Its limitation is stated here honestly, not left implicit.** The gate is a fixed-phrase list,
not a tense or modal analyser, so a sentence that forecasts in the present simple, with no modal
verb and no listed phrase, passes it untouched. That happened twice during this reference's
writing, and both were caught by a reviewer reading the copy, not by the test: a court card's
closing line once read as a promise of eventual vindication with no "will" anywhere in it, and a
pip card's closing line once stated as settled fact that a debt "gets remembered precisely...long
after" its counterpart "has been forgotten" — structurally the same unmarked forecast. Both were
rewritten before the entries shipped; the gate itself did not change, because a present-simple
sentence with no listed phrase in it will still pass, by design of what this kind of test can and
cannot see.

## Verification

Run the whole suite:

```
node --test tests/*.test.cjs
```

which is **439 tests passing** at the time of writing.

`tests/tarot-reference.test.cjs` asserts, among others:

- `R.name(i)` agrees with the real 78-card catalogue for every index, and returns `''` outside
  0-77.
- Every slug round-trips back to its own index and no two cards share a slug.
- All 36 pip attributions match the literal traditional table, and separately agree with
  `classical-engine.js`'s own `faceRuler`.
- Every card has an attribution, with the field shape its `kind` claims (`decan` cards carry
  `sign` and `ruler`; `ace`/`court` cards carry `element`; `major` cards carry a Hebrew `letter`),
  and the counts are exactly 36 decan, 4 ace, 16 court, 22 major.
- Aces read "The root of the powers of \<element\>" and courts read the element-of-element form.
- The majors follow Waite (Strength VIII/Leo, Justice XI/Libra, Emperor keeps Heh/Aries, Star
  keeps Tzaddi/Aquarius — not the Crowley exchange), and all 22 Hebrew letters are used exactly
  once.
- A `?card=` parameter resolves to exactly one card or to nothing (a `?reading=` parameter is
  never read as a card; an unknown or uppercase slug resolves to nothing).
- Every one of the 78 cards has a reference entry between 400 and 750 characters, with no entry
  matching the deck-artwork pattern above.
- **All 78 entries are present and mutually distinct** — no two cards share the identical entry
  text.
- **No `REFERENCE` index is assigned more than once.** This exists because a batch-insert script
  once duplicated an entire block of assignments during writing and every other test still
  passed: a repeated `REFERENCE[36] = ...` simply leaves one key in the object, so nothing that
  reads the finished object can see the duplication — only reading the module's source text for
  repeated `REFERENCE[n] =` assignments can. This test was proved by mutation: forcing a
  duplicate assignment during development made it fail with a literal assignment-count mismatch
  (65 assignments for 64 distinct indices) before the file was restored.
- **No reference entry shares more than two four-word runs with its own card's reading copy** (the
  `upright`/`reversed` text in `tarot.js`). This was also proved by mutation: temporarily setting
  a reference entry to its card's own upright text failed the test with the card reporting over
  twenty shared four-word runs, before the file was restored.

`tests/tarot-voice.test.cjs` scans every reference entry and every existing piece of reading copy
(card text, spread descriptions and positions, focus lenses, suit themes) against the outcome-
phrase list described above.

### Browser verification

Performed against the local dev stack at `localhost:8099/tarot/`:

- The "Card reference" tab renders; `TarotReference` resolves as a bare global (the module guards
  a bare identifier rather than a `window.` property, since a top-level `const` in a classic
  script is script-scope only).
- The grid lists all 78 cards (plus the matching card back), with suit-filter counts of 22 Major
  Arcana and 14 each of Wands, Cups, Swords and Pentacles.
- Attributions render correctly for all four kinds: a major (e.g. The Star, "Aquarius"), a decan
  pip (e.g. Five of Wands, "Saturn in Leo"), a court (e.g. Queen of Wands, "Water of Fire") and an
  Ace (e.g. Ace of Cups, "The root of the powers of Water").
- `?card=the-star` opens directly to The Star's own entry.
- Stepping through cards with the dialog's previous/next controls rewrites the `?card=` parameter
  with `replaceState`, not `pushState`, so browser history is not padded with one entry per card
  viewed.
- Closing the dialog clears the `card` parameter from the URL entirely, leaving any other
  parameter (such as `?reading=`) untouched.
- The layout holds with no horizontal overflow at both 390px and 1400px viewport widths.
