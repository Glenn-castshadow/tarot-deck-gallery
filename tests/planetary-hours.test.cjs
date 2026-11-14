const test = require('node:test');
const assert = require('node:assert/strict');
const ClassicalEngine = require('../classical-engine.js');
const PlanetaryHours = require('../planetary-hours.js');

const NY = PlanetaryHours.DEFAULT_PLACE;

test('local noon is found in the place’s own zone, across a clock change', () => {
  assert.equal(PlanetaryHours.noonOn('2026-11-14', 'America/New_York').toISOString(), '2026-11-14T17:00:00.000Z');
  assert.equal(PlanetaryHours.noonOn('2026-07-04', 'America/New_York').toISOString(), '2026-07-04T16:00:00.000Z');
  assert.equal(PlanetaryHours.noonOn('2026-03-08', 'America/New_York').toISOString(), '2026-03-08T16:00:00.000Z', 'the day clocks go forward');
  assert.equal(PlanetaryHours.noonOn('2026-11-14', 'Asia/Kolkata').toISOString(), '2026-11-14T06:30:00.000Z');
});

test('today is asked about at the present moment, any other date at local noon', () => {
  const now = new Date('2026-11-14T08:15:00Z');   // 03:15 in New York, still the 14th
  assert.equal(PlanetaryHours.dateIn('America/New_York', now), '2026-11-14');
  assert.equal(PlanetaryHours.instantFor('2026-11-14', 'America/New_York', now), now);
  assert.equal(PlanetaryHours.instantFor('2026-11-15', 'America/New_York', now).toISOString(), '2026-11-15T17:00:00.000Z');
  // 03:00Z on the 15th is still the 14th in New York but already the 15th in Kolkata.
  const late = new Date('2026-11-15T03:00:00Z');
  assert.equal(PlanetaryHours.dateIn('America/New_York', late), '2026-11-14');
  assert.equal(PlanetaryHours.dateIn('Asia/Kolkata', late), '2026-11-15');
});

test('a Saturday is Saturn’s day: Saturn rules the first hour and Mercury the first of the night', () => {
  const result = ClassicalEngine.planetaryHours(PlanetaryHours.noonOn('2026-11-14', NY.timeZone), NY);
  assert.equal(result.status, 'ready');
  assert.equal(result.weekday, 'Saturday');
  assert.equal(result.dayRuler, 'Saturn');
  assert.equal(result.hours[0].ruler, 'Saturn');
  assert.equal(result.hours[12].ruler, 'Mercury');
  const html = PlanetaryHours.render(result, {place: NY, live: false});
  assert.equal((html.match(/<tr/g) || []).length, 25, 'a header row and twenty-four hours');
  assert.equal((html.match(/class="ph-night"/g) || []).length, 12);
  assert.match(html, /Saturday, the day of Saturn/);
  assert.doesNotMatch(html, /aria-current|The hour now/, 'another day has no current hour');
});

test('the present hour is marked and described only when the view is live', () => {
  const now = new Date('2026-11-14T17:00:00Z');
  const result = ClassicalEngine.planetaryHours(now, NY);
  const html = PlanetaryHours.render(result, {place: NY, live: true});
  const ruler = result.hours[result.current].ruler;
  assert.equal((html.match(/aria-current="true"/g) || []).length, 1);
  assert.ok(html.includes(`Hour of ${ruler}`));
  assert.ok(html.includes(PlanetaryHours.NOTE[ruler]));
});

test('before dawn the hours still belong to the day before', () => {
  const result = ClassicalEngine.planetaryHours(new Date('2026-11-14T08:15:00Z'), NY);   // 03:15 Saturday in New York
  assert.equal(result.weekday, 'Friday');
  assert.equal(result.hours[result.current].isDay, false);
});

test('where the Sun does not rise and set, the section says so and draws no table', () => {
  const svalbard = {latitude: 78.2232, longitude: 15.6267, timeZone: 'Arctic/Longyearbyen', label: 'Longyearbyen, Svalbard'};
  const result = ClassicalEngine.planetaryHours(PlanetaryHours.noonOn('2026-06-21', svalbard.timeZone), svalbard);
  assert.equal(result.status, 'unavailable');
  const html = PlanetaryHours.render(result, {place: svalbard, live: false});
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /<table/);
});

test('the place label is escaped', () => {
  const place = {...NY, label: 'A <b>& "C"'};
  const html = PlanetaryHours.render(ClassicalEngine.planetaryHours(PlanetaryHours.noonOn('2026-11-14', NY.timeZone), place), {place, live: false});
  assert.ok(html.includes('A &lt;b&gt;&amp; &quot;C&quot;'));
});

test('attach starts at the default place, adopts a saved birthplace, and keeps a city the visitor chose', () => {
  const listeners = {};
  const node = id => ({id, value: '', innerHTML: '', textContent: '', addEventListener(type, fn) { listeners[`${id}:${type}`] = fn; }});
  const nodes = {'#ph-form': node('form'), '#ph-date': node('date'), '#ph-place': node('place'), '#ph-place-status': node('status'), '#ph-output': node('output'), '#ph-place-list': node('list')};
  const section = {innerHTML: '', querySelector: selector => nodes[selector]};
  let selection = null, subscriber = null;
  const now = new Date('2026-11-14T17:00:00Z');
  const api = PlanetaryHours.attach(section, {
    engine: ClassicalEngine,
    search: {attach: () => ({getSelection: () => selection, restore() {}})},
    profile: {subscribe(fn) { subscriber = fn; fn(null); }},
    clock: () => now, every: () => {}, doc: {hidden: false}
  });
  assert.equal(api.place().label, NY.label);
  assert.equal(nodes['#ph-date'].value, '2026-11-14');
  assert.match(nodes['#ph-output'].innerHTML, /The hour now/);

  const london = {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'};
  subscriber({profile: {placeLocation: london}});
  assert.equal(api.place().label, london.label, 'a saved birthplace replaces the default');
  assert.equal(nodes['#ph-place'].value, london.label);

  const tokyo = {latitude: 35.6895, longitude: 139.6917, timeZone: 'Asia/Tokyo', label: 'Tokyo, Japan'};
  selection = tokyo;
  listeners['form:submit']({preventDefault() {}});
  assert.equal(api.place().label, tokyo.label);
  assert.equal(nodes['#ph-date'].value, '2026-11-15', 'today follows the new city: it is already the 15th in Tokyo');
  assert.match(nodes['#ph-output'].innerHTML, /The hour now/);
  subscriber({profile: {placeLocation: london}});
  assert.equal(api.place().label, tokyo.label, 'a later profile update does not override the visitor’s choice');

  selection = null;
  nodes['#ph-place'].value = 'Atlantis';
  listeners['form:submit']({preventDefault() {}});
  assert.equal(api.place().label, tokyo.label);
  assert.match(nodes['#ph-place-status'].textContent, /Choose a city from the list/);

  nodes['#ph-date'].value = '1850-01-01';
  listeners['date:change']();
  assert.match(nodes['#ph-output'].innerHTML, /between 1901 and 2100/);
});
