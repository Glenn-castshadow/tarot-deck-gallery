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
  const godText = {
    friend:{theme:'Standing beside yourself',story:'Friend is a stem of the same phase and polarity as the Day Master: traditionally read as peers, siblings and the parts of life where you meet your own likeness. Reflect on where company strengthens you and where sameness crowds you.',prompt:'Who in your life mirrors you, and what do you learn from the resemblance?'},
    robWealth:{theme:'Company that also competes',story:'Rob Wealth shares the Day Master’s phase without sharing its polarity: traditionally tied to rivals, divided resources and the people chasing the same aim you are. It can describe camaraderie shadowed by comparison.',prompt:'Where does comparison sharpen you, and where does it just breed rivalry?'},
    eatingGod:{theme:'Ease that flows outward',story:'Eating God comes from the phase the Day Master produces, keeping its polarity: traditionally associated with unhurried expression, appetite and quiet enjoyment. It favours output made for its own sake rather than for effect.',prompt:'What do you make simply because making it feels good?'},
    hurtingOfficer:{theme:'A sharper kind of voice',story:'Hurting Officer is also produced by the Day Master, but with the opposite polarity: traditionally linked to wit, restlessness and words that cut through convention. It is candour that does not always wait to be invited.',prompt:'When has your honesty landed as provocation instead of clarity?'},
    indirectWealth:{theme:'Resources that pass through',story:'Indirect Wealth sits in the phase the Day Master controls, sharing its polarity: traditionally associated with circulation, opportunity and things that arrive unplanned. It tends to move rather than settle.',prompt:'What have you gained by staying open to the unplanned?'},
    directWealth:{theme:'What steady effort holds',story:'Direct Wealth occupies the phase the Day Master controls, with the opposite polarity: traditionally tied to steady accumulation and the patient tending of what is already yours. It favours upkeep over pursuit.',prompt:'What have you been quietly maintaining rather than chasing?'},
    sevenKillings:{theme:'Pressure that shapes',story:'Seven Killings controls the Day Master with the same polarity: traditionally associated with demanding circumstances, discipline and the edge that tests resolve. Consider which pressures have taught you something and which simply wear you down.',prompt:'Where does pressure sharpen you rather than diminish you?'},
    directOfficer:{theme:'Structure that asks for order',story:'Direct Officer controls the Day Master with the opposite polarity: traditionally read as duty, structure and the expectations that hold a life in shape. It is order accepted rather than imposed by force.',prompt:'Which structures in your life did you choose, and which did you inherit?'},
    indirectResource:{theme:'Support that arrives sideways',story:'Indirect Resource generates the Day Master while sharing its polarity: traditionally associated with unconventional help, private study and support that does not announce itself. It can nourish quietly, off the usual path.',prompt:'Where has help come from a direction you didn’t expect?'},
    directResource:{theme:'Care passed down a line',story:'Direct Resource generates the Day Master with the opposite polarity: traditionally linked to mentorship, learning and forms of care passed down in a clear line. It is support given openly, along a recognised line.',prompt:'Who passed something to you that you are now passing on?'}
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

  function attach(root) {
    // Composite and Davison are optional peers: without their scripts Two skies offers synastry alone.
    const relationshipReady = typeof RelationshipChartsEngine !== 'undefined' && typeof RelationshipCharts !== 'undefined' && typeof NatalChart !== 'undefined';
    const methodLabels = {synastry:'Synastry',composite:'Composite',davison:'Davison'};
    root.innerHTML = `<header class="cx-heading"><p class="acg-eyebrow">Three more perspectives</p><h3>A sky that keeps unfolding.</h3><p>Explore the present, the space between two people, and the four pillars of a birth moment.</p></header>
      <div class="cx-tabs" role="group" aria-label="Additional chart types"><button type="button" data-cx-tab="transits" aria-controls="cx-transits" aria-pressed="true"><span>☉</span>Your sky today<small>Planetary transits</small></button><button type="button" data-cx-tab="synastry" aria-controls="cx-synastry" aria-pressed="false"><span>☌</span>Two skies<small>Relationship chart</small></button><button type="button" data-cx-tab="bazi" aria-controls="cx-bazi" aria-pressed="false"><span>四</span>Four Pillars<small>BaZi · Chinese tradition</small></button></div>
      <div class="cx-profile-bar"><p class="cx-profile-status">Use your birth details above to make these charts personal.</p><button type="button" data-cx-sample>Try sample charts</button></div>
      <section id="cx-transits" class="cx-view"><div class="cx-view-heading"><div><p class="acg-small-label">Your sky today</p><h4>The moving sky meets your birth sky.</h4></div><div class="cx-date-controls"><button type="button" data-cx-day="-1" aria-label="Previous day">←</button><label for="cx-date" class="visually-hidden">Transit date</label><input id="cx-date" type="date" value="${today()}" min="1901-01-01" max="2100-12-31"><button type="button" data-cx-day="1" aria-label="Next day">→</button><button type="button" data-cx-today>Today</button></div></div><p class="cx-timing">A snapshot at 12:00 UTC on the selected day.</p><div id="cx-transit-output"></div></section>
      <section id="cx-synastry" class="cx-view" hidden><div class="cx-view-heading"><div><p class="acg-small-label" id="cx-synastry-label">Two skies · Synastry</p><h4>Make room for both stories.</h4><p>Compare your birth sky with a partner, friend or family member.</p></div></div><form id="cx-partner-form" class="cx-partner-form"><label>Other person’s birthday<input type="date" id="cx-partner-date" min="1901-01-01" max="${today()}" required></label><label>Recorded birth time<input type="time" id="cx-partner-time" required></label><div class="birthplace-field"><label for="cx-partner-place">Birthplace</label><div class="city-input-wrap"><input id="cx-partner-place" type="text" placeholder="Choose a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cx-partner-cities" aria-describedby="cx-partner-status"><div id="cx-partner-cities" class="city-suggestions" role="listbox" aria-label="Matching partner birthplaces" hidden></div></div><p id="cx-partner-status" class="city-search-status" role="status">Choose a matching city.</p></div><label id="cx-partner-fold-label" hidden>Repeated clock time<select id="cx-partner-fold"><option value="">Choose the occurrence</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label><details class="cx-custom-place"><summary>Use coordinates for an unlisted birthplace</summary><label class="cx-manual-toggle"><input type="checkbox" id="cx-partner-manual">Use these coordinates</label><fieldset id="cx-partner-coordinates" disabled><label>Latitude<input id="cx-partner-lat" type="number" min="-89.999" max="89.999" step="any" required></label><label>Longitude<input id="cx-partner-lon" type="number" min="-180" max="180" step="any" required></label><label>IANA time zone<input id="cx-partner-zone" type="text" placeholder="Europe/London" list="birth-timezones" required></label></fieldset></details><button type="submit" class="cx-primary">Compare our skies</button><p class="cx-partner-privacy">The second person’s details stay in this page; they are saved only if you save the chart.</p></form>${relationshipReady?`<div class="cx-method-switch" role="group" aria-label="How to read the two charts">${[['synastry','One sky against the other'],['composite','A chart of midpoints'],['davison','The sky between two births']].map(([key,line])=>`<button type="button" data-cx-method="${key}" aria-controls="cx-synastry-output" aria-pressed="${key==='synastry'}">${methodLabels[key]}<small>${line}</small></button>`).join('')}</div>`:''}<div id="cx-synastry-output" aria-live="polite"></div></section>
      <section id="cx-bazi" class="cx-view" hidden><div class="cx-view-heading"><div><p class="acg-small-label">BaZi · 八字</p><h4>Eight characters. Four pillars.</h4><p>A Chinese system of stems, branches and the five phases.</p></div></div><div id="cx-bazi-output"></div></section>`;
    const $ = selector=>root.querySelector(selector), partnerPicker=BirthplaceSearch.attach({input:$('#cx-partner-place'),list:$('#cx-partner-cities'),status:$('#cx-partner-status')});
    let savedChart=null, chart=null, partner=null, sample=false, tab='transits', method='synastry', transitModel=null, synastryModel=null, chosenTransit='', chosenSynastry='', pillarIndex=2, annualYear=null, contactFilter='all', phaseView='visible', openGod='', luckSex='both';
    const restored = ChartRooms.restoredGate();   // {kind, birth, partnerBirth|null} while a saved chart is open
    const KINDS = {synastry: 'Synastry', composite: 'Composite chart', davison: 'Davison chart', bazi: 'Four Pillars'};
    const missing = message=>`<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p><button type="button" data-cx-birth>Add birth details ↑</button></div>`;
    function profileStatus() {
      $('.cx-profile-status').textContent = sample ? 'Sample charts · illustrative birth details, not your personal charts.' : restored.active() ? `Saved chart · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected place'}` : chart ? `Your birth sky · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}` : 'Use your birth details above to make these charts personal.';
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
      if(method==='synastry') {renderComparison('synastry');return;}
      try {
        const model=RelationshipChartsEngine[method](chart,partner);
        $('#cx-synastry-output').innerHTML=model.status!=='ready'?`<p class="cx-error" role="alert">${esc(model.message)}</p>`:`${restoredBanner(method)}${RelationshipCharts.render(model,{wheel:m=>NatalChart.renderWheel(m,{kind:'point',key:'Sun'},false,true)})}${saveControl(method,ChartRooms.NOTES.two)}`;
      } catch(error) {$('#cx-synastry-output').innerHTML=`<p class="cx-error" role="alert">${esc(error.message)}</p>`;}
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
      $(`#cx-${mode}-output`).innerHTML=`${mode==='synastry'?restoredBanner(method):''}<div class="cx-comparison"><div class="cx-chart-art">${BiWheel.render({inner: first, outer: second, contact: diagramContact, labels})}<p class="cx-ring-key"><span>${sample?'Sample · ':''}${labels[0]}</span><span>${labels[1]}</span></p></div><div class="cx-contact-panel"><label for="cx-${mode}-filter">Explore contacts</label><select id="cx-${mode}-filter" data-cx-filter><option value="all" ${contactFilter==='all'?'selected':''}>All contacts · ${all.length}</option><option value="ease" ${contactFilter==='ease'?'selected':''}>Trines & sextiles</option><option value="contrast" ${contactFilter==='contrast'?'selected':''}>Squares & oppositions</option><option value="blend" ${contactFilter==='blend'?'selected':''}>Conjunctions</option></select><div class="cx-contact-list" role="group" aria-label="${transit?'Transit':'Relationship'} contacts">${filtered.map(item=>`<button type="button" data-cx-contact="${item.id}" data-cx-mode="${mode}" aria-pressed="${item.id===chosen}"><span>${item.a} ${item.symbol} ${item.b}<small>${item.type}</small></span><span>${item.orb.toFixed(2)}°<small>orb</small></span></button>`).join('')||'<p>No contacts in this filter. Try another filter or date.</p>'}</div><div class="cx-contact-reading" aria-live="polite">${c?`<p class="acg-small-label">${transit?`Current ${c.a} · birth ${c.b}`:`Your ${c.a} · their ${c.b}`}</p><h5>${text[0]}</h5><p>This brings together symbolism around ${planetThemes[c.a]} and ${planetThemes[c.b]}. ${text[1]}</p><blockquote>${text[2]}</blockquote>`:'<p>The complete planetary positions are still available below.</p>'}</div></div></div>
        <details class="cx-placements"><summary>Exact placements${transit?'':' & house overlays'}</summary><div class="cx-table-wrap"><table><thead><tr><th>Planet</th><th>${labels[0]}</th><th>${labels[1]}</th>${transit?'':'<th>Their planet in your house</th>'}</tr></thead><tbody>${first.map((p,i)=>`<tr><th>${p.symbol} ${p.name}</th><td>${p.sign} ${p.degrees}</td><td>${second[i].sign} ${second[i].degrees}</td>${transit?'':`<td>${model.overlays[i].house}</td>`}</tr>`).join('')}</tbody></table></div></details>
        <details class="cx-method"><summary>About this ${transit?'transit':'relationship'} chart</summary><p>${transit?'The outer ring shows the ten planets at 12:00 UTC on the selected day; the inner ring shows your birth positions. Contacts use the five major aspects within 2°. This daily snapshot does not locate exact event times, and the fast-moving Moon can change appreciably within a day.':'Two birth charts are compared using the ten planets and five major aspects. Maximum orbs are 6° for conjunctions, trines and oppositions, 4° for sextiles and 6° for squares. House overlays place the other person’s planets in your existing birth-chart houses. These are not compatibility scores.'}</p><p>Ring labels are spaced for readability; small dots mark exact longitudes. Symbolic interpretations support reflection and conversation, not predictions about events or relationships.</p></details>${mode==='synastry'?saveControl(method,ChartRooms.NOTES.two):''}`;
    }
    function renderBazi() {
      const model=CelestialExtrasEngine.bazi(chart);
      if(model.status!=='ready') {$('#cx-bazi-output').innerHTML=missing(model.message);return;}
      if(annualYear===null) {const now=new Date();let y=Math.min(2100,Math.max(1901,now.getFullYear()));if(y>1901&&now<CelestialExtrasEngine.annualPillar(chart,y).liChun)y--;annualYear=y;}
      const master=model.dayMaster, selected=model.pillars[pillarIndex], descriptions=['The year pillar is traditionally associated with ancestry, early surroundings and the wider world.','The month pillar follows the solar season and is traditionally associated with upbringing and daily responsibilities.','The day’s heavenly stem is the Day Master, the reference point for a BaZi reading. The day pillar is traditionally associated with self and close relationships.','The hour pillar is traditionally associated with aspirations, later chapters and what you pass on.'];
      const phase=phaseText[selected.stem[2]];
      const stemRow=(stemIdx,god,role)=>{const s=CelestialExtrasEngine.stems[stemIdx], g=god?CelestialExtrasEngine.gods[god]:null;return `<li><span class="cx-hanzi-small" lang="zh" style="color:${colors[s[2]]}">${s[0]}</span><span>${s[1]} · ${s[3]} ${s[2]}</span>${god?`<button type="button" data-cx-god="${god}" aria-pressed="${openGod===god}" aria-label="${g.english}, ${g.pinyin}: ${openGod===god?'hide its reflection':'show its reflection'}"><span lang="zh">${g.hanzi}</span> ${g.english}</button>`:`<em>${role}</em>`}</li>`;};
      const stemsList=`<div class="cx-stems"><p class="acg-small-label">Stems in this pillar</p><ul><li class="cx-stems-head"><span>Visible stem</span></li>${stemRow(selected.stemIndex,model.gods.stems[pillarIndex],'Day Master')}<li class="cx-stems-head"><span>Hidden stems of ${selected.branch[0]} ${selected.branch[1]}</span></li>${model.hidden[pillarIndex].map((s,i)=>stemRow(s,model.gods.hidden[pillarIndex][i],'')).join('')}</ul>${openGod&&godText[openGod]?`<aside class="cx-god-aside" aria-live="polite"><p class="acg-small-label">${CelestialExtrasEngine.gods[openGod].hanzi} · ${CelestialExtrasEngine.gods[openGod].pinyin} · ${CelestialExtrasEngine.gods[openGod].english}</p><h6>${godText[openGod].theme}</h6><p>${godText[openGod].story}</p><blockquote>${godText[openGod].prompt}</blockquote></aside>`:''}</div>`;
      const counts=phaseView==='hidden'?model.phasesHidden:model.phases, denominator=phaseView==='hidden'?model.hiddenTotal:8;
      const phaseChart=`<div class="cx-phase-chart"><div class="cx-phase-toggle" role="group" aria-label="Phase count view"><button type="button" data-cx-phase-view="visible" aria-pressed="${phaseView==='visible'}">Visible eight</button><button type="button" data-cx-phase-view="hidden" aria-pressed="${phaseView==='hidden'}">With hidden stems</button></div><p class="acg-small-label">Five phases · ${phaseView==='hidden'?`${denominator} characters including hidden stems`:'visible characters'}</p>${Object.entries(counts).map(([name,count])=>`<div><span>${name}</span><meter min="0" max="${denominator}" value="${count}" style="--phase-color:${colors[name]}" aria-label="${name}: ${count} of ${denominator}">${count}/${denominator}</meter><strong>${count}</strong></div>`).join('')}<p>${phaseView==='hidden'?'Four visible stems plus every hidden stem of the four branches. Still a count, not a strength or balance score.':'A count of eight visible stems and principal branch phases. This is not a strength or balance score.'}</p></div>`;
      const age=(()=>{const [y,m,d]=chart.birthday.split('-').map(Number), t=today().split('-').map(Number);let a=t[0]-y;if(t[1]<m||(t[1]===m&&t[2]<d))a--;return a;})();
      const boundaryDate=l=>{try{if(!chart.location?.timeZone) throw new Error('no time zone');return new Intl.DateTimeFormat('en-CA',{timeZone:chart.location.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(l.boundary.date));}catch{return new Date(l.boundary.date).toISOString().slice(0,10);}};
      const luckRow=sex=>{const l=CelestialExtrasEngine.luckPillars(chart,sex);const label=l.direction==='forward'?'Forward · traditional counting for a male born in a yang year or a female born in a yin year':'Backward · traditional counting for a female born in a yang year or a male born in a yin year';return `<div class="cx-luck-row"><p class="cx-luck-label">${luckSex==='both'?label:`${sex==='male'?'Male':'Female'}, traditional counting · ${l.direction}`}<small>Starts at age ${l.startAge.years} years ${l.startAge.months} months · ${l.startDays.toFixed(1)} days to the ${l.direction==='forward'?'next':'previous'} solar term (${l.boundary.longitude}°, ${boundaryDate(l)})</small></p><div class="cx-luck-scroll"><ol class="cx-luck-pillars">${l.pillars.map(p=>{const now=age>=p.fromAge&&age<p.fromAge+10, g=CelestialExtrasEngine.gods[p.god];return `<li class="${now?'is-now':''}" aria-label="Luck pillar ${p.index}: ${p.stem[1]} ${p.branch[1]}, from age ${p.fromAge}, ${p.fromYear}${now?', current':''}"><span class="cx-luck-age">${p.fromAge}${now?' · now':''}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.stem[2]]}">${p.stem[0]}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.branch[3]]}">${p.branch[0]}</span><span class="cx-pinyin">${p.stem[1]} ${p.branch[1]}</span><span class="cx-pinyin">${p.fromYear}–${p.fromYear+9}</span><span class="cx-luck-god" lang="zh">${g.hanzi}</span><span class="cx-pinyin">${g.english}</span></li>`;}).join('')}</ol></div></div>`;};
      const luckBlock=`<section class="cx-luck" aria-label="Luck pillars"><div class="cx-view-heading"><div><p class="acg-small-label">Luck pillars · 大運</p><h5>Ten-year chapters, counted from the month.</h5></div><label class="cx-luck-select">Count luck pillars as<select id="cx-luck-sex">${[['both','Show both directions'],['male','Male, traditional counting'],['female','Female, traditional counting']].map(([v,l])=>`<option value="${v}" ${luckSex===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${luckSex==='both'?luckRow('male')+luckRow('female'):luckRow(luckSex)}<p class="cx-luck-note">Tradition keys the direction to the sex recorded at birth; the site stores none, so this choice stays on the page. Each pillar steps the month pillar one place through the sixty-year cycle and lasts ten years; the first begins after the interval to the nearest solar-term boundary, counted at three days per year. Pillars are read as chapters for reflection, not as forecasts.</p></section>`;
      const annualBlock=`<section class="cx-annual" aria-label="Annual pillar"><div class="cx-view-heading"><div><p class="acg-small-label">Annual pillar · 流年</p><h5>One year’s stem and branch, counted from Li Chun.</h5><p>The annual pillar is the stem and branch of one solar year, read against the Day Master as a traditional association, not a forecast.</p></div><div class="cx-annual-controls" role="group" aria-label="Choose the year"><button type="button" data-cx-annual-step="-1" aria-label="Previous year">←</button><label for="cx-annual-year" class="visually-hidden">Solar year, 1901 to 2100</label><input id="cx-annual-year" type="number" data-cx-annual-year min="1901" max="2100" step="1" inputmode="numeric" value="${annualYear}"><button type="button" data-cx-annual-step="1" aria-label="Next year">→</button></div></div><div id="cx-annual-result" aria-live="polite">${annualResult()}</div></section>`;
      $('#cx-bazi-output').innerHTML=`${restoredBanner('bazi')}<div class="cx-bazi-master"><div><p class="acg-small-label">${sample?'Sample · ':''}Day Master</p><h5>${master[1]} · ${master[3]} ${master[2]}</h5><p>The heavenly stem of the day pillar.</p></div><span lang="zh" style="color:${colors[master[2]]}">${master[0]}</span></div><div class="cx-pillars" role="group" aria-label="Explore the Four Pillars">${model.pillars.map((p,i)=>`<button type="button" data-cx-pillar="${i}" aria-pressed="${i===pillarIndex}" aria-label="${p.label} pillar: ${p.stem[1]} ${p.branch[1]}, ${p.stem[3]} ${p.stem[2]}, ${p.branch[2]}"><span class="cx-pillar-label">${p.label}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.stem[2]]}">${p.stem[0]}</span><span class="cx-pinyin">${p.stem[1]} · ${p.stem[3]} ${p.stem[2]}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.branch[3]]}">${p.branch[0]}</span><span class="cx-pinyin">${p.branch[1]} · ${p.branch[2]}</span></button>`).join('')}</div><div class="cx-bazi-bottom"><div class="cx-pillar-reading" aria-live="polite"><p class="acg-small-label">${selected.label} pillar · ${selected.stem[1]} ${selected.branch[1]}</p><h5>${phase[0]}</h5><p>${descriptions[pillarIndex]} ${phase[1]}</p><blockquote>${phase[2]}</blockquote>${stemsList}</div>${phaseChart}</div>${model.nearSolarTerm?'<p class="cx-error" role="status">This birth moment is close to a solar-term boundary. A small birth-time or ephemeris difference may change the month or year pillar.</p>':''}${luckBlock}${annualBlock}<details class="cx-method"><summary>Four Pillars conventions & sources</summary><p>The year changes at Li Chun (Sun at 315°), and months at the twelve Jie solar-term boundaries, calculated for the actual birth instant. These boundaries differ from Lunar New Year. The day changes at 23:00 and hours use the recorded local civil clock in two-hour branches; no true-solar-time correction is applied. Other schools may use different day or clock conventions.</p><p>The phase count includes the eight visible characters, using each branch’s principal phase, or optionally every hidden stem within the branches. Hidden stems and Ten Gods are now shown alongside each pillar and remain symbolic; seasonal weighting and phase-strength scoring are not included. The Day Master’s phase is a traditional reference, not a measurement of personality or health.</p><p>See the Hong Kong Observatory’s <a href="https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm" target="_blank" rel="noopener">stems and branches</a> and <a href="https://www.hko.gov.hk/en/gts/time/24solarterms.htm" target="_blank" rel="noopener">solar terms</a>. Interpretations here are original prompts for reflection.</p></details>${saveControl('bazi',ChartRooms.NOTES.one)}`;
    }
    // Li Chun in the reader's own zone, labelled; dateStyle cannot be combined with timeZoneName.
    const liChunFormat=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
    function annualResult() {
      try {
        const a=CelestialExtrasEngine.annualPillar(chart,annualYear), p=a.pillar, g=CelestialExtrasEngine.gods[a.god], master=a.dayMaster;
        return `<div class="cx-annual-body"><div class="cx-annual-pillar"><span class="cx-pillar-label">${a.year}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.stem[2]]}">${p.stem[0]}</span><span class="cx-pinyin">${p.stem[1]} · ${p.stem[3]} ${p.stem[2]}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.branch[3]]}">${p.branch[0]}</span><span class="cx-pinyin">${p.branch[1]} · ${p.branch[2]}</span></div><div class="cx-annual-reading"><p class="acg-small-label">${a.year} pillar · ${p.stem[1]} ${p.branch[1]}</p><p class="cx-annual-begins">The ${a.year} pillar begins at Li Chun, ${liChunFormat.format(a.liChun)}, when the Sun reaches 315°.</p><p class="acg-small-label">Year stem · <span lang="zh">${g.hanzi}</span> · ${g.pinyin} · ${g.english}</p><h6>${godText[a.god].theme}</h6><p>The year stem ${p.stem[1]}, ${p.stem[3]} ${p.stem[2]}, stands as ${g.english} to a ${master[3]} ${master[2]} Day Master.</p><blockquote>${godText[a.god].prompt}</blockquote><div class="cx-stems"><p class="acg-small-label">Hidden stems of ${p.branch[0]} ${p.branch[1]}</p><ul>${a.hidden.map(h=>{const hg=CelestialExtrasEngine.gods[h.god];return `<li><span class="cx-hanzi-small" lang="zh" style="color:${colors[h.stem[2]]}">${h.stem[0]}</span><span>${h.stem[1]} · ${h.stem[3]} ${h.stem[2]}</span><em><span lang="zh">${hg.hanzi}</span> ${hg.english}</em></li>`;}).join('')}</ul></div></div></div>`;
      } catch(error) {return `<p class="cx-error" role="alert">${esc(error.message)}</p>`;}
    }
    // Year changes redraw only the result, so the input and step buttons keep focus (tabbing away from the input still works).
    function setAnnualYear(value) {annualYear=Math.min(2100,Math.max(1901,value));$('#cx-annual-year').value=annualYear;$('#cx-annual-result').innerHTML=annualResult();}
    function applyAnnualInput(input) {const v=Number(input.value);setAnnualYear(input.value.trim()!==''&&Number.isInteger(v)?v:annualYear);}
    function selectTab(name) {
      tab = name;
      root.querySelectorAll('[data-cx-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cxTab === tab)));
      root.querySelectorAll('.cx-view').forEach(panel => panel.hidden = panel.id !== `cx-${tab}`);
      renderActive();
    }
    function selectMethod(name) {
      method = name;
      root.querySelectorAll('[data-cx-method]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cxMethod === method)));
      $('#cx-synastry-label').textContent = `Two skies · ${methodLabels[method]}`;
    }
    const restoredBanner = kind => {
      if (!restored.active()) return '';
      const r = restored.get();
      const withPartner = kind !== 'bazi' && r.partnerBirth;
      return ChartRooms.banner(`Saved chart · cast for ${ChartRooms.describe(r.birth)}${withPartner ? ` and ${ChartRooms.describe(r.partnerBirth)}` : ''}`, {live: kind});
    };
    const saveControl = (kind, note) => sample ? '' : ChartRooms.saveControl(kind, note);
    function fillPartnerForm(birth) {
      $('#cx-partner-date').value = birth.date; $('#cx-partner-time').value = birth.time; $('#cx-partner-fold').value = birth.fold;
      $('#cx-partner-fold-label').hidden = !birth.fold;
      $('#cx-partner-place').value = birth.place.name; partnerPicker.restore(null);
      $('#cx-partner-manual').checked = true; $('#cx-partner-coordinates').disabled = false; $('.cx-custom-place').open = true;
      $('#cx-partner-lat').value = String(birth.place.lat); $('#cx-partner-lon').value = String(birth.place.lon); $('#cx-partner-zone').value = birth.place.tz;
    }
    function current(kind) {
      if (!chart || sample) return null;
      const birth = restored.active() ? restored.get().birth : ChartRooms.birthFromChart(chart);
      if (!birth) return null;
      if (kind === 'bazi') {
        const model = CelestialExtrasEngine.bazi(chart);
        if (model.status !== 'ready') return null;
        return ChartRooms.reading('bazi', {payload: {v: 1, birth, pillar: pillarIndex}, summary: ChartRooms.summaries.bazi(model), layout: 'four-pillars'});
      }
      if (kind !== method || !partner || partner.status !== 'ready' || synastryModel?.status !== 'ready') return null;
      const partnerBirth = restored.active() && restored.get().partnerBirth ? restored.get().partnerBirth : ChartRooms.birthFromChart(partner);
      if (!partnerBirth) return null;
      return ChartRooms.reading(kind, {payload: {v: 1, birth, partner: partnerBirth}, summary: ChartRooms.summaries.twoPerson(kind, birth, partnerBirth), layout: birth.houseSystem});
    }
    function load(kind, reading) {
      const payload = ChartRooms.validate(kind, reading?.payload);
      if (!payload) return false;
      const natal = ChartRooms.natalFrom(payload.birth);
      if (natal.status !== 'ready') return false;
      let partnerNatal = null;
      if (kind !== 'bazi') {
        if (kind !== 'synastry' && !relationshipReady) return false;
        partnerNatal = ChartRooms.natalFrom(payload.partner);
        if (partnerNatal.status !== 'ready') return false;
      }
      const before = {chart, partner, sample, tab, method, pillarIndex, openGod,
        partnerDate: $('#cx-partner-date').value, partnerTime: $('#cx-partner-time').value, partnerFold: $('#cx-partner-fold').value,
        partnerPlace: $('#cx-partner-place').value, partnerLat: $('#cx-partner-lat').value, partnerLon: $('#cx-partner-lon').value, partnerZone: $('#cx-partner-zone').value,
        partnerManual: $('#cx-partner-manual').checked, partnerCoordinatesDisabled: $('#cx-partner-coordinates').disabled, partnerFoldLabelHidden: $('#cx-partner-fold-label').hidden,
        partnerSelection: partnerPicker.getSelection(), partnerCustomOpen: $('.cx-custom-place').open};
      sample = false; chart = natal;
      restored.set({kind, birth: payload.birth, partnerBirth: kind === 'bazi' ? null : payload.partner});
      if (kind === 'bazi') { pillarIndex = payload.pillar; openGod = ''; profileStatus(); selectTab('bazi'); }
      else { partner = partnerNatal; fillPartnerForm(payload.partner); selectMethod(kind); profileStatus(); selectTab('synastry'); }
      const ok = kind === 'bazi' ? CelestialExtrasEngine.bazi(chart).status === 'ready'
        : kind === 'composite' || kind === 'davison' ? RelationshipChartsEngine[kind](chart, partner).status === 'ready'
        : synastryModel?.status === 'ready';
      if (!ok) {
        restored.clear(); ({chart, partner, sample, method, pillarIndex, openGod} = before);
        if (kind !== 'bazi') {
          selectMethod(method);
          $('#cx-partner-date').value = before.partnerDate; $('#cx-partner-time').value = before.partnerTime; $('#cx-partner-fold').value = before.partnerFold;
          $('#cx-partner-place').value = before.partnerPlace; $('#cx-partner-lat').value = before.partnerLat; $('#cx-partner-lon').value = before.partnerLon; $('#cx-partner-zone').value = before.partnerZone;
          $('#cx-partner-manual').checked = before.partnerManual; $('#cx-partner-coordinates').disabled = before.partnerCoordinatesDisabled; $('#cx-partner-fold-label').hidden = before.partnerFoldLabelHidden;
          partnerPicker.restore(before.partnerSelection); $('.cx-custom-place').open = before.partnerCustomOpen;
        }
        profileStatus(); selectTab(before.tab);
        return false;
      }
      if (typeof MobileSections !== 'undefined') MobileSections.reveal(root);
      return true;
    }
    function renderActive() { if(tab==='transits') renderTransits();else if(tab==='synastry') renderSynastry();else renderBazi(); }
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      const data=button.dataset;
      if('cxTab' in data) {selectTab(data.cxTab);}
      if('cxMethod' in data) {selectMethod(data.cxMethod);renderSynastry();button.focus({preventScroll:true});}
      if('cxBirth' in data) {document.querySelector('#birthday-input').focus();document.querySelector('#birthday-form').scrollIntoView({block:'center'});}
      if('cxSample' in data) {
        restored.clear();
        sample=!sample;chart=sample?NatalEngine.calculate(sampleA):savedChart;
        if(sample) {partner=NatalEngine.calculate(sampleB);$('#cx-partner-date').value=sampleB.birthday;$('#cx-partner-time').value=sampleB.time;$('#cx-partner-place').value=sampleB.location.label;$('#cx-partner-manual').checked=false;$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(sampleB.location);$('#cx-partner-fold').value='';$('#cx-partner-fold-label').hidden=true;}
        else {partner=null;$('#cx-partner-form').reset();$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(null);}
        profileStatus();renderActive();
      }
      if('chartLive' in data) {restored.clear();chart=savedChart;profileStatus();renderActive();root.querySelector(`#cx-${tab}-output [data-save-reading]`)?.focus({preventScroll:true});}
      if('cxDay' in data) {const d=new Date(`${$('#cx-date').value}T12:00:00Z`);if(Number.isFinite(+d)){d.setUTCDate(d.getUTCDate()+Number(data.cxDay));if(d.getUTCFullYear()>=1901&&d.getUTCFullYear()<=2100)$('#cx-date').value=d.toISOString().slice(0,10);renderTransits();}}
      if('cxToday' in data) {$('#cx-date').value=today();renderTransits();}
      if('cxContact' in data) {if(data.cxMode==='transit')chosenTransit=data.cxContact;else chosenSynastry=data.cxContact;const scroll=button.closest('.cx-contact-list').scrollTop;renderComparison(data.cxMode);const next=root.querySelector(`[data-cx-contact="${data.cxContact}"]`);next?.focus({preventScroll:true});if(next)next.closest('.cx-contact-list').scrollTop=scroll;}
      if('cxPillar' in data) {pillarIndex=Number(data.cxPillar);openGod='';renderBazi();root.querySelector(`[data-cx-pillar="${pillarIndex}"]`).focus({preventScroll:true});}
      if('cxPhaseView' in data) {phaseView=data.cxPhaseView;renderBazi();$(`[data-cx-phase-view="${phaseView}"]`).focus({preventScroll:true});}
      if('cxAnnualStep' in data) setAnnualYear(annualYear+Number(data.cxAnnualStep));
      if('cxGod' in data) {openGod=openGod===data.cxGod?'':data.cxGod;renderBazi();$(`[data-cx-god="${data.cxGod}"]`)?.focus({preventScroll:true});}
    });
    root.addEventListener('change',event=>{
      if(event.target.id==='cx-date')renderTransits();
      if(event.target.matches('[data-cx-filter]')) {contactFilter=event.target.value;const id=event.target.id;renderActive();$(`#${id}`).focus({preventScroll:true});}
      if(event.target.id==='cx-partner-manual')$('#cx-partner-coordinates').disabled=!event.target.checked;
      if(event.target.matches('[data-cx-annual-year]')) applyAnnualInput(event.target);
      if(event.target.id==='cx-luck-sex') {luckSex=event.target.value;renderBazi();$('#cx-luck-sex').focus({preventScroll:true});}
    });
    root.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-cx-annual-year]')){event.preventDefault();applyAnnualInput(event.target);}});
    $('#cx-partner-form').addEventListener('input',event=>{partner=null;$('#cx-synastry-output').innerHTML=`${restoredBanner(method)}<p class="cx-empty">Choose “Compare our skies” to use these details.</p>`;if(event.target.id!=='cx-partner-fold')$('#cx-partner-fold').value='';});
    $('#cx-partner-form').addEventListener('invalid',event=>{const detail=event.target.closest('details');if(detail)detail.open=true;},true);
    $('#cx-partner-form').addEventListener('submit',event=>{
      event.preventDefault();
      const location=$('#cx-partner-manual').checked?{latitude:Number($('#cx-partner-lat').value),longitude:Number($('#cx-partner-lon').value),timeZone:$('#cx-partner-zone').value.trim(),label:$('#cx-partner-place').value.trim()||'Custom birthplace'}:partnerPicker.getSelection();
      partner=NatalEngine.calculate({birthday:$('#cx-partner-date').value,time:$('#cx-partner-time').value,location,fold:$('#cx-partner-fold').value,houseSystem:chart?.houseSystem||'placidus'});
      $('#cx-partner-fold-label').hidden=partner.status!=='ambiguous'&&!partner.ambiguousTime;
      if(partner.status!=='ready') {$('#cx-synastry-output').innerHTML=`<p class="cx-error" role="alert">${esc(partner.message)}</p>`;return;}
      if (restored.active() && restored.get().partnerBirth) restored.set({...restored.get(), partnerBirth: null});
      renderSynastry();
    });
    function followChartLink() {
      const view = {'#cx-transits':'transits','#cx-synastry':'synastry','#cx-bazi':'bazi'}[location.hash];
      if (!view) return;
      selectTab(view);
      requestAnimationFrame(()=>root.scrollIntoView({block:'start'}));
    }
    window.addEventListener('hashchange',followChartLink);
    profileStatus();renderActive();followChartLink();
    if (typeof Rooms !== 'undefined') {
      for (const kind of ['synastry', 'composite', 'davison', 'bazi']) {
        Rooms.register(kind, {label: KINDS[kind], category: kind === 'bazi' ? 'eastern' : 'charts', current: () => current(kind), load: reading => load(kind, reading)});
      }
    }
    return {setBirthChart(value){savedChart=value?.status==='ready'?value:null;if(restored.active())return;chart=savedChart;if(sample){sample=false;partner=null;$('#cx-partner-form').reset();$('#cx-partner-coordinates').disabled=true;partnerPicker.restore(null);}profileStatus();renderActive();}};
  }
  return {attach};
})();
