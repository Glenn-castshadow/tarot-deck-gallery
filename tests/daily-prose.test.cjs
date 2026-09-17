const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');
const natal = require('../natal-engine.js');

test('moonAspects lists every exact Moon aspect in a window, sorted, and agrees with voidPeriods', () => {
  const from = new Date('2026-03-01T00:00:00Z'), to = new Date('2026-03-08T00:00:00Z');
  const hits = E.moonAspects(from, to, E.CLASSICAL_PLANETS);
  // Independent oracle: an hourly scan of the Moon-planet separation, counting every upward
  // crossing of the eight separations that are Ptolemaic aspects. Must agree with the search.
  let expected = 0;
  for (const planet of E.CLASSICAL_PLANETS) for (const target of [0, 60, 90, 120, 180, 240, 270, 300]) {
    let prev = null;
    for (let t = +from; t < +to; t += 3600e3) {
      const d = new Date(t), g = natal.delta(natal.mod(E.lonOf('Moon', d) - E.lonOf(planet, d)), target);
      if (prev !== null && prev < 0 && g >= 0 && g - prev < 45) expected++;
      prev = g;
    }
  }
  assert.equal(hits.length, expected);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].date >= hits[i - 1].date, 'not sorted');
  for (const h of hits) {
    const t = new Date(h.date);
    assert.ok(t >= from && t < to, 'hit outside the window');
    const sep = natal.mod(E.lonOf('Moon', t) - E.lonOf(h.planet, t));
    const off = Math.min(Math.abs(sep - h.aspect), Math.abs(sep - (360 - h.aspect)));
    assert.ok(off < 0.01, `${h.planet} ${h.aspect} is ${off} degrees from exact`);
  }
  // Cross-check against existing code: the closing aspect of each void-of-course period
  // must be the last hit before that period's sign ingress.
  const periods = E.voidPeriods(from, to, E.CLASSICAL_PLANETS).filter(p => !p.clipped && p.lastAspect);
  assert.ok(periods.length >= 1);
  for (const p of periods) {
    const before = hits.filter(h => h.date < p.end);
    const last = before[before.length - 1];
    assert.ok(Math.abs(new Date(last.date) - new Date(p.start)) < 2000, `${p.sign}: ${last.date} vs ${p.start}`);
    assert.deepEqual({planet: last.planet, aspect: last.aspect}, p.lastAspect);
  }
});

test('moonAspects refuses out-of-range input with an empty list', () => {
  assert.deepEqual(E.moonAspects(new Date('1900-12-31T00:00:00Z'), new Date('1901-01-02T00:00:00Z'), E.CLASSICAL_PLANETS), []);
});
