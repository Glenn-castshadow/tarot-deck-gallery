const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../divination-engine.js');
const D = require('../divination-data.js');
test('complete decks and unique figure patterns', () => {
  for (const [key,count] of [['lenormand',36],['runes',24],['oracle',24],['figures',16]]) {
    assert.equal(D[key].length,count);
    assert.equal(new Set(D[key].map(x=>x.name)).size,count);
    assert.ok(D[key].every(x=>x.meaning.length>75 && x.prompt.endsWith('?')));
  }
  assert.equal(new Set(D.figures.map(x=>x.symbol)).size,16);
});
test('draw without replacement including both endpoint choices', () => {
  assert.deepEqual(E.draw(36,5,()=>0),[0,1,2,3,4]);
  assert.deepEqual(E.draw(5,5,n=>n-1),[4,0,1,2,3]);
  assert.throws(()=>E.draw(24,25));
  assert.throws(()=>E.draw(24,3,()=>24));
});
test('independent hand-derived shield fixture', () => {
  const mothers=[[1,1,1,1],[2,2,2,2],[1,2,1,2],[2,1,2,1]];
  const s=E.shield(mothers);
  assert.deepEqual(s.daughters,[[1,2,1,2],[1,2,2,1],[1,2,1,2],[1,2,2,1]]);
  assert.deepEqual(s.nieces,[[1,1,1,1],[1,1,1,1],[2,2,1,1],[2,2,1,1]]);
  assert.deepEqual(s.witnesses,[[2,2,2,2],[2,2,2,2]]);
  assert.deepEqual(s.judge,[2,2,2,2]);
  assert.deepEqual(s.reconciler,[1,1,1,1]);
  assert.deepEqual(mothers[0],[1,1,1,1]);
});
test('every one of 65,536 possible casts has an even judge and named figures', () => {
  const patterns = new Set(D.figures.map(f=>f.symbol));
  for(let bits=0;bits<65536;bits++) {
    const mothers=Array.from({length:4},(_,m)=>Array.from({length:4},(_,r)=>((bits>>(m*4+r))&1)+1));
    const s=E.shield(mothers);
    assert.equal(s.judge.reduce((a,b)=>a+b,0)%2,0);
    assert.ok(s.all.every(f=>patterns.has(f.join(''))));
  }
});
test('reject malformed mothers and preserve inputs', () => {
  assert.throws(()=>E.shield([[1,1,1,0],[1,1,1,1],[1,1,1,1],[1,1,1,1]]));
  assert.throws(()=>E.shield([]));
  const a=[1,2,1,2]; assert.deepEqual(E.combine(a,a),[2,2,2,2]); assert.deepEqual(a,[1,2,1,2]);
});
test('loadIds sanitises a saved id list with every slot revealed, or rejects a malformed one', () => {
  const ids = [2, 5, 9];
  const loaded = E.loadIds(ids, 36);
  assert.notEqual(loaded, null);
  assert.deepEqual(loaded.ids, ids);
  assert.notEqual(loaded.ids, ids, 'must be a copy, not the same array reference');
  assert.equal(loaded.revealed.size, ids.length);
  assert.deepEqual([...loaded.revealed].sort((a,b)=>a-b), [0,1,2], 'every slot must be in the revealed set');
  assert.equal(E.loadIds(null, 36), null, 'non-array rejected');
  assert.equal(E.loadIds([], 36), null, 'empty list rejected');
  assert.equal(E.loadIds([1,2,3,4,5,6], 36), null, 'more than 5 ids rejected');
  assert.equal(E.loadIds([2,2,9], 36), null, 'duplicate ids rejected');
  assert.equal(E.loadIds([2,5,40], 36), null, 'out-of-range id rejected');
  assert.equal(E.loadIds([-1,2,5], 36), null, 'negative id rejected');
});
test('sixty-four hexagrams in King Wen order with the standard line patterns',()=>{
  assert.equal(D.hexagrams.length,64);
  assert.equal(new Set(D.hexagrams.map(h=>h.symbol)).size,64);
  assert.equal(new Set(D.hexagrams.map(h=>h.character)).size,64);
  D.hexagrams.forEach((h,i)=>{assert.equal(h.id,i);assert.equal(h.number,i+1);assert.match(h.symbol,/^[01]{6}$/);});
  const by=n=>D.hexagrams[n-1].symbol;
  assert.equal(by(1),'111111');assert.equal(by(2),'000000');assert.equal(by(11),'111000');assert.equal(by(12),'000111');
  assert.equal(by(63),'101010');assert.equal(by(64),'010101');assert.equal(by(3),'100010');assert.equal(by(29),'010010');
  // King Wen pairing: an even hexagram is the odd one before it turned upside down, or, when that is the same figure, its line-by-line opposite.
  for(let n=1;n<64;n+=2) {
    const a=by(n), reversed=[...a].reverse().join(''), complement=[...a].map(c=>c==='1'?'0':'1').join('');
    assert.equal(by(n+1),reversed===a?complement:reversed,`pair ${n}/${n+1}`);
  }
  const trigram=s=>D.trigrams.find(t=>t.symbol===s);
  assert.equal(D.trigrams.length,8);
  for(const h of D.hexagrams) {assert.ok(trigram(h.symbol.slice(0,3)),`lower trigram of ${h.number}`);assert.ok(trigram(h.symbol.slice(3)),`upper trigram of ${h.number}`);}
  assert.deepEqual(D.trigrams.map(t=>t.symbol),['111','110','101','100','011','010','001','000']);
  assert.deepEqual(D.trigrams.map(t=>t.image),['Heaven','Lake','Fire','Thunder','Wind','Water','Mountain','Earth']);
});
test('hexagram, trigram and line-position prose is original, reflective and complete',()=>{
  for(const h of D.hexagrams) {
    assert.ok(h.meaning.length>75,`meaning ${h.number}`);assert.ok(h.prompt.endsWith('?'),`prompt ${h.number}`);
    const words=h.gloss.trim().split(/\s+/).length;assert.ok(words>=3&&words<=5,`gloss ${h.number}: ${h.gloss}`);
    assert.ok(h.keyword.length>2&&h.name.length>1&&h.character.length>=1);
  }
  assert.equal(new Set(D.hexagrams.map(h=>h.gloss)).size,64,'glosses are distinct');
  assert.equal(D.linePositions.length,6);
  for(const p of D.linePositions) assert.ok(p.text.length>90&&p.title.length>3);
  const all=[...D.hexagrams.map(h=>h.meaning+h.prompt+h.gloss),...D.linePositions.map(p=>p.text)].join('\n');
  assert.doesNotMatch(all,/you will|luck|fortune|misfortune|danger|death|disaster|wealth will/i);
});
test('i ching casting: coins and yarrow probabilities from an injected random source',()=>{
  const seq=values=>{let i=0;return ()=>values[i++];};
  assert.equal(E.castLine('coins',seq([0,0,0])),6,'three tails');
  assert.equal(E.castLine('coins',seq([1,1,1])),9,'three heads');
  assert.equal(E.castLine('coins',seq([1,0,0])),7);
  assert.equal(E.castLine('coins',seq([1,1,0])),8);
  assert.deepEqual([0,1,5,6,12,13,15].map(n=>E.castLine('yarrow',seq([n]))),[6,7,7,8,8,9,9]);
  assert.throws(()=>E.castLine('dice'));
  const lines=E.castHexagram('coins',seq([1,1,1, 0,0,0, 1,0,0, 0,1,0, 1,1,0, 0,0,1]));
  assert.deepEqual(lines,[9,6,7,7,8,7]);
});
test('i ching reading: primary, changing lines and the relating hexagram',()=>{
  const all9=E.readLines([9,9,9,9,9,9],D.hexagrams);
  assert.equal(all9.primary,0,'hexagram 1');assert.deepEqual(all9.changing,[0,1,2,3,4,5]);assert.equal(all9.relating,1,'becomes hexagram 2');
  const still=E.readLines([7,8,7,8,7,8],D.hexagrams);
  assert.equal(still.primarySymbol,'101010');assert.equal(still.primary,62,'hexagram 63');assert.deepEqual(still.changing,[]);assert.equal(still.relating,null);
  const one=E.readLines([7,7,7,7,7,6],D.hexagrams);
  assert.equal(one.primarySymbol,'111110');assert.equal(one.primary,42,'hexagram 43');assert.deepEqual(one.changing,[5]);assert.equal(one.relatingSymbol,'111111');assert.equal(one.relating,0);
  for(const bad of [[7,7,7,7,7],[7,7,7,7,7,5],[7,7,7,7,7,'9'],null,'777777']) assert.throws(()=>E.readLines(bad,D.hexagrams),`rejects ${JSON.stringify(bad)}`);
  assert.deepEqual(E.loadLines([6,7,8,9,7,8]),[6,7,8,9,7,8]);
  assert.equal(E.loadLines([6,7,8,9,7]),null);assert.equal(E.loadLines([6,7,8,9,7,10]),null);assert.equal(E.loadLines('678978'),null);
  assert.equal(E.hexagramIndex('010010',D.hexagrams),28);
});
test('Grand Tableau near and knight cells match hand lists', () => {
  const near = p => E.tableauNear(p).join(','), knight = p => E.tableauKnight(p).join(',');
  assert.equal(near(1), '2,9,10');          assert.equal(knight(1), '11,18');
  assert.equal(near(8), '7,15,16');         assert.equal(knight(8), '14,23');
  assert.equal(near(12), '3,4,5,11,13,19,20,21'); assert.equal(knight(12), '2,6,18,22,27,29');
  assert.equal(near(28), '19,20,21,27,29'); assert.equal(knight(28), '11,13,18,22');
  assert.equal(near(34), '');               assert.equal(knight(34), '');
});

test('the tableau finds the significator, and refuses anything but a full permutation', () => {
  const ids = Array.from({length: 36}, (_, i) => i);
  const man = E.tableau(ids, 'man');
  assert.equal(man.significatorPosition, 28);     // id 27, the Man, in position 28
  assert.deepEqual(man.corners, [1, 8, 25, 32]);
  assert.deepEqual(man.closing, [33, 34, 35, 36]);
  assert.equal(E.tableau(ids, 'woman').significatorPosition, 29);
  const none = E.tableau(ids, 'none');
  assert.equal(none.significatorPosition, null);
  assert.deepEqual(none.near, []);
  const moved = [...ids]; [moved[27], moved[33]] = [moved[33], moved[27]];   // Man into the closing row
  assert.deepEqual(E.tableau(moved, 'man').near, []);
  assert.throws(() => E.tableau(ids.slice(0, 35), 'none'));
  assert.throws(() => E.tableau([...ids.slice(0, 35), 0], 'none'));
  assert.throws(() => E.tableau(ids, 'queen'));
  assert.deepEqual(E.loadTableau({ids, significator: 'woman', selected: 5}), {ids, significator: 'woman', selected: 5});
  assert.deepEqual(E.loadTableau({ids, significator: 'x', selected: 99}), {ids, significator: 'none', selected: 0});
  assert.equal(E.loadTableau({ids: [1, 2]}), null);
  assert.equal(E.loadTableau(null), null);
});

const F = ['1111','2222','2211','1122','2112','1221','2121','1212','1222','2221','2212','2122'].map(s => [...s].map(Number));
const base = () => F.map(f => [...f]);
const pick = j => ({passage: j.passage, occupation: j.occupation, conjunction: j.conjunction, mutation: j.mutation, translation: j.translation, aspects: j.aspects});

test('house chart placement follows mothers, daughters, nieces', () => {
  const shield = E.shield([[1,1,1,1],[2,2,2,2],[1,2,1,2],[2,1,2,1]]);
  const houses = E.houseChart(shield);
  assert.equal(houses.length, 12);
  assert.deepEqual(houses.slice(0, 4), shield.mothers);
  assert.deepEqual(houses.slice(4, 8), shield.daughters);
  assert.deepEqual(houses.slice(8, 12), shield.nieces);
  assert.equal(E.houseDistance(12, 1), 1);
  assert.equal(E.houseDistance(11, 2), 3);
});

test('judgement finds each mode of perfection and each aspect on hand-built charts', () => {
  assert.deepEqual(pick(E.judge(base(), 7)), {passage: [], occupation: false, conjunction: false, mutation: false, translation: [], aspects: []});
  let h = base(); h[6] = [...h[0]];
  assert.deepEqual(pick(E.judge(h, 7)), {passage: [7], occupation: true, conjunction: false, mutation: false, translation: [], aspects: []});
  h = base(); h[7] = [...h[0]];
  assert.equal(E.judge(h, 7).conjunction, true);                      // querent's figure in 8, next to 7
  h = base(); h[11] = [...h[6]];
  assert.equal(E.judge(h, 7).conjunction, true);                      // quesited's figure in 12, next to 1
  h = base(); h[3] = [...h[0]]; h[4] = [...h[6]];
  assert.deepEqual(pick(E.judge(h, 7)), {passage: [4], occupation: false, conjunction: false, mutation: true, translation: [], aspects: [{house: 4, aspect: 'square'}]});
  h = base(); h[1] = [...h[5]];
  assert.deepEqual(E.judge(h, 7).translation, [{from: 2, to: 6}]);    // one figure in 2 (next to 1) and 6 (next to 7)
  h = base(); h[9] = [...h[0]];
  assert.deepEqual(E.judge(h, 4).aspects, [{house: 10, aspect: 'opposition'}]);
  h = base(); h[2] = [...h[0]];
  assert.deepEqual(E.judge(h, 5).aspects, [{house: 3, aspect: 'sextile'}]);
  h = base(); h[10] = [...h[0]];
  assert.deepEqual(E.judge(h, 7).aspects, [{house: 11, aspect: 'trine'}]);
  assert.throws(() => E.judge(base(), 1), RangeError);
  assert.throws(() => E.judge(base().slice(0, 11), 7));
});

test('house chart payloads load or are refused', () => {
  const mothers = [[1,1,1,1],[2,2,2,2],[1,2,1,2],[2,1,2,1]];
  assert.deepEqual(E.loadHouses({mothers, quesited: 10, selected: 3}), {mothers, quesited: 10, selected: 3});
  assert.deepEqual(E.loadHouses({mothers, quesited: 1, selected: 0}), {mothers, quesited: 7, selected: 1});
  assert.equal(E.loadHouses({mothers: [[1]], quesited: 7}), null);
  assert.equal(E.loadHouses(null), null);
});
test('tableau and house-chart copy is complete and reflective', () => {
  assert.equal(D.tableauHouses.length, 36);
  assert.equal(D.houseMatters.length, 12);
  assert.ok(D.tableauHouses.every(s => s.trim().length > 0));
  assert.ok(D.houseMatters.every(h => h.name.trim().length > 0 && h.matter.trim().length > 0));
  const all = [...D.tableauHouses, ...D.houseMatters.map(h => h.name + ' ' + h.matter)].join('\n');
  assert.doesNotMatch(all, /you will|will happen|\bluck|fortune|death|disease|illness|enemy|enemies|doom|destined/i);
});

test('translation needs one figure in two different houses, not a single house between the two', () => {
  // House 2 sits beside both house 1 and house 3; with every figure distinct there is no translation.
  assert.deepEqual(E.judge(base(), 3).translation, []);
  assert.deepEqual(E.judge(base(), 11).translation, []);
  // The same figure in 12 (beside 1) and 4 (beside 3) is a translation for quesited 3.
  const h = base(); h[3] = [...h[11]];
  assert.deepEqual(E.judge(h, 3).translation, [{from: 12, to: 4}]);
});

test('the house chart view names a place for every conjunction and mutation the engine finds, and renders every step', () => {
  // The view's block is lifted out of divination.js (a browser IIFE) and run with stand-ins for its DOM helpers.
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../divination.js'), 'utf8');
  const block = src.slice(src.indexOf('  // Geomantic house chart.'), src.indexOf('  function hexagramOutput'));
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const figure = points => D.figures.find(f => f.symbol === points.join(''));
  const states = {geomancy: {quesited: 7}};
  const view = new Function('D', 'E', 'esc', 'figure', 'states', 'visual', 'saveControl', `${block};return {perfectionDetail, judgement};`)(D, E, esc, figure, states, () => '', () => '');
  for (let x = 0; x < 65536; x += 7) {
    const bits = Array.from({length: 16}, (_, i) => ((x >> i) & 1) + 1);
    const chart = E.shield([0, 1, 2, 3].map(i => bits.slice(i * 4, i * 4 + 4))), houses = E.houseChart(chart);
    for (let q = 2; q <= 12; q++) {
      const j = E.judge(houses, q), d = view.perfectionDetail(houses, q);
      assert.equal(d.conjunction.length > 0, j.conjunction);
      assert.equal(d.mutation.length > 0, j.mutation);
      // Every listed house satisfies the engine's definition, and each house is listed once.
      const same = (h, f) => houses[h - 1].join('') === f.join(''), away = h => h !== 1 && h !== q;
      assert.equal(new Set(d.conjunction.map(c => c.house)).size, d.conjunction.length);
      for (const c of d.conjunction) {
        assert.ok(away(c.house) && c.next.length > 0);
        for (const n of c.next) {
          assert.equal(E.houseDistance(c.house, n), 1);
          assert.ok(n === q ? same(c.house, j.querentFigure) : n === 1 && same(c.house, j.quesitedFigure));
        }
      }
      for (const [x1, x2] of d.mutation) {
        assert.ok(away(x1) && away(x2) && x2 === x1 % 12 + 1);
        assert.ok((same(x1, j.querentFigure) && same(x2, j.quesitedFigure)) || (same(x1, j.quesitedFigure) && same(x2, j.querentFigure)));
      }
      if (x % 91 === 0) {
        states.geomancy.quesited = q;
        const html = view.judgement({chart, house: 1});
        assert.doesNotMatch(html, /undefined|NaN|\bwill\b|\bluck|fortune\b/i);
        assert.equal((html.match(/<h5>/g) || []).length, 4);
      }
    }
  }
});

// A minimal stand-in DOM element for running the browser IIFE divination.js under Node.
const el = () => { const cache = {}; return {innerHTML: '', textContent: '', hidden: false, open: false, dataset: {}, style: {setProperty() {}},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, append() {}, focus() {}, scrollIntoView() {}, showModal() {}, close() {},
  insertAdjacentHTML(_, html) { this.innerHTML = html + this.innerHTML; }}; };

test('the divination save button names a registered kind that matches the current draw in every practice and view', () => {
  // divination.js is a browser IIFE; it runs here against a minimal stand-in DOM.
  const root = el(), registry = {}, win = {}, backs = [], listeners = {}, created = [];
  root.style.setProperty = (name, value) => { if (name === '--dv-back') backs.push(value); };
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const doc = {querySelector: () => root, createElement: () => { const node = el(); created.push(node); return node; }, body: el(), addEventListener() {}};
  const PC = require('../playing-cards.js');
  const art = {emblem: () => '', hexagram: () => '', hexagramFromSymbol: () => ''};
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../divination.js'), 'utf8');
  new Function('document', 'window', 'Rooms', 'DivinationData', 'DivinationEngine', 'DivinationArt', 'PlayingCards', src)(doc, win, {register: (kind, room) => { registry[kind] = room; }}, D, E, art, PC);
  const shuffled = Array.from({length: 36}, (_, i) => (i * 7) % 36);
  const mothers = [[1, 2, 1, 2], [2, 2, 1, 1], [1, 1, 1, 2], [2, 1, 2, 2]];
  const cases = [
    ['lenormand', {kind: 'lenormand', layout: '3', payload: {ids: [0, 1, 2]}}],
    ['grand-tableau', {kind: 'grand-tableau', payload: {ids: shuffled, significator: 'man', selected: 3}}],
    ['oracle', {kind: 'oracle', layout: '1', payload: {ids: [4]}}],
    ['runes', {kind: 'runes', layout: '3', payload: {ids: [1, 2, 3]}}],
    ['geomancy', {kind: 'geomancy', payload: {mothers, selected: 2}}],
    ['geomancy-houses', {kind: 'geomancy-houses', payload: {mothers, quesited: 5, selected: 9}}],
    ['cartomancy', {kind: 'cartomancy', layout: '1', payload: {ids: [51]}}],
    ['cartomancy', {kind: 'cartomancy', layout: '3', payload: {ids: [0, 51, 32]}}],
    ['iching', {kind: 'iching', layout: 'coins', payload: {lines: [7, 8, 9, 6, 7, 8]}}],
  ];
  for (const [kind, reading] of cases) {
    assert.equal(win.DivinationRoom.loadDraw(reading), true, kind);
    const button = root.querySelector('.dv-output').innerHTML.match(/data-save-reading="([^"]+)"/);
    assert.ok(button, kind);
    assert.equal(button[1], kind);
    assert.ok(registry[kind], kind);
    assert.equal(registry[kind].current().kind, kind);
    assert.equal(win.DivinationRoom.currentDraw().kind, kind);
  }
  assert.match(win.DivinationRoom.currentDraw().summary, /^Hexagram /);
  // Playing cards: layout and summary, vector faces and a CSS back, and no request for missing artwork.
  for (const [ids, summary] of [[[51], 'King of Spades'], [[0, 51, 32], 'Ace of Hearts · King of Spades · Seven of Clubs']]) {
    backs.length = 0;
    assert.equal(win.DivinationRoom.loadDraw({kind: 'cartomancy', payload: {ids}}), true);
    const draw = win.DivinationRoom.currentDraw();
    assert.deepEqual([draw.kind, draw.layout, draw.summary, draw.payload.ids], ['cartomancy', String(ids.length), summary, ids]);
    const out = root.querySelector('.dv-output').innerHTML;
    assert.equal((out.match(/class="pc-card /g) || []).length, ids.length);
    assert.match(root.innerHTML, /Six ways to listen closely/);
    assert.equal((root.innerHTML.match(/class="pc-card /g) || []).length, 52, 'the library shows all 52 faces');
    assert.deepEqual(backs, ['var(--pc-back)']);
    for (const back of [true, false]) {
      const button = {dataset: {dvArt: String(ids[0])}, hasAttribute: name => name === 'data-dv-art' || (back && name === 'data-dv-back')};
      listeners.click({target: {closest: () => button}});
      const dialog = created[0].innerHTML;
      assert.match(dialog, back ? /dv-pc-back/ : new RegExp(`<title>${summary.split(' · ')[0]}</title>`));
      assert.doesNotMatch(dialog, /<img|\.webp/);
    }
    assert.doesNotMatch(root.innerHTML + out, /<img|\.webp|divination-v2/);
  }
  // Playing-card practice copy: intro, note, positions, position meanings and every shape of synthesis.
  const banned = /you will|will happen|is going to|\bluck|fortune|misfortune|death|\bdie\b|illness|disease|curse|doom|destined|guarantee/i;
  for (const ids of [[7], [0, 1, 2], [0, 51, 32]]) {
    assert.equal(win.DivinationRoom.loadDraw({kind: 'cartomancy', payload: {ids}}), true);
    const text = root.innerHTML + root.querySelector('.dv-output').innerHTML;
    assert.match(text, /Draw from a familiar pack/);
    assert.match(text, /standard 52-card deck/);
    assert.match(text, ids.length === 1 ? /What to notice[\s\S]*one thing to notice today/ : /What asks for attention[\s\S]*one small step you could choose/);
    assert.match(text, ids.length === 1 ? /Take it into your day/ : ids[1] === 1 ? /All three cards are Hearts/ : /The suits here are/);
    assert.doesNotMatch(text, banned, ids.join());
    assert.doesNotMatch(text, /'/, `${ids.join()} uses a straight apostrophe`);
    assert.doesNotMatch(text, /undefined|NaN/);
  }
  // A saved reading must use a layout the practice offers; a refused load leaves the practice able to render.
  for (const [kind, ids] of [['cartomancy', [0, 1]], ['cartomancy', [0, 1, 2, 3, 4]], ['oracle', [0, 1]]]) {
    assert.equal(win.DivinationRoom.loadDraw({kind, payload: {ids}}), false, `${kind} with ${ids.length} ids`);
    assert.doesNotThrow(() => listeners.click({target: {closest: () => ({dataset: {dvMode: kind}})}}), `${kind} renders`);
    assert.doesNotMatch(root.querySelector('.dv-output').innerHTML, /undefined/);
  }
  assert.equal(win.DivinationRoom.loadDraw({kind: 'lenormand', payload: {ids: [0, 1, 2, 3, 4]}}), true, 'Lenormand five-card line');
  win.DivinationRoom.loadDraw(cases[5][1]);
  assert.equal(win.DivinationRoom.currentDraw().summary, `House chart · house 5, ${D.houseMatters[4].name}: ${D.figures.find(f => f.symbol === E.houseChart(E.shield(mothers))[4].join('')).name}`);
});

test('changing lines and the I Ching study panel read IChingLines when present, and fall back to position texts otherwise', () => {
  // divination.js is a browser IIFE; run it here with a stub IChingLines that only covers hexagram 1.
  const root = el(), win = {}, listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const doc = {querySelector: () => root, createElement: () => el(), body: el(), addEventListener() {}};
  const PC = require('../playing-cards.js');
  const art = {emblem: () => '', hexagram: () => '', hexagramFromSymbol: () => ''};
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../divination.js'), 'utf8');
  const stubLines = ['Stub line one text here.', 'Stub line two text here.', 'Stub line three text here.',
    'Stub line four text here.', 'Stub line five text here.', 'Stub line six text here.'];
  const stub = {lines: {1: stubLines}, has: n => n === 1, forLine: (n, i) => n === 1 ? stubLines[i] : null};
  new Function('document', 'window', 'Rooms', 'DivinationData', 'DivinationEngine', 'DivinationArt', 'PlayingCards', 'IChingLines', src)
    (doc, win, {register() {}}, D, E, art, PC, stub);

  // Hexagram 1, all six lines changing: every changing-line paragraph uses the stub's text.
  assert.equal(win.DivinationRoom.loadDraw({kind: 'iching', payload: {lines: [9, 9, 9, 9, 9, 9]}}), true);
  const withStub = root.querySelector('.dv-output').innerHTML;
  for (const text of stubLines) assert.ok(withStub.includes(text), text);

  // A hexagram the stub lacks (hexagram 43, one changing line) falls back to the position text.
  assert.equal(win.DivinationRoom.loadDraw({kind: 'iching', payload: {lines: [7, 7, 7, 7, 7, 6]}}), true);
  const withoutStub = root.querySelector('.dv-output').innerHTML;
  assert.ok(withoutStub.includes(D.linePositions[5].text));
  assert.ok(!stubLines.some(text => withoutStub.includes(text)));

  // Study panel: hexagram 1 (study index 0) is covered by the stub and lists all six lines.
  listeners.click({target: {closest: () => ({dataset: {dvMode: 'iching'}})}});
  const study1 = root.querySelector('.dv-study').innerHTML;
  assert.match(study1, /dv-iching-lines/);
  for (const text of stubLines) assert.ok(study1.includes(text), text);
  assert.equal((study1.match(/<li>/g) || []).length, 6);

  // Hexagram 2 (study index 1) is not in the stub, so the lines section is absent entirely.
  const studyButton = {dataset: {dvStudy: '1'}, hasAttribute: name => name === 'data-dv-study'};
  listeners.click({target: {closest: () => studyButton}});
  const study2 = root.querySelector('.dv-study').innerHTML;
  assert.doesNotMatch(study2, /dv-iching-lines/);
});
