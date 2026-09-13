const test = require('node:test');
const assert = require('node:assert/strict');
const {createAccount} = require('../account-core.js');

test('birth saving can be disabled, survives refresh, and blocks profile writes until enabled', async () => {
  let enabled=true, profile={birthday:'1990-05-04'}, writes=0;
  const {fetch}=fakeFetch({
    'GET /api/account/':()=>[200,{email:'reader@example.com',profile,saveBirthDetails:enabled}],
    'POST /api/account/birth-storage/':({body})=>{enabled=body.enabled;if(!enabled)profile=null;return [200,{saveBirthDetails:enabled}];},
    'PUT /api/account/profile/':()=>{writes++;return [200,{ok:true}];}
  });
  const account=createAccount({fetch,getCookie:()=>''});await account.refresh();
  assert.equal((await account.setBirthSaving(false)).ok,true);
  assert.equal(account.state().profile,null);
  assert.equal((await account.saveProfile({birthday:'1990-05-04'})).ok,false);
  assert.equal(writes,0);
  await account.refresh();assert.equal(account.state().saveBirthDetails,false);
  await account.setBirthSaving(true);await account.saveProfile({birthday:'1990-05-04',returnLocation:null});
  assert.equal(writes,1);
});

test('failed birth-saving preference update leaves the current choice and profile intact', async () => {
  const {fetch}=fakeFetch({'GET /api/account/':[200,{email:'reader@example.com',profile:{birthday:'1990-05-04'},saveBirthDetails:true}],'POST /api/account/birth-storage/':[503,{error:'Try again.'}]});
  const account=createAccount({fetch,getCookie:()=>''});await account.refresh();
  assert.equal((await account.setBirthSaving(false)).ok,false);
  assert.equal(account.state().saveBirthDetails,true);
  assert.equal(account.state().profile.birthday,'1990-05-04');
});

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
  const fetched = await account.getReading(7);
  assert.equal(fetched.ok, true);
  assert.equal(fetched.reading.payload.ids[0], 1);
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

// Fix round 1 additions below. The eight brief/gap tests above are unchanged except for the
// getReading call at line ~104, which now reads the {ok, reading} wrapper instead of the bare
// object, because Finding 2 changed getReading's return shape (see below).

// Finding 1: listReadings() hardcoded page: 1, pages: 1 in its failure shape regardless of which
// page was requested, so a failed fetch of page 3 would render as "page 1 of 1" -- silently wrong
// rather than visibly broken. This pins the fix: the requested page must survive into the failure
// object.
test('listReadings preserves the requested page in the failure shape', async () => {
  const {fetch} = fakeFetch({
    'GET /api/account/': [200, summary],
    'GET /api/readings/?page=3': [500, {error: 'Server error.'}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  const result = await account.listReadings(3);
  assert.equal(result.page, 3);
  assert.equal(result.pages, 1);
  assert.equal(result.count, 0);
  assert.deepEqual(result.readings, []);
  assert.equal(result.error, 'Server error.');
});

// Finding 2: getReading(id) used to collapse every failure (404, 500, network outage) into a bare
// null, indistinguishable from each other and with no message to show. It now matches its siblings'
// {ok, reading|message} shape, documented in the brief's Interfaces section though not its code block.
test('getReading returns an ok/message failure shape instead of null', async () => {
  const {fetch} = fakeFetch({
    'GET /api/account/': [200, summary],
    'GET /api/readings/9/': [404, {error: 'Not found.'}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  const result = await account.getReading(9);
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Not found.');
  assert.equal(result.reading, undefined);
});

// Finding 3: onChange's unsubscribe function was correct but untested. Task 11 will wire it to
// component mount/unmount, where a leaked listener is silent and cumulative.
test('onChange unsubscribe stops that listener without affecting others', async () => {
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary]});
  const account = createAccount({fetch, getCookie: () => 'c'});
  const a = [];
  const b = [];
  const unsubscribeA = account.onChange(s => a.push(s.signedIn));
  account.onChange(s => b.push(s.signedIn));
  unsubscribeA();
  await account.refresh();
  assert.deepEqual(a, [], 'unsubscribed listener must not be notified');
  assert.deepEqual(b, [true], 'remaining listener must still be notified');
});

// Finding 4, path 1: a successful saveProfile after a failed one must clear syncError.
test('syncError clears after a successful saveProfile following a failed one', async () => {
  let fail = true;
  const {fetch} = fakeFetch({
    'GET /api/account/': [200, summary],
    'PUT /api/account/profile/': () => fail ? [503, {error: 'down'}] : [200, {ok: true}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  await account.saveProfile({birthday: '1992-02-02'});
  assert.equal(account.state().syncError, true);
  fail = false;
  const result = await account.saveProfile({birthday: '1993-03-03'});
  assert.equal(result.ok, true);
  assert.equal(account.state().syncError, false);
  assert.equal(account.state().profile.birthday, '1993-03-03');
});

// Finding 4, path 2: a successful refresh() after a failed write must clear syncError and replace
// the unsynced local profile with the server's copy.
test('syncError clears and the local profile is replaced by the server copy after a successful refresh following a failed write', async () => {
  const {fetch} = fakeFetch({
    'GET /api/account/': [200, summary],
    'PUT /api/account/profile/': [503, {error: 'down'}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  await account.saveProfile({birthday: '1999-09-09'});
  assert.equal(account.state().syncError, true);
  assert.equal(account.state().profile.birthday, '1999-09-09');
  await account.refresh();
  assert.equal(account.state().syncError, false);
  assert.equal(account.state().profile.birthday, summary.profile.birthday);
});

// Added assertion: state() must return a defensive copy. Mutating the returned object, its
// features array, or its profile must never reach internal state.
test('state() returns a defensive copy that cannot reach internal state', async () => {
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary]});
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  const snap = account.state();
  snap.email = 'tampered@example.com';
  snap.features.push('hacked');
  snap.profile.birthday = 'tampered';
  const fresh = account.state();
  assert.equal(fresh.email, 'reader@example.com');
  assert.deepEqual(fresh.features, ['member']);
  assert.equal(fresh.profile.birthday, '1990-05-04');
});

// Added assertion: clearProfile() is exercised by the CSRF test above but neither its return value
// nor its effect on state() is asserted anywhere.
test('clearProfile clears the profile and reports ok', async () => {
  const {fetch} = fakeFetch({'GET /api/account/': [200, summary], 'DELETE /api/account/profile/': [200, {ok: true}]});
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  assert.equal(account.state().profile.birthday, '1990-05-04');
  const result = await account.clearProfile();
  assert.deepEqual(result, {ok: true});
  assert.equal(account.state().profile, null);
});

// Added assertion: listReadings(page) with a non-default page must forward the correct query string.
test('listReadings forwards the requested page in the query string', async () => {
  const {fetch, calls} = fakeFetch({
    'GET /api/account/': [200, summary],
    'GET /api/readings/?page=4': [200, {readings: [], page: 4, pages: 5, count: 40}]
  });
  const account = createAccount({fetch, getCookie: () => 'c'});
  await account.refresh();
  await account.listReadings(4);
  const readingsCall = calls.find(c => c.method === 'GET' && c.url.startsWith('/api/readings/'));
  assert.equal(readingsCall.url, '/api/readings/?page=4');
});

// Task 3: the journal gains category/kind filter chips, which listReadings must forward as query
// params -- and omit entirely when not given, so an unfiltered "All" view keeps the plain URL above.
test('listReadings passes category and kind filters', async () => {
  const {fetch, calls} = fakeFetch({
    'GET /api/readings/?page=2&category=tarot&kind=tarot-daily': [200, {readings: [], page: 2, pages: 1, count: 0}],
    'GET /api/readings/?page=1': [200, {readings: [], page: 1, pages: 1, count: 0}]
  });
  const account = createAccount({fetch, getCookie: () => ''});
  await account.listReadings(2, {category: 'tarot', kind: 'tarot-daily'});
  await account.listReadings(1, {});
  assert.equal(calls[0].url, '/api/readings/?page=2&category=tarot&kind=tarot-daily');
  assert.equal(calls[1].url, '/api/readings/?page=1');
});
