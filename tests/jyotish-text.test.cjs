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
  assert.doesNotMatch(all,/you will|luck|fortune|misfortune|wealth will|marriage will|death|disease|illness|enemy|enemies/i);
  const openings=Object.values(T.nakshatra).map(n=>n.body.split(/\s+/).slice(0,2).join(' ').toLowerCase());
  const counts={}; openings.forEach(o=>counts[o]=(counts[o]||0)+1);
  assert.ok(Math.max(...Object.values(counts))<=6,'varied openings');
});
