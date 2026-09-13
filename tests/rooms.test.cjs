const test = require('node:test');
const assert = require('node:assert/strict');
const Rooms = require('../rooms.js');

test('register and current round-trip', () => {
  Rooms._reset();
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => ({kind: 'runes', payload: {ids: [1]}}), load: () => true});
  assert.equal(Rooms.get('runes').label, 'Runes');
  assert.deepEqual(Rooms.list().map(r => r.kind), ['runes']);
  assert.equal(Rooms.pageFor('runes'), '/divination/');
  assert.equal(Rooms.pageFor('natal'), '/charts/');
  // BaZi is one tab of the CelestialExtras component, which the site split keeps whole on
  // /charts/; a journal Open for a saved Four Pillars reading must land there.
  assert.equal(Rooms.pageFor('bazi'), '/charts/');
  assert.equal(Rooms.pageFor('jyotish'), '/eastern/');
  assert.equal(Rooms.pageFor('made-up'), null);
});

test('register rejects unknown category and duplicate kind', () => {
  Rooms._reset();
  assert.throws(() => Rooms.register('x', {label: 'X', category: 'nope', current: () => null, load: () => false}));
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: () => false});
  assert.throws(() => Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: () => false}));
});

test('openFromQuery dispatches to the room', async () => {
  Rooms._reset();
  let loaded = null;
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: r => { loaded = r; return true; }});
  const getReading = async id => ({ok: true, reading: {id, kind: 'runes', payload: {ids: [3]}}});
  assert.equal(await Rooms.openFromQuery({search: '?reading=7', getReading, scrollTo: () => {}}), 'opened');
  assert.deepEqual(loaded.payload, {ids: [3]});
  assert.equal(await Rooms.openFromQuery({search: '', getReading, scrollTo: () => {}}), 'none');
  assert.equal(await Rooms.openFromQuery({search: '?reading=abc', getReading, scrollTo: () => {}}), 'none');
  const unknown = async id => ({ok: true, reading: {id, kind: 'natal', payload: {}}});
  assert.equal(await Rooms.openFromQuery({search: '?reading=1', getReading: unknown, scrollTo: () => {}}), 'unknown');
  const failing = async () => ({ok: false, message: 'no'});
  assert.equal(await Rooms.openFromQuery({search: '?reading=1', getReading: failing, scrollTo: () => {}}), 'failed');
});

test('labelFor and pageFor cover every kind the journal can hold, registered or not', () => {
  Rooms._reset();
  const kinds = require('fs').readFileSync(require('path').join(__dirname, '..', 'server', 'ishtar', 'readings', 'kinds.py'), 'utf8');
  const expected = [...kinds.matchAll(/^\s*'?([a-z-]+)'?: \('([^']+)'/gm)].map(m => [m[1], m[2]]);
  assert.equal(expected.length, 16);
  for (const [kind, label] of expected) {
    assert.equal(Rooms.labelFor(kind), label, kind);
    // A kind with no PAGES entry makes journal "Open" fall through to "cannot be
    // replayed" instead of navigating to the page that owns it.
    assert.ok(Rooms.pageFor(kind), `${kind} has no page`);
  }
  assert.equal(Rooms.labelFor('made-up'), null);
  Rooms.register('runes', {label: 'Rune draw', category: 'divination', current: () => null, load: () => false});
  assert.equal(Rooms.labelFor('runes'), 'Rune draw');
});
