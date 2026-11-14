/* Planetary hours on /sky/: the hour now, the planetary day's ruler, and all twenty-four hours
   for a chosen city and date. The arithmetic is ClassicalEngine.planetaryHours, the same
   function the horary section uses; this file only chooses the instant to ask about and
   draws the answer. Nothing is fetched except the city index, and nothing is stored: the
   section starts from the saved birthplace, or New York, on every visit. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlanetaryHours = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The sky calendar's sample place, so the two sections agree before a birthplace is known.
  const DEFAULT_PLACE = {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'};
  const GLYPH = {Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄'};
  // What each planet's hour was traditionally given to. Associations, not advice.
  const NOTE = {
    Sun: 'In the tradition, the Sun’s hour belongs to rulers, honours and health.',
    Moon: 'In the tradition, the Moon’s hour belongs to travel, messages and the household.',
    Mercury: 'In the tradition, Mercury’s hour belongs to writing, trade and study.',
    Venus: 'In the tradition, the hour of Venus belongs to friendship, love and the arts.',
    Mars: 'In the tradition, the hour of Mars belongs to contest, courage and sharp tools.',
    Jupiter: 'In the tradition, Jupiter’s hour belongs to law, generosity and good counsel.',
    Saturn: 'In the tradition, Saturn’s hour belongs to boundaries, old things and patient work.'
  };
  const MIN_DATE = '1901-01-01', MAX_DATE = '2100-12-31';

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const validPlace = p => !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 && typeof p.timeZone === 'string' && p.timeZone !== '';

  // The calendar date an instant falls on in a zone, as YYYY-MM-DD.
  function dateIn(timeZone, instant) {
    return new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(instant);
  }
  // How far the zone's wall clock is ahead of UTC at an instant, in milliseconds.
  function offsetMs(timeZone, instant) {
    const parts = {};
    for (const {type, value} of new Intl.DateTimeFormat('en-US', {timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'}).formatToParts(instant)) parts[type] = Number(value);
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(+instant / 1000) * 1000;
  }
  // Local noon on a date. Noon is never skipped or repeated by a clock change, and it always
  // falls after that date's sunrise, so the engine returns that date's own planetary day.
  function noonOn(dateString, timeZone) {
    const [year, month, day] = dateString.split('-').map(Number);
    const guess = Date.UTC(year, month - 1, day, 12);
    return new Date(guess - offsetMs(timeZone, new Date(guess)));
  }
  // The instant to ask the engine about: right now for today, local noon for any other date.
  function instantFor(dateString, timeZone, now) {
    return dateString === dateIn(timeZone, now) ? now : noonOn(dateString, timeZone);
  }

  // The result as HTML. `live` is true when the instant asked about is the present moment.
  function render(result, {place, live}) {
    if (result.status !== 'ready') return `<p class="ph-error" role="alert">${esc(result.message)}</p>`;
    const clock = new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', timeZone: place.timeZone});
    const time = iso => clock.format(new Date(iso));
    const current = live ? result.hours[result.current] : null;
    const nowCard = current ? `<div class="ph-now">
        <p class="ph-label">The hour now</p>
        <p class="ph-now-ruler"><span aria-hidden="true">${GLYPH[current.ruler]}</span> Hour of ${esc(current.ruler)}</p>
        <p class="ph-now-span">${time(current.start)} to ${time(current.end)} · ${current.isDay ? 'day' : 'night'} hour ${current.isDay ? current.index : current.index - 12} of 12</p>
        <p class="ph-note">${esc(NOTE[current.ruler])}</p>
      </div>` : '';
    const rows = result.hours.map((h, i) => `<tr${h.isDay ? '' : ' class="ph-night"'}${live && i === result.current ? ' aria-current="true"' : ''}><th scope="row">${h.index}</th><td>${h.isDay ? 'Day' : 'Night'}</td><td><span aria-hidden="true">${GLYPH[h.ruler]}</span> ${esc(h.ruler)}</td><td>${time(h.start)}</td><td>${time(h.end)}</td></tr>`).join('');
    return `${nowCard}
      <p class="ph-summary">${esc(result.weekday)}, the day of ${esc(result.dayRuler === 'Sun' || result.dayRuler === 'Moon' ? 'the ' + result.dayRuler : result.dayRuler)} · sunrise ${time(result.sunrise)} · sunset ${time(result.sunset)} · times for ${esc(place.label)}</p>
      <div class="ph-table-wrap"><table><caption>The twenty-four hours, sunrise to sunrise</caption><thead><tr><th scope="col">Hour</th><th scope="col">Day or night</th><th scope="col">Ruler</th><th scope="col">Starts</th><th scope="col">Ends</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const shell = () => `<div class="ph-heading">
      <p class="section-kicker">Planetary hours</p>
      <h3 id="planetary-hours-title">The hour, by the old reckoning</h3>
      <p>Daylight is divided into twelve hours and the night into twelve more, so the hours stretch in summer and shrink in winter. Each is given to one of the seven classical planets in the Chaldean order: Saturn, Jupiter, Mars, the Sun, Venus, Mercury, the Moon. The planet of the first hour after sunrise names the day. The scheme is ancient; this is the form set out in Agrippa’s <cite>Three Books of Occult Philosophy</cite> (1533), book II, chapter 34.</p>
    </div>
    <form class="ph-form" id="ph-form">
      <label>Date<input id="ph-date" type="date" min="${MIN_DATE}" max="${MAX_DATE}" required></label>
      <div class="birthplace-field">
        <label for="ph-place"><span>City</span></label>
        <div class="city-input-wrap"><input id="ph-place" type="text" placeholder="Start typing a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ph-place-list" aria-describedby="ph-place-status">
        <div id="ph-place-list" class="city-suggestions" role="listbox" aria-label="Matching cities" hidden></div></div>
        <p id="ph-place-status" class="city-search-status" role="status"></p>
      </div>
      <button type="submit">Show these hours</button>
    </form>
    <div id="ph-output" class="ph-output" aria-live="polite"></div>
    <p class="ph-footnote">The planetary day runs from sunrise to the next sunrise, so before dawn the hours still belong to the day before. Calculated in your browser; your city is not sent anywhere and is not saved.</p>`;

  // engine: ClassicalEngine. search: BirthplaceSearch. profile: the BirthProfile instance, or
  // null. clock: () => Date. every: (fn, ms) => any, for the once-a-minute refresh.
  function attach(section, {engine, search, profile = null, clock = () => new Date(), every = (fn, ms) => setInterval(fn, ms), doc = section.ownerDocument}) {
    section.innerHTML = shell();
    const $ = selector => section.querySelector(selector);
    const form = $('#ph-form'), dateInput = $('#ph-date'), placeInput = $('#ph-place'), status = $('#ph-place-status'), output = $('#ph-output');
    const picker = search.attach({input: placeInput, list: $('#ph-place-list'), status});
    let place = DEFAULT_PLACE, chosen = false;

    function showPlace(next) {
      place = next;
      placeInput.value = place.label;
      picker.restore(place);
      dateInput.value = dateIn(place.timeZone, clock());
    }
    function draw() {
      const now = clock(), dateString = dateInput.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || dateString < MIN_DATE || dateString > MAX_DATE) {
        output.innerHTML = '<p class="ph-error" role="alert">Choose a date between 1901 and 2100.</p>';
        return;
      }
      const instant = instantFor(dateString, place.timeZone, now);
      output.innerHTML = render(engine.planetaryHours(instant, place), {place, live: instant === now});
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const selection = picker.getSelection();
      if (validPlace(selection)) {
        // Someone looking at today wants today where the new city is, which may be a different date.
        const wasToday = dateInput.value === dateIn(place.timeZone, clock());
        place = selection; chosen = true;
        if (wasToday) dateInput.value = dateIn(place.timeZone, clock());
      }
      else if (placeInput.value.trim() !== place.label) { status.textContent = `Choose a city from the list. Still showing ${place.label}.`; }
      draw();
    });
    dateInput.addEventListener('change', draw);

    // The saved birthplace is the starting point until the visitor picks a city of their own.
    const fromProfile = state => {
      const saved = state && state.profile && state.profile.placeLocation;
      if (chosen || !validPlace(saved)) return;
      showPlace({latitude: saved.latitude, longitude: saved.longitude, timeZone: saved.timeZone, label: saved.label || state.profile.place || 'your birthplace'});
      draw();
    };
    showPlace(DEFAULT_PLACE);
    draw();
    if (profile) profile.subscribe(fromProfile);

    // Keep "the hour now" true in a tab left open; a past or future date never changes.
    every(() => { if (!doc.hidden && dateInput.value === dateIn(place.timeZone, clock())) draw(); }, 60000);
    return {draw, place: () => place};
  }

  if (typeof document !== 'undefined') {
    const section = document.querySelector('#planetary-hours');
    if (section && typeof ClassicalEngine !== 'undefined' && typeof BirthplaceSearch !== 'undefined') {
      attach(section, {engine: ClassicalEngine, search: BirthplaceSearch, profile: typeof BirthProfile !== 'undefined' && BirthProfile.subscribe ? BirthProfile : null});
    }
  }

  return {DEFAULT_PLACE, NOTE, GLYPH, dateIn, noonOn, instantFor, render, attach};
});
