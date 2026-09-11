const test = require('node:test');
const assert = require('node:assert/strict');
const extras = require('../celestial-extras-engine.js');
const natal = require('../natal-engine.js');

const shanghai = {latitude:31.23, longitude:121.47, timeZone:'Asia/Shanghai'};
const chartFor = (birthday, time) => natal.calculate({birthday, time, location: shanghai});

test('hidden stems follow the traditional table for all twelve branches',()=>{
  // Branch order 子丑寅卯辰巳午未申酉戌亥; stems 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9.
  assert.deepEqual(extras.hiddenStems,[[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,6,4],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]]);
});

test('ten gods are derived from phase relation and polarity for every stem pair',()=>{
  const phase=i=>['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'][i];
  const order=['Wood','Fire','Earth','Metal','Water'];
  const table=[['friend','robWealth'],['eatingGod','hurtingOfficer'],['indirectWealth','directWealth'],['sevenKillings','directOfficer'],['indirectResource','directResource']];
  for(let dm=0;dm<10;dm++) for(let s=0;s<10;s++) {
    const relation=((order.indexOf(phase(s))-order.indexOf(phase(dm)))%5+5)%5;
    assert.equal(extras.tenGod(dm,s),table[relation][dm%2===s%2?0:1],`day master ${dm}, stem ${s}`);
  }
  // Spot checks by hand: Day Master 甲 (0): 甲 friend, 乙 rob wealth, 丙 eating god, 丁 hurting officer, 戊 indirect wealth, 己 direct wealth, 庚 seven killings, 辛 direct officer, 壬 indirect resource, 癸 direct resource.
  assert.deepEqual([0,1,2,3,4,5,6,7,8,9].map(s=>extras.tenGod(0,s)),['friend','robWealth','eatingGod','hurtingOfficer','indirectWealth','directWealth','sevenKillings','directOfficer','indirectResource','directResource']);
  assert.equal(extras.tenGod(9,0),'hurtingOfficer','癸 water produces 甲 wood; opposite polarity');
  assert.throws(()=>extras.tenGod(10,0),RangeError);
  assert.throws(()=>extras.tenGod(0,-1),RangeError);
  assert.equal(Object.keys(extras.gods).length,10);
  assert.equal(extras.gods.sevenKillings.hanzi,'七殺');
});

test('bazi reports hidden stems, gods and a hidden-stem phase count',()=>{
  // Fixture 1902-02-03 12:00 Shanghai: pillars 辛丑 辛丑 丁巳 丙午 (from tests/fixtures/atlas-reference.json).
  const model=extras.bazi(chartFor('1902-02-03','12:00'));
  assert.equal(model.status,'ready');
  assert.equal(model.dayStemIndex,3,'丁');
  assert.deepEqual(model.hidden,[[5,9,7],[5,9,7],[2,6,4],[3,5]]);
  // Day Master 丁 (3, Fire, yin). 辛 (7, Metal, yin): Fire controls Metal, opposite polarity? 3 odd, 7 odd → same polarity → indirectWealth.
  assert.deepEqual(model.gods.stems,['indirectWealth','indirectWealth',null,'robWealth']);
  // Hidden 己(5 Earth yin): Fire produces Earth, same polarity → eatingGod. 癸(9 Water yin): controls Fire, same polarity → sevenKillings. 辛 → indirectWealth.
  assert.deepEqual(model.gods.hidden[0],['eatingGod','sevenKillings','indirectWealth']);
  assert.deepEqual(model.gods.hidden[2],['robWealth','directWealth','hurtingOfficer'],'丙 rob wealth, 庚 direct wealth, 戊 hurting officer');
  assert.equal(model.hiddenTotal,4+3+3+3+2);
  assert.equal(Object.values(model.phasesHidden).reduce((a,b)=>a+b),model.hiddenTotal);
  assert.deepEqual(model.phasesHidden,{Wood:0,Fire:4,Earth:4,Metal:5,Water:2});
  assert.equal(model.yangYear,false,'辛 is yin');
  // Existing fields unchanged.
  assert.deepEqual(model.pillars.map(p=>p.characters),['辛丑','辛丑','丁巳','丙午']);
  assert.equal(Object.values(model.phases).reduce((a,b)=>a+b),8);
});

const reference = require('./fixtures/bazi-reference.json');
const stemIndex = hanzi => '甲乙丙丁戊己庚辛壬癸'.indexOf(hanzi);

for (const c of reference.cases) test(`lunar_python reference: hidden stems and ten gods for ${c.birthday} ${c.time}`,()=>{
  const model=extras.bazi(chartFor(c.birthday,c.time));
  assert.equal(model.status,'ready');
  assert.deepEqual(model.pillars.map(p=>p.characters),c.pillars);
  assert.deepEqual(model.hidden,c.hidden.map(list=>list.map(stemIndex)));
  assert.deepEqual(model.gods.stems,c.godsStems);
  assert.deepEqual(model.gods.hidden,c.godsHidden);
});

test('jie boundaries bracket a birth instant at 30-degree solar-longitude steps',()=>{
  const chart=chartFor('2024-03-05','08:00');
  const next=extras.jieBoundary(new Date(chart.date),'forward'), prev=extras.jieBoundary(new Date(chart.date),'backward');
  assert.equal(next.longitude,345,'Jingzhe: Sun at 345°');
  assert.equal(prev.longitude,315,'Li Chun');
  assert.ok(prev.date<new Date(chart.date)&&new Date(chart.date)<next.date);
  assert.ok(Math.abs(next.date-new Date('2024-03-05T02:22:00Z'))<15*60*1000,'Jingzhe 2024 is 10:22 CST, within 15 minutes');
  assert.throws(()=>extras.jieBoundary(new Date('nope'),'forward'));
});

for (const c of reference.cases) for (const sex of ['male','female']) test(`lunar_python reference: luck pillars for ${c.birthday} ${c.time} (${sex})`,()=>{
  const model=extras.luckPillars(chartFor(c.birthday,c.time),sex), ref=c.yun[sex];
  assert.equal(model.status,'ready');
  assert.equal(model.direction,ref.forward?'forward':'backward');
  assert.deepEqual(model.pillars.slice(0,5).map(p=>p.characters),ref.pillars);
  // Start age: lunar_python floors years, months and days from the same 3-days-per-year rule. The two ephemerides
  // place the Jie instant minutes apart, so allow one month of difference in the total.
  const ours=model.startAge.years*12+model.startAge.months, theirs=ref.startYears*12+ref.startMonths;
  assert.ok(Math.abs(ours-theirs)<=1,`start ${ours} vs ${theirs} months`);
  assert.equal(model.pillars[0].fromAge,model.startAge.years);
  assert.equal(model.pillars[4].fromAge,model.startAge.years+40);
  assert.equal(model.pillars[0].fromYear,Number(c.birthday.slice(0,4))+model.startAge.years);
  assert.equal(model.pillars.length,10);
});

test('luck pillars need a ready chart and a counting choice',()=>{
  assert.equal(extras.luckPillars(null,'male').status,'missing');
  assert.throws(()=>extras.luckPillars(chartFor('1990-07-15','14:30'),'other'),RangeError);
  const m=extras.luckPillars(chartFor('1990-07-15','14:30'),'male'), f=extras.luckPillars(chartFor('1990-07-15','14:30'),'female');
  assert.notEqual(m.direction,f.direction,'the two sexes count in opposite directions for the same chart');
  assert.ok(m.pillars.every(p=>typeof p.god==='string'));
});
