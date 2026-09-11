# Numerology Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pinnacles & Challenges ("Life arcs"), a two-person Life Path comparison ("Two paths") and a Chaldean name system to the existing numerology studio.

**Architecture:** Three pure functions are added to `numerology-engine.js` (UMD module, Node-testable) and one gains an optional argument. `numerology.js` gains two tabs and a system toggle, holding all new state in page memory only. `numerology.css` gains layout for the timeline, the pair views and the word table. No new files except this plan; no libraries.

**Tech Stack:** Vanilla ES2020 browser JS, `node --test` (Node 24), no build step.

**Spec:** `docs/superpowers/specs/2026-09-11-numerology-completion-design.md`

## Global Constraints

- Original interpretive copy only; sources cited for calculation methods, never for prose. (Codebase convention, docs/NUMEROLOGY.md.)
- No compatibility score, ranking, percentage or verdict for two people. (Codebase convention.)
- Nothing new persisted: the second person's date and any name stay in the studio's page state. (Codebase convention.)
- Keep the studio's voice: "symbolic practice for reflection, not measurement or prediction". (Codebase convention.)
- Run tests from Git Bash as `node --test tests/*.test.cjs` (the glob form is required on Node 24). Baseline on this branch: 132 passing.
- Bump the `?v=` cache key of every changed JS/CSS file in `index.html` (`numerology-engine.js?v=2`, `numerology.js?v=2`, `numerology.css?v=2`). (Codebase convention.)
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Every calculation convention is the one written in the spec; do not "correct" it toward another school. If a rule seems wrong, say so in your report and implement the spec.

---

## File map

| File | Responsibility | Change |
|---|---|---|
| `numerology-engine.js` | Pure arithmetic: `arcs`, `currentArc`, `pair`, Chaldean branch of `nameProfile` | Modify (append functions before the `return` on line 72; extend the export list) |
| `numerology.js` | Studio UI: copy tables, tab markup, renderers, event wiring | Modify (copy tables near line 6–39; template line 59–64; renderers and handlers line 66–128) |
| `numerology.css` | Layout for new tabs | Modify (append; adjust `.num-tabs` grid at line 22 and the 700px media block at line 124) |
| `tests/numerology.test.cjs` | Node tests for the engine | Modify (append) |
| `index.html` | Cache keys | Modify (lines 17, 250, 251) |
| `docs/NUMEROLOGY.md` | Conventions and verification record | Modify |

The engine's existing `reduce(value, keepMasters=true)` returns `{value, root, master, steps}` and throws `RangeError` for values below 1. `parseDate('YYYY-MM-DD')` returns `{year, month, day, value}` or `null`. `birthday(value)` returns `{parts, components, path, birthDay, attitude}`. `cycleYear(birth, year)` returns a reduced Personal Year (no masters). `normalizeName(raw)` returns `{status:'ready', normalized, letters:[{letter, value, index, word, wordIndex}], ys}` or `{status:'invalid'|'empty', message}`. `digitSum` and `dateKey` are module-private helpers you may use.

---

### Task 1: Engine — pinnacles, challenges and the current period

**Files:**
- Modify: `numerology-engine.js:71-72` (add functions before `return {…}` and export them)
- Test: `tests/numerology.test.cjs` (append)

**Interfaces:**
- Consumes: `reduce`, `parseDate`, `birthday` (existing).
- Produces: `arcs(birth)` → `{birth:string, components:{month,day,year}, pinnacles:[{index, number, fromAge, toAge, fromYear, toYear, calculation}], challenges:[{index, number:int, fromAge, toAge, fromYear, toYear, calculation}], firstPeriodEnd:int}`; `currentArc(model, todayISO)` → `-1|0|1|2|3`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/numerology.test.cjs`:

```js
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `node --test tests/numerology.test.cjs`
Expected: 3 failing tests, each with `TypeError: N.arcs is not a function` or similar.

- [ ] **Step 3: Implement `arcs` and `currentArc`**

In `numerology-engine.js`, insert immediately before the line `return {reduce,parseDate,dateKey,birthday,cycles,cycleYear,dateInMonth,normalizeName,nameProfile};`:

```js
  // Pinnacles and Challenges. Conventions: docs/superpowers/specs/2026-09-11-numerology-completion-design.md §1.
  function arcs(birth) {
    if(!birth||!birth.parts||!birth.path) throw new RangeError('Choose a valid birthday.');
    const m=reduce(birth.parts.month,false).value, d=reduce(birth.parts.day,false).value, y=reduce(birth.parts.year,false).value;
    const p1=reduce(m+d), p2=reduce(d+y), p3=reduce(p1.value+p2.value), p4=reduce(m+y);
    const c1=Math.abs(m-d), c2=Math.abs(d-y), c3=Math.abs(c1-c2), c4=Math.abs(m-y);
    const firstPeriodEnd=36-birth.path.root;
    const bounds=[[0,firstPeriodEnd],[firstPeriodEnd+1,firstPeriodEnd+9],[firstPeriodEnd+10,firstPeriodEnd+18],[firstPeriodEnd+19,null]];
    const span=index=>{const [fromAge,toAge]=bounds[index];return {index,fromAge,toAge,fromYear:birth.parts.year+fromAge,toYear:toAge===null?null:birth.parts.year+toAge};};
    const pinnacles=[[p1,`month ${m} + day ${d} = ${m+d}`],[p2,`day ${d} + year ${y} = ${d+y}`],[p3,`Pinnacle 1 (${p1.value}) + Pinnacle 2 (${p2.value}) = ${p1.value+p2.value}`],[p4,`month ${m} + year ${y} = ${m+y}`]]
      .map(([number,calculation],index)=>({...span(index),number,calculation}));
    const challenges=[[c1,`|month ${m} − day ${d}| = ${c1}`],[c2,`|day ${d} − year ${y}| = ${c2}`],[c3,`|Challenge 1 (${c1}) − Challenge 2 (${c2})| = ${c3}`],[c4,`|month ${m} − year ${y}| = ${c4}`]]
      .map(([number,calculation],index)=>({...span(index),number,calculation}));
    return {birth:birth.parts.value,components:{month:m,day:d,year:y},pinnacles,challenges,firstPeriodEnd};
  }
  function currentArc(model, todayValue) {
    const today=parseDate(todayValue), birth=model&&parseDate(model.birth);
    if(!today||!birth||!Array.isArray(model.pinnacles)) throw new RangeError('Choose a valid date.');
    if(todayValue<model.birth) return -1;
    let age=today.year-birth.year;
    if(today.month<birth.month||(today.month===birth.month&&today.day<birth.day)) age--;
    return model.pinnacles.findIndex(p=>age>=p.fromAge&&(p.toAge===null||age<=p.toAge));
  }
```

Then change the return line to:

```js
  return {reduce,parseDate,dateKey,birthday,cycles,cycleYear,dateInMonth,normalizeName,nameProfile,arcs,currentArc};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/*.test.cjs`
Expected: 135 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add numerology-engine.js tests/numerology.test.cjs
git commit -m "feat(numerology): pinnacles, challenges and current-period engine

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Engine — two-person comparison

**Files:**
- Modify: `numerology-engine.js` (add `pair` before the return; export it)
- Test: `tests/numerology.test.cjs` (append)

**Interfaces:**
- Consumes: `reduce`, `parseDate`, `cycleYear`, `birthday` (existing).
- Produces: `pair(birthA, birthB, todayISO)` → `{a:{path,birthDay,attitude,year}, b:{…}, concord:{a:'mind'|'practical'|'expressive', b:…, same:boolean}, sameRoot:boolean, pairNumber:reduceResult, yearRelation:'same'|'adjacent'|'apart'}`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `node --test tests/numerology.test.cjs`
Expected: 1 new failing test (`N.pair is not a function`).

- [ ] **Step 3: Implement `pair`**

Insert before the engine's return line:

```js
  // Two-person comparison. No score is produced. Spec §2.
  const concords={1:'mind',5:'mind',7:'mind',2:'practical',4:'practical',8:'practical',3:'expressive',6:'expressive',9:'expressive'};
  function pair(birthA, birthB, todayValue) {
    if(!birthA?.path||!birthA?.parts||!birthB?.path||!birthB?.parts) throw new RangeError('Choose two valid birthdays.');
    const today=parseDate(todayValue);
    if(!today) throw new RangeError('Choose a valid date.');
    const person=b=>({path:b.path,birthDay:b.birthDay,attitude:b.attitude,year:cycleYear(b,today.year)});
    const a=person(birthA), b=person(birthB);
    const ca=concords[a.path.root], cb=concords[b.path.root];
    const distance=Math.abs(a.year.value-b.year.value);
    const yearRelation=distance===0?'same':(distance===1||distance===8)?'adjacent':'apart';
    return {a,b,concord:{a:ca,b:cb,same:ca===cb},sameRoot:a.path.root===b.path.root,pairNumber:reduce(a.path.value+b.path.value),yearRelation};
  }
```

Add `pair` to the exported object.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/*.test.cjs`
Expected: 136 passing.

- [ ] **Step 5: Commit**

```bash
git add numerology-engine.js tests/numerology.test.cjs
git commit -m "feat(numerology): two-person Life Path comparison engine

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Engine — Chaldean name system

**Files:**
- Modify: `numerology-engine.js:63-70` (`nameProfile`) plus a `compoundReading` helper and a `chaldean` table
- Test: `tests/numerology.test.cjs` (append)

**Interfaces:**
- Consumes: `normalizeName`, `reduce`, `digitSum`.
- Produces: `nameProfile(raw, yVowels, birth, system='pythagorean')`. With `'chaldean'`: `{status:'ready', system:'chaldean', normalized, letters:[{letter,value,index,word,wordIndex}], ys, compound:int, reading:{compound,root,readAs}, words:[{word,wordIndex,compound,root}]}`. Also exports `compoundReading(int)` and `chaldeanValues` (the table) for the UI footnote.

- [ ] **Step 1: Write the failing tests**

```js
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
  // The Pythagorean shape is unchanged.
  const p=N.nameProfile('John Smith');
  assert.equal(p.system,undefined);assert.equal(p.totals.expression,44);
  // J1 O6 H8 N5 + S1 M4 I9 T2 H8
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `node --test tests/numerology.test.cjs`
Expected: the new test fails (`alphabet.system` is `undefined`, compound is `undefined`).

- [ ] **Step 3: Implement the Chaldean branch**

Replace the existing `nameProfile` function with:

```js
  // Chaldean letter values as published by Cheiro. No letter carries 9. Spec §3.
  const chaldeanValues={A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7};
  function compoundReading(compound) {
    if(!Number.isSafeInteger(compound)||compound<1) throw new RangeError('Use a positive whole number.');
    const root=compound>9?reduce(compound,false).value:compound;
    if(compound<=9) return {compound,root,readAs:compound};
    if(compound<=52) return {compound,root,readAs:compound};
    const once=digitSum(compound);
    return {compound,root,readAs:once>9&&once<=52?once:root};
  }
  function nameProfile(raw, yVowels=[], birth=null, system='pythagorean') {
    if(system!=='pythagorean'&&system!=='chaldean') throw new RangeError('Choose the Pythagorean or Chaldean system.');
    const result=normalizeName(raw);
    if(result.status!=='ready') return result;
    if(system==='chaldean') {
      const letters=result.letters.map(item=>({...item,value:chaldeanValues[item.letter]}));
      const compound=letters.reduce((sum,x)=>sum+x.value,0);
      const words=[...new Set(letters.map(x=>x.wordIndex))].map(wordIndex=>{
        const group=letters.filter(x=>x.wordIndex===wordIndex), total=group.reduce((sum,x)=>sum+x.value,0);
        return {word:group[0].word,wordIndex,compound:total,root:compoundReading(total).root};
      });
      return {...result,system:'chaldean',letters,compound,reading:compoundReading(compound),words};
    }
    const selected=new Set(yVowels), letters=result.letters.map(item=>({...item,vowel:'AEIOU'.includes(item.letter)||(item.letter==='Y'&&selected.has(item.index))}));
    const total=letters.reduce((sum,x)=>sum+x.value,0),vowels=letters.filter(x=>x.vowel).reduce((sum,x)=>sum+x.value,0),consonants=total-vowels;
    const expression=reduce(total),soul=vowels?reduce(vowels):null,personality=consonants?reduce(consonants):null;
    return {...result,letters,totals:{expression:total,soul:vowels,personality:consonants},expression,soul,personality,maturity:birth?reduce(birth.path.value+expression.value):null};
  }
```

Export `compoundReading` and `chaldeanValues` alongside the others.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/*.test.cjs`
Expected: 137 passing.

- [ ] **Step 5: Commit**

```bash
git add numerology-engine.js tests/numerology.test.cjs
git commit -m "feat(numerology): Chaldean name system in the engine

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: UI — Life arcs tab

**Files:**
- Modify: `numerology.js` (copy tables after `roles`; tabs array and state on lines 53–54; nav and sections on lines 59–63; new `renderArcs`; click handler)
- Modify: `numerology.css` (tabs grid, timeline)
- Modify: `index.html:17,250,251` (cache keys)

**Interfaces:**
- Consumes: `E.arcs(birth)`, `E.currentArc(model, todayISO)` from Task 1; existing `themes`, `readNumber`-style markup, `localToday()`, `numberLabel`, `trail`.
- Produces: state keys `arc` (0–3) and `arcView` ('pinnacle'|'challenge'); tab id `arcs`; section `#num-arcs`.

- [ ] **Step 1: Add the copy tables**

After the `roles` object in `numerology.js` add:

```js
  // One sentence per number: how the theme reads as a chapter of life rather than a trait. Original copy.
  const arcLens = {
    1:'As a chapter, this number asks you to find your own footing and make decisions you can stand behind.',
    2:'As a chapter, this number turns attention to partnership, patience and the quality of your agreements.',
    3:'As a chapter, this number makes room for expression, friendship and work that wants to be seen.',
    4:'As a chapter, this number favors building: routines, skills and commitments that hold weight.',
    5:'As a chapter, this number brings movement, change and the question of what freedom is for.',
    6:'As a chapter, this number gathers responsibility, home and the people who depend on one another.',
    7:'As a chapter, this number slows the pace toward study, privacy and understanding.',
    8:'As a chapter, this number tests how you handle resources, authority and visible results.',
    9:'As a chapter, this number asks what you are ready to complete and what you will pass on.',
    11:'As a chapter, this master number heightens perception and asks that insight find a practical voice.',
    22:'As a chapter, this master number pairs a large vision with the patience to build it in stages.',
    33:'As a chapter, this master number centers on care that teaches, and on keeping that care sustainable.'
  };
  // Challenges 0–8. Original copy. A challenge is a recurring question, not a flaw.
  const challengeCopy = {
    0:{title:'The open question',words:'Choice · self-direction · everything possible',story:'A zero challenge has no single theme. Traditionally it is read as the freedom, and the difficulty, of choosing your own emphasis when nothing in particular is pushing back. The question in this period is which challenge you decide to take on deliberately.',prompt:'Which of the other challenges would I choose to work on, if nothing chose for me?'},
    1:{title:'Standing on your own',words:'Independence · confidence · will',story:'This challenge circles the question of self-reliance: learning to trust your own judgment without needing to win every argument, and to lead without pushing people away.',prompt:'Where am I waiting for permission that I could give myself?'},
    2:{title:'Sensitivity with a spine',words:'Feeling · cooperation · boundaries',story:'This challenge concerns the balance between sensitivity and self-erasure. It asks you to stay open to others without taking every mood personally, and to cooperate without disappearing from the agreement.',prompt:'When I keep the peace, whose peace is it?'},
    3:{title:'Saying it plainly',words:'Expression · focus · follow-through',story:'This challenge gathers around expression: scattered energy, unfinished projects, or words held back for fear of how they will land. The invitation is to choose what you want to say and give it a finished form.',prompt:'What have I been talking around instead of saying?'},
    4:{title:'Structure that serves',words:'Work · order · flexibility',story:'This challenge asks how you relate to routine and effort. Too little structure leaves intentions unbuilt; too much turns a method into a cage. The work is to find the amount of order that actually helps.',prompt:'Which rule am I keeping past its usefulness?'},
    5:{title:'Freedom with a keel',words:'Change · restraint · curiosity',story:'This challenge concerns freedom: restlessness, excess, or the opposite fear of any change at all. It invites a curiosity that can stay long enough to learn something.',prompt:'What am I moving away from, and would staying teach me more?'},
    6:{title:'Care without control',words:'Responsibility · idealism · acceptance',story:'This challenge gathers around responsibility and expectation: caring so much about how things should be that people, including you, are not allowed to be as they are.',prompt:'Whose responsibility have I quietly taken over?'},
    7:{title:'Trusting what you find',words:'Faith · inquiry · openness',story:'This challenge concerns doubt and distance: analyzing rather than experiencing, or keeping so much private that no one can meet you there. It asks for inquiry that leads back into life.',prompt:'What would I have to feel if I stopped explaining it?'},
    8:{title:'Enough, and what it is for',words:'Resources · ambition · fairness',story:'This challenge concerns money, power and the measure of success. It can show as over-focus on results or as an avoidance of them. The question is what you would do with enough.',prompt:'What result am I chasing, and what would I do the day after I had it?'}
  };
```

- [ ] **Step 2: Add the tab, state and section**

Change the `tabs` array on line 53 to `const tabs=['birth','arcs','cycles','name','pair','loshu'];` (the `pair` tab is wired in Task 5; adding the id now is harmless because `showTab` only toggles panels that exist).

Extend the `state` object literal with:

```js
arc:[0,1,2,3].includes(previous?.arc)?previous.arc:-1,arcView:['pinnacle','challenge'].includes(previous?.arcView)?previous.arcView:'pinnacle',
```

(`-1` means "not chosen yet: default to the current period at first render".)

In the nav template, change the tab list to:

```js
[['birth','Birth numbers','Your foundation'],['arcs','Life arcs','Pinnacles & challenges'],['cycles','Personal cycles','Year · month · day'],['name','Name reading','Letters & expression'],['pair','Two paths','Two birth dates'],['loshu','Lo Shu','The nine-cell square']]
```

After `<section id="num-birth" class="num-view"></section>` add:

```html
<section id="num-arcs" class="num-view"><div class="num-section-heading"><p class="num-kicker">Four chapters</p><h5>The shape of a life, in four arcs.</h5><p>Pinnacles describe the theme traditionally associated with each chapter; challenges describe the recurring question of the same years. Explore any period, past or future.</p></div><div id="num-arcs-content"></div></section>
```

- [ ] **Step 3: Write `renderArcs`**

Add next to `renderBirth`:

```js
    const arcModel=E.arcs(birth);
    function ageRange(p) { return p.toAge===null?`age ${p.fromAge} onward`:p.fromAge===0?`birth to age ${p.toAge}`:`ages ${p.fromAge}–${p.toAge}`; }
    function yearRange(p) { return p.toYear===null?`${p.fromYear} →`:`${p.fromYear}–${p.toYear}`; }
    function renderArcs() {
      const now=E.currentArc(arcModel,localToday());
      if(state.arc<0) state.arc=now<0?0:now;
      const p=arcModel.pinnacles[state.arc], c=arcModel.challenges[state.arc];
      const timeline=`<div class="num-arc-timeline" role="group" aria-label="Choose a life period">${arcModel.pinnacles.map((pin,i)=>{const ch=arcModel.challenges[i];return `<button type="button" data-num-arc="${i}" aria-pressed="${state.arc===i}" aria-label="Period ${i+1}, ${ageRange(pin)}, pinnacle ${numberLabel(pin.number)}, challenge ${ch.number}${now===i?', current period':''}"><span>Period ${i+1}${now===i?' · now':''}</span><strong>${numberLabel(pin.number)}</strong><small>Pinnacle</small><em>${ch.number}</em><small>Challenge</small><b>${ageRange(pin)}</b><i>${yearRange(pin)}</i></button>`;}).join('')}</div>`;
      const toggle=`<div class="num-arc-toggle" role="group" aria-label="Read the pinnacle or the challenge">${[['pinnacle','Pinnacle'],['challenge','Challenge']].map(([id,label])=>`<button type="button" data-num-arc-view="${id}" aria-pressed="${state.arcView===id}">${label}</button>`).join('')}</div>`;
      let reading;
      if(state.arcView==='pinnacle') {
        const t=themes[p.number.value];
        reading=`<article class="num-reading"><header><div class="num-seal" aria-hidden="true"><span>${p.number.value}</span>${p.number.master?`<small>root ${p.number.root}</small>`:''}</div><div><p class="num-kicker">Pinnacle ${state.arc+1} · ${ageRange(p)} · ${yearRange(p)}</p><h5>${t.title}</h5><p class="num-keywords">${t.words}</p></div></header><p class="num-role-lens">${arcLens[p.number.value]}</p><p>${t.story}</p><div class="num-reading-pair"><section><h6>A useful expression</h6><p>${t.capacity}</p></section><section><h6>Room to grow</h6><p>${t.edge}</p></section></div><blockquote>${t.prompt}</blockquote><details class="num-method"><summary>See the calculation</summary><p>${p.calculation} → <strong>${trail(p.number)}</strong>. Components use the single-digit month, day and year (${arcModel.components.month}, ${arcModel.components.day}, ${arcModel.components.year}); results keep 11, 22 and 33.</p><p>The first period ends at age 36 − ${birth.path.root} (your Life Path root) = ${arcModel.firstPeriodEnd}; the next two last nine years each.</p></details></article>`;
      } else {
        const t=challengeCopy[c.number];
        reading=`<article class="num-reading"><header><div class="num-seal" aria-hidden="true"><span>${c.number}</span></div><div><p class="num-kicker">Challenge ${state.arc+1} · ${ageRange(c)} · ${yearRange(c)}</p><h5>${t.title}</h5><p class="num-keywords">${t.words}</p></div></header><p class="num-role-lens">A challenge names a recurring question of the period, not a flaw or a prediction. The same question can be met many ways.</p><p>${t.story}</p><blockquote>${t.prompt}</blockquote><details class="num-method"><summary>See the calculation</summary><p>${c.calculation}. Challenges take the difference of single-digit components, so results run 0–8; 0 has its own reading.</p></details></article>`;
      }
      $('#num-arcs-content').innerHTML=timeline+toggle+reading;
    }
```

- [ ] **Step 4: Wire the clicks and the initial render**

In the click handler, after the `numTab` line add:

```js
      if(d.numArc){state.arc=Number(d.numArc);renderArcs();$(`[data-num-arc="${state.arc}"]`).focus({preventScroll:true});return;}
      if(d.numArcView){state.arcView=d.numArcView;renderArcs();$(`[data-num-arc-view="${state.arcView}"]`).focus({preventScroll:true});return;}
```

Change the final render line to `renderBirth();renderArcs();renderCycles();renderYChoices();renderName();showTab();`.

- [ ] **Step 5: CSS**

In `numerology.css` change line 22's grid to `grid-template-columns: repeat(6,minmax(0,1fr));` and append:

```css
.num-arc-timeline { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin: 0 0 22px; }
.num-arc-timeline button { display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: 'label label' 'pin ch' 'pinl chl' 'age age' 'year year'; gap: 2px 8px; align-items: end; min-width: 0; padding: 16px 12px 14px; border: 1px solid var(--num-line); border-radius: 5px; background: #ffffff03; color: var(--num-text); text-align: left; }
.num-arc-timeline button > span { grid-area: label; font: 10px/1.5 'DM Mono', monospace; text-transform: uppercase; letter-spacing: .08em; color: var(--num-muted); margin-bottom: 8px; }
.num-arc-timeline button strong { grid-area: pin; color: var(--num-teal); font: 500 clamp(30px,3.4vw,46px)/1.1 'Playfair Display', serif; }
.num-arc-timeline button em { grid-area: ch; font: 500 clamp(30px,3.4vw,46px)/1.1 'Playfair Display', serif; font-style: normal; color: var(--num-gold); }
.num-arc-timeline button small { font-size: 9px; color: var(--num-muted); text-transform: uppercase; letter-spacing: .08em; }
.num-arc-timeline button small:nth-of-type(1) { grid-area: pinl; }
.num-arc-timeline button small:nth-of-type(2) { grid-area: chl; }
.num-arc-timeline button b { grid-area: age; font-weight: 400; font-size: 12px; margin-top: 10px; }
.num-arc-timeline button i { grid-area: year; font: 10px 'DM Mono', monospace; color: var(--num-muted); }
.num-arc-timeline button[aria-pressed='true'] { background: #ecd29c12; border-color: #efd19a99; box-shadow: inset 0 -3px 0 var(--num-gold); }
.num-arc-toggle { display: flex; gap: 8px; margin: 0 0 18px; }
.num-arc-toggle button { min-height: 40px; padding: 8px 18px; border: 1px solid var(--num-line); border-radius: 3px; background: #ffffff04; color: var(--num-text); font-size: 12px; }
.num-arc-toggle button[aria-pressed='true'] { background: #d9bf8830; border-color: var(--num-gold); color: var(--num-gold); }
@media (max-width: 1000px) { .num-tabs { grid-template-columns: repeat(3,minmax(0,1fr)); } .num-arc-timeline { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 700px) { .num-arc-timeline { grid-template-columns: 1fr; } }
```

Leave the existing `@media (max-width: 700px)` rule for `.num-tabs` (two columns) as it is; it comes later in the file and still wins at phone widths.

- [ ] **Step 6: Bump cache keys and check syntax**

In `index.html` set `numerology.css?v=2`, `numerology-engine.js?v=2`, `numerology.js?v=2`.
Run: `node --check numerology.js && node --check numerology-engine.js && node --test tests/*.test.cjs`
Expected: no syntax errors, 137 passing.

- [ ] **Step 7: Browser check**

Serve the tree from Git Bash: `py -3 -m http.server 8765 --bind 127.0.0.1 --directory "$(pwd)"` and open `http://127.0.0.1:8765/#birthday-numbers` in the Browser pane. Enter a birthday in the birthday form, open the Life arcs tab. Confirm: four periods render, one carries "· now", the toggle switches readings, the calculation details open, keyboard focus stays on the pressed control, and at 390px the timeline stacks with no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`). Note: `styles.css` sets smooth scrolling, so pass `behavior:'instant'` to any `scrollTo` you use from the tools.

- [ ] **Step 8: Commit**

```bash
git add numerology.js numerology.css index.html
git commit -m "feat(numerology): life arcs tab with pinnacles and challenges

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: UI — Two paths tab

**Files:**
- Modify: `numerology.js` (copy table, state keys, section markup, `renderPair`, handlers)
- Modify: `numerology.css` (append)

**Interfaces:**
- Consumes: `E.pair(birthA, birthB, todayISO)`, `E.birthday`, `E.parseDate` (Task 2); `themes`, `numberLabel`, `trail`, `dateLabel`, `localToday`.
- Produces: state keys `partnerDate`, `partnerRead`, `pairView`; section `#num-pair`; form `#num-pair-form`.

- [ ] **Step 1: Add the copy**

After `challengeCopy` add:

```js
  // How each Life Path tends to enter a relationship of any kind. Original copy; no verdicts.
  const relating = {
    1:{title:'Leads with initiative',story:'One tends to enter a relationship by acting: suggesting the plan, making the first call, taking a stand. The gift is momentum; the question is whether the other person is being invited or simply carried along.',prompt:'When did I last let someone else set the direction, and how did it feel?'},
    2:{title:'Leads with attention',story:'Two tends to enter a relationship by noticing: the mood, the unspoken need, the small adjustment that keeps things easy. The gift is attunement; the question is whether your own preferences are still visible in the exchange.',prompt:'What do I want here that I have not yet said out loud?'},
    3:{title:'Leads with expression',story:'Three tends to enter a relationship through conversation, humor and shared enthusiasm. The gift is warmth that makes people feel welcome; the question is whether the harder feelings get the same airtime as the pleasant ones.',prompt:'What would I say to this person if I trusted them to hear it?'},
    4:{title:'Leads with reliability',story:'Four tends to enter a relationship by showing up: consistently, practically, on time. The gift is trust built from kept promises; the question is whether steadiness leaves room for the other person to change.',prompt:'Which of my routines is this relationship allowed to interrupt?'},
    5:{title:'Leads with curiosity',story:'Five tends to enter a relationship as an adventure: new places, new ideas, a dislike of anything that feels like a script. The gift is aliveness; the question is what happens when the other person needs something predictable.',prompt:'What kind of steadiness would I be willing to offer, and for how long?'},
    6:{title:'Leads with care',story:'Six tends to enter a relationship by taking care of it: the home, the meal, the difficult relative, the plan for everyone. The gift is devotion; the question is whether care is being offered or quietly required.',prompt:'What would this person say they actually need from me?'},
    7:{title:'Leads with depth',story:'Seven tends to enter a relationship slowly, from the inside out, preferring one real conversation to many easy ones. The gift is being fully met; the question is whether privacy is protecting you or keeping the other person out.',prompt:'What have I understood about this person that I have never told them?'},
    8:{title:'Leads with commitment',story:'Eight tends to enter a relationship as a shared enterprise: goals, responsibilities, a sense of building something. The gift is loyalty and follow-through; the question is who holds the authority when you disagree.',prompt:'Where in this relationship do I need to be right, and what would it cost to let that go?'},
    9:{title:'Leads with perspective',story:'Nine tends to enter a relationship with a wide lens: generous, forgiving, interested in the whole person and the wider world. The gift is acceptance; the question is whether the particular, daily person gets as much attention as the ideal.',prompt:'What small, ordinary thing about this person deserves my full attention this week?'},
    11:{title:'Leads with perception',story:'Eleven, read with its root of two, tends to enter a relationship by sensing what is unspoken and wanting to name it. The gift is insight offered with care; the question is whether the intensity of noticing leaves the other person room to be ordinary.',prompt:'What am I sensing that I could simply ask about instead?'},
    22:{title:'Leads with a shared project',story:'Twenty-two, read with its root of four, tends to enter a relationship with a vision of what the two of you could build. The gift is scale and patience; the question is whether the person matters as much as the plan.',prompt:'If we never built anything together, what would still be worth keeping?'},
    33:{title:'Leads with devotion',story:'Thirty-three, read with its root of six, tends to enter a relationship as a calling to care and to teach. The gift is generosity; the question is whether the giving leaves room to receive.',prompt:'When did I last let this person take care of me?'}
  };
  const concordCopy = {
    mind:'the mind concord (1, 5, 7): numbers traditionally grouped around thinking, independence and inquiry',
    practical:'the practical concord (2, 4, 8): numbers traditionally grouped around cooperation, structure and stewardship',
    expressive:'the expressive concord (3, 6, 9): numbers traditionally grouped around expression, care and perspective'
  };
```

- [ ] **Step 2: State and markup**

Extend the `state` literal with:

```js
partnerDate:E.parseDate(previous?.partnerDate)?previous.partnerDate:'',partnerRead:Boolean(previous?.partnerRead&&E.parseDate(previous?.partnerDate)),pairView:['a','b','together'].includes(previous?.pairView)?previous.pairView:'together',
```

After the `#num-name` section add:

```html
<section id="num-pair" class="num-view"><div class="num-section-heading"><p class="num-kicker">Two people, two numbers</p><h5>Where two paths meet.</h5><p>Compare your Life Path with another person’s: a partner, a friend, a parent, a colleague. This is a conversation between two themes, not a score. The other date stays on this page.</p></div><form id="num-pair-form"><label for="num-pair-date">The other person’s birthday</label><div class="num-name-entry"><input id="num-pair-date" type="date" value="${esc(state.partnerDate)}" min="0001-01-01" max="${initialToday}" required><button type="submit">Compare paths <span aria-hidden="true">↗</span></button></div><p id="num-pair-status" role="status"></p></form><div id="num-pair-results"></div></section>
```

- [ ] **Step 3: Write `renderPair`**

```js
    function personCard(label, b, key) {
      return `<button type="button" data-num-pair-view="${key}" aria-pressed="${state.pairView===key}"><span>${label}</span><strong>${numberLabel(b.path)}</strong><small>Life Path · ${themes[b.path.value].title}</small></button>`;
    }
    function renderPair() {
      if(!state.partnerRead) {
        $('#num-pair-results').innerHTML='<div class="num-name-invitation"><span aria-hidden="true">9 <i>·</i> 1</span><h5>Two dates, side by side.</h5><p>Enter another person’s birthday to see both Life Paths, how their traditional groupings relate, and the number the pair makes together.</p></div>';return;
      }
      const parsed=E.parseDate(state.partnerDate);
      if(!parsed||state.partnerDate>localToday()) {$('#num-pair-status').textContent='Choose a valid birthday on or before today.';$('#num-pair-results').innerHTML='';return;}
      const other=E.birthday(state.partnerDate), model=E.pair(birth,other,localToday());
      $('#num-pair-status').textContent=`Comparing ${dateLabel(birth.parts.value)} with ${dateLabel(state.partnerDate)}.`;
      const cards=`<div class="num-pair-cards" role="group" aria-label="Choose a view">${personCard('Your path',model.a,'a')}<button type="button" data-num-pair-view="together" aria-pressed="${state.pairView==='together'}"><span>Together</span><strong>${numberLabel(model.pairNumber)}</strong><small>The pair’s number</small></button>${personCard('Their path',model.b,'b')}</div>`;
      let body;
      if(state.pairView!=='together') {
        const person=model[state.pairView], r=relating[person.path.value], t=themes[person.path.value], who=state.pairView==='a'?'You':'They';
        body=`<article class="num-reading"><header><div class="num-seal" aria-hidden="true"><span>${person.path.value}</span>${person.path.master?`<small>root ${person.path.root}</small>`:''}</div><div><p class="num-kicker">${who==='You'?'Your':'Their'} Life Path · ${numberLabel(person.path)}</p><h5>${r.title}</h5><p class="num-keywords">${t.words}</p></div></header><p>${r.story}</p><p class="num-role-lens">Birth Day ${who==='You'?birth.parts.day:parsed.day} and Attitude ${numberLabel(person.attitude)} add everyday texture; Personal Year ${person.year.value} is the current calendar-year theme.</p><blockquote>${r.prompt}</blockquote></article>`;
      } else {
        const t=themes[model.pairNumber.value];
        const concordNote=model.sameRoot?`Both Life Paths share the root ${model.a.path.root}. A shared number can feel like instant recognition and can also mean the same blind spot twice; the question is who notices first.`:model.concord.same?`Both numbers belong to ${concordCopy[model.concord.a]}. Numbers in the same concord are traditionally read as speaking a similar language, which makes agreement easy and difference easy to overlook.`:`Your number belongs to ${concordCopy[model.concord.a]}; theirs to ${concordCopy[model.concord.b]}. Different concords are traditionally read as different first languages: the same situation is approached from different directions, which is a source of both friction and range.`;
        const yearNote={same:`You are both in Personal Year ${model.a.year.value} this calendar year, so the same theme is asking each of you for a response.`,adjacent:`Your Personal Years (${model.a.year.value} and ${model.b.year.value}) are adjacent in the nine-year cycle: one of you is a step ahead in a rhythm the other is about to enter.`,apart:`Your Personal Years (${model.a.year.value} and ${model.b.year.value}) sit in different parts of the nine-year cycle, so this year’s questions may differ for each of you.`}[model.yearRelation];
        body=`<article class="num-reading"><header><div class="num-seal" aria-hidden="true"><span>${model.pairNumber.value}</span>${model.pairNumber.master?`<small>root ${model.pairNumber.root}</small>`:''}</div><div><p class="num-kicker">The pair’s number · ${numberLabel(model.pairNumber)}</p><h5>${t.title}</h5><p class="num-keywords">${t.words}</p></div></header><p class="num-role-lens">Adding two Life Paths gives a number to read as the theme the two of you make together, not a verdict on the relationship.</p><p>${t.story}</p><div class="num-reading-pair"><section><h6>Shared ground</h6><p>${concordNote}</p></section><section><h6>This year</h6><p>${yearNote}</p></section></div><blockquote>${t.connection}</blockquote><details class="num-method"><summary>See the calculation</summary><p>Life Path ${model.a.path.value} + Life Path ${model.b.path.value} = ${trail(model.pairNumber)}. Concords are evaluated on roots (11 → 2, 22 → 4, 33 → 6). Personal Years use the calendar-year method.</p></details></article>`;
      }
      $('#num-pair-results').innerHTML=cards+body;
    }
```

- [ ] **Step 4: Wire events**

In the click handler add:

```js
      if(d.numPairView){state.pairView=d.numPairView;renderPair();$(`[data-num-pair-view="${state.pairView}"]`).focus({preventScroll:true});return;}
```

Before the final render line add:

```js
    $('#num-pair-form').addEventListener('submit',event=>{event.preventDefault();state.partnerDate=$('#num-pair-date').value;state.partnerRead=true;renderPair();},{signal:controller.signal});
    $('#num-pair-date').addEventListener('input',event=>{state.partnerDate=event.target.value;state.partnerRead=false;$('#num-pair-status').textContent=state.partnerDate?'Choose Compare paths when you are ready.':'';renderPair();},{signal:controller.signal});
```

Add `renderPair();` to the final render line.

- [ ] **Step 5: CSS**

Append:

```css
.num-pair-cards { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; margin: 0 0 26px; }
.num-pair-cards button { display: flex; flex-direction: column; align-items: center; min-width: 0; padding: 22px 9px 18px; border: 1px solid var(--num-line); border-radius: 5px; color: var(--num-text); background: radial-gradient(ellipse at top, #9ccfca0d, transparent 75%), #0b1c2733; }
.num-pair-cards button > span { font: 10px/1.5 'DM Mono', monospace; text-transform: uppercase; letter-spacing: .08em; }
.num-pair-cards button strong { color: var(--num-teal); font: 500 clamp(40px,5vw,67px)/1.2 'Playfair Display', serif; margin: 13px 0; }
.num-pair-cards button small { color: var(--num-muted); font-size: 11px; line-height: 1.5; text-align: center; }
.num-pair-cards button[aria-pressed='true'] { background: #ecd29c12; border-color: #efd19a99; box-shadow: inset 0 -3px 0 var(--num-gold); }
.num-pair-cards button[aria-pressed='true'] strong { color: var(--num-gold); }
#num-pair-form { margin-bottom: 26px; }
#num-pair-form > label { display: block; color: var(--num-gold); font-size: 12px; margin-bottom: 9px; }
#num-pair-form input[type='date'] { color-scheme: dark; }
#num-pair-status { color: var(--num-teal); font-size: 11px; line-height: 1.8; margin-top: 12px; }
@media (max-width: 700px) { .num-pair-cards { gap: 6px; } .num-pair-cards button { padding: 15px 3px; } .num-pair-cards button strong { font-size: 32px; margin: 10px 0; } .num-pair-cards button small { font-size: 9px; } }
```

- [ ] **Step 6: Check and browser-verify**

Run: `node --check numerology.js && node --test tests/*.test.cjs` (137 passing).
Browser: open the Two paths tab, submit a date, switch the three views, confirm a future date shows the validation sentence and nothing else, confirm no percentage or score wording appears anywhere in the rendered text (`document.querySelector('#num-pair').textContent.match(/\d+\s?%|score|compatib/i)` is null), and confirm at 390px the three cards fit without horizontal overflow.

- [ ] **Step 7: Commit**

```bash
git add numerology.js numerology.css
git commit -m "feat(numerology): two paths tab comparing two Life Paths

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: UI — Chaldean system toggle in Name reading

**Files:**
- Modify: `numerology.js` (compound copy table, state key, toggle markup, `renderName` branch, handler, footnote)
- Modify: `numerology.css` (append)

**Interfaces:**
- Consumes: `E.nameProfile(name, yVowels, birth, system)`, `E.chaldeanValues`, `E.compoundReading` (Task 3).
- Produces: state key `nameSystem`; buttons `[data-num-system]`.

- [ ] **Step 1: Write the compound copy**

Add a `compoundCopy` object keyed 10–52. Each entry has the shape `{title, words, story, prompt}` and must be original: a title of two to five words, three keywords joined by ` · `, a `story` of two or three sentences (110–260 characters) that describes the number as a symbolic theme for reflection in the studio's voice (no fortune, luck, warning or prediction language; no "you will"; no health, death or money-outcome claims), and a `prompt` ending in `?`. Traditional Chaldean compound numbers carry names (for instance 10 is often called "the wheel", 19 "the sun", 23 "the royal star of the lion"); you may allude to a traditional image in the title, but every sentence must be your own. Three entries as the pattern:

```js
  const compoundCopy = {
    10:{title:'The turning wheel',words:'Rotation · confidence · consequence',story:'Ten is traditionally pictured as a wheel: what is set in motion comes round. As a name number it invites a look at how your intentions return to you in the responses of others, and at what you would want to keep turning.',prompt:'What have I set in motion that is now coming back around?'},
    19:{title:'A clear morning',words:'Visibility · warmth · promise',story:'Nineteen is traditionally associated with the sun rising: a name that tends to be seen and to see. Read it as a question about what you want to bring into the light and what deserves to stay quietly your own.',prompt:'What would I do differently if I assumed I was already being noticed?'},
    52:{title:'The long practice',words:'Persistence · experiment · renewal',story:'Fifty-two closes the compound series. As a name number it can be read as the patient repetition that turns an experiment into a practice: the same thing done again with more attention each time.',prompt:'Which practice would improve if I repeated it once more with care?'},
    // …entries 11–18, 20–51 in the same shape…
  };
```

Every key from 10 to 52 must be present; a test in Step 5 enforces it.

- [ ] **Step 2: State, toggle and footnote**

Extend `state` with `nameSystem:['pythagorean','chaldean'].includes(previous?.nameSystem)?previous.nameSystem:'pythagorean',`.

In the `#num-name` section, immediately after `</div>` closing the section heading and before `<form id="num-name-form">`, insert:

```html
<div class="num-system-toggle" role="group" aria-label="Name numerology system"><button type="button" data-num-system="pythagorean" aria-pressed="${state.nameSystem==='pythagorean'}">Pythagorean<small>1–9 across A–Z · birth name</small></button><button type="button" data-num-system="chaldean" aria-pressed="${state.nameSystem==='chaldean'}">Chaldean<small>1–8 by sound · the name you use</small></button></div>
```

In the footnote `<details>`, after the paragraph beginning "Name values repeat 1–9", add:

```html
<p>Chaldean readings use the letter values published by Cheiro (A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7; no letter is 9). The compound number is the full sum before reduction; compounds 10–52 are read directly, larger sums are reduced once by adding their digits, and the single-digit root is shown alongside. Chaldean practice traditionally reads the name a person actually uses. No master numbers apply. Vowel and consonant splits belong to the Pythagorean method and are not shown here.</p>
```

- [ ] **Step 3: Branch `renderName`**

At the start of `renderName`, after the `if(!state.nameRead) {…return;}` block, replace `const n=E.nameProfile(state.name,state.yVowels,birth);` with `const n=E.nameProfile(state.name,state.yVowels,birth,state.nameSystem);` and, immediately after the `if(n.status!=='ready') {…}` line, insert:

```js
      if(n.system==='chaldean') {
        const copy=n.reading.readAs>9?compoundCopy[n.reading.readAs]:themes[n.reading.readAs];
        const readingNote=n.reading.readAs===n.compound?'':n.reading.readAs>9?`Compound ${n.compound} is above 52, so it is reduced once (${n.compound} → ${n.reading.readAs}) and read as compound ${n.reading.readAs}.`:`Compound ${n.compound} reduces to ${n.reading.readAs}, which is read as a single digit.`;
        $('#num-name-status').textContent=`Chaldean reading ready · calculated spelling: ${n.normalized}.`;
        $('#num-name-results').innerHTML=`<div class="num-name-cards num-name-cards-chaldean" role="group" aria-label="Your Chaldean name number"><div class="num-compound-card"><span>Name number</span><strong>${n.compound}</strong><small>Compound · root ${n.reading.root}</small></div></div><section class="num-letter-study"><div class="num-overview-heading"><h5>Every letter, by sound.</h5><p>Chaldean values run 1–8. Exact spelling: <strong>${esc(n.normalized)}</strong></p></div><div class="num-letter-words" aria-label="Letter values">${n.words.map(w=>`<div class="num-letter-word">${n.letters.filter(x=>x.wordIndex===w.wordIndex).map(x=>`<span class="num-letter" aria-label="${x.letter}: ${x.value}"><b>${x.letter}</b><small>${x.value}</small></span>`).join('')}</div>`).join('')}</div><table class="num-word-table"><caption>Each word on its own</caption><thead><tr><th scope="col">Word</th><th scope="col">Compound</th><th scope="col">Root</th></tr></thead><tbody>${n.words.map(w=>`<tr><th scope="row">${esc(w.word)}</th><td>${w.compound}</td><td>${w.root}</td></tr>`).join('')}</tbody></table><p class="num-letter-totals">All letters = ${n.compound}${readingNote?' · '+readingNote:''}</p></section><article class="num-reading"><header><div class="num-seal" aria-hidden="true"><span>${n.reading.readAs}</span><small>root ${n.reading.root}</small></div><div><p class="num-kicker">Compound ${n.reading.readAs}${n.reading.readAs>9?'':' · single digit'}</p><h5>${copy.title}</h5><p class="num-keywords">${copy.words}</p></div></header><p class="num-role-lens">Chaldean tradition reads the name you actually use day to day. Try the spelling people call you by, then a formal version, and notice what changes.</p><p>${copy.story}</p><blockquote>${copy.prompt}</blockquote><details class="num-method"><summary>See the calculation</summary><p>${n.letters.map(x=>`${x.letter} (${x.value})`).join(' + ')} = <strong>${n.compound}</strong>; digit sum ${n.reading.root}.</p></details></article>`;
        return;
      }
```

- [ ] **Step 4: Wire the toggle and hide Y options under Chaldean**

In the click handler add:

```js
      if(d.numSystem){state.nameSystem=d.numSystem;root.querySelectorAll('[data-num-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.numSystem===state.nameSystem)));renderYChoices();renderName();$(`[data-num-system="${state.nameSystem}"]`).focus({preventScroll:true});return;}
```

In `renderYChoices`, change `$('#num-y-options').hidden=!ys.length;` to `$('#num-y-options').hidden=!ys.length||state.nameSystem==='chaldean';`.

- [ ] **Step 5: Add a copy-completeness test**

`numerology.js` is a browser IIFE, so test the table by reading the source. Append to `tests/numerology.test.cjs`:

```js
test('chaldean compound copy covers 10–52 with original reflective prose',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','numerology.js'),'utf8');
  const block=source.slice(source.indexOf('const compoundCopy'),source.indexOf('};',source.indexOf('const compoundCopy'))+2);
  for(let n=10;n<=52;n++) assert.match(block,new RegExp(`\\n\\s*${n}:\\{title:`),`compound ${n} present`);
  assert.doesNotMatch(block,/you will|luck|fortune|warning|danger|death|illness|wealth will/i);
  assert.equal((block.match(/prompt:'[^']*\?'/g)||[]).length,43,'every entry ends its prompt with a question mark');
});
```

- [ ] **Step 6: CSS**

Append:

```css
.num-system-toggle { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; margin: 0 0 22px; }
.num-system-toggle button { min-height: 56px; padding: 11px 14px; border: 1px solid var(--num-line); border-radius: 3px; background: #ffffff04; color: #e2e8e9; font-size: 13px; text-align: left; }
.num-system-toggle button small { display: block; color: var(--num-muted); margin-top: 5px; font-size: 10px; }
.num-system-toggle button[aria-pressed='true'] { background: #ecd29c12; border-color: #efd19a99; box-shadow: inset 0 -3px 0 var(--num-gold); }
.num-system-toggle button[aria-pressed='true'] small { color: var(--num-gold); }
.num-name-cards-chaldean { grid-template-columns: minmax(0,320px); }
.num-compound-card { display: flex; flex-direction: column; align-items: center; padding: 22px 9px 18px; border: 1px solid #efd19a99; border-radius: 5px; background: radial-gradient(ellipse at top, #9ccfca0d, transparent 75%), #0b1c2733; box-shadow: inset 0 -3px 0 var(--num-gold); }
.num-compound-card > span { font: 10px/1.5 'DM Mono', monospace; text-transform: uppercase; letter-spacing: .08em; }
.num-compound-card strong { color: var(--num-gold); font: 500 clamp(40px,5vw,67px)/1.2 'Playfair Display', serif; margin: 13px 0; }
.num-compound-card small { color: var(--num-muted); font-size: 11px; }
.num-word-table { width: 100%; max-width: 420px; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
.num-word-table caption { text-align: left; color: var(--num-muted); font: 10px/1.8 'DM Mono', monospace; padding-bottom: 6px; }
.num-word-table th, .num-word-table td { padding: 8px 10px; border-bottom: 1px solid var(--num-line); text-align: left; }
.num-word-table td { color: var(--num-teal); font-family: 'DM Mono', monospace; }
```

- [ ] **Step 7: Check and browser-verify**

Run: `node --check numerology.js && node --test tests/*.test.cjs` (138 passing).
Browser: read a name in Pythagorean, switch to Chaldean and confirm the reading recalculates without resubmitting, the Y fieldset hides, the word table renders, and switching back restores the four cards. Try a name with a Y in Pythagorean to confirm the Y fieldset returns. Check 390px for overflow.

- [ ] **Step 8: Commit**

```bash
git add numerology.js numerology.css tests/numerology.test.cjs
git commit -m "feat(numerology): Chaldean name system with compound readings

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Documentation and final verification

**Files:**
- Modify: `docs/NUMEROLOGY.md`
- Modify: `index.html` (confirm the three `?v=2` keys from Task 4 are present)

- [ ] **Step 1: Update docs/NUMEROLOGY.md**

Change the opening paragraph to list six views: Birth numbers, Life arcs, Personal cycles, Name reading (Pythagorean or Chaldean), Two paths, and Lo Shu. Add three bullet groups to "Conventions", copying the rules from the spec sections 1–3 verbatim where they state a calculation (single-digit components for pinnacles and challenges; period boundaries; concords {1,5,7} {2,4,8} {3,6,9} on roots; pair number keeps masters; Personal Year relation 9→1 counts as adjacent; Chaldean table; compound handling above 52; no masters in Chaldean). In "Interaction and data", list the new page-memory state keys `arc`, `arcView`, `nameSystem`, `partnerDate`, `partnerRead`, `pairView` and state that the second person's date is never stored or transmitted. In "Verification", change "Ten numerology tests" to the actual count from `node --test tests/numerology.test.cjs` and list the new cases; add the browser checks performed in Tasks 4–6.

- [ ] **Step 2: Full verification**

Run: `node --test tests/*.test.cjs`
Expected: 138 passing, 0 failing. Record the real number in the docs.
Run: `for f in numerology.js numerology-engine.js; do node --check $f; done`
Run: `grep -n 'numerology' index.html` and confirm all three keys read `?v=2`.

- [ ] **Step 3: Commit**

```bash
git add docs/NUMEROLOGY.md index.html
git commit -m "docs(numerology): life arcs, two paths and Chaldean conventions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** §1 → Tasks 1, 4. §2 → Tasks 2, 5. §3 → Tasks 3, 6. Studio layout and state keys → Tasks 4–6. Data/privacy → no storage calls anywhere in the new code (reviewers: grep the diff for `localStorage`, `StoragePreferences`, `fetch`). Testing list items 1–9 → Tasks 1–3 and Task 6 step 5. Documentation → Task 7.
- **Type consistency:** `arcs()` returns `number` as a reduce result for pinnacles and a plain integer for challenges; the UI uses `numberLabel(p.number)` for pinnacles and `c.number` for challenges accordingly. `pair()` returns `a.year` as a reduce result; the UI reads `.value`. `nameProfile` Chaldean returns `reading.readAs`; the UI keys `compoundCopy` by it when above 9 and `themes` otherwise.
- **Placeholders:** the only delegated content is the 40 remaining `compoundCopy` entries, whose shape, length, voice and completeness are specified and tested.
