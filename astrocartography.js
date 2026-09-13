/* Interactive world atlas. Libraries, geography and city searches are served locally. */
const Astrocartography = (() => {
  const planets = {
    Sun: {symbol:'☉', color:'#f4c66d', theme:'Presence & purpose', text:'The Sun symbolizes identity, creative vitality and the wish to be seen.', prompt:'Where do you feel most able to be yourself?'},
    Moon: {symbol:'☾', color:'#c7def5', theme:'Belonging & feeling', text:'The Moon symbolizes emotional rhythms, familiarity and the need for care.', prompt:'What makes a place feel like home to you?'},
    Mercury: {symbol:'☿', color:'#7bddc3', theme:'Ideas & exchange', text:'Mercury symbolizes language, curiosity, learning and everyday connections.', prompt:'What conversations would you like to begin here?'},
    Venus: {symbol:'♀', color:'#f5a1bd', theme:'Beauty & connection', text:'Venus symbolizes affection, aesthetics, pleasure and the things you value.', prompt:'What would a more nourishing daily life look like?'},
    Mars: {symbol:'♂', color:'#ff9078', theme:'Courage & momentum', text:'Mars symbolizes initiative, desire, assertiveness and how you meet resistance.', prompt:'What deserves your energy, and where do you need a boundary?'},
    Jupiter: {symbol:'♃', color:'#d7bbff', theme:'Growth & possibility', text:'Jupiter symbolizes exploration, learning, generosity and a wider perspective.', prompt:'What would you like to learn beyond what is familiar?'},
    Saturn: {symbol:'♄', color:'#cebe98', theme:'Structure & commitment', text:'Saturn symbolizes responsibility, patience, boundaries and sustained effort.', prompt:'What are you willing to build slowly?'},
    Uranus: {symbol:'♅', color:'#70d9ef', theme:'Freedom & discovery', text:'Uranus symbolizes independence, experimentation and departures from routine.', prompt:'Which part of your life could use a new approach?'},
    Neptune: {symbol:'♆', color:'#a9acfa', theme:'Imagination & mystery', text:'Neptune symbolizes dreams, compassion and the boundary between inspiration and idealization.', prompt:'How can you give an inspiring dream a practical shape?'},
    Pluto: {symbol:'♇', color:'#e2a8e3', theme:'Depth & renewal', text:'Pluto symbolizes transformation, power and the process of letting go.', prompt:'What would you like to release or understand more deeply?'}
  };
  const angles = {
    ASC:{name:'Rising', theme:'Self & beginnings', text:'The rising line brings that symbolism into reflection on self-expression and fresh starts.', dash:''},
    DSC:{name:'Setting', theme:'People & partnerships', text:'The setting line brings that symbolism into reflection on relationships and the qualities you encounter in others.', dash:'8 4'},
    MC:{name:'Culminating', theme:'Visibility & direction', text:'The upper-meridian line brings that symbolism into reflection on public life, contribution and direction.', dash:'2 4'},
    IC:{name:'Lower meridian', theme:'Home & roots', text:'The lower-meridian line brings that symbolism into reflection on privacy, home and your inner foundations.', dash:'10 4 2 4'}
  };
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sampleDate = '2000-01-01T12:00:00.000Z';
  let librariesPromise, geographyPromise, citiesPromise;
  function loadScript(src, name) {
    if (window[name]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = src;
      script.onload = resolve; script.onerror = () => { script.remove(); reject(Error('The map library could not load.')); };
      document.head.append(script);
    });
  }
  function libraries() {
    if (!librariesPromise) librariesPromise = Promise.all([loadScript('/vendor/d3/d3.min.js','d3'), loadScript('/vendor/topojson/topojson-client.min.js','topojson')]).catch(error => { librariesPromise = null; throw error; });
    return librariesPromise;
  }
  function json(url) { return fetch(url, {credentials:'omit'}).then(response => { if (!response.ok) throw Error('Map data unavailable.'); return response.json(); }); }
  function geography() {
    if (!geographyPromise) geographyPromise = json('/assets/maps/countries-110m.json').catch(error => { geographyPromise = null; throw error; });
    return geographyPromise;
  }
  function cities() {
    if (!citiesPromise) citiesPromise = json('/assets/cities/cities.json?v=1').then(data => BirthplaceSearch.prepare(data.cities)).catch(error => { citiesPromise = null; throw error; });
    return citiesPromise;
  }

  function attach(root) {
    root.innerHTML = `<header class="acg-heading"><div><p class="acg-eyebrow">Astrocartography · a world of possibility</p><h3 id="acg-title">Your sky,<br><em>across the world.</em></h3><p>The moment you were born, written across the Earth. Follow a planet. Find a place. Explore its story.</p></div><span class="acg-seal" aria-hidden="true">✧<small>THE WORLD<br>WITHIN YOUR SKY</small></span></header>
      <div class="acg-birth-banner"><div><span class="acg-mode-badge">Sample sky</span><p class="acg-birth-caption">A sample for 1 January 2000, 12:00 UTC. Add your birth details above for a personal map.</p></div><button type="button" data-acg-birth>Use my birth details ↑</button></div>
      <div class="acg-toolbar"><div class="acg-projections" role="group" aria-label="Map projection"><button type="button" data-acg-projection="globe" aria-pressed="true">Globe</button><button type="button" data-acg-projection="world" aria-pressed="false">World map</button></div><label class="acg-angle-label">Explore <select id="acg-angle"><option value="all">All four angles</option>${Object.entries(angles).map(([id,a])=>`<option value="${id}">${id} · ${a.name}</option>`).join('')}</select></label><button type="button" class="acg-all-planets">All planets</button></div>
      <div class="acg-planets" role="group" aria-label="Planets shown on map">${Object.entries(planets).map(([name,p])=>`<button type="button" data-acg-planet="${name}" style="--planet-color:${p.color}" aria-pressed="${['Sun','Venus','Jupiter'].includes(name)}"><span aria-hidden="true">${p.symbol}</span>${name}</button>`).join('')}</div>
      <div class="acg-explorer"><div class="acg-stage"><div class="acg-map-meta"><span class="acg-map-count">3 planets · 12 lines</span><span class="acg-map-identity">Sample sky</span></div>
        <svg class="acg-map" viewBox="0 0 900 700" tabindex="0" role="group" aria-label="Interactive astrocartography globe. Drag to rotate; arrow keys rotate; plus and minus zoom. Select a line with the controls or find a city." aria-describedby="acg-map-help"></svg>
        <div class="acg-loading" role="status">Opening the atlas…</div>
        <div class="acg-map-controls" role="group" aria-label="Map controls"><button type="button" data-acg-pan="-20" aria-label="Rotate west">←</button><button type="button" data-acg-pan="20" aria-label="Rotate east">→</button><button type="button" data-acg-zoom="in" aria-label="Zoom in">+</button><button type="button" data-acg-zoom="out" aria-label="Zoom out">−</button><button type="button" data-acg-reset aria-label="Reset map view">Reset</button><button type="button" data-acg-expand aria-pressed="false">Expand</button></div>
        <p id="acg-map-help">Drag to turn the globe · tap a place or a line</p>
      </div><aside class="acg-sidebar" aria-label="Explore a place and planetary line">
        <div class="acg-place-search"><label for="acg-city">Where are you drawn?</label><input id="acg-city" type="search" placeholder="Find a city…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="acg-city-results" aria-describedby="acg-city-status"><div id="acg-city-results" role="listbox" aria-label="Matching destinations" hidden></div><p id="acg-city-status" role="status">Search stays in your browser.</p></div>
        <div class="acg-destinations" aria-label="Places to explore"><button type="button" data-acg-place="Lisbon">Lisbon</button><button type="button" data-acg-place="Tokyo">Tokyo</button><button type="button" data-acg-place="New York">New York</button></div>
        <div class="acg-place-detail" aria-live="polite"><p class="acg-small-label">A place to begin</p><p>Find a city or tap the Earth to see the nearest displayed lines.</p></div>
        <label class="acg-line-label" for="acg-line">Read a planetary line</label><select id="acg-line"></select><div class="acg-line-detail" aria-live="polite"></div>
      </aside></div>
      <div class="acg-angle-key">${Object.entries(angles).map(([id,a])=>`<span><svg viewBox="0 0 30 8" aria-hidden="true"><path d="M0,4 H30" stroke-dasharray="${a.dash}"/></svg><strong>${id}</strong> ${a.theme}</span>`).join('')}</div>
      <details class="acg-method"><summary>How to read this map</summary><p>Each line marks where a planet was rising (ASC), setting (DSC), on the upper meridian (MC), or on the lower meridian (IC) at the selected birth instant. Colors identify planets; line patterns identify angles. Choose a line to read its symbolism, or a city to find the nearest lines currently displayed.</p><p>Planetary positions are calculated from the birth date, recorded time and birthplace time zone. An accurate birth time matters: even a few minutes moves the lines. This map uses geocentric positions with true planetary latitude and a geometric horizon; atmospheric refraction and parallax are excluded. It can differ from maps that project planets onto the ecliptic.</p><p>Distances are approximate shortest surface distances to a line, not ratings of a place or measures of an influence. Interpretations are invitations to reflect, not predictions or recommendations about where to move.</p><p>Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · Cities: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>, CC BY 4.0 · <a href="https://www.astro.com/faq/fq_fh_owspez_e.htm" target="_blank" rel="noopener">About angular maps</a>. Your birth details and city searches stay in this browser.</p></details>`;

    const $ = selector => root.querySelector(selector);
    const svg = $('.acg-map'), loading = $('.acg-loading'), cityInput = $('#acg-city'), resultsEl = $('#acg-city-results'), cityStatus = $('#acg-city-status');
    let model = AstrocartographyEngine.calculate(sampleDate), chart = null, selected = new Set(['Sun','Venus','Jupiter']);
    let kind = 'all', selectedLine = 'Venus-ASC', place = null, projectionType = 'globe', rotation = [20,-20,0], zoom = 1, worldOffset = [0,0];
    let mapData, projection, path, ready = false, starting = false, destroyed = false, frame = 0, cityTimer, queryVersion = 0, results = [], activeResult = -1;
    const visibleLines = () => model.lines.filter(line => selected.has(line.planet) && (kind === 'all' || line.kind === kind));

    function lineDetail() {
      const line = model.lines.find(line => line.id === selectedLine);
      if (!line) { $('.acg-line-detail').innerHTML = '<p>Choose a planet to explore its lines.</p>'; return; }
      const p = planets[line.planet], a = angles[line.kind];
      $('.acg-line-detail').innerHTML = `<div class="acg-line-heading" style="--planet-color:${p.color}"><span aria-hidden="true">${p.symbol}</span><div><p class="acg-small-label">${line.planet} · ${line.kind} / ${a.name}</p><h4>${p.theme}</h4></div></div><p>${p.text} ${a.text}</p><blockquote>${p.prompt}</blockquote>`;
    }
    function placeDetail() {
      if (!place) return;
      const nearest = AstrocartographyEngine.nearestLines(model, place, [...selected], kind === 'all' ? Object.keys(angles) : [kind]).slice(0,3);
      $('.acg-place-detail').innerHTML = `<p class="acg-small-label">${chart ? 'Your map' : 'Sample map'} · selected place</p><h4>${esc(place.name || 'A point on your map')}</h4><p class="acg-coordinates">${Math.abs(place.latitude).toFixed(2)}°${place.latitude < 0 ? 'S' : 'N'} · ${Math.abs(place.longitude).toFixed(2)}°${place.longitude < 0 ? 'W' : 'E'}</p><p class="acg-small-label">Nearest displayed lines</p><div class="acg-nearest">${nearest.map(line => `<button type="button" data-acg-line="${line.id}" style="--planet-color:${planets[line.planet].color}"><span>${planets[line.planet].symbol} ${line.planet} · ${line.kind}</span><small>~${Math.round(line.distanceKm).toLocaleString()} km</small></button>`).join('') || '<p>Select a planet to see nearby lines.</p>'}</div>`;
    }
    function controls() {
      const lines = visibleLines();
      if (!lines.some(line => line.id === selectedLine)) selectedLine = lines[0]?.id || '';
      $('#acg-line').innerHTML = lines.length ? lines.map(line => `<option value="${line.id}" ${line.id === selectedLine ? 'selected' : ''}>${line.planet} · ${line.kind} — ${angles[line.kind].name}</option>`).join('') : '<option value="">Select a planet first</option>';
      $('#acg-line').disabled = !lines.length;
      $('.acg-map-count').textContent = `${selected.size} ${selected.size === 1 ? 'planet' : 'planets'} · ${lines.length} lines`;
      root.querySelectorAll('[data-acg-planet]').forEach(button => button.setAttribute('aria-pressed', String(selected.has(button.dataset.acgPlanet))));
      $('.acg-all-planets').textContent = selected.size === 10 ? 'Focus essentials' : 'All planets';
      lineDetail(); placeDetail(); scheduleDraw();
    }
    function chooseLine(id) { selectedLine = id; $('#acg-line').value = id; lineDetail(); scheduleDraw(); }
    function setPlace(value, fly = true) {
      place = value;
      if (fly && projectionType === 'globe') rotation = [-place.longitude,-Math.max(-75,Math.min(75,place.latitude)),0];
      const closest = AstrocartographyEngine.nearestLines(model, place, [...selected], kind === 'all' ? Object.keys(angles) : [kind])[0];
      if (closest) chooseLine(closest.id);
      placeDetail(); scheduleDraw();
    }
    function scheduleDraw() { if (!ready || frame) return; frame = requestAnimationFrame(() => { frame = 0; draw(); }); }
    function draw() {
      if (!ready || destroyed) return;
      const d3 = window.d3;
      projection = projectionType === 'globe' ? d3.geoOrthographic().translate([450,350]).scale(286 * zoom).rotate(rotation).clipAngle(90) : d3.geoEqualEarth().translate([450+worldOffset[0],350+worldOffset[1]]).scale(158 * zoom);
      projection.clipExtent([[8,25],[892,675]]);
      path = d3.geoPath(projection);
      const lines = visibleLines(), sphere = path({type:'Sphere'});
      svg.innerHTML = `<defs><radialGradient id="acg-ocean" cx="32%" cy="27%" r="76%"><stop offset="0" stop-color="#173e50"/><stop offset=".6" stop-color="#0c2537"/><stop offset="1" stop-color="#061321"/></radialGradient><radialGradient id="acg-atmosphere"><stop offset=".9" stop-color="#5cccbc" stop-opacity="0"/><stop offset=".96" stop-color="#5cccbc" stop-opacity=".12"/><stop offset="1" stop-color="#5cccbc" stop-opacity="0"/></radialGradient><radialGradient id="acg-shade" cx="28%" cy="22%" r="85%"><stop offset=".4" stop-color="#010711" stop-opacity="0"/><stop offset="1" stop-color="#010711" stop-opacity=".65"/></radialGradient></defs>
        ${projectionType === 'globe' ? `<circle cx="450" cy="350" r="${312*zoom}" fill="url(#acg-atmosphere)"/><circle cx="450" cy="350" r="${302*zoom}" fill="none" stroke="#aeccb9" stroke-opacity=".2" stroke-dasharray="1 12"/>` : ''}
        <path d="${sphere}" fill="url(#acg-ocean)" stroke="#68a69e" stroke-opacity=".45"/>
        <path d="${path(mapData.land)}" fill="#214a52" stroke="#7eaaa0" stroke-width=".7" stroke-opacity=".58"/>
        <path d="${path(mapData.borders)}" fill="none" stroke="#a4b7a4" stroke-opacity=".15" stroke-width=".55"/>
        <path d="${path(d3.geoGraticule10())}" fill="none" stroke="#98c6c8" stroke-opacity=".12" stroke-width=".65"/>
        ${projectionType === 'globe' ? `<path d="${sphere}" fill="url(#acg-shade)" pointer-events="none"/>` : ''}
        ${lines.map(line => {
          const shape = path(line.geometry), active = line.id === selectedLine, color = planets[line.planet].color;
          return shape ? `<g data-acg-map-line="${line.id}"><title>${line.planet} · ${line.kind} — ${angles[line.kind].name}</title>${active ? `<path d="${shape}" fill="none" stroke="${color}" stroke-width="9" stroke-opacity=".12" pointer-events="none"/>` : ''}<path d="${shape}" fill="none" stroke="${color}" stroke-width="${active ? 2.6 : 1.35}" stroke-opacity="${active ? 1 : .68}" stroke-dasharray="${angles[line.kind].dash}"/><path d="${shape}" fill="none" stroke="transparent" stroke-width="12" class="acg-line-hit"/></g>` : '';
        }).join('')}${marker()}`;
    }
    function marker() {
      if (!place || (projectionType === 'globe' && window.d3.geoDistance([place.longitude,place.latitude],[-rotation[0],-rotation[1]]) > Math.PI/2)) return '';
      const point = projection([place.longitude,place.latitude]);
      if (!point) return '';
      return `<g pointer-events="none"><circle cx="${point[0]}" cy="${point[1]}" r="12" fill="#fff2cc" fill-opacity=".15" stroke="#fff2cc" stroke-opacity=".5"/><circle cx="${point[0]}" cy="${point[1]}" r="4" fill="#fff2cc"/><text x="${point[0]}" y="${point[1]-20}" text-anchor="middle" fill="#fff5df" font-size="14" paint-order="stroke" stroke="#081725" stroke-width="4">${esc(place.name || 'Selected place')}</text></g>`;
    }
    async function start() {
      if (ready || starting) return;
      starting = true; loading.hidden = false; loading.textContent = 'Opening the atlas…';
      try {
        const [, world] = await Promise.all([libraries(), geography()]);
        if (destroyed) return;
        mapData = {land:window.topojson.feature(world,world.objects.land), borders:window.topojson.mesh(world,world.objects.countries,(a,b)=>a!==b)};
        ready = true; loading.hidden = true; draw();
      } catch { loading.innerHTML = 'The map could not load. <button type="button" data-acg-retry>Try again</button>'; }
      finally { starting = false; }
    }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry=>entry.isIntersecting)) { start(); observer.disconnect(); } }, {rootMargin:'350px'});
    observer.observe(root);

    function closeResults() { queryVersion++; clearTimeout(cityTimer); resultsEl.hidden = true; results = []; activeResult = -1; cityInput.setAttribute('aria-expanded','false'); cityInput.removeAttribute('aria-activedescendant'); }
    function chooseCity(index) {
      const city = results[index]; if (!city) return;
      cityInput.value = city.label; closeResults(); cityStatus.textContent = `Exploring ${city.label}.`;
      setPlace({name:city.name,latitude:city.latitude,longitude:city.longitude}); cityInput.focus();
    }
    async function suggest() {
      const version = ++queryVersion, query = cityInput.value;
      if (query.trim().length < 2) { closeResults(); cityStatus.textContent = 'Search stays in your browser.'; return; }
      cityStatus.textContent = 'Finding cities…';
      try {
        const index = await cities();
        if (version !== queryVersion || document.activeElement !== cityInput || cityInput.value !== query) return;
        results = BirthplaceSearch.search(index,query); activeResult = -1;
        resultsEl.innerHTML = results.map((city,i)=>`<button type="button" tabindex="-1" role="option" aria-selected="false" id="acg-city-${i}" data-acg-city="${i}"><strong>${esc(city.name)}</strong><span>${esc([city.region,city.country].filter(Boolean).join(', '))}</span></button>`).join('');
        resultsEl.hidden = !results.length; cityInput.setAttribute('aria-expanded',String(!!results.length));
        cityStatus.textContent = results.length ? `${results.length} places. Use arrows and Enter to choose.` : 'No match. Try another name, or tap a point on the map.';
      } catch { if (version === queryVersion) { closeResults(); cityStatus.textContent = 'City search is unavailable. You can still tap a place on the map.'; } }
    }
    cityInput.addEventListener('input',()=>{ closeResults(); cityTimer = setTimeout(suggest,160); });
    cityInput.addEventListener('blur',closeResults);
    resultsEl.addEventListener('pointerdown',event=>event.preventDefault());
    cityInput.addEventListener('keydown',event=>{
      if (event.key === 'Escape') { closeResults(); return; }
      if (['ArrowDown','ArrowUp'].includes(event.key) && results.length) {
        event.preventDefault(); activeResult = (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        [...resultsEl.children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===activeResult)));
        cityInput.setAttribute('aria-activedescendant',`acg-city-${activeResult}`);
      }
      if (event.key === 'Enter' && results.length) { event.preventDefault(); chooseCity(Math.max(0,activeResult)); }
    });
    root.addEventListener('change',event=>{
      if (event.target.id === 'acg-angle') { kind = event.target.value; controls(); }
      if (event.target.id === 'acg-line') chooseLine(event.target.value);
    });
    root.addEventListener('click',async event=>{
      const button = event.target.closest('button'); if (!button) return;
      const data = button.dataset;
      if ('acgPlanet' in data) { selected.has(data.acgPlanet) ? selected.delete(data.acgPlanet) : selected.add(data.acgPlanet); controls(); }
      if (button.classList.contains('acg-all-planets')) { selected = new Set(selected.size === 10 ? ['Sun','Venus','Jupiter'] : Object.keys(planets)); controls(); }
      if ('acgProjection' in data) {
        projectionType = data.acgProjection; zoom = 1; worldOffset = [0,0];
        root.querySelectorAll('[data-acg-projection]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
        $('#acg-map-help').textContent = projectionType === 'globe' ? 'Drag to turn the globe · tap a place or a line' : 'Drag to pan · tap a place or a line';
        svg.setAttribute('aria-label',projectionType === 'globe' ? 'Interactive astrocartography globe. Drag or use arrow keys to rotate; plus and minus zoom.' : 'Interactive astrocartography world map. Drag or use arrow keys to pan; plus and minus zoom.');
        root.querySelectorAll('[data-acg-pan]').forEach(el=>el.disabled=projectionType!=='globe'); scheduleDraw();
      }
      if ('acgZoom' in data) { zoom = Math.max(.75,Math.min(2.5,zoom * (data.acgZoom === 'in' ? 1.2 : 1/1.2))); scheduleDraw(); }
      if ('acgPan' in data) { rotation[0] -= Number(data.acgPan); scheduleDraw(); }
      if ('acgReset' in data) { zoom = 1; worldOffset = [0,0]; rotation = chart ? [-chart.location.longitude,-Math.max(-65,Math.min(65,chart.location.latitude)),0] : [20,-20,0]; scheduleDraw(); }
      if ('acgExpand' in data) { const expanded = root.classList.toggle('acg-expanded'); button.setAttribute('aria-pressed',String(expanded)); button.textContent = expanded ? 'Collapse' : 'Expand'; }
      if ('acgLine' in data) chooseLine(data.acgLine);
      if ('acgCity' in data) chooseCity(Number(data.acgCity));
      if ('acgRetry' in data) start();
      if ('acgBirth' in data) { document.querySelector('#birthday-input').focus(); document.querySelector('#birthday-form').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }
      if ('acgPlace' in data) {
        const known = {Lisbon:{name:'Lisbon',latitude:38.7167,longitude:-9.1333},Tokyo:{name:'Tokyo',latitude:35.6895,longitude:139.6917},'New York':{name:'New York',latitude:40.7143,longitude:-74.006}};
        closeResults(); cityInput.value = data.acgPlace; cityStatus.textContent = `Exploring ${data.acgPlace}.`; setPlace(known[data.acgPlace]);
      }
    });
    let drag = null, suppressClick = false;
    svg.addEventListener('pointerdown',event=>{
      if (event.button !== 0 || !projection) return;
      drag = {id:event.pointerId,x:event.clientX,y:event.clientY,rotation:[...rotation],offset:[...worldOffset],moved:false,line:event.target.closest('[data-acg-map-line]')?.dataset.acgMapLine}; suppressClick = false;
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
      if (Math.hypot(dx,dy)>5) drag.moved=true;
      if (!drag.moved) return;
      const scale = 180 / Math.max(200,svg.getBoundingClientRect().width);
      if(projectionType === 'globe') rotation = [drag.rotation[0]+dx*scale,Math.max(-85,Math.min(85,drag.rotation[1]-dy*scale)),0];
      else worldOffset = [Math.max(-700,Math.min(700,drag.offset[0]+dx*scale*5)),Math.max(-500,Math.min(500,drag.offset[1]+dy*scale*5))];
      scheduleDraw();
    });
    svg.addEventListener('pointerup',event=>{ if (drag?.id === event.pointerId) { suppressClick = drag.moved; if(!drag.moved && drag.line) {chooseLine(drag.line);suppressClick=true;} drag = null; } });
    svg.addEventListener('pointercancel',()=>{drag=null;suppressClick=true;});
    svg.addEventListener('click',event=>{
      if (suppressClick) { suppressClick=false; return; }
      const line = event.target.closest('[data-acg-map-line]');
      if (line) { chooseLine(line.dataset.acgMapLine); return; }
      if (!projection) return;
      const rect = svg.getBoundingClientRect(), scale = Math.min(rect.width/900,rect.height/700);
      const p = [(event.clientX-rect.left-(rect.width-900*scale)/2)/scale,(event.clientY-rect.top-(rect.height-700*scale)/2)/scale];
      if (projectionType === 'globe' && Math.hypot(p[0]-450,p[1]-350)>286*zoom) return;
      const coordinate = projection.invert(p);
      if (!coordinate || coordinate.some(value=>!Number.isFinite(value)) || Math.abs(coordinate[1])>90) return;
      const projected = projection(coordinate);
      if (Math.hypot(projected[0]-p[0],projected[1]-p[1])>2) return;
      setPlace({longitude:AstrocartographyEngine.wrap(coordinate[0]),latitude:coordinate[1]},false);
    });
    svg.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { rotation=[20,-20,0];zoom=1;worldOffset=[0,0]; }
      if (['+','='].includes(event.key)) zoom=Math.min(2.5,zoom*1.2);
      if (event.key === '-') zoom=Math.max(.75,zoom/1.2);
      if (projectionType === 'globe') {
        if (event.key === 'ArrowLeft') rotation[0]+=15;
        if (event.key === 'ArrowRight') rotation[0]-=15;
        if (event.key === 'ArrowUp') rotation[1]=Math.min(85,rotation[1]+10);
        if (event.key === 'ArrowDown') rotation[1]=Math.max(-85,rotation[1]-10);
      } else {
        if (event.key === 'ArrowLeft') worldOffset[0]=Math.min(700,worldOffset[0]+35);
        if (event.key === 'ArrowRight') worldOffset[0]=Math.max(-700,worldOffset[0]-35);
        if (event.key === 'ArrowUp') worldOffset[1]=Math.min(500,worldOffset[1]+35);
        if (event.key === 'ArrowDown') worldOffset[1]=Math.max(-500,worldOffset[1]-35);
      }
      scheduleDraw();
    });
    controls();
    root.addEventListener('keydown',event=>{if(event.key==='Escape' && root.classList.contains('acg-expanded')) {root.classList.remove('acg-expanded');const button=$('[data-acg-expand]');button.setAttribute('aria-pressed','false');button.textContent='Expand';button.focus();}});
    return {
      setBirthChart(value) {
        chart = value?.status === 'ready' ? value : null;
        model = AstrocartographyEngine.calculate(chart?.date || sampleDate);
        $('.acg-mode-badge').textContent = chart ? 'Your birth sky' : 'Sample sky';
        $('.acg-map-identity').textContent = chart ? 'Your birth sky' : 'Sample sky';
        $('.acg-birth-caption').textContent = chart ? `${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}. Your map uses this recorded birth moment.` : `Sample: 1 January 2000, 12:00 UTC. ${value?.message || 'Add your birth date, time and birthplace above to see your map.'}`;
        $('[data-acg-birth]').textContent = chart ? 'Edit birth details ↑' : 'Use my birth details ↑';
        rotation = chart ? [-chart.location.longitude,-Math.max(-65,Math.min(65,chart.location.latitude)),0] : [20,-20,0]; zoom=1; worldOffset=[0,0];
        controls();
      },
      destroy() { destroyed=true;observer.disconnect();cancelAnimationFrame(frame);clearTimeout(cityTimer);queryVersion++; }
    };
  }
  return {attach};
})();
