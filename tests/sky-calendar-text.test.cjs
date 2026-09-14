const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../sky-calendar-text.js');

const FORBIDDEN = ['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune'];

test('every table is complete', () => {
  assert.equal(T.phases.length, 8);
  assert.equal(T.ingressSigns.length, 12);
  assert.equal(Object.keys(T.retrogrades).length, 8);
  assert.equal(Object.keys(T.eclipses).length, 6);
  assert.equal(T.aspects.length, 5);
});

test('no entry forecasts or promises', () => {
  const all = [...T.phases, ...T.ingressSigns, ...T.aspects,
               ...Object.values(T.retrogrades), ...Object.values(T.eclipses), T.voidFraming];
  for (const entry of all) {
    const text = `${entry.title} ${entry.body} ${entry.prompt || ''}`.toLowerCase();
    for (const phrase of FORBIDDEN) assert.ok(!text.includes(phrase), `"${phrase}" appears in ${entry.title}`);
    assert.ok(!/\byes\b|\bno\b/.test(text), `a bare yes/no appears in ${entry.title}`);
    assert.ok(entry.body.length > 80, `${entry.title} needs a real reflection, not a stub`);
  }
});

test('entries are distinct', () => {
  const bodies = [...T.phases, ...T.ingressSigns].map(e => e.body);
  assert.equal(new Set(bodies).size, bodies.length, 'copy was duplicated between entries');
});
