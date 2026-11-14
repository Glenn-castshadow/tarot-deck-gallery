const test = require('node:test');
const assert = require('node:assert/strict');
const SkyCalendarEngine = require('../sky-calendar-engine.js');
const NatalEngine = require('../natal-engine.js');
const LunarMansions = require('../lunar-mansions.js');

test('there are twenty-eight mansions, complete and in order, tiling the circle', () => {
  assert.equal(LunarMansions.MANSIONS.length, 28);
  LunarMansions.MANSIONS.forEach((m, i) => {
    assert.equal(m.number, i + 1);
    for (const field of ['name', 'arabic', 'note']) assert.ok(m[field].length > 2, `mansion ${m.number} lacks ${field}`);
    assert.ok(Math.abs(m.start - i * 360 / 28) < 1e-9);
    assert.ok(Math.abs(m.end - m.start - 360 / 28) < 1e-9);
  });
  assert.equal(new Set(LunarMansions.MANSIONS.map(m => m.name)).size, 28, 'no name is repeated');
  assert.equal(LunarMansions.MANSIONS[27].end, 360);
});

test('a longitude falls in the right mansion, with Agrippa’s three stated starts', () => {
  const at = longitude => LunarMansions.mansionOf(longitude).mansion;
  assert.equal(at(0).name, 'Alnath', 'the head of Aries');
  assert.equal(at(12.85).number, 1);
  assert.equal(at(12.86).number, 2);
  assert.equal(at(180).number, 15, 'the head of Libra');
  assert.equal(at(270).number, 22, 'the head of Capricorn');
  assert.equal(at(359.999).number, 28);
  assert.equal(at(360).number, 1);
  assert.equal(at(-1).number, 28);
  assert.ok(Math.abs(LunarMansions.mansionOf(360 / 28 * 2.5).fraction - 0.5) < 1e-9);
});

test('positions read as degrees and minutes within a sign, matching the text’s own figures', () => {
  assert.equal(LunarMansions.position(0), '0°00′ Aries');
  assert.equal(LunarMansions.position(360 / 28), '12°51′ Aries');       // "12th degree of Aries, 51 min"
  assert.equal(LunarMansions.position(3 * 360 / 28), '8°34′ Taurus');   // "8th degree of Taurus, 34 min"
  assert.equal(LunarMansions.position(6 * 360 / 28), '17°08′ Gemini');  // "17th degree of Gemini, 8 min"
  assert.equal(LunarMansions.position(359.9999), '29°59′ Pisces');
});

test('the Moon’s mansion comes with the moments it entered and leaves, exact to the boundary', () => {
  for (const iso of ['2026-11-14T18:00:00Z', '2026-01-03T05:30:00Z', '1950-06-21T00:00:00Z', '2099-12-30T12:00:00Z']) {
    const date = new Date(iso), result = LunarMansions.moonNow(date);
    assert.equal(result.status, 'ready');
    const entered = new Date(result.entered), leaves = new Date(result.leaves);
    assert.ok(entered <= date && date < leaves, `${iso}: the instant lies inside the stay`);
    const hours = (leaves - entered) / 3600000;
    assert.ok(hours > 20 && hours < 27, `${iso}: a stay of ${hours.toFixed(1)} hours`);
    const lonAt = d => SkyCalendarEngine.lonOf('Moon', d);
    assert.ok(Math.abs(NatalEngine.delta(lonAt(entered), result.mansion.start)) < 0.001);
    assert.ok(Math.abs(NatalEngine.delta(lonAt(leaves), result.mansion.end)) < 0.001);
    assert.equal(result.next.number, result.mansion.number % 28 + 1);
    assert.equal(LunarMansions.mansionOf(result.longitude).mansion.number, result.mansion.number);
  }
  assert.equal(LunarMansions.moonNow(new Date('1800-01-01T00:00:00Z')).status, 'out-of-range');
});

test('the views mark one current mansion, flag an untimed birth, and escape nothing unsafe', () => {
  const result = LunarMansions.moonNow(new Date('2026-11-14T18:00:00Z'));
  const now = LunarMansions.renderNow(result);
  assert.ok(now.includes(`mansion ${result.mansion.number} of 28`));
  assert.ok(now.includes(result.mansion.name));
  const list = LunarMansions.renderList(result.mansion.number);
  assert.equal((list.match(/<li/g) || []).length, 28);
  assert.equal((list.match(/aria-current="true"/g) || []).length, 1);
  assert.equal((LunarMansions.renderList(0).match(/aria-current/g) || []).length, 0);
  assert.match(LunarMansions.renderBirth(40, true), /Mansion 4, Aldebaram/);
  assert.doesNotMatch(LunarMansions.renderBirth(40, true), /noon/);
  assert.match(LunarMansions.renderBirth(40, false), /No birth time is saved/);
  assert.match(LunarMansions.renderNow({status: 'out-of-range'}), /between 1901 and 2100/);
});

test('attach draws the present mansion and shows the birth Moon only when a chart is saved', () => {
  const nodes = {};
  const section = {innerHTML: '', querySelector: selector => nodes[selector] || (nodes[selector] = {innerHTML: ''})};
  let subscriber = null, tick = null;
  const now = new Date('2026-11-14T18:00:00Z');
  LunarMansions.attach(section, {profile: {subscribe(fn) { subscriber = fn; fn(null); }}, clock: () => now, every: fn => { tick = fn; }, doc: {hidden: false}});
  assert.match(nodes['#lm-now'].innerHTML, /The Moon is in mansion/);
  assert.equal((nodes['#lm-list'].innerHTML.match(/aria-current="true"/g) || []).length, 1);
  assert.equal(nodes['#lm-birth'].innerHTML, '');

  subscriber({profile: {birthday: '1990-07-15', time: '14:30'}, natal: {points: [{name: 'Sun', longitude: 112}, {name: 'Moon', longitude: 200}]}});
  assert.match(nodes['#lm-birth'].innerHTML, /Mansion 16, Azubene/);
  assert.doesNotMatch(nodes['#lm-birth'].innerHTML, /noon/);
  subscriber({profile: {birthday: '1990-07-15', time: ''}, natal: {points: [{name: 'Moon', longitude: 200}]}});
  assert.match(nodes['#lm-birth'].innerHTML, /No birth time is saved/);
  subscriber(null);
  assert.equal(nodes['#lm-birth'].innerHTML, '');

  // The list is not redrawn on a tick while the Moon stays in the same mansion.
  nodes['#lm-list'].innerHTML = 'untouched';
  tick();
  assert.equal(nodes['#lm-list'].innerHTML, 'untouched');
});
