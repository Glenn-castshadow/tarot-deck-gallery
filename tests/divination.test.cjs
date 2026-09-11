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
