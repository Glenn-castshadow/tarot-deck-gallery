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

const engine = require('../daily-horoscope-engine.js');
const classical = require('../classical-engine.js');
const astro = require('../vendor/astronomy-engine/astronomy.js');
const ASPECT_NAMES = {0: 'conjunction', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opposition'};

test('factSheet: twelve signs, wrapped sectors, classical rulers, partner sectors and ruler flags agree', () => {
  const s = engine.factSheet('2026-09-17');
  assert.equal(s.signs.length, 12);
  assert.equal(engine.sectorNames.length, 12);
  assert.equal(new Set(engine.sectorNames).size, 12);
  assert.equal(s.moon.sign, engine.calculate(0, '2026-09-17').points.find(p => p.name === 'Moon').sign);
  assert.equal(s.moon.phase, engine.calculate(0, '2026-09-17').phase);
  assert.equal(s.instant, '2026-09-17T12:00:00.000Z');
  for (const a of s.aspects) {
    assert.ok(a.date >= '2026-09-17T00:00:00' && a.date < '2026-09-18T00:00:00', a.date);
    assert.equal(a.name, ASPECT_NAMES[a.aspect]);
    assert.ok(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(a.planet));
  }
  for (const [i, sg] of s.signs.entries()) {
    assert.equal(sg.sign, engine.signNames[i]);
    assert.equal(sg.ruler, classical.rulers[i]);
    const next = s.signs[(i + 1) % 12];
    assert.equal(next.moonSector.house, (sg.moonSector.house + 10) % 12 + 1, 'sectors do not wrap');
    assert.equal(sg.moonSector.name, engine.sectorNames[sg.moonSector.house - 1]);
    assert.equal(sg.aspects.length, s.aspects.length);
    sg.aspects.forEach((a, j) => {
      const top = s.aspects[j];
      assert.equal(a.planet, top.planet);
      assert.equal(a.name, top.name);
      assert.equal(a.planetSector.house, natal.mod(engine.signNames.indexOf(top.planetSign) - i, 12) + 1);
      assert.equal(a.planetSector.name, engine.sectorNames[a.planetSector.house - 1]);
      assert.equal(a.rulerInvolved, a.planet === sg.ruler);
    });
    assert.equal(sg.events.length, s.events.length);
    sg.events.forEach((e, j) => {
      assert.equal(e.body, s.events[j].body);
      assert.equal(e.sector.house, natal.mod(s.events[j].signIndex - i, 12) + 1);
      assert.equal(e.rulerInvolved, e.body === sg.ruler);
      assert.ok(!/[A-Z]/.test(e.detail.slice(1)), `detail leaks a name: ${e.detail}`);
    });
  }
});

test('factSheet lists the Sun ingress on the equinox day, seen from each sign', () => {
  const day = astro.Seasons(2026).sep_equinox.date.toISOString().slice(0, 10);
  const s = engine.factSheet(day);
  const sun = s.events.find(e => e.body === 'Sun');
  assert.ok(sun, 'no Sun ingress on the equinox day');
  assert.equal(sun.kind, 'ingress');
  assert.equal(sun.sign, 'Libra');
  assert.equal(sun.detail, 'enters a new sign');
  assert.equal(s.signs[6].events.find(e => e.body === 'Sun').sector.house, 1);      // Libra: its own sign
  assert.equal(s.signs[4].events.find(e => e.body === 'Sun').rulerInvolved, true);  // Leo: the Sun rules it
  assert.equal(s.signs[0].events.find(e => e.body === 'Sun').sector.house, 7);      // Aries: partnership sector
});

test('factSheet refuses a bad day', () => {
  for (const day of ['2026-02-29', 'bad', '1900-12-31']) assert.throws(() => engine.factSheet(day), RangeError);
});
