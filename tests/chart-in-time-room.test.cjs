const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const ChartInTimeEngine = require('../chart-in-time-engine.js');
const ChartInTimeText = require('../chart-in-time-text.js');

// A minimal stand-in DOM element: properties are plain fields, queries return cached children.
const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, min: '', dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});

function boot() {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  // The place form's submit listener is captured so a test can submit it directly.
  root.querySelector('#cit-place-form').addEventListener = (type, fn) => { listeners.submitPlace = () => fn({preventDefault() {}}); };
  const src = fs.readFileSync(path.join(__dirname, '../chart-in-time.js'), 'utf8');
  const BirthplaceSearch = {attach: () => ({getSelection: () => null, restore() {}})};
  const ChartInTime = new Function('BirthplaceSearch', 'ChartInTimeEngine', 'ChartInTimeText', 'BiWheel', 'NatalEngine', 'Rooms', 'ChartRooms', 'document', src + '\nreturn ChartInTime;')
    (BirthplaceSearch, ChartInTimeEngine, ChartInTimeText, {render: () => ''}, NatalEngine, Rooms, ChartRooms, {querySelector: () => el()});
  // A real <select> defaults to its first option; the stub must be seeded before attach renders.
  root.querySelector('#cit-method').value = 'secondary';
  const api = ChartInTime.attach(root, {});
  return {root, listeners, api};
}

test('chart in time registers three rooms and their readings round-trip', () => {
  const {root, listeners, api} = boot();
  assert.deepEqual(Rooms.list().map(r => r.kind).sort(), ['lunar-return', 'progressed', 'solar-return']);
  assert.equal(Rooms.get('solar-return').current(), null, 'nothing to save before a chart');
  api.setBirthChart(chart);
  const solar = Rooms.get('solar-return').current();
  assert.equal(solar.kind, 'solar-return');
  assert.deepEqual(solar.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(solar.payload.target, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(solar.payload.offset, 0); assert.equal(solar.payload.place, null);
  assert.match(solar.summary, /^Solar return \d{4} · Ascendant /);
  assert.equal(solar.layout, 'placidus');
  assert.match(root.querySelector('#cit-solar-output').innerHTML, /data-save-reading="solar-return"/);
  assert.match(root.querySelector('#cit-solar-output').innerHTML, /Saving stores the birth details this chart was cast from\./);

  // Progressed: the inputs come from the two controls.
  root.querySelector('#cit-method').value = 'tertiary'; root.querySelector('#cit-target').value = '2026-09-16';
  listeners.click({target: {closest: () => ({dataset: {citTab: 'progressed'}})}});
  const prog = Rooms.get('progressed').current();
  assert.deepEqual({...prog.payload, birth: undefined}, {v: 1, birth: undefined, target: '2026-09-16', method: 'tertiary'});
  assert.equal(prog.summary, 'Progressed to 2026 · tertiary'); assert.equal(prog.layout, 'tertiary');

  // Reopen a lunar return from a saved reading with a place override and an offset.
  const saved = ChartRooms.reading('lunar-return', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-03-01', offset: 1, place: {name: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'}}});
  assert.equal(Rooms.get('lunar-return').load(saved), true);
  const out = root.querySelector('#cit-lunar-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom/);
  assert.match(out, /data-chart-live="lunar-return"/);
  assert.match(out, /cast for Paris/);
  const reopened = Rooms.get('lunar-return').current();
  assert.deepEqual(reopened.payload, saved.payload, 'current() of a reopened chart is the saved payload');
  assert.match(reopened.summary, /^Lunar return \d{1,2} \w{3} 2026 · Ascendant /);

  // A deliberate place change while a saved return is open must keep the gate in step,
  // not silently do nothing while still reporting a location change upstream.
  root.querySelector('#cit-manual').checked = true;
  root.querySelector('#cit-lat').value = '52.52';
  root.querySelector('#cit-lon').value = '13.405';
  root.querySelector('#cit-zone').value = 'Europe/Berlin';
  root.querySelector('#cit-place').value = 'Berlin';
  listeners.submitPlace();
  assert.deepEqual(Rooms.get('lunar-return').current().payload.place, {name: 'Berlin', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin'});
  assert.match(root.querySelector('#cit-lunar-output').innerHTML, /cast for Berlin/);
  listeners.click({target: {closest: () => ({dataset: {citPlaceReset: ''}})}});
  assert.equal(Rooms.get('lunar-return').current().payload.place, null);

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart.
  const beforePushHtml = root.querySelector('#cit-lunar-output').innerHTML;
  const beforePushSummary = Rooms.get('lunar-return').current().summary;
  api.setBirthChart(chart);
  assert.equal(root.querySelector('#cit-lunar-output').innerHTML, beforePushHtml, 'a profile push must not re-render the restored chart');
  assert.equal(Rooms.get('lunar-return').current().summary, beforePushSummary, 'a profile push must not change the saved reading');
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'lunar-return'}})}});
  assert.deepEqual(Rooms.get('lunar-return').current().payload.birth, ChartRooms.birthFromChart(chart));
  assert.doesNotMatch(root.querySelector('#cit-lunar-output').innerHTML, /restored-chart/);

  // Bad payloads are refused and leave the state alone.
  assert.equal(Rooms.get('progressed').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-09-16', method: 'primary'}}), false);
  assert.deepEqual(Rooms.get('lunar-return').current().payload.birth, ChartRooms.birthFromChart(chart));
  // The sample chart is never saved.
  listeners.click({target: {closest: () => ({dataset: {citSample: ''}})}});
  assert.equal(Rooms.get('solar-return').current(), null);
});

// The DOM stub's querySelectorAll always returns [], so selectTab's own hidden-attribute
// toggling is unobservable here; "tab still solar" is verified instead through the render
// side effect load() triggers on the way back to the previous tab.
test('a load() the engine refuses restores the previously active tab and chart', () => {
  const {root, api} = boot();
  api.setBirthChart(chart);
  const payload = {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-09-16', method: 'secondary'};
  const reading = ChartRooms.reading('progressed', {payload});
  const original = ChartInTimeEngine.progressedChart;
  ChartInTimeEngine.progressedChart = (...args) => { ChartInTimeEngine.progressedChart = original; return {status: 'error', message: 'x'}; };
  let result;
  try { result = Rooms.get('progressed').load(reading); }
  finally { ChartInTimeEngine.progressedChart = original; }
  assert.equal(result, false);
  assert.match(root.querySelector('#cit-solar-output').innerHTML, /data-save-reading="solar-return"/, 'the solar tab was re-rendered, proving it is active again');
  assert.notEqual(Rooms.get('solar-return').current(), null, 'the live solar reading still works');
  assert.match(root.querySelector('.cit-profile-status').textContent, /^Your birth sky/, 'the live profile status line is back');
});

test('"Use my chart" resets the offset, target date and progression method to their live defaults', () => {
  const {listeners, api} = boot();
  api.setBirthChart(chart);

  const savedLunar = ChartRooms.reading('lunar-return', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-03-01', offset: 2, place: null}});
  assert.equal(Rooms.get('lunar-return').load(savedLunar), true);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'lunar-return'}})}});
  assert.equal(Rooms.get('lunar-return').current().payload.offset, 0, 'the lunar offset resets to 0');

  const savedProg = ChartRooms.reading('progressed', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-03-01', method: 'tertiary'}});
  assert.equal(Rooms.get('progressed').load(savedProg), true);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'progressed'}})}});
  assert.equal(Rooms.get('progressed').current().payload.method, 'secondary', 'the progression method resets to secondary');
});

test('setBirthChart invalidates lastModel for every kind, so a hidden tab does not pair a new birth with an old model', () => {
  const {listeners, api} = boot();
  api.setBirthChart(chart);
  assert.notEqual(Rooms.get('solar-return').current(), null, 'lastModel.solar is set from the initial render on the solar tab');
  listeners.click({target: {closest: () => ({dataset: {citTab: 'lunar'}})}});
  api.setBirthChart(other);
  assert.equal(Rooms.get('solar-return').current(), null, 'a hidden tab must not pair the new birth with the old model');
  listeners.click({target: {closest: () => ({dataset: {citTab: 'solar'}})}});
  assert.notEqual(Rooms.get('solar-return').current(), null, 'rendering the solar tab again recomputes lastModel.solar');
});
