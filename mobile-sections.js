/* Mobile disclosures move existing elements without recreating readings or forms. */
window.MobileSections = (() => {
  'use strict';
  const phone = matchMedia('(max-width: 700px)');
  const states = new Map();
  const folds = new Set();
  let serial = 0, observer, returnButton, activeMain = '', enhancing = false;

  function apply(fold) {
    const open = !phone.matches || Boolean(states.get(fold.dataset.foldKey));
    fold.classList.toggle('is-open', open);
    fold.firstElementChild.firstElementChild.setAttribute('aria-expanded', String(open));
    fold.lastElementChild.hidden = !open;
  }
  function refreshReturn() {
    if (returnButton) returnButton.hidden = !phone.matches || !activeMain;
  }
  function setOpen(fold, open) {
    const group = fold.dataset.foldGroup;
    if (open && group) for (const other of folds) {
      if (other !== fold && other.dataset.foldGroup === group) {
        states.set(other.dataset.foldKey, false); apply(other);
      }
    }
    states.set(fold.dataset.foldKey, open); apply(fold);
    if (group === 'main') activeMain = open ? fold.dataset.foldKey : '';
    refreshReturn();
  }
  function wrap(elements, title, {key, subtitle = '', group = '', level = 5, open = false} = {}) {
    elements = elements.filter(Boolean);
    if (!elements.length || (elements[0].parentElement?.classList.contains('fold-body') &&
      elements[0].parentElement.parentElement.dataset.foldKey === key)) return;
    const fold = document.createElement('div');
    fold.className = `mobile-fold${group === 'main' ? ' main-fold' : ''}`;
    fold.dataset.foldKey = key;
    if (group) fold.dataset.foldGroup = group;
    const heading = document.createElement(`h${level}`);
    heading.className = 'fold-heading';
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `fold-control-${++serial}`;
    button.setAttribute('aria-controls', `fold-content-${serial}`);
    const label = document.createElement('span');
    label.className = 'fold-label'; label.textContent = title;
    if (subtitle) {
      const small = document.createElement('small'); small.textContent = subtitle;
      label.append(small);
    }
    const icon = document.createElement('span');
    icon.className = 'fold-chevron'; icon.setAttribute('aria-hidden', 'true');
    button.append(label, icon); heading.append(button);
    const body = document.createElement('div');
    body.className = 'fold-body'; body.id = `fold-content-${serial}`;
    elements[0].before(fold); fold.append(heading, body); body.append(...elements);
    if (!states.has(key)) states.set(key, open);
    folds.add(fold); apply(fold);
    button.addEventListener('click', () => {
      const opening = !states.get(key);
      setOpen(fold, opening);
      // Closing an earlier section can move this row far above the viewport.
      if (group === 'main' || group === 'card-chapters') button.scrollIntoView({block: 'start', behavior: 'instant'});
    });
    return fold;
  }
  function enhance() {
    if (enhancing) return;
    enhancing = true;
    const focused = document.activeElement;
    observer?.disconnect();
    for (const fold of folds) if (!fold.isConnected) folds.delete(fold);
    const deckPicker = document.querySelector('.reading-deck-picker');
    if (deckPicker) {
      const selectedDeck = deckPicker.querySelector('[aria-pressed="true"] strong').textContent;
      wrap([deckPicker], 'Your deck', {key: 'deck-choice', level: 3, subtitle: selectedDeck});
      deckPicker.closest('.mobile-fold').querySelector('.fold-label small').textContent = selectedDeck;
    }
    document.querySelectorAll('.num-reading-pair').forEach(pair => {
      const article = pair.parentElement;
      if (!article.classList.contains('num-reading')) return;
      const view = article.closest('.num-view').id;
      wrap([pair, article.querySelector('.num-life-lenses'), article.querySelector('blockquote')],
        'Explore this number', {key: `${view}-depth`, subtitle: 'Strengths, growth & everyday practice', level: 6});
    });
    document.querySelectorAll('.num-weave').forEach(el => wrap([el],
      el.closest('#num-name') ? 'Name & birth date together' : 'Read the numbers together',
      {key: `${el.closest('.num-view').id}-weave`}));
    document.querySelectorAll('.num-letter-study').forEach(el => wrap([el], 'Letter-by-letter calculation', {key: 'name-letters'}));
    document.querySelectorAll('.num-cycle-overview').forEach((el, i) => wrap([el],
      el.querySelector('h5').textContent, {key: `cycles-overview-${i}`}));
    document.querySelectorAll('.tarot-position-reading').forEach(el => wrap([el],
      el.querySelector('h4').textContent,
      {key: `${el.id}-${el.querySelector('h4').textContent}`, group: 'card-chapters', level: 4,
        subtitle: `${el.querySelector('.reading-label').textContent} · ${el.querySelector('.tarot-orientation').textContent}`}));
    document.querySelectorAll('.tarot-synthesis').forEach(el => wrap([el], 'Your reading, gathered', {key: 'tarot-synthesis', level: 3, subtitle: 'The overall story & your next steps'}));
    document.querySelectorAll('.tarot-connections').forEach(el => wrap([el], 'The cards in conversation', {key: 'tarot-connections', level: 3}));
    document.querySelectorAll('.sky-facts').forEach(el => wrap([el], 'Your sky at a glance', {key: 'sky-facts', level: 4}));
    document.querySelectorAll('.horoscope-lenses').forEach(el => wrap([el], 'Explore your sky reading', {key: 'sky-lenses', level: 4}));
    document.querySelectorAll('.natal-report').forEach(el => wrap([el], 'Your natal chart in detail', {key: 'natal-report', level: 4, subtitle: 'Placements, houses & aspects'}));
    document.querySelectorAll('.chart-depth').forEach(el => wrap([el], 'Traditional techniques', {key: 'chart-depth', level: 4, subtitle: 'Profection, the Lot & patterns'}));
    // Moving a focused control into its disclosure can otherwise drop keyboard focus.
    if (focused && focused !== document.body && focused.isConnected &&
      focused !== document.activeElement && !focused.closest('[hidden]')) focused.focus({preventScroll: true});
    enhancing = false;
    // Only the pages whose rooms re-render carry a .reading-room to watch.
    const room = document.querySelector('.reading-room');
    if (room) observer?.observe(room, {childList: true, subtree: true});
  }
  function reveal(target) {
    if (!target || !phone.matches) return target;
    enhance();
    const parents = [];
    for (let el = target; el; el = el.parentElement) if (el.classList.contains('mobile-fold')) parents.unshift(el);
    parents.forEach(fold => setOpen(fold, true));
    return target.closest('.mobile-fold')?.firstElementChild.firstElementChild || target;
  }
  function hashTarget(hash = location.hash) {
    if (!hash) return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))) ||
      (['#birthday-numbers', '#birthday-chinese'].includes(hash) ? document.querySelector('#birthday-room') : null); }
    catch { return null; }
  }
  function followHash() {
    const target = hashTarget();
    if (!target) return;
    const scrollTarget = reveal(target);
    if (phone.matches) requestAnimationFrame(() => {
      window.scrollTo({top: window.scrollY + scrollTarget.getBoundingClientRect().top - document.querySelector('.section-nav').offsetHeight - 20, behavior: 'instant'});
    });
  }
  function init() {
    // Sections declare their own fold config via [data-fold]; a plain data-fold-group="" (as
    // birth-form uses, being a nested disclosure rather than a top-level "main" section) opts
    // out of the 'main' default, which a falsy-value fallback (`|| 'main'`) could not express.
    for (const el of document.querySelectorAll('[data-fold]')) {
      const members = el.dataset.foldMembers ? Array.from(document.querySelectorAll(el.dataset.foldMembers)) : [el];
      wrap(members, el.dataset.fold, {key: el.dataset.foldKey, group: el.hasAttribute('data-fold-group') ? el.dataset.foldGroup : 'main', level: Number(el.dataset.foldLevel || 2), subtitle: el.dataset.foldSubtitle || '', open: el.hasAttribute('data-fold-open')});
    }
    const intro = document.createElement('p');
    intro.id = 'mobile-section-index'; intro.className = 'mobile-section-index';
    intro.textContent = 'Choose a section to begin. Open only what you want to explore.';
    // A page with no folds (the account page) needs no section index.
    const anchor = document.querySelector('.reading-room') || document.querySelector('.mobile-fold');
    anchor?.before(intro);
    returnButton = document.createElement('button');
    returnButton.type = 'button'; returnButton.className = 'mobile-section-return';
    returnButton.textContent = '↑ Sections'; returnButton.setAttribute('aria-label', 'Close this section and return to all sections');
    returnButton.hidden = true; document.body.append(returnButton);
    returnButton.addEventListener('click', () => {
      const current = Array.from(folds).find(f => f.dataset.foldKey === activeMain);
      for (const fold of folds) if (fold.dataset.foldGroup === 'main') setOpen(fold, false);
      const focus = current?.firstElementChild.firstElementChild;
      focus?.focus({preventScroll: true});
      if (intro.isConnected) intro.scrollIntoView({block: 'start', behavior: 'instant'});
    });
    observer = new MutationObserver(enhance);
    enhance();
    phone.addEventListener('change', () => {
      const focused = document.activeElement;
      for (const fold of folds) apply(fold);
      if (phone.matches && focused && focused !== document.body) reveal(focused);
      if (!phone.matches && focused?.closest('.fold-heading')) {
        const content = focused.closest('.mobile-fold').lastElementChild;
        const control = Array.from(content.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'))
          .find(el => !el.closest('[hidden]') && el.getClientRects().length);
        const next = control || content.firstElementChild;
        if (next) {
          if (!control) next.setAttribute('tabindex', '-1');
          next.focus({preventScroll: true});
        }
      }
      refreshReturn();
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-acg-birth],[data-cx-birth]')) reveal(document.querySelector('#birthday-input'));
      const link = event.target.closest('a[href^="#"]');
      if (link) {
        const target = hashTarget(link.hash);
        const scrollTarget = reveal(target);
        if (link.closest('.section-nav') && scrollTarget && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          if (location.hash !== link.hash) history.pushState(null, '', link.hash);
          requestAnimationFrame(() => window.scrollTo({top: window.scrollY + scrollTarget.getBoundingClientRect().top - document.querySelector('.section-nav').offsetHeight - 20, behavior: 'instant'}));
          return;
        }
        if (link.hash === location.hash && scrollTarget && phone.matches) requestAnimationFrame(() => window.scrollTo({top: window.scrollY + scrollTarget.getBoundingClientRect().top - document.querySelector('.section-nav').offsetHeight - 20, behavior: 'instant'}));
      }
    }, true);
    window.addEventListener('hashchange', followHash);
    window.addEventListener('beforeprint', () => {
      for (const fold of folds) fold.lastElementChild.hidden = false;
    });
    window.addEventListener('afterprint', () => {for (const fold of folds) apply(fold);});
    followHash();
    refreshReturn();
  }
  return {init, enhance, reveal};
})();
MobileSections.init();
