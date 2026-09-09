(() => {
  const token = location.hash.slice(1);
  const form = document.querySelector('#unsubscribe-form');
  const email = document.querySelector('#unsubscribe-email');
  const status = document.querySelector('#unsubscribe-status');
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
    document.querySelector('#unsubscribe-email-row').hidden = true;
    email.required = false;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(email.required ? {email: email.value.trim()} : {token}),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw Error();
      status.textContent = 'Your request is complete. Any matching signup has been removed.';
      form.hidden = true;
    } catch { status.textContent = 'We could not complete your request. Please try again shortly.'; }
    finally { button.disabled = false; }
  });
})();
