/* The sidereal (Jyotish) chart: rashi, nakshatras, dashas and navamsa. */
const Jyotish = (() => {
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = {birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const dateFmt = iso => new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(iso));

  const CONVENTIONS = 'Lahiri ayanamsa (Swiss Ephemeris reference, IAU 2006 precession); whole-sign bhavas from the Lagna; mean lunar nodes as Rahu and Ketu; Uranus, Neptune and Pluto are not grahas; Vimshottari with 365.25-day years; navamsa = (9 × sign + part) mod 12; readings are traditional symbolism offered for reflection.';
  const conventions = () => `<details class="jy-conventions"><summary>Method &amp; conventions</summary><p>${esc(CONVENTIONS)}</p></details>`;

  function attach(root) {
    root.innerHTML = `<header class="jy-heading"><p class="acg-eyebrow">Jyotish · the sidereal sky</p><h3>The same birth, read against the fixed stars.</h3><p>Vedic astrology recasts the birth chart against the sidereal zodiac: a Lagna and twelve rashis, twenty-seven lunar nakshatras, the Vimshottari sequence of planetary periods, and the navamsa chart used to refine it.</p></header>
      <div class="jy-tabs" role="group" aria-label="Jyotish views">
        <button type="button" data-jy-tab="rashi" aria-controls="jy-rashi" aria-pressed="true"><span>&#9738;</span>Rashi<small>Sidereal chart</small></button>
        <button type="button" data-jy-tab="nakshatras" aria-controls="jy-nakshatras" aria-pressed="false"><span>&#9790;</span>Nakshatras<small>Lunar mansions</small></button>
        <button type="button" data-jy-tab="dashas" aria-controls="jy-dashas" aria-pressed="false"><span>&#8635;</span>Dashas<small>Vimshottari periods</small></button>
        <button type="button" data-jy-tab="navamsa" aria-controls="jy-navamsa" aria-pressed="false"><span>&#9737;</span>Navamsa<small>D9 chart</small></button>
        <button type="button" data-jy-tab="gochar" aria-controls="jy-gochar" aria-pressed="false"><span>&#9795;</span>Gochar<small>Transits from the Moon</small></button>
      </div>
      <div class="cx-profile-bar"><p class="jy-profile-status"></p><button type="button" data-jy-sample>Try a sample chart</button></div>
      <section id="jy-rashi" class="jy-view" aria-live="polite"></section>
      <section id="jy-nakshatras" class="jy-view" aria-live="polite" hidden></section>
      <section id="jy-dashas" class="jy-view" aria-live="polite" hidden></section>
      <section id="jy-navamsa" class="jy-view" aria-live="polite" hidden></section>
      <section id="jy-gochar" class="jy-view" aria-live="polite" hidden><p class="jy-gochar-intro">${esc(JyotishText.gochar.intro)}</p><div class="jy-date-controls"><button type="button" data-jy-day="-1" aria-label="Previous day">←</button><label for="jy-gochar-date" class="sr-only">Gochar date</label><input id="jy-gochar-date" type="date" value="${today()}" min="1901-01-01" max="2100-12-31"><button type="button" data-jy-day="1" aria-label="Next day">→</button><button type="button" data-jy-today>Today</button></div><div id="jy-gochar-output"></div></section>`;

    const $ = selector => root.querySelector(selector);
    let savedChart = null, chart = null, usingSample = false, tab = 'rashi', format = 'south', selectedMaha = null, selectedGraha = null, gocharDay = today();
    const ordinal = n => `${n}${['','st','nd','rd'][n] || 'th'}`;  // houses 1-12 only: 11th and 12th fall through to 'th'
    const missing = message => `<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p><button type="button" data-jy-birth>Add birth details ↑</button></div>`;

    function profileStatus() {
      $('.jy-profile-status').textContent = usingSample
        ? 'Sample chart · illustrative birth details, not your personal chart.'
        : chart ? `Your birth sky · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}`
        : 'Use your birth details above to read your sidereal chart.';
      $('[data-jy-sample]').textContent = usingSample ? 'Use my profile' : 'Try a sample chart';
    }

    const formatToggle = () => `<div class="jy-format-toggle" role="group" aria-label="Chart style"><button type="button" data-jy-format="south" aria-pressed="${format==='south'}">South Indian</button><button type="button" data-jy-format="north" aria-pressed="${format==='north'}">North Indian</button></div>`;

    function chartArt(houses, lagnaSignIndex, model, title) {
      const abbreviations = Object.fromEntries(model.grahas.map(g => [g.name, g.abbreviation]));
      const retrograde = model.grahas.filter(g => g.retrograde).map(g => g.name);
      return `<div class="jy-chart-svg">${JyotishChart.render({format, houses, lagnaSignIndex, abbreviations, retrograde, title})}</div>`;
    }

    function renderRashi(model) {
      const lagnaText = JyotishText.lagna[model.lagna.signIndex];
      const abbrByName = Object.fromEntries(model.grahas.map(g => [g.name, g.abbreviation]));
      const rows = model.grahas.map(g => `<tr><th scope="row">${esc(g.abbreviation)} ${esc(g.name)}</th><td>${esc(g.sign)}</td><td>${esc(g.degrees)}</td><td>${esc(g.nakshatra.name)}</td><td>${g.nakshatra.pada}</td><td>${g.house}</td><td>${g.retrograde?'Retrograde':'Direct'}${g.vargottama?' · Vargottama':''}</td></tr>`).join('');
      const bhavaCards = model.houses.map(house => `<div class="jy-bhava-card"><span class="jy-bhava-head">${house.index} · ${esc(house.sign)}${house.grahas.length?` · ${house.grahas.map(name=>esc(abbrByName[name]||name)).join(' ')}`:''}</span><small>${esc(JyotishText.bhava[house.index])}</small></div>`).join('');
      $('#jy-rashi').innerHTML = `${formatToggle()}
        <div class="jy-chart-row">
          <div class="jy-chart-art">${chartArt(model.houses, model.lagna.signIndex, model, `Rashi · ${model.lagna.sign} lagna`)}</div>
          <div class="jy-reading"><p class="acg-small-label">${usingSample?esc('Sample · '):''}Lagna · ${esc(model.lagna.sign)} (${esc(model.lagna.western)}) ${esc(model.lagna.degrees)}</p><h5>${esc(lagnaText.title)}</h5><p>${esc(lagnaText.body)}</p><blockquote>${esc(lagnaText.prompt)}</blockquote></div>
        </div>
        <p class="acg-small-label">Placements</p>
        <div class="cx-table-wrap"><table><thead><tr><th scope="col">Graha</th><th scope="col">Rashi</th><th scope="col">Degrees</th><th scope="col">Nakshatra</th><th scope="col">Pada</th><th scope="col">Bhava</th><th scope="col">Motion</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="acg-small-label">Bhavas</p>
        <div class="jy-bhava-strip">${bhavaCards}</div>
        ${conventions()}`;
    }

    function nakshatraCard(label, nk) {
      const info = JyotishEngine.nakshatras[nk.index];
      const text = JyotishText.nakshatra[nk.index];
      const grahaInfo = label !== 'Lagna' ? JyotishText.graha[label] : null;
      const grahaBlock = grahaInfo ? `<p class="jy-kicker">${esc(label)} · ${esc(grahaInfo.theme)}</p><p>${esc(grahaInfo.body)}</p>` : '';
      return `<div class="jy-nakshatra-card">${grahaBlock}<p class="acg-small-label">${esc(label)}</p><h4>${esc(info.name)}</h4><p class="jy-nakshatra-meta">Symbol: ${esc(info.symbol)} · Deity: ${esc(info.deity)} · Lord: ${esc(info.lord)} · Pada ${nk.pada}</p><p class="jy-nakshatra-keyword">${esc(text.keyword)}</p><p>${esc(text.body)}</p><blockquote>${esc(text.prompt)}</blockquote></div>`;
    }

    function renderNakshatras(model) {
      const moon = model.grahas.find(g => g.name === 'Moon');
      const others = [...model.grahas.filter(g => g.name !== 'Moon').map(g => ({name:g.name, nakshatra:g.nakshatra})), {name:'Lagna', nakshatra:model.lagna.nakshatra}];
      if (!selectedGraha || !others.some(g => g.name === selectedGraha)) selectedGraha = others[0].name;
      const chosen = others.find(g => g.name === selectedGraha);
      $('#jy-nakshatras').innerHTML = `<p class="acg-small-label">${usingSample?esc('Sample · '):''}Your Moon's nakshatra</p>
        ${nakshatraCard('Moon', moon.nakshatra)}
        <p class="acg-small-label">Other placements</p>
        <div class="jy-nakshatra-list" role="group" aria-label="Other placements by nakshatra">${others.map(g => `<button type="button" data-jy-graha="${esc(g.name)}" aria-pressed="${selectedGraha===g.name}">${esc(g.name)}<small>${esc(JyotishEngine.nakshatras[g.nakshatra.index].name)}</small></button>`).join('')}</div>
        ${chosen ? nakshatraCard(chosen.name, chosen.nakshatra) : ''}
        ${conventions()}`;
    }

    function renderDashas(model, dashaModel) {
      if (selectedMaha == null || !dashaModel.mahadashas[selectedMaha]) selectedMaha = dashaModel.current ? dashaModel.current.maha : 0;
      const current = dashaModel.current;
      const currentMaha = current ? dashaModel.mahadashas[current.maha] : null;
      const currentAntar = current ? currentMaha.antardashas[current.antar] : null;
      const nowCard = current
        ? `<div class="jy-dasha-now"><p class="acg-small-label">${usingSample?esc('Sample · '):''}Now</p><h4>${esc(currentMaha.lord)} mahadasha · ${esc(currentAntar.lord)} antardasha</h4>
            <p class="jy-dasha-dates">Mahadasha ${dateFmt(currentMaha.start)} – ${dateFmt(currentMaha.end)} · Antardasha ${dateFmt(currentAntar.start)} – ${dateFmt(currentAntar.end)}</p>
            <div class="jy-dasha-readings">
              <div><p class="acg-small-label">Mahadasha · ${esc(currentMaha.lord)}</p><h5>${esc(JyotishText.dashaLord[currentMaha.lord].title)}</h5><p>${esc(JyotishText.dashaLord[currentMaha.lord].body)}</p><blockquote>${esc(JyotishText.dashaLord[currentMaha.lord].prompt)}</blockquote></div>
              <div><p class="acg-small-label">Antardasha · ${esc(currentAntar.lord)}</p><h5>${esc(JyotishText.dashaLord[currentAntar.lord].title)}</h5><p>${esc(JyotishText.dashaLord[currentAntar.lord].body)}</p><blockquote>${esc(JyotishText.dashaLord[currentAntar.lord].prompt)}</blockquote></div>
            </div></div>`
        : `<div class="jy-dasha-now cx-empty">Today's date falls outside this chart's calculated Vimshottari span.</div>`;

      const totalYears = dashaModel.mahadashas.reduce((sum, m) => sum + m.years, 0);
      const timeline = dashaModel.mahadashas.map((m, i) => `<button type="button" class="jy-dasha-block${current && current.maha===i?' is-now':''}" style="flex-basis:${(m.years/totalYears*100).toFixed(3)}%" data-jy-maha="${i}" aria-pressed="${selectedMaha===i}"${current && current.maha===i?' aria-current="true"':''}><strong>${esc(m.lord)}</strong><small>${new Date(m.start).getUTCFullYear()}–${new Date(m.end).getUTCFullYear()}</small></button>`).join('');

      const maha = dashaModel.mahadashas[selectedMaha];
      const firstKept = maha.antardashas.findIndex(a => !a.beforeBirth);
      const shownAntar = firstKept === -1 ? [] : maha.antardashas.slice(firstKept);
      const antarTable = `<div class="cx-table-wrap"><table><thead><tr><th scope="col">Lord</th><th scope="col">From</th><th scope="col">To</th></tr></thead><tbody>${shownAntar.map((a, idx) => `<tr><th scope="row">${esc(a.lord)}</th><td>${dateFmt(a.start)}${idx===0 && firstKept>0?'<br><small>in progress at birth</small>':''}</td><td>${dateFmt(a.end)}</td></tr>`).join('')}</tbody></table></div>`;

      $('#jy-dashas').innerHTML = `${nowCard}
        <p class="acg-small-label">Vimshottari mahadasha timeline</p>
        <div class="jy-dasha-scroll"><div class="jy-dasha-timeline">${timeline}</div></div>
        <p class="acg-small-label">${esc(maha.lord)} mahadasha · antardashas</p>
        <p class="jy-dasha-note">Dasha instants are calculated in UTC; dates below are shown in your local calendar format.</p>
        ${antarTable}
        ${conventions()}`;
    }

    function renderNavamsa(model) {
      const rows = model.grahas.map(g => `<tr><th scope="row">${esc(g.abbreviation)} ${esc(g.name)}</th><td>${esc(g.sign)}</td><td>${esc(JyotishEngine.rashis[g.navamsaSign][0])}</td><td>${g.vargottama?'Yes':'No'}</td></tr>`).join('');
      $('#jy-navamsa').innerHTML = `${formatToggle()}
        <div class="jy-chart-row">
          <div class="jy-chart-art">${chartArt(model.navamsaHouses, model.navamsaLagna.signIndex, model, `Navamsa · ${model.navamsaLagna.sign} lagna`)}</div>
          <div class="jy-reading"><p class="acg-small-label">${usingSample?esc('Sample · '):''}Navamsa Lagna · ${esc(model.navamsaLagna.sign)} (${esc(model.navamsaLagna.western)})</p><p>The navamsa, or D9 chart, divides each rashi into nine equal parts and is traditionally read alongside the birth chart to confirm a placement's strength and for questions of marriage and dharma. A graha keeping the same sign in both charts is called vargottama.</p></div>
        </div>
        <p class="acg-small-label">Placements</p>
        <div class="cx-table-wrap"><table><thead><tr><th scope="col">Graha</th><th scope="col">Rashi (D1)</th><th scope="col">Navamsa (D9)</th><th scope="col">Vargottama</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="jy-method-note">Navamsa sign = (9 × sign index + part index) mod 12, where each rashi is split into nine parts of 3°20′.</p>
        ${conventions()}`;
    }

    function renderGochar() {
      const out = $('#jy-gochar-output'), T = JyotishText.gochar;
      try {
        const model = JyotishEngine.gochar(chart, gocharDay);
        if (model.status === 'missing') { out.innerHTML = missing(model.message); return; }
        if (model.status === 'error') { out.innerHTML = `<p class="cx-error" role="alert">${esc(model.message)}</p>`; return; }
        const saturn = model.grahas.find(g => g.name === 'Saturn');
        const rows = model.grahas.map(g => `<tr><th scope="row">${esc(g.abbreviation)} ${esc(g.name)}</th><td>${esc(g.sign)} (${esc(g.western)})</td><td>${esc(g.degrees)}</td><td>${esc(ordinal(g.house))}</td><td>${esc(g.supportive ? T.supportive : T.demanding)}</td></tr>`).join('');
        const scheme = Object.entries(JyotishEngine.GOCHAR_SUPPORTIVE).map(([name, houses]) => `<tr><th scope="row">${esc(name)}</th><td>${esc(houses.map(h => ordinal(h)).join(', '))}</td></tr>`).join('');
        out.innerHTML = `<p class="acg-small-label">${usingSample?esc('Sample · '):''}Natal Moon · ${esc(model.moonRashi)} (${esc(JyotishEngine.rashis[model.moonSign][1])})</p>
          <p class="jy-method-note">Positions for 12:00 UTC on ${esc(dateFmt(`${model.day}T12:00:00Z`))}.</p>
          ${model.sadeSati ? `<div class="jy-sade-sati"><p class="acg-small-label">Sade Sati · Saturn in the ${esc(ordinal(saturn.house))} sign from the natal Moon</p><p>${esc(T.sadeSati)}</p></div>` : ''}
          <div class="cx-table-wrap"><table><thead><tr><th scope="col">Graha</th><th scope="col">Rashi</th><th scope="col">Degrees</th><th scope="col">From the Moon</th><th scope="col">Tradition</th></tr></thead><tbody>${rows}</tbody></table></div>
          <details class="jy-conventions"><summary>Method &amp; conventions</summary><p>${esc(T.method).replace('Phaladeepika', '<em>Phaladeepika</em>')}</p><div class="cx-table-wrap"><table><thead><tr><th scope="col">Graha</th><th scope="col">Supportive houses from the Moon</th></tr></thead><tbody>${scheme}</tbody></table></div></details>`;
      } catch (error) { out.innerHTML = `<p class="cx-error" role="alert">${esc(error.message)}</p>`; }
    }

    function renderActive() {
      if (tab === 'gochar') { renderGochar(); return; }
      const model = JyotishEngine.sidereal(chart);
      if (model.status === 'missing') { $(`#jy-${tab}`).innerHTML = missing(model.message); return; }
      if (model.status === 'error') { $(`#jy-${tab}`).innerHTML = `<p class="cx-error" role="alert">${esc(model.message)}</p>`; return; }
      if (tab === 'rashi') renderRashi(model);
      else if (tab === 'nakshatras') renderNakshatras(model);
      else if (tab === 'navamsa') renderNavamsa(model);
      else if (tab === 'dashas') renderDashas(model, JyotishEngine.vimshottari(chart, today()));
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      const data = button.dataset;
      if ('jyTab' in data) {
        tab = data.jyTab;
        root.querySelectorAll('[data-jy-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        root.querySelectorAll('.jy-view').forEach(panel => panel.hidden = panel.id !== `jy-${tab}`);
        renderActive();
      }
      if ('jyBirth' in data) { document.querySelector('#birthday-input').focus(); document.querySelector('#birthday-form').scrollIntoView({block:'center'}); }
      if ('jySample' in data) {
        usingSample = !usingSample;
        chart = usingSample ? NatalEngine.calculate(sample) : savedChart;
        selectedMaha = null; selectedGraha = null;
        profileStatus(); renderActive();
      }
      if ('jyFormat' in data) { format = data.jyFormat; renderActive(); $(`#jy-${tab}`).querySelector(`[data-jy-format="${format}"]`)?.focus({preventScroll:true}); }
      if ('jyMaha' in data) { selectedMaha = Number(data.jyMaha); renderActive(); $(`#jy-${tab}`).querySelector(`[data-jy-maha="${selectedMaha}"]`)?.focus({preventScroll:true}); }
      if ('jyDay' in data) {
        const d = new Date(`${gocharDay}T12:00:00Z`);
        if (Number.isFinite(+d)) {
          d.setUTCDate(d.getUTCDate() + Number(data.jyDay));
          const year = d.getUTCFullYear();
          gocharDay = year < 1901 ? '1901-01-01' : year > 2100 ? '2100-12-31' : d.toISOString().slice(0, 10);
          $('#jy-gochar-date').value = gocharDay; renderGochar();
        }
      }
      if ('jyToday' in data) { gocharDay = today(); $('#jy-gochar-date').value = gocharDay; renderGochar(); }
      if ('jyGraha' in data) { selectedGraha = data.jyGraha; renderActive(); $(`#jy-${tab}`).querySelector(`[data-jy-graha="${selectedGraha}"]`)?.focus({preventScroll:true}); }
    });
    root.addEventListener('change', event => {
      if (event.target.id === 'jy-gochar-date') {
        // An invalid or cleared date keeps the previous day, so the day steps keep working.
        const value = event.target.value, year = Number(value.slice(0, 4));
        if (/^\d{4}-\d{2}-\d{2}$/.test(value) && year >= 1901 && year <= 2100) gocharDay = value;
        event.target.value = gocharDay; renderGochar();
      }
    });

    profileStatus(); renderActive();
    return {
      setBirthChart(value) {
        savedChart = value?.status === 'ready' ? value : null;
        if (!usingSample) { chart = savedChart; selectedMaha = null; selectedGraha = null; }
        profileStatus(); renderActive();
      }
    };
  }
  return {attach};
})();
