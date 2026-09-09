(() => {
  const email = document.querySelector('#newsletter-email');
  const consent = document.querySelector('#newsletter-consent');
  const button = document.querySelector('#newsletter-join');
  const status = document.querySelector('#newsletter-status');
  // Newsletter validation must never block a visitor's birth chart submission.
  email.addEventListener('input', () => email.setCustomValidity(''));
  document.querySelector('#birthday-form').addEventListener('click', event => {
    if (event.target.closest('.birthday-button')) email.setCustomValidity('');
  });
  document.querySelector('#newsletter-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!email.value.trim() || !email.checkValidity()) {
      status.textContent = 'Enter a valid email address to join.';
      email.focus(); return;
    }
    if (!consent.checked) {
      status.textContent = 'Please check the box if you would like newsletter emails.';
      consent.focus(); return;
    }
    button.disabled = true;
    status.textContent = 'Saving your signup…';
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.value.trim(), consent: true, consentVersion: '2026-09-09-v1'}),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a minute before trying again.' : 'We could not save your signup. Please try again.');
      status.textContent = 'Thank you! Your signup is recorded. If you already joined, you are all set. Watch for future Ishtar Insights updates.';
      email.value = ''; consent.checked = false;
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' ? 'Signup timed out. Please try again.' : (error.message === 'Failed to fetch' ? 'Could not connect. Please try again.' : error.message);
    } finally { button.disabled = false; }
  });
})();
