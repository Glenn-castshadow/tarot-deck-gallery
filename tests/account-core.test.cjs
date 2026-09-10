const test = require('node:test');
const assert = require('node:assert/strict');
const {createAccount} = require('../account-core.js');

function fakeFetch(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push({url, method, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined});
    const handler = routes[`${method} ${url}`];
    if (!handler) return {status: 404, json: async () => ({error: 'Not found.'})};
    const [status, body] = typeof handler === 'function' ? handler(calls.at(-1)) : handler;
    return {status, json: async () => body};
  };
  return {fetch, calls};
}
const summary = {email: 'reader@example.com', features: ['member'], profile: {birthday: '1990-05-04'}, newsletter: true};

test('refresh maps 200 to signed in and 401 to signed out', async () => {
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary]});
  const account = createAccount({fetch, getCookie: () => 'tok'});
  const events = [];
  account.onChange(s => events.push(s.signedIn));
  await account.refresh();
  assert.equal(account.state().email, 'reader@example.com');
  assert.ok(account.has('member') && !account.has('archive'));
  const out = createAccount({fetch: fakeFetch({'GET /api/account/': [401, {error: 'Sign in to continue.'}]}).fetch, getCookie: () => ''});
  await out.refresh();
  assert.equal(out.state().signedIn, false);
  assert.deepEqual(events, [true]);
});

test('request and confirm code follow allauth response shapes and send CSRF header', async () => {
  const {fetch, calls} = fakeFetch({
    'POST /_allauth/browser/v1/auth/code/request': [401, {status: 401, data: {flows: [{id: 'login_by_code', is_pending: true}]}}],
    'POST /_allauth/browser/v1/auth/code/confirm': call => call.body.code === 'ABCDEF' ? [200, {data: {user: {email: 'reader@example.com'}}}] : [400, {errors: [{message: 'Incorrect code.', param: 'code'}]}],
    'GET /api/account/': [200, summary]
  });
  const account = createAccount({fetch, getCookie: () => 'csrf-1'});
  assert.deepEqual(await account.requestCode('Reader@Example.com'), {ok: true, message: ''});
  assert.equal(calls[0].headers['X-CSRFToken'], 'csrf-1');
  assert.equal(calls[0].body.email, 'Reader@Example.com');
  const wrong = await account.confirmCode('ZZZZZZ');
  assert.equal(wrong.ok, false);
  assert.equal(wrong.message, 'Incorrect code.');
  const right = await account.confirmCode('ABCDEF');
  assert.equal(right.ok, true);
  assert.equal(account.state().signedIn, true);
});

test('request code surfaces 400 and 429 messages, and 409 on confirm asks to restart', async () => {
  const {fetch} = fakeFetch({
    'POST /_allauth/browser/v1/auth/code/request': call => call.body.email === 'bad' ? [400, {errors: [{message: 'Enter a valid email address.', param: 'email'}]}] : [429, {}],
    'POST /_allauth/browser/v1/auth/code/confirm': [409, {}]
  });
  const account = createAccount({fetch, getCookie: () => ''});
  assert.equal((await account.requestCode('bad')).message, 'Enter a valid email address.');
  assert.equal((await account.requestCode('x@y.z')).message, 'Please wait a minute before requesting another code.');
  assert.equal((await account.confirmCode('ABCDEF')).message, 'That code is no longer valid. Enter your email again.');
});

test('profile save keeps local value and marks syncError on failure', async () => {
  let fail = false;
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary], 'PUT /api/account/profile/': () => fail ? [503, {error: 'down'}] : [200, {ok: true}]});
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  assert.equal((await account.saveProfile({birthday: '1991-01-01'})).ok, true);
  assert.equal(account.state().profile.birthday, '1991-01-01');
  fail = true;
  assert.equal((await account.saveProfile({birthday: '1992-02-02'})).ok, false);
  assert.equal(account.state().profile.birthday, '1992-02-02');
  assert.equal(account.state().syncError, true);
});

test('a 401 from the API signs the account out and notifies', async () => {
  let expired = false;
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary], 'GET /api/readings/?page=1': () => expired ? [401, {error: 'Sign in to continue.'}] : [200, {readings: [], page: 1, pages: 1, count: 0}]});
  const account = createAccount({fetch, getCookie: () => 'c'});
  const seen = [];
  account.onChange(s => seen.push(s.signedIn));
  await account.refresh();
  assert.equal((await account.listReadings()).count, 0);
  expired = true;
  await account.listReadings();
  assert.equal(account.state().signedIn, false);
  assert.deepEqual(seen, [true, false]);
});

test('readings, newsletter, sign out and delete account call the right endpoints', async () => {
  const {fetch, calls} = fakeFetch({
    'GET /api/account/': [200, summary],
    'POST /api/readings/': call => [201, {id: 7, ...call.body}],
    'GET /api/readings/7/': [200, {id: 7, kind: 'runes', payload: {ids: [1]}}],
    'PATCH /api/readings/7/': call => [200, {id: 7, note: call.body.note}],
    'DELETE /api/readings/7/': [200, {ok: true}],
    'POST /api/account/newsletter/': call => [200, {ok: true, newsletter: call.body.subscribed}],
    'DELETE /_allauth/browser/v1/auth/session': [401, {}],
    'POST /api/account/delete/': [200, {ok: true}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  const saved = await account.saveReading({kind: 'runes', payload: {ids: [1]}});
  assert.equal(saved.reading.id, 7);
  assert.equal((await account.getReading(7)).payload.ids[0], 1);
  assert.equal((await account.updateNote(7, 'ok')).reading.note, 'ok');
  assert.equal((await account.deleteReading(7)).ok, true);
  assert.equal((await account.setNewsletter(false)).ok, true);
  assert.equal(account.state().newsletter, false);
  await account.signOut();
  assert.equal(account.state().signedIn, false);
  await account.refresh();
  assert.equal((await account.deleteAccount()).ok, true);
  assert.equal(account.state().signedIn, false);
  assert.ok(calls.some(c => c.method === 'POST' && c.url === '/api/account/delete/' && c.body.confirm === true));
});

// The six tests above are the brief's, verbatim. The two below close a gap found while
// reviewing them against the task's "one behaviour that needs the most care": none of the
// brief's own tests exercises a 401 arriving from an AUTH endpoint while the account is
// signed in, so none of them would fail if the 401-to-signed-out rule were applied globally
// instead of scoped to /api/. Tracing it through: test 2's only auth-endpoint 401 happens
// before any sign-in, and the test's final assertion is taken after a later refresh() that
// unconditionally overwrites state on success -- so a wrongly-global rule would still leave
// that test green. This test signs in first, then drives a request-code call that returns a
// normal mid-login 401, and checks state and notifications are untouched by it.
test('a 401 from an auth endpoint does not sign the account out', async () => {
  const {fetch} = fakeFetch({
    'GET /api/account/': [200, summary],
    'POST /_allauth/browser/v1/auth/code/request': [401, {status: 401, data: {flows: [{id: 'login_by_code', is_pending: true}]}}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  const seen = [];
  account.onChange(s => seen.push(s.signedIn));
  await account.refresh();
  assert.equal(account.state().signedIn, true);
  const result = await account.requestCode('reader@example.com');
  assert.equal(result.ok, true);
  assert.equal(account.state().signedIn, true, 'a 401 from an auth endpoint must not sign the account out');
  assert.deepEqual(seen, [true], 'a 401 from an auth endpoint must not emit a signed-out notification');
});

// Covers the other half of the CSRF rule ("on unsafe methods") that the brief's tests only
// exercise incidentally: call 0 in test 2 happens to be a POST, so nothing pins that GET is
// excluded, and nothing exercises PUT/DELETE. This drives one of each and checks the header
// on all three.
test('CSRF header is attached on unsafe methods only', async () => {
  const {fetch, calls} = fakeFetch({
    'GET /api/account/': [200, summary],
    'PUT /api/account/profile/': [200, {ok: true}],
    'DELETE /api/account/profile/': [200, {ok: true}]
  });
  const account = createAccount({fetch, getCookie: () => 'csrf-9'});
  await account.refresh();
  await account.saveProfile({birthday: '1990-05-04'});
  await account.clearProfile();
  const [getCall, putCall, deleteCall] = calls;
  assert.equal(getCall.method, 'GET');
  assert.equal(getCall.headers['X-CSRFToken'], undefined, 'GET must not send a CSRF header');
  assert.equal(putCall.method, 'PUT');
  assert.equal(putCall.headers['X-CSRFToken'], 'csrf-9');
  assert.equal(deleteCall.method, 'DELETE');
  assert.equal(deleteCall.headers['X-CSRFToken'], 'csrf-9');
});
