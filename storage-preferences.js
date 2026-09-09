/* Optional persistence is disabled until the visitor chooses it. */
window.IshtarStorage = (() => {
  const choiceKey = 'ishtar-storage-choice-v1';
  const memory = new Map();
  let choice = null;
  try { choice = localStorage.getItem(choiceKey); } catch {}
  const allowed = () => choice === 'allow';
  function clearSaved() {
    try {
      Object.keys(localStorage).filter(key => /^arcana-(birthday-profile-v1|reading-deck-v1|daily-v2-.*)$/.test(key))
        .forEach(key => localStorage.removeItem(key));
    } catch {}
  }
  const api = {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      if (allowed()) { try { return localStorage.getItem(key); } catch {} }
      return null;
    },
    setItem(key, value) {
      memory.set(key, value);
      if (allowed()) { try { localStorage.setItem(key, value); } catch {} }
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.querySelector('#storage-notice');
    const status = document.querySelector('#storage-status');
    const update = () => { status.textContent = allowed() ? 'Optional saving is currently allowed.' : 'Optional saving is currently off.'; };
    notice.hidden = choice === 'allow' || choice === 'decline';
    update();
    document.querySelectorAll('[data-storage-settings]').forEach(button => button.addEventListener('click', () => {
      notice.hidden = false; update(); notice.querySelector('button').focus();
    }));
    notice.querySelectorAll('[data-storage-choice]').forEach(button => button.addEventListener('click', () => {
      choice = button.dataset.storageChoice;
      if (!allowed()) clearSaved();
      try {
        localStorage.setItem(choiceKey, choice);
        if (allowed()) memory.forEach((value, key) => localStorage.setItem(key, value));
      } catch {}
      notice.hidden = true;
      document.querySelector('[data-storage-settings]').focus({preventScroll: true});
    }));
  });
  return api;
})();
