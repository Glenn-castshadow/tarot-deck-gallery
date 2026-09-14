const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');

test('moonNow reports phase, sign and the next four quarters', () => {
  const m = E.moonNow(new Date('2026-03-15T12:00:00Z'));
  assert.equal(m.status, 'ready');
  assert.ok(m.phaseAngle >= 0 && m.phaseAngle < 360);
  assert.ok(m.illumination >= 0 && m.illumination <= 1);
  assert.equal(typeof m.phaseName, 'string');
  assert.equal(m.quarters.length, 4);
  for (let i = 1; i < 4; i++) assert.ok(new Date(m.quarters[i].date) > new Date(m.quarters[i - 1].date));
  assert.ok(['New moon','First quarter','Full moon','Third quarter'].includes(m.quarters[0].name));
  assert.ok(m.signIndex >= 0 && m.signIndex < 12);
  assert.ok(m.degree >= 0 && m.degree < 30);
  assert.ok(new Date(m.nextIngress.date) > new Date('2026-03-15T12:00:00Z'));
  assert.equal(m.nextIngress.sign, E.signNames[(m.signIndex + 1) % 12]);
});

test('moonNow refuses dates outside the supported range', () => {
  assert.equal(E.moonNow(new Date('1899-01-01T00:00:00Z')).status, 'out-of-range');
  assert.equal(E.moonNow(new Date('2101-01-01T00:00:00Z')).status, 'out-of-range');
  assert.equal(E.moonNow(new Date('nope')).status, 'out-of-range');
});

test('the modern void is always contained in the classical void', () => {
  const from = new Date('2026-01-01T00:00:00Z'), to = new Date('2027-01-01T00:00:00Z');
  const classical = E.voidPeriods(from, to, E.CLASSICAL_PLANETS);
  const modern = E.voidPeriods(from, to, E.MODERN_PLANETS);
  assert.ok(classical.length > 100, `expected ~150 periods a year, got ${classical.length}`);
  assert.equal(classical.length, modern.length, 'both definitions end at the same ingresses');
  for (let i = 0; i < classical.length; i++) {
    assert.equal(modern[i].end, classical[i].end, 'a void always ends at the sign ingress');
    assert.ok(new Date(modern[i].start) >= new Date(classical[i].start),
      `modern void ${i} starts before the classical one`);
  }
  // S4: the first period in the window is clipped by `from`, not by a real aspect search.
  assert.equal(classical[0].clipped, true, 'first classical period is clipped by the window start');
  assert.equal(modern[0].clipped, true, 'first modern period is clipped by the window start');
  for (let i = 1; i < classical.length; i++) {
    assert.equal(classical[i].clipped, false, `classical period ${i} should not be clipped`);
    assert.equal(modern[i].clipped, false, `modern period ${i} should not be clipped`);
  }
});

test('a sign the Moon crosses without any aspect is wholly void', () => {
  const periods = E.voidPeriods(new Date('2026-01-01T00:00:00Z'), new Date('2026-04-01T00:00:00Z'), E.CLASSICAL_PLANETS);
  const wholly = periods.filter(p => p.lastAspect === null && !p.clipped);
  for (const p of wholly) {
    // start is the ingress into the sign, so the period spans the whole transit
    assert.ok(new Date(p.end) - new Date(p.start) > 36 * 3600 * 1000,
      'a wholly void sign transit lasts about two days');
  }
});

test('moonNow reports both void states', () => {
  const m = E.moonNow(new Date('2026-03-15T12:00:00Z'));
  for (const key of ['classical', 'modern']) {
    assert.equal(typeof m.void[key].isVoid, 'boolean');
    assert.equal(typeof m.void[key].until, 'string');
  }
  assert.ok(!(m.void.classical.isVoid === false && m.void.modern.isVoid === true),
    'modern void implies classical void');
});

test('moonNow reports a genuine void state within a week of either edge of the supported range', () => {
  // Fix for review finding 1: voidStateFor pads its search window +/-7ish days around the
  // queried date, and that padded window can step outside 1901-2100 even when the date
  // itself is comfortably in range. It must not silently fall back to {isVoid:false,
  // since:null} for these -- `since` must be a real timestamp and `isVoid` must reflect the
  // real sky, not the fallback's default false.
  const cases = [
    {date: '1901-01-01T00:00:00Z', expectVoid: true},
    {date: '1901-01-03T00:00:00Z', expectVoid: false},
    {date: '2100-12-31T12:00:00Z', expectVoid: false}
  ];
  for (const {date, expectVoid} of cases) {
    const d = new Date(date);
    const m = E.moonNow(d);
    for (const key of ['classical', 'modern']) {
      const v = m.void[key];
      assert.notEqual(v.since, null,
        `${date} ${key}: since must be a real last-aspect/ingress time, not the out-of-range fallback`);
      assert.equal(v.until, m.nextIngress.date, `${date} ${key}: until must be the actual next ingress`);
      assert.equal(v.isVoid, expectVoid, `${date} ${key}: isVoid must reflect the real sky, not the fallback default`);
      assert.equal(v.isVoid, d >= new Date(v.since), `${date} ${key}: isVoid must match date >= since`);
    }
  }
});

test('voidPeriods refuses out-of-range input', () => {
  assert.deepEqual(E.voidPeriods(new Date('1899-01-01T00:00:00Z'), new Date('1899-06-01T00:00:00Z'), E.CLASSICAL_PLANETS), []);
  assert.deepEqual(E.voidPeriods(new Date('2026-01-01T00:00:00Z'), new Date('2101-01-01T00:00:00Z'), E.CLASSICAL_PLANETS), []);
});

test('the Sun makes exactly one ingress a month and twelve a year', () => {
  const year = E.ingresses(new Date('2026-01-01T00:00:00Z'), new Date('2027-01-01T00:00:00Z'), ['Sun']);
  assert.equal(year.length, 12);
  assert.deepEqual([...new Set(year.map(i => i.sign))].length, 12);
});

// S1 fix round 1: pins the bidirectional search. Venus stations retrograde in Scorpio in
// October 2026 and backs into Libra on 2026-10-25 before turning direct again well after this
// window closes, so within [2026-10-01, 2026-11-15) the only Venus event is that backward
// re-entry. Deleting the hitDown search (the fix for retrograde ingresses going undetected)
// leaves this window empty, since astro.Search only ever resolves an ascending crossing and
// a re-entry into a lower sign is a descending one -- so this fails loudly if that regresses.
test('a retrograde body reports the backward ingress into the sign it just left', () => {
  const window = E.ingresses(new Date('2026-10-01T00:00:00Z'), new Date('2026-11-15T00:00:00Z'), ['Venus']);
  assert.equal(window.length, 1, 'expected exactly the retrograde re-entry in this window');
  const [event] = window;
  assert.equal(event.body, 'Venus');
  assert.equal(event.sign, 'Libra');
  assert.equal(event.retrograde, true);
});

test('monthEvents returns quarters and ingresses inside the month only', () => {
  const {status, events} = E.monthEvents(2026, 3);
  assert.equal(status, 'ready');
  assert.ok(events.length > 0);
  for (const e of events) {
    const d = new Date(e.date);
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth() + 1, 3);
  }
  for (let i = 1; i < events.length; i++) assert.ok(new Date(events[i].date) >= new Date(events[i - 1].date));
  assert.ok(events.some(e => e.type === 'quarter'));
  assert.ok(events.some(e => e.type === 'ingress' && e.body === 'Moon'));
});

test('monthEvents handles February in a leap year and the range bounds', () => {
  assert.equal(E.monthEvents(2028, 2).status, 'ready');
  assert.equal(E.monthEvents(1901, 1).status, 'ready');
  assert.equal(E.monthEvents(2100, 12).status, 'ready');
  assert.equal(E.monthEvents(1900, 12).status, 'out-of-range');
  assert.equal(E.monthEvents(2101, 1).status, 'out-of-range');
});

test('monthEvents refuses a non-integer year or an out-of-range month', () => {
  // Same guard personalTransits carries: without it (2026, 0) silently returns December 2025,
  // (2026, 13) January 2027, (2026, 5.5) rounds to May, and (NaN, 5) throws.
  for (const [year, month] of [[2026, 0], [2026, 13], [2026, 5.5], [2026, NaN], [2026, '3'],
                               [2026, undefined], [NaN, 5], [2026.5, 5], ['2026', 5]]) {
    assert.equal(E.monthEvents(year, month).status, 'out-of-range', `${year}-${month}`);
  }
});

test('Mercury stations alternate retrograde and direct', () => {
  const s = E.stations(new Date('2026-01-01T00:00:00Z'), new Date('2027-01-01T00:00:00Z'))
    .filter(x => x.body === 'Mercury');
  assert.ok(s.length >= 6, `Mercury stations 6-8 times a year, got ${s.length}`);
  for (let i = 1; i < s.length; i++) assert.notEqual(s[i].direction, s[i - 1].direction);
});

test('the Sun and Moon never station', () => {
  const s = E.stations(new Date('2026-01-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z'));
  assert.equal(s.filter(x => x.body === 'Sun' || x.body === 'Moon').length, 0);
});

test('eclipses come in both kinds with a peak inside the window', () => {
  const from = new Date('2026-01-01T00:00:00Z'), to = new Date('2027-01-01T00:00:00Z');
  const e = E.eclipses(from, to);
  assert.ok(e.length >= 4, `a year holds at least four eclipses, got ${e.length}`);
  assert.ok(e.some(x => x.body === 'Sun'));
  assert.ok(e.some(x => x.body === 'Moon'));
  for (const x of e) {
    assert.ok(new Date(x.date) >= from && new Date(x.date) < to);
    assert.ok(['total','annular','partial','penumbral'].includes(x.kind));
    if (x.body === 'Sun') assert.equal(typeof x.latitude, 'number');
  }
});

test('2026 August 12 holds a total solar eclipse', () => {
  const e = E.eclipses(new Date('2026-08-01T00:00:00Z'), new Date('2026-09-01T00:00:00Z'));
  const solar = e.find(x => x.body === 'Sun');
  assert.equal(solar.kind, 'total');
  assert.equal(solar.date.slice(0, 10), '2026-08-12');
});

test('retrogradeState covers every station body and orders its shadows', () => {
  const state = E.retrogradeState(new Date('2026-03-15T12:00:00Z'));
  assert.equal(state.length, 8);
  for (const s of state) {
    assert.equal(typeof s.isRetrograde, 'boolean');
    const p = s.period;
    assert.ok(new Date(p.start) < new Date(p.end), `${s.body} period is inverted`);
    assert.ok(new Date(p.preShadow) <= new Date(p.start), `${s.body} pre-shadow starts after the station`);
    assert.ok(new Date(p.postShadow) >= new Date(p.end), `${s.body} post-shadow ends before the station`);
    if (s.isRetrograde) {
      assert.ok(new Date(p.start) <= new Date('2026-03-15T12:00:00Z'));
      assert.ok(new Date(p.end) >= new Date('2026-03-15T12:00:00Z'));
    } else {
      assert.ok(new Date(p.start) > new Date('2026-03-15T12:00:00Z'));
    }
  }
});

// Pins the shape test to a real, independently-checkable retrograde period: Mercury stations
// retrograde 2026-02-26T06:47:29.785Z and direct 2026-03-20T19:36:37.187Z (verified with a
// direct E.stations() call over 2026, and matching the widely-published 2026 Mercury
// retrograde calendar of Feb 25/26 - Mar 20). The query date sits inside that window, so
// Mercury must report it as the *current* retrograde period, not a shape-only guess.
// Dates are compared to the minute, not byte-for-byte: `stations()` only promises a 60-second
// dt_tolerance, and retrogradeState()'s day-stepping scan starts from a different `from` than
// the direct verification call, so the bisection can land a few seconds off within that
// tolerance -- that jitter is expected, not a defect.
test('retrogradeState refuses dates outside the supported range', () => {
  // Same convention as moonNow (and monthEvents): guard with inRange and report
  // {status:'out-of-range'} rather than throwing on a malformed or out-of-range date.
  assert.equal(E.retrogradeState(new Date('1899-01-01T00:00:00Z')).status, 'out-of-range');
  assert.equal(E.retrogradeState(new Date('2101-01-01T00:00:00Z')).status, 'out-of-range');
  assert.equal(E.retrogradeState(new Date('nope')).status, 'out-of-range');
});

test('retrogradeState pins a real, verified Mercury retrograde period', () => {
  const state = E.retrogradeState(new Date('2026-03-15T12:00:00Z'));
  const mercury = state.find(s => s.body === 'Mercury');
  assert.equal(mercury.isRetrograde, true);
  assert.ok(Math.abs(new Date(mercury.period.start) - new Date('2026-02-26T06:47:29.785Z')) < 60000,
    `Mercury retrograde station off: got ${mercury.period.start}`);
  assert.ok(Math.abs(new Date(mercury.period.end) - new Date('2026-03-20T19:36:37.187Z')) < 60000,
    `Mercury direct station off: got ${mercury.period.end}`);
});

test('stations does not report an event at or after its own `to` bound', () => {
  // Mercury stations retrograde at 2026-02-26T06:47:29.785Z (verified against a direct
  // E.stations(...) call over a wide window). Ask for a window that ends six hours before
  // that moment: the station must not come back, even though it falls inside the day-long
  // internal search bracket the loop steps through.
  const from = new Date('2026-02-20T00:00:00Z');
  const cutoff = new Date('2026-02-26T00:47:29.785Z');
  const s = E.stations(from, cutoff).filter(x => x.body === 'Mercury');
  assert.equal(s.length, 0, `expected no Mercury station before the cutoff, got ${JSON.stringify(s)}`);
});

// ---------------------------------------------------------------------------------------
// Task 6: personal transits.
//
// S1 ruling: NatalEngine.calculate refuses to produce placements without a birth time AND a
// birthplace -- a birthday-only call returns {status:'missing'} with no `points` array at all
// (verified directly). So personalTransits takes the {chart, birthday} pair BirthProfile
// already holds, and falls back to noon-UTC natal positions when the chart is unusable, so a
// birthday-only reader still gets planet transits with the approximation stated.
const NatalEngine = require('../natal-engine.js');
const astro = require('../vendor/astronomy-engine/astronomy.js');
const READY_CHART = NatalEngine.calculate({birthday: '1980-10-22', time: '08:30',
  location: {latitude: 38.7223, longitude: -9.1393, timeZone: 'Europe/Lisbon'}, houseSystem: 'placidus', orbScale: 1});
const READY = {chart: READY_CHART, birthday: '1980-10-22'};
const DATE_ONLY = {chart: NatalEngine.calculate({birthday: '1980-10-22', time: '', location: null,
  houseSystem: 'placidus', orbScale: 1}), birthday: '1980-10-22'};

test('personal transits are exact hits inside the month, angles included for a full chart', () => {
  const r = E.personalTransits(READY, 2026, 3);
  assert.equal(r.status, 'ready');
  assert.equal(r.angles, true);
  assert.equal(r.natalMoon, true);
  assert.equal(r.approximate, false);
  assert.ok(r.hits.length > 0);
  for (const h of r.hits) {
    const d = new Date(h.date);
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth() + 1, 3);
    assert.ok([0, 60, 90, 120, 180].includes(h.aspect));
    assert.notEqual(h.body, 'Moon', 'the transiting Moon is excluded by default');
  }
  for (let i = 1; i < r.hits.length; i++) assert.ok(new Date(r.hits[i].date) >= new Date(r.hits[i - 1].date));
  assert.ok(r.hits.some(h => h.targetKind === 'angle'));
  assert.ok(r.hits.some(h => h.targetKind === 'planet' && h.target === 'Moon'),
    'a full chart has a real natal Moon, so it is a target');
  assert.equal(r.hits.filter(h => h.target === 'North Node' || h.target === 'South Node').length, 0,
    'mean nodes are excluded from natal targets');
});

// S1 ruling: a birthday-only reader gets the nine planets Sun..Pluto computed at noon UTC on
// the birth date -- no location needed -- but never the natal Moon and never the angles.
// `birthday` is a LOCAL calendar date and IANA offsets over 1901-2100 run -12:00 to +14:00
// (enumerated from the 418 zones Node ships), so the true instant is up to 26 hours from noon
// UTC -- local 00:00 in the easternmost zone -- not 12. Largest longitude displacement over any
// 26-hour window in range, measured: Moon 16.67, Mercury 2.39, Venus 1.36, Sun 1.11, Mars 0.86,
// Jupiter 0.26, Saturn 0.14, Uranus 0.07, Neptune 0.04, Pluto 0.04 degrees.
// At +/-16.7 the natal Moon can be most of a sign away, and an "exact" hit to a point that
// vague would be days wrong for a slow transiting body, so it is excluded. The nine that remain
// are within a degree EXCEPT Mercury (2.39), Venus (1.36) and the Sun (1.11), so Task 9 must
// not tell the reader "about a degree" without qualifying those three.
test('a birthday-only source gets approximate planet transits, no angles and no natal Moon', () => {
  const r = E.personalTransits(DATE_ONLY, 2026, 3);
  assert.equal(r.status, 'ready');
  assert.equal(r.angles, false);
  assert.equal(r.natalMoon, false);
  assert.equal(r.approximate, true);
  assert.ok(r.hits.length > 0);
  assert.equal(r.hits.filter(h => h.targetKind === 'angle').length, 0);
  assert.equal(r.hits.filter(h => h.target === 'Moon').length, 0,
    'the natal Moon is unknowable without a birth time');
  for (const h of r.hits) {
    assert.equal(h.targetKind, 'planet');
    assert.equal(new Date(h.date).getUTCMonth() + 1, 3);
  }
  // This fixture's real birth time is 08:30 Europe/Lisbon, only ~3.5 hours off noon UTC, so the
  // approximate natal Sun lands well inside a degree. That is this fixture, not the worst case:
  // the bound above is 1.11 for the Sun, so do not read this as a general guarantee.
  const natalSun = r.hits.find(h => h.target === 'Sun').natalLongitude;
  const realSun = READY_CHART.points.find(p => p.name === 'Sun').longitude;
  assert.ok(Math.abs(NatalEngine.delta(natalSun, realSun)) < 1,
    `noon-UTC Sun ${natalSun} should be within a degree of the timed ${realSun}`);
});

test('the Moon toggle adds hits and never removes any', () => {
  const without = E.personalTransits(READY, 2026, 3);
  const withMoon = E.personalTransits(READY, 2026, 3, {includeMoon: true});
  assert.ok(withMoon.hits.length > without.hits.length);
  const keys = new Set(withMoon.hits.map(h => `${h.date}|${h.body}|${h.aspect}|${h.target}`));
  for (const h of without.hits) assert.ok(keys.has(`${h.date}|${h.body}|${h.aspect}|${h.target}`));
  assert.ok(withMoon.hits.some(h => h.body === 'Moon'));
});

test('every reported hit is exact to within a few arcseconds', () => {
  for (const source of [READY, DATE_ONLY]) {
    const r = E.personalTransits(source, 2026, 3, {includeMoon: true});
    assert.ok(r.hits.length > 0);
    for (const h of r.hits) {
      const t = astro.MakeTime(new Date(h.date));
      // Separation, not signed offset: a sextile to a natal point perfects at natal+60 OR at
      // natal-60, so the brief's delta(lon - natal, aspect) is zero for only one of the two
      // chiralities and reads a full 180 degrees off for the other. |delta| is the real claim.
      const sep = Math.abs(Math.abs(NatalEngine.delta(E.lonOf(h.body, t), h.natalLongitude)) - h.aspect);
      assert.ok(sep < 0.01, `${h.body} ${h.aspect} to ${h.target} at ${h.date} was ${sep} degrees off`);
    }
  }
});

test('no hit is reported twice', () => {
  const r = E.personalTransits(READY, 2026, 3, {includeMoon: true});
  // slice(0, 13) truncates the timestamp to the hour ON PURPOSE. A duplicate would be the same
  // root found twice by two brackets or two chiralities, agreeing to the second-level tolerance
  // but not byte-for-byte, so a stricter key would let exactly the bug this guards against
  // through. Distinct contacts of the same body/aspect/target are days apart in this window, so
  // the coarseness costs no sensitivity here. (It would, for a station landing within an hour of
  // a perfection -- passes two and three of a retrograde loop then nearly coincide. Not this
  // fixture, and not a reason to tighten: the duplicate this test hunts is the real risk.)
  const keys = r.hits.map(h => `${h.body}|${h.aspect}|${h.target}|${h.date.slice(0, 13)}`);
  assert.equal(new Set(keys).size, keys.length, 'the two chiralities must not find the same root twice');
});

// S1 trap: astro.Search resolves only ASCENDING zero crossings. Searching both chiralities of
// a non-symmetric aspect (natal+60 and natal-60) finds two distinct target longitudes -- it
// does NOT make a backward crossing of either of them findable. A retrograde transiting body
// crosses its aspect longitude with longitude DECREASING, which is a descending root and is
// invisible to an ascending-only search. Mercury is retrograde until 2026-03-20, so March 2026
// must contain retrograde hits; delete the sign-flipped descending search and this goes to zero.
test('retrograde transits are found, not just direct ones', () => {
  const r = E.personalTransits(READY, 2026, 3);
  const retro = r.hits.filter(h => h.retrograde);
  assert.ok(retro.length > 0, 'expected at least one retrograde (descending) crossing in March 2026');
  assert.ok(retro.some(h => h.body === 'Mercury'), 'Mercury is retrograde for most of March 2026');
});

// A retrograde loop carries a body over the same natal degree three times -- forward,
// backward, forward again -- and all three are real, separately-dated contacts. The synthetic
// natal point below is planted at Mercury's longitude in the middle of its 2026-02-26 ->
// 2026-03-20 retrograde, so the middle pass is the descending one. Without the descending
// search only two of the three survive.
test('a retrograde loop over one natal degree reports all three passes', () => {
  const mid = E.lonOf('Mercury', astro.MakeTime(new Date('2026-03-09T00:00:00Z')));
  const source = {chart: {status: 'ready', axes: [],
    points: [{name: 'Probe', kind: 'planet', longitude: mid}]}, birthday: null};
  const hits = [2, 3, 4].flatMap(m => E.personalTransits(source, 2026, m).hits)
    .filter(h => h.body === 'Mercury' && h.aspect === 0);
  assert.equal(hits.length, 3, `expected three passes over ${mid}, got ${JSON.stringify(hits)}`);
  assert.deepEqual(hits.map(h => h.retrograde), [false, true, false]);
  for (let i = 1; i < hits.length; i++) assert.ok(new Date(hits[i].date) > new Date(hits[i - 1].date));
});

// ---------------------------------------------------------------------------------------
// Task 7: independent pyswisseph fixtures. tools/build_sky_fixtures.py derives every row from
// pyswisseph's Moshier ephemeris, sharing no code with the vendored Astronomy Engine or this
// file, so a systematic error in either implementation shows up as a real disagreement here
// and not just as an internal self-consistency check. Two different derivations, per the
// fixture's own `source` field: quarter moons, sign ingresses and stations are re-found by a
// plain from-scratch bisection written in Python, so both the positions AND the root search
// are independent; eclipse rows come from Swiss Ephemeris's own searches
// (swe.lun_eclipse_when / swe.sol_eclipse_when_glob), so for those it is the ephemeris and the
// eclipse model that are independent, not a hand-written search.
const REF = require('./fixtures/sky-reference.json');

// Fix round 1, finding 1: build_sky_fixtures.py originally took only the FIRST ingress after
// Jan 1 per body per year, so 13 of 15 rows fell in January and no cardinal cusp (an equinox or
// solstice) was ever tested. The fixture now pins the Sun's four cardinal ingresses directly
// (equinoxes and solstices) and spreads the Moon and Mars rows across all four seasons of each
// year (50 ingress rows total, up from 15) -- every one of the newly-covered non-2099 cardinal
// and mid-year rows agrees with pyswisseph to within 39s, confirming the cusp/sign-index logic
// at the equinoxes and solstices, not just the narrow slice tested before. Fix round 2 added
// Uranus, Neptune and Pluto -- whose long retrograde arcs are the reason the engine's STEP_DAYS
// was cut from 1200 to 40 -- to both the ingress and the station rows (62 ingresses, 40
// stations); see cause (3) under INGRESS_EXCEPTION_MS.
//
// Finding (quarters): all eight 2099 rows (both sampled months) disagree with pyswisseph by
// 63.0-74.3s, past the 1-minute tolerance -- every other year (1902, 1950, 2000, 2026) stays
// under 46s. Isolated with a fixed-instant comparison (both engines asked for the Moon-Sun
// elongation at the SAME UT instant, bypassing either engine's own root search): at
// 2099-01-07T01:51:00Z the two engines' elongations already differ by 0.0176 deg, and that
// figure is accounted for almost exactly by the two libraries' own delta-T (TT-UT) models
// disagreeing by ~107.7s at this date (measured directly: Astronomy Engine's
// DeltaT_EspenakMeeus(2099-01-21) = 200.4s, pyswisseph's swe.deltat(same date) = 92.7s; 107.7s
// of delta-T times the Moon's ~13.8 deg/day relative synodic speed there = 0.0172 deg, matching
// the observed 0.0176 deg). Delta-T past roughly 2050 is a genuine forecast of Earth's future
// rotation, not a measurement, and the two libraries extrapolate it differently -- this grows
// sharply near the far edge of the supported 1901-2100 range, unlike the ~35-45s baseline
// offset from the two engines' independently truncated lunar/solar series (present at every
// sampled year, including 1902 where the delta-T difference is negligible, and comfortably
// inside a minute on its own). A real, understood ephemeris difference, not a defect in either
// engine. Each row below gets its own bound (worst measured value, rounded up to the next 5s,
// plus a further 3s of margin) -- fix round 1, finding 2: a shared bound sized to the worst row
// in a group left the others with tens of seconds of unmeasured slack, which is not what
// "measured, cited, still-tight" is supposed to mean.
const QUARTER_EXCEPTION_MS = {
  '2099-01-07T01:52:07Z|2': 80000, // measured 73.3s
  '2099-01-13T17:27:28Z|3': 70000, // measured 65.1s
  '2099-01-21T09:09:02Z|0': 70000, // measured 63.0s
  '2099-01-29T14:40:11Z|1': 70000, // measured 64.6s
  '2099-07-02T14:22:42Z|2': 75000, // measured 67.4s
  '2099-07-10T15:15:13Z|3': 70000, // measured 66.4s
  '2099-07-18T01:02:27Z|0': 80000, // measured 74.3s
  '2099-07-24T17:11:07Z|1': 75000  // measured 69.2s
};

test('quarter moons match pyswisseph within a minute (2099 exceptions documented above)', () => {
  for (const row of REF.quarters) {
    const found = E.monthEvents(new Date(row.utc).getUTCFullYear(), new Date(row.utc).getUTCMonth() + 1)
      .events.filter(e => e.type === 'quarter' && e.quarter === row.quarter);
    const tol = QUARTER_EXCEPTION_MS[`${row.utc}|${row.quarter}`] || 60000;
    const match = found.find(e => Math.abs(new Date(e.date) - new Date(row.utc)) < tol);
    assert.ok(match, `no quarter ${row.quarter} within ${tol}ms of ${row.utc}`);
  }
});

// Finding (ingresses): with the fixture now covering the cardinal cusps and spread across the
// year (see above), twelve of fifty rows exceed the 1-minute tolerance, each with one of two
// distinct, measured, understood causes -- not a defect in either engine.
//
// (1) Ten 2099 rows -- all four Sun cardinal ingresses, all four Moon seasonal rows, and the
//     two Mars rows -- disagree by 98.7-232.4s: the same delta-T divergence documented above
//     for the 2099 quarters. Shifting the assumed TT-UT offset by ~107.7s moves each engine's
//     computed longitude for the same UT instant by a few thousandths of a degree, which
//     becomes a timing gap of roughly that size at a fast body's cusp crossing (98.7-113.4s for
//     the Sun and Moon rows) -- and a much larger one where Mars's own apparent speed is also
//     reduced there (152.2s at 0.689 deg/day; 232.4s at just 0.252 deg/day on 2099-08-26,
//     confirmed directly against the engine's own speedAt), compounding the same delta-T shift
//     the way (2) below compounds an ordinary one.
// (2) The 1950-03-28 Mars ingress into Virgo (a retrograde re-entry, 132.6s) and the
//     2000-01-04 Mars ingress into Pisces (68.6s) are unrelated to the range edge -- 1950's
//     delta-T disagreement is under a second. Measured directly at a fixed instant near each
//     crossing, the two engines' Mars longitudes differ by only ~0.0006 deg (about 2
//     arcseconds) in both cases: an entirely ordinary gap between two independent Mars
//     ephemerides. But Mars's own apparent speed is reduced there (-0.385 deg/day, mid
//     retrograde, in 1950; 0.776 deg/day in 2000), so the same tiny longitude gap produces a
//     disproportionately larger timing gap than it would at full speed.
//
// (3) Fix round 2 added the first Uranus, Neptune and Pluto ingress rows the fixture ever
//     carried (twelve of them -- see build_sky_fixtures.py). ALL TWELVE exceed a minute, from
//     67s to 13563s, and every one is cause (2) above taken to its limit: an ordinary
//     longitude gap between two independent outer-planet ephemerides, divided by an apparent
//     speed twenty to a hundred times smaller than Mars's. None is a delta-T effect -- ten of
//     the twelve are nowhere near the range edge, and the worst row of all is 2011.
//
//     Measured directly for each row, at the fixture's own UT instant (so neither engine's
//     root search is involved): the engine's longitude for that body differs from the cusp
//     pyswisseph puts it on by between 0.09" and 16.5" of arc. That is the same order as the
//     ~2" Mars gap in (2) and entirely ordinary between a Moshier ephemeris and Astronomy
//     Engine's own series. Dividing each gap by the engine's own speedAt at that instant
//     reproduces every timing bound below to within a couple of seconds, which is what
//     identifies the mechanism rather than merely asserting it:
//
//       Uranus  1904-12-20 Capricorn   3.35" / 0.0604 deg-day  ->  1333s (measured 1332.6)
//       Neptune 1902-05-21 Cancer      3.23" / 0.0330          ->  2353s (measured 2353.5)
//       Pluto   1912-09-10 Cancer      2.10" / 0.0073          ->  6869s (measured 6851.1)
//       Uranus  1955-08-24 Leo         1.87" / 0.0547          ->   819s (measured  819.9)
//       Neptune 1955-12-24 Scorpio    10.59" / 0.0211          -> 12042s (measured 12062.8)
//       Pluto   1956-10-20 Virgo       0.98" / 0.0203          ->  1154s (measured 1154.4)
//       Uranus  2003-03-10 Pisces      5.34" / 0.0551          ->  2323s (measured 2323.6)
//       Neptune 2011-04-04 Pisces     16.54" / 0.0292          -> 13578s (measured 13563.4)
//       Pluto   2008-01-26 Capricorn   0.09" / 0.0314          ->    67s (measured   67.2)
//       Uranus  2026-04-26 Gemini      1.35" / 0.0544          ->   596s (measured  596.3)
//       Neptune 2026-01-26 Aries      12.02" / 0.0254          -> 11350s (measured 11364.4)
//       Pluto   2043-03-09 Pisces      3.56" / 0.0274          ->  3118s (measured 3118.4)
//
//     So the tight, meaningful agreement for these bodies is the arcsecond figure; the seconds
//     figure is that same agreement divided by a near-zero speed, and a bound in seconds is
//     necessarily loose for a body that takes a fortnight to cross an arcminute. The bounds are
//     still each row's own measured value rather than a shared one, so a row that moved by a
//     day -- the kind of regression this fixture exists to catch -- still fails.
//
//     The fifteen new Uranus/Neptune/Pluto STATION rows needed no exception at all: the worst
//     of them is 1792.6s (Neptune direct, 2099-05-23), inside the 1-hour station tolerance.
//
// Each bound below is that row's own measured worst case, rounded up (fix round 1, finding 2).
const INGRESS_EXCEPTION_MS = {
  '1950-03-28T11:05:07Z': 140000, // Mars -> Virgo, mid-retrograde slow speed, measured 132.6s
  '2000-01-04T03:00:54Z': 75000,  // Mars -> Pisces, reduced speed, measured 68.6s
  '2099-03-20T07:19:14Z': 115000, // Sun -> Aries (spring equinox), measured 107.8s
  '2099-06-20T23:43:10Z': 115000, // Sun -> Cancer (summer solstice), measured 110.5s
  '2099-09-22T16:12:36Z': 110000, // Sun -> Libra (autumn equinox), measured 106.4s
  '2099-12-21T14:05:52Z': 105000, // Sun -> Capricorn (winter solstice), measured 98.7s
  '2099-01-01T11:13:26Z': 110000, // Moon -> Taurus, measured 106.4s
  '2099-04-02T07:02:56Z': 115000, // Moon -> Virgo, measured 107.6s
  '2099-07-01T18:02:06Z': 115000, // Moon -> Capricorn, measured 107.7s
  '2099-10-01T10:06:11Z': 120000, // Moon -> Taurus, measured 113.4s
  '2099-02-14T00:01:32Z': 160000, // Mars -> Capricorn, measured 152.2s
  '2099-08-26T01:42:29Z': 240000, // Mars -> Taurus, measured 232.4s (delta-T + reduced speed)
  // The twelve outer-planet rows of cause (3) above. Each is an ordinary arcsecond-scale
  // ephemeris gap divided by that body's own near-zero apparent speed; see the table.
  '1904-12-20T13:35:21Z': 1400000,  // Uranus  -> Capricorn, measured  1332.6s (3.35")
  '1902-05-21T13:31:17Z': 2400000,  // Neptune -> Cancer,    measured  2353.5s (3.23")
  '1912-09-10T16:26:33Z': 6900000,  // Pluto   -> Cancer,    measured  6851.1s (2.10")
  '1955-08-24T18:02:00Z': 850000,   // Uranus  -> Leo,       measured   819.9s (1.87")
  '1955-12-24T15:16:17Z': 12100000, // Neptune -> Scorpio,   measured 12062.8s (10.59")
  '1956-10-20T06:09:37Z': 1200000,  // Pluto   -> Virgo,     measured  1154.4s (0.98")
  '2003-03-10T20:52:10Z': 2400000,  // Uranus  -> Pisces,    measured  2323.6s (5.34")
  '2011-04-04T13:54:16Z': 13600000, // Neptune -> Pisces,    measured 13563.4s (16.54")
  '2008-01-26T02:40:11Z': 75000,    // Pluto   -> Capricorn, measured    67.2s (0.09")
  '2026-04-26T00:51:19Z': 650000,   // Uranus  -> Gemini,    measured   596.3s (1.35")
  '2026-01-26T17:40:03Z': 11400000, // Neptune -> Aries,     measured 11364.4s (12.02")
  '2043-03-09T01:03:40Z': 3200000   // Pluto   -> Pisces,    measured  3118.4s (3.56")
};

test('sign ingresses match pyswisseph within a minute (exceptions documented above)', () => {
  for (const row of REF.ingresses) {
    const t = new Date(row.utc);
    const from = new Date(t.getTime() - 5 * 86400000);
    const to = new Date(t.getTime() + 5 * 86400000);
    const found = E.ingresses(from, to, [row.body]);
    const tol = INGRESS_EXCEPTION_MS[row.utc] || 60000;
    const match = found.find(e => e.sign === row.sign && Math.abs(new Date(e.date) - t) < tol);
    assert.ok(match, `no ${row.body} ingress into ${row.sign} within ${tol}ms of ${row.utc}, got ${JSON.stringify(found)}`);
  }
});

test('stations match pyswisseph within an hour', () => {
  for (const row of REF.stations) {
    const t = new Date(row.utc);
    const from = new Date(t.getTime() - 3 * 86400000);
    const to = new Date(t.getTime() + 3 * 86400000);
    const found = E.stations(from, to, [row.body]);
    const match = found.find(e => e.direction === row.direction && Math.abs(new Date(e.date) - t) < 3600000);
    assert.ok(match, `no ${row.body} ${row.direction} station within an hour of ${row.utc}, got ${JSON.stringify(found)}`);
  }
});

// Fix round 1, finding 3: `kind` was recorded in the fixture but never asserted -- dead data
// that read as coverage. Asserting it surfaces one real, explained disagreement: 1950-03-18.
// pyswisseph classifies it ECL_ANNULAR | ECL_NONCENTRAL (retflag=10, confirmed directly against
// swe.sol_eclipse_when_glob) -- it already knows the shadow axis is non-central, but still names
// the event by the umbra's shape. Astronomy Engine's `GeoidIntersect` instead requires the
// shadow axis to actually intersect Earth's oblate geoid before calling an eclipse total or
// annular at all; here the axis's closest approach to Earth's center is `distance =
// 6370.499 km` (measured directly from `SearchGlobalSolarEclipse`) -- between Earth's polar
// radius (6356.75 km) and equatorial radius (6378.14 km), so whether it "touches" depends on
// which Earth model and threshold you use. Astronomy Engine's geoid test finds no intersection
// and reports 'partial'. Two defensible, different conventions for a genuinely borderline
// non-central event, not a bug in either engine. The other nineteen rows agree exactly.
const ECLIPSE_KIND_EXCEPTIONS = {
  '1950-03-18T15:31:35Z|Sun': 'partial' // pyswisseph: annular (non-central); see comment above
};

test('eclipse peaks match pyswisseph within three minutes, and kind agrees except one documented non-central case', () => {
  for (const row of REF.eclipses) {
    const t = new Date(row.utc);
    const from = new Date(t.getTime() - 10 * 86400000);
    const to = new Date(t.getTime() + 10 * 86400000);
    const found = E.eclipses(from, to).filter(e => e.body === row.body);
    const match = found.find(e => Math.abs(new Date(e.date) - t) < 3 * 60000);
    assert.ok(match, `no ${row.body} eclipse peak within three minutes of ${row.utc}, got ${JSON.stringify(found)}`);
    const expectedKind = ECLIPSE_KIND_EXCEPTIONS[`${row.utc}|${row.body}`] || row.kind;
    assert.equal(match.kind, expectedKind,
      `${row.body} eclipse at ${row.utc}: expected kind ${expectedKind}, got ${match.kind}`);
  }
});

test('personal transits refuse an unusable source or an out-of-range month without throwing', () => {
  for (const bad of [null, undefined, {}, {chart: {status: 'missing'}, birthday: 'nope'},
                     {chart: null, birthday: '1980-13-45'}, {chart: null, birthday: '1899-05-05'},
                     {chart: {status: 'missing'}, birthday: ''}, 'nope', 42]) {
    const r = E.personalTransits(bad, 2026, 3);
    assert.deepEqual(r, {status: 'no-chart', hits: [], angles: false, natalMoon: false, approximate: false},
      `unusable source ${JSON.stringify(bad)}`);
  }
  for (const [year, month] of [[2101, 1], [1900, 12], [2026, 13], [2026, 0], ['nope', 3], [2026, NaN]]) {
    const r = E.personalTransits(READY, year, month);
    assert.equal(r.status, 'out-of-range', `${year}-${month}`);
    assert.deepEqual(r.hits, []);
  }
  assert.equal(E.personalTransits(READY, 1901, 1).status, 'ready');
  assert.equal(E.personalTransits(READY, 2100, 12).status, 'ready');
});

// ---- month void bands (spec Part A: "Void bands, both definitions, from voidPeriods") ----

test('monthEvents returns paired void bands overlapping the month', () => {
  const {status, voids} = E.monthEvents(2026, 3);
  assert.equal(status, 'ready');
  assert.ok(Array.isArray(voids), 'monthEvents must return a voids array');
  // The Moon changes sign roughly every 2.2 days, and every sign transit closes with a void,
  // so a month holds about 13. Fewer than 8 or more than 20 means the window is wrong.
  assert.ok(voids.length >= 8 && voids.length <= 20, `expected ~13 bands, got ${voids.length}`);

  const monthStart = Date.UTC(2026, 2, 1), monthEnd = Date.UTC(2026, 3, 1);
  for (const band of voids) {
    // Every band is an interval, not an instant: it has both ends and they are ordered.
    assert.ok(new Date(band.start) < new Date(band.end), 'band start is not before its end');
    // It must overlap the month, but need not be contained in it -- a band that opens on the
    // last evening of February and closes on 1 March is this month's reader's concern too.
    assert.ok(new Date(band.end) > monthStart && new Date(band.start) < monthEnd,
      `band ${band.start}..${band.end} does not overlap March 2026`);
    assert.ok(E.signNames.includes(band.sign), `unknown sign ${band.sign}`);
    // The two traditions share an end and the modern one starts no earlier, so it sits inside.
    assert.ok(new Date(band.modernStart) >= new Date(band.start),
      'the modern band starts before the classical one');
    assert.ok(new Date(band.modernStart) < new Date(band.end), 'the modern band is empty');
  }
});

test('monthEvents void bands keep the events contract untouched', () => {
  const {events, voids} = E.monthEvents(2026, 7);
  // Voids are a sibling key precisely so events stays a sorted list of instants.
  for (const event of events) {
    assert.equal(typeof event.date, 'string');
    assert.equal(event.end, undefined, 'an interval leaked into the events array');
  }
  assert.notEqual(voids, undefined);
});

test('an out-of-range month returns a status and no partial void data', () => {
  for (const [year, month] of [[1900, 12], [2101, 1], [2026, 0], [2026, 13], [2026.5, 3]]) {
    const result = E.monthEvents(year, month);
    assert.equal(result.status, 'out-of-range', `${year}-${month}`);
    assert.equal(result.voids, undefined, `${year}-${month} leaked voids`);
    assert.equal(result.events, undefined, `${year}-${month} leaked events`);
  }
});

test('the padded void window still works at both ends of the supported range', () => {
  // voidBands pads four days each side and therefore reaches outside 1901-2100. It calls the
  // ungated voidPeriodsCore on purpose, the same precedent voidStateFor set: the public range
  // governs the month asked about, not the internal window used to answer it. A future tidy-up
  // swapping in the guarded voidPeriods would silently empty these two months.
  for (const [year, month] of [[1901, 1], [2100, 12]]) {
    const result = E.monthEvents(year, month);
    assert.equal(result.status, 'ready', `${year}-${month}`);
    assert.ok(result.voids.length > 0, `${year}-${month} returned no void bands`);
  }
});
