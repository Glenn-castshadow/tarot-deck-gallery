const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const ClassicalEngine = require('../classical-engine.js');
const HoraryEngine = require('../horary-engine.js');
const HoraryText = require('../horary-text.js');

const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

test('the horary room saves the moment, the house and the question, and reopens them', async () => {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  // The question form's submit listener is captured so the test can cast from the form.
  root.querySelector('#ho-question-form').addEventListener = (type, fn) => { listeners.submitQuestion = () => fn({preventDefault() {}}); };
  const src = fs.readFileSync(path.join(__dirname, '../horary.js'), 'utf8');
  const Horary = new Function('BirthplaceSearch', 'HoraryEngine', 'HoraryText', 'HoraryChart', 'ClassicalEngine', 'NatalEngine', 'Rooms', 'ChartRooms', src + '\nreturn Horary;')
    ({attach: () => ({getSelection: () => null, restore() {}})}, HoraryEngine, HoraryText, {render: () => ''}, ClassicalEngine, NatalEngine, Rooms, ChartRooms);
  const api = Horary.attach(root);
  const room = Rooms.get('horary');
  assert.ok(room);
  assert.equal(room.current(), null, 'nothing to save before a cast');

  const saved = ChartRooms.reading('horary', {payload: {v: 1, moment: {date: '2026-09-16', time: '14:02', place: {name: 'London, United Kingdom', lat: 51.5085, lon: -0.1257, tz: 'Europe/London'}}, house: 7}, question: 'Will the roof hold through winter?', layout: 'regiomontanus'});
  assert.equal(room.load(saved), true);
  assert.equal(root.querySelector('#ho-question-text').value, 'Will the roof hold through winter?');
  assert.equal(root.querySelector('#ho-house-matter').value, '7');
  assert.equal(root.querySelector('#ho-date').value, '2026-09-16');
  assert.equal(root.querySelector('#ho-manual').checked, true);
  assert.equal(root.querySelector('#ho-zone').value, 'Europe/London');
  const out = root.querySelector('#ho-question-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved question · 16 September 2026 at 14:02, London, United Kingdom</);
  assert.doesNotMatch(out, /data-chart-live/);
  assert.match(out, /data-save-reading="horary"/);
  assert.match(out, /Saving stores the moment, the place and your question\./);
  const again = room.current();
  assert.deepEqual(again.payload, saved.payload);
  assert.equal(again.question, saved.question);
  assert.equal(again.layout, 'regiomontanus');
  assert.match(again.summary, /^House 7 · Ascendant \w+ · 16 Sep 2026$/);

  // The echoed question must be the saved one, not whatever is currently sitting
  // unsaved in the textarea -- a tab switch away and back must not let them drift apart.
  root.querySelector('#ho-question-text').value = 'Something else entirely';
  listeners.click({target: {closest: () => ({dataset: {hoTab: 'significators'}})}});
  listeners.click({target: {closest: () => ({dataset: {hoTab: 'question'}})}});
  assert.match(root.querySelector('#ho-question-output').innerHTML, /ho-question-echo">.Will the roof hold through winter\?./);

  // While a restored moment is on screen, a birth-profile push leaves the saved place alone;
  // the elect tab, which is not part of the restored moment, still follows the live chart. The
  // tab is switched *before* the push so the update has to come from setBirthChart's own
  // tab === 'elect' branch, not from a later tab-click re-render.
  const placeBefore = root.querySelector('#ho-place').value;
  const otherBirth = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris', label: 'Paris, France'}});
  listeners.click({target: {closest: () => ({dataset: {hoTab: 'elect'}})}});
  api.setBirthChart(otherBirth);
  assert.equal(root.querySelector('#ho-place').value, placeBefore);
  assert.equal(root.querySelector('#ho-place').value, 'London, United Kingdom');
  assert.match(root.querySelector('#ho-elect-place').textContent, /Paris, France/);
  assert.deepEqual(room.current().payload, saved.payload);
  // Ticking manual coordinates clears the place name so it doesn't mislabel custom coordinates.
  listeners.change({target: {id: 'ho-manual', checked: true}});
  assert.equal(root.querySelector('#ho-place').value, '');

  // A cast from the form replaces the restored banner; the new question is clipped to 240.
  root.querySelector('#ho-question-text').value = 'x'.repeat(300);
  root.querySelector('#ho-house-matter').value = '2';
  global.requestAnimationFrame = fn => fn();   // castQuestion defers through rAF and setTimeout(…, 0)
  listeners.submitQuestion();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(room.current().question.length, 240);
  assert.equal(room.current().payload.house, 2);
  assert.doesNotMatch(root.querySelector('#ho-question-output').innerHTML, /restored-chart/);
  // A refused load leaves the state alone.
  assert.equal(room.load({payload: {v: 1, moment: {date: '2026-13-01', time: '14:02', place: saved.payload.moment.place}, house: 7}}), false);
  assert.equal(room.current().payload.house, 2);
});

test('a load() whose cast fails restores the form and reading exactly as they were', () => {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const src = fs.readFileSync(path.join(__dirname, '../horary.js'), 'utf8');
  const Horary = new Function('BirthplaceSearch', 'HoraryEngine', 'HoraryText', 'HoraryChart', 'ClassicalEngine', 'NatalEngine', 'Rooms', 'ChartRooms', src + '\nreturn Horary;')
    ({attach: () => ({getSelection: () => null, restore() {}})}, HoraryEngine, HoraryText, {render: () => ''}, ClassicalEngine, NatalEngine, Rooms, ChartRooms);
  Horary.attach(root);
  const room = Rooms.get('horary');

  const first = ChartRooms.reading('horary', {payload: {v: 1, moment: {date: '2026-09-16', time: '14:02', place: {name: 'London, United Kingdom', lat: 51.5085, lon: -0.1257, tz: 'Europe/London'}}, house: 7}, question: 'Will the roof hold through winter?', layout: 'regiomontanus'});
  assert.equal(room.load(first), true, 'the first reopen succeeds');
  const questionBefore = root.querySelector('#ho-question-text').value;
  const dateBefore = root.querySelector('#ho-date').value;
  const castStatusBefore = root.querySelector('#ho-cast-status').textContent;
  const payloadBefore = room.current().payload;

  const second = ChartRooms.reading('horary', {payload: {v: 1, moment: {date: '2026-01-01', time: '09:00', place: {name: 'Paris, France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'}}, house: 3}, question: 'A different question entirely', layout: 'regiomontanus'});
  const originalCast = HoraryEngine.cast;
  HoraryEngine.cast = (...args) => { HoraryEngine.cast = originalCast; return {status: 'missing', message: 'x'}; };
  let result;
  try { result = room.load(second); } finally { HoraryEngine.cast = originalCast; }

  assert.equal(result, false, 'the failed cast must refuse the load');
  assert.equal(root.querySelector('#ho-question-text').value, questionBefore, 'the question textarea is rolled back');
  assert.equal(root.querySelector('#ho-date').value, dateBefore, 'the date field is rolled back');
  assert.equal(root.querySelector('#ho-cast-status').textContent, castStatusBefore, 'the cast status line is rolled back');
  assert.deepEqual(room.current().payload, payloadBefore, 'the previously reopened reading is still current');
});
