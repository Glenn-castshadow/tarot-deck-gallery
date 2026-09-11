const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../chart-in-time-engine.js');
const natal=require('../natal-engine.js');
const astro=require('../vendor/astronomy-engine/astronomy.js');

const BIRTH={birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
const chart=natal.calculate(BIRTH);
const LONDON={latitude:51.5085,longitude:-0.1257,timeZone:'Europe/London',label:'London, United Kingdom'};
const lonOf=(body,date)=>astro.Ecliptic(astro.GeoVector(body,date,true)).elon;

test('a solar return puts the Sun back on its natal longitude',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Sun',new Date(result.moment)),natalSun))<1e-6);
});

test('the returned solar moment agrees with Astronomy Engine SearchSunLongitude',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  const independent=astro.SearchSunLongitude(natalSun,new Date(+new Date(result.moment)-3*86400000),6);
  // SearchSunLongitude goes through SunPosition, which applies a fixed 1-AU light-time
  // correction; the engine (like natal-engine.js) uses GeoVector, which iterates light
  // time to convergence. The two differ by up to ~8.6s of solar motion, scaling with
  // Earth-Sun distance and vanishing exactly at 1 AU. This chart's July birthday sits
  // near aphelion, so the gap is close to that maximum. A real solver bug would be out
  // by minutes, hours, or a whole return period -- not by seconds.
  const gapSeconds=Math.abs(+independent.date-+new Date(result.moment))/1000;
  assert.ok(gapSeconds<15,`independent search agreed within ${gapSeconds.toFixed(2)}s`);
  // Pin the cause: repeating the search with SunPosition reproduces SearchSunLongitude
  // exactly, which proves the gap is the ephemeris path and not the bracket/Newton logic.
  const viaSunPosition=astro.Search(t=>natal.delta(astro.SunPosition(t).elon,natalSun),
    astro.MakeTime(new Date(+independent.date-3600000)),astro.MakeTime(new Date(+independent.date+3600000)),
    {dt_tolerance_seconds:0.01});
  assert.ok(Math.abs(+viaSunPosition.date-+independent.date)<1000,'SunPosition path reproduces SearchSunLongitude');
});

test('the governing solar return is the last one at or before the reference date',()=>{
  const reference=new Date('2024-03-01T00:00:00Z');
  const current=engine.returnChart({chart,kind:'solar',location:chart.location,reference});
  const next=engine.returnChart({chart,kind:'solar',location:chart.location,reference,index:1});
  assert.ok(+new Date(current.moment)<=+reference);
  assert.ok(+new Date(next.moment)>+reference);
  assert.equal(current.chart.date.slice(0,4),'2023');
});

test('a lunar return puts the Moon back on its natal longitude',()=>{
  const result=engine.returnChart({chart,kind:'lunar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalMoon=chart.points.find(p=>p.name==='Moon').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Moon',new Date(result.moment)),natalMoon))<1e-6);
});

test('lunar returns are monotonic, ~27.32 days apart, 13 or 14 per calendar year',()=>{
  const reference=new Date('2024-01-01T00:00:00Z');
  const moments=[];
  for(let i=0;i<15;i++) {
    const result=engine.returnChart({chart,kind:'lunar',location:chart.location,reference,index:i});
    assert.equal(result.status,'ready');
    moments.push(+new Date(result.moment));
  }
  for(let i=1;i<moments.length;i++) {
    assert.ok(moments[i]>moments[i-1],'monotonic');
    const gapDays=(moments[i]-moments[i-1])/86400000;
    assert.ok(gapDays>27 && gapDays<27.7,`gap ${gapDays}`);
  }
  const within=moments.filter(ms=>new Date(ms).getUTCFullYear()===2024).length;
  assert.ok(within===13 || within===14,`${within} returns in 2024`);
});

test('relocating a return moves the angles and leaves the planets alone',()=>{
  const reference=new Date('2024-03-01T00:00:00Z');
  const home=engine.returnChart({chart,kind:'solar',location:chart.location,reference});
  const away=engine.returnChart({chart,kind:'solar',location:LONDON,reference});
  assert.equal(home.moment,away.moment,'the instant does not depend on the observer');
  assert.deepEqual(home.chart.points.map(p=>p.longitude),away.chart.points.map(p=>p.longitude));
  assert.ok(Math.abs(natal.delta(home.chart.angles.asc,away.chart.angles.asc))>1);
});

test('a 29 February birth resolves returns in common years',()=>{
  const leap=natal.calculate({...BIRTH,birthday:'1992-02-29'});
  const result=engine.returnChart({chart:leap,kind:'solar',location:leap.location,reference:new Date('2023-06-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalSun=leap.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Sun',new Date(result.moment)),natalSun))<1e-6);
});

test('returns outside 1901-2100 and charts without a birth time do not invent answers',()=>{
  assert.equal(engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z'),index:200}).status,'error');
  assert.equal(engine.returnChart({chart:natal.calculate({...BIRTH,time:''}),kind:'solar',location:chart.location}).status,'missing');
  assert.equal(engine.returnChart({chart,kind:'quarterly',location:chart.location}).status,'error');
});

test('a return before the birth date is refused rather than extrapolated',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('1991-01-01T00:00:00Z'),index:-5});
  assert.equal(result.status,'error');
});

test('the convergence gate does not reject a valid lunar return',()=>{
  // Search converges on time (0.01s), which at the Moon's speed is ~1.5e-6 deg -- larger
  // than a 1e-6 deg residual gate allows. This reference previously returned 'error' for
  // a return that genuinely exists at 2061-10-28T05:43:10.848Z.
  const result=engine.returnChart({chart,kind:'lunar',location:chart.location,reference:new Date('2061-11-23T00:21:04.426Z')});
  assert.equal(result.status,'ready');
  const natalMoon=chart.points.find(p=>p.name==='Moon').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Moon',new Date(result.moment)),natalMoon))<1e-5,'Moon returned to its natal longitude');
});

test('an absurd return index errors rather than throwing',()=>{
  assert.equal(engine.returnChart({chart,kind:'lunar',location:chart.location,index:1e9}).status,'error');
  assert.equal(engine.returnChart({chart,kind:'solar',location:chart.location,index:-1e9}).status,'error');
});

test('a secondary progressed chart at the birth date reproduces the natal chart',()=>{
  // targetDate resolves to noon UTC, ~6.5h from this 18:30 UTC birth instant.
  // Divided by the tropical year that is ~64 seconds of ephemeris offset, so the
  // chart should be the natal chart to within a minute of the Moon's motion.
  const result=engine.progressedChart({chart,targetDate:chart.birthday,method:'secondary'});
  assert.equal(result.status,'ready');
  const offsetSeconds=Math.abs(+new Date(result.progressedInstant)-+new Date(chart.date))/1000;
  assert.ok(offsetSeconds<120,`offset ${offsetSeconds}s`);
  chart.points.forEach((point,index)=>{
    assert.ok(Math.abs(natal.delta(result.points[index].longitude,point.longitude))<0.02,point.name);
  });
  assert.ok(Math.abs(natal.delta(result.angles.asc,chart.angles.asc))<0.6,'ascendant');
});

test('secondary progressions advance one day of ephemeris per tropical year',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const elapsedDays=(+new Date('2020-07-15T12:00:00Z')-+new Date(chart.date))/86400000;
  const expected=+new Date(chart.date)+(elapsedDays/engine.TROPICAL_YEAR)*86400000;
  assert.ok(Math.abs(+new Date(result.progressedInstant)-expected)<1000);
});

test('tertiary progressions use the sidereal lunar month, not the synodic one',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'tertiary'});
  const elapsedDays=(+new Date('2020-07-15T12:00:00Z')-+new Date(chart.date))/86400000;
  const sidereal=+new Date(chart.date)+(elapsedDays/27.321582)*86400000;
  const synodic=+new Date(chart.date)+(elapsedDays/29.530589)*86400000;
  assert.ok(Math.abs(+new Date(result.progressedInstant)-sidereal)<1000);
  assert.ok(Math.abs(+new Date(result.progressedInstant)-synodic)>86400000);
});

test('the solar arc equals the secondary progressed Sun minus the natal Sun',()=>{
  const secondary=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const arcChart=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  const progressedSun=secondary.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(arcChart.arc-natal.mod(progressedSun-natalSun))<1e-9);
  // ~30 years of life is ~30 degrees of arc; mod() not delta(), so it never wraps at 180.
  assert.ok(arcChart.arc>28 && arcChart.arc<32,`arc ${arcChart.arc}`);
});

test('solar arc advances every natal point and angle by the same arc',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  chart.points.forEach((point,index)=>{
    assert.ok(Math.abs(natal.delta(result.points[index].longitude,point.longitude+result.arc))<1e-9,point.name);
  });
  assert.ok(Math.abs(natal.delta(result.angles.asc,chart.angles.asc+result.arc))<1e-9);
});

test('the progressed lunation phase reads from the progressed Sun and Moon',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const sun=result.points.find(p=>p.name==='Sun').longitude;
  const moon=result.points.find(p=>p.name==='Moon').longitude;
  assert.equal(result.lunation.angle,natal.mod(moon-sun));
  assert.equal(result.lunation.index,Math.floor(natal.mod(moon-sun)/45));
  assert.equal(result.lunation.name,['New','Crescent','First Quarter','Gibbous','Full','Disseminating','Last Quarter','Balsamic'][result.lunation.index],'name matches index');
});

test('progression contacts use tight orbs',()=>{
  const secondary=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const arcChart=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  assert.ok(secondary.contacts.length>0,'secondary produced contacts to check');
  assert.ok(arcChart.contacts.length>0,'solar arc produced contacts to check');
  assert.ok(secondary.contacts.every(c=>c.orb<=2));
  assert.ok(arcChart.contacts.every(c=>c.orb<=1));
});

test('progressions reject bad input without inventing a chart',()=>{
  assert.equal(engine.progressedChart({chart,targetDate:'2020-07-15',method:'quinary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'not-a-date',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'2101-01-01',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'2020-02-30',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart:natal.calculate({...BIRTH,time:''}),targetDate:'2020-07-15'}).status,'missing');
});

test('a target before the birth date is refused on every method',()=>{
  // Converse directions are out of scope. Unguarded, secondary returned 'ready' with
  // elapsedDays -14805.3, and solar arc reported arc 321.31 -- a -38.7 degree arc that
  // mod() had wrapped into a figure indistinguishable from a real one.
  for(const method of ['secondary','tertiary','solar-arc']) {
    const result=engine.progressedChart({chart,targetDate:'1950-01-01',method});
    assert.equal(result.status,'error',method);
    assert.equal(result.message,'Choose a date on or after the birth date.',method);
    assert.equal(result.arc,undefined,`${method} reports no arc`);
  }
  // The boundary is the birth CALENDAR date, not the birth instant: this 14:30 New York
  // birth is 18:30 UTC, so its own birth date resolves to a noon-UTC target six hours
  // earlier. That chart must stay reachable -- it is the natal chart.
  assert.equal(engine.progressedChart({chart,targetDate:'1990-07-14',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'1990-07-15',method:'secondary'}).status,'ready');
  assert.ok(engine.progressedChart({chart,targetDate:'1990-07-15',method:'secondary'}).elapsedDays<0,'the birth date is reachable despite a negative elapsed');
});

test('progressed cusps and angles agree, except for solar arc where they deliberately do not',()=>{
  // Secondary and tertiary cast a whole chart at the progressed instant, so its first
  // cusp IS its Ascendant. Solar arc directs the angles but keeps the natal cusps, so a
  // directed point is reported in the natal house its new longitude falls into. That
  // mismatch is the documented convention, not a defect -- pin it so it stays deliberate.
  for(const method of ['secondary','tertiary']) {
    const result=engine.progressedChart({chart,targetDate:'2020-07-15',method});
    assert.equal(result.status,'ready',method);
    assert.ok(Math.abs(natal.delta(result.cusps[0],result.angles.asc))<1e-9,`${method} cusps[0] is its own ascendant`);
    assert.ok(Math.abs(natal.delta(result.cusps[0],chart.cusps[0]))>1e-6,`${method} cusps moved off the natal cusps`);
  }
  const directed=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  assert.equal(directed.status,'ready');
  assert.deepEqual(directed.cusps,chart.cusps,'solar arc keeps the natal cusps');
  assert.ok(Math.abs(natal.delta(directed.angles.asc,natal.mod(chart.angles.asc+directed.arc)))<1e-9,'solar arc directs the ascendant');
  assert.ok(Math.abs(natal.delta(directed.angles.asc,directed.cusps[0])-directed.arc)<1e-9,'angles.asc leads cusps[0] by exactly the arc');
});

test('the solar arc accumulates past 180 degrees without wrapping',()=>{
  // mod(), not delta(): near the top of the supported range the accumulated arc exceeds
  // 180 degrees and delta() would wrap it negative (195.2197 vs -164.7803). Every other
  // progression test sits near 30 degrees, where the two agree and this cannot be caught.
  const old=natal.calculate({birthday:'1901-06-01',time:'12:00',location:BIRTH.location});
  assert.equal(old.status,'ready');
  const directed=engine.progressedChart({chart:old,targetDate:'2100-12-31',method:'solar-arc'});
  assert.equal(directed.status,'ready');
  assert.ok(directed.arc>180,`arc ${directed.arc} must exceed 180`);
  const secondary=engine.progressedChart({chart:old,targetDate:'2100-12-31',method:'secondary'});
  const natalSun=old.points.find(p=>p.name==='Sun').longitude;
  const progressedSun=secondary.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(directed.arc-natal.mod(progressedSun-natalSun))<1e-9,'arc matches mod(), not delta()');
});

const swissReference=require('./fixtures/chart-in-time-reference.json');

for(const fixture of swissReference.cases) test(`independent ephemeris: ${fixture.id}`,()=>{
  const birth=natal.calculate(fixture.input);
  assert.equal(birth.status,'ready');
  const result=engine.returnChart({chart:birth,kind:fixture.kind,location:birth.location,reference:new Date(`${fixture.reference}T00:00:00Z`)});
  assert.equal(result.status,'ready');
  const drift=Math.abs(+new Date(result.moment)-+new Date(fixture.moment));
  // 15s reflects inter-ephemeris disagreement between Astronomy Engine and Swiss Moshier
  // mode, not solver precision; a wrong crossing would be off by a month or a year.
  assert.ok(drift<15000,`${fixture.id} moment drifted ${drift}ms`);
  for(const [name,longitude] of Object.entries(fixture.chartLongitudes)) {
    const point=result.chart.points.find(p=>p.name===name);
    assert.ok(Math.abs(natal.delta(point.longitude,longitude))<0.03,`${fixture.id} ${name}`);
  }
});
