const CelestialExtras = (() => {
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = {Wood:'#a0c8a5',Fire:'#eea395',Earth:'#d5bd81',Metal:'#dfdbcf',Water:'#9bbfd5'};
  const phaseText = {
    Wood:['Growth & flexibility','Wood is associated with growth, direction and the ability to adapt.','What would you like to nurture without rushing it?'],
    Fire:['Expression & warmth','Fire is associated with expression, warmth and visibility.','What brings warmth to your relationships?'],
    Earth:['Care & steadiness','Earth is associated with stability, care and the work of sustaining things.','What helps you feel grounded?'],
    Metal:['Clarity & discernment','Metal is associated with definition, discernment and refinement.','What deserves a clearer boundary?'],
    Water:['Reflection & movement','Water is associated with reflection, adaptability and the movement of ideas.','Where could curiosity replace a fixed expectation?']
  };
  const planetThemes = {Sun:'identity and expression',Moon:'emotional rhythms and care',Mercury:'communication and learning',Venus:'affection and shared values',Mars:'initiative and boundaries',Jupiter:'growth and perspective',Saturn:'responsibility and structure',Uranus:'independence and change',Neptune:'imagination and ideals',Pluto:'depth and renewal'};
  const contactText = {
    Conjunction:['A shared focus','A conjunction places two symbols together. Consider how their themes blend, amplify or compete for attention.','How could both needs have room?'],
    Sextile:['An opening to explore','A sextile is traditionally read as an invitation to cooperate. Reflection and deliberate effort give this symbolism a practical use.','What small invitation could you act on?'],
    Square:['A useful difference','A square is traditionally read as tension between needs. It can be a prompt to name a difference and find a workable response.','What needs a more honest conversation?'],
    Trine:['A familiar rhythm','A trine is traditionally read as ease or affinity. Notice what feels natural, and where familiarity may hide an assumption.','What works well enough to appreciate aloud?'],
    Opposition:['Two sides of a story','An opposition is traditionally read as a dialogue between contrasting needs. Explore both perspectives without deciding one must win.','What would a fair balance look like?']
  };
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const sampleA = {birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
  const sampleB = {birthday:'1992-11-03',time:'05:15',location:{latitude:51.5085,longitude:-.1257,timeZone:'Europe/London',label:'London, United Kingdom'}};

  function wheel(first,second,contact,labels) {
    const at = (longitude,radius) => {const a=(180-longitude)*Math.PI/180;return [300+radius*Math.cos(a),300-radius*Math.sin(a)];};
    const point = (longitude,radius) => at(longitude,radius).map(n=>n.toFixed(2)).join(',');
    const rays = Array.from({length:12},(_,i)=>`<line x1="${at(i*30,205)[0]}" y1="${at(i*30,205)[1]}" x2="${at(i*30,276)[0]}" y2="${at(i*30,276)[1]}" stroke="#99b5b044"/><text x="${at(i*30+15,260)[0]}" y="${at(i*30+15,260)[1]+5}" text-anchor="middle" fill="#cbb681" font-size="20">${NatalEngine.signGlyphs[i]}︎</text>`).join('');
    function marks(points,radius,tint) {
      // Separate labels around their ring while keeping a leader to the exact longitude.
      const ordered = points.map(p=>({...p,labelLongitude:p.longitude})).sort((a,b)=>a.longitude-b.longitude);
      for(let round=0;round<12;round++) for(let i=0;i<ordered.length;i++) {
        const a=ordered[i],b=ordered[(i+1)%ordered.length];
        const gap=NatalEngine.mod(b.labelLongitude-a.labelLongitude);
        if(gap<12) b.labelLongitude=NatalEngine.mod(b.labelLongitude+(12-gap));
      }
      return ordered.map(p=>{const exact=at(p.longitude,radius),label=at(p.labelLongitude,radius+14);return `<g><title>${p.name}: ${p.sign} ${p.degrees}</title><line x1="${exact[0]}" y1="${exact[1]}" x2="${label[0]}" y2="${label[1]}" stroke="${tint}" stroke-opacity=".4"/><circle cx="${exact[0]}" cy="${exact[1]}" r="2" fill="${tint}"/><text x="${label[0]}" y="${label[1]+6}" text-anchor="middle" font-size="19" fill="${tint}">${p.symbol}︎</text></g>`;}).join('');
    }
    return `<svg class="cx-wheel" viewBox="0 0 600 600" role="img" aria-label="Two-ring astrology chart: ${esc(labels[0])} inside, ${esc(labels[1])} outside. Exact placements are listed below."><circle cx="300" cy="300" r="282" fill="#0a202c" stroke="#bba47777"/>${[276,240,205,170,144].map(r=>`<circle cx="300" cy="300" r="${r}" fill="none" stroke="#a0bfb733"/>`).join('')}${rays}${marks(first,158,'#e8cd93')}${marks(second,214,'#97d3d6')}${contact?`<line x1="${at(contact.aLongitude,158)[0]}" y1="${at(contact.aLongitude,158)[1]}" x2="${at(contact.bLongitude,214)[0]}" y2="${at(contact.bLongitude,214)[1]}" stroke="${['Square','Opposition'].includes(contact.type)?'#e6a6a1':'#b8d7b2'}" stroke-width="2"/><circle cx="${at(contact.aLongitude,158)[0]}" cy="${at(contact.aLongitude,158)[1]}" r="5" fill="#e8cd93"/><circle cx="${at(contact.bLongitude,214)[0]}" cy="${at(contact.bLongitude,214)[1]}" r="5" fill="#97d3d6"/>`:''}<circle cx="300" cy="300" r="58" fill="#0b202be8" stroke="#bba47755"/><text x="300" y="308" text-anchor="middle" fill="#ddc694" font-size="28">${contact?.symbol || '✧'}</text><text x="300" y="335" text-anchor="middle" fill="#a0b5b9" font-size="9" letter-spacing="2">${contact?.type.toUpperCase() || 'TWO SKIES'}</text></svg>`;
  }

  function attach(root) {
    root.innerHTML = `<header class="cx-heading"><p class="acg-eyebrow">Three more perspectives</p><h3>A sky that keeps unfolding.</h3><p>Explore the present, the space between two people, and the four pillars of a birth moment.</p></header>
      <div class="cx-tabs" role="group" aria-label="Additional chart types"><button type="button" data-cx-tab="transits" aria-controls="cx-transits" aria-pressed="true"><span>☉</span>Your sky today<small>Planetary transits</small></button><button type="button" data-cx-tab="synastry" aria-controls="cx-synastry" aria-pressed="false"><span>☌</span>Two skies<small>Relationship chart</small></button><button type="button" data-cx-tab="bazi" aria-controls="cx-bazi" aria-pressed="false"><span>四</span>Four Pillars<small>BaZi · Chinese tradition</small></button></div>
      <div class="cx-profile-bar"><p class="cx-profile-status">Use your birth details above to make these charts personal.</p><button type="button" data-cx-sample>Try sample charts</button></div>
      <section id="cx-transits" class="cx-view"><div class="cx-view-heading"><div><p class="acg-small-label">Your sky today</p><h4>The moving sky meets your birth sky.</h4></div><div class="cx-date-controls"><button type="button" data-cx-day="-1" aria-label="Previous day">←</button><label for="cx-date" class="visually-hidden">Transit date</label><input id="cx-date" type="date" value="${today()}" min="1901-01-01" max="2100-12-31"><button type="button" data-cx-day="1" aria-label="Next day">→</button><button type="button" data-cx-today>Today</button></div></div><p class="cx-timing">A snapshot at 12:00 UTC on the selected day.</p><div id="cx-transit-output"></div></section>
      <section id="cx-synastry" class="cx-view" hidden><div class="cx-view-heading"><div><p class="acg-small-label">Two skies · synastry</p><h4>Make room for both stories.</h4><p>Compare your birth sky with a partner, friend or family member.</p></div></div><form id="cx-partner-form" class="cx-partner-form"><label>Other person’s birthday<input type="date" id="cx-partner-date" min="1901-01-01" max="${today()}" required></label><label>Recorded birth time<input type="time" id="cx-partner-time" required></label><div class="birthplace-field"><label for="cx-partner-place">Birthplace</label><div class="city-input-wrap"><input id="cx-partner-place" type="text" placeholder="Choose a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cx-partner-cities" aria-describedby="cx-partner-status"><div id="cx-partner-cities" class="city-suggestions" role="listbox" aria-label="Matching partner birthplaces" hidden></div></div><p id="cx-partner-status" class="city-search-status" role="status">Choose a matching city.</p></div><label id="cx-partner-fold-label" hidden>Repeated clock time<select id="cx-partner-fold"><option value="">Choose the occurrence</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label><details class="cx-custom-place"><summary>Use coordinates for an unlisted birthplace</summary><label class="cx-manual-toggle"><input type="checkbox" id="cx-partner-manual">Use these coordinates</label><fieldset id="cx-partner-coordinates" disabled><label>Latitude<input id="cx-partner-lat" type="number" min="-89.999" max="89.999" step="any" required></label><label>Longitude<input id="cx-partner-lon" type="number" min="-180" max="180" step="any" required></label><label>IANA time zone<input id="cx-partner-zone" type="text" placeholder="Europe/London" list="birth-timezones" required></label></fieldset></details><button type="submit" class="cx-primary">Compare our skies</button><p class="cx-partner-privacy">The second person’s details stay in this page and are not saved.</p></form><div id="cx-synastry-output" aria-live="polite"></div></section>
      <section id="cx-bazi" class="cx-view" hidden><div class="cx-view-heading"><div><p class="acg-small-label">BaZi · 八字</p><h4>Eight characters. Four pillars.</h4><p>A Chinese system of stems, branches and the five phases.</p></div></div><div id="cx-bazi-output"></div></section>`;
    const $ = selector=>root.querySelector(selector), partnerPicker=BirthplaceSearch.attach({input:$('#cx-partner-place'),list:$('#cx-partner-cities'),status:$('#cx-partner-status')});
    let savedChart=null, chart=null, partner=null, sample=false, tab='transits', transitModel=null, synastryModel=null, chosenTransit='', chosenSynastry='', pillarIndex=2, contactFilter='all';
    const missing = message=>`<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p><button type="button" data-cx-birth>Add birth details ↑</button></div>`;
    function profileStatus() {
      $('.cx-profile-status').textContent = sample ? 'Sample charts · illustrative birth details, not your personal charts.' : chart ? `Your birth sky · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}` : 'Use your birth details above to make these charts personal.';
      $('[data-cx-sample]').textContent=sample?'Use my profile':'Try sample charts';
    }
    function renderTransits() {
      try {
        transitModel=CelestialExtrasEngine.transits(chart,$('#cx-date').value);
        if(transitModel.status!=='ready') {$('#cx-transit-output').innerHTML=missing(transitModel.message);return;}
        renderComparison('transit');
      } catch(error) {$('#cx-transit-output').innerHTML=`<p class="cx-error" role="alert">${esc(error.message)}</p>`;}
    }
    function renderSynastry() {
      synastryModel=CelestialExtrasEngine.synastry(chart,partner);
      if(synastryModel.status!=='ready') {$('#cx-synastry-output').innerHTML=chart?'<p class="cx-empty">Add the other person’s details and choose “Compare our skies”.</p>':missing(synastryModel.message);return;}
      renderComparison('synastry');
    }
    function renderComparison(mode) {
      const transit=mode==='transit', model=transit?transitModel:synastryModel, all=model.contacts;
      const filtered=all.filter(c=>contactFilter==='all'||(contactFilter==='ease'?['Trine','Sextile'].includes(c.type):contactFilter==='contrast'?['Square','Opposition'].includes(c.type):c.type==='Conjunction'));
      let chosen=transit?chosenTransit:chosenSynastry;
      if(!filtered.some(c=>c.id===chosen)) chosen=filtered[0]?.id||'';
      if(transit) chosenTransit=chosen;else chosenSynastry=chosen;
      const c=filtered.find(c=>c.id===chosen), text=c?contactText[c.type]:null;
      // Engine stores transiting body as a; inside the wheel is always the birth sky.
      const diagramContact=transit&&c?{...c,aLongitude:c.bLongitude,bLongitude:c.aLongitude}:c;
      const first=transit?model.birth:model.first, second=transit?model.points:model.second;
      const labels=transit?['Birth sky','Selected day']:['Your birth sky','Other person'];
      $(`#cx-${mode}-output`).innerHTML=`<div class="cx-comparison"><div class="cx-chart-art">${wheel(first,second,diagramContact,labels)}<p class="cx-ring-key"><span>${sample?'Sample · ':''}${labels[0]}</span><span>${labels[1]}</span></p></div><div class="cx-contact-panel"><label for="cx-${mode}-filter">Explore contacts</label><select id="cx-${mode}-filter" data-cx-filter><option value="all" ${contactFilter==='all'?'selected':''}>All contacts · ${all.length}</option><option value="ease" ${contactFilter==='ease'?'selected':''}>Trines & sextiles</option><option value="contrast" ${contactFilter==='contrast'?'selected':''}>Squares & oppositions</option><option value="blend" ${contactFilter==='blend'?'selected':''}>Conjunctions</option></select><div class="cx-contact-list" role="group" aria-label="${transit?'Transit':'Relationship'} contacts">${filtered.map(item=>`<button type="button" data-cx-contact="${item.id}" data-cx-mode="${mode}" aria-pressed="${item.id===chosen}"><span>${item.a} ${item.symbol} ${item.b}<small>${item.type}</small></span><span>${item.orb.toFixed(2)}°<small>orb</small></span></button>`).join('')||'<p>No contacts in this filter. Try another filter or date.</p>'}</div><div class="cx-contact-reading" aria-live="polite">${c?`<p class="acg-small-label">${transit?`Current ${c.a} · birth ${c.b}`:`Your ${c.a} · their ${c.b}`}</p><h5>${text[0]}</h5><p>This brings together symbolism around ${planetThemes[c.a]} and ${planetThemes[c.b]}. ${text[1]}</p><blockquote>${text[2]}</blockquote>`:'<p>The complete planetary positions are still available below.</p>'}</div></div></div>
        <details class="cx-placements"><summary>Exact placements${transit?'':' & house overlays'}</summary><div class="cx-table-wrap"><table><thead><tr><th>Planet</th><th>${labels[0]}</th><th>${labels[1]}</th>${transit?'':'<th>Their planet in your house</th>'}</tr></thead><tbody>${first.map((p,i)=>`<tr><th>${p.symbol} ${p.name}</th><td>${p.sign} ${p.degrees}</td><td>${second[i].sign} ${second[i].degrees}</td>${transit?'':`<td>${model.overlays[i].house}</td>`}</tr>`).join('')}</tbody></table></div></details>
        <details class="cx-method"><summary>About this ${transit?'transit':'relationship'} chart</summary><p>${transit?'The outer ring shows the ten planets at 12:00 UTC on the selected day; the inner ring shows your birth positions. Contacts use the five major aspects within 2°. This daily snapshot does not locate exact event times, and the fast-moving Moon can change appreciably within a day.':'Two birth charts are compared using the ten planets and five major aspects. Maximum orbs are 6° for conjunctions, trines and oppositions, 4° for sextiles and 6° for squares. House overlays place the other person’s planets in your existing birth-chart houses. These are not compatibility scores.'}</p><p>Ring labels are spaced for readability; small dots mark exact longitudes. Symbolic interpretations support reflection and conversation, not predictions about events or relationships.</p></details>`;
    }
    function renderBazi() {
      const model=CelestialExtrasEngine.bazi(chart);
      if(model.status!=='ready') {$('#cx-bazi-output').innerHTML=missing(model.message);return;}
      const master=model.dayMaster, selected=model.pillars[pillarIndex], descriptions=['The year pillar is traditionally associated with ancestry, early surroundings and the wider world.','The month pillar follows the solar season and is traditionally associated with upbringing and daily responsibilities.','The day’s heavenly stem is the Day Master, the reference point for a BaZi reading. The day pillar is traditionally associated with self and close relationships.','The hour pillar is traditionally associated with aspirations, later chapters and what you pass on.'];
      const phase=phaseText[selected.stem[2]];
      $('#cx-bazi-output').innerHTML=`<div class="cx-bazi-master"><div><p class="acg-small-label">${sample?'Sample · ':''}Day Master</p><h5>${master[1]} · ${master[3]} ${master[2]}</h5><p>The heavenly stem of the day pillar.</p></div><span lang="zh" style="color:${colors[master[2]]}">${master[0]}</span></div><div class="cx-pillars" role="group" aria-label="Explore the Four Pillars">${model.pillars.map((p,i)=>`<button type="button" data-cx-pillar="${i}" aria-pressed="${i===pillarIndex}" aria-label="${p.label} pillar: ${p.stem[1]} ${p.branch[1]}, ${p.stem[3]} ${p.stem[2]}, ${p.branch[2]}"><span class="cx-pillar-label">${p.label}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.stem[2]]}">${p.stem[0]}</span><span class="cx-pinyin">${p.stem[1]} · ${p.stem[3]} ${p.stem[2]}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.branch[3]]}">${p.branch[0]}</span><span class="cx-pinyin">${p.branch[1]} · ${p.branch[2]}</span></button>`).join('')}</div><div class="cx-bazi-bottom"><div class="cx-pillar-reading" aria-live="polite"><p class="acg-small-label">${selected.label} pillar · ${selected.stem[1]} ${selected.branch[1]}</p><h5>${phase[0]}</h5><p>${descriptions[pillarIndex]} ${phase[1]}</p><blockquote>${phase[2]}</blockquote></div><div class="cx-phase-chart"><p class="acg-small-label">Five phases · visible characters</p>${Object.entries(model.phases).map(([name,count])=>`<div><span>${name}</span><meter min="0" max="8" value="${count}" style="--phase-color:${colors[name]}" aria-label="${name}: ${count} of eight visible characters">${count}/8</meter><strong>${count}</strong></div>`).join('')}<p>A count of eight visible stems and principal branch phases. This is not a strength or balance score.</p></div></div>${model.nearSolarTerm?'<p class="cx-error" role="status">This birth moment is close to a solar-term boundary. A small birth-time or ephemeris difference may change the month or year pillar.</p>':''}<details class="cx-method"><summary>Four Pillars conventions & sources</summary><p>The year changes at Li Chun (Sun at 315°), and months at the twelve Jie solar-term boundaries, calculated for the actual birth instant. These boundaries differ from Lunar New Year. The day changes at 23:00 and hours use the recorded local civil clock in two-hour branches; no true-solar-time correction is applied. Other schools may use different day or clock conventions.</p><p>The phase count includes the eight visible characters, using each branch’s principal phase. Hidden stems, seasonal weighting, Ten Gods and luck cycles are not included. The Day Master’s phase is a traditional reference, not a measurement of personality or health.</p><p>See the Hong Kong Observatory’s <a href="https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm" target="_blank" rel="noopener">stems and branches</a> and <a href="https://www.hko.gov.hk/en/gts/time/24solarterms.htm" target="_blank" rel="noopener">solar terms</a>. Interpretations here are original prompts for reflection.</p></details>`;
    }
    function renderActive() { if(tab==='transits') renderTransits();else if(tab==='synastry') renderSynastry();else renderBazi(); }
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      const data=button.dataset;
      if('cxTab' in data) {tab=data.cxTab;root.querySelectorAll('[data-cx-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));root.querySelectorAll('.cx-view').forEach(panel=>panel.hidden=panel.id!==`cx-${tab}`);renderActive();}
      if('cxBirth' in data) {document.querySelector('#birthday-input').focus();document.querySelector('#birthday-form').scrollIntoView({block:'center'});}
      if('cxSample' in data) {
        sample=!sample;chart=sample?NatalEngine.calculate(sampleA):savedChart;
        if(sample) {partner=NatalEngine.calculate(sampleB);$('#cx-partner-date').value=sampleB.birthday;$('#cx-partner-time').value=sampleB.time;$('#cx-partner-place').value=sampleB.location.label;$('#cx-partner-manual').checked=false;$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(sampleB.location);$('#cx-partner-fold').value='';$('#cx-partner-fold-label').hidden=true;}
        else {partner=null;$('#cx-partner-form').reset();$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(null);}
        profileStatus();renderActive();
      }
      if('cxDay' in data) {const d=new Date(`${$('#cx-date').value}T12:00:00Z`);if(Number.isFinite(+d)){d.setUTCDate(d.getUTCDate()+Number(data.cxDay));if(d.getUTCFullYear()>=1901&&d.getUTCFullYear()<=2100)$('#cx-date').value=d.toISOString().slice(0,10);renderTransits();}}
      if('cxToday' in data) {$('#cx-date').value=today();renderTransits();}
      if('cxContact' in data) {if(data.cxMode==='transit')chosenTransit=data.cxContact;else chosenSynastry=data.cxContact;const scroll=button.closest('.cx-contact-list').scrollTop;renderComparison(data.cxMode);const next=root.querySelector(`[data-cx-contact="${data.cxContact}"]`);next?.focus({preventScroll:true});if(next)next.closest('.cx-contact-list').scrollTop=scroll;}
      if('cxPillar' in data) {pillarIndex=Number(data.cxPillar);renderBazi();root.querySelector(`[data-cx-pillar="${pillarIndex}"]`).focus({preventScroll:true});}
    });
    root.addEventListener('change',event=>{
      if(event.target.id==='cx-date')renderTransits();
      if(event.target.matches('[data-cx-filter]')) {contactFilter=event.target.value;const id=event.target.id;renderActive();$(`#${id}`).focus({preventScroll:true});}
      if(event.target.id==='cx-partner-manual')$('#cx-partner-coordinates').disabled=!event.target.checked;
    });
    $('#cx-partner-form').addEventListener('input',event=>{partner=null;$('#cx-synastry-output').innerHTML='<p class="cx-empty">Choose “Compare our skies” to use these details.</p>';if(event.target.id!=='cx-partner-fold')$('#cx-partner-fold').value='';});
    $('#cx-partner-form').addEventListener('invalid',event=>{const detail=event.target.closest('details');if(detail)detail.open=true;},true);
    $('#cx-partner-form').addEventListener('submit',event=>{
      event.preventDefault();
      const location=$('#cx-partner-manual').checked?{latitude:Number($('#cx-partner-lat').value),longitude:Number($('#cx-partner-lon').value),timeZone:$('#cx-partner-zone').value.trim(),label:$('#cx-partner-place').value.trim()||'Custom birthplace'}:partnerPicker.getSelection();
      partner=NatalEngine.calculate({birthday:$('#cx-partner-date').value,time:$('#cx-partner-time').value,location,fold:$('#cx-partner-fold').value,houseSystem:chart?.houseSystem||'placidus'});
      $('#cx-partner-fold-label').hidden=partner.status!=='ambiguous'&&!partner.ambiguousTime;
      if(partner.status!=='ready') {$('#cx-synastry-output').innerHTML=`<p class="cx-error" role="alert">${esc(partner.message)}</p>`;return;}
      renderSynastry();
    });
    function followChartLink() {
      const view = {'#cx-transits':'transits','#cx-synastry':'synastry','#cx-bazi':'bazi'}[location.hash];
      if (!view) return;
      tab=view;
      root.querySelectorAll('[data-cx-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cxTab===tab)));
      root.querySelectorAll('.cx-view').forEach(panel=>panel.hidden=panel.id!==`cx-${tab}`);
      renderActive();
      requestAnimationFrame(()=>root.scrollIntoView({block:'start'}));
    }
    window.addEventListener('hashchange',followChartLink);
    profileStatus();renderActive();followChartLink();
    return {setBirthChart(value){savedChart=value?.status==='ready'?value:null;chart=savedChart;if(sample){sample=false;partner=null;$('#cx-partner-form').reset();$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(null);}profileStatus();renderActive();}};
  }
  return {attach,wheel};
})();
