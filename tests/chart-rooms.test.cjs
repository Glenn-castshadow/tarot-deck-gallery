const test = require('node:test');
const assert = require('node:assert/strict');
// A stand-in for `document`, set before the require below so chart-rooms.js's own
// `typeof document !== 'undefined'` guard sees it and registers its account-change
// listener against this fake object instead of skipping (there is no real DOM here).
const fakeDocument = {handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, querySelectorAll() { return []; }};
global.document = fakeDocument;
const R = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');

const BIRTH = {date: '1990-07-15', time: '14:30', place: {name: 'New York, United States', lat: 40.7143, lon: -74.006, tz: 'America/New_York'}, houseSystem: 'placidus', fold: '', orbScale: 1};
const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});

test('birthFromChart and natalFrom round-trip a chart', () => {
  assert.equal(chart.status, 'ready');
  assert.equal(chart.fold, '');
  const birth = R.birthFromChart(chart);
  assert.deepEqual(birth, BIRTH);
  const again = R.natalFrom(birth);
  assert.equal(again.status, 'ready');
  assert.equal(again.points[0].longitude, chart.points[0].longitude);
  assert.equal(R.birthFromChart({status: 'missing'}), null);
  assert.deepEqual(R.locationFrom(BIRTH.place), {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'});
});

test('validate accepts each kind and refuses bad payloads', () => {
  const ok = {
    natal: {v: 1, birth: BIRTH},
    'solar-return': {v: 1, birth: BIRTH, target: '2026-09-16', offset: -1, place: null},
    'lunar-return': {v: 1, birth: BIRTH, target: '2026-09-16', offset: 2, place: {name: 'Paris', lat: 48.85, lon: 2.35, tz: 'Europe/Paris'}},
    progressed: {v: 1, birth: BIRTH, target: '2026-09-16', method: 'solar-arc'},
    synastry: {v: 1, birth: BIRTH, partner: BIRTH},
    composite: {v: 1, birth: BIRTH, partner: BIRTH},
    davison: {v: 1, birth: BIRTH, partner: BIRTH},
    horary: {v: 1, moment: {date: '2026-09-16', time: '14:02', place: BIRTH.place}, house: 7},
    jyotish: {v: 1, birth: BIRTH, tab: 'gochar', gochar: '2026-09-16'},
    bazi: {v: 1, birth: BIRTH, pillar: 2},
  };
  for (const [kind, payload] of Object.entries(ok)) assert.deepEqual(R.validate(kind, payload), payload, kind);
  // Unknown fields are dropped; numbers arrive as numbers.
  assert.deepEqual(R.validate('natal', {v: 1, birth: {...BIRTH, extra: 1}, extra: 2}), {v: 1, birth: BIRTH});
  assert.deepEqual(R.validate('bazi', {v: 1, birth: BIRTH, pillar: '3'}), {v: 1, birth: BIRTH, pillar: 3});
  const bad = [
    ['natal', null], ['natal', {v: 2, birth: BIRTH}], ['natal', {v: 1}], ['made-up', ok.natal],
    ['natal', {v: 1, birth: {...BIRTH, date: '1990-7-15'}}],
    ['natal', {v: 1, birth: {...BIRTH, time: '25:00'}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, lat: 95}}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, lon: -200}}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, tz: ''}}}],
    ['natal', {v: 1, birth: {...BIRTH, houseSystem: 'koch'}}],
    ['natal', {v: 1, birth: {...BIRTH, fold: 'maybe'}}],
    ['natal', {v: 1, birth: {...BIRTH, orbScale: 2}}],
    ['solar-return', {v: 1, birth: BIRTH, target: 'today', offset: 0, place: null}],
    ['solar-return', {v: 1, birth: BIRTH, target: '2026-09-16', offset: 1.5, place: null}],
    ['progressed', {v: 1, birth: BIRTH, target: '2026-09-16', method: 'primary'}],
    ['synastry', {v: 1, birth: BIRTH}],
    ['horary', {v: 1, moment: {date: '2026-09-16', time: '14:02', place: BIRTH.place}, house: 13}],
    ['horary', {v: 1, moment: {date: '2026-09-16', time: '14:02'}, house: 7}],
    ['jyotish', {v: 1, birth: BIRTH, tab: 'moon', gochar: '2026-09-16'}],
    ['bazi', {v: 1, birth: BIRTH, pillar: 4}],
  ];
  for (const [kind, payload] of bad) assert.equal(R.validate(kind, payload), null, `${kind} ${JSON.stringify(payload)}`);
});

test('reading clips to the server caps and describe reads well', () => {
  const r = R.reading('natal', {payload: {v: 1, birth: BIRTH}, summary: 'x'.repeat(130), layout: 'y'.repeat(50), question: 'q'.repeat(250)});
  assert.deepEqual(Object.keys(r).sort(), ['deck', 'focus', 'kind', 'layout', 'payload', 'question', 'summary']);
  assert.equal(r.kind, 'natal'); assert.equal(r.deck, ''); assert.equal(r.focus, '');
  assert.equal(r.summary.length, 120); assert.equal(r.layout.length, 40); assert.equal(r.question.length, 240);
  assert.equal(R.reading('natal', {payload: {}, summary: 's'}).question, '');
  assert.equal(R.describe(BIRTH), '15 July 1990 at 14:30, New York, United States');
  assert.equal(R.describe({...BIRTH, place: {...BIRTH.place, name: ''}}), '15 July 1990 at 14:30, 40.7143, -74.006');
  assert.equal(R.describeMoment({date: '2026-09-16', time: '14:02', place: {name: 'London', lat: 51.5, lon: -0.1, tz: 'Europe/London'}}), '16 September 2026 at 14:02, London');
});

test('summaries name what the chart showed', () => {
  assert.equal(R.summaries.natal(chart), `Sun ${chart.points[0].sign} · Moon ${chart.points[1].sign} · Ascendant ${chart.axes[0].sign}`);
  const solar = {moment: '2026-07-15T02:11:00.000Z', chart: {axes: [{sign: 'Scorpio'}]}};
  assert.equal(R.summaries.solarReturn(solar), 'Solar return 2026 · Ascendant Scorpio');
  assert.equal(R.summaries.lunarReturn({moment: '2026-03-12T22:40:00.000Z', chart: {axes: [{sign: 'Leo'}]}}), 'Lunar return 12 Mar 2026 · Ascendant Leo');
  assert.equal(R.summaries.progressed({target: '2026-09-16', method: 'secondary'}), 'Progressed to 2026 · secondary');
  assert.equal(R.summaries.horary({result: {chart: {axes: [{sign: 'Gemini'}]}}, house: 7, date: '2026-09-16'}), 'House 7 · Ascendant Gemini · 16 Sep 2026');
});

test('save control, banner and gate', () => {
  const control = R.saveControl('natal', R.NOTES.one);
  assert.match(control, /^<p class="save-reading"><button type="button" data-save-reading="natal">Sign in to save this chart<\/button><span role="status" aria-live="polite"><\/span><span class="save-note">Saving stores the birth details this chart was cast from\.<\/span><\/p>$/);
  assert.match(R.saveControl('horary', R.NOTES.horary), /moment, the place and your question/);
  assert.match(R.NOTES.two, /both people’s birth details/);
  assert.equal(R.banner('Saved chart · cast for <x>', {live: 'natal'}), '<p class="restored-chart" role="status">Saved chart · cast for &lt;x&gt; <button type="button" data-chart-live="natal">Use my chart</button></p>');
  assert.equal(R.banner('Saved question'), '<p class="restored-chart" role="status">Saved question</p>');
  const gate = R.restoredGate();
  assert.equal(gate.active(), false);
  gate.set({a: 1});
  assert.equal(gate.active(), true); assert.deepEqual(gate.get(), {a: 1});
  gate.clear();
  assert.equal(gate.active(), false); assert.equal(gate.get(), null);
});

test('a save button relabels in place on ishtar-account-change', () => {
  const handler = fakeDocument.handlers['ishtar-account-change'];
  assert.ok(handler, 'chart-rooms.js registers a listener at require time');
  const button = {textContent: 'Sign in to save this chart'};
  const note = {closest: () => ({querySelector: () => button})};
  fakeDocument.querySelectorAll = selector => selector === '.save-reading .save-note' ? [note] : [];
  global.IshtarAccount = {state: () => ({signedIn: true})};
  try { handler(); } finally { delete global.IshtarAccount; }
  assert.equal(button.textContent, 'Save this chart to my journal');
});
