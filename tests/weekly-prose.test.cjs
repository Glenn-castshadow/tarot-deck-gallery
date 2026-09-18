const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');

test('quarters lists the lunar quarters inside a window, against a published ephemeris', () => {
  const hits = E.quarters(new Date('2026-09-21T00:00:00Z'), new Date('2026-09-28T00:00:00Z'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'Full moon');
  assert.equal(hits[0].quarter, 2);
  // Published: Full moon 2026-09-26 16:49 UTC.
  assert.equal(hits[0].date.slice(0, 16), '2026-09-26T16:49');
});

test('quarters returns nothing for a week that holds no quarter', () => {
  // Published: Third quarter 2026-11-01, New moon 2026-11-09 07:02 UTC. Nothing between.
  assert.deepEqual(E.quarters(new Date('2026-11-02T00:00:00Z'), new Date('2026-11-09T00:00:00Z')), []);
});
