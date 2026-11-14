# Oracles of the book: the Homer oracle and the Virgilian lots (design)

**Intent.** Glenn asked to "add the Homer oracle and bibliomancy to the site", the fourth item on the
2026-11-14 research shortlist: ancient, distinctive, and no ephemeris work.

**Approved 2026-11-14** (Glenn: "Yes, build it"), then a second decision the same day when the table came
back with gaps ("Yes, show as lost"), and a standing instruction to deploy once complete.

## What it is

A second section on `/divination/`. The Homer oracle: three dice, thrown by the page or entered by hand,
pick one of 216 verses, shown in English and Greek with its reference. The Virgilian lots: one random line
of Dryden's Aeneid with the lines around it.

## Approaches considered

1. **Own section with its own files** (chosen). `divination.js` is one 55 KB script holding six practices,
   their states and their journal rooms; these two oracles share none of that.
2. A seventh and eighth tab inside the existing room. Rejected: it would mean editing the densest script on
   the site for two practices that need no cards, layouts or journal.
3. A page of their own. Rejected: nothing else on the site gets a page for one section.

## Decisions, and where each comes from

| Decision | Source |
|---|---|
| Virgil's Aeneid in Dryden's translation; no Bible | Claude proposed, Glenn approved |
| English for Homer written for the site, one verse at a time | Claude proposed, Glenn approved |
| Historical framing, no claims about outcomes | Claude proposed, Glenn approved |
| The ten lost throws are shown as lost, never filled in | Glenn's decision, 2026-11-14 |
| Disputed identifications follow Maltomini | Claude proposed with the above, Glenn approved |
| Greek shown in the standard text of Homer, not the papyrus's spelling | Claude proposed with the above |
| The suicide verse (6-2-1) is listed but not given as an answer | Claude's judgement, not asked in advance |
| No journal room, nothing stored | Claude proposed, Glenn approved |
| No new dependency | Nothing here needs one |

## Left out

The prayer and the day and hour lists, the papyrus's own spellings, a Latin Aeneid, other books, and saving
a reading.
