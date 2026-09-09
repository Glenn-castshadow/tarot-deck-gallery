const test = require('node:test');
const assert = require('node:assert/strict');
const map = require('../astrocartography-engine.js');
const extras = require('../celestial-extras-engine.js');
const natal = require('../natal-engine.js');
const fixtures = require('./fixtures/atlas-reference.json');
const astro = require('../vendor/astronomy-engine/astronomy.js');

for (const fixture of fixtures.ephemeris) test(`independent map ephemeris: ${fixture.utc}`,()=>{
  const model=map.calculate(fixture.utc);
  assert.equal(model.lines.length,40);
  assert.ok(Math.abs(natal.delta(model.siderealDegrees,fixture.siderealDegrees))<.01);
  for(const planet of model.planets) {
    const expected=fixture.points[planet.name];
    assert.ok(Math.abs(natal.delta(planet.ra*15,expected.ra*15))<.03,`${planet.name} right ascension`);
    assert.ok(Math.abs(planet.dec-expected.dec)<.03,`${planet.name} declination`);
  }
});

test('angular geometry really rises, sets and culminates, including dateline crossings',()=>{
  const model=map.calculate('2000-01-01T12:00:00Z');
  for(const planet of model.planets) for(const line of planet.lines) {
    for(const [lon,lat] of line.geometry.coordinates.filter((_,i)=>i%20===0)) {
      assert.ok(Number.isFinite(lon)&&Number.isFinite(lat));
      assert.ok(lon>=-180&&lon<=180&&lat>=-90&&lat<=90);
      const h=natal.delta(model.siderealDegrees+lon,planet.ra*15)*Math.PI/180;
      const altitude=Math.asin(Math.sin(lat*Math.PI/180)*Math.sin(planet.dec*Math.PI/180)+Math.cos(lat*Math.PI/180)*Math.cos(planet.dec*Math.PI/180)*Math.cos(h))*180/Math.PI;
      if(line.kind==='ASC'||line.kind==='DSC') {assert.ok(Math.abs(altitude)<.0001);if(Math.abs(h)>1e-6&&Math.abs(Math.abs(h)-Math.PI)>1e-6)assert.equal(Math.sign(h),line.kind==='ASC'?-1:1);}
      else assert.ok(Math.abs(Math.abs(h)-(line.kind==='MC'?0:Math.PI))<1e-8);
    }
  }
});
test('circumpolar bodies have no false rising lines beyond their horizon limit',()=>{
  const lines=map.linesFor(5,60,100,'Example');
  for(const line of lines.filter(l=>['ASC','DSC'].includes(l.kind))) assert.ok(line.geometry.coordinates.every(p=>Math.abs(p[1])<=30.000001));
});
test('nearest-line distance uses the correct spherical half, not just longitude',()=>{
  const model={lines:map.linesFor(0,0,0,'Sun')};
  const lines=map.nearestLines(model,{latitude:0,longitude:0},['Sun']);
  assert.ok(lines.find(l=>l.kind==='MC').distanceKm<.001);
  assert.ok(Math.abs(lines.find(l=>l.kind==='ASC').distanceKm-10007.557)<.01);
  assert.ok(Math.abs(lines.find(l=>l.kind==='IC').distanceKm-10007.557)<.01,'nearest IC endpoint is a pole');
  const dateline={lines:map.linesFor(12,0,0,'Sun')};
  assert.ok(map.nearestLines(dateline,{latitude:0,longitude:179},['Sun']).find(l=>l.kind==='MC').distanceKm<112);
});
test('empty filters, invalid dates and invalid coordinates fail explicitly',()=>{
  assert.throws(()=>map.calculate(null));assert.throws(()=>map.calculate('not a date'));
  assert.deepEqual(map.nearestLines(map.calculate('2000-01-01'),{latitude:0,longitude:0},[]),[]);
  assert.throws(()=>map.nearestLines(map.calculate('2000-01-01'),{latitude:100,longitude:0}));
  assert.equal(extras.bazi(null).status,'missing');assert.equal(extras.synastry(null,null).status,'missing');
  const edge=natal.calculate({birthday:'1901-01-01',time:'00:30',location:{latitude:35,longitude:139,timeZone:'Asia/Tokyo'}});
  assert.equal(edge.status,'ready');assert.equal(map.calculate(edge.date).lines.length,40);
});
for(const fixture of fixtures.bazi) test(`independent Four Pillars: ${fixture.birthday} ${fixture.time}`,()=>{
  const chart=natal.calculate(fixture);assert.equal(chart.status,'ready');
  const model=extras.bazi(chart);
  assert.deepEqual(model.pillars.map(p=>p.characters),fixture.pillars);
  assert.equal(Object.values(model.phases).reduce((a,b)=>a+b),8);
});
test('Li Chun and Zi hour are distinct from Lunar New Year and midnight',()=>{
  const base={location:{latitude:31.23,longitude:121.47,timeZone:'Asia/Shanghai'}};
  const before=extras.bazi(natal.calculate({...base,birthday:'2024-02-04',time:'14:00'}));
  const after=extras.bazi(natal.calculate({...base,birthday:'2024-02-04',time:'18:00'}));
  assert.equal(before.solarYear,2023);assert.equal(after.solarYear,2024);
  const a=extras.bazi(natal.calculate({...base,birthday:'2024-02-10',time:'22:59'}));
  const b=extras.bazi(natal.calculate({...base,birthday:'2024-02-10',time:'23:00'}));
  const c=extras.bazi(natal.calculate({...base,birthday:'2024-02-11',time:'00:00'}));
  assert.notEqual(a.pillars[2].characters,b.pillars[2].characters);
  assert.equal(b.pillars[2].characters,c.pillars[2].characters);
  assert.equal(b.pillars[3].characters,c.pillars[3].characters);
});
test('cross-chart aspects preserve identities and use shortest arcs and mode-specific orbs',()=>{
  const a=[{name:'Sun',longitude:359}],b=[{name:'Moon',longitude:1}];
  const c=extras.between(a,b,'transit');assert.equal(c.length,1);assert.equal(c[0].orb,2);assert.equal(c[0].a,'Sun');assert.equal(c[0].b,'Moon');
  b[0].longitude=3;assert.equal(extras.between(a,b,'transit').length,0);assert.equal(extras.between(a,b).length,1);
});
test('transits change with the selected day without mutating the birth chart',()=>{
  const chart=natal.calculate({birthday:'1990-07-15',time:'14:30',location:{latitude:40.7,longitude:-74,timeZone:'America/New_York'}});
  const snapshot=JSON.stringify(chart),a=extras.transits(chart,'2026-09-09'),b=extras.transits(chart,'2026-09-10');
  assert.equal(a.status,'ready');assert.equal(a.date,'2026-09-09T12:00:00.000Z');
  assert.notEqual(a.points[1].longitude,b.points[1].longitude);assert.equal(JSON.stringify(chart),snapshot);
  const pair=extras.synastry(chart,chart);assert.equal(pair.contacts.filter(c=>c.a===c.b&&c.type==='Conjunction').length,10);
  assert.ok(pair.overlays.every(p=>p.house>=1&&p.house<=12));
});
