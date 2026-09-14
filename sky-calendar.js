/* The sky section on /sky/: the Moon now, this month's events, the retrograde tracker and
   the reader's own transits.

   This file does no astronomy and writes no interpretive prose. Every number comes from
   SkyCalendarEngine and every reading from SkyCalendarText; what is here is arrangement,
   the four tabs, the month grid's keyboard model, and the connective labels that name what
   the engine returned. */
const SkyCalendar = (() => {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Bare reads: both modules must load before this one (pinned in tests/pages.test.cjs).
  const E = SkyCalendarEngine, T = SkyCalendarText;

  const ASPECT_DEGREES = [0, 60, 90, 120, 180];   // SkyCalendarText.aspects is in this order.
  // QUARTER_NAMES[3] is 'Third quarter' but PHASE_NAMES[6]/T.phases[6] is 'Last quarter', so
  // the two lists cannot be matched by title -- map quarter index to phase index instead.
  const QUARTER_TO_PHASE = [0, 2, 4, 6];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TYPE_MARK = {quarter: '☾', ingress: '→', station: '℞', eclipse: '◍'};
  // The same four marks spelled out, so the grid carries a visible key and not bare glyphs.
  const TYPE_NAME = {quarter: 'Moon quarter', ingress: 'sign ingress', station: 'station', eclipse: 'eclipse'};
  // The same illustrative birth details the Jyotish section uses for its sample chart.
  const SAMPLE = {birthday: '1990-07-15', time: '14:30',
    location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}};

  // Two categories of date, and they need different formatters. An INSTANT (every engine
  // `date` field) is a real moment and renders in the reader's own zone, per the spec: "each
  // carrying a UTC instant the UI renders in the reader's local zone". A NOMINAL calendar date
  // -- the month label, a day heading, a stored birthday -- is a label with no instant behind
  // it, built as Date.UTC(y, m, d) and so formatted in UTC or it slides a day.
  const monthFmt = new Intl.DateTimeFormat(undefined, {month: 'long', year: 'numeric', timeZone: 'UTC'});
  const dayFmt = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
  const calendarFmt = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeZone: 'UTC'});
  const dateFmt = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'});
  const clockFmt = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short'});
  const ZONE = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
  const monthLabel = (year, month) => monthFmt.format(new Date(Date.UTC(year, month - 1, 1)));
  const clock = iso => clockFmt.format(new Date(iso));
  const stamp = iso => `${dateFmt.format(new Date(iso))} · ${clock(iso)}`;
  // The local calendar day an instant lands on, and whether it lands in a given local month.
  const localDay = iso => new Date(iso).getDate();
  const inLocalMonth = (iso, year, month) => {
    const at = new Date(iso);
    return at.getFullYear() === year && at.getMonth() === month - 1;
  };
  const monthOffset = (year, month, delta) => {
    const next = month + delta;
    return next < 1 ? {year: year - 1, month: 12} : next > 12 ? {year: year + 1, month: 1} : {year, month: next};
  };
  const todayMonth = () => { const at = new Date(); return {year: at.getFullYear(), month: at.getMonth() + 1}; };
  const cap = word => word.charAt(0).toUpperCase() + word.slice(1);

  const local = `Instants are shown in your device’s time zone${ZONE ? ` (${ZONE})` : ''}.`;
  const CONVENTIONS = {
    moon: 'Geocentric apparent ecliptic longitude in the tropical zodiac, from the Astronomy Engine ephemeris, calculated in your browser for this moment. The phase name is the Sun–Moon elongation rounded to the nearest eighth of a cycle; the illuminated fraction is the lit portion of the disc. The four quarters listed are the next four exact quarter instants. Void of course is measured twice, once against each tradition’s planet list. ' + local,
    month: 'One calendar month in your own time zone. The underlying search runs in UTC, so the three UTC months that always cover a local month are searched and every event is then placed on the local day it falls on. The month carries the Moon’s four quarters, every sign ingress of the Sun, Moon and eight planets — retrograde re-entries included — every retrograde and direct station, and every lunar and global solar eclipse peaking inside the month. Eclipse circumstances are global: no local visibility is claimed for your location. ' + local,
    retrograde: 'Apparent retrograde motion in ecliptic longitude — a planet’s longitude decreasing as seen from the earth, which is an effect of the earth’s own motion and not a change in the planet’s orbit. A station is the instant that longitude speed passes through zero. The pre-retrograde shadow begins when the planet first reaches the longitude it will later station direct at; the post-retrograde shadow ends when it returns to the longitude it stationed retrograde at. The Sun and Moon never retrograde in longitude and are not listed. ' + local,
    transits: 'Exact perfections only: the instant a transiting body reaches a conjunction, sextile, square, trine or opposition to a point in your birth chart, resolved to within a second. No orbs are used, so nothing here is listed as approaching or separating. Nine bodies transit by default; the transiting Moon perfects roughly sixty exact aspects a month and sits behind its own switch. Longitudes are tropical and geocentric. The month is your own calendar month. ' + local
  };
  const conventions = key => `<details class="sc-conventions"><summary>About these calculations</summary><p>${esc(CONVENTIONS[key])}</p></details>`;
  const reading = (entry, label) => entry
    ? `<div class="sc-reading">${label ? `<p class="sc-label">${esc(label)}</p>` : ''}<h5>${esc(entry.title)}</h5><p>${esc(entry.body)}</p><blockquote>${esc(entry.prompt)}</blockquote></div>`
    : '';

  // Which SkyCalendarText entry belongs to an engine event. The eclipse key shape is the one
  // sky-calendar-text.js documents: `${body === 'Sun' ? 'solar' : 'lunar'}-${kind}`.
  function eventText(event) {
    if (event.type === 'quarter') return T.phases[QUARTER_TO_PHASE[event.quarter]] || null;
    if (event.type === 'ingress') return T.ingressSigns[event.signIndex] || null;
    if (event.type === 'station') return T.retrogrades[event.body] || null;
    if (event.type === 'eclipse') return T.eclipses[`${event.body === 'Sun' ? 'solar' : 'lunar'}-${event.kind}`] || null;
    return null;
  }

  function eventLabel(event) {
    if (event.type === 'quarter') return event.name;
    if (event.type === 'ingress') return `${event.body} enters ${event.sign}${event.retrograde ? ', retrograde' : ''}`;
    if (event.type === 'station') return `${event.body} stations ${event.direction} in ${event.sign}`;
    if (event.type === 'eclipse') return `${cap(event.kind)} ${event.body === 'Sun' ? 'solar' : 'lunar'} eclipse`;
    return event.type;
  }

  function attach(root) {
    if (!root) return {setBirthChart() {}};

    // Refreshed by the Moon tab's minute tick (see scheduleMoon below), so a tab left open
    // does not go on reporting an hours-old phase, illumination and void state.
    let now = new Date();
    const phone = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;

    let tab = 'moon';
    let cursor = todayMonth();
    // At 700px and below a seven-column grid of event text does not fit a phone, so the list
    // is what opens there. The reader can still switch; this only picks the default.
    let view = phone && phone.matches ? 'list' : 'grid';
    let focusDay = 1, selectedDay = 0, selectedHit = -1;
    let chart = null, birthday = null, profile = null, usingSample = false, sampleChart = null, includeMoon = false;
    // A calendar opened from the journal: the birth snapshot it was saved with, resolved into
    // the same {chart, birthday} pair transitSource() otherwise builds from the live profile.
    // It outranks both the sample and the reader's own chart until they press "Use my chart",
    // because a saved reading has to replay from what it was saved with, not from what the
    // profile happens to say now.
    let restored = null;
    // The last personalTransits result, held so selecting a contact repaints the detail panel
    // without recomputing a month of root searches.
    let transitResult = null;
    // S6: retrogradeState costs roughly 100ms and the engine is deliberately stateless, so it
    // is called once, when the Retrogrades tab is first opened, and the result is held here.
    let retrogrades = null;
    // Raw engine results per UTC month; the local month is assembled from three of them.
    const monthCache = new Map();
    const transitCache = new Map();
    let moonTimer = null;
    const rendered = new Set();

    root.innerHTML = `<header class="sc-heading">
        <p class="section-kicker">A calendar of exact moments</p>
        <h3 id="sky-calendar-title">The sky this month</h3>
        <p>Where the Moon is now, what the calendar month holds, which planets are retrograde, and the exact moments this month that touch your own birth chart. Everything on this page is calculated in your browser.</p>
      </header>
      <div class="sc-tabs" role="group" aria-label="Sky calendar views">
        <button type="button" data-sc-tab="moon" aria-controls="sc-moon" aria-pressed="true"><span aria-hidden="true">☾</span>Moon now<small>Phase, sign, void</small></button>
        <button type="button" data-sc-tab="month" aria-controls="sc-month" aria-pressed="false"><span aria-hidden="true">▦</span>This month<small>Quarters, ingresses, eclipses</small></button>
        <button type="button" data-sc-tab="retrograde" aria-controls="sc-retrograde" aria-pressed="false"><span aria-hidden="true">℞</span>Retrogrades<small>Stations and shadows</small></button>
        <button type="button" data-sc-tab="transits" aria-controls="sc-transits" aria-pressed="false"><span aria-hidden="true">✦</span>My transits<small>Exact hits to your chart</small></button>
      </div>
      <section id="sc-moon" class="sc-view" aria-live="polite"></section>
      <section id="sc-month" class="sc-view" aria-live="polite" hidden></section>
      <section id="sc-retrograde" class="sc-view" aria-live="polite" hidden></section>
      <section id="sc-transits" class="sc-view" aria-live="polite" hidden></section>`;

    const $ = selector => root.querySelector(selector);
    const panel = key => $(`#sc-${key}`);

    /* ---- Moon now ------------------------------------------------------------------ */

    // The modern void is always a sub-interval of the classical one and both end at the same
    // ingress (SkyCalendarText.voidFraming sets out why), so this is one band with the modern
    // stretch marked inside it, not two bands competing for the same minutes.
    function voidBand(state) {
      const {classical, modern} = state;
      if (!classical.since || !modern.since || !classical.until) {
        return '<p class="sc-note">No void-of-course period could be resolved for this moment.</p>';
      }
      const start = +new Date(classical.since), end = +new Date(classical.until), span = end - start;
      const pct = value => span > 0 ? Math.max(0, Math.min(100, (value - start) / span * 100)) : 0;
      const modernLeft = pct(+new Date(modern.since));
      const nowAt = +now >= start && +now <= end ? pct(+now) : null;
      const state6 = classical.isVoid ? 'void now' : 'not yet void';
      const state9 = modern.isVoid ? 'void now' : 'not yet void';
      return `<div class="sc-void">
          <div class="sc-void-band" role="img" aria-label="The classical void of course runs from ${esc(stamp(classical.since))} to ${esc(stamp(classical.until))}; the modern void is the shorter stretch inside it, from ${esc(stamp(modern.since))} to the same end.">
            <span class="sc-void-modern" style="left:${modernLeft.toFixed(2)}%;right:0"></span>
            ${nowAt === null ? '' : `<span class="sc-void-now" style="left:${nowAt.toFixed(2)}%"></span>`}
          </div>
          <ul class="sc-void-legend">
            <li><span class="sc-swatch sc-swatch-classical" aria-hidden="true"></span><strong>Classical (Lilly’s six)</strong> ${esc(E.CLASSICAL_PLANETS.join(', '))} · from ${esc(stamp(classical.since))} · ${esc(state6)}</li>
            <li><span class="sc-swatch sc-swatch-modern" aria-hidden="true"></span><strong>Modern (adds the outer three)</strong> ${esc(E.MODERN_PLANETS.join(', '))} · from ${esc(stamp(modern.since))} · ${esc(state9)}</li>
            <li><span class="sc-swatch sc-swatch-end" aria-hidden="true"></span><strong>Both end together</strong> at the ingress, ${esc(stamp(classical.until))}</li>
          </ul>
          <p class="sc-note">${modernLeft > 0
            ? 'The Moon’s last aspect by the modern list is to one of the outer three, so the modern void begins later and sits inside the classical one.'
            : 'This time the two rules start together: the Moon’s last aspect was to one of the six classical planets, so the outer three add nothing later.'}</p>
        </div>`;
    }

    function renderMoon() {
      const moon = E.moonNow(now);
      if (moon.status !== 'ready') {
        panel('moon').innerHTML = `<p class="sc-error" role="status">The Moon can only be calculated for dates between ${E.MIN_YEAR} and ${E.MAX_YEAR}. Check your device’s clock.</p>${conventions('moon')}`;
        return;
      }
      const phase = T.phases.find(entry => entry.title === moon.phaseName) || null;
      const degree = `${Math.floor(moon.degree)}° ${String(Math.floor(moon.degree % 1 * 60)).padStart(2, '0')}′`;
      const quarters = moon.quarters.map(q => `<li><strong>${esc(q.name)}</strong><span>${esc(dateFmt.format(new Date(q.date)))} · ${esc(clock(q.date))}</span></li>`).join('');
      panel('moon').innerHTML = `<div class="sc-moon-now">
          <div class="sc-moon-figure"><span aria-hidden="true">☾</span><p>${Math.round(moon.illumination * 100)}% lit</p></div>
          <div>
            <p class="sc-label">Right now</p>
            <h4>${esc(moon.phaseName)} · Moon in ${esc(moon.sign)} ${esc(degree)}</h4>
            <p class="sc-note">Leaves ${esc(moon.sign)} for ${esc(moon.nextIngress.sign)} at ${esc(clock(moon.nextIngress.date))} on ${esc(dateFmt.format(new Date(moon.nextIngress.date)))}.</p>
          </div>
        </div>
        ${reading(phase, 'The phase')}
        <p class="sc-label">The next four quarters</p>
        <ul class="sc-quarters">${quarters}</ul>
        <p class="sc-label">Void of course</p>
        ${voidBand(moon.void)}
        ${reading(T.voidFraming, '')}
        ${conventions('moon')}`;
    }

    /* ---- This month ---------------------------------------------------------------- */

    function cachedMonth(year, month) {
      const key = `${year}-${month}`;
      if (!monthCache.has(key)) monthCache.set(key, E.monthEvents(year, month));
      return monthCache.get(key);
    }

    // The grid is a calendar month in the reader's zone, but the engine searches UTC months.
    // Zone offsets run UTC-12 to UTC+14, under a day either way, so the three UTC months
    // around a local month always cover it: search all three and keep whatever lands on a
    // local date inside the month on screen. The cache means stepping reuses two of the three,
    // so only the first paint of a month pays for its neighbours.
    function localSlice(fetch, list) {
      const out = [];
      for (const delta of [-1, 0, 1]) {
        const at = monthOffset(cursor.year, cursor.month, delta);
        if (at.year < E.MIN_YEAR || at.year > E.MAX_YEAR) continue;
        const result = fetch(at.year, at.month);
        if (result.status !== 'ready') continue;
        for (const item of list(result)) if (inLocalMonth(item.date, cursor.year, cursor.month)) out.push(item);
      }
      out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      return out;
    }

    function monthEvents() {
      const here = cachedMonth(cursor.year, cursor.month);
      if (here.status !== 'ready') return here;
      return {status: 'ready', events: localSlice(cachedMonth, result => result.events)};
    }

    // Void bands are intervals, so the three-UTC-month slice localSlice does for events is both
    // wrong and expensive here: wrong because an interval has no single instant to file, and
    // expensive because voidBands runs an aspect search per sign transit, so three months cost
    // about a second each and the neighbours' bands are then almost entirely deduped away.
    // voidBands already takes an arbitrary window, so ask it once for the local month.
    // Cached per local month the way cachedMonth caches events: a month's bands cost about a
    // second of aspect searching, and stepping back and forth would otherwise pay it every time.
    const voidCache = new Map();
    function localVoids() {
      const key = `${cursor.year}-${cursor.month}`;
      if (!voidCache.has(key)) {
        voidCache.set(key, E.voidBands(new Date(cursor.year, cursor.month - 1, 1),
                                       new Date(cursor.year, cursor.month, 1)));
      }
      return voidCache.get(key);
    }

    // One row per band: the sign the Moon is crossing, when each tradition's void opens, and the
    // shared ingress that closes both. The bar is proportional to the classical span with the
    // modern stretch marked inside it, the same shape the Moon tab uses, because the modern void
    // is always contained in the classical one rather than competing with it.
    function voidStrip() {
      const bands = localVoids();
      if (!bands.length) {
        return `<section class="sc-voids" aria-labelledby="sc-voids-title">
            <h4 id="sc-voids-title">Void-of-course periods</h4>
            <p class="sc-note">No void period falls in this month.</p>
          </section>`;
      }
      // Bars are scaled to duration so a stacked list supports the comparison it invites: the
      // month's longest band fills the row and the rest are drawn against it. The scale is the
      // DISPLAYED MONTH, not a fixed number of hours, because within-month comparison is what a
      // reader is doing here and spans range from minutes to two days. That means a bar changes
      // meaning when you step months, so the scale is stated above the list rather than left to
      // be inferred. MIN_BAR keeps a very brief void visible instead of a hairline; the exact
      // figure is always in the row's own sentence, so the floor costs no information.
      const MIN_BAR = 2;
      const longest = Math.max(...bands.map(b => +new Date(b.end) - +new Date(b.start)), 1);
      const rows = bands.map(band => {
        const start = +new Date(band.start), end = +new Date(band.end), span = end - start;
        const width = Math.max(MIN_BAR, span / longest * 100);
        const modernAt = +new Date(band.modernStart);
        const modernLeft = span > 0 ? Math.max(0, Math.min(100, (modernAt - start) / span * 100)) : 0;
        const hours = span / 3600000;
        const together = modernAt <= start;
        return `<li class="sc-voidrow">
            <div class="sc-voidhead">
              <strong>Moon in ${esc(band.sign)}</strong>
              <span>${esc(stamp(band.start))} → ${esc(stamp(band.end))}</span>
            </div>
            <div class="sc-void-band" style="width:${width.toFixed(2)}%" role="img" aria-label="Moon in ${esc(band.sign)}. The classical void runs from ${esc(stamp(band.start))} to ${esc(stamp(band.end))}${together ? ', and the modern void runs with it' : `; the modern void is the shorter stretch inside it, from ${esc(stamp(band.modernStart))} to the same end`}.">
              <span class="sc-void-modern" style="left:${modernLeft.toFixed(2)}%;right:0"></span>
            </div>
            <p class="sc-voidnote">${hours < 1 ? 'Under an hour' : `${hours.toFixed(1)} hours`} by the classical rule${together
              ? ', and the same by the modern one — the Moon’s last aspect was to one of the six.'
              : `, ${((end - modernAt) / 3600000).toFixed(1)} by the modern one.`}</p>
          </li>`;
      }).join('');
      const longestHours = longest / 3600000;
      return `<section class="sc-voids" aria-labelledby="sc-voids-title">
          <h4 id="sc-voids-title">Void-of-course periods</h4>
          <p class="sc-voids-intro">${esc(T.voidFraming.body)}</p>
          <p class="sc-voids-scale">Bars are drawn to length against this month's longest period: the widest bar is ${esc(longestHours < 1 ? 'under an hour' : `${longestHours.toFixed(1)} hours`)}. The scale changes from month to month.</p>
          <ul class="sc-voidlist">${rows}</ul>
        </section>`;
    }

    function stepper(scope) {
      const back = cursor.year === E.MIN_YEAR && cursor.month === 1;
      const forward = cursor.year === E.MAX_YEAR && cursor.month === 12;
      const here = todayMonth();
      const onNow = cursor.year === here.year && cursor.month === here.month;
      return `<div class="sc-stepper">
          <button type="button" data-sc-step="-1" data-sc-scope="${scope}"${back ? ' disabled' : ''} aria-label="Previous month">‹</button>
          <strong>${esc(monthLabel(cursor.year, cursor.month))}</strong>
          <button type="button" data-sc-step="1" data-sc-scope="${scope}"${forward ? ' disabled' : ''} aria-label="Next month">›</button>
          <button type="button" data-sc-reset data-sc-scope="${scope}"${onNow ? ' disabled' : ''}>This month</button>
        </div>`;
    }

    function renderMonth() {
      const result = monthEvents();
      if (result.status !== 'ready') {
        panel('month').innerHTML = `${stepper('month')}<p class="sc-error" role="status">This month is outside the calculated range of ${E.MIN_YEAR}–${E.MAX_YEAR}.</p>${conventions('month')}`;
        return;
      }
      const days = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
      const lead = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
      const byDay = new Map();
      for (const event of result.events) {
        const day = localDay(event.date);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(event);
      }
      if (focusDay > days) focusDay = days;
      if (selectedDay > days) selectedDay = 0;

      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<div class="sc-cell sc-cell-blank" aria-hidden="true"></div>');
      for (let day = 1; day <= days; day++) {
        const events = byDay.get(day) || [];
        const marks = events.map(event => `<span class="sc-mark sc-mark-${event.type}" aria-hidden="true">${TYPE_MARK[event.type] || '·'}</span>`).join('');
        cells.push(`<button type="button" class="sc-cell" data-sc-day="${day}" tabindex="${day === focusDay ? 0 : -1}" aria-pressed="${day === selectedDay}">
            <span class="sc-cell-day">${day}</span>
            <span class="sc-cell-marks">${marks}</span>
            <span class="sc-visually-hidden">${events.length ? `${events.length} event${events.length === 1 ? '' : 's'}: ${esc(events.map(eventLabel).join('; '))}` : 'no events'}</span>
          </button>`);
      }

      const listRows = [...byDay.keys()].sort((a, b) => a - b).map(day => `<li>
          <button type="button" class="sc-list-day" data-sc-day="${day}" aria-pressed="${day === selectedDay}">
            <strong>${day} ${esc(monthLabel(cursor.year, cursor.month))}</strong>
            <span>${byDay.get(day).map(event => `${esc(clock(event.date))} · ${esc(eventLabel(event))}`).join('<br>')}</span>
          </button></li>`).join('');

      panel('month').innerHTML = `${stepper('month')}
        <div class="sc-viewtoggle" role="group" aria-label="Month view">
          <button type="button" data-sc-view="grid" aria-pressed="${view === 'grid'}">Grid</button>
          <button type="button" data-sc-view="list" aria-pressed="${view === 'list'}">List</button>
        </div>
        <div class="sc-gridview"${view === 'grid' ? '' : ' hidden'}>
          <div class="sc-gridwrap">
            <div class="sc-grid" role="group" aria-label="${esc(monthLabel(cursor.year, cursor.month))}, arrow keys move between days, Enter opens a day">
              ${WEEKDAYS.map(name => `<div class="sc-weekday" aria-hidden="true">${name}</div>`).join('')}
              ${cells.join('')}
            </div>
          </div>
          <p class="sc-key">${Object.keys(TYPE_MARK).map(type => `<span><span class="sc-mark sc-mark-${type}" aria-hidden="true">${TYPE_MARK[type]}</span>${TYPE_NAME[type]}</span>`).join('')}</p>
        </div>
        <ul class="sc-list"${view === 'list' ? '' : ' hidden'}>${listRows || '<li class="sc-note">No quarters, ingresses, stations or eclipses fall in this month.</li>'}</ul>
        <div class="sc-detail" data-sc-detail aria-live="polite"></div>
        ${voidStrip()}
        ${conventions('month')}`;
      renderDayDetail();
    }

    function renderDayDetail() {
      const target = panel('month').querySelector('[data-sc-detail]');
      if (!target) return;
      panel('month').querySelectorAll('[data-sc-day]').forEach(cell => {
        cell.setAttribute('aria-pressed', String(Number(cell.dataset.scDay) === selectedDay));
        if (cell.classList.contains('sc-cell')) cell.tabIndex = Number(cell.dataset.scDay) === focusDay ? 0 : -1;
      });
      if (!selectedDay) {
        target.innerHTML = '<p class="sc-note">Choose a day to read what the tradition associates with its events.</p>';
        return;
      }
      const result = monthEvents();
      const events = (result.events || []).filter(event => localDay(event.date) === selectedDay);
      const heading = dayFmt.format(new Date(Date.UTC(cursor.year, cursor.month - 1, selectedDay)));
      target.innerHTML = `<p class="sc-label">${esc(heading)}</p>${
        events.length
          ? events.map(event => `<div class="sc-event"><p class="sc-event-head">${esc(clock(event.date))} · ${esc(eventLabel(event))}</p>${reading(eventText(event), '')}</div>`).join('')
          : '<p class="sc-note">Nothing exact falls on this day.</p>'}`;
    }

    /* ---- Retrogrades --------------------------------------------------------------- */

    function renderRetrograde() {
      if (retrogrades === null) {
        panel('retrograde').innerHTML = '<p class="sc-note" role="status">Finding every station and shadow period…</p>';
        // Yield once so the placeholder paints before the ~100ms of station searches.
        setTimeout(() => {
          retrogrades = E.retrogradeState(new Date());
          renderRetrograde();
        }, 0);
        return;
      }
      if (!Array.isArray(retrogrades)) {
        panel('retrograde').innerHTML = `<p class="sc-error" role="status">Retrograde periods can only be calculated for dates between ${E.MIN_YEAR} and ${E.MAX_YEAR}.</p>${conventions('retrograde')}`;
        return;
      }
      const card = body => `<article class="sc-retro${body.isRetrograde ? ' is-retrograde' : ''}">
          <p class="sc-label">${esc(body.body)} · ${body.isRetrograde ? 'retrograde now' : 'direct now'}</p>
          <ul class="sc-retro-dates">
            <li><span>Pre-retrograde shadow</span><strong>${esc(dateFmt.format(new Date(body.period.preShadow)))}</strong></li>
            <li><span>Stations retrograde in ${esc(body.period.startSign)}</span><strong>${esc(dateFmt.format(new Date(body.period.start)))} · ${esc(clock(body.period.start))}</strong></li>
            <li><span>Stations direct in ${esc(body.period.endSign)}</span><strong>${esc(dateFmt.format(new Date(body.period.end)))} · ${esc(clock(body.period.end))}</strong></li>
            <li><span>Post-retrograde shadow ends</span><strong>${esc(dateFmt.format(new Date(body.period.postShadow)))}</strong></li>
          </ul>
          ${reading(T.retrogrades[body.body], '')}
        </article>`;
      const active = retrogrades.filter(body => body.isRetrograde);
      panel('retrograde').innerHTML = `<p class="sc-note">${active.length
          ? `Retrograde right now: ${esc(active.map(body => body.body).join(', '))}. The rest show the period they are travelling toward.`
          : 'No listed planet is retrograde right now. Each card shows the period that planet is travelling toward.'}</p>
        <div class="sc-retro-grid">${retrogrades.map(card).join('')}</div>
        ${conventions('retrograde')}`;
    }

    /* ---- My transits --------------------------------------------------------------- */

    function transitSource() {
      if (restored) return restored.source;
      if (usingSample) {
        if (!sampleChart) sampleChart = NatalEngine.calculate(SAMPLE);
        return {chart: sampleChart, birthday: SAMPLE.birthday};
      }
      if (!birthday && !chart) return null;
      return {chart, birthday};
    }

    // The birth details a saved calendar carries, in NatalEngine.calculate's own input shape so
    // load() can rebuild the chart from it alone. Only the three location fields NatalEngine
    // reads are copied -- the stored profile's placeLocation can carry a whole geocoder record,
    // and the payload has an 8 KB ceiling. The place name is deliberately not among them:
    // nothing on replay displays it, so carrying it would be dead weight in the payload.
    const snapshotLocation = place => place && Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && place.timeZone
      ? {latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone}
      : null;

    function birthSnapshot() {
      if (restored) return restored.birth;
      if (usingSample) return {birthday: SAMPLE.birthday, time: SAMPLE.time, location: snapshotLocation(SAMPLE.location), houseSystem: 'placidus', fold: ''};
      if (!birthday) return null;
      return {birthday, time: profile && typeof profile.time === 'string' ? profile.time : '',
        location: snapshotLocation(profile && profile.placeLocation),
        houseSystem: profile && profile.houseSystem ? profile.houseSystem : 'placidus',
        fold: profile && profile.fold ? profile.fold : ''};
    }

    // Whether what the transits tab is showing is the illustrative sample rather than the
    // reader's own chart. It has to travel with the payload: once a calendar is in the journal
    // the reader cannot see the sample bar any more, and a row that reads like their own
    // reading when it is not is exactly the claim this site does not make.
    const showingSample = () => restored ? restored.sample : usingSample;

    // A snapshot resolved back into the {chart, birthday} pair the engine wants. A snapshot
    // with no usable time or place gives a chart NatalEngine refuses to place, and `null` there
    // is exactly what setBirthChart stores for the same case -- the engine then falls back to
    // its noon-UTC natal points, the same approximate path a date-only reader gets live.
    function sourceFor(birth) {
      const computed = NatalEngine.calculate({birthday: birth.birthday, time: birth.time, location: birth.location,
        houseSystem: birth.houseSystem, fold: birth.fold});
      return {chart: computed.status === 'ready' ? computed : null, birthday: birth.birthday};
    }

    function cachedTransits(source, year, month) {
      const key = `${year}-${month}`;
      if (!transitCache.has(key)) transitCache.set(key, E.personalTransits(source, year, month, {includeMoon}));
      return transitCache.get(key);
    }

    // Same local-month assembly as the grid, so a contact at 23:40 on the last day of the
    // reader's month belongs to that month and not the next one. The three flags come from the
    // month actually asked for: they describe the natal source, not the search window.
    function localTransits(source) {
      const here = cachedTransits(source, cursor.year, cursor.month);
      if (here.status !== 'ready') return here;
      return {status: 'ready', hits: localSlice((year, month) => cachedTransits(source, year, month), result => result.hits),
        angles: here.angles, natalMoon: here.natalMoon, approximate: here.approximate};
    }

    // S8 / S1: when the engine flags `approximate`, the reader is told all three facts --
    // why the positions are only close, why the angles are absent, and why the natal Moon is.
    // "Within a couple of degrees" is the defensible claim: over the widest gap between noon
    // UTC and a real birth instant, Mercury moves 2.39°, Venus 1.36° and the Sun 1.11°.
    const APPROXIMATE = `<div class="sc-caveat"><p class="sc-label">Read these as approximate</p>
        <p>You have given a birth date but no birth time, so these natal positions are taken at noon UTC on that date. A birth date is a local calendar date and time zones run from UTC−12 to UTC+14, which puts the true moment as much as 26 hours away from that noon. Over 26 hours the planets move a little, so treat every position below as accurate to within a couple of degrees rather than exactly — Mercury, Venus and the Sun are the three that drift furthest.</p>
        <p>The four angles — Ascendant, Midheaven, Descendant and Imum Coeli — are left out entirely. They turn a full circle every day, so they need a birth time and a birthplace, and there is no honest way to approximate them from a date alone.</p>
        <p>The natal Moon is left out for the same reason. Over 26 hours the Moon can move more than sixteen degrees, which is most of a sign, so an exact contact to it would be wrong by days. That is worse than saying nothing.</p></div>`;

    function renderTransits() {
      const source = transitSource();
      if (!source) {
        panel('transits').innerHTML = `${stepper('transits')}
          <div class="sc-empty"><span aria-hidden="true">✦</span>
            <p>Add your birth details on the charts page and this tab fills with the exact moments this month when a transiting body reaches a major aspect to a point in your own chart. A birth date alone is enough to start; a birth time and birthplace make it precise.</p>
            <div class="sc-empty-actions"><a class="sc-cta" href="/charts/">Add birth details</a><button type="button" data-sc-sample>Try a sample chart</button></div>
          </div>
          ${conventions('transits')}`;
        return;
      }
      const result = transitResult = localTransits(source);
      const controls = `${stepper('transits')}
        <div class="sc-transit-bar">
          <p class="sc-note">${restored
            ? restored.sample
              ? 'Opened from your journal · sample chart · 15 July 1990, 14:30, New York. Illustrative birth details, not your own.'
              : `Opened from your journal · saved birth details · ${esc(calendarFmt.format(new Date(`${restored.birth.birthday}T00:00:00Z`)))}`
            : usingSample
            ? 'Sample chart · 15 July 1990, 14:30, New York. Illustrative birth details, not your own.'
            : `Your birth chart · ${esc(birthday ? calendarFmt.format(new Date(`${birthday}T00:00:00Z`)) : '')}`}</p>
          <label class="sc-switch"><input type="checkbox" data-sc-moon${includeMoon ? ' checked' : ''}> Include the transiting Moon</label>
          <button type="button" data-sc-sample>${restored || usingSample ? 'Use my chart' : 'Try a sample chart'}</button>
        </div>`;
      if (result.status !== 'ready') {
        const message = result.status === 'out-of-range'
          ? `Transits can only be calculated for months between ${E.MIN_YEAR} and ${E.MAX_YEAR}.`
          : 'Your birth details are not complete enough to place a chart yet. A birth date on its own is enough to start.';
        transitResult = null;
        panel('transits').innerHTML = `${controls}<p class="sc-error" role="status">${esc(message)}</p>${conventions('transits')}`;
        return;
      }
      const byDay = new Map();
      result.hits.forEach((hit, index) => {
        const day = localDay(hit.date);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push({hit, index});
      });
      const groups = [...byDay.keys()].sort((a, b) => a - b).map(day => `<li>
          <p class="sc-label">${esc(dayFmt.format(new Date(Date.UTC(cursor.year, cursor.month - 1, day))))}</p>
          <ul class="sc-hit-list">${byDay.get(day).map(({hit, index}) => `<li><button type="button" data-sc-hit="${index}" aria-pressed="${index === selectedHit}">
              <span>${esc(clock(hit.date))}</span>
              <strong>${esc(hit.body)}${hit.retrograde ? ' ℞' : ''} ${esc(hit.aspectName)} ${esc(hit.targetKind === 'angle' ? '' : 'natal ')}${esc(hit.target)}</strong>
            </button></li>`).join('')}</ul></li>`).join('');
      panel('transits').innerHTML = `${controls}
        ${result.approximate ? APPROXIMATE : ''}
        <p class="sc-note">${result.hits.length
          ? `${result.hits.length} exact contact${result.hits.length === 1 ? '' : 's'} in ${esc(monthLabel(cursor.year, cursor.month))}${result.angles ? ', angles included' : ''}${result.natalMoon ? ', natal Moon included' : ''}.`
          : `No transiting body perfects a major aspect to your chart in ${esc(monthLabel(cursor.year, cursor.month))}.`}</p>
        <ul class="sc-hits">${groups}</ul>
        <div class="sc-detail" data-sc-hit-detail aria-live="polite"></div>
        ${saveControl()}
        ${conventions('transits')}`;
      renderHitDetail();
    }

    function renderHitDetail() {
      const target = panel('transits').querySelector('[data-sc-hit-detail]');
      if (!target || !transitResult) return;
      panel('transits').querySelectorAll('[data-sc-hit]').forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.scHit) === selectedHit));
      });
      const hit = transitResult.hits[selectedHit];
      if (!hit) {
        target.innerHTML = transitResult.hits.length ? '<p class="sc-note">Choose a contact to read what the tradition associates with that angle.</p>' : '';
        return;
      }
      const entry = T.aspects[ASPECT_DEGREES.indexOf(hit.aspect)] || null;
      target.innerHTML = `<p class="sc-event-head">${esc(dateFmt.format(new Date(hit.date)))} · ${esc(clock(hit.date))} · ${esc(hit.body)} ${esc(hit.aspectName)} ${esc(hit.targetKind === 'angle' ? '' : 'natal ')}${esc(hit.target)}</p>${reading(entry, '')}`;
    }

    /* ---- Saving ---------------------------------------------------------------------

       Only the transit calendar is a reading: the Moon, the month and the retrograde tracker
       are the same sky for everybody and have nothing personal to keep. account.js's
       document-level [data-save-reading] delegation does the rest -- including showing the
       sign-in dialog for a guest, so nothing is stored or sent for one. */

    function saveControl() {
      const signedIn = typeof window !== 'undefined' && window.IshtarAccount ? window.IshtarAccount.state().signedIn : false;
      return `<p class="save-reading"><button type="button" data-save-reading="transit-calendar">${
        signedIn ? 'Save this month to my journal' : 'Sign in to save this month'
      }</button><span role="status" aria-live="polite"></span></p>`;
    }

    // Whatever the transits tab is showing, as a reading. `transitResult` is the month the
    // panel last rendered, so this can never describe a month the reader is not looking at.
    function currentCalendar() {
      if (!transitResult || transitResult.status !== 'ready') return null;
      const birth = birthSnapshot();
      if (!birth) return null;
      const count = transitResult.hits.length;
      const sample = showingSample();
      return {kind: 'transit-calendar', deck: '', layout: '', question: '', focus: '',
        // The journal row has to say what it is: a sample calendar is named as one there, not
        // just once it is reopened.
        summary: `${monthLabel(cursor.year, cursor.month)} · ${count} exact contact${count === 1 ? '' : 's'}${sample ? ' · sample chart' : ''}`.slice(0, 120),
        payload: {birth, year: cursor.year, month: cursor.month, includeMoon, sample}};
    }

    const HOUSE_SYSTEMS = ['placidus', 'whole-sign', 'equal', 'regiomontanus'];
    // A location field is valid when it is absent/null (a date-only birth) or a complete,
    // in-range place. Returns `undefined` for a malformed one so the caller can tell the two
    // apart -- silently degrading a broken place to "no place" would replay a different chart
    // from the one that was saved.
    function readLocation(value) {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'object' || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)
        || Math.abs(value.latitude) >= 90 || Math.abs(value.longitude) > 180
        || typeof value.timeZone !== 'string' || !value.timeZone) return undefined;
      return snapshotLocation(value);
    }

    // Validate everything, then mutate nothing until it has all passed -- the same order
    // TarotRoom.loadDraw uses, so a malformed payload leaves the tab, the month, the Moon
    // switch and the chart on screen exactly as they were.
    function loadCalendar(reading) {
      const payload = reading && reading.payload;
      if (!payload || typeof payload !== 'object') return false;
      if (!Number.isInteger(payload.year) || payload.year < E.MIN_YEAR || payload.year > E.MAX_YEAR) return false;
      if (!Number.isInteger(payload.month) || payload.month < 1 || payload.month > 12) return false;
      if (typeof payload.includeMoon !== 'boolean') return false;
      const sample = payload.sample === undefined || payload.sample === null ? false : payload.sample;
      if (typeof sample !== 'boolean') return false;
      const saved = payload.birth;
      if (!saved || typeof saved !== 'object') return false;
      if (typeof saved.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.birthday)) return false;
      const time = saved.time === undefined || saved.time === null ? '' : saved.time;
      // A real clock time or nothing. `\d{1,2}:\d{2}` would let 07:60 and 99:99 through to
      // NatalEngine, which refuses them -- and a refused chart is indistinguishable from an
      // honest date-only birth, so the load would quietly replay down the approximate path
      // instead of rejecting a payload that cannot be right.
      if (typeof time !== 'string' || (time !== '' && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time))) return false;
      const location = readLocation(saved.location);
      if (location === undefined) return false;
      const houseSystem = saved.houseSystem === undefined || saved.houseSystem === null ? 'placidus' : saved.houseSystem;
      if (!HOUSE_SYSTEMS.includes(houseSystem)) return false;
      const fold = saved.fold === undefined || saved.fold === null ? '' : saved.fold;
      if (!['', 'earlier', 'later'].includes(fold)) return false;

      const birth = {birthday: saved.birthday, time, location, houseSystem, fold};
      const source = sourceFor(birth);
      // The last gate, and the one the field checks above cannot make: the engine itself has
      // to accept this source and month. It refuses a date that looks well-formed but is not
      // a real day (2026-02-31), and any month outside its own range.
      const result = E.personalTransits(source, payload.year, payload.month, {includeMoon: payload.includeMoon});
      if (result.status !== 'ready') return false;

      // ---- everything validated; commit ----
      restored = {birth, source, sample};
      usingSample = false;
      cursor = {year: payload.year, month: payload.month};
      includeMoon = payload.includeMoon;
      selectedHit = -1; selectedDay = 0; focusDay = 1;
      transitCache.clear();
      // The month this reading is: keep the search just done rather than repeating it, since
      // renderTransits asks for exactly this year/month/includeMoon a moment from now.
      transitCache.set(`${payload.year}-${payload.month}`, result);
      rendered.delete('transits'); rendered.delete('month');
      show('transits');
      // On a phone the section is a collapsed fold, so a replay that only switches tabs leaves
      // the reader looking at a closed row. Same line both sibling rooms end on (tarot.js,
      // divination.js); the page's generic `scrollTo` cannot do it, because it scrolls to an
      // element that is still hidden.
      (window.MobileSections?.reveal(root) || root).scrollIntoView?.({behavior: 'smooth', block: 'start'});
      return true;
    }

    /* ---- Wiring -------------------------------------------------------------------- */

    const RENDER = {moon: renderMoon, month: renderMonth, retrograde: renderRetrograde, transits: renderTransits};

    function show(key) {
      tab = key;
      root.querySelectorAll('[data-sc-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scTab === key)));
      root.querySelectorAll('.sc-view').forEach(view => { view.hidden = view.id !== `sc-${key}`; });
      // Each tab renders on its first opening, which is what keeps the retrograde tracker off
      // the page-load path entirely.
      if (!rendered.has(key)) { rendered.add(key); RENDER[key](); }
    }

    function goToMonth(next, scope, focusSelector) {
      cursor = next;
      selectedDay = 0; selectedHit = -1; focusDay = 1;
      invalidate(['month', 'transits']);
      // The panel was rewritten, so put focus back on the control the reader pressed -- unless
      // the move disabled it (a range edge, or landing back on the current month).
      const again = panel(scope).querySelector(focusSelector);
      (again && !again.disabled ? again : panel(scope).querySelector('.sc-stepper button:not([disabled])'))?.focus({preventScroll: true});
    }

    function invalidate(keys) {
      for (const key of keys) {
        rendered.delete(key);
        if (key === tab) { rendered.add(key); RENDER[key](); }
      }
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button || !root.contains(button)) return;
      const data = button.dataset;
      if ('scTab' in data) show(data.scTab);
      else if ('scView' in data) {
        view = data.scView;
        panel('month').querySelectorAll('[data-sc-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scView === view)));
        panel('month').querySelector('.sc-gridview').hidden = view !== 'grid';
        panel('month').querySelector('.sc-list').hidden = view !== 'list';
      } else if ('scStep' in data) {
        goToMonth(monthOffset(cursor.year, cursor.month, Number(data.scStep)), data.scScope, `[data-sc-step="${data.scStep}"]`);
      } else if ('scReset' in data) {
        goToMonth(todayMonth(), data.scScope, '[data-sc-reset]');
      } else if ('scDay' in data) {
        selectedDay = Number(data.scDay); focusDay = selectedDay; renderDayDetail();
      } else if ('scHit' in data) {
        selectedHit = Number(data.scHit); renderHitDetail();
      } else if ('scSample' in data) {
        // From a calendar opened out of the journal this button is "Use my chart", so it drops
        // the saved snapshot rather than toggling the sample on top of it.
        if (restored) { restored = null; usingSample = false; } else usingSample = !usingSample;
        selectedHit = -1; transitCache.clear(); invalidate(['transits']);
      }
    });

    root.addEventListener('change', event => {
      if (!event.target.matches('[data-sc-moon]')) return;
      includeMoon = event.target.checked; selectedHit = -1; transitCache.clear(); invalidate(['transits']);
    });

    // Roving tabindex: exactly one cell is tabbable, the arrows move it, Enter (the button's
    // own activation) opens that day.
    root.addEventListener('keydown', event => {
      const cell = event.target.closest('.sc-cell[data-sc-day]'); if (!cell) return;
      const days = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
      const delta = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7}[event.key];
      let next = delta ? Number(cell.dataset.scDay) + delta : event.key === 'Home' ? 1 : event.key === 'End' ? days : null;
      if (next === null) return;
      event.preventDefault();
      focusDay = Math.max(1, Math.min(days, next));
      panel('month').querySelectorAll('.sc-cell[data-sc-day]').forEach(other => { other.tabIndex = Number(other.dataset.scDay) === focusDay ? 0 : -1; });
      panel('month').querySelector(`.sc-cell[data-sc-day="${focusDay}"]`)?.focus({preventScroll: true});
    });

    // "Moon now" is a live reading -- phase, illumination, the four quarters, the void band's
    // geometry and its void / not-yet-void labels all move with the clock -- so it refreshes on
    // the minute, the precision it displays. Same shape as daily-horoscope.js's rollover timer:
    // only while the document is visible, and only this panel. While another tab is showing,
    // the panel is marked stale instead, so it is fresh the next time it is opened.
    function scheduleMoon() {
      clearTimeout(moonTimer);
      moonTimer = setTimeout(tickMoon, Math.max(1000, 60000 - Date.now() % 60000 + 100));
    }

    function tickMoon() {
      if (!document.hidden) {
        now = new Date();
        if (tab === 'moon') renderMoon(); else rendered.delete('moon');
      }
      scheduleMoon();
    }

    document.addEventListener('visibilitychange', () => { if (!document.hidden) tickMoon(); });

    // Signing in or out flips the save control between "Save this month" and "Sign in to save",
    // the same way tarot.js re-renders its reading on this event. The transit caches are left
    // alone: the account state changes the label, not the sky.
    document.addEventListener('ishtar-account-change', () => invalidate(['transits']));

    show('moon');
    scheduleMoon();

    return {
      // BirthProfile holds {natal, profile}; personalTransits wants the same pair as
      // {chart, birthday}, so both halves arrive here. The stored profile itself comes third,
      // for the birth snapshot a saved calendar carries -- the natal chart does not record the
      // birthplace it was placed at, so the time and location have to come from the profile.
      setBirthChart(value, birthdayValue, profileValue) {
        chart = value && value.status === 'ready' ? value : null;
        birthday = typeof birthdayValue === 'string' && birthdayValue ? birthdayValue : null;
        profile = profileValue && typeof profileValue === 'object' ? profileValue : null;
        // `restored` is deliberately NOT cleared here. Ordering against a journal open is not
        // guaranteed: account.js's sign-in handler is `await reconcileProfile()` and then
        // `BirthProfile.restore()`, and reconcileProfile POSTs the profile when the account has
        // none saved -- so this can land AFTER the room's load has finished awaiting the
        // reading fetch. Clearing here would then silently swap a just-opened saved calendar
        // for the live chart. A saved reading is only left by the explicit "Use my chart"
        // press, which clears `restored` and the transit cache itself.
        if (restored) return;
        selectedHit = -1; transitCache.clear();
        invalidate(['transits']);
      },
      currentCalendar, loadCalendar
    };
  }

  return {attach};
})();

(() => {
  const room = document.querySelector('#sky-calendar');
  if (!room) return;
  const section = SkyCalendar.attach(room);
  BirthProfile.subscribe(state => section.setBirthChart(state?.natal || null, state?.profile?.birthday || null, state?.profile || null));
  // The registration lives here, beside the state it reads, rather than in rooms.js -- which
  // holds only the kind->page and kind->label tables every page needs, registered or not.
  Rooms.register('transit-calendar', {
    label: 'Transit calendar', category: 'sky',
    current: () => section.currentCalendar(),
    load: reading => section.loadCalendar(reading)
  });
})();
