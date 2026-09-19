const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot(choice) {
  const store = new Map(choice ? [['ishtar-storage-choice-v1', choice]] : []);
  let domReadyHandler = null;
  function makeButton(dataset) {
    const button = {
      dataset,
      _clickHandlers: [],
      addEventListener(type, handler) { if (type === 'click') button._clickHandlers.push(handler); },
      click() { button._clickHandlers.forEach(handler => handler()); },
      focus() {}
    };
    return button;
  }
  const settingsButton = makeButton({});
  const noticeInnerButton = makeButton({});
  const allowButton = makeButton({storageChoice: 'allow'});
  const declineButton = makeButton({storageChoice: 'decline'});
  const notice = {
    hidden: true,
    querySelector(selector) { return selector === 'button' ? noticeInnerButton : null; },
    querySelectorAll(selector) { return selector === '[data-storage-choice]' ? [allowButton, declineButton] : []; }
  };
  const status = {textContent: ''};
  const context = {
    // A Proxy so Object.keys(localStorage) lists the stored keys, as it does in a browser; clearSaved() relies on that.
    localStorage: new Proxy({getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)}, {
      ownKeys: () => [...store.keys()],
      getOwnPropertyDescriptor: (target, key) => store.has(key) ? {value: store.get(key), enumerable: true, configurable: true} : Reflect.getOwnPropertyDescriptor(target, key)
    }),
    document: {
      addEventListener(type, handler) { if (type === 'DOMContentLoaded') domReadyHandler = handler; },
      querySelector(selector) {
        if (selector === '#storage-notice') return notice;
        if (selector === '#storage-status') return status;
        if (selector === '[data-storage-settings]') return settingsButton;
        return null;
      },
      querySelectorAll(selector) { return selector === '[data-storage-settings]' ? [settingsButton] : []; }
    },
    window: {}
  };
  Object.defineProperty(context.localStorage, 'length', {get: () => store.size, configurable: true});
  context.Object = Object;
  vm.runInNewContext(fs.readFileSync(require.resolve('../storage-preferences.js'), 'utf8'), context);
  return {
    storage: context.window.IshtarStorage,
    store,
    notice,
    status,
    settingsButton,
    allowButton,
    declineButton,
    // Fires the real DOMContentLoaded callback the module registered. Throws loudly
    // instead of silently no-op'ing if storage-preferences.js never called
    // document.addEventListener('DOMContentLoaded', ...) — a mock that only stubs
    // document-level querySelectorAll (not notice.querySelectorAll) has bitten this
    // suite before by making the consent handler look wired up when it wasn't.
    fireDomReady() {
      if (typeof domReadyHandler !== 'function') {
        throw new Error('DOMContentLoaded handler was never registered by storage-preferences.js');
      }
      domReadyHandler();
    }
  };
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
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1990-01-01"}', "sign-out falls back to the visitor's own local copy (written before any remote was attached), not the memory mirror of the signed-in session");
});

test('signed-out behaviour is unchanged: declined storage stays in memory only', () => {
  const {storage, store} = boot('decline');
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1990-01-01"}');
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1990-01-01"}');
  assert.equal(store.has('arcana-birthday-profile-v1'), false);
  assert.equal(storage.localItem('arcana-birthday-profile-v1'), null);
});

// Finding 1: sign-out must not leave the previous visitor's data readable. This is the
// complementary case to the test above: here the visitor never had a local copy of their
// own (pure remote session, e.g. signed in on a fresh browser), so after sign-out the
// correct fallback is null, not the signed-in value that used to leak through memory.
test('sign-out clears the memory mirror instead of leaking the signed-in value to the next reader', () => {
  const {storage} = boot('allow');
  let remoteValue = '{"birthday":"1980-01-01"}';
  storage.setRemote('arcana-birthday-profile-v1', {get: () => remoteValue, set: v => { remoteValue = v; }});
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1980-01-01"}');
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1990-05-05"}');
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1990-05-05"}');
  storage.setRemote('arcana-birthday-profile-v1', null);
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), null, "sign-out must not leave the previous visitor's data readable; this visitor never had a local copy of their own");
});

// Finding 2: the consent "allow" flush must not persist a remote-backed (server) value into
// real localStorage, because that survives reloads and new tabs, unlike the in-page memory
// mirror. Verified "in either direction": this test proves the remote-backed key is skipped,
// the next test proves the flush's original purpose (non-remote keys) still works.
test('consent allow-click must not flush a remote-backed key into localStorage', () => {
  const {storage, store, fireDomReady, allowButton} = boot(null);
  storage.setRemote('arcana-birthday-profile-v1', {get: () => 'server-copy-signed-in', set: () => {}});
  storage.setItem('arcana-birthday-profile-v1', 'server-copy-signed-in');
  assert.equal(store.has('arcana-birthday-profile-v1'), false, 'before allow-click: nothing persisted yet');

  fireDomReady();
  assert.equal(allowButton._clickHandlers.length, 1, 'allow button click handler was actually registered by the DOMContentLoaded callback');
  allowButton.click();

  assert.equal(store.has('arcana-birthday-profile-v1'), false, 'after allow-click: a remote-backed key must still not be persisted to localStorage');
});

test('consent allow-click still flushes non-remote keys into localStorage (purpose preserved)', () => {
  const {storage, store, fireDomReady, allowButton} = boot(null);
  storage.setItem('arcana-reading-deck-v1', 'ishtar');
  assert.equal(store.has('arcana-reading-deck-v1'), false, 'before allow-click: memory-only, consent not yet granted');

  fireDomReady();
  assert.equal(allowButton._clickHandlers.length, 1, 'allow button click handler was actually registered by the DOMContentLoaded callback');
  allowButton.click();

  assert.equal(store.get('arcana-reading-deck-v1'), 'ishtar', 'after allow-click: a key with no remote is still flushed to localStorage, same as before this fix');
});

// Finding 3: setItem's failure contract must be the same on both paths - a throwing
// remote.set() must not propagate, matching the try/catch already around the local write.
test('a throwing remote.set() does not propagate out of setItem', () => {
  const {storage} = boot('allow');
  const throwingRemote = {get: () => 'unused', set: () => { throw new Error('network down'); }};
  storage.setRemote('arcana-birthday-profile-v1', throwingRemote);
  assert.doesNotThrow(() => storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1999-09-09"}'), 'setItem must not propagate a remote write failure');
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), 'unused', 'storage keeps working normally after swallowing the remote failure');
});

// A visitor who was never signed in never has setRemote called for their keys at all, so
// none of the three fixes above should change anything they see - this is the live,
// currently-shipping path and must not regress.
test('a visitor who was never signed in is unaffected by all three fixes', () => {
  const {storage, store, fireDomReady, allowButton} = boot(null);
  storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1975-07-07"}');
  storage.setItem('arcana-reading-deck-v1', 'ishtar');

  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1975-07-07"}');
  assert.equal(storage.getItem('arcana-reading-deck-v1'), 'ishtar');
  assert.equal(store.has('arcana-birthday-profile-v1'), false, 'no consent decision yet, nothing persisted');

  // Finding 1's guard: clearing a remote that was never attached (e.g. a defensive
  // sign-out call for someone who was never signed in) must not wipe memory.
  storage.setRemote('arcana-birthday-profile-v1', null);
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1975-07-07"}', 'clearing a remote that was never attached must not clear memory for a visitor who was never signed in');

  // Finding 2: with no remote-backed keys at all, the allow-click flush behaves exactly
  // as it did before this fix.
  fireDomReady();
  assert.equal(allowButton._clickHandlers.length, 1, 'allow button click handler was actually registered by the DOMContentLoaded callback');
  allowButton.click();
  assert.equal(store.get('arcana-birthday-profile-v1'), '{"birthday":"1975-07-07"}', 'never-signed-in visitor: allow-click still flushes memory to localStorage as before');
  assert.equal(store.get('arcana-reading-deck-v1'), 'ishtar');

  // Finding 3: with no remote attached, setItem never enters the try/catch-wrapped
  // remote branch; behaviour is identical to before this fix.
  assert.doesNotThrow(() => storage.setItem('arcana-birthday-profile-v1', '{"birthday":"1980-08-08"}'));
  assert.equal(storage.getItem('arcana-birthday-profile-v1'), '{"birthday":"1980-08-08"}');
});

test('declining clears every optional entry, the remembered Sun sign included, and keeps the choice', () => {
  const {store, declineButton, fireDomReady} = boot('allow');
  store.set('arcana-reading-deck-v1', 'ishtar');
  store.set('arcana-daily-v2-2026-09-19', '{"card":17}');
  store.set('ishtar-sun-sign-v1', '4');
  store.set('someone-elses-key', 'untouched');
  fireDomReady();
  declineButton.click();
  assert.equal(store.get('ishtar-storage-choice-v1'), 'decline');
  for (const key of ['arcana-reading-deck-v1', 'arcana-daily-v2-2026-09-19', 'ishtar-sun-sign-v1']) {
    assert.ok(!store.has(key), `${key} survived declining`);
  }
  assert.equal(store.get('someone-elses-key'), 'untouched');
});
