/* The twenty-eight mansions of the Moon on /sky/: which one the Moon is in now, when it entered
   and when it leaves, the mansion of a saved birth Moon, and the whole list.

   Names, glosses and the uses tradition assigned are from Agrippa, Three Books of Occult
   Philosophy, book II chapter 33 (1533; English 1651). The spellings are the 1651 text's; the
   notes are short summaries written for this site, not quotations. The Arabic names are the
   standard ones for the same twenty-eight manazil.

   Convention: twenty-eight equal parts of 12°51'26" counted from 0° Aries of the tropical
   zodiac, the usual modern reading of Agrippa's "head of Aries". The mansions were first tied
   to the stars they are named for, which have drifted about 24° later since late antiquity. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LunarMansions = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const sky = typeof SkyCalendarEngine !== 'undefined' ? SkyCalendarEngine : require('./sky-calendar-engine.js');

  const COUNT = 28, SPAN = 360 / COUNT;
  // [Agrippa's name, his alternative, his gloss, Arabic name, what tradition assigned to it]
  const MANSIONS = [
    ['Alnath', '', 'the horns of Aries', 'al-Sharaṭān', 'Journeys, and discord between people.'],
    ['Allothaim', 'Albochan', 'the belly of Aries', 'al-Buṭayn', 'Finding treasure, and holding captives.'],
    ['Achaomazon', 'Athoray', 'the Pleiades', 'al-Thurayyā', 'Good fortune for sailors, hunters and alchemists.'],
    ['Aldebaram', 'Aldelamen', 'the eye of Taurus', 'al-Dabarān', 'The ruin of buildings, wells and mines, and discord.'],
    ['Alchatay', 'Albachay', '', 'al-Haqʿa', 'A safe return from a journey, the teaching of students, sound buildings, health and goodwill.'],
    ['Alhanna', 'Alchaya', 'the little star of great light', 'al-Hanʿa', 'Hunting, sieges and the revenge of princes; harm to harvests and to physicians’ work.'],
    ['Aldimiach', 'Alarzach', 'the arm of Gemini', 'al-Dhirāʿ', 'Gain, friendship and lovers.'],
    ['Alnaza', 'Anatrachya', 'misty or cloudy', 'al-Nathra', 'Love, friendship and company on the road; harder confinement for captives.'],
    ['Archaam', 'Arcaph', 'the eye of the Lion', 'al-Ṭarf', 'Harm to harvests and travellers, and discord between people.'],
    ['Algelioche', 'Albgebh', 'the forehead of Leo', 'al-Jabha', 'Strong buildings, love, goodwill and help against enemies.'],
    ['Azobra', 'Ardaf', 'the hair of the Lion’s head', 'al-Zubra', 'Voyages, profit in trade, and the ransom of captives.'],
    ['Alzarpha', 'Azarpha', 'the tail of Leo', 'al-Ṣarfa', 'Harvests and planting, and the lot of servants and captives; a hindrance to sailors.'],
    ['Alhaire', '', 'the wings of Virgo', 'al-ʿAwwāʾ', 'Goodwill, gain, voyages, harvests and the freeing of captives.'],
    ['Achureth', 'Arimet', 'the spike of Virgo', 'al-Simāk', 'The cure of the sick and good sailing; a hindrance to journeys by land.'],
    ['Agrapha', 'Algarpha', 'covered', 'al-Ghafr', 'Digging wells and finding treasure; also divorce, discord and the ruin of houses and enemies.'],
    ['Azubene', 'Ahubene', 'the horns of Scorpio', 'al-Zubānā', 'A hindrance to journeys, marriage, harvests and trade; the ransom of captives.'],
    ['Alchil', '', 'the crown of Scorpio', 'al-Iklīl', 'Mending bad fortune, lasting love, strong buildings and safe sailing.'],
    ['Alchas', 'Altob', 'the heart of Scorpio', 'al-Qalb', 'Discord, sedition and conspiracy against rulers; also the freeing of captives.'],
    ['Allatha', 'Achala', 'the tail of Scorpio', 'al-Shawla', 'Sieges and the taking of cities; ruin for sailors and captives.'],
    ['Abnahaya', '', 'a beam', 'al-Naʿāʾim', 'Taming wild animals and strengthening prisons; the loss of shared wealth.'],
    ['Abeda', 'Albeldach', 'a desert', 'al-Balda', 'Harvests, gain, buildings and travellers; also divorce.'],
    ['Sadahacha', 'Zodeboluch', 'a shepherd', 'Saʿd al-Dhābiḥ', 'The escape of servants and captives, and the cure of illness.'],
    ['Zabadola', 'Zobrach', 'swallowing', 'Saʿd Bulaʿ', 'Divorce, the freedom of captives, and the health of the sick.'],
    ['Sadabath', 'Chadezoad', 'the star of fortune', 'Saʿd al-Suʿūd', 'Goodwill between married people and victory for soldiers; a hindrance to those who govern.'],
    ['Sadalabra', 'Sadalachia', 'a butterfly, or a spreading forth', 'Saʿd al-Akhbiya', 'Sieges and revenge, divorce, strong prisons and buildings, and swift messengers.'],
    ['Alpharg', 'Phragal Mocaden', 'the first drawing', 'al-Fargh al-Muqaddam', 'Union and love between people, and the health of captives; the ruin of prisons and buildings.'],
    ['Alcharya', 'Alhalgalmoad', 'the second drawing', 'al-Fargh al-Muʾakhkhar', 'Harvests, income and healing; a hindrance to building, long imprisonment, and danger at sea.'],
    ['Albotham', 'Alchalcy', 'the Fish', 'Baṭn al-Ḥūt', 'Harvests and trade, safe travel and married happiness; strong prisons, and the loss of treasure.']
  ].map(([name, alternative, gloss, arabic, note], index) => ({number: index + 1, name, alternative, gloss, arabic, note, start: index * SPAN, end: (index + 1) * SPAN}));

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  // Which mansion an ecliptic longitude falls in, and how far through it (0 to 1).
  function mansionOf(longitude) {
    const l = natal.mod(longitude), index = Math.min(COUNT - 1, Math.floor(l / SPAN));
    return {mansion: MANSIONS[index], fraction: (l - index * SPAN) / SPAN};
  }
  // A longitude as degrees and minutes within its sign: 12°51′ Aries.
  function position(longitude) {
    const total = Math.floor(natal.mod(longitude) * 60 + 1e-6) % 21600, sign = Math.floor(total / 1800), within = total - sign * 1800;
    return `${Math.floor(within / 60)}°${String(within % 60).padStart(2, '0')}′ ${natal.signNames[sign]}`;
  }

  // The Moon's mansion at an instant, with the moments it crossed in and will cross out. The
  // Moon takes between about 21 and 26 hours over one mansion, so a day and a half brackets
  // either crossing with room to spare and never reaches a second one.
  function moonNow(date) {
    if (!sky.inRange(date)) return {status: 'out-of-range'};
    const t = astro.MakeTime(date), longitude = sky.lonOf('Moon', t), {mansion, fraction} = mansionOf(longitude);
    const crossing = (boundary, from, to) => astro.Search(time => natal.delta(sky.lonOf('Moon', time), boundary), from, to, {dt_tolerance_seconds: 1});
    const entered = crossing(mansion.start, t.AddDays(-1.5), t), leaves = crossing(mansion.end, t, t.AddDays(1.5));
    return {status: 'ready', longitude, mansion, fraction,
      entered: entered ? entered.date.toISOString() : null, leaves: leaves ? leaves.date.toISOString() : null,
      next: MANSIONS[mansion.number % COUNT]};
  }

  const title = m => `${esc(m.name)}${m.alternative ? ` <span class="lm-alt">or ${esc(m.alternative)}</span>` : ''}`;
  const when = iso => new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(iso));

  function renderNow(result) {
    if (result.status !== 'ready') return '<p class="lm-error" role="alert">The mansions are calculated for dates between 1901 and 2100.</p>';
    const m = result.mansion;
    return `<div class="lm-now">
        <p class="lm-label">The Moon is in mansion ${m.number} of 28</p>
        <p class="lm-now-name">${title(m)}</p>
        <p class="lm-now-gloss">${m.gloss ? `${esc(m.gloss[0].toUpperCase() + m.gloss.slice(1))} · ` : ''}${esc(m.arabic)} · ${position(m.start)} to ${position(m.end)}</p>
        <p class="lm-note"><span>In the tradition:</span> ${esc(m.note)}</p>
        <p class="lm-times">${result.entered ? `Entered ${esc(when(result.entered))}` : ''}${result.entered && result.leaves ? ' · ' : ''}${result.leaves ? `leaves for ${esc(result.next.name)} ${esc(when(result.leaves))}` : ''} · the Moon is at ${position(result.longitude)} · times in your own zone</p>
      </div>`;
  }
  // `timed` is false when the birth profile has no birth time, so the chart was cast for noon.
  function renderBirth(longitude, timed) {
    const {mansion: m} = mansionOf(longitude);
    return `<div class="lm-birth">
        <p class="lm-label">Your birth Moon</p>
        <p class="lm-birth-name">Mansion ${m.number}, ${title(m)}</p>
        <p class="lm-note"><span>In the tradition:</span> ${esc(m.note)}</p>
        <p class="lm-times">Your Moon is at ${position(longitude)}.${timed ? '' : ' No birth time is saved, so this is the Moon at noon; it moves about half a mansion in twelve hours and may belong to a neighbour.'}</p>
      </div>`;
  }
  function renderList(currentNumber) {
    return `<ol class="lm-list">${MANSIONS.map(m => `<li${m.number === currentNumber ? ' aria-current="true"' : ''}>
        <span class="lm-number">${m.number}</span>
        <div><p class="lm-name">${title(m)}</p>
        <p class="lm-meta">${m.gloss ? `${esc(m.gloss)} · ` : ''}${esc(m.arabic)} · from ${position(m.start)}</p>
        <p class="lm-given">${esc(m.note)}</p></div></li>`).join('')}</ol>`;
  }

  const shell = () => `<div class="lm-heading">
      <p class="section-kicker">Mansions of the Moon</p>
      <h3 id="lunar-mansions-title">Twenty-eight stations on the Moon’s road</h3>
      <p>The Moon circles the zodiac in a little over twenty-seven days, and Arabic astronomy divided its road into twenty-eight mansions, the <i>manāzil al-qamar</i>, roughly one for each night. They reached Europe through the <cite>Picatrix</cite>, and this list follows Agrippa’s <cite>Three Books of Occult Philosophy</cite> (1533), book II, chapter 33. What each mansion was “good for” is reported here as history; several were given to harm, and none of it is advice.</p>
    </div>
    <div id="lm-now" aria-live="polite"></div>
    <div id="lm-birth"></div>
    <h4 class="lm-list-title">All twenty-eight</h4>
    <div id="lm-list"></div>
    <p class="lm-footnote">Each mansion is 12°51′26″ of the zodiac, counted from 0° Aries, which is how Agrippa’s “head of Aries” is usually read today. The mansions were first marked by the stars they are named for, and those stars have drifted about 24° later since late antiquity, so the Moon will not be standing beside the Pleiades when it is in mansion 3. These are a different system from the twenty-seven nakshatras on the <a href="/eastern/#jyotish">Jyotish page</a>, which are measured against the stars. Calculated in your browser.</p>`;

  // profile: the BirthProfile instance, or null. clock: () => Date. every: (fn, ms) => any.
  function attach(section, {profile = null, clock = () => new Date(), every = (fn, ms) => setInterval(fn, ms), doc = section.ownerDocument} = {}) {
    section.innerHTML = shell();
    const $ = selector => section.querySelector(selector);
    let shown = 0;
    function draw() {
      const result = moonNow(clock());
      $('#lm-now').innerHTML = renderNow(result);
      const number = result.status === 'ready' ? result.mansion.number : 0;
      // The list only changes when the Moon changes mansion, about once a day.
      if (number !== shown) { $('#lm-list').innerHTML = renderList(number); shown = number; }
    }
    draw();
    if (profile) profile.subscribe(state => {
      const moon = state && state.natal && Array.isArray(state.natal.points) ? state.natal.points.find(p => p.name === 'Moon') : null;
      $('#lm-birth').innerHTML = moon && Number.isFinite(moon.longitude) ? renderBirth(moon.longitude, !!(state.profile && state.profile.time)) : '';
    });
    every(() => { if (!doc.hidden) draw(); }, 60000);
    return {draw};
  }

  if (typeof document !== 'undefined') {
    const section = document.querySelector('#lunar-mansions');
    if (section) attach(section, {profile: typeof BirthProfile !== 'undefined' && BirthProfile.subscribe ? BirthProfile : null});
  }

  return {COUNT, SPAN, MANSIONS, mansionOf, position, moonNow, renderNow, renderBirth, renderList, attach};
});
