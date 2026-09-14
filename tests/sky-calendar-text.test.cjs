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

test('the void framing carries a brief form for the month tab', () => {
  const {body, brief} = T.voidFraming;
  assert.equal(typeof brief, 'string', 'voidFraming has no brief form');
  // It has to be short enough to earn its place above a list the reader came to read, and
  // long enough to still say what a void is and that the two traditions disagree.
  assert.ok(brief.length > 120, `brief is ${brief.length} characters, too thin to explain anything`);
  assert.ok(brief.length < body.length / 2, `brief is ${brief.length} against a body of ${body.length}`);
  assert.ok(/\bsign\b/i.test(brief), 'the brief does not say a void ends when the Moon leaves a sign');
  assert.ok(/inside|within|shorter/i.test(brief), 'the brief does not say the modern period sits inside the classical');
  for (const phrase of FORBIDDEN) {
    assert.ok(!brief.toLowerCase().includes(phrase), `"${phrase}" appears in the brief`);
  }
  assert.ok(!/\byes\b|\bno\b/i.test(brief), 'a bare yes/no appears in the brief');
});
