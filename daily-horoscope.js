const DailyHoroscope = (() => {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function attach(root) {
    if (!root) return {setProfileSign(){}};
    let selected = 0, profileSign = null, manual = false, renderedDay = '', timer;
    // Today's model-written paragraphs (docs/DAILY-HOROSCOPE.md, "The prose layer"): fetched once
    // per calendar day. `signs` stays null on any failure and the template reading draws instead.
    let prose = {day: '', signs: null, settled: true};
    root.innerHTML = `<header class="dh-header"><div><p class="section-kicker">A daily moment under the sky</p><h3 id="daily-horoscope-title">Your daily horoscope</h3><p>A little perspective for the day ahead. Choose your Sun sign, or explore your rising sign as another lens.</p></div><span class="dh-emblem" aria-hidden="true">☾<span>✦</span></span></header>
      <div class="dh-controls"><label for="daily-horoscope-sign">Your zodiac sign<select id="daily-horoscope-sign">${DailyHoroscopeEngine.signNames.map((name,i)=>`<option value="${i}">${DailyHoroscopeEngine.signGlyphs[i]} ${name}</option>`).join('')}</select></label><button type="button" data-dh-profile hidden>Use my birth sign</button><p data-dh-source></p></div>
      <div data-dh-reading aria-live="polite" aria-atomic="true"></div>
      <details class="dh-method"><summary>How your daily reading is made</summary><p>These are original symbolic interpretations of the tropical Sun, Moon, Mercury, Venus and Mars. We count the selected sign as the first whole-sign solar house: the Moon sets the day’s theme, Venus informs relationships, Mercury work, the Sun growth, and Mars a small action. This is a general sign reading; it does not calculate transits to your personal birth chart.</p><p>The date follows your device’s local calendar. Each reading uses a shared sky snapshot at 12:00 UTC on that date, so it stays consistent throughout the day. Themes can carry over while planets remain in the same signs; the reflection question rotates daily. Everything is calculated in your browser.</p><p>On most days the reading is written by a language model running on our own hardware, from the positions and aspects computed for that day, and checked automatically before it is published. When none is available, the shorter template reading appears instead.</p></details>
      <p class="dh-note">For reflection and creative practice. Take what is useful, and leave room for your own choices.</p>`;
    const select = root.querySelector('select');
    const profileButton = root.querySelector('[data-dh-profile]');
    const output = root.querySelector('[data-dh-reading]');
    // True when a draw will follow once the fetch settles; false when draw() may run now.
    function loadProse(day) {
      if (prose.day === day) return !prose.settled;
      const mine = prose = {day, signs: null, settled: typeof fetch !== 'function'};
      if (mine.settled) return false;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const abort = setTimeout(() => controller && controller.abort(), 2000);
      Promise.resolve().then(() => fetch(`/sky/daily/${day}.json`, controller ? {signal: controller.signal} : undefined))
        .then(res => res.ok ? res.json() : null)
        .then(json => { if (json && json.day === day && json.signs && typeof json.signs === 'object') mine.signs = json.signs; })
        .catch(() => {})
        .then(() => { clearTimeout(abort); mine.settled = true; if (prose === mine) draw(); });
      return true;
    }
    function render() {
      select.value = String(selected);
      profileButton.hidden = profileSign === null || (!manual && selected === profileSign);
      root.querySelector('[data-dh-source]').textContent = !manual && profileSign !== null ? 'Using the Sun sign from your birth sky.' : 'Explore any sign. No birth details needed.';
      let day = '';
      try { day = DailyHoroscopeEngine.localDateKey(); } catch (error) { day = ''; }
      if (!day || !loadProse(day)) draw();
    }
    function draw() {
      try {
        const reading = DailyHoroscopeEngine.calculate(selected);
        renderedDay = reading.day;
        const dateLabel = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(reading.instant));
        const moon = reading.points.find(p=>p.name==='Moon');
        const key = reading.sign.toLowerCase();
        const paragraph = prose.signs && typeof prose.signs[key] === 'string' && prose.signs[key].trim() ? prose.signs[key].trim() : '';
        const main = paragraph
          ? `<div class="dh-main"><span class="dh-sign" aria-hidden="true">${reading.glyph}</span><div><p class="dh-label">${esc(reading.sign)} · Today</p><p class="dh-prose">${esc(paragraph)}</p></div></div>`
          : `<div class="dh-main"><span class="dh-sign" aria-hidden="true">${reading.glyph}</span><div><p class="dh-label">${esc(reading.sign)} · Today’s theme</p><h4>${esc(reading.title)}</h4><p>${esc(reading.overview)}</p></div></div>`;
        const tail = paragraph ? '' : `<div class="dh-lenses">${reading.lenses.map(lens=>`<section><h5>${lens.title}</h5><p>${esc(lens.text)}</p></section>`).join('')}</div><div class="dh-action"><p class="dh-label">One small action</p><p>${esc(reading.action)}</p></div>`;
        output.innerHTML = `<article class="dh-reading"><div class="dh-dateline"><time datetime="${reading.day}">${esc(dateLabel)}</time><span>Today · ${esc(reading.sign)}</span></div>${main}<div class="dh-moon"><span aria-hidden="true">☾</span><div><strong>Moon in ${moon.sign} · ${reading.phase}</strong><p>${reading.illumination}% illuminated at the daily snapshot. ${esc(reading.phasePrompt)}</p></div></div>${tail}<blockquote>${esc(reading.question)}</blockquote></article>`;
      } catch (error) {
        renderedDay = '';
        output.innerHTML = '<p class="dh-error" role="status">Today’s horoscope is unavailable. Check that your device date is between 1901 and 2100, then try again.</p><button type="button" data-dh-retry>Try again</button>';
      }
    }
    function schedule() {
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
      // Recheck at least once a minute to handle clock/time-zone changes as well as midnight.
      timer = setTimeout(refresh, Math.min(60000, Math.max(1000,+midnight-+now+100)));
    }
    function refresh() {
      if (!document.hidden && renderedDay !== DailyHoroscopeEngine.localDateKey()) render();
      schedule();
    }
    select.addEventListener('change',()=>{selected=Number(select.value);manual=true;render();});
    profileButton.addEventListener('click',()=>{if(profileSign !== null){selected=profileSign;manual=false;render();}});
    output.addEventListener('click',event=>{if(event.target.closest('[data-dh-retry]')) render();});
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('pageshow',refresh);
    render(); schedule();
    return {setProfileSign(index) {
      profileSign = Number.isInteger(index) && index >= 0 && index < 12 ? index : null;
      if (!manual) selected = profileSign ?? 0;
      render();
    }};
  }
  return {attach};
})();
