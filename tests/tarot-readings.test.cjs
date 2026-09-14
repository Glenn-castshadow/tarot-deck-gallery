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

test('all six spreads deal the correct count without replacement from all 78 cards', () => {
  const reached=new Set();
  for(const [id,count] of [['celtic',10],['horseshoe',7],['three',3],['question',2],['relationship',7],['year',13]]) {
    for(let seed=0;seed<80;seed++) {
      const draw=Tarot.deal(id,cards,seeded(seed),'','general',id==='year'?{dealtAt:'2026-03-09'}:{});
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
    const draw=Tarot.deal(id,cards,seeded(42),'What can I learn?','work',id==='year'?{dealtAt:'2026-03-09'}:{}), revealed=new Set(draw.cards.map((_,i)=>i));
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

test('deal options default to the behaviour that shipped before them', () => {
  // The same seed must produce the same draw with no options, with an empty object, and with
  // the defaults written out. If any of these diverge, existing saved readings are at risk.
  const bare = Tarot.deal('celtic', cards, seeded(7), 'q', 'general');
  const empty = Tarot.deal('celtic', cards, seeded(7), 'q', 'general', {});
  const explicit = Tarot.deal('celtic', cards, seeded(7), 'q', 'general', {reversals: true, majorsOnly: false});
  assert.deepEqual(empty, bare);
  assert.deepEqual(explicit, bare);
});

test('reversals off yields no reversed card, and on yields both orientations', () => {
  const off = new Set();
  const on = new Set();
  for (let seed = 0; seed < 60; seed++) {
    for (const c of Tarot.deal('celtic', cards, seeded(seed), '', 'general', {reversals: false}).cards) off.add(c.orientation);
    for (const c of Tarot.deal('celtic', cards, seeded(seed), '', 'general', {reversals: true}).cards) on.add(c.orientation);
  }
  assert.deepEqual([...off], ['upright'], 'a reversal appeared with reversals off');
  assert.deepEqual([...on].sort(), ['reversed', 'upright'], 'the default should still reverse sometimes');
});

test('major-only restricts the pool to the 22 majors and still fills the largest spread', () => {
  const seen = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const draw = Tarot.deal('celtic', cards, seeded(seed), '', 'general', {majorsOnly: true});
    assert.equal(draw.cards.length, 10);
    for (const c of draw.cards) {
      assert.ok(c.index >= 0 && c.index <= 21, `index ${c.index} is not a Major Arcanum`);
      assert.equal(cards[c.index].type, 'major');
      seen.add(c.index);
    }
  }
  assert.equal(seen.size, 22, 'every Major Arcanum should be reachable');
});

test('major-only refuses a spread the majors alone cannot fill', () => {
  // Five majors among twenty-eight cards. The deck is comfortably larger than a ten-card
  // spread, so this only throws if the guard counts the POOL rather than the deck — which is
  // the whole point of the check. A two-card deck would throw either way and prove nothing.
  const thinInMajors = [...cards.slice(0, 5), ...cards.slice(22, 45)];
  assert.equal(thinInMajors.filter(c => c.type === 'major').length, 5);
  assert.equal(thinInMajors.length, 28);
  assert.throws(() => Tarot.deal('celtic', thinInMajors, seeded(1), '', 'general', {majorsOnly: true}), RangeError);
  // The same deck deals fine when the minors are allowed back in.
  assert.equal(Tarot.deal('celtic', thinInMajors, seeded(1), '', 'general').cards.length, 10);
});


test("the one-card draw deals two cards and pairs them", () => {
  const spread = Tarot.spreads.question;
  assert.equal(spread.positions.length, 2);
  assert.equal(spread.shape, "question");
  assert.deepEqual(spread.pairs.map(p => [p[0], p[1]]), [[0, 1]]);
  assert.ok(spread.advice === 0 && spread.outcome === 1);
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal("question", cards, seeded(seed), "Will it?", "general");
    assert.equal(draw.cards.length, 2);
    assert.notEqual(draw.cards[0].index, draw.cards[1].index);
  }
});

test("the one-card draw promises no answer and no lean", () => {
  const spread = Tarot.spreads.question;
  const text = `${spread.name} ${spread.subtitle} ${spread.description} ${spread.tradition} ${spread.positions.map(p => `${p.name} ${p.lens} ${p.question}`).join(" ")}`.toLowerCase();
  for (const phrase of ["yes or no", "leans toward", "leans away", "the answer", "says yes", "says no"]) {
    assert.ok(!text.includes(phrase), `"${phrase}" appears in the one-card draw copy`);
  }
  // The clarifier is dealt with the first card, not drawn afterwards, and the copy must say so.
  assert.match(spread.tradition, /dealt together|at the same/i);
});

test('the relationship spread faces two columns with the connection between them', () => {
  const spread = Tarot.spreads.relationship;
  assert.equal(spread.positions.length, 7);
  assert.equal(spread.shape, 'relationship');
  const [you, them, between, helps, strains, advice, tendency] = spread.positions;
  // The two people face each other across the table and the connection sits between them.
  assert.ok(you.x < between.x && between.x < them.x, 'the connection should sit between the two people');
  assert.equal(you.y, them.y, 'the two people should be level with one another');
  assert.equal(between.y, you.y, 'the connection should share their row');
  // What helps and what strains straddle the centre line below them.
  assert.ok(helps.x < 50 && strains.x > 50, 'helps and strains should straddle the centre');
  assert.equal(helps.y, strains.y);
  assert.ok(helps.y > you.y, 'the second row should sit below the first');
  assert.ok(advice.y > helps.y && tendency.y > helps.y, 'advice and tendency form the last row');
  assert.ok(spread.advice === 5 && spread.outcome === 6);
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal('relationship', cards, seeded(seed), '', 'relationships');
    assert.equal(draw.cards.length, 7);
    assert.equal(new Set(draw.cards.map(c => c.index)).size, 7);
  }
});

test('the relationship spread refuses to read another person’s mind', () => {
  const spread = Tarot.spreads.relationship;
  const other = `${spread.positions[1].lens} ${spread.positions[1].question}`;
  const strains = `${spread.positions[4].lens} ${spread.positions[4].question}`;
  // Tied to the actual claim — a card cannot report the other person's private thoughts or
  // feelings — rather than a loose keyword that could turn up by accident elsewhere in the lens.
  assert.match(other, /cannot report their private thoughts or feelings/i,
    'the position for the other person must say what a card cannot report');
  assert.ok(other.length > 80 && strains.length > 80);
  // The strains position is where a relationship spread most easily starts assigning blame.
  // Its refusal to do so is the load-bearing part, so bind it rather than just its length.
  assert.match(strains, /not the same as a fault|rarely located in one person/i,
    'the strains position must refuse to locate the difficulty in a person');
});

test('the year spread is a theme at the centre with twelve months clockwise from the top', () => {
  const spread = Tarot.spreads.year;
  assert.equal(spread.positions.length, 13);
  assert.equal(spread.shape, 'year');
  const [theme, ...months] = spread.positions;
  assert.equal(theme.x, 50);
  assert.equal(theme.y, 50);
  assert.equal(months.length, 12);
  // Every month sits the same distance from the centre once the ellipse is normalised.
  const radii = months.map(p => Math.hypot((p.x - 50) / 36, (p.y - 50) / 38));
  for (const r of radii) assert.ok(Math.abs(r - 1) < 0.02, `a month is off the wheel (radius ${r})`);
  // The first month is at the top, and the wheel runs clockwise.
  assert.equal(months[0].x, 50);
  assert.ok(months[0].y < 50, 'the first month should be above the centre');
  assert.ok(months[3].x > 50 && Math.abs(months[3].y - 50) < 1, 'the fourth month should be due right');
  assert.ok(months[6].x === 50 && months[6].y > 50, 'the seventh month should be at the bottom');
  assert.ok(months[9].x < 50 && Math.abs(months[9].y - 50) < 1, 'the tenth month should be due left');
  assert.ok(spread.advice === 0 && spread.outcome === 12);
});

test('the year spread deals thirteen distinct cards, and does so from the majors alone', () => {
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal('year', cards, seeded(seed), '', 'general', {dealtAt: '2026-03-09'});
    assert.equal(draw.cards.length, 13);
    assert.equal(new Set(draw.cards.map(c => c.index)).size, 13);
  }
  // Thirteen from twenty-two must still work, which is the tightest the major-only option gets.
  const majors = Tarot.deal('year', cards, seeded(3), '', 'general', {majorsOnly: true, dealtAt: '2026-03-09'});
  assert.equal(majors.cards.length, 13);
  for (const c of majors.cards) assert.ok(c.index <= 21);
});

test('every spread points advice and outcome at positions it actually has', () => {
  // Now that six spreads exist, this is a cross-spread invariant rather than a per-spread check.
  // reportHTML reads spread.positions[spread.advice] directly, so an out-of-range index would
  // throw only once a reader revealed the whole spread.
  for (const [id, spread] of Object.entries(Tarot.spreads)) {
    assert.ok(Number.isInteger(spread.advice), `${id} has no advice index`);
    assert.ok(Number.isInteger(spread.outcome), `${id} has no outcome index`);
    assert.ok(spread.advice >= 0 && spread.advice < spread.positions.length, `${id} advice out of range`);
    assert.ok(spread.outcome >= 0 && spread.outcome < spread.positions.length, `${id} outcome out of range`);
    for (const [a, b, title] of spread.pairs) {
      assert.ok(a >= 0 && a < spread.positions.length, `${id} pair references position ${a}`);
      assert.ok(b >= 0 && b < spread.positions.length, `${id} pair references position ${b}`);
      assert.ok(typeof title === 'string' && title.length > 0, `${id} has an unlabelled pair`);
    }
  }
});

test('the year spread names no calendar month, because the months depend on the deal date', () => {
  const spread = Tarot.spreads.year;
  const text = spread.positions.map(p => `${p.name} ${p.short} ${p.lens} ${p.question}`).join(' ');
  for (const month of ['January','February','March','April','May','June','July','August','September','October','November','December']) {
    assert.ok(!text.includes(month), `${month} is named in the position copy`);
  }
});

test('a year draw carries the date it was dealt, and the other spreads do not', () => {
  const year = Tarot.deal('year', cards, seeded(5), '', 'general', {dealtAt: '2026-03-09'});
  assert.equal(year.dealtAt, '2026-03-09');
  const celtic = Tarot.deal('celtic', cards, seeded(5), '', 'general', {dealtAt: '2026-03-09'});
  assert.equal(celtic.dealtAt, undefined, 'only the year spread should carry a deal date');
});

test('validDraw requires a deal date on a year draw and never on the others', () => {
  const year = Tarot.deal('year', cards, seeded(6), '', 'general', {dealtAt: '2026-03-09'});
  assert.ok(Tarot.validDraw(year, cards.length));
  const {dealtAt, ...dateless} = year;
  assert.equal(Tarot.validDraw(dateless, cards.length), false, 'a year draw with no date must be rejected');
  assert.equal(Tarot.validDraw({...year, dealtAt: 'March'}, cards.length), false, 'a malformed date must be rejected');
  // The half that matters: everything already saved has no dealtAt and must keep working.
  for (const id of ['celtic', 'horseshoe', 'three']) {
    const draw = Tarot.deal(id, cards, seeded(2), 'q', 'general');
    assert.equal(draw.dealtAt, undefined);
    assert.ok(Tarot.validDraw(draw, cards.length), `${id} must still validate without a deal date`);
  }
});

test('deal throws for a year reading dealt without a date, and only for the year spread', () => {
  assert.throws(() => Tarot.deal('year', cards, seeded(9), '', 'general'), RangeError);
  assert.throws(() => Tarot.deal('year', cards, seeded(9), '', 'general', {}), RangeError);
  assert.throws(() => Tarot.deal('year', cards, seeded(9), '', 'general', {dealtAt: 'not-a-date'}), RangeError);
  assert.doesNotThrow(() => Tarot.deal('year', cards, seeded(9), '', 'general', {dealtAt: '2026-03-09'}));
  for (const id of ['question', 'three', 'horseshoe', 'relationship', 'celtic']) {
    assert.doesNotThrow(() => Tarot.deal(id, cards, seeded(9), '', 'general'), `${id} must not require a deal date`);
  }
});

test('loadSpread carries the deal date through a replay', () => {
  const year = Tarot.deal('year', cards, seeded(8), 'q', 'general', {dealtAt: '2026-03-09'});
  const loaded = Tarot.loadSpread(year, cards.length);
  assert.equal(loaded.spread.dealtAt, '2026-03-09');
  assert.equal(loaded.revealed.size, 13);
  const celtic = Tarot.loadSpread(Tarot.deal('celtic', cards, seeded(8), 'q', 'general'), cards.length);
  assert.equal(celtic.spread.dealtAt, undefined);
});
