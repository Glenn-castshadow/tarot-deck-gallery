# Mobile sections

At widths up to 700px, each page's own top-level sections become expandable
rows: `/tarot/` has Tarot readings and the deck archive; `/sky/` has Daily
horoscope; `/charts/` has Birth sky, Astrocartography, More astrology charts,
Chart in time and Horary; `/eastern/` has Chinese zodiac and Jyotish;
`/numerology/` has the Numerology studio; `/divination/` has Cards &
divination. `/account/` carries no folds -- it has no `[data-fold]` markup at
all, so `mobile-sections.js`'s per-page setup has nothing to wrap there. All
start closed unless a fragment link opens a particular area. Opening a main
area closes the others. The floating **Sections** button closes the active
area and returns to the section list, restoring focus to its row.

Within an area, the deck chooser, saved birth form, detailed sky reports,
numerology practices and combined readings, letter calculations, and cycle
overviews can be expanded separately. Full tarot readings have individual card
chapters (one open at a time), an overall synthesis, and card connections.
First-time visitors see the birth form open when they open the birthday area.

The disclosures move existing DOM elements; closing a section does not clear
inputs, redraw cards, change the selected chart, or reset archive search. A
small MutationObserver enhances newly rendered reports while preserving focus
and the current disclosure choices in page memory. No disclosure state is saved
to storage. `tarot.js` explicitly opens the relevant disclosure before focusing a
tarot chapter or the keyboard search shortcut. Birth-edit buttons, fragment
links, and initial deep links also open their destination.

Each disclosure uses a native button, `aria-expanded`, `aria-controls`, and a
hidden content container. Enter and Space activate it. Desktop uses
`display: contents` to retain the existing grids with every content container
open and the mobile headings hidden. Breakpoint changes keep focused content
available; print opens the containers and restores them afterward.

## Verification

- Compared the same 390px page with a saved profile: initial document height
  decreased from 24,709px to 1,270px with the main sections collapsed.
- Checked 320px and 390px phones and 1440px desktop, including master numbers,
  no horizontal overflow, and all desktop content containers expanded.
- Exercised keyboard activation, focus after cycle recalculation, switching
  card chapters, and tarot position navigation with the card heading in view.
- Verified name/Y choices, tarot reveals, selected deck, and archive search
  remain intact after closing/reopening their area.
- Checked first-visit birthday entry, fragment links, chart shortcuts,
  birth-edit actions, and globe rendering after opening a hidden area.
- Existing engine/report tests: `node --test tests/*.test.cjs`.
