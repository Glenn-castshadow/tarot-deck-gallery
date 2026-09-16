/* Shared page chrome: masthead, nav, footer and storage notice. Renders HTML strings (pure,
   testable in Node) and mounts them into the four [data-shell] targets. Owns no account state,
   storage state or section content -- those belong to their own modules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiteShell = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NAV = [
    {key: 'hub', href: '/', hash: '#', label: 'Hub', blurb: 'Your daily card, today’s sky, and every reading path'},
    {key: 'tarot', href: '/tarot/', hash: '#tarot-readings', label: 'Tarot', blurb: 'Daily card, full readings, deck chooser, and the archive'},
    {key: 'sky', href: '/sky/', hash: '#daily-horoscope', label: 'Sky', blurb: 'Your daily horoscope'},
    {key: 'charts', href: '/charts/', hash: '#birthday-room', label: 'Charts', blurb: 'Birth form, natal chart, transits, astrocartography, Four Pillars, and horary'},
    {key: 'eastern', href: '/eastern/', hash: '#jyotish', label: 'Eastern', blurb: 'Jyotish and your Chinese zodiac portrait'},
    {key: 'numerology', href: '/numerology/', hash: '#birthday-numbers', label: 'Numerology', blurb: 'The six-view numerology studio'},
    {key: 'divination', href: '/divination/', hash: '#divination-room', label: 'Divination', blurb: 'Lenormand, oracle, runes, geomancy, and I Ching'},
    {key: 'account', href: '/account/', hash: '#account-room', label: 'Account', blurb: 'Sign-in, your journal, and saving preferences'}
  ];

  function renderHeroHeader() {
    return `<header class="masthead masthead--hero">
        <div class="account-bar"><button type="button" id="account-button" class="account-button" aria-haspopup="dialog">Sign in</button></div>
        <div class="brand-lockup"><img src="/assets/ishtar-insights-logo-hero.webp" alt="Ishtar Insights lotus logo" width="1233" height="895"></div>
        <h1>A little clarity. A deeper connection.</h1>
        <p class="lede">Explore tarot, astrology, and the patterns that guide you.</p>
        <div class="hero-actions"><a class="hero-cta" href="/tarot/">Begin a reading <span aria-hidden="true">→</span></a><a class="hero-cta hero-cta--ghost" href="/charts/">Explore your birth sky</a></div>
        <ul class="hero-strip">
          <li><i aria-hidden="true">✹</i><span><b>Timeless tools</b><small>For a more inspired life</small></span></li>
          <li><i aria-hidden="true">☾</i><span><b>Cosmic perspective</b><small>Patterns in your story</small></span></li>
          <li><i aria-hidden="true">✦</i><span><b>A wider world</b><small>From here, to what’s next</small></span></li>
        </ul>
      </header>`;
  }

  function renderCompactHeader(page) {
    const entry = NAV.find(item => item.key === page);
    const title = entry ? entry.label : '';
    return `<header class="masthead masthead--compact">
        <div class="account-bar"><button type="button" id="account-button" class="account-button" aria-haspopup="dialog">Sign in</button></div>
        <div class="brand-lockup"><img src="/assets/ishtar-insights-logo-hero.webp" alt="Ishtar Insights lotus logo" width="1233" height="895"></div>
        <h1>${title}</h1>
      </header>`;
  }

  function renderNav(page, links) {
    const items = NAV.map(entry => {
      const href = links === 'hash' ? entry.hash : entry.href;
      const current = entry.key === page ? ' aria-current="page"' : '';
      return `<a href="${href}"${current}>${entry.label}</a>`;
    }).join('\n        ');
    return `<nav class="section-nav" aria-label="Page sections">
        ${items}
      </nav>`;
  }

  function renderFooter() {
    return `<footer class="footer">
        <p><span class="footer-star">✦</span> Built for looking closely. Read the <a href="/tarot-decks/README.md">catalog notes and sources</a> before reusing an image.</p>
        <p><a href="/cookie-policy.html">Cookies &amp; browser storage</a> · <button type="button" class="text-button" data-storage-settings>Cookie settings</button></p>
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

  function render({page, variant, links = 'page'}) {
    return {
      header: variant === 'hero' ? renderHeroHeader() : renderCompactHeader(page),
      nav: renderNav(page, links),
      footer: renderFooter(),
      notice: renderNotice()
    };
  }

  function mount(page, {links} = {}) {
    const variant = page === 'hub' ? 'hero' : 'compact';
    const {header, nav, footer, notice} = render({page, variant, links});
    const parts = {header, nav, footer, notice};
    Object.keys(parts).forEach(name => {
      const target = document.querySelector(`[data-shell="${name}"]`);
      if (target) target.innerHTML = parts[name];
    });
  }

  return {NAV, render, mount};
});
