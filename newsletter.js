(() => {
  const email = document.querySelector('#newsletter-email');
  const consent = document.querySelector('#newsletter-consent');
  const button = document.querySelector('#newsletter-join');
  const status = document.querySelector('#newsletter-status');
  const signup = document.querySelector('.newsletter-signup');
  const account = window.IshtarAccount;
  const storageKey = 'arcana-newsletter-subscribed-v1';
  let guestSubscribed = window.IshtarStorage?.getItem(storageKey) === '1';
  let completedFor = null;
  const identity = state => state?.signedIn ? state.email : null;
  function update(state = account?.state()) {
    const hidden = state?.signedIn ? Boolean(state.newsletter || completedFor === state.email) : guestSubscribed;
    const moveFocus = hidden && signup.contains(document.activeElement);
    signup.hidden = hidden;
    signup.disabled = hidden;
    if (moveFocus) document.querySelector('.birthday-button').focus({preventScroll: true});
  }
  account?.onChange(state => {
    completedFor = null;
    if (state.signedIn && !state.newsletter && guestSubscribed) {
      guestSubscribed = false;
      window.IshtarStorage?.setItem(storageKey, '0');
    }
    status.textContent = '';
    status.hidden = true;
    update(state);
  });
  function message(text) { status.hidden = false; status.textContent = text; }
  update();
  // Newsletter validation must never block a visitor's birth chart submission.
  email.addEventListener('input', () => email.setCustomValidity(''));
  document.querySelector('#birthday-form').addEventListener('click', event => {
    if (event.target.closest('.birthday-button')) email.setCustomValidity('');
  });
  document.querySelector('#newsletter-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || signup.hidden) return;
    if (!email.value.trim() || !email.checkValidity()) {
      message('Enter a valid email address to join.');
      email.focus(); return;
    }
    if (!consent.checked) {
      message('Please check the box if you would like newsletter emails.');
      consent.focus(); return;
    }
    button.disabled = true;
    message('Saving your signup…');
    const submittedFor = identity(account?.state());
    const submittedEmail = email.value.trim();
    try {
      if (submittedFor && submittedFor.toLowerCase() === submittedEmail.toLowerCase()) {
        const result = await account.setNewsletter(true);
        if (!result.ok) throw new Error(result.message);
      } else {
        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: submittedEmail, consent: true, consentVersion: '2026-09-09-v1'}),
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a minute before trying again.' : 'We could not save your signup. Please try again.');
      }
      if (submittedFor === null) {
        guestSubscribed = true;
        window.IshtarStorage?.setItem(storageKey, '1');
      } else if (identity(account?.state()) === submittedFor) completedFor = submittedFor;
      message('Thank you! Your newsletter signup is recorded.');
      email.value = ''; consent.checked = false;
      update();
    } catch (error) {
      message(error.name === 'TimeoutError' ? 'Signup timed out. Please try again.' : (error.message === 'Failed to fetch' ? 'Could not connect. Please try again.' : error.message));
    } finally { button.disabled = false; }
  });
})();
