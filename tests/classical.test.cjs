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

for(const r of ref.riseSet) test(`planetary hours from sunrise: ${r.place} ${r.date}`,()=>{
  const h=C.planetaryHours(new Date(+new Date(r.sunrise)+3600000),{latitude:r.latitude,longitude:r.longitude,timeZone:'UTC'});
  assert.equal(h.status,'ready');
  assert.ok(Math.abs(new Date(h.sunrise)-new Date(r.sunrise))<120000,'sunrise within 2 minutes of Swiss');
  assert.ok(Math.abs(new Date(h.sunset)-new Date(r.sunset))<120000,'sunset');
  assert.ok(Math.abs(new Date(h.nextSunrise)-new Date(r.nextSunrise))<120000,'next sunrise');
  assert.equal(h.hours.length,24);assert.equal(h.hours[0].start,h.sunrise);assert.equal(h.hours[11].end,h.sunset);assert.equal(h.hours[12].start,h.sunset);assert.equal(h.hours[23].end,h.nextSunrise);
  assert.equal(h.hours[0].ruler,h.dayRuler);
  // "One hour after sunrise is the first hour" only holds when the planetary day-hour
  // is at least a clock hour, i.e. daylight exceeds 12 hours. For winter/short-day rows
  // (day length < 12h) the true first hour is shorter than 60 minutes, so sunrise+1h
  // lands in a later hour. Check against the hour actually implied by this day's length,
  // rather than assuming the equinox case universally -- this still fails on any real
  // off-by-one or boundary bug in `current`, it just does not assume a false season.
  const dayHourLength=(new Date(h.sunset)-new Date(h.sunrise))/12;
  assert.equal(h.current,Math.floor(3600000/dayHourLength),'one hour after sunrise lands in the hour that day length implies');
  const chaldean=['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'];
  for(let i=1;i<24;i++) assert.equal(h.hours[i].ruler,chaldean[(chaldean.indexOf(h.hours[0].ruler)+i)%7]);
});
test('planetary day begins at sunrise: before dawn belongs to the previous weekday ruler; polar night is unavailable',()=>{
  const london={latitude:51.5085,longitude:-0.1257,timeZone:'Europe/London'};
  const midday=C.planetaryHours(new Date('2024-03-13T12:00:00Z'),london); // Wednesday → Mercury
  assert.equal(midday.dayRuler,'Mercury');
  const preDawn=C.planetaryHours(new Date('2024-03-14T04:00:00Z'),london); // Thursday 04:00 is still Wednesday's planetary day
  assert.equal(preDawn.dayRuler,'Mercury');assert.ok(preDawn.current>=12);
  const afterDawn=C.planetaryHours(new Date('2024-03-14T09:00:00Z'),london);
  assert.equal(afterDawn.dayRuler,'Jupiter');
  assert.equal(C.planetaryHours(new Date('2024-12-21T12:00:00Z'),{latitude:78,longitude:15,timeZone:'Arctic/Longyearbyen'}).status,'unavailable');
});
test('void of course by lilly: search result matches a brute-force scan; next aspect is before the sign exit',()=>{
  for(const iso of ['2024-03-15T10:20:00Z','2024-06-02T00:00:00Z','1999-12-31T23:00:00Z']) {
    const chart=natal.chartAtInstant(new Date(iso),{latitude:51.5085,longitude:-0.1257,timeZone:'Europe/London'},{houseSystem:'regiomontanus'});
    const m=C.moonCondition(chart);
    const astro=require('../vendor/astronomy-engine/astronomy.js');
    const lon=(b,t)=>astro.Ecliptic(astro.GeoVector(b,t,true)).elon;
    const moon0=lon('Moon',new Date(iso)), signEnd=Math.floor(moon0/30)*30+30;
    // brute force: step 10 minutes until the Moon leaves its sign, watching for any exact Ptolemaic aspect.
    let found=null; const targets=[0,60,90,120,180];
    let prev=null;
    for(let t=+new Date(iso);t<+new Date(iso)+4*86400000&&!found;t+=600000){
      const d=new Date(t), ml=lon('Moon',d); if(natal.mod(ml-signEnd)<180&&natal.mod(ml-signEnd)<15){break;}
      const seps=Object.fromEntries(['Sun','Mercury','Venus','Mars','Jupiter','Saturn'].map(p=>[p,natal.delta(ml,lon(p,d))]));
      if(prev) for(const p in seps) for(const a of targets) for(const sgn of (a===0||a===180?[1]:[1,-1])) { const x0=natal.delta(prev[p],sgn*a), x1=natal.delta(seps[p],sgn*a); if(x0<0&&x1>=0&&Math.abs(x1-x0)<45) found={p,a,t}; }
      prev=seps;
    }
    assert.equal(m.voidOfCourse,!found,`${iso} void state`);
    if(found) { assert.equal(m.nextAspect.planet,found.p); assert.equal(m.nextAspect.aspect,found.a); assert.ok(Math.abs(new Date(m.nextAspect.date)-found.t)<=600000); assert.ok(new Date(m.nextAspect.date)<new Date(m.signExit)); }
    assert.equal(typeof m.viaCombusta,'boolean');assert.equal(typeof m.increasing,'boolean');
  }
});
