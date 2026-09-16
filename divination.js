(() => {
  'use strict';
  const D=DivinationData, E=DivinationEngine, art=DivinationArt.emblem, PC=PlayingCards;
  const root=document.querySelector('#divination-room');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const artPath=(kind,id,large=false)=>`/assets/divination-v2/${large?'large/':''}${kind}-${typeof id==='number'?String(id).padStart(2,'0'):id}.webp`;
  function visual(kind,item,large=false) {
    if(kind==='iching') return `<span class="dv-artwork dv-artwork-figure">${art(kind,item)}</span>`;
    if(kind==='cartomancy') return `<span class="dv-artwork dv-artwork-vector" aria-hidden="true">${PC.svg(item)}</span>`;
    return `<span class="dv-artwork"><img src="${artPath(kind,item.id,large)}" alt="" loading="lazy" decoding="async" width="${kind==='runes'||kind==='geomancy'?768:960}" height="${kind==='runes'||kind==='geomancy'?960:1536}">${kind==='runes'||kind==='geomancy'?`<span class="dv-exact-symbol">${art(kind,item)}</span>`:''}</span>`;
  }
  const artDialog=document.createElement('dialog');
  artDialog.className='dv-art-dialog'; artDialog.setAttribute('aria-label','Divination artwork'); document.body.append(artDialog);
  let artOpener=null,artSelection=null;
  function showArt(kind,id,back=false) {
    const item=deck(kind)[id]; artSelection={kind,id};
    artDialog.dataset.practice=kind;
    artDialog.innerHTML=`<header><h2>${back?modes[kind].name+' · Back':kind==='iching'?`${item.number} · ${item.name} ${item.character}`:item.name}</h2><button type="button" data-dv-close aria-label="Close artwork">×</button></header>${kind==='iching'?'':`<div class="dv-art-sides" role="group" aria-label="Card side"><button type="button" data-dv-side="front" aria-pressed="${!back}">Face</button>${kind!=='geomancy'?`<button type="button" data-dv-side="back" aria-pressed="${back}">Back</button>`:''}</div>`}<div class="dv-art-large" role="img" aria-label="${back?modes[kind].name+' ornamental back':kind==='iching'?item.name+' line figure':item.name+(kind==='cartomancy'?' face':' illustrated face')}">${back?kind==='cartomancy'?'<span class="dv-artwork dv-pc-back"></span>':`<span class="dv-artwork"><img src="${artPath(kind,'back',true)}" alt="" width="${kind==='runes'?768:960}" height="${kind==='runes'?960:1536}"></span>`:visual(kind,item,true)}</div><p>${back?'The shared back for this collection.':item.keyword+' · '+item.prompt}</p>`;
    if(!artDialog.open) artDialog.showModal();
  }
  artDialog.addEventListener('click',event=>{
    if(event.target.closest('[data-dv-close]')||event.target===artDialog) artDialog.close();
    const side=event.target.closest('[data-dv-side]');
    if(side) {showArt(artSelection.kind,artSelection.id,side.dataset.dvSide==='back');artDialog.querySelector(`[data-dv-side="${side.dataset.dvSide}"]`).focus();}
  });
  artDialog.addEventListener('close',()=>{if(artOpener?.isConnected) artOpener.focus({preventScroll:true});});
  const modes={
    lenormand:{name:'Lenormand',tag:'36 familiar symbols',title:'A small line. A connected story.',intro:'A message, a crossroads, a place to belong. Read these everyday symbols together, letting neighboring cards qualify one another.',options:[[3,'Three-card line'],[5,'Five-card line'],[36,'Grand Tableau · all 36 cards']],verb:'Lay the cards',note:'Petit Lenormand uses 36 cards. This room offers upright three- and five-card lines and the Grand Tableau of all 36 cards, with no significator preselected. In the lines, the middle card is the focus; adjacent pairs and mirrored ends offer context. Man and Woman retain their traditional names but can represent relevant people of any gender. Interpretations are original. The illustrated faces and shared ornamental back were created for Ishtar Insights using GPT Image 2.',tableauNote:'The Grand Tableau lays all 36 cards in four rows of eight, positions 1 to 32, with a closing row of four beneath them, positions 33 to 36. Each position is also a house: position <em>n</em> is the house of card <em>n</em> in the traditional numbering, so position 1 is the house of the Rider and position 36 the house of the Cross. You may name a significator — the Man, the Woman or neither, which is the default — and changing it redraws the marks on the current tableau. The cards near the significator are those in the single ring of positions touching it in the eight-by-four grid, diagonals included. The cards a knight’s move away sit two steps along a row or column and one step across, as a chess knight moves, again within that grid. The four corners are positions 1, 8, 25 and 32. The closing row stands outside the grid, so it plays no part in nearness or knighting. Some readers lay the tableau in four rows of nine instead; this room uses eight by four, plus four. The house lines are original to this site.',source:'<a href="https://www.usgamesinc.com/tarot-and-inspiration/all-products/dreaming-way-lenormand.html" target="_blank" rel="noopener">Publisher reference: Petit Lenormand and line readings</a>'},
    oracle:{name:'Oracle cards',tag:'24 original Ishtar cards',title:'An image to carry into your day.',intro:'Enter a quiet collection of lanterns, thresholds and small beginnings. Each card offers a reflection and one question to take with you.',options:[[1,'One-card reflection'],[3,'Notice · Nourish · Practice']],verb:'Draw your oracle',note:'The Ishtar Reflection Oracle is an original 24-card deck created for this site, with original writing and illustrations created using GPT Image 2. Oracle decks have no universal card list. These one- and three-card layouts are our own reflective practices, with no reversed meanings or claims of an ancient lineage.',source:''},
    runes:{name:'Runes',tag:'24 Elder Futhark signs',title:'A mark. A pause. A direction.',intro:'Draw from the Elder Futhark and spend time with a single theme, or explore a three-rune conversation about your situation and response.',options:[[1,'One-rune contemplation'],[3,'Situation · Tension · Response']],verb:'Draw the runes',note:'The Elder Futhark is a 24-character historical writing system. Rune names are conventional modern spellings of reconstructed names. These divinatory meanings and spreads are modern reflective interpretations, not a reconstruction of an ancient casting ritual. No blank rune or reversed meanings are used. Exact vector rune marks sit over stone artwork created using GPT Image 2.',source:'<a href="https://natmus.dk/historisk-viden/temaer/runer/runer-i-jernalderen/" target="_blank" rel="noopener">National Museum of Denmark: the 24-character rune row</a>'},
    geomancy:{name:'Geomancy',tag:'16 figures · a full shield',title:'Let the points form a pattern.',intro:'Four mother figures generate a complete shield. Follow the pattern from its first marks through two witnesses to the judge and reconciler.',options:[],verb:'Cast the shield',note:'This shield follows the parity method: transpose the four mothers to form daughters, then combine adjacent pairs row by row (odd totals become one point, even totals two). Nieces form witnesses; witnesses form the judge. The reconciler combines the first mother and judge. Puer is 1121 and Puella 1211 here; historical naming conventions vary. The shield is not an astrological house chart. Exact dot patterns sit over ornamental plaques created using GPT Image 2.',houseNote:'The house chart view follows one common Renaissance method and shows the same cast as the shield. The four mothers go into houses 1 to 4, the four daughters into houses 5 to 8 and the four nieces into houses 9 to 12; the witnesses, judge and reconciler are shown with the chart, beside it on wide screens and below it on narrow ones. The shield itself is not a house chart: this view is a second reading of the same sixteen figures, twelve of them set in houses, while the shield remains a figure in its own right. House 1 stood for the querent, and the geomancer chose the quesited house, the one governing the question, from the other eleven; this room begins with house 7. The houses run in a circle, so house 12 sits next to house 1, and two figures count as the same when their points match row for row. Here passage is every house other than house 1 that holds the querent’s figure. Occupation is the same figure in house 1 and the quesited house. Conjunction is the querent’s figure next to the quesited house, or the quesited figure next to house 1, in a house that is neither house 1 nor the quesited house. Mutation is the two figures side by side in any other pair of neighbouring houses, where neither house is house 1 or the quesited house. Translation is one figure standing in two different houses, one next to house 1 and one next to the quesited house, where neither is house 1 or the quesited house. Aspects are counted from each house of the passage, except the quesited house itself, to the quesited house the shorter way round: two houses apart made a sextile, three a square, four a trine and six an opposition, and houses one or five apart were given no aspect. Traditions differ over the placement, these definitions and how the steps were weighed, so this is one reading among several. The house names and matters are original to this site. Sources: <a href="https://www.princeton.edu/~ezb/geomancy/geostep.html#houses" target="_blank" rel="noopener">Princeton: the geomantic houses</a> · <a href="https://www.princeton.edu/~ezb/geomancy/geostep.html#methods" target="_blank" rel="noopener">Princeton: methods of interpretation, whose geomantic aspects include translation, occupation, conjunction and mutation</a>',source:'<a href="https://www.princeton.edu/~ezb/geomancy/geostep.html" target="_blank" rel="noopener">Princeton: shield construction</a> · <a href="https://www.princeton.edu/~ezb/geomancy/figures.html" target="_blank" rel="noopener">Historical figure conventions</a>'},
    iching:{name:'I Ching',tag:'64 hexagrams · coins or yarrow',title:'Six lines. A figure in motion.',intro:'Cast six lines from the bottom up. Read the hexagram they form, notice which lines are changing, and let the figure they turn into extend the reflection.',options:[],verb:'Cast the hexagram',note:'The I Ching (Yijing) is a Chinese classic of sixty-four six-line figures. This room casts with the three-coin method by default (each coin counts two or three; totals of six and nine are changing lines) or with the yarrow-stalk probabilities (1/16, 5/16, 7/16 and 3/16 for six, seven, eight and nine). Hexagram names and the King Wen order are traditional; every gloss, meaning and prompt here is original. Individual line statements are not reproduced; each changing line is read through its position instead.',source:'<a href="https://www.unicode.org/charts/PDF/U4DC0.pdf" target="_blank" rel="noopener">Unicode chart: the sixty-four hexagram symbols in King Wen order</a>'},
    cartomancy:{name:'Playing cards',tag:'52 cards · four suits',title:'An ordinary deck. A closer look.',intro:'Draw from a familiar pack of fifty-two cards. Take one card as something to notice, or three as a short conversation about what is here, what needs attention and where to step next.',options:[[1,'One card'],[3,'Present · Attention · Next step']],verb:'Deal the cards',note:'This room uses a standard 52-card deck: four suits, each running from ace to king, with no jokers. Every card is read upright. The suit themes follow common modern English-language associations: Hearts for feeling and relationships, Diamonds for resources and practical work, Clubs for effort, growth and exchange, and Spades for difficulty, decisions and clear thought. Spades treat difficulty as something to work with. The one-card layout names something to notice; the three-card layout reads what is present, what asks for attention and a next step. Other traditions assign the suits differently, and some use a shorter deck. The card faces are original vector drawings made for Ishtar Insights, and every meaning and prompt is original to this site.',source:''}
  };
  const states=Object.fromEntries(Object.keys(modes).map(key=>[key,{count:key==='lenormand'?3:1,question:'',reading:null,revealed:new Set(),study:0,manual:false,mothers:Array.from({length:4},()=>[2,2,2,2]),method:'coins',lines:[7,7,7,7,7,7],significator:'none',view:'shield',quesited:7}]));
  const lineName=v=>({6:'old yin, changing',7:'young yang',8:'young yin',9:'old yang, changing'})[v];
  let mode='lenormand';
  const tableauControls=s=>s.count===36||s.reading?.ids?.length===36;
  function deck(kind) {return kind==='geomancy'?D.figures:kind==='iching'?D.hexagrams:kind==='cartomancy'?PC.cards:D[kind];}
  function items() {return deck(mode);}
  function positions(n) {
    if(mode==='oracle') return n===1?['Your reflection']:['Notice','Nourish','Practice'];
    if(mode==='runes') return n===1?['Your theme']:['Situation','Tension','Response'];
    if(mode==='cartomancy') return n===1?['What to notice']:['What is present','What asks for attention','A next step'];
    return n===3?['Opening context','Focus','Closing context']:['Outer context','Near context','Focus','Near context','Outer context'];
  }
  function positionMeaning(i,n) {
    if(mode==='oracle') return n===1?'Carry this reflection into an ordinary moment today.':['Notice where this theme is already present.','Consider what care or support this theme could use.','Translate this theme into one manageable action.'][i];
    if(mode==='cartomancy') return n===1?'Treat this card as one thing to notice today, and look for where it shows up in what you actually do.':['Read this card as a description of something already here.','Consider what this card asks you to look at more closely.','Turn this card into one small step you could choose to take.'][i];
    if(mode==='runes') return n===1?'Use this theme as a question to live with, rather than an answer you must obey.':['Read this as a lens on the circumstances you are meeting.','Consider what this theme asks you to examine or balance.','Find a response you can choose and carry out.'][i];
    return i===Math.floor(n/2)?'The center is the subject of this line. Let its neighbors qualify the picture.':'Read this card in connection with its neighbor, rather than as an isolated prediction.';
  }
  function render() {
    const c=modes[mode],s=states[mode]; root.dataset.practice=mode;
    root.style.setProperty('--dv-back',mode==='iching'?'none':mode==='cartomancy'?'var(--pc-back)':`url("${artPath(mode,mode==='geomancy'?0:'back')}")`);
    root.innerHTML=`<header class="dv-header"><div><p class="section-kicker">Cards &amp; divination</p><h2 id="divination-title">Six ways to listen closely.</h2><p>Choose a practice. Make a little room for what you notice.</p></div><span class="dv-seal" aria-hidden="true">✧</span></header>
      <div class="dv-tabs" role="group" aria-label="Divination practices">${Object.entries(modes).map(([key,v],i)=>`<button type="button" data-dv-mode="${key}" aria-pressed="${key===mode}" aria-controls="dv-practice"><span>0${i+1}</span>${v.name}<small>${v.tag}</small></button>`).join('')}</div>
      <div id="dv-practice"><div class="dv-intro"><p class="dv-kicker">${c.tag}</p><h3>${c.title}</h3><p>${c.intro}</p></div>
      <div class="dv-controls"><label class="dv-question-label" for="dv-question">A question to hold <span>optional · stays on this page</span><input id="dv-question" maxlength="240" value="${esc(s.question)}" placeholder="What would help me see this more clearly?"></label>${mode==='iching'?`<label for="dv-method">Casting method<select id="dv-method"><option value="coins" ${s.method==='coins'?'selected':''}>Three coins</option><option value="yarrow" ${s.method==='yarrow'?'selected':''}>Yarrow-stalk probabilities</option></select></label>`:mode!=='geomancy'?`<label for="dv-layout">Reading layout<select id="dv-layout">${c.options.map(([n,label])=>`<option value="${n}" ${s.count===n?'selected':''}>${label}</option>`).join('')}</select></label>${mode==='lenormand'?`<label for="dv-significator" ${tableauControls(s)?'':'hidden'}>Significator<select id="dv-significator">${[['none','None'],['man','The Man'],['woman','The Woman']].map(([v,label])=>`<option value="${v}" ${s.significator===v?'selected':''}>${label}</option>`).join('')}</select></label>`:''}`:''}<button type="button" class="dv-draw" data-dv-draw>${s.reading?'Begin a new reading':c.verb} <span aria-hidden="true">↗</span></button></div>
      ${mode==='geomancy'?`<details class="dv-method"><summary>Make your own starting figures</summary><p>Optionally make sixteen uncounted rows of marks on paper. Reduce each row to one point for an odd count or two for an even count, then enter four rows for each mother. Or let the cast button generate the starting points.</p><label class="dv-manual-label"><input type="checkbox" id="dv-manual" ${s.manual?'checked':''}> Use the starting figures below</label><div class="dv-mothers">${s.mothers.map((m,i)=>`<fieldset><legend>Mother ${i+1}</legend>${m.map((v,j)=>`<button type="button" data-dv-point="${i},${j}" aria-label="Mother ${i+1}, row ${j+1}: ${v} ${v===1?'point':'points'}. Toggle points.">${v===1?'●':'● ●'}</button>`).join('')}</fieldset>`).join('')}</div></details>`:''}${mode==='iching'?`<details class="dv-method"><summary>Cast with your own coins</summary><p>Toss three coins six times, bottom line first, counting two for tails and three for heads. Enter each total below, then cast.</p><label class="dv-manual-label"><input type="checkbox" id="dv-manual" ${s.manual?'checked':''}> Use the lines below</label><div class="dv-lines">${s.lines.map((v,i)=>`<button type="button" data-dv-line="${i}" aria-label="Line ${i+1}: ${lineName(v)}. Change.">${i+1} · ${v} · ${lineName(v)}</button>`).join('')}</div></details>`:''}
      <p class="dv-status" role="status" aria-live="polite"></p><div class="dv-output"></div>
      <details class="dv-method"><summary>About this practice &amp; how to read it</summary><p>${c.note}</p>${c.tableauNote?`<p>${c.tableauNote}</p>`:''}${c.houseNote?`<p class="dv-house-note" ${s.view==='houses'?'':'hidden'}>${c.houseNote}</p>`:''}${c.source?`<p>${c.source}</p>`:''}<p>Symbols offer prompts for reflection, not verified predictions. These readings stay in this page while you explore other practices; reloading clears them. Editing a question or layout applies to the next draw.</p></details>
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
    const sig=root.querySelector('#dv-significator');if(sig) sig.closest('label').hidden=!tableauControls(s);
    if(!r) {
      out.innerHTML=`<div class="dv-welcome"><div class="dv-back-fan" aria-hidden="true"><i>✧</i><i>${mode==='runes'?'ᚷ':mode==='geomancy'?'⠿':'✧'}</i><i>✧</i></div><p>${mode==='geomancy'?'A pattern is waiting to take shape.':mode==='iching'?'Six lines are waiting to be cast.':s.count===36?'Take a breath before the tableau is laid.':'Take a breath before the first reveal.'}</p><small>${mode==='geomancy'?'Cast sixteen starting rows, then explore how the shield unfolds.':mode==='iching'?'Use the draw button above, or enter your own coin totals below.':s.count===36?'Use the draw button above. All 36 cards are laid face up at once.':'Use the draw button above. Turn each card or rune when you are ready.'}</small>${mode!=='geomancy'&&mode!=='iching'?'<button type="button" class="dv-view-art" data-dv-art="0" data-dv-back>Explore the artwork</button>':''}</div>`; return;
    }
    if(mode==='geomancy') { (s.view==='houses'?housesOutput:shieldOutput)(out,r); out.insertAdjacentHTML('afterbegin',viewSwitch(s.view)); return; }
    if(mode==='iching') { hexagramOutput(out,r); return; }
    if(r.ids.length===36) { tableauOutput(out,r); return; }
    const cards=r.ids.map(id=>items()[id]),labels=positions(cards.length),all=s.revealed.size===cards.length;
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<div class="dv-spread" data-count="${cards.length}">${cards.map((card,i)=>`<div class="dv-card-place"><span class="dv-position">${i+1} / ${labels[i]}</span><button type="button" class="dv-card ${s.revealed.has(i)?'is-revealed':''}" data-dv-reveal="${i}" aria-label="${s.revealed.has(i)?'Enlarge '+card.name:'Reveal '+(mode==='runes'?'rune':'card')+' '+(i+1)+': '+labels[i]}">${s.revealed.has(i)?`<span class="dv-card-number">${String(card.id+1).padStart(2,'0')}</span>${visual(mode,card)}<strong>${card.name}</strong><small>${card.keyword}</small>`:`<span class="dv-card-back" aria-hidden="true">✧</span><span class="dv-turn">Tap to reveal</span>`}</button></div>`).join('')}</div>
      ${!all?'<div class="dv-reveal-controls"><button type="button" data-dv-next>Reveal next</button><button type="button" data-dv-all>Reveal all</button></div>':''}
      <div class="dv-readings">${cards.map((card,i)=>s.revealed.has(i)?`<article id="dv-reading-${i}" tabindex="-1"><p class="dv-kicker">${labels[i]} · ${card.keyword}</p><h4>${card.name}</h4><p class="dv-position-note">${positionMeaning(i,cards.length)}</p><p>${card.meaning}</p><blockquote>${card.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${card.id}">View artwork</button></article>`:'').join('')}</div>${all?summary(cards):'<p class="dv-pending">Reveal the remaining symbols to read the whole pattern.</p>'}${saveControl()}`;
  }
  const SUIT_THEMES={hearts:'feeling and relationships',diamonds:'resources and practical work',clubs:'effort, growth and exchange',spades:'difficulty, decisions and clear thought'};
  function cartomancySummary(cards) {
    const [a,b,c]=cards.map(card=>({name:esc(card.name),keyword:esc(card.keyword),lower:esc(card.keyword.toLowerCase()),prompt:esc(card.prompt)}));
    if(cards.length===1) return `<aside class="dv-synthesis"><p class="dv-kicker">Take it into your day</p><h4>${a.name}: ${a.lower}.</h4><p>Choose one small action in response to this question: ${a.prompt} Notice what the action shows you, rather than waiting for the card to prove itself.</p></aside>`;
    const suits=[...new Set(cards.map(card=>card.suit))].map(key=>PC.SUITS.find(suit=>suit.key===key));
    const theme=suit=>`${esc(suit.name)} (${esc(SUIT_THEMES[suit.key])})`;
    const suitLine=suits.length===1?`All three cards are ${esc(suits[0].name)}, the suit of ${esc(SUIT_THEMES[suits[0].key])}.`:`The suits here are ${suits.slice(0,-1).map(theme).join(', ')} and ${theme(suits.at(-1))}.`;
    return `<aside class="dv-synthesis"><p class="dv-kicker">The three cards together</p><h4>${a.keyword}. ${b.keyword}. ${c.keyword}.</h4><p>Start with the ${a.name} as something already present. Let the ${b.name} point to what asks for attention, then take the ${c.name} as a next step you could choose.</p><p>${suitLine} Look for where ${a.lower} meets ${b.lower}, and choose a step that respects both.</p><blockquote>${c.prompt}</blockquote></aside>`;
  }
  function summary(cards) {
    if(mode==='cartomancy') return cartomancySummary(cards);
    if(cards.length===1) return `<aside class="dv-synthesis"><p class="dv-kicker">Take it into your day</p><h4>Make ${cards[0].keyword.toLowerCase()} concrete.</h4><p>Choose one small action in response to this question: ${cards[0].prompt} Notice what changes through your action, rather than waiting for the symbol to prove itself.</p></aside>`;
    if(mode==='lenormand') {
      const middle=cards[Math.floor(cards.length/2)];
      const pairs=cards.slice(0,-1).map((a,i)=>`<li><strong>${a.name} + ${cards[i+1].name}</strong><p>Explore ${a.keyword.toLowerCase()} through the lens of ${cards[i+1].keyword.toLowerCase()}. How does the second theme change your understanding of the first?</p></li>`).join('');
      return `<aside class="dv-synthesis"><p class="dv-kicker">Reading the line</p><h4>${middle.name} at the center.</h4><p>Begin with ${middle.keyword.toLowerCase()}. The line opens with ${cards[0].name} (${cards[0].keyword.toLowerCase()}) and closes with ${cards.at(-1).name} (${cards.at(-1).keyword.toLowerCase()}). Use these as context around the center, not a fixed sequence of future events.</p><ul>${pairs}</ul><p><strong>Mirror the ends:</strong> ${cards[0].name} and ${cards.at(-1).name} frame the question.${cards.length===5?` Then compare ${cards[1].name} and ${cards[3].name}, the two cards closest to the center.`:''} Which connection best matches what you can actually observe?</p><blockquote>${middle.prompt}</blockquote></aside>`;
    }
    return `<aside class="dv-synthesis"><p class="dv-kicker">The symbols in conversation</p><h4>${cards[0].keyword}. ${cards[1].keyword}. ${cards[2].keyword}.</h4><p>${mode==='runes'?`Start with ${cards[0].name} as a lens on the situation. Let ${cards[1].name} name a tension to examine, then use ${cards[2].name} to consider your response.`:`Notice the theme of ${cards[0].name}, offer care to what ${cards[1].name} brings up, and make ${cards[2].name} your practice.`}</p><p>These symbols need not agree. Look for where ${cards[0].keyword.toLowerCase()} supports or complicates ${cards[1].keyword.toLowerCase()}. Choose an action that honors what you learn from both.</p><blockquote>${cards[2].prompt}</blockquote></aside>`;
  }
  function saveControl() {
    const signedIn = window.IshtarAccount?.state().signedIn;
    const label = signedIn ? 'Save this reading to my journal' : 'Sign in to save this reading';
    return `<p class="save-reading"><button type="button" data-save-reading="${esc(window.DivinationRoom.currentDraw()?.kind||mode)}">${label}</button><span role="status" aria-live="polite"></span></p>`;
  }
  window.DivinationRoom = {
    currentDraw() {
      const s = states[mode], r = s.reading;
      if (!r) return null;
      if (mode === 'geomancy' && s.view === 'houses') {
        const q = s.quesited, f = figure(r.chart.all[q - 1]);
        return {kind: 'geomancy-houses', deck: '', layout: 'twelve houses', question: r.question || '', focus: '', payload: {mothers: r.chart.mothers, quesited: q, selected: r.house}, summary: `House chart · house ${q}, ${D.houseMatters[q - 1].name}: ${f.name}`.slice(0, 120)};
      }
      if (mode === 'geomancy') return {kind: 'geomancy', deck: '', layout: 'shield', question: r.question || '', focus: '', payload: {mothers: r.chart.mothers, selected: r.selected}, summary: figure(r.chart.judge).name.slice(0, 120)};
      if (mode === 'iching') {
        const h = D.hexagrams[E.readLines(r.lines, D.hexagrams).primary];
        return {kind: 'iching', deck: '', layout: r.method, question: r.question || '', focus: '', payload: {lines: r.lines}, summary: `Hexagram ${h.number} · ${h.name}`.slice(0, 120)};
      }
      if (r.ids.length === 36) {
        const t = E.tableau(r.ids, r.significator), name = p => D.lenormand[r.ids[p - 1]].name;
        const summary = t.significatorPosition ? `Grand Tableau · the ${D.lenormand[SIGNIFICATOR_IDS[t.significator]].name} in the house of the ${D.lenormand[t.significatorPosition - 1].name}` : `Grand Tableau · corners: ${t.corners.map(name).join(', ')}`;
        return {kind: 'grand-tableau', deck: '', layout: 'all 36 cards', question: r.question || '', focus: '', payload: {ids: r.ids, significator: r.significator, selected: r.selected}, summary: summary.slice(0, 120)};
      }
      return {kind: mode, deck: '', layout: String(r.ids.length), question: r.question || '', focus: '', payload: {ids: r.ids}, summary: r.ids.map(id => items()[id].name).join(' · ').slice(0, 120)};
    },
    loadDraw(reading) {
      const kind = ({'grand-tableau': 'lenormand', 'geomancy-houses': 'geomancy'})[reading?.kind] || reading?.kind, p = reading?.payload;
      if (!Object.hasOwn(modes, kind) || !p) return false;
      const s = states[kind];
      if (reading.kind === 'grand-tableau') {
        const t = E.loadTableau(p);
        if (!t) return false;
        s.reading = {ids: t.ids, significator: t.significator, selected: t.selected, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.count = 36; s.significator = t.significator; s.revealed = new Set(t.ids.map((_, i) => i));
      } else if (reading.kind === 'geomancy-houses') {
        const h = E.loadHouses(p);
        if (!h) return false;
        const chart = E.shield(h.mothers);
        s.reading = {chart, selected: 14, house: h.selected, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.mothers = chart.mothers.map(f => [...f]); s.manual = true; s.view = 'houses'; s.quesited = h.quesited;
      } else if (kind === 'geomancy') {
        let chart; try { chart = E.shield(p.mothers); } catch { return false; }
        s.view = 'shield';
        s.reading = {chart, house: 1, selected: Number.isInteger(p.selected) && p.selected >= 0 && p.selected < 16 ? p.selected : 14, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.mothers = chart.mothers.map(f => [...f]); s.manual = true;
      } else if (kind === 'iching') {
        const lines = E.loadLines(p.lines);
        if (!lines) return false;
        s.reading = {lines, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : '', method: ['coins', 'yarrow', 'manual'].includes(reading.layout) ? reading.layout : 'coins'};
        s.lines = [...lines]; s.manual = reading.layout === 'manual'; s.method = s.reading.method === 'manual' ? s.method : s.reading.method;
      } else {
        const loaded = E.loadIds(p.ids, deck(kind).length);
        if (!loaded || !modes[kind].options.some(([n]) => n === loaded.ids.length)) return false;
        s.reading = {ids: loaded.ids, question: typeof reading.question === 'string' ? reading.question.slice(0, 240) : ''};
        s.count = loaded.ids.length;
        s.revealed = loaded.revealed;
      }
      s.question = s.reading.question;
      mode = kind; render();
      (window.MobileSections?.reveal(root) || root).scrollIntoView({behavior: 'smooth', block: 'start'});
      return true;
    }
  };
  // These names must match server/ishtar/readings/kinds.py and rooms.js: Rooms.labelFor
  // prefers the registered label, so a disagreement shows two names for one practice.
  const labels = {lenormand: 'Lenormand', 'grand-tableau': 'Grand Tableau', oracle: 'Ishtar Reflection Oracle', runes: 'Runes', geomancy: 'Geomancy', 'geomancy-houses': 'Geomantic house chart', iching: 'I Ching', cartomancy: 'Playing cards'};
  for (const kind of Object.keys(labels)) Rooms.register(kind, {
    label: labels[kind], category: 'divination',
    current: () => { const draw = window.DivinationRoom.currentDraw(); return draw && draw.kind === kind ? draw : null; },
    load: reading => window.DivinationRoom.loadDraw(reading)
  });
  document.addEventListener('ishtar-account-change', () => output());
  const figure=points=>D.figures.find(f=>f.symbol===points.join(''));
  const SIGNIFICATOR_IDS={man:27,woman:28};
  function tableauReading(r) {
    const p=r.selected+1,c=D.lenormand[r.ids[r.selected]];
    return `<p class="dv-kicker">Position ${p} · House of the ${esc(D.lenormand[p-1].name)} · ${esc(c.keyword)}</p><h4>${esc(c.name)}</h4><p class="dv-position-note">${esc(D.tableauHouses[p-1])}</p><p>${esc(c.meaning)}</p><blockquote>${esc(c.prompt)}</blockquote><button type="button" class="dv-view-art" data-dv-art="${c.id}">View artwork</button>`;
  }
  function tableauOutput(out,r) {
    const t=E.tableau(r.ids,r.significator),L=D.lenormand,sig=t.significatorPosition;
    const card=p=>L[r.ids[p-1]],house=p=>esc(L[p-1].name),near=new Set(t.near),knight=new Set(t.knight);
    const mark=p=>p===sig?['is-significator','Significator','the significator']:near.has(p)?['is-near','Near','near the significator']:knight.has(p)?['is-knight','Knight','a knight’s move from the significator']:null;
    const cell=p=>{const c=card(p),m=mark(p);return `<button type="button" class="dv-tableau-cell${m?' '+m[0]:''}${p===33?' is-closing-start':''}" data-dv-cell="${p-1}" aria-pressed="${r.selected===p-1}" aria-label="Position ${p}, house of the ${house(p)}: ${esc(c.name)}${m?', '+m[2]:''}${p>32?', closing row':''}"><span class="dv-tableau-pos">${p}</span>${visual('lenormand',c)}<strong>${esc(c.name)}</strong><small>House of the ${house(p)}</small>${m?`<em class="dv-tableau-badge">${m[1]}</em>`:''}</button>`;};
    const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
    const list=(title,ps)=>`<section><h5>${title}</h5><ul>${ps.map(p=>`<li><span>${p}</span> ${esc(card(p).name)} <small>in the house of the ${house(p)}</small></li>`).join('')}</ul></section>`;
    const who=sig?esc(L[SIGNIFICATOR_IDS[r.significator]].name):'';
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<p class="dv-pending dv-tableau-hint">Positions 1 to 32 run left to right in rows of eight, and the closing row follows. Select any position to read it.</p>
      <div class="dv-tableau" role="group" aria-label="Grand Tableau, 36 positions"><div class="dv-tableau-grid">${range(1,32).map(cell).join('')}<p class="dv-tableau-label" aria-hidden="true">Closing row</p>${range(33,36).map(cell).join('')}</div></div>
      <article class="dv-figure-reading dv-tableau-reading" aria-live="polite">${tableauReading(r)}</article>
      <aside class="dv-synthesis dv-tableau-lists"><p class="dv-kicker">Reading the tableau</p><h4>${sig?`The ${who} in the house of the ${house(sig)}.`:'Four corners and a closing row.'}</h4>
      ${sig?`<p>The ${who} lies in position ${sig}, the house of the ${house(sig)}.${sig>32?' That is the closing row, which sits outside the grid for nearness and knighting, so no cards are marked near it or a knight’s move away.':''}</p>`:'<p>No significator is chosen. Choose the Man or the Woman above to mark the cards near that card and a knight’s move away.</p>'}
      <div class="dv-tableau-groups">${sig&&sig<=32?list('Near the significator',t.near)+list('A knight’s move away',t.knight):''}${list('The four corners',t.corners)}${list('The closing row',t.closing)}</div></aside>${saveControl()}`;
  }
  function shieldOutput(out,r) {
    const s=states.geomancy,chart=r.chart;
    const labels=[...Array.from({length:4},(_,i)=>`Mother ${i+1}`),...Array.from({length:4},(_,i)=>`Daughter ${i+1}`),...Array.from({length:4},(_,i)=>`Niece ${i+1}`),'Right witness','Left witness','Judge','Reconciler'];
    const f=figure(chart.all[r.selected]);
    const cell=i=>{const item=figure(chart.all[i]);return `<button type="button" class="dv-shield-cell" data-dv-figure="${i}" aria-pressed="${r.selected===i}"><small>${labels[i]}</small>${visual('geomancy',item)}<strong>${item.name}</strong><span class="sr-only">Rows top to bottom: ${item.symbol.split('').join(', ')} points.</span></button>`;};
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<p class="dv-shield-hint">Read each row from right to left. Select any figure to explore it.</p><div class="dv-shield"><div class="dv-shield-row">${[0,1,2,3,4,5,6,7].map(cell).join('')}</div><div class="dv-shield-row">${[8,9,10,11].map(cell).join('')}</div><div class="dv-shield-row">${[12,13].map(cell).join('')}</div><div class="dv-shield-row">${cell(14)}</div><div class="dv-shield-row">${cell(15)}</div></div><article class="dv-figure-reading" tabindex="-1"><p class="dv-kicker">${labels[r.selected]} · ${f.keyword}</p><h4>${f.name}</h4><p>${f.meaning}</p><blockquote>${f.prompt}</blockquote><button type="button" class="dv-view-art" data-dv-art="${f.id}">View artwork</button></article><aside class="dv-synthesis"><p class="dv-kicker">The shield gathered</p><h4>${figure(chart.judge).name}: ${figure(chart.judge).keyword.toLowerCase()}.</h4><p>The right witness, ${figure(chart.witnesses[0]).name}, develops the first four figures. The left witness, ${figure(chart.witnesses[1]).name}, develops the daughters. Their combination produces the judge, ${figure(chart.judge).name}.</p><p>Read ${figure(chart.witnesses[0]).keyword.toLowerCase()} alongside ${figure(chart.witnesses[1]).keyword.toLowerCase()}. The judge offers a theme to reflect on; it does not pronounce a factual verdict. The reconciler, ${figure(chart.reconciler).name}, brings that theme back to the first mother.</p><blockquote>${figure(chart.reconciler).prompt}</blockquote></aside>${saveControl()}`;
  }
  // Geomantic house chart. Index 0 of E.houseChart is house 1; the quesited house lives in the geomancy state.
  const HOUSE_ORDER=Array.from({length:12},(_,i)=>i+1);
  const houseName=h=>esc(D.houseMatters[h-1].name);
  const houseList=hs=>hs.length===1?`house ${hs[0]} (${houseName(hs[0])})`:`houses ${hs.slice(0,-1).map(h=>`${h} (${houseName(h)})`).join(', ')} and ${hs.at(-1)} (${houseName(hs.at(-1))})`;
  // Where conjunction and mutation show, from the same definitions as E.judge (checked against it for every cast).
  function perfectionDetail(houses,q) {
    const at=h=>houses[h-1].join(''),p=at(1),t=at(q),away=h=>h!==1&&h!==q;
    const conjunction=HOUSE_ORDER.filter(away).map(h=>({house:h,next:[...(at(h)===p&&E.houseDistance(h,q)===1?[q]:[]),...(at(h)===t&&E.houseDistance(h,1)===1?[1]:[])]})).filter(c=>c.next.length);
    const mutation=HOUSE_ORDER.map(h=>[h,h%12+1]).filter(([a,b])=>away(a)&&away(b)&&((at(a)===p&&at(b)===t)||(at(a)===t&&at(b)===p)));
    return {conjunction,mutation,same:(a,b)=>at(a)===at(b)};
  }
  function viewSwitch(view) {
    return `<div class="dv-view-switch" role="group" aria-label="Show the cast as">${[['shield','Shield'],['houses','House chart']].map(([v,label])=>`<button type="button" data-dv-view="${v}" aria-pressed="${view===v}">${label}</button>`).join('')}</div>`;
  }
  function houseReading(r) {
    const q=states.geomancy.quesited,h=r.house,f=figure(r.chart.all[h-1]),m=D.houseMatters[h-1];
    const role=h===1?' · The querent':h===q?' · The quesited house':'';
    return `<p class="dv-kicker">House ${h} · ${esc(m.name)}${role} · ${esc(f.keyword)}</p><h4>${esc(f.name)}</h4><p class="dv-position-note">${esc(m.matter)}</p><p>${esc(f.meaning)}</p><blockquote>${esc(f.prompt)}</blockquote><button type="button" class="dv-view-art" data-dv-art="${f.id}">View artwork</button>`;
  }
  function judgement(r) {
    const q=states.geomancy.quesited,houses=E.houseChart(r.chart),j=E.judge(houses,q),d=perfectionDetail(houses,q);
    const name=h=>esc(figure(houses[h-1]).name),pf=name(1),qf=name(q);
    const found=[];
    if(j.occupation) found.push(`<li><strong>Occupation</strong> — the same figure in house 1 and the quesited house. ${pf} stands in both house 1 and house ${q}.</li>`);
    if(j.conjunction) found.push(`<li><strong>Conjunction</strong> — the querent’s figure next to the quesited house, or the quesited figure next to house 1, in a house that is neither house 1 nor the quesited house. ${d.conjunction.map(c=>`${name(c.house)} stands in house ${c.house}, next to ${c.next.length>1?`both house ${q} and house 1`:`house ${c.next[0]}`}.`).join(' ')}</li>`);
    if(j.mutation) found.push(`<li><strong>Mutation</strong> — the two figures side by side in another pair of neighbouring houses, neither of them house 1 or the quesited house. ${d.mutation.map(([a,b])=>d.same(a,b)?`${name(a)} stands in both house ${a} and house ${b}.`:`${name(a)} and ${name(b)} sit side by side in houses ${a} and ${b}.`).join(' ')}</li>`);
    if(j.translation.length) found.push(`<li><strong>Translation</strong> — one figure in two different houses, one next to house 1 and one next to the quesited house, neither of them house 1 or the quesited house. ${j.translation.map(t=>`${name(t.from)} stands in house ${t.from}, next to house 1, and in house ${t.to}, next to house ${q}.`).join(' ')}</li>`);
    const aspects=j.aspects.length?`<ul>${j.aspects.map(a=>`<li>House ${a.house} (${houseName(a.house)}): ${a.aspect}, ${E.houseDistance(a.house,q)} houses from house ${q}.</li>`).join('')}</ul>`
      :`<p>${j.passage.length?j.passage.length===1&&j.passage[0]===q?`The only house of the passage is house ${q} itself, so this chart lists no aspects.`:`No house of the passage${j.passage.includes(q)?` other than house ${q}`:''} stands two, three, four or six houses from house ${q}, so this chart lists no aspects.`:'With no passage, this chart has no aspects to count.'}</p>`;
    return `<p class="dv-kicker">Reading the house chart</p><h4>House ${q}, ${houseName(q)}: ${qf}.</h4>
      <p>Below is what the tradition looked for, step by step, and what this chart holds. It gives no verdict on the question.</p>
      <ol class="dv-judgement">
      <li><h5>The quesited house</h5><p>Geomancers looked first at the figure in the house that governed the question, and at the figure in house 1, which stood for the querent. Here house ${q} holds ${qf}, and house 1 holds ${pf}.</p></li>
      <li><h5>Passage</h5><p>Next they followed the querent’s figure through the chart, noting every other house in which it appeared. ${j.passage.length?`${pf} also appears in ${houseList(j.passage)}.`:`${pf} appears in no house besides house 1.`}</p></li>
      <li><h5>Perfection</h5><p>The tradition counted four ways in which the querent’s house and the quesited house could be joined: occupation, conjunction, mutation and translation.</p>${found.length?`<ul>${found.join('')}</ul>`:'<p>This chart shows none of the four.</p>'}</li>
      <li><h5>Aspects</h5><p>Last, geomancers counted from each house of the passage, other than the quesited house itself, to the quesited house the shorter way round. Two houses apart made a sextile, three a square, four a trine and six an opposition; houses one or five apart were given no aspect in this count.</p>${aspects}</li>
      </ol>`;
  }
  function housesOutput(out,r) {
    const s=states.geomancy,chart=r.chart,q=s.quesited;
    const cell=h=>{const f=figure(chart.all[h-1]),role=h===1?'Querent':h===q?'Quesited':'';return `<button type="button" class="dv-house-cell${role?' is-'+role.toLowerCase():''}" data-dv-house="${h}" aria-pressed="${r.house===h}" aria-label="House ${h}, ${houseName(h)}: ${esc(f.name)}${role?', the '+role.toLowerCase()+' house':''}"><span class="dv-house-num">${h}</span><small>${houseName(h)}</small>${visual('geomancy',f)}<strong>${esc(f.name)}</strong>${role?`<em class="dv-tableau-badge">${role}</em>`:''}</button>`;};
    const side=(label,points)=>{const f=figure(points);return `<li><small>${label}</small>${visual('geomancy',f)}<strong>${esc(f.name)}</strong></li>`;};
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<label class="dv-quesited-label" for="dv-quesited">The quesited house<select id="dv-quesited">${HOUSE_ORDER.slice(1).map(h=>`<option value="${h}" ${h===q?'selected':''}>House ${h} · ${houseName(h)}</option>`).join('')}</select></label>
      <p class="dv-shield-hint">Houses 1 to 12 run left to right, row by row. Select any house to read it.</p>
      <div class="dv-houses"><div class="dv-house-grid" role="group" aria-label="Twelve houses">${HOUSE_ORDER.map(cell).join('')}</div>
      <ul class="dv-house-side" aria-label="Witnesses, judge and reconciler">${side('Right witness',chart.witnesses[0])}${side('Left witness',chart.witnesses[1])}${side('Judge',chart.judge)}${side('Reconciler',chart.reconciler)}</ul></div>
      <article class="dv-figure-reading dv-house-reading" aria-live="polite">${houseReading(r)}</article>
      <aside class="dv-synthesis dv-house-judgement">${judgement(r)}</aside>${saveControl()}`;
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
    if(event.target.id==='dv-layout') {states[mode].count=Number(event.target.value);if(states[mode].reading){const sig=root.querySelector('#dv-significator');if(sig) sig.closest('label').hidden=!tableauControls(states[mode]);}else output();}
    if(event.target.id==='dv-significator') {
      const s=states.lenormand;s.significator=event.target.value;
      if(s.reading&&s.reading.ids.length===36) {
        s.reading.significator=s.significator;output();
        root.querySelector('.dv-status').textContent=s.significator==='none'?'No significator. The four corners and the closing row are listed below the tableau.':`Significator: the ${D.lenormand[SIGNIFICATOR_IDS[s.significator]].name}, in position ${s.reading.ids.indexOf(SIGNIFICATOR_IDS[s.significator])+1}. ${s.reading.ids.indexOf(SIGNIFICATOR_IDS[s.significator])+1>32?'It sits in the closing row, so no cards are marked near it.':'Its marks are shown on the tableau.'}`;
      }
    }
    if(event.target.id==='dv-quesited') {
      const s=states.geomancy;s.quesited=Number(event.target.value);
      if(s.reading) {
        output();root.querySelector('#dv-quesited').focus({preventScroll:true});
        root.querySelector('.dv-status').textContent=`Quesited house ${s.quesited}, ${D.houseMatters[s.quesited-1].name}: ${figure(s.reading.chart.all[s.quesited-1]).name}. The judgement below is updated.`;
      }
    }
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
        s.reading=mode==='geomancy'?{chart:s.manual?E.shield(s.mothers):E.cast(),selected:14,house:1,question:s.question}:mode==='iching'?{lines:s.manual?[...s.lines]:E.castHexagram(s.method),question:s.question,method:s.manual?'manual':s.method}:{ids:E.draw(items().length,s.count),question:s.question};
        if(mode==='lenormand'&&s.count===36) Object.assign(s.reading,{significator:s.significator,selected:0});
        s.revealed.clear();output();button.innerHTML='Begin a new reading <span aria-hidden="true">↗</span>';
        root.querySelector('.dv-status').textContent=mode==='geomancy'?(s.view==='houses'?'Your shield is cast and shown as a house chart. Select a house to read it.':'Your shield is cast. Select a figure to read it.'):mode==='iching'?'Six lines cast. Read the hexagram below.':s.reading.ids.length===36?'All 36 cards laid out. Select any position to read it.':`${s.count} ${mode==='runes'?'rune':'card'}${s.count===1?'':'s'} laid face down. Reveal ${s.count===1?'it':'them'} below.`;
      } catch {root.querySelector('.dv-status').textContent='The draw could not be completed. Please try again in a browser with secure random support.';}
      return;
    }
    if(button.hasAttribute('data-dv-study')) {s.study=Number(button.dataset.dvStudy);root.querySelectorAll('[data-dv-study]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dvStudy)===s.study)));study();root.querySelector('.dv-study').focus({preventScroll:true});root.querySelector('.dv-study').scrollIntoView({block:'nearest',behavior:'instant'});return;}
    if(button.hasAttribute('data-dv-figure')) {s.reading.selected=Number(button.dataset.dvFigure);output();root.querySelector(`[data-dv-figure="${s.reading.selected}"]`).focus({preventScroll:true});root.querySelector('.dv-status').textContent=`Selected ${figure(s.reading.chart.all[s.reading.selected]).name}. Interpretation below the shield.`;return;}
    if(button.dataset.dvView) {
      s.view=button.dataset.dvView;output();root.querySelector(`[data-dv-view="${s.view}"]`).focus({preventScroll:true});
      const note=root.querySelector('.dv-house-note');if(note) note.hidden=s.view!=='houses';
      root.querySelector('.dv-status').textContent=s.view==='houses'?'The same cast, shown as a house chart. Select a house to read it.':'The same cast, shown as a shield.';return;
    }
    if(button.hasAttribute('data-dv-house')) {
      s.reading.house=Number(button.dataset.dvHouse);
      root.querySelectorAll('[data-dv-house]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dvHouse)===s.reading.house)));
      root.querySelector('.dv-house-reading').innerHTML=houseReading(s.reading);return;
    }
    if(button.hasAttribute('data-dv-cell')) {
      s.reading.selected=Number(button.dataset.dvCell);
      root.querySelectorAll('[data-dv-cell]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dvCell)===s.reading.selected)));
      root.querySelector('.dv-tableau-reading').innerHTML=tableauReading(s.reading);return;
    }
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
