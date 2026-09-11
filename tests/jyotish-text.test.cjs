const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('../jyotish-text.js');

// Hardcoded rather than required from jyotish-engine.js: engine and text are
// built concurrently by separate implementers in separate files (see
// .superpowers/sdd/2026-09-12-jyotish/progress.md).
const LORD_CYCLE=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const GRAHAS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

test('jyotish copy is complete and keeps the reflective voice',()=>{
  for(let i=0;i<12;i++) assert.ok(T.lagna[i].title&&T.lagna[i].body.length>=110&&T.lagna[i].prompt.endsWith('?'),`lagna ${i}`);
  for(let i=0;i<27;i++) assert.ok(T.nakshatra[i].keyword&&T.nakshatra[i].body.length>=110&&T.nakshatra[i].body.length<=260&&T.nakshatra[i].prompt.endsWith('?'),`nakshatra ${i}`);
  for(const l of LORD_CYCLE) assert.ok(T.dashaLord[l].title&&T.dashaLord[l].body.length>=110&&T.dashaLord[l].prompt.endsWith('?'),`dasha ${l}`);
  for(const g of GRAHAS) assert.ok(T.graha[g].theme&&T.graha[g].body.length>=80,`graha ${g}`);
  for(let i=1;i<=12;i++) assert.ok(T.bhava[i].length>30,`bhava ${i}`);
  const all=JSON.stringify(T);
  assert.doesNotMatch(all,/you will|luck|fortune|misfortune|wealth will|marriage will|death|disease|illness|enemy|enemies|\bgains?\b|\bobstacles?\b/i);
  const openings=Object.values(T.nakshatra).map(n=>n.body.split(/\s+/).slice(0,2).join(' ').toLowerCase());
  const counts={}; openings.forEach(o=>counts[o]=(counts[o]||0)+1);
  assert.ok(Math.max(...Object.values(counts))<=6,'varied openings');
});

test('nakshatra copy reads as distinct prose, not a mail-merged skeleton',()=>{
  const bodies=Object.values(T.nakshatra).map(n=>n.body);
  const sentencesOf=b=>b.split('. ').map(s=>s.replace(/\.$/,'').trim());
  // No first-sentence skeleton (first three words of sentence one) shared by more than 6 entries.
  const firstSentenceOpenings=bodies.map(b=>sentencesOf(b)[0].split(/\s+/).slice(0,3).join(' ').toLowerCase());
  const skeletonCounts={}; firstSentenceOpenings.forEach(o=>skeletonCounts[o]=(skeletonCounts[o]||0)+1);
  assert.ok(Math.max(...Object.values(skeletonCounts))<=6,`first-sentence skeleton over-shared: ${JSON.stringify(skeletonCounts)}`);
  // "This nakshatra" opens the second sentence in at most 4 entries.
  const secondSentenceOpenings=bodies.map(b=>{
    const sentences=sentencesOf(b);
    return (sentences[1]||'').split(/\s+/).slice(0,2).join(' ').toLowerCase();
  });
  const thisNakshatraCount=secondSentenceOpenings.filter(o=>o==='this nakshatra').length;
  assert.ok(thisNakshatraCount<=4,`"This nakshatra" opens the second sentence ${thisNakshatraCount} times`);
  // "traditionally associated with" appears in at most 10 of the 27 nakshatra bodies.
  const phraseCount=bodies.filter(b=>/traditionally associated with/i.test(b)).length;
  assert.ok(phraseCount<=10,`"traditionally associated with" appears in ${phraseCount} nakshatra bodies`);
});
