# Ishtar Insights web deck assets

This folder contains the lightweight JPEG derivatives used by the Arcana Archive Reading Room. `cards/00.jpg` through `cards/77.jpg` follow the standard 78-card order in `deck-art/ishtar-insights/manifest.csv`; `back.jpg` is the mirrored back design.

The source illustrations and 600 PPI print files stay in the shared `deck-art/ishtar-insights/` production folder. The gallery uses these smaller derivatives so Daily Card and Pick 3 remain fast on phones and on GitHub Pages. The Reading Room's Explore deck tab displays all 78 fronts and the card back, with filters by arcana or suit and search by card name or keywords.

`large/00.jpg` through `large/77.jpg` and `large/back.jpg` are up to 900 × 1500 pixels, exported directly from the print files for the enlarged viewer. These load only when a card is opened; Previous and Next follow the current filtered selection. Rebuild them with `python tools/build_ishtar_web_assets.py`.
