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
        <div class="footer-sign">
          <img src="/assets/ishtar-insights-logo-hero.webp" alt="" width="1233" height="895" loading="lazy" decoding="async">
          <p><strong>Look closer.</strong></p>
        </div>
        <nav class="footer-lookup" aria-labelledby="footer-lookup-title">
          <p id="footer-lookup-title">Look something up</p>
          <a href="/tarot/cards/">Tarot card meanings</a><a href="/sky/signs/">Zodiac signs</a><a href="/divination/i-ching/">I Ching hexagrams</a>
        </nav>
        <nav class="footer-links" aria-label="About this site">
          <a href="/about.html">About</a><a href="/about.html#contact">Contact</a><a href="/privacy.html">Privacy</a><a href="/cookie-policy.html">Cookies &amp; browser storage</a><button type="button" class="text-button" data-storage-settings>Cookie settings</button>
        </nav>
        <p class="footer-credit">Created by <a href="https://castshadow.com">Cast Shadow Design</a>.</p>
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

  // Line marks for the hub's paths and the phones' section folds: Phosphor Icons 2.1.1, Light
  // weight (MIT License, Copyright (c) 2023 Phosphor Icons). Keyed by Phosphor's own names.
  const ICONS = {
    'arrow-right': 'M220.24,132.24l-72,72a6,6,0,0,1-8.48-8.48L201.51,134H40a6,6,0,0,1,0-12H201.51L139.76,60.24a6,6,0,0,1,8.48-8.48l72,72A6,6,0,0,1,220.24,132.24Z',
    'calendar-star': 'M208,34H182V24a6,6,0,0,0-12,0V34H86V24a6,6,0,0,0-12,0V34H48A14,14,0,0,0,34,48V208a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V48A14,14,0,0,0,208,34Zm2,174a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2H74V56a6,6,0,0,0,12,0V46h84V56a6,6,0,0,0,12,0V46h26a2,2,0,0,1,2,2Zm-33.54-92.37-31-2.4L133.51,85.62a6,6,0,0,0-11,0l-11.91,27.61-31,2.4a6,6,0,0,0-3.36,10.61l23.49,19.39-7.16,28.93a6,6,0,0,0,8.87,6.61L128,165.5l26.62,15.67a6,6,0,0,0,8.87-6.61l-7.16-28.93,23.49-19.39a6,6,0,0,0-3.36-10.61Zm-30.68,23.15a6,6,0,0,0-2,6.07l4.63,18.74L131,153.37a6,6,0,0,0-6.08,0l-17.37,10.22,4.63-18.74a6,6,0,0,0-2-6.07L95.28,126.45l19.83-1.53a6,6,0,0,0,5-3.61L128,103.14l7.84,18.17a6,6,0,0,0,5,3.61l19.83,1.53Z',
    'cards-three': 'M208,90H48a14,14,0,0,0-14,14v96a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V104A14,14,0,0,0,208,90Zm2,110a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V104a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM50,64a6,6,0,0,1,6-6H200a6,6,0,0,1,0,12H56A6,6,0,0,1,50,64ZM66,32a6,6,0,0,1,6-6H184a6,6,0,0,1,0,12H72A6,6,0,0,1,66,32Z',
    'caret-down': 'M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z',
    'chart-polar': 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm89.8,96H189.7A62.07,62.07,0,0,0,134,66.3V38.2A90.15,90.15,0,0,1,217.8,122ZM122,122H78.37A50.09,50.09,0,0,1,122,78.37Zm0,12v43.63A50.09,50.09,0,0,1,78.37,134Zm12,0h43.63A50.09,50.09,0,0,1,134,177.63Zm0-12V78.37A50.09,50.09,0,0,1,177.63,122ZM122,38.2V66.3A62.07,62.07,0,0,0,66.3,122H38.2A90.15,90.15,0,0,1,122,38.2ZM38.2,134H66.3A62.07,62.07,0,0,0,122,189.7v28.1A90.15,90.15,0,0,1,38.2,134ZM134,217.8V189.7A62.07,62.07,0,0,0,189.7,134h28.1A90.15,90.15,0,0,1,134,217.8Z',
    'compass': 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218ZM173.32,74.63l-64,32a6,6,0,0,0-2.69,2.69l-32,64A6,6,0,0,0,80,182a6.06,6.06,0,0,0,2.68-.63l64-32a6,6,0,0,0,2.69-2.69l32-64a6,6,0,0,0-8.05-8.05Zm-33.79,64.9L93.42,162.58l23-46.11,46.11-23Z',
    'diamond': 'M233.92,118.14,137.86,22.08a14,14,0,0,0-19.72,0L22.08,118.14a14,14,0,0,0,0,19.72l96.06,96.06h0a14,14,0,0,0,19.72,0l96-96.06a13.94,13.94,0,0,0,0-19.72Zm-8.49,11.24-96.05,96.06a2,2,0,0,1-2.76,0L30.57,129.38a2,2,0,0,1,0-2.76l96.05-96.06a2,2,0,0,1,2.76,0l96.05,96.06a2,2,0,0,1,0,2.76Z',
    'flower-lotus': 'M244.1,122.63a13.56,13.56,0,0,0-8.3-6.4,72.62,72.62,0,0,0-24.17-2c4.67-20.63,1.62-36.91-1.45-46.4A14.16,14.16,0,0,0,193.7,58.3a84.21,84.21,0,0,0-29.76,13.11,92.6,92.6,0,0,0-27.52-34.6,14,14,0,0,0-16.85,0,92.7,92.7,0,0,0-27.51,34.6A84.16,84.16,0,0,0,62.29,58.3a14.15,14.15,0,0,0-16.47,9.54c-3.07,9.49-6.12,25.77-1.45,46.4a72.62,72.62,0,0,0-24.17,2,13.56,13.56,0,0,0-8.3,6.4,14,14,0,0,0-1.4,10.74C13.81,145.66,24,169,54.92,187.51S113.29,206,128,206s42.12,0,73.06-18.49,41.11-41.85,44.42-54.14A14,14,0,0,0,244.1,122.63ZM168.48,82.9A73.1,73.1,0,0,1,196.22,70a2.2,2.2,0,0,1,2.54,1.5C202.7,83.72,206.57,109,188.17,141a129.75,129.75,0,0,1-28,33.37C167.85,161,174,142.93,174,119.17A116.13,116.13,0,0,0,168.48,82.9ZM57.24,71.53A2.2,2.2,0,0,1,59.78,70,73.1,73.1,0,0,1,87.52,82.9,116.13,116.13,0,0,0,82,119.17c0,23.76,6.15,41.85,13.81,55.17a129.58,129.58,0,0,1-28-33.37C49.43,109,53.3,83.72,57.24,71.53ZM61.08,177.2c-27.3-16.31-36.15-36.42-39-47a2.08,2.08,0,0,1,.21-1.61,1.71,1.71,0,0,1,1-.8A62.16,62.16,0,0,1,48,126.72,126.25,126.25,0,0,0,57.43,147a141,141,0,0,0,41,44.72A114.83,114.83,0,0,1,61.08,177.2ZM128,192.86c-8.68-6.2-34-28.2-34-73.69,0-43.36,22.94-65.34,32.8-72.78a2,2,0,0,1,2.4,0c9.86,7.44,32.8,29.42,32.8,72.78C162,164.94,136.81,186.67,128,192.86Zm105.9-62.62c-2.85,10.54-11.7,30.65-39,47a114.83,114.83,0,0,1-37.38,14.47,141,141,0,0,0,41-44.72A126.25,126.25,0,0,0,208,126.72a62.16,62.16,0,0,1,24.73,1.11,1.71,1.71,0,0,1,1,.8A2.08,2.08,0,0,1,233.92,130.24Z',
    'globe-hemisphere-west': 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm90,102a89.55,89.55,0,0,1-7.46,35.86l-46.69-28.71a13.94,13.94,0,0,0-5.46-2l-22.82-3.07A14.06,14.06,0,0,0,121.06,138h-9.92a2,2,0,0,1-1.8-1.13l-3.8-7.86a13.94,13.94,0,0,0-9.66-7.59l-10.71-2.3L94.4,103a2,2,0,0,1,1.74-1h16.71a13.9,13.9,0,0,0,6.76-1.75l12.25-6.75a14.73,14.73,0,0,0,2.62-1.88l26.91-24.33a13.93,13.93,0,0,0,2.83-17.21L161,44.25A90.16,90.16,0,0,1,218,128ZM144.6,39.54l9.15,16.39a2,2,0,0,1-.41,2.46L126.43,82.72a1.84,1.84,0,0,1-.37.27l-12.25,6.76a2,2,0,0,1-1,.25H96.14A14,14,0,0,0,84,97L73.18,115.91a2,2,0,0,1-.19-.35L61.5,84.89a2,2,0,0,1,0-1.48L72.68,57.06A89.9,89.9,0,0,1,144.6,39.54ZM38,128A89.52,89.52,0,0,1,49.38,84.23a13.85,13.85,0,0,0,.89,4.87l11.49,30.67a13.94,13.94,0,0,0,10.16,8.78l21.44,4.6a2,2,0,0,1,1.38,1.09l3.8,7.86a14.07,14.07,0,0,0,12.6,7.9h4.56l-8.49,19a14,14,0,0,0,2.51,15.2l.1.11,19.68,20.26a2,2,0,0,1,.46,1.7L127.7,218A90.1,90.1,0,0,1,38,128Zm102.08,89.19,1.67-8.6a14.07,14.07,0,0,0-3.47-12.16l-.1-.11L118.5,176.06a2,2,0,0,1-.33-2.14l13.7-30.73A2,2,0,0,1,134,142l22.82,3.08a2,2,0,0,1,.78.27L205,174.55A90.18,90.18,0,0,1,140.08,217.19Z',
    'hand-eye': 'M138,168a10,10,0,1,1-10-10A10,10,0,0,1,138,168Zm76-52v36a86,86,0,0,1-172,0V76A26,26,0,0,1,82,54.11V44a26,26,0,0,1,51.41-5.51A26,26,0,0,1,174,60V94.11A26,26,0,0,1,214,116Zm-12,0a14,14,0,0,0-28,0v4a6,6,0,0,1-12,0V60a14,14,0,0,0-28,0v44a6,6,0,0,1-12,0V44a14,14,0,0,0-28,0v68a6,6,0,0,1-12,0V76a14,14,0,0,0-28,0v76a74,74,0,0,0,148,0Zm-20.63,49.32a6,6,0,0,1,0,5.36C180.65,172.12,163.3,206,128,206s-52.65-33.88-53.37-35.32a6,6,0,0,1,0-5.36C75.35,163.88,92.7,130,128,130S180.65,163.88,181.37,165.32ZM169.08,168c-4.46-7.12-18.41-26-41.08-26s-36.65,18.85-41.08,26c4.46,7.13,18.41,26,41.08,26S164.65,175.15,169.08,168Z',
    'hourglass-medium': 'M198,75.64V40a14,14,0,0,0-14-14H72A14,14,0,0,0,58,40V76a14.06,14.06,0,0,0,5.6,11.2L118,128,63.6,168.8A14.06,14.06,0,0,0,58,180v36a14,14,0,0,0,14,14H184a14,14,0,0,0,14-14V180.36a14.08,14.08,0,0,0-5.56-11.17L138,128l54.49-41.19A14.08,14.08,0,0,0,198,75.64ZM70,40a2,2,0,0,1,2-2H184a2,2,0,0,1,2,2V75.64a2,2,0,0,1-.79,1.6L178.9,82H76.67L70.8,77.6A2,2,0,0,1,70,76Zm58,80.49L92.67,94H163Zm58,59.87V216a2,2,0,0,1-2,2H72a2,2,0,0,1-2-2V180a2,2,0,0,1,.8-1.6L122,140v28a6,6,0,0,0,12,0V140.06l51.21,38.7A2,2,0,0,1,186,180.36Z',
    'magnifying-glass': 'M228.24,219.76l-51.38-51.38a86.15,86.15,0,1,0-8.48,8.48l51.38,51.38a6,6,0,0,0,8.48-8.48ZM38,112a74,74,0,1,1,74,74A74.09,74.09,0,0,1,38,112Z',
    'moon-stars': 'M238,96a6,6,0,0,1-6,6H214v18a6,6,0,0,1-12,0V102H184a6,6,0,0,1,0-12h18V72a6,6,0,0,1,12,0V90h18A6,6,0,0,1,238,96ZM144,54h10V64a6,6,0,0,0,12,0V54h10a6,6,0,0,0,0-12H166V32a6,6,0,0,0-12,0V42H144a6,6,0,0,0,0,12Zm71.25,100.28a6,6,0,0,1,1.07,6A94,94,0,1,1,95.76,39.68a6,6,0,0,1,7.94,6.79A90.11,90.11,0,0,0,192,154a90.9,90.9,0,0,0,17.53-1.7A6,6,0,0,1,215.25,154.28Zm-14.37,11.34q-4.42.38-8.88.38A102.12,102.12,0,0,1,90,64q0-4.45.38-8.88a82,82,0,1,0,110.5,110.5Z',
    'number-nine': 'M128,42a54,54,0,1,0,19.94,104.17l-33.17,58.88a6,6,0,1,0,10.46,5.89l49.54-88A54,54,0,0,0,128,42Zm0,96a42,42,0,1,1,42-42A42,42,0,0,1,128,138Z',
    'planet': 'M243.39,61.68c-7.24-12.48-27-15-57.24-7.49A93.92,93.92,0,0,0,34.05,128a94.5,94.5,0,0,0,.9,13c-21.86,22.38-29.56,40.78-22.29,53.32,4.5,7.76,14,11.69,27.86,11.69a116.38,116.38,0,0,0,25-3.16c1.45-.32,2.92-.68,4.41-1a93.95,93.95,0,0,0,151.19-86.89c12.65-13,21.11-25.32,23.86-35.6C246.76,72.53,246.24,66.59,243.39,61.68ZM128,46a82.12,82.12,0,0,1,80.19,64.94c-16,15.3-38.14,31.67-63.3,46.12C117.49,172.82,92.79,183,72.85,188.6A82,82,0,0,1,128,46ZM23,188.3c-3.52-6.07,2.31-18.56,15-33a94,94,0,0,0,21.07,36.62C39.42,195.74,26.39,194.08,23,188.3ZM128,210a81.41,81.41,0,0,1-43.35-12.45c20.68-6.71,43.56-17.06,66.22-30.08,22.83-13.12,43.13-27.67,59.05-41.91,0,.81.06,1.62.06,2.44A82.08,82.08,0,0,1,128,210ZM233.35,76.21c-1.88,7-7.28,15.49-15.36,24.61a93.92,93.92,0,0,0-21.1-36.7c15.82-3.05,32-3.49,36.12,3.58C234.2,69.75,234.31,72.62,233.35,76.21Z',
    'question': 'M138,180a10,10,0,1,1-10-10A10,10,0,0,1,138,180ZM128,74c-21,0-38,15.25-38,34v4a6,6,0,0,0,12,0v-4c0-12.13,11.66-22,26-22s26,9.87,26,22-11.66,22-26,22a6,6,0,0,0-6,6v8a6,6,0,0,0,12,0v-2.42c18.11-2.58,32-16.66,32-33.58C166,89.25,149,74,128,74Zm102,54A102,102,0,1,1,128,26,102.12,102.12,0,0,1,230,128Zm-12,0a90,90,0,1,0-90,90A90.1,90.1,0,0,0,218,128Z',
    'sparkle': 'M196.89,130.94,144.4,111.6,125.06,59.11a13.92,13.92,0,0,0-26.12,0L79.6,111.6,27.11,130.94a13.92,13.92,0,0,0,0,26.12L79.6,176.4l19.34,52.49a13.92,13.92,0,0,0,26.12,0L144.4,176.4l52.49-19.34a13.92,13.92,0,0,0,0-26.12Zm-4.15,14.86-55.08,20.3a6,6,0,0,0-3.56,3.56l-20.3,55.08a1.92,1.92,0,0,1-3.6,0L89.9,169.66a6,6,0,0,0-3.56-3.56L31.26,145.8a1.92,1.92,0,0,1,0-3.6l55.08-20.3a6,6,0,0,0,3.56-3.56l20.3-55.08a1.92,1.92,0,0,1,3.6,0l20.3,55.08a6,6,0,0,0,3.56,3.56l55.08,20.3a1.92,1.92,0,0,1,0,3.6ZM146,40a6,6,0,0,1,6-6h18V16a6,6,0,0,1,12,0V34h18a6,6,0,0,1,0,12H182V64a6,6,0,0,1-12,0V46H152A6,6,0,0,1,146,40ZM246,88a6,6,0,0,1-6,6H230v10a6,6,0,0,1-12,0V94H208a6,6,0,0,1,0-12h10V72a6,6,0,0,1,12,0V82h10A6,6,0,0,1,246,88Z',
    'stack': 'M229.18,173a6,6,0,0,1-2.16,8.2l-96,56a6,6,0,0,1-6,0l-96-56a6,6,0,0,1,6-10.36l93,54.23,93-54.23A6,6,0,0,1,229.18,173ZM221,122.82l-93,54.23L35,122.82a6,6,0,0,0-6,10.36l96,56a6,6,0,0,0,6,0l96-56a6,6,0,0,0-6-10.36ZM26,80a6,6,0,0,1,3-5.18l96-56a6,6,0,0,1,6,0l96,56a6,6,0,0,1,0,10.36l-96,56a6,6,0,0,1-6,0l-96-56A6,6,0,0,1,26,80Zm17.91,0L128,129.05,212.09,80,128,31Z',
    'star-four': 'M228.81,114.89,164.5,91.5,141.11,27.19a13.95,13.95,0,0,0-26.22,0L91.5,91.5,27.19,114.89a13.95,13.95,0,0,0,0,26.22L91.5,164.5l23.39,64.31a13.95,13.95,0,0,0,26.22,0L164.5,164.5l64.31-23.39a13.95,13.95,0,0,0,0-26.22Zm-4.1,15-66.94,24.34a6,6,0,0,0-3.59,3.59l-24.34,66.94a2,2,0,0,1-3.68,0l-24.34-66.94a6,6,0,0,0-3.59-3.59L31.29,129.84a2,2,0,0,1,0-3.68l66.94-24.34a6,6,0,0,0,3.59-3.59l24.34-66.94a2,2,0,0,1,3.68,0l24.34,66.94a6,6,0,0,0,3.59,3.59l66.94,24.34a2,2,0,0,1,0,3.68Z',
    'sun-horizon': 'M240,154H197.28a70.91,70.91,0,0,0,.72-10,70,70,0,0,0-140,0,70.91,70.91,0,0,0,.72,10H16a6,6,0,0,0,0,12H240a6,6,0,0,0,0-12ZM70,144a58,58,0,1,1,115.13,10H70.87A58.63,58.63,0,0,1,70,144Zm144,56a6,6,0,0,1-6,6H48a6,6,0,0,1,0-12H208A6,6,0,0,1,214,200ZM74.63,42.69a6,6,0,0,1,10.74-5.37l8,16a6,6,0,0,1-10.74,5.36Zm-56,50.63a6,6,0,0,1,8.05-2.69l16,8a6,6,0,0,1-5.36,10.74l-16-8A6,6,0,0,1,18.63,93.32Zm192,13.36a6,6,0,0,1,2.69-8.05l16-8a6,6,0,1,1,5.36,10.74l-16,8a6,6,0,0,1-8.05-2.69Zm-48-53.36,8-16a6,6,0,0,1,10.74,5.37l-8,16a6,6,0,1,1-10.74-5.36Z',
    'user-circle': 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26ZM71.44,198a66,66,0,0,1,113.12,0,89.8,89.8,0,0,1-113.12,0ZM94,120a34,34,0,1,1,34,34A34,34,0,0,1,94,120Zm99.51,69.64a77.53,77.53,0,0,0-40-31.38,46,46,0,1,0-51,0,77.53,77.53,0,0,0-40,31.38,90,90,0,1,1,131,0Z',
    'yin-yang': 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26ZM38,128a90.1,90.1,0,0,1,90-90,42,42,0,0,1,0,84,54,54,0,0,0-44.88,84A90.06,90.06,0,0,1,38,128Zm90,90a42,42,0,0,1,0-84,54,54,0,0,0,44.88-84A90,90,0,0,1,128,218Zm10-42a10,10,0,1,1-10-10A10,10,0,0,1,138,176ZM118,80a10,10,0,1,1,10,10A10,10,0,0,1,118,80Z'
  };
  const PATH_MARKS = {tarot: 'cards-three', sky: 'moon-stars', charts: 'compass', eastern: 'yin-yang', numerology: 'number-nine',
    divination: 'hand-eye', crystals: 'diamond', account: 'user-circle'};
  const FOLD_MARKS = {tarot: 'cards-three', archive: 'stack', 'daily-horoscope': 'sun-horizon', 'sky-calendar': 'calendar-star',
    birthday: 'planet', world: 'globe-hemisphere-west', charts: 'chart-polar', 'chart-in-time': 'hourglass-medium', horary: 'question',
    chinese: 'yin-yang', jyotish: 'flower-lotus', numerology: 'number-nine', divination: 'hand-eye',
    'crystal-day': 'sparkle', 'your-stones': 'diamond', crystals: 'magnifying-glass'};
  const mark = (name, cls) => `<svg class="${cls}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${ICONS[name] || ICONS['star-four']}"/></svg>`;

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

  return {NAV, render, mount, collectSections, animateHeroLogo, ICONS, PATH_MARKS, FOLD_MARKS, mark};
});
