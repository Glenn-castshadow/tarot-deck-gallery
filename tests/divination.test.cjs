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
