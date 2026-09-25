# Handoff: finish and release the crystals section

Written 2026-09-24 by Claude (Opus 5.5) for Codex. Glenn asked for the handoff at the point where the
build was complete and reviewed, before merge and release.

## State

- Repo `V:\tarot_game`, branch **`crystals`**, checked out in the main checkout. There are no worktrees:
  NAS worktrees are blocked by `safe.directory`. The branch is 30 commits over `main` (`4f2cc27`). The
  tree is clean apart from this file.
- `node --test tests/*.test.cjs` passes: 713 tests, 0 failures. `node tools/build_reference_pages.cjs --check` reports that the pages are current.
- The final whole-branch review says the branch is ready to merge. A separate fact and safety audit of
  all 100 crystal entries found 56 problems. All 56 are fixed, and a re-audit confirmed the fixes.
- **Nothing is merged, pushed or deployed.**
- Spec: `docs/superpowers/specs/2026-09-24-crystals-design.md`. Plan:
  `docs/superpowers/plans/2026-09-24-crystals.md`. Plan tasks 1 to 9 are done. Task 10, the release, is not.

## What was built

- `crystal-data.js` holds 100 stones: facts, correspondences, and prose. Each entry is on one line.
- The `/crystals/` page (`crystals/index.html`, `crystals.js`, `crystals.css`) is in the nav. It has the
  crystal of the day, "your stones", and a grid you can search and filter.
- `tools/build_reference_pages.cjs` generates 100 pages at `/crystals/<slug>/`. The sitemap now has 267 URLs.
- `BirthLore.stoneSlug`/`stoneLinks` link the sign pages and the natal room's Birthstone row to the crystal
  pages. The hub has a "Today's crystal" item, and it does not load the data file.
- `docs/SITE-STRUCTURE.md` and `docs/REFERENCE-PAGES.md` are updated.

## What is left

1. **Merge.** Glenn decides. The branch forked from `main`, so a fast-forward or merge is clean.
2. **Release** (plan Task 10). Follow the delta-release procedure in `docs/deployment.md`:
   - Build the tar with `git -c core.autocrlf=false archive`, using `--force-local` with Git Bash tar.
   - The page directories already exist on the VPS. `rm -f` the replaced files by hand before you
     extract, instead of using `tar --unlink-first`.
   - About 360 files changed: the new `crystals/` tree, every regenerated reference page (the nav gained
     Crystals), the nine top-level pages (cache keys), `site-shell.js`, `birth-lore.js`, `natal-room.js`,
     `hub.js`, `reference-pages.css`, `sitemap.xml`, and the new JS and CSS files.
   - **Confirm with Glenn before the deploy.** It publishes to the live site.
   - Afterwards, record it in `docs/deployment.md`.
3. **Be back on `main` before 03:30.** `Ishtar-Daily-Prose` runs at 03:30, and `Ishtar-Weekly-Prose` runs
   Sundays at 04:30. Both run `node tools\...` from `V:\tarot_game` on whatever branch is checked out.
4. **Optional minors** from the final review (`.superpowers` has been deleted, so here is the substance):
   - **M-7:** `.crystal-keyword` is `--gold` (`#c9864e`) on cream, 11px. Its contrast is low. This is
     the one worth fixing, because it is an accessibility basic.
   - **M-3:** "Stones that share a chakra" on the generated pages takes the first 8 by name, so the
     internal links lean towards stones early in the alphabet.
   - **M-5:** the crystal pages have no per-page SEO test for titles and descriptions, unlike the card
     and hexagram pages.
   - **M-8:** "Your stones" gives no sign when the result comes from saved birth details.
   - Deferred: the tiger's eye care note repeats serpentine's "never sand, cut or grind" warning. Both
     are asbestos warnings.

## Rulings made during the build

Each ruling is listed with what it costs if it is wrong. Glenn has not reviewed these individually.

- Card suit need not match a stone's element; the cards were re-picked by tone. If wrong: the suit
  mapping is less systematic.
- Amazonite is on `TOXIC` (lead) and hematite is off `WATER` (it does not rust). If wrong: one care note
  is over- or under-cautious.
- Repeated sentence shapes fail at 4 or more out of 10 per field, not 3. Instructions to the reader and
  prompts that echo their own stone's theme do not count. If wrong: some shared shapes across pages.
- Openings that begin with the stone's name are fine in the meaning, physical and care fields, but
  capped at 3 in 10 in the emotional and spiritual fields.
- Every symptom-relief line was removed, even where it named no disease (sleep, digestion, stiffness,
  eye strain), because they read as health advice. If wrong: some physical paragraphs lost specificity.
- Only a sphere, or a similarly curved polished piece, is said to focus sun; points and facets are not.
- Fact fields edited during the prose work: alexandrite's aka became "colour-change chrysoberyl";
  peacock ore gained the aka "chalcopyrite".
- Muse Glimmer was tested on one batch and rejected for this copy. It copied a verb from the brief in
  9 of 10 entries and dropped the mercury warning.
- `.claude/launch.json` stays untracked, because it is gitignored and machine-specific.

## Gotchas

- The generator bakes the nav and prose into the static pages. After any change to `crystal-data.js`,
  `site-shell.js` or `reference-pages.css`, run `node tools/build_reference_pages.cjs`.
- `tests/crystal-data.test.cjs` enforces field shapes, the medical-claims list, variety in two-word
  openings across the whole file, British spelling, and the water and toxic warnings.
- Bump a file's `?v=` everywhere it loads whenever you change it. The current keys are `crystals.js?v=2`,
  `crystal-data.js?v=2`, `crystals.css?v=1`, `site-shell.js?v=14` and `birth-lore.js?v=3`.
