/* Shared page chrome: masthead, nav, footer and storage notice. Renders HTML strings (pure,
   testable in Node) and mounts them into the four [data-shell] targets. Owns no account state,
   storage state or section content -- those belong to their own modules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiteShell = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NAV = [
    {key: 'hub', href: '/', hash: '#', label: 'Home', blurb: 'Your daily card, today’s sky, and every reading path'},
    {key: 'tarot', href: '/tarot/', hash: '#tarot-readings', label: 'Tarot', blurb: 'Daily card, full readings, deck chooser, and the archive'},
    {key: 'sky', href: '/sky/', hash: '#daily-horoscope', label: 'Sky', blurb: 'Your daily horoscope'},
    {key: 'charts', href: '/charts/', hash: '#birthday-room', label: 'Charts', blurb: 'Birth form, natal chart, transits, astrocartography, Four Pillars, and horary'},
    {key: 'eastern', href: '/eastern/', hash: '#jyotish', label: 'Eastern', blurb: 'Jyotish and your Chinese zodiac portrait'},
    {key: 'numerology', href: '/numerology/', hash: '#birthday-numbers', label: 'Numerology', blurb: 'The six-view numerology studio'},
    {key: 'divination', href: '/divination/', hash: '#divination-room', label: 'Divination', blurb: 'Lenormand, oracle, runes, geomancy, and I Ching'},
    {key: 'crystals', href: '/crystals/', hash: '#crystal-room', label: 'Crystals', blurb: 'Crystal of the day, your birthstones, and 100 stones by chakra and sign'},
    {key: 'account', href: '/account/', hash: '#account-room', label: 'Account', blurb: 'Sign-in, your journal, and saving preferences'}
  ];

  function renderHeroHeader() {
    return `<header class="masthead masthead--hero">
        <div class="account-bar"><button type="button" id="account-button" class="account-button" aria-haspopup="dialog">Sign in</button></div>
        <div class="brand-lockup"><img src="/assets/ishtar-insights-logo-hero.webp" alt="Ishtar Insights lotus logo" width="1233" height="895"></div>
        <h1>A little clarity. A deeper connection.</h1>
        <p class="lede">Free tarot readings, a real birth chart and a daily horoscope. No ads, nothing to install.</p>
        <div class="hero-actions"><a class="hero-cta" href="/tarot/#tarot-readings">Begin a reading <span aria-hidden="true">→</span></a><a class="hero-cta hero-cta--ghost" href="/charts/#birthday-room">Explore your birth sky</a></div>
        <ul class="hero-strip">
          <li><i aria-hidden="true">✹</i><span><b>Tarot</b><small>A daily card, full spreads, every card explained</small></span></li>
          <li><i aria-hidden="true">☾</i><span><b>Astrology</b><small>Charts calculated in your browser</small></span></li>
          <li><i aria-hidden="true">✦</i><span><b>Older traditions</b><small>I Ching, runes, numerology and more</small></span></li>
        </ul>
      </header>`;
  }

  function renderCompactHeader(page, heading = 'h1') {
    const entry = NAV.find(item => item.key === page);
    const title = entry ? entry.label : '';
    const titleHTML = heading === 'p' ? `<p class="masthead-title">${title}</p>` : `<h1>${title}</h1>`;
    return `<header class="masthead masthead--compact">
        <div class="account-bar"><button type="button" id="account-button" class="account-button" aria-haspopup="dialog">Sign in</button></div>
        <div class="brand-lockup"><img src="/assets/ishtar-insights-logo-hero.webp" alt="Ishtar Insights lotus logo" width="1233" height="895"></div>
        ${titleHTML}
      </header>`;
  }

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  // The page links and, on a page with two or more top-level sections, a row of in-page
  // links, together in one sticky bar. The [data-shell="nav"] mount point is display: contents
  // so the bar sticks within the page rather than within its own wrapper.
  function renderNav(page, links, sections = []) {
    const items = NAV.map(entry => {
      const href = links === 'hash' ? entry.hash : entry.href;
      const current = entry.key === page ? ' aria-current="page"' : '';
      return `<a href="${href}"${current}>${entry.label}</a>`;
    }).join('\n        ');
    const row = sections.length > 1
      ? `<nav class="page-sections" aria-label="On this page"><span>On this page</span>${sections.map(s => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`).join('')}</nav>`
      : '';
    return `<div class="page-nav"><nav class="section-nav" aria-label="Site pages">
        ${items}
      </nav>${row}</div>`;
  }

  // Top-level [data-fold] sections with an id, in document order: the ones the section row links to.
  function collectSections(doc) {
    return Array.from(doc.querySelectorAll('[data-fold]'))
      .filter(el => el.id && !(el.parentElement && el.parentElement.closest('[data-fold]')))
      .map(el => ({id: el.id, label: el.dataset.fold}));
  }

  function renderFooter() {
    return `<footer class="footer">
        <p><span class="footer-star">✦</span> Built for looking closely. Read the <a href="/tarot-decks/README.md">catalog notes and sources</a> before reusing an image.</p>
        <p><a href="/about.html">About</a> · <a href="/about.html#contact">Contact</a> · <a href="/privacy.html">Privacy</a> · <a href="/cookie-policy.html">Cookies &amp; browser storage</a> · <button type="button" class="text-button" data-storage-settings>Cookie settings</button></p>
        <p>Look something up: <a href="/tarot/cards/">Tarot card meanings</a> · <a href="/sky/signs/">Zodiac signs</a> · <a href="/divination/i-ching/">I Ching hexagrams</a></p>
        <p>Created by <a href="https://castshadow.com">Cast Shadow Design</a>.</p>
      </footer>`;
  }

  function renderNotice() {
    return `<section id="storage-notice" class="storage-notice" aria-labelledby="storage-title" hidden>
      <h2 id="storage-title">A little space for your next visit</h2>
      <p>May we save your birth details, deck choice and daily card in this browser? This is optional. You can use every reading without saving. We do not use advertising or analytics cookies.</p>
      <p><a href="/cookie-policy.html">Cookies &amp; browser storage policy</a></p>
      <p id="storage-status"></p>
      <div class="storage-actions"><button type="button" data-storage-choice="decline">No optional saving</button><button type="button" data-storage-choice="allow">Allow saving</button></div>
    </section>`;
  }

  function render({page, variant, links = 'page', sections = [], heading = 'h1'}) {
    return {
      header: variant === 'hero' ? renderHeroHeader() : renderCompactHeader(page, heading),
      nav: renderNav(page, links, sections),
      footer: renderFooter(),
      notice: renderNotice()
    };
  }

  // The hub's lotus opens once on arrival. Safari plays the HEVC file, which keeps its alpha
  // channel; other browsers play the VP9 WebM. The static logo stays when the visitor prefers
  // reduced motion, and comes back if autoplay is refused (iOS Low Power Mode), neither file
  // plays, or nothing has started within four seconds. The last frame is the static logo, so
  // the sharper image takes over again when the video ends.
  const HERO_VIDEO = [
    ['/assets/ishtar-logo-animated-hevc.mp4', 'video/mp4; codecs="hvc1"'],
    ['/assets/ishtar-logo-animated.webm', 'video/webm; codecs="vp9"']
  ];

  function animateHeroLogo(img, win) {
    if (!img || !win.matchMedia || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const doc = img.ownerDocument;
    const video = doc.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    for (const [name, value] of [['muted', ''], ['playsinline', ''], ['width', '1233'], ['height', '895'], ['role', 'img'], ['aria-label', img.alt]]) video.setAttribute(name, value);
    for (const [src, type] of HERO_VIDEO) {
      const source = doc.createElement('source');
      source.setAttribute('src', src);
      source.setAttribute('type', type);
      video.appendChild(source);
    }
    let started = false, done = false;
    const restore = () => {
      if (done) return;
      done = true;
      video.pause();
      if (video.parentNode) video.replaceWith(img);
    };
    video.addEventListener('playing', () => { started = true; });
    video.addEventListener('ended', restore);
    video.addEventListener('error', restore);
    video.lastChild.addEventListener('error', restore);   // no source could be played
    win.setTimeout(() => { if (!started) restore(); }, 4000);
    img.replaceWith(video);
    const playing = video.play();
    if (playing && playing.catch) playing.catch(restore);
    return video;
  }

  function mount(page, {links} = {}) {
    const variant = page === 'hub' ? 'hero' : 'compact';
    const {header, nav, footer, notice} = render({page, variant, links, sections: collectSections(document)});
    const parts = {header, nav, footer, notice};
    Object.keys(parts).forEach(name => {
      const target = document.querySelector(`[data-shell="${name}"]`);
      if (target) target.innerHTML = parts[name];
    });
    if (variant === 'hero') animateHeroLogo(document.querySelector('.brand-lockup img'), window);
  }

  return {NAV, render, mount, collectSections, animateHeroLogo};
});
