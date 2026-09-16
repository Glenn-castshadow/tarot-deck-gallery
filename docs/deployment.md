# VPS deployment

## 2026-09-16 Playing-card cartomancy

Deployed `654214a`. **Static only.** The `cartomancy` kind shipped server-side with C4b.

**Release.**
- Released as `/opt/tarot-game/releases/20260916-playing-cards-654214a`, a `cp -al` hardlink copy of `20260916-divination-layouts-a6d39bf`.
- Three files were replaced (`divination/index.html`, `divination.js`, `divination.css`) and one added (`playing-cards.js`).
- The deploy was gated on `current` and on the sha256 of the three replaced files.
- The previous release is retained for rollback:
  `ln -sfn /opt/tarot-game/releases/20260916-divination-layouts-a6d39bf /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

**Change (C4c).** A sixth divination practice, tab 06, reads an ordinary 52-card deck.
- Draws: one card or three, all upright.
- Copy: original reflective copy for every card.
- Faces: original SVG faces, and no card image is ever requested.
- Saving: readings save as `cartomancy`.

**Shared fixes.**
- A saved reading must use a layout its practice offers. A two-card cartomancy reading used to break the tab.
- The status line now pluralises correctly, including for oracle and runes.

Suite 538 to 542. Conventions are in `docs/DIVINATION.md`.

**Cache keys.** `divination.js?v=c4c-1`, `divination.css?v=c4c-1` and `playing-cards.js?v=1`, all on `/divination/` only.

**Deploy gate correction.** Before the run, one gate needle was replaced because it would have rolled back a correct release: card names such as "Queen of Spades" are built from a template, so the literal never appears in the served script. The needle now checks a literal suit entry instead.

**Validation after the switch.**
- All eight pages and the three assets return 200.
- The keys are confirmed on `/divination/`.
- The served scripts carry the deck and the practice.
- In a browser at ishtarinsights.com:
  - the header reads "Six ways to listen closely";
  - a three-card deal shows three SVG faces and saves as `cartomancy`, with summary "Two of Clubs · Jack of Spades · Eight of Diamonds";
  - no card image was requested, and there were no console errors.

## 2026-09-16 Divination layouts: the Grand Tableau and the geomantic house chart

Deployed `a6d39bf` in two stages, backend first. The frontend posts the new kinds, so the server
had to know them before any page could send them.

**Backend.**
- `server/ishtar` went to `/tmp/ishtar-app-src.tar` by `git archive`. The fresh `deploy-app.sh`,
  service unit, nginx snippet and backup script were uploaded alongside it.
- The wrapper `/tmp/ishtar-backend-c4b.sh` first checked health. It then backed up the live
  WAL-mode database through SQLite's backup API to
  `/var/backups/ishtar-app/db-predeploy-20260916-140028.sqlite3` and ran `integrity_check` on the
  copy.
- It extracted and CR-stripped the archive, confirming the archive carried `grand-tableau` and
  migration `0005`, then ran `deploy-app.sh`.
- Migration `readings.0005_reading_kind_c4` applied. It changes `choices` only, so it is a no-op
  in SQL.
- The wrapper confirmed `0005` shows applied and that `ishtar-app` restarted after the deploy began
  (14:00:31 UTC). `/api/health/` returns `{"ok": true}`. The restart matters: workers read `KINDS`
  at import.
- `deploy-app.sh`'s own first health probe hit the port before gunicorn was listening, then
  succeeded on retry.

**Frontend.**
- Released as `/opt/tarot-game/releases/20260916-divination-layouts-a6d39bf`, a `cp -al` copy of
  `20260916-numerology-depth-fb1d616` with thirteen files replaced: the four divination files,
  `rooms.js`, and the eight pages that load `rooms.js`.
- The script refused to run unless the deployed backend's `kinds.py` contained `grand-tableau`. It
  was also gated on `current` and on the sha256 of all thirteen files.
- Previous release retained for rollback:
  `ln -sfn /opt/tarot-game/releases/20260916-numerology-depth-fb1d616 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.
  The backend change needs no rollback, because the old frontend never sends the new kinds.

**Change (C4b).**
- The Lenormand Grand Tableau, with 8×4+4 houses, an optional significator, one-ring nearness,
  knighting, the corners and the closing row.
- A geomantic house chart view, with quesited house, passage, perfection and aspects in the
  historical voice.
- New kinds: `grand-tableau`, `geomancy-houses`, and `cartomancy` (its room arrives with C4c).
- The save button now takes its kind from the current draw.
- Suites: node 529 to 538, Django readings 14 to 16. Conventions are in `docs/DIVINATION.md`.

**Cache keys.**
- `rooms.js?v=c4-kinds-1` on all eight pages.
- `divination.js`, `divination-engine.js`, `divination-data.js` and `divination.css` at `?v=c4b-1`
  on `/divination/`.

**Validation after the switch.**
- All eight pages and the five assets return 200.
- Every key is confirmed on its pages.
- The served scripts carry the new kinds, the tableau and house-chart code, and the copy tables.
- In a browser at ishtarinsights.com: the tableau lays 36 cells and its save button carries
  `grand-tableau`. The house view shows twelve houses, saves as `geomancy-houses` with summary
  "House chart · house 7, Partners and Agreements: Fortuna Minor", and a signed-out save opens
  sign-in. No console errors.

**Not yet exercised:** a signed-in save and reopen of either new kind through the live API. That
needs an account login. The server round-trip is covered by the Django test, and the client
save/load by the Node test.

## 2026-09-16 Numerology depth: karmic debt, lessons, passion and saving

Deployed `fb1d616`. **Static only** — no backend change; the server already accepts the
`numerology` kind.

Released as `/opt/tarot-game/releases/20260916-numerology-depth-fb1d616`, a `cp -al` hardlink copy
of `20260914-eastern-depth-3c225dd` with four files replaced: `numerology/index.html`,
`numerology-engine.js`, `numerology.js` and `numerology.css`. Gated on `current` and on the sha256
of all four. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-eastern-depth-3c225dd /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change (C4a):
- **Karmic debt:** 13, 14, 16 and 19 in a number's reduction chain, shown for Life Path and Birth
  Day and for the three Pythagorean name numbers.
- **Karmic lessons and hidden passion:** Pythagorean only, with Hans Decoz's World Numerology pages
  cited.
- **Saving:** numerology readings now save to the journal (`Rooms.register('numerology')`). The
  name is saved only when a valid name reading is open, and the other person's birth date only
  when compared. A note beside the save button says which is stored. The summary never contains
  the name.

Suite 518 to 529. Conventions: `docs/NUMEROLOGY.md`.

Cache keys: `numerology-engine.js?v=3`, `numerology.js?v=5` and `numerology.css?v=3`, on
`/numerology/` only. The engine key was missed by the plan and caught by the whole-branch review
before deploy.

Validation after the switch:
- All eight pages and the three assets return 200 over HTTPS.
- The keys are confirmed on `/numerology/`.
- The served engine carries the karmic functions, and the served studio registers the room and
  cites the karmic debt source.

In a browser at ishtarinsights.com, a guest profile born 9 October 1989 shows Life Path 19/1 karmic
debt. The numerology room is registered, the summary is "Life Path 1", the save button reads "Sign
in to save this reading", and there were no console errors. A signed-in save was not exercised,
since that needs an account login; the save and load paths were checked locally against the room
API.

## 2026-09-14 Eastern depth: the Chinese year, the annual pillar and Gochar

Deployed `3c225dd`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-eastern-depth-3c225dd`, a `cp -al` hardlink copy of
`20260914-relationship-charts-43804ea` with twelve files replaced and one added (`chinese-year.js`).
Gated on `current` and on the sha256 of all twelve replaced files. Previous release retained for
rollback:
`ln -sfn /opt/tarot-game/releases/20260914-relationship-charts-43804ea /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change, the last of C3 astrology depth:
- the Chinese year under the Chinese zodiac portrait on `/eastern/` — how a chosen lunar year's
  animal relates to the birth animal, every traditional relation that applies;
- the BaZi annual pillar (流年) in the Four Pillars tab on `/charts/` — the sexagenary year from
  Li Chun, its Ten God and hidden stems (BaZi stays on `/charts/`, where `rooms.js` already routes it);
- Gochar, a fifth Jyotish tab on `/eastern/` — the day's sidereal grahas at 12:00 UTC counted
  whole-sign from the natal Moon, the classical supportive table, no Vedha, a Sade Sati note.

Fixes to live content: five Ten God descriptions stated polarity the wrong way round; Jyotish tables
on `/eastern/` ran off-screen on phones (the shared `.cx-table-wrap` overflow rule is not loaded
there, now re-declared in `jyotish.css`). Suite 500 to 518. Conventions: `docs/BIRTHDAY-INSIGHTS.md`,
`docs/EXTENDED-ATLAS.md`, `docs/JYOTISH.md`.

Cache keys: `celestial-room.css?v=chinese-year-1` (`/charts/`, `/eastern/`, `/numerology/`);
`celestial-extras-engine.js?v=3`, `celestial-extras.js?v=5`, `celestial-extras.css?v=4` (`/charts/`);
`jyotish-engine.js?v=2`, `jyotish-text.js?v=2`, `jyotish.js?v=2`, `jyotish.css?v=3`,
`chinese-room.js?v=3`, `chinese-year.js?v=1` (`/eastern/`).

The deploy gate first carried a check that would have rolled back a correct release: it looked for
the Gochar tab markup in `/eastern/`'s HTML, but `jyotish.js` renders it. Caught by checking every
needle against the commit before running; the needle moved to `/jyotish.js`.

Validation after the switch: all eight pages and the ten assets return 200 over HTTPS; every key
confirmed on its pages; the served scripts carry the relations, the annual pillar, the Gochar
engine and tab, the corrected polarity text and the table overflow rule. In a browser at
ishtarinsights.com with a guest profile born 21 July 1990 in London: the Chinese year for 2026
reads Horse against Horse (same animal and self-punishment); Gochar for 2026-09-14 counts from a
Mithuna Moon with Saturn in Meena in the 10th; the annual pillar for a Ding Day Master reads 丙午,
Rob Wealth, Li Chun 3 February 2026 20:01 UTC. No console errors.

## 2026-09-14 Composite and Davison relationship charts

Deployed `43804ea`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-relationship-charts-43804ea`, a `cp -al` hardlink
copy of `20260914-chart-depth-8e09eac` with three files replaced (`charts/index.html`,
`celestial-extras.js`, `celestial-extras.css`) and two added (`relationship-charts-engine.js`,
`relationship-charts.js`). Gated on `current` and on the sha256 of the three replaced files.
Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-chart-depth-8e09eac /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: a Synastry / Composite / Davison switch in the Two skies tab, reusing the same partner.
The composite is a chart of midpoints; the Davison is the sky at the midpoint of the two UTC birth
instants, from the mean latitude and the near-midpoint longitude, in the house system the reader
chose. Conventions and tests: `docs/EXTENDED-ATLAS.md`. Suite 480 to 500.

Cache keys: `celestial-extras.js?v=4`, `celestial-extras.css?v=3`, both new files at `?v=1`; only
`/charts/` loads them.

Validation after the switch: all eight pages and the four assets return 200 over HTTPS; the four
keys confirmed on `/charts/`; the served scripts carry the switch, the engine and the sources. In a
browser at ishtarinsights.com with the sample pair, Composite and Davison each render a wheel and
twelve placement rows with no lunar nodes, the Davison names 1991-09-09 11:52 UTC at 46.11° N,
37.07° W, and switching back to Synastry restores the two-ring view; no console errors beyond the
guest account 401s.

## 2026-09-14 Chart depth: profections, the Lot, minor aspects and patterns

Deployed `8e09eac`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-chart-depth-8e09eac`, a `cp -al` hardlink copy of
`20260914-tarot-draws-80328c0` with fifteen files replaced and two added (`chart-depth-engine.js`,
`chart-depth.js`). Gated on `current` pointing at the expected previous release and on the sha256
of all fifteen replaced files, which matched `main` before the merge with CRs stripped. Previous
release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-tarot-draws-80328c0 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: a Traditional techniques section under the natal report on `/charts/` — the annual
profection for a chosen year with its time lord, the sect-sensitive Part of Fortune, and aspect
patterns read from majors and minors together. Minor aspects in a separate `chart.minorAspects`,
with toggles on the report's aspect list and on the explorer wheel. `ClassicalEngine.sect` now
tests the Sun above the horizon rather than houses 7–12, which was wrong on Whole Sign charts
near the angles. Suite 456 to 480. Methods: `docs/NATAL-CHART.md`.

Replaced: `index.html`, `charts/`, `eastern/`, `numerology/`, `sky/`, `account/`, `divination/`
and `tarot/index.html`, `natal-engine.js`, `natal-chart.js`, `natal-room.js`, `sky-chart.js`,
`classical-engine.js`, `mobile-sections.js`, `celestial-room.css`. Most pages changed only for
cache keys: `natal-engine.js?v=chart-depth-1` (five pages), `mobile-sections.js?v=data-fold-4`
(seven pages), `celestial-room.css?v=chart-depth-2` (three), `natal-room.js?v=8` (three),
`natal-chart.js` and `sky-chart.js` at `?v=chart-depth-2`, `classical-engine.js?v=2`,
`chart-depth-engine.js?v=1`, `chart-depth.js?v=2`.

Validation after the switch: all eight pages and the nine changed or new assets return 200 over
HTTPS; every bumped key confirmed on every page that loads the file; the served scripts carry the
minor aspects, the three techniques, the year selector, the Valens source line, the horizon sect
test and the phone fold. In a browser at ishtarinsights.com, a guest profile born 1 December 1990
14:30 London renders the section on 14 September 2026 as age 35 (the 2025 profection, since the
birthday is still to come), 12th house Aries with Mars, the day formula, and Sagittarius and
Capricorn stelliums plus a T-square; no console errors beyond the guest account 401s.

## 2026-09-14 Tarot draws and reading options

Deployed `80328c0`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-tarot-draws-80328c0`, a `cp -al` hardlink copy of
`20260914-card-reference-1b778e8` with four files replaced: `tarot/index.html`, `tarot.js`,
`tarot-readings.js` and `tarot-readings.css`. Gated on `current` pointing at the expected previous
release and on the sha256 of all four. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-card-reference-1b778e8 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: three new spreads and two reading options. A one-card draw with a clarifier, a seven-card
relationship layout, and a thirteen-card year wheel whose months begin with the month after the
reading. Toggles for reversals and Major Arcana only, page-only with no storage, applying to the
next deal and deliberately not to the date-seeded daily card. Suite 439 to 456.

Cache keys: `tarot.js?v=6`, `tarot-readings.js?v=accounts-5`, `tarot-readings.css?v=3`.
`tarot-reference.js` is unchanged at `?v=1`.

**No journal kind was added, and that is why this is a one-stage deploy.** The program spec
assigned the one-card draw a kind `tarot-yesno`, which would have needed a fifth migration and a
backend-first release. Building the draw as a two-position spread rather than a room removed the
need: it saves as an ordinary `tarot-spread` whose `layout` is `question`, and `layout` is an
unconstrained `CharField`, so the server needed no change at all. Nothing under `server/`, in
`readings/kinds.py`, in the migrations or in `rooms.js` was touched.

**The year spread stores the date it was dealt.** Its twelve month labels are computed from that
rather than from the clock, so a reading saved in March and reopened in September still shows the
months it was dealt for. `validDraw` requires the field on a year draw and rejects it on every
other spread, which is the half that mattered: every tarot reading already saved predates the
field, and a validator demanding it generally would have made all of them unreplayable. That was
proven by mutation before release — forcing the rule onto every spread fails four tests, two of
which predate this work.

Validation after the switch: all eight pages and the four tarot assets return 200 over HTTPS; the
three bumped cache keys confirmed on `/tarot/`; the served engine carries all three new spreads,
the options and the deal-date field; the served section script passes the options and labels the
wheel. In a browser at ishtarinsights.com the picker offers six spreads with the Celtic Cross
still default, the year wheel deals thirteen cards labelled October 2026 through September 2027,
and the month reaches the accessible label as well as the visible one. Only console error is the
signed-out 401 from `/api/account/`. Conventions: `docs/FULL-READINGS.md`.

## 2026-09-14 The tarot card reference

Deployed `1b778e8`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-card-reference-1b778e8`, a `cp -al` hardlink copy
of `20260914-void-brief-69f02a5` with four files replaced and one added: `tarot/index.html`,
`tarot.js`, `tarot-readings.js`, `tarot-readings.css`, and the new `tarot-reference.js`. Gated on
`current` pointing at the expected previous release and on the sha256 of all four replaced files.
Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-void-brief-69f02a5 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: every one of the 78 cards now carries a standalone reference paragraph and its
traditional attribution, shown in the card detail dialog. The reading room's third tab is renamed
from "Explore deck" to "Card reference", an About disclosure names the Golden Dawn and cites
*Book T*, and every card has a URL at `/tarot/?card=<slug>`. Suite 420 to 439.

Cache keys: `tarot-reference.js?v=1`, `tarot.js?v=5`, `tarot-readings.js?v=accounts-4`,
`tarot-readings.css?v=2`.

**`tarot-reference.js` ships at `?v=1` deliberately.** It is a new path that production had never
served, so there is no cached response to bust and no earlier `?v=` value a client could hold. The
release script asserts the file is absent from the previous release before switching, so a
surprise existing copy would stop the deploy rather than ship a stale key.

**One failure, caught by the gate.** The first run aborted and rolled back with
`the served tarot-reference.js has 79 REFERENCE entries, expected 78`. The release was correct and
the assertion was wrong: `grep -c 'REFERENCE\['` counts every line mentioning the object, which
includes the `entry()` accessor that reads it, not only the 78 assignment lines. Narrowing the
pattern to `REFERENCE\[[0-9]*\] =` fixed it. The rollback worked exactly as intended — `current`
returned to the previous release and the site stayed up throughout — but the aborted release
directory survives a rollback and has to be removed by hand before re-running, because the script
refuses to overwrite an existing release. Worth recording twice over: a verification gate can fail
on the passing path, and a gate that is wrong costs a deploy cycle rather than a broken site.

Validation after the switch: all eight pages and the four tarot assets return 200 over HTTPS; the
four bumped cache keys are confirmed on `/tarot/`; the string "Explore deck" is absent from the
served page; the served `tarot-reference.js` carries exactly 78 assignments plus the decan
derivation and the slug lookup; the served `tarot.js` reads the reference and carries the
card-URL handling. In a browser at ishtarinsights.com the module resolves with all 78 entries
filled, `?card=the-star` opens The Star directly with its attribution and a 527-character entry,
the header reads card-centrically, the About cites *Book T*, and there is no horizontal overflow
at 390px with the dialog fitting the viewport. Only console errors are the signed-out 401s from
`/api/account/`. Conventions and sources: `docs/TAROT-REFERENCE.md`.

## 2026-09-14 A short void framing for the month tab

Deployed `69f02a5`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-void-brief-69f02a5`, a `cp -al` hardlink copy of
`20260914-nav-scale-5384daf` with three files replaced: `sky-calendar-text.js`, `sky-calendar.js`
and `sky/index.html`. Gated on `current` pointing at the expected previous release and on the
sha256 of all three live files, not just one. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-nav-scale-5384daf /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: the void strip on the month tab opened with the same 1078-character passage the Moon tab
carries, which is an essay in front of a table on a tab whose job is to list what happens this
month. It now opens with a 358-character `brief` that stands alone for a reader who never opens
the Moon tab: what void of course means, that two traditions count different planets, and which
way the containment runs. The Moon tab still renders the full passage and is named as the place
the reasoning lives.

Cache keys: `sky-calendar-text.js?v=2` and `sky-calendar.js?v=7` on `/sky/`.

Validation: all eight pages and the four sky assets return 200 over HTTPS; both bumped cache keys
confirmed on `/sky/`; the served text module contains the brief and the served section script
reads `T.voidFraming.brief`. In a browser at ishtarinsights.com the month tab's intro measures 358
characters above 14 void rows and does not contain the full passage, while the Moon tab does. Only
console error is the signed-out 401 from `/api/account/`.

## 2026-09-14 Void bar scaling and a centred nav

Deployed `5384daf`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-nav-scale-5384daf`, a `cp -al` hardlink copy of
`20260914-void-bands-75a182d` with eleven files replaced: `site-shell.css`, all eight page
`index.html` files (for the shell cache key), `sky-calendar.js` and `sky-calendar.css`. Gated on
the live `site-shell.css` sha256 and on `current` pointing at the expected previous release.
Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-void-bands-75a182d /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: the month view's void bars are drawn to length against the displayed month's longest
period rather than all being full width, with the scale stated above the list and floors of 2%
and 12px keeping the briefest legible. The section nav is centred rather than flush left, which
is one property on the shared shell stylesheet and therefore lands on all eight pages.

Cache keys: `site-shell.css?v=3` on all eight pages, `sky-calendar.css?v=6` and
`sky-calendar.js?v=6` on `/sky/`.

**One failure, caught by the gate.** The first run aborted with
`LIVE_SKY_SHA: parameter not set` — the release script was adapted from the previous one and two
references to the old gate variable survived the edit. Nothing had been written: `set -eu` and
the explicit `fail` stopped it before `cp -al`, no release directory existed afterwards, and
`current` still pointed at the previous release. Worth noting only as evidence the gate earns its
place even when the thing that breaks is the deploy script rather than the site.

Validation: all eight pages and the three changed assets return 200 over HTTPS;
`site-shell.css?v=3` confirmed on every one of the eight pages, which is what stops a returning
reader keeping the old left-aligned nav from cache; the served stylesheet contains
`justify-content: center`. In a browser at ishtarinsights.com the nav on `/charts/` sits with 96px
of equal space each side and still marks the current page, and `/sky/` renders 14 void bands with
14 distinct widths, the widest 706px against a stated 25.0-hour scale and the narrowest 18px at
the floor. Only console error is the signed-out 401.

## 2026-09-14 Month void bands

Deployed `75a182d`. **Static only** — no backend change, no migration, no service restart.

Released as `/opt/tarot-game/releases/20260914-void-bands-75a182d`, a `cp -al` hardlink copy of
`20260914-sky-e8fe95c` with four files replaced: `sky/index.html`, `sky-calendar.js`,
`sky-calendar-engine.js` and `sky-calendar.css`. Script `/tmp/ishtar-voidbands.sh` gated on the
live `sky/index.html` sha256 and on `current` pointing at the expected previous release, switched
with `mv -Tf`, and rolled back on any failed check. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260914-sky-e8fe95c /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

**This release used the corrected extraction form** recorded in the entry below: the regular
files are unlinked by hand and then extracted, rather than with `tar --unlink-first`, which fails
on the page directories now that they exist. It ran first time.

Change: the month view gains a void-of-course strip below the grid and the day detail — one row
per period with the sign the Moon is crossing, both traditions' starts, the shared closing
ingress, and a proportional bar with the modern stretch inside the classical one. `monthEvents`
returns a `voids` key beside `events`, as a lazy memoised getter so the month view is not charged
for bands it does not read. The four day-cell marks and their legend are unchanged. This closes
the deferral the sky branch's whole-branch review recorded.

Cache keys: `sky-calendar.css?v=5`, `sky-calendar-engine.js?v=3`, `sky-calendar.js?v=5`.
`sky-calendar-text.js` is unchanged and stays at `?v=1`.

Validation: all eight pages and all five sky assets return 200 over HTTPS; `/sky/` references the
three new cache keys; the served JavaScript and CSS contain the strip's own markup, `voidBands`
and the strip styles; `/api/health/` is unaffected. In a browser at ishtarinsights.com the month
tab opens in 907 ms, renders 14 bands with both ends carrying their date and the reader's offset,
the day detail sits 24 px below the grid with the strip after it, and the grid still shows its
original 24 cell marks and 4 legend items. Only console error is the signed-out 401.

## 2026-09-14 Sky calendar and the transit-calendar reading kind

Deployed `e8fe95c` (the squash of the sky branch) in two stages, backend first so the new
reading kind existed before any page could post it.

**Backend.** `server/ishtar` shipped with `git archive` to `/tmp/ishtar-app-src`, CRs stripped,
then `sudo sh /tmp/deploy-app.sh`. Migration `readings.0004_alter_reading_kind` applied; all four
readings migrations now show applied. The database was copied to
`/var/backups/ishtar-app/db-predeploy-20260914-010840.sqlite3` first. `ishtar-app` restarted at
01:08:59 UTC, confirmed by `ActiveEnterTimestamp` against the clock, and `/api/health/` returns
`{"ok": true}`. The restart is the part that matters: `KINDS` is read into module scope at
import, so an unrestarted worker answers `Unknown reading kind.` for every save. This exact
failure was reproduced in development before the deploy, which is why the check is explicit here.

**Frontend.** Released as `/opt/tarot-game/releases/20260914-sky-e8fe95c`, a `cp -al` hardlink
copy of `20260913-site-foundation-bf30483` with thirteen changed or added runtime files replaced.
Script `/tmp/ishtar-sky.sh` gated on the live `sky/index.html` sha256 and on `current` pointing at
the expected previous release, and additionally refused to run unless the deployed backend's
`kinds.py` already contained `transit-calendar`, so the frontend cannot precede the backend even
by mistake. It asserted a link count of 1 on every replaced file before editing it, re-checked
the previous release afterwards, switched `current` with `mv -Tf`, then curl-checked and rolled
back on any failure. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260913-site-foundation-bf30483 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

**One correction during the deploy.** The first run failed at extraction: `tar --unlink-first`,
which the two previous releases used safely, tries to unlink directory entries as well as files,
and the seven page directories now exist and are non-empty. The gate worked exactly as intended,
the run aborted before the symlink switch, the live site was untouched and the previous release
was verified byte-identical afterwards. The script now unlinks the regular files by hand, which
is what breaks the hardlink, and then extracts normally. **Any future delta release that touches
files inside an existing directory needs this form, not `--unlink-first`.**

Change: `/sky/` gains the `#sky-calendar` section below the daily horoscope, with four tabs —
Moon now, this month, retrogrades, and a personal transit calendar saveable to the journal.
New files `sky-calendar-engine.js`, `sky-calendar-text.js`, `sky-calendar.js`, `sky-calendar.css`.
Changed: `sky/index.html`, `account/index.html` (the Sky filter chip), `rooms.js`, and the
`rooms.js` cache key on all eight pages. No nginx, DNS or storage change; the `try_files` rule and
the `Cache-Control: no-cache` header from the site-foundation deploy already cover this release.

Validation: all eight pages plus the four new files and `rooms.js` return 200 over HTTPS;
`rooms.js?v=sky-1` confirmed present on every one of the eight pages, which is what keeps the
journal's Open working for a saved calendar; `/sky/` serves `id="sky-calendar"`,
`data-room="transit-calendar"` and the new scripts; `/account/` serves the Sky chip; `rooms.js`
maps `transit-calendar` to `/sky/` with its label. In a browser at ishtarinsights.com all four
tabs render, the Moon headline reads the current phase and sign with the instant in the reader's
own zone, and the only console error is the signed-out `/api/account/` 401.

**Deferred, recorded in the spec:** month void bands. `voidPeriods` is implemented and tested but
has no product caller; the Moon tab shows the current void state, the month grid does not.

## 2026-09-13 Site foundation: hub, seven topic pages, registry-driven journal

Deployed `bf30483` (the squash of the site-foundation branch) in two stages, backend first so
the schema was ready before any page could post to it.

**Backend.** `server/ishtar` shipped with `git archive` to `/tmp/ishtar-app-src`, CRs stripped,
then `sudo sh /tmp/deploy-app.sh`. Migration `readings.0003_reading_summary_category` applied
(widens `kind` to 32 characters, adds `summary` and `category`, backfills `category` for existing
rows); `showmigrations readings` now shows 0001-0003 all applied. `createcachetable` was already
present. The database was copied to `/var/backups/ishtar-app/db-predeploy-20260913-190818.sqlite3`
first. `ishtar-app` restarted and `/api/health/` returns `{"ok": true}`.

**Frontend.** Released as `/opt/tarot-game/releases/20260913-site-foundation-bf30483`, a `cp -al`
hardlink copy of `20260912-celestial-hero-b49d472` with only the 34 changed or added runtime files
replaced. Script `/tmp/ishtar-site-foundation.sh` gated on the live `index.html` sha256 and on
`current` pointing at the expected previous release, extracted the delta with `tar --unlink-first`,
asserted every replaced file had a link count of 1 before editing it (so the previous release was
never written through), deleted `app.js`, re-checked the previous release's `app.js` and
`index.html` afterwards, switched `current` with `mv -Tf`, then curl-checked and rolled back on any
failure. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260912-celestial-hero-b49d472 /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current`.

Change: the single page becomes a hub plus `/tarot/`, `/sky/`, `/charts/`, `/eastern/`,
`/numerology/`, `/divination/` and `/account/`, each with its own title, description and Open
Graph tags; `site-shell.js` renders the shared masthead, nav, footer and storage notice;
`app.js` is deleted and replaced by `birth-lore.js`, `deck-archive.js`, `tarot.js`,
`natal-room.js`, `chinese-room.js` and `birth-form.js`; `birth-profile.js` owns the birth profile
for every page; the journal is registry-driven with category chips and a text filter. New root
files `robots.txt` and `sitemap.xml`.

**Nginx: no change was needed.** The site's `location /` already read `try_files $uri $uri/ =404;`
and already sent `Cache-Control "no-cache"`. The first meant the seven directory pages resolved
immediately; the second meant no browser could serve a stale `index.html` referencing the deleted
`app.js` without revalidating, which was the one new failure mode this release introduced.
`deploy-app.sh` ran `nginx -t` and reloaded as part of the backend stage.

Validation: all eight pages, `robots.txt`, `sitemap.xml` and `cookie-policy.html` return 200 over
HTTPS; every URL in `sitemap.xml` returns 200; `/tarot` and `/eastern` without a trailing slash
return 301 to the slashed form, confirming `try_files` rather than a per-path fluke; `/app.js`
returns 404; every script referenced by `/charts/` returns 200; `www.ishtarinsights.com` serves
the same release. In a browser, `/charts/` renders all five sections with `SiteShell`, `Rooms`,
`BirthProfile` and `BirthRoom` present and "Charts" marked `aria-current`, and the hub renders
seven category cards and a today strip reading the Moon phase in the browser. The only console
error is the signed-out `/api/account/` 401.

## 2026-09-12 Celestial hero layout

Deployed `b49d472` as `/opt/tarot-game/releases/20260912-celestial-hero-b49d472`, a hardlink
copy (`cp -al`) of `20260912-birth-saving-480e650` with index.html and styles.css unlinked and
replaced, plus three new files under assets: celestial-hero.webp (desktop background),
celestial-hero-900.webp (phone background) and ishtar-insights-logo-hero.webp (white-wordmark
lotus with the plum background keyed out). Script `/tmp/ishtar-hero-b49d472.sh` gated on the
live index.html and styles.css hashes, checked the copies were no longer hardlinked before
stripping CRs, switched `current` atomically and curl-checked the page plus the three assets,
rolling back on failure. Previous release retained for rollback:
`ln -sfn /opt/tarot-game/releases/20260912-birth-saving-480e650 /opt/tarot-game/current`.

Change: the paper masthead is replaced by the "02 / Celestial" hero (Codex's sky artwork as a
cover background, centered logo, new headline and calls to action, three-item strip). The
sticky section nav, account button and deck-count span are unchanged. Cache keys:
styles.css?v=celestial-hero-1, account.css?v=celestial-hero-1. No backend, nginx or storage change.

Validation: all five deployed files hash-match the commit over HTTPS (CRs stripped); both
hostnames return 200; browser at 1440px shows the hero with the moon phases between the calls
to action and the strip; the only console error is the signed-out `/api/account/` 401.

## 2026-09-12 Birth-detail saving fix and account preference

Deployed `480e650` as `/opt/tarot-game/releases/20260912-birth-saving-480e650`, retaining
`20260912-newsletter-6dfc54a` for frontend rollback. Updated accounts/models.py, views.py,
urls.py and migration `0004_user_save_birth_details` in `/opt/ishtar-app/app` and restarted
the account service. Migration applied successfully. Verified database backup and previous
backend modules are in `/opt/ishtar-app/rollback/20260912-birth-saving-480e650` (private).
Backend rollback can restore the three old modules and restart; the additive column may remain.
Do not restore the database snapshot over subsequent user activity for a code-only rollback.

Fixes: `returnLocation` from the current birth form was rejected by the account profile API;
guest details held only in memory were skipped when reconciling after sign-in. Both now save.
Added a persistent account-saving switch, immediate-save button, edit link, and account-area
browser-preference control. Turning account saving off deletes the cloud profile and blocks
new saves server-side; it does not turn off account sessions or subscribe/unsubscribe emails.
Saving defaults to on to retain existing account behavior. Details rejected before this fix
must be entered again if they are no longer on the reader's open page.

Validation: 317 JS tests and 60 Django tests pass; migrations check clean. Browser with an
isolated local Django database exercised decline browser saving → guest birth date/time and
confirmed Portland birthplace → account creation → reload with all fields restored, saving
off → reload empty with toggle off, then saving on → newly entered details restored. Mobile
390px had no overflow; the browser-saving prompt can be reopened from the account area.
Both HTTPS hostnames match all seven committed frontend files; all four backend files match;
live health returns 200 and the page loads without console errors. No real account details or
subscription preferences were changed by testing.

## 2026-09-12 Newsletter signup visibility

Deployed `6dfc54a` to `/opt/tarot-game/releases/20260912-newsletter-6dfc54a`; previous
`20260912-daily-horoscope-fc1a2bd` retained for rollback. Seven runtime files updated.
The signup fieldset hides and disables for subscribed accounts or after a successful signup.
Account preference changes restore it when unsubscribed. Guest signup success stores only
`arcana-newsletter-subscribed-v1` through the consent-aware IshtarStorage wrapper. Turning off
optional saving removes the persisted flag; the unsubscribe page clears it after success.
Existing anonymous subscribers from before this change need to sign in or complete the
idempotent signup again for the browser to recognize them. Account preferences remain authoritative.

Validation: 315 JS tests pass; local browser with mock account API verified already subscribed,
unsubscribe, and resubscribe flows, with the confirmation outside the hidden form. Both live
hostnames serve all seven files matching the commit; API health 200 and no live console errors.
No actual subscriptions were created or removed during testing. No backend changes.

## 2026-09-12 Daily horoscope deployment

Deployed frontend commit `fc1a2bd` as `/opt/tarot-game/releases/20260912-daily-horoscope-fc1a2bd`.
Previous release `/opt/tarot-game/releases/20260912-chart-colours` is retained for rollback.
The six changed runtime files were archived from the commit and overlaid on a hardlink copy
using `tar --unlink-first`, preserving the old release's files. Baseline hashes were checked
before deployment, and `current` was replaced atomically. No backend or nginx changes.

New section `#daily-horoscope` offers all twelve signs, a dated daily reading, lunar theme,
relationships/work/growth prompts, and a reflection question. It follows the birth-profile
sign unless manually overridden, refreshes at local midnight, and works in mobile disclosures.
See `docs/DAILY-HOROSCOPE.md` for calculation and repeat-theme conventions.

Validation: 310 JavaScript tests pass. Browser checks covered automatic sign selection,
manual override across profile changes, restoring the birth sign, and no horizontal overflow
at 390px. All six runtime files match the committed bytes on both HTTPS hostnames; account
health returns 200 with `{"ok":true}`. Live horoscope rendered without browser console errors.

Rollback: create a temporary symlink to `/opt/tarot-game/releases/20260912-chart-colours`,
then use `mv -Tf` to atomically replace `/opt/tarot-game/current`.

Live URLs: https://ishtarinsights.com/ and https://www.ishtarinsights.com/

Deployed 2026-09-09 from clean commit e11196f. SSH alias: `vps` (129.121.126.72).
Hover is the registrar; authoritative DNS is ns1.bluehost.com / ns2.bluehost.com.
Both hostnames have A records pointing to the VPS.

Nginx site: `/etc/nginx/sites-available/ishtarinsights.com`.
Web root: `/opt/tarot-game/current`, symlink to `/opt/tarot-game/releases/20260909-e11196f`.
The release contains index.html, root JavaScript/CSS, assets, tarot-decks, and vendor from Git.
No build step or application service is needed.

TLS is managed by Certbot for both names, with HTTP redirected to HTTPS.
Initial certificate expires 2026-12-08; certbot.timer is active for renewal.

For updates, archive the runtime paths from the desired clean Git commit, upload and extract
into a new release directory, then atomically replace the current symlink. Retain the previous
release for rollback. Never deploy the repository metadata, secrets, or source art directory.
Nginx configuration changes require `nginx -t` before reload.

Validation: both HTTPS hostnames return 200; all local assets referenced by the homepage,
the city index, and sample deck front/back images return 200. HTTP redirects to HTTPS.

## 2026-09-09 divination release

Current web root now points to `/opt/tarot-game/releases/20260909-divination`.
This release copies the prior live runtime (including consent and newsletter UI) and adds
Lenormand/oracle/runes/geomancy. Previous runtime is retained at
`/opt/tarot-game/releases/20260909-e11196f` for rollback. The Python newsletter service and
private subscriber database are outside both releases and were not changed by this update.

## 2026-09-09 GPT Image 2 artwork release

Current web root: /opt/tarot-game/releases/20260909-divination-art-v2.
Previous release /opt/tarot-game/releases/20260909-divination is retained for rollback.
Overlaid index.html, styles.css, divination.js/css, divination-art.js and
assets/divination-v2 (206 WebP files: 103 thumbnails and 103 detail images).
Generated masters and prompt files remain local. No newsletter service/database changes.
Validation: all 210 checked live page/script/art URLs returned successful responses;
all 206 WebP files decoded at expected dimensions. 72 existing tests pass.
Browser QA: reveals, artwork Face/Back dialog, rune symbols, geomancy shield,
and 320/390px responsive layouts. Removed the root 320px minimum width to avoid
scrollbar-induced overflow at a 320px viewport. Changes deployed from the working tree;
not committed or pushed by this release operation.

## 2026-09-09 Resend transactional email

Login codes for the accounts service (docs/superpowers/plans/2026-09-09-accounts.md) are sent
through Resend. Account team `castshadow`, owner glenn@castshadow.com, signed up via GitHub.
Free tier: 3,000 emails/month, 100/day, 3 domains. The 100/day cap is the limit that would
force a Pro upgrade; nothing else about the tier constrains this project.

Sending domain is the apex `ishtarinsights.com` (Resend domain id
b754ed9e-a723-41a0-9a68-2f16530a6bd5, region us-east-1 to match the Ashburn VPS). The apex was
chosen over a `send.` subdomain because the domain carried no existing mail at all, so there was
no sending reputation or SPF conflict to isolate, and `hello@ishtarinsights.com` is a better
sender for a login code. Verified 2026-09-09 16:19.

DNS is edited only through the Bluehost account panel: My Account > Domains > ishtarinsights.com
> Manage Advanced DNS Records. Neither shared cPanel account can reach this zone -- `cpapi2
ZoneEdit fetchzone` from both box2042 (vegbycmy) and box5508 (gkdesig2) returns "You do not
possess permission to read the zone". The zone lives at Bluehost account level. Records added:

    TXT    resend._domainkey   p=MIGfMA0G...lPiQIDAQAB   (DKIM)
    CNAME  rsend               rsend.forge.rmta.net      (sending)
    CNAME  send                send.forge.rmta.net       (sending)
    TXT    _dmarc              v=DMARC1; p=none;         (monitoring only)

Both A records for @ and www were left untouched. There is no classic `v=spf1` TXT record --
Resend delegates sending through the two CNAMEs, so adding a mail provider later will not
collide. Resend's "Enable Receiving" MX record (inbound-smtp.us-east-1.amazonaws.com) was
deliberately NOT added: it would route all inbound mail for the domain into Resend and block
real mailboxes on the domain. Add it only if inbound mail is ever wanted.

Credentials live in `/etc/ishtar-app.env`, mode 600, owned by root, holding `RESEND_API_KEY` and
`DJANGO_FROM_EMAIL`. The remaining variables from the accounts plan (DJANGO_SECRET_KEY,
DJANGO_ALLOWED_HOSTS, DJANGO_CSRF_TRUSTED_ORIGINS, NEWSLETTER_ORIGINS) are added when the
Django service is deployed. Values containing spaces must stay quoted so the file can be sourced
by a shell as well as read by systemd `EnvironmentFile`. The key is a sending-only key scoped to
ishtarinsights.com named `ishtar-app-vps`; it cannot create domains or read account data.

Validation: a live message was sent from the VPS with
`set -a; . /etc/ishtar-app.env; set +a` and a curl POST to https://api.resend.com/emails,
returning HTTP 200 and id 7cb8ee77-8c69-48c8-97d1-d2cf7a14e226, which Resend recorded as Sent
and then Delivered at 16:22.

## 2026-09-10 Accounts service

Django account service at /opt/ishtar-app (unit `ishtar-app`, gunicorn on 127.0.0.1:8138, SQLite at
/var/lib/ishtar-app/db.sqlite3, env /etc/ishtar-app.env with all six variables). Nginx proxies
/api/account/, /api/readings/, /api/health/, /_allauth/, /admin/ and /static/ to it; the pre-change
site file is kept at /etc/nginx/sites-available/ishtarinsights.com.before-accounts. Nightly backups
run from /etc/cron.d/ishtar-app-backup at 03:17 into /var/backups/ishtar-app (first backup taken
by hand on deploy day: 18 tables, integrity ok). Superuser glenn@castshadow.com was created with a
one-time password handed over in chat; change it in /admin/.

Deploy path from Windows (no local rsync): ship the committed tree with `git archive`, then strip
CRLF on the VPS because this repo stores CRLF blobs and `sh` rejects them:

```bash
ssh vps 'rm -rf /tmp/ishtar-app-src && mkdir -p /tmp/ishtar-app-src'
git archive --format=tar HEAD server/ishtar | ssh vps 'tar -xf - -C /tmp/ishtar-app-src --strip-components=2'
git archive --format=tar HEAD server/ishtar-app.service server/deploy-app.sh server/nginx-ishtar-app.conf server/backup-ishtar-app.sh | ssh vps 'tar -xf - -C /tmp --strip-components=1'
ssh vps 'sed -i "s/
$//" /tmp/deploy-app.sh /tmp/backup-ishtar-app.sh /tmp/ishtar-app.service /tmp/nginx-ishtar-app.conf && find /tmp/ishtar-app-src -type f -exec sed -i "s/
$//" {} +'
ssh vps 'sh /tmp/deploy-app.sh'
```

The deploy's final health check must send the real Host header (fixed in deploy-app.sh); Django
answers 400 DisallowedHost to a bare `127.0.0.1:8138` request, which is not a service failure.

Newsletter cutover: the existing subscriber row was imported with `manage.py import_subscribers`
(idempotent; re-run it after the nginx switch to catch signups that landed in the old database in
between). The nginx `/api/newsletter/` block is switched to `location ^~ /api/newsletter/` proxying
8138 (see docs/ACCOUNTS.md, "Newsletter cutover"); the pre-cutover site file is saved as
ishtarinsights.com.before-cutover. After a live 200/403/200 contract check the old unit is stopped
with `systemctl disable --now ishtar-newsletter`; its database stays at
/var/lib/ishtar-newsletter/subscribers.sqlite3 for rollback.

Frontend release for this change: /opt/tarot-game/releases/20260910-accounts, created as a
hardlink copy (`cp -al`) of 20260909-divination-art-v2 with the committed runtime files extracted
over it from `git archive HEAD` (index.html, the four root html pages, root js/css, vendor, assets,
tarot-decks). Cache keys: styles.css?v=accounts-2, account.js/app.js/tarot-readings.js/
divination-engine.js/divination.js ?v=accounts-3, storage-preferences.js ?v=accounts-1.

Rollback: `systemctl stop ishtar-app`, restore the nginx site from
ishtarinsights.com.before-accounts (or .before-cutover to undo only the newsletter switch),
`nginx -t && systemctl reload nginx`, `systemctl start ishtar-newsletter`, and point
/opt/tarot-game/current at /opt/tarot-game/releases/20260909-divination-art-v2.

## 2026-09-11 Chart in time release

Current web root: /opt/tarot-game/releases/20260911-chart-in-time, a hardlink copy (`cp -al`) of
20260910-accounts with the committed runtime files from main 6701c14 extracted over it
(`git archive` of index.html, the root html pages, root js/css, vendor, assets, tarot-decks).
Previous release 20260910-accounts is retained for rollback (point the `current` symlink back at it).
New files: bi-wheel.js, chart-in-time-engine.js, chart-in-time-text.js, chart-in-time.js,
chart-in-time.css. Rekeyed: natal-engine.js?v=chart-in-time-1, app.js?v=chart-in-time-1,
celestial-extras.js?v=2, mobile-sections.js?v=divination-2. No server-side or account-service
change; the Django service and nginx are untouched. Validation: every new asset and the rekeyed
scripts return 200 over HTTPS, /api/health/ still answers, the section renders with the sample
chart, and the node suite is 134 passing. Conventions and independent validation are in
docs/CHART-IN-TIME.md.

## 2026-09-11 Chinese traditions release

Deployed 2026-09-11 from main f3461d7 as /opt/tarot-game/releases/20260911-chinese-traditions
(hardlink copy of 20260911-chart-in-time with the committed runtime files extracted over it);
previous release retained for rollback. Glenn ran `sh /tmp/deploy-app.sh` for the service step
(migration readings.0002_reading_kind_iching applied, ishtar-app restarted, /api/health/ ok), then
the frontend symlink was swapped. Live checks: all ten rekeyed files return 200 over HTTPS, the
divination room lists I Ching as the fifth practice, node suite 197 passing, Django 56 passing.
Originally planned on branch `chinese-traditions`, merged to main before deploy. Deepens the Four Pillars tab
(hidden stems, Ten Gods, luck pillars) and adds I Ching as a fifth divination practice.
Conventions and validation are in docs/EXTENDED-ATLAS.md ("BaZi conventions") and
docs/DIVINATION.md ("I Ching").

Ten rekeyed frontend files, cache-bust `?v=` bumped on each: `celestial-extras.css?v=2`,
`divination.css?v=iching-1`, `account.js?v=iching-1`, `celestial-extras-engine.js?v=2`,
`celestial-extras.js?v=3`, `divination-data.js?v=2`, `divination-engine.js?v=iching-1`,
`divination-art.js?v=iching-1`, `divination.js?v=iching-1`, `mobile-sections.js?v=iching-1`.
No other root JS/CSS files changed. New development-only files that do not ship:
`tools/build_bazi_fixtures.py`, `tests/fixtures/bazi-reference.json`, `tests/bazi.test.cjs`,
and the new cases in `tests/divination.test.cjs`.

Django change: `readings` app migration `0002_reading_kind_iching` adds `('iching', 'I Ching')`
to `Reading.KINDS`, which the view derives its allowed kinds from. Deploying this release
therefore needs, in addition to the usual frontend release copy, a `manage.py migrate` on the
VPS and a restart of the `ishtar-app` service to run the updated code (the existing
`server/deploy-app.sh` flow used for the accounts service handles both). Until that redeploy
happens, the live server is still running the old code and does not recognize `iching` as a
kind, so a signed-in reader who saves an I Ching reading gets the existing "Unknown reading
kind." error; this is expected and acceptable for the interval between merge and deploy, and
resolves itself once the service is redeployed. No other server-side or nginx change is needed.

## 2026-09-12 Jyotish (sidereal chart) release

Merged to main at f2b9c38 and deployed 2026-09-12 in the combined release described under
"2026-09-12 Jyotish + Horary deployment" below. Adds a fourth astrology section to the celestial atlas: a
sidereal (Lahiri) reading of the same calculated birth chart, with rashi/bhava placements,
nakshatras, Vimshottari dashas and a navamsa (D9) chart in South and North Indian formats.
Conventions and independent validation are in docs/JYOTISH.md, cross-linked from
docs/NATAL-CHART.md and docs/CHART-IN-TIME.md.

Five new frontend files, each starting at cache-bust `?v=1` per convention: `jyotish-engine.js`,
`jyotish-chart.js`, `jyotish-text.js`, `jyotish.js` and `jyotish.css`. Two rekeyed files:
`app.js?v=jyotish-1` (attaches the new section) and `mobile-sections.js?v=jyotish-1` (adds it to
the mobile fold). `index.html` gains the new nav link, section markup and script/style tags for
the five new files. No Django or nginx change; the section reads the existing saved birth
profile through `setBirthChart` and adds no storage keys.

Development-only files that do not ship: `tools/build_jyotish_fixtures.py`,
`tests/fixtures/jyotish-reference.json`, `tests/jyotish.test.cjs`, `tests/jyotish-text.test.cjs`
and `tests/jyotish-chart.test.cjs`.

Validation: `node --test tests/*.test.cjs` is 247 passing (43 + 2 + 5 = 50 of them Jyotish-
specific). Browser QA (DOM-verified): all four tabs render with the sample chart, both chart
formats produce all twelve `[data-sign]` house groups in both the rashi and navamsa charts,
dasha mahadasha selection updates the antardasha table, no console errors originate from the
section, no horizontal overflow at 390px, and neighbouring sections are unaffected. Signed-in
state was not exercised, since this section is read-only against the saved profile.

## 2026-09-12 Horary release

Merged to main at 1664713 and deployed 2026-09-12 in the combined release described below. Adds a fifth astrology section to the celestial atlas: a
chart cast for the moment a question is asked, judged by William Lilly's seventeenth-century
method (*Christian Astrology*, 1647) -- considerations before judgment, significators and their
dignities, perfection by aspect/reception/translation/collection, a planetary-hours table, and
a lightweight "Elect a moment" view. Presented throughout as historical practice, never as a
reading of the visitor's actual question. Conventions and independent validation are in
docs/HORARY.md, cross-linked from docs/NATAL-CHART.md (the new Regiomontanus house system,
which the natal chart itself does not default to).

Six new frontend files, each starting at cache-bust `?v=1`: `classical-engine.js`,
`horary-engine.js`, `horary-text.js`, `horary-chart.js`, `horary.js` and `horary.css`. Three
rekeyed files: `natal-engine.js?v=horary-1` (gains the Regiomontanus house system),
`app.js?v=horary-1` (attaches the new section) and `mobile-sections.js?v=horary-1` (adds it to
the mobile fold). `index.html` gains the new nav link, section markup and script/style tags for
the six new files. No Django or nginx change; the section reads the existing saved birth
profile only for its default place and writes nothing back -- the question text stays in page
memory and is never stored or sent.

Development-only files that do not ship: `tools/build_horary_fixtures.py`,
`tests/fixtures/horary-reference.json`, `tests/horary.test.cjs`, `tests/horary-text.test.cjs`
and `tests/horary-chart.test.cjs`.

Validation: `node --test tests/*.test.cjs` is 301 passing (26 classical + 3 horary + 2
horary-text + 8 horary-chart + 12 of `tests/natal-engine.test.cjs`'s 31 are Horary/Regiomontanus-
specific). Browser QA (DOM-verified): casting the default chart renders the wheel (12 cusp
groups, 9 planet groups), the considerations list and the hour line; all four tabs
(question/significators/hours/elect) switch correctly; the significators tab shows exactly 3
cards; the planetary-hours tab shows a 24-row table with exactly one current-hour row; the
elect tab shows a 7-row dignity table; no console errors originate from any horary asset (only
the expected `/api/account/` 404s, absent a running accounts backend); no horizontal overflow
at 390px; and neighbouring sections are unaffected. Signed-in state was not exercised, since
this section only reads the saved birth profile for its default place.

## 2026-09-12 Jyotish + Horary deployment

Deployed 2026-09-12 from main 1664713 as /opt/tarot-game/releases/20260912-jyotish-horary, a
hardlink copy (`cp -al`) of 20260911-chinese-traditions with the committed root html/js/css
extracted over it from `git archive HEAD` (53 files; assets, vendor and tarot-decks unchanged and
shared). Glenn ran `sh /tmp/deploy-20260912b.sh`, which created the release, stripped CRs from
the extracted text files, switched the `current` symlink and curl-checked the new URLs. Previous
release 20260911-chinese-traditions is retained for rollback
(`ln -sfn /opt/tarot-game/releases/20260911-chinese-traditions /opt/tarot-game/current`).

New files, all at `?v=1`: jyotish-engine.js, jyotish-text.js, jyotish-chart.js, jyotish.js,
jyotish.css, classical-engine.js, horary-engine.js, horary-text.js, horary-chart.js, horary.js,
horary.css. Rekeyed: natal-engine.js?v=horary-1 (Regiomontanus houses), app.js?v=horary-1,
mobile-sections.js?v=horary-1. No Django, nginx or storage change; /api/health/ unaffected.
Validation after the switch: every new and rekeyed URL above returned 200 over HTTPS, the current
symlink resolves to 20260912-jyotish-horary, and the node suite on the deployed commit is 302
passing. Conventions and independent validation: docs/JYOTISH.md and docs/HORARY.md.
