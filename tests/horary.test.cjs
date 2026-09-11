const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../horary-engine.js');
const C = require('../classical-engine.js');
const natal = require('../natal-engine.js');
const astro = require('../vendor/astronomy-engine/astronomy.js');

// Independent brute-force check for perfects(): steps 2 hours at a time (far finer than
// perfects()'s own 12-hour bracket walk) across the given window for each aspect chirality,
// linearly interpolating the zero-crossing within whichever 2-hour bracket first flips sign,
// and returns the earliest crossing across both chiralities (or null if neither has one). The
// window defaults to the old flat 30 days, but perfects() now searches to the earlier
// significator's sign exit, so callers checking its output pass that same window (the aspect
// row's own `searchedDays`) rather than always assuming 30.
function bruteForcePerfects(aName, bName, aspect, chart, days = 30) {
  const lon = (n, t) => astro.Ecliptic(astro.GeoVector(n, t, true)).elon;
  const t0 = +new Date(chart.date);
  let best = null;
  for (const s of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
    let prev = null, prevT = null;
    for (let t = t0; t <= t0 + days * 86400000; t += 2 * 3600000) {
      const d = new Date(t);
      const g = natal.delta(lon(aName, d) - lon(bName, d), s * aspect);
      if (prev !== null && ((prev < 0 && g >= 0) || (prev > 0 && g <= 0)) && Math.abs(g - prev) < 45) {
        const cross = prevT + (prev / (prev - g)) * (t - prevT);
        if (best === null || cross < best) best = cross;
        break;
      }
      prev = g; prevT = t;
    }
  }
  return best;
}

test('cast: regiomontanus chart, sect, hour, considerations and significators', () => {
  const r = H.cast({ date: new Date('2024-03-15T10:20:00Z'), location: { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' }, houseMatter: 7 });
  assert.equal(r.status, 'ready'); assert.equal(r.chart.houseSystem, 'regiomontanus');
  assert.ok(['day', 'night'].includes(r.sect)); assert.equal(r.hour.status, 'ready');
  assert.deepEqual(r.considerations.map(c => c.key), ['ascEarly', 'ascLate', 'saturnAngular', 'moonVoid', 'viaCombusta', 'radical']);
  const ascSign = Math.floor(r.chart.angles.asc / 30);
  assert.equal(r.significators.querent.planet, C.rulers[ascSign]);

  // Fixed from the brief: the original assertion compared quesited.planet to itself on
  // the true branch, which is a tautology. Assert Lilly's rule directly instead -- when the
  // 7th cusp's ruler is also the querent's own ruler, the quesited planet becomes that
  // sign's exaltation ruler (or, absent one, the cusp ruler again with shared:true).
  const cusp7Sign = Math.floor(natal.mod(r.chart.cusps[6]) / 30);
  const cusp7Ruler = C.rulers[cusp7Sign];
  if (r.significators.querent.planet === cusp7Ruler) {
    const exaltationRuler = Object.entries(C.exaltations).find(([, v]) => v[0] === cusp7Sign)?.[0];
    if (exaltationRuler) {
      assert.equal(r.significators.quesited.planet, exaltationRuler);
    } else {
      assert.equal(r.significators.quesited.planet, cusp7Ruler);
      assert.equal(r.significators.quesited.shared, true);
    }
  } else {
    assert.equal(r.significators.quesited.planet, cusp7Ruler);
  }
  assert.equal(r.significators.moon.planet, 'Moon');
  assert.equal(H.cast({ date: new Date('nope'), location: { latitude: 0, longitude: 0, timeZone: 'UTC' }, houseMatter: 7 }).status, 'error');
  assert.throws(() => H.cast({ date: new Date(), location: { latitude: 0, longitude: 0, timeZone: 'UTC' }, houseMatter: 13 }), RangeError);
});

test('applying aspect within lilly’s moieties, perfection before sign change, reception, translation, collection on synthetic points', () => {
  const pt = (name, longitude, speed) => ({ name, longitude, speed, retrograde: speed < 0, kind: 'planet' });

  // Mars 10, Venus 72: separation 62, nearest aspect the 60° sextile, orb 2 (within the
  // (7+7)/2 = 7 moiety). Venus is faster and already past the exact sextile (62 > 60), and
  // moving further past it (62 -> 62.025 an hour later), so the aspect is separating.
  const a = pt('Mars', 10, 0.6), b = pt('Venus', 72, 1.2);
  const x = H.applyingAspect(a, b);
  assert.equal(x.aspect, 60); assert.ok(Math.abs(x.orb - 2) < 1e-9);
  assert.equal(x.withinOrb, true, 'orb 2 within (7+7)/2');
  assert.equal(x.applying, false, 'the faster Venus has already passed the exact sextile and is moving further from it');

  // Venus 52: separation 42, nearest aspect is still the 60° sextile (orb 18, outside the
  // moiety so aspect reports null) but Venus is faster and closing the gap toward 60° an
  // hour later, so applying is true regardless of the orb being wide.
  const c = pt('Venus', 52, 1.2); const y = H.applyingAspect(a, c); assert.equal(y.applying, true);

  // Saturn 100, Sun 112: separation 12 lands exactly on the (9+15)/2 = 12 combined moiety
  // (corrected from the brief's "13°", which does not fit within that moiety).
  assert.ok(H.applyingAspect(pt('Saturn', 100, 0.1), pt('Sun', 100 + 12, 1)).withinOrb, '12° within (9+15)/2');
  assert.equal(H.applyingAspect(pt('Mercury', 0, 1.5), pt('Mars', 40, 0.6)).aspect, null, 'no Ptolemaic aspect near 40°');

  // Partile: Mars 10, Venus 70 are exactly 60° apart -- an exact sextile, orb 0. Within one
  // arcminute of exact, applyingAspect always calls the aspect applying and marks it partile,
  // since the ordinary "still closing an hour from now" test is unreliable right at exact.
  const partile = H.applyingAspect(pt('Mars', 10, 0.6), pt('Venus', 70, 1.2));
  assert.equal(partile.aspect, 60); assert.ok(Math.abs(partile.orb) < 1e-9);
  assert.equal(partile.applying, true); assert.equal(partile.partile, true);

  // Translation: a chart where a faster Moon is separating from Mars and applying to Venus.
  // The Moon at 95° makes the Moon-Venus sextile (95 to 155 = 60°) exactly exact (orb 0) --
  // now correctly reported as applying (and partile) by the fix above, rather than needing to
  // be nudged off-exact to dodge the old strict "< orb" test.
  const chart = { points: [pt('Mars', 90, 0.5), pt('Venus', 155, 1.1), pt('Moon', 95, 13), pt('Sun', 300, 1), pt('Mercury', 280, 1.2), pt('Jupiter', 20, 0.2), pt('Saturn', 200, 0.1)] };
  const tr = H.translation(chart, 'Mars', 'Venus'); assert.equal(tr?.planet, 'Moon'); assert.equal(tr.from, 'Mars'); assert.equal(tr.to, 'Venus');

  // Collection: Mars 305°, Venus 300°, both in Aquarius (which Saturn rules), applying to the
  // slower Saturn at 36° -- Mars square Saturn (separation 91, orb 1) and Venus square Saturn
  // (separation 96, orb 6, within (7+9)/2 = 8), both closing since Mars and Venus are faster
  // than Saturn. Saturn also receives both significators (rulership of Aquarius), satisfying
  // Lilly's condition that the collecting planet actually receive what it collects.
  const chart2 = { points: [pt('Mars', 305, 0.5), pt('Venus', 300, 1.1), pt('Saturn', 36, 0.1), pt('Moon', 10, 13), pt('Sun', 200, 1), pt('Mercury', 220, 1.2), pt('Jupiter', 150, 0.2)] };
  const col = H.collection(chart2, 'Mars', 'Venus'); assert.equal(col?.planet, 'Saturn');

  // Negative case: the same aspect geometry (Mars/Venus square Saturn, applying, in orb), but
  // Mars shifted into Pisces (ruled by Jupiter, not Saturn) so Saturn no longer receives Mars --
  // collection must return null even though the aspects alone would otherwise qualify.
  const chart3 = { points: [pt('Mars', 332, 0.5), pt('Venus', 327, 1.1), pt('Saturn', 63, 0.1), pt('Moon', 10, 13), pt('Sun', 200, 1), pt('Mercury', 220, 1.2), pt('Jupiter', 150, 0.2)] };
  assert.equal(H.collection(chart3, 'Mars', 'Venus'), null, 'Saturn no longer receives Mars (Pisces), so no collection');
});

test('house 1: querent and quesited are one, so pairs collapse to one aspect row per distinct planet pair', () => {
  const loc = { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' };
  const r = H.cast({ date: new Date('2024-03-01T10:20:00Z'), location: loc, houseMatter: 1 });
  assert.equal(r.status, 'ready');
  assert.equal(r.significators.quesited.shared, true, 'house 1: the querent is the quesited');
  assert.equal(r.significators.quesited.planet, r.significators.querent.planet);
  assert.match(r.significators.quesited.why, /first house is the querent/);

  // Without the Ascendant's ruler happening to be the Moon itself, the ['moon','quesited'] and
  // ['querent','moon'] role-pairs are the same physical pair (Moon vs. the shared planet); after
  // de-duplication exactly one row should remain, carrying every role that touched it.
  assert.notEqual(r.significators.querent.planet, 'Moon', 'pick a date where the Ascendant ruler is not the Moon itself');
  const pairKeys = new Set(r.aspects.map(a => [a.a, a.b].sort().join('|')));
  assert.equal(pairKeys.size, r.aspects.length, 'no two rows share the same unordered planet pair');
  assert.equal(r.aspects.length, 1, 'exactly one distinct planet pair remains: Moon vs. the shared querent/quesited planet');
  assert.deepEqual(new Set(r.aspects[0].roles), new Set(['querent', 'quesited', 'moon']), 'the merged row lists every role involved');

  // A planet cannot aspect itself, so byAspect perfection must never be claimed for the
  // (nonexistent) querent-quesited pair merely because a merged row happens to carry both
  // role tags.
  assert.equal(r.perfection.byAspect, false);
});

test('perfects: earliest crossing across both aspect chiralities, not just the first chirality to find one', () => {
  const loc = { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' };

  // Regression: Moon square Mercury cast at 2024-01-01T20:00Z, London. The true nearest
  // exact square is 2024-01-02T08:53Z (found on the s=-1 chirality). Returning on the first
  // chirality to find a hit (s=+1 here) instead finds the far crossing on 2024-01-16 --
  // wrong by two weeks, and wrong about beforeSignChange too.
  const chart = natal.chartAtInstant(new Date('2024-01-01T20:00:00Z'), loc, { houseSystem: 'regiomontanus' });
  const moon = chart.points.find(p => p.name === 'Moon'), mercury = chart.points.find(p => p.name === 'Mercury');
  const r = H.perfects(moon, mercury, 90, chart);
  assert.ok(r, 'expected a perfection within 30 days');
  assert.ok(Math.abs(new Date(r.date) - new Date('2024-01-02T08:53:00Z')) < 10 * 60000, `expected ~2024-01-02T08:53Z, got ${r.date}`);
  assert.ok(new Date(r.date) < new Date('2024-01-03T00:00:00Z'), 'the near (s=-1) crossing, not the far (s=+1) one two weeks later');

  // General check: for every applying significator pair in the 2024-03-15 cast, the
  // returned perfects date should equal the minimum crossing across both chiralities as
  // found by an independent, much finer-grained brute-force scan, run out to the same
  // sign-exit-bounded window perfects() itself used (searchedDays), not a hardcoded 30 days.
  const t0 = Date.now();
  const cast = H.cast({ date: new Date('2024-03-15T10:20:00Z'), location: loc, houseMatter: 7 });
  const castMs = Date.now() - t0;
  console.log(`cast() timing (2024-03-15 sample chart): ${castMs}ms`);
  assert.ok(castMs < 3000, `cast() should complete in well under 3s (took ${castMs}ms)`);
  const checked = new Set();
  for (const asp of cast.aspects) {
    const key = `${asp.a}-${asp.b}-${asp.aspect}`;
    if (checked.has(key)) continue;
    if (asp.perfects === null) {
      // A null perfection now means "does not perfect before a sign change," not "does not
      // perfect within a flat 30 days" -- every such row still carries how far ahead that
      // sign-exit bound was.
      if (asp.searchedDays !== null) assert.ok(asp.searchedDays > 0, `${key}: searchedDays should be positive`);
      continue;
    }
    checked.add(key);
    const cross = bruteForcePerfects(asp.a, asp.b, asp.aspect, cast.chart, asp.searchedDays);
    assert.ok(cross !== null, `${key}: brute-force scan should also find a crossing within the same ${asp.searchedDays}-day window`);
    assert.ok(Math.abs(new Date(asp.perfects) - cross) < 20 * 60000, `${key}: perfects ${asp.perfects} should match the brute-force minimum ${new Date(cross).toISOString()} across both chiralities`);
  }
  assert.ok(checked.size > 0, 'the 2024-03-15 cast should exercise at least one applying, perfecting pair');

  // The 30-day cap is gone: search a spread of dates for an applying Jupiter-Saturn pair (a
  // slow combination, so its sign-exit bound is typically far past 30 days) to exercise a
  // searchedDays that is actually larger than the old flat cap, confirming the cap is now
  // sign-exit-based rather than still secretly 30 days.
  let foundLongSearch = false;
  for (let day = 0; day < 800 && !foundLongSearch; day += 17) {
    const d = new Date(2024, 0, 1 + day, 12, 0, 0);
    const c = natal.chartAtInstant(d, loc, { houseSystem: 'regiomontanus' });
    if (c.status !== 'ready') continue;
    const jupiter = c.points.find(p => p.name === 'Jupiter'), saturn = c.points.find(p => p.name === 'Saturn');
    const asp = H.applyingAspect(jupiter, saturn);
    if (asp.aspect === null || !asp.applying) continue;
    const p = H.perfects(jupiter, saturn, asp.aspect, c);
    if (p.searchedDays > 30) foundLongSearch = true;
  }
  assert.ok(foundLongSearch, 'expected at least one applying Jupiter-Saturn date with a sign-exit search window past the old flat 30-day cap');
});
