/* The sky section's UI logic -- specifically the parts that fail silently.
 *
 * Everything checked here produces wrong *content* rather than an error: a quarter rendered
 * under the wrong phase reading, an event filed on the wrong local day, a caveat that never
 * appears for a chartless reader, a grid with two tabbable cells. None of it throws, so none
 * of it reaches a browser console -- it has to be asserted.
 *
 * The repo has no dependencies and no DOM, so this follows tests/daily-horoscope.test.cjs:
 * load the section file into `vm` with a stubbed document and a frozen clock, and read the
 * HTML each render assigns to its panel. The stub records innerHTML rather than parsing it.
 * The one place a live node list is needed -- the roving tabindex, which mutates cells in
 * place instead of re-rendering -- derives its cells from the recorded HTML with one targeted
 * regex, so the real keydown handler is still what moves them.
 *
 * TZ is pinned to a fixed western offset before any Date or Intl work, because the local-day
 * bucketing this file guards is invisible at UTC. `node --test` gives every test file its own
 * process, so this cannot leak into another file. */
process.env.TZ = 'America/Los_Angeles';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const engine = require('../sky-calendar-engine.js');
const text = require('../sky-calendar-text.js');
const natal = require('../natal-engine.js');

assert.equal(new Date('2026-09-14T06:43:00Z').getDate(), 13, 'TZ pinning did not take effect');

const SOURCE = fs.readFileSync(require.resolve('../sky-calendar.js'), 'utf8')
  // The self-attach block at the end wants a real #sky-calendar and BirthProfile; drop it and
  // drive attach() directly, the way the daily-horoscope test drives DailyHoroscope.attach.
  .replace(/\n\(\(\) => \{\n\s+const room = document\.querySelector[\s\S]*$/, '\n');

const TIMED = {birthday: '1980-10-22', time: '08:30',
  location: {latitude: 38.7223, longitude: -9.1393, timeZone: 'Europe/Lisbon', label: 'Lisbon'}};

function node(extra = {}) {
  return {
    innerHTML: '', hidden: false, disabled: false, tabIndex: -1, dataset: {}, attrs: {},
    classList: {contains: () => true},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
    focus() { this.focused = true; },
    querySelector: () => null,
    querySelectorAll: () => [],
    ...extra
  };
}

// A tab panel: records the HTML written to it, hands back a stable child node per selector
// (so a detail panel written on one render is readable on the next), and derives live day
// cells from the recorded grid markup for the roving-tabindex handler.
function panelNode() {
  const children = new Map();
  let cellsFor = null, cells = [];
  const self = node();
  self.child = selector => {
    if (!children.has(selector)) children.set(selector, node());
    return children.get(selector);
  };
  // Derived lazily, and only re-derived when the panel's HTML actually changed, so mutations
  // the roving-tabindex handler makes to a cell survive until the next render.
  Object.defineProperty(self, 'cells', {get() {
    if (cellsFor !== self.innerHTML) {
      cellsFor = self.innerHTML;
      cells = [...self.innerHTML.matchAll(/class="sc-cell" data-sc-day="(\d+)" tabindex="(-?\d+)"/g)]
        .map(match => node({dataset: {scDay: match[1]}, tabIndex: Number(match[2])}));
    }
    return cells;
  }});
  self.querySelector = selector => {
    const one = /data-sc-day="(\d+)"/.exec(selector);
    if (one) return self.cells.find(cell => cell.dataset.scDay === one[1]) || null;
    return self.child(selector);
  };
  self.querySelectorAll = selector => selector.includes('data-sc-day') ? self.cells : [];
  return self;
}

function mount({clock = new Date('2026-09-13T12:00:00Z'), chart = null, birthday = null} = {}) {
  const panels = {moon: panelNode(), month: panelNode(), retrograde: panelNode(), transits: panelNode()};
  const listeners = {};
  const root = {
    innerHTML: '',
    addEventListener(name, callback) { listeners[name] = callback; },
    contains: () => true,
    querySelector(selector) { return panels[(selector.match(/#sc-(\w+)/) || [])[1]] || node(); },
    querySelectorAll: () => []
  };
  class FrozenDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
    static now() { return clock.getTime(); }
  }
  const document = {hidden: false, addEventListener() {}, querySelector: () => null};
  const context = vm.createContext({
    Date: FrozenDate, Intl, document, window: {matchMedia: () => ({matches: false})},
    setTimeout: () => 1, clearTimeout() {},
    SkyCalendarEngine: engine, SkyCalendarText: text, NatalEngine: natal
  });
  vm.runInContext(`${SOURCE}\nthis.attachSky = SkyCalendar.attach;`, context);
  const ui = context.attachSky(root);
  if (chart || birthday) ui.setBirthChart(chart, birthday);

  const fire = (name, event) => { listeners[name](event); return event; };
  return {
    ui, panels,
    click: data => fire('click', {target: {closest: () => ({dataset: data, disabled: false})}}),
    keydown: (key, fromDay) => fire('keydown', {
      key, target: {closest: () => ({dataset: {scDay: String(fromDay)}})},
      preventDefault() { this.prevented = true; }
    }),
    toggleMoon: checked => fire('change', {target: {matches: () => true, checked}}),
    dayDetail: () => panels.month.child('[data-sc-detail]').innerHTML,
    hitDetail: () => panels.transits.child('[data-sc-hit-detail]').innerHTML,
    cells: () => panels.month.cells
  };
}

test('every event type resolves to its own SkyCalendarText entry', () => {
  const app = mount({clock: new Date('2026-12-05T12:00:00Z')});
  app.click({scTab: 'month'});
  const seen = new Set();
  for (const event of engine.monthEvents(2026, 12).events) {
    const at = new Date(event.date);
    if (seen.has(event.type) || at.getMonth() !== 11) continue;     // local December only
    seen.add(event.type);
    app.click({scDay: String(at.getDate())});
    const expected = event.type === 'quarter' ? text.phases[[0, 2, 4, 6][event.quarter]]
      : event.type === 'ingress' ? text.ingressSigns[event.signIndex]
      : event.type === 'station' ? text.retrogrades[event.body]
      : text.eclipses[`${event.body === 'Sun' ? 'solar' : 'lunar'}-${event.kind}`];
    assert.ok(expected, `no text entry for a ${event.type}`);
    assert.ok(app.dayDetail().includes(expected.title),
      `${event.type} on local day ${at.getDate()} did not render "${expected.title}"`);
  }
  assert.ok(seen.has('quarter') && seen.has('ingress') && seen.has('station'),
    `December 2026 should carry quarters, ingresses and stations; saw ${[...seen]}`);
});

test('a third-quarter moon uses the Last quarter phase reading, which shares no title with it', () => {
  // QUARTER_NAMES[3] is 'Third quarter' while the phase at that point is 'Last quarter', so a
  // title match would silently mis-file it. This is why that map has to be an index map.
  const app = mount({clock: new Date('2026-10-03T12:00:00Z')});
  app.click({scTab: 'month'});
  const third = engine.monthEvents(2026, 10).events.find(event => event.type === 'quarter' && event.quarter === 3);
  assert.ok(third, 'October 2026 carries a third-quarter moon');
  app.click({scDay: String(new Date(third.date).getDate())});
  assert.ok(app.dayDetail().includes('Third quarter'), 'the event is not labelled Third quarter');
  assert.ok(app.dayDetail().includes(text.phases[6].title), 'it did not reach the Last quarter reading');
  assert.ok(!app.dayDetail().includes(text.phases[0].body), 'it reached the new moon reading instead');
});

test('an eclipse resolves through the solar/lunar key the text module documents', () => {
  const august = engine.monthEvents(2026, 8).events.filter(event => event.type === 'eclipse');
  assert.ok(august.length > 0, 'August 2026 carries an eclipse');
  const app = mount({clock: new Date('2026-08-10T12:00:00Z')});
  app.click({scTab: 'month'});
  for (const eclipse of august) {
    const at = new Date(eclipse.date);
    if (at.getMonth() !== 7) continue;
    app.click({scDay: String(at.getDate())});
    const entry = text.eclipses[`${eclipse.body === 'Sun' ? 'solar' : 'lunar'}-${eclipse.kind}`];
    assert.ok(entry, `no entry for ${eclipse.body}/${eclipse.kind}`);
    assert.ok(app.dayDetail().includes(entry.title), `${eclipse.kind} eclipse did not render "${entry.title}"`);
  }
});

test('events are filed on the local day, not the UTC one', () => {
  // At UTC-7 the Moon's September 2026 ingress into Scorpio is 06:43 UTC on the 14th, which is
  // 23:43 on the 13th for this reader, so it belongs on the 13th.
  const ingress = engine.monthEvents(2026, 9).events
    .find(event => event.type === 'ingress' && event.body === 'Moon' && event.date.startsWith('2026-09-14T06'));
  assert.ok(ingress, 'the Moon enters Scorpio at 06:43 UTC on 2026-09-14');
  assert.equal(new Date(ingress.date).getUTCDate(), 14);
  assert.equal(new Date(ingress.date).getDate(), 13);
  const app = mount();
  app.click({scTab: 'month'});
  app.click({scDay: '13'});
  assert.ok(app.dayDetail().includes('Moon enters Scorpio'), 'the ingress is not on local day 13');
  app.click({scDay: '14'});
  assert.ok(!app.dayDetail().includes('Moon enters Scorpio'), 'the ingress is still filed on UTC day 14');
});

test('a local month pulls its strays in from the neighbouring UTC months and lets its own go', () => {
  // November 2026 at UTC-7 is the clean two-way case, both halves read off the engine:
  //   UTC December carries a third-quarter moon at 2026-12-01T06:09Z -> local Mon 30 Nov.
  //   UTC November carries a Moon ingress into Leo at 2026-11-01T04:18Z -> local Sat 31 Oct.
  // The first has to be pulled in, the second has to be let go, and neither is visible to a
  // UI that just renders the UTC month it was handed.
  const inLocalNovember = iso => { const at = new Date(iso); return at.getFullYear() === 2026 && at.getMonth() === 10; };
  const pulled = engine.monthEvents(2026, 12).events.filter(event => inLocalNovember(event.date));
  const dropped = engine.monthEvents(2026, 11).events.filter(event => !inLocalNovember(event.date));
  assert.equal(pulled.length, 1, 'UTC December should hand one event back to local November');
  assert.equal(dropped.length, 1, 'UTC November should hand one event back to local October');
  assert.equal(pulled[0].date, '2026-12-01T06:09:14.538Z');
  assert.equal(dropped[0].date, '2026-11-01T04:18:06.728Z');

  const app = mount({clock: new Date('2026-11-15T12:00:00Z')});
  app.click({scTab: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('November 2026'), 'not showing November');

  app.click({scDay: String(new Date(pulled[0].date).getDate())});      // local 30 November
  assert.ok(app.dayDetail().includes('Third quarter'),
    'the 1 December UTC third quarter was not pulled into local November');

  // The ingress the month must let go: it is not on local day 1. The Moon re-enters Leo once
  // more later in November, so the label itself still appears -- exactly as many times as
  // there are Leo ingresses that really fall in local November, and no more.
  app.click({scDay: '1'});
  assert.ok(!app.dayDetail().includes('Moon enters Leo'), 'the 1 November UTC ingress stayed on local day 1');
  const leo = [-1, 0, 1].flatMap(delta => engine.monthEvents(2026, 11 + delta).events)
    .filter(event => event.type === 'ingress' && event.body === 'Moon' && event.sign === 'Leo' && inLocalNovember(event.date));
  const listView = (app.panels.month.innerHTML.split('<ul class="sc-list"')[1] || '').split('</ul>')[0];
  assert.equal(listView.split('Moon enters Leo').length - 1, leo.length,
    'the list view counts a different number of Leo ingresses than local November actually has');
});

test('exactly one grid cell is tabbable after every arrow, and the arrows clamp to the month', () => {
  const app = mount();
  app.click({scTab: 'month'});
  const tabbable = () => app.cells().filter(cell => cell.tabIndex === 0).map(cell => Number(cell.dataset.scDay));
  assert.equal(app.cells().length, 30, 'September 2026 has thirty day cells');
  assert.deepEqual(tabbable(), [1]);
  for (const [key, from, expected] of [['ArrowRight', 1, 2], ['ArrowDown', 2, 9], ['ArrowUp', 9, 2],
    ['ArrowLeft', 1, 1], ['Home', 20, 1], ['End', 1, 30], ['ArrowDown', 30, 30], ['ArrowRight', 30, 30]]) {
    const event = app.keydown(key, from);
    assert.equal(event.prevented, true, `${key} did not preventDefault`);
    assert.deepEqual(tabbable(), [expected], `${key} from day ${from}`);
  }
  // Enter, Space and Tab must reach the browser: Enter is how a day is opened, Tab is how the
  // grid is left. Swallowing any of them is the way this control usually breaks.
  for (const key of ['Enter', ' ', 'Tab']) {
    assert.equal(app.keydown(key, 10).prevented, undefined, `${key} was swallowed by the grid handler`);
  }
});

test('a chartless reader gets the empty state and a route to the form, not a blank panel', () => {
  const app = mount();
  app.click({scTab: 'transits'});
  const html = app.panels.transits.innerHTML;
  assert.ok(html.includes('sc-empty'), 'no empty state');
  assert.ok(html.includes('href="/charts/"'), 'no route to the birth form');
  assert.ok(html.includes('data-sc-sample'), 'no sample chart to try');
  assert.ok(!html.includes('sc-caveat'), 'the approximate caveat needs a real source');
});

test('a birth date with no time renders all three approximate caveats and drops the angle and Moon clauses', () => {
  const app = mount({birthday: '1980-10-22'});
  app.click({scTab: 'transits'});
  const html = app.panels.transits.innerHTML;
  assert.ok(html.includes('sc-caveat'), 'no caveat block for a date-only source');
  assert.ok(/within a couple of degrees/.test(html), 'the precision claim is missing');
  assert.ok(!/about a degree/.test(html), 'S8: the copy must never say "about a degree"');
  assert.ok(/26 hours/.test(html), 'the 26-hour bound is missing');
  assert.ok(/Ascendant, Midheaven, Descendant and Imum Coeli/.test(html), 'the angles caveat is missing');
  assert.ok(/natal Moon is left out/.test(html), 'the natal Moon caveat is missing');
  assert.ok(/sixteen degrees/.test(html), 'the Moon uncertainty figure is missing');
  assert.ok(!html.includes('angles included'), 'angles were claimed without a birth time');
  assert.ok(!html.includes('natal Moon included'), 'the natal Moon was claimed without a birth time');
});

test('a timed chart drops the caveat and claims the angles and the natal Moon', () => {
  const chart = natal.calculate(TIMED);
  assert.equal(chart.status, 'ready');
  const app = mount({chart, birthday: TIMED.birthday});
  app.click({scTab: 'transits'});
  const html = app.panels.transits.innerHTML;
  assert.ok(!html.includes('sc-caveat'), 'a timed chart is not approximate');
  assert.ok(html.includes('angles included'), 'the angles clause is missing');
  assert.ok(html.includes('natal Moon included'), 'the natal Moon clause is missing');
});

test('each aspect resolves to its own reading, by degree and not by name', () => {
  const chart = natal.calculate(TIMED);
  const app = mount({chart, birthday: TIMED.birthday});
  app.click({scTab: 'transits'});
  const hits = engine.personalTransits({chart, birthday: TIMED.birthday}, 2026, 9, {})
    .hits.filter(hit => new Date(hit.date).getFullYear() === 2026 && new Date(hit.date).getMonth() === 8);
  assert.ok(hits.length > 0, 'September 2026 has contacts to this chart');
  const degrees = [0, 60, 90, 120, 180];
  let checked = 0;
  for (const want of degrees) {
    const index = hits.findIndex(hit => hit.aspect === want);
    if (index < 0) continue;
    app.click({scHit: String(index)});
    assert.ok(app.hitDetail().includes(text.aspects[degrees.indexOf(want)].title),
      `a ${want}-degree hit did not render "${text.aspects[degrees.indexOf(want)].title}"`);
    checked++;
  }
  assert.ok(checked >= 3, `expected at least three of the five aspects in the month, got ${checked}`);
});

test('transit contacts are grouped by local day too', () => {
  const chart = natal.calculate(TIMED);
  const source = {chart, birthday: TIMED.birthday};
  const local = hit => { const at = new Date(hit.date); return at.getFullYear() === 2026 && at.getMonth() === 8; };
  const expected = engine.personalTransits(source, 2026, 9, {}).hits.filter(local).length
    + engine.personalTransits(source, 2026, 8, {}).hits.filter(local).length
    + engine.personalTransits(source, 2026, 10, {}).hits.filter(local).length;
  const app = mount({chart, birthday: TIMED.birthday});
  app.click({scTab: 'transits'});
  const shown = Number(/(\d+) exact contacts/.exec(app.panels.transits.innerHTML)[1]);
  assert.equal(shown, expected, 'the month is not the reader\'s own calendar month');
});

test('instants render in the reader\'s zone while nominal calendar labels stay put', () => {
  const app = mount();
  assert.ok(!/\d\d:\d\d UTC/.test(app.panels.moon.innerHTML), 'an instant is still labelled UTC');
  app.click({scTab: 'month'});
  // The month heading and the day heading are nominal labels built from Date.UTC; at a western
  // offset they slide back a day unless they keep their UTC formatter.
  assert.ok(app.panels.month.innerHTML.includes('September 2026'), 'the month label slid');
  app.click({scDay: '13'});
  assert.ok(/13/.test(app.dayDetail()) && /September/.test(app.dayDetail()),
    `the day heading slid: ${app.dayDetail().slice(0, 140)}`);
});

test('the month stepper offers a reset, disabled exactly on the month it returns to', () => {
  const app = mount();
  app.click({scTab: 'month'});
  assert.match(app.panels.month.innerHTML, /data-sc-reset[^>]*disabled/, 'reset is live on the current month');
  app.click({scStep: '1', scScope: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('October 2026'), 'stepping forward failed');
  assert.ok(!/data-sc-reset[^>]*disabled/.test(app.panels.month.innerHTML), 'reset stayed disabled off the current month');
  app.click({scReset: '', scScope: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('September 2026'), 'reset did not return to this month');
  assert.match(app.panels.month.innerHTML, /data-sc-reset[^>]*disabled/, 'reset is live again on the current month');
});

test('stepping crosses a year boundary in both directions', () => {
  const app = mount({clock: new Date('2026-12-15T12:00:00Z')});
  app.click({scTab: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('December 2026'));
  app.click({scStep: '1', scScope: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('January 2027'), 'December did not roll into January');
  app.click({scStep: '-1', scScope: 'month'});
  assert.ok(app.panels.month.innerHTML.includes('December 2026'), 'January did not roll back into December');
});

test('the grid carries a visible key for its four marks', () => {
  const app = mount();
  app.click({scTab: 'month'});
  for (const name of ['Moon quarter', 'sign ingress', 'station', 'eclipse']) {
    assert.ok(app.panels.month.innerHTML.includes(name), `the key does not name "${name}"`);
  }
});

// --- The saveable room: current() and load() -------------------------------------------
//
// Both live on the object attach() returns, so they are drivable here without a browser. The
// point of these three is the mutation ORDER: load() has to reject a malformed payload without
// having touched anything, which is invisible to a return-value check on its own.

const SAVED = (over = {}) => ({kind: 'transit-calendar', payload: {
  birth: {birthday: '1980-10-22', time: '08:30',
    location: {latitude: 38.7223, longitude: -9.1393, timeZone: 'Europe/Lisbon'},
    houseSystem: 'placidus', fold: ''},
  year: 2026, month: 11, includeMoon: true, sample: false, ...over}});

test('a saved calendar replays its own month, Moon switch and birth details', () => {
  const chart = natal.calculate(TIMED);
  const app = mount({chart, birthday: TIMED.birthday});
  app.click({scTab: 'transits'});
  assert.ok(app.panels.transits.innerHTML.includes('September 2026'), 'starts on the current month');

  assert.equal(app.ui.loadCalendar(SAVED()), true);
  const html = app.panels.transits.innerHTML;
  assert.ok(html.includes('November 2026'), 'the saved month was not restored');
  assert.match(html, /data-sc-moon checked/, 'the saved Moon switch was not restored');
  assert.ok(html.includes('Opened from your journal'), 'the restored profile bar is missing');
  assert.ok(html.includes('Use my chart'), 'no way back to the reader\'s own chart');

  // The round trip has to be a fixed point: what current() hands back must reload identically.
  const again = app.ui.currentCalendar();
  assert.equal(again.kind, 'transit-calendar');
  // Round-tripped through JSON because the payload is built inside the vm realm, so its
  // prototype is not this realm's Object.prototype and deepStrictEqual would fail on identical
  // values. JSON is also how the payload actually travels to the API.
  assert.deepEqual(JSON.parse(JSON.stringify(again.payload)), SAVED().payload,
    'current() did not reproduce the saved payload');
  assert.match(again.summary, /^November 2026 · \d+ exact contacts?$/, again.summary);

  // `sample` is optional on the way in (a payload saved before the flag existed has none) and
  // always present on the way out.
  const older = SAVED({month: 12});
  delete older.payload.sample;
  assert.equal(app.ui.loadCalendar(older), true, 'a payload with no sample flag was rejected');
  assert.ok(app.panels.transits.innerHTML.includes('December 2026'));
  assert.equal(app.ui.currentCalendar().payload.sample, false);
});

test('a sample calendar says so in the journal row and again on replay', () => {
  // S-fix-2: on screen the sample bar warns these are not the reader's details. Once saved, the
  // reader cannot see that bar, so the warning has to travel in the payload or the row reads as
  // their own reading.
  const app = mount();
  app.click({scTab: 'transits'});
  app.click({scSample: ''});                                  // switch to the sample chart
  const draw = app.ui.currentCalendar();
  assert.equal(draw.payload.sample, true, 'the sample flag did not reach the payload');
  assert.match(draw.summary, / · sample chart$/, draw.summary);
  assert.equal(draw.payload.birth.birthday, '1990-07-15', 'the sample birth details were not snapshotted');

  const fresh = mount({chart: natal.calculate(TIMED), birthday: TIMED.birthday});
  fresh.click({scTab: 'transits'});
  assert.equal(fresh.ui.loadCalendar({kind: 'transit-calendar', payload: draw.payload}), true);
  const html = fresh.panels.transits.innerHTML;
  assert.ok(html.includes('Illustrative birth details, not your own'),
    'a replayed sample calendar does not say it is a sample');
  assert.ok(!/saved birth details/.test(html), 'it is framed as the reader\'s own birth details');
});

test('load rejects every malformed payload without touching the page', () => {
  const chart = natal.calculate(TIMED);
  const app = mount({chart, birthday: TIMED.birthday});
  app.click({scTab: 'transits'});
  assert.equal(app.ui.loadCalendar(SAVED()), true, 'the control payload must load');
  const before = app.panels.transits.innerHTML;

  const bad = {
    'reading is null': null,
    'reading is a string': 'nope',
    'no payload': {kind: 'transit-calendar'},
    'payload is a string': {kind: 'transit-calendar', payload: 'nope'},
    'year missing': SAVED({year: undefined}),
    'year out of range': SAVED({year: 2200}),
    'year not an integer': SAVED({year: 2026.5}),
    'month 13': SAVED({month: 13}),
    'month 0': SAVED({month: 0}),
    'includeMoon a string': SAVED({includeMoon: 'yes'}),
    'sample a string': SAVED({sample: 'yes'}),
    'birth missing': SAVED({birth: undefined}),
    'birth not an object': SAVED({birth: '1980-10-22'}),
    'birthday malformed': SAVED({birth: {birthday: '22/10/1980'}}),
    // Passes the YYYY-MM-DD shape but is not a real day: only the engine catches this one.
    'birthday not a real day': SAVED({birth: {birthday: '2026-02-31'}}),
    'birthday out of engine range': SAVED({birth: {birthday: '1850-01-01'}}),
    'time not a string': SAVED({birth: {birthday: '1980-10-22', time: 830}}),
    'time is prose': SAVED({birth: {birthday: '1980-10-22', time: 'half past eight'}}),
    // S-fix-6: these two match a loose \d{1,2}:\d{2} and must not reach NatalEngine, which
    // would refuse them and leave the load replaying down the approximate path instead.
    'minute 60': SAVED({birth: {birthday: '1980-10-22', time: '07:60'}}),
    'hour 99': SAVED({birth: {birthday: '1980-10-22', time: '99:99'}}),
    'location not an object': SAVED({birth: {birthday: '1980-10-22', location: 'Lisbon'}}),
    'location has no timeZone': SAVED({birth: {birthday: '1980-10-22', location: {latitude: 38.7, longitude: -9.1}}}),
    'latitude out of range': SAVED({birth: {birthday: '1980-10-22', location: {latitude: 91, longitude: -9.1, timeZone: 'Europe/Lisbon'}}}),
    'longitude null': SAVED({birth: {birthday: '1980-10-22', location: {latitude: 38.7, longitude: null, timeZone: 'Europe/Lisbon'}}}),
    'unknown house system': SAVED({birth: {birthday: '1980-10-22', houseSystem: 'koch'}}),
    'unknown fold': SAVED({birth: {birthday: '1980-10-22', fold: 'middle'}})
  };
  for (const [name, reading] of Object.entries(bad)) {
    assert.equal(app.ui.loadCalendar(reading), false, `${name} was accepted`);
    assert.equal(app.panels.transits.innerHTML, before, `${name} changed the page before rejecting`);
  }
  // Still the control payload's month, and still replayable afterwards.
  assert.ok(before.includes('November 2026'));
  assert.equal(app.ui.loadCalendar(SAVED({month: 12})), true, 'a good payload no longer loads');
  assert.ok(app.panels.transits.innerHTML.includes('December 2026'));
});

test('a snapshot with no birth time at all replays, down the approximate path', () => {
  // The shape a reader with only a birth date saves: `time: ''`, no location. NatalEngine's
  // `missing` branch. (The harder case -- a time that IS set and still will not place -- is the
  // next test; these two are different branches and must not be confused for each other.)
  const app = mount({birthday: '1980-10-22'});
  app.click({scTab: 'transits'});
  const birth = {birthday: '1980-10-22', time: '', location: null, houseSystem: 'placidus', fold: ''};
  assert.equal(natal.calculate(birth).status, 'missing', 'this snapshot no longer takes the missing branch');
  assert.equal(app.ui.loadCalendar(SAVED({birth})), true, 'a date-only snapshot was rejected');
  const html = app.panels.transits.innerHTML;
  assert.ok(html.includes('November 2026'), 'the month was not restored');
  assert.ok(html.includes('sc-caveat'), 'a date-only replay must still carry the approximate caveat');
});

// Ruling (fix round 1, finding 6, accepted by the controller): loadCalendar rejects a MALFORMED
// time -- the tightened pattern stops 07:60 and 99:99 before NatalEngine ever sees them -- but
// must NOT reject a well-formed time that NatalEngine still cannot place. There are exactly two
// ways that happens, and both are facts about the birth moment rather than payload damage:
//
//   status 'error'     -- the local clock time never occurred; the clocks moved forward.
//   status 'ambiguous' -- it occurred twice when they went back, and no `fold` was recorded.
//
// The LIVE path degrades on both identically: birth-profile.js hands setBirthChart a non-ready
// chart, `chart` becomes null, and the reader gets the approximate noon-UTC natal points. So a
// reader born at such a moment sees the approximate path on screen, saves it, and must be able
// to reopen exactly that. Rejecting here would strand their saved reading permanently.
//
// This is the test that pins it. The previous test does NOT: its time is '', which is the
// `missing` branch, so a rejection scoped to 'error'/'ambiguous' would sail straight past it.
// Each case asserts the NatalEngine status it depends on rather than assuming it, so a change in
// Node's zone data makes this fail loudly instead of quietly testing nothing.
test('a set birth time that NatalEngine cannot place still replays, down the approximate path', () => {
  const NEW_YORK = {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York'};
  const cases = [
    // 1980-04-27: US clocks went forward at 02:00, so 02:30 that morning never existed.
    ['error', {birthday: '1980-04-27', time: '02:30', location: NEW_YORK, houseSystem: 'placidus', fold: ''}],
    // 1980-10-26: they went back at 02:00, so 01:30 happened twice and no fold was recorded.
    ['ambiguous', {birthday: '1980-10-26', time: '01:30', location: NEW_YORK, houseSystem: 'placidus', fold: ''}]
  ];
  for (const [expected, birth] of cases) {
    assert.equal(natal.calculate(birth).status, expected,
      `${birth.birthday} ${birth.time} in New York no longer produces status "${expected}"`);

    const app = mount({chart: natal.calculate(TIMED), birthday: TIMED.birthday});
    app.click({scTab: 'transits'});
    assert.ok(!app.panels.transits.innerHTML.includes('sc-caveat'), 'the timed control chart is not approximate');

    assert.equal(app.ui.loadCalendar(SAVED({birth})), true,
      `a saved calendar whose birth time is ${expected} was rejected instead of replayed`);
    const html = app.panels.transits.innerHTML;
    assert.ok(html.includes('November 2026'), 'the saved month was not restored');
    assert.ok(html.includes('sc-caveat'), 'the replay does not carry the approximate caveat');
    assert.ok(!html.includes('angles included'), 'angles were claimed from an unplaceable chart');
    assert.ok(!html.includes('natal Moon included'), 'the natal Moon was claimed from an unplaceable chart');
  }
});

test('attach returns a null-guarded stub when the section is missing', () => {
  const context = vm.createContext({
    Date, Intl, document: {hidden: false, addEventListener() {}, querySelector: () => null},
    window: {matchMedia: () => ({matches: false})}, setTimeout: () => 1, clearTimeout() {},
    SkyCalendarEngine: engine, SkyCalendarText: text, NatalEngine: natal
  });
  vm.runInContext(`${SOURCE}\nthis.attachSky = SkyCalendar.attach;`, context);
  const stub = context.attachSky(null);
  assert.equal(typeof stub.setBirthChart, 'function');
  assert.doesNotThrow(() => stub.setBirthChart(null, null));
});

// ---- the month void strip ----
// Bands are intervals, so the month view cannot file them by a single local day the way it
// files events. These pin the two things that could go wrong quietly: the strip showing a
// different set of bands than the month actually holds, and a band that opens in the previous
// UTC month being dropped by the local filter rather than carried into this month's reader's
// view. Neither throws; both would just show the wrong hours.

// Consecutive months share two of their three engine months, and each engine month runs the
// void aspect search, so memoising turns a twelve-month scan from ~36 engine calls into ~14.
const monthMemo = new Map();
function engineMonth(year, month) {
  const key = `${year}-${month}`;
  if (!monthMemo.has(key)) monthMemo.set(key, engine.monthEvents(year, month));
  return monthMemo.get(key);
}

function localBands(year, month) {
  const seen = new Map();
  for (const delta of [-1, 0, 1]) {
    const at = new Date(Date.UTC(year, month - 1 + delta, 1));
    const result = engineMonth(at.getUTCFullYear(), at.getUTCMonth() + 1);
    if (result.status !== 'ready') continue;
    for (const band of result.voids) {
      // Overlap against the LOCAL month, which is what the reader is looking at.
      const from = new Date(year, month - 1, 1), to = new Date(year, month, 1);
      if (new Date(band.end) > from && new Date(band.start) < to) seen.set(band.end, band);
    }
  }
  return [...seen.values()].sort((a, b) => a.start < b.start ? -1 : 1);
}

test('the month strip lists exactly the bands the local month holds', () => {
  const app = mount({clock: new Date('2026-03-15T12:00:00Z')});
  app.click({scTab: 'month'});
  const html = app.panels.month.innerHTML;
  const expected = localBands(2026, 3);

  assert.ok(html.includes('sc-voids'), 'the month view renders no void strip');
  assert.ok(expected.length >= 8, `fixture month should hold ~13 bands, found ${expected.length}`);
  assert.equal(html.split('sc-voidrow').length - 1, expected.length,
    'the strip shows a different number of bands than the month holds');
  // A count alone does not bind: September and October 2026 both hold 14 bands, so the wrong
  // month's set would pass. Pin an instant only this month's set contains.
  const firstClock = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false})
    .format(new Date(expected[0].start));
  assert.ok(html.includes(firstClock),
    `the strip does not render the first band's start (${expected[0].start})`);
  // Both traditions have to be visibly distinguished, not just the classical one.
  assert.ok(html.includes('sc-void-modern'), 'the modern stretch is not marked inside the band');
});

test('a band opening in the previous UTC month still reaches this month', () => {
  // At UTC-7 a band that opens on the 1st before 07:00 UTC belongs to the previous local day,
  // and one closing just after a month boundary belongs to the previous local month. Find a
  // real boundary-straddling band rather than asserting against a hand-picked date.
  // Stop at the first month that straddles: each localBands call is three engine months of
  // aspect searching, so evaluating all twelve eagerly costs ~20s for no extra coverage.
  let straddling = null;
  for (let month = 1; month <= 12 && !straddling; month++) {
    const bands = localBands(2026, month);
    if (bands.some(b => new Date(b.start).getMonth() !== month - 1)) straddling = {month, bands};
  }
  assert.ok(straddling, 'no month in 2026 has a band opening in the previous local month');

  const app = mount({clock: new Date(Date.UTC(2026, straddling.month - 1, 15, 12))});
  app.click({scTab: 'month'});
  const carried = straddling.bands.find(b => new Date(b.start).getMonth() !== straddling.month - 1);
  assert.ok(app.panels.month.innerHTML.split('sc-voidrow').length - 1 === straddling.bands.length,
    `month ${straddling.month} dropped the band opening ${carried.start}`);
});

test('band bars are scaled to duration within the month, with a floor for the briefest', () => {
  const app = mount({clock: new Date('2026-03-15T12:00:00Z')});
  app.click({scTab: 'month'});
  const html = app.panels.month.innerHTML;

  // Each row's bar carries its own width. Pull them in document order.
  const widths = [...html.matchAll(/class="sc-void-band"[^>]*style="width:([\d.]+)%/g)].map(m => Number(m[1]));
  const bands = localBands(2026, 3);
  assert.equal(widths.length, bands.length, 'not every band bar carries a width');

  const spans = bands.map(b => new Date(b.end) - new Date(b.start));
  const longest = Math.max(...spans);
  assert.ok(spans.some(s => s < longest * 0.5), 'fixture month has no short band to scale against');

  // The longest band fills the row; nothing exceeds it.
  assert.equal(Math.max(...widths), 100, 'the longest band does not fill the row');
  // The point of the change: a regression to one width for every row must fail here. Every
  // other assertion below is satisfied by an all-100 array, so this is the one that binds.
  assert.ok(new Set(widths).size > 1, 'every bar is the same width -- the bars are not scaled');
  assert.ok(Math.min(...widths) < 100, 'no bar is narrower than the full row');
  // Order is preserved: a longer band never renders narrower than a shorter one.
  const bySpan = spans.map((s, i) => [s, widths[i]]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < bySpan.length; i++) {
    assert.ok(bySpan[i][1] >= bySpan[i - 1][1],
      `a ${bySpan[i][0] / 3600000}h band is narrower than a ${bySpan[i - 1][0] / 3600000}h one`);
  }
  // A very brief void must stay visible rather than collapsing to a hairline.
  assert.ok(Math.min(...widths) >= 2, `briefest bar is ${Math.min(...widths)}%, below the floor`);
  // The scale has to be stated, or a reader stepping months sees bars change meaning silently.
  assert.ok(/widest bar/i.test(html), 'the strip does not state its scale');
});

test('the month strip uses the brief framing, not the full passage', () => {
  const app = mount({clock: new Date('2026-03-15T12:00:00Z')});
  app.click({scTab: 'month'});
  const month = app.panels.month.innerHTML;
  assert.ok(month.includes(text.voidFraming.brief.slice(0, 60)), 'the strip does not carry the brief framing');
  assert.ok(!month.includes(text.voidFraming.body.slice(0, 60)),
    'the strip still prints the full framing passage');
  // The full passage still belongs on the Moon tab, where the reader went looking for it.
  app.click({scTab: 'moon'});
  assert.ok(app.panels.moon.innerHTML.includes(text.voidFraming.body.slice(0, 60)),
    'the Moon tab lost the full framing passage');
});
