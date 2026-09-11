/* Solar returns, lunar returns and progressed charts. */
const ChartInTime = (() => {
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = {birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const readable = iso => new Date(iso).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}) + ' UTC';

  function attach(root) {
    root.innerHTML = `<header class="cit-heading"><p class="acg-eyebrow">Your chart in time</p><h3>The same sky, read across a life.</h3><p>A year framed by the Sun's return, a month framed by the Moon's, and the slow chart that moves a degree at a time.</p></header>
      <div class="cit-tabs" role="group" aria-label="Chart in time views">
        <button type="button" data-cit-tab="solar" aria-controls="cit-solar" aria-pressed="true"><span>☉</span>Your year ahead<small>Solar return</small></button>
        <button type="button" data-cit-tab="lunar" aria-controls="cit-lunar" aria-pressed="false"><span>☾</span>Your month<small>Lunar return</small></button>
        <button type="button" data-cit-tab="progressed" aria-controls="cit-progressed" aria-pressed="false"><span>⟳</span>The slow chart<small>Progressions &amp; directions</small></button>
      </div>
      <div class="cx-profile-bar"><p class="cit-profile-status">Use your birth details above to make these charts personal.</p><button type="button" data-cit-sample>Try a sample chart</button></div>
      <form id="cit-place-form" class="cit-place-form">
        <div class="birthplace-field">
          <label for="cit-place"><span>Where you expect to be <small>for return charts</small></span></label>
          <div class="city-input-wrap"><input id="cit-place" type="text" placeholder="Start typing a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cit-place-list" aria-describedby="cit-place-status">
          <div id="cit-place-list" class="city-suggestions" role="listbox" aria-label="Matching cities" hidden></div></div>
          <p id="cit-place-status" class="city-search-status" role="status">Choose a city, or keep your birthplace.</p>
        </div>
        <details class="cit-custom-place"><summary>Use coordinates for an unlisted place</summary>
          <label class="cit-manual-toggle"><input type="checkbox" id="cit-manual"> Use these coordinates</label>
          <fieldset id="cit-manual-fields" disabled>
            <label>Latitude <small>north + / south −</small><input id="cit-lat" type="number" min="-89.9999" max="89.9999" step="any"></label>
            <label>Longitude <small>east + / west −</small><input id="cit-lon" type="number" min="-180" max="180" step="any"></label>
            <label>IANA time zone<input id="cit-zone" type="text" list="birth-timezones" placeholder="e.g. Europe/London"></label>
          </fieldset>
        </details>
        <button type="submit" class="cit-primary">Update return charts</button>
        <button type="button" data-cit-place-reset>Use my birthplace</button>
      </form>
      <section id="cit-solar" class="cit-view"><div class="cit-view-heading"><div><p class="acg-small-label">Solar return</p><h4>The year the Sun begins again.</h4></div><div class="cit-nav" role="group" aria-label="Choose a return"><button type="button" data-cit-step="-1" aria-label="Previous year">←</button><output id="cit-solar-label" aria-live="polite"></output><button type="button" data-cit-step="1" aria-label="Next year">→</button><button type="button" data-cit-now>This year</button></div></div><div id="cit-solar-output" aria-live="polite"></div></section>
      <section id="cit-lunar" class="cit-view" hidden><div class="cit-view-heading"><div><p class="acg-small-label">Lunar return</p><h4>The month the Moon begins again.</h4></div><div class="cit-nav" role="group" aria-label="Choose a return"><button type="button" data-cit-step="-1" aria-label="Previous return">←</button><output id="cit-lunar-label" aria-live="polite"></output><button type="button" data-cit-step="1" aria-label="Next return">→</button><button type="button" data-cit-now>Now</button></div></div><div id="cit-lunar-output" aria-live="polite"></div></section>
      <section id="cit-progressed" class="cit-view" hidden><div id="cit-progressed-output" aria-live="polite"></div></section>`;

    const $ = selector => root.querySelector(selector);
    const placePicker = BirthplaceSearch.attach({input:$('#cit-place'), list:$('#cit-place-list'), status:$('#cit-place-status')});
    let savedChart=null, chart=null, usingSample=false, tab='solar', manualLocation=null;
    const offsets = {solar:0, lunar:0};
    const missing = message => `<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p><button type="button" data-cit-birth>Add birth details ↑</button></div>`;

    // BirthplaceSearch sets input.value programmatically when a suggestion is
    // chosen, which fires no change event, so the selection is read on demand
    // rather than cached from an event. getSelection() self-invalidates when the
    // input text no longer matches the chosen city.
    function place() { return manualLocation || placePicker.getSelection() || chart?.location || null; }
    function chosenPlace() { return manualLocation || placePicker.getSelection(); }

    function profileStatus() {
      $('.cit-profile-status').textContent = usingSample
        ? 'Sample chart · illustrative birth details, not your personal chart.'
        : chart ? `Your birth sky · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}`
        : 'Use your birth details above to make these charts personal.';
      $('[data-cit-sample]').textContent = usingSample ? 'Use my profile' : 'Try a sample chart';
    }

    function renderReturn(kind) {
      const output = $(`#cit-${kind}-output`);
      // Solar and lunar each carry their own label element.
      const label = $(`#cit-${kind}-label`);
      const model = ChartInTimeEngine.returnChart({chart, kind, location:place(), index:offsets[kind], reference:new Date()});
      // A previously chosen year must not linger beside an empty or failed state.
      if (model.status === 'missing') { if (label) label.textContent = ''; output.innerHTML = missing(model.message); return; }
      if (model.status === 'error') { if (label) label.textContent = ''; output.innerHTML = `<p class="cx-error" role="alert">${esc(model.message)}</p>`; return; }
      const text = ChartInTimeText.method[kind];
      // The lunar return reads the Moon's house, and must use the Moon's own
      // text table — the solar wording is about a year and about identity.
      const sun = model.chart.points.find(point => point.name === (kind === 'solar' ? 'Sun' : 'Moon'));
      const house = (kind === 'solar' ? ChartInTimeText.returnSunHouse : ChartInTimeText.returnMoonHouse)[sun.house];
      const rising = ChartInTimeText.returnAscendant[model.chart.axes[0].sign];
      if (kind === 'solar') label.textContent = new Date(model.moment).getUTCFullYear();
      else label.textContent = new Date(model.moment).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
      output.innerHTML = `<p class="cit-moment">${usingSample?'Sample · ':''}Exact return: <strong>${esc(readable(model.moment))}</strong> · cast for ${esc(place().label || 'the selected place')}</p>
        <div class="cx-comparison"><div class="cx-chart-art">${BiWheel.render({inner:model.natalPoints, outer:model.chart.points.filter(p=>p.kind==='planet'), contact:null, labels:['Birth sky','Return chart'], centerSymbol:kind==='solar'?'☉':'☾', centerLabel:text.label.toUpperCase()})}<p class="cx-ring-key"><span>Birth sky</span><span>Return chart</span></p></div>
        <div class="cit-reading"><p class="acg-small-label">Return ${esc(sun.name)} in house ${sun.house}</p><h5>${esc(house.title)}</h5><p>${esc(house.body)}</p><blockquote>${esc(house.prompt)}</blockquote>
        <p class="acg-small-label">Return Ascendant · ${esc(model.chart.axes[0].sign)}</p><h5>${esc(rising.title)}</h5><p>${esc(rising.body)}</p><blockquote>${esc(rising.prompt)}</blockquote></div></div>
        <details class="cx-placements"><summary>Return placements, houses &amp; angles</summary><div class="cx-table-wrap"><table><thead><tr><th>Point</th><th>Return sign</th><th>House</th><th>Birth sign</th></tr></thead><tbody>${model.chart.points.filter(p=>p.kind==='planet').map((point,index)=>`<tr><th>${esc(point.symbol)} ${esc(point.name)}</th><td>${esc(point.sign)} ${point.degrees}</td><td>${point.house}</td><td>${esc(model.natalPoints[index].sign)} ${model.natalPoints[index].degrees}</td></tr>`).join('')}</tbody><tbody>${model.chart.axes.map(axis=>`<tr><th>${esc(axis.symbol)} ${esc(axis.name)}</th><td>${esc(axis.sign)} ${axis.degrees}</td><td colspan="2">—</td></tr>`).join('')}</tbody></table></div></details>
        <details class="cx-method"><summary>About this ${esc(text.label.toLowerCase())}</summary><p>${esc(text.summary)}</p><p>${esc(text.conventions)}</p><p>Symbolic interpretations support reflection and conversation, not predictions about events.</p></details>`;
    }

    function renderActive() {
      if (tab === 'solar' || tab === 'lunar') renderReturn(tab);
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      const data = button.dataset;
      if ('citTab' in data) {
        tab = data.citTab;
        root.querySelectorAll('[data-cit-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        root.querySelectorAll('.cit-view').forEach(panel => panel.hidden = panel.id !== `cit-${tab}`);
        renderActive();
      }
      if ('citBirth' in data) { document.querySelector('#birthday-input').focus(); document.querySelector('#birthday-form').scrollIntoView({block:'center'}); }
      if ('citSample' in data) {
        usingSample = !usingSample;
        chart = usingSample ? NatalEngine.calculate(sample) : savedChart;
        offsets.solar = 0; offsets.lunar = 0;
        profileStatus(); renderActive();
      }
      if ('citStep' in data) { offsets[tab] += Number(data.citStep); renderActive(); }
      if ('citNow' in data) { offsets[tab] = 0; renderActive(); }
      if ('citPlaceReset' in data) {
        manualLocation = null;
        // Leaving the checkbox on would make place() read the manual fields again
        // on the next submit, so the escape hatch is closed with the selection.
        $('#cit-manual').checked = false;
        $('#cit-manual-fields').disabled = true;
        $('#cit-place').value = chart?.location?.label || '';
        placePicker.restore(null);
        // restore() only rewrites the status line when it accepts a selection, so
        // the previous "Selected X." would otherwise contradict the reset input.
        $('#cit-place-status').textContent = 'Choose a city, or keep your birthplace.';
        renderActive();
      }
    });

    root.addEventListener('change', event => {
      if (event.target.id === 'cit-manual') {
        $('#cit-manual-fields').disabled = !event.target.checked;
        if (!event.target.checked) { manualLocation = null; renderActive(); }
      }
    });

    $('#cit-place-form').addEventListener('submit', event => {
      event.preventDefault();
      if ($('#cit-manual').checked) {
        const latitude = Number($('#cit-lat').value), longitude = Number($('#cit-lon').value), timeZone = $('#cit-zone').value.trim();
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 90 || Math.abs(longitude) > 180 || !timeZone) {
          $('#cit-place-status').textContent = 'Enter a latitude, a longitude and an IANA time zone.';
          return;
        }
        manualLocation = {latitude, longitude, timeZone, label: $('#cit-place').value.trim() || 'Custom place', source: 'manual'};
      } else {
        manualLocation = null;
      }
      renderActive();
    });

    profileStatus(); renderActive();
    return {
      setBirthChart(value) {
        savedChart = value?.status === 'ready' ? value : null;
        if (!usingSample) chart = savedChart;
        if (!chosenPlace() && chart?.location?.label) $('#cit-place').value = chart.location.label;
        profileStatus(); renderActive();
      },
      getReturnLocation() { return chosenPlace(); },
      setReturnLocation(value) {
        if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || !value.timeZone) return;
        $('#cit-place').value = value.label || '';
        if (value.source === 'manual') {
          manualLocation = value;
          $('#cit-manual').checked = true; $('#cit-manual-fields').disabled = false;
          $('#cit-lat').value = value.latitude; $('#cit-lon').value = value.longitude; $('#cit-zone').value = value.timeZone;
        } else {
          placePicker.restore(value);   // must follow the input.value assignment above
        }
        renderActive();
      }
    };
  }
  return {attach};
})();
