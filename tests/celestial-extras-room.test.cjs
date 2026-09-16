const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const CelestialExtrasEngine = require('../celestial-extras-engine.js');
const RelationshipChartsEngine = require('../relationship-charts-engine.js');

// A minimal stand-in DOM element: properties are plain fields, queries return cached children.
const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); }, matches() { return false; },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, reset() {}, insertAdjacentHTML(_, html) { this.innerHTML += html; }}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});
const partnerBirth = {date: '1982-07-04', time: '08:00', place: {name: 'Paris, France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'}, houseSystem: 'placidus', fold: '', orbScale: 1};

function boot() {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  root.querySelector('#cx-partner-form').addEventListener = (type, fn) => {
    if (type === 'submit') listeners.submitPartner = () => fn({preventDefault() {}});
    if (type === 'input') listeners.inputPartner = (target = {id: 'cx-partner-date'}) => fn({target});
  };
  root.querySelector('#cx-annual-year').value = '2026';
  const src = fs.readFileSync(path.join(__dirname, '../celestial-extras.js'), 'utf8');
  const picker = {selection: null, getSelection() { return this.selection; }, restore(v) { this.selection = v; }};
  const CelestialExtras = new Function('BirthplaceSearch', 'CelestialExtrasEngine', 'BiWheel', 'NatalEngine', 'RelationshipChartsEngine', 'RelationshipCharts', 'NatalChart', 'Rooms', 'ChartRooms', 'window', 'location', 'document', 'requestAnimationFrame', src + '\nreturn CelestialExtras;')
    ({attach: () => picker}, CelestialExtrasEngine, {render: () => ''}, NatalEngine, RelationshipChartsEngine, {render: () => '<div class="rc"></div>'}, {renderWheel: () => ''}, Rooms, ChartRooms, {addEventListener() {}}, {hash: ''}, {querySelector: () => el()}, fn => fn());
  const api = CelestialExtras.attach(root);
  return {root, listeners, api, picker};
}

test('celestial extras registers the two-person rooms and BaZi, and readings round-trip', () => {
  const {root, listeners, api, picker} = boot();
  assert.match(root.innerHTML, /saved only if you save the chart/);
  assert.doesNotMatch(root.innerHTML, /are not saved/);
  assert.deepEqual(Rooms.list().map(r => r.kind).sort(), ['bazi', 'composite', 'davison', 'synastry']);
  assert.equal(Rooms.get('bazi').category, 'eastern');
  assert.equal(Rooms.get('synastry').category, 'charts');
  for (const kind of ['synastry', 'composite', 'davison', 'bazi']) assert.equal(Rooms.get(kind).current(), null, kind);
  api.setBirthChart(chart);

  // BaZi saves the reader's birth and the pillar in view.
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'bazi'}})}});
  listeners.click({target: {closest: () => ({dataset: {cxPillar: '1'}})}});
  const bazi = Rooms.get('bazi').current();
  assert.deepEqual({...bazi.payload, birth: undefined}, {v: 1, birth: undefined, pillar: 1});
  assert.deepEqual(bazi.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(bazi.summary, /^Day pillar \S+ · \w+ \w+$/); assert.equal(bazi.layout, 'four-pillars');
  assert.match(root.querySelector('#cx-bazi-output').innerHTML, /data-save-reading="bazi"[\s\S]*Saving stores the birth details this chart was cast from\./);

  // Two skies: the partner comes from the form; the kind follows the method.
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'synastry'}})}});
  assert.equal(Rooms.get('synastry').current(), null, 'no partner yet');
  root.querySelector('#cx-partner-date').value = '1982-07-04'; root.querySelector('#cx-partner-time').value = '08:00';
  root.querySelector('#cx-partner-fold').value = '';
  picker.selection = {latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris', label: 'Paris, France'};
  listeners.submitPartner();
  const syn = Rooms.get('synastry').current();
  assert.equal(syn.kind, 'synastry');
  assert.deepEqual(syn.payload.partner, partnerBirth);
  assert.equal(syn.summary, 'Synastry · 15 Jul 1990 · 4 Jul 1982'); assert.equal(syn.layout, 'placidus');
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /data-save-reading="synastry"[\s\S]*Saving stores both people’s birth details\./);

  // A load() the engine refuses while the live synastry chart is on screen must roll back everything
  // it mutated on the way in: the partner form fields, not just chart/partner/method/tab. Composite
  // readiness is checked against the composite engine itself (item 3), not the synastry model, so
  // the failure has to come from that engine now.
  const refused = ChartRooms.reading('composite', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: {...partnerBirth, date: '1975-01-01'}}});
  const originalComposite = RelationshipChartsEngine.composite;
  RelationshipChartsEngine.composite = () => ({status: 'missing', message: 'x'});
  assert.equal(Rooms.get('composite').load(refused), false, 'the engine refuses the restored composite chart');
  RelationshipChartsEngine.composite = originalComposite;
  assert.equal(root.querySelector('#cx-partner-date').value, '1982-07-04', 'the partner form is rolled back, not left on the refused payload');
  assert.deepEqual(picker.getSelection(), {latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris', label: 'Paris, France'}, 'the picker selection is rolled back too');
  assert.equal(root.querySelector('.cx-custom-place').open, false, 'the custom-place details element is rolled back closed');
  const stillLive = Rooms.get('synastry').current();
  assert.notEqual(stillLive, null, 'the live synastry reading still works');
  assert.equal(stillLive.kind, 'synastry');

  listeners.click({target: {closest: () => ({dataset: {cxMethod: 'davison'}, focus() {}})}});
  assert.equal(Rooms.get('synastry').current(), null, 'the synastry room is idle while Davison is shown');
  const dav = Rooms.get('davison').current();
  assert.equal(dav.kind, 'davison'); assert.equal(dav.summary, 'Davison · 15 Jul 1990 · 4 Jul 1982');
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /data-save-reading="davison"/);

  // Reopen a composite chart for two other people: the form shows the saved partner.
  const saved = ChartRooms.reading('composite', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: partnerBirth}});
  assert.equal(Rooms.get('composite').load(saved), true);
  const out = root.querySelector('#cx-synastry-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom and 4 July 1982 at 08:00, Paris, France/);
  assert.match(out, /data-chart-live="composite"/);
  assert.equal(root.querySelector('#cx-partner-date').value, '1982-07-04');
  assert.equal(root.querySelector('#cx-partner-manual').checked, true);
  assert.equal(root.querySelector('#cx-partner-zone').value, 'Europe/Paris');
  assert.deepEqual(Rooms.get('composite').current().payload, saved.payload);

  // The restored banner follows the room in view, not just the kind the chart was reopened as.
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'bazi'}})}});
  const baziOut = root.querySelector('#cx-bazi-output').innerHTML;
  assert.match(baziOut, /restored-chart[\s\S]*data-chart-live="bazi"/);
  assert.doesNotMatch(baziOut, /Paris/, 'the BaZi banner never names the synastry partner');
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'synastry'}})}});
  listeners.click({target: {closest: () => ({dataset: {cxMethod: 'synastry'}, focus() {}})}});
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /data-chart-live="synastry"/);
  listeners.click({target: {closest: () => ({dataset: {cxMethod: 'composite'}, focus() {}})}});

  // A partner swap on a reopened composite must clear the restored partner, not keep saving the old one.
  root.querySelector('#cx-partner-date').value = '1975-01-01';
  root.querySelector('#cx-partner-manual').checked = true;
  root.querySelector('#cx-partner-lat').value = '35.6762';
  root.querySelector('#cx-partner-lon').value = '139.6503';
  root.querySelector('#cx-partner-zone').value = 'Asia/Tokyo';
  root.querySelector('#cx-partner-place').value = 'Tokyo, Japan';
  listeners.submitPartner();
  assert.equal(Rooms.get('composite').current().payload.partner.date, '1975-01-01');
  assert.match(Rooms.get('composite').current().summary, /· 1 Jan 1975$/);
  assert.doesNotMatch(root.querySelector('#cx-synastry-output').innerHTML, /Paris/);
  // Restore the Paris partner so the later assertions still hold.
  root.querySelector('#cx-partner-date').value = partnerBirth.date;
  root.querySelector('#cx-partner-manual').checked = true;
  root.querySelector('#cx-partner-lat').value = String(partnerBirth.place.lat);
  root.querySelector('#cx-partner-lon').value = String(partnerBirth.place.lon);
  root.querySelector('#cx-partner-zone').value = partnerBirth.place.tz;
  root.querySelector('#cx-partner-place').value = partnerBirth.place.name;
  listeners.submitPartner();

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart, keeping the partner.
  const before = root.querySelector('#cx-synastry-output').innerHTML;
  api.setBirthChart(chart);
  assert.equal(root.querySelector('.cx-profile-status').textContent, 'Saved chart · 1985-11-29 · 09:15 · London, United Kingdom');
  assert.equal(root.querySelector('#cx-synastry-output').innerHTML, before);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'composite'}})}});
  const live = Rooms.get('composite').current();
  assert.deepEqual(live.payload.birth, ChartRooms.birthFromChart(chart));
  assert.deepEqual(live.payload.partner, partnerBirth);
  assert.doesNotMatch(root.querySelector('#cx-synastry-output').innerHTML, /restored-chart/);

  // Reopen a BaZi reading; a refused payload leaves the state alone; the sample is never saved.
  assert.equal(Rooms.get('bazi').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), pillar: 3}}), true);
  assert.match(root.querySelector('#cx-bazi-output').innerHTML, /restored-chart[\s\S]*data-chart-live="bazi"/);
  assert.equal(Rooms.get('bazi').current().payload.pillar, 3);
  assert.equal(Rooms.get('bazi').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), pillar: 9}}), false);
  assert.equal(Rooms.get('bazi').current().payload.pillar, 3);
  listeners.click({target: {closest: () => ({dataset: {cxSample: ''}})}});
  assert.equal(Rooms.get('bazi').current(), null);
  assert.equal(Rooms.get('synastry').current(), null);
});

test('the partner form input listener keeps the restored banner while a two-person chart is open', () => {
  const {root, listeners, api} = boot();
  api.setBirthChart(chart);
  const saved = ChartRooms.reading('composite', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: partnerBirth}});
  assert.equal(Rooms.get('composite').load(saved), true);
  listeners.inputPartner();
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /restored-chart[\s\S]*data-chart-live/, 'the reader can still return to their own chart while editing the partner form');
});

test('load() for composite and Davison checks the relationship chart itself, not the synastry model', () => {
  const {root, listeners, api, picker} = boot();
  api.setBirthChart(chart);
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'synastry'}})}});
  root.querySelector('#cx-partner-date').value = '1982-07-04'; root.querySelector('#cx-partner-time').value = '08:00';
  root.querySelector('#cx-partner-fold').value = '';
  picker.selection = {latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris', label: 'Paris, France'};
  listeners.submitPartner();
  assert.equal(Rooms.get('synastry').current().kind, 'synastry', 'synastryModel is ready before the failing load');

  const before = root.querySelector('#cx-partner-date').value;
  const saved = ChartRooms.reading('composite', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: partnerBirth}});
  const originalComposite = RelationshipChartsEngine.composite;
  // Not self-resetting after one call: load() renders the composite chart (which calls the
  // engine once) before its own readiness check calls it again.
  RelationshipChartsEngine.composite = () => ({status: 'error', message: 'x'});
  const result = Rooms.get('composite').load(saved);
  RelationshipChartsEngine.composite = originalComposite;

  assert.equal(result, false, 'the composite engine refusal must fail the load even though synastry is ready');
  assert.equal(root.querySelector('#cx-partner-date').value, before, 'the partner form is rolled back');
  assert.doesNotMatch(root.querySelector('#cx-synastry-output').innerHTML, /restored-chart/, 'no restored banner from a rolled-back load');
});

test('load() for synastry checks the synastry model, rolls back on refusal, and reopens with the banner naming both people', () => {
  const {root, api} = boot();
  api.setBirthChart(chart);
  const saved = ChartRooms.reading('synastry', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: partnerBirth}});

  // A refused synastry model must roll back everything load() mutated on the way in.
  const before = root.querySelector('#cx-partner-date').value;
  const originalSynastry = CelestialExtrasEngine.synastry;
  CelestialExtrasEngine.synastry = (...args) => { CelestialExtrasEngine.synastry = originalSynastry; return {status: 'missing', message: 'x'}; };
  assert.equal(Rooms.get('synastry').load(saved), false, 'the synastry engine refusal must fail the load');
  assert.equal(root.querySelector('#cx-partner-date').value, before, 'the partner form is rolled back');
  assert.doesNotMatch(root.querySelector('#cx-synastry-output').innerHTML, /restored-chart/, 'no restored banner from a rolled-back load');

  // A valid synastry reopen succeeds and shows the banner naming both people.
  assert.equal(Rooms.get('synastry').load(saved), true);
  const out = root.querySelector('#cx-synastry-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom and 4 July 1982 at 08:00, Paris, France/);
  assert.match(out, /data-chart-live="synastry"/);
  assert.deepEqual(Rooms.get('synastry').current().payload, saved.payload);
});
