const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot(choice) {
  const store = new Map(choice ? [['ishtar-storage-choice-v1', choice]] : []);
  const context = {
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)},
    document: {addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }},
    window: {}
  };
  Object.defineProperty(context.localStorage, 'length', {get: () => store.size});
  context.Object = Object;
  vm.runInNewContext(fs.readFileSync(require.resolve('../storage-preferences.js'), 'utf8'), context);
  return {storage: context.window.IshtarStorage, store};
}

test('remote takes over reads and writes for one key only', () => {
  const {storage, store} = boot('allow');
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1990-01-01"}');
  storage.setItem('arcana-reading-deck-v1', 'ishtar');
  let remoteValue = '{"birthday":"2000-02-02"}';
  const writes = [];
  storage.setRemote('arcana-birthday-profile-v1', {get: () => remoteValue, set: v => writes.push(v)});
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"2000-02-02"}');
  assert.equal(storage.getItem('arcana-reading-deck-v1'), 'ishtar');
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"2001-03-03"}');
  assert.deepEqual(writes, ['{"birthday":"2001-03-03"}']);
  assert.equal(store.get('arcana-birthday-profile-v1'), '{"birthday":"1990-01-01"}', 'remote writes do not touch localStorage');
  assert.equal(storage.localItem('arcana-birthday-profile-v1'), '{"birthday":"1990-01-01"}');
  storage.setRemote('arcana-birthday-profile-v1', null);
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"2001-03-03"}', 'memory mirror survives sign-out');
});

test('signed-out behaviour is unchanged: declined storage stays in memory only', () => {
  const {storage, store} = boot('decline');
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1990-01-01"}');
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1990-01-01"}');
  assert.equal(store.has('arcana-birthday-profile-v1'), false);
  assert.equal(storage.localItem('arcana-birthday-profile-v1'), null);
});
