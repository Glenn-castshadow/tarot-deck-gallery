const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const BirthProfile = require('../birth-profile.js');

function memoryStorage() { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)}; }
const fakeEngine = {calculate: input => ({status: input.time ? 'ready' : 'birthday-only', input})};

test('save stores, resolves and notifies subscribers', () => {
  const bp = BirthProfile.create({storage: memoryStorage(), natalEngine: fakeEngine, key: 'k'});
  const seen = [];
  bp.subscribe(state => seen.push(state));
  assert.equal(seen[0], null);
  bp.save({birthday: '1980-10-22', time: '08:00', place: 'Lisbon', placeLocation: {latitude: 38.7, longitude: -9.1, timeZone: 'Europe/Lisbon'}});
  assert.equal(seen[1].natal.status, 'ready');
  assert.equal(bp.load().birthday, '1980-10-22');
});

test('restore reads storage and a corrupt value yields null', () => {
  const storage = memoryStorage();
  storage.setItem('k', '{not json');
  const bp = BirthProfile.create({storage, natalEngine: fakeEngine, key: 'k'});
  assert.equal(bp.current(), null);
  storage.setItem('k', JSON.stringify({birthday: '1990-01-01'}));
  bp.restore();
  assert.equal(bp.current().natal.status, 'birthday-only');
});

test('setReturnLocation updates the stored profile only when one exists', () => {
  const storage = memoryStorage();
  const bp = BirthProfile.create({storage, natalEngine: fakeEngine, key: 'k'});
  bp.setReturnLocation({label: 'Rome'});
  assert.equal(storage.getItem('k'), null);
  bp.save({birthday: '1990-01-01'});
  bp.setReturnLocation({label: 'Rome'});
  assert.equal(JSON.parse(storage.getItem('k')).returnLocation.label, 'Rome');
});

test('a subscriber registered against a returning visitor sees the already-resolved state immediately', () => {
  // create() restores from storage before returning, so a returning visitor's state is
  // already non-null by the time app.js's six subscribe() calls run -- the common case,
  // distinct from the empty-storage-then-save() path exercised by the first test above.
  const storage = memoryStorage();
  storage.setItem('k', JSON.stringify({birthday: '1980-10-22', time: '08:00'}));
  const bp = BirthProfile.create({storage, natalEngine: fakeEngine, key: 'k'});
  const seen = [];
  bp.subscribe(state => seen.push(state));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].profile.birthday, '1980-10-22');
  assert.equal(seen[0].natal.status, 'ready');
});

test('browser bootstrap attaches a working BirthProfile even though NatalEngine is a top-level const, not a window property', () => {
  // Mirrors the real page: window is the global object (as in a browser), IshtarStorage
  // is assigned explicitly onto window (as storage-preferences.js does), and NatalEngine
  // is a top-level `const` in its own classic script (as natal-engine.js does) -- a
  // lexical binding, never a property of window, even though window === globalThis here.
  const context = {};
  context.window = context;
  vm.createContext(context);

  vm.runInContext(
    `window.IshtarStorage = (() => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)}; })();`,
    context
  );
  vm.runInContext(
    `const NatalEngine = {calculate: input => ({status: input.time ? 'ready' : 'birthday-only', input})};`,
    context
  );

  // Confirm the vm setup actually reproduces the gap the bug relied on before asserting
  // the fix survives it.
  assert.equal(vm.runInContext('typeof NatalEngine', context), 'object');
  assert.equal(vm.runInContext('typeof window.NatalEngine', context), 'undefined');

  const source = fs.readFileSync(path.join(__dirname, '..', 'birth-profile.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'birth-profile.js' });

  assert.equal(typeof context.window.BirthProfile, 'object');
  assert.equal(typeof context.window.BirthProfile.subscribe, 'function');

  const seen = [];
  context.window.BirthProfile.subscribe(state => seen.push(state));
  assert.equal(seen[0], null);
});
