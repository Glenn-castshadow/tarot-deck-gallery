const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../numerology-engine.js');
const B = require('../birthday-insights.js');

test('Life Path matches the published October 22, 1980 example and preserves each component',()=>{
  // Numerology.com worked example: month 1 + day 22 + year 9 = 32 -> 5.
  const b=N.birthday('1980-10-22');
  assert.deepEqual(b.components.map(x=>x.value),[1,22,9]);
  assert.deepEqual(b.path.steps,[32,5]);
  assert.equal(b.birthDay.value,22);assert.equal(b.parts.day,22);
  assert.equal(b.attitude.value,5);
});

test('master numbers are retained in birth profiles but reduced in the separate Lo Shu root',()=>{
  for(const [date,value,root] of [['2000-01-08',11,2],['2000-09-11',22,4],['1993-05-06',33,6]]) {
    const b=N.birthday(date);assert.equal(b.path.value,value);assert.equal(b.path.root,root);assert.equal(b.path.master,true);
    assert.equal(B.numberStudy(B.parseDate(date)).root,root);
  }
  // Whole-date addition would suggest 33; component reduction correctly produces 6 here.
  assert.equal(B.numberStudy(B.parseDate('1988-11-05')).steps[0],33);
  assert.deepEqual(N.birthday('1988-11-05').path.steps,[24,6]);
  assert.deepEqual(N.birthday('2000-02-29').birthDay.steps,[29,11]);
  assert.equal(N.birthday('2000-02-09').attitude.value,2);
});

test('reductions reject invalid numbers and retain a complete reduction trail',()=>{
  assert.deepEqual(N.reduce(1999).steps,[1999,28,10,1]);
  assert.deepEqual(N.reduce(29).steps,[29,11]);
  assert.deepEqual(N.reduce(29,false).steps,[29,11,2]);
  for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>N.reduce(n),RangeError);
});

test('calendar dates reject invalid and overflow dates without shifting leap days',()=>{
  for(const value of ['',null,'2025-02-29','2024-04-31','2024-13-01','0000-01-01','2024-2-01'])assert.equal(N.parseDate(value),null);
  assert.equal(N.birthday('2000-02-29').parts.day,29);
  assert.throws(()=>N.birthday('1900-02-29'),RangeError);
});

test('personal cycles match a published example and change on January 1',()=>{
  // Hans Decoz example: May 5, Personal Year 2021 = 6, April Personal Month = 1.
  const b=N.birthday('1980-05-05'),c=N.cycles(b,'2021-04-12');
  assert.equal(c.year.value,6);assert.equal(c.month.value,1);assert.equal(c.day.value,4);
  assert.equal(N.cycles(b,'2020-12-31').year.value,5);
  assert.equal(N.cycles(b,'2021-01-01').year.value,6);
  const differentBirthYear=N.birthday('1999-05-05');
  assert.deepEqual(N.cycles(differentBirthYear,'2021-04-12'),c);
  assert.throws(()=>N.cycles(b,'1979-12-31'),RangeError);
  assert.throws(()=>N.cycles(b,'2021-02-30'),RangeError);
});

test('nine-year and twelve-month sequences agree with individual calculations and stay single digit',()=>{
  const b=N.birthday('1990-07-15'),c=N.cycles(b,'2026-09-08');
  assert.deepEqual([c.year.value,c.month.value,c.day.value],[5,5,4]);
  assert.deepEqual(c.years.map(x=>x.year),[2022,2023,2024,2025,2026,2027,2028,2029,2030]);
  for(const y of c.years)assert.equal(N.cycleYear(b,y.year).value,y.number);
  for(const m of c.months)assert.equal(N.cycles(b,N.dateKey(2026,m.month,8)).month.value,m.number);
  const masterSum=N.cycles(N.birthday('2000-01-01'),'2025-01-01');
  assert.equal(masterSum.year.value,2);assert.equal(masterSum.year.master,false);
});

test('month/year navigation clamps the day, including leap years and the birth boundary',()=>{
  assert.equal(N.dateInMonth('2024-01-31',2024,2),'2024-02-29');
  assert.equal(N.dateInMonth('2024-02-29',2025,2),'2025-02-28');
  assert.equal(N.dateInMonth('2024-05-31',2024,4),'2024-04-30');
  assert.equal(N.dateInMonth('2000-05-01',2000,2,'2000-02-29'),'2000-02-29');
  assert.equal(N.dateInMonth('2100-12-31',2101,1),'2100-12-31');
  assert.throws(()=>N.dateInMonth('2024-01-01',2024,0),RangeError);
});

test('name numbers use independent letter sums, optional maturity, and whole-name reduction',()=>{
  // JOHN DOE = 1+6+8+5 + 4+6+5 = 35; vowels 17; consonants 18.
  const n=N.nameProfile('John Doe',[],N.birthday('1988-11-05'));
  assert.deepEqual(n.totals,{expression:35,soul:17,personality:18});
  assert.deepEqual([n.expression.value,n.soul.value,n.personality.value,n.maturity.value],[8,8,9,5]);
  assert.equal(N.nameProfile('John Doe').maturity,null);
  // E+F = 5+6 = 11; K+T = 2+2 = 4; full name = 15 -> 6.
  assert.deepEqual(N.nameProfile('EF KT').expression.steps,[15,6]);
  assert.equal(N.nameProfile('EF').expression.value,11);
});

test('each Y can change groups independently while Expression remains unchanged',()=>{
  const a=N.nameProfile('Yvonne Lynn'),b=N.nameProfile('Yvonne Lynn',[7]),c=N.nameProfile('Yvonne Lynn',[0,7]);
  assert.deepEqual(a.ys.map(y=>y.index),[0,7]);
  assert.equal(a.totals.expression,b.totals.expression);assert.equal(b.totals.expression,c.totals.expression);
  assert.equal(b.totals.soul-a.totals.soul,7);assert.equal(c.totals.soul-b.totals.soul,7);
  for(const n of [a,b,c])assert.equal(n.totals.expression,n.totals.soul+n.totals.personality);
  assert.equal(N.nameProfile('BCDF').soul,null);
  assert.equal(N.nameProfile('AEIOU').personality,null);
});

test('name normalization is explicit and unsupported characters do not silently disappear',()=>{
  assert.equal(N.normalizeName('René O’Connor-Straße').normalized,'RENE O CONNOR STRASSE');
  assert.equal(N.normalizeName('Zoë Ægir Łukasz ẞ').normalized,'ZOE AEGIR LUKASZ SS');
  assert.equal(N.nameProfile('René').totals.expression,24);
  for(const raw of ['王小明','Jane2','Jane🙂','<script>','A'.repeat(121)])assert.equal(N.nameProfile(raw).status,'invalid');
  for(const raw of ['', '   ', "--'."])assert.equal(N.nameProfile(raw).status,'empty');
});

test('life arcs: pinnacles and challenges are hand-derived from single-digit components',()=>{
  // 1985-11-29: month 11 -> 2, day 29 -> 11 -> 2, year 1985 -> 23 -> 5. Life Path 11 + 11 + 5 = 27 -> 9.
  const a=N.arcs(N.birthday('1985-11-29'));
  assert.equal(a.birth,'1985-11-29');
  assert.deepEqual(a.components,{month:2,day:2,year:5});
  assert.deepEqual(a.pinnacles.map(p=>p.number.value),[4,7,11,7]);
  assert.equal(a.pinnacles[2].number.master,true,'P3 = P1 + P2 keeps a master result');
  assert.deepEqual(a.challenges.map(c=>c.number),[0,3,3,3]);
  assert.equal(a.firstPeriodEnd,27,'36 minus Life Path root 9');
  assert.deepEqual(a.pinnacles.map(p=>[p.fromAge,p.toAge]),[[0,27],[28,36],[37,45],[46,null]]);
  assert.deepEqual(a.pinnacles.map(p=>[p.fromYear,p.toYear]),[[1985,2012],[2013,2021],[2022,2030],[2031,null]]);
  assert.deepEqual(a.challenges.map(c=>[c.fromAge,c.toAge]),a.pinnacles.map(p=>[p.fromAge,p.toAge]));
  assert.match(a.pinnacles[0].calculation,/month 2 \+ day 2 = 4/);
  assert.match(a.challenges[2].calculation,/Challenge 1 \(0\)/);
  assert.throws(()=>N.arcs(null),RangeError);
  assert.throws(()=>N.arcs({}),RangeError);
});

test('life arcs: the first period ends at 36 minus the Life Path root',()=>{
  assert.equal(N.arcs(N.birthday('1999-01-08')).firstPeriodEnd,35); // Life Path 1
  assert.equal(N.arcs(N.birthday('1985-11-29')).firstPeriodEnd,27); // Life Path 9
  assert.equal(N.arcs(N.birthday('2000-01-08')).firstPeriodEnd,34); // Life Path 11, root 2
  for(const date of ['1980-10-22','2000-02-29','1993-05-06']) {
    const b=N.birthday(date);
    assert.equal(N.arcs(b).firstPeriodEnd,36-b.path.root);
  }
});

test('life arcs: the current period follows the most recent birthday',()=>{
  const a=N.arcs(N.birthday('1985-11-29'));
  assert.equal(N.currentArc(a,'1985-11-28'),-1,'before birth');
  assert.equal(N.currentArc(a,'1985-11-29'),0,'day of birth');
  assert.equal(N.currentArc(a,'2013-11-28'),0,'still 27 the day before the 28th birthday');
  assert.equal(N.currentArc(a,'2013-11-29'),1,'28 on the birthday itself');
  assert.equal(N.currentArc(a,'2022-11-29'),2);
  assert.equal(N.currentArc(a,'2031-11-29'),3);
  assert.equal(N.currentArc(a,'2100-01-01'),3);
  const leap=N.arcs(N.birthday('2000-02-29'));
  assert.equal(N.currentArc(leap,'2001-02-28'),0);
  assert.equal(N.currentArc(leap,'2001-03-01'),0);
  assert.throws(()=>N.currentArc(a,'2013-13-01'),RangeError);
  assert.throws(()=>N.currentArc(a,null),RangeError);
});

test('two paths: concords, same root, pair number and personal-year relation',()=>{
  const nine=N.birthday('1985-11-29'), one=N.birthday('1999-01-08'), eleven=N.birthday('2000-01-08'), four=N.birthday('2000-01-01'), two=N.birthday('2000-09-09');
  assert.equal(nine.path.value,9);assert.equal(one.path.value,1);assert.equal(eleven.path.value,11);assert.equal(four.path.value,4);assert.equal(two.path.value,2);
  const cross=N.pair(nine,one,'2026-06-15');
  assert.deepEqual(cross.concord,{a:'expressive',b:'mind',same:false});
  assert.equal(cross.sameRoot,false);
  assert.equal(cross.pairNumber.value,1,'9 + 1 = 10 -> 1');
  assert.equal(cross.a.year.value,5,'11 + 29 + 2026 = 2066 -> 14 -> 5');
  assert.equal(cross.b.year.value,1,'1 + 8 + 2026 = 2035 -> 10 -> 1');
  assert.equal(cross.yearRelation,'apart');
  const masterByRoot=N.pair(eleven,four,'2026-06-15');
  assert.deepEqual(masterByRoot.concord,{a:'practical',b:'practical',same:true},'11 is placed by its root 2');
  assert.equal(masterByRoot.sameRoot,false);
  const same=N.pair(eleven,two,'2026-06-15');
  assert.equal(same.sameRoot,true,'11 (root 2) and 2 share a root');
  assert.equal(same.pairNumber.value,4,'11 + 2 = 13 -> 4');
  const masterPair=N.pair(nine,two,'2026-06-15');
  assert.equal(masterPair.pairNumber.value,11,'9 + 2 = 11 stays a master');
  assert.equal(masterPair.pairNumber.master,true);
  assert.equal(N.pair(nine,N.birthday('1990-11-29'),'2026-06-15').yearRelation,'same');
  assert.equal(N.pair(nine,N.birthday('1985-11-30'),'2026-06-15').yearRelation,'adjacent');
  assert.equal(N.pair(one,N.birthday('2000-01-07'),'2026-06-15').yearRelation,'adjacent','Personal Years 1 and 9 wrap');
  assert.throws(()=>N.pair(nine,null,'2026-06-15'),RangeError);
  assert.throws(()=>N.pair(nine,one,'2026-02-30'),RangeError);
});
