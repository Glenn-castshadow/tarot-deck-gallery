/* Account UI: header control, sign-in dialog, account panel. Logic lives in account-core.js. */
(() => {
  const getCookie = name => document.cookie.split('; ').find(row => row.startsWith(name + '='))?.slice(name.length + 1) || '';
  const account = IshtarAccountCore.createAccount({fetch: (url, init) => window.fetch(url, init), getCookie});
  window.IshtarAccount = account;
  const PROFILE_KEY = 'arcana-birthday-profile-v1';
  const $ = selector => document.querySelector(selector);
  const button = $('#account-button'), panel = $('#account-room'), dialog = $('#account-dialog');
  const emailForm = $('#account-email-form'), codeForm = $('#account-code-form'), dialogStatus = $('#account-dialog-status');
  const status = $('#account-status'), list = $('#journal-list');
  let opener = null, journalPage = 1, journalPages = 1;
  const kindLabel = {'tarot-daily': 'Daily card', 'tarot-spread': 'Tarot spread', lenormand: 'Lenormand', oracle: 'Reflection oracle', runes: 'Runes', geomancy: 'Geomancy'};
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

  function wireRemoteProfile(state) {
    if (!state.signedIn) { IshtarStorage.setRemote(PROFILE_KEY, null); return; }
    IshtarStorage.setRemote(PROFILE_KEY, {
      get: () => account.state().profile ? JSON.stringify(account.state().profile) : null,
      set: value => { try { account.saveProfile(JSON.parse(value)); } catch {} }
    });
  }

  async function reconcileProfile() {
    const state = account.state();
    if (state.profile) return;
    const local = IshtarStorage.localItem(PROFILE_KEY);
    if (!local) return;
    try { await account.saveProfile(JSON.parse(local)); } catch {}
  }

  function renderHeader(state) {
    button.textContent = state.signedIn ? state.email : 'Sign in';
    button.classList.toggle('is-signed-in', state.signedIn);
    button.setAttribute('aria-haspopup', state.signedIn ? 'false' : 'dialog');
    panel.hidden = !state.signedIn;
    if (!state.signedIn) return;
    $('#account-email').textContent = state.email;
    $('#account-newsletter').checked = state.newsletter;
    $('#account-sync').textContent = state.syncError ? 'Your latest birth details are on this page but not synced. They will sync the next time you read your sky.'
      : state.profile ? 'Your birth details are synced to this account.' : 'Your birth details sync to this account when you read your sky.';
    $('#account-clear-profile').hidden = !state.profile;
  }

  async function renderJournal(page = journalPage) {
    const data = await account.listReadings(page);
    journalPage = data.page; journalPages = data.pages;
    $('#journal-empty').hidden = data.count > 0;
    $('#journal-page').textContent = data.count ? `Page ${data.page} of ${data.pages} · ${data.count} saved` : '';
    $('#journal-prev').disabled = data.page <= 1; $('#journal-next').disabled = data.page >= data.pages;
    list.innerHTML = data.readings.map(r => `<li data-reading-id="${esc(r.id)}"><div><strong>${esc(kindLabel[r.kind] || r.kind)}${r.layout ? ' · ' + esc(r.layout) : ''}</strong><div class="journal-meta">${new Date(r.created_at).toLocaleString()}${r.deck ? ' · ' + esc(r.deck) : ''}</div>${r.question ? `<div class="journal-question">“${esc(r.question)}”</div>` : ''}</div><div class="journal-actions"><button type="button" data-journal-open>Open</button><button type="button" data-journal-note aria-expanded="false">Note</button><button type="button" data-journal-delete>Delete</button></div><div class="journal-note" hidden><textarea maxlength="4000" aria-label="Journal note">${esc(r.note || '')}</textarea><button type="button" data-journal-save-note>Save note</button></div></li>`).join('');
    if (data.error) status.textContent = data.error;
  }

  function showStep(step) {
    emailForm.hidden = step !== 'email'; codeForm.hidden = step !== 'code'; dialogStatus.textContent = '';
    (step === 'email' ? $('#account-email-input') : $('#account-code-input')).focus();
  }
  function openSignIn() { opener = document.activeElement; showStep('email'); if (!dialog.open) dialog.showModal(); }
  function openPanel() { panel.hidden = false; panel.scrollIntoView({behavior: 'smooth', block: 'start'}); $('#account-signout').focus({preventScroll: true}); }

  button.addEventListener('click', () => account.state().signedIn ? openPanel() : openSignIn());
  dialog.querySelector('[data-close-account]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => opener?.focus?.({preventScroll: true}));

  emailForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = emailForm.querySelector('[type="submit"]'); submit.disabled = true; dialogStatus.textContent = 'Sending your code…';
    const result = await account.requestCode($('#account-email-input').value);
    submit.disabled = false;
    if (!result.ok) { dialogStatus.textContent = result.message; return; }
    $('#account-code-hint').textContent = `We sent a code to ${$('#account-email-input').value.trim()}. It expires in a few minutes. Check spam if it does not arrive.`;
    showStep('code');
  });
  codeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = codeForm.querySelector('[type="submit"]'); submit.disabled = true; dialogStatus.textContent = 'Checking your code…';
    const result = await account.confirmCode($('#account-code-input').value);
    submit.disabled = false;
    if (!result.ok) { dialogStatus.textContent = result.message; if (result.message.includes('Enter your email again')) showStep('email'); return; }
    $('#account-code-input').value = '';
    status.textContent = 'You are signed in.';
    if (dialog.open) { dialog.addEventListener('close', openPanel, {once: true}); dialog.close(); }
    else openPanel();
  });
  $('#account-resend').addEventListener('click', () => emailForm.requestSubmit());
  $('#account-restart').addEventListener('click', () => showStep('email'));

  $('#account-signout').addEventListener('click', async () => { await account.signOut(); status.textContent = ''; button.focus(); });
  $('#account-newsletter').addEventListener('change', async event => {
    const result = await account.setNewsletter(event.target.checked);
    status.textContent = result.ok ? (event.target.checked ? 'Newsletter signup recorded.' : 'You are unsubscribed.') : result.message;
    if (!result.ok) event.target.checked = account.state().newsletter;
  });
  $('#account-clear-profile').addEventListener('click', async () => {
    const result = await account.clearProfile();
    status.textContent = result.ok ? 'Synced birth details removed. The form on this page still shows them until you reload.' : 'Could not remove synced details.';
  });
  $('#account-delete').addEventListener('click', async () => {
    if (!window.confirm('Delete your account, synced birth details and saved readings? This cannot be undone.')) return;
    const result = await account.deleteAccount();
    status.textContent = result.ok ? '' : result.message;
    if (result.ok) { window.alert('Your account has been deleted.'); button.focus(); }
  });
  $('#journal-prev').addEventListener('click', () => renderJournal(journalPage - 1));
  $('#journal-next').addEventListener('click', () => renderJournal(journalPage + 1));
  list.addEventListener('click', async event => {
    const item = event.target.closest('[data-reading-id]'); if (!item) return;
    const id = Number(item.dataset.readingId);
    if (event.target.closest('[data-journal-note]')) { const note = item.querySelector('.journal-note'); note.hidden = !note.hidden; event.target.setAttribute('aria-expanded', String(!note.hidden)); if (!note.hidden) note.querySelector('textarea').focus(); return; }
    if (event.target.closest('[data-journal-save-note]')) { const result = await account.updateNote(id, item.querySelector('textarea').value); status.textContent = result.ok ? 'Note saved.' : result.message; return; }
    if (event.target.closest('[data-journal-delete]')) { if (!window.confirm('Delete this saved reading?')) return; const result = await account.deleteReading(id); status.textContent = result.ok ? 'Reading deleted.' : result.message; renderJournal(); return; }
    if (event.target.closest('[data-journal-open]')) {
      const result = await account.getReading(id);
      if (!result.ok) { status.textContent = result.message; return; }
      const reading = result.reading;
      const opened = reading.kind.startsWith('tarot') ? window.TarotRoom?.loadDraw(reading) : window.DivinationRoom?.loadDraw(reading);
      status.textContent = opened ? '' : 'This reading cannot be replayed in the current page version.';
    }
  });

  document.addEventListener('click', async event => {
    const trigger = event.target.closest('[data-save-reading]'); if (!trigger) return;
    const room = trigger.dataset.saveReading === 'tarot' ? window.TarotRoom : window.DivinationRoom;
    const draw = room?.currentDraw();
    const note = trigger.nextElementSibling;
    if (!draw) { note.textContent = 'Nothing to save yet.'; return; }
    trigger.disabled = true; note.textContent = 'Saving…';
    const result = await account.saveReading(draw);
    trigger.disabled = false;
    note.textContent = result.ok ? 'Saved to your journal.' : result.message;
    if (result.ok && !room.hidden) renderJournal(1);
  });

  account.onChange(async state => {
    wireRemoteProfile(state);
    renderHeader(state);
    document.dispatchEvent(new CustomEvent('ishtar-account-change', {detail: state}));
  });
  window.IshtarAccountUI = {openPanel, openSignIn, refreshJournal: renderJournal};

  (async () => {
    const state = await account.refresh();
    if (!state.signedIn) renderHeader(state);
  })();
  let lastSignedIn = false;
  account.onChange(async state => {
    if (state.signedIn && !lastSignedIn) { await reconcileProfile(); window.BirthRoom?.restore(); renderJournal(1); }
    if (!state.signedIn && lastSignedIn) { panel.hidden = true; }
    lastSignedIn = state.signedIn;
  });
})();
