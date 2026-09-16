const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const JyotishEngine = require('../jyotish-engine.js');
const JyotishText = require('../jyotish-text.js');

const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});

function boot() {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const src = fs.readFileSync(path.join(__dirname, '../jyotish.js'), 'utf8');
  const Jyotish = new Function('JyotishEngine', 'JyotishText', 'JyotishChart', 'NatalEngine', 'Rooms', 'ChartRooms', 'document', src + '\nreturn Jyotish;')
    (JyotishEngine, JyotishText, {render: () => ''}, NatalEngine, Rooms, ChartRooms, {querySelector: () => el()});
  const api = Jyotish.attach(root);
  return {root, listeners, api};
}

test('the Jyotish room saves the birth, the tab and the Gochar date, and reopens them', () => {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const src = fs.readFileSync(path.join(__dirname, '../jyotish.js'), 'utf8');
  const Jyotish = new Function('JyotishEngine', 'JyotishText', 'JyotishChart', 'NatalEngine', 'Rooms', 'ChartRooms', 'document', src + '\nreturn Jyotish;')
    (JyotishEngine, JyotishText, {render: () => ''}, NatalEngine, Rooms, ChartRooms, {querySelector: () => el()});
  const api = Jyotish.attach(root);
  const room = Rooms.get('jyotish');
  assert.ok(room);
  assert.equal(room.current(), null, 'nothing to save before a chart');
  api.setBirthChart(chart);
  listeners.click({target: {closest: () => ({dataset: {jyTab: 'gochar'}})}});
  root.querySelector('#jy-gochar-date').value = '2026-09-16';
  listeners.change({target: {id: 'jy-gochar-date', value: '2026-09-16'}});
  const reading = room.current();
  assert.deepEqual({...reading.payload, birth: undefined}, {v: 1, birth: undefined, tab: 'gochar', gochar: '2026-09-16'});
  assert.deepEqual(reading.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(reading.summary, /^Lagna \w+ · Moon in [\w ]+$/); assert.equal(reading.layout, 'sidereal');
  assert.match(root.querySelector('#jy-gochar-output').innerHTML, /data-save-reading="jyotish"[\s\S]*Saving stores the birth details this chart was cast from\./);

  // Reopen on the rashi tab for another birth.
  const saved = ChartRooms.reading('jyotish', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'rashi', gochar: '2026-03-01'}});
  assert.equal(room.load(saved), true);
  const rashi = root.querySelector('#jy-rashi').innerHTML;
  assert.match(rashi, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom/);
  assert.match(rashi, /data-chart-live="jyotish"/);
  assert.equal(root.querySelector('#jy-gochar-date').value, '2026-03-01');
  assert.deepEqual(room.current().payload, saved.payload);

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart.
  const before = rashi, beforeSummary = room.current().summary;
  api.setBirthChart(chart);
  assert.equal(root.querySelector('#jy-rashi').innerHTML, before); assert.equal(room.current().summary, beforeSummary);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'jyotish'}})}});
  assert.deepEqual(room.current().payload.birth, ChartRooms.birthFromChart(chart));
  assert.doesNotMatch(root.querySelector('#jy-rashi').innerHTML, /restored-chart/);

  // Refused payload leaves the state alone; the sample is never saved.
  assert.equal(room.load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'moon', gochar: '2026-03-01'}}), false);
  assert.deepEqual(room.current().payload.birth, ChartRooms.birthFromChart(chart));
  listeners.click({target: {closest: () => ({dataset: {jySample: ''}})}});
  assert.equal(room.current(), null);
});

test('load() resets the chart format to south', () => {
  const {root, listeners, api} = boot();
  const room = Rooms.get('jyotish');
  api.setBirthChart(chart);
  listeners.click({target: {closest: () => ({dataset: {jyFormat: 'north'}})}});
  assert.match(root.querySelector('#jy-rashi').innerHTML, /data-jy-format="north" aria-pressed="true"/, 'the north toggle is active before reopening');

  const saved = ChartRooms.reading('jyotish', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'rashi', gochar: '2026-03-01'}});
  assert.equal(room.load(saved), true);
  assert.match(root.querySelector('#jy-rashi').innerHTML, /data-jy-format="south" aria-pressed="true"/, 'reopening a chart resets the format toggle to south, the attach default');
});

test('the Gochar restored banner renders above the controls, not inside the output', () => {
  const {root, api} = boot();
  api.setBirthChart(chart);
  const room = Rooms.get('jyotish');
  const saved = ChartRooms.reading('jyotish', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'gochar', gochar: '2026-03-01'}});
  assert.equal(room.load(saved), true);
  assert.match(root.querySelector('.jy-gochar-banner').innerHTML, /restored-chart/, 'the banner is rendered into its own div above the intro and date controls');
  assert.doesNotMatch(root.querySelector('#jy-gochar-output').innerHTML, /restored-chart/, 'the output itself carries no banner');
  assert.match(root.innerHTML, /<section id="jy-gochar"[^>]*><div class="jy-gochar-banner">/, 'the banner div is the template\'s first child of the Gochar section');
});

test('"Use my chart" and the sample toggle clear a stale Gochar banner even from another tab', () => {
  const {root, listeners, api} = boot();
  api.setBirthChart(chart);
  const room = Rooms.get('jyotish');
  const saved = ChartRooms.reading('jyotish', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'gochar', gochar: '2026-03-01'}});
  assert.equal(room.load(saved), true);
  assert.match(root.querySelector('.jy-gochar-banner').innerHTML, /restored-chart/, 'sanity: the banner is showing before the gate clears');

  // The Gochar tab is hidden now, so only renderGochar (not run again yet) would
  // normally refresh its banner div -- chartLive must clear it directly.
  listeners.click({target: {closest: () => ({dataset: {jyTab: 'rashi'}})}});
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'jyotish'}})}});
  assert.equal(root.querySelector('.jy-gochar-banner').innerHTML, '', 'chartLive clears the hidden Gochar banner too');

  // Same story for the sample toggle, reopened and switched away again.
  assert.equal(room.load(saved), true);
  listeners.click({target: {closest: () => ({dataset: {jyTab: 'rashi'}})}});
  listeners.click({target: {closest: () => ({dataset: {jySample: ''}})}});
  assert.equal(root.querySelector('.jy-gochar-banner').innerHTML, '', 'the sample toggle clears the hidden Gochar banner too');
});
