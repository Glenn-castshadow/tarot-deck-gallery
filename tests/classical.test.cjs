const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../classical-engine.js');
const natal = require('../natal-engine.js');
const ref = require('./fixtures/horary-reference.json');

test('lilly tables: rulers, exaltations, terms sum to 30, faces cycle, orbs', () => {
  assert.deepEqual(C.planets, ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
  assert.deepEqual(C.rulers, ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']);
  assert.deepEqual(C.exaltations.Sun, [0, 19]);
  assert.deepEqual(C.exaltations.Saturn, [6, 21]);
  assert.equal(C.terms.length, 12);
  for (const sign of C.terms) {
    assert.equal(sign.length, 5);
    assert.equal(sign[4][1], 30);
    for (let i = 1; i < 5; i++) assert.ok(sign[i][1] > sign[i - 1][1]);
  }
  assert.equal(C.faceRuler(0, 5), 'Mars');
  assert.equal(C.faceRuler(0, 15), 'Sun');
  assert.equal(C.faceRuler(1, 0), 'Mercury');
  assert.equal(C.faceRuler(11, 25), 'Mars');
  assert.deepEqual(C.orbs, { Sun: 15, Moon: 12, Saturn: 9, Jupiter: 9, Mars: 7, Venus: 7, Mercury: 7 });
  assert.equal(C.houseMatters.length, 12);
  assert.match(C.houseMatters[6].matters, /marriage/i);
});

test('essential dignities by hand: Sun in Aries 19.5 is exalted, in triplicity by day, and in its own face; Saturn in Aries is in fall', () => {
  // Sun at 19.5 Aries: exalted (+4), triplicity by day (+3), and the second decan of
  // Aries (10-20) is the Sun's own face (+1) -- Aries' term at 19.5 belongs to Mercury
  // (14-21), so term is false. Score is 4+3+1 = 8, not the 7 a dignity-only tally gives
  // if the face is overlooked.
  const sun = C.dignities('Sun', 19.5, 'day');
  assert.equal(sun.exaltation, true);
  assert.equal(sun.triplicity, true);
  assert.equal(sun.ruler, false);
  assert.equal(sun.peregrine, false);
  assert.equal(sun.term, false, 'Aries 19.5 is in Mercury’s term (14–21)');
  assert.equal(sun.face, true, 'Aries 10-20 is the Sun’s own face');
  assert.equal(sun.score, 8);

  const sat = C.dignities('Saturn', 10, 'night');
  assert.equal(sat.fall, true);
  assert.equal(sat.peregrine, false);
  assert.equal(sat.score, -4);

  const mars = C.dignities('Mars', 3, 'day');
  assert.equal(mars.ruler, true);
  assert.equal(mars.face, true);
  assert.equal(mars.score, 6, 'ruler 5 + face 1');

  const venusRuler = C.dignities('Venus', 185, 'day');
  assert.equal(venusRuler.ruler, true, 'Libra ruled by Venus');

  // Mercury at 1 Sagittarius: Sagittarius is ruled by Jupiter, so Mercury is in
  // detriment (-5). It is also in its own face there (Sagittarius' first decan,
  // 0-10, belongs to Mercury), which is +1 and not cancelled by the detriment --
  // so the score is -4, not -5.
  const mercDetriment = C.dignities('Mercury', 241, 'day');
  assert.equal(mercDetriment.detriment, true, 'Sagittarius is ruled by Jupiter');
  assert.equal(mercDetriment.peregrine, false);
  assert.equal(mercDetriment.face, true, 'Sagittarius’ first decan is Mercury’s own face');
  assert.equal(mercDetriment.score, -4);

  // Mercury at 1 Aries: term is Jupiter's (0-6), face is Mars' (0-10), no rulership,
  // exaltation or triplicity, and Aries' detriment belongs to Venus -- so this is a
  // genuine peregrine placement.
  const mercPeregrine = C.dignities('Mercury', 1, 'day');
  assert.equal(mercPeregrine.term, false);
  assert.equal(mercPeregrine.face, false);
  assert.equal(mercPeregrine.detriment, false, 'Aries’ detriment is Venus');
  assert.equal(mercPeregrine.peregrine, true);
  assert.equal(mercPeregrine.score, -5);

  assert.throws(() => C.dignities('Uranus', 10, 'day'), RangeError);
});

for (const c of ref.cases) {
  test(`python-derived dignities agree: ${c.id}`, () => {
    const chart = natal.calculate({ ...c.input, houseSystem: 'regiomontanus' });
    const sect = C.sect(chart);
    if (chart.houseSystem === 'regiomontanus') assert.equal(sect, c.sect);
    for (const [name, lon] of Object.entries(c.points)) {
      const d = C.dignities(name, lon, c.sect), p = c.dignities[name];
      for (const k of ['ruler', 'detriment', 'exaltation', 'fall', 'triplicity', 'term', 'face', 'peregrine']) {
        assert.equal(d[k], p[k], `${name} ${k}`);
      }
    }
  });
}

test('accidental conditions: houses, motion, combustion thresholds, moon light; sect; reception', () => {
  const chart = natal.chartAtInstant(new Date('2024-03-15T10:20:00Z'), { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' }, { houseSystem: 'regiomontanus' });
  const sun = chart.points.find(p => p.name === 'Sun');
  const fake = (name, offset, retrograde = false) => ({ name, longitude: natal.mod(sun.longitude + offset), speed: 1, retrograde, kind: 'planet' });

  assert.equal(C.accidental(fake('Mercury', 0.2), chart).solar, 'cazimi');
  assert.equal(C.accidental(fake('Mercury', 5), chart).solar, 'combust');
  assert.equal(C.accidental(fake('Mercury', 12), chart).solar, 'underBeams');
  assert.equal(C.accidental(fake('Mercury', 20), chart).solar, 'free');
  assert.equal(C.accidental(sun, chart).solar, null);

  assert.equal(C.accidental(fake('Saturn', 20, true), chart).motion, 'retrograde');
  assert.equal(C.accidental(fake('Moon', 20), chart).motion, null);

  assert.equal(C.accidental({ name: 'Moon', longitude: 200, speed: 13, kind: 'planet' }, chart).viaCombusta, true);
  assert.equal(C.accidental({ name: 'Moon', longitude: natal.mod(sun.longitude + 90), speed: 13, kind: 'planet' }, chart).increasing, true);
  assert.equal(C.accidental({ name: 'Moon', longitude: natal.mod(sun.longitude - 90), speed: 13, kind: 'planet' }, chart).increasing, false);

  const a = C.accidental(fake('Jupiter', 20), chart);
  assert.ok(['angular', 'succedent', 'cadent'].includes(a.houseClass));
  assert.equal(typeof a.score, 'number');

  assert.ok(['day', 'night'].includes(C.sect(chart)));

  // Reception: Mars in Cancer is received by the Moon (rulership) and by Jupiter (exaltation).
  const synthetic = { ...chart, points: chart.points.map(p => p.name === 'Mars' ? { ...p, longitude: 100 } : p) };
  assert.deepEqual(C.reception('Moon', 'Mars', synthetic), { byRulership: true, byExaltation: false, any: true });
  assert.deepEqual(C.reception('Jupiter', 'Mars', synthetic), { byRulership: false, byExaltation: true, any: true });
  assert.equal(C.reception('Venus', 'Mars', synthetic).any, false);
});

test('ordinal house labels read 1st, 2nd, 3rd, 4th ... 11th, 12th', () => {
  const chart = natal.chartAtInstant(new Date('2024-03-15T10:20:00Z'), { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' }, { houseSystem: 'regiomontanus' });
  const sun = chart.points.find(p => p.name === 'Sun');
  const labelFor = house => {
    // Find a longitude that falls in the requested house by scanning the cusps.
    const lon = natal.mod(chart.cusps[house - 1] + 1);
    return C.accidental({ name: 'Mercury', longitude: lon, speed: 1, retrograde: false, kind: 'planet' }, chart).words[0];
  };
  assert.match(labelFor(1), /\b1st\b/);
  assert.match(labelFor(2), /\b2nd\b/);
  assert.match(labelFor(3), /\b3rd\b/);
  assert.match(labelFor(4), /\b4th\b/);
  assert.match(labelFor(11), /\b11th\b/);
  assert.match(labelFor(12), /\b12th\b/);
});
