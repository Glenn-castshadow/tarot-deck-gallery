const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../natal-engine.js');
const R = require('../relationship-charts-engine.js');
const reference = require('./fixtures/natal-reference.json');

const charts = reference.cases.map(c => N.calculate(c.input)).filter(c => c.status === 'ready');
const close = (a, b, message) => assert.ok(Math.abs(N.delta(a, b)) < 1e-9, `${message}: ${a} vs ${b}`);
const arc = v => { const m = N.mod(v); return m > 360 - 1e-7 ? 0 : m; };

test('near midpoints take the shorter arc, across 0° as well', () => {
  close(R.nearMidpoint(350, 10), 0, 'across Aries');
  close(R.nearMidpoint(10, 350), 0, 'across Aries, reversed');
  close(R.nearMidpoint(20, 60), 40, 'ordinary');
  close(R.nearMidpoint(10, 200), 285, 'far side avoided');
  close(R.nearMidpoint(200, 10), 285, 'far side avoided, reversed');
});

test('an exactly opposed pair takes the point 90° forward of the first placement', () => {
  close(R.nearMidpoint(10, 190), 100, 'first at 10');
  close(R.nearMidpoint(190, 10), 280, 'first at 190');
  close(R.nearMidpoint(0, 180), 90, 'first at 0');
});

test('a composite of a chart with itself is that chart', () => {
  for (const chart of charts) {
    const c = R.composite(chart, chart);
    assert.equal(c.status, 'ready');
    close(c.angles.asc, chart.angles.asc, 'Ascendant');
    close(c.angles.mc, chart.angles.mc, 'Midheaven');
    chart.cusps.forEach((cusp, i) => close(c.cusps[i], cusp, `cusp ${i + 1}`));
    for (const p of chart.points.filter(p => p.kind === 'planet')) {
      close(c.points.find(q => q.name === p.name).longitude, p.longitude, p.name);
    }
  }
});

test('the composite does not depend on which chart comes first', () => {
  for (let i = 0; i < charts.length; i++) for (let j = i + 1; j < charts.length; j++) {
    const ab = R.composite(charts[i], charts[j]), ba = R.composite(charts[j], charts[i]);
    close(ab.angles.asc, ba.angles.asc, 'Ascendant');
    close(ab.angles.mc, ba.angles.mc, 'Midheaven');
    ab.cusps.forEach((cusp, k) => close(cusp, ba.cusps[k], `cusp ${k + 1}`));
    ab.points.forEach(p => {
      const a = charts[i].points.find(q => q.name === p.name).longitude;
      const b = charts[j].points.find(q => q.name === p.name).longitude;
      if (Math.abs(Math.abs(N.delta(a, b)) - 180) > 1e-6) close(p.longitude, ba.points.find(q => q.name === p.name).longitude, p.name);
    });
  }
});

test('composite houses stay in order, begin at the Ascendant and put the Midheaven on cusp 10', () => {
  for (let i = 0; i < charts.length; i++) for (let j = i + 1; j < charts.length; j++) {
    const c = R.composite(charts[i], charts[j]);
    const east = N.mod(c.angles.asc - c.angles.mc);
    assert.ok(east > 0 && east < 180, `Ascendant west of the Midheaven (${i},${j})`);
    // The two polar fixtures fall back to Whole Sign, whose first cusp is the start of the rising sign.
    if (c.houseSystem !== 'whole-sign') close(c.cusps[0], c.angles.asc, `cusp 1 (${i},${j})`);
    if (c.houseSystem === 'placidus' || c.houseSystem === 'regiomontanus') close(c.cusps[9], c.angles.mc, `cusp 10 (${i},${j})`);
    const arcs = c.cusps.map(cusp => arc(cusp - c.cusps[0]));
    for (let k = 1; k < 12; k++) assert.ok(arcs[k] > arcs[k - 1], `cusps out of order at ${k + 1} (${i},${j})`);
  }
});

// Minimal Equal-house chart: only the fields composite reads.
const equalChart = (asc, mc, planetAt = 0) => ({
  status: 'ready', houseSystem: 'equal', orbScale: 1, angles: {asc, mc},
  cusps: N.houseCusps({asc, mc}, 0, 'equal'),
  points: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
    .map((name, i) => ({name, symbol: name[0], kind: 'planet', longitude: N.mod(planetAt + i * 31)}))
});

test('the composite Ascendant is turned 180° when the plain midpoint would fall west of the Midheaven', () => {
  // Midheavens 0° and 200° meet at 280°; Ascendants 170° and 210° meet at 190°, which is west of 280°.
  const c = R.composite(equalChart(170, 0), equalChart(210, 200));
  close(c.angles.mc, 280, 'Midheaven');
  close(c.angles.asc, 10, 'Ascendant turned');
  close(c.cusps[0], 10, 'Equal houses recast from the turned Ascendant');
});

test('Whole Sign composites recast from the composite Ascendant; mismatched systems use Equal with a notice', () => {
  const whole = charts.slice(0, 2).map(c => N.calculate({...reference.cases[charts.indexOf(c)].input, houseSystem: 'whole-sign'}));
  const w = R.composite(whole[0], whole[1]);
  assert.equal(w.houseSystem, 'whole-sign');
  assert.deepEqual(w.cusps, N.houseCusps({asc: w.angles.asc, mc: w.angles.mc}, 0, 'whole-sign'));
  assert.equal(w.notice, '');
  const mixed = R.composite(charts[0], whole[1]);
  assert.equal(mixed.houseSystem, 'equal');
  close(mixed.cusps[0], mixed.angles.asc, 'Equal cusp 1');
  assert.match(mixed.notice, /Equal houses/);
});

test('composite aspects are the majors among the composite planets and angles, with no motion', () => {
  const c = R.composite(charts[0], charts[1]);
  const expected = N.aspectsFor([...c.points, ...c.axes.slice(0, 2)], c.orbScale).map(a => ({...a, applying: null}));
  assert.deepEqual(c.aspects, expected);
  assert.ok(c.aspects.every(a => a.applying === null));
  assert.equal(c.points.length, 10);
  assert.ok(c.points.every(p => p.house >= 1 && p.house <= 12 && typeof p.sign === 'string'));
  assert.deepEqual(c.axes.map(a => a.name), ['Ascendant', 'Midheaven', 'Descendant', 'Imum Coeli']);
});

test('the composite refuses charts that are not ready', () => {
  assert.equal(R.composite(charts[0], {status: 'missing'}).status, 'missing');
  assert.equal(R.composite(null, charts[0]).status, 'missing');
});

const place = (latitude, longitude, timeZone) => ({latitude, longitude, timeZone});

test('a Davison chart of a chart with itself is that chart', () => {
  for (const chart of charts) {
    const d = R.davison(chart, chart);
    assert.equal(d.status, 'ready');
    assert.equal(d.method, 'davison');
    assert.equal(d.date, chart.date);
    assert.equal(d.location.latitude, chart.location.latitude);
    assert.ok(Math.abs(d.location.longitude - chart.location.longitude) < 1e-9, `longitude ${d.location.longitude} vs ${chart.location.longitude}`);
    assert.equal(d.location.timeZone, 'UTC');
    close(d.angles.asc, chart.angles.asc, 'Ascendant');
    for (const p of chart.points.filter(p => p.kind === 'planet')) close(d.points.find(q => q.name === p.name).longitude, p.longitude, p.name);
  }
});

test('the Davison chart is cast for the midpoint instant and place', () => {
  const a = charts[0], b = charts[3];
  const d = R.davison(a, b);
  const instant = new Date((Date.parse(a.date) + Date.parse(b.date)) / 2);
  const latitude = (a.location.latitude + b.location.latitude) / 2;
  let longitude = R.nearMidpoint(a.location.longitude, b.location.longitude);
  if (longitude > 180) longitude -= 360;
  const expected = N.chartAtInstant(instant, place(latitude, longitude, 'UTC'), {houseSystem: a.houseSystem, orbScale: a.orbScale});
  assert.equal(d.date, expected.date);
  close(d.angles.asc, expected.angles.asc, 'Ascendant');
  assert.equal(d.location.latitude, latitude);
  assert.equal(d.location.longitude, longitude);
  assert.equal(d.location.timeZone, 'UTC');
});

test('Davison longitudes meet across 180°, not across Greenwich', () => {
  const tokyo = N.calculate({birthday: '1985-04-10', time: '09:00', location: place(35.6895, 139.6917, 'Asia/Tokyo')});
  const honolulu = N.calculate({birthday: '1988-10-02', time: '18:30', location: place(21.3069, -157.8583, 'Pacific/Honolulu')});
  const d = R.davison(tokyo, honolulu);
  // 139.69°E and 157.86°W are 62.45° apart across the date line; their midpoint is near 170.9°E.
  assert.ok(Math.abs(d.location.longitude - 170.9167) < 1e-3, `longitude ${d.location.longitude}`);
  assert.ok(Math.abs(d.location.latitude - 28.4982) < 1e-3, `latitude ${d.location.latitude}`);
});

test('the Davison chart uses the reader\'s house system and refuses charts that are not ready', () => {
  const whole = N.calculate({...reference.cases[0].input, houseSystem: 'whole-sign'});
  assert.equal(R.davison(whole, charts[1]).houseSystem, 'whole-sign');
  assert.equal(R.davison(charts[0], {status: 'missing'}).status, 'missing');
});

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const View = require('../relationship-charts.js');
// natal-chart.js is browser-only (a top-level const reading the NatalEngine global); load it in a
// context that supplies that global, so the real wheel is exercised against both models.
const NatalChart = vm.runInNewContext(`${fs.readFileSync(path.join(__dirname, '..', 'natal-chart.js'), 'utf8')}\nNatalChart`, {NatalEngine: N});
const realWheel = m => NatalChart.renderWheel(m, {kind: 'point', key: 'Sun'}, false, true);
const PREDICTIVE = /you will|will happen|is going to|destined|soulmate|meant to be|guarantee|compatib|\blucky\b|doomed/i;

test('both charts render with the real wheel, their placements, aspects and sources', () => {
  for (let i = 0; i + 1 < charts.length; i += 2) {
    for (const model of [R.composite(charts[i], charts[i + 1]), R.davison(charts[i], charts[i + 1])]) {
      const html = View.render(model, {wheel: realWheel});
      assert.match(html, /<svg/, `${model.method}: no wheel`);
      assert.match(html, new RegExp(`data-relationship-method="${model.method}"`));
      for (const p of model.points.filter(p => p.kind === 'planet')) assert.match(html, new RegExp(`<th scope="row">[^<]*${p.name}`), `${model.method}: no row for ${p.name}`);
      assert.match(html, /Planets in Composite/);
      assert.match(html, /Ronald Davison/);
      assert.match(html, /<details/);
      assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE, `${model.method}: predictive copy`);
    }
  }
});

test('the Davison view names its moment in UTC and its place; the composite names its method', () => {
  const d = R.davison(charts[0], charts[1]);
  const html = View.render(d);
  assert.match(html, new RegExp(d.date.slice(0, 16).replace('T', ' ')));
  assert.match(html, /UTC/);
  assert.match(View.render(R.composite(charts[0], charts[1])), /midpoint/i);
});

test('a notice is shown when the composite had to change house system, and nothing renders when not ready', () => {
  const whole = N.calculate({...reference.cases[1].input, houseSystem: 'whole-sign'});
  assert.match(View.render(R.composite(charts[0], whole)), /Equal houses/);
  assert.equal(View.render({status: 'missing', message: 'x'}), '');
});

test('a polar fallback on one side gives a Whole Sign composite, not the settings-mismatch Equal', () => {
  // charts[7] is polar-north: chosen Placidus, fallen back to Whole Sign with a notice.
  assert.equal(charts[7].houseSystem, 'whole-sign');
  assert.ok(charts[7].notice);
  for (const [a, b] of [[charts[0], charts[7]], [charts[7], charts[0]]]) {
    const c = R.composite(a, b);
    assert.equal(c.houseSystem, 'whole-sign');
    assert.deepEqual(c.cusps, N.houseCusps({asc: c.angles.asc, mc: c.angles.mc}, 0, 'whole-sign'));
    assert.match(c.notice, /cannot be drawn/);
  }
  const equal = N.calculate({...reference.cases[1].input, houseSystem: 'equal'});
  const mixed = R.composite(charts[0], equal);
  assert.equal(mixed.houseSystem, 'equal');
  assert.equal(mixed.notice, 'The two charts use different house systems, so this composite uses Equal houses from the composite Ascendant.');
});

test('a polar reader\'s Davison chart uses the Placidus they chose where the midpoint allows it', () => {
  const polar = charts[7], partner = charts[4];
  const latitude = (polar.location.latitude + partner.location.latitude) / 2;
  assert.ok(Math.abs(latitude) < 60, `midpoint latitude ${latitude}`);
  const d = R.davison(polar, partner);
  assert.equal(d.houseSystem, 'placidus');
  assert.equal(d.notice, '');
});

test('the Davison model carries no lunar nodes in its points or aspects', () => {
  for (let i = 0; i + 1 < charts.length; i++) {
    const d = R.davison(charts[i], charts[i + 1]);
    assert.ok(d.points.every(p => p.kind !== 'node'), `node point (${i})`);
    const nodes = /North Node|South Node/;
    assert.ok([...d.aspects, ...d.minorAspects].every(a => !nodes.test(a.a) && !nodes.test(a.b)), `node aspect (${i})`);
  }
});

test('both relationship charts take the orb scale from the reader', () => {
  const wide = N.calculate({...reference.cases[0].input, orbScale: 1.25});
  assert.equal(wide.orbScale, 1.25);
  assert.equal(R.composite(wide, charts[1]).orbScale, 1.25);
  assert.equal(R.davison(wide, charts[1]).orbScale, 1.25);
  assert.equal(R.composite(charts[1], wide).orbScale, 1);
  assert.equal(R.davison(charts[1], wide).orbScale, 1);
});
