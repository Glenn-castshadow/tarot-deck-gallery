(() => {
  'use strict';
  const D=DivinationData, E=DivinationEngine, art=DivinationArt.emblem;
  const root=document.querySelector('#divination-room');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const artPath=(kind,id,large=false)=>`assets/divination-v2/${large?'large/':''}${kind}-${typeof id==='number'?String(id).padStart(2,'0'):id}.webp`;
  function visual(kind,item,large=false) {
    if(kind==='iching') return `<span class="dv-artwork dv-artwork-figure">${art(kind,item)}</span>`;
    return `<span class="dv-artwork"><img src="${artPath(kind,item.id,large)}" alt="" loading="lazy" decoding="async" width="${kind==='runes'||kind==='geomancy'?768:960}" height="${kind==='runes'||kind==='geomancy'?960:1536}">${kind==='runes'||kind==='geomancy'?`<span class="dv-exact-symbol">${art(kind,item)}</span>`:''}</span>`;
  }
  const artDialog=document.createElement('dialog');
  artDialog.className='dv-art-dialog'; artDialog.setAttribute('aria-label','Divination artwork'); document.body.append(artDialog);
  let artOpener=null,artSelection=null;
  function showArt(kind,id,back=false) {
    const item=(kind==='geomancy'?D.figures:kind==='iching'?D.hexagrams:D[kind])[id]; artSelection={kind,id};
    artDialog.dataset.practice=kind;
    artDialog.innerHTML=`<header><h2>${back?modes[kind].name+' · Back':item.name}</h2><button type="button" data-dv-close aria-label="Close artwork">×</button></header><div class="dv-art-sides" role="group" aria-label="Card side"><button type="button" data-dv-side="front" aria-pressed="${!back}">Face</button>${kind!=='geomancy'&&kind!=='iching'?`<button type="button" data-dv-side="back" aria-pressed="${back}">Back</button>`:''}</div><div class="dv-art-large" role="img" aria-label="${back?modes[kind].name+' ornamental back':item.name+' illustrated face'}">${back?`<span class="dv-artwork"><img src="${artPath(kind,'back',true)}" alt="" width="${kind==='runes'?768:960}" height="${kind==='runes'?960:1536}"></span>`:visual(kind,item,true)}</div><p>${back?'The shared back for this collection.':item.keyword+' · '+item.prompt}</p>`;
    if(!artDialog.open) artDialog.showModal();
  }
  artDialog.addEventListener('click',event=>{
    if(event.target.closest('[data-dv-close]')||event.target===artDialog) artDialog.close();
    const side=event.target.closest('[data-dv-side]');
    if(side) {showArt(artSelection.kind,artSelection.id,side.dataset.dvSide==='back');artDialog.querySelector(`[data-dv-side="${side.dataset.dvSide}"]`).focus();}
  });
  artDialog.addEventListener('close',()=>{if(artOpener?.isConnected) artOpener.focus({preventScroll:true});});
  const modes={
    lenormand:{name:'Lenormand',tag:'36 familiar symbols',title:'A small line. A connected story.',intro:'A message, a crossroads, a place to belong. Read these everyday symbols together, letting neighboring cards qualify one another.',options:[[3,'Three-card line'],[5,'Five-card line']],verb:'Lay the cards',note:'Petit Lenormand uses 36 cards. This room offers upright three- and five-card lines, without a significator preselected. The middle card is the focus; adjacent pairs and mirrored ends offer context. Man and Woman retain their traditional names but can represent relevant people of any gender. Interpretations are original. The illustrated faces and shared ornamental back were created for Ishtar Insights using GPT Image 2.',source:'<a href="https://www.usgamesinc.com/tarot-and-inspiration/all-products/dreaming-way-lenormand.html" target="_blank" rel="noopener">Publisher reference: Petit Lenormand and line readings</a>'},
    oracle:{name:'Oracle cards',tag:'24 original Ishtar cards',title:'An image to carry into your day.',intro:'Enter a quiet collection of lanterns, thresholds and small beginnings. Each card offers a reflection and one question to take with you.',options:[[1,'One-card reflection'],[3,'Notice · Nourish · Practice']],verb:'Draw your oracle',note:'The Ishtar Reflection Oracle is an original 24-card deck created for this site, with original writing and illustrations created using GPT Image 2. Oracle decks have no universal card list. These one- and three-card layouts are our own reflective practices, with no reversed meanings or claims of an ancient lineage.',source:''},
    runes:{name:'Runes',tag:'24 Elder Futhark signs',title:'A mark. A pause. A direction.',intro:'Draw from the Elder Futhark and spend time with a single theme, or explore a three-rune conversation about your situation and response.',options:[[1,'One-rune contemplation'],[3,'Situation · Tension · Response']],verb:'Draw the runes',note:'The Elder Futhark is a 24-character historical writing system. Rune names are conventional modern spellings of reconstructed names. These divinatory meanings and spreads are modern reflective interpretations, not a reconstruction of an ancient casting ritual. No blank rune or reversed meanings are used. Exact vector rune marks sit over stone artwork created using GPT Image 2.',source:'<a href="https://natmus.dk/historisk-viden/temaer/runer/runer-i-jernalderen/" target="_blank" rel="noopener">National Museum of Denmark: the 24-character rune row</a>'},
    geomancy:{name:'Geomancy',tag:'16 figures · a full shield',title:'Let the points form a pattern.',intro:'Four mother figures generate a complete shield. Follow the pattern from its first marks through two witnesses to the judge and reconciler.',options:[],verb:'Cast the shield',note:'This shield follows the parity method: transpose the four mothers to form daughters, then combine adjacent pairs row by row (odd totals become one point, even totals two). Nieces form witnesses; witnesses form the judge. The reconciler combines the first mother and judge. Puer is 1121 and Puella 1211 here; historical naming conventions vary. The shield is not an astrological house chart. Exact dot patterns sit over ornamental plaques created using GPT Image 2.',source:'<a href="https://www.princeton.edu/~ezb/geomancy/geostep.html" target="_blank" rel="noopener">Princeton: shield construction</a> · <a href="https://www.princeton.edu/~ezb/geomancy/figures.html" target="_blank" rel="noopener">Historical figure conventions</a>'},
    iching:{name:'I Ching',tag:'64 hexagrams · coins or yarrow',title:'Six lines. A figure in motion.',intro:'Cast six lines from the bottom up. Read the hexagram they form, notice which lines are changing, and let the figure they turn into extend the reflection.',options:[],verb:'Cast the hexagram',note:'The I Ching (Yijing) is a Chinese classic of sixty-four six-line figures. This room casts with the three-coin method by default (each coin counts two or three; totals of six and nine are changing lines) or with the yarrow-stalk probabilities (1/16, 5/16, 7/16 and 3/16 for six, seven, eight and nine). Hexagram names and the King Wen order are traditional; every gloss, meaning and prompt here is original. Individual line statements are not reproduced; each changing line is read through its position instead.',source:'<a href="https://www.unicode.org/charts/PDF/U4DC0.pdf" target="_blank" rel="noopener">Unicode chart: the sixty-four hexagram symbols in King Wen order</a>'}
  };
  const states=Object.fromEntries(Object.keys(modes).map(key=>[key,{count:key==='lenormand'?3:1,question:'',reading:null,revealed:new Set(),study:0,manual:false,mothers:Array.from({length:4},()=>[2,2,2,2]),method:'coins',lines:[7,7,7,7,7,7]}]));
  const lineName=v=>({6:'old yin, changing',7:'young yang',8:'young yin',9:'old yang, changing'})[v];
  let mode='lenormand';
  function items() {return mode==='geomancy'?D.figures:mode==='iching'?D.hexagrams:D[mode];}
  function positions(n) {
    if(mode==='oracle') return n===1?['Your reflection']:['Notice','Nourish','Practice'];
    if(mode==='runes') return n===1?['Your theme']:['Situation','Tension','Response'];
    return n===3?['Opening context','Focus','Closing context']:['Outer context','Near context','Focus','Near context','Outer context'];
  }
  function positionMeaning(i,n) {
    if(mode==='oracle') return n===1?'Carry this reflection into an ordinary moment today.':['Notice where this theme is already present.','Consider what care or support this theme could use.','Translate this theme into one manageable action.'][i];
    if(mode==='runes') return n===1?'Use this theme as a question to live with, rather than an answer you must obey.':['Read this as a lens on the circumstances you are meeting.','Consider what this theme asks you to examine or balance.','Find a response you can choose and carry out.'][i];
    return i===Math.floor(n/2)?'The center is the subject of this line. Let its neighbors qualify the picture.':'Read this card in connection with its neighbor, rather than as an isolated prediction.';
  }
  function render() {
    const c=modes[mode],s=states[mode]; root.dataset.practice=mode;
    root.style.setProperty('--dv-back',mode==='iching'?'none':`url("${artPath(mode,mode==='geomancy'?0:'back')}")`);
    root.innerHTML=`<header class="dv-header"><div><p class="section-kicker">Cards &amp; divination</p><h2 id="divination-title">Five ways to listen closely.</h2><p>Choose a practice. Make a little room for what you notice.</p></div><span class="dv-seal" aria-hidden="true">✧</span></header>
      <div class="dv-tabs" role="group" aria-label="Divination practices">${Object.entries(modes).map(([key,v],i)=>`<button type="button" data-dv-mode="${key}" aria-pressed="${key===mode}" aria-controls="dv-practice"><span>0${i+1}</span>${v.name}<small>${v.tag}</small></button>`).join('')}</div>
      <div id="dv-practice"><div class="dv-intro"><p class="dv-kicker">${c.tag}</p><h3>${c.title}</h3><p>${c.intro}</p></div>
      <div class="dv-controls"><label class="dv-question-label" for="dv-question">A question to hold <span>optional · stays on this page</span><input id="dv-question" maxlength="240" value="${esc(s.question)}" placeholder="What would help me see this more clearly?"></label>${mode==='iching'?`<label for="dv-method">Casting method<select id="dv-method"><option value="coins" ${s.method==='coins'?'selected':''}>Three coins</option><option value="yarrow" ${s.method==='yarrow'?'selected':''}>Yarrow-stalk probabilities</option></select></label>`:mode!=='geomancy'?`<label for="dv-layout">Reading layout<select id="dv-layout">${c.options.map(([n,label])=>`<option value="${n}" ${s.count===n?'selected':''}>${label}</option>`).join('')}</select></label>`:''}<button type="button" class="dv-draw" data-dv-draw>${s.reading?'Begin a new reading':c.verb} <span aria-hidden="true">↗</span></button></div>
      ${mode==='geomancy'?`<details class="dv-method"><summary>Make your own starting figures</summary><p>Optionally make sixteen uncounted rows of marks on paper. Reduce each row to one point for an odd count or two for an even count, then enter four rows for each mother. Or let the cast button generate the starting points.</p><label class="dv-manual-label"><input type="checkbox" id="dv-manual" ${s.manual?'checked':''}> Use the starting figures below</label><div class="dv-mothers">${s.mothers.map((m,i)=>`<fieldset><legend>Mother ${i+1}</legend>${m.map((v,j)=>`<button type="button" data-dv-point="${i},${j}" aria-label="Mother ${i+1}, row ${j+1}: ${v} ${v===1?'point':'points'}. Toggle points.">${v===1?'●':'● ●'}</button>`).join('')}</fieldset>`).join('')}</div></details>`:''}${mode==='iching'?`<details class="dv-method"><summary>Cast with your own coins</summary><p>Toss three coins six times, bottom line first, counting two for tails and three for heads. Enter each total below, then cast.</p><label class="dv-manual-label"><input type="checkbox" id="dv-manual" ${s.manual?'checked':''}> Use the lines below</label><div class="dv-lines">${s.lines.map((v,i)=>`<button type="button" data-dv-line="${i}" aria-label="Line ${i+1}: ${lineName(v)}. Change.">${i+1} · ${v} · ${lineName(v)}</button>`).join('')}</div></details>`:''}
      <p class="dv-status" role="status" aria-live="polite"></p><div class="dv-output"></div>
      <details class="dv-method"><summary>About this practice &amp; how to read it</summary><p>${c.note}</p>${c.source?`<p>${c.source}</p>`:''}<p>Symbols offer prompts for reflection, not verified predictions. These readings stay in this page while you explore other practices; reloading clears them. Editing a question or layout applies to the next draw.</p></details>
      <details class="dv-library"><summary>Explore all ${items().length} ${mode==='runes'?'runes':mode==='geomancy'?'figures':mode==='iching'?'hexagrams':'cards'}</summary><p>Choose a symbol to study its meaning without drawing a reading.</p><div class="dv-library-grid">${items().map((item,i)=>`<button type="button" data-dv-study="${i}" aria-pressed="${s.study===i}">${visual(mode,item)}<span>${mode==='iching'?`${item.number} · ${item.name}`:item.name}</span></button>`).join('')}</div><article class="dv-study" tabindex="-1"></article></details></div>`;
    output(); study();
  }
  function study() {
    const item=items()[states[mode].study];
    if(mode==='iching') {
      const tri=sym=>D.trigrams.find(t=>t.symbol===sym), lower=tri(item.symbol.slice(0,3)), upper=tri(item.symbol.slice(3));
      root.querySelector('.dv-study').innerHTML=`<p class="dv-kicker">${item.number} · ${item.keyword}</p><h4><span lang="zh">${item.character}</span> ${item.name}</h4><p class="dv-position-note">${item.gloss}</p><p>${upper.name} ${upper.character} above, ${lower.name} ${lower.character} below.</p><p>${item.meaning}</p><blockquote>${item.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${item.id}">View the figure</button>`;
      return;
    }
    root.querySelector('.dv-study').innerHTML=`<p class="dv-kicker">${item.keyword}</p><h4>${item.name}</h4><p>${item.meaning}</p><blockquote>${item.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${item.id}">View artwork</button>`;
  }
  function output() {
    const out=root.querySelector('.dv-output'),s=states[mode],r=s.reading;
    if(!r) {
      out.innerHTML=`<div class="dv-welcome"><div class="dv-back-fan" aria-hidden="true"><i>✧</i><i>${mode==='runes'?'ᚷ':mode==='geomancy'?'⠿':'✧'}</i><i>✧</i></div><p>${mode==='geomancy'?'A pattern is waiting to take shape.':mode==='iching'?'Six lines are waiting to be cast.':'Take a breath before the first reveal.'}</p><small>${mode==='geomancy'?'Cast sixteen starting rows, then explore how the shield unfolds.':mode==='iching'?'Use the draw button above, or enter your own coin totals below.':'Use the draw button above. Turn each card or rune when you are ready.'}</small>${mode!=='geomancy'&&mode!=='iching'?'<button type="button" class="dv-view-art" data-dv-art="0" data-dv-back>Explore the artwork</button>':''}</div>`; return;
    }
    if(mode==='geomancy') { shieldOutput(out,r); return; }
    if(mode==='iching') { hexagramOutput(out,r); return; }
    const cards=r.ids.map(id=>items()[id]),labels=positions(cards.length),all=s.revealed.size===cards.length;
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<div class="dv-spread" data-count="${cards.length}">${cards.map((card,i)=>`<div class="dv-card-place"><span class="dv-position">${i+1} / ${labels[i]}</span><button type="button" class="dv-card ${s.revealed.has(i)?'is-revealed':''}" data-dv-reveal="${i}" aria-label="${s.revealed.has(i)?'Enlarge '+card.name:'Reveal '+(mode==='runes'?'rune':'card')+' '+(i+1)+': '+labels[i]}">${s.revealed.has(i)?`<span class="dv-card-number">${String(card.id+1).padStart(2,'0')}</span>${visual(mode,card)}<strong>${card.name}</strong><small>${card.keyword}</small>`:`<span class="dv-card-back" aria-hidden="true">✧</span><span class="dv-turn">Tap to reveal</span>`}</button></div>`).join('')}</div>
      ${!all?'<div class="dv-reveal-controls"><button type="button" data-dv-next>Reveal next</button><button type="button" data-dv-all>Reveal all</button></div>':''}
      <div class="dv-readings">${cards.map((card,i)=>s.revealed.has(i)?`<article id="dv-reading-${i}" tabindex="-1"><p class="dv-kicker">${labels[i]} · ${card.keyword}</p><h4>${card.name}</h4><p class="dv-position-note">${positionMeaning(i,cards.length)}</p><p>${card.meaning}</p><blockquote>${card.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${card.id}">View artwork</button></article>`:'').join('')}</div>${all?summary(cards):'<p class="dv-pending">Reveal the remaining symbols to read the whole pattern.</p>'}${saveControl()}`;
  }
  function summary(cards) {
    if(cards.length===1) return `<aside class="dv-synthesis"><p class="dv-kicker">Take it into your day</p><h4>Make ${cards[0].keyword.toLowerCase()} concrete.</h4><p>Choose one small action in response to this question: ${cards[0].prompt} Notice what changes through your action, rather than waiting for the symbol to prove itself.</p></aside>`;
    if(mode==='lenormand') {
      const middle=cards[Math.floor(cards.length/2)];
      const pairs=cards.slice(0,-1).map((a,i)=>`<li><strong>${a.name} + ${cards[i+1].name}</strong><p>Explore ${a.keyword.toLowerCase()} through the lens of ${cards[i+1].keyword.toLowerCase()}. How does the second theme change your understanding of the first?</p></li>`).join('');
      return `<aside class="dv-synthesis"><p class="dv-kicker">Reading the line</p><h4>${middle.name} at the center.</h4><p>Begin with ${middle.keyword.toLowerCase()}. The line opens with ${cards[0].name} (${cards[0].keyword.toLowerCase()}) and closes with ${cards.at(-1).name} (${cards.at(-1).keyword.toLowerCase()}). Use these as context around the center, not a fixed sequence of future events.</p><ul>${pairs}</ul><p><strong>Mirror the ends:</strong> ${cards[0].name} and ${cards.at(-1).name} frame the question.${cards.length===5?` Then compare ${cards[1].name} and ${cards[3].name}, the two cards closest to the center.`:''} Which connection best matches what you can actually observe?</p><blockquote>${middle.prompt}</blockquote></aside>`;
    }
    return `<aside class="dv-synthesis"><p class="dv-kicker">The symbols in conversation</p><h4>${cards[0].keyword}. ${cards[1].keyword}. ${cards[2].keyword}.</h4><p>${mode==='runes'?`Start with ${cards[0].name} as a lens on the situation. Let ${cards[1].name} name a tension to examine, then use ${cards[2].name} to consider your response.`:`Notice the theme of ${cards[0].name}, offer care to what ${cards[1].name} brings up, and make ${cards[2].name} your practice.`}</p><p>These symbols need not agree. Look for where ${cards[0].keyword.toLowerCase()} supports or complicates ${cards[1].keyword.toLowerCase()}. Choose an action that honors what you learn from both.</p><blockquote>${cards[2].prompt}</blockquote></aside>`;
  }
  function saveControl() {
    return window.IshtarAccount?.state().signedIn ? '<p class="save-reading"><button type="button" data-save-reading="divination">Save this reading to my journal</button><span role="status" aria-live="polite"></span></p>' : '';
  }
  window.DivinationRoom = {
    currentDraw() {
      const s = states[mode], r = s.reading;
      if (!r) return null;
      if (mode === 'geomancy') return {kind: 'geomancy', deck: '', layout: 'shield', question: r.question || '', focus: '', payload: {mothers: r.chart.mothers, selected: r.selected}};
      if (mode === 'iching') return {kind: 'iching', deck: '', layout: r.method, question: r.question || '', focus: '', payload: {lines: r.lines}};
      return {kind: mode, deck: '', layout: String(r.ids.length), question: r.question || '', focus: '', payload: {ids: r.ids}};
    },
    loadDraw(reading) {
      const kind = reading?.kind, p = reading?.payload;
      if (!Object.hasOwn(modes, kind) || !p) return false;
      const s = states[kind];
      if (kind === 'geomancy') {
        let chart; try { chart = E.shield(p.mothers); } catch { return false; }
        s.reading = {chart, selected: Number.isInteger(p.selected) && p.selected >= 0 && p.selected < 16 ? p.selected : 14, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.mothers = chart.mothers.map(f => [...f]); s.manual = true;
      } else if (kind === 'iching') {
        const lines = E.loadLines(p.lines);
        if (!lines) return false;
        s.reading = {lines, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : '', method: ['coins', 'yarrow', 'manual'].includes(reading.layout) ? reading.layout : 'coins'};
        s.lines = [...lines]; s.manual = reading.layout === 'manual'; s.method = s.reading.method === 'manual' ? s.method : s.reading.method;
      } else {
        const loaded = E.loadIds(p.ids, D[kind].length);
        if (!loaded) return false;
        s.reading = {ids: loaded.ids, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.count = modes[kind].options.some(([n]) => n === loaded.ids.length) ? loaded.ids.length : s.count;
        s.revealed = loaded.revealed;
      }
      s.question = s.reading.question;
      mode = kind; render();
      (window.MobileSections?.reveal(root) || root).scrollIntoView({behavior: 'smooth', block: 'start'});
      return true;
    }
  };
  document.addEventListener('ishtar-account-change', () => output());
  const figure=points=>D.figures.find(f=>f.symbol===points.join(''));
  function shieldOutput(out,r) {
    const s=states.geomancy,chart=r.chart;
    const labels=[...Array.from({length:4},(_,i)=>`Mother ${i+1}`),...Array.from({length:4},(_,i)=>`Daughter ${i+1}`),...Array.from({length:4},(_,i)=>`Niece ${i+1}`),'Right witness','Left witness','Judge','Reconciler'];
    const f=figure(chart.all[r.selected]);
    const cell=i=>{const item=figure(chart.all[i]);return `<button type="button" class="dv-shield-cell" data-dv-figure="${i}" aria-pressed="${r.selected===i}"><small>${labels[i]}</small>${visual('geomancy',item)}<strong>${item.name}</strong><span class="sr-only">Rows top to bottom: ${item.symbol.split('').join(', ')} points.</span></button>`;};
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<p class="dv-shield-hint">Read each row from right to left. Select any figure to explore it.</p><div class="dv-shield"><div class="dv-shield-row">${[0,1,2,3,4,5,6,7].map(cell).join('')}</div><div class="dv-shield-row">${[8,9,10,11].map(cell).join('')}</div><div class="dv-shield-row">${[12,13].map(cell).join('')}</div><div class="dv-shield-row">${cell(14)}</div><div class="dv-shield-row">${cell(15)}</div></div><article class="dv-figure-reading" tabindex="-1"><p class="dv-kicker">${labels[r.selected]} · ${f.keyword}</p><h4>${f.name}</h4><p>${f.meaning}</p><blockquote>${f.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${f.id}">View artwork</button></article><aside class="dv-synthesis"><p class="dv-kicker">The shield gathered</p><h4>${figure(chart.judge).name}: ${figure(chart.judge).keyword.toLowerCase()}.</h4><p>The right witness, ${figure(chart.witnesses[0]).name}, develops the first four figures. The left witness, ${figure(chart.witnesses[1]).name}, develops the daughters. Their combination produces the judge, ${figure(chart.judge).name}.</p><p>Read ${figure(chart.witnesses[0]).keyword.toLowerCase()} alongside ${figure(chart.witnesses[1]).keyword.toLowerCase()}. The judge offers a theme to reflect on; it does not pronounce a factual verdict. The reconciler, ${figure(chart.reconciler).name}, brings that theme back to the first mother.</p><blockquote>${figure(chart.reconciler).prompt}</blockquote></aside>${saveControl()}`;
  }
  function hexagramOutput(out,r) {
    const read=E.readLines(r.lines,D.hexagrams), h=D.hexagrams[read.primary], rel=read.relating===null?null:D.hexagrams[read.relating];
    const tri=sym=>D.trigrams.find(t=>t.symbol===sym), lower=tri(h.symbol.slice(0,3)), upper=tri(h.symbol.slice(3));
    const figure=(hex,values,label)=>`<figure class="dv-hexagram-figure"><div class="dv-hexagram-art" role="img" aria-label="${label}: ${hex.name}, hexagram ${hex.number}">${values?DivinationArt.hexagram(values):DivinationArt.hexagramFromSymbol(hex.symbol)}</div><figcaption><span lang="zh">${hex.character}</span><strong>${hex.number} · ${hex.name}</strong><small>${hex.gloss}</small></figcaption></figure>`;
    const changing=read.changing.map(i=>{const p=D.linePositions[i];return `<article class="dv-line-reading"><p class="dv-kicker">Line ${i+1} · ${r.lines[i]===9?'old yang becoming yin':'old yin becoming yang'} · ${p.title}</p><p>${p.text}</p></article>`;}).join('');
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<div class="dv-hexagram-pair">${figure(h,r.lines,'Cast hexagram')}${rel?figure(rel,null,'Relating hexagram'):''}</div>
      <div class="dv-readings"><article tabindex="-1"><p class="dv-kicker">${upper.image} over ${lower.image} · ${h.keyword}</p><h4>${h.number} · ${h.name} <span lang="zh">${h.character}</span></h4><p class="dv-position-note">${upper.name} ${upper.character} above, ${lower.name} ${lower.character} below.</p><p>${h.meaning}</p><blockquote>${h.prompt}</blockquote></article>
      ${read.changing.length?`<p class="dv-kicker">${read.changing.length===1?'One changing line':read.changing.length+' changing lines'}</p>${changing}<article class="dv-relating"><p class="dv-kicker">Where this may be moving · ${rel.keyword}</p><h4>${rel.number} · ${rel.name} <span lang="zh">${rel.character}</span></h4><p>${rel.meaning}</p><blockquote>${rel.prompt}</blockquote></article>`:'<p class="dv-pending">No line is changing: the figure stands as it is. Sit with the primary hexagram.</p>'}</div>${saveControl()}`;
  }
  root.addEventListener('input',event=>{if(event.target.id==='dv-question') states[mode].question=event.target.value;});
  root.addEventListener('change',event=>{
    if(event.target.id==='dv-layout') states[mode].count=Number(event.target.value);
    if(event.target.id==='dv-method') states.iching.method=event.target.value;
    if(event.target.id==='dv-manual') states[mode].manual=event.target.checked;
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button) return;
    if(button.dataset.dvMode) {mode=button.dataset.dvMode;render();root.querySelector(`[data-dv-mode="${mode}"]`).focus({preventScroll:true});return;}
    const s=states[mode];
    if(button.hasAttribute('data-dv-art')) {artOpener=button;showArt(mode,Number(button.dataset.dvArt),button.hasAttribute('data-dv-back'));return;}
    if(button.hasAttribute('data-dv-point')) {
      const [i,j]=button.dataset.dvPoint.split(',').map(Number);s.mothers[i][j]=s.mothers[i][j]===1?2:1;
      button.textContent=s.mothers[i][j]===1?'●':'● ●';button.setAttribute('aria-label',`Mother ${i+1}, row ${j+1}: ${s.mothers[i][j]} points. Toggle points.`);
      s.manual=true;root.querySelector('#dv-manual').checked=true;return;
    }
    if(button.hasAttribute('data-dv-line')) {
      const i=Number(button.dataset.dvLine),next={7:8,8:9,9:6,6:7}[s.lines[i]];
      s.lines[i]=next;
      button.textContent=`${i+1} · ${next} · ${lineName(next)}`;button.setAttribute('aria-label',`Line ${i+1}: ${lineName(next)}. Change.`);
      s.manual=true;root.querySelector('#dv-manual').checked=true;return;
    }
    if(button.hasAttribute('data-dv-draw')) {
      try {
        s.reading=mode==='geomancy'?{chart:s.manual?E.shield(s.mothers):E.cast(),selected:14,question:s.question}:mode==='iching'?{lines:s.manual?[...s.lines]:E.castHexagram(s.method),question:s.question,method:s.manual?'manual':s.method}:{ids:E.draw(items().length,s.count),question:s.question};
        s.revealed.clear();output();button.innerHTML='Begin a new reading <span aria-hidden="true">↗</span>';
        root.querySelector('.dv-status').textContent=mode==='geomancy'?'Your shield is cast. Select a figure to read it.':mode==='iching'?'Six lines cast. Read the hexagram below.':`${s.count} ${mode==='runes'?'runes':'cards'} laid face down. Reveal them below.`;
      } catch {root.querySelector('.dv-status').textContent='The draw could not be completed. Please try again in a browser with secure random support.';}
      return;
    }
    if(button.hasAttribute('data-dv-study')) {s.study=Number(button.dataset.dvStudy);root.querySelectorAll('[data-dv-study]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dvStudy)===s.study)));study();root.querySelector('.dv-study').focus({preventScroll:true});root.querySelector('.dv-study').scrollIntoView({block:'nearest',behavior:'instant'});return;}
    if(button.hasAttribute('data-dv-figure')) {s.reading.selected=Number(button.dataset.dvFigure);output();root.querySelector(`[data-dv-figure="${s.reading.selected}"]`).focus({preventScroll:true});root.querySelector('.dv-status').textContent=`Selected ${figure(s.reading.chart.all[s.reading.selected]).name}. Interpretation below the shield.`;return;}
    if(!s.reading || mode==='geomancy' || mode==='iching') return;
    let index;
    if(button.hasAttribute('data-dv-reveal')) index=Number(button.dataset.dvReveal);
    else if(button.hasAttribute('data-dv-next')) index=s.reading.ids.findIndex((_,i)=>!s.revealed.has(i));
    else if(button.hasAttribute('data-dv-all')) {s.reading.ids.forEach((_,i)=>s.revealed.add(i));index=0;}
    else return;
    if(s.revealed.has(index) && button.hasAttribute('data-dv-reveal')) {artOpener=button;showArt(mode,s.reading.ids[index]);return;}
    s.revealed.add(index);output();root.querySelector(`[data-dv-reveal="${index}"]`).focus({preventScroll:true});
    root.querySelector('.dv-status').textContent=`${s.revealed.size} of ${s.reading.ids.length} revealed. ${items()[s.reading.ids[index]].name}: ${items()[s.reading.ids[index]].keyword}.`;
  });
  render();
})();
