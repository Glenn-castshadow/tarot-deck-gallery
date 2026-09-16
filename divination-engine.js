(function(root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.DivinationEngine = api; })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  function randomInt(max) {
    if (!Number.isInteger(max) || max < 1 || max > 65536) throw Error('Invalid random range');
    const value = new Uint32Array(1), limit = Math.floor(4294967296 / max) * max;
    do { globalThis.crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
  }
  function draw(size, count, random = randomInt) {
    if (!Number.isInteger(size) || !Number.isInteger(count) || count < 1 || count > size) throw Error('Invalid draw');
    const pool = Array.from({length:size}, (_, i) => i);
    for (let i = 0; i < count; i++) {
      const n = random(size - i);
      if (!Number.isInteger(n) || n < 0 || n >= size - i) throw Error('Invalid random result');
      const j = i + n; [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
  function validFigure(f) { return Array.isArray(f) && f.length === 4 && f.every(n => n === 1 || n === 2); }
  function combine(a, b) {
    if (!validFigure(a) || !validFigure(b)) throw Error('Four rows of one or two points required');
    return a.map((n, i) => (n + b[i]) % 2 === 0 ? 2 : 1);
  }
  function shield(input) {
    if (!Array.isArray(input) || input.length !== 4 || !input.every(validFigure)) throw Error('Four mothers required');
    const mothers = input.map(f => [...f]);
    const daughters = [0,1,2,3].map(row => mothers.map(f => f[row]));
    const first = [...mothers, ...daughters];
    const nieces = [0,2,4,6].map(i => combine(first[i], first[i+1]));
    const witnesses = [combine(nieces[0], nieces[1]), combine(nieces[2], nieces[3])];
    const judge = combine(...witnesses), reconciler = combine(mothers[0], judge);
    return {mothers, daughters, nieces, witnesses, judge, reconciler, all:[...first,...nieces,...witnesses,judge,reconciler]};
  }
  function cast(random = randomInt) {
    return shield(Array.from({length:4}, () => Array.from({length:4}, () => random(2) + 1)));
  }
  // Payload-to-state transform for replaying a saved lenormand/oracle/runes draw: validates
  // the id list (in range, no duplicates, within the layouts the UI offers) and, if valid,
  // returns a sanitised copy plus the "every slot revealed" set a replayed reading starts
  // from. Returns null on anything invalid so the caller knows to reject the load outright.
  function loadIds(ids, size) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 5 || new Set(ids).size !== ids.length || !ids.every(id => Number.isInteger(id) && id >= 0 && id < size)) return null;
    return {ids: [...ids], revealed: new Set(ids.map((_, i) => i))};
  }
  // I Ching. Lines: 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing). Bottom line first.
  function castLine(method, random = randomInt) {
    if (method === 'coins') return 6 + random(2) + random(2) + random(2);           // each coin: tails 2, heads 3
    if (method === 'yarrow') { const n = random(16); return n === 0 ? 6 : n < 6 ? 7 : n < 13 ? 8 : 9; } // 1/16, 5/16, 7/16, 3/16
    throw Error('Unknown casting method');
  }
  function castHexagram(method, random = randomInt) { return Array.from({length:6}, () => castLine(method, random)); }
  function validLines(values) { return Array.isArray(values) && values.length === 6 && values.every(v => Number.isInteger(v) && v >= 6 && v <= 9); }
  function hexagramIndex(symbol, hexagrams) { const i = hexagrams.findIndex(h => h.symbol === symbol); if (i < 0) throw Error('Unknown hexagram'); return i; }
  function readLines(values, hexagrams) {
    if (!validLines(values)) throw Error('Six lines of 6, 7, 8 or 9 required');
    const primarySymbol = values.map(v => v % 2 ? '1' : '0').join('');
    const changing = values.flatMap((v, i) => v === 6 || v === 9 ? [i] : []);
    const relatingSymbol = changing.length ? values.map(v => v === 6 ? '1' : v === 9 ? '0' : v % 2 ? '1' : '0').join('') : null;
    return {primary: hexagramIndex(primarySymbol, hexagrams), primarySymbol, changing, relating: relatingSymbol ? hexagramIndex(relatingSymbol, hexagrams) : null, relatingSymbol};
  }
  function loadLines(values) { return validLines(values) ? [...values] : null; }
  const TABLEAU_CORNERS=[1,8,25,32], TABLEAU_CLOSING=[33,34,35,36], SIGNIFICATORS={man:27,woman:28};
  const cellOf=p=>({row:Math.floor((p-1)/8),col:(p-1)%8});
  // Grand Tableau: positions 1–32 in rows of eight, 33–36 the closing row (outside near and knight).
  function tableauNear(p) {
    if(!Number.isInteger(p)||p<1||p>32) return [];
    const a=cellOf(p);
    return Array.from({length:32},(_,i)=>i+1).filter(q=>{const b=cellOf(q);return q!==p&&Math.abs(a.row-b.row)<=1&&Math.abs(a.col-b.col)<=1;});
  }
  function tableauKnight(p) {
    if(!Number.isInteger(p)||p<1||p>32) return [];
    const a=cellOf(p);
    return Array.from({length:32},(_,i)=>i+1).filter(q=>{const b=cellOf(q),dr=Math.abs(a.row-b.row),dc=Math.abs(a.col-b.col);return (dr===1&&dc===2)||(dr===2&&dc===1);});
  }
  const validPermutation=(ids,size)=>Array.isArray(ids)&&ids.length===size&&new Set(ids).size===size&&ids.every(i=>Number.isInteger(i)&&i>=0&&i<size);
  function tableau(ids, significator='none') {
    if(!validPermutation(ids,36)) throw Error('A Grand Tableau needs all 36 cards once each');
    if(!Object.hasOwn(SIGNIFICATORS,significator)&&significator!=='none') throw Error('Choose the Man, the Woman or none');
    const position=significator==='none'?null:ids.indexOf(SIGNIFICATORS[significator])+1;
    return {cells:ids.map((id,i)=>({position:i+1,id,house:i})),significator,significatorPosition:position,
      near:position?tableauNear(position):[],knight:position?tableauKnight(position):[],corners:[...TABLEAU_CORNERS],closing:[...TABLEAU_CLOSING]};
  }
  function loadTableau(p) {
    if(!p||typeof p!=='object'||!validPermutation(p.ids,36)) return null;
    return {ids:[...p.ids],significator:['man','woman','none'].includes(p.significator)?p.significator:'none',
      selected:Number.isInteger(p.selected)&&p.selected>=0&&p.selected<36?p.selected:0};
  }
  // Geomantic house chart: mothers in houses 1–4, daughters 5–8, nieces 9–12. Index 0 is house 1.
  const sameFigure=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===4&&b.length===4&&a.every((n,i)=>n===b[i]);
  function houseChart(chart) {
    if(!chart||![chart.mothers,chart.daughters,chart.nieces].every(g=>Array.isArray(g)&&g.length===4)) throw Error('A full shield is required');
    return [...chart.mothers,...chart.daughters,...chart.nieces].map(f=>[...f]);
  }
  const houseDistance=(a,b)=>{const d=Math.abs(a-b)%12;return Math.min(d,12-d);};
  const HOUSE_ASPECTS={2:'sextile',3:'square',4:'trine',6:'opposition'};
  const HOUSES=Array.from({length:12},(_,i)=>i+1);
  // One common Renaissance method. House 1 is the querent; adjacency is circular (12 sits beside 1).
  function judge(houses, quesited) {
    if(!Array.isArray(houses)||houses.length!==12) throw Error('Twelve houses required');
    if(!Number.isInteger(quesited)||quesited<2||quesited>12) throw new RangeError('Choose a quesited house from 2 to 12');
    const at=h=>houses[h-1], querent=at(1), sought=at(quesited);
    const where=figure=>HOUSES.filter(h=>sameFigure(at(h),figure));
    const passage=where(querent).filter(h=>h!==1);
    const occupation=sameFigure(querent,sought);
    const conjunction=passage.some(h=>h!==quesited&&houseDistance(h,quesited)===1)||where(sought).some(h=>h!==quesited&&h!==1&&houseDistance(h,1)===1);
    const mutation=HOUSES.some(h=>{const n=h%12+1;if([h,n].some(x=>x===1||x===quesited))return false;
      return (sameFigure(at(h),querent)&&sameFigure(at(n),sought))||(sameFigure(at(h),sought)&&sameFigure(at(n),querent));});
    const nearQuerent=HOUSES.filter(h=>h!==1&&h!==quesited&&houseDistance(h,1)===1);
    const nearSought=HOUSES.filter(h=>h!==1&&h!==quesited&&houseDistance(h,quesited)===1);
    const translation=nearQuerent.flatMap(a=>nearSought.filter(b=>b!==a&&sameFigure(at(a),at(b))).map(b=>({from:a,to:b})));
    const aspects=passage.filter(h=>h!==quesited&&HOUSE_ASPECTS[houseDistance(h,quesited)]).map(h=>({house:h,aspect:HOUSE_ASPECTS[houseDistance(h,quesited)]}));
    return {quesited,querentFigure:[...querent],quesitedFigure:[...sought],passage,occupation,conjunction,mutation,translation,aspects};
  }
  function loadHouses(p) {
    if(!p||typeof p!=='object') return null;
    try { shield(p.mothers); } catch { return null; }
    return {mothers:[...p.mothers.map(f=>[...f])],
      quesited:Number.isInteger(p.quesited)&&p.quesited>=2&&p.quesited<=12?p.quesited:7,
      selected:Number.isInteger(p.selected)&&p.selected>=1&&p.selected<=12?p.selected:1};
  }
  return {randomInt, draw, combine, shield, cast, loadIds, castLine, castHexagram, readLines, loadLines, hexagramIndex,
    tableauNear, tableauKnight, tableau, loadTableau, houseChart, houseDistance, judge, loadHouses};
});
