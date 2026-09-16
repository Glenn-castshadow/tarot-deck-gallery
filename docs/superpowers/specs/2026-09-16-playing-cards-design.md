# C4c Playing cards: 52-card cartomancy

Date: 2026-09-16. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C4. The split is recorded in `2026-09-14-numerology-depth-design.md`: C4a and C4b have shipped, C4c is this spec, and C4d (the I Ching line texts) comes last.

## Purpose

This spec adds a sixth practice to `/divination/`: reading an ordinary 52-card deck. The cards are drawn as vector art, each card gets original reflective copy, and the page offers a one-card draw and a three-card draw. The practice saves to the journal as the `cartomancy` kind, which the server and `rooms.js` have registered since C4b.

## What exists

- **Practices:** `divination.js` runs five practices through a shared `modes` table: a tab, an intro, layout options, a draw, face-down cards revealed one at a time, a reading panel, a short synthesis, a library of every symbol, an art dialog, and save and load. Lenormand, oracle and runes draw with `E.draw(size, count)` and replay with `E.loadIds`, which accepts at most five ids. A 52-card draw of one or three fits both.
- **Artwork:** Lenormand, oracle, runes and geomancy use pre-rendered webp artwork. The I Ching uses the vector `DivinationArt` module, which is browser-only.
- **Journal:** the `cartomancy` kind ("Playing cards", category `divination`) is in `kinds.py`, migration `0005` and `rooms.js`, so C4c needs no backend change.

## Decisions

Every decision here is mine, taken under Glenn's instruction to complete C4 in the same unattended way as C3.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Deck | 52 cards (four suits, ace to king), no jokers, upright only | Some readers use 32-card piquet decks or reversals |
| Suit themes | Hearts: feeling and relationships. Diamonds: resources and practical work. Clubs: effort, growth and exchange. Spades: difficulty, decisions and clear thought. These are the common modern English-language associations, and the About section calls them that | Other traditions assign the suits differently |
| Copy | For each card: a keyword, a two- or three-sentence reflective meaning, and one prompt. Original, non-predictive, in the voice of the other practices. Spades copy offers difficulty as something to work with, never as misfortune | None |
| Layouts | One card ("What to notice"). Three cards: "What is present", "What asks for attention", "A next step" | None |
| Artwork | Original vector cards generated in code: rank and suit in two corners, the standard pip arrangements for 2–10, one large pip for an ace, and a framed monogram of rank and suit for the jack, queen and king. No third-party art and no image requests. Hearts and diamonds are red, clubs and spades near-black, and the suit is also written in text, so colour is never the only cue | Plain court cards look simpler than a printed deck |
| Where | A sixth tab. The header's "Five ways to listen closely" becomes "Six ways to listen closely" | None |
| Saving | Kind `cartomancy` with `layout` "1" or "3", `payload:{ids}`, and a summary listing the card names | None |

### Pip layouts

The standard arrangements, with coordinates as fractions of the face area (x across, y down):

```
2:  (.5,.2) (.5,.8)
3:  (.5,.2) (.5,.5) (.5,.8)
4:  (.25,.2) (.75,.2) (.25,.8) (.75,.8)
5:  4 + (.5,.5)
6:  (.25,.2) (.75,.2) (.25,.5) (.75,.5) (.25,.8) (.75,.8)
7:  6 + (.5,.35)
8:  6 + (.5,.35) (.5,.65)
9:  (.25,.2) (.75,.2) (.25,.4) (.75,.4) (.25,.6) (.75,.6) (.25,.8) (.75,.8) (.5,.5)
10: 8-of-the-9 (without its centre) + (.5,.3) (.5,.7)
```

Pips in the lower half are drawn rotated 180°, as on a printed card.

## Architecture

- **`playing-cards.js`** (new): a pure UMD module with `SUITS`, `RANKS`, `cards` (52 entries `{id, rank, suit, name, keyword, meaning, prompt}`), `pips(rank)` returning the pip coordinates, and `svg(card)` returning an SVG string with a title for screen readers.
- **`divination.js`:** adds the `cartomancy` practice to `modes`, positions, synthesis, the library, the art dialog (vector art in place of an image), save and load, and the `labels` loop.
- **`divination/index.html`:** loads the new module before `divination.js`, and adds `cartomancy` to `data-room`.

## Testing

- **`tests/playing-cards.test.cjs`:**
  - 52 unique cards, ids 0–51 in suit then rank order, and names such as "Ace of Hearts" and "Queen of Spades".
  - Every card has a keyword, a meaning and a prompt, none empty and none matching the predictive scan. Keywords and meanings are unique.
  - Pip counts are exact for 2–10, an ace has one, and court cards have none. Every pip lies inside the face.
  - `svg` includes the rank, the suit title and the right fill class for each suit.
- **The divination test's save-button wiring** gains `cartomancy`.
- **Browser:**
  - The sixth tab draws one card and three cards.
  - Reveal next, reveal all, the art dialog and the library all work.
  - Save carries `cartomancy`, and reopening restores the draw.
  - Layout holds at 390px and 1400px.

## Files

| File | Change |
|---|---|
| `playing-cards.js`, `tests/playing-cards.test.cjs` | Create |
| `divination.js`, `divination.css`, `divination/index.html` | Modify, including cache keys |
| `tests/divination.test.cjs`, `tests/pages.test.cjs` | Modify |
| `docs/DIVINATION.md`, `docs/SITE-STRUCTURE.md` | Modify |

## Out of scope

Piquet decks, reversals, jokers, larger spreads, the Grand Tableau with playing cards, pre-rendered raster card art, and any backend change.

## Constraints

Part E of the program spec binds unchanged.
