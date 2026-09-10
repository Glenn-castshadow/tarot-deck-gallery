/* Account state and API client. DOM-free so it runs under node tests. */
(function(root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.IshtarAccountCore = api; })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const API = '/api', AUTH = '/_allauth/browser/v1';
  const WAIT = 'Please wait a minute before requesting another code.';
  const RESTART = 'That code is no longer valid. Enter your email again.';
  const OFFLINE = 'Could not connect. Please try again.';
  function createAccount({fetch, getCookie}) {
    const blank = () => ({signedIn: false, email: null, features: [], profile: null, newsletter: false, syncError: false});
    let state = blank();
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => { try { fn(snapshot()); } catch {} });
    const snapshot = () => ({...state, features: [...state.features], profile: state.profile ? JSON.parse(JSON.stringify(state.profile)) : null});
    const signedOut = () => { if (state.signedIn) { state = blank(); emit(); } else state = blank(); };
    const firstError = (data, fallback) => data?.errors?.[0]?.message || data?.error || fallback;
    async function call(method, path, body) {
      const headers = {'Accept': 'application/json'};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (method !== 'GET') headers['X-CSRFToken'] = getCookie('csrftoken') || '';
      let response;
      try {
        response = await fetch(path, {method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body)});
      } catch { return {status: 0, data: null}; }
      let data = null;
      try { data = await response.json(); } catch {}
      if (response.status === 401 && path.startsWith(API + '/')) signedOut();
      return {status: response.status, data};
    }
    async function refresh() {
      const {status, data} = await call('GET', `${API}/account/`);
      if (status === 200 && data) {
        state = {signedIn: true, email: data.email, features: data.features || [], profile: data.profile ?? null, newsletter: Boolean(data.newsletter), syncError: false};
        emit();
      } else if (status !== 0) signedOut();
      return snapshot();
    }
    async function requestCode(email) {
      const {status, data} = await call('POST', `${AUTH}/auth/code/request`, {email: String(email).trim()});
      if (status === 401 && data?.data?.flows?.some(f => f.id === 'login_by_code' && f.is_pending)) return {ok: true, message: ''};
      if (status === 429) return {ok: false, message: WAIT};
      if (status === 0) return {ok: false, message: OFFLINE};
      return {ok: false, message: firstError(data, 'We could not send a code. Check the address and try again.')};
    }
    async function confirmCode(code) {
      const {status, data} = await call('POST', `${AUTH}/auth/code/confirm`, {code: String(code).trim()});
      if (status === 200) { await refresh(); return {ok: state.signedIn, message: state.signedIn ? '' : 'Signed in, but the account could not be loaded. Reload the page.'}; }
      if (status === 409) return {ok: false, message: RESTART};
      if (status === 429) return {ok: false, message: WAIT};
      if (status === 0) return {ok: false, message: OFFLINE};
      return {ok: false, message: firstError(data, 'That code did not match. Check the email and try again.')};
    }
    async function signOut() { await call('DELETE', `${AUTH}/auth/session`); signedOut(); }
    async function saveProfile(profile) {
      state.profile = profile; state.syncError = false;
      const {status, data} = await call('PUT', `${API}/account/profile/`, profile);
      if (status === 200) { emit(); return {ok: true, message: ''}; }
      state.syncError = true; emit();
      return {ok: false, message: firstError(data, 'Your birth details were not synced. They stay on this page.')};
    }
    async function clearProfile() {
      const {status} = await call('DELETE', `${API}/account/profile/`);
      if (status === 200) { state.profile = null; emit(); }
      return {ok: status === 200};
    }
    async function listReadings(page = 1) {
      const {status, data} = await call('GET', `${API}/readings/?page=${page}`);
      return status === 200 ? data : {readings: [], page: 1, pages: 1, count: 0, error: firstError(data, 'Could not load your journal.')};
    }
    async function getReading(id) { const {status, data} = await call('GET', `${API}/readings/${id}/`); return status === 200 ? data : null; }
    async function saveReading(reading) {
      const {status, data} = await call('POST', `${API}/readings/`, reading);
      return status === 201 ? {ok: true, reading: data} : {ok: false, message: firstError(data, 'The reading could not be saved.')};
    }
    async function updateNote(id, note) {
      const {status, data} = await call('PATCH', `${API}/readings/${id}/`, {note});
      return status === 200 ? {ok: true, reading: data} : {ok: false, message: firstError(data, 'The note could not be saved.')};
    }
    async function deleteReading(id) { const {status, data} = await call('DELETE', `${API}/readings/${id}/`); return {ok: status === 200, message: status === 200 ? '' : firstError(data, 'Could not delete that reading.')}; }
    async function setNewsletter(subscribed) {
      const {status, data} = await call('POST', `${API}/account/newsletter/`, {subscribed: Boolean(subscribed)});
      if (status === 200) { state.newsletter = data.newsletter; emit(); return {ok: true, message: ''}; }
      return {ok: false, message: firstError(data, 'Your newsletter preference was not saved.')};
    }
    async function deleteAccount() {
      const {status, data} = await call('POST', `${API}/account/delete/`, {confirm: true});
      if (status === 200) { signedOut(); return {ok: true, message: ''}; }
      return {ok: false, message: firstError(data, 'The account could not be deleted.')};
    }
    return {
      state: snapshot, has: feature => state.signedIn && state.features.includes(feature), refresh, requestCode, confirmCode, signOut,
      saveProfile, clearProfile, listReadings, getReading, saveReading, updateNote, deleteReading, setNewsletter, deleteAccount,
      onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
  }
  return {createAccount};
});
