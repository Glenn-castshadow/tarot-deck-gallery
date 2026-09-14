const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../natal-engine.js');
const reference = require('./fixtures/natal-reference.json');

const at = (name, longitude, kind = 'planet') => ({name, longitude, speed: 0, kind});

test('the four minor aspects are defined at a fixed two-degree orb', () => {
  const byName = Object.fromEntries(N.minorAspectTypes.map(t => [t.name, t]));
  assert.deepEqual(Object.keys(byName).sort(), ['Quincunx', 'Semi-sextile', 'Semi-square', 'Sesquiquadrate']);
  assert.equal(byName['Semi-sextile'].angle, 30);
  assert.equal(byName['Semi-square'].angle, 45);
  assert.equal(byName['Sesquiquadrate'].angle, 135);
  assert.equal(byName['Quincunx'].angle, 150);
  for (const t of N.minorAspectTypes) assert.equal(t.orb, 2);
});

test('minors are found at their angle and at the orb edge, and not beyond it', () => {
  for (const t of N.minorAspectTypes) {
    const exact = N.aspectsFor([at('A', 0), at('B', t.angle)], 1, {minor: true});
    assert.ok(exact.some(a => a.type === t.name), `${t.name} not found at exactly ${t.angle}°`);
    const edge = N.aspectsFor([at('A', 0), at('B', t.angle + 2)], 1, {minor: true});
    assert.ok(edge.some(a => a.type === t.name), `${t.name} not found at the 2° edge`);
    const beyond = N.aspectsFor([at('A', 0), at('B', t.angle + 2.1)], 1, {minor: true});
    assert.ok(!beyond.some(a => a.type === t.name), `${t.name} found beyond its orb`);
  }
});

test('the orb scale does not widen the minors', () => {
  // 2.4° from a quincunx is outside a fixed 2° orb, but inside 2 × 1.25 = 2.5.
  const wide = N.aspectsFor([at('A', 0), at('B', 152.4)], 1.25, {minor: true});
  assert.ok(!wide.some(a => a.type === 'Quincunx'), 'the orb scale widened a minor aspect');
});

test('omitting the option reproduces the five-aspect output exactly', () => {
  // Every existing caller passes two arguments. If this ever diverges, the wheel, the report,
  // synastry and chart in time all change behaviour at once.
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const points = [...chart.points, ...chart.axes.slice(0, 2)];
    assert.deepEqual(N.aspectsFor(points, chart.orbScale), chart.aspects, `${c.id}: default output moved`);
    assert.deepEqual(N.aspectsFor(points, chart.orbScale, {}), chart.aspects, `${c.id}: empty options moved`);
    assert.ok(chart.aspects.every(a => ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'].includes(a.type)),
      `${c.id}: a minor aspect leaked into chart.aspects`);
  }
});

test('every chart carries its minor aspects in a separate field', () => {
  const c = reference.cases[0];
  const chart = N.calculate(c.input);
  assert.ok(Array.isArray(chart.minorAspects));
  assert.ok(chart.minorAspects.every(a => ['Semi-sextile', 'Semi-square', 'Sesquiquadrate', 'Quincunx'].includes(a.type)));
});

const D = require('../chart-depth-engine.js');
const C = require('../classical-engine.js');

// A minimal chart: only the fields profections read.
const chartWith = (birthday, ascLongitude) => ({status: 'ready', birthday, angles: {asc: ascLongitude}});

test('profections advance one house a year and return to the first every twelve', () => {
  const chart = chartWith('2000-06-15', 5); // Aries ascendant
  const at = (y, m, d) => D.profection(chart, new Date(y, m - 1, d));
  assert.equal(at(2000, 6, 15).house, 1);   // age 0
  assert.equal(at(2001, 6, 15).house, 2);   // age 1
  assert.equal(at(2011, 6, 15).house, 12);  // age 11
  assert.equal(at(2012, 6, 15).house, 1);   // age 12
  assert.equal(at(2024, 6, 15).house, 1);   // age 24
});

test('the profection year runs birthday to birthday', () => {
  const chart = chartWith('2000-06-15', 5);
  assert.equal(D.profection(chart, new Date(2010, 5, 14)).age, 9, 'the day before the tenth birthday');
  assert.equal(D.profection(chart, new Date(2010, 5, 15)).age, 10, 'the tenth birthday itself');
});

test('the profected sign advances whole sign from the Ascendant and wraps at Pisces', () => {
  const chart = chartWith('2000-01-01', 340); // Pisces ascendant, sign index 11
  assert.equal(D.profection(chart, new Date(2000, 0, 1)).sign, 'Pisces');
  assert.equal(D.profection(chart, new Date(2001, 0, 1)).sign, 'Aries');
  assert.equal(D.profection(chart, new Date(2002, 0, 1)).sign, 'Taurus');
});

test('the time lord is the traditional ruler of the profected sign, for all twelve', () => {
  for (let signIndex = 0; signIndex < 12; signIndex++) {
    const chart = chartWith('2000-01-01', signIndex * 30 + 10);
    const p = D.profection(chart, new Date(2000, 0, 1)); // age 0, house 1, the Ascendant's own sign
    assert.equal(p.signIndex, signIndex);
    assert.equal(p.lord, C.rulers[signIndex]);
  }
});

test('profections refuse a chart that is not ready, and a target before birth', () => {
  assert.equal(D.profection({status: 'missing'}, new Date()).status, 'missing');
  assert.throws(() => D.profection(chartWith('2000-06-15', 5), new Date(1999, 0, 1)), RangeError);
});

const mod360 = v => ((v % 360) + 360) % 360;

test('the Lot uses Asc + Moon − Sun by day and Asc + Sun − Moon by night', () => {
  const asc = 123.4, sun = 200.1, moon = 47.9;
  assert.ok(Math.abs(D.fortuneLongitude(asc, sun, moon, 'day') - mod360(asc + moon - sun)) < 1e-9);
  assert.ok(Math.abs(D.fortuneLongitude(asc, sun, moon, 'night') - mod360(asc + sun - moon)) < 1e-9);
  assert.throws(() => D.fortuneLongitude(asc, sun, moon, 'dusk'), RangeError);
});

test('the day and night Lots are reflections about the Ascendant', () => {
  // This catches a sign error in EITHER formula, which a single hand-computed value would not:
  // the two must sit the same arc either side of the Ascendant, and differ by twice Moon − Sun.
  for (const [asc, sun, moon] of [[123.4, 200.1, 47.9], [0, 359.5, 0.5], [270, 10, 190], [45.25, 45.25, 300]]) {
    const day = D.fortuneLongitude(asc, sun, moon, 'day');
    const night = D.fortuneLongitude(asc, sun, moon, 'night');
    assert.ok(Math.abs(mod360(day - asc) - mod360(asc - night)) < 1e-9, `not reflected for asc ${asc}`);
    assert.ok(Math.abs(mod360(day - night) - mod360(2 * (moon - sun))) < 1e-9, `wrong separation for asc ${asc}`);
  }
});

test('the Lot is read off the right three positions of every fixture chart', () => {
  // The fixture's positions are Swiss-derived, so this checks the engine takes the Ascendant,
  // Sun and Moon from the chart it is handed — the failure a formula test cannot see.
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const lot = D.partOfFortune(chart);
    const sect = C.sect(chart);
    const expected = sect === 'day'
      ? mod360(c.asc + c.points.Moon.longitude - c.points.Sun.longitude)
      : mod360(c.asc + c.points.Sun.longitude - c.points.Moon.longitude);
    const diff = Math.abs(((lot.longitude - expected + 540) % 360) - 180);
    assert.ok(diff < 0.1, `${c.id}: Lot ${lot.longitude} against ${expected} (${sect})`);
    assert.equal(lot.sect, sect);
  }
});

test('the Lot reports its sign, house and which formula it used', () => {
  const c = reference.cases[0];
  const chart = N.calculate(c.input);
  const lot = D.partOfFortune(chart);
  assert.ok(lot.signIndex >= 0 && lot.signIndex < 12);
  assert.ok(lot.house >= 1 && lot.house <= 12);
  assert.match(lot.formula, lot.sect === 'day' ? /Moon − Sun/ : /Sun − Moon/);
  assert.equal(D.partOfFortune({status: 'missing'}).status, 'missing');
});

// Hand-built aspects: patterns only read {a, b, type}.
const asp = (a, b, type) => ({a, b, type});
const planet = (name, longitude) => ({name, kind: 'planet', longitude});

test('a stellium is three or more planets in one sign, and two is not', () => {
  const three = [planet('Sun', 1), planet('Mercury', 10), planet('Venus', 20), planet('Mars', 100)];
  assert.deepEqual(D.patterns([], three).filter(p => p.type === 'Stellium').map(p => p.members),
    [['Mercury', 'Sun', 'Venus']]);
  const two = [planet('Sun', 1), planet('Mercury', 10), planet('Mars', 100)];
  assert.equal(D.patterns([], two).filter(p => p.type === 'Stellium').length, 0);
});

test('the nodes are not counted towards a stellium', () => {
  const points = [planet('Sun', 1), planet('Mercury', 10), {name: 'North Node', kind: 'node', longitude: 15}];
  assert.equal(D.patterns([], points).filter(p => p.type === 'Stellium').length, 0);
});

test('a grand trine is three planets each trine the other two', () => {
  const aspects = [asp('Sun', 'Moon', 'Trine'), asp('Moon', 'Mars', 'Trine'), asp('Sun', 'Mars', 'Trine')];
  const found = D.patterns(aspects, []).filter(p => p.type === 'Grand trine');
  assert.deepEqual(found.map(p => p.members), [['Mars', 'Moon', 'Sun']]);
});

test('a T-square names its apex', () => {
  const aspects = [asp('Sun', 'Moon', 'Opposition'), asp('Sun', 'Mars', 'Square'), asp('Moon', 'Mars', 'Square')];
  const t = D.patterns(aspects, []).filter(p => p.type === 'T-square');
  assert.equal(t.length, 1);
  assert.equal(t[0].apex, 'Mars');
});

test('a grand cross is reported once, not as its constituent T-squares', () => {
  const aspects = [
    asp('Sun', 'Moon', 'Opposition'), asp('Mars', 'Venus', 'Opposition'),
    asp('Sun', 'Mars', 'Square'), asp('Mars', 'Moon', 'Square'),
    asp('Moon', 'Venus', 'Square'), asp('Venus', 'Sun', 'Square')
  ];
  const found = D.patterns(aspects, []);
  assert.equal(found.filter(p => p.type === 'Grand cross').length, 1);
  assert.equal(found.filter(p => p.type === 'T-square').length, 0, 'the grand cross was also reported as T-squares');
});

test('a yod needs a sextile and two quincunxes, and names its apex', () => {
  const yod = [asp('Sun', 'Moon', 'Sextile'), asp('Sun', 'Mars', 'Quincunx'), asp('Moon', 'Mars', 'Quincunx')];
  const found = D.patterns(yod, []).filter(p => p.type === 'Yod');
  assert.equal(found.length, 1);
  assert.equal(found[0].apex, 'Mars');
  const noQuincunx = [asp('Sun', 'Moon', 'Sextile'), asp('Sun', 'Mars', 'Trine'), asp('Moon', 'Mars', 'Trine')];
  assert.equal(D.patterns(noQuincunx, []).filter(p => p.type === 'Yod').length, 0);
});

test('patterns ignore aspects to the angles', () => {
  const aspects = [asp('Sun', 'Moon', 'Trine'), asp('Moon', 'Ascendant', 'Trine'), asp('Sun', 'Ascendant', 'Trine')];
  const points = [planet('Sun', 0), planet('Moon', 120), {name: 'Ascendant', kind: 'angle', longitude: 240}];
  assert.equal(D.patterns(aspects, points).filter(p => p.type === 'Grand trine').length, 0);
});

const View = require('../chart-depth.js');
// "Fortune" is the Lot's own name, so it cannot be banned the way horary bans it.
const PREDICTIVE = /you will|will happen|is going to|lucky|unlucky|destined|guarantee|expect (?:good|bad)/i;

test('the section renders all three parts for every fixture chart, in a reflective voice', () => {
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const html = View.render(chart, {year: 2030});
    assert.match(html, /class="chart-depth"/);
    assert.match(html, /data-profection-year/);
    assert.match(html, /Part of Fortune/);
    assert.match(html, /<details/);
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE, `${c.id}: predictive copy`);
  }
  assert.equal(View.render({status: 'missing'}, {year: 2030}), '');
});

test('the rendered profection moves with the chosen year', () => {
  const chart = N.calculate(reference.cases[0].input);
  const lordIn = year => D.profection(chart, new Date(year, Number(chart.birthday.slice(5, 7)) - 1, Number(chart.birthday.slice(8, 10)))).lord;
  const signIn = year => D.profection(chart, new Date(year, Number(chart.birthday.slice(5, 7)) - 1, Number(chart.birthday.slice(8, 10)))).sign;
  assert.notEqual(signIn(2030), signIn(2031));
  assert.match(View.render(chart, {year: 2030}), new RegExp(lordIn(2030)));
  // Without the select, so a change to the selected option alone cannot pass.
  const body = year => View.render(chart, {year}).replace(/<select[^>]*>[\s\S]*?<\/select>/, '');
  assert.notEqual(body(2030), body(2031));
  // With no year, the profection in effect today renders, not an empty one.
  const today = Number(chart.birthday.slice(0, 4)) + D.profection(chart, new Date()).age;
  assert.equal(body(undefined), body(today));
  assert.match(body(undefined), /Profected house/);
});

test('sect is the Sun above the horizon, including in Whole Sign between the rising sign and the Ascendant', () => {
  // The Sun has just risen, but Whole Sign house 1 begins at the start of the rising sign, before
  // the Ascendant, so a houses-7-to-12 rule puts this Sun in house 1 and calls the chart night.
  const input = {birthday: '1990-07-24', time: '05:30', location: {latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London'}};
  const chart = N.calculate({...input, houseSystem: 'whole-sign'});
  assert.equal(chart.status, 'ready');
  const sun = chart.points.find(p => p.name === 'Sun').longitude;
  assert.ok(N.mod(sun - chart.angles.asc) > 180, `Sun ${sun} is not just above Ascendant ${chart.angles.asc}`);
  assert.equal(C.sect(chart), 'day');
  assert.match(D.partOfFortune(chart).formula, /Moon − Sun, for a day chart/);
  assert.equal(C.sect(N.calculate({...input, houseSystem: 'placidus'})), 'day');
});
