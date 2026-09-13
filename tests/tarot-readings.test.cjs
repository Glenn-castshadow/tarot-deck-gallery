const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Tarot = require('../tarot-readings.js');
// Use the actual 78-card catalogue without booting the DOM application.
const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(catalogue + '\ntarotCards', {TarotReadings:Tarot,majorArcana:require('../birth-lore.js').majorArcana});
const seeded = seed => max => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};

test('all three traditional spreads deal the correct count without replacement from all 78 cards', () => {
  const reached=new Set();
  for(const [id,count] of [['celtic',10],['horseshoe',7],['three',3]]) {
    for(let seed=0;seed<80;seed++) {
      const draw=Tarot.deal(id,cards,seeded(seed));
      assert.equal(draw.cards.length,count);
      assert.equal(new Set(draw.cards.map(x=>x.index)).size,count);
      for(const item of draw.cards) {
        assert.ok(['upright','reversed'].includes(item.orientation));
        assert.ok(item.index>=0&&item.index<78);reached.add(item.index);
      }
    }
  }
  assert.equal(reached.size,78);
  assert.throws(()=>Tarot.deal('unknown',cards,seeded(1)),RangeError);
  assert.throws(()=>Tarot.deal('celtic',cards.slice(0,5),seeded(1)),RangeError);
  assert.throws(()=>Tarot.deal('celtic',cards,()=>-1),RangeError);
});

test('the Celtic Cross preserves Waite ordering, crossing placement and bottom-to-top staff',()=>{
  const p=Tarot.spreads.celtic.positions;
  assert.deepEqual(p.map(x=>x.role),['present','challenge','aim','root','past','future','self','environment','hopes','outcome']);
  assert.equal(p[0].x,p[1].x);assert.equal(p[0].y,p[1].y);assert.equal(p[1].cross,true);
  assert.ok(p[2].y<p[0].y&&p[3].y>p[0].y&&p[4].x<p[0].x&&p[5].x>p[0].x);
  for(let i=6;i<9;i++){assert.equal(p[i].x,p[i+1].x);assert.ok(p[i].y>p[i+1].y);}
  assert.equal(new Set(p.map(x=>`${x.x}/${x.y}`)).size,9);
  const h=Tarot.spreads.horseshoe.positions;
  assert.ok(h.slice(0,-1).every((p,i)=>p.x<h[i+1].x));
  assert.equal(h[0].y,h[6].y);assert.ok(h[3].y>h[0].y);
});

test('unrevealed cards never enter reading text, connections, or synthesis',()=>{
  const draw=Tarot.deal('celtic',cards,seeded(19));
  for(const slots of [[],[0],[1],[0,1],[0,2,4,8]]) {
    const revealed=new Set(slots), report=Tarot.report(draw,cards,revealed),html=Tarot.reportHTML(draw,cards,revealed);
    assert.equal(report.visible.length,slots.length);assert.equal(report.complete,false);
    assert.ok(!html.includes('Your reading, gathered'));
    for(let i=0;i<draw.cards.length;i++) {
      const name=cards[draw.cards[i].index].name;
      if(!revealed.has(i)) assert.ok(!html.includes(name),`Hidden card leaked: ${name}`);
    }
    for(const pair of report.pairs) {
      assert.ok(slots.includes(draw.cards.indexOf(pair.a.item))&&slots.includes(draw.cards.indexOf(pair.b.item)));
    }
  }
});

test('complete reports include all positions, correct suit totals, relationships and next steps',()=>{
  for(const id of Object.keys(Tarot.spreads)) {
    const draw=Tarot.deal(id,cards,seeded(42),'What can I learn?','work'), revealed=new Set(draw.cards.map((_,i)=>i));
    const report=Tarot.report(draw,cards,revealed), html=Tarot.reportHTML(draw,cards,revealed);
    assert.equal(report.complete,true);assert.equal(report.pairs.length,Tarot.spreads[id].pairs.length);
    assert.equal(Object.entries(report.counts).filter(([k])=>k!=='reversed').reduce((n,[,v])=>n+v,0),draw.cards.length);
    assert.equal(report.counts.reversed,draw.cards.filter(x=>x.orientation==='reversed').length);
    for(const item of draw.cards) assert.ok(html.includes(cards[item.index].name));
    assert.match(html,/Your reading, gathered/);assert.match(html,/Carry it into your day/);assert.match(html,/your craft/);
    assert.equal((html.match(/class="tarot-position-reading"/g)||[]).length,draw.cards.length);
  }
});

test('questions are length-bounded, escaped on the table, and snapshotted with the chosen focus',()=>{
  const draw=Tarot.deal('three',cards,seeded(2),'<img src=x onerror="alert(1)"> & my question','invalid');
  const html=Tarot.tableHTML(draw,cards,new Set(),()=>'<button>Card back</button>');
  assert.equal(draw.focus,'general');assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
  assert.equal(Tarot.deal('three',cards,seeded(1),'x'.repeat(300)).question.length,240);
  assert.equal(Tarot.deal('three',cards,seeded(1),'  A question?  ','growth').question,'A question?');
});

test('each minor card has a distinct upright/reversed interpretation and a specific reflection',()=>{
  const minors=cards.filter(c=>c.type==='minor');assert.equal(minors.length,56);
  for(const key of ['upright','reversed','prompt']) assert.equal(new Set(minors.map(c=>c[key])).size,56);
  for(const c of minors){assert.ok(c.upright.length>100);assert.ok(c.reversed.length>100);assert.ok(c.prompt.endsWith('?'));}
  assert.match(cards.find(c=>c.name==='Three of Swords').upright,/truth|disappointment/);
  assert.match(cards.find(c=>c.name==='Eight of Cups').upright,/change/);
  assert.match(cards.find(c=>c.name==='Ten of Wands').upright,/heavy/);
});

test('validDraw accepts a dealt spread and rejects malformed payloads', () => {
  const draw = Tarot.deal('celtic', cards, seeded(3), 'Q', 'work');
  assert.equal(Tarot.validDraw(draw, cards.length), true);
  assert.equal(Tarot.validDraw({...draw, id: 'nope'}, cards.length), false);
  assert.equal(Tarot.validDraw({...draw, cards: draw.cards.slice(1)}, cards.length), false);
  assert.equal(Tarot.validDraw({...draw, cards: draw.cards.map(c => ({...c, index: 99}))}, cards.length), false);
  assert.equal(Tarot.validDraw({...draw, cards: draw.cards.map(c => ({...c, orientation: 'sideways'}))}, cards.length), false);
  assert.equal(Tarot.validDraw({...draw, cards: [draw.cards[0], ...draw.cards.slice(0, 9)]}, cards.length), false, 'duplicate cards rejected');
});

test('loadSpread turns a saved payload into a sanitised spread with every position revealed, or rejects a malformed one', () => {
  const draw = Tarot.deal('celtic', cards, seeded(5), 'A question', 'work');
  const loaded = Tarot.loadSpread(draw, cards.length);
  assert.notEqual(loaded, null);
  assert.deepEqual(loaded.spread, draw);
  assert.equal(loaded.revealed.size, draw.cards.length);
  for (let slot = 0; slot < draw.cards.length; slot++) assert.ok(loaded.revealed.has(slot), `slot ${slot} must be revealed`);
  // A payload validDraw rejects must be rejected here too, not partially applied.
  assert.equal(Tarot.loadSpread({...draw, id: 'nope'}, cards.length), null);
  assert.equal(Tarot.loadSpread({...draw, cards: draw.cards.map(c => ({...c, index: 99}))}, cards.length), null);
  assert.equal(Tarot.loadSpread(null, cards.length), null);
});
