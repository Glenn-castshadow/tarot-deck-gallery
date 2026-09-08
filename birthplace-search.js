/* GeoNames city suggestions are searched locally; no typed query leaves the browser. */
const BirthplaceSearch = (() => {
  const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  function prepare(rows) {
    return rows.map(([id,name,region,country,countryCode,adminCode,latitude,longitude,timeZone,population,aliases]) => ({
      id,name,region,country,countryCode,latitude,longitude,timeZone,population,
      label:[name,region,country].filter(Boolean).filter((part,index,all) => all.indexOf(part)===index).join(', '),
      names:[...new Set([name,...(aliases || [])].map(normalize))],
      area:normalize([region,country,countryCode,countryCode==='US'?adminCode:''].join(' '))
    }));
  }
  function search(cities, query, limit=6) {
    const [name,...qualifiers] = String(query).split(',').map(normalize);
    if (name.length < 2) return [];
    const hits = [];
    for (const city of cities) {
      if (!qualifiers.every(part => !part || city.area.includes(part))) continue;
      let rank = Infinity;
      for (let index=0; index<city.names.length; index++) {
        const candidate = city.names[index];
        if (candidate===name) rank = Math.min(rank, index===0 ? 0 : 1);
        else if (candidate.startsWith(name)) rank = Math.min(rank, index===0 ? 2 : 3);
        else if (`${candidate} ${city.area}`.startsWith(name)) rank = Math.min(rank, 4);
      }
      if (rank < Infinity) hits.push({city,rank});
    }
    return hits.sort((a,b) => a.rank-b.rank || b.city.population-a.city.population || a.city.id-b.city.id).slice(0,limit).map(hit => hit.city);
  }
  function attach({input,list,status}) {
    const wrapper = input.closest('.birthplace-field');
    let citiesPromise, timer, request=0, results=[], active=-1, selected=null;
    const initialMessage = 'Choose a city, or keep your own place name.';
    function close() {
      clearTimeout(timer); request++; results=[]; active=-1;
      list.hidden=true; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant');
      status.textContent=selected?.label===input.value.trim() ? `Selected ${selected.label}.` : initialMessage;
    }
    function load() {
      if (!citiesPromise) citiesPromise = fetch('assets/cities/cities.json?v=1', {credentials:'omit'}).then(response => {
        if (!response.ok) throw Error('City index unavailable');
        return response.json();
      }).then(data => {
        if (!Array.isArray(data.cities)) throw Error('Invalid city index');
        return prepare(data.cities);
      }).catch(error => { citiesPromise=null; throw error; });
      return citiesPromise;
    }
    function activate(index) {
      active=index;
      [...list.children].forEach((option,i) => option.setAttribute('aria-selected',String(i===index)));
      const option=list.children[index];
      if (option) { input.setAttribute('aria-activedescendant',option.id); option.scrollIntoView({block:'nearest'}); }
    }
    function choose(index) {
      const city=results[index];
      if (!city) return;
      selected={geonameId:city.id,name:city.name,region:city.region,country:city.country,countryCode:city.countryCode,latitude:city.latitude,longitude:city.longitude,timeZone:city.timeZone,label:city.label};
      input.value=city.label; close(); status.textContent=`Selected ${city.label}.`; input.focus();
    }
    async function suggest() {
      const current=++request, query=input.value;
      if (normalize(query).length<2) { close(); status.textContent=initialMessage; return; }
      status.textContent='Finding cities…';
      try {
        const cities=await load();
        if (current!==request || document.activeElement!==input || input.value!==query) return;
        results=search(cities,query); active=-1; list.replaceChildren(); input.removeAttribute('aria-activedescendant');
        results.forEach((city,index) => {
          const option=document.createElement('button'); option.type='button'; option.tabIndex=-1;
          option.id=`birth-city-${index}`; option.dataset.cityIndex=index; option.setAttribute('role','option'); option.setAttribute('aria-selected','false');
          const title=document.createElement('strong'); title.textContent=city.name;
          const area=document.createElement('span'); area.textContent=[city.region,city.country].filter(Boolean).join(', ');
          option.append(title,area); list.append(option);
        });
        list.hidden=!results.length; input.setAttribute('aria-expanded',String(!!results.length));
        status.textContent=results.length ? `${results.length} suggestions. Use arrow keys and Enter, or choose a city.` : 'No matching city in this index. You can keep your own place name.';
      } catch {
        if (current===request && document.activeElement===input) { close(); status.textContent='Suggestions unavailable. You can enter your city manually.'; }
      }
    }
    input.addEventListener('input',event => {
      selected=null; close(); status.textContent=initialMessage;
      if (!event.isComposing) timer=setTimeout(suggest,160);
    });
    input.addEventListener('compositionend',() => { clearTimeout(timer); timer=setTimeout(suggest,160); });
    input.addEventListener('focus',() => { if (!selected && normalize(input.value).length>=2) suggest(); });
    input.addEventListener('keydown',event => {
      if (event.isComposing) return;
      if (event.key==='Escape') { event.preventDefault(); close(); }
      else if (event.key==='Tab') close();
      else if (event.key==='ArrowDown' || event.key==='ArrowUp') {
        if (!results.length) { if(normalize(input.value).length>=2) { event.preventDefault(); clearTimeout(timer); suggest(); } return; }
        event.preventDefault(); activate(event.key==='ArrowDown' ? (active+1)%results.length : (active<=0 ? results.length-1 : active-1));
      } else if (event.key==='Enter' && active>=0) { event.preventDefault(); choose(active); }
    });
    list.addEventListener('click',event => { const option=event.target.closest('[data-city-index]'); if(option) choose(Number(option.dataset.cityIndex)); });
    wrapper.addEventListener('focusout',event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    document.addEventListener('pointerdown',event => { if (!wrapper.contains(event.target)) close(); });
    input.form.addEventListener('submit',close);
    return {
      getSelection:() => selected?.label===input.value.trim() ? selected : null,
      async resolveSaved() {
        const original=input.value,version=request;
        // Only migrate an old city + region/country entry when it has one exact match.
        if(selected || !original.includes(',')) return null;
        try {
          const cities=await load(),name=normalize(original.split(',')[0]);
          if(input.value!==original || request!==version || selected) return null;
          const matches=search(cities,original,20).filter(city=>city.names.includes(name));
          if(matches.length!==1) return null;
          const city=matches[0];
          selected={geonameId:city.id,name:city.name,region:city.region,country:city.country,countryCode:city.countryCode,latitude:city.latitude,longitude:city.longitude,timeZone:city.timeZone,label:city.label};
          input.value=city.label;status.textContent=`Selected ${city.label}.`;
          return selected;
        } catch {return null;}
      },
      restore(value) {
        selected=value && value.label===input.value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude)<=90 && Math.abs(value.longitude)<=180 ? value : null;
        if(selected) status.textContent=`Selected ${selected.label}.`;
      }
    };
  }
  return {normalize,prepare,search,attach};
})();
if (typeof module!=='undefined' && module.exports) module.exports=BirthplaceSearch;
