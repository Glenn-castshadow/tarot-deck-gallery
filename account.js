/* Account UI: header control, sign-in dialog, account panel. Logic lives in account-core.js.

   Every page carries the header button and the sign-in dialog; only /account/ carries the
   panel and the journal, so every panel element is reached behind `panel`. */
(() => {
  const getCookie = name => document.cookie.split('; ').find(row => row.startsWith(name + '='))?.slice(name.length + 1) || '';
  const account = IshtarAccountCore.createAccount({fetch: (url, init) => window.fetch(url, init), getCookie});
  window.IshtarAccount = account;
  const PROFILE_KEY = 'arcana-birthday-profile-v1';
  const $ = selector => document.querySelector(selector);
  const button = $('#account-button'), panel = $('#account-room'), dialog = $('#account-dialog');
  // /account/ is the only page that would otherwise be empty for a signed-out reader.
  const signedOut = $('#account-signed-out');
  const emailForm = $('#account-email-form'), codeForm = $('#account-code-form'), dialogStatus = $('#account-dialog-status');
  // A detached stand-in keeps the shared status writes harmless on a page with no panel.
  const status = $('#account-status') || document.createElement('p');
  const list = $('#journal-list');
  let opener = null, journalPage = 1, journalPages = 1, journalCategory = '', journalReadings = [];
  let sessionEmail = null, sessionProfile = null;
  const kindLabel = kind => Rooms.labelFor(kind) || kind;
  // /account/ carries no birth form, so window.BirthRoom is undefined there; the stored
  // profile is the same one the form would hand back. Read it the way wireRemoteProfile does.
  // A stored value with no birthday is no profile, matching BirthRoom.currentProfile().
  const storedProfile = () => { try { const p = JSON.parse(IshtarStorage.getItem(PROFILE_KEY) || 'null'); return p?.birthday ? p : null; } catch { return null; } };
  const currentProfile = () => window.BirthRoom?.currentProfile() || storedProfile();
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

  function wireRemoteProfile(state) {
    if (!state.signedIn) { sessionEmail = null; sessionProfile = null; IshtarStorage.setRemote(PROFILE_KEY, null); return; }
    if (sessionEmail !== state.email) {
      // Capture a guest reading before installing the account-backed storage adapter.
      const guest = sessionEmail === null ? IshtarStorage.getItem(PROFILE_KEY) : null;
      sessionEmail = state.email;
      try { sessionProfile = guest ? JSON.parse(guest) : null; } catch { sessionProfile = null; }
    }
    if (!state.saveBirthDetails) IshtarStorage.removeItem(PROFILE_KEY);
    IshtarStorage.setRemote(PROFILE_KEY, {
      get: () => { const profile = account.state().profile || sessionProfile; return profile ? JSON.stringify(profile) : null; },
      set: value => {
        try {
          sessionProfile = JSON.parse(value);
          if (account.state().saveBirthDetails) account.saveProfile(sessionProfile);
        } catch {}
      }
    });
  }

  async function reconcileProfile() {
    const state = account.state();
    if (state.profile || !state.saveBirthDetails || !sessionProfile?.birthday) return;
    await account.saveProfile(sessionProfile);
  }

  function renderHeader(state) {
    button.textContent = state.signedIn ? state.email : 'Sign in';
    button.classList.toggle('is-signed-in', state.signedIn);
    button.setAttribute('aria-haspopup', state.signedIn ? 'false' : 'dialog');
    const saveStatus = $('#birth-save-status');
    if (panel) panel.hidden = !state.signedIn;
    if (signedOut) signedOut.hidden = state.signedIn;
    if (saveStatus) saveStatus.hidden = !state.signedIn;
    if (!state.signedIn) return;
    const syncMessage = !state.saveBirthDetails ? 'Saving is off. Birth details you enter stay on this page only.'
      : state.syncError ? 'Your birth details have not been saved. Choose “Save birth details now” to retry.'
      : state.profile ? 'Your birth details are saved to your account for your next visit.' : 'Saving is on. Enter your birth details, then choose “Read my sky” or “Save birth details now”.';
    if (saveStatus) saveStatus.textContent = syncMessage;
    if (!panel) return;
    $('#account-email').textContent = state.email;
    $('#account-newsletter').checked = state.newsletter;
    $('#account-save-birth').checked = state.saveBirthDetails;
    $('#account-save-profile').hidden = !state.saveBirthDetails;
    $('#account-sync').textContent = syncMessage;
    $('#account-clear-profile').hidden = !state.profile;
  }

  async function renderJournal(page = journalPage) {
    if (!list) return;
    const data = await account.listReadings(page, {category: journalCategory});
    journalPage = data.page; journalPages = data.pages; journalReadings = data.readings;
    // A category filter can be empty even though the reader has readings in other categories;
    // it must not read as an empty journal.
    const empty = $('#journal-empty');
    empty.hidden = data.count > 0;
    if (!data.count && journalCategory && !data.error) {
      const total = (await account.listReadings(1, {})).count;
      empty.textContent = total > 0 ? 'Nothing saved in this category yet. Your other saved readings are under “All”.'
        : 'No saved readings yet. After a reading, choose “Save this reading”.';
    } else if (!data.count) {
      empty.textContent = 'No saved readings yet. After a reading, choose “Save this reading”.';
    }
    $('#journal-page').textContent = data.count ? `Page ${data.page} of ${data.pages} · ${data.count} saved` : '';
    $('#journal-prev').disabled = data.page <= 1; $('#journal-next').disabled = data.page >= data.pages;
    renderJournalList();
    if (data.error) status.textContent = data.error;
  }

  function renderJournalList() {
    if (!list) return;
    const query = $('#journal-search').value.trim().toLowerCase();
    const rows = query ? journalReadings.filter(r => (r.question || '').toLowerCase().includes(query) || (r.summary || '').toLowerCase().includes(query)) : journalReadings;
    list.innerHTML = rows.map(r => `<li data-reading-id="${esc(r.id)}"><div><strong>${esc(kindLabel(r.kind))}${r.layout ? ' · ' + esc(r.layout) : ''}</strong>${r.summary ? `<div class="journal-summary">${esc(r.summary)}</div>` : ''}<div class="journal-meta">${new Date(r.created_at).toLocaleString()}${r.deck ? ' · ' + esc(r.deck) : ''}</div>${r.question ? `<div class="journal-question">“${esc(r.question)}”</div>` : ''}</div><div class="journal-actions"><button type="button" data-journal-open>Open</button><button type="button" data-journal-note aria-expanded="false">Note</button><button type="button" data-journal-delete>Delete</button></div><div class="journal-note" hidden><textarea maxlength="4000" aria-label="Journal note">${esc(r.note || '')}</textarea><button type="button" data-journal-save-note>Save note</button></div></li>`).join('');
  }

  function showStep(step) {
    emailForm.hidden = step !== 'email'; codeForm.hidden = step !== 'code'; dialogStatus.textContent = '';
    (step === 'email' ? $('#account-email-input') : $('#account-code-input')).focus();
  }
  function openSignIn(el) { opener = el || document.activeElement; showStep('email'); if (!dialog.open) dialog.showModal(); }
  const MESSAGE_KEY = 'ishtar-account-message';
  function openPanel(message) {
    if (!panel) {
      // Only a message travels to /account/ (Ruling F7): it means the reader followed a
      // journal entry to a page that cannot replay it. A plain post-sign-in open must stay
      // put -- navigating would discard the in-page reading they signed in to save.
      if (!message) { button.focus({preventScroll: true}); return; }
      try { sessionStorage.setItem(MESSAGE_KEY, message); } catch { /* no-op */ }
      location.assign('/account/');
      return;
    }
    panel.hidden = false;
    if (message) status.textContent = message;
    panel.scrollIntoView({behavior: 'smooth', block: 'start'});
    $('#account-signout').focus({preventScroll: true});
  }
  if (panel) try {
    const carried = sessionStorage.getItem(MESSAGE_KEY);
    if (carried) { sessionStorage.removeItem(MESSAGE_KEY); status.textContent = carried; }
  } catch { /* no-op */ }

  // The badge is the reader's own request for their account, so on a page with no panel it
  // navigates. openPanel() must not -- see the comment there.
  button.addEventListener('click', () => {
    if (!account.state().signedIn) return openSignIn();
    if (!panel) return location.assign('/account/');
    openPanel();
  });
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
    if (dialog.open) { dialog.addEventListener('close', () => openPanel(), {once: true}); dialog.close(); }
    else openPanel();
  });
  signedOut?.querySelector('button').addEventListener('click', event => openSignIn(event.currentTarget));
  $('#account-resend').addEventListener('click', () => emailForm.requestSubmit());
  $('#account-restart').addEventListener('click', () => showStep('email'));

  if (panel) {
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
    async function saveCurrentBirthDetails() {
      const profile = currentProfile();
      if (!profile) { status.textContent = 'Enter a valid birthday and birth details in Birth sky first.'; return; }
      sessionProfile = profile;
      const result = await account.saveProfile(profile);
      status.textContent = result.ok ? 'Your birth details are saved for your next visit.' : result.message;
    }
    $('#account-save-profile').addEventListener('click', async event => {
      event.target.disabled = true;
      try { await saveCurrentBirthDetails(); } finally { event.target.disabled = false; }
    });
    $('#account-save-birth').addEventListener('change', async event => {
      const toggle = event.target, enabled = toggle.checked;
      toggle.disabled = true;
      const result = await account.setBirthSaving(enabled);
      toggle.disabled = false;
      toggle.checked = account.state().saveBirthDetails;
      if (!result.ok) { status.textContent = result.message; return; }
      if (!enabled) {
        IshtarStorage.removeItem(PROFILE_KEY);
        status.textContent = 'Birth-detail saving is off and the saved copy has been removed.';
      } else if (currentProfile()) await saveCurrentBirthDetails();
      else status.textContent = 'Birth-detail saving is on. Add your details in Birth sky to save them.';
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
        const room = Rooms.get(reading.kind);
        if (room) { status.textContent = room.load(reading) ? '' : 'This reading cannot be replayed in the current page version.'; return; }
        const page = Rooms.pageFor(reading.kind);
        if (page) { location.href = `${page}?reading=${id}`; return; }
        status.textContent = 'This reading cannot be replayed in the current page version.';
      }
    });

    $('.journal-filters').addEventListener('click', event => {
      const chip = event.target.closest('[data-journal-category]'); if (!chip) return;
      journalCategory = chip.dataset.journalCategory;
      $('.journal-filters').querySelectorAll('[data-journal-category]').forEach(b => b.setAttribute('aria-pressed', String(b === chip)));
      renderJournal(1);
    });
    $('#journal-search').addEventListener('input', renderJournalList);
  }

  document.addEventListener('click', async event => {
    const trigger = event.target.closest('[data-save-reading]'); if (!trigger) return;
    if (!account.state().signedIn) { openSignIn(trigger); return; }
    const kind = trigger.dataset.saveReading;
    const room = Rooms.get(kind);
    const draw = room?.current();
    const note = trigger.nextElementSibling;
    if (!draw) { note.textContent = 'Nothing to save yet.'; return; }
    trigger.disabled = true; note.textContent = 'Saving…';
    const result = await account.saveReading(draw);
    trigger.disabled = false;
    note.textContent = result.ok ? 'Saved to your journal.' : result.message;
    if (result.ok) renderJournal(1);
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
  let lastAccountEmail = null;
  account.onChange(async state => {
    const nextEmail = state.signedIn ? state.email : null;
    const changed = nextEmail !== lastAccountEmail;
    lastAccountEmail = nextEmail;
    if (changed && nextEmail) {
      await reconcileProfile();
      // A page without the birth form still needs the shared profile refreshed after a sync.
      // BirthRoom.restore() calls BirthProfile.restore() itself, so the branches do not double up.
      if (account.state().email === nextEmail) {
        if (window.BirthRoom) window.BirthRoom.restore(); else window.BirthProfile?.restore();
        renderJournal(1);
      }
    }
    if (!nextEmail) { if (panel) panel.hidden = true; if (signedOut) signedOut.hidden = false; }
  });
})();
