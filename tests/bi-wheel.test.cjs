const test = require('node:test');
const assert = require('node:assert/strict');
const BiWheel = require('../bi-wheel.js');
const reference = require('./fixtures/bi-wheel-golden.json');

for (const [name, args] of Object.entries(reference.cases)) test(`renders identically to the pre-extraction wheel: ${name}`, () => {
  const [inner, outer, contact, labels] = args;
  assert.equal(BiWheel.render({inner, outer, contact, labels}), reference.golden[name]);
});

test('centre symbol and label are parameterised', () => {
  const [inner, outer, , labels] = reference.cases['no-contact'];
  const svg = BiWheel.render({inner, outer, contact: null, labels, centerSymbol: '☉', centerLabel: 'YOUR YEAR AHEAD'});
  assert.ok(svg.includes('>☉</text>'));
  assert.ok(svg.includes('YOUR YEAR AHEAD'));
});
