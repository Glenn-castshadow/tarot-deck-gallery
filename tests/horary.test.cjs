const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../horary-engine.js');
const C = require('../classical-engine.js');
const natal = require('../natal-engine.js');

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

  // Translation: a chart where a faster Moon is separating from Mars and applying to Venus.
  // With the Moon at 95° the Moon-Venus sextile (95 to 155 = 60°) is exactly exact (orb 0),
  // and applyingAspect's strict "< orb" test can never call an exact aspect "applying" --
  // so the Moon is nudged to 93°, leaving a 2° orb that is genuinely closing.
  const chart = { points: [pt('Mars', 90, 0.5), pt('Venus', 155, 1.1), pt('Moon', 93, 13), pt('Sun', 300, 1), pt('Mercury', 280, 1.2), pt('Jupiter', 20, 0.2), pt('Saturn', 200, 0.1)] };
  const tr = H.translation(chart, 'Mars', 'Venus'); assert.equal(tr?.planet, 'Moon'); assert.equal(tr.from, 'Mars'); assert.equal(tr.to, 'Venus');

  // Collection: Mars 125 and Venus 152 both applying (within orb) to the slower Saturn at
  // 215.5 -- Mars square Saturn (separation 90.5, orb 0.5) and Venus sextile Saturn
  // (separation 63.5, orb 3.5 within (7+9)/2 = 8), both closing since Mars and Venus are
  // faster than Saturn.
  const chart2 = { points: [pt('Mars', 125, 0.5), pt('Venus', 152, 1.1), pt('Saturn', 215.5, 0.1), pt('Moon', 10, 13), pt('Sun', 300, 1), pt('Mercury', 280, 1.2), pt('Jupiter', 20, 0.2)] };
  const col = H.collection(chart2, 'Mars', 'Venus'); assert.equal(col?.planet, 'Saturn');
});
