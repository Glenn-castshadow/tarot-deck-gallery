# The three companion decks

Each deck contains 78 separate illustrations (22 Major Arcana and 14 cards in each of Wands, Cups, Swords and Pentacles), plus a matching back. These are original AI-generated interpretations made with the built-in `image_gen.imagegen` tool, not works by, or official editions from, the named artists.

| Reading-room selection | Local artwork folder | Web assets |
| --- | --- | --- |
| Moebius-inspired | `deck-art/light-minimal` | `assets/light-minimal-deck` |
| Arts & Crafts | `deck-art/arts-and-crafts` | `assets/arts-and-crafts-deck` |
| Francis Bacon-inspired | `deck-art/expressive-figures` | `assets/expressive-figures-deck` |

The Moebius-inspired series uses fine ink, open cerulean skies, desert ivory, coral and lavender. The Arts & Crafts series uses botanical woodcut borders, paired pillars, measured geometry and subtle Masonic references. The revised Bacon-inspired series uses deep black, bruised violet, dragged ochre paint and erased faces, following Glenn's darker reference direction.

## Viewing and readings

Choose a deck in the reading room, then use **Daily card**, **Pick 3 cards** or **Explore deck**. All four reading-room decks, including Ishtar Insights, use the same 78-card meaning system. Switching artwork preserves the current draw and its orientations. A three-card draw samples three distinct cards; Daily card remains stable for the local calendar day. Explore supports suit filters, search, the matching back, and a large view with previous/next navigation.

The large-card panel also has a **Deck** selector. It keeps the same card, orientation, search and suit filter while changing the artwork. To compare the Majors, choose **Major Arcana**, open a card, then switch decks inside the panel; Previous/Next stays within those 22 cards. The selector is populated from `readingDecks` in `app.js`, so future decks registered there appear automatically. New decks should follow the existing 00–77 card mapping and matching `large/back.jpg` layout.

Direct gallery links accept `?deck=moebius`, `?deck=arts-and-crafts` or `?deck=bacon`, with `#ishtar-deck` opening Explore. The existing anchor remains valid for saved links.

## Source files, prompts and print layout

Inside each local artwork folder:

- `generation-plan.json`: authoritative ordered list of the 79 selected sources and their exact prompts. Revised source filenames are intentional.
- `generation-records/`: original generation/edit prompts, references and returned source locations.
- `raw-fronts/` and `raw-backs/`: preserved native PNG illustrations; earlier revisions are kept separately.
- `print-ready/fronts/00.png` through `77.png`, and `print-ready/back.png`: complete typeset card canvases for printing and cutting.
- `manifest.csv`: card names, source filenames, native dimensions and print filenames.

Print canvases are **1795 × 2976 pixels at 600 PPI**, representing **76 × 126 mm** including **3 mm bleed** around a **70 × 120 mm trim**. The full illustration is fitted inside the trim with a safety inset; no artwork is cropped. Titles are typeset separately, using the botanical cartouche on Arts & Crafts cards. The outer bleed uses the deck's border color. Files are RGB PNGs; white ink, varnish and substrate-specific printer settings are not encoded.

Native illustrations are approximately **971 × 1619 pixels** (the exact dimensions are in each manifest). The 600 PPI setting describes the larger production canvas; it does not turn the generated source into native 600 PPI detail. Keep the native sources for future refinements and print a physical proof at the intended size before a full run.

Web exports include 360 × 597 thumbnails and 1080 × 1791 large views. Native and print PNGs remain on the NAS and are excluded from Git; web JPEGs, manifests, selected plans and prompt records are versioned. Earlier warm Bacon studies are retained locally and are not the selected gallery artwork.

## Rebuild

From the repository, with Python and Pillow installed, plus Windows Georgia font:

```powershell
python tools/build_companion_decks.py
python tools/check_companion_decks.py
node --check app.js
```

Use `--deck light-minimal`, `--deck arts-and-crafts` or `--deck expressive-figures` to rebuild one deck. `--web-only` skips print PNG export. The check validates complete card inventories, unique selected source files, native dimensions, all print canvases and all web derivatives.

The planning scripts prepare queues for the built-in image tool; they do not make paid API calls. Reruns preserve selected revisions. A checkout containing only Git files needs the ignored native sources copied from the NAS before rebuilding.
