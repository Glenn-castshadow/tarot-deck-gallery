const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../natal-engine.js');
const reference=require('./fixtures/natal-reference.json');

for(const fixture of reference.cases) test(`independent ephemeris: ${fixture.id}`,()=>{
  const chart=engine.calculate(fixture.input);
  assert.equal(chart.status,'ready');
  assert.equal(+new Date(chart.date),+new Date(fixture.utc));
  assert.equal(chart.houseSystem,fixture.houseSystem);
  assert.ok(Math.abs(engine.delta(chart.angles.asc,fixture.asc))<0.01,'ascendant');
  assert.ok(Math.abs(engine.delta(chart.angles.mc,fixture.mc))<0.01,'midheaven');
  chart.cusps.forEach((cusp,index)=>assert.ok(Math.abs(engine.delta(cusp,fixture.cusps[index]))<0.01,`house ${index+1}`));
  for(const point of chart.points.filter(point=>point.kind==='planet')) {
    assert.ok(Math.abs(engine.delta(point.longitude,fixture.points[point.name].longitude))<0.03,point.name);
    assert.ok(point.house>=1 && point.house<=12,`${point.name} house`);
    if(Math.abs(fixture.points[point.name].speed)>0.01) assert.equal(point.retrograde,fixture.points[point.name].speed<0,`${point.name} motion`);
  }
});

test('historical civil time handles missing and repeated DST clock times explicitly',()=>{
  assert.deepEqual(engine.localTimeCandidates('2024-03-10','02:30','America/New_York'),[]);
  const repeated=engine.localTimeCandidates('2024-11-03','01:30','America/New_York');
  assert.deepEqual(repeated.map(item=>item.utc.toISOString()),['2024-11-03T05:30:00.000Z','2024-11-03T06:30:00.000Z']);
  const input={birthday:'2024-11-03',time:'01:30',location:{latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}};
  assert.equal(engine.calculate(input).status,'ambiguous');
  assert.equal(engine.calculate({...input,fold:'later'}).date,'2024-11-03T06:30:00.000Z');
});

test('missing, invalid and out-of-range inputs do not invent angles',()=>{
  assert.equal(engine.calculate({birthday:'2000-01-01',time:''}).status,'missing');
  assert.equal(engine.calculate({birthday:'2000-01-01',time:'12:00'}).status,'missing');
  assert.throws(()=>engine.localTimeCandidates('2023-02-29','12:00','UTC'));
  assert.throws(()=>engine.localTimeCandidates('1800-01-01','12:00','UTC'));
  assert.throws(()=>engine.localTimeCandidates('2000-01-01','12:00','not/a-zone'));
});

test('Whole Sign and Equal houses preserve the ascendant while using different cusps',()=>{
  const input=reference.cases[0].input;
  const whole=engine.calculate({...input,houseSystem:'whole-sign'}),equal=engine.calculate({...input,houseSystem:'equal'});
  assert.equal(whole.cusps[0],Math.floor(whole.angles.asc/30)*30);
  assert.equal(equal.cusps[0],equal.angles.asc);
  assert.equal(whole.angles.asc,equal.angles.asc);
  assert.equal(engine.houseFor(359,[0,30,60,90,120,150,180,210,240,270,300,330]),12);
  assert.equal(engine.houseFor(0,[0,30,60,90,120,150,180,210,240,270,300,330]),1);
});

test('aspects use shortest separation across Aries and respect orb settings',()=>{
  const points=[{name:'A',longitude:359,speed:1},{name:'B',longitude:1,speed:0},{name:'C',longitude:95,speed:0}];
  const aspects=engine.aspectsFor(points);
  assert.equal(aspects.find(a=>a.a==='A'&&a.b==='B').orb,2);
  assert.equal(aspects.find(a=>a.a==='A'&&a.b==='B').applying,true);
  assert.ok(aspects.some(a=>a.type==='Square'));
  assert.ok(engine.aspectsFor(points,0.5).length<aspects.length);
});

test('chartAtInstant reproduces calculate for the same resolved instant',()=>{
  const fixture=reference.cases[1];
  const viaCalculate=engine.calculate(fixture.input);
  const viaInstant=engine.chartAtInstant(new Date(viaCalculate.date),fixture.input.location,{houseSystem:viaCalculate.houseSystem,orbScale:1});
  assert.equal(viaInstant.status,'ready');
  assert.equal(viaInstant.angles.asc,viaCalculate.angles.asc);
  assert.equal(viaInstant.angles.mc,viaCalculate.angles.mc);
  assert.deepEqual(viaInstant.cusps,viaCalculate.cusps);
  assert.deepEqual(viaInstant.points.map(p=>p.longitude),viaCalculate.points.map(p=>p.longitude));
});

test('chartAtInstant keeps sub-minute precision that a HH:MM round trip would lose',()=>{
  const location=reference.cases[1].input.location;
  const base=new Date('2024-01-15T14:30:00Z');
  const shifted=new Date('2024-01-15T14:30:45Z');
  const a=engine.chartAtInstant(base,location),b=engine.chartAtInstant(shifted,location);
  assert.ok(Math.abs(engine.delta(a.angles.asc,b.angles.asc))>0.1,'45 seconds must move the ascendant');
});

test('chartAtInstant rejects invalid and out-of-range instants without inventing angles',()=>{
  const location=reference.cases[1].input.location;
  assert.equal(engine.chartAtInstant(new Date('nope'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('1900-12-30T00:00:00Z'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('2101-01-03T00:00:00Z'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('2000-01-01T00:00:00Z'),null).status,'missing');
});

test('chartAtInstant accepts the real Tokyo instant inside the lower-bound slack',()=>{
  const location=reference.cases[1].input.location;
  assert.equal(engine.chartAtInstant(new Date('1900-12-31T15:30:00Z'),location).status,'ready');
});

test('chartAtInstant accepts an instant inside the upper-bound slack',()=>{
  const location=reference.cases[1].input.location;
  assert.equal(engine.chartAtInstant(new Date('2101-01-01T10:59:00Z'),location).status,'ready');
});

test('regiomontanus cusps: angles recovered, opposites hold, span is 360, polar returns null',()=>{
  const angles=engine.anglesAt(new Date('2024-03-15T10:20:00Z'),51.5085,-0.1257);
  const cusps=engine.houseCusps(angles,51.5085,'regiomontanus');
  assert.equal(cusps.length,12);
  assert.ok(Math.abs(engine.delta(cusps[0],angles.asc))<1e-9,'cusp 1 is the Ascendant');
  assert.ok(Math.abs(engine.delta(cusps[9],angles.mc))<1e-9,'cusp 10 is the Midheaven');
  for(let i=0;i<6;i++) assert.ok(Math.abs(engine.delta(cusps[i+6],cusps[i]+180))<1e-9,`cusp ${i+7} opposes ${i+1}`);
  const span=cusps.reduce((s,v,i)=>s+engine.mod(cusps[(i+1)%12]-v),0);
  assert.ok(Math.abs(span-360)<1e-6);
  // Successive cusps advance in zodiacal order.
  for(let i=0;i<12;i++) assert.ok(engine.mod(cusps[(i+1)%12]-cusps[i])<180,`cusp ${i+1} precedes ${i+2}`);
  // At the equator Regiomontanus equals the equal-RA division: cusp 11 sits 30° of RA past the MC.
  const eq=engine.anglesAt(new Date('2024-03-15T10:20:00Z'),0,0), eqCusps=engine.houseCusps(eq,0,'regiomontanus');
  const raOf=l=>engine.mod(Math.atan2(Math.sin(l*Math.PI/180)*Math.cos(eq.obliquity*Math.PI/180),Math.cos(l*Math.PI/180))*180/Math.PI);
  assert.ok(Math.abs(engine.delta(raOf(eqCusps[10]),eq.ramc+30))<1e-6,'equatorial 11th cusp');
  assert.equal(engine.houseCusps(engine.anglesAt(new Date('2024-06-21T12:00:00Z'),70,20),70,'regiomontanus')!==null,true,'defined at 70°N');
  // Regiomontanus stays defined inside the polar circle, unlike Placidus: 88°N still yields a full,
  // correctly ordered 360° cycle of cusps.
  const polarCusps=engine.houseCusps(engine.anglesAt(new Date('2024-06-21T12:00:00Z'),88,20),88,'regiomontanus');
  assert.notEqual(polarCusps,null,'defined at 88°N, inside the polar circle');
  const polarSpan=polarCusps.reduce((s,v,i)=>s+engine.mod(polarCusps[(i+1)%12]-v),0);
  assert.ok(Math.abs(polarSpan-360)<1e-6,'88°N cusps still span 360°');
  for(let i=0;i<12;i++) assert.ok(engine.mod(polarCusps[(i+1)%12]-polarCusps[i])<180,`88°N cusp ${i+1} precedes ${i+2}`);
  assert.equal(engine.houseCusps(engine.anglesAt(new Date('2024-06-21T12:00:00Z'),90,20),90,'regiomontanus'),null,'undefined only at the pole itself');
  const chart=engine.chartAtInstant(new Date('2024-03-15T10:20:00Z'),{latitude:51.5085,longitude:-0.1257,timeZone:'Europe/London'},{houseSystem:'regiomontanus'});
  assert.equal(chart.houseSystem,'regiomontanus');
  assert.equal(engine.calculate({birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York'},houseSystem:'regiomontanus'}).houseSystem,'regiomontanus');
});
