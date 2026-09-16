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
  // 2000-02-29 has Life Path 6, so the first period ends at age 30 (36 - 6): the boundary
  // falls in 2030/2031, not 2001, where both dates sit inside period 0 regardless. 2031 is
  // not a leap year, so the Feb 29 birthday advances to March 1 and age turns over there.
  const leap=N.arcs(N.birthday('2000-02-29'));
  assert.equal(N.currentArc(leap,'2031-02-28'),0);
  assert.equal(N.currentArc(leap,'2031-03-01'),1);
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

test('chaldean names: the Cheiro table, per-word compounds and no master numbers',()=>{
  const alphabet=N.nameProfile('ABCDEFGHIJKLM NOPQRSTUVWXYZ',[],null,'chaldean');
  assert.equal(alphabet.status,'ready');assert.equal(alphabet.system,'chaldean');
  assert.equal(alphabet.compound,103,'A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7');
  assert.deepEqual(alphabet.reading,{compound:103,root:4,readAs:4},'103 -> 4 is not a compound in 10–52, so it reads as the single digit');
  assert.equal(alphabet.letters.find(x=>x.letter==='F').value,8);
  assert.equal(alphabet.letters.find(x=>x.letter==='Y').value,1);
  assert.ok(alphabet.letters.every(x=>x.value!==9),'no Chaldean letter is 9');
  const john=N.nameProfile('John Smith',[],null,'chaldean');
  assert.deepEqual(john.words.map(w=>[w.word,w.compound,w.root]),[['JOHN',18,9],['SMITH',17,8]]);
  assert.deepEqual(john.reading,{compound:35,root:8,readAs:35});
  const eleven=N.nameProfile('AAAAAAAAAAA',[],null,'chaldean');
  assert.deepEqual(eleven.reading,{compound:11,root:2,readAs:11});
  assert.equal('master' in eleven.reading,false);
  assert.deepEqual(N.nameProfile('KI',[],null,'chaldean').reading,{compound:3,root:3,readAs:3});
  assert.deepEqual(N.nameProfile('ZZZZZZZZZZ',[],null,'chaldean').reading,{compound:70,root:7,readAs:7},'70 -> 7 reads as a single digit');
  assert.deepEqual(N.nameProfile('ZZZZZZZZZZZZZZ',[],null,'chaldean').reading,{compound:98,root:8,readAs:17},'98 -> 17 reads as compound 17');
  assert.equal(N.nameProfile('René',[],null,'chaldean').normalized,'RENE');
  assert.equal(N.nameProfile('王小明',[],null,'chaldean').status,'invalid');
  assert.equal(N.nameProfile('',[],null,'chaldean').status,'empty');
  assert.throws(()=>N.nameProfile('Jane',[],null,'kabbalah'),RangeError);
  for(const n of [0,-3,1.5,NaN]) assert.throws(()=>N.compoundReading(n),RangeError);
  assert.deepEqual(N.compoundReading(52),{compound:52,root:7,readAs:52});
  assert.deepEqual(N.compoundReading(53),{compound:53,root:8,readAs:8});
  // The Pythagorean shape is unchanged.
  const p=N.nameProfile('John Smith');
  assert.equal(p.system,undefined);assert.equal(p.totals.expression,44,'J1 O6 H8 N5 + S1 M4 I9 T2 H8 = 44 (the brief\'s worked value of 49 is an arithmetic error)');
});

test('chaldean compound copy, life-arc, challenge and relating copy are complete and free of banned language',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','numerology.js'),'utf8');
  const banned=/you will|luck|fortune|warning|danger|death|illness|wealth will/i;
  const slice=name=>{const start=source.indexOf(`const ${name}`);return source.slice(start,source.indexOf('};',start)+2);};

  const compoundBlock=slice('compoundCopy');
  for(let n=10;n<=52;n++) assert.match(compoundBlock,new RegExp(`\\n\\s*${n}:\\{title:`),`compound ${n} present`);
  assert.doesNotMatch(compoundBlock,banned);
  assert.equal((compoundBlock.match(/prompt:'[^']*\?'/g)||[]).length,43,'every compound entry ends its prompt with a question mark');

  // arcLens values are plain strings, not objects: '<n>:\'...'', not '<n>:{title:...'.
  const arcLensBlock=slice('arcLens');
  for(const n of [1,2,3,4,5,6,7,8,9,11,22,33]) assert.match(arcLensBlock,new RegExp(`\\n\\s*${n}:'`),`arcLens ${n} present`);
  assert.doesNotMatch(arcLensBlock,banned);

  const challengeBlock=slice('challengeCopy');
  for(let n=0;n<=8;n++) assert.match(challengeBlock,new RegExp(`\\n\\s*${n}:\\{title:`),`challengeCopy ${n} present`);
  assert.equal((challengeBlock.match(/prompt:'[^']*\?'/g)||[]).length,9,'every challenge entry ends its prompt with a question mark');
  assert.doesNotMatch(challengeBlock,banned);

  const relatingBlock=slice('relating');
  for(const n of [1,2,3,4,5,6,7,8,9,11,22,33]) assert.match(relatingBlock,new RegExp(`\\n\\s*${n}:\\{title:`),`relating ${n} present`);
  assert.equal((relatingBlock.match(/prompt:'[^']*\?'/g)||[]).length,12,'every relating entry ends its prompt with a question mark');
  assert.doesNotMatch(relatingBlock,banned);
});

test('karmic debt is 13, 14, 16 or 19 anywhere in a reduction chain', () => {
  assert.deepEqual(N.KARMIC_DEBTS, [13, 14, 16, 19]);
  for (const day of [13, 14, 16, 19]) assert.equal(N.karmicDebt(N.birthday(`2000-01-${day}`).birthDay), day, `day ${day}`);
  for (const day of [1, 22, 28, 31]) assert.equal(N.karmicDebt(N.birthday(`2000-01-${String(day).padStart(2, '0')}`).birthDay), null, `day ${day}`);
  // 1989-10-09: month 10 → 1, day 9, year 1989 → 27 → 9; 1 + 9 + 9 = 19 → 10 → 1.
  const path = N.birthday('1989-10-09').path;
  assert.deepEqual(path.steps, [19, 10, 1]);
  assert.equal(N.karmicDebt(path), 19);
  // D (4) + I (9) = 13 → 4.
  const di = N.nameProfile('DI');
  assert.equal(N.karmicDebt(di.expression), 13);
  assert.equal(N.karmicDebt(null), null);
});

test('karmic lessons and hidden passion count the name\'s letter values', () => {
  // A B C → 1 2 3: every other digit is a lesson; 1, 2 and 3 tie at one letter each.
  const abc = N.nameProfile('ABC');
  assert.deepEqual(N.karmicLessons(abc), [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(N.hiddenPassion(abc), {digits: [1, 2, 3], count: 1});
  // ANNA → A1 N5 N5 A1: lessons are everything but 1 and 5; 1 and 5 tie at two.
  const anna = N.nameProfile('Anna');
  assert.deepEqual(N.karmicLessons(anna), [2, 3, 4, 6, 7, 8, 9]);
  assert.deepEqual(N.hiddenPassion(anna), {digits: [1, 5], count: 2});
  // ELEANOR → E5 L3 E5 A1 N5 O6 R9: 5 appears three times.
  const eleanor = N.nameProfile('Eleanor');
  assert.deepEqual(N.letterCounts(eleanor), [0, 1, 0, 1, 0, 3, 1, 0, 0, 1]);
  assert.deepEqual(N.hiddenPassion(eleanor), {digits: [5], count: 3});
  assert.deepEqual(N.karmicLessons(eleanor), [2, 4, 7, 8]);
});

test('lessons and passion are Pythagorean only and need a ready name', () => {
  assert.equal(N.karmicLessons(N.nameProfile('Anna', [], null, 'chaldean')), null);
  assert.equal(N.hiddenPassion(N.nameProfile('Anna', [], null, 'chaldean')), null);
  assert.equal(N.letterCounts(N.nameProfile('')), null);
});

const reflectiveBanned = /punish|deserv|past life|past lives|curse|doom|you will|\bluck|fortune|fate\b|destined/i;

test('karmic debt, lesson and passion copy is complete and reflective', () => {
  const {copy} = require('../numerology.js');
  const banned = reflectiveBanned;
  assert.deepEqual(Object.keys(copy.karmicDebtCopy), ['13', '14', '16', '19']);
  for (const [n, entry] of Object.entries(copy.karmicDebtCopy)) {
    for (const key of ['title', 'words', 'story', 'prompt']) assert.ok(typeof entry[key] === 'string' && entry[key].length > 0, `debt ${n} ${key}`);
    assert.match(entry.prompt, /\?$/, `debt ${n} prompt is a question`);
    assert.doesNotMatch(Object.values(entry).join(' '), banned, `debt ${n}`);
    assert.doesNotMatch(Object.values(entry).join(' '), /'/, `debt ${n} uses curly apostrophes`);
  }
  for (const [name, table] of [['lesson', copy.lessonCopy], ['passion', copy.passionCopy]]) {
    assert.deepEqual(Object.keys(table), ['1', '2', '3', '4', '5', '6', '7', '8', '9'], name);
    for (const [d, text] of Object.entries(table)) {
      assert.ok(typeof text === 'string' && text.length > 0, `${name} ${d}`);
      assert.doesNotMatch(text, banned, `${name} ${d}`);
      assert.doesNotMatch(text, /'/, `${name} ${d} uses curly apostrophes`);
    }
  }
});

test('the birth karmic debt block appears only for a debt and names the role and root', () => {
  const {render} = require('../numerology.js');
  assert.equal(render.birthKarmic(N.birthday('2000-01-01')), '', 'no debt, no block');
  const day = render.birthKarmic(N.birthday('2000-01-13'));
  assert.match(day, /Birth Day · 13\/4/);
  assert.doesNotMatch(day, /Life Path ·/);
  const dayOnly = render.birthKarmic(N.birthday('1989-10-19'));
  // 1989-10-19: 1 + 19→10→1 + 9 = 11 is a master, so only the day carries a debt here.
  assert.match(dayOnly, /Birth Day · 19\/1/);
  assert.doesNotMatch(dayOnly, /Life Path ·/);
  assert.match(render.birthKarmic(N.birthday('1989-10-09')), /Life Path · 19\/1/);
});

test('name extras: debts, lessons and passion counts are true of the letters', () => {
  const {render} = require('../numerology.js');
  // ANNA: A1 N5 N5 A1. Lessons 2 3 4 6 7 8 9; 1 and 5 tie at two letters; total 12, no debt.
  const anna = render.nameKarmic(N.nameProfile('Anna'));
  assert.match(anna, /No letter in this name carries 2, 3, 4, 6, 7, 8 or 9\./);
  assert.match(anna, /1 · carried by two letters/);
  assert.match(anna, /5 · carried by two letters/);
  assert.match(anna, /1 and 5 tie for the most letters/);
  assert.doesNotMatch(anna, /Karmic debt</);
  // ELEANOR: 5 on three letters, one passion, no tie sentence.
  const eleanor = render.nameKarmic(N.nameProfile('Eleanor'));
  assert.match(eleanor, /5 · carried by three letters/);
  assert.doesNotMatch(eleanor, /tie for the most/);
  // ABC: every present value on one letter.
  const abc = render.nameKarmic(N.nameProfile('ABC'));
  assert.match(abc, /1, 2 and 3 are each carried by one letter, so no number stands out/);
  assert.doesNotMatch(abc, /carried by one letters/);
  assert.match(render.nameKarmic(N.nameProfile('A')), /1 is carried by one letter/);
  // ABCDEFGHI covers 1–9.
  assert.match(render.nameKarmic(N.nameProfile('ABCDEFGHI')), /Every number from one to nine appears in this name/);
  // DI: D4 + I9 = 13 → 4 for Expression; vowel I alone is 9, consonant D alone is 4.
  assert.match(render.nameKarmic(N.nameProfile('DI')), /Expression · 13\/4/);
  // Chaldean: one sentence, no lessons.
  const chaldean = render.nameKarmic(N.nameProfile('Anna', [], null, 'chaldean'));
  assert.match(chaldean, /Pythagorean letter values/);
  assert.doesNotMatch(chaldean, /No letter in this name carries/);
});

test('snapshot and restore round-trip a numerology reading', () => {
  const M = require('../numerology.js');
  // 2000-02-29: month 2 + day 29 → 11 + year 2000 → 2 = 15 → 6.
  const birth = N.birthday('2000-02-29');
  const base = {tab: 'arcs', core: 'birthDay', period: 'month', cycleDate: '2026-09-14', arc: 2, arcView: 'challenge', pairView: 'a', nameSystem: 'pythagorean', nameKind: 'soul', name: '', yVowels: [], nameRead: false, partnerDate: '', partnerRead: false};
  const plain = M.snapshot(base, birth);
  assert.deepEqual({...plain, payload: undefined}, {kind: 'numerology', deck: '', layout: 'Life arcs', question: '', focus: '', payload: undefined, summary: 'Life Path 6'});
  assert.deepEqual(Object.keys(plain.payload).sort(), ['arc', 'arcView', 'birthday', 'core', 'cycleDate', 'nameKind', 'nameSystem', 'pairView', 'period', 'tab', 'v']);
  assert.equal(plain.payload.v, 1);
  const back = M.restore(plain.payload);
  assert.equal(back.birthday, '2000-02-29');
  assert.deepEqual(back.previous, base);

  const full = {...base, tab: 'name', nameSystem: 'chaldean', name: 'Yvonne Lynn', yVowels: [7], nameRead: true, partnerDate: '1985-11-29', partnerRead: true};
  const saved = M.snapshot(full, birth);
  assert.equal(saved.summary, 'Life Path 6 · name reading');
  assert.doesNotMatch(saved.summary, /yvonne|lynn/i, 'the name never reaches the summary');
  assert.deepEqual(M.restore(saved.payload).previous, full);

  // A typed but unread name and an unsubmitted partner date are not saved.
  const unread = M.snapshot({...base, name: 'Yvonne Lynn', yVowels: [7], partnerDate: '1985-11-29'}, birth);
  assert.equal('name' in unread.payload || 'yVowels' in unread.payload || 'partnerDate' in unread.payload, false);
  assert.equal(unread.summary, 'Life Path 6');
  assert.equal(M.snapshot({...base, name: '   ', nameRead: true}, birth).summary, 'Life Path 6');
  assert.equal(M.snapshot(base, N.birthday('2000-01-08')).summary, 'Life Path 11/2');

  // A name the studio cannot read is not a name reading.
  const robot = M.snapshot({...base, name: 'R2D2', yVowels: [], nameRead: true}, birth);
  assert.equal('name' in robot.payload, false);
  assert.equal(robot.summary, 'Life Path 6');
  // A compared but unparseable partner date is not saved either.
  assert.equal('partnerDate' in M.snapshot({...base, partnerDate: '', partnerRead: true}, birth).payload, false);

  // The layout is the tab's visible label; restore reads payload.tab and ignores layout.
  const labels = {birth: 'Birth numbers', arcs: 'Life arcs', cycles: 'Personal cycles', name: 'Name reading', pair: 'Two paths', loshu: 'Lo Shu'};
  for (const [tab, label] of Object.entries(labels)) {
    const entry = M.snapshot({...base, tab}, birth);
    assert.equal(entry.layout, label);
    assert.ok(entry.layout.length <= 40, tab);
    assert.equal(M.restore({...entry.payload, layout: 'birth'}).previous.tab, tab);
  }
});

test('the save note names exactly what saving stores beyond the birth date', () => {
  const {render} = require('../numerology.js');
  const none = {name: '', nameRead: false, partnerDate: '', partnerRead: false};
  const name = {...none, name: 'Anna', nameRead: true};
  const partner = {...none, partnerDate: '1985-11-29', partnerRead: true};
  assert.equal(render.saveNote(none), '');
  assert.equal(render.saveNote({...none, name: 'Anna', partnerDate: '1985-11-29'}), '', 'unread entries are not saved');
  assert.equal(render.saveNote({...name, name: 'R2D2'}), '', 'an unreadable name is not saved');
  assert.equal(render.saveNote(name), 'Saving includes the name you entered. It is stored on our server with the reading.');
  assert.equal(render.saveNote(partner), 'Saving includes the other person’s birth date you entered. It is stored on our server with the reading.');
  assert.equal(render.saveNote({...name, partnerDate: partner.partnerDate, partnerRead: true}), 'Saving includes the name and the other person’s birth date you entered. Both are stored on our server with the reading.');
});

test('rendered karmic blocks, notes and the saved banner are reflective and use curly apostrophes', () => {
  const {render} = require('../numerology.js');
  const none = {name: '', nameRead: false, partnerDate: '', partnerRead: false};
  const samples = {
    'birth debt, day': render.birthKarmic(N.birthday('2000-01-13')),
    'birth debt, path': render.birthKarmic(N.birthday('1989-10-09')),
    'chaldean note': render.nameKarmic(N.nameProfile('Anna', [], null, 'chaldean')),
    'save note, name': render.saveNote({...none, name: 'Anna', nameRead: true}),
    'save note, partner': render.saveNote({...none, partnerDate: '1985-11-29', partnerRead: true}),
    'save note, both': render.saveNote({name: 'Anna', nameRead: true, partnerDate: '1985-11-29', partnerRead: true}),
    'saved banner': render.savedBanner('2000-02-29')
  };
  for (const name of ['Anna', 'Eleanor', 'ABC', 'A', 'ABCDEFGHI', 'DI']) samples['name ' + name] = render.nameKarmic(N.nameProfile(name));
  for (const [label, html] of Object.entries(samples)) {
    assert.ok(html.length > 0, label + ' renders');
    const text = html.replace(/<[^>]*>/g, ' ');
    assert.doesNotMatch(text, reflectiveBanned, label);
    assert.doesNotMatch(text, /'/, label + ' uses curly apostrophes');
  }
  for (const part of ['Karmic debt', 'Karmic lessons', 'Hidden passion', 'Some numerologists also check', 'own reduction, starting from its letter total']) {
    assert.ok(Object.values(samples).some(html => html.includes(part)), part + ' is scanned');
  }
});

test('restore rejects malformed payloads and clamps what it keeps', () => {
  const M = require('../numerology.js');
  for (const bad of [null, undefined, 'x', 42, [], {}, {birthday: '2000-02-30'}, {birthday: 20000101}]) assert.equal(M.restore(bad), null, JSON.stringify(bad));
  const odd = M.restore({birthday: '2000-01-01', tab: 'tarot', core: 'x', period: 'week', arc: 7, arcView: 'x', pairView: 'x', nameSystem: 'kabbalah', nameKind: 'x', cycleDate: 'soon', partnerDate: 'yesterday', name: 7, yVowels: 'all'});
  assert.deepEqual(odd.previous, {tab: 'birth', core: 'path', period: 'year', nameKind: 'expression', arc: -1, arcView: 'pinnacle', pairView: 'together', nameSystem: 'pythagorean', cycleDate: '', name: '', yVowels: [], nameRead: false, partnerDate: '', partnerRead: false});
  const long = M.restore({birthday: '2000-01-01', name: 'A'.repeat(200)});
  assert.equal(long.previous.name.length, 120);
  assert.equal(long.previous.nameRead, true);
  // YVONNE LYNN: Y at 0 and 7; index 2 is an O; 11 and 99 are past the ten letters.
  assert.deepEqual(M.restore({birthday: '2000-01-01', name: 'Yvonne Lynn', yVowels: [0, 7, 2, 11, 99, -1, 1.5, '7']}).previous.yVowels, [0, 7]);
  // The studio's date controls stop at 2100-12-31.
  assert.equal(M.restore({birthday: '2000-01-01', cycleDate: '2100-12-31'}).previous.cycleDate, '2100-12-31');
  assert.equal(M.restore({birthday: '2000-01-01', cycleDate: '2101-01-01'}).previous.cycleDate, '');
});

test('a saved reading stays pinned until the profile changes, then hands back the reader\'s own studio', () => {
  const M = require('../numerology.js');
  const own = {tab: 'cycles', name: '', nameRead: false};
  const savedA = {tab: 'name', name: 'Yvonne Lynn', nameRead: true, partnerDate: '1985-11-29', partnerRead: true};
  const savedB = {tab: 'pair', name: 'Anna', nameRead: true};
  // No reading loaded: every notification re-attaches with the current state.
  const plain = M.pinState();
  assert.deepEqual(plain.profile('1990-01-01', undefined), {previous: undefined});
  assert.deepEqual(plain.profile('1990-01-01', own), {previous: own});

  const pins = M.pinState();
  pins.profile('1990-01-01', undefined);
  pins.load(own);
  assert.equal(pins.profile('1990-01-01', savedA), null, 'the same birth date re-announced by account sync is skipped');
  pins.load(savedA); // a second saved reading keeps the reader's original state
  assert.equal(pins.profile('1990-01-01', savedB), null);
  assert.deepEqual(pins.profile('1991-02-02', savedB), {previous: own}, 'a new birth date returns the reader\'s own state, not the saved name or partner');
  assert.deepEqual(pins.profile('1991-02-02', own), {previous: own}, 'once released, the current state carries as before');

  // Submitting the birth form releases the pin even when the date is unchanged.
  const resubmit = M.pinState();
  resubmit.profile('1990-01-01', undefined);
  resubmit.load(undefined); // opened before any studio existed
  resubmit.release();
  assert.deepEqual(resubmit.profile('1990-01-01', savedA), {previous: undefined});
  assert.deepEqual(resubmit.profile('1990-01-01', own), {previous: own});
});
