/* The page manifests: does each hand-written index.html load the scripts its own
   modules need, in an order that works?

   Two defects escaped this plan's reviews, and the Node suite structurally cannot see
   either: a module reached for `window.NatalEngine` when natal-engine.js declares a
   top-level `const` (a lexical global, never a window property), and a page's script list
   omitted a dependency (`birth-form.js` on /account/). Both are HTML-level wiring, so the
   check has to read the HTML. It does that with string matching -- no DOM library, no new
   dependency.

   DEPENDENCIES below is hand-derived from each module's source, not from static analysis.
   The rule used, for every entry:

     A module depends on another when it reads that module's global through a BARE
     identifier. A bare read throws ReferenceError if the declaring script is absent, so
     the declaring script must appear earlier in the page's list. `window.Foo?.bar` is NOT
     a dependency -- it evaluates to undefined instead of throwing, and that is how this
     codebase spells an optional peer (account.js's `window.BirthRoom?.currentProfile()`,
     tarot.js's `window.MobileSections?.reveal(...)`).

     One exception: a peer read behind a bare `typeof Foo !== 'undefined'` guard never throws,
     but it may still be listed when its absence would silently hide a feature on that page
     (chinese-room.js lists chinese-year.js for this reason), so a missing script tag fails
     here instead of quietly dropping the section.

   Some bare reads are guarded by a `document.querySelector('#some-id')` presence check --
   natal-room.js loads on three pages that each carry a different subset of its sections.
   Those are recorded as {when: '#id', needs: [...]} and are required only of a page whose
   HTML carries that id. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASTRONOMY = 'vendor/astronomy-engine/astronomy.browser.min.js';

// Every entry below was read out of the named file. The comment gives the read that
// establishes the dependency. Modules with no cross-module bare read have no entry.
const DEPENDENCIES = {
  // `IshtarAccountCore.createAccount(...)`, `Rooms.labelFor/get/pageFor`,
  // `IshtarStorage.getItem/setRemote`. BirthRoom and BirthProfile are reached through
  // `window.` with optional chaining, so they are deliberately not dependencies.
  'account.js': ['account-core.js', 'rooms.js', 'storage-preferences.js'],
  // `const astro = typeof Astronomy !== 'undefined' ? Astronomy : require(...)` -- in a
  // browser the require() fallback is itself a ReferenceError, so the vendor file is a
  // hard ordering requirement for every engine that opens this way.
  'natal-engine.js': [ASTRONOMY],
  'astrocartography-engine.js': [ASTRONOMY],
  'classical-engine.js': [ASTRONOMY, 'natal-engine.js'],
  'celestial-extras-engine.js': [ASTRONOMY, 'natal-engine.js'],
  'chart-in-time-engine.js': [ASTRONOMY, 'natal-engine.js'],
  'daily-horoscope-engine.js': [ASTRONOMY, 'natal-engine.js'],
  'horary-engine.js': [ASTRONOMY, 'natal-engine.js', 'classical-engine.js'],
  // `typeof ClassicalEngine/NatalEngine !== 'undefined' ? ... : require(...)` at module top level.
  'chart-depth-engine.js': [ASTRONOMY, 'natal-engine.js', 'classical-engine.js'],
  'chart-depth.js': ['chart-depth-engine.js'], // the same guarded top-level read of ChartDepthEngine.
  'jyotish-engine.js': ['natal-engine.js'],
  'sky-calendar-engine.js': [ASTRONOMY, 'natal-engine.js'],
  'bi-wheel.js': ['natal-engine.js'],
  // `typeof NatalEngine !== 'undefined' ? NatalEngine : require(...)` at module top level.
  'relationship-charts-engine.js': ['natal-engine.js'],
  'horary-chart.js': ['natal-engine.js'],
  'natal-chart.js': ['natal-engine.js'], // `const E = NatalEngine` at module top level.
  'sky-chart.js': ['natal-chart.js'], // `NatalChart.renderWheel(...)` in paint().
  // `typeof IshtarStorage !== 'undefined' && typeof NatalEngine !== 'undefined'` gates the
  // window.BirthProfile install: no throw, but the shared profile silently never appears.
  'birth-profile.js': ['storage-preferences.js', 'natal-engine.js'],
  'hub.js': ['site-shell.js', 'birth-lore.js', 'birth-profile.js'],
  // `SiteShell.NAV`, `const {...} = BirthLore`, `BirthProfile.subscribe(render)`.
  // Astronomy is NOT listed: hub.js's only use sits inside a try/catch that returns null,
  // so the hub degrades rather than breaking, and the hub does load the vendor file anyway.
  'deck-archive.js': ['archive-decks.js'], // `const decks = ArchiveDecks`.
  // `const {majorArcana, localDateKey} = BirthLore`, `.map(TarotReadings.enrichMinor)`,
  // `IshtarStorage.getItem(...)` and `Rooms.register(...)`, all at module top level.
  'tarot.js': ['birth-lore.js', 'tarot-readings.js', 'storage-preferences.js', 'rooms.js'],
  // `const D=DivinationData, E=DivinationEngine, art=DivinationArt.emblem, PC=PlayingCards` on
  // line 3, and `Rooms.register` for the eight divination kinds. `typeof IChingLines !==
  // 'undefined'` guards every read of it (hexagramOutput and the I Ching study panel), so it
  // never throws -- but its absence would silently drop the line texts, so it is listed anyway.
  'divination.js': ['divination-data.js', 'divination-engine.js', 'divination-art.js', 'playing-cards.js', 'rooms.js', 'iching-lines.js'],
  'daily-horoscope.js': ['daily-horoscope-engine.js'], // `DailyHoroscopeEngine.signNames` in attach().
  'astrocartography.js': ['astrocartography-engine.js', 'birthplace-search.js'],
  // `typeof RelationshipChartsEngine/RelationshipCharts/NatalChart` gate the Composite and Davison
  // switch in Two skies: no throw, but without them the switch silently never appears.
  'celestial-extras.js': ['birthplace-search.js', 'celestial-extras-engine.js', 'bi-wheel.js', 'natal-engine.js',
    'relationship-charts-engine.js', 'relationship-charts.js', 'natal-chart.js'],
  // ChartRooms.restoredGate() at attach; Rooms.register behind a typeof guard, but without it saving silently disappears.
  'chart-in-time.js': ['birthplace-search.js', 'chart-in-time-engine.js', 'chart-in-time-text.js', 'bi-wheel.js', 'natal-engine.js', 'chart-rooms.js', 'rooms.js'],
  // ChartRooms.placeFrom in castNow; Rooms.register behind a typeof guard, without it saving silently disappears.
  'horary.js': ['birthplace-search.js', 'horary-engine.js', 'horary-text.js', 'horary-chart.js', 'classical-engine.js', 'natal-engine.js', 'chart-rooms.js', 'rooms.js'],
  'jyotish.js': ['jyotish-engine.js', 'jyotish-text.js', 'jyotish-chart.js', 'natal-engine.js'],
  // `const E = SkyCalendarEngine, T = SkyCalendarText` at module top level; `NatalEngine.calculate`
  // for the sample chart and for a saved calendar's birth snapshot; `BirthProfile.subscribe` and
  // `Rooms.register('transit-calendar', ...)` in the self-attach block at the file's end.
  'sky-calendar.js': ['sky-calendar-engine.js', 'sky-calendar-text.js', 'natal-engine.js', 'birth-profile.js', 'rooms.js'],
  // `BirthProfile.subscribe` whose callback calls `BirthLore.birthdayParts` and
  // `BirthdayInsights.renderChinese/chineseProfile`; the callback fires on subscribe.
  // `typeof ChineseYear !== 'undefined'` gates the animal-year section under the portrait:
  // no throw, but without it the section silently never appears.
  'chinese-room.js': ['birth-lore.js', 'birth-profile.js', 'birthday-insights.js', 'chinese-year.js'],
  // `NumerologyEngine` at top level (typeof-guarded only for Node); `BirthdayInsights.renderNumbers` in the
  // studio template; `typeof BirthProfile`/`typeof BirthLore` gate the subscriber; `typeof Rooms` gates
  // the journal registration, so without rooms.js the numerology kind never registers.
  'numerology.js': ['numerology-engine.js', 'birthday-insights.js', 'birth-profile.js', 'birth-lore.js', 'rooms.js'],
  // `const {localDateKey} = BirthLore`, `BirthplaceSearch.attach(...)` and
  // `BirthProfile.save/subscribe/setReturnLocation`. Chart in Time is attached only when
  // its section is present -- /eastern/ and /numerology/ carry the form without it.
  'birth-form.js': ['birth-lore.js', 'birthplace-search.js', 'birth-profile.js',
    {when: 'chart-in-time', needs: ['chart-in-time.js']}],
  // natal-room.js loads on /charts/, /eastern/ and /sky/. `const {...} = BirthLore` and the
  // #birthday-output subscriber's `BirthProfile.subscribe` are unconditional; every section
  // attachment below is behind its own document.querySelector guard.
  'natal-room.js': ['birth-lore.js', 'birth-profile.js',
    // SkyChart.attach({...themes: BirthdayInsights.westernThemes}) behind #sky-dialog.
    {when: 'sky-dialog', needs: ['sky-chart.js', 'birthday-insights.js']},
    // The sky-portrait render: NatalChart.bigThree/report, SkyChart.glyph,
    // BirthdayInsights.chineseProfile -- all inside `if (!birthdayOutput) return;`.
    // ChartRooms.banner/saveControl in renderPortrait and Rooms.register, all inside if (birthdayOutput).
    {when: 'birthday-output', needs: ['natal-chart.js', 'sky-chart.js', 'birthday-insights.js', 'chart-rooms.js', 'rooms.js']},
    {when: 'astrocartography-room', needs: ['astrocartography.js']},
    {when: 'celestial-extras', needs: ['celestial-extras.js']},
    {when: 'jyotish', needs: ['jyotish.js']},
    {when: 'horary', needs: ['horary.js']},
    {when: 'daily-horoscope', needs: ['daily-horoscope.js']}],
  // The UMD factory receives the bare NatalEngine.
  'chart-rooms.js': ['natal-engine.js'],
  // birth-lore.js is deliberately absent. Its only cross-module bare read is
  // BirthdayInsights.parseDate() inside birthdayParts(), and /tarot/ loads birth-lore.js
  // without birthday-insights.js: tarot.js uses only majorArcana and localDateKey, so that
  // path is never reached there. Asserting the dependency would fail a page that is correct.
};

function pages() {
  const found = [path.join(ROOT, 'index.html')];
  for (const entry of fs.readdirSync(ROOT, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(ROOT, entry.name, 'index.html');
    if (fs.existsSync(candidate)) found.push(candidate);
  }
  return found;
}

// The src list in document order, query string stripped and made root-relative.
function scriptList(html) {
  return [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
    .map(match => match[1].replace(/\?.*$/, '').replace(/^\//, ''));
}

const label = file => path.relative(ROOT, file).replace(/\\/g, '/');

test('every page is a real page manifest', () => {
  const found = pages().map(label);
  // A page added without a row here would go unchecked, so pin the set.
  assert.deepEqual(found.sort(), ['account/index.html', 'charts/index.html', 'divination/index.html',
    'eastern/index.html', 'index.html', 'numerology/index.html', 'sky/index.html', 'tarot/index.html']);
});

for (const file of pages()) {
  const name = label(file);
  const html = fs.readFileSync(file, 'utf8');
  const scripts = scriptList(html);
  const at = src => scripts.indexOf(src);

  test(`${name}: the shell mounts before account.js runs`, () => {
    assert.ok(scripts.includes('site-shell.js'), 'site-shell.js is missing');
    const mount = html.indexOf('SiteShell.mount(');
    assert.ok(mount > 0, 'no inline SiteShell.mount(...) call');
    assert.ok(html.indexOf('site-shell.js') < mount, 'SiteShell.mount(...) runs before site-shell.js loads');
    // account.js reads the header button the shell renders, so the mount must precede it.
    const account = html.indexOf('account.js');
    assert.ok(account > mount, 'account.js loads before SiteShell.mount(...)');
  });

  test(`${name}: rooms.js loads before account.js`, () => {
    assert.ok(at('rooms.js') >= 0, 'rooms.js is missing');
    assert.ok(at('account.js') >= 0, 'account.js is missing');
    assert.ok(at('rooms.js') < at('account.js'), 'account.js reads Rooms at load');
  });

  test(`${name}: every module's dependencies load before it`, () => {
    for (const [module, deps] of Object.entries(DEPENDENCIES)) {
      const index = at(module);
      if (index < 0) continue;
      for (const dep of deps) {
        if (typeof dep === 'object') {
          if (!html.includes(`id="${dep.when}"`)) continue;
          for (const conditional of dep.needs) {
            assert.ok(at(conditional) >= 0 && at(conditional) < index,
              `${module} attaches #${dep.when} and needs ${conditional} before it`);
          }
          continue;
        }
        assert.ok(at(dep) >= 0 && at(dep) < index, `${module} needs ${dep} before it`);
      }
    }
  });
}
