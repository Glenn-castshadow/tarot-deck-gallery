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
