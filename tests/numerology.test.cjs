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
