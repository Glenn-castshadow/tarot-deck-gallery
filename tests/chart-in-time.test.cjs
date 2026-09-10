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
