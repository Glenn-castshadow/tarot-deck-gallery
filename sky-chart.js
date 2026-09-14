/* Shared zoom explorer for the symbolic zodiac guide and calculated natal chart. */
const SkyChart = (() => {
  const point = (radius,angle) => [260+radius*Math.cos(angle*Math.PI/180),260+radius*Math.sin(angle*Math.PI/180)];
  const glyph = symbol => `${symbol}\uFE0E`;
  function render(signs,birthName,selectedName=birthName,interactive=false) {
    const selected=signs.find(sign=>sign.name===selectedName) || signs[0];
    const ticks=Array.from({length:72},(_,i)=>{
      const a=point(i%6===0?224:232,i*5), b=point(240,i*5);
      return `<line class="wheel-tick${i%6===0?' major':''}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
    }).join('');
    const sectors=signs.map((sign,i)=>{
      const angle=-90+i*30, outerStart=point(220,angle-15),outerEnd=point(220,angle+15),innerStart=point(171,angle-15),innerEnd=point(171,angle+15), label=point(197,angle);
      const isBirth=sign.name===birthName, isSelected=sign.name===selectedName;
      return `<g class="wheel-sector${isBirth?' birth-sign':''}${isSelected?' selected-sign':''}"${interactive?` role="button" tabindex="0" data-sky-sign="${i}" aria-label="Inspect ${sign.name}${isBirth?', your sun sign':''}" aria-pressed="${isSelected}"`:''}><path class="wheel-sector-fill" d="M${outerStart} A220 220 0 0 1 ${outerEnd} L${innerEnd} A171 171 0 0 0 ${innerStart} Z"/><text class="wheel-sign-glyph" x="${label[0]}" y="${label[1]-2}">${glyph(sign.symbol)}</text><text class="wheel-sign-name" x="${label[0]}" y="${label[1]+16}">${sign.name}</text>${isBirth?`<circle class="wheel-birth-dot" cx="${point(247,angle)[0]}" cy="${point(247,angle)[1]}" r="4"/>`:''}</g>`;
    }).join('');
    const geometry=[0,1].map(offset=>`<polygon class="wheel-geometry" points="${[0,1,2].map(i=>point(148,-90+offset*60+i*120).join(',')).join(' ')}"/>`).join('');
    return `<svg class="zodiac-wheel" viewBox="0 0 520 520" ${interactive?'role="group" aria-label="Explore the twelve zodiac signs"':'aria-hidden="true"'}><circle class="wheel-edge" cx="260" cy="260" r="252"/><circle class="wheel-ring" cx="260" cy="260" r="221"/>${ticks}${sectors}<circle class="wheel-ring" cx="260" cy="260" r="170"/>${geometry}<circle class="wheel-inner" cx="260" cy="260" r="132"/><circle class="wheel-ring" cx="260" cy="260" r="119"/><text class="wheel-center-label" x="260" y="188">${selectedName===birthName?'YOUR SUN SIGN':'EXPLORING'}</text><text class="wheel-center-glyph" x="260" y="280">${glyph(selected.symbol)}</text><text class="wheel-center-name" x="260" y="322">${selected.name}</text><text class="wheel-center-element" x="260" y="349">${selected.element.toUpperCase()} · ${selected.modality.toUpperCase()}</text><path class="wheel-spark" d="M260 365v17m-8-8h16"/></svg>`;
  }
  function attach({dialog,signs,themes}) {
    const canvas=dialog.querySelector('.sky-zoom-canvas'), viewport=dialog.querySelector('.sky-zoom-viewport'), detail=dialog.querySelector('.sky-sign-detail');
    let birthName,selectedName,zoom=100,opener,natalModel=null,natalSelection={kind:'point',key:'Sun'};
    const exportButton=dialog.querySelector('[data-natal-export]'),aspectToggle=dialog.querySelector('#sky-show-aspects'),minorToggle=dialog.querySelector('#sky-show-minor-aspects');
    const label=dialog.querySelector('#sky-zoom-level'), plus=dialog.querySelector('[data-sky-zoom="in"]'), minus=dialog.querySelector('[data-sky-zoom="out"]');
    function setZoom(value) {
      const oldSize=parseFloat(canvas.style.width) || Math.min(viewport.clientWidth,viewport.clientHeight); zoom=Math.max(100,Math.min(300,value));
      const size=Math.min(viewport.clientWidth,viewport.clientHeight)*zoom/100;
      const centerX=viewport.scrollLeft+viewport.clientWidth/2,centerY=viewport.scrollTop+viewport.clientHeight/2;
      canvas.style.width=`${size}px`; label.value=`${zoom}%`; label.textContent=`${zoom}%`;
      plus.disabled=zoom===300; minus.disabled=zoom===100;
      if(zoom===100) { viewport.scrollLeft=0; viewport.scrollTop=0; }
      else { viewport.scrollLeft=centerX*size/oldSize-viewport.clientWidth/2; viewport.scrollTop=centerY*size/oldSize-viewport.clientHeight/2; }
    }
    function paint() {
      if(natalModel) {
        canvas.innerHTML=NatalChart.renderWheel(natalModel,natalSelection,true,aspectToggle.checked,minorToggle.checked);minorToggle.disabled=!aspectToggle.checked;
        const choice=(kind,key,text)=>`<option value="${kind}:${key}"${natalSelection.kind===kind&&natalSelection.key===String(key)?' selected':''}>${text}</option>`;
        detail.innerHTML=`<label class="natal-detail-picker">Explore a placement or house<select id="natal-detail-select"><optgroup label="Planets & chart angles">${[...natalModel.points,...natalModel.axes].map(point=>choice('point',point.name,`${point.name} · ${point.sign}`)).join('')}</optgroup><optgroup label="Houses">${natalModel.cusps.map((cusp,index)=>choice('house',String(index+1),`House ${index+1}`)).join('')}</optgroup><optgroup label="Aspects">${[...natalModel.aspects,...(minorToggle.checked?natalModel.minorAspects||[]:[])].map(aspect=>choice('aspect',aspect.id,`${aspect.a} ${aspect.type.toLowerCase()} ${aspect.b}`)).join('')}</optgroup></select></label>${NatalChart.detail(natalModel,natalSelection)}`;
        return;
      }
      const index=signs.findIndex(sign=>sign.name===selectedName), sign=signs[index], next=signs[(index+1)%signs.length];
      const format=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'});
      const range=`${format.format(new Date(Date.UTC(2024,sign.start[0]-1,sign.start[1])))} – ${format.format(new Date(Date.UTC(2024,next.start[0]-1,next.start[1]-1)))}`;
      canvas.innerHTML=render(signs,birthName,selectedName,true);
      detail.innerHTML=`<p class="reading-label">${selectedName===birthName?'Your sun sign':'Exploring the zodiac'}</p><h3>${sign.name}</h3><p class="sky-sign-dates">${range} · approximate solar dates</p><dl><div><dt>Element</dt><dd>${sign.element}</dd></div><div><dt>Quality</dt><dd>${sign.modality}</dd></div><div><dt>Ruler</dt><dd>${sign.ruler}</dd></div><div><dt>Mantra</dt><dd>${sign.mantra}</dd></div></dl><p>${sign.horoscope}</p><p class="sky-explorer-prompt"><strong>A moment for reflection</strong>${themes[sign.name][2]}</p>`;
    }
    function inspect(event) {
      const natalPoint=event.target.closest('[data-natal-kind]');
      if(natalModel && natalPoint) {
        if(event.type==='keydown' && !['Enter',' '].includes(event.key)) return;
        if(event.type==='keydown') event.preventDefault();
        natalSelection={kind:natalPoint.dataset.natalKind,key:natalPoint.dataset.natalKey};paint();
        canvas.querySelector(`[data-natal-kind="${natalSelection.kind}"][data-natal-key="${natalSelection.key}"]`)?.focus({preventScroll:true});
        return;
      }
      const sector=event.target.closest('[data-sky-sign]');
      if(!sector || (event.type==='keydown' && !['Enter',' '].includes(event.key))) return;
      if(event.type==='keydown') event.preventDefault();
      const index=Number(sector.dataset.skySign); selectedName=signs[index].name; paint();
      canvas.querySelector(`[data-sky-sign="${index}"]`).focus({preventScroll:true});
    }
    canvas.addEventListener('click',inspect); canvas.addEventListener('keydown',inspect);
    dialog.querySelector('[data-close-sky]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog) dialog.close();});
    dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
    dialog.querySelectorAll('[data-sky-zoom]').forEach(button=>button.addEventListener('click',()=>setZoom(button.dataset.skyZoom==='fit'?100:zoom+(button.dataset.skyZoom==='in'?25:-25))));
    new ResizeObserver(()=>{if(dialog.open) setZoom(zoom);}).observe(viewport);
    exportButton.addEventListener('click',()=>{if(natalModel) NatalChart.download(natalModel,natalSelection,aspectToggle.checked,minorToggle.checked);});
    aspectToggle.addEventListener('change',paint);
    const isMinor=selection=>selection.kind==='aspect'&&Boolean(natalModel?.minorAspects?.some(aspect=>aspect.id===selection.key));
    // Hiding the minors while one is selected would leave the picker and wheel without it.
    minorToggle.addEventListener('change',()=>{if(!minorToggle.checked&&isMinor(natalSelection)) natalSelection={kind:'point',key:'Sun'};paint();});
    detail.addEventListener('change',event=>{if(event.target.id==='natal-detail-select'){const [kind,key]=event.target.value.split(':');natalSelection={kind,key};paint();detail.querySelector('#natal-detail-select').focus({preventScroll:true});}});
    function openWindow(button) {opener=button;exportButton.hidden=!natalModel;aspectToggle.closest('label').hidden=!natalModel;minorToggle.closest('label').hidden=!natalModel;paint();dialog.showModal();setZoom(100);}
    return {
      open(name,button) {
        natalModel=null;birthName=name;selectedName=name;
        dialog.querySelector('#sky-dialog-title').textContent='Explore your sky';
        dialog.querySelector('.sky-chart-legend').textContent='Select a zodiac sign to explore it. Zoom in, then scroll or swipe to move around.';
        dialog.querySelector('.sky-explorer-note').textContent='A symbolic zodiac guide. Add birth time and a selected city to calculate your natal chart.';
        openWindow(button);
      },
      openNatal(model,button,selection={kind:'point',key:'Sun'}) {
        natalModel=model;natalSelection=selection;aspectToggle.checked=true;minorToggle.checked=isMinor(selection);
        dialog.querySelector('#sky-dialog-title').textContent='Your natal chart';
        dialog.querySelector('.sky-chart-legend').textContent='Select a planet or house for its interpretation. Zoom in, then scroll or swipe to move around.';
        dialog.querySelector('.sky-explorer-note').textContent=`Tropical zodiac · ${NatalChart.systemNames[model.houseSystem]} houses · ${model.timeZone} · ${model.date.slice(0,16).replace('T',' ')} UTC. Mean lunar nodes. Interpretations are for reflection.`;
        openWindow(button);
      }
    };
  }
  return {render,attach,glyph};
})();
