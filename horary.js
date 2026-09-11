/* Horary astrology, as historical practice: a chart cast for the moment a question
   was asked, judged by William Lilly's seventeenth-century rules (Christian Astrology,
   1647) -- considerations before judgment, significators, receptions, aspects and
   perfection, planetary hours, and electing a moment rather than reading one already
   given. This module never tells the reader an outcome; it only renders Lilly's method. */
const Horary = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LONDON = {latitude:51.5085, longitude:-0.1257, timeZone:'Europe/London', label:'London, United Kingdom'};
  const ASPECT_NAMES = {0:'conjunction', 60:'sextile', 90:'square', 120:'trine', 180:'opposition'};
  const ASPECT_SYMBOLS = {0:'☌', 60:'⚹', 90:'□', 120:'△', 180:'☍'};
  const CLASSICAL_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

  const CONVENTIONS = 'Cast at the question’s own moment for Regiomontanus houses, with the seven classical planets and the two lunar nodes only -- no outer planets, as horary predates their discovery. Essential dignity follows rulership, exaltation, the Dorothean triplicities (by sect), Ptolemy’s terms and the Chaldean faces; accidental dignity follows house, motion, and nearness to the Sun. Perfection is tested by a completing aspect before either significator changes sign, by mutual reception, by translation of light, and by collection of light. Planetary hours run from sunrise to sunrise, twelve by day and twelve by night. This is historical method, reconstructed for study -- it renders no verdict on the question actually asked.';
  const conventions = () => `<details class="ho-conventions"><summary>Method &amp; conventions</summary><p>${esc(CONVENTIONS)}</p></details>`;
  const missing = (message, button) => `<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p>${button ? `<button type="button" data-ho-goto-question>Go to the question ↑</button>` : ''}</div>`;
  const fmtScore = n => n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';

  function nowParts(timeZone) {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
      return {date:`${parts.year}-${parts.month}-${parts.day}`, time:`${parts.hour}:${parts.minute}`};
    } catch {
      const d = new Date();
      return {date:`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, time:`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`};
    }
  }

  function houseOptions(selected) {
    return Array.from({length:12}, (_, i) => i + 1).map(h => `<option value="${h}"${h === selected ? ' selected' : ''}>${h}. ${esc(HoraryText.houseMatters[h].title)}</option>`).join('');
  }

  // essentialKeys/accidentalKeys translate an engine dignity's boolean fields into the
  // matching HoraryText.dignity glossary keys, so a card can offer a plain-language
  // expander for exactly the conditions that actually apply to that placement.
  function essentialKeys(e) {
    return ['ruler', 'exaltation', 'triplicity', 'term', 'face', 'detriment', 'fall', 'peregrine'].filter(k => e[k]);
  }
  function accidentalKeys(a) {
    const keys = [];
    if (a.houseClass) keys.push(a.houseClass);
    if (a.motion) keys.push(a.motion);
    if (a.solar) keys.push(a.solar);
    if (a.viaCombusta) keys.push('viaCombusta');
    if (a.increasing === true) keys.push('increasing');
    if (a.increasing === false) keys.push('decreasing');
    return keys;
  }
  function glossary(keys) {
    if (!keys.length) return '';
    return `<details class="ho-glossary"><summary>What these dignities mean</summary>${keys.map(k => `<p><strong>${esc(HoraryText.dignity[k].title)}.</strong> ${esc(HoraryText.dignity[k].text)}</p>`).join('')}</details>`;
  }

  function sigCard(label, sig) {
    const p = sig.point;
    const keys = [...new Set([...essentialKeys(sig.essential), ...accidentalKeys(sig.accidental)])];
    const asSig = HoraryText.planet[sig.planet]?.asSignificator || '';
    return `<article class="ho-sig-card">
      <p class="acg-small-label">${esc(label)}</p>
      <h4>${p.symbol} ${esc(sig.planet)}${p.retrograde ? ' ℞' : ''}</h4>
      <p class="ho-sig-place">${esc(p.sign)} ${esc(p.degrees)} · house ${p.house}</p>
      <p class="ho-sig-why">${esc(sig.why)}${sig.shared ? ' -- shares its significator with the querent.' : ''}</p>
      <dl class="ho-dignity-tally">
        <div><dt>Essential dignity</dt><dd>${esc(sig.essential.words.join(', '))} <span class="ho-tally">${fmtScore(sig.essential.score)}</span></dd></div>
        <div><dt>Accidental dignity</dt><dd>${esc(sig.accidental.words.join(', '))} <span class="ho-tally">${fmtScore(sig.accidental.score)}</span></dd></div>
      </dl>
      <p class="ho-as-sig">${esc(asSig)}</p>
      ${glossary(keys)}
    </article>`;
  }

  function receptionsBlock(receptions) {
    if (!receptions.length) return `<p class="ho-empty">The querent and the quesited share a single significator here, so no reception between them applies.</p>`;
    return `<ul class="ho-receptions">${receptions.map(r => {
      const how = [r.byRulership && 'by rulership', r.byExaltation && 'by exaltation'].filter(Boolean).join(' and ');
      return `<li><strong>${esc(r.from)}</strong> receives <strong>${esc(r.to)}</strong> -- ${r.any ? esc(how) : 'no reception'}</li>`;
    }).join('')}</ul>`;
  }

  function aspectsTable(aspects, chart, shared) {
    const sharedNote = shared ? `<p class="ho-empty">The querent and the quesited share a single significator here, so they form no aspect with each other.</p>` : '';
    if (!aspects.length) return sharedNote || `<p class="ho-empty">The querent and the quesited share a single significator here, so they form no aspect with each other.</p>`;
    const fmt = iso => new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short', timeZone: chart.timeZone}).format(new Date(iso));
    const rows = aspects.map(a => {
      const name = a.aspect === null ? '--' : `${ASPECT_SYMBOLS[a.aspect]} ${ASPECT_NAMES[a.aspect]}${a.partile ? ' (partile)' : ''}`;
      const state = a.aspect === null ? 'out of orb' : a.applying ? 'applying' : 'separating';
      const perfects = a.perfects ? `${fmt(a.perfects)}${a.beforeSignChange === false ? ' (after a sign change)' : ''}` : '--';
      return `<tr><th scope="row">${esc(a.a)} · ${esc(a.b)}</th><td>${esc(a.roles.join(' / '))}</td><td>${name}</td><td>${state}</td><td>${a.orb.toFixed(2)}° / ${a.moiety.toFixed(2)}°</td><td>${perfects}</td></tr>`;
    }).join('');
    return `${sharedNote}<div class="cx-table-wrap"><table><thead><tr><th scope="col">Pair</th><th scope="col">Roles</th><th scope="col">Nearest aspect</th><th scope="col">Motion</th><th scope="col">Orb / moiety</th><th scope="col">Perfects</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function perfectionBlock(perfection) {
    const items = [];
    if (perfection.byAspect) items.push(HoraryText.perfection.byAspect);
    if (perfection.byReception) items.push(HoraryText.perfection.byReception);
    if (perfection.translation) items.push({...HoraryText.perfection.translation, note:`${esc(perfection.translation.planet)} separating from ${esc(perfection.translation.from)} and applying next to ${esc(perfection.translation.to)}.`});
    if (perfection.collection) items.push({...HoraryText.perfection.collection, note:`${esc(perfection.collection.planet)} receives the application of both significators.`});
    if (!items.length) items.push(HoraryText.perfection.none);
    return items.map(item => `<div class="ho-perfection-item"><h5>${esc(item.title)}</h5><p>${esc(item.text)}</p>${item.note ? `<p class="ho-perfection-note">${item.note}</p>` : ''}</div>`).join('');
  }

  function moonBlock(moon) {
    const bits = [
      moon.voidOfCourse ? 'The Moon is void of course: she perfects no further aspect before leaving her sign.' : `The Moon next perfects a ${esc(ASPECT_NAMES[moon.nextAspect.aspect])} with ${esc(moon.nextAspect.planet)}.`,
      moon.viaCombusta ? 'She is passing through the via combusta.' : '',
      moon.increasing ? 'She is increasing in light.' : 'She is decreasing in light.',
    ];
    return `<p class="ho-moon-note">${bits.filter(Boolean).join(' ')}</p>`;
  }

  function attach(root) {
    root.innerHTML = `<header class="ho-heading"><p class="acg-eyebrow">Horary astrology · a historical practice</p><h3>The chart cast for the question itself.</h3><p>Horary astrology reads a chart cast for the exact moment a question was asked, treating that instant as a figure to be reasoned through by rule. Ask a question, choose the house of the matter, and cast a chart for right now -- or for any other place and moment.</p></header>
      <blockquote class="ho-banner">${esc(HoraryText.banner)}</blockquote>
      <div class="ho-tabs" role="group" aria-label="Horary views">
        <button type="button" data-ho-tab="question" aria-controls="ho-question" aria-pressed="true"><span>❖</span>The question<small>Chart &amp; considerations</small></button>
        <button type="button" data-ho-tab="significators" aria-controls="ho-significators" aria-pressed="false"><span>☌</span>Significators<small>Receptions &amp; perfection</small></button>
        <button type="button" data-ho-tab="hours" aria-controls="ho-hours" aria-pressed="false"><span>☉</span>Planetary hours<small>Sunrise to sunrise</small></button>
        <button type="button" data-ho-tab="elect" aria-controls="ho-elect" aria-pressed="false"><span>✦</span>Elect a moment<small>Choosing, not reading</small></button>
      </div>
      <section id="ho-question" class="ho-view">
        <form id="ho-question-form" class="ho-question-form">
          <label class="ho-question-field"><span>Your question <small>stays on this page only, never saved</small></span><textarea id="ho-question-text" rows="2" maxlength="400" placeholder="What is the question?"></textarea></label>
          <label>House of the matter<select id="ho-house-matter">${houseOptions(7)}</select></label>
          <label>Date<input id="ho-date" type="date" min="1901-01-01" max="2100-12-31" required></label>
          <label>Time<input id="ho-time" type="time" required></label>
          <div class="birthplace-field">
            <label for="ho-place"><span>Place the question was asked</span></label>
            <div class="city-input-wrap"><input id="ho-place" type="text" placeholder="Start typing a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ho-place-list" aria-describedby="ho-place-status">
            <div id="ho-place-list" class="city-suggestions" role="listbox" aria-label="Matching cities" hidden></div></div>
            <p id="ho-place-status" class="city-search-status" role="status">Choose a city, or keep the default place.</p>
          </div>
          <details class="ho-custom-place"><summary>Use coordinates for an unlisted place</summary>
            <label class="ho-manual-toggle"><input type="checkbox" id="ho-manual"> Use these coordinates</label>
            <fieldset id="ho-manual-fields" disabled>
              <label>Latitude <small>north + / south −</small><input id="ho-lat" type="number" min="-89.9999" max="89.9999" step="any" required></label>
              <label>Longitude <small>east + / west −</small><input id="ho-lon" type="number" min="-180" max="180" step="any" required></label>
              <label>IANA time zone<input id="ho-zone" type="text" list="birth-timezones" placeholder="e.g. Europe/London" required></label>
            </fieldset>
          </details>
          <button type="submit" id="ho-cast-btn" class="ho-primary">Cast the chart</button>
        </form>
        <p id="ho-cast-status" class="ho-status" role="status" aria-live="polite"></p>
        <div id="ho-question-output" aria-live="polite"></div>
      </section>
      <section id="ho-significators" class="ho-view" hidden aria-live="polite"></section>
      <section id="ho-hours" class="ho-view" hidden aria-live="polite"></section>
      <section id="ho-elect" class="ho-view" hidden>
        <div class="ho-view-heading"><div><p class="acg-small-label">Elect a moment</p><h4>Choosing a time, not reading one already given.</h4></div></div>
        <form id="ho-elect-form" class="ho-elect-form">
          <label>Date<input id="ho-elect-date" type="date" min="1901-01-01" max="2100-12-31" required></label>
          <label>Time<input id="ho-elect-time" type="time" required></label>
          <button type="submit" id="ho-elect-btn" class="ho-primary">Elect this moment</button>
        </form>
        <p id="ho-elect-place" class="ho-elect-place"></p>
        <p id="ho-elect-status" class="ho-status" role="status" aria-live="polite"></p>
        <div id="ho-elect-output" aria-live="polite"></div>
      </section>`;

    const $ = selector => root.querySelector(selector);
    const placePicker = BirthplaceSearch.attach({input:$('#ho-place'), list:$('#ho-place-list'), status:$('#ho-place-status')});
    let chart = null, manualLocation = null, result = null, electResult = null, tab = 'question';
    let dateTouched = false, electDateTouched = false;

    function placeholderLocation() { return chart?.location || LONDON; }
    function chosenPlace() { return manualLocation || placePicker.getSelection(); }
    function place() { return chosenPlace() || placeholderLocation(); }

    function refreshPlaceDefault() {
      if (chosenPlace()) return;
      const loc = placeholderLocation();
      $('#ho-place').value = loc.label || '';
      $('#ho-place-status').textContent = chart?.location
        ? `Using your birth place · ${loc.label}. Search above to cast for somewhere else.`
        : `Defaulting to London -- Lilly’s own city. Search above for another place, or add your birth details.`;
    }

    function resolvedLocation() {
      if ($('#ho-manual').checked) {
        const latText = $('#ho-lat').value.trim(), lonText = $('#ho-lon').value.trim(), timeZone = $('#ho-zone').value.trim();
        const latitude = Number(latText), longitude = Number(lonText);
        if (!latText || !lonText || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 90 || Math.abs(longitude) > 180 || !timeZone) {
          return {error:'Enter a latitude, a longitude and an IANA time zone.'};
        }
        return {location:{latitude, longitude, timeZone, label: `Custom coordinates (${latitude}, ${longitude})`, source:'manual'}};
      }
      return {location: place()};
    }

    function renderElectPlace() {
      $('#ho-elect-place').textContent = `Cast for ${place().label || 'the selected place'} -- the same place chosen on the question tab.`;
    }

    function renderQuestionOutput() {
      const output = $('#ho-question-output');
      if (!result) { output.innerHTML = ''; return; }
      const houseInfo = HoraryText.houseMatters[result.houseMatter];
      const hourLine = result.hour.status === 'ready'
        ? `${result.sect === 'day' ? 'Day' : 'Night'} chart · hour ${result.hour.current + 1} of 24, ruled by ${esc(result.hour.hours[result.hour.current]?.ruler || 'an hour outside the table')} · ${esc(result.hour.weekday)}, the day of ${esc(result.hour.dayRuler)}`
        : esc(result.hour.message);
      const questionText = $('#ho-question-text').value.trim();
      output.innerHTML = `<div class="ho-wheel-wrap">${HoraryChart.render({chart: result.chart, title:'The horary chart'})}</div>
        ${questionText ? `<p class="ho-question-echo">“${esc(questionText)}”</p>` : ''}
        <p class="ho-hour-line">${hourLine}</p>
        <p class="acg-small-label">House ${result.houseMatter} · ${esc(houseInfo.title)}</p>
        <p class="ho-house-lilly">${esc(houseInfo.lilly)}</p>
        <h4 class="acg-small-label">Considerations before judgment</h4>
        <div class="ho-considerations">${result.considerations.map(c => {
          const text = HoraryText.considerations[c.key];
          const body = c.present === null ? `Undetermined here: ${esc(c.detail)}.` : esc(c.present ? text.present : text.absent);
          return `<div class="ho-consideration${c.present ? ' is-present' : ''}"><h5>${esc(text.title)}</h5><p>${body}</p>${c.present === null ? '' : `<small>${esc(c.detail)}</small>`}</div>`;
        }).join('')}</div>
        ${conventions()}`;
    }

    function renderSignificators() {
      const output = $('#ho-significators');
      if (!result) { output.innerHTML = missing('Cast the chart on the question tab to see its significators.', true); return; }
      const sig = result.significators;
      output.innerHTML = `<div class="ho-sig-cards">
          ${sigCard('Querent', sig.querent)}
          ${sigCard(`Quesited · house ${result.houseMatter}`, sig.quesited)}
          ${sigCard('The Moon', sig.moon)}
        </div>
        <p class="ho-closing">${esc(HoraryText.closing)}</p>
        <p class="acg-small-label">Receptions</p>
        ${receptionsBlock(result.receptions)}
        <p class="acg-small-label">Aspects between the significators</p>
        ${aspectsTable(result.aspects, result.chart, sig.quesited.planet === sig.querent.planet)}
        <p class="acg-small-label">Perfection</p>
        ${perfectionBlock(result.perfection)}
        <p class="acg-small-label">The Moon’s condition</p>
        ${moonBlock(result.moon)}
        ${conventions()}`;
    }

    function renderHours() {
      const output = $('#ho-hours');
      if (!result) { output.innerHTML = missing('Cast the chart on the question tab to see its planetary hours.', true); return; }
      const hour = result.hour;
      if (hour.status !== 'ready') { output.innerHTML = `<p class="cx-error" role="alert">${esc(hour.message)}</p>`; return; }
      const fmtTime = iso => new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit', timeZone: result.chart.timeZone}).format(new Date(iso));
      const rows = hour.hours.map((h, i) => `<tr${i === hour.current ? ' aria-current="true"' : ''}><th scope="row">${h.index}</th><td>${h.isDay ? 'Day' : 'Night'}</td><td>${esc(h.ruler)}</td><td>${fmtTime(h.start)}</td><td>${fmtTime(h.end)}</td></tr>`).join('');
      output.innerHTML = `<p class="ho-hour-summary">${esc(hour.weekday)}, ruled by ${esc(hour.dayRuler)} · sunrise ${fmtTime(hour.sunrise)} · sunset ${fmtTime(hour.sunset)}</p>
        <div class="cx-table-wrap"><table><thead><tr><th scope="col">Hour</th><th scope="col">Day/night</th><th scope="col">Ruler</th><th scope="col">Starts</th><th scope="col">Ends</th></tr></thead><tbody>${rows}</tbody></table></div>
        <blockquote>${esc(HoraryText.hours)}</blockquote>
        ${conventions()}`;
    }

    function renderElectOutput() {
      const output = $('#ho-elect-output');
      if (!electResult) { output.innerHTML = ''; return; }
      const chartR = electResult.chart, sect = electResult.sect, hour = electResult.hour, moon = electResult.moon;
      const hourLine = hour.status === 'ready'
        ? `${sect === 'day' ? 'Day' : 'Night'} chart · hour of ${esc(hour.hours[hour.current]?.ruler || 'an hour outside the table')} · ${esc(hour.weekday)}`
        : esc(hour.message);
      const rows = CLASSICAL_PLANETS.map(name => {
        const point = chartR.points.find(p => p.name === name);
        const e = ClassicalEngine.dignities(name, point.longitude, sect);
        const a = ClassicalEngine.accidental(point, chartR);
        return `<tr><th scope="row">${point.symbol} ${esc(name)}${point.retrograde ? ' ℞' : ''}</th><td>${esc(point.sign)} ${esc(point.degrees)}</td><td>${point.house}</td><td>${esc(e.words.join(', '))}</td><td>${fmtScore(e.score)}</td><td>${esc(a.words.join(', '))}</td></tr>`;
      }).join('');
      output.innerHTML = `<div class="ho-wheel-wrap">${HoraryChart.render({chart: chartR, title:'The elected chart'})}</div>
        <p class="ho-hour-line">${hourLine}</p>
        ${moonBlock(moon)}
        <p class="acg-small-label">Dignity of the seven classical planets</p>
        <div class="cx-table-wrap"><table><thead><tr><th scope="col">Planet</th><th scope="col">Sign</th><th scope="col">House</th><th scope="col">Essential dignity</th><th scope="col">Score</th><th scope="col">Condition</th></tr></thead><tbody>${rows}</tbody></table></div>
        <blockquote>${esc(HoraryText.electional)}</blockquote>
        ${conventions()}`;
    }

    function renderActiveTab() {
      if (tab === 'question') renderQuestionOutput();
      else if (tab === 'significators') renderSignificators();
      else if (tab === 'hours') renderHours();
      else if (tab === 'elect') { renderElectPlace(); renderElectOutput(); }
    }

    function selectTab(name) {
      tab = name;
      root.querySelectorAll('[data-ho-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hoTab === tab)));
      root.querySelectorAll('.ho-view').forEach(panel => panel.hidden = panel.id !== `ho-${tab}`);
      renderActiveTab();
    }

    function castQuestion() {
      const resolved = resolvedLocation();
      if (resolved.error) { $('#ho-cast-status').textContent = resolved.error; return; }
      const location = resolved.location;
      const dateValue = $('#ho-date').value, timeValue = $('#ho-time').value, houseMatterValue = Number($('#ho-house-matter').value);
      let candidates;
      try { candidates = NatalEngine.localTimeCandidates(dateValue, timeValue, location.timeZone); }
      catch (error) { $('#ho-cast-status').textContent = error.message; return; }
      if (!candidates.length) { $('#ho-cast-status').textContent = 'That local clock time did not occur because the clocks moved forward. Check the date and time.'; return; }
      const dstNote = candidates.length > 1 ? ' This clock time occurred twice as daylight saving ended; using the earlier occurrence.' : '';
      const instant = candidates[0].utc;
      $('#ho-cast-btn').disabled = true;
      $('#ho-cast-status').textContent = 'Casting…';
      $('#ho-question-output').innerHTML = '<p class="ho-casting">Casting the chart…</p>';
      requestAnimationFrame(() => setTimeout(() => {
        try {
          const cast = HoraryEngine.cast({date: instant, location, houseMatter: houseMatterValue});
          if (cast.status !== 'ready') { result = null; $('#ho-cast-status').textContent = cast.message; }
          else { result = cast; $('#ho-cast-status').textContent = `Chart cast for ${location.label || 'the selected place'}.${dstNote}`; }
        } catch (error) {
          result = null; $('#ho-cast-status').textContent = error.message || 'Could not cast this chart.';
        }
        $('#ho-cast-btn').disabled = false;
        renderQuestionOutput();
        if (tab === 'significators') renderSignificators();
        if (tab === 'hours') renderHours();
      }, 0));
    }

    function castElect() {
      const loc = place();
      const dateValue = $('#ho-elect-date').value, timeValue = $('#ho-elect-time').value;
      let candidates;
      try { candidates = NatalEngine.localTimeCandidates(dateValue, timeValue, loc.timeZone); }
      catch (error) { $('#ho-elect-status').textContent = error.message; return; }
      if (!candidates.length) { $('#ho-elect-status').textContent = 'That local clock time did not occur because the clocks moved forward. Check the date and time.'; return; }
      const dstNote = candidates.length > 1 ? ' This clock time occurred twice as daylight saving ended; using the earlier occurrence.' : '';
      const instant = candidates[0].utc;
      $('#ho-elect-btn').disabled = true;
      $('#ho-elect-status').textContent = 'Casting…';
      $('#ho-elect-output').innerHTML = '<p class="ho-casting">Casting…</p>';
      requestAnimationFrame(() => setTimeout(() => {
        try {
          const cast = HoraryEngine.cast({date: instant, location: loc, houseMatter: 1});
          if (cast.status !== 'ready') { electResult = null; $('#ho-elect-status').textContent = cast.message; }
          else { electResult = cast; $('#ho-elect-status').textContent = `Elected for ${loc.label || 'the selected place'}.${dstNote}`; }
        } catch (error) {
          electResult = null; $('#ho-elect-status').textContent = error.message || 'Could not read this moment.';
        }
        $('#ho-elect-btn').disabled = false;
        renderElectOutput();
      }, 0));
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      const data = button.dataset;
      if ('hoTab' in data) selectTab(data.hoTab);
      if ('hoGotoQuestion' in data) { selectTab('question'); $('#ho-question-text').focus(); }
    });

    root.addEventListener('change', event => {
      if (event.target.id === 'ho-manual') $('#ho-manual-fields').disabled = !event.target.checked;
    });
    root.addEventListener('input', event => {
      if (event.target.id === 'ho-date' || event.target.id === 'ho-time') dateTouched = true;
      if (event.target.id === 'ho-elect-date' || event.target.id === 'ho-elect-time') electDateTouched = true;
    });

    $('#ho-question-form').addEventListener('submit', event => { event.preventDefault(); castQuestion(); });
    $('#ho-elect-form').addEventListener('submit', event => { event.preventDefault(); castElect(); });

    refreshPlaceDefault();
    const initial = nowParts(placeholderLocation().timeZone);
    $('#ho-date').value = initial.date; $('#ho-time').value = initial.time;
    $('#ho-elect-date').value = initial.date; $('#ho-elect-time').value = initial.time;
    renderElectPlace();

    return {
      setBirthChart(value) {
        chart = value?.status === 'ready' ? value : null;
        refreshPlaceDefault();
        if (!chosenPlace()) {
          const p = nowParts(placeholderLocation().timeZone);
          if (!dateTouched) { $('#ho-date').value = p.date; $('#ho-time').value = p.time; }
          if (!electDateTouched) { $('#ho-elect-date').value = p.date; $('#ho-elect-time').value = p.time; }
        }
        if (tab === 'elect') renderElectPlace();
      },
    };
  }
  return {attach};
})();
