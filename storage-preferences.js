/* Optional persistence is disabled until the visitor chooses it. */
window.IshtarStorage = (() => {
  const choiceKey = 'ishtar-storage-choice-v1';
  const memory = new Map();
  let choice = null;
  try { choice = localStorage.getItem(choiceKey); } catch {}
  const allowed = () => choice === 'allow';
  function clearSaved() {
    try {
      Object.keys(localStorage).filter(key => /^(arcana-(birthday-profile-v1|reading-deck-v1|daily-v2-.*|newsletter-subscribed-v1)|ishtar-sun-sign-v1)$/.test(key))
        .forEach(key => localStorage.removeItem(key));
    } catch {}
  }
  const remotes = new Map();
  const localItem = key => { if (allowed()) { try { return localStorage.getItem(key); } catch {} } return null; };
  const api = {
    getItem(key) {
      const remote = remotes.get(key);
      if (remote) return remote.get();
      if (memory.has(key)) return memory.get(key);
      return localItem(key);
    },
    setItem(key, value) {
      memory.set(key, value);
      const remote = remotes.get(key);
      if (remote) { try { remote.set(value); } catch {} return; }
      if (allowed()) { try { localStorage.setItem(key, value); } catch {} }
    },
    localItem(key) { return localItem(key); },
    removeItem(key) {
      memory.delete(key);
      try { localStorage.removeItem(key); } catch {}
    },
    setRemote(key, remote) {
      if (remote) { remotes.set(key, remote); return; }
      if (remotes.delete(key)) memory.delete(key);
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.querySelector('#storage-notice');
    const status = document.querySelector('#storage-status');
    let settingsOpener = null;
    const update = () => { status.textContent = allowed() ? 'Optional saving is currently allowed.' : 'Optional saving is currently off.'; };
    notice.hidden = choice === 'allow' || choice === 'decline';
    update();
    document.querySelectorAll('[data-storage-settings]').forEach(button => button.addEventListener('click', () => {
      settingsOpener = button;
      notice.hidden = false; update(); notice.querySelector('button').focus();
    }));
    notice.querySelectorAll('[data-storage-choice]').forEach(button => button.addEventListener('click', () => {
      choice = button.dataset.storageChoice;
      if (!allowed()) clearSaved();
      try {
        localStorage.setItem(choiceKey, choice);
        if (allowed()) memory.forEach((value, key) => { if (!remotes.has(key)) localStorage.setItem(key, value); });
      } catch {}
      notice.hidden = true;
      const fallback = Array.from(document.querySelectorAll('[data-storage-settings]')).find(button => button.offsetParent != null);
      (settingsOpener || fallback || document.querySelector('[data-storage-settings]')).focus({preventScroll: true});
    }));
  });
  return api;
})();
