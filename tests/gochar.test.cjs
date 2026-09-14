const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../jyotish-engine.js');
const N = require('../natal-engine.js');

const sample = N.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York'}});

test('the supportive table has the classical sizes for all nine grahas', () => {
  const sizes = Object.fromEntries(Object.entries(J.GOCHAR_SUPPORTIVE).map(([k, v]) => [k, v.length]));
  assert.deepEqual(sizes, {Sun: 4, Moon: 6, Mars: 3, Mercury: 6, Jupiter: 5, Venus: 9, Saturn: 3, Rahu: 3, Ketu: 3});
  assert.deepEqual(J.GOCHAR_SUPPORTIVE.Jupiter, [2, 5, 7, 9, 11]);
  assert.deepEqual(J.GOCHAR_SUPPORTIVE.Venus, [1, 2, 3, 4, 5, 8, 9, 11, 12]);
});

test('houses count whole signs from the Moon and wrap', () => {
  assert.equal(J.houseFromMoon(3, 3), 1);
  assert.equal(J.houseFromMoon(4, 3), 2);
  assert.equal(J.houseFromMoon(2, 3), 12);
  assert.equal(J.houseFromMoon(0, 11), 2);
  assert.equal(J.houseFromMoon(11, 0), 12);
});

test('a Gochar reading for a fixed day: Saturn in Meena, houses and flags consistent', () => {
  const g = J.gochar(sample, '2026-09-14');
  assert.equal(g.status, 'ready');
  assert.equal(g.grahas.length, 9);
  const saturn = g.grahas.find(x => x.name === 'Saturn');
  assert.equal(saturn.sign, 'Meena');   // sidereal Saturn is in Pisces from March 2025 to mid-2027
  const natalMoon = J.sidereal(sample).grahas.find(x => x.name === 'Moon').signIndex;
  assert.equal(g.moonSign, natalMoon);
  for (const x of g.grahas) {
    assert.equal(x.house, J.houseFromMoon(x.signIndex, natalMoon), x.name);
    assert.equal(x.supportive, J.GOCHAR_SUPPORTIVE[x.name].includes(x.house), x.name);
  }
  assert.equal(g.sadeSati, [12, 1, 2].includes(saturn.house));
});

test('Sade Sati is flagged exactly when Saturn is in the 12th, 1st or 2nd from the Moon', () => {
  // Walk a year at a time across a Saturn cycle and check the flag against the house each time.
  let flagged = 0;
  for (let y = 2000; y <= 2030; y++) {
    const g = J.gochar(sample, `${y}-06-01`);
    const house = g.grahas.find(x => x.name === 'Saturn').house;
    assert.equal(g.sadeSati, [12, 1, 2].includes(house), `${y}: house ${house}`);
    if (g.sadeSati) flagged++;
  }
  assert.ok(flagged > 0 && flagged < 31, 'the flag both appears and clears over a Saturn cycle');
});

test('gochar refuses charts that are not ready and malformed or out-of-range days', () => {
  assert.equal(J.gochar({status: 'missing'}, '2026-09-14').status, 'missing');
  assert.throws(() => J.gochar(sample, '2026-02-30'), RangeError);
  assert.throws(() => J.gochar(sample, 'soon'), RangeError);
  assert.throws(() => J.gochar(sample, '1899-01-01'), RangeError);
});

test('the sample chart on 2026-09-14: independent literals', () => {
  // Natal Moon 3.34° sidereal in the pyswisseph fixture (sample-new-york), so Mesha. Saturn in
  // Meena is the 12th from Mesha, which is Sade Sati; Jupiter in sidereal Karka is the 4th, not
  // among Jupiter's supportive houses (2, 5, 7, 9, 11).
  const g = J.gochar(sample, '2026-09-14');
  const saturn = g.grahas.find(x => x.name === 'Saturn'), jupiter = g.grahas.find(x => x.name === 'Jupiter');
  assert.equal(g.moonRashi, 'Mesha');
  assert.equal(saturn.house, 12);
  assert.equal(g.sadeSati, true);
  assert.equal(jupiter.sign, 'Karka');
  assert.equal(jupiter.house, 4);
  assert.equal(jupiter.supportive, false);
});
